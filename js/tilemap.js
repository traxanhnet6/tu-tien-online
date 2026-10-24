/* ============================================================
 * js/tilemap.js — Hệ tilemap kiểu tutien2d (chạy SONG SONG nền PNG)
 * - Lưới ASCII 40x30 ô, mỗi ô 40px = đúng thế giới 1600x1200.
 * - Dữ liệu grid nằm ở file riêng tilemaps-data.js (global TILEMAPS,
 *   team Data đang viết); file này chỉ chứa logic + bảng LEGEND.
 * - Map chưa có tilemap: mọi hàm trả về "không chặn / không vẽ"
 *   để engine giữ nguyên hành vi cũ với nền PNG.
 * - Node-safe: không chạm DOM/canvas ngoài ctx được truyền vào;
 *   logic thuần (get/charAt/isBlocked/gateAt/ambient) chạy được
 *   trong Node để test-smoke.js require trực tiếp.
 * - Không require/import (global var, khớp phong cách code hiện tại).
 * ============================================================ */

var TILEMAP_COLS = 40;   /* số cột */
var TILEMAP_ROWS = 30;   /* số hàng */
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
    var col = Math.floor(worldX / TILEMAP_CELL);
    var row = Math.floor(worldY / TILEMAP_CELL);
    if (col < 0 || col >= TILEMAP_COLS || row < 0 || row >= TILEMAP_ROWS) return null;
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
    for (var r = 0; r < Math.min(grid.length, TILEMAP_ROWS); r++) {
      var line = grid[r];
      if (line === undefined || line === null) continue;
      for (var c = 0; c < Math.min(line.length, TILEMAP_COLS); c++) {
        if (line[c] !== 'G') continue;
        var gx = c * TILEMAP_CELL + TILEMAP_CELL / 2;
        var gy = r * TILEMAP_CELL + TILEMAP_CELL / 2;
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
    var c0 = 0, c1 = TILEMAP_COLS - 1, r0 = 0, r1 = TILEMAP_ROWS - 1;
    if (viewRect && typeof viewRect.x === 'number' && typeof viewRect.y === 'number' &&
        typeof viewRect.w === 'number' && typeof viewRect.h === 'number') {
      c0 = Math.max(0, Math.floor(viewRect.x / TILEMAP_CELL));
      c1 = Math.min(TILEMAP_COLS - 1, Math.floor((viewRect.x + viewRect.w) / TILEMAP_CELL));
      r0 = Math.max(0, Math.floor(viewRect.y / TILEMAP_CELL));
      r1 = Math.min(TILEMAP_ROWS - 1, Math.floor((viewRect.y + viewRect.h) / TILEMAP_CELL));
    }
    for (var r = r0; r <= r1; r++) {
      var line = grid[r];
      if (line === undefined || line === null) continue;
      for (var c = c0; c <= c1; c++) {
        var ch = line[c];
        if (ch === undefined || ch === '') continue;
        var leg = LEGEND[ch] || LEGEND['.'];
        var px = c * TILEMAP_CELL, py = r * TILEMAP_CELL;
        ctx.fillStyle = leg.color;
        ctx.fillRect(px, py, TILEMAP_CELL, TILEMAP_CELL);
        _decor(ctx, ch, px, py);
      }
    }
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
    get: get,
    charAt: charAt,
    isBlocked: isBlocked,
    gateAt: gateAt,
    draw: draw,
    ambient: ambient,
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Tilemap;
}
