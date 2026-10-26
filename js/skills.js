/* ============================================================
 * js/skills.js — Bí thuật tông môn (thuần logic, chạy được trên node)
 * - SECT_SKILLS: bí thuật chủ động (dmg | aoe | buff), công thức
 *   dạng data (mult/mp/cd) — engine chỉ cài đặt chung theo kind,
 *   KHÔNG hard-code logic riêng từng bí tịch.
 * - PASSIVE_DEFS: bí thuật bị động (học xong tự hiệu lực vĩnh viễn).
 * - Bí tịch (ITEMS kind:"manual"): mỗi bí tịch có PHẨM (tier 0=Phàm /
 *   1=Địa / 2=Thiên) và CẤP (level 1→max theo phẩm).
 *   + Phàm: max 5, mỗi cấp +6% hiệu quả, nguyên liệu rẻ.
 *   + Địa:  max 7, mỗi cấp +8%, mốc 4 (+15%) và 7 (lan 30%).
 *   + Thiên: max 10, mỗi cấp +10%, mốc 5 (xuyên giáp 25%) và
 *     10 (lan 50% + xuyên giáp 50%).
 * - Lên cấp 2 cách: (a) bí tịch trùng tên, (b) Mảnh Bí Tịch + Linh Thạch.
 * - Mỗi bí tịch có canh_gioi_yeu_cau (realm): chưa đạt → khóa,
 *   không học/không dùng được. Gacha rớt tự do mọi phẩm/cảnh giới
 *   (bí tịch vượt cấp nằm túi chờ đủ cảnh giới); kỳ ngộ/bí cảnh/
 *   Tàng Kinh Các chỉ rớt vừa tầm (realm <= cảnh giới hiện tại + 1).
 * - state: skills[], skillsCd{}, skillGrades{} (save cũ),
 *   skillManual{techId: manualId}, manualLevels{manualId: lv},
 *   passives{pid: lv} (mirror), fragments (Mảnh Bí Tịch).
 * Phụ thuộc lúc chạy: ITEMS (data.js) — có fallback nội bộ cho node.
 * ============================================================ */

