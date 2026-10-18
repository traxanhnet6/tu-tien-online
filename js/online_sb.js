/* ============================================================
 * js/online_sb.js — Cầu nối Supabase cho Bạn bè + Nhắn tin (MILESTONE 2)
 * Schema: supabase-schema.sql (profiles, friends, friend_requests, messages)
 *
 * Kiến trúc "local-mirror": state.social vẫn là nguồn duy nhất cho UI
 * (đồng bộ, không đổi interface Social). Module này chạy nền:
 *  - boot(state): đăng nhập ẩn danh → tạo/cập nhật profiles → pull lần đầu
 *  - pull(state): 30s/lần, gộp dữ liệu server vào state.social, đẩy
 *    sự kiện vào hàng đợi (UI lấy qua Social.mockTick như cũ)
 *  - push*: mỗi thao tác Social (kết bạn, nhắn tin, đổi tên) bắn
 *    fire-and-forget lên Supabase ngay sau khi đổi state local
 * Bạn bè: 1 hàng / tình bạn (user_id, friend_id) — RLS cho phép
 * 1 trong 2 bên đọc/ghi/xóa (migration supabase-migration-20261018-friends.sql).
 *
 * Chat thế giới vẫn dùng mock (chưa có bảng world_messages).
 * Quy tắc Linh Thạch: KHÔNG chuyển Linh Thạch giữa người chơi.
 * ============================================================ */
