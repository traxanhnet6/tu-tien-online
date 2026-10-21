/* ============================================================
 * js/farm.js — Linh Điền trồng linh thảo (thuần logic, chạy được trên node)
 * - Map riêng "Linh Điền" (cổng từ Thanh Vân Trấn), 6 ô đất ban đầu,
 *   mở thêm bằng Linh Thạch (tối đa 18 ô, giá tăng dần).
 * - Hạt giống mua ở Thương Nhân/Lão Nông Dân hoặc rớt từ quái.
 *   Thời gian lớn thời gian thực (vẫn lớn khi offline — theo timestamp):
 *   Linh Chi 30 phút, Trúc Cơ Thảo 2 giờ, Địa Linh Quả 8 giờ.
 * - Thu hoạch xong đất cần "làm đất" mới trồng tiếp; tỷ lệ nhỏ "biến dị"
 *   (linh thảo phẩm cao hơn / số lượng nhiều hơn).
 * - Linh thảo dùng luyện đan (sau này) và nguyên liệu đột phá Trúc Cơ.
 * - Rút ngắn thời gian bằng Linh Thạch.
 * - state.farm = { unlocked: 6, plots: [{seed, plantedAt, readyAt, needTill}] }
 * ============================================================ */

var FARM_MAX_PLOTS = 18;
var FARM_PLANTS = {
  hat_linh_chi: {
    timeMin: 30, herb: "thao_linh_chi", qty: [2, 3],
    mutate: { chance: 0.05, herb: "linh_chi_ngan_nam", qty: 1 },
  },
  hat_truc_co_thao: {
    timeMin: 120, herb: "truc_co_thao", qty: [1, 2],
    mutate: { chance: 0.05, herb: "truc_co_thao", qty: 3 },
  },
  hat_dia_linh_qua: {
    timeMin: 480, herb: "dia_linh_qua", qty: [1, 2],
    mutate: { chance: 0.08, herb: "dia_linh_qua", qty: 3 },
  },
};

function _save() { if (typeof saveGame === "function") { try { saveGame(); } catch (e) {} } }

