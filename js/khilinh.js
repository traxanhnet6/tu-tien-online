/* ============================================================
 * js/khilinh.js — Chỉ số skill trên trang bị + Khí Linh + chuẩn
 * chỉ số trang bị theo cảnh giới (Bui DUYỆT 2026-10-18).
 * Thuần logic, không DOM, chạy node.
 *
 * 1. CHUẨN CHỈ SỐ TRANG BỊ THEO CẢNH GIỚI:
 *    Mỗi trang bị có reqRealm {realm}; chỉ số theo bảng
 *    EQUIP_REALM_STATS. Đủ cảnh giới → đeo được 100% chỉ số;
 *    chưa đủ → KHÔNG đeo được (nút mờ, tooltip đỏ).
 *    Đồ thấp hơn ≥2 đại cảnh giới → gợi ý thay đồ mới.
 * 2. DÒNG SKILL TRÊN TRANG BỊ (skillLine):
 *    { skill: "<skillId>", lv: N } → +N cấp skill (cộng dồn
 *    với cấp đã học); { stat: "atk|def|maxHp|maxMp|crit", pct }
 *    → +% chỉ số. Tooltip hiện dòng xanh.
 * 3. KHÍ LINH: trang bị tier>=2 (Nguyên Anh+) có tỉ lệ thức
 *    tỉnh khí linh khi đeo (hoặc 100% bằng Dưỡng Linh Đan).
 *    Nuôi bằng linh thạch / yêu đan / đan dược → lên cấp →
 *    tăng chỉ số trang bị + mở dòng skill; "Ngộ đạo" học
 *    skill ngẫu nhiên.
 * ============================================================ */

