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

if (typeof module !== "undefined" && module.exports) {
  module.exports = { GamepadInput: GamepadInput };
}