var OnlineSB = (function () {
  var sb = null;          // supabase client
  var uid = null;         // auth.users.id của mình
  var evtQueue = [];      // sự kiện chờ UI drain (shape như mockTick)
  var lastPull = 0;
  var booted = false;
  var idMap = {};         // charId (TT-XXXXXX) -> user_id (uuid)
  var uidMap = {};        // user_id -> profile {charId,name,...}
  var searchCache = { q: "", results: [], at: 0 };
  var PULL_MS = 30000;

  function log() { try { console.log.apply(console, ["[sb]"].concat([].slice.call(arguments))); } catch (e) {} }

  function active() { return !!(sb && uid); }

  function init() {
    try {
      if (typeof SUPABASE_CONFIG === "undefined" || !SUPABASE_CONFIG.enabled) return false;
      var g = typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : null);
      if (!g || !g.supabase || !g.supabase.createClient) return false;
      if (sb) return true;
      sb = g.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
      try {
        if (typeof Online !== "undefined" && Online.socialOnline) Online.socialOnline.enabled = true;
      } catch (e) {}
      return true;
    } catch (e) { return false; }
  }

  /* ---- profile ---- */
  async function ensureProfile(state) {
    var c = state.char || {};
    var row = {
      user_id: uid,
      char_id: c.charId,
      name: String(c.name || "Vô Danh").slice(0, 12),
      gender: c.gender === "nu" ? "nu" : "nam",
      sect: c.sect || "kiem",
      realm: c.realm || 1,
      tier: c.tier || 1,
      name_history: c.nameHistory || [],
      last_seen: new Date().toISOString(),
    };
    if (c.lastRenameAt) row.last_rename_at = new Date(c.lastRenameAt).toISOString();
    try {
      var ex = await sb.from("profiles").select("user_id").eq("user_id", uid).maybeSingle();
      if (ex.data) {
        var upd = Object.assign({}, row); delete upd.user_id; delete upd.char_id;
        await sb.from("profiles").update(upd).eq("user_id", uid);
        return;
      }
      var ins = await sb.from("profiles").insert(row);
      if (ins.error && /duplicate|unique/i.test(ins.error.message || "")) {
        /* tên bị trùng với người khác → thêm hậu tố */
        row.name = String(c.name || "Vô Danh").slice(0, 10) + "#" +
          Math.random().toString(36).slice(2, 4).toUpperCase();
        await sb.from("profiles").insert(row);
      }
    } catch (e) { log("ensureProfile", e && e.message); }
  }

  /* Lấy profile theo charId (có cache) */
  async function profileOf(charId) {
    if (!charId) return null;
    if (uidMap[idMap[charId]]) return uidMap[idMap[charId]];
    try {
      var r = await sb.from("profiles")
        .select("user_id,char_id,name,gender,sect,realm,tier,last_seen")
        .eq("char_id", charId).maybeSingle();
      if (r.data) {
        var p = row2prof(r.data);
        idMap[p.charId] = p.uid; uidMap[p.uid] = p;
        return p;
      }
    } catch (e) {}
    return null;
  }

  function row2prof(r) {
    return {
      uid: r.user_id, charId: r.char_id, name: r.name, gender: r.gender,
      sect: r.sect, realm: r.realm, tier: r.tier,
      online: r.last_seen ? (Date.now() - new Date(r.last_seen).getTime() < 5 * 60000) : false,
    };
  }

  async function hydrateMaps(userIds) {
    var need = [];
    (userIds || []).forEach(function (id) { if (id && !uidMap[id]) need.push(id); });
    if (!need.length) return;
    try {
      var r = await sb.from("profiles")
        .select("user_id,char_id,name,gender,sect,realm,tier,last_seen")
        .in("user_id", need.slice(0, 100));
      (r.data || []).forEach(function (row) {
        var p = row2prof(row);
        idMap[p.charId] = p.uid; uidMap[p.uid] = p;
      });
    } catch (e) {}
  }

  /* ---- pull: gộp server → state.social, sinh events ---- */
  async function pull(state, silent) {
    if (!active() || !state || !state.char) return;
    try {
      var soc = (typeof Social !== "undefined") ? Social._soc(state) : null;
      if (!soc) return;
      var oldFriendIds = {};
      soc.friends.forEach(function (f) { oldFriendIds[f.id] = 1; });
      var oldReqIn = {};
      soc.requestsIn.forEach(function (r) { oldReqIn[r.id] = 1; });

      /* bạn bè: 1 hàng / tình bạn, mình có thể ở cột user_id hoặc friend_id */
      var fr = await sb.from("friends").select("user_id,friend_id")
        .or("user_id.eq." + uid + ",friend_id.eq." + uid);
      var fids = (fr.data || []).map(function (x) {
        return x.user_id === uid ? x.friend_id : x.user_id;
      });
      await hydrateMaps(fids);
      var newFriends = [];
      fids.forEach(function (fid) {
        var p = uidMap[fid];
        if (!p) return;
        var keep = null;
        for (var i = 0; i < soc.friends.length; i++)
          if (soc.friends[i].id === p.charId) { keep = soc.friends[i]; break; }
        var f = keep || { id: p.charId, addedAt: Date.now() };
        f.name = p.name; f.gender = p.gender; f.sect = p.sect;
        f.realm = p.realm; f.tier = p.tier; f.online = p.online;
        newFriends.push(f);
        if (!oldFriendIds[p.charId] && !silent)
          evtQueue.push({ type: "friend_accepted", id: p.charId, name: p.name });
      });
      soc.friends = newFriends;

      /* lời mời đến */
      var ri = await sb.from("friend_requests")
        .select("from_id,created_at").eq("to_id", uid).eq("status", "pending");
      var fromIds = (ri.data || []).map(function (x) { return x.from_id; });
      await hydrateMaps(fromIds);
      var newReqIn = [];
      (ri.data || []).forEach(function (x) {
        var p = uidMap[x.from_id];
        if (!p) return;
        newReqIn.push({ id: p.charId, name: p.name, at: new Date(x.created_at).getTime() });
        if (!oldReqIn[p.charId] && !silent)
          evtQueue.push({ type: "request_in", id: p.charId, name: p.name });
      });
      soc.requestsIn = newReqIn;

      /* lời mời đã gửi (để UI đánh dấu "requested") */
      var ro = await sb.from("friend_requests")
        .select("to_id,created_at").eq("from_id", uid).eq("status", "pending");
      var toIds = (ro.data || []).map(function (x) { return x.to_id; });
      await hydrateMaps(toIds);
      soc.requestsOut = (ro.data || []).map(function (x) {
        var p = uidMap[x.to_id];
        return p ? { id: p.charId, name: p.name, at: new Date(x.created_at).getTime() } : null;
      }).filter(Boolean);

      /* tin nhắn 1-1 (100 tin gần nhất) */
      var mg = await sb.from("messages").select("id,from_id,to_id,text,created_at")
        .or("from_id.eq." + uid + ",to_id.eq." + uid)
        .order("created_at", { ascending: false }).limit(100);
      var msgs = (mg.data || []).reverse();
      var others = [];
      msgs.forEach(function (m) {
        var o = m.from_id === uid ? m.to_id : m.from_id;
        if (others.indexOf(o) < 0) others.push(o);
      });
      await hydrateMaps(others);
      msgs.forEach(function (m) {
        var otherUid = m.from_id === uid ? m.to_id : m.from_id;
        var p = uidMap[otherUid];
        if (!p) return;
        var th = soc.threads[p.charId] = soc.threads[p.charId] || [];
        var at = new Date(m.created_at).getTime();
        var isMe = m.from_id === uid;
        /* dedup: tin "me" đã bắn optimistic-local */
        var dup = th.some(function (x) {
          return x.text === m.text && Math.abs(x.at - at) < 120000 &&
                 ((x.from === "me") === isMe);
        });
        if (dup) return;
        th.push({
          from: isMe ? "me" : "them",
          name: isMe ? state.char.name : p.name,
          text: m.text, at: at,
        });
        if (th.length > 50) soc.threads[p.charId] = th.slice(-50);
        if (!isMe && !silent) {
          soc.unread[p.charId] = (soc.unread[p.charId] || 0) + 1;
          evtQueue.push({ type: "message", id: p.charId, name: p.name });
        }
      });

      /* chạm last_seen của mình */
      sb.from("profiles").update({ last_seen: new Date().toISOString() }).eq("user_id", uid)
        .then(function () {}, function () {});
      lastPull = Date.now();
    } catch (e) { log("pull", e && e.message); }
  }

  function maybePull(state) {
    if (!active()) return;
    if (Date.now() - lastPull < PULL_MS) return;
    pull(state, false);
  }

  function drainEvents() {
    var ev = evtQueue; evtQueue = [];
    return ev;
  }

  /* ---- boot ---- */
  async function boot(state) {
    if (booted) return active();
    booted = true;
    if (!init()) return false;
    try {
      var s = await sb.auth.getSession();
      if (!s.data.session) {
        var r = await sb.auth.signInAnonymously();
        if (r.error) throw r.error;
      }
      var u = await sb.auth.getUser();
      if (!u.data.user) return false;
      uid = u.data.user.id;
      /* đảm bảo nhân vật có charId trước khi tạo profile */
      try {
        if (typeof Social !== "undefined") Social.ensureCharId(state);
      } catch (e) {}
      await ensureProfile(state);
      await pull(state, true);
      log("online as", uid);
      return true;
    } catch (e) { log("boot", e && e.message); return false; }
  }

  /* ---- push (fire-and-forget) ---- */
  function pushFriendRequest(charId) {
    if (!active()) return;
    profileOf(charId).then(function (p) {
      if (!p) return;
      sb.from("friend_requests")
        .insert({ from_id: uid, to_id: p.uid, status: "pending" })
        .then(function () {}, function () {});
    });
  }
  function pushCancelRequest(charId) {
    if (!active()) return;
    profileOf(charId).then(function (p) {
      if (!p) return;
      sb.from("friend_requests").delete()
        .eq("from_id", uid).eq("to_id", p.uid).eq("status", "pending")
        .then(function () {}, function () {});
    });
  }
  function pushAccept(charId) {
    if (!active()) return;
    profileOf(charId).then(function (p) {
      if (!p) return;
      sb.from("friend_requests").update({ status: "accepted" })
        .eq("from_id", p.uid).eq("to_id", uid).eq("status", "pending")
        .then(function () {
          /* 1 hàng / tình bạn */
          sb.from("friends").insert({ user_id: uid, friend_id: p.uid })
            .then(function () {}, function () {});
        }, function () {});
    });
  }
  function pushDecline(charId) {
    if (!active()) return;
    profileOf(charId).then(function (p) {
      if (!p) return;
      sb.from("friend_requests").update({ status: "declined" })
        .eq("from_id", p.uid).eq("to_id", uid).eq("status", "pending")
        .then(function () {}, function () {});
    });
  }
  function pushRemoveFriend(charId) {
    if (!active()) return;
    profileOf(charId).then(function (p) {
      if (!p) return;
      sb.from("friends").delete()
        .or("and(user_id.eq." + uid + ",friend_id.eq." + p.uid + ")," +
            "and(user_id.eq." + p.uid + ",friend_id.eq." + uid + ")")
        .then(function () {}, function () {});
    });
  }
  function pushMessage(charId, text) {
    if (!active()) return;
    profileOf(charId).then(function (p) {
      if (!p || !text) return;
      sb.from("messages").insert({ from_id: uid, to_id: p.uid, text: String(text).slice(0, 500) })
        .then(function () {}, function () {});
    });
  }
  function pushRename(state, newName) {
    if (!active()) return;
    (async function () {
      try {
        var c = state.char || {};
        var hist = (c.nameHistory || []).slice(-20);
        var r = await sb.from("profiles").update({
          name: newName, name_history: hist,
          last_rename_at: new Date().toISOString(),
          last_seen: new Date().toISOString(),
        }).eq("user_id", uid);
        if (r.error && /duplicate|unique/i.test(r.error.message || "")) {
          /* tên trùng online → giữ tên local, báo qua console */
          log("rename: name taken online");
        }
      } catch (e) {}
    })();
  }
  function pushProfile(state) {
    if (!active()) return;
    ensureProfile(state);
  }

  /* ---- tìm kiếm online (async, có cache cho UI đồng bộ) ---- */
  function searchOnline(q, onDone) {
    if (!active()) { if (onDone) onDone([]); return; }
    q = String(q || "").trim();
    (async function () {
      try {
        var r = await sb.from("profiles")
          .select("user_id,char_id,name,gender,sect,realm,tier,last_seen")
          .neq("user_id", uid)
          .or("name.ilike.%" + q.replace(/[%_]/g, "") + "%,char_id.ilike.%" +
              q.toUpperCase().replace(/[%_]/g, "") + "%")
          .limit(20);
        var out = (r.data || []).map(function (row) {
          var p = row2prof(row);
          idMap[p.charId] = p.uid; uidMap[p.uid] = p;
          return {
            id: p.charId, name: p.name, gender: p.gender, sect: p.sect,
            realm: p.realm, tier: p.tier, online: p.online,
            isFriend: false, requested: false,
          };
        });
        searchCache = { q: q, results: out, at: Date.now() };
        if (onDone) onDone(out);
      } catch (e) { if (onDone) onDone([]); }
    })();
  }
  function searchCached(q) {
    return (searchCache.q === String(q || "").trim()) ? searchCache.results : null;
  }

  return {
    active: active,
    boot: boot,
    pull: pull,
    maybePull: maybePull,
    drainEvents: drainEvents,
    pushFriendRequest: pushFriendRequest,
    pushCancelRequest: pushCancelRequest,
    pushAccept: pushAccept,
    pushDecline: pushDecline,
    pushRemoveFriend: pushRemoveFriend,
    pushMessage: pushMessage,
    pushRename: pushRename,
    pushProfile: pushProfile,
    searchOnline: searchOnline,
    searchCached: searchCached,
    myUid: function () { return uid; },
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = { OnlineSB: OnlineSB };
}
