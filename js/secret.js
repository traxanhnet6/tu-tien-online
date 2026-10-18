/* ============================================================
 * js/secret.js — Bí Cảnh tranh đoạt theo lịch + Thông Thiên Giới
 * Thuần logic, không DOM, chạy được trên node (smoke test).
 * - 3 bí cảnh (Linh Dược Cốc / Khoáng Mạch Cổ / Yêu Đan Sào):
 *   mỗi cái mở 2 khung giờ/tuần, mỗi lần 60 phút.
 * - Trước giờ mở 30 phút: phase 'soon' (banner). Đang mở: 'open'.
 * - Tài nguyên giới hạn: N điểm/bí cảnh/lượt mở; người khác cũng
 *   tranh (giả lập): điểm bị lấy dần theo thời gian đã mở.
 * - Vào bí cảnh 1 lần/lượt mở; thu thập mỗi điểm 1 lần; có quà
 *   an ủi khi tham gia.
 * - Thông Thiên Giới: map id 13 trong MAPS (expMult 2, unlock realm 4).
 * Dữ liệu gốc: data/secret_realms.json (SECRET_REALMS mirror ở
 * data.js để chạy file:// + node; test kiểm tra 2 nơi đồng bộ).
 * ============================================================ */

var SECRET_DEF = {
  "realms": [
    {
      "id": "linh_duoc_coc", "icon": "🌿",
      "schedule": [{"day": 2, "start": "20:00"}, {"day": 5, "start": "20:00"}],
      "durationMin": 60, "soonMin": 30, "nodes": 24,
      "nodeItem": "that_diep_chi", "nodeQty": [1, 3],
      "unlock": {"realm": 2},
      "consolation": {"stones": 300, "items": [["thao_linh_chi", 3]]}
    },
    {
      "id": "khoang_mach_co", "icon": "⛏️",
      "schedule": [{"day": 3, "start": "12:00"}, {"day": 0, "start": "12:00"}],
      "durationMin": 60, "soonMin": 30, "nodes": 18,
      "nodeItem": "huyen_thiet", "nodeQty": [1, 2],
      "unlock": {"realm": 2},
      "consolation": {"stones": 300, "items": [["huyen_thiet", 1]]}
    },
    {
      "id": "yeu_dan_sao", "icon": "🟣",
      "schedule": [{"day": 4, "start": "20:00"}, {"day": 6, "start": "20:00"}],
      "durationMin": 60, "soonMin": 30, "nodes": 15,
      "nodeItem": "yaodan4", "nodeItemAlt": "yaodan5", "nodeAltRate": 0.25,
      "nodeQty": [1, 1],
      "unlock": {"realm": 3},
      "consolation": {"stones": 500, "items": [["yaodan2", 1]]}
    }
  ]
};

