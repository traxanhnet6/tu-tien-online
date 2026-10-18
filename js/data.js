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
    ],
  },
  u_hon_lang: {
    nameKey: "mon_u_hon_lang", hp: 170, atk: 38, def: 14, exp: 30,
    img: null, fb: "#5a4a6a", loai: "ma",
    drops: [
      { id: "pill_hx", rate: 0.06, min: 1, max: 1 },
      { id: "yaodan1", rate: 0.04, min: 1, max: 1 },
      { id: "oan_hon_thach", rate: 0.05, min: 1, max: 1 },
    ],
  },
  thach_giap_trung: {
    nameKey: "mon_thach_giap_trung", hp: 200, atk: 45, def: 25, exp: 40,
    img: null, fb: "#6a6a72", loai: "thu",
    drops: [
      { id: "pill_hx", rate: 0.06, min: 1, max: 1 },
      { id: "tran_than_thach", rate: 0.08, min: 1, max: 1 },
    ],
  },
  tinh_thach_quai: {
    nameKey: "mon_tinh_thach_quai", hp: 230, atk: 52, def: 20, exp: 48,
    img: null, fb: "#7ab8d8", loai: "thu",
    drops: [
      { id: "pill_hl", rate: 0.06, min: 1, max: 1 },
      { id: "linh_thach_tho", rate: 0.08, min: 1, max: 1 },
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
    monsters: ["da_tru", "son_ke"],
    boss: "da_tru_vuong",
    spawnZones: [
      { x: 280, y: 800, r: 150, monsters: ["da_tru"] },
      { x: 1300, y: 850, r: 150, monsters: ["son_ke"] },
    ],
    bossSpawn: { x: 800, y: 880 },
    npcs: ["dai_phu", "van_tien_cac", "truong_lao", "tam_tien_bi_tich", "truong_tran", "lao_ren", "thuong_nhan", "tieu_nhi", "su_gia_kiem", "su_gia_phap", "su_gia_the", "tuan_thu_su", "lao_dan_duong", "thu_thap_nhan", "su_gia_duoc", "su_gia_thu", "minh_chu", "thuong_nhan_du_hanh", "su_gia_ma"],
    quests: ["q_story_01", "q_story_02", "q_story_03", "q_story_04", "q_story_05", "q_story_10"],
    gates: [{to: 1, x: 720, y: 80}, {to: 3, x: 80, y: 500}, {to: 4, x: 1500, y: 80}, {to: 5, x: 80, y: 1000}, {to: 6, x: 400, y: 1120}, {to: 7, x: 800, y: 1120}, {to: 8, x: 1200, y: 1120}, {to: 9, x: 1500, y: 1000}, {to: 10, x: 1500, y: 600}, {to: 11, x: 1500, y: 450}, {to: 12, x: 1500, y: 300}],
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
      { x: 300, y: 380, r: 160, monsters: ["phong_lang"] },
      { x: 1250, y: 680, r: 160, monsters: ["hu_thi"] },
      { x: 750, y: 950, r: 150, monsters: ["u_hon_lang"] },
    ],
    bossSpawn: { x: 1150, y: 180 },
    npcs: ["tho_san", "an_sy"],
    quests: [],
    gates: [{to: 0, x: 80, y: 80}, {to: 2, x: 720, y: 540}],
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
      { x: 800, y: 280, r: 170, monsters: ["u_hon"] },
      { x: 800, y: 920, r: 170, monsters: ["thi_ma"] },
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
      { x: 350, y: 720, r: 150, monsters: ["thach_giap_trung"] },
      { x: 1250, y: 450, r: 150, monsters: ["tinh_thach_quai"] },
    ],
    npcs: ["quan_mo", "thuong_nhan_mo"],
    quests: [],
    gates: [{to: 0, x: 80, y: 80}],
    stoneDrop: [8, 16],
    unlock: {realm: 1, tier: 5},
  },
  {
    id: 5,
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
    gates: [{to: 0, x: 80, y: 1000}],
    stoneDrop: [0, 0],
    unlock: {realm: 2},
  },
  {
    id: 6,
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
    gates: [{to: 0, x: 400, y: 1120}],
    stoneDrop: [0, 0],
    unlock: {realm: 2},
  },
  {
    id: 7,
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
    gates: [{to: 0, x: 800, y: 1120}],
    stoneDrop: [0, 0],
    unlock: {realm: 2},
  },
  {
    id: 8,
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
    gates: [{to: 0, x: 1200, y: 1120}],
    stoneDrop: [0, 0],
    unlock: {realm: 2},
  },
  {
    id: 9,
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
    gates: [{to: 0, x: 1500, y: 1000}],
    stoneDrop: [0, 0],
    unlock: {realm: 2},
  },
  {
    id: 10,
    nameKey: "map_cuu_u_ma_tong",
    bg: "assets/maps/map_cuu_u_ma_tong.webp",
    ground: "assets/map/tile_ground_blood.png",
    loadingBg: "assets/maps/loading_10.webp",
    fb: "#3a2a4a",
    dao: "ma",
    monsters: [],
    boss: null,
    npcs: ["truong_lao_ma", "de_tu_ma_1", "de_tu_ma_2", "ma_luyen_su"],
    quests: [],
    gates: [{to: 0, x: 1500, y: 600}],
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
      { x: 300, y: 750, r: 160, monsters: ["ma_binh"] },
      { x: 1250, y: 400, r: 160, monsters: ["oan_linh"] },
      { x: 700, y: 220, r: 150, monsters: ["ma_lang"] },
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
      { x: 300, y: 620, r: 150, monsters: ["ngoc_tho"] },
      { x: 900, y: 950, r: 160, monsters: ["thien_hac"] },
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
      { x: 1250, y: 700, r: 160, monsters: ["thien_hac"] },
      { x: 350, y: 850, r: 150, monsters: ["ngoc_tho"] },
      { x: 800, y: 300, r: 150, monsters: ["u_hon_lang"] },
    ],
    bossSpawn: { x: 1200, y: 950 },
    npcs: [],
    quests: [],
    gates: [{to: 12, x: 80, y: 540}],
    stoneDrop: [30, 60],
    unlock: {realm: 4},
    expMult: 2,
  },
];

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
  thao_linh_chi: { kind: "herb", nameKey: "it_thao_linh_chi", descKey: "it_thao_linh_chi_desc",
    price: 80, sell: 40, icon: "🌿" },
  that_diep_chi: { kind: "herb", nameKey: "it_that_diep_chi", descKey: "it_that_diep_chi_desc",
    price: 600, sell: 300, icon: "🌿" },
  huyen_thiet: { kind: "ore", nameKey: "it_huyen_thiet", descKey: "it_huyen_thiet_desc",
    price: 800, sell: 400, icon: "⛏️" },
  truc_co_thao: { kind: "herb", nameKey: "it_truc_co_thao", descKey: "it_truc_co_thao_desc",
    price: 250, sell: 125, icon: "🌿" },
  dia_linh_qua: { kind: "herb", nameKey: "it_dia_linh_qua", descKey: "it_dia_linh_qua_desc",
    price: 600, sell: 300, icon: "🍈" },
  pill_truccodan: {
    kind: "pill", nameKey: "it_pill_truccodan", descKey: "it_pill_truccodan_desc",
    price: 2000, sell: 600,
  },
  pill_taycotdan: {
    kind: "pill", nameKey: "it_pill_taycotdan", descKey: "it_pill_taycotdan_desc",
    taycot: 1, /* uống: +1 cấp Căn Cốt vĩnh viễn (xử lý ở doBagUse) */
    price: 1500, sell: 450, icon: "🟡",
  },
  /* --- Nguyên liệu --- */
  taycothao: {
    kind: "material", nameKey: "it_taycothao", descKey: "it_taycothao_desc",
    price: 150, sell: 45,
  },
  /* Nguyên liệu Huyết Ma Vực / Thái Hư Tiên Cảnh */
  huyet_tinh: {
    kind: "material", nameKey: "it_huyet_tinh", descKey: "it_huyet_tinh_desc",
    price: 300, sell: 90,
  },
  oan_hon_thach: {
    kind: "material", nameKey: "it_oan_hon_thach", descKey: "it_oan_hon_thach_desc",
    price: 300, sell: 90,
  },
  tien_thao: {
    kind: "material", nameKey: "it_tien_thao", descKey: "it_tien_thao_desc",
    price: 350, sell: 100,
  },
  yaodan1: {
    kind: "yaodan", nameKey: "it_yaodan1", descKey: "it_yaodan1_desc",
    price: 500, sell: 150,
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
  },
  yaodan3: {
    kind: "yaodan", nameKey: "it_yaodan3", descKey: "it_yaodan3_desc",
    price: 3000, sell: 1000, icon: "\U0001f7e3", ydTier: 3,
  },
  yaodan4: {
    kind: "yaodan", nameKey: "it_yaodan4", descKey: "it_yaodan4_desc",
    price: 6000, sell: 2000, icon: "\U0001f7e3", ydTier: 4,
  },
  yaodan5: {
    kind: "yaodan", nameKey: "it_yaodan5", descKey: "it_yaodan5_desc",
    price: 12000, sell: 4000, icon: "\U0001f7e3", ydTier: 5,
  },
  yaodan1_hoa: {
    kind: "yaodan", nameKey: "it_yaodan1_hoa", descKey: "it_yaodan1_hoa_desc",
    price: 750, sell: 250, icon: "\U0001f7e3", ydTier: 1, ydElem: "hoa",
  },
  yaodan1_loi: {
    kind: "yaodan", nameKey: "it_yaodan1_loi", descKey: "it_yaodan1_loi_desc",
    price: 750, sell: 250, icon: "\U0001f7e3", ydTier: 1, ydElem: "loi",
  },
  yaodan1_bang: {
    kind: "yaodan", nameKey: "it_yaodan1_bang", descKey: "it_yaodan1_bang_desc",
    price: 750, sell: 250, icon: "\U0001f7e3", ydTier: 1, ydElem: "bang",
  },
  yaodan1_phong: {
    kind: "yaodan", nameKey: "it_yaodan1_phong", descKey: "it_yaodan1_phong_desc",
    price: 750, sell: 250, icon: "\U0001f7e3", ydTier: 1, ydElem: "phong",
  },
  yaodan1_tho: {
    kind: "yaodan", nameKey: "it_yaodan1_tho", descKey: "it_yaodan1_tho_desc",
    price: 750, sell: 250, icon: "\U0001f7e3", ydTier: 1, ydElem: "tho",
  },
  yaodan2_hoa: {
    kind: "yaodan", nameKey: "it_yaodan2_hoa", descKey: "it_yaodan2_hoa_desc",
    price: 2250, sell: 750, icon: "\U0001f7e3", ydTier: 2, ydElem: "hoa",
  },
  yaodan2_loi: {
    kind: "yaodan", nameKey: "it_yaodan2_loi", descKey: "it_yaodan2_loi_desc",
    price: 2250, sell: 750, icon: "\U0001f7e3", ydTier: 2, ydElem: "loi",
  },
  yaodan2_bang: {
    kind: "yaodan", nameKey: "it_yaodan2_bang", descKey: "it_yaodan2_bang_desc",
    price: 2250, sell: 750, icon: "\U0001f7e3", ydTier: 2, ydElem: "bang",
  },
  yaodan2_phong: {
    kind: "yaodan", nameKey: "it_yaodan2_phong", descKey: "it_yaodan2_phong_desc",
    price: 2250, sell: 750, icon: "\U0001f7e3", ydTier: 2, ydElem: "phong",
  },
  yaodan2_tho: {
    kind: "yaodan", nameKey: "it_yaodan2_tho", descKey: "it_yaodan2_tho_desc",
    price: 2250, sell: 750, icon: "\U0001f7e3", ydTier: 2, ydElem: "tho",
  },
  yaodan3_hoa: {
    kind: "yaodan", nameKey: "it_yaodan3_hoa", descKey: "it_yaodan3_hoa_desc",
    price: 4500, sell: 1500, icon: "\U0001f7e3", ydTier: 3, ydElem: "hoa",
  },
  yaodan3_loi: {
    kind: "yaodan", nameKey: "it_yaodan3_loi", descKey: "it_yaodan3_loi_desc",
    price: 4500, sell: 1500, icon: "\U0001f7e3", ydTier: 3, ydElem: "loi",
  },
  yaodan3_bang: {
    kind: "yaodan", nameKey: "it_yaodan3_bang", descKey: "it_yaodan3_bang_desc",
    price: 4500, sell: 1500, icon: "\U0001f7e3", ydTier: 3, ydElem: "bang",
  },
  yaodan3_phong: {
    kind: "yaodan", nameKey: "it_yaodan3_phong", descKey: "it_yaodan3_phong_desc",
    price: 4500, sell: 1500, icon: "\U0001f7e3", ydTier: 3, ydElem: "phong",
  },
  yaodan3_tho: {
    kind: "yaodan", nameKey: "it_yaodan3_tho", descKey: "it_yaodan3_tho_desc",
    price: 4500, sell: 1500, icon: "\U0001f7e3", ydTier: 3, ydElem: "tho",
  },
  yaodan4_hoa: {
    kind: "yaodan", nameKey: "it_yaodan4_hoa", descKey: "it_yaodan4_hoa_desc",
    price: 9000, sell: 3000, icon: "\U0001f7e3", ydTier: 4, ydElem: "hoa",
  },
  yaodan4_loi: {
    kind: "yaodan", nameKey: "it_yaodan4_loi", descKey: "it_yaodan4_loi_desc",
    price: 9000, sell: 3000, icon: "\U0001f7e3", ydTier: 4, ydElem: "loi",
  },
  yaodan4_bang: {
    kind: "yaodan", nameKey: "it_yaodan4_bang", descKey: "it_yaodan4_bang_desc",
    price: 9000, sell: 3000, icon: "\U0001f7e3", ydTier: 4, ydElem: "bang",
  },
  yaodan4_phong: {
    kind: "yaodan", nameKey: "it_yaodan4_phong", descKey: "it_yaodan4_phong_desc",
    price: 9000, sell: 3000, icon: "\U0001f7e3", ydTier: 4, ydElem: "phong",
  },
  yaodan4_tho: {
    kind: "yaodan", nameKey: "it_yaodan4_tho", descKey: "it_yaodan4_tho_desc",
    price: 9000, sell: 3000, icon: "\U0001f7e3", ydTier: 4, ydElem: "tho",
  },
  yaodan5_hoa: {
    kind: "yaodan", nameKey: "it_yaodan5_hoa", descKey: "it_yaodan5_hoa_desc",
    price: 18000, sell: 6000, icon: "\U0001f7e3", ydTier: 5, ydElem: "hoa",
  },
  yaodan5_loi: {
    kind: "yaodan", nameKey: "it_yaodan5_loi", descKey: "it_yaodan5_loi_desc",
    price: 18000, sell: 6000, icon: "\U0001f7e3", ydTier: 5, ydElem: "loi",
  },
  yaodan5_bang: {
    kind: "yaodan", nameKey: "it_yaodan5_bang", descKey: "it_yaodan5_bang_desc",
    price: 18000, sell: 6000, icon: "\U0001f7e3", ydTier: 5, ydElem: "bang",
  },
  yaodan5_phong: {
    kind: "yaodan", nameKey: "it_yaodan5_phong", descKey: "it_yaodan5_phong_desc",
    price: 18000, sell: 6000, icon: "\U0001f7e3", ydTier: 5, ydElem: "phong",
  },
  yaodan5_tho: {
    kind: "yaodan", nameKey: "it_yaodan5_tho", descKey: "it_yaodan5_tho_desc",
    price: 18000, sell: 6000, icon: "\U0001f7e3", ydTier: 5, ydElem: "tho",
  },
  khaiphongphu: {
    kind: "material", nameKey: "it_khaiphongphu", descKey: "it_khaiphongphu_desc",
    price: 300, sell: 90,
  },
  /* --- Trang bị tier 0 (Phàm phẩm) --- */
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
  },
  manual_duoc_2: {
    kind: "manual", tier: 1, passive: "duoc_tam", learnCost: 800, realm: 1,
    exclusive: true,
    nameKey: "it_manual_duoc_2", descKey: "it_manual_duoc_2_desc",
    price: 2000, sell: 300,
  },
  manual_duoc_3: {
    kind: "manual", tier: 2, passive: "hoi_xuan", learnCost: 1500, realm: 1,
    exclusive: true,
    nameKey: "it_manual_duoc_3", descKey: "it_manual_duoc_3_desc",
    price: 4000, sell: 1500,
  },
  /* --- Bí tịch độc quyền Ngự Thú Tông --- */
  manual_thu_1: {
    kind: "manual", tier: 1, skill: "thu_vuong_trao", learnCost: 800, realm: 1,
    exclusive: true,
    nameKey: "it_manual_thu_1", descKey: "it_manual_thu_1_desc",
    price: 2000, sell: 300,
  },
  manual_thu_2: {
    kind: "manual", tier: 1, passive: "ngu_thu_tam", learnCost: 800, realm: 1,
    exclusive: true,
    nameKey: "it_manual_thu_2", descKey: "it_manual_thu_2_desc",
    price: 2000, sell: 300,
  },
  manual_thu_3: {
    kind: "manual", tier: 2, passive: "linh_thu_khe", learnCost: 1500, realm: 1,
    exclusive: true,
    nameKey: "it_manual_thu_3", descKey: "it_manual_thu_3_desc",
    price: 4000, sell: 1500,
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
  an_sy: { nameKey: "npc_an_sy", mapId: 1, x: 1150, y: 380, kind: "greet", img: "assets/sprs/npc_tam_tien.png", wander: 70 },
  co_hon: { nameKey: "npc_co_hon", mapId: 11, x: 800, y: 600, kind: "greet", img: null, wander: 160 },
  dai_phu: { nameKey: "npc_dai_phu", mapId: 0, x: 200, y: 240, kind: "quest", img: "assets/sprs/sprs_npc_dai_phu.webp" },
  dan_su: { nameKey: "npc_dan_su", mapId: 8, x: 800, y: 760, kind: "shop", stock: ["dan_hx_tieu", "dan_hx_trung", "dan_hx_dai", "dan_hl_tieu", "dan_hl_trung", "duong_than_dan", "ttd_ha", "ttd_trung", "ttd_thuong", "ttd_cuc", "ttd_tien", "dtd_ha", "dtd_trung", "dtd_thuong", "dtd_cuc", "dtd_tien", "ho_mach_dan"], img: "assets/sprs/npc_tam_tien.png" },
  de_tu_duoc_1: { nameKey: "npc_de_tu_duoc_1", mapId: 8, x: 620, y: 520, kind: "greet", img: "assets/sprs/npc_su_gia.png", wander: 90 },
  de_tu_duoc_2: { nameKey: "npc_de_tu_duoc_2", mapId: 8, x: 980, y: 520, kind: "greet", img: "assets/sprs/npc_su_gia.png", wander: 90 },
  de_tu_kiem_1: { nameKey: "npc_de_tu_kiem_1", mapId: 5, x: 620, y: 520, kind: "greet", img: "assets/sprs/npc_su_gia.png", wander: 90 },
  de_tu_kiem_2: { nameKey: "npc_de_tu_kiem_2", mapId: 5, x: 980, y: 520, kind: "greet", img: "assets/sprs/npc_su_gia.png", wander: 90 },
  de_tu_ma_1: { nameKey: "npc_de_tu_ma_1", mapId: 10, x: 620, y: 520, kind: "greet", img: "assets/sprs/npc_su_gia.png", wander: 90 },
  de_tu_ma_2: { nameKey: "npc_de_tu_ma_2", mapId: 10, x: 980, y: 520, kind: "greet", img: "assets/sprs/npc_su_gia.png", wander: 90 },
  de_tu_phap_1: { nameKey: "npc_de_tu_phap_1", mapId: 6, x: 620, y: 520, kind: "greet", img: "assets/sprs/npc_su_gia.png", wander: 90 },
  de_tu_phap_2: { nameKey: "npc_de_tu_phap_2", mapId: 6, x: 980, y: 520, kind: "greet", img: "assets/sprs/npc_su_gia.png", wander: 90 },
  de_tu_the_1: { nameKey: "npc_de_tu_the_1", mapId: 7, x: 620, y: 520, kind: "greet", img: "assets/sprs/npc_su_gia.png", wander: 90 },
  de_tu_the_2: { nameKey: "npc_de_tu_the_2", mapId: 7, x: 980, y: 520, kind: "greet", img: "assets/sprs/npc_su_gia.png", wander: 90 },
  de_tu_thu_1: { nameKey: "npc_de_tu_thu_1", mapId: 9, x: 620, y: 520, kind: "greet", img: "assets/sprs/npc_su_gia.png", wander: 90 },
  de_tu_thu_2: { nameKey: "npc_de_tu_thu_2", mapId: 9, x: 980, y: 520, kind: "greet", img: "assets/sprs/npc_su_gia.png", wander: 90 },
  huyet_ma_tu: { nameKey: "npc_huyet_ma_tu", mapId: 11, x: 700, y: 500, kind: "quest", img: "assets/sprs/npc_su_gia_ma.png" },
  lao_dan_duong: { nameKey: "npc_lao_dan_duong", mapId: 0, x: 700, y: 100, kind: "dungeon_guide", img: "assets/sprs/npc_lao_dan_duong.png" },
  thu_thap_nhan: { nameKey: "npc_thu_thap_nhan", mapId: 0, x: 780, y: 300, kind: "tower_guide", img: "assets/sprs/npc_truong_tran.png" },
  lao_nong_dan: { nameKey: "npc_lao_nong_dan", mapId: 3, x: 400, y: 300, kind: "farm", stock: ["hat_linh_chi", "hat_truc_co_thao", "hat_dia_linh_qua"], img: "assets/sprs/npc_truong_lao_linh_dien.png" },
  lao_ren: { nameKey: "npc_lao_ren", mapId: 0, x: 150, y: 450, kind: "forge", stock: ["wpn_phan", "arm_phan", "acc_phan", "wpn_linh", "arm_linh", "acc_linh"], img: "assets/sprs/npc_lao_ren.png" },
  ma_luyen_su: { nameKey: "npc_ma_luyen_su", mapId: 10, x: 800, y: 760, kind: "forge", stock: ["wpn_phan", "arm_phan", "acc_phan", "wpn_linh", "arm_linh", "acc_linh"], img: "assets/sprs/npc_lao_ren.png" },
  ma_thuong_nhan: { nameKey: "npc_ma_thuong_nhan", mapId: 11, x: 1100, y: 800, kind: "shop", stock: ["pill_hx", "pill_hl", "dan_hx_tieu", "dan_hl_tieu", "ho_the_phu"], img: "assets/sprs/npc_thuong_nhan.png" },
  minh_chu: { nameKey: "npc_minh_chu", mapId: 0, x: 480, y: 200, kind: "alliance", unlock: {realm: 2}, img: "assets/sprs/npc_minh_chu.png" },
  phu_su: { nameKey: "npc_phu_su", mapId: 6, x: 800, y: 760, kind: "shop", stock: ["ho_the_phu", "dan_hl_tieu", "dan_hl_trung", "thanh_tam_qua", "duong_than_dan"], img: "assets/sprs/npc_thuong_nhan.png" },
  quan_mo: { nameKey: "npc_quan_mo", mapId: 4, x: 350, y: 350, kind: "shop", stock: ["pill_hx", "pill_hl", "dan_hx_tieu", "dan_hl_tieu", "ho_the_phu"], img: "assets/sprs/npc_lao_ren.png" },
  ren_su_kiem: { nameKey: "npc_ren_su_kiem", mapId: 5, x: 800, y: 760, kind: "forge", stock: ["wpn_phan", "arm_phan", "acc_phan", "wpn_linh", "arm_linh", "acc_linh"], img: "assets/sprs/npc_lao_ren.png" },
  su_gia_duoc: { nameKey: "npc_su_gia_duoc", mapId: 0, x: 300, y: 200, kind: "sect_emissary", sect: "duoc_vuong_tong", img: "assets/sprs/npc_su_gia.png" },
  su_gia_kiem: { nameKey: "npc_su_gia_kiem", mapId: 0, x: 380, y: 120, kind: "sect_emissary", sect: "kiem_tong", img: "assets/sprs/npc_su_gia.png" },
  su_gia_ma: { nameKey: "npc_su_gia_ma", mapId: 0, x: 150, y: 200, kind: "sect_emissary", sect: "cuu_u_ma_tong", img: "assets/sprs/npc_su_gia_ma.png" },
  su_gia_phap: { nameKey: "npc_su_gia_phap", mapId: 0, x: 480, y: 120, kind: "sect_emissary", sect: "thien_phap_tong", img: "assets/sprs/npc_su_gia.png" },
  su_gia_the: { nameKey: "npc_su_gia_the", mapId: 0, x: 580, y: 120, kind: "sect_emissary", sect: "kim_cang_tong", img: "assets/sprs/npc_su_gia.png" },
  su_gia_thu: { nameKey: "npc_su_gia_thu", mapId: 0, x: 660, y: 320, kind: "sect_emissary", sect: "ngu_thu_tong", img: "assets/sprs/npc_su_gia.png" },
  tam_tien_bi_tich: { nameKey: "npc_tam_tien", mapId: 0, x: 680, y: 240, kind: "gacha", img: "assets/sprs/npc_tam_tien.png" },
  tho_san: { nameKey: "npc_tho_san", mapId: 1, x: 500, y: 620, kind: "shop", stock: ["pill_hx", "pill_hl", "dan_hx_tieu", "dan_hl_tieu", "thit_yeu_thu"], img: "assets/sprs/npc_lao_dan_duong.png" },
  thuong_nhan: { nameKey: "npc_thuong_nhan", mapId: 0, x: 700, y: 450, kind: "shop", stock: ["pill_hx", "pill_hl", "dan_hx_tieu", "dan_hl_tieu", "duong_than_dan", "ho_the_phu", "manual_kiem_1", "manual_phap_1", "manual_the_1", "trung_pham", "hat_linh_chi", "hat_truc_co_thao", "the_doi_ten", "the_doi_gioi_tinh", "ttd_ha", "dtd_ha", "ho_mach_dan", "dan_tho_tieu", "dan_dien_tho", "dan_truong_sinh"], img: "assets/sprs/npc_thuong_nhan.png" },
  thuong_nhan_du_hanh: { nameKey: "npc_thuong_nhan_du_hanh", mapId: 0, x: 640, y: 140, kind: "market", img: "assets/sprs/npc_thuong_nhan.png" },
  thuong_nhan_mo: { nameKey: "npc_thuong_nhan_mo", mapId: 4, x: 1250, y: 850, kind: "shop", stock: ["dan_hx_trung", "dan_hl_trung", "duong_than_dan", "thanh_tam_qua"], img: "assets/sprs/npc_thuong_nhan.png" },
  tien_ong: { nameKey: "npc_tien_ong", mapId: 12, x: 800, y: 400, kind: "shop", shopTitle: "shop_tien_ong", stock: ["tien_thao", "dan_hx_trung", "dan_hl_trung", "duong_than_dan", "thanh_tam_qua", "trung_linh"], img: "assets/sprs/npc_tam_tien.png", wander: 60 },
  tieu_nhi: { nameKey: "npc_tieu_nhi", mapId: 0, x: 280, y: 120, kind: "inn", img: "assets/sprs/npc_tieu_nhi.png" },
  truong_lao: { nameKey: "npc_truong_lao", mapId: 0, x: 420, y: 240, kind: "sect", img: "assets/sprs/npc_truong_tran.png" },
  truong_lao_duoc: { nameKey: "npc_truong_lao_duoc", mapId: 8, x: 800, y: 280, kind: "sect", sect: "duoc_vuong_tong", img: "assets/sprs/npc_truong_tran.png" },
  truong_lao_kiem: { nameKey: "npc_truong_lao_kiem", mapId: 5, x: 800, y: 280, kind: "sect", sect: "kiem_tong", img: "assets/sprs/npc_truong_tran.png" },
  truong_lao_ma: { nameKey: "npc_truong_lao_ma", mapId: 10, x: 800, y: 280, kind: "sect", sect: "cuu_u_ma_tong", img: "assets/sprs/npc_truong_tran.png" },
  truong_lao_phap: { nameKey: "npc_truong_lao_phap", mapId: 6, x: 800, y: 280, kind: "sect", sect: "thien_phap_tong", img: "assets/sprs/npc_truong_tran.png" },
  truong_lao_the: { nameKey: "npc_truong_lao_the", mapId: 7, x: 800, y: 280, kind: "sect", sect: "kim_cang_tong", img: "assets/sprs/npc_truong_tran.png" },
  truong_lao_thu: { nameKey: "npc_truong_lao_thu", mapId: 9, x: 800, y: 280, kind: "sect", sect: "ngu_thu_tong", img: "assets/sprs/npc_truong_tran.png" },
  truong_tran: { nameKey: "npc_truong_tran", mapId: 0, x: 480, y: 380, kind: "guide", img: "assets/sprs/npc_truong_tran.png" },
  tuan_thu_phan_da: { nameKey: "npc_tuan_thu_phan_da", mapId: 9, x: 800, y: 760, kind: "pet", unlock: {realm: 2}, img: "assets/sprs/npc_tuan_thu_su.png" },
  tuan_thu_su: { nameKey: "npc_tuan_thu_su", mapId: 0, x: 250, y: 520, kind: "pet", unlock: {realm: 2}, img: "assets/sprs/npc_tuan_thu_su.png" },
  van_tien_cac: { nameKey: "npc_van_tien_cac", mapId: 0, x: 600, y: 240, kind: "shop", img: "assets/sprs/npc_thuong_nhan.png" },
  vo_tang: { nameKey: "npc_vo_tang", mapId: 7, x: 800, y: 760, kind: "shop", stock: ["kim_cang_dan", "dan_hx_trung", "dan_hx_dai", "ho_the_phu"], img: "assets/sprs/npc_lao_dan_duong.png" },
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
    npc: "dai_phu",
    need: { type: "talk" },
    reward: { stones: 50, exp: 40 },
  },
  {
    id: "q_story_02", nameKey: "q_story_02", descKey: "q_story_02_desc",
    npc: "dai_phu", req: "q_story_10", autoAccept: true,
    need: { type: "item", item: "taycothao", count: 3 },
    reward: { stones: 150, exp: 120 },
  },
  {
    id: "q_story_03", nameKey: "q_story_03", descKey: "q_story_03_desc",
    npc: "dai_phu", req: "q_story_02", autoAccept: true,
    need: { type: "talk" },
    reward: { stones: 50, exp: 100, items: [{ id: "pill_taycotdan", qty: 1 }] },
  },
  {
    id: "q_story_04", nameKey: "q_story_04", descKey: "q_story_04_desc",
    npc: "dai_phu", req: "q_story_01", autoAccept: true,
    need: { type: "kill", monster: "da_tru", count: 5 },
    reward: { stones: 120, exp: 150, items: [{ id: "dan_hx_tieu", qty: 2 }] },
  },
  {
    id: "q_story_05", nameKey: "q_story_05", descKey: "q_story_05_desc",
    npc: "dai_phu", req: "q_story_04", autoAccept: true,
    need: { type: "kill", monster: "son_ke", count: 8 },
    reward: { stones: 150, exp: 220, items: [{ id: "pill_hl", qty: 2 }] },
  },
  {
    id: "q_story_06", nameKey: "q_story_06", descKey: "q_story_06_desc",
    npc: "truong_tran", req: "q_story_05", autoAccept: true,
    need: { type: "kill", monster: "phong_lang", count: 10 },
    reward: { stones: 200, exp: 350, items: [{ id: "dan_hx_tieu", qty: 2 }] },
  },
  {
    id: "q_story_07", nameKey: "q_story_07", descKey: "q_story_07_desc",
    npc: "truong_tran", req: "q_story_06", autoAccept: true,
    need: { type: "kill", monster: "hu_thi", count: 10 },
    reward: { stones: 250, exp: 450, items: [{ id: "dan_hl_tieu", qty: 2 }] },
  },
  {
    id: "q_story_08", nameKey: "q_story_08", descKey: "q_story_08_desc",
    npc: "dai_phu", req: "q_story_07", autoAccept: true,
    need: { type: "kill", monster: "u_hon", count: 12 },
    reward: { stones: 300, exp: 600, items: [{ id: "dan_hx_trung", qty: 2 }] },
  },
  {
    id: "q_story_09", nameKey: "q_story_09", descKey: "q_story_09_desc",
    npc: "dai_phu", req: "q_story_08", autoAccept: true,
    need: { type: "kill", monster: "thi_ma", count: 12 },
    reward: { stones: 400, exp: 800, items: [{ id: "dan_hl_trung", qty: 2 }] },
  },
  {
    id: "q_story_10", nameKey: "q_story_10", descKey: "q_story_10_desc",
    npc: "truong_tran", req: "q_story_09", autoAccept: true,
    need: { type: "kill", monster: "da_tru_vuong", count: 1 },
    reward: {
      stones: 800, exp: 1200,
      items: [{ id: "wpn_linh", qty: 1, locked: true }],
    },
  },
  {
    id: "q_story_11", nameKey: "q_story_11", descKey: "q_story_11_desc",
    npc: "dai_phu", req: "q_story_03", autoAccept: true,
    need: { type: "joinsect" },
    reward: { stones: 500, exp: 800 },
  },
  {
    id: "q_pet_intro", nameKey: "q_pet_intro", descKey: "q_pet_intro_desc",
    npc: "tuan_thu_su",
    need: { type: "talk" },
    reward: { stones: 0, exp: 100, items: [{ id: "trung_pham", qty: 1 }] },
  },
  /* ---- Nhiệm vụ ma đạo ở Huyết Ma Vực ---- */
  {
    id: "q_ma_kill10", nameKey: "q_ma_kill10", descKey: "q_ma_kill10_desc",
    npc: "huyet_ma_tu",
    need: { type: "kill", monster: "ma_lang", count: 10 },
    reward: { stones: 400, exp: 300, items: [{ id: "huyet_tinh", qty: 3 }] },
  },
  {
    id: "q_ma_boss", nameKey: "q_ma_boss", descKey: "q_ma_boss_desc",
    npc: "huyet_ma_tu",
    req: "q_ma_kill10",
    need: { type: "kill", monster: "huyet_ma_vuong", count: 1 },
    reward: {
      stones: 1200, exp: 800,
      items: [{ id: "manual_ma_1", qty: 1, locked: true }],
    },
  },
];

