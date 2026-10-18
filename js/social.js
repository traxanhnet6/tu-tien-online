/* ============================================================
 * js/social.js — Bạn bè + nhắn tin + ID nhân vật + đổi tên/giới tính
 * THUẦN LOGIC, không DOM (ui.js vẽ giao diện).
 * Phụ thuộc: state.js (genCharId, removeItem, countItem)
 * Offline (milestone 1): localStorage + người chơi mẫu tự trả lời.
 * Online (milestone 2): Online.socialOnline cắm Supabase thật
 * (schema: supabase-schema.sql) mà KHÔNG đổi interface ở đây.
 * ============================================================ */

/* --- Dependency từ state.js (browser: global sẵn; node: require) --- */
var _SO = null;
if (typeof genCharId === "undefined" && typeof require !== "undefined") {
  try { _SO = require("./state.js"); } catch (e) {}
}
function _sdep(name) {
  if (typeof globalThis !== "undefined" && typeof globalThis[name] === "function") return globalThis[name];
  if (_SO && typeof _SO[name] === "function") return _SO[name];
  throw new Error("missing dep: " + name);
}
/* Cầu nối Supabase (online_sb.js, milestone 2): fire-and-forget, không vỡ khi offline */
function _sbPush(fn) {
  try { if (typeof OnlineSB !== "undefined" && OnlineSB.active()) fn(OnlineSB); } catch (e) {}
}
/* Node shim cho localStorage (giống online.js) */
if (typeof module !== "undefined" && module.exports && typeof localStorage === "undefined") {
  global.localStorage = {
    _d: {},
    getItem: function (k) { return this._d[k] || null; },
    setItem: function (k, v) { this._d[k] = String(v); },
    removeItem: function (k) { delete this._d[k]; },
  };
}

