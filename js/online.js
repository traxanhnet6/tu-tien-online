/* ============================================================
 * js/online.js — Lớp API trừu tượng cho backend.
 * Giai đoạn 1: stub lưu localStorage trên máy người chơi.
 * Giai đoạn 2: thay bằng Supabase (đăng nhập, lưu mây, xếp hạng)
 * mà KHÔNG đổi interface: Online.save(state) / Online.load().
 * ============================================================ */
const Online = (function () {
  const KEY = "ttonline_v2_save";
  return {
    /* Lưu toàn bộ state (đồng bộ ở stub; sau này trả Promise cũng được) */
    save: function (state) {
      try {
        localStorage.setItem(KEY, JSON.stringify(state));
        return true;
      } catch (e) { return false; }
    },
    /* Đọc save. Trả null nếu chưa có */
    load: function () {
      try {
        const raw = localStorage.getItem(KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) { return null; }
    },
    hasSave: function () {
      try { return !!localStorage.getItem(KEY); } catch (e) { return false; }
    },
    wipe: function () {
      try { localStorage.removeItem(KEY); } catch (e) {}
    },
    /* Chợ Vạn Tiên Các — milestone 2: listing lên Supabase, khớp lệnh thật.
       Giữ nguyên interface với market.js (list/buy/cancel/search). */
    marketOnline: {
      enabled: false, /* milestone 1: false → dùng market.js local */
      list: function () { return Promise.resolve([]); },
      publish: function () { return Promise.resolve({ ok: false, reason: "offline" }); },
      buy: function () { return Promise.resolve({ ok: false, reason: "offline" }); },
      cancel: function () { return Promise.resolve({ ok: false, reason: "offline" }); },
    },
    /* Bạn bè + nhắn tin — milestone 2: cắm Supabase thật.
       Schema: supabase-schema.sql (profiles, friends, friend_requests, messages).
       RLS: mỗi user chỉ đọc/ghi hàng của mình; char_id unique chống trùng ID.
       Quy tắc Linh Thạch: KHÔNG chuyển Linh Thạch trực tiếp giữa người chơi. */
    socialOnline: {
      enabled: false, /* milestone 1: false → dùng Social mock (social.js) */
      /* Tìm người chơi theo tên/ID (ilike) */
      searchPlayers: function () { return Promise.resolve({ ok: false, reason: "offline" }); },
      sendFriendRequest: function () { return Promise.resolve({ ok: false, reason: "offline" }); },
      acceptFriendRequest: function () { return Promise.resolve({ ok: false, reason: "offline" }); },
      declineFriendRequest: function () { return Promise.resolve({ ok: false, reason: "offline" }); },
      removeFriend: function () { return Promise.resolve({ ok: false, reason: "offline" }); },
      listFriends: function () { return Promise.resolve({ ok: false, reason: "offline" }); },
      /* Chat 1-1: gửi + realtime (supabase realtime channel) */
      sendMessage: function () { return Promise.resolve({ ok: false, reason: "offline" }); },
      fetchThread: function () { return Promise.resolve({ ok: false, reason: "offline" }); },
      /* Đổi tên online: check trùng qua profiles.name unique + lưu lịch sử */
      renameOnline: function () { return Promise.resolve({ ok: false, reason: "offline" }); },
    },
    /* Sau này: bảng xếp hạng, chat thế giới, giftcode server-side */
    leaderboard: function () { return []; },
    /* Donate: milestone 1 chưa có server → log + báo chờ duyệt.
       Milestone 2: POST mã giao dịch lên server vào hàng đợi duyệt. */
    submitDonate: function (ma_giao_dich) {
      try { console.log("[donate] ma_giao_dich:", ma_giao_dich); } catch (e) {}
      return { ok: true, pending: true };
    },
  };
})();

if (typeof module !== "undefined" && module.exports) {
  // Stub localStorage cho môi trường node (smoke test)
  if (typeof localStorage === "undefined") {
    global.localStorage = {
      _d: {},
      getItem: function (k) { return this._d[k] || null; },
      setItem: function (k, v) { this._d[k] = String(v); },
      removeItem: function (k) { delete this._d[k]; },
    };
  }
  module.exports = Online;
}
