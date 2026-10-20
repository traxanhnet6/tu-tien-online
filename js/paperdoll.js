/* ============================================================
 * js/paperdoll.js — Paper-doll nhân vật (Bui 2026-10-20).
 * Nhân vật = các lớp ảnh chồng nhau (kiểu game gốc), thay vì 1 sprite khối:
 *   body_{nam|nu}_{down|up|left|right}.png   thân+đầu+tóc+áo+kiếm (đã trừ chân)
 *   legs_{nam|nu}_{down|up|left|right}_{0|a|b|c}.png   chân từng tư thế (0=đứng yên)
 *   hair_{nam|nu}_{down}.png + body_nohair_{nam|nu}_{down}.png
 *       tóc tách lớp riêng (hướng down) -> đổi kiểu tóc không cần vẽ lại thân
 *   outfit_{id}_down.png                     nguyên sprite trang phục (mặt trước)
 * Tất cả cùng canvas 128x144, neo đáy-giữa -> chồng khít, không cần tính anchor.
 * Tách bằng tools/gen_paperdoll_layers.py (khớp pixel 100% với sprite gốc).
 *
 * Cách dùng (engine.js, cờ PAPERDOLL_MODE):
 *   PaperDoll.warm(gioi, dir, outfitId);            // nạp trước, rẻ khi gọi lặp
 *   var cv = PaperDoll.compose(gioi, dir, pose, outfitId); // canvas | null
 *   null = lớp chưa sẵn/thiếu -> engine fallback pipeline sprite cũ.
 * Node-safe: không có document/Image -> warm/compose trả null, không throw.
 * ============================================================ */
var PaperDoll = (function () {
  'use strict';
  var BASE = 'assets/sprs/paperdoll/';
  var CW = 128, CH = 144;
  var GENDERS = { nam: 1, nu: 1 };
  var DIRS = { down: 1, up: 1, left: 1, right: 1 };
  var POSES = { '0': 1, a: 1, b: 1, c: 1 };
  var _imgs = {};      // path -> {el, done, ok}
  var _compCache = {}; // key -> canvas
  var _CACHE_MAX = 48;

  function _isBrowser() {
    return (typeof document !== 'undefined' && typeof Image !== 'undefined');
  }
  function _normG(g) { return GENDERS[g] ? g : 'nam'; }
  function _normD(d) { return DIRS[d] ? d : 'down'; }
  function _normP(p) { return POSES[p] ? p : '0'; }

  function _bodyPath(g, d) { return BASE + 'body_' + g + '_' + d + '.png'; }
  function _legsPath(g, d, p) { return BASE + 'legs_' + g + '_' + d + '_' + p + '.png'; }
  function _hairPath(g, d) { return BASE + 'hair_' + g + '_' + d + '.png'; }
  function _bodyNoHairPath(g, d) { return BASE + 'body_nohair_' + g + '_' + d + '.png'; }
  function _outfitPath(id) { return BASE + 'outfit_' + id + '_down.png'; }

  function _load(path) {
    var e = _imgs[path];
    if (e) return e;
    e = { el: null, done: false, ok: false };
    _imgs[path] = e;
    if (!_isBrowser()) { e.done = true; e.ok = false; return e; }
    var im = new Image();
    im.onload = function () { e.done = true; e.ok = true; };
    im.onerror = function () { e.done = true; e.ok = false; };
    im.src = path;
    e.el = im;
    return e;
  }

  /* Nạp trước các lớp cho 1 frame; gọi mỗi frame đều rẻ (no-op khi đã thử tải). */
  function warm(g, d, outfitId) {
    g = _normG(g); d = _normD(d);
    if (outfitId && d === 'down') { _load(_outfitPath(outfitId)); return; }
    _load(_bodyPath(g, d));
    _load(_hairPath(g, d));
    _load(_bodyNoHairPath(g, d));
    for (var p in POSES) { if (POSES.hasOwnProperty(p)) _load(_legsPath(g, d, p)); }
  }

  /* true khi có lớp tóc riêng cho (g,d) và đã tải xong OK. */
  function _hairReady(g, d) {
    var he = _load(_hairPath(g, d));
    var be = _load(_bodyNoHairPath(g, d));
    if (!he.done || !be.done) return null; /* đang tải -> chưa quyết được */
    return (he.ok && be.ok && he.el && he.el.width && be.el && be.el.width) ? true : false;
  }

  /* Trạng thái lớp cho 1 frame: 'ok' | 'loading' | 'missing'. */
  function status(g, d, pose, outfitId) {
    g = _normG(g); d = _normD(d); pose = _normP(pose);
    if (outfitId && d === 'down') {
      var oe = _load(_outfitPath(outfitId));
      if (!oe.done) return 'loading';
      return oe.ok ? 'ok' : 'missing';
    }
    var hr = _hairReady(g, d);
    if (hr === null) return 'loading';
    var b = _load(hr ? _bodyNoHairPath(g, d) : _bodyPath(g, d));
    var l = _load(_legsPath(g, d, pose));
    if (!b.done || !l.done) return 'loading';
    return (b.ok && l.ok) ? 'ok' : 'missing';
  }

  function key(g, d, pose, outfitId) {
    return _normG(g) + '|' + _normD(d) + '|' + _normP(pose) + '|' + (outfitId || '');
  }

  /* Ghép lớp -> canvas 128x144; null khi lớp chưa sẵn/thiếu (engine fallback). */
  function compose(g, d, pose, outfitId) {
    if (!_isBrowser()) return null;
    g = _normG(g); d = _normD(d); pose = _normP(pose);
    var k = key(g, d, pose, outfitId);
    if (_compCache[k]) return _compCache[k];
    var cv = document.createElement('canvas');
    cv.width = CW; cv.height = CH;
    var cx = cv.getContext('2d');
    if (outfitId && d === 'down') {
      /* Trang phục: nguyên sprite thiết kế sẵn (đã có mặt/tóc riêng), không tách chân. */
      var oe = _load(_outfitPath(outfitId));
      if (!(oe.done && oe.ok && oe.el && oe.el.width)) return null;
      cx.drawImage(oe.el, 0, 0);
    } else {
      var hr = _hairReady(g, d);
      if (hr === null) return null; /* lớp tóc đang tải -> chờ */
      var b, h = null;
      if (hr) {
        /* Tóc tách lớp: body không tóc + chân + tóc vẽ trên cùng. */
        b = _load(_bodyNoHairPath(g, d));
        h = _load(_hairPath(g, d));
      } else {
        b = _load(_bodyPath(g, d));
      }
      var l = _load(_legsPath(g, d, pose));
      if (!(b.done && b.ok && b.el && b.el.width)) return null;
      if (!(l.done && l.ok && l.el && l.el.width)) return null;
      cx.drawImage(b.el, 0, 0);
      cx.drawImage(l.el, 0, 0);
      if (h) cx.drawImage(h.el, 0, 0);
    }
    var ks = Object.keys(_compCache);
    if (ks.length >= _CACHE_MAX) delete _compCache[ks[0]];
    _compCache[k] = cv;
    return cv;
  }

  /* Đếm lớp đã thử tải (cho test/diagnose). */
  function loadedCount() { return Object.keys(_imgs).length; }

  var api = {
    warm: warm, status: status, compose: compose, key: key,
    BASE: BASE, CW: CW, CH: CH, loadedCount: loadedCount,
    _normG: _normG, _normD: _normD, _normP: _normP
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  return api;
})();
