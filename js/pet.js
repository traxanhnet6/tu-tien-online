/* ============================================================
 * js/pet.js — Linh Thú (thuần logic, chạy được trên node)
 * - Trứng (ITEMS kind:"pet_egg"): Phàm/Linh rớt từ quái thường,
 *   Huyền từ boss map/phụ bản thường, Địa từ bí cảnh khó,
 *   Thiên cực hiếm từ kỳ ngộ cực hiếm. Vỏ trứng hiện màu theo phẩm.
 * - Ấp trứng: tốn Linh Thạch ấp ngay, hoặc chờ miễn phí 30 phút.
 * - Linh thú đi theo, cùng đánh quái (sát thương riêng + skill đơn giản
 *   nổ AoE mỗi 12s), có HP riêng; kiệt sức → nghỉ 5 phút.
 * - Cho ăn Linh Thạch để lên cấp (tăng chỉ số). 5 phẩm:
 *   Phàm(trắng) → Linh(xanh) → Huyền(tím) → Địa(cam) → Thiên(đỏ).
 *   Phẩm cao: chỉ số gốc cao, lên cấp nhanh, skill mạnh, hào quang đẹp.
 * - Linh thú tự nhặt đồ rớt quanh chủ nhân (engine: drops tự vào túi,
 *   thú chạy hiệu ứng nhặt).
 * - state.pet = {tier, name, level, exp, hp} | null
 *   state.petRestUntil (timestamp), state.petHatch {eggId, readyAt} | null
 * ============================================================ */

var PET_TIERS = [
  { nameKey: "pet_tier_0", color: "#e8e8e8", statMult: 1.0, lvlSpd: 1.0, skillMult: 1.0 },
  { nameKey: "pet_tier_1", color: "#4da3ff", statMult: 1.5, lvlSpd: 1.2, skillMult: 1.3 },
  { nameKey: "pet_tier_2", color: "#b388ff", statMult: 2.2, lvlSpd: 1.5, skillMult: 1.7 },
  { nameKey: "pet_tier_3", color: "#ff9e40", statMult: 3.2, lvlSpd: 1.8, skillMult: 2.2 },
  { nameKey: "pet_tier_4", color: "#ff5252", statMult: 5.0, lvlSpd: 2.2, skillMult: 3.0 },
];
var PET_EGGS = {
  trung_pham:  { tier: 0, hatchCost: 500,   waitMin: 30 },
  trung_linh:  { tier: 1, hatchCost: 1500,  waitMin: 30 },
  trung_huyen: { tier: 2, hatchCost: 4000,  waitMin: 30 },
  trung_dia:   { tier: 3, hatchCost: 10000, waitMin: 30 },
  trung_thien: { tier: 4, hatchCost: 30000, waitMin: 30 },
  /* Trứng Thuần Hóa: nhận khi thu phục yêu thú ở bãi quái — phẩm theo hàng đợi tameQueue */
  trung_thuan_hoa: { tier: 0, hatchCost: 2000, waitMin: 30, tameEgg: true },
};
var PET_REST_MS = 5 * 60 * 1000;
var PET_MAX_LEVEL = 50;

function _save() { if (typeof saveGame === "function") { try { saveGame(); } catch (e) {} } }
function petTier(t) { return PET_TIERS[t] || PET_TIERS[0]; }
function eggInfo(eggId) { return PET_EGGS[eggId] || null; }

/* Chỉ số gốc theo phẩm + cấp */
function petStats(pet, state) {
  var t = petTier(pet.tier);
  var lv = pet.level || 1;
  /* Buff Ngự Thú Tông: linh thú +20% chỉ số */
  var sm = 1;
  try {
    if (state && typeof Sect !== "undefined" && Sect.sectBuff)
      sm = Sect.sectBuff(state).petMult || 1;
    /* Thần Thức: điều khiển được nhiều linh thú → tâm ý tương thông, pet mạnh hơn */
    if (typeof BodyCult !== "undefined") {
      var _slots = BodyCult.thanthucBonus((state && state.thanthucLv) || 0).petSlots;
      if (_slots > 1) sm *= 1 + (_slots - 1) * 0.08;
    }
  } catch (e) {}
  return {
    maxHp: Math.round((80 + lv * 12) * t.statMult * sm),
    atk: Math.round((8 + lv * 1.5) * t.statMult * sm),
    skillDmg: Math.round((20 + lv * 4) * t.statMult * t.skillMult * sm),
  };
}
function petExpNeed(pet) {
  var t = petTier(pet.tier);
  return Math.max(10, Math.round(((pet.level || 1) * 40) / t.lvlSpd));
}
/* Xem trước chỉ số khi bấm vào trứng */
function eggPreview(eggId) {
  var e = eggInfo(eggId);
  if (!e) return null;
  return { tier: e.tier, hatchCost: e.hatchCost, stats: petStats({ tier: e.tier, level: 1 }) };
}

