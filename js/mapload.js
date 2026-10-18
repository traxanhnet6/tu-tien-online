/* ============================================================
 * js/mapload.js — Màn hình chờ khi vào map (mỗi map 1 ảnh riêng)
 * - Khi chuyển map: full-screen ảnh nền của map đó + tên map kiểu
 *   thư pháp + thanh tiến trình % THẬT (tải JSON map + preload ảnh
 *   nền/sprite quái của map) + mẹo chơi xoay vòng.
 * - Ảnh theo map: mapDef.loadingBg (data-driven) → bảng BG_BY_NAMEKEY
 *   → ảnh mặc định cũ. Map chưa có ảnh riêng dùng ảnh mặc định.
 * - Tích hợp tải dần: phase 1 fetch data/maps/map{id+1}.json (nếu chạy
 *   qua http), phase 2 preload ảnh nền + sprite quái/boss của map.
 * - Node-safe: mọi DOM đều guard; bgFor/preloadList là thuần logic.
 * ============================================================ */

var MapLoading = (function () {
  'use strict';

  var DEFAULT_BG = "assets/ui/ui_loading.webp";
  var TIP_COUNT = 8;
  var MIN_SHOW_MS = 1400;   /* hiện tối thiểu để thấy hiệu ứng zoom */
  var FAILSAFE_MS = 12000;  /* chống treo */

  /* Map nào dùng ảnh chờ nào (key = nameKey của map).
   * Map mới có ảnh: thêm 1 dòng ở đây + file vào assets/maps/. */
  var BG_BY_NAMEKEY = {
    map_thanh_van_tran: "assets/maps/loading_0.webp",
    map_hac_phong_lam: "assets/maps/loading_1.webp",
    map_mo_linh_thach: "assets/maps/loading_4.webp",
    map_kiem_tong: "assets/maps/loading_5.webp",
    map_thien_phap_tong: "assets/maps/loading_6.webp",
    map_kim_cang_tong: "assets/maps/loading_7.webp",
    map_duoc_vuong_tong: "assets/maps/loading_8.webp",
    map_ngu_thu_tong: "assets/maps/loading_9.webp",
    map_cuu_u_ma_tong: "assets/maps/loading_10.webp",
    map_huyet_ma_vuc:    null, /* chưa có ảnh → dùng ảnh mặc định cũ */
  };

  /* Ảnh chờ của 1 map: loadingBg trong def → bảng → mặc định. */
  function bgFor(mapDef) {
    if (mapDef && mapDef.loadingBg) return mapDef.loadingBg;
    var k = mapDef && mapDef.nameKey;
    if (k && BG_BY_NAMEKEY[k]) return BG_BY_NAMEKEY[k];
    return DEFAULT_BG;
  }

  /* Danh sách ảnh cần preload khi vào map: nền + sprite quái/boss. */
  function preloadList(mapDef) {
    var list = [bgFor(mapDef)];
    try {
      var M = (typeof MONSTERS !== "undefined") ? MONSTERS : null;
      if (M && mapDef) {
        var ids = (mapDef.monsters || []).slice();
        if (mapDef.boss) ids.push(mapDef.boss);
        ids.forEach(function (id) {
          var d = M[id];
          if (d && d.img && list.indexOf(d.img) < 0) list.push(d.img);
        });
      }
    } catch (e) {}
    return list;
  }

  function _t(key, params) {
    try {
      if (typeof t !== "undefined") return t(key, params);
    } catch (e) {}
    return key;
  }

  /* ---- DOM overlay (tạo 1 lần, tái sử dụng) ---- */
  function _el() {
    if (typeof document === "undefined") return null;
    var el = document.getElementById("mapload");
    if (el) return el;
    el = document.createElement("div");
    el.id = "mapload";
    el.className = "hidden";
    el.innerHTML =
      '<img id="mapload-bg" class="mapload-bg" alt="">' +
      '<div class="mapload-vignette"></div>' +
      '<div class="mapload-center">' +
      '  <div id="mapload-name" class="mapload-name"></div>' +
      '  <div id="mapload-sub" class="mapload-sub"></div>' +
      '</div>' +
      '<div class="mapload-bottom">' +
      '  <div class="mapload-bar"><div id="mapload-fill"></div></div>' +
      '  <div class="mapload-row"><span id="mapload-tip"></span>' +
      '  <span id="mapload-pct">0%</span></div>' +
      '</div>';
    document.body.appendChild(el);
    var bg = document.getElementById("mapload-bg");
    if (bg) {
      bg.onerror = function () {
        if (bg.src.indexOf(DEFAULT_BG) < 0) bg.src = DEFAULT_BG;
        else bg.style.display = "none";
      };
    }
    return el;
  }

  function _setPct(p) {
    if (typeof document === "undefined") return;
    p = Math.max(0, Math.min(100, Math.round(p)));
    var f = document.getElementById("mapload-fill");
    var pc = document.getElementById("mapload-pct");
    if (f) f.style.width = p + "%";
    if (pc) pc.textContent = p + "%";
  }

  /* Fetch JSON map (phase 1) — file:// thì bỏ qua êm. */
  function _fetchJson(url, cb) {
    if (typeof fetch === "undefined") { cb(); return; }
    try {
      fetch(url).then(function (r) { return r.json(); })
        .then(function () { cb(); }).catch(function () { cb(); });
    } catch (e) { cb(); }
  }

  /* Preload ảnh với % thật theo từng ảnh xong. */
  function _preloadImages(urls, onProg, cb) {
    var list = (urls || []).filter(Boolean);
    var done = 0;
    if (typeof Image === "undefined" || !list.length) { cb(); return; }
    function prog() { try { onProg(done, list.length); } catch (e) {} }
    prog();
    list.forEach(function (u) {
      var im = new Image();
      var ok = false;
      function step() { if (!ok) { ok = true; done++; prog(); if (done >= list.length) cb(); } }
      im.onload = step;
      im.onerror = step;
      setTimeout(step, 6000); /* 1 ảnh treo không chặn cả map */
      im.src = u;
    });
  }

  /* Hiện màn hình chờ vào map rồi gọi onDone. */
  function show(mapDef, onDone) {
    onDone = onDone || function () {};
    if (typeof document === "undefined") { onDone(); return; }
    mapDef = mapDef || {};
    var el = _el();
    if (!el) { onDone(); return; }

    var bg = document.getElementById("mapload-bg");
    var nm = document.getElementById("mapload-name");
    var sub = document.getElementById("mapload-sub");
    var tipEl = document.getElementById("mapload-tip");

    if (bg) {
      bg.style.display = "";
      /* restart animation zoom mỗi lần hiện */
      bg.classList.remove("mapload-bg");
      void bg.offsetWidth;
      bg.classList.add("mapload-bg");
      bg.src = bgFor(mapDef);
    }
    var nameKey = mapDef.nameKey || "";
    if (nm) nm.textContent = nameKey ? _t(nameKey) : "";
    if (sub) sub.textContent = _t("mapload_entering", { name: nameKey ? _t(nameKey) : "" });

    /* mẹo chơi xoay vòng */
    var tipIdx = Math.floor(Math.random() * TIP_COUNT);
    function showTip() {
      if (tipEl) tipEl.textContent = _t("loadtip_" + (1 + (tipIdx % TIP_COUNT)));
      tipIdx++;
    }
    showTip();
    var tipTimer = setInterval(showTip, 3200);

    el.classList.remove("hidden");
    el.classList.remove("mapload-out");
    _setPct(2);

    var t0 = Date.now();
    var finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      clearInterval(tipTimer);
      var wait = Math.max(0, MIN_SHOW_MS - (Date.now() - t0));
      setTimeout(function () {
        el.classList.add("mapload-out");
        setTimeout(function () {
          el.classList.add("hidden");
          el.classList.remove("mapload-out");
          try { onDone(); } catch (e) {}
        }, 450);
      }, wait);
    }
    setTimeout(finish, FAILSAFE_MS);

    /* phase 1: JSON map (0→25%) → phase 2: ảnh (25→100%) */
    var jsonUrl = "data/maps/map" + ((mapDef.id || 0) + 1) + ".json";
    _fetchJson(jsonUrl, function () {
      _setPct(25);
      _preloadImages(preloadList(mapDef), function (d, total) {
        _setPct(25 + (total ? (75 * d / total) : 75));
      }, finish);
    });
  }

  return {
    DEFAULT_BG: DEFAULT_BG,
    TIP_COUNT: TIP_COUNT,
    BG_BY_NAMEKEY: BG_BY_NAMEKEY,
    bgFor: bgFor,
    preloadList: preloadList,
    show: show,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = MapLoading;
}
