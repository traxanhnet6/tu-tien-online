/* ============================================================
 * js/sectquest.js — Nhiệm vụ tông môn (thuần logic, chạy được trên node)
 * - Mỗi tông 12 nhiệm vụ chuỗi: ngoai_mon(3) → noi_mon(3) → ho_phap(3)
 *   → truong_lao(3). Cuối mỗi giai đoạn là TRIAL (sự kiện đột phá
 *   đặc trưng tông): vượt qua mới được đột phá + thăng chức.
 * - Quy tắc Bui chốt:
 *   + Lên Luyện Khí tầng 5 mới được nhập Nội Môn (trial q03).
 *   + Trial q06/q09/q12 khóa đột phá Trúc Cơ/Kim Đan/Nguyên Anh.
 *   + Lễ thăng cấp: thông báo + danh hiệu + thưởng.
 *   + Đột phá thất bại → nhiệm vụ "Củng Cố Căn Cơ" (+10% tỉ lệ, tối đa +30%).
 *   + Rời/đổi tông: hủy nhiệm vụ tông đang làm dở.
 * - Nhiệm vụ ngày (reset 0h) / tuần (reset thứ 2 0h) theo tông.
 * - State: state.sectQuests[id] = {status, count, trialPass?};
 *   state.sectInfo.rank/titles/btFail/cungCoDone/btBonus/sqDaily/sqWeekly.
 * Phụ thuộc: data.js (SECT_QUESTS...), state.js (gainExp/addItem/
 *   removeItem/countItem), sect.js (Sect.joinedSect — optional).
 * ============================================================ */

var _SQD = null, _SQS = null, _SQSECT = null;
if (typeof SECT_QUESTS === "undefined" && typeof require !== "undefined") {
  _SQD = require("./data.js");
}
if (typeof gainExp === "undefined" && typeof require !== "undefined") {
  _SQS = require("./state.js");
}
if (typeof Sect === "undefined" && typeof require !== "undefined") {
  try { _SQSECT = require("./sect.js"); } catch (e) { _SQSECT = null; }
}
function _g(name) {
  if (typeof globalThis !== "undefined" && typeof globalThis[name] !== "undefined") return globalThis[name];
  if (_SQD && _SQD[name] !== undefined) return _SQD[name];
  throw new Error("missing dep: " + name);
}
function _fn(name) {
  if (typeof globalThis !== "undefined" && typeof globalThis[name] === "function") return globalThis[name];
  if (_SQS && _SQS[name]) return _SQS[name];
  throw new Error("missing dep: " + name);
}
function _sect() {
  if (typeof globalThis !== "undefined" && typeof globalThis.Sect !== "undefined") return globalThis.Sect;
  return _SQSECT;
}
function _CHAINS() { return _g("SECT_QUESTS") || []; }
function _CUNGCO() { return _g("SECT_QUEST_CUNGCO") || []; }
function _DAILY() { return _g("SECT_QUEST_DAILY") || []; }
function _WEEKLY() { return _g("SECT_QUEST_WEEKLY") || []; }

var SECT_RANKS = ["ngoai_mon", "noi_mon", "ho_phap", "truong_lao"];
var SECT_RANK_TITLE_KEY = {
  ngoai_mon: "sq_rank_ngoai_mon", noi_mon: "sq_rank_noi_mon",
  ho_phap: "sq_rank_ho_phap", truong_lao: "sq_rank_truong_lao",
};

