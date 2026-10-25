/* ============================================================
 * js/tilemap.js — Hệ tilemap kiểu tutien2d (chạy SONG SONG nền PNG)
 * - Lưới ASCII, mỗi ô 40px. Kích thước lấy theo từng map trong dữ
 *   liệu (def.cols/def.rows, hoặc số hàng/cột thực của grid);
 *   mặc định 40x30 (thế giới 1600x1200). Map 0 Thanh Vân Trấn
 *   56x24 (2240x960) từ build 103: dùng def.bgImage (tranh mẫu
 *   của Bui) làm nền, lưới chỉ còn làm logic va chạm/cổng/spawn.
 * - Dữ liệu grid nằm ở file riêng tilemaps-data.js (global TILEMAPS,
 *   team Data đang viết); file này chỉ chứa logic + bảng LEGEND.
 * - Map chưa có tilemap: mọi hàm trả về "không chặn / không vẽ"
 *   để engine giữ nguyên hành vi cũ với nền PNG.
 * - Node-safe: không chạm DOM/canvas ngoài ctx được truyền vào;
 *   logic thuần (get/charAt/isBlocked/gateAt/ambient) chạy được
 *   trong Node để test-smoke.js require trực tiếp.
 * - Không require/import (global var, khớp phong cách code hiện tại).
 * ============================================================ */

var TILEMAP_COLS = 40;   /* số cột mặc định (map chưa khai cols) */
var TILEMAP_ROWS = 30;   /* số hàng mặc định (map chưa khai rows) */
var TILEMAP_CELL = 40;   /* kích thước 1 ô (px) */

/* LEGEND: ký tự -> thuộc tính ô.
 * blockWalk: chặn đi bộ. blockFly: chặn cả bay (chỉ vách đá '^').
 * Mọi ký tự còn lại (kể cả ký tự lạ) được coi như cỏ: đi/bay được. */
var LEGEND = {
  '.': { name: 'co',     color: '#7da05c', blockWalk: false, blockFly: false },
  ',': { name: 'co_cao', color: '#6b9448', blockWalk: false, blockFly: false },
  '#': { name: 'duong_da',  color: '#b8b0a0', blockWalk: false, blockFly: false },
  '=': { name: 'duong_dat', color: '#a08055', blockWalk: false, blockFly: false },
  '~': { name: 'nuoc',   color: '#4a80c0', blockWalk: true,  blockFly: false },
  'T': { name: 'cay',    color: '#3d7a3d', blockWalk: true,  blockFly: false },
  'Y': { name: 'cay_thong', color: '#2d6a4a', blockWalk: true,  blockFly: false },
  '^': { name: 'vach_da', color: '#6a6a72', blockWalk: true,  blockFly: true },
  'o': { name: 'da_tang', color: '#8a8a8a', blockWalk: true,  blockFly: false },
  'H': { name: 'nha',    color: '#c08060', blockWalk: true,  blockFly: false },
  'P': { name: 'dinh',   color: '#d0a050', blockWalk: true,  blockFly: false },
  'B': { name: 'cau',    color: '#a08060', blockWalk: false, blockFly: false },
  'Q': { name: 'quang_truong', color: '#c8c0b0', blockWalk: false, blockFly: false },
  '*': { name: 'hoa',    color: '#c080c0', blockWalk: false, blockFly: false },
  'S': { name: 'den_da', color: '#9a9a9a', blockWalk: true,  blockFly: false },
  'G': { name: 'cong',   color: '#ffd700', blockWalk: false, blockFly: false },
};

