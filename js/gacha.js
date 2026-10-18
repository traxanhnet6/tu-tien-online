/* ============================================================
 * js/gacha.js — Tầm Bảo Các (thuần logic, chạy được trên node)
 * Mở qua NPC "Lão Tầm Tiên" ở Thanh Vân Trấn (kind: "gacha").
 * 3 bảng (Bui chốt):
 * - Bảng Phàm: 50/lần, 450/10 lần — Phàm 85% / Địa 14% / Thiên 1%
 * - Bảng Địa: 200/lần, 1800/10 lần — Phàm 55% / Địa 40% / Thiên 5%,
 *   quay 10 đảm bảo ≥1 Địa
 * - Bảng Thiên: 500/lần, 4500/10 lần — Phàm 30% / Địa 55% / Thiên 15%,
 *   quay 10 đảm bảo ≥1 Thiên; pity 30 lần không ra Thiên → lần 31 đảm bảo
 * Gacha rớt TỰ DO mọi phẩm/cảnh giới (điểm hấp dẫn của gacha);
 * bí tịch vượt cảnh giới thì khóa trong túi chờ đủ cảnh giới.
 * Bí tịch trùng → tự lên cấp (hoặc hóa Mảnh Bí Tịch khi max).
 * Ghép mảnh: 10/25/60 mảnh → bí tịch ngẫu nhiên Phàm/Địa/Thiên đúng hệ.
 * Phụ thuộc: Skills (skills.js), ITEMS (data.js, qua Skills.manualInfo).
 * ============================================================ */

var GACHA_BANNERS = {
  pham:  { nameKey: "gacha_banner_pham", cost1: 50, cost10: 450,
           rates: [[0.85, 0], [0.14, 1], [0.01, 2]], guarantee10: 1, pity: null },
  dia:   { nameKey: "gacha_banner_dia", cost1: 200, cost10: 1800,
           rates: [[0.55, 0], [0.40, 1], [0.05, 2]], guarantee10: 1, pity: null },
  thien: { nameKey: "gacha_banner_thien", cost1: 500, cost10: 4500,
           rates: [[0.30, 0], [0.55, 1], [0.15, 2]], guarantee10: 2,
           pity: { count: 30, tier: 2 } },
};
var GACHA_MERGE = [
  { frags: 10, tier: 0 },
  { frags: 25, tier: 1 },
  { frags: 60, tier: 2 },
];
var GACHA_HISTORY_N = 10;

function _save() { if (typeof saveGame === "function") { try { saveGame(); } catch (e) {} } }

function gachaBanner(id) { return GACHA_BANNERS[id] || null; }

/* Roll 1 phẩm theo bảng */
function _rollTier(banner, rng, forceMinTier) {
  var r = (typeof rng === "function") ? rng() : Math.random();
  var acc = 0;
  for (var i = 0; i < banner.rates.length; i++) {
    acc += banner.rates[i][0];
    if (r < acc) {
      var t = banner.rates[i][1];
      return t < forceMinTier ? forceMinTier : t;
    }
  }
  return Math.max(forceMinTier, banner.rates[banner.rates.length - 1][1]);
}

/* Chọn bí tịch ngẫu nhiên đúng hệ + phẩm trong pool gacha */
function _pickManual(playerClass, tier, rng) {
  var pool = Skills.manualsForGacha(playerClass).filter(function (id) {
    var mi = Skills.manualInfo(id);
    return mi && mi.tier === tier;
  });
  if (!pool.length) return null;
  var r = (typeof rng === "function") ? rng() : Math.random();
  return pool[Math.floor(r * pool.length)];
}

/* Quay gacha. Trả {ok, pulls:[{manualId,tier,res}], reason?}
 * reason: 'no_banner' | 'no_stone' */
function rollGacha(state, bannerId, count, rng) {
  var banner = gachaBanner(bannerId);
  if (!banner) return { ok: false, reason: "no_banner" };
  var n = count >= 10 ? 10 : 1;
  var cost = n >= 10 ? banner.cost10 : banner.cost1;
  if ((state.stones || 0) < cost) return { ok: false, reason: "no_stone", need: cost };
  state.stones -= cost;

  var cls = (state.char && state.char.sect) || "kiem";
  var pulls = [];
  var guaranteeIdx = n - 1; /* lượt cuối đảm bảo phẩm */
  state.gachaPity = state.gachaPity || { thien: 0 };

  for (var i = 0; i < n; i++) {
    var forceMin = 0;
    if (i === guaranteeIdx && banner.guarantee10) forceMin = banner.guarantee10;
    /* pity bảng Thiên: 30 lần không ra Thiên → đảm bảo Thiên */
    var pityHit = false;
    if (banner.pity && state.gachaPity.thien >= banner.pity.count) {
      forceMin = Math.max(forceMin, banner.pity.tier);
      pityHit = true;
    }
    var tier = _rollTier(banner, rng, forceMin);
    var mid = _pickManual(cls, tier, rng);
    var res = null;
    if (mid) res = Skills.obtainManual(state, mid); /* tự học/lên cấp/hóa mảnh */
    if (tier === 2) state.gachaPity.thien = 0;
    else if (bannerId === "thien") state.gachaPity.thien++;
    if (pityHit) state.gachaPity.thien = 0;
    pulls.push({ manualId: mid, tier: tier, res: res, pity: pityHit });
  }
  /* lịch sử 10 lần gần nhất */
  state.gachaHistory = state.gachaHistory || [];
  pulls.forEach(function (p) {
    state.gachaHistory.unshift({ manualId: p.manualId, tier: p.tier, at: Date.now(), banner: bannerId });
  });
  state.gachaHistory = state.gachaHistory.slice(0, GACHA_HISTORY_N);
  _save();
  return { ok: true, pulls: pulls, cost: cost };
}

/* Ghép mảnh: đủ mảnh → bí tịch ngẫu nhiên đúng hệ theo phẩm */
function mergeFragments(state, tier) {
  var cfg = null;
  for (var i = 0; i < GACHA_MERGE.length; i++) {
    if (GACHA_MERGE[i].tier === tier) cfg = GACHA_MERGE[i];
  }
  if (!cfg) return { ok: false, reason: "no_tier" };
  if ((state.fragments || 0) < cfg.frags) return { ok: false, reason: "no_frag", need: cfg.frags };
  var cls = (state.char && state.char.sect) || "kiem";
  var mid = Skills.randomManualForClass(cls, tier);
  if (!mid) return { ok: false, reason: "no_pool" };
  state.fragments -= cfg.frags;
  var res = Skills.obtainManual(state, mid);
  _save();
  return { ok: true, manualId: mid, tier: tier, res: res };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    GACHA_BANNERS: GACHA_BANNERS, GACHA_MERGE: GACHA_MERGE,
    gachaBanner: gachaBanner, rollGacha: rollGacha, mergeFragments: mergeFragments,
  };
}

/* Browser global (song song với module.exports cho node) */
(function () {
  if (typeof module !== "undefined" && module.exports) return;
  var _g = (typeof globalThis !== "undefined") ? globalThis :
    ((typeof window !== "undefined") ? window : null);
  if (!_g) return;
  _g.Gacha = {
    GACHA_BANNERS: GACHA_BANNERS,
    GACHA_MERGE: GACHA_MERGE,
    gachaBanner: gachaBanner,
    rollGacha: rollGacha,
    mergeFragments: mergeFragments
  };
})();
