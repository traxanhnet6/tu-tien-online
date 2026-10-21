/* ============================================================
 * js/lunarevents.js — HỆ THỐNG SỰ KIỆN THEO LỊCH ÂM
 * (Tết Nguyên Đán, Đoan Ngọ, Vu Lan, Trung Thu, Lễ Hội Tông Môn)
 *
 * LƯU Ý ĐẶT TÊN: js/events.js đã tồn tại (shop sự kiện theo lịch
 * dương) nên module này đặt tên js/lunarevents.js để không xung đột.
 * Dữ liệu: LUNAR_EVENTS (js/event_data.js). Text: js/lang_events.js.
 *
 * Chức năng:
 * - Tự kiểm tra ngày hiện tại, bật/tắt sự kiện (NPC ẩn/hiện theo mùa)
 * - Gộp quest + NPC sự kiện vào QUESTS/NPCS/MAPS lúc nạp (idempotent)
 * - Chặn nhận quest sự kiện khi hết mùa (wrap Quest.accept)
 * - Quà đăng nhập hàng ngày trong sự kiện (mỗi sự kiện 1 lần/ngày)
 * - Thưởng xếp hạng Lễ Hội Tông Môn theo cống hiến (mỗi tháng 1 lần)
 * - Banner khi có sự kiện đang diễn ra + lịch sự kiện xem trước
 * Node-safe: mọi truy cập DOM/state đều có guard.
 * ============================================================ */
