/* ============================================================
 * js/secretbook.js — LỊCH LUYỆN BÍ CẢNH (đặt lịch trước)
 * Thuần logic, không DOM, chạy được trên node (smoke test).
 *
 * - Mỗi bí cảnh có các KHUNG GIỜ MỞ CỐ ĐỊNH mỗi ngày
 *   (vd Linh Dược Cốc: 08:00–10:00, 14:00–16:00, 20:00–22:00).
 *   Nguồn khung giờ: realm.dailyWindows (nếu hệ 9 bí cảnh định nghĩa)
 *   → bảng SECRETBOOK_DEF.windows → khung mặc định.
 * - Người chơi ĐẶT LỊCH trước (hôm nay / ngày mai, tối đa
 *   maxBookingsPerDay lịch/ngày).
 * - Đặt lịch → ƯU TIÊN vào + EXP +priorityExpPct% trong khung đã đặt.
 * - tick(): nhắc trước remindMin phút (UI hiện toast).
 * - checkin(): gọi khi vào bí cảnh — khớp khung đã đặt thì đánh dấu
 *   đã dùng, bật bonus EXP, ghi lịch sử. Không đặt vẫn ghi lịch sử.
 * - recordBoss(): hệ 9 bí cảnh gọi khi hạ boss → hiện trong lịch sử.
 * - stats(): thống kê mỗi bí cảnh (số lần đi, số lần ưu tiên, boss đã hạ).
 * ============================================================ */

var SECRETBOOK_DEF = {
  maxBookingsPerDay: 3,   /* tối đa lịch đặt mỗi ngày */
  remindMin: 10,          /* nhắc trước 10 phút */
  priorityExpPct: 10,     /* ưu tiên đặt lịch: +10% EXP */
  bookAheadDays: 2,       /* được đặt hôm nay + ngày mai */
  soonMin: 30,            /* khung "sắp mở" trong vòng 30 phút */
  windows: {
    linh_duoc_coc: [["08:00", "10:00"], ["14:00", "16:00"], ["20:00", "22:00"]],
    khoang_mach_co: [["09:00", "11:00"], ["15:00", "17:00"], ["21:00", "23:00"]],
    yeu_dan_sao:   [["10:00", "12:00"], ["16:00", "18:00"], ["22:00", "23:30"]]
  },
  defaultWindows: [["08:00", "10:00"], ["20:00", "22:00"]]
};

