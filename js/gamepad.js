/* ============================================================
 * js/gamepad.js — Hỗ trợ tay cầm chơi game (Gamepad API)
 * - Tự nhận tay cầm khi cắm (toast "Đã kết nối tay cầm: <tên>")
 * - Cần trái (axes 0/1) di chuyển analog 360° + D-pad
 * - Map phím mặc định: A=đánh thường, X/Y/B=skill 1-3,
 *   LB/RB=chuyển trang skill, RT=lướt, LT=tương tác,
 *   Start=menu, Select=túi
 * - Cài đặt cho phép tùy chỉnh map phím (bấm nút trên tay cầm để gán)
 * - Cộng vector di chuyển vào Engine._inputVec (cộng dồn, không xung
 *   đột với joystick ảo/phím — đã chuẩn hóa max 1 trong engine)
 * - Node-safe: logic thuần (deadzone, map mặc định, tên nút) export
 *   cho smoke test; mọi chạm DOM/navigator đều có guard.
 * ============================================================ */
var GamepadInput = (function () {
  "use strict";

  var DEADZONE = 0.15;

  /* Các hành động có thể gán phím */
  var ACTIONS = ["attack", "skill1", "skill2", "skill3",
    "pagePrev", "pageNext", "dash", "interact", "menu", "bag"];

  /* Map mặc định theo chuẩn W3C (A=0,B=1,X=2,Y=3,LB=4,RB=5,LT=6,RT=7,Select=8,Start=9) */
  var DEFAULT_MAP = {
    attack: 0, skill1: 2, skill2: 3, skill3: 1,
    pagePrev: 4, pageNext: 5, dash: 7, interact: 6,
    menu: 9, bag: 8
  };

  /* Tên nút chuẩn để hiển thị */
  var BTN_NAMES = {
    0: "A", 1: "B", 2: "X", 3: "Y",
    4: "LB", 5: "RB", 6: "LT", 7: "RT",
    8: "Select", 9: "Start",
    12: "D-pad ↑", 13: "D-pad ↓", 14: "D-pad ←", 15: "D-pad →",
    10: "L3", 11: "R3"
  };

  var _padId = null;          // id của tay cầm đang dùng
  var _prev = [];             // trạng thái nút kỳ trước (edge detection)
  var _vec = { dx: 0, dy: 0 };// vector di chuyển hiện tại
  var _remapAction = null;    // action đang chờ bấm nút để gán
  var _skillPage = 0;         // trang skill 0..2 (mỗi trang 3 ô)
  var _started = false;

  /* callback UI: onChange(evt) — evt: "connect"|"disconnect"|"remap"|"map" */
  var onChange = null;

  /* ---------- Helpers thuần (node-safe) ---------- */

  function hasApi() {
    return (typeof navigator !== "undefined") && !!navigator.getGamepads;
  }

  /* Vector di chuyển từ 2 trục analog, áp deadzone + chuẩn hóa mượt */
  function axesVec(ax, ay) {
    ax = +ax || 0; ay = +ay || 0;
    var l = Math.sqrt(ax * ax + ay * ay);
    if (l < DEADZONE) return { dx: 0, dy: 0 };
    var s = Math.min(1, (l - DEADZONE) / (1 - DEADZONE)) / (l || 1);
    return { dx: ax * s, dy: ay * s };
  }

  function btnName(i) {
    if (BTN_NAMES[i] != null) return BTN_NAMES[i];
    return "Nút " + i;
  }

  function defaultMap() {
    var o = {};
    for (var k in DEFAULT_MAP) o[k] = DEFAULT_MAP[k];
    return o;
  }

  function isValidMap(m) {
    if (!m || typeof m !== "object") return false;
    for (var i = 0; i < ACTIONS.length; i++) {
      var v = m[ACTIONS[i]];
      if (typeof v !== "number" || v < 0 || v > 31) return false;
    }
    return true;
  }

  /* ---------- State / settings ---------- */

  function _gpSettings() {
    try {
      if (typeof state !== "undefined" && state && state.settings) {
        if (!state.settings.gamepad) state.settings.gamepad = { enabled: true, map: null };
        return state.settings.gamepad;
      }
    } catch (e) {}
    return { enabled: true, map: null };
  }

  function isEnabled() {
    return _gpSettings().enabled !== false;
  }

  function setEnabled(v) {
    _gpSettings().enabled = !!v;
    try { if (typeof saveGame !== "undefined" && typeof state !== "undefined") saveGame(state); } catch (e) {}
  }

  function getMap() {
    var m = _gpSettings().map;
    return isValidMap(m) ? m : defaultMap();
  }

  function setMap(m) {
    if (!isValidMap(m)) return false;
    _gpSettings().map = m;
    try { if (typeof saveGame !== "undefined" && typeof state !== "undefined") saveGame(state); } catch (e) {}
    _emit("map");
    return true;
  }

  function resetMap() {
    _gpSettings().map = null;
    try { if (typeof saveGame !== "undefined" && typeof state !== "undefined") saveGame(state); } catch (e) {}
    _emit("map");
  }

  /* ---------- Poll ---------- */

  function _pads() {
    try { return hasApi() ? navigator.getGamepads() : []; }
    catch (e) { return []; }
  }

  function currentPad() {
    var ps = _pads();
    for (var i = 0; i < ps.length; i++) {
      var p = ps[i];
      if (p && p.connected) {
        if (_padId === null) _padId = p.id;
        return p;
      }
    }
    return null;
  }

  function status() {
    var p = currentPad();
    if (!p) return { connected: false, name: "", rumble: false };
    var rumble = false;
    try { rumble = !!(p.vibrationActuator && p.vibrationActuator.playEffect); } catch (e) {}
    return { connected: true, name: String(p.id || "").slice(0, 60), rumble: rumble };
  }

  function _pressed(btns, i) {
    var b = btns[i];
    return !!(b && (b.pressed || b.value > 0.5));
  }

  function _fire(action) {
    /* Gọi hàm game ở call-time để không phụ thuộc thứ tự load script */
    try {
      var E = (typeof Engine !== "undefined") ? Engine : null;
      switch (action) {
        case "attack":
          if (E && E.manualAttack) E.manualAttack();
          break;
        case "skill1": case "skill2": case "skill3": {
          var base = { skill1: 0, skill2: 1, skill3: 2 }[action] + _skillPage * 3;
          if (typeof doSkillSlot !== "undefined") doSkillSlot(base);
          break;
        }
        case "pageNext":
          _skillPage = (_skillPage + 1) % 3;
          _toastPage();
          break;
        case "pagePrev":
          _skillPage = (_skillPage + 2) % 3;
          _toastPage();
          break;
        case "dash":
          if (E && E.dash) E.dash();
          break;
        case "interact":
          if (E && E.tryInteract) E.tryInteract();
          break;
        case "menu":
          if (typeof openPanel !== "undefined") openPanel("char");
          break;
        case "bag":
          if (typeof openPanel !== "undefined") openPanel("char", { tab: "items" });
          break;
      }
      if (typeof sfx !== "undefined") { try { sfx("click"); } catch (e2) {} }
    } catch (e) {}
  }

  function _toastPage() {
    try {
      if (typeof toast !== "undefined" && typeof t !== "undefined") {
        toast(t("gamepad_page") + " " + (_skillPage + 1) + "/3");
      }
    } catch (e) {}
  }

  function _emit(evt) {
    try { if (onChange) onChange(evt); } catch (e) {}
  }

  function poll() {
    var p = currentPad();
    if (!p || !isEnabled()) {
      _vec = { dx: 0, dy: 0 };
      _prev = [];
      return;
    }
    var btns = p.buttons || [];

    /* Chế độ gán phím: bắt nút đầu tiên được bấm */
    if (_remapAction) {
      for (var i = 0; i < btns.length; i++) {
        if (_pressed(btns, i) && !_prev[i]) {
          var m = getMap();
          m[_remapAction] = i;
          setMap(m);
          _remapAction = null;
          try {
            if (typeof toast !== "undefined" && typeof t !== "undefined") toast(t("gamepad_saved"));
          } catch (e) {}
          _emit("remap");
          break;
        }
      }
      _prev = _snapshot(btns);
      _vec = { dx: 0, dy: 0 };
      return;
    }

    /* Edge detection: chỉ bắn khi vừa bấm xuống */
    var map = getMap();
    for (var a = 0; a < ACTIONS.length; a++) {
      var act = ACTIONS[a];
      var bi = map[act];
      if (_pressed(btns, bi) && !_prev[bi]) _fire(act);
    }
    _prev = _snapshot(btns);

    /* Di chuyển: cần trái analog + D-pad (12-15) */
    var ax = +(p.axes[0] || 0), ay = +(p.axes[1] || 0);
    if (_pressed(btns, 14)) ax -= 1;
    if (_pressed(btns, 15)) ax += 1;
    if (_pressed(btns, 12)) ay -= 1;
    if (_pressed(btns, 13)) ay += 1;
    _vec = axesVec(ax, ay);
  }

  function _snapshot(btns) {
    var o = [];
    for (var i = 0; i < btns.length; i++) o[i] = _pressed(btns, i);
    return o;
  }

  /* Vector di chuyển cho Engine._inputVec (đọc mỗi frame) */
  function moveVec() {
    return isEnabled() ? _vec : { dx: 0, dy: 0 };
  }

  function padActive() {
    return isEnabled() && !!currentPad();
  }

  /* ---------- Remap ---------- */

  function startRemap(action) {
    if (ACTIONS.indexOf(action) < 0) return false;
    if (!currentPad()) return false;
    _remapAction = action;
    _emit("remap");
    return true;
  }

  function cancelRemap() {
    _remapAction = null;
    _emit("remap");
  }

  function remapping() { return _remapAction; }

  /* ---------- Rung test ---------- */

  function testRumble() {
    var p = currentPad();
    var okMsg = false, noMsg = false;
    try {
      if (p && p.vibrationActuator && p.vibrationActuator.playEffect) {
        p.vibrationActuator.playEffect("dual-rumble", {
          duration: 400, strongMagnitude: 0.8, weakMagnitude: 0.5
        });
        okMsg = true;
      } else { noMsg = true; }
    } catch (e) { noMsg = true; }
    try {
      if (typeof toast !== "undefined" && typeof t !== "undefined") {
        toast(t(okMsg ? "gamepad_rumble_ok" : "gamepad_rumble_no"));
      }
    } catch (e2) {}
    return okMsg;
  }

  /* ---------- Init ---------- */

  function _onConnect(e) {
    _padId = (e && e.gamepad && e.gamepad.id) || null;
    _prev = [];
    try {
      if (typeof toast !== "undefined" && typeof t !== "undefined") {
        var nm = String((_padId || "").split("(")[0]).trim().slice(0, 40) || "Gamepad";
        toast(t("gamepad_connected", { name: nm }));
      }
    } catch (e2) {}
    _emit("connect");
  }

  function _onDisconnect() {
    _padId = null;
    _prev = [];
    _vec = { dx: 0, dy: 0 };
    cancelRemap();
    try {
      if (typeof toast !== "undefined" && typeof t !== "undefined") toast(t("gamepad_disconnected"));
    } catch (e) {}
    _emit("disconnect");
  }

  function init() {
    if (_started) return;
    _started = true;
    if (typeof window === "undefined") return;
    try {
      window.addEventListener("gamepadconnected", _onConnect);
      window.addEventListener("gamepaddisconnected", _onDisconnect);
    } catch (e) {}
    var raf = (typeof requestAnimationFrame !== "undefined")
      ? requestAnimationFrame.bind(window)
      : function (fn) { return setTimeout(function () { fn(Date.now()); }, 16); };
    (function loop() {
      try { poll(); } catch (e) {}
      raf(loop);
    })();
  }

  /* Tự khởi động khi load trong trình duyệt */
  if (typeof window !== "undefined") {
    if (document.readyState === "complete" || document.readyState === "interactive") init();
    else document.addEventListener("DOMContentLoaded", init);
  }

  var api = {
    ACTIONS: ACTIONS,
    DEFAULT_MAP: DEFAULT_MAP,
    DEADZONE: DEADZONE,
    init: init,
    poll: poll,
    moveVec: moveVec,
    active: padActive,
    status: status,
    isEnabled: isEnabled,
    setEnabled: setEnabled,
    getMap: getMap,
    setMap: setMap,
    resetMap: resetMap,
    isValidMap: isValidMap,
    startRemap: startRemap,
    cancelRemap: cancelRemap,
    remapping: remapping,
    testRumble: testRumble,
    btnName: btnName,
    axesVec: axesVec,          // thuần — dùng cho test
    defaultMap: defaultMap,    // thuần — dùng cho test
    onChange: null             // UI gán lại
  };
  Object.defineProperty(api, "onChange", {
    get: function () { return onChange; },
    set: function (fn) { onChange = (typeof fn === "function") ? fn : null; }
  });
  return api;
})();