/* Định nghĩa bí thuật chủ động. kind: 'dmg' (đơn) | 'aoe' | 'buff' */
var SECT_SKILLS = {
  /* ---- Kiếm Tông (Luyện Khí) ---- */
  kiem_xuyen_van:    { sect: "kiem", kind: "dmg",  mult: 2.5, mp: 20, cd: 8,
                       fx: "#cfe8ff", icon: "🗡️", nameKey: "sk_kiem_xuyen_van",
                       descKey: "sk_kiem_xuyen_van_desc" },
  van_kiem_quy_tong: { sect: "kiem", kind: "aoe",  mult: 2.0, mp: 30, cd: 12,
                       fx: "#e8f4ff", icon: "⚔️", nameKey: "sk_van_kiem_quy_tong",
                       descKey: "sk_van_kiem_quy_tong_desc" },
  kiem_cuong_ho_the: { sect: "kiem", kind: "buff", mp: 25, cd: 20,
                       defMult: 1.5, dur: 15, fx: "#fff3b0", icon: "🛡️",
                       nameKey: "sk_kiem_cuong_ho_the",
                       descKey: "sk_kiem_cuong_ho_the_desc" },
  /* ---- Pháp Tông (Luyện Khí) ---- */
  ngu_loi_oanh_dinh: { sect: "phap", kind: "dmg",  mult: 2.8, mp: 25, cd: 10,
                       fx: "#b388ff", icon: "⚡", nameKey: "sk_ngu_loi_oanh_dinh",
                       descKey: "sk_ngu_loi_oanh_dinh_desc" },
  hoa_vu_luu_tinh:   { sect: "phap", kind: "aoe",  mult: 1.8, mp: 30, cd: 12,
                       fx: "#ff8a65", icon: "🔥", nameKey: "sk_hoa_vu_luu_tinh",
                       descKey: "sk_hoa_vu_luu_tinh_desc" },
  linh_thuan:        { sect: "phap", kind: "buff", mp: 20, cd: 18,
                       defMult: 1.4, dur: 15, fx: "#9be8ff", icon: "🔮",
                       nameKey: "sk_linh_thuan",
                       descKey: "sk_linh_thuan_desc" },
  /* ---- Thể Tông (Luyện Khí) ---- */
  ba_vuong_quyen:    { sect: "the",  kind: "dmg",  mult: 2.2, mp: 15, cd: 8,
                       fx: "#ffcc80", icon: "👊", nameKey: "sk_ba_vuong_quyen",
                       descKey: "sk_ba_vuong_quyen_desc" },
  chan_dia_chuong:   { sect: "the",  kind: "aoe",  mult: 1.6, mp: 20, cd: 10,
                       fx: "#d7ccc8", icon: "🤚", nameKey: "sk_chan_dia_chuong",
                       descKey: "sk_chan_dia_chuong_desc" },
  kim_cuong_bat_hoai: { sect: "the", kind: "buff", mp: 30, cd: 25,
                       defMult: 1.8, dur: 15, fx: "#ffd54f", icon: "💎",
                       nameKey: "sk_kim_cuong_bat_hoai",
                       descKey: "sk_kim_cuong_bat_hoai_desc" },
  /* ---- Kim Đan (mẫu demo cơ chế khóa theo cảnh giới) ---- */
  kimdan_kiem_y:    { sect: "kiem", kind: "dmg", mult: 4.0, mp: 40, cd: 12,
                     fx: "#ffe082", icon: "🌟", nameKey: "sk_kimdan_kiem_y",
                     descKey: "sk_kimdan_kiem_y_desc" },
  kimdan_loi_phap:  { sect: "phap", kind: "aoe", mult: 3.2, mp: 45, cd: 14,
                     fx: "#ce93d8", icon: "🌩️", nameKey: "sk_kimdan_loi_phap",
                     descKey: "sk_kimdan_loi_phap_desc" },
  kimdan_the_quyen: { sect: "the", kind: "dmg", mult: 3.6, mp: 35, cd: 12,
                     fx: "#ffab91", icon: "☀️", nameKey: "sk_kimdan_the_quyen",
                     descKey: "sk_kimdan_the_quyen_desc" },
  /* ---- Dược Vương Tông (độc quyền) ---- */
  dan_hoa_ho_the:  { sect: "duoc", kind: "buff", mp: 30, cd: 22,
                     defMult: 1.6, dur: 20, fx: "#ff9e80", icon: "💊",
                     nameKey: "sk_dan_hoa_ho_the",
                     descKey: "sk_dan_hoa_ho_the_desc" },
  /* ---- Ngự Thú Tông (độc quyền) ---- */
  thu_vuong_trao:  { sect: "thu", kind: "dmg", mult: 3.0, mp: 25, cd: 10,
                     fx: "#ffd54f", icon: "🐾", nameKey: "sk_thu_vuong_trao",
                     descKey: "sk_thu_vuong_trao_desc" },
  /* ---- Cửu U Ma Tông (độc quyền Ma Đạo — damage ma hệ, fear/wound) ---- */
  huyet_ma_tram:   { sect: "ma", kind: "dmg", mult: 3.2, mp: 25, cd: 9,
                     dtype: "ma", elem: "ma", dao: "ma",
                     fx: "#ff2d55", icon: "🩸", nameKey: "sk_huyet_ma_tram",
                     descKey: "sk_huyet_ma_tram_desc" },
  cuu_u_ma_diem:   { sect: "ma", kind: "aoe", mult: 2.4, mp: 35, cd: 13,
                     dtype: "ma", elem: "ma", dao: "ma",
                     fx: "#b388ff", icon: "👹", nameKey: "sk_cuu_u_ma_diem",
                     descKey: "sk_cuu_u_ma_diem_desc" },
  ma_hon_thuc:     { sect: "ma", kind: "dmg", mult: 5.0, mp: 45, cd: 20,
                     dtype: "ma", elem: "ma", dao: "ma",
                     fx: "#7b1fa2", icon: "💀", nameKey: "sk_ma_hon_thuc",
                     descKey: "sk_ma_hon_thuc_desc" },
  huyet_ma_ho_the: { sect: "ma", kind: "buff", mp: 30, cd: 25,
                     dtype: "ma", dao: "ma",
                     defMult: 1.6, dur: 18, fx: "#ff1744", icon: "🛡️",
                     nameKey: "sk_huyet_ma_ho_the",
                     descKey: "sk_huyet_ma_ho_the_desc" },
  /* ---- Bí tịch signature đợt 2 (độc quyền tông môn) ---- */
  ngu_kiem_phi_hanh: { sect: "kiem", kind: "buff", mp: 30, cd: 25,
                     defMult: 1.4, dur: 20, fx: "#cfe8ff", icon: "🗡️",
                     nameKey: "sk_ngu_kiem_phi_hanh",
                     descKey: "sk_ngu_kiem_phi_hanh_desc" },
  thien_loi_dan:   { sect: "phap", kind: "dmg", mult: 4.5, mp: 45, cd: 16,
                     fx: "#b388ff", icon: "⚡", nameKey: "sk_thien_loi_dan",
                     descKey: "sk_thien_loi_dan_desc" },
  la_han_quyen:    { sect: "the", kind: "dmg", mult: 3.0, mp: 25, cd: 10,
                     fx: "#ffcc80", icon: "👊", nameKey: "sk_la_han_quyen",
                     descKey: "sk_la_han_quyen_desc" },
  su_tu_hong:      { sect: "the", kind: "aoe", mult: 2.2, mp: 35, cd: 14,
                     fx: "#ffd54f", icon: "🦁", nameKey: "sk_su_tu_hong",
                     descKey: "sk_su_tu_hong_desc" },
  doc_kinh:        { sect: "duoc", kind: "dmg", mult: 3.5, mp: 35, cd: 14,
                     fx: "#76ff03", icon: "☠️", nameKey: "sk_doc_kinh",
                     descKey: "sk_doc_kinh_desc" },
  thu_hon_hop_nhat: { sect: "thu", kind: "buff", mp: 35, cd: 25,
                     defMult: 1.8, dur: 20, fx: "#ffb300", icon: "🐾",
                     nameKey: "sk_thu_hon_hop_nhat",
                     descKey: "sk_thu_hon_hop_nhat_desc" },
  huyet_ma_dai_phap: { sect: "ma", kind: "dmg", mult: 5.0, mp: 50, cd: 18,
                     dtype: "ma", dao: "ma",
                     fx: "#ff2d55", icon: "🩸", nameKey: "sk_huyet_ma_dai_phap",
                     descKey: "sk_huyet_ma_dai_phap_desc" },
  /* ---- ĐỘC CHIÊU tông môn (Nguyên Anh + 1500 cống hiến) ---- */
  thien_kiem_vo_song: { sect: "kiem", kind: "dmg", mult: 6.5, mp: 60, cd: 30,
                     fx: "#ffe082", icon: "⚔️", nameKey: "sk_thien_kiem_vo_song",
                     descKey: "sk_thien_kiem_vo_song_desc" },
  cuu_thien_loi_nguc: { sect: "phap", kind: "aoe", mult: 5.5, mp: 70, cd: 35,
                     fx: "#b388ff", icon: "🌩️", nameKey: "sk_cuu_thien_loi_nguc",
                     descKey: "sk_cuu_thien_loi_nguc_desc" },
  kim_cang_hoa_than: { sect: "the", kind: "buff", mp: 60, cd: 40,
                     defMult: 2.5, dur: 25, fx: "#ffd54f", icon: "💎",
                     nameKey: "sk_kim_cang_hoa_than",
                     descKey: "sk_kim_cang_hoa_than_desc" },
  hoi_thien_tao_hoa: { sect: "duoc", kind: "buff", mp: 60, cd: 45,
                     defMult: 2.0, dur: 30, fx: "#66bb6a", icon: "💚",
                     nameKey: "sk_hoi_thien_tao_hoa",
                     descKey: "sk_hoi_thien_tao_hoa_desc" },
  thu_than_hang_lam: { sect: "thu", kind: "buff", mp: 60, cd: 40,
                     atkMult: 2.0, defMult: 1.5, dur: 25, fx: "#ffb300", icon: "🐉",
                     nameKey: "sk_thu_than_hang_lam",
                     descKey: "sk_thu_than_hang_lam_desc" },
  thon_thien_ma_cong: { sect: "ma", kind: "dmg", mult: 7.0, mp: 80, cd: 40,
                     dtype: "ma", dao: "ma",
                     fx: "#ff1744", icon: "👹", nameKey: "sk_thon_thien_ma_cong",
                     descKey: "sk_thon_thien_ma_cong_desc" },
};

/* Hệ số sức mạnh theo phẩm bí tịch */
var GRADE_MULT = [1.0, 1.3, 1.6];

/* Cấu hình lên cấp theo phẩm: max level, % tăng mỗi cấp,
 * mảnh + Linh Thạch cần để lên 1 cấp (nhân với cấp hiện tại) */
var TIER_UP = [
  { max: 5,  per: 0.06, frag: 5,  stone: 100 },  /* Phàm */
  { max: 7,  per: 0.08, frag: 10, stone: 300 },  /* Địa */
  { max: 10, per: 0.10, frag: 20, stone: 800 },  /* Thiên */
];
/* Mốc hiệu ứng đặc biệt: {tier: {level: {multBonus?, pierce?, splash?}}} */
var TIER_MILESTONE = {
  1: { 4: { multBonus: 0.15, msKey: "ms_bonus15" },
       7: { splash: 0.30, msKey: "ms_splash30" } },
  2: { 5: { pierce: 0.25, msKey: "ms_pierce25" },
       10: { splash: 0.50, pierce: 0.50, msKey: "ms_splash50_pierce50" } },
};
function tierUpCfg(tier) { return TIER_UP[tier] || TIER_UP[0]; }
function manualMaxLevel(tier) { return tierUpCfg(tier).max; }
/* Phí lên cấp level → level+1 */
function upgradeCost(tier, level) {
  var c = tierUpCfg(tier);
  return { frags: c.frag * level, stones: c.stone * level };
}

/* ---------- BỊ ĐỘNG: học xong tự hiệu lực vĩnh viễn ----------
 * Mỗi cấp bí tịch = +1 cấp hiệu ứng bị động (tối đa = max level theo phẩm) */
