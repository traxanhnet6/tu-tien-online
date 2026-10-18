/* ============================================================
 * js/worldmap.js — Giao diện MAP rõ ràng (Bui yêu cầu 2026-10-18)
 * - Bản đồ thế giới: bấm minimap → panel toàn màn hình, 14 map,
 *   trạng thái mở/khóa, bấm map đã mở để dịch chuyển nhanh
 * - Minimap: la bàn Bắc + chú thích chấm màu
 * - Toast tên bãi quái khi vào bãi mới
 * Standalone, không đụng hàm hiện có của ui.js/engine.js
 * ============================================================ */
(function () {
  "use strict";

  /* Emoji đặc trưng từng map */
  var MAP_ICONS = {
    0: "🏘️", 1: "🌲", 2: "👻", 3: "🌾", 4: "⛏️",
    5: "⚔️", 6: "🔮", 7: "🛡️", 8: "💊", 9: "🐯", 10: "😈",
    11: "🩸", 12: "☁️", 13: "🗼"
  };

  function _t(key) {
    try { if (typeof t === "function") return t(key); } catch (e) {}
    return key;
  }
  function _mapDef(id) {
    try { if (typeof mapDef === "function") return mapDef(id); } catch (e) {}
    if (typeof MAPS !== "undefined") {
      for (var i = 0; i < MAPS.length; i++) if (MAPS[i].id === id) return MAPS[i];
    }
    return null;
  }
  function _curMapId() {
    try {
      if (typeof curMapId === "number") return curMapId;
      if (typeof state !== "undefined" && state && state.map) return state.map.id;
    } catch (e) {}
    return 0;
  }
  function _charRealm() {
    try {
      if (typeof state !== "undefined" && state && state.char) {
        return { realm: state.char.realm || 0, tier: state.char.tier || 1 };
      }
    } catch (e) {}
    return { realm: 0, tier: 1 };
  }

  /* Map có mở khóa chưa (theo cảnh giới) */
  function isUnlocked(md) {
    if (!md || !md.unlock) return true;
    var cr = _charRealm();
    var ur = md.unlock.realm || 0, ut = md.unlock.tier || 0;
    if (cr.realm > ur) return true;
    if (cr.realm < ur) return false;
    return (cr.tier || 1) >= ut;
  }
  function unlockText(md) {
    if (!md || !md.unlock) return "";
    var ur = md.unlock.realm || 0, ut = md.unlock.tier || 0;
    try {
      if (typeof stageName === "function") return stageName(ur, ut);
    } catch (e) {}
    return "Cảnh giới " + ur;
  }

  /* ---------- Bản đồ thế giới ---------- */
  function open() {
    if (typeof document === "undefined") return;
    close();
    var cur = _curMapId();
    var html = '<div class="panel-overlay" id="worldmap-overlay">' +
      '<div class="panel worldmap-panel">' +
      '<div class="panel-head"><h3>🗺️ ' + _t("worldmap_title") + '</h3>' +
      '<button class="panel-x" id="worldmap-x">✕</button></div>' +
      '<div class="worldmap-legend">' +
        '<span><i class="dot" style="background:#ffd76a"></i>' + _t("worldmap_you") + '</span>' +
        '<span><i class="dot" style="background:#7fe08a"></i>' + _t("worldmap_open") + '</span>' +
        '<span><i class="dot" style="background:#888"></i>' + _t("worldmap_locked") + '</span>' +
      '</div>' +
      '<div class="panel-body worldmap-grid">';

    var maps = (typeof MAPS !== "undefined") ? MAPS : [];
    for (var i = 0; i < maps.length; i++) {
      var md = maps[i];
      var un = isUnlocked(md);
      var isCur = (md.id === cur);
      var icon = MAP_ICONS[md.id] || "🗺️";
      var mons = (md.monsters || []).map(function (mid) {
        return _t("mon_" + mid);
      }).filter(function (n) { return n && n.indexOf("mon_") !== 0; });
      html += '<div class="worldmap-card' + (un ? "" : " locked") + (isCur ? " current" : "") + '"' +
        ' data-mapid="' + md.id + '" data-unlocked="' + (un ? 1 : 0) + '">' +
        '<div class="wm-icon">' + icon + '</div>' +
        '<div class="wm-name">' + _t(md.nameKey) + '</div>' +
        (isCur ? '<div class="wm-cur">📍 ' + _t("worldmap_here") + '</div>' : "") +
        (!un ? '<div class="wm-lock">🔒 ' + unlockText(md) + '</div>' : "") +
        (mons.length && un ? '<div class="wm-mons">' + mons.slice(0, 3).join(" · ") + '</div>' : "") +
        '</div>';
    }
    html += '</div>' +
      '<div class="worldmap-hint">' + _t("worldmap_hint") + '</div>' +
      '</div></div>';

    var app = document.getElementById("app") || document.body;
    var ov = document.createElement("div");
    ov.innerHTML = html;
    var real = ov.firstChild;
    app.appendChild(real);

    document.getElementById("worldmap-x").addEventListener("click", close);
    real.addEventListener("pointerdown", function (e) {
      if (e.target && e.target.id === "worldmap-overlay") close();
    });
    var cards = real.querySelectorAll(".worldmap-card");
    for (var c = 0; c < cards.length; c++) {
      (function (card) {
        card.addEventListener("click", function () {
          var mid = parseInt(card.getAttribute("data-mapid"), 10);
          var un = card.getAttribute("data-unlocked") === "1";
          if (!un) {
            try { if (typeof toast === "function") toast("🔒 " + unlockText(_mapDef(mid)), "warn"); } catch (e) {}
            return;
          }
          teleport(mid);
        });
      })(cards[c]);
    }
    try { if (typeof sfx === "function") sfx("click"); } catch (e) {}
  }
  function close() {
    try {
      var ov = document.getElementById("worldmap-overlay");
      if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
    } catch (e) {}
  }
  function teleport(mapId) {
    if (mapId === _curMapId()) { close(); return; }
    close();
    try {
      if (typeof Engine !== "undefined" && Engine.enterMap) {
        Engine.enterMap(mapId);
        if (typeof toast === "function") {
          var md = _mapDef(mapId);
          toast("✨ " + _t(md ? md.nameKey : "map_" + mapId));
        }
        if (typeof sfx === "function") sfx("teleport");
      }
    } catch (e) {}
  }

  /* ---------- Toast bãi quái ---------- */
  var _lastZoneKey = "";
  function zoneTick() {
    try {
      if (typeof screen !== "undefined" && screen !== "game") return;
      if (typeof Engine === "undefined" || !Engine.player) return;
      var md = _mapDef(_curMapId());
      var zones = (md && md.spawnZones) || [];
      var p = Engine.player;
      var found = -1;
      for (var i = 0; i < zones.length; i++) {
        var z = zones[i];
        if (Math.hypot(p.x - z.x, p.y - z.y) < (z.r || 150)) { found = i; break; }
      }
      var key = _curMapId() + ":" + found;
      if (key !== _lastZoneKey) {
        _lastZoneKey = key;
        if (found >= 0 && typeof toast === "function") {
          var z2 = zones[found];
          var names = (z2.monsters || []).map(function (mid) { return _t("mon_" + mid); })
            .filter(function (n) { return n && n.indexOf("mon_") !== 0; });
          var stage = "";
          try {
            if (typeof stageName === "function" && state && state.char)
              stage = " · " + stageName(state.char.realm || 0, state.char.tier || 1);
          } catch (e2) {}
          toast("📍 Bãi " + (names.join(", ") || _t("worldmap_zone")) + stage);
        }
      }
    } catch (e) {}
  }

  /* ---------- Minimap: la bàn + chú thích + bấm mở bản đồ ---------- */
  var _mmEnhanced = false;
  function enhanceMinimap() {
    if (_mmEnhanced) return;
    try {
      var wrap = document.getElementById("minimap-wrap");
      if (!wrap) return;
      _mmEnhanced = true;
      /* La bàn Bắc */
      var compass = document.createElement("div");
      compass.className = "mm-compass";
      compass.textContent = "N";
      compass.title = "Bắc";
      wrap.style.position = "relative";
      wrap.appendChild(compass);
      /* Chú thích chấm màu */
      var legend = document.createElement("div");
      legend.className = "mm-legend";
      legend.innerHTML =
        '<span><i style="background:#ffd76a"></i>' + _t("mm_you") + '</span>' +
        '<span><i style="background:#f0503c"></i>' + _t("mm_mon") + '</span>' +
        '<span><i style="background:#c77fe8"></i>' + _t("mm_boss") + '</span>' +
        '<span><i style="background:#7fe08a"></i>' + _t("mm_npc") + '</span>' +
        '<span><i style="background:#ffd76a;border-radius:0"></i>' + _t("mm_gate") + '</span>';
      wrap.appendChild(legend);
      /* Bấm minimap → mở bản đồ thế giới */
      var cv = document.getElementById("minimap");
      if (cv) {
        cv.style.cursor = "pointer";
        cv.addEventListener("click", function () { open(); });
      }
    } catch (e) {}
  }

  function boot() {
    try {
      enhanceMinimap();
      setInterval(zoneTick, 1000);
      setInterval(enhanceMinimap, 3000); /* thử lại nếu HUD dựng muộn */
    } catch (e) {}
  }

  /* Khởi động khi DOM sẵn sàng */
  if (typeof document !== "undefined") {
    if (document.readyState === "loading")
      document.addEventListener("DOMContentLoaded", boot);
    else
      setTimeout(boot, 500);
  }

  /* Export cho test Node */
  var api = { open: open, close: close, teleport: teleport, isUnlocked: isUnlocked, unlockText: unlockText, zoneTick: zoneTick };
  if (typeof window !== "undefined") window.WorldMap = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
