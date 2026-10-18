/* ============================================================
 * js/dataloader.js — Tải dữ liệu game theo kiểu APK gốc (JSON + lazy)
 * - Dữ liệu game nằm ở data/*.json (KHÔNG hardcode trong JS).
 * - Boot chỉ tải core + map đầu; map sau tải riêng khi mở khóa/bước
 *   vào, kèm % loading, cache localStorage (JSON) theo version.
 * - Thêm map mới = thêm data/maps/mapN.json, KHÔNG sửa code.
 * - Gán các global tương thích: ELEMENTS, LINGEN_RATES, ITEMS,
 *   SHOP_STOCK, GIFT_CODES, MONSTERS, NPCS, QUESTS, DUNGEONS,
 *   SKILLS, SECT_SKILLS, GRADE_MULT, SECTS, SECT_DAILY, ENCOUNTERS,
 *   UI_ASSETS; MAPS là mảng các map đã tải (DataLoader.mapList()).
 * - Node: đọc JSON bằng fs (cho smoke test).
 * ============================================================ */

var DataLoader = (function () {
  'use strict';

  var DATA_VERSION = 4;
  var LS_PREFIX = "ttonline_data_v";
  var _mem = {};          // cache memory: name -> data
  var _maps = [];         // map đã tải (theo id)
  var _mapIdx = {};       // id -> map def
  var _coreDone = false;
  var _nodeFs = null;

  function _isNode() {
    return typeof window === "undefined" && typeof require !== "undefined";
  }
  function _fs() {
    if (!_nodeFs && _isNode()) { try { _nodeFs = require("fs"); } catch (e) {} }
    return _nodeFs;
  }
  function _base() {
    /* thư mục v2/ — nơi chứa data/ */
    if (_isNode()) return "/home/hatch/workspace/game-tu-tien/v2/";
    return "";
  }
  function _lsGet(k) {
    try { return localStorage.getItem(k); } catch (e) { return null; }
  }
  function _lsSet(k, v) {
    try { localStorage.setItem(k, v); return true; } catch (e) { return false; }
  }
  function _lsDel(k) {
    try { localStorage.removeItem(k); } catch (e) {}
  }

  /* Đọc 1 JSON: node → fs; browser → localStorage cache → fetch */
  function _readJson(name, cb) {
    if (_mem[name]) { cb(null, _mem[name]); return; }
    var fs = _fs();
    if (fs) {
      try {
        var raw = fs.readFileSync(_base() + "data/" + name + ".json", "utf8");
        var d = JSON.parse(raw);
        _mem[name] = d;
        cb(null, d);
      } catch (e) { cb(e); }
      return;
    }
    var key = LS_PREFIX + DATA_VERSION + "_" + name.replace(/\//g, "_");
    var cached = _lsGet(key);
    if (cached) {
      try {
        var dc = JSON.parse(cached);
        _mem[name] = dc;
        cb(null, dc);
        return;
      } catch (e) { _lsDel(key); }
    }
    fetch("data/" + name + ".json")
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status + " data/" + name + ".json");
        return r.json();
      })
      .then(function (d) {
        _mem[name] = d;
        _lsSet(key, JSON.stringify(d));
        cb(null, d);
      })
      .catch(function (e) { cb(e); });
  }

  /* Tải tuần tự danh sách file, báo % qua onProg(done, total) */
  function _loadSeq(names, onProg, cb) {
    var i = 0;
    var total = names.length;
    function next() {
      if (onProg) { try { onProg(i, total); } catch (e) {} }
      if (i >= total) { if (onProg) { try { onProg(total, total); } catch (e) {} } cb(null); return; }
      _readJson(names[i], function (err) {
        if (err) { cb(err); return; }
        i++;
        next();
      });
    }
    next();
  }

  var CORE_FILES = ["version", "core", "items", "monsters", "npcs",
                    "quests", "quests_sect", "dungeons", "secret_realms", "skills", "sects", "encounters", "ui"];

  function _assignGlobals() {
    function G(k, v) {
      if (typeof globalThis !== "undefined") globalThis[k] = v;
      else if (typeof window !== "undefined") window[k] = v;
    }
    var core = _mem["core"] || {};
    G("ELEMENTS", core.elements || {});
    G("LINGEN_RATES", core.lingen_rates || []);
    G("SHOP_STOCK", core.shop_stock || []);
    G("GIFT_CODES", core.gift_codes || {});
    G("SKILLS", core.base_skills || {});
    G("ITEMS", _mem["items"] || {});
    G("MONSTERS", _mem["monsters"] || {});
    G("NPCS", _mem["npcs"] || {});
    G("QUESTS", _mem["quests"] || []);
    var sq = _mem["quests_sect"] || {};
    G("SECT_QUESTS", sq.chains || []);
    G("SECT_QUEST_CUNGCO", sq.cungco || []);
    G("SECT_QUEST_DAILY", sq.daily || []);
    G("SECT_QUEST_WEEKLY", sq.weekly || []);
    G("DUNGEONS", _mem["dungeons"] || []);
    G("SECRET_REALMS", _mem["secret_realms"] ||
      (typeof SECRET_REALMS !== "undefined" ? SECRET_REALMS : null));
    var sk = _mem["skills"] || {};
    G("SECT_SKILLS", sk.sect_skills || {});
    G("GRADE_MULT", sk.grade_mult || [1, 1.3, 1.6]);
    var se = _mem["sects"] || {};
    G("SECTS", se.sects || {});
    G("SECT_DAILY", se.daily || []);
    G("ENCOUNTERS", _mem["encounters"] || {});
    G("UI_ASSETS", _mem["ui"] || {});
    G("DATA_VERSION", DATA_VERSION);
    /* MAPS: mảng động — các map đã tải */
    if (typeof globalThis !== "undefined") {
      if (!globalThis.MAPS) globalThis.MAPS = [];
    } else if (typeof window !== "undefined") {
      if (!window.MAPS) window.MAPS = [];
    }
  }

  /* Tải core (không gồm map). Xong → gán globals. */
  function loadCore(onProg, cb) {
    if (_coreDone) { if (onProg) onProg(1, 1); cb(null); return; }
    _readJson("version", function (err, ver) {
      if (!err && ver && ver.version !== DATA_VERSION) {
        /* version data mới hơn code biết → vẫn chạy, báo console */
        try { console.warn("[data] version.json =", ver.version, "code =", DATA_VERSION); } catch (e) {}
      }
      _loadSeq(CORE_FILES, onProg, function (e2) {
        if (e2) { cb(e2); return; }
        _assignGlobals();
        _coreDone = true;
        cb(null);
      });
    });
  }

  /* Preload ảnh map (bg + sprites) với % */
  function _preloadImages(urls, onProg, cb) {
    if (_isNode() || typeof Image === "undefined") { cb(null); return; }
    var list = (urls || []).filter(Boolean);
    var i = 0;
    if (!list.length) { cb(null); return; }
    function next() {
      if (onProg) { try { onProg(i, list.length); } catch (e) {} }
      if (i >= list.length) { cb(null); return; }
      var im = new Image();
      var done = false;
      function step() { if (!done) { done = true; i++; next(); } }
      im.onload = step;
      im.onerror = step; /* thiếu ảnh → bỏ qua, engine vẽ fallback */
      setTimeout(step, 8000); /* chống treo */
      im.src = list[i];
    }
    next();
  }

  /* Tải 1 map theo id (0-based → file map{id+1}.json). Chưa tải mới tải.
   * cb(err, mapDef). onProg(phase, done, total): phase 'json'|'assets'. */
  function loadMap(mapId, onProg, cb) {
    if (_mapIdx[mapId] != null) { cb(null, _mapIdx[mapId]); return; }
    if (!_coreDone) { cb(new Error("loadCore trước")); return; }
    var name = "maps/map" + (mapId + 1);
    _readJson(name, function (err, def) {
      if (err || !def) { cb(err || new Error("map.json rỗng")); return; }
      _mapIdx[mapId] = def;
      _maps.push(def);
      _maps.sort(function (a, b) { return a.id - b.id; });
      /* cập nhật global MAPS */
      var G = (typeof globalThis !== "undefined") ? globalThis : window;
      G.MAPS = _maps.slice();
      var assets = (def.assets && def.assets.sprites) || [];
      if (def.assets && def.assets.bg) assets = [def.assets.bg].concat(assets);
      _preloadImages(assets, function (d, t) {
        if (onProg) { try { onProg("assets", d, t); } catch (e) {} }
      }, function () { cb(null, def); });
    });
  }

  function isMapLoaded(mapId) { return _mapIdx[mapId] != null; }
  function mapList() { return _maps.slice(); }
  function mapDef(id) { return _mapIdx[id] || null; }

  /* Node: tải đồng bộ toàn bộ (core + maps) cho smoke test */
  function loadAllSync() {
    var fs = _fs();
    if (!fs) throw new Error("chỉ dùng trên node");
    ["version"].forEach(function (n) {
      _mem[n] = JSON.parse(fs.readFileSync(_base() + "data/" + n + ".json", "utf8"));
    });
    CORE_FILES.forEach(function (n) {
      if (n === "version") return;
      _mem[n] = JSON.parse(fs.readFileSync(_base() + "data/" + n + ".json", "utf8"));
    });
    _assignGlobals();
    _coreDone = true;
    var i = 0;
    for (;;) {
      var name = "maps/map" + (i + 1);
      var p = _base() + "data/" + name + ".json";
      if (!fs.existsSync(p)) break;
      var def = JSON.parse(fs.readFileSync(p, "utf8"));
      _mapIdx[def.id] = def;
      _maps.push(def);
      i++;
    }
    _maps.sort(function (a, b) { return a.id - b.id; });
    var G = (typeof globalThis !== "undefined") ? globalThis : {};
    G.MAPS = _maps.slice();
    return { maps: _maps.length };
  }

  /* Xóa cache localStorage (khi version.json đổi) */
  function clearCache() {
    if (_isNode()) return;
    try {
      var out = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf("ttonline_data_v") === 0) out.push(k);
      }
      out.forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) {}
    _mem = {};
    _coreDone = false;
  }

  return {
    DATA_VERSION: DATA_VERSION,
    loadCore: loadCore,
    loadMap: loadMap,
    isMapLoaded: isMapLoaded,
    mapList: mapList,
    mapDef: mapDef,
    loadAllSync: loadAllSync,
    clearCache: clearCache,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = DataLoader;
}
