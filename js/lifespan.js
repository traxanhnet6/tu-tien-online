/* ============================================================
 * js/lifespan.js — Hệ thống Thọ Nguyên theo cảnh giới (Kỹ sư Gameplay)
 * Thuần logic, không DOM, chạy được trên node (smoke test).
 * - Mỗi nhân vật có Thọ Nguyên (năm). 1 giờ thực = 1 năm.
 * - Đột phá đại cảnh giới CỘNG thọ nguyên theo bảng yearsPerRealm.
 * - Thọ Nguyên Đan: Tiểu (+10) / Diên Thọ (+50) / Trường Sinh (+200).
 * - < 10 năm: cảnh báo đỏ + NPC Đại Phu nhắc. Về 0 → tọa hóa:
 *   chuyển thế (giữ 30% tu vi vào dự trữ + 1 thiên phú ngẫu nhiên)
 *   hoặc dùng Trường Sinh Đan hồi sinh khẩn.
 * Dữ liệu gốc: data/lifespan.json (LIFESPAN_DEF mirror ở đây để
 * chạy file:// + node; test kiểm tra 2 nơi đồng bộ).
 * ============================================================ */

var LIFESPAN_DEF = {
  /* Năm CỘNG thêm khi đạt cảnh giới (index = realm id 0..7) */
  yearsPerRealm: [100, 100, 300, 800, 2000, 5000, 10000, 20000],
  warnAt: 10,            // cảnh báo đỏ khi còn dưới X năm
  rebirthKeep: 0.3,      // chuyển thế giữ 30% tu vi
  reserveDripPct: 0.05,  // mỗi ngày chuyển 5% dự trữ thành exp
  pills: {
    dan_tho_tieu:    { years: 10 },
    dan_dien_tho:    { years: 50 },
    dan_truong_sinh: { years: 200 }
  },
  /* Thiên phú chuyển thế (mỗi lần 1 cái, không trùng) */
  talents: [
    { id: "thien_linh_can",  nameKey: "tn_talent_thien_linh_can",  descKey: "tn_talent_thien_linh_can_desc",  fx: { expPct: 0.15 } },
    { id: "kim_cuong_the",   nameKey: "tn_talent_kim_cuong_the",   descKey: "tn_talent_kim_cuong_the_desc",   fx: { hpPct: 0.10 } },
    { id: "dan_thanh",       nameKey: "tn_talent_dan_thanh",       descKey: "tn_talent_dan_thanh_desc",       fx: { pillPct: 0.20 } },
    { id: "kiem_tam",        nameKey: "tn_talent_kiem_tam",        descKey: "tn_talent_kiem_tam_desc",        fx: { btPct: 0.10 } },
    { id: "truong_sinh_the", nameKey: "tn_talent_truong_sinh_the", descKey: "tn_talent_truong_sinh_the_desc", fx: { drainPct: -0.20 } },
    { id: "phuc_duyen",      nameKey: "tn_talent_phuc_duyen",      descKey: "tn_talent_phuc_duyen_desc",      fx: { expPct: 0.08, hpPct: 0.05 } }
  ]
};

