/* Dữ liệu game: cảnh giới, linh căn, map, quái, vật phẩm, skill, shop, đột phá. */

/* Cảnh giới: index 0..10. kind: 'none' | 'tiers' | 'stages' */
const REALMS = [
  { key: 'r_phamnhan', kind: 'none' },
  { key: 'r_luyenkhi', kind: 'tiers', count: 12 },          // Luyện Khí 12 tầng
  { key: 'r_trucco',   kind: 'stages' },                    // Sơ/Trung/Hậu
  { key: 'r_kimdan',   kind: 'stages' },
  { key: 'r_nguyenanh',kind: 'stages' },
  { key: 'r_hoathan',  kind: 'stages' },
  { key: 'r_phanthan', kind: 'stages' },
  { key: 'r_luyenhu',  kind: 'stages' },
  { key: 'r_hopthe',   kind: 'stages' },
  { key: 'r_daithua',  kind: 'stages' },
  { key: 'r_dokiep',   kind: 'stages' }, // 9 đạo lôi kiếp (v2 mở rộng)
];
const STAGE_KEYS = ['so_ky', 'trung_ky', 'hau_ky'];

/* Linh căn: element -> {fx, skillKey} */
const ELEMENTS = {
  kim:     { nameKey: 'lc_kim',     fx: 'metal',     skillKey: 'skill_kim' },
  moc:     { nameKey: 'lc_moc',     fx: 'wood',      skillKey: 'skill_moc' },
  thuy:    { nameKey: 'lc_thuy',    fx: 'water',     skillKey: 'skill_thuy' },
  hoa:     { nameKey: 'lc_hoa',     fx: 'fire',      skillKey: 'skill_hoa' },
  tho:     { nameKey: 'lc_tho',     fx: 'earth',     skillKey: 'skill_tho' },
  bang:    { nameKey: 'lc_bang',    fx: 'water',     skillKey: 'skill_bang' },
  loi:     { nameKey: 'lc_loi',     fx: 'lightning', skillKey: 'skill_loi' },
  phong:   { nameKey: 'lc_phong',   fx: 'metal',     skillKey: 'skill_phong' },
  hondon:  { nameKey: 'lc_hondon',  fx: 'lightning', skillKey: 'skill_hondon' },
};
/* Tỷ lệ tẩy cốt: ngũ hành 18% mỗi loại, biến dị 3%, hỗn độn 1% */
const LINGEN_RATES = [
  ['kim', 18], ['moc', 18], ['thuy', 18], ['hoa', 18], ['tho', 18],
  ['bang', 3], ['loi', 3], ['phong', 3], ['hondon', 1],
];

/* Quái: power = realm*100 + tier (so sánh chênh lệch) */
const MONSTERS = {
  da_tru:   { nameKey: 'm_dtru',   hp: 40,  atk: 6,  def: 1, exp: 12, power: 100, icon: '🐗' },
  son_ke:   { nameKey: 'm_sonke',  hp: 30,  atk: 5,  def: 0, exp: 10, power: 100, icon: '🐔' },
  da_tru_vuong: { nameKey: 'm_dtruvuong', hp: 220, atk: 14, def: 3, exp: 80, power: 103, icon: '🐗', boss: true,
    drops: [{ id: 'yaodan1', rate: 0.35, min: 1, max: 1 }] },
  phong_lang:{ nameKey: 'm_phonglang', hp: 90,  atk: 12, def: 3, exp: 28, power: 105, icon: '🐺' },
  hu_thi:   { nameKey: 'm_huthi',  hp: 110, atk: 14, def: 4, exp: 34, power: 106, icon: '🧟' },
  lang_vuong:{ nameKey: 'm_langvuong', hp: 480, atk: 26, def: 7, exp: 180, power: 107, icon: '🐺', boss: true,
    drops: [{ id: 'yaodan1', rate: 0.5, min: 1, max: 2 }] },
  u_hon:    { nameKey: 'm_uhon',   hp: 170, atk: 22, def: 6, exp: 55, power: 109, icon: '👻' },
  thi_ma:   { nameKey: 'm_thima',  hp: 210, atk: 26, def: 8, exp: 68, power: 110, icon: '👹' },
  cot_tuong:{ nameKey: 'm_cottuong', hp: 900, atk: 44, def: 12, exp: 350, power: 111, icon: '💀', boss: true,
    drops: [{ id: 'yaodan1', rate: 0.8, min: 1, max: 2 }, { id: 'wpn_bao', rate: 0.15, min: 1, max: 1 }] },
};

/* Map: stoneDrop [min,max] linh thạch mỗi quái; unlock {realm, tier} */
const MAPS = [
  { id: 0, nameKey: 'map1', bg: 'town',
    realm: 1, tierMin: 0, tierMax: 3,
    monsters: ['da_tru', 'son_ke'], boss: 'da_tru_vuong',
    stoneDrop: [1, 3], unlock: null },
  { id: 1, nameKey: 'map2', bg: 'forest',
    realm: 1, tierMin: 4, tierMax: 7,
    monsters: ['phong_lang', 'hu_thi'], boss: 'lang_vuong',
    stoneDrop: [3, 7], unlock: { realm: 1, tier: 4 } },
  { id: 2, nameKey: 'map3', bg: 'valley',
    realm: 1, tierMin: 8, tierMax: 11,
    monsters: ['u_hon', 'thi_ma'], boss: 'cot_tuong',
    stoneDrop: [6, 12], unlock: { realm: 1, tier: 8 } },
];