var Khilinh = (function () {
  "use strict";

  /* ---------- Bảng chỉ số chuẩn theo cảnh giới (giá trị giữa) ----------
   * realm: 1=Luyện Khí, 2=Trúc Cơ, 3=Kim Đan, 4=Nguyên Anh,
   *        5=Hóa Thần, 6=Luyện Hư, 7=Độ Kiếp */
  var EQUIP_REALM_STATS = {
    1: { atk: 30,   def: 17,   hp: 125,   mp: 62   },
    2: { atk: 105,  def: 70,   hp: 425,   mp: 212  },
    3: { atk: 290,  def: 185,  hp: 1100,  mp: 550  },
    4: { atk: 675,  def: 450,  hp: 2650,  mp: 1325 },
    5: { atk: 1500, def: 1050, hp: 6000,  mp: 3000 },
    6: { atk: 3300, def: 2310, hp: 13200, mp: 6600 },
    7: { atk: 7260, def: 5082, hp: 29040, mp: 14520 },
  };

  /* Phân bổ chỉ số theo ô trang bị (tỉ lệ trên bảng chuẩn) */
  var SLOT_DIST = {
    vukhi:    { atk: 1.0 },
    giap:     { def: 0.7, maxHp: 0.6 },
    yphuc:    { def: 0.5, maxHp: 0.8 },
    phapbao:  { atk: 0.4, def: 0.4, maxHp: 0.4 },
    phapboi:  { atk: 0.3, maxMp: 1.0 },
    linhgioi: { atk: 0.3, maxHp: 0.3 },
    hanhngoa: { def: 0.3, maxHp: 0.4 },
    huanh:    { atk: 0.2, def: 0.3, maxHp: 0.3 },
    phihanh:  { def: 0.2, maxHp: 0.5 },
  };

  var EQUIP_SLOTS = ["vukhi", "phapbao", "phihanh", "giap", "huanh",
                     "phapboi", "yphuc", "hanhngoa", "linhgioi"];

  /* Tính chỉ số chuẩn cho (realm, slot) */
  function stdStats(realm, slot) {
    var base = EQUIP_REALM_STATS[realm];
    var dist = SLOT_DIST[slot];
    if (!base || !dist) return {};
    var out = {};
    if (dist.atk) out.atk = Math.round(base.atk * dist.atk);
    if (dist.def) out.def = Math.round(base.def * dist.def);
    if (dist.maxHp) out.hp = Math.round(base.hp * dist.maxHp);
    if (dist.maxMp) out.mp = Math.round(base.mp * dist.maxMp);
    return out;
  }

  /* ---------- Yêu cầu cảnh giới ---------- */
  function realmOfItem(def) {
    if (!def) return 1;
    if (def.reqRealm == null) return 1;
    if (typeof def.reqRealm === "number") return def.reqRealm;
    return def.reqRealm.realm || 1;
  }
  function charRealm(state) {
    return (state && state.char && state.char.realm) || 0;
  }
  /* Đủ cảnh giới → đeo được */
  function canEquip(state, def) {
    return charRealm(state) >= realmOfItem(def);
  }
  /* Đồ thấp hơn ≥2 đại cảnh giới → nên thay */
  function isOutdated(state, def) {
    return charRealm(state) - realmOfItem(def) >= 2;
  }
  /* Liệt kê các ô đang đeo đồ quá cũ → gợi ý thay */
  function suggestUpgrades(state, itemDefFn) {
    var out = [];
    var eq = (state && state.equip) || {};
    EQUIP_SLOTS.forEach(function (slot) {
      var id = eq[slot];
      if (!id) return;
      var d = itemDefFn ? itemDefFn(id) : null;
      if (d && isOutdated(state, d)) out.push({ slot: slot, id: id });
    });
    return out;
  }

  /* ---------- Dòng skill trên trang bị ---------- */
  /* skillLine: [{skill, lv} | {stat, pct} | {stat, flat}] */
  function linesOf(def) {
    return (def && def.skillLine) || [];
  }
  /* Tổng +cấp skill từ TẤT CẢ đồ đang đeo */
  function skillLvBonus(state, skillId, itemDefFn) {
    var total = 0;
    var eq = (state && state.equip) || {};
    EQUIP_SLOTS.forEach(function (slot) {
      var id = eq[slot];
      var d = itemDefFn ? itemDefFn(id) : null;
      linesOf(d).forEach(function (ln) {
        if (ln.skill === skillId && ln.lv) total += ln.lv;
      });
    });
    /* Khí linh mỗi 5 cấp mở 1 dòng skill → cũng cộng vào */
    var spirits = (state && state.spirits) || {};
    Object.keys(spirits).forEach(function (itemId) {
      var sp = spirits[itemId];
      if (!sp || !sp.skills) return;
      /* chỉ tính khi món đồ đang được đeo */
      var worn = false;
      EQUIP_SLOTS.forEach(function (s) { if (eq[s] === itemId) worn = true; });
      if (!worn) return;
      sp.skills.forEach(function (sk) {
        if (sk.skill === skillId && sk.lv) total += sk.lv;
      });
    });
    return total;
  }
  /* Tổng % chỉ số từ dòng skill của đồ đang đeo: {atk: 0.05, ...} */
  function equipStatPct(state, itemDefFn) {
    var out = {};
    var eq = (state && state.equip) || {};
    EQUIP_SLOTS.forEach(function (slot) {
      var id = eq[slot];
      var d = itemDefFn ? itemDefFn(id) : null;
      linesOf(d).forEach(function (ln) {
        if (ln.stat && ln.pct) out[ln.stat] = (out[ln.stat] || 0) + ln.pct;
      });
    });
    return out;
  }

  /* ---------- KHÍ LINH ---------- */
  var SPIRIT_NAMES = ["Kiếm Hồn", "Hỏa Linh", "Băng Phách", "Lôi Đình",
    "Huyết Ảnh", "Thanh Phong", "Thổ Linh", "Kim Cang", "Mộc Linh", "Thủy Tinh"];
  var SPIRIT_PERSONALITIES = [
    { id: "cuongliet", stat: "atk",   pct: 0.03 },
    { id: "onhoa",     stat: "maxHp", pct: 0.03 },
    { id: "kieungao",   stat: "crit",  pct: 0.02 },
    { id: "trungthanh", stat: "def",   pct: 0.03 },
    { id: "tinhnghich", stat: "maxMp", pct: 0.03 },
  ];
  /* Pool skill khí linh có thể "ngộ đạo" */
  var SPIRIT_SKILL_POOL = [
    { skill: "sword_qi", lv: 1 }, { skill: "elemental", lv: 1 },
    { skill: "kiem_cuong_ho_the", lv: 1 }, { skill: "linh_thuan", lv: 1 },
  ];

  /* Trang bị tier>=2 (Nguyên Anh+) mới có thể sinh khí linh */
  function canAwaken(def) {
    return !!def && (def.tier || 0) >= 2;
  }
  function spiritsOf(state) {
    if (!state.spirits) state.spirits = {};
    return state.spirits;
  }
  function spiritOf(state, itemId) {
    return spiritsOf(state)[itemId] || null;
  }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  /* Tỉ lệ thức tỉnh: 25% khi đeo + 5%/giờ đeo (tối đa 100%) */
  function awakenChance(state, itemId) {
    var sp = spiritOf(state, itemId);
    if (sp) return 0;
    var wornMs = ((state.equipWornMs || {})[itemId]) || 0;
    var hours = wornMs / 3600000;
    return Math.min(0.25 + hours * 0.05, 1);
  }
  /* Thức tỉnh khí linh. force=true (Dưỡng Linh Đan) → 100% */
  function awaken(state, itemId, force) {
    var sp = spiritOf(state, itemId);
    if (sp) return { ok: false, reason: "da_thuc_tinh" };
    if (!force && Math.random() > awakenChance(state, itemId))
      return { ok: false, reason: "that_bai" };
    sp = {
      name: pick(SPIRIT_NAMES),
      personality: pick(SPIRIT_PERSONALITIES).id,
      lv: 1, exp: 0,
      skills: [],
      bornAt: Date.now(),
    };
    spiritsOf(state)[itemId] = sp;
    return { ok: true, spirit: sp };
  }
  function expForLevel(lv) { return lv * 100; }
  /* Cho ăn: linh thạch / yêu đan / đan dược */
  function feedExpOf(foodId, foodDef) {
    if (foodId === "linhthach") return 0; /* linh thạch xử lý riêng theo số lượng */
    if (!foodDef) return 0;
    if (foodDef.kind === "yaodan") return 20 * ((foodDef.tier || 0) + 1);
    if (foodDef.kind === "pill") return 15;
    if (foodDef.kind === "material") return 8;
    return 5;
  }
  function addSpiritExp(state, itemId, exp) {
    var sp = spiritOf(state, itemId);
    if (!sp) return { ok: false };
    sp.exp += exp;
    var ups = 0;
    while (sp.exp >= expForLevel(sp.lv)) {
      sp.exp -= expForLevel(sp.lv);
      sp.lv += 1;
      ups += 1;
      /* Mỗi 5 cấp mở thêm 1 dòng skill */
      if (sp.lv % 5 === 0) {
        var ns = pick(SPIRIT_SKILL_POOL);
        sp.skills.push({ skill: ns.skill, lv: ns.lv });
      }
    }
    return { ok: true, levelUps: ups, spirit: sp };
  }
  /* Cho khí linh ăn bằng vật phẩm trong túi */
  function feed(state, itemId, foodId, foodDef, bagFns) {
    var sp = spiritOf(state, itemId);
    if (!sp) return { ok: false, reason: "chua_thuc_tinh" };
    var fns = bagFns || {};
    var exp = feedExpOf(foodId, foodDef);
    if (exp <= 0) return { ok: false, reason: "khong_an_duoc" };
    if (fns.removeItem && !fns.removeItem(state, foodId, 1))
      return { ok: false, reason: "thieu_vat_pham" };
    return addSpiritExp(state, itemId, exp);
  }
  /* Cho ăn bằng linh thạch: 100 linh thạch = 10 exp */
  function feedStones(state, itemId, amount) {
    var sp = spiritOf(state, itemId);
    if (!sp) return { ok: false, reason: "chua_thuc_tinh" };
    amount = Math.min(amount || 0, state.stones || 0);
    if (amount < 100) return { ok: false, reason: "thieu_linh_thach" };
    state.stones -= amount;
    var exp = Math.floor(amount / 100) * 10;
    return addSpiritExp(state, itemId, exp);
  }
  /* Ngộ đạo: tốn linh thạch, tỉ lệ học skill ngẫu nhiên */
  function enlighten(state, itemId) {
    var sp = spiritOf(state, itemId);
    if (!sp) return { ok: false, reason: "chua_thuc_tinh" };
    var cost = 500 * sp.lv;
    if ((state.stones || 0) < cost) return { ok: false, reason: "thieu_linh_thach" };
    state.stones -= cost;
    var chance = 0.30 + sp.lv * 0.02;
    if (Math.random() > chance) return { ok: false, reason: "ngo_dao_that_bai" };
    var ns = pick(SPIRIT_SKILL_POOL);
    sp.skills.push({ skill: ns.skill, lv: ns.lv });
    return { ok: true, skill: ns, spirit: sp };
  }
  /* Hệ số nhân chỉ số trang bị từ khí linh: +2%/cấp */
  function spiritStatMult(state, itemId) {
    var sp = spiritOf(state, itemId);
    if (!sp) return 1;
    return 1 + 0.02 * sp.lv;
  }
  /* Bonus tính cách khí linh: {stat, pct} */
  function spiritPersonalityBonus(state, itemId) {
    var sp = spiritOf(state, itemId);
    if (!sp) return null;
    for (var i = 0; i < SPIRIT_PERSONALITIES.length; i++) {
      if (SPIRIT_PERSONALITIES[i].id === sp.personality)
        return { stat: SPIRIT_PERSONALITIES[i].stat, pct: SPIRIT_PERSONALITIES[i].pct * sp.lv };
    }
    return null;
  }
  /* Ghi nhận thời gian đeo (ms) để tăng tỉ lệ thức tỉnh */
  function trackWorn(state, dtMs) {
    var eq = (state && state.equip) || {};
    if (!state.equipWornMs) state.equipWornMs = {};
    EQUIP_SLOTS.forEach(function (slot) {
      var id = eq[slot];
      if (!id) return;
      if (spiritOf(state, id)) return; /* đã thức tỉnh thì thôi */
      state.equipWornMs[id] = (state.equipWornMs[id] || 0) + dtMs;
    });
  }

  /* ---------- LUYỆN HÓA TRANG BỊ ---------- */
  var REFINE_MAX = 15;
  /* Hệ số chỉ số theo cấp luyện hóa: +8%/cấp */
  function refineStatMult(lv) { return 1 + 0.08 * (lv || 0); }
  /* Tỉ lệ thành công: +1..+9 = 100%, +10 trở lên giảm dần */
  function refineChance(lv) {
    if (lv < 9) return 1;
    var chances = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4]; /* lên +10..+15 */
    return chances[lv - 9] || 0.4;
  }
  function refineLvOf(state, itemId) {
    return ((state && state.refine) || {})[itemId] || 0;
  }
  /* Nguyên liệu luyện hóa theo cấp hiện tại → lên cấp tiếp theo */
  function refineCost(lv) {
    var next = lv + 1;
    var cost = { stones: 100 * next, da_cuong_hoa: 0, yaodan: 0 };
    if (next >= 6) cost.da_cuong_hoa = Math.ceil(next / 3);
    if (next >= 11) cost.yaodan = next - 10;
    return cost;
  }
  function canRefineItem(def) {
    /* Hiếm (tier>=1) trở lên mới luyện hóa được */
    return !!def && (def.tier || 0) >= 1;
  }
  /* Thử luyện hóa: thất bại không mất đồ, chỉ mất nguyên liệu */
  function doRefine(state, itemId, itemDefFn, bagFns) {
    var d = itemDefFn ? itemDefFn(itemId) : null;
    if (!d) return { ok: false, reason: "khong_co_do" };
    if (!canRefineItem(d)) return { ok: false, reason: "pham_thap" };
    var lv = refineLvOf(state, itemId);
    if (lv >= REFINE_MAX) return { ok: false, reason: "max_cap" };
    var cost = refineCost(lv);
    if ((state.stones || 0) < cost.stones) return { ok: false, reason: "thieu_linh_thach" };
    var fns = bagFns || {};
    if (cost.da_cuong_hoa > 0) {
      if (!fns.countItem || fns.countItem(state, "da_cuong_hoa") < cost.da_cuong_hoa)
        return { ok: false, reason: "thieu_da_cuong_hoa" };
    }
    if (cost.yaodan > 0) {
      /* yêu đan bất kỳ cấp nào cũng được, ưu tiên cấp thấp */
      var yd = findYaodan(state, fns, cost.yaodan);
      if (!yd) return { ok: false, reason: "thieu_yeu_dan" };
    }
    /* trừ nguyên liệu */
    state.stones -= cost.stones;
    if (cost.da_cuong_hoa > 0 && fns.removeItem) fns.removeItem(state, "da_cuong_hoa", cost.da_cuong_hoa);
    if (cost.yaodan > 0 && fns.removeItem) {
      var yd2 = findYaodan(state, fns, cost.yaodan);
      if (yd2) fns.removeItem(state, yd2.id, cost.yaodan);
    }
    /* roll thành công */
    if (Math.random() > refineChance(lv))
      return { ok: false, reason: "that_bai", lost: true };
    if (!state.refine) state.refine = {};
    state.refine[itemId] = lv + 1;
    return { ok: true, level: lv + 1 };
  }
  function findYaodan(state, fns, need) {
    if (!fns || !fns.countItem) return null;
    var bag = state.bag || [];
    var cands = [];
    bag.forEach(function (it) {
      /* nhận diện yêu đan theo id bắt đầu bằng yaodan */
      if (it.id && it.id.indexOf("yaodan") === 0 && (it.qty || 0) >= need)
        cands.push(it);
    });
    return cands[0] || null;
  }
  /* ---------- NÂNG PHẨM (tier-up sau luyện hóa max) ---------- */
  /* Trang bị +15 có thể nâng lên phẩm cảnh giới cao hơn */
  function tierUpOf(state, itemId) {
    return ((state && state.equipTierUp) || {})[itemId] || 0;
  }
  function effRealmOf(def, state, itemId) {
    var base = realmOfItem(def);
    return Math.min(base + tierUpOf(state, itemId), 7);
  }
  function canTierUp(state, itemId, itemDefFn) {
    var d = itemDefFn ? itemDefFn(itemId) : null;
    if (!d) return { ok: false, reason: "khong_co_do" };
    if (refineLvOf(state, itemId) < REFINE_MAX)
      return { ok: false, reason: "chua_max_luyen_hoa" };
    if (effRealmOf(d, state, itemId) >= 7)
      return { ok: false, reason: "max_pham" };
    return { ok: true };
  }
  function tierUpCost(state, itemId, itemDefFn) {
    var d = itemDefFn ? itemDefFn(itemId) : null;
    var r = effRealmOf(d, state, itemId);
    return { stones: 5000 * r, da_cuong_hoa: 5 * r, yaodan: r };
  }
  function doTierUp(state, itemId, itemDefFn, bagFns) {
    var chk = canTierUp(state, itemId, itemDefFn);
    if (!chk.ok) return chk;
    var cost = tierUpCost(state, itemId, itemDefFn);
    if ((state.stones || 0) < cost.stones) return { ok: false, reason: "thieu_linh_thach" };
    var fns = bagFns || {};
    if (!fns.countItem || fns.countItem(state, "da_cuong_hoa") < cost.da_cuong_hoa)
      return { ok: false, reason: "thieu_da_cuong_hoa" };
    var yd = findYaodan(state, fns, cost.yaodan);
    if (!yd) return { ok: false, reason: "thieu_yeu_dan" };
    state.stones -= cost.stones;
    if (fns.removeItem) {
      fns.removeItem(state, "da_cuong_hoa", cost.da_cuong_hoa);
      fns.removeItem(state, yd.id, cost.yaodan);
    }
    if (!state.equipTierUp) state.equipTierUp = {};
    state.equipTierUp[itemId] = tierUpOf(state, itemId) + 1;
    if (!state.refine) state.refine = {};
    state.refine[itemId] = 0; /* nâng phẩm → luyện hóa về +0 */
    return { ok: true, newRealm: effRealmOf(itemDefFn(itemId), state, itemId) };
  }

  return {
    EQUIP_REALM_STATS: EQUIP_REALM_STATS,
    SLOT_DIST: SLOT_DIST,
    EQUIP_SLOTS: EQUIP_SLOTS,
    stdStats: stdStats,
    realmOfItem: realmOfItem,
    canEquip: canEquip,
    isOutdated: isOutdated,
    suggestUpgrades: suggestUpgrades,
    linesOf: linesOf,
    skillLvBonus: skillLvBonus,
    equipStatPct: equipStatPct,
    SPIRIT_NAMES: SPIRIT_NAMES,
    SPIRIT_PERSONALITIES: SPIRIT_PERSONALITIES,
    SPIRIT_SKILL_POOL: SPIRIT_SKILL_POOL,
    canAwaken: canAwaken,
    spiritOf: spiritOf,
    awakenChance: awakenChance,
    awaken: awaken,
    expForLevel: expForLevel,
    feedExpOf: feedExpOf,
    addSpiritExp: addSpiritExp,
    feed: feed,
    feedStones: feedStones,
    enlighten: enlighten,
    spiritStatMult: spiritStatMult,
    spiritPersonalityBonus: spiritPersonalityBonus,
    trackWorn: trackWorn,
    REFINE_MAX: REFINE_MAX,
    refineStatMult: refineStatMult,
    refineChance: refineChance,
    refineLvOf: refineLvOf,
    refineCost: refineCost,
    canRefineItem: canRefineItem,
    doRefine: doRefine,
    tierUpOf: tierUpOf,
    effRealmOf: effRealmOf,
    canTierUp: canTierUp,
    tierUpCost: tierUpCost,
    doTierUp: doTierUp,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = { Khilinh: Khilinh };
}