/* Bắt đầu ấp: instant=true → trả Linh Thạch ấp ngay;
 * instant=false → chờ waitMin phút (miễn phí) */
function startHatch(state, eggId, instant) {
  var e = eggInfo(eggId);
  if (!e) return { ok: false, reason: "no_egg" };
  /* Bui chốt: ấp trứng cần Trúc Cơ (realm 2) trở lên */
  var realm = (state.char && state.char.realm) || 0;
  if (realm < 2) return { ok: false, reason: "realm_lock", need: 2 };
  if (state.pet) return { ok: false, reason: "has_pet" };
  var has = (state.bag || []).some(function (it) { return it.id === eggId && it.qty > 0; });
  if (!has) return { ok: false, reason: "no_egg" };
  if (instant) {
    if ((state.stones || 0) < e.hatchCost) return { ok: false, reason: "no_stone", need: e.hatchCost };
    state.stones -= e.hatchCost;
    return _doHatch(state, eggId, e);
  }
  /* chờ miễn phí (Ngự Thú Tông: nhanh 30%) */
  for (var i = 0; i < state.bag.length; i++) {
    if (state.bag[i].id === eggId) {
      state.bag[i].qty--;
      if (state.bag[i].qty <= 0) state.bag.splice(i, 1);
      break;
    }
  }
  var waitMs = e.waitMin * 60 * 1000;
  try {
    if (typeof Sect !== "undefined" && Sect.sectBuff)
      waitMs = Math.round(waitMs * (Sect.sectBuff(state).hatchFast || 1));
  } catch (e2) {}
  state.petHatch = { eggId: eggId, readyAt: Date.now() + waitMs };
  _save();
  return { ok: true, waiting: true, readyAt: state.petHatch.readyAt };
}
function _doHatch(state, eggId, e) {
  for (var i = 0; i < state.bag.length; i++) {
    if (state.bag[i].id === eggId) {
      state.bag[i].qty--;
      if (state.bag[i].qty <= 0) state.bag.splice(i, 1);
      break;
    }
  }
  /* Trứng Thuần Hóa: lấy phẩm + loài từ hàng đợi thu phục */
  var tier = e.tier, speciesId = null;
  if (eggId === "trung_thuan_hoa" && state.tameQueue && state.tameQueue.length) {
    var tq = state.tameQueue.shift();
    if (tq) { tier = tq.tier || 0; speciesId = tq.speciesId || null; }
  }
  var st = petStats({ tier: tier, level: 1 });
  state.pet = { tier: tier, name: "", level: 1, exp: 0, hp: st.maxHp };
  if (speciesId) state.pet.speciesId = speciesId;
  state.petHatch = null;
  state.petRestUntil = 0;
  _save();
  return { ok: true, pet: state.pet };
}
/* Kiểm tra trứng chờ đã nở chưa (ui gọi mỗi tick) */
function checkHatchReady(state) {
  if (!state.petHatch) return null;
  if (Date.now() < state.petHatch.readyAt) return null;
  var e = eggInfo(state.petHatch.eggId);
  if (!e) { state.petHatch = null; return null; }
  return _doHatch(state, state.petHatch.eggId, e);
}

