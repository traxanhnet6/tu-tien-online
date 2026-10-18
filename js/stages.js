/* ============================================================
 * js/stages.js — 8 giai đoạn tu luyện (Bui DUYỆT 2026-10-18)
 * Mọi số liệu cảnh giới / tính năng mở khóa / phụ bản đọc từ đây.
 * Quy tắc: tính năng mở dần theo cảnh giới; EXP mỗi tiểu cảnh
 * giới ~1.5 lần trước; đột phá đại cảnh giới thất bại rớt 1 tiểu
 * cảnh giới; mỗi cảnh giới có bí cảnh riêng rớt nguyên liệu đột phá.
 * ============================================================ */

const STAGES = [
  { id: 0, ten: "Phàm Nhân", maps: [],
    mo_tinh_nang: ["tao_nhan_vat", "tay_cot", "linh_can", "tutorial"] },
  { id: 1, ten: "Luyện Khí", tang: 12,
    maps: ["Thanh Vân Trấn", "Hắc Phong Lâm", "U Minh Cốc"], boss_moi_map: 1,
    mo_tinh_nang: ["van_tien_cac_tang12", "giftcode", "diem_danh", "bi_canh_1"] },
  { id: 2, ten: "Trúc Cơ", ky: ["Sơ kỳ", "Trung kỳ", "Hậu kỳ"],
    maps: ["Xích Hỏa Sơn"],
    dot_pha: { dan: "Trúc Cơ Đan", tam_ma: true, loi_kiep: 0.90 },
    mo_tinh_nang: ["phi_hanh", "nghe_luyen_dan", "nghe_ve_phu", "linh_thu"] },
  { id: 3, ten: "Kim Đan", ky: ["Sơ kỳ", "Trung kỳ", "Hậu kỳ"],
    maps: ["Băng Phong Nguyên"],
    dot_pha: { loi_kiep: 0.80 },
    mo_tinh_nang: ["dong_phu_offline", "tong_mon", "to_doi"] },
  { id: 4, ten: "Nguyên Anh", ky: ["Sơ kỳ", "Trung kỳ", "Hậu kỳ"],
    maps: ["Vạn Độc Chiểu"],
    dot_pha: { loi_kiep: 0.70 },
    mo_tinh_nang: ["xuat_khieu_2map", "pvp_dau_truong", "thap_thi_luyen"] },
  { id: 5, ten: "Hóa Thần/Phân Thần", ky: ["Sơ kỳ", "Trung kỳ", "Hậu kỳ"],
    maps: ["Cửu U Minh Hải", "Thiên Ma Vực"],
    dot_pha: { loi_kiep: 0.60 },
    mo_tinh_nang: ["than_thuc_quet_map", "dao_lu", "dau_gia"] },
  { id: 6, ten: "Luyện Hư/Hợp Thể/Đại Thừa", ky: ["Sơ kỳ", "Trung kỳ", "Hậu kỳ"],
    maps: ["Hỗn Độn Chiến Trường"],
    dot_pha: { loi_kiep: 0.45 },
    mo_tinh_nang: ["tong_chien", "tien_phu_giang_lam"] },
  { id: 7, ten: "Độ Kiếp", maps: ["Cửu Trọng Thiên"], loi_kiep_9_dao: 0.30,
    mo_tinh_nang: ["phi_thang"] },
];

/* ---------- Loại phụ bản (Bui duyệt) ---------- */
const DUNGEON_TYPES = [
  { id: "tanthu",  loai: "Tân Thủ",  phi: 0,   luot_ngay: 5, buyBase: 50 },
  { id: "tinhanh", loai: "Tinh Anh", phi: 100, luot_ngay: 3, buyBase: 150 },
  { id: "dotpha",  loai: "Đột Phá",  phi: 300, luot_ngay: 2, buyBase: 400 },
];
function dungeonType(id) {
  return DUNGEON_TYPES.find(function (d) { return d.id === id; });
}
/* Giá mua thêm lượt trong ngày: tăng dần theo số lần đã mua */
function dungeonBuyCost(typeId, bought) {
  const t = dungeonType(typeId);
  if (!t) return 0;
  return t.buyBase * (bought + 1);
}

