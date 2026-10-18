/* ============================================================
 * js/grindzone.js — Bãi quái cày cấp + thu phục yêu thú + mảnh trang bị
 * (Bui yêu cầu 2026-10-18)
 * - 14 bãi quái, 2 bãi mỗi cảnh giới (Luyện Khí → Độ Kiếp)
 * - Tỉ lệ thu phục yêu thú hóa hình: thường 0.5% / tinh anh 3% / boss 10%
 * - Mảnh trang bị: đủ số lượng đổi trang bị hoàn chỉnh ở Lão Rèn
 * Node-safe: không đụng DOM/state trực tiếp.
 * ============================================================ */

/* ---------- 14 bãi quái cày cấp ---------- */
var GRIND_ZONES = [
  /* ---- Luyện Khí (realm 1) ---- */
  { id: "gz_rung_truc_ngoai_vi", nameKey: "gz_rung_truc_ngoai_vi", descKey: "gz_rung_truc_ngoai_vi_desc",
    realm: 1, mapId: 0, x: 600, y: 300, r: 160,
    monsters: ["da_tru", "son_ke"], boss: "da_tru_vuong",
    eliteRate: 0.05, expMult: 1.0, expGio: 15000,
    tameTier: 0, tameSpecies: ["thanh_phong_lang", "linh_vi_ho", "xich_hoa_thu"],
    yaodanTier: 1, fragRealm: 1 },
  { id: "gz_bai_da_hoang_sau", nameKey: "gz_bai_da_hoang_sau", descKey: "gz_bai_da_hoang_sau_desc",
    realm: 1, mapId: 4, x: 800, y: 950, r: 160,
    monsters: ["thach_giap_trung", "tinh_thach_quai"], boss: null,
    eliteRate: 0.05, expMult: 1.0, expGio: 20000,
    tameTier: 0, tameSpecies: ["thiet_giap_quy", "nham_thach_hung", "bich_nhan_nha"],
    yaodanTier: 1, fragRealm: 1 },
  /* ---- Trúc Cơ (realm 2) ---- */
  { id: "gz_hac_phong_sau", nameKey: "gz_hac_phong_sau", descKey: "gz_hac_phong_sau_desc",
    realm: 2, mapId: 1, x: 1000, y: 250, r: 160,
    monsters: ["phong_lang", "hu_thi"], boss: "lang_vuong",
    eliteRate: 0.05, expMult: 1.0, expGio: 35000,
    tameTier: 1, tameSpecies: ["tu_dien_dieu", "phong_duc_ung", "han_ngoc_tho"],
    yaodanTier: 1, fragRealm: 2 },
  { id: "gz_u_minh_tham_coc", nameKey: "gz_u_minh_tham_coc", descKey: "gz_u_minh_tham_coc_desc",
    realm: 2, mapId: 2, x: 1300, y: 600, r: 160,
    monsters: ["u_hon", "thi_ma"], boss: "cot_tuong",
    eliteRate: 0.06, expMult: 1.1, expGio: 55000,
    tameTier: 1, tameSpecies: ["bich_thuy_giao", "doc_nha_mang", "quang_minh_loc"],
    yaodanTier: 2, fragRealm: 2 },
  /* ---- Kim Đan (realm 3) ---- */
  { id: "gz_thai_hu_ngoai_vi", nameKey: "gz_thai_hu_ngoai_vi", descKey: "gz_thai_hu_ngoai_vi_desc",
    realm: 3, mapId: 12, x: 1200, y: 300, r: 160,
    monsters: ["ngoc_tho", "thien_hac"], boss: "thien_tuong",
    eliteRate: 0.06, expMult: 1.1, expGio: 150000,
    tameTier: 2, tameSpecies: ["cuu_vi_yeu_ho", "tam_dau_khuyen", "hac_long"],
    yaodanTier: 2, fragRealm: 3 },
  { id: "gz_viem_hoa_tan_tich", nameKey: "gz_viem_hoa_tan_tich", descKey: "gz_viem_hoa_tan_tich_desc",
    realm: 3, mapId: 11, x: 1100, y: 950, r: 160,
    monsters: ["ma_binh", "ma_lang"], boss: null,
    eliteRate: 0.06, expMult: 1.1, expGio: 130000,
    tameTier: 1, tameSpecies: ["u_minh_bao", "huyet_duc_buc", "mong_yem_thu"],
    yaodanTier: 2, fragRealm: 3 },
  /* ---- Nguyên Anh (realm 4) ---- */
  { id: "gz_huyet_ma_ngoai_vi", nameKey: "gz_huyet_ma_ngoai_vi", descKey: "gz_huyet_ma_ngoai_vi_desc",
    realm: 4, mapId: 11, x: 500, y: 1000, r: 160,
    monsters: ["oan_linh", "am_anh_thu"], boss: null,
    eliteRate: 0.07, expMult: 1.2, expGio: 280000,
    tameTier: 2, tameSpecies: ["u_minh_bao", "huyet_duc_buc", "tam_dau_khuyen"],
    yaodanTier: 3, fragRealm: 4 },
  { id: "gz_thong_thien_ha_tang", nameKey: "gz_thong_thien_ha_tang", descKey: "gz_thong_thien_ha_tang_desc",
    realm: 4, mapId: 13, x: 800, y: 1000, r: 160,
    monsters: ["thien_hac", "huyet_buc"], boss: null,
    eliteRate: 0.07, expMult: 1.2, expGio: 260000,
    tameTier: 2, tameSpecies: ["hac_long", "mong_yem_thu", "cuu_vi_yeu_ho"],
    yaodanTier: 3, fragRealm: 4 },
  /* ---- Hóa Thần (realm 5) ---- */
  { id: "gz_thien_ma_vuc", nameKey: "gz_thien_ma_vuc", descKey: "gz_thien_ma_vuc_desc",
    realm: 5, mapId: 11, x: 180, y: 500, r: 150,
    monsters: ["thien_ma"], boss: "cuu_u_ma_tuong",
    eliteRate: 0.07, expMult: 1.3, expGio: 700000,
    tameTier: 3, tameSpecies: ["liet_diem_su", "dai_dia_hung", "cuu_dau_xa"],
    yaodanTier: 4, fragRealm: 5 },
  { id: "gz_thai_hu_dinh", nameKey: "gz_thai_hu_dinh", descKey: "gz_thai_hu_dinh_desc",
    realm: 5, mapId: 12, x: 500, y: 200, r: 150,
    monsters: ["huyet_buc", "thien_hac"], boss: null,
    eliteRate: 0.08, expMult: 1.3, expGio: 600000,
    tameTier: 3, tameSpecies: ["kim_si_dai_bang", "bang_suong_long", "thach_giap_long_quy"],
    yaodanTier: 4, fragRealm: 5 },
  /* ---- Luyện Hư/Hợp Thể/Đại Thừa (realm 6) ---- */
  { id: "gz_hon_don_chien_truong", nameKey: "gz_hon_don_chien_truong", descKey: "gz_hon_don_chien_truong_desc",
    realm: 6, mapId: 13, x: 1300, y: 300, r: 160,
    monsters: ["hon_don_thu", "u_minh_cu_mang"], boss: "thai_hu_thu_vuong",
    eliteRate: 0.08, expMult: 1.4, expGio: 1500000,
    tameTier: 3, tameSpecies: ["liet_diem_su", "kim_si_dai_bang", "cuu_dau_xa"],
    yaodanTier: 4, fragRealm: 6 },
  { id: "gz_cuu_u_tham_uyen", nameKey: "gz_cuu_u_tham_uyen", descKey: "gz_cuu_u_tham_uyen_desc",
    realm: 6, mapId: 11, x: 1450, y: 1000, r: 150,
    monsters: ["thien_ma", "am_anh_thu"], boss: null,
    eliteRate: 0.08, expMult: 1.4, expGio: 1300000,
    tameTier: 4, tameSpecies: ["bang_suong_long", "dai_dia_hung", "thach_giap_long_quy"],
    yaodanTier: 5, fragRealm: 6 },
  /* ---- Độ Kiếp (realm 7) ---- */
  { id: "gz_cuu_trong_thien", nameKey: "gz_cuu_trong_thien", descKey: "gz_cuu_trong_thien_desc",
    realm: 7, mapId: 13, x: 200, y: 600, r: 150,
    monsters: ["cuu_kiep_loi_thu", "hac_long"], boss: null,
    eliteRate: 0.09, expMult: 1.5, expGio: 3000000,
    tameTier: 4, tameSpecies: ["ngu_trao_kim_long", "bach_ho", "hoa_phuong_hoang"],
    yaodanTier: 5, fragRealm: 7 },
  { id: "gz_huyet_hai_tam", nameKey: "gz_huyet_hai_tam", descKey: "gz_huyet_hai_tam_desc",
    realm: 7, mapId: 11, x: 800, y: 300, r: 150,
    monsters: ["huyet_ma_phan_than", "thien_ma"], boss: "huyet_ma_phan_than",
    eliteRate: 0.09, expMult: 1.5, expGio: 3500000,
    tameTier: 4, tameSpecies: ["thanh_long", "huyen_vu", "hon_don_ky_lan"],
    yaodanTier: 5, fragRealm: 7 },
];

