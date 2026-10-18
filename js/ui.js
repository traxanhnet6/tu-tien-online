/* ============================================================
 * js/ui.js — Kỹ sư UI: màn hình, HUD, panels, wiring engine
 * ------------------------------------------------------------
 * - UI.boot(): AudioSys.init + bindState, đọc save (Online.load)
 *   → menu (nút Tiếp tục) hoặc màn hình tạo mới; nhạc 'menu'.
 *   Gọi Engine.bindState(state) / AudioSys.bindState(state).
 * - Engine.getStats = baseStats + đồ đang mặc (+enhanceMult) + skill.
 * - Engine.onKill({uid,monId,def,x,y,boss}) → bumpKill, gainExp(def.exp),
 *   stones += Combat.stoneDrop(mapDef), Combat.rollDrops(def) → addItem,
 *   Quest.onKill(state, monId), saveGame.
 * - Chết: engine tự hồi sinh đầy HP/MP giữa map → toast msg_dead.
 * - Đột phá 5 bước: nguyên liệu → tâm ma (quick-battle 800ms, dùng
 *   Combat.calcDamage, Tâm Ma = 80% player) → lôi kiếp (flash +
 *   nhạc 'breakthrough') → doBreakthrough(state, breakthroughRate(realm+1)).
 *   (STAGES[realm] của cảnh giới HIỆN tại không có dot_pha; dùng
 *   STAGES[realm+1] = cảnh giới đột phá TỚI, vd Luyện Khí→Trúc Cơ.)
 * - Shop Vạn Tiên Các mở khi vanTienCacUnlocked(state) (donate hoặc
 *   Luyện Khí tầng 12+); chưa mở → panel donate thay vì báo khóa.
 * - state.quests[id] là object {status, count} (không phải string).
 * ============================================================ */

/* state global — Engine fallback đọc biến này khi chưa bindState */
var state = null;

/* Hiển thị rút gọn Linh Thạch: >=1M → "3.4M", >=1K → "1.2K" */
function formatTien(n) {
  n = Math.floor(n || 0);
  if (n >= 1000000) {
    var m = n / 1000000;
    return (m >= 100 ? Math.round(m) : Math.round(m * 10) / 10) + "M";
  }
  if (n >= 1000) {
    var k = n / 1000;
    return (k >= 100 ? Math.round(k) : Math.round(k * 10) / 10) + "K";
  }
  return String(n);
}

/* Fallback ảnh QR donate: ẩn <img>, hiện khung chờ */
function __qrFail(el) {
  el.style.display = "none";
  var w = document.getElementById("qr-wait");
  if (w) w.style.display = "flex";
}

var UI = (function () {
"use strict";

/* ---------------- helpers ---------------- */
function $(id) { return document.getElementById(id); }
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
  });
}
function hasAudio() { return typeof AudioSys !== "undefined"; }
function music(name) { if (hasAudio() && AudioSys.playMusic) AudioSys.playMusic(name); }
function sfx(name) { if (hasAudio() && AudioSys.sfx) AudioSys.sfx(name); }
function hasEngine() { return typeof Engine !== "undefined"; }

var screen = "menu";
var panel = null, panelArg = null;
var curMapId = 0;
var createSel = { sect: "kiem", element: null, quality: null };
var lastHp = null, bossMusicOn = false, saveTick = 0;
var btTimer = null, btStep = "needs", btBattle = null;
var statsCache = null;

/* ---------------- data lookups (chịu được data.js thiếu) ---------------- */
function itemDef(id) { return (typeof ITEMS !== "undefined" && ITEMS[id]) || null; }
function itemName(id) { var d = itemDef(id); return d ? t(d.nameKey) : id; }
function itemDesc(id) { var d = itemDef(id); return d && d.descKey ? t(d.descKey) : ""; }
function monDef(id) { return (typeof MONSTERS !== "undefined" && MONSTERS[id]) || null; }
function monName(id) { var d = monDef(id); return d ? t(d.nameKey) : id; }
function mapDef(id) {
  if (typeof MAPS === "undefined") return null;
  for (var i = 0; i < MAPS.length; i++) if (MAPS[i].id === id) return MAPS[i];
  return MAPS[0] || null;
}

/* ---------------- toast ---------------- */
function toast(msg) {
  var box = $("toasts");
  if (!box) return;
  var d = document.createElement("div");
  d.className = "toast";
  d.textContent = msg;
  box.appendChild(d);
  while (box.children.length > 3) box.removeChild(box.firstChild);
  setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 2600);
}

/* ---------------- i18n cho HTML tĩnh ---------------- */
function applyI18n() {
  var els = document.querySelectorAll("[data-t]");
  for (var i = 0; i < els.length; i++) els[i].textContent = t(els[i].getAttribute("data-t"));
  var phs = document.querySelectorAll("[data-t-ph]");
  for (var j = 0; j < phs.length; j++) phs[j].placeholder = t(phs[j].getAttribute("data-t-ph"));
  document.title = t("app_title");
}

/* ---------------- chỉ số ---------------- */
/* Engine.getStats = baseStats + đồ đang mặc (+enhanceMult) + skill (+2 atk/skill) */
function getStats() {
  var c = state.char;
  var s = baseStats(c.realm, c.tier, c.sect);
  var eq = state.equip || {};
  ["weapon", "armor", "acc"].forEach(function (slot) {
    var id = eq[slot];
    var it = itemDef(id);
    if (!it) return;
    var mult = enhanceMult((state.enhance && state.enhance[slot]) || 0);
    s.atk += Math.round((it.atk || 0) * mult);
    s.def += Math.round((it.def || 0) * mult);
    s.maxHp += Math.round((it.hp || 0) * mult);
    s.maxMp += Math.round((it.mp || 0) * mult);
  });
  s.atk += (state.skills ? state.skills.length : 0) * 2; /* kiếm ý: mỗi skill +2 công */
  statsCache = s;
  return s;
}

/* quest entry: object {status,count} (Producer note), tương thích string cũ */
function qEntry(id) {
  var e = state.quests[id];
  if (!e) return null;
  if (typeof e === "string") return { status: e, count: 0 };
  return e;
}

/* ---------------- boot / show ---------------- */
function boot() {
  if (hasAudio() && AudioSys.init) AudioSys.init();
  var saved = null;
  try { saved = (typeof Online !== "undefined" && Online.load) ? Online.load() : null; } catch (e) {}
  if (saved && saved.char && saved.char.name) state = saved;
  else state = defaultState();
  if (hasEngine() && Engine.bindState) Engine.bindState(state);
  if (hasAudio() && AudioSys.bindState) AudioSys.bindState(state);
  try {
    if (!state.lang) {
      var ls = null;
      try { ls = localStorage.getItem("ttonline_v2_lang"); } catch (e2) {}
      state.lang = ls || "vi";
    }
  } catch (e) { state.lang = state.lang || "vi"; }
  setLang(state.lang);
  applyI18n();
  bindStatic();
  if (saved && saved.char && saved.char.name) {
    show("menu");
    refreshMenu();
  } else {
    show("create");
    initCreate();
  }
  music("menu");
  setInterval(hudTick, 1000);
}

