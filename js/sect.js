/* ============================================================
 * js/sect.js — Tông môn (thuần logic, chạy được trên node)
 * - SECTS: 6 tông môn (Bui chốt):
 *   1. Kiếm Tông — kiếm tu (sát thương đơn, bạo kích +5%)
 *   2. Thiên Pháp Tông — pháp tu (linh lực tối đa +15%)
 *   3. Kim Cang Tông — thể tu (HP tối đa +10%)
 *   4. Dược Vương Tông — luyện đan (đan dược hiệu quả +20%)
 *   5. Ngự Thú Tông — ngự thú (linh thú +20% chỉ số, ấp nhanh 30%)
 *   6. Cửu U Ma Tông — TÀ TU, chỉ Ma Đạo (+20% sát thương ma đạo, +15% hút máu)
 * - Mỗi tông 3 bí tịch độc quyền ở Tàng Kinh Các (đổi bằng điểm cống hiến).
 * - Mỗi nhân vật chỉ ở 1 tông; đổi tông tốn 5000 Linh Thạch và
 *   mất điểm cống hiến cũ (giữ bí tịch đã học).
 * - state.sectInfo = { joined: null|'kiem_tong'|..., contrib: 0,
 *     daily: { date, progress: {qid: n}, claimed: [qid] } }
 * - Sect.onKill(state): đếm tiến trình nhiệm vụ giết quái hằng ngày.
 * ============================================================ */

var SECTS = {
  kiem_tong: {
    dao: "chinh",
    nameKey: "sect_kiem_tong", descKey: "sect_kiem_tong_desc",
    innateKey: "sect_innate_kiem",
    manuals: [
      { id: "manual_kiem_1", cost: 40 },
      { id: "manual_kiem_2", cost: 100 },
      { id: "manual_kiem_3", cost: 180 },
      { id: "manual_kiem_4", cost: 400 },
      { id: "manual_sig_kiem", cost: 3000 },
    ],
  },
  thien_phap_tong: {
    dao: "chinh",
    nameKey: "sect_thien_phap_tong", descKey: "sect_thien_phap_tong_desc",
    innateKey: "sect_innate_phap",
    manuals: [
      { id: "manual_phap_1", cost: 40 },
      { id: "manual_phap_2", cost: 100 },
      { id: "manual_phap_3", cost: 180 },
      { id: "manual_phap_4", cost: 400 },
      { id: "manual_phap_5", cost: 250 },
      { id: "manual_sig_phap", cost: 3000 },
    ],
  },
  kim_cang_tong: {
    dao: "chinh",
    nameKey: "sect_kim_cang_tong", descKey: "sect_kim_cang_tong_desc",
    innateKey: "sect_innate_the",
    manuals: [
      { id: "manual_the_1", cost: 40 },
      { id: "manual_the_2", cost: 100 },
      { id: "manual_the_3", cost: 180 },
      { id: "manual_the_4", cost: 250 },
      { id: "manual_the_5", cost: 250 },
      { id: "manual_sig_the", cost: 3000 },
    ],
  },
  duoc_vuong_tong: {
    dao: "chinh",
    nameKey: "sect_duoc_vuong_tong", descKey: "sect_duoc_vuong_tong_desc",
    innateKey: "sect_innate_duoc",
    manuals: [
      { id: "manual_duoc_1", cost: 120 },
      { id: "manual_duoc_2", cost: 150 },
      { id: "manual_duoc_3", cost: 250 },
      { id: "manual_duoc_4", cost: 400 },
      { id: "manual_sig_duoc", cost: 3000 },
    ],
  },
  ngu_thu_tong: {
    dao: "trung",
    nameKey: "sect_ngu_thu_tong", descKey: "sect_ngu_thu_tong_desc",
    innateKey: "sect_innate_thu",
    manuals: [
      { id: "manual_thu_1", cost: 120 },
      { id: "manual_thu_2", cost: 150 },
      { id: "manual_thu_3", cost: 250 },
      { id: "manual_thu_4", cost: 400 },
      { id: "manual_sig_thu", cost: 3000 },
    ],
  },
  /* 6. Cửu U Ma Tông — phe TÀ TU: chỉ nhận người chơi đường Ma Đạo */
  cuu_u_ma_tong: {
    dao: "ma",
    nameKey: "sect_cuu_u_ma_tong", descKey: "sect_cuu_u_ma_tong_desc",
    innateKey: "sect_innate_ma",
    manuals: [
      { id: "manual_ma_1", cost: 120 },
      { id: "manual_ma_2", cost: 150 },
      { id: "manual_ma_3", cost: 250 },
      { id: "manual_ma_4", cost: 350 },
      { id: "manual_ma_5", cost: 600 },
      { id: "manual_ps_ma_1", cost: 200 },
      { id: "manual_ps_ma_2", cost: 300 },
      { id: "manual_sig_ma", cost: 3000 },
    ],
  },
};
/* Map key tông cũ (3 tông) → 5 tông mới (migrate save) */
var SECT_MIGRATE = { phap_tong: "thien_phap_tong", the_tong: "kim_cang_tong" };
var SECT_SWITCH_COST = 5000;