var PASSIVE_DEFS = {
  kiem_tam:   { nameKey: "ps_kiem_tam", descKey: "ps_kiem_tam_desc",
                icon: "🗡️", perLevel: "10% atk" },
  linh_mach:  { nameKey: "ps_linh_mach", descKey: "ps_linh_mach_desc",
                icon: "💧", perLevel: "2% mp/5s" },
  the_phach:  { nameKey: "ps_the_phach", descKey: "ps_the_phach_desc",
                icon: "❤️", perLevel: "8% maxHp" },
  than_phap:  { nameKey: "ps_than_phap", descKey: "ps_than_phap_desc",
                icon: "💨", perLevel: "5% speed" },
  /* ---- Bị động độc quyền tông môn ---- */
  duoc_tam:      { nameKey: "ps_duoc_tam", descKey: "ps_duoc_tam_desc",
                   icon: "🌿", perLevel: "15% pill" },
  hoi_xuan:      { nameKey: "ps_hoi_xuan", descKey: "ps_hoi_xuan_desc",
                   icon: "💚", perLevel: "1% hp/5s" },
  ngu_thu_tam:   { nameKey: "ps_ngu_thu_tam", descKey: "ps_ngu_thu_tam_desc",
                   icon: "🐾", perLevel: "10% pet" },
  linh_thu_khe:  { nameKey: "ps_linh_thu_khe", descKey: "ps_linh_thu_khe_desc",
                   icon: "🔗", perLevel: "20% pet exp" },
  /* ---- Bị động độc quyền Cửu U Ma Tông ---- */
  ma_tam:        { nameKey: "ps_ma_tam", descKey: "ps_ma_tam_desc",
                   icon: "😈", perLevel: "12% dmg ma" },
  huyet_mach:    { nameKey: "ps_huyet_mach", descKey: "ps_huyet_mach_desc",
                   icon: "🩸", perLevel: "3% lifesteal" },
  truong_sinh_quyet: { nameKey: "ps_truong_sinh_quyet", descKey: "ps_truong_sinh_quyet_desc",
                   icon: "🍑", perLevel: "+30 năm thọ nguyên" },
  ngu_hanh_phap_chu: { nameKey: "ps_ngu_hanh_phap_chu", descKey: "ps_ngu_hanh_phap_chu_desc",
                   icon: "🔮", perLevel: "10% maxMp" },
};
var _passiveDefCache = {};
function passiveDef(id) {
  if (PASSIVE_DEFS[id]) return PASSIVE_DEFS[id];
  if (_passiveDefCache[id]) return _passiveDefCache[id];
  if (typeof ITEMS !== "undefined" && ITEMS) {
    for (var mid in ITEMS) {
      var m = ITEMS[mid];
      if (m && m.kind === "manual" && m.passive === id && m.passiveDef) {
        _passiveDefCache[id] = m.passiveDef;
        return m.passiveDef;
      }
    }
  }
  return null;
}
function isPassive(id) { return !!PASSIVE_DEFS[id]; }

var _skillDefCache = {};
/* Data-driven: skill mới định nghĩa full trong ITEMS (bí tịch). Thêm bí tịch mới
 * chỉ cần 1 entry ITEMS có skillDef — không sửa file này. */
function skillDef(id) {
  if (SECT_SKILLS[id]) return SECT_SKILLS[id];
  if (_skillDefCache[id]) return _skillDefCache[id];
  if (typeof ITEMS !== "undefined" && ITEMS) {
    for (var mid in ITEMS) {
      var m = ITEMS[mid];
      if (m && m.kind === "manual" && m.skill === id && m.skillDef) {
        _skillDefCache[id] = m.skillDef;
        return m.skillDef;
      }
    }
  }
  return null;
}
function gradeMult(tier) { return GRADE_MULT[tier] || 1.0; }

/* Hệ sát thương của skill (để buff tông môn): kiem | phap | the | ma | other */
function skillDmgType(skillId) {
  try { var _dd = skillDef(skillId); if (_dd && _dd.dtype) return _dd.dtype; } catch (e) {}
  if (/^kiem|^kimdan_kiem/.test(skillId)) return "kiem";
  if (/^ngu_loi|^hoa_vu|^linh_thuan|^kimdan_loi/.test(skillId)) return "phap";
  if (/^ba_vuong|^chan_dia|^kim_cuong|^kimdan_the/.test(skillId)) return "the";
  if (/^huyet_ma|^cuu_u_ma|^ma_hon|^huyet_sac/.test(skillId)) return "ma";
  return "other";
}

/* ---------- Bảng bí tịch (đọc từ ITEMS, fallback nội bộ cho node) ----------
 * Mỗi entry: {skill?, passive?, tier, learnCost, realm} */