var Tilemap = (function () {
  'use strict';

  /* Lấy bảng TILEMAPS global (tilemaps-data.js), chịu được cả dạng
   * object keyed theo mapId lẫn mảng index theo mapId. */
  function _allMaps() {
    if (typeof TILEMAPS !== 'undefined' && TILEMAPS) return TILEMAPS;
    if (typeof globalThis !== 'undefined' && globalThis.TILEMAPS) return globalThis.TILEMAPS;
    return null;
  }

  /* Chuẩn hóa grid của 1 def về mảng hàng (mỗi hàng là string hoặc
   * mảng ký tự). Chấp nhận def.grid / def.rows / def.tiles / def.map /
   * def.data, hoặc chính def là mảng hàng, hoặc 1 string nhiều dòng. */
  function _gridOf(def) {
    if (!def) return null;
    var g = def.grid || def.rows || def.tiles || def.map || def.data || null;
    if (!g && Array.isArray(def)) g = def;
    if (typeof g === 'string') g = g.split(/\r?\n/);
    if (!Array.isArray(g)) return null;
    return g;
  }

  /* Kích thước thực của 1 map: ưu tiên def.cols/def.rows/def.cell,
   * rồi số hàng/cột thực của grid, cuối cùng là mặc định 40x30.
   * Map 0 (56x24) và các map 40x30 đều đi qua đây nên không còn
   * chỗ nào hardcode 40x30 cho riêng 1 map nữa. */
  function _dims(def) {
    var grid = _gridOf(def);
    var cols = TILEMAP_COLS, rows = TILEMAP_ROWS, cell = TILEMAP_CELL;
    if (def) {
      if (typeof def.cell === 'number' && def.cell > 0) cell = def.cell;
      if (typeof def.cols === 'number' && def.cols > 0) cols = def.cols;
      else if (grid && grid[0] !== undefined && grid[0] !== null) cols = grid[0].length;
      if (typeof def.rows === 'number' && def.rows > 0) rows = def.rows;
      else if (grid) rows = grid.length;
    }
    return { cols: cols, rows: rows, cell: cell, w: cols * cell, h: rows * cell };
  }

  /* Kích thước pixel thế giới của map (engine dùng để kẹp camera /
   * nhân vật đúng biên map mở rộng). Map không có tilemap -> null. */
  function size(mapId) {
    var def = get(mapId);
    if (!def) return null;
    return _dims(def);
  }

  /* Tọa độ cổng về px world: ưu tiên x/y, rồi col/row (tâm ô). */
  function _gatePos(gate) {
    if (!gate) return null;
    var x = null, y = null;
    if (typeof gate.x === 'number') x = gate.x;
    else if (typeof gate.col === 'number') x = gate.col * TILEMAP_CELL + TILEMAP_CELL / 2;
    else if (typeof gate.cx === 'number') x = gate.cx;
    if (typeof gate.y === 'number') y = gate.y;
    else if (typeof gate.row === 'number') y = gate.row * TILEMAP_CELL + TILEMAP_CELL / 2;
    else if (typeof gate.cy === 'number') y = gate.cy;
    if (x === null || y === null) return null;
    return { x: x, y: y };
  }

  /* Vẽ 1 hình tròn decor, guard để mock ctx thiếu arc cũng không crash. */
  function _circle(ctx, x, y, r) {
    if (typeof ctx.beginPath !== 'function' || typeof ctx.arc !== 'function') return;
    if (typeof ctx.fill !== 'function') return;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  /* Ký hiệu decor đơn giản cho vài loại ô (nền đã có màu riêng). */
  function _decor(ctx, ch, px, py) {
    var cx = px + TILEMAP_CELL / 2, cy = py + TILEMAP_CELL / 2;
    if (ch === 'T' || ch === 'Y') {
      ctx.fillStyle = ch === 'T' ? '#2d5a2d' : '#1d4a34';
      _circle(ctx, cx, cy - 2, ch === 'T' ? 14 : 12);
      ctx.fillStyle = '#5a4028';
      if (typeof ctx.fillRect === 'function') ctx.fillRect(cx - 2, cy + 8, 4, 10);
    } else if (ch === 'o') {
      ctx.fillStyle = '#6a6a6a';
      _circle(ctx, cx, cy, 10);
    } else if (ch === 'H' || ch === 'P') {
      ctx.fillStyle = ch === 'H' ? '#a06040' : '#b08030';
      if (typeof ctx.fillRect === 'function') ctx.fillRect(px + 6, py + 8, 28, 24);
    } else if (ch === 'S') {
      ctx.fillStyle = '#6a6a6a';
      _circle(ctx, cx, cy, 6);
    } else if (ch === '*') {
      ctx.fillStyle = '#ff80c0';
      _circle(ctx, cx - 8, cy - 6, 3);
      _circle(ctx, cx + 8, cy + 4, 3);
      _circle(ctx, cx, cy + 8, 3);
    } else if (ch === 'G') {
      ctx.fillStyle = '#b09000';
      if (typeof ctx.strokeRect === 'function') ctx.strokeRect(px + 4, py + 4, 32, 32);
    }
  }

  /* ---------- Lớp object trang trí (build 101) ----------
   * Dữ liệu nằm ở tilemap-objects.js (global TILEMAP_OBJECTS):
   * keyed theo mapId, mỗi object {col, row, w, h, sprite} với
   * col/row = ô neo góc trên-trái, w/h = số ô chiếm chỗ,
   * sprite = file trong assets/objects/. Object CHỈ trang trí,
   * không chặn di chuyển (isBlocked vẫn chỉ đọc ký tự tile).
   * Ảnh nạp lười (lazy) và cache theo đường dẫn; khung hình nào
   * ảnh chưa tải xong thì bỏ qua object đó, không crash và
   * không xóa tile nền bên dưới (tile đã vẽ trước). */

  var _objImgCache = {};

  /* Cache ảnh nền tranh (def.bgImage, build 103). Node: không có Image. */
  var _bgImgCache = {};

  function _bgImg(src) {
    if (typeof Image === 'undefined') return null;
    var img = _bgImgCache[src];
    if (!img) {
      img = new Image();
      img.src = src;
      _bgImgCache[src] = img;
    }
    return img;
  }

  function _objImg(sprite) {
    if (typeof Image === 'undefined') return null; /* Node: không có Image */
    var src = 'assets/objects/' + sprite;
    var img = _objImgCache[src];
    if (!img) {
      img = new Image();
      img.src = src;
      _objImgCache[src] = img;
    }
    return img;
  }

  /* ---------- Lớp tile đường đi/lối lại (build 105) ----------
   * Ảnh tile 40x40 trong assets/tiles/, vẽ thay màu phẳng cho các
   * ô đường để không còn mảng xám/nâu đơn điệu (từng bị chê ở map 0).
   * Biến thể chọn bằng hash tọa độ ô để xen kẽ tự nhiên, tránh lặp
   * đều. Ảnh nạp lười + cache như object; khung nào ảnh chưa tải
   * xong thì vẽ màu phẳng cũ tạm, không crash. Node-safe. */
  var _tileImgCache = {};
  var TILE_IMGS = {
    '#': ['road_stone_0.png', 'road_stone_1.png', 'road_stone_2.png', 'road_stone_3.png'],
    '=': ['road_dirt_0.png', 'road_dirt_1.png', 'road_dirt_2.png', 'road_dirt_3.png'],
    'B': ['bridge_0.png', 'bridge_1.png', 'bridge_2.png', 'bridge_3.png'],
    'Q': ['plaza_0.png', 'plaza_1.png', 'plaza_2.png', 'plaza_3.png'],
  };

  function _tileImg(file) {
    if (typeof Image === 'undefined') return null; /* Node: không có Image */
    var src = 'assets/tiles/' + file;
    var img = _tileImgCache[src];
    if (!img) {
      img = new Image();
      img.src = src;
      _tileImgCache[src] = img;
    }
    return img;
  }

  function _tileVariant(col, row, n) {
    var h = ((col * 73856093) ^ (row * 19349663)) >>> 0;
    return h % n;
  }

  /* Vẽ 1 ô đường bằng ảnh tile nếu tải xong, ngược lại trả false
   * để caller vẽ màu phẳng cũ. */
  function _drawRoadTile(ctx, ch, col, row, px, py) {
    var list = TILE_IMGS[ch];
    if (!list || !list.length) return false;
    if (!ctx || typeof ctx.drawImage !== 'function') return false;
    var img = _tileImg(list[_tileVariant(col, row, list.length)]);
    if (!img || !img.complete || !img.naturalWidth) return false;
    ctx.drawImage(img, px, py, TILEMAP_CELL, TILEMAP_CELL);
    return true;
  }

  /* Danh sách object của map, hoặc [] nếu map không có object. */
  function objects(mapId) {
    var objs = null;
    if (typeof TILEMAP_OBJECTS !== 'undefined' && TILEMAP_OBJECTS) objs = TILEMAP_OBJECTS;
    else if (typeof globalThis !== 'undefined' && globalThis.TILEMAP_OBJECTS) objs = globalThis.TILEMAP_OBJECTS;
    if (!objs) return [];
    var list = objs[mapId];
    if (list === undefined && objs[String(mapId)] !== undefined) list = objs[String(mapId)];
    return Array.isArray(list) ? list : [];
  }

  /* Vẽ lớp object đè lên nền tile (sau tile, trước cổng/NPC/quái/
   * người chơi — vì engine vẽ các lớp đó sau Tilemap.draw).
   * Trả về số object đã vẽ trong khung hình này. */
  function drawObjects(ctx, mapId, viewRect) {
    if (!ctx || typeof ctx.drawImage !== 'function') return 0;
    var list = objects(mapId);
    if (!list.length) return 0;
    var drawn = 0;
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      if (!o || typeof o.col !== 'number' || typeof o.row !== 'number') continue;
      if (!o.sprite) continue;
      var w = (typeof o.w === 'number' && o.w > 0) ? o.w : 1;
      var h = (typeof o.h === 'number' && o.h > 0) ? o.h : 1;
      var px = o.col * TILEMAP_CELL, py = o.row * TILEMAP_CELL;
      var pw = w * TILEMAP_CELL, ph = h * TILEMAP_CELL;
      if (viewRect && typeof viewRect.x === 'number' && typeof viewRect.w === 'number') {
        if (px + pw < viewRect.x || px > viewRect.x + viewRect.w ||
            py + ph < viewRect.y || py > viewRect.y + viewRect.h) continue;
      }
      var img = _objImg(o.sprite);
      if (!img || !img.complete || !img.naturalWidth) continue; /* chưa tải xong: bỏ qua */
      ctx.drawImage(img, px, py, pw, ph);
      drawn++;
    }
    return drawn;
  }

  /* def tilemap của map, hoặc null nếu map chưa có tilemap. */
  function get(mapId) {
    var maps = _allMaps();
    if (!maps) return null;
    var def = maps[mapId];
    if (def === undefined && maps[String(mapId)] !== undefined) def = maps[String(mapId)];
    return def || null;
  }

  /* Ký tự tại tọa độ world (px), null nếu ngoài map hoặc chưa có grid. */
  function charAt(mapId, worldX, worldY) {
    var def = get(mapId);
    if (!def) return null;
    var grid = _gridOf(def);
    if (!grid) return null;
    if (typeof worldX !== 'number' || typeof worldY !== 'number') return null;
    if (worldX < 0 || worldY < 0) return null;
    var dm = _dims(def);
    var col = Math.floor(worldX / dm.cell);
    var row = Math.floor(worldY / dm.cell);
    if (col < 0 || col >= dm.cols || row < 0 || row >= dm.rows) return null;
    var line = grid[row];
    if (line === undefined || line === null) return null;
    var ch = line[col];
    return (ch === undefined || ch === '') ? null : ch;
  }

  /* Ô có chặn không. flying=true: chỉ vách đá '^' mới chặn.
   * Map không có tilemap -> false (giữ hành vi cũ, không chặn). */
  function isBlocked(mapId, worldX, worldY, flying) {
    var ch = charAt(mapId, worldX, worldY);
    if (ch === null) return false;
    var leg = LEGEND[ch];
    if (!leg) return false; /* ký tự lạ: coi như cỏ */
    return flying ? leg.blockFly : leg.blockWalk;
  }

  /* Gate def gần nhất trong bán kính 1 ô (40px), hoặc null.
   * Ưu tiên def.gates; nếu def không có gates thì quét các ô 'G'
   * trên grid và trả về gate tổng hợp {to: null, x, y, col, row}. */
  function gateAt(mapId, worldX, worldY) {
    var def = get(mapId);
    if (!def) return null;
    if (typeof worldX !== 'number' || typeof worldY !== 'number') return null;
    var best = null, bestD = TILEMAP_CELL;
    var gates = Array.isArray(def.gates) ? def.gates : [];
    for (var i = 0; i < gates.length; i++) {
      var pos = _gatePos(gates[i]);
      if (!pos) continue;
      var d = Math.hypot(pos.x - worldX, pos.y - worldY);
      if (d <= bestD) { bestD = d; best = gates[i]; }
    }
    if (best) return best;
    if (gates.length) return null; /* có gates nhưng không cái nào đủ gần */
    var grid = _gridOf(def);
    if (!grid) return null;
    var dm2 = _dims(def);
    for (var r = 0; r < Math.min(grid.length, dm2.rows); r++) {
      var line = grid[r];
      if (line === undefined || line === null) continue;
      for (var c = 0; c < Math.min(line.length, dm2.cols); c++) {
        if (line[c] !== 'G') continue;
        var gx = c * dm2.cell + dm2.cell / 2;
        var gy = r * dm2.cell + dm2.cell / 2;
        var gd = Math.hypot(gx - worldX, gy - worldY);
        if (gd <= bestD) {
          bestD = gd;
          best = { to: null, x: gx, y: gy, col: c, row: r, fromGrid: true };
        }
      }
    }
    return best;
  }

  /* Vẽ nền tilemap lên ctx (tọa độ world — engine đã áp transform
   * camera/zoom trước khi gọi, nên tham số zoom không đổi tọa độ vẽ,
   * chỉ giữ trong chữ ký để sau này dùng nếu cần).
   * viewRect {x, y, w, h} theo tọa độ world để culling; không có
   * viewRect thì vẽ toàn map. Map không có tilemap -> false để
   * engine vẽ nền PNG cũ. Vẽ xong -> true. */
  function draw(ctx, mapId, viewRect, zoom) {
    void zoom; /* tọa độ world, engine tự transform */
    var def = get(mapId);
    if (!def) return false;
    var grid = _gridOf(def);
    if (!grid) return false;
    if (!ctx || typeof ctx.fillRect !== 'function') return false;
    var dm3 = _dims(def);
    /* Map dùng tranh làm nền (build 103, map 0): vẽ tranh phủ toàn
     * world thay cho ô tile + object; lưới tile CHỈ còn làm logic
     * (isBlocked/gateAt/spawn). Tranh phải đúng tỉ lệ world để ô
     * lưới khớp vùng tranh. Ảnh chưa tải xong -> vẫn trả true để
     * engine không vẽ nền PNG đè lên (khung hình sau sẽ có ảnh). */
    if (typeof def.bgImage === 'string' && def.bgImage) {
      var bg = _bgImg(def.bgImage);
      if (bg && bg.complete && bg.naturalWidth && ctx && typeof ctx.drawImage === 'function') {
        var sm = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(bg, 0, 0, dm3.cols * dm3.cell, dm3.rows * dm3.cell);
        ctx.imageSmoothingEnabled = sm;
      }
      return true;
    }
    var c0 = 0, c1 = dm3.cols - 1, r0 = 0, r1 = dm3.rows - 1;
    if (viewRect && typeof viewRect.x === 'number' && typeof viewRect.y === 'number' &&
        typeof viewRect.w === 'number' && typeof viewRect.h === 'number') {
      c0 = Math.max(0, Math.floor(viewRect.x / dm3.cell));
      c1 = Math.min(dm3.cols - 1, Math.floor((viewRect.x + viewRect.w) / dm3.cell));
      r0 = Math.max(0, Math.floor(viewRect.y / dm3.cell));
      r1 = Math.min(dm3.rows - 1, Math.floor((viewRect.y + viewRect.h) / dm3.cell));
    }
    for (var r = r0; r <= r1; r++) {
      var line = grid[r];
      if (line === undefined || line === null) continue;
      for (var c = c0; c <= c1; c++) {
        var ch = line[c];
        if (ch === undefined || ch === '') continue;
        var leg = LEGEND[ch] || LEGEND['.'];
        var px = c * TILEMAP_CELL, py = r * TILEMAP_CELL;
        /* Ô đường: ưu tiên ảnh tile, chưa tải xong thì màu phẳng cũ. */
        if (!_drawRoadTile(ctx, ch, c, r, px, py)) {
          ctx.fillStyle = leg.color;
          ctx.fillRect(px, py, TILEMAP_CELL, TILEMAP_CELL);
        }
        _decor(ctx, ch, px, py);
      }
    }
    /* Lớp object trang trí đè lên nền tile (build 101). */
    drawObjects(ctx, mapId, viewRect);
    return true;
  }

  /* Màu ambient của map (lớp phủ), hoặc null nếu map không định nghĩa. */
  function ambient(mapId) {
    var def = get(mapId);
    if (!def) return null;
    if (typeof def.ambient === 'string') return def.ambient;
    if (typeof def.ambientColor === 'string') return def.ambientColor;
    return null;
  }

  return {
    COLS: TILEMAP_COLS,
    ROWS: TILEMAP_ROWS,
    CELL: TILEMAP_CELL,
    LEGEND: LEGEND,
    size: size,
    get: get,
    charAt: charAt,
    isBlocked: isBlocked,
    gateAt: gateAt,
    draw: draw,
    objects: objects,
    drawObjects: drawObjects,
    ambient: ambient,
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Tilemap;
}
