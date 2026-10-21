/* ============================================================
 * js/outfitshop.js — SHOP THỜI TRANG: mua trang phục bằng Linh Thạch
 * - 50 trang phục từ OUTFIT_DATA (js/outfit_data.js), 6 loại:
 *   ao/quan/mu/vukhi/canh/haoquang
 * - State riêng (không đụng wardrobe.js):
 *   state.shop_outfits_owned = [id...]
 *   state.shop_outfit_worn = {ao:id|null, quan:..., mu:..., vukhi:..., canh:..., haoquang:...}
 * - Chỉ số cộng thêm = tổng stats các món đang mặc (OutfitShop.wornStats)
 * - UI: RENDER["outfitshop"] + click data-osact, KHÔNG sửa file/hàm gốc.
 * - Node-safe: mọi truy cập DOM/state đều có guard.
 * ============================================================ */
(function (global) {
  "use strict";

  function _OD() {
    if (typeof OUTFIT_DATA !== "undefined") return OUTFIT_DATA;
    try { return require("./outfit_data.js").OUTFIT_DATA; } catch (e) { return {}; }
  }
  function _OC() {
    if (typeof OUTFIT_CATS !== "undefined") return OUTFIT_CATS;
    try { return require("./outfit_data.js").OUTFIT_CATS; } catch (e) { return []; }
  }
  function _OT() {
    if (typeof OUTFIT_TIERS !== "undefined") return OUTFIT_TIERS;
    try { return require("./outfit_data.js").OUTFIT_TIERS; } catch (e) { return {}; }
  }
  function _OO() {
    if (typeof OUTFIT_ORDER !== "undefined") return OUTFIT_ORDER;
    try { return require("./outfit_data.js").OUTFIT_ORDER; } catch (e) { return []; }
  }
  function _state() { return (typeof state !== "undefined") ? state : null; }
  function _t(k, p) {
    try { if (typeof t === "function") return t(k, p); } catch (e) {}
    return k;
  }
  function _esc(s) {
    try { if (typeof esc === "function") return esc(s); } catch (e) {}
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function _save(st) {
    try {
      if (typeof saveGame === "function") { saveGame(st || _state()); return; }
    } catch (e) {}
  }

  /* ---------- State ---------- */
  function ensure(st) {
    if (!st) return;
    if (!Array.isArray(st.shop_outfits_owned)) st.shop_outfits_owned = [];
    if (!st.shop_outfit_worn || typeof st.shop_outfit_worn !== "object") st.shop_outfit_worn = {};
    _OC().forEach(function (c) { if (!(c in st.shop_outfit_worn)) st.shop_outfit_worn[c] = null; });
    /* dọn id lạ */
    var OD = _OD();
    st.shop_outfits_owned = st.shop_outfits_owned.filter(function (id) { return !!OD[id]; });
    Object.keys(st.shop_outfit_worn).forEach(function (c) {
      var v = st.shop_outfit_worn[c];
      if (v && (!OD[v] || st.shop_outfits_owned.indexOf(v) < 0)) st.shop_outfit_worn[c] = null;
    });
  }

  function def(id) { return _OD()[id] || null; }
  function price(id) { var d = def(id); return d ? d.price : 0; }
  function owned(st, id) { ensure(st); return !!st && st.shop_outfits_owned.indexOf(id) >= 0; }
  function wornId(st, cat) { ensure(st); return (st && st.shop_outfit_worn[cat]) || null; }

  function name(id) {
    var d = def(id);
    if (!d) return id;
    var cur = "vi";
    try { if (typeof LANG_CUR !== "undefined" && LANG_CUR) cur = LANG_CUR; } catch (e) {}
    return d[cur] || d.vi;
  }
  function desc(id) {
    var d = def(id);
    if (!d) return "";
    var cur = "vi";
    try { if (typeof LANG_CUR !== "undefined" && LANG_CUR) cur = LANG_CUR; } catch (e) {}
    return d["desc_" + cur] || d.desc_vi || "";
  }

  /* Mua: trừ Linh Thạch, thêm vào owned */
  function buyOutfit(id, st) {
    st = st || _state();
    ensure(st);
    var d = def(id);
    if (!st || !d) return { ok: false, reason: "noid" };
    if (owned(st, id)) return { ok: false, reason: "owned" };
    var stones = st.stones || 0;
    if (stones < d.price) return { ok: false, reason: "poor" };
    st.stones = stones - d.price;
    st.shop_outfits_owned.push(id);
    _save(st);
    return { ok: true };
  }

  /* Cấp miễn phí (giftcode/sự kiện) — không trừ tiền */
  function grantOutfit(id, st) {
    st = st || _state();
    ensure(st);
    if (!st || !def(id)) return false;
    if (st.shop_outfits_owned.indexOf(id) >= 0) return false;
    st.shop_outfits_owned.push(id);
    _save(st);
    return true;
  }

  /* Mặc: gán vào slot theo loại (mỗi loại 1 món) */
  function wearOutfit(id, st) {
    st = st || _state();
    ensure(st);
    var d = def(id);
    if (!st || !d) return { ok: false };
    if (!owned(st, id)) return { ok: false, reason: "notowned" };
    st.shop_outfit_worn[d.cat] = id;
    _save(st);
    return { ok: true };
  }

  /* Tháo: theo loại */
  function takeoff(cat, st) {
    st = st || _state();
    ensure(st);
    if (!st) return false;
    if (_OC().indexOf(cat) < 0) return false;
    st.shop_outfit_worn[cat] = null;
    _save(st);
    return true;
  }

  /* Tổng chỉ số các món đang mặc */
  function wornStats(st) {
    st = st || _state();
    ensure(st);
    var total = { atk: 0, def: 0, hp: 0, spd: 0 };
    if (!st) return total;
    _OC().forEach(function (c) {
      var id = st.shop_outfit_worn[c];
      var d = id && def(id);
      if (d && d.stats) {
        Object.keys(total).forEach(function (k) { total[k] += (d.stats[k] || 0); });
      }
    });
    return total;
  }

  function catName(cat) { return _t("os_cat_" + cat); }
  function tierName(tier) {
    var T = _OT()[tier];
    if (!T) return "";
    var cur = "vi";
    try { if (typeof LANG_CUR !== "undefined" && LANG_CUR) cur = LANG_CUR; } catch (e) {}
    return T[cur] || T.vi;
  }
  function tierColor(tier) { var T = _OT()[tier]; return (T && T.color) || "#b0b0b0"; }

  function statLine(d) {
    if (!d || !d.stats) return "";
    var parts = [];
    var labels = { atk: "Công", def: "Thủ", hp: "HP", spd: "Tốc" };
    try { if (typeof LANG_CUR !== "undefined" && LANG_CUR === "en") labels = { atk: "ATK", def: "DEF", hp: "HP", spd: "SPD" }; } catch (e) {}
    Object.keys(labels).forEach(function (k) {
      if (d.stats[k]) parts.push(labels[k] + " +" + d.stats[k]);
    });
    return parts.join(" · ");
  }

  var OutfitShop = {
    CATS: _OC(),
    def: def, price: price, name: name, desc: desc,
    owned: owned, wornId: wornId,
    buyOutfit: buyOutfit, grantOutfit: grantOutfit,
    wearOutfit: wearOutfit, takeoff: takeoff,
    wornStats: wornStats, ensure: ensure,
    catName: catName, tierName: tierName, tierColor: tierColor,
  };
  global.OutfitShop = OutfitShop;
  if (typeof module !== "undefined" && module.exports) module.exports = OutfitShop;

  /* ================= UI (browser) ================= */
  var shopTab = "shop";       /* shop | owned */
  var shopCat = "all";        /* all | ao | quan | ... */

  function itemCard(id) {
    var st = _state();
    var d = def(id);
    if (!d) return "";
    var isOwned = owned(st, id);
    var isWorn = st && st.shop_outfit_worn[d.cat] === id;
    var tc = tierColor(d.tier);
    var btn;
    if (isWorn) {
      btn = '<span class="mini on">' + _esc(_t("os_worn")) + '</span> ' +
        '<button class="mini" data-osact="takeoff" data-cat="' + d.cat + '">' + _esc(_t("os_takeoff")) + "</button>";
    } else if (isOwned) {
      btn = '<button class="mini" data-osact="wear" data-id="' + _esc(id) + '">' + _esc(_t("os_wear")) + "</button>";
    } else {
      btn = '<button class="mini" data-osact="buy" data-id="' + _esc(id) + '">' +
        _esc(_t("os_buy")) + " · " + d.price + " 💎</button>";
    }
    var sl = statLine(d);
    return '<div class="row os-card" style="border-left:3px solid ' + tc + '">' +
      '<div><div class="item-name">' + _esc(name(id)) + "</div>" +
      '<div class="item-desc">' + _esc(catName(d.cat)) + " · " + _esc(tierName(d.tier)) + "</div>" +
      (sl ? '<div class="item-desc os-stats">' + _esc(_t("os_stats")) + ": " + _esc(sl) + "</div>" : "") +
      '<div class="item-desc">' + _esc(desc(id)) + "</div></div>" +
      '<div class="row-btns">' + btn + "</div></div>";
  }

  function renderOutfitShop() {
    var st = _state();
    ensure(st);
    var h = "";
    /* đầu trang kiểu cổ trang */
    h += '<div class="os-head"><div class="os-title">' + _esc(_t("os_title")) + "</div>" +
      '<div class="item-desc">' + _esc(_t("os_sub")) + "</div>" +
      '<div class="fld-label">💎 ' + _esc(_t("os_have_stones", { n: st ? (st.stones || 0) : 0 })) + "</div></div>";
    /* tabs */
    h += '<div class="tabs">' +
      '<button class="mini' + (shopTab === "shop" ? " on" : "") + '" data-osact="tab" data-v="shop">' + _esc(_t("os_tab_shop")) + "</button>" +
      '<button class="mini' + (shopTab === "owned" ? " on" : "") + '" data-osact="tab" data-v="owned">' +
      _esc(_t("os_tab_owned")) + " (" + (st ? st.shop_outfits_owned.length : 0) + ")</button></div>";
    if (shopTab === "shop") {
      /* lọc theo loại */
      h += '<div class="tabs os-cats">' +
        '<button class="mini' + (shopCat === "all" ? " on" : "") + '" data-osact="cat" data-v="all">' + _esc(_t("os_cat_all")) + "</button>";
      _OC().forEach(function (c) {
        h += '<button class="mini' + (shopCat === c ? " on" : "") + '" data-osact="cat" data-v="' + c + '">' + _esc(catName(c)) + "</button>";
      });
      h += "</div>";
      var list = _OO().filter(function (id) {
        var d = def(id);
        return d && (shopCat === "all" || d.cat === shopCat);
      });
      if (!list.length) h += '<p class="sect-note">' + _esc(_t("os_empty_shop")) + "</p>";
      list.forEach(function (id) { h += itemCard(id); });
    } else {
      /* tủ đồ: nhóm theo loại, hiện món đang mặc từng loại */
      var any = false;
      _OC().forEach(function (c) {
        var wid = wornId(st, c);
        h += '<div class="fld-label">' + _esc(catName(c)) + (wid ? ' — <b>' + _esc(name(wid)) + "</b>" : "") + "</div>";
        var items = st.shop_outfits_owned.filter(function (id) { var d = def(id); return d && d.cat === c; });
        if (!items.length) { h += '<p class="sect-note">' + _esc(_t("os_not_owned")) + "</p>"; return; }
        any = true;
        items.forEach(function (id) { h += itemCard(id); });
      });
      if (!any && !st.shop_outfits_owned.length)
        h += '<p class="sect-note">' + _esc(_t("os_empty_owned")) + "</p>";
    }
    return h;
  }

  function onOsClick(e) {
    var el = e.target && e.target.closest ? e.target.closest("[data-osact]") : null;
    if (!el) return;
    var act = el.getAttribute("data-osact");
    if (["tab", "cat", "buy", "wear", "takeoff"].indexOf(act) < 0) return;
    try {
      var clickSfx = function (n) { try { if (typeof sfx === "function") sfx(n); } catch (x) {} };
      if (act === "tab") { shopTab = el.getAttribute("data-v") || "shop"; clickSfx("click"); renderPanel(); return; }
      if (act === "cat") { shopCat = el.getAttribute("data-v") || "all"; clickSfx("click"); renderPanel(); return; }
      if (act === "buy") {
        var r = buyOutfit(el.getAttribute("data-id"));
        if (!r.ok) {
          try { toast(_t("os_not_enough")); } catch (x) {}
          clickSfx("fail"); return;
        }
        try { if (typeof refreshHUD === "function") refreshHUD(); } catch (x) {}
        try { toast(_t("os_buy_ok", { name: name(el.getAttribute("data-id")) })); } catch (x) {}
        clickSfx("success"); renderPanel(); return;
      }
      if (act === "wear") {
        var wr = wearOutfit(el.getAttribute("data-id"));
        if (!wr.ok) return;
        try { toast(_t("os_wear_ok", { name: name(el.getAttribute("data-id")) })); } catch (x) {}
        clickSfx("success"); renderPanel(); return;
      }
      if (act === "takeoff") {
        takeoff(el.getAttribute("data-cat"));
        try { toast(_t("os_takeoff_ok")); } catch (x) {}
        clickSfx("click"); renderPanel(); return;
      }
    } catch (err) {}
  }

  function installUI() {
    if (typeof document === "undefined" || typeof RENDER === "undefined") return;
    if (!RENDER.outfitshop) RENDER.outfitshop = renderOutfitShop;
    if (!installUI._bound) {
      installUI._bound = true;
      document.addEventListener("click", onOsClick);
      /* CSS cổ trang riêng cho shop (không đụng css/style.css) */
      try {
        var css = document.createElement("style");
        css.textContent =
          ".os-head{text-align:center;padding:12px 8px 4px;background:linear-gradient(180deg,rgba(120,20,20,.25),transparent);border-bottom:1px solid #7a2a1a;margin-bottom:8px}" +
          ".os-title{font-size:22px;font-weight:bold;color:#ffd98a;text-shadow:0 2px 6px rgba(0,0,0,.6);letter-spacing:2px}" +
          ".os-card{background:rgba(30,12,8,.35);border-radius:6px;margin:6px 0}" +
          ".os-stats{color:#9fd6a4}" +
          ".os-cats{flex-wrap:wrap;gap:4px}" +
          ".os-cats .mini{margin:2px}";
        document.head.appendChild(css);
      } catch (e) {}
    }
  }
  installUI();
})(typeof globalThis !== "undefined" ? globalThis : this);
