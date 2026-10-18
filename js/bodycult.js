/* ============================================================
 * js/bodycult.js — Hệ thống Căn Cốt + Thần Thức (Kỹ sư Gameplay)
 * Thuần logic, không DOM, chạy được trên node (smoke test).
 * - Căn Cốt: +HP, +giáp, +tỉ lệ đột phá. Nâng bằng đan dược
 *   (Thối Thể Đan theo phẩm cảnh giới), tắm thuốc, nhiệm vụ luyện
 *   thể (ngày), Linh Thạch, luyện hóa Yêu Đan.
 * - Thần Thức: +tầm đánh, +bạo kích, +số linh thú điều khiển,
 *   +kháng hiệu ứng. Nâng bằng Dưỡng Thần Đan (theo phẩm), thiền
 *   định, kỳ ngộ (hook reward), Linh Thạch.
 * - Mỗi loại 100 cấp; mỗi 10 cấp = 1 đại mốc (danh hiệu + burst).
 * - Nguyên liệu theo band cảnh giới: lv 0-19 hạ phẩm (Luyện Khí),
 *   20-39 trung phẩm (Trúc Cơ), 40-59 thượng phẩm (Kim Đan),
 *   60-79 cực phẩm (Nguyên Anh), 80-99 tiên phẩm (Hóa Thần+).
 *   KHÔNG dùng đan cấp thấp cho cấp cao — phải đúng phẩm.
 * Dữ liệu gốc: data/bodycult.json (BODYCULT_DEF mirror ở đây để
 * chạy file:// + node; test kiểm tra 2 nơi đồng bộ).
 * ============================================================ */

var BODYCULT_DEF = {
  maxLv: 100,
  bandSize: 20,
  grades: ["ha", "trung", "thuong", "cuc", "tien"],
  gradeRealm: { ha: "luyen_khi", trung: "truc_co", thuong: "kim_dan", cuc: "nguyen_anh", tien: "hoa_than" },
  stoneCost: { base: 45, growth: 1.06, stonesOnlyMult: 3 },
  bathHerbs: [
    { id: "thao_linh_chi", qty: 3 },
    { id: "truc_co_thao", qty: 3 },
    { id: "dia_linh_qua", qty: 3 },
    { id: "dia_linh_qua", qty: 5 },
    { id: "dia_linh_qua", qty: 8 }
  ],
  bonusPerLv: {
    cancot: { hpPct: 0.5, defFlat: 0.3, btBonus: 0.001 },
    thanthuc: { rangePct: 0.4, critPct: 0.15, resistPct: 0.3 }
  },
  bonusPerMilestone: {
    cancot: { hpPct: 2, defFlat: 2, btBonus: 0.005 },
    thanthuc: { rangePct: 1, critPct: 0.5, resistPct: 1 }
  },
  petSlotsPerLv: 25,
  meditateMs: 180000,
  daily: { killNeed: 50, killRewardLv: 2 },
  yaodan: {
    elements: ["hoa", "loi", "bang", "phong", "tho"],
    lvGain: [0, 1, 2, 4, 7, 12],
    failRate: [0, 0, 0.1, 0.2, 0.35, 0.5],
    stoneCostMult: 100,
    elemBonus: {
      hoa:   { stat: "atkPct",   per: 0.3, cap: 20 },
      loi:   { stat: "critPct",  per: 0.2, cap: 20 },
      bang:  { stat: "defFlat",  per: 0.3, cap: 20 },
      phong: { stat: "rangePct", per: 0.2, cap: 20 },
      tho:   { stat: "hpPct",    per: 0.4, cap: 20 }
    }
  },
  elite: { chance: 0.05, scale: 1.3, hpMult: 2.5, atkMult: 2.2, defMult: 1.5, expMult: 3, yaodanRate: 0.5, bossYaodanRate: 0.6 },
  milestones: {
    cancot: [
      { lv: 10, titleKey: "bc_ms_cc10", fx: "#cd7f32" },
      { lv: 20, titleKey: "bc_ms_cc20", fx: "#9aa0a8" },
      { lv: 30, titleKey: "bc_ms_cc30", fx: "#c9d2dd" },
      { lv: 40, titleKey: "bc_ms_cc40", fx: "#ffd76a" },
      { lv: 50, titleKey: "bc_ms_cc50", fx: "#7fe8c8" },
      { lv: 60, titleKey: "bc_ms_cc60", fx: "#9fd8ff" },
      { lv: 70, titleKey: "bc_ms_cc70", fx: "#c9a7ff" },
      { lv: 80, titleKey: "bc_ms_cc80", fx: "#fff3b0" },
      { lv: 90, titleKey: "bc_ms_cc90", fx: "#ffe9a8" },
      { lv: 100, titleKey: "bc_ms_cc100", fx: "#ffd700" }
    ],
    thanthuc: [
      { lv: 10, titleKey: "bc_ms_tt10", fx: "#9fd8ff" },
      { lv: 20, titleKey: "bc_ms_tt20", fx: "#7fc4ff" },
      { lv: 30, titleKey: "bc_ms_tt30", fx: "#6fb3ff" },
      { lv: 40, titleKey: "bc_ms_tt40", fx: "#5fa8ff" },
      { lv: 50, titleKey: "bc_ms_tt50", fx: "#8f9dff" },
      { lv: 60, titleKey: "bc_ms_tt60", fx: "#a78fff" },
      { lv: 70, titleKey: "bc_ms_tt70", fx: "#c9a7ff" },
      { lv: 80, titleKey: "bc_ms_tt80", fx: "#e0c3ff" },
      { lv: 90, titleKey: "bc_ms_tt90", fx: "#f0ddff" },
      { lv: 100, titleKey: "bc_ms_tt100", fx: "#ffffff" }
    ]
  }
};