/* Node.js export (cho smoke test) */

/* ---- Pháp khí (thiếu = skill tương ứng chỉ 50% damage) ---- */
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
const SECT_QUESTS = [{"id": "sq_kiem_01", "sect": "kiem_tong", "rank": "ngoai_mon", "nameKey": "sq_kiem_01", "descKey": "sq_kiem_01_desc", "npc": "su_gia_kiem", "req": null, "need": {"type": "talk"}, "reward": {"stones": 50, "exp": 60, "contrib": 10}, "target": {"kind": "npc", "id": "su_gia_kiem"}}, {"id": "sq_kiem_02", "sect": "kiem_tong", "rank": "ngoai_mon", "nameKey": "sq_kiem_02", "descKey": "sq_kiem_02_desc", "npc": "su_gia_kiem", "req": "sq_kiem_01", "need": {"type": "kill", "monster": "da_tru", "count": 10}, "reward": {"stones": 100, "exp": 150, "contrib": 20, "items": [{"id": "pill_hx", "qty": 2}]}, "target": {"kind": "map", "map": 0}}, {"id": "sq_kiem_03", "sect": "kiem_tong", "rank": "ngoai_mon", "nameKey": "sq_kiem_03", "descKey": "sq_kiem_03_desc", "npc": "su_gia_kiem", "req": "sq_kiem_02", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_kiem_03", "hp": 400, "atk": 30, "def": 10}}, "reward": {"stones": 200, "exp": 300, "contrib": 50}, "target": {"kind": "npc", "id": "truong_lao_kiem"}, "minRealm": [1, 5], "eventKey": "sq_event_kiem_03", "fx": "#9fd8ff", "promote": "noi_mon"}, {"id": "sq_kiem_04", "sect": "kiem_tong", "rank": "noi_mon", "nameKey": "sq_kiem_04", "descKey": "sq_kiem_04_desc", "npc": "truong_lao_kiem", "req": "sq_kiem_03", "need": {"type": "kill", "monster": "phong_lang", "count": 15}, "reward": {"stones": 150, "exp": 250, "contrib": 30}, "target": {"kind": "map", "map": 1}}, {"id": "sq_kiem_05", "sect": "kiem_tong", "rank": "noi_mon", "nameKey": "sq_kiem_05", "descKey": "sq_kiem_05_desc", "npc": "truong_lao_kiem", "req": "sq_kiem_04", "need": {"type": "killboss", "monster": "lang_vuong", "count": 1}, "reward": {"stones": 300, "exp": 400, "contrib": 50, "items": [{"id": "dan_hx_tieu", "qty": 2}]}, "target": {"kind": "map", "map": 1}}, {"id": "sq_kiem_06", "sect": "kiem_tong", "rank": "noi_mon", "nameKey": "sq_kiem_06", "descKey": "sq_kiem_06_desc", "npc": "truong_lao_kiem", "req": "sq_kiem_05", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_kiem_06", "hp": 1000, "atk": 55, "def": 20}}, "reward": {"stones": 500, "exp": 800, "contrib": 100, "items": [{"id": "truc_co_thao", "qty": 3}]}, "target": {"kind": "npc", "id": "truong_lao_kiem"}, "minRealm": [1, 12], "eventKey": "sq_event_kiem_06", "fx": "#9fd8ff", "promote": "ho_phap", "gatesBreakthrough": 2}, {"id": "sq_kiem_07", "sect": "kiem_tong", "rank": "ho_phap", "nameKey": "sq_kiem_07", "descKey": "sq_kiem_07_desc", "npc": "truong_lao_kiem", "req": "sq_kiem_06", "need": {"type": "kill", "monster": "u_hon", "count": 20}, "reward": {"stones": 400, "exp": 700, "contrib": 60}, "target": {"kind": "map", "map": 2}}, {"id": "sq_kiem_08", "sect": "kiem_tong", "rank": "ho_phap", "nameKey": "sq_kiem_08", "descKey": "sq_kiem_08_desc", "npc": "truong_lao_kiem", "req": "sq_kiem_07", "need": {"type": "killboss", "monster": "cot_tuong", "count": 1}, "reward": {"stones": 600, "exp": 1000, "contrib": 100, "items": [{"id": "dan_hx_trung", "qty": 2}]}, "target": {"kind": "map", "map": 2}}, {"id": "sq_kiem_09", "sect": "kiem_tong", "rank": "ho_phap", "nameKey": "sq_kiem_09", "descKey": "sq_kiem_09_desc", "npc": "truong_lao_kiem", "req": "sq_kiem_08", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_kiem_09", "hp": 2500, "atk": 95, "def": 35}}, "reward": {"stones": 1000, "exp": 1500, "contrib": 200}, "target": {"kind": "npc", "id": "truong_lao_kiem"}, "minRealm": [2, 0], "eventKey": "sq_event_kiem_09", "fx": "#9fd8ff", "promote": "truong_lao", "gatesBreakthrough": 3}, {"id": "sq_kiem_10", "sect": "kiem_tong", "rank": "truong_lao", "nameKey": "sq_kiem_10", "descKey": "sq_kiem_10_desc", "npc": "truong_lao_kiem", "req": "sq_kiem_09", "need": {"type": "kill", "monster": "ma_lang", "count": 30}, "reward": {"stones": 800, "exp": 1300, "contrib": 120}, "target": {"kind": "map", "map": 4}}, {"id": "sq_kiem_11", "sect": "kiem_tong", "rank": "truong_lao", "nameKey": "sq_kiem_11", "descKey": "sq_kiem_11_desc", "npc": "truong_lao_kiem", "req": "sq_kiem_10", "need": {"type": "killboss", "monster": "huyet_ma_vuong", "count": 1}, "reward": {"stones": 1200, "exp": 2000, "contrib": 200, "items": [{"id": "dan_hx_dai", "qty": 2}]}, "target": {"kind": "map", "map": 4}}, {"id": "sq_kiem_12", "sect": "kiem_tong", "rank": "truong_lao", "nameKey": "sq_kiem_12", "descKey": "sq_kiem_12_desc", "npc": "truong_lao_kiem", "req": "sq_kiem_11", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_kiem_12", "hp": 6000, "atk": 160, "def": 60}}, "reward": {"stones": 3000, "exp": 5000, "contrib": 500, "items": [{"id": "manual_kiemdan_kiem", "qty": 1}]}, "target": {"kind": "npc", "id": "truong_lao_kiem"}, "minRealm": [3, 0], "eventKey": "sq_event_kiem_12", "fx": "#9fd8ff", "gatesBreakthrough": 4, "grandTitle": "sq_title_kiem_grand"}, {"id": "sq_thien_phap_01", "sect": "thien_phap_tong", "rank": "ngoai_mon", "nameKey": "sq_thien_phap_01", "descKey": "sq_thien_phap_01_desc", "npc": "su_gia_phap", "req": null, "need": {"type": "talk"}, "reward": {"stones": 50, "exp": 60, "contrib": 10}, "target": {"kind": "npc", "id": "su_gia_phap"}}, {"id": "sq_thien_phap_02", "sect": "thien_phap_tong", "rank": "ngoai_mon", "nameKey": "sq_thien_phap_02", "descKey": "sq_thien_phap_02_desc", "npc": "su_gia_phap", "req": "sq_thien_phap_01", "need": {"type": "kill", "monster": "son_ke", "count": 10}, "reward": {"stones": 100, "exp": 150, "contrib": 20, "items": [{"id": "pill_hl", "qty": 2}]}, "target": {"kind": "map", "map": 0}}, {"id": "sq_thien_phap_03", "sect": "thien_phap_tong", "rank": "ngoai_mon", "nameKey": "sq_thien_phap_03", "descKey": "sq_thien_phap_03_desc", "npc": "su_gia_phap", "req": "sq_thien_phap_02", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_thien_phap_03", "hp": 400, "atk": 30, "def": 10}}, "reward": {"stones": 200, "exp": 300, "contrib": 50}, "target": {"kind": "npc", "id": "truong_lao_phap"}, "minRealm": [1, 5], "eventKey": "sq_event_thien_phap_03", "fx": "#c9a7ff", "promote": "noi_mon"}, {"id": "sq_thien_phap_04", "sect": "thien_phap_tong", "rank": "noi_mon", "nameKey": "sq_thien_phap_04", "descKey": "sq_thien_phap_04_desc", "npc": "truong_lao_phap", "req": "sq_thien_phap_03", "need": {"type": "kill", "monster": "hu_thi", "count": 15}, "reward": {"stones": 150, "exp": 250, "contrib": 30}, "target": {"kind": "map", "map": 1}}, {"id": "sq_thien_phap_05", "sect": "thien_phap_tong", "rank": "noi_mon", "nameKey": "sq_thien_phap_05", "descKey": "sq_thien_phap_05_desc", "npc": "truong_lao_phap", "req": "sq_thien_phap_04", "need": {"type": "killboss", "monster": "lang_vuong", "count": 1}, "reward": {"stones": 300, "exp": 400, "contrib": 50, "items": [{"id": "dan_hl_tieu", "qty": 2}]}, "target": {"kind": "map", "map": 1}}, {"id": "sq_thien_phap_06", "sect": "thien_phap_tong", "rank": "noi_mon", "nameKey": "sq_thien_phap_06", "descKey": "sq_thien_phap_06_desc", "npc": "truong_lao_phap", "req": "sq_thien_phap_05", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_thien_phap_06", "hp": 1000, "atk": 55, "def": 20}}, "reward": {"stones": 500, "exp": 800, "contrib": 100, "items": [{"id": "truc_co_thao", "qty": 3}]}, "target": {"kind": "npc", "id": "truong_lao_phap"}, "minRealm": [1, 12], "eventKey": "sq_event_thien_phap_06", "fx": "#c9a7ff", "promote": "ho_phap", "gatesBreakthrough": 2}, {"id": "sq_thien_phap_07", "sect": "thien_phap_tong", "rank": "ho_phap", "nameKey": "sq_thien_phap_07", "descKey": "sq_thien_phap_07_desc", "npc": "truong_lao_phap", "req": "sq_thien_phap_06", "need": {"type": "kill", "monster": "thi_ma", "count": 20}, "reward": {"stones": 400, "exp": 700, "contrib": 60}, "target": {"kind": "map", "map": 2}}, {"id": "sq_thien_phap_08", "sect": "thien_phap_tong", "rank": "ho_phap", "nameKey": "sq_thien_phap_08", "descKey": "sq_thien_phap_08_desc", "npc": "truong_lao_phap", "req": "sq_thien_phap_07", "need": {"type": "killboss", "monster": "cot_tuong", "count": 1}, "reward": {"stones": 600, "exp": 1000, "contrib": 100, "items": [{"id": "dan_hl_trung", "qty": 2}]}, "target": {"kind": "map", "map": 2}}, {"id": "sq_thien_phap_09", "sect": "thien_phap_tong", "rank": "ho_phap", "nameKey": "sq_thien_phap_09", "descKey": "sq_thien_phap_09_desc", "npc": "truong_lao_phap", "req": "sq_thien_phap_08", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_thien_phap_09", "hp": 2500, "atk": 95, "def": 35}}, "reward": {"stones": 1000, "exp": 1500, "contrib": 200}, "target": {"kind": "npc", "id": "truong_lao_phap"}, "minRealm": [2, 0], "eventKey": "sq_event_thien_phap_09", "fx": "#c9a7ff", "promote": "truong_lao", "gatesBreakthrough": 3}, {"id": "sq_thien_phap_10", "sect": "thien_phap_tong", "rank": "truong_lao", "nameKey": "sq_thien_phap_10", "descKey": "sq_thien_phap_10_desc", "npc": "truong_lao_phap", "req": "sq_thien_phap_09", "need": {"type": "kill", "monster": "oan_linh", "count": 30}, "reward": {"stones": 800, "exp": 1300, "contrib": 120}, "target": {"kind": "map", "map": 4}}, {"id": "sq_thien_phap_11", "sect": "thien_phap_tong", "rank": "truong_lao", "nameKey": "sq_thien_phap_11", "descKey": "sq_thien_phap_11_desc", "npc": "truong_lao_phap", "req": "sq_thien_phap_10", "need": {"type": "killboss", "monster": "huyet_ma_vuong", "count": 1}, "reward": {"stones": 1200, "exp": 2000, "contrib": 200, "items": [{"id": "dan_hl_dai", "qty": 2}]}, "target": {"kind": "map", "map": 4}}, {"id": "sq_thien_phap_12", "sect": "thien_phap_tong", "rank": "truong_lao", "nameKey": "sq_thien_phap_12", "descKey": "sq_thien_phap_12_desc", "npc": "truong_lao_phap", "req": "sq_thien_phap_11", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_thien_phap_12", "hp": 6000, "atk": 160, "def": 60}}, "reward": {"stones": 3000, "exp": 5000, "contrib": 500, "items": [{"id": "manual_kimdan_phap", "qty": 1}]}, "target": {"kind": "npc", "id": "truong_lao_phap"}, "minRealm": [3, 0], "eventKey": "sq_event_thien_phap_12", "fx": "#c9a7ff", "gatesBreakthrough": 4, "grandTitle": "sq_title_thien_phap_grand"}, {"id": "sq_kim_cang_01", "sect": "kim_cang_tong", "rank": "ngoai_mon", "nameKey": "sq_kim_cang_01", "descKey": "sq_kim_cang_01_desc", "npc": "su_gia_the", "req": null, "need": {"type": "talk"}, "reward": {"stones": 50, "exp": 60, "contrib": 10}, "target": {"kind": "npc", "id": "su_gia_the"}}, {"id": "sq_kim_cang_02", "sect": "kim_cang_tong", "rank": "ngoai_mon", "nameKey": "sq_kim_cang_02", "descKey": "sq_kim_cang_02_desc", "npc": "su_gia_the", "req": "sq_kim_cang_01", "need": {"type": "kill", "monster": "da_tru", "count": 10}, "reward": {"stones": 100, "exp": 150, "contrib": 20, "items": [{"id": "pill_hx", "qty": 2}]}, "target": {"kind": "map", "map": 0}}, {"id": "sq_kim_cang_03", "sect": "kim_cang_tong", "rank": "ngoai_mon", "nameKey": "sq_kim_cang_03", "descKey": "sq_kim_cang_03_desc", "npc": "su_gia_the", "req": "sq_kim_cang_02", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_kim_cang_03", "hp": 400, "atk": 30, "def": 10}}, "reward": {"stones": 200, "exp": 300, "contrib": 50}, "target": {"kind": "npc", "id": "truong_lao_the"}, "minRealm": [1, 5], "eventKey": "sq_event_kim_cang_03", "fx": "#ffd76a", "promote": "noi_mon"}, {"id": "sq_kim_cang_04", "sect": "kim_cang_tong", "rank": "noi_mon", "nameKey": "sq_kim_cang_04", "descKey": "sq_kim_cang_04_desc", "npc": "truong_lao_the", "req": "sq_kim_cang_03", "need": {"type": "kill", "monster": "phong_lang", "count": 15}, "reward": {"stones": 150, "exp": 250, "contrib": 30}, "target": {"kind": "map", "map": 1}}, {"id": "sq_kim_cang_05", "sect": "kim_cang_tong", "rank": "noi_mon", "nameKey": "sq_kim_cang_05", "descKey": "sq_kim_cang_05_desc", "npc": "truong_lao_the", "req": "sq_kim_cang_04", "need": {"type": "killboss", "monster": "lang_vuong", "count": 1}, "reward": {"stones": 300, "exp": 400, "contrib": 50, "items": [{"id": "kim_cang_dan", "qty": 2}]}, "target": {"kind": "map", "map": 1}}, {"id": "sq_kim_cang_06", "sect": "kim_cang_tong", "rank": "noi_mon", "nameKey": "sq_kim_cang_06", "descKey": "sq_kim_cang_06_desc", "npc": "truong_lao_the", "req": "sq_kim_cang_05", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_kim_cang_06", "hp": 1000, "atk": 55, "def": 20}}, "reward": {"stones": 500, "exp": 800, "contrib": 100, "items": [{"id": "truc_co_thao", "qty": 3}]}, "target": {"kind": "npc", "id": "truong_lao_the"}, "minRealm": [1, 12], "eventKey": "sq_event_kim_cang_06", "fx": "#ffd76a", "promote": "ho_phap", "gatesBreakthrough": 2}, {"id": "sq_kim_cang_07", "sect": "kim_cang_tong", "rank": "ho_phap", "nameKey": "sq_kim_cang_07", "descKey": "sq_kim_cang_07_desc", "npc": "truong_lao_the", "req": "sq_kim_cang_06", "need": {"type": "kill", "monster": "u_hon", "count": 20}, "reward": {"stones": 400, "exp": 700, "contrib": 60}, "target": {"kind": "map", "map": 2}}, {"id": "sq_kim_cang_08", "sect": "kim_cang_tong", "rank": "ho_phap", "nameKey": "sq_kim_cang_08", "descKey": "sq_kim_cang_08_desc", "npc": "truong_lao_the", "req": "sq_kim_cang_07", "need": {"type": "killboss", "monster": "cot_tuong", "count": 1}, "reward": {"stones": 600, "exp": 1000, "contrib": 100, "items": [{"id": "dan_hx_trung", "qty": 2}]}, "target": {"kind": "map", "map": 2}}, {"id": "sq_kim_cang_09", "sect": "kim_cang_tong", "rank": "ho_phap", "nameKey": "sq_kim_cang_09", "descKey": "sq_kim_cang_09_desc", "npc": "truong_lao_the", "req": "sq_kim_cang_08", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_kim_cang_09", "hp": 2500, "atk": 95, "def": 35}}, "reward": {"stones": 1000, "exp": 1500, "contrib": 200}, "target": {"kind": "npc", "id": "truong_lao_the"}, "minRealm": [2, 0], "eventKey": "sq_event_kim_cang_09", "fx": "#ffd76a", "promote": "truong_lao", "gatesBreakthrough": 3}, {"id": "sq_kim_cang_10", "sect": "kim_cang_tong", "rank": "truong_lao", "nameKey": "sq_kim_cang_10", "descKey": "sq_kim_cang_10_desc", "npc": "truong_lao_the", "req": "sq_kim_cang_09", "need": {"type": "kill", "monster": "ma_binh", "count": 30}, "reward": {"stones": 800, "exp": 1300, "contrib": 120}, "target": {"kind": "map", "map": 4}}, {"id": "sq_kim_cang_11", "sect": "kim_cang_tong", "rank": "truong_lao", "nameKey": "sq_kim_cang_11", "descKey": "sq_kim_cang_11_desc", "npc": "truong_lao_the", "req": "sq_kim_cang_10", "need": {"type": "killboss", "monster": "huyet_ma_vuong", "count": 1}, "reward": {"stones": 1200, "exp": 2000, "contrib": 200, "items": [{"id": "dan_hx_dai", "qty": 2}]}, "target": {"kind": "map", "map": 4}}, {"id": "sq_kim_cang_12", "sect": "kim_cang_tong", "rank": "truong_lao", "nameKey": "sq_kim_cang_12", "descKey": "sq_kim_cang_12_desc", "npc": "truong_lao_the", "req": "sq_kim_cang_11", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_kim_cang_12", "hp": 6000, "atk": 160, "def": 60}}, "reward": {"stones": 3000, "exp": 5000, "contrib": 500, "items": [{"id": "manual_kimdan_the", "qty": 1}]}, "target": {"kind": "npc", "id": "truong_lao_the"}, "minRealm": [3, 0], "eventKey": "sq_event_kim_cang_12", "fx": "#ffd76a", "gatesBreakthrough": 4, "grandTitle": "sq_title_kim_cang_grand"}, {"id": "sq_duoc_vuong_01", "sect": "duoc_vuong_tong", "rank": "ngoai_mon", "nameKey": "sq_duoc_vuong_01", "descKey": "sq_duoc_vuong_01_desc", "npc": "su_gia_duoc", "req": null, "need": {"type": "talk"}, "reward": {"stones": 50, "exp": 60, "contrib": 10}, "target": {"kind": "npc", "id": "su_gia_duoc"}}, {"id": "sq_duoc_vuong_02", "sect": "duoc_vuong_tong", "rank": "ngoai_mon", "nameKey": "sq_duoc_vuong_02", "descKey": "sq_duoc_vuong_02_desc", "npc": "su_gia_duoc", "req": "sq_duoc_vuong_01", "need": {"type": "item", "item": "taycothao", "count": 5}, "reward": {"stones": 100, "exp": 150, "contrib": 20, "items": [{"id": "dan_hx_tieu", "qty": 2}]}, "target": {"kind": "npc", "id": "su_gia_duoc"}}, {"id": "sq_duoc_vuong_03", "sect": "duoc_vuong_tong", "rank": "ngoai_mon", "nameKey": "sq_duoc_vuong_03", "descKey": "sq_duoc_vuong_03_desc", "npc": "su_gia_duoc", "req": "sq_duoc_vuong_02", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_duoc_vuong_03", "hp": 400, "atk": 30, "def": 10}}, "reward": {"stones": 200, "exp": 300, "contrib": 50}, "target": {"kind": "npc", "id": "truong_lao_duoc"}, "minRealm": [1, 5], "eventKey": "sq_event_duoc_vuong_03", "fx": "#7fe08a", "promote": "noi_mon"}, {"id": "sq_duoc_vuong_04", "sect": "duoc_vuong_tong", "rank": "noi_mon", "nameKey": "sq_duoc_vuong_04", "descKey": "sq_duoc_vuong_04_desc", "npc": "truong_lao_duoc", "req": "sq_duoc_vuong_03", "need": {"type": "item", "item": "truc_co_thao", "count": 8}, "reward": {"stones": 150, "exp": 250, "contrib": 30}, "target": {"kind": "npc", "id": "truong_lao_duoc"}}, {"id": "sq_duoc_vuong_05", "sect": "duoc_vuong_tong", "rank": "noi_mon", "nameKey": "sq_duoc_vuong_05", "descKey": "sq_duoc_vuong_05_desc", "npc": "truong_lao_duoc", "req": "sq_duoc_vuong_04", "need": {"type": "kill", "monster": "son_ke", "count": 15}, "reward": {"stones": 300, "exp": 400, "contrib": 50, "items": [{"id": "dan_hl_tieu", "qty": 2}]}, "target": {"kind": "map", "map": 0}}, {"id": "sq_duoc_vuong_06", "sect": "duoc_vuong_tong", "rank": "noi_mon", "nameKey": "sq_duoc_vuong_06", "descKey": "sq_duoc_vuong_06_desc", "npc": "truong_lao_duoc", "req": "sq_duoc_vuong_05", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_duoc_vuong_06", "hp": 1000, "atk": 55, "def": 20}}, "reward": {"stones": 500, "exp": 800, "contrib": 100, "items": [{"id": "pill_truccodan", "qty": 1}]}, "target": {"kind": "npc", "id": "truong_lao_duoc"}, "minRealm": [1, 12], "eventKey": "sq_event_duoc_vuong_06", "fx": "#7fe08a", "promote": "ho_phap", "gatesBreakthrough": 2}, {"id": "sq_duoc_vuong_07", "sect": "duoc_vuong_tong", "rank": "ho_phap", "nameKey": "sq_duoc_vuong_07", "descKey": "sq_duoc_vuong_07_desc", "npc": "truong_lao_duoc", "req": "sq_duoc_vuong_06", "need": {"type": "item", "item": "dia_linh_qua", "count": 8}, "reward": {"stones": 400, "exp": 700, "contrib": 60}, "target": {"kind": "npc", "id": "truong_lao_duoc"}}, {"id": "sq_duoc_vuong_08", "sect": "duoc_vuong_tong", "rank": "ho_phap", "nameKey": "sq_duoc_vuong_08", "descKey": "sq_duoc_vuong_08_desc", "npc": "truong_lao_duoc", "req": "sq_duoc_vuong_07", "need": {"type": "killboss", "monster": "da_tru_vuong", "count": 1}, "reward": {"stones": 600, "exp": 1000, "contrib": 100, "items": [{"id": "dan_hx_trung", "qty": 2}]}, "target": {"kind": "map", "map": 0}}, {"id": "sq_duoc_vuong_09", "sect": "duoc_vuong_tong", "rank": "ho_phap", "nameKey": "sq_duoc_vuong_09", "descKey": "sq_duoc_vuong_09_desc", "npc": "truong_lao_duoc", "req": "sq_duoc_vuong_08", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_duoc_vuong_09", "hp": 2500, "atk": 95, "def": 35}}, "reward": {"stones": 1000, "exp": 1500, "contrib": 200}, "target": {"kind": "npc", "id": "truong_lao_duoc"}, "minRealm": [2, 0], "eventKey": "sq_event_duoc_vuong_09", "fx": "#7fe08a", "promote": "truong_lao", "gatesBreakthrough": 3}, {"id": "sq_duoc_vuong_10", "sect": "duoc_vuong_tong", "rank": "truong_lao", "nameKey": "sq_duoc_vuong_10", "descKey": "sq_duoc_vuong_10_desc", "npc": "truong_lao_duoc", "req": "sq_duoc_vuong_09", "need": {"type": "item", "item": "linh_chi_ngan_nam", "count": 3}, "reward": {"stones": 800, "exp": 1300, "contrib": 120}, "target": {"kind": "npc", "id": "truong_lao_duoc"}}, {"id": "sq_duoc_vuong_11", "sect": "duoc_vuong_tong", "rank": "truong_lao", "nameKey": "sq_duoc_vuong_11", "descKey": "sq_duoc_vuong_11_desc", "npc": "truong_lao_duoc", "req": "sq_duoc_vuong_10", "need": {"type": "killboss", "monster": "cot_tuong", "count": 1}, "reward": {"stones": 1200, "exp": 2000, "contrib": 200, "items": [{"id": "dan_hl_dai", "qty": 2}]}, "target": {"kind": "map", "map": 2}}, {"id": "sq_duoc_vuong_12", "sect": "duoc_vuong_tong", "rank": "truong_lao", "nameKey": "sq_duoc_vuong_12", "descKey": "sq_duoc_vuong_12_desc", "npc": "truong_lao_duoc", "req": "sq_duoc_vuong_11", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_duoc_vuong_12", "hp": 6000, "atk": 160, "def": 60}}, "reward": {"stones": 3000, "exp": 5000, "contrib": 500, "items": [{"id": "yaodan1", "qty": 1}]}, "target": {"kind": "npc", "id": "truong_lao_duoc"}, "minRealm": [3, 0], "eventKey": "sq_event_duoc_vuong_12", "fx": "#7fe08a", "gatesBreakthrough": 4, "grandTitle": "sq_title_duoc_vuong_grand"}, {"id": "sq_ngu_thu_01", "sect": "ngu_thu_tong", "rank": "ngoai_mon", "nameKey": "sq_ngu_thu_01", "descKey": "sq_ngu_thu_01_desc", "npc": "su_gia_thu", "req": null, "need": {"type": "talk"}, "reward": {"stones": 50, "exp": 60, "contrib": 10}, "target": {"kind": "npc", "id": "su_gia_thu"}}, {"id": "sq_ngu_thu_02", "sect": "ngu_thu_tong", "rank": "ngoai_mon", "nameKey": "sq_ngu_thu_02", "descKey": "sq_ngu_thu_02_desc", "npc": "su_gia_thu", "req": "sq_ngu_thu_01", "need": {"type": "kill", "monster": "phong_lang", "count": 10}, "reward": {"stones": 100, "exp": 150, "contrib": 20, "items": [{"id": "thit_yeu_thu", "qty": 3}]}, "target": {"kind": "map", "map": 1}}, {"id": "sq_ngu_thu_03", "sect": "ngu_thu_tong", "rank": "ngoai_mon", "nameKey": "sq_ngu_thu_03", "descKey": "sq_ngu_thu_03_desc", "npc": "su_gia_thu", "req": "sq_ngu_thu_02", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_ngu_thu_03", "hp": 400, "atk": 30, "def": 10}}, "reward": {"stones": 200, "exp": 300, "contrib": 50}, "target": {"kind": "npc", "id": "truong_lao_thu"}, "minRealm": [1, 5], "eventKey": "sq_event_ngu_thu_03", "fx": "#ff9d5c", "promote": "noi_mon"}, {"id": "sq_ngu_thu_04", "sect": "ngu_thu_tong", "rank": "noi_mon", "nameKey": "sq_ngu_thu_04", "descKey": "sq_ngu_thu_04_desc", "npc": "truong_lao_thu", "req": "sq_ngu_thu_03", "need": {"type": "item", "item": "trung_pham", "count": 2}, "reward": {"stones": 150, "exp": 250, "contrib": 30}, "target": {"kind": "npc", "id": "truong_lao_thu"}}, {"id": "sq_ngu_thu_05", "sect": "ngu_thu_tong", "rank": "noi_mon", "nameKey": "sq_ngu_thu_05", "descKey": "sq_ngu_thu_05_desc", "npc": "truong_lao_thu", "req": "sq_ngu_thu_04", "need": {"type": "kill", "monster": "hu_thi", "count": 15}, "reward": {"stones": 300, "exp": 400, "contrib": 50, "items": [{"id": "dan_hx_tieu", "qty": 2}]}, "target": {"kind": "map", "map": 1}}, {"id": "sq_ngu_thu_06", "sect": "ngu_thu_tong", "rank": "noi_mon", "nameKey": "sq_ngu_thu_06", "descKey": "sq_ngu_thu_06_desc", "npc": "truong_lao_thu", "req": "sq_ngu_thu_05", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_ngu_thu_06", "hp": 1000, "atk": 55, "def": 20}}, "reward": {"stones": 500, "exp": 800, "contrib": 100, "items": [{"id": "trung_linh", "qty": 1}]}, "target": {"kind": "npc", "id": "truong_lao_thu"}, "minRealm": [1, 12], "eventKey": "sq_event_ngu_thu_06", "fx": "#ff9d5c", "promote": "ho_phap", "gatesBreakthrough": 2}, {"id": "sq_ngu_thu_07", "sect": "ngu_thu_tong", "rank": "ho_phap", "nameKey": "sq_ngu_thu_07", "descKey": "sq_ngu_thu_07_desc", "npc": "truong_lao_thu", "req": "sq_ngu_thu_06", "need": {"type": "kill", "monster": "thi_ma", "count": 20}, "reward": {"stones": 400, "exp": 700, "contrib": 60}, "target": {"kind": "map", "map": 2}}, {"id": "sq_ngu_thu_08", "sect": "ngu_thu_tong", "rank": "ho_phap", "nameKey": "sq_ngu_thu_08", "descKey": "sq_ngu_thu_08_desc", "npc": "truong_lao_thu", "req": "sq_ngu_thu_07", "need": {"type": "killboss", "monster": "lang_vuong", "count": 1}, "reward": {"stones": 600, "exp": 1000, "contrib": 100, "items": [{"id": "trung_linh", "qty": 1}]}, "target": {"kind": "map", "map": 1}}, {"id": "sq_ngu_thu_09", "sect": "ngu_thu_tong", "rank": "ho_phap", "nameKey": "sq_ngu_thu_09", "descKey": "sq_ngu_thu_09_desc", "npc": "truong_lao_thu", "req": "sq_ngu_thu_08", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_ngu_thu_09", "hp": 2500, "atk": 95, "def": 35}}, "reward": {"stones": 1000, "exp": 1500, "contrib": 200}, "target": {"kind": "npc", "id": "truong_lao_thu"}, "minRealm": [2, 0], "eventKey": "sq_event_ngu_thu_09", "fx": "#ff9d5c", "promote": "truong_lao", "gatesBreakthrough": 3}, {"id": "sq_ngu_thu_10", "sect": "ngu_thu_tong", "rank": "truong_lao", "nameKey": "sq_ngu_thu_10", "descKey": "sq_ngu_thu_10_desc", "npc": "truong_lao_thu", "req": "sq_ngu_thu_09", "need": {"type": "item", "item": "trung_linh", "count": 2}, "reward": {"stones": 800, "exp": 1300, "contrib": 120}, "target": {"kind": "npc", "id": "truong_lao_thu"}}, {"id": "sq_ngu_thu_11", "sect": "ngu_thu_tong", "rank": "truong_lao", "nameKey": "sq_ngu_thu_11", "descKey": "sq_ngu_thu_11_desc", "npc": "truong_lao_thu", "req": "sq_ngu_thu_10", "need": {"type": "killboss", "monster": "thien_tuong", "count": 1}, "reward": {"stones": 1200, "exp": 2000, "contrib": 200, "items": [{"id": "trung_huyen", "qty": 1}]}, "target": {"kind": "map", "map": 5}}, {"id": "sq_ngu_thu_12", "sect": "ngu_thu_tong", "rank": "truong_lao", "nameKey": "sq_ngu_thu_12", "descKey": "sq_ngu_thu_12_desc", "npc": "truong_lao_thu", "req": "sq_ngu_thu_11", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_ngu_thu_12", "hp": 6000, "atk": 160, "def": 60}}, "reward": {"stones": 3000, "exp": 5000, "contrib": 500, "items": [{"id": "trung_dia", "qty": 1}]}, "target": {"kind": "npc", "id": "truong_lao_thu"}, "minRealm": [3, 0], "eventKey": "sq_event_ngu_thu_12", "fx": "#ff9d5c", "gatesBreakthrough": 4, "grandTitle": "sq_title_ngu_thu_grand"}, {"id": "sq_cuu_u_ma_01", "sect": "cuu_u_ma_tong", "rank": "ngoai_mon", "nameKey": "sq_cuu_u_ma_01", "descKey": "sq_cuu_u_ma_01_desc", "npc": "su_gia_ma", "req": null, "need": {"type": "talk"}, "reward": {"stones": 50, "exp": 60, "contrib": 10}, "target": {"kind": "npc", "id": "su_gia_ma"}}, {"id": "sq_cuu_u_ma_02", "sect": "cuu_u_ma_tong", "rank": "ngoai_mon", "nameKey": "sq_cuu_u_ma_02", "descKey": "sq_cuu_u_ma_02_desc", "npc": "su_gia_ma", "req": "sq_cuu_u_ma_01", "need": {"type": "kill", "monster": "ngoc_tho", "count": 10}, "reward": {"stones": 100, "exp": 150, "contrib": 20, "items": [{"id": "thit_yeu_thu", "qty": 3}]}, "target": {"kind": "map", "map": 5}}, {"id": "sq_cuu_u_ma_03", "sect": "cuu_u_ma_tong", "rank": "ngoai_mon", "nameKey": "sq_cuu_u_ma_03", "descKey": "sq_cuu_u_ma_03_desc", "npc": "su_gia_ma", "req": "sq_cuu_u_ma_02", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_cuu_u_ma_03", "hp": 400, "atk": 30, "def": 10}}, "reward": {"stones": 200, "exp": 300, "contrib": 50}, "target": {"kind": "npc", "id": "truong_lao_ma"}, "minRealm": [1, 5], "eventKey": "sq_event_cuu_u_ma_03", "fx": "#ff3d5a", "promote": "noi_mon"}, {"id": "sq_cuu_u_ma_04", "sect": "cuu_u_ma_tong", "rank": "noi_mon", "nameKey": "sq_cuu_u_ma_04", "descKey": "sq_cuu_u_ma_04_desc", "npc": "truong_lao_ma", "req": "sq_cuu_u_ma_03", "need": {"type": "stones", "count": 500}, "reward": {"stones": 0, "exp": 250, "contrib": 40}, "target": {"kind": "npc", "id": "truong_lao_ma"}}, {"id": "sq_cuu_u_ma_05", "sect": "cuu_u_ma_tong", "rank": "noi_mon", "nameKey": "sq_cuu_u_ma_05", "descKey": "sq_cuu_u_ma_05_desc", "npc": "truong_lao_ma", "req": "sq_cuu_u_ma_04", "need": {"type": "kill", "monster": "thien_hac", "count": 15}, "reward": {"stones": 300, "exp": 400, "contrib": 50, "items": [{"id": "dan_hx_tieu", "qty": 2}]}, "target": {"kind": "map", "map": 5}}, {"id": "sq_cuu_u_ma_06", "sect": "cuu_u_ma_tong", "rank": "noi_mon", "nameKey": "sq_cuu_u_ma_06", "descKey": "sq_cuu_u_ma_06_desc", "npc": "truong_lao_ma", "req": "sq_cuu_u_ma_05", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_cuu_u_ma_06", "hp": 1000, "atk": 55, "def": 20}}, "reward": {"stones": 500, "exp": 800, "contrib": 100, "items": [{"id": "truc_co_thao", "qty": 3}]}, "target": {"kind": "npc", "id": "truong_lao_ma"}, "minRealm": [1, 12], "eventKey": "sq_event_cuu_u_ma_06", "fx": "#ff3d5a", "promote": "ho_phap", "gatesBreakthrough": 2}, {"id": "sq_cuu_u_ma_07", "sect": "cuu_u_ma_tong", "rank": "ho_phap", "nameKey": "sq_cuu_u_ma_07", "descKey": "sq_cuu_u_ma_07_desc", "npc": "truong_lao_ma", "req": "sq_cuu_u_ma_06", "need": {"type": "kill", "monster": "oan_linh", "count": 20}, "reward": {"stones": 400, "exp": 700, "contrib": 60}, "target": {"kind": "map", "map": 4}}, {"id": "sq_cuu_u_ma_08", "sect": "cuu_u_ma_tong", "rank": "ho_phap", "nameKey": "sq_cuu_u_ma_08", "descKey": "sq_cuu_u_ma_08_desc", "npc": "truong_lao_ma", "req": "sq_cuu_u_ma_07", "need": {"type": "killboss", "monster": "thien_tuong", "count": 1}, "reward": {"stones": 600, "exp": 1000, "contrib": 100, "items": [{"id": "dan_hx_trung", "qty": 2}]}, "target": {"kind": "map", "map": 5}}, {"id": "sq_cuu_u_ma_09", "sect": "cuu_u_ma_tong", "rank": "ho_phap", "nameKey": "sq_cuu_u_ma_09", "descKey": "sq_cuu_u_ma_09_desc", "npc": "truong_lao_ma", "req": "sq_cuu_u_ma_08", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_cuu_u_ma_09", "hp": 2500, "atk": 95, "def": 35}}, "reward": {"stones": 1000, "exp": 1500, "contrib": 200}, "target": {"kind": "npc", "id": "truong_lao_ma"}, "minRealm": [2, 0], "eventKey": "sq_event_cuu_u_ma_09", "fx": "#ff3d5a", "promote": "truong_lao", "gatesBreakthrough": 3}, {"id": "sq_cuu_u_ma_10", "sect": "cuu_u_ma_tong", "rank": "truong_lao", "nameKey": "sq_cuu_u_ma_10", "descKey": "sq_cuu_u_ma_10_desc", "npc": "truong_lao_ma", "req": "sq_cuu_u_ma_09", "need": {"type": "kill", "monster": "ma_lang", "count": 30}, "reward": {"stones": 800, "exp": 1300, "contrib": 120}, "target": {"kind": "map", "map": 4}}, {"id": "sq_cuu_u_ma_11", "sect": "cuu_u_ma_tong", "rank": "truong_lao", "nameKey": "sq_cuu_u_ma_11", "descKey": "sq_cuu_u_ma_11_desc", "npc": "truong_lao_ma", "req": "sq_cuu_u_ma_10", "need": {"type": "killboss", "monster": "huyet_ma_vuong", "count": 1}, "reward": {"stones": 1200, "exp": 2000, "contrib": 200, "items": [{"id": "dan_hx_dai", "qty": 2}]}, "target": {"kind": "map", "map": 4}}, {"id": "sq_cuu_u_ma_12", "sect": "cuu_u_ma_tong", "rank": "truong_lao", "nameKey": "sq_cuu_u_ma_12", "descKey": "sq_cuu_u_ma_12_desc", "npc": "truong_lao_ma", "req": "sq_cuu_u_ma_11", "need": {"type": "trial", "boss": {"nameKey": "sq_trial_cuu_u_ma_12", "hp": 6000, "atk": 160, "def": 60}}, "reward": {"stones": 3000, "exp": 5000, "contrib": 500, "items": [{"id": "yaodan1", "qty": 1}]}, "target": {"kind": "npc", "id": "truong_lao_ma"}, "minRealm": [3, 0], "eventKey": "sq_event_cuu_u_ma_12", "fx": "#ff3d5a", "gatesBreakthrough": 4, "grandTitle": "sq_title_cuu_u_ma_grand"}];
const SECT_QUEST_CUNGCO = [{"id": "sq_kiem_cungco", "sect": "kiem_tong", "special": "cung_co", "rank": "noi_mon", "nameKey": "sq_kiem_cungco", "descKey": "sq_kiem_cungco_desc", "npc": "truong_lao_kiem", "need": {"type": "item", "item": "truc_co_thao", "count": 5}, "reward": {"exp": 300, "contrib": 30, "btBonus": 0.1}, "target": {"kind": "npc", "id": "truong_lao_kiem"}}, {"id": "sq_thien_phap_cungco", "sect": "thien_phap_tong", "special": "cung_co", "rank": "noi_mon", "nameKey": "sq_thien_phap_cungco", "descKey": "sq_thien_phap_cungco_desc", "npc": "truong_lao_phap", "need": {"type": "item", "item": "truc_co_thao", "count": 5}, "reward": {"exp": 300, "contrib": 30, "btBonus": 0.1}, "target": {"kind": "npc", "id": "truong_lao_phap"}}, {"id": "sq_kim_cang_cungco", "sect": "kim_cang_tong", "special": "cung_co", "rank": "noi_mon", "nameKey": "sq_kim_cang_cungco", "descKey": "sq_kim_cang_cungco_desc", "npc": "truong_lao_the", "need": {"type": "item", "item": "truc_co_thao", "count": 5}, "reward": {"exp": 300, "contrib": 30, "btBonus": 0.1}, "target": {"kind": "npc", "id": "truong_lao_the"}}, {"id": "sq_duoc_vuong_cungco", "sect": "duoc_vuong_tong", "special": "cung_co", "rank": "noi_mon", "nameKey": "sq_duoc_vuong_cungco", "descKey": "sq_duoc_vuong_cungco_desc", "npc": "truong_lao_duoc", "need": {"type": "item", "item": "truc_co_thao", "count": 5}, "reward": {"exp": 300, "contrib": 30, "btBonus": 0.1}, "target": {"kind": "npc", "id": "truong_lao_duoc"}}, {"id": "sq_ngu_thu_cungco", "sect": "ngu_thu_tong", "special": "cung_co", "rank": "noi_mon", "nameKey": "sq_ngu_thu_cungco", "descKey": "sq_ngu_thu_cungco_desc", "npc": "truong_lao_thu", "need": {"type": "item", "item": "truc_co_thao", "count": 5}, "reward": {"exp": 300, "contrib": 30, "btBonus": 0.1}, "target": {"kind": "npc", "id": "truong_lao_thu"}}, {"id": "sq_cuu_u_ma_cungco", "sect": "cuu_u_ma_tong", "special": "cung_co", "rank": "noi_mon", "nameKey": "sq_cuu_u_ma_cungco", "descKey": "sq_cuu_u_ma_cungco_desc", "npc": "truong_lao_ma", "need": {"type": "item", "item": "truc_co_thao", "count": 5}, "reward": {"exp": 300, "contrib": 30, "btBonus": 0.1}, "target": {"kind": "npc", "id": "truong_lao_ma"}}];
const SECT_QUEST_DAILY = [{"id": "sqd_kiem_kill", "sect": "kiem_tong", "tname": "sq_daily_kill", "tdesc": "sq_daily_kill_desc", "need": {"type": "kill", "count": 15}, "contrib": 15}, {"id": "sqd_kiem_donate", "sect": "kiem_tong", "tname": "sq_daily_donate", "tdesc": "sq_daily_donate_desc", "need": {"type": "stones", "count": 500}, "contrib": 10}, {"id": "sqd_kiem_boss", "sect": "kiem_tong", "tname": "sq_daily_boss", "tdesc": "sq_daily_boss_desc", "need": {"type": "killboss", "count": 1}, "contrib": 30}, {"id": "sqd_thien_phap_kill", "sect": "thien_phap_tong", "tname": "sq_daily_kill", "tdesc": "sq_daily_kill_desc", "need": {"type": "kill", "count": 15}, "contrib": 15}, {"id": "sqd_thien_phap_donate", "sect": "thien_phap_tong", "tname": "sq_daily_donate", "tdesc": "sq_daily_donate_desc", "need": {"type": "stones", "count": 500}, "contrib": 10}, {"id": "sqd_thien_phap_boss", "sect": "thien_phap_tong", "tname": "sq_daily_boss", "tdesc": "sq_daily_boss_desc", "need": {"type": "killboss", "count": 1}, "contrib": 30}, {"id": "sqd_kim_cang_kill", "sect": "kim_cang_tong", "tname": "sq_daily_kill", "tdesc": "sq_daily_kill_desc", "need": {"type": "kill", "count": 15}, "contrib": 15}, {"id": "sqd_kim_cang_donate", "sect": "kim_cang_tong", "tname": "sq_daily_donate", "tdesc": "sq_daily_donate_desc", "need": {"type": "stones", "count": 500}, "contrib": 10}, {"id": "sqd_kim_cang_boss", "sect": "kim_cang_tong", "tname": "sq_daily_boss", "tdesc": "sq_daily_boss_desc", "need": {"type": "killboss", "count": 1}, "contrib": 30}, {"id": "sqd_duoc_vuong_kill", "sect": "duoc_vuong_tong", "tname": "sq_daily_kill", "tdesc": "sq_daily_kill_desc", "need": {"type": "kill", "count": 15}, "contrib": 15}, {"id": "sqd_duoc_vuong_donate", "sect": "duoc_vuong_tong", "tname": "sq_daily_donate", "tdesc": "sq_daily_donate_desc", "need": {"type": "stones", "count": 500}, "contrib": 10}, {"id": "sqd_duoc_vuong_boss", "sect": "duoc_vuong_tong", "tname": "sq_daily_boss", "tdesc": "sq_daily_boss_desc", "need": {"type": "killboss", "count": 1}, "contrib": 30}, {"id": "sqd_ngu_thu_kill", "sect": "ngu_thu_tong", "tname": "sq_daily_kill", "tdesc": "sq_daily_kill_desc", "need": {"type": "kill", "count": 15}, "contrib": 15}, {"id": "sqd_ngu_thu_donate", "sect": "ngu_thu_tong", "tname": "sq_daily_donate", "tdesc": "sq_daily_donate_desc", "need": {"type": "stones", "count": 500}, "contrib": 10}, {"id": "sqd_ngu_thu_boss", "sect": "ngu_thu_tong", "tname": "sq_daily_boss", "tdesc": "sq_daily_boss_desc", "need": {"type": "killboss", "count": 1}, "contrib": 30}, {"id": "sqd_cuu_u_ma_kill", "sect": "cuu_u_ma_tong", "tname": "sq_daily_kill", "tdesc": "sq_daily_kill_desc", "need": {"type": "kill", "count": 15}, "contrib": 15}, {"id": "sqd_cuu_u_ma_donate", "sect": "cuu_u_ma_tong", "tname": "sq_daily_donate", "tdesc": "sq_daily_donate_desc", "need": {"type": "stones", "count": 500}, "contrib": 10}, {"id": "sqd_cuu_u_ma_boss", "sect": "cuu_u_ma_tong", "tname": "sq_daily_boss", "tdesc": "sq_daily_boss_desc", "need": {"type": "killboss", "count": 1}, "contrib": 30}];
const SECT_QUEST_WEEKLY = [{"id": "sqw_kiem_grand", "sect": "kiem_tong", "tname": "sq_weekly_grand", "tdesc": "sq_weekly_grand_desc", "need": {"type": "kill", "count": 80}, "need2": {"type": "killboss", "count": 3}, "reward": {"contrib": 100, "stones": 500}}, {"id": "sqw_thien_phap_grand", "sect": "thien_phap_tong", "tname": "sq_weekly_grand", "tdesc": "sq_weekly_grand_desc", "need": {"type": "kill", "count": 80}, "need2": {"type": "killboss", "count": 3}, "reward": {"contrib": 100, "stones": 500}}, {"id": "sqw_kim_cang_grand", "sect": "kim_cang_tong", "tname": "sq_weekly_grand", "tdesc": "sq_weekly_grand_desc", "need": {"type": "kill", "count": 80}, "need2": {"type": "killboss", "count": 3}, "reward": {"contrib": 100, "stones": 500}}, {"id": "sqw_duoc_vuong_grand", "sect": "duoc_vuong_tong", "tname": "sq_weekly_grand", "tdesc": "sq_weekly_grand_desc", "need": {"type": "kill", "count": 80}, "need2": {"type": "killboss", "count": 3}, "reward": {"contrib": 100, "stones": 500}}, {"id": "sqw_ngu_thu_grand", "sect": "ngu_thu_tong", "tname": "sq_weekly_grand", "tdesc": "sq_weekly_grand_desc", "need": {"type": "kill", "count": 80}, "need2": {"type": "killboss", "count": 3}, "reward": {"contrib": 100, "stones": 500}}, {"id": "sqw_cuu_u_ma_grand", "sect": "cuu_u_ma_tong", "tname": "sq_weekly_grand", "tdesc": "sq_weekly_grand_desc", "need": {"type": "kill", "count": 80}, "need2": {"type": "killboss", "count": 3}, "reward": {"contrib": 100, "stones": 500}}];
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    ELEMENTS, LINGEN_RATES,
    MONSTERS, MAPS, DUNGEONS, SECRET_REALMS, genRandomDungeon,
    ITEMS, SKILLS, SHOP_STOCK, GIFT_CODES,
    NPCS, QUESTS,
    SECT_QUESTS, SECT_QUEST_CUNGCO, SECT_QUEST_DAILY, SECT_QUEST_WEEKLY,
  };
}