var _MANUAL_FB = {
  manual_kiem_1: { skill: "kiem_xuyen_van", tier: 0, learnCost: 0, realm: 1 },
  manual_kiem_2: { skill: "van_kiem_quy_tong", tier: 1, learnCost: 500, realm: 1 },
  manual_kiem_3: { skill: "kiem_cuong_ho_the", tier: 2, learnCost: 1500, realm: 1 },
  manual_phap_1: { skill: "ngu_loi_oanh_dinh", tier: 0, learnCost: 0, realm: 1 },
  manual_phap_2: { skill: "hoa_vu_luu_tinh", tier: 1, learnCost: 500, realm: 1 },
  manual_phap_3: { skill: "linh_thuan", tier: 2, learnCost: 1500, realm: 1 },
  manual_the_1: { skill: "ba_vuong_quyen", tier: 0, learnCost: 0, realm: 1 },
  manual_the_2: { skill: "chan_dia_chuong", tier: 1, learnCost: 500, realm: 1 },
  manual_the_3: { skill: "kim_cuong_bat_hoai", tier: 2, learnCost: 1500, realm: 1 },
  manual_ps_kiem_tam:  { passive: "kiem_tam", tier: 1, learnCost: 800, realm: 1 },
  manual_ps_linh_mach: { passive: "linh_mach", tier: 1, learnCost: 800, realm: 1 },
  manual_ps_the_phach: { passive: "the_phach", tier: 0, learnCost: 300, realm: 1 },
  manual_ps_than_phap: { passive: "than_phap", tier: 0, learnCost: 300, realm: 1 },
  manual_kimdan_kiem: { skill: "kimdan_kiem_y", tier: 2, learnCost: 3000, realm: 3 },
  manual_kimdan_phap: { skill: "kimdan_loi_phap", tier: 2, learnCost: 3000, realm: 3 },
  manual_kimdan_the:  { skill: "kimdan_the_quyen", tier: 2, learnCost: 3000, realm: 3 },
  /* Độc quyền Dược Vương Tông / Ngự Thú Tông */
  manual_duoc_1: { skill: "dan_hoa_ho_the", tier: 1, learnCost: 800, realm: 1, exclusive: true, dieu_kien_mo: { tong: "duoc_vuong_tong" } },
  manual_duoc_2: { passive: "duoc_tam", tier: 1, learnCost: 800, realm: 1, exclusive: true, dieu_kien_mo: { tong: "duoc_vuong_tong" } },
  manual_duoc_3: { passive: "hoi_xuan", tier: 2, learnCost: 1500, realm: 1, exclusive: true, dieu_kien_mo: { tong: "duoc_vuong_tong" } },
  manual_thu_1: { skill: "thu_vuong_trao", tier: 1, learnCost: 800, realm: 1, exclusive: true, dieu_kien_mo: { tong: "ngu_thu_tong" } },
  manual_thu_2: { passive: "ngu_thu_tam", tier: 1, learnCost: 800, realm: 1, exclusive: true, dieu_kien_mo: { tong: "ngu_thu_tong" } },
  manual_thu_3: { passive: "linh_thu_khe", tier: 2, learnCost: 1500, realm: 1, exclusive: true, dieu_kien_mo: { tong: "ngu_thu_tong" } },
  /* Độc quyền Cửu U Ma Tông (Ma Đạo, mở từ Trúc Cơ) */
  manual_ma_1: { skill: "huyet_ma_tram", tier: 1, learnCost: 800, realm: 2, dao: "ma", exclusive: true, dieu_kien_mo: { tong: "cuu_u_ma_tong" } },
  manual_ma_2: { skill: "cuu_u_ma_diem", tier: 1, learnCost: 800, realm: 2, dao: "ma", exclusive: true, dieu_kien_mo: { tong: "cuu_u_ma_tong" } },
  manual_ma_3: { skill: "ma_hon_thuc", tier: 2, learnCost: 1500, realm: 2, dao: "ma", exclusive: true, dieu_kien_mo: { tong: "cuu_u_ma_tong" } },
  manual_ma_4: { skill: "huyet_ma_ho_the", tier: 1, learnCost: 800, realm: 2, dao: "ma", exclusive: true, dieu_kien_mo: { tong: "cuu_u_ma_tong" } },
  manual_ps_ma_1: { passive: "ma_tam", tier: 1, learnCost: 800, realm: 2, dao: "ma", exclusive: true, dieu_kien_mo: { tong: "cuu_u_ma_tong" } },
  manual_ps_ma_2: { passive: "huyet_mach", tier: 2, learnCost: 1500, realm: 2, dao: "ma", exclusive: true, dieu_kien_mo: { tong: "cuu_u_ma_tong" } },
  /* Đợt 2: bí tịch signature các tông */
  manual_kiem_4: { skill: "ngu_kiem_phi_hanh", tier: 2, learnCost: 1500, realm: 2, exclusive: true, dieu_kien_mo: { tong: "kiem_tong" } },
  manual_phap_4: { skill: "thien_loi_dan", tier: 2, learnCost: 1500, realm: 2, exclusive: true, dieu_kien_mo: { tong: "thien_phap_tong" } },
  manual_phap_5: { passive: "ngu_hanh_phap_chu", tier: 1, learnCost: 800, realm: 1, exclusive: true, dieu_kien_mo: { tong: "thien_phap_tong" } },
  manual_the_4: { skill: "la_han_quyen", tier: 1, learnCost: 800, realm: 2, exclusive: true, dieu_kien_mo: { tong: "kim_cang_tong" } },
  manual_the_5: { skill: "su_tu_hong", tier: 1, learnCost: 800, realm: 2, exclusive: true, dieu_kien_mo: { tong: "kim_cang_tong" } },
  manual_duoc_4: { skill: "doc_kinh", tier: 2, learnCost: 1500, realm: 2, exclusive: true, dieu_kien_mo: { tong: "duoc_vuong_tong" } },
  manual_thu_4: { skill: "thu_hon_hop_nhat", tier: 2, learnCost: 1500, realm: 2, exclusive: true, dieu_kien_mo: { tong: "ngu_thu_tong" } },
  manual_ma_5: { skill: "huyet_ma_dai_phap", tier: 2, learnCost: 3000, realm: 3, dao: "ma", exclusive: true, dieu_kien_mo: { tong: "cuu_u_ma_tong" } },
  /* ĐỘC CHIÊU tông môn: Nguyên Anh + 1500 cống hiến */
  manual_sig_kiem: { skill: "thien_kiem_vo_song", tier: 2, learnCost: 5000, realm: 4, exclusive: true, dieu_kien_mo: { tong: "kiem_tong", contrib: 1500 } },
  manual_sig_phap: { skill: "cuu_thien_loi_nguc", tier: 2, learnCost: 5000, realm: 4, exclusive: true, dieu_kien_mo: { tong: "thien_phap_tong", contrib: 1500 } },
  manual_sig_the: { skill: "kim_cang_hoa_than", tier: 2, learnCost: 5000, realm: 4, exclusive: true, dieu_kien_mo: { tong: "kim_cang_tong", contrib: 1500 } },
  manual_sig_duoc: { skill: "hoi_thien_tao_hoa", tier: 2, learnCost: 5000, realm: 4, exclusive: true, dieu_kien_mo: { tong: "duoc_vuong_tong", contrib: 1500 } },
  manual_sig_thu: { skill: "thu_than_hang_lam", tier: 2, learnCost: 5000, realm: 4, exclusive: true, dieu_kien_mo: { tong: "ngu_thu_tong", contrib: 1500 } },
  manual_sig_ma: { skill: "thon_thien_ma_cong", tier: 2, learnCost: 5000, realm: 4, dao: "ma", exclusive: true, dieu_kien_mo: { tong: "cuu_u_ma_tong", contrib: 1500 } },
};
function manualInfo(manualId) {
  if (typeof ITEMS !== "undefined" && ITEMS && ITEMS[manualId] && ITEMS[manualId].kind === "manual") {
    var d = ITEMS[manualId];
    return { skill: d.skill || null, passive: d.passive || null,
             tier: d.tier || 0, learnCost: d.learnCost || 0,
             realm: (d.realm == null ? 1 : d.realm),
             tang: d.tang || 0, dao: d.dao || "trung",
             dieu_kien_mo: d.dieu_kien_mo || null,
             exclusive: !!d.exclusive };
  }
  return _MANUAL_FB[manualId] || null;
}
function manualTechId(manualId) {
  var mi = manualInfo(manualId);
  return mi ? (mi.skill || mi.passive) : null;
}
function manualIdForSkill(skillId) {
  for (var k in _MANUAL_FB) {
    if (_MANUAL_FB[k].skill === skillId) return k;
  }
  if (typeof ITEMS !== "undefined" && ITEMS) {
    for (var id in ITEMS) {
      if (ITEMS[id] && ITEMS[id].kind === "manual" && ITEMS[id].skill === skillId) return id;
    }
  }
  return null;
}
/* Đủ cảnh giới để học/dùng bí tịch? */
function manualRealmOk(state, manualId) {
  var mi = manualInfo(manualId);
  if (!mi) return false;
  var r = (state && state.char && state.char.realm) || 0;
  var req = mi.realm || 1;
  if (r < req) return false;
  if (r === req && mi.tang) {
    var t = (state.char && state.char.tier) || 0;
    if (t < mi.tang) return false;
  }
  return true;
}
/* Cấp hiện tại của bí tịch đã học (theo techId: skill hoặc passive) */
function manualLevel(state, techId) {
  var mid = state.skillManual && state.skillManual[techId];
  if (!mid) return 0;
  return (state.manualLevels && state.manualLevels[mid]) || 1;
}
function manualTier(state, techId) {
  var mid = state.skillManual && state.skillManual[techId];
  if (!mid) {
    if (state.skillGrades && state.skillGrades[techId] != null) return state.skillGrades[techId];
    return 0;
  }
  var mi = manualInfo(mid);
  return mi ? mi.tier : 0;
}
function passiveLevel(state, pid) { return manualLevel(state, pid); }