function _si(state) {
  if (!state.sectInfo) state.sectInfo = { joined: null, contrib: 0, daily: null };
  var si = state.sectInfo;
  if (!si.rank) si.rank = "ngoai_mon";
  if (!si.titles) si.titles = [];
  return si;
}
function _joined(state) {
  var S = _sect();
  if (S && S.joinedSect) return S.joinedSect(state);
  return _si(state).joined || null;
}
function _sqs(state) {
  if (!state.sectQuests) state.sectQuests = {};
  return state.sectQuests;
}
function _qdef(id) {
  var all = _CHAINS().concat(_CUNGCO());
  for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
  return null;
}
function _realmOk(char, minRealm) {
  if (!minRealm) return true;
  var r = (char && char.realm) || 0, t = (char && char.tier) || 0;
  return r > minRealm[0] || (r === minRealm[0] && t >= minRealm[1]);
}
function _today() {
  var d = new Date();
  var m = ("0" + (d.getMonth() + 1)).slice(-2);
  var day = ("0" + d.getDate()).slice(-2);
  return d.getFullYear() + "-" + m + "-" + day;
}
function _weekKey(d) {
  d = d || new Date();
  var onejan = new Date(d.getFullYear(), 0, 1);
  var week = Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
  return d.getFullYear() + "-W" + (week < 10 ? "0" + week : week);
}

