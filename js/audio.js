/* ============================================================
 * js/audio.js — Hệ thống âm thanh game Tu Tiên Online v2
 * - Nhạc nền: file assets/music/<name>.mp3 (menu|map|boss|breakthrough),
 *   phát lặp. THIẾU FILE THÌ IM LẶNG, KHÔNG LỖI.
 * - SFX: tổng hợp 100% bằng Web Audio API (oscillator + noise +
 *   envelope), không cần file.
 * - Âm thanh quái theo MONSTERS[monId].loai ('thu' trầm gằn |
 *   'ma' the thé cao); boss thêm delay/vang.
 * - Không DOM ở top-level; an toàn khi require trên node.
 * Phụ thuộc: state (nhận qua AudioSys.bindState), MONSTERS (data.js,
 *   có fallback khi chưa load).
 * ============================================================ */

var AudioSys = (function () {
  'use strict';

  var _ctx = null;        // AudioContext lazy
  var _state = null;      // state game (bindState)
  var _musicEl = null;    // HTMLAudioElement nhạc nền
  var _musicName = null;
  var _noiseBuf = null;

  function _musicOn() {
    return !_state || !_state.settings || _state.settings.music !== false;
  }
  function _sfxOn() {
    return !_state || !_state.settings || _state.settings.sound !== false;
  }

  /* AudioContext lười: chỉ tạo khi cần, sau gesture của user */
  function _ac() {
    if (_ctx) return _ctx;
    if (typeof window === 'undefined') return null;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { _ctx = new AC(); } catch (e) { _ctx = null; }
    return _ctx;
  }

  /* init(): unlock autoplay policy ở lần chạm đầu (mobile) */
  function init() {
    if (typeof window === 'undefined') return;
    var unlock = function () {
      var c = _ac();
      if (c && c.state === 'suspended') { try { c.resume(); } catch (e) {} }
      window.removeEventListener('pointerdown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
  }

  function bindState(s) { _state = s || null; }

  /* ---------- Nhạc nền ---------- */
  function playMusic(name) {
    if (!_musicOn()) return;
    if (_musicName === name && _musicEl && !_musicEl.paused) return;
    stopMusic();
    if (typeof Audio === 'undefined') return; // node / trình duyệt lạ
    try {
      var a = new Audio('assets/music/' + name + '.mp3');
      a.loop = true;
      a.volume = 0.45;
      var pr = a.play();
      // File thiếu / bị chặn: promise reject → im lặng, không lỗi
      if (pr && typeof pr.catch === 'function') pr.catch(function () {});
      _musicEl = a;
      _musicName = name;
    } catch (e) { /* im lặng */ }
  }

  function stopMusic() {
    if (_musicEl) { try { _musicEl.pause(); } catch (e) {} }
    _musicEl = null;
    _musicName = null;
  }

  /* ---------- Bộ tổng hợp SFX ---------- */
  function _echoSend(node, c) {
    var d = c.createDelay(1); d.delayTime.value = 0.28;
    var fb = c.createGain(); fb.gain.value = 0.35;
    var wet = c.createGain(); wet.gain.value = 0.4;
    node.connect(d); d.connect(fb); fb.connect(d);
    d.connect(wet); wet.connect(c.destination);
  }

  /* o: {f, f2, d, type, v, delay, echo} */
  function _tone(o) {
    var c = _ac();
    if (!c || !_sfxOn()) return;
    var t0 = c.currentTime + (o.delay || 0);
    var osc = c.createOscillator();
    var g = c.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(Math.max(1, o.f), t0);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f2), t0 + o.d);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.v || 0.2, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.d);
    osc.connect(g); g.connect(c.destination);
    if (o.echo) _echoSend(g, c);
    osc.start(t0); osc.stop(t0 + o.d + 0.05);
  }

  function _noiseBufGet(c) {
    if (_noiseBuf) return _noiseBuf;
    var len = Math.floor(c.sampleRate * 0.5);
    _noiseBuf = c.createBuffer(1, len, c.sampleRate);
    var d = _noiseBuf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return _noiseBuf;
  }

  /* o: {d, ff, ft, q, v, delay, echo} */
  function _noise(o) {
    var c = _ac();
    if (!c || !_sfxOn()) return;
    var t0 = c.currentTime + (o.delay || 0);
    var src = c.createBufferSource();
    src.buffer = _noiseBufGet(c); src.loop = true;
    var f = c.createBiquadFilter();
    f.type = o.ft || 'bandpass';
    f.frequency.value = o.ff || 2000;
    f.Q.value = o.q || 1;
    var g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.v || 0.25, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.d);
    src.connect(f); f.connect(g); g.connect(c.destination);
    if (o.echo) _echoSend(g, c);
    src.start(t0); src.stop(t0 + o.d + 0.05);
  }

  /* SFX cơ bản: slash | hit | pickup | click | success | fail */
  function sfx(name) {
    if (!_sfxOn()) return;
    switch (name) {
      case 'slash':   // chém: noise burst cao
        _noise({ d: 0.12, ff: 3500, v: 0.28 }); break;
      case 'hit':     // trúng đòn: trầm đục
        _tone({ f: 160, f2: 60, d: 0.15, v: 0.32 }); break;
      case 'pickup':  // nhặt đồ: ting 2 nốt
        _tone({ f: 880, d: 0.1, v: 0.2 });
        _tone({ f: 1320, d: 0.14, v: 0.2, delay: 0.08 }); break;
      case 'click':
        _tone({ f: 600, d: 0.06, type: 'square', v: 0.1 }); break;
      case 'success': // arpeggio lên
        [523, 659, 784, 1046].forEach(function (f, i) {
          _tone({ f: f, d: 0.18, v: 0.2, delay: i * 0.09 });
        }); break;
      case 'fail':    // tone xuống
        _tone({ f: 300, f2: 140, d: 0.4, type: 'sawtooth', v: 0.18 }); break;
    }
  }

  /* ---------- Âm thanh quái theo loài ---------- */
  function _monDef(monId) {
    if (typeof MONSTERS !== 'undefined' && MONSTERS && MONSTERS[monId]) return MONSTERS[monId];
    return {};
  }

  /* Trả về {aggro, hit, death, skill} — mỗi key là 1 function <30 dòng */
  function sfxLoaiQuai(monId) {
    var def = _monDef(monId);
    var loai = def.loai || 'thu'; // 'thu': trầm gằn | 'ma': the thé cao
    var boss = !!def.boss;

    function wrap(fn) {
      return function () {
        if (!_sfxOn()) return;
        try { fn(); } catch (e) {}
      };
    }

    var aggro, hit, death, skill;
    if (loai === 'ma') {
      aggro = wrap(function () {                       // ma: rít cao khi xuất hiện
        _tone({ f: 900, f2: 1500, d: 0.4, v: 0.2 });
        _noise({ d: 0.3, ff: 4200, v: 0.1 });
      });
      hit = wrap(function () {                         // ma: ré khi trúng đòn
        _tone({ f: 700, f2: 1100, d: 0.12, v: 0.22 });
      });
      death = wrap(function () {                       // ma: tan biến, pitch rơi
        _tone({ f: 800, f2: 200, d: 0.7, type: 'sawtooth', v: 0.18 });
      });
    } else { // 'thu'
      aggro = wrap(function () {                       // thú: gầm trầm nhẹ
        _tone({ f: 75, f2: 55, d: 0.5, type: 'sawtooth', v: 0.28 });
        _noise({ d: 0.4, ff: 300, ft: 'lowpass', v: 0.18 });
      });
      hit = wrap(function () {                         // thú: gừ khi trúng đòn
        _tone({ f: 130, f2: 90, d: 0.1, type: 'square', v: 0.22 });
      });
      death = wrap(function () {                       // thú: gục, pitch rơi dần
        _tone({ f: 220, f2: 45, d: 0.8, type: 'sawtooth', v: 0.24 });
      });
    }

    if (boss) {
      aggro = wrap(function () {                       // boss: rống lớn 2 tần số trầm chồng
        _tone({ f: 55, d: 1.2, type: 'sawtooth', v: 0.32, echo: true });
        _tone({ f: 82.5, f2: 60, d: 1.2, type: 'sawtooth', v: 0.28, echo: true });
        _noise({ d: 1.0, ff: 200, ft: 'lowpass', v: 0.22, echo: true });
      });
      skill = wrap(function () {                       // boss: dậm chân + gầm cảnh báo
        _tone({ f: 65, f2: 30, d: 0.35, v: 0.38, echo: true });
        _noise({ d: 0.3, ff: 500, ft: 'lowpass', v: 0.28 });
        _tone({ f: 90, f2: 60, d: 0.6, type: 'sawtooth', v: 0.24, delay: 0.25, echo: true });
      });
      death = wrap(function () {                       // boss: gào, pitch rơi dần + vang
        _tone({ f: 180, f2: 35, d: 1.4, type: 'sawtooth', v: 0.3, echo: true });
        _noise({ d: 1.2, ff: 400, ft: 'lowpass', v: 0.2, echo: true });
      });
    } else {
      skill = wrap(function () {                       // quái thường: skill nhẹ
        _tone({ f: 200, f2: 120, d: 0.25, type: 'square', v: 0.18 });
      });
    }
    return { aggro: aggro, hit: hit, death: death, skill: skill };
  }

  function setMusicOn(b) {
    if (_state && _state.settings) _state.settings.music = !!b;
    if (!b) stopMusic();
  }
  function setSfxOn(b) {
    if (_state && _state.settings) _state.settings.sound = !!b;
  }

  return {
    init: init,
    bindState: bindState,
    playMusic: playMusic,
    stopMusic: stopMusic,
    sfx: sfx,
    sfxLoaiQuai: sfxLoaiQuai,
    setMusicOn: setMusicOn,
    setSfxOn: setSfxOn,
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AudioSys: AudioSys };
}