function show(name) {
  screen = name;
  ["menu", "create", "game"].forEach(function (n) {
    var el = $("screen-" + n);
    if (el) el.classList.toggle("hidden", n !== name);
  });
  closePanel();
  music(name === "game" ? "map" : "menu");
  bossMusicOn = false;
}

/* ---------------- menu ---------------- */
function refreshMenu() {
  var has = !!(state.char && state.char.name);
  $("btn-continue").classList.toggle("hidden", !has);
  var canCheck = has && hasFeature(state.char.realm, "diem_danh");
  var btn = $("btn-checkin");
  btn.classList.toggle("hidden", !canCheck);
  if (canCheck) {
    var done = state.flags.diemdanh === todayStr();
    btn.textContent = done ? t("checkin_done") : t("checkin");
    btn.disabled = done;
  }
}

function doCheckin() {
  if (state.flags.diemdanh === todayStr()) { toast(t("checkin_done")); return; }
  state.flags.diemdanh = todayStr();
  state.stones += 100;
  saveGame(state);
  sfx("success");
  toast(t("checkin_ok"));
  refreshMenu();
}

/* ---------------- tạo nhân vật ---------------- */
function initCreate() {
  createSel = { sect: "kiem", element: null, quality: null };
  var cards = document.querySelectorAll(".sect-card");
  for (var i = 0; i < cards.length; i++) {
    cards[i].classList.toggle("sel", cards[i].getAttribute("data-sect") === "kiem");
  }
  $("lingen-result").textContent = t("lingen_none");
}

function rollLingen() {
  var rates = (typeof LINGEN_RATES !== "undefined") ? LINGEN_RATES :
    [["kim", 18], ["moc", 18], ["thuy", 18], ["hoa", 18], ["tho", 18]];
  var total = 0, i;
  for (i = 0; i < rates.length; i++) total += rates[i][1];
  var r = Math.random() * total, el = rates[0][0];
  for (i = 0; i < rates.length; i++) { r -= rates[i][1]; if (r <= 0) { el = rates[i][0]; break; } }
  var rare = (el === "bang" || el === "loi" || el === "phong" || el === "hondon");
  var q = Math.random();
  var quality = q < 0.05 ? "thien" : (q < 0.30 ? "dia" : "pham");
  if (rare && quality === "pham") quality = "dia"; /* linh căn hiếm tối thiểu địa phẩm */
  createSel.element = el;
  createSel.quality = quality;
  $("lingen-result").textContent = t("lingen_result", { name: t("el_" + el) + " · " + t("qual_" + quality) });
  sfx("success");
}

function beginGame() {
  var name = ($("create-name").value || "").trim() || t("ui_default_name");
  var st = defaultState();
  st.lang = state.lang;
  st.settings = state.settings;
  state = st;
  state.char.name = name;
  state.char.sect = createSel.sect;
  state.char.element = createSel.element;
  state.char.elementQuality = createSel.quality;
  state.char.realm = 1; state.char.tier = 1; /* bắt đầu Luyện Khí tầng 1 */
  var bs = baseStats(1, 1, createSel.sect);
  state.char.hp = bs.maxHp; state.char.mp = bs.maxMp;
  state.flags.taycot_done = !!createSel.element;
  if (hasEngine() && Engine.bindState) Engine.bindState(state);
  if (hasAudio() && AudioSys.bindState) AudioSys.bindState(state);
  saveGame(state);
  sfx("success");
  startGame();
}

/* ---------------- vào game + wiring engine ---------------- */
function startGame() {
  show("game");
  curMapId = (state.map && typeof state.map.id === "number") ? state.map.id : 0;
  if (hasEngine()) {
    if (Engine.bindState) Engine.bindState(state);
    Engine.getStats = getStats;

    Engine.onKill = function (ev) {
      ev = ev || {};
      var monId = ev.monId, def = ev.def || {};
      bumpKill(state);
      var r = gainExp(state, def.exp || 0);
      if (r.leveled) { toast(t("lvlup_msg")); sfx("success"); }
      var m = mapDef(curMapId);
      var st = (typeof Combat !== "undefined" && m && Combat.stoneDrop) ? Combat.stoneDrop(m) : 0;
      if (st > 0) state.stones += st;
      var drops = (typeof Combat !== "undefined" && Combat.rollDrops) ? Combat.rollDrops(def) : [];
      drops.forEach(function (d) {
        addItem(state, d.id, d.qty || 1);
        toast(t("drop_get", { name: itemName(d.id), n: d.qty || 1 }));
        sfx("pickup");
      });
      if (typeof Quest !== "undefined" && Quest.onKill) Quest.onKill(state, monId);
      saveGame(state);
      refreshHUD();
      if (panel === "quest") renderPanel();
    };

    Engine.onNpc = function (npcId) {
      if (typeof NPC === "undefined" || !NPC.talk) return;
      openPanel("npc", { npcId: npcId, talk: NPC.talk(npcId, state) });
    };

    Engine.onGate = function (to) {
      curMapId = to;
      state.map.id = to;
      saveGame(state);
      music("map");
      bossMusicOn = false;
      var m = mapDef(to);
      if (m) toast(t(m.nameKey));
      refreshHUD();
    };

    Engine.onStageClear = function (stageIdx, rewards) {
      rewards = rewards || {};
      var rg = rewards.stones || [0, 0];
      var gain = rg[0] + Math.floor(Math.random() * (rg[1] - rg[0] + 1));
      if (gain > 0) state.stones += gain;
      (rewards.items || []).forEach(function (it) { addItem(state, it.id, it.qty || 1); });
      var run = state.dungeonRun;
      if (run) run.stageIdx = stageIdx + 1;
      saveGame(state);
      toast(t("dg_stage_clear") + (gain > 0 ? " +" + formatTien(gain) + " 💎" : ""));
      sfx("success");
      refreshHUD();
      if (run && run.layout && run.stageIdx < run.layout.stages.length) {
        if (Engine.nextStage) Engine.nextStage();
      } else if (Engine.onDungeonDone) Engine.onDungeonDone();
    };

    Engine.onDungeonDone = function () {
      clearDungeonRun(state);
      saveGame(state);
      toast(t("dg_done"));
      music("map");
      bossMusicOn = false;
      refreshHUD();
    };

    if (Engine.init) Engine.init("game");
    if (Engine.setAuto) Engine.setAuto(!!state.auto);
    if (Engine.setFly) Engine.setFly(!!state.fly);
    if (Engine.setRun) Engine.setRun(!!state.run);
    if (Engine.enterMap) Engine.enterMap(curMapId);
    if (Engine.start) Engine.start();
  }
  lastHp = null;
  syncToggles();
  refreshHUD();
}

