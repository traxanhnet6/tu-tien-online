/* ============================================================
 * js/encounter.js — Kỳ ngộ (thuần logic, chạy được trên node)
 * - Mỗi kỳ ngộ gắn với hệ phái đã chọn (kiem/phap/the): chỉ rớt
 *   bí tịch đúng hệ — không lệch hệ vô ích.
 * - Mỗi kỳ ngộ: điều kiện xuất hiện (map), độ hiếm
 *   (thuong 70% / hiem 25% / cuc_hiem 5%), 2-3 lựa chọn ứng xử.
 * - Lựa chọn ảnh hưởng thưởng + "đạo tâm" (state.daotam -100..100,
 *   để dành cho tính năng chính/tà sau này).
 * - rollEncounter(playerClass, mapId, rng) → encounter | null
 * - applyChoice(state, encId, choiceId, rng) → {ok, res}
 * ============================================================ */

var ENCOUNTERS = {
  /* ================= KIẾM TU ================= */
  kiem: [
    {
      id: "kngo_lao_kiem_khach", rarity: "thuong", map: 0,
      nameKey: "kngo_lao_kiem_khach", descKey: "kngo_lao_kiem_khach_desc",
      choices: [
        { id: "nhan", labelKey: "kngo_c_nhan",
          reward: { manual: "manual_kiem_1", stones: 50 }, daotam: 5 },
        { id: "tu_choi", labelKey: "kngo_c_tu_choi",
          reward: { exp: 30 }, daotam: 0 },
        { id: "cuop", labelKey: "kngo_c_cuop",
          reward: { manual: "manual_kiem_1", stones: 100 }, daotam: -15, risk: 0.3 },
      ],
    },
    {
      id: "kngo_hang_dong_kiem_y", rarity: "hiem", map: 1,
      nameKey: "kngo_hang_dong_kiem_y", descKey: "kngo_hang_dong_kiem_y_desc",
      choices: [
        { id: "nhan", labelKey: "kngo_c_linh_ngo",
          reward: { manual: "manual_kiem_2" }, daotam: 5 },
        { id: "tu_choi", labelKey: "kngo_c_roi_di",
          reward: { exp: 80 }, daotam: 0 },
        { id: "cuop", labelKey: "kngo_c_cuop",
          reward: { manual: "manual_kiem_2", stones: 200 }, daotam: -20, risk: 0.4 },
      ],
    },
    {
      id: "kngo_kiem_thanh_di_tich", rarity: "cuc_hiem", map: 2,
      nameKey: "kngo_kiem_thanh_di_tich", descKey: "kngo_kiem_thanh_di_tich_desc",
      choices: [
        { id: "nhan", labelKey: "kngo_c_tiep_nhan",
          reward: { manual: "manual_kiem_3", stones: 500 }, daotam: 10 },
        { id: "tu_choi", labelKey: "kngo_c_tu_choi",
          reward: { exp: 150 }, daotam: 0 },
        { id: "cuop", labelKey: "kngo_c_cuop",
          reward: { manual: "manual_kiem_3", stones: 800 }, daotam: -30, risk: 0.5 },
      ],
    },
  ],
  /* ================= PHÁP TU ================= */
  phap: [
    {
      id: "kngo_lao_thuat_si", rarity: "thuong", map: 0,
      nameKey: "kngo_lao_thuat_si", descKey: "kngo_lao_thuat_si_desc",
      choices: [
        { id: "nhan", labelKey: "kngo_c_nhan",
          reward: { manual: "manual_phap_1", stones: 50 }, daotam: 5 },
        { id: "tu_choi", labelKey: "kngo_c_tu_choi",
          reward: { exp: 30 }, daotam: 0 },
        { id: "cuop", labelKey: "kngo_c_cuop",
          reward: { manual: "manual_phap_1", stones: 100 }, daotam: -15, risk: 0.3 },
      ],
    },
    {
      id: "kngo_thap_linh_co", rarity: "hiem", map: 1,
      nameKey: "kngo_thap_linh_co", descKey: "kngo_thap_linh_co_desc",
      choices: [
        { id: "nhan", labelKey: "kngo_c_linh_ngo",
          reward: { manual: "manual_phap_2" }, daotam: 5 },
        { id: "tu_choi", labelKey: "kngo_c_roi_di",
          reward: { exp: 80 }, daotam: 0 },
        { id: "cuop", labelKey: "kngo_c_cuop",
          reward: { manual: "manual_phap_2", stones: 200 }, daotam: -20, risk: 0.4 },
      ],
    },
    {
      id: "kngo_loi_tri_truyen_thua", rarity: "cuc_hiem", map: 2,
      nameKey: "kngo_loi_tri_truyen_thua", descKey: "kngo_loi_tri_truyen_thua_desc",
      choices: [
        { id: "nhan", labelKey: "kngo_c_tiep_nhan",
          reward: { manual: "manual_phap_3", stones: 500 }, daotam: 10 },
        { id: "tu_choi", labelKey: "kngo_c_tu_choi",
          reward: { exp: 150 }, daotam: 0 },
        { id: "cuop", labelKey: "kngo_c_cuop",
          reward: { manual: "manual_phap_3", stones: 800 }, daotam: -30, risk: 0.5 },
      ],
    },
  ],
  /* ================= THỂ TU ================= */
  the: [
    {
      id: "kngo_lao_vo_su", rarity: "thuong", map: 0,
      nameKey: "kngo_lao_vo_su", descKey: "kngo_lao_vo_su_desc",
      choices: [
        { id: "nhan", labelKey: "kngo_c_nhan",
          reward: { manual: "manual_the_1", stones: 50 }, daotam: 5 },
        { id: "tu_choi", labelKey: "kngo_c_tu_choi",
          reward: { exp: 30 }, daotam: 0 },
        { id: "cuop", labelKey: "kngo_c_cuop",
          reward: { manual: "manual_the_1", stones: 100 }, daotam: -15, risk: 0.3 },
      ],
    },
    {
      id: "kngo_huyet_tri_luyen_the", rarity: "hiem", map: 1,
      nameKey: "kngo_huyet_tri_luyen_the", descKey: "kngo_huyet_tri_luyen_the_desc",
      choices: [
        { id: "nhan", labelKey: "kngo_c_linh_ngo",
          reward: { manual: "manual_the_2" }, daotam: 5 },
        { id: "tu_choi", labelKey: "kngo_c_roi_di",
          reward: { exp: 80 }, daotam: 0 },
        { id: "cuop", labelKey: "kngo_c_cuop",
          reward: { manual: "manual_the_2", stones: 200 }, daotam: -20, risk: 0.4 },
      ],
    },
    {
      id: "kngo_kim_cuong_dong", rarity: "cuc_hiem", map: 2,
      nameKey: "kngo_kim_cuong_dong", descKey: "kngo_kim_cuong_dong_desc",
      choices: [
        { id: "nhan", labelKey: "kngo_c_tiep_nhan",
          reward: { manual: "manual_the_3", stones: 500 }, daotam: 10 },
        { id: "tu_choi", labelKey: "kngo_c_tu_choi",
          reward: { exp: 150 }, daotam: 0 },
        { id: "cuop", labelKey: "kngo_c_cuop",
          reward: { manual: "manual_the_3", stones: 800 }, daotam: -30, risk: 0.5 },
      ],
    },
  ],
};