var SecretBook = (function () {
  "use strict";

  function _def() { return SECRETBOOK_DEF; }

  function _realmIds() {
    var ids = [];
    if (typeof Secret !== "undefined" && Secret.realmIds) ids = Secret.realmIds().slice();
    Object.keys(_def().windows).forEach(function (id) {
      if (ids.indexOf(id) < 0) ids.push(id);
    });
    return ids;
  }
  function _realmDef(id) {
    if (typeof Secret !== "undefined" && Secret.realm) {
      var r = Secret.realm(id);
      if (r) return r;
    }
    return { id: id, icon: "\uD83C\uDF00", nameKey: null };
  }
  /* Khung giờ/ngày của 1 bí cảnh */
  function windowsFor(realmId) {
    var rd = _realmDef(realmId);
    if (rd && rd.dailyWindows && rd.dailyWindows.length) return rd.dailyWindows;
    var w = _def().windows[realmId];
    if (w && w.length) return w;
    return _def().defaultWindows;
  }
  function _parseHM(s) {
    var p = String(s || "0:0").split(":");
    return { h: parseInt(p[0], 10) || 0, m: parseInt(p[1], 10) || 0 };
  }
  function _dateStr(ms) {
    var d = new Date(ms);
    function p2(n) { return (n < 10 ? "0" : "") + n; }
    return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate());
  }
  function _dayStart(ms) {
    var d = new Date(ms);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  /* ms bắt đầu/kết thúc của khung winIdx trong ngày dayStartMs (0h ngày đó) */
  function windowMs(realmId, dayStartMs, winIdx) {
    var w = windowsFor(realmId)[winIdx];
    if (!w) return null;
    var a = _parseHM(w[0]), b = _parseHM(w[1]);
    return {
      start: dayStartMs + (a.h * 60 + a.m) * 60000,
      end: dayStartMs + (b.h * 60 + b.m) * 60000
    };
  }
  function slotKeyFor(realmId, startMs) {
    var d = new Date(startMs);
    function p2(n) { return (n < 10 ? "0" : "") + n; }
    return realmId + "@" + d.getFullYear() + p2(d.getMonth() + 1) + p2(d.getDate()) +
      "-" + p2(d.getHours()) + p2(d.getMinutes());
  }

  /* Lịch các khung trong 1 ngày:
     [{realmId, win, start, end, phase: open|soon|upcoming|done, msLeft, msUntil}] */
  function daySchedule(dateMs, nowMs) {
    nowMs = nowMs || Date.now();
    var ds = _dayStart(dateMs), out = [], soonMs = _def().soonMin * 60000;
    _realmIds().forEach(function (id) {
      windowsFor(id).forEach(function (w, i) {
        var wm = windowMs(id, ds, i);
        var phase = nowMs >= wm.end ? "done" :
                    nowMs >= wm.start ? "open" :
                    nowMs >= wm.start - soonMs ? "soon" : "upcoming";
        out.push({
          realmId: id, win: i, start: wm.start, end: wm.end, phase: phase,
          msLeft: Math.max(0, wm.end - nowMs), msUntil: Math.max(0, wm.start - nowMs)
        });
      });
    });
    out.sort(function (a, b) { return a.start - b.start; });
    return out;
  }

  /* ---------- state ---------- */
  function ensure(state) {
    if (!state) return state;
    if (!state.secretBook || typeof state.secretBook !== "object")
      state.secretBook = { bookings: [], history: [], bonus: null };
    var sb = state.secretBook;
    if (!Array.isArray(sb.bookings)) sb.bookings = [];
    if (!Array.isArray(sb.history)) sb.history = [];
    return state;
  }
  function _canEnter(state, realmId) {
    if (typeof Secret !== "undefined" && Secret.canEnter) return Secret.canEnter(state, realmId);
    return { ok: true };
  }

  /* Đặt lịch: dateMs là 1 thời điểm trong ngày muốn đặt (hôm nay / ngày mai) */
  var _bid = 0;
  function book(state, realmId, dateMs, winIdx, nowMs) {
    ensure(state);
    nowMs = nowMs || Date.now();
    if (_realmIds().indexOf(realmId) < 0) return { ok: false, reason: "no_realm" };
    var ce = _canEnter(state, realmId);
    if (!ce.ok) return { ok: false, reason: "locked", need: ce.need };
    var ds = _dayStart(dateMs), todayDs = _dayStart(nowMs);
    var dayOff = Math.round((ds - todayDs) / 86400000);
    if (dayOff < 0 || dayOff >= _def().bookAheadDays) return { ok: false, reason: "bad_day" };
    var wm = windowMs(realmId, ds, winIdx);
    if (!wm) return { ok: false, reason: "bad_window" };
    if (wm.start <= nowMs + 60000) return { ok: false, reason: "past" };
    var sb = state.secretBook, dstr = _dateStr(ds), i;
    for (i = 0; i < sb.bookings.length; i++) {
      var b = sb.bookings[i];
      if (!b.used && b.date === dstr && b.realmId === realmId && b.win === winIdx)
        return { ok: false, reason: "dup" };
    }
    var cnt = 0;
    sb.bookings.forEach(function (x) {
      if (!x.used && x.date === dstr && x.start > nowMs) cnt++;
    });
    if (cnt >= _def().maxBookingsPerDay)
      return { ok: false, reason: "full", max: _def().maxBookingsPerDay };
    _bid++;
    var bk = {
      id: "bk" + nowMs + "_" + _bid, realmId: realmId, date: dstr, win: winIdx,
      start: wm.start, end: wm.end, used: false, reminded: false, createdAt: nowMs
    };
    sb.bookings.push(bk);
    prune(state, nowMs);
    return { ok: true, booking: bk };
  }
  function cancelBook(state, bookId) {
    ensure(state);
    var sb = state.secretBook;
    for (var i = 0; i < sb.bookings.length; i++) {
      if (sb.bookings[i].id === bookId) {
        if (sb.bookings[i].used) return { ok: false, reason: "used" };
        sb.bookings.splice(i, 1);
        return { ok: true };
      }
    }
    return { ok: false, reason: "not_found" };
  }
  function upcomingBookings(state, nowMs) {
    ensure(state);
    nowMs = nowMs || Date.now();
    return state.secretBook.bookings
      .filter(function (b) { return !b.used && b.end > nowMs; })
      .sort(function (a, b) { return a.start - b.start; });
  }
  /* Nhắc trước remindMin phút — trả về các booking tới giờ nhắc (đánh dấu đã nhắc) */
  function tick(state, nowMs) {
    ensure(state);
    nowMs = nowMs || Date.now();
    var due = [], rm = _def().remindMin * 60000;
    state.secretBook.bookings.forEach(function (b) {
      if (!b.used && !b.reminded && b.start > nowMs && b.start - nowMs <= rm) {
        b.reminded = true;
        due.push(b);
      }
    });
    if (due.length) prune(state, nowMs);
    return due;
  }
  /* Vào bí cảnh: khớp khung đã đặt → ưu tiên + bonus EXP, luôn ghi lịch sử */
  function checkin(state, realmId, nowMs) {
    ensure(state);
    nowMs = nowMs || Date.now();
    var sb = state.secretBook, dstr = _dateStr(nowMs), found = null, i;
    for (i = 0; i < sb.bookings.length; i++) {
      var b = sb.bookings[i];
      if (!b.used && b.realmId === realmId && b.date === dstr &&
          nowMs >= b.start && nowMs < b.end) { found = b; break; }
    }
    var priority = false;
    if (found) {
      found.used = true;
      priority = true;
      sb.bonus = { mult: 1 + _def().priorityExpPct / 100, until: found.end };
    }
    sb.history.unshift({
      realmId: realmId, at: nowMs,
      slotKey: slotKeyFor(realmId, found ? found.start : nowMs),
      priority: priority, boss: null
    });
    if (sb.history.length > 200) sb.history.length = 200;
    prune(state, nowMs);
    return { priority: priority, mult: priority ? sb.bonus.mult : 1 };
  }
  /* Ghi nhận hạ boss (hệ 9 bí cảnh gọi khi đánh boss xong) */
  function recordBoss(state, realmId, bossName, nowMs) {
    ensure(state);
    nowMs = nowMs || Date.now();
    var h = state.secretBook.history, i;
    for (i = 0; i < h.length; i++) {
      if (h[i].realmId === realmId && !h[i].boss) { h[i].boss = bossName; return { ok: true }; }
    }
    h.unshift({
      realmId: realmId, at: nowMs,
      slotKey: slotKeyFor(realmId, nowMs), priority: false, boss: bossName
    });
    return { ok: true };
  }
  /* Hệ số EXP hiện tại (gainExp trong state.js gọi qua hook) */
  function expMult(state) {
    if (!state || !state.secretBook || !state.secretBook.bonus) return 1;
    var b = state.secretBook.bonus;
    return Date.now() < b.until ? b.mult : 1;
  }
  /* Thống kê mỗi bí cảnh: số lần đi, số lần ưu tiên, boss đã hạ */
  function stats(state) {
    ensure(state);
    var out = {};
    _realmIds().forEach(function (id) {
      out[id] = { entries: 0, priority: 0, bosses: [] };
    });
    state.secretBook.history.forEach(function (h) {
      var s = out[h.realmId] ||
        (out[h.realmId] = { entries: 0, priority: 0, bosses: [] });
      s.entries++;
      if (h.priority) s.priority++;
      if (h.boss && s.bosses.indexOf(h.boss) < 0) s.bosses.push(h.boss);
    });
    return out;
  }
  /* Dọn booking/history cũ để save không phình */
  function prune(state, nowMs) {
    ensure(state);
    nowMs = nowMs || Date.now();
    var sb = state.secretBook;
    sb.bookings = sb.bookings.filter(function (b) { return b.end > nowMs - 86400000; });
    var cut = nowMs - 30 * 86400000;
    sb.history = sb.history.filter(function (h) { return h.at > cut; });
    if (sb.bonus && nowMs >= sb.bonus.until) sb.bonus = null;
    return state;
  }

  return {
    DEF: SECRETBOOK_DEF,
    realmIds: _realmIds,
    windowsFor: windowsFor,
    windowMs: windowMs,
    daySchedule: daySchedule,
    slotKeyFor: slotKeyFor,
    ensure: ensure,
    book: book,
    cancelBook: cancelBook,
    upcomingBookings: upcomingBookings,
    tick: tick,
    checkin: checkin,
    recordBoss: recordBoss,
    expMult: expMult,
    stats: stats,
    prune: prune
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = { SecretBook: SecretBook, SECRETBOOK_DEF: SECRETBOOK_DEF };
}