/* Áp passive vào chỉ số (thuần logic — ui.js getStats gọi) */
function applyPassives(stats, state) {
  var out = { atk: stats.atk, def: stats.def, maxHp: stats.maxHp, maxMp: stats.maxMp };
  var kt = passiveActive(state, "kiem_tam");
  var tp = passiveActive(state, "the_phach");
  var kc = passiveActive(state, "kim_cang_bat_hoai_the");
  var nh = passiveActive(state, "ngu_hanh_phap_chu");
  if (kt > 0) out.atk = Math.round(out.atk * (1 + 0.10 * kt));
  if (tp > 0) out.maxHp = Math.round(out.maxHp * (1 + 0.08 * tp));
  if (kc > 0) out.maxHp = Math.round(out.maxHp * (1 + 0.15 * kc));
  if (nh > 0) out.maxMp = Math.round(out.maxMp * (1 + 0.10 * nh));
  /* ---- Bị động lớp (build 114, class-skills.js): effect chỉ dùng
   * atkPct/defPct/maxHpPct/maxMpPct, nhân theo cấp bí tịch đang trang bị. ---- */
  try {
    var _load = (state && state.passiveLoad) || [];
    for (var i = 0; i < _load.length; i++) {
      var _lv = passiveActive(state, _load[i]);
      if (_lv <= 0) continue;
      var _pd = passiveDef(_load[i]);
      var _ef = _pd && _pd.effect;
      if (!_ef) continue;
      if (_ef.atkPct) out.atk = Math.round(out.atk * (1 + _ef.atkPct / 100 * _lv));
      if (_ef.defPct) out.def = Math.round(out.def * (1 + _ef.defPct / 100 * _lv));
      if (_ef.maxHpPct) out.maxHp = Math.round(out.maxHp * (1 + _ef.maxHpPct / 100 * _lv));
      if (_ef.maxMpPct) out.maxMp = Math.round(out.maxMp * (1 + _ef.maxMpPct / 100 * _lv));
    }
  } catch (e) {}
  return out;
}
/* ---- Hệ thống bị động theo PDF: tốn SP, tối đa 5 cùng lúc, yêu cầu cảnh giới ---- */
function passiveSp(pid) { var d = passiveDef(pid); return d ? (d.sp || 1) : 1; }
function spMax(state) {
  var r = (state && state.char && state.char.realm) || 0;
  return 6 + r * 2; /* Luyện Khí 8, Trúc Cơ 10, Kim Đan 12... */
}
function spUsed(state) {
  var tot = 0, load = (state && state.passiveLoad) || [];
  for (var i = 0; i < load.length; i++) tot += passiveSp(load[i]);
  return tot;
}
/* Bị động có đang trang bị (học rồi + gắn slot + đủ cảnh giới)? */
function passiveEquipped(state, pid) {
  var load = (state && state.passiveLoad) || [];
  if (load.indexOf(pid) < 0) return false;
  var d = passiveDef(pid);
  if (d && d.realm) {
    var r = (state.char && state.char.realm) || 0;
    if (r < d.realm) return false;
  }
  return true;
}
/* Cấp hiệu lực = cấp bí tịch nếu đang trang bị, không thì 0 */
function passiveActive(state, pid) {
  if (!passiveEquipped(state, pid)) return 0;
  return passiveLevel(state, pid);
}
/* Gắn/tháo bị động. reason: 'chua_hoc' | 'max_5' | 'thieu_sp' | 'realm_lock' */
function equipPassive(state, pid) {
  state.passiveLoad = state.passiveLoad || [];
  if (state.passiveLoad.indexOf(pid) >= 0) return { ok: true };
  if (passiveLevel(state, pid) <= 0) return { ok: false, reason: "chua_hoc" };
  var d = passiveDef(pid);
  if (d && d.realm) {
    var r = (state.char && state.char.realm) || 0;
    if (r < d.realm) return { ok: false, reason: "realm_lock" };
  }
  if (state.passiveLoad.length >= 5) return { ok: false, reason: "max_5" };
  if (spUsed(state) + passiveSp(pid) > spMax(state)) return { ok: false, reason: "thieu_sp" };
  state.passiveLoad.push(pid);
  _save();
  return { ok: true };
}
function unequipPassive(state, pid) {
  state.passiveLoad = state.passiveLoad || [];
  var i = state.passiveLoad.indexOf(pid);
  if (i >= 0) state.passiveLoad.splice(i, 1);
  _save();
  return { ok: true };
}
function _syncPassives(state) {
  state.passives = state.passives || {};
  Object.keys(PASSIVE_DEFS).forEach(function (pid) {
    state.passives[pid] = passiveLevel(state, pid);
  });
}

/* Sức mạnh thực tế của skill: phẩm × cấp × mốc đặc biệt */
function skillPower(state, skillId) {
  var d = skillDef(skillId);
  if (!d) return null;
  var tier = manualTier(state, skillId);
  var level = manualLevel(state, skillId) || 1;
  /* Dòng skill trên trang bị: +cấp skill (cộng dồn với cấp đã học) */
  var _eqOverlevel = false;
  try {
    if (typeof Khilinh !== "undefined" && Khilinh.skillLvBonus) {
      var _eqLv = Khilinh.skillLvBonus(state, skillId, function (id) {
        return (typeof ITEMS !== "undefined" && ITEMS[id]) || null;
      });
      if (_eqLv > 0) level += _eqLv;
      /* Đồ hiếm vượt cấp: skill từ vật phẩm tốn linh lực ×2 */
      _eqOverlevel = Khilinh.hasOverlevelBonus(state, skillId, function (id) {
        return (typeof ITEMS !== "undefined" && ITEMS[id]) || null;
      });
    }
  } catch (e) {}
  var cfg = tierUpCfg(tier);
  var mult = (d.mult || 0) * gradeMult(tier) * (1 + cfg.per * (level - 1));
  var pierce = 0, splash = 0, msKeys = [];
  var ms = TIER_MILESTONE[tier] || {};
  Object.keys(ms).forEach(function (lv) {
    if (level >= +lv) {
      var m = ms[lv];
      if (m.multBonus) mult *= 1 + m.multBonus;
      if (m.pierce) pierce = Math.max(pierce, m.pierce);
      if (m.splash) splash = Math.max(splash, m.splash);
      if (m.msKey) msKeys.push(m.msKey);
    }
  });
  /* Bị động Lôi Hỏa Song Tuyệt: skill Lôi/Hỏa +15%/cấp */
  try {
    var _lht = passiveActive(state, "loi_hoa_song_tuyet");
    if (_lht > 0 && d.elem && (d.elem === "loi" || d.elem === "hoa"))
      mult *= 1 + 0.15 * _lht;
  } catch (e) {}
  /* Linh căn khai mở: skill cùng hệ với linh căn đã mở → +5% mỗi linh căn (taycot.js) */
  try {
    if (typeof TayCot !== "undefined" && d.elem && TayCot.rootsOf(state).indexOf(d.elem) >= 0)
      mult *= 1.05;
  } catch (e) {}
  /* Buff tông môn: +sát thương theo hệ skill (Kiếm/Thiên Pháp Tông + soul bonus) */
  try {
    if (typeof Sect !== "undefined" && Sect.sectBuff) {
      var _sb = Sect.sectBuff(state || {});
      var _dt = skillDmgType(skillId);
      mult *= ((_sb.skillDmg && (_sb.skillDmg[_dt] || _sb.skillDmg.other)) || 1);
    }
  } catch (e) {}
  /* Bị động Ma Tâm: skill ma hệ +12%/cấp */
  try {
    var _mt = passiveActive(state, "ma_tam");
    if (_mt > 0 && skillDmgType(skillId) === "ma") mult *= 1 + 0.12 * _mt;
  } catch (e) {}
  return {
    mult: mult, mp: _eqOverlevel ? (d.mp || 0) * 2 : (d.mp || 0), cd: d.cd || 0, kind: d.kind,
    defMult: d.defMult || 0, dur: d.dur || 0, fx: d.fx, icon: d.icon,
    tier: tier, level: level, pierce: pierce, splash: splash, msKeys: msKeys,
    overlevel: _eqOverlevel,
  };
}

