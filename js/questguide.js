/* ============================================================
 * js/questguide.js — Bảng hướng dẫn nhiệm vụ (quest tracker) +
 *   mũi tên chỉ đường + tutorial tương tác tân thủ
 * (Bui yêu cầu 2026-10-18: "không có hướng dẫn làm nhiệm vụ tân thủ")
 *
 * Thiết kế: module độc lập, tự bọc (wrap) Quest.accept/turnIn/onKill
 *   và openPanel — KHÔNG sửa js/ui.js, js/engine.js, js/quest.js.
 * Phụ thuộc: data.js (QUESTS, MAPS), state.js (state), lang.js (t),
 *   ui.js (toast, openPanel, sfx), engine.js (Engine).
 *
 * Node: export logic thuần để smoke test.
 * ============================================================ */

var QuestGuide = (function () {
  'use strict';

  /* ---------- helpers (browser + node) ---------- */
  function _quests() {
    try { if (typeof QUESTS !== "undefined") return QUESTS; } catch (e) {}
    if (_DM && _DM.QUESTS) return _DM.QUESTS;
    return [];
  }
  var _DM = null;
  if (typeof MAPS === "undefined" && typeof require !== "undefined") {
    try { _DM = require("./data.js"); } catch (e) {}
  }
  function _maps() {
    try { if (typeof MAPS !== "undefined") return MAPS; } catch (e) {}
    if (_DM && _DM.MAPS) return _DM.MAPS;
    return [];
  }
  function _t(key, params) {
    try { if (typeof t === "function") return t(key, params); } catch (e) {}
    return key;
  }
  function _state() {
    try {
      if (typeof globalThis !== "undefined" && globalThis.state !== undefined) return globalThis.state;
    } catch (e) {}
    return null;
  }
  function _engine() {
    try { if (typeof Engine !== "undefined") return Engine; } catch (e) {}
    return null;
  }
  function _qdef(id) {
    var list = _quests();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function _isStory(id) { return typeof id === "string" && id.indexOf("q_story_") === 0; }

  /* Quest cốt truyện đang active (ưu tiên số thứ tự nhỏ nhất) */
  function activeStoryQuest(state) {
    var qs = (state && state.quests) || {};
    var best = null;
    Object.keys(qs).forEach(function (id) {
      if (!_isStory(id)) return;
      var s = qs[id];
      if (!s || s.status !== "active") return;
      var q = _qdef(id);
      if (!q) return;
      if (!best || id < best.id) best = q;
    });
    return best;
  }

  /* Tiến độ hiển thị: {cur, need} hoặc null */
  function questProgress(state, q) {
    if (!q) return null;
    var need = q.need || {};
    var s = ((state && state.quests) || {})[q.id] || {};
    if (need.type === "kill") return { cur: s.count || 0, need: need.count };
    if (need.type === "item") {
      var has = 0;
      try {
        if (typeof countItem === "function") has = countItem(state, need.item);
        else if (state && state.bag) {
          for (var i = 0; i < state.bag.length; i++)
            if (state.bag[i] && state.bag[i].id === need.item) has += state.bag[i].qty || 1;
        }
      } catch (e) {}
      return { cur: has, need: need.count };
    }
    return null; /* talk: không có tiến độ số */
  }

  /* Quest đã đủ điều kiện trả chưa? */
  function questReadyToTurnIn(state, q) {
    if (!q) return false;
    var s = ((state && state.quests) || {})[q.id] || {};
    if (!s || s.status !== "active") return false;
    var need = q.need || { type: "talk" };
    if (need.type === "kill") return (s.count || 0) >= need.count;
    if (need.type === "item") {
      var pg = questProgress(state, q);
      return pg && pg.cur >= pg.need;
    }
    if (need.type === "joinsect") {
      try {
        if (typeof Sect !== "undefined" && Sect.joinedSect) return !!Sect.joinedSect(state);
      } catch (e) {}
      return !!(state.sectInfo && state.sectInfo.joined);
    }
    return true; /* talk */
  }

  /* Tìm map chứa NPC */
  function npcMap(npcId) {
    var maps = _maps();
    for (var i = 0; i < maps.length; i++) {
      if ((maps[i].npcs || []).indexOf(npcId) >= 0) return maps[i].id;
    }
    return null;
  }

  /* Tìm map + bãi chứa loại quái */
  function monsterZone(monId) {
    var maps = _maps();
    for (var i = 0; i < maps.length; i++) {
      var zones = maps[i].spawnZones || [];
      for (var j = 0; j < zones.length; j++) {
        if ((zones[j].monsters || []).indexOf(monId) >= 0)
          return { map: maps[i].id, x: zones[j].x, y: zones[j].y, r: zones[j].r || 150 };
      }
      if ((maps[i].monsters || []).indexOf(monId) >= 0)
        return { map: maps[i].id, x: 800, y: 600, r: 400 };
    }
    return null;
  }

  /* BFS tìm đường qua cổng giữa các map */
  function findPath(fromMap, toMap) {
    if (fromMap === toMap) return [fromMap];
    var maps = _maps();
    var adj = {};
    maps.forEach(function (m) {
      adj[m.id] = [];
      (m.gates || []).forEach(function (g) {
        if (adj[m.id].indexOf(g.to) < 0) adj[m.id].push(g.to);
      });
    });
    var prev = {}, seen = {}, queue = [fromMap];
    seen[fromMap] = true;
    while (queue.length) {
      var cur = queue.shift();
      var nexts = adj[cur] || [];
      for (var i = 0; i < nexts.length; i++) {
        var nx = nexts[i];
        if (seen[nx]) continue;
        seen[nx] = true; prev[nx] = cur;
        if (nx === toMap) {
          var path = [toMap], p = toMap;
          while (p !== fromMap) { p = prev[p]; path.unshift(p); }
          return path;
        }
        queue.push(nx);
      }
    }
    return null;
  }

  /* Mục tiêu hiện tại của quest: {kind:'npc'|'monster'|'gate', ...} */
  function questTarget(state, q, curMapId) {
    if (!q) return null;
    var ready = questReadyToTurnIn(state, q);
    var need = q.need || { type: "talk" };
    /* Ưu tiên 1: đã xong việc → về gặp NPC trả quest */
    if (ready && q.npc) {
      var nm = npcMap(q.npc);
      return { kind: "npc", npcId: q.npc, map: nm };
    }
    /* Ưu tiên 2: cần giết quái → bãi quái */
    if (need.type === "kill" && need.monster) {
      var z = monsterZone(need.monster);
      if (z) return { kind: "monster", monId: need.monster, map: z.map, x: z.x, y: z.y };
    }
    /* Ưu tiên 3: cần item → bãi quái rớt item (mặc định bãi gần nhất map 0) */
    if (need.type === "item") {
      /* taycothao rớt từ quái quanh map 0 */
      var z2 = monsterZone("da_tru");
      if (z2) return { kind: "monster", monId: "da_tru", map: z2.map, x: z2.x, y: z2.y, farmItem: need.item };
    }
    /* Mặc định: đến gặp NPC */
    if (q.npc) {
      var nm2 = npcMap(q.npc);
      return { kind: "npc", npcId: q.npc, map: nm2 };
    }
    return null;
  }

  /* Đã hoàn thành toàn bộ chuỗi tân thủ (q_story_11 done)? */
  function storyChainDone(state) {
    var s = ((state && state.quests) || {})["q_story_11"];
    return !!(s && s.status === "done");
  }

  /* Tên cảnh giới tiếp theo để tu luyện */
  function nextRealmName(state) {
    try {
      var ch = (state && state.char) || {};
      if (typeof stageName === "function") {
        /* Gợi ý tầng tiếp theo của Luyện Khí, hoặc cảnh giới kế tiếp */
        var realm = ch.realm || 0, tier = ch.tier || 0;
        if (realm === 1 && tier < 12) return stageName(1, tier + 1);
        return stageName(realm + 1, realm + 1 === 1 ? 1 : 0);
      }
    } catch (e) {}
    return "";
  }

  /* ---------- Tutorial steps (thuần data) ---------- */
  function tutorialSteps() {
    return [
      { id: "move",  tx: "qg_tut_move" },
      { id: "atk",   tx: "qg_tut_atk" },
      { id: "skill", tx: "qg_tut_skill" },
      { id: "bag",   tx: "qg_tut_bag" },
      { id: "quest", tx: "qg_tut_quest" },
    ];
  }
  function tutorialDone(state) {
    return !!(state && state.flags && state.flags.tutorial_steps_done);
  }

  /* ============================================================
   * PHẦN DOM (browser only)
   * ============================================================ */
  var _trackerEl = null, _arrowEl = null, _coachEl = null;
  var _tickTimer = null, _tutIdx = -1, _tutStartPos = null, _flashT = 0;

  function _css() {
    return "" +
    "#qg-tracker{position:fixed;left:8px;top:132px;z-index:5000;max-width:250px;" +
    "background:linear-gradient(180deg,rgba(42,31,20,.94),rgba(26,19,12,.94));" +
    "border:2px solid #c9a227;border-radius:12px;padding:8px 10px;color:#f3e6c8;" +
    "font-size:13px;line-height:1.5;box-shadow:0 2px 12px rgba(0,0,0,.5);cursor:pointer;}" +
    "#qg-tracker .qg-t{color:#ffd76a;font-weight:bold;font-size:13px;}" +
    "#qg-tracker .qg-p{color:#9fe08a;}" +
    "#qg-tracker .qg-rw{color:#bfa76a;font-size:12px;}" +
    "#qg-tracker .qg-go{color:#7fd0ff;font-size:12px;}" +
    "#qg-tracker.flash{animation:qgflash .8s ease 2;}" +
    "@keyframes qgflash{0%,100%{box-shadow:0 2px 12px rgba(0,0,0,.5);}50%{box-shadow:0 0 22px rgba(255,215,106,.9);border-color:#ffe9a8;}}" +
    "#qg-arrow{position:fixed;z-index:4999;width:0;height:0;pointer-events:none;" +
    "border-left:14px solid transparent;border-right:14px solid transparent;" +
    "border-bottom:24px solid #ffd76a;filter:drop-shadow(0 0 4px rgba(0,0,0,.7));" +
    "transition:transform .12s linear;}" +
    "#qg-coach{position:fixed;z-index:60000;max-width:230px;" +
    "background:linear-gradient(180deg,#3a2c18,#241a0e);border:2px solid #ffd76a;" +
    "border-radius:10px;padding:10px 12px;color:#ffe9a8;font-size:14px;line-height:1.6;" +
    "box-shadow:0 0 24px rgba(255,215,106,.35);}" +
    "#qg-coach .qg-skip{display:block;margin-top:8px;text-align:right;color:#bfa76a;" +
    "font-size:12px;text-decoration:underline;cursor:pointer;}" +
    "@media (max-width:520px){#qg-tracker{max-width:190px;font-size:12px;top:124px;}}";
  }
  function _ensureCss() {
    if (typeof document === "undefined") return;
    if (document.getElementById("qg-css")) return;
    var s = document.createElement("style");
    s.id = "qg-css";
    s.textContent = _css();
    document.head.appendChild(s);
  }

  /* Camera (tái hiện logic engine._camera để không sửa engine.js) */
  function _cam() {
    var E = _engine();
    if (!E || !E.player) return { x: 0, y: 0 };
    var W = window.innerWidth || 800, H = window.innerHeight || 600;
    var WW = 1600, WH = 1200;
    var x = E.player.x - W / 2, y = E.player.y - H / 2;
    if (WW <= W) x = (WW - W) / 2; else x = Math.max(0, Math.min(WW - W, x));
    if (WH <= H) y = (WH - H) / 2; else y = Math.max(0, Math.min(WH - H, y));
    return { x: x, y: y };
  }

  /* Vị trí mục tiêu trên world → {x, y, map} */
  function _targetPos(tgt, state) {
    if (!tgt) return null;
    var E = _engine();
    var curMap = (state.map && typeof state.map.id === "number") ? state.map.id : 0;
    /* Khác map → chỉ về cổng dẫn sang map tiếp theo */
    if (tgt.map != null && tgt.map !== curMap) {
      var path = findPath(curMap, tgt.map);
      if (path && path.length > 1) {
        var gates = (E && E.getGates) ? E.getGates() : [];
        var nextMap = path[1];
        var maps = _maps();
        var cur = null;
        for (var i = 0; i < maps.length; i++) if (maps[i].id === curMap) cur = maps[i];
        if (cur) {
          var gs = (cur.gates || []).filter(function (g) { return g.to === nextMap; });
          if (gs.length) return { x: gs[0].x, y: gs[0].y, map: curMap, viaGate: true };
        }
      }
      return null;
    }
    if (tgt.kind === "npc" && E && E.getNPCs) {
      var npcs = E.getNPCs();
      for (var n = 0; n < npcs.length; n++)
        if (npcs[n].npcId === tgt.npcId) return { x: npcs[n].x, y: npcs[n].y, map: curMap };
    }
    if (tgt.kind === "monster") {
      /* Ưu tiên quái đang sống gần nhất */
      if (E && E.getMonsters) {
        var mons = E.getMonsters(), bp = E.player, best = null, bd = 1e12;
        for (var m = 0; m < mons.length; m++) {
          if (mons[m].dead) continue;
          if (tgt.monId && mons[m].monId !== tgt.monId && !mons[m].boss) continue;
          var d = Math.hypot(mons[m].x - bp.x, mons[m].y - bp.y);
          if (d < bd) { bd = d; best = mons[m]; }
        }
        if (best) return { x: best.x, y: best.y, map: curMap };
      }
      return { x: tgt.x, y: tgt.y, map: curMap };
    }
    return null;
  }

  function _renderTracker() {
    if (typeof document === "undefined") return;
    var st = _state();
    if (!st) return;
    if (!_trackerEl) {
      var hud = document.getElementById("hud");
      if (!hud) return;
      _trackerEl = document.createElement("div");
      _trackerEl.id = "qg-tracker";
      _trackerEl.addEventListener("click", function () {
        try {
          if (typeof sfx === "function") sfx("click");
          /* Bấm vào tracker: mở panel nhiệm vụ, hoặc nhận nhanh q_story_01 */
          var q = activeStoryQuest(st);
          if (!q && typeof Quest !== "undefined") {
            var av = Quest.available(st).filter(function (x) { return x.id === "q_story_01"; });
            if (av.length) {
              var r = Quest.accept(st, "q_story_01");
              if (r && r.ok) {
                try { if (typeof toast === "function") toast(_t("story_next_quest", { n: _t("q_story_01") })); } catch (e) {}
                try { if (typeof saveGame === "function") saveGame(st); } catch (e) {}
                _renderTracker();
                return;
              }
            }
          }
          if (typeof openPanel === "function") openPanel("quest", { tab: "active" });
        } catch (e) {}
      });
      hud.appendChild(_trackerEl);
    }
    /* Ẩn tracker trong lúc tutorial tương tác */
    if (_tutIdx >= 0) { _trackerEl.style.display = "none"; return; }
    _trackerEl.style.display = "";
    var q = activeStoryQuest(st);
    if (!q) {
      /* Chuỗi tân thủ xong → hướng dẫn tu luyện lên cảnh giới */
      if (storyChainDone(st)) {
        var rn = nextRealmName(st);
        _trackerEl.innerHTML =
          '<div class="qg-t">🌟 ' + _t("qg_cultivate_t") + "</div>" +
          '<div class="qg-p">' + _t("qg_cultivate", { n: rn }) + "</div>";
        return;
      }
      var html = '<div class="qg-t">' + _t("qg_noquest_t") + "</div>" +
        '<div class="qg-go">' + _t("qg_noquest") + "</div>";
      /* Gợi ý nhận q_story_01 nếu chưa làm */
      try {
        if (typeof Quest !== "undefined" && !((st.quests || {})["q_story_01"] || {}).status) {
          var av2 = Quest.available(st).filter(function (x) { return x.id === "q_story_01"; });
          if (av2.length) html += '<div class="qg-go">👉 ' + _t("qg_accept_story") + "</div>";
        }
      } catch (e) {}
      _trackerEl.innerHTML = html;
      return;
    }
    var pg = questProgress(st, q);
    var ready = questReadyToTurnIn(st, q);
    var h = '<div class="qg-t">📜 ' + _t(q.nameKey) + "</div>";
    if (pg) h += '<div class="qg-p">' + _t("qg_obj_kill", { a: pg.cur, b: pg.need }) + "</div>";
    else h += '<div class="qg-p">' + _t(q.descKey) + "</div>";
    if (q.reward) {
      var rw = [];
      if (q.reward.stones) rw.push(q.reward.stones + " 💎");
      if (q.reward.exp) rw.push(q.reward.exp + " EXP");
      (q.reward.items || []).forEach(function (it) {
        var nm = it.id;
        try { if (typeof itemName === "function") nm = itemName(it.id); } catch (e) {}
        rw.push(nm + "x" + (it.qty || 1));
      });
      if (rw.length) h += '<div class="qg-rw">🎁 ' + rw.join(", ") + "</div>";
    }
    if (ready && q.npc) {
      var npcNm = q.npc;
      try { if (typeof t === "function") npcNm = t("npc_" + q.npc); } catch (e) {}
      h += '<div class="qg-go">✅ ' + _t("qg_turnin", { n: npcNm }) + "</div>";
    }
    _trackerEl.innerHTML = h;
  }

  function _flashTracker() {
    if (!_trackerEl) return;
    _trackerEl.classList.remove("flash");
    void _trackerEl.offsetWidth;
    _trackerEl.classList.add("flash");
  }

  function _updateArrow() {
    if (typeof document === "undefined") return;
    var st = _state(), E = _engine();
    if (!st || !E || !E.player) return;
    if (!_arrowEl) {
      _arrowEl = document.createElement("div");
      _arrowEl.id = "qg-arrow";
      _arrowEl.style.display = "none";
      document.body.appendChild(_arrowEl);
    }
    var q = activeStoryQuest(st);
    var tgt = q ? questTarget(st, q) : null;
    /* Trong tutorial bước quest: mũi tên chỉ về Đại Phu */
    if (_tutIdx >= 0) {
      var _inQuestStep = tutorialSteps()[_tutIdx] && tutorialSteps()[_tutIdx].id === "quest";
      if (!_inQuestStep) { _arrowEl.style.display = "none"; return; }
      tgt = { kind: "npc", npcId: "dai_phu", map: npcMap("dai_phu") };
    }
    var pos = tgt ? _targetPos(tgt, st) : null;
    if (!pos) { _arrowEl.style.display = "none"; return; }
    var cam = _cam();
    var px = E.player.x - cam.x, py = E.player.y - cam.y;
    var tx = pos.x - cam.x, ty = pos.y - cam.y;
    var dx = tx - px, dy = ty - py;
    var dist = Math.hypot(dx, dy);
    if (dist < 70) { _arrowEl.style.display = "none"; return; } /* đã tới nơi */
    var ang = Math.atan2(dy, dx); /* 0 = phải, PI/2 = xuống */
    /* Mũi tên vàng trên đầu nhân vật, xoay về hướng mục tiêu */
    var ax = px, ay = py - 62;
    _arrowEl.style.display = "";
    _arrowEl.style.left = (ax - 14) + "px";
    _arrowEl.style.top = (ay - 12) + "px";
    /* border-bottom trỏ xuống mặc định → xoay (ang + 90°) */
    _arrowEl.style.transform = "rotate(" + (ang * 180 / Math.PI + 90) + "deg)";
    /* Nhấp nháy nhẹ theo nhịp */
    var bob = Math.sin(Date.now() / 280) * 5;
    _arrowEl.style.marginTop = bob + "px";
  }

  /* ---------- Tutorial tương tác ---------- */
  function _coachHtml(text) {
    return '<div>' + text + '</div><span class="qg-skip" id="qg-skip">' + _t("qg_skip_tut") + "</span>";
  }
  function _showCoach(anchorSel, text) {
    _hideCoach();
    _coachEl = document.createElement("div");
    _coachEl.id = "qg-coach";
    _coachEl.innerHTML = _coachHtml(text);
    document.body.appendChild(_coachEl);
    _coachEl.querySelector("#qg-skip").addEventListener("click", function (ev) {
      ev.stopPropagation();
      _finishTutorial(true);
    });
    /* Đặt gần nút cần bấm */
    try {
      var el = document.querySelector(anchorSel);
      if (el) {
        var r = el.getBoundingClientRect();
        var cw = 230, ch = 110;
        var x = Math.max(8, Math.min(window.innerWidth - cw - 8, r.left + r.width / 2 - cw / 2));
        var y = r.top - ch - 12;
        if (y < 8) y = r.bottom + 12;
        _coachEl.style.left = x + "px";
        _coachEl.style.top = y + "px";
      } else {
        _coachEl.style.left = "50%";
        _coachEl.style.top = "60%";
        _coachEl.style.transform = "translateX(-50%)";
      }
    } catch (e) {}
  }
  function _hideCoach() {
    if (_coachEl && _coachEl.parentNode) _coachEl.parentNode.removeChild(_coachEl);
    _coachEl = null;
  }

  function _startTutorial() {
    var st = _state();
    if (!st || tutorialDone(st)) return;
    if (_tutIdx >= 0) return;
    _tutIdx = 0;
    var E = _engine();
    if (E && E.player) _tutStartPos = { x: E.player.x, y: E.player.y };
    _showCoach("#joystick", "🧭 " + _t("qg_tut_move"));
    _renderTracker();
  }
  function _finishTutorial(skipped) {
    _tutIdx = -1;
    _hideCoach();
    var st = _state();
    if (st) {
      st.flags = st.flags || {};
      st.flags.tutorial_steps_done = true;
      try { if (typeof saveGame === "function") saveGame(st); } catch (e) {}
    }
    _renderTracker();
    /* Sau tutorial: gợi ý nhận q_story_01 nếu chưa có */
    try {
      if (typeof Quest !== "undefined" && st && !((st.quests || {})["q_story_01"] || {}).status) {
        var av = Quest.available(st).filter(function (x) { return x.id === "q_story_01"; });
        if (av.length && typeof toast === "function")
          toast("👉 " + _t("qg_accept_story"));
      }
    } catch (e) {}
  }
  function _nextTutStep() {
    _tutIdx++;
    var steps = tutorialSteps();
    if (_tutIdx >= steps.length) { _finishTutorial(false); return; }
    var id = steps[_tutIdx].id;
    if (id === "atk") _showCoach("#btn-atk", "⚔️ " + _t("qg_tut_atk"));
    else if (id === "skill") _showCoach("#skillbar", "✨ " + _t("qg_tut_skill"));
    else if (id === "bag") _showCoach("#bottomnav", "🎒 " + _t("qg_tut_bag"));
    else if (id === "quest") {
      /* Mũi tên chỉ về Đại Phu */
      _showCoach(null, "📜 " + _t("qg_tut_quest"));
      _coachEl.style.left = "50%";
      _coachEl.style.top = "38%";
      _coachEl.style.transform = "translateX(-50%)";
    }
  }

  /* Kiểm tra điều kiện qua bước tutorial (gọi mỗi tick) */
  function _tutTick() {
    if (_tutIdx < 0) return;
    var st = _state(), E = _engine();
    if (!st || !E) return;
    var id = tutorialSteps()[_tutIdx].id;
    if (id === "move") {
      if (_tutStartPos && E.player) {
        var d = Math.hypot(E.player.x - _tutStartPos.x, E.player.y - _tutStartPos.y);
        if (d > 120) _nextTutStep();
      }
    } else if (id === "atk") {
      /* Đánh trúng: quái có hitT > 0 hoặc vừa giết */
      if (E.getMonsters) {
        var mons = E.getMonsters();
        for (var i = 0; i < mons.length; i++) {
          if (mons[i].hitT > 0 || (mons[i].maxHp && mons[i].hp < mons[i].maxHp)) { _nextTutStep(); break; }
        }
      }
    } else if (id === "bag") {
      /* Đợi mở panel túi rồi đóng: theo dõi qua wrap openPanel/closePanel */
      if (_bagOpened) { _bagOpened = false; _nextTutStep(); }
    } else if (id === "quest") {
      var s = (st.quests || {})["q_story_01"];
      if (s && s.status) _nextTutStep();
    }
    /* skill: xử lý qua wrap Engine.useSkill */
  }
  var _bagOpened = false;

  /* ---------- Wraps (không sửa file gốc) ---------- */
  function _wrap() {
    if (typeof document === "undefined") return;
    try {
      if (typeof Quest !== "undefined") {
        if (Quest.accept && !Quest.accept._qgWrapped) {
          var oa = Quest.accept;
          Quest.accept = function (state, id) {
            var r = oa(state, id);
            try { _renderTracker(); } catch (e) {}
            return r;
          };
          Quest.accept._qgWrapped = true;
        }
        if (Quest.turnIn && !Quest.turnIn._qgWrapped) {
          var ot = Quest.turnIn;
          Quest.turnIn = function (state, id) {
            var r = ot(state, id);
            try {
              if (r && r.ok) {
                _flashTracker();
                try { if (typeof sfx === "function") sfx("success"); } catch (e) {}
                setTimeout(_renderTracker, 300);
              }
            } catch (e) {}
            return r;
          };
          Quest.turnIn._qgWrapped = true;
        }
        if (Quest.onKill && !Quest.onKill._qgWrapped) {
          var ok = Quest.onKill;
          Quest.onKill = function (state, monId) {
            var r = ok(state, monId);
            try { if (r && r.length) _renderTracker(); } catch (e) {}
            return r;
          };
          Quest.onKill._qgWrapped = true;
        }
      }
    } catch (e) {}
    /* Theo dõi mở/đóng panel túi cho tutorial */
    try {
      if (typeof openPanel === "function" && !openPanel._qgWrapped) {
        var op = openPanel;
        var wop = function (name, arg) {
          var r = op(name, arg);
          try { if (name === "bag" && _tutIdx >= 0 && tutorialSteps()[_tutIdx].id === "bag") _bagOpened = true; } catch (e) {}
          return r;
        };
        wop._qgWrapped = true;
        openPanel = wop;
      }
    } catch (e) {}
    /* Theo dõi dùng skill cho tutorial */
    try {
      var E = _engine();
      if (E && E.useSkill && !E.useSkill._qgWrapped) {
        var ou = E.useSkill;
        var wu = function (sid) {
          var r = ou(sid);
          try {
            if (r && r.ok && _tutIdx >= 0 && tutorialSteps()[_tutIdx].id === "skill") _nextTutStep();
          } catch (e) {}
          return r;
        };
        wu._qgWrapped = true;
        E.useSkill = wu;
      }
    } catch (e) {}
  }

  /* Gợi ý người chơi cũ nhận q_story_01 */
  var _suggestedOld = false;
  function _suggestOldPlayer() {
    if (_suggestedOld) return;
    var st = _state();
    if (!st) return;
    try {
      if (typeof Quest === "undefined") return;
      var has = ((st.quests || {})["q_story_01"] || {}).status;
      if (!has && st.flags && st.flags.tutorial_done) {
        var av = Quest.available(st).filter(function (x) { return x.id === "q_story_01"; });
        if (av.length) {
          _suggestedOld = true;
          if (typeof toast === "function")
            setTimeout(function () { toast("📜 👉 " + _t("qg_accept_story")); }, 2500);
        }
      }
    } catch (e) {}
  }

  /* Khởi động khi vào game */
  function boot() {
    if (typeof document === "undefined") return;
    _ensureCss();
    _wrap();
    /* Đợi story intro xong mới chạy tutorial */
    var iv = setInterval(function () {
      var st = _state();
      if (!st) return;
      var storyOpen = !!document.querySelector(".st-backdrop");
      if (storyOpen) return;
      clearInterval(iv);
      /* Người chơi mới (chưa xong story) → story.js tự nhận q_story_01;
       * tutorial chạy sau khi story intro đóng */
      if (!tutorialDone(st)) {
        /* Chờ 1s cho game ổn định rồi bắt đầu tutorial */
        setTimeout(function () {
          if (!tutorialDone(_state())) _startTutorial();
        }, 1200);
      }
      _suggestOldPlayer();
      _renderTracker();
    }, 800);
    /* Tick: mũi tên + tutorial */
    _tickTimer = setInterval(function () {
      try {
        _updateArrow();
        _tutTick();
        /* Refresh tracker mỗi 2s để cập nhật tiến độ */
        if (Date.now() - (_lastRefresh || 0) > 2000) { _lastRefresh = Date.now(); _renderTracker(); }
      } catch (e) {}
    }, 200);
  }
  var _lastRefresh = 0;

  _wrap();

  /* Tự khởi động khi script nạp (chờ state xuất hiện) */
  try {
    if (typeof document !== "undefined") {
      if (document.readyState === "loading")
        document.addEventListener("DOMContentLoaded", function () { try { boot(); } catch (e) {} });
      else boot();
    }
  } catch (e) {}

  return {
    storyChainDone: storyChainDone,
    nextRealmName: nextRealmName,
    activeStoryQuest: activeStoryQuest,
    questProgress: questProgress,
    questReadyToTurnIn: questReadyToTurnIn,
    questTarget: questTarget,
    findPath: findPath,
    npcMap: npcMap,
    monsterZone: monsterZone,
    tutorialSteps: tutorialSteps,
    tutorialDone: tutorialDone,
    boot: boot,
    renderTracker: function () { try { _renderTracker(); } catch (e) {} },
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = { QuestGuide: QuestGuide };
}
