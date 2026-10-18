/* ============================================================
 * js/story.js — Chuỗi cốt truyện mở đầu + điều phối nhiệm vụ tân thủ
 * (Bui duyệt 2026-10-18)
 *
 * - Sau khi tạo nhân vật xong (startGame), hiện overlay cốt truyện
 *   5 đoạn (bỏ qua được), chạy đúng 1 lần (flag tutorial_done).
 * - Xong: đánh dấu tutorial_done + tự nhận q_story_01.
 * - Quest.turnIn: toast thông báo khi chuỗi tự nhận quest tiếp theo
 *   (quest có autoAccept trong data.js).
 *
 * Tự bọc (wrap) startGame / Quest.turnIn lúc nạp — KHÔNG sửa ui.js.
 * Node: chỉ export logic thuần (không chạm DOM).
 * ============================================================ */

var Story = (function () {
  'use strict';

  var FIRST_QUEST = "q_story_01";

  /* node: nạp quest.js khi chạy smoke test (browser: global sẵn) */
  var _SQ = null;
  if (typeof Quest === "undefined" && typeof require !== "undefined") {
    try { _SQ = require("./quest.js").Quest; } catch (e) {}
  }

  /* 5 đoạn truyện: {sp: key tên người nói, tx: key nội dung} */
  var SEGMENTS = [
    { sp: "story_narrator",       tx: "story_intro_1" },
    { sp: "npc_lao_dan_duong",    tx: "story_intro_2" },
    { sp: "npc_lao_dan_duong",    tx: "story_intro_3" },
    { sp: "npc_lao_dan_duong",    tx: "story_intro_4" },
    { sp: "npc_lao_dan_duong",    tx: "story_intro_5" },
  ];

  function _t(key, params) {
    if (typeof t === "function") { try { return t(key, params); } catch (e) {} }
    return key;
  }
  function _state() {
    try {
      if (typeof globalThis !== "undefined" && globalThis.state !== undefined) return globalThis.state;
    } catch (e) {}
    return null;
  }
  function _quest() {
    try { if (typeof Quest !== "undefined") return Quest; } catch (e) {}
    if (_SQ) return _SQ;
    return null;
  }

  function shouldShow(state) {
    return !!(state && state.flags && !state.flags.tutorial_done);
  }

  function segments() { return SEGMENTS.slice(); }

  /* Đánh dấu xong intro + tự nhận quest đầu chuỗi */
  function markDone(state) {
    if (!state) return;
    state.flags = state.flags || {};
    state.flags.tutorial_done = true;
    var Q = _quest();
    if (Q && Q.accept) {
      try { Q.accept(state, FIRST_QUEST); } catch (e) {}
    }
  }

  /* ---------- Overlay DOM (browser only) ---------- */
  var _overlay = null, _segIdx = 0;

  function _css() {
    return "" +
    ".st-backdrop{position:fixed;inset:0;background:rgba(5,8,18,.82);z-index:99990;" +
    "display:flex;align-items:flex-end;justify-content:center;padding:0 12px 8vh;}" +
    ".st-box{width:min(640px,94vw);background:linear-gradient(180deg,#2a1f14,#1a130c);" +
    "border:3px solid #c9a227;border-radius:10px;box-shadow:0 0 40px rgba(201,162,39,.35);" +
    "padding:18px 20px 16px;color:#f3e6c8;font-family:serif;}" +
    ".st-title{text-align:center;color:#e9c86a;font-size:20px;letter-spacing:4px;margin-bottom:10px;}" +
    ".st-speaker{color:#ffd76a;font-weight:bold;margin-bottom:6px;font-size:16px;}" +
    ".st-text{font-size:16px;line-height:1.7;min-height:84px;}" +
    ".st-btns{display:flex;justify-content:space-between;margin-top:12px;}" +
    ".st-btn{background:linear-gradient(180deg,#8a6a1f,#5e4512);color:#ffe9a8;border:2px solid #c9a227;" +
    "border-radius:8px;padding:8px 22px;font-size:15px;cursor:pointer;font-family:serif;}" +
    ".st-btn.ghost{background:transparent;color:#bfa76a;border-color:#6b5a2e;}" +
    ".st-dots{text-align:center;color:#8a744a;margin-top:8px;letter-spacing:6px;font-size:12px;}";
  }

  function _ensureCss() {
    if (typeof document === "undefined") return;
    if (document.getElementById("st-css")) return;
    var s = document.createElement("style");
    s.id = "st-css";
    s.textContent = _css();
    document.head.appendChild(s);
  }

  function _render() {
    if (!_overlay) return;
    var seg = SEGMENTS[_segIdx];
    var last = _segIdx >= SEGMENTS.length - 1;
    _overlay.querySelector(".st-speaker").textContent = _t(seg.sp);
    _overlay.querySelector(".st-text").textContent = _t(seg.tx);
    _overlay.querySelector(".st-next").textContent = _t(last ? "story_begin" : "story_next");
    var dots = "";
    for (var i = 0; i < SEGMENTS.length; i++) dots += (i === _segIdx ? "●" : "○");
    _overlay.querySelector(".st-dots").textContent = dots;
  }

  function _finish() {
    var st = _state();
    if (st) {
      markDone(st);
      try { if (typeof saveGame === "function") saveGame(st); } catch (e) {}
      try { if (typeof toast === "function") toast(_t("story_next_quest", { n: _t("q_story_01") })); } catch (e) {}
      try { if (typeof sfx === "function") sfx("success"); } catch (e) {}
    }
    if (_overlay && _overlay.parentNode) _overlay.parentNode.removeChild(_overlay);
    _overlay = null;
  }

  function maybeShow() {
    if (typeof document === "undefined") return false;
    var st = _state();
    if (!st || !shouldShow(st)) return false;
    if (_overlay) return true;
    _ensureCss();
    _segIdx = 0;
    var back = document.createElement("div");
    back.className = "st-backdrop";
    back.innerHTML =
      '<div class="st-box">' +
        '<div class="st-title">' + _t("story_title") + '</div>' +
        '<div class="st-speaker"></div>' +
        '<div class="st-text"></div>' +
        '<div class="st-btns">' +
          '<button class="st-btn ghost st-skip">' + _t("story_skip") + '</button>' +
          '<button class="st-btn st-next"></button>' +
        '</div>' +
        '<div class="st-dots"></div>' +
      '</div>';
    back.querySelector(".st-next").addEventListener("click", function () {
      if (typeof sfx === "function") { try { sfx("click"); } catch (e) {} }
      if (_segIdx < SEGMENTS.length - 1) { _segIdx++; _render(); }
      else _finish();
    });
    back.querySelector(".st-skip").addEventListener("click", function () { _finish(); });
    document.body.appendChild(back);
    _overlay = back;
    _render();
    return true;
  }

  /* ---------- Tự bọc startGame + Quest.turnIn (browser only) ---------- */
  function _wrap() {
    if (typeof document === "undefined") return;
    try {
      if (typeof startGame === "function" && !startGame._storyWrapped) {
        var origStart = startGame;
        var wrappedStart = function () {
          origStart();
          try { maybeShow(); } catch (e) {}
        };
        wrappedStart._storyWrapped = true;
        startGame = wrappedStart;
      }
    } catch (e) {}
    try {
      var Q = _quest();
      if (Q && Q.turnIn && !Q.turnIn._storyWrapped) {
        var origTurnIn = Q.turnIn;
        var wrappedTurnIn = function (state, id) {
          var r = origTurnIn(state, id);
          try {
            if (r && r.ok && r.autoAccepted && r.autoAccepted.length &&
                typeof toast === "function") {
              toast(_t("story_next_quest", { n: _t(r.autoAccepted[0].nameKey) }));
            }
          } catch (e2) {}
          return r;
        };
        wrappedTurnIn._storyWrapped = true;
        Q.turnIn = wrappedTurnIn;
      }
    } catch (e) {}
  }

  _wrap();

  return {
    shouldShow: shouldShow,
    segments: segments,
    markDone: markDone,
    maybeShow: maybeShow,
    FIRST_QUEST: FIRST_QUEST,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = { Story: Story };
}
