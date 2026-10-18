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
 * LINH CĂN — 9 hệ
 * ============================================================ */
const ELEMENTS = {
  kim:    { fx: "gold",      nameKey: "el_kim" },
  moc:    { fx: "wood",      nameKey: "el_moc" },
  thuy:   { fx: "water",     nameKey: "el_thuy" },
  hoa:    { fx: "fire",      nameKey: "el_hoa" },
  tho:    { fx: "earth",     nameKey: "el_tho" },
  bang:   { fx: "ice",       nameKey: "el_bang" },
  loi:    { fx: "thunder",   nameKey: "el_loi" },
  phong:  { fx: "wind",      nameKey: "el_phong" },
  hondon: { fx: "chaos",     nameKey: "el_hondon" },
};
/* Tỉ lệ rút linh căn: 18/18/18/18/18/3/3/3/1 */
const LINGEN_RATES = [
  ["kim", 18], ["moc", 18], ["thuy", 18], ["hoa", 18], ["tho", 18],
  ["bang", 3], ["loi", 3], ["phong", 3], ["hondon", 1],
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
    ],
  },
  son_ke: {
    nameKey: "mon_son_ke", hp: 120, atk: 26, def: 9, exp: 18,
    img: "../assets-ai/quai-son-ke.webp", fb: "#c47b3a", loai: "thu",
    drops: [
      { id: "pill_hx", rate: 0.06, min: 1, max: 1 },
      { id: "taycothao", rate: 0.07, min: 1, max: 1 },
    ],
  },
  da_tru_vuong: {
    nameKey: "mon_da_tru_vuong", hp: 600, atk: 45, def: 15, exp: 150,
    img: null, fb: "#6e4a2f", loai: "thu", boss: true,
    drops: [
      { id: "taycothao", rate: 0.5, min: 1, max: 2 },
      { id: "yaodan1", rate: 0.2, min: 1, max: 1 },
      { id: "wpn_phan", rate: 0.25, min: 1, max: 1 },
    ],
  },
  phong_lang: {
    nameKey: "mon_phong_lang", hp: 150, atk: 34, def: 12, exp: 26,
    img: null, fb: "#7d9aa8", loai: "thu",
    drops: [
      { id: "pill_hx", rate: 0.07, min: 1, max: 2 },
      { id: "taycothao", rate: 0.08, min: 1, max: 1 },
    ],
  },
  hu_thi: {
    nameKey: "mon_hu_thi", hp: 180, atk: 42, def: 14, exp: 32,
    img: null, fb: "#9aa87d", loai: "thu",
    drops: [
      { id: "pill_hx", rate: 0.08, min: 1, max: 2 },
      { id: "yaodan1", rate: 0.05, min: 1, max: 1 },
    ],
  },
  lang_vuong: {
    nameKey: "mon_lang_vuong", hp: 900, atk: 70, def: 22, exp: 220,
    img: null, fb: "#4f6b7d", loai: "thu", boss: true,
    drops: [
      { id: "yaodan1", rate: 0.35, min: 1, max: 1 },
      { id: "taycothao", rate: 0.4, min: 1, max: 2 },
      { id: "wpn_linh", rate: 0.25, min: 1, max: 1 },
    ],
  },
  u_hon: {
    nameKey: "mon_u_hon", hp: 220, atk: 52, def: 17, exp: 40,
    img: null, fb: "#8b7bb8", loai: "ma",
    drops: [
      { id: "pill_hl", rate: 0.08, min: 1, max: 2 },
      { id: "taycothao", rate: 0.09, min: 1, max: 1 },
    ],
  },
  thi_ma: {
    nameKey: "mon_thi_ma", hp: 260, atk: 62, def: 20, exp: 48,
    img: null, fb: "#5d7a5d", loai: "ma",
    drops: [
      { id: "pill_hl", rate: 0.09, min: 1, max: 2 },
      { id: "yaodan1", rate: 0.07, min: 1, max: 1 },
    ],
  },
  cot_tuong: {
    nameKey: "mon_cot_tuong", hp: 1300, atk: 95, def: 28, exp: 320,
    img: null, fb: "#3d4a5d", loai: "ma", boss: true,
    drops: [
      { id: "yaodan1", rate: 0.4, min: 1, max: 2 },
      { id: "taycothao", rate: 0.6, min: 1, max: 2 },
      { id: "arm_linh", rate: 0.25, min: 1, max: 1 },
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
    id: 0, nameKey: "map_thanh_van_tran",
    bg: "../assets-ai/map1-thanh-van-tran.webp", fb: "#b9d3a0",
    monsters: ["da_tru", "son_ke"], boss: "da_tru_vuong",
    npcs: ["dai_phu", "van_tien_cac"],
    gates: [{ to: 1, x: 720, y: 80 }],
    stoneDrop: [2, 5], unlock: null,
  },
  {
    id: 1, nameKey: "map_hac_phong_lam",
    bg: "../assets-ai/map2-hac-phong-lam.webp", fb: "#5f7d5a",
    monsters: ["phong_lang", "hu_thi"], boss: "lang_vuong",
    npcs: [],
    gates: [{ to: 0, x: 80, y: 80 }, { to: 2, x: 720, y: 540 }],
    stoneDrop: [4, 9], unlock: { realm: 1, tier: 3 },
  },
  {
    id: 2, nameKey: "map_u_minh_coc",
    bg: null, fb: "#3a3f5c",
    monsters: ["u_hon", "thi_ma"], boss: "cot_tuong",
    npcs: [],
    gates: [{ to: 1, x: 80, y: 540 }],
    stoneDrop: [7, 14], unlock: { realm: 1, tier: 5 },
  },
];

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
    healHp: 0.3, price: 50, sell: 15,
  },
  pill_hl: {
    kind: "pill", nameKey: "it_pill_hl", descKey: "it_pill_hl_desc",
    healMp: 0.5, price: 80, sell: 24,
  },
  pill_truccodan: {
    kind: "pill", nameKey: "it_pill_truccodan", descKey: "it_pill_truccodan_desc",
    price: 2000, sell: 600,
  },
  /* --- Nguyên liệu --- */
  taycothao: {
    kind: "material", nameKey: "it_taycothao", descKey: "it_taycothao_desc",
    price: 150, sell: 45,
  },
  yaodan1: {
    kind: "yaodan", nameKey: "it_yaodan1", descKey: "it_yaodan1_desc",
    price: 500, sell: 150,
  },
  khaiphongphu: {
    kind: "material", nameKey: "it_khaiphongphu", descKey: "it_khaiphongphu_desc",
    price: 300, sell: 90,
  },
  /* --- Trang bị tier 0 (Phàm phẩm) --- */
  wpn_phan: {
    kind: "equip", nameKey: "it_wpn_phan", slot: "weapon", tier: 0,
    atk: 10, price: 200, sell: 60, reqRealm: null,
  },
  arm_phan: {
    kind: "equip", nameKey: "it_arm_phan", slot: "armor", tier: 0,
    def: 8, hp: 50, price: 180, sell: 54, reqRealm: null,
  },
  acc_phan: {
    kind: "equip", nameKey: "it_acc_phan", slot: "acc", tier: 0,
    atk: 4, def: 4, hp: 30, price: 150, sell: 45, reqRealm: null,
  },
  /* --- Trang bị tier 1 (Linh phẩm) --- */
  wpn_linh: {
    kind: "equip", nameKey: "it_wpn_linh", slot: "weapon", tier: 1,
    atk: 35, price: 1200, sell: 360, reqRealm: { realm: 1, tier: 3 },
  },
  arm_linh: {
    kind: "equip", nameKey: "it_arm_linh", slot: "armor", tier: 1,
    def: 25, hp: 150, price: 1000, sell: 300, reqRealm: { realm: 1, tier: 3 },
  },
  acc_linh: {
    kind: "equip", nameKey: "it_acc_linh", slot: "acc", tier: 1,
    atk: 12, def: 12, hp: 80, price: 800, sell: 240, reqRealm: { realm: 1, tier: 3 },
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
};

