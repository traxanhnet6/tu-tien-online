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
/* Phân loại quest: "chinh" (main) | "phu" (side). Quest không có trường kind
 * mặc định là "phu" (Bui 2026-10-20: chỉ 2 loại nhiệm vụ, phụ song song với chính). */
function _kindOf(q) { return (q && q.kind) || "phu"; }
function _qdef(id) {
  var list = _QUESTS();
  for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
  return null;
}
/* Độ sâu của quest chính trong chuỗi (đếm ngược theo req).
 * Không phải quest chính → -1. Có guard chống vòng lặp. */
function _chinhDepth(id) {
  var cur = _qdef(id);
  if (!cur || _kindOf(cur) !== "chinh") return -1;
  var d = 0, seen = {};
  while (cur && cur.req && !seen[cur.id]) {
    seen[cur.id] = true;
    var p = _qdef(cur.req);
    if (!p || _kindOf(p) !== "chinh") break;
    d++; cur = p;
  }
  return d;
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
/* Nhiệm vụ bí cảnh tông môn: quest có field sect chỉ khả dụng khi
 * người chơi đã gia nhập đúng tông đó. (Bui 2026-10-18) */
function _sectOk(q, state) {
  if (!q.sect) return true;
  var joined = null;
  try {
    if (typeof Sect !== "undefined" && Sect.joinedSect) joined = Sect.joinedSect(state);
    else if (state && state.sectInfo) joined = state.sectInfo.joined;
  } catch (e) {}
  return joined === q.sect;
}
/* Cấp bậc tông môn: quest có field rank chỉ khả dụng khi cấp bậc người chơi
 * đạt yêu cầu. (QA 2026-10-21: quest bí cảnh q_bc_* có rank nhưng Quest.available
 * không check → player mới vào tông thấy cả quest Hộ Pháp) */
var _SECT_RANK_ORDER = ["ngoai_mon", "noi_mon", "ho_phap", "truong_lao", "thai_thuong"];
function _rankIdx(rank) {
  var i = _SECT_RANK_ORDER.indexOf(rank);
  return i < 0 ? 0 : i;
}
function _rankOk(q, state) {
  if (!q.rank) return true;
  var myRank = "ngoai_mon";
  try {
    if (state && state.sectInfo && state.sectInfo.rank) myRank = state.sectInfo.rank;
    else if (typeof SectQuest !== "undefined" && SectQuest.rank) myRank = SectQuest.rank(state) || myRank;
  } catch (e) {}
  return _rankIdx(myRank) >= _rankIdx(q.rank);
}

var Quest = {
  /* Lấy định nghĩa quest theo id (cho UI hiển thị thoại nhận/trả) */
  def: function (id) { return _qdef(id); },
  /* Loại quest: "chinh" | "phu" (mặc định "phu") */
  kindOf: function (id) { return _kindOf(_qdef(id)); },
  /* Danh sách id quest đang active theo loại */
  activeByKind: function (state, kind) {
    var out = [];
    var qs = (state && state.quests) || {};
    Object.keys(qs).forEach(function (qid) {
      var s = qs[qid];
      if (!s || s.status !== "active") return;
      if (_kindOf(_qdef(qid)) === kind) out.push(qid);
    });
    return out;
  },
  /* Chuẩn hóa quest chính về tối đa 1 active (Bui 2026-10-20).
   * Save cũ (trước luật tuần tự) có thể dính 2 quest chính active do chơi
   * lại intro giữa chuỗi. Cách xử lý:
   *  1. Quest đang active nhưng nông hơn một quest chính đã DONE → stale,
   *     gỡ bỏ (người chơi nhận lại sau theo đúng thứ tự, không mất thưởng
   *     vì chưa từng trả quest đó).
   *  2. Còn hơn 1 quest chính active → giữ quest đi xa nhất trong chuỗi,
   *     gỡ các quest còn lại.
   * Idempotent: không làm gì khi đã đúng luật (0–1 quest chính active). */
  normalizeMain: function (state) {
    var qs = (state && state.quests) || {};
    var active = [], doneMax = -1;
    Object.keys(qs).forEach(function (id) {
      var s = qs[id];
      if (!s || !s.status) return;
      if (_kindOf(_qdef(id)) !== "chinh") return;
      if (s.status === "active") active.push(id);
      else if (s.status === "done") {
        var dd = _chinhDepth(id);
        if (dd > doneMax) doneMax = dd;
      }
    });
    var removed = [];
    active = active.filter(function (id) {
      if (_chinhDepth(id) < doneMax) {
        delete qs[id];
        removed.push(id);
        return false;
      }
      return true;
    });
    var kept = null;
    if (active.length > 1) {
      active.sort(function (a, b) { return _chinhDepth(b) - _chinhDepth(a); });
      kept = active[0];
      for (var i = 1; i < active.length; i++) {
        delete qs[active[i]];
        removed.push(active[i]);
      }
    } else if (active.length === 1) {
      kept = active[0];
    }
    return { kept: kept, removed: removed };
  },
  /* Quest chưa nhận mà đủ điều kiện nhận */
  available: function (state) {
    var out = [];
    var qs = (state && state.quests) || {};
    _QUESTS().forEach(function (q) {
      var s = qs[q.id];
      if (s && s.status) return; /* đã nhận hoặc đã xong */
      if (q.req && (!qs[q.req] || qs[q.req].status !== "done")) return;
      if (!_branchOk(q, state)) return; /* sai nhánh chính/ma */
      if (!_sectOk(q, state)) return; /* sai tông môn (nhiệm vụ bí cảnh tông) */
      if (!_rankOk(q, state)) return; /* chưa đủ cấp bậc tông môn (QA 2026-10-21) */
      out.push(q);
    });
    return out;
  },

  /* Nhận quest */
  accept: function (state, id) {
    var q = _qdef(id);
    if (!q) return { ok: false, reason: "no_quest" };
    /* Tự chuẩn hóa save cũ trước mọi lượt nhận: không bao giờ để lọt
     * 2 quest chính active (Bui 2026-10-20). Idempotent, không ảnh hưởng
     * luồng thường (0–1 quest chính active → không làm gì). */
    try { Quest.normalizeMain(state); } catch (e) {}
    var qs = state.quests || (state.quests = {});
    var s = qs[id];
    if (s && s.status) return { ok: false, reason: s.status === "done" ? "already_done" : "already_active" };
    /* Quy tắc Bui 2026-10-20: quest CHÍNH tuần tự — mỗi lúc chỉ 1 quest chính
     * active. Không nhận quest chính mới khi quest chính khác chưa trả xong.
     * Quest PHỤ được nhận song song, không chặn và không bị chặn. */
    if (_kindOf(q) === "chinh") {
      for (var _aid in qs) {
        if (_aid === id) continue;
        var _as = qs[_aid];
        if (!_as || _as.status !== "active") continue;
        var _aq = _qdef(_aid);
        if (_aq && _kindOf(_aq) === "chinh")
          return { ok: false, reason: "other_active", activeId: _aid };
      }
    }
    if (q.req && (!qs[q.req] || qs[q.req].status !== "done")) return { ok: false, reason: "req_not_met" };
    if (!_branchOk(q, state)) return { ok: false, reason: "wrong_branch" };
    if (!_sectOk(q, state)) return { ok: false, reason: "wrong_sect" };
    if (!_rankOk(q, state)) return { ok: false, reason: "rank_not_met" };
    qs[id] = { status: "active", count: 0 };
    return { ok: true };
  },

  /* Hủy nhiệm vụ đang làm (Bui 2026-10-21): xóa khỏi danh sách active, có thể nhận lại */
  abandon: function (state, id) {
    var qs = state.quests || {};
    var s = qs[id];
    if (!s || s.status !== "active") return { ok: false, reason: "not_active" };
    delete qs[id];
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
    } else if (need.type === "secret_enter" || need.type === "secret_nodes" || need.type === "secret_party") {
      /* Nhiệm vụ bí cảnh: tiến trình do Quest.onSecretEnter/onSecretNode cập nhật (Bui 2026-10-18) */
      if ((s.count || 0) < (need.count || 1)) return { ok: false, reason: "need_not_met" };
    } else if (need.type === "tower_floor") {
      /* Thông Thiên Tháp: kỷ lục tầng cao nhất trong state.tower.best */
      var _best = 0;
      try { _best = (state.tower && state.tower.best) || 0; } catch (e) {}
      if (_best < (need.floor || 1)) return { ok: false, reason: "need_not_met" };
    } else if (need.type === "trial") {
      /* Boss bí cảnh: phải vượt qua trận khiêu chiến (Quest.passTrial) */
      if (!s.trialPass) return { ok: false, reason: "trial_not_pass" };
    }
    else if (need.type === "talk_npcs") {
      /* Nói chuyện với danh sách NPC chỉ định (NV1 Lễ Trắc Linh — Bui 2026-10-18) */
      var _talked = s.talked || {};
      var _all = (need.npcs || []).every(function (id) { return !!_talked[id]; });
      if (!_all) return { ok: false, reason: "need_not_met" };
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
    /* NV2 Dị Tượng Cửu Sắc: trắc linh căn tại đài trắc linh (Bui 2026-10-18)
     * Roll node-safe ngay trong quest.js (không phụ thuộc ui.js) */
    if (id === "q_story_22" && !(state.char && state.char.element)) {
      try {
        var _rates = (typeof LINGEN_RATES !== "undefined") ? LINGEN_RATES :
          [["kim", 16], ["moc", 16], ["thuy", 16], ["hoa", 16], ["tho", 16]];
        if (typeof require !== "undefined" && (typeof LINGEN_RATES === "undefined")) {
          try { _rates = require("./data.js").LINGEN_RATES || _rates; } catch (e) {}
        }
        var _tot = 0, _i;
        for (_i = 0; _i < _rates.length; _i++) _tot += _rates[_i][1];
        var _r = Math.random() * _tot, _el = _rates[0][0];
        for (_i = 0; _i < _rates.length; _i++) { _r -= _rates[_i][1]; if (_r <= 0) { _el = _rates[_i][0]; break; } }
        var _rare = (_el === "bang" || _el === "loi" || _el === "phong" || _el === "hondon" ||
                     _el === "quang" || _el === "am" || _el === "doc" || _el === "huyet");
        var _qq = Math.random();
        var _ql = _qq < 0.05 ? "thien" : (_qq < 0.30 ? "dia" : "pham");
        if (_rare && _ql === "pham") _ql = "dia";
        state.char = state.char || {};
        state.char.element = _el;
        state.char.elementQuality = _ql;
        state.char.roots = [_el];
      } catch (e) {}
    }
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
    var _fx = q.fx || null, _event = q.event || null, _party = q.party || null, _sb = q.storyboard || null;
    if (id === "q_story_25" && _party) {
      /* NV5 Rời Làng: Tô Uyển Nhi + Diệp Vân nhập đội (Bui 2026-10-18) */
      try {
        state.party = state.party || [];
        _party.forEach(function (pid) { if (state.party.indexOf(pid) < 0) state.party.push(pid); });
      } catch (e) {}
    }
    return { ok: true, reward: rw, autoAccepted: autoAccepted, fx: _fx, event: _event, party: _party, storyboard: _sb };
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

  /* Gọi mỗi khi nói chuyện với 1 NPC: cập nhật quest talk_npcs đang active.
   * Trả về mảng {questId, done, total} cho UI hiển thị tiến trình. */
  onNpcTalk: function (state, npcId) {
    var changed = [];
    var qs = state.quests || {};
    _QUESTS().forEach(function (q) {
      var need = q.need || {};
      if (need.type !== "talk_npcs") return;
      var s = qs[q.id];
      if (!s || s.status !== "active") return;
      if ((need.npcs || []).indexOf(npcId) < 0) return;
      s.talked = s.talked || {};
      if (s.talked[npcId]) return;
      s.talked[npcId] = true;
      var total = (need.npcs || []).length;
      var done = (need.npcs || []).filter(function (id) { return !!s.talked[id]; }).length;
      changed.push({ questId: q.id, done: done, total: total });
    });
    return changed;
  },

  /* ---- Nhiệm vụ bí cảnh (Bui 2026-10-18) ---- */
  /* Gọi khi vào bí cảnh: tăng count cho quest secret_enter/secret_party đang active.
   * partySize: số người cùng vào (>=2 tính cho quest tổ đội). */
  onSecretEnter: function (state, realmId, partySize) {
    var changed = [];
    var qs = state.quests || {};
    _QUESTS().forEach(function (q) {
      var need = q.need || {};
      var isEnter = need.type === "secret_enter" && need.realm === realmId;
      var isParty = need.type === "secret_party" && need.realm === realmId && (partySize || 1) >= 2;
      if (!isEnter && !isParty) return;
      var s = qs[q.id];
      if (!s || s.status !== "active") return;
      if ((s.count || 0) < (need.count || 1)) {
        s.count = (s.count || 0) + 1;
        changed.push(q.id);
      }
    });
    return changed;
  },
  /* Gọi khi thu 1 điểm tài nguyên trong bí cảnh: tăng count cho quest secret_nodes */
  onSecretNode: function (state, realmId) {
    var changed = [];
    var qs = state.quests || {};
    _QUESTS().forEach(function (q) {
      var need = q.need || {};
      if (need.type !== "secret_nodes" || need.realm !== realmId) return;
      var s = qs[q.id];
      if (!s || s.status !== "active") return;
      if ((s.count || 0) < (need.count || 1)) {
        s.count = (s.count || 0) + 1;
        changed.push(q.id);
      }
    });
    return changed;
  },
  /* ---- Khiêu chiến boss bí cảnh (trial) ---- */
  trialEligible: function (state, id) {
    var q = _qdef(id);
    if (!q || !q.need || q.need.type !== "trial") return { ok: false, reason: "no_trial" };
    var s = (state.quests || {})[id];
    if (!s || s.status !== "active") return { ok: false, reason: "not_active" };
    if (s.trialPass) return { ok: false, reason: "already_pass" };
    return { ok: true, quest: q };
  },
  passTrial: function (state, id) {
    var s = (state.quests || {})[id];
    if (!s || s.status !== "active") return false;
    s.trialPass = true;
    return true;
  },
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = { Quest: Quest };
}