/* Nhiệm vụ tông môn hằng ngày (reset 0h) — khung chung cho 5 tông */
var SECT_DAILY = [
  {
    id: "giet10", nameKey: "sect_dq_giet10", descKey: "sect_dq_giet10_desc",
    need: { type: "kill", count: 10 }, contrib: 20,
  },
  {
    id: "gietboss", nameKey: "sect_dq_gietboss", descKey: "sect_dq_gietboss_desc",
    need: { type: "killboss", count: 1 }, contrib: 40,
  },
  {
    id: "donate500", nameKey: "sect_dq_donate500", descKey: "sect_dq_donate500_desc",
    need: { type: "stones", count: 500 }, contrib: 15,
  },
];

function _si(state) {
  if (!state.sectInfo) {
    state.sectInfo = { joined: null, contrib: 0, daily: null };
  }
  /* migrate key cũ */
  if (state.sectInfo.joined && SECT_MIGRATE[state.sectInfo.joined]) {
    state.sectInfo.joined = SECT_MIGRATE[state.sectInfo.joined];
  }
  return state.sectInfo;
}
function _today() {
  var d = new Date();
  var m = ("0" + (d.getMonth() + 1)).slice(-2);
  var day = ("0" + d.getDate()).slice(-2);
  return d.getFullYear() + "-" + m + "-" + day;
}
function _daily(si) {
  var t = _today();
  if (!si.daily || si.daily.date !== t) {
    si.daily = { date: t, progress: {}, claimed: [] };
  }
  return si.daily;
}

/* Gia nhập tông môn (chưa ở tông nào).
 * Cửu U Ma Tông chỉ nhận đường Ma Đạo. */