/* Tổng tỷ lệ hút máu: buff Cửu U Ma Tông 15% + bị động Huyết Mạch 3%/cấp */
function lifestealRate(state) {
  var r = 0;
  try {
    if (typeof Sect !== "undefined" && Sect.sectBuff)
      r += Sect.sectBuff(state || {}).lifesteal || 0;
  } catch (e) {}
  try { r += 0.03 * passiveActive(state, "huyet_mach"); } catch (e) {}
  return r;
}

function hasLearned(state, techId) {
  if (isPassive(techId)) return passiveLevel(state, techId) > 0;
  return !!(state.skills && state.skills.indexOf(techId) >= 0);
}

/* Giây hồi chiêu còn lại (0 = sẵn sàng) */
function cdLeft(state, skillId, nowMs) {
  var d = skillDef(skillId);
  if (!d) return 0;
  var last = (state.skillsCd && state.skillsCd[skillId]) || 0;
  var left = (d.cd * 1000 - (nowMs - last)) / 1000;
  return left > 0 ? left : 0;
}

/* Có tung được chiêu không. reason: 'chua_hoc' | 'het_mp' | 'dang_hoi' | 'realm_lock' */
function canCast(state, skillId, nowMs, mpNow) {
  if (!hasLearned(state, skillId)) return { ok: false, reason: "chua_hoc" };
  var mid = state.skillManual && state.skillManual[skillId];
  if (mid && !manualRealmOk(state, mid)) return { ok: false, reason: "realm_lock" };
  if (mid) {
    var _mi2 = manualInfo(mid);
    if (_mi2 && _mi2.dao && _mi2.dao !== "trung") {
      var _pd2 = (state && state.dao) || null;
      if ((_pd2 && _pd2 !== _mi2.dao) || (!_pd2 && _mi2.dao === "ma"))
        return { ok: false, reason: "khong_hop_dao" };
    }
  }
  var p = skillPower(state, skillId);
  if (p.mp > (mpNow != null ? mpNow : 0)) return { ok: false, reason: "het_mp" };
  if (cdLeft(state, skillId, nowMs) > 0) return { ok: false, reason: "dang_hoi" };
  return { ok: true, power: p };
}

/* Tung chiêu: chốt thời điểm hồi chiêu. Gọi sau canCast. */
function castSkill(state, skillId, nowMs) {
  var chk = canCast(state, skillId, nowMs);
  if (!chk.ok) return chk;
  if (!state.skillsCd) state.skillsCd = {};
  state.skillsCd[skillId] = nowMs;
  return { ok: true, power: chk.power, def: skillDef(skillId) };
}

/* Trừ 1 bí tịch khỏi túi. Trả true nếu trừ được. */
function removeItem(state, id, n) {
  if (!state.bag) return false;
  for (var i = 0; i < state.bag.length; i++) {
    if (state.bag[i].id === id && !state.bag[i].locked) {
      if ((state.bag[i].qty || 0) < n) return false;
      state.bag[i].qty -= n;
      if (state.bag[i].qty <= 0) state.bag.splice(i, 1);
      if (typeof saveGame === "function") { try { saveGame(); } catch (e) {} }
      return true;
    }
  }
  return false;
}
function _save() { if (typeof saveGame === "function") { try { saveGame(); } catch (e) {} } }

/* Nạp bí tịch: học mới / lên cấp bằng bí tịch trùng / đổi mảnh khi max.
 * learnManual: từ túi, tốn phí học. obtainManual: miễn phí (gacha/kỳ ngộ tự học).
 * reason: 'no_manual' | 'realm_lock' | 'thieu_linh_thach' | 'khong_hop_dao' |
 *         'sai_tong_mon' | 'thieu_uy_vong' */
/* Trường Sinh Quyết: mỗi cấp học/lên cấp +30 năm thọ nguyên (lifespan.js) */
function _grantTruongSinhYears(state, manualId) {
  try {
    var info = manualInfo(manualId);
    if (info && info.passive === "truong_sinh_quyet" &&
        typeof Lifespan !== "undefined" && Lifespan && Lifespan.addYears) {
      Lifespan.addYears(state, 30);
    }
  } catch (e) {}
}
function _obtain(state, manualId, payCost) {
  var info = manualInfo(manualId);
  if (!info) return { ok: false, reason: "no_manual" };
  if (!manualRealmOk(state, manualId))
    return { ok: false, reason: "realm_lock", need: info.realm };
  /* Đường tu: mỗi đường chỉ học skill của đường mình (trung = cả 2) */
  var _pdao = (state && state.dao) || null;
  if (info.dao && info.dao !== "trung") {
    if ((_pdao && _pdao !== info.dao) || (!_pdao && info.dao === "ma"))
      return { ok: false, reason: "khong_hop_dao" };
  }
  /* Khóa theo tông môn (bí tịch độc quyền) */
  if (info.dieu_kien_mo && info.dieu_kien_mo.tong) {
    var _j = null;
    try { if (typeof Sect !== "undefined" && Sect.joinedSect) _j = Sect.joinedSect(state); } catch (e) {}
    if (_j !== info.dieu_kien_mo.tong) return { ok: false, reason: "sai_tong_mon" };
  }
  /* Độc chiêu tông môn: yêu cầu uy vọng (điểm cống hiến) đủ cao */
  if (info.dieu_kien_mo && info.dieu_kien_mo.contrib) {
    var _c = 0;
    try { if (typeof Sect !== "undefined" && Sect.sectContrib) _c = Sect.sectContrib(state); } catch (e) {}
    if (_c < info.dieu_kien_mo.contrib) return { ok: false, reason: "thieu_uy_vong", need: info.dieu_kien_mo.contrib };
  }
  var techId = info.skill || info.passive;
  state.skillManual = state.skillManual || {};
  state.manualLevels = state.manualLevels || {};
  state.fragments = state.fragments || 0;

  var curMid = state.skillManual[techId] || null;
  /* --- Chưa học: học mới --- */
  if (!curMid) {
    if (payCost) {
      if (!removeItem(state, manualId, 1)) return { ok: false, reason: "no_manual" };
      var cost = info.learnCost || 0;
      if ((state.stones || 0) < cost) return { ok: false, reason: "thieu_linh_thach", need: cost };
      if (cost > 0) state.stones -= cost;
    }
    state.skillManual[techId] = manualId;
    state.manualLevels[manualId] = 1;
    _grantTruongSinhYears(state, manualId);
    if (info.skill) {
      state.skills = state.skills || [];
      if (state.skills.indexOf(info.skill) < 0) state.skills.push(info.skill);
      state.skillGrades = state.skillGrades || {};
      state.skillGrades[info.skill] = info.tier;
    }
    _syncPassives(state);
    _save();
    return { ok: true, learned: true, techId: techId, level: 1, tier: info.tier };
  }
  /* --- Đã học: bí tịch trùng --- */
  if (payCost && !removeItem(state, manualId, 1)) return { ok: false, reason: "no_manual" };
  var curInfo = manualInfo(curMid) || info;
  var curTier = curInfo.tier || 0;
  var curLevel = state.manualLevels[curMid] || 1;
  /* (a) Phẩm cao hơn → nâng phẩm, giữ cấp */
  if (info.tier > curTier) {
    state.skillManual[techId] = manualId;
    state.manualLevels[manualId] = curLevel;
    if (info.skill) state.skillGrades[info.skill] = info.tier;
    _syncPassives(state);
    _save();
    return { ok: true, tierUp: true, techId: techId, level: curLevel, tier: info.tier };
  }
  /* (b) Còn cấp → lên cấp */
  if (curLevel < manualMaxLevel(curTier)) {
    state.manualLevels[curMid] = curLevel + 1;
    _grantTruongSinhYears(state, curMid);
    _syncPassives(state);
    _save();
    return { ok: true, leveled: true, techId: techId, level: curLevel + 1, tier: curTier };
  }
  /* (c) Max cấp → hóa mảnh */
  var got = [5, 10, 20][info.tier] || 5;
  state.fragments += got;
  _save();
  return { ok: true, fragments: true, techId: techId, got: got };
}
function learnManual(state, manualId) { return _obtain(state, manualId, true); }
function obtainManual(state, manualId) { return _obtain(state, manualId, false); }

