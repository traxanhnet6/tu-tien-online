/* ============================================================
 * js/taycot.js — Tẩy Cốt (phẩm chất căn cốt) + Khai Mạch Đan
 * (mở ngũ hành linh căn). Thuần logic, không DOM, chạy node.
 * - Tẩy Cốt: uống Tẩy Cốt Đan lần đầu → roll PHẨM CHẤT CĂN CỐT:
 *   Phàm/Huyền/Địa/Thiên/Tiên (50/30/12/6/2). Đan phẩm cao hơn
 *   → tăng tỉ lệ phẩm cao (không bao giờ hạ phẩm).
 *   Phẩm chất cho: +tốc độ tu luyện (expMult), +tỉ lệ đột phá (btBonus).
 * - Khai Mạch Đan: mở thêm linh căn ngũ hành (Kim/Mộc/Thủy/Hỏa/Thổ),
 *   tối đa 5 linh căn. Luyện tại Đan Phòng (Luyện Đan Sư Dược Vương Tông).
 * Dữ liệu: TAYCOT_DEF (mirror cho test); UI: js/ui.js; đan: js/data.js.
 * ============================================================ */

var TAYCOT_DEF = {
  /* Phẩm chất căn cốt: id, tỉ lệ cơ bản (%), hiệu quả */
  cotPham: [
    { id: "pham",  rate: 50, expMult: 1.00, btBonus: 0.000, fx: "#9aa0a8" },
    { id: "huyen", rate: 30, expMult: 1.15, btBonus: 0.010, fx: "#7fe8c8" },
    { id: "dia",   rate: 12, expMult: 1.35, btBonus: 0.020, fx: "#9fd8ff" },
    { id: "thien", rate: 6,  expMult: 1.60, btBonus: 0.035, fx: "#c9a7ff" },
    { id: "tien",  rate: 2,  expMult: 2.00, btBonus: 0.050, fx: "#ffd700" },
  ],
  /* Đan phẩm càng cao → tỉ lệ "nâng 1 bậc" sau roll càng lớn.
   * grade: 0=hạ, 1=trung, 2=thượng, 3=thiên phẩm */
  pillShift: [0.10, 0.20, 0.35, 0.50],
  pillGradeOf: { /* id đan → grade (mirror js/data.js) */
    pill_taycotdan: 0, pill_taycotdan_trung: 1,
    pill_taycotdan_thuong: 2, pill_taycotdan_thien: 3,
  },
  nguHanh: ["kim", "moc", "thuy", "hoa", "tho"],
  maxRoots: 5,
  /* Công thức Khai Mạch Đan — luyện tại Đan Phòng (Luyện Đan Sư) */
  recipes: [
    {
      id: "pill_khaimachdan", grade: 0, open: 1, choose: false,
      need: [{ id: "taycothao", qty: 5 }, { id: "truc_co_thao", qty: 3 }],
      stones: 500,
    },
    {
      id: "pill_khaimachdan_trung", grade: 1, open: 1, choose: true,
      need: [{ id: "taycothao", qty: 8 }, { id: "dia_linh_qua", qty: 5 }],
      stones: 1500,
    },
    {
      id: "pill_khaimachdan_thuong", grade: 2, open: 2, choose: false,
      need: [{ id: "dia_linh_qua", qty: 10 }, { id: "thao_linh_chi", qty: 5 }],
      stones: 5000,
    },
  ],
};