var RARITY_W = { thuong: 0.7, hiem: 0.25, cuc_hiem: 0.05 };

/* ============================================================
 * KỲ NGỘ ẨN (Gameplay 2026-10-21)
 * - Không xuất hiện trong roll thông thường
 * - Chỉ kích hoạt khi đủ điều kiện đặc biệt (trigger)
 * - trigger: { map?, x?, y?, radius?, hourFrom?, hourTo?,
 *              hasItem?, daotamMin?, daotamMax?, questDone?, minRealm? }
 * ============================================================ */
var HIDDEN_ENCOUNTERS = [
  {
    id: "kngo_an_co_mo", hidden: true,
    nameKey: "kngo_an_co_mo", descKey: "kngo_an_co_mo_desc",
    trigger: { map: 1, x: 200, y: 200, radius: 100, hourFrom: 0, hourTo: 5 },
    choices: [
      { id: "tham_hiem", labelKey: "kngo_c_tham_hiem",
        reward: { manual: "manual_kiem_3", stones: 1000 }, daotam: 10 },
      { id: "roi_di", labelKey: "kngo_c_roi_di",
        reward: { exp: 200 }, daotam: 0 },
    ],
  },
  {
    id: "kngo_an_lao_tang_kinh", hidden: true,
    nameKey: "kngo_an_lao_tang_kinh", descKey: "kngo_an_lao_tang_kinh_desc",
    trigger: { map: 0, hasItem: "khaiphongphu", daotamMin: 50 },
    choices: [
      { id: "doc_kinh", labelKey: "kngo_c_doc_kinh",
        reward: { exp: 500, stones: 300 }, daotam: 10 },
      { id: "lay_cap", labelKey: "kngo_c_lay_cap",
        reward: { manual: "manual_phap_2", stones: 800 }, daotam: -20, risk: 0.3 },
    ],
  },
  {
    id: "kngo_an_huyet_ma_truyen_thua", hidden: true,
    nameKey: "kngo_an_huyet_ma_truyen_thua", descKey: "kngo_an_huyet_ma_truyen_thua_desc",
    trigger: { map: 4, daotamMax: -50, minRealm: 2 },
    choices: [
      { id: "tiep_nhan", labelKey: "kngo_c_tiep_nhan",
        reward: { manual: "manual_ma_1", stones: 1500 }, daotam: -30 },
      { id: "khang_cu", labelKey: "kngo_c_khang_cu",
        reward: { exp: 400 }, daotam: 20 },
    ],
  },
  {
    id: "kngo_an_tien_nhan_di_tich", hidden: true,
    nameKey: "kngo_an_tien_nhan_di_tich", descKey: "kngo_an_tien_nhan_di_tich_desc",
    trigger: { map: 2, questDone: "q_story_10", x: 1400, y: 1000, radius: 150 },
    choices: [
      { id: "kham_pha", labelKey: "kngo_c_kham_pha",
        reward: { stones: 2000, exp: 800 }, daotam: 5 },
      { id: "cung_bai", labelKey: "kngo_c_cung_bai",
        reward: { exp: 600 }, daotam: 15 },
    ],
  },
];

