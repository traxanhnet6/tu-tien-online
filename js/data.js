/* ============================================================
 * js/data.js — Dữ liệu Thiết kế Hệ thống (Thiết kế Hệ thống viết)
 * Phụ thuộc: stages.js (chỉ genRandomDungeon cần makeRng/randInt/pickRng)
 * Mọi text hiển thị: nameKey / descKey (Kỹ sư UI dịch qua lang.js),
 * KHÔNG hardcode tiếng Việt trong file này.
 * ============================================================ */

/* --- Dependency từ stages.js (browser: global sẵn; node: require) --- */
var _STG = null;
if (typeof makeRng === "undefined" && typeof require !== "undefined") {
  _STG = require("./stages.js");
}
function _stg(name) {
  if (typeof globalThis !== "undefined" && typeof globalThis[name] === "function") return globalThis[name];
  if (_STG) return _STG[name];
  throw new Error("missing dep: " + name);
}
function _makeRng(seed) { return _stg("makeRng")(seed); }
function _randInt(rng, a, b) { return _stg("randInt")(rng, a, b); }
function _pickRng(rng, arr) { return _stg("pickRng")(rng, arr); }

/* ============================================================
 * LINH CĂN — 13 hệ (5 cơ bản + 3 biến dị + 4 hiếm + hỗn độn)
 * ============================================================ */
const ELEMENTS = {
  kim:    { fx: "#e8e8e8", nameKey: "el_kim" },
  moc:    { fx: "#66bb6a", nameKey: "el_moc" },
  thuy:   { fx: "#42a5f5", nameKey: "el_thuy" },
  hoa:    { fx: "#ef5350", nameKey: "el_hoa" },
  tho:    { fx: "#a1887f", nameKey: "el_tho" },
  bang:   { fx: "#9be8ff", nameKey: "el_bang" },
  loi:    { fx: "#b388ff", nameKey: "el_loi" },
  phong:  { fx: "#b2ff59", nameKey: "el_phong" },
  quang:  { fx: "#fff9c4", nameKey: "el_quang" },
  am:     { fx: "#7b1fa2", nameKey: "el_am" },
  doc:    { fx: "#76ff03", nameKey: "el_doc" },
  huyet:  { fx: "#ff5252", nameKey: "el_huyet" },
  hondon: { fx: "#8e8e93", nameKey: "el_hondon" },
};
/* Tỉ lệ rút linh căn: cơ bản 16 ×5, biến dị 3 ×3, hiếm 2 ×4, hỗn độn 1 */
const LINGEN_RATES = [
  ["kim", 16], ["moc", 16], ["thuy", 16], ["hoa", 16], ["tho", 16],
  ["bang", 3], ["loi", 3], ["phong", 3],
  ["quang", 2], ["am", 2], ["doc", 2], ["huyet", 2],
  ["hondon", 1],
];

/* ============================================================
 * QUÁI — cân bằng quanh baseStats LK1-3 (Kiếm Tu LK1: HP364/atk64/def18;
 * Pháp Tu LK1: atk59; Thể Tu LK1: HP473/atk56/def22)
 * - Quái map1: atk ~18-34 → mỗi đòn gây ~0-15 sát thương lên player LK1-3,
 *   player 2-3 đòn hạ 1 con (atk 64-75 vs def 6-14).
 * - Boss map1 (da_tru_vuong): HP 600, atk 45 → player LK3 chịu ~13-15 đòn,
 *   hạ boss trong ~10 đòn. Boss map2/map3 dành cho LK4+.
 * drops: [{id, rate (0..1), min, max}]
 * ============================================================ */
const MONSTERS = {
  da_tru: {
    nameKey: "mon_da_tru", hp: 90, atk: 18, def: 6, exp: 12,
    img: "../assets-ai/quai-da-tru.webp", fb: "#8a6f4d", loai: "thu",
    drops: [
      { id: "pill_hx", rate: 0.05, min: 1, max: 1 },
      { id: "taycothao", rate: 0.06, min: 1, max: 1 },
      { id: "trung_pham", rate: 0.005, min: 1, max: 1 },
      { id: "trung_linh", rate: 0.002, min: 1, max: 1 },
      { id: "dan_hx_tieu", rate: 0.05, min: 1, max: 1 },
      { id: "thit_yeu_thu", rate: 0.03, min: 1, max: 1 },
          { id: "frag_r1_vukhi", rate: 0.02, min: 1, max: 1 },
          { id: "frag_r1_giap", rate: 0.02, min: 1, max: 1 },
          { id: "frag_r1_phapbao", rate: 0.02, min: 1, max: 1 },
    ],
  },
  son_ke: {
    nameKey: "mon_son_ke", hp: 120, atk: 26, def: 9, exp: 18,
    img: "../assets-ai/quai-son-ke.webp", fb: "#c47b3a", loai: "thu",
    drops: [
      { id: "pill_hx", rate: 0.06, min: 1, max: 1 },
      { id: "taycothao", rate: 0.07, min: 1, max: 1 },
      { id: "trung_pham", rate: 0.005, min: 1, max: 1 },
      { id: "trung_linh", rate: 0.002, min: 1, max: 1 },
      { id: "dan_hx_tieu", rate: 0.05, min: 1, max: 1 },
      { id: "thit_yeu_thu", rate: 0.03, min: 1, max: 1 },
      { id: "hat_linh_chi", rate: 0.03, min: 1, max: 1 },
          { id: "frag_r1_vukhi", rate: 0.02, min: 1, max: 1 },
          { id: "frag_r1_giap", rate: 0.02, min: 1, max: 1 },
          { id: "frag_r1_phapbao", rate: 0.02, min: 1, max: 1 },
    ],
  },
  son_tac: {
    nameKey: "mon_son_tac", hp: 100, atk: 22, def: 8, exp: 15,
    img: null, fb: "#5a4a3a", loai: "nhan",
    drops: [
      { id: "pill_hx", rate: 0.05, min: 1, max: 1 },
      { id: "taycothao", rate: 0.06, min: 1, max: 1 },
      { id: "dan_hx_tieu", rate: 0.04, min: 1, max: 1 },
    ],
  },
  da_tru_vuong: {
    nameKey: "mon_da_tru_vuong", hp: 600, atk: 45, def: 15, exp: 150,
    img: null, fb: "#6e4a2f", loai: "thu", boss: true, cg: 3,
    drops: [
      { id: "taycothao", rate: 0.5, min: 1, max: 2 },
      { id: "yaodan1", rate: 0.2, min: 1, max: 1 },
      { id: "wpn_phan", rate: 0.25, min: 1, max: 1 },
      { id: "trung_linh", rate: 0.05, min: 1, max: 1 },
      { id: "trung_huyen", rate: 0.03, min: 1, max: 1 },
      { id: "dan_hx_trung", rate: 0.08, min: 1, max: 1 },
      { id: "dan_hl_trung", rate: 0.08, min: 1, max: 1 },
      { id: "kim_cang_dan", rate: 0.05, min: 1, max: 1 },
      { id: "manual_boss_datru", rate: 0.08, eliteRate: 0.15, min: 1, max: 1 },
    ],
  },
  /* ============ QUÁI CỐT TRUYỆN NHÁNH CHÍNH/MA (Bui duyệt 2026-10-18) ============
   * Cặp boss 2 nhánh có chỉ số GIỐNG HỆT NHAU để cân bằng độ khó:
   *   trai_chu_hac_phong: boss chung 2 nhánh (NV12/NV22)
   *   huyet_y_mon_chu = dai_su_huynh_ma (Trúc Cơ đỉnh phong)
   *   dien_chu_u_minh = thu_linh_ve_dao_si (Kim Đan đỉnh phong)
   *   sat_thu_huyet_y = tam_ma (quái thường) */
  trai_chu_hac_phong: {
    nameKey: "mon_trai_chu_hac_phong", hp: 750, atk: 58, def: 18, exp: 180,
    img: null, fb: "#3a2a1a", loai: "nhan", boss: true, cg: 4,
    drops: [
      { id: "taycothao", rate: 0.5, min: 1, max: 2 },
      { id: "yaodan1", rate: 0.3, min: 1, max: 1 },
      { id: "wpn_linh", rate: 0.3, min: 1, max: 1 },
      { id: "dan_hx_trung", rate: 0.1, min: 1, max: 1 },
      { id: "trung_linh", rate: 0.05, min: 1, max: 1 },
    ],
  },
  sat_thu_huyet_y: {
    nameKey: "mon_sat_thu_huyet_y", hp: 200, atk: 48, def: 16, exp: 36,
    img: null, fb: "#5a1a1a", loai: "nhan",
    drops: [
      { id: "pill_hl", rate: 0.08, min: 1, max: 1 },
      { id: "taycothao", rate: 0.08, min: 1, max: 1 },
      { id: "dan_hx_tieu", rate: 0.05, min: 1, max: 1 },
    ],
  },
  huyet_y_mon_chu: {
    nameKey: "mon_huyet_y_mon_chu", hp: 1100, atk: 82, def: 25, exp: 280,
    img: null, fb: "#6a0f0f", loai: "nhan", boss: true, cg: 6,
    drops: [
      { id: "yaodan1", rate: 0.4, min: 1, max: 2 },
      { id: "taycothao", rate: 0.5, min: 1, max: 2 },
      { id: "arm_linh", rate: 0.25, min: 1, max: 1 },
      { id: "dan_hx_trung", rate: 0.1, min: 1, max: 1 },
      { id: "trung_linh", rate: 0.05, min: 1, max: 1 },
    ],
  },
  tam_ma: {
    nameKey: "mon_tam_ma", hp: 200, atk: 48, def: 16, exp: 36,
    img: null, fb: "#3a1a3a", loai: "ma",
    drops: [
      { id: "pill_hl", rate: 0.08, min: 1, max: 1 },
      { id: "taycothao", rate: 0.08, min: 1, max: 1 },
      { id: "dan_hx_tieu", rate: 0.05, min: 1, max: 1 },
    ],
  },
  dai_su_huynh_ma: {
    nameKey: "mon_dai_su_huynh_ma", hp: 1100, atk: 82, def: 25, exp: 280,
    img: null, fb: "#2a1a2a", loai: "nhan", boss: true, cg: 6,
    drops: [
      { id: "yaodan1", rate: 0.4, min: 1, max: 2 },
      { id: "taycothao", rate: 0.5, min: 1, max: 2 },
      { id: "arm_linh", rate: 0.25, min: 1, max: 1 },
      { id: "dan_hx_trung", rate: 0.1, min: 1, max: 1 },
      { id: "trung_linh", rate: 0.05, min: 1, max: 1 },
    ],
  },
  dien_chu_u_minh: {
    nameKey: "mon_dien_chu_u_minh", hp: 1600, atk: 110, def: 35, exp: 400,
    img: null, fb: "#1a2a3a", loai: "ma", boss: true, cg: 8,
    drops: [
      { id: "yaodan1", rate: 0.5, min: 1, max: 2 },
      { id: "dia_linh_qua", rate: 0.5, min: 1, max: 2 },
      { id: "wpn_linh", rate: 0.3, min: 1, max: 1 },
      { id: "dan_hx_dai", rate: 0.1, min: 1, max: 1 },
      { id: "trung_huyen", rate: 0.05, min: 1, max: 1 },
    ],
  },
  thu_linh_ve_dao_si: {
    nameKey: "mon_thu_linh_ve_dao_si", hp: 1600, atk: 110, def: 35, exp: 400,
    img: null, fb: "#3a3a1a", loai: "nhan", boss: true, cg: 8,
    drops: [
      { id: "yaodan1", rate: 0.5, min: 1, max: 2 },
      { id: "dia_linh_qua", rate: 0.5, min: 1, max: 2 },
      { id: "wpn_linh", rate: 0.3, min: 1, max: 1 },
      { id: "dan_hx_dai", rate: 0.1, min: 1, max: 1 },
      { id: "trung_huyen", rate: 0.05, min: 1, max: 1 },
    ],
  },
  phong_lang: {
    nameKey: "mon_phong_lang", hp: 150, atk: 34, def: 12, exp: 26,
    img: null, fb: "#7d9aa8", loai: "thu",
    drops: [
      { id: "pill_hx", rate: 0.07, min: 1, max: 2 },
      { id: "taycothao", rate: 0.08, min: 1, max: 1 },
      { id: "trung_pham", rate: 0.005, min: 1, max: 1 },
      { id: "trung_linh", rate: 0.002, min: 1, max: 1 },
      { id: "dan_hl_tieu", rate: 0.05, min: 1, max: 1 },
      { id: "linh_tra", rate: 0.02, min: 1, max: 1 },
          { id: "frag_r2_vukhi", rate: 0.02, min: 1, max: 1 },
          { id: "frag_r2_giap", rate: 0.02, min: 1, max: 1 },
          { id: "frag_r2_phapbao", rate: 0.02, min: 1, max: 1 },
    ],
  },
  hu_thi: {
    nameKey: "mon_hu_thi", hp: 180, atk: 42, def: 14, exp: 32,
    img: null, fb: "#9aa87d", loai: "thu",
    drops: [
      { id: "pill_hx", rate: 0.08, min: 1, max: 2 },
      { id: "yaodan1", rate: 0.05, min: 1, max: 1 },
      { id: "trung_pham", rate: 0.005, min: 1, max: 1 },
      { id: "trung_linh", rate: 0.002, min: 1, max: 1 },
      { id: "dan_hl_tieu", rate: 0.05, min: 1, max: 1 },
      { id: "linh_tra", rate: 0.02, min: 1, max: 1 },
      { id: "hat_truc_co_thao", rate: 0.02, min: 1, max: 1 },
          { id: "frag_r2_vukhi", rate: 0.02, min: 1, max: 1 },
          { id: "frag_r2_giap", rate: 0.02, min: 1, max: 1 },
          { id: "frag_r2_phapbao", rate: 0.02, min: 1, max: 1 },
    ],
  },
  lang_vuong: {
    nameKey: "mon_lang_vuong", hp: 900, atk: 70, def: 22, exp: 220,
    img: null, fb: "#4f6b7d", loai: "thu", boss: true, cg: 5,
    drops: [
      { id: "yaodan1", rate: 0.35, min: 1, max: 1 },
      { id: "taycothao", rate: 0.4, min: 1, max: 2 },
      { id: "wpn_linh", rate: 0.25, min: 1, max: 1 },
      { id: "trung_linh", rate: 0.05, min: 1, max: 1 },
      { id: "trung_huyen", rate: 0.03, min: 1, max: 1 },
      { id: "dan_hx_trung", rate: 0.08, min: 1, max: 1 },
      { id: "dan_hl_trung", rate: 0.08, min: 1, max: 1 },
      { id: "kim_cang_dan", rate: 0.05, min: 1, max: 1 },
      { id: "manual_boss_langvuong", rate: 0.08, eliteRate: 0.15, min: 1, max: 1 },
    ],
  },
  u_hon: {
    nameKey: "mon_u_hon", hp: 220, atk: 52, def: 17, exp: 40,
    img: null, fb: "#8d7fb8", loai: "ma", bay: true,
    img: null, fb: "#8b7bb8", loai: "ma",
    drops: [
      { id: "pill_hl", rate: 0.08, min: 1, max: 2 },
      { id: "taycothao", rate: 0.09, min: 1, max: 1 },
      { id: "trung_pham", rate: 0.005, min: 1, max: 1 },
      { id: "trung_linh", rate: 0.002, min: 1, max: 1 },
      { id: "duong_than_dan", rate: 0.04, min: 1, max: 1 },
      { id: "thanh_tam_qua", rate: 0.02, min: 1, max: 1 },
          { id: "frag_r3_vukhi", rate: 0.02, min: 1, max: 1 },
          { id: "frag_r3_giap", rate: 0.02, min: 1, max: 1 },
          { id: "frag_r3_phapbao", rate: 0.02, min: 1, max: 1 },
    ],
  },
  thi_ma: {
    nameKey: "mon_thi_ma", hp: 260, atk: 62, def: 20, exp: 48,
    img: null, fb: "#5d7a5d", loai: "ma",
    drops: [
      { id: "pill_hl", rate: 0.09, min: 1, max: 2 },
      { id: "yaodan1", rate: 0.07, min: 1, max: 1 },
      { id: "trung_pham", rate: 0.005, min: 1, max: 1 },
      { id: "trung_linh", rate: 0.002, min: 1, max: 1 },
      { id: "duong_than_dan", rate: 0.04, min: 1, max: 1 },
      { id: "thanh_tam_qua", rate: 0.02, min: 1, max: 1 },
      { id: "hat_dia_linh_qua", rate: 0.015, min: 1, max: 1 },
          { id: "frag_r3_vukhi", rate: 0.02, min: 1, max: 1 },
          { id: "frag_r3_giap", rate: 0.02, min: 1, max: 1 },
          { id: "frag_r3_phapbao", rate: 0.02, min: 1, max: 1 },
    ],
  },
  cot_tuong: {
    nameKey: "mon_cot_tuong", hp: 1300, atk: 95, def: 28, exp: 320,
    img: null, fb: "#3d4a5d", loai: "ma", boss: true, cg: 7,
    drops: [
      { id: "yaodan1", rate: 0.4, min: 1, max: 2 },
      { id: "taycothao", rate: 0.6, min: 1, max: 2 },
      { id: "arm_linh", rate: 0.25, min: 1, max: 1 },
      { id: "trung_linh", rate: 0.05, min: 1, max: 1 },
      { id: "trung_huyen", rate: 0.03, min: 1, max: 1 },
      { id: "dan_hx_trung", rate: 0.08, min: 1, max: 1 },
      { id: "dan_hl_trung", rate: 0.08, min: 1, max: 1 },
      { id: "kim_cang_dan", rate: 0.05, min: 1, max: 1 },
      { id: "manual_boss_cottuong", rate: 0.08, eliteRate: 0.15, min: 1, max: 1 },
    ],
  },
  /* ---- Quái Huyết Ma Vực (Trúc Cơ, ma hệ) ---- */
  ma_binh: {
    nameKey: "mon_ma_binh", hp: 420, atk: 95, def: 30, exp: 120,
    img: "assets/sprs/mon_ma_binh.png", fb: "#8a1a1a", loai: "ma",
    drops: [
      { id: "pill_hx", rate: 0.08, min: 1, max: 2 },
      { id: "yaodan1", rate: 0.06, min: 1, max: 1 },
      { id: "huyet_tinh", rate: 0.10, min: 1, max: 1 },
      { id: "trung_linh", rate: 0.005, min: 1, max: 1 },
      { id: "dan_hx_trung", rate: 0.05, min: 1, max: 1 },
          { id: "frag_r4_vukhi", rate: 0.02, min: 1, max: 1 },
          { id: "frag_r4_giap", rate: 0.02, min: 1, max: 1 },
          { id: "frag_r4_phapbao", rate: 0.02, min: 1, max: 1 },
    ],
  },
  oan_linh: {
    nameKey: "mon_oan_linh", hp: 360, atk: 110, def: 22, exp: 130,
    img: "assets/sprs/mon_oan_linh.png", fb: "#3a6a5a", loai: "ma",
    drops: [
      { id: "pill_hl", rate: 0.08, min: 1, max: 2 },
      { id: "yaodan1", rate: 0.06, min: 1, max: 1 },
      { id: "oan_hon_thach", rate: 0.10, min: 1, max: 1 },
      { id: "duong_than_dan", rate: 0.04, min: 1, max: 1 },
          { id: "frag_r4_vukhi", rate: 0.02, min: 1, max: 1 },
          { id: "frag_r4_giap", rate: 0.02, min: 1, max: 1 },
          { id: "frag_r4_phapbao", rate: 0.02, min: 1, max: 1 },
    ],
  },
  ma_lang: {
    nameKey: "mon_ma_lang", hp: 480, atk: 105, def: 34, exp: 140,
    img: "assets/sprs/mon_ma_lang.png", fb: "#4a2a6a", loai: "ma",
    drops: [
      { id: "pill_hx", rate: 0.08, min: 1, max: 2 },
      { id: "yaodan1", rate: 0.07, min: 1, max: 1 },
      { id: "huyet_tinh", rate: 0.08, min: 1, max: 1 },
      { id: "thit_yeu_thu", rate: 0.05, min: 1, max: 1 },
      { id: "trung_huyen", rate: 0.003, min: 1, max: 1 },
          { id: "frag_r4_vukhi", rate: 0.02, min: 1, max: 1 },
          { id: "frag_r4_giap", rate: 0.02, min: 1, max: 1 },
          { id: "frag_r4_phapbao", rate: 0.02, min: 1, max: 1 },
    ],
  },
  u_hon_lang: {
    nameKey: "mon_u_hon_lang", hp: 170, atk: 38, def: 14, exp: 30,
    img: null, fb: "#5a4a6a", loai: "ma",
    drops: [
      { id: "pill_hx", rate: 0.06, min: 1, max: 1 },
      { id: "yaodan1", rate: 0.04, min: 1, max: 1 },
      { id: "oan_hon_thach", rate: 0.05, min: 1, max: 1 },
          { id: "frag_r2_vukhi", rate: 0.02, min: 1, max: 1 },
          { id: "frag_r2_giap", rate: 0.02, min: 1, max: 1 },
          { id: "frag_r2_phapbao", rate: 0.02, min: 1, max: 1 },
    ],
  },
  thach_giap_trung: {
    nameKey: "mon_thach_giap_trung", hp: 200, atk: 45, def: 25, exp: 40,
    img: null, fb: "#6a6a72", loai: "thu",
    drops: [
      { id: "pill_hx", rate: 0.06, min: 1, max: 1 },
      { id: "tran_than_thach", rate: 0.08, min: 1, max: 1 },
          { id: "frag_r1_vukhi", rate: 0.02, min: 1, max: 1 },
          { id: "frag_r1_giap", rate: 0.02, min: 1, max: 1 },
          { id: "frag_r1_phapbao", rate: 0.02, min: 1, max: 1 },
    ],
  },
  tinh_thach_quai: {
    nameKey: "mon_tinh_thach_quai", hp: 230, atk: 52, def: 20, exp: 48,
    img: null, fb: "#7ab8d8", loai: "thu",
    drops: [
      { id: "pill_hl", rate: 0.06, min: 1, max: 1 },
      { id: "linh_thach_tho", rate: 0.08, min: 1, max: 1 },
          { id: "frag_r1_vukhi", rate: 0.02, min: 1, max: 1 },
          { id: "frag_r1_giap", rate: 0.02, min: 1, max: 1 },
          { id: "frag_r1_phapbao", rate: 0.02, min: 1, max: 1 },
    ],
  },
  huyet_ma_vuong: {
    nameKey: "mon_huyet_ma_vuong", hp: 3200, atk: 220, def: 70, exp: 900,
    img: "assets/sprs/mon_huyet_ma_vuong.png", fb: "#6a0f0f", loai: "ma", boss: true, cg: 16,
    drops: [
      { id: "yaodan1", rate: 0.5, min: 1, max: 2 },
      { id: "huyet_tinh", rate: 0.4, min: 1, max: 2 },
      { id: "wpn_linh", rate: 0.25, min: 1, max: 1 },
      { id: "trung_huyen", rate: 0.06, min: 1, max: 1 },
      { id: "manual_ma_1", rate: 0.05, min: 1, max: 1 },
      { id: "kim_cang_dan", rate: 0.08, min: 1, max: 1 },
      { id: "manual_boss_huyetma", rate: 0.08, eliteRate: 0.15, min: 1, max: 1 },
    ],
  },
  /* ---- Quái Thái Hư Tiên Cảnh (Trúc Cơ, tiên hệ) ---- */
  ngoc_tho: {
    nameKey: "mon_ngoc_tho", hp: 400, atk: 90, def: 32, exp: 120,
    img: "assets/sprs/mon_ngoc_tho.png", fb: "#bfe3f5", loai: "tien",
    drops: [
      { id: "pill_hx", rate: 0.08, min: 1, max: 2 },
      { id: "tien_thao", rate: 0.12, min: 1, max: 1 },
      { id: "yaodan1", rate: 0.06, min: 1, max: 1 },
      { id: "trung_linh", rate: 0.005, min: 1, max: 1 },
          { id: "frag_r3_vukhi", rate: 0.02, min: 1, max: 1 },
          { id: "frag_r3_giap", rate: 0.02, min: 1, max: 1 },
          { id: "frag_r3_phapbao", rate: 0.02, min: 1, max: 1 },
    ],
  },
  thien_hac: {
    nameKey: "mon_thien_hac", hp: 440, atk: 100, def: 28, exp: 135,
    img: "assets/sprs/mon_thien_hac.png", fb: "#dceef7", loai: "tien",
    drops: [
      { id: "pill_hl", rate: 0.08, min: 1, max: 2 },
      { id: "tien_thao", rate: 0.10, min: 1, max: 1 },
      { id: "yaodan1", rate: 0.06, min: 1, max: 1 },
      { id: "linh_tra", rate: 0.04, min: 1, max: 1 },
          { id: "frag_r3_vukhi", rate: 0.02, min: 1, max: 1 },
          { id: "frag_r3_giap", rate: 0.02, min: 1, max: 1 },
          { id: "frag_r3_phapbao", rate: 0.02, min: 1, max: 1 },
    ],
  },
  thien_tuong: {
    nameKey: "mon_thien_tuong", hp: 3000, atk: 210, def: 66, exp: 850,
    img: "assets/sprs/mon_thien_tuong.png", fb: "#c9a227", loai: "tien", boss: true, cg: 18,
    drops: [
      { id: "yaodan1", rate: 0.5, min: 1, max: 2 },
      { id: "tien_thao", rate: 0.4, min: 1, max: 2 },
      { id: "arm_linh", rate: 0.25, min: 1, max: 1 },
      { id: "trung_huyen", rate: 0.06, min: 1, max: 1 },
      { id: "kim_cang_dan", rate: 0.08, min: 1, max: 1 },
      { id: "manual_boss_thientuong", rate: 0.08, eliteRate: 0.15, min: 1, max: 1 },
    ],
  },
  u_minh_cu_mang: {
    nameKey: "mon_u_minh_cu_mang", hp: 2200, atk: 150, def: 55, exp: 650,
    img: "assets/sprs/boss_u_minh_cu_mang.png", fb: "#1a5c3a", loai: "ma", boss: true, cg: 13,
    drops: [
      { id: "yaodan1", rate: 0.5, min: 1, max: 2 },
      { id: "manual_boss_uminh", rate: 0.08, eliteRate: 0.15, min: 1, max: 1 },
      { id: "dan_hx_trung", rate: 0.3, min: 1, max: 2 },
      { id: "trung_huyen", rate: 0.06, min: 1, max: 1 },
    ],
  },
  hac_long: {
    nameKey: "mon_hac_long", hp: 2600, atk: 180, def: 60, exp: 750,
    img: "assets/sprs/pixel_thu_hac_long.webp", fb: "#3a1a5c", loai: "ma", boss: true, cg: 15, bay: true,
    drops: [
      { id: "yaodan1", rate: 0.5, min: 1, max: 2 },
      { id: "manual_boss_haclong", rate: 0.08, eliteRate: 0.15, min: 1, max: 1 },
      { id: "trung_huyen", rate: 0.08, min: 1, max: 1 },
      { id: "dan_hl_trung", rate: 0.3, min: 1, max: 2 },
    ],
  },
  am_anh_thu: {
    nameKey: "mon_am_anh_thu", hp: 600, atk: 130, def: 40, exp: 200,
    img: null, fb: "#4a3a6a", loai: "thu",
    drops: [
      { id: "yaodan3", rate: 0.06, min: 1, max: 1 },
      { id: "trung_huyen", rate: 0.01, min: 1, max: 1 },
      { id: "dan_hl_trung", rate: 0.08, min: 1, max: 1 },
          { id: "frag_r4_vukhi", rate: 0.02, min: 1, max: 1 },
          { id: "frag_r4_giap", rate: 0.02, min: 1, max: 1 },
          { id: "frag_r4_phapbao", rate: 0.02, min: 1, max: 1 },
    ],
  },
  huyet_buc: {
    nameKey: "mon_huyet_buc", hp: 550, atk: 125, def: 38, exp: 190,
    img: null, fb: "#8a2a3a", loai: "thu", bay: true,
    drops: [
      { id: "yaodan3", rate: 0.06, min: 1, max: 1 },
      { id: "trung_huyen", rate: 0.01, min: 1, max: 1 },
      { id: "dan_hx_trung", rate: 0.08, min: 1, max: 1 },
          { id: "frag_r4_vukhi", rate: 0.02, min: 1, max: 1 },
          { id: "frag_r4_giap", rate: 0.02, min: 1, max: 1 },
          { id: "frag_r4_phapbao", rate: 0.02, min: 1, max: 1 },
    ],
  },
  thien_ma: {
    nameKey: "mon_thien_ma", hp: 1500, atk: 280, def: 80, exp: 600,
    img: null, fb: "#2a1a4a", loai: "ma", bay: true,
    drops: [
      { id: "yaodan4", rate: 0.08, min: 1, max: 1 },
      { id: "trung_dia", rate: 0.01, min: 1, max: 1 },
      { id: "dan_hl_dai", rate: 0.08, min: 1, max: 1 },
          { id: "frag_r5_vukhi", rate: 0.02, min: 1, max: 1 },
          { id: "frag_r5_giap", rate: 0.02, min: 1, max: 1 },
          { id: "frag_r5_phapbao", rate: 0.02, min: 1, max: 1 },
    ],
  },
  cuu_u_ma_tuong: {
    nameKey: "mon_cuu_u_ma_tuong", hp: 5000, atk: 380, def: 110, exp: 1500,
    img: null, fb: "#1a0a2a", loai: "ma", boss: true, cg: 20,
    drops: [
      { id: "yaodan4", rate: 0.5, min: 1, max: 2 },
      { id: "trung_dia", rate: 0.08, min: 1, max: 1 },
      { id: "manual_boss_ma_tuong", rate: 0.08, eliteRate: 0.15, min: 1, max: 1 },
          { id: "frag_r5_vukhi", rate: 0.02, min: 1, max: 1 },
          { id: "frag_r5_giap", rate: 0.02, min: 1, max: 1 },
          { id: "frag_r5_phapbao", rate: 0.02, min: 1, max: 1 },
    ],
  },
  hon_don_thu: {
    nameKey: "mon_hon_don_thu", hp: 3000, atk: 500, def: 150, exp: 1200,
    img: null, fb: "#5a4a7a", loai: "thu",
    drops: [
      { id: "yaodan4", rate: 0.1, min: 1, max: 1 },
      { id: "trung_dia", rate: 0.015, min: 1, max: 1 },
      { id: "dan_hx_dai", rate: 0.1, min: 1, max: 1 },
          { id: "frag_r6_vukhi", rate: 0.02, min: 1, max: 1 },
          { id: "frag_r6_giap", rate: 0.02, min: 1, max: 1 },
          { id: "frag_r6_phapbao", rate: 0.02, min: 1, max: 1 },
    ],
  },
  thai_hu_thu_vuong: {
    nameKey: "mon_thai_hu_thu_vuong", hp: 9000, atk: 700, def: 200, exp: 3000,
    img: null, fb: "#3a2a5a", loai: "thu", boss: true, cg: 25,
    drops: [
      { id: "yaodan5", rate: 0.4, min: 1, max: 1 },
      { id: "trung_thien", rate: 0.06, min: 1, max: 1 },
      { id: "manual_boss_thaihu", rate: 0.08, eliteRate: 0.15, min: 1, max: 1 },
          { id: "frag_r6_vukhi", rate: 0.02, min: 1, max: 1 },
          { id: "frag_r6_giap", rate: 0.02, min: 1, max: 1 },
          { id: "frag_r6_phapbao", rate: 0.02, min: 1, max: 1 },
    ],
  },
  cuu_kiep_loi_thu: {
    nameKey: "mon_cuu_kiep_loi_thu", hp: 6000, atk: 1000, def: 300, exp: 2500,
    img: null, fb: "#6a5a2a", loai: "thu",
    drops: [
      { id: "yaodan5", rate: 0.1, min: 1, max: 1 },
      { id: "trung_thien", rate: 0.015, min: 1, max: 1 },
          { id: "frag_r7_vukhi", rate: 0.02, min: 1, max: 1 },
          { id: "frag_r7_giap", rate: 0.02, min: 1, max: 1 },
          { id: "frag_r7_phapbao", rate: 0.02, min: 1, max: 1 },
    ],
  },
  huyet_ma_phan_than: {
    nameKey: "mon_huyet_ma_phan_than", hp: 15000, atk: 1400, def: 400, exp: 6000,
    img: null, fb: "#5a0a0a", loai: "ma", boss: true, cg: 30,
    drops: [
      { id: "yaodan5", rate: 0.6, min: 1, max: 2 },
      { id: "trung_thien", rate: 0.1, min: 1, max: 1 },
      { id: "manual_boss_huyetma", rate: 0.08, eliteRate: 0.15, min: 1, max: 1 },
          { id: "frag_r7_vukhi", rate: 0.02, min: 1, max: 1 },
          { id: "frag_r7_giap", rate: 0.02, min: 1, max: 1 },
          { id: "frag_r7_phapbao", rate: 0.02, min: 1, max: 1 },
    ],
  },
};
/* ============================================================
 * BẢN ĐỒ — 3 map Luyện Khí
 * gates: {to: mapId đích, x, y} — vị trí cổng trên map hiện tại
 * unlock: null = vào được ngay; {realm, tier} = cần cảnh giới tối thiểu
 * stoneDrop: [min, max] Linh Thạch rớt từ quái map này
 * ============================================================ */
const MAPS = [
  {
    id: 0,
    nameKey: "map_thanh_van_tran",
    bg: "assets/maps/map_thanh_van_tran.webp",
    ground: "assets/map/tile_thanh_van_tran.webp",
    loadingBg: "assets/maps/loading_0.webp",
    fb: "#b9d3a0",
    dao: "chinh",
    monsters: ["da_tru", "son_ke", "son_tac"],
    boss: "da_tru_vuong",
    spawnZones: [
      { x: 530, y: 980, r: 110, monsters: ["da_tru", "son_ke", "son_tac"] },
    ],
    bossSpawn: { x: 1400, y: 1060 },
    npcs: ["dai_phu", "van_tien_cac", "truong_lao", "tam_tien_bi_tich", "truong_tran", "lao_ren", "thuong_nhan", "tieu_nhi", "su_gia_kiem", "su_gia_phap", "su_gia_the", "tuan_thu_su", "lao_dan_duong", "thu_thap_nhan", "su_gia_duoc", "su_gia_thu", "minh_chu", "thuong_nhan_du_hanh", "su_gia_ma", "truong_lang", "co_tran_tu", "to_uyen_nhi", "diep_van", "dan_lang_1", "dan_lang_2", "dan_lang_3"],
    quests: ["q_story_01", "q_story_02", "q_story_03", "q_story_04", "q_story_05", "q_story_10", "q_story_21", "q_story_22", "q_story_23", "q_story_24", "q_story_25", "q_story_26", "q_story_27"],
    gates: [{to: 1, x: 720, y: 80}, {to: 3, x: 80, y: 500}, {to: 4, x: 1500, y: 80}, {to: 5, x: 80, y: 1000}, {to: 6, x: 400, y: 1120}, {to: 7, x: 800, y: 1120}, {to: 8, x: 1200, y: 1120}, {to: 9, x: 1500, y: 1000}, {to: 10, x: 1500, y: 800}, {to: 11, x: 1500, y: 450}, {to: 12, x: 1500, y: 300}, {to: 14, x: 800, y: 80}, {to: 15, x: 1500, y: 150}, {to: 20, x: 80, y: 200}, {to: 28, x: 1470, y: 350}, {to: 42, x: 1200, y: 80}, {to: 43, x: 80, y: 80}],
    objects: [
      {x: 1090, y: 200, sprite: "assets/objects/vo_duong.png", w: 350, h: 280},
      {x: 1330, y: 180, sprite: "assets/objects/thang_ngoc.png", w: 160, h: 220, solid: false},
      {x: 500, y: 560, sprite: "assets/objects/quan_tro.png", w: 320, h: 280},
      {x: 830, y: 360, sprite: "assets/objects/y_quan.png", w: 280, h: 240},
      {x: 830, y: 660, sprite: "assets/objects/pho_cho.png", w: 400, h: 200, solid: false},
      {x: 1090, y: 860, sprite: "assets/objects/tiem_ren2.png", w: 350, h: 280},
      {x: 1360, y: 620, sprite: "assets/objects/ben_thuyen.png", w: 320, h: 240, solid: false},
      {x: 260, y: 1000, sprite: "assets/objects/cong_tran.png", w: 300, h: 200, solid: false},
      {x: 260, y: 720, sprite: "assets/objects/tang_thu_cac_tran.png", w: 250, h: 300},
      {x: 800, y: 980, sprite: "assets/objects/thuong_diem.png", w: 280, h: 240},
      {x: 1320, y: 950, sprite: "assets/objects/linh_dien_ruong.png", w: 340, h: 200, solid: false},
      {x: 620, y: 800, sprite: "assets/objects/board_quest.png", w: 72, h: 90},
      {x: 140, y: 300, sprite: "assets/objects/tree_tall.png", w: 110, h: 150},
      {x: 180, y: 380, sprite: "assets/objects/tree_round.png", w: 120, h: 130},
      {x: 1500, y: 1150, sprite: "assets/objects/tree_round.png", w: 120, h: 130},
      {x: 480, y: 1080, sprite: "assets/objects/fence_lamp.png", w: 82, h: 100},
      {x: 700, y: 850, sprite: "assets/objects/well_stone.png", w: 109, h: 100}
    ],
    paths: [
      {x1: 260, y1: 1080, x2: 260, y2: 600, tile: "path_stone"},
      {x1: 260, y1: 800, x2: 660, y2: 800, tile: "path_stone"},
      {x1: 500, y1: 800, x2: 500, y2: 700, tile: "path_stone"},
      {x1: 830, y1: 800, x2: 830, y2: 480, tile: "path_stone"},
      {x1: 830, y1: 480, x2: 1090, y2: 340, tile: "path_stone"},
      {x1: 1090, y1: 200, x2: 1330, y2: 180, tile: "path_stone"},
      {x1: 830, y1: 800, x2: 1090, y2: 860, tile: "path_stone"},
      {x1: 1090, y1: 860, x2: 1360, y2: 740, tile: "path_stone"},
      {x1: 660, y1: 920, x2: 800, y2: 920, tile: "path_stone"},
      {x1: 940, y1: 950, x2: 1150, y2: 950, tile: "path_stone"}
    ],
    stoneDrop: [2, 5],
    unlock: null,
  },
  {
    id: 1,
    nameKey: "map_hac_phong_lam",
    bg: "assets/maps/map_hac_phong_lam.webp",
    ground: "assets/map/tile_ground_forest.png",
    loadingBg: "assets/maps/loading_1.webp",
    fb: "#5f7d5a",
    dao: "chinh",
    monsters: ["phong_lang", "hu_thi", "u_hon_lang"],
    boss: "lang_vuong",
    spawnZones: [
      { x: 825, y: 565, r: 250, monsters: ["phong_lang", "hu_thi", "u_hon_lang"] },
    ],
    bossSpawn: { x: 1150, y: 180 },
    npcs: ["tho_san", "an_sy"],
    quests: [],
    gates: [{to: 0, x: 80, y: 80}, {to: 2, x: 720, y: 540}],
    objects: [
      {x: 180, y: 200, sprite: "assets/objects/tree_ancient_wide.png", w: 75, h: 150},
      {x: 550, y: 180, sprite: "assets/objects/tree_round.png", w: 102, h: 140},
      {x: 1350, y: 180, sprite: "assets/objects/tree_tall.png", w: 168, h: 150},
      {x: 1500, y: 520, sprite: "assets/objects/tree_windswept.png", w: 124, h: 140},
      {x: 180, y: 1020, sprite: "assets/objects/tree_jade_short.png", w: 96, h: 130},
      {x: 950, y: 620, sprite: "assets/objects/bush_dense.png", w: 65, h: 80},
      {x: 1300, y: 970, sprite: "assets/objects/bush_spread.png", w: 68, h: 80},
      {x: 600, y: 1070, sprite: "assets/objects/tree_round.png", w: 102, h: 140},
      {x: 850, y: 720, sprite: "assets/objects/campfire_1.png", w: 53, h: 80},
      {x: 1050, y: 1070, sprite: "assets/objects/lake_rest.png", w: 124, h: 90},
      {x: 1140, y: 1100, sprite: "assets/objects/reed.png", w: 34, h: 90},
      {x: 1420, y: 1120, sprite: "assets/objects/bush_dense.png", w: 65, h: 80}
    ],
    stoneDrop: [4, 9],
    unlock: {realm: 1, tier: 3},
  },
  {
    id: 2,
    nameKey: "map_u_minh_coc",
    bg: "assets/maps/map_u_minh_coc.webp",
    ground: "assets/map/tile_ground_nether.png",
    loadingBg: "assets/maps/loading_2.webp",
    fb: "#3a3f5c",
    dao: "chinh",
    monsters: ["u_hon", "thi_ma"],
    boss: "cot_tuong",
    spawnZones: [
      { x: 966, y: 600, r: 250, monsters: ["u_hon", "thi_ma"] },
    ],
    bossSpawn: { x: 1300, y: 300 },
    npcs: [],
    quests: [],
    gates: [{to: 1, x: 80, y: 540}, {to: 11, x: 1500, y: 540}],
    stoneDrop: [7, 14],
    unlock: {realm: 1, tier: 5},
  },
  {
    id: 3,
    safe: true,
    nameKey: "map_linh_dien",
    bg: "assets/maps/map_linh_dien.webp",
    ground: "assets/map/tile_ground_farm.png",
    loadingBg: "assets/maps/loading_3.webp",
    fb: "#7a9a5a",
    dao: "chinh",
    monsters: [],
    boss: null,
    npcs: ["lao_nong_dan"],
    quests: ["q_pet_intro"],
    gates: [{to: 0, x: 720, y: 500}],
    stoneDrop: [0, 0],
    unlock: null,
  },
  {
    id: 4,
    nameKey: "map_mo_linh_thach",
    bg: "assets/maps/map_mo_linh_thach.webp",
    ground: "assets/map/tile_ground_mine.png",
    loadingBg: "assets/maps/loading_4.webp",
    fb: "#4a5a6a",
    dao: "chinh",
    monsters: ["thach_giap_trung", "tinh_thach_quai"],
    boss: null,
    spawnZones: [
      { x: 800, y: 706, r: 250, monsters: ["thach_giap_trung", "tinh_thach_quai"] },
    ],
    npcs: ["quan_mo", "thuong_nhan_mo"],
    quests: [],
    gates: [{to: 0, x: 80, y: 80}, {to: 41, x: 1500, y: 600}],
    objects: [
      {x: 200, y: 520, sprite: "assets/objects/cart_ore.png", w: 88, h: 90},
      {x: 290, y: 570, sprite: "assets/objects/barrel_wood.png", w: 92, h: 80},
      {x: 460, y: 520, sprite: "assets/objects/pickaxe.png", w: 42, h: 80},
      {x: 620, y: 420, sprite: "assets/objects/ore_pile.png", w: 46, h: 80},
      {x: 200, y: 920, sprite: "assets/objects/lamp_mine.png", w: 107, h: 90},
      {x: 920, y: 320, sprite: "assets/objects/crystal_blue.png", w: 58, h: 100},
      {x: 1020, y: 370, sprite: "assets/objects/crystal_green.png", w: 50, h: 100},
      {x: 1120, y: 320, sprite: "assets/objects/crystal_purple.png", w: 36, h: 100},
      {x: 720, y: 620, sprite: "assets/objects/crystal_ice.png", w: 61, h: 100},
      {x: 1420, y: 620, sprite: "assets/objects/crystal_red.png", w: 59, h: 100},
            {x: 520, y: 1020, sprite: "assets/objects/rock_gold.png", w: 96, h: 80},
      {x: 1120, y: 1020, sprite: "assets/objects/rock_big.png", w: 55, h: 90},
      {x: 300, y: 300, sprite: "assets/objects/fence_field.png", w: 120, h: 60},
      {x: 430, y: 300, sprite: "assets/objects/fence_field.png", w: 120, h: 60},
      {x: 560, y: 300, sprite: "assets/objects/fence_field.png", w: 120, h: 60},
      {x: 1300, y: 400, sprite: "assets/objects/well_field.png", w: 90, h: 110},
      {x: 1400, y: 800, sprite: "assets/objects/scarecrow_field.png", w: 80, h: 120},
      {x: 200, y: 800, sprite: "assets/objects/scarecrow_field.png", w: 80, h: 120}
    ],
    stoneDrop: [8, 16],
    unlock: {realm: 1, tier: 5},
  },
  {
    id: 5,
    safe: true,
    nameKey: "map_kiem_tong",
    bg: "assets/maps/map_kiem_tong.webp",
    ground: "assets/map/tile_ground_sect.png",
    loadingBg: "assets/maps/loading_5.webp",
    fb: "#8a9ab0",
    dao: "chinh",
    monsters: [],
    boss: null,
    npcs: ["truong_lao_kiem", "de_tu_kiem_1", "de_tu_kiem_2", "ren_su_kiem"],
    quests: [],
    gates: [{to: 0, x: 80, y: 1000}, {to: 28, x: 1500, y: 200}, {to: 43, x: 800, y: 80}],
    stoneDrop: [0, 0],
    unlock: {realm: 2},
  },
  {
    id: 6,
    safe: true,
    nameKey: "map_thien_phap_tong",
    bg: "assets/maps/map_thien_phap_tong.webp",
    ground: "assets/map/tile_ground_sect.png",
    loadingBg: "assets/maps/loading_6.webp",
    fb: "#a0b8d8",
    dao: "chinh",
    monsters: [],
    boss: null,
    npcs: ["truong_lao_phap", "de_tu_phap_1", "de_tu_phap_2", "phu_su"],
    quests: [],
    gates: [{to: 0, x: 400, y: 1120}, {to: 28, x: 1200, y: 100}],
    stoneDrop: [0, 0],
    unlock: {realm: 2},
  },
  {
    id: 7,
    safe: true,
    nameKey: "map_kim_cang_tong",
    bg: "assets/maps/map_kim_cang_tong.webp",
    ground: "assets/map/tile_ground_sect.png",
    loadingBg: "assets/maps/loading_7.webp",
    fb: "#c8a860",
    dao: "chinh",
    monsters: [],
    boss: null,
    npcs: ["truong_lao_the", "de_tu_the_1", "de_tu_the_2", "vo_tang"],
    quests: [],
    gates: [{to: 0, x: 800, y: 1120}, {to: 28, x: 800, y: 100}],
    stoneDrop: [0, 0],
    unlock: {realm: 2},
  },
  {
    id: 8,
    safe: true,
    nameKey: "map_duoc_vuong_tong",
    bg: "assets/maps/map_duoc_vuong_tong.webp",
    ground: "assets/map/tile_ground_sect.png",
    loadingBg: "assets/maps/loading_8.webp",
    fb: "#7aa86a",
    dao: "chinh",
    monsters: [],
    boss: null,
    npcs: ["truong_lao_duoc", "de_tu_duoc_1", "de_tu_duoc_2", "dan_su"],
    quests: [],
    gates: [{to: 0, x: 1200, y: 1120}, {to: 28, x: 400, y: 100}],
    stoneDrop: [0, 0],
    unlock: {realm: 2},
  },
  {
    id: 9,
    safe: true,
    nameKey: "map_ngu_thu_tong",
    bg: "assets/maps/map_ngu_thu_tong.webp",
    ground: "assets/map/tile_ground_sect.png",
    loadingBg: "assets/maps/loading_9.webp",
    fb: "#6a9a7a",
    dao: "chinh",
    monsters: [],
    boss: null,
    npcs: ["truong_lao_thu", "de_tu_thu_1", "de_tu_thu_2", "tuan_thu_phan_da"],
    quests: [],
    gates: [{to: 0, x: 1500, y: 1000}, {to: 28, x: 100, y: 200}],
    stoneDrop: [0, 0],
    unlock: {realm: 2},
  },
  {
    id: 10,
    safe: true,
    nameKey: "map_cuu_u_ma_tong",
    bg: "assets/maps/map_cuu_u_ma_tong.webp",
    ground: "assets/map/tile_ground_blood.png",
    loadingBg: "assets/maps/loading_10.webp",
    fb: "#3a2a4a",
    dao: "ma",
    monsters: [],
    boss: null,
    npcs: ["truong_lao_ma", "de_tu_ma_1", "de_tu_ma_2", "ma_luyen_su", "u_minh_ton_gia", "mac_vo_tam"],
    quests: [],
    gates: [{to: 0, x: 1500, y: 600}, {to: 28, x: 100, y: 1000}, {to: 29, x: 800, y: 80}],
    stoneDrop: [0, 0],
    unlock: {realm: 2},
  },
  {
    id: 11,
    nameKey: "map_huyet_ma_vuc",
    bg: "assets/maps/map_huyet_ma_vuc.webp",
    ground: "assets/map/tile_ground_blood.png",
    loadingBg: "assets/maps/loading_11.webp",
    fb: "#5a1a1a",
    dao: "ma",
    monsters: ["ma_binh", "oan_linh", "ma_lang"],
    boss: "huyet_ma_vuong",
    spawnZones: [
      { x: 785, y: 640, r: 250, monsters: ["ma_binh", "oan_linh", "ma_lang", "am_anh_thu", "thien_ma", "huyet_ma_phan_than"] },
    ],
    bossSpawn: { x: 1300, y: 950 },
    npcs: ["ma_thuong_nhan", "co_hon", "huyet_ma_tu"],
    quests: ["q_ma_kill10", "q_ma_boss"],
    gates: [{to: 2, x: 80, y: 540}],
    stoneDrop: [10, 20],
    unlock: {realm: 2},
  },
  {
    id: 12,
    nameKey: "map_thai_hu_tien_canh",
    bg: "assets/maps/map_thai_hu_tien_canh.webp",
    ground: "assets/map/tile_ground_celestial.png",
    loadingBg: "assets/maps/loading_12.webp",
    fb: "#bfe0f0",
    dao: "chinh",
    monsters: ["ngoc_tho", "thien_hac"],
    boss: "thien_tuong",
    spawnZones: [
      { x: 725, y: 517, r: 250, monsters: ["ngoc_tho", "thien_hac", "huyet_buc"] },
    ],
    bossSpawn: { x: 1200, y: 250 },
    npcs: ["tien_ong"],
    quests: [],
    gates: [{to: 0, x: 80, y: 300}, {to: 13, x: 1500, y: 540}],
    stoneDrop: [12, 24],
    unlock: {realm: 2},
  },
  {
    id: 13,
    nameKey: "map_thong_thien_gioi",
    bg: "assets/maps/map_thai_hu_tien_canh.webp",
    ground: "assets/map/tile_ground_celestial.png",
    loadingBg: "assets/maps/loading_12.webp",
    fb: "#cfe8ff",
    dao: "chinh",
    monsters: ["thien_hac", "ngoc_tho", "u_hon_lang"],
    boss: "thien_tuong",
    spawnZones: [
      { x: 783, y: 625, r: 250, monsters: ["thien_hac", "ngoc_tho", "u_hon_lang", "huyet_buc", "hon_don_thu", "u_minh_cu_mang", "cuu_kiep_loi_thu", "hac_long"] },
    ],
    bossSpawn: { x: 1200, y: 950 },
    npcs: [],
    quests: [],
    gates: [{to: 12, x: 80, y: 540}],
    stoneDrop: [30, 60],
    unlock: {realm: 4},
    expMult: 2,
  },
  {
    id: 14,
    safe: true,
    nameKey: "map_dai_dien_tong_mon",
    bg: "assets/maps/map_dai_dien_tong_mon.webp",
    loadingBg: "assets/maps/loading_0.webp",
    fb: "#d4c49a",
    dao: "chinh",
    monsters: [],
    boss: null,
    spawnZones: [],
    bossSpawn: null,
    npcs: ["tiep_dan_su", "truong_lao_truyen_cong"],
    quests: ["q_story_c01"],
    gates: [{to: 0, x: 800, y: 1150}, {to: 43, x: 800, y: 80}],
    stoneDrop: [0, 0],
    unlock: null,
  },
  /* ============ THẬP VẠN ĐẠI SƠN (Bui 2026-10-22) ============
   * Khu vực gồm 5 map nhỏ đi sâu dần vào núi, quái chia theo cảnh giới.
   * Mỗi map: quái tụ 1 khu duy nhất. Gates nối tiếp 15→16→17→18→19. */
  {
    id: 15,
    nameKey: "map_thap_van_ngoai_vi",
    bg: "assets/maps/map_thap_van_dai_son_ngoai_vi.webp",
    ground: "assets/map/tile_ground_forest.png",
    loadingBg: "assets/maps/loading_15",
    fb: "#8a9a7a",
    dao: "chinh",
    monsters: ["da_tru", "son_ke", "son_tac"],
    boss: "da_tru_vuong",
    spawnZones: [
      { x: 800, y: 600, r: 250, monsters: ["da_tru", "son_ke", "son_tac"] },
    ],
    bossSpawn: { x: 1200, y: 300 },
    npcs: ["tho_san", "an_sy"],
    quests: [],
    gates: [{to: 0, x: 80, y: 600}, {to: 16, x: 1500, y: 600}],
    stoneDrop: [5, 10],
    unlock: {realm: 1},
    objects: [
      {x: 200, y: 250, sprite: "assets/objects/tree_windswept.png", w: 100, h: 120},
      {x: 420, y: 180, sprite: "assets/objects/tree_tall.png", w: 80, h: 140},
      {x: 650, y: 220, sprite: "assets/objects/tree_round.png", w: 90, h: 100},
      {x: 1050, y: 180, sprite: "assets/objects/tree_tall.png", w: 80, h: 140},
      {x: 1300, y: 220, sprite: "assets/objects/tree_windswept.png", w: 100, h: 120},
      {x: 1480, y: 350, sprite: "assets/objects/tree_round.png", w: 90, h: 100},
      {x: 150, y: 400, sprite: "assets/objects/house_wood.png", w: 110, h: 130},
      {x: 320, y: 520, sprite: "assets/objects/fence_horizontal.png", w: 69, h: 60},
      {x: 420, y: 520, sprite: "assets/objects/fence_horizontal.png", w: 69, h: 60},
      {x: 250, y: 660, sprite: "assets/objects/campfire_1.png", w: 70, h: 60},
      {x: 180, y: 820, sprite: "assets/objects/well_stone.png", w: 109, h: 100},
      {x: 350, y: 900, sprite: "assets/objects/logs_pile.png", w: 76, h: 90},
      {x: 550, y: 980, sprite: "assets/objects/bush_dense.png", w: 70, h: 50},
      {x: 950, y: 950, sprite: "assets/objects/tree_windswept.png", w: 100, h: 120},
      {x: 1150, y: 980, sprite: "assets/objects/bush_spread.png", w: 80, h: 50},
      {x: 1380, y: 900, sprite: "assets/objects/rock_big.png", w: 90, h: 70},
      {x: 1480, y: 760, sprite: "assets/objects/board_quest.png", w: 72, h: 90},
      {x: 1250, y: 850, sprite: "assets/objects/barrel_wood.png", w: 60, h: 70},
      {x: 750, y: 1050, sprite: "assets/objects/fence_lamp.png", w: 82, h: 100},
      {x: 1050, y: 1080, sprite: "assets/objects/crops_mixed.png", w: 80, h: 60},
      {x: 130, y: 1050, sprite: "assets/objects/scarecrow.png", w: 110, h: 100},
      {x: 450, y: 1080, sprite: "assets/objects/mushroom_glow.png", w: 50, h: 50},
      {x: 200, y: 150, sprite: "assets/objects/bush_dense.png", w: 70, h: 50},
      {x: 900, y: 120, sprite: "assets/objects/herb_green.png", w: 50, h: 40},
    ],
  },
  {
    id: 16,
    nameKey: "map_thap_van_trung_bo",
    bg: "assets/maps/map_thap_van_dai_son_trung_bo.webp",
    ground: "assets/map/tile_ground_forest.png",
    loadingBg: "assets/maps/loading_16",
    fb: "#7a8a6a",
    dao: "chinh",
    monsters: ["phong_lang", "hu_thi", "thach_giap_trung"],
    boss: "lang_vuong",
    spawnZones: [
      { x: 800, y: 600, r: 250, monsters: ["phong_lang", "hu_thi", "thach_giap_trung"] },
    ],
    bossSpawn: { x: 1200, y: 300 },
    npcs: ["tuan_thu_su"],
    quests: [],
    gates: [{to: 15, x: 80, y: 600}, {to: 17, x: 1500, y: 600}],
    stoneDrop: [8, 16],
    unlock: {realm: 2},
    objects: [
      {x: 250, y: 200, sprite: "assets/objects/rock_big.png", w: 110, h: 85},
      {x: 500, y: 150, sprite: "assets/objects/tree_ancient_wide.png", w: 140, h: 120},
      {x: 750, y: 180, sprite: "assets/objects/lamp_mine.png", w: 60, h: 80},
      {x: 1000, y: 150, sprite: "assets/objects/rock_gold.png", w: 70, h: 60},
      {x: 1250, y: 200, sprite: "assets/objects/tree_windswept.png", w: 100, h: 120},
      {x: 1450, y: 320, sprite: "assets/objects/bush_dense.png", w: 70, h: 50},
      {x: 200, y: 420, sprite: "assets/objects/lake_rest.png", w: 120, h: 80},
      {x: 400, y: 480, sprite: "assets/objects/reed.png", w: 60, h: 70},
      {x: 1400, y: 480, sprite: "assets/objects/tablet_stone.png", w: 60, h: 80},
      {x: 250, y: 880, sprite: "assets/objects/mushroom_glow.png", w: 50, h: 50},
      {x: 400, y: 1000, sprite: "assets/objects/rock_big.png", w: 90, h: 70},
      {x: 850, y: 1050, sprite: "assets/objects/brazier_fire.png", w: 60, h: 80},
      {x: 1100, y: 1000, sprite: "assets/objects/ore_pile.png", w: 80, h: 60},
      {x: 1300, y: 950, sprite: "assets/objects/tree_windswept.png", w: 100, h: 120},
      {x: 1480, y: 850, sprite: "assets/objects/crystal_green.png", w: 70, h: 80},
      {x: 150, y: 1000, sprite: "assets/objects/bush_spread.png", w: 80, h: 50},
      {x: 700, y: 150, sprite: "assets/objects/plant_blue.png", w: 60, h: 60},
      {x: 1000, y: 280, sprite: "assets/objects/herb_green.png", w: 50, h: 40},
      {x: 350, y: 250, sprite: "assets/objects/rock_big.png", w: 80, h: 65},
      {x: 1150, y: 120, sprite: "assets/objects/lamp_mine.png", w: 60, h: 80},
      {x: 1350, y: 650, sprite: "assets/objects/mushroom_glow.png", w: 50, h: 50},
      {x: 180, y: 700, sprite: "assets/objects/bush_dense.png", w: 70, h: 50},
    ],
  },
  {
    id: 17,
    nameKey: "map_thap_van_noi_vi",
    bg: "assets/maps/map_thap_van_dai_son_noi_vi.webp",
    ground: "assets/map/tile_ground_nether.png",
    loadingBg: "assets/maps/loading_17",
    fb: "#6a7a6a",
    dao: "chinh",
    monsters: ["tinh_thach_quai", "u_hon", "thi_ma"],
    boss: "huyet_y_mon_chu",
    spawnZones: [
      { x: 800, y: 600, r: 250, monsters: ["tinh_thach_quai", "u_hon", "thi_ma"] },
    ],
    bossSpawn: { x: 1200, y: 300 },
    npcs: ["an_sy"],
    quests: [],
    gates: [{to: 16, x: 80, y: 600}, {to: 18, x: 1500, y: 600}],
    stoneDrop: [12, 24],
    unlock: {realm: 3},
    objects: [
      {x: 200, y: 180, sprite: "assets/objects/tree_windswept.png", w: 100, h: 120},
      {x: 450, y: 150, sprite: "assets/objects/crystal_ice.png", w: 80, h: 90},
      {x: 700, y: 180, sprite: "assets/objects/rock_big.png", w: 110, h: 85},
      {x: 950, y: 150, sprite: "assets/objects/tablet_stone.png", w: 70, h: 90},
      {x: 1300, y: 180, sprite: "assets/objects/crystal_blue.png", w: 80, h: 90},
      {x: 1480, y: 300, sprite: "assets/objects/tree_windswept.png", w: 100, h: 120},
      {x: 180, y: 450, sprite: "assets/objects/relief_dragon.png", w: 90, h: 70},
      {x: 1450, y: 450, sprite: "assets/objects/statue_dragon.png", w: 80, h: 100},
      {x: 200, y: 880, sprite: "assets/objects/crystal_ice.png", w: 70, h: 80},
      {x: 400, y: 1000, sprite: "assets/objects/rock_big.png", w: 90, h: 70},
      {x: 700, y: 1050, sprite: "assets/objects/bush_spread.png", w: 80, h: 50},
      {x: 950, y: 1020, sprite: "assets/objects/crystal_blue.png", w: 70, h: 80},
      {x: 1200, y: 1000, sprite: "assets/objects/tree_windswept.png", w: 100, h: 120},
      {x: 1400, y: 900, sprite: "assets/objects/rock_gold.png", w: 70, h: 60},
      {x: 150, y: 1050, sprite: "assets/objects/mushroom_glow.png", w: 50, h: 50},
      {x: 550, y: 350, sprite: "assets/objects/rock_big.png", w: 80, h: 65},
      {x: 1050, y: 300, sprite: "assets/objects/crystal_ice.png", w: 60, h: 70},
      {x: 300, y: 650, sprite: "assets/objects/bush_spread.png", w: 70, h: 45},
      {x: 1350, y: 650, sprite: "assets/objects/mushroom_glow.png", w: 50, h: 50},
      {x: 850, y: 120, sprite: "assets/objects/statue_dragon.png", w: 70, h: 90},
      {x: 1250, y: 120, sprite: "assets/objects/rock_big.png", w: 80, h: 65},
      {x: 100, y: 250, sprite: "assets/objects/crystal_blue.png", w: 60, h: 70},
    ],
  },
  {
    id: 18,
    nameKey: "map_thap_van_hach_tam",
    bg: "assets/maps/map_thap_van_dai_son_hach_tam.webp",
    ground: "assets/map/tile_ground_nether.png",
    loadingBg: "assets/maps/loading_18",
    fb: "#5a6a5a",
    dao: "chinh",
    monsters: ["am_anh_thu", "huyet_buc", "thien_hac"],
    boss: "u_minh_cu_mang",
    spawnZones: [
      { x: 800, y: 600, r: 250, monsters: ["am_anh_thu", "huyet_buc", "thien_hac"] },
    ],
    bossSpawn: { x: 1200, y: 300 },
    npcs: ["co_hon"],
    quests: [],
    gates: [{to: 17, x: 80, y: 600}, {to: 19, x: 1500, y: 600}],
    stoneDrop: [20, 40],
    unlock: {realm: 4},
    objects: [
      {x: 200, y: 180, sprite: "assets/objects/rock_big.png", w: 110, h: 85},
      {x: 450, y: 150, sprite: "assets/objects/crystal_purple.png", w: 80, h: 90},
      {x: 700, y: 180, sprite: "assets/objects/tablet_stone.png", w: 70, h: 90},
      {x: 950, y: 150, sprite: "assets/objects/crystal_red.png", w: 80, h: 90},
      {x: 1250, y: 180, sprite: "assets/objects/rock_big.png", w: 100, h: 80},
      {x: 1480, y: 320, sprite: "assets/objects/statue_dragon.png", w: 80, h: 100},
      {x: 180, y: 450, sprite: "assets/objects/relief_dragon.png", w: 90, h: 70},
      {x: 1450, y: 470, sprite: "assets/objects/brazier_fire.png", w: 60, h: 80},
      {x: 200, y: 880, sprite: "assets/objects/crystal_purple.png", w: 70, h: 80},
      {x: 400, y: 1000, sprite: "assets/objects/rock_big.png", w: 90, h: 70},
      {x: 650, y: 1050, sprite: "assets/objects/ore_pile.png", w: 80, h: 60},
      {x: 950, y: 1020, sprite: "assets/objects/crystal_red.png", w: 70, h: 80},
      {x: 1200, y: 1000, sprite: "assets/objects/rock_big.png", w: 100, h: 80},
      {x: 1400, y: 900, sprite: "assets/objects/lamp_mine.png", w: 60, h: 80},
      {x: 150, y: 1050, sprite: "assets/objects/mushroom_glow.png", w: 50, h: 50},
      {x: 550, y: 350, sprite: "assets/objects/rock_gold.png", w: 70, h: 60},
      {x: 1050, y: 320, sprite: "assets/objects/crystal_purple.png", w: 60, h: 70},
      {x: 300, y: 680, sprite: "assets/objects/tablet_stone.png", w: 60, h: 80},
      {x: 1350, y: 680, sprite: "assets/objects/mushroom_glow.png", w: 50, h: 50},
      {x: 850, y: 120, sprite: "assets/objects/relief_dragon.png", w: 90, h: 70},
      {x: 1150, y: 120, sprite: "assets/objects/crystal_red.png", w: 60, h: 70},
      {x: 100, y: 250, sprite: "assets/objects/rock_big.png", w: 80, h: 65},
    ],
  },
  {
    id: 19,
    nameKey: "map_dinh_thap_van",
    bg: "assets/maps/map_thap_van_dai_son_dinh.webp",
    ground: "assets/map/tile_ground_celestial.png",
    loadingBg: "assets/maps/loading_19",
    fb: "#4a5a6a",
    dao: "chinh",
    monsters: ["ma_lang", "oan_linh"],
    boss: "hac_long",
    spawnZones: [
      { x: 800, y: 600, r: 250, monsters: ["ma_lang", "oan_linh"] },
    ],
    bossSpawn: { x: 800, y: 250 },
    npcs: [],
    quests: [],
    gates: [{to: 18, x: 800, y: 1100}],
    stoneDrop: [30, 60],
    unlock: {realm: 4},
    expMult: 1.5,
    objects: [
      {x: 200, y: 180, sprite: "assets/objects/statue_dragon.png", w: 100, h: 120},
      {x: 1400, y: 180, sprite: "assets/objects/statue_dragon.png", w: 100, h: 120},
      {x: 450, y: 150, sprite: "assets/objects/banner_lantern.png", w: 70, h: 90},
      {x: 1150, y: 150, sprite: "assets/objects/banner_lantern.png", w: 70, h: 90},
      {x: 650, y: 120, sprite: "assets/objects/rock_gold.png", w: 80, h: 65},
      {x: 950, y: 120, sprite: "assets/objects/rock_gold.png", w: 80, h: 65},
      {x: 150, y: 450, sprite: "assets/objects/tree_red.png", w: 90, h: 110},
      {x: 1450, y: 450, sprite: "assets/objects/tree_red.png", w: 90, h: 110},
      {x: 300, y: 700, sprite: "assets/objects/brazier_fire.png", w: 60, h: 80},
      {x: 1300, y: 700, sprite: "assets/objects/brazier_fire.png", w: 60, h: 80},
      {x: 200, y: 950, sprite: "assets/objects/lotus_red.png", w: 70, h: 60},
      {x: 1400, y: 950, sprite: "assets/objects/lake_rest.png", w: 120, h: 80},
      {x: 500, y: 1000, sprite: "assets/objects/tablet_stone.png", w: 70, h: 90},
      {x: 1100, y: 1000, sprite: "assets/objects/relief_dragon.png", w: 90, h: 70},
      {x: 150, y: 800, sprite: "assets/objects/crystal_ice.png", w: 60, h: 70},
      {x: 1450, y: 800, sprite: "assets/objects/crystal_blue.png", w: 60, h: 70},
      {x: 400, y: 350, sprite: "assets/objects/banner_lantern.png", w: 60, h: 80},
      {x: 1200, y: 350, sprite: "assets/objects/banner_lantern.png", w: 60, h: 80},
      {x: 600, y: 920, sprite: "assets/objects/rock_gold.png", w: 70, h: 60},
      {x: 1000, y: 920, sprite: "assets/objects/rock_gold.png", w: 70, h: 60},
      {x: 100, y: 1100, sprite: "assets/objects/tree_red.png", w: 80, h: 100},
      {x: 1500, y: 1100, sprite: "assets/objects/tree_red.png", w: 80, h: 100},
    ],
  },
  {
    id: 20,
    safe: true,
    nameKey: "map_tong_cong",
    bg: "assets/maps/map_tong_cong.webp",
    ground: "assets/map/tile_ground_sect.png",
    loadingBg: "assets/maps/loading_20.webp",
    fb: "#8a9ab0",
    dao: "chinh",
    monsters: [],
    boss: null,
    npcs: ["truong_lao", "de_tu_kiem_1"],
    quests: [],
    gates: [{to: 0, x: 80, y: 600}, {to: 21, x: 1500, y: 600}],
    paths: [
      {x1: 80, y1: 600, x2: 1500, y2: 600, tile: "path_stone"},
    ],
    stoneDrop: [0, 0],
    unlock: {sect: true},
    objects: [
      {x: 300, y: 300, sprite: "assets/objects/tablet_stone.png", w: 80, h: 100},
      {x: 1300, y: 300, sprite: "assets/objects/tablet_stone.png", w: 80, h: 100},
      {x: 800, y: 200, sprite: "assets/objects/statue_dragon.png", w: 100, h: 140},
      {x: 200, y: 800, sprite: "assets/objects/fence_lamp.png", w: 82, h: 100},
      {x: 1400, y: 800, sprite: "assets/objects/fence_lamp.png", w: 82, h: 100},
      {x: 500, y: 900, sprite: "assets/objects/tree_tall.png", w: 80, h: 140},
      {x: 1100, y: 900, sprite: "assets/objects/tree_tall.png", w: 80, h: 140},
      {x: 800, y: 1000, sprite: "assets/objects/banner_lantern.png", w: 70, h: 90},
      {x: 400, y: 500, sprite: "assets/objects/bush_dense.png", w: 70, h: 50},
      {x: 1200, y: 500, sprite: "assets/objects/bush_dense.png", w: 70, h: 50},
      {x: 650, y: 700, sprite: "assets/objects/rock_big.png", w: 90, h: 70},
      {x: 950, y: 700, sprite: "assets/objects/rock_big.png", w: 90, h: 70},
      {x: 800, y: 450, sprite: "assets/objects/relief_dragon.png", w: 90, h: 60},
      {x: 150, y: 600, sprite: "assets/objects/fence_horizontal.png", w: 69, h: 60},
      {x: 1450, y: 600, sprite: "assets/objects/fence_horizontal.png", w: 69, h: 60},,
      {x: 800, y: 600, sprite: "assets/objects/cong_tran.png", w: 300, h: 200, w: 400, h: 400, solid: false},
      {x: 800, y: 1080, sprite: "assets/objects/dau_cau_chuong_ngai.png", w: 220, h: 220},
      {x: 1150, y: 950, sprite: "assets/objects/bia_thu_thach.png", w: 180, h: 100}
    ],
  },
  {
    id: 21,
    safe: true,
    nameKey: "map_tong_ngoai_mon",
    bg: "assets/maps/map_tong_ngoai_mon.webp",
    ground: "assets/map/tile_ground_sect.png",
    loadingBg: "assets/maps/loading_21.webp",
    fb: "#8a9ab0",
    dao: "chinh",
    monsters: [],
    boss: null,
    npcs: ["de_tu_kiem_1", "de_tu_kiem_2", "tiep_dan_su"],
    quests: [],
    gates: [{to: 20, x: 80, y: 600}, {to: 22, x: 800, y: 80}, {to: 23, x: 1500, y: 300}, {to: 24, x: 1500, y: 600}, {to: 25, x: 1500, y: 900}, {to: 26, x: 800, y: 1120}, {to: 27, x: 80, y: 900}],
    paths: [
      {x1: 80, y1: 600, x2: 1500, y2: 600, tile: "path_sand"},
      {x1: 800, y1: 80, x2: 800, y2: 1120, tile: "path_sand"},
    ],
    stoneDrop: [0, 0],
    unlock: {sect: true},
    objects: [
      {x: 400, y: 300, sprite: "assets/objects/house_wood.png", w: 110, h: 130},
      {x: 700, y: 300, sprite: "assets/objects/house_wood.png", w: 110, h: 130},
      {x: 1000, y: 300, sprite: "assets/objects/house_wood.png", w: 110, h: 130},
      {x: 200, y: 500, sprite: "assets/objects/well_stone.png", w: 109, h: 100},
      {x: 1400, y: 500, sprite: "assets/objects/well_stone.png", w: 109, h: 100},
      {x: 800, y: 500, sprite: "assets/objects/board_quest.png", w: 72, h: 90},
      {x: 500, y: 700, sprite: "assets/objects/campfire_1.png", w: 70, h: 60},
      {x: 1100, y: 700, sprite: "assets/objects/campfire_1.png", w: 70, h: 60},
      {x: 300, y: 900, sprite: "assets/objects/tree_round.png", w: 90, h: 100},
      {x: 1300, y: 900, sprite: "assets/objects/tree_round.png", w: 90, h: 100},
      {x: 800, y: 900, sprite: "assets/objects/banner_lantern.png", w: 70, h: 90},
      {x: 600, y: 1000, sprite: "assets/objects/bush_spread.png", w: 80, h: 50},
      {x: 1000, y: 1000, sprite: "assets/objects/bush_spread.png", w: 80, h: 50},
      {x: 150, y: 200, sprite: "assets/objects/fence_lamp.png", w: 82, h: 100},
      {x: 1450, y: 200, sprite: "assets/objects/fence_lamp.png", w: 82, h: 100},,
      {x: 1250, y: 1020, sprite: "assets/objects/ngoai_mon_xa.png", w: 400, h: 400},
      {x: 350, y: 140, sprite: "assets/objects/linh_dien_ruong.png", w: 340, h: 200, w: 340, h: 340}
    ],
  },
  {
    id: 22,
    safe: true,
    nameKey: "map_tong_chinh_dien",
    bg: "assets/maps/map_tong_chinh_dien.webp",
    ground: "assets/map/tile_ground_sect.png",
    loadingBg: "assets/maps/loading_22.webp",
    fb: "#9aa0b8",
    dao: "chinh",
    monsters: [],
    boss: null,
    npcs: ["truong_lao", "truong_lao_truyen_cong"],
    quests: [],
    gates: [{to: 21, x: 800, y: 1120}],
    paths: [
      {x1: 800, y1: 1120, x2: 800, y2: 150, tile: "path_jade"},
    ],
    stoneDrop: [0, 0],
    unlock: {sect: true},
    objects: [
      {x: 800, y: 250, sprite: "assets/objects/statue_dragon.png", w: 120, h: 160},
      {x: 500, y: 350, sprite: "assets/objects/statue_dragon.png", w: 100, h: 140},
      {x: 1100, y: 350, sprite: "assets/objects/statue_dragon.png", w: 100, h: 140},
      {x: 300, y: 500, sprite: "assets/objects/brazier_fire.png", w: 70, h: 80},
      {x: 1300, y: 500, sprite: "assets/objects/brazier_fire.png", w: 70, h: 80},
      {x: 800, y: 550, sprite: "assets/objects/relief_dragon.png", w: 120, h: 80},
      {x: 400, y: 700, sprite: "assets/objects/banner_lantern.png", w: 70, h: 90},
      {x: 1200, y: 700, sprite: "assets/objects/banner_lantern.png", w: 70, h: 90},
      {x: 200, y: 800, sprite: "assets/objects/tree_ancient_wide.png", w: 140, h: 120},
      {x: 1400, y: 800, sprite: "assets/objects/tree_ancient_wide.png", w: 140, h: 120},
      {x: 600, y: 950, sprite: "assets/objects/tablet_stone.png", w: 80, h: 100},
      {x: 1000, y: 950, sprite: "assets/objects/tablet_stone.png", w: 80, h: 100},
      {x: 800, y: 800, sprite: "assets/objects/rock_gold.png", w: 80, h: 60},
      {x: 450, y: 900, sprite: "assets/objects/bush_dense.png", w: 70, h: 50},
      {x: 1150, y: 900, sprite: "assets/objects/bush_dense.png", w: 70, h: 50},,
      {x: 800, y: 260, sprite: "assets/objects/dai_dien.png", w: 520, h: 286},
      {x: 800, y: 700, sprite: "assets/objects/thang_ngoc.png", w: 180, h: 360, solid: false},
      {x: 1350, y: 180, sprite: "assets/objects/dao_bay.png", w: 280, h: 140, solid: false}
    ],
  },
  {
    id: 23,
    safe: true,
    nameKey: "map_tong_luyen_dan_lau",
    bg: "assets/maps/map_tong_luyen_dan_lau.webp",
    ground: "assets/map/tile_ground_sect.png",
    loadingBg: "assets/maps/loading_23.webp",
    fb: "#a09080",
    dao: "chinh",
    monsters: [],
    boss: null,
    npcs: ["dan_su"],
    quests: [],
    gates: [{to: 21, x: 80, y: 600}],
    paths: [
      {x1: 80, y1: 600, x2: 1400, y2: 600, tile: "path_stone"},
    ],
    stoneDrop: [0, 0],
    unlock: {sect: true},
    objects: [
      {x: 800, y: 300, sprite: "assets/objects/brazier_fire.png", w: 90, h: 100},
      {x: 500, y: 400, sprite: "assets/objects/barrel_wood.png", w: 70, h: 80},
      {x: 1100, y: 400, sprite: "assets/objects/barrel_wood.png", w: 70, h: 80},
      {x: 300, y: 600, sprite: "assets/objects/herb_green.png", w: 60, h: 70},
      {x: 1300, y: 600, sprite: "assets/objects/herb_green.png", w: 60, h: 70},
      {x: 650, y: 700, sprite: "assets/objects/crystal_green.png", w: 70, h: 80},
      {x: 950, y: 700, sprite: "assets/objects/crystal_green.png", w: 70, h: 80},
      {x: 800, y: 800, sprite: "assets/objects/plant_blue.png", w: 70, h: 80},
      {x: 400, y: 900, sprite: "assets/objects/mushroom_glow.png", w: 60, h: 60},
      {x: 1200, y: 900, sprite: "assets/objects/mushroom_glow.png", w: 60, h: 60},
      {x: 200, y: 800, sprite: "assets/objects/lamp_mine.png", w: 60, h: 80},
      {x: 1400, y: 800, sprite: "assets/objects/lamp_mine.png", w: 60, h: 80},
      {x: 800, y: 1000, sprite: "assets/objects/tablet_stone.png", w: 80, h: 100},
      {x: 550, y: 500, sprite: "assets/objects/bush_spread.png", w: 80, h: 50},
      {x: 1050, y: 500, sprite: "assets/objects/bush_spread.png", w: 80, h: 50},,
      {x: 800, y: 480, sprite: "assets/objects/lo_luyen_dan.png", w: 300, h: 300},
      {x: 1150, y: 880, sprite: "assets/objects/lo_luyen.png", w: 280, h: 154}
    ],
  },
  {
    id: 24,
    safe: true,
    nameKey: "map_tong_duoc_vien",
    bg: "assets/maps/map_tong_duoc_vien.webp",
    ground: "assets/map/tile_ground_sect.png",
    loadingBg: "assets/maps/loading_24.webp",
    fb: "#7a9a6a",
    dao: "chinh",
    monsters: [],
    boss: null,
    npcs: ["de_tu_duoc_1", "de_tu_duoc_2"],
    quests: [],
    gates: [{to: 21, x: 80, y: 600}],
    paths: [
      {x1: 80, y1: 600, x2: 1400, y2: 600, tile: "path_wood"},
      {x1: 700, y1: 200, x2: 700, y2: 1000, tile: "path_wood"},
    ],
    stoneDrop: [0, 0],
    unlock: {sect: true},
    objects: [
      {x: 300, y: 300, sprite: "assets/objects/crops_mixed.png", w: 100, h: 80},
      {x: 600, y: 300, sprite: "assets/objects/crops_mixed.png", w: 100, h: 80},
      {x: 900, y: 300, sprite: "assets/objects/crops_mixed.png", w: 100, h: 80},
      {x: 1200, y: 300, sprite: "assets/objects/crops_mixed.png", w: 100, h: 80},
      {x: 400, y: 500, sprite: "assets/objects/herb_green.png", w: 70, h: 80},
      {x: 800, y: 500, sprite: "assets/objects/herb_green.png", w: 70, h: 80},
      {x: 1200, y: 500, sprite: "assets/objects/herb_green.png", w: 70, h: 80},
      {x: 200, y: 700, sprite: "assets/objects/well_stone.png", w: 109, h: 100},
      {x: 1400, y: 700, sprite: "assets/objects/well_stone.png", w: 109, h: 100},
      {x: 600, y: 750, sprite: "assets/objects/plant_blue.png", w: 70, h: 80},
      {x: 1000, y: 750, sprite: "assets/objects/plant_blue.png", w: 70, h: 80},
      {x: 800, y: 900, sprite: "assets/objects/mushroom_glow.png", w: 70, h: 70},
      {x: 300, y: 950, sprite: "assets/objects/tree_jade_short.png", w: 80, h: 90},
      {x: 1300, y: 950, sprite: "assets/objects/tree_jade_short.png", w: 80, h: 90},
      {x: 800, y: 200, sprite: "assets/objects/scarecrow.png", w: 110, h: 100},,
      {x: 800, y: 1020, sprite: "assets/objects/duoc_vien2.png", w: 420, h: 420}
    ],
  },
  {
    id: 25,
    safe: true,
    nameKey: "map_tong_luyen_khi_duong",
    bg: "assets/maps/map_tong_luyen_khi_duong.webp",
    ground: "assets/map/tile_ground_sect.png",
    loadingBg: "assets/maps/loading_25.webp",
    fb: "#9090a0",
    dao: "chinh",
    monsters: [],
    boss: null,
    npcs: ["lao_ren"],
    quests: [],
    gates: [{to: 21, x: 80, y: 600}],
    paths: [
      {x1: 80, y1: 600, x2: 1400, y2: 600, tile: "path_stone"},
    ],
    stoneDrop: [0, 0],
    unlock: {sect: true},
    objects: [
      {x: 800, y: 300, sprite: "assets/objects/brazier_fire.png", w: 90, h: 100},
      {x: 400, y: 450, sprite: "assets/objects/ore_pile.png", w: 90, h: 70},
      {x: 1200, y: 450, sprite: "assets/objects/ore_pile.png", w: 90, h: 70},
      {x: 300, y: 650, sprite: "assets/objects/pickaxe.png", w: 70, h: 70},
      {x: 1300, y: 650, sprite: "assets/objects/cart_ore.png", w: 100, h: 80},
      {x: 600, y: 700, sprite: "assets/objects/crystal_red.png", w: 70, h: 80},
      {x: 1000, y: 700, sprite: "assets/objects/crystal_blue.png", w: 70, h: 80},
      {x: 800, y: 800, sprite: "assets/objects/logs_pile.png", w: 76, h: 90},
      {x: 200, y: 850, sprite: "assets/objects/barrel_wood.png", w: 70, h: 80},
      {x: 1400, y: 850, sprite: "assets/objects/barrel_wood.png", w: 70, h: 80},
      {x: 500, y: 950, sprite: "assets/objects/rock_big.png", w: 90, h: 70},
      {x: 1100, y: 950, sprite: "assets/objects/rock_big.png", w: 90, h: 70},
      {x: 800, y: 1000, sprite: "assets/objects/lamp_mine.png", w: 60, h: 80},
      {x: 350, y: 300, sprite: "assets/objects/fence_vertical.png", w: 60, h: 90},
      {x: 1250, y: 300, sprite: "assets/objects/fence_vertical.png", w: 60, h: 90},,
      {x: 800, y: 430, sprite: "assets/objects/tiem_ren2.png", w: 350, h: 280, w: 400, h: 400},
      {x: 1150, y: 880, sprite: "assets/objects/lo_luyen.png", w: 280, h: 154}
    ],
  },
  {
    id: 26,
    safe: true,
    nameKey: "map_tong_dau_truong",
    bg: "assets/maps/map_tong_dau_truong.webp",
    ground: "assets/map/tile_ground_sect.png",
    loadingBg: "assets/maps/loading_26.webp",
    fb: "#a0a088",
    dao: "chinh",
    monsters: [],
    boss: null,
    npcs: ["vo_tang"],
    quests: [],
    gates: [{to: 21, x: 800, y: 80}],
    paths: [
      {x1: 800, y1: 80, x2: 800, y2: 1000, tile: "path_stone"},
    ],
    stoneDrop: [0, 0],
    unlock: {sect: true},
    objects: [
      {x: 800, y: 600, sprite: "assets/objects/relief_dragon.png", w: 150, h: 100},
      {x: 300, y: 300, sprite: "assets/objects/banner_lantern.png", w: 70, h: 90},
      {x: 1300, y: 300, sprite: "assets/objects/banner_lantern.png", w: 70, h: 90},
      {x: 300, y: 900, sprite: "assets/objects/banner_lantern.png", w: 70, h: 90},
      {x: 1300, y: 900, sprite: "assets/objects/banner_lantern.png", w: 70, h: 90},
      {x: 200, y: 600, sprite: "assets/objects/tablet_stone.png", w: 80, h: 100},
      {x: 1400, y: 600, sprite: "assets/objects/tablet_stone.png", w: 80, h: 100},
      {x: 500, y: 400, sprite: "assets/objects/rock_big.png", w: 90, h: 70},
      {x: 1100, y: 400, sprite: "assets/objects/rock_big.png", w: 90, h: 70},
      {x: 500, y: 800, sprite: "assets/objects/rock_big.png", w: 90, h: 70},
      {x: 1100, y: 800, sprite: "assets/objects/rock_big.png", w: 90, h: 70},
      {x: 800, y: 250, sprite: "assets/objects/statue_dragon.png", w: 100, h: 140},
      {x: 800, y: 950, sprite: "assets/objects/fence_horizontal.png", w: 120, h: 60},
      {x: 400, y: 600, sprite: "assets/objects/brazier_fire.png", w: 70, h: 80},
      {x: 1200, y: 600, sprite: "assets/objects/brazier_fire.png", w: 70, h: 80},,
      {x: 800, y: 620, sprite: "assets/objects/vo_duong.png", w: 350, h: 280, w: 460, h: 460, solid: false},
      {x: 1350, y: 250, sprite: "assets/objects/thac_linh_khi.png", w: 260, h: 260},
      {x: 200, y: 950, sprite: "assets/objects/bia_thu_thach.png", w: 180, h: 100},
      {x: 1050, y: 1000, sprite: "assets/objects/cau_treo.png", w: 360, h: 120, solid: false}
    ],
  },
  {
    id: 27,
    safe: true,
    nameKey: "map_tong_tang_thu_cac",
    bg: "assets/maps/map_tong_tang_thu_cac.webp",
    ground: "assets/map/tile_ground_sect.png",
    loadingBg: "assets/maps/loading_27.webp",
    fb: "#8a90a8",
    dao: "chinh",
    monsters: [],
    boss: null,
    npcs: ["tam_tien_bi_tich"],
    quests: [],
    gates: [{to: 21, x: 1500, y: 600}],
    paths: [
      {x1: 1500, y1: 600, x2: 200, y2: 600, tile: "path_wood"},
    ],
    stoneDrop: [0, 0],
    unlock: {sect: true},
    objects: [
      {x: 400, y: 300, sprite: "assets/objects/house_wood.png", w: 130, h: 150},
      {x: 800, y: 300, sprite: "assets/objects/house_wood.png", w: 130, h: 150},
      {x: 1200, y: 300, sprite: "assets/objects/house_wood.png", w: 130, h: 150},
      {x: 300, y: 600, sprite: "assets/objects/tablet_stone.png", w: 80, h: 100},
      {x: 1300, y: 600, sprite: "assets/objects/tablet_stone.png", w: 80, h: 100},
      {x: 600, y: 700, sprite: "assets/objects/banner_lantern.png", w: 70, h: 90},
      {x: 1000, y: 700, sprite: "assets/objects/banner_lantern.png", w: 70, h: 90},
      {x: 800, y: 800, sprite: "assets/objects/relief_dragon.png", w: 100, h: 70},
      {x: 200, y: 900, sprite: "assets/objects/tree_ancient_wide.png", w: 120, h: 110},
      {x: 1400, y: 900, sprite: "assets/objects/tree_ancient_wide.png", w: 120, h: 110},
      {x: 500, y: 950, sprite: "assets/objects/lamp_mine.png", w: 60, h: 80},
      {x: 1100, y: 950, sprite: "assets/objects/lamp_mine.png", w: 60, h: 80},
      {x: 800, y: 500, sprite: "assets/objects/crystal_purple.png", w: 70, h: 80},
      {x: 450, y: 800, sprite: "assets/objects/bush_dense.png", w: 70, h: 50},
      {x: 1150, y: 800, sprite: "assets/objects/bush_dense.png", w: 70, h: 50},,
      {x: 800, y: 450, sprite: "assets/objects/tang_thu_cac_tran.png", w: 250, h: 300, w: 360, h: 360}
    ],
  },
  {
    id: 28,
    safe: true,
    nameKey: "map_truyen_tong_tran",
    bg: "assets/maps/map_truyen_tong_tran.webp",
    ground: "assets/map/tile_ground_sect.png",
    loadingBg: "assets/maps/loading_28.webp",
    fb: "#7a8ab0",
    dao: "chinh",
    monsters: [],
    boss: null,
    npcs: ["tran_phap_su"],
    quests: [],
    gates: [
      {to: 5, x: 1150, y: 600},
      {to: 6, x: 975, y: 903},
      {to: 7, x: 625, y: 903},
      {to: 8, x: 450, y: 600},
      {to: 9, x: 625, y: 297},
      {to: 10, x: 975, y: 297},
      {to: 0, x: 800, y: 1120},
    ],
    paths: [
      {x1: 800, y1: 600, x2: 1150, y2: 600, tile: "path_stone"},
      {x1: 800, y1: 600, x2: 975, y2: 903, tile: "path_stone"},
      {x1: 800, y1: 600, x2: 625, y2: 903, tile: "path_stone"},
      {x1: 800, y1: 600, x2: 450, y2: 600, tile: "path_stone"},
      {x1: 800, y1: 600, x2: 625, y2: 297, tile: "path_stone"},
      {x1: 800, y1: 600, x2: 975, y2: 297, tile: "path_stone"},
      {x1: 800, y1: 600, x2: 800, y2: 1120, tile: "path_stone"},
    ],
    stoneDrop: [0, 0],
    unlock: {sect: true},
    objects: [
      {x: 1150, y: 600, sprite: "assets/objects/crystal_red.png", w: 120, h: 140, solid: false},
      {x: 975, y: 903, sprite: "assets/objects/crystal_blue.png", w: 120, h: 140, solid: false},
      {x: 625, y: 903, sprite: "assets/objects/crystal_green.png", w: 120, h: 140, solid: false},
      {x: 450, y: 600, sprite: "assets/objects/crystal_ice.png", w: 120, h: 140, solid: false},
      {x: 625, y: 297, sprite: "assets/objects/crystal_purple.png", w: 120, h: 140, solid: false},
      {x: 975, y: 297, sprite: "assets/objects/crystal_red.png", w: 120, h: 140, solid: false},
      {x: 800, y: 600, sprite: "assets/objects/relief_dragon.png", w: 150, h: 100, solid: false},
      {x: 400, y: 300, sprite: "assets/objects/tablet_stone.png", w: 80, h: 100},
      {x: 1200, y: 300, sprite: "assets/objects/tablet_stone.png", w: 80, h: 100},
      {x: 400, y: 900, sprite: "assets/objects/banner_lantern.png", w: 70, h: 90},
      {x: 1200, y: 900, sprite: "assets/objects/banner_lantern.png", w: 70, h: 90},
      {x: 800, y: 200, sprite: "assets/objects/lamp_mine.png", w: 60, h: 80},
      {x: 800, y: 1000, sprite: "assets/objects/lamp_mine.png", w: 60, h: 80},
      {x: 200, y: 600, sprite: "assets/objects/bush_dense.png", w: 70, h: 50},
      {x: 1400, y: 600, sprite: "assets/objects/bush_dense.png", w: 70, h: 50},
    ],
  },
  {
    id: 29,
    safe: true,
    nameKey: "map_ma_cong_van_ma",
    bg: "assets/maps/map_ma_cong_van_ma.webp",
    ground: "assets/map/tile_ground_nether.png",
    loadingBg: "assets/maps/loading_29.webp",
    fb: "#2a1a2a",
    dao: "ma",
    monsters: [],
    boss: null,
    npcs: ["truong_lao_ma", "de_tu_ma_1"],
    quests: [],
    gates: [{to: 30, x: 1500, y: 600}, {to: 31, x: 800, y: 80}, {to: 32, x: 80, y: 300}, {to: 33, x: 80, y: 600}, {to: 34, x: 80, y: 900}, {to: 35, x: 1500, y: 300}, {to: 36, x: 1500, y: 600}, {to: 37, x: 1500, y: 900}, {to: 38, x: 800, y: 1120}, {to: 10, x: 400, y: 1120}],
    paths: [
      {x1: 80, y1: 600, x2: 1500, y2: 600, tile: "path_stone"},
      {x1: 800, y1: 80, x2: 800, y2: 1120, tile: "path_stone"},
    ],
    stoneDrop: [0, 0],
    unlock: {dao: "ma"},
    objects: [
      {x: 300, y: 300, sprite: "assets/objects/tablet_stone.png", w: 80, h: 100},
      {x: 1300, y: 300, sprite: "assets/objects/tablet_stone.png", w: 80, h: 100},
      {x: 800, y: 200, sprite: "assets/objects/statue_dragon.png", w: 100, h: 140},
      {x: 200, y: 800, sprite: "assets/objects/fence_lamp.png", w: 82, h: 100},
      {x: 1400, y: 800, sprite: "assets/objects/fence_lamp.png", w: 82, h: 100},
      {x: 800, y: 600, sprite: "assets/objects/cong_tran.png", w: 300, h: 200},
      {x: 500, y: 900, sprite: "assets/objects/rock_big.png", w: 90, h: 70},
      {x: 1100, y: 900, sprite: "assets/objects/rock_big.png", w: 90, h: 70},
      {x: 400, y: 500, sprite: "assets/objects/crystal_red.png", w: 70, h: 90},
      {x: 1200, y: 500, sprite: "assets/objects/crystal_purple.png", w: 70, h: 90},
      {x: 650, y: 700, sprite: "assets/objects/campfire_1.png", w: 80, h: 80},
      {x: 950, y: 700, sprite: "assets/objects/campfire_1.png", w: 80, h: 80},
    ],
  },
  {
    id: 30,
    safe: true,
    nameKey: "map_ma_ngoai_mon",
    bg: "assets/maps/map_ma_ngoai_mon.webp",
    ground: "assets/map/tile_ground_nether.png",
    loadingBg: "assets/maps/loading_30.webp",
    fb: "#2a1a2a",
    dao: "ma",
    monsters: [],
    boss: null,
    npcs: ["de_tu_ma_1", "de_tu_ma_2", "ma_thuong_nhan"],
    quests: [],
    gates: [{to: 29, x: 80, y: 600}],
    paths: [
      {x1: 200, y1: 600, x2: 1400, y2: 600, tile: "path_stone"},,
      {x: 800, y: 300, sprite: "assets/objects/cong_van_ma.png", w: 400, h: 300},,
      {x: 800, y: 900, sprite: "assets/objects/loi_xuong_ma_tran.png", w: 300, h: 200},
    ],
    stoneDrop: [0, 0],
    unlock: {dao: "ma"},
    objects: [
      {x: 300, y: 400, sprite: "assets/map/obj_nha_go.png", w: 120, h: 100},
      {x: 700, y: 400, sprite: "assets/map/obj_nha_go2.png", w: 120, h: 100},
      {x: 1100, y: 400, sprite: "assets/map/obj_nha_go.png", w: 120, h: 100},
      {x: 500, y: 800, sprite: "assets/objects/fence_lamp.png", w: 82, h: 100},
      {x: 1100, y: 800, sprite: "assets/objects/fence_lamp.png", w: 82, h: 100},
      {x: 800, y: 600, sprite: "assets/objects/campfire_1.png", w: 80, h: 80},
      {x: 200, y: 600, sprite: "assets/objects/rock_big.png", w: 90, h: 70},
      {x: 1400, y: 600, sprite: "assets/objects/rock_big.png", w: 90, h: 70},
      {x: 400, y: 200, sprite: "assets/objects/bush_dense.png", w: 70, h: 50},
      {x: 1200, y: 200, sprite: "assets/objects/bush_dense.png", w: 70, h: 50},
      {x: 800, y: 1000, sprite: "assets/objects/tablet_stone.png", w: 80, h: 100},
      {x: 600, y: 300, sprite: "assets/objects/crystal_red.png", w: 60, h: 80},
    ],
  },
  {
    id: 31,
    safe: true,
    nameKey: "map_ma_van_ma_dien",
    bg: "assets/maps/map_ma_van_ma_dien.webp",
    ground: "assets/map/tile_ground_blood.png",
    loadingBg: "assets/maps/loading_31.webp",
    fb: "#2a1a2a",
    dao: "ma",
    monsters: [],
    boss: null,
    npcs: ["truong_lao_ma", "u_minh_ton_gia", "mac_vo_tam"],
    quests: [],
    gates: [{to: 29, x: 800, y: 1120}],
    paths: [
      {x1: 200, y1: 600, x2: 1400, y2: 600, tile: "path_stone"},
    ],
    stoneDrop: [0, 0],
    unlock: {dao: "ma"},
    objects: [
      {x: 800, y: 300, sprite: "assets/map/obj_cuu_u_ma_tong_ma_dien.png", w: 400, h: 300},
      {x: 400, y: 600, sprite: "assets/objects/statue_dragon.png", w: 100, h: 140},
      {x: 1200, y: 600, sprite: "assets/objects/statue_dragon.png", w: 100, h: 140},
      {x: 300, y: 900, sprite: "assets/objects/fence_lamp.png", w: 82, h: 100},
      {x: 1300, y: 900, sprite: "assets/objects/fence_lamp.png", w: 82, h: 100},
      {x: 600, y: 800, sprite: "assets/objects/crystal_purple.png", w: 70, h: 90},
      {x: 1000, y: 800, sprite: "assets/objects/crystal_purple.png", w: 70, h: 90},
      {x: 800, y: 700, sprite: "assets/objects/tablet_stone.png", w: 80, h: 100},
      {x: 200, y: 400, sprite: "assets/objects/rock_big.png", w: 90, h: 70},
      {x: 1400, y: 400, sprite: "assets/objects/rock_big.png", w: 90, h: 70},
      {x: 500, y: 200, sprite: "assets/objects/campfire_1.png", w: 80, h: 80},
      {x: 1100, y: 200, sprite: "assets/objects/campfire_1.png", w: 80, h: 80},
    ],
  },
  {
    id: 32,
    safe: true,
    nameKey: "map_ma_luyen_co_duong",
    bg: "assets/maps/map_ma_luyen_co_duong.webp",
    ground: "assets/map/tile_ground_nether.png",
    loadingBg: "assets/maps/loading_32.webp",
    fb: "#2a1a2a",
    dao: "ma",
    monsters: [],
    boss: null,
    npcs: ["ma_luyen_su", "de_tu_ma_2"],
    quests: [],
    gates: [{to: 29, x: 1500, y: 600}],
    paths: [
      {x1: 200, y1: 600, x2: 1400, y2: 600, tile: "path_stone"},,
      {x: 800, y: 300, sprite: "assets/objects/van_ma_dien.png", w: 500, h: 350},
    ],
    stoneDrop: [0, 0],
    unlock: {dao: "ma"},
    objects: [
      {x: 400, y: 400, sprite: "assets/objects/crystal_green.png", w: 70, h: 90},
      {x: 800, y: 400, sprite: "assets/objects/crystal_green.png", w: 70, h: 90},
      {x: 1200, y: 400, sprite: "assets/objects/crystal_green.png", w: 70, h: 90},
      {x: 600, y: 700, sprite: "assets/map/obj_gieng.png", w: 80, h: 80},
      {x: 1000, y: 700, sprite: "assets/map/obj_gieng.png", w: 80, h: 80},
      {x: 300, y: 800, sprite: "assets/objects/fence_lamp.png", w: 82, h: 100},
      {x: 1300, y: 800, sprite: "assets/objects/fence_lamp.png", w: 82, h: 100},
      {x: 800, y: 600, sprite: "assets/objects/tablet_stone.png", w: 80, h: 100},
      {x: 200, y: 500, sprite: "assets/objects/rock_big.png", w: 90, h: 70},
      {x: 1400, y: 500, sprite: "assets/objects/rock_big.png", w: 90, h: 70},
      {x: 500, y: 200, sprite: "assets/objects/bush_dense.png", w: 70, h: 50},
      {x: 1100, y: 200, sprite: "assets/objects/bush_dense.png", w: 70, h: 50},
    ],
  },
  {
    id: 33,
    safe: true,
    nameKey: "map_ma_luyen_huyet_tri",
    bg: "assets/maps/map_ma_luyen_huyet_tri.webp",
    ground: "assets/map/tile_ground_blood.png",
    loadingBg: "assets/maps/loading_33.webp",
    fb: "#2a1a2a",
    dao: "ma",
    monsters: [],
    boss: null,
    npcs: ["ma_luyen_su", "huyet_ma_tu"],
    quests: [],
    gates: [{to: 29, x: 1500, y: 600}],
    paths: [
      {x1: 200, y1: 600, x2: 1400, y2: 600, tile: "path_stone"},,
      {x: 800, y: 400, sprite: "assets/objects/luyen_co_duong.png", w: 400, h: 300},
    ],
    stoneDrop: [0, 0],
    unlock: {dao: "ma"},
    objects: [
      {x: 800, y: 500, sprite: "assets/objects/crystal_red.png", w: 100, h: 120},
      {x: 400, y: 400, sprite: "assets/objects/crystal_red.png", w: 70, h: 90},
      {x: 1200, y: 400, sprite: "assets/objects/crystal_red.png", w: 70, h: 90},
      {x: 600, y: 800, sprite: "assets/objects/campfire_1.png", w: 80, h: 80},
      {x: 1000, y: 800, sprite: "assets/objects/campfire_1.png", w: 80, h: 80},
      {x: 300, y: 600, sprite: "assets/objects/fence_lamp.png", w: 82, h: 100},
      {x: 1300, y: 600, sprite: "assets/objects/fence_lamp.png", w: 82, h: 100},
      {x: 800, y: 800, sprite: "assets/objects/tablet_stone.png", w: 80, h: 100},
      {x: 200, y: 300, sprite: "assets/objects/rock_big.png", w: 90, h: 70},
      {x: 1400, y: 300, sprite: "assets/objects/rock_big.png", w: 90, h: 70},
      {x: 500, y: 1000, sprite: "assets/objects/bush_dense.png", w: 70, h: 50},
      {x: 1100, y: 1000, sprite: "assets/objects/bush_dense.png", w: 70, h: 50},
    ],
  },
  {
    id: 34,
    safe: true,
    nameKey: "map_ma_hon_dien",
    bg: "assets/maps/map_ma_hon_dien.webp",
    ground: "assets/map/tile_ground_nether.png",
    loadingBg: "assets/maps/loading_34.webp",
    fb: "#2a1a2a",
    dao: "ma",
    monsters: [],
    boss: null,
    npcs: ["co_hon", "u_minh_ton_gia"],
    quests: [],
    gates: [{to: 29, x: 1500, y: 600}],
    paths: [
      {x1: 200, y1: 600, x2: 1400, y2: 600, tile: "path_stone"},,
      {x: 800, y: 500, sprite: "assets/objects/luyen_huyet_tri.png", w: 400, h: 300},
    ],
    stoneDrop: [0, 0],
    unlock: {dao: "ma"},
    objects: [
      {x: 800, y: 400, sprite: "assets/objects/crystal_purple.png", w: 100, h: 120},
      {x: 400, y: 600, sprite: "assets/objects/crystal_purple.png", w: 70, h: 90},
      {x: 1200, y: 600, sprite: "assets/objects/crystal_purple.png", w: 70, h: 90},
      {x: 600, y: 800, sprite: "assets/objects/fence_lamp.png", w: 82, h: 100},
      {x: 1000, y: 800, sprite: "assets/objects/fence_lamp.png", w: 82, h: 100},
      {x: 800, y: 700, sprite: "assets/objects/tablet_stone.png", w: 80, h: 100},
      {x: 300, y: 300, sprite: "assets/objects/rock_big.png", w: 90, h: 70},
      {x: 1300, y: 300, sprite: "assets/objects/rock_big.png", w: 90, h: 70},
      {x: 200, y: 800, sprite: "assets/objects/campfire_1.png", w: 80, h: 80},
      {x: 1400, y: 800, sprite: "assets/objects/campfire_1.png", w: 80, h: 80},
      {x: 500, y: 200, sprite: "assets/objects/bush_dense.png", w: 70, h: 50},
      {x: 1100, y: 200, sprite: "assets/objects/bush_dense.png", w: 70, h: 50},
    ],
  },
  {
    id: 35,
    safe: true,
    nameKey: "map_ma_luyen_khi_duong",
    bg: "assets/maps/map_ma_luyen_khi_duong.webp",
    ground: "assets/map/tile_ground_nether.png",
    loadingBg: "assets/maps/loading_35.webp",
    fb: "#2a1a2a",
    dao: "ma",
    monsters: [],
    boss: null,
    npcs: ["ma_luyen_su", "de_tu_ma_1"],
    quests: [],
    gates: [{to: 29, x: 80, y: 600}],
    paths: [
      {x1: 200, y1: 600, x2: 1400, y2: 600, tile: "path_stone"},,
      {x: 800, y: 350, sprite: "assets/objects/hon_dien.png", w: 400, h: 300},
    ],
    stoneDrop: [0, 0],
    unlock: {dao: "ma"},
    objects: [
      {x: 800, y: 400, sprite: "assets/objects/campfire_1.png", w: 120, h: 120},
      {x: 400, y: 600, sprite: "assets/objects/campfire_1.png", w: 80, h: 80},
      {x: 1200, y: 600, sprite: "assets/objects/campfire_1.png", w: 80, h: 80},
      {x: 600, y: 800, sprite: "assets/objects/rock_big.png", w: 90, h: 70},
      {x: 1000, y: 800, sprite: "assets/objects/rock_big.png", w: 90, h: 70},
      {x: 300, y: 400, sprite: "assets/objects/fence_lamp.png", w: 82, h: 100},
      {x: 1300, y: 400, sprite: "assets/objects/fence_lamp.png", w: 82, h: 100},
      {x: 800, y: 700, sprite: "assets/objects/tablet_stone.png", w: 80, h: 100},
      {x: 200, y: 700, sprite: "assets/objects/crystal_red.png", w: 60, h: 80},
      {x: 1400, y: 700, sprite: "assets/objects/crystal_red.png", w: 60, h: 80},
      {x: 500, y: 200, sprite: "assets/objects/bush_dense.png", w: 70, h: 50},
      {x: 1100, y: 200, sprite: "assets/objects/bush_dense.png", w: 70, h: 50},
    ],
  },
  {
    id: 36,
    safe: true,
    nameKey: "map_ma_huyet_dau_truong",
    bg: "assets/maps/map_ma_huyet_dau_truong.webp",
    ground: "assets/map/tile_ground_blood.png",
    loadingBg: "assets/maps/loading_36.webp",
    fb: "#2a1a2a",
    dao: "ma",
    monsters: [],
    boss: null,
    npcs: ["de_tu_ma_1", "de_tu_ma_2"],
    quests: [],
    gates: [{to: 29, x: 80, y: 600}],
    paths: [
      {x1: 200, y1: 600, x2: 1400, y2: 600, tile: "path_stone"},,
      {x: 800, y: 400, sprite: "assets/objects/luyen_khi_ma_duong.png", w: 400, h: 300},
    ],
    stoneDrop: [0, 0],
    unlock: {dao: "ma"},
    objects: [
      {x: 800, y: 600, sprite: "assets/objects/tablet_stone.png", w: 120, h: 140},
      {x: 400, y: 400, sprite: "assets/objects/statue_dragon.png", w: 100, h: 140},
      {x: 1200, y: 400, sprite: "assets/objects/statue_dragon.png", w: 100, h: 140},
      {x: 400, y: 800, sprite: "assets/objects/statue_dragon.png", w: 100, h: 140},
      {x: 1200, y: 800, sprite: "assets/objects/statue_dragon.png", w: 100, h: 140},
      {x: 300, y: 600, sprite: "assets/objects/fence_lamp.png", w: 82, h: 100},
      {x: 1300, y: 600, sprite: "assets/objects/fence_lamp.png", w: 82, h: 100},
      {x: 600, y: 300, sprite: "assets/objects/campfire_1.png", w: 80, h: 80},
      {x: 1000, y: 300, sprite: "assets/objects/campfire_1.png", w: 80, h: 80},
      {x: 600, y: 900, sprite: "assets/objects/campfire_1.png", w: 80, h: 80},
      {x: 1000, y: 900, sprite: "assets/objects/campfire_1.png", w: 80, h: 80},
      {x: 800, y: 200, sprite: "assets/objects/crystal_red.png", w: 70, h: 90},
    ],
  },
  {
    id: 37,
    safe: true,
    nameKey: "map_ma_van_doc_vien",
    bg: "assets/maps/map_ma_van_doc_vien.webp",
    ground: "assets/map/tile_ground_nether.png",
    loadingBg: "assets/maps/loading_37.webp",
    fb: "#2a1a2a",
    dao: "ma",
    monsters: [],
    boss: null,
    npcs: ["ma_luyen_su", "co_hon"],
    quests: [],
    gates: [{to: 29, x: 80, y: 600}],
    paths: [
      {x1: 200, y1: 600, x2: 1400, y2: 600, tile: "path_stone"},,
      {x: 800, y: 500, sprite: "assets/objects/huyet_dau_truong.png", w: 450, h: 350},
    ],
    stoneDrop: [0, 0],
    unlock: {dao: "ma"},
    objects: [
      {x: 400, y: 400, sprite: "assets/objects/crystal_green.png", w: 80, h: 100},
      {x: 800, y: 400, sprite: "assets/objects/crystal_purple.png", w: 80, h: 100},
      {x: 1200, y: 400, sprite: "assets/objects/crystal_green.png", w: 80, h: 100},
      {x: 600, y: 700, sprite: "assets/map/obj_gieng.png", w: 80, h: 80},
      {x: 1000, y: 700, sprite: "assets/map/obj_gieng.png", w: 80, h: 80},
      {x: 300, y: 800, sprite: "assets/objects/fence_lamp.png", w: 82, h: 100},
      {x: 1300, y: 800, sprite: "assets/objects/fence_lamp.png", w: 82, h: 100},
      {x: 800, y: 600, sprite: "assets/objects/tablet_stone.png", w: 80, h: 100},
      {x: 200, y: 500, sprite: "assets/objects/rock_big.png", w: 90, h: 70},
      {x: 1400, y: 500, sprite: "assets/objects/rock_big.png", w: 90, h: 70},
      {x: 500, y: 200, sprite: "assets/objects/bush_dense.png", w: 70, h: 50},
      {x: 1100, y: 200, sprite: "assets/objects/bush_dense.png", w: 70, h: 50},
    ],
  },
  {
    id: 38,
    safe: true,
    nameKey: "map_ma_tran",
    bg: "assets/maps/map_ma_tran.webp",
    ground: "assets/map/tile_ground_nether.png",
    loadingBg: "assets/maps/loading_38.webp",
    fb: "#2a1a2a",
    dao: "ma",
    monsters: [],
    boss: null,
    npcs: ["ma_thuong_nhan", "ma_luyen_su", "de_tu_ma_1", "de_tu_ma_2", "su_gia_ma"],
    quests: [],
    gates: [{to: 29, x: 80, y: 600}, {to: 10, x: 1500, y: 600}],
    paths: [
      {x1: 80, y1: 600, x2: 1500, y2: 600, tile: "path_stone"},
      {x1: 400, y1: 200, x2: 400, y2: 1000, tile: "path_stone"},
      {x1: 1200, y1: 200, x2: 1200, y2: 1000, tile: "path_stone"},,
      {x: 800, y: 450, sprite: "assets/objects/van_doc_vien.png", w: 400, h: 300},
    ],
    stoneDrop: [0, 0],
    unlock: {dao: "ma"},
    objects: [
      {x: 300, y: 400, sprite: "assets/map/obj_nha_go.png", w: 140, h: 120},
      {x: 700, y: 400, sprite: "assets/map/obj_nha_go2.png", w: 140, h: 120},
      {x: 1100, y: 400, sprite: "assets/map/obj_nha_ngoi.png", w: 140, h: 120},
      {x: 500, y: 700, sprite: "assets/map/obj_nha_go.png", w: 140, h: 120},
      {x: 900, y: 700, sprite: "assets/map/obj_nha_go2.png", w: 140, h: 120},
      {x: 200, y: 800, sprite: "assets/objects/fence_lamp.png", w: 82, h: 100},
      {x: 1400, y: 800, sprite: "assets/objects/fence_lamp.png", w: 82, h: 100},
      {x: 800, y: 500, sprite: "assets/objects/campfire_1.png", w: 80, h: 80},
      {x: 400, y: 900, sprite: "assets/objects/crystal_red.png", w: 60, h: 80},
      {x: 1200, y: 900, sprite: "assets/objects/crystal_purple.png", w: 60, h: 80},
      {x: 600, y: 200, sprite: "assets/objects/tablet_stone.png", w: 80, h: 100},
      {x: 1000, y: 200, sprite: "assets/objects/tablet_stone.png", w: 80, h: 100},
      {x: 300, y: 1000, sprite: "assets/objects/rock_big.png", w: 90, h: 70},
      {x: 1300, y: 1000, sprite: "assets/objects/rock_big.png", w: 90, h: 70},
      {x: 800, y: 800, sprite: "assets/map/obj_gieng.png", w: 80, h: 80},
      {x: 200, y: 500, sprite: "assets/objects/bush_dense.png", w: 70, h: 50},
      {x: 1400, y: 500, sprite: "assets/objects/bush_dense.png", w: 70, h: 50},
      {x: 500, y: 1000, sprite: "assets/objects/crystal_red.png", w: 60, h: 80},
      {x: 1100, y: 1000, sprite: "assets/objects/crystal_purple.png", w: 60, h: 80},
      {x: 800, y: 100, sprite: "assets/objects/cong_tran.png", w: 250, h: 180},
    ],
  },
  /* ===== 4 MAP MỚI theo ảnh tutien2d của Bui (2026-10-23) =====
   * Chuỗi tân thủ: Thảo Dược Cốc(39) <-> Rừng Trúc(40) <-> Chân Núi Tản Viên(42) <-> Bãi Đá(41) -> Mỏ Linh Thạch(4)
   * Chân Núi Tản Viên nối về Thanh Vân Trấn(0). */
  {
    id: 39,
    nameKey: "map_thao_duoc_coc",
    bg: "assets/maps/map_thao_duoc_coc.webp",
    ground: "assets/map/tile_ground_farm.png",
    loadingBg: "assets/maps/loading_thao_duoc_coc.webp",
    fb: "#7fae6a",
    dao: "chinh",
    monsters: ["son_tac", "son_ke"],
    boss: null,
    spawnZones: [
      { x: 800, y: 620, r: 250, monsters: ["son_tac", "son_ke"] },
    ],
    bossSpawn: null,
    npcs: ["dai_phu_tdc"],
    quests: [],
    gates: [{to: 40, x: 500, y: 80}],
    objects: [
      {x: 200, y: 450, sprite: "assets/objects/tablet_stone.png", w: 70, h: 100},
      {x: 300, y: 900, sprite: "assets/objects/tree_round.png", w: 110, h: 130},
      {x: 1250, y: 350, sprite: "assets/objects/tree_round.png", w: 110, h: 130},
      {x: 900, y: 200, sprite: "assets/objects/rock_big.png", w: 90, h: 70},
    ],
    stoneDrop: [1, 3],
    unlock: null,
  },
  {
    id: 40,
    nameKey: "map_rung_truc",
    bg: "assets/maps/map_rung_truc.webp",
    ground: "assets/map/tile_ground_forest.png",
    loadingBg: "assets/maps/loading_rung_truc.webp",
    fb: "#5f8f5a",
    dao: "chinh",
    monsters: ["son_tac", "phong_lang"],
    boss: null,
    spawnZones: [
      { x: 800, y: 600, r: 250, monsters: ["son_tac", "phong_lang"] },
    ],
    bossSpawn: null,
    npcs: ["tho_san_rt"],
    quests: [],
    gates: [{to: 39, x: 800, y: 1120}, {to: 42, x: 800, y: 80}],
    objects: [
      {x: 280, y: 560, sprite: "assets/objects/board_quest.png", w: 72, h: 90},
      {x: 1200, y: 300, sprite: "assets/objects/rock_big.png", w: 90, h: 70},
      {x: 400, y: 1000, sprite: "assets/objects/rock_big.png", w: 90, h: 70},
    ],
    stoneDrop: [2, 4],
    unlock: null,
  },
  {
    id: 41,
    nameKey: "map_bai_da",
    bg: "assets/maps/map_bai_da.webp",
    ground: "assets/map/tile_ground_mine.png",
    loadingBg: "assets/maps/loading_bai_da.webp",
    fb: "#8a8a7a",
    dao: "chinh",
    monsters: ["son_tac", "da_tru"],
    boss: null,
    spawnZones: [
      { x: 800, y: 700, r: 250, monsters: ["son_tac", "da_tru"] },
    ],
    bossSpawn: null,
    npcs: ["tieu_phu_bd"],
    quests: [],
    gates: [{to: 42, x: 80, y: 600}, {to: 4, x: 1400, y: 200}],
    objects: [
      {x: 1400, y: 280, sprite: "assets/objects/cong_tran.png", w: 180, h: 150, solid: false},
      {x: 700, y: 500, sprite: "assets/objects/crystal_blue.png", w: 60, h: 80},
      {x: 1000, y: 800, sprite: "assets/objects/crystal_blue.png", w: 60, h: 80},
      {x: 1150, y: 800, sprite: "assets/objects/cart_ore.png", w: 120, h: 90},
      {x: 500, y: 300, sprite: "assets/objects/tablet_stone.png", w: 80, h: 100},
    ],
    stoneDrop: [3, 6],
    unlock: null,
  },
  {
    id: 42,
    nameKey: "map_chan_nui_tan_vien",
    bg: "assets/maps/map_chan_nui_tan_vien.webp",
    ground: "assets/map/tile_ground_forest.png",
    loadingBg: "assets/maps/loading_chan_nui_tan_vien.webp",
    fb: "#7fae6a",
    dao: "chinh",
    monsters: ["son_tac"],
    boss: null,
    spawnZones: [
      { x: 800, y: 950, r: 220, monsters: ["son_tac"] },
    ],
    bossSpawn: null,
    npcs: ["chap_su_dh", "lao_ren_tnv"],
    quests: [],
    gates: [{to: 40, x: 800, y: 1120}, {to: 41, x: 1520, y: 600}, {to: 0, x: 80, y: 80}],
    objects: [
      {x: 250, y: 350, sprite: "assets/objects/house_wood.png", w: 180, h: 150},
      {x: 450, y: 350, sprite: "assets/objects/house_wood.png", w: 180, h: 150},
      {x: 600, y: 500, sprite: "assets/objects/board_quest.png", w: 72, h: 90},
    ],
    stoneDrop: [1, 3],
    unlock: null,
  },
  {
    id: 43,
    nameKey: "map_tien_mon",
    bg: "assets/maps/map_tien_mon.webp",
    ground: "assets/map/tile_ground_forest.png",
    loadingBg: "assets/maps/loading_tien_mon.webp",
    fb: "#a8c8e8",
    dao: "chinh",
    monsters: ["son_tac"],
    boss: null,
    spawnZones: [
      { x: 800, y: 700, r: 200, monsters: ["son_tac"] },
    ],
    bossSpawn: null,
    npcs: ["chuong_mon_tm", "de_tu_tiep_dan_tm", "lao_duoc_su_tm"],
    quests: [],
    gates: [{to: 0, x: 80, y: 600}, {to: 5, x: 1500, y: 300}, {to: 14, x: 800, y: 80}],
    objects: [
      {x: 800, y: 220, sprite: "assets/objects/cong_tran.png", w: 180, h: 150, solid: false},
      {x: 400, y: 850, sprite: "assets/objects/tree_round.png", w: 110, h: 130},
      {x: 1200, y: 850, sprite: "assets/objects/tree_round.png", w: 110, h: 130},
      {x: 600, y: 500, sprite: "assets/objects/board_quest.png", w: 72, h: 90},
    ],
    stoneDrop: [2, 4],
    unlock: null,
  },
];

/* ============ BÍ CẢNH TÔNG MÔN + THẾ GIỚI (Bui 2026-10-18) ============
 * 6 bí cảnh riêng tông môn (khóa theo tông) + 2 bí cảnh chung thế giới.
 * Đọc bởi Secret._defs() gộp với SECRET_REALMS. Lịch: daily = mỗi ngày 3 khung,
 * daily2 = mỗi ngày 2 khung, weekly = T7+CN.
 */
function _bcDailyWindows() {
  var out = [];
  for (var d = 0; d < 7; d++) { ["10:00", "15:00", "21:00"].forEach(function (s) { out.push({ day: d, start: s }); }); }
  return out;
}
function _bcDaily2Windows() {
  var out = [];
  for (var d = 0; d < 7; d++) { ["12:00", "20:00"].forEach(function (s) { out.push({ day: d, start: s }); }); }
  return out;
}
const BC_REALMS = {"realms": [
  {
    id: "kiem_trung", nameKey: "bc_realm_kiem_trung", descKey: "bc_realm_kiem_trung_desc",
    icon: "⚔️", bg: "assets/maps/map_kiem_tong.webp", fb: "#2a3a5a",
    schedule: _bcDailyWindows(),
    durationMin: 60, soonMin: 30,
    nodes: 20, nodeItem: "kiem_hon_thach", nodeNameKey: "bc_node_dac_san", nodeQty: [1, 2],
    monsters: [], boss: "Kiếm Hồn",
    unlock: {realm: 2, sect: "kiem_tong"},
    consolation: {stones: 500, items: [["kiem_hon_thach", 2]]},
  },
  {
    id: "tinh_than_bi_canh", nameKey: "bc_realm_tinh_than_bi_canh", descKey: "bc_realm_tinh_than_bi_canh_desc",
    icon: "✨", bg: null, fb: "#2e2a4a",
    schedule: _bcDailyWindows(),
    durationMin: 60, soonMin: 30,
    nodes: 20, nodeItem: "tinh_than_sa", nodeNameKey: "bc_node_dac_san", nodeQty: [1, 2],
    monsters: [], boss: "Tinh Không Thú",
    unlock: {realm: 2, sect: "thien_phap_tong"},
    consolation: {stones: 500, items: [["tinh_than_sa", 2]]},
  },
  {
    id: "la_han_dong", nameKey: "bc_realm_la_han_dong", descKey: "bc_realm_la_han_dong_desc",
    icon: "🛕", bg: null, fb: "#4a3a20",
    schedule: _bcDailyWindows(),
    durationMin: 60, soonMin: 30,
    nodes: 20, nodeItem: "la_han_xa_loi", nodeNameKey: "bc_node_dac_san", nodeQty: [1, 2],
    monsters: [], boss: "Kim Cang La Hán",
    unlock: {realm: 2, sect: "kim_cang_tong"},
    consolation: {stones: 500, items: [["la_han_xa_loi", 2]]},
  },
  {
    id: "duoc_vuong_coc", nameKey: "bc_realm_duoc_vuong_coc", descKey: "bc_realm_duoc_vuong_coc_desc",
    icon: "🌿", bg: "assets/maps/map_duoc_vuong_tong.webp", fb: "#2e4a2e",
    schedule: _bcDailyWindows(),
    durationMin: 60, soonMin: 30,
    nodes: 20, nodeItem: "van_nien_linh_chi", nodeNameKey: "bc_node_dac_san", nodeQty: [1, 2],
    monsters: [], boss: "Dược Linh",
    unlock: {realm: 2, sect: "duoc_vuong_tong"},
    consolation: {stones: 500, items: [["van_nien_linh_chi", 2]]},
  },
  {
    id: "van_thu_quat", nameKey: "bc_realm_van_thu_quat", descKey: "bc_realm_van_thu_quat_desc",
    icon: "🐾", bg: "assets/maps/map_hac_phong_lam.webp", fb: "#3a4a2a",
    schedule: _bcDailyWindows(),
    durationMin: 60, soonMin: 30,
    nodes: 20, nodeItem: "thu_vuong_huyet", nodeNameKey: "bc_node_dac_san", nodeQty: [1, 2],
    monsters: [], boss: "Thú Vương",
    unlock: {realm: 2, sect: "ngu_thu_tong"},
    consolation: {stones: 500, items: [["thu_vuong_huyet", 2]]},
  },
  {
    id: "huyet_ma_quat", nameKey: "bc_realm_huyet_ma_quat", descKey: "bc_realm_huyet_ma_quat_desc",
    icon: "🩸", bg: "assets/maps/map_cuu_u_ma_tong.webp", fb: "#4a1a2a",
    schedule: _bcDailyWindows(),
    durationMin: 60, soonMin: 30,
    nodes: 20, nodeItem: "huyet_ma_tinh", nodeNameKey: "bc_node_dac_san", nodeQty: [1, 2],
    monsters: [], boss: "Huyết Ma Tướng",
    unlock: {realm: 2, sect: "cuu_u_ma_tong"},
    consolation: {stones: 500, items: [["huyet_ma_tinh", 2]]},
  },
  {
    id: "huyet_hai_ngoai_vi", nameKey: "bc_realm_huyet_hai_ngoai_vi", descKey: "bc_realm_huyet_hai_ngoai_vi_desc",
    icon: "🌊", bg: "assets/maps/map_huyet_ma_vuc.webp", fb: "#1a2a4a",
    schedule: _bcDaily2Windows(),
    durationMin: 60, soonMin: 30,
    nodes: 30, nodeItem: "huyet_hai_chau", nodeNameKey: "bc_node_dac_san", nodeQty: [1, 2],
    monsters: [], boss: "Huyết Hải Ma Kình",
    unlock: {realm: 4},
    consolation: {stones: 500, items: [["huyet_hai_chau", 2]]},
  },
  {
    id: "thien_khuyet_phe_tich", nameKey: "bc_realm_thien_khuyet_phe_tich", descKey: "bc_realm_thien_khuyet_phe_tich_desc",
    icon: "🏛️", bg: null, fb: "#3a3a5a",
    schedule: [{day: 6, start: "20:00"}, {day: 0, start: "20:00"}],
    durationMin: 60, soonMin: 30,
    nodes: 20, nodeItem: "thien_khuyet_manh", nodeNameKey: "bc_node_dac_san", nodeQty: [1, 2],
    monsters: [], boss: "Thủ Hộ Giả Thiên Khuyết",
    unlock: {realm: 6},
    consolation: {stones: 500, items: [["thien_khuyet_manh", 2]]},
  },
]};

/* ============================================================
 * BÍ CẢNH TRANH ĐOẠT — 3 cái theo lịch tuần (xem secret.js)
 * day: JS getDay() (0=CN..6=T7); mỗi slot mở durationMin phút.
 * ============================================================ */
const SECRET_REALMS = {"realms": [
  {
    id: "linh_duoc_coc", nameKey: "sr_linh_duoc_coc", descKey: "sr_linh_duoc_coc_desc",
    icon: "🌿", bg: "assets/maps/map_hac_phong_lam.webp", fb: "#2e4a2e",
    schedule: [{day: 2, start: "20:00"}, {day: 5, start: "20:00"}],
    durationMin: 60, soonMin: 30,
    nodes: 24, nodeItem: "that_diep_chi", nodeNameKey: "sr_node_thao", nodeQty: [1, 3],
    monsters: ["u_hon_lang", "thach_giap_trung"], boss: "u_minh_cu_mang",
    unlock: {realm: 2},
    consolation: {stones: 300, items: [["thao_linh_chi", 3]]},
  },
  {
    id: "khoang_mach_co", nameKey: "sr_khoang_mach_co", descKey: "sr_khoang_mach_co_desc",
    icon: "⛏️", bg: "assets/map/map_thanh_van_tran.webp", fb: "#4a3a2e",
    schedule: [{day: 3, start: "12:00"}, {day: 0, start: "12:00"}],
    durationMin: 60, soonMin: 30,
    nodes: 18, nodeItem: "huyen_thiet", nodeNameKey: "sr_node_khoang", nodeQty: [1, 2],
    monsters: ["tinh_thach_quai", "thach_giap_trung"], boss: "cot_tuong",
    unlock: {realm: 2},
    consolation: {stones: 300, items: [["huyen_thiet", 1]]},
  },
  {
    id: "yeu_dan_sao", nameKey: "sr_yeu_dan_sao", descKey: "sr_yeu_dan_sao_desc",
    icon: "🟣", bg: null, fb: "#3a2e4a",
    schedule: [{day: 4, start: "20:00"}, {day: 6, start: "20:00"}],
    durationMin: 60, soonMin: 30,
    nodes: 15, nodeItem: "yaodan4", nodeItemAlt: "yaodan5", nodeAltRate: 0.25,
    nodeNameKey: "sr_node_yeu", nodeQty: [1, 1],
    monsters: ["ma_lang", "oan_linh"], boss: "hac_long",
    unlock: {realm: 3},
    consolation: {stones: 500, items: [["yaodan2", 1]]},
  },
]};

/* ============================================================
 * PHỤ BẢN — 4 cái: Tân Thủ / Tinh Anh / Đột Phá + 1 Ngẫu nhiên
 * typeId: 'tanthu' | 'tinhanh' | 'dotpha' (đọc phí/lượt từ DUNGEON_TYPES)
 * ============================================================ */
const DUNGEONS = [
  {
    id: "pb_tanthu_1", nameKey: "dg_pb_tanthu_1", typeId: "tanthu",
    mapBg: "../assets-ai/map1-thanh-van-tran.webp",
    monsters: ["da_tru", "son_ke"], boss: "da_tru_vuong",
    rewardNote: "dg_note_tanthu",
  },
  {
    id: "pb_tinhanh_1", nameKey: "dg_pb_tinhanh_1", typeId: "tinhanh",
    mapBg: "../assets-ai/map2-hac-phong-lam.webp",
    monsters: ["phong_lang", "hu_thi"], boss: "lang_vuong",
    rewardNote: "dg_note_tinhanh",
  },
  {
    id: "pb_dotpha_lk", nameKey: "dg_pb_dotpha_lk", typeId: "dotpha",
    mapBg: null, /* chưa có ảnh AI map3 → engine dùng màu fb */
    monsters: ["u_hon", "thi_ma"], boss: "cot_tuong",
    /* Boss rớt nguyên liệu đột phá: yaodan1, taycothao (xem MONSTERS) */
    rewardNote: "dg_note_dotpha",
  },
  {
    id: "pb_ngau_nhien_1", nameKey: "dg_pb_ngau_nhien_1", typeId: "tinhanh",
    ngau_nhien: true,
    mapBg: null, /* nền ngẫu nhiên theo ải — engine tự chọn */
    monsters: [], boss: null,
    realmPool: {
      monsters: ["phong_lang", "hu_thi", "u_hon", "thi_ma"],
      bosses: ["lang_vuong", "cot_tuong"],
    },
    rewardTables: {
      common: [
        { stones: [20, 60], items: [{ id: "pill_hx", qty: 2 }] },
        { stones: [30, 70], items: [{ id: "pill_hl", qty: 2 }] },
      ],
      rare: [
        { stones: [80, 150], items: [{ id: "wpn_linh", qty: 1 }] },
        { stones: [80, 150], items: [{ id: "arm_linh", qty: 1 }] },
      ],
      breakthrough: [
        { stones: [150, 300], items: [{ id: "yaodan1", qty: 1 }] },
        { stones: [150, 300], items: [{ id: "taycothao", qty: 2 }] },
      ],
    },
    rewardNote: "dg_note_random",
  },
];

/* Sinh layout bí cảnh ngẫu nhiên — DETERMINISTIC theo seed (mulberry32).
 * 3-5 ải; mỗi ải 3-5 quái từ pool + 1 boss từ pool;
 * thưởng cuối ải: 70% common / 25% rare / 5% breakthrough. */
function genRandomDungeon(def, seed) {
  var rng = _makeRng(seed);
  var stages = [];
  var nStage = _randInt(rng, 3, 5);
  for (var i = 0; i < nStage; i++) {
    var mons = [];
    var nMon = _randInt(rng, 3, 5);
    for (var j = 0; j < nMon; j++) {
      mons.push(_pickRng(rng, def.realmPool.monsters));
    }
    var roll = rng();
    var tableName = roll < 0.7 ? "common" : (roll < 0.95 ? "rare" : "breakthrough");
    var tmpl = _pickRng(rng, def.rewardTables[tableName]);
    /* deep-copy để layout không chia sẻ object với def */
    var items = tmpl.items.map(function (it) { return { id: it.id, qty: it.qty }; });
    stages.push({
      monsters: mons,
      boss: _pickRng(rng, def.realmPool.bosses),
      rewards: { stones: [tmpl.stones[0], tmpl.stones[1]], items: items },
    });
  }
  return { seed: seed, stages: stages };
}

/* ============================================================
 * VẬT PHẨM
 * kind: pill | material | equip | yaodan
 * healHp: tỉ lệ % maxHp hồi (vd 0.3 = 30%); healMp tương tự cho maxMp
 * price: giá mua ở shop; sell: giá bán lại cho NPC
 * slot: weapon | armor | acc (chỉ đồ equip); tier 0..4
 * reqRealm: null = mặc được ngay; {realm, tier} = cảnh giới tối thiểu
 * locked: true = đồ bị khóa (cần Khai Phong Phù để mở)
 * ============================================================ */
/* ============================================================
 * ĐỘ HIẾM (7 cấp) & ĐỘ KHÓ (5 cấp) vật phẩm — Bui DUYỆT 2026-10-18
 * doHiem: 0 Phàm(trắng) → 6 Tiên Phẩm(vàng kim)
 * doKho: 0 Dễ → 4 Không thể
 * ============================================================ */
const RARITY = [
  { ten: "Phàm",         mau: "#e0e0e0", en: "Common" },
  { ten: "Lương",        mau: "#4caf50", en: "Fine" },
  { ten: "Ưu",           mau: "#2196f3", en: "Superior" },
  { ten: "Hiếm",         mau: "#9c27b0", en: "Rare" },
  { ten: "Sử Thi",       mau: "#ff9800", en: "Epic" },
  { ten: "Truyền Thuyết", mau: "#f44336", en: "Legendary" },
  { ten: "Tiên Phẩm",    mau: "#ffd700", en: "Immortal" },
];
const DOKHO = [
  { ten: "Dễ", en: "Easy" },
  { ten: "Trung bình", en: "Medium" },
  { ten: "Khó", en: "Hard" },
  { ten: "Cực khó", en: "Extreme" },
  { ten: "Không thể", en: "Unobtainable" },
];
/* Ánh xạ nguyên tố yêu đan → chỉ số cộng thêm khi luyện hóa:
 * hoa(Hỏa)=bạo kích, loi(Lôi)=công, bang(Băng)=thủ, phong(Phong)=HP, tho(Thổ)=giáp */
const YD_ELEM_STAT = { hoa: "crit", loi: "atk", bang: "def", phong: "hp", tho: "armor" };

const ITEMS = {
  /* --- Đan dược --- */
  pill_hx: {
    kind: "pill", nameKey: "it_pill_hx", descKey: "it_pill_hx_desc",
    healHp: 0.3, price: 50, sell: 15, icon: "🔴",
  },
  pill_hl: {
    kind: "pill", nameKey: "it_pill_hl", descKey: "it_pill_hl_desc",
    healMp: 0.5, price: 80, sell: 24, icon: "🔵",
  },
  /* Hồi Khí Huyết: Tiểu/Trung/Đại + đặc sản */
  dan_hx_tieu: { kind: "pill", nameKey: "it_dan_hx_tieu", descKey: "it_dan_hx_tieu_desc",
    healHp: 0.3, price: 60, sell: 18, icon: "🔴" },
  dan_hx_trung: { kind: "pill", nameKey: "it_dan_hx_trung", descKey: "it_dan_hx_trung_desc",
    healHp: 0.6, price: 180, sell: 54, icon: "🟠" },
  dan_hx_dai: { kind: "pill", nameKey: "it_dan_hx_dai", descKey: "it_dan_hx_dai_desc",
    healHp: 1.0, price: 450, sell: 135, icon: "❤️" },
  linh_chi_ngan_nam: { kind: "pill", nameKey: "it_linh_chi", descKey: "it_linh_chi_desc",
    healHp: 0.8, price: 600, sell: 180, icon: "🍄" },
  thit_yeu_thu: { kind: "pill", nameKey: "it_thit_yeu_thu", descKey: "it_thit_yeu_thu_desc",
    healHp: 0.4, price: 120, sell: 36, icon: "🍖" },
  /* Thẻ đặc biệt: đổi tên / đổi giới tính (dùng từ túi → mở panel riêng) */
  the_doi_ten: { kind: "card", nameKey: "it_the_doi_ten", descKey: "it_the_doi_ten_desc",
    price: 1000, sell: 300, icon: "🎫", use: "rename" },
  the_doi_gioi_tinh: { kind: "card", nameKey: "it_the_doi_gioi_tinh", descKey: "it_the_doi_gioi_tinh_desc",
    price: 800, sell: 240, icon: "👫", use: "gender" },
  /* Hồi Linh Lực */
  dan_hl_tieu: { kind: "pill", nameKey: "it_dan_hl_tieu", descKey: "it_dan_hl_tieu_desc",
    healMp: 0.3, price: 60, sell: 18, icon: "🔵" },
  dan_hl_trung: { kind: "pill", nameKey: "it_dan_hl_trung", descKey: "it_dan_hl_trung_desc",
    healMp: 0.6, price: 180, sell: 54, icon: "🟣" },
  dan_hl_dai: { kind: "pill", nameKey: "it_dan_hl_dai", descKey: "it_dan_hl_dai_desc",
    healMp: 1.0, price: 450, sell: 135, icon: "💧" },
  /* Thọ Nguyên Đan: tăng năm thọ nguyên (dùng từ túi) */
  dan_tho_tieu: { kind: "pill", nameKey: "it_dan_tho_tieu", descKey: "it_dan_tho_tieu_desc",
    tnYears: 10, price: 500, sell: 150, icon: "🌱" },
  dan_dien_tho: { kind: "pill", nameKey: "it_dan_dien_tho", descKey: "it_dan_dien_tho_desc",
    tnYears: 50, price: 2000, sell: 600, icon: "🍑" },
  dan_truong_sinh: { kind: "pill", nameKey: "it_dan_truong_sinh", descKey: "it_dan_truong_sinh_desc",
    tnYears: 200, price: 8000, sell: 2400, icon: "✨" },
  linh_tra: { kind: "pill", nameKey: "it_linh_tra", descKey: "it_linh_tra_desc",
    healMp: 0.5, price: 150, sell: 45, icon: "🫖" },
  linh_tuu: { kind: "pill", nameKey: "it_linh_tuu", descKey: "it_linh_tuu_desc",
    healMp: 0.7, price: 300, sell: 90, icon: "🍶" },
  /* Hồi Thần Thức */
  duong_than_dan: { kind: "pill", nameKey: "it_duong_than_dan", descKey: "it_duong_than_dan_desc",
    healFocus: 50, price: 200, sell: 60, icon: "🧘" },
  thanh_tam_qua: { kind: "pill", nameKey: "it_thanh_tam_qua", descKey: "it_thanh_tam_qua_desc",
    healFocus: 100, price: 400, sell: 120, icon: "🍇" },
  /* Giáp tạm thời (khiên 30 giây) */
  kim_cang_dan: { kind: "pill", nameKey: "it_kim_cang_dan", descKey: "it_kim_cang_dan_desc",
    shieldPct: 0.3, shieldDur: 30, price: 500, sell: 150, icon: "🛡️" },
  ho_the_phu: { kind: "pill", nameKey: "it_ho_the_phu", descKey: "it_ho_the_phu_desc",
    shieldPct: 0.15, shieldDur: 30, price: 250, sell: 75, icon: "🧿" },
  /* --- Hạt giống & linh thảo (Linh Điền) --- */
  hat_linh_chi: { kind: "seed", nameKey: "it_hat_linh_chi", descKey: "it_hat_linh_chi_desc",
    price: 100, sell: 30, icon: "🌱" },
  hat_truc_co_thao: { kind: "seed", nameKey: "it_hat_truc_co_thao", descKey: "it_hat_truc_co_thao_desc",
    price: 300, sell: 90, icon: "🌱" },
  hat_dia_linh_qua: { kind: "seed", nameKey: "it_hat_dia_linh_qua", descKey: "it_hat_dia_linh_qua_desc",
    price: 800, sell: 240, icon: "🌱" },
  thao_linh_chi: {
    kind: "herb", nameKey: "it_thao_linh_chi", descKey: "it_thao_linh_chi_desc",
    price: 80, sell: 40, icon: "🌿",
    herbTier: 1, gatherMap: "Thảo Dược Cốc",
    useFor: ["dan_tu_khi", "dan_hoi_khi_tan"],
    doHiem: 1, doKho: 0,
  },
  that_diep_chi: {
    kind: "herb", nameKey: "it_that_diep_chi", descKey: "it_that_diep_chi_desc",
    price: 600, sell: 300, icon: "🌿",
    herbTier: 3, gatherMap: "U Minh Cốc",
    useFor: ["dan_cuu_chuyen", "dan_duong_anh", "dan_ho_mach", "dan_tu_than", "dan_co_ban"],
    doHiem: 3, doKho: 1,
  },
  huyen_thiet: { kind: "ore", nameKey: "it_huyen_thiet", descKey: "it_huyen_thiet_desc",
    price: 800, sell: 400, icon: "⛏️" },
  truc_co_thao: {
    kind: "herb", nameKey: "it_truc_co_thao", descKey: "it_truc_co_thao_desc",
    price: 250, sell: 125, icon: "🌿",
    herbTier: 2, gatherMap: "Rừng Trúc",
    useFor: ["pill_truccodan", "dan_boi_nguyen"],
    doHiem: 2, doKho: 0,
  },
  dia_linh_qua: {
    kind: "herb", nameKey: "it_dia_linh_qua", descKey: "it_dia_linh_qua_desc",
    price: 600, sell: 300, icon: "🍈",
    herbTier: 2, gatherMap: "Hắc Phong Lâm",
    useFor: ["dan_boi_nguyen", "dan_ngung_dan", "dan_cuu_chuyen"],
    doHiem: 2, doKho: 1,
  },
  pill_truccodan: {
    kind: "pill", nameKey: "it_pill_truccodan", descKey: "it_pill_truccodan_desc",
    price: 2000, sell: 600,
    doHiem: 3, doKho: 2,
    reqRealm: 2,
    congThuc: [["truc_co_thao",5], ["dia_linh_qua",3], ["yaodan1",1]],
    dotPhaBonus: 0.15, dotPhaRealm: 2,
  },
  /* --- Đan đột phá đại cảnh giới (Bui chốt: đột phá đại cảnh giới cần đan) --- */
  pill_kimdan: {
    kind: "pill", nameKey: "it_pill_kimdan", descKey: "it_pill_kimdan_desc",
    price: 8000, sell: 2400, icon: "🟡",
  },
  pill_nguyenanh: {
    kind: "pill", nameKey: "it_pill_nguyenanh", descKey: "it_pill_nguyenanh_desc",
    price: 20000, sell: 6000, icon: "🟠",
  },
  pill_hoathan: {
    kind: "pill", nameKey: "it_pill_hoathan", descKey: "it_pill_hoathan_desc",
    price: 50000, sell: 15000, icon: "🔴",
  },
  pill_luyenhu: {
    kind: "pill", nameKey: "it_pill_luyenhu", descKey: "it_pill_luyenhu_desc",
    price: 120000, sell: 36000, icon: "🟣",
  },
  pill_hopdao: {
    kind: "pill", nameKey: "it_pill_hopdao", descKey: "it_pill_hopdao_desc",
    price: 300000, sell: 90000, icon: "💜",
  },
  pill_dokiep: {
    kind: "pill", nameKey: "it_pill_dokiep", descKey: "it_pill_dokiep_desc",
    price: 800000, sell: 240000, icon: "⚡",
  },
  pill_taycotdan: {
    kind: "pill", nameKey: "it_pill_taycotdan", descKey: "it_pill_taycotdan_desc",
    taycot: 1, taycotGrade: 0, /* uống: +1 cấp Căn Cốt + roll/tăng phẩm chất căn cốt (taycot.js) */
    price: 1500, sell: 450, icon: "🟡",
    doHiem: 2, doKho: 1,
  },
  pill_taycotdan_trung: {
    kind: "pill", nameKey: "it_pill_taycotdan_trung", descKey: "it_pill_taycotdan_trung_desc",
    taycot: 2, taycotGrade: 1, /* trung phẩm: +2 cấp Căn Cốt, tỉ lệ phẩm cao hơn */
    price: 4000, sell: 1200, icon: "🔵",
    doHiem: 3, doKho: 1,
  },
  pill_taycotdan_thuong: {
    kind: "pill", nameKey: "it_pill_taycotdan_thuong", descKey: "it_pill_taycotdan_thuong_desc",
    taycot: 3, taycotGrade: 2, /* thượng phẩm: +3 cấp Căn Cốt */
    price: 10000, sell: 3000, icon: "🟣",
    doHiem: 4, doKho: 2,
  },
  pill_taycotdan_thien: {
    kind: "pill", nameKey: "it_pill_taycotdan_thien", descKey: "it_pill_taycotdan_thien_desc",
    taycot: 5, taycotGrade: 3, /* thiên phẩm: +5 cấp Căn Cốt, tỉ lệ phẩm cao nhất */
    price: 25000, sell: 7500, icon: "🟠",
    doHiem: 5, doKho: 3,
  },
  /* --- Khai Mạch Đan: mở thêm ngũ hành linh căn (luyện tại Đan Phòng, taycot.js) --- */
  pill_khaimachdan: {
    kind: "pill", nameKey: "it_pill_khaimachdan", descKey: "it_pill_khaimachdan_desc",
    khaimach: 1, /* mở 1 linh căn ngẫu nhiên chưa mở */
    price: 3000, sell: 900, icon: "🔴",
    doHiem: 3, doKho: 2,
  },
  pill_khaimachdan_trung: {
    kind: "pill", nameKey: "it_pill_khaimachdan_trung", descKey: "it_pill_khaimachdan_trung_desc",
    khaimach: 1, khaimachChoose: 1, /* mở 1 linh căn DO NGƯỜI CHƠI CHỌN */
    price: 8000, sell: 2400, icon: "🟥",
    doHiem: 4, doKho: 2,
  },
  pill_khaimachdan_thuong: {
    kind: "pill", nameKey: "it_pill_khaimachdan_thuong", descKey: "it_pill_khaimachdan_thuong_desc",
    khaimach: 2, /* mở 2 linh căn ngẫu nhiên cùng lúc */
    price: 20000, sell: 6000, icon: "❤️‍🔥",
    doHiem: 5, doKho: 3,
  },
  /* --- Nguyên liệu --- */
  taycothao: {
    kind: "material", nameKey: "it_taycothao", descKey: "it_taycothao_desc",
    price: 150, sell: 45,
    herbTier: 1, gatherMap: "Thảo Dược Cốc",
    useFor: ["pill_taycotdan", "pill_taycotdan_trung", "dan_tu_khi"],
    doHiem: 1, doKho: 0,
  },
  /* Nguyên liệu Huyết Ma Vực / Thái Hư Tiên Cảnh */
  huyet_tinh: {
    kind: "material", nameKey: "it_huyet_tinh", descKey: "it_huyet_tinh_desc",
    price: 300, sell: 90,
    herbTier: 4, gatherMap: "Huyết Ma Vực",
    useFor: ["dan_hu_linh", "dan_co_ban", "dan_hop_the", "dan_tien_linh"],
    doHiem: 4, doKho: 2,
  },
  oan_hon_thach: {
    kind: "material", nameKey: "it_oan_hon_thach", descKey: "it_oan_hon_thach_desc",
    price: 300, sell: 90,
  },
  tien_thao: {
    kind: "material", nameKey: "it_tien_thao", descKey: "it_tien_thao_desc",
    price: 350, sell: 100,
    herbTier: 4, gatherMap: "Thái Hư Tiên Cảnh",
    useFor: ["dan_ho_mach", "dan_than_du", "dan_tu_than", "dan_hu_linh", "dan_quy_nhat"],
    doHiem: 4, doKho: 2,
  },
  yaodan1: {
    kind: "yaodan", nameKey: "it_yaodan1", descKey: "it_yaodan1_desc",
    price: 500, sell: 150,
    ydTier: 1,
    doHiem: 2, doKho: 1,
    ydAtk: 50,
  },
  ttd_ha: {
    kind: "material", nameKey: "it_ttd_ha", descKey: "it_ttd_ha_desc",
    price: 200, sell: 66, icon: "\U0001f7e4", bcGrade: "ha",
  },
  dtd_ha: {
    kind: "material", nameKey: "it_dtd_ha", descKey: "it_dtd_ha_desc",
    price: 200, sell: 66, icon: "\U0001f52e", bcGrade: "ha",
  },
  ttd_trung: {
    kind: "material", nameKey: "it_ttd_trung", descKey: "it_ttd_trung_desc",
    price: 800, sell: 266, icon: "\U0001f7e4", bcGrade: "trung",
  },
  dtd_trung: {
    kind: "material", nameKey: "it_dtd_trung", descKey: "it_dtd_trung_desc",
    price: 800, sell: 266, icon: "\U0001f52e", bcGrade: "trung",
  },
  ttd_thuong: {
    kind: "material", nameKey: "it_ttd_thuong", descKey: "it_ttd_thuong_desc",
    price: 2500, sell: 833, icon: "\U0001f7e4", bcGrade: "thuong",
  },
  dtd_thuong: {
    kind: "material", nameKey: "it_dtd_thuong", descKey: "it_dtd_thuong_desc",
    price: 2500, sell: 833, icon: "\U0001f52e", bcGrade: "thuong",
  },
  ttd_cuc: {
    kind: "material", nameKey: "it_ttd_cuc", descKey: "it_ttd_cuc_desc",
    price: 6000, sell: 2000, icon: "\U0001f7e4", bcGrade: "cuc",
  },
  dtd_cuc: {
    kind: "material", nameKey: "it_dtd_cuc", descKey: "it_dtd_cuc_desc",
    price: 6000, sell: 2000, icon: "\U0001f52e", bcGrade: "cuc",
  },
  ttd_tien: {
    kind: "material", nameKey: "it_ttd_tien", descKey: "it_ttd_tien_desc",
    price: 15000, sell: 5000, icon: "\U0001f7e4", bcGrade: "tien",
  },
  dtd_tien: {
    kind: "material", nameKey: "it_dtd_tien", descKey: "it_dtd_tien_desc",
    price: 15000, sell: 5000, icon: "\U0001f52e", bcGrade: "tien",
  },
  ho_mach_dan: {
    kind: "material", nameKey: "it_ho_mach_dan", descKey: "it_ho_mach_dan_desc",
    price: 1200, sell: 360, icon: "\U0001f4a0",
  },
  yaodan2: {
    kind: "yaodan", nameKey: "it_yaodan2", descKey: "it_yaodan2_desc",
    price: 1500, sell: 500, icon: "\U0001f7e3", ydTier: 2,
    doHiem: 3, doKho: 1,
    ydAtk: 120,
  },
  yaodan3: {
    kind: "yaodan", nameKey: "it_yaodan3", descKey: "it_yaodan3_desc",
    price: 3000, sell: 1000, icon: "\U0001f7e3", ydTier: 3,
    doHiem: 4, doKho: 2,
    ydAtk: 250,
  },
  yaodan4: {
    kind: "yaodan", nameKey: "it_yaodan4", descKey: "it_yaodan4_desc",
    price: 6000, sell: 2000, icon: "\U0001f7e3", ydTier: 4,
    doHiem: 5, doKho: 2,
    ydAtk: 500,
  },
  yaodan5: {
    kind: "yaodan", nameKey: "it_yaodan5", descKey: "it_yaodan5_desc",
    price: 12000, sell: 4000, icon: "\U0001f7e3", ydTier: 5,
    doHiem: 6, doKho: 3,
    ydAtk: 1000,
  },
  yaodan1_hoa: {
    kind: "yaodan", nameKey: "it_yaodan1_hoa", descKey: "it_yaodan1_hoa_desc",
    price: 750, sell: 250, icon: "\U0001f7e3", ydTier: 1, ydElem: "hoa",
    doHiem: 2, doKho: 1,
    ydAtk: 50,
    ydBonusStat: "crit", ydBonusVal: 2,
  },
  yaodan1_loi: {
    kind: "yaodan", nameKey: "it_yaodan1_loi", descKey: "it_yaodan1_loi_desc",
    price: 750, sell: 250, icon: "\U0001f7e3", ydTier: 1, ydElem: "loi",
    doHiem: 2, doKho: 1,
    ydAtk: 50,
    ydBonusStat: "atk", ydBonusVal: 15,
  },
  yaodan1_bang: {
    kind: "yaodan", nameKey: "it_yaodan1_bang", descKey: "it_yaodan1_bang_desc",
    price: 750, sell: 250, icon: "\U0001f7e3", ydTier: 1, ydElem: "bang",
    doHiem: 2, doKho: 1,
    ydAtk: 50,
    ydBonusStat: "def", ydBonusVal: 15,
  },
  yaodan1_phong: {
    kind: "yaodan", nameKey: "it_yaodan1_phong", descKey: "it_yaodan1_phong_desc",
    price: 750, sell: 250, icon: "\U0001f7e3", ydTier: 1, ydElem: "phong",
    doHiem: 2, doKho: 1,
    ydAtk: 50,
    ydBonusStat: "hp", ydBonusVal: 150,
  },
  yaodan1_tho: {
    kind: "yaodan", nameKey: "it_yaodan1_tho", descKey: "it_yaodan1_tho_desc",
    price: 750, sell: 250, icon: "\U0001f7e3", ydTier: 1, ydElem: "tho",
    doHiem: 2, doKho: 1,
    ydAtk: 50,
    ydBonusStat: "armor", ydBonusVal: 15,
  },
  yaodan2_hoa: {
    kind: "yaodan", nameKey: "it_yaodan2_hoa", descKey: "it_yaodan2_hoa_desc",
    price: 2250, sell: 750, icon: "\U0001f7e3", ydTier: 2, ydElem: "hoa",
    doHiem: 3, doKho: 1,
    ydAtk: 120,
    ydBonusStat: "crit", ydBonusVal: 4,
  },
  yaodan2_loi: {
    kind: "yaodan", nameKey: "it_yaodan2_loi", descKey: "it_yaodan2_loi_desc",
    price: 2250, sell: 750, icon: "\U0001f7e3", ydTier: 2, ydElem: "loi",
    doHiem: 3, doKho: 1,
    ydAtk: 120,
    ydBonusStat: "atk", ydBonusVal: 35,
  },
  yaodan2_bang: {
    kind: "yaodan", nameKey: "it_yaodan2_bang", descKey: "it_yaodan2_bang_desc",
    price: 2250, sell: 750, icon: "\U0001f7e3", ydTier: 2, ydElem: "bang",
    doHiem: 3, doKho: 1,
    ydAtk: 120,
    ydBonusStat: "def", ydBonusVal: 35,
  },
  yaodan2_phong: {
    kind: "yaodan", nameKey: "it_yaodan2_phong", descKey: "it_yaodan2_phong_desc",
    price: 2250, sell: 750, icon: "\U0001f7e3", ydTier: 2, ydElem: "phong",
    doHiem: 3, doKho: 1,
    ydAtk: 120,
    ydBonusStat: "hp", ydBonusVal: 400,
  },
  yaodan2_tho: {
    kind: "yaodan", nameKey: "it_yaodan2_tho", descKey: "it_yaodan2_tho_desc",
    price: 2250, sell: 750, icon: "\U0001f7e3", ydTier: 2, ydElem: "tho",
    doHiem: 3, doKho: 1,
    ydAtk: 120,
    ydBonusStat: "armor", ydBonusVal: 35,
  },
  yaodan3_hoa: {
    kind: "yaodan", nameKey: "it_yaodan3_hoa", descKey: "it_yaodan3_hoa_desc",
    price: 4500, sell: 1500, icon: "\U0001f7e3", ydTier: 3, ydElem: "hoa",
    doHiem: 4, doKho: 2,
    ydAtk: 250,
    ydBonusStat: "crit", ydBonusVal: 6,
  },
  yaodan3_loi: {
    kind: "yaodan", nameKey: "it_yaodan3_loi", descKey: "it_yaodan3_loi_desc",
    price: 4500, sell: 1500, icon: "\U0001f7e3", ydTier: 3, ydElem: "loi",
    doHiem: 4, doKho: 2,
    ydAtk: 250,
    ydBonusStat: "atk", ydBonusVal: 75,
  },
  yaodan3_bang: {
    kind: "yaodan", nameKey: "it_yaodan3_bang", descKey: "it_yaodan3_bang_desc",
    price: 4500, sell: 1500, icon: "\U0001f7e3", ydTier: 3, ydElem: "bang",
    doHiem: 4, doKho: 2,
    ydAtk: 250,
    ydBonusStat: "def", ydBonusVal: 75,
  },
  yaodan3_phong: {
    kind: "yaodan", nameKey: "it_yaodan3_phong", descKey: "it_yaodan3_phong_desc",
    price: 4500, sell: 1500, icon: "\U0001f7e3", ydTier: 3, ydElem: "phong",
    doHiem: 4, doKho: 2,
    ydAtk: 250,
    ydBonusStat: "hp", ydBonusVal: 900,
  },
  yaodan3_tho: {
    kind: "yaodan", nameKey: "it_yaodan3_tho", descKey: "it_yaodan3_tho_desc",
    price: 4500, sell: 1500, icon: "\U0001f7e3", ydTier: 3, ydElem: "tho",
    doHiem: 4, doKho: 2,
    ydAtk: 250,
    ydBonusStat: "armor", ydBonusVal: 75,
  },
  yaodan4_hoa: {
    kind: "yaodan", nameKey: "it_yaodan4_hoa", descKey: "it_yaodan4_hoa_desc",
    price: 9000, sell: 3000, icon: "\U0001f7e3", ydTier: 4, ydElem: "hoa",
    doHiem: 5, doKho: 2,
    ydAtk: 500,
    ydBonusStat: "crit", ydBonusVal: 8,
  },
  yaodan4_loi: {
    kind: "yaodan", nameKey: "it_yaodan4_loi", descKey: "it_yaodan4_loi_desc",
    price: 9000, sell: 3000, icon: "\U0001f7e3", ydTier: 4, ydElem: "loi",
    doHiem: 5, doKho: 2,
    ydAtk: 500,
    ydBonusStat: "atk", ydBonusVal: 150,
  },
  yaodan4_bang: {
    kind: "yaodan", nameKey: "it_yaodan4_bang", descKey: "it_yaodan4_bang_desc",
    price: 9000, sell: 3000, icon: "\U0001f7e3", ydTier: 4, ydElem: "bang",
    doHiem: 5, doKho: 2,
    ydAtk: 500,
    ydBonusStat: "def", ydBonusVal: 150,
  },
  yaodan4_phong: {
    kind: "yaodan", nameKey: "it_yaodan4_phong", descKey: "it_yaodan4_phong_desc",
    price: 9000, sell: 3000, icon: "\U0001f7e3", ydTier: 4, ydElem: "phong",
    doHiem: 5, doKho: 2,
    ydAtk: 500,
    ydBonusStat: "hp", ydBonusVal: 2000,
  },
  yaodan4_tho: {
    kind: "yaodan", nameKey: "it_yaodan4_tho", descKey: "it_yaodan4_tho_desc",
    price: 9000, sell: 3000, icon: "\U0001f7e3", ydTier: 4, ydElem: "tho",
    doHiem: 5, doKho: 2,
    ydAtk: 500,
    ydBonusStat: "armor", ydBonusVal: 150,
  },
  yaodan5_hoa: {
    kind: "yaodan", nameKey: "it_yaodan5_hoa", descKey: "it_yaodan5_hoa_desc",
    price: 18000, sell: 6000, icon: "\U0001f7e3", ydTier: 5, ydElem: "hoa",
    doHiem: 6, doKho: 3,
    ydAtk: 1000,
    ydBonusStat: "crit", ydBonusVal: 12,
  },
  yaodan5_loi: {
    kind: "yaodan", nameKey: "it_yaodan5_loi", descKey: "it_yaodan5_loi_desc",
    price: 18000, sell: 6000, icon: "\U0001f7e3", ydTier: 5, ydElem: "loi",
    doHiem: 6, doKho: 3,
    ydAtk: 1000,
    ydBonusStat: "atk", ydBonusVal: 300,
  },
  yaodan5_bang: {
    kind: "yaodan", nameKey: "it_yaodan5_bang", descKey: "it_yaodan5_bang_desc",
    price: 18000, sell: 6000, icon: "\U0001f7e3", ydTier: 5, ydElem: "bang",
    doHiem: 6, doKho: 3,
    ydAtk: 1000,
    ydBonusStat: "def", ydBonusVal: 300,
  },
  yaodan5_phong: {
    kind: "yaodan", nameKey: "it_yaodan5_phong", descKey: "it_yaodan5_phong_desc",
    price: 18000, sell: 6000, icon: "\U0001f7e3", ydTier: 5, ydElem: "phong",
    doHiem: 6, doKho: 3,
    ydAtk: 1000,
    ydBonusStat: "hp", ydBonusVal: 4500,
  },
  yaodan5_tho: {
    kind: "yaodan", nameKey: "it_yaodan5_tho", descKey: "it_yaodan5_tho_desc",
    price: 18000, sell: 6000, icon: "\U0001f7e3", ydTier: 5, ydElem: "tho",
    doHiem: 6, doKho: 3,
    ydAtk: 1000,
    ydBonusStat: "armor", ydBonusVal: 300,
  },
  khaiphongphu: {
    kind: "material", nameKey: "it_khaiphongphu", descKey: "it_khaiphongphu_desc",
    price: 300, sell: 90, icon: "assets/icons/khaiphongphu.png",
  },
  /* --- Trang bị tier 0 (Phàm phẩm) --- */
  wpn_go: {
    kind: "equip", nameKey: "it_wpn_go", slot: "vukhi", tier: 0,
    atk: 5, price: 50, sell: 15, reqRealm: null,
  },
  wpn_phan: {
    kind: "equip", nameKey: "it_wpn_phan", slot: "vukhi", tier: 0,
    atk: 10, price: 200, sell: 60, reqRealm: null,
  },
  arm_phan: {
    kind: "equip", nameKey: "it_arm_phan", slot: "giap", tier: 0,
    def: 8, hp: 50, price: 180, sell: 54, reqRealm: null,
  },
  acc_phan: {
    kind: "equip", nameKey: "it_acc_phan", slot: "phapboi", tier: 0,
    atk: 4, def: 4, hp: 30, price: 150, sell: 45, reqRealm: null,
  },
  /* --- Trang bị tier 1 (Linh phẩm) --- */
  wpn_linh: {
    kind: "equip", nameKey: "it_wpn_linh", slot: "vukhi", tier: 1,
    atk: 35, price: 1200, sell: 360, reqRealm: { realm: 1, tier: 3 },
  },
  arm_linh: {
    kind: "equip", nameKey: "it_arm_linh", slot: "giap", tier: 1,
    def: 25, hp: 150, price: 1000, sell: 300, reqRealm: { realm: 1, tier: 3 },
  },
  acc_linh: {
    kind: "equip", nameKey: "it_acc_linh", slot: "phapboi", tier: 1,
    atk: 12, def: 12, hp: 80, price: 800, sell: 240, reqRealm: { realm: 1, tier: 3 },
  },
  /* --- Ngọc Bội Trường Sinh: đeo giảm 15% tốc độ trừ thọ nguyên --- */
  ngoc_boi_truong_sinh: {
    kind: "equip", nameKey: "it_ngoc_boi_truong_sinh", descKey: "it_ngoc_boi_truong_sinh_desc",
    slot: "phapbao", tier: 1, tnDrainRed: 0.15,
    price: 5000, sell: 1500, reqRealm: 1, icon: "🧧",
  },
  /* --- Trang bị chuẩn theo cảnh giới (tự sinh) --- */
  eq_r2_vukhi: {
    kind: "equip", nameKey: "it_eq_r2_vukhi", slot: "vukhi", tier: 1, rarity: "uu",
    atk: 105, price: 1260, sell: 420, reqRealm: 2,
    skillLine: [
      { skill: "sword_qi", lv: 1 }
    ]
  },
  eq_r2_giap: {
    kind: "equip", nameKey: "it_eq_r2_giap", slot: "giap", tier: 1, rarity: "uu",
    def: 49, hp: 255, price: 756, sell: 252, reqRealm: 2
  },
  eq_r2_yphuc: {
    kind: "equip", nameKey: "it_eq_r2_yphuc", slot: "yphuc", tier: 1, rarity: "uu",
    def: 35, hp: 340, price: 1020, sell: 340, reqRealm: 2
  },
  eq_r2_phapbao: {
    kind: "equip", nameKey: "it_eq_r2_phapbao", slot: "phapbao", tier: 1, rarity: "uu",
    atk: 42, def: 28, hp: 170, price: 504, sell: 168, reqRealm: 2
  },
  eq_r2_phapboi: {
    kind: "equip", nameKey: "it_eq_r2_phapboi", slot: "phapboi", tier: 1, rarity: "uu",
    atk: 32, mp: 212, price: 500, sell: 166, reqRealm: 2
  },
  eq_r2_linhgioi: {
    kind: "equip", nameKey: "it_eq_r2_linhgioi", slot: "linhgioi", tier: 1, rarity: "uu",
    atk: 32, hp: 128, price: 500, sell: 166, reqRealm: 2
  },
  eq_r2_hanhngoa: {
    kind: "equip", nameKey: "it_eq_r2_hanhngoa", slot: "hanhngoa", tier: 1, rarity: "uu",
    def: 21, hp: 170, price: 504, sell: 168, reqRealm: 2
  },
  eq_r2_huanh: {
    kind: "equip", nameKey: "it_eq_r2_huanh", slot: "huanh", tier: 1, rarity: "uu",
    atk: 21, def: 21, hp: 128, price: 500, sell: 166, reqRealm: 2
  },
  eq_r2_phihanh: {
    kind: "equip", nameKey: "it_eq_r2_phihanh", slot: "phihanh", tier: 1, rarity: "uu",
    def: 14, hp: 212, price: 636, sell: 212, reqRealm: 2
  },
  eq_r3_vukhi: {
    kind: "equip", nameKey: "it_eq_r3_vukhi", slot: "vukhi", tier: 1, rarity: "uu",
    atk: 290, price: 3480, sell: 1160, reqRealm: 3,
    skillLine: [
      { skill: "sword_qi", lv: 1 }
    ]
  },
  eq_r3_giap: {
    kind: "equip", nameKey: "it_eq_r3_giap", slot: "giap", tier: 1, rarity: "uu",
    def: 130, hp: 660, price: 1980, sell: 660, reqRealm: 3,
    skillLine: [
      { stat: "maxHp", pct: 0.05 }
    ]
  },
  eq_r3_yphuc: {
    kind: "equip", nameKey: "it_eq_r3_yphuc", slot: "yphuc", tier: 1, rarity: "uu",
    def: 92, hp: 880, price: 2640, sell: 880, reqRealm: 3,
    skillLine: [
      { stat: "maxHp", pct: 0.05 }
    ]
  },
  eq_r3_phapbao: {
    kind: "equip", nameKey: "it_eq_r3_phapbao", slot: "phapbao", tier: 1, rarity: "uu",
    atk: 116, def: 74, hp: 440, price: 1392, sell: 464, reqRealm: 3
  },
  eq_r3_phapboi: {
    kind: "equip", nameKey: "it_eq_r3_phapboi", slot: "phapboi", tier: 1, rarity: "uu",
    atk: 87, mp: 550, price: 1044, sell: 348, reqRealm: 3,
    skillLine: [
      { stat: "maxMp", pct: 0.10 }
    ]
  },
  eq_r3_linhgioi: {
    kind: "equip", nameKey: "it_eq_r3_linhgioi", slot: "linhgioi", tier: 1, rarity: "uu",
    atk: 87, hp: 330, price: 1044, sell: 348, reqRealm: 3
  },
  eq_r3_hanhngoa: {
    kind: "equip", nameKey: "it_eq_r3_hanhngoa", slot: "hanhngoa", tier: 1, rarity: "uu",
    def: 56, hp: 440, price: 1320, sell: 440, reqRealm: 3
  },
  eq_r3_huanh: {
    kind: "equip", nameKey: "it_eq_r3_huanh", slot: "huanh", tier: 1, rarity: "uu",
    atk: 58, def: 56, hp: 330, price: 984, sell: 328, reqRealm: 3
  },
  eq_r3_phihanh: {
    kind: "equip", nameKey: "it_eq_r3_phihanh", slot: "phihanh", tier: 1, rarity: "uu",
    def: 37, hp: 550, price: 1644, sell: 548, reqRealm: 3
  },
  eq_r4_vukhi: {
    kind: "equip", nameKey: "it_eq_r4_vukhi", slot: "vukhi", tier: 2, rarity: "hiem",
    atk: 675, price: 8100, sell: 2700, reqRealm: 4,
    skillLine: [
      { skill: "sword_qi", lv: 2 }
    ]
  },
  eq_r4_giap: {
    kind: "equip", nameKey: "it_eq_r4_giap", slot: "giap", tier: 2, rarity: "hiem",
    def: 315, hp: 1590, price: 4764, sell: 1588, reqRealm: 4,
    skillLine: [
      { stat: "maxHp", pct: 0.05 }
    ]
  },
  eq_r4_yphuc: {
    kind: "equip", nameKey: "it_eq_r4_yphuc", slot: "yphuc", tier: 2, rarity: "hiem",
    def: 225, hp: 2120, price: 6360, sell: 2120, reqRealm: 4,
    skillLine: [
      { stat: "maxHp", pct: 0.05 }
    ]
  },
  eq_r4_phapbao: {
    kind: "equip", nameKey: "it_eq_r4_phapbao", slot: "phapbao", tier: 2, rarity: "hiem",
    atk: 270, def: 180, hp: 1060, price: 3240, sell: 1080, reqRealm: 4
  },
  eq_r4_phapboi: {
    kind: "equip", nameKey: "it_eq_r4_phapboi", slot: "phapboi", tier: 2, rarity: "hiem",
    atk: 202, mp: 1325, price: 2424, sell: 808, reqRealm: 4,
    skillLine: [
      { stat: "maxMp", pct: 0.10 }
    ]
  },
  eq_r4_linhgioi: {
    kind: "equip", nameKey: "it_eq_r4_linhgioi", slot: "linhgioi", tier: 2, rarity: "hiem",
    atk: 202, hp: 795, price: 2424, sell: 808, reqRealm: 4,
    skillLine: [
      { stat: "atk", pct: 0.05 }
    ]
  },
  eq_r4_hanhngoa: {
    kind: "equip", nameKey: "it_eq_r4_hanhngoa", slot: "hanhngoa", tier: 2, rarity: "hiem",
    def: 135, hp: 1060, price: 3180, sell: 1060, reqRealm: 4
  },
  eq_r4_huanh: {
    kind: "equip", nameKey: "it_eq_r4_huanh", slot: "huanh", tier: 2, rarity: "hiem",
    atk: 135, def: 135, hp: 795, price: 2376, sell: 792, reqRealm: 4
  },
  eq_r4_phihanh: {
    kind: "equip", nameKey: "it_eq_r4_phihanh", slot: "phihanh", tier: 2, rarity: "hiem",
    def: 90, hp: 1325, price: 3972, sell: 1324, reqRealm: 4,
    skillLine: [
      { stat: "def", pct: 0.05 }
    ]
  },
  eq_r5_vukhi: {
    kind: "equip", nameKey: "it_eq_r5_vukhi", slot: "vukhi", tier: 2, rarity: "hiem",
    atk: 1500, price: 18000, sell: 6000, reqRealm: 5,
    skillLine: [
      { skill: "sword_qi", lv: 2 }
    ]
  },
  eq_r5_giap: {
    kind: "equip", nameKey: "it_eq_r5_giap", slot: "giap", tier: 2, rarity: "hiem",
    def: 735, hp: 3600, price: 10800, sell: 3600, reqRealm: 5,
    skillLine: [
      { stat: "maxHp", pct: 0.10 }
    ]
  },
  eq_r5_yphuc: {
    kind: "equip", nameKey: "it_eq_r5_yphuc", slot: "yphuc", tier: 2, rarity: "hiem",
    def: 525, hp: 4800, price: 14400, sell: 4800, reqRealm: 5,
    skillLine: [
      { stat: "maxHp", pct: 0.10 }
    ]
  },
  eq_r5_phapbao: {
    kind: "equip", nameKey: "it_eq_r5_phapbao", slot: "phapbao", tier: 2, rarity: "hiem",
    atk: 600, def: 420, hp: 2400, price: 7200, sell: 2400, reqRealm: 5
  },
  eq_r5_phapboi: {
    kind: "equip", nameKey: "it_eq_r5_phapboi", slot: "phapboi", tier: 2, rarity: "hiem",
    atk: 450, mp: 3000, price: 5400, sell: 1800, reqRealm: 5,
    skillLine: [
      { stat: "maxMp", pct: 0.10 }
    ]
  },
  eq_r5_linhgioi: {
    kind: "equip", nameKey: "it_eq_r5_linhgioi", slot: "linhgioi", tier: 2, rarity: "hiem",
    atk: 450, hp: 1800, price: 5400, sell: 1800, reqRealm: 5,
    skillLine: [
      { stat: "atk", pct: 0.05 }
    ]
  },
  eq_r5_hanhngoa: {
    kind: "equip", nameKey: "it_eq_r5_hanhngoa", slot: "hanhngoa", tier: 2, rarity: "hiem",
    def: 315, hp: 2400, price: 7200, sell: 2400, reqRealm: 5
  },
  eq_r5_huanh: {
    kind: "equip", nameKey: "it_eq_r5_huanh", slot: "huanh", tier: 2, rarity: "hiem",
    atk: 300, def: 315, hp: 1800, price: 5400, sell: 1800, reqRealm: 5
  },
  eq_r5_phihanh: {
    kind: "equip", nameKey: "it_eq_r5_phihanh", slot: "phihanh", tier: 2, rarity: "hiem",
    def: 210, hp: 3000, price: 9000, sell: 3000, reqRealm: 5,
    skillLine: [
      { stat: "def", pct: 0.05 }
    ]
  },
  eq_r6_vukhi: {
    kind: "equip", nameKey: "it_eq_r6_vukhi", slot: "vukhi", tier: 3, rarity: "suth",
    atk: 3300, price: 39600, sell: 13200, reqRealm: 6,
    skillLine: [
      { skill: "sword_qi", lv: 3 }
    ]
  },
  eq_r6_giap: {
    kind: "equip", nameKey: "it_eq_r6_giap", slot: "giap", tier: 3, rarity: "suth",
    def: 1617, hp: 7920, price: 23760, sell: 7920, reqRealm: 6,
    skillLine: [
      { stat: "maxHp", pct: 0.10 }
    ]
  },
  eq_r6_yphuc: {
    kind: "equip", nameKey: "it_eq_r6_yphuc", slot: "yphuc", tier: 3, rarity: "suth",
    def: 1155, hp: 10560, price: 31680, sell: 10560, reqRealm: 6,
    skillLine: [
      { stat: "maxHp", pct: 0.10 }
    ]
  },
  eq_r6_phapbao: {
    kind: "equip", nameKey: "it_eq_r6_phapbao", slot: "phapbao", tier: 3, rarity: "suth",
    atk: 1320, def: 924, hp: 5280, price: 15840, sell: 5280, reqRealm: 6
  },
  eq_r6_phapboi: {
    kind: "equip", nameKey: "it_eq_r6_phapboi", slot: "phapboi", tier: 3, rarity: "suth",
    atk: 990, mp: 6600, price: 11880, sell: 3960, reqRealm: 6,
    skillLine: [
      { stat: "maxMp", pct: 0.10 }
    ]
  },
  eq_r6_linhgioi: {
    kind: "equip", nameKey: "it_eq_r6_linhgioi", slot: "linhgioi", tier: 3, rarity: "suth",
    atk: 990, hp: 3960, price: 11880, sell: 3960, reqRealm: 6,
    skillLine: [
      { stat: "atk", pct: 0.05 }
    ]
  },
  eq_r6_hanhngoa: {
    kind: "equip", nameKey: "it_eq_r6_hanhngoa", slot: "hanhngoa", tier: 3, rarity: "suth",
    def: 693, hp: 5280, price: 15840, sell: 5280, reqRealm: 6
  },
  eq_r6_huanh: {
    kind: "equip", nameKey: "it_eq_r6_huanh", slot: "huanh", tier: 3, rarity: "suth",
    atk: 660, def: 693, hp: 3960, price: 11880, sell: 3960, reqRealm: 6
  },
  eq_r6_phihanh: {
    kind: "equip", nameKey: "it_eq_r6_phihanh", slot: "phihanh", tier: 3, rarity: "suth",
    def: 462, hp: 6600, price: 19800, sell: 6600, reqRealm: 6,
    skillLine: [
      { stat: "def", pct: 0.05 }
    ]
  },
  eq_r7_vukhi: {
    kind: "equip", nameKey: "it_eq_r7_vukhi", slot: "vukhi", tier: 3, rarity: "suth",
    atk: 7260, price: 87120, sell: 29040, reqRealm: 7,
    skillLine: [
      { skill: "sword_qi", lv: 3 }
    ]
  },
  eq_r7_giap: {
    kind: "equip", nameKey: "it_eq_r7_giap", slot: "giap", tier: 3, rarity: "suth",
    def: 3557, hp: 17424, price: 52272, sell: 17424, reqRealm: 7,
    skillLine: [
      { stat: "maxHp", pct: 0.10 }
    ]
  },
  eq_r7_yphuc: {
    kind: "equip", nameKey: "it_eq_r7_yphuc", slot: "yphuc", tier: 3, rarity: "suth",
    def: 2541, hp: 23232, price: 69696, sell: 23232, reqRealm: 7,
    skillLine: [
      { stat: "maxHp", pct: 0.10 }
    ]
  },
  eq_r7_phapbao: {
    kind: "equip", nameKey: "it_eq_r7_phapbao", slot: "phapbao", tier: 3, rarity: "suth",
    atk: 2904, def: 2033, hp: 11616, price: 34848, sell: 11616, reqRealm: 7
  },
  eq_r7_phapboi: {
    kind: "equip", nameKey: "it_eq_r7_phapboi", slot: "phapboi", tier: 3, rarity: "suth",
    atk: 2178, mp: 14520, price: 26136, sell: 8712, reqRealm: 7,
    skillLine: [
      { stat: "maxMp", pct: 0.10 }
    ]
  },
  eq_r7_linhgioi: {
    kind: "equip", nameKey: "it_eq_r7_linhgioi", slot: "linhgioi", tier: 3, rarity: "suth",
    atk: 2178, hp: 8712, price: 26136, sell: 8712, reqRealm: 7,
    skillLine: [
      { stat: "atk", pct: 0.05 }
    ]
  },
  eq_r7_hanhngoa: {
    kind: "equip", nameKey: "it_eq_r7_hanhngoa", slot: "hanhngoa", tier: 3, rarity: "suth",
    def: 1525, hp: 11616, price: 34848, sell: 11616, reqRealm: 7
  },
  eq_r7_huanh: {
    kind: "equip", nameKey: "it_eq_r7_huanh", slot: "huanh", tier: 3, rarity: "suth",
    atk: 1452, def: 1525, hp: 8712, price: 26136, sell: 8712, reqRealm: 7
  },
  eq_r7_phihanh: {
    kind: "equip", nameKey: "it_eq_r7_phihanh", slot: "phihanh", tier: 3, rarity: "suth",
    def: 1016, hp: 14520, price: 43560, sell: 14520, reqRealm: 7,
    skillLine: [
      { stat: "def", pct: 0.05 }
    ]
  },
  duong_linh_dan: {
    kind: "pill", nameKey: "it_duong_linh_dan", descKey: "it_duong_linh_dan_desc",
    price: 5000, sell: 1500, icon: "💫",
  },
  da_cuong_hoa: {
    kind: "material", nameKey: "it_da_cuong_hoa", descKey: "it_da_cuong_hoa_desc",
    price: 800, sell: 240, icon: "💎",
  },

  /* --- Bí tịch (kind: manual): học trong túi → mở khóa skill tương ứng.
     tier 0=Phàm / 1=Địa / 2=Thiên; skill: id trong SECT_SKILLS;
     passive: id trong PASSIVE_DEFS (bí tịch bị động);
     realm: cảnh giới yêu cầu (1=Luyện Khí, 3=Kim Đan);
     learnCost: Linh Thạch tốn khi bấm "Học" (0 = miễn phí).
     Giá bán theo phẩm (Bui chốt): Phàm 50 / Địa 300 / Thiên 1500. --- */
  manual_kiem_1: {
    kind: "manual", tier: 0, skill: "kiem_xuyen_van", learnCost: 0, realm: 1,
    nameKey: "it_manual_kiem_1", descKey: "it_manual_kiem_1_desc",
    price: 300, sell: 50,
  },
  manual_kiem_2: {
    kind: "manual", tier: 1, skill: "van_kiem_quy_tong", learnCost: 500, realm: 1,
    nameKey: "it_manual_kiem_2", descKey: "it_manual_kiem_2_desc",
    price: 1200, sell: 300,
  },
  manual_kiem_3: {
    kind: "manual", tier: 2, skill: "kiem_cuong_ho_the", learnCost: 1500, realm: 1,
    nameKey: "it_manual_kiem_3", descKey: "it_manual_kiem_3_desc",
    price: 3000, sell: 1500,
  },
  manual_phap_1: {
    kind: "manual", tier: 0, skill: "ngu_loi_oanh_dinh", learnCost: 0, realm: 1,
    nameKey: "it_manual_phap_1", descKey: "it_manual_phap_1_desc",
    price: 300, sell: 50,
  },
  manual_phap_2: {
    kind: "manual", tier: 1, skill: "hoa_vu_luu_tinh", learnCost: 500, realm: 1,
    nameKey: "it_manual_phap_2", descKey: "it_manual_phap_2_desc",
    price: 1200, sell: 300,
  },
  manual_phap_3: {
    kind: "manual", tier: 2, skill: "linh_thuan", learnCost: 1500, realm: 1,
    nameKey: "it_manual_phap_3", descKey: "it_manual_phap_3_desc",
    price: 3000, sell: 1500,
  },
  manual_the_1: {
    kind: "manual", tier: 0, skill: "ba_vuong_quyen", learnCost: 0, realm: 1,
    nameKey: "it_manual_the_1", descKey: "it_manual_the_1_desc",
    price: 300, sell: 50,
  },
  manual_the_2: {
    kind: "manual", tier: 1, skill: "chan_dia_chuong", learnCost: 500, realm: 1,
    nameKey: "it_manual_the_2", descKey: "it_manual_the_2_desc",
    price: 1200, sell: 300,
  },
  manual_the_3: {
    kind: "manual", tier: 2, skill: "kim_cuong_bat_hoai", learnCost: 1500, realm: 1,
    nameKey: "it_manual_the_3", descKey: "it_manual_the_3_desc",
    price: 3000, sell: 1500,
  },
  /* --- Bí tịch bị động (passive) --- */
  manual_ps_kiem_tam: {
    kind: "manual", tier: 1, passive: "kiem_tam", learnCost: 800, realm: 1,
    nameKey: "it_manual_ps_kiem_tam", descKey: "it_manual_ps_kiem_tam_desc",
    price: 1500, sell: 300,
  },
  manual_ps_linh_mach: {
    kind: "manual", tier: 1, passive: "linh_mach", learnCost: 800, realm: 1,
    nameKey: "it_manual_ps_linh_mach", descKey: "it_manual_ps_linh_mach_desc",
    price: 1500, sell: 300,
  },
  manual_ps_the_phach: {
    kind: "manual", tier: 0, passive: "the_phach", learnCost: 300, realm: 1,
    nameKey: "it_manual_ps_the_phach", descKey: "it_manual_ps_the_phach_desc",
    price: 600, sell: 50,
  },
  manual_ps_than_phap: {
    kind: "manual", tier: 0, passive: "than_phap", learnCost: 300, realm: 1,
    nameKey: "it_manual_ps_than_phap", descKey: "it_manual_ps_than_phap_desc",
    price: 600, sell: 50,
  },
  /* --- Trường Sinh Quyết: bị động tăng thọ nguyên (+30 năm/cấp) --- */
  manual_truong_sinh: {
    kind: "manual", tier: 1, passive: "truong_sinh_quyet", learnCost: 800, realm: 1,
    nameKey: "it_manual_truong_sinh", descKey: "it_manual_truong_sinh_desc",
    price: 1500, sell: 300,
  },
  /* --- Bí tịch Kim Đan (mẫu demo cơ chế khóa theo cảnh giới, realm 3) --- */
  manual_kimdan_kiem: {
    kind: "manual", tier: 2, skill: "kimdan_kiem_y", learnCost: 3000, realm: 3,
    nameKey: "it_manual_kimdan_kiem", descKey: "it_manual_kimdan_kiem_desc",
    price: 8000, sell: 1500,
  },
  manual_kimdan_phap: {
    kind: "manual", tier: 2, skill: "kimdan_loi_phap", learnCost: 3000, realm: 3,
    nameKey: "it_manual_kimdan_phap", descKey: "it_manual_kimdan_phap_desc",
    price: 8000, sell: 1500,
  },
  manual_kimdan_the: {
    kind: "manual", tier: 2, skill: "kimdan_the_quyen", learnCost: 3000, realm: 3,
    nameKey: "it_manual_kimdan_the", descKey: "it_manual_kimdan_the_desc",
    price: 8000, sell: 1500,
  },
  /* --- Bí tịch độc quyền Dược Vương Tông --- */
  manual_duoc_1: {
    kind: "manual", tier: 1, skill: "dan_hoa_ho_the", learnCost: 800, realm: 1,
    exclusive: true,
    nameKey: "it_manual_duoc_1", descKey: "it_manual_duoc_1_desc",
    price: 2000, sell: 300,
    skillDef: {
      kind: "buff",
      mp: 25,
      cd: 20,
      dtype: "duoc",
      elem: "hoa",
      rng: 0,
      dao: "chinh",
      icon: "💊",
      effect_sheet: "eff_fire_sheet",
      effect_mau: "#66bb6a",
      nameKey: "sk_dan_hoa_ho_the",
      descKey: "sk_dan_hoa_ho_the_desc",
      mult: 0,
      defMult: 1.5,
      dur: 15
    },
    dieu_kien_mo: {
      tong: "duoc_vuong_tong"
    }
  },
  manual_duoc_2: {
    kind: "manual", tier: 1, passive: "duoc_tam", learnCost: 800, realm: 1,
    exclusive: true,
    nameKey: "it_manual_duoc_2", descKey: "it_manual_duoc_2_desc",
    price: 2000, sell: 300,
    dieu_kien_mo: {
      tong: "duoc_vuong_tong"
    }
  },
  manual_duoc_3: {
    kind: "manual", tier: 2, passive: "hoi_xuan", learnCost: 1500, realm: 1,
    exclusive: true,
    nameKey: "it_manual_duoc_3", descKey: "it_manual_duoc_3_desc",
    price: 4000, sell: 1500,
    dieu_kien_mo: {
      tong: "duoc_vuong_tong"
    }
  },
  /* --- Bí tịch độc quyền Ngự Thú Tông --- */
  manual_thu_1: {
    kind: "manual", tier: 1, skill: "thu_vuong_trao", learnCost: 800, realm: 1,
    exclusive: true,
    nameKey: "it_manual_thu_1", descKey: "it_manual_thu_1_desc",
    price: 2000, sell: 300,
    skillDef: {
      kind: "dmg",
      mp: 30,
      cd: 12,
      dtype: "thu",
      elem: "moc",
      rng: 220,
      dao: "trung",
      icon: "🐯",
      effect_sheet: "eff_slash_sheet",
      effect_mau: "#ffb300",
      nameKey: "sk_thu_vuong_trao",
      descKey: "sk_thu_vuong_trao_desc",
      mult: 3.0,
      fxStatus: {
        fear: 2
      }
    },
    dieu_kien_mo: {
      tong: "ngu_thu_tong"
    }
  },
  /* --- Bí tịch signature các tông (đợt 2) --- */
  manual_kiem_4: {
    kind: "manual", tier: 2, skill: "ngu_kiem_phi_hanh", learnCost: 1500, realm: 2,
    exclusive: true,
    nameKey: "it_manual_kiem_4", descKey: "it_manual_kiem_4_desc",
    price: 4000, sell: 1500,
    skillDef: {
      kind: "buff", mp: 30, cd: 25, dtype: "kiem", elem: "kim", rng: 0,
      dao: "chinh", icon: "🗡️",
      effect_sheet: "eff_swordshadow_sheet", effect_mau: "#cfe8ff",
      nameKey: "sk_ngu_kiem_phi_hanh", descKey: "sk_ngu_kiem_phi_hanh_desc",
      mult: 0, defMult: 1.4, dur: 20
    },
    dieu_kien_mo: { tong: "kiem_tong" }
  },
  manual_phap_4: {
    kind: "manual", tier: 2, skill: "thien_loi_dan", learnCost: 1500, realm: 2,
    exclusive: true,
    nameKey: "it_manual_phap_4", descKey: "it_manual_phap_4_desc",
    price: 4000, sell: 1500,
    skillDef: {
      kind: "dmg", mp: 45, cd: 16, dtype: "phap", elem: "loi", rng: 240,
      dao: "chinh", icon: "⚡",
      effect_sheet: "eff_lightning_sheet", effect_mau: "#b388ff",
      nameKey: "sk_thien_loi_dan", descKey: "sk_thien_loi_dan_desc",
      mult: 4.5, fxStatus: { stun: 1 }
    },
    dieu_kien_mo: { tong: "thien_phap_tong" }
  },
  manual_phap_5: {
    kind: "manual", tier: 1, passive: "ngu_hanh_phap_chu", learnCost: 800, realm: 1,
    exclusive: true,
    nameKey: "it_manual_phap_5", descKey: "it_manual_phap_5_desc",
    price: 2000, sell: 300,
    passiveDef: {
      icon: "🔮", sp: 2, realm: 1, perLevel: "10% maxMp",
      nameKey: "ps_ngu_hanh_phap_chu", descKey: "ps_ngu_hanh_phap_chu_desc"
    },
    dieu_kien_mo: { tong: "thien_phap_tong" }
  },
  manual_the_4: {
    kind: "manual", tier: 1, skill: "la_han_quyen", learnCost: 800, realm: 2,
    exclusive: true,
    nameKey: "it_manual_the_4", descKey: "it_manual_the_4_desc",
    price: 2000, sell: 300,
    skillDef: {
      kind: "dmg", mp: 25, cd: 10, dtype: "the", elem: "tho", rng: 200,
      dao: "chinh", icon: "👊",
      effect_sheet: "eff_formation_sheet", effect_mau: "#ffcc80",
      nameKey: "sk_la_han_quyen", descKey: "sk_la_han_quyen_desc",
      mult: 3.0
    },
    dieu_kien_mo: { tong: "kim_cang_tong" }
  },
  manual_the_5: {
    kind: "manual", tier: 1, skill: "su_tu_hong", learnCost: 800, realm: 2,
    exclusive: true,
    nameKey: "it_manual_the_5", descKey: "it_manual_the_5_desc",
    price: 2000, sell: 300,
    skillDef: {
      kind: "aoe", mp: 35, cd: 14, dtype: "the", elem: "kim", rng: 220,
      dao: "chinh", icon: "🦁",
      effect_sheet: "eff_formation_sheet", effect_mau: "#ffd54f",
      nameKey: "sk_su_tu_hong", descKey: "sk_su_tu_hong_desc",
      mult: 2.2, fxStatus: { fear: 2 }
    },
    dieu_kien_mo: { tong: "kim_cang_tong" }
  },
  manual_duoc_4: {
    kind: "manual", tier: 2, skill: "doc_kinh", learnCost: 1500, realm: 2,
    exclusive: true,
    nameKey: "it_manual_duoc_4", descKey: "it_manual_duoc_4_desc",
    price: 4000, sell: 1500,
    skillDef: {
      kind: "dmg", mp: 35, cd: 14, dtype: "duoc", elem: "moc", rng: 220,
      dao: "chinh", icon: "☠️",
      effect_sheet: "eff_fire_sheet", effect_mau: "#76ff03",
      nameKey: "sk_doc_kinh", descKey: "sk_doc_kinh_desc",
      mult: 3.5, fxStatus: { wound: 6 }
    },
    dieu_kien_mo: { tong: "duoc_vuong_tong" }
  },
  manual_thu_4: {
    kind: "manual", tier: 2, skill: "thu_hon_hop_nhat", learnCost: 1500, realm: 2,
    exclusive: true,
    nameKey: "it_manual_thu_4", descKey: "it_manual_thu_4_desc",
    price: 4000, sell: 1500,
    skillDef: {
      kind: "buff", mp: 35, cd: 25, dtype: "thu", elem: "moc", rng: 0,
      dao: "trung", icon: "🐾",
      effect_sheet: "eff_dragon_sheet", effect_mau: "#ffb300",
      nameKey: "sk_thu_hon_hop_nhat", descKey: "sk_thu_hon_hop_nhat_desc",
      mult: 0, defMult: 1.8, dur: 20
    },
    dieu_kien_mo: { tong: "ngu_thu_tong" }
  },
  manual_ma_5: {
    kind: "manual", tier: 2, skill: "huyet_ma_dai_phap", learnCost: 3000, realm: 3,
    exclusive: true,
    nameKey: "it_manual_ma_5", descKey: "it_manual_ma_5_desc",
    price: 6000, sell: 2000,
    skillDef: {
      kind: "dmg", mp: 50, cd: 18, dtype: "ma", elem: "ma", rng: 240,
      dao: "ma", icon: "🩸",
      effect_sheet: "eff_demon_sheet", effect_mau: "#ff2d55",
      nameKey: "sk_huyet_ma_dai_phap", descKey: "sk_huyet_ma_dai_phap_desc",
      mult: 5.0, lifesteal: 0.10, fxStatus: { wound: 3 }
    },
    dieu_kien_mo: { tong: "cuu_u_ma_tong" }
  },
  /* --- ĐỘC CHIÊU tông môn: chỉ đệ tử chân truyền (Nguyên Anh + 1500 cống hiến) --- */
  manual_sig_kiem: {
    kind: "manual", tier: 2, skill: "thien_kiem_vo_song", learnCost: 5000, realm: 4,
    exclusive: true,
    nameKey: "it_manual_sig_kiem", descKey: "it_manual_sig_kiem_desc",
    price: 20000, sell: 5000,
    skillDef: {
      kind: "dmg", mp: 60, cd: 30, dtype: "kiem", elem: "kim", rng: 260,
      dao: "chinh", icon: "⚔️",
      effect_sheet: "eff_swordshadow_sheet", effect_mau: "#ffe082",
      nameKey: "sk_thien_kiem_vo_song", descKey: "sk_thien_kiem_vo_song_desc",
      mult: 6.5, fxStatus: { stun: 2 }
    },
    dieu_kien_mo: { tong: "kiem_tong", contrib: 1500 }
  },
  manual_sig_phap: {
    kind: "manual", tier: 2, skill: "cuu_thien_loi_nguc", learnCost: 5000, realm: 4,
    exclusive: true,
    nameKey: "it_manual_sig_phap", descKey: "it_manual_sig_phap_desc",
    price: 20000, sell: 5000,
    skillDef: {
      kind: "aoe", mp: 70, cd: 35, dtype: "phap", elem: "loi", rng: 260,
      dao: "chinh", icon: "🌩️",
      effect_sheet: "eff_lightning_sheet", effect_mau: "#b388ff",
      nameKey: "sk_cuu_thien_loi_nguc", descKey: "sk_cuu_thien_loi_nguc_desc",
      mult: 5.5, fxStatus: { stun: 3 }
    },
    dieu_kien_mo: { tong: "thien_phap_tong", contrib: 1500 }
  },
  manual_sig_the: {
    kind: "manual", tier: 2, skill: "kim_cang_hoa_than", learnCost: 5000, realm: 4,
    exclusive: true,
    nameKey: "it_manual_sig_the", descKey: "it_manual_sig_the_desc",
    price: 20000, sell: 5000,
    skillDef: {
      kind: "buff", mp: 60, cd: 40, dtype: "the", elem: "kim", rng: 0,
      dao: "chinh", icon: "💎",
      effect_sheet: "eff_formation_sheet", effect_mau: "#ffd54f",
      nameKey: "sk_kim_cang_hoa_than", descKey: "sk_kim_cang_hoa_than_desc",
      mult: 0, defMult: 2.5, dur: 25
    },
    dieu_kien_mo: { tong: "kim_cang_tong", contrib: 1500 }
  },
  manual_sig_duoc: {
    kind: "manual", tier: 2, skill: "hoi_thien_tao_hoa", learnCost: 5000, realm: 4,
    exclusive: true,
    nameKey: "it_manual_sig_duoc", descKey: "it_manual_sig_duoc_desc",
    price: 20000, sell: 5000,
    skillDef: {
      kind: "buff", mp: 60, cd: 45, dtype: "duoc", elem: "moc", rng: 0,
      dao: "chinh", icon: "💚",
      effect_sheet: "eff_fire_sheet", effect_mau: "#66bb6a",
      nameKey: "sk_hoi_thien_tao_hoa", descKey: "sk_hoi_thien_tao_hoa_desc",
      mult: 0, defMult: 2.0, dur: 30
    },
    dieu_kien_mo: { tong: "duoc_vuong_tong", contrib: 1500 }
  },
  manual_sig_thu: {
    kind: "manual", tier: 2, skill: "thu_than_hang_lam", learnCost: 5000, realm: 4,
    exclusive: true,
    nameKey: "it_manual_sig_thu", descKey: "it_manual_sig_thu_desc",
    price: 20000, sell: 5000,
    skillDef: {
      kind: "buff", mp: 60, cd: 40, dtype: "thu", elem: "moc", rng: 0,
      dao: "trung", icon: "🐉",
      effect_sheet: "eff_dragon_sheet", effect_mau: "#ffb300",
      nameKey: "sk_thu_than_hang_lam", descKey: "sk_thu_than_hang_lam_desc",
      mult: 0, atkMult: 2.0, defMult: 1.5, dur: 25
    },
    dieu_kien_mo: { tong: "ngu_thu_tong", contrib: 1500 }
  },
  manual_sig_ma: {
    kind: "manual", tier: 2, skill: "thon_thien_ma_cong", learnCost: 5000, realm: 4,
    exclusive: true,
    nameKey: "it_manual_sig_ma", descKey: "it_manual_sig_ma_desc",
    price: 20000, sell: 5000,
    skillDef: {
      kind: "dmg", mp: 80, cd: 40, dtype: "ma", elem: "ma", rng: 280,
      dao: "ma", icon: "👹",
      effect_sheet: "eff_demon_sheet", effect_mau: "#ff1744",
      nameKey: "sk_thon_thien_ma_cong", descKey: "sk_thon_thien_ma_cong_desc",
      mult: 7.0, lifesteal: 0.15, fxStatus: { fear: 3, wound: 4 }
    },
    dieu_kien_mo: { tong: "cuu_u_ma_tong", contrib: 1500 }
  },
  manual_thu_2: {
    kind: "manual", tier: 1, passive: "ngu_thu_tam", learnCost: 800, realm: 1,
    exclusive: true,
    nameKey: "it_manual_thu_2", descKey: "it_manual_thu_2_desc",
    price: 2000, sell: 300,
    dieu_kien_mo: {
      tong: "ngu_thu_tong"
    }
  },
  manual_thu_3: {
    kind: "manual", tier: 2, passive: "linh_thu_khe", learnCost: 1500, realm: 1,
    exclusive: true,
    nameKey: "it_manual_thu_3", descKey: "it_manual_thu_3_desc",
    price: 4000, sell: 1500,
    dieu_kien_mo: {
      tong: "ngu_thu_tong"
    }
  },
  /* --- Trứng Linh Thú (kind: pet_egg). tier 0=Phàm → 4=Thiên.
     Vỏ trứng hiện màu theo phẩm trước khi ấp. --- */
  trung_pham: {
    kind: "pet_egg", tier: 0, nameKey: "it_egg_0", descKey: "it_egg_0_desc",
    price: 500, sell: 100,
  },
  trung_linh: {
    kind: "pet_egg", tier: 1, nameKey: "it_egg_1", descKey: "it_egg_1_desc",
    price: 2000, sell: 400,
  },
  trung_huyen: {
    kind: "pet_egg", tier: 2, nameKey: "it_egg_2", descKey: "it_egg_2_desc",
    price: 6000, sell: 1200,
  },
  trung_dia: {
    kind: "pet_egg", tier: 3, nameKey: "it_egg_3", descKey: "it_egg_3_desc",
    price: 15000, sell: 3000,
  },
  trung_thien: {
    kind: "pet_egg", tier: 4, nameKey: "it_egg_4", descKey: "it_egg_4_desc",
    price: 50000, sell: 10000,
  },
  /* --- Trứng Thuần Hóa: thu phục yêu thú ở bãi quái cày cấp --- */
  trung_thuan_hoa: {
    kind: "pet_egg", tier: 0, nameKey: "it_egg_tame", descKey: "it_egg_tame_desc",
    price: 1000, sell: 200, tameEgg: true, icon: "\U0001f95a",
  },
  /* --- Mảnh trang bị: đủ số lượng đổi ở Lão Rèn --- */
  frag_r1_vukhi: {
    kind: "frag", nameKey: "it_frag_r1_vukhi", descKey: "it_frag_r1_desc",
    fragRealm: 1, fragSlot: "vukhi", price: 100, sell: 30, icon: "\U0001f9e9",
  },
  frag_r1_giap: {
    kind: "frag", nameKey: "it_frag_r1_giap", descKey: "it_frag_r1_desc",
    fragRealm: 1, fragSlot: "giap", price: 100, sell: 30, icon: "\U0001f9e9",
  },
  frag_r1_phapbao: {
    kind: "frag", nameKey: "it_frag_r1_phapbao", descKey: "it_frag_r1_desc",
    fragRealm: 1, fragSlot: "phapbao", price: 100, sell: 30, icon: "\U0001f9e9",
  },
  frag_r2_vukhi: {
    kind: "frag", nameKey: "it_frag_r2_vukhi", descKey: "it_frag_r2_desc",
    fragRealm: 2, fragSlot: "vukhi", price: 200, sell: 60, icon: "\U0001f9e9",
  },
  frag_r2_giap: {
    kind: "frag", nameKey: "it_frag_r2_giap", descKey: "it_frag_r2_desc",
    fragRealm: 2, fragSlot: "giap", price: 200, sell: 60, icon: "\U0001f9e9",
  },
  frag_r2_phapbao: {
    kind: "frag", nameKey: "it_frag_r2_phapbao", descKey: "it_frag_r2_desc",
    fragRealm: 2, fragSlot: "phapbao", price: 200, sell: 60, icon: "\U0001f9e9",
  },
  frag_r3_vukhi: {
    kind: "frag", nameKey: "it_frag_r3_vukhi", descKey: "it_frag_r3_desc",
    fragRealm: 3, fragSlot: "vukhi", price: 300, sell: 90, icon: "\U0001f9e9",
  },
  frag_r3_giap: {
    kind: "frag", nameKey: "it_frag_r3_giap", descKey: "it_frag_r3_desc",
    fragRealm: 3, fragSlot: "giap", price: 300, sell: 90, icon: "\U0001f9e9",
  },
  frag_r3_phapbao: {
    kind: "frag", nameKey: "it_frag_r3_phapbao", descKey: "it_frag_r3_desc",
    fragRealm: 3, fragSlot: "phapbao", price: 300, sell: 90, icon: "\U0001f9e9",
  },
  frag_r4_vukhi: {
    kind: "frag", nameKey: "it_frag_r4_vukhi", descKey: "it_frag_r4_desc",
    fragRealm: 4, fragSlot: "vukhi", price: 400, sell: 120, icon: "\U0001f9e9",
  },
  frag_r4_giap: {
    kind: "frag", nameKey: "it_frag_r4_giap", descKey: "it_frag_r4_desc",
    fragRealm: 4, fragSlot: "giap", price: 400, sell: 120, icon: "\U0001f9e9",
  },
  frag_r4_phapbao: {
    kind: "frag", nameKey: "it_frag_r4_phapbao", descKey: "it_frag_r4_desc",
    fragRealm: 4, fragSlot: "phapbao", price: 400, sell: 120, icon: "\U0001f9e9",
  },
  frag_r5_vukhi: {
    kind: "frag", nameKey: "it_frag_r5_vukhi", descKey: "it_frag_r5_desc",
    fragRealm: 5, fragSlot: "vukhi", price: 500, sell: 150, icon: "\U0001f9e9",
  },
  frag_r5_giap: {
    kind: "frag", nameKey: "it_frag_r5_giap", descKey: "it_frag_r5_desc",
    fragRealm: 5, fragSlot: "giap", price: 500, sell: 150, icon: "\U0001f9e9",
  },
  frag_r5_phapbao: {
    kind: "frag", nameKey: "it_frag_r5_phapbao", descKey: "it_frag_r5_desc",
    fragRealm: 5, fragSlot: "phapbao", price: 500, sell: 150, icon: "\U0001f9e9",
  },
  frag_r6_vukhi: {
    kind: "frag", nameKey: "it_frag_r6_vukhi", descKey: "it_frag_r6_desc",
    fragRealm: 6, fragSlot: "vukhi", price: 600, sell: 180, icon: "\U0001f9e9",
  },
  frag_r6_giap: {
    kind: "frag", nameKey: "it_frag_r6_giap", descKey: "it_frag_r6_desc",
    fragRealm: 6, fragSlot: "giap", price: 600, sell: 180, icon: "\U0001f9e9",
  },
  frag_r6_phapbao: {
    kind: "frag", nameKey: "it_frag_r6_phapbao", descKey: "it_frag_r6_desc",
    fragRealm: 6, fragSlot: "phapbao", price: 600, sell: 180, icon: "\U0001f9e9",
  },
  frag_r7_vukhi: {
    kind: "frag", nameKey: "it_frag_r7_vukhi", descKey: "it_frag_r7_desc",
    fragRealm: 7, fragSlot: "vukhi", price: 700, sell: 210, icon: "\U0001f9e9",
  },
  frag_r7_giap: {
    kind: "frag", nameKey: "it_frag_r7_giap", descKey: "it_frag_r7_desc",
    fragRealm: 7, fragSlot: "giap", price: 700, sell: 210, icon: "\U0001f9e9",
  },
  frag_r7_phapbao: {
    kind: "frag", nameKey: "it_frag_r7_phapbao", descKey: "it_frag_r7_desc",
    fragRealm: 7, fragSlot: "phapbao", price: 700, sell: 210, icon: "\U0001f9e9",
  },
};

/* ============================================================
 * KỸ NĂNG
 * sword_qi: Kiếm Khí (tất cả phái học lúc đầu — state.skills mặc định)
 * elemental: Đòn theo linh căn (fx lấy theo ELEMENTS[element].fx lúc dùng)
 * ============================================================ */
const SKILLS = {
  sword_qi: { nameKey: "sk_sword_qi", mp: 10, mult: 1.3, fx: "kiem_khi" },
  elemental: { nameKey: "sk_elemental", mp: 15, mult: 1.6 },
};

/* Hàng bán ở Vạn Tiên Các */
const SHOP_STOCK = [
  "pill_hx", "pill_hl", "pill_truccodan",
  "wpn_phan", "arm_phan", "acc_phan",
];

/* Giftcode mẫu: {CODE: {stones, items:[{id, qty}]}} */
const GIFT_CODES = {
  TUTIEN2D:   { stones: 300, items: [] },
  MANHSHOPT1: { stones: 360, items: [] },
  VIP999:     { stones: 999, items: [{ id: "pill_hx", qty: 3 }] },
  /* Bí tịch đặc biệt: ui.js đổi manual_random_t1 → bí tịch Địa phẩm đúng hệ phái */
  BITHU999:   { stones: 0, items: [{ id: "manual_random_t1", qty: 1 }] },
};

/* ============================================================
 * NPC
 * kind: 'quest' → mở hội thoại nhiệm vụ; 'shop' → mở cửa hàng
 * ============================================================ */
const NPCS = {
  an_sy: { nameKey: "npc_an_sy", mapId: 1, x: 1150, y: 380, kind: "greet", img: "assets/sprs/npc_an_sy.png", wander: 70 },
  co_hon: { nameKey: "npc_co_hon", mapId: 11, x: 900, y: 600, kind: "greet", img: "assets/sprs/npc_co_hon.png", wander: 160 },
  dai_phu: { nameKey: "npc_dai_phu", mapId: 0, x: 830, y: 540, kind: "quest", img: "assets/sprs/npc_dai_phu.png" },
  dan_su: { nameKey: "npc_dan_su", mapId: 8, x: 800, y: 720, kind: "shop", stock: ["dan_hx_tieu", "dan_hx_trung", "dan_hx_dai", "dan_hl_tieu", "dan_hl_trung", "duong_than_dan", "ttd_ha", "ttd_trung", "ttd_thuong", "ttd_cuc", "ttd_tien", "dtd_ha", "dtd_trung", "dtd_thuong", "dtd_cuc", "dtd_tien", "ho_mach_dan"], img: "assets/sprs/npc_dan_su.png" },
  de_tu_duoc_1: { nameKey: "npc_de_tu_duoc_1", mapId: 8, x: 520, y: 700, kind: "greet", img: "assets/sprs/npc_de_tu_duoc_new.png", wander: 90 },
  de_tu_duoc_2: { nameKey: "npc_de_tu_duoc_2", mapId: 8, x: 1080, y: 700, kind: "greet", img: "assets/sprs/npc_de_tu_duoc_new.png", wander: 90 },
  de_tu_kiem_1: { nameKey: "npc_de_tu_kiem_1", mapId: 5, x: 540, y: 560, kind: "greet", img: "assets/sprs/npc_de_tu_kiem_new.png", wander: 90 },
  de_tu_kiem_2: { nameKey: "npc_de_tu_kiem_2", mapId: 5, x: 1060, y: 560, kind: "greet", img: "assets/sprs/npc_de_tu_kiem_new.png", wander: 90 },
  de_tu_ma_1: { nameKey: "npc_de_tu_ma_1", mapId: 10, x: 560, y: 560, kind: "greet", img: "assets/sprs/npc_de_tu_ma_1.png", wander: 90 },
  de_tu_ma_2: { nameKey: "npc_de_tu_ma_2", mapId: 10, x: 1040, y: 560, kind: "greet", img: "assets/sprs/npc_de_tu_ma_2.png", wander: 90 },
  de_tu_phap_1: { nameKey: "npc_de_tu_phap_1", mapId: 6, x: 680, y: 640, kind: "greet", img: "assets/sprs/npc_de_tu_phap_new.png", wander: 90 },
  de_tu_phap_2: { nameKey: "npc_de_tu_phap_2", mapId: 6, x: 920, y: 640, kind: "greet", img: "assets/sprs/npc_de_tu_phap_new.png", wander: 90 },
  de_tu_the_1: { nameKey: "npc_de_tu_the_1", mapId: 7, x: 540, y: 820, kind: "greet", img: "assets/sprs/npc_de_tu_the_new.png", wander: 90 },
  de_tu_the_2: { nameKey: "npc_de_tu_the_2", mapId: 7, x: 1060, y: 820, kind: "greet", img: "assets/sprs/npc_de_tu_the_new.png", wander: 90 },
  de_tu_thu_1: { nameKey: "npc_de_tu_thu_1", mapId: 9, x: 580, y: 780, kind: "greet", img: "assets/sprs/npc_de_tu_thu_new.png", wander: 90 },
  de_tu_thu_2: { nameKey: "npc_de_tu_thu_2", mapId: 9, x: 1020, y: 780, kind: "greet", img: "assets/sprs/npc_de_tu_thu_new.png", wander: 90 },
  huyet_ma_tu: { nameKey: "npc_huyet_ma_tu", mapId: 11, x: 700, y: 500, kind: "quest", img: "assets/sprs/npc_huyet_ma_tu.png" },
  /* NPC nhánh ma đạo (Bui duyệt 2026-10-18): sư phụ U Minh Tôn Giả + Thánh Tử Mặc Vô Tâm */
  u_minh_ton_gia: { nameKey: "npc_u_minh_ton_gia", mapId: 10, x: 750, y: 520, kind: "quest", img: "assets/sprs/npc_u_minh_ton_gia.png" },
  mac_vo_tam: { nameKey: "npc_mac_vo_tam", mapId: 10, x: 920, y: 529, kind: "quest", img: "assets/sprs/npc_mac_vo_tam.png" },
  lao_dan_duong: { nameKey: "npc_lao_dan_duong", mapId: 0, x: 1360, y: 800, kind: "dungeon_guide", img: "assets/sprs/npc_lao_dan_duong.png" },
  thu_thap_nhan: { nameKey: "npc_thu_thap_nhan", mapId: 0, x: 1200, y: 1110, kind: "tower_guide", img: "assets/sprs/npc_thu_thap_nhan.png" },
  lao_nong_dan: { nameKey: "npc_lao_nong_dan", mapId: 3, x: 400, y: 400, kind: "farm", stock: ["hat_linh_chi", "hat_truc_co_thao", "hat_dia_linh_qua"], img: "assets/sprs/npc_lao_nong_dan.png" },
  lao_ren: { nameKey: "npc_lao_ren", mapId: 0, x: 1090, y: 1060, kind: "forge", stock: ["wpn_phan", "arm_phan", "acc_phan", "wpn_linh", "arm_linh", "acc_linh"], img: "assets/sprs/npc_lao_ren.png" },
  ma_luyen_su: { nameKey: "npc_ma_luyen_su", mapId: 10, x: 840, y: 918, kind: "forge", stock: ["wpn_phan", "arm_phan", "acc_phan", "wpn_linh", "arm_linh", "acc_linh"], img: "assets/sprs/npc_ma_luyen_su.png" },
  ma_thuong_nhan: { nameKey: "npc_ma_thuong_nhan", mapId: 11, x: 1100, y: 680, kind: "shop", stock: ["pill_hx", "pill_hl", "dan_hx_tieu", "dan_hl_tieu", "ho_the_phu"], img: "assets/sprs/npc_ma_thuong_nhan.png" },
  minh_chu: { nameKey: "npc_minh_chu", mapId: 0, x: 1090, y: 400, kind: "alliance", unlock: {realm: 2}, img: "assets/sprs/npc_minh_chu.png" },
  phu_su: { nameKey: "npc_phu_su", mapId: 6, x: 920, y: 800, kind: "shop", stock: ["ho_the_phu", "dan_hl_tieu", "dan_hl_trung", "thanh_tam_qua", "duong_than_dan"], img: "assets/sprs/npc_phu_su.png" },
  quan_mo: { nameKey: "npc_quan_mo", mapId: 4, x: 419, y: 390, kind: "shop", stock: ["pill_hx", "pill_hl", "dan_hx_tieu", "dan_hl_tieu", "ho_the_phu"], img: "assets/sprs/npc_quan_mo.png" },
  ren_su_kiem: { nameKey: "npc_ren_su_kiem", mapId: 5, x: 920, y: 780, kind: "forge", stock: ["wpn_phan", "arm_phan", "acc_phan", "wpn_linh", "arm_linh", "acc_linh"], img: "assets/sprs/npc_ren_su_kiem.png" },
  su_gia_duoc: { nameKey: "npc_su_gia_duoc", mapId: 0, x: 1240, y: 470, kind: "sect_emissary", sect: "duoc_vuong_tong", img: "assets/sprs/npc_su_gia_duoc.png", unlock: { quest: "q_story_10" } },
  su_gia_kiem: { nameKey: "npc_su_gia_kiem", mapId: 0, x: 1180, y: 400, kind: "sect_emissary", sect: "kiem_tong", img: "assets/sprs/npc_su_gia_kiem.png", unlock: { quest: "q_story_10" } },
  su_gia_ma: { nameKey: "npc_su_gia_ma", mapId: 0, x: 1300, y: 470, kind: "sect_emissary", sect: "cuu_u_ma_tong", img: "assets/sprs/npc_su_gia_ma.png", unlock: { quest: "q_story_10" } },
  su_gia_phap: { nameKey: "npc_su_gia_phap", mapId: 0, x: 1240, y: 400, kind: "sect_emissary", sect: "thien_phap_tong", img: "assets/sprs/npc_su_gia_phap.png", unlock: { quest: "q_story_10" } },
  su_gia_the: { nameKey: "npc_su_gia_the", mapId: 0, x: 1180, y: 470, kind: "sect_emissary", sect: "kim_cang_tong", img: "assets/sprs/npc_su_gia_the.png", unlock: { quest: "q_story_10" } },
  su_gia_thu: { nameKey: "npc_su_gia_thu", mapId: 0, x: 1300, y: 400, kind: "sect_emissary", sect: "ngu_thu_tong", img: "assets/sprs/npc_su_gia_thu.png", unlock: { quest: "q_story_10" } },
  tam_tien_bi_tich: { nameKey: "npc_tam_tien", mapId: 0, x: 450, y: 720, kind: "gacha", img: "assets/sprs/npc_tam_tien_bi_tich.png" },
  tho_san: { nameKey: "npc_tho_san", mapId: 1, x: 500, y: 620, kind: "shop", stock: ["pill_hx", "pill_hl", "dan_hx_tieu", "dan_hl_tieu", "thit_yeu_thu"], img: "assets/sprs/npc_tho_san.png" },
  thuong_nhan: { nameKey: "npc_thuong_nhan", mapId: 0, x: 700, y: 1150, kind: "shop", stock: ["pill_hx", "pill_hl", "dan_hx_tieu", "dan_hl_tieu", "duong_than_dan", "ho_the_phu", "manual_kiem_1", "manual_phap_1", "manual_the_1", "trung_pham", "hat_linh_chi", "hat_truc_co_thao", "the_doi_ten", "the_doi_gioi_tinh", "ttd_ha", "dtd_ha", "ho_mach_dan", "dan_tho_tieu", "dan_dien_tho", "dan_truong_sinh"], img: "assets/sprs/npc_thuong_nhan.png" },
  thuong_nhan_du_hanh: { nameKey: "npc_thuong_nhan_du_hanh", mapId: 0, x: 830, y: 820, kind: "market", img: "assets/sprs/npc_thuong_nhan_du_hanh.png" },
  thuong_nhan_mo: { nameKey: "npc_thuong_nhan_mo", mapId: 4, x: 1250, y: 850, kind: "shop", stock: ["dan_hx_trung", "dan_hl_trung", "duong_than_dan", "thanh_tam_qua"], img: "assets/sprs/npc_thuong_nhan_mo.png" },
  tien_ong: { nameKey: "npc_tien_ong", mapId: 12, x: 800, y: 400, kind: "shop", shopTitle: "shop_tien_ong", stock: ["tien_thao", "dan_hx_trung", "dan_hl_trung", "duong_than_dan", "thanh_tam_qua", "trung_linh"], img: "assets/sprs/npc_tien_ong.png", wander: 60 },
  tieu_nhi: { nameKey: "npc_tieu_nhi", mapId: 0, x: 500, y: 760, kind: "inn", img: "assets/sprs/npc_tieu_nhi.png" },
  truong_lang: { nameKey: "npc_truong_lang", mapId: 0, x: 620, y: 880, kind: "quest", img: "assets/sprs/npc_truong_lang.png" },
  co_tran_tu: { nameKey: "npc_co_tran_tu", mapId: 0, x: 260, y: 1150, kind: "quest", img: "assets/sprs/npc_co_tran_tu.png" },
  to_uyen_nhi: { nameKey: "npc_to_uyen_nhi", mapId: 0, x: 910, y: 840, kind: "greet", img: "assets/sprs/npc_to_uyen_nhi.png" },
  diep_van: { nameKey: "npc_diep_van", mapId: 0, x: 780, y: 780, kind: "greet", img: "assets/sprs/npc_diep_van.png" },
  dan_lang_1: { nameKey: "npc_dan_lang_1", mapId: 0, x: 480, y: 920, kind: "greet", img: "assets/sprs/npc_dan_lang_1.png", talkKey: "npc_dan_lang_1_talk" },
  dan_lang_2: { nameKey: "npc_dan_lang_2", mapId: 0, x: 450, y: 850, kind: "greet", img: "assets/sprs/npc_dan_lang_2.png", talkKey: "npc_dan_lang_2_talk" },
  dan_lang_3: { nameKey: "npc_dan_lang_3", mapId: 0, x: 560, y: 900, kind: "greet", img: "assets/sprs/npc_dan_lang_3.png", talkKey: "npc_dan_lang_3_talk" },
  tiep_dan_su: { nameKey: "npc_tiep_dan_su", mapId: 14, x: 869, y: 1090, kind: "quest", img: "assets/sprs/npc_tiep_dan_su.png" },
  truong_lao_truyen_cong: { nameKey: "npc_truong_lao_truyen_cong", mapId: 14, x: 1025, y: 480, kind: "quest", img: "assets/sprs/npc_truong_lao_truyen_cong.png" },
  truong_lao: { nameKey: "npc_truong_lao", mapId: 0, x: 1020, y: 400, kind: "sect", img: "assets/sprs/npc_truong_lao.png" },
  truong_lao_duoc: { nameKey: "npc_truong_lao_duoc", mapId: 8, x: 800, y: 320, kind: "sect", sect: "duoc_vuong_tong", img: "assets/sprs/npc_truong_lao_duoc.png" },
  truong_lao_kiem: { nameKey: "npc_truong_lao_kiem", mapId: 5, x: 800, y: 320, kind: "sect", sect: "kiem_tong", img: "assets/sprs/npc_truong_lao_kiem.png" },
  truong_lao_ma: { nameKey: "npc_truong_lao_ma", mapId: 10, x: 1060, y: 320, kind: "sect", sect: "cuu_u_ma_tong", img: "assets/sprs/npc_truong_lao_ma.png" },
  truong_lao_phap: { nameKey: "npc_truong_lao_phap", mapId: 6, x: 800, y: 320, kind: "sect", sect: "thien_phap_tong", img: "assets/sprs/npc_truong_lao_phap.png" },
  truong_lao_the: { nameKey: "npc_truong_lao_the", mapId: 7, x: 800, y: 320, kind: "sect", sect: "kim_cang_tong", img: "assets/sprs/npc_truong_lao_the.png" },
  truong_lao_thu: { nameKey: "npc_truong_lao_thu", mapId: 9, x: 800, y: 320, kind: "sect", sect: "ngu_thu_tong", img: "assets/sprs/npc_truong_lao_thu.png" },
  truong_tran: { nameKey: "npc_truong_tran", mapId: 0, x: 480, y: 1000, kind: "guide", img: "assets/sprs/npc_truong_tran.png" },
  tuan_thu_phan_da: { nameKey: "npc_tuan_thu_phan_da", mapId: 9, x: 700, y: 700, kind: "pet", unlock: {realm: 2}, img: "assets/sprs/npc_tuan_thu_phan_da.png" },
  tuan_thu_su: { nameKey: "npc_tuan_thu_su", mapId: 0, x: 1320, y: 1110, kind: "pet", unlock: {realm: 2}, img: "assets/sprs/npc_tuan_thu_su.png" },
  van_tien_cac: { nameKey: "npc_van_tien_cac", mapId: 0, x: 900, y: 1150, kind: "shop", img: "assets/sprs/npc_van_tien_cac.png" },
  vo_tang: { nameKey: "npc_vo_tang", mapId: 7, x: 869, y: 820, kind: "shop", stock: ["kim_cang_dan", "dan_hx_trung", "dan_hx_dai", "ho_the_phu"], img: "assets/sprs/npc_vo_tang.png" },
  tran_phap_su: { nameKey: "npc_tran_phap_su", mapId: 28, x: 800, y: 520, kind: "greet", img: "assets/sprs/npc_chiem_tinh_su.png" },
  /* 4 map mới theo ảnh tutien2d của Bui (2026-10-23): Thảo Dược Cốc / Rừng Trúc / Bãi Đá / Chân Núi Tản Viên */
  dai_phu_tdc: { nameKey: "npc_dai_phu_tdc", mapId: 39, x: 350, y: 620, kind: "greet", talkKey: "npc_dai_phu_tdc_talk", img: "assets/sprs/npc_dai_phu.png" },
  tho_san_rt: { nameKey: "npc_tho_san_rt", mapId: 40, x: 280, y: 480, kind: "greet", talkKey: "npc_tho_san_rt_talk", img: "assets/sprs/npc_tho_san.png" },
  tieu_phu_bd: { nameKey: "npc_tieu_phu_bd", mapId: 41, x: 1150, y: 720, kind: "greet", talkKey: "npc_tieu_phu_bd_talk", img: "assets/sprs/npc_dan_lang_1.png" },
  chap_su_dh: { nameKey: "npc_chap_su_dh", mapId: 42, x: 380, y: 430, kind: "greet", talkKey: "npc_chap_su_dh_talk", img: "assets/sprs/npc_tiep_dan_su.png" },
  lao_ren_tnv: { nameKey: "npc_lao_ren_tnv", mapId: 42, x: 180, y: 680, kind: "greet", talkKey: "npc_lao_ren_tnv_talk", img: "assets/sprs/npc_lao_ren.png" },
  /* Tiên Môn (2026-10-24): Chưởng Môn / Đệ Tử Tiếp Dẫn / Lão Dược Sư */
  chuong_mon_tm: { nameKey: "npc_chuong_mon_tm", mapId: 43, x: 800, y: 320, kind: "greet", talkKey: "npc_chuong_mon_tm_talk", img: "assets/sprs/npc_truong_lao.png" },
  de_tu_tiep_dan_tm: { nameKey: "npc_de_tu_tiep_dan_tm", mapId: 43, x: 300, y: 600, kind: "greet", talkKey: "npc_de_tu_tiep_dan_tm_talk", img: "assets/sprs/npc_tiep_dan_su.png" },
  lao_duoc_su_tm: { nameKey: "npc_lao_duoc_su_tm", mapId: 43, x: 1250, y: 850, kind: "greet", talkKey: "npc_lao_duoc_su_tm_talk", img: "assets/sprs/npc_duoc_dien_quan.png" },
};

/* ============================================================
 * NHIỆM VỤ
 * need: {type:'kill', monster, count} | {type:'item', item, count} |
 *       {type:'talk'}
 * reward: {stones, exp, items:[{id, qty, locked?}]}
 * req: quest id phải hoàn thành trước (chuỗi nhiệm vụ)
 * ============================================================ */
const QUESTS = [
  /* ============ CHUỖI CỐT TRUYỆN TÂN THỦ (Bui duyệt 2026-10-18) ============
   * Sau khi tạo nhân vật: xem story intro (js/story.js) → tự nhận q_story_01.
   * Thứ tự (Bui chốt 2026-10-18): Phàm Nhân → KỲ NGỘ trước → TẨY CỐT cuối:
   *   q_story_01 → 04 → 05 → 06 → 07 → 08 → 09 → 10 → 02 → 03 → 11 (gia nhập tông môn).
   * Mỗi quest autoAccept: trả xong tự nhận quest tiếp theo trong chuỗi. */
  {
    id: "q_story_01", nameKey: "q_story_01", descKey: "q_story_01_desc",
    img: "assets/quests/q-story-01-0.webp",
    kind: "chinh",
    npc: "dai_phu",
    acceptTalk: "q_story_01_accept", turninTalk: "q_story_01_turnin",
    need: { type: "talk" },
    reward: { stones: 50, exp: 40 },
  },
  {
    id: "q_story_02", nameKey: "q_story_02", descKey: "q_story_02_desc",
    kind: "chinh",
    npc: "dai_phu",
    acceptTalk: "q_story_02_accept", turninTalk: "q_story_02_turnin", req: "q_story_10", autoAccept: true,
    need: { type: "item", item: "taycothao", count: 3 },
    reward: { stones: 150, exp: 120 },
  },
  {
    id: "q_story_03", nameKey: "q_story_03", descKey: "q_story_03_desc",
    kind: "chinh",
    npc: "dai_phu",
    acceptTalk: "q_story_03_accept", turninTalk: "q_story_03_turnin", req: "q_story_02", autoAccept: true,
    need: { type: "talk" },
    reward: { stones: 50, exp: 100, items: [{ id: "pill_taycotdan", qty: 1 }] },
  },
  {
    id: "q_story_04", nameKey: "q_story_04", descKey: "q_story_04_desc",
    img: "assets/quests/q-story-04-0.webp",
    kind: "chinh",
    npc: "dai_phu",
    acceptTalk: "q_story_04_accept", turninTalk: "q_story_04_turnin", req: "q_story_01", autoAccept: true,
    need: { type: "kill", monster: "da_tru", count: 5 },
    reward: { stones: 120, exp: 150, items: [{ id: "dan_hx_tieu", qty: 2 }] },
  },
  {
    id: "q_story_05", nameKey: "q_story_05", descKey: "q_story_05_desc",
    kind: "chinh",
    npc: "dai_phu",
    acceptTalk: "q_story_05_accept", turninTalk: "q_story_05_turnin", req: "q_story_04", autoAccept: true,
    need: { type: "kill", monster: "son_ke", count: 8 },
    reward: { stones: 150, exp: 220, items: [{ id: "pill_hl", qty: 2 }] },
  },
  {
    id: "q_story_06", nameKey: "q_story_06", descKey: "q_story_06_desc",
    kind: "chinh",
    npc: "truong_tran",
    acceptTalk: "q_story_06_accept", turninTalk: "q_story_06_turnin", req: "q_story_05", autoAccept: true,
    need: { type: "kill", monster: "phong_lang", count: 10 },
    reward: { stones: 200, exp: 350, items: [{ id: "dan_hx_tieu", qty: 2 }] },
  },
  {
    id: "q_story_07", nameKey: "q_story_07", descKey: "q_story_07_desc",
    img: "assets/quests/q-story-07-0.webp",
    kind: "chinh",
    npc: "truong_tran",
    acceptTalk: "q_story_07_accept", turninTalk: "q_story_07_turnin", req: "q_story_06", autoAccept: true,
    need: { type: "kill", monster: "hu_thi", count: 10 },
    reward: { stones: 250, exp: 450, items: [{ id: "dan_hl_tieu", qty: 2 }] },
  },
  {
    id: "q_story_08", nameKey: "q_story_08", descKey: "q_story_08_desc",
    kind: "chinh",
    npc: "dai_phu",
    acceptTalk: "q_story_08_accept", turninTalk: "q_story_08_turnin", req: "q_story_07", autoAccept: true,
    need: { type: "kill", monster: "u_hon", count: 12 },
    reward: { stones: 300, exp: 600, items: [{ id: "dan_hx_trung", qty: 2 }] },
  },
  {
    id: "q_story_09", nameKey: "q_story_09", descKey: "q_story_09_desc",
    kind: "chinh",
    npc: "dai_phu",
    acceptTalk: "q_story_09_accept", turninTalk: "q_story_09_turnin", req: "q_story_08", autoAccept: true,
    need: { type: "kill", monster: "thi_ma", count: 12 },
    reward: { stones: 400, exp: 800, items: [{ id: "dan_hl_trung", qty: 2 }] },
  },
  {
    id: "q_story_10", nameKey: "q_story_10", descKey: "q_story_10_desc",
    img: "assets/quests/q-story-10-0.webp",
    kind: "chinh",
    npc: "truong_tran",
    acceptTalk: "q_story_10_accept", turninTalk: "q_story_10_turnin", req: "q_story_09", autoAccept: true,
    need: { type: "kill", monster: "da_tru_vuong", count: 1 },
    reward: {
      stones: 800, exp: 1200,
      items: [{ id: "wpn_linh", qty: 1, locked: true }],
    },
  },
  {
    id: "q_story_11", nameKey: "q_story_11", descKey: "q_story_11_desc",
    img: "assets/quests/q-story-11-0.webp",
    kind: "chinh",
    npc: "dai_phu",
    acceptTalk: "q_story_11_accept", turninTalk: "q_story_11_turnin", req: "q_story_10", autoAccept: true,
    need: { type: "joinsect" },
    reward: { stones: 500, exp: 800 },
  },
  /* ============ CHUỖI MỞ ĐẦU "ĐÊM MÁU LÀNG PHONG DIỆP" (Bui duyệt 2026-10-18) ============
   * Cốt truyện v3: Lễ Trắc Linh → Dị Tượng Cửu Sắc → Đêm Máu → Máu Trả Máu →
   *   Rời Làng → Tẩy Cốt Phạt Tủy → Ngã Ba Định Mệnh (rẽ nhánh Chính/Ma đạo).
   * Mỗi quest autoAccept: trả xong tự nhận quest tiếp theo trong chuỗi. */
  {
    id: "q_story_21", nameKey: "q_story_21", descKey: "q_story_21_desc",
    npc: "truong_lang", autoAccept: true,
    need: { type: "talk_npcs", npcs: ["dan_lang_1", "dan_lang_2", "dan_lang_3"] },
    acceptTalk: "q_story_21_accept", turninTalk: "q_story_21_turnin",
    reward: { stones: 30, exp: 30 },
  },
  {
    id: "q_story_22", nameKey: "q_story_22", descKey: "q_story_22_desc",
    npc: "truong_lang", req: "q_story_21", autoAccept: true,
    need: { type: "talk" },
    acceptTalk: "q_story_22_accept", turninTalk: "q_story_22_turnin",
    fx: "cuusac",
    reward: { stones: 50, exp: 60 },
  },
  {
    id: "q_story_23", nameKey: "q_story_23", descKey: "q_story_23_desc",
    npc: "co_tran_tu", req: "q_story_22", autoAccept: true,
    need: { type: "talk" },
    acceptTalk: "q_story_23_accept", turninTalk: "q_story_23_turnin",
    event: "bandit_attack",
    reward: { stones: 50, exp: 80, items: [{ id: "wpn_go", qty: 1 }] },
  },
  {
    id: "q_story_24", nameKey: "q_story_24", descKey: "q_story_24_desc",
    npc: "co_tran_tu", req: "q_story_23", autoAccept: true,
    need: { type: "kill", monster: "son_tac", count: 3 },
    acceptTalk: "q_story_24_accept", turninTalk: "q_story_24_turnin",
    reward: { stones: 100, exp: 150, items: [{ id: "dan_hx_tieu", qty: 2 }, { id: "manual_kiem_1", qty: 1 }] },
  },
  {
    id: "q_story_25", nameKey: "q_story_25", descKey: "q_story_25_desc",
    npc: "co_tran_tu", req: "q_story_24", autoAccept: true,
    need: { type: "talk" },
    acceptTalk: "q_story_25_accept", turninTalk: "q_story_25_turnin",
    party: ["to_uyen_nhi", "diep_van"],
    reward: { stones: 80, exp: 120 },
  },
  {
    id: "q_story_26", nameKey: "q_story_26", descKey: "q_story_26_desc",
    npc: "co_tran_tu", req: "q_story_25", autoAccept: true,
    need: { type: "item", item: "taycothao", count: 5 },
    acceptTalk: "q_story_26_accept", turninTalk: "q_story_26_turnin",
    reward: { stones: 150, exp: 200, items: [{ id: "pill_taycotdan", qty: 1 }] },
  },
  {
    id: "q_story_27", nameKey: "q_story_27", descKey: "q_story_27_desc",
    npc: "co_tran_tu", req: "q_story_26", autoAccept: true,
    need: { type: "joinsect" },
    acceptTalk: "q_story_27_accept", turninTalk: "q_story_27_turnin",
    storyboard: "nga_ba_dinh_menh",
    reward: { stones: 300, exp: 500 },
  },
  /* ============ NHÁNH CHÍNH ĐẠO "TIÊN LỘ CHÍNH NGHĨA" (NV8-17, Bui duyệt 2026-10-18) ============
   * Cốt truyện v3 Chương 1-3 nhánh chính đạo. branch: "chinh" — chỉ khả dụng khi
   * đã gia nhập 1 trong 5 tông chính đạo. Độ khó CÂN BẰNG với nhánh ma đạo:
   * cùng số thứ tự → cùng loại mục tiêu, cùng cấp quái/boss, thưởng tương đương. */
  {
    id: "q_story_c01", nameKey: "q_story_c01", descKey: "q_story_c01_desc",
    npc: "truong_lao_truyen_cong", req: "q_story_27", autoAccept: true, branch: "chinh",
    need: { type: "talk" },
    reward: { stones: 400, exp: 600, contrib: 20, items: [{ id: "dan_tu_khi", qty: 2 }] },
    acceptTalk: "q_story_c01_accept", turninTalk: "q_story_c01_turnin",
  },
  {
    id: "q_story_c02", nameKey: "q_story_c02", descKey: "q_story_c02_desc",
    npc: "diep_van", req: "q_story_c01", autoAccept: true, branch: "chinh",
    need: { type: "talk" },
    reward: { stones: 400, exp: 700, contrib: 15 },
    acceptTalk: "q_story_c02_accept", turninTalk: "q_story_c02_turnin",
  },
  {
    id: "q_story_c03", nameKey: "q_story_c03", descKey: "q_story_c03_desc",
    npc: "diep_van", req: "q_story_c02", autoAccept: true, branch: "chinh",
    need: { type: "kill", monster: "da_tru", count: 10 },
    reward: { stones: 600, exp: 900, contrib: 30, items: [{ id: "dan_tu_khi", qty: 2 }] },
    acceptTalk: "q_story_c03_accept", turninTalk: "q_story_c03_turnin",
  },
  {
    id: "q_story_c04", nameKey: "q_story_c04", descKey: "q_story_c04_desc",
    npc: "co_tran_tu", req: "q_story_c03", autoAccept: true, branch: "chinh",
    need: { type: "talk" },
    reward: { stones: 500, exp: 800, contrib: 20 },
    acceptTalk: "q_story_c04_accept", turninTalk: "q_story_c04_turnin",
  },
  {
    id: "q_story_c05", nameKey: "q_story_c05", descKey: "q_story_c05_desc",
    npc: "co_tran_tu", req: "q_story_c04", autoAccept: true, branch: "chinh",
    need: { type: "kill", monster: "trai_chu_hac_phong", count: 1 },
    reward: { stones: 1000, exp: 1500, contrib: 50, items: [{ id: "wpn_linh", qty: 1 }, { id: "manual_boss_datru", qty: 1 }] },
    acceptTalk: "q_story_c05_accept", turninTalk: "q_story_c05_turnin",
  },
  {
    id: "q_story_c06", nameKey: "q_story_c06", descKey: "q_story_c06_desc",
    npc: "dai_phu", req: "q_story_c05", autoAccept: true, branch: "chinh",
    need: { type: "talk" },
    reward: { stones: 600, exp: 1000, contrib: 25, items: [{ id: "dan_boi_nguyen", qty: 2 }] },
    acceptTalk: "q_story_c06_accept", turninTalk: "q_story_c06_turnin",
  },
  {
    id: "q_story_c07", nameKey: "q_story_c07", descKey: "q_story_c07_desc",
    npc: "diep_van", req: "q_story_c06", autoAccept: true, branch: "chinh",
    need: { type: "kill", monster: "sat_thu_huyet_y", count: 5 },
    reward: { stones: 800, exp: 1200, contrib: 35, items: [{ id: "dan_boi_nguyen", qty: 1 }] },
    acceptTalk: "q_story_c07_accept", turninTalk: "q_story_c07_turnin",
  },
  {
    id: "q_story_c08", nameKey: "q_story_c08", descKey: "q_story_c08_desc",
    npc: "co_tran_tu", req: "q_story_c07", autoAccept: true, branch: "chinh",
    need: { type: "kill", monster: "huyet_y_mon_chu", count: 1 },
    fx: "dotpha",
    reward: { stones: 1500, exp: 2500, contrib: 80, items: [{ id: "pill_truccodan", qty: 1 }, { id: "manual_boss_langvuong", qty: 1 }] },
    acceptTalk: "q_story_c08_accept", turninTalk: "q_story_c08_turnin",
  },
  {
    id: "q_story_c09", nameKey: "q_story_c09", descKey: "q_story_c09_desc",
    npc: "to_uyen_nhi", req: "q_story_c08", autoAccept: true, branch: "chinh",
    need: { type: "item", item: "dia_linh_qua", count: 5 },
    reward: { stones: 1000, exp: 1800, contrib: 40, items: [{ id: "dan_ngung_dan", qty: 1 }] },
    acceptTalk: "q_story_c09_accept", turninTalk: "q_story_c09_turnin",
  },
  {
    id: "q_story_c10", nameKey: "q_story_c10", descKey: "q_story_c10_desc",
    npc: "to_uyen_nhi", req: "q_story_c09", autoAccept: true, branch: "chinh",
    need: { type: "kill", monster: "dien_chu_u_minh", count: 1 },
    fx: "cuuchuyen",
    reward: { stones: 2500, exp: 4000, contrib: 120, items: [{ id: "dan_cuu_chuyen", qty: 1 }, { id: "manual_boss_cottuong", qty: 1 }] },
    acceptTalk: "q_story_c10_accept", turninTalk: "q_story_c10_turnin",
  },
  /* ============ NHÁNH MA ĐẠO "MA LỘ BÁ NGHIỆP" (NV18-27, Bui duyệt 2026-10-18) ============
   * Cốt truyện v3 Chương 1-3 nhánh ma đạo. branch: "ma" — chỉ khả dụng khi
   * đã gia nhập Cửu U Ma Tông. Cốt truyện/NPC KHÁC HẲN nhánh chính đạo nhưng
   * độ khó TƯƠNG ĐƯƠNG từng cặp: c01=m01, c02=m02, ..., c10=m10. */
  {
    id: "q_story_m01", nameKey: "q_story_m01", descKey: "q_story_m01_desc",
    npc: "u_minh_ton_gia", req: "q_story_27", autoAccept: true, branch: "ma",
    need: { type: "talk" },
    reward: { stones: 400, exp: 600, contrib: 20, items: [{ id: "dan_tu_khi", qty: 2 }] },
    acceptTalk: "q_story_m01_accept", turninTalk: "q_story_m01_turnin",
  },
  {
    id: "q_story_m02", nameKey: "q_story_m02", descKey: "q_story_m02_desc",
    npc: "u_minh_ton_gia", req: "q_story_m01", autoAccept: true, branch: "ma",
    need: { type: "talk" },
    reward: { stones: 400, exp: 700, contrib: 15 },
    acceptTalk: "q_story_m02_accept", turninTalk: "q_story_m02_turnin",
  },
  {
    id: "q_story_m03", nameKey: "q_story_m03", descKey: "q_story_m03_desc",
    npc: "mac_vo_tam", req: "q_story_m02", autoAccept: true, branch: "ma",
    need: { type: "kill", monster: "da_tru", count: 10 },
    reward: { stones: 600, exp: 900, contrib: 30, items: [{ id: "dan_tu_khi", qty: 2 }] },
    acceptTalk: "q_story_m03_accept", turninTalk: "q_story_m03_turnin",
  },
  {
    id: "q_story_m04", nameKey: "q_story_m04", descKey: "q_story_m04_desc",
    npc: "u_minh_ton_gia", req: "q_story_m03", autoAccept: true, branch: "ma",
    need: { type: "talk" },
    reward: { stones: 500, exp: 800, contrib: 20 },
    acceptTalk: "q_story_m04_accept", turninTalk: "q_story_m04_turnin",
  },
  {
    id: "q_story_m05", nameKey: "q_story_m05", descKey: "q_story_m05_desc",
    npc: "mac_vo_tam", req: "q_story_m04", autoAccept: true, branch: "ma",
    need: { type: "kill", monster: "trai_chu_hac_phong", count: 1 },
    reward: { stones: 1000, exp: 1500, contrib: 50, items: [{ id: "wpn_linh", qty: 1 }, { id: "manual_boss_datru", qty: 1 }] },
    acceptTalk: "q_story_m05_accept", turninTalk: "q_story_m05_turnin",
  },
  {
    id: "q_story_m06", nameKey: "q_story_m06", descKey: "q_story_m06_desc",
    npc: "u_minh_ton_gia", req: "q_story_m05", autoAccept: true, branch: "ma",
    need: { type: "talk" },
    reward: { stones: 600, exp: 1000, contrib: 25, items: [{ id: "dan_boi_nguyen", qty: 2 }] },
    acceptTalk: "q_story_m06_accept", turninTalk: "q_story_m06_turnin",
  },
  {
    id: "q_story_m07", nameKey: "q_story_m07", descKey: "q_story_m07_desc",
    npc: "u_minh_ton_gia", req: "q_story_m06", autoAccept: true, branch: "ma",
    need: { type: "kill", monster: "tam_ma", count: 5 },
    fx: "tamma",
    reward: { stones: 800, exp: 1200, contrib: 35, items: [{ id: "dan_boi_nguyen", qty: 1 }] },
    acceptTalk: "q_story_m07_accept", turninTalk: "q_story_m07_turnin",
  },
  {
    id: "q_story_m08", nameKey: "q_story_m08", descKey: "q_story_m08_desc",
    npc: "mac_vo_tam", req: "q_story_m07", autoAccept: true, branch: "ma",
    need: { type: "kill", monster: "dai_su_huynh_ma", count: 1 },
    fx: "dotpha",
    reward: { stones: 1500, exp: 2500, contrib: 80, items: [{ id: "pill_truccodan", qty: 1 }, { id: "manual_boss_langvuong", qty: 1 }] },
    acceptTalk: "q_story_m08_accept", turninTalk: "q_story_m08_turnin",
  },
  {
    id: "q_story_m09", nameKey: "q_story_m09", descKey: "q_story_m09_desc",
    npc: "to_uyen_nhi", req: "q_story_m08", autoAccept: true, branch: "ma",
    need: { type: "item", item: "dia_linh_qua", count: 5 },
    reward: { stones: 1000, exp: 1800, contrib: 40, items: [{ id: "dan_ngung_dan", qty: 1 }] },
    acceptTalk: "q_story_m09_accept", turninTalk: "q_story_m09_turnin",
  },
  {
    id: "q_story_m10", nameKey: "q_story_m10", descKey: "q_story_m10_desc",
    npc: "mac_vo_tam", req: "q_story_m09", autoAccept: true, branch: "ma",
    need: { type: "kill", monster: "thu_linh_ve_dao_si", count: 1 },
    fx: "cuuchuyen",
    reward: { stones: 2500, exp: 4000, contrib: 120, items: [{ id: "dan_cuu_chuyen", qty: 1 }, { id: "manual_boss_cottuong", qty: 1 }] },
    acceptTalk: "q_story_m10_accept", turninTalk: "q_story_m10_turnin",
  },
  {
    id: "q_pet_intro", nameKey: "q_pet_intro", descKey: "q_pet_intro_desc",
    npc: "tuan_thu_su",
    acceptTalk: "q_pet_intro_accept", turninTalk: "q_pet_intro_turnin",
    need: { type: "talk" },
    reward: { stones: 0, exp: 100, items: [{ id: "trung_pham", qty: 1 }] },
  },
  /* ---- Nhiệm vụ ma đạo ở Huyết Ma Vực ---- */
  {
    id: "q_ma_kill10", nameKey: "q_ma_kill10", descKey: "q_ma_kill10_desc",
    npc: "huyet_ma_tu",
    acceptTalk: "q_ma_kill10_accept", turninTalk: "q_ma_kill10_turnin",
    need: { type: "kill", monster: "ma_lang", count: 10 },
    reward: { stones: 400, exp: 300, items: [{ id: "huyet_tinh", qty: 3 }] },
  },
  {
    id: "q_ma_boss", nameKey: "q_ma_boss", descKey: "q_ma_boss_desc",
    npc: "huyet_ma_tu",
    acceptTalk: "q_ma_boss_accept", turninTalk: "q_ma_boss_turnin",
    req: "q_ma_kill10",
    need: { type: "kill", monster: "huyet_ma_vuong", count: 1 },
    reward: {
      stones: 1200, exp: 800,
      items: [{ id: "manual_ma_1", qty: 1, locked: true }],
    },
  },
];

/* ============ NHIỆM VỤ BÍ CẢNH (Bui 2026-10-18) ============
 * Mỗi bí cảnh tông môn: khám phá → thu thập → boss. Bí cảnh thế giới thêm: tổ đội.
 * Thông Thiên Tháp: nhiệm vụ theo mốc tầng 10/25/50/75/100.
 */
QUESTS.push(
  {
    id: "q_bc_kiem_trung_explore", nameKey: "q_bc_kiem_trung_explore", descKey: "q_bc_kiem_trung_explore_desc",
    npc: "truong_lao_kiem",
    autoAccept: true,
    sect: "kiem_tong", rank: "ngoai_mon",
    need: { type: "secret_enter", realm: "kiem_trung", count: 1 },
    acceptTalk: "q_bc_kiem_trung_explore_accept", turninTalk: "q_bc_kiem_trung_explore_turnin",
    reward: { stones: 500, exp: 800, items: [{ id: "kiem_hon_thach", qty: 3 }] },
  },
  {
    id: "q_bc_kiem_trung_collect", nameKey: "q_bc_kiem_trung_collect", descKey: "q_bc_kiem_trung_collect_desc",
    npc: "truong_lao_kiem",
    acceptTalk: "q_bc_kiem_trung_collect_accept", turninTalk: "q_bc_kiem_trung_collect_turnin",
    req: "q_bc_kiem_trung_explore", autoAccept: true,
    sect: "kiem_tong", rank: "noi_mon",
    need: { type: "secret_nodes", realm: "kiem_trung", count: 10 },
    reward: { stones: 800, exp: 1200, items: [{ id: "kiem_hon_thach", qty: 5 }] },
  },
  {
    id: "q_bc_kiem_trung_boss", nameKey: "q_bc_kiem_trung_boss", descKey: "q_bc_kiem_trung_boss_desc",
    npc: "truong_lao_kiem",
    req: "q_bc_kiem_trung_collect", autoAccept: true,
    sect: "kiem_tong", rank: "ho_phap",
    need: { type: "trial", boss: { nameKey: "bc_boss_kiem_hon", hp: 2500, atk: 120, def: 40 } },
    acceptTalk: "q_bc_kiem_trung_boss_accept", turninTalk: "q_bc_kiem_trung_boss_turnin",
    eventKey: "q_bc_kiem_trung_boss_event", fx: "#9fd8ff",
    reward: { stones: 2000, exp: 3000, items: [{ id: "manual_kiem_1", qty: 1 }, { id: "kiem_hon_thach", qty: 5 }] },
  },
  {
    id: "q_bc_tinh_than_bi_canh_explore", nameKey: "q_bc_tinh_than_bi_canh_explore", descKey: "q_bc_tinh_than_bi_canh_explore_desc",
    npc: "truong_lao_phap",
    autoAccept: true,
    sect: "thien_phap_tong", rank: "ngoai_mon",
    need: { type: "secret_enter", realm: "tinh_than_bi_canh", count: 1 },
    acceptTalk: "q_bc_tinh_than_bi_canh_explore_accept", turninTalk: "q_bc_tinh_than_bi_canh_explore_turnin",
    reward: { stones: 500, exp: 800, items: [{ id: "tinh_than_sa", qty: 3 }] },
  },
  {
    id: "q_bc_tinh_than_bi_canh_collect", nameKey: "q_bc_tinh_than_bi_canh_collect", descKey: "q_bc_tinh_than_bi_canh_collect_desc",
    npc: "truong_lao_phap",
    acceptTalk: "q_bc_tinh_than_bi_canh_collect_accept", turninTalk: "q_bc_tinh_than_bi_canh_collect_turnin",
    req: "q_bc_tinh_than_bi_canh_explore", autoAccept: true,
    sect: "thien_phap_tong", rank: "noi_mon",
    need: { type: "secret_nodes", realm: "tinh_than_bi_canh", count: 10 },
    reward: { stones: 800, exp: 1200, items: [{ id: "tinh_than_sa", qty: 5 }] },
  },
  {
    id: "q_bc_tinh_than_bi_canh_boss", nameKey: "q_bc_tinh_than_bi_canh_boss", descKey: "q_bc_tinh_than_bi_canh_boss_desc",
    npc: "truong_lao_phap",
    req: "q_bc_tinh_than_bi_canh_collect", autoAccept: true,
    sect: "thien_phap_tong", rank: "ho_phap",
    need: { type: "trial", boss: { nameKey: "bc_boss_tinh_khong_thu", hp: 2500, atk: 125, def: 35 } },
    acceptTalk: "q_bc_tinh_than_bi_canh_boss_accept", turninTalk: "q_bc_tinh_than_bi_canh_boss_turnin",
    eventKey: "q_bc_tinh_than_bi_canh_boss_event", fx: "#b48cff",
    reward: { stones: 2000, exp: 3000, items: [{ id: "manual_phap_1", qty: 1 }, { id: "tinh_than_sa", qty: 5 }] },
  },
  {
    id: "q_bc_la_han_dong_explore", nameKey: "q_bc_la_han_dong_explore", descKey: "q_bc_la_han_dong_explore_desc",
    npc: "truong_lao_the",
    autoAccept: true,
    sect: "kim_cang_tong", rank: "ngoai_mon",
    need: { type: "secret_enter", realm: "la_han_dong", count: 1 },
    acceptTalk: "q_bc_la_han_dong_explore_accept", turninTalk: "q_bc_la_han_dong_explore_turnin",
    reward: { stones: 500, exp: 800, items: [{ id: "la_han_xa_loi", qty: 3 }] },
  },
  {
    id: "q_bc_la_han_dong_collect", nameKey: "q_bc_la_han_dong_collect", descKey: "q_bc_la_han_dong_collect_desc",
    npc: "truong_lao_the",
    acceptTalk: "q_bc_la_han_dong_collect_accept", turninTalk: "q_bc_la_han_dong_collect_turnin",
    req: "q_bc_la_han_dong_explore", autoAccept: true,
    sect: "kim_cang_tong", rank: "noi_mon",
    need: { type: "secret_nodes", realm: "la_han_dong", count: 10 },
    reward: { stones: 800, exp: 1200, items: [{ id: "la_han_xa_loi", qty: 5 }] },
  },
  {
    id: "q_bc_la_han_dong_boss", nameKey: "q_bc_la_han_dong_boss", descKey: "q_bc_la_han_dong_boss_desc",
    npc: "truong_lao_the",
    req: "q_bc_la_han_dong_collect", autoAccept: true,
    sect: "kim_cang_tong", rank: "ho_phap",
    need: { type: "trial", boss: { nameKey: "bc_boss_kim_cang_la_han", hp: 3000, atk: 110, def: 70 } },
    acceptTalk: "q_bc_la_han_dong_boss_accept", turninTalk: "q_bc_la_han_dong_boss_turnin",
    eventKey: "q_bc_la_han_dong_boss_event", fx: "#ffd76a",
    reward: { stones: 2000, exp: 3000, items: [{ id: "manual_the_1", qty: 1 }, { id: "la_han_xa_loi", qty: 5 }] },
  },
  {
    id: "q_bc_duoc_vuong_coc_explore", nameKey: "q_bc_duoc_vuong_coc_explore", descKey: "q_bc_duoc_vuong_coc_explore_desc",
    npc: "truong_lao_duoc",
    autoAccept: true,
    sect: "duoc_vuong_tong", rank: "ngoai_mon",
    need: { type: "secret_enter", realm: "duoc_vuong_coc", count: 1 },
    acceptTalk: "q_bc_duoc_vuong_coc_explore_accept", turninTalk: "q_bc_duoc_vuong_coc_explore_turnin",
    reward: { stones: 500, exp: 800, items: [{ id: "van_nien_linh_chi", qty: 3 }] },
  },
  {
    id: "q_bc_duoc_vuong_coc_collect", nameKey: "q_bc_duoc_vuong_coc_collect", descKey: "q_bc_duoc_vuong_coc_collect_desc",
    npc: "truong_lao_duoc",
    acceptTalk: "q_bc_duoc_vuong_coc_collect_accept", turninTalk: "q_bc_duoc_vuong_coc_collect_turnin",
    req: "q_bc_duoc_vuong_coc_explore", autoAccept: true,
    sect: "duoc_vuong_tong", rank: "noi_mon",
    need: { type: "secret_nodes", realm: "duoc_vuong_coc", count: 10 },
    reward: { stones: 800, exp: 1200, items: [{ id: "van_nien_linh_chi", qty: 5 }] },
  },
  {
    id: "q_bc_duoc_vuong_coc_boss", nameKey: "q_bc_duoc_vuong_coc_boss", descKey: "q_bc_duoc_vuong_coc_boss_desc",
    npc: "truong_lao_duoc",
    req: "q_bc_duoc_vuong_coc_collect", autoAccept: true,
    sect: "duoc_vuong_tong", rank: "ho_phap",
    need: { type: "trial", boss: { nameKey: "bc_boss_duoc_linh", hp: 2200, atk: 130, def: 30 } },
    acceptTalk: "q_bc_duoc_vuong_coc_boss_accept", turninTalk: "q_bc_duoc_vuong_coc_boss_turnin",
    eventKey: "q_bc_duoc_vuong_coc_boss_event", fx: "#7fe08a",
    reward: { stones: 2000, exp: 3000, items: [{ id: "manual_duoc_1", qty: 1 }, { id: "van_nien_linh_chi", qty: 5 }] },
  },
  {
    id: "q_bc_van_thu_quat_explore", nameKey: "q_bc_van_thu_quat_explore", descKey: "q_bc_van_thu_quat_explore_desc",
    npc: "truong_lao_thu",
    autoAccept: true,
    sect: "ngu_thu_tong", rank: "ngoai_mon",
    need: { type: "secret_enter", realm: "van_thu_quat", count: 1 },
    acceptTalk: "q_bc_van_thu_quat_explore_accept", turninTalk: "q_bc_van_thu_quat_explore_turnin",
    reward: { stones: 500, exp: 800, items: [{ id: "thu_vuong_huyet", qty: 3 }] },
  },
  {
    id: "q_bc_van_thu_quat_collect", nameKey: "q_bc_van_thu_quat_collect", descKey: "q_bc_van_thu_quat_collect_desc",
    npc: "truong_lao_thu",
    acceptTalk: "q_bc_van_thu_quat_collect_accept", turninTalk: "q_bc_van_thu_quat_collect_turnin",
    req: "q_bc_van_thu_quat_explore", autoAccept: true,
    sect: "ngu_thu_tong", rank: "noi_mon",
    need: { type: "secret_nodes", realm: "van_thu_quat", count: 10 },
    reward: { stones: 800, exp: 1200, items: [{ id: "thu_vuong_huyet", qty: 5 }] },
  },
  {
    id: "q_bc_van_thu_quat_boss", nameKey: "q_bc_van_thu_quat_boss", descKey: "q_bc_van_thu_quat_boss_desc",
    npc: "truong_lao_thu",
    req: "q_bc_van_thu_quat_collect", autoAccept: true,
    sect: "ngu_thu_tong", rank: "ho_phap",
    need: { type: "trial", boss: { nameKey: "bc_boss_thu_vuong", hp: 2700, atk: 125, def: 50 } },
    acceptTalk: "q_bc_van_thu_quat_boss_accept", turninTalk: "q_bc_van_thu_quat_boss_turnin",
    eventKey: "q_bc_van_thu_quat_boss_event", fx: "#ff9a5a",
    reward: { stones: 2000, exp: 3000, items: [{ id: "manual_thu_1", qty: 1 }, { id: "thu_vuong_huyet", qty: 5 }] },
  },
  {
    id: "q_bc_huyet_ma_quat_explore", nameKey: "q_bc_huyet_ma_quat_explore", descKey: "q_bc_huyet_ma_quat_explore_desc",
    npc: "truong_lao_ma",
    autoAccept: true,
    sect: "cuu_u_ma_tong", rank: "ngoai_mon",
    need: { type: "secret_enter", realm: "huyet_ma_quat", count: 1 },
    acceptTalk: "q_bc_huyet_ma_quat_explore_accept", turninTalk: "q_bc_huyet_ma_quat_explore_turnin",
    reward: { stones: 500, exp: 800, items: [{ id: "huyet_ma_tinh", qty: 3 }] },
  },
  {
    id: "q_bc_huyet_ma_quat_collect", nameKey: "q_bc_huyet_ma_quat_collect", descKey: "q_bc_huyet_ma_quat_collect_desc",
    npc: "truong_lao_ma",
    acceptTalk: "q_bc_huyet_ma_quat_collect_accept", turninTalk: "q_bc_huyet_ma_quat_collect_turnin",
    req: "q_bc_huyet_ma_quat_explore", autoAccept: true,
    sect: "cuu_u_ma_tong", rank: "noi_mon",
    need: { type: "secret_nodes", realm: "huyet_ma_quat", count: 10 },
    reward: { stones: 800, exp: 1200, items: [{ id: "huyet_ma_tinh", qty: 5 }] },
  },
  {
    id: "q_bc_huyet_ma_quat_boss", nameKey: "q_bc_huyet_ma_quat_boss", descKey: "q_bc_huyet_ma_quat_boss_desc",
    npc: "truong_lao_ma",
    req: "q_bc_huyet_ma_quat_collect", autoAccept: true,
    sect: "cuu_u_ma_tong", rank: "ho_phap",
    need: { type: "trial", boss: { nameKey: "bc_boss_huyet_ma_tuong", hp: 2700, atk: 140, def: 40 } },
    acceptTalk: "q_bc_huyet_ma_quat_boss_accept", turninTalk: "q_bc_huyet_ma_quat_boss_turnin",
    eventKey: "q_bc_huyet_ma_quat_boss_event", fx: "#ff3d5a",
    reward: { stones: 2000, exp: 3000, items: [{ id: "manual_ma_1", qty: 1 }, { id: "huyet_ma_tinh", qty: 5 }] },
  },
  {
    id: "q_bc_huyet_hai_ngoai_vi_explore", nameKey: "q_bc_huyet_hai_ngoai_vi_explore", descKey: "q_bc_huyet_hai_ngoai_vi_explore_desc",
    npc: "minh_chu",
    autoAccept: true,
    rank: "ngoai_mon",
    need: { type: "secret_enter", realm: "huyet_hai_ngoai_vi", count: 1 },
    acceptTalk: "q_bc_huyet_hai_ngoai_vi_explore_accept", turninTalk: "q_bc_huyet_hai_ngoai_vi_explore_turnin",
    reward: { stones: 500, exp: 800, items: [{ id: "huyet_hai_chau", qty: 3 }] },
  },
  {
    id: "q_bc_huyet_hai_ngoai_vi_collect", nameKey: "q_bc_huyet_hai_ngoai_vi_collect", descKey: "q_bc_huyet_hai_ngoai_vi_collect_desc",
    npc: "minh_chu",
    acceptTalk: "q_bc_huyet_hai_ngoai_vi_collect_accept", turninTalk: "q_bc_huyet_hai_ngoai_vi_collect_turnin",
    req: "q_bc_huyet_hai_ngoai_vi_explore", autoAccept: true,
    rank: "noi_mon",
    need: { type: "secret_nodes", realm: "huyet_hai_ngoai_vi", count: 10 },
    reward: { stones: 800, exp: 1200, items: [{ id: "huyet_hai_chau", qty: 5 }] },
  },
  {
    id: "q_bc_huyet_hai_ngoai_vi_boss", nameKey: "q_bc_huyet_hai_ngoai_vi_boss", descKey: "q_bc_huyet_hai_ngoai_vi_boss_desc",
    npc: "minh_chu",
    req: "q_bc_huyet_hai_ngoai_vi_collect", autoAccept: true,
    rank: "ho_phap",
    need: { type: "trial", boss: { nameKey: "bc_boss_huyet_hai_ma_kinh", hp: 6500, atk: 220, def: 80 } },
    acceptTalk: "q_bc_huyet_hai_ngoai_vi_boss_accept", turninTalk: "q_bc_huyet_hai_ngoai_vi_boss_turnin",
    eventKey: "q_bc_huyet_hai_ngoai_vi_boss_event", fx: "#ff3d5a",
    reward: { stones: 2000, exp: 3000, items: [{ id: "manual_boss_datru", qty: 1 }, { id: "huyet_hai_chau", qty: 5 }] },
  },
  {
    id: "q_bc_huyet_hai_ngoai_vi_party", nameKey: "q_bc_huyet_hai_ngoai_vi_party", descKey: "q_bc_huyet_hai_ngoai_vi_party_desc",
    npc: "minh_chu",
    req: "q_bc_huyet_hai_ngoai_vi_boss", autoAccept: true,
    rank: "ho_phap",
    need: { type: "secret_party", realm: "huyet_hai_ngoai_vi", count: 1 },
    acceptTalk: "q_bc_huyet_hai_ngoai_vi_party_accept", turninTalk: "q_bc_huyet_hai_ngoai_vi_party_turnin",
    reward: { stones: 3000, exp: 5000, items: [{ id: "huyet_hai_chau", qty: 8 }] },
  },
  {
    id: "q_bc_thien_khuyet_phe_tich_explore", nameKey: "q_bc_thien_khuyet_phe_tich_explore", descKey: "q_bc_thien_khuyet_phe_tich_explore_desc",
    npc: "minh_chu",
    autoAccept: true,
    rank: "ngoai_mon",
    need: { type: "secret_enter", realm: "thien_khuyet_phe_tich", count: 1 },
    acceptTalk: "q_bc_thien_khuyet_phe_tich_explore_accept", turninTalk: "q_bc_thien_khuyet_phe_tich_explore_turnin",
    reward: { stones: 500, exp: 800, items: [{ id: "thien_khuyet_manh", qty: 3 }] },
  },
  {
    id: "q_bc_thien_khuyet_phe_tich_collect", nameKey: "q_bc_thien_khuyet_phe_tich_collect", descKey: "q_bc_thien_khuyet_phe_tich_collect_desc",
    npc: "minh_chu",
    acceptTalk: "q_bc_thien_khuyet_phe_tich_collect_accept", turninTalk: "q_bc_thien_khuyet_phe_tich_collect_turnin",
    req: "q_bc_thien_khuyet_phe_tich_explore", autoAccept: true,
    rank: "noi_mon",
    need: { type: "secret_nodes", realm: "thien_khuyet_phe_tich", count: 10 },
    reward: { stones: 800, exp: 1200, items: [{ id: "thien_khuyet_manh", qty: 5 }] },
  },
  {
    id: "q_bc_thien_khuyet_phe_tich_boss", nameKey: "q_bc_thien_khuyet_phe_tich_boss", descKey: "q_bc_thien_khuyet_phe_tich_boss_desc",
    npc: "minh_chu",
    req: "q_bc_thien_khuyet_phe_tich_collect", autoAccept: true,
    rank: "ho_phap",
    need: { type: "trial", boss: { nameKey: "bc_boss_thu_ho_gia", hp: 15000, atk: 400, def: 150 } },
    acceptTalk: "q_bc_thien_khuyet_phe_tich_boss_accept", turninTalk: "q_bc_thien_khuyet_phe_tich_boss_turnin",
    eventKey: "q_bc_thien_khuyet_phe_tich_boss_event", fx: "#ffe9a8",
    reward: { stones: 2000, exp: 3000, items: [{ id: "manual_boss_datru", qty: 1 }, { id: "thien_khuyet_manh", qty: 5 }] },
  },
  {
    id: "q_bc_thien_khuyet_phe_tich_party", nameKey: "q_bc_thien_khuyet_phe_tich_party", descKey: "q_bc_thien_khuyet_phe_tich_party_desc",
    npc: "minh_chu",
    req: "q_bc_thien_khuyet_phe_tich_boss", autoAccept: true,
    rank: "ho_phap",
    need: { type: "secret_party", realm: "thien_khuyet_phe_tich", count: 1 },
    acceptTalk: "q_bc_thien_khuyet_phe_tich_party_accept", turninTalk: "q_bc_thien_khuyet_phe_tich_party_turnin",
    reward: { stones: 3000, exp: 5000, items: [{ id: "thien_khuyet_manh", qty: 8 }] },
  },
  {
    id: "q_bc_tower_10",
    img: "assets/quests/q-bc-tower.webp", nameKey: "q_bc_tower_10", descKey: "q_bc_tower_10_desc",
    npc: "truong_tran",
    acceptTalk: "q_bc_tower_10_accept", turninTalk: "q_bc_tower_10_turnin",
    autoAccept: true,
    rank: "noi_mon",
    need: { type: "tower_floor", floor: 10 },
    reward: { stones: 500, exp: 1000, items: [{ id: "dan_hx_tieu", qty: 2 }] },
  },
  {
    id: "q_bc_tower_25", nameKey: "q_bc_tower_25", descKey: "q_bc_tower_25_desc",
    npc: "truong_tran",
    acceptTalk: "q_bc_tower_25_accept", turninTalk: "q_bc_tower_25_turnin",
    req: "q_bc_tower_10", autoAccept: true,
    rank: "ho_phap",
    need: { type: "tower_floor", floor: 25 },
    reward: { stones: 1200, exp: 2500, items: [{ id: "dan_hl_trung", qty: 2 }] },
  },
  {
    id: "q_bc_tower_50", nameKey: "q_bc_tower_50", descKey: "q_bc_tower_50_desc",
    npc: "truong_tran",
    acceptTalk: "q_bc_tower_50_accept", turninTalk: "q_bc_tower_50_turnin",
    req: "q_bc_tower_25", autoAccept: true,
    rank: "truong_lao",
    need: { type: "tower_floor", floor: 50 },
    reward: { stones: 2500, exp: 5000, items: [{ id: "yaodan2", qty: 2 }] },
  },
  {
    id: "q_bc_tower_75", nameKey: "q_bc_tower_75", descKey: "q_bc_tower_75_desc",
    npc: "truong_tran",
    acceptTalk: "q_bc_tower_75_accept", turninTalk: "q_bc_tower_75_turnin",
    req: "q_bc_tower_50", autoAccept: true,
    rank: "noi_mon",
    need: { type: "tower_floor", floor: 75 },
    reward: { stones: 4000, exp: 8000, items: [{ id: "yaodan3", qty: 2 }] },
  },
  {
    id: "q_bc_tower_100", nameKey: "q_bc_tower_100", descKey: "q_bc_tower_100_desc",
    npc: "truong_tran",
    acceptTalk: "q_bc_tower_100_accept", turninTalk: "q_bc_tower_100_turnin",
    req: "q_bc_tower_75", autoAccept: true,
    rank: "noi_mon",
    need: { type: "tower_floor", floor: 100 },
    reward: { stones: 8000, exp: 15000, items: [{ id: "manual_boss_datru", qty: 2 }] },
  },
);

/* ---- Vật phẩm đặc sản bí cảnh (Bui 2026-10-18: nhiệm vụ bí cảnh) ---- */
Object.assign(ITEMS, {
  kiem_hon_thach: { kind: "material", nameKey: "it_kiem_hon_thach", descKey: "it_kiem_hon_thach_desc",
    price: 800, sell: 400, icon: "🗡️", doHiem: 3, doKho: 2, bcRealm: "kiem_trung",
    useFor: ["luyen_hoa", "nuoi_khi_linh"] },
  tinh_than_sa: { kind: "material", nameKey: "it_tinh_than_sa", descKey: "it_tinh_than_sa_desc",
    price: 800, sell: 400, icon: "✨", doHiem: 3, doKho: 2, bcRealm: "tinh_than_bi_canh",
    useFor: ["luyen_hoa", "nuoi_khi_linh"] },
  la_han_xa_loi: { kind: "material", nameKey: "it_la_han_xa_loi", descKey: "it_la_han_xa_loi_desc",
    price: 800, sell: 400, icon: "📿", doHiem: 3, doKho: 2, bcRealm: "la_han_dong",
    useFor: ["luyen_hoa", "nuoi_khi_linh"] },
  van_nien_linh_chi: { kind: "material", nameKey: "it_van_nien_linh_chi", descKey: "it_van_nien_linh_chi_desc",
    price: 800, sell: 400, icon: "🍄", doHiem: 3, doKho: 2, bcRealm: "duoc_vuong_coc",
    useFor: ["luyen_hoa", "nuoi_khi_linh"] },
  thu_vuong_huyet: { kind: "material", nameKey: "it_thu_vuong_huyet", descKey: "it_thu_vuong_huyet_desc",
    price: 800, sell: 400, icon: "🩸", doHiem: 3, doKho: 2, bcRealm: "van_thu_quat",
    useFor: ["luyen_hoa", "nuoi_khi_linh"] },
  huyet_ma_tinh: { kind: "material", nameKey: "it_huyet_ma_tinh", descKey: "it_huyet_ma_tinh_desc",
    price: 800, sell: 400, icon: "🔮", doHiem: 3, doKho: 2, bcRealm: "huyet_ma_quat",
    useFor: ["luyen_hoa", "nuoi_khi_linh"] },
  huyet_hai_chau: { kind: "material", nameKey: "it_huyet_hai_chau", descKey: "it_huyet_hai_chau_desc",
    price: 800, sell: 400, icon: "🔴", doHiem: 3, doKho: 2, bcRealm: "huyet_hai_ngoai_vi",
    useFor: ["luyen_hoa", "nuoi_khi_linh"] },
  thien_khuyet_manh: { kind: "material", nameKey: "it_thien_khuyet_manh", descKey: "it_thien_khuyet_manh_desc",
    price: 800, sell: 400, icon: "💠", doHiem: 3, doKho: 2, bcRealm: "thien_khuyet_phe_tich",
    useFor: ["luyen_hoa", "nuoi_khi_linh"] },
});

/* Node.js export (cho smoke test) */

/* ---- Pháp khí (thiếu = skill tương ứng chỉ 50% damage) ---- */
/* ---- Linh dược mới: Cửu Diệp Linh Chi ---- */
Object.assign(ITEMS, {
  cuu_diep_linh_chi: { kind: "herb", nameKey: "it_cuu_diep_linh_chi", descKey: "it_cuu_diep_linh_chi_desc",
    price: 5000, sell: 2500, icon: "🌿",
    herbTier: 5, gatherMap: "Huyết Hải", useFor: ["dan_hop_the","dan_quy_nhat","dan_dai_thua","dan_tien_linh","dan_do_kiep","dan_cuu_kiep"],
    doHiem: 5, doKho: 3,
  },
});
/* ---- Đan dược riêng từng cảnh giới (Bui DUYỆT 2026-10-18) ----
 * reqRealm: 1 Luyện Khí → 7 Độ Kiếp. tuVi: +tu vi khi uống. hoiChieu: giây.
 * congThuc: công thức luyện đan. dotPhaBonus: +tỉ lệ đột phá cảnh giới tương ứng. */
Object.assign(ITEMS, {
  /* Luyện Khí */
  dan_tu_khi: { kind: "pill", nameKey: "it_dan_tu_khi", descKey: "it_dan_tu_khi_desc",
    tuVi: 500, reqRealm: 1, hoiChieu: 300,
    congThuc: [["taycothao",3],["thao_linh_chi",2]],
    price: 300, sell: 90, icon: "🟢", doHiem: 1, doKho: 0 },
  dan_hoi_khi_tan: { kind: "pill", nameKey: "it_dan_hoi_khi_tan", descKey: "it_dan_hoi_khi_tan_desc",
    healMp: 0.5, reqRealm: 1, hoiChieu: 60,
    congThuc: [["thao_linh_chi",2]],
    price: 150, sell: 45, icon: "🔵", doHiem: 0, doKho: 0 },
  /* Trúc Cơ */
  dan_boi_nguyen: { kind: "pill", nameKey: "it_dan_boi_nguyen", descKey: "it_dan_boi_nguyen_desc",
    tuVi: 2000, reqRealm: 2, hoiChieu: 600,
    congThuc: [["truc_co_thao",5],["dia_linh_qua",3]],
    price: 1500, sell: 450, icon: "🟢", doHiem: 2, doKho: 1 },
  /* Kim Đan */
  dan_ngung_dan: { kind: "pill", nameKey: "it_dan_ngung_dan", descKey: "it_dan_ngung_dan_desc",
    dotPhaBonus: 0.15, dotPhaRealm: 3, reqRealm: 3,
    congThuc: [["dia_linh_qua",5],["yaodan2",1]],
    price: 5000, sell: 1500, icon: "🟡", doHiem: 3, doKho: 2 },
  dan_cuu_chuyen: { kind: "pill", nameKey: "it_dan_cuu_chuyen", descKey: "it_dan_cuu_chuyen_desc",
    tuVi: 8000, reqRealm: 3, hoiChieu: 900,
    congThuc: [["that_diep_chi",3],["dia_linh_qua",2]],
    price: 4000, sell: 1200, icon: "🟠", doHiem: 3, doKho: 2 },
  /* Nguyên Anh */
  dan_duong_anh: { kind: "pill", nameKey: "it_dan_duong_anh", descKey: "it_dan_duong_anh_desc",
    tuVi: 20000, reqRealm: 4, hoiChieu: 1200,
    congThuc: [["that_diep_chi",5],["yaodan3",1]],
    price: 12000, sell: 3600, icon: "🟣", doHiem: 4, doKho: 2 },
  dan_ho_mach: { kind: "pill", nameKey: "it_dan_ho_mach", descKey: "it_dan_ho_mach_desc",
    dotPhaBonus: 0.2, dotPhaRealm: 4, reqRealm: 4,
    congThuc: [["that_diep_chi",3],["tien_thao",2]],
    price: 10000, sell: 3000, icon: "💠", doHiem: 4, doKho: 2 },
  /* Hóa Thần */
  dan_than_du: { kind: "pill", nameKey: "it_dan_than_du", descKey: "it_dan_than_du_desc",
    tuVi: 50000, reqRealm: 5, hoiChieu: 1800,
    congThuc: [["tien_thao",5],["yaodan4",1]],
    price: 30000, sell: 9000, icon: "🔮", doHiem: 5, doKho: 3 },
  dan_tu_than: { kind: "pill", nameKey: "it_dan_tu_than", descKey: "it_dan_tu_than_desc",
    healFocus: 100, reqRealm: 5, hoiChieu: 1800,
    congThuc: [["tien_thao",3],["that_diep_chi",3]],
    price: 25000, sell: 7500, icon: "🌀", doHiem: 5, doKho: 3 },
  /* Luyện Hư */
  dan_hu_linh: { kind: "pill", nameKey: "it_dan_hu_linh", descKey: "it_dan_hu_linh_desc",
    tuVi: 120000, reqRealm: 6, hoiChieu: 3600,
    congThuc: [["tien_thao",5],["huyet_tinh",2],["yaodan4",1]],
    price: 80000, sell: 24000, icon: "🌫️", doHiem: 5, doKho: 3 },
  dan_co_ban: { kind: "pill", nameKey: "it_dan_co_ban", descKey: "it_dan_co_ban_desc",
    coBan: 1, reqRealm: 6,
    congThuc: [["huyet_tinh",3],["that_diep_chi",5]],
    price: 60000, sell: 18000, icon: "🛡️", doHiem: 5, doKho: 3 },
  /* Hợp Thể */
  dan_hop_the: { kind: "pill", nameKey: "it_dan_hop_the", descKey: "it_dan_hop_the_desc",
    dotPhaBonus: 0.2, dotPhaRealm: 6, reqRealm: 6,
    congThuc: [["cuu_diep_linh_chi",1],["huyet_tinh",3],["yaodan5",1]],
    price: 150000, sell: 45000, icon: "☯️", doHiem: 6, doKho: 3 },
  dan_quy_nhat: { kind: "pill", nameKey: "it_dan_quy_nhat", descKey: "it_dan_quy_nhat_desc",
    tuVi: 300000, reqRealm: 6, hoiChieu: 3600,
    congThuc: [["cuu_diep_linh_chi",1],["tien_thao",5]],
    price: 120000, sell: 36000, icon: "🌟", doHiem: 6, doKho: 3 },
  /* Đại Thừa */
  dan_dai_thua: { kind: "pill", nameKey: "it_dan_dai_thua", descKey: "it_dan_dai_thua_desc",
    dotPhaBonus: 0.25, dotPhaRealm: 6, reqRealm: 6,
    congThuc: [["cuu_diep_linh_chi",2],["yaodan5",1]],
    price: 300000, sell: 90000, icon: "✨", doHiem: 6, doKho: 3 },
  dan_tien_linh: { kind: "pill", nameKey: "it_dan_tien_linh", descKey: "it_dan_tien_linh_desc",
    tuVi: 800000, reqRealm: 6, hoiChieu: 7200,
    congThuc: [["cuu_diep_linh_chi",2],["huyet_tinh",3]],
    price: 250000, sell: 75000, icon: "💫", doHiem: 6, doKho: 3 },
  /* Độ Kiếp */
  dan_do_kiep: { kind: "pill", nameKey: "it_dan_do_kiep", descKey: "it_dan_do_kiep_desc",
    giamLoiKiep: 0.3, reqRealm: 7,
    congThuc: [["cuu_diep_linh_chi",3],["yaodan5",2]],
    price: 500000, sell: 150000, icon: "⚡", doHiem: 6, doKho: 4 },
  dan_cuu_kiep: { kind: "pill", nameKey: "it_dan_cuu_kiep", descKey: "it_dan_cuu_kiep_desc",
    tuVi: 2000000, reqRealm: 7, hoiChieu: 7200,
    congThuc: [["cuu_diep_linh_chi",5]],
    price: 800000, sell: 240000, icon: "🌩️", doHiem: 6, doKho: 4 },
});
Object.assign(ITEMS, {
  kiem_hap: {
    kind: "phap_khi",
    nameKey: "it_kiem_hap",
    descKey: "it_kiem_hap_desc",
    price: 2000,
    sell: 200,
    img: "assets/weapons/wpn_kiem_hap.webp"
  },
  huyet_kiem: {
    kind: "phap_khi",
    nameKey: "it_huyet_kiem",
    descKey: "it_huyet_kiem_desc",
    price: 2500,
    sell: 250,
    img: "assets/weapons/wpn_kiem_huyet_kiem.webp"
  },
  bang_linh_kiem: {
    kind: "phap_khi",
    nameKey: "it_bang_linh_kiem",
    descKey: "it_bang_linh_kiem_desc",
    price: 2500,
    sell: 250,
    img: "assets/weapons/wpn_bang_linh_kiem.webp"
  },
  hoang_loi_thuong: {
    kind: "phap_khi",
    nameKey: "it_hoang_loi_thuong",
    descKey: "it_hoang_loi_thuong_desc",
    price: 3000,
    sell: 300,
    img: "assets/weapons/wpn_thuong_hoang_loi_thuong.webp"
  },
  hon_phien: {
    kind: "phap_khi",
    nameKey: "it_hon_phien",
    descKey: "it_hon_phien_desc",
    price: 3000,
    sell: 300,
    img: "assets/weapons/wpn_phien_hon_phien.webp"
  },
  dan_lo: {
    kind: "phap_khi",
    nameKey: "it_dan_lo",
    descKey: "it_dan_lo_desc",
    price: 2500,
    sell: 250,
    img: "assets/weapons/wpn_dan_lo.webp"
  },
  thu_bai: {
    kind: "phap_khi",
    nameKey: "it_thu_bai",
    descKey: "it_thu_bai_desc",
    price: 2500,
    sell: 250,
    img: "assets/weapons/wpn_thu_bai.webp"
  }
});

/* ---- 38 bí tịch mới theo storyboard tutien2d (data-driven: skillDef/passiveDef trong entry) ---- */
Object.assign(ITEMS, {
  manual_thien_kiem_tram: {
    kind: "manual",
    tier: 2,
    learnCost: 1500,
    realm: 2,
    dao: "chinh",
    exclusive: true,
    nameKey: "it_manual_thien_kiem_tram",
    descKey: "it_manual_thien_kiem_tram_desc",
    price: 5000,
    sell: 1500,
    skill: "thien_kiem_tram",
    skillDef: {
      kind: "dmg",
      mp: 40,
      cd: 25,
      dtype: "kiem",
      elem: "kiem",
      rng: 220,
      dao: "chinh",
      icon: "🗡️",
      effect_sheet: "eff_swordshadow_sheet",
      effect_mau: "#ffe9a8",
      nameKey: "sk_thien_kiem_tram",
      descKey: "sk_thien_kiem_tram_desc",
      mult: 7.5,
      fxStatus: {
        stun: 1
      }
    },
    dieu_kien_mo: {
      tong: "kiem_tong"
    }
  },
  manual_van_kiem_phi_tinh: {
    kind: "manual",
    tier: 1,
    learnCost: 800,
    realm: 1,
    dao: "chinh",
    exclusive: true,
    nameKey: "it_manual_van_kiem_phi_tinh",
    descKey: "it_manual_van_kiem_phi_tinh_desc",
    price: 2000,
    sell: 300,
    skill: "van_kiem_phi_tinh",
    skillDef: {
      kind: "aoe",
      mp: 30,
      cd: 12,
      dtype: "kiem",
      elem: "kiem",
      rng: 200,
      dao: "chinh",
      icon: "⚔️",
      effect_sheet: "eff_swordshadow_sheet",
      effect_mau: "#cfe8ff",
      nameKey: "sk_van_kiem_phi_tinh",
      descKey: "sk_van_kiem_phi_tinh_desc",
      mult: 5.0,
      aoeN: 4
    },
    dieu_kien_mo: {
      tong: "kiem_tong"
    }
  },
  manual_huyet_kiem_sat: {
    kind: "manual",
    tier: 1,
    learnCost: 800,
    realm: 1,
    dao: "chinh",
    exclusive: true,
    nameKey: "it_manual_huyet_kiem_sat",
    descKey: "it_manual_huyet_kiem_sat_desc",
    price: 2000,
    sell: 300,
    skill: "huyet_kiem_sat",
    skillDef: {
      kind: "dmg",
      mp: 20,
      cd: 8,
      dtype: "kiem",
      elem: "huyet",
      rng: 130,
      dao: "chinh",
      icon: "🩸",
      effect_sheet: "eff_demon_sheet",
      effect_mau: "#ff5252",
      nameKey: "sk_huyet_kiem_sat",
      descKey: "sk_huyet_kiem_sat_desc",
      mult: 4.5,
      lifesteal: 0.03,
      fxStatus: {
        wound: 4
      }
    },
    dieu_kien_mo: {
      tong: "kiem_tong"
    }
  },
  manual_kiem_anh_phan_than: {
    kind: "manual",
    tier: 0,
    learnCost: 300,
    realm: 1,
    dao: "chinh",
    exclusive: true,
    nameKey: "it_manual_kiem_anh_phan_than",
    descKey: "it_manual_kiem_anh_phan_than_desc",
    price: 800,
    sell: 50,
    skill: "kiem_anh_phan_than",
    skillDef: {
      kind: "dmg",
      mp: 15,
      cd: 10,
      dtype: "kiem",
      elem: "kiem",
      rng: 150,
      dao: "chinh",
      icon: "👥",
      effect_sheet: "eff_slash_sheet",
      effect_mau: "#ffffff",
      nameKey: "sk_kiem_anh_phan_than",
      descKey: "sk_kiem_anh_phan_than_desc",
      mult: 2.5,
      fxStatus: {
        slow: 2
      }
    },
    dieu_kien_mo: {
      tong: "kiem_tong"
    }
  },
  manual_cuu_thien_loi_nguc: {
    kind: "manual",
    tier: 2,
    learnCost: 1500,
    realm: 2,
    dao: "chinh",
    exclusive: true,
    nameKey: "it_manual_cuu_thien_loi_nguc",
    descKey: "it_manual_cuu_thien_loi_nguc_desc",
    price: 5000,
    sell: 1500,
    skill: "cuu_thien_loi_nguc",
    skillDef: {
      kind: "aoe",
      mp: 42,
      cd: 28,
      dtype: "phap",
      elem: "loi",
      rng: 190,
      dao: "chinh",
      icon: "🌩️",
      effect_sheet: "eff_lightning_sheet",
      effect_mau: "#b388ff",
      nameKey: "sk_cuu_thien_loi_nguc",
      descKey: "sk_cuu_thien_loi_nguc_desc",
      mult: 8.0,
      aoeN: 5,
      fxStatus: {
        stun: 2
      }
    },
    dieu_kien_mo: {
      tong: "thien_phap_tong"
    }
  },
  manual_phan_thien_hoa_hai: {
    kind: "manual",
    tier: 1,
    learnCost: 800,
    realm: 1,
    dao: "chinh",
    exclusive: true,
    nameKey: "it_manual_phan_thien_hoa_hai",
    descKey: "it_manual_phan_thien_hoa_hai_desc",
    price: 2000,
    sell: 300,
    skill: "phan_thien_hoa_hai",
    skillDef: {
      kind: "aoe",
      mp: 32,
      cd: 14,
      dtype: "phap",
      elem: "hoa",
      rng: 170,
      dao: "chinh",
      icon: "🔥",
      effect_sheet: "eff_fire_sheet",
      effect_mau: "#ff8a65",
      nameKey: "sk_phan_thien_hoa_hai",
      descKey: "sk_phan_thien_hoa_hai_desc",
      mult: 5.2,
      aoeN: 4,
      fxStatus: {
        burn: 5
      }
    },
    dieu_kien_mo: {
      tong: "thien_phap_tong"
    }
  },
  manual_huyen_bang_phong_bao: {
    kind: "manual",
    tier: 1,
    learnCost: 800,
    realm: 1,
    dao: "chinh",
    exclusive: true,
    nameKey: "it_manual_huyen_bang_phong_bao",
    descKey: "it_manual_huyen_bang_phong_bao_desc",
    price: 2000,
    sell: 300,
    skill: "huyen_bang_phong_bao",
    skillDef: {
      kind: "aoe",
      mp: 26,
      cd: 11,
      dtype: "phap",
      elem: "bang",
      rng: 160,
      dao: "chinh",
      icon: "❄️",
      effect_sheet: "eff_ice_sheet",
      effect_mau: "#9be8ff",
      nameKey: "sk_huyen_bang_phong_bao",
      descKey: "sk_huyen_bang_phong_bao_desc",
      mult: 4.2,
      aoeN: 4,
      fxStatus: {
        slow: 4
      }
    },
    dieu_kien_mo: {
      tong: "thien_phap_tong"
    }
  },
  manual_phong_loi_dan: {
    kind: "manual",
    tier: 0,
    learnCost: 300,
    realm: 1,
    dao: "chinh",
    exclusive: true,
    nameKey: "it_manual_phong_loi_dan",
    descKey: "it_manual_phong_loi_dan_desc",
    price: 800,
    sell: 50,
    skill: "phong_loi_dan",
    skillDef: {
      kind: "dmg",
      mp: 12,
      cd: 6,
      dtype: "phap",
      elem: "phong",
      rng: 140,
      dao: "chinh",
      icon: "🌪️",
      effect_sheet: "eff_lightning_sheet",
      effect_mau: "#d1c4e9",
      nameKey: "sk_phong_loi_dan",
      descKey: "sk_phong_loi_dan_desc",
      mult: 2.2,
      fxStatus: {
        slow: 2
      }
    },
    dieu_kien_mo: {
      tong: "thien_phap_tong"
    }
  },
  manual_kim_cuong_hoa_than: {
    kind: "manual",
    tier: 2,
    learnCost: 1500,
    realm: 2,
    dao: "chinh",
    exclusive: true,
    nameKey: "it_manual_kim_cuong_hoa_than",
    descKey: "it_manual_kim_cuong_hoa_than_desc",
    price: 5000,
    sell: 1500,
    skill: "kim_cuong_hoa_than",
    skillDef: {
      kind: "buff",
      mp: 30,
      cd: 37.5,
      dtype: "the",
      elem: "kim",
      rng: 140,
      dao: "chinh",
      icon: "✨",
      effect_sheet: "eff_formation_sheet",
      effect_mau: "#ffd54f",
      nameKey: "sk_kim_cuong_hoa_than",
      descKey: "sk_kim_cuong_hoa_than_desc",
      mult: 0,
      dur: 14,
      buffFx: ["atkspd", "lifesteal", "shield"]
    },
    dieu_kien_mo: {
      tong: "kim_cang_tong"
    }
  },
  manual_dai_dia_chan: {
    kind: "manual",
    tier: 1,
    learnCost: 800,
    realm: 1,
    dao: "chinh",
    exclusive: true,
    nameKey: "it_manual_dai_dia_chan",
    descKey: "it_manual_dai_dia_chan_desc",
    price: 2000,
    sell: 300,
    skill: "dai_dia_chan",
    skillDef: {
      kind: "aoe",
      mp: 28,
      cd: 12,
      dtype: "the",
      elem: "tho",
      rng: 150,
      dao: "chinh",
      icon: "🌋",
      effect_sheet: "eff_fire_sheet",
      effect_mau: "#d7ccc8",
      nameKey: "sk_dai_dia_chan",
      descKey: "sk_dai_dia_chan_desc",
      mult: 4.8,
      aoeN: 4,
      fxStatus: {
        stun: 1.5
      }
    },
    dieu_kien_mo: {
      tong: "kim_cang_tong"
    }
  },
  manual_phan_giap_kim_chung: {
    kind: "manual",
    tier: 1,
    learnCost: 800,
    realm: 1,
    dao: "chinh",
    exclusive: true,
    nameKey: "it_manual_phan_giap_kim_chung",
    descKey: "it_manual_phan_giap_kim_chung_desc",
    price: 2000,
    sell: 300,
    skill: "phan_giap_kim_chung",
    skillDef: {
      kind: "buff",
      mp: 24,
      cd: 18,
      dtype: "the",
      elem: "kim",
      rng: 0,
      dao: "chinh",
      icon: "🔔",
      effect_sheet: "eff_formation_sheet",
      effect_mau: "#ffe082",
      nameKey: "sk_phan_giap_kim_chung",
      descKey: "sk_phan_giap_kim_chung_desc",
      mult: 0,
      dur: 10,
      buffFx: ["thorns"],
      thorns: 0.3
    },
    dieu_kien_mo: {
      tong: "kim_cang_tong"
    }
  },
  manual_thiet_bo_sam: {
    kind: "manual",
    tier: 0,
    learnCost: 300,
    realm: 1,
    dao: "chinh",
    exclusive: true,
    nameKey: "it_manual_thiet_bo_sam",
    descKey: "it_manual_thiet_bo_sam_desc",
    price: 800,
    sell: 50,
    skill: "thiet_bo_sam",
    skillDef: {
      kind: "buff",
      mp: 14,
      cd: 15,
      dtype: "the",
      elem: "kim",
      rng: 0,
      dao: "chinh",
      icon: "🛡️",
      effect_sheet: "eff_formation_sheet",
      effect_mau: "#bcaaa4",
      nameKey: "sk_thiet_bo_sam",
      descKey: "sk_thiet_bo_sam_desc",
      mult: 0,
      defMult: 1.5,
      dur: 12
    },
    dieu_kien_mo: {
      tong: "kim_cang_tong"
    }
  },
  manual_dieu_thu_hoi_xuan: {
    kind: "manual",
    tier: 2,
    learnCost: 1500,
    realm: 2,
    dao: "chinh",
    exclusive: true,
    nameKey: "it_manual_dieu_thu_hoi_xuan",
    descKey: "it_manual_dieu_thu_hoi_xuan_desc",
    price: 5000,
    sell: 1500,
    skill: "dieu_thu_hoi_xuan",
    skillDef: {
      kind: "heal",
      mp: 36,
      cd: 30,
      dtype: "other",
      elem: "moc",
      rng: 0,
      dao: "chinh",
      icon: "💚",
      effect_sheet: "eff_moon_sheet",
      effect_mau: "#a5d6a7",
      nameKey: "sk_dieu_thu_hoi_xuan",
      descKey: "sk_dieu_thu_hoi_xuan_desc",
      mult: 0,
      heal: 0.5,
      cleanse: true
    },
    dieu_kien_mo: {
      tong: "duoc_vuong_tong"
    }
  },
  manual_dan_hoa_phan_thien: {
    kind: "manual",
    tier: 1,
    learnCost: 800,
    realm: 1,
    dao: "chinh",
    exclusive: true,
    nameKey: "it_manual_dan_hoa_phan_thien",
    descKey: "it_manual_dan_hoa_phan_thien_desc",
    price: 2000,
    sell: 300,
    skill: "dan_hoa_phan_thien",
    skillDef: {
      kind: "dmg",
      mp: 30,
      cd: 13,
      dtype: "other",
      elem: "hoa",
      rng: 170,
      dao: "chinh",
      icon: "🧪",
      effect_sheet: "eff_fire_sheet",
      effect_mau: "#ffab91",
      nameKey: "sk_dan_hoa_phan_thien",
      descKey: "sk_dan_hoa_phan_thien_desc",
      mult: 4.9,
      fxStatus: {
        burn: 5
      }
    },
    dieu_kien_mo: {
      tong: "duoc_vuong_tong"
    }
  },
  manual_cam_lo_quyet: {
    kind: "manual",
    tier: 1,
    learnCost: 800,
    realm: 1,
    dao: "chinh",
    exclusive: true,
    nameKey: "it_manual_cam_lo_quyet",
    descKey: "it_manual_cam_lo_quyet_desc",
    price: 2000,
    sell: 300,
    skill: "cam_lo_quyet",
    skillDef: {
      kind: "buff",
      mp: 26,
      cd: 20,
      dtype: "other",
      elem: "thuy",
      rng: 0,
      dao: "chinh",
      icon: "💧",
      effect_sheet: "eff_moon_sheet",
      effect_mau: "#c8e6c9",
      nameKey: "sk_cam_lo_quyet",
      descKey: "sk_cam_lo_quyet_desc",
      mult: 0,
      dur: 15,
      buffFx: ["regen", "pillboost"],
      regenPer2s: 0.03,
      pillBoost: 0.2
    },
    dieu_kien_mo: {
      tong: "duoc_vuong_tong"
    }
  },
  manual_thanh_tam_giai_doc: {
    kind: "manual",
    tier: 0,
    learnCost: 300,
    realm: 1,
    dao: "chinh",
    exclusive: true,
    nameKey: "it_manual_thanh_tam_giai_doc",
    descKey: "it_manual_thanh_tam_giai_doc_desc",
    price: 800,
    sell: 50,
    skill: "thanh_tam_giai_doc",
    skillDef: {
      kind: "heal",
      mp: 10,
      cd: 8,
      dtype: "other",
      elem: "moc",
      rng: 0,
      dao: "chinh",
      icon: "🌿",
      effect_sheet: "eff_moon_sheet",
      effect_mau: "#f1f8e9",
      nameKey: "sk_thanh_tam_giai_doc",
      descKey: "sk_thanh_tam_giai_doc_desc",
      mult: 0,
      heal: 0.15,
      cleanse: true
    },
    dieu_kien_mo: {
      tong: "duoc_vuong_tong"
    }
  },
  manual_van_thu_trieu_bai: {
    kind: "manual",
    tier: 2,
    learnCost: 1500,
    realm: 2,
    dao: "trung",
    exclusive: true,
    nameKey: "it_manual_van_thu_trieu_bai",
    descKey: "it_manual_van_thu_trieu_bai_desc",
    price: 5000,
    sell: 1500,
    skill: "van_thu_trieu_bai",
    skillDef: {
      kind: "dmg",
      mp: 38,
      cd: 30,
      dtype: "other",
      elem: "thu",
      rng: 200,
      dao: "trung",
      icon: "🐯",
      effect_sheet: "eff_demon_sheet",
      effect_mau: "#ff8a80",
      nameKey: "sk_van_thu_trieu_bai",
      descKey: "sk_van_thu_trieu_bai_desc",
      mult: 7.0,
      fearBossImmune: true,
      fxStatus: {
        fear: 2
      }
    },
    dieu_kien_mo: {
      tong: "ngu_thu_tong"
    }
  },
  manual_nhan_thu_hop_nhat: {
    kind: "manual",
    tier: 1,
    learnCost: 800,
    realm: 1,
    dao: "trung",
    exclusive: true,
    nameKey: "it_manual_nhan_thu_hop_nhat",
    descKey: "it_manual_nhan_thu_hop_nhat_desc",
    price: 2000,
    sell: 300,
    skill: "nhan_thu_hop_nhat",
    skillDef: {
      kind: "buff",
      mp: 30,
      cd: 25,
      dtype: "other",
      elem: "thu",
      rng: 0,
      dao: "trung",
      icon: "🔗",
      effect_sheet: "eff_dragon_sheet",
      effect_mau: "#a5d6a7",
      nameKey: "sk_nhan_thu_hop_nhat",
      descKey: "sk_nhan_thu_hop_nhat_desc",
      mult: 0,
      dur: 15,
      buffFx: ["atkboost", "spdboost", "petboost"],
      atkBoost: 0.4,
      spdBoost: 0.2,
      petBoost: 0.5
    },
    dieu_kien_mo: {
      tong: "ngu_thu_tong"
    }
  },
  manual_thu_vuong_giao_sat: {
    kind: "manual",
    tier: 1,
    learnCost: 800,
    realm: 1,
    dao: "trung",
    exclusive: true,
    nameKey: "it_manual_thu_vuong_giao_sat",
    descKey: "it_manual_thu_vuong_giao_sat_desc",
    price: 2000,
    sell: 300,
    skill: "thu_vuong_giao_sat",
    skillDef: {
      kind: "dmg",
      mp: 22,
      cd: 10,
      dtype: "other",
      elem: "thu",
      rng: 150,
      dao: "trung",
      icon: "🐺",
      effect_sheet: "eff_slash_sheet",
      effect_mau: "#ffccbc",
      nameKey: "sk_thu_vuong_giao_sat",
      descKey: "sk_thu_vuong_giao_sat_desc",
      mult: 4.6,
      fxStatus: {
        wound: 5
      }
    },
    dieu_kien_mo: {
      tong: "ngu_thu_tong"
    }
  },
  manual_linh_thu_trieu_hoan: {
    kind: "manual",
    tier: 0,
    learnCost: 300,
    realm: 1,
    dao: "trung",
    exclusive: true,
    nameKey: "it_manual_linh_thu_trieu_hoan",
    descKey: "it_manual_linh_thu_trieu_hoan_desc",
    price: 800,
    sell: 50,
    skill: "linh_thu_trieu_hoan",
    skillDef: {
      kind: "buff",
      mp: 16,
      cd: 12,
      dtype: "other",
      elem: "thu",
      rng: 0,
      dao: "trung",
      icon: "✨",
      effect_sheet: "eff_dragon_sheet",
      effect_mau: "#c5e1a5",
      nameKey: "sk_linh_thu_trieu_hoan",
      descKey: "sk_linh_thu_trieu_hoan_desc",
      mult: 0,
      dur: 0,
      buffFx: ["petreset"]
    },
    dieu_kien_mo: {
      tong: "ngu_thu_tong"
    }
  },
  manual_huyet_kiem_tran: {
    kind: "manual",
    tier: 1,
    learnCost: 800,
    realm: 1,
    dao: "ma",
    exclusive: true,
    nameKey: "it_manual_huyet_kiem_tran",
    descKey: "it_manual_huyet_kiem_tran_desc",
    price: 2000,
    sell: 300,
    skill: "huyet_kiem_tran",
    skillDef: {
      kind: "aoe",
      mp: 24,
      cd: 10,
      dtype: "other",
      elem: "huyet",
      rng: 126,
      dao: "ma",
      icon: "🗡️",
      effect_sheet: "eff_demon_sheet",
      effect_mau: "#ff5252",
      nameKey: "sk_huyet_kiem_tran",
      descKey: "sk_huyet_kiem_tran_desc",
      mult: 4.3,
      aoeN: 4
    }
  },
  manual_cuu_huyet_kiem_tran: {
    kind: "manual",
    tier: 1,
    learnCost: 800,
    realm: 1,
    dao: "ma",
    exclusive: true,
    nameKey: "it_manual_cuu_huyet_kiem_tran",
    descKey: "it_manual_cuu_huyet_kiem_tran_desc",
    price: 2000,
    sell: 300,
    skill: "cuu_huyet_kiem_tran",
    skillDef: {
      kind: "aoe",
      mp: 28,
      cd: 12,
      dtype: "other",
      elem: "huyet",
      rng: 96,
      dao: "ma",
      icon: "🩸",
      effect_sheet: "eff_demon_sheet",
      effect_mau: "#d32f2f",
      nameKey: "sk_cuu_huyet_kiem_tran",
      descKey: "sk_cuu_huyet_kiem_tran_desc",
      mult: 5.0,
      aoeN: 5,
      lifesteal: 0.05
    }
  },
  manual_tram_ma: {
    kind: "manual",
    tier: 0,
    learnCost: 300,
    realm: 1,
    dao: "ma",
    exclusive: true,
    nameKey: "it_manual_tram_ma",
    descKey: "it_manual_tram_ma_desc",
    price: 800,
    sell: 50,
    skill: "tram_ma",
    skillDef: {
      kind: "dmg",
      mp: 18,
      cd: 9,
      dtype: "other",
      elem: "ma",
      rng: 176,
      dao: "ma",
      icon: "👹",
      effect_sheet: "eff_demon_sheet",
      effect_mau: "#7b1fa2",
      nameKey: "sk_tram_ma",
      descKey: "sk_tram_ma_desc",
      mult: 2.6,
      fxStatus: {
        burn: 4
      }
    }
  },
  manual_ma_bao_an: {
    kind: "manual",
    tier: 1,
    learnCost: 800,
    realm: 2,
    dao: "ma",
    exclusive: true,
    nameKey: "it_manual_ma_bao_an",
    descKey: "it_manual_ma_bao_an_desc",
    price: 2000,
    sell: 300,
    skill: "ma_bao_an",
    skillDef: {
      kind: "aoe",
      mp: 34,
      cd: 13,
      dtype: "other",
      elem: "ma",
      rng: 150,
      dao: "ma",
      icon: "🔥",
      effect_sheet: "eff_demon_sheet",
      effect_mau: "#4a148c",
      nameKey: "sk_ma_bao_an",
      descKey: "sk_ma_bao_an_desc",
      mult: 5.1,
      aoeN: 4,
      fxStatus: {
        burn: 5
      }
    }
  },
  manual_cuu_u_ma_trao: {
    kind: "manual",
    tier: 2,
    learnCost: 1500,
    realm: 2,
    dao: "ma",
    exclusive: true,
    nameKey: "it_manual_cuu_u_ma_trao",
    descKey: "it_manual_cuu_u_ma_trao_desc",
    price: 5000,
    sell: 1500,
    skill: "cuu_u_ma_trao",
    skillDef: {
      kind: "dmg",
      mp: 36,
      cd: 15,
      dtype: "other",
      elem: "ma",
      rng: 180,
      dao: "ma",
      icon: "🖐️",
      effect_sheet: "eff_demon_sheet",
      effect_mau: "#311b92",
      nameKey: "sk_cuu_u_ma_trao",
      descKey: "sk_cuu_u_ma_trao_desc",
      mult: 6.6
    },
    tang: 1
  },
  manual_bich_nguc_giang_dao: {
    kind: "manual",
    tier: 2,
    learnCost: 1500,
    realm: 2,
    dao: "ma",
    exclusive: true,
    nameKey: "it_manual_bich_nguc_giang_dao",
    descKey: "it_manual_bich_nguc_giang_dao_desc",
    price: 5000,
    sell: 1500,
    skill: "bich_nguc_giang_dao",
    skillDef: {
      kind: "dmg",
      mp: 38,
      cd: 16,
      dtype: "other",
      elem: "ma",
      rng: 180,
      dao: "ma",
      icon: "🔪",
      effect_sheet: "eff_demon_sheet",
      effect_mau: "#1a237e",
      nameKey: "sk_bich_nguc_giang_dao",
      descKey: "sk_bich_nguc_giang_dao_desc",
      mult: 7.5,
      fearBossImmune: true,
      fxStatus: {
        fear: 3
      }
    },
    tang: 1
  },
  manual_huyet_buc_chuong: {
    kind: "manual",
    tier: 0,
    learnCost: 300,
    realm: 1,
    dao: "ma",
    exclusive: true,
    nameKey: "it_manual_huyet_buc_chuong",
    descKey: "it_manual_huyet_buc_chuong_desc",
    price: 800,
    sell: 50,
    skill: "huyet_buc_chuong",
    skillDef: {
      kind: "dmg",
      mp: 14,
      cd: 5.5,
      dtype: "other",
      elem: "huyet",
      rng: 130,
      dao: "ma",
      icon: "🦇",
      effect_sheet: "eff_demon_sheet",
      effect_mau: "#c62828",
      nameKey: "sk_huyet_buc_chuong",
      descKey: "sk_huyet_buc_chuong_desc",
      mult: 2.4,
      fxStatus: {
        wound: 4
      }
    }
  },
  manual_son_ha_nhap_hoa: {
    kind: "manual",
    tier: 1,
    learnCost: 800,
    realm: 2,
    dao: "ma",
    exclusive: true,
    nameKey: "it_manual_son_ha_nhap_hoa",
    descKey: "it_manual_son_ha_nhap_hoa_desc",
    price: 2000,
    sell: 300,
    skill: "son_ha_nhap_hoa",
    skillDef: {
      kind: "aoe",
      mp: 26,
      cd: 10,
      dtype: "other",
      elem: "mac",
      rng: 190,
      dao: "ma",
      icon: "🖌️",
      effect_sheet: "eff_demon_sheet",
      effect_mau: "#37474f",
      nameKey: "sk_son_ha_nhap_hoa",
      descKey: "sk_son_ha_nhap_hoa_desc",
      mult: 4.6,
      aoeN: 5
    }
  },
  manual_kiem_y_thong_minh: {
    kind: "manual",
    tier: 1,
    learnCost: 800,
    realm: 2,
    dao: "chinh",
    exclusive: true,
    nameKey: "it_manual_kiem_y_thong_minh",
    descKey: "it_manual_kiem_y_thong_minh_desc",
    price: 2000,
    sell: 300,
    passive: "kiem_y_thong_minh",
    passiveDef: {
      icon: "🧠",
      sp: 2,
      realm: 2,
      perLevel: "đòn 4 +12%",
      nameKey: "ps_kiem_y_thong_minh",
      descKey: "ps_kiem_y_thong_minh_desc"
    },
    dieu_kien_mo: {
      tong: "kiem_tong"
    }
  },
  manual_van_kiem_ho_the: {
    kind: "manual",
    tier: 1,
    learnCost: 800,
    realm: 2,
    dao: "chinh",
    exclusive: true,
    nameKey: "it_manual_van_kiem_ho_the",
    descKey: "it_manual_van_kiem_ho_the_desc",
    price: 2000,
    sell: 300,
    passive: "van_kiem_ho_the",
    passiveDef: {
      icon: "🛡️",
      sp: 3,
      realm: 2,
      perLevel: "-10% dmg",
      nameKey: "ps_van_kiem_ho_the",
      descKey: "ps_van_kiem_ho_the_desc"
    },
    dieu_kien_mo: {
      tong: "kiem_tong"
    }
  },
  manual_loi_hoa_song_tuyet: {
    kind: "manual",
    tier: 1,
    learnCost: 800,
    realm: 2,
    dao: "chinh",
    exclusive: true,
    nameKey: "it_manual_loi_hoa_song_tuyet",
    descKey: "it_manual_loi_hoa_song_tuyet_desc",
    price: 2000,
    sell: 300,
    passive: "loi_hoa_song_tuyet",
    passiveDef: {
      icon: "⛈️",
      sp: 3,
      realm: 2,
      perLevel: "+15% dmg",
      nameKey: "ps_loi_hoa_song_tuyet",
      descKey: "ps_loi_hoa_song_tuyet_desc"
    },
    dieu_kien_mo: {
      tong: "thien_phap_tong"
    }
  },
  manual_ngu_hanh_ho_the: {
    kind: "manual",
    tier: 0,
    learnCost: 500,
    realm: 1,
    dao: "chinh",
    exclusive: true,
    nameKey: "it_manual_ngu_hanh_ho_the",
    descKey: "it_manual_ngu_hanh_ho_the_desc",
    price: 800,
    sell: 50,
    passive: "ngu_hanh_ho_the",
    passiveDef: {
      icon: "☯️",
      sp: 2,
      realm: 1,
      perLevel: "+25% dur",
      nameKey: "ps_ngu_hanh_ho_the",
      descKey: "ps_ngu_hanh_ho_the_desc"
    },
    dieu_kien_mo: {
      tong: "thien_phap_tong"
    }
  },
  manual_kim_cang_bat_hoai_the: {
    kind: "manual",
    tier: 1,
    learnCost: 800,
    realm: 2,
    dao: "chinh",
    exclusive: true,
    nameKey: "it_manual_kim_cang_bat_hoai_the",
    descKey: "it_manual_kim_cang_bat_hoai_the_desc",
    price: 2000,
    sell: 300,
    passive: "kim_cang_bat_hoai_the",
    passiveDef: {
      icon: "💎",
      sp: 3,
      realm: 2,
      perLevel: "+15% HP",
      nameKey: "ps_kim_cang_bat_hoai_the",
      descKey: "ps_kim_cang_bat_hoai_the_desc"
    },
    dieu_kien_mo: {
      tong: "kim_cang_tong"
    }
  },
  manual_phan_chan_kinh: {
    kind: "manual",
    tier: 0,
    learnCost: 500,
    realm: 1,
    dao: "chinh",
    exclusive: true,
    nameKey: "it_manual_phan_chan_kinh",
    descKey: "it_manual_phan_chan_kinh_desc",
    price: 800,
    sell: 50,
    passive: "phan_chan_kinh",
    passiveDef: {
      icon: "🔄",
      sp: 2,
      realm: 1,
      perLevel: "phản 10%",
      nameKey: "ps_phan_chan_kinh",
      descKey: "ps_phan_chan_kinh_desc"
    },
    dieu_kien_mo: {
      tong: "kim_cang_tong"
    }
  },
  manual_duoc_vuong_tam_kinh: {
    kind: "manual",
    tier: 0,
    learnCost: 500,
    realm: 1,
    dao: "chinh",
    exclusive: true,
    nameKey: "it_manual_duoc_vuong_tam_kinh",
    descKey: "it_manual_duoc_vuong_tam_kinh_desc",
    price: 800,
    sell: 50,
    passive: "duoc_vuong_tam_kinh",
    passiveDef: {
      icon: "🌿",
      sp: 2,
      realm: 1,
      perLevel: "+25% pill",
      nameKey: "ps_duoc_vuong_tam_kinh",
      descKey: "ps_duoc_vuong_tam_kinh_desc"
    },
    dieu_kien_mo: {
      tong: "duoc_vuong_tong"
    }
  },
  manual_sinh_sinh_bat_tuc: {
    kind: "manual",
    tier: 1,
    learnCost: 800,
    realm: 2,
    dao: "chinh",
    exclusive: true,
    nameKey: "it_manual_sinh_sinh_bat_tuc",
    descKey: "it_manual_sinh_sinh_bat_tuc_desc",
    price: 2000,
    sell: 300,
    passive: "sinh_sinh_bat_tuc",
    passiveDef: {
      icon: "♻️",
      sp: 3,
      realm: 2,
      perLevel: "2% HP/5s",
      nameKey: "ps_sinh_sinh_bat_tuc",
      descKey: "ps_sinh_sinh_bat_tuc_desc"
    },
    dieu_kien_mo: {
      tong: "duoc_vuong_tong"
    }
  },
  manual_thu_vuong_huyet_mach: {
    kind: "manual",
    tier: 1,
    learnCost: 800,
    realm: 2,
    dao: "trung",
    exclusive: true,
    nameKey: "it_manual_thu_vuong_huyet_mach",
    descKey: "it_manual_thu_vuong_huyet_mach_desc",
    price: 2000,
    sell: 300,
    passive: "thu_vuong_huyet_mach",
    passiveDef: {
      icon: "🩸",
      sp: 3,
      realm: 2,
      perLevel: "+15% pet",
      nameKey: "ps_thu_vuong_huyet_mach",
      descKey: "ps_thu_vuong_huyet_mach_desc"
    },
    dieu_kien_mo: {
      tong: "ngu_thu_tong"
    }
  },
  manual_dong_sinh_cong_tu: {
    kind: "manual",
    tier: 0,
    learnCost: 500,
    realm: 1,
    dao: "trung",
    exclusive: true,
    nameKey: "it_manual_dong_sinh_cong_tu",
    descKey: "it_manual_dong_sinh_cong_tu_desc",
    price: 800,
    sell: 50,
    passive: "dong_sinh_cong_tu",
    passiveDef: {
      icon: "💞",
      sp: 2,
      realm: 1,
      perLevel: "chuyển 20%",
      nameKey: "ps_dong_sinh_cong_tu",
      descKey: "ps_dong_sinh_cong_tu_desc"
    },
    dieu_kien_mo: {
      tong: "ngu_thu_tong"
    }
  }
});

/* ---- 6 bí tịch độc quyền Cửu U Ma Tông (Ma Đạo, mở từ Trúc Cơ) ---- */
Object.assign(ITEMS, {
  manual_ma_1: {
    kind: "manual",
    tier: 1,
    learnCost: 800,
    realm: 2,
    dao: "ma",
    exclusive: true,
    nameKey: "it_manual_ma_1",
    descKey: "it_manual_ma_1_desc",
    price: 2000,
    sell: 300,
    skill: "huyet_ma_tram",
    skillDef: {
      kind: "dmg",
      mp: 25,
      cd: 9,
      dtype: "ma",
      elem: "ma",
      rng: 220,
      dao: "ma",
      icon: "🩸",
      effect_sheet: "eff_demon_sheet",
      effect_mau: "#ff2d55",
      nameKey: "sk_huyet_ma_tram",
      descKey: "sk_huyet_ma_tram_desc",
      mult: 3.2,
      lifesteal: 0.03,
      fxStatus: {
        wound: 4
      }
    },
    dieu_kien_mo: {
      tong: "cuu_u_ma_tong"
    }
  },
  manual_ma_2: {
    kind: "manual",
    tier: 1,
    learnCost: 800,
    realm: 2,
    dao: "ma",
    exclusive: true,
    nameKey: "it_manual_ma_2",
    descKey: "it_manual_ma_2_desc",
    price: 2000,
    sell: 300,
    skill: "cuu_u_ma_diem",
    skillDef: {
      kind: "aoe",
      mp: 35,
      cd: 13,
      dtype: "ma",
      elem: "ma",
      rng: 200,
      dao: "ma",
      icon: "👹",
      effect_sheet: "eff_demon_sheet",
      effect_mau: "#b388ff",
      nameKey: "sk_cuu_u_ma_diem",
      descKey: "sk_cuu_u_ma_diem_desc",
      mult: 2.4,
      fxStatus: {
        fear: 3
      }
    },
    dieu_kien_mo: {
      tong: "cuu_u_ma_tong"
    }
  },
  manual_ma_3: {
    kind: "manual",
    tier: 2,
    learnCost: 1500,
    realm: 2,
    dao: "ma",
    exclusive: true,
    nameKey: "it_manual_ma_3",
    descKey: "it_manual_ma_3_desc",
    price: 4000,
    sell: 1500,
    skill: "ma_hon_thuc",
    skillDef: {
      kind: "dmg",
      mp: 45,
      cd: 20,
      dtype: "ma",
      elem: "ma",
      rng: 240,
      dao: "ma",
      icon: "💀",
      effect_sheet: "eff_demon_sheet",
      effect_mau: "#7b1fa2",
      nameKey: "sk_ma_hon_thuc",
      descKey: "sk_ma_hon_thuc_desc",
      mult: 5.0,
      lifesteal: 0.08,
      fxStatus: {
        fear: 2,
        wound: 3
      }
    },
    dieu_kien_mo: {
      tong: "cuu_u_ma_tong"
    }
  },
  manual_ma_4: {
    kind: "manual",
    tier: 1,
    learnCost: 800,
    realm: 2,
    dao: "ma",
    exclusive: true,
    nameKey: "it_manual_ma_4",
    descKey: "it_manual_ma_4_desc",
    price: 2000,
    sell: 300,
    skill: "huyet_ma_ho_the",
    skillDef: {
      kind: "buff",
      mp: 30,
      cd: 25,
      dtype: "ma",
      dao: "ma",
      icon: "🛡️",
      effect_sheet: "eff_demon_sheet",
      effect_mau: "#ff1744",
      nameKey: "sk_huyet_ma_ho_the",
      descKey: "sk_huyet_ma_ho_the_desc",
      defMult: 1.6,
      dur: 18
    },
    dieu_kien_mo: {
      tong: "cuu_u_ma_tong"
    }
  },
  manual_ps_ma_1: {
    kind: "manual",
    tier: 1,
    learnCost: 800,
    realm: 2,
    dao: "ma",
    exclusive: true,
    nameKey: "it_manual_ps_ma_1",
    descKey: "it_manual_ps_ma_1_desc",
    price: 2000,
    sell: 300,
    passive: "ma_tam",
    passiveDef: {
      icon: "😈",
      sp: 2,
      realm: 2,
      perLevel: "12% dmg ma",
      nameKey: "ps_ma_tam",
      descKey: "ps_ma_tam_desc"
    },
    dieu_kien_mo: {
      tong: "cuu_u_ma_tong"
    }
  },
  manual_ps_ma_2: {
    kind: "manual",
    tier: 2,
    learnCost: 1500,
    realm: 2,
    dao: "ma",
    exclusive: true,
    nameKey: "it_manual_ps_ma_2",
    descKey: "it_manual_ps_ma_2_desc",
    price: 4000,
    sell: 1500,
    passive: "huyet_mach",
    passiveDef: {
      icon: "🩸",
      sp: 2,
      realm: 2,
      perLevel: "3% lifesteal",
      nameKey: "ps_huyet_mach",
      descKey: "ps_huyet_mach_desc"
    },
    dieu_kien_mo: {
      tong: "cuu_u_ma_tong"
    }
  },
  /* --- Bí tịch BOSS (rớt từ boss, 8% / tinh anh 15%) --- */
  manual_boss_datru: {
    kind: "manual", tier: 1, learnCost: 500, realm: 1, bossDrop: true,
    nameKey: "it_manual_boss_datru", descKey: "it_manual_boss_datru_desc",
    price: 3000, sell: 300, skill: "man_hoang_chan_dia",
    skillDef: { kind: "aoe", mp: 35, cd: 14, rng: 220, icon: "🌋",
      effect_mau: "#c9a86a", nameKey: "sk_man_hoang_chan_dia",
      descKey: "sk_man_hoang_chan_dia_desc", mult: 3.0 },
  },
  manual_boss_langvuong: {
    kind: "manual", tier: 1, learnCost: 500, realm: 1, bossDrop: true,
    nameKey: "it_manual_boss_langvuong", descKey: "it_manual_boss_langvuong_desc",
    price: 3000, sell: 300, skill: "lang_vuong_khieu_nguyet",
    skillDef: { kind: "dmg", mp: 35, cd: 12, rng: 240, icon: "🐺",
      effect_mau: "#9fd8ff", nameKey: "sk_lang_vuong_khieu_nguyet",
      descKey: "sk_lang_vuong_khieu_nguyet_desc", mult: 3.4, fxStatus: { fear: 2 } },
  },
  manual_boss_cottuong: {
    kind: "manual", tier: 2, learnCost: 1500, realm: 2, bossDrop: true,
    nameKey: "it_manual_boss_cottuong", descKey: "it_manual_boss_cottuong_desc",
    price: 8000, sell: 1500, skill: "bach_cot_ma_trao",
    skillDef: { kind: "dmg", mp: 45, cd: 14, rng: 240, icon: "💀",
      effect_mau: "#e8e8e8", nameKey: "sk_bach_cot_ma_trao",
      descKey: "sk_bach_cot_ma_trao_desc", mult: 4.0, fxStatus: { wound: 4 } },
  },
  manual_boss_uminh: {
    kind: "manual", tier: 2, learnCost: 1500, realm: 2, bossDrop: true,
    nameKey: "it_manual_boss_uminh", descKey: "it_manual_boss_uminh_desc",
    price: 8000, sell: 1500, skill: "doc_vu_cuong_trieu",
    skillDef: { kind: "aoe", mp: 50, cd: 16, rng: 260, icon: "☠️",
      effect_mau: "#7CFC00", nameKey: "sk_doc_vu_cuong_trieu",
      descKey: "sk_doc_vu_cuong_trieu_desc", mult: 4.2, fxStatus: { poison: 5 } },
  },
  manual_boss_haclong: {
    kind: "manual", tier: 2, learnCost: 1500, realm: 2, bossDrop: true,
    nameKey: "it_manual_boss_haclong", descKey: "it_manual_boss_haclong_desc",
    price: 8000, sell: 1500, skill: "ma_long_phe_hon",
    skillDef: { kind: "dmg", mp: 60, cd: 20, rng: 260, icon: "🐉",
      effect_mau: "#b388ff", nameKey: "sk_ma_long_phe_hon",
      descKey: "sk_ma_long_phe_hon_desc", mult: 5.0, fxStatus: { fear: 3 } },
  },
  manual_boss_huyetma: {
    kind: "manual", tier: 1, learnCost: 800, realm: 2, dao: "ma", bossDrop: true,
    nameKey: "it_manual_boss_huyetma", descKey: "it_manual_boss_huyetma_desc",
    price: 3000, sell: 300, skill: "huyet_ma_tram",
    skillDef: { kind: "dmg", mp: 25, cd: 9, dtype: "ma", elem: "ma", rng: 220, dao: "ma",
      icon: "🩸", effect_sheet: "eff_demon_sheet", effect_mau: "#ff2d55",
      nameKey: "sk_huyet_ma_tram", descKey: "sk_huyet_ma_tram_desc",
      mult: 3.2, lifesteal: 0.03, fxStatus: { wound: 4 } },
  },
  manual_boss_thientuong: {
    kind: "manual", tier: 2, learnCost: 1500, realm: 2, bossDrop: true,
    nameKey: "it_manual_boss_thientuong", descKey: "it_manual_boss_thientuong_desc",
    price: 8000, sell: 1500, skill: "thien_loi_pha",
    skillDef: { kind: "aoe", mp: 55, cd: 18, rng: 260, icon: "⛈️",
      effect_mau: "#ffee58", nameKey: "sk_thien_loi_pha",
      descKey: "sk_thien_loi_pha_desc", mult: 4.5, fxStatus: { stun: 2 } },
  },
});;



/* ============================================================
 * NHIỆM VỤ TÔNG MÔN — sinh tự động từ data/quests_sect.json
 * (không sửa tay; chạy /tmp/gen_sectquests.py để tái sinh)
 * ============================================================ */
const SECT_QUESTS = [{"id": "sq_kiem_01", "sect": "kiem_tong", "rank": "ngoai_mon", "nameKey": "sq_kiem_01", "descKey": "sq_kiem_01_desc", "npc": "su_gia_kiem", "req": null, "need": {"type": "talk"}, "reward": {"stones": 50, "exp": 60, "contrib": 10}, "target": {"kind": "npc", "id": "su_gia_kiem"}}, {"id": "sq_kiem_02", "sect": "kiem_tong", "rank": "ngoai_mon", "nameKey": "sq_kiem_02", "descKey": "sq_kiem_02_desc", "npc": "su_gia_kiem", "req": "sq_kiem_01", "need": {"type": "kill", "monster": "da_tru", "count": 10}, "reward": {"stones": 100, "exp": 150, "contrib": 20, "items": [{"id": "pill_hx", "qty": 2}]}, "target": {"kind": "map", "map": 0}}, {"id": "sq_kiem_03", "sect": "kiem_tong", "rank": "ngoai_mon", "nameKey": "sq_kiem_03", "descKey": "sq_kiem_03_desc", "npc": "su_gia_kiem", "req": "sq_kiem_02", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_kiem_03", "hp": 400, "atk": 30, "def": 10}}, "reward": {"stones": 200, "exp": 300, "contrib": 50}, "target": {"kind": "npc", "id": "truong_lao_kiem"}, "minRealm": [1, 5], "eventKey": "sq_event_kiem_03", "fx": "#9fd8ff", "promote": "noi_mon"}, {"id": "sq_kiem_04", "sect": "kiem_tong", "rank": "noi_mon", "nameKey": "sq_kiem_04", "descKey": "sq_kiem_04_desc", "npc": "truong_lao_kiem", "req": "sq_kiem_03", "need": {"type": "kill", "monster": "phong_lang", "count": 15}, "reward": {"stones": 150, "exp": 250, "contrib": 30}, "target": {"kind": "map", "map": 1}}, {"id": "sq_kiem_05", "sect": "kiem_tong", "rank": "noi_mon", "nameKey": "sq_kiem_05", "descKey": "sq_kiem_05_desc", "npc": "truong_lao_kiem", "req": "sq_kiem_04", "need": {"type": "killboss", "monster": "lang_vuong", "count": 1}, "reward": {"stones": 300, "exp": 400, "contrib": 50, "items": [{"id": "dan_hx_tieu", "qty": 2}]}, "target": {"kind": "map", "map": 1}}, {"id": "sq_kiem_06", "sect": "kiem_tong", "rank": "noi_mon", "nameKey": "sq_kiem_06", "descKey": "sq_kiem_06_desc", "npc": "truong_lao_kiem", "req": "sq_kiem_05", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_kiem_06", "hp": 1000, "atk": 55, "def": 20}}, "reward": {"stones": 500, "exp": 800, "contrib": 100, "items": [{"id": "truc_co_thao", "qty": 3}]}, "target": {"kind": "npc", "id": "truong_lao_kiem"}, "minRealm": [1, 12], "eventKey": "sq_event_kiem_06", "fx": "#9fd8ff", "promote": "ho_phap", "gatesBreakthrough": 2}, {"id": "sq_kiem_07", "sect": "kiem_tong", "rank": "ho_phap", "nameKey": "sq_kiem_07", "descKey": "sq_kiem_07_desc", "npc": "truong_lao_kiem", "req": "sq_kiem_06", "need": {"type": "kill", "monster": "u_hon", "count": 20}, "reward": {"stones": 400, "exp": 700, "contrib": 60}, "target": {"kind": "map", "map": 2}}, {"id": "sq_kiem_08", "sect": "kiem_tong", "rank": "ho_phap", "nameKey": "sq_kiem_08", "descKey": "sq_kiem_08_desc", "npc": "truong_lao_kiem", "req": "sq_kiem_07", "need": {"type": "killboss", "monster": "cot_tuong", "count": 1}, "reward": {"stones": 600, "exp": 1000, "contrib": 100, "items": [{"id": "dan_hx_trung", "qty": 2}]}, "target": {"kind": "map", "map": 2}}, {"id": "sq_kiem_09", "sect": "kiem_tong", "rank": "ho_phap", "nameKey": "sq_kiem_09", "descKey": "sq_kiem_09_desc", "npc": "truong_lao_kiem", "req": "sq_kiem_08", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_kiem_09", "hp": 2500, "atk": 95, "def": 35}}, "reward": {"stones": 1000, "exp": 1500, "contrib": 200}, "target": {"kind": "npc", "id": "truong_lao_kiem"}, "minRealm": [2, 0], "eventKey": "sq_event_kiem_09", "fx": "#9fd8ff", "promote": "truong_lao", "gatesBreakthrough": 3}, {"id": "sq_kiem_10", "sect": "kiem_tong", "rank": "truong_lao", "nameKey": "sq_kiem_10", "descKey": "sq_kiem_10_desc", "npc": "truong_lao_kiem", "req": "sq_kiem_09", "need": {"type": "kill", "monster": "ma_lang", "count": 30}, "reward": {"stones": 800, "exp": 1300, "contrib": 120}, "target": {"kind": "map", "map": 4}}, {"id": "sq_kiem_11", "sect": "kiem_tong", "rank": "truong_lao", "nameKey": "sq_kiem_11", "descKey": "sq_kiem_11_desc", "npc": "truong_lao_kiem", "req": "sq_kiem_10", "need": {"type": "killboss", "monster": "huyet_ma_vuong", "count": 1}, "reward": {"stones": 1200, "exp": 2000, "contrib": 200, "items": [{"id": "dan_hx_dai", "qty": 2}]}, "target": {"kind": "map", "map": 4}}, {"id": "sq_kiem_12", "sect": "kiem_tong", "rank": "truong_lao", "nameKey": "sq_kiem_12", "descKey": "sq_kiem_12_desc", "npc": "truong_lao_kiem", "req": "sq_kiem_11", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_kiem_12", "hp": 6000, "atk": 160, "def": 60}}, "reward": {"stones": 3000, "exp": 5000, "contrib": 500, "items": [{"id": "manual_kiemdan_kiem", "qty": 1}]}, "target": {"kind": "npc", "id": "truong_lao_kiem"}, "minRealm": [3, 0], "eventKey": "sq_event_kiem_12", "fx": "#9fd8ff", "gatesBreakthrough": 4, "grandTitle": "sq_title_kiem_grand"}, {"id": "sq_thien_phap_01", "sect": "thien_phap_tong", "rank": "ngoai_mon", "nameKey": "sq_thien_phap_01", "descKey": "sq_thien_phap_01_desc", "npc": "su_gia_phap", "req": null, "need": {"type": "talk"}, "reward": {"stones": 50, "exp": 60, "contrib": 10}, "target": {"kind": "npc", "id": "su_gia_phap"}}, {"id": "sq_thien_phap_02", "sect": "thien_phap_tong", "rank": "ngoai_mon", "nameKey": "sq_thien_phap_02", "descKey": "sq_thien_phap_02_desc", "npc": "su_gia_phap", "req": "sq_thien_phap_01", "need": {"type": "kill", "monster": "son_ke", "count": 10}, "reward": {"stones": 100, "exp": 150, "contrib": 20, "items": [{"id": "pill_hl", "qty": 2}]}, "target": {"kind": "map", "map": 0}}, {"id": "sq_thien_phap_03", "sect": "thien_phap_tong", "rank": "ngoai_mon", "nameKey": "sq_thien_phap_03", "descKey": "sq_thien_phap_03_desc", "npc": "su_gia_phap", "req": "sq_thien_phap_02", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_thien_phap_03", "hp": 400, "atk": 30, "def": 10}}, "reward": {"stones": 200, "exp": 300, "contrib": 50}, "target": {"kind": "npc", "id": "truong_lao_phap"}, "minRealm": [1, 5], "eventKey": "sq_event_thien_phap_03", "fx": "#c9a7ff", "promote": "noi_mon"}, {"id": "sq_thien_phap_04", "sect": "thien_phap_tong", "rank": "noi_mon", "nameKey": "sq_thien_phap_04", "descKey": "sq_thien_phap_04_desc", "npc": "truong_lao_phap", "req": "sq_thien_phap_03", "need": {"type": "kill", "monster": "hu_thi", "count": 15}, "reward": {"stones": 150, "exp": 250, "contrib": 30}, "target": {"kind": "map", "map": 1}}, {"id": "sq_thien_phap_05", "sect": "thien_phap_tong", "rank": "noi_mon", "nameKey": "sq_thien_phap_05", "descKey": "sq_thien_phap_05_desc", "npc": "truong_lao_phap", "req": "sq_thien_phap_04", "need": {"type": "killboss", "monster": "lang_vuong", "count": 1}, "reward": {"stones": 300, "exp": 400, "contrib": 50, "items": [{"id": "dan_hl_tieu", "qty": 2}]}, "target": {"kind": "map", "map": 1}}, {"id": "sq_thien_phap_06", "sect": "thien_phap_tong", "rank": "noi_mon", "nameKey": "sq_thien_phap_06", "descKey": "sq_thien_phap_06_desc", "npc": "truong_lao_phap", "req": "sq_thien_phap_05", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_thien_phap_06", "hp": 1000, "atk": 55, "def": 20}}, "reward": {"stones": 500, "exp": 800, "contrib": 100, "items": [{"id": "truc_co_thao", "qty": 3}]}, "target": {"kind": "npc", "id": "truong_lao_phap"}, "minRealm": [1, 12], "eventKey": "sq_event_thien_phap_06", "fx": "#c9a7ff", "promote": "ho_phap", "gatesBreakthrough": 2}, {"id": "sq_thien_phap_07", "sect": "thien_phap_tong", "rank": "ho_phap", "nameKey": "sq_thien_phap_07", "descKey": "sq_thien_phap_07_desc", "npc": "truong_lao_phap", "req": "sq_thien_phap_06", "need": {"type": "kill", "monster": "thi_ma", "count": 20}, "reward": {"stones": 400, "exp": 700, "contrib": 60}, "target": {"kind": "map", "map": 2}}, {"id": "sq_thien_phap_08", "sect": "thien_phap_tong", "rank": "ho_phap", "nameKey": "sq_thien_phap_08", "descKey": "sq_thien_phap_08_desc", "npc": "truong_lao_phap", "req": "sq_thien_phap_07", "need": {"type": "killboss", "monster": "cot_tuong", "count": 1}, "reward": {"stones": 600, "exp": 1000, "contrib": 100, "items": [{"id": "dan_hl_trung", "qty": 2}]}, "target": {"kind": "map", "map": 2}}, {"id": "sq_thien_phap_09", "sect": "thien_phap_tong", "rank": "ho_phap", "nameKey": "sq_thien_phap_09", "descKey": "sq_thien_phap_09_desc", "npc": "truong_lao_phap", "req": "sq_thien_phap_08", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_thien_phap_09", "hp": 2500, "atk": 95, "def": 35}}, "reward": {"stones": 1000, "exp": 1500, "contrib": 200}, "target": {"kind": "npc", "id": "truong_lao_phap"}, "minRealm": [2, 0], "eventKey": "sq_event_thien_phap_09", "fx": "#c9a7ff", "promote": "truong_lao", "gatesBreakthrough": 3}, {"id": "sq_thien_phap_10", "sect": "thien_phap_tong", "rank": "truong_lao", "nameKey": "sq_thien_phap_10", "descKey": "sq_thien_phap_10_desc", "npc": "truong_lao_phap", "req": "sq_thien_phap_09", "need": {"type": "kill", "monster": "oan_linh", "count": 30}, "reward": {"stones": 800, "exp": 1300, "contrib": 120}, "target": {"kind": "map", "map": 4}}, {"id": "sq_thien_phap_11", "sect": "thien_phap_tong", "rank": "truong_lao", "nameKey": "sq_thien_phap_11", "descKey": "sq_thien_phap_11_desc", "npc": "truong_lao_phap", "req": "sq_thien_phap_10", "need": {"type": "killboss", "monster": "huyet_ma_vuong", "count": 1}, "reward": {"stones": 1200, "exp": 2000, "contrib": 200, "items": [{"id": "dan_hl_dai", "qty": 2}]}, "target": {"kind": "map", "map": 4}}, {"id": "sq_thien_phap_12", "sect": "thien_phap_tong", "rank": "truong_lao", "nameKey": "sq_thien_phap_12", "descKey": "sq_thien_phap_12_desc", "npc": "truong_lao_phap", "req": "sq_thien_phap_11", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_thien_phap_12", "hp": 6000, "atk": 160, "def": 60}}, "reward": {"stones": 3000, "exp": 5000, "contrib": 500, "items": [{"id": "manual_kimdan_phap", "qty": 1}]}, "target": {"kind": "npc", "id": "truong_lao_phap"}, "minRealm": [3, 0], "eventKey": "sq_event_thien_phap_12", "fx": "#c9a7ff", "gatesBreakthrough": 4, "grandTitle": "sq_title_thien_phap_grand"}, {"id": "sq_kim_cang_01", "sect": "kim_cang_tong", "rank": "ngoai_mon", "nameKey": "sq_kim_cang_01", "descKey": "sq_kim_cang_01_desc", "npc": "su_gia_the", "req": null, "need": {"type": "talk"}, "reward": {"stones": 50, "exp": 60, "contrib": 10}, "target": {"kind": "npc", "id": "su_gia_the"}}, {"id": "sq_kim_cang_02", "sect": "kim_cang_tong", "rank": "ngoai_mon", "nameKey": "sq_kim_cang_02", "descKey": "sq_kim_cang_02_desc", "npc": "su_gia_the", "req": "sq_kim_cang_01", "need": {"type": "kill", "monster": "da_tru", "count": 10}, "reward": {"stones": 100, "exp": 150, "contrib": 20, "items": [{"id": "pill_hx", "qty": 2}]}, "target": {"kind": "map", "map": 0}}, {"id": "sq_kim_cang_03", "sect": "kim_cang_tong", "rank": "ngoai_mon", "nameKey": "sq_kim_cang_03", "descKey": "sq_kim_cang_03_desc", "npc": "su_gia_the", "req": "sq_kim_cang_02", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_kim_cang_03", "hp": 400, "atk": 30, "def": 10}}, "reward": {"stones": 200, "exp": 300, "contrib": 50}, "target": {"kind": "npc", "id": "truong_lao_the"}, "minRealm": [1, 5], "eventKey": "sq_event_kim_cang_03", "fx": "#ffd76a", "promote": "noi_mon"}, {"id": "sq_kim_cang_04", "sect": "kim_cang_tong", "rank": "noi_mon", "nameKey": "sq_kim_cang_04", "descKey": "sq_kim_cang_04_desc", "npc": "truong_lao_the", "req": "sq_kim_cang_03", "need": {"type": "kill", "monster": "phong_lang", "count": 15}, "reward": {"stones": 150, "exp": 250, "contrib": 30}, "target": {"kind": "map", "map": 1}}, {"id": "sq_kim_cang_05", "sect": "kim_cang_tong", "rank": "noi_mon", "nameKey": "sq_kim_cang_05", "descKey": "sq_kim_cang_05_desc", "npc": "truong_lao_the", "req": "sq_kim_cang_04", "need": {"type": "killboss", "monster": "lang_vuong", "count": 1}, "reward": {"stones": 300, "exp": 400, "contrib": 50, "items": [{"id": "kim_cang_dan", "qty": 2}]}, "target": {"kind": "map", "map": 1}}, {"id": "sq_kim_cang_06", "sect": "kim_cang_tong", "rank": "noi_mon", "nameKey": "sq_kim_cang_06", "descKey": "sq_kim_cang_06_desc", "npc": "truong_lao_the", "req": "sq_kim_cang_05", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_kim_cang_06", "hp": 1000, "atk": 55, "def": 20}}, "reward": {"stones": 500, "exp": 800, "contrib": 100, "items": [{"id": "truc_co_thao", "qty": 3}]}, "target": {"kind": "npc", "id": "truong_lao_the"}, "minRealm": [1, 12], "eventKey": "sq_event_kim_cang_06", "fx": "#ffd76a", "promote": "ho_phap", "gatesBreakthrough": 2}, {"id": "sq_kim_cang_07", "sect": "kim_cang_tong", "rank": "ho_phap", "nameKey": "sq_kim_cang_07", "descKey": "sq_kim_cang_07_desc", "npc": "truong_lao_the", "req": "sq_kim_cang_06", "need": {"type": "kill", "monster": "u_hon", "count": 20}, "reward": {"stones": 400, "exp": 700, "contrib": 60}, "target": {"kind": "map", "map": 2}}, {"id": "sq_kim_cang_08", "sect": "kim_cang_tong", "rank": "ho_phap", "nameKey": "sq_kim_cang_08", "descKey": "sq_kim_cang_08_desc", "npc": "truong_lao_the", "req": "sq_kim_cang_07", "need": {"type": "killboss", "monster": "cot_tuong", "count": 1}, "reward": {"stones": 600, "exp": 1000, "contrib": 100, "items": [{"id": "dan_hx_trung", "qty": 2}]}, "target": {"kind": "map", "map": 2}}, {"id": "sq_kim_cang_09", "sect": "kim_cang_tong", "rank": "ho_phap", "nameKey": "sq_kim_cang_09", "descKey": "sq_kim_cang_09_desc", "npc": "truong_lao_the", "req": "sq_kim_cang_08", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_kim_cang_09", "hp": 2500, "atk": 95, "def": 35}}, "reward": {"stones": 1000, "exp": 1500, "contrib": 200}, "target": {"kind": "npc", "id": "truong_lao_the"}, "minRealm": [2, 0], "eventKey": "sq_event_kim_cang_09", "fx": "#ffd76a", "promote": "truong_lao", "gatesBreakthrough": 3}, {"id": "sq_kim_cang_10", "sect": "kim_cang_tong", "rank": "truong_lao", "nameKey": "sq_kim_cang_10", "descKey": "sq_kim_cang_10_desc", "npc": "truong_lao_the", "req": "sq_kim_cang_09", "need": {"type": "kill", "monster": "ma_binh", "count": 30}, "reward": {"stones": 800, "exp": 1300, "contrib": 120}, "target": {"kind": "map", "map": 4}}, {"id": "sq_kim_cang_11", "sect": "kim_cang_tong", "rank": "truong_lao", "nameKey": "sq_kim_cang_11", "descKey": "sq_kim_cang_11_desc", "npc": "truong_lao_the", "req": "sq_kim_cang_10", "need": {"type": "killboss", "monster": "huyet_ma_vuong", "count": 1}, "reward": {"stones": 1200, "exp": 2000, "contrib": 200, "items": [{"id": "dan_hx_dai", "qty": 2}]}, "target": {"kind": "map", "map": 4}}, {"id": "sq_kim_cang_12", "sect": "kim_cang_tong", "rank": "truong_lao", "nameKey": "sq_kim_cang_12", "descKey": "sq_kim_cang_12_desc", "npc": "truong_lao_the", "req": "sq_kim_cang_11", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_kim_cang_12", "hp": 6000, "atk": 160, "def": 60}}, "reward": {"stones": 3000, "exp": 5000, "contrib": 500, "items": [{"id": "manual_kimdan_the", "qty": 1}]}, "target": {"kind": "npc", "id": "truong_lao_the"}, "minRealm": [3, 0], "eventKey": "sq_event_kim_cang_12", "fx": "#ffd76a", "gatesBreakthrough": 4, "grandTitle": "sq_title_kim_cang_grand"}, {"id": "sq_duoc_vuong_01", "sect": "duoc_vuong_tong", "rank": "ngoai_mon", "nameKey": "sq_duoc_vuong_01", "descKey": "sq_duoc_vuong_01_desc", "npc": "su_gia_duoc", "req": null, "need": {"type": "talk"}, "reward": {"stones": 50, "exp": 60, "contrib": 10}, "target": {"kind": "npc", "id": "su_gia_duoc"}}, {"id": "sq_duoc_vuong_02", "sect": "duoc_vuong_tong", "rank": "ngoai_mon", "nameKey": "sq_duoc_vuong_02", "descKey": "sq_duoc_vuong_02_desc", "npc": "su_gia_duoc", "req": "sq_duoc_vuong_01", "need": {"type": "item", "item": "taycothao", "count": 5}, "reward": {"stones": 100, "exp": 150, "contrib": 20, "items": [{"id": "dan_hx_tieu", "qty": 2}]}, "target": {"kind": "npc", "id": "su_gia_duoc"}}, {"id": "sq_duoc_vuong_03", "sect": "duoc_vuong_tong", "rank": "ngoai_mon", "nameKey": "sq_duoc_vuong_03", "descKey": "sq_duoc_vuong_03_desc", "npc": "su_gia_duoc", "req": "sq_duoc_vuong_02", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_duoc_vuong_03", "hp": 400, "atk": 30, "def": 10}}, "reward": {"stones": 200, "exp": 300, "contrib": 50}, "target": {"kind": "npc", "id": "truong_lao_duoc"}, "minRealm": [1, 5], "eventKey": "sq_event_duoc_vuong_03", "fx": "#7fe08a", "promote": "noi_mon"}, {"id": "sq_duoc_vuong_04", "sect": "duoc_vuong_tong", "rank": "noi_mon", "nameKey": "sq_duoc_vuong_04", "descKey": "sq_duoc_vuong_04_desc", "npc": "truong_lao_duoc", "req": "sq_duoc_vuong_03", "need": {"type": "item", "item": "truc_co_thao", "count": 8}, "reward": {"stones": 150, "exp": 250, "contrib": 30}, "target": {"kind": "npc", "id": "truong_lao_duoc"}}, {"id": "sq_duoc_vuong_05", "sect": "duoc_vuong_tong", "rank": "noi_mon", "nameKey": "sq_duoc_vuong_05", "descKey": "sq_duoc_vuong_05_desc", "npc": "truong_lao_duoc", "req": "sq_duoc_vuong_04", "need": {"type": "kill", "monster": "son_ke", "count": 15}, "reward": {"stones": 300, "exp": 400, "contrib": 50, "items": [{"id": "dan_hl_tieu", "qty": 2}]}, "target": {"kind": "map", "map": 0}}, {"id": "sq_duoc_vuong_06", "sect": "duoc_vuong_tong", "rank": "noi_mon", "nameKey": "sq_duoc_vuong_06", "descKey": "sq_duoc_vuong_06_desc", "npc": "truong_lao_duoc", "req": "sq_duoc_vuong_05", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_duoc_vuong_06", "hp": 1000, "atk": 55, "def": 20}}, "reward": {"stones": 500, "exp": 800, "contrib": 100, "items": [{"id": "pill_truccodan", "qty": 1}]}, "target": {"kind": "npc", "id": "truong_lao_duoc"}, "minRealm": [1, 12], "eventKey": "sq_event_duoc_vuong_06", "fx": "#7fe08a", "promote": "ho_phap", "gatesBreakthrough": 2}, {"id": "sq_duoc_vuong_07", "sect": "duoc_vuong_tong", "rank": "ho_phap", "nameKey": "sq_duoc_vuong_07", "descKey": "sq_duoc_vuong_07_desc", "npc": "truong_lao_duoc", "req": "sq_duoc_vuong_06", "need": {"type": "item", "item": "dia_linh_qua", "count": 8}, "reward": {"stones": 400, "exp": 700, "contrib": 60}, "target": {"kind": "npc", "id": "truong_lao_duoc"}}, {"id": "sq_duoc_vuong_08", "sect": "duoc_vuong_tong", "rank": "ho_phap", "nameKey": "sq_duoc_vuong_08", "descKey": "sq_duoc_vuong_08_desc", "npc": "truong_lao_duoc", "req": "sq_duoc_vuong_07", "need": {"type": "killboss", "monster": "da_tru_vuong", "count": 1}, "reward": {"stones": 600, "exp": 1000, "contrib": 100, "items": [{"id": "dan_hx_trung", "qty": 2}]}, "target": {"kind": "map", "map": 0}}, {"id": "sq_duoc_vuong_09", "sect": "duoc_vuong_tong", "rank": "ho_phap", "nameKey": "sq_duoc_vuong_09", "descKey": "sq_duoc_vuong_09_desc", "npc": "truong_lao_duoc", "req": "sq_duoc_vuong_08", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_duoc_vuong_09", "hp": 2500, "atk": 95, "def": 35}}, "reward": {"stones": 1000, "exp": 1500, "contrib": 200}, "target": {"kind": "npc", "id": "truong_lao_duoc"}, "minRealm": [2, 0], "eventKey": "sq_event_duoc_vuong_09", "fx": "#7fe08a", "promote": "truong_lao", "gatesBreakthrough": 3}, {"id": "sq_duoc_vuong_10", "sect": "duoc_vuong_tong", "rank": "truong_lao", "nameKey": "sq_duoc_vuong_10", "descKey": "sq_duoc_vuong_10_desc", "npc": "truong_lao_duoc", "req": "sq_duoc_vuong_09", "need": {"type": "item", "item": "linh_chi_ngan_nam", "count": 3}, "reward": {"stones": 800, "exp": 1300, "contrib": 120}, "target": {"kind": "npc", "id": "truong_lao_duoc"}}, {"id": "sq_duoc_vuong_11", "sect": "duoc_vuong_tong", "rank": "truong_lao", "nameKey": "sq_duoc_vuong_11", "descKey": "sq_duoc_vuong_11_desc", "npc": "truong_lao_duoc", "req": "sq_duoc_vuong_10", "need": {"type": "killboss", "monster": "cot_tuong", "count": 1}, "reward": {"stones": 1200, "exp": 2000, "contrib": 200, "items": [{"id": "dan_hl_dai", "qty": 2}]}, "target": {"kind": "map", "map": 2}}, {"id": "sq_duoc_vuong_12", "sect": "duoc_vuong_tong", "rank": "truong_lao", "nameKey": "sq_duoc_vuong_12", "descKey": "sq_duoc_vuong_12_desc", "npc": "truong_lao_duoc", "req": "sq_duoc_vuong_11", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_duoc_vuong_12", "hp": 6000, "atk": 160, "def": 60}}, "reward": {"stones": 3000, "exp": 5000, "contrib": 500, "items": [{"id": "yaodan1", "qty": 1}]}, "target": {"kind": "npc", "id": "truong_lao_duoc"}, "minRealm": [3, 0], "eventKey": "sq_event_duoc_vuong_12", "fx": "#7fe08a", "gatesBreakthrough": 4, "grandTitle": "sq_title_duoc_vuong_grand"}, {"id": "sq_ngu_thu_01", "sect": "ngu_thu_tong", "rank": "ngoai_mon", "nameKey": "sq_ngu_thu_01", "descKey": "sq_ngu_thu_01_desc", "npc": "su_gia_thu", "req": null, "need": {"type": "talk"}, "reward": {"stones": 50, "exp": 60, "contrib": 10}, "target": {"kind": "npc", "id": "su_gia_thu"}}, {"id": "sq_ngu_thu_02", "sect": "ngu_thu_tong", "rank": "ngoai_mon", "nameKey": "sq_ngu_thu_02", "descKey": "sq_ngu_thu_02_desc", "npc": "su_gia_thu", "req": "sq_ngu_thu_01", "need": {"type": "kill", "monster": "phong_lang", "count": 10}, "reward": {"stones": 100, "exp": 150, "contrib": 20, "items": [{"id": "thit_yeu_thu", "qty": 3}]}, "target": {"kind": "map", "map": 1}}, {"id": "sq_ngu_thu_03", "sect": "ngu_thu_tong", "rank": "ngoai_mon", "nameKey": "sq_ngu_thu_03", "descKey": "sq_ngu_thu_03_desc", "npc": "su_gia_thu", "req": "sq_ngu_thu_02", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_ngu_thu_03", "hp": 400, "atk": 30, "def": 10}}, "reward": {"stones": 200, "exp": 300, "contrib": 50}, "target": {"kind": "npc", "id": "truong_lao_thu"}, "minRealm": [1, 5], "eventKey": "sq_event_ngu_thu_03", "fx": "#ff9d5c", "promote": "noi_mon"}, {"id": "sq_ngu_thu_04", "sect": "ngu_thu_tong", "rank": "noi_mon", "nameKey": "sq_ngu_thu_04", "descKey": "sq_ngu_thu_04_desc", "npc": "truong_lao_thu", "req": "sq_ngu_thu_03", "need": {"type": "item", "item": "trung_pham", "count": 2}, "reward": {"stones": 150, "exp": 250, "contrib": 30}, "target": {"kind": "npc", "id": "truong_lao_thu"}}, {"id": "sq_ngu_thu_05", "sect": "ngu_thu_tong", "rank": "noi_mon", "nameKey": "sq_ngu_thu_05", "descKey": "sq_ngu_thu_05_desc", "npc": "truong_lao_thu", "req": "sq_ngu_thu_04", "need": {"type": "kill", "monster": "hu_thi", "count": 15}, "reward": {"stones": 300, "exp": 400, "contrib": 50, "items": [{"id": "dan_hx_tieu", "qty": 2}]}, "target": {"kind": "map", "map": 1}}, {"id": "sq_ngu_thu_06", "sect": "ngu_thu_tong", "rank": "noi_mon", "nameKey": "sq_ngu_thu_06", "descKey": "sq_ngu_thu_06_desc", "npc": "truong_lao_thu", "req": "sq_ngu_thu_05", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_ngu_thu_06", "hp": 1000, "atk": 55, "def": 20}}, "reward": {"stones": 500, "exp": 800, "contrib": 100, "items": [{"id": "trung_linh", "qty": 1}]}, "target": {"kind": "npc", "id": "truong_lao_thu"}, "minRealm": [1, 12], "eventKey": "sq_event_ngu_thu_06", "fx": "#ff9d5c", "promote": "ho_phap", "gatesBreakthrough": 2}, {"id": "sq_ngu_thu_07", "sect": "ngu_thu_tong", "rank": "ho_phap", "nameKey": "sq_ngu_thu_07", "descKey": "sq_ngu_thu_07_desc", "npc": "truong_lao_thu", "req": "sq_ngu_thu_06", "need": {"type": "kill", "monster": "thi_ma", "count": 20}, "reward": {"stones": 400, "exp": 700, "contrib": 60}, "target": {"kind": "map", "map": 2}}, {"id": "sq_ngu_thu_08", "sect": "ngu_thu_tong", "rank": "ho_phap", "nameKey": "sq_ngu_thu_08", "descKey": "sq_ngu_thu_08_desc", "npc": "truong_lao_thu", "req": "sq_ngu_thu_07", "need": {"type": "killboss", "monster": "lang_vuong", "count": 1}, "reward": {"stones": 600, "exp": 1000, "contrib": 100, "items": [{"id": "trung_linh", "qty": 1}]}, "target": {"kind": "map", "map": 1}}, {"id": "sq_ngu_thu_09", "sect": "ngu_thu_tong", "rank": "ho_phap", "nameKey": "sq_ngu_thu_09", "descKey": "sq_ngu_thu_09_desc", "npc": "truong_lao_thu", "req": "sq_ngu_thu_08", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_ngu_thu_09", "hp": 2500, "atk": 95, "def": 35}}, "reward": {"stones": 1000, "exp": 1500, "contrib": 200}, "target": {"kind": "npc", "id": "truong_lao_thu"}, "minRealm": [2, 0], "eventKey": "sq_event_ngu_thu_09", "fx": "#ff9d5c", "promote": "truong_lao", "gatesBreakthrough": 3}, {"id": "sq_ngu_thu_10", "sect": "ngu_thu_tong", "rank": "truong_lao", "nameKey": "sq_ngu_thu_10", "descKey": "sq_ngu_thu_10_desc", "npc": "truong_lao_thu", "req": "sq_ngu_thu_09", "need": {"type": "item", "item": "trung_linh", "count": 2}, "reward": {"stones": 800, "exp": 1300, "contrib": 120}, "target": {"kind": "npc", "id": "truong_lao_thu"}}, {"id": "sq_ngu_thu_11", "sect": "ngu_thu_tong", "rank": "truong_lao", "nameKey": "sq_ngu_thu_11", "descKey": "sq_ngu_thu_11_desc", "npc": "truong_lao_thu", "req": "sq_ngu_thu_10", "need": {"type": "killboss", "monster": "thien_tuong", "count": 1}, "reward": {"stones": 1200, "exp": 2000, "contrib": 200, "items": [{"id": "trung_huyen", "qty": 1}]}, "target": {"kind": "map", "map": 5}}, {"id": "sq_ngu_thu_12", "sect": "ngu_thu_tong", "rank": "truong_lao", "nameKey": "sq_ngu_thu_12", "descKey": "sq_ngu_thu_12_desc", "npc": "truong_lao_thu", "req": "sq_ngu_thu_11", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_ngu_thu_12", "hp": 6000, "atk": 160, "def": 60}}, "reward": {"stones": 3000, "exp": 5000, "contrib": 500, "items": [{"id": "trung_dia", "qty": 1}]}, "target": {"kind": "npc", "id": "truong_lao_thu"}, "minRealm": [3, 0], "eventKey": "sq_event_ngu_thu_12", "fx": "#ff9d5c", "gatesBreakthrough": 4, "grandTitle": "sq_title_ngu_thu_grand"}, {"id": "sq_cuu_u_ma_01", "sect": "cuu_u_ma_tong", "rank": "ngoai_mon", "nameKey": "sq_cuu_u_ma_01", "descKey": "sq_cuu_u_ma_01_desc", "npc": "su_gia_ma", "req": null, "need": {"type": "talk"}, "reward": {"stones": 50, "exp": 60, "contrib": 10}, "target": {"kind": "npc", "id": "su_gia_ma"}}, {"id": "sq_cuu_u_ma_02", "sect": "cuu_u_ma_tong", "rank": "ngoai_mon", "nameKey": "sq_cuu_u_ma_02", "descKey": "sq_cuu_u_ma_02_desc", "npc": "su_gia_ma", "req": "sq_cuu_u_ma_01", "need": {"type": "kill", "monster": "ngoc_tho", "count": 10}, "reward": {"stones": 100, "exp": 150, "contrib": 20, "items": [{"id": "thit_yeu_thu", "qty": 3}]}, "target": {"kind": "map", "map": 5}}, {"id": "sq_cuu_u_ma_03", "sect": "cuu_u_ma_tong", "rank": "ngoai_mon", "nameKey": "sq_cuu_u_ma_03", "descKey": "sq_cuu_u_ma_03_desc", "npc": "su_gia_ma", "req": "sq_cuu_u_ma_02", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_cuu_u_ma_03", "hp": 400, "atk": 30, "def": 10}}, "reward": {"stones": 200, "exp": 300, "contrib": 50}, "target": {"kind": "npc", "id": "truong_lao_ma"}, "minRealm": [1, 5], "eventKey": "sq_event_cuu_u_ma_03", "fx": "#ff3d5a", "promote": "noi_mon"}, {"id": "sq_cuu_u_ma_04", "sect": "cuu_u_ma_tong", "rank": "noi_mon", "nameKey": "sq_cuu_u_ma_04", "descKey": "sq_cuu_u_ma_04_desc", "npc": "truong_lao_ma", "req": "sq_cuu_u_ma_03", "need": {"type": "stones", "count": 500}, "reward": {"stones": 0, "exp": 250, "contrib": 40}, "target": {"kind": "npc", "id": "truong_lao_ma"}}, {"id": "sq_cuu_u_ma_05", "sect": "cuu_u_ma_tong", "rank": "noi_mon", "nameKey": "sq_cuu_u_ma_05", "descKey": "sq_cuu_u_ma_05_desc", "npc": "truong_lao_ma", "req": "sq_cuu_u_ma_04", "need": {"type": "kill", "monster": "thien_hac", "count": 15}, "reward": {"stones": 300, "exp": 400, "contrib": 50, "items": [{"id": "dan_hx_tieu", "qty": 2}]}, "target": {"kind": "map", "map": 5}}, {"id": "sq_cuu_u_ma_06", "sect": "cuu_u_ma_tong", "rank": "noi_mon", "nameKey": "sq_cuu_u_ma_06", "descKey": "sq_cuu_u_ma_06_desc", "npc": "truong_lao_ma", "req": "sq_cuu_u_ma_05", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_cuu_u_ma_06", "hp": 1000, "atk": 55, "def": 20}}, "reward": {"stones": 500, "exp": 800, "contrib": 100, "items": [{"id": "truc_co_thao", "qty": 3}]}, "target": {"kind": "npc", "id": "truong_lao_ma"}, "minRealm": [1, 12], "eventKey": "sq_event_cuu_u_ma_06", "fx": "#ff3d5a", "promote": "ho_phap", "gatesBreakthrough": 2}, {"id": "sq_cuu_u_ma_07", "sect": "cuu_u_ma_tong", "rank": "ho_phap", "nameKey": "sq_cuu_u_ma_07", "descKey": "sq_cuu_u_ma_07_desc", "npc": "truong_lao_ma", "req": "sq_cuu_u_ma_06", "need": {"type": "kill", "monster": "oan_linh", "count": 20}, "reward": {"stones": 400, "exp": 700, "contrib": 60}, "target": {"kind": "map", "map": 4}}, {"id": "sq_cuu_u_ma_08", "sect": "cuu_u_ma_tong", "rank": "ho_phap", "nameKey": "sq_cuu_u_ma_08", "descKey": "sq_cuu_u_ma_08_desc", "npc": "truong_lao_ma", "req": "sq_cuu_u_ma_07", "need": {"type": "killboss", "monster": "thien_tuong", "count": 1}, "reward": {"stones": 600, "exp": 1000, "contrib": 100, "items": [{"id": "dan_hx_trung", "qty": 2}]}, "target": {"kind": "map", "map": 5}}, {"id": "sq_cuu_u_ma_09", "sect": "cuu_u_ma_tong", "rank": "ho_phap", "nameKey": "sq_cuu_u_ma_09", "descKey": "sq_cuu_u_ma_09_desc", "npc": "truong_lao_ma", "req": "sq_cuu_u_ma_08", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_cuu_u_ma_09", "hp": 2500, "atk": 95, "def": 35}}, "reward": {"stones": 1000, "exp": 1500, "contrib": 200}, "target": {"kind": "npc", "id": "truong_lao_ma"}, "minRealm": [2, 0], "eventKey": "sq_event_cuu_u_ma_09", "fx": "#ff3d5a", "promote": "truong_lao", "gatesBreakthrough": 3}, {"id": "sq_cuu_u_ma_10", "sect": "cuu_u_ma_tong", "rank": "truong_lao", "nameKey": "sq_cuu_u_ma_10", "descKey": "sq_cuu_u_ma_10_desc", "npc": "truong_lao_ma", "req": "sq_cuu_u_ma_09", "need": {"type": "kill", "monster": "ma_lang", "count": 30}, "reward": {"stones": 800, "exp": 1300, "contrib": 120}, "target": {"kind": "map", "map": 4}}, {"id": "sq_cuu_u_ma_11", "sect": "cuu_u_ma_tong", "rank": "truong_lao", "nameKey": "sq_cuu_u_ma_11", "descKey": "sq_cuu_u_ma_11_desc", "npc": "truong_lao_ma", "req": "sq_cuu_u_ma_10", "need": {"type": "killboss", "monster": "huyet_ma_vuong", "count": 1}, "reward": {"stones": 1200, "exp": 2000, "contrib": 200, "items": [{"id": "dan_hx_dai", "qty": 2}]}, "target": {"kind": "map", "map": 4}}, {"id": "sq_cuu_u_ma_12", "sect": "cuu_u_ma_tong", "rank": "truong_lao", "nameKey": "sq_cuu_u_ma_12", "descKey": "sq_cuu_u_ma_12_desc", "npc": "truong_lao_ma", "req": "sq_cuu_u_ma_11", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_cuu_u_ma_12", "hp": 6000, "atk": 160, "def": 60}}, "reward": {"stones": 3000, "exp": 5000, "contrib": 500, "items": [{"id": "yaodan1", "qty": 1}]}, "target": {"kind": "npc", "id": "truong_lao_ma"}, "minRealm": [3, 0], "eventKey": "sq_event_cuu_u_ma_12", "fx": "#ff3d5a", "gatesBreakthrough": 4, "grandTitle": "sq_title_cuu_u_ma_grand"}, {"id": "sq_kiem_13", "sect": "kiem_tong", "rank": "truong_lao", "nameKey": "sq_kiem_13", "descKey": "sq_kiem_13_desc", "npc": "truong_lao_kiem", "req": "sq_kiem_12", "need": {"type": "kill", "monster": "tam_ma", "count": 40}, "reward": {"stones": 4000, "exp": 7000, "contrib": 700, "items": [{"id": "dan_hx_dai", "qty": 3}]}, "target": {"kind": "map", "map": 4}, "minRealm": [3, 0]}, {"id": "sq_kiem_14", "sect": "kiem_tong", "rank": "truong_lao", "nameKey": "sq_kiem_14", "descKey": "sq_kiem_14_desc", "npc": "truong_lao_kiem", "req": "sq_kiem_13", "need": {"type": "killboss", "monster": "cuu_u_ma_tuong", "count": 1}, "reward": {"stones": 5000, "exp": 9000, "contrib": 900, "items": [{"id": "dan_hx_dai", "qty": 3}]}, "target": {"kind": "map", "map": 4}, "minRealm": [3, 1]}, {"id": "sq_kiem_15", "sect": "kiem_tong", "rank": "truong_lao", "nameKey": "sq_kiem_15", "descKey": "sq_kiem_15_desc", "npc": "truong_lao_kiem", "req": "sq_kiem_14", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_kiem_15", "hp": 9500, "atk": 230, "def": 88}}, "reward": {"stones": 7000, "exp": 12000, "contrib": 1200, "items": [{"id": "manual_kiemdan_kiem", "qty": 1}]}, "target": {"kind": "npc", "id": "truong_lao_kiem"}, "minRealm": [3, 2], "eventKey": "sq_event_kiem_15", "fx": "#9fd8ff", "promote": "thai_thuong"}, {"id": "sq_kiem_16", "sect": "kiem_tong", "rank": "thai_thuong", "nameKey": "sq_kiem_16", "descKey": "sq_kiem_16_desc", "npc": "truong_lao_kiem", "req": "sq_kiem_15", "need": {"type": "item", "item": "kiem_hon_thach", "count": 8}, "reward": {"stones": 8000, "exp": 15000, "contrib": 1500, "items": [{"id": "truc_co_thao", "qty": 5}]}, "target": {"kind": "npc", "id": "truong_lao_kiem"}, "minRealm": [3, 3]}, {"id": "sq_kiem_17", "sect": "kiem_tong", "rank": "thai_thuong", "nameKey": "sq_kiem_17", "descKey": "sq_kiem_17_desc", "npc": "truong_lao_kiem", "req": "sq_kiem_16", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_kiem_17", "hp": 16000, "atk": 340, "def": 130}}, "reward": {"stones": 12000, "exp": 22000, "contrib": 2000, "items": [{"id": "yaodan1", "qty": 3}]}, "target": {"kind": "npc", "id": "truong_lao_kiem"}, "minRealm": [4, 0], "eventKey": "sq_event_kiem_17", "fx": "#9fd8ff", "grandTitle": "sq_title_kiem_ancient"}, {"id": "sq_kiem_18", "sect": "kiem_tong", "rank": "thai_thuong", "nameKey": "sq_kiem_18", "descKey": "sq_kiem_18_desc", "npc": "truong_lao_kiem", "req": "sq_kiem_17", "need": {"type": "kill", "monster": "thien_ma", "count": 50}, "reward": {"stones": 15000, "exp": 28000, "contrib": 2500}, "target": {"kind": "map", "map": 5}, "minRealm": [4, 1]}, {"id": "sq_kiem_19", "sect": "kiem_tong", "rank": "thai_thuong", "nameKey": "sq_kiem_19", "descKey": "sq_kiem_19_desc", "npc": "truong_lao_kiem", "req": "sq_kiem_18", "need": {"type": "killboss", "monster": "huyet_ma_phan_than", "count": 1}, "reward": {"stones": 20000, "exp": 35000, "contrib": 3000, "items": [{"id": "yaodan3", "qty": 2}]}, "target": {"kind": "map", "map": 5}, "minRealm": [4, 2]}, {"id": "sq_kiem_20", "sect": "kiem_tong", "rank": "thai_thuong", "nameKey": "sq_kiem_20", "descKey": "sq_kiem_20_desc", "npc": "truong_lao_kiem", "req": "sq_kiem_19", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_kiem_20", "hp": 24000, "atk": 480, "def": 190}}, "reward": {"stones": 30000, "exp": 50000, "contrib": 4000, "items": [{"id": "pill_hopdao", "qty": 1}]}, "target": {"kind": "npc", "id": "truong_lao_kiem"}, "minRealm": [4, 3], "eventKey": "sq_event_kiem_20", "fx": "#9fd8ff"}, {"id": "sq_kiem_21", "sect": "kiem_tong", "rank": "thai_thuong", "nameKey": "sq_kiem_21", "descKey": "sq_kiem_21_desc", "npc": "truong_lao_kiem", "req": "sq_kiem_20", "need": {"type": "item", "item": "yaodan4", "count": 3}, "reward": {"stones": 25000, "exp": 40000, "contrib": 3500, "items": [{"id": "ttd_tien", "qty": 1}]}, "target": {"kind": "npc", "id": "truong_lao_kiem"}, "minRealm": [5, 0]}, {"id": "sq_kiem_22", "sect": "kiem_tong", "rank": "thai_thuong", "nameKey": "sq_kiem_22", "descKey": "sq_kiem_22_desc", "npc": "truong_lao_kiem", "req": "sq_kiem_21", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_kiem_22", "hp": 30000, "atk": 620, "def": 250}}, "reward": {"stones": 50000, "exp": 100000, "contrib": 8000, "items": [{"id": "pill_dokiep", "qty": 1}, {"id": "manual_sig_kiem", "qty": 1}]}, "target": {"kind": "npc", "id": "truong_lao_kiem"}, "minRealm": [5, 0], "eventKey": "sq_event_kiem_22", "fx": "#9fd8ff", "grandTitle": "sq_title_kiem_immortal"}, {"id": "sq_thien_phap_13", "sect": "thien_phap_tong", "rank": "truong_lao", "nameKey": "sq_thien_phap_13", "descKey": "sq_thien_phap_13_desc", "npc": "truong_lao_phap", "req": "sq_thien_phap_12", "need": {"type": "kill", "monster": "u_hon_lang", "count": 40}, "reward": {"stones": 4000, "exp": 7000, "contrib": 700, "items": [{"id": "dan_hl_dai", "qty": 3}]}, "target": {"kind": "map", "map": 2}, "minRealm": [3, 0]}, {"id": "sq_thien_phap_14", "sect": "thien_phap_tong", "rank": "truong_lao", "nameKey": "sq_thien_phap_14", "descKey": "sq_thien_phap_14_desc", "npc": "truong_lao_phap", "req": "sq_thien_phap_13", "need": {"type": "killboss", "monster": "dien_chu_u_minh", "count": 1}, "reward": {"stones": 5000, "exp": 9000, "contrib": 900, "items": [{"id": "dan_hl_dai", "qty": 3}]}, "target": {"kind": "map", "map": 2}, "minRealm": [3, 1]}, {"id": "sq_thien_phap_15", "sect": "thien_phap_tong", "rank": "truong_lao", "nameKey": "sq_thien_phap_15", "descKey": "sq_thien_phap_15_desc", "npc": "truong_lao_phap", "req": "sq_thien_phap_14", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_thien_phap_15", "hp": 9500, "atk": 235, "def": 90}}, "reward": {"stones": 7000, "exp": 12000, "contrib": 1200, "items": [{"id": "manual_kimdan_phap", "qty": 1}]}, "target": {"kind": "npc", "id": "truong_lao_phap"}, "minRealm": [3, 2], "eventKey": "sq_event_thien_phap_15", "fx": "#c9a7ff", "promote": "thai_thuong"}, {"id": "sq_thien_phap_16", "sect": "thien_phap_tong", "rank": "thai_thuong", "nameKey": "sq_thien_phap_16", "descKey": "sq_thien_phap_16_desc", "npc": "truong_lao_phap", "req": "sq_thien_phap_15", "need": {"type": "item", "item": "linh_chi_ngan_nam", "count": 5}, "reward": {"stones": 8000, "exp": 15000, "contrib": 1500, "items": [{"id": "truc_co_thao", "qty": 5}]}, "target": {"kind": "npc", "id": "truong_lao_phap"}, "minRealm": [3, 3]}, {"id": "sq_thien_phap_17", "sect": "thien_phap_tong", "rank": "thai_thuong", "nameKey": "sq_thien_phap_17", "descKey": "sq_thien_phap_17_desc", "npc": "truong_lao_phap", "req": "sq_thien_phap_16", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_thien_phap_17", "hp": 16000, "atk": 345, "def": 132}}, "reward": {"stones": 12000, "exp": 22000, "contrib": 2000, "items": [{"id": "yaodan1", "qty": 3}]}, "target": {"kind": "npc", "id": "truong_lao_phap"}, "minRealm": [4, 0], "eventKey": "sq_event_thien_phap_17", "fx": "#c9a7ff", "grandTitle": "sq_title_thien_phap_ancient"}, {"id": "sq_thien_phap_18", "sect": "thien_phap_tong", "rank": "thai_thuong", "nameKey": "sq_thien_phap_18", "descKey": "sq_thien_phap_18_desc", "npc": "truong_lao_phap", "req": "sq_thien_phap_17", "need": {"type": "kill", "monster": "hon_don_thu", "count": 50}, "reward": {"stones": 15000, "exp": 28000, "contrib": 2500}, "target": {"kind": "map", "map": 5}, "minRealm": [4, 1]}, {"id": "sq_thien_phap_19", "sect": "thien_phap_tong", "rank": "thai_thuong", "nameKey": "sq_thien_phap_19", "descKey": "sq_thien_phap_19_desc", "npc": "truong_lao_phap", "req": "sq_thien_phap_18", "need": {"type": "killboss", "monster": "thien_tuong", "count": 1}, "reward": {"stones": 20000, "exp": 35000, "contrib": 3000, "items": [{"id": "yaodan3", "qty": 2}]}, "target": {"kind": "map", "map": 5}, "minRealm": [4, 2]}, {"id": "sq_thien_phap_20", "sect": "thien_phap_tong", "rank": "thai_thuong", "nameKey": "sq_thien_phap_20", "descKey": "sq_thien_phap_20_desc", "npc": "truong_lao_phap", "req": "sq_thien_phap_19", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_thien_phap_20", "hp": 25000, "atk": 500, "def": 200}}, "reward": {"stones": 30000, "exp": 50000, "contrib": 4000, "items": [{"id": "pill_hopdao", "qty": 1}]}, "target": {"kind": "npc", "id": "truong_lao_phap"}, "minRealm": [4, 3], "eventKey": "sq_event_thien_phap_20", "fx": "#c9a7ff"}, {"id": "sq_thien_phap_21", "sect": "thien_phap_tong", "rank": "thai_thuong", "nameKey": "sq_thien_phap_21", "descKey": "sq_thien_phap_21_desc", "npc": "truong_lao_phap", "req": "sq_thien_phap_20", "need": {"type": "item", "item": "pill_hoathan", "count": 2}, "reward": {"stones": 25000, "exp": 40000, "contrib": 3500, "items": [{"id": "ttd_tien", "qty": 1}]}, "target": {"kind": "npc", "id": "truong_lao_phap"}, "minRealm": [5, 0]}, {"id": "sq_thien_phap_22", "sect": "thien_phap_tong", "rank": "thai_thuong", "nameKey": "sq_thien_phap_22", "descKey": "sq_thien_phap_22_desc", "npc": "truong_lao_phap", "req": "sq_thien_phap_21", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_thien_phap_22", "hp": 31000, "atk": 640, "def": 260}}, "reward": {"stones": 50000, "exp": 100000, "contrib": 8000, "items": [{"id": "pill_dokiep", "qty": 1}, {"id": "manual_sig_phap", "qty": 1}]}, "target": {"kind": "npc", "id": "truong_lao_phap"}, "minRealm": [5, 0], "eventKey": "sq_event_thien_phap_22", "fx": "#c9a7ff", "grandTitle": "sq_title_thien_phap_immortal"}, {"id": "sq_kim_cang_13", "sect": "kim_cang_tong", "rank": "truong_lao", "nameKey": "sq_kim_cang_13", "descKey": "sq_kim_cang_13_desc", "npc": "truong_lao_the", "req": "sq_kim_cang_12", "need": {"type": "kill", "monster": "thach_giap_trung", "count": 40}, "reward": {"stones": 4000, "exp": 7000, "contrib": 700, "items": [{"id": "dan_hx_dai", "qty": 3}]}, "target": {"kind": "map", "map": 4}, "minRealm": [3, 0]}, {"id": "sq_kim_cang_14", "sect": "kim_cang_tong", "rank": "truong_lao", "nameKey": "sq_kim_cang_14", "descKey": "sq_kim_cang_14_desc", "npc": "truong_lao_the", "req": "sq_kim_cang_13", "need": {"type": "killboss", "monster": "thai_hu_thu_vuong", "count": 1}, "reward": {"stones": 5000, "exp": 9000, "contrib": 900, "items": [{"id": "dan_hx_dai", "qty": 3}]}, "target": {"kind": "map", "map": 5}, "minRealm": [3, 1]}, {"id": "sq_kim_cang_15", "sect": "kim_cang_tong", "rank": "truong_lao", "nameKey": "sq_kim_cang_15", "descKey": "sq_kim_cang_15_desc", "npc": "truong_lao_the", "req": "sq_kim_cang_14", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_kim_cang_15", "hp": 10000, "atk": 240, "def": 95}}, "reward": {"stones": 7000, "exp": 12000, "contrib": 1200, "items": [{"id": "manual_kimdan_the", "qty": 1}]}, "target": {"kind": "npc", "id": "truong_lao_the"}, "minRealm": [3, 2], "eventKey": "sq_event_kim_cang_15", "fx": "#ffd76a", "promote": "thai_thuong"}, {"id": "sq_kim_cang_16", "sect": "kim_cang_tong", "rank": "thai_thuong", "nameKey": "sq_kim_cang_16", "descKey": "sq_kim_cang_16_desc", "npc": "truong_lao_the", "req": "sq_kim_cang_15", "need": {"type": "item", "item": "truc_co_thao", "count": 12}, "reward": {"stones": 8000, "exp": 15000, "contrib": 1500, "items": [{"id": "dan_hx_dai", "qty": 3}]}, "target": {"kind": "npc", "id": "truong_lao_the"}, "minRealm": [3, 3]}, {"id": "sq_kim_cang_17", "sect": "kim_cang_tong", "rank": "thai_thuong", "nameKey": "sq_kim_cang_17", "descKey": "sq_kim_cang_17_desc", "npc": "truong_lao_the", "req": "sq_kim_cang_16", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_kim_cang_17", "hp": 16500, "atk": 350, "def": 140}}, "reward": {"stones": 12000, "exp": 22000, "contrib": 2000, "items": [{"id": "yaodan1", "qty": 3}]}, "target": {"kind": "npc", "id": "truong_lao_the"}, "minRealm": [4, 0], "eventKey": "sq_event_kim_cang_17", "fx": "#ffd76a", "grandTitle": "sq_title_kim_cang_ancient"}, {"id": "sq_kim_cang_18", "sect": "kim_cang_tong", "rank": "thai_thuong", "nameKey": "sq_kim_cang_18", "descKey": "sq_kim_cang_18_desc", "npc": "truong_lao_the", "req": "sq_kim_cang_17", "need": {"type": "kill", "monster": "tinh_thach_quai", "count": 50}, "reward": {"stones": 15000, "exp": 28000, "contrib": 2500}, "target": {"kind": "map", "map": 5}, "minRealm": [4, 1]}, {"id": "sq_kim_cang_19", "sect": "kim_cang_tong", "rank": "thai_thuong", "nameKey": "sq_kim_cang_19", "descKey": "sq_kim_cang_19_desc", "npc": "truong_lao_the", "req": "sq_kim_cang_18", "need": {"type": "killboss", "monster": "cot_tuong", "count": 1}, "reward": {"stones": 20000, "exp": 35000, "contrib": 3000, "items": [{"id": "yaodan3", "qty": 2}]}, "target": {"kind": "map", "map": 5}, "minRealm": [4, 2]}, {"id": "sq_kim_cang_20", "sect": "kim_cang_tong", "rank": "thai_thuong", "nameKey": "sq_kim_cang_20", "descKey": "sq_kim_cang_20_desc", "npc": "truong_lao_the", "req": "sq_kim_cang_19", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_kim_cang_20", "hp": 23000, "atk": 460, "def": 210}}, "reward": {"stones": 30000, "exp": 50000, "contrib": 4000, "items": [{"id": "pill_hopdao", "qty": 1}]}, "target": {"kind": "npc", "id": "truong_lao_the"}, "minRealm": [4, 3], "eventKey": "sq_event_kim_cang_20", "fx": "#ffd76a"}, {"id": "sq_kim_cang_21", "sect": "kim_cang_tong", "rank": "thai_thuong", "nameKey": "sq_kim_cang_21", "descKey": "sq_kim_cang_21_desc", "npc": "truong_lao_the", "req": "sq_kim_cang_20", "need": {"type": "item", "item": "ttd_tien", "count": 2}, "reward": {"stones": 25000, "exp": 40000, "contrib": 3500, "items": [{"id": "ttd_tien", "qty": 1}]}, "target": {"kind": "npc", "id": "truong_lao_the"}, "minRealm": [5, 0]}, {"id": "sq_kim_cang_22", "sect": "kim_cang_tong", "rank": "thai_thuong", "nameKey": "sq_kim_cang_22", "descKey": "sq_kim_cang_22_desc", "npc": "truong_lao_the", "req": "sq_kim_cang_21", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_kim_cang_22", "hp": 29000, "atk": 600, "def": 280}}, "reward": {"stones": 50000, "exp": 100000, "contrib": 8000, "items": [{"id": "pill_dokiep", "qty": 1}, {"id": "manual_sig_the", "qty": 1}]}, "target": {"kind": "npc", "id": "truong_lao_the"}, "minRealm": [5, 0], "eventKey": "sq_event_kim_cang_22", "fx": "#ffd76a", "grandTitle": "sq_title_kim_cang_immortal"}, {"id": "sq_duoc_vuong_13", "sect": "duoc_vuong_tong", "rank": "truong_lao", "nameKey": "sq_duoc_vuong_13", "descKey": "sq_duoc_vuong_13_desc", "npc": "truong_lao_duoc", "req": "sq_duoc_vuong_12", "need": {"type": "item", "item": "dia_linh_qua", "count": 10}, "reward": {"stones": 4000, "exp": 7000, "contrib": 700, "items": [{"id": "dan_hl_dai", "qty": 3}]}, "target": {"kind": "npc", "id": "truong_lao_duoc"}, "minRealm": [3, 0]}, {"id": "sq_duoc_vuong_14", "sect": "duoc_vuong_tong", "rank": "truong_lao", "nameKey": "sq_duoc_vuong_14", "descKey": "sq_duoc_vuong_14_desc", "npc": "truong_lao_duoc", "req": "sq_duoc_vuong_13", "need": {"type": "killboss", "monster": "hon_don_thu", "count": 1}, "reward": {"stones": 5000, "exp": 9000, "contrib": 900, "items": [{"id": "dan_hl_dai", "qty": 3}]}, "target": {"kind": "map", "map": 5}, "minRealm": [3, 1]}, {"id": "sq_duoc_vuong_15", "sect": "duoc_vuong_tong", "rank": "truong_lao", "nameKey": "sq_duoc_vuong_15", "descKey": "sq_duoc_vuong_15_desc", "npc": "truong_lao_duoc", "req": "sq_duoc_vuong_14", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_duoc_vuong_15", "hp": 9000, "atk": 225, "def": 85}}, "reward": {"stones": 7000, "exp": 12000, "contrib": 1200, "items": [{"id": "yaodan1", "qty": 2}]}, "target": {"kind": "npc", "id": "truong_lao_duoc"}, "minRealm": [3, 2], "eventKey": "sq_event_duoc_vuong_15", "fx": "#7fe08a", "promote": "thai_thuong"}, {"id": "sq_duoc_vuong_16", "sect": "duoc_vuong_tong", "rank": "thai_thuong", "nameKey": "sq_duoc_vuong_16", "descKey": "sq_duoc_vuong_16_desc", "npc": "truong_lao_duoc", "req": "sq_duoc_vuong_15", "need": {"type": "stones", "count": 8000}, "reward": {"stones": 0, "exp": 15000, "contrib": 1500, "items": [{"id": "dan_hl_dai", "qty": 2}]}, "target": {"kind": "npc", "id": "truong_lao_duoc"}, "minRealm": [3, 3]}, {"id": "sq_duoc_vuong_17", "sect": "duoc_vuong_tong", "rank": "thai_thuong", "nameKey": "sq_duoc_vuong_17", "descKey": "sq_duoc_vuong_17_desc", "npc": "truong_lao_duoc", "req": "sq_duoc_vuong_16", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_duoc_vuong_17", "hp": 15500, "atk": 330, "def": 128}}, "reward": {"stones": 12000, "exp": 22000, "contrib": 2000, "items": [{"id": "yaodan1", "qty": 3}]}, "target": {"kind": "npc", "id": "truong_lao_duoc"}, "minRealm": [4, 0], "eventKey": "sq_event_duoc_vuong_17", "fx": "#7fe08a", "grandTitle": "sq_title_duoc_vuong_ancient"}, {"id": "sq_duoc_vuong_18", "sect": "duoc_vuong_tong", "rank": "thai_thuong", "nameKey": "sq_duoc_vuong_18", "descKey": "sq_duoc_vuong_18_desc", "npc": "truong_lao_duoc", "req": "sq_duoc_vuong_17", "need": {"type": "kill", "monster": "u_minh_cu_mang", "count": 50}, "reward": {"stones": 15000, "exp": 28000, "contrib": 2500}, "target": {"kind": "map", "map": 5}, "minRealm": [4, 1]}, {"id": "sq_duoc_vuong_19", "sect": "duoc_vuong_tong", "rank": "thai_thuong", "nameKey": "sq_duoc_vuong_19", "descKey": "sq_duoc_vuong_19_desc", "npc": "truong_lao_duoc", "req": "sq_duoc_vuong_18", "need": {"type": "killboss", "monster": "hac_long", "count": 1}, "reward": {"stones": 20000, "exp": 35000, "contrib": 3000, "items": [{"id": "yaodan3", "qty": 2}]}, "target": {"kind": "map", "map": 5}, "minRealm": [4, 2]}, {"id": "sq_duoc_vuong_20", "sect": "duoc_vuong_tong", "rank": "thai_thuong", "nameKey": "sq_duoc_vuong_20", "descKey": "sq_duoc_vuong_20_desc", "npc": "truong_lao_duoc", "req": "sq_duoc_vuong_19", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_duoc_vuong_20", "hp": 22000, "atk": 440, "def": 180}}, "reward": {"stones": 30000, "exp": 50000, "contrib": 4000, "items": [{"id": "pill_hopdao", "qty": 1}]}, "target": {"kind": "npc", "id": "truong_lao_duoc"}, "minRealm": [4, 3], "eventKey": "sq_event_duoc_vuong_20", "fx": "#7fe08a"}, {"id": "sq_duoc_vuong_21", "sect": "duoc_vuong_tong", "rank": "thai_thuong", "nameKey": "sq_duoc_vuong_21", "descKey": "sq_duoc_vuong_21_desc", "npc": "truong_lao_duoc", "req": "sq_duoc_vuong_20", "need": {"type": "item", "item": "dtd_tien", "count": 2}, "reward": {"stones": 25000, "exp": 40000, "contrib": 3500, "items": [{"id": "ttd_tien", "qty": 1}]}, "target": {"kind": "npc", "id": "truong_lao_duoc"}, "minRealm": [5, 0]}, {"id": "sq_duoc_vuong_22", "sect": "duoc_vuong_tong", "rank": "thai_thuong", "nameKey": "sq_duoc_vuong_22", "descKey": "sq_duoc_vuong_22_desc", "npc": "truong_lao_duoc", "req": "sq_duoc_vuong_21", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_duoc_vuong_22", "hp": 28000, "atk": 580, "def": 240}}, "reward": {"stones": 50000, "exp": 100000, "contrib": 8000, "items": [{"id": "pill_dokiep", "qty": 1}, {"id": "manual_sig_duoc", "qty": 1}]}, "target": {"kind": "npc", "id": "truong_lao_duoc"}, "minRealm": [5, 0], "eventKey": "sq_event_duoc_vuong_22", "fx": "#7fe08a", "grandTitle": "sq_title_duoc_vuong_immortal"}, {"id": "sq_ngu_thu_13", "sect": "ngu_thu_tong", "rank": "truong_lao", "nameKey": "sq_ngu_thu_13", "descKey": "sq_ngu_thu_13_desc", "npc": "truong_lao_thu", "req": "sq_ngu_thu_12", "need": {"type": "kill", "monster": "am_anh_thu", "count": 40}, "reward": {"stones": 4000, "exp": 7000, "contrib": 700, "items": [{"id": "dan_hl_dai", "qty": 3}]}, "target": {"kind": "map", "map": 4}, "minRealm": [3, 0]}, {"id": "sq_ngu_thu_14", "sect": "ngu_thu_tong", "rank": "truong_lao", "nameKey": "sq_ngu_thu_14", "descKey": "sq_ngu_thu_14_desc", "npc": "truong_lao_thu", "req": "sq_ngu_thu_13", "need": {"type": "killboss", "monster": "hac_long", "count": 1}, "reward": {"stones": 5000, "exp": 9000, "contrib": 900, "items": [{"id": "dan_hl_dai", "qty": 3}]}, "target": {"kind": "map", "map": 5}, "minRealm": [3, 1]}, {"id": "sq_ngu_thu_15", "sect": "ngu_thu_tong", "rank": "truong_lao", "nameKey": "sq_ngu_thu_15", "descKey": "sq_ngu_thu_15_desc", "npc": "truong_lao_thu", "req": "sq_ngu_thu_14", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_ngu_thu_15", "hp": 9500, "atk": 232, "def": 90}}, "reward": {"stones": 7000, "exp": 12000, "contrib": 1200, "items": [{"id": "trung_dia", "qty": 2}]}, "target": {"kind": "npc", "id": "truong_lao_thu"}, "minRealm": [3, 2], "eventKey": "sq_event_ngu_thu_15", "fx": "#ff9d5c", "promote": "thai_thuong"}, {"id": "sq_ngu_thu_16", "sect": "ngu_thu_tong", "rank": "thai_thuong", "nameKey": "sq_ngu_thu_16", "descKey": "sq_ngu_thu_16_desc", "npc": "truong_lao_thu", "req": "sq_ngu_thu_15", "need": {"type": "item", "item": "trung_dia", "count": 3}, "reward": {"stones": 8000, "exp": 15000, "contrib": 1500, "items": [{"id": "dan_hl_dai", "qty": 3}]}, "target": {"kind": "npc", "id": "truong_lao_thu"}, "minRealm": [3, 3]}, {"id": "sq_ngu_thu_17", "sect": "ngu_thu_tong", "rank": "thai_thuong", "nameKey": "sq_ngu_thu_17", "descKey": "sq_ngu_thu_17_desc", "npc": "truong_lao_thu", "req": "sq_ngu_thu_16", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_ngu_thu_17", "hp": 16000, "atk": 342, "def": 130}}, "reward": {"stones": 12000, "exp": 22000, "contrib": 2000, "items": [{"id": "trung_dia", "qty": 2}]}, "target": {"kind": "npc", "id": "truong_lao_thu"}, "minRealm": [4, 0], "eventKey": "sq_event_ngu_thu_17", "fx": "#ff9d5c", "grandTitle": "sq_title_ngu_thu_ancient"}, {"id": "sq_ngu_thu_18", "sect": "ngu_thu_tong", "rank": "thai_thuong", "nameKey": "sq_ngu_thu_18", "descKey": "sq_ngu_thu_18_desc", "npc": "truong_lao_thu", "req": "sq_ngu_thu_17", "need": {"type": "kill", "monster": "cuu_kiep_loi_thu", "count": 50}, "reward": {"stones": 15000, "exp": 28000, "contrib": 2500}, "target": {"kind": "map", "map": 5}, "minRealm": [4, 1]}, {"id": "sq_ngu_thu_19", "sect": "ngu_thu_tong", "rank": "thai_thuong", "nameKey": "sq_ngu_thu_19", "descKey": "sq_ngu_thu_19_desc", "npc": "truong_lao_thu", "req": "sq_ngu_thu_18", "need": {"type": "killboss", "monster": "thai_hu_thu_vuong", "count": 1}, "reward": {"stones": 20000, "exp": 35000, "contrib": 3000, "items": [{"id": "yaodan3", "qty": 2}]}, "target": {"kind": "map", "map": 5}, "minRealm": [4, 2]}, {"id": "sq_ngu_thu_20", "sect": "ngu_thu_tong", "rank": "thai_thuong", "nameKey": "sq_ngu_thu_20", "descKey": "sq_ngu_thu_20_desc", "npc": "truong_lao_thu", "req": "sq_ngu_thu_19", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_ngu_thu_20", "hp": 24000, "atk": 480, "def": 190}}, "reward": {"stones": 30000, "exp": 50000, "contrib": 4000, "items": [{"id": "pill_hopdao", "qty": 1}]}, "target": {"kind": "npc", "id": "truong_lao_thu"}, "minRealm": [4, 3], "eventKey": "sq_event_ngu_thu_20", "fx": "#ff9d5c"}, {"id": "sq_ngu_thu_21", "sect": "ngu_thu_tong", "rank": "thai_thuong", "nameKey": "sq_ngu_thu_21", "descKey": "sq_ngu_thu_21_desc", "npc": "truong_lao_thu", "req": "sq_ngu_thu_20", "need": {"type": "item", "item": "trung_thien", "count": 2}, "reward": {"stones": 25000, "exp": 40000, "contrib": 3500, "items": [{"id": "ttd_tien", "qty": 1}]}, "target": {"kind": "npc", "id": "truong_lao_thu"}, "minRealm": [5, 0]}, {"id": "sq_ngu_thu_22", "sect": "ngu_thu_tong", "rank": "thai_thuong", "nameKey": "sq_ngu_thu_22", "descKey": "sq_ngu_thu_22_desc", "npc": "truong_lao_thu", "req": "sq_ngu_thu_21", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_ngu_thu_22", "hp": 30000, "atk": 620, "def": 250}}, "reward": {"stones": 50000, "exp": 100000, "contrib": 8000, "items": [{"id": "pill_dokiep", "qty": 1}, {"id": "manual_sig_thu", "qty": 1}]}, "target": {"kind": "npc", "id": "truong_lao_thu"}, "minRealm": [5, 0], "eventKey": "sq_event_ngu_thu_22", "fx": "#ff9d5c", "grandTitle": "sq_title_ngu_thu_immortal"}, {"id": "sq_cuu_u_ma_13", "sect": "cuu_u_ma_tong", "rank": "truong_lao", "nameKey": "sq_cuu_u_ma_13", "descKey": "sq_cuu_u_ma_13_desc", "npc": "truong_lao_ma", "req": "sq_cuu_u_ma_12", "need": {"type": "kill", "monster": "sat_thu_huyet_y", "count": 40}, "reward": {"stones": 4000, "exp": 7000, "contrib": 700, "items": [{"id": "dan_hx_dai", "qty": 3}]}, "target": {"kind": "map", "map": 4}, "minRealm": [3, 0]}, {"id": "sq_cuu_u_ma_14", "sect": "cuu_u_ma_tong", "rank": "truong_lao", "nameKey": "sq_cuu_u_ma_14", "descKey": "sq_cuu_u_ma_14_desc", "npc": "truong_lao_ma", "req": "sq_cuu_u_ma_13", "need": {"type": "killboss", "monster": "huyet_y_mon_chu", "count": 1}, "reward": {"stones": 5000, "exp": 9000, "contrib": 900, "items": [{"id": "dan_hx_dai", "qty": 3}]}, "target": {"kind": "map", "map": 4}, "minRealm": [3, 1]}, {"id": "sq_cuu_u_ma_15", "sect": "cuu_u_ma_tong", "rank": "truong_lao", "nameKey": "sq_cuu_u_ma_15", "descKey": "sq_cuu_u_ma_15_desc", "npc": "truong_lao_ma", "req": "sq_cuu_u_ma_14", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_cuu_u_ma_15", "hp": 10000, "atk": 245, "def": 92}}, "reward": {"stones": 7000, "exp": 12000, "contrib": 1200, "items": [{"id": "yaodan1", "qty": 2}]}, "target": {"kind": "npc", "id": "truong_lao_ma"}, "minRealm": [3, 2], "eventKey": "sq_event_cuu_u_ma_15", "fx": "#ff3d5a", "promote": "thai_thuong"}, {"id": "sq_cuu_u_ma_16", "sect": "cuu_u_ma_tong", "rank": "thai_thuong", "nameKey": "sq_cuu_u_ma_16", "descKey": "sq_cuu_u_ma_16_desc", "npc": "truong_lao_ma", "req": "sq_cuu_u_ma_15", "need": {"type": "item", "item": "yaodan1", "count": 5}, "reward": {"stones": 8000, "exp": 15000, "contrib": 1500, "items": [{"id": "dan_hx_dai", "qty": 3}]}, "target": {"kind": "npc", "id": "truong_lao_ma"}, "minRealm": [3, 3]}, {"id": "sq_cuu_u_ma_17", "sect": "cuu_u_ma_tong", "rank": "thai_thuong", "nameKey": "sq_cuu_u_ma_17", "descKey": "sq_cuu_u_ma_17_desc", "npc": "truong_lao_ma", "req": "sq_cuu_u_ma_16", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_cuu_u_ma_17", "hp": 16500, "atk": 355, "def": 138}}, "reward": {"stones": 12000, "exp": 22000, "contrib": 2000, "items": [{"id": "yaodan1", "qty": 3}]}, "target": {"kind": "npc", "id": "truong_lao_ma"}, "minRealm": [4, 0], "eventKey": "sq_event_cuu_u_ma_17", "fx": "#ff3d5a", "grandTitle": "sq_title_cuu_u_ma_ancient"}, {"id": "sq_cuu_u_ma_18", "sect": "cuu_u_ma_tong", "rank": "thai_thuong", "nameKey": "sq_cuu_u_ma_18", "descKey": "sq_cuu_u_ma_18_desc", "npc": "truong_lao_ma", "req": "sq_cuu_u_ma_17", "need": {"type": "kill", "monster": "huyet_buc", "count": 50}, "reward": {"stones": 15000, "exp": 28000, "contrib": 2500}, "target": {"kind": "map", "map": 5}, "minRealm": [4, 1]}, {"id": "sq_cuu_u_ma_19", "sect": "cuu_u_ma_tong", "rank": "thai_thuong", "nameKey": "sq_cuu_u_ma_19", "descKey": "sq_cuu_u_ma_19_desc", "npc": "truong_lao_ma", "req": "sq_cuu_u_ma_18", "need": {"type": "killboss", "monster": "cuu_u_ma_tuong", "count": 1}, "reward": {"stones": 20000, "exp": 35000, "contrib": 3000, "items": [{"id": "yaodan3", "qty": 2}]}, "target": {"kind": "map", "map": 5}, "minRealm": [4, 2]}, {"id": "sq_cuu_u_ma_20", "sect": "cuu_u_ma_tong", "rank": "thai_thuong", "nameKey": "sq_cuu_u_ma_20", "descKey": "sq_cuu_u_ma_20_desc", "npc": "truong_lao_ma", "req": "sq_cuu_u_ma_19", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_cuu_u_ma_20", "hp": 25000, "atk": 520, "def": 200}}, "reward": {"stones": 30000, "exp": 50000, "contrib": 4000, "items": [{"id": "pill_hopdao", "qty": 1}]}, "target": {"kind": "npc", "id": "truong_lao_ma"}, "minRealm": [4, 3], "eventKey": "sq_event_cuu_u_ma_20", "fx": "#ff3d5a"}, {"id": "sq_cuu_u_ma_21", "sect": "cuu_u_ma_tong", "rank": "thai_thuong", "nameKey": "sq_cuu_u_ma_21", "descKey": "sq_cuu_u_ma_21_desc", "npc": "truong_lao_ma", "req": "sq_cuu_u_ma_20", "need": {"type": "item", "item": "yaodan5", "count": 1}, "reward": {"stones": 25000, "exp": 40000, "contrib": 3500, "items": [{"id": "ttd_tien", "qty": 1}]}, "target": {"kind": "npc", "id": "truong_lao_ma"}, "minRealm": [5, 0]}, {"id": "sq_cuu_u_ma_22", "sect": "cuu_u_ma_tong", "rank": "thai_thuong", "nameKey": "sq_cuu_u_ma_22", "descKey": "sq_cuu_u_ma_22_desc", "npc": "truong_lao_ma", "req": "sq_cuu_u_ma_21", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_cuu_u_ma_22", "hp": 32000, "atk": 660, "def": 270}}, "reward": {"stones": 50000, "exp": 100000, "contrib": 8000, "items": [{"id": "pill_dokiep", "qty": 1}, {"id": "manual_sig_ma", "qty": 1}]}, "target": {"kind": "npc", "id": "truong_lao_ma"}, "minRealm": [5, 0], "eventKey": "sq_event_cuu_u_ma_22", "fx": "#ff3d5a", "grandTitle": "sq_title_cuu_u_ma_immortal"}];
const SECT_QUEST_CUNGCO = [{"id": "sq_kiem_cungco", "sect": "kiem_tong", "special": "cung_co", "rank": "noi_mon", "nameKey": "sq_kiem_cungco", "descKey": "sq_kiem_cungco_desc", "npc": "truong_lao_kiem", "need": {"type": "item", "item": "truc_co_thao", "count": 5}, "reward": {"exp": 300, "contrib": 30, "btBonus": 0.1}, "target": {"kind": "npc", "id": "truong_lao_kiem"}}, {"id": "sq_thien_phap_cungco", "sect": "thien_phap_tong", "special": "cung_co", "rank": "noi_mon", "nameKey": "sq_thien_phap_cungco", "descKey": "sq_thien_phap_cungco_desc", "npc": "truong_lao_phap", "need": {"type": "item", "item": "truc_co_thao", "count": 5}, "reward": {"exp": 300, "contrib": 30, "btBonus": 0.1}, "target": {"kind": "npc", "id": "truong_lao_phap"}}, {"id": "sq_kim_cang_cungco", "sect": "kim_cang_tong", "special": "cung_co", "rank": "noi_mon", "nameKey": "sq_kim_cang_cungco", "descKey": "sq_kim_cang_cungco_desc", "npc": "truong_lao_the", "need": {"type": "item", "item": "truc_co_thao", "count": 5}, "reward": {"exp": 300, "contrib": 30, "btBonus": 0.1}, "target": {"kind": "npc", "id": "truong_lao_the"}}, {"id": "sq_duoc_vuong_cungco", "sect": "duoc_vuong_tong", "special": "cung_co", "rank": "noi_mon", "nameKey": "sq_duoc_vuong_cungco", "descKey": "sq_duoc_vuong_cungco_desc", "npc": "truong_lao_duoc", "need": {"type": "item", "item": "truc_co_thao", "count": 5}, "reward": {"exp": 300, "contrib": 30, "btBonus": 0.1}, "target": {"kind": "npc", "id": "truong_lao_duoc"}}, {"id": "sq_ngu_thu_cungco", "sect": "ngu_thu_tong", "special": "cung_co", "rank": "noi_mon", "nameKey": "sq_ngu_thu_cungco", "descKey": "sq_ngu_thu_cungco_desc", "npc": "truong_lao_thu", "need": {"type": "item", "item": "truc_co_thao", "count": 5}, "reward": {"exp": 300, "contrib": 30, "btBonus": 0.1}, "target": {"kind": "npc", "id": "truong_lao_thu"}}, {"id": "sq_cuu_u_ma_cungco", "sect": "cuu_u_ma_tong", "special": "cung_co", "rank": "noi_mon", "nameKey": "sq_cuu_u_ma_cungco", "descKey": "sq_cuu_u_ma_cungco_desc", "npc": "truong_lao_ma", "need": {"type": "item", "item": "truc_co_thao", "count": 5}, "reward": {"exp": 300, "contrib": 30, "btBonus": 0.1}, "target": {"kind": "npc", "id": "truong_lao_ma"}}];
const SECT_QUEST_DAILY = [
  /* ===== Kiếm Tông: 5 nhiệm vụ ngày ===== */
  {id:"sqd_kiem_luyenkiem", sect:"kiem_tong", rank: "noi_mon", tname:"sqd_kiem_luyenkiem", tdesc:"sqd_kiem_luyenkiem_desc",
   need:{type:"kill", count:20}, reward:{contrib:20, stones:200, exp:500}},
  {id:"sqd_kiem_thachdau", sect:"kiem_tong", tname:"sqd_kiem_thachdau", tdesc:"sqd_kiem_thachdau_desc",
   need:{type:"killboss", count:1}, reward:{contrib:40, stones:500, exp:1200}},
  {id:"sqd_kiem_tuantran", sect:"kiem_tong", rank: "noi_mon", tname:"sqd_kiem_tuantran", tdesc:"sqd_kiem_tuantran_desc",
   need:{type:"kill", count:10}, reward:{contrib:15, stones:150, exp:300}},
  {id:"sqd_kiem_ngokiem", sect:"kiem_tong", tname:"sqd_kiem_ngokiem", tdesc:"sqd_kiem_ngokiem_desc",
   need:{type:"meditate", count:1}, reward:{contrib:25, stones:300, exp:800}},
  {id:"sqd_kiem_donate", sect:"kiem_tong", tname:"sqd_kiem_donate", tdesc:"sqd_kiem_donate_desc",
   need:{type:"stones", count:500}, reward:{contrib:15, stones:0, exp:200}},
  /* ===== Thiên Pháp Tông: 5 nhiệm vụ ngày ===== */
  {id:"sqd_phap_tuluyen", sect:"thien_phap_tong", tname:"sqd_phap_tuluyen", tdesc:"sqd_phap_tuluyen_desc",
   need:{type:"meditate", count:1}, reward:{contrib:25, stones:300, exp:800}},
  {id:"sqd_phap_thulinhkhi", sect:"thien_phap_tong", tname:"sqd_phap_thulinhkhi", tdesc:"sqd_phap_thulinhkhi_desc",
   need:{type:"kill", count:15}, reward:{contrib:20, stones:200, exp:500}},
  {id:"sqd_phap_giaidophu", sect:"thien_phap_tong", tname:"sqd_phap_giaidophu", tdesc:"sqd_phap_giaidophu_desc",
   need:{type:"killboss", count:1}, reward:{contrib:40, stones:500, exp:1200}},
  {id:"sqd_phap_truyquet", sect:"thien_phap_tong", tname:"sqd_phap_truyquet", tdesc:"sqd_phap_truyquet_desc",
   need:{type:"kill", count:25}, reward:{contrib:25, stones:250, exp:700}},
  {id:"sqd_phap_donate", sect:"thien_phap_tong", tname:"sqd_phap_donate", tdesc:"sqd_phap_donate_desc",
   need:{type:"stones", count:500}, reward:{contrib:15, stones:0, exp:200}},
  /* ===== Kim Cang Tông: 5 nhiệm vụ ngày ===== */
  {id:"sqd_cang_luyenthe", sect:"kim_cang_tong", tname:"sqd_cang_luyenthe", tdesc:"sqd_cang_luyenthe_desc",
   need:{type:"meditate", count:2}, reward:{contrib:30, stones:350, exp:900}},
  {id:"sqd_cang_ganhnuoc", sect:"kim_cang_tong", tname:"sqd_cang_ganhnuoc", tdesc:"sqd_cang_ganhnuoc_desc",
   need:{type:"kill", count:15}, reward:{contrib:20, stones:200, exp:500}},
  {id:"sqd_cang_tungking", sect:"kim_cang_tong", tname:"sqd_cang_tungking", tdesc:"sqd_cang_tungking_desc",
   need:{type:"meditate", count:1}, reward:{contrib:20, stones:250, exp:600}},
  {id:"sqd_cang_hophap", sect:"kim_cang_tong", tname:"sqd_cang_hophap", tdesc:"sqd_cang_hophap_desc",
   need:{type:"killboss", count:1}, reward:{contrib:40, stones:500, exp:1200}},
  {id:"sqd_cang_donate", sect:"kim_cang_tong", tname:"sqd_cang_donate", tdesc:"sqd_cang_donate_desc",
   need:{type:"stones", count:500}, reward:{contrib:15, stones:0, exp:200}},
  /* ===== Dược Vương Tông: 5 nhiệm vụ ngày ===== */
  {id:"sqd_duoc_haiduoc", sect:"duoc_vuong_tong", tname:"sqd_duoc_haiduoc", tdesc:"sqd_duoc_haiduoc_desc",
   need:{type:"item", item:"truc_co_thao", count:10}, reward:{contrib:20, stones:200, exp:500}},
  {id:"sqd_duoc_luyendan", sect:"duoc_vuong_tong", tname:"sqd_duoc_luyendan", tdesc:"sqd_duoc_luyendan_desc",
   need:{type:"craftpill", count:2}, reward:{contrib:30, stones:350, exp:900}},
  {id:"sqd_duoc_trusau", sect:"duoc_vuong_tong", tname:"sqd_duoc_trusau", tdesc:"sqd_duoc_trusau_desc",
   need:{type:"kill", count:15}, reward:{contrib:20, stones:200, exp:500}},
  {id:"sqd_duoc_nghiencuu", sect:"duoc_vuong_tong", tname:"sqd_duoc_nghiencuu", tdesc:"sqd_duoc_nghiencuu_desc",
   need:{type:"meditate", count:1}, reward:{contrib:20, stones:250, exp:600}},
  {id:"sqd_duoc_donate", sect:"duoc_vuong_tong", tname:"sqd_duoc_donate", tdesc:"sqd_duoc_donate_desc",
   need:{type:"stones", count:500}, reward:{contrib:15, stones:0, exp:200}},
  /* ===== Ngự Thú Tông: 5 nhiệm vụ ngày ===== */
  {id:"sqd_thu_choan", sect:"ngu_thu_tong", tname:"sqd_thu_choan", tdesc:"sqd_thu_choan_desc",
   need:{type:"feedpet", count:2}, reward:{contrib:25, stones:300, exp:700}},
  {id:"sqd_thu_tuantran", sect:"ngu_thu_tong", tname:"sqd_thu_tuantran", tdesc:"sqd_thu_tuantran_desc",
   need:{type:"kill", count:10}, reward:{contrib:15, stones:150, exp:300}},
  {id:"sqd_thu_thuanphuc", sect:"ngu_thu_tong", tname:"sqd_thu_thuanphuc", tdesc:"sqd_thu_thuanphuc_desc",
   need:{type:"killboss", count:1}, reward:{contrib:40, stones:500, exp:1200}},
  {id:"sqd_thu_sanmoi", sect:"ngu_thu_tong", tname:"sqd_thu_sanmoi", tdesc:"sqd_thu_sanmoi_desc",
   need:{type:"kill", count:20}, reward:{contrib:20, stones:200, exp:500}},
  {id:"sqd_thu_donate", sect:"ngu_thu_tong", tname:"sqd_thu_donate", tdesc:"sqd_thu_donate_desc",
   need:{type:"stones", count:500}, reward:{contrib:15, stones:0, exp:200}},
  /* ===== Cửu U Ma Tông: 5 nhiệm vụ ngày ===== */
  {id:"sqd_ma_huyetluyen", sect:"cuu_u_ma_tong", tname:"sqd_ma_huyetluyen", tdesc:"sqd_ma_huyetluyen_desc",
   need:{type:"kill", count:20}, reward:{contrib:20, stones:200, exp:500}},
  {id:"sqd_ma_amsat", sect:"cuu_u_ma_tong", tname:"sqd_ma_amsat", tdesc:"sqd_ma_amsat_desc",
   need:{type:"killboss", count:1}, reward:{contrib:40, stones:500, exp:1200}},
  {id:"sqd_ma_huyettinh", sect:"cuu_u_ma_tong", tname:"sqd_ma_huyettinh", tdesc:"sqd_ma_huyettinh_desc",
   need:{type:"item", item:"huyet_tinh", count:5}, reward:{contrib:30, stones:350, exp:900}},
  {id:"sqd_ma_tuluyen", sect:"cuu_u_ma_tong", tname:"sqd_ma_tuluyen", tdesc:"sqd_ma_tuluyen_desc",
   need:{type:"meditate", count:1}, reward:{contrib:20, stones:250, exp:600}},
  {id:"sqd_ma_donate", sect:"cuu_u_ma_tong", tname:"sqd_ma_donate", tdesc:"sqd_ma_donate_desc",
   need:{type:"stones", count:500}, reward:{contrib:15, stones:0, exp:200}},
];
const SECT_QUEST_WEEKLY = [{"id": "sqw_kiem_grand", "sect": "kiem_tong", "tname": "sq_weekly_grand", "tdesc": "sq_weekly_grand_desc", "need": {"type": "kill", "count": 80}, "need2": {"type": "killboss", "count": 3}, "reward": {"contrib": 100, "stones": 500}}, {"id": "sqw_thien_phap_grand", "sect": "thien_phap_tong", "tname": "sq_weekly_grand", "tdesc": "sq_weekly_grand_desc", "need": {"type": "kill", "count": 80}, "need2": {"type": "killboss", "count": 3}, "reward": {"contrib": 100, "stones": 500}}, {"id": "sqw_kim_cang_grand", "sect": "kim_cang_tong", "tname": "sq_weekly_grand", "tdesc": "sq_weekly_grand_desc", "need": {"type": "kill", "count": 80}, "need2": {"type": "killboss", "count": 3}, "reward": {"contrib": 100, "stones": 500}}, {"id": "sqw_duoc_vuong_grand", "sect": "duoc_vuong_tong", "tname": "sq_weekly_grand", "tdesc": "sq_weekly_grand_desc", "need": {"type": "kill", "count": 80}, "need2": {"type": "killboss", "count": 3}, "reward": {"contrib": 100, "stones": 500}}, {"id": "sqw_ngu_thu_grand", "sect": "ngu_thu_tong", "tname": "sq_weekly_grand", "tdesc": "sq_weekly_grand_desc", "need": {"type": "kill", "count": 80}, "need2": {"type": "killboss", "count": 3}, "reward": {"contrib": 100, "stones": 500}}, {"id": "sqw_cuu_u_ma_grand", "sect": "cuu_u_ma_tong", "tname": "sq_weekly_grand", "tdesc": "sq_weekly_grand_desc", "need": {"type": "kill", "count": 80}, "need2": {"type": "killboss", "count": 3}, "reward": {"contrib": 100, "stones": 500}}];
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    ELEMENTS, LINGEN_RATES,
    MONSTERS, MAPS, DUNGEONS, SECRET_REALMS, genRandomDungeon, BC_REALMS,
    ITEMS, SKILLS, SHOP_STOCK, GIFT_CODES, RARITY, DOKHO, YD_ELEM_STAT,
    NPCS, QUESTS,
    SECT_QUESTS, SECT_QUEST_CUNGCO, SECT_QUEST_DAILY, SECT_QUEST_WEEKLY,
  };
}
