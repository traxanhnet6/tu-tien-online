/* ============================================================
 * js/engine.js — Vòng lặp game + render canvas top-down (tutien2d)
 * - World 1600x1200, camera theo player
 * - Điều khiển: phím mũi tên/WASD, Engine.joy {dx,dy} (ui.js ghi),
 *   chạm canvas để đi tới điểm chạm
 * - Auto: tìm quái gần nhất, đánh qua Combat; quái respawn giữ ~6
 *   con/map; boss 1 con/map, hồi sinh 120s
 * - Cổng chuyển map → Engine.onGate(to); Space/? → tryInteract →
 *   Engine.onNpc(npcId); kill → Engine.onKill(monster)
 * - Bí cảnh ngẫu nhiên: enterDungeonRun(run, def) / nextStage() /
 *   onStageClear / onDungeonDone
 * - Đồ họa: GFX_LEVELS + tự động đo FPS mỗi 3s (contract INTERFACES.md)
 * - Hiển thị người chơi: lọc theo state.settings.showPlayers
 * - Ảnh thiếu → hình chữ nhật màu + tên (không crash)
 * - Mọi gọi AudioSys/Combat/t/UI đều có guard (chạy được trên node)
 * Phụ thuộc lúc chạy: MAPS/MONSTERS/NPCS/ELEMENTS (data.js, fallback
 * nội bộ nếu chưa có), baseStats (stages.js), Combat, AudioSys, t, UI.
 * ============================================================ */