/* tick 1s: HUD, phát hiện chết/hồi sinh, nhạc boss, autosave */
function hudTick() {
  if (screen !== "game" || !state) return;
  refreshHUD();
  if (hasEngine() && Engine.player) {
    var p = Engine.player;
    var maxHp = statsCache ? statsCache.maxHp : (p.maxHp || 1);
    if (lastHp !== null && lastHp <= 0 && p.hp > 0) {
      toast(t("msg_dead")); /* engine đã hồi sinh đầy HP/MP giữa map */
    }
    lastHp = p.hp;
    var tgt = p.target;
    if (tgt && tgt.boss) {
      if (!bossMusicOn) { music("boss"); bossMusicOn = true; }
    } else if (bossMusicOn) {
      music("map"); bossMusicOn = false;
    }
  }
  saveTick++;
  if (saveTick >= 30) { saveTick = 0; saveGame(state); }
}

function refreshHUD() {
  if (screen !== "game" || !state) return;
  var s = getStats();
  var curHp = state.char.hp, curMp = state.char.mp;
  if (hasEngine() && Engine.player) { curHp = Engine.player.hp; curMp = Engine.player.mp; }
  $("hud-name").textContent = state.char.name;
  $("hud-realm").textContent = stageName(state.char.realm, state.char.tier);
  $("hud-hp-fill").style.width = Math.max(0, Math.min(100, curHp / s.maxHp * 100)) + "%";
  $("hud-hp-txt").textContent = Math.max(0, Math.ceil(curHp)) + "/" + s.maxHp;
  $("hud-mp-fill").style.width = Math.max(0, Math.min(100, curMp / s.maxMp * 100)) + "%";
  $("hud-mp-txt").textContent = Math.max(0, Math.ceil(curMp)) + "/" + s.maxMp;
  $("hud-stones").textContent = formatTien(state.stones);
  var kc = (state.killDate === todayStr()) ? (state.killCount || 0) : 0;
  $("hud-kills").textContent = kc + "/10000";
}

function syncToggles() {
  $("btn-auto").classList.toggle("on", !!state.auto);
  $("btn-fly").classList.toggle("on", !!state.fly);
  $("btn-run").classList.toggle("on", !!state.run);
}

/* hồi máu (đan dược): đồng bộ cả Engine.player và state.char */
function healPlayer(hpAmt, mpAmt) {
  var s = statsCache || getStats();
  if (hasEngine() && Engine.player) {
    Engine.player.hp = Math.min(s.maxHp, Engine.player.hp + hpAmt);
    Engine.player.mp = Math.min(s.maxMp, Engine.player.mp + mpAmt);
  }
  state.char.hp = Math.min(s.maxHp, state.char.hp + hpAmt);
  state.char.mp = Math.min(s.maxMp, state.char.mp + mpAmt);
}

/* ---------------- panels ---------------- */
function openPanel(name, arg) {
  panel = name; panelArg = arg || null;
  var titleKey = "panel_" + name;
  $("panels").innerHTML =
    '<div class="panel-overlay" id="p-overlay"><div class="panel">' +
    '<div class="panel-head"><h3>' + esc(t(titleKey)) + '</h3>' +
    '<button class="panel-x" id="p-x">✕</button></div>' +
    '<div class="panel-body" id="p-body"></div></div></div>';
  $("p-x").onclick = function () { closePanel(); sfx("click"); };
  $("p-overlay").addEventListener("pointerdown", function (e) {
    if (e.target && e.target.id === "p-overlay") closePanel();
  });
  var body = $("p-body");
  body.addEventListener("click", onPanelClick);
  renderPanel();
  var gi = $("gift-code");
  if (gi) gi.addEventListener("keydown", function (e) { if (e.key === "Enter") doGiftRedeem(); });
  sfx("click");
}

function closePanel() {
  if (btTimer) { clearInterval(btTimer); btTimer = null; }
  btBattle = null; btStep = "needs";
  panel = null; panelArg = null;
  var p = $("panels");
  if (p) p.innerHTML = "";
}

function renderPanel() {
  if (!panel) return;
  var body = $("p-body");
  if (!body) return;
  var f = RENDER[panel];
  body.innerHTML = f ? f() : "";
  var gi = $("gift-code");
  if (gi) gi.addEventListener("keydown", function (e) { if (e.key === "Enter") doGiftRedeem(); });
}

function tabBtns(tabs, cur, act) {
  return '<div class="tabs">' + tabs.map(function (tb) {
    return '<button class="mini' + (tb[0] === cur ? " on" : "") + '" data-act="' + act + '" data-v="' + tb[0] + '">' + esc(tb[1]) + "</button>";
  }).join("") + "</div>";
}

/* ----- Túi đồ ----- */
function renderBag() {
  if (!state.bag.length) return "<p>" + esc(t("bag_empty")) + "</p>";
  return state.bag.map(function (it, i) {
    var d = itemDef(it.id);
    var btns = "";
    if (it.locked) {
      btns = "🔒 ";
      if (countItem(state, "khaiphongphu") > 0)
        btns += '<button class="mini paper" data-act="bag-unlock" data-i="' + i + '">' + esc(t("ui_unlock")) + "</button>";
    } else if (d && d.kind === "pill") {
      btns = '<button class="mini" data-act="bag-use" data-i="' + i + '">' + esc(t("ui_use")) + "</button>";
    } else if (d && d.kind === "equip" && d.slot) {
      btns = '<button class="mini" data-act="bag-equip" data-i="' + i + '">' + esc(t("ui_equip")) + "</button>";
    }
    return '<div class="row"><div><div class="item-name">' + esc(itemName(it.id)) +
      ' <span class="item-qty">x' + it.qty + "</span></div>" +
      '<div class="item-desc">' + esc(itemDesc(it.id)) + "</div></div>" +
      '<div class="row-btns">' + btns + "</div></div>";
  }).join("");
}