function _farm(state) {
  if (!state.farm) state.farm = { unlocked: 6, plots: [] };
  if (!state.farm.plots) state.farm.plots = [];
  while (state.farm.plots.length < state.farm.unlocked) {
    state.farm.plots.push({ seed: null, plantedAt: 0, readyAt: 0, needTill: false });
  }
  return state.farm;
}
/* Giá mở ô thứ n (0-based): ô 6..17 */
function plotUnlockCost(n) {
  if (n < 6 || n >= FARM_MAX_PLOTS) return null;
  return Math.round(500 * Math.pow(n - 4, 1.4));
}
function unlockPlot(state, n) {
  var f = _farm(state);
  if (n !== f.unlocked || n >= FARM_MAX_PLOTS) return { ok: false, reason: "invalid" };
  var cost = plotUnlockCost(n);
  if ((state.stones || 0) < cost) return { ok: false, reason: "no_stone", need: cost };
  state.stones -= cost;
  f.unlocked++;
  f.plots.push({ seed: null, plantedAt: 0, readyAt: 0, needTill: false });
  _save();
  return { ok: true, unlocked: f.unlocked };
}
/* Trạng thái ô: empty | growing | ready | need_till */
function plotStatus(state, idx, nowMs) {
  var f = _farm(state);
  var p = f.plots[idx];
  if (!p) return { phase: "locked" };
  if (p.needTill) return { phase: "need_till" };
  if (!p.seed) return { phase: "empty" };
  var now = nowMs || Date.now();
  if (now >= p.readyAt) return { phase: "ready" };
  var total = p.readyAt - p.plantedAt;
  var pct = total > 0 ? Math.min(99, Math.round((now - p.plantedAt) / total * 100)) : 0;
  return { phase: "growing", pct: pct, leftMs: p.readyAt - now };
}
function plantSeed(state, idx, seedId) {
  var f = _farm(state);
  var p = f.plots[idx];
  var def = FARM_PLANTS[seedId];
  if (!p || !def) return { ok: false, reason: "invalid" };
  var st = plotStatus(state, idx, Date.now());
  if (st.phase !== "empty") return { ok: false, reason: "not_empty" };
  var has = (state.bag || []).some(function (it) { return it.id === seedId && it.qty > 0; });
  if (!has) return { ok: false, reason: "no_seed" };
  for (var i = 0; i < state.bag.length; i++) {
    if (state.bag[i].id === seedId) {
      state.bag[i].qty--;
      if (state.bag[i].qty <= 0) state.bag.splice(i, 1);
      break;
    }
  }
  var now = Date.now();
  p.seed = seedId;
  p.plantedAt = now;
  p.readyAt = now + def.timeMin * 60 * 1000;
  p.needTill = false;
  _save();
  return { ok: true };
}
function harvestPlot(state, idx, rng) {
  var f = _farm(state);
  var p = f.plots[idx];
  if (!p || !p.seed) return { ok: false, reason: "invalid" };
  if (plotStatus(state, idx, Date.now()).phase !== "ready") return { ok: false, reason: "not_ready" };
  var def = FARM_PLANTS[p.seed];
  var r = (typeof rng === "function") ? rng() : Math.random();
  var mutated = r < (def.mutate ? def.mutate.chance : 0);
  var herbId, qty;
  if (mutated) {
    herbId = def.mutate.herb;
    qty = def.mutate.qty;
  } else {
    herbId = def.herb;
    var q = def.qty;
    qty = q[0] + Math.floor(r * (q[1] - q[0] + 1));
  }
  if (typeof addItem === "function") addItem(state, herbId, qty);
  else {
    state.bag = state.bag || [];
    state.bag.push({ id: herbId, qty: qty });
  }
  p.seed = null;
  p.plantedAt = 0;
  p.readyAt = 0;
  p.needTill = true; /* thu xong phải làm đất */
  _save();
  return { ok: true, herbId: herbId, qty: qty, mutated: mutated };
}
function tillPlot(state, idx) {
  var f = _farm(state);
  var p = f.plots[idx];
  if (!p || !p.needTill) return { ok: false, reason: "invalid" };
  p.needTill = false;
  _save();
  return { ok: true };
}
/* Tưới nước: giảm 25% thời gian còn lại, mỗi ô tưới được 1 lần/ngày (Bui 2026-10-22) */
function waterPlot(state, idx) {
  var f = _farm(state);
  var p = f.plots[idx];
  if (!p || !p.seed) return { ok: false, reason: "invalid" };
  var st = plotStatus(state, idx, Date.now());
  if (st.phase !== "growing") return { ok: false, reason: "not_growing" };
  var today = new Date().toDateString();
  if (p.wateredAt === today) return { ok: false, reason: "already_watered" };
  var left = p.readyAt - Date.now();
  p.readyAt = Date.now() + Math.round(left * 0.75);
  p.wateredAt = today;
  _save();
  return { ok: true };
}
/* Rút ngắn: 1 Linh Thạch / 10 phút còn lại */
function speedupCost(leftMs) {
  return Math.max(1, Math.ceil(leftMs / 600000));
}
function speedupPlot(state, idx) {
  var f = _farm(state);
  var p = f.plots[idx];
  if (!p || !p.seed) return { ok: false, reason: "invalid" };
  var st = plotStatus(state, idx, Date.now());
  if (st.phase !== "growing") return { ok: false, reason: "not_growing" };
  var cost = speedupCost(st.leftMs);
  if ((state.stones || 0) < cost) return { ok: false, reason: "no_stone", need: cost };
  state.stones -= cost;
  p.readyAt = Date.now();
  _save();
  return { ok: true, cost: cost };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    FARM_MAX_PLOTS: FARM_MAX_PLOTS, FARM_PLANTS: FARM_PLANTS,
    plotUnlockCost: plotUnlockCost, unlockPlot: unlockPlot,
    plotStatus: plotStatus, plantSeed: plantSeed,
    harvestPlot: harvestPlot, tillPlot: tillPlot,
    waterPlot: waterPlot,
    speedupCost: speedupCost, speedupPlot: speedupPlot,
  };
}

/* Browser global (song song với module.exports cho node) */
(function () {
  if (typeof module !== "undefined" && module.exports) return;
  var _g = (typeof globalThis !== "undefined") ? globalThis :
    ((typeof window !== "undefined") ? window : null);
  if (!_g) return;
  _g.Farm = {
    FARM_MAX_PLOTS: FARM_MAX_PLOTS,
    FARM_PLANTS: FARM_PLANTS,
    plotUnlockCost: plotUnlockCost,
    unlockPlot: unlockPlot,
    plotStatus: plotStatus,
    plantSeed: plantSeed,
    harvestPlot: harvestPlot,
    tillPlot: tillPlot,
    waterPlot: waterPlot,
    speedupCost: speedupCost,
    speedupPlot: speedupPlot
  };
})();