/* ---------- Công thức đổi mảnh trang bị ở Lão Rèn ---------- */
/* fragNeed: số mảnh cần; out: trang bị hoàn chỉnh */
var FRAG_RECIPES = [];
(function () {
  var need = { 1: 10, 2: 12, 3: 12, 4: 15, 5: 15, 6: 20, 7: 20 };
  var slots = ["vukhi", "giap", "phapbao"];
  for (var r = 1; r <= 7; r++) {
    for (var s = 0; s < slots.length; s++) {
      FRAG_RECIPES.push({
        frag: "frag_r" + r + "_" + slots[s],
        need: need[r],
        out: "eq_r" + (r + 1) + "_" + slots[s],
        realm: r,
      });
    }
  }
})();

/* ---------- Tỉ lệ thu phục yêu thú hóa hình (Bui chốt) ---------- */
var TAME_RATES = { normal: 0.005, elite: 0.03, boss: 0.10 };

var GrindZone = (function () {
  function zone(id) {
    for (var i = 0; i < GRIND_ZONES.length; i++)
      if (GRIND_ZONES[i].id === id) return GRIND_ZONES[i];
    return null;
  }
  function zonesForRealm(realm) {
    return GRIND_ZONES.filter(function (z) { return z.realm <= realm; });
  }
  function zoneAt(mapId, monId) {
    for (var i = 0; i < GRIND_ZONES.length; i++) {
      var z = GRIND_ZONES[i];
      if (z.mapId === mapId && z.monsters.indexOf(monId) >= 0) return z;
    }
    return null;
  }
  function realmOf(state) {
    return (state && state.char && state.char.realm) || 0;
  }
  function canEnter(state, z) {
    return realmOf(state) >= z.realm;
  }
  /* Roll thu phục khi hạ quái thú. Trả về {speciesId, tier} hoặc null. */
  function tameRoll(monId, monDef, isElite, isBoss, mapId) {
    if (!monDef || monDef.loai !== "thu") return null;
    var rate = isBoss ? TAME_RATES.boss : (isElite ? TAME_RATES.elite : TAME_RATES.normal);
    if (Math.random() >= rate) return null;
    var z = zoneAt(mapId, monId);
    var pool = (z && z.tameSpecies) || ["thanh_phong_lang"];
    var tier = z ? z.tameTier : 0;
    var sp = pool[Math.floor(Math.random() * pool.length)];
    return { speciesId: sp, tier: tier };
  }
  /* Dịch chuyển nhanh tới bãi quái (đổi map + đặt vị trí) */
  function travel(z) {
    if (!z) return false;
    try {
      if (typeof Engine !== "undefined" && Engine.enterMap) {
        Engine.enterMap(z.mapId);
        if (Engine.setPlayerPos) Engine.setPlayerPos(z.x, z.y);
        return true;
      }
    } catch (e) {}
    return false;
  }
  /* Đổi mảnh lấy trang bị. Trả về {ok, reason} */
  function doFragExchange(state, recipeIdx, addItemFn, removeItemFn, countItemFn) {
    var rc = FRAG_RECIPES[recipeIdx];
    if (!rc) return { ok: false, reason: "no_recipe" };
    var have = countItemFn(state, rc.frag);
    if (have < rc.need) return { ok: false, reason: "not_enough", need: rc.need, have: have };
    removeItemFn(state, rc.frag, rc.need);
    addItemFn(state, rc.out, 1);
    return { ok: true, out: rc.out };
  }
  return {
    GRIND_ZONES: GRIND_ZONES, FRAG_RECIPES: FRAG_RECIPES, TAME_RATES: TAME_RATES,
    zone: zone, zonesForRealm: zonesForRealm, zoneAt: zoneAt,
    canEnter: canEnter, tameRoll: tameRoll, travel: travel,
    doFragExchange: doFragExchange,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    GRIND_ZONES: GRIND_ZONES, FRAG_RECIPES: FRAG_RECIPES, TAME_RATES: TAME_RATES,
    GrindZone: GrindZone,
  };
}