var SectQuest = {
  SECT_RANKS: SECT_RANKS,

  chains: function (sectId) {
    return _CHAINS().filter(function (q) { return q.sect === sectId; });
  },
  def: function (id) { return _qdef(id); },

  rank: function (state) { return _si(state).rank || "ngoai_mon"; },
  rankIdx: function (rank) {
    var i = SECT_RANKS.indexOf(rank);
    return i < 0 ? 0 : i;
  },
  titles: function (state) { return _si(state).titles || []; },

  /* Nhiệm vụ chuỗi có thể nhận: đúng tông, đủ rank, xong req trước, đủ cảnh giới */
  available: function (state) {
    var joined = _joined(state);
    if (!joined) return [];
    var out = [];
    var sqs = _sqs(state);
    var ri = this.rankIdx(this.rank(state));
    var self = this;
    this.chains(joined).forEach(function (q) {
      var s = sqs[q.id];
      if (s && s.status) return;
      if (q.req && (!sqs[q.req] || sqs[q.req].status !== "done")) return;
      if (self.rankIdx(q.rank) > ri) return;
      if (!_realmOk(state.char, q.minRealm)) return;
      out.push(q);
    });
    return out;
  },

  accept: function (state, id) {
    var q = _qdef(id);
    if (!q || q.special) return { ok: false, reason: "no_quest" };
    var joined = _joined(state);
    if (!joined || q.sect !== joined) return { ok: false, reason: "khong_phai_tong" };
    var sqs = _sqs(state);
    var s = sqs[id];
    if (s && s.status) return { ok: false, reason: s.status === "done" ? "already_done" : "already_active" };
    if (q.req && (!sqs[q.req] || sqs[q.req].status !== "done")) return { ok: false, reason: "req_not_met" };
    if (this.rankIdx(q.rank) > this.rankIdx(this.rank(state))) return { ok: false, reason: "rank_not_met" };
    if (!_realmOk(state.char, q.minRealm)) return { ok: false, reason: "realm_not_met" };
    sqs[id] = { status: "active", count: 0, trialPass: false };
    return { ok: true };
  },

  /* Trả nhiệm vụ: check need → trừ item/stones → cộng thưởng + thăng chức */
  turnIn: function (state, id) {
    var q = _qdef(id);
    if (!q || q.special) return { ok: false, reason: "no_quest" };
    var sqs = _sqs(state);
    var s = sqs[id];
    if (!s || s.status !== "active") return { ok: false, reason: "not_active" };
    var need = q.need || { type: "talk" };
    if (need.type === "kill" || need.type === "killboss") {
      if ((s.count || 0) < need.count) return { ok: false, reason: "need_not_met" };
    } else if (need.type === "item") {
      if (_fn("countItem")(state, need.item) < need.count) return { ok: false, reason: "need_not_met" };
      _fn("removeItem")(state, need.item, need.count);
    } else if (need.type === "stones") {
      if ((state.stones || 0) < need.count) return { ok: false, reason: "need_not_met" };
      state.stones -= need.count;
    } else if (need.type === "trial") {
      if (!s.trialPass) return { ok: false, reason: "trial_not_pass" };
    }
    var rw = q.reward || {};
    if (rw.stones) state.stones = (state.stones || 0) + rw.stones;
    if (rw.exp) _fn("gainExp")(state, rw.exp);
    (rw.items || []).forEach(function (it) { _fn("addItem")(state, it.id, it.qty || 1, false); });
    var si = _si(state);
    if (rw.contrib) si.contrib = (si.contrib || 0) + rw.contrib;
    sqs[id] = { status: "done", count: s.count || 0, trialPass: !!s.trialPass };

    /* Thăng chức + lễ thăng cấp */
    var ceremony = null;
    if (q.promote) {
      si.rank = q.promote;
      var titleKey = SECT_RANK_TITLE_KEY[q.promote];
      si.titles.push({ rank: q.promote, nameKey: titleKey, at: Date.now() });
      ceremony = { rank: q.promote, titleKey: titleKey, eventKey: q.eventKey, fx: q.fx };
    }
    if (q.grandTitle) {
      si.titles.push({ rank: "grand", nameKey: q.grandTitle, at: Date.now() });
      ceremony = { rank: "grand", titleKey: q.grandTitle, eventKey: q.eventKey, fx: q.fx, grand: true };
    }
    return { ok: true, reward: rw, ceremony: ceremony };
  },

  /* Tiến trình hiển thị x/y */
  progress: function (state, q) {
    var s = (_sqs(state))[q.id] || {};
    var need = q.need || {};
    if (need.type === "kill" || need.type === "killboss") return { cur: Math.min(s.count || 0, need.count), need: need.count };
    if (need.type === "item") return { cur: Math.min(_fn("countItem")(state, need.item), need.count), need: need.count };
    if (need.type === "stones") return { cur: Math.min(state.stones || 0, need.count), need: need.count };
    if (need.type === "trial") return { cur: s.trialPass ? 1 : 0, need: 1 };
    return { cur: 1, need: 1 };
  },

  /* Đếm giết quái cho nhiệm vụ chuỗi + ngày/tuần */
  onKill: function (state, monId, isBoss) {
    var changed = [];
    var joined = _joined(state);
    if (!joined) return changed;
    var sqs = _sqs(state);
    this.chains(joined).forEach(function (q) {
      var need = q.need || {};
      var s = sqs[q.id];
      if (!s || s.status !== "active") return;
      var hit = false;
      if (need.type === "kill" && need.monster === monId) hit = true;
      if (need.type === "killboss" && isBoss && (!need.monster || need.monster === monId)) hit = true;
      if (hit && (s.count || 0) < need.count) { s.count = (s.count || 0) + 1; changed.push(q.id); }
    });
    /* ngày/tuần */
    var si = _si(state);
    var d = this._daily(si);
    this._dailyDefs(joined).forEach(function (dq) {
      if (dq.need.type === "kill") d.progress[dq.id] = (d.progress[dq.id] || 0) + 1;
      if (dq.need.type === "killboss" && isBoss) d.progress[dq.id] = (d.progress[dq.id] || 0) + 1;
    });
    var w = this._weekly(si);
    w.progress.kill = (w.progress.kill || 0) + 1;
    if (isBoss) w.progress.killboss = (w.progress.killboss || 0) + 1;
    return changed;
  },

  /* Cống hiến Linh Thạch cũng tính cho nhiệm vụ donate hằng ngày */
  onDonate: function (state, amount) {
    var joined = _joined(state);
    if (!joined) return;
    var d = this._daily(_si(state));
    this._dailyDefs(joined).forEach(function (dq) {
      if (dq.need.type === "stones") d.progress[dq.id] = (d.progress[dq.id] || 0) + amount;
    });
  },

  /* Rời/đổi tông: hủy nhiệm vụ đang làm dở, reset rank */
  onLeaveSect: function (state) {
    var sqs = _sqs(state);
    Object.keys(sqs).forEach(function (id) {
      if (sqs[id] && sqs[id].status === "active") delete sqs[id];
    });
    var si = _si(state);
    si.rank = "ngoai_mon";
    si.sqDaily = null; si.sqWeekly = null;
  },

  /* ---- Thử thách (trial battle) ---- */
  trialEligible: function (state, id) {
    var q = _qdef(id);
    if (!q || !q.need || q.need.type !== "trial") return { ok: false, reason: "no_trial" };
    var s = (_sqs(state))[id];
    if (!s || s.status !== "active") return { ok: false, reason: "not_active" };
    if (!_realmOk(state.char, q.minRealm)) return { ok: false, reason: "realm_not_met" };
    return { ok: true, quest: q };
  },
  passTrial: function (state, id) {
    var s = (_sqs(state))[id];
    if (!s || s.status !== "active") return { ok: false };
    s.trialPass = true;
    return { ok: true };
  },

  /* ---- Khóa đột phá: trial nào đang chặn đột phá lên realm+1? ---- */
  breakthroughGate: function (state) {
    var joined = _joined(state);
    if (!joined) return null;
    var target = ((state.char && state.char.realm) || 0) + 1;
    var sqs = _sqs(state);
    var hit = null;
    this.chains(joined).forEach(function (q) {
      if (q.gatesBreakthrough === target && (!sqs[q.id] || sqs[q.id].status !== "done")) hit = q;
    });
    return hit ? { questId: hit.id, nameKey: hit.nameKey, eventKey: hit.eventKey } : null;
  },

  /* ---- Đột phá thất bại → mở nhiệm vụ củng cố ---- */
  onBreakthroughFail: function (state) {
    var si = _si(state);
    if (!_joined(state)) return;
    si.btFail = (si.btFail || 0) + 1;
  },
  btBonus: function (state) { return (_si(state).btBonus || 0); },
  cungCoAvailable: function (state) {
    var joined = _joined(state);
    if (!joined) return null;
    var si = _si(state);
    if ((si.btFail || 0) <= (si.cungCoDone || 0)) return null;
    var sqs = _sqs(state);
    var def = null;
    _CUNGCO().forEach(function (q) { if (q.sect === joined) def = q; });
    if (!def) return null;
    var s = sqs[def.id];
    if (s && s.status === "active") return def;
    if (s && s.status === "done") return null;
    return def;
  },
  acceptCungCo: function (state) {
    var def = this.cungCoAvailable(state);
    if (!def) return { ok: false, reason: "not_available" };
    _sqs(state)[def.id] = { status: "active", count: 0 };
    return { ok: true, id: def.id };
  },
  turnInCungCo: function (state) {
    var def = this.cungCoAvailable(state);
    if (!def) return { ok: false, reason: "not_available" };
    var sqs = _sqs(state);
    var s = sqs[def.id];
    if (!s || s.status !== "active") return { ok: false, reason: "not_active" };
    var need = def.need;
    if (_fn("countItem")(state, need.item) < need.count) return { ok: false, reason: "need_not_met" };
    _fn("removeItem")(state, need.item, need.count);
    var si = _si(state);
    si.btBonus = Math.min(0.3, (si.btBonus || 0) + (def.reward.btBonus || 0.1));
    si.cungCoDone = (si.cungCoDone || 0) + 1;
    if (def.reward.exp) _fn("gainExp")(state, def.reward.exp);
    if (def.reward.contrib) si.contrib = (si.contrib || 0) + def.reward.contrib;
    sqs[def.id] = { status: "done", count: need.count };
    return { ok: true, btBonus: si.btBonus };
  },

  /* ---- Nhiệm vụ ngày/tuần ---- */
  _dailyDefs: function (sectId) { return _DAILY().filter(function (q) { return q.sect === sectId; }); },
  _weeklyDefs: function (sectId) { return _WEEKLY().filter(function (q) { return q.sect === sectId; }); },
  _daily: function (si) {
    var t = _today();
    if (!si.sqDaily || si.sqDaily.date !== t) si.sqDaily = { date: t, progress: {}, claimed: [] };
    return si.sqDaily;
  },
  _weekly: function (si) {
    var w = _weekKey();
    if (!si.sqWeekly || si.sqWeekly.week !== w) si.sqWeekly = { week: w, progress: {}, claimed: [] };
    return si.sqWeekly;
  },
  dailyList: function (state) {
    var joined = _joined(state);
    if (!joined) return [];
    var si = _si(state);
    var d = this._daily(si);
    return this._dailyDefs(joined).map(function (q) {
      var prog = d.progress[q.id] || 0;
      return {
        id: q.id, tname: q.tname, tdesc: q.tdesc, sect: joined,
        prog: Math.min(prog, q.need.count), need: q.need.count, contrib: q.contrib,
        done: prog >= q.need.count, claimed: d.claimed.indexOf(q.id) >= 0,
      };
    });
  },
  claimDaily: function (state, id) {
    var joined = _joined(state);
    if (!joined) return { ok: false, reason: "khong_phai_tong" };
    var si = _si(state);
    var d = this._daily(si);
    var q = null;
    this._dailyDefs(joined).forEach(function (x) { if (x.id === id) q = x; });
    if (!q) return { ok: false, reason: "no_quest" };
    if (d.claimed.indexOf(id) >= 0) return { ok: false, reason: "da_nhan" };
    if ((d.progress[id] || 0) < q.need.count) return { ok: false, reason: "chua_xong" };
    d.claimed.push(id);
    si.contrib = (si.contrib || 0) + q.contrib;
    return { ok: true, contrib: q.contrib };
  },
  weeklyList: function (state) {
    var joined = _joined(state);
    if (!joined) return [];
    var si = _si(state);
    var w = this._weekly(si);
    return this._weeklyDefs(joined).map(function (q) {
      var pk = Math.min(w.progress.kill || 0, q.need.count);
      var pb = Math.min(w.progress.killboss || 0, q.need2.count);
      return {
        id: q.id, tname: q.tname, tdesc: q.tdesc, sect: joined,
        progKill: pk, needKill: q.need.count, progBoss: pb, needBoss: q.need2.count,
        reward: q.reward, done: pk >= q.need.count && pb >= q.need2.count,
        claimed: w.claimed.indexOf(q.id) >= 0,
      };
    });
  },
  claimWeekly: function (state, id) {
    var joined = _joined(state);
    if (!joined) return { ok: false, reason: "khong_phai_tong" };
    var si = _si(state);
    var w = this._weekly(si);
    var q = null;
    this._weeklyDefs(joined).forEach(function (x) { if (x.id === id) q = x; });
    if (!q) return { ok: false, reason: "no_quest" };
    if (w.claimed.indexOf(id) >= 0) return { ok: false, reason: "da_nhan" };
    if ((w.progress.kill || 0) < q.need.count || (w.progress.killboss || 0) < q.need2.count)
      return { ok: false, reason: "chua_xong" };
    w.claimed.push(id);
    var rw = q.reward || {};
    if (rw.contrib) si.contrib = (si.contrib || 0) + rw.contrib;
    if (rw.stones) state.stones = (state.stones || 0) + rw.stones;
    return { ok: true, reward: rw };
  },
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = { SectQuest: SectQuest, SECT_RANKS: SECT_RANKS };
}

/* Browser global */
(function () {
  var _g2 = (typeof globalThis !== "undefined") ? globalThis : (typeof window !== "undefined" ? window : {});
  _g2.SectQuest = SectQuest;
  _g2.SECT_RANKS = SECT_RANKS;
})();