var Engine = (function () {
  'use strict';

  /* ---------- Hằng số ---------- */
  var WORLD_W = 1600, WORLD_H = 1200;
  /* Build mở rộng map 0 (2026-10-25): thế giới không còn cố định
   * 1600x1200 — map có tilemap thì lấy đúng kích thước pixel của nó
   * (số ô x 40), để camera kẹp đúng biên và nhân vật không đi lọt
   * ra ngoài map mở rộng; map không có tilemap thì về mặc định. */
  function _applyWorldSize(mapId) {
    try {
      var sz = (typeof Tilemap !== 'undefined' && Tilemap.size) ? Tilemap.size(mapId) : null;
      if (sz && sz.w > 0 && sz.h > 0) { WORLD_W = sz.w; WORLD_H = sz.h; return; }
    } catch (e) {}
    WORLD_W = 1600; WORLD_H = 1200;
  }
  var ATTACK_RANGE = 70;      // tầm đánh player
  var ATK_CHASE_MAX = 700;    // bấm Đánh: quái trong bán kính này thì tự dí theo rồi đánh
  var INTERACT_RANGE = 110;   // tầm tương tác NPC (Space/?) — Bui 2026-10-25: 60px quá hẹp
                              // (đứng sát rạt mới nói chuyện được); 110px ≈ đứng cạnh NPC là
                              // bấm được, vẫn phải lại gần, không nói chuyện từ xa
  var GATE_RANGE = 46;        // tầm kích hoạt cổng
  var GATE_SAFE_R = 96;       // bán kính vùng cấm NPC quanh cổng (chống NPC chặn cổng)
  var MONSTER_AGGRO = 300;    // quái đuổi theo trong bán kính này
  var BOSS_RESPAWN_S = 120;   // boss hồi sinh sau 120s
  var MAP_MON_COUNT = 6;      // giữ ~6 quái thường / map

  var GFX_LEVELS = {
    thap:      { particle: 0,   shadows: false, scale: 0.6,  fps: 30 },
    trungbinh: { particle: 0.5, shadows: false, scale: 0.85, fps: 60 },
    cao:       { particle: 1,   shadows: true,  scale: 1.0,  fps: 60 },
  };
  var GFX_ORDER = ['thap', 'trungbinh', 'cao'];

  /* Ảnh theo quy ước <nhóm>_<tên>_<loại> (xem data/*.json) */
  var SPRITE_PLAYER = {
    kiem: 'assets/sprs/sprs_player_kiem.png',
    phap: 'assets/sprs/sprs_player_phap.png',
    the:  'assets/sprs/sprs_player_the.png',
  };
  var SPRITE_NPC = {
    dai_phu: 'assets/sprs/sprs_npc_dai_phu.webp',
    tam_tien_bi_tich: 'assets/sprs/sprs_npc_dai_phu.webp', /* lão già bí ẩn (tạm dùng chung) */
    truong_lao: 'assets/sprs/sprs_npc_dai_phu.webp',
    truong_tran: 'assets/sprs/sprs_npc_dai_phu.webp',
    lao_nong_dan: 'assets/sprs/sprs_npc_dai_phu.webp', /* Trưởng Lão Linh Điền (tạm) */
    su_gia_kiem: 'assets/sprs/char_nam_xuong_idle.png',
    su_gia_phap: 'assets/sprs/char_nu_xuong_idle.png',
    su_gia_the: 'assets/sprs/char_nam_xuong_idle.png',
  };
  var SPRITE_MON = {
    da_tru:       'assets/sprs/sprs_mon_da_tru.png',
    son_ke:       'assets/sprs/sprs_mon_son_ke.png',
    da_tru_vuong: 'assets/sprs/sprs_mon_da_tru_vuong.png',
    phong_lang:   'assets/sprs/sprs_mon_phong_lang.png',
    /* hu_thi: sprite AI bị chặn — dùng fallback hình khối */
    lang_vuong:   'assets/sprs/sprs_mon_lang_vuong.png',
    u_hon:        'assets/sprs/sprs_mon_u_hon.png',
    thi_ma:       'assets/sprs/sprs_mon_thi_ma.png',
    cot_tuong:    'assets/sprs/sprs_mon_cot_tuong.png',
  };
  var ELEMENT_FX = { // fallback khi ELEMENTS (data.js) chưa load
    kim: '#e8e8e8', moc: '#66bb6a', thuy: '#42a5f5', hoa: '#ef5350',
    tho: '#a1887f', bang: '#9be8ff', loi: '#b388ff', phong: '#b2ff59',
    quang: '#fff9c4', am: '#7b1fa2', doc: '#76ff03', huyet: '#ff5252',
    hondon: '#8e8e93',
  };

  /* Fallback quái khi data.js chưa viết (đủ 9 id contract yêu cầu) */
  var MON_FB = {
    da_tru:       { hp: 60,  atk: 9,  def: 2, exp: 12,  fb: '#8a6f4d', loai: 'thu', drops: [] },
    son_ke:       { hp: 45,  atk: 7,  def: 1, exp: 10,  fb: '#c98f3d', loai: 'thu', drops: [] },
    da_tru_vuong:{ hp: 600, atk: 26, def: 8, exp: 150, fb: '#a33327', loai: 'thu', boss: true, drops: [] },
    phong_lang:   { hp: 90,  atk: 13, def: 4, exp: 22,  fb: '#5d7a8c', loai: 'thu', drops: [] },
    hu_thi:       { hp: 70,  atk: 11, def: 3, exp: 18,  fb: '#7a5d8c', loai: 'thu', drops: [] },
    lang_vuong:   { hp: 900, atk: 34, def: 10, exp: 220, fb: '#3d5a80', loai: 'thu', boss: true, drops: [] },
    u_hon:        { hp: 110, atk: 16, def: 5, exp: 30,  fb: '#4d4d6b', loai: 'ma',  drops: [] },
    thi_ma:       { hp: 130, atk: 19, def: 6, exp: 38,  fb: '#5d3a5d', loai: 'ma',  drops: [] },
    cot_tuong:    { hp: 1400, atk: 46, def: 14, exp: 350, fb: '#2e2e3e', loai: 'ma', boss: true, drops: [] },
  };

  /* ---------- Biến nội bộ ---------- */
  var _canvas = null, _ctx = null;
  var _running = false, _raf = 0;
  var _lastT = 0, _acc = 0;
  var _viewW = 320, _viewH = 480;
  var _state = null; // ưu tiên bindState, fallback global `state`

  var _mapId = 0, _mapDef = null;
  var _monsters = [], _npcs = [], _gates = [], _objects = [];
  /* Bui 2026-10-21: chống đá về map cũ ngay khi vào map mới — vd vào map 0
   * spawn ở (790,80) cách cổng về map 14 (800,80) chỉ 10px < GATE_RANGE. */
  var _gateCdUntil = 0;
  /* Build 94: điểm rơi tilemap của cổng vừa đi qua (dropCol/dropRow) —
   * gate trigger stash vào đây, enterMap dùng rồi xóa. null = không có. */
  var _tileGateDrop = null;
  /* Lưới tọa độ ngầm kiểu tutien2d: world chia ô KHU_W x KHU_H → đánh số khu 1..N */
  var KHU_W = 400, KHU_H = 400;
  function _khuOf(x, y) {
    var cols = Math.max(1, Math.ceil(WORLD_W / KHU_W));
    var rows = Math.max(1, Math.ceil(WORLD_H / KHU_H));
    var c = Math.max(0, Math.min(cols - 1, Math.floor(x / KHU_W)));
    var r = Math.max(0, Math.min(rows - 1, Math.floor(y / KHU_H)));
    return r * cols + c + 1;
  }
  var _uid = 1;
  var _dmgNums = [], _fx = [];
  var _keys = {};
  var _moveTarget = null;
  var _chaseTgt = false; /* bấm Đánh khi quái ngoài tầm → tự dí theo rồi đánh (attack-move) */
  var _tapMove = true; /* chạm map để di chuyển — bật/tắt trong Cài đặt */
  var _attackCd = 0;
  /* === Animation đánh nâng cấp (Gameplay 2026-10-21) ===
   * _hitStop: đóng băng frame khi trúng đòn (game feel)
   * _shakeT/_shakeMag: rung màn hình khi crit/boss skill */
  var _hitStop = 0, _shakeT = 0, _shakeMag = 0;
  var _respawnT = 0, _bossRespawnAt = 0, _bossDef = null;
  var _dungeon = null;
  var _secret = null; /* realmId bí cảnh tranh đoạt đang ở (null = không) */          // {run, def} khi trong bí cảnh ngẫu nhiên
  var _stageClearFired = false;
  var _imgCache = {};

  /* Chiến đấu nâng cao: buff, telegraph boss, sơ hở, dash */
  var _buffs = [];            // {defMult, until(ms), fx}
  var _bossTele = [];         // {x,y,r,warnT,hitT,dmg}
  var _weakUntil = 0;         // timestamp ms — cửa sổ SƠ HỞ (+25% dmg)
  var _dashT = 0, _dashCd = 0, _dashDx = 1, _dashDy = 0;

  /* Đồ họa */
  var _gfxMode = 'tudong';      // tudong|thap|trungbinh|cao
  var _gfxLevel = 'cao';        // mức đang áp dụng
  var _manualCap = null;        // trần cho chế độ tự động
  var _fpsFrames = 0, _fpsT = 0, _highT = 0;
  var _suggestShown = false;    // toast showp_suggest 1 lần/session

  /* ---------- Helpers an toàn ---------- */
  function _S() {
    if (_state) return _state;
    if (typeof state !== 'undefined' && state) return state;
    return null;
  }
  function _t(key) {
    if (typeof t === 'function') { try { return t(key); } catch (e) {} }
    return key;
  }
  function _toast(key) {
    var msg = _t(key);
    if (typeof UI !== 'undefined' && UI && UI.toast) {
      try { UI.toast(msg); } catch (e) {}
    }
  }
  function _audio(fn) {
    if (typeof AudioSys !== 'undefined') { try { fn(AudioSys); } catch (e) {} }
  }
  function _nowMs() {
    return (typeof performance !== 'undefined') ? performance.now() : Date.now();
  }
  function _nextFrame(cb) {
    if (typeof requestAnimationFrame !== 'undefined') return requestAnimationFrame(cb);
    return setTimeout(function () { cb(_nowMs()); }, 16);
  }
  function _cancelFrame(id) {
    if (typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(id);
    else clearTimeout(id);
  }

  /* ---------- Tra cứu data (có fallback) ---------- */
  function _monDef(id) {
    var d = null;
    if (typeof MONSTERS !== 'undefined' && MONSTERS && MONSTERS[id]) d = MONSTERS[id];
    else if (MON_FB[id]) d = MON_FB[id];
    else d = { hp: 60, atk: 8, def: 2, exp: 10, fb: '#888', loai: 'thu', drops: [] };
    var out = {};
    for (var k in d) out[k] = d[k];
    out.nameKey = out.nameKey || id;
    if (!out.img && SPRITE_MON[id]) out.img = SPRITE_MON[id];
    return out;
  }
  function _mapDefOf(id) {
    if (typeof MAPS !== 'undefined' && MAPS) {
      for (var i = 0; i < MAPS.length; i++) if (MAPS[i].id === id) return MAPS[i];
      if (MAPS[id]) return MAPS[id];
    }
    // Fallback 3 map khi data.js chưa có
    var n = (typeof id === 'number') ? id : 0;
    return {
      id: id, nameKey: 'map_' + n, bg: null, fb: '#2e3b2e',
      monsters: ['da_tru', 'son_ke'], boss: 'da_tru_vuong',
      npcs: n === 0 ? ['dai_phu', 'van_tien_cac'] : [],
      gates: [
        { to: (n + 1) % 3, x: 1520, y: 600 },
        { to: (n + 2) % 3, x: 80, y: 600 },
      ],
      stoneDrop: [5, 15],
    };
  }
  function _npcDef(id) {
    var d = (typeof NPCS !== 'undefined' && NPCS && NPCS[id]) ? NPCS[id] : null;
    if (!d) d = { nameKey: id, x: 800, y: 500, kind: 'quest' };
    if (!d.img && SPRITE_NPC[id]) d.img = SPRITE_NPC[id];
    return d;
  }
  function _getStats() {
    if (Engine.getStats) { try { var s = Engine.getStats(); if (s) return s; } catch (e) {} }
    if (typeof baseStats === 'function') { try { return baseStats(1, 1, 'kiem'); } catch (e) {} }
    return { atk: 10, def: 2, maxHp: 120, maxMp: 60 };
  }
  function _elemFx() {
    var S = _S();
    var el = S && S.char ? S.char.element : null;
    if (typeof ELEMENTS !== 'undefined' && ELEMENTS && el && ELEMENTS[el] && ELEMENTS[el].fx) {
      return ELEMENTS[el].fx;
    }
    return (el && ELEMENT_FX[el]) || '#ffd54f';
  }

  /* ---------- Ảnh (thiếu → null, render vẽ fallback) ---------- */
  function _img(src) {
    if (!src || typeof Image === 'undefined') return null;
    var e = _imgCache[src];
    if (e) return e.ok ? e.img : null;
    var im = new Image();
    e = { img: im, ok: false };
    _imgCache[src] = e;
    im.onload = function () { e.ok = true; e.done = true; };
    im.onerror = function () { e.ok = false; e.done = true; };
    im.src = src;
    return null;
  }
  function _drawSprite(x, y, w, h, src, fbColor, label) {
    var im = _img(src);
    if (im) {
      _ctx.drawImage(im, x - w / 2, y - h / 2, w, h);
      return;
    }
    _ctx.fillStyle = fbColor || '#888';
    _ctx.fillRect(x - w / 2, y - h / 2, w, h);
    if (label) {
      _ctx.fillStyle = '#fff';
      _ctx.font = '10px sans-serif';
      _ctx.textAlign = 'center';
      _ctx.fillText(String(label).slice(0, 12), x, y + 3);
    }
  }

  /* ---------- Pseudo-3D: bóng đổ, scale chiều sâu, nghiêng theo hướng chạy ---------- */
  function _drawShadow(x, groundY, rx, alpha) {
    if (rx < 1 || alpha <= 0.01) return;
    _ctx.fillStyle = 'rgba(0,0,0,' + alpha.toFixed(3) + ')';
    _ctx.beginPath();
    _ctx.ellipse(x, groundY, rx, Math.max(2, rx * 0.32), 0, 0, Math.PI * 2);
    _ctx.fill();
  }
  /* Vẽ sinh vật: bóng dưới chân + to/nhỏ theo chiều sâu (y) + nghiêng theo vx.
   * o: entity để nhớ x frame trước; opts: {lift, shadowY, noShadow, noTilt, noDepth} */
  /* Quay mặt theo hướng di chuyển — mượt, không giật (chuẩn demo-joystick):
   * - _angLerp: nội suy góc đường ngắn nhất
   * - _face4: chọn 1 trong 4 hướng up/down/left/right, có hysteresis chống giật ở ranh giới
   * - Thân luôn đứng thẳng: chỉ lật ngang (flip), KHÔNG rotate sprite */
  function _angLerp(a, b, t) {
    var d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
  }
  function _face4(o, ang) {
    var dx = Math.cos(ang), dy = Math.sin(ang);
    var want = (Math.abs(dx) > Math.abs(dy)) ? (dx >= 0 ? 'right' : 'left') : (dy >= 0 ? 'down' : 'up');
    var cur = o._face || 'down';
    if (want !== cur) {
      var centers = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };
      var d = Math.abs(ang - centers[want]);
      if (d > Math.PI) d = Math.PI * 2 - d;
      if (d < 0.65) o._face = want; /* đã vào sâu vùng hướng mới mới đổi — chống giật */
    }
    return o._face || 'down';
  }
  /* Sprite linh thú theo hướng: pet_<id>_up/_down/_right.png (trái dùng _right lật).
   * Fallback về ảnh gốc khi đang tải hoặc file thiếu. */
  function _petDirSrc(base, face) {
    var b = String(base || '').replace(/\.[a-z0-9]+$/i, '');
    var suf = face === 'up' ? '_up' : (face === 'down' ? '_down' : '_right');
    var cand = b + suf + '.png';
    var ce = _imgCache[cand];
    if (ce && ce.done) return ce.ok ? cand : base;
    _img(cand); /* warm cache */
    return base;
  }
  function _drawCreature(o, x, y, w, h, src, fbColor, opts) {
    opts = opts || {};
    var lift = opts.lift || 0;
    /* lean: chỉ dùng khi truyền tường minh (vd: NPC cúi chào).
       Thân người LUÔN đứng thẳng khi di chuyển — cấm rotate tự động. */
    var tilt = (opts.lean != null) ? opts.lean : 0;
    var ds = 1;
    if (!opts.noDepth) {
      /* Bui 2026-10-22: depth scale theo screen Y (đúng khi zoom map) */
      var sy = _worldToScreenY(y) / Math.max(1, _viewH);
      if (sy < 0) sy = 0; if (sy > 1) sy = 1;
      ds = 0.94 + 0.12 * sy; /* gần người xem (y lớn) thì to hơn — pseudo-3D */
    }
    var dw = w * ds, dh = h * ds * (opts.scaleY || 1); /* scaleY: thở/bow */
    if (!opts.noShadow) {
      var hF = Math.min(lift, 70) / 70; /* bay cao → bóng mờ/nhỏ */
      var gy = (opts.shadowY != null) ? opts.shadowY : y + dh / 2 - 4;
      /* bóng đổ lệch ngược hướng nghiêng — cảm giác 3D */
      var shX = x + (opts.shadowOffX || 0);
      _drawShadow(shX, gy, dw * 0.32 * (1 - hF * 0.4), 0.26 * (1 - hF * 0.65));
    }
    var im = _img(src);
    _ctx.save();
    _ctx.translate(x, y);
    if (tilt) _ctx.rotate(tilt);
    /* Quay mặt như người thật: lật ngang khi hướng di chuyển có cos<0
       (đi sang trái). Thân luôn đứng thẳng — không rotate sprite. */
    var flip = !!opts.flip;
    if (!opts.noAutoFlip && opts.faceAng != null) flip = Math.cos(opts.faceAng) < 0;
    if (flip) _ctx.scale(-1, 1);
    if (im) _ctx.drawImage(im, -dw / 2, -dh / 2, dw, dh);
    else {
      _ctx.fillStyle = fbColor || '#888';
      _ctx.fillRect(-dw / 2, -dh / 2, dw, dh);
    }
    _ctx.restore();
  }
  /* Cầu có độ cao: entity đứng trong deck zone được nâng lift —
   * y-sort + bóng đổ đúng thứ tự depth khi đi trên cầu */
  function _bridgeLiftAt(x, y) {
    for (var i = 0; i < _objects.length; i++) {
      var o = _objects[i];
      if (!o.bridge || !o.lift) continue;
      if (Math.abs(x - o.x) <= o.deckW / 2 && Math.abs(y - o.y) <= o.deckH / 2) return o.lift;
    }
    return 0;
  }
  /* Vật thể trang trí: bóng dưới chân + y-sort theo chân vật */
  function _drawObject(o) {    _drawShadow(o.x, o.y, o.w * 0.30, 0.30);
    var im = _img(o.sprite);
    if (im) _ctx.drawImage(im, o.x - o.w / 2, o.y - o.h, o.w, o.h);
    else {
      _ctx.fillStyle = '#5a6b4a';
      _ctx.fillRect(o.x - o.w / 2, o.y - o.h, o.w, o.h);
    }
  }
  /* Bui 2026-10-22: vẽ ô đất linh điền (click được để mở panel farm) */
  function _drawFarmPlot(o) {
    _drawShadow(o.x, o.y, o.w * 0.30, 0.30);
    var im = _img(o.sprite);
    if (im) _ctx.drawImage(im, o.x - o.w / 2, o.y - o.h, o.w, o.h);
    else {
      _ctx.fillStyle = '#6b4a2a';
      _ctx.fillRect(o.x - o.w / 2, o.y - o.h, o.w, o.h);
    }
  }
  /* Sương mù trôi nhiều lớp (parallax phụ) */
  var _mistT = 0;
  var _tickT = 0; /* thời gian tích lũy cho animation NPC (idle bob, patrol) */
  function _drawMist(W, H) {
    _mistT += 0.016;
    _ctx.save();
    for (var i = 0; i < 5; i++) {
      var mx = ((_mistT * (12 + i * 4) + i * W / 5) % (W + 240)) - 120;
      var my = H * (0.22 + 0.14 * i) + Math.sin(_mistT * 0.7 + i * 2) * 20;
      var mr = 90 + i * 22;
      var g = _ctx.createRadialGradient(mx, my, 8, mx, my, mr);
      g.addColorStop(0, 'rgba(235,242,248,0.10)');
      g.addColorStop(1, 'rgba(235,242,248,0)');
      _ctx.fillStyle = g;
      _ctx.beginPath(); _ctx.arc(mx, my, mr, 0, Math.PI * 2); _ctx.fill();
    }
    _ctx.restore();
  }

  /* ---------- Entity ---------- */
  var player = { x: 800, y: 600, dir: 1, ang: Math.PI / 2, hp: 100, mp: 50, shield: 0, maxShield: 0, shieldT: 0,
                 focus: 100, speed: 150, target: null, teamId: null, atkT: 0, skillT: 0 };
  var joy = { dx: 0, dy: 0 };
  /* Linh thú đi theo */
  var PET_SPRITE = 'assets/sprs/sprs_pet_linh_thu.png';
  var _pet = { x: 0, y: 0, atkCd: 0, skillCd: 0, ang: Math.PI / 2 };
  /* Thần thú đồng hành 3D (theo linh căn): bay quanh nhân vật, tự đánh quái */
  var _sb = { x: 0, y: 0, ang: 0, skillCd: 0, frameT: 0, frameIdx: 0, lift: 30 };
  var _sbProjs = []; /* đạn skill thần thú: {x,y,tgt,el,dmg,sp,color,t} */

  function _randPos(margin) {
    margin = margin || 120;
    return {
      x: margin + Math.random() * (WORLD_W - margin * 2),
      y: margin + Math.random() * (WORLD_H - margin * 2),
    };
  }
  /* Vị trí random nhưng TRÁNH đè lên NPC và cổng map (quái không spawn đè NPC) */
  function _randPosClear(margin, clear) {
    margin = margin || 120; clear = clear || 110;
    for (var t = 0; t < 24; t++) {
      var p = _randPos(margin), ok = true, i;
      for (i = 0; i < _npcs.length; i++) {
        if (Math.hypot(_npcs[i].x - p.x, _npcs[i].y - p.y) < clear) { ok = false; break; }
      }
      if (ok) for (i = 0; i < _gates.length; i++) {
        if (Math.hypot(_gates[i].x - p.x, _gates[i].y - p.y) < clear) { ok = false; break; }
      }
      if (ok) return p;
    }
    return _randPos(margin);
  }
  /* Vị trí random TRONG BÃI QUÁI (spawnZones), vẫn tránh đè NPC/cổng map */
  function _randPosInZone(zn) {
    var r = zn.r || 150, cx = zn.x, cy = zn.y;
    for (var t = 0; t < 24; t++) {
      var a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * r;
      var p = { x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d };
      p.x = Math.max(120, Math.min(WORLD_W - 120, p.x));
      p.y = Math.max(120, Math.min(WORLD_H - 120, p.y));
      var ok = true, i;
      for (i = 0; i < _npcs.length; i++) {
        if (Math.hypot(_npcs[i].x - p.x, _npcs[i].y - p.y) < 110) { ok = false; break; }
      }
      if (ok) for (i = 0; i < _gates.length; i++) {
        if (Math.hypot(_gates[i].x - p.x, _gates[i].y - p.y) < 110) { ok = false; break; }
      }
      if (ok) return p;
    }
    return { x: Math.max(120, Math.min(WORLD_W - 120, cx)),
             y: Math.max(120, Math.min(WORLD_H - 120, cy)) };
  }
  function _spawnMon(monId, x, y, isBoss) {
    var def = _monDef(monId);
    var m = {
      uid: _uid++, monId: monId, def: def,
      x: x, y: y, hp: def.hp, maxHp: def.hp, atk: def.atk, def: def.def,
      boss: !!(isBoss || def.boss), dead: false,
      atkCd: 0, skillCd: 4 + Math.random() * 4, hitT: 0,
      wanderA: Math.random() * Math.PI * 2, wanderT: 0,
      /* AI nâng cấp (Gameplay 2026-10-21): vị trí spawn để leash,
       * strafeT/strafeDir để di chuyển ziczac, fleeT để chạy trốn */
      sx: x, sy: y, strafeT: 0, strafeDir: 1, fleeT: 0, stateTick: 0,
    };
    /* Quái tinh anh: ~5% lẫn trong quái thường, mạnh 2-3x, rớt yêu đan — xem bodycult.js */
    try {
      if (!m.boss && typeof BodyCult !== "undefined" && BodyCult.eliteRoll()) {
        var em = BodyCult.DEF.elite;
        m.elite = true;
        m.hp = m.maxHp = Math.round(def.hp * em.hpMult);
        m.atk = Math.round(def.atk * em.atkMult);
        m.def = Math.round(def.def * em.defMult);
      }
    } catch (e) {}
    if (typeof Combat !== 'undefined' && Combat.aggro) {
      try { Combat.aggro(monId); } catch (e) {}
    }
    return m;
  }
  function _spawnMapMonsters() {
    _monsters = [];
    _bossDef = _mapDef.boss || null;
    _bossRespawnAt = 0;
    /* Map an toàn tuyệt đối (tông môn, đại điện, linh điền): không spawn quái/boss hoang dã (Bui 2026-10-19) */
    if (_mapDef.safe) { _bossDef = null; return; }
    var _mf = _mapDef.monsters;
    var ids = (_mf && _mf.length) ? _mf : (_mf ? [] : ['da_tru']);
    var zones = _mapDef.spawnZones;
    /* Không có quái hoang dã nào (vd bí cảnh tông môn chỉ có boss): bỏ qua spawn thường, vẫn spawn boss */
    var _skipWild = !ids.length;
    if (zones && zones.length && !_skipWild) {
      /* Spawn theo BÃI QUÁI: chia đều quái cho các bãi, mỗi bãi spawn loại quái của bãi */
      var spawned = 0, zi, k;
      var perZone = Math.max(1, Math.floor(MAP_MON_COUNT / zones.length));
      for (zi = 0; zi < zones.length && spawned < MAP_MON_COUNT; zi++) {
        var zids = (zones[zi].monsters && zones[zi].monsters.length) ? zones[zi].monsters : ids;
        for (k = 0; k < perZone && spawned < MAP_MON_COUNT; k++, spawned++) {
          var p = _randPosInZone(zones[zi]);
          var m = _spawnMon(zids[(spawned + zi) % zids.length], p.x, p.y, false);
          m.zone = zi;
          _monsters.push(m);
        }
      }
      while (spawned < MAP_MON_COUNT) { /* chia không đều -> dồn vào bãi đầu */
        var z0 = zones[0];
        var z0ids = (z0.monsters && z0.monsters.length) ? z0.monsters : ids;
        var p0 = _randPosInZone(z0);
        var m0 = _spawnMon(z0ids[spawned % z0ids.length], p0.x, p0.y, false);
        m0.zone = 0;
        _monsters.push(m0);
        spawned++;
      }
    } else if (!_skipWild) { /* map chưa có spawnZones: giữ cách cũ (spawn random khắp map) */
      for (var i = 0; i < MAP_MON_COUNT; i++) {
        var p2 = _randPosClear(160, 110);
        _monsters.push(_spawnMon(ids[i % ids.length], p2.x, p2.y, false));
      }
    }
    if (_bossDef) {
      var bp = _mapDef.bossSpawn ? { x: _mapDef.bossSpawn.x, y: _mapDef.bossSpawn.y }
                                 : _randPosClear(200, 150);
      _monsters.push(_spawnMon(_bossDef, bp.x, bp.y, true));
    }
  }
  function _spawnStage(idx) {
    _monsters = [];
    _stageClearFired = false;
    var st = _dungeon.run.layout.stages[idx];
    if (!st) return;
    var ids = st.monsters || [];
    for (var i = 0; i < ids.length; i++) {
      var p = _randPosClear(200, 110);
      _monsters.push(_spawnMon(ids[i], p.x, p.y, false));
    }
    if (st.boss) {
      var bp2 = _randPosClear(200, 150);
      _monsters.push(_spawnMon(st.boss, bp2.x, bp2.y, true));
    }
  }

  /* ---------- API chính ---------- */
  function bindState(s) { _state = s || null; }

  /* Tạo object NPC runtime từ id (dùng chung cho enterMap + refreshNpcs) */
  function _makeNpcObj(id) {
    var d = _npcDef(id);
    var hx = d.x || 800, hy = d.y || 500;
    return { npcId: id, def: d, x: hx, y: hy,
             hx: hx, hy: hy,             /* vị trí gốc (tâm tuần tra) */
             vx: 0, vy: 0,              /* vận tốc hiện tại */
             tx: null, ty: null,        /* điểm đến tuần tra */
             wt: 1 + Math.random() * 2, /* chờ trước khi bước đi */
             face: 1,                   /* 1: mặt phải, -1: mặt trái */
             phase: Math.random() * 6.28, /* pha idle riêng */
             lean: 0 };                 /* độ nghiêng hiện tại (mượt) */
  }
  /* Kiểm tra NPC có được unlock không (cảnh giới / nhiệm vụ) */
  function _npcUnlocked(n) {
    var def = n.def || n;
    /* NPC khóa theo cảnh giới (vd Tuần Thú Sư chỉ từ Trúc Cơ) */
    var ur = def.unlock && def.unlock.realm;
    if (ur != null) {
      var S = _S();
      var pr = (S && S.char && S.char.realm) || 0;
      if (pr < ur) return false;
    }
    /* NPC khóa theo nhiệm vụ (vd sứ giả tông môn chỉ sau q_story_10) */
    var uq = def.unlock && def.unlock.quest;
    if (uq) {
      var S2 = _S();
      var qs = (S2 && S2.quests) || {};
      if (!qs[uq] || qs[uq].status !== "done") return false;
    }
    return true;
  }
  /* Làm mới NPC trên map hiện tại: thêm NPC vừa được unlock (vd trả xong
   * q_story_10 → sứ giả tông môn xuất hiện ngay, không cần rời map).
   * Giữ nguyên NPC đã có (không reset vị trí). */
  function refreshNpcs() {
    if (!_mapDef || !_mapDef.npcs) return;
    var have = {};
    for (var i = 0; i < _npcs.length; i++) have[_npcs[i].npcId] = true;
    (_mapDef.npcs || []).forEach(function (id) {
      if (have[id]) return;
      var n = _makeNpcObj(id);
      if (_npcUnlocked(n)) _npcs.push(n);
    });
  }
  function enterMap(mapId) {
    _dungeon = null;
    _secret = null;
    _resetCamera(); /* camera bám ngay, không trượt từ map cũ */
    _mapId = mapId;
    _mapDef = _mapDefOf(mapId);
    _applyWorldSize(mapId); /* map tilemap mo rong (vd map 0: 2240x960) */
    /* warm ảnh tilemap tiền-render để không pop-in frame đầu */
    if (typeof mapId === 'number') _img('assets/maps/tilemap/map_' + mapId + '.png');
    _npcs = (_mapDef.npcs || []).map(_makeNpcObj).filter(_npcUnlocked);
    _gates = (_mapDef.gates || []).map(function (g) {
      return { to: g.to, x: g.x, y: g.y };
    });
    /* Vật thể trang trí theo tọa độ: {x, y, sprite, w, h, solid, sw, sh,
     * bridge/lift/deckW/deckH: cầu đi được có độ cao} */
    _objects = (_mapDef.objects || []).map(function (o) {
      return { x: o.x, y: o.y, sprite: o.sprite, w: o.w || 90, h: o.h || 90,
               solid: o.solid !== false, sw: o.sw || 46, sh: o.sh || 30,
               bridge: !!o.bridge, lift: o.lift || 0,
               deckW: o.deckW || o.w || 90, deckH: o.deckH || 40 };
    });
    if (_gates.length) { // đặt player ở cổng vào
      player.x = Math.min(WORLD_W - 60, _gates[0].x + 70);
      player.y = _gates[0].y;
    } else {
      player.x = WORLD_W / 2; player.y = WORLD_H / 2;
    }
    /* Build 94: điểm rơi tilemap của cổng vừa đi qua (dropCol/dropRow
     * -> tâm ô 40px). Áp TRƯỚC vòng đẩy xa cổng bên dưới để giữ chống
     * bounce 2026-10-21: drop gần cổng về sẽ bị đẩy ra >= GATE_RANGE+50
     * nhưng vẫn ở vùng lân cận ô drop. Không có drop -> giữ spawn cũ. */
    try {
      if (_tileGateDrop) {
        player.x = Math.max(40, Math.min(WORLD_W - 40, _tileGateDrop.col * 40 + 20));
        player.y = Math.max(40, Math.min(WORLD_H - 40, _tileGateDrop.row * 40 + 20));
      }
    } catch (_e) {}
    _tileGateDrop = null;
    /* Miễn chạm cổng 2s sau khi vào map (chống bounce tức thì) */
    _gateCdUntil = Date.now() + 2000;
    /* Đẩy điểm spawn ra xa MỌI cổng (vd map 0 spawn (790,80) cách cổng về map 14
     * chỉ 10px — đứng yên 2s vẫn bị đá về; Bui 2026-10-21) */
    try {
      var _minD = GATE_RANGE + 50;
      for (var _pass = 0; _pass < 3; _pass++) {
        var _moved = false;
        for (var _sgi = 0; _sgi < _gates.length; _sgi++) {
          var _sg = _gates[_sgi];
          var _sd = Math.hypot(_sg.x - player.x, _sg.y - player.y);
          if (_sd < _minD) {
            var _sa = _sd > 0.01 ? Math.atan2(player.y - _sg.y, player.x - _sg.x) : Math.PI / 2;
            player.x = _sg.x + Math.cos(_sa) * _minD;
            player.y = _sg.y + Math.sin(_sa) * _minD;
            _moved = true;
          }
        }
        if (!_moved) break;
      }
      player.x = Math.max(40, Math.min(WORLD_W - 40, player.x));
      player.y = Math.max(40, Math.min(WORLD_H - 40, player.y));
    } catch (_e) {}
    var ps = _getStats();
    player.hp = ps.maxHp; player.mp = ps.maxMp;
    player.shield = 0; player.maxShield = 0;
    player.target = null; _moveTarget = null; _chaseTgt = false;
    _dmgNums = []; _fx = [];
    _buffs = []; _bossTele = []; _weakUntil = 0;
    _dashT = 0; _dashCd = 0;
    _spawnMapMonsters();
    _audio(function (A) { A.playMusic('map'); });
  }

  /* Bí cảnh ngẫu nhiên: đánh theo ải run.layout.stages[run.stageIdx] */
  function enterDungeonRun(run, def) {
    _dungeon = { run: run, def: def };
    _mapId = 'dg:' + def.id;
    _mapDef = { id: _mapId, nameKey: def.nameKey, bg: def.mapBg || null, fb: '#20242e',
                monsters: [], boss: null, npcs: [], gates: [], stoneDrop: [10, 30] };
    _applyWorldSize(_mapId); /* bi canh: khong co tilemap -> ve 1600x1200 */
    _npcs = []; _gates = []; _objects = [];
    player.x = WORLD_W / 2; player.y = WORLD_H - 220;
    player.target = null; _moveTarget = null; _chaseTgt = false;
    _dmgNums = []; _fx = [];
    _spawnStage(run.stageIdx);
    _audio(function (A) { A.playMusic('boss'); });
  }

  /* Bí cảnh tranh đoạt: vào map đặc biệt 'secret:<realmId>' với quái/boss của bí cảnh.
     realmDef: {id, nameKey, bg, fb, monsters[], boss, icon} — cổng ra về Thanh Vân Trấn. */
  function enterSecretRealm(realmDef) {
    _dungeon = null;
    _secret = realmDef ? realmDef.id : null;
    _mapId = 'secret:' + _secret;
    _mapDef = { id: _mapId, nameKey: realmDef.nameKey, bg: realmDef.bg || null, fb: realmDef.fb || '#20242e',
                monsters: realmDef.monsters || [], boss: realmDef.boss || null,
                npcs: [], gates: [{ to: 0, x: 80, y: 600 }], stoneDrop: [10, 30] };
    _applyWorldSize(_mapId); /* bi canh tranh doat: ve 1600x1200 */
    _npcs = []; _objects = [];
    _gates = [{ to: 0, x: 80, y: 600 }];
    player.x = WORLD_W / 2; player.y = WORLD_H - 220;
    player.target = null; _moveTarget = null; _chaseTgt = false;
    _dmgNums = []; _fx = [];
    _buffs = []; _bossTele = []; _weakUntil = 0;
    _dashT = 0; _dashCd = 0;
    _spawnMapMonsters();
    _audio(function (A) { A.playMusic('boss'); });
  }
  function secretRealmId() { return _secret; }
  function leaveSecretRealm() { _secret = null; }

  /* ui.js tăng run.stageIdx rồi gọi; hết ải → onDungeonDone */
  function nextStage() {
    if (!_dungeon) return;
    var run = _dungeon.run;
    if (!run.layout || run.stageIdx >= run.layout.stages.length) {
      _dungeon = null;
      if (Engine.onDungeonDone) { try { Engine.onDungeonDone(); } catch (e) {} }
      return;
    }
    _spawnStage(run.stageIdx);
  }

  function tryInteract() {
    var best = null, bd = INTERACT_RANGE;
    for (var i = 0; i < _npcs.length; i++) {
      var n = _npcs[i];
      var d = Math.hypot(n.x - player.x, n.y - player.y);
      if (d < bd) { bd = d; best = n; }
    }
    if (best && Engine.onNpc) { try { Engine.onNpc(best.npcId); } catch (e) {} }
    return best ? best.npcId : null;
  }

  /* ---------- AUTO QUEST: tự làm nhiệm vụ (Bui 2026-10-19, nâng cấp 2026-10-20) ----------
   * Ưu tiên quest CHÍNH; quest chính "đang chờ" (cần người chơi quyết định /
   * không tìm được đường) thì chuyển sang quest PHỤ đang dở, xong quay lại
   * quest chính. Hết việc → nếu xong chuỗi tân thủ thì tự tắt + báo. */
  var _aqChainCelebrated = false;
  /* Loại need mà bot tự làm được (còn lại: cần người chơi quyết định) */
  function _aqDrivable(need) {
    var t = (need || {}).type || "talk";
    return t === "talk" || t === "talk_npcs" || t === "kill" || t === "item";
  }
  function _autoQuestTick(dt, ps, manual) {
    if (!Engine.autoQuest || manual) return false;
    var S = _S();
    /* An toàn: HP < 30% → dừng ngay, nhân vật đứng yên (Bui 2026-10-20) */
    try {
      var _ps0 = ps || _effStats(_getStats());
      var _mhp = Math.max(1, (_ps0 && _ps0.maxHp) || 1);
      if (player.hp / _mhp < 0.3) {
        setAutoQuest(false);
        try { _toast("aq_lowhp"); } catch (e) {}
        return false;
      }
    } catch (e) {}
    var driven = false;
    /* 1. Ưu tiên quest CHÍNH đang active */
    var qm = null;
    try {
      if (typeof QuestGuide !== "undefined" && QuestGuide.activeMainQuest)
        qm = QuestGuide.activeMainQuest(S);
    } catch (e) {}
    if (qm) {
      driven = _aqDrive(dt, ps, S, qm, false);
    } else {
      /* Chưa có quest chính active → tìm quest chính tiếp theo để đi nhận */
      var qn = null;
      try {
        if (typeof QuestGuide !== "undefined" && QuestGuide.nextMainQuest)
          qn = QuestGuide.nextMainQuest(S);
      } catch (e) {}
      if (qn) driven = _aqDrive(dt, ps, S, qn, true);
    }
    /* 2. Quest chính đang chờ → làm quest PHỤ đang dở */
    if (!driven) {
      var sides = [];
      try {
        if (typeof QuestGuide !== "undefined" && QuestGuide.activeSideQuests)
          sides = QuestGuide.activeSideQuests(S) || [];
      } catch (e) {}
      for (var si = 0; si < sides.length && !driven; si++)
        driven = _aqDrive(dt, ps, S, sides[si], false);
    }
    /* 3. Không còn việc gì → xong chuỗi tân thủ thì tự tắt + báo */
    if (!driven) {
      Engine.aqStatus = null;
      var _done = false;
      try {
        if (typeof QuestGuide !== "undefined" && QuestGuide.newbieChainDone)
          _done = QuestGuide.newbieChainDone(S);
      } catch (e) {}
      if (_done && !_aqChainCelebrated) {
        _aqChainCelebrated = true;
        setAutoQuest(false);
        try { _toast("aq_chain_done"); } catch (e) {}
      }
      return false;
    }
    return true;
  }

  /* Lái 1 quest: đi tới mục tiêu, tương tác, đánh quái.
   * acceptRun=true: quest chưa nhận → đi tới NPC để nhận. */
  function _aqDrive(dt, ps, S, q, acceptRun) {
    var need = q.need || {};
    if (!_aqDrivable(need)) return false; /* cần người chơi quyết định → "đang chờ" */
    var tgt = null;
    try {
      if (typeof QuestGuide !== "undefined" && QuestGuide.questTarget)
        tgt = QuestGuide.questTarget(S, q, _mapId);
    } catch (e) {}
    if (acceptRun) {
      /* Đi nhận quest: mục tiêu là NPC giao quest */
      var _nm = null;
      try {
        if (typeof QuestGuide !== "undefined" && QuestGuide.npcMap)
          _nm = QuestGuide.npcMap(q.npc);
      } catch (e) {}
      if (!q.npc || _nm == null) return false;
      tgt = { kind: "npc", npcId: q.npc, map: _nm };
    }
    /* talk_npcs: ưu tiên NPC chưa nói chuyện (cùng map) */
    if (!acceptRun && need.type === "talk_npcs" && need.npcs) {
      var talked = (((S.quests || {})[q.id] || {}).talked) || {};
      var bn = null, bd = 1e12;
      for (var ni = 0; ni < _npcs.length; ni++) {
        if (need.npcs.indexOf(_npcs[ni].npcId) < 0 || talked[_npcs[ni].npcId]) continue;
        var ddn = Math.hypot(_npcs[ni].x - player.x, _npcs[ni].y - player.y);
        if (ddn < bd) { bd = ddn; bn = _npcs[ni]; }
      }
      if (bn) tgt = { kind: "npc", npcId: bn.npcId, _npcObj: bn };
    }
    if (!tgt) return false;
    /* Mục tiêu ở map khác → đi tới cổng dẫn sang (cơ chế qua cổng sẵn có tự kích hoạt) */
    if (tgt.map != null && tgt.map !== _mapId) {
      var path = null;
      try {
        if (typeof QuestGuide !== "undefined" && QuestGuide.findPath)
          path = QuestGuide.findPath(_mapId, tgt.map);
      } catch (e) {}
      if (path && path.length > 1) {
        var nextMap = path[1];
        for (var gi2 = 0; gi2 < _gates.length; gi2++) {
          if (_gates[gi2].to === nextMap) {
            /* Build 99: cổng chỉ mở khi đi bộ — Auto đang bay thì tự hạ cánh để qua cổng. */
            if (Engine.fly) { setFly(false); try { if (typeof syncToggles === 'function') syncToggles(); } catch (e) {} }
            if (_dashT <= 0) _moveToward(_gates[gi2].x, _gates[gi2].y, dt);
            Engine.aqStatus = { kind: "gate", qid: q.id };
            return true;
          }
        }
      }
      return false; /* không tìm được đường → "đang chờ" */
    }

    if (tgt.kind === "npc") {
      var n = tgt._npcObj || null;
      if (!n) {
        for (var i = 0; i < _npcs.length; i++)
          if (_npcs[i].npcId === tgt.npcId) { n = _npcs[i]; break; }
      }
      if (!n) return false;
      var d = Math.hypot(n.x - player.x, n.y - player.y);
      if (_aqInteractCd > 0) _aqInteractCd -= dt;
      var _stKind = acceptRun ? "accept" : (d <= INTERACT_RANGE ? "talk" : "npc");
      Engine.aqStatus = { kind: _stKind, qid: q.id, npcId: tgt.npcId,
                          acceptId: acceptRun ? q.id : null };
      if (d <= INTERACT_RANGE) {
        if (_aqInteractCd <= 0) { _aqInteractCd = 1.5; tryInteract(); }
      } else if (_dashT <= 0) {
        _moveToward(n.x, n.y, dt);
      }
      return true;
    }
    if (tgt.kind === "monster") {
      var best = null, bdd = 1e12;
      for (var j = 0; j < _monsters.length; j++) {
        var m = _monsters[j];
        if (m.dead) continue;
        if (tgt.monId && m.monId !== tgt.monId && !m.boss) continue;
        var ddm = Math.hypot(m.x - player.x, m.y - player.y);
        if (ddm < bdd) { bdd = ddm; best = m; }
      }
      if (best) {
        player.target = best;
        Engine.aqStatus = { kind: "monster", qid: q.id, monId: tgt.monId || best.monId };
        if (bdd > _atkRange() * 0.8 && _dashT <= 0) {
          _moveToward(best.x, best.y, dt);
        } else if (_attackCd <= 0 && bdd <= _atkRange()) {
          _playerAttack(best, ps);
        }
        _autoSkills(ps);
        return true;
      }
      /* Chưa có quái đúng loại: di chuyển về tâm bãi chờ respawn */
      if (tgt.x != null && tgt.y != null && _dashT <= 0) {
        Engine.aqStatus = { kind: "monster", qid: q.id, monId: tgt.monId };
        _moveToward(tgt.x, tgt.y, dt);
        return true;
      }
      return false;
    }
    return false;
  }

  /* Build 99: Auto chính theo mũi tên vàng — khi Auto bật mà không còn quái để đánh,
   * tự đi về phía mục tiêu nhiệm vụ chính hiện tại (cùng map thì đi thẳng, khác map
   * thì đi tới cổng và tự hạ cánh để qua cổng). Không tương tác NPC (phần đó của nút NV). */
  function _autoFollowQuest(dt) {
    try {
      var S = _S(); if (!S) return false;
      var qm = null;
      if (typeof QuestGuide !== 'undefined' && QuestGuide.activeMainQuest)
        qm = QuestGuide.activeMainQuest(S);
      if (!qm) return false;
      var tgt = null;
      if (QuestGuide.questTarget) tgt = QuestGuide.questTarget(S, qm, _mapId);
      if (!tgt) return false;
      if (tgt.map != null && tgt.map !== _mapId) {
        var path = null;
        try { if (QuestGuide.findPath) path = QuestGuide.findPath(_mapId, tgt.map); } catch (e) {}
        if (path && path.length > 1) {
          var nextMap = path[1];
          for (var gi = 0; gi < _gates.length; gi++) {
            if (_gates[gi].to === nextMap) {
              if (Engine.fly) { setFly(false); try { if (typeof syncToggles === 'function') syncToggles(); } catch (e) {} }
              if (_dashT <= 0) _moveToward(_gates[gi].x, _gates[gi].y, dt);
              return true;
            }
          }
        }
        return false;
      }
      var tx = null, ty = null;
      if (tgt.kind === 'npc') {
        for (var i = 0; i < _npcs.length; i++)
          if (_npcs[i].npcId === tgt.npcId) { tx = _npcs[i].x; ty = _npcs[i].y; break; }
      } else if (tgt.x != null && tgt.y != null) { tx = tgt.x; ty = tgt.y; }
      if (tx == null) return false;
      if (Math.hypot(tx - player.x, ty - player.y) < 60) return false; /* đã tới nơi */
      if (_dashT <= 0) _moveToward(tx, ty, dt);
      return true;
    } catch (e) { return false; }
  }

  function setAuto(b) { Engine.auto = !!b; _chaseTgt = false; var S = _S(); if (S) S.auto = Engine.auto; }
  /* AUTO LÀM NHIỆM VỤ (Bui 2026-10-19): tự tìm mục tiêu quest, di chuyển, đánh, trả NV */
  var _aqInteractCd = 0;
  function setAutoQuest(b) {
    Engine.autoQuest = !!b;
    if (!Engine.autoQuest) {
      /* Tắt là nhân vật đứng yên ngay: hủy đích di chuyển + mục tiêu đang dí */
      _moveTarget = null; _chaseTgt = false;
      try { player.target = null; } catch (e) {}
      Engine.aqStatus = null;
    }
    var S = _S(); if (S) S.autoQuest = Engine.autoQuest;
  }
  function setFly(b) { Engine.fly = !!b; var S = _S(); if (S) S.fly = Engine.fly; }
  function setRun(b) { Engine.run = !!b; var S = _S(); if (S) S.run = Engine.run; }

  /* ---------- Đồ họa ---------- */
  function setGraphics(mode) {
    if (mode !== 'tudong' && !GFX_LEVELS[mode]) mode = 'tudong';
    _gfxMode = mode;
    var S = _S();
    if (S && S.settings) {
      S.settings.graphics = mode;
      if (mode !== 'tudong') { S.settings.graphicsManual = mode; _manualCap = mode; }
      else { _manualCap = S.settings.graphicsManual || null; }
    } else if (mode !== 'tudong') {
      _manualCap = mode;
    }
    _gfxLevel = (mode === 'tudong') ? 'cao' : mode;
    _highT = 0;
    _applyGfx();
  }

  function _applyGfx() {
    if (!_canvas || !_ctx) return;
    var lvl = GFX_LEVELS[_gfxLevel] || GFX_LEVELS.cao;
    var r = _canvas.getBoundingClientRect();
    var dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    _viewW = Math.max(1, Math.round(r.width || 320));
    _viewH = Math.max(1, Math.round(r.height || 480));
    _canvas.width = Math.round(_viewW * lvl.scale * dpr);
    _canvas.height = Math.round(_viewH * lvl.scale * dpr);
    _ctx.setTransform(_canvas.width / _viewW, 0, 0, _canvas.height / _viewH, 0, 0);
  }

  /* Đo FPS mỗi 3s, tự hạ/tăng mức theo contract */
  function _fpsTick(now) {
    _fpsFrames++;
    if (now - _fpsT < 3000) return;
    var avg = _fpsFrames * 1000 / Math.max(1, now - _fpsT);
    _fpsFrames = 0; _fpsT = now;
    if (_gfxMode !== 'tudong') return;
    if (avg < 25) {
      var i = GFX_ORDER.indexOf(_gfxLevel);
      if (i > 0) {
        _gfxLevel = GFX_ORDER[i - 1];
        _highT = 0;
        _applyGfx();
        _toast('gfx_auto_down');
        if (Engine.otherPlayers.length >= 3 && !_suggestShown) {
          _suggestShown = true;
          _toast('showp_suggest');
        }
      }
    } else if (avg > 55) {
      _highT += 3;
      if (_highT >= 30) {
        var cap = _manualCap || 'cao';
        var j = GFX_ORDER.indexOf(_gfxLevel), k = GFX_ORDER.indexOf(cap);
        if (j >= 0 && j < k && j < GFX_ORDER.length - 1) {
          _gfxLevel = GFX_ORDER[j + 1];
          _applyGfx();
        }
        _highT = 0;
      }
    } else {
      _highT = 0;
    }
  }

  /* ---------- Input ---------- */
  function _onKeyDown(e) {
    var k = (e.key || '').toLowerCase();
    if (k === ' ' || k === 'spacebar') {
      if (_running) { tryInteract(); }
      if (e.preventDefault) e.preventDefault();
      return;
    }
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].indexOf(k) >= 0) {
      _keys[k] = true;
      if (e.preventDefault) e.preventDefault();
    } else if (['w', 'a', 's', 'd'].indexOf(k) >= 0) {
      _keys[k] = true;
    }
  }
  function _onKeyUp(e) {
    var k = (e.key || '').toLowerCase();
    delete _keys[k];
  }
  /* Bui 2026-10-22: pinch-to-zoom + wheel + double-tap reset.
     Chạm (touch) được hoãn 110ms để phát hiện ngón thứ 2 (pinch); chuột xử lý ngay. */
  var _tapTimer = null, _tapPrevDown = 0, _pinching = false;
  var _pinchTouches = {}, _pinchD0 = 0, _pinchZ0 = 1;
  function _pinchDist() {
    var ks = Object.keys(_pinchTouches);
    if (ks.length < 2) return 0;
    var a = _pinchTouches[ks[0]], b = _pinchTouches[ks[1]];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
  function _onTouchStart(e) {
    if (!_canvas || !_running) return;
    try {
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        _pinchTouches[t.identifier] = { x: t.clientX, y: t.clientY };
      }
      if (Object.keys(_pinchTouches).length >= 2) {
        /* Ngón thứ 2 → pinch: hủy tap đang chờ, bắt đầu zoom */
        if (_tapTimer) { clearTimeout(_tapTimer); _tapTimer = null; }
        _pinching = true;
        _pinchD0 = _pinchDist();
        _pinchZ0 = _mapZoom;
        if (e.preventDefault) e.preventDefault();
      }
    } catch (err) {}
  }
  function _onTouchMove(e) {
    if (!_pinching) return;
    try {
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        if (_pinchTouches[t.identifier]) _pinchTouches[t.identifier] = { x: t.clientX, y: t.clientY };
      }
      var d = _pinchDist();
      if (d > 10 && _pinchD0 > 10) setMapZoom(_pinchZ0 * d / _pinchD0);
      if (e.preventDefault) e.preventDefault();
    } catch (err2) {}
  }
  function _onTouchEnd(e) {
    try {
      for (var i = 0; i < e.changedTouches.length; i++)
        delete _pinchTouches[e.changedTouches[i].identifier];
      if (Object.keys(_pinchTouches).length < 2) { _pinching = false; _pinchD0 = 0; }
    } catch (err3) {}
  }
  function _onWheel(e) {
    if (!_canvas || !_running) return;
    try { if (e.preventDefault) e.preventDefault(); } catch (e2) {}
    setMapZoom(_mapZoom * (e.deltaY > 0 ? 0.9 : 1.12));
  }
  function _onCanvasTap(e) {
    if (!_canvas || !_running || !_tapMove) return;
    if (_pinching) return; /* đang pinch thì bỏ qua tap */
    if (e.pointerType === 'touch' && !_pinching) {
      /* Hoãn tap để chờ ngón thứ 2 (pinch) */
      var cx = e.clientX, cy = e.clientY, downT = Date.now();
      if (_tapTimer) clearTimeout(_tapTimer);
      _tapTimer = setTimeout(function () { _tapTimer = null; _doTap(cx, cy, downT); }, 110);
      return;
    }
    _doTap(e.clientX, e.clientY, Date.now());
  }
  function _doTap(cx, cy, downT) {
    /* Double-tap → reset zoom về 1x (Bui 2026-10-22) */
    if (downT - _tapPrevDown < 320 && _tapPrevDown > 0) {
      _tapPrevDown = 0;
      setMapZoom(1);
      try { if (typeof toast === "function") toast("1x"); } catch (e) {}
      return;
    }
    _tapPrevDown = downT;
    var r = _canvas.getBoundingClientRect();
    var wpt = _screenToWorld(cx - r.left, cy - r.top); /* đúng với zoom */
    var wx = wpt.x, wy = wpt.y;
    /* Bui 2026-10-22: bán kính chạm giữ nguyên theo màn hình (chia cho zoom) */
    var _hz = 1 / (_mapZoom || 1);
    var _gateR = GATE_SAFE_R * _hz, _hitR = 60 * _hz;
    /* Chạm gần cổng: ưu tiên đi vào cổng — NPC đứng gần cổng không được
       chiếm cú chạm này (phòng thủ: cổng luôn kích hoạt được) */
    for (var gi9 = 0; gi9 < _gates.length; gi9++) {
      if (Math.hypot(_gates[gi9].x - wx, _gates[gi9].y - wy) < _gateR) {
        _moveTarget = { x: _gates[gi9].x, y: _gates[gi9].y }; _chaseTgt = false;
        return;
      }
    }
    /* Chạm trực tiếp vào NPC → nói chuyện ngay (Bui 2026-10-18) */
    try {
      for (var i = 0; i < _npcs.length; i++) {
        var n = _npcs[i];
        if (Math.hypot(n.x - wx, n.y - wy) < _hitR) {
          if (Engine.onNpc) Engine.onNpc(n.npcId);
          return;
        }
      }
    } catch (err) {}
    /* Bui 2026-10-21: chạm vào quái → nhắm và đánh ngay */
    try {
      var _bm = null, _bd = _hitR;
      for (var mi = 0; mi < _monsters.length; mi++) {
        var _mm = _monsters[mi];
        if (_mm.dead) continue;
        var _md = Math.hypot(_mm.x - wx, _mm.y - wy);
        if (_md < _bd) { _bd = _md; _bm = _mm; }
      }
      if (_bm) { player.target = _bm; manualAttack(); return; }
    } catch (err2) {}
    _moveTarget = { x: wx, y: wy }; _chaseTgt = false; /* chạm map đi chỗ khác → hủy dí mục tiêu */
  }
  function _inputVec() {
    var dx = 0, dy = 0;
    if (_keys['arrowup'] || _keys['w']) dy -= 1;
    if (_keys['arrowdown'] || _keys['s']) dy += 1;
    if (_keys['arrowleft'] || _keys['a']) dx -= 1;
    if (_keys['arrowright'] || _keys['d']) dx += 1;
    /* Bui 2026-10-20: ui.js/gamepad.js ghi Engine.joy (thay object mới) —
     * đọc live từ Engine.joy; closure joy cũ luôn {0,0} nên không dùng. */
    var _ej = joy;
    try { if (typeof Engine !== "undefined" && Engine.joy) _ej = Engine.joy; } catch (_e) {}
    dx += _ej.dx || 0; dy += _ej.dy || 0;
    /* Tay cầm (GamepadInput): cộng dồn vector analog, không xung đột joystick ảo/phím */
    if (typeof GamepadInput !== "undefined" && GamepadInput.moveVec) {
      try {
        var pv = GamepadInput.moveVec();
        if (pv) { dx += pv.dx; dy += pv.dy; }
      } catch (e) {}
    }
    var l = Math.hypot(dx, dy);
    if (l > 1) { dx /= l; dy /= l; l = 1; }
    return { dx: dx, dy: dy, active: l > 0.05 };
  }

  /* ---------- Update ---------- */
  function _passiveLvl(id) {
    var S = _S();
    try {
      if (typeof Skills !== 'undefined' && Skills.passiveLevel) return Skills.passiveLevel(S || {}, id);
    } catch (e) {}
    return (S && S.passives && S.passives[id]) || 0;
  }
  function _speed() {
    /* Build 99: tốc độ xếp tầng đi bộ < chạy < bay; đang bay thì Chạy không cộng thêm (nút Chạy mờ đi khi bay, đúng tutien2d). */
    var sp = player.speed * (Engine.fly ? 2.5 : (Engine.run ? 1.3 : 1));
    sp *= 1 + 0.05 * _passiveLvl('than_phap'); // Thân Pháp: +5% tốc chạy/cấp
    return sp;
  }
  /* Va chạm: vòng tròn player (r=14) vs hộp solid của vật thể */
  function _hitSolid(x, y) {
    for (var i = 0; i < _objects.length; i++) {
      var o = _objects[i];
      if (!o.solid) continue;
      var hw = o.sw / 2, hh = o.sh / 2;
      var cx = Math.max(o.x - hw, Math.min(o.x + hw, x));
      var cy = Math.max(o.y - hh, Math.min(o.y + hh, y));
      var dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy < 14 * 14) return true;
    }
    return false;
  }
  /* Build 94: va chạm tilemap — map chưa có tilemap tự trả false.
   * Phi Hành = Engine.fly (setFly/_speed dùng cùng flag). */
  function _tileBlocked(x, y) {
    try {
      if (typeof Tilemap !== 'undefined' && Tilemap.isBlocked) return !!Tilemap.isBlocked(_mapId, x, y, !!Engine.fly);
    } catch (_e) {}
    return false;
  }
  function _moveBy(dx, dy, dt) {
    var _ox = player.x, _oy = player.y;
    var sp = _speed();
    var nx = Math.max(16, Math.min(WORLD_W - 16, player.x + dx * sp * dt));
    var ny = Math.max(16, Math.min(WORLD_H - 16, player.y + dy * sp * dt));
    /* Trượt dọc vật thể: thử cả 2 trục, rồi từng trục */
    if (!_hitSolid(nx, ny) && !_tileBlocked(nx, ny)) { player.x = nx; player.y = ny; }
    else if (!_hitSolid(nx, player.y) && !_tileBlocked(nx, player.y)) { player.x = nx; }
    else if (!_hitSolid(player.x, ny) && !_tileBlocked(player.x, ny)) { player.y = ny; }
    /* else: kẹt góc — đứng yên */
    /* Quay mặt theo hướng di chuyển: nội suy góc mượt (joystick/phím/tay cầm/tap-to-move đều qua đây) */
    if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
      var _ta = Math.atan2(dy, dx);
      player.ang = _angLerp(player.ang == null ? _ta : player.ang, _ta, Math.min(1, dt * 10));
    }
    if (Math.abs(dx) > 0.01) player.dir = dx >= 0 ? 1 : -1;
    /* walk cycle cho art nhân vật mới: chỉ tích phase khi thực sự di chuyển */
    if (player.x !== _ox || player.y !== _oy) {
      player._walkPhase = (player._walkPhase || 0) + dt;
      player._lastMove = Date.now();
      /* vận tốc cho skeletal anim (run vs walk) */
      if (dt > 0) {
        player._vx = (player.x - _ox) / dt;
        player._vy = (player.y - _oy) / dt;
      }
    } else {
      player._vx = 0; player._vy = 0;
    }
  }
  function _moveToward(tx, ty, dt) {
    var dx = tx - player.x, dy = ty - player.y;
    var d = Math.hypot(dx, dy);
    if (d < 6) return true;
    _moveBy(dx / d, dy / d, dt);
    return false;
  }
  function _nearestMon() {
    var S = _S();
    var mode = (S && S.autoCfg && S.autoCfg.target) || 'nearest';
    var best = null, bd = Infinity, bw = Infinity;
    for (var i = 0; i < _monsters.length; i++) {
      var m = _monsters[i];
      if (m.dead) continue;
      var d = Math.hypot(m.x - player.x, m.y - player.y);
      if (mode === 'boss') {
        var w = (m.boss ? 0 : 1) * 100000 + d;
        if (w < bw) { bw = w; best = m; }
      } else if (mode === 'weakest') {
        var w2 = (m.hp || 0) + d * 0.01;
        if (w2 < bw) { bw = w2; best = m; }
      } else {
        if (d < bd) { bd = d; best = m; }
      }
    }
    return best ? { m: best, d: Math.hypot(best.x - player.x, best.y - player.y) } : null;
  }

  /* Bạo kích: cơ bản 5% + buff Kiếm Tông 10% + Thần Thức (sát thương x1.5) */
  function _rollCrit(dmg) {
    var ch = 0.05;
    try {
      if (typeof Sect !== "undefined" && Sect.sectBuff) ch += Sect.sectBuff(_S() || {}).crit || 0;
      if (typeof BodyCult !== "undefined") {
        var _S0 = _S() || {};
        var _eb = BodyCult.elemBonus(_S0);
        ch += (BodyCult.thanthucBonus(_S0.thanthucLv || 0).critPct + (_eb.critPct || 0)) / 100;
      }
    } catch (e) {}
    if (Math.random() < ch) return { dmg: Math.round(dmg * 1.5), crit: true };
    return { dmg: dmg, crit: false };
  }
  /* Tầm đánh player: cơ bản ATTACK_RANGE + Thần Thức */
  function _atkRange() {
    var r = ATTACK_RANGE;
    try {
      if (typeof BodyCult !== "undefined") {
        var _S1 = _S() || {};
        var _eb1 = BodyCult.elemBonus(_S1);
        var _rp = BodyCult.thanthucBonus(_S1.thanthucLv || 0).rangePct + (_eb1.rangePct || 0);
        r = Math.round(r * (1 + _rp / 100));
      }
    } catch (e) {}
    return r;
  }
  /* Thần Thức: kháng hiệu ứng — giảm sát thương từ kỹ năng boss & đòn quái tinh anh */
  function _applyResist(dmg) {
    try {
      if (typeof BodyCult !== "undefined") {
        var _r = BodyCult.thanthucBonus((_S() && _S().thanthucLv) || 0).resistPct || 0;
        if (_r > 0) dmg = Math.max(1, Math.round(dmg * (1 - _r / 100)));
      }
    } catch (e) {}
    return dmg;
  }
  function _playerAttack(mon, ps) {
    _attackCd = 0.8;
    /* Animation 3 pha: windup 0.08s -> strike 0.12s -> recover 0.15s = 0.35s */
    player.atkT = 0.35;
    player._a20Start = Date.now(); // Build 98: chuỗi attack 20 frame khi đánh thường
    player.atkPhase = 'windup';
    player.dir = mon.x >= player.x ? 1 : -1;
    /* Build 99: quay mặt 4 hướng về phía mục tiêu (player.ang lái _playerDirFace). */
    player.ang = Math.atan2(mon.y - player.y, mon.x - player.x);
    _audio(function (A) { A.sfx('slash'); });
    var dmg = 1;
    var wm = _weakMult();
    if (typeof Combat !== 'undefined') {
      try { dmg = Combat.playerStrike(ps, mon).dmg; }
      catch (e) { dmg = Math.max(1, Math.round(ps.atk - mon.def * 0.6)); mon.hp -= dmg; }
    } else {
      dmg = Math.max(1, Math.round(ps.atk - mon.def * 0.6)); mon.hp -= dmg;
    }
    if (wm > 1) { dmg = Math.round(dmg * wm); mon.hp -= (dmg - Math.round(dmg / wm)); }
    var rc = _rollCrit(dmg);
    if (rc.crit) { mon.hp -= (rc.dmg - dmg); dmg = rc.dmg; }
    _applyLifesteal(dmg);
    _dmgNum(mon.x, mon.y - 26, (rc.crit ? '✦' : '') + '-' + dmg, rc.crit ? '#ff5252' : '#ffd54f');
    _vibrate(rc.crit ? [25, 30, 45] : 20); /* rung khi đánh trúng */
    /* Hit-stop + screen shake: crit đóng băng lâu hơn + rung mạnh */
    _hitStop = rc.crit ? 0.08 : 0.04;
    if (rc.crit) { _shakeT = 0.15; _shakeMag = 4; }
    _skillFx(mon.x, mon.y);
    /* Vũ khí trang phục: hiệu ứng vung theo loại vũ khí (Bui 2026-10-21) */
    try { _fxOutfitWeapon(player.x, player.y - 10, '#ffe9a8'); } catch (e) {}
    mon.hitT = 0.15;
    /* giật lùi nhẹ theo hướng đòn đánh (boss nặng nên ít bị đẩy) + vệt kiếm quang */
    var _ka = Math.atan2(mon.y - player.y, mon.x - player.x);
    var _kb = mon.boss ? 36 : 120;
    mon.kx = Math.cos(_ka) * _kb; mon.ky = Math.sin(_ka) * _kb;
    _fxSlash(mon.x, mon.y, _elemFx(), false, 1);
    if (mon.hp <= 0 && !mon.dead) _killMon(mon);
  }

  function _killMon(mon) {
    mon.dead = true;
    mon.hp = 0;
    mon.dieT = 0.6; /* mờ dần 0.6s trước khi biến mất hẳn */
    _burst(mon.x, mon.y, mon.boss ? 14 : 6, '#ffffff');
    if (player.target === mon) player.target = null;
    if (mon.boss && !_dungeon) _bossRespawnAt = Date.now() / 1000 + BOSS_RESPAWN_S;
    if (Engine.onKill) {
      try {
        Engine.onKill({ uid: mon.uid, monId: mon.monId, def: mon.def, x: mon.x, y: mon.y, boss: mon.boss, elite: !!mon.elite });
      } catch (e) {}
    }
  }

  /* ---------- Buff / Sơ hở / Giáp ---------- */
  function _effStats(ps) {
    var now = Date.now();
    var out = { atk: ps.atk, def: ps.def, maxHp: ps.maxHp, maxMp: ps.maxMp };
    for (var i = _buffs.length - 1; i >= 0; i--) {
      if (now > _buffs[i].until) { _buffs.splice(i, 1); continue; }
      if (_buffs[i].defMult) out.def = Math.round(out.def * _buffs[i].defMult);
      if (_buffs[i].atkMult) out.atk = Math.round(out.atk * _buffs[i].atkMult);
    }
    /* Aura bài xích khi vào map trái đạo: -30% công/thủ */
    try {
      var _st = _S();
      if (_st && _st.mapAura && _st.mapAura.mapDao) {
        out.atk = Math.round(out.atk * 0.7);
        out.def = Math.round(out.def * 0.7);
      }
    } catch (e) {}
    return out;
  }
  /* Hút máu khi gây sát thương (buff Cửu U Ma Tông + bị động Huyết Mạch) */
  function _applyLifesteal(dealt) {
    if (!dealt || dealt <= 0) return;
    try {
      if (typeof Skills === "undefined" || !Skills.lifestealRate) return;
      var r = Skills.lifestealRate(_S() || {});
      if (r > 0 && player.hp > 0) {
        var ps = _effStats(_getStats());
        player.hp = Math.min(ps.maxHp, player.hp + dealt * r);
      }
    } catch (e) {}
  }
  function _weakMult() {
    return Date.now() < _weakUntil ? 1.25 : 1;
  }
  /* Sát thương lên player: giáp (shield) hấp thụ trước */
  function _hurtPlayer(dmg, ps) {
    dmg = Math.max(1, Math.round(dmg));
    if (player.shield > 0) {
      var ab = Math.min(player.shield, dmg);
      player.shield -= ab; dmg -= ab;
    }
    player.hp -= dmg;
    player.hitT = 0.35; /* skeletal anim: bị đánh */
    _dmgNum(player.x, player.y - 26, '-' + dmg, '#ff6b6b');
    _vibrate(50); /* rung khi trúng đòn */
    _audio(function (A) { A.sfx('hit'); });
    if (player.hp <= 0) _playerDie(ps);
    return dmg;
  }

  /* ---------- Hiệu ứng chiêu (giới hạn particle theo mức đồ họa) ---------- */
  function _fxSlash(x, y, color, big, inten) {
    var it = inten || 1;
    _fx.push({ kind: 'slash', x: x, y: y, r: 10 * it, max: (big ? 90 : 60) * it,
               t: 0.3, maxT: 0.3, color: color || '#ffd6e8' });
  }
  function _fxFire(x, y, color, inten) {
    var it = inten || 1;
    _fx.push({ kind: 'fire', x: x, y: y, r: 12 * it, max: 80 * it,
               t: 0.5, maxT: 0.5, color: color || '#ff8a3c' });
    _burst(x, y, 10, color || '#ff8a3c');
  }
  function _fxLightning(x, y, inten) {
    _fx.push({ kind: 'lightning', x: x, y: y, t: 0.4, maxT: 0.4,
               color: '#b388ff', inten: inten || 1 });
  }
  function _fxCircle(x, y, color, inten) {
    var it = inten || 1;
    _fx.push({ kind: 'circle', x: x, y: y, r: 20 * it, max: 70 * it,
               t: 0.8, maxT: 0.8, color: color || '#7fd4ff' });
  }
  function _fxBolt(tx, ty, color, inten) {
    _fx.push({ kind: 'bolt', x: player.x, y: player.y, tx: tx, ty: ty,
               t: 0.25, maxT: 0.25, color: color || '#cfe8ff', inten: inten || 1 });
  }
  function _fxBreath(x, y, ang, color, inten) {
    /* phun độc/lửa hình nón từ mồm quái về hướng ang */
    var it = inten || 1, col = color || '#a0ff70';
    _fx.push({ kind: 'breath', x: x, y: y, ang: ang, t: 0.6, maxT: 0.6, color: col, inten: it });
    var lvl = GFX_LEVELS[_gfxLevel] || GFX_LEVELS.cao;
    var n = Math.round(16 * it * (lvl.particle == null ? 1 : lvl.particle));
    for (var i = 0; i < n; i++) {
      var a = ang + (Math.random() - 0.5) * 0.75;
      var sp = (130 + Math.random() * 170) * it;
      _fx.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
                 t: 0.55, maxT: 0.55, color: col, dot: true, sz: 3 + Math.random() * 4 });
    }
  }
  function _fxRain(x, y, color, inten) {
    /* mưa sét: nhiều tia sét đánh xuống quanh điểm */
    _fx.push({ kind: 'rain', x: x, y: y, t: 0.7, maxT: 0.7,
               color: color || '#b388ff', inten: inten || 1 });
  }
  function _announce(x, y, txt, color) {
    /* tên chiêu/buff hiện to giữa màn hình như video tutien2d */
    _dmgNums.push({ x: x, y: y, txt: txt, color: color || '#ffffff',
                    t: 1.5, maxT: 1.5, big: true });
    if (_dmgNums.length > 40) _dmgNums.shift();
  }
  /* Chọn hiệu ứng theo skill */
  var _SKILL_FX = {
    kiem_xuyen_van: 'bolt', van_kiem_quy_tong: 'slash', kiem_cuong_ho_the: 'circle',
    ngu_loi_oanh_dinh: 'lightning', hoa_vu_luu_tinh: 'fire', linh_thuan: 'circle',
    ba_vuong_quyen: 'slash', chan_dia_chuong: 'fire', kim_cuong_bat_hoai: 'circle',
    kimdan_kiem_y: 'bolt', kimdan_loi_phap: 'lightning', kimdan_the_quyen: 'slash',
  };
  /* ---- Build 98: lớp nhân vật + FX sprite 20 frame (SKILL_FX / CHAR_ANIM20) ----
   * Lớp cho hoạt ảnh 20 frame: char.class đã chọn > tông môn đã gia nhập > Kiếm Tu.
   * Tông môn -> lớp: Kiếm Tông->Kiếm Tu, Thiên Pháp Tông->Pháp Tu, Kim Cang Tông->Đao Tu,
   * Ngự Thú Tông->Cung Tu, Dược Vương Tông->Thuật Sĩ (Cửu U Ma Tông không có lớp -> fallback). */
  var _CLASS20_BY_SECT = { kiem_tong: 'kiem_tu', thien_phap_tong: 'phap_tu',
    kim_cang_tong: 'dao_tu', ngu_thu_tong: 'cung_tu', duoc_vuong_tong: 'thuat_si' };
  function _playerClass20() {
    try {
      var S = _S();
      if (S && S.char && typeof S.char.class === 'string') {
        var c = S.char.class;
        if (typeof CHAR_ANIM20 !== 'undefined' && CHAR_ANIM20[c + '_move_down']) return c;
      }
      if (S && S.sectInfo && S.sectInfo.joined && _CLASS20_BY_SECT[S.sectInfo.joined]) {
        return _CLASS20_BY_SECT[S.sectInfo.joined];
      }
    } catch (e) {}
    return 'kiem_tu';
  }
  /* FX theo lớp cho từng loại chiêu (chỉ dùng khi skillId không khớp trực tiếp SKILL_FX). */
  var _CLASS20_FX = {
    kiem_tu: { dmg: 'kiem_khi_tram', aoe: 'van_kiem_quy_tong' },
    phap_tu: { dmg: 'hoa_cau', aoe: 'thien_thach_tran' },
    dao_tu: { dmg: 'huyet_anh_tram', aoe: 'viem_nguc_tran' },
    cung_tu: { dmg: 'lien_tien', aoe: 'tan_hoa_tien', buff: 'linh_thu_ho_the' },
    thuat_si: { dmg: 'trieu_hoi_linh_thu', aoe: 'lien_ket_sinh_menh', buff: 'bua_ho_than' },
  };
  function _resolveSkillFxEntry(skillId, kind) {
    try {
      if (typeof SKILL_FX === 'undefined') return null;
      if (SKILL_FX[skillId]) return SKILL_FX[skillId];
      var cls = _playerClass20();
      var m = _CLASS20_FX[cls] || _CLASS20_FX.kiem_tu;
      var key = null;
      if (kind === 'buff') key = m.buff || null;
      else if (kind === 'aoe') key = m.aoe || null;
      else key = m.dmg || null;
      return (key && SKILL_FX[key]) ? SKILL_FX[key] : null;
    } catch (e) { return null; }
  }
  /* Đẩy 1 chuỗi frame FX sprite vào pipeline _fx (vẽ chung ở vòng render).
   * projectile bay từ người dùng tới mục tiêu; các loại khác đứng tại điểm tung chiêu. */
  function _pushSpriteFx(entry, x, y) {
    if (!entry || !entry.frames || !entry.frames.length) return;
    var dur = entry.frames.length * (entry.frameMs || 50) / 1000;
    var fx = { kind: 'sprite20', x: x, y: y, frames: entry.frames, frameMs: entry.frameMs || 50,
               t: dur, maxT: dur, color: entry.color || '#fff', size: 120 };
    if (entry.type === 'projectile') {
      fx.sx = player.x; fx.sy = player.y - 10; fx.tx = x; fx.ty = y;
      fx.x = player.x; fx.y = player.y - 10; fx.size = 110;
    } else if (entry.type === 'slash') { fx.size = 130; }
    else if (entry.type === 'aoe') { fx.size = 150 + (entry.aoe || 2) * 30; }
    else if (entry.type === 'summon') { fx.size = 120; }
    else if (entry.type === 'buff') { fx.size = 110; }
    for (var i = 0; i < entry.frames.length; i++) { try { _img(entry.frames[i]); } catch (e) {} }
    _fx.push(fx);
  }
  /* Frame hoạt ảnh 20 frame của người chơi (CHAR_ANIM20): attack chạy 1 lần từ lúc
   * bắt đầu đánh/tung chiêu (player._a20Start), move chạy vòng theo frameMs của data.
   * Trả src chỉ khi frame đã tải xong; chưa xong -> warm cache rồi trả null để đường
   * vẽ cũ vẽ tạm (không mất hình, không crash). */
  function _anim20PlayerSrc(face, moving) {
    try {
      if (typeof CHAR_ANIM20 === 'undefined') return null;
      var cls = _playerClass20();
      var now = Date.now();
      if (player._a20Start) {
        var atk = CHAR_ANIM20[cls + '_attack_' + face];
        if (atk && atk.frames && atk.frames.length) {
          var el = now - player._a20Start;
          var dur = atk.frames.length * (atk.frameMs || 45);
          if (el < dur) {
            var fi = Math.min(atk.frames.length - 1, Math.floor(el / (atk.frameMs || 45)));
            var s = atk.frames[fi];
            var ce = _imgCache[s];
            if (ce && ce.done && ce.ok) return s;
            _img(s);
            return null;
          }
          player._a20Start = 0;
        }
      }
      if (moving) {
        var mv = CHAR_ANIM20[cls + '_move_' + face];
        if (mv && mv.frames && mv.frames.length) {
          var mi = Math.floor(now / (mv.frameMs || 60)) % mv.frames.length;
          var ms = mv.frames[mi];
          var me = _imgCache[ms];
          if (me && me.done && me.ok) return ms;
          _img(ms);
          return null;
        }
      }
    } catch (e) {}
    return null;
  }

  function _playSkillFx(skillId, x, y, color, level, kind) {
    /* Build 98: có FX sprite 20 frame -> dùng nó thay cho hiệu ứng procedural cũ
     * (kể cả vệt vũ khí trang phục, tránh chồng 2 hiệu ứng). Không có -> đường cũ. */
    var _sfx = _resolveSkillFxEntry(skillId, kind);
    if (_sfx) { _pushSpriteFx(_sfx, x, y); return; }
    var k = _SKILL_FX[skillId] || 'slash';
    var inten = 1 + Math.min(9, (level || 1) - 1) * 0.06; /* cấp càng cao hiệu ứng càng đậm */
    /* Vũ khí trang phục đang cầm: hiệu ứng riêng theo loại vũ khí (Bui 2026-10-21) */
    try { _fxOutfitWeapon(player.x, player.y - 10, color); } catch (e) {}
    if (k === 'bolt') _fxBolt(x, y, color, inten);
    else if (k === 'fire') _fxFire(x, y, color, inten);
    else if (k === 'lightning') _fxLightning(x, y, inten);
    else if (k === 'circle') _fxCircle(player.x, player.y, color, inten);
    else _fxSlash(x, y, color, true, inten);
  }

  function _calcDmg(atk, def, mult, pierce) {
    if (pierce > 0 && typeof Combat !== 'undefined' && Combat.pierceDamage) {
      try { return Combat.pierceDamage(atk, def, mult, pierce); } catch (e) {}
    }
    if (typeof Combat !== 'undefined' && Combat.calcDamage) {
      try { return Combat.calcDamage(atk, def, mult); } catch (e) {}
    }
    return Math.max(1, Math.round((atk - def * 0.6 * (1 - (pierce || 0))) * mult));
  }
  function _damageMon(mon, dmg) {
    mon.hp -= dmg;
    _dmgNum(mon.x, mon.y - 26, '-' + dmg, '#ffd54f');
    mon.hitT = 0.15;
    if (mon.hp <= 0 && !mon.dead) _killMon(mon);
  }

  /* Tung bí thuật: ui.js gọi sau khi Skills.canCast ok (engine tự check lại).
   * Trả {ok, reason?}. */
  function useSkill(skillId) {
    var S = _S();
    if (!S || typeof Skills === 'undefined') return { ok: false, reason: 'chua_hoc' };
    var nowMs = Date.now();
    var chk;
    try { chk = Skills.canCast(S, skillId, nowMs, player.mp); }
    catch (e) { return { ok: false, reason: 'chua_hoc' }; }
    if (!chk.ok) return chk;
    var cast;
    try { cast = Skills.castSkill(S, skillId, nowMs); }
    catch (e) { return { ok: false, reason: 'chua_hoc' }; }
    player.mp = Math.max(0, player.mp - chk.power.mp);
    if (S.char) S.char.mp = player.mp;
    player.atkT = 0.25; // chồm lên khi tung chiêu
    player.skillT = 0.4; // khung skill riêng (không dùng khung đánh thường)
    player._a20Start = Date.now(); // Build 98: chuỗi attack 20 frame khi tung chiêu
    player.lastSkill = skillId; // Bui 2026-10-21: để chọn hình chưởng ấn
    var ps = _effStats(_getStats());
    var def = cast.def, wm = _weakMult();
    _audio(function (A) { A.sfx('slash'); });
    try { /* tên chiêu hiện lên như video */
      var _skn = _t('sk_' + skillId) !== ('sk_' + skillId) ? _t('sk_' + skillId) : (def.name || skillId);
      _announce(player.x, player.y - 64, _skn, def.fx || '#fff3b0');
    } catch (e2) {}

    if (def.kind === 'buff') {
      _buffs.push({ defMult: def.defMult || 1, atkMult: def.atkMult || 1, until: nowMs + (def.dur || 15) * 1000, fx: def.fx });
      if (skillId === 'kim_cuong_bat_hoai') {
        player.maxShield = Math.round(ps.maxHp * 0.5);
        player.shield = Math.min(player.maxShield, player.shield + Math.round(ps.maxHp * 0.3));
      }
      /* Độc chiêu Dược Vương Tông: hồi ngay 50% HP + khiên 50% HP */
      if (skillId === 'hoi_thien_tao_hoa') {
        player.hp = Math.min(ps.maxHp, player.hp + Math.round(ps.maxHp * 0.5));
        player.maxShield = Math.round(ps.maxHp * 0.8);
        player.shield = Math.min(player.maxShield, player.shield + Math.round(ps.maxHp * 0.5));
      }
      _playSkillFx(skillId, player.x, player.y, def.fx, chk.power.level, 'buff');
      _dmgNum(player.x, player.y - 30, 'buff', def.fx || '#fff3b0');
      return { ok: true };
    }
    var tgt = (player.target && !player.target.dead) ? player.target
      : (function () { var nm = _nearestMon(); return nm ? nm.m : null; })();
    if (!tgt) return { ok: false, reason: 'no_target' };
    player.dir = tgt.x >= player.x ? 1 : -1;
    if (def.kind === 'aoe') {
      var hit = 0;
      for (var i = 0; i < _monsters.length; i++) {
        var m = _monsters[i];
        if (m.dead) continue;
        if (Math.hypot(m.x - tgt.x, m.y - tgt.y) > 170) continue;
        var _dmg = _calcDmg(ps.atk, m.def, chk.power.mult * wm, chk.power.pierce);
        _damageMon(m, _dmg);
        _applyLifesteal(_dmg);
        hit++;
      }
      _playSkillFx(skillId, tgt.x, tgt.y, def.fx, chk.power.level, 'aoe');
      if (wm > 1) _dmgNum(tgt.x, tgt.y - 44, 'SƠ HỞ!', '#ffeb3b');
      return { ok: true, hits: hit };
    }
    /* dmg đơn thể (+ lan từ mốc Thiên/Địa) */
    var baseDmg = _calcDmg(ps.atk, tgt.def, chk.power.mult * wm, chk.power.pierce);
    var rc2 = _rollCrit(baseDmg);
    _damageMon(tgt, rc2.dmg);
    _applyLifesteal(rc2.dmg);
    if (rc2.crit) _dmgNum(tgt.x, tgt.y - 44, '✦ BẠO KÍCH', '#ff5252');
    if (chk.power.splash > 0) {
      for (var si = 0; si < _monsters.length; si++) {
        var sm = _monsters[si];
        if (sm.dead || sm === tgt) continue;
        if (Math.hypot(sm.x - tgt.x, sm.y - tgt.y) > 130) continue;
        _damageMon(sm, Math.max(1, Math.round(baseDmg * chk.power.splash)));
      }
      _fx.push({ kind: 'ring', x: tgt.x, y: tgt.y, r: 10, max: 130,
                 t: 0.35, maxT: 0.35, color: def.fx });
    }
    _playSkillFx(skillId, tgt.x, tgt.y, def.fx, chk.power.level, 'dmg');
    if (wm > 1) _dmgNum(tgt.x, tgt.y - 44, 'SƠ HỞ!', '#ffeb3b');
    return { ok: true, hits: 1 };
  }

  /* Đánh thường bằng nút: khóa mục tiêu gần nhất; ngoài tầm thì dí theo rồi đánh */
  function manualAttack() {
    var ps = _effStats(_getStats());
    var tgt = (player.target && !player.target.dead) ? player.target
      : (function () { var nm = _nearestMon(); return nm ? nm.m : null; })();
    if (!tgt) { _chaseTgt = false; _toast('atk_no_target'); return false; }
    player.target = tgt;
    var d = Math.hypot(tgt.x - player.x, tgt.y - player.y);
    if (d > ATK_CHASE_MAX) { _chaseTgt = false; _toast('atk_too_far'); return true; }
    if (d > _atkRange()) { _chaseTgt = true; return true; } // dí theo, tick sẽ đánh khi vào tầm
    _chaseTgt = false;
    if (_attackCd > 0) return false;
    _playerAttack(tgt, ps);
    return true;
  }

  /* Lướt: tốn 25 Thần Thức, hồi 3s */
  function dash() {
    if (_dashCd > 0) return false;
    if (player.focus < 25) return false;
    player.focus -= 25;
    var iv = _inputVec();
    var dx = iv.dx, dy = iv.dy;
    if (!iv.active) {
      var tgt = (player.target && !player.target.dead) ? player.target : null;
      if (tgt) {
        var d = Math.hypot(tgt.x - player.x, tgt.y - player.y) || 1;
        dx = (tgt.x - player.x) / d; dy = (tgt.y - player.y) / d;
      } else { dx = player.dir >= 0 ? 1 : -1; dy = 0; }
    }
    _dashDx = dx; _dashDy = dy;
    _dashT = 0.18; _dashCd = 3;
    _burst(player.x, player.y, 6, '#bfe8ff');
    _audio(function (A) { A.sfx('slash'); });
    return true;
  }

  /* Auto tự tung skill khi hồi chiêu (giống tutien2d) */
  function _autoSkills(ps) {
    var S = _S();
    if (!S || typeof Skills === 'undefined') return;
    if (S.autoCfg && S.autoCfg.autoSkill === false) return;
    var tgt = (player.target && !player.target.dead) ? player.target : null;
    if (!tgt) return;
    var ids = S.skills || [];
    for (var i = 0; i < ids.length; i++) {
      var d = null;
      try { d = Skills.skillDef(ids[i]); } catch (e) { continue; }
      if (!d || d.kind === 'buff') continue; // buff: chỉ tung tay
      var chk = null;
      try { chk = Skills.canCast(S, ids[i], Date.now(), player.mp); } catch (e) { continue; }
      if (chk && chk.ok) { useSkill(ids[i]); break; } // mỗi tick 1 chiêu
    }
  }

  /* ---------- Linh thú: đi theo, cùng đánh, skill AoE ---------- */
  function _petActive() {
    var S = _S();
    if (!S || !S.pet) return false;
    try {
      if (typeof Pet !== 'undefined' && Pet.petActive) return Pet.petActive(S);
    } catch (e) {}
    return true;
  }
  function _updatePet(dt) {
    var S = _S();
    if (!_petActive() || !S.pet) return;
    /* đi theo chủ — vị trí theo kiểu di chuyển của loài (fly/run/crawl) */
    var mv = 'run';
    try { if (typeof Pet !== 'undefined' && Pet.petMovement) mv = Pet.petMovement(S.pet); } catch (e) {}
    var tx, ty;
    if (mv === 'fly') { tx = player.x + 46; ty = player.y - 40; }       /* bay lượn trên đầu */
    else if (mv === 'crawl') { tx = player.x - 70; ty = player.y + 62; } /* bò/trườn hơi sau */
    else { tx = player.x - 52; ty = player.y + 44; }                     /* chạy ngang vai */
    var dx = tx - _pet.x, dy = ty - _pet.y;
    var d = Math.hypot(dx, dy);
    if (d > 200) { _pet.x = tx; _pet.y = ty; } /* quá xa → dịch chuyển */
    else if (d > 8) {
      var sp = _speed() * 1.15; /* theo kịp mọi trạng thái: đi bộ/chạy/ngự kiếm */
      _pet.x += dx / d * sp * dt;
      _pet.y += dy / d * sp * dt;
      /* linh thú quay mặt theo hướng di chuyển (mượt) */
      var _pa = Math.atan2(dy, dx);
      _pet.ang = _angLerp(_pet.ang == null ? _pa : _pet.ang, _pa, Math.min(1, dt * 8));
    }
    var tgt = (player.target && !player.target.dead) ? player.target : null;
    _pet.atkCd -= dt; _pet.skillCd -= dt;
    var pst = null;
    try {
      if (typeof Pet !== 'undefined' && Pet.petStats) pst = Pet.petStats(S.pet, S);
    } catch (e) {}
    if (!pst) return;
    if (tgt && Math.hypot(tgt.x - _pet.x, tgt.y - _pet.y) < 260) {
      if (_pet.atkCd <= 0) {
        _pet.atkCd = 2;
        _damageMon(tgt, Math.max(1, Math.round(pst.atk * (0.9 + Math.random() * 0.2))));
        _burst(tgt.x, tgt.y, 3, '#ffd54f');
      }
      if (_pet.skillCd <= 0) {
        _pet.skillCd = 12;
        /* skill signature riêng của loài + hiệu ứng đặc trưng */
        var psp = null;
        try { if (typeof Pet !== 'undefined' && Pet.petSpeciesOf) psp = Pet.petSpeciesOf(S.pet); } catch (e) {}
        var skName = (psp && psp.skill) ? (S.lang === 'en' ? psp.skill.en : psp.skill.vi) : 'pet!';
        var skColor = (psp && psp.skill && psp.skill.effect_mau) || '#ffd54f';
        for (var i = 0; i < _monsters.length; i++) {
          var m = _monsters[i];
          if (m.dead) continue;
          if (Math.hypot(m.x - _pet.x, m.y - _pet.y) > 150) continue;
          _damageMon(m, pst.skillDmg);
        }
        _fx.push({ kind: 'ring', x: _pet.x, y: _pet.y, r: 10, max: 150,
                   t: 0.4, maxT: 0.4, color: skColor });
        _dmgNum(_pet.x, _pet.y - 30, skName, skColor);
      }
    }
  }
  function _drawPet() {
    var S = _S();
    if (!_petActive() || !S.pet) return;
    var sp = null, mv = 'run', img = PET_SPRITE;
    try {
      if (typeof Pet !== 'undefined' && Pet.petSpeciesOf) {
        sp = Pet.petSpeciesOf(S.pet);
        if (sp) { mv = sp.movement || 'run'; img = sp.img || img; }
      }
    } catch (e) {}
    var tierColor = '#e8e8e8';
    try {
      if (typeof Pet !== 'undefined' && Pet.petTier) tierColor = Pet.petTier(S.pet.tier).color;
    } catch (e2) {}
    /* animation theo kiểu di chuyển của loài */
    var now = Date.now() / 1000;
    var bx = _pet.x, by = _pet.y, lift = 0, size = 36, noTilt = false;
    var blift = _bridgeLiftAt(_pet.x, _pet.y); /* đứng trên cầu: nâng theo mặt cầu */
    if (mv === 'fly') {
      lift = 26; /* bay lượn: vỗ cánh nhấp nhô trên không */
      by = _pet.y - lift - blift + Math.sin(now * 3.2) * 7;
      size = 40;
    } else if (mv === 'crawl') {
      bx = _pet.x + Math.sin(now * 2.1) * 8; /* bò/trườn: uốn mình */
      by = _pet.y - blift + Math.abs(Math.sin(now * 2.1)) * 3;
      size = 38; noTilt = true;
    } else {
      var pd = Math.abs(_pet.x - (_pet.__px == null ? _pet.x : _pet.__px));
      if (pd > 0.4) by = _pet.y - blift - Math.abs(Math.sin(now * 9)) * 5; /* chạy: nhấp nhô chân */
      else by = _pet.y - blift;
    }
    /* hào quang theo phẩm */
    _ctx.globalAlpha = 0.5;
    _ctx.strokeStyle = tierColor;
    _ctx.lineWidth = 3;
    _ctx.beginPath(); _ctx.arc(bx, by, size * 0.62, 0, Math.PI * 2); _ctx.stroke();
    _ctx.globalAlpha = 1;
    /* sprite 4 hướng theo góc quay mặt (up/down/left/right, trái lật từ right) */
    var pface = _face4(_pet, _pet.ang == null ? Math.PI / 2 : _pet.ang);
    var pimg = _petDirSrc(img, pface);
    _drawCreature(_pet, bx, by, size, size, pimg, '#c9a227',
      { lift: lift + blift, shadowY: _pet.y + 14 - blift, noTilt: noTilt, faceAng: _pet.ang });
  }
  /* ---------- Thần thú đồng hành 3D (theo linh căn) ---------- */
  function _sbActive() {
    var S = _S();
    if (!S) return false;
    try {
      if (typeof SpiritBeast !== 'undefined' && SpiritBeast.sbActive) return SpiritBeast.sbActive(S);
    } catch (e) {}
    return !!(S.spiritBeast && S.spiritBeast.enabled !== false);
  }
  function _sbInitPos() {
    _sb.x = player.x + 60; _sb.y = player.y - 20;
  }
  function _updateSpiritBeast(dt, ps) {
    var S = _S();
    if (!_sbActive()) { _sbProjs.length = 0; return; }
    var sb = S.spiritBeast;
    if (Math.abs(_sb.x) < 1 && Math.abs(_sb.y) < 1) _sbInitPos();
    /* bay quanh nhân vật theo quỹ đạo tròn, độ cao thay đổi */
    var R = (typeof SpiritBeast !== 'undefined' && SpiritBeast.SB_ORBIT_R) || 80;
    _sb.ang += dt * 1.4;
    _sb.x = player.x + Math.cos(_sb.ang) * R;
    _sb.y = player.y + Math.sin(_sb.ang) * R * 0.7;
    var now = Date.now() / 1000;
    _sb.lift = 30 + Math.sin(now * 2.2) * 18;
    /* animation vỗ cánh: up → mid → down → mid */
    _sb.frameT += dt;
    if (_sb.frameT >= 0.18) { _sb.frameT = 0; _sb.frameIdx = (_sb.frameIdx + 1) % 4; }
    /* cập nhật đạn skill */
    for (var i = _sbProjs.length - 1; i >= 0; i--) {
      var pr = _sbProjs[i];
      pr.t += dt;
      if (!pr.tgt || pr.tgt.dead) { _sbProjs.splice(i, 1); continue; }
      var pdx = pr.tgt.x - pr.x, pdy = (pr.tgt.y - 20) - pr.y;
      var pd = Math.hypot(pdx, pdy);
      if (pd < 18 || pr.t > 3) {
        _sbProjHit(pr, ps);
        _sbProjs.splice(i, 1);
        continue;
      }
      pr.x += pdx / pd * pr.sp * dt;
      pr.y += pdy / pd * pr.sp * dt;
    }
    /* tự động tấn công quái gần nhất trong 300px */
    _sb.skillCd -= dt;
    if (_sb.skillCd > 0) return;
    var RANGE = (typeof SpiritBeast !== 'undefined' && SpiritBeast.SB_RANGE) || 300;
    var tgt = null, best = RANGE;
    for (var j = 0; j < _monsters.length; j++) {
      var m = _monsters[j];
      if (m.dead) continue;
      var md = Math.hypot(m.x - _sb.x, m.y - _sb.y);
      if (md < best) { best = md; tgt = m; }
    }
    if (!tgt) return;
    var CD = (typeof SpiritBeast !== 'undefined' && SpiritBeast.SB_SKILL_CD) || 3;
    _sb.skillCd = CD;
    var el = sb.element, def = null;
    try { def = SpiritBeast.sbDef(el); } catch (e) {}
    var dmg = 10;
    try { dmg = SpiritBeast.sbDmg(ps.atk, sb); } catch (e2) {}
    _sbProjs.push({ x: _sb.x, y: _sb.y - _sb.lift, tgt: tgt, el: el,
                    dmg: dmg, sp: 520, color: (def && def.color) || '#ffffff', t: 0 });
    _audio(function (A) { A.sfx('slash'); });
  }
  /* Đạn trúng: sát thương + debuff theo hệ + nổ hiệu ứng */
  function _sbProjHit(pr, ps) {
    var S = _S();
    if (!S) return;
    var def = null;
    try { def = SpiritBeast.sbDef(pr.el); } catch (e) {}
    var color = (def && def.color) || '#ffffff';
    var skillName = '';
    try { skillName = SpiritBeast.sbSkillName(pr.el, S.lang); } catch (e2) {}
    var targets = [pr.tgt];
    if (def && def.aoe) { /* Phong: lốc xoáy AoE */
      for (var i = 0; i < _monsters.length; i++) {
        var m = _monsters[i];
        if (m.dead || m === pr.tgt) continue;
        if (Math.hypot(m.x - pr.tgt.x, m.y - pr.tgt.y) < 110) targets.push(m);
      }
    }
    for (var k = 0; k < targets.length; k++) {
      var tm = targets[k];
      if (tm.dead) continue;
      _damageMon(tm, pr.dmg);
      /* debuff theo hệ */
      if (def && def.debuff && !tm.dead) {
        if (!tm.sbDb) tm.sbDb = {};
        var db = tm.sbDb;
        if (def.debuff === 'burn') { db.burnT = 4; db.burnDps = Math.max(3, Math.round(pr.dmg * 0.3)); }
        else if (def.debuff === 'slow') { db.slowT = 3; }
        else if (def.debuff === 'stun') { db.stunT = 1.2; }
        else if (def.debuff === 'fear') { db.fearT = 2; db.fearX = _sb.x; db.fearY = _sb.y; }
        else if (def.debuff === 'poison') { db.poisonT = 5; db.poisonDps = Math.max(2, Math.round(pr.dmg * 0.2)); }
      }
      try { SpiritBeast.sbAddExp(S, 1); } catch (e3) {}
    }
    /* hiệu ứng nổ theo hệ */
    _fx.push({ kind: 'fire', x: pr.tgt.x, y: pr.tgt.y - 20, r: 12, max: def && def.aoe ? 130 : 80,
               t: 0.4, maxT: 0.4, color: color });
    _burst(pr.tgt.x, pr.tgt.y - 20, 6, color);
    if (skillName) _announce(pr.tgt.x, pr.tgt.y - 70, skillName, color);
    /* Quang: hồi máu nhẹ cho chủ; Huyết: hút máu */
    var healAmt = 0;
    if (def && def.heal) healAmt = Math.round(pr.dmg * def.heal);
    if (def && def.lifesteal) healAmt = Math.round(pr.dmg * def.lifesteal);
    if (healAmt > 0) {
      player.hp = Math.min(ps.maxHp, player.hp + healAmt);
      _dmgNum(player.x, player.y - 50, '+' + healAmt, '#7dff9a');
      _burst(player.x, player.y - 20, 4, '#7dff9a');
    }
  }
  function _drawSbProjs() {
    for (var i = 0; i < _sbProjs.length; i++) {
      var pr = _sbProjs[i];
      _ctx.globalAlpha = 0.9;
      _ctx.fillStyle = pr.color;
      _ctx.shadowBlur = 14; _ctx.shadowColor = pr.color;
      _ctx.beginPath(); _ctx.arc(pr.x, pr.y, 7, 0, Math.PI * 2); _ctx.fill();
      _ctx.globalAlpha = 0.4;
      _ctx.beginPath(); _ctx.arc(pr.x, pr.y, 12, 0, Math.PI * 2); _ctx.fill();
      _ctx.shadowBlur = 0; _ctx.globalAlpha = 1;
    }
  }
  function _drawSpiritBeast() {
    var S = _S();
    if (!_sbActive()) return;
    var el = S.spiritBeast.element;
    var frames = ['up', 'mid', 'down', 'mid'];
    var src = 'assets/linhcan/beast_' + el + '_' + frames[_sb.frameIdx] + '.png';
    var def = null;
    try { def = SpiritBeast.sbDef(el); } catch (e) {}
    var col = (def && def.color) || '#ffffff';
    var lift = _sb.lift;
    /* hiệu ứng 3D: bay cao → nhỏ lại, bay thấp → to ra */
    var size = 58 * (1 - Math.min(lift, 60) / 160);
    var blift = _bridgeLiftAt(_sb.x, _sb.y);
    var by = _sb.y - lift - blift;
    /* hào quang theo hệ */
    _ctx.globalAlpha = 0.45;
    _ctx.strokeStyle = col;
    _ctx.lineWidth = 2;
    _ctx.beginPath(); _ctx.arc(_sb.x, by, size * 0.62, 0, Math.PI * 2); _ctx.stroke();
    _ctx.globalAlpha = 1;
    _drawCreature(_sb, _sb.x, by, size, size, src, col,
      { lift: lift + blift, shadowY: _sb.y + 12 - blift, faceAng: _sb.ang + Math.PI / 2 });
  }
  /* Tự uống thuốc theo cài đặt */
  function _autoPotion(ps) {
    var S = _S();
    if (!S || !S.autoCfg || S.autoCfg.autoPotion === false) return;
    if (!S.bag || !S.bag.length) return;
    var hpPct = player.hp / ps.maxHp * 100;
    var mpPct = player.mp / ps.maxMp * 100;
    var needHp = hpPct < (S.autoCfg.potionAt || 30);
    var needMp = mpPct < (S.autoCfg.mpPotionAt || 30);
    if (!needHp && !needMp) return;
    var best = null, bi = -1, wantHp = needHp && !needMp ? true : needHp;
    for (var i = 0; i < S.bag.length; i++) {
      var it = S.bag[i];
      if (it.locked || !it.qty) continue;
      var d = (typeof ITEMS !== 'undefined' && ITEMS[it.id]) || null;
      if (!d || d.kind !== 'pill') continue;
      if (wantHp && d.healHp && (!best || d.healHp > (best.healHp || 0))) { best = d; bi = i; }
      else if (!wantHp && d.healMp && (!best || d.healMp > (best.healMp || 0))) { best = d; bi = i; }
    }
    if (best && bi >= 0) {
      S.bag[bi].qty--;
      if (S.bag[bi].qty <= 0) S.bag.splice(bi, 1);
      /* Buff Dược Vương Tông: +30% hiệu quả đan dược */
      var _pm = 1;
      try {
        if (typeof Sect !== "undefined" && Sect.sectBuff) _pm = Sect.sectBuff(S).pillMult || 1;
      } catch (e) {}
      if (best.healHp) player.hp = Math.min(ps.maxHp, player.hp + ps.maxHp * best.healHp * _pm);
      if (best.healMp) player.mp = Math.min(ps.maxMp, player.mp + ps.maxMp * best.healMp * _pm);
      _dmgNum(player.x, player.y - 40, '+', '#7fd4ff');
    }
  }

  /* ---------- Boss: vòng đỏ báo AoE + cửa sổ SƠ HỞ ---------- */
  function _bossSkill(m, ps) {
    if (typeof Combat !== 'undefined' && Combat.bossSkill) {
      try { Combat.bossSkill(m.monId); } catch (e) {}
    }
    /* Vòng tròn đỏ báo trước: 1.2s sau mới nổ tại vị trí player lúc đó */
    _bossTele.push({
      x: player.x, y: player.y, r: 130,
      warnT: 1.2, hitT: 1.2, dmg: Math.round(m.atk * 1.5),
    });
    _audio(function (A) { A.sfx('fail'); });
    /* tên chiêu boss + phun độc/lửa từ mồm về phía người chơi */
    try {
      var _bnm = _t((m.def && m.def.nameKey) || m.monId);
      _announce(m.x, m.y - 78, _bnm + ' ' + _t('boss_cast'), '#ff8a80');
    } catch (e3) {}
    var _ba = Math.atan2(player.y - m.y, player.x - m.x);
    _fxBreath(m.x, m.y - 12, _ba, '#a0ff70', m.boss ? 1.4 : 1);
  }
  function _updateTelegraphs(dt, ps) {
    for (var i = _bossTele.length - 1; i >= 0; i--) {
      var tp = _bossTele[i];
      tp.warnT -= dt;
      if (tp.warnT <= 0) {
        /* Nổ: đứng trong vòng → ăn đòn */
        var d = Math.hypot(player.x - tp.x, player.y - tp.y);
        _fx.push({ kind: 'fire', x: tp.x, y: tp.y, r: 20, max: tp.r,
                   t: 0.4, maxT: 0.4, color: '#ff3b30' });
        if (d < tp.r) {
          var dmg = Math.max(1, Math.round(tp.dmg - ps.def * 0.6));
          _hurtPlayer(dmg, ps);
        }
        _bossTele.splice(i, 1);
        /* Sau khi boss tung AoE → lộ sơ hở 3s, sát thương +25% */
        _weakUntil = Date.now() + 3000;
      }
    }
  }

  /* Thông tin boss đang đánh (cho thanh HP boss trên UI) */
  function getBossInfo() {
    var t = (player.target && !player.target.dead) ? player.target : null;
    if (!t || !t.boss) return null;
    var nm = t.def && t.def.nameKey ? _t(t.def.nameKey) : 'BOSS';
    var cg = t.def && t.def.cg ? 'CG.' + t.def.cg : '';
    return { name: nm, realm: cg, hp: Math.max(0, Math.round(t.hp)), maxHp: t.maxHp,
             weak: Date.now() < _weakUntil };
  }
  function isWeak() { return Date.now() < _weakUntil; }

  function _bossSkill(m, ps) {
    if (typeof Combat !== 'undefined' && Combat.bossSkill) {
      try { Combat.bossSkill(m.monId); } catch (e) {}
    }
    _fx.push({ x: m.x, y: m.y, r: 20, max: 150, t: 0.5, maxT: 0.5, color: '#ff3b30' });
    var d = Math.hypot(player.x - m.x, player.y - m.y);
    if (d < 150) {
      var dmg = _applyResist(Math.max(1, Math.round(m.atk * 1.5 - ps.def * 0.6))); /* kháng hiệu ứng */
      player.hp -= dmg;
      _dmgNum(player.x, player.y - 26, '-' + dmg, '#ff6b6b');
      _vibrate(60); /* rung khi trúng AoE boss */
      _audio(function (A) { A.sfx('hit'); });
      if (player.hp <= 0) _playerDie(ps);
    }
  }

  function _playerDie(ps) {
    player.hp = ps.maxHp;
    player.mp = ps.maxMp;
    _vibrate([70, 50, 120]); /* rung mạnh khi chết */
    player.x = WORLD_W / 2; player.y = WORLD_H / 2;
    player.target = null; _moveTarget = null; _chaseTgt = false;
  }

  function _updateMonsters(dt, ps) {
    for (var i = 0; i < _monsters.length; i++) {
      var m = _monsters[i];
      if (m.dead && !(m.dieT > 0)) continue;
      if (m.dieT > 0) { m.dieT = Math.max(0, m.dieT - dt); continue; } /* đang mờ dần khi chết */
      if (m.hitT > 0) m.hitT -= dt;
      if (m.kx || m.ky) { /* quán tính giật lùi */
        m.x += (m.kx || 0) * dt; m.y += (m.ky || 0) * dt;
        m.kx = (m.kx || 0) * 0.88; m.ky = (m.ky || 0) * 0.88;
        if (Math.abs(m.kx) < 5) m.kx = 0;
        if (Math.abs(m.ky) < 5) m.ky = 0;
      }
      /* Thần thú đồng hành 3D: debuff — thiêu đốt/độc (DoT), choáng, chậm, sợ hãi */
      var sbSlowMult = 1, sbStunned = false, sbFear = null, sbSkipMove = false;
      if (m.sbDb) {
        var _sdb = m.sbDb;
        if ((_sdb.burnT || 0) > 0) {
          _sdb.burnT -= dt; _sdb.burnAcc = (_sdb.burnAcc || 0) + dt;
          if (_sdb.burnAcc >= 0.5) {
            _sdb.burnAcc = 0;
            var _sbd = Math.max(1, Math.round((_sdb.burnDps || 5) / 2));
            m.hp -= _sbd; _dmgNum(m.x, m.y - 26, '-' + _sbd, '#ff7a3c');
            if (m.hp <= 0 && !m.dead) _killMon(m);
          }
        }
        if ((_sdb.poisonT || 0) > 0) {
          _sdb.poisonT -= dt; _sdb.poisonAcc = (_sdb.poisonAcc || 0) + dt;
          if (_sdb.poisonAcc >= 0.5) {
            _sdb.poisonAcc = 0;
            var _spd2 = Math.max(1, Math.round((_sdb.poisonDps || 4) / 2));
            m.hp -= _spd2; _dmgNum(m.x, m.y - 26, '-' + _spd2, '#76ff03');
            if (m.hp <= 0 && !m.dead) _killMon(m);
          }
        }
        if ((_sdb.stunT || 0) > 0) { _sdb.stunT -= dt; sbStunned = true; }
        if ((_sdb.slowT || 0) > 0) { _sdb.slowT -= dt; sbSlowMult = 0.5; }
        if ((_sdb.fearT || 0) > 0) {
          _sdb.fearT -= dt;
          sbFear = { x: _sdb.fearX || m.x, y: _sdb.fearY || m.y };
        }
        if ((_sdb.burnT || 0) <= 0 && (_sdb.poisonT || 0) <= 0 && (_sdb.stunT || 0) <= 0 &&
            (_sdb.slowT || 0) <= 0 && (_sdb.fearT || 0) <= 0) m.sbDb = null;
      }
      if (sbStunned || sbFear) {
        sbSkipMove = true;
        if (sbFear) { /* sợ hãi: chạy khỏi thần thú */
          var _sfa = Math.atan2(m.y - sbFear.y, m.x - sbFear.x);
          m.x += Math.cos(_sfa) * 95 * dt;
          m.y += Math.sin(_sfa) * 95 * dt;
          m.ang = _angLerp(m.ang == null ? _sfa : m.ang, _sfa, Math.min(1, dt * 6));
          m._lastMove = Date.now();
        }
        /* choáng: đứng yên */
      }
      m.atkCd -= dt;
      var d = Math.hypot(player.x - m.x, player.y - m.y);
      var spd = (m.boss ? 95 : 70) * sbSlowMult;
      /* === AI NÂNG CẤP (Gameplay 2026-10-21) ===
       * 1. Leash: quái không đuổi quá xa vị trí spawn (600px) — quay về
       * 2. Flee: quái thường HP < 25% chạy trốn (boss/tinh anh không chạy)
       * 3. Strafe: khi tiếp cận, thỉnh thoảng di chuyển ziczac tránh đòn
       * 4. Separation: tránh chồng lấn lên nhau */
      var distSpawn = Math.hypot(m.x - (m.sx || m.x), m.y - (m.sy || m.y));
      var isFleeing = false;
      /* Flee: HP thấp -> chạy ngược hướng player */
      if (!m.boss && !m.elite && m.hp > 0 && m.hp < m.maxHp * 0.25) {
        m.fleeT = 1.5; /* chạy 1.5s mỗi lần trigger */
      }
      if (sbSkipMove) { /* choáng/sợ hãi: đã xử lý ở trên, bỏ qua AI di chuyển thường */
      } else if (m.fleeT > 0) {
        m.fleeT -= dt;
        isFleeing = true;
        var fa = Math.atan2(m.y - player.y, m.x - player.x);
        m.x += Math.cos(fa) * spd * 1.2 * dt;
        m.y += Math.sin(fa) * spd * 1.2 * dt;
        m.ang = _angLerp(m.ang == null ? fa : m.ang, fa, Math.min(1, dt * 6));
        m._lastMove = Date.now();
      } else if (distSpawn > 600 && d > MONSTER_AGGRO) {
        /* Leash: quá xa spawn + player cũng xa -> quay về */
        var la = Math.atan2((m.sy || m.y) - m.y, (m.sx || m.x) - m.x);
        m.x += Math.cos(la) * spd * 0.8 * dt;
        m.y += Math.sin(la) * spd * 0.8 * dt;
        m.ang = _angLerp(m.ang == null ? la : m.ang, la, Math.min(1, dt * 6));
        m._lastMove = Date.now();
      } else if (d < MONSTER_AGGRO && d > 44) {
        var a = Math.atan2(player.y - m.y, player.x - m.x);
        /* Strafe: 30% thời gian di chuyển lệch góc để khó đoán */
        m.strafeT -= dt;
        if (m.strafeT <= 0) {
          m.strafeT = 0.8 + Math.random() * 1.2;
          m.strafeDir = Math.random() < 0.5 ? -1 : 1;
        }
        var strafeA = a + (Math.PI / 2) * m.strafeDir * 0.5;
        /* trộn hướng tới player + strafe */
        var moveA = a * 0.7 + strafeA * 0.3;
        m.x += Math.cos(moveA) * spd * dt;
        m.y += Math.sin(moveA) * spd * dt;
        m._lastMove = Date.now();
        /* quái/boss quay mặt theo hướng di chuyển — boss xoay chậm hơn (nặng nề) */
        m.ang = _angLerp(m.ang == null ? a : m.ang, a, Math.min(1, dt * (m.boss ? 4 : 6)));
      } else if (d >= MONSTER_AGGRO) { // đi lang thang quanh spawn
        m.wanderT -= dt;
        if (m.wanderT <= 0) {
          /* chọn hướng ngẫu nhiên nhưng ưu tiên về phía spawn */
          var toSpawn = Math.atan2((m.sy || m.y) - m.y, (m.sx || m.x) - m.x);
          m.wanderA = toSpawn + (Math.random() - 0.5) * Math.PI;
          m.wanderT = 2 + Math.random() * 3;
        }
        m.x += Math.cos(m.wanderA) * spd * 0.3 * dt;
        m.y += Math.sin(m.wanderA) * spd * 0.3 * dt;
        m._lastMove = Date.now();
        m.ang = _angLerp(m.ang == null ? m.wanderA : m.ang, m.wanderA, Math.min(1, dt * 6));
      }
      /* Separation: đẩy nhau ra nếu quá gần (tránh chồng sprite) */
      if (!isFleeing) {
        for (var _si = 0; _si < _monsters.length; _si++) {
          var _om = _monsters[_si];
          if (_om === m || _om.dead) continue;
          var _sdx = m.x - _om.x, _sdy = m.y - _om.y;
          var _sd = Math.hypot(_sdx, _sdy);
          if (_sd > 0 && _sd < 36) {
            m.x += (_sdx / _sd) * 40 * dt;
            m.y += (_sdy / _sd) * 40 * dt;
          }
        }
      }
      m.x = Math.max(20, Math.min(WORLD_W - 20, m.x));
      m.y = Math.max(20, Math.min(WORLD_H - 20, m.y));
      if (d <= 52 && m.atkCd <= 0 && !sbStunned) {
        m.atkCd = m.boss ? 1.6 : 1.3;
        /* Đang Ngự Kiếm bay: quái thường đánh đất không chạm tới;
         * chỉ boss và quái bay (bay:true) đánh được */
        if (Engine.fly && !m.boss && !(m.def && m.def.bay)) {
          /* hụt — bay qua đầu quái */
        } else {
          var dmg = 1;
          if (typeof Combat !== 'undefined') {
            try { dmg = Combat.monsterStrike(m, ps).dmg; }
            catch (e) { dmg = Math.max(1, Math.round(m.atk - ps.def * 0.6)); }
          } else {
            dmg = Math.max(1, Math.round(m.atk - ps.def * 0.6));
          }
          if (m.elite) dmg = _applyResist(dmg); /* kháng hiệu ứng Thần Thức */
          _hurtPlayer(dmg, ps);
        }
      }
      if (m.boss) {
        m.skillCd -= dt;
        if (m.skillCd <= 0) { m.skillCd = 6 + Math.random() * 4; _bossSkill(m, ps); }
      }
    }
  }

  function _updateRespawn(dt) {
    if (_dungeon) return; // bí cảnh: không respawn giữa ải
    if (_mapDef.safe) return; // map an toàn: không respawn quái hoang dã (Bui 2026-10-19)
    _respawnT -= dt;
    if (_respawnT > 0) return;
    _respawnT = 2.5;
    var aliveN = 0, bossAlive = false;
    for (var i = 0; i < _monsters.length; i++) {
      var m = _monsters[i];
      if (!m.dead) { if (m.boss) bossAlive = true; else aliveN++; }
    }
    var _mf2 = _mapDef.monsters;
    var ids = (_mf2 && _mf2.length) ? _mf2 : (_mf2 ? [] : ['da_tru']);
    if (ids.length && aliveN < MAP_MON_COUNT) {
      var zones = _mapDef.spawnZones, zn = null, zids = ids;
      if (zones && zones.length) { /* respawn đúng trong bãi quái */
        zn = zones[Math.floor(Math.random() * zones.length)];
        zids = (zn.monsters && zn.monsters.length) ? zn.monsters : ids;
      }
      var p = zn ? _randPosInZone(zn) : _randPos(160);
      // spawn xa player để không "mọc" ngay trước mặt
      var tries = 0;
      while (Math.hypot(p.x - player.x, p.y - player.y) < 350 && tries < 6) {
        p = zn ? _randPosInZone(zn) : _randPos(160);
        tries++;
      }
      var nm = _spawnMon(zids[Math.floor(Math.random() * zids.length)], p.x, p.y, false);
      if (zn) nm.zone = zones.indexOf(zn);
      _monsters.push(nm);
    }
    if (!bossAlive && _bossDef && Date.now() / 1000 >= _bossRespawnAt) {
      var bsp = _mapDef.bossSpawn || { x: 1250, y: 320 };
      _monsters.push(_spawnMon(_bossDef, bsp.x, bsp.y, true));
    }
  }

  /* ---------- Vùng an toàn quanh cổng chuyển map ----------
   * NPC không bao giờ được đứng/lang thang trong bán kính GATE_SAFE_R
   * quanh tâm cổng: tránh NPC che cổng và chiếm cú chạm vào cổng khiến
   * người chơi không qua map được (ca thật: lao_dan_duong spawn cách
   * cổng (720,80) ở Thanh Vân Trấn chỉ 28px).
   * - _gatesOf(mapDef): lấy danh sách cổng của 1 map từ dữ liệu MAPS.
   * - _gateZoneAt(x, y): cổng mà điểm (x, y) đang nằm trong vùng cấm.
   * - _pushOutOfGates(x, y): điểm hợp lệ gần nhất ngoài mọi vùng cấm.
   * --------------------------------------------------------------- */
  function _gatesOf(mapDef) { return (mapDef && mapDef.gates) || []; }
  function _gateZoneAt(x, y) {
    var gs = _gatesOf(_mapDef);
    for (var i = 0; i < gs.length; i++) {
      if (Math.hypot(gs[i].x - x, gs[i].y - y) < GATE_SAFE_R) return gs[i];
    }
    return null;
  }
  function _pushOutOfGates(x, y) {
    var px = x, py = y;
    for (var k = 0; k < 6; k++) {
      var g = _gateZoneAt(px, py);
      if (!g) break;
      var r = GATE_SAFE_R + 8;
      var dx = px - g.x, dy = py - g.y, d = Math.hypot(dx, dy);
      if (d < 1) { dx = WORLD_W / 2 - g.x; dy = WORLD_H / 2 - g.y; d = Math.hypot(dx, dy) || 1; }
      /* hướng xuyên tâm trước; nếu bị biên map ép lại vào vùng cấm thì
         thử 8 hướng la bàn quanh cổng */
      var dirs = [[dx / d, dy / d], [1, 0], [-1, 0], [0, 1], [0, -1],
                  [0.707, 0.707], [-0.707, 0.707], [0.707, -0.707], [-0.707, -0.707]];
      var moved = false;
      for (var j = 0; j < dirs.length; j++) {
        var nx = Math.max(40, Math.min(WORLD_W - 40, g.x + dirs[j][0] * r));
        var ny = Math.max(40, Math.min(WORLD_H - 40, g.y + dirs[j][1] * r));
        if (!_gateZoneAt(nx, ny)) { px = nx; py = ny; moved = true; break; }
      }
      if (!moved) break; /* cổng quá sát nhau/biên — giữ nguyên, hiếm gặp */
    }
    return { x: px, y: py };
  }

  /* ---------- NPC chuyển động 3D ----------
   * - NPC có def.wander (bán kính px) sẽ đi tuần quanh vị trí gốc:
   *   tăng tốc/giảm tốc mượt (arrive behavior), không giật cục.
   * - NPC đứng yên: idle bob nhẹ, quay mặt về phía người chơi khi lại gần.
   * - Nghiêng người (lean) theo vận tốc x, bóng đổ lệch ngược hướng nghiêng.
   * - NPC không chặn đường: người chơi đi xuyên được (không có collision).
   * - Vùng cấm cổng: xem _gateZoneAt — đích tuần tra không bao giờ nằm
   *   trong vùng cấm; NPC đang ở trong vùng cấm thì tự đi ra ngoài.
   * --------------------------------------------------------------- */
  function _updateNpcs(dt) {
    for (var i = 0; i < _npcs.length; i++) {
      var n = _npcs[i], R = 0; /* Bui 2026-10-21 22:10: NPC đứng yên, không tuần tra */
      var inGate = _gateZoneAt(n.x, n.y);
      if (n.graceT == null) { n.graceT = 0; n.spawnInGate = !!inGate; }
      n.graceT += dt;
      var pdx = player.x - n.x, pdy = player.y - n.y;
      var pd = Math.hypot(pdx, pdy);
      /* chào khi người chơi lại gần (mỗi NPC 10s một lần) */
      n.greetCd = Math.max(0, (n.greetCd || 0) - dt);
      if (n.greetT > 0) n.greetT -= dt;
      if (R) {
        /* --- đi tuần --- */
        if (n.tx == null) {
          if (n.wt > 0) { n.wt -= dt; }
          else {
            /* Tâm tuần tra: nếu vị trí gốc nằm trong vùng cấm cổng thì
               tuần tra quanh điểm neo đã đẩy ra ngoài vùng cấm */
            var ax = n.hx, ay = n.hy;
            if (_gateZoneAt(ax, ay)) { var ap = _pushOutOfGates(ax, ay); ax = ap.x; ay = ap.y; }
            /* Đích tuần tra không bao giờ nằm trong vùng cấm cổng */
            var picked = false;
            for (var tr = 0; tr < 6 && !picked; tr++) {
              var a = Math.random() * Math.PI * 2, r = 25 + Math.random() * R;
              var cx = Math.max(60, Math.min(WORLD_W - 60, ax + Math.cos(a) * r));
              var cy = Math.max(60, Math.min(WORLD_H - 60, ay + Math.sin(a) * r));
              if (!_gateZoneAt(cx, cy)) { n.tx = cx; n.ty = cy; picked = true; }
            }
            if (!picked) n.wt = 0.5; /* quanh nhà không có điểm hợp lệ → chờ rồi thử lại */
          }
          /* đứng chờ: giảm tốc mượt về 0 */
          n.vx += (0 - n.vx) * Math.min(1, dt * 6);
          n.vy += (0 - n.vy) * Math.min(1, dt * 6);
        } else {
          var dx = n.tx - n.x, dy = n.ty - n.y, d = Math.hypot(dx, dy);
          if (d < 12) { n.tx = null; n.ty = null; n.wt = 0.5 + Math.random() * 1.5; }
          else {
            /* arrive: muốn đi chậm lại khi gần đích (Bui 2026-10-21: tăng tốc tuần tra cho thấy rõ) */
            var want = 95 * Math.min(1, d / 50);
            var wvx = dx / d * want, wvy = dy / d * want;
            var k = Math.min(1, dt * 5);
            n.vx += (wvx - n.vx) * k;
            n.vy += (wvy - n.vy) * k;
          }
        }
        if (Math.abs(n.vx) > 5) n.face = (n.vx >= 0) ? 1 : -1;
        else if (pd < 170 && pd > 1) {
          n.face = (pdx >= 0) ? 1 : -1;
          if (!n.greetT && n.greetCd <= 0) { n.greetT = 0.9; n.greetCd = 10; }
        }
      } else {
        /* --- đứng yên --- */
        n.vx += (0 - n.vx) * Math.min(1, dt * 8);
        n.vy += (0 - n.vy) * Math.min(1, dt * 8);
        if (pd < 170 && pd > 1) {
          n.face = (pdx >= 0) ? 1 : -1;
          if (!n.greetT && n.greetCd <= 0) { n.greetT = 0.9; n.greetCd = 10; }
        }
      }
      /* Đang trong vùng cấm cổng (spawn gần cổng / lạc vào): tự đi ra
         điểm hợp lệ gần nhất — áp dụng cả NPC đứng yên */
      if (inGate) {
        if (n.escTx == null || Math.hypot(n.escTx - n.x, n.escTy - n.y) < 8) {
          var ep = _pushOutOfGates(n.x, n.y);
          n.escTx = ep.x; n.escTy = ep.y;
        }
        var edx = n.escTx - n.x, edy = n.escTy - n.y, ed = Math.hypot(edx, edy);
        if (ed > 1) {
          var ewant = 58 * Math.min(1, ed / 70);
          var ek = Math.min(1, dt * 5);
          n.vx += (edx / ed * ewant - n.vx) * ek;
          n.vy += (edy / ed * ewant - n.vy) * ek;
        }
        n.tx = null; n.ty = null; /* hủy đích tuần tra đang ở trong vùng cấm */
      } else { n.escTx = null; n.escTy = null; }
      n.x = Math.max(40, Math.min(WORLD_W - 40, n.x + n.vx * dt));
      n.y = Math.max(40, Math.min(WORLD_H - 40, n.y + n.vy * dt));
      /* Chốt cứng sau ân hạn spawn 3s: không bao giờ kết thúc frame
         trong vùng cấm cổng */
      if (!(n.spawnInGate && n.graceT < 3) && _gateZoneAt(n.x, n.y)) {
        var fp = _pushOutOfGates(n.x, n.y);
        n.x = fp.x; n.y = fp.y;
      }
      /* lean mượt theo vận tốc x */
      var targetLean = Math.max(-0.16, Math.min(0.16, n.vx * 0.0022));
      n.lean += (targetLean - n.lean) * Math.min(1, dt * 6);
      n.workT = (n.workT || 0) + dt; /* đồng hồ animation nghề nghiệp */
    }
  }

  function _update(dt) {
    _tickT += dt;
    var ps = _effStats(_getStats());
    if (player.hp > ps.maxHp) player.hp = ps.maxHp;
    /* hồi MP: cơ bản 3/s + Linh Mạch 2% maxMp/5s mỗi cấp (buff Thiên Pháp Tông +20%) */
    var _sb = null;
    try {
      if (typeof Sect !== "undefined" && Sect.sectBuff) _sb = Sect.sectBuff(_S() || {});
    } catch (e) {}
    var mpRegen = (3 + ps.maxMp * 0.02 / 5 * _passiveLvl('linh_mach')) * (_sb ? _sb.mpRegenMult : 1);
    if (player.mp < ps.maxMp) player.mp = Math.min(ps.maxMp, player.mp + mpRegen * dt);
    /* Hồi Xuân: hồi 1% maxHp/5s mỗi cấp (buff Dược Vương Tông +10%) */
    var hxLv = _passiveLvl('hoi_xuan');
    if (hxLv > 0 && player.hp < ps.maxHp)
      player.hp = Math.min(ps.maxHp, player.hp + ps.maxHp * 0.01 / 5 * hxLv * dt * (_sb ? _sb.hpRegenMult : 1));
    /* hồi Thần Thức 12/s (lướt tốn 25) */
    if (player.focus < 100) player.focus = Math.min(100, player.focus + 12 * dt);
    /* khiên tạm thời từ đan dược hết hạn */
    if (player.shieldT > 0) {
      player.shieldT -= dt;
      if (player.shieldT <= 0) { player.shield = 0; player.maxShield = 0; }
    }
    /* Ngự Kiếm (Trúc Cơ): tốn 1 linh lực/giây, hết linh lực tự hạ xuống */
    if (Engine.fly) {
      player.mp -= 1 * dt;
      if (player.mp <= 0) {
        player.mp = 0;
        setFly(false);
        _dmgNum(player.x, player.y - 40, 'Hết linh lực', '#7fd4ff');
      }
    }
    _attackCd -= dt;
    /* Hit-stop: đóng băng mọi update khi trúng đòn (trừ chính hit-stop) */
    if (_hitStop > 0) { _hitStop -= dt; return; }
    /* Attack 3 pha: windup (0.35-0.27) -> strike (0.27-0.15) -> recover (0.15-0) */
    if (player.atkT > 0) {
      player.atkT -= dt;
      if (player.atkT > 0.27) player.atkPhase = 'windup';
      else if (player.atkT > 0.15) player.atkPhase = 'strike';
      else player.atkPhase = 'recover';
    }
    if (player.skillT > 0) player.skillT -= dt;
    if (player.hitT > 0) player.hitT -= dt;
    if (_dashCd > 0) _dashCd -= dt;
    if (_shakeT > 0) _shakeT -= dt;

    /* Lướt */
    if (_dashT > 0) {
      _dashT -= dt;
      var dsp = 900;
      player.x = Math.max(16, Math.min(WORLD_W - 16, player.x + _dashDx * dsp * dt));
      player.y = Math.max(16, Math.min(WORLD_H - 16, player.y + _dashDy * dsp * dt));
      var _da = Math.atan2(_dashDy, _dashDx); /* lướt cũng quay mặt theo hướng */
      player.ang = _angLerp(player.ang == null ? _da : player.ang, _da, Math.min(1, dt * 14));
    }

    var iv = _inputVec();
    var manual = iv.active || !!_moveTarget;

    // Auto: tìm quái gần nhất, dí theo và đánh
    var tgt = (player.target && !player.target.dead) ? player.target : null;
    /* AUTO QUEST ưu tiên trước auto-farm (Bui 2026-10-19) */
    var _aqHandled = _autoQuestTick(dt, ps, manual);
    if (Engine.auto && !_aqHandled) {
      var nm = _nearestMon();
      if (nm && (!tgt || nm.m.uid !== tgt.uid)) tgt = nm.m;
      player.target = tgt;
      if (tgt) {
        var d = Math.hypot(tgt.x - player.x, tgt.y - player.y);
        if (!manual && d > _atkRange() * 0.8 && _dashT <= 0) {
          _moveToward(tgt.x, tgt.y, dt);
        } else if (_attackCd <= 0 && d <= _atkRange()) {
          _playerAttack(tgt, ps);
        }
        _autoSkills(ps); // tự tung bí thuật khi hồi chiêu
      }
      /* Build 99: không còn quái để đánh → Auto đi theo mũi tên vàng về mục tiêu nhiệm vụ (chờ đánh xong mới đi). */
      if (!tgt && !manual && player.atkT <= 0 && player.skillT <= 0) _autoFollowQuest(dt);
    } else if (tgt) {
      var d2 = Math.hypot(tgt.x - player.x, tgt.y - player.y);
      if (_chaseTgt && !_aqHandled && !manual && d2 > _atkRange() && _dashT <= 0) {
        _moveToward(tgt.x, tgt.y, dt); // đang dí theo mục tiêu đã khóa bằng nút Đánh
      } else if (_attackCd <= 0 && d2 <= _atkRange()) {
        _playerAttack(tgt, ps); _chaseTgt = false;
      }
    } else if (!tgt) { _chaseTgt = false; }

    /* Build 99: khóa di chuyển tay trong lúc đánh/dùng chiêu/bị đánh/chết (đánh xong mới đi tiếp, đúng tutien2d). */
    var _stLock = _playerState();
    var _moveLocked = (_stLock === 'attack' || _stLock === 'skill' || _stLock === 'hit' || _stLock === 'dead');
    if (!_moveLocked) {
      if (iv.active) { _moveTarget = null; _moveBy(iv.dx, iv.dy, dt); }
      else if (_moveTarget) { if (_moveToward(_moveTarget.x, _moveTarget.y, dt)) _moveTarget = null; }
    }

    // Cổng chuyển map (miễn 2s sau khi vào map — chống bounce tức thì)
    // Build 99: cổng CHỈ kích hoạt khi đi bộ — đang bay mà bay ngang cổng thì không qua được (đúng tutien2d).
    if (Date.now() >= _gateCdUntil) for (var gi = 0; gi < _gates.length; gi++) {
      var g = _gates[gi];
      if (!Engine.fly && Math.hypot(g.x - player.x, g.y - player.y) < GATE_RANGE) {
        var to = g.to;
        /* Build 94: cổng vừa đi qua có tilemap -> stash điểm rơi của nó
         * (Tilemap.gateAt trên map NGUỒN, theo tọa độ cổng data.js; mọi
         * cổng map 0 đều khớp tilemap trong bán kính 40px). */
        try {
          if (typeof Tilemap !== 'undefined' && Tilemap.gateAt) {
            var _tg = Tilemap.gateAt(_mapId, g.x, g.y);
            _tileGateDrop = (_tg && typeof _tg.dropCol === 'number' && typeof _tg.dropRow === 'number')
              ? { col: _tg.dropCol, row: _tg.dropRow } : null;
          } else _tileGateDrop = null;
        } catch (_e) { _tileGateDrop = null; }
        _gates = []; // chống trigger lặp
        if (Engine.onGate) { try { Engine.onGate(to); } catch (e) {} }
        break;
      }
    }

    _updateMonsters(dt, ps);
    _updateRespawn(dt);
    _updateNpcs(dt);
    _updateTelegraphs(dt, ps);
    _updateFx(dt);
    _updatePet(dt);
    _updateSpiritBeast(dt, ps);
    _autoPotion(ps);

    // Bí cảnh: hết quái/boss của ải → onStageClear
    if (_dungeon && !_stageClearFired) {
      var anyAlive = false;
      for (var i = 0; i < _monsters.length; i++) {
        if (!_monsters[i].dead) { anyAlive = true; break; }
      }
      if (!anyAlive && _monsters.length > 0) {
        _stageClearFired = true;
        var st = _dungeon.run.layout.stages[_dungeon.run.stageIdx] || {};
        if (Engine.onStageClear) {
          try { Engine.onStageClear(_dungeon.run.stageIdx, st.rewards || { stones: [0, 0], items: [] }); }
          catch (e) {}
        }
      }
    }
  }

  /* ---------- Hiệu ứng ---------- */
  function _vibrate(pat) {
    /* Rung điện thoại theo cài đặt (settings.vibrate) */
    try {
      var S = _S();
      if (S && S.settings && S.settings.vibrate === false) return;
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pat);
    } catch (e) {}
  }
  function _dmgNum(x, y, txt, color) {
    _dmgNums.push({ x: x, y: y, txt: txt, color: color, t: 1 });
    if (_dmgNums.length > 40) _dmgNums.shift();
  }
  function _skillFx(x, y) { // vòng tròn xung theo hệ linh căn
    _fx.push({ x: x, y: y, r: 8, max: 56, t: 0.35, maxT: 0.35, color: _elemFx() });
  }
  function _burst(x, y, n, color) {
    var lvl = GFX_LEVELS[_gfxLevel] || GFX_LEVELS.cao;
    n = Math.round(n * lvl.particle);
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, sp = 40 + Math.random() * 90;
      _fx.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
                 t: 0.4, maxT: 0.4, color: color, dot: true });
    }
  }
  function _updateFx(dt) {
    var i;
    for (i = _dmgNums.length - 1; i >= 0; i--) {
      var dn = _dmgNums[i];
      dn.t -= dt * 0.9; dn.y -= 34 * dt;
      if (dn.t <= 0) _dmgNums.splice(i, 1);
    }
    for (i = _fx.length - 1; i >= 0; i--) {
      var f = _fx[i];
      f.t -= dt;
      if (f.kind === 'bolt') {
        var p = 1 - Math.max(0, f.t / f.maxT); // 0→1
        f.x += (f.tx - f.x) * Math.min(1, dt * 14);
        f.y += (f.ty - f.y) * Math.min(1, dt * 14);
        if (p > 0.92) { f.t = 0; }
      } else if (f.dot) { f.x += (f.vx || 0) * dt; f.y += (f.vy || 0) * dt; }
      else if (f.kind === 'sprite20') {
        /* Build 98: projectile bay thẳng từ điểm bắt đầu tới mục tiêu theo tiến độ */
        if (typeof f.sx === 'number' && typeof f.tx === 'number') {
          var sp = 1 - Math.max(0, f.t / f.maxT);
          f.x = f.sx + (f.tx - f.sx) * sp;
          f.y = f.sy + (f.ty - f.sy) * sp;
        }
      }
      else { f.r += (f.max - 8) * dt / Math.max(0.01, f.maxT); }
      if (f.t <= 0) _fx.splice(i, 1);
    }
  }

  /* ---------- Render ---------- */
  var _camX = null, _camY = null; /* Bui 2026-10-21: camera mượt, không giật */
  /* Bui 2026-10-22: zoom map 0.5x–3x, mặc định 1x, lưu localStorage */
  var _mapZoom = 1, MAP_ZOOM_MIN = 0.5, MAP_ZOOM_MAX = 3;
  function _loadMapZoom() {
    try {
      var z = parseFloat(localStorage.getItem('tt_mapzoom'));
      if (z >= MAP_ZOOM_MIN && z <= MAP_ZOOM_MAX) _mapZoom = z;
    } catch (e) {}
  }
  function setMapZoom(z) {
    _mapZoom = Math.max(MAP_ZOOM_MIN, Math.min(MAP_ZOOM_MAX, parseFloat(z) || 1));
    try { localStorage.setItem('tt_mapzoom', String(_mapZoom)); } catch (e) {}
    return _mapZoom;
  }
  /* Vùng world đang hiển thị (tính zoom) — tâm giữ nguyên khi zoom */
  function _visRect() {
    var cam = _camera(), z = _mapZoom || 1;
    var w = _viewW / z, h = _viewH / z;
    return { x: cam.x + _viewW / 2 - w / 2, y: cam.y + _viewH / 2 - h / 2, w: w, h: h };
  }
  /* Chuyển screen (CSS px) → world, đúng với zoom hiện tại */
  function _screenToWorld(sx, sy) {
    var cam = _camera(), z = _mapZoom || 1;
    return { x: (sx - _viewW / 2) / z + cam.x + _viewW / 2,
             y: (sy - _viewH / 2) / z + cam.y + _viewH / 2 };
  }
  /* world y → screen y (cho pseudo-3D depth scale khi zoom) */
  function _worldToScreenY(wy) {
    var cam = _camera(), z = _mapZoom || 1;
    return (wy - (cam.y + _viewH / 2)) * z + _viewH / 2;
  }
  function _camera() {
    var tx = player.x - _viewW / 2, ty = player.y - _viewH / 2;
    if (WORLD_W <= _viewW) tx = (WORLD_W - _viewW) / 2;
    else tx = Math.max(0, Math.min(WORLD_W - _viewW, tx));
    if (WORLD_H <= _viewH) ty = (WORLD_H - _viewH) / 2;
    else ty = Math.max(0, Math.min(WORLD_H - _viewH, ty));
    if (_camX === null) { _camX = tx; _camY = ty; }
    else { _camX += (tx - _camX) * 0.12; _camY += (ty - _camY) * 0.12;
      if (Math.abs(tx - _camX) < 0.5) _camX = tx;
      if (Math.abs(ty - _camY) < 0.5) _camY = ty; }
    /* Screen shake (Gameplay 2026-10-21): rung ngẫu nhiên giảm dần */
    var sx = 0, sy = 0;
    if (_shakeT > 0) {
      var mag = _shakeMag * (_shakeT / 0.15);
      sx = (Math.random() - 0.5) * 2 * mag;
      sy = (Math.random() - 0.5) * 2 * mag;
    }
    return { x: _camX + sx, y: _camY + sy };
  }
  function _resetCamera() { _camX = null; _camY = null; }
  function _mapName() {
    return _mapDef ? _t(_mapDef.nameKey || ('map_' + _mapId)) : '';
  }
  function _visiblePlayers() {
    var S = _S();
    var mode = (S && S.settings && S.settings.showPlayers) || 'all';
    if (mode === 'me') return [];
    return Engine.otherPlayers.filter(function (o) {
      return mode === 'all' || (o.teamId && o.teamId === player.teamId);
    });
  }

  function _drawHpBar(x, y, w, ratio, boss) {
    var h = boss ? 6 : 4;
    _ctx.fillStyle = 'rgba(0,0,0,0.55)';
    _ctx.fillRect(x - w / 2, y, w, h);
    _ctx.fillStyle = ratio > 0.3 ? '#4caf50' : '#e53935';
    _ctx.fillRect(x - w / 2, y, w * Math.max(0, ratio), h);
  }

  /* Frame quái/boss theo hướng di chuyển (4 hướng, 2 khung bước).
   * Trả {src, directional}; directional=false → dùng sprite cũ + lật gương. */
  function _monsterFrame(m) {
    var huong = _CHAR_HUONG[_face4(m, (typeof m.ang === 'number') ? m.ang : Math.PI / 2)] || 'xuong';
    var moving = false;
    try { moving = (Date.now() - (m._lastMove || 0)) < 400; } catch (e) {}
    var ph = moving ? (1 + (Math.floor(Date.now() / 300) % 2)) : 1;
    var cands = [];
    if (m.boss) cands.push('assets/sprs/boss_' + m.monId + '_' + huong + '_walk' + ph + '.png');
    cands.push('assets/sprs/mon_' + m.monId + '_' + huong + '_walk' + ph + '.png');
    for (var i = 0; i < cands.length; i++) {
      var ce = _imgCache[cands[i]];
      if (!ce) { _img(cands[i]); continue; } /* chưa tải lần nào → warm rồi dùng fallback, KHÔNG vẽ ô vuông */
      if (!ce.done) continue; /* đang tải → dùng fallback */
      if (!ce.ok) continue; /* file không tồn tại → thử ứng viên tiếp */
      return { src: cands[i], directional: true }; /* đã tải xong mới dùng */
    }
    return { src: m.def.img, directional: false };
  }
  function _drawMonster(m) {
    var elite = !!m.elite;
    var size = m.boss ? 64 : (elite ? 57 : 44); /* tinh anh to hơn 30% */
    _ctx.save();
    if (m.dieT > 0) _ctx.globalAlpha = Math.max(0, m.dieT / 0.6); /* mờ dần khi chết */
    var label = _t(m.def.nameKey || m.monId);
    if (elite) { /* hào quang vàng nhấp nháy */
      _ctx.save();
      _ctx.globalAlpha = 0.45 + 0.2 * Math.sin(Date.now() / 300);
      _ctx.strokeStyle = "#ffd54f"; _ctx.lineWidth = 3;
      _ctx.beginPath(); _ctx.arc(m.x, m.y, size / 2 + 7, 0, Math.PI * 2); _ctx.stroke();
      _ctx.restore();
    }
    /* quái/boss 4 hướng di chuyển: art riêng từng hướng (mon_/boss_<id>_<huong>_walk<n>),
       fallback sprite cũ + lật gương khi chưa có art hướng */
    var _mfr = _monsterFrame(m);
    _drawCreature(m, m.x, m.y, size, size, _mfr.src, m.def.fb || '#888',
      _mfr.directional ? { noAutoFlip: true } : { faceAng: m.ang });
    if (m.hitT > 0) { // chớp trắng khi trúng đòn
      _ctx.globalAlpha = 0.45;
      _ctx.fillStyle = '#fff';
      _ctx.fillRect(m.x - size / 2, m.y - size / 2, size, size);
      _ctx.globalAlpha = 1;
    }
    if (m.hp < m.maxHp) _drawHpBar(m.x, m.y - size / 2 - 10, m.boss ? 56 : 36, m.hp / m.maxHp, m.boss);
    if (m.boss) { // tên boss
      _ctx.fillStyle = '#ffd54f';
      _ctx.font = 'bold 11px sans-serif';
      _ctx.textAlign = 'center';
      _ctx.fillText(label, m.x, m.y - size / 2 - 16);
    }
    if (elite) { // tên vàng ★ Tinh Anh
      _ctx.fillStyle = '#ffd54f';
      _ctx.font = 'bold 11px sans-serif';
      _ctx.textAlign = 'center';
      _ctx.fillText(_t('bc_elite') + ' ' + label, m.x, m.y - size / 2 - 16);
    }
    _ctx.restore();
  }

  function _playerSpriteOld() {
    var S = _S();
    var cls = (S && S.char && S.char.sect) || 'kiem';
    return SPRITE_PLAYER[cls] || SPRITE_PLAYER.kiem;
  }
  /* Art nhân vật mới (mẫu chibi đã duyệt): char_<gioi>_<huong>_walk<1-4>.png
   * khi di chuyển, char_<gioi>_<huong>_idle.png khi đứng yên,
   * char_<gioi>_fly.png khi ngự kiếm bay. Có frame riêng cho cả 4 hướng
   * (xuong/len/trai/phai) nên không flip sprite — thân luôn đứng thẳng. */
  var _CHAR_HUONG = { down: 'xuong', up: 'len', left: 'trai', right: 'phai' };
  /* key dài trước để 'kiem_hap' không bị match nhầm thành 'kiem' */
  var _WPN_ART_KEYS = ['kiemhap','thuong','phien','cung','liem','kiem','dao','tieu','roi','but'];
  function _weaponArtKey() {
    /* loại vũ khí đang cầm -> key art atk (mặc định kiếm) */
    try {
      var S = _S(), wid = S && S.equip && S.equip.vukhi;
      if (wid) {
        var w = String(wid).toLowerCase().replace(/_/g, '');
        for (var i = 0; i < _WPN_ART_KEYS.length; i++)
          if (w.indexOf(_WPN_ART_KEYS[i]) >= 0) return _WPN_ART_KEYS[i];
      }
    } catch (e) {}
    return 'kiem';
  }
  /* ================================================================
   * PLAYER_SPRITE_MODE (Bui 2026-10-20): vẽ người chơi bằng sprite
   * 4 hướng MỚI (áo trắng viền đỏ) trong assets/sprs/dirs/:
   *   player_<nam|nu>_<down|left|right|up>.png (cao 128px, nền trong suốt)
   * true  = dùng sprite mới; hướng đổi theo mặt hiện tại (_face4),
   *         đứng yên giữ hướng cuối, di chuyển có bobbing 2px + bóng đổ.
   * false = TẮT hoàn toàn, quay về CharAnim skeletal + fallback cũ
   *         (đường vẽ bên dưới _drawPlayer không đổi — dễ hoàn tác).
   * Sprite chưa tải xong/lỗi -> _drawPlayerSpriteMode trả false và
   * game tự rơi xuống đường vẽ cũ, không crash, không ô vuông. */
  var PLAYER_SPRITE_MODE = true;
  /* PAPERDOLL_MODE (Bui 2026-10-20 paper-doll): vẽ nhân vật bằng các lớp
   * body+legs (+outfit) ghép qua js/paperdoll.js thay vì 1 sprite khối.
   * false (mặc định) = pipeline sprite khối cũ 100%, không đổi hành vi.
   * true  = _drawPlayerSpriteMode ghép lớp; lớp chưa tải xong/thiếu file ->
   *         tự fallback về sprite khối cũ, không crash, không vỡ hình.
   * Bật cờ này khi art lớp đã đủ (assets/sprs/paperdoll/). */
  var PAPERDOLL_MODE = false;
  /* id trang phục đang mặc (wardrobe.js: state.outfit_worn); null = mặc định. */
  function _wornOutfitId() {
    try {
      var S = _S();
      var id = S && S.outfit_worn;
      return (typeof id === 'string' && id) ? id : null;
    } catch (e) { return null; }
  }
  /* CHAR_DRAW_H (Bui 2026-10-20): chiều cao vẽ CHUNG (px) cho người chơi + NPC
   * trong map để hai bên đồng bộ cỡ khi đứng cạnh nhau.
   * 62 = điểm giữa khoảng cũ (người chơi 54, NPC 69). */
  var CHAR_DRAW_H = 62;
  var _PLAYER_SPRITE_H = CHAR_DRAW_H; /* chiều cao vẽ người chơi trong map (px) */

  /* Hàm thuần: (giới tính, hướng mặt) -> đường dẫn sprite. Test qua Engine._playerSpriteTest */
  function _playerDirFile(gioi, face) {
    var g = (gioi === 'nu') ? 'nu' : 'nam';
    var f = (face === 'left' || face === 'right' || face === 'up' || face === 'down') ? face : 'down';
    return 'assets/sprs/dirs/player_' + g + '_' + f + '.png';
  }
  /* Hàm thuần: (giới tính, hướng mặt, a/b/c) -> đường dẫn sprite khung bước đi.
   * Test qua Engine._playerWalkTest. a = chân trái trước, b = chân phải trước,
   * c = khung trung gian. */
  function _playerWalkFile(gioi, face, ab) {
    var g = (gioi === 'nu') ? 'nu' : 'nam';
    var f = (face === 'left' || face === 'right' || face === 'up' || face === 'down') ? face : 'down';
    var k = (ab === 'b') ? 'b' : ((ab === 'c') ? 'c' : 'a');
    return 'assets/sprs/dirs/walk/player_' + g + '_' + f + '_' + k + '.png';
  }
  /* Đang di chuyển? (cùng điều kiện bobbing/nhịp bước dùng) */
  function _playerMoving() {
    return !!(player._lastMove && (Date.now() - player._lastMove < 250));
  }
  /* Build 99: máy trạng thái nhân vật kiểu tutien2d — dead/hit/skill/attack/move/idle.
   * Dùng để khóa di chuyển tay trong lúc đánh/dùng chiêu/bị đánh/chết. */
  function _playerState() {
    if (player.hp <= 0) return 'dead';
    if (player.hitT > 0) return 'hit';
    if (player.skillT > 0) return 'skill';
    if (player.atkT > 0) return 'attack';
    if (_playerMoving()) return 'move';
    return 'idle';
  }
  /* Nhịp bước 4 khung: a -> c -> b -> c -> a..., đổi mỗi ~150ms (Bui 2026-10-20).
   * Hàm thuần, test qua Engine._playerWalkTest.cycle. */
  var _WALK_CYCLE = ['a', 'c', 'b', 'c'];
  function _walkCycleAb(nowMs) {
    return _WALK_CYCLE[Math.floor(nowMs / 150) % 4];
  }
  /* Hàm thuần: góc nghiêng giả lập bước đi của NPC (radian). Đang di chuyển ->
   * nghiêng luân phiên ±4° mỗi 150ms; đứng yên -> 0. Test qua hook _npcWalkTiltTest. */
  function _npcWalkTilt(moving, nowMs) {
    if (!moving) return 0;
    return (Math.floor(nowMs / 150) % 2 === 0) ? 0.07 : -0.07;
  }
  /* Hướng mặt hiện tại của người chơi (đứng yên giữ hướng cuối qua _face4) */
  function _playerDirFace() {
    var ang = (typeof player.ang === 'number') ? player.ang : Math.PI / 2;
    return _face4(player, ang);
  }
  /* Sprite hiện tại nếu ĐÃ tải xong OK; chưa xong thì warm cache + trả null (dùng fallback) */
  function _playerDirSprite() {
    var S = _S();
    var gioi = (S && S.char && S.char.gender === 'nu') ? 'nu' : 'nam';
    var src = _playerDirFile(gioi, _playerDirFace());
    var ce = _imgCache[src];
    if (ce && ce.done) return ce.ok ? src : null;
    _img(src); /* warm cache lần đầu */
    return null;
  }
  /* Bản nhuộm đỏ của ảnh (nhấp nháy khi trúng đòn, giống flashRed của CharAnim) */
  var _tintCache = {};
  function _redTint(im, keyOverride) {
    try {
      var key = keyOverride || im.src || '';
      var c = _tintCache[key];
      if (c) return c;
      if (typeof document === 'undefined') return null;
      c = document.createElement('canvas');
      c.width = im.width; c.height = im.height;
      var g = c.getContext('2d');
      g.drawImage(im, 0, 0);
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = 'rgba(255,60,60,0.55)';
      g.fillRect(0, 0, c.width, c.height);
      _tintCache[key] = c;
      return c;
    } catch (e) { return null; }
  }
  /* ================================================================
   * BIẾN THỂ NGOẠI HÌNH CHO SPRITE MODE (Bui 2026-10-20):
   * áp lựa chọn tạo nhân vật (state.char.appearance, js/appearance.js)
   * lên sprite 4 hướng đang đi trong map:
   *  - MÀU DA / MÀU TÓC / MÀU ÁO: nhuộm trực tiếp lên ảnh sprite MỌI
   *    hướng, dùng cùng kỹ thuật tints của charanim.js (scale theo họ
   *    màu / remap theo độ sáng, lấy spec từ Appearance.optsFor):
   *      da  = scale theo họ màu da gốc;
   *      tóc = remap pixel tối TRONG VÙNG ĐẦU (tránh nhuộm quần/viền);
   *      áo  = remap pixel vải SÁNG ít bão hòa (phần trắng của áo) theo
   *            màu áo đã chọn, GIỮ NGUYÊN viền đỏ + lưỡi kiếm thép.
   *  - MẶT + KIỂU TÓC: chỉ hướng DOWN (chính diện, thấy mặt rõ nhất):
   *    chồng part faces/ + hairs/ đã chọn lên vùng đầu của sprite bằng
   *    phép biến đổi chung part-space 256px -> vùng mặt sprite (đo từ
   *    sprite 128px). Hướng left/right/up góc nhìn không khớp part
   *    chính diện nên chỉ nhuộm màu.
   *  - Mặc định toàn bộ (mặt thường / tóc mặc định / da sáng / màu tóc
   *    gốc / áo gốc) -> KHÔNG tạo biến thể, vẽ ảnh gốc (0 thay đổi).
   * Kết quả cache theo khóa tổ hợp (giới+hướng+5 lựa chọn), tối đa
   * _VARIANT_MAX bản; lỗi/part chưa tải -> dùng bản chỉ-nhuộm hoặc
   * ảnh gốc, game không crash. */
  var _SPR_FACE_PART = { x: 88, y: 164, w: 84, h: 72 }; /* bbox đầu trong part-space 256px (faces/) */
  var _SPR_FACE_ZONE = { /* vùng mặt (kèm viền) trên sprite down 128px */
    nam: { x: 14, y: 36, w: 54, h: 40 },
    nu:  { x: 14, y: 34, w: 48, h: 34 }
  };
  var _SPR_FACE_INNER = { /* vùng GIỮA mặt phải luôn trống khi chồng tóc (sprite px) */
    nam: { x: 22, y: 46, w: 38, h: 28 },
    nu:  { x: 22, y: 44, w: 32, h: 22 }
  };
  var _SPR_HEAD_ZONE = { /* vùng đầu để giới hạn nhuộm tóc theo (giới, hướng) */
    nam: { down: { x1: 96, y1: 82 }, left: { x1: 104, y1: 82 }, right: { x1: 107, y1: 82 }, up: { x0: 10, x1: 86, y1: 118 } },
    nu:  { down: { x1: 81, y1: 80 }, left: { x1: 99, y1: 82 }, right: { x1: 98, y1: 82 }, up: { x0: 2, x1: 74, y1: 118 } }
  };
  /* Zone cho khung walk (đo từ ảnh walk 128px; y1 giữ <=82 để không nhuộm nhầm quần tối
   * thành tóc — spec tóc match màu đen gần tuyệt đối, quần cũng gần đen) */
  var _WALK_HEAD_ZONE = { /* nhuộm tóc: {x0,y0,x1,y1} theo (giới, hướng, a/b) */
    nam: {
      down:  { a: { x0: 4, y0: 0, x1: 90, y1: 82 }, b: { x0: 4, y0: 0, x1: 94, y1: 82 } },
      left:  { a: { x0: 0, y0: 0, x1: 91, y1: 82 }, b: { x0: 0, y0: 0, x1: 85, y1: 82 } },
      right: { a: { x0: 0, y0: 0, x1: 96, y1: 82 }, b: { x0: 0, y0: 0, x1: 94, y1: 82 } },
      up:    { a: { x0: 2, y0: 5, x1: 88, y1: 100 }, b: { x0: 0, y0: 0, x1: 88, y1: 100 } }
    },
    nu: {
      down:  { a: { x0: 0, y0: 0, x1: 71, y1: 82 }, b: { x0: 0, y0: 0, x1: 69, y1: 82 } },
      left:  { a: { x0: 16, y0: 0, x1: 95, y1: 82 }, b: { x0: 13, y0: 0, x1: 87, y1: 82 } },
      right: { a: { x0: 1, y0: 0, x1: 79, y1: 82 }, b: { x0: 0, y0: 0, x1: 71, y1: 82 } },
      up:    { a: { x0: 0, y0: 0, x1: 62, y1: 100 }, b: { x0: 0, y0: 0, x1: 64, y1: 100 } }
    }
  };
  /* Vùng mặt trên khung walk hướng down (căn bằng template matching với sprite tĩnh,
   * cùng tỉ lệ part-space nên dùng chung công thức chồng part) */
  var _WALK_FACE_ZONE = {
    nam: { a: { x: 12, y: 24, w: 54, h: 40 }, b: { x: 12, y: 28, w: 54, h: 40 } },
    nu:  { a: { x: 8, y: 24, w: 48, h: 34 },  b: { x: 10, y: 26, w: 48, h: 34 } }
  };
  var _WALK_FACE_INNER = { /* vùng giữa mặt giữ trống khi chồng tóc (cùng offset như tĩnh) */
    nam: { a: { x: 20, y: 34, w: 38, h: 28 }, b: { x: 20, y: 38, w: 38, h: 28 } },
    nu:  { a: { x: 16, y: 34, w: 32, h: 22 }, b: { x: 18, y: 36, w: 32, h: 22 } }
  };
  function _apFind(list, id) {
    if (!list) return null;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  /* Tổ hợp biến thể từ (giới tính, appearance) tường minh -> spec hoặc null.
   * Bui 2026-10-20: preview màn tạo nhân vật dùng chung pipeline biến thể này. */
  function _variantSpecFrom(g, a) {
    try {
      if (typeof Appearance === 'undefined' || !Appearance.normalize || !Appearance.optsFor) return null;
      g = (g === 'nu') ? 'nu' : 'nam';
      a = Appearance.normalize(a, g);
      var def = Appearance.defaults(g);
      var o = Appearance.optsFor({ char: { gender: g, appearance: a } }) || {};
      var tints = o.tints || {};
      var skinSpec = tints.dau || null;                 /* scale da (spec dùng chung mọi part da) */
      var hairSpec = tints.toc || null;                 /* remap tóc; null khi màu tóc = mặc định giới */
      var oc = _apFind(Appearance.OUTFIT_COLORS, a.outfitColor);
      var outHex = (oc && oc.hex) ? oc.hex : null;
      var needFace = (a.face !== def.face);
      var needHair = (a.hair !== def.hair);
      if (!skinSpec && !hairSpec && !outHex && !needFace && !needHair) return null;
      return { g: g, a: a, skinSpec: skinSpec, hairSpec: hairSpec, outHex: outHex,
               needFace: needFace, needHair: needHair,
               key: g + '|' + a.face + '|' + a.hair + '|' + a.skin + '|' + a.hairColor + '|' + a.outfitColor };
    } catch (e) { return null; }
  }
  /* Tổ hợp biến thể hiện tại của người chơi -> spec hoặc null nếu mặc định/thiếu dữ liệu */
  function _variantSpec() {
    try {
      var S = _S();
      if (!S || !S.char) return null;
      return _variantSpecFrom(S.char.gender, S.char.appearance);
    } catch (e) { return null; }
  }
  function _hexRgbV(h) {
    if (!h) return null;
    h = String(h).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [((n >> 16) & 255), ((n >> 8) & 255), (n & 255)];
  }
  function _lumV(r, g, b) { return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; }
  /* Áp 1 spec tint kiểu charanim (scale/remap) lên ImageData, giới hạn trong box (tùy chọn).
   * Cùng công thức với CharAnim._tintedImg: scale nhân kênh theo to/from cho pixel gần
   * họ màu match; remap ánh xạ độ sáng -> tông màu đích (giữ shading). */
  function _applyTintSpecPx(d, w, h, spec, box) {
    if (!spec) return;
    var to = _hexRgbV(spec.to); if (!to) return;
    var matchRgbs = null, tol2 = 0;
    if (spec.match) {
      matchRgbs = spec.match.map(_hexRgbV);
      var tol = spec.tol || 80; tol2 = tol * tol;
    }
    var fx = 1, fy = 1, fz = 1, refL = 0.5;
    if (spec.m === 'scale') {
      var from = _hexRgbV(spec.from); if (!from) return;
      fx = to[0] / (from[0] || 1); fy = to[1] / (from[1] || 1); fz = to[2] / (from[2] || 1);
    } else {
      refL = spec.refLum != null ? spec.refLum : _lumV.apply(null, _hexRgbV(spec.ref) || [128, 128, 128]);
      if (refL <= 0) refL = 0.5;
    }
    var satMin = spec.satMin || 0;
    var x0 = box ? (box.x0 || 0) : 0, x1 = box ? Math.min(w, box.x1 || w) : w;
    var y0 = box ? (box.y0 || 0) : 0, y1 = box ? Math.min(h, box.y1 || h) : h;
    for (var y = y0; y < y1; y++) {
      for (var x = x0; x < x1; x++) {
        var i = (y * w + x) * 4;
        if (d[i + 3] === 0) continue;
        var r = d[i], gg = d[i + 1], b = d[i + 2];
        /* spec.warm: chỉ nhuộm pixel "ấm" kiểu da (r>=g, r-b>=25) — tránh ăn vào
         * áo trắng/mắt trắng khi áp spec da lên cả sprite (áo nữ trắng gần tông da sáng) */
        if (spec.warm && !(r >= gg && (r - b) >= 25)) continue;
        if (matchRgbs) {
          var okM = false;
          for (var j = 0; j < matchRgbs.length; j++) {
            var mc = matchRgbs[j];
            var dr = r - mc[0], dg = gg - mc[1], db = b - mc[2];
            if (dr * dr + dg * dg + db * db <= tol2) { okM = true; break; }
          }
          if (!okM) continue;
        }
        if (satMin > 0) {
          var mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
          if (mx === 0 || (mx - mn) / mx < satMin) continue;
        }
        if (spec.m === 'scale') {
          d[i] = Math.min(255, r * fx); d[i + 1] = Math.min(255, gg * fy); d[i + 2] = Math.min(255, b * fz);
        } else {
          var k = 0.25 + 0.75 * (_lumV(r, gg, b) / refL);
          if (k > 1.6) k = 1.6;
          d[i] = Math.min(255, to[0] * k); d[i + 1] = Math.min(255, to[1] * k); d[i + 2] = Math.min(255, to[2] * k);
        }
      }
    }
  }
  /* Nhuộm phần vải TRẮNG của áo trên sprite -> màu áo đã chọn (giữ viền đỏ/thép/đen):
   * chỉ pixel sáng (lum>=0.5), ít bão hòa (sat<=0.25), đục (alpha>=200), không trội xanh dương. */
  function _applyOutfitPx(d, w, h, hex) {
    var to = _hexRgbV(hex); if (!to) return;
    var refL = 0.85;
    for (var i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 200) continue;
      var r = d[i], gg = d[i + 1], b = d[i + 2];
      var mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
      if (mx === 0) continue;
      if ((mx - mn) / mx > 0.25) continue;      /* viền đỏ bão hòa cao -> giữ nguyên */
      var L = _lumV(r, gg, b);
      if (L < 0.5) continue;                    /* viền đen/quần tối -> giữ nguyên */
      if (b > r && b > gg) continue;           /* lưỡi kiếm thép hơi xanh -> giữ nguyên */
      var k = 0.25 + 0.75 * (L / refL);
      if (k > 1.6) k = 1.6;
      d[i] = Math.min(255, to[0] * k); d[i + 1] = Math.min(255, to[1] * k); d[i + 2] = Math.min(255, to[2] * k);
    }
  }
  /* Part (mặt/tóc) đã nhuộm theo spec tương ứng — cache riêng theo src+spec */
  var _partTintCache = {};
  function _tintedPart(src, spec) {
    var im = _img(src);
    if (!im) return null;
    if (!spec) return im;
    var key = src + '|' + JSON.stringify(spec);
    var c = _partTintCache[key];
    if (c) return c;
    try {
      c = document.createElement('canvas');
      c.width = im.width; c.height = im.height;
      var g2 = c.getContext('2d');
      g2.drawImage(im, 0, 0);
      var id = g2.getImageData(0, 0, c.width, c.height);
      _applyTintSpecPx(id.data, c.width, c.height, spec, null);
      g2.putImageData(id, 0, 0);
      _partTintCache[key] = c;
      return c;
    } catch (e) { return im; }
  }
  /* Canvas biến thể của 1 sprite (đã nhuộm + chồng part nếu down).
   * Trả {cv, full} — full=false khi part chưa tải xong (chỉ mới nhuộm). */
  var _variantCache = {};
  var _variantKeys = [];
  var _VARIANT_MAX = 24;
  function _playerVariantCanvas(im, src, spec) {
    if (typeof document === 'undefined') return null;
    if (typeof spec === 'undefined') spec = _variantSpec();
    if (!spec) return null;
    var mm = /player_(nam|nu)_(down|left|right|up)(?:_([abc]))?\.png/.exec(src || '');
    if (!mm) return null;
    var dir = mm[2];
    var walkAb = mm[3] || null; /* khung walk a/b/c, null = sprite tĩnh */
    var key = spec.key + '|' + dir + (walkAb ? '|' + walkAb : '');
    var ent = _variantCache[key];
    if (ent && ent.full) return ent.cv;
    /* spec da bản "ấm" (chỉ nhuộm pixel da thật, chừa áo trắng/mắt) */
    var skinW = spec.skinSpec ? Object.assign({}, spec.skinSpec, { warm: true }) : null;
    /* part cho hướng down: cần sẵn sàng thì mới chốt cache bản đầy đủ */
    var faceCv = null, hairCv = null, partsReady = true;
    if (dir === 'down' && (spec.needFace || spec.needHair)) {
      if (spec.needFace) {
        faceCv = _tintedPart(Appearance.faceImg(spec.a, spec.g), skinW);
        if (!faceCv) partsReady = false;
      }
      if (spec.needHair) {
        hairCv = _tintedPart(Appearance.hairImg(spec.a, spec.g), spec.hairSpec);
        if (!hairCv) partsReady = false;
      }
    }
    if (ent && !partsReady) return ent.cv; /* đang có bản nhuộm, part chưa xong thì dùng tạm */
    try {
      var w = im.width, h = im.height;
      var cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      var g2 = cv.getContext('2d');
      g2.drawImage(im, 0, 0);
      var id = g2.getImageData(0, 0, w, h);
      if (skinW) _applyTintSpecPx(id.data, w, h, skinW, null);
      if (spec.hairSpec) {
        /* khung c dùng chung zone đầu của khung a (đầu giống nhau, chỉ chân khác) */
        var _hzSet = ((_WALK_HEAD_ZONE[spec.g] || {})[dir] || {});
        var hz = walkAb ? (_hzSet[walkAb] || _hzSet.a)
                        : ((_SPR_HEAD_ZONE[spec.g] || {})[dir]);
        if (hz) _applyTintSpecPx(id.data, w, h, spec.hairSpec, hz);
      }
      if (spec.outHex) _applyOutfitPx(id.data, w, h, spec.outHex);
      g2.putImageData(id, 0, 0);
      if (dir === 'down' && partsReady && (faceCv || hairCv)) {
        var _fzSet = ((_WALK_FACE_ZONE[spec.g] || {}));
        var z = walkAb ? (_fzSet[walkAb] || _fzSet.a) : _SPR_FACE_ZONE[spec.g];
        if (!z) z = _SPR_FACE_ZONE[spec.g];
        var sx = z.w / _SPR_FACE_PART.w, sy = z.h / _SPR_FACE_PART.h;
        var tx = z.x - _SPR_FACE_PART.x * sx, ty = z.y - _SPR_FACE_PART.y * sy;
        g2.imageSmoothingEnabled = true;
        if (faceCv) {
          g2.save();
          g2.translate(tx, ty);
          g2.scale(sx, sy);
          g2.drawImage(faceCv, 0, 0);
          g2.restore();
        }
        if (hairCv) {
          /* Tóc vẽ qua canvas đệm cùng cỡ sprite: dịch lên 9.6px part (anchor
           * "toc" cao hơn "dau" 0.1 unit trong CharAnim) rồi CẮT vùng giữa mặt —
           * vài part tóc (vd xõa dài nữ) có mảng tóc phủ giữa mặt, cắt để mặt
           * luôn hiện rõ, chỉ giữ tóc trên trán + hai bên. */
          var hc = document.createElement('canvas');
          hc.width = w; hc.height = h;
          var hg = hc.getContext('2d');
          hg.imageSmoothingEnabled = true;
          hg.translate(tx, ty - 9.6 * sy);
          hg.scale(sx, sy);
          hg.drawImage(hairCv, 0, 0);
          var _irSet = ((_WALK_FACE_INNER[spec.g] || {}));
          var ir = (walkAb ? (_irSet[walkAb] || _irSet.a) : null) || _SPR_FACE_INNER[spec.g];
          hg.setTransform(1, 0, 0, 1, 0, 0);
          hg.clearRect(ir.x, ir.y, ir.w, ir.h);
          g2.drawImage(hc, 0, 0);
        }
      }
      _variantCache[key] = { cv: cv, full: partsReady };
      _variantKeys.push(key);
      while (_variantKeys.length > _VARIANT_MAX) {
        var old = _variantKeys.shift();
        if (old !== key) delete _variantCache[old];
      }
      return cv;
    } catch (e) { return null; }
  }

  /* Part mặt/tóc đã tải xong trong cache engine chưa (cho preview tạo nhân vật).
   * Dùng đúng Image object mà _tintedPart dùng -> không race khi kiểm tra. */
  function _variantPartsReady(spec) {
    try {
      if (!spec || (!spec.needFace && !spec.needHair)) return true;
      if (typeof Appearance === 'undefined' || !Appearance.faceImg || !Appearance.hairImg) return false;
      var ok = true;
      if (spec.needFace) ok = ok && !!_img(Appearance.faceImg(spec.a, spec.g));
      if (spec.needHair) ok = ok && !!_img(Appearance.hairImg(spec.a, spec.g));
      return ok;
    } catch (e) { return false; }
  }

  /* Vẽ người chơi bằng sprite mới tại (cx, cy) — true nếu vẽ được.
   * Bóng đổ nằm yên trên mặt đất; thân nhún 2px theo nhịp bước khi di chuyển. */
  function _drawPlayerSpriteMode(cx, cy, lift, blift) {
    var S = _S();
    var gioi = (S && S.char && S.char.gender === 'nu') ? 'nu' : 'nam';
    var face = _playerDirFace();
    /* đang di chuyển -> khung bước đi a/c/b/c luân phiên mỗi ~0.15s; đứng yên -> sprite tĩnh.
     * khung walk lỗi/thiếu -> rớt về sprite tĩnh, không crash. */
    var moving = _playerMoving();
    var ab = 'a';
    /* Build 98: hoạt ảnh 20 frame theo lớp ưu tiên hơn chu kỳ bước cũ. */
    var src = _anim20PlayerSrc(face, moving);
    if (!src && moving) {
      /* chu kỳ 4 khung a->c->b->c; khung c chưa tải xong -> rớt về nhịp a/b cũ */
      ab = _walkCycleAb(Date.now());
      var wsrc = _playerWalkFile(gioi, face, ab);
      var wce = _imgCache[wsrc];
      if (wce && wce.done && wce.ok) src = wsrc;
      else {
        _img(wsrc); /* warm cache lần đầu */
        if (ab === 'c') {
          ab = (Math.floor(Date.now() / 250) % 2 === 0) ? 'a' : 'b';
          var fsrc = _playerWalkFile(gioi, face, ab);
          var fce = _imgCache[fsrc];
          if (fce && fce.done && fce.ok) src = fsrc;
          else _img(fsrc);
        }
      }
    }
    if (!src) {
      src = _playerDirSprite();
      ab = 'a';
      if (!src) return false;
    }
    /* PAPER-DOLL: ghép body+legs (+outfit) thành 1 canvas rồi đi tiếp pipeline
     * vẽ chung (bóng đổ/bobbing/biến thể/hit-flash). Composite khớp pixel 100%
     * với sprite khối nên pipeline cũ không cần biết nguồn ảnh. */
    var _pdCanvas = null;
    if (typeof PAPERDOLL_MODE !== 'undefined' && PAPERDOLL_MODE && typeof PaperDoll !== 'undefined') {
      try {
        var _pdOid = _wornOutfitId();
        PaperDoll.warm(gioi, face, _pdOid);
        _pdCanvas = PaperDoll.compose(gioi, face, moving ? ab : '0', _pdOid);
      } catch (_pde) { _pdCanvas = null; }
    }
    var im = null;
    if (_pdCanvas) {
      /* src giả khớp regex biến thể (player_<g>_<dir>[_<khung>].png) để pipeline
       * nhuộm da/tóc/áo + mặt/tóc cũ áp đúng hướng/khung; outfit (đã baked sẵn
       * mặt/tóc) dùng src không khớp -> tự bỏ qua biến thể, giữ nguyên thiết kế. */
      var _oidChk = null;
      try { _oidChk = _wornOutfitId(); } catch (_oe2) {}
      src = _oidChk ? 'paperdoll_outfit_baked.png'
                    : ('player_' + gioi + '_' + face + (moving ? '_' + ab : '') + '.png');
      im = _pdCanvas;
    } else {
      im = _img(src);
    }
    if (!im || !im.width) return false;
    /* cùng hệ số độ sâu ds như _drawCreature của NPC: đứng cùng hàng y thì bằng cỡ nhau */
    /* Bui 2026-10-22: depth scale theo screen Y (đúng khi zoom map) */
    var _syP = _worldToScreenY(cy) / Math.max(1, _viewH);
    if (_syP < 0) _syP = 0; if (_syP > 1) _syP = 1;
    var dh = _PLAYER_SPRITE_H * (0.94 + 0.12 * _syP);
    var dw = dh * (im.width / im.height);
    /* bóng đổ như fallback cũ: bay cao -> nhỏ/mờ dần */
    var flyLift = (Engine.fly ? 26 : 0) + Math.max(0, blift);
    var hF = Math.min(flyLift, 70) / 70;
    _drawShadow(cx, player.y + 18 - blift, dw * 0.32 * (1 - hF * 0.4), 0.26 * (1 - hF * 0.65));
    /* bobbing: chỉ khi đang di chuyển (cùng nhịp bước _playerAnimName dùng) */
    var bob = 0;
    if (moving)
      bob = Math.abs(Math.sin(Date.now() / 1000 * 10)) * 2;
    var useIm = im;
    /* biến thể ngoại hình (mặt/tóc/màu đã chọn): có thì vẽ bản biến thể thay ảnh gốc */
    var _vKey = null;
    try {
      var _vc = _playerVariantCanvas(im, src);
      if (_vc) {
        useIm = _vc;
        var _vs = _variantSpec();
        _vKey = _vs ? (_vs.key + '|' + src) : null;
      }
    } catch (e) {}
    if (player.hitT > 0) { var tim = _redTint(useIm, _vKey ? ('red|' + _vKey) : undefined); if (tim) useIm = tim; }
    _ctx.drawImage(useIm, cx - dw / 2, cy - dh / 2 - bob, dw, dh);
    return true;
  }

  function _playerFrame() {
    var S = _S();
    var gioi = (S && S.char && S.char.gender === 'nu') ? 'nu' : 'nam';
    var ang = (typeof player.ang === 'number') ? player.ang : Math.PI / 2;
    var huong = _CHAR_HUONG[_face4(player, ang)] || 'xuong';
    var src = null;
    /* đang TUNG SKILL: khung skill riêng theo hướng (char_*_skill*) — chỉ dùng khi đã tải xong */
    if (player.skillT > 0) {
      /* Bui 2026-10-21: skill chưởng dùng hình chưởng ấn */
      try {
        var _sk = player.lastSkill || "";
        if (/chuong|chuong_an|palm/i.test(_sk)) {
          var _ca = 'assets/sprs/char_' + gioi + '_chuong_an.png';
          var _cae = _imgCache[_ca];
          if (!_cae) _img(_ca);
          else if (_cae.done && _cae.ok) return _ca;
        }
      } catch (_e) {}
      var _sf = (player.skillT > 0.2) ? 1 : 2;
      var _ssrc = 'assets/sprs/char_' + gioi + '_' + huong + '_skill' + _sf + '.png';
      var _sce = _imgCache[_ssrc];
      if (!_sce) _img(_ssrc);
      else if (_sce.done && _sce.ok) return _ssrc;
      /* chưa tải xong hoặc art thiếu -> rớt xuống frame tấn công */
    }
    /* đang đánh thường: dùng frame tấn công theo vũ khí (art char_*_atk_*) — chỉ dùng khi đã tải xong */
    /* Bui 2026-10-21: chọn góc đánh theo hướng quái (ngang/bổ/đâm) */
    if (player.atkT > 0) {
      var _wk = _weaponArtKey();
      var _asrc = null;
      try {
        var _tgt = player.target;
        if (_tgt && _wk === 'kiem' && (gioi === 'nam' || gioi === 'nu')) {
          var _dx = _tgt.x - player.x, _dy = _tgt.y - player.y;
          var _adx = Math.abs(_dx), _ady = Math.abs(_dy);
          var _ang = 'ngang';
          if (_ady > _adx * 1.5) _ang = (_dy < 0) ? 'bola' : 'dam';
          else if (_adx > _ady * 1.5) _ang = 'ngang';
          else _ang = 'dam';
          var _cand = 'assets/sprs/char_' + gioi + '_atk_kiem_' + _ang + '.png';
          var _ce = _imgCache[_cand];
          if (!_ce) _img(_cand);
          else if (_ce.done && _ce.ok) return _cand;
        }
      } catch (_e) {}
      var _af = (player.atkT > 0.12) ? 1 : 2;
      _asrc = 'assets/sprs/char_' + gioi + '_atk_' + _wk + '_' + _af + '.png';
      var _ace = _imgCache[_asrc];
      if (!_ace) _img(_asrc);
      else if (_ace.done && _ace.ok) return _asrc;
      /* chưa tải xong hoặc art thiếu -> rớt xuống frame thường */
    }
    try {
      if (typeof Engine !== 'undefined' && Engine.fly)
        src = 'assets/sprs/char_' + gioi + '_fly.png';
    } catch (e) {}
    if (!src) {
      var moving = false;
      try { moving = (Date.now() - (player._lastMove || 0)) < 150; } catch (e2) {}
      if (moving) {
        var f = 1 + (Math.floor((player._walkPhase || 0) * 8) % 4);
        src = 'assets/sprs/char_' + gioi + '_' + huong + '_walk' + f + '.png';
      } else {
        src = 'assets/sprs/char_' + gioi + '_' + huong + '_idle.png';
      }
    }
    var ce = _imgCache[src];
    if (ce && ce.done && !ce.ok) return _playerSpriteOld(); /* file không tồn tại → sprite cũ */
    if (ce && ce.done && ce.ok) return src; /* đã tải xong */
    _img(src); /* warm cache lần đầu */
    return _playerSpriteOld(); /* đang tải → dùng sprite cũ, KHÔNG vẽ ô vuông */
  }
  /* Pháp bảo ngự kiếm theo hệ phái: kiếm (Kiếm) / phất trần (Pháp) / đài sen (Thể) */
  function _drawMount(x, y, dir) {
    var S = _S();
    var cls = (S && S.char && S.char.sect) || 'kiem';
    _ctx.save();
    _ctx.translate(x, y);
    if (cls === 'phap') {
      /* Phất trần: cán + chùm lông trắng */
      _ctx.strokeStyle = '#5a3d2b'; _ctx.lineWidth = 4;
      _ctx.beginPath(); _ctx.moveTo(-22 * dir, -6); _ctx.lineTo(10 * dir, 2); _ctx.stroke();
      _ctx.strokeStyle = 'rgba(240,240,245,0.9)'; _ctx.lineWidth = 3;
      for (var i = -2; i <= 2; i++) {
        _ctx.beginPath(); _ctx.moveTo(10 * dir, 2);
        _ctx.quadraticCurveTo(24 * dir, 2 + i * 5, 34 * dir, 6 + i * 7); _ctx.stroke();
      }
    } else if (cls === 'the') {
      /* Đài sen: cánh hoa hồng xếp tròn */
      for (var p = 0; p < 8; p++) {
        var a = (p / 8) * Math.PI * 2;
        _ctx.fillStyle = p % 2 ? '#e88ca0' : '#f4b8c6';
        _ctx.beginPath();
        _ctx.ellipse(Math.cos(a) * 16, Math.sin(a) * 6, 10, 5, a, 0, Math.PI * 2);
        _ctx.fill();
      }
      _ctx.fillStyle = '#f7d774';
      _ctx.beginPath(); _ctx.ellipse(0, 0, 8, 4, 0, 0, Math.PI * 2); _ctx.fill();
    } else {
      /* Kiếm: lưỡi kiếm dài + chuôi, phong cách thủy mặc */
      _ctx.strokeStyle = '#9fb6c9'; _ctx.lineWidth = 5; _ctx.lineCap = 'round';
      _ctx.beginPath(); _ctx.moveTo(-30 * dir, 0); _ctx.lineTo(26 * dir, 0); _ctx.stroke();
      _ctx.strokeStyle = '#3a4a5d'; _ctx.lineWidth = 2;
      _ctx.beginPath(); _ctx.moveTo(-30 * dir, 0); _ctx.lineTo(26 * dir, 0); _ctx.stroke();
      _ctx.fillStyle = '#6b4a2f';
      _ctx.fillRect(-34 * dir - 3, -6, 6, 12);
      _ctx.fillStyle = '#c0392b';
      _ctx.beginPath(); _ctx.arc(-34 * dir, 0, 3, 0, Math.PI * 2); _ctx.fill();
    }
    /* vệt sáng dưới pháp bảo */
    _ctx.globalAlpha = 0.35;
    _ctx.fillStyle = '#9fe8ff';
    _ctx.beginPath(); _ctx.ellipse(-26 * dir, 6, 18, 4, 0, 0, Math.PI * 2); _ctx.fill();
    _ctx.globalAlpha = 0.18;
    _ctx.beginPath(); _ctx.ellipse(-44 * dir, 8, 14, 3, 0, 0, Math.PI * 2); _ctx.fill();
    _ctx.restore();
  }
  /* ---------- Skeletal animation: map trạng thái -> tên animation CharAnim ----------
   * (Bui 2026-10-18: chuyển động chi tiết từng bộ phận) */
  function _playerAnimName() {
    /* chết: hp <= 0 (hiếm vì _playerDie hồi sinh ngay, nhưng giữ cho chắc) */
    if (player.hp <= 0) return "die";
    /* bị đánh */
    if (player.hitT > 0) return "hit";
    /* đánh thường / tung skill: animation theo loại vũ khí */
    if (player.atkT > 0 || player.skillT > 0) {
      return "atk_" + _weaponArtKey();
    }
    /* di chuyển: run khi bay hoặc chạy nhanh, walk khi đi bộ */
    var now = Date.now();
    if (player._lastMove && (now - player._lastMove < 250)) {
      if (Engine.fly) return "run";
      /* tốc độ cao -> run */
      var spd = Math.hypot(player._vx || 0, player._vy || 0);
      return (spd > 140) ? "run" : "walk";
    }
    return "idle";
  }

  function _drawPlayer() {
    var lift = Engine.fly ? -10 : 0;
    var blift = _bridgeLiftAt(player.x, player.y); /* đứng trên cầu: nâng theo mặt cầu */
    /* chồm lên khi đánh/tung chiêu */
    var lunge = 0;
    if (player.atkT > 0) {
      /* 3 pha với easing: windup lùi nhẹ -> strike chồm mạnh -> recover về */
      var ph = player.atkPhase || 'strike';
      if (ph === 'windup') {
        /* lùi lại chuẩn bị: -4px */
        lunge = -4 * player.dir;
      } else if (ph === 'strike') {
        /* chồm tới với ease-out: nhanh đầu, chậm cuối */
        var t = (0.27 - player.atkT) / 0.12; /* 0->1 */
        t = Math.max(0, Math.min(1, t));
        var ease = 1 - Math.pow(1 - t, 3);
        lunge = (4 + ease * 14) * player.dir;
      } else {
        /* recover: trở về mượt */
        var t2 = player.atkT / 0.15; /* 1->0 */
        lunge = 18 * t2 * t2 * player.dir;
      }
    }
    if (Engine.fly) { // pháp bảo ngự kiếm dưới chân
      _drawMount(player.x + lunge, player.y + lift + 16, player.dir);
    }
    /* vòng giáp (shield) */
    if (player.shield > 0) {
      _ctx.globalAlpha = 0.6;
      _ctx.strokeStyle = '#7fd4ff';
      _ctx.lineWidth = 3;
      _ctx.beginPath(); _ctx.arc(player.x + lunge, player.y + lift - blift, 30, 0, Math.PI * 2); _ctx.stroke();
      _ctx.globalAlpha = 1;
    }
    /* vòng buff */
    var now = Date.now();
    for (var bi = 0; bi < _buffs.length; bi++) {
      if (now < _buffs[bi].until && _buffs[bi].fx) {
        _ctx.globalAlpha = 0.35;
        _ctx.strokeStyle = _buffs[bi].fx;
        _ctx.lineWidth = 2;
        _ctx.beginPath(); _ctx.arc(player.x + lunge, player.y + lift - blift, 26 + bi * 5, 0, Math.PI * 2); _ctx.stroke();
        _ctx.globalAlpha = 1;
      }
    }
    /* --- PLAYER_SPRITE_MODE: nhân vật mới 4 hướng (áo trắng viền đỏ) — Bui 2026-10-20 ---
     * Vẽ được thì bỏ qua CharAnim; không được (tắt mode/chưa tải/lỗi) -> đường cũ bên dưới. */
    var _spriteNewDrawn = false;
    if (typeof PLAYER_SPRITE_MODE !== "undefined" && PLAYER_SPRITE_MODE) {
      try {
        _spriteNewDrawn = _drawPlayerSpriteMode(player.x + lunge, player.y + lift - blift, lift, blift);
      } catch (_pe) { _spriteNewDrawn = false; }
    }
    /* --- Skeletal animation (CharAnim) — Bui 2026-10-18 (giờ là fallback khi sprite mode không vẽ) --- */
    var _skeletalOk = false;
    if (!_spriteNewDrawn) try {
      if (typeof CharAnim !== "undefined" && CharAnim.draw) {
        var _st8 = _S();
        var _gioi = (_st8 && _st8.char && _st8.char.gender === "nu") ? "nu" : "nam";
        var _anim = _playerAnimName();
        var _at = Date.now() / 1000;
        /* equip override: vũ khí/trang bị từ EquipSet nếu có */
        var _eqOverride = null;
        try {
          if (_st8 && _st8.equipSet) {
            _eqOverride = {};
            /* map slot EquipSet -> part skeletal */
            var _slot2part = { ao: "ao", quan: "quan", mu: "toc" };
            for (var _esk in _slot2part) {
              var _eid = _st8.equipSet[_esk];
              if (_eid && typeof EquipSet !== "undefined") {
                var _edef = EquipSet.getById(_eid);
                if (_edef && _edef.icon) _eqOverride[_slot2part[_esk]] = _edef.icon;
              }
            }
          }
        } catch (_ee) {}
        /* Ngoại hình tạo nhân vật (appearance.js): mặt + tóc thay part,
         * màu da/tóc/áo qua tints. Mũ EquipSet (mu->toc) thắng tóc. */
        var _apTints = null;
        try {
          if (typeof Appearance !== "undefined" && Appearance.optsFor) {
            var _apo = Appearance.optsFor(_st8);
            if (_apo) {
              _eqOverride = _eqOverride || {};
              if (_apo.equip) {
                if (_apo.equip.dau) _eqOverride.dau = _apo.equip.dau;
                if (_apo.equip.toc && !_eqOverride.toc) _eqOverride.toc = _apo.equip.toc;
              }
              _apTints = _apo.tints;
            }
          }
        } catch (_ae) {}
        _skeletalOk = CharAnim.draw(_ctx, player.x + lunge, player.y + lift - blift,
          _anim, _at, {
            dir: player.dir || 1,
            scale: 14, /* 1 unit = 14px: nhân vật ~48px, khớp sprite cũ 38x48 (art vẽ 96px/unit, nativeScale trong manifest) */
            gender: _gioi,
            equip: _eqOverride,
            tints: _apTints,
            flashRed: (player.hitT > 0) ? 1 : 0
          });
      }
    } catch (_se) { _skeletalOk = false; }
    if (!_spriteNewDrawn && !_skeletalOk) {
      /* fallback cuối: sprite full-body cũ */
      _drawCreature(player, player.x + lunge, player.y + lift - blift, 38, 48, _playerFrame(), '#2fa3a0',
        { lift: (Engine.fly ? 26 : 0) + blift, shadowY: player.y + 18 - blift, noAutoFlip: true });
    }
    var ps = _getStats();
    _drawHpBar(player.x, player.y + lift - blift - 32, 40, player.hp / ps.maxHp, false);
    /* Mũi tên vàng chỉ đường nhiệm vụ (Bui 2026-10-19) */
    try { _drawQuestArrow(player.x, player.y + lift - blift); } catch (e) {}
    /* Trang phục shop đang mặc: vũ khí/mũ/cánh/hào quang (Bui 2026-10-21) */
    try { _drawOutfitOverlays(player.x + lunge, player.y + lift - blift); } catch (e) {}
  }

  /* --- Trang phục shop hiển thị trên nhân vật (Bui 2026-10-21) ---
   * Đọc state.shop_outfit_worn qua OutfitShop.wornId; sprite từ OUTFIT_DATA.img.
   * Vẽ sau nhân vật (trừ cánh vẽ trước). Không đụng PAPERDOLL_MODE. */
  function _wornOutfit() {
    var out = {};
    try {
      if (typeof OutfitShop === 'undefined' || typeof OUTFIT_DATA === 'undefined') return out;
      var S = _S();
      var cats = ['vukhi', 'mu', 'canh', 'haoquang', 'ao'];
      for (var i = 0; i < cats.length; i++) {
        var id = OutfitShop.wornId(S, cats[i]);
        if (id && OUTFIT_DATA[id]) out[cats[i]] = { id: id, def: OUTFIT_DATA[id] };
      }
    } catch (e) {}
    return out;
  }
  /* Loại vũ khí trang phục -> kiểu hiệu ứng đánh */
  function _outfitWeaponKind(wid) {
    if (!wid) return null;
    if (wid.indexOf('kiem') >= 0) return 'kiem';
    if (wid.indexOf('quat') >= 0 || wid.indexOf('phien') >= 0) return 'quat';
    if (wid.indexOf('tieu') >= 0 || wid.indexOf('sao') >= 0) return 'tieu';
    if (wid.indexOf('thuong') >= 0) return 'thuong';
    if (wid.indexOf('dao') >= 0) return 'dao';
    return 'kiem';
  }
  function _drawOutfitOverlays(px, py) {
    var worn = _wornOutfit();
    var hasAny = worn.vukhi || worn.mu || worn.canh || worn.haoquang || worn.ao;
    if (!hasAny) return;
    var face = 'down';
    try { face = _playerDirFace(); } catch (e) {}
    var dir = player.dir || 1;
    var now = Date.now() / 1000;
    /* Hào quang: vòng sáng dưới chân */
    if (worn.haoquang && worn.haoquang.def.img) {
      var him = _img(worn.haoquang.def.img);
      if (him) {
        var pulse = 1 + Math.sin(now * 3) * 0.08;
        var hw = 70 * pulse, hh = 24 * pulse;
        _ctx.save();
        _ctx.globalAlpha = 0.75;
        _ctx.drawImage(him, px - hw / 2, py + 14 - hh / 2, hw, hh);
        _ctx.restore();
      }
    }
    /* Cánh: sau lưng, vỗ nhẹ */
    if (worn.canh && worn.canh.def.img) {
      var cim = _img(worn.canh.def.img);
      if (cim) {
        var flap = 1 + Math.sin(now * 5) * 0.12;
        var cw = 56 * flap, ch = 44 * flap;
        _ctx.save();
        _ctx.globalAlpha = 0.9;
        /* vẽ sau lưng: offset ngược hướng mặt */
        var bx = px - dir * 14;
        _ctx.drawImage(cim, bx - cw / 2, py - 34 - ch / 2, cw, ch);
        _ctx.restore();
      }
    }
    /* Áo: overlay màu nhẹ lên thân (đơn giản, không che nhân vật) */
    if (worn.ao && worn.ao.def.img) {
      _ctx.save();
      _ctx.globalAlpha = 0.18;
      _ctx.fillStyle = '#ffffff';
      _ctx.fillRect(px - 14, py - 30, 28, 34);
      _ctx.restore();
    }
    /* Mũ/nón: trên đầu */
    if (worn.mu && worn.mu.def.img) {
      var mim = _img(worn.mu.def.img);
      if (mim) {
        var mw = 34, mh = 26;
        _ctx.save();
        _ctx.drawImage(mim, px - mw / 2, py - 52 - mh / 2, mw, mh);
        _ctx.restore();
      }
    }
    /* Vũ khí: trên tay, xoay theo 4 hướng, vung khi đánh */
    if (worn.vukhi && worn.vukhi.def.img) {
      var vim = _img(worn.vukhi.def.img);
      if (vim) {
        /* góc vũ khí theo hướng mặt */
        var baseAng = 0;
        if (face === 'right') baseAng = -0.5;
        else if (face === 'left') baseAng = Math.PI + 0.5;
        else if (face === 'up') baseAng = -Math.PI / 2 + 0.3;
        else baseAng = Math.PI / 2 - 0.3; /* down */
        /* vung khi đánh: 3 pha windup/strike/recover */
        var swing = 0;
        if (player.atkT > 0) {
          var ph = player.atkPhase || 'strike';
          if (ph === 'windup') swing = -0.9;
          else if (ph === 'strike') swing = 1.4;
          else swing = 0.5 * (player.atkT / 0.15);
        }
        var ang = baseAng + swing * dir;
        /* vị trí tay */
        var hx = px + dir * 14, hy = py - 12;
        _ctx.save();
        _ctx.translate(hx, hy);
        _ctx.rotate(ang);
        if (dir < 0 && (face === 'left' || face === 'right')) _ctx.scale(1, -1);
        _ctx.drawImage(vim, 0, -10, 44, 20);
        _ctx.restore();
      }
    }
  }
  /* Hiệu ứng skill theo loại vũ khí trang phục đang cầm (Bui 2026-10-21) */
  function _fxOutfitWeapon(sx, sy, color) {
    var worn = _wornOutfit();
    if (!worn.vukhi) return;
    var kind = _outfitWeaponKind(worn.vukhi.id);
    var col = color || '#ffe9a8';
    var dir = player.dir || 1;
    if (kind === 'kiem') {
      /* chém ngang: vệt sáng */
      _fx.push({ kind: 'wslash_h', x: sx, y: sy, dir: dir, t: 0.3, maxT: 0.3, color: col });
    } else if (kind === 'quat') {
      /* quạt gió: sóng lan */
      _fx.push({ kind: 'wslash_fan', x: sx, y: sy, dir: dir, t: 0.5, maxT: 0.5, color: col });
    } else if (kind === 'tieu') {
      /* sáo/tiêu: sóng âm vòng tròn */
      _fxCircle(sx, sy, col, 1.4);
      _fxCircle(sx, sy, col, 1.0);
    } else if (kind === 'thuong') {
      /* thương: đâm thẳng */
      _fx.push({ kind: 'wslash_v', x: sx, y: sy, dir: dir, t: 0.3, maxT: 0.3, color: col, vert: false });
    } else if (kind === 'dao') {
      /* đao: chém dọc */
      _fx.push({ kind: 'wslash_v', x: sx, y: sy, dir: dir, t: 0.35, maxT: 0.35, color: col, vert: true });
    }
  }

  /* Mũi tên vàng trên đầu nhân vật, chỉ hướng tới mục tiêu NV hiện tại */
  function _drawQuestArrow(px, py) {
    if (typeof QuestGuide === "undefined") return;
    var S = _S();
    var q = null;
    try { q = QuestGuide.activeStoryQuest(S); } catch (e) { return; }
    if (!q) return;
    var tgt = null;
    try { tgt = QuestGuide.questTarget(S, q, _mapId); } catch (e) { return; }
    if (!tgt) return;
    if (tgt.map != null && tgt.map !== _mapId) return; /* khác map: không vẽ */
    var tx = null, ty = null;
    if (tgt.kind === "npc") {
      for (var i = 0; i < _npcs.length; i++)
        if (_npcs[i].npcId === tgt.npcId) { tx = _npcs[i].x; ty = _npcs[i].y; break; }
    } else if (tgt.x != null && tgt.y != null) {
      tx = tgt.x; ty = tgt.y;
    }
    if (tx == null) return;
    var dx = tx - px, dy = ty - py;
    var dist = Math.hypot(dx, dy);
    if (dist < 60) return; /* đã ở gần mục tiêu: ẩn mũi tên */
    var ang = Math.atan2(dy, dx);
    var bob = Math.sin(Date.now() / 300) * 4; /* nhấp nhô */
    var ax = px, ay = py - 62 + bob;
    _ctx.save();
    _ctx.translate(ax, ay);
    _ctx.rotate(ang + Math.PI / 2);
    _ctx.fillStyle = "#ffd76a";
    _ctx.strokeStyle = "#7a5c10";
    _ctx.lineWidth = 2;
    _ctx.beginPath();
    /* Bui 2026-10-21: mũi tên bé lại */
    _ctx.moveTo(0, -9);
    _ctx.lineTo(6, 4);
    _ctx.lineTo(2.5, 4);
    _ctx.lineTo(2.5, 9);
    _ctx.lineTo(-2.5, 9);
    _ctx.lineTo(-2.5, 4);
    _ctx.lineTo(-6, 4);
    _ctx.closePath();
    _ctx.fill();
    _ctx.stroke();
    _ctx.restore();
  }

  function _drawOther(o) {
    _drawCreature(o, o.x, o.y, 38, 48, 'assets/sprs/char_nam_xuong_idle.png', '#7e9bb5', { noAutoFlip: true });
    if (o.name) {
      _ctx.fillStyle = '#fff';
      _ctx.font = '10px sans-serif';
      _ctx.textAlign = 'center';
      _ctx.fillText(String(o.name).slice(0, 14), o.x, o.y - 28);
    }
  }

  /* ---------- NPC sinh động như thật ----------
   * - idle: thở (scaleY phồng/xẹp), đầu khẽ quay (rotate), nhấp nhô
   * - lại gần: quay mặt + cúi chào (bow)
   * - đang thoại (Engine.talkNpcId): bong bóng 💬 + gật gù
   * - theo nghề: thợ rèn đập búa (tia lửa), tiểu nhị lau bàn (khăn) */
  function _drawNpc(n) {
    var ph = n.phase || 0;
    var spd = Math.hypot(n.vx || 0, n.vy || 0);
    var moving = spd > 6;
    /* thở: phồng/xẹp nhẹ 2.2%/nhịp */
    var breathe = 1 + 0.022 * Math.sin(_tickT * 2.1 + ph);
    /* đầu khẽ quay: dao động xoay nhẹ */
    var swayRot = 0.035 * Math.sin(_tickT * 1.2 + ph * 1.7);
    /* nhún: đi thì theo nhịp bước 150ms đồng bộ với nghiêng, đứng thì idle thở */
    var _wStep = moving ? (Math.floor(Date.now() / 150) % 2) : -1;
    var walkTilt = _npcWalkTilt(moving, Date.now()); /* ±4° luân phiên khi đi, 0 khi đứng */
    var bob = moving ? (_wStep === 0 ? 3 : 1)
                     : Math.sin(_tickT * 2 + ph) * 2;
    var lean = n.lean || 0, squash = 1;
    /* cúi chào khi người chơi lại gần */
    if (n.greetT > 0) {
      var gp = 1 - n.greetT / 0.9;
      var bowAmt = Math.sin(gp * Math.PI);
      lean += 0.3 * bowAmt;
      squash = 1 - 0.07 * bowAmt;
    }
    /* đang nói chuyện: gật gù nhẹ */
    var talking = Engine.talkNpcId && Engine.talkNpcId === n.npcId;
    if (talking) lean += 0.06 + 0.04 * Math.sin(_tickT * 7);
    /* animation nghề nghiệp */
    var kind = n.def.kind;
    var hammerAng = null, wiping = false;
    if (kind === 'forge') {
      /* thợ rèn: chu kỳ 2.4s — giơ búa → đập → tia lửa */
      var cyc = (n.workT || 0) % 2.4;
      if (cyc < 1.5) hammerAng = -0.9 + (cyc / 1.5) * 0.5;       /* giơ dần */
      else if (cyc < 1.75) {                                     /* ĐẬP */
        hammerAng = 0.55;
        lean += 0.16; squash = 0.96;
        if (!n._struck) {
          n._struck = true;
          _burst(n.x + 20, n.y - 8, 7, '#ffcf5a');               /* tia lửa */
          _burst(n.x + 20, n.y - 8, 3, '#ff9a3d');
        }
      } else { hammerAng = -0.9; n._struck = false; }             /* nghỉ */
    } else if (kind === 'inn') {
      /* tiểu nhị: lau bàn — đung đưa + khăn tròn */
      wiping = true;
      lean += 0.1 + 0.05 * Math.sin(_tickT * 3 + ph);
    }

    var drawX = n.x + (wiping ? Math.sin(_tickT * 3 + ph) * 7 : 0);
    /* bóng đổ lệch ngược hướng nghiêng */
    var shOff = -(lean * 90);
    /* NPC dùng chung CHAR_DRAW_H với người chơi — đồng bộ cỡ (Bui 2026-10-20).
       Chỉ phóng to rất nhẹ khi người chơi đến gần (tối đa +3% ≈ 2px) cho cảm giác 3D.
       Rộng suy từ tỉ lệ ảnh gốc để không méo hình. */
    var _npcBase = CHAR_DRAW_H;
    var _nd = Math.hypot(player.x - n.x, player.y - n.y);
    var _nprox = 1 + 0.03 * Math.max(0, 1 - _nd / 220);
    var _nsz = _npcBase * _nprox;
    var _nw = _nsz;
    var _nim = _img(n.def.img);
    if (_nim && _nim.width && _nim.height) _nw = _nsz * (_nim.width / _nim.height);
    _drawCreature(n, drawX, n.y - bob, _nw, _nsz, n.def.img, '#6b4a2f',
      { lean: lean + swayRot + walkTilt, flip: (n.face || 1) < 0, shadowOffX: shOff,
        scaleY: breathe * squash });

    /* búa của thợ rèn (vẽ procedural, xoay theo nhịp đập) */
    if (hammerAng != null) {
      _ctx.save();
      _ctx.translate(drawX + 20, n.y - 34 - bob);
      _ctx.rotate(hammerAng);
      _ctx.fillStyle = '#7a5230';
      _ctx.fillRect(-2, 0, 4, 26);            /* cán */
      _ctx.fillStyle = '#9aa2ad';
      _ctx.fillRect(-9, -8, 18, 10);          /* đầu búa */
      _ctx.restore();
      /* đe: khối nhỏ trước mặt */
      _ctx.fillStyle = '#5a5f6a';
      _ctx.fillRect(drawX + 12, n.y + 8, 18, 10);
    }
    /* khăn lau của tiểu nhị */
    if (wiping) {
      var cx = drawX + Math.sin(_tickT * 3 + ph) * 9;
      var cy = n.y - 10 + Math.cos(_tickT * 6 + ph) * 3 - bob;
      _ctx.fillStyle = 'rgba(240,244,248,0.9)';
      _ctx.beginPath(); _ctx.ellipse(cx, cy, 7, 5, 0.4, 0, Math.PI * 2); _ctx.fill();
    }
    /* bong bóng thoại khi đang nói chuyện */
    if (talking) {
      var bb = Math.abs(Math.sin(_tickT * 5)) * 4;
      _ctx.font = '17px sans-serif'; _ctx.textAlign = 'center';
      _ctx.fillText('💬', drawX + 20, n.y - 54 - bob - bb);
    }
    // dấu "!" trên đầu NPC có nhiệm vụ/chức năng mới
    var k = kind;
    if (k === 'quest' || k === 'guide' || k === 'sect_emissary' ||
        k === 'pet' || k === 'dungeon_guide' || k === 'gacha') {
      var hop = Math.sin(_tickT * 4 + ph) * 2;
      _ctx.fillStyle = '#ffeb3b';
      _ctx.font = 'bold 16px sans-serif';
      _ctx.textAlign = 'center';
      _ctx.fillText('!', drawX, n.y - 30 - bob + hop);
    }
  }