var Lifespan = (function () {
  "use strict";
  var D = LIFESPAN_DEF;
  var HOUR_MS = 3600000; // 1 giờ thực = 1 năm thọ nguyên

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

  function round1(n) { return Math.round(n * 10) / 10; }

  /* Khởi tạo field thiếu (save cũ / node test). KHÔNG trừ ngày ở đây. */
  function ensure(state) {
    if (!state) return state;
    if (state.thoNguyen == null) {
      var r = (state.char && state.char.realm) || 0;
      state.thoNguyen = cumulativeYears(Math.min(r, 7));
    }
    if (!state.tnLastTick) state.tnLastTick = Date.now();
    if (state.tnRebirths == null) state.tnRebirths = 0;
    if (!Array.isArray(state.tnTalents)) state.tnTalents = [];
    if (!Array.isArray(state.tnHistory)) state.tnHistory = [];
    if (state.tnReserve == null) state.tnReserve = 0;
    if (!state.tnLastDrip) state.tnLastDrip = Date.now();
    if (!state.tnPillUses || typeof state.tnPillUses !== "object") state.tnPillUses = {};
    return state;
  }

  /* Tổng năm tích lũy khi đạt cảnh giới realm (dùng cho migrate + thanh bar) */
  function cumulativeYears(realm) {
    var s = 0;
    for (var i = 0; i <= Math.min(realm, 7); i++) s += D.yearsPerRealm[i] || 0;
    return s;
  }

  function yearsLeft(state) {
    ensure(state);
    return round1(Math.max(0, state.thoNguyen || 0));
  }
  function barMax(state) {
    var r = (state.char && state.char.realm) || 0;
    return cumulativeYears(Math.min(r, 7));
  }
  function isLow(state) {
    var y = yearsLeft(state);
    return y > 0 && y < D.warnAt;
  }
  function isDead(state) { return yearsLeft(state) <= 0; }

  /* Hiệu quả đan thọ nguyên giảm dần: lần đầu 100%, sau mỗi lần x hệ số.
     Dược Vương Tông am hiểu đan đạo: hệ số 0.8 (giảm chậm), tông khác 0.6 */
  var PILL_DIMINISH = 0.6, PILL_DIMINISH_DUOC = 0.8;
  function pillDiminish(state) {
    ensure(state);
    return (state.char && state.char.sect === "duoc_vuong_tong") ? PILL_DIMINISH_DUOC : PILL_DIMINISH;
  }
  function pillUses(state, pillId) {
    ensure(state);
    return (state.tnPillUses && state.tnPillUses[pillId]) || 0;
  }
  function pillEffPct(state, pillId) {
    return Math.round(Math.pow(pillDiminish(state), pillUses(state, pillId)) * 100);
  }
  function pillYearsPreview(state, pillId, baseYears) {
    var eff = Math.pow(pillDiminish(state), pillUses(state, pillId));
    return round1(baseYears * eff);
  }
  /* Dùng 1 viên đan thọ nguyên: cộng năm theo hiệu quả giảm dần, tăng số lần dùng */
  function usePill(state, pillId, baseYears, mult) {
    ensure(state);
    mult = mult || 1;
    var dm = pillDiminish(state);
    var eff = Math.pow(dm, pillUses(state, pillId));
    var add = round1(baseYears * eff * mult);
    addYears(state, add);
    state.tnPillUses[pillId] = pillUses(state, pillId) + 1;
    return { years: add, uses: state.tnPillUses[pillId], effPct: Math.round(Math.pow(dm, state.tnPillUses[pillId]) * 100) };
  }
  function addYears(state, n) {
    ensure(state);
    state.thoNguyen = round1(Math.max(0, (state.thoNguyen || 0) + n));
    return yearsLeft(state);
  }

  /* Trừ thọ nguyên theo giờ thực đã trôi. Trả {days, died, dripExp}. */
  function tick(state, nowMs) {
    ensure(state);
    nowMs = nowMs || Date.now();
    var out = { days: 0, died: false, dripExp: 0 };
    var elapsed = nowMs - (state.tnLastTick || nowMs);
    if (elapsed < HOUR_MS) return out;
    var days = Math.floor(elapsed / HOUR_MS);
    out.days = days;
    /* Thiên phú Trường Sinh Thể: trôi chậm lại */
    var loss = days * (1 + talentDrainPct(state));
    state.thoNguyen = round1(Math.max(0, (state.thoNguyen || 0) - loss));
    state.tnLastTick = (state.tnLastTick || nowMs) + days * HOUR_MS;
    /* Dự trữ tu vi chuyển hóa dần thành exp — vẫn mỗi ngày 1 lần */
    if (state.tnReserve > 0 && nowMs - state.tnLastDrip >= 86400000) {
      var drip = Math.min(state.tnReserve, Math.max(1, Math.ceil(state.tnReserve * D.reserveDripPct)));
      state.tnReserve -= drip;
      state.tnLastDrip = nowMs;
      out.dripExp = drip;
    }
    if (state.thoNguyen <= 0) out.died = true;
    return out;
  }

  /* Đột phá thành công → cộng năm của cảnh giới mới. Trả số năm đã cộng. */
  function onBreakthrough(state) {
    ensure(state);
    var r = Math.min((state.char && state.char.realm) || 0, 7);
    var add = D.yearsPerRealm[r] || 0;
    addYears(state, add);
    return add;
  }

  /* ---------- thiên phú ---------- */
  function _talents(state) {
    ensure(state);
    return state.tnTalents || [];
  }
  function _fxSum(state, key) {
    var s = 0;
    _talents(state).forEach(function (tid) {
      for (var i = 0; i < D.talents.length; i++) {
        if (D.talents[i].id === tid && D.talents[i].fx[key]) s += D.talents[i].fx[key];
      }
    });
    return s;
  }
  function talentExpPct(state)   { return _fxSum(state, "expPct"); }
  function talentHpPct(state)    { return _fxSum(state, "hpPct"); }
  function talentPillPct(state)  { return _fxSum(state, "pillPct"); }
  function talentBtPct(state)    { return _fxSum(state, "btPct"); }
  function talentDrainPct(state) { return _fxSum(state, "drainPct") + equipDrainRed(state); }
  /* Ngọc Bội Trường Sinh (ô Pháp Bảo): giảm tốc độ trừ thọ nguyên */
  function equipDrainRed(state) {
    try {
      var id = state && state.equip && state.equip.phapbao;
      if (!id) return 0;
      if (typeof ITEMS !== "undefined" && ITEMS && ITEMS[id] && ITEMS[id].tnDrainRed)
        return -Math.abs(ITEMS[id].tnDrainRed);
      if (id === "ngoc_boi_truong_sinh") return -0.15;
    } catch (e) {}
    return 0;
  }

  /* Áp buff thiên phú vào chỉ số (móc trong getStats của ui.js) */
  function applyStats(s, state) {
    var p = talentHpPct(state);
    if (p) s.maxHp = Math.round(s.maxHp * (1 + p));
    return s;
  }

  /* Điểm tu vi hiện tại (để tính 30% giữ lại khi chuyển thế) */
  function tuviScore(state) {
    var c = state.char || {};
    return (c.realm || 0) * 10000 + (c.tier || 0) * 1000 + (c.exp || 0);
  }

  /* Bốc 1 thiên phú chưa sở hữu (random). */
  function rollTalent(state, randFn) {
    var owned = _talents(state);
    var pool = D.talents.filter(function (t) { return owned.indexOf(t.id) < 0; });
    if (!pool.length) pool = D.talents.slice();
    var r = randFn || Math.random;
    return pool[Math.floor(r() * pool.length)].id;
  }
  function talentDef(tid) {
    for (var i = 0; i < D.talents.length; i++) if (D.talents[i].id === tid) return D.talents[i];
    return null;
  }

  /* Chuyển thế: reset thân thể, giữ 30% tu vi vào dự trữ + 1 thiên phú. */
  function rebirth(state, nowMs) {
    ensure(state);
    nowMs = nowMs || Date.now();
    var kept = Math.floor(tuviScore(state) * D.rebirthKeep);
    var talent = rollTalent(state);
    state.tnHistory.push({
      at: nowMs,
      realm: (state.char && state.char.realm) || 0,
      kept: kept,
      talent: talent
    });
    state.tnRebirths = (state.tnRebirths || 0) + 1;
    state.tnTalents.push(talent);
    state.tnReserve = (state.tnReserve || 0) + kept;
    /* Thân thể mới */
    state.char.realm = 0;
    state.char.tier = 1;
    state.char.exp = 0;
    try {
      if (typeof baseStats === "function") {
        var st = baseStats(0, 1, state.char.sect);
        state.char.hp = st.maxHp; state.char.mp = st.maxMp;
      } else { state.char.hp = 100; state.char.mp = 50; }
    } catch (e) { state.char.hp = 100; state.char.mp = 50; }
    state.thoNguyen = D.yearsPerRealm[0];
    state.tnLastTick = nowMs;
    return { talent: talent, kept: kept };
  }

  /* Hồi sinh khẩn bằng Trường Sinh Đan trong túi. */
  function revive(state, nowMs) {
    ensure(state);
    nowMs = nowMs || Date.now();
    if (countItem(state, "dan_truong_sinh") <= 0) return { ok: false, reason: "no_pill" };
    removeItem(state, "dan_truong_sinh", 1);
    state.thoNguyen = D.pills.dan_truong_sinh.years;
    state.tnLastTick = nowMs;
    return { ok: true, years: D.pills.dan_truong_sinh.years };
  }

  return {
    ensure: ensure,
    cumulativeYears: cumulativeYears,
    yearsLeft: yearsLeft,
    barMax: barMax,
    isLow: isLow,
    isDead: isDead,
    addYears: addYears,
    tick: tick,
    pillUses: pillUses,
    pillDiminish: pillDiminish,
    pillEffPct: pillEffPct,
    pillYearsPreview: pillYearsPreview,
    usePill: usePill,
    onBreakthrough: onBreakthrough,
    talentExpPct: talentExpPct,
    talentHpPct: talentHpPct,
    talentPillPct: talentPillPct,
    talentBtPct: talentBtPct,
    talentDrainPct: talentDrainPct,
    equipDrainRed: equipDrainRed,
    applyStats: applyStats,
    tuviScore: tuviScore,
    rollTalent: rollTalent,
    talentDef: talentDef,
    rebirth: rebirth,
    revive: revive,
    countItem: countItem,
    removeItem: removeItem
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = { Lifespan: Lifespan, LIFESPAN_DEF: LIFESPAN_DEF };
}