/* Vật phẩm. kind: pill | material | equip | yaodan */
const ITEMS = {
  // đan dược
  pill_hx:  { kind: 'pill', nameKey: 'pill_hx', descKey: 'pill_hx_desc', price: 20, sell: 8, healHp: 0.5, icon: '🔴' },
  pill_hl:  { kind: 'pill', nameKey: 'pill_hl', descKey: 'pill_hl_desc', price: 20, sell: 8, healMp: 0.5, icon: '🔵' },
  pill_truccodan: { kind: 'pill', nameKey: 'pill_truccodan', descKey: 'pill_truccodan_desc', price: 500, sell: 0, icon: '🟡' },
  // nguyên liệu
  taycothao: { kind: 'material', nameKey: 'item_taycothao', price: 0, sell: 2, icon: '🌿' },
  yaodan1:  { kind: 'yaodan', nameKey: 'yaodan1', price: 0, sell: 50, icon: '🟣' },
  // trang bị: tier 0=Phàm,1=Linh,2=Bảo,3=Tiên,4=Thần; reqRealm
  wpn_phan: { kind: 'equip', slot: 'weapon', tier: 0, reqRealm: 1, nameKey: 'tier_phan', price: 50, sell: 20, atk: 5, icon: '🗡️', iconImg: 'assets/items/sword.png' },
  arm_phan: { kind: 'equip', slot: 'armor',  tier: 0, reqRealm: 1, nameKey: 'tier_phan', price: 40, sell: 16, def: 4, hp: 20, icon: '🥋' },
  acc_phan: { kind: 'equip', slot: 'acc',    tier: 0, reqRealm: 1, nameKey: 'tier_phan', price: 40, sell: 16, atk: 2, def: 2, icon: '📿' },
  wpn_linh: { kind: 'equip', slot: 'weapon', tier: 1, reqRealm: 2, nameKey: 'tier_linh', price: 300, sell: 120, atk: 18, icon: '⚔️' },
  arm_linh: { kind: 'equip', slot: 'armor',  tier: 1, reqRealm: 2, nameKey: 'tier_linh', price: 240, sell: 96, def: 12, hp: 80, icon: '🥋' },
  acc_linh: { kind: 'equip', slot: 'acc',    tier: 1, reqRealm: 2, nameKey: 'tier_linh', price: 240, sell: 96, atk: 7, def: 6, icon: '📿' },
  wpn_bao:  { kind: 'equip', slot: 'weapon', tier: 2, reqRealm: 3, nameKey: 'tier_bao', price: 0, sell: 400, atk: 40, icon: '🗡️', rare: true },
};

/* Skill */
const SKILLS = {
  sword_qi: { nameKey: 'skill1_name', mp: 10, mult: 1.5, fx: 'metal', icon: '⚡' },
  elemental: { mp: 15, mult: 2.0 }, // fx + nameKey lấy theo linh căn
};

/* Shop Vạn Tiên Các: mở ở Luyện Khí tầng 12 */
const SHOP_STOCK = ['pill_hx', 'pill_hl', 'pill_truccodan', 'wpn_phan', 'arm_phan', 'acc_phan'];
const SHOP_UNLOCK = { realm: 1, tier: 11 }; // Luyện Khí tầng 12 (tier index 11)

/* Đột phá: khung chung. materials: [{id, qty}] */
const BREAKTHROUGHS = [
  { fromRealm: 1, fromTier: 11, toRealm: 2, toTier: 0,
    materials: [{ id: 'pill_truccodan', qty: 1 }, { id: 'yaodan1', qty: 1 }],
    rate: 0.90, tribFx: 'lightning' },
  // Khung cho các cảnh giới sau (v2 mở rộng nội dung):
  { fromRealm: 2, fromTier: 2, toRealm: 3, toTier: 0, materials: [], rate: 0.80, tribFx: 'lightning', locked: true },
  { fromRealm: 3, fromTier: 2, toRealm: 4, toTier: 0, materials: [], rate: 0.70, tribFx: 'lightning', locked: true },
];

/* EXP: expMax(tier) cho Luyện Khí; stage dùng chung công thức */
function expMaxFor(realm, tier) {
  if (realm === 0) return 30;
  if (realm === 1) return Math.round(40 * Math.pow(1.5, tier));
  return Math.round(40 * Math.pow(1.5, 11) * Math.pow(1.6, (realm - 2) * 3 + tier));
}
/* Chỉ số cơ bản theo cảnh giới/tầng */
function baseStats(realm, tier) {
  const p = realm * 100 + (realm === 1 ? tier : tier * 4);
  return {
    maxHp: 100 + p * 2,
    maxMp: 50 + p,
    atk: 10 + Math.round(p * 0.35),
    def: 2 + Math.round(p * 0.12),
  };
}
/* powerLevel để so sánh chênh lệch */
function powerLevel(realm, tier) {
  if (realm === 0) return 0;
  if (realm === 1) return 100 + tier;
  return 200 + (realm - 2) * 30 + tier * 10;
}