function _sectDaoOk(state, sectId) {
  var sc = SECTS[sectId];
  if (sc && sc.dao === "ma") {
    return state && state.dao === "ma";
  }
  return true;
}
function joinSect(state, sectId) {
  var si = _si(state);
  if (si.joined) return { ok: false, reason: "da_gia_nhap" };
  if (!SECTS[sectId]) return { ok: false, reason: "khong_ton_tai" };
  if (!_sectDaoOk(state, sectId)) return { ok: false, reason: "can_ma_dao" };
  si.joined = sectId;
  si.contrib = 0;
  si.rank = "ngoai_mon";   /* chức vụ khởi đầu */
  si.titles = [];
  return { ok: true };
}
/* Đổi tông: tốn 5000 Linh Thạch, mất điểm cống hiến cũ, giữ bí tịch đã học. */
function switchSect(state, sectId) {
  var si = _si(state);
  if (!si.joined) return joinSect(state, sectId);
  if (si.joined === sectId) return { ok: false, reason: "da_gia_nhap" };
  if (!SECTS[sectId]) return { ok: false, reason: "khong_ton_tai" };
  if (!_sectDaoOk(state, sectId)) return { ok: false, reason: "can_ma_dao" };
  if ((state.stones || 0) < SECT_SWITCH_COST)
    return { ok: false, reason: "thieu_linh_thach", need: SECT_SWITCH_COST };
  state.stones -= SECT_SWITCH_COST;
  /* Rời tông: hủy nhiệm vụ tông đang làm dở, reset chức vụ */
  try {
    if (typeof SectQuest !== "undefined" && SectQuest.onLeaveSect) SectQuest.onLeaveSect(state);
  } catch (e) {}
  si.joined = sectId;
  si.contrib = 0;
  si.daily = null;
  return { ok: true, switched: true };
}
function joinedSect(state) {
  var si = _si(state);
  return si.joined;
}
function sectContrib(state) {
  return _si(state).contrib || 0;
}
/* Buff khi gia nhập tông môn (có hiệu lực ngay, mất khi rời tông).
 * - Kiếm Tông: +15% sát thương skill kiếm, +10% bạo kích
 * - Thiên Pháp Tông: +15% sát thương skill pháp, +20% tốc hồi linh lực
 * - Kim Cang Tông: +20% HP tối đa, +15% giáp
 * - Dược Vương Tông: +30% hiệu quả đan dược/thức ăn, +10% tốc hồi HP
 * - Ngự Thú Tông: linh thú +20% chỉ số, ấp trứng nhanh 30%
 * - Cửu U Ma Tông: +20% sát thương ma đạo, +15% hút máu
 * - "Tâm đầu ý hợp": hệ phái nhân vật trùng tông → +5% sát thương skill nữa */
var SECT_CLASS_MATCH = { kiem_tong: "kiem", thien_phap_tong: "phap", kim_cang_tong: "the" };
function sectBuff(state) {
  var b = {
    crit: 0,
    skillDmg: { kiem: 1, phap: 1, the: 1, ma: 1, other: 1 },
    hpMult: 1, armorMult: 1,
    pillMult: 1, hpRegenMult: 1, mpRegenMult: 1,
    petMult: 1, hatchFast: 1, lifesteal: 0,
    soul: false,
  };
  var j = joinedSect(state);
  if (j === "kiem_tong") { b.skillDmg.kiem = 1.15; b.crit = 0.10; }
  else if (j === "thien_phap_tong") { b.skillDmg.phap = 1.15; b.mpRegenMult = 1.20; }
  else if (j === "kim_cang_tong") { b.hpMult = 1.20; b.armorMult = 1.15; }
  else if (j === "duoc_vuong_tong") { b.pillMult = 1.30; b.hpRegenMult = 1.10; }
  else if (j === "ngu_thu_tong") { b.petMult = 1.20; b.hatchFast = 0.7; }
  else if (j === "cuu_u_ma_tong") { b.skillDmg.ma = 1.20; b.lifesteal = 0.15; }
  else return b;
  /* tâm đầu ý hợp */
  var pc = state.char && state.char.sect;
  if (pc && SECT_CLASS_MATCH[j] === pc) {
    b.soul = true;
    Object.keys(b.skillDmg).forEach(function (k) { b.skillDmg[k] *= 1.05; });
  }
  return b;
}
/* alias cũ (giữ tương thích) */
function sectInnate(state) { return sectBuff(state); }

/* Đổi bí tịch ở Tàng Kinh Các bằng điểm cống hiến.
 * Trả {ok, reason?} — reason: 'chua_gia_nhap' | 'thieu_cong_hien' | 'khong_ban' */