/* Nâng cấp bằng Mảnh Bí Tịch + Linh Thạch (không cần bí tịch trùng) */
function upgradeManual(state, manualId) {
  var info = manualInfo(manualId);
  if (!info) return { ok: false, reason: "no_manual" };
  var techId = info.skill || info.passive;
  var curMid = state.skillManual && state.skillManual[techId];
  if (curMid !== manualId) return { ok: false, reason: "chua_hoc" };
  var level = (state.manualLevels && state.manualLevels[manualId]) || 1;
  var max = manualMaxLevel(info.tier);
  if (level >= max) return { ok: false, reason: "upg_maxed" };
  var cost = upgradeCost(info.tier, level);
  if ((state.fragments || 0) < cost.frags) return { ok: false, reason: "no_frag", need: cost.frags };
  if ((state.stones || 0) < cost.stones) return { ok: false, reason: "thieu_linh_thach", need: cost.stones };
  state.fragments -= cost.frags;
  state.stones -= cost.stones;
  state.manualLevels[manualId] = level + 1;
  _grantTruongSinhYears(state, manualId);
  _syncPassives(state);
  _save();
  return { ok: true, level: level + 1, tier: info.tier };
}

/* Bí tịch trùng max cấp → Mảnh Bí Tịch (5/10/20 theo phẩm) */
function convertManualToFragments(state, manualId) {
  var info = manualInfo(manualId);
  if (!info) return { ok: false };
  var got = [5, 10, 20][info.tier] || 5;
  if (!removeItem(state, manualId, 1)) return { ok: false };
  state.fragments = (state.fragments || 0) + got;
  _save();
  return { ok: true, got: got };
}

/* Bí tịch trong túi có bán được? (chỉ bí tịch CHƯA học / trùng chưa dùng mới bán;
 * bí tịch đang gắn với skill đã học thì không bán) */
function canSellManual(state, manualId) {
  var techId = manualTechId(manualId);
  if (!techId) return true;
  var linked = state.skillManual && state.skillManual[techId];
  return linked !== manualId;
}
function manualSellPrice(manualId) {
  var mi = manualInfo(manualId);
  return [50, 300, 1500][mi ? mi.tier : 0] || 50;
}

/* Pool bí tịch cho gacha: tự do mọi phẩm/cảnh giới (điểm hấp dẫn của gacha).
 * Bí tịch vượt cảnh giới rớt ra vẫn khóa trong túi chờ đủ cảnh giới. */
function manualsForGacha(playerClass) {
  var cls = (playerClass === "phap" || playerClass === "the") ? playerClass : "kiem";
  var out = [];
  var ids = typeof ITEMS !== "undefined" && ITEMS ? Object.keys(ITEMS) : Object.keys(_MANUAL_FB);
  ids.forEach(function (id) {
    var mi = manualInfo(id);
    if (!mi || mi.exclusive) return; /* bí tịch độc quyền tông môn không vào gacha */
    if (mi.skill) {
      var d = skillDef(mi.skill);
      if (d && d.sect === cls) out.push(id);
    } else if (mi.passive) {
      out.push(id); /* bị động dùng chung mọi hệ */
    }
  });
  return out;
}
/* Pool vừa tầm: kỳ ngộ / bí cảnh / Tàng Kinh Các (realm <= hiện tại + 1) */
function manualsForLevel(playerClass, realm) {
  return manualsForGacha(playerClass).filter(function (id) {
    var mi = manualInfo(id);
    return mi && (mi.realm || 1) <= (realm || 0) + 1;
  });
}

/* Bảng rớt bí tịch ở boss bí cảnh theo độ khó (Bui chốt).
 * Trả manualId đúng hệ phái playerClass ('kiem'|'phap'|'the') hoặc null.
 * - Tân Thủ: 8% → Phàm | Tinh Anh: 6% Phàm + 3% Địa
 * - Đột Phá: 5% Phàm + 4% Địa + 2% Thiên | Ngẫu nhiên: như Tinh Anh */
function rollManualDrop(dungeonTypeId, playerClass, rng) {
  var r = (typeof rng === "function") ? rng() : Math.random();
  var table = null;
  if (dungeonTypeId === "tanthu") table = [[0.08, 0]];
  else if (dungeonTypeId === "tinhanh") table = [[0.06, 0], [0.03, 1]];
  else if (dungeonTypeId === "dotpha") table = [[0.05, 0], [0.04, 1], [0.02, 2]];
  else table = [[0.06, 0], [0.03, 1]];
  var cls = (playerClass === "phap" || playerClass === "the") ? playerClass : "kiem";
  var realm = 1;
  try {
    if (typeof state !== "undefined" && state && state.char) realm = state.char.realm || 1;
  } catch (e) {}
  for (var i = 0; i < table.length; i++) {
    if (r < table[i][0]) {
      var tier = table[i][1];
      var order = ["kiem_xuyen_van", "van_kiem_quy_tong", "kiem_cuong_ho_the"];
      if (cls === "phap") order = ["ngu_loi_oanh_dinh", "hoa_vu_luu_tinh", "linh_thuan"];
      if (cls === "the") order = ["ba_vuong_quyen", "chan_dia_chuong", "kim_cuong_bat_hoai"];
      var mid = manualIdForSkill(order[tier]);
      var mi = mid && manualInfo(mid);
      if (mi && (mi.realm || 1) <= realm + 1) return mid;
      return null;
    }
    r -= table[i][0];
  }
  return null;
}

