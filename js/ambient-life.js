/* ============================================================
 * js/ambient-life.js — Nền sống động cho Thanh Vân Trấn (map 0)
 * Bui 2026-10-25: "Nền map Thanh Vân Trấn là video động, có tiên
 * bay, mây bay, người người đi lại".
 *
 * Cách hoạt động (KHÔNG dùng file video — video không pan theo
 * camera và nặng máy điện thoại): animation thời gian thực vẽ
 * trong canvas, nhẹ, pan theo camera như mọi entity khác.
 *
 * 3 lớp, tất cả CHỈ chạy ở map 0, nền tranh giữ nguyên:
 *  1. Mây bay: 3-5 đám mây vẽ bằng ellipse mềm, trôi chậm theo
 *     chiều gió, hết biên thì vòng lại. Vẽ ở lớp drawBack (sau
 *     nền tranh, TRƯỚC entity) với alpha thấp nên không bao giờ
 *     che nhân vật/quái/NPC.
 *  2. Tiên bay: 2-3 vị tiên (cưỡi kiếm / cưỡi mây) bay ngang map
 *     theo đường lượn sine nhẹ, có bóng đổ nhỏ dưới đất, hết
 *     biên thì vòng lại và đổi độ cao. Vẽ ở lớp drawFront (trên
 *     entity — tiên bay trên trời nên luôn ở trên là đúng).
 *  3. Người đi lại: 5-8 dân thường chibi đi bộ dọc mạng đường
 *     chính của map 0 (phố chợ, cầu đá, đường nam, sân Võ
 *     Đường, đường trung tâm, đường bắc, cổng tây), đi tới đi
 *     lui theo waypoint rồi vòng lại. Dùng frame đi bộ sẵn đã
 *     tách nền trong assets/ambient/walk_*.
 *     QUAN TRỌNG: đây là dân môi trường RIÊNG — NPC có sẵn của
 *     map vẫn ĐỨNG YÊN như Bui đã chốt, module này không chạm
 *     gì tới NPC, không đổi vị trí NPC nào.
 *
 * Hiệu năng: tối đa 15 thực thể, mỗi thực thể 1 drawImage hoặc
 * vài ellipse, có culling theo vùng camera nhìn thấy. Mức GFX
 * thấp tự giảm số lượng qua setQuality('thap'|'trungbinh'|'cao').
 *
 * Cách gắn vào engine (parent làm ở bản sau, KHÔNG sửa ở đây):
 *  - index.html: thêm <script src="js/ambient-life.js"></script>
 *    sau tilemap.js (trước engine.js cũng được — module độc lập).
 *  - cuối enterMap, sau _spawnMapMonsters(); :
 *      try { if (typeof AmbientLife !== 'undefined') AmbientLife.init(_mapId); } catch (_e) {}
 *  - trong _loop, sau _update(dt); :
 *      try { if (typeof AmbientLife !== 'undefined') AmbientLife.update(dt); } catch (_e) {}
 *    (dt của engine tính bằng GIÂY — module này cũng dùng giây.)
 *  - trong _render, pass world (sau transform camera), ngay sau
 *    khối try { Tilemap.draw(...) } :
 *      try { if (typeof AmbientLife !== 'undefined') AmbientLife.drawBack(_ctx, _visRect()); } catch (_e) {}
 *  - trong _render, cuối pass world, sau vòng y-sort entity,
 *    trước _ctx.restore() của pass world:
 *      try { if (typeof AmbientLife !== 'undefined') AmbientLife.drawFront(_ctx, _visRect()); } catch (_e) {}
 *  - tùy chọn, mức GFX: sau khi đổi _gfxLevel, gọi
 *      AmbientLife.setQuality(_gfxLevel === 'thap' ? 'thap' : (_gfxLevel === 'trungbinh' ? 'trungbinh' : 'cao'));
 *    (mức 'tudong' của engine map thành 'cao').
 *  - tùy chọn nâng cao (y-sort hoàn hảo cho người đi bộ): thay
 *    vì drawFront vẽ người đi bộ, engine có thể lấy
 *    AmbientLife.walkers() rồi chèn vào vòng y-sort entity với
 *    nhánh vẽ AmbientLife.drawWalker(ctx, w). V1 dùng drawFront
 *    là đủ — người đi bộ nhỏ, chồng lấn với nhân vật chỉ thoáng
 *    qua trên đường.
 *
 * Node-safe: không có Image/document thì chỉ cập nhật vị trí,
 * không vẽ, không crash.
 * ============================================================ */