/* ============================================================
 * NPC
 * kind: 'quest' → mở hội thoại nhiệm vụ; 'shop' → mở cửa hàng
 * ============================================================ */
const NPCS = {
  dai_phu: {
    nameKey: "npc_dai_phu", mapId: 0, x: 200, y: 240, kind: "quest",
    img: "../assets-ai/npc-dai-phu.webp",
  },
  van_tien_cac: {
    nameKey: "npc_van_tien_cac", mapId: 0, x: 600, y: 240, kind: "shop",
    img: null,
  },
};

/* ============================================================
 * NHIỆM VỤ
 * need: {type:'kill', monster, count} | {type:'item', item, count} |
 *       {type:'talk'}
 * reward: {stones, exp, items:[{id, qty, locked?}]}
 * req: quest id phải hoàn thành trước (chuỗi nhiệm vụ)
 * ============================================================ */
const QUESTS = [
  {
    id: "q_taycot", nameKey: "q_taycot", descKey: "q_taycot_desc",
    npc: "dai_phu",
    need: { type: "item", item: "taycothao", count: 3 },
    reward: { stones: 100, exp: 50, items: [{ id: "pill_hx", qty: 2 }] },
  },
  {
    id: "q_kill5", nameKey: "q_kill5", descKey: "q_kill5_desc",
    npc: "dai_phu",
    need: { type: "kill", monster: "da_tru", count: 5 },
    reward: { stones: 80, exp: 60, items: [{ id: "pill_hx", qty: 2 }] },
  },
  {
    id: "q_boss1", nameKey: "q_boss1", descKey: "q_boss1_desc",
    npc: "dai_phu",
    req: "q_kill5",
    need: { type: "kill", monster: "da_tru_vuong", count: 1 },
    reward: {
      stones: 300, exp: 150,
      items: [{ id: "wpn_linh", qty: 1, locked: true }],
    },
  },
];

/* Node.js export (cho smoke test) */
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    ELEMENTS, LINGEN_RATES,
    MONSTERS, MAPS, DUNGEONS, genRandomDungeon,
    ITEMS, SKILLS, SHOP_STOCK, GIFT_CODES,
    NPCS, QUESTS,
  };
}