/* ============================================================
 * VirtualControls — Nút điều khiển cảm ứng (Bui 2026-10-20)
 * - Chế độ: joystick (nổi theo tay / cố định một chỗ) hoặc D-pad 4 nút
 * - Cỡ nút: --ctl-size (0.8–1.4); vị trí nút cố định kéo-thả được và nhớ
 * - Giao diện với engine giữ nguyên: Engine.joy = {dx, dy}
 * - Node-safe: helpers thuần (clampSize, dpadVector) export cho test;
 *   mọi chạm DOM đều có guard.
 * ============================================================ */
var VirtualControls = (function () {
  "use strict";

  var DEF_MODE = "joystick", DEF_FLOAT = true, DEF_SIZE = 1;
  var SIZE_MIN = 0.8, SIZE_MAX = 1.4;

  /* settings trong state.settings.controls (lazy default, không đụng state.js) */
  function _st() {
    try {
      if (typeof state !== "undefined" && state) {
        if (!state.settings) state.settings = {};
        var c = state.settings.controls;
        if (!c || typeof c !== "object") { c = {}; state.settings.controls = c; }
        if (c.mode !== "joystick" && c.mode !== "dpad") c.mode = DEF_MODE;
        if (typeof c.joyFloat !== "boolean") c.joyFloat = DEF_FLOAT;
        if (typeof c.size !== "number" || isNaN(c.size)) c.size = DEF_SIZE;
        return c;
      }
    } catch (e) {}
    return { mode: DEF_MODE, joyFloat: DEF_FLOAT, size: DEF_SIZE, joyPos: null, dpadPos: null };
  }
  function _save() {
    try { if (typeof saveGame !== "undefined" && typeof state !== "undefined" && state) saveGame(state); }
    catch (e) {}
  }

  /* ---------- Helpers thuần (node-safe) ---------- */

  function clampSize(v) {
    v = Math.round((+v || 0) * 10) / 10;
    if (isNaN(v)) v = DEF_SIZE;
    return Math.min(SIZE_MAX, Math.max(SIZE_MIN, v));
  }

  /* Vector từ các nút D-pad đang giữ: held = {up,down,left,right} bool */
  function dpadVector(held) {
    held = held || {};
    var dx = (held.right ? 1 : 0) - (held.left ? 1 : 0);
    var dy = (held.down ? 1 : 0) - (held.up ? 1 : 0);
    var l = Math.sqrt(dx * dx + dy * dy);
    if (l > 1) { dx /= l; dy /= l; }
    return { dx: dx, dy: dy };
  }

  function validPos(p) {
    return !!(p && typeof p.x === "number" && typeof p.y === "number");
  }

  /* ---------- Settings ---------- */

  function getSettings() {
    var c = _st();
    return { mode: c.mode, joyFloat: c.joyFloat, size: c.size,
             joyPos: validPos(c.joyPos) ? { x: c.joyPos.x, y: c.joyPos.y } : null,
             dpadPos: validPos(c.dpadPos) ? { x: c.dpadPos.x, y: c.dpadPos.y } : null };
  }
  function setMode(m) {
    if (m !== "joystick" && m !== "dpad") return false;
    _st().mode = m; _save(); refresh(); return true;
  }
  function setJoyFloat(f) { _st().joyFloat = !!f; _save(); refresh(); return true; }
  function setSize(v) { var s = clampSize(v); _st().size = s; _save(); applySize(); return s; }
  function setPos(kind, x, y) {
    var c = _st(), p = { x: Math.round(x), y: Math.round(y) };
    if (kind === "dpad") c.dpadPos = p; else c.joyPos = p;
    _save(); return true;
  }
  function resetPos() { var c = _st(); c.joyPos = null; c.dpadPos = null; _save(); refresh(); }

  /* joystick nổi (hành vi cũ) có đang dùng không — ui.js hỏi để bật/tắt */
  function floatActive() {
    var c = _st(); return c.mode === "joystick" && c.joyFloat;
  }

  function applySize() {
    try {
      if (typeof document !== "undefined" && document.documentElement)
        document.documentElement.style.setProperty("--ctl-size", clampSize(_st().size));
    } catch (e) {}
  }

  /* ---------- DOM ---------- */

  var _dpadEl = null, _held = {};

  function _setJoy(dx, dy) {
    try {
      var E = (typeof Engine !== "undefined") ? Engine : null;
      if (E) E.joy = { dx: dx, dy: dy };
    } catch (e) {}
  }
  function _el(id) {
    try { return (typeof document !== "undefined") ? document.getElementById(id) : null; }
    catch (e) { return null; }
  }

  function _placeEl(el, pos) {
    try {
      el.style.bottom = "auto"; el.style.right = "auto";
      if (validPos(pos)) { el.style.left = pos.x + "px"; el.style.top = pos.y + "px"; }
      else {
        var h = (typeof window !== "undefined" && window.innerHeight) || 700;
        el.style.left = "14px"; el.style.top = Math.max(60, h - 200) + "px";
      }
    } catch (e) {}
  }

  /* Kéo-thả đổi vị trí: kéo ở vùng KHÔNG phải nút tương tác */
  function _bindDragReposition(el, kind, isInteractive) {
    if (!el || el._vcDrag) return; el._vcDrag = true;
    var sx = 0, sy = 0, ox = 0, oy = 0, dragging = false, pid = null;
    el.addEventListener("pointerdown", function (e) {
      if (isInteractive(e.target)) return;
      pid = e.pointerId; dragging = true;
      var r = el.getBoundingClientRect(), pr = el.parentNode.getBoundingClientRect();
      sx = e.clientX; sy = e.clientY;
      ox = r.left - pr.left; oy = r.top - pr.top;
      try { el.setPointerCapture(pid); } catch (_e) {}
      try { e.preventDefault(); } catch (_e2) {}
    });
    el.addEventListener("pointermove", function (e) {
      if (!dragging || e.pointerId !== pid) return;
      var pr = el.parentNode.getBoundingClientRect(), r = el.getBoundingClientRect();
      var nx = Math.max(0, Math.min(pr.width - r.width, ox + (e.clientX - sx)));
      var ny = Math.max(0, Math.min(pr.height - r.height, oy + (e.clientY - sy)));
      el.style.left = nx + "px"; el.style.top = ny + "px";
      el.style.bottom = "auto"; el.style.right = "auto";
      try { e.preventDefault(); } catch (_e) {}
    });
    var end = function (e) {
      if (!dragging || (e && e.pointerId !== pid)) return;
      dragging = false; pid = null;
      var pr = el.parentNode.getBoundingClientRect(), r = el.getBoundingClientRect();
      setPos(kind, r.left - pr.left, r.top - pr.top);
    };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
  }

  function _ensureDpad() {
    if (_dpadEl) return _dpadEl;
    try {
      var g = _el("screen-game"); if (!g || typeof document === "undefined") return null;
      var d = document.createElement("div");
      d.id = "dpad";
      d.innerHTML =
        '<button class="dp-btn dp-up" data-dir="up">▲</button>' +
        '<button class="dp-btn dp-down" data-dir="down">▼</button>' +
        '<button class="dp-btn dp-left" data-dir="left">◀</button>' +
        '<button class="dp-btn dp-right" data-dir="right">▶</button>';
      g.appendChild(d);
      _dpadEl = d;
      _bindDpad(d);
    } catch (e) { return null; }
    return _dpadEl;
  }

  function _bindDpad(d) {
    var btns = d.querySelectorAll(".dp-btn"), ptrDir = {};
    function update() {
      var v = dpadVector(_held);
      _setJoy(v.dx, v.dy);
      for (var i = 0; i < btns.length; i++)
        btns[i].classList.toggle("on", !!_held[btns[i].getAttribute("data-dir")]);
    }
    for (var i = 0; i < btns.length; i++) (function (b) {
      var dir = b.getAttribute("data-dir");
      b.addEventListener("pointerdown", function (e) {
        try { e.preventDefault(); } catch (_e) {}
        ptrDir[e.pointerId] = dir; _held[dir] = true; update();
        try { b.setPointerCapture(e.pointerId); } catch (_e2) {}
      });
      var up = function (e) {
        if (ptrDir[e.pointerId] === dir) delete ptrDir[e.pointerId];
        var still = false;
        for (var k in ptrDir) if (ptrDir[k] === dir) { still = true; break; }
        if (!still) _held[dir] = false;
        update();
      };
      b.addEventListener("pointerup", up);
      b.addEventListener("pointercancel", up);
    })(btns[i]);
    _bindDragReposition(d, "dpad", function (t) { return !!(t && t.closest && t.closest(".dp-btn")); });
  }

  /* Joystick cố định: kéo núm để đi (giữ nguyên #joystick/#joy-knob sẵn có) */
  function _bindFixedJoy(joy, knob) {
    if (!joy || joy._vcFixed) return; joy._vcFixed = true;
    var pid = null, cx = 0, cy = 0, R = 45, KNOB = 30;
    function setK(dx, dy) {
      _setJoy(dx, dy);
      try { knob.style.transform = "translate(" + (dx * KNOB) + "px," + (dy * KNOB) + "px)"; }
      catch (e) {}
      joy.classList.toggle("active", !!(dx || dy));
    }
    joy.addEventListener("pointerdown", function (e) {
      var onKnob = (e.target === knob) || (knob.contains && knob.contains(e.target));
      if (!onKnob) return; /* nền → _bindDragReposition đổi vị trí */
      pid = e.pointerId;
      var r = joy.getBoundingClientRect();
      cx = r.left + r.width / 2; cy = r.top + r.height / 2;
      R = Math.max(20, r.width / 2 - 12); KNOB = Math.max(14, r.width / 2 - 32);
      try { joy.setPointerCapture(pid); } catch (_e) {}
      try { e.preventDefault(); } catch (_e2) {}
    });
    joy.addEventListener("pointermove", function (e) {
      if (e.pointerId !== pid) return;
      var dx = (e.clientX - cx) / R, dy = (e.clientY - cy) / R;
      var len = Math.hypot(dx, dy);
      if (len > 1) { dx /= len; dy /= len; len = 1; }
      if (len < 0.15) { dx = 0; dy = 0; }
      setK(dx, dy);
      try { e.preventDefault(); } catch (_e) {}
    });
    var end = function (e) { if (e.pointerId === pid) { pid = null; setK(0, 0); } };
    joy.addEventListener("pointerup", end);
    joy.addEventListener("pointercancel", end);
    _bindDragReposition(joy, "joy", function (t) {
      return (t === knob) || !!(knob.contains && knob.contains(t));
    });
  }

  /* Áp chế độ hiện tại lên DOM */
  function refresh() {
    if (typeof document === "undefined") return;
    applySize();
    var c = _st(), joy = _el("joystick");
    var dpad = (c.mode === "dpad") ? _ensureDpad() : _dpadEl;
    if (dpad) {
      if (c.mode === "dpad") { dpad.classList.add("show"); _placeEl(dpad, c.dpadPos); }
      else { dpad.classList.remove("show"); _held = {}; _setJoy(0, 0); }
    }
    if (joy) {
      if (c.mode === "joystick" && !c.joyFloat) {
        joy.classList.add("fixed-ctl");
        joy.classList.remove("show"); /* tắt chế độ nổi */
        _placeEl(joy, c.joyPos);
        _bindFixedJoy(joy, _el("joy-knob"));
      } else {
        if (joy.classList.contains("fixed-ctl")) { _setJoy(0, 0); }
        joy.classList.remove("fixed-ctl");
        /* nổi: bindJoystick trong ui.js quản lý .show */
      }
    }
  }

  function boot() {
    if (typeof window === "undefined") return;
    var go = function () { try { refresh(); } catch (e) {} };
    try {
      if (document.readyState === "complete" || document.readyState === "interactive") go();
      else document.addEventListener("DOMContentLoaded", go);
    } catch (e) {}
  }
  if (typeof window !== "undefined") { try { boot(); } catch (e) {} }

  return {
    getSettings: getSettings,
    setMode: setMode,
    setJoyFloat: setJoyFloat,
    setSize: setSize,
    setPos: setPos,
    resetPos: resetPos,
    floatActive: floatActive,
    refresh: refresh,
    applySize: applySize,
    clampSize: clampSize,   /* thuần — dùng cho test */
    dpadVector: dpadVector, /* thuần — dùng cho test */
    validPos: validPos,     /* thuần — dùng cho test */
    SIZE_MIN: SIZE_MIN,
    SIZE_MAX: SIZE_MAX
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = { GamepadInput: GamepadInput, VirtualControls: VirtualControls };
}