(function (global) {
  "use strict";

  function _EVENTS() {
    try {
      if (typeof LUNAR_EVENTS !== "undefined" && LUNAR_EVENTS && LUNAR_EVENTS.length) return LUNAR_EVENTS;
    } catch (e) {}
    try {
      if (typeof global !== "undefined" && global.LUNAR_EVENTS && global.LUNAR_EVENTS.length) return global.LUNAR_EVENTS;
    } catch (e) {}
    /* Node: nạp trực tiếp từ event_data.js */
    try {
      if (typeof require === "function") {
        var ed = require("./event_data.js");
        if (ed && ed.LUNAR_EVENTS && ed.LUNAR_EVENTS.length) return ed.LUNAR_EVENTS;
      }
    } catch (e) {}
    return [];
  }
  function _state() { return typeof state !== "undefined" ? state : null; }
  function _t(key, params) {
    try { if (typeof t === "function") return t(key, params); } catch (e) {}
    return key;
  }
  function _pad(n) { return ("0" + n).slice(-2); }

  /* "YYYY-MM-DD" — dùng được cho so sánh chuỗi */
  function todayStr(d) {
    d = d || new Date();
    return d.getFullYear() + "-" + _pad(d.getMonth() + 1) + "-" + _pad(d.getDate());
  }
  function _today() {
    return todayStr();
  }

  function _addItem(st, id, qty) {
    try { if (typeof addItem === "function") { addItem(st, id, qty || 1); return; } } catch (e) {}
    st.bag = st.bag || [];
    for (var i = 0; i < st.bag.length; i++) {
      if (st.bag[i].id === id) { st.bag[i].qty += (qty || 1); return; }
    }
    st.bag.push({ id: id, qty: qty || 1, locked: false });
  }

  /* Khung ngày của sự kiện tại thời điểm ds.
   * Sự kiện tháng (monthly): tính theo tháng của ds.
   * Sự kiện cố định: trả về window chứa ds, hoặc null. */
  function rangeOf(ev, ds) {
    if (ev.monthly) {
      var y = ds.slice(0, 4), m = ds.slice(5, 7);
      return {
        start: y + "-" + m + "-" + _pad(ev.monthly.startDay),
        end: y + "-" + m + "-" + _pad(ev.monthly.endDay),
      };
    }
    if (!ev.dates) return null;
    for (var i = 0; i < ev.dates.length; i++) {
      var w = ev.dates[i];
      if (ds >= w.start && ds <= w.end) return { start: w.start, end: w.end };
    }
    return null;
  }

  function isActive(ev, ds) {
    ds = ds || _today();
    var r = rangeOf(ev, ds);
    if (!r) return false;
    return ds >= r.start && ds <= r.end;
  }

  function active(ds) {
    ds = ds || _today();
    return _EVENTS().filter(function (ev) { return isActive(ev, ds); });
  }

  function byId(id) {
    var list = _EVENTS();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  /* Window kế tiếp của sự kiện (kể cả monthly sang tháng sau) */
  function nextWindow(ev, ds) {
    ds = ds || _today();
    if (ev.monthly) {
      var y = parseInt(ds.slice(0, 4), 10), m = parseInt(ds.slice(5, 7), 10);
      var cur = y + "-" + _pad(m) + "-" + _pad(ev.monthly.startDay);
      var curEnd = y + "-" + _pad(m) + "-" + _pad(ev.monthly.endDay);
      if (ds <= curEnd) return { start: cur, end: curEnd };
      m++; if (m > 12) { m = 1; y++; }
      return {
        start: y + "-" + _pad(m) + "-" + _pad(ev.monthly.startDay),
        end: y + "-" + _pad(m) + "-" + _pad(ev.monthly.endDay),
      };
    }
    if (!ev.dates) return null;
    for (var i = 0; i < ev.dates.length; i++) {
      if (ev.dates[i].end >= ds) return ev.dates[i];
    }
    return null;
  }

  function _daysBetween(a, b) {
    var da = new Date(a.slice(0, 4), parseInt(a.slice(5, 7), 10) - 1, a.slice(8, 10));
    var db = new Date(b.slice(0, 4), parseInt(b.slice(5, 7), 10) - 1, b.slice(8, 10));
    return Math.round((db - da) / 86400000);
  }

  /* Sự kiện sắp diễn ra trong daysAhead ngày tới */
  function upcoming(ds, daysAhead) {
    ds = ds || _today();
    daysAhead = daysAhead || 30;
    var out = [];
    _EVENTS().forEach(function (ev) {
      if (isActive(ev, ds)) return;
      var w = nextWindow(ev, ds);
      if (!w) return;
      var d = _daysBetween(ds, w.start);
      if (d >= 0 && d <= daysAhead) out.push({ ev: ev, start: w.start, end: w.end, inDays: d });
    });
    out.sort(function (a, b) { return a.inDays - b.inDays; });
    return out;
  }

  /* ---------- State ---------- */
  function ensure(st) {
    st = st || _state();
    if (!st) return null;
    if (!st.lunarev) st.lunarev = { daily: {}, sectReward: null };
    if (!st.lunarev.daily) st.lunarev.daily = {};
    return st.lunarev;
  }

  /* ---------- Đăng ký quest + NPC (idempotent) ---------- */
  var _registered = false;
  function register() {
    try {
      var evs = _EVENTS();
      /* Quest → QUESTS */
      var QL = (typeof QUESTS !== "undefined" && QUESTS) ? QUESTS : null;
      if (QL) {
        evs.forEach(function (ev) {
          (ev.quests || []).forEach(function (q) {
            var found = false;
            for (var i = 0; i < QL.length; i++) if (QL[i].id === q.id) { found = true; break; }
            if (!found) QL.push(q);
          });
        });
      }
      /* NPC → NPCS */
      var NL = (typeof NPCS !== "undefined" && NPCS) ? NPCS : null;
      if (NL) {
        evs.forEach(function (ev) {
          if (ev.npc && ev.npc.id && !NL[ev.npc.id]) NL[ev.npc.id] = ev.npc;
        });
      }
      _registered = true;
    } catch (e) {}
    return _registered;
  }

  /* Ẩn/hiện NPC theo mùa: thêm/xóa id khỏi MAPS[x].npcs */
  function syncNpcs(ds) {
    ds = ds || _today();
    try {
      var ML = (typeof MAPS !== "undefined" && MAPS) ? MAPS : null;
      if (!ML) return 0;
      var changed = 0;
      _EVENTS().forEach(function (ev) {
        if (!ev.npc) return;
        var map = null;
        for (var i = 0; i < ML.length; i++) if (ML[i].id === ev.npc.mapId) { map = ML[i]; break; }
        if (!map || !map.npcs) return;
        var idx = map.npcs.indexOf(ev.npc.id);
        if (isActive(ev, ds)) {
          if (idx < 0) { map.npcs.push(ev.npc.id); changed++; }
        } else {
          if (idx >= 0) { map.npcs.splice(idx, 1); changed++; }
        }
      });
      if (changed > 0) {
        try {
          if (typeof Engine !== "undefined" && Engine && typeof Engine.refreshNpcs === "function") {
            Engine.refreshNpcs();
          }
        } catch (e) {}
      }
      return changed;
    } catch (e) { return 0; }
  }

  /* Chặn nhận quest sự kiện khi hết mùa (wrap, không sửa quest.js) */
  var _acceptWrapped = false;
  function wrapAccept() {
    if (_acceptWrapped) return;
    try {
      if (typeof Quest === "undefined" || !Quest.accept) return;
      var orig = Quest.accept;
      if (orig.__levHook) { _acceptWrapped = true; return; }
      var wrapped = function (st, id) {
        try {
          var q = Quest.def ? Quest.def(id) : null;
          if (q && q.event && typeof q.event === "string" && q.event.indexOf("lev_") === 0) {
            var ev = byId(q.event);
            if (ev && !isActive(ev)) return { ok: false, reason: "event_inactive" };
          }
        } catch (e) {}
        return orig.apply(this, arguments);
      };
      wrapped.__levHook = true;
      Quest.accept = wrapped;
      _acceptWrapped = true;
    } catch (e) {}
  }

  /* ---------- Quà đăng nhập hàng ngày ---------- */
  function canClaimDaily(evId, ds) {
    ds = ds || _today();
    var st = _state();
    if (!st) return false;
    var ev = byId(evId);
    if (!ev || !isActive(ev, ds)) return false;
    ensure(st);
    return st.lunarev.daily[evId] !== ds;
  }

  function claimDaily(evId) {
    var st = _state();
    var ds = _today();
    if (!st) return { ok: false, reason: "no_state" };
    var ev = byId(evId);
    if (!ev) return { ok: false, reason: "no_event" };
    if (!isActive(ev, ds)) return { ok: false, reason: "event_inactive" };
    ensure(st);
    if (st.lunarev.daily[evId] === ds) return { ok: false, reason: "already_claimed" };
    var g = ev.dailyGift || {};
    st.lunarev.daily[evId] = ds;
    st.stones = (st.stones || 0) + (g.stones || 0);
    (g.items || []).forEach(function (it) { _addItem(st, it.id, it.qty); });
    try { if (typeof saveGame === "function") saveGame(st); } catch (e) {}
    try { if (typeof sfx === "function") sfx("success"); } catch (e) {}
    try { if (typeof refreshHUD === "function") refreshHUD(); } catch (e) {}
    return { ok: true, stones: g.stones || 0, items: g.items || [] };
  }

  /* ---------- Xếp hạng Lễ Hội Tông Môn ---------- */
  /* Hạng theo cống hiến tông môn (state.sectInfo.contrib) */
  function playerRank(st) {
    st = st || _state();
    var c = 0;
    try { c = (st && st.sectInfo && st.sectInfo.contrib) || 0; } catch (e) {}
    if (c >= 5000) return 1;
    if (c >= 2000) return 2;
    if (c >= 800) return 3;
    return 4;
  }

  function sectEvent() { return byId("lev_lehoi"); }

  function canClaimSectReward(ds) {
    ds = ds || _today();
    var st = _state();
    if (!st) return false;
    var ev = sectEvent();
    if (!ev || !isActive(ev, ds)) return false;
    try {
      if (!st.sectInfo || !st.sectInfo.joined) return false;
    } catch (e) { return false; }
    ensure(st);
    return st.lunarev.sectReward !== ds.slice(0, 7);
  }

  function claimSectReward() {
    var st = _state();
    var ds = _today();
    if (!st) return { ok: false, reason: "no_state" };
    var ev = sectEvent();
    if (!ev) return { ok: false, reason: "no_event" };
    if (!isActive(ev, ds)) return { ok: false, reason: "event_inactive" };
    try {
      if (!st.sectInfo || !st.sectInfo.joined) return { ok: false, reason: "no_sect" };
    } catch (e) { return { ok: false, reason: "no_sect" }; }
    ensure(st);
    var ym = ds.slice(0, 7);
    if (st.lunarev.sectReward === ym) return { ok: false, reason: "already_claimed" };
    var rank = playerRank(st);
    var rw = null;
    (ev.rankRewards || []).forEach(function (r) {
      if (r.rank === rank) rw = r;
    });
    if (!rw) {
      /* hạng 4+ */
      for (var i = 0; i < (ev.rankRewards || []).length; i++) {
        if (ev.rankRewards[i].rank === 0) { rw = ev.rankRewards[i]; break; }
      }
    }
    if (!rw) return { ok: false, reason: "no_reward" };
    st.lunarev.sectReward = ym;
    st.stones = (st.stones || 0) + (rw.stones || 0);
    try {
      if (typeof gainExp === "function") gainExp(st, rw.exp || 0);
      else st.exp = (st.exp || 0) + (rw.exp || 0);
    } catch (e) {}
    (rw.items || []).forEach(function (it) { _addItem(st, it.id, it.qty); });
    try { if (typeof saveGame === "function") saveGame(st); } catch (e) {}
    try { if (typeof sfx === "function") sfx("success"); } catch (e) {}
    try { if (typeof refreshHUD === "function") refreshHUD(); } catch (e) {}
    return { ok: true, rank: rank, stones: rw.stones || 0, exp: rw.exp || 0, items: rw.items || [] };
  }

  /* ---------- UI: banner + lịch ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function bannerHtml(ds) {
    var act = active(ds);
    if (!act.length) return "";
    var h = '<div class="lev-banner">';
    h += '<div class="lev-banner-title">' + esc(_t("lev_banner_active")) + "</div>";
    act.forEach(function (ev) {
      var r = rangeOf(ev, ds || _today());
      var left = r ? _daysBetween(ds || _today(), r.end) : 0;
      var canDaily = canClaimDaily(ev.id, ds);
      h += '<div class="lev-banner-row" style="border-color:' + esc(ev.color || "#fff") + '">' +
        '<span class="lev-banner-icon">' + ev.icon + "</span>" +
        '<span class="lev-banner-name">' + esc(_t(ev.nameKey)) + "</span>" +
        '<span class="lev-banner-left">' + esc(_t("lev_days_left", { n: left })) + "</span>";
      if (canDaily) {
        h += ' <button class="btn small" data-levact="daily" data-evid="' + esc(ev.id) + '">' +
          esc(_t("lev_daily_claim")) + "</button>";
      } else {
        h += ' <span class="lev-daily-done">' + esc(_t("lev_daily_done")) + "</span>";
      }
      h += "</div>";
    });
    h += "</div>";
    return h;
  }

  function calendarHtml(ds) {
    ds = ds || _today();
    var h = '<div class="lev-cal">';
    h += '<div class="lev-cal-title">' + esc(_t("lev_calendar")) + "</div>";
    /* đang diễn ra */
    var act = active(ds);
    if (act.length) {
      h += '<div class="lev-cal-sec">' + esc(_t("lev_ongoing")) + "</div>";
      act.forEach(function (ev) {
        var r = rangeOf(ev, ds);
        h += levCalRow(ev, r.start + " → " + r.end, "ongoing");
      });
    }
    /* sắp diễn ra */
    var up = upcoming(ds, 90);
    if (up.length) {
      h += '<div class="lev-cal-sec">' + esc(_t("lev_upcoming")) + "</div>";
      up.forEach(function (u) {
        h += levCalRow(u.ev, u.start + " → " + u.end +
          " (" + esc(_t("lev_starts_in", { n: u.inDays })) + ")", "upcoming");
      });
    }
    if (!act.length && !up.length) {
      h += '<div class="lev-cal-empty">' + esc(_t("lev_no_event")) + "</div>";
    }
    h += "</div>";
    return h;
  }

  function levCalRow(ev, when, cls) {
    var h = '<div class="lev-cal-row lev-' + cls + '" style="border-color:' + esc(ev.color || "#fff") + '">';
    h += '<span class="lev-banner-icon">' + ev.icon + "</span>";
    h += '<div class="lev-cal-info"><b>' + esc(_t(ev.nameKey)) + "</b>";
    h += '<div class="lev-cal-desc">' + esc(_t(ev.descKey)) + "</div>";
    h += '<div class="lev-cal-when">' + esc(when) + " · " + esc(_t(ev.lunarKey)) + "</div>";
    h += '<div class="lev-cal-decor">' + esc(_t(ev.decorKey)) + "</div>";
    h += '<div class="lev-cal-quests"><b>' + esc(_t("lev_quest_chain")) + ":</b> " +
      (ev.quests || []).map(function (q) { return esc(_t(q.nameKey)); }).join(" → ") + "</div>";
    h += "</div></div>";
    return h;
  }

  /* CSS cho banner + lịch (tự inject, không sửa file css) */
  var _cssDone = false;
  function ensureCss() {
    if (_cssDone) return;
    try {
      if (typeof document === "undefined" || !document.head) return;
      if (document.getElementById("lev-css")) { _cssDone = true; return; }
      var css = document.createElement("style");
      css.id = "lev-css";
      css.textContent =
        "#lev-banner-mount{position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:9000;max-width:92vw}" +
        ".lev-banner{background:rgba(10,8,4,.92);border:1px solid #e9c86a;border-radius:10px;padding:8px 12px;color:#f5e9c8;box-shadow:0 4px 18px rgba(0,0,0,.5)}" +
        ".lev-banner-title{font-weight:bold;color:#e9c86a;margin-bottom:4px;font-size:14px}" +
        ".lev-banner-row{display:flex;align-items:center;gap:8px;border-left:3px solid;padding:4px 6px;margin:4px 0;background:rgba(255,255,255,.04);border-radius:4px;font-size:13px}" +
        ".lev-banner-icon{font-size:18px}" +
        ".lev-banner-name{font-weight:bold;flex:1}" +
        ".lev-banner-left{opacity:.75;font-size:12px}" +
        ".lev-daily-done{opacity:.6;font-size:12px}" +
        ".lev-cal{padding:6px}" +
        ".lev-cal-title{font-size:16px;font-weight:bold;color:#e9c86a;margin-bottom:8px}" +
        ".lev-cal-sec{font-weight:bold;margin:10px 0 4px;color:#ffd76a}" +
        ".lev-cal-row{display:flex;gap:8px;border-left:3px solid;padding:8px;margin:6px 0;background:rgba(255,255,255,.04);border-radius:6px}" +
        ".lev-cal-info{font-size:13px}" +
        ".lev-cal-desc{opacity:.8;margin:2px 0}" +
        ".lev-cal-when{opacity:.7;font-size:12px}" +
        ".lev-cal-decor{opacity:.7;font-size:12px;font-style:italic}" +
        ".lev-cal-quests{font-size:12px;margin-top:4px;color:#ffe9a8}" +
        ".lev-cal-empty{opacity:.6;font-style:italic}";
      document.head.appendChild(css);
      _cssDone = true;
    } catch (e) {}
  }

  /* Gắn banner vào DOM (guard kỹ, không phá UI hiện có) */
  function mountBanner() {
    try {
      if (typeof document === "undefined" || !document.body) return false;
      ensureCss();
      var act = active();
      var el = document.getElementById("lev-banner-mount");
      if (!act.length) {
        if (el && el.parentNode) el.parentNode.removeChild(el);
        return false;
      }
      if (!el) {
        el = document.createElement("div");
        el.id = "lev-banner-mount";
        document.body.appendChild(el);
      }
      el.innerHTML = bannerHtml();
      /* click nút nhận quà trong banner */
      var btns = el.querySelectorAll('[data-levact="daily"]');
      for (var i = 0; i < btns.length; i++) {
        (function (b) {
          b.onclick = function () {
            var r = claimDaily(b.getAttribute("data-evid"));
            try {
              if (typeof toast === "function") {
                toast(r.ok ? _t("lev_daily_ok", { stones: r.stones }) : _t("lev_daily_done"));
              }
            } catch (e) {}
            mountBanner();
          };
        })(btns[i]);
      }
      return true;
    } catch (e) { return false; }
  }

  /* Tick định kỳ: đồng bộ NPC + banner (gọi lúc nạp + mỗi 60s) */
  function tick() {
    register();
    wrapAccept();
    var ds = _today();
    syncNpcs(ds);
    mountBanner();
    return active(ds).map(function (ev) { return ev.id; });
  }

  var LunarEvents = {
    EVENTS: null, /* set sau khi LUNAR_EVENTS sẵn sàng */
    today: _today,
    todayStr: todayStr,
    rangeOf: rangeOf,
    isActive: isActive,
    active: active,
    upcoming: upcoming,
    nextWindow: nextWindow,
    byId: byId,
    ensure: ensure,
    register: register,
    syncNpcs: syncNpcs,
    wrapAccept: wrapAccept,
    canClaimDaily: canClaimDaily,
    claimDaily: claimDaily,
    playerRank: playerRank,
    canClaimSectReward: canClaimSectReward,
    claimSectReward: claimSectReward,
    bannerHtml: bannerHtml,
    calendarHtml: calendarHtml,
    mountBanner: mountBanner,
    tick: tick,
  };
  try { LunarEvents.EVENTS = _EVENTS(); } catch (e) {}

  /* Tự chạy lúc nạp (browser): đăng ký + tick; kiểm tra lại mỗi 60s */
  try {
    if (typeof window !== "undefined") {
      tick();
      setInterval(function () { try { tick(); } catch (e) {} }, 60000);
    }
  } catch (e) {}

  /* Browser global */
  try { global.LunarEvents = LunarEvents; } catch (e) {}

  /* Node.js export (smoke test) */
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { LunarEvents: LunarEvents };
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