var Secret = (function () {
  "use strict";

  function _defs() {
    if (typeof SECRET_REALMS !== "undefined" && SECRET_REALMS && SECRET_REALMS.realms) {
      return SECRET_REALMS.realms;
    }
    return SECRET_DEF.realms;
  }
  function realm(id) {
    var ds = _defs();
    for (var i = 0; i < ds.length; i++) if (ds[i].id === id) return ds[i];
    return null;
  }
  function realmIds() {
    return _defs().map(function (r) { return r.id; });
  }

  /* ---------- thời gian ---------- */
  /* "20:00" → {h, m} */
  function _parseHM(s) {
    var p = String(s || "0:0").split(":");
    return { h: parseInt(p[0], 10) || 0, m: parseInt(p[1], 10) || 0 };
  }
  /* Lần mở slot (Date ms) gần now nhất theo hướng dir (-1: quá khứ, 0: tuần này, +1: tương lai) */
  function _slotDate(slot, nowMs, weekOff) {
    var now = new Date(nowMs);
    var hm = _parseHM(slot.start);
    var d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hm.h, hm.m, 0, 0);
    var diff = slot.day - d.getDay() + (weekOff || 0) * 7;
    d.setDate(d.getDate() + diff);
    return d.getTime();
  }
  /* Khóa định danh 1 lượt mở: "realmId@YYYYMMDD-HHmm" (giờ địa phương) */
  function slotKeyFor(realmId, slotStartMs) {
    var d = new Date(slotStartMs);
    function p2(n) { return (n < 10 ? "0" : "") + n; }
    return realmId + "@" + d.getFullYear() + p2(d.getMonth() + 1) + p2(d.getDate()) +
      "-" + p2(d.getHours()) + p2(d.getMinutes());
  }

  /* Trạng thái 1 bí cảnh tại nowMs:
     {phase:'open'|'soon'|'closed', slotKey, slotStartMs, msLeft, msUntilOpen} */
  function status(realmId, nowMs) {
    var r = realm(realmId);
    if (!r) return { phase: "closed", slotKey: null, msUntilOpen: -1 };
    nowMs = nowMs || Date.now();
    var durMs = (r.durationMin || 60) * 60000;
    var soonMs = (r.soonMin || 30) * 60000;
    var best = null;
    for (var s = 0; s < r.schedule.length; s++) {
      var slot = r.schedule[s];
      for (var w = -1; w <= 1; w++) {
        var st = _slotDate(slot, nowMs, w);
        if (nowMs >= st && nowMs < st + durMs) {
          return { phase: "open", slotKey: slotKeyFor(realmId, st),
                   slotStartMs: st, msLeft: st + durMs - nowMs, msUntilOpen: 0 };
        }
        if (st > nowMs && (!best || st < best)) best = st;
      }
    }
    if (best != null) {
      var until = best - nowMs;
      return { phase: until <= soonMs ? "soon" : "closed",
               slotKey: slotKeyFor(realmId, best), slotStartMs: best,
               msLeft: 0, msUntilOpen: until };
    }
    return { phase: "closed", slotKey: null, msUntilOpen: -1 };
  }

  /* Lịch tuần này (7 ngày tới) cho UI: [{realmId, day, start, slotStartMs, phase}] */
  function weekSchedule(nowMs) {
    nowMs = nowMs || Date.now();
    var out = [];
    _defs().forEach(function (r) {
      r.schedule.forEach(function (slot) {
        var st = _slotDate(slot, nowMs, 0);
        if (st < nowMs - (r.durationMin || 60) * 60000) st = _slotDate(slot, nowMs, 1);
        var stt = status(r.id, st + 1000);
        out.push({ realmId: r.id, day: slot.day, start: slot.start,
                   slotStartMs: st, phase: nowMs >= st && nowMs < st + (r.durationMin || 60) * 60000 ? "open" : "upcoming" });
      });
    });
    out.sort(function (a, b) { return a.slotStartMs - b.slotStartMs; });
    return out;
  }

  /* ---------- hash deterministic cho "người khác tranh" ---------- */
  function _hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  /* Điểm tài nguyên bị người khác lấy mất (tăng dần theo thời gian mở).
     Trả mảng bool dài nodeCount. */
  function takenByOthers(slotKey, nodeCount, elapsedMin) {
    var pct = Math.min(90, Math.max(0, elapsedMin) * 1.5); /* % điểm đã bị lấy */
    var out = [];
    for (var i = 0; i < nodeCount; i++) {
      out.push((_hash(slotKey + ":" + i) % 100) < pct);
    }
    return out;
  }

  /* ---------- state ---------- */
  function ensure(state) {
    if (!state) return state;
    if (!state.secret || typeof state.secret !== "object") state.secret = { claims: {} };
    if (!state.secret.claims || typeof state.secret.claims !== "object") state.secret.claims = {};
    return state;
  }
  function _slotRec(state, slotKey) {
    ensure(state);
    if (!state.secret.claims[slotKey]) {
      state.secret.claims[slotKey] = { entered: false, nodes: {}, consolation: false };
    }
    return state.secret.claims[slotKey];
  }
  /* Dọn các slot cũ hơn 8 ngày để save không phình */
  function prune(state, nowMs) {
    ensure(state);
    nowMs = nowMs || Date.now();
    var cutoff = nowMs - 8 * 86400000;
    Object.keys(state.secret.claims).forEach(function (k) {
      var m = k.match(/@(\d{4})(\d{2})(\d{2})-/);
      if (m) {
        var t = new Date(+m[1], +m[2] - 1, +m[3]).getTime();
        if (t < cutoff) delete state.secret.claims[k];
      }
    });
    return state;
  }

  function _realmRank(state) {
    return (state && state.char && state.char.realm) || 0;
  }
  /* Có được vào không (chưa check giờ mở) */
  function canEnter(state, realmId) {
    var r = realm(realmId);
    if (!r) return { ok: false, reason: "no_realm" };
    var need = (r.unlock && r.unlock.realm) || 0;
    if (_realmRank(state) < need) return { ok: false, reason: "locked", need: need };
    return { ok: true };
  }
  /* Vào bí cảnh (đang mở + đủ cảnh giới) */
  function enter(state, realmId, nowMs) {
    var ce = canEnter(state, realmId);
    if (!ce.ok) return ce;
    var st = status(realmId, nowMs);
    if (st.phase !== "open") return { ok: false, reason: st.phase === "soon" ? "not_open_yet" : "closed" };
    var rec = _slotRec(state, st.slotKey);
    rec.entered = true;
    prune(state, nowMs);
    return { ok: true, slotKey: st.slotKey, msLeft: st.msLeft };
  }

  /* Điểm còn lại có thể thu: {total, claimed, taken, available} */
  function nodesLeft(state, realmId, nowMs) {
    var r = realm(realmId);
    var st = status(realmId, nowMs);
    if (!r || st.phase !== "open") return { total: 0, claimed: 0, taken: 0, available: 0, slotKey: st.slotKey };
    var rec = _slotRec(state, st.slotKey);
    var elapsedMin = (nowMs - st.slotStartMs) / 60000;
    var taken = takenByOthers(st.slotKey, r.nodes, elapsedMin);
    var claimed = 0, takenN = 0, avail = 0;
    for (var i = 0; i < r.nodes; i++) {
      if (rec.nodes[i]) claimed++;
      else if (taken[i]) takenN++;
      else avail++;
    }
    return { total: r.nodes, claimed: claimed, taken: takenN, available: avail, slotKey: st.slotKey };
  }

  /* Thu 1 điểm tài nguyên (điểm trống có chỉ số nhỏ nhất) */
  function claimNode(state, realmId, nowMs, rng) {
    var r = realm(realmId);
    if (!r) return { ok: false, reason: "no_realm" };
    var st = status(realmId, nowMs);
    if (st.phase !== "open") return { ok: false, reason: "closed" };
    var rec = _slotRec(state, st.slotKey);
    if (!rec.entered) return { ok: false, reason: "not_entered" };
    var nl = nodesLeft(state, realmId, nowMs);
    if (nl.available <= 0) return { ok: false, reason: "depleted" };
    var elapsedMin = (nowMs - st.slotStartMs) / 60000;
    var taken = takenByOthers(st.slotKey, r.nodes, elapsedMin);
    var idx = -1;
    for (var i = 0; i < r.nodes; i++) {
      if (!rec.nodes[i] && !taken[i]) { idx = i; break; }
    }
    if (idx < 0) return { ok: false, reason: "depleted" };
    rec.nodes[idx] = true;
    var rand = (typeof rng === "function") ? rng() : Math.random();
    var itemId = r.nodeItem;
    if (r.nodeItemAlt && rand < (r.nodeAltRate || 0)) itemId = r.nodeItemAlt;
    var q = r.nodeQty || [1, 1];
    var qty = q[0] + Math.floor(rand * (q[1] - q[0] + 1));
    if (typeof addItem === "function") { try { addItem(state, itemId, qty); } catch (e) {} }
    return { ok: true, itemId: itemId, qty: qty, nodeIdx: idx, left: nl.available - 1 };
  }

  /* Quà an ủi khi tham gia (1 lần/lượt mở) */
  function giveConsolation(state, realmId, nowMs) {
    var r = realm(realmId);
    if (!r) return { ok: false, reason: "no_realm" };
    var st = status(realmId, nowMs);
    if (st.phase !== "open") return { ok: false, reason: "closed" };
    var rec = _slotRec(state, st.slotKey);
    if (!rec.entered) return { ok: false, reason: "not_entered" };
    if (rec.consolation) return { ok: false, reason: "already" };
    rec.consolation = true;
    var c = r.consolation || { stones: 0, items: [] };
    if (c.stones) state.stones = (state.stones || 0) + c.stones;
    (c.items || []).forEach(function (it) {
      var id = Array.isArray(it) ? it[0] : it.id, q = Array.isArray(it) ? it[1] : it.qty;
      if (typeof addItem === "function") { try { addItem(state, id, q || 1); } catch (e) {} }
    });
    return { ok: true, stones: c.stones || 0, items: c.items || [] };
  }

  /* Thông Thiên Giới: map id 13 — check nhanh */
  function thongThienGioiMapId() { return 13; }

  return {
    realm: realm, realmIds: realmIds,
    status: status, slotKeyFor: slotKeyFor, weekSchedule: weekSchedule,
    ensure: ensure, prune: prune,
    canEnter: canEnter, enter: enter,
    nodesLeft: nodesLeft, takenByOthers: takenByOthers,
    claimNode: claimNode, giveConsolation: giveConsolation,
    thongThienGioiMapId: thongThienGioiMapId,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = { Secret: Secret, SECRET_DEF: SECRET_DEF };
}