/* ----- Nhân vật ----- */
function renderChar() {
  var s = getStats();
  var c = state.char;
  var expMax = expMaxFor(c.realm, c.tier);
  var h = '<div class="item-name">' + esc(c.name) + " · " + esc(stageName(c.realm, c.tier)) + "</div>";
  if (c.element) h += '<div class="item-desc">' + esc(t("lingen_result", { name: t("el_" + c.element) + " · " + t("qual_" + (c.elementQuality || "pham")) })) + "</div>";
  h += '<div class="stat-grid">' +
    cell(t("stat_atk"), s.atk) + cell(t("stat_def"), s.def) +
    cell(t("stat_hp"), s.maxHp) + cell(t("stat_mp"), s.maxMp) + "</div>";
  h += '<div class="item-desc">' + esc(t("stat_exp")) + ": " + c.exp + "/" + expMax + "</div>" +
    '<div class="exp-bar"><div class="fill" style="width:' + Math.min(100, c.exp / expMax * 100) + '%"></div></div>';
  ["weapon", "armor", "acc"].forEach(function (slot) {
    var id = state.equip[slot];
    var plus = (state.enhance && state.enhance[slot]) || 0;
    h += '<div class="row"><div><div class="item-name">' + esc(t("slot_" + slot)) + ": " +
      (id ? esc(itemName(id)) + " <b>+" + plus + "</b>" : esc(t("ui_empty_slot"))) + "</div></div>" +
      '<div class="row-btns">';
    if (id) {
      if (plus >= 15) h += '<button class="mini paper" disabled>+15</button>';
      else h += '<button class="mini" data-act="enhance" data-slot="' + slot + '">' + esc(t("btn_enhance")) +
        " (" + formatTien(enhanceCost(plus)) + " 💎, " + esc(t("enhance_rate", { n: Math.round(enhanceRate(plus) * 100) })) + ")</button>";
    }
    h += "</div></div>";
  });
  if (canBreakthrough(state)) {
    h += '<div style="margin-top:10px"><button class="btn btn-jade big" style="width:100%" data-act="bt-open">' +
      esc(t("btn_breakthrough")) + " → " + esc(stageName(c.realm + 1, c.realm + 1 === 1 ? 1 : 0)) + "</button></div>";
  } else {
    h += '<div class="sect-note">' + esc(t("bt_cannot")) + "</div>";
  }
  return h;
  function cell(k, v) { return '<div class="stat-cell">' + esc(k) + ': <b>' + v + "</b></div>"; }
}

/* ----- Kỹ năng ----- */
function renderSkill() {
  if (typeof SKILLS === "undefined") return "";
  return Object.keys(SKILLS).map(function (id) {
    var sk = SKILLS[id];
    var learned = state.skills.indexOf(id) >= 0;
    return '<div class="row"><div><div class="item-name">' + esc(t(sk.nameKey)) +
      (learned ? " ✓" : "") + '</div><div class="item-desc">MP ' + sk.mp + " · x" + sk.mult + "</div></div></div>";
  }).join("");
}

/* ----- Nhiệm vụ ----- */
function questTab() { return (panelArg && panelArg.tab) || "avail"; }
function renderQuest() {
  if (typeof QUESTS === "undefined" || typeof Quest === "undefined") return "";
  var h = tabBtns(
    [["avail", t("q_tab_avail")], ["active", t("q_tab_active")], ["done", t("q_tab_done")]],
    questTab(), "qtab");
  var list = [];
  if (questTab() === "avail") {
    list = Quest.available(state).map(function (q) { return { q: q, st: "avail" }; });
  } else {
    Object.keys(state.quests).forEach(function (id) {
      var e = qEntry(id);
      if (!e) return;
      var q = QUESTS.filter(function (x) { return x.id === id; })[0];
      if (!q) return;
      if (questTab() === "active" && e.status === "active") list.push({ q: q, st: "active", e: e });
      if (questTab() === "done" && e.status === "done") list.push({ q: q, st: "done", e: e });
    });
  }
  if (!list.length) return h + "<p>" + esc(t("q_no")) + "</p>";
  h += list.map(function (o) {
    var q = o.q, r = '<div class="row"><div><div class="item-name">' + esc(t(q.nameKey)) + "</div>" +
      '<div class="item-desc">' + esc(t(q.descKey)) + "</div>";
    if (o.st === "active") r += '<div class="item-desc">' + esc(questProgress(q, o.e)) + "</div>";
    if (q.reward) r += '<div class="item-desc">' + esc(t("q_reward")) + ": " + esc(rewardText(q.reward)) + "</div>";
    r += '</div><div class="row-btns">';
    if (o.st === "avail") r += '<button class="mini" data-act="quest-accept" data-id="' + esc(q.id) + '">' + esc(t("quest_accept")) + "</button>";
    else if (o.st === "active") r += '<button class="mini" data-act="quest-turnin" data-id="' + esc(q.id) + '">' + esc(t("quest_turnin")) + "</button>";
    else r += '<span class="item-desc">✓ ' + esc(t("quest_done")) + "</span>";
    return r + "</div></div>";
  }).join("");
  return h;
}
function questProgress(q, e) {
  var need = q.need || {};
  if (need.type === "kill") return t("q_progress", { a: e.count || 0, b: need.count });
  if (need.type === "item") return t("q_progress", { a: countItem(state, need.item), b: need.count });
  return "";
}
function rewardText(rw) {
  var parts = [];
  if (rw.stones) parts.push(formatTien(rw.stones) + " 💎");
  if (rw.exp) parts.push(rw.exp + " EXP");
  (rw.items || []).forEach(function (it) { parts.push(itemName(it.id) + "x" + (it.qty || 1)); });
  return parts.join(", ");
}

/* ----- Bản đồ ----- */
function renderMap() {
  if (typeof MAPS === "undefined") return "";
  return MAPS.map(function (m, i) {
    var locked = m.unlock && !(
      state.char.realm > m.unlock.realm ||
      (state.char.realm === m.unlock.realm && state.char.tier >= m.unlock.tier));
    var mons = (m.monsters || []).map(monName).join(", ");
    return '<div class="row"><div><div class="item-name">' + esc(t(m.nameKey)) +
      (m.id === curMapId ? ' <span class="dg-tag">' + esc(t("map_here")) + "</span>" : "") + "</div>" +
      '<div class="item-desc">' + esc(mons) + (m.boss ? " · BOSS: " + esc(monName(m.boss)) : "") + "</div></div>" +
      '<div class="row-btns"><button class="mini" data-act="map-go" data-i="' + i + '"' +
      (locked ? " disabled" : "") + ">" + esc(t("map_go")) + "</button></div></div>";
  }).join("");
}