function buyManual(state, manualId) {
  var si = _si(state);
  if (!si.joined) return { ok: false, reason: "chua_gia_nhap" };
  var sect = SECTS[si.joined];
  var entry = null;
  for (var i = 0; i < sect.manuals.length; i++) {
    if (sect.manuals[i].id === manualId) { entry = sect.manuals[i]; break; }
  }
  if (!entry) return { ok: false, reason: "khong_ban" };
  if ((si.contrib || 0) < entry.cost) return { ok: false, reason: "thieu_cong_hien" };
  si.contrib -= entry.cost;
  if (!state.bag) state.bag = [];
  var ex = null;
  for (var j = 0; j < state.bag.length; j++) {
    if (state.bag[j].id === manualId && !state.bag[j].locked) { ex = state.bag[j]; break; }
  }
  if (ex) ex.qty++;
  else state.bag.push({ id: manualId, qty: 1, locked: false });
  return { ok: true, cost: entry.cost };
}

/* Cống hiến Linh Thạch → điểm cống hiến (100 LT = 3 điểm) */
function donateStones(state, amount) {
  amount = Math.floor(amount || 0);
  if (amount < 100) return { ok: false, reason: "toi_thieu_100" };
  if ((state.stones || 0) < amount) return { ok: false, reason: "thieu_linh_thach" };
  var si = _si(state);
  if (!si.joined) return { ok: false, reason: "chua_gia_nhap" };
  state.stones -= amount;
  var gain = Math.floor(amount / 100) * 3;
  si.contrib = (si.contrib || 0) + gain;
  /* tiến trình nhiệm vụ donate hằng ngày */
  var d = _daily(si);
  d.progress.donate500 = (d.progress.donate500 || 0) + amount;
  /* nhiệm vụ ngày tông môn (sectquest) */
  try {
    if (typeof SectQuest !== "undefined" && SectQuest.onDonate) SectQuest.onDonate(state, amount);
  } catch (e) {}
  return { ok: true, contrib: gain };
}

/* Đếm giết quái cho nhiệm vụ hằng ngày. isBoss: true nếu là boss. */
function onKill(state, isBoss) {
  var si = _si(state);
  if (!si.joined) return;
  var d = _daily(si);
  d.progress.giet10 = (d.progress.giet10 || 0) + 1;
  if (isBoss) d.progress.gietboss = (d.progress.gietboss || 0) + 1;
}

/* Tiến trình nhiệm vụ hằng ngày: [{id, nameKey, descKey, prog, need, done, claimed}] */
function dailyProgress(state) {
  var si = _si(state);
  var d = _daily(si);
  return SECT_DAILY.map(function (q) {
    var prog = d.progress[q.id] || 0;
    var need = q.need.count;
    return {
      id: q.id, nameKey: q.nameKey, descKey: q.descKey,
      prog: Math.min(prog, need), need: need, contrib: q.contrib,
      done: prog >= need,
      claimed: d.claimed.indexOf(q.id) >= 0,
    };
  });
}

/* Nhận thưởng nhiệm vụ hằng ngày. Trả {ok, contrib?, reason?} */
function claimDaily(state, questId) {
  var si = _si(state);
  if (!si.joined) return { ok: false, reason: "chua_gia_nhap" };
  var d = _daily(si);
  var q = null;
  for (var i = 0; i < SECT_DAILY.length; i++) {
    if (SECT_DAILY[i].id === questId) { q = SECT_DAILY[i]; break; }
  }
  if (!q) return { ok: false, reason: "khong_ton_tai" };
  if (d.claimed.indexOf(questId) >= 0) return { ok: false, reason: "da_nhan" };
  if ((d.progress[questId] || 0) < q.need.count) return { ok: false, reason: "chua_xong" };
  d.claimed.push(questId);
  si.contrib = (si.contrib || 0) + q.contrib;
  return { ok: true, contrib: q.contrib };
}


