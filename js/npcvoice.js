/* ============================================================
 * js/npcvoice.js — NPC tự đọc thoại bằng giọng nói (Bui 2026-10-20)
 * - Web Speech API (speechSynthesis); ưu tiên voice vi-VN
 *   (tìm trong getVoices: lang bắt đầu 'vi' hoặc tên chứa 'Vietnamese').
 * - Bảng giọng theo NPC: mỗi NPC một pitch/rate phù hợp tính cách.
 * - Text được làm sạch trước khi đọc: bỏ HTML tag, ký hiệu lạ,
 *   rút gọn khoảng trắng, giới hạn độ dài.
 * - Node-safe: mọi chạm speechSynthesis/SpeechSynthesisUtterance
 *   đều có guard; logic thuần export cho smoke test.
 * ============================================================ */
var NPCVoice = (function () {
  "use strict";

  /* Bảng giọng theo NPC: pitch/rate phù hợp tính cách nhân vật */
  var VOICE_TABLE = {
    dai_phu:      { pitch: 0.7,  rate: 0.85 }, /* già, chậm */
    co_tran_tu:   { pitch: 0.6,  rate: 0.8  }, /* cao nhân */
    truong_lao:   { pitch: 0.75, rate: 0.9  }, /* uy nghiêm */
    lao_ren:      { pitch: 0.8,  rate: 0.95 }, /* thợ rèn trầm khỏe */
    tieu_nhi:     { pitch: 1.2,  rate: 1.1  }, /* nhanh nhảu */
    to_uyen_nhi:  { pitch: 1.3,  rate: 1.0  }, /* nữ dịu dàng */
    diep_van:     { pitch: 1.0,  rate: 1.05 }, /* nam trẻ */
    lao_nong_dan: { pitch: 0.9,  rate: 0.95 },
    truong_lang:  { pitch: 0.7,  rate: 0.85 },
    tho_san:      { pitch: 0.85, rate: 1.0  }
  };
  var DEF_VOICE = { pitch: 1.0, rate: 1.0 };
  var MAX_LEN = 600;

  function voiceFor(npcId) {
    var v = VOICE_TABLE[npcId];
    return v ? { pitch: v.pitch, rate: v.rate }
             : { pitch: DEF_VOICE.pitch, rate: DEF_VOICE.rate };
  }

  /* Làm sạch text trước khi đọc */
  function cleanText(s) {
    s = String(s == null ? "" : s);
    s = s.replace(/<[^>]*>/g, " "); /* bỏ HTML tag */
    try {
      /* giữ chữ/số/dấu câu/khoảng trắng (unicode), bỏ ký hiệu lạ */
      s = s.replace(/[^\p{L}\p{N}\s.,!?;:'"()\-–—…%‰°]/gu, " ");
    } catch (e) {
      s = s.replace(/[^a-zA-Z0-9À-ỹ\s.,!?;:'"()\-–—…%‰°]/g, " ");
    }
    s = s.replace(/\s+/g, " ").trim();
    s = s.replace(/\s+([.,!?;:])/g, "$1"); /* dính dấu câu vào chữ trước */
    if (s.length > MAX_LEN) s = s.slice(0, MAX_LEN).replace(/\s+\S*$/, "") + "…";
    return s;
  }

  function _ss() {
    try { return (typeof speechSynthesis !== "undefined") ? speechSynthesis : null; }
    catch (e) { return null; }
  }

  var _viVoice = null, _viTried = false;
  function pickVoice() {
    var ss = _ss();
    if (!ss || typeof ss.getVoices !== "function") return null;
    if (_viTried) return _viVoice;
    _viTried = true;
    try {
      var vs = ss.getVoices() || [], i, v;
      for (i = 0; i < vs.length; i++) {
        v = vs[i];
        if (v && v.lang && /^vi([-_]|$)/i.test(v.lang)) { _viVoice = v; break; }
      }
      if (!_viVoice) for (i = 0; i < vs.length; i++) {
        v = vs[i];
        if (v && /vietnam/i.test(v.name || "")) { _viVoice = v; break; }
      }
    } catch (e) {}
    return _viVoice;
  }
  /* voice có thể load muộn → thử lại khi voiceschanged */
  try {
    var _ss0 = _ss();
    if (_ss0) {
      var _re = function () { _viTried = false; pickVoice(); };
      if (typeof _ss0.addEventListener === "function") _ss0.addEventListener("voiceschanged", _re);
      else _ss0.onvoiceschanged = _re;
    }
  } catch (e) {}

  function isEnabled() {
    try {
      if (typeof state !== "undefined" && state && state.settings)
        return state.settings.npcVoice !== false;
    } catch (e) {}
    return true; /* mặc định BẬT */
  }
  function setEnabled(v) {
    try {
      if (typeof state !== "undefined" && state) {
        if (!state.settings) state.settings = {};
        state.settings.npcVoice = !!v;
        if (typeof saveGame !== "undefined") saveGame(state);
      }
    } catch (e) {}
    if (!v) cancel();
  }

  function cancel() {
    try {
      var ss = _ss();
      if (ss && typeof ss.cancel === "function") ss.cancel();
    } catch (e) {}
  }

  /* Đọc: npcId (bảng giọng) + text (chuỗi hoặc mảng dòng thoại) */
  function speak(npcId, text) {
    if (!isEnabled()) return false;
    var ss = _ss();
    if (!ss || typeof ss.speak !== "function") return false;
    if (typeof SpeechSynthesisUtterance === "undefined" &&
        !(typeof window !== "undefined" && window.SpeechSynthesisUtterance)) return false;
    var arr = (text instanceof Array) ? text : [text];
    var parts = [];
    for (var i = 0; i < arr.length; i++) {
      var c = cleanText(arr[i]);
      if (c) parts.push(c);
    }
    if (!parts.length) return false;
    cancel(); /* NPC khác nói / nói lại → cancel cái cũ */
    try {
      var Ctor = (typeof SpeechSynthesisUtterance !== "undefined")
        ? SpeechSynthesisUtterance : window.SpeechSynthesisUtterance;
      var u = new Ctor(parts.join(". "));
      var vv = voiceFor(npcId);
      u.pitch = vv.pitch;
      u.rate = vv.rate;
      var voice = pickVoice();
      if (voice) u.voice = voice;
      u.lang = (voice && voice.lang) || "vi-VN";
      ss.speak(u);
      return true;
    } catch (e) { return false; }
  }

  /* talk = {lines:[...]} từ NPC.talk — lines có thể là lang key */
  function speakNpc(npcId, talk) {
    if (!talk || !(talk.lines instanceof Array)) return false;
    var resolved = talk.lines.map(function (ln) {
      try { return (typeof t === "function") ? t(ln, {}) : String(ln); }
      catch (e) { return String(ln); }
    });
    return speak(npcId, resolved);
  }

  /* Bui 2026-10-21: iOS chặn speechSynthesis tới khi có thao tác chạm —
     mở khóa bằng utterance rỗng ở lần chạm/click đầu tiên */
  var _unlocked = false;
  function unlock() {
    if (_unlocked) return;
    _unlocked = true;
    try {
      var ss = _ss();
      if (!ss || typeof ss.speak !== "function") return;
      var Ctor = (typeof SpeechSynthesisUtterance !== "undefined")
        ? SpeechSynthesisUtterance : (typeof window !== "undefined" && window.SpeechSynthesisUtterance);
      if (!Ctor) return;
      var u = new Ctor(" ");
      u.volume = 0; u.rate = 1; u.pitch = 1;
      ss.speak(u);
    } catch (e) {}
  }
  try {
    if (typeof document !== "undefined" && document.addEventListener) {
      var _ul = function () { unlock(); };
      document.addEventListener("touchstart", _ul, { once: true, passive: true });
      document.addEventListener("click", _ul, { once: true });
    }
  } catch (e) {}

  var api = {
    unlock: unlock, /* Bui 2026-10-21: gọi tay để test */
    voiceFor: voiceFor,   /* thuần — dùng cho test */
    cleanText: cleanText, /* thuần — dùng cho test */
    pickVoice: pickVoice,
    isEnabled: isEnabled,
    setEnabled: setEnabled,
    cancel: cancel,
    speak: speak,
    speakNpc: speakNpc,
    MAX_LEN: MAX_LEN
  };
  return api;
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = { NPCVoice: NPCVoice };
}