var Social = {
  /* ================= ID NHÂN VẬT ================= */
  REG_KEY: "ttonline_v2_charids",

  _regLoad: function () {
    try {
      var raw = localStorage.getItem(this.REG_KEY);
      var a = raw ? JSON.parse(raw) : [];
      return Array.isArray(a) ? a : [];
    } catch (e) { return []; }
  },
  _regSave: function (reg) {
    try { localStorage.setItem(this.REG_KEY, JSON.stringify(reg.slice(-5000))); } catch (e) {}
  },
  /* Đăng ký ID vào sổ địa phương (chống trùng offline) */
  registerId: function (id) {
    if (!id) return;
    var reg = this._regLoad();
    if (reg.indexOf(id) < 0) { reg.push(id); this._regSave(reg); }
  },
  isIdTaken: function (id) {
    return this._regLoad().indexOf(id) >= 0;
  },
  /* Đảm bảo nhân vật có ID duy nhất (save cũ tự sinh khi load lần đầu).
     ID KHÔNG bao giờ đổi — kể cả khi đổi tên/giới tính. */
  ensureCharId: function (state) {
    var c = state && state.char;
    if (!c) return null;
    if (c.charId && _sdep("isValidCharId")(c.charId)) {
      this.registerId(c.charId);
      return c.charId;
    }
    var gen = _sdep("genCharId"), id = null, tries = 0;
    do { id = gen(); tries++; } while (this.isIdTaken(id) && tries < 50);
    c.charId = id;
    this.registerId(id);
    return id;
  },
  /* ID rút gọn hiển thị trong chat: "TT-8X4K2N" → "…4K2N" */
  shortId: function (id) {
    id = String(id || "");
    return id.length > 4 ? "…" + id.slice(-4) : id;
  },

  /* ================= LỌC TỪ NGỮ ================= */
  BANNED_WORDS: [
    "địt", "đéo", "đụ", "lồn", "cặc", "buồi", "dái", "óc chó", "óc lợn",
    "mẹ mày", "bố mày", "con cặc", "thằng ngu", "con ngu", "đồ ngu",
    "fuck", "shit", "bitch", "asshole", "dick", "pussy", "bastard",
    "whore", "slut", "cunt", "dumbass", "motherfucker",
  ],
  containsBanned: function (text) {
    var t = String(text || "").toLowerCase();
    return this.BANNED_WORDS.some(function (w) { return t.indexOf(w) >= 0; });
  },
  /* Che từ cấm bằng *** (chat vẫn gửi được) */
  censor: function (text) {
    var out = String(text || "");
    this.BANNED_WORDS.forEach(function (w) {
      var re = new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      out = out.replace(re, "***");
    });
    return out;
  },
  /* Tên nhân vật: 2-12 ký tự, không từ cấm */
  checkPlayerName: function (name) {
    name = String(name || "").trim();
    if (name.length < 2 || name.length > 12) return { ok: false, reason: "invalid" };
    if (this.containsBanned(name)) return { ok: false, reason: "banned" };
    return { ok: true, name: name };
  },

  /* ================= ĐỔI TÊN (Thẻ Đổi Tên) ================= */
  RENAME_CARD: "the_doi_ten",
  RENAME_COOLDOWN_DAYS: 15,
  /* Lần đầu FREE; các lần sau mỗi 15 ngày (kể cả có thẻ cũng phải chờ) */
  canRename: function (state) {
    var c = state.char;
    if (!c.renameFreeUsed) return { ok: true, free: true, waitDays: 0 };
    var last = c.lastRenameAt || 0;
    var days = (Date.now() - last) / 86400000;
    if (days >= this.RENAME_COOLDOWN_DAYS) return { ok: true, free: false, waitDays: 0 };
    return { ok: false, free: false, waitDays: Math.ceil(this.RENAME_COOLDOWN_DAYS - days) };
  },
  doRename: function (state, newName) {
    var chk = this.checkPlayerName(newName);
    if (!chk.ok) return { ok: false, reason: chk.reason };
    var cr = this.canRename(state);
    if (!cr.ok) return { ok: false, reason: "cooldown", waitDays: cr.waitDays };
    if (!cr.free) {
      /* tốn 1 thẻ */
      if (_sdep("countItem")(state, this.RENAME_CARD) < 1)
        return { ok: false, reason: "no_card" };
      _sdep("removeItem")(state, this.RENAME_CARD, 1);
    }
    var c = state.char;
    c.nameHistory = c.nameHistory || [];
    c.nameHistory.push({ name: c.name, at: Date.now() });
    if (c.nameHistory.length > 20) c.nameHistory = c.nameHistory.slice(-20);
    c.name = chk.name;
    c.lastRenameAt = Date.now();
    c.renameFreeUsed = true;
    /* bản online (milestone 2): tên mới check trùng qua Supabase unique */
    _sbPush(function (SB) { SB.pushRename(state, chk.name); });
    return { ok: true, free: cr.free };
  },

  /* ================= ĐỔI GIỚI TÍNH (Thẻ Đổi Giới Tính) ================= */
  GENDER_CARD: "the_doi_gioi_tinh",
  /* Không giới hạn 15 ngày như đổi tên — có thẻ là đổi được */
  doGenderChange: function (state, gender) {
    if (gender !== "nam" && gender !== "nu") return { ok: false, reason: "invalid" };
    if (state.char.gender === gender) return { ok: false, reason: "same" };
    if (_sdep("countItem")(state, this.GENDER_CARD) < 1)
      return { ok: false, reason: "no_card" };
    _sdep("removeItem")(state, this.GENDER_CARD, 1);
    state.char.gender = gender;
    return { ok: true };
  },
  /* Xưng hô NPC theo giới tính: thường (huynh/muội) | trang trọng (công tử/cô nương) */
  xungHoKey: function (gender, formal) {
    if (formal) return gender === "nu" ? "xung_co_nuong" : "xung_cong_tu";
    return gender === "nu" ? "xung_muoi" : "xung_huynh";
  },

  /* ================= NGƯỜI CHƠI MẪU (demo offline) ================= */
  SAMPLE_PLAYERS: [
    { id: "TT-7K2M9Q", name: "Kiếm Vô Danh", gender: "nam", sect: "kiem", realm: 2, tier: 1, online: true },
    { id: "TT-3P8X2R", name: "Linh Nhi", gender: "nu", sect: "phap", realm: 1, tier: 9, online: true },
    { id: "TT-9Q4Z7W", name: "Hắc Phong", gender: "nam", sect: "the", realm: 2, tier: 0, online: false },
    { id: "TT-2N5K8M", name: "Dược Lão", gender: "nam", sect: "phap", realm: 3, tier: 2, online: true },
    { id: "TT-6H3T9P", name: "Thanh Vân", gender: "nam", sect: "kiem", realm: 1, tier: 5, online: false },
    { id: "TT-4W7R2K", name: "Mộng Dao", gender: "nu", sect: "phap", realm: 2, tier: 2, online: true },
    { id: "TT-8F5N3H", name: "Lôi Chấn", gender: "nam", sect: "the", realm: 1, tier: 11, online: false },
    { id: "TT-5D9V4J", name: "Bạch Y", gender: "nam", sect: "kiem", realm: 2, tier: 0, online: true },
  ],
  MOCK_LINES: [
    { vi: "Đạo hữu khỏe không?", en: "How are you, fellow cultivator?" },
    { vi: "Vừa nhặt được bí tịch Địa phẩm!", en: "Just found an Earth-grade manual!" },
    { vi: "Đi phụ bản chung không?", en: "Want to run a dungeon together?" },
    { vi: "Hôm nay farm được bao nhiêu Linh Thạch?", en: "How many Spirit Stones did you farm today?" },
    { vi: "Chuẩn bị đột phá Trúc Cơ đây!", en: "About to break through to Foundation Establishment!" },
    { vi: "Boss vừa hồi sinh ở Hắc Phong Lâm!", en: "A boss just respawned in Black Wind Forest!" },
    { vi: "Đạo hữu ở map nào thế?", en: "Which map are you on?" },
  ],
  _lang: function () {
    try { return (typeof LANG_CUR !== "undefined" && LANG_CUR) || "vi"; } catch (e) { return "vi"; }
  },
  _mockLine: function (randFn) {
    var r = randFn || Math.random;
    var l = this.MOCK_LINES[Math.floor(r() * this.MOCK_LINES.length)];
    return l[this._lang()] || l.vi;
  },

  /* ================= STATE SOCIAL ================= */
  _soc: function (state) {
    if (!state.social) state.social = this.defaultSocial();
    var s = state.social;
    if (!s.friends) s.friends = [];
    if (!s.requestsIn) s.requestsIn = [];
    if (!s.requestsOut) s.requestsOut = [];
    if (!s.threads) s.threads = {};
    if (!s.world) s.world = [];
    if (!s.unread) s.unread = {};
    if (s.lastMsgAt == null) s.lastMsgAt = 0;
    return s;
  },
  defaultSocial: function () {
    return { friends: [], requestsIn: [], requestsOut: [], threads: {}, world: [], unread: {}, lastMsgAt: 0 };
  },
  _sampleById: function (id) {
    for (var i = 0; i < this.SAMPLE_PLAYERS.length; i++)
      if (this.SAMPLE_PLAYERS[i].id === id) return this.SAMPLE_PLAYERS[i];
    return null;
  },

  /* Tìm người chơi theo tên hoặc ID (không gồm chính mình).
     Online (milestone 2): query Supabase async, trả cache đồng bộ cho UI;
     kết quả mới về qua Social._onSearchDone để UI vẽ lại. */
  _onSearchDone: null,
  _annotatePlayers: function (list, state) {
    var soc = this._soc(state);
    var friendIds = {}, reqOutIds = {};
    soc.friends.forEach(function (f) { friendIds[f.id] = 1; });
    soc.requestsOut.forEach(function (r) { reqOutIds[r.id] = 1; });
    return list.map(function (p) {
      return {
        id: p.id, name: p.name, gender: p.gender, sect: p.sect,
        realm: p.realm, tier: p.tier, online: p.online,
        isFriend: !!friendIds[p.id], requested: !!reqOutIds[p.id],
      };
    });
  },
  searchPlayers: function (query, state) {
    var q = String(query || "").trim();
    if (!q) return [];
    var me = state.char.charId;
    if (typeof OnlineSB !== "undefined" && OnlineSB.active()) {
      var self = this;
      var cached = OnlineSB.searchCached(q);
      OnlineSB.searchOnline(q, function (res) {
        try {
          var ann = self._annotatePlayers(
            res.filter(function (p) { return p.id !== me; }), state);
          if (self._onSearchDone) self._onSearchDone(q, ann);
        } catch (e) {}
      });
      if (cached)
        return this._annotatePlayers(
          cached.filter(function (p) { return p.id !== me; }), state);
      return [];
    }
    var soc = this._soc(state);
    var qUp = q.toUpperCase();
    var list = this.SAMPLE_PLAYERS.filter(function (p) {
      if (p.id === me) return false;
      return p.name.toLowerCase().indexOf(q.toLowerCase()) >= 0 ||
             p.id.toUpperCase().indexOf(qUp) >= 0;
    });
    return this._annotatePlayers(list, state);
  },

  /* ================= KẾT BẠN ================= */
  sendRequest: function (state, playerId) {
    var soc = this._soc(state);
    if (playerId === state.char.charId) return { ok: false, reason: "self" };
    if (soc.friends.some(function (f) { return f.id === playerId; }))
      return { ok: false, reason: "already" };
    if (soc.requestsOut.some(function (r) { return r.id === playerId; }))
      return { ok: false, reason: "requested" };
    var p = this._sampleById(playerId);
    if (!p) return { ok: false, reason: "notfound" };
    soc.requestsOut.push({ id: p.id, name: p.name, at: Date.now() });
    /* demo offline: bạn mẫu tự chấp nhận sau vài giây */
    soc._pendingAccept = soc._pendingAccept || [];
    soc._pendingAccept.push({ id: p.id, at: Date.now() + 4000 + Math.random() * 6000 });
    _sbPush(function (SB) { SB.pushFriendRequest(playerId); });
    return { ok: true };
  },
  cancelRequest: function (state, playerId) {
    var soc = this._soc(state);
    soc.requestsOut = soc.requestsOut.filter(function (r) { return r.id !== playerId; });
    if (soc._pendingAccept)
      soc._pendingAccept = soc._pendingAccept.filter(function (p) { return p.id !== playerId; });
    _sbPush(function (SB) { SB.pushCancelRequest(playerId); });
    return { ok: true };
  },
  acceptRequest: function (state, playerId) {
    var soc = this._soc(state);
    var i = -1;
    for (var k = 0; k < soc.requestsIn.length; k++)
      if (soc.requestsIn[k].id === playerId) { i = k; break; }
    if (i < 0) return { ok: false, reason: "notfound" };
    var r = soc.requestsIn.splice(i, 1)[0];
    var p = this._sampleById(playerId) || {};
    soc.friends.push({
      id: r.id, name: r.name, gender: p.gender || "nam", sect: p.sect || "kiem",
      realm: p.realm || 1, tier: p.tier || 1, online: p.online !== false,
      addedAt: Date.now(),
    });
    _sbPush(function (SB) { SB.pushAccept(playerId); });
    return { ok: true };
  },
  declineRequest: function (state, playerId) {
    var soc = this._soc(state);
    soc.requestsIn = soc.requestsIn.filter(function (r) { return r.id !== playerId; });
    _sbPush(function (SB) { SB.pushDecline(playerId); });
    return { ok: true };
  },
  removeFriend: function (state, friendId) {
    var soc = this._soc(state);
    soc.friends = soc.friends.filter(function (f) { return f.id !== friendId; });
    delete soc.threads[friendId];
    delete soc.unread[friendId];
    _sbPush(function (SB) { SB.pushRemoveFriend(friendId); });
    return { ok: true };
  },
  getFriend: function (state, friendId) {
    var soc = this._soc(state);
    for (var i = 0; i < soc.friends.length; i++)
      if (soc.friends[i].id === friendId) return soc.friends[i];
    return null;
  },
  pendingInCount: function (state) {
    return this._soc(state).requestsIn.length;
  },

  /* ================= NHẮN TIN 1-1 ================= */
  SPAM_MS: 5000,
  MAX_THREAD: 50,
  sendMessage: function (state, friendId, text) {
    var soc = this._soc(state);
    text = String(text || "").trim();
    if (!text) return { ok: false, reason: "empty" };
    if (!this.getFriend(state, friendId)) return { ok: false, reason: "notfriend" };
    var now = Date.now();
    if (now - soc.lastMsgAt < this.SPAM_MS)
      return { ok: false, reason: "spam", waitSec: Math.ceil((this.SPAM_MS - (now - soc.lastMsgAt)) / 1000) };
    soc.lastMsgAt = now;
    var th = soc.threads[friendId] = soc.threads[friendId] || [];
    /* tin nhắn cũ giữ tên lúc gửi (lưu name tại thời điểm gửi) */
    var censored = this.censor(text);
    th.push({ from: "me", name: state.char.name, text: censored, at: now });
    if (th.length > this.MAX_THREAD) soc.threads[friendId] = th.slice(-this.MAX_THREAD);
    _sbPush(function (SB) { SB.pushMessage(friendId, censored); });
    /* demo offline: bạn mẫu trả lời sau 2-5 giây */
    soc._pendingReply = soc._pendingReply || [];
    if (this._sampleById(friendId))
      soc._pendingReply.push({ id: friendId, at: now + 2000 + Math.random() * 3000 });
    return { ok: true };
  },
  getThread: function (state, friendId) {
    return (this._soc(state).threads[friendId] || []).slice();
  },
  markRead: function (state, friendId) {
    this._soc(state).unread[friendId] = 0;
  },
  totalUnread: function (state) {
    var n = 0, u = this._soc(state).unread;
    Object.keys(u).forEach(function (k) { n += u[k] || 0; });
    return n;
  },
  /* Tick giả lập realtime (ui.js gọi mỗi vài giây). Trả về sự kiện để UI báo.
     Online (milestone 2): lấy sự kiện thật từ OnlineSB thay vì mock. */
  mockTick: function (state, randFn) {
    if (typeof OnlineSB !== "undefined" && OnlineSB.active()) {
      try { return OnlineSB.drainEvents(); } catch (e) { return []; }
    }
    var soc = this._soc(state), now = Date.now(), evts = [];
    var r = randFn || Math.random, self = this;
    /* lời mời đã gửi → bạn mẫu chấp nhận */
    (soc._pendingAccept || []).forEach(function (p) {
      if (now >= p.at) {
        var s = self._sampleById(p.id);
        if (s) {
          soc.requestsOut = soc.requestsOut.filter(function (x) { return x.id !== p.id; });
          soc.friends.push({
            id: s.id, name: s.name, gender: s.gender, sect: s.sect,
            realm: s.realm, tier: s.tier, online: s.online, addedAt: now,
          });
          evts.push({ type: "friend_accepted", id: s.id, name: s.name });
        }
        p.done = true;
      }
    });
    soc._pendingAccept = (soc._pendingAccept || []).filter(function (p) { return !p.done; });
    /* tin nhắn trả lời */
    (soc._pendingReply || []).forEach(function (p) {
      if (now >= p.at) {
        var f = self.getFriend(state, p.id);
        if (f) {
          var th = soc.threads[p.id] = soc.threads[p.id] || [];
          th.push({ from: "them", name: f.name, text: self._mockLine(r), at: now });
          if (th.length > self.MAX_THREAD) soc.threads[p.id] = th.slice(-self.MAX_THREAD);
          soc.unread[p.id] = (soc.unread[p.id] || 0) + 1;
          evts.push({ type: "message", id: p.id, name: f.name });
        }
        p.done = true;
      }
    });
    soc._pendingReply = (soc._pendingReply || []).filter(function (p) { return !p.done; });
    /* thỉnh thoảng có lời mời đến từ bạn mẫu */
    if (r() < 0.02) {
      var cands = self.SAMPLE_PLAYERS.filter(function (s) {
        return s.id !== state.char.charId &&
               !soc.friends.some(function (f) { return f.id === s.id; }) &&
               !soc.requestsIn.some(function (x) { return x.id === s.id; });
      });
      if (cands.length) {
        var c = cands[Math.floor(r() * cands.length)];
        soc.requestsIn.push({ id: c.id, name: c.name, at: now });
        evts.push({ type: "request_in", id: c.id, name: c.name });
      }
    }
    /* đảo trạng thái online cho sinh động */
    if (r() < 0.05 && soc.friends.length) {
      var f2 = soc.friends[Math.floor(r() * soc.friends.length)];
      f2.online = !f2.online;
    }
    return evts;
  },

  /* ================= CHAT THẾ GIỚI ================= */
  MAX_WORLD: 50,
  sendWorld: function (state, text) {
    var soc = this._soc(state);
    text = String(text || "").trim();
    if (!text) return { ok: false, reason: "empty" };
    var now = Date.now();
    if (now - soc.lastMsgAt < this.SPAM_MS)
      return { ok: false, reason: "spam", waitSec: Math.ceil((this.SPAM_MS - (now - soc.lastMsgAt)) / 1000) };
    soc.lastMsgAt = now;
    soc.world.push({ name: state.char.name, charId: state.char.charId, text: this.censor(text), at: now, me: true });
    if (soc.world.length > this.MAX_WORLD) soc.world = soc.world.slice(-this.MAX_WORLD);
    return { ok: true };
  },
  getWorld: function (state) {
    return this._soc(state).world.slice();
  },
  mockWorldTick: function (state, randFn) {
    var soc = this._soc(state), r = randFn || Math.random;
    if (r() < 0.25) {
      var s = this.SAMPLE_PLAYERS[Math.floor(r() * this.SAMPLE_PLAYERS.length)];
      if (s.id === state.char.charId) return;
      soc.world.push({ name: s.name, charId: s.id, text: this._mockLine(r), at: Date.now(), me: false });
      if (soc.world.length > this.MAX_WORLD) soc.world = soc.world.slice(-this.MAX_WORLD);
    }
  },
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = { Social: Social };
}