/* Bí tịch ngẫu nhiên theo hệ + phẩm (dùng cho giftcode/ghép mảnh) */
function randomManualForClass(playerClass, tier) {
  var pool = manualsForGacha(playerClass).filter(function (id) {
    var mi = manualInfo(id);
    return mi && mi.tier === tier && mi.skill; /* chỉ bí tịch chủ động */
  });
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}


/* ---- Patch skill cũ: đường tu + hệ sát thương + effect sheet AI ---- */
(function () {
  var P = {
    kiem_xuyen_van:    { dao: "chinh", dtype: "kiem", effect_sheet: "eff_slash_sheet", effect_mau: "#cfe8ff" },
    van_kiem_quy_tong: { dao: "chinh", dtype: "kiem", effect_sheet: "eff_swordshadow_sheet", effect_mau: "#e8f4ff" },
    kiem_cuong_ho_the: { dao: "chinh", dtype: "kiem", effect_sheet: "eff_formation_sheet", effect_mau: "#fff3b0" },
    ngu_loi_oanh_dinh: { dao: "chinh", dtype: "phap", effect_sheet: "eff_lightning_sheet", effect_mau: "#b388ff" },
    hoa_vu_luu_tinh:   { dao: "chinh", dtype: "phap", effect_sheet: "eff_fire_sheet", effect_mau: "#ff8a65" },
    linh_thuan:        { dao: "chinh", dtype: "phap", effect_sheet: "eff_formation_sheet", effect_mau: "#9be8ff" },
    ba_vuong_quyen:    { dao: "chinh", dtype: "the",  effect_sheet: "eff_slash_sheet", effect_mau: "#ffcc80" },
    chan_dia_chuong:   { dao: "chinh", dtype: "the",  effect_sheet: "eff_fire_sheet", effect_mau: "#d7ccc8" },
    kim_cuong_bat_hoai:{ dao: "chinh", dtype: "the",  effect_sheet: "eff_formation_sheet", effect_mau: "#ffd54f" },
    kimdan_kiem_y:     { dao: "chinh", dtype: "kiem", effect_sheet: "eff_swordshadow_sheet", effect_mau: "#fff9c4" },
    kimdan_loi_phap:   { dao: "chinh", dtype: "phap", effect_sheet: "eff_lightning_sheet", effect_mau: "#d1c4e9" },
    kimdan_the_quyen:  { dao: "chinh", dtype: "the",  effect_sheet: "eff_slash_sheet", effect_mau: "#ffab91" },
    dan_hoa_ho_the:    { dao: "chinh", dtype: "other", effect_sheet: "eff_fire_sheet", effect_mau: "#ffcc80" },
    thu_vuong_trao:    { dao: "trung", dtype: "other", effect_sheet: "eff_slash_sheet", effect_mau: "#dcedc8" },
  };
  for (var k in P) if (SECT_SKILLS[k]) for (var f in P[k]) SECT_SKILLS[k][f] = P[k][f];
  /* Bị động cũ: SP + cảnh giới theo PDF */
  var PP = {
    kiem_tam:  { sp: 2, realm: 1 }, linh_mach: { sp: 1, realm: 2 },
    the_phach: { sp: 2, realm: 1 }, than_phap:  { sp: 2, realm: 2 },
    duoc_tam:      { sp: 2, realm: 1 }, hoi_xuan:     { sp: 2, realm: 1 },
    ngu_thu_tam:   { sp: 2, realm: 1 }, linh_thu_khe: { sp: 1, realm: 1 },
  };
  for (var k2 in PP) if (PASSIVE_DEFS[k2]) for (var f2 in PP[k2]) PASSIVE_DEFS[k2][f2] = PP[k2][f2];
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    SECT_SKILLS: SECT_SKILLS, GRADE_MULT: GRADE_MULT,
    TIER_UP: TIER_UP, TIER_MILESTONE: TIER_MILESTONE,
    PASSIVE_DEFS: PASSIVE_DEFS, _MANUAL_FB: _MANUAL_FB,
    skillDef: skillDef, gradeMult: gradeMult, skillDmgType: skillDmgType,
    tierUpCfg: tierUpCfg, manualMaxLevel: manualMaxLevel, upgradeCost: upgradeCost,
    manualInfo: manualInfo, manualTechId: manualTechId,
    manualIdForSkill: manualIdForSkill,
    manualRealmOk: manualRealmOk, manualLevel: manualLevel, manualTier: manualTier,
    passiveDef: passiveDef, isPassive: isPassive, passiveLevel: passiveLevel,
    applyPassives: applyPassives,
    passiveSp: passiveSp, spMax: spMax, spUsed: spUsed,
    passiveEquipped: passiveEquipped, passiveActive: passiveActive,
    equipPassive: equipPassive, unequipPassive: unequipPassive,
    skillPower: skillPower, hasLearned: hasLearned, lifestealRate: lifestealRate,
    cdLeft: cdLeft, canCast: canCast, castSkill: castSkill,
    learnManual: learnManual, obtainManual: obtainManual,
    upgradeManual: upgradeManual,
    convertManualToFragments: convertManualToFragments,
    canSellManual: canSellManual, manualSellPrice: manualSellPrice,
    manualsForGacha: manualsForGacha, manualsForLevel: manualsForLevel,
    rollManualDrop: rollManualDrop, randomManualForClass: randomManualForClass,
    removeItem: removeItem,
  };
}

/* Browser global (song song với module.exports cho node) */
(function () {
  if (typeof module !== "undefined" && module.exports) return;
  var _g = (typeof globalThis !== "undefined") ? globalThis :
    ((typeof window !== "undefined") ? window : null);
  if (!_g) return;
  _g.Skills = {
    SECT_SKILLS: SECT_SKILLS,
    GRADE_MULT: GRADE_MULT,
    TIER_UP: TIER_UP,
    TIER_MILESTONE: TIER_MILESTONE,
    PASSIVE_DEFS: PASSIVE_DEFS,
    skillDef: skillDef,
    gradeMult: gradeMult,
    skillDmgType: skillDmgType,
    tierUpCfg: tierUpCfg,
    manualMaxLevel: manualMaxLevel,
    upgradeCost: upgradeCost,
    manualInfo: manualInfo,
    manualTechId: manualTechId,
    manualIdForSkill: manualIdForSkill,
    manualRealmOk: manualRealmOk,
    manualLevel: manualLevel,
    manualTier: manualTier,
    passiveDef: passiveDef,
    isPassive: isPassive,
    passiveLevel: passiveLevel,
    applyPassives: applyPassives,
    passiveSp: passiveSp,
    spMax: spMax,
    spUsed: spUsed,
    passiveEquipped: passiveEquipped,
    passiveActive: passiveActive,
    equipPassive: equipPassive,
    unequipPassive: unequipPassive,
    skillPower: skillPower,
    hasLearned: hasLearned,
    lifestealRate: lifestealRate,
    cdLeft: cdLeft,
    canCast: canCast,
    castSkill: castSkill,
    learnManual: learnManual,
    obtainManual: obtainManual,
    upgradeManual: upgradeManual,
    convertManualToFragments: convertManualToFragments,
    canSellManual: canSellManual,
    manualSellPrice: manualSellPrice,
    manualsForGacha: manualsForGacha,
    manualsForLevel: manualsForLevel,
    rollManualDrop: rollManualDrop,
    randomManualForClass: randomManualForClass,
    removeItem: removeItem
  };
})();
