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
