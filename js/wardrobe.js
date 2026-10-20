/* ============================================================
 * js/wardrobe.js — TỦ TRANG PHỤC: mua bằng Linh Thạch + mặc/thay đồ
 * - 50 bộ trang phục (assets/sprs/outfits/outfit_<id>.png), 4 tier giá:
 *   Thường 500 · Hiếm 2000 · Sử Thi 5000 · Truyền Thuyết 15000 Linh Thạch.
 * - State: state.outfits_owned = [id...] (mặc định rỗng; outfit_worn=null
 *   nghĩa là bộ mặc định của nhân vật), state.outfit_worn = id | null.
 * - Tiền tệ: trừ state.stones (đúng field Linh Thạch của game).
 * - UI: đăng ký RENDER["wardrobe"] + lắng nghe click data-evact riêng,
 *   KHÔNG sửa hàm nào của ui.js. Panel nhân vật: chèn thêm 1 hàng
 *   "Trang phục đang mặc" bằng MutationObserver (DOM append, không
 *   đụng renderChar).
 * Node-safe: mọi truy cập DOM/state đều có guard.
 * ============================================================ */
(function (global) {
  "use strict";

  var TIER_PRICE = { 1: 500, 2: 2000, 3: 5000, 4: 15000 };
  var TIER_KEY = { 1: "wd_tier1", 2: "wd_tier2", 3: "wd_tier3", 4: "wd_tier4" };

  /* id -> {vi, en, tier} — thứ tự trong OUTFIT_ORDER là thứ tự hiển thị */
  var OUTFITS = {
    /* Truyền thuyết */
    tien_bao:      { vi: "Tiên Bào",            en: "Immortal Robe",      tier: 4 },
    hoang_bao:     { vi: "Hoàng Bào",           en: "Imperial Robe",      tier: 4 },
    thien_tuong:   { vi: "Thiên Tướng Bào",     en: "Heavenly General",   tier: 4 },
    /* Sử thi — yêu ma + hoàng gia */
    huyet_ma:      { vi: "Huyết Ma Bào",        en: "Blood Demon Robe",   tier: 3 },
    u_minh:        { vi: "U Minh Bào",          en: "Nether Robe",        tier: 3 },
    ho_yeu:        { vi: "Hồ Yêu Bào",          en: "Fox Spirit Robe",    tier: 3 },
    cuong_thi:     { vi: "Cương Thi Bào",       en: "Jiangshi Robe",      tier: 3 },
    quy_dien:      { vi: "Quỷ Diện Trang",      en: "Demon Mask Garb",    tier: 3 },
    ma_bao:        { vi: "Ma Bào",              en: "Demonic Robe",       tier: 3 },
    vuong_gia:     { vi: "Vương Gia Bào",       en: "Prince Robe",        tier: 3 },
    thai_tu:       { vi: "Thái Tử Bào",         en: "Crown Prince Robe",  tier: 3 },
    quan_van:      { vi: "Quan Văn Bào",        en: "Civil Official Robe", tier: 3 },
    quan_vo:       { vi: "Quan Võ Bào",         en: "Military Official Robe", tier: 3 },
    tai_than:      { vi: "Tài Thần Bào",        en: "God of Wealth Robe", tier: 3 },
    nguyet_lao:    { vi: "Nguyệt Lão Bào",      en: "Matchmaker Robe",    tier: 3 },
    chung_quy:     { vi: "Chung Quỳ Bào",       en: "Zhong Kui Robe",     tier: 3 },
    /* Hiếm — ngũ hành + quân sự + lễ phục */
    hoa_diem:      { vi: "Hỏa Diệm Bào",        en: "Flame Robe",         tier: 2 },
    han_thuy:      { vi: "Hàn Thủy Bào",        en: "Frost Water Robe",   tier: 2 },
    thanh_moc:     { vi: "Thanh Mộc Bào",       en: "Verdant Wood Robe",  tier: 2 },
    kim_quang:     { vi: "Kim Quang Giáp",      en: "Golden Light Armor", tier: 2 },
    hau_tho:       { vi: "Hậu Thổ Bào",         en: "Earth Robe",         tier: 2 },
    tuong_quan:    { vi: "Tướng Quân Giáp",     en: "General Armor",      tier: 2 },
    cam_y_ve:      { vi: "Cẩm Y Vệ Bào",        en: "Brocade Guard Robe", tier: 2 },
    ngu_lam:       { vi: "Ngự Lâm Giáp",        en: "Imperial Guard Armor", tier: 2 },
    cung_thu:      { vi: "Cung Thủ Trang",      en: "Archer Garb",        tier: 2 },
    ky_binh:       { vi: "Kỵ Binh Giáp",        en: "Cavalry Armor",      tier: 2 },
    thien_binh:    { vi: "Thiên Binh Giáp",     en: "Heavenly Soldier Armor", tier: 2 },
    chien_giap:    { vi: "Chiến Giáp",          en: "War Armor",          tier: 2 },
    kiem_bao:      { vi: "Kiếm Bào",            en: "Sword Robe",         tier: 2 },
    han_bang_giap: { vi: "Hàn Băng Giáp",       en: "Frozen Armor",       tier: 2 },
    da_hanh_y:     { vi: "Dạ Hành Y",           en: "Night Walker Garb",  tier: 2 },
    xuan_hoa:      { vi: "Xuân Hoa Phục",       en: "Spring Blossom Garb", tier: 2 },
    ha_viem:       { vi: "Hạ Viêm Trang",       en: "Summer Flame Garb",  tier: 2 },
    thu_phong:     { vi: "Thu Phong Bào",       en: "Autumn Wind Robe",   tier: 2 },
    tuyet_vu:      { vi: "Tuyết Vũ Trang",      en: "Snow Garb",          tier: 2 },
    hy_phuc:       { vi: "Hỷ Phục",             en: "Wedding Garb",       tier: 2 },
    hy_khanh:      { vi: "Hỷ Khánh Bào",        en: "Festive Robe",       tier: 2 },
    /* Thường — tông môn + nghề nghiệp */
    kiem_tong:     { vi: "Đệ Tử Kiếm Tông",     en: "Sword Sect Robe",    tier: 1 },
    phap_tong:     { vi: "Đệ Tử Thiên Pháp",    en: "Sky Law Robe",       tier: 1 },
    the_tong:      { vi: "Đệ Tử Kim Cang",      en: "Vajra Robe",         tier: 1 },
    duoc_tong:     { vi: "Đệ Tử Dược Vương",    en: "Medicine King Robe", tier: 1 },
    thu_tong:      { vi: "Đệ Tử Ngự Thú",       en: "Beast Tamer Robe",   tier: 1 },
    ma_tong:       { vi: "Đệ Tử Cửu U Ma",      en: "Nine Nether Robe",   tier: 1 },
    dai_phu_bao:   { vi: "Đại Phu Bào",         en: "Physician Robe",     tier: 1 },
    tho_ren_trang: { vi: "Thợ Rèn Trang",       en: "Blacksmith Garb",    tier: 1 },
    ngu_ong_trang: { vi: "Ngư Ông Trang",       en: "Fisherman Garb",     tier: 1 },
    nong_phu_trang:{ vi: "Nông Phu Trang",      en: "Farmer Garb",        tier: 1 },
    thu_sinh:      { vi: "Thư Sinh Bào",        en: "Scholar Robe",       tier: 1 },
    tu_tai:        { vi: "Tú Tài Bào",          en: "Licentiate Robe",    tier: 1 },
    ca_sa:         { vi: "Cà Sa",               en: "Kasaya Robe",        tier: 1 },
  };
  var OUTFIT_ORDER = Object.keys(OUTFITS);

  function img(id) { return "assets/sprs/outfits/outfit_" + id + ".png"; }
  function name(id) {
    var d = OUTFITS[id];
    if (!d) return id;
    var cur = (typeof LANG_CUR !== "undefined" && LANG_CUR) || "vi";
    return d[cur] || d.vi;
  }
  function price(id) {
    var d = OUTFITS[id];
    return d ? TIER_PRICE[d.tier] : 0;
  }
  function tier(id) { var d = OUTFITS[id]; return d ? d.tier : 1; }

  /* ---------- State ---------- */
  function ensure(st) {
    if (!st) return;
    if (!Array.isArray(st.outfits_owned)) st.outfits_owned = [];
    if (st.outfit_worn === undefined) st.outfit_worn = null;
    if (st.outfit_worn && !OUTFITS[st.outfit_worn]) st.outfit_worn = null;
  }
  function owned(st, id) {
    ensure(st);
    return !!st && st.outfits_owned.indexOf(id) >= 0;
  }
  /* Cấp quyền sở hữu (dùng cho sự kiện/giftcode) — không trừ tiền */
  function grantOutfit(st, id) {
    ensure(st);
    if (!st || !OUTFITS[id]) return false;
    if (st.outfits_owned.indexOf(id) >= 0) return false;
    st.outfits_owned.push(id);
    return true;
  }
  /* Mua bằng Linh Thạch (state.stones). Trả {ok, reason?, price?} */
  function buyOutfit(id, st) {
    st = st || (typeof state !== "undefined" ? state : null);
    if (!st) return { ok: false, reason: "nostate" };
    ensure(st);
    if (!OUTFITS[id]) return { ok: false, reason: "bad" };
    if (owned(st, id)) return { ok: false, reason: "owned" };
    var p = price(id);
    if ((st.stones || 0) < p) return { ok: false, reason: "stones" };
    st.stones -= p;
    st.outfits_owned.push(id);
    return { ok: true, price: p };
  }
  /* Mặc trang phục (id=null → cởi về mặc định). Trả {ok, reason?} */
  function wearOutfit(id, st) {
    st = st || (typeof state !== "undefined" ? state : null);
    if (!st) return { ok: false, reason: "nostate" };
    ensure(st);
    if (id != null && !owned(st, id)) return { ok: false, reason: "notowned" };
    st.outfit_worn = id || null;
    return { ok: true };
  }

  var Wardrobe = {
    OUTFITS: OUTFITS,
    ORDER: OUTFIT_ORDER,
    TIER_PRICE: TIER_PRICE,
    TIER_KEY: TIER_KEY,
    img: img,
    name: name,
    price: price,
    tier: tier,
    ensure: ensure,
    owned: owned,
    grantOutfit: grantOutfit,
    buyOutfit: buyOutfit,
    wearOutfit: wearOutfit,
  };
  global.Wardrobe = Wardrobe;
  if (typeof module !== "undefined" && module.exports) module.exports = Wardrobe;

  /* ================= UI (browser) ================= */
  var wardTab = "owned"; /* owned | shop */

  function imgHtml(id, h) {
    return '<img src="' + img(id) + '" alt="" draggable="false" style="width:auto;height:' + (h || 64) +
      'px;image-rendering:pixelated" onerror="this.style.display=\'none\'">';
  }
  Wardrobe.imgHtml = imgHtml;

  function outfitRow(id, mode) {
    var st = state;
    var isWorn = st.outfit_worn === id;
    var btn;
    if (isWorn) btn = '<span class="mini on">' + esc(t("wd_worn")) + "</span>" +
      ' <button class="mini" data-evact="wd-takeoff">' + esc(t("wd_takeoff")) + "</button>";
    else if (mode === "owned") btn = '<button class="mini" data-evact="wd-wear" data-id="' + esc(id) + '">' + esc(t("wd_wear")) + "</button>";
    else btn = '<button class="mini" data-evact="wd-buy" data-id="' + esc(id) + '">' + esc(t("wd_buy")) + " · " + price(id) + " 💎</button>";
    return '<div class="row"><div><div class="item-name">' + imgHtml(id, 56) + " " + esc(name(id)) + "</div>" +
      '<div class="item-desc">' + esc(t(TIER_KEY[tier(id)])) + " · " + price(id) + " 💎</div></div>" +
      '<div class="row-btns">' + btn + "</div></div>";
  }

  function renderWardrobe() {
    ensure(state);
    var st = state;
    var h = '<div class="fld-label">💎 ' + esc(t("wd_have_stones", { n: st.stones })) + "</div>";
    /* Bộ đang mặc */
    h += '<div class="row"><div><div class="item-name">' +
      (st.outfit_worn ? imgHtml(st.outfit_worn, 72) + " " + esc(name(st.outfit_worn)) : "🧍 " + esc(t("wd_default"))) + "</div>" +
      '<div class="item-desc">' + esc(t("wd_worn")) + "</div></div>" +
      (st.outfit_worn ? '<div class="row-btns"><button class="mini" data-evact="wd-takeoff">' + esc(t("wd_takeoff")) + "</button></div>" : "") +
      "</div>";
    /* Tabs */
    h += '<div class="tabs">' +
      '<button class="mini' + (wardTab === "owned" ? " on" : "") + '" data-evact="wd-tab" data-v="owned">' + esc(t("wd_tab_owned")) + " (" + st.outfits_owned.length + ")</button>" +
      '<button class="mini' + (wardTab === "shop" ? " on" : "") + '" data-evact="wd-tab" data-v="shop">' + esc(t("wd_tab_shop")) + "</button></div>";
    if (wardTab === "owned") {
      if (!st.outfits_owned.length) h += '<p class="sect-note">' + esc(t("wd_empty_owned")) + "</p>";
      st.outfits_owned.forEach(function (id) { h += outfitRow(id, "owned"); });
    } else {
      OUTFIT_ORDER.forEach(function (id) {
        if (owned(st, id)) {
          h += '<div class="row"><div><div class="item-name">' + imgHtml(id, 56) + " " + esc(name(id)) + "</div>" +
            '<div class="item-desc">' + esc(t(TIER_KEY[tier(id)])) + '</div></div><div class="row-btns"><span class="mini on">' +
            esc(t("wd_owned")) + "</span></div></div>";
        } else h += outfitRow(id, "shop");
      });
    }
    return h;
  }
  Wardrobe.renderWardrobe = renderWardrobe;

  /* Panel nhân vật: chèn hàng trang phục đang mặc (append DOM, không sửa renderChar) */
  function injectCharRow() {
    try {
      if (typeof panel === "undefined" || panel !== "char") return;
      var body = document.getElementById("p-body");
      if (!body || body.querySelector(".wd-char-row")) return;
      ensure(state);
      var worn = state.outfit_worn;
      var div = document.createElement("div");
      div.className = "row wd-char-row";
      div.innerHTML = '<div><div class="item-name">' +
        (worn ? imgHtml(worn, 64) + " " + esc(name(worn)) : "🧍 " + esc(t("wd_default"))) + "</div>" +
        '<div class="item-desc">' + esc(t("nav_wardrobe")) + "</div></div>" +
        '<div class="row-btns"><button class="mini" data-evact="wd-open">' + esc(t("nav_wardrobe")) + "</button></div>";
      body.insertBefore(div, body.firstChild);
    } catch (e) {}
  }

  function onWdClick(e) {
    var el = e.target && e.target.closest ? e.target.closest("[data-evact]") : null;
    if (!el) return;
    var act = el.getAttribute("data-evact");
    if (act !== "wd-tab" && act !== "wd-buy" && act !== "wd-wear" && act !== "wd-takeoff" && act !== "wd-open") return;
    try {
      if (act === "wd-open") { openPanel("wardrobe"); return; }
      if (act === "wd-tab") { wardTab = el.getAttribute("data-v") || "owned"; if (typeof sfx === "function") sfx("click"); renderPanel(); return; }
      if (act === "wd-buy") {
        var r = buyOutfit(el.getAttribute("data-id"));
        if (!r.ok) { toast(t("wd_not_enough")); if (typeof sfx === "function") sfx("fail"); return; }
        saveGame(state); if (typeof refreshHUD === "function") refreshHUD();
        toast(t("wd_buy_ok", { name: name(el.getAttribute("data-id")) }));
        if (typeof sfx === "function") sfx("success");
        renderPanel(); return;
      }
      if (act === "wd-wear") {
        var wid = el.getAttribute("data-id");
        var wr = wearOutfit(wid);
        if (!wr.ok) { toast(t("wd_not_enough")); return; }
        saveGame(state);
        toast(t("wd_wear_ok", { name: name(wid) }));
        if (typeof sfx === "function") sfx("success");
        renderPanel(); return;
      }
      if (act === "wd-takeoff") {
        wearOutfit(null);
        saveGame(state);
        toast(t("wd_takeoff_ok"));
        if (typeof sfx === "function") sfx("click");
        renderPanel(); return;
      }
    } catch (err) {}
  }

  function installUI() {
    if (typeof document === "undefined" || typeof RENDER === "undefined") return;
    if (!RENDER.wardrobe) RENDER.wardrobe = renderWardrobe;
    if (!installUI._bound) {
      installUI._bound = true;
      document.addEventListener("click", onWdClick);
      try {
        var host = document.getElementById("panels");
        if (host && typeof MutationObserver !== "undefined") {
          new MutationObserver(function () { injectCharRow(); }).observe(host, { childList: true, subtree: true });
        }
      } catch (e) {}
    }
  }
  installUI();
})(typeof globalThis !== "undefined" ? globalThis : this);