/* ----- Phụ bản ----- */
function renderDungeon() {
  if (typeof DUNGEONS === "undefined") return "";
  return DUNGEONS.map(function (d, i) {
    var tp = dungeonType(d.typeId) || { phi: 0 };
    var left = dungeonLeft(state, d.id, d.typeId);
    var bought = (state.dungeons && state.dungeons.bought && state.dungeons.bought[d.id]) || 0;
    var cost = dungeonBuyCost(d.typeId, bought);
    var run = state.dungeonRun;
    var btn;
    if (run && run.dungeonId === d.id) {
      btn = '<button class="mini" data-act="dg-enter" data-i="' + i + '">' + esc(t("dg_resume", { n: run.stageIdx + 1 })) + "</button>";
    } else if (left > 0) {
      btn = '<button class="mini" data-act="dg-enter" data-i="' + i + '">' + esc(t("dg_enter")) + "</button>";
    } else {
      btn = '<button class="mini paper" data-act="dg-buy" data-i="' + i + '">' + esc(t("dg_buy_extra", { n: formatTien(cost) })) + "</button>";
    }
    return '<div class="row"><div><div class="item-name">' + esc(t(d.nameKey)) +
      (d.ngau_nhien ? ' <span class="dg-tag">' + esc(t("dg_random")) + "</span>" : "") + "</div>" +
      '<div class="item-desc">' + esc(t("dg_left", { n: left })) + " · " +
      (tp.phi > 0 ? esc(t("dg_fee", { n: formatTien(tp.phi) })) : esc(t("dg_fee_free"))) + "</div></div>" +
      '<div class="row-btns">' + btn + "</div></div>";
  }).join("");
}
function fixedDungeonReward(d) {
  if (d.typeId === "dotpha") return { stones: [200, 500], items: [{ id: "yaodan1", qty: 1 }] };
  if (d.typeId === "tinhanh") return { stones: [100, 250], items: [] };
  return { stones: [30, 80], items: [] };
}
function doDungeonEnter(d) {
  var r = dungeonEnter(state, d.id, d.typeId);
  if (!r.ok) { toast(t(r.reason === "het_luot" ? "dg_no_turn" : "dg_no_stone")); sfx("fail"); return; }
  var run = state.dungeonRun;
  if (d.ngau_nhien) {
    if (!run || run.dungeonId !== d.id) {
      if (typeof genRandomDungeon === "undefined") { toast("genRandomDungeon?"); return; }
      var seed = Math.floor(Math.random() * 4294967296);
      startDungeonRun(state, d.id, seed, genRandomDungeon(d, seed));
      run = state.dungeonRun;
    }
  } else {
    startDungeonRun(state, d.id, 0, {
      seed: 0,
      stages: [{ monsters: d.monsters || [], boss: d.boss, rewards: fixedDungeonReward(d) }]
    });
    run = state.dungeonRun;
  }
  saveGame(state);
  closePanel();
  if (hasEngine() && Engine.enterDungeonRun) { Engine.enterDungeonRun(run, d); music("boss"); }
}
function doDungeonBuy(d) {
  var r = dungeonBuy(state, d.id, d.typeId);
  if (!r.ok) { toast(t("shop_no_stone")); sfx("fail"); return; }
  saveGame(state);
  sfx("success");
  renderPanel();
  refreshHUD();
}

/* ----- Giftcode ----- */
function renderGift() {
  return '<div class="lingen-row"><input id="gift-code" class="fld-input" style="flex:1" maxlength="24" placeholder="' +
    esc(t("gift_input")) + '">' +
    '<button class="btn btn-jade" data-act="gift-redeem">' + esc(t("gift_redeem")) + "</button></div>";
}
function doGiftRedeem() {
  var inp = $("gift-code");
  var code = ((inp && inp.value) || "").trim().toUpperCase();
  if (!code) return;
  if (state.giftcodes.indexOf(code) >= 0) { toast(t("gift_used")); return; }
  var table = (typeof GIFT_CODES !== "undefined") ? GIFT_CODES : {};
  var r = (typeof Combat !== "undefined" && Combat.redeemGift) ? Combat.redeemGift(code, table) : { ok: false };
  if (!r.ok || !r.reward) { toast(t("gift_invalid")); sfx("fail"); return; }
  if (r.reward.stones) state.stones += r.reward.stones;
  (r.reward.items || []).forEach(function (it) { addItem(state, it.id, it.qty || 1, it.locked); });
  state.giftcodes.push(code);
  saveGame(state);
  toast(t("gift_ok"));
  sfx("success");
  refreshHUD();
  renderPanel();
}

/* ----- Cài đặt ----- */
function renderSettings() {
  var st = state.settings;
  var gfx = [["tudong", t("gfx_auto")], ["thap", t("gfx_low")], ["trungbinh", t("gfx_med")], ["cao", t("gfx_high")]];
  var shp = [["me", t("showp_me")], ["team", t("showp_team")], ["all", t("showp_all")]];
  var h = "";
  h += '<div class="row"><div class="item-name">' + esc(t("settings_music")) + '</div><div class="row-btns">' +
    '<button class="mini' + (st.music ? "" : " paper") + '" data-act="set-music">' + esc(st.music ? t("settings_on") : t("settings_off")) + "</button></div></div>";
  h += '<div class="row"><div class="item-name">' + esc(t("settings_sound")) + '</div><div class="row-btns">' +
    '<button class="mini' + (st.sound ? "" : " paper") + '" data-act="set-sfx">' + esc(st.sound ? t("settings_on") : t("settings_off")) + "</button></div></div>";
  h += '<div class="row"><div class="item-name">' + esc(t("gfx_title")) + '</div><div class="row-btns">' +
    gfx.map(function (g) {
      return '<button class="mini' + (st.graphics === g[0] ? " on" : " paper") + '" data-act="set-gfx" data-v="' + g[0] + '">' + esc(g[1]) + "</button>";
    }).join("") + "</div></div>";
  h += '<div class="row"><div class="item-name">' + esc(t("showp_title")) + '</div><div class="row-btns">' +
    shp.map(function (g) {
      return '<button class="mini' + (st.showPlayers === g[0] ? " on" : " paper") + '" data-act="set-showp" data-v="' + g[0] + '">' + esc(g[1]) + "</button>";
    }).join("") + "</div></div>";
  h += '<div class="row"><div class="item-name">' + esc(t("settings_lang")) + '</div><div class="row-btns">' +
    '<button class="mini' + (LANG_CUR === "vi" ? " on" : " paper") + '" data-act="set-lang" data-v="vi">VI</button>' +
    '<button class="mini' + (LANG_CUR === "en" ? " on" : " paper") + '" data-act="set-lang" data-v="en">EN</button></div></div>';
  h += '<div class="row"><div class="item-name">' + esc(t("settings_donate")) + '</div><div class="row-btns">' +
    '<button class="mini" data-act="open-donate">' + esc(t("donate_title")) + "</button></div></div>";
  return h;
}

/* ----- NPC ----- */
function renderNpc() {
  var talk = panelArg && panelArg.talk;
  if (!talk) return "";
  var npcId = panelArg.npcId;
  var h = '<div class="npc-lines"><div class="npc-name">' + esc(talk.name || "") + "</div>";
  (talk.lines || []).forEach(function (ln) { h += "<div>" + esc(t(ln)) + "</div>"; });
  h += "</div>";
  (talk.options || []).forEach(function (op, i) {
    var label = t(op.label), act = op.act, extra = "";
    if (panelArg.lockedShop && act === "shop") {
      label = t("shop_donate_open"); act = "open-donate"; extra = ' data-from="shop"';
    }
    h += '<button class="btn btn-paper" style="width:100%;margin-bottom:8px" data-act="npc-opt" data-i="' + i +
      '" data-opact="' + esc(act) + '"' + extra + ">" + esc(label) + "</button>";
  });
  if (panelArg.lockedShop) h = '<div class="sect-note">' + esc(t("shop_locked")) + "</div>" + h;
  return h;
}

