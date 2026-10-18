/* ============================================================
 * js/alliance.js — Vạn Tiên Minh (thuần logic, chạy được trên node)
 * Liên minh đứng trên 5 tông môn — khung tổ chức cho sự kiện
 * liên tông môn (flagship sau này: THÚ TRIỀU — đợt yêu thú tràn xuống,
 * các tông cùng chống đỡ; cần online nhiều người nên bản offline này
 * CHƯA code, chỉ chừa khung data + ghi chú spec).
 * - NPC Minh Chủ ở đại điện trung tâm (mở ở Trúc Cơ).
 * - Nhiệm vụ Minh hằng ngày/tuần (khó hơn nhiệm vụ tông):
 *   thưởng điểm cống hiến Minh + Linh Thạch + rương.
 * - Shop Minh: đổi điểm cống hiến lấy bí tịch hiếm, trứng linh thú
 *   Huyền trở lên, nguyên liệu đột phá.
 * - Chức vụ theo cống hiến: Ngoại Môn → Nội Môn → Hộ Pháp → Trưởng Lão
 *   (giảm giá shop Minh).
 * - Bảng xếp hạng tông môn theo tổng cống hiến (offline: NPC mẫu;
 *   để sẵn chỗ cắm online milestone 2).
 * - state.alliance = { contrib, daily: {date,progress,claimed},
 *     weekly: {week,progress,claimed} }
 * ============================================================ */

var ALLIANCE_RANKS = [
  { id: 0, nameKey: "alm_rank_0", need: 0, discount: 0 },
  { id: 1, nameKey: "alm_rank_1", need: 200, discount: 0.05 },
  { id: 2, nameKey: "alm_rank_2", need: 800, discount: 0.10 },
  { id: 3, nameKey: "alm_rank_3", need: 2000, discount: 0.15 },
];
var ALLIANCE_DAILY = [
  { id: "alm_giet30", nameKey: "alm_dq_giet30", descKey: "alm_dq_giet30_desc",
    need: { type: "kill", count: 30 }, contrib: 30, stones: 200 },
  { id: "alm_gietboss3", nameKey: "alm_dq_gietboss3", descKey: "alm_dq_gietboss3_desc",
    need: { type: "killboss", count: 3 }, contrib: 60, stones: 400 },
  { id: "alm_donate2000", nameKey: "alm_dq_donate2000", descKey: "alm_dq_donate2000_desc",
    need: { type: "stones", count: 2000 }, contrib: 25, stones: 0 },
];
var ALLIANCE_WEEKLY = [
  { id: "alm_w_giet200", nameKey: "alm_wq_giet200", descKey: "alm_wq_giet200_desc",
    need: { type: "kill", count: 200 }, contrib: 150, stones: 1500,
    chest: "ruong_minh_tuan" },
  { id: "alm_w_boss10", nameKey: "alm_wq_boss10", descKey: "alm_wq_boss10_desc",
    need: { type: "killboss", count: 10 }, contrib: 250, stones: 2500,
    chest: "ruong_minh_tuan" },
];
/* Shop Minh: {id (item), cost (điểm cống hiến)} */
var ALLIANCE_SHOP = [
  { id: "manual_kiem_2", cost: 300 },
  { id: "manual_phap_2", cost: 300 },
  { id: "manual_the_2", cost: 300 },
  { id: "manual_kiem_3", cost: 600 },
  { id: "manual_phap_3", cost: 600 },
  { id: "manual_the_3", cost: 600 },
  { id: "trung_huyen", cost: 500 },
  { id: "trung_dia", cost: 1200 },
  { id: "pill_truccodan", cost: 400 },
  { id: "truc_co_thao", cost: 150 },
];
/* Khung sự kiện liên tông môn (data-driven để bản sau mở).
 * thu_trieu: CHƯA code — spec trong DESIGN.md. */
var ALLIANCE_EVENTS = [
  {
    id: "thu_trieu",
    nameKey: "event_thu_trieu",
    descKey: "event_thu_trieu_desc",
    type: "beast_tide",
    status: "upcoming", /* upcoming | active | ended */
    schedule: "weekly",
    unlock: { realm: 2 },
    rewards: { by_contrib: true, top_sect_bonus: true },
    note: "can_online_multiplayer",
  },
];