/* Cho ăn: tốn level*50 Linh Thạch → +exp, đủ thì lên cấp */
function feedPet(state) {
  var pet = state.pet;
  if (!pet) return { ok: false, reason: "no_pet" };
  if ((pet.level || 1) >= PET_MAX_LEVEL) return { ok: false, reason: "max_level" };
  var cost = (pet.level || 1) * 50;
  if ((state.stones || 0) < cost) return { ok: false, reason: "no_stone", need: cost };
  state.stones -= cost;
  pet.exp = (pet.exp || 0) + 40;
  var need = petExpNeed(pet);
  var ups = 0;
  while (pet.exp >= need && (pet.level || 1) < PET_MAX_LEVEL) {
    pet.exp -= need;
    pet.level++;
    ups++;
    need = petExpNeed(pet);
  }
  var st = petStats(pet);
  if (pet.hp > st.maxHp) pet.hp = st.maxHp;
  _save();
  return { ok: true, level: pet.level, ups: ups, cost: cost };
}

function renamePet(state, name) {
  if (!state.pet) return { ok: false };
  state.pet.name = String(name || "").slice(0, 12);
  _save();
  return { ok: true, name: state.pet.name };
}

/* Thú chịu đòn thay chủ (engine gọi khi player trúng đòn).
 * Trả true nếu thú kiệt sức lần này. */
function petTakeHit(state, dmg) {
  var pet = state.pet;
  if (!pet || Date.now() < (state.petRestUntil || 0)) return false;
  var st = petStats(pet);
  pet.hp = Math.max(0, (pet.hp == null ? st.maxHp : pet.hp) - dmg);
  if (pet.hp <= 0) {
    state.petRestUntil = Date.now() + PET_REST_MS;
    _save();
    return true;
  }
  _save();
  return false;
}
function petRestLeft(state) {
  var r = (state.petRestUntil || 0) - Date.now();
  return r > 0 ? r : 0;
}
/* Thú đang chiến đấu được? */
function petActive(state) {
  return !!(state.pet && petRestLeft(state) <= 0);
}


/* 30 loài linh thú (Bui chốt): id → {tên song ngữ, phẩm, hệ, kiểu di
 * chuyển fly/run/crawl, sprite, skill signature + hiệu ứng riêng} */