/* ---- Trường Sinh Quyết: bán ở Tàng Kinh Các mọi tông (điểm cống hiến) ---- */
["kiem_tong", "thien_phap_tong", "kim_cang_tong", "duoc_vuong_tong", "ngu_thu_tong", "cuu_u_ma_tong"].forEach(function (sk) {
  if (SECTS[sk] && SECTS[sk].manuals) SECTS[sk].manuals.push({ id: "manual_truong_sinh", cost: 400 });
});
/* ---- Stock Tàng Kinh Các mở rộng (bí tịch tông môn mới) ---- */
SECTS.kiem_tong.manuals.push({ id: "manual_thien_kiem_tram", cost: 600 }, { id: "manual_van_kiem_phi_tinh", cost: 300 }, { id: "manual_huyet_kiem_sat", cost: 300 }, { id: "manual_kiem_anh_phan_than", cost: 120 }, { id: "manual_kiem_y_thong_minh", cost: 350 }, { id: "manual_van_kiem_ho_the", cost: 350 });
SECTS.thien_phap_tong.manuals.push({ id: "manual_cuu_thien_loi_nguc", cost: 600 }, { id: "manual_phan_thien_hoa_hai", cost: 300 }, { id: "manual_huyen_bang_phong_bao", cost: 300 }, { id: "manual_phong_loi_dan", cost: 120 }, { id: "manual_loi_hoa_song_tuyet", cost: 350 }, { id: "manual_ngu_hanh_ho_the", cost: 200 });
SECTS.kim_cang_tong.manuals.push({ id: "manual_kim_cuong_hoa_than", cost: 600 }, { id: "manual_dai_dia_chan", cost: 300 }, { id: "manual_phan_giap_kim_chung", cost: 300 }, { id: "manual_thiet_bo_sam", cost: 120 }, { id: "manual_kim_cang_bat_hoai_the", cost: 350 }, { id: "manual_phan_chan_kinh", cost: 200 });
SECTS.duoc_vuong_tong.manuals.push({ id: "manual_dieu_thu_hoi_xuan", cost: 600 }, { id: "manual_dan_hoa_phan_thien", cost: 300 }, { id: "manual_cam_lo_quyet", cost: 300 }, { id: "manual_thanh_tam_giai_doc", cost: 120 }, { id: "manual_duoc_vuong_tam_kinh", cost: 200 }, { id: "manual_sinh_sinh_bat_tuc", cost: 350 });
SECTS.ngu_thu_tong.manuals.push({ id: "manual_van_thu_trieu_bai", cost: 600 }, { id: "manual_nhan_thu_hop_nhat", cost: 300 }, { id: "manual_thu_vuong_giao_sat", cost: 300 }, { id: "manual_linh_thu_trieu_hoan", cost: 120 }, { id: "manual_thu_vuong_huyet_mach", cost: 350 }, { id: "manual_dong_sinh_cong_tu", cost: 200 });
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    SECTS: SECTS, SECT_DAILY: SECT_DAILY, SECT_SWITCH_COST: SECT_SWITCH_COST,
    joinSect: joinSect, switchSect: switchSect,
    joinedSect: joinedSect, sectContrib: sectContrib, sectInnate: sectInnate, sectBuff: sectBuff,
    buyManual: buyManual, donateStones: donateStones,
    onKill: onKill, dailyProgress: dailyProgress, claimDaily: claimDaily,
  };
}

/* Browser global */
var Sect = (typeof Sect !== "undefined") ? Sect : null;
if (typeof window !== "undefined" || typeof globalThis !== "undefined") {
  var _g = (typeof globalThis !== "undefined") ? globalThis : window;
  _g.Sect = {
    SECTS: SECTS, SECT_DAILY: SECT_DAILY, SECT_SWITCH_COST: SECT_SWITCH_COST,
    joinSect: joinSect, switchSect: switchSect,
    joinedSect: joinedSect, sectContrib: sectContrib, sectInnate: sectInnate, sectBuff: sectBuff,
    buyManual: buyManual, donateStones: donateStones,
    onKill: onKill, dailyProgress: dailyProgress, claimDaily: claimDaily,
  };
}