/* ----- Shop Vạn Tiên Các ----- */
function shopTab() { return (panelArg && panelArg.tab) || "buy"; }
function renderShop() {
  var h = tabBtns([["buy", t("shop_tab_buy")], ["sell", t("shop_tab_sell")]], shopTab(), "shop-tab");
  if (shopTab() === "buy") {
    var stock = (typeof SHOP_STOCK !== "undefined") ? SHOP_STOCK : [];
    h += stock.map(function (id) {
      var d = itemDef(id);
      if (!d) return "";
      return '<div class="row"><div><div class="item-name">' + esc(itemName(id)) + "</div>" +
        '<div class="item-desc">' + esc(itemDesc(id)) + '</div><div class="shop-price">' + formatTien(d.price || 0) + " 💎</div></div>" +
        '<div class="row-btns"><button class="mini" data-act="shop-buy" data-id="' + esc(id) + '">' + esc(t("shop_buy")) + "</button></div></div>";
    }).join("");
  } else {
    if (!state.bag.length) h += "<p>" + esc(t("bag_empty")) + "</p>";
    h += state.bag.map(function (it, i) {
      var d = itemDef(it.id);
      if (!d || !(d.sell > 0) || it.locked) return "";
      return '<div class="row"><div><div class="item-name">' + esc(itemName(it.id)) +
        ' <span class="item-qty">x' + it.qty + "</span></div>" +
        '<div class="shop-price">' + formatTien(d.sell) + " 💎</div></div>" +
        '<div class="row-btns"><button class="mini paper" data-act="shop-sell" data-i="' + i + '">' + esc(t("shop_sell")) + "</button></div></div>";
    }).join("");
  }
  /* Nút + popup nạp tiền làm sẵn nhưng ẩn (display:none), chưa xử lý thanh toán */
  h += '<div style="margin-top:10px"><button class="btn btn-paper" style="display:none" data-act="recharge">' +
    esc(t("recharge_title")) + "</button>" +
    '<div id="recharge-popup" style="display:none"><div class="sect-note">VIP1 · VIP2 · VIP3</div></div></div>';
  return h;
}

/* ----- Donate QR mở khóa Vạn Tiên Các ----- */
function renderDonate() {
  return '<div class="qr-box">' +
    '<img src="assets/qr-donate.png" alt="QR" onerror="__qrFail(this)">' +
    '<div id="qr-wait" class="qr-wait" style="display:none">' + esc(t("donate_qr_wait")) + "</div></div>" +
    '<p style="line-height:1.6">' + esc(t("donate_desc")) + "</p>" +
    '<button class="btn btn-jade big" style="width:100%" data-act="donate-done"' +
    (panelArg && panelArg.from ? ' data-from="' + esc(panelArg.from) + '"' : "") + ">" +
    esc(t("donate_done_btn")) + "</button>";
}
function doDonateDone(from) {
  try {
    if (typeof Online !== "undefined" && Online.submitDonate) Online.submitDonate("");
  } catch (e) {}
  state.flags.da_donate = true;
  saveGame(state);
  sfx("success");
  toast(t("donate_pending"));
  toast(t("donate_unlocked")); /* mở khóa shop ngay */
  refreshHUD();
  if (from === "shop") openPanel("shop");
  else closePanel();
}

/* ----- Đột phá (flow 5 bước) ----- */
/* Nguyên liệu theo STAGES[realm+1].dot_pha (cảnh giới đột phá TỚI) */
function btNeeds() {
  var target = (typeof STAGES !== "undefined") ? STAGES[state.char.realm + 1] : null;
  if (target && target.ten === "Trúc Cơ") {
    return [{ id: "pill_truccodan", qty: 1 }, { id: "yaodan1", qty: 1 }];
  }
  return [];
}
function renderBreakthrough() {
  var c = state.char;
  var h = '<div class="item-name">' + esc(c.name) + ": " + esc(stageName(c.realm, c.tier)) +
    " → " + esc(stageName(c.realm + 1, c.realm + 1 === 1 ? 1 : 0)) + "</div>";
  if (btStep === "needs") {
    var needs = btNeeds();
    if (needs.length) {
      h += '<div class="item-desc" style="margin:6px 0">' + esc(t("bt_need")) + ":</div>";
      var lack = false;
      needs.forEach(function (nd) {
        var have = countItem(state, nd.id);
        if (have < nd.qty) lack = true;
        h += '<div class="row"><div class="item-name">' + esc(itemName(nd.id)) + "</div>" +
          '<div class="item-desc">' + have + "/" + nd.qty + "</div></div>";
      });
      h += '<button class="btn btn-jade big" style="width:100%;margin-top:8px" data-act="bt-do"' +
        (lack ? " disabled" : "") + ">" + esc(t("bt_do")) + "</button>";
    } else {
      h += '<button class="btn btn-jade big" style="width:100%;margin-top:8px" data-act="bt-do">' +
        esc(t("bt_do")) + "</button>";
    }
  } else if (btStep === "tamma") {
    var b = btBattle || { pmax: 1, php: 1, emax: 1, ehp: 1 };
    h += '<div class="npc-lines">' + esc(t("bt_tamma_name")) + "</div>" +
      '<div class="hp-duel">' + duelBar(t("bt_tamma_name"), "e", b.ehp, b.emax) +
      duelBar(c.name, "p", b.php, b.pmax) + "</div>";
  } else if (btStep === "loikiep") {
    h += '<div class="npc-lines" style="text-align:center;font-size:18px">⚡ ' + esc(t("bt_loikiep")) + " ⚡</div>";
  }
  return h;
  function duelBar(nm, k, cur, max) {
    return '<div class="duel-row"><div class="duel-name">' + esc(nm) + '</div>' +
      '<div class="hud-bar"><div class="fill hp" id="bt-' + k + '-fill" style="width:' +
      Math.max(0, cur / max * 100) + '%"></div></div></div>';
  }
}
function btDo() {
  var needs = btNeeds();
  for (var i = 0; i < needs.length; i++) {
    if (countItem(state, needs[i].id) < needs[i].qty) { toast(t("bt_cannot")); return; }
  }
  needs.forEach(function (nd) { removeItem(state, nd.id, nd.qty); });
  saveGame(state);
  var target = (typeof STAGES !== "undefined") ? STAGES[state.char.realm + 1] : null;
  var tamMa = target && target.dot_pha && target.dot_pha.tam_ma;
  if (tamMa) {
    var s = getStats();
    btBattle = {
      pmax: s.maxHp, php: s.maxHp, patk: s.atk, pdef: s.def,
      emax: Math.round(s.maxHp * 0.8), ehp: Math.round(s.maxHp * 0.8),
      eatk: Math.round(s.atk * 0.8), edef: Math.round(s.def * 0.8)
    };
    btStep = "tamma";
    renderPanel();
    if (btTimer) clearInterval(btTimer);
    btTimer = setInterval(tammaTick, 800);
  } else {
    btStep = "loikiep";
    renderPanel();
    doLoikiep();
  }
}
function calcDmg(atk, def, mult) {
  if (typeof Combat !== "undefined" && Combat.calcDamage) return Combat.calcDamage(atk, def, mult);
  return Math.max(1, Math.round(atk * (mult || 1) - def * 0.5));
}
function tammaTick() {
  var b = btBattle;
  if (!b || btStep !== "tamma") { if (btTimer) { clearInterval(btTimer); btTimer = null; } return; }
  b.ehp -= calcDmg(b.patk, b.edef, 1);
  if (b.ehp <= 0) {
    clearInterval(btTimer); btTimer = null;
    toast(t("bt_tamma_win"));
    sfx("success");
    btStep = "loikiep";
    renderPanel();
    doLoikiep();
    return;
  }
  b.php -= calcDmg(b.eatk, b.pdef, 1);
  sfx("hit");
  if (b.php <= 0) {
    clearInterval(btTimer); btTimer = null;
    toast(t("bt_tamma_lose"));
    toast(t("bt_fail"));
    sfx("fail");
    closePanel();
    return;
  }
  var ef = $("bt-e-fill"), pf = $("bt-p-fill");
  if (ef) ef.style.width = Math.max(0, b.ehp / b.emax * 100) + "%";
  if (pf) pf.style.width = Math.max(0, b.php / b.pmax * 100) + "%";
}
function doLoikiep() {
  music("breakthrough");
  var f = document.createElement("div");
  f.className = "flash";
  $("app").appendChild(f);
  setTimeout(function () { f.classList.add("go"); }, 30);
  setTimeout(function () { if (f.parentNode) f.parentNode.removeChild(f); finishBreakthrough(); }, 1100);
}
function finishBreakthrough() {
  var rate = breakthroughRate(state.char.realm + 1);
  if (rate == null) rate = 1;
  var r = doBreakthrough(state, rate);
  saveGame(state);
  refreshHUD();
  if (r.ok) { toast(t("bt_success")); sfx("success"); }
  else { toast(t("bt_fail")); sfx("fail"); }
  music("map");
  closePanel();
}

