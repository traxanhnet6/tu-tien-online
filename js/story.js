/* ============================================================
 * js/story.js — Cốt truyện mở đầu "Đêm Máu Làng Phong Diệp"
 * (Bui duyệt 2026-10-18 — luồng vào game mới)
 *
 * Luồng mới:
 * 1. Tạo tài khoản → tạo nhân vật (phàm nhân, không chọn tông)
 * 2. Đăng nhập lần đầu → chiếu 4 ô truyện tranh (có lồng tiếng)
 * 3. Xong → spawn tại Làng Phong Diệp (map 0) → tự nhận q_story_21
 * 4. Chuỗi 7 NV (q_story_21 → 27) → NV7 chọn tông môn → rẽ nhánh
 *
 * - Flag story_intro_done: beginGame() set = false cho nhân vật MỚI.
 *   shouldShow() check nghiêm ngặt === false → tài khoản cũ
 *   (story_intro_done là undefined) KHÔNG bị ảnh hưởng.
 * - markDone(): set story_intro_done = true, nhận q_story_21.
 *
 * Tự bọc (wrap) startGame lúc nạp — KHÔNG sửa ui.js.
 * Node: chỉ export logic thuần (không chạm DOM).
 * ============================================================ */

var Story = (function () {
  'use strict';

  var FIRST_QUEST = "q_story_21"; /* NV1 "Lễ Trắc Linh" */

  /* node: nạp quest.js khi chạy smoke test (browser: global sẵn) */
  var _SQ = null;
  if (typeof Quest === "undefined" && typeof require !== "undefined") {
    try { _SQ = require("./quest.js").Quest; } catch (e) {}
  }

  /* 4 ô truyện: {img, fx, voice, lines: [{sp, tx}]} */
  var PANELS = [
    {
      img: "assets/story/panel1_le_hoi.png",
      fx: "none",
      kenburns: "zoomin",
      voice: "assets/story/intro_p1.mp3",
      lines: [
        { sp: "story_narrator",  tx: "intro_p1_l1" },
        { sp: "npc_truong_lang", tx: "intro_p1_l2" },
        { sp: "story_you",       tx: "intro_p1_l3" },
      ],
    },
    {
      img: "assets/story/panel_lang_dem.png",
      fx: "rainbow",
      kenburns: "zoomout",
      voice: "assets/story/intro_p2.mp3",
      lines: [
        { sp: "story_narrator",  tx: "intro_p2_l1" },
        { sp: "story_dan_lang",  tx: "intro_p2_l2" },
        { sp: "npc_co_tran_tu",  tx: "intro_p2_l3" },
      ],
    },
    {
      img: "assets/story/panel3_dem_mau.png",
      fx: "fire",
      kenburns: "panleft",
      voice: "assets/story/intro_p3.mp3",
      lines: [
        { sp: "story_narrator",  tx: "intro_p3_l1" },
        { sp: "story_trai_chu",  tx: "intro_p3_l2" },
        { sp: "story_cha_nuoi",   tx: "intro_p3_l3" },
        { sp: "story_you",       tx: "intro_p3_l4" },
      ],
    },
    {
      img: "assets/story/panel4_tan_hoang.png",
      fx: "jadeglow",
      kenburns: "panright",
      voice: "assets/story/intro_p4.mp3",
      lines: [
        { sp: "story_narrator",  tx: "intro_p4_l1" },
        { sp: "story_giong_co",  tx: "intro_p4_l2" },
        { sp: "npc_co_tran_tu",  tx: "intro_p4_l3" },
      ],
    },
  ];

  /* ---------- Lồng tiếng ---------- */
  var _audio = null;
  function _voiceOn() {
    try {
      var st = _state();
      return !!(st && st.settings && st.settings.voice !== false);
    } catch (e) { return true; }
  }
  function stopVoice() {
    try { if (_audio) { _audio.pause(); _audio = null; } } catch (e) {}
  }
  function _playVoice(panel) {
    stopVoice();
    if (!panel || !panel.voice || !_voiceOn()) return;
    if (typeof Audio === "undefined") return;
    try {
      _audio = new Audio(panel.voice);
      _audio.play().catch(function () {});
    } catch (e) {}
  }
  function toggleVoice() {
    var st = _state();
    if (!st) return true;
    st.settings = st.settings || {};
    st.settings.voice = !(st.settings.voice !== false);
    try { if (typeof saveGame === "function") saveGame(st); } catch (e) {}
    if (!st.settings.voice) stopVoice();
    return st.settings.voice;
  }

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

  /* Chỉ hiện cho nhân vật MỚI (beginGame set story_intro_done = false).
     Tài khoản cũ: story_intro_done là undefined → false → không ảnh hưởng. */
  function shouldShow(state) {
    return !!(state && state.flags && state.flags.story_intro_done === false);
  }

  function panels() { return PANELS.slice(); }

  /* Đánh dấu xong intro + spawn map 0 + tự nhận quest đầu chuỗi mới */
  function markDone(state) {
    if (!state) return;
    state.flags = state.flags || {};
    state.flags.story_intro_done = true;
    state.flags.tutorial_done = true; /* tương thích luồng cũ */
    /* Spawn tại Làng Phong Diệp (map 0) */
    state.map = state.map || {};
    state.map.id = 0;
    var Q = _quest();
    if (Q && Q.accept) {
      try { Q.accept(state, FIRST_QUEST); } catch (e) {}
    }
  }

  /* ---------- Overlay DOM: truyện tranh toàn màn hình (browser only) ---------- */
  var _overlay = null, _panelIdx = 0, _lineIdx = 0, _typeTimer = null;

  function _css() {
    return "" +
    ".sb-backdrop{position:fixed;inset:0;background:#000;z-index:99990;overflow:hidden;}" +
    ".sb-stage{position:absolute;inset:0;overflow:hidden;}" +
    ".sb-img{position:absolute;inset:-6%;width:112%;height:112%;object-fit:cover;}" +
    ".sb-img.kb-zoomin{animation:sbZin 9s ease-in-out infinite alternate;}" +
    ".sb-img.kb-zoomout{animation:sbZout 9s ease-in-out infinite alternate;}" +
    ".sb-img.kb-panleft{animation:sbPanL 9s ease-in-out infinite alternate;}" +
    ".sb-img.kb-panright{animation:sbPanR 9s ease-in-out infinite alternate;}" +
    "@keyframes sbZin{from{transform:scale(1)}to{transform:scale(1.14)}}" +
    "@keyframes sbZout{from{transform:scale(1.14)}to{transform:scale(1)}}" +
    "@keyframes sbPanL{from{transform:scale(1.1) translateX(2%)}to{transform:scale(1.1) translateX(-2%)}}" +
    "@keyframes sbPanR{from{transform:scale(1.1) translateX(-2%)}to{transform:scale(1.1) translateX(2%)}}" +
    /* FX: cầu vồng chín màu */
    ".sb-fx-rainbow{position:absolute;left:50%;top:-10%;width:90px;height:120%;" +
    "transform:translateX(-50%);pointer-events:none;opacity:.85;" +
    "background:linear-gradient(90deg,#f00,#f80,#ff0,#0f0,#0ff,#00f,#a0f);" +
    "filter:blur(14px);animation:sbRainbow 2.4s ease-in-out infinite alternate;}" +
    "@keyframes sbRainbow{from{opacity:.55;transform:translateX(-50%) scaleX(1)}" +
    "to{opacity:.95;transform:translateX(-50%) scaleX(1.35)}}" +
    /* FX: lửa cháy */
    ".sb-fx-fire{position:absolute;inset:0;pointer-events:none;" +
    "background:radial-gradient(ellipse at 50% 100%,rgba(255,80,0,.55),rgba(180,0,0,.35) 55%,transparent 75%)," +
    "linear-gradient(180deg,rgba(120,0,0,.25),transparent 40%);" +
    "animation:sbFlick 0.7s ease-in-out infinite alternate;mix-blend-mode:screen;}" +
    "@keyframes sbFlick{from{opacity:.7}to{opacity:1}}" +
    ".sb-fx-fire::after{content:'';position:absolute;inset:0;" +
    "background:repeating-linear-gradient(0deg,transparent 0 18px,rgba(255,120,0,.06) 18px 26px);" +
    "animation:sbRise 1.2s linear infinite;}" +
    "@keyframes sbRise{from{transform:translateY(26px)}to{transform:translateY(-26px)}}" +
    /* FX: ngọc bội phát sáng */
    ".sb-fx-jadeglow{position:absolute;inset:0;pointer-events:none;" +
    "background:radial-gradient(circle at 50% 62%,rgba(60,255,170,.5),rgba(0,120,80,.18) 35%,transparent 60%)," +
    "linear-gradient(180deg,rgba(0,10,8,.55),transparent 45%,rgba(0,10,8,.65));" +
    "animation:sbJade 2.2s ease-in-out infinite alternate;}" +
    "@keyframes sbJade{from{opacity:.65}to{opacity:1}}" +
    /* Khung truyện tranh */
    ".sb-frame{position:absolute;inset:0;border:10px solid #0d0a06;pointer-events:none;z-index:5;}" +
    ".sb-title{position:absolute;top:14px;left:0;right:0;text-align:center;z-index:6;" +
    "color:#e9c86a;font-size:22px;letter-spacing:5px;text-shadow:0 2px 8px #000;font-family:serif;pointer-events:none;}" +
    /* Hộp thoại */
    ".sb-dialog{position:absolute;left:50%;bottom:26px;transform:translateX(-50%);z-index:6;" +
    "width:min(680px,92vw);background:linear-gradient(180deg,rgba(42,31,20,.96),rgba(26,19,12,.96));" +
    "border:3px solid #c9a227;border-radius:12px;padding:14px 18px;color:#f3e6c8;" +
    "box-shadow:0 0 30px rgba(0,0,0,.8);cursor:pointer;}" +
    ".sb-speaker{color:#ffd76a;font-weight:bold;font-size:16px;margin-bottom:6px;font-family:serif;}" +
    ".sb-text{font-size:16px;line-height:1.7;min-height:56px;font-family:serif;}" +
    ".sb-hint{text-align:right;color:#8a744a;font-size:12px;margin-top:6px;}" +
    /* Nút điều khiển */
    ".sb-ctrl{position:absolute;top:12px;right:12px;z-index:7;display:flex;gap:8px;}" +
    ".sb-btn{background:rgba(20,14,8,.85);color:#ffe9a8;border:2px solid #c9a227;" +
    "border-radius:8px;padding:7px 14px;font-size:14px;cursor:pointer;font-family:serif;}" +
    ".sb-dots{position:absolute;bottom:8px;left:0;right:0;text-align:center;z-index:6;" +
    "color:#8a744a;letter-spacing:8px;font-size:13px;pointer-events:none;}" +
    "@media (max-width:600px){.sb-title{font-size:17px;letter-spacing:3px}.sb-text{font-size:15px}}";
  }

  function _ensureCss() {
    if (typeof document === "undefined") return;
    if (document.getElementById("sb-css")) return;
    var s = document.createElement("style");
    s.id = "sb-css";
    s.textContent = _css();
    document.head.appendChild(s);
  }

  function _stopType() {
    if (_typeTimer) { clearInterval(_typeTimer); _typeTimer = null; }
  }

  function _render() {
    if (!_overlay) return;
    var panel = PANELS[_panelIdx];
    var line = panel.lines[_lineIdx];
    var lastPanel = _panelIdx >= PANELS.length - 1;
    var lastLine = _lineIdx >= panel.lines.length - 1;

    /* Ảnh + hiệu ứng */
    var stage = _overlay.querySelector(".sb-stage");
    stage.innerHTML =
      '<img class="sb-img kb-' + panel.kenburns + '" src="' + panel.img + '" alt="">' +
      (panel.fx !== "none" ? '<div class="sb-fx-' + panel.fx + '"></div>' : "");
    _overlay.querySelector(".sb-title").textContent = _t("story_title");

    /* Thoại */
    _overlay.querySelector(".sb-speaker").textContent = _t(line.sp);
    var textEl = _overlay.querySelector(".sb-text");
    var full = _t(line.tx);
    _stopType();
    /* Hiệu ứng gõ chữ */
    var i = 0;
    textEl.textContent = "";
    _typeTimer = setInterval(function () {
      i += 3;
      textEl.textContent = full.slice(0, i);
      if (i >= full.length) _stopType();
    }, 24);

    /* Nút tiếp / bắt đầu */
    _overlay.querySelector(".sb-next").textContent =
      _t((lastPanel && lastLine) ? "story_begin" : "story_next");
    var dots = "";
    for (var p = 0; p < PANELS.length; p++) dots += (p === _panelIdx ? "●" : "○");
    _overlay.querySelector(".sb-dots").textContent = dots;

    /* Lồng tiếng: phát khi sang ô mới */
    if (_lineIdx === 0) _playVoice(panel);
  }

  function _advance() {
    var panel = PANELS[_panelIdx];
    /* Nếu chữ đang gõ dở → hiện hết chữ */
    if (_typeTimer) {
      _stopType();
      _overlay.querySelector(".sb-text").textContent = _t(panel.lines[_lineIdx].tx);
      return;
    }
    if (_lineIdx < panel.lines.length - 1) {
      _lineIdx++;
      _render();
    } else if (_panelIdx < PANELS.length - 1) {
      _panelIdx++;
      _lineIdx = 0;
      _render();
    } else {
      _finish();
    }
  }

  function _finish() {
    _stopType();
    stopVoice();
    var st = _state();
    if (st) {
      markDone(st);
      try { if (typeof saveGame === "function") saveGame(st); } catch (e) {}
      try {
        if (typeof toast === "function") toast(_t("story_next_quest", { n: _t("q_story_21") }));
      } catch (e) {}
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
    _panelIdx = 0;
    _lineIdx = 0;
    var back = document.createElement("div");
    back.className = "sb-backdrop";
    back.innerHTML =
      '<div class="sb-stage"></div>' +
      '<div class="sb-frame"></div>' +
      '<div class="sb-title"></div>' +
      '<div class="sb-ctrl">' +
        '<button class="sb-btn sb-mute">🔊</button>' +
        '<button class="sb-btn sb-skip"></button>' +
      '</div>' +
      '<div class="sb-dialog">' +
        '<div class="sb-speaker"></div>' +
        '<div class="sb-text"></div>' +
        '<div class="sb-hint"></div>' +
      '</div>' +
      '<div class="sb-dots"></div>';
    back.querySelector(".sb-skip").textContent = _t("story_skip");
    back.querySelector(".sb-hint").textContent = _t("story_tap_next");
    var muteBtn = back.querySelector(".sb-mute");
    function syncMute() { muteBtn.textContent = _voiceOn() ? "🔊" : "🔇"; }
    syncMute();
    muteBtn.addEventListener("click", function (ev) {
      ev.stopPropagation();
      toggleVoice();
      syncMute();
      /* Phát lại lồng tiếng ô hiện tại nếu vừa bật */
      if (_voiceOn() && _lineIdx === 0) _playVoice(PANELS[_panelIdx]);
    });
    back.querySelector(".sb-skip").addEventListener("click", function (ev) {
      ev.stopPropagation();
      _finish();
    });
    back.querySelector(".sb-dialog").addEventListener("click", function () {
      if (typeof sfx === "function") { try { sfx("click"); } catch (e) {} }
      _advance();
    });
    /* Bấm vào nền cũng chuyển thoại (trừ nút điều khiển) */
    back.querySelector(".sb-stage").addEventListener("click", function () { _advance(); });
    document.body.appendChild(back);
    _overlay = back;
    /* Nút "Tiếp" nằm trong hint — thêm nút next vào dialog */
    var nextBtn = document.createElement("button");
    nextBtn.className = "sb-btn sb-next";
    nextBtn.style.cssText = "position:absolute;right:14px;bottom:14px;z-index:7;";
    nextBtn.addEventListener("click", function (ev) {
      ev.stopPropagation();
      if (typeof sfx === "function") { try { sfx("click"); } catch (e) {} }
      _advance();
    });
    back.appendChild(nextBtn);
    _render();
    return true;
  }

  /* ---------- Tự bọc startGame (browser only) ---------- */
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
    panels: panels,
    markDone: markDone,
    maybeShow: maybeShow,
    stopVoice: stopVoice,
    toggleVoice: toggleVoice,
    FIRST_QUEST: FIRST_QUEST,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = { Story: Story };
}