var TayCot = (function () {
  "use strict";
  var D = TAYCOT_DEF;

  function _bag(state) { return (state && state.bag) || []; }
  function countItem(state, id) {
    var n = 0, bag = _bag(state);
    for (var i = 0; i < bag.length; i++) if (bag[i].id === id) n += bag[i].qty || 0;
    return n;
  }
  function removeItem(state, id, qty) {
    qty = qty || 1;
    var bag = _bag(state);
    for (var i = 0; i < bag.length; i++) {
      if (bag[i].id === id) {
        bag[i].qty -= qty;
        if (bag[i].qty <= 0) bag.splice(i, 1);
        return true;
      }
    }
    return false;
  }
  function addItem(state, id, qty) {
    qty = qty || 1;
    var bag = _bag(state);
    for (var i = 0; i < bag.length; i++) {
      if (bag[i].id === id) { bag[i].qty += qty; return; }
    }
    bag.push({ id: id, qty: qty });
  }

  /* ---------- Phẩm chất căn cốt ---------- */
  function phamIdx(id) {
    for (var i = 0; i < D.cotPham.length; i++) if (D.cotPham[i].id === id) return i;
    return -1;
  }
  function cotPhamOf(state) {
    return (state && state.char && state.char.cotPham) || null;
  }
  /* Roll phẩm chất theo tỉ lệ cơ bản + shift theo phẩm đan. Không hạ bậc. */
  function rollCotPham(pillGrade, randFn) {
    var r = (typeof randFn === "function") ? randFn() : Math.random();
    var acc = 0, idx = 0, total = 0, i;
    for (i = 0; i < D.cotPham.length; i++) total += D.cotPham[i].rate;
    for (i = 0; i < D.cotPham.length; i++) {
      acc += D.cotPham[i].rate / total;
      if (r <= acc) { idx = i; break; }
    }
    var g = Math.max(0, Math.min(3, pillGrade | 0));
    var rs = (typeof randFn === "function") ? randFn() : Math.random();
    if (rs < D.pillShift[g]) idx = Math.min(D.cotPham.length - 1, idx + 1);
    return D.cotPham[idx].id;
  }
  /* Uống Tẩy Cốt Đan: lần đầu định phẩm; đan tốt hơn → re-roll, chỉ lên không xuống. */
  function drinkTayCot(state, pillGrade, randFn) {
    var cur = cotPhamOf(state);
    var nw = rollCotPham(pillGrade, randFn);
    if (!cur) {
      state.char.cotPham = nw;
      return { pham: nw, isNew: true, upgraded: false };
    }
    var ci = phamIdx(cur), ni = phamIdx(nw);
    if (ni > ci) {
      state.char.cotPham = nw;
      return { pham: nw, isNew: false, upgraded: true, from: cur };
    }
    return { pham: cur, isNew: false, upgraded: false, rolled: nw };
  }
  function cotBonus(state) {
    var id = cotPhamOf(state);
    var i = phamIdx(id);
    if (i < 0) return { expMult: 1, btBonus: 0 };
    return { expMult: D.cotPham[i].expMult, btBonus: D.cotPham[i].btBonus };
  }

  /* ---------- Ngũ hành linh căn ---------- */
  function rootsOf(state) {
    ensureRoots(state);
    return state.char.roots;
  }
  function ensureRoots(state) {
    if (!state || !state.char) return [];
    if (!Array.isArray(state.char.roots)) state.char.roots = [];
    if (state.char.roots.length === 0 && state.char.element) {
      state.char.roots.push(state.char.element);
    }
    return state.char.roots;
  }
  function unopenedRoots(state) {
    var have = rootsOf(state), out = [];
    for (var i = 0; i < D.nguHanh.length; i++) {
      if (have.indexOf(D.nguHanh[i]) < 0) out.push(D.nguHanh[i]);
    }
    return out;
  }
  /* Mở thêm `count` linh căn. choice: id linh căn người chơi chọn (nếu đan cho phép).
   * Trả {opened:[ids], full:true nếu đã đủ 5}. */
  function openRoots(state, count, choice, randFn) {
    var roots = ensureRoots(state), opened = [];
    var left = count | 0;
    if (choice && D.nguHanh.indexOf(choice) >= 0 &&
        roots.indexOf(choice) < 0 && roots.length < D.maxRoots) {
      roots.push(choice); opened.push(choice); left--;
    }
    var pool = unopenedRoots(state);
    while (left > 0 && pool.length > 0) {
      var r = (typeof randFn === "function") ? randFn() : Math.random();
      var pick = pool.splice(Math.floor(r * pool.length), 1)[0];
      roots.push(pick); opened.push(pick); left--;
    }
    return { opened: opened, full: roots.length >= D.maxRoots };
  }

  /* ---------- Luyện đan Khai Mạch ---------- */
  function recipeOf(id) {
    for (var i = 0; i < D.recipes.length; i++) if (D.recipes[i].id === id) return D.recipes[i];
    return null;
  }
  function craftNeed(state, recipeId) {
    var rc = recipeOf(recipeId);
    if (!rc) return null;
    return {
      recipe: rc,
      stones: rc.stones, stonesHave: state.stones || 0,
      mats: rc.need.map(function (m) {
        return { id: m.id, need: m.qty, have: countItem(state, m.id) };
      }),
    };
  }
  function canCraft(state, recipeId) {
    var n = craftNeed(state, recipeId);
    if (!n) return { ok: false, reason: "no_recipe" };
    if (n.stonesHave < n.stones) return { ok: false, reason: "stones", need: n };
    for (var i = 0; i < n.mats.length; i++) {
      if (n.mats[i].have < n.mats[i].need) return { ok: false, reason: "mats", need: n };
    }
    return { ok: true, need: n };
  }
  function doCraft(state, recipeId) {
    var c = canCraft(state, recipeId);
    if (!c.ok) return c;
    var rc = c.need.recipe;
    state.stones = (state.stones || 0) - rc.stones;
    for (var i = 0; i < rc.need.length; i++) removeItem(state, rc.need[i].id, rc.need[i].qty);
    addItem(state, rc.id, 1);
    return { ok: true, id: rc.id };
  }

  return {
    DEF: D,
    phamIdx: phamIdx, cotPhamOf: cotPhamOf,
    rollCotPham: rollCotPham, drinkTayCot: drinkTayCot, cotBonus: cotBonus,
    rootsOf: rootsOf, ensureRoots: ensureRoots, unopenedRoots: unopenedRoots,
    openRoots: openRoots,
    recipeOf: recipeOf, craftNeed: craftNeed, canCraft: canCraft, doCraft: doCraft,
    countItem: countItem, removeItem: removeItem, addItem: addItem,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = { TayCot: TayCot, TAYCOT_DEF: TAYCOT_DEF };
}