var BodyCult = (function () {
  "use strict";
  var D = BODYCULT_DEF;

  /* ---------- helpers túi đồ (không phụ thuộc state.js) ---------- */
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
  function todayStr() {
    var d = new Date();
    var m = ("0" + (d.getMonth() + 1)).slice(-2), day = ("0" + d.getDate()).slice(-2);
    return d.getFullYear() + "-" + m + "-" + day;
  }

  /* ---------- band cảnh giới / đan dược ---------- */
  function bandOf(lv) {
    lv = Math.max(0, lv | 0);
    return Math.min(D.grades.length - 1, Math.floor(lv / D.bandSize));
  }
  function gradeOf(lv) { return D.grades[bandOf(lv)]; }
  /* Đan đúng phẩm cho cấp hiện tại — KHÔNG thay thế bằng phẩm thấp hơn */
  function pillFor(type, lv) {
    return (type === "cancot" ? "ttd_" : "dtd_") + gradeOf(lv);
  }
  /* Chi phí Linh Thạch: 45 * 1.06^lv — tăng đều theo cấp, không đột biến.
   * Cảnh giới thể hiện qua phẩm đan bắt buộc (band), chi phí chỉ phụ thuộc lv. */
  function stoneCost(lv) {
    lv = Math.max(0, lv | 0);
    return Math.round(D.stoneCost.base * Math.pow(D.stoneCost.growth, lv));
  }
  function bathHerb(lv) { return D.bathHerbs[bandOf(lv)]; }

  /* ---------- đọc/ghi cấp ---------- */
  function lvOf(state, type) {
    return Math.max(0, Math.min(D.maxLv, (type === "cancot" ? state.cancotLv : state.thanthucLv) || 0));
  }
  function setLv(state, type, lv) {
    lv = Math.max(0, Math.min(D.maxLv, lv | 0));
    if (type === "cancot") state.cancotLv = lv; else state.thanthucLv = lv;
    return lv;
  }
  function milestoneAt(type, lv) {
    var arr = D.milestones[type] || [];
    for (var i = 0; i < arr.length; i++) if (arr[i].lv === lv) return arr[i];
    return null;
  }
  function curMilestone(type, lv) {
    var arr = D.milestones[type] || [], out = null;
    for (var i = 0; i < arr.length; i++) if (lv >= arr[i].lv) out = arr[i];
    return out;
  }

  /* ---------- bonus dẫn xuất ---------- */
  function cancotBonus(lv) {
    lv = Math.max(0, lv | 0);
    var ms = Math.floor(lv / 10), p = D.bonusPerLv.cancot, q = D.bonusPerMilestone.cancot;
    return {
      hpPct: lv * p.hpPct + ms * q.hpPct,
      defFlat: Math.floor(lv * p.defFlat) + ms * q.defFlat,
      btBonus: lv * p.btBonus + ms * q.btBonus
    };
  }
  function thanthucBonus(lv) {
    lv = Math.max(0, lv | 0);
    var ms = Math.floor(lv / 10), p = D.bonusPerLv.thanthuc, q = D.bonusPerMilestone.thanthuc;
    return {
      rangePct: lv * p.rangePct + ms * q.rangePct,
      critPct: lv * p.critPct + ms * q.critPct,
      petSlots: 1 + Math.floor(lv / D.petSlotsPerLv),
      resistPct: Math.min(60, lv * p.resistPct + ms * q.resistPct)
    };
  }
  /* Buff nguyên tố từ luyện hóa yêu đan hệ */
  function elemBonus(state) {
    var yb = (state && state.yaodanElem) || {}, out = {};
    Object.keys(D.yaodan.elemBonus).forEach(function (el) {
      var n = Math.min(D.yaodan.elemBonus[el].cap, yb[el] || 0);
      if (n > 0) out[D.yaodan.elemBonus[el].stat] = n * D.yaodan.elemBonus[el].per;
    });
    return out; /* {atkPct: x, critPct: y, ...} */
  }
  /* Móc vào getStats (ui.js): cộng HP/giáp Căn Cốt + buff nguyên tố */
  function applyStats(s, state) {
    var cb = cancotBonus(lvOf(state, "cancot"));
    var eb = elemBonus(state);
    s.maxHp = Math.round(s.maxHp * (1 + (cb.hpPct + (eb.hpPct || 0)) / 100));
    s.def += cb.defFlat + Math.floor(eb.defFlat || 0);
    if (eb.atkPct) s.atk = Math.round(s.atk * (1 + eb.atkPct / 100));
    return s;
  }

  /* ---------- nhu cầu nâng cấp ---------- */
  function upgradeNeed(state, type) {
    var lv = lvOf(state, type);
    var pillId = pillFor(type, lv);
    var stones = stoneCost(lv);
    var need = {
      lv: lv, maxed: lv >= D.maxLv,
      pillId: pillId, pillNeed: 1, pillHave: countItem(state, pillId),
      stones: stones, stonesHave: state.stones || 0,
      stonesOnly: Math.round(stones * D.stoneCost.stonesOnlyMult)
    };
    if (type === "cancot") {
      var hb = bathHerb(lv);
      need.herbId = hb.id; need.herbNeed = hb.qty; need.herbHave = countItem(state, hb.id);
    }
    return need;
  }
  /* Nâng 1 cấp. method: 'pill' | 'stones' | 'bath'(cancot) */
  function doUpgrade(state, type, method) {
    var lv = lvOf(state, type);
    if (lv >= D.maxLv) return { ok: false, reason: "maxed" };
    method = method || "pill";
    if (method === "bath" && type !== "cancot") return { ok: false, reason: "no_bath" };
    var need = upgradeNeed(state, type);
    if (method === "pill") {
      if (need.pillHave < 1) return { ok: false, reason: "no_pill", need: need };
      if ((state.stones || 0) < need.stones) return { ok: false, reason: "no_stones", need: need };
      removeItem(state, need.pillId, 1);
      state.stones -= need.stones;
    } else if (method === "stones") {
      if ((state.stones || 0) < need.stonesOnly) return { ok: false, reason: "no_stones", need: need };
      state.stones -= need.stonesOnly;
    } else if (method === "bath") {
      if (need.herbHave < need.herbNeed) return { ok: false, reason: "no_herb", need: need };
      if ((state.stones || 0) < need.stones) return { ok: false, reason: "no_stones", need: need };
      removeItem(state, need.herbId, need.herbNeed);
      state.stones -= need.stones;
    } else {
      return { ok: false, reason: "bad_method" };
    }
    var nl = setLv(state, type, lv + 1);
    var ms = milestoneAt(type, nl);
    if (ms) {
      state.bcTitles = state.bcTitles || [];
      if (state.bcTitles.indexOf(ms.titleKey) < 0) state.bcTitles.push(ms.titleKey);
    }
    return { ok: true, lv: nl, milestone: ms };
  }

  /* ---------- luyện hóa Yêu Đan (Căn Cốt) ---------- */
  function yaodanInfo(itemId) {
    var m = /^yaodan([1-5])(?:_(hoa|loi|bang|phong|tho))?$/.exec(itemId || "");
    return m ? { tier: +m[1], elem: m[2] || null } : null;
  }
  function yaodanTierFor(mapId, isBoss) {
    var t = 1 + Math.floor((mapId || 0) / 3);
    if (isBoss) t += 1;
    return Math.max(1, Math.min(5, t));
  }
  function refineNeed(state, itemId) {
    var yi = yaodanInfo(itemId);
    if (!yi) return null;
    return {
      tier: yi.tier, elem: yi.elem,
      lvGain: D.yaodan.lvGain[yi.tier],
      failRate: D.yaodan.failRate[yi.tier],
      stones: D.yaodan.stoneCostMult * yi.tier * yi.tier,
      have: countItem(state, itemId),
      protectHave: countItem(state, "ho_mach_dan")
    };
  }
  /* Luyện hóa: thất bại → mất yêu đan, GIỮ linh thạch + hộ mạch đan.
   * Dùng Hộ Mạch Đan → chắc chắn thành công. */
  function doRefine(state, itemId, useProtect, randFn) {
    var lv = lvOf(state, "cancot");
    if (lv >= D.maxLv) return { ok: false, reason: "maxed" };
    var need = refineNeed(state, itemId);
    if (!need) return { ok: false, reason: "bad_yaodan" };
    if (need.have < 1) return { ok: false, reason: "no_yaodan" };
    if ((state.stones || 0) < need.stones) return { ok: false, reason: "no_stones", need: need };
    if (useProtect) {
      if (need.protectHave < 1) return { ok: false, reason: "no_protect" };
      removeItem(state, "ho_mach_dan", 1);
    }
    var r = (typeof randFn === "function") ? randFn() : Math.random();
    var success = useProtect || r >= need.failRate;
    removeItem(state, itemId, 1); /* mất yêu đan cả khi thất bại */
    if (!success) return { ok: false, reason: "refine_fail", need: need };
    state.stones -= need.stones; /* chỉ tốn linh thạch khi thành công */
    var nl = setLv(state, "cancot", lv + need.lvGain);
    var ms = milestoneAt("cancot", nl);
    /* Nếu vượt qua nhiều mốc cùng lúc, lấy mốc cao nhất đã chạm */
    if (!ms) ms = curMilestone("cancot", nl);
    if (ms) {
      state.bcTitles = state.bcTitles || [];
      if (state.bcTitles.indexOf(ms.titleKey) < 0) state.bcTitles.push(ms.titleKey);
    }
    if (need.elem) {
      state.yaodanElem = state.yaodanElem || {};
      var cap = D.yaodan.elemBonus[need.elem].cap;
      state.yaodanElem[need.elem] = Math.min(cap, (state.yaodanElem[need.elem] || 0) + 1);
    }
    return { ok: true, lv: nl, gain: need.lvGain, milestone: ms, elem: need.elem };
  }

  /* ---------- thiền định (Thần Thức, miễn phí, 3 phút) ---------- */
  function meditateStart(state) {
    if (state.meditateUntil && Date.now() < state.meditateUntil) return { ok: false, reason: "busy" };
    if (lvOf(state, "thanthuc") >= D.maxLv) return { ok: false, reason: "maxed" };
    state.meditateUntil = Date.now() + D.meditateMs;
    return { ok: true, until: state.meditateUntil };
  }
  function meditateLeft(state) {
    if (!state.meditateUntil) return 0;
    return Math.max(0, state.meditateUntil - Date.now());
  }
  function meditateClaim(state) {
    if (!state.meditateUntil || Date.now() < state.meditateUntil) return { ok: false, reason: "not_ready" };
    state.meditateUntil = 0;
    var lv = lvOf(state, "thanthuc");
    var nl = setLv(state, "thanthuc", lv + 1);
    var ms = milestoneAt("thanthuc", nl);
    if (ms) {
      state.bcTitles = state.bcTitles || [];
      if (state.bcTitles.indexOf(ms.titleKey) < 0) state.bcTitles.push(ms.titleKey);
    }
    return { ok: true, lv: nl, milestone: ms };
  }

  /* ---------- nhiệm vụ luyện thể hằng ngày ---------- */
  function _daily(state) {
    var t = todayStr();
    if (!state.bcDaily || state.bcDaily.date !== t) {
      state.bcDaily = { date: t, kill: 0, killClaimed: false, medClaimed: false };
    }
    return state.bcDaily;
  }
  function dailyTasks(state) {
    var d = _daily(state);
    return [
      { id: "kill", prog: Math.min(d.kill, D.daily.killNeed), need: D.daily.killNeed, claimed: !!d.killClaimed },
      { id: "med", prog: d.medClaimed ? 1 : 0, need: 1, claimed: !!d.medClaimed }
    ];
  }
  function onKill(state) {
    var d = _daily(state);
    if (d.kill < D.daily.killNeed) d.kill++;
  }
  function dailyClaim(state, taskId) {
    var d = _daily(state);
    if (taskId === "kill") {
      if (d.kill < D.daily.killNeed || d.killClaimed) return { ok: false };
      d.killClaimed = true;
      var nl = setLv(state, "cancot", lvOf(state, "cancot") + D.daily.killRewardLv);
      return { ok: true, lv: nl, gain: D.daily.killRewardLv };
    }
    return { ok: false };
  }
  function dailyClaimMed(state) {
    var d = _daily(state);
    if (d.medClaimed) return { ok: false };
    d.medClaimed = true;
    var nl = setLv(state, "thanthuc", lvOf(state, "thanthuc") + 1);
    var ms = milestoneAt("thanthuc", nl);
    if (ms) {
      state.bcTitles = state.bcTitles || [];
      if (state.bcTitles.indexOf(ms.titleKey) < 0) state.bcTitles.push(ms.titleKey);
    }
    return { ok: true, lv: nl, milestone: ms };
  }

  /* ---------- quái tinh anh ---------- */
  function eliteRoll(randFn) {
    var r = (typeof randFn === "function") ? randFn() : Math.random();
    return r < D.elite.chance;
  }

  return {
    DEF: D,
    bandOf: bandOf, gradeOf: gradeOf, pillFor: pillFor, stoneCost: stoneCost, bathHerb: bathHerb,
    lvOf: lvOf, setLv: setLv, milestoneAt: milestoneAt, curMilestone: curMilestone,
    cancotBonus: cancotBonus, thanthucBonus: thanthucBonus, elemBonus: elemBonus, applyStats: applyStats,
    upgradeNeed: upgradeNeed, doUpgrade: doUpgrade,
    yaodanInfo: yaodanInfo, yaodanTierFor: yaodanTierFor, refineNeed: refineNeed, doRefine: doRefine,
    meditateStart: meditateStart, meditateLeft: meditateLeft, meditateClaim: meditateClaim,
    dailyTasks: dailyTasks, onKill: onKill, dailyClaim: dailyClaim, dailyClaimMed: dailyClaimMed,
    eliteRoll: eliteRoll,
    countItem: countItem, removeItem: removeItem
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = { BodyCult: BodyCult, BODYCULT_DEF: BODYCULT_DEF };
}