/* Kiểm tra kỳ ngộ ẩn có thể kích hoạt không.
 * state: game state (quests, bag, daotam, char.realm...)
 * ctx: { mapId, x, y, hour } — vị trí và giờ hiện tại */
function checkHiddenTriggers(state, ctx) {
  var out = [];
  ctx = ctx || {};
  var hour = (ctx.hour != null) ? ctx.hour : new Date().getHours();
  for (var i = 0; i < HIDDEN_ENCOUNTERS.length; i++) {
    var h = HIDDEN_ENCOUNTERS[i];
    var tr = h.trigger || {};
    var ok = true;
    /* đã từng kích hoạt rồi thì không lặp lại */
    try {
      var seen = (state.hiddenEncountersSeen || {});
      if (seen[h.id]) ok = false;
    } catch (e) {}
    /* map */
    if (ok && tr.map != null && ctx.mapId !== tr.map) ok = false;
    /* vị trí */
    if (ok && tr.x != null && ctx.x != null) {
      var dd = Math.hypot(ctx.x - tr.x, ctx.y - tr.y);
      if (dd > (tr.radius || 100)) ok = false;
    }
    /* giờ trong ngày */
    if (ok && tr.hourFrom != null) {
      if (tr.hourFrom <= tr.hourTo) {
        if (hour < tr.hourFrom || hour > tr.hourTo) ok = false;
      } else {
        /* qua nửa đêm, vd 22h-5h */
        if (hour < tr.hourFrom && hour > tr.hourTo) ok = false;
      }
    }
    /* vật phẩm trong túi */
    if (ok && tr.hasItem) {
      var found = false;
      var bag = state.bag || [];
      for (var b = 0; b < bag.length; b++) {
        if (bag[b].id === tr.hasItem && bag[b].qty > 0) { found = true; break; }
      }
      if (!found) ok = false;
    }
    /* đạo tâm */
    if (ok && tr.daotamMin != null && (state.daotam || 0) < tr.daotamMin) ok = false;
    if (ok && tr.daotamMax != null && (state.daotam || 0) > tr.daotamMax) ok = false;
    /* quest đã xong */
    if (ok && tr.questDone) {
      var qs = state.quests || {};
      if (!qs[tr.questDone] || qs[tr.questDone].status !== "done") ok = false;
    }
    /* cảnh giới tối thiểu */
    if (ok && tr.minRealm != null) {
      var realm = (state.char && state.char.realm) || 0;
      if (realm < tr.minRealm) ok = false;
    }
    if (ok) out.push(h);
  }
  return out;
}

/* Đánh dấu kỳ ngộ ẩn đã kích hoạt (không lặp lại) */
function markHiddenSeen(state, encId) {
  if (!state.hiddenEncountersSeen) state.hiddenEncountersSeen = {};
  state.hiddenEncountersSeen[encId] = true;
}