var RENDER = {
  bag: renderBag, char: renderChar, skill: renderSkill, quest: renderQuest,
  map: renderMap, dungeon: renderDungeon, gift: renderGift, settings: renderSettings,
  npc: renderNpc, shop: renderShop, breakthrough: renderBreakthrough, donate: renderDonate
};

/* ----- delegated click cho mọi panel ----- */
function onPanelClick(e) {
  var el = e.target && e.target.closest ? e.target.closest("[data-act]") : null;
  if (!el) return;
  var act = el.getAttribute("data-act");
  var i = el.getAttribute("data-i");
  var v = el.getAttribute("data-v");
  switch (act) {
    case "bag-use": doBagUse(+i); break;
    case "bag-equip": doBagEquip(+i); break;
    case "bag-unlock": doBagUnlock(+i); break;
    case "enhance": doEnhance(el.getAttribute("data-slot")); break;
    case "bt-open": btStep = "needs"; openPanel("breakthrough"); break;
    case "bt-do": btDo(); break;
    case "qtab": panelArg = { tab: v }; renderPanel(); break;
    case "quest-accept":
      if (typeof Quest !== "undefined" && Quest.accept(state, el.getAttribute("data-id"))) {
        saveGame(state); sfx("success"); toast(t("quest_accept")); renderPanel();
      }
      break;
    case "quest-turnin": {
      var qr = (typeof Quest !== "undefined") ? Quest.turnIn(state, el.getAttribute("data-id")) : null;
      if (qr && qr.ok) {
        saveGame(state); sfx("success"); toast(t("quest_done")); refreshHUD(); renderPanel();
      } else { toast(t("q_incomplete")); sfx("fail"); }
      break;
    }
    case "map-go": doMapGo(+i); break;
    case "dg-enter": doDungeonEnter(DUNGEONS[+i]); break;
    case "dg-buy": doDungeonBuy(DUNGEONS[+i]); break;
    case "gift-redeem": doGiftRedeem(); break;
    case "set-music":
      if (hasAudio() && AudioSys.setMusicOn) AudioSys.setMusicOn(!state.settings.music);
      saveGame(state); renderPanel(); break;
    case "set-sfx":
      if (hasAudio() && AudioSys.setSfxOn) AudioSys.setSfxOn(!state.settings.sound);
      saveGame(state); renderPanel(); break;
    case "set-gfx":
      if (hasEngine() && Engine.setGraphics) Engine.setGraphics(v);
      state.settings.graphics = v;
      if (v !== "tudong") state.settings.graphicsManual = v;
      saveGame(state); renderPanel(); break;
    case "set-showp":
      state.settings.showPlayers = v; saveGame(state); renderPanel(); break;
    case "set-lang":
      setLang(v); state.lang = v; saveGame(state); applyI18n(); renderPanel(); refreshHUD(); break;
    case "open-donate": openPanel("donate", { from: el.getAttribute("data-from") }); break;
    case "donate-done": doDonateDone(el.getAttribute("data-from")); break;
    case "shop-tab": panelArg = { tab: v }; renderPanel(); break;
    case "shop-buy": doShopBuy(el.getAttribute("data-id")); break;
    case "shop-sell": doShopSell(+i); break;
    case "npc-opt": doNpcOpt(el); break;
  }
  sfx("click");
}

