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
  var ATTACK_RANGE = 70;      // tầm đánh player
  var INTERACT_RANGE = 60;    // tầm tương tác NPC (Space/?)
  var GATE_RANGE = 46;        // tầm kích hoạt cổng
  var MONSTER_AGGRO = 300;    // quái đuổi theo trong bán kính này
  var BOSS_RESPAWN_S = 120;   // boss hồi sinh sau 120s
  var MAP_MON_COUNT = 6;      // giữ ~6 quái thường / map

  var GFX_LEVELS = {
    thap:      { particle: 0,   shadows: false, scale: 0.6,  fps: 30 },
    trungbinh: { particle: 0.5, shadows: false, scale: 0.85, fps: 60 },
    cao:       { particle: 1,   shadows: true,  scale: 1.0,  fps: 60 },
  };
  var GFX_ORDER = ['thap', 'trungbinh', 'cao'];

  /* Ảnh có sẵn (đường dẫn tương đối từ v2/) */
  var SPRITE_PLAYER = '../assets-ai/nhanvat-chinh-topdown.webp';
  var SPRITE_NPC = { dai_phu: '../assets-ai/npc-dai-phu.webp' };
  var SPRITE_MON = {
    da_tru: '../assets-ai/quai-da-tru.webp',
    son_ke: '../assets-ai/quai-son-ke.webp',
  };
  var ELEMENT_FX = { // fallback khi ELEMENTS (data.js) chưa load
    kim: '#e8e8e8', moc: '#66bb6a', thuy: '#42a5f5', hoa: '#ef5350',
    tho: '#a1887f', bang: '#9be8ff', loi: '#b388ff', phong: '#b2ff59',
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
  var _monsters = [], _npcs = [], _gates = [];
  var _uid = 1;
  var _dmgNums = [], _fx = [];
  var _keys = {};
  var _moveTarget = null;
  var _attackCd = 0;
  var _respawnT = 0, _bossRespawnAt = 0, _bossDef = null;
  var _dungeon = null;          // {run, def} khi trong bí cảnh ngẫu nhiên
  var _stageClearFired = false;
  var _imgCache = {};

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
    im.onload = function () { e.ok = true; };
    im.onerror = function () { e.ok = false; };
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

  /* ---------- Entity ---------- */
  var player = { x: 800, y: 600, dir: 1, hp: 100, mp: 50, speed: 150, target: null, teamId: null };
  var joy = { dx: 0, dy: 0 };

  function _randPos(margin) {
    margin = margin || 120;
    return {
      x: margin + Math.random() * (WORLD_W - margin * 2),
      y: margin + Math.random() * (WORLD_H - margin * 2),
    };
  }
  function _spawnMon(monId, x, y, isBoss) {
    var def = _monDef(monId);
    var m = {
      uid: _uid++, monId: monId, def: def,
      x: x, y: y, hp: def.hp, maxHp: def.hp, atk: def.atk, def: def.def,
      boss: !!(isBoss || def.boss), dead: false,
      atkCd: 0, skillCd: 4 + Math.random() * 4, hitT: 0,
      wanderA: Math.random() * Math.PI * 2, wanderT: 0,
    };
    if (typeof Combat !== 'undefined' && Combat.aggro) {
      try { Combat.aggro(monId); } catch (e) {}
    }
    return m;
  }
  function _spawnMapMonsters() {
    _monsters = [];
    _bossDef = _mapDef.boss || null;
    _bossRespawnAt = 0;
    var ids = (_mapDef.monsters && _mapDef.monsters.length) ? _mapDef.monsters : ['da_tru'];
    for (var i = 0; i < MAP_MON_COUNT; i++) {
      var p = _randPos(160);
      _monsters.push(_spawnMon(ids[i % ids.length], p.x, p.y, false));
    }
    if (_bossDef) _monsters.push(_spawnMon(_bossDef, 1250, 320, true));
  }
  function _spawnStage(idx) {
    _monsters = [];
    _stageClearFired = false;
    var st = _dungeon.run.layout.stages[idx];
    if (!st) return;
    var ids = st.monsters || [];
    for (var i = 0; i < ids.length; i++) {
      var p = _randPos(200);
      _monsters.push(_spawnMon(ids[i], p.x, p.y, false));
    }
    if (st.boss) _monsters.push(_spawnMon(st.boss, 1250, 320, true));
  }

  /* ---------- API chính ---------- */
  function bindState(s) { _state = s || null; }

  function enterMap(mapId) {
    _dungeon = null;
    _mapId = mapId;
    _mapDef = _mapDefOf(mapId);
    _npcs = (_mapDef.npcs || []).map(function (id) {
      var d = _npcDef(id);
      return { npcId: id, def: d, x: d.x || 800, y: d.y || 500 };
    });
    _gates = (_mapDef.gates || []).map(function (g) {
      return { to: g.to, x: g.x, y: g.y };
    });
    if (_gates.length) { // đặt player ở cổng vào
      player.x = Math.min(WORLD_W - 60, _gates[0].x + 70);
      player.y = _gates[0].y;
    } else {
      player.x = WORLD_W / 2; player.y = WORLD_H / 2;
    }
    var ps = _getStats();
    player.hp = ps.maxHp; player.mp = ps.maxMp;
    player.target = null; _moveTarget = null;
    _dmgNums = []; _fx = [];
    _spawnMapMonsters();
    _audio(function (A) { A.playMusic('map'); });
  }

  /* Bí cảnh ngẫu nhiên: đánh theo ải run.layout.stages[run.stageIdx] */
  function enterDungeonRun(run, def) {
    _dungeon = { run: run, def: def };
    _mapId = 'dg:' + def.id;
    _mapDef = { id: _mapId, nameKey: def.nameKey, bg: def.mapBg || null, fb: '#20242e',
                monsters: [], boss: null, npcs: [], gates: [], stoneDrop: [10, 30] };
    _npcs = []; _gates = [];
    player.x = WORLD_W / 2; player.y = WORLD_H - 220;
    player.target = null; _moveTarget = null;
    _dmgNums = []; _fx = [];
    _spawnStage(run.stageIdx);
    _audio(function (A) { A.playMusic('boss'); });
  }

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

  function setAuto(b) { Engine.auto = !!b; var S = _S(); if (S) S.auto = Engine.auto; }
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
  function _onCanvasTap(e) {
    if (!_canvas || !_running) return;
    var r = _canvas.getBoundingClientRect();
    var cam = _camera();
    _moveTarget = {
      x: e.clientX - r.left + cam.x,
      y: e.clientY - r.top + cam.y,
    };
  }
  function _inputVec() {
    var dx = 0, dy = 0;
    if (_keys['arrowup'] || _keys['w']) dy -= 1;
    if (_keys['arrowdown'] || _keys['s']) dy += 1;
    if (_keys['arrowleft'] || _keys['a']) dx -= 1;
    if (_keys['arrowright'] || _keys['d']) dx += 1;
    dx += joy.dx; dy += joy.dy;
    var l = Math.hypot(dx, dy);
    if (l > 1) { dx /= l; dy /= l; l = 1; }
    return { dx: dx, dy: dy, active: l > 0.05 };
  }

  /* ---------- Update ---------- */
  function _speed() {
    return player.speed * (Engine.fly ? 1.6 : 1) * (Engine.run ? 1.3 : 1);
  }
  function _moveBy(dx, dy, dt) {
    var sp = _speed();
    player.x = Math.max(16, Math.min(WORLD_W - 16, player.x + dx * sp * dt));
    player.y = Math.max(16, Math.min(WORLD_H - 16, player.y + dy * sp * dt));
    if (Math.abs(dx) > 0.01) player.dir = dx >= 0 ? 1 : -1;
  }
  function _moveToward(tx, ty, dt) {
    var dx = tx - player.x, dy = ty - player.y;
    var d = Math.hypot(dx, dy);
    if (d < 6) return true;
    _moveBy(dx / d, dy / d, dt);
    return false;
  }
  function _nearestMon() {
    var best = null, bd = Infinity;
    for (var i = 0; i < _monsters.length; i++) {
      var m = _monsters[i];
      if (m.dead) continue;
      var d = Math.hypot(m.x - player.x, m.y - player.y);
      if (d < bd) { bd = d; best = m; }
    }
    return best ? { m: best, d: bd } : null;
  }

  function _playerAttack(mon, ps) {
    _attackCd = 0.8;
    player.dir = mon.x >= player.x ? 1 : -1;
    _audio(function (A) { A.sfx('slash'); });
    var dmg = 1;
    if (typeof Combat !== 'undefined') {
      try { dmg = Combat.playerStrike(ps, mon).dmg; }
      catch (e) { dmg = Math.max(1, Math.round(ps.atk - mon.def * 0.6)); mon.hp -= dmg; }
    } else {
      dmg = Math.max(1, Math.round(ps.atk - mon.def * 0.6)); mon.hp -= dmg;
    }
    _dmgNum(mon.x, mon.y - 26, '-' + dmg, '#ffd54f');
    _skillFx(mon.x, mon.y);
    mon.hitT = 0.15;
    if (mon.hp <= 0 && !mon.dead) _killMon(mon);
  }

  function _killMon(mon) {
    mon.dead = true;
    mon.hp = 0;
    _burst(mon.x, mon.y, mon.boss ? 14 : 6, '#ffffff');
    if (player.target === mon) player.target = null;
    if (mon.boss && !_dungeon) _bossRespawnAt = Date.now() / 1000 + BOSS_RESPAWN_S;
    if (Engine.onKill) {
      try {
        Engine.onKill({ uid: mon.uid, monId: mon.monId, def: mon.def, x: mon.x, y: mon.y, boss: mon.boss });
      } catch (e) {}
    }
  }

  function _bossSkill(m, ps) {
    if (typeof Combat !== 'undefined' && Combat.bossSkill) {
      try { Combat.bossSkill(m.monId); } catch (e) {}
    }
    _fx.push({ x: m.x, y: m.y, r: 20, max: 150, t: 0.5, maxT: 0.5, color: '#ff3b30' });
    var d = Math.hypot(player.x - m.x, player.y - m.y);
    if (d < 150) {
      var dmg = Math.max(1, Math.round(m.atk * 1.5 - ps.def * 0.6));
      player.hp -= dmg;
      _dmgNum(player.x, player.y - 26, '-' + dmg, '#ff6b6b');
      _audio(function (A) { A.sfx('hit'); });
      if (player.hp <= 0) _playerDie(ps);
    }
  }

  function _playerDie(ps) {
    player.hp = ps.maxHp;
    player.mp = ps.maxMp;
    player.x = WORLD_W / 2; player.y = WORLD_H / 2;
    player.target = null; _moveTarget = null;
  }

  function _updateMonsters(dt, ps) {
    for (var i = 0; i < _monsters.length; i++) {
      var m = _monsters[i];
      if (m.dead) continue;
      if (m.hitT > 0) m.hitT -= dt;
      m.atkCd -= dt;
      var d = Math.hypot(player.x - m.x, player.y - m.y);
      var spd = m.boss ? 95 : 70;
      if (d < MONSTER_AGGRO && d > 44) {
        var a = Math.atan2(player.y - m.y, player.x - m.x);
        m.x += Math.cos(a) * spd * dt;
        m.y += Math.sin(a) * spd * dt;
      } else if (d >= MONSTER_AGGRO) { // đi lang thang
        m.wanderT -= dt;
        if (m.wanderT <= 0) { m.wanderA = Math.random() * Math.PI * 2; m.wanderT = 2 + Math.random() * 3; }
        m.x += Math.cos(m.wanderA) * spd * 0.3 * dt;
        m.y += Math.sin(m.wanderA) * spd * 0.3 * dt;
      }
      m.x = Math.max(20, Math.min(WORLD_W - 20, m.x));
      m.y = Math.max(20, Math.min(WORLD_H - 20, m.y));
      if (d <= 52 && m.atkCd <= 0) {
        m.atkCd = m.boss ? 1.6 : 1.3;
        var dmg = 1;
        if (typeof Combat !== 'undefined') {
          try { dmg = Combat.monsterStrike(m, ps).dmg; }
          catch (e) { dmg = Math.max(1, Math.round(m.atk - ps.def * 0.6)); }
        } else {
          dmg = Math.max(1, Math.round(m.atk - ps.def * 0.6));
        }
        player.hp -= dmg;
        _dmgNum(player.x, player.y - 26, '-' + dmg, '#ff6b6b');
        _audio(function (A) { A.sfx('hit'); });
        if (player.hp <= 0) _playerDie(ps);
      }
      if (m.boss) {
        m.skillCd -= dt;
        if (m.skillCd <= 0) { m.skillCd = 6 + Math.random() * 4; _bossSkill(m, ps); }
      }
    }
  }

  function _updateRespawn(dt) {
    if (_dungeon) return; // bí cảnh: không respawn giữa ải
    _respawnT -= dt;
    if (_respawnT > 0) return;
    _respawnT = 2.5;
    var aliveN = 0, bossAlive = false;
    for (var i = 0; i < _monsters.length; i++) {
      var m = _monsters[i];
      if (!m.dead) { if (m.boss) bossAlive = true; else aliveN++; }
    }
    if (aliveN < MAP_MON_COUNT) {
      var ids = (_mapDef.monsters && _mapDef.monsters.length) ? _mapDef.monsters : ['da_tru'];
      var p = _randPos(160);
      // spawn xa player để không "mọc" ngay trước mặt
      var tries = 0;
      while (Math.hypot(p.x - player.x, p.y - player.y) < 350 && tries < 6) { p = _randPos(160); tries++; }
      _monsters.push(_spawnMon(ids[Math.floor(Math.random() * ids.length)], p.x, p.y, false));
    }
    if (!bossAlive && _bossDef && Date.now() / 1000 >= _bossRespawnAt) {
      _monsters.push(_spawnMon(_bossDef, 1250, 320, true));
    }
  }

  function _update(dt) {
    var ps = _getStats();
    if (player.hp > ps.maxHp) player.hp = ps.maxHp;
    if (player.mp < ps.maxMp) player.mp = Math.min(ps.maxMp, player.mp + 3 * dt);
    _attackCd -= dt;

    var iv = _inputVec();
    var manual = iv.active || !!_moveTarget;

    // Auto: tìm quái gần nhất, dí theo và đánh
    var tgt = (player.target && !player.target.dead) ? player.target : null;
    if (Engine.auto) {
      var nm = _nearestMon();
      if (nm && (!tgt || nm.m.uid !== tgt.uid)) tgt = nm.m;
      player.target = tgt;
      if (tgt) {
        var d = Math.hypot(tgt.x - player.x, tgt.y - player.y);
        if (!manual && d > ATTACK_RANGE * 0.8) {
          _moveToward(tgt.x, tgt.y, dt);
        } else if (_attackCd <= 0 && d <= ATTACK_RANGE) {
          _playerAttack(tgt, ps);
        }
      }
    } else if (tgt && _attackCd <= 0) {
      var d2 = Math.hypot(tgt.x - player.x, tgt.y - player.y);
      if (d2 <= ATTACK_RANGE) _playerAttack(tgt, ps);
    }

    if (iv.active) { _moveTarget = null; _moveBy(iv.dx, iv.dy, dt); }
    else if (_moveTarget) { if (_moveToward(_moveTarget.x, _moveTarget.y, dt)) _moveTarget = null; }

    // Cổng chuyển map
    for (var gi = 0; gi < _gates.length; gi++) {
      var g = _gates[gi];
      if (Math.hypot(g.x - player.x, g.y - player.y) < GATE_RANGE) {
        var to = g.to;
        _gates = []; // chống trigger lặp
        if (Engine.onGate) { try { Engine.onGate(to); } catch (e) {} }
        break;
      }
    }

    _updateMonsters(dt, ps);
    _updateRespawn(dt);
    _updateFx(dt);

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
      if (f.dot) { f.x += (f.vx || 0) * dt; f.y += (f.vy || 0) * dt; }
      else { f.r += (f.max - 8) * dt / Math.max(0.01, f.maxT); }
      if (f.t <= 0) _fx.splice(i, 1);
    }
  }

  /* ---------- Render ---------- */
  function _camera() {
    var x = player.x - _viewW / 2, y = player.y - _viewH / 2;
    if (WORLD_W <= _viewW) x = (WORLD_W - _viewW) / 2;
    else x = Math.max(0, Math.min(WORLD_W - _viewW, x));
    if (WORLD_H <= _viewH) y = (WORLD_H - _viewH) / 2;
    else y = Math.max(0, Math.min(WORLD_H - _viewH, y));
    return { x: x, y: y };
  }
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

  function _drawMonster(m) {
    var size = m.boss ? 64 : 44;
    var label = _t(m.def.nameKey || m.monId);
    _drawSprite(m.x, m.y, size, size, m.def.img, m.def.fb || '#888', label);
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
  }

  function _drawPlayer() {
    var lift = Engine.fly ? -10 : 0;
    if (Engine.fly) { // bóng đổ khi bay
      _ctx.fillStyle = 'rgba(0,0,0,0.25)';
      _ctx.beginPath();
      _ctx.ellipse(player.x, player.y + 20, 14, 5, 0, 0, Math.PI * 2);
      _ctx.fill();
    }
    _drawSprite(player.x, player.y + lift, 44, 44, SPRITE_PLAYER, '#2fa3a0', null);
    var ps = _getStats();
    _drawHpBar(player.x, player.y + lift - 32, 40, player.hp / ps.maxHp, false);
  }

  function _drawOther(o) {
    _drawSprite(o.x, o.y, 40, 40, SPRITE_PLAYER, '#7e9bb5', null);
    if (o.name) {
      _ctx.fillStyle = '#fff';
      _ctx.font = '10px sans-serif';
      _ctx.textAlign = 'center';
      _ctx.fillText(String(o.name).slice(0, 14), o.x, o.y - 28);
    }
  }

  function _drawNpc(n) {
    _drawSprite(n.x, n.y, 44, 44, n.def.img, '#6b4a2f', _t(n.def.nameKey || n.npcId));
    // dấu "!" trên đầu NPC nhiệm vụ
    if (n.def.kind === 'quest') {
      _ctx.fillStyle = '#ffeb3b';
      _ctx.font = 'bold 16px sans-serif';
      _ctx.textAlign = 'center';
      _ctx.fillText('!', n.x, n.y - 28);
    }
  }

  function _render() {
    if (!_ctx) return;
    var lvl = GFX_LEVELS[_gfxLevel] || GFX_LEVELS.cao;
    var W = _viewW, H = _viewH;

    // Nền map: cover full-canvas; thiếu ảnh → màu + tên
    _ctx.fillStyle = (_mapDef && _mapDef.fb) || '#222';
    _ctx.fillRect(0, 0, W, H);
    var bg = _mapDef ? _mapDef.bg : null;
    var im = _img(bg);
    if (im) {
      var s = Math.max(W / im.width, H / im.height);
      var dw = im.width * s, dh = im.height * s;
      _ctx.drawImage(im, (W - dw) / 2, (H - dh) / 2, dw, dh);
    } else {
      _ctx.fillStyle = '#f3e9d2';
      _ctx.font = '14px sans-serif';
      _ctx.textAlign = 'center';
      _ctx.fillText(_mapName(), W / 2, 30);
    }

    var cam = _camera();
    _ctx.save();
    _ctx.translate(-cam.x, -cam.y);

    // Cổng chuyển map
    for (var gi = 0; gi < _gates.length; gi++) {
      var g = _gates[gi];
      _ctx.strokeStyle = '#2fa3a0';
      _ctx.lineWidth = 4;
      _ctx.beginPath(); _ctx.arc(g.x, g.y, 26, 0, Math.PI * 2); _ctx.stroke();
      _ctx.strokeStyle = 'rgba(47,163,160,0.4)';
      _ctx.lineWidth = 8;
      _ctx.beginPath(); _ctx.arc(g.x, g.y, 32, 0, Math.PI * 2); _ctx.stroke();
    }

    // NPC
    for (var ni = 0; ni < _npcs.length; ni++) _drawNpc(_npcs[ni]);

    // Entities xếp theo y (trên-dưới)
    var ents = [];
    for (var mi = 0; mi < _monsters.length; mi++) {
      if (!_monsters[mi].dead) ents.push({ y: _monsters[mi].y, k: 'm', o: _monsters[mi] });
    }
    ents.push({ y: player.y, k: 'p' });
    var others = _visiblePlayers();
    for (var oi = 0; oi < others.length; oi++) ents.push({ y: others[oi].y, k: 'o', o: others[oi] });
    ents.sort(function (a, b) { return a.y - b.y; });
    for (var ei = 0; ei < ents.length; ei++) {
      var e = ents[ei];
      if (e.k === 'm') _drawMonster(e.o);
      else if (e.k === 'p') _drawPlayer();
      else _drawOther(e.o);
    }

    // Hiệu ứng skill: vòng tròn xung theo hệ
    for (var fi = 0; fi < _fx.length; fi++) {
      var f = _fx[fi];
      var alpha = Math.max(0, f.t / f.maxT);
      _ctx.globalAlpha = alpha;
      if (lvl.shadows) { _ctx.shadowBlur = 12; _ctx.shadowColor = f.color; }
      if (f.dot) {
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

    // Damage numbers bay lên
    _ctx.textAlign = 'center';
    _ctx.font = 'bold 13px sans-serif';
    for (var di = 0; di < _dmgNums.length; di++) {
      var dn = _dmgNums[di];
      _ctx.globalAlpha = Math.max(0, Math.min(1, dn.t * 1.5));
      _ctx.fillStyle = dn.color;
      _ctx.fillText(dn.txt, dn.x, dn.y);
    }
    _ctx.globalAlpha = 1;

    _ctx.restore();
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
      Engine.fly = !!S.fly;
      Engine.run = !!S.run;
    }
    setGraphics((S && S.settings && S.settings.graphics) || 'tudong');
    if (S && S.settings && S.settings.graphicsManual) _manualCap = S.settings.graphicsManual;
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', _applyGfx);
      window.addEventListener('keydown', _onKeyDown);
      window.addEventListener('keyup', _onKeyUp);
    }
    _canvas.addEventListener('pointerdown', _onCanvasTap);
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
    getStats: null,       // ui.js gán () => ({atk, def, maxHp, maxMp})
    onGate: null,         // (toMapId)
    onKill: null,         // (monster)
    onNpc: null,          // (npcId)
    onStageClear: null,   // (stageIdx, rewards)
    onDungeonDone: null,  // ()
    auto: true,
    fly: false,
    run: false,
    init: init,
    start: start,
    stop: stop,
    enterMap: enterMap,
    setAuto: setAuto,
    setFly: setFly,
    setRun: setRun,
    setGraphics: setGraphics,
    tryInteract: tryInteract,
    enterDungeonRun: enterDungeonRun,
    nextStage: nextStage,
    bindState: bindState,
  };
  return Engine;
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Engine: Engine };
}