function _cls(c) {
  return (c === "phap" || c === "the") ? c : "kiem";
}

/* Tìm kỳ ngộ theo id (mọi hệ + kỳ ngộ ẩn) */
function encounterById(id) {
  var keys = Object.keys(ENCOUNTERS);
  for (var i = 0; i < keys.length; i++) {
    var list = ENCOUNTERS[keys[i]];
    for (var j = 0; j < list.length; j++) {
      if (list[j].id === id) return list[j];
    }
  }
  /* kỳ ngộ ẩn */
  for (var k = 0; k < HIDDEN_ENCOUNTERS.length; k++) {
    if (HIDDEN_ENCOUNTERS[k].id === id) return HIDDEN_ENCOUNTERS[k];
  }
  return null;
}

/* Roll kỳ ngộ cho hệ phái + map hiện tại.
 * Trả encounter hoặc null. Tỉ lệ hiếm: thường 70 / hiếm 25 / cực hiếm 5. */
function rollEncounter(playerClass, mapId, rng) {
  var r = (typeof rng === "function") ? rng() : Math.random();
  var list = ENCOUNTERS[_cls(playerClass)] || [];
  var pool = list.filter(function (e) { return e.map === mapId; });
  if (!pool.length) return null;
  var roll = r;
  var want = roll < 0.7 ? "thuong" : (roll < 0.95 ? "hiem" : "cuc_hiem");
  var pick = pool.filter(function (e) { return e.rarity === want; });
  if (!pick.length) pick = pool;
  var r2 = (typeof rng === "function") ? rng() : Math.random();
  return pick[Math.floor(r2 * pick.length)];
}

/* Áp dụng lựa chọn của người chơi.
 * Trả {ok, res:{manual?, stones, exp, daotam, failed?}} */
function applyChoice(state, encId, choiceId, rng) {
  var enc = encounterById(encId);
  if (!enc) return { ok: false };
  var ch = null;
  for (var i = 0; i < enc.choices.length; i++) {
    if (enc.choices[i].id === choiceId) { ch = enc.choices[i]; break; }
  }
  if (!ch) return { ok: false };
  var res = { stones: 0, exp: 0, daotam: ch.daotam || 0, failed: false };
  /* cướp đoạt có tỉ lệ thất bại */
  if (ch.risk) {
    var r = (typeof rng === "function") ? rng() : Math.random();
    if (r < ch.risk) res.failed = true;
  }
  if (!res.failed) {
    var rw = ch.reward || {};
    if (rw.manual) {
      if (!state.bag) state.bag = [];
      var ex = null;
      for (var j = 0; j < state.bag.length; j++) {
        if (state.bag[j].id === rw.manual && !state.bag[j].locked) { ex = state.bag[j]; break; }
      }
      if (ex) ex.qty++;
      else state.bag.push({ id: rw.manual, qty: 1, locked: false });
      res.manual = rw.manual;
    }
    if (rw.stones) { state.stones = (state.stones || 0) + rw.stones; res.stones = rw.stones; }
    if (rw.exp) res.exp = rw.exp;
  }
  /* đạo tâm -100..100 */
  state.daotam = Math.max(-100, Math.min(100, (state.daotam || 0) + res.daotam));
  return { ok: true, res: res };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    ENCOUNTERS: ENCOUNTERS, RARITY_W: RARITY_W,
    HIDDEN_ENCOUNTERS: HIDDEN_ENCOUNTERS,
    encounterById: encounterById,
    rollEncounter: rollEncounter, applyChoice: applyChoice,
    checkHiddenTriggers: checkHiddenTriggers, markHiddenSeen: markHiddenSeen,
  };
}

/* Browser global (song song với module.exports cho node) */
(function () {
  if (typeof module !== "undefined" && module.exports) return;
  var _g = (typeof globalThis !== "undefined") ? globalThis :
    ((typeof window !== "undefined") ? window : null);
  if (!_g) return;
  _g.Encounter = {
    ENCOUNTERS: ENCOUNTERS,
    RARITY_W: RARITY_W,
    HIDDEN_ENCOUNTERS: HIDDEN_ENCOUNTERS,
    encounterById: encounterById,
    rollEncounter: rollEncounter,
    applyChoice: applyChoice,
    checkHiddenTriggers: checkHiddenTriggers,
    markHiddenSeen: markHiddenSeen
  };
})();