/* ---------- Helpers cảnh giới ---------- */
/* tier: Luyện Khí dùng tầng 1..12; các cảnh giới sau dùng stageIdx 0..2 */
function stageName(realm, tier) {
  const s = STAGES[realm];
  if (!s) return "?";
  if (realm === 0) return s.ten;
  if (realm === 1) return s.ten + " tầng " + tier;
  if (realm === 7) return s.ten;
  return s.ten + " " + s.ky[tier];
}

/* EXP tối đa mỗi tiểu cảnh giới: ~1.5 lần trước */
function expMaxFor(realm, tier) {
  if (realm === 0) return 30;
  if (realm === 1) return Math.round(40 * Math.pow(1.5, tier - 1));
  // Trúc Cơ Sơ kỳ nối tiếp Luyện Khí 12 (40*1.5^11), rồi nhân 1.5 mỗi kỳ
  const lk12 = 40 * Math.pow(1.5, 11);
  const steps = (realm - 2) * 3 + tier; // tier 0..2
  return Math.round(lk12 * Math.pow(1.5, steps + 1));
}

/* Chỉ số cơ bản. sect: 'kiem' | 'phap' | 'the' */
function baseStats(realm, tier, sect) {
  const t = realm === 1 ? tier : realm === 0 ? 0 : tier + 1;
  const p = realm * 120 + t * 12;
  const s = {
    maxHp: 100 + p * 2,
    maxMp: 50 + p,
    atk: 10 + Math.round(p * 0.35),
    def: 2 + Math.round(p * 0.12),
  };
  if (sect === "kiem") s.atk = Math.round(s.atk * 1.15);
  else if (sect === "phap") { s.maxMp = Math.round(s.maxMp * 1.25); s.atk = Math.round(s.atk * 1.05); }
  else if (sect === "the") { s.maxHp = Math.round(s.maxHp * 1.3); s.def = Math.round(s.def * 1.2); }
  return s;
}

/* Mọi tính năng đã mở đến cảnh giới hiện tại */
function featuresUnlocked(realm) {
  const out = [];
  for (let i = 0; i <= realm && i < STAGES.length; i++) {
    out.push.apply(out, STAGES[i].mo_tinh_nang);
  }
  return out;
}
function hasFeature(realm, f) {
  return featuresUnlocked(realm).indexOf(f) >= 0;
}

/* Tỷ lệ đột phá đại cảnh giới (lôi kiếp). Trả về null nếu không cần đột phá kiểu này */
function breakthroughRate(realm) {
  const s = STAGES[realm];
  if (!s || !s.dot_pha) return null;
  return s.dot_pha.loi_kiep;
}

/* ---------- Cường hóa trang bị (+0..+15) ---------- */
/* Mỗi cấp +8% chỉ số gốc của món đồ (nhân: 1.08^plus) */
function enhanceCost(plus) {
  return Math.round(50 * Math.pow(plus + 1, 1.8));
}
function enhanceRate(plus) {
  return Math.max(0.3, 1 - plus * 0.05);
}
function enhanceMult(plus) {
  return Math.pow(1.08, plus);
}
function powerLevel(realm, tier) {
  if (realm === 0) return 0;
  if (realm === 1) return 100 + tier;
  return 200 + (realm - 2) * 30 + tier * 10;
}

/* ---------- Random có seed (bí cảnh ngẫu nhiên) ---------- */
/* mulberry32: cùng seed → cùng dãy số (vào lại giữa chừng vẫn cùng bản đồ) */
function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}
function pickRng(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

/* Node.js export (cho smoke test) */
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    STAGES, DUNGEON_TYPES, dungeonType, dungeonBuyCost,
    stageName, expMaxFor, baseStats, featuresUnlocked, hasFeature,
    breakthroughRate, powerLevel,
    makeRng, randInt, pickRng,
    enhanceCost, enhanceRate, enhanceMult,
  };
}