/* ===== THỰC VẬT ĐỘNG (cỏ đung đưa, hoa, lá rơi) — Bui 2026-10-18 =====
   * Layer vẽ sau nền map, trước entities. Chỉ map ngoài trời.
   * Cỏ/hoa vẽ procedural bằng canvas (không cần ảnh), đung đưa theo gió (sin).
   * Lá rơi là particle tái chế, giới hạn theo GFX_LEVELS. */
  var _veg = [];            /* {x,y,type,phase,scale,hue} */
  var _vegMapId = -1;
  var _vegLeaves = [];      /* {x,y,vx,vy,rot,vr,life,maxLife,color,size} */
  /* Map ngoài trời có thảm thực vật (map 5 Mỏ Linh Thạch là hang → không) */
  var VEG_OUTDOOR = { 1: 1, 2: 1, 3: 1, 4: 1, 6: 1, 7: 1, 8: 1, 9: 1, 10: 1, 11: 1, 12: 1, 13: 1, 14: 1 };

  function _vegGen() {
    _veg = []; _vegLeaves = [];
    var mid = _mapDef ? _mapDef.id : 0;
    _vegMapId = mid;
    if (!VEG_OUTDOOR[mid]) return;
    var lvl = GFX_LEVELS[_gfxLevel] || GFX_LEVELS.cao;
    var dens = lvl.particle; /* 0 / 0.5 / 1 */
    if (dens <= 0) return;
    var W = 1600, H = 1200; /* world mặc định */
    try {
      if (_mapDef && _mapDef.w) W = _mapDef.w;
      if (_mapDef && _mapDef.h) H = _mapDef.h;
    } catch (e) {}
    var count = Math.round((W * H / 32000) * dens);
    if (count > 140) count = 140;
    for (var i = 0; i < count; i++) {
      var r = Math.random();
      _veg.push({
        x: 40 + Math.random() * (W - 80),
        y: 40 + Math.random() * (H - 80),
        type: r < 0.78 ? 'grass' : (r < 0.92 ? 'flower' : 'bush'),
        phase: Math.random() * 6.283,
        scale: 0.7 + Math.random() * 0.7,
        hue: Math.random()
      });
    }
    /* khởi tạo lá rơi */
    var leafN = Math.round(14 * dens);
    for (var j = 0; j < leafN; j++) _vegSpawnLeaf(true);
  }

  function _vegSpawnLeaf(anywhere) {
    var lvl = GFX_LEVELS[_gfxLevel] || GFX_LEVELS.cao;
    if (lvl.particle <= 0) return;
    var cam = _camera();
    /* Bui 2026-10-22: spawn lá trong vùng zoom đang nhìn */
    var _vrL = _visRect();
    var W = 1600, H = 1200;
    try {
      if (_mapDef && _mapDef.w) W = _mapDef.w;
      if (_mapDef && _mapDef.h) H = _mapDef.h;
    } catch (e) {}
    var cols = ['#7cb342', '#aed581', '#c0ca33', '#9ccc65', '#d4a017'];
    _vegLeaves.push({
      x: anywhere ? Math.random() * W : _vrL.x + Math.random() * _vrL.w,
      y: anywhere ? Math.random() * H : _vrL.y - 20,
      vx: 18 + Math.random() * 26,
      vy: 22 + Math.random() * 30,
      rot: Math.random() * 6.283,
      vr: (Math.random() - 0.5) * 4,
      life: 0,
      maxLife: 7 + Math.random() * 5,
      color: cols[Math.floor(Math.random() * cols.length)],
      size: 3 + Math.random() * 3
    });
  }

  function _vegDrawGrass(x, y, sway, s, hue) {
    var g = 95 + Math.floor(hue * 45);
    _ctx.strokeStyle = 'rgb(46,' + g + ',58)';
    _ctx.lineWidth = Math.max(1, 2 * s);
    _ctx.lineCap = 'round';
    for (var b = -2; b <= 2; b++) {
      var bx = b * 3.2 * s;
      var h = (11 + Math.abs(b * 2.4) + hue * 7) * s;
      var tipX = bx + sway * (0.35 + Math.abs(b) * 0.22);
      _ctx.beginPath();
      _ctx.moveTo(bx, 0);
      _ctx.quadraticCurveTo(bx + sway * 0.5, -h * 0.62, tipX, -h);
      _ctx.stroke();
    }
  }

  function _vegDrawFlower(x, y, sway, s, hue) {
    _vegDrawGrass(x, y, sway, s * 0.7, hue);
    var petals = ['#ef5350', '#ec407a', '#ab47bc', '#ffa726', '#ffee58'];
    var c = petals[Math.floor(hue * petals.length) % petals.length];
    var fx = x + sway, fy = y - 14 * s;
    _ctx.fillStyle = c;
    for (var p = 0; p < 5; p++) {
      var a = p / 5 * 6.283 + sway * 0.05;
      _ctx.beginPath();
      _ctx.arc(fx + Math.cos(a) * 3.4 * s, fy + Math.sin(a) * 3.4 * s, 2.4 * s, 0, 6.283);
      _ctx.fill();
    }
    _ctx.fillStyle = '#ffeb3b';
    _ctx.beginPath(); _ctx.arc(fx, fy, 2 * s, 0, 6.283); _ctx.fill();
  }

  function _vegDrawBush(x, y, sway, s, hue) {
    /* bụi cây nhỏ: 3 tán tròn đung đưa nhẹ */
    var g = 80 + Math.floor(hue * 40);
    for (var k = 0; k < 3; k++) {
      var ox = (k - 1) * 9 * s + sway * (0.4 + k * 0.15);
      var oy = -8 * s - (k % 2) * 6 * s;
      var r = (8 - Math.abs(k - 1) * 2) * s;
      _ctx.fillStyle = 'rgb(52,' + (g + k * 8) + ',62)';
      _ctx.beginPath(); _ctx.arc(x + ox, y + oy, r, 0, 6.283); _ctx.fill();
      _ctx.fillStyle = 'rgba(255,255,255,0.12)';
      _ctx.beginPath(); _ctx.arc(x + ox - r * 0.3, y + oy - r * 0.3, r * 0.45, 0, 6.283); _ctx.fill();
    }
  }

  /* Bui 2026-10-22: đường đi/lối đi — tile lát dọc đoạn thẳng, dưới nhân vật, đi xuyên được */
  function _drawPaths() {
    var paths = _mapDef && _mapDef.paths;
    if (!paths || !paths.length) return;
    var cam = _camera();
    var _vrP = _visRect(); /* Bui 2026-10-22: culling theo vùng zoom */
    var TS = 90; /* kích thước tile đường */
    for (var i = 0; i < paths.length; i++) {
      var p = paths[i];
      var img = _img('assets/objects/' + p.tile + '.png');
      if (!img) continue;
      var dx = p.x2 - p.x1, dy = p.y2 - p.y1;
      var len = Math.hypot(dx, dy);
      if (len < 1) continue;
      var ux = dx / len, uy = dy / len;
      var ang = Math.atan2(dy, dx);
      var steps = Math.ceil(len / TS);
      for (var s = 0; s < steps; s++) {
        var cx = p.x1 + ux * (s * TS + TS / 2);
        var cy = p.y1 + uy * (s * TS + TS / 2);
        /* culling theo camera */
        if (cx < _vrP.x - TS || cx > _vrP.x + _vrP.w + TS ||
            cy < _vrP.y - TS || cy > _vrP.y + _vrP.h + TS) continue;
        _ctx.save();
        _ctx.translate(cx, cy);
        _ctx.rotate(ang);
        _ctx.drawImage(img, -TS / 2, -TS / 2, TS, TS);
        _ctx.restore();
      }
    }
  }
  function _vegDraw() {
    var mid = _mapDef ? _mapDef.id : 0;
    if (_vegMapId !== mid) _vegGen();
    if (!_veg.length && !_vegLeaves.length) return;
    var cam = _camera();
    var _vrV = _visRect(); /* Bui 2026-10-22: culling theo vùng zoom */
    var t = _tickT;
    var x0 = _vrV.x - 40, x1 = _vrV.x + _vrV.w + 40;
    var y0 = _vrV.y - 40, y1 = _vrV.y + _vrV.h + 40;
    _ctx.save();
    for (var i = 0; i < _veg.length; i++) {
      var v = _veg[i];
      if (v.x < x0 || v.x > x1 || v.y < y0 || v.y > y1) continue;
      var sway = Math.sin(t * 1.9 + v.phase) * 3.2 * v.scale
              + Math.sin(t * 3.7 + v.phase * 2.3) * 1.1 * v.scale;
      if (v.type === 'grass') _vegDrawGrass(v.x, v.y, sway, v.scale, v.hue);
      else if (v.type === 'flower') _vegDrawFlower(v.x, v.y, sway, v.scale, v.hue);
      else _vegDrawBush(v.x, v.y, sway, v.scale, v.hue);
    }
    _ctx.restore();
    /* lá rơi: cập nhật + vẽ (trong world space) */
    var lvl = GFX_LEVELS[_gfxLevel] || GFX_LEVELS.cao;
    if (lvl.particle > 0) {
      var dt = 0.016;
      for (var j = _vegLeaves.length - 1; j >= 0; j--) {
        var L = _vegLeaves[j];
        L.life += dt;
        L.x += (L.vx + Math.sin(t * 2 + L.rot) * 14) * dt;
        L.y += L.vy * dt;
        L.rot += L.vr * dt;
        if (L.life > L.maxLife || L.y > _vrV.y + _vrV.h + 30) {
          _vegLeaves.splice(j, 1);
          _vegSpawnLeaf(false);
          continue;
        }
        if (L.x < x0 || L.x > x1 || L.y < y0 || L.y > y1) continue;
        var fade = Math.min(1, (L.maxLife - L.life) / 1.5, L.life / 0.5 + 0.2);
        _ctx.save();
        _ctx.translate(L.x, L.y);
        _ctx.rotate(L.rot);
        _ctx.globalAlpha = Math.max(0, Math.min(1, fade)) * 0.85;
        _ctx.fillStyle = L.color;
        _ctx.beginPath();
        _ctx.ellipse(0, 0, L.size, L.size * 0.55, 0, 0, 6.283);
        _ctx.fill();
        _ctx.restore();
      }
    }
  }

  function _render() {
    if (!_ctx) return;
    var lvl = GFX_LEVELS[_gfxLevel] || GFX_LEVELS.cao;
    var W = _viewW, H = _viewH;

    var cam = _camera();
    // Nền map kiểu tutien2d: tile lát lặp lại khóa theo camera + art parallax làm atmosphere
    var ground = _mapDef ? _mapDef.ground : null;
    var tile = ground ? _img(ground) : null;
    /* Bui 2026-10-20: tilemap tutien2d tiền-render (assets/maps/tilemap/map_<id>.png),
       vẽ đúng 1 ảnh/frame — ưu tiên hơn tile lát cũ, giữ nguyên fallback */
    /* Build 94: map có tilemap ASCII (hiện chỉ map 0) thì bỏ qua nền PNG
     * cũ — nền tilemap được vẽ ở pass world bên dưới (sau transform
     * camera/zoom, vì Tilemap.draw nhận tọa độ world). */
    var _hasTilemap = false;
    try { _hasTilemap = (typeof Tilemap !== 'undefined' && Tilemap.get && Tilemap.get(_mapId) !== null); } catch (_e) {}
    var _tmSrc = (_mapDef && typeof _mapId === 'number') ? ('assets/maps/tilemap/map_' + _mapId + '.png') : null;
    var _tm = _tmSrc ? _img(_tmSrc) : null;
    if (!_hasTilemap && _tm) {
      /* Bui 2026-10-22: vùng nền theo zoom — phóng to/thu nhỏ đúng vùng đang nhìn */
      var _vr0 = _visRect();
      _ctx.drawImage(_tm, _vr0.x, _vr0.y, _vr0.w, _vr0.h, 0, 0, W, H);
      _drawMist(W, H);
      _ctx.fillStyle = 'rgba(255,255,255,0.75)';
      _ctx.font = '12px sans-serif';
      _ctx.textAlign = 'right';
      _ctx.fillText('Khu ' + _khuOf(player.x, player.y), W - 12, 20);
    } else if (!_hasTilemap && tile) {
      var TS = 256; /* kích thước tile world */
      /* Bui 2026-10-22: tile lát theo vùng zoom — screen = (world - vr) * z */
      var _vr1 = _visRect(), _z1 = _mapZoom || 1;
      var sx = Math.floor(_vr1.x / TS) * TS, sy = Math.floor(_vr1.y / TS) * TS;
      var tx, ty;
      for (ty = sy; ty < _vr1.y + _vr1.h; ty += TS) {
        for (tx = sx; tx < _vr1.x + _vr1.w; tx += TS) {
          _ctx.drawImage(tile, (tx - _vr1.x) * _z1, (ty - _vr1.y) * _z1, TS * _z1, TS * _z1);
        }
      }
      /* đường viền tile mờ như video tutien2d */
      _ctx.strokeStyle = 'rgba(0,0,0,0.14)';
      _ctx.lineWidth = 1;
      _ctx.beginPath();
      for (tx = sx; tx <= _vr1.x + _vr1.w; tx += TS) { var _lx = (tx - _vr1.x) * _z1; _ctx.moveTo(_lx, 0); _ctx.lineTo(_lx, H); }
      for (ty = sy; ty <= _vr1.y + _vr1.h; ty += TS) { var _ly = (ty - _vr1.y) * _z1; _ctx.moveTo(0, _ly); _ctx.lineTo(W, _ly); }
      _ctx.stroke();
      /* art đẹp làm lớp atmosphere parallax mờ phía trên tile */
      var bgA = _mapDef ? _mapDef.bg : null;
      var imA = _img(bgA);
      if (imA) {
        _ctx.save();
        _ctx.globalAlpha = 0.20;
        var s = Math.max(W / imA.width, H / imA.height) * 1.15;
        var dw = imA.width * s, dh = imA.height * s;
        var maxOx = Math.max(0, (dw - W) / 2), maxOy = Math.max(0, (dh - H) / 2);
        var ox = (W - dw) / 2 - Math.max(-maxOx, Math.min(maxOx, cam.x * 0.3));
        var oy = (H - dh) / 2 - Math.max(-maxOy, Math.min(maxOy, cam.y * 0.3));
        _ctx.drawImage(imA, ox, oy, dw, dh);
        _ctx.restore();
      }
      _drawMist(W, H);
      /* nhãn khu hiện tại (lưới tọa độ ngầm) */
      _ctx.fillStyle = 'rgba(255,255,255,0.75)';
      _ctx.font = '12px sans-serif';
      _ctx.textAlign = 'right';
      _ctx.fillText('Khu ' + _khuOf(player.x, player.y), W - 12, 20);
    } else if (!_hasTilemap) {
    _ctx.fillStyle = (_mapDef && _mapDef.fb) || '#222';
    _ctx.fillRect(0, 0, W, H);
    var bg = _mapDef ? _mapDef.bg : null;
    var im = _img(bg);
    if (im) {
      var s = Math.max(W / im.width, H / im.height) * 1.15; /* overscan cho parallax */
      var dw = im.width * s, dh = im.height * s;
      var maxOx = Math.max(0, (dw - W) / 2), maxOy = Math.max(0, (dh - H) / 2);
      var ox = (W - dw) / 2 - Math.max(-maxOx, Math.min(maxOx, cam.x * 0.3));
      var oy = (H - dh) / 2 - Math.max(-maxOy, Math.min(maxOy, cam.y * 0.3));
      _ctx.drawImage(im, ox, oy, dw, dh);
      _drawMist(W, H); /* lớp sương mù trôi */
    } else {
      _ctx.fillStyle = '#f3e9d2';
      _ctx.font = '14px sans-serif';
      _ctx.textAlign = 'center';
      _ctx.fillText(_mapName(), W / 2, 30);
    }
    }

    /* Build 94: map tilemap cũng giữ sương mù + nhãn khu như nhánh PNG */
    if (_hasTilemap) {
      _drawMist(W, H);
      _ctx.fillStyle = 'rgba(255,255,255,0.75)';
      _ctx.font = '12px sans-serif';
      _ctx.textAlign = 'right';
      _ctx.fillText('Khu ' + _khuOf(player.x, player.y), W - 12, 20);
    }

    /* Bui 2026-10-22: zoom map — scale quanh tâm màn hình, điểm đang nhìn giữ nguyên giữa */
    _ctx.save();
    _ctx.translate(_viewW / 2, _viewH / 2);
    _ctx.scale(_mapZoom, _mapZoom);
    _ctx.translate(-(cam.x + _viewW / 2), -(cam.y + _viewH / 2));

    /* Build 94: nền tilemap ASCII (tọa độ world — transform đã áp).
     * Tilemap.draw trả true -> nền tilemap đã vẽ, bỏ qua PNG (đã chặn
     * ở pass nền trên); false -> map chưa có tilemap, giữ nguyên PNG. */
    var _tilemapDrawn = false;
    try { if (typeof Tilemap !== 'undefined' && Tilemap.draw) _tilemapDrawn = !!Tilemap.draw(_ctx, _mapId, _visRect(), _mapZoom || 1); } catch (_e) {}
    if (_tilemapDrawn) {
      /* Ambient: phủ toàn vùng đang nhìn bằng màu của map */
      try {
        var _amb = (typeof Tilemap !== 'undefined' && Tilemap.ambient) ? Tilemap.ambient(_mapId) : null;
        if (_amb) { var _vrA = _visRect(); _ctx.fillStyle = _amb; _ctx.fillRect(_vrA.x, _vrA.y, _vrA.w, _vrA.h); }
      } catch (_e) {}
      /* Nhãn cổng tilemap: chữ nhỏ, nền mờ, phía trên ô cổng.
       * Chỉ thêm hiển thị — logic teleport vẫn dùng _gates (data.js). */
      try {
        var _tmDef = (typeof Tilemap !== 'undefined' && Tilemap.get) ? Tilemap.get(_mapId) : null;
        var _tmGates = (_tmDef && _tmDef.gates) || [];
        for (var _tgi = 0; _tgi < _tmGates.length; _tgi++) {
          var _tg2 = _tmGates[_tgi];
          if (!_tg2.label) continue;
          var _tcx = (typeof _tg2.x === 'number') ? _tg2.x : ((_tg2.col || 0) * 40 + 20);
          var _tcy = (typeof _tg2.y === 'number') ? _tg2.y : ((_tg2.row || 0) * 40 + 20);
          /* Cổng nhỏ lại ~35% (Bui 2026-10-25): chỉ đổi hiển thị, không đổi logic. */
          _ctx.font = '8px sans-serif';
          _ctx.textAlign = 'center';
          var _tw = _ctx.measureText(_tg2.label).width + 8;
          _ctx.fillStyle = 'rgba(20,14,8,0.72)';
          _ctx.fillRect(_tcx - _tw / 2, _tcy - 52, _tw, 12);
          _ctx.fillStyle = '#ffe9a8';
          _ctx.fillText(_tg2.label, _tcx, _tcy - 43);
        }
      } catch (_e) {}
    }

    // Cổng chuyển map — nhỏ lại ~35% (Bui 2026-10-25). Chỉ đổi hiển thị:
    // vị trí, đích, tầm kích hoạt (GATE_RANGE) và vùng bấm giữ nguyên.
    for (var gi = 0; gi < _gates.length; gi++) {
      var g = _gates[gi];
      _ctx.strokeStyle = '#2fa3a0';
      _ctx.lineWidth = 3;
      _ctx.beginPath(); _ctx.arc(g.x, g.y, 17, 0, Math.PI * 2); _ctx.stroke();
      _ctx.strokeStyle = 'rgba(47,163,160,0.4)';
      _ctx.lineWidth = 5;
      _ctx.beginPath(); _ctx.arc(g.x, g.y, 21, 0, Math.PI * 2); _ctx.stroke();
    }
    /* Bui 2026-10-18: tên map đích trên cổng — rõ ràng (nhãn nhỏ lại ~35% cùng cổng) */
    try {
      for (var _gli = 0; _gli < _gates.length; _gli++) {
        var _gg = _gates[_gli];
        var _gmd = _mapDefOf(_gg.to);
        if (!_gmd) continue;
        var _gname = _t(_gmd.nameKey || ('map_' + _gg.to));
        _ctx.font = 'bold 9px sans-serif';
        _ctx.textAlign = 'center';
        var _gw = _ctx.measureText(_gname).width + 10;
        _ctx.fillStyle = 'rgba(20,14,8,0.82)';
        _ctx.fillRect(_gg.x - _gw / 2, _gg.y - 38, _gw, 14);
        _ctx.strokeStyle = '#ffd76a'; _ctx.lineWidth = 1;
        _ctx.strokeRect(_gg.x - _gw / 2, _gg.y - 38, _gw, 14);
        _ctx.fillStyle = '#ffe9a8';
        _ctx.fillText('➤ ' + _gname, _gg.x, _gg.y - 27);
      }
    } catch (_ge) {}

    /* Đường đi/lối đi — sau nền, trước entities (Bui 2026-10-22) */
    _drawPaths();

    /* Lớp thực vật động (cỏ đung đưa, hoa, lá rơi) — sau nền, trước entities */
    _vegDraw();

    // Entities xếp theo y (trên-dưới): quái, NPC, pet, người chơi — pseudo-3D Y-sort
    // (trừ lift cầu: đứng trên cầu thì sort theo mặt cầu)
    var ents = [];
    for (var mi = 0; mi < _monsters.length; mi++) {
      if (_monsters[mi].dead && !(_monsters[mi].dieT > 0)) continue;
      ents.push({ y: _monsters[mi].y - _bridgeLiftAt(_monsters[mi].x, _monsters[mi].y), k: 'm', o: _monsters[mi] });
    }
    for (var ni = 0; ni < _npcs.length; ni++) ents.push({ y: _npcs[ni].y - _bridgeLiftAt(_npcs[ni].x, _npcs[ni].y), k: 'n', o: _npcs[ni] });
    for (var oi2 = 0; oi2 < _objects.length; oi2++) ents.push({ y: _objects[oi2].y, k: 'obj', o: _objects[oi2] });
    /* Bui 2026-10-22: ô đất linh điền hiện trực tiếp trên map 3 */
    if (_mapId === 3 && typeof Farm !== "undefined") {
      try {
        var _ff = (typeof _S === "function" ? _S().farm : null) || { unlocked: 6, plots: [] };
        var _now = Date.now();
        for (var _pi2 = 0; _pi2 < _ff.unlocked && _pi2 < 18; _pi2++) {
          var _pst = Farm.plotStatus(_S(), _pi2, _now);
          var _pimg = "assets/objects/plot_empty.png";
          if (_pst.phase === "growing") _pimg = "assets/objects/" + (_pst.pct < 33 ? "plot_sprout.png" : "plot_growing.png");
          else if (_pst.phase === "ready") _pimg = "assets/objects/plot_ready.png";
          else if (_pst.phase === "need_till") _pimg = "assets/objects/plot_empty.png";
          /* lưới 6x3 ô, mỗi ô 110px */
          var _px = 550 + (_pi2 % 6) * 110, _py = 650 + Math.floor(_pi2 / 6) * 110;
          ents.push({ y: _py, k: 'farmplot', o: { x: _px, y: _py, sprite: _pimg, w: 100, h: 100, plotIdx: _pi2 } });
        }
      } catch (_fe) {}
    }
    ents.push({ y: player.y - _bridgeLiftAt(player.x, player.y), k: 'p' });
    if (_petActive()) ents.push({ y: _pet.y - _bridgeLiftAt(_pet.x, _pet.y), k: 't' });
    if (_sbActive()) ents.push({ y: _sb.y - _bridgeLiftAt(_sb.x, _sb.y), k: 'sb' });
    var others = _visiblePlayers();
    for (var oi = 0; oi < others.length; oi++) ents.push({ y: others[oi].y - _bridgeLiftAt(others[oi].x, others[oi].y), k: 'o', o: others[oi] });
    ents.sort(function (a, b) { return a.y - b.y; });
    for (var ei = 0; ei < ents.length; ei++) {
      var e = ents[ei];
      if (e.k === 'm') _drawMonster(e.o);
      else if (e.k === 'p') _drawPlayer();
      else if (e.k === 'n') _drawNpc(e.o);
      else if (e.k === 't') _drawPet();
      else if (e.k === 'sb') _drawSpiritBeast();
      else if (e.k === 'obj') _drawObject(e.o);
      else if (e.k === 'farmplot') _drawFarmPlot(e.o);
      else _drawOther(e.o);
    }
    /* Đạn skill thần thú đồng hành — bay trên entities */
    _drawSbProjs();

    // Hiệu ứng skill: vòng tròn xung theo hệ + chiêu thức
    for (var fi = 0; fi < _fx.length; fi++) {
      var f = _fx[fi];
      var alpha = Math.max(0, f.t / f.maxT);
      _ctx.globalAlpha = alpha;
      if (lvl.shadows) { _ctx.shadowBlur = 12; _ctx.shadowColor = f.color; }
      var kind = f.kind || 'ring';
      if (kind === 'slash') {
        /* nhát chém vòng cung trắng/hồng */
        _ctx.strokeStyle = f.color;
        _ctx.lineWidth = 5;
        var pr = 1 - f.t / f.maxT;
        _ctx.beginPath();
        _ctx.arc(f.x, f.y, f.r, -0.6 + pr * 1.2, 1.4 + pr * 1.2);
        _ctx.stroke();
        _ctx.lineWidth = 2;
        _ctx.strokeStyle = '#ffffff';
        _ctx.beginPath();
        _ctx.arc(f.x, f.y, f.r * 0.8, -0.6 + pr * 1.2, 1.4 + pr * 1.2);
        _ctx.stroke();
      } else if (kind === 'wslash_h') {
        /* Kiếm trang phục: chém ngang — vệt sáng ngang theo hướng */
        var wpr = 1 - f.t / f.maxT;
        var wd = f.dir || 1;
        _ctx.strokeStyle = f.color;
        _ctx.lineWidth = 6;
        _ctx.beginPath();
        _ctx.moveTo(f.x - wd * 70, f.y - 20 + wpr * 10);
        _ctx.quadraticCurveTo(f.x, f.y - 30, f.x + wd * 70, f.y - 10 + wpr * 10);
        _ctx.stroke();
        _ctx.lineWidth = 2;
        _ctx.strokeStyle = '#ffffff';
        _ctx.beginPath();
        _ctx.moveTo(f.x - wd * 60, f.y - 14 + wpr * 8);
        _ctx.quadraticCurveTo(f.x, f.y - 22, f.x + wd * 60, f.y - 6 + wpr * 8);
        _ctx.stroke();
      } else if (kind === 'wslash_fan') {
        /* Quạt trang phục: sóng gió lan hình quạt */
        var fpr = 1 - f.t / f.maxT;
        var fd = f.dir || 1;
        for (var wi = 0; wi < 3; wi++) {
          var wr = 20 + fpr * 70 + wi * 18;
          var wa0 = fd > 0 ? -0.7 : Math.PI - 0.7;
          var wa1 = fd > 0 ? 0.7 : Math.PI + 0.7;
          _ctx.strokeStyle = f.color;
          _ctx.lineWidth = 4 - wi;
          _ctx.beginPath();
          _ctx.arc(f.x, f.y, wr, wa0, wa1);
          _ctx.stroke();
        }
      } else if (kind === 'wslash_v') {
        /* Thương/Đao trang phục: đâm thẳng / chém dọc */
        var vpr = 1 - f.t / f.maxT;
        var vd = f.dir || 1;
        _ctx.strokeStyle = f.color;
        _ctx.lineWidth = 6;
        _ctx.beginPath();
        if (f.vert) {
          /* đao: vệt dọc */
          _ctx.moveTo(f.x + vd * 20, f.y - 60);
          _ctx.lineTo(f.x + vd * (20 + vpr * 30), f.y + 30);
        } else {
          /* thương: tia đâm ngang */
          _ctx.moveTo(f.x, f.y - 10);
          _ctx.lineTo(f.x + vd * (40 + vpr * 80), f.y - 10);
        }
        _ctx.stroke();
        _ctx.lineWidth = 2;
        _ctx.strokeStyle = '#ffffff';
        _ctx.beginPath();
        if (f.vert) {
          _ctx.moveTo(f.x + vd * 26, f.y - 50);
          _ctx.lineTo(f.x + vd * (26 + vpr * 26), f.y + 20);
        } else {
          _ctx.moveTo(f.x + vd * 10, f.y - 6);
          _ctx.lineTo(f.x + vd * (40 + vpr * 70), f.y - 6);
        }
        _ctx.stroke();
      } else if (kind === 'fire') {
        /* vụ nổ lửa cam */
        var grad = _ctx.createRadialGradient(f.x, f.y, 2, f.x, f.y, f.r);
        grad.addColorStop(0, '#fff3b0');
        grad.addColorStop(0.5, f.color);
        grad.addColorStop(1, 'rgba(255,60,0,0)');
        _ctx.fillStyle = grad;
        _ctx.beginPath(); _ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); _ctx.fill();
      } else if (kind === 'lightning') {
        /* sét tím đánh xuống */
        _ctx.strokeStyle = f.color;
        _ctx.lineWidth = 4;
        for (var li = 0; li < 3; li++) {
          var lx = f.x + (li - 1) * 26;
          _ctx.beginPath();
          _ctx.moveTo(lx, f.y - 130);
          var yy = f.y - 130, xx = lx;
          for (var sgi = 0; sgi < 5; sgi++) {
            xx += (Math.random() - 0.5) * 36; yy += 30;
            _ctx.lineTo(xx, yy);
          }
          _ctx.stroke();
        }
        _ctx.fillStyle = 'rgba(179,136,255,0.35)';
        _ctx.beginPath(); _ctx.arc(f.x, f.y, 60, 0, Math.PI * 2); _ctx.fill();
      } else if (kind === 'circle') {
        /* trận pháp vòng tròn xanh xoay */
        var rot = (1 - f.t / f.maxT) * Math.PI * 2;
        _ctx.strokeStyle = f.color;
        _ctx.lineWidth = 3;
        _ctx.beginPath(); _ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); _ctx.stroke();
        _ctx.lineWidth = 2;
        for (var ci = 0; ci < 8; ci++) {
          var a = rot + ci * Math.PI / 4;
          _ctx.beginPath();
          _ctx.moveTo(f.x + Math.cos(a) * f.r * 0.55, f.y + Math.sin(a) * f.r * 0.55);
          _ctx.lineTo(f.x + Math.cos(a) * f.r * 0.95, f.y + Math.sin(a) * f.r * 0.95);
          _ctx.stroke();
        }
        _ctx.fillStyle = f.color;
        _ctx.beginPath(); _ctx.arc(f.x, f.y, 6, 0, Math.PI * 2); _ctx.fill();
      } else if (kind === 'breath') {
        /* chùm độc/lửa hình nón lan ra */
        var bpr = 1 - f.t / f.maxT;
        _ctx.save();
        _ctx.translate(f.x, f.y); _ctx.rotate(f.ang);
        var blen = (60 + bpr * 130) * (f.inten || 1);
        var bgrad = _ctx.createLinearGradient(0, 0, blen, 0);
        bgrad.addColorStop(0, f.color);
        bgrad.addColorStop(1, 'rgba(255,255,255,0)');
        _ctx.fillStyle = bgrad;
        _ctx.beginPath();
        _ctx.moveTo(0, -8); _ctx.lineTo(blen, -blen * 0.35);
        _ctx.lineTo(blen, blen * 0.35); _ctx.lineTo(0, 8);
        _ctx.closePath(); _ctx.fill();
        _ctx.restore();
      } else if (kind === 'rain') {
        /* mưa sét: 6 tia đánh xuống quanh điểm */
        var rpr = f.t / f.maxT;
        _ctx.strokeStyle = f.color; _ctx.lineWidth = 4;
        _ctx.globalAlpha = alpha * (0.4 + 0.6 * rpr);
        for (var ri = 0; ri < 6; ri++) {
          var rx = f.x + ((ri * 53) % 140) - 70;
          _ctx.beginPath();
          _ctx.moveTo(rx, f.y - 150);
          var _yy = f.y - 150, _xx = rx;
          for (var rj = 0; rj < 5; rj++) {
            _xx += (Math.random() - 0.5) * 30; _yy += 32;
            _ctx.lineTo(_xx, _yy);
          }
          _ctx.stroke();
        }
        _ctx.globalAlpha = alpha;
        _ctx.fillStyle = 'rgba(179,136,255,0.25)';
        _ctx.beginPath(); _ctx.arc(f.x, f.y, 90, 0, Math.PI * 2); _ctx.fill();
      } else if (kind === 'bolt') {
        /* đạn kiếm khí bay */
        var ang = Math.atan2(f.ty - f.y, f.tx - f.x);
        _ctx.save();
        _ctx.translate(f.x, f.y);
        _ctx.rotate(ang);
        var blen = 34;
        var bgrad = _ctx.createLinearGradient(-blen, 0, 6, 0);
        bgrad.addColorStop(0, 'rgba(255,255,255,0)');
        bgrad.addColorStop(1, f.color);
        _ctx.fillStyle = bgrad;
        _ctx.fillRect(-blen, -4, blen + 6, 8);
        _ctx.fillStyle = '#ffffff';
        _ctx.fillRect(-8, -2, 12, 4);
        _ctx.restore();
      } else if (kind === 'sprite20') {
        /* Build 98: frame FX sprite 20 frame (SKILL_FX), mờ dần cuối chuỗi (alpha chung) */
        var frs = f.frames || [];
        if (frs.length) {
          var fp = 1 - Math.max(0, f.t / f.maxT);
          var fi = Math.min(frs.length - 1, Math.floor(fp * frs.length));
          var fim = _img(frs[fi]);
          if (fim && fim.width) {
            var sz = f.size || 120;
            _ctx.drawImage(fim, f.x - sz / 2, f.y - sz / 2, sz, sz);
          }
        }
      } else if (f.dot) {
        _ctx.fillStyle = f.color;
        _ctx.fillRect(f.x - 2, f.y - 2, 4, 4);
      } else {
        _ctx.strokeStyle = f.color;
        _ctx.lineWidth = 3;
        _ctx.beginPath(); _ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); _ctx.stroke();
      }
      _ctx.shadowBlur = 0;
      _ctx.globalAlpha = 1;
    }

    /* Vòng tròn đỏ báo AoE boss */
    for (var ti = 0; ti < _bossTele.length; ti++) {
      var tp = _bossTele[ti];
      var pulse = 0.5 + 0.3 * Math.sin(Date.now() / 90);
      _ctx.globalAlpha = pulse;
      _ctx.fillStyle = 'rgba(255,40,40,0.25)';
      _ctx.beginPath(); _ctx.arc(tp.x, tp.y, tp.r, 0, Math.PI * 2); _ctx.fill();
      _ctx.globalAlpha = 0.9;
      _ctx.strokeStyle = '#ff2828';
      _ctx.lineWidth = 3;
      _ctx.setLineDash([10, 8]);
      _ctx.beginPath(); _ctx.arc(tp.x, tp.y, tp.r, 0, Math.PI * 2); _ctx.stroke();
      _ctx.setLineDash([]);
      _ctx.globalAlpha = 1;
    }

    // Damage numbers bay lên
    _ctx.textAlign = 'center';
    for (var di = 0; di < _dmgNums.length; di++) {
      var dn = _dmgNums[di];
      _ctx.globalAlpha = Math.max(0, Math.min(1, dn.t * 1.5));
      _ctx.font = dn.big ? 'bold 18px sans-serif' : 'bold 14px sans-serif';
      _ctx.lineWidth = 3; _ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      _ctx.strokeText(dn.txt, dn.x, dn.y);
      _ctx.fillStyle = dn.color;
      _ctx.fillText(dn.txt, dn.x, dn.y);
    }
    _ctx.globalAlpha = 1;

    _ctx.restore();
    /* Vignette chiều sâu (screen-space) */
    var vg = _ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(10,8,20,0.22)');
    _ctx.fillStyle = vg;
    _ctx.fillRect(0, 0, W, H);
  }

  /* ---------- Vòng lặp ---------- */
  function _loop(ts) {
    if (!_running) return;
    _raf = _nextFrame(_loop);
    var now = (typeof ts === 'number') ? ts : _nowMs();
    var frameDt = (now - _lastT) / 1000;
    _lastT = now;
    if (frameDt > 0.25) frameDt = 0.25;
    var lvl = GFX_LEVELS[_gfxLevel] || GFX_LEVELS.cao;
    _acc += frameDt;
    var step = 1 / lvl.fps;
    if (_acc < step) return; // giới hạn fps theo mức đồ họa
    var dt = Math.min(_acc, 0.12);
    _acc = 0;
    _fpsTick(now);
    _update(dt);
    _render();
  }

  function init(canvasId) {
    if (typeof document === 'undefined') return false;
    _canvas = document.getElementById(canvasId);
    if (!_canvas) return false;
    _ctx = _canvas.getContext('2d');
    var S = _S();
    if (S) {
      Engine.auto = S.auto !== false;
      Engine.autoQuest = !!S.autoQuest; /* AUTO làm nhiệm vụ (Bui 2026-10-19) */
      Engine.fly = !!S.fly;
      Engine.run = !!S.run;
    }
    setGraphics((S && S.settings && S.settings.graphics) || 'tudong');
    if (S && S.settings && S.settings.graphicsManual) _manualCap = S.settings.graphicsManual;
    _tapMove = !(S && S.settings && S.settings.tapMove === false); /* áp dụng tap-to-move đã lưu */
    _loadMapZoom(); /* Bui 2026-10-22: zoom map đã lưu */
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', _applyGfx);
      window.addEventListener('keydown', _onKeyDown);
      window.addEventListener('keyup', _onKeyUp);
    }
    _canvas.addEventListener('pointerdown', _onCanvasTap);
    /* Bui 2026-10-22: zoom map — pinch (touch), wheel (chuột) */
    _canvas.addEventListener('wheel', _onWheel, { passive: false });
    _canvas.addEventListener('touchstart', _onTouchStart, { passive: false });
    _canvas.addEventListener('touchmove', _onTouchMove, { passive: false });
    _canvas.addEventListener('touchend', _onTouchEnd);
    _canvas.addEventListener('touchcancel', _onTouchEnd);
    _applyGfx();
    return true;
  }

  function start() {
    if (_running || !_ctx) return;
    _running = true;
    _lastT = _nowMs();
    _acc = 0; _fpsT = _lastT; _fpsFrames = 0; _highT = 0;
    _raf = _nextFrame(_loop);
  }

  function stop() {
    _running = false;
    if (_raf) _cancelFrame(_raf);
    _raf = 0;
  }

  /* ---------- Export ---------- */
  var Engine = {
    GFX_LEVELS: GFX_LEVELS,
    player: player,
    joy: joy,
    otherPlayers: [],
    autoQuest: false,     // AUTO làm nhiệm vụ (Bui 2026-10-19)
    aqStatus: null,       // trạng thái AutoQuest hiện tại {kind,qid,npcId,monId,acceptId} (Bui 2026-10-20)
    getStats: null,       // ui.js gán () => ({atk, def, maxHp, maxMp})
    onGate: null,         // (toMapId)
    onKill: null,         // (monster)
    onNpc: null,          // (npcId)
    talkNpcId: null,      // npcId đang mở hội thoại (để vẽ 💬)
    onStageClear: null,   // (stageIdx, rewards)
    onDungeonDone: null,  // ()
    auto: true,
    fly: false,
    run: false,
    init: init,
    start: start,
    stop: stop,
    enterMap: enterMap,
    refreshNpcs: refreshNpcs, /* QA 2026-10-21: hiện NPC vừa unlock sau khi trả quest */
    setPlayerPos: function (x, y) {
      if (typeof x === "number" && typeof y === "number") {
        player.x = Math.max(16, Math.min(WORLD_W - 16, x));
        player.y = Math.max(16, Math.min(WORLD_H - 16, y));
      }
    },
    setAuto: setAuto,
    playerState: _playerState, /* Build 99: máy trạng thái nhân vật (dead/hit/skill/attack/move/idle) */
    setAutoQuest: setAutoQuest, /* AUTO làm nhiệm vụ (Bui 2026-10-19) */
    setFly: setFly,
    setRun: setRun,
    setTapMove: function (v) { _tapMove = !!v; _moveTarget = null; }, /* bật/tắt chạm-map-di-chuyển */
    tapMoveOn: function () { return _tapMove; },
    setMapZoom: setMapZoom, /* Bui 2026-10-22: zoom map 0.5x–3x */
    mapZoom: function () { return _mapZoom; },
    zoomIn: function () { return setMapZoom(_mapZoom + 0.25); },
    zoomOut: function () { return setMapZoom(_mapZoom - 0.25); },
    setGraphics: setGraphics,
    tryInteract: tryInteract,
    enterDungeonRun: enterDungeonRun,
    enterSecretRealm: enterSecretRealm,
    secretRealmId: secretRealmId,
    leaveSecretRealm: leaveSecretRealm,
    nextStage: nextStage,
    bindState: bindState,
    useSkill: useSkill,         // (skillId) → {ok, reason?}
    manualAttack: manualAttack, // () → bool
    dash: dash,                 // () → bool
    navigateTo: function (x, y) { _moveTarget = { x: x, y: y }; }, // tự tìm đường tới điểm
    getBossInfo: getBossInfo,   // () → {name,hp,maxHp,weak} | null
    getMonsters: function () { return _monsters; }, // minimap HUD
    spawnEventMonster: function (monId, x, y) { /* Su kien cot truyen: spawn quai truc tiep (NV3 Dem Mau — Bui 2026-10-18) */
      try { var m = _spawnMon(monId, x, y, false); _monsters.push(m); return true; } catch (e) { return false; }
    },
    getNPCs: function () { return _npcs; },         // minimap HUD
    getGates: function () { return _gates; },       // minimap HUD
    isWeak: isWeak,             // () → bool (cửa sổ SƠ HỞ)
    dashCdLeft: function () { return Math.max(0, _dashCd); },
    khu: function () { return _khuOf(player.x, player.y); }, // khu hiện tại (lưới 400x400)
    /* test hook: logic quay mặt (không dùng trong game) */
    _faceTest: { angLerp: _angLerp, face4: _face4 },
    /* test hook: chọn sprite người chơi mới theo (giới tính, hướng) + trạng thái mode */
    _playerSpriteTest: { file: (typeof _playerDirFile === 'function') ? _playerDirFile : null,
                         MODE: (typeof PLAYER_SPRITE_MODE !== 'undefined') ? PLAYER_SPRITE_MODE : null },
    /* test hook: khung bước đi theo (giới tính, hướng, a/b/c) + nhịp đổi khung */
    _playerWalkTest: { file: (typeof _playerWalkFile === 'function') ? _playerWalkFile : null,
                       cycle: (typeof _walkCycleAb === 'function') ? _walkCycleAb : null,
                       moving: (typeof _playerMoving === 'function') ? _playerMoving : null,
                       walkZones: (typeof _WALK_FACE_ZONE !== 'undefined') ? _WALK_FACE_ZONE : null },
    /* test hook: góc nghiêng giả lập bước đi của NPC (moving, nowMs) -> radian */
    _npcWalkTiltTest: (typeof _npcWalkTilt === 'function') ? _npcWalkTilt : null,
    /* test hook: biến thể ngoại hình trên sprite mode (spec từ appearance hiện tại) */
    _variantTest: { spec: (typeof _variantSpec === 'function') ? _variantSpec : null,
                    faceZone: (typeof _SPR_FACE_ZONE !== 'undefined') ? _SPR_FACE_ZONE : null,
                    facePart: (typeof _SPR_FACE_PART !== 'undefined') ? _SPR_FACE_PART : null,
                    canvas: (typeof _playerVariantCanvas === 'function') ? _playerVariantCanvas : null },
    /* Bui 2026-10-20: preview màn tạo nhân vật / Đổi Ngoại Hình dùng đúng pipeline biến thể sprite */
    variantSpecFor: (typeof _variantSpecFrom === 'function') ? _variantSpecFrom : null,
    variantCanvasFor: function (im, src, spec) { return (typeof _playerVariantCanvas === 'function') ? _playerVariantCanvas(im, src, spec) : null; },
    variantPartsReady: function (spec) { return (typeof _variantPartsReady === 'function') ? _variantPartsReady(spec) : true; },
    /* test hook: vùng cấm NPC quanh cổng chuyển map (không dùng trong game) */
    _gateTest: { SAFE_R: GATE_SAFE_R, gatesOf: _gatesOf, gateZoneAt: _gateZoneAt,
                 pushOut: _pushOutOfGates, stepNpcs: function (dt) { _updateNpcs(dt); } },
    khuOf: _khuOf,                 // (x, y) → số khu
    hitSolid: _hitSolid,           // (x, y) → bool (va chạm vật thể)
    getObjects: function () { return _objects; },
  };
  return Engine;
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Engine: Engine };
}