var PET_SPECIES = {
  thanh_phong_lang: { vi: "Thanh Phong Lang", en: "Azure Wind Wolf", tier: 0, element: "phong", movement: "run",
    img: "assets/sprs/pet_thanh_phong_lang.webp",
    skill: { vi: "Phong Lang Trảo", en: "Wind Wolf Claws", effect_sheet: "eff_slash_sheet", effect_mau: "#7fe8a0" } },
  linh_vi_ho: { vi: "Linh Vĩ Hồ", en: "Spirit Tail Fox", tier: 0, element: "linh", movement: "run",
    img: "assets/sprs/pet_linh_vi_ho.webp",
    skill: { vi: "Linh Hồ Huyễn Bộ", en: "Spirit Fox Steps", effect_sheet: "eff_moon_sheet", effect_mau: "#bfe8ff" } },
  thiet_giap_quy: { vi: "Thiết Giáp Quy", en: "Ironclad Tortoise", tier: 0, element: "thổ", movement: "crawl",
    img: "assets/sprs/pet_thiet_giap_quy.webp",
    skill: { vi: "Thiết Giáp Phản Chấn", en: "Iron Shell Rebuke", effect_sheet: "eff_formation_sheet", effect_mau: "#c9a227" } },
  xich_hoa_thu: { vi: "Xích Hỏa Thử", en: "Crimson Fire Rat", tier: 0, element: "hỏa", movement: "run",
    img: "assets/sprs/pet_xich_hoa_thu.webp",
    skill: { vi: "Hỏa Thử Liệu Nguyên", en: "Fire Rat Blaze", effect_sheet: "eff_fire_sheet", effect_mau: "#ff7a3c" } },
  bich_nhan_nha: { vi: "Bích Nhãn Nha", en: "Jade-Eye Crow", tier: 0, element: "phong", movement: "fly",
    img: "assets/sprs/pet_bich_nhan_nha.webp",
    skill: { vi: "Bích Nhãn Trinh Sát", en: "Jade-Eye Scout", effect_sheet: "eff_slash_sheet", effect_mau: "#4dd0a0" } },
  nham_thach_hung: { vi: "Nham Thạch Hùng", en: "Crag Bear", tier: 0, element: "thổ", movement: "run",
    img: "assets/sprs/pet_nham_thach_hung.webp",
    skill: { vi: "Nham Thạch Chưởng", en: "Crag Palm", effect_sheet: "eff_formation_sheet", effect_mau: "#a08050" } },
  bich_thuy_giao: { vi: "Bích Thủy Giao", en: "Jade Water Flood-Dragon", tier: 1, element: "thủy", movement: "fly",
    img: "assets/sprs/pet_bich_thuy_giao.webp",
    skill: { vi: "Thủy Giao Hưng Vũ", en: "Flood Rain", effect_sheet: "eff_ice_sheet", effect_mau: "#4dd2ff" } },
  tu_dien_dieu: { vi: "Tử Điện Điêu", en: "Violet Lightning Marten", tier: 1, element: "lôi", movement: "run",
    img: "assets/sprs/pet_tu_dien_dieu.webp",
    skill: { vi: "Tử Điện Truy Kích", en: "Violet Bolt Chase", effect_sheet: "eff_lightning_sheet", effect_mau: "#b388ff" } },
  han_ngoc_tho: { vi: "Hàn Ngọc Thố", en: "Frost Jade Rabbit", tier: 1, element: "băng", movement: "run",
    img: "assets/sprs/pet_han_ngoc_tho.webp",
    skill: { vi: "Ngọc Thố Hồi Xuân", en: "Jade Rabbit Renewal", effect_sheet: "eff_moon_sheet", effect_mau: "#a0f0e8" } },
  phong_duc_ung: { vi: "Phong Dực Ưng", en: "Windwing Eagle", tier: 1, element: "phong", movement: "fly",
    img: "assets/sprs/pet_phong_duc_ung.webp",
    skill: { vi: "Ưng Kích Trường Không", en: "Eagle Sky Strike", effect_sheet: "eff_slash_sheet", effect_mau: "#8fe8c0" } },
  doc_nha_mang: { vi: "Độc Nha Mãng", en: "Venom Fang Python", tier: 1, element: "độc", movement: "crawl",
    img: "assets/sprs/pet_doc_nha_mang.webp",
    skill: { vi: "Độc Nha Phệ Tâm", en: "Venom Heart Bite", effect_sheet: "eff_demon_sheet", effect_mau: "#7ee86a" } },
  quang_minh_loc: { vi: "Quang Minh Lộc", en: "Radiant Deer", tier: 1, element: "quang", movement: "run",
    img: "assets/sprs/pet_quang_minh_loc.webp",
    skill: { vi: "Quang Minh Chúc Phúc", en: "Radiant Blessing", effect_sheet: "eff_moon_sheet", effect_mau: "#ffe89a" } },
  u_minh_bao: { vi: "U Minh Báo", en: "Nether Panther", tier: 2, element: "ám", movement: "run",
    img: "assets/sprs/pet_u_minh_bao.webp",
    skill: { vi: "U Minh Truy Hồn", en: "Nether Soul Hunt", effect_sheet: "eff_demon_sheet", effect_mau: "#8a5cff" } },
  cuu_vi_yeu_ho: { vi: "Cửu Vĩ Yêu Hồ", en: "Nine-Tail Fox", tier: 2, element: "mị", movement: "run",
    img: "assets/sprs/pet_cuu_vi_yeu_ho.webp",
    skill: { vi: "Cửu Vĩ Mê Hồn", en: "Nine-Tail Enchant", effect_sheet: "eff_moon_sheet", effect_mau: "#ff8ac2" } },
  huyet_duc_buc: { vi: "Huyết Dực Bức", en: "Bloodwing Bat", tier: 2, element: "huyết", movement: "fly",
    img: "assets/sprs/pet_huyet_duc_buc.webp",
    skill: { vi: "Huyết Dực Hút Hồn", en: "Bloodwing Drain", effect_sheet: "eff_demon_sheet", effect_mau: "#ff4d5e" } },
  hac_long: { vi: "Hắc Long", en: "Black Dragon", tier: 2, element: "ám", movement: "fly",
    img: "assets/sprs/pet_hac_long.webp",
    skill: { vi: "Hắc Long Giáng Thế", en: "Black Dragon Descent", effect_sheet: "eff_dragon_sheet", effect_mau: "#6a4dff" } },
  tam_dau_khuyen: { vi: "Tam Đầu Khuyển", en: "Three-Head Hound", tier: 2, element: "hỏa", movement: "run",
    img: "assets/sprs/pet_tam_dau_khuyen.webp",
    skill: { vi: "Tam Đầu Liệt Diệm", en: "Triple-Head Blaze", effect_sheet: "eff_fire_sheet", effect_mau: "#ff5a2a" } },
  mong_yem_thu: { vi: "Mộng Yểm Thú", en: "Dreammare", tier: 2, element: "ám", movement: "run",
    img: "assets/sprs/pet_mong_yem_thu.webp",
    skill: { vi: "Mộng Yểm Trầm Miên", en: "Nightmare Slumber", effect_sheet: "eff_demon_sheet", effect_mau: "#5a4a8a" } },
  liet_diem_su: { vi: "Liệt Diễm Sư", en: "Blazemane Lion", tier: 3, element: "hỏa", movement: "run",
    img: "assets/sprs/pet_liet_diem_su.webp",
    skill: { vi: "Sư Vương Liệt Diệm", en: "Lion King Inferno", effect_sheet: "eff_fire_sheet", effect_mau: "#ff6a1a" } },
  dai_dia_hung: { vi: "Đại Địa Hùng", en: "Great Earth Bear", tier: 3, element: "thổ", movement: "run",
    img: "assets/sprs/pet_dai_dia_hung.webp",
    skill: { vi: "Đại Địa Chấn Nhạc", en: "Earthquake Stomp", effect_sheet: "eff_formation_sheet", effect_mau: "#d8a040" } },
  kim_si_dai_bang: { vi: "Kim Sí Đại Bàng", en: "Golden-Wing Roc", tier: 3, element: "kim", movement: "fly",
    img: "assets/sprs/pet_kim_si_dai_bang.webp",
    skill: { vi: "Kim Sí Trảm Vân", en: "Golden Wing Rend", effect_sheet: "eff_swordshadow_sheet", effect_mau: "#ffd54f" } },
  bang_suong_long: { vi: "Băng Sương Long", en: "Frost Dragon", tier: 3, element: "băng", movement: "fly",
    img: "assets/sprs/pet_bang_suong_long.webp",
    skill: { vi: "Băng Sương Long Tức", en: "Frost Dragon Breath", effect_sheet: "eff_ice_sheet", effect_mau: "#9ae8ff" } },
  thach_giap_long_quy: { vi: "Thạch Giáp Long Quy", en: "Stone Dragon-Tortoise", tier: 3, element: "thổ", movement: "crawl",
    img: "assets/sprs/pet_thach_giap_long_quy.webp",
    skill: { vi: "Long Quy Trấn Hải", en: "Dragon-Tortoise Ward", effect_sheet: "eff_formation_sheet", effect_mau: "#7ab8c9" } },
  cuu_dau_xa: { vi: "Cửu Đầu Xà", en: "Nine-Head Serpent", tier: 3, element: "độc", movement: "crawl",
    img: "assets/sprs/pet_cuu_dau_xa.webp",
    skill: { vi: "Cửu Đầu Độc Vụ", en: "Nine-Head Venom Mist", effect_sheet: "eff_demon_sheet", effect_mau: "#4ae86a" } },
  ngu_trao_kim_long: { vi: "Ngũ Trảo Kim Long", en: "Five-Claw Gold Dragon", tier: 4, element: "kim", movement: "fly",
    img: "assets/sprs/pet_ngu_trao_kim_long.webp",
    skill: { vi: "Kim Long Thần Trảo", en: "Gold Dragon Talons", effect_sheet: "eff_dragon_sheet", effect_mau: "#ffd700" } },
  thanh_long: { vi: "Thanh Long", en: "Azure Dragon", tier: 4, element: "mộc", movement: "fly",
    img: "assets/sprs/pet_thanh_long.webp",
    skill: { vi: "Thanh Long Ngự Lôi", en: "Azure Dragon Thunder", effect_sheet: "eff_lightning_sheet", effect_mau: "#4ae8a0" } },
  bach_ho: { vi: "Bạch Hổ", en: "White Tiger", tier: 4, element: "kim", movement: "run",
    img: "assets/sprs/pet_bach_ho.webp",
    skill: { vi: "Bạch Hổ Sát Phạt", en: "White Tiger Execution", effect_sheet: "eff_slash_sheet", effect_mau: "#f0f0f0" } },
  hoa_phuong_hoang: { vi: "Hỏa Phượng Hoàng", en: "Fire Phoenix", tier: 4, element: "hỏa", movement: "fly",
    img: "assets/sprs/pet_hoa_phuong_hoang.webp",
    skill: { vi: "Phượng Hoàng Niết Bàn", en: "Phoenix Nirvana", effect_sheet: "eff_fire_sheet", effect_mau: "#ff8a3c" } },
  huyen_vu: { vi: "Huyền Vũ", en: "Black Tortoise", tier: 4, element: "thủy", movement: "crawl",
    img: "assets/sprs/pet_huyen_vu.webp",
    skill: { vi: "Huyền Vũ Tuyệt Bích", en: "Tortoise Absolute Ward", effect_sheet: "eff_formation_sheet", effect_mau: "#3a6a8a" } },
  hon_don_ky_lan: { vi: "Hỗn Độn Kỳ Lân", en: "Chaos Qilin", tier: 4, element: "hỗn độn", movement: "run",
    img: "assets/sprs/pet_hon_don_ky_lan.webp",
    skill: { vi: "Kỳ Lân Hỗn Độn Kiếp", en: "Qilin Chaos Calamity", effect_sheet: "eff_dragon_sheet", effect_mau: "#c98aff" } },
};
var PET_SPECIES_IDS = Object.keys(PET_SPECIES);
/* Loài mặc định khi save cũ chưa có speciesId (theo phẩm) */
var PET_DEFAULT_BY_TIER = { 0: 'thanh_phong_lang', 1: 'bich_thuy_giao', 2: 'hac_long', 3: 'liet_diem_su', 4: 'hon_don_ky_lan' };
function petSpecies(id) { return PET_SPECIES[id] || null; }
function petSpeciesOf(pet) {
  if (!pet) return null;
  var id = pet.speciesId || PET_DEFAULT_BY_TIER[pet.tier || 0] || 'thanh_phong_lang';
  return PET_SPECIES[id] || null;
}
function petMovement(pet) { var sp = petSpeciesOf(pet); return sp ? sp.movement : 'run'; }
function petSpeciesName(sp, lang) {
  if (!sp) return '';
  return (lang === 'en' ? sp.en : sp.vi) || sp.vi;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    PET_TIERS: PET_TIERS, PET_EGGS: PET_EGGS, PET_REST_MS: PET_REST_MS,
    petTier: petTier, eggInfo: eggInfo, petStats: petStats,
    petExpNeed: petExpNeed, eggPreview: eggPreview,
    startHatch: startHatch, checkHatchReady: checkHatchReady,
    feedPet: feedPet, renamePet: renamePet,
    petTakeHit: petTakeHit, petRestLeft: petRestLeft, petActive: petActive,
    PET_SPECIES: PET_SPECIES, PET_SPECIES_IDS: PET_SPECIES_IDS,
    petSpecies: petSpecies, petSpeciesOf: petSpeciesOf, petMovement: petMovement,
    petSpeciesName: petSpeciesName, PET_DEFAULT_BY_TIER: PET_DEFAULT_BY_TIER,
  };
}

/* Browser global (song song với module.exports cho node) */
(function () {
  if (typeof module !== "undefined" && module.exports) return;
  var _g = (typeof globalThis !== "undefined") ? globalThis :
    ((typeof window !== "undefined") ? window : null);
  if (!_g) return;
  _g.Pet = {
    PET_TIERS: PET_TIERS,
    PET_EGGS: PET_EGGS,
    PET_REST_MS: PET_REST_MS,
    petTier: petTier,
    eggInfo: eggInfo,
    petStats: petStats,
    petExpNeed: petExpNeed,
    eggPreview: eggPreview,
    startHatch: startHatch,
    checkHatchReady: checkHatchReady,
    feedPet: feedPet,
    renamePet: renamePet,
    petTakeHit: petTakeHit,
    petRestLeft: petRestLeft,
    petActive: petActive,
    PET_SPECIES: PET_SPECIES,
    PET_SPECIES_IDS: PET_SPECIES_IDS,
    petSpecies: petSpecies,
    petSpeciesOf: petSpeciesOf,
    petMovement: petMovement,
    petSpeciesName: petSpeciesName,
    PET_DEFAULT_BY_TIER: PET_DEFAULT_BY_TIER
  };
})();
