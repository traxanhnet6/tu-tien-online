/* ============================================================
 * js/quest.js — Logic nhiệm vụ, THUẦN LOGIC, không DOM
 * (Thiết kế Hệ thống viết)
 * Phụ thuộc: data.js (QUESTS), state.js (gainExp, addItem,
 *   removeItem, countItem). Không cần combat/engine.
 *
 * Tiến trình lưu trong state.quests[id] = {status, count}:
 *   status: 'active' | 'done'; count: số quái đã giết / tiến trình.
 *
 * Quest.available(state) → [questDef...] chưa nhận mà đủ điều kiện
 * Quest.accept(state, id) → {ok, reason?}
 * Quest.turnIn(state, id) → {ok, reward?, reason?}
 *   (check need; trừ item nếu cần; cộng stones/exp/items vào state)
 * Quest.onKill(state, monsterId) → [questId...] được cập nhật tiến trình
 * ============================================================ */

/* --- Dependency (browser: global sẵn từ data.js/state.js; node: require) --- */
var _QD = null, _QS = null;
if (typeof QUESTS === "undefined" && typeof require !== "undefined") {
  _QD = require("./data.js");
}
if (typeof gainExp === "undefined" && typeof require !== "undefined") {
  _QS = require("./state.js");
}
function _gq(name) {
  if (typeof globalThis !== "undefined" && typeof globalThis[name] !== "undefined") return globalThis[name];
  if (_QD && _QD[name] !== undefined) return _QD[name];
  /* browser: data.js nạp dạng classic script, const QUESTS nằm ở lexical
   * scope toàn cục chứ không gắn lên globalThis → đọc trực tiếp */
  if (name === "QUESTS" && typeof QUESTS !== "undefined") return QUESTS;
  throw new Error("missing dep: " + name);
}
function _gs(name) {
  if (typeof globalThis !== "undefined" && typeof globalThis[name] === "function") return globalThis[name];
  if (_QS) return _QS[name];
  throw new Error("missing dep: " + name);
}
function _QUESTS() { return _gq("QUESTS"); }
function _qdef(id) {
  var list = _QUESTS();
  for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
  return null;
}
/* Nhánh cốt truyện: quest có field branch ("chinh"|"ma") chỉ khả dụng khi
 * người chơi đã gia nhập tông môn thuộc nhánh đó. Bui 2026-10-18:
 * 2 nhánh khác nhau nhưng độ khó cân bằng. */
function _branchOk(q, state) {
  if (!q.branch) return true;
  var joined = null;
  try {
    if (typeof Sect !== "undefined" && Sect.joinedSect) joined = Sect.joinedSect(state);
    else if (state && state.sectInfo) joined = state.sectInfo.joined;
  } catch (e) {}
  if (q.branch === "ma") return joined === "cuu_u_ma_tong";
  if (q.branch === "chinh") return !!joined && joined !== "cuu_u_ma_tong";
  return true;
}

var Quest = {
  /* Lấy định nghĩa quest theo id (cho UI hiển thị thoại nhận/trả) */
  def: function (id) { return _qdef(id); },
  /* Quest chưa nhận mà đủ điều kiện nhận */
  available: function (state) {
    var out = [];
    var qs = (state && state.quests) || {};
    _QUESTS().forEach(function (q) {
      var s = qs[q.id];
      if (s && s.status) return; /* đã nhận hoặc đã xong */
      if (q.req && (!qs[q.req] || qs[q.req].status !== "done")) return;
      if (!_branchOk(q, state)) return; /* sai nhánh chính/ma */
      out.push(q);
    });
    return out;
  },

  /* Nhận quest */
  accept: function (state, id) {
    var q = _qdef(id);
    if (!q) return { ok: false, reason: "no_quest" };
    var qs = state.quests || (state.quests = {});
    var s = qs[id];
    if (s && s.status) return { ok: false, reason: s.status === "done" ? "already_done" : "already_active" };
    if (q.req && (!qs[q.req] || qs[q.req].status !== "done")) return { ok: false, reason: "req_not_met" };
    if (!_branchOk(q, state)) return { ok: false, reason: "wrong_branch" };
    qs[id] = { status: "active", count: 0 };
    return { ok: true };
  },

  /* Trả quest: check need → trừ item nếu cần → cộng thưởng */
  turnIn: function (state, id) {
    var q = _qdef(id);
    if (!q) return { ok: false, reason: "no_quest" };
    var s = (state.quests || {})[id];
    if (!s || s.status !== "active") return { ok: false, reason: "not_active" };

    var need = q.need || { type: "talk" };
    if (need.type === "kill") {
      if ((s.count || 0) < need.count) return { ok: false, reason: "need_not_met" };
    } else if (need.type === "item") {
      if (_gs("countItem")(state, need.item) < need.count) return { ok: false, reason: "need_not_met" };
      _gs("removeItem")(state, need.item, need.count);
    } else if (need.type === "joinsect") {
      /* Gia nhập tông môn: kiểm tra state.sectInfo.joined */
      var _joined = false;
      try {
        if (typeof Sect !== "undefined" && Sect.joinedSect) _joined = !!Sect.joinedSect(state);
        else _joined = !!(state.sectInfo && state.sectInfo.joined);
      } catch (e) {}
      if (!_joined) return { ok: false, reason: "need_not_met" };
    }
    /* type 'talk': luôn đủ điều kiện */

    var rw = q.reward || {};
    if (rw.stones) state.stones = (state.stones || 0) + rw.stones;
    if (rw.exp) _gs("gainExp")(state, rw.exp);
    /* Điểm cống hiến tông môn (Bui 2026-10-18: NV chính tuyến 2 nhánh thưởng cống hiến) */
    if (rw.contrib) {
      try {
        state.sectInfo = state.sectInfo || { joined: null, contrib: 0 };
        state.sectInfo.contrib = (state.sectInfo.contrib || 0) + rw.contrib;
      } catch (e) {}
    }
    (rw.items || []).forEach(function (it) {
      _gs("addItem")(state, it.id, it.qty || 1, !!it.locked);
    });
    state.quests[id] = { status: "done", count: s.count || 0 };
    /* Chuỗi cốt truyện: tự nhận quest tiếp theo có autoAccept (data-driven) */
    var autoAccepted = [];
    try {
      _QUESTS().forEach(function (nq) {
        if (nq.req === id && nq.autoAccept) {
          var r = Quest.accept(state, nq.id);
          if (r && r.ok) autoAccepted.push(nq);
        }
      });
    } catch (e) {}
    return { ok: true, reward: rw, autoAccepted: autoAccepted };
  },

  /* Gọi mỗi khi giết 1 con quái: tăng count cho quest kill đang active */
  onKill: function (state, monsterId) {
    var changed = [];
    var qs = state.quests || {};
    _QUESTS().forEach(function (q) {
      var need = q.need || {};
      if (need.type !== "kill" || need.monster !== monsterId) return;
      var s = qs[q.id];
      if (!s || s.status !== "active") return;
      if ((s.count || 0) < need.count) {
        s.count = (s.count || 0) + 1;
        changed.push(q.id);
      }
    });
    return changed;
  },
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = { Quest: Quest };
}
