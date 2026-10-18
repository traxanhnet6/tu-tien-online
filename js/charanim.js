/* ============================================================
 * js/charanim.js — Skeletal Animation Engine cho nhân vật
 * (Bui yêu cầu 2026-10-18: "Hình ảnh chuyển động chi tiết cụ thể các bộ phận")
 *
 * Hệ thống xương 2D: mỗi bộ phận cơ thể là 1 sprite riêng,
 * xoay/quay quanh pivot, nội suy keyframe theo thời gian.
 *
 * Bộ phận: dau, toc, co, than, ao, quan,
 *          tay_trai_tren, tay_trai_duoi, tay_phai_tren, tay_phai_duoi,
 *          chan_trai_tren, chan_trai_duoi, chan_phai_tren, chan_phai_duoi
 *
 * Animation: idle, walk, run, jump,
 *   atk_kiem, atk_dao, atk_thuong, atk_cung, atk_phien,
 *   atk_tieu, atk_roi, atk_liem, atk_kiemhap, atk_but,
 *   charge (tụ lực), hit (bị đánh), die (chết)
 *
 * Node-safe: không đụng DOM trực tiếp khi require.
 * ============================================================ */
(function (global) {
  "use strict";

  var MANIFEST = null;
  var _imgCache = {};

  /* ---------- Load manifest ---------- */
  function loadManifest(m) {
    MANIFEST = m;
    return true;
  }

  function getManifest() { return MANIFEST; }

  /* ---------- Image loading (browser) ---------- */
  function _getImg(src) {
    if (typeof document === "undefined") return null;
    if (!_imgCache[src]) {
      var img = new Image();
      img.src = src;
      _imgCache[src] = img;
    }
    return _imgCache[src];
  }

  /* ---------- Keyframe interpolation ---------- */
  // track: [{t, rot, dx, dy, sx, sy}] — t in [0,1]
  function _interpTrack(track, t) {
    if (!track || !track.length) return { rot: 0, dx: 0, dy: 0, sx: 1, sy: 1 };
    if (track.length === 1) return track[0];
    // wrap time
    t = ((t % 1) + 1) % 1;
    var i, a = track[0], b = track[track.length - 1];
    for (i = 0; i < track.length - 1; i++) {
      if (t >= track[i].t && t <= track[i + 1].t) {
        a = track[i]; b = track[i + 1];
        break;
      }
    }
    var span = (b.t - a.t) || 1;
    var k = (t - a.t) / span;
    // smoothstep easing
    k = k * k * (3 - 2 * k);
    function lerp(x, y) { return x + (y - x) * k; }
    return {
      rot: lerp(a.rot || 0, b.rot || 0),
      dx:  lerp(a.dx  || 0, b.dx  || 0),
      dy:  lerp(a.dy  || 0, b.dy  || 0),
      sx:  lerp(a.sx  == null ? 1 : a.sx, b.sx == null ? 1 : b.sx),
      sy:  lerp(a.sy  == null ? 1 : a.sy, b.sy == null ? 1 : b.sy)
    };
  }

  /* ---------- Pose evaluation ---------- */
  // Returns {partName: {rot, dx, dy, sx, sy}} for given anim + time
  function evalPose(animName, t, opts) {
    opts = opts || {};
    var result = {};
    if (!MANIFEST || !MANIFEST.animations) return result;
    var anim = MANIFEST.animations[animName];
    if (!anim) anim = MANIFEST.animations.idle;
    if (!anim) return result;

    var parts = (anim.parts) || {};
    // base pose first
    var base = MANIFEST.animations._base;
    if (base && base.parts) {
      for (var p in base.parts) {
        result[p] = _interpTrack(base.parts[p], t);
      }
    }
    // overlay anim tracks
    for (var pn in parts) {
      result[pn] = _interpTrack(parts[pn], t);
    }
    return result;
  }

  /* ---------- Draw skeleton ---------- */
  // ctx: canvas 2d context, x/y: feet position, scale: pixels per unit
  // opts: {dir (1/-1), equip: {slot: imgSrc}, tint, alpha, flip}
  function draw(ctx, x, y, animName, t, opts) {
    if (!MANIFEST || !MANIFEST.parts) return false;
    opts = opts || {};
    var dir = opts.dir || 1;
    var pose = evalPose(animName, t, opts);
    var scale = opts.scale || 1;

    // sort parts by z-order
    var order = Object.keys(MANIFEST.parts).sort(function (a, b) {
      return (MANIFEST.parts[a].z || 0) - (MANIFEST.parts[b].z || 0);
    });

    ctx.save();
    if (opts.alpha != null) ctx.globalAlpha = opts.alpha;
    // hit flash red
    var flashRed = opts.flashRed;

    for (var i = 0; i < order.length; i++) {
      var pn = order[i];
      var def = MANIFEST.parts[pn];
      // equipment override: e.g. "mu" (hat) replaces "toc" layer visually
      var src = def.img;
      if (opts.equip && opts.equip[pn]) src = opts.equip[pn];
      // gender: swap nam_ -> nu_ for female character (Bui 2026-10-18)
      if (opts.gender === "nu" && src && src.indexOf("nam_") >= 0) {
        src = src.replace("nam_", "nu_");
      }

      var img = _getImg(src);
      if (!img || !img.complete || !img.naturalWidth) continue;

      var tr = pose[pn] || { rot: 0, dx: 0, dy: 0, sx: 1, sy: 1 };
      var pv = def.pivot || [0.5, 0.5];
      var anchor = def.anchor || [0, 0]; // offset from feet in base units

      // position: feet + anchor + keyframe offset
      var px = x + (anchor[0] + tr.dx) * scale * dir;
      var py = y + (anchor[1] + tr.dy) * scale;

      ctx.save();
      ctx.translate(px, py);
      ctx.scale(dir * tr.sx, tr.sy);
      if (tr.rot) ctx.rotate(tr.rot * dir);
      // draw centered on pivot
      var w = img.naturalWidth, h = img.naturalHeight;
      var ds = (def.drawScale || 1) * scale / (def.nativeScale || 1);
      // normalize: draw at reference size
      var dw = w * ds, dh = h * ds;
      ctx.drawImage(img, -pv[0] * dw, -pv[1] * dh, dw, dh);
      ctx.restore();
    }

    // red flash overlay for hit
    if (flashRed) {
      ctx.globalAlpha = 0.35 * flashRed;
      ctx.fillStyle = '#ff2222';
      // approximate body bounds
      ctx.fillRect(x - 20 * scale, y - 60 * scale, 40 * scale, 60 * scale);
      ctx.globalAlpha = opts.alpha != null ? opts.alpha : 1;
    }

    ctx.restore();
    return true;
  }

  /* ---------- Animation timing helpers ---------- */
  var SPEEDS = {
    idle: 2.0, walk: 1.6, run: 0.9, jump: 0.8,
    atk: 0.45, charge: 1.2, hit: 0.35, die: 1.0
  };

  function animDuration(name) {
    if (name.indexOf('atk_') === 0) return SPEEDS.atk;
    return SPEEDS[name] || SPEEDS.idle;
  }

  /* ---------- Auto-load manifest in browser ---------- */
  function autoInit() {
    if (typeof fetch === "undefined" || MANIFEST) return;
    // try common base paths
    var paths = ["assets/parts_manifest.json", "./assets/parts_manifest.json"];
    (function tryNext(i) {
      if (i >= paths.length || MANIFEST) return;
      fetch(paths[i]).then(function (r) {
        if (!r.ok) throw 0;
        return r.json();
      }).then(function (m) {
        loadManifest(m);
      }).catch(function () { tryNext(i + 1); });
    })(0);
  }

  // auto-init on load in browser
  if (typeof window !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", autoInit);
    } else {
      setTimeout(autoInit, 100);
    }
  }

  /* ---------- Public API ---------- */
  var CharAnim = {
    loadManifest: loadManifest,
    getManifest: getManifest,
    evalPose: evalPose,
    draw: draw,
    animDuration: animDuration,
    autoInit: autoInit,
    SPEEDS: SPEEDS,
    // for tests
    _interpTrack: _interpTrack
  };

  // Export
  if (typeof module !== "undefined" && module.exports) {
    module.exports = CharAnim;
  } else {
    global.CharAnim = CharAnim;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