function _save() { if (typeof saveGame === "function") { try { saveGame(); } catch (e) {} } }
function _al(state) {
  if (!state.alliance) state.alliance = { contrib: 0, daily: null, weekly: null };
  return state.alliance;
}
function _today() {
  var d = new Date();
  return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
}
function _week() {
  var d = new Date();
  var onejan = new Date(d.getFullYear(), 0, 1);
  return d.getFullYear() + "-W" + Math.ceil(((d - onejan) / 86400000 + onejan.getDay() + 1) / 7);
}
function _period(al, kind) {
  if (kind === "daily") {
    var t = _today();
    if (!al.daily || al.daily.date !== t) al.daily = { date: t, progress: {}, claimed: [] };
    return al.daily;
  }
  var w = _week();
  if (!al.weekly || al.weekly.week !== w) al.weekly = { week: w, progress: {}, claimed: [] };
  return al.weekly;
}
function almContrib(state) { return _al(state).contrib || 0; }
function almRank(state) {
  var c = almContrib(state);
  var r = ALLIANCE_RANKS[0];
  for (var i = 0; i < ALLIANCE_RANKS.length; i++) {
    if (c >= ALLIANCE_RANKS[i].need) r = ALLIANCE_RANKS[i];
  }
  return r;
}
function almDiscount(state) { return almRank(state).discount || 0; }
function addAlmContrib(state, n) {
  var al = _al(state);
  al.contrib = (al.contrib || 0) + n;
  _save();
  return al.contrib;
}
/* Đếm cho nhiệm vụ Minh (gọi cùng lúc với Sect.onKill) */
function onKillAlm(state, isBoss) {
  var al = _al(state);
  var d = _period(al, "daily"), w = _period(al, "weekly");
  d.progress.alm_giet30 = (d.progress.alm_giet30 || 0) + 1;
  w.progress.alm_w_giet200 = (w.progress.alm_w_giet200 || 0) + 1;
  if (isBoss) {
    d.progress.alm_gietboss3 = (d.progress.alm_gietboss3 || 0) + 1;
    w.progress.alm_w_boss10 = (w.progress.alm_w_boss10 || 0) + 1;
  }
}
function onDonateAlm(state, amount) {
  var al = _al(state);
  var d = _period(al, "daily");
  d.progress.alm_donate2000 = (d.progress.alm_donate2000 || 0) + amount;
}
function _questList(state, kind) {
  var al = _al(state);
  var p = _period(al, kind);
  var qs = kind === "daily" ? ALLIANCE_DAILY : ALLIANCE_WEEKLY;
  return qs.map(function (q) {
    var prog = p.progress[q.id] || 0;
    return {
      id: q.id, nameKey: q.nameKey, descKey: q.descKey,
      prog: Math.min(prog, q.need.count), need: q.need.count,
      contrib: q.contrib, stones: q.stones || 0, chest: q.chest || null,
      done: prog >= q.need.count,
      claimed: p.claimed.indexOf(q.id) >= 0,
    };
  });
}
function almDaily(state) { return _questList(state, "daily"); }
function almWeekly(state) { return _questList(state, "weekly"); }
function claimAlm(state, kind, questId) {
  var al = _al(state);
  var p = _period(al, kind);
  var qs = kind === "daily" ? ALLIANCE_DAILY : ALLIANCE_WEEKLY;
  var q = null;
  for (var i = 0; i < qs.length; i++) if (qs[i].id === questId) q = qs[i];
  if (!q) return { ok: false, reason: "khong_ton_tai" };
  if (p.claimed.indexOf(questId) >= 0) return { ok: false, reason: "da_nhan" };
  if ((p.progress[questId] || 0) < q.need.count) return { ok: false, reason: "chua_xong" };
  p.claimed.push(questId);
  al.contrib = (al.contrib || 0) + q.contrib;
  if (q.stones) state.stones = (state.stones || 0) + q.stones;
  var chest = null;
  if (q.chest) {
    if (!state.bag) state.bag = [];
    state.bag.push({ id: q.chest, qty: 1, locked: false });
    chest = q.chest;
  }
  _save();
  return { ok: true, contrib: q.contrib, stones: q.stones || 0, chest: chest };
}
/* Mua ở shop Minh (giảm giá theo chức vụ) */
function buyAlmShop(state, itemId) {
  var al = _al(state);
  var entry = null;
  for (var i = 0; i < ALLIANCE_SHOP.length; i++) {
    if (ALLIANCE_SHOP[i].id === itemId) entry = ALLIANCE_SHOP[i];
  }
  if (!entry) return { ok: false, reason: "khong_ban" };
  var cost = Math.ceil(entry.cost * (1 - almDiscount(state)));
  if ((al.contrib || 0) < cost) return { ok: false, reason: "thieu_cong_hien", need: cost };
  al.contrib -= cost;
  if (!state.bag) state.bag = [];
  var ex = null;
  for (var j = 0; j < state.bag.length; j++) {
    if (state.bag[j].id === itemId && !state.bag[j].locked) { ex = state.bag[j]; break; }
  }
  if (ex) ex.qty++;
  else state.bag.push({ id: itemId, qty: 1, locked: false });
  _save();
  return { ok: true, cost: cost };
}
/* Bảng xếp hạng tông môn (offline: NPC mẫu + tông của người chơi) */
function sectRankings(state) {
  var base = [
    { sect: "kiem_tong", members: 128, power: 45200 },
    { sect: "thien_phap_tong", members: 115, power: 43800 },
    { sect: "kim_cang_tong", members: 97, power: 38500 },
    { sect: "duoc_vuong_tong", members: 76, power: 31200 },
    { sect: "ngu_thu_tong", members: 64, power: 28900 },
  ];
  var mySect = null;
  try {
    if (typeof Sect !== "undefined" && Sect.joinedSect) mySect = Sect.joinedSect(state);
  } catch (e) {}
  var myContrib = 0;
  try {
    if (typeof Sect !== "undefined" && Sect.sectContrib) myContrib = Sect.sectContrib(state);
  } catch (e2) {}
  return base.map(function (b) {
    return {
      sect: b.sect,
      members: b.members + (b.sect === mySect ? 1 : 0),
      power: b.power + (b.sect === mySect ? myContrib * 10 : 0),
      mine: b.sect === mySect,
    };
  }).sort(function (a, b) { return b.power - a.power; });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    ALLIANCE_RANKS: ALLIANCE_RANKS, ALLIANCE_DAILY: ALLIANCE_DAILY,
    ALLIANCE_WEEKLY: ALLIANCE_WEEKLY, ALLIANCE_SHOP: ALLIANCE_SHOP,
    ALLIANCE_EVENTS: ALLIANCE_EVENTS,
    almContrib: almContrib, almRank: almRank, almDiscount: almDiscount,
    addAlmContrib: addAlmContrib, onKillAlm: onKillAlm, onDonateAlm: onDonateAlm,
    almDaily: almDaily, almWeekly: almWeekly, claimAlm: claimAlm,
    buyAlmShop: buyAlmShop, sectRankings: sectRankings,
  };
}

/* Browser global */
(function () {
  var _g = (typeof globalThis !== "undefined") ? globalThis :
    (typeof window !== "undefined" ? window : null);
  if (!_g) return;
  _g.Alliance = {
    ALLIANCE_RANKS: ALLIANCE_RANKS, ALLIANCE_DAILY: ALLIANCE_DAILY,
    ALLIANCE_WEEKLY: ALLIANCE_WEEKLY, ALLIANCE_SHOP: ALLIANCE_SHOP,
    ALLIANCE_EVENTS: ALLIANCE_EVENTS,
    almContrib: almContrib, almRank: almRank, almDiscount: almDiscount,
    addAlmContrib: addAlmContrib, onKillAlm: onKillAlm, onDonateAlm: onDonateAlm,
    almDaily: almDaily, almWeekly: almWeekly, claimAlm: claimAlm,
    buyAlmShop: buyAlmShop, sectRankings: sectRankings,
  };
})();