function doBagUse(idx) {
  var it = state.bag[idx];
  var d = it && itemDef(it.id);
  if (!d || it.locked) return;
  var s = statsCache || getStats();
  if (d.healHp) healPlayer(Math.round(s.maxHp * d.healHp), 0);
  if (d.healMp) healPlayer(0, Math.round(s.maxMp * d.healMp));
  removeItem(state, it.id, 1);
  saveGame(state);
  sfx("pickup");
  refreshHUD(); renderPanel();
}
function doBagEquip(idx) {
  var it = state.bag[idx];
  var d = it && itemDef(it.id);
  if (!d || !d.slot || it.locked) return;
  var slot = d.slot;
  var cur = state.equip[slot];
  if (cur) addItem(state, cur, 1); /* tháo món cũ về túi */
  state.equip[slot] = it.id;
  removeItem(state, it.id, 1);
  saveGame(state);
  sfx("success");
  toast(t("ui_equipped") + ": " + itemName(it.id));
  refreshHUD(); renderPanel();
}
function doBagUnlock(idx) {
  var it = state.bag[idx];
  if (!it || !it.locked) return;
  if (!removeItem(state, "khaiphongphu", 1)) return;
  it.locked = false;
  saveGame(state);
  sfx("success");
  renderPanel();
}
function doEnhance(slot) {
  var plus = (state.enhance && state.enhance[slot]) || 0;
  if (plus >= 15) { toast(t("enhance_max")); return; }
  var cost = enhanceCost(plus);
  if (state.stones < cost) { toast(t("shop_no_stone")); sfx("fail"); return; }
  state.stones -= cost;
  if (Math.random() < enhanceRate(plus)) {
    state.enhance[slot] = plus + 1;
    toast(t("enhance_ok", { n: plus + 1 }));
    sfx("success");
  } else {
    toast(t("enhance_fail"));
    sfx("fail");
  }
  saveGame(state);
  refreshHUD(); renderPanel();
}
function doMapGo(idx) {
  var m = MAPS[idx];
  if (!m) return;
  if (m.unlock && !(state.char.realm > m.unlock.realm ||
      (state.char.realm === m.unlock.realm && state.char.tier >= m.unlock.tier))) {
    toast(t("map_locked")); return;
  }
  curMapId = m.id;
  state.map.id = m.id;
  saveGame(state);
  closePanel();
  if (hasEngine() && Engine.enterMap) Engine.enterMap(m.id);
  music("map");
  bossMusicOn = false;
  refreshHUD();
}
function doShopBuy(id) {
  var d = itemDef(id);
  if (!d) return;
  var price = d.price || 0;
  if (state.stones < price) { toast(t("shop_no_stone")); sfx("fail"); return; }
  state.stones -= price;
  addItem(state, id, 1);
  saveGame(state);
  sfx("pickup");
  toast(t("shop_bought") + ": " + itemName(id));
  refreshHUD(); renderPanel();
}
function doShopSell(idx) {
  var it = state.bag[idx];
  var d = it && itemDef(it.id);
  if (!d || !(d.sell > 0) || it.locked) return;
  removeItem(state, it.id, 1);
  state.stones += d.sell;
  saveGame(state);
  sfx("pickup");
  toast(t("shop_sold") + ": " + itemName(it.id) + " +" + formatTien(d.sell) + " 💎");
  refreshHUD(); renderPanel();
}
function doNpcOpt(el) {
  var opact = el.getAttribute("data-opact");
  if (opact === "quest") { openPanel("quest"); return; }
  if (opact === "shop") {
    var npcId = panelArg && panelArg.npcId;
    var kind = (typeof NPCS !== "undefined" && NPCS[npcId]) ? NPCS[npcId].kind : "shop";
    if (kind === "shop" && typeof vanTienCacUnlocked === "function" && !vanTienCacUnlocked(state)) {
      panelArg.lockedShop = true; /* chưa đủ điều kiện → đường vào panel donate */
      renderPanel();
      return;
    }
    openPanel("shop");
    return;
  }
  if (opact === "open-donate") { openPanel("donate", { from: el.getAttribute("data-from") }); return; }
  closePanel(); /* bye */
}

/* ---------------- bind DOM tĩnh ---------------- */
function bindStatic() {
  $("btn-continue").onclick = function () { sfx("click"); startGame(); };
  $("btn-new").onclick = function () { sfx("click"); show("create"); initCreate(); };
  $("btn-checkin").onclick = function () { doCheckin(); };
  $("btn-lang-vi").onclick = function () { setLang("vi"); state.lang = "vi"; saveGame(state); applyI18n(); refreshMenu(); };
  $("btn-lang-en").onclick = function () { setLang("en"); state.lang = "en"; saveGame(state); applyI18n(); refreshMenu(); };

  var cards = document.querySelectorAll(".sect-card");
  for (var i = 0; i < cards.length; i++) {
    cards[i].onclick = (function (c) {
      return function () {
        createSel.sect = c.getAttribute("data-sect");
        for (var j = 0; j < cards.length; j++) cards[j].classList.toggle("sel", cards[j] === c);
        sfx("click");
      };
    })(cards[i]);
  }
  $("btn-taycot").onclick = function () { rollLingen(); };
  $("btn-begin").onclick = function () { beginGame(); };
  $("btn-create-back").onclick = function () { sfx("click"); show("menu"); refreshMenu(); };

  $("btn-auto").onclick = function () {
    state.auto = !state.auto;
    if (hasEngine() && Engine.setAuto) Engine.setAuto(state.auto);
    saveGame(state); syncToggles(); sfx("click");
  };
  $("btn-fly").onclick = function () {
    state.fly = !state.fly;
    if (hasEngine() && Engine.setFly) Engine.setFly(state.fly);
    saveGame(state); syncToggles(); sfx("click");
  };
  $("btn-run").onclick = function () {
    state.run = !state.run;
    if (hasEngine() && Engine.setRun) Engine.setRun(state.run);
    saveGame(state); syncToggles(); sfx("click");
  };
  $("btn-interact").onclick = function () {
    if (hasEngine() && Engine.tryInteract) Engine.tryInteract();
    sfx("click");
  };

  var navs = document.querySelectorAll("#bottomnav button");
  for (var n = 0; n < navs.length; n++) {
    navs[n].onclick = (function (b) {
      return function () { openPanel(b.getAttribute("data-panel")); };
    })(navs[n]);
  }

  bindJoystick();

  document.addEventListener("keydown", function (e) {
    if (e.code === "Space" && screen === "game" && !panel) {
      var ae = document.activeElement;
      if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA")) return;
      e.preventDefault();
      if (hasEngine() && Engine.tryInteract) Engine.tryInteract();
    }
  });
}

function bindJoystick() {
  var joy = $("joystick"), knob = $("joy-knob");
  if (!joy || !knob) return;
  var active = false;
  function setJoy(dx, dy) {
    if (hasEngine()) Engine.joy = { dx: dx, dy: dy };
    knob.style.transform = "translate(" + dx * 30 + "px," + dy * 30 + "px)";
  }
  function handle(e) {
    var r = joy.getBoundingClientRect();
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var p = e.touches && e.touches[0] ? e.touches[0] : e;
    var dx = (p.clientX - cx) / (r.width / 2), dy = (p.clientY - cy) / (r.height / 2);
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len > 1) { dx /= len; dy /= len; }
    setJoy(dx, dy);
  }
  joy.addEventListener("pointerdown", function (e) { active = true; joy.setPointerCapture(e.pointerId); handle(e); e.preventDefault(); });
  joy.addEventListener("pointermove", function (e) { if (active) handle(e); });
  function end() { active = false; setJoy(0, 0); }
  joy.addEventListener("pointerup", end);
  joy.addEventListener("pointercancel", end);
  /* fallback cảm ứng cũ */
  joy.addEventListener("touchstart", function (e) { active = true; handle(e); e.preventDefault(); }, { passive: false });
  joy.addEventListener("touchmove", function (e) { if (active) handle(e); e.preventDefault(); }, { passive: false });
  joy.addEventListener("touchend", end);
}

/* ---------------- public ---------------- */
return {
  boot: boot,
  show: show,
  toast: toast,
  refreshHUD: refreshHUD,
  openPanel: openPanel,
  closePanel: closePanel,
  getStats: getStats
};

})();

/* Node.js export: chỉ hàm thuần logic (formatTien) */
if (typeof module !== "undefined" && module.exports) {
  module.exports = { formatTien: formatTien };
}