var AmbientLife = (function () {
  'use strict';

  var MAP_ID = 0;
  var WORLD_W = 2240, WORLD_H = 960;
  var WALK_H = 62;   /* chiều cao người đi bộ — khớp sprite NPC */
  var FLY_H = 96;    /* chiều cao tiên bay */

  var quality = 'cao';
  var COUNTS = {
    cao:       { clouds: 5, flyers: 3, walkers: 7 },
    trungbinh: { clouds: 4, flyers: 2, walkers: 5 },
    thap:      { clouds: 3, flyers: 1, walkers: 3 },
  };

  var active = false;
  var time = 0;
  var clouds = [], flyers = [], walkers = [];
  var imgCache = {};

  /* ---------- Ảnh (lazy-load, chưa tải xong thì không vẽ) ---------- */
  function _img(src) {
    if (typeof Image === 'undefined') return null;
    var e = imgCache[src];
    if (e) return e.ok ? e.img : null;
    var im = new Image();
    e = { img: im, ok: false };
    imgCache[src] = e;
    im.onload = function () { e.ok = true; };
    im.onerror = function () { e.ok = false; };
    im.src = src;
    return null;
  }

  function _rand(a, b) { return a + Math.random() * (b - a); }

  /* ---------- 1. Mây bay (vẽ thủ tục, không cần ảnh) ---------- */
  function _makeCloud(i) {
    /* cụm ellipse cố định theo index để mây không đổi hình khi bay */
    var puffs = [];
    var n = 5 + (i % 2);
    for (var k = 0; k < n; k++) {
      puffs.push({
        dx: (k - n / 2) * 34 + ((i * 37 + k * 53) % 21) - 10,
        dy: ((i * 29 + k * 41) % 17) - 14,
        r: 26 + ((i * 13 + k * 29) % 22),
      });
    }
    return {
      x: _rand(0, WORLD_W), baseY: _rand(60, 420),
      vx: _rand(6, 14), /* px/giây, chiều gió đông */
      s: _rand(0.8, 1.6), a: _rand(0.30, 0.45),
      phase: _rand(0, Math.PI * 2), puffs: puffs,
    };
  }

  /* ---------- 2. Tiên bay ---------- */
  var FLYER_DEFS = [
    { src: 'assets/ambient/tien_kiem_bay.png', baseY: 180, speed: 55, dir: 1,  amp: 26 },
    { src: 'assets/ambient/tien_cuoi_may.png', baseY: 280, speed: 42, dir: -1, amp: 32 },
    { src: 'assets/ambient/tien_kiem_bay.png', baseY: 120, speed: 68, dir: 1,  amp: 20, scale: 0.8 },
  ];
  function _makeFlyer(d, i) {
    return {
      src: d.src, dir: d.dir, speed: d.speed, amp: d.amp,
      scale: d.scale || 1, phase: _rand(0, Math.PI * 2),
      x: d.dir > 0 ? -120 : WORLD_W + 120,
      baseY: d.baseY + _rand(-30, 30),
    };
  }

  /* ---------- 3. Người đi lại (tuyến dọc đường, đọc từ tilemap lúc chạy) ---------- */
  /* 2026-10-27: KHÔNG hardcode tuyến map 0 cũ nữa — map 0 đang
   * được vẽ lại (56x40, trấn trên + ngoại ô dưới) nên tuyến phải
   * quét từ lưới tilemap lúc chạy: gom các đoạn '#' (đường đá)
   * liên tiếp theo hàng/dọc thành tuyến thẳng, mỗi tuyến chỉ đi
   * trên ô '#' nên luôn đi bộ được (LEGEND: '#' blockWalk=false).
   * Tuyến thẳng theo hàng/dọc nên đoạn đi giữa 2 waypoint không
   * bao giờ lệch khỏi đường. Không có '#' (hoặc chưa có tilemap)
   * thì fallback '=' (đường đất), cuối cùng mới dùng tuyến cũ. */
  var LEGACY_ROUTES = [
    [[460, 620], [820, 620], [1340, 620]],   /* phố chợ */
    [[1780, 620], [1780, 780], [1780, 860]], /* cầu đá */
    [[180, 940], [420, 940], [740, 940]],    /* đường đất nam */
    [[1420, 140], [1420, 260], [1820, 260]], /* sân Võ Đường */
    [[820, 700], [1220, 700], [1420, 700]],  /* đường trung tâm */
    [[1500, 260], [1820, 260], [1820, 380]], /* đường bắc */
    [[100, 540], [100, 620], [260, 620]],    /* cổng tây */
  ];
  var ROUTES = LEGACY_ROUTES; /* tuyến đang dùng — _build() thay bằng tuyến quét được */
  /* Kích thước thế giới thật của map 0 (tilemap mới 56x40 thì
   * 2240x1600, map 0 cũ 56x24 thì 2240x960); fallback giữ cũ. */
  function _updateWorldSize() {
    try {
      if (typeof Tilemap !== 'undefined' && Tilemap && Tilemap.size) {
        var sz = Tilemap.size(MAP_ID);
        if (sz && sz.w > 0 && sz.h > 0) { WORLD_W = sz.w; WORLD_H = sz.h; return sz; }
      }
    } catch (e) {}
    return null;
  }
  /* Quét 1 ký tự đường ('#' trước, '=' fallback) thành các tuyến
   * thẳng: đoạn liên tiếp >= 3 ô theo hàng hoặc theo cột. Trả về
   * mảng tuyến [[x1,y1],[x2,y2]] (tâm ô), dài nhất trước, rải đều
   * (bỏ tuyến có trung điểm quá gần tuyến đã chọn). */
  function _scanRoadRoutes(ch) {
    var sz = _updateWorldSize();
    var cell = (sz && sz.cell > 0) ? sz.cell : 40;
    var cols = sz ? Math.round(sz.w / cell) : 0;
    var rows = sz ? Math.round(sz.h / cell) : 0;
    if (!cols || !rows) return [];
    if (typeof Tilemap === 'undefined' || !Tilemap.charAt) return [];
    function _isRoad(c, r) {
      try { return Tilemap.charAt(MAP_ID, c * cell + cell / 2, r * cell + cell / 2) === ch; }
      catch (e) { return false; }
    }
    var runs = [], c, r, c0, r0;
    for (r = 0; r < rows; r++) { /* đoạn ngang */
      c = 0;
      while (c < cols) {
        if (!_isRoad(c, r)) { c++; continue; }
        c0 = c;
        while (c < cols && _isRoad(c, r)) c++;
        if (c - c0 >= 3) runs.push({ len: c - c0,
          pts: [[c0 * cell + cell / 2, r * cell + cell / 2], [(c - 1) * cell + cell / 2, r * cell + cell / 2]] });
      }
    }
    for (c = 0; c < cols; c++) { /* đoạn dọc */
      r = 0;
      while (r < rows) {
        if (!_isRoad(c, r)) { r++; continue; }
        r0 = r;
        while (r < rows && _isRoad(c, r)) r++;
        if (r - r0 >= 3) runs.push({ len: r - r0,
          pts: [[c * cell + cell / 2, r0 * cell + cell / 2], [c * cell + cell / 2, (r - 1) * cell + cell / 2]] });
      }
    }
    runs.sort(function (a, b) { return b.len - a.len; });
    var out = [], i, j, picked;
    for (i = 0; i < runs.length && out.length < 12; i++) {
      var mx = (runs[i].pts[0][0] + runs[i].pts[1][0]) / 2;
      var my = (runs[i].pts[0][1] + runs[i].pts[1][1]) / 2;
      picked = false;
      for (j = 0; j < out.length; j++) {
        var omx = (out[j][0][0] + out[j][1][0]) / 2;
        var omy = (out[j][0][1] + out[j][1][1]) / 2;
        if (Math.hypot(mx - omx, my - omy) < 80) { picked = true; break; }
      }
      if (!picked) out.push(runs[i].pts);
    }
    return out;
  }
  function _buildRoutes() {
    var routes = _scanRoadRoutes('#');
    if (!routes.length) routes = _scanRoadRoutes('=');
    ROUTES = routes.length ? routes : LEGACY_ROUTES;
    return ROUTES;
  }
  var DIRS = ['xuong', 'len', 'trai', 'phai'];
  function _makeWalker(routeIdx) {
    var route = ROUTES[routeIdx % ROUTES.length];
    return {
      route: route,
      gender: (routeIdx % 2 === 0) ? 'nam' : 'nu',
      seg: 0, segDir: 1, /* ping-pong dọc tuyến */
      x: route[0][0], y: route[0][1],
      speed: _rand(55, 75), /* px/giây — đi bộ thong thả */
      face: 'xuong', walkT: _rand(0, 0.5),
    };
  }
  function _walkerFrame(w) {
    var f = Math.floor(w.walkT / 0.14) % 4 + 1;
    return 'assets/ambient/walk_' + w.gender + '_' + w.face + '_walk' + f + '.png';
  }

  /* ---------- Xây dựng / chất lượng ---------- */
  function _build() {
    _updateWorldSize(); /* mây/tiên bay theo biên map thật */
    _buildRoutes();     /* dân đi bộ theo đường '#' quét từ tilemap lúc chạy */
    var c = COUNTS[quality] || COUNTS.cao;
    clouds = []; flyers = []; walkers = [];
    for (var i = 0; i < c.clouds; i++) clouds.push(_makeCloud(i));
    for (var j = 0; j < c.flyers; j++) flyers.push(_makeFlyer(FLYER_DEFS[j], j));
    for (var k = 0; k < c.walkers; k++) {
      var w = _makeWalker(k);
      /* rải đều người đi bộ dọc tuyến để không tụm một chỗ */
      w.seg = k % (w.route.length - 1);
      w.x = w.route[w.seg][0];
      w.y = w.route[w.seg][1];
      walkers.push(w);
    }
  }

  function init(mapId) {
    if (mapId !== MAP_ID) { active = false; clouds = []; flyers = []; walkers = []; return; }
    active = true;
    time = 0;
    _build();
  }

  function setQuality(level) {
    if (level === 'thap' || level === 'trungbinh' || level === 'cao') quality = level;
    if (active) _build();
  }

  /* ---------- Cập nhật (dt tính bằng GIÂY) ---------- */
  function update(dt) {
    if (!active) return;
    if (!dt || dt <= 0) dt = 0.016;
    if (dt > 0.25) dt = 0.25;
    time += dt;
    var i, c, f, w;
    for (i = 0; i < clouds.length; i++) {
      c = clouds[i];
      c.x += c.vx * dt;
      if (c.x - 130 * c.s > WORLD_W) c.x = -130 * c.s;
    }
    for (i = 0; i < flyers.length; i++) {
      f = flyers[i];
      f.x += f.dir * f.speed * dt;
      if (f.dir > 0 && f.x > WORLD_W + 130) { f.x = -130; f.baseY = _rand(100, 340); }
      if (f.dir < 0 && f.x < -130) { f.x = WORLD_W + 130; f.baseY = _rand(100, 340); }
    }
    for (i = 0; i < walkers.length; i++) {
      w = walkers[i];
      var tx = w.route[w.seg + w.segDir][0];
      var ty = w.route[w.seg + w.segDir][1];
      var dx = tx - w.x, dy = ty - w.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var step = w.speed * dt;
      if (dist <= step) {
        w.x = tx; w.y = ty;
        w.seg += w.segDir;
        if (w.seg >= w.route.length - 1) { w.seg = w.route.length - 1; w.segDir = -1; }
        else if (w.seg <= 0) { w.seg = 0; w.segDir = 1; }
      } else {
        w.x += dx / dist * step;
        w.y += dy / dist * step;
        if (Math.abs(dx) > Math.abs(dy)) w.face = dx > 0 ? 'phai' : 'trai';
        else w.face = dy > 0 ? 'xuong' : 'len';
        w.walkT += dt;
      }
    }
  }

  /* ---------- Vẽ ---------- */
  function _inView(vr, x, y, m) {
    if (!vr) return true;
    return x >= vr.x - m && x <= vr.x + vr.w + m && y >= vr.y - m && y <= vr.y + vr.h + m;
  }

  /* Lớp sau nền, trước entity: mây — không bao giờ che gameplay. */
  function drawBack(ctx, vr) {
    if (!active || !ctx) return;
    for (var i = 0; i < clouds.length; i++) {
      var c = clouds[i];
      var y = c.baseY + Math.sin(time * 0.12 + c.phase) * 6;
      if (!_inView(vr, c.x, y, 160 * c.s)) continue;
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,' + c.a.toFixed(3) + ')';
      for (var k = 0; k < c.puffs.length; k++) {
        var p = c.puffs[k];
        ctx.beginPath();
        ctx.ellipse(c.x + p.dx * c.s, y + p.dy * c.s, p.r * c.s, p.r * 0.62 * c.s, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  /* Lớp trên entity: tiên bay (trên trời). Người đi bộ được
   * engine y-sort cùng entities qua drawWalker (xem engine.js). */
  function drawFlyers(ctx, vr) {
    if (!active || !ctx) return;
    var i, f, im, w, h;
    for (i = 0; i < flyers.length; i++) {
      f = flyers[i];
      var fy = f.baseY + Math.sin(time * 1.2 + f.phase) * f.amp;
      if (!_inView(vr, f.x, fy, 140)) continue;
      /* bóng đổ nhỏ dưới đất */
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath();
      ctx.ellipse(f.x, fy + 150, 18, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      im = _img(f.src);
      if (!im) continue;
      h = FLY_H * f.scale;
      w = h * (im.width / im.height);
      ctx.save();
      if (f.dir < 0) { ctx.translate(f.x, fy); ctx.scale(-1, 1); ctx.drawImage(im, -w / 2, -h / 2, w, h); }
      else ctx.drawImage(im, f.x - w / 2, fy - h / 2, w, h);
      ctx.restore();
    }
  }

  /* Tương thích cũ: tiên bay + người đi bộ (engine mới chỉ dùng
   * drawFlyers, người đi bộ đi qua vòng y-sort). */
  function drawFront(ctx, vr) {
    drawFlyers(ctx, vr);
    if (!active || !ctx) return;
    for (var i = 0; i < walkers.length; i++) drawWalker(ctx, walkers[i], vr);
  }

  /* Vẽ 1 người đi bộ (để engine có thể y-sort nếu muốn). */
  function drawWalker(ctx, w, vr) {
    if (!ctx || !w) return;
    if (vr && !_inView(vr, w.x, w.y, 80)) return;
    var im = _img(_walkerFrame(w));
    if (!im) return;
    var h = WALK_H;
    var wd = h * (im.width / im.height);
    ctx.drawImage(im, w.x - wd / 2, w.y - h / 2, wd, h);
  }

  return {
    init: init,
    setQuality: setQuality,
    update: update,
    drawBack: drawBack,
    drawFlyers: drawFlyers,
    drawFront: drawFront,
    drawWalker: drawWalker,
    walkers: function () { return walkers; },
    routes: function () { return ROUTES; },
    isActive: function () { return active; },
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = AmbientLife;
