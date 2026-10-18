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

/* ---------- Bí Cảnh tranh đoạt (secret.js) ---------- */
var secretNotified = {};    // slotKey → true (đã báo sắp mở)
var secretGatherCdUntil = 0;
var curSecretRealm = null;  // realmId đang ở trong bí cảnh (null = không)

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
var tnWarned = false; /* đã cảnh báo thọ nguyên thấp trong phiên này chưa */
var curMapId = 0;
var createSel = { sect: "kiem", element: null, quality: null, gender: "nam" };
var lastHp = null, bossMusicOn = false, saveTick = 0;
var btTimer = null, btStep = "needs", btBattle = null;
var statsCache = null;

/* ---------------- data lookups (chịu được data.js thiếu) ---------------- */
function itemDef(id) { return (typeof ITEMS !== "undefined" && ITEMS[id]) || null; }
function yaodanIconHtml(id, size) {
  var m = /^yaodan([1-5])(?:_(hoa|loi|bang|phong|tho))?$/.exec(id || "");
  if (!m) return null;
  var src = "assets/yeudan/yeudan_cap" + m[1] + (m[2] ? "_" + m[2] : "") + ".png";
  var sz = size || 32;
  return '<img class="yd-icon" src="' + src + '" alt="" draggable="false" width="' + sz + '" height="' + sz + '"' +
    ' style="width:' + sz + 'px;height:' + sz + 'px;vertical-align:middle;border-radius:6px;"' +
    ' onerror="this.outerHTML=\'🟣\'"/>';
}
/* Icon đan dược Tẩy Cốt / Khai Mạch: <img> + fallback emoji nếu ảnh lỗi */
function pillIconHtml(id, size) {
  var map = {
    pill_taycotdan: "taycotdan_ha.png", pill_taycotdan_trung: "taycotdan_trung.png",
    pill_taycotdan_thuong: "taycotdan_thuong.png", pill_taycotdan_thien: "taycotdan_thien.png",
    pill_khaimachdan: "khaimachdan.png", pill_khaimachdan_trung: "khaimachdan_trung.png",
    pill_khaimachdan_thuong: "khaimachdan_thuong.png",
  };
  var f = map[id]; if (!f) return null;
  var sz = size || 32;
  var emo = (id.indexOf("taycotdan") >= 0) ? "🟡" : "🔴";
  return '<img class="pill-icon" src="assets/pills/' + f + '" alt="" draggable="false" width="' + sz +
    '" height="' + sz + '" style="width:' + sz + 'px;height:' + sz + 'px;vertical-align:middle;border-radius:6px;"' +
    ' onerror="this.outerHTML=\'' + emo + "'\"/>";
}
/* ---- Độ hiếm vật phẩm (Bui duyệt 2026-10-18): 0 Phàm → 6 Tiên Phẩm ---- */
function itemRarity(id) {
  var d = itemDef(id);
  var r = d && typeof d.doHiem === "number" ? d.doHiem : 0;
  return (r >= 0 && r <= 6) ? r : 0;
}
function rarityColor(r) {
  if (typeof RARITY !== "undefined" && RARITY[r]) return RARITY[r].mau;
  var c = ["#e0e0e0", "#4caf50", "#2196f3", "#9c27b0", "#ff9800", "#f44336", "#ffd700"];
  return c[r] || c[0];
}
function rarityName(r) { return t("rar_" + r); }
function itemIcon(id) {
  var d = itemDef(id);
  if (d && d.kind === "yaodan") { var yh = yaodanIconHtml(id); if (yh) return yh; }
  if (d && d.kind === "pill") { var ph = pillIconHtml(id); if (ph) return ph; }
  if (d && d.icon) return d.icon;
  /* Bí tịch: dùng icon pixel art của skill/bị động trong bí tịch */
  if (d && d.kind === "manual") {
    var techId = d.skill || d.passive;
    if (techId) {
      return '<img class="skill-img" src="assets/skills/' + techId + '.png" alt="" draggable="false"' +
        ' style="width:28px;height:28px;vertical-align:middle;border-radius:6px;"' +
        ' onerror="this.outerHTML=\'📕\'"/>';
    }
    return "📕";
  }
  if (d && d.kind === "pet_egg") return "🥚";
  if (d && d.kind === "seed") return "🌱";
  if (d && d.kind === "herb") return "🌿";
  return "🎒";
}
function itemName(id) { var d = itemDef(id); return d ? t(d.nameKey) : id; }
function itemDesc(id) { var d = itemDef(id); return d && d.descKey ? t(d.descKey) : ""; }
/* Dòng skill trên trang bị — hiển thị xanh trong tooltip */
function equipSkillDesc(d) {
  if (!d || !d.skillLine || !d.skillLine.length) return "";
  var statName = { atk: t("stat_atk"), def: t("stat_def"), maxHp: t("stat_hp"), maxMp: t("stat_mp"), crit: "Bạo kích" };
  return d.skillLine.map(function (ln) {
    var txt = "";
    if (ln.skill) {
      var skName = ln.skill;
      try {
        if (typeof Skills !== "undefined" && Skills.skillDef) {
          var _sd = Skills.skillDef(ln.skill);
          if (_sd && _sd.nameKey) skName = t(_sd.nameKey);
        }
      } catch (e) {}
      txt = t("eq_skill_lv", { lv: ln.lv || 1, name: skName });
    } else if (ln.stat && ln.pct) {
      txt = t("eq_stat_pct", { pct: Math.round(ln.pct * 100), stat: statName[ln.stat] || ln.stat });
    } else if (ln.stat && ln.flat) {
      txt = "+" + ln.flat + " " + (statName[ln.stat] || ln.stat);
    }
    return txt ? '<span class="eq-skill">🔷 ' + esc(txt) + "</span>" : "";
  }).join(" ");
}
function monDef(id) { return (typeof MONSTERS !== "undefined" && MONSTERS[id]) || null; }
function monName(id) { var d = monDef(id); return d ? t(d.nameKey) : id; }
function mapDef(id) {
  if (typeof MAPS === "undefined") return null;
  for (var i = 0; i < MAPS.length; i++) if (MAPS[i].id === id) return MAPS[i];
  return MAPS[0] || null;
}

/* ---------------- toast ---------------- */
function toast(msg, cls) {
  var box = $("toasts");
  if (!box) return;
  var d = document.createElement("div");
  d.className = "toast" + (cls ? " " + cls : "");
  d.textContent = msg;
  box.appendChild(d);
  while (box.children.length > 3) box.removeChild(box.firstChild);
  setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 2600);
}

/* ============ THOẠI NHẬN/TRẢ NHIỆM VỤ CHÍNH TUYẾN (Bui 2026-10-18) ============
 * Quest có field acceptTalk/turninTalk (lang key) → hiện hộp thoại NPC
 * khi nhận/trả quest, đúng văn phong chính/ma đạo. */
function showQuestTalk(talkKey, npcNameKey) {
  if (!talkKey) return;
  try {
    var f = document.createElement("div");
    f.className = "quest-talk-overlay";
    f.innerHTML = '<div class="quest-talk-box">' +
      (npcNameKey ? '<div class="quest-talk-npc">' + esc(t(npcNameKey)) + '</div>' : '') +
      '<div class="quest-talk-text">' + esc(t(talkKey)) + '</div>' +
      '<div class="quest-talk-hint">' + esc(t("quest_talk_tap")) + '</div></div>';
    f.onclick = function () { if (f.parentNode) f.parentNode.removeChild(f); };
    document.body.appendChild(f);
    setTimeout(function () { if (f.parentNode) f.parentNode.removeChild(f); }, 6000);
  } catch (e) {}
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
var EQUIP_SLOTS = ["vukhi", "phapbao", "phihanh", "giap", "huanh",
                   "phapboi", "yphuc", "hanhngoa", "linhgioi"];
function getStats() {
  var c = state.char;
  var s = baseStats(c.realm, c.tier, c.sect);
  var eq = state.equip || {};
  EQUIP_SLOTS.forEach(function (slot) {
    var id = eq[slot];
    var it = itemDef(id);
    if (!it) return;
    var mult = enhanceMult((state.enhance && state.enhance[slot]) || 0);
    /* Luyện hóa: +8% chỉ số mỗi cấp */
    try {
      if (typeof Khilinh !== "undefined")
        mult *= Khilinh.refineStatMult(Khilinh.refineLvOf(state, id));
    } catch (e) {}
    /* Khí linh: +2% chỉ số mỗi cấp khí linh */
    try {
      if (typeof Khilinh !== "undefined")
        mult *= Khilinh.spiritStatMult(state, id);
    } catch (e) {}
    /* Nâng phẩm: dùng chỉ số chuẩn của cảnh giới mới */
    var baseAtk = it.atk || 0, baseDef = it.def || 0,
        baseHp = it.hp || 0, baseMp = it.mp || 0;
    try {
      if (typeof Khilinh !== "undefined" && Khilinh.tierUpOf(state, id) > 0) {
        var _nr = Khilinh.effRealmOf(it, state, id);
        var _ss = Khilinh.stdStats(_nr, it.slot);
        baseAtk = _ss.atk || 0; baseDef = _ss.def || 0;
        baseHp = _ss.hp || 0; baseMp = _ss.mp || 0;
      }
    } catch (e) {}
    /* NGOẠI LỆ đồ hiếm vượt cấp: chỉ phát huy 50% hiệu quả */
    try {
      if (typeof Khilinh !== "undefined" && Khilinh.isOverlevel(state, it)) {
        baseAtk = Math.round(baseAtk * 0.5); baseDef = Math.round(baseDef * 0.5);
        baseHp = Math.round(baseHp * 0.5); baseMp = Math.round(baseMp * 0.5);
      }
    } catch (e) {}
    s.atk += Math.round(baseAtk * mult);
    s.def += Math.round(baseDef * mult);
    s.maxHp += Math.round(baseHp * mult);
    s.maxMp += Math.round(baseMp * mult);
  });
  /* Dòng skill trang bị: +% chỉ số (atk/def/maxHp/maxMp) */
  try {
    if (typeof Khilinh !== "undefined") {
      var _pct = Khilinh.equipStatPct(state, itemDef);
      if (_pct.atk) s.atk = Math.round(s.atk * (1 + _pct.atk));
      if (_pct.def) s.def = Math.round(s.def * (1 + _pct.def));
      if (_pct.maxHp) s.maxHp = Math.round(s.maxHp * (1 + _pct.maxHp));
      if (_pct.maxMp) s.maxMp = Math.round(s.maxMp * (1 + _pct.maxMp));
    }
  } catch (e) {}
  /* Bonus tính cách khí linh của đồ đang đeo */
  try {
    if (typeof Khilinh !== "undefined") {
      EQUIP_SLOTS.forEach(function (slot) {
        var _id = eq[slot];
        if (!_id) return;
        var _pb = Khilinh.spiritPersonalityBonus(state, _id);
        if (!_pb) return;
        if (_pb.stat === "atk") s.atk = Math.round(s.atk * (1 + _pb.pct));
        else if (_pb.stat === "def") s.def = Math.round(s.def * (1 + _pb.pct));
        else if (_pb.stat === "maxHp") s.maxHp = Math.round(s.maxHp * (1 + _pb.pct));
        else if (_pb.stat === "maxMp") s.maxMp = Math.round(s.maxMp * (1 + _pb.pct));
      });
    }
  } catch (e) {}
  s.atk += (state.skills ? state.skills.length : 0) * 2; /* kiếm ý: mỗi skill +2 công */
  /* bị động: Kiếm Tâm / Thể Phách */
  try {
    if (typeof Skills !== "undefined" && Skills.applyPassives) s = Skills.applyPassives(s, state);
  } catch (e) {}
  /* Căn Cốt/Thần Thức: +HP/giáp (Căn Cốt) + buff nguyên tố yêu đan */
  try {
    if (typeof BodyCult !== "undefined" && BodyCult.applyStats) s = BodyCult.applyStats(s, state);
  } catch (e) {}
  /* Thiên phú chuyển thế: +HP tối đa (lifespan.js) */
  try {
    if (typeof Lifespan !== "undefined" && Lifespan.applyStats) s = Lifespan.applyStats(s, state);
  } catch (e) {}
  /* buff tông môn: Kim Cang Tông +20% HP tối đa, +15% giáp */
  try {
    if (typeof Sect !== "undefined" && Sect.sectBuff) {
      var _sbf = Sect.sectBuff(state);
      if (_sbf.hpMult !== 1) s.maxHp = Math.round(s.maxHp * _sbf.hpMult);
      if (_sbf.armorMult !== 1) s.def = Math.round(s.def * _sbf.armorMult);
    }
  } catch (e) {}
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
  /* Màn hình loading: thanh tiến trình theo từng bước tải */
  show("loading");
  setLoadProgress(2, "loading_label");
  var steps = [
    [18, function () { if (hasAudio() && AudioSys.init) AudioSys.init(); }],
    [38, function () {
      var saved = null;
      try { saved = (typeof Online !== "undefined" && Online.load) ? Online.load() : null; } catch (e) {}
      if (saved && saved.char && saved.char.name) state = saved;
      else state = defaultState();
      /* Tự phát hiện save cũ không tương thích → đề xuất xóa dữ liệu cũ
         (chỉ đề xuất, không tự xóa; hình ảnh & hiệu ứng luôn được giữ lại) */
      try {
        if (typeof isSaveIncompatible === "function" && isSaveIncompatible(saved)) {
          setTimeout(function () {
            try {
              if (typeof clearOldData === "function" && typeof reloadFresh === "function" &&
                  confirm(t("cleardata_oldsave"))) {
                clearOldData();
                reloadFresh();
              }
            } catch (e2) {}
          }, 1500);
        }
      } catch (e) {}
      /* save cũ: tự sinh ID nhân vật khi load lần đầu */
      if (typeof Social !== "undefined") { try { Social.ensureCharId(state); } catch (e) {} }
      /* Milestone 2: đăng nhập ẩn danh Supabase + đồng bộ bạn bè/nhắn tin */
      try {
        if (typeof OnlineSB !== "undefined") {
          OnlineSB.boot(state);
          if (typeof Social !== "undefined") {
            Social._onSearchDone = function (q, res) {
              try {
                if (q === frQuery && panel === "friends" && friendTab() === "list") {
                  frResults = res; renderPanel();
                }
              } catch (e) {}
            };
          }
        }
      } catch (e) {}
      if (hasEngine() && Engine.bindState) Engine.bindState(state);
      if (hasAudio() && AudioSys.bindState) AudioSys.bindState(state);
      /* Thọ Nguyên: trừ theo ngày thực đã trôi khi offline (lifespan.js) */
      try {
        if (typeof Lifespan !== "undefined") {
          var _btr = Lifespan.tick(state, Date.now());
          if (_btr.dripExp > 0 && typeof gainExp === "function") gainExp(state, _btr.dripExp);
          if (_btr.died) setTimeout(function () { try { openPanel("death"); } catch (e2) {} }, 900);
        }
      } catch (e) {}
    }],
    [58, function () {
      try {
        if (!state.lang) {
          var ls = null;
          try { ls = localStorage.getItem("ttonline_v2_lang"); } catch (e2) {}
          state.lang = ls || "vi";
        }
      } catch (e) { state.lang = state.lang || "vi"; }
      setLang(state.lang);
      applyI18n();
    }],
    [78, function () { bindStatic(); preloadFxSheets(); }],
    [84, function () {
      /* Tay cầm: tự refresh panel Cài đặt khi cắm/rút/gán phím xong */
      try {
        if (typeof GamepadInput !== "undefined") {
          GamepadInput.onChange = function () {
            try {
              if (typeof renderPanel !== "undefined") renderPanel();
            } catch (e) {}
          };
        }
      } catch (e) {}
    }],
    [100, function () {
      if (state.char && state.char.name) { show("menu"); refreshMenu(); }
      else { show("create"); initCreate(); }
      music("menu");
      setInterval(hudTick, 1000);
    }],
  ];
  var i = 0;
  (function next() {
    if (i >= steps.length) return;
    var st = steps[i++];
    try { st[1](); } catch (e) {}
    setLoadProgress(st[0], "loading_label");
    setTimeout(next, 120);
  })();
}

function setLoadProgress(pct, labelKey) {
  var f = $("loading-fill"), p = $("loading-pct"), l = $("loading-label");
  if (f) f.style.width = pct + "%";
  if (p) p.textContent = pct + "%";
  if (l && labelKey) { try { l.textContent = t(labelKey); } catch (e) {} }
}

/* Tải trước các effect sheet để lúc tung skill không khựng */
function preloadFxSheets() {
  if (typeof Image === "undefined") return;
  var sheets = ["eff_slash_sheet", "eff_fire_sheet", "eff_lightning_sheet",
    "eff_ice_sheet", "eff_formation_sheet", "eff_demon_sheet",
    "eff_moon_sheet", "eff_dragon_sheet", "eff_swordshadow_sheet"];
  sheets.forEach(function (n) {
    var im = new Image();
    im.src = "assets/eff/" + n + ".png";
  });
}

function show(name) {
  screen = name;
  if (name !== "create") { try { stopCreatePreview(); } catch (e) {} }
  ["loading", "menu", "create", "game"].forEach(function (n) {
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
  $("btn-friends").classList.toggle("hidden", !has);
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
  /* Đầu game là phàm nhân — không chọn tông môn/hệ phái, mặc định kiếm cho chỉ số */
  createSel = { sect: "kiem", element: null, quality: null, gender: "nam" };
  $("lingen-result").textContent = t("lingen_none");
  syncCreateGender();
  startCreatePreview();
}

/* ---- Xem truoc nhan vat o man tao (art moi, 4 khung buoc) ---- */
var _createPreviewTimer = null;
var _createPreviewFrame = 0;
function syncCreateGender() {
  var g = (createSel.gender === "nu") ? "nu" : "nam";
  var bn = $("create-gender-nam"), bu = $("create-gender-nu");
  if (bn) bn.classList.toggle("sel", g === "nam");
  if (bu) bu.classList.toggle("sel", g === "nu");
  updateCreatePreview();
}
function updateCreatePreview() {
  var img = $("create-char-img");
  if (!img) return;
  var g = (createSel.gender === "nu") ? "nu" : "nam";
  /* Đầu game là phàm nhân — preview áo vải thô theo giới tính */
  img.src = "assets/sprs/mortal_preview_" + g + ".png";
}
function startCreatePreview() {
  stopCreatePreview();
  updateCreatePreview();
}
function stopCreatePreview() {
  if (_createPreviewTimer) { clearInterval(_createPreviewTimer); _createPreviewTimer = null; }
}

function rollLingen() {
  var rates = (typeof LINGEN_RATES !== "undefined") ? LINGEN_RATES :
    [["kim", 18], ["moc", 18], ["thuy", 18], ["hoa", 18], ["tho", 18]];
  var total = 0, i;
  for (i = 0; i < rates.length; i++) total += rates[i][1];
  var r = Math.random() * total, el = rates[0][0];
  for (i = 0; i < rates.length; i++) { r -= rates[i][1]; if (r <= 0) { el = rates[i][0]; break; } }
  var rare = (el === "bang" || el === "loi" || el === "phong" || el === "hondon" ||
              el === "quang" || el === "am" || el === "doc" || el === "huyet");
  var q = Math.random();
  var quality = q < 0.05 ? "thien" : (q < 0.30 ? "dia" : "pham");
  if (rare && quality === "pham") quality = "dia"; /* linh căn hiếm tối thiểu địa phẩm */
  createSel.element = el;
  createSel.quality = quality;
  $("lingen-result").innerHTML = lingenIconHtml(el, 28) + "<span>" +
    esc(t("lingen_result", { name: t("el_" + el) + " · " + t("qual_" + quality) })) + "</span>";
  sfx("success");
}

/* Trắc linh căn cho state (dùng khi NV2 Dị Tượng Cửu Sắc hoàn thành — Bui 2026-10-18) */
function rollLingenFor(st) {
  var rates = (typeof LINGEN_RATES !== "undefined") ? LINGEN_RATES :
    [["kim", 18], ["moc", 18], ["thuy", 18], ["hoa", 18], ["tho", 18]];
  var total = 0, i;
  for (i = 0; i < rates.length; i++) total += rates[i][1];
  var r = Math.random() * total, el = rates[0][0];
  for (i = 0; i < rates.length; i++) { r -= rates[i][1]; if (r <= 0) { el = rates[i][0]; break; } }
  var rare = (el === "bang" || el === "loi" || el === "phong" || el === "hondon" ||
              el === "quang" || el === "am" || el === "doc" || el === "huyet");
  var q = Math.random();
  var quality = q < 0.05 ? "thien" : (q < 0.30 ? "dia" : "pham");
  if (rare && quality === "pham") quality = "dia";
  st.char = st.char || {};
  st.char.element = el;
  st.char.elementQuality = quality;
  st.char.roots = [el];
  return { element: el, quality: quality };
}

/* Icon linh căn: <img> + fallback emoji nếu ảnh lỗi */
function lingenIconHtml(el, size) {
  size = size || 28;
  var emo = { kim: "⚔️", moc: "🌿", thuy: "💧", hoa: "🔥", tho: "🪨", bang: "❄️",
    loi: "⚡", phong: "🌪️", quang: "☀️", am: "🌙", doc: "☠️", huyet: "🩸", hondon: "🌀" }[el] || "✨";
  var tip = "";
  try { tip = t("el_" + el); } catch (e) {}
  return '<img class="lingen-icon" width="' + size + '" height="' + size + '"' +
    ' src="assets/linhcan/' + el + '.png" alt="" title="' + esc(tip) + '"' +
    ' onerror="this.outerHTML=' + "'" + '<span>' + emo + "</span>'" + '"' +
    ' style="vertical-align:-6px;margin-right:6px;border-radius:6px">';
}

function beginGame() {
  var name = ($("create-name").value || "").trim() || t("ui_default_name");
  var st = defaultState();
  st.lang = state.lang;
  st.settings = state.settings;
  state = st;
  state.char.name = name;
  state.char.sect = createSel.sect;
  state.char.gender = (createSel.gender === "nu") ? "nu" : "nam";
  state.char.element = null; /* linh căn trắc ở NV2 Dị Tượng Cửu Sắc (Bui 2026-10-18) */
  state.char.elementQuality = null;
  state.char.roots = []; /* linh căn trắc ở NV2, khai mở thêm bằng Khai Mạch Đan */
  state.char.cotPham = null; /* phẩm chất căn cốt — định khi uống Tẩy Cốt Đan đầu tiên */
  state.char.realm = 1; state.char.tier = 1; /* bắt đầu Luyện Khí tầng 1 */
  /* Luồng vào game mới: nhân vật mới → chiếu cốt truyện "Đêm Máu Làng Phong Diệp" 1 lần */
  state.flags.story_intro_done = false;
  if (typeof Social !== "undefined") { try { Social.ensureCharId(state); } catch (e) {} }
  var bs = baseStats(1, 1, createSel.sect);
  state.char.hp = bs.maxHp; state.char.mp = bs.maxMp;
  state.flags.taycot_done = false; /* tẩy cốt ở NV6 Tẩy Cốt Phạt Tủy */
  if (hasEngine() && Engine.bindState) Engine.bindState(state);
  if (hasAudio() && AudioSys.bindState) AudioSys.bindState(state);
  saveGame(state);
  sfx("success");
  startGame();
  /* Cốt truyện mở đầu cho nhân vật mới (Bui 2026-10-18) */
  try { if (typeof Story !== "undefined" && Story.maybeShow) Story.maybeShow(); } catch (e) {}
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
      try { if (typeof BodyCult !== "undefined") BodyCult.onKill(state); } catch (e) {} /* nv luyện thể ngày */
      var m = curSecretRealm ? null : mapDef(curMapId);
      var expMult = (m && m.expMult) || 1; /* Thông Thiên Giới: exp x2 */
      if (ev.elite && typeof BodyCult !== "undefined") expMult *= BodyCult.DEF.elite.expMult; /* tinh anh */
      var r = gainExp(state, Math.round((def.exp || 0) * expMult));
      if (r.leveled) { toast(t("lvlup_msg")); sfx("success"); }
      var st = (typeof Combat !== "undefined" && m && Combat.stoneDrop) ? Combat.stoneDrop(m) : 0;
      if (ev.elite) st *= 2; /* tinh anh: gấp đôi linh thạch */
      if (st > 0) state.stones += st;
      var drops = (typeof Combat !== "undefined" && Combat.rollDrops) ? Combat.rollDrops(def, !!ev.elite) : [];
      if (ev.elite && typeof Combat !== "undefined" && Combat.rollDrops) drops = drops.concat(Combat.rollDrops(def, true)); /* tinh anh: đồ tốt hơn */
      /* Yêu đan: tinh anh 50%, boss 60% — cấp theo map */
      try {
        if (typeof BodyCult !== "undefined") {
          var _ydTier = BodyCult.yaodanTierFor(curMapId, !!def.boss);
          var _ydRate = ev.elite ? BodyCult.DEF.elite.yaodanRate : (def.boss ? BodyCult.DEF.elite.bossYaodanRate : 0);
          if (_ydRate > 0 && Math.random() < _ydRate) {
            var _ydId = "yaodan" + _ydTier;
            if (Math.random() < 0.35) {
              var _els = BodyCult.DEF.yaodan.elements;
              _ydId += "_" + _els[Math.floor(Math.random() * _els.length)];
            }
            drops.push({ id: _ydId, qty: 1 });
          }
        }
      } catch (e) {}
      /* Thu phục yêu thú hóa hình ở bãi quái (GrindZone): thường 0.5% / tinh anh 3% / boss 10% */
      try {
        if (typeof GrindZone !== "undefined" && def && def.loai === "thu") {
          var _tame = GrindZone.tameRoll(monId, def, !!ev.elite, !!def.boss, curMapId);
          if (_tame) {
            addItem(state, "trung_thuan_hoa", 1);
            state.tameQueue = state.tameQueue || [];
            state.tameQueue.push(_tame);
            var _sp = (typeof petSpecies === "function") ? petSpecies(_tame.speciesId) : null;
            var _spName = _sp ? _sp.vi : _tame.speciesId;
            toast(t("tame_success", { name: _spName }), "gold");
            sfx("success");
          }
        }
      } catch (e) {}
      drops.forEach(function (d) {
        addItem(state, d.id, d.qty || 1);
        var dd = itemDef(d.id);
        if (dd && dd.kind === "manual" && dd.bossDrop) {
          /* Bí tịch BOSS: thông báo vàng đặc biệt */
          toast(t("boss_manual_drop", { name: itemName(d.id) }), "gold");
          sfx("success");
        } else {
          toast(t("drop_get", { name: itemName(d.id), n: d.qty || 1 }));
          sfx("pickup");
        }
      });
      if (typeof Quest !== "undefined" && Quest.onKill) Quest.onKill(state, monId);
      try {
        if (typeof Sect !== "undefined" && Sect.onKill) Sect.onKill(state, !!def.boss);
        if (typeof Alliance !== "undefined" && Alliance.onKillAlm) Alliance.onKillAlm(state, !!def.boss);
        if (typeof SectQuest !== "undefined" && SectQuest.onKill) SectQuest.onKill(state, monId, !!def.boss);
      } catch (e) {}
      saveGame(state);
      refreshHUD();
      if (panel === "quest") renderPanel();
    };

    Engine.onNpc = function (npcId) {
      if (typeof NPC === "undefined" || !NPC.talk) return;
      Engine.talkNpcId = npcId; /* NPC hiện 💬 nói chuyện */
      openPanel("npc", { npcId: npcId, talk: NPC.talk(npcId, state) });
      /* NV1 Lễ Trắc Linh: đếm số dân làng đã chào hỏi (Bui 2026-10-18) */
      try {
        if (typeof Quest !== "undefined" && Quest.onNpcTalk) {
          var chg = Quest.onNpcTalk(state, npcId) || [];
          chg.forEach(function (c) {
            saveGame(state);
            toast(t("q_progress_talk", { a: c.done, b: c.total }));
            sfx("success");
          });
          if (chg.length && panel === "quest") renderPanel();
        }
      } catch (e) {}
    };

    Engine.onGate = function (to) {
      var doEnter = function () {
        curMapId = to;
        state.map.id = to;
        curSecretRealm = null; /* rời bí cảnh (nếu đang ở) */
        if (hasEngine() && Engine.leaveSecretRealm) Engine.leaveSecretRealm();
        var m = mapDef(to);
        /* vào map trái đạo: aura bài xích */
        state.mapAura = mapDaoMismatch(m) ? { mapDao: m.dao } : null;
        if (state.mapAura) toast(t(m.dao === "ma" ? "map_aura_ma_desc" : "map_aura_tien_desc"));
        saveGame(state);
        music("map");
        bossMusicOn = false;
        if (m) toast(t(m.nameKey));
        if (hasEngine() && Engine.enterMap) Engine.enterMap(to);
        refreshHUD();
      };
      /* màn hình chờ riêng của map đích + tiến trình tải thật */
      if (typeof MapLoading !== "undefined" && MapLoading.show) {
        var md = (typeof MAPS !== "undefined")
          ? (function () { for (var i = 0; i < MAPS.length; i++) if (MAPS[i].id === to) return MAPS[i]; return null; })()
          : null;
        MapLoading.show(md || { id: to, nameKey: "" }, doEnter);
      } else doEnter();
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
    /* vào game cũng qua màn hình chờ của map hiện tại */
    var enterFirst = function () {
      if (Engine.enterMap) Engine.enterMap(curMapId);
      if (Engine.start) Engine.start();
    };
    if (typeof MapLoading !== "undefined" && MapLoading.show) {
      var md0 = mapDef(curMapId);
      MapLoading.show(md0 && md0.id === curMapId ? md0 : { id: curMapId, nameKey: "" }, enterFirst);
    } else enterFirst();
  }
  lastHp = null;
  syncToggles();
  refreshHUD();
}

/* tick 1s: HUD, phát hiện chết/hồi sinh, nhạc boss, autosave */
function hudTick() {
  if (screen !== "game" || !state) return;
  refreshHUD();
  socialTick(); /* bạn bè: lời mời/tin nhắn giả lập realtime */
  /* Thọ Nguyên: trừ theo giờ thực + cảnh báo sắp hết (lifespan.js) */
  try {
    if (typeof Lifespan !== "undefined") {
      var _tr = Lifespan.tick(state, Date.now());
      if (_tr.dripExp > 0 && typeof gainExp === "function") gainExp(state, _tr.dripExp);
      if (_tr.days > 0) saveGame(state);
      if (_tr.died) { if (panel !== "death") openPanel("death"); }
      else if (Lifespan.isLow(state)) {
        if (!tnWarned) { tnWarned = true; toast(t("tn_low_warn", { n: Lifespan.yearsLeft(state) }), "warn"); sfx("fail"); }
      } else tnWarned = false;
    }
  } catch (e) {}
  secretTick(); /* Bí Cảnh tranh đoạt: banner đếm ngược + nút thu thập */
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
  var curHp = state.char.hp, curMp = state.char.mp, curFocus = 100, curShield = 0, maxShield = 1;
  if (hasEngine() && Engine.player) {
    curHp = Engine.player.hp; curMp = Engine.player.mp;
    curFocus = Engine.player.focus || 0;
    curShield = Engine.player.shield || 0;
    maxShield = Engine.player.maxShield || 1;
  }
  $("hud-name").textContent = state.char.name;
  $("hud-realm").textContent = stageName(state.char.realm, state.char.tier);
  setBar("hud-hp", curHp, s.maxHp);
  setBar("hud-mp", curMp, s.maxMp);
  setBar("hud-focus", curFocus, 100);
  setBar("hud-shield", curShield, maxShield);
  $("hud-stones").textContent = formatTien(state.stones);
  /* Đồng hồ + ping (kiểu tutien2d) */
  var _clk = $("clock-time");
  if (_clk) { var _d = new Date(); _clk.textContent = ("0"+_d.getHours()).slice(-2)+":"+("0"+_d.getMinutes()).slice(-2)+":"+("0"+_d.getSeconds()).slice(-2); }
  var kc = (state.killDate === todayStr()) ? (state.killCount || 0) : 0;
  $("hud-kills").textContent = kc + "/10000";
  updateBossBar();
  skillbarTick();
  updatePotionBadges(); /* số lượng đan dược trên nút uống nhanh */
  updateChatBadge(); /* badge tin nhắn chưa đọc */
  /* HUD chuẩn tutien2d: số lực chiến + thanh EXP + tên map (minimap) */
  try {
    var _pwEl = $("hud-power");
    if (_pwEl) _pwEl.textContent = "⚔" + inspectPowerOf(s);
    var _ch = state.char;
    var _eMax = (typeof expMaxFor === "function") ? expMaxFor(_ch.realm, _ch.tier) : 1;
    setBar("hud-exp", _ch.exp || 0, _eMax);
    /* % EXP kiểu tutien2d (dưới 4 thanh) */
    var _expPct = $("hud-exp-txt2");
    if (_expPct) _expPct.textContent = ((_ch.exp || 0) / _eMax * 100).toFixed(1) + "%";
    var _mnEl = $("minimap-name");
    if (_mnEl) { try { var _mDef = mapDef(curMapId); if (_mDef) _mnEl.textContent = t(_mDef.nameKey); } catch (_e2) {} }
  } catch (_e3) {}
  drawMinimap();
  function setBar(id, cur, max) {
    var f = $(id + "-fill"), tx = $(id + "-txt");
    if (f) f.style.width = Math.max(0, Math.min(100, cur / max * 100)) + "%";
    if (tx) tx.textContent = Math.max(0, Math.ceil(cur)) + "/" + Math.round(max);
  }
}

/* Thanh boss trên-giữa + cửa sổ SƠ HỞ */
/* Đếm đan dược còn trong túi để hiện badge trên 2 nút uống nhanh */
function countPotion(kind) {
  var n = 0;
  if (!state || !state.bag) return 0;
  for (var i = 0; i < state.bag.length; i++) {
    var it = state.bag[i];
    if (it.locked || !it.qty) continue;
    var d = (typeof itemDef === "function") ? itemDef(it.id) : null;
    if (!d || d.kind !== "pill") continue;
    var v = kind === "hp" ? (d.healHp || 0) : (d.healMp || 0);
    if (v > 0) n += it.qty;
  }
  return n;
}
function updatePotionBadges() {
  var bh = $("badge-hp"), bm = $("badge-mp");
  if (bh) bh.textContent = countPotion("hp") || "";
  if (bm) bm.textContent = countPotion("mp") || "";
}
function updateBossBar() {
  var bar = $("boss-bar");
  if (!bar) return;
  var info = (hasEngine() && Engine.getBossInfo) ? Engine.getBossInfo() : null;
  if (!info) { bar.classList.add("hidden"); return; }
  bar.classList.remove("hidden");
  $("boss-name").textContent = info.name + (info.realm ? " · " + info.realm : "");
  $("boss-hp-fill").style.width = Math.max(0, info.hp / info.maxHp * 100) + "%";
  var bt = $("boss-hp-txt");
  if (bt) bt.textContent = info.hp + " / " + info.maxHp;
  var wk = $("boss-weak");
  if (wk) wk.classList.toggle("hidden", !info.weak);
}

function syncToggles() {
  $("btn-auto").classList.toggle("on", !!state.auto);
  $("btn-fly").classList.toggle("on", !!state.fly);
  $("btn-run").classList.toggle("on", !!state.run);
  /* Nút Tọa sáng khi đang thiền */
  try {
    var med = (typeof BodyCult !== "undefined" && BodyCult.meditateLeft) ? BodyCult.meditateLeft(state) > 0 : false;
    $("btn-meditate").classList.toggle("on", !!med);
  } catch (e) {}
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
  /* sáng nút nav đang mở */
  try {
    var _nbs = document.querySelectorAll("#bottomnav button");
    for (var _ni = 0; _ni < _nbs.length; _ni++)
      _nbs[_ni].classList.toggle("active", _nbs[_ni].getAttribute("data-panel") === name);
  } catch (e) {}
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
  /* Tọa hóa: không cho đóng panel cho đến khi chuyển thế / hồi sinh */
  try {
    if (panel === "death" && typeof Lifespan !== "undefined" && Lifespan.isDead(state)) return;
  } catch (e) {}
  if (btTimer) { clearInterval(btTimer); btTimer = null; }
  if (typeof towerAnimTimer !== "undefined" && towerAnimTimer) { clearInterval(towerAnimTimer); towerAnimTimer = null; }
  if (sectTrialTimer) { clearInterval(sectTrialTimer); sectTrialTimer = null; }
  sectTrial = null;
  btBattle = null; btStep = "needs";
  panel = null; panelArg = null;
  /* tắt sáng nút nav */
  try {
    var _nbs2 = document.querySelectorAll("#bottomnav button.active");
    for (var _nj = 0; _nj < _nbs2.length; _nj++) _nbs2[_nj].classList.remove("active");
  } catch (e2) {}
  if (typeof Engine !== "undefined") Engine.talkNpcId = null; /* tắt 💬 */
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
  /* chat: cuộn xuống tin mới nhất */
  var cl = $("chat-log"); if (cl) cl.scrollTop = cl.scrollHeight;
  var wl = $("world-log"); if (wl) wl.scrollTop = wl.scrollHeight;
  /* Enter = gửi */
  var ci = $("chat-in");
  if (ci) ci.addEventListener("keydown", function (e) { if (e.key === "Enter") doChatSend(); });
  var wi = $("world-in");
  if (wi) wi.addEventListener("keydown", function (e) { if (e.key === "Enter") doWorldSend(); });
  var ri = $("rename-in");
  if (ri) ri.addEventListener("keydown", function (e) { if (e.key === "Enter") doRename(); });
}

function tabBtns(tabs, cur, act) {
  return '<div class="tabs">' + tabs.map(function (tb) {
    return '<button class="mini' + (tb[0] === cur ? " on" : "") + '" data-act="' + act + '" data-v="' + tb[0] + '">' + esc(tb[1]) + "</button>";
  }).join("") + "</div>";
}

/* ================= BẠN BÈ + NHẮN TIN (dùng Social trong social.js) ================= */
function hasSocial() { return typeof Social !== "undefined"; }
var frQuery = "", frResults = [], genderSel = "nam";

function friendTab() { return (panelArg && panelArg.tab) || "list"; }

function renderFriends() {
  if (!hasSocial()) return "";
  var reqN = Social.pendingInCount(state);
  var h = tabBtns([
    ["list", t("fr_tab_list")],
    ["req", t("fr_tab_req") + (reqN ? " (" + reqN + ")" : "")],
    ["world", t("fr_tab_world")],
  ], friendTab(), "fr-tab");
  var tb = friendTab();
  if (tb === "list") h += renderFriendList();
  else if (tb === "req") h += renderFriendReq();
  else h += renderWorld();
  return h;
}

function frStatusDot(online) {
  return '<span class="dot-' + (online ? "online" : "offline") + '"></span>';
}

function renderFriendList() {
  var h = '<div class="fr-search-row"><input id="fr-q" class="fld-input" maxlength="24" value="' +
    esc(frQuery) + '" placeholder="' + esc(t("fr_search_ph")) + '">' +
    '<button class="btn btn-jade" data-act="fr-search">' + esc(t("fr_search")) + "</button></div>";
  h += '<div id="fr-results">' + frResults.map(function (p) {
    var btn = p.isFriend ? "" :
      (p.requested ? '<button class="mini" data-act="fr-cancel-req" data-id="' + esc(p.id) + '">' + esc(t("fr_req_out")) + " ✕</button>"
                   : '<button class="mini" data-act="fr-add" data-id="' + esc(p.id) + '">＋ ' + esc(t("fr_add")) + "</button>");
    return '<div class="fr-row">' + frStatusDot(p.online) +
      '<div class="fr-info"><b class="insp-name" data-inspect="' + esc(p.id) + '">' + esc(p.name) + '</b> <span class="fr-id">' + esc(Social.shortId(p.id)) + "</span>" +
      '<div class="fr-sub">' + esc(stageName(p.realm, p.tier)) + " · " + esc(t(p.online ? "fr_online" : "fr_offline")) + "</div></div>" +
      '<div class="fr-btns">' + btn + "</div></div>";
  }).join("") + "</div>";
  var friends = Social._soc(state).friends;
  if (!friends.length) h += '<p class="sect-note">' + esc(t("fr_list_empty")) + "</p>";
  h += friends.map(function (f) {
    var unread = (Social._soc(state).unread[f.id] || 0);
    return '<div class="fr-row">' + frStatusDot(f.online) +
      '<div class="fr-info"><b class="insp-name" data-inspect="' + esc(f.id) + '">' + esc(f.name) + '</b> <span class="fr-id">' + esc(Social.shortId(f.id)) + "</span>" +
      '<div class="fr-sub">' + esc(stageName(f.realm, f.tier)) + " · " + esc(t(f.online ? "fr_online" : "fr_offline")) + "</div></div>" +
      '<div class="fr-btns"><button class="mini" data-act="fr-chat" data-id="' + esc(f.id) + '">' + esc(t("fr_chat")) +
      (unread ? ' <span class="badge inbtn">' + unread + "</span>" : "") + "</button>" +
      '<button class="mini red" data-act="fr-remove" data-id="' + esc(f.id) + '">' + esc(t("fr_remove")) + "</button></div></div>";
  }).join("");
  return h;
}

function renderFriendReq() {
  var soc = Social._soc(state);
  var h = '<div class="fld-label">' + esc(t("fr_req_in")) + "</div>";
  h += soc.requestsIn.length ? soc.requestsIn.map(function (r) {
    return '<div class="fr-row"><div class="fr-info"><b>' + esc(r.name) + '</b> <span class="fr-id">' +
      esc(Social.shortId(r.id)) + '</span></div><div class="fr-btns">' +
      '<button class="mini" data-act="fr-accept" data-id="' + esc(r.id) + '">' + esc(t("fr_accept")) + "</button>" +
      '<button class="mini red" data-act="fr-decline" data-id="' + esc(r.id) + '">' + esc(t("fr_decline")) + "</button></div></div>";
  }).join("") : '<p class="sect-note">' + esc(t("fr_req_empty")) + "</p>";
  h += '<div class="fld-label">' + esc(t("fr_req_out")) + "</div>";
  h += soc.requestsOut.length ? soc.requestsOut.map(function (r) {
    return '<div class="fr-row"><div class="fr-info"><b>' + esc(r.name) + '</b> <span class="fr-id">' +
      esc(Social.shortId(r.id)) + '</span></div><div class="fr-btns">' +
      '<button class="mini" data-act="fr-cancel-req" data-id="' + esc(r.id) + '">✕</button></div></div>';
  }).join("") : '<p class="sect-note">' + esc(t("fr_req_empty")) + "</p>";
  return h;
}

/* ----- Chat 1-1 ----- */
function renderChat() {
  var fid = panelArg && panelArg.friendId;
  var f = hasSocial() && fid ? Social.getFriend(state, fid) : null;
  if (!f) return '<p class="sect-note">' + esc(t("fr_notfound")) + "</p>";
  var h = '<div class="chat-head"><button class="mini" data-act="chat-back">←</button>' +
    '<div class="chat-title">' + frStatusDot(f.online) + ' <b class="insp-name" data-inspect="' + esc(fid) + '">' + esc(f.name) + '</b> <span class="fr-id">' +
    esc(Social.shortId(f.id)) + '</span><div class="fr-sub">' + esc(t(f.online ? "fr_online" : "fr_offline")) + "</div></div></div>";
  var th = Social.getThread(state, fid);
  h += '<div class="chat-log" id="chat-log">' +
    (th.length ? th.map(function (m) {
      var me = m.from === "me";
      return '<div class="msg-row ' + (me ? "me" : "them") + '">' +
        (me ? "" : '<div class="msg-name">' + esc(m.name) + "</div>") +
        '<div class="msg-bubble">' + esc(m.text) + "</div></div>";
    }).join("") : '<p class="sect-note">' + esc(t("chat_empty")) + "</p>") + "</div>";
  h += '<div class="chat-input-row"><input id="chat-in" class="fld-input" maxlength="200" placeholder="' +
    esc(t("chat_input_ph")) + '">' +
    '<button class="btn btn-jade" data-act="chat-send">' + esc(t("chat_send")) + "</button></div>";
  Social.markRead(state, fid);
  try { saveGame(state); } catch (e) {}
  return h;
}

function doChatSend() {
  var inp = $("chat-in");
  var fid = panelArg && panelArg.friendId;
  var r = Social.sendMessage(state, fid, inp ? inp.value : "");
  if (!r.ok) {
    if (r.reason === "spam") toast(t("msg_spam", { n: r.waitSec }));
    sfx("fail"); return;
  }
  saveGame(state); sfx("click"); renderPanel();
}

/* ----- Chat thế giới ----- */
function renderWorld() {
  var h = '<p class="sect-note">📢 ' + esc(t("world_sys")) + "</p>";
  var w = Social.getWorld(state);
  h += '<div class="chat-log" id="world-log">' +
    (w.length ? w.map(function (m) {
      return '<div class="msg-row ' + (m.me ? "me" : "them") + '">' +
        (m.me ? "" : '<div class="msg-name insp-name"' + (m.charId ? ' data-inspect="' + esc(m.charId) + '"' : "") + ">" + esc(m.name) + ' <span class="fr-id">' + esc(Social.shortId(m.charId)) + "</span></div>") +
        '<div class="msg-bubble">' + esc(m.text) + "</div></div>";
    }).join("") : '<p class="sect-note">' + esc(t("world_empty")) + "</p>") + "</div>";
  h += '<div class="chat-input-row"><input id="world-in" class="fld-input" maxlength="200" placeholder="' +
    esc(t("chat_input_ph")) + '">' +
    '<button class="btn btn-jade" data-act="world-send">' + esc(t("chat_send")) + "</button></div>";
  return h;
}

function doWorldSend() {
  var inp = $("world-in");
  var r = Social.sendWorld(state, inp ? inp.value : "");
  if (!r.ok) {
    if (r.reason === "spam") toast(t("msg_spam", { n: r.waitSec }));
    sfx("fail"); return;
  }
  saveGame(state); sfx("click"); renderPanel();
}

/* ----- Đổi tên ----- */
function renderRename() {
  var c = state.char;
  var cr = hasSocial() ? Social.canRename(state) : { ok: true, free: true, waitDays: 0 };
  var hasCard = (typeof countItem !== "undefined") && countItem(state, "the_doi_ten") > 0;
  var h = '<div class="rename-box">' +
    '<div class="fld-label">' + esc(t("create_name_label")) + ': <b>' + esc(c.name) + "</b></div>" +
    '<div class="sect-note">' + esc(t("char_id")) + ': <b>' + esc(c.charId || "") + "</b></div>";
  if (cr.free) h += '<p class="bonus-xanh">🎉 ' + esc(t("rename_free")) + "</p>";
  else if (cr.ok) h += '<p class="bonus-xanh">✓ ' + esc(t("rename_cooldown_ok")) + "</p>";
  else h += '<p class="red">⏳ ' + esc(t("rename_cooldown", { n: cr.waitDays })) + "</p>";
  if (!cr.free && !hasCard) h += '<p class="sect-note">🎫 ' + esc(t("rename_need_card")) + "</p>";
  h += '<input id="rename-in" class="fld-input" maxlength="12" placeholder="' + esc(t("rename_input_ph")) + '">' +
    '<button class="btn btn-jade" data-act="rename-do" style="margin-top:8px">' + esc(t("rename_confirm")) + "</button>";
  h += '<div class="fld-label" style="margin-top:12px">' + esc(t("rename_history")) + "</div>";
  var hist = c.nameHistory || [];
  h += hist.length ? hist.slice().reverse().map(function (x) {
    return '<div class="fr-row"><div class="fr-info">' + esc(x.name) + "</div></div>";
  }).join("") : '<p class="sect-note">' + esc(t("rename_no_history")) + "</p>";
  return h + "</div>";
}

function doRename() {
  var inp = $("rename-in");
  var r = Social.doRename(state, inp ? inp.value : "");
  if (!r.ok) {
    if (r.reason === "cooldown") toast(t("rename_cooldown", { n: r.waitDays }));
    else if (r.reason === "no_card") toast(t("rename_need_card"));
    else if (r.reason === "banned") toast(t("rename_banned"));
    else toast(t("rename_invalid"));
    sfx("fail"); return;
  }
  saveGame(state); sfx("success"); toast(t("rename_ok"));
  refreshHUD(); renderPanel();
}

/* ----- Đổi giới tính ----- */
function renderGender() {
  var g = state.char.gender || "nam";
  if (genderSel !== "nam" && genderSel !== "nu") genderSel = g;
  var hasCard = (typeof countItem !== "undefined") && countItem(state, "the_doi_gioi_tinh") > 0;
  var h = '<div class="rename-box"><p class="sect-note">' + esc(t("gender_desc")) + "</p>" +
    '<div class="fld-label">' + esc(t("gender_cur")) + ': <b>' + esc(t("gender_" + g)) + "</b></div>" +
    '<div class="gender-row">' +
    ["nam", "nu"].map(function (x) {
      return '<button class="btn ' + (genderSel === x ? "btn-jade" : "btn-paper") + '" data-act="gender-sel" data-v="' + x + '">' +
        (x === "nam" ? "♂ " : "♀ ") + esc(t("gender_" + x)) + "</button>";
    }).join("") + "</div>";
  if (!hasCard) h += '<p class="sect-note">👫 ' + esc(t("gender_need_card")) + "</p>";
  h += '<button class="btn btn-jade" data-act="gender-do" style="margin-top:8px">' + esc(t("gender_confirm")) + "</button></div>";
  return h;
}

function doGenderChange() {
  var r = Social.doGenderChange(state, genderSel);
  if (!r.ok) {
    if (r.reason === "no_card") toast(t("gender_need_card"));
    else toast(t("gender_" + (state.char.gender || "nam")));
    sfx("fail"); return;
  }
  saveGame(state); sfx("success"); toast(t("gender_ok")); renderPanel();
}

/* ----- Copy ID ----- */
function copyCharId() {
  var id = (state.char && state.char.charId) || "";
  function done() { toast(t("char_id_copied")); sfx("click"); }
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(id).then(done, done); return;
    }
  } catch (e) {}
  var ta = document.createElement("textarea");
  ta.value = id; document.body.appendChild(ta); ta.select();
  try { document.execCommand("copy"); } catch (e2) {}
  document.body.removeChild(ta); done();
}

/* ----- Badge tin nhắn + tick giả lập realtime ----- */
function updateChatBadge() {
  var b = $("qr-chat-badge") || $("chat-badge");
  if (!b) return;
  var n = (hasSocial() && state) ? Social.totalUnread(state) : 0;
  b.textContent = n > 99 ? "99+" : String(n);
  b.classList.toggle("hidden", !n);
}

var _socialTickN = 0;
function socialTick() {
  if (!hasSocial() || !state || !state.char || !state.char.name) return;
  _socialTickN++;
  if (_socialTickN % 5 !== 0) return; /* mỗi ~5 giây */
  /* Milestone 2: kéo dữ liệu bạn bè/nhắn tin thật từ Supabase (30s/lần) */
  try { if (typeof OnlineSB !== "undefined") OnlineSB.maybePull(state); } catch (e) {}
  Social.mockWorldTick(state);
  var evts = Social.mockTick(state);
  if (!evts.length) { updateChatBadge(); return; }
  saveGame(state);
  var refreshFriends = false;
  evts.forEach(function (ev) {
    if (ev.type === "message") {
      sfx("message");
      if (panel === "chat" && panelArg && panelArg.friendId === ev.id) {
        Social.markRead(state, ev.id); saveGame(state); renderPanel();
      } else {
        toast("💬 " + ev.name + ": " + t("msg_new"));
      }
    } else if (ev.type === "request_in") {
      sfx("message");
      toast("👥 " + ev.name + " — " + t("fr_req_in"));
      refreshFriends = true;
    } else if (ev.type === "friend_accepted") {
      sfx("success");
      toast("👥 " + ev.name + ": " + t("fr_already"));
      refreshFriends = true;
    }
  });
  updateChatBadge();
  if (refreshFriends && panel === "friends" && friendTab() !== "world") renderPanel();
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
      var canEq = true, reqTxt = "", overTxt = "";
      try {
        if (typeof Khilinh !== "undefined") {
          canEq = Khilinh.canEquip(state, d);
          var _rr = Khilinh.realmOfItem(d);
          reqTxt = t("eq_req_realm", { realm: stageName(_rr, 0) });
          /* Đồ hiếm vượt cấp: cảnh báo hiệu quả -50%, tốn linh lực ×2 */
          if (Khilinh.isOverlevel(state, d))
            overTxt = t("eq_overlevel_warn");
        }
      } catch (e) {}
      btns = '<button class="mini' + (canEq ? "" : " paper") + '" data-act="bag-equip" data-i="' + i + '"' +
        (canEq ? "" : ' disabled style="opacity:.4"') + '>' + esc(t("ui_equip")) + "</button>";
      if (reqTxt) extra += ' <span class="' + (canEq ? "manual-lv" : "manual-locked") + '">' + esc(reqTxt) + "</span>";
      if (overTxt) extra += ' <span class="manual-locked">⚠️ ' + esc(overTxt) + "</span>";
      /* Dòng skill trang bị (xanh) + gợi ý thay đồ cũ */
      try {
        if (typeof Khilinh !== "undefined") {
          var _sl = equipSkillDesc(d);
          if (_sl) extra += " " + _sl;
          if (Khilinh.isOutdated(state, d))
            extra += ' <span class="manual-lv">⚠️ ' + esc(t("eq_outdated")) + "</span>";
        }
      } catch (e) {}
    } else if (d && d.kind === "manual") {
      btns = '<button class="mini" data-act="manual-open" data-i="' + i + '">' + esc(t("manual_upgrade")) + "</button>";
    } else if (d && d.kind === "pet_egg") {
      btns = '<button class="mini" data-act="egg-open" data-i="' + i + '">' + esc(t("pet_hatch")) + "</button>";
    } else if (d && d.kind === "seed") {
      btns = '<button class="mini" data-act="farm-open">' + esc(t("npc_farm_open")) + "</button>";
    }
    var extra = "";
    if (d && d.kind === "manual" && typeof Skills !== "undefined") {
      try {
        var techId = Skills.manualTechId(it.id);
        var lv = techId ? Skills.manualLevel(state, techId) : 0;
        var mi = Skills.manualInfo(it.id);
        extra = ' <span class="manual-lv">Lv' + lv + " · " + esc(t("tier_" + (mi ? mi.tier : 0))) + "</span>";
        if (mi && !Skills.manualRealmOk(state, it.id)) {
          extra += ' <span class="manual-locked">🔒 ' +
            esc(t("manual_locked_realm", { realm: stageName(mi.realm, 0) })) + "</span>";
        }
      } catch (e) {}
    }
    return '<div class="row"><div><div class="item-name">' + itemIcon(it.id) + " " + esc(itemName(it.id)) +
      ' <span class="item-qty">x' + it.qty + "</span>" + extra + "</div>" +
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
  if (c.element) h += '<div class="item-desc">' + lingenIconHtml(c.element, 24) + esc(t("lingen_result", { name: t("el_" + c.element) + " · " + t("qual_" + (c.elementQuality || "pham")) })) + "</div>";
  h += '<div class="stat-grid">' +
    cell(t("stat_atk"), s.atk) + cell(t("stat_def"), s.def) +
    cell(t("stat_hp"), s.maxHp) + cell(t("stat_mp"), s.maxMp) + "</div>";
  /* icon buff tông môn + aura map */
  try {
    if (typeof Sect !== "undefined" && Sect.joinedSect(state)) {
      var _sj = Sect.joinedSect(state);
      var _sc = Sect.SECTS[_sj];
      if (_sc) h += '<div class="item-desc">😈☯️ <b>' + esc(t(_sc.nameKey)) + "</b> · " +
        esc(t(_sc.innateKey)) + "</div>";
    }
  } catch (e) {}
  if (state.mapAura && state.mapAura.mapDao) {
    var _ak = state.mapAura.mapDao === "ma" ? "map_aura_ma" : "map_aura_tien";
    h += '<div class="item-desc">⚠️ <b>' + esc(t(_ak)) + "</b> · " +
      esc(t(state.mapAura.mapDao === "ma" ? "map_aura_ma_desc" : "map_aura_tien_desc")) + "</div>";
  }
  h += '<div class="item-desc">' + esc(t("stat_exp")) + ": " + c.exp + "/" + expMax + "</div>" +
    '<div class="exp-bar"><div class="fill" style="width:' + Math.min(100, c.exp / expMax * 100) + '%"></div></div>';
  /* Thọ Nguyên (lifespan.js) */
  try {
    if (typeof Lifespan !== "undefined") {
      var _tnY = Lifespan.yearsLeft(state), _tnLow = Lifespan.isLow(state);
      var _tnMax = Lifespan.barMax(state);
      h += '<div class="item-desc">⏳ ' + esc(t("tn_title")) + ': <b' +
        (_tnLow ? ' style="color:#ff6a6a"' : "") + ">" + _tnY + "</b> " + esc(t("tn_unit")) + "</div>" +
        '<div class="tn-bar"><div class="fill' + (_tnLow ? " low" : "") + '" style="width:' +
        Math.min(100, _tnY / _tnMax * 100) + '%"></div></div>';
      if ((state.tnRebirths || 0) > 0)
        h += '<div class="item-desc">🔄 ' + esc(t("tn_rebirths", { n: state.tnRebirths })) + "</div>";
      if ((state.tnReserve || 0) > 0)
        h += '<div class="item-desc">💠 ' + esc(t("tn_reserve", { n: Math.floor(state.tnReserve) })) + "</div>";
      if ((state.tnTalents || []).length) {
        h += '<div class="item-desc">🌟 ' + state.tnTalents.map(function (tid) {
          var _td = Lifespan.talentDef(tid); return _td ? esc(t(_td.nameKey)) : tid;
        }).join(" · ") + "</div>";
      }
    }
  } catch (e) {}
  /* Đường tu: Chính Đạo / Ma Đạo (chọn 1 lần free, đổi lại tốn 5000 LT) */
  h += '<div class="row"><div><div class="item-name">☯️ ' + esc(t("dao_title")) + ": " +
    esc(t(state.dao === "ma" ? "dao_ma" : (state.dao === "chinh" ? "dao_chinh" : "dao_chua_chon"))) + "</div>" +
    '<div class="item-desc">' + esc(t("dao_choose_desc")) + "</div></div>" +
    '<div class="row-btns"><button class="mini" data-act="dao-open">' + esc(t("dao_choose")) + "</button></div></div>";
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
  if (questTab() === "sect") return renderSectQuests();
  /* Đang khiêu chiến boss bí cảnh: hiện trận đấu (Bui 2026-10-18) */
  if (panelArg && panelArg.trial) return tabBtns(
    [["avail", t("q_tab_avail")], ["active", t("q_tab_active")], ["done", t("q_tab_done")], ["sect", t("q_tab_sect")]],
    questTab(), "qtab") + renderQuestTrial(panelArg.trial);
  var h = tabBtns(
    [["avail", t("q_tab_avail")], ["active", t("q_tab_active")], ["done", t("q_tab_done")], ["sect", t("q_tab_sect")]],
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
    else if (o.st === "active") {
      /* Boss bí cảnh: nút khiêu chiến trước khi trả (Bui 2026-10-18) */
      var _isTrial = q.need && q.need.type === "trial";
      var _passed = o.e && o.e.trialPass;
      if (_isTrial && !_passed) {
        r += '<button class="mini" data-act="quest-trial-start" data-id="' + esc(q.id) + '">' + esc(t("q_trial_start")) + "</button>";
      }
      r += '<button class="mini" data-act="quest-turnin" data-id="' + esc(q.id) + '">' + esc(t("quest_turnin")) + "</button>";
    }
    else r += '<span class="item-desc">✓ ' + esc(t("quest_done")) + "</span>";
    return r + "</div></div>";
  }).join("");
  return h;
}
/* ================= NHIỆM VỤ TÔNG MÔN (tab sect trong panel nhiệm vụ) ================= */
function sectTabs() {
  return tabBtns(
    [["avail", t("q_tab_avail")], ["active", t("q_tab_active")], ["done", t("q_tab_done")], ["sect", t("q_tab_sect")]],
    "sect", "qtab");
}
function sectQuestJoined() {
  try { if (typeof Sect !== "undefined") return Sect.joinedSect(state); } catch (e) {}
  return null;
}
function sectQuestRow(q, st, e) {
  var r = '<div class="row"><div><div class="item-name">' + esc(t(q.nameKey)) + "</div>" +
    '<div class="item-desc">' + esc(t(q.descKey)) + "</div>";
  if (st === "active") {
    var pg = SectQuest.progress(state, q);
    r += '<div class="item-desc">' + pg.cur + "/" + pg.need + "</div>";
  }
  if (q.reward) r += '<div class="item-desc">' + esc(t("q_reward")) + ": " + esc(rewardText(q.reward)) + "</div>";
  r += '</div><div class="row-btns">';
  if (st === "avail") {
    var lockMsg = "";
    if (q.minRealm) {
      var c = state.char || {};
      var okR = c.realm > q.minRealm[0] || (c.realm === q.minRealm[0] && c.tier >= q.minRealm[1]);
      if (!okR) lockMsg = " 🔒 " + esc(t("sq_need_noimon"));
    }
    r += '<button class="mini" data-act="sect-quest-accept" data-id="' + esc(q.id) + '">' + esc(t("quest_accept")) + "</button>" + lockMsg;
  } else if (st === "active") {
    var isTrial = q.need && q.need.type === "trial";
    var passed = e && e.trialPass;
    if (isTrial && !passed) {
      r += '<button class="mini" data-act="sect-trial-start" data-id="' + esc(q.id) + '">⚔ ' + esc(t("sq_trial_start")) + "</button>";
    }
    r += '<button class="mini" data-act="sect-quest-turnin" data-id="' + esc(q.id) + '">' + esc(t("quest_turnin")) + "</button>";
    r += '<button class="mini" data-act="sect-quest-nav" data-id="' + esc(q.id) + '">📍 ' + esc(t("sq_nav")) + "</button>";
  } else if (st === "done") {
    r += '<span class="item-desc">✓ ' + esc(t("quest_done")) + "</span>";
  } else {
    r += '<span class="item-desc">🔒</span>';
  }
  return r + "</div></div>";
}
function renderSectQuests() {
  var h = sectTabs();
  if (typeof SectQuest === "undefined") return h + "<p>" + esc(t("q_no")) + "</p>";
  var joined = sectQuestJoined();
  if (!joined) {
    return h + '<p class="sect-note">' + esc(t("sq_not_member")) + "</p>" +
      '<button class="btn btn-jade" data-act="sect-open">' + esc(t("sq_go_sect")) + "</button>";
  }
  if (panelArg && panelArg.trial) return h + renderSectTrial(panelArg.trial);
  var sc = (typeof SECTS !== "undefined" && SECTS[joined]) || {};
  var rank = SectQuest.rank(state);
  h += '<div class="item-name">' + esc(t(sc.nameKey || joined)) + " · " + esc(t("sq_rank")) + ": <b>" +
    esc(t("sq_rank_" + rank)) + "</b></div>";
  if (rank === "ngoai_mon") {
    h += '<div class="sect-note">📜 ' + esc(t("sq_need_noimon")) + "</div>";
  }
  var titles = SectQuest.titles(state);
  if (titles.length) {
    h += '<div class="item-desc">🏅 ' + esc(t("sq_titles")) + ": " +
      titles.map(function (x) { return esc(t(x.nameKey)); }).join(" · ") + "</div>";
  }
  var sqs = state.sectQuests || {};
  var availIds = {};
  SectQuest.available(state).forEach(function (q) { availIds[q.id] = 1; });
  h += SectQuest.chains(joined).map(function (q) {
    var e = sqs[q.id];
    var st = e && e.status === "done" ? "done" : (e && e.status === "active" ? "active" : (availIds[q.id] ? "avail" : "locked"));
    return sectQuestRow(q, st, e);
  }).join("");
  /* Nhiệm vụ củng cố căn cơ (sau đột phá thất bại) */
  var cc = SectQuest.cungCoAvailable(state);
  if (cc) {
    var cce = sqs[cc.id];
    h += '<div class="item-name" style="margin-top:8px">💊 ' + esc(t("sq_cungco_note")) + "</div>";
    if (!cce || !cce.status) {
      h += '<div class="row"><div><div class="item-name">' + esc(t(cc.nameKey)) + "</div>" +
        '<div class="item-desc">' + esc(t(cc.descKey)) + "</div></div>" +
        '<div class="row-btns"><button class="mini" data-act="sect-cungco-accept">' + esc(t("quest_accept")) + "</button></div></div>";
    } else if (cce.status === "active") {
      h += '<div class="row"><div><div class="item-name">' + esc(t(cc.nameKey)) + "</div></div>" +
        '<div class="row-btns"><button class="mini" data-act="sect-cungco-turnin">' + esc(t("quest_turnin")) + "</button></div></div>";
    }
  }
  /* Nhiệm vụ ngày */
  h += '<div class="item-name" style="margin-top:8px">📅 ' + esc(t("sq_daily_title")) + "</div>";
  h += SectQuest.dailyList(state).map(function (dq) {
    var nm = t(dq.tname, { sect: t((SECTS[joined] || {}).nameKey || joined) });
    var rwTxt = "+" + dq.contrib + " " + esc(t("sect_contrib"));
    if (dq.stones) rwTxt += " · +" + dq.stones + " 💎";
    if (dq.exp) rwTxt += " · +" + dq.exp + " EXP";
    return '<div class="row"><div><div class="item-name">' + esc(nm) + "</div>" +
      '<div class="item-desc">' + dq.prog + "/" + dq.need + " · " + rwTxt + "</div></div>" +
      '<div class="row-btns">' + (dq.claimed ? esc(t("sq_claimed")) :
        (dq.done ? '<button class="mini" data-act="sect-daily-claim" data-id="' + esc(dq.id) + '">' + esc(t("sq_claim")) + "</button>"
                 : esc(t("q_incomplete")))) + "</div></div>";
  }).join("");
  /* Thưởng đủ 5/5 nhiệm vụ ngày */
  try {
    var _db = SectQuest.dailyBonus(state);
    if (_db.total > 0) {
      h += '<div class="row"><div><div class="item-name">🎁 ' + esc(t("sq_daily_bonus", { n: _db.claimed, m: _db.total })) + "</div>" +
        '<div class="item-desc">+' + _db.bonus.contrib + " " + esc(t("sect_contrib")) +
        " · +" + _db.bonus.stones + " 💎 · +" + _db.bonus.exp + " EXP</div></div>" +
        '<div class="row-btns">' + (_db.bonusClaimed ? esc(t("sq_claimed")) :
          (_db.ready ? '<button class="mini" data-act="sect-daily-bonus">' + esc(t("sq_claim")) + "</button>"
                     : esc(t("q_incomplete")))) + "</div></div>";
    }
  } catch (e) {}
  /* Nhiệm vụ tuần */
  h += '<div class="item-name" style="margin-top:8px">🗓️ ' + esc(t("sq_weekly_title")) + "</div>";
  h += SectQuest.weeklyList(state).map(function (wq) {
    var nm2 = t(wq.tname, { sect: t((SECTS[joined] || {}).nameKey || joined) });
    return '<div class="row"><div><div class="item-name">' + esc(nm2) + "</div>" +
      '<div class="item-desc">👹 ' + wq.progKill + "/" + wq.needKill + " · 💀 " + wq.progBoss + "/" + wq.needBoss + "</div></div>" +
      '<div class="row-btns">' + (wq.claimed ? esc(t("sq_claimed")) :
        (wq.done ? '<button class="mini" data-act="sect-weekly-claim" data-id="' + esc(wq.id) + '">' + esc(t("sq_claim")) + "</button>"
                 : esc(t("q_incomplete")))) + "</div></div>";
  }).join("");
  return h;
}
/* ---- Thử thách tông môn: quick-battle như tâm ma ---- */
var sectTrial = null, sectTrialTimer = null;
function renderSectTrial(qid) {
  var b = sectTrial;
  if (!b || b.qid !== qid) return "<p>" + esc(t("q_no")) + "</p>";
  var h = '<div class="npc-lines" style="text-align:center;font-size:17px">⚔ ' +
    esc(t(b.q.eventKey)) + " ⚔</div>" +
    '<div class="item-desc" style="text-align:center">' + esc(t(b.q.need.boss.nameKey)) + "</div>" +
    '<div class="hp-duel">' + duelBar(t(b.q.need.boss.nameKey), "se", b.ehp, b.emax) +
    duelBar(state.char.name, "sp", b.php, b.pmax) + "</div>";
  return h;
  function duelBar(nm, k, cur, max) {
    return '<div class="duel-row"><div class="duel-name">' + esc(nm) + "</div>" +
      '<div class="hud-bar"><div class="fill hp" style="width:' +
      Math.max(0, cur / max * 100) + '%"></div></div></div>';
  }
}
function startSectTrial(qid) {
  if (typeof SectQuest === "undefined") return;
  var chk = SectQuest.trialEligible(state, qid);
  if (!chk.ok) { toast(t("sq_trial_need")); sfx("fail"); return; }
  var q = chk.quest, s = getStats(), b = q.need.boss;
  sectTrial = {
    qid: qid, q: q,
    pmax: s.maxHp, php: s.maxHp, patk: s.atk, pdef: s.def,
    emax: b.hp, ehp: b.hp, eatk: b.atk, edef: b.def,
  };
  sectFlash(q.fx || "#9fd8ff", t(q.eventKey));
  openPanel("quest", { tab: "sect", trial: qid });
  if (sectTrialTimer) clearInterval(sectTrialTimer);
  sectTrialTimer = setInterval(sectTrialTick, 800);
}
function sectTrialTick() {
  var b = sectTrial;
  if (!b) { if (sectTrialTimer) { clearInterval(sectTrialTimer); sectTrialTimer = null; } return; }
  b.ehp -= calcDmg(b.patk, b.edef, 1);
  if (b.ehp <= 0) {
    clearInterval(sectTrialTimer); sectTrialTimer = null; sectTrial = null;
    SectQuest.passTrial(state, b.qid);
    saveGame(state);
    toast(t("sq_trial_win")); sfx("success");
    openPanel("quest", { tab: "sect" });
    return;
  }
  b.php -= calcDmg(b.eatk, b.pdef, 1);
  sfx("hit");
  if (b.php <= 0) {
    clearInterval(sectTrialTimer); sectTrialTimer = null; sectTrial = null;
    toast(t("sq_trial_lose")); sfx("fail");
    renderPanel();
    return;
  }
  renderPanel();
}
/* ---- Khiêu chiến boss bí cảnh (nhiệm vụ chính, Bui 2026-10-18) ----
 * Tái dùng cơ chế quick-battle như trial tông môn, nhưng cho QUESTS chính. */
var questTrial = null, questTrialTimer = null;
function renderQuestTrial(qid) {
  var b = questTrial;
  if (!b || b.qid !== qid) return "<p>" + esc(t("q_no")) + "</p>";
  var h = '<div class="npc-lines" style="text-align:center;font-size:17px">⚔ ' +
    esc(t(b.q.eventKey || b.q.nameKey)) + " ⚔</div>" +
    '<div class="item-desc" style="text-align:center">' + esc(t(b.q.need.boss.nameKey)) + "</div>" +
    '<div class="hp-duel">' + _qtDuelBar(t(b.q.need.boss.nameKey), b.ehp, b.emax) +
    _qtDuelBar(state.char.name, b.php, b.pmax) + "</div>";
  return h;
  function _qtDuelBar(nm, cur, max) {
    return '<div class="duel-row"><div class="duel-name">' + esc(nm) + "</div>" +
      '<div class="hud-bar"><div class="fill hp" style="width:' +
      Math.max(0, cur / max * 100) + '%"></div></div></div>';
  }
}
function startQuestTrial(qid) {
  if (typeof Quest === "undefined") return;
  var chk = Quest.trialEligible(state, qid);
  if (!chk.ok) { toast(t("q_incomplete")); sfx("fail"); return; }
  var q = chk.quest, s = getStats(), b = q.need.boss;
  questTrial = {
    qid: qid, q: q,
    pmax: s.maxHp, php: s.maxHp, patk: s.atk, pdef: s.def,
    emax: b.hp, ehp: b.hp, eatk: b.atk, edef: b.def,
  };
  try { sectFlash(q.fx || "#ffd76a", t(q.eventKey || q.nameKey)); } catch (e) {}
  openPanel("quest", { trial: qid });
  if (questTrialTimer) clearInterval(questTrialTimer);
  questTrialTimer = setInterval(questTrialTick, 800);
}
function questTrialTick() {
  var b = questTrial;
  if (!b) { if (questTrialTimer) { clearInterval(questTrialTimer); questTrialTimer = null; } return; }
  b.ehp -= calcDmg(b.patk, b.edef, 1);
  if (b.ehp <= 0) {
    clearInterval(questTrialTimer); questTrialTimer = null; questTrial = null;
    Quest.passTrial(state, b.qid);
    saveGame(state);
    toast(t("sq_trial_win")); sfx("success");
    openPanel("quest", { tab: "active" });
    return;
  }
  b.php -= calcDmg(b.eatk, b.pdef, 1);
  sfx("hit");
  if (b.php <= 0) {
    clearInterval(questTrialTimer); questTrialTimer = null; questTrial = null;
    toast(t("sq_trial_lose")); sfx("fail");
    renderPanel();
    return;
  }
  renderPanel();
}
/* Hiệu ứng hoành tráng khi bắt đầu sự kiện tông môn */
function sectFlash(color, text) {
  try {
    var f = document.createElement("div");
    f.className = "flash";
    f.style.background = "radial-gradient(circle, " + color + "55 0%, transparent 70%)";
    $("app").appendChild(f);
    var label = document.createElement("div");
    label.className = "sect-flash-label";
    label.style.color = color;
    label.textContent = text;
    $("app").appendChild(label);
    setTimeout(function () { f.classList.add("go"); label.classList.add("go"); }, 30);
    setTimeout(function () {
      if (f.parentNode) f.parentNode.removeChild(f);
      if (label.parentNode) label.parentNode.removeChild(label);
    }, 1600);
  } catch (e) {}
}
/* Lễ thăng cấp: overlay toàn màn hình */
function showSectCeremony(c) {
  if (!c) return;
  try {
    sectFlash(c.fx || "#ffd76a", t("sq_ceremony"));
    var f = document.createElement("div");
    f.className = "sect-ceremony";
    f.innerHTML = '<div class="sect-ceremony-inner" style="border-color:' + (c.fx || "#ffd76a") + '">' +
      '<div class="sect-ceremony-title">' + esc(t("sq_ceremony")) + "</div>" +
      (c.eventKey ? '<div class="sect-ceremony-event" style="color:' + (c.fx || "#ffd76a") + '">' +
        esc(t(c.eventKey)) + "</div>" : "") +
      '<div class="sect-ceremony-rank">' +
      esc(t("sq_ceremony_promote", { rank: t(c.titleKey) })) + "</div>" +
      '<div class="sect-ceremony-sub">🎉</div></div>';
    document.body.appendChild(f);
    sfx("success");
    setTimeout(function () { if (f.parentNode) f.parentNode.removeChild(f); }, 3500);
  } catch (e) {}
}
/* ================= TẨY CỐT + KHAI MẠCH (taycot.js) ================= */
/* Hiệu ứng toàn màn hình khi tẩy cốt định phẩm / nâng phẩm */
function showTayCotFx(phamId, upgraded, fromId) {
  if (typeof TayCot === "undefined") return;
  try {
    var fx = "#ffd76a", i;
    for (i = 0; i < TayCot.DEF.cotPham.length; i++)
      if (TayCot.DEF.cotPham[i].id === phamId) fx = TayCot.DEF.cotPham[i].fx;
    sectFlash(fx, t(upgraded ? "tc_fx_upgrade" : "tc_fx_title"));
    var f = document.createElement("div");
    f.className = "sect-ceremony taycot-fx";
    f.innerHTML = '<div class="sect-ceremony-inner taycot-fx-inner" style="border-color:' + fx + '">' +
      '<div class="sect-ceremony-title">' + esc(t(upgraded ? "tc_fx_upgrade" : "tc_fx_title")) + "</div>" +
      '<div class="taycot-fx-pham" style="color:' + fx + '">' + esc(t("cot_pham_" + phamId)) + "</div>" +
      (upgraded && fromId ? '<div class="taycot-fx-from">(' + esc(t("cot_pham_" + fromId)) + " → " +
        esc(t("cot_pham_" + phamId)) + ")</div>" : "") +
      '<div class="taycot-fx-bonus">' + esc(t("tc_fx_bonus", {
        exp: Math.round((TayCot.cotBonus(state).expMult - 1) * 100),
        bt: (TayCot.cotBonus(state).btBonus * 100).toFixed(1),
      })) + "</div>" +
      '<div class="sect-ceremony-sub">✨</div></div>';
    document.body.appendChild(f);
    sfx("success");
    setTimeout(function () { if (f.parentNode) f.parentNode.removeChild(f); }, 3800);
  } catch (e) {}
}
/* Modal chọn linh căn khi uống Khai Mạch Đan trung phẩm */
function showKhaiMachChoose(unopened, count) {
  if (typeof TayCot === "undefined") return;
  try {
    var f = document.createElement("div");
    f.className = "sect-ceremony";
    var btns = "";
    for (var i = 0; i < unopened.length; i++) {
      var el = unopened[i];
      btns += '<button class="km-choose-btn" data-el="' + el + '">' +
        lingenIconHtml(el, 40) + "<span>" + esc(t("el_" + el)) + "</span></button>";
    }
    f.innerHTML = '<div class="sect-ceremony-inner km-choose" style="border-color:#ff9d5c">' +
      '<div class="sect-ceremony-title">' + esc(t("km_choose_title")) + "</div>" +
      '<div class="km-choose-grid">' + btns + "</div></div>";
    document.body.appendChild(f);
    sfx("click");
    var done = function (ev) {
      var b = ev.target.closest ? ev.target.closest(".km-choose-btn") : null;
      if (!b) return;
      var el = b.getAttribute("data-el");
      var r = TayCot.openRoots(state, count, el);
      toast(t("km_opened", { n: r.opened.map(function (e) { return t("el_" + e); }).join(" · ") }));
      sfx("success");
      saveGame(state); refreshHUD(); renderPanel();
      if (f.parentNode) f.parentNode.removeChild(f);
    };
    f.addEventListener("click", done);
  } catch (e) {}
}
/* Tự tìm đường tới mục tiêu nhiệm vụ */
function sectQuestNav(tg) {
  if (!tg) return;
  closePanel();
  var mapId = 0, x = 400, y = 300;
  if (tg.kind === "npc" && typeof NPCS !== "undefined" && NPCS[tg.id]) {
    var npc = NPCS[tg.id];
    mapId = (typeof npc.mapId === "number" && npc.mapId >= 0 && npc.mapId <= 5) ? npc.mapId : 0;
    x = npc.x || 400; y = npc.y || 300;
  } else if (tg.kind === "map" && typeof tg.map === "number") {
    mapId = tg.map;
  }
  if (hasEngine() && Engine.enterMap) {
    if (mapId !== curMapId) Engine.enterMap(mapId);
    if (Engine.navigateTo) Engine.navigateTo(x, y);
    toast(t("sq_nav"));
  }
}

function questProgress(q, e) {
  var need = q.need || {};
  if (need.type === "kill") return t("q_progress", { a: e.count || 0, b: need.count });
  if (need.type === "talk_npcs") {
    var _tk = (e.talked) || {}, _tot = (need.npcs || []).length;
    var _dn = (need.npcs || []).filter(function (id) { return !!_tk[id]; }).length;
    return t("q_progress_talk", { a: _dn, b: _tot });
  }
  if (need.type === "item") return t("q_progress", { a: countItem(state, need.item), b: need.count });
  /* Tiến trình nhiệm vụ bí cảnh (Bui 2026-10-18) */
  if (need.type === "secret_enter" || need.type === "secret_nodes" || need.type === "secret_party")
    return t("q_progress", { a: e.count || 0, b: need.count || 1 });
  if (need.type === "tower_floor") {
    var _b = 0;
    try { _b = (state.tower && state.tower.best) || 0; } catch (ex) {}
    return t("q_progress", { a: Math.min(_b, need.floor), b: need.floor });
  }
  if (need.type === "trial") return (e.trialPass ? "✓ " : "") + t("q_trial_boss", { n: t(need.boss.nameKey) });
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
function mapDaoMismatch(m) {
  var pdao = state && state.dao;
  return !!(m && m.dao && pdao && m.dao !== pdao);
}
function renderMap() {
  if (typeof MAPS === "undefined") return "";
  return MAPS.map(function (m, i) {
    var locked = m.unlock && !(
      state.char.realm > m.unlock.realm ||
      (state.char.realm === m.unlock.realm && state.char.tier >= m.unlock.tier));
    var mons = (m.monsters || []).map(monName).join(", ");
    var daoTag = m.dao ? ' <span class="dg-tag">' +
      (m.dao === "ma" ? "😈 " : "☯️ ") + esc(t(m.dao === "ma" ? "dao_ma" : "dao_chinh")) + "</span>" : "";
    var warnTag = (!locked && mapDaoMismatch(m)) ? ' <span class="dg-tag">⚠️</span>' : "";
    return '<div class="row"><div><div class="item-name">' + esc(t(m.nameKey)) + daoTag + warnTag +
      (m.id === curMapId ? ' <span class="dg-tag">' + esc(t("map_here")) + "</span>" : "") + "</div>" +
      '<div class="item-desc">' + esc(mons) + (m.boss ? " · BOSS: " + esc(monName(m.boss)) : "") + "</div></div>" +
      '<div class="row-btns"><button class="mini" data-act="map-go" data-i="' + i + '"' +
      (locked ? " disabled" : "") + ">" + esc(t("map_go")) + "</button></div></div>";
  }).join("");
}

/* ----- Phụ bản ----- */
function dungeonTab() { return (panelArg && panelArg.dtab) || "pb"; }
function renderDungeon() {
  if (typeof DUNGEONS === "undefined") return "";
  var h = tabBtns([
    ["pb", t("panel_dungeon")], ["bc", t("panel_secret")], ["sb", t("sb_tab")],
    ["gz", t("dungeon_tab_grind")],
  ], dungeonTab(), "dg-tab");
  if (dungeonTab() === "bc") return h + renderSecretList();
  if (dungeonTab() === "sb") return h + renderSecretBook();
  if (dungeonTab() === "gz") return h + renderGrindZones();
  return h + DUNGEONS.map(function (d, i) {
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

/* ================= BÍ CẢNH TRANH ĐOẠT (secret.js) ================= */
function hasSecret() { return typeof Secret !== "undefined"; }
/* ms → "45 phút" / "12:05" */
function fmtDur(ms) {
  ms = Math.max(0, ms);
  var s = Math.ceil(ms / 1000), m = Math.floor(s / 60);
  if (m >= 60) return Math.floor(m / 60) + "h" + (m % 60 < 10 ? "0" : "") + (m % 60) + "p";
  if (m > 0) return m + " " + (state && state.lang === "en" ? "min" : "phút");
  return s + "s";
}
function secretTick() {
  if (screen !== "game" || !state || !hasSecret()) return;
  var now = Date.now();
  /* Hết giờ mà còn trong bí cảnh → đá ra về Thanh Vân Trấn */
  if (curSecretRealm) {
    var st0 = Secret.status(curSecretRealm, now);
    if (st0.phase !== "open") {
      curSecretRealm = null;
      if (hasEngine()) {
        if (Engine.leaveSecretRealm) Engine.leaveSecretRealm();
        Engine.enterMap(0);
      }
      state.map.id = 0; curMapId = 0;
      toast(t("sr_ended")); sfx("fail");
      saveGame(state); refreshHUD();
    }
  }
  /* Banner: ưu tiên bí cảnh ĐANG MỞ, sau đó là sắp mở */
  var show = null;
  Secret.realmIds().forEach(function (id) {
    if (id === curSecretRealm) return;
    var st = Secret.status(id, now);
    if (st.phase === "open") show = { realmId: id, phase: "open", st: st };
    else if (st.phase === "soon" && !show) {
      if (!secretNotified[st.slotKey]) {
        secretNotified[st.slotKey] = true;
        var rd0 = Secret.realm(id);
        toast(t("sr_soon_banner", { name: t(rd0.nameKey), min: Math.ceil(st.msUntilOpen / 60000) }));
        sfx("success");
      }
      show = { realmId: id, phase: "soon", st: st };
    }
  });
  var banner = $("secret-banner");
  if (banner) {
    if (show) {
      var rd = Secret.realm(show.realmId);
      banner.classList.remove("hidden");
      if (show.phase === "open") {
        banner.className = "";
        banner.innerHTML = esc(rd.icon + " " + t(rd.nameKey) + " — " + t("sr_open") +
          " (" + t("sr_time_left", { t: fmtDur(show.st.msLeft) }) + ")") +
          ' <button id="sr-banner-go">' + esc(t("sr_enter_now")) + "</button>";
        var bg = $("sr-banner-go");
        if (bg) bg.onclick = function () { doSecretEnter(show.realmId); sfx("click"); };
      } else {
        banner.className = "soon";
        banner.textContent = rd.icon + " " + t(rd.nameKey) + " " + t("sr_soon") +
          " (" + t("sr_opens_in", { t: fmtDur(show.st.msUntilOpen) }) + ")";
      }
    } else {
      banner.className = "hidden";
      banner.innerHTML = "";
    }
  }
  updateSecretActions(now);
  try { secretBookTick(); } catch (e) {}
}
/* Nút Thu thập + Quà an ủi khi đang trong bí cảnh */
function updateSecretActions(now) {
  var old = $("secret-actions");
  if (!curSecretRealm || !hasSecret()) { if (old) old.parentNode.removeChild(old); return; }
  var st = Secret.status(curSecretRealm, now);
  if (st.phase !== "open") { if (old) old.parentNode.removeChild(old); return; }
  var nl = Secret.nodesLeft(state, curSecretRealm, now);
  var el = old;
  if (!el) {
    el = document.createElement("div");
    el.id = "secret-actions";
    el.style.cssText = "position:absolute;left:50%;transform:translateX(-50%);bottom:118px;z-index:6;display:flex;gap:8px;pointer-events:auto";
    $("hud").appendChild(el);
  }
  var cdLeft = Math.ceil((secretGatherCdUntil - now) / 1000);
  var rec = Secret.ensure(state).secret.claims[st.slotKey] || {};
  var html = '<button id="secret-gather" style="background:#2a6a3acc;color:#fff;border:2px solid #7fe08a;border-radius:12px;padding:10px 16px;font-size:14px;font-weight:bold;box-shadow:0 0 12px #7fe08a66"' +
    (cdLeft > 0 || nl.available <= 0 ? " disabled" : "") + ">" +
    esc(cdLeft > 0 ? t("sr_gather_cd", { n: cdLeft }) : t("sr_gather") + " (" + nl.available + ")") + "</button>";
  if (rec.entered && !rec.consolation) {
    html += '<button id="secret-consol" style="background:#6a5a2acc;color:#ffe9a8;border:2px solid #ffd76a;border-radius:12px;padding:10px 14px;font-size:13px;font-weight:bold">🎁 ' +
      esc(t("sr_consolation")) + "</button>";
  }
  el.innerHTML = html;
  var gb = $("secret-gather");
  if (gb && !gb.disabled) gb.onclick = function () { doSecretGather(); };
  var cb = $("secret-consol");
  if (cb) cb.onclick = function () { doSecretConsolation(); };
  /* cập nhật đếm ngược cooldown mỗi giây */
  if (cdLeft > 0 && !el._cdt) {
    el._cdt = true;
    setTimeout(function () { el._cdt = false; if (curSecretRealm) updateSecretActions(Date.now()); }, 1000);
  }
}
function doSecretEnter(realmId) {
  if (!hasSecret()) return;
  var r = Secret.enter(state, realmId, Date.now());
  if (!r.ok) {
    var msg = r.reason === "locked" ? t("sr_locked", { realm: stageName(r.need || 2, 0) }) :
      r.reason === "wrong_sect" ? t("sr_wrong_sect") :
      r.reason === "not_open_yet" ? t("sr_not_open") : t("sr_ended");
    toast(msg); sfx("fail"); return;
  }
  var def = Secret.realm(realmId);
  /* Nhiệm vụ bí cảnh: cập nhật tiến trình khám phá/tổ đội (Bui 2026-10-18) */
  try {
    if (typeof Quest !== "undefined" && Quest.onSecretEnter) {
      var _friends = (state.social && state.social.friends) ? state.social.friends.length : 0;
      Quest.onSecretEnter(state, realmId, 1 + _friends);
    }
  } catch (e) {}
  curSecretRealm = realmId;
  var _sbPriority = false;
  try { if (typeof SecretBook !== "undefined") _sbPriority = SecretBook.checkin(state, realmId, Date.now()).priority; } catch (e) {}
  if (panel) closePanel();
  if (hasEngine() && Engine.enterSecretRealm) {
    Engine.enterSecretRealm({ id: realmId, nameKey: def.nameKey, bg: def.bg, fb: def.fb,
      monsters: def.monsters, boss: def.boss });
  }
  curMapId = "secret:" + realmId;
  toast(def.icon + " " + t(def.nameKey)); sfx("success");
  if (_sbPriority) { try { toast(t("sb_priority", { n: SecretBook.DEF.priorityExpPct })); } catch (e2) {} }
  saveGame(state); refreshHUD();
}
function doSecretGather() {
  if (!curSecretRealm || !hasSecret()) return;
  var now = Date.now();
  if (now < secretGatherCdUntil) return;
  var r = Secret.claimNode(state, curSecretRealm, now);
  if (!r.ok) {
    toast(t(r.reason === "depleted" ? "sr_gather_empty" : "sr_ended")); sfx("fail");
    return;
  }
  secretGatherCdUntil = now + 6000;
  toast(t("sr_gather_ok", { n: r.qty, name: itemName(r.itemId) })); sfx("pickup");
  /* Nhiệm vụ bí cảnh: cập nhật tiến trình thu thập (Bui 2026-10-18) */
  try { if (typeof Quest !== "undefined" && Quest.onSecretNode) Quest.onSecretNode(state, curSecretRealm); } catch (e) {}
  saveGame(state); refreshHUD(); updateSecretActions(Date.now());
}
function doSecretConsolation() {
  if (!curSecretRealm || !hasSecret()) return;
  var r = Secret.giveConsolation(state, curSecretRealm, Date.now());
  if (!r.ok) { sfx("fail"); return; }
  toast(t("sr_consolation_ok", { n: r.stones })); sfx("success");
  saveGame(state); refreshHUD(); updateSecretActions(Date.now());
}
/* Danh sách bí cảnh + lịch tuần (tab trong panel Phụ bản) */
function renderSecretList() {
  if (!hasSecret()) return "";
  var now = Date.now();
  var h = "";
  Secret.realmIds().forEach(function (id) {
    var def = Secret.realm(id);
    var st = Secret.status(id, now);
    var ce = Secret.canEnter(state, id);
    var sched = def.schedule.map(function (sl) {
      return esc(t("sr_day_" + sl.day) + " " + sl.start);
    }).join(" · ");
    var statHtml;
    if (st.phase === "open") {
      var nl = Secret.nodesLeft(state, id, now);
      statHtml = '<span class="sr-open-tag">🔥 ' + esc(t("sr_open")) + " — " +
        esc(t("sr_time_left", { t: fmtDur(st.msLeft) })) + "</span><br>" +
        '<span class="sr-time">' + esc(t("sr_nodes_left", { n: nl.available })) +
        (nl.taken > 0 ? " · " + esc(t("sr_nodes_taken", { n: nl.taken })) : "") + "</span>";
    } else if (st.phase === "soon") {
      statHtml = '<span class="sr-time">⏳ ' + esc(t("sr_soon")) + " — " +
        esc(t("sr_opens_in", { t: fmtDur(st.msUntilOpen) })) + "</span>";
    } else {
      statHtml = '<span class="sr-time">🔒 ' + esc(t("sr_closed")) + "</span>";
    }
    var btn;
    if (!ce.ok) {
      btn = '<button class="mini" disabled>' + esc(t("sr_locked", { realm: stageName(ce.need || 2, 0) })) + "</button>";
    } else if (st.phase === "open") {
      btn = '<button class="mini" data-act="secret-enter" data-id="' + id + '">' +
        esc(curSecretRealm === id ? t("sr_open") : t("sr_enter")) + "</button>";
    } else {
      btn = '<button class="mini" disabled>' + esc(t("sr_enter")) + "</button>";
    }
    h += '<div class="sr-row' + (st.phase === "open" ? " open" : "") + '">' +
      '<div class="sr-head"><div class="item-name">' + esc(def.icon + " " + t(def.nameKey)) + "</div>" +
      '<div class="row-btns">' + btn + "</div></div>" +
      '<div class="item-desc">' + esc(t(def.descKey)) + "</div>" +
      '<div class="sr-time">📅 ' + sched + "</div>" +
      '<div style="margin-top:4px">' + statHtml + "</div></div>";
  });
  /* Lịch tuần chi tiết */
  h += '<div class="item-name" style="margin-top:10px">📅 ' + esc(t("sr_schedule")) + "</div>";
  Secret.weekSchedule(now).forEach(function (ev) {
    var d = new Date(ev.slotStartMs);
    var dd = (d.getDate() < 10 ? "0" : "") + d.getDate() + "/" + ((d.getMonth() + 1 < 10 ? "0" : "") + (d.getMonth() + 1));
    var df = Secret.realm(ev.realmId);
    h += '<div class="row"><div><div class="item-name">' + esc(df.icon + " " + t(df.nameKey)) + "</div>" +
      '<div class="item-desc">' + esc(t("sr_day_" + ev.day) + " " + dd + " · " + ev.start) + "</div></div>" +
      '<div class="row-btns"><span class="sr-time">' +
      esc(ev.phase === "open" ? t("sr_open") : t("sr_closed")) + "</span></div></div>";
  });
  return h;
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
  (r.reward.items || []).forEach(function (it) {
    /* manual_random_t1 → bí tịch Địa phẩm đúng hệ phái */
    if (it.id === "manual_random_t1" && typeof Skills !== "undefined") {
      var cls = (state.char && state.char.sect) || "kiem";
      var mid = Skills.randomManualForClass(cls, 1);
      if (mid) { Skills.obtainManual(state, mid); return; }
    }
    addItem(state, it.id, it.qty || 1, it.locked);
  });
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
  h += '<div class="row"><div class="item-name">' + esc(t("settings_tapmove")) + '</div><div class="row-btns">' +
    '<button class="mini' + (st.tapMove === false ? " paper" : "") + '" data-act="set-tapmove">' + esc(st.tapMove === false ? t("settings_off") : t("settings_on")) + "</button></div></div>";
  h += '<div class="row"><div class="item-name">' + esc(t("settings_vibrate")) + '</div><div class="row-btns">' +
    '<button class="mini' + (st.vibrate === false ? " paper" : "") + '" data-act="set-vibrate">' + esc(st.vibrate === false ? t("settings_off") : t("settings_on")) + "</button></div></div>";
  h += '<div class="row"><div class="item-name">' + esc(t("settings_voice")) + '</div><div class="row-btns">' +
    '<button class="mini' + (st.voice === false ? " paper" : "") + '" data-act="set-voice">' + esc(st.voice === false ? t("settings_off") : t("settings_on")) + "</button></div></div>";
  h += renderDisplayRows();
  h += '<div class="row"><div class="item-name">' + esc(t("settings_lang")) + '</div><div class="row-btns">' +
    '<button class="mini' + (LANG_CUR === "vi" ? " on" : " paper") + '" data-act="set-lang" data-v="vi">VI</button>' +
    '<button class="mini' + (LANG_CUR === "en" ? " on" : " paper") + '" data-act="set-lang" data-v="en">EN</button></div></div>';
  h += '<div class="row"><div class="item-name">' + esc(t("settings_donate")) + '</div><div class="row-btns">' +
    '<button class="mini" data-act="open-donate">' + esc(t("donate_title")) + "</button></div></div>";
  h += '<div class="row"><div class="item-name">' + esc(t("settings_cleardata")) +
    '<div class="item-sub">' + esc(t("settings_cleardata_note")) + '</div></div><div class="row-btns">' +
    '<button class="mini red" data-act="clear-data">' + esc(t("settings_cleardata")) + "</button></div></div>";
  if (typeof GamepadInput !== "undefined") h += renderGamepadSettings();
  return h;
}

/* ----- Tay cầm chơi game (Gamepad API) ----- */
function renderGamepadSettings() {
  var gp = GamepadInput;
  var en = gp.isEnabled();
  var st = gp.status();
  var h = '<div class="row"><div class="item-name"><b>' + esc(t("gamepad_title")) + "</b></div></div>";
  h += '<div class="row"><div class="item-name">' + esc(t("gamepad_enable")) + '</div><div class="row-btns">' +
    '<button class="mini' + (en ? "" : " paper") + '" data-act="gp-toggle">' + esc(en ? t("settings_on") : t("settings_off")) + "</button></div></div>";
  if (!en) return h;
  var stTxt = st.connected ? esc(st.name) : esc(t("gamepad_not_connected"));
  h += '<div class="row"><div class="item-name">' + esc(t("gamepad_status")) + '</div><div class="row-btns"><span class="item-sub">' +
    stTxt + "</span></div></div>";
  if (!st.connected) {
    h += '<div class="row"><div class="item-sub">' + esc(t("gamepad_connect_hint")) + "</div></div>";
    return h;
  }
  h += '<div class="row"><div class="item-name">' + esc(t("gamepad_test_rumble")) + '</div><div class="row-btns">' +
    '<button class="mini" data-act="gp-rumble">📳</button></div></div>';
  var remapping = gp.remapping();
  var map = gp.getMap();
  gp.ACTIONS.forEach(function (act) {
    var label = t("gp_" + act);
    var btn;
    if (remapping === act) {
      btn = '<button class="mini on" data-act="gp-remap-cancel">' + esc(t("gamepad_press_btn")) + " ✕</button>";
    } else {
      btn = '<button class="mini" data-act="gp-remap" data-v="' + act + '">' + esc(gp.btnName(map[act])) + "</button>";
    }
    h += '<div class="row"><div class="item-name">' + esc(label) + '</div><div class="row-btns">' + btn + "</div></div>";
  });
  h += '<div class="row"><div class="item-name">' + esc(t("gamepad_reset")) + '</div><div class="row-btns">' +
    '<button class="mini paper" data-act="gp-reset">↺</button></div></div>';
  return h;
}

/* ----- NPC ----- */
function renderNpc() {
  var talk = panelArg && panelArg.talk;
  if (!talk) return "";
  var npcId = panelArg.npcId;
  var h = '<div class="npc-lines"><div class="npc-name">' + esc(talk.name || "") + "</div>";
  /* {xh}: xưng hô theo giới tính nhân vật (huynh/muội) */
  var xh = null;
  if (hasSocial() && state && state.char) {
    try { xh = t(Social.xungHoKey(state.char.gender || "nam")); } catch (e) {}
  }
  (talk.lines || []).forEach(function (ln) {
    h += "<div>" + esc(xh ? t(ln, { xh: xh }) : t(ln)) + "</div>";
  });
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

/* ----- Shop hệ thống (Vạn Tiên Các đã chuyển thành chợ — xem renderMarket) ----- */
function shopTab() { return (panelArg && panelArg.tab) || "buy"; }
function renderShop() {
  var title = panelArg && panelArg.title;
  var h = title ? '<div class="shop-title">' + esc(t(title)) + "</div>" : "";
  h += tabBtns([["buy", t("shop_tab_buy")], ["sell", t("shop_tab_sell")]], shopTab(), "shop-tab");
  if (shopTab() === "buy") {
    var stock = (panelArg && panelArg.stock) ||
      ((typeof SHOP_STOCK !== "undefined") ? SHOP_STOCK : []);
    h += stock.map(function (id) {
      var d = itemDef(id);
      if (!d) return "";
      return '<div class="row"><div><div class="item-name">' + itemIcon(id) + " " + esc(itemName(id)) + "</div>" +
        '<div class="item-desc">' + esc(itemDesc(id)) + '</div><div class="shop-price">' + formatTien(d.price || 0) + " 💎</div></div>" +
        '<div class="row-btns"><button class="mini" data-act="shop-buy" data-id="' + esc(id) + '">' + esc(t("shop_buy")) + "</button></div></div>";
    }).join("");
  } else {
    if (!state.bag.length) h += "<p>" + esc(t("bag_empty")) + "</p>";
    h += state.bag.map(function (it, i) {
      var d = itemDef(it.id);
      if (!d || it.locked) return "";
      /* bí tịch: chỉ bán được khi chưa học / trùng chưa dùng */
      var sellPrice = d.sell || 0;
      if (d.kind === "manual") {
        try {
          if (typeof Skills !== "undefined" && !Skills.canSellManual(state, it.id)) {
            sellPrice = 0;
          } else {
            sellPrice = Skills.manualSellPrice(it.id);
          }
        } catch (e) {}
      }
      if (!(sellPrice > 0)) return "";
      return '<div class="row"><div><div class="item-name">' + itemIcon(it.id) + " " + esc(itemName(it.id)) +
        ' <span class="item-qty">x' + it.qty + "</span></div>" +
        '<div class="shop-price">' + formatTien(sellPrice) + " 💎</div></div>" +
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
/* Nguyên liệu theo STAGES[realm+1].dot_pha (cảnh giới đột phá TỚI).
 * Bui chốt: đột phá đại cảnh giới cần đan đột phá; từ Nguyên Anh trở lên độ lôi kiếp. */
var BT_PILL_BY_REALM = {
  2: [{ id: "pill_truccodan", qty: 1 }, { id: "yaodan1", qty: 1 }], /* → Trúc Cơ */
  3: [{ id: "pill_kimdan", qty: 1 }],                              /* → Kim Đan */
  4: [{ id: "pill_nguyenanh", qty: 1 }, { id: "yaodan1", qty: 2 }],/* → Nguyên Anh */
  5: [{ id: "pill_hoathan", qty: 1 }, { id: "yaodan1", qty: 3 }],  /* → Hóa Thần */
  6: [{ id: "pill_luyenhu", qty: 1 }, { id: "yaodan1", qty: 5 }],  /* → Luyện Hư/Hợp Thể/Đại Thừa */
  7: [{ id: "pill_hopdao", qty: 1 }, { id: "yaodan1", qty: 8 }],   /* → Độ Kiếp */
};
function btNeeds() {
  var target = state.char.realm + 1;
  return BT_PILL_BY_REALM[target] || [];
}
function renderBreakthrough() {
  var c = state.char;
  var h = '<div class="item-name">' + esc(c.name) + ": " + esc(stageName(c.realm, c.tier)) +
    " → " + esc(stageName(c.realm + 1, c.realm + 1 === 1 ? 1 : 0)) + "</div>";
  /* Khóa đột phá bởi thử thách tông môn (Bui chốt) */
  var gate = null;
  try { if (typeof SectQuest !== "undefined") gate = SectQuest.breakthroughGate(state); } catch (e) {}
  if (gate) {
    h += '<div class="sect-note">⚠️ ' + esc(t("sq_bt_gate", { name: t(gate.nameKey) })) + "</div>" +
      '<button class="btn btn-jade big" style="width:100%;margin-top:8px" data-act="bt-gate-go">' +
      esc(t("sq_bt_gate_btn")) + "</button>";
    return h;
  }
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
  /* Buff tỉ lệ từ nhiệm vụ Củng Cố Căn Cơ (tối đa +30%) */
  try { if (typeof SectQuest !== "undefined") rate = Math.min(1, rate + SectQuest.btBonus(state)); } catch (e) {}
  /* Căn Cốt: +tỉ lệ đột phá theo cấp */
  try {
    if (typeof BodyCult !== "undefined") rate = Math.min(1, rate + BodyCult.cancotBonus(BodyCult.lvOf(state, "cancot")).btBonus);
  } catch (e) {}
  /* Phẩm chất căn cốt: +tỉ lệ đột phá (taycot.js) */
  try {
    if (typeof TayCot !== "undefined") rate = Math.min(1, rate + TayCot.cotBonus(state).btBonus);
  } catch (e) {}
  /* Thiên phú chuyển thế: +tỉ lệ đột phá (lifespan.js) */
  try {
    if (typeof Lifespan !== "undefined") rate = Math.min(1, rate + Lifespan.talentBtPct(state));
  } catch (e) {}
  var r = doBreakthrough(state, rate);
  saveGame(state);
  refreshHUD();
  if (r.ok) {
    /* Đột phá thành công: cộng thọ nguyên cảnh giới mới */
    try {
      if (typeof Lifespan !== "undefined") {
        var _tnAdd = Lifespan.onBreakthrough(state);
        saveGame(state);
        toast(t("tn_bt_bonus", { n: _tnAdd }));
      }
    } catch (e) {}
    toast(t("bt_success")); sfx("success");
  }
  else {
    toast(t("bt_fail")); sfx("fail");
    /* Đột phá thất bại → mở nhiệm vụ củng cố, không mất hết tiến độ */
    try { if (typeof SectQuest !== "undefined") SectQuest.onBreakthroughFail(state); } catch (e) {}
  }
  music("map");
  closePanel();
}

var RENDER = {
  bag: renderBag, char: renderChar, skill: renderSkill, quest: renderQuest,
  map: renderMap, dungeon: renderDungeon, gift: renderGift, settings: renderSettings,
  npc: renderNpc, shop: renderShop, breakthrough: renderBreakthrough, donate: renderDonate,
  friends: renderFriends, chat: renderChat, rename: renderRename, gender: renderGender,
  dao: renderDao, refine: renderRefine, death: renderDeath, tower: renderTower,
  alchemy: renderAlchemy, equipdetail: renderEquipDetail, fragx: renderFragx
};

/* ================= THÔNG THIÊN THÁP + SỰ KIỆN NGÀY (tower.js) ================= */
var towerAnimTimer = null;
function hasTower() { return typeof Tower !== "undefined"; }

function renderTower() {
  if (!hasTower()) return "";
  Tower.ensure(state);
  var tw = state.tower;
  var ev = Tower.todayEvent(Date.now());
  var tries = Tower.triesLeft(state);
  var h = "";
  /* sự kiện hôm nay */
  h += '<div class="tw-event">' + ev.icon + " <b>" + esc(t(ev.nameKey)) + "</b><br>" +
    '<span class="item-desc">' + esc(t(ev.descKey)) + "</span></div>";
  /* trạng thái */
  h += '<div class="tw-status"><div>🏆 ' + esc(t("tw_best", { n: tw.best })) + "</div>" +
    "<div>⚔️ " + esc(t("tw_tries", { n: tries })) + "</div></div>";
  /* khung hiệu ứng leo tháp */
  h += '<div id="tw-anim" class="tw-anim">' + esc(t("tw_ready")) + "</div>";
  h += '<button class="btn big" style="width:100%" data-act="tower-climb"' +
    (tries > 0 ? "" : " disabled") + ">" + esc(t("tw_climb")) + " ⚔️</button>";
  /* rương mốc */
  h += '<div class="item-name" style="margin-top:10px">' + esc(t("tw_chests")) + "</div>";
  h += '<div class="tw-chests">' + Tower.DEF.milestones.map(function (m) {
    var got = tw.chests[String(m)];
    return '<span class="tw-chest' + (got ? " got" : "") + '">' + (got ? "📭" : "🎁") +
      " T" + m + "</span>";
  }).join("") + "</div>";
  /* BXH tuần */
  var board = Tower.weeklyBoard(state);
  h += '<div class="item-name" style="margin-top:10px">' + esc(t("tw_board")) + "</div>";
  if (board.length) {
    h += '<div class="tw-board">' + board.map(function (r, i) {
      return '<div class="tw-row"><span>#' + (i + 1) + "</span><span>" +
        esc(t("tw_floor", { n: r.floor })) + '</span><span class="item-desc">' +
        new Date(r.ts).toLocaleDateString() + "</span></div>";
    }).join("") + "</div>";
  } else {
    h += '<div class="item-desc">' + esc(t("tw_board_empty")) + "</div>";
  }
  return h;
}

function doTowerClimb() {
  if (!hasTower()) return;
  Tower.ensure(state);
  if (!Tower.canClimb(state)) { toast(t("tw_no_tries")); sfx("fail"); return; }
  var s = getStats();
  var res = Tower.climb(state, s, Date.now());
  if (!res.ok) { toast(t("tw_no_tries")); sfx("fail"); return; }
  /* trao thưởng */
  state.stones = (state.stones || 0) + res.rewards.stones;
  try { gainExp(state, res.rewards.exp); } catch (e) {}
  res.rewards.items.forEach(function (it) {
    try { addItem(state, it.id, it.qty); } catch (e) {}
  });
  saveGame(state);
  sfx("success");
  try { refreshHUD(); } catch (e) {}
  animateTowerClimb(res);
}

function animateTowerClimb(res) {
  var el = $("tw-anim");
  if (!el) { renderPanel(); return; }
  if (towerAnimTimer) { clearInterval(towerAnimTimer); towerAnimTimer = null; }
  var log = res.log, i = 0, trail = "";
  el.innerHTML = '<div class="tw-climbing">' + esc(t("tw_climbing")) + ' ...</div><div class="tw-trail"></div>';
  var trailEl = el.querySelector(".tw-trail");
  towerAnimTimer = setInterval(function () {
    if (i >= log.length) {
      clearInterval(towerAnimTimer); towerAnimTimer = null;
      var last = log[log.length - 1];
      var doneTxt = res.floors >= Tower.DEF.floors ? "🏆 " + t("tw_clear") :
        (last && !last.win ? "💀 " + t("tw_stop", { n: res.floors }) :
        "🎉 " + t("tw_done", { n: res.floors }));
      toast(doneTxt + "  (+" + res.rewards.stones + " 💎)");
      renderPanel();
      return;
    }
    var e2 = log[i];
    trail += '<span class="tw-f' + (e2.win ? "w" : "l") + (e2.boss ? " b" : "") + '">' +
      (e2.boss ? "👺" : "") + e2.floor + "</span>";
    if (trailEl) trailEl.innerHTML = trail;
    i++;
  }, 90);
}

/* ================= TỌA HÓA — Thọ Nguyên cạn (lifespan.js) ================= */
function renderDeath() {
  var hasPill = (typeof countItem !== "undefined") && countItem(state, "dan_truong_sinh") > 0;
  var h = '<div class="item-name" style="color:#ff6a6a">💀 ' + esc(t("panel_death")) + "</div>";
  h += '<div class="item-desc">' + esc(t("tn_dead_desc")) + "</div>";
  h += '<div style="margin:10px 0"><button class="btn big" style="width:100%" data-act="tn-rebirth">' +
    esc(t("tn_rebirth")) + "</button>" +
    '<div class="item-desc">' + esc(t("tn_rebirth_desc")) + "</div></div>";
  if (hasPill) {
    h += '<div style="margin:10px 0"><button class="btn btn-jade big" style="width:100%" data-act="tn-revive">' +
      esc(t("tn_revive")) + "</button></div>";
  }
  /* lịch sử chuyển thế */
  try {
    if (typeof Lifespan !== "undefined" && (state.tnHistory || []).length) {
      h += '<div class="item-desc"><b>' + esc(t("tn_history")) + ":</b><br>" +
        state.tnHistory.map(function (en, i) {
          var _td = Lifespan.talentDef(en.talent);
          return esc(t("tn_history_row", {
            i: i + 1, realm: esc(stageName(en.realm, 0)), kept: en.kept,
            talent: _td ? esc(t(_td.nameKey)) : en.talent
          }));
        }).join("<br>") + "</div>";
    }
  } catch (e) {}
  return h;
}
function doTnRebirth() {
  if (typeof Lifespan === "undefined") return;
  var r = Lifespan.rebirth(state, Date.now());
  var _td = Lifespan.talentDef(r.talent);
  saveGame(state);
  statsCache = null;
  sfx("success");
  toast(t("tn_talent_got", { n: _td ? t(_td.nameKey) : r.talent }));
  closePanel();
  refreshHUD(); renderPanel();
}
function doTnRevive() {
  if (typeof Lifespan === "undefined") return;
  var r = Lifespan.revive(state, Date.now());
  if (!r.ok) { toast(t("tn_no_pill")); sfx("fail"); return; }
  saveGame(state);
  sfx("success");
  toast(t("tn_pill_years", { n: r.years }));
  closePanel();
  refreshHUD(); renderPanel();
}

/* ----- Chọn đường tu: Chính Đạo / Ma Đạo ----- */
var DAO_CHANGE_COST = 5000;
function renderDao() {
  var cur = state.dao || null;
  var changed = !!state.daoChanged;
  var h = '<div class="item-name">☯️ ' + esc(t("dao_title")) + "</div>" +
    '<div class="item-desc">' + esc(t("dao_choose_desc")) + "</div>";
  [["chinh", "dao_chinh", "☯️", "dao_chinh_desc"], ["ma", "dao_ma", "😈", "dao_ma_desc"]].forEach(function (d) {
    var isCur = cur === d[0];
    var canPick = !cur || (!changed && cur !== d[0]);
    var costNote = !cur ? t("dao_first_free") :
      (changed ? t("dao_locked") : t("dao_change_cost", { n: formatTien(DAO_CHANGE_COST) }));
    h += '<div class="row"><div><div class="item-name">' + d[2] + " " + esc(t(d[1])) +
      (isCur ? " ✓" : "") + "</div>" +
      '<div class="item-desc">' + esc(t(d[3])) + "</div></div>" +
      '<div class="row-btns">' + (isCur ? "" :
        '<button class="mini" data-act="dao-pick" data-v="' + d[0] + '"' +
        (canPick ? "" : " disabled") + ">" + esc(t("dao_pick")) +
        " (" + esc(costNote) + ")</button>") + "</div></div>";
  });
  return h;
}
function doDaoPick(v) {
  if (v !== "chinh" && v !== "ma") return;
  if (!state.dao) {
    state.dao = v; /* lần đầu free */
  } else {
    if (state.daoChanged || state.dao === v) { toast(t("dao_locked")); return; }
    if ((state.stones || 0) < DAO_CHANGE_COST) { toast(t("shop_no_stone")); sfx("fail"); return; }
    state.stones -= DAO_CHANGE_COST;
    state.dao = v;
    state.daoChanged = true;
  }
  /* rời tông môn cũ nếu trái đạo (Cửu U Ma Tông chỉ nhận Ma Đạo) */
  try {
    if (typeof Sect !== "undefined" && Sect.joinedSect(state) === "cuu_u_ma_tong" && state.dao !== "ma") {
      state.sectInfo.joined = null; state.sectInfo.contrib = 0;
    }
  } catch (e) {}
  saveGame(state); sfx("success");
  toast(t("dao_picked", { n: t(v === "ma" ? "dao_ma" : "dao_chinh") }));
  openPanel("char");
}

/* ----- delegated click cho mọi panel ----- */
function onPanelClick(e) {
  var el = e.target && e.target.closest ? e.target.closest("[data-act]") : null;
  if (!el) return;
  var act = el.getAttribute("data-act");
  var i = el.getAttribute("data-i");
  var v = el.getAttribute("data-v");
  switch (act) {
    case "bag-use": doBagUse(+i); break;
    case "pet-feed": doPetFeed(); break;
    case "bag-equip": doBagEquip(+i); break;
    case "bag-unlock": doBagUnlock(+i); break;
    case "equip-detail": openPanel("equipdetail", { slot: el.getAttribute("data-slot") }); break;
    case "spirit-awaken": doSpiritAwaken(); break;
    case "spirit-awaken-pill": doSpiritAwakenPill(); break;
    case "spirit-feed": doSpiritFeed(el.getAttribute("data-food")); break;
    case "spirit-feed-stones": doSpiritFeedStones(); break;
    case "spirit-enlighten": doSpiritEnlighten(); break;
    case "eq-refine": doEqRefine(); break;
    case "eq-tierup": doEqTierUp(); break;
    case "bag-info": toast(t("bag_slots", { n: state.bag.length })); break;
    case "enhance": doEnhance(el.getAttribute("data-slot")); break;
    case "char-tab": panelArg = { tab: v }; renderPanel(); break;
    /* ----- Căn Cốt / Thần Thức ----- */
    case "bc-upgrade": doBcUpgrade(el.getAttribute("data-type"), el.getAttribute("data-method")); break;
    case "bc-meditate-start": doBcMeditateStart(); break;
    case "bc-meditate-claim": doBcMeditateClaim(); break;
    case "bc-daily": doBcDaily(el.getAttribute("data-id")); break;
    case "bc-refine": doBcRefine(el.getAttribute("data-id")); break;
    case "bc-protect": {
      var _box = el.tagName === "INPUT" ? el : el.querySelector("input");
      bcProtectUse = !!(_box && _box.checked);
      break;
    }
    case "bt-open": btStep = "needs"; openPanel("breakthrough"); break;
    case "bt-do": btDo(); break;
    /* ----- Thọ Nguyên: tọa hóa ----- */
    case "tn-rebirth": doTnRebirth(); break;
    case "tn-revive": doTnRevive(); break;
    case "tower-climb": doTowerClimb(); break;
    case "qtab": panelArg = { tab: v }; renderPanel(); break;
    case "quest-accept": {
      var qaid = el.getAttribute("data-id");
      var qar = (typeof Quest !== "undefined") ? Quest.accept(state, qaid) : null;
      if (qar && qar.ok) {
        saveGame(state); sfx("success");
        /* Thoại nhận NV (nếu quest có acceptTalk) */
        try {
          var qd = Quest.def(qaid);
          if (qd && qd.acceptTalk) {
            var npcNK = (typeof NPCS !== "undefined" && NPCS[qd.npc]) ? NPCS[qd.npc].nameKey : null;
            showQuestTalk(qd.acceptTalk, npcNK);
          } else toast(t("quest_accept"));
        } catch (e) { toast(t("quest_accept")); }
        renderPanel();
      }
      break;
    }
    case "quest-turnin": {
      var qtid = el.getAttribute("data-id");
      var qr = (typeof Quest !== "undefined") ? Quest.turnIn(state, qtid) : null;
      if (qr && qr.ok) {
        saveGame(state); sfx("success");
        /* Thoại trả NV (nếu quest có turninTalk) */
        try {
          var qd2 = Quest.def(qtid);
          if (qd2 && qd2.turninTalk) {
            var npcNK2 = (typeof NPCS !== "undefined" && NPCS[qd2.npc]) ? NPCS[qd2.npc].nameKey : null;
            showQuestTalk(qd2.turninTalk, npcNK2);
          } else toast(t("quest_done"));
        } catch (e) { toast(t("quest_done")); }
        refreshHUD(); renderPanel();
      } else { toast(t("q_incomplete")); sfx("fail"); }
      break;
    }
    /* ----- Nhiệm vụ tông môn ----- */
    case "sect-quest-accept": {
      var sa = (typeof SectQuest !== "undefined") ? SectQuest.accept(state, el.getAttribute("data-id")) : null;
      if (sa && sa.ok) { saveGame(state); sfx("success"); toast(t("quest_accept")); renderPanel(); }
      else { toast(t("q_incomplete")); sfx("fail"); }
      break;
    }
    case "sect-quest-turnin": {
      var st2 = (typeof SectQuest !== "undefined") ? SectQuest.turnIn(state, el.getAttribute("data-id")) : null;
      if (st2 && st2.ok) {
        saveGame(state); refreshHUD();
        if (st2.ceremony) showSectCeremony(st2.ceremony);
        else { sfx("success"); toast(t("quest_done")); }
        renderPanel();
      } else { toast(t("q_incomplete")); sfx("fail"); }
      break;
    }
    case "sect-quest-nav": {
      var qd = (typeof SectQuest !== "undefined") ? SectQuest.def(el.getAttribute("data-id")) : null;
      if (qd) sectQuestNav(qd.target);
      break;
    }
    case "sect-trial-start": startSectTrial(el.getAttribute("data-id")); break;
    case "quest-trial-start": startQuestTrial(el.getAttribute("data-id")); break;
    case "sect-daily-claim": {
      var dc = (typeof SectQuest !== "undefined") ? SectQuest.claimDaily(state, el.getAttribute("data-id")) : null;
      if (dc && dc.ok) {
        saveGame(state); sfx("success");
        var _rw = dc.reward || {};
        toast("+" + (_rw.contrib || dc.contrib || 0) + " " + t("sect_contrib") +
          ((_rw.stones ? " · +" + _rw.stones + " 💎" : "")) + ((_rw.exp ? " · +" + _rw.exp + " EXP" : "")));
        renderPanel();
      }
      else { toast(t("q_incomplete")); sfx("fail"); }
      break;
    }
    case "sect-daily-bonus": {
      var db = (typeof SectQuest !== "undefined") ? SectQuest.claimDailyBonus(state) : null;
      if (db && db.ok) {
        saveGame(state); sfx("success");
        toast("🎁 +" + db.bonus.contrib + " " + t("sect_contrib") + " · +" + db.bonus.stones + " 💎 · +" + db.bonus.exp + " EXP");
        renderPanel();
      }
      else { toast(t("q_incomplete")); sfx("fail"); }
      break;
    }
    case "sect-weekly-claim": {
      var wc = (typeof SectQuest !== "undefined") ? SectQuest.claimWeekly(state, el.getAttribute("data-id")) : null;
      if (wc && wc.ok) { saveGame(state); sfx("success"); toast(t("quest_done")); renderPanel(); }
      else { toast(t("q_incomplete")); sfx("fail"); }
      break;
    }
    case "sect-cungco-accept": {
      var ca = (typeof SectQuest !== "undefined") ? SectQuest.acceptCungCo(state) : null;
      if (ca && ca.ok) { saveGame(state); sfx("success"); toast(t("quest_accept")); renderPanel(); }
      else { toast(t("q_incomplete")); sfx("fail"); }
      break;
    }
    case "sect-cungco-turnin": {
      var ct = (typeof SectQuest !== "undefined") ? SectQuest.turnInCungCo(state) : null;
      if (ct && ct.ok) {
        saveGame(state); sfx("success");
        toast(t("sq_bt_bonus", { n: Math.round(ct.btBonus * 100) })); renderPanel();
      } else { toast(t("q_incomplete")); sfx("fail"); }
      break;
    }
    case "sect-open": openPanel("sect"); break;
    case "bt-gate-go": openPanel("quest", { tab: "sect" }); break;
    case "map-go": doMapGo(+i); break;
    case "dg-enter": doDungeonEnter(DUNGEONS[+i]); break;
    case "dg-buy": doDungeonBuy(DUNGEONS[+i]); break;
    case "dg-tab": panelArg = { dtab: v }; renderPanel(); break;
    case "gz-go": doGrindTravel(el.getAttribute("data-id")); break;
    case "fragx-do": doFragExchange(parseInt(el.getAttribute("data-i"), 10)); break;
    case "secret-enter": doSecretEnter(el.getAttribute("data-id")); break;
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
    case "set-tapmove":
      state.settings.tapMove = !(state.settings.tapMove !== false);
      if (hasEngine() && Engine.setTapMove) Engine.setTapMove(state.settings.tapMove);
      saveGame(state); renderPanel(); break;
    case "set-vibrate":
      state.settings.vibrate = !(state.settings.vibrate !== false);
      saveGame(state); renderPanel(); break;
    case "set-voice":
      state.settings.voice = !(state.settings.voice !== false);
      if (state.settings.voice === false && typeof Story !== "undefined" && Story.stopVoice) Story.stopVoice();
      saveGame(state); renderPanel(); break;
    case "set-fullscreen":
      state.settings.display = state.settings.display || {};
      state.settings.display.fullscreen = !state.settings.display.fullscreen;
      applyDisplaySettings(); saveGame(state); renderPanel(); break;
    case "set-orient":
      state.settings.display = state.settings.display || {};
      state.settings.display.orientation = v || "auto";
      applyDisplaySettings(); saveGame(state); renderPanel(); break;
    case "set-lang":
      setLang(v); state.lang = v; saveGame(state); applyI18n(); renderPanel(); refreshHUD(); break;
    case "clear-data":
      /* Xóa dữ liệu cũ — CHỈ xóa save/cài đặt, GIỮ NGUYÊN hình ảnh
         và hiệu ứng skill linh thú (không nằm trong localStorage). */
      try {
        if (typeof clearOldData === "function" && typeof reloadFresh === "function") {
          if (confirm(t("cleardata_confirm"))) {
            clearOldData();
            try { toast(t("cleardata_done")); } catch (e2) {}
            setTimeout(function () { reloadFresh(); }, 600);
          }
        }
      } catch (e) {}
      break;
    case "gp-toggle":
      if (typeof GamepadInput !== "undefined") GamepadInput.setEnabled(!GamepadInput.isEnabled());
      saveGame(state); renderPanel(); break;
    case "gp-rumble":
      if (typeof GamepadInput !== "undefined") GamepadInput.testRumble();
      break;
    case "gp-remap":
      if (typeof GamepadInput !== "undefined") {
        if (!GamepadInput.startRemap(v)) toast(t("gamepad_not_connected"));
        renderPanel();
      }
      break;
    case "gp-remap-cancel":
      if (typeof GamepadInput !== "undefined") GamepadInput.cancelRemap();
      renderPanel(); break;
    case "gp-reset":
      if (typeof GamepadInput !== "undefined") GamepadInput.resetMap();
      saveGame(state); renderPanel(); break;
    case "open-donate": openPanel("donate", { from: el.getAttribute("data-from") }); break;
    case "donate-done": doDonateDone(el.getAttribute("data-from")); break;
    /* --- Bạn bè + nhắn tin --- */
    case "friends-open": openPanel("friends"); break;
    case "fr-tab": panelArg = { tab: v }; frResults = []; renderPanel(); break;
    case "fr-search": {
      var q = $("fr-q"); frQuery = q ? q.value : "";
      frResults = hasSocial() ? Social.searchPlayers(frQuery, state) : [];
      if (!frResults.length) toast(t("fr_notfound"));
      renderPanel();
      var qi = $("fr-q"); if (qi) { qi.focus(); }
      break;
    }
    case "fr-add": {
      var ra = Social.sendRequest(state, el.getAttribute("data-id"));
      if (ra.ok) { saveGame(state); sfx("success"); toast(t("fr_request_sent")); }
      else if (ra.reason === "already") toast(t("fr_already"));
      else if (ra.reason === "requested") toast(t("fr_request_exists"));
      else { toast(t("fr_notfound")); sfx("fail"); }
      frResults = hasSocial() ? Social.searchPlayers(frQuery, state) : [];
      renderPanel(); break;
    }
    case "fr-cancel-req":
      Social.cancelRequest(state, el.getAttribute("data-id"));
      saveGame(state); renderPanel(); break;
    case "fr-accept":
      Social.acceptRequest(state, el.getAttribute("data-id"));
      saveGame(state); sfx("success"); renderPanel(); break;
    case "fr-decline":
      Social.declineRequest(state, el.getAttribute("data-id"));
      saveGame(state); renderPanel(); break;
    case "fr-remove":
      Social.removeFriend(state, el.getAttribute("data-id"));
      saveGame(state); toast(t("fr_remove_done")); renderPanel(); break;
    case "fr-chat": openPanel("chat", { friendId: el.getAttribute("data-id") }); break;
    case "chat-back": openPanel("friends", { tab: "list" }); break;
    case "chat-send": doChatSend(); break;
    case "world-send": doWorldSend(); break;
    case "rename-open": openPanel("rename"); break;
    case "rename-do": doRename(); break;
    case "gender-open": genderSel = state.char.gender || "nam"; openPanel("gender"); break;
    case "gender-sel": genderSel = v; renderPanel(); break;
    case "gender-do": doGenderChange(); break;
    case "copy-id": copyCharId(); break;
    case "dao-open": openPanel("dao"); break;
    case "dao-pick": doDaoPick(v); break;
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
  /* Đan dược cảnh giới: kiểm tra cảnh giới yêu cầu (Bui duyệt 2026-10-18) */
  if (d.reqRealm && state.char && (state.char.realm || 0) < d.reqRealm) {
    toast(t("pill_need_realm", { r: realmReqName(d.reqRealm) }));
    sfx("fail");
    return;
  }
  /* Hồi chiêu đan dược */
  if (d.hoiChieu) {
    state.pillCd = state.pillCd || {};
    var _now = Date.now(), _last = state.pillCd[it.id] || 0;
    var _remain = Math.ceil((d.hoiChieu * 1000 - (_now - _last)) / 1000);
    if (_remain > 0) { toast(t("pill_cooldown", { s: _remain })); sfx("fail"); return; }
  }
  /* Buff Dược Vương Tông: +30% hiệu quả đan dược/thức ăn */
  var _pillM = 1;
  try {
    if (typeof Sect !== "undefined" && Sect.sectBuff) _pillM = Sect.sectBuff(state).pillMult || 1;
  } catch (e) {}
  if (d.healHp) healPlayer(Math.round(s.maxHp * d.healHp * _pillM), 0);
  if (d.healMp) healPlayer(0, Math.round(s.maxMp * d.healMp * _pillM));
  /* Đan tu vi: cộng tu vi trực tiếp (buff tông môn cũng tăng) */
  if (d.tuVi && typeof gainExp !== "undefined") {
    gainExp(state, Math.round(d.tuVi * _pillM));
    toast("+" + Math.round(d.tuVi * _pillM) + " tu vi");
  }
  if (d.healFocus && hasEngine() && Engine.player) {
    Engine.player.focus = Math.min(100, (Engine.player.focus || 0) + d.healFocus);
  }
  if (d.shieldPct && hasEngine() && Engine.player) {
    var amt = Math.round(s.maxHp * d.shieldPct);
    Engine.player.maxShield = Math.max(Engine.player.maxShield || 0, amt);
    Engine.player.shield = Math.min(Engine.player.maxShield, (Engine.player.shield || 0) + amt);
    Engine.player.shieldT = d.shieldDur || 30;
  }
  /* Tẩy Cốt Đan: +N cấp Căn Cốt + roll/tăng PHẨM CHẤT căn cốt (taycot.js) */
  if (d.taycot && typeof BodyCult !== "undefined") {
    try {
      var _ccNl = BodyCult.setLv(state, "cancot", BodyCult.lvOf(state, "cancot") + (d.taycot || 1));
      var _ccMs = BodyCult.milestoneAt("cancot", _ccNl);
      if (_ccMs) {
        state.bcTitles = state.bcTitles || [];
        if (state.bcTitles.indexOf(_ccMs.titleKey) < 0) state.bcTitles.push(_ccMs.titleKey);
      }
      toast(t("taycot_drink", { n: _ccNl }));
      if (typeof TayCot !== "undefined") {
        var _tcR = TayCot.drinkTayCot(state, d.taycotGrade || 0);
        if (_tcR.isNew || _tcR.upgraded) showTayCotFx(_tcR.pham, _tcR.upgraded, _tcR.from);
        else toast(t("tc_pham_keep", { p: t("cot_pham_" + _tcR.pham) }));
      }
    } catch (e) {}
  }
  /* Khai Mạch Đan: mở thêm linh căn ngũ hành (taycot.js) */
  if (d.khaimach && typeof TayCot !== "undefined") {
    try {
      var _kmUn = TayCot.unopenedRoots(state);
      if (_kmUn.length === 0) { toast(t("km_full")); }
      else if (d.khaimachChoose && _kmUn.length > 0) {
        showKhaiMachChoose(_kmUn, d.khaimach || 1);
      } else {
        var _kmR = TayCot.openRoots(state, d.khaimach || 1);
        toast(t("km_opened", { n: _kmR.opened.map(function (e) { return t("el_" + e); }).join(" · ") }));
        sfx("success");
      }
    } catch (e) {}
  }
  /* Thọ Nguyên Đan: cộng năm thọ nguyên, hiệu quả giảm dần mỗi lần dùng (lifespan.js) */
  if (d.tnYears) {
    var _tnM = _pillM; /* buff Dược Vương Tông cũng tăng hiệu quả đan thọ nguyên */
    try {
      if (typeof Lifespan !== "undefined") {
        _tnM *= (1 + Lifespan.talentPillPct(state));
        var _tnR = Lifespan.usePill(state, it.id, d.tnYears, _tnM);
        toast(t("tn_pill_years", { n: _tnR.years }) + " (" + t("tn_pill_eff", { n: _tnR.effPct }) + ")");
      }
    } catch (e) {}
  }
  removeItem(state, it.id, 1);
  if (d.hoiChieu) { state.pillCd = state.pillCd || {}; state.pillCd[it.id] = Date.now(); }
  saveGame(state);
  sfx("pickup");
  refreshHUD(); renderPanel();
}
/* Nút thuốc nhanh cạnh cụm nút tròn */
function doQuickPotion(kind) {
  var best = -1, bestV = 0;
  for (var i = 0; i < state.bag.length; i++) {
    var it = state.bag[i];
    if (it.locked || !it.qty) continue;
    var d = itemDef(it.id);
    if (!d || d.kind !== "pill") continue;
    var v = kind === "hp" ? (d.healHp || 0) : (d.healMp || 0);
    if (v > bestV) { bestV = v; best = i; }
  }
  if (best < 0) { toast(t("bag_empty")); sfx("fail"); return; }
  doBagUse(best);
}
function doBagEquip(idx) {
  var it = state.bag[idx];
  var d = it && itemDef(it.id);
  if (!d || !d.slot || it.locked) return;
  /* Chưa đủ cảnh giới → KHÔNG đeo được (trừ đồ hiếm vượt cấp: đeo được, bị phạt) */
  try {
    if (typeof Khilinh !== "undefined" && !Khilinh.canEquip(state, d)) {
      var _rn = stageName(Khilinh.realmOfItem(d), 0);
      sfx("error"); toast(t("eq_cannot_equip", { realm: _rn }));
      return;
    }
  } catch (e) {}
  var slot = d.slot;
  var cur = state.equip[slot];
  if (cur) addItem(state, cur, 1); /* tháo món cũ về túi */
  state.equip[slot] = it.id;
  removeItem(state, it.id, 1);
  /* Thử thức tỉnh khí linh khi đeo đồ tier>=2 */
  try {
    if (typeof Khilinh !== "undefined" && Khilinh.canAwaken(d)) {
      var _aw = Khilinh.awaken(state, it.id, false);
      if (_aw.ok) setTimeout(function () {
        toast("✨ " + t("spirit_awakened", { name: _aw.spirit.name }));
      }, 600);
    }
  } catch (e) {}
  saveGame(state);
  sfx("success");
  toast(t("ui_equipped") + ": " + itemName(it.id));
  /* Cảnh báo đồ hiếm vượt cấp */
  try {
    if (typeof Khilinh !== "undefined" && Khilinh.isOverlevel(state, d))
      setTimeout(function () { toast("⚠️ " + t("eq_overlevel_warn")); }, 600);
  } catch (e) {}
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
  /* Vào map trái đạo: bị aura bài xích (-30% công/thủ), cảnh báo trước */
  state.mapAura = mapDaoMismatch(m) ? { mapDao: m.dao } : null;
  if (state.mapAura) toast(t(m.dao === "ma" ? "map_aura_ma_desc" : "map_aura_tien_desc"));
  saveGame(state);
  closePanel();
  var doGo = function () {
    if (hasEngine() && Engine.enterMap) Engine.enterMap(m.id);
    music("map");
    bossMusicOn = false;
    refreshHUD();
  };
  if (typeof MapLoading !== "undefined" && MapLoading.show) MapLoading.show(m, doGo);
  else doGo();
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
  if (!d || it.locked) return;
  var sellPrice = d.sell || 0;
  if (d.kind === "manual") {
    try {
      if (typeof Skills !== "undefined") {
        if (!Skills.canSellManual(state, it.id)) { toast(t("manual_cannot_sell")); sfx("fail"); return; }
        sellPrice = Skills.manualSellPrice(it.id);
      }
    } catch (e) {}
  }
  if (!(sellPrice > 0)) return;
  removeItem(state, it.id, 1);
  state.stones += sellPrice;
  saveGame(state);
  sfx("pickup");
  toast(t("shop_sold") + ": " + itemName(it.id) + " +" + formatTien(sellPrice) + " 💎");
  refreshHUD(); renderPanel();
}
function doNpcOpt(el) {
  var opact = el.getAttribute("data-opact");
  var talk = panelArg && panelArg.talk;
  var optIdx = +(el.getAttribute("data-i") || 0);
  var opt = (talk && talk.options && talk.options[optIdx]) || {};
  if (opact === "quest") { openPanel("quest"); return; }
  if (opact === "shop") {
    var npcId = panelArg && panelArg.npcId;
    var kind = (typeof NPCS !== "undefined" && NPCS[npcId]) ? NPCS[npcId].kind : "shop";
    if (kind === "shop" && typeof vanTienCacUnlocked === "function" && !vanTienCacUnlocked(state) &&
        npcId !== "thuong_nhan" && npcId !== "lao_ren" && npcId !== "lao_nong_dan" && npcId !== "dai_phu") {
      panelArg.lockedShop = true; /* chưa đủ điều kiện → đường vào panel donate */
      renderPanel();
      return;
    }
    openPanel("shop", { stock: opt.stock || null, title: opt.title || null });
    return;
  }
  if (opact === "market") {
    if (typeof vanTienCacUnlocked === "function" && !vanTienCacUnlocked(state)) {
      toast(t("shop_locked")); sfx("fail"); return;
    }
    openPanel("market");
    return;
  }
  if (opact === "sect") { openPanel("sect"); return; }
  if (opact === "gacha") { openPanel("gacha"); return; }
  if (opact === "dungeon") { openPanel("dungeon"); return; }
  if (opact === "tower") { openPanel("tower"); return; }
  if (opact === "pet") { openPanel("pet"); return; }
  if (opact === "farm") { openPanel("farm"); return; }
  if (opact === "enhance") { openPanel("char", { tab: "equip" }); return; }
  if (opact === "refine") { openPanel("refine"); return; }
  if (opact === "fragx") { openPanel("fragx"); return; }
  if (opact === "alchemy") { openPanel("alchemy"); return; }
  if (opact === "alchemy-craft") { doAlchemyCraft(el.getAttribute("data-recipe")); return; }
  if (opact === "sect-join") { doSectJoin(opt.sect || el.getAttribute("data-sect")); return; }
  if (opact === "assign-skill") { doAssignSkill(el.getAttribute("data-tech")); return; }
  if (opact === "inn-rest") { doInnRest(); return; }
  if (opact === "inn-rumor") { doInnRumor(); return; }
  if (opact === "checkin") { doCheckin(); renderPanel(); return; }
  if (opact === "open-donate") { openPanel("donate", { from: el.getAttribute("data-from") }); return; }
  closePanel(); /* bye */
}

/* ---------------- bind DOM tĩnh ---------------- */
function bindStatic() {
  $("btn-continue").onclick = function () { sfx("click"); startGame(); };
  $("btn-new").onclick = function () { sfx("click"); show("create"); initCreate(); };
  $("btn-checkin").onclick = function () { doCheckin(); };
  $("btn-friends").onclick = function () { sfx("click"); openPanel("friends"); };
  /* Nút Chat đã chuyển vào hàng nút nhanh (qr-chat) — giữ tương thích nếu còn btn-chat cũ */
  var _chatBtn = $("qr-chat") || $("btn-chat");
  if (_chatBtn) _chatBtn.onclick = function () { sfx("click"); openPanel("friends", { tab: "list" }); };
  /* Hàng nút nhanh kiểu tutien2d */
  $("qr-combat").onclick = function () { sfx("click"); openPanel("skill"); };
  $("qr-mail").onclick = function () { sfx("click"); openPanel("gift"); };
  $("qr-sect").onclick = function () { sfx("click"); openPanel("sect"); };
  $("qr-menu").onclick = function () { sfx("click"); openPanel("settings"); };
  $("btn-lang-vi").onclick = function () { setLang("vi"); state.lang = "vi"; saveGame(state); applyI18n(); refreshMenu(); };
  $("btn-lang-en").onclick = function () { setLang("en"); state.lang = "en"; saveGame(state); applyI18n(); refreshMenu(); };

  $("create-gender-nam").onclick = function () { createSel.gender = "nam"; syncCreateGender(); sfx("click"); };
  $("create-gender-nu").onclick = function () { createSel.gender = "nu"; syncCreateGender(); sfx("click"); };
  var _btnTaycot = $("btn-taycot");
  if (_btnTaycot) _btnTaycot.onclick = function () { rollLingen(); };
  $("btn-begin").onclick = function () { beginGame(); };
  $("btn-create-back").onclick = function () { sfx("click"); show("menu"); refreshMenu(); };

  $("btn-auto").onclick = function () {
    state.auto = !state.auto;
    if (hasEngine() && Engine.setAuto) Engine.setAuto(state.auto);
    saveGame(state); syncToggles(); sfx("click");
  };
  $("btn-fly").onclick = function () {
    /* Ngự Kiếm mở khóa ở Trúc Cơ (realm 2) */
    if (!state.fly && (state.char.realm || 0) < 2) {
      toast(t("fly_need_truc_co"));
      return;
    }
    state.fly = !state.fly;
    if (hasEngine() && Engine.setFly) Engine.setFly(state.fly);
    saveGame(state); syncToggles(); sfx("click");
  };
  $("btn-run").onclick = function () {
    state.run = !state.run;
    if (hasEngine() && Engine.setRun) Engine.setRun(state.run);
    saveGame(state); syncToggles(); sfx("click");
  };
  /* Nút Tọa (thiền định) — kiểu tutien2d */
  $("btn-meditate").onclick = function () {
    sfx("click");
    try {
      if (typeof BodyCult === "undefined" || !BodyCult.meditateStart) { toast(t("coming_soon")); return; }
      var r = BodyCult.meditateStart(state);
      if (r && r.ok) { toast(t("bc_meditate_start")); saveGame(state); syncToggles(); }
      else toast(t("bc_meditating"));
    } catch (e) { toast(t("coming_soon")); }
  };
  $("btn-interact").onclick = function () {
    if (hasEngine() && Engine.tryInteract) Engine.tryInteract();
    sfx("click");
  };
  /* Cụm nút tròn: đánh / lướt / thuốc nhanh */
  $("btn-atk").onclick = function () {
    if (hasEngine() && Engine.manualAttack) Engine.manualAttack();
    sfx("click");
  };
  $("btn-dash").onclick = function () {
    if (hasEngine() && Engine.dash) {
      if (!Engine.dash()) toast(t("skill_no_focus"));
      else sfx("click");
    }
  };
  $("btn-potion-hp").onclick = function () { doQuickPotion("hp"); };
  $("btn-potion-mp").onclick = function () { doQuickPotion("mp"); };

  applyDisplaySettings();

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
    /* Phím 1-7: tung bí thuật theo ô skill */
    if (screen === "game" && !panel && /^Digit[1-7]$/.test(e.code)) {
      var ae2 = document.activeElement;
      if (ae2 && (ae2.tagName === "INPUT" || ae2.tagName === "TEXTAREA")) return;
      doSkillSlot(+e.code.slice(5) - 1);
    }
  });
}

/* Áp dụng cài đặt màn hình ngay (không cần tải lại) */
function applyDisplaySettings() {
  var d = (state.settings && state.settings.display) || {};
  try {
    if (d.fullscreen) {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen)
        document.documentElement.requestFullscreen().catch(function () {});
    } else if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(function () {});
    }
  } catch (e) {}
  document.body.classList.toggle("landscape", d.orientation === "landscape");
  try {
    if (screen.orientation && screen.orientation.lock) {
      if (d.orientation === "portrait") screen.orientation.lock("portrait").catch(function () {});
      else if (d.orientation === "landscape") screen.orientation.lock("landscape").catch(function () {});
      else screen.orientation.unlock();
    }
  } catch (e) {}
}

/* ============ JOYSTICK N\u1ed4I (floating) — di chuy\u1ec3n d\u1ec5 v\u00e0 \u0111\u1eb9p ============
 * - Ch\u1ea1m b\u1ea5t k\u1ef3 \u0111\u00e2u \u1edf n\u1eeda tr\u00e1i d\u01b0\u1edbi m\u00e0n h\u00ecnh → joystick hi\u1ec7n ngay t\u1ea1i \u0111i\u1ec3m ch\u1ea1m
 * - K\u00e9o \u0111\u1ec3 \u0111i 8 h\u01b0\u1edbng (analog, m\u01b0\u1ee3t); th\u1ea3 ra → d\u1eebng
 * - Ch\u1ea1m nhanh kh\u00f4ng k\u00e9o (tap) → KH\u00d4NG ch\u1eb7n → canvas nh\u1eadn tap-to-move t\u1ef1 \u0111i
 * - N\u00fat b\u1ea5m (skill, n\u00fat tr\u00f2n, bottomnav) \u0111\u01b0\u1ee3c b\u1ecf qua
 * - Gi\u1eef nguy\u00ean giao di\u1ec7n v\u1edbi engine: Engine.joy = {dx, dy}
 */
function bindJoystick() {
  var joy = $("joystick"), knob = $("joy-knob"), game = $("screen-game");
  if (!joy || !knob || !game) return;
  var joyId = null, cx0 = 0, cy0 = 0, R = 60, KNOB = 44, DEAD = 0.15;
  function setJoy(dx, dy) {
    if (hasEngine()) Engine.joy = { dx: dx, dy: dy };
    knob.style.transform = "translate(" + (dx * KNOB) + "px," + (dy * KNOB) + "px)";
    joy.classList.toggle("active", !!(dx || dy));
  }
  function showJoy(x, y) {
    var w = window.innerWidth, h = window.innerHeight;
    var half = joy.offsetWidth / 2 || 75;
    R = half - 15;
    /* núm không tràn khỏi vòng ngoài */
    KNOB = Math.max(20, half - (knob.offsetWidth / 2 || 34) - 6);
    x = Math.max(half + 4, Math.min(w - half - 4, x));
    y = Math.max(half + 4, Math.min(h - half - 4, y));
    joy.style.left = (x - half) + "px";
    joy.style.top = (y - half) + "px";
    joy.style.bottom = "auto"; joy.style.right = "auto";
    joy.classList.add("show");
  }
  function hideJoy() {
    joy.classList.remove("show", "active");
    setJoy(0, 0);
    joyId = null;
  }
  function isButtonTarget(t) {
    return t && t.closest && (t.closest("button") || t.closest("#bottomnav") ||
      t.closest("#skillbar") || t.closest("#round-btns"));
  }
  function inJoyZone(x, y) {
    var w = window.innerWidth, h = window.innerHeight;
    return x < w * 0.45 && y > h * 0.28;
  }
  game.addEventListener("pointerdown", function (e) {
    if (joyId !== null) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (isButtonTarget(e.target)) return;
    if (!inJoyZone(e.clientX, e.clientY)) return;
    joyId = e.pointerId; cx0 = e.clientX; cy0 = e.clientY;
    showJoy(cx0, cy0);
    setJoy(0, 0);
  });
  game.addEventListener("pointermove", function (e) {
    if (e.pointerId !== joyId) return;
    var dx = (e.clientX - cx0) / R, dy = (e.clientY - cy0) / R;
    var len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; len = 1; }
    if (len < DEAD) { dx = 0; dy = 0; }
    setJoy(dx, dy);
    if (e.cancelable) e.preventDefault();
  }, { passive: false });
  function endJoy(e) { if (e.pointerId === joyId) hideJoy(); }
  game.addEventListener("pointerup", endJoy);
  game.addEventListener("pointercancel", endJoy);
}

/* ================= THANH SKILL 7 Ô ================= */
function skillbarSkills() {
  var out = [];
  try {
    if (typeof Skills === "undefined") return out;
    /* Ưu tiên ô do người chơi tự gán (tab Bí Tịch → "Gắn vào ô") */
    if (state.skillSlots && state.skillSlots.length) {
      var anySet = false;
      state.skillSlots.forEach(function (id) {
        if (id && Skills.hasLearned(state, id)) { out.push(id); anySet = true; }
      });
      if (anySet) return out.slice(0, 7);
    }
    var cls = (state.char && state.char.sect) || "kiem";
    var order = ["kiem_xuyen_van", "van_kiem_quy_tong", "kiem_cuong_ho_the", "kimdan_kiem_y",
                 "ngu_kiem_phi_hanh", "thien_kiem_vo_song"];
    if (cls === "phap") order = ["ngu_loi_oanh_dinh", "hoa_vu_luu_tinh", "linh_thuan", "kimdan_loi_phap",
                                 "thien_loi_dan", "cuu_thien_loi_nguc"];
    if (cls === "the") order = ["ba_vuong_quyen", "chan_dia_chuong", "kim_cuong_bat_hoai", "kimdan_the_quyen",
                                "la_han_quyen", "su_tu_hong", "kim_cang_hoa_than"];
    order.forEach(function (id) { if (Skills.hasLearned(state, id)) out.push(id); });
  } catch (e) {}
  return out.slice(0, 7);
}
/* Icon skill bằng ảnh pixel art (assets/skills/<id>.png); fallback emoji nếu ảnh lỗi */
function skillIconHtml(techId, emoji) {
  var fb = String(emoji || "✨").replace(/'/g, "&#39;");
  return '<img class="skill-img" src="assets/skills/' + techId + '.png" alt="" draggable="false"' +
    ' onerror="this.outerHTML=\'' + fb + '\'"/>';
}
function renderSkillbar() {
  var bar = $("skillbar");
  if (!bar || typeof Skills === "undefined") return;
  var ids = skillbarSkills();
  var h = "";
  for (var i = 0; i < 7; i++) {
    var id = ids[i];
    if (!id) {
      h += '<div class="skill-slot locked"><span class="skill-key">' + (i + 1) +
        '</span><span class="skill-icon">🔒</span></div>';
      continue;
    }
    var def = Skills.skillDef(id);
    var pw = Skills.skillPower(state, id);
    var dots = "";
    for (var d = 0; d < pw.level; d++) dots += "●";
    h += '<div class="skill-slot" data-skill="' + id + '" data-slot="' + i + '">' +
      '<span class="skill-key">' + (i + 1) + '</span>' +
      '<span class="skill-icon">' + skillIconHtml(id, def.icon) + '</span>' +
      '<span class="skill-name">' + esc(t(def.nameKey)) + '</span>' +
      '<span class="skill-lvldots">' + dots + '</span>' +
      '<span class="skill-cdnum"></span><span class="skill-cdsweep"></span>' +
      '<span class="skill-ready-dot"></span></div>';
  }
  bar.innerHTML = h;
  var slots = bar.querySelectorAll(".skill-slot[data-skill]");
  for (var s = 0; s < slots.length; s++) {
    (function (el) {
      var sid = el.getAttribute("data-skill");
      el.onclick = function () { doSkillSlot(+(el.getAttribute("data-slot"))); };
      bindSkillLongPress(el, sid);
      if (sid === _lastUsedSkill) el.classList.add("active-skill");
    })(slots[s]);
  }
}
function skillbarTick() {
  var bar = $("skillbar");
  if (!bar || screen !== "game" || typeof Skills === "undefined") return;
  if (!bar.children.length) renderSkillbar();
  var ids = skillbarSkills();
  var now = Date.now();
  var mp = (hasEngine() && Engine.player) ? Engine.player.mp : 0;
  for (var i = 0; i < 7; i++) {
    var el = bar.children[i];
    if (!el || !ids[i]) continue;
    var id = ids[i];
    var def = Skills.skillDef(id);
    var left = Skills.cdLeft(state, id, now);
    var cd = def.cd || 1;
    var cdnum = el.querySelector(".skill-cdnum");
    var sweep = el.querySelector(".skill-cdsweep");
    if (left > 0) {
      el.classList.add("oncd"); el.classList.remove("ready");
      if (cdnum) cdnum.textContent = Math.ceil(left);
      if (sweep) sweep.style.background =
        "conic-gradient(rgba(0,0,0,0.65) " + Math.min(360, left / cd * 360) + "deg, transparent 0deg)";
    } else {
      el.classList.remove("oncd"); el.classList.add("ready");
      if (cdnum) cdnum.textContent = "";
      if (sweep) sweep.style.background = "transparent";
    }
    try {
      var pw = Skills.skillPower(state, id);
      el.classList.toggle("no-mp", pw.mp > mp);
    } catch (e) {}
  }
}
function doSkillSlot(i) {
  var ids = skillbarSkills();
  var id = ids[i];
  if (!id || !hasEngine() || !Engine.useSkill) return;
  var r = Engine.useSkill(id);
  if (!r.ok) {
    if (r.reason === "het_mp") toast(t("skill_no_mp"));
    else if (r.reason === "dang_hoi") toast(t("skill_on_cd"));
    else if (r.reason === "no_target") toast(t("skill_no_target"));
    else if (r.reason === "realm_lock") toast(t("skill_not_learned"));
    sfx("fail");
  } else {
    markSkillActive(id);
    skillbarTick();
  }
}

/* ================= HÀNH TRANG (panel nhân vật 6 tab) ================= */
function charTab() { return (panelArg && panelArg.tab) || "equip"; }
function renderChar() {
  var h = '<div class="char-top">' +
    '<div class="char-stones">💎 ' + esc(t("hud_stones")) + " <b>" + formatTien(state.stones) + "</b></div>" +
    '<div class="char-bagslots">' + esc(t("bag_slots", { n: state.bag.length })) + "</div>" +
    '<button class="ht-plus" data-act="bag-info" title="+">+</button>' +
    '<button class="mini" data-act="open-gift">🎁 ' + esc(t("gift_redeem")) + "</button></div>";
  /* Thọ Nguyên — luôn hiện trên mọi tab (lifespan.js) */
  try {
    if (typeof Lifespan !== "undefined") {
      var _tnY = Lifespan.yearsLeft(state), _tnLow = Lifespan.isLow(state);
      h += '<div class="tn-strip' + (_tnLow ? " low" : "") + '">⏳ <b>' + _tnY + "</b> " + esc(t("tn_unit")) +
        '<span class="tn-bar"><span class="fill' + (_tnLow ? " low" : "") + '" style="width:' +
        Math.min(100, _tnY / Lifespan.barMax(state) * 100) + '%"></span></span>';
      if ((state.tnRebirths || 0) > 0) h += ' <span class="tn-rb">🔄×' + state.tnRebirths + "</span>";
      h += "</div>";
    }
  } catch (e) {}
  h += tabBtns([
    ["equip", t("char_tab_equip")], ["manual", t("char_tab_manual")],
    ["auto", t("char_tab_auto")], ["bt", t("char_tab_bt")],
    ["cult", t("bc_tab")],
    ["activity", t("char_tab_activity")], ["settings", t("char_tab_settings")],
  ], charTab(), "char-tab");
  var tb = charTab();
  if (tb === "equip") h += renderEquipTab();
  else if (tb === "manual") h += renderManualTab();
  else if (tb === "auto") h += renderAutoTab();
  else if (tb === "bt") { btStep = btStep || "needs"; h += renderBreakthrough(); }
  else if (tb === "cult") h += renderCultTab();
  else if (tb === "activity") h += renderActivityTab();
  else if (tb === "settings") h += renderSettings();
  return h;
}
/* ================= CĂN CỐT + THẦN THỨC (bodycult.js) ================= */
var bcProtectUse = true; /* Luyện yêu đan: mặc định dùng Hộ Mạch Đan bảo vệ */
var bcMedTimer = null;

function bcMat(txt, have, need) {
  return '<span class="' + (have >= need ? "bc-ok" : "bc-lack") + '">' + esc(txt) + "</span>";
}
function bcBar(lv, color) {
  return '<div class="bc-bar"><div class="bc-fill" style="width:' + Math.min(100, lv) + '%;background:' + color + '"></div></div>';
}
function bcStonesNeed(need) {
  return bcMat(need.stones + " 💎 (" + formatTien(need.stonesHave) + ")", need.stonesHave, need.stones);
}
function showBcMilestone(typ, ms) {
  if (!ms) return;
  try {
    sectFlash(ms.fx || "#ffd76a", t("bc_milestone_reached", {
      t: t(typ === "cancot" ? "bc_cancot" : "bc_thanthuc"), title: t(ms.titleKey)
    }));
    sfx("success");
  } catch (e) {}
}
function renderBcCancot() {
  var B = BodyCult, lv = B.lvOf(state, "cancot"), need = B.upgradeNeed(state, "cancot");
  var cb = B.cancotBonus(lv), ms = B.curMilestone("cancot", lv);
  var h = '<div class="bc-sec"><div class="bc-head">💪 ' + esc(t("bc_cancot")) +
    ' <span class="bc-lv">' + esc(t("bc_level", { n: lv })) + "</span></div>";
  h += bcBar(lv, "linear-gradient(90deg,#cd7f32,#ffd76a)");
  if (ms) h += '<div class="bc-ms">🏅 ' + esc(t("bc_milestone_now", { t: t(ms.titleKey) })) + "</div>";
  h += '<div class="bc-bonus">' +
    esc(t("bc_b_hp", { n: Math.round(cb.hpPct) })) + " · " +
    esc(t("bc_b_def", { n: cb.defFlat })) + " · " +
    esc(t("bc_b_bt", { n: (cb.btBonus * 100).toFixed(1) })) + "</div>";
  h += '<div class="bc-desc">' + esc(t("bc_cancot_desc")) + "</div>";
  if (need.maxed) {
    h += '<div class="bc-maxed">' + esc(t("bc_maxed")) + "</div>";
  } else {
    h += '<div class="bc-method"><div class="bc-mname">💊 ' + esc(t("bc_method_pill")) + ": " + esc(itemName(need.pillId)) + "</div>" +
      '<div class="bc-need">' + bcMat(itemName(need.pillId) + " x1 (" + need.pillHave + ")", need.pillHave, 1) +
      " + " + bcStonesNeed(need) + "</div>" +
      '<button class="mini" data-act="bc-upgrade" data-type="cancot" data-method="pill">' + esc(t("bc_upgrade")) + "</button></div>";
    h += '<div class="bc-method"><div class="bc-mname">💎 ' + esc(t("bc_method_stones", { mult: B.DEF.stoneCost.stonesOnlyMult })) + "</div>" +
      '<div class="bc-need">' + bcMat(need.stonesOnly + " 💎 (" + formatTien(need.stonesHave) + ")", need.stonesHave, need.stonesOnly) + "</div>" +
      '<button class="mini" data-act="bc-upgrade" data-type="cancot" data-method="stones">' + esc(t("bc_upgrade")) + "</button></div>";
    h += '<div class="bc-method"><div class="bc-mname">🛁 ' + esc(t("bc_method_bath")) + "</div>" +
      '<div class="bc-need">' + bcMat(itemName(need.herbId) + " x" + need.herbNeed + " (" + need.herbHave + ")", need.herbHave, need.herbNeed) +
      " + " + bcStonesNeed(need) + "</div>" +
      '<button class="mini" data-act="bc-upgrade" data-type="cancot" data-method="bath">' + esc(t("bc_upgrade")) + "</button></div>";
  }
  h += "</div>";
  return h;
}
function bcFmtTime(ms) {
  var s = Math.ceil(ms / 1000), m = Math.floor(s / 60);
  return m + ":" + ("0" + (s % 60)).slice(-2);
}
function renderBcThanthuc() {
  var B = BodyCult, lv = B.lvOf(state, "thanthuc"), need = B.upgradeNeed(state, "thanthuc");
  var tb = B.thanthucBonus(lv), ms = B.curMilestone("thanthuc", lv);
  var h = '<div class="bc-sec"><div class="bc-head">🔮 ' + esc(t("bc_thanthuc")) +
    ' <span class="bc-lv">' + esc(t("bc_level", { n: lv })) + "</span></div>";
  h += bcBar(lv, "linear-gradient(90deg,#5fa8ff,#e0c3ff)");
  if (ms) h += '<div class="bc-ms">🏅 ' + esc(t("bc_milestone_now", { t: t(ms.titleKey) })) + "</div>";
  h += '<div class="bc-bonus">' +
    esc(t("bc_b_range", { n: Math.round(tb.rangePct) })) + " · " +
    esc(t("bc_b_crit", { n: tb.critPct.toFixed(1) })) + " · " +
    esc(t("bc_b_pet", { n: tb.petSlots })) + " · " +
    esc(t("bc_b_resist", { n: Math.round(tb.resistPct) })) + "</div>";
  h += '<div class="bc-desc">' + esc(t("bc_thanthuc_desc")) + "</div>";
  if (need.maxed) {
    h += '<div class="bc-maxed">' + esc(t("bc_maxed")) + "</div>";
  } else {
    h += '<div class="bc-method"><div class="bc-mname">💊 ' + esc(t("bc_method_pill")) + ": " + esc(itemName(need.pillId)) + "</div>" +
      '<div class="bc-need">' + bcMat(itemName(need.pillId) + " x1 (" + need.pillHave + ")", need.pillHave, 1) +
      " + " + bcStonesNeed(need) + "</div>" +
      '<button class="mini" data-act="bc-upgrade" data-type="thanthuc" data-method="pill">' + esc(t("bc_upgrade")) + "</button></div>";
    h += '<div class="bc-method"><div class="bc-mname">💎 ' + esc(t("bc_method_stones", { mult: B.DEF.stoneCost.stonesOnlyMult })) + "</div>" +
      '<div class="bc-need">' + bcMat(need.stonesOnly + " 💎 (" + formatTien(need.stonesHave) + ")", need.stonesHave, need.stonesOnly) + "</div>" +
      '<button class="mini" data-act="bc-upgrade" data-type="thanthuc" data-method="stones">' + esc(t("bc_upgrade")) + "</button></div>";
    /* Thiền định */
    var left = B.meditateLeft(state);
    if (left > 0) {
      h += '<div class="bc-method"><div class="bc-mname">🧘 ' + esc(t("bc_meditating")) + "</div>" +
        '<div class="bc-need">' + esc(t("bc_meditate_left", { t: bcFmtTime(left) })) + "</div></div>";
    } else if (state.meditateUntil && left <= 0) {
      h += '<div class="bc-method"><div class="bc-mname">🧘 ' + esc(t("bc_method_meditate")) + "</div>" +
        '<button class="mini" data-act="bc-meditate-claim">' + esc(t("bc_meditate_claim")) + "</button></div>";
    } else {
      h += '<div class="bc-method"><div class="bc-mname">🧘 ' + esc(t("bc_method_meditate")) + "</div>" +
        '<button class="mini" data-act="bc-meditate-start">' + esc(t("bc_meditate_start")) + "</button></div>";
    }
  }
  h += "</div>";
  return h;
}
function renderBcDaily() {
  var B = BodyCult, tasks = B.dailyTasks(state);
  var h = '<div class="bc-sec"><div class="bc-head">📅 ' + esc(t("bc_daily_title")) + "</div>";
  var tk = tasks[0];
  h += '<div class="bc-method"><div class="bc-mname">' + esc(t("bc_daily_kill", { need: tk.need })) +
    ' <span class="bc-lv">' + esc(t("bc_daily_kill_prog", { prog: tk.prog, need: tk.need })) + "</span></div>";
  if (tk.claimed) h += '<div class="bc-need">' + esc(t("bc_claimed")) + "</div>";
  else h += '<button class="mini" data-act="bc-daily" data-id="kill"' + (tk.prog >= tk.need ? "" : " disabled") + ">" + esc(t("bc_claim")) + " (+" + B.DEF.daily.killRewardLv + " " + esc(t("bc_cancot")) + ")</button>";
  h += "</div>";
  var tm = tasks[1];
  h += '<div class="bc-method"><div class="bc-mname">🧘 ' + esc(t("bc_daily_med")) +
    ' <span class="bc-lv">' + tm.prog + "/" + tm.need + "</span></div>";
  if (tm.claimed) h += '<div class="bc-need">' + esc(t("bc_claimed")) + " (+1 " + esc(t("bc_thanthuc")) + ")</div>";
  else h += '<div class="bc-need">' + esc(t("bc_meditating")) + "</div>";
  h += "</div></div>";
  return h;
}
/* ---- Linh Căn khai mở + Phẩm chất căn cốt (taycot.js) ---- */
function renderTcRoots() {
  if (typeof TayCot === "undefined") return "";
  var roots = TayCot.rootsOf(state), pham = TayCot.cotPhamOf(state);
  var b = TayCot.cotBonus(state);
  var h = '<div class="bc-sec"><div class="bc-head">🌟 ' + esc(t("tc_roots_title")) + "</div>";
  if (pham) {
    var fx = "#9aa0a8", i;
    for (i = 0; i < TayCot.DEF.cotPham.length; i++)
      if (TayCot.DEF.cotPham[i].id === pham) fx = TayCot.DEF.cotPham[i].fx;
    h += '<div class="tc-pham" style="color:' + fx + '">🏵️ ' + esc(t("cot_pham_" + pham)) +
      ' <span class="tc-pham-bonus">(' + esc(t("tc_pham_bonus", {
        exp: Math.round((b.expMult - 1) * 100), bt: (b.btBonus * 100).toFixed(1),
      })) + ")</span></div>";
  } else {
    h += '<div class="tc-nopham">❔ ' + esc(t("tc_no_pham")) + "</div>";
  }
  h += '<div class="tc-roots-row">';
  for (var j = 0; j < roots.length; j++) h += lingenIconHtml(roots[j], 36);
  for (var k = roots.length; k < TayCot.DEF.maxRoots; k++)
    h += '<span class="tc-root-locked" title="' + esc(t("tc_root_locked")) + '">🔒</span>';
  h += '</div><div class="bc-desc">' + esc(t("tc_roots_desc", { n: roots.length })) + "</div></div>";
  return h;
}
function renderCultTab() {
  if (typeof BodyCult === "undefined") return "";
  return renderTcRoots() + renderBcCancot() + renderBcThanthuc() + renderBcDaily();
}
/* Luyện Khai Mạch Đan tại Đan Phòng (mở từ Luyện Đan Sư) */
function renderAlchemy() {
  var h = '<div class="item-name">⚗️ ' + esc(t("km_alchemy_title")) + "</div>";
  h += '<div class="bc-desc">' + esc(t("km_alchemy_desc")) + "</div>";
  TayCot.DEF.recipes.forEach(function (rc) {
    var c = TayCot.canCraft(state, rc.id);
    var n = c.need || TayCot.craftNeed(state, rc.id);
    h += '<div class="bc-method"><div class="bc-mname">' + pillIconHtml(rc.id, 28) + " " +
      esc(itemName(rc.id)) + "</div>";
    h += '<div class="bc-desc">' + esc(itemDesc(rc.id)) + "</div>";
    h += '<div class="bc-need">' +
      n.mats.map(function (m) { return bcMat(itemName(m.id) + " " + m.have + "/" + m.need, m.have, m.need); }).join(" · ") +
      " · " + bcMat("💎 " + n.stonesHave + "/" + n.stones, n.stonesHave, n.stones) + "</div>";
    h += '<button class="mini" data-act="alchemy-craft" data-recipe="' + rc.id + '"' +
      (c.ok ? "" : " disabled") + ">" + esc(t("km_craft")) + "</button></div>";
  });
  return h;
}
function doAlchemyCraft(recipeId) {
  var r = TayCot.doCraft(state, recipeId);
  if (!r.ok) {
    toast(t(r.reason === "stones" ? "km_lack_stones" : "km_lack_mats"));
    sfx("fail"); return;
  }
  toast(t("km_crafted", { n: itemName(r.id) }));
  sfx("success");
  try { if (typeof SectQuest !== "undefined" && SectQuest.onCraftPill) SectQuest.onCraftPill(state); } catch (e) {}
  saveGame(state); renderPanel();
}
/* Luyện Yêu Đan (mở từ Lão Rèn) */
function renderRefine() {
  var B = BodyCult;
  var h = '<div class="item-name">🔥 ' + esc(t("bc_refine_title")) + "</div>";
  var yb = state.yaodanElem || {};
  var elTxt = Object.keys(yb).filter(function (k) { return yb[k] > 0; })
    .map(function (k) { return t("bc_elem_" + k) + " x" + yb[k]; }).join(" · ");
  if (elTxt) h += '<div class="bc-desc">' + esc(elTxt) + "</div>";
  h += '<label class="bc-protect" data-act="bc-protect"><input type="checkbox"' + (bcProtectUse ? " checked" : "") + "> " +
    esc(t("bc_use_protect")) + " (" + B.countItem(state, "ho_mach_dan") + ")</label>";
  var found = false;
  (state.bag || []).forEach(function (it) {
    var d = itemDef(it.id);
    if (!d || d.kind !== "yaodan") return;
    found = true;
    var need = B.refineNeed(state, it.id);
    h += '<div class="bc-yd"><div class="bc-yd-name">' + itemIcon(it.id) + " " + esc(itemName(it.id)) + " x" + it.qty + "</div>" +
      '<div class="bc-need">' + esc(t("bc_refine_gain", { n: need.lvGain })) + " · " +
      esc(t("bc_refine_failrate", { n: Math.round(need.failRate * 100) })) + " · " +
      bcMat(need.stones + " 💎 (" + formatTien(state.stones || 0) + ")", state.stones || 0, need.stones) + "</div>" +
      '<button class="mini" data-act="bc-refine" data-id="' + it.id + '">' + esc(t("bc_refine_go")) + "</button></div>";
  });
  if (!found) h += '<div class="bc-desc">' + esc(t("bc_no_yaodan")) + "</div>";
  return h;
}
/* ================= BÃI QUÁI CÀY CẤP + ĐỔI MẢNH TRANG BỊ (GrindZone) ================= */
function gzRealmName(r) {
  try {
    if (typeof STAGES !== "undefined" && STAGES[r]) return STAGES[r].ten;
  } catch (e) {}
  return "?" + r;
}
function renderGrindZones() {
  if (typeof GrindZone === "undefined") return "";
  var myRealm = (state.char && state.char.realm) || 0;
  var h = '<div class="item-name">⚔️ ' + esc(t("dungeon_tab_grind")) + "</div>";
  h += '<div class="item-desc">' + esc(t("gz_tame_info")) + "</div>";
  var lastRealm = -1;
  GrindZone.GRIND_ZONES.forEach(function (z) {
    if (z.realm !== lastRealm) {
      lastRealm = z.realm;
      h += '<div class="dg-realm">' + esc(gzRealmName(z.realm)) + "</div>";
    }
    var can = GrindZone.canEnter(state, z);
    var mons = z.monsters.map(function (m) { return esc(monName(m)); }).join(", ");
    var bossTxt = z.boss ? " · 👹 " + esc(monName(z.boss)) : "";
    var spNames = z.tameSpecies.map(function (s) {
      var sp = (typeof petSpecies === "function") ? petSpecies(s) : null;
      return esc(sp ? sp.vi : s);
    }).join(", ");
    h += '<div class="row"><div><div class="item-name">' + esc(t(z.nameKey)) +
      (can ? "" : ' 🔒') + "</div>" +
      '<div class="item-desc">' + esc(t(z.descKey)) + "</div>" +
      '<div class="item-desc">👾 ' + mons + bossTxt + "</div>" +
      '<div class="item-desc">✨ ' + esc(t("gz_exp_hour", { n: (z.expGio || 0).toLocaleString("vi-VN") })) +
      " · 🥚 " + spNames + "</div>" +
      '<div class="item-desc">💎 ' + esc(t("gz_yaodan_frag", { n: z.yaodanTier, r: z.fragRealm })) + "</div>" +
      "</div>" +
      '<div class="row-btns"><button class="mini" data-act="gz-go" data-id="' + z.id + '"' +
      (can ? "" : " disabled") + ">" +
      esc(can ? t("gz_travel") : t("gz_need_realm", { n: gzRealmName(z.realm) })) +
      "</button></div></div>";
  });
  return h;
}
function doGrindTravel(zoneId) {
  if (typeof GrindZone === "undefined") return;
  var z = GrindZone.zone(zoneId);
  if (!z) return;
  if (!GrindZone.canEnter(state, z)) {
    toast(t("gz_need_realm", { n: gzRealmName(z.realm) })); sfx("fail"); return;
  }
  closePanel();
  curMapId = z.mapId;
  state.map.id = z.mapId;
  curSecretRealm = null;
  try { if (typeof Engine !== "undefined" && Engine.leaveSecretRealm) Engine.leaveSecretRealm(); } catch (e) {}
  try {
    if (typeof Engine !== "undefined" && Engine.enterMap) {
      Engine.enterMap(z.mapId);
      if (Engine.setPlayerPos) Engine.setPlayerPos(z.x, z.y);
    }
  } catch (e) {}
  var m = mapDef(z.mapId);
  try {
    state.mapAura = (typeof mapDaoMismatch === "function" && m && mapDaoMismatch(m)) ? { mapDao: m.dao } : null;
  } catch (e) {}
  saveGame(state);
  try { if (typeof music === "function") music("map"); } catch (e) {}
  if (m) toast(t(m.nameKey) + " — " + t(z.nameKey));
  refreshHUD();
  sfx("click");
}
/* Đổi mảnh trang bị ở Lão Rèn */
function renderFragx() {
  if (typeof GrindZone === "undefined") return "";
  var h = '<div class="item-name">🧩 ' + esc(t("npc_frag_exchange")) + "</div>";
  h += '<div class="item-desc">' + esc(t("fragx_desc")) + "</div>";
  var lastRealm = -1;
  GrindZone.FRAG_RECIPES.forEach(function (rc, i) {
    if (rc.realm !== lastRealm) {
      lastRealm = rc.realm;
      h += '<div class="dg-realm">' + esc(gzRealmName(rc.realm)) + " → " + esc(gzRealmName(rc.realm + 1)) + "</div>";
    }
    var have = (typeof countItem === "function") ? countItem(state, rc.frag) : 0;
    var ok = have >= rc.need;
    h += '<div class="row"><div><div class="item-name">' + esc(itemName(rc.frag)) +
      ' <span class="item-desc">x' + have + "/" + rc.need + "</span></div>" +
      '<div class="item-desc">→ ' + esc(itemName(rc.out)) + "</div></div>" +
      '<div class="row-btns"><button class="mini" data-act="fragx-do" data-i="' + i + '"' +
      (ok ? "" : " disabled") + ">" + esc(t("fragx_exchange")) + "</button></div></div>";
  });
  return h;
}
function doFragExchange(idx) {
  if (typeof GrindZone === "undefined") return;
  var r = GrindZone.doFragExchange(state, idx,
    function (st, id, q) { addItem(st, id, q); },
    function (st, id, q) { removeItem(st, id, q); },
    function (st, id) { return countItem(st, id); });
  if (!r.ok) {
    toast(t(r.reason === "not_enough" ? "fragx_not_enough" : "fragx_fail")); sfx("fail"); return;
  }
  toast(t("fragx_done", { name: itemName(r.out) }), "gold");
  sfx("success");
  saveGame(state);
  renderPanel();
  refreshHUD();
}
/* ================= CHI TIẾT TRANG BỊ + KHÍ LINH + LUYỆN HÓA ================= */
function equipDetailSlot() {
  return (panelArg && panelArg.slot) || "vukhi";
}
function renderEquipDetail() {
  var slot = equipDetailSlot();
  var id = (state.equip || {})[slot];
  if (!id) return "<p>" + esc(t("bag_empty")) + "</p>";
  var d = itemDef(id);
  if (!d) return "";
  var K = (typeof Khilinh !== "undefined") ? Khilinh : null;
  var h = '<div class="item-name">' + itemIcon(id) + " " + esc(itemName(id)) + "</div>";

  /* Cấp luyện hóa */
  var rlv = K ? K.refineLvOf(state, id) : 0;
  if (rlv > 0) h += '<div class="eq-skill">🔥 +' + rlv + "</div>";

  /* Chỉ số cơ bản (hiển thị sau nâng phẩm nếu có) */
  var effR = K ? K.effRealmOf(d, state, id) : K.realmOfItem(d);
  var disp = { atk: d.atk || 0, def: d.def || 0, hp: d.hp || 0, mp: d.mp || 0 };
  if (K && K.tierUpOf(state, id) > 0) {
    var _ss = K.stdStats(effR, d.slot);
    disp = { atk: _ss.atk || 0, def: _ss.def || 0, hp: _ss.hp || 0, mp: _ss.mp || 0 };
  }
  var statParts = [];
  if (disp.atk) statParts.push(t("stat_atk") + " " + disp.atk);
  if (disp.def) statParts.push(t("stat_def") + " " + disp.def);
  if (disp.hp) statParts.push(t("stat_hp") + " " + disp.hp);
  if (disp.mp) statParts.push(t("stat_mp") + " " + disp.mp);
  if (statParts.length) h += '<div class="item-desc">' + esc(statParts.join(" · ")) + "</div>";

  /* Dòng skill (xanh) */
  var sld = equipSkillDesc(d);
  if (sld) h += '<div class="item-desc">' + sld + "</div>";

  /* Yêu cầu cảnh giới */
  var reqR = K ? K.realmOfItem(d) : 1;
  var canEq = K ? K.canEquip(state, d) : true;
  h += '<div class="item-desc ' + (canEq ? "" : "manual-locked") + '">' +
    esc(t("eq_req_realm", { realm: stageName(reqR, 0) })) + "</div>";
  if (K && K.isOverlevel(state, d))
    h += '<div class="item-desc manual-locked">⚠️ ' + esc(t("eq_overlevel_warn")) + "</div>";

  /* ---- Luyện hóa ---- */
  if (K && K.canRefineItem(d)) {
    h += '<div class="item-name">🔥 ' + esc(t("refine_title")) + " +" + rlv + "/" + K.REFINE_MAX + "</div>";
    if (rlv >= K.REFINE_MAX) {
      h += '<div class="item-desc">' + esc(t("refine_max")) + "</div>";
      /* Nâng phẩm */
      var _tu = K.canTierUp(state, id, itemDef);
      if (_tu.ok) {
        var _tc = K.tierUpCost(state, id, itemDef);
        h += '<div class="item-desc">' + esc(t("tierup_title")) + ": " +
          esc(stageName(effR + 1, 0)) + " · " +
          esc(t("refine_need", { cost: _tc.stones + " 💎 + " + _tc.da_cuong_hoa + "💎" + t("it_da_cuong_hoa") + " + " + _tc.yaodan + " " + t("it_yaodan1") })) +
          '</div><button class="mini" data-act="eq-tierup">' + esc(t("tierup_do")) + "</button>";
      } else if (_tu.reason === "max_pham") {
        h += '<div class="item-desc">' + esc(t("tierup_max")) + "</div>";
      }
    } else {
      var _cost = K.refineCost(rlv);
      var _ch = Math.round(K.refineChance(rlv) * 100);
      var _costTxt = _cost.stones + " 💎";
      if (_cost.da_cuong_hoa > 0) _costTxt += " + " + _cost.da_cuong_hoa + " " + t("it_da_cuong_hoa");
      if (_cost.yaodan > 0) _costTxt += " + " + _cost.yaodan + " " + t("it_yaodan1");
      h += '<div class="item-desc">' + esc(t("refine_need", { cost: _costTxt })) + " · " +
        esc(t("refine_chance", { pct: _ch })) + "</div>" +
        '<button class="mini" data-act="eq-refine">' + esc(t("refine_do")) + " → +" + (rlv + 1) + "</button>";
    }
  }

  /* ---- Khí linh ---- */
  if (K && K.canAwaken(d)) {
    h += '<div class="item-name">✨ ' + esc(t("spirit_title")) + "</div>";
    var sp = K.spiritOf(state, id);
    if (!sp) {
      var _ch2 = Math.round(K.awakenChance(state, id) * 100);
      h += '<div class="item-desc">' + esc(t("spirit_none")) + " (" + _ch2 + "%)</div>" +
        '<button class="mini" data-act="spirit-awaken">' + esc(t("spirit_awaken")) + "</button> " +
        '<button class="mini paper" data-act="spirit-awaken-pill">' + esc(t("it_duong_linh_dan")) + " (100%)</button>" +
        '<div class="item-desc">' + esc(t("spirit_need_pill")) + "</div>";
    } else {
      h += '<div class="item-desc">👻 <b>' + esc(sp.name) + "</b> · " +
        esc(t("spirit_lv", { lv: sp.lv })) + " · " +
        esc(t("spirit_personality", { name: t("sp_" + sp.personality) })) + "</div>";
      h += '<div class="item-desc">' + esc(t("spirit_exp", { exp: sp.exp, max: K.expForLevel(sp.lv) })) + "</div>";
      if (sp.skills && sp.skills.length) {
        h += '<div class="item-desc">' + sp.skills.map(function (sk) {
          var _n = sk.skill;
          try {
            var _sd = Skills.skillDef(sk.skill);
            if (_sd && _sd.nameKey) _n = t(_sd.nameKey);
          } catch (e) {}
          return "🔷 " + esc(_n) + " +" + sk.lv;
        }).join(" · ") + "</div>";
      }
      /* Cho ăn: liệt kê yêu đan / đan dược trong túi */
      h += '<div class="item-name">🍖 ' + esc(t("spirit_feed")) + "</div>";
      var _foods = [];
      (state.bag || []).forEach(function (it) {
        var _fd = itemDef(it.id);
        if (!_fd) return;
        if (_fd.kind === "yaodan" || _fd.kind === "pill")
          _foods.push(it);
      });
      if (_foods.length) {
        h += _foods.slice(0, 6).map(function (it) {
          return '<button class="mini" data-act="spirit-feed" data-food="' + it.id + '">' +
            itemIcon(it.id) + " " + esc(itemName(it.id)) + " x" + it.qty + "</button>";
        }).join(" ");
      } else {
        h += '<div class="item-desc">(' + esc(t("bag_empty")) + ")</div>";
      }
      h += '<div style="margin-top:6px"><button class="mini" data-act="spirit-feed-stones">' +
        esc(t("spirit_feed_stones")) + " (100💎=10exp)</button> " +
        '<button class="mini" data-act="spirit-enlighten">' + esc(t("spirit_enlighten")) + "</button></div>";
    }
  }
  return h;
}
function equipDetailId() {
  var slot = equipDetailSlot();
  return (state.equip || {})[slot];
}
function doSpiritAwaken() {
  var id = equipDetailId();
  if (!id || typeof Khilinh === "undefined") return;
  var r = Khilinh.awaken(state, id, false);
  if (r.ok) { saveGame(state); sfx("success"); toast("✨ " + t("spirit_awakened", { name: r.spirit.name })); }
  else { sfx("fail"); toast(t("spirit_awaken_fail")); }
  renderPanel();
}
function doSpiritAwakenPill() {
  var id = equipDetailId();
  if (!id || typeof Khilinh === "undefined") return;
  if (countItem(state, "duong_linh_dan") < 1) { sfx("fail"); toast(t("spirit_need_pill")); return; }
  removeItem(state, "duong_linh_dan", 1);
  var r = Khilinh.awaken(state, id, true);
  if (r.ok) { saveGame(state); sfx("success"); toast("✨ " + t("spirit_awakened", { name: r.spirit.name })); }
  renderPanel();
}
function doSpiritFeed(foodId) {
  var id = equipDetailId();
  if (!id || typeof Khilinh === "undefined") return;
  var r = Khilinh.feed(state, id, foodId, itemDef(foodId), {
    removeItem: removeItem, countItem: countItem,
  });
  if (!r.ok) { sfx("fail"); return; }
  saveGame(state); sfx("success");
  if (r.levelUps > 0) toast(t("spirit_levelup", { lv: r.spirit.lv }));
  if (r.spirit.skills && r.levelUps > 0 && r.spirit.lv % 5 === 0) toast(t("spirit_new_skill"));
  renderPanel(); refreshHUD();
}
function doSpiritFeedStones() {
  var id = equipDetailId();
  if (!id || typeof Khilinh === "undefined") return;
  var amt = 1000;
  try {
    var _in = prompt(t("spirit_feed_amount"), "1000");
    if (_in == null) return;
    amt = Math.max(100, parseInt(_in, 10) || 0);
  } catch (e) {}
  var r = Khilinh.feedStones(state, id, amt);
  if (!r.ok) { sfx("fail"); toast(t("eq_cannot_equip").replace("{realm}", "")); return; }
  saveGame(state); sfx("success");
  if (r.levelUps > 0) toast(t("spirit_levelup", { lv: r.spirit.lv }));
  renderPanel(); refreshHUD();
}
function doSpiritEnlighten() {
  var id = equipDetailId();
  if (!id || typeof Khilinh === "undefined") return;
  var cost = 500 * (Khilinh.spiritOf(state, id) || { lv: 1 }).lv;
  var r = Khilinh.enlighten(state, id);
  if (!r.ok) {
    sfx("fail");
    toast(r.reason === "ngo_dao_that_bai" ? t("spirit_enlighten_fail", { cost: cost }) : t("spirit_need_pill"));
    if (r.reason === "ngo_dao_that_bai") { saveGame(state); renderPanel(); }
    return;
  }
  saveGame(state); sfx("success");
  var _n = r.skill.skill;
  try {
    var _sd = Skills.skillDef(r.skill.skill);
    if (_sd && _sd.nameKey) _n = t(_sd.nameKey);
  } catch (e) {}
  toast(t("spirit_enlighten_ok", { name: _n }));
  renderPanel(); refreshHUD();
}
function doEqRefine() {
  var id = equipDetailId();
  if (!id || typeof Khilinh === "undefined") return;
  var r = Khilinh.doRefine(state, id, itemDef, { removeItem: removeItem, countItem: countItem });
  if (!r.ok) {
    sfx("fail");
    toast(r.reason === "that_bai" ? t("refine_fail") : t("refine_need", { cost: "..." }));
    if (r.lost) { saveGame(state); renderPanel(); }
    return;
  }
  saveGame(state); sfx("success");
  toast(t("refine_ok", { lv: r.level }));
  renderPanel(); refreshHUD();
}
function doEqTierUp() {
  var id = equipDetailId();
  if (!id || typeof Khilinh === "undefined") return;
  var r = Khilinh.doTierUp(state, id, itemDef, { removeItem: removeItem, countItem: countItem });
  if (!r.ok) { sfx("fail"); return; }
  saveGame(state); sfx("success");
  toast(t("tierup_ok", { realm: stageName(r.newRealm, 0) }));
  renderPanel(); refreshHUD();
}
function doBcUpgrade(typ, method) {
  if (typeof BodyCult === "undefined") return;
  var r = BodyCult.doUpgrade(state, typ, method);
  if (!r.ok) { toast(t("bc_lack")); sfx("fail"); return; }
  saveGame(state); sfx("success"); refreshHUD();
  toast(t("bc_upgraded", { t: t(typ === "cancot" ? "bc_cancot" : "bc_thanthuc"), n: r.lv }));
  if (r.milestone) showBcMilestone(typ, r.milestone);
  renderPanel();
}
function doBcMeditateStart() {
  var r = BodyCult.meditateStart(state);
  if (!r.ok) { toast(t("bc_lack")); sfx("fail"); return; }
  saveGame(state); sfx("click"); renderPanel();
  if (bcMedTimer) clearInterval(bcMedTimer);
  bcMedTimer = setInterval(function () {
    try {
      if (typeof BodyCult === "undefined" || BodyCult.meditateLeft(state) <= 0 || panel !== "char" || charTab() !== "cult") {
        clearInterval(bcMedTimer); bcMedTimer = null; return;
      }
      renderPanel();
    } catch (e) { clearInterval(bcMedTimer); bcMedTimer = null; }
  }, 5000);
}
function doBcMeditateClaim() {
  var r = BodyCult.meditateClaim(state);
  if (!r.ok) { sfx("fail"); return; }
  try { BodyCult.dailyClaimMed(state); } catch (e) {} /* tính luôn nv thiền ngày */
  try { if (typeof SectQuest !== "undefined" && SectQuest.onMeditate) SectQuest.onMeditate(state); } catch (e) {}
  saveGame(state); sfx("success"); refreshHUD();
  toast(t("bc_upgraded", { t: t("bc_thanthuc"), n: r.lv }));
  if (r.milestone) showBcMilestone("thanthuc", r.milestone);
  renderPanel();
}
function doBcDaily(taskId) {
  var r = taskId === "kill" ? BodyCult.dailyClaim(state, "kill") : BodyCult.dailyClaimMed(state);
  if (!r.ok) { toast(t("bc_lack")); sfx("fail"); return; }
  saveGame(state); sfx("success"); refreshHUD();
  toast(t("bc_upgraded", { t: t(taskId === "kill" ? "bc_cancot" : "bc_thanthuc"), n: r.lv }));
  renderPanel();
}
function doBcRefine(id) {
  if (typeof BodyCult === "undefined") return;
  var r = BodyCult.doRefine(state, id, bcProtectUse);
  saveGame(state); refreshHUD();
  if (!r.ok) {
    if (r.reason === "refine_fail") toast(t("bc_refine_fail"));
    else toast(t("bc_lack"));
    sfx("fail"); renderPanel(); return;
  }
  sfx("success");
  toast(t("bc_refine_ok", { n: r.gain }));
  if (r.milestone) showBcMilestone("cancot", r.milestone);
  renderPanel();
}
/* Tab Trang Bị: 9 ô quanh nhân vật + chỉ số + 3 tab con túi */
function renderEquipTab() {
  var s = getStats();
  var c = state.char;
  var h = '<div class="equip-grid">';
  /* bố trí y hệt tutien2d: trái Vũ Khí/Giáp/Pháp Bội/Hành Ngoa,
     phải Phi Hành/Hư Ảnh/Y Phục/Linh Giới, trên đỉnh Pháp Bảo */
  var left = ["vukhi", "giap", "phapboi", "hanhngoa"];
  var right = ["phihanh", "huanh", "yphuc", "linhgioi"];
  h += '<div class="equip-col">' + left.map(equipSlot).join("") + "</div>";
  /* nhân vật ở giữa — đã gia nhập tông môn thì mặc đồ tông, chưa thì áo phàm nhân */
  var wpn = state.equip.vukhi ? itemDef(state.equip.vukhi) : null;
  var _g = (c.gender === "nu" ? "nu" : "nam");
  var _joined = (typeof Sect !== "undefined" && Sect.joinedSect) ? Sect.joinedSect(state) : null;
  var sprG = _joined
    ? "assets/sprs/sect_preview_" + _joined + "_" + _g + ".png"
    : "assets/sprs/mortal_preview_" + _g + ".png";
  var sprFb = "assets/sprs/sprs_player_" + (c.sect === "phap" ? "phap" : (c.sect === "the" ? "the" : "kiem")) + ".png";
  h += '<div class="char-sprite">' + equipSlot("phapbao") + '<img src="' + sprG + '" data-fb="' + sprFb + '" alt="" ' +
    'onerror="if(this.dataset.fb){this.src=this.dataset.fb;this.dataset.fb=\'\';}else{this.style.display=\'none\'}">' +
    (wpn ? '<div class="char-wpn">' + itemIcon(state.equip.vukhi) + "</div>" : "") +
    '<div class="char-name">' + esc(c.name) + "</div>" +
    '<div class="char-id">' + esc(t("char_id")) + ': <b>' + esc(c.charId || "") + "</b> " +
    '<button class="mini" data-act="copy-id">' + esc(t("char_copy")) + "</button></div>" +
    '<div class="char-id">' + esc(t("char_gender")) + ': ' + esc(t("gender_" + (c.gender || "nam"))) + "</div>" +
    '<div class="char-row-btns"><button class="mini" data-act="rename-open">✏️ ' + esc(t("panel_rename")) + "</button>" +
    '<button class="mini" data-act="gender-open">👫 ' + esc(t("panel_gender")) + "</button>" +
    '<button class="mini" data-act="friends-open">👥 ' + esc(t("nav_friends")) + "</button></div></div>";
  h += '<div class="equip-col">' + right.map(equipSlot).join("") + "</div>";
  h += "</div>";
  /* hàng chỉ số dạng lưới ô (giống tutien2d): Công/HP/MP/SP/BP/Kháng */
  var spPct = 100 + 5 * passiveLv("than_phap");
  h += '<div class="ht-stat-grid">' +
    htStat(t("stat_atk"), s.atk) +
    htStat("HP", "+" + s.maxHp) +
    htStat("MP", "+" + s.maxMp) +
    htStat(t("stat_sp"), "+" + spPct + "%") +
    htStat(t("stat_bp"), "5%") +
    htStat(t("stat_khang"), "+" + s.def) +
    "</div>";
  /* Thọ Nguyên: thiên phú + lịch sử chuyển thế (lifespan.js) */
  try {
    if (typeof Lifespan !== "undefined" && ((state.tnTalents || []).length || (state.tnHistory || []).length)) {
      h += '<div class="tn-detail"><div class="item-name">⏳ ' + esc(t("tn_title")) + "</div>";
      if ((state.tnTalents || []).length) {
        h += '<div class="item-desc">🌟 ' + state.tnTalents.map(function (tid) {
          var _td = Lifespan.talentDef(tid);
          return _td ? esc(t(_td.nameKey)) + " <span class=\"tn-talent-desc\">(" + esc(t(_td.descKey)) + ")</span>" : tid;
        }).join("<br>") + "</div>";
      }
      if ((state.tnHistory || []).length) {
        h += '<div class="item-desc"><b>' + esc(t("tn_history")) + ":</b><br>" +
          state.tnHistory.map(function (en, i) {
            var _td = Lifespan.talentDef(en.talent);
            return esc(t("tn_history_row", {
              i: i + 1,
              realm: esc(stageName(en.realm, 0)),
              kept: en.kept,
              talent: _td ? esc(t(_td.nameKey)) : en.talent
            }));
          }).join("<br>") + "</div>";
      } else {
        h += '<div class="item-desc">' + esc(t("tn_history_empty")) + "</div>";
      }
      h += "</div>";
    }
  } catch (e) {}
  /* 3 tab con túi */
  var sub = (panelArg && panelArg.sub) || "equip";
  h += tabBtns([
    ["equip", t("bag_sub_equip")], ["items", t("bag_sub_items")], ["dao", t("bag_sub_dao")],
  ], sub, "bag-sub");
  h += '<div class="item-grid">' + bagGrid(sub) + "</div>";
  return h;
  function passiveLv(pid) {
    try { return (typeof Skills !== "undefined") ? Skills.passiveLevel(state, pid) : 0; }
    catch (e) { return 0; }
  }
  function statLine(k, v, green) {
    return '<div class="stat-line">' + esc(k) + ': <b class="' + (green ? "bonus-xanh" : "") + '">' + esc(String(v)) + "</b></div>";
  }
  function htStat(k, v) {
    return '<div class="ht-stat"><span class="ht-stat-k">' + esc(k) +
      '</span><span class="ht-stat-v">' + esc(String(v)) + "</span></div>";
  }
  function equipSlot(slot) {
    var id = state.equip[slot];
    var d = id ? itemDef(id) : null;
    var tierCls = d ? ("tier-" + ["pham", "dia", "thien", "tien"][d.tier || 0]) : "";
    return '<button class="equip-slot ' + tierCls + '" data-act="equip-detail" data-slot="' + slot + '">' +
      '<span class="equip-icon">' + (d ? itemIcon(id) : "＋") + "</span>" +
      '<span class="equip-slot-name">' + esc(t("slot_" + slot)) + "</span></button>";
  }
}
/* Lưới ô đồ theo tab con */
function bagGrid(sub) {
  var items = state.bag.filter(function (it) {
    var d = itemDef(it.id);
    if (!d) return sub === "items";
    if (sub === "equip") return d.kind === "equip";
    if (sub === "dao") return d.kind === "manual" || d.kind === "pet_egg";
    return d.kind !== "equip" && d.kind !== "manual" && d.kind !== "pet_egg";
  });
  if (!items.length) return '<p class="sect-note">' + esc(t("bag_empty")) + "</p>";
  return items.map(function (it) {
    var d = itemDef(it.id);
    return '<button class="item-cell rarity-' + itemRarity(it.id) + '" data-act="bag-cell" data-id="' + esc(it.id) + '">' +
      '<span class="item-cell-icon">' + itemIcon(it.id) + "</span>" +
      '<span class="item-cell-qty">x' + it.qty + "</span>" +
      '<span class="item-cell-name">' + esc(itemName(it.id)) + "</span></button>";
  }).join("");
}
function doBagCell(itemId) {
  /* tìm trong túi và thao tác nhanh theo loại */
  var idx = -1;
  for (var i = 0; i < state.bag.length; i++) {
    if (state.bag[i].id === itemId && !state.bag[i].locked) { idx = i; break; }
  }
  if (idx < 0) return;
  var d = itemDef(itemId);
  if (!d) return;
  if (itemId === "the_doi_ten") { openPanel("rename"); return; }
  if (itemId === "the_doi_gioi_tinh") { genderSel = state.char.gender || "nam"; openPanel("gender"); return; }
  if (d.kind === "equip" && d.slot) doBagEquip(idx);
  else if (d.kind === "pill") doBagUse(idx);
  else if (d.kind === "manual") openPanel("manual", { bagIdx: idx });
  else if (d.kind === "pet_egg") openPanel("pet", { eggIdx: idx });
  else if (d.kind === "seed") openPanel("farm");
}
function doUnequip(slot) {
  var id = state.equip[slot];
  if (!id) return;
  state.equip[slot] = null;
  addItem(state, id, 1);
  saveGame(state);
  sfx("click");
  refreshHUD(); renderPanel();
}
/* Tab Bí Tịch: lưới bí tịch đã học */
/* renderManualTab cũ đã thay bằng bản rõ ràng ở cuối file */
/* Tab Tự Động Đánh */
function renderAutoTab() {
  var cfg = state.autoCfg || {};
  var h = "";
  h += '<div class="row"><div class="item-name">' + esc(t("auto_target")) + '</div><div class="row-btns">' +
    [["nearest", t("auto_target_nearest")], ["weakest", t("auto_target_weakest")], ["boss", t("auto_target_boss")]]
      .map(function (o) {
        return '<button class="mini' + (cfg.target === o[0] ? " on" : " paper") +
          '" data-act="auto-target" data-v="' + o[0] + '">' + esc(o[1]) + "</button>";
      }).join("") + "</div></div>";
  h += '<div class="row"><div class="item-name">' + esc(t("auto_use_skill")) + '</div><div class="row-btns">' +
    '<button class="mini' + (cfg.autoSkill !== false ? "" : " paper") + '" data-act="auto-skill">' +
    esc(cfg.autoSkill !== false ? t("set_on") : t("set_off")) + "</button></div></div>";
  h += '<div class="row"><div class="item-name">' + esc(t("auto_use_potion")) + '</div><div class="row-btns">' +
    '<button class="mini' + (cfg.autoPotion !== false ? "" : " paper") + '" data-act="auto-potion">' +
    esc(cfg.autoPotion !== false ? t("set_on") : t("set_off")) + "</button></div></div>";
  h += '<div class="row"><div class="item-name">' + esc(t("auto_potion_at", { n: cfg.potionAt || 30 })) +
    '</div><div class="row-btns">' +
    [[20, "20%"], [30, "30%"], [50, "50%"]].map(function (o) {
      return '<button class="mini' + ((cfg.potionAt || 30) === o[0] ? " on" : " paper") +
        '" data-act="auto-potion-at" data-v="' + o[0] + '">' + o[1] + "</button>";
    }).join("") + "</div></div>";
  h += '<div class="row"><div class="item-name">' + esc(t("auto_mp_at", { n: cfg.mpPotionAt || 30 })) +
    '</div><div class="row-btns">' +
    [[20, "20%"], [30, "30%"], [50, "50%"]].map(function (o) {
      return '<button class="mini' + ((cfg.mpPotionAt || 30) === o[0] ? " on" : " paper") +
        '" data-act="auto-mp-at" data-v="' + o[0] + '">' + o[1] + "</button>";
    }).join("") + "</div></div>";
  return h;
}
/* Tab Hoạt Động: điểm danh + nhiệm vụ tông */
function renderActivityTab() {
  var h = "";
  var done = state.flags.diemdanh === todayStr();
  h += '<div class="row"><div class="item-name">' + esc(t("activity_checkin")) + "</div>" +
    '<div class="row-btns"><button class="mini" data-act="do-checkin"' + (done ? " disabled" : "") + ">" +
    esc(done ? t("checkin_done") : t("checkin")) + "</button></div></div>";
  try {
    if (typeof Sect !== "undefined" && Sect.joinedSect(state)) {
      h += '<div class="item-name" style="margin-top:8px">' + esc(t("sect_tab_daily")) + "</div>";
      Sect.dailyProgress(state).forEach(function (q) {
        h += '<div class="row"><div><div class="item-name">' + esc(t(q.nameKey)) + "</div>" +
          '<div class="item-desc">' + q.prog + "/" + q.need + " · +" + q.contrib + " " + esc(t("sect_contrib")) + "</div></div>" +
          '<div class="row-btns">' + (q.claimed ? esc(t("sect_daily_done")) :
            (q.done ? '<button class="mini" data-act="sect-claim" data-id="' + q.id + '">' + esc(t("sect_daily_claim")) + "</button>"
                    : esc(t("q_incomplete")))) + "</div></div>";
      });
    }
  } catch (e) {}
  return h;
}

/* ================= TÔNG MÔN ================= */
function sectTab() { return (panelArg && panelArg.tab) || "info"; }
function renderSect() {
  if (typeof Sect === "undefined") return "";
  var h = tabBtns([
    ["info", t("sect_tab_info")], ["library", t("sect_tab_library")], ["daily", t("sect_tab_daily")],
  ], sectTab(), "sect-tab");
  var joined = Sect.joinedSect(state);
  var tb = sectTab();
  if (tb === "info") {
    if (!joined) {
      var _jg = (state && state.char && state.char.gender === "nu") ? "nu" : "nam";
      h += Object.keys(SECTS).map(function (sid) {
        var sc = SECTS[sid];
        /* Cửu U Ma Tông: chỉ Ma Đạo — hiện khóa nếu chưa phải ma đạo */
        var maLock = sc.dao === "ma" && (!state || state.dao !== "ma");
        var previewImg = "assets/sprs/sect_preview_" + sid + "_" + _jg + ".png";
        return '<div class="row sect-join-row"><div class="sect-join-preview"><img src="' + previewImg + '" alt="" loading="lazy"></div><div><div class="item-name">' + esc(t(sc.nameKey)) +
          (maLock ? ' <span class="dg-tag">😈 ' + esc(t("dao_ma")) + "</span>" : "") + "</div>" +
          '<div class="item-desc">' + esc(t(sc.descKey)) +
          (maLock ? " — " + esc(t("sect_need_ma")) : "") + "</div></div>" +
          '<div class="row-btns"><button class="mini" data-act="sect-join" data-sect="' + sid + '"' +
          (maLock ? " disabled" : "") + ">" +
          esc(t("sect_join")) + "</button></div></div>";
      }).join("");
    } else {
      var sc2 = SECTS[joined];
      var myRank = "ngoai_mon", myTitles = [];
      try {
        if (typeof SectQuest !== "undefined") {
          myRank = SectQuest.rank(state);
          myTitles = SectQuest.titles(state);
        }
      } catch (e) {}
      h += '<div class="item-name">' + esc(t(sc2.nameKey)) + " · " + esc(t("sect_joined")) + "</div>" +
        '<div class="item-desc">' + esc(t("sq_rank")) + ": <b>" + esc(t("sq_rank_" + myRank)) + "</b></div>" +
        '<div class="item-desc">' + esc(t("sect_contrib")) + ": <b>" + Sect.sectContrib(state) + "</b></div>";
      if (myRank === "ngoai_mon") {
        h += '<div class="sect-note">📜 ' + esc(t("sq_need_noimon")) + "</div>";
      }
      if (myTitles.length) {
        h += '<div class="item-desc">🏅 ' + esc(t("sq_titles")) + ": " +
          myTitles.map(function (x) { return esc(t(x.nameKey)); }).join(" · ") + "</div>";
      }
      h += '<div class="row"><div class="item-name">' + esc(t("sect_donate")) + " (100 💎 = 3 " + t("sect_contrib") + ")</div>" +
        '<div class="row-btns"><button class="mini" data-act="sect-donate" data-v="100">100 💎</button>' +
        '<button class="mini" data-act="sect-donate" data-v="500">500 💎</button>' +
        '<button class="mini" data-act="sect-donate" data-v="1000">1000 💎</button></div></div>';
    }
  } else if (tb === "library") {
    if (!joined) { h += '<p class="sect-note">' + esc(t("sect_join")) + "</p>"; }
    else {
      var realm = (state.char && state.char.realm) || 0;
      /* Hiện TẤT CẢ bí tịch của tông (kể cả độc quyền), lọc theo cảnh giới */
      var list = SECTS[joined].manuals.filter(function (m) {
        try {
          var mi = Skills.manualInfo(m.id);
          if (!mi) return true;
          return (mi.realm || 1) <= realm + 1;
        }
        catch (e) { return true; }
      });
      h += list.map(function (m) {
        return '<div class="row"><div><div class="item-name">' + itemIcon(m.id) + " " + esc(itemName(m.id)) + "</div>" +
          '<div class="item-desc">' + esc(itemDesc(m.id)) + "</div></div>" +
          '<div class="row-btns"><button class="mini" data-act="sect-buy" data-id="' + esc(m.id) + '">' +
          esc(t("sect_exchange")) + " (" + m.cost + " " + esc(t("sect_contrib")) + ")</button></div></div>";
      }).join("");
    }
  } else if (tb === "daily") {
    if (!joined) { h += '<p class="sect-note">' + esc(t("sect_join")) + "</p>"; }
    else {
      h += Sect.dailyProgress(state).map(function (q) {
        return '<div class="row"><div><div class="item-name">' + esc(t(q.nameKey)) + "</div>" +
          '<div class="item-desc">' + q.prog + "/" + q.need + " · +" + q.contrib + " " + esc(t("sect_contrib")) + "</div></div>" +
          '<div class="row-btns">' + (q.claimed ? esc(t("sect_daily_done")) :
            (q.done ? '<button class="mini" data-act="sect-claim" data-id="' + q.id + '">' + esc(t("sect_daily_claim")) + "</button>"
                    : esc(t("q_incomplete")))) + "</div></div>";
      }).join("");
    }
  }
  return h;
}
function doSectJoin(sectId) {
  if (typeof Sect === "undefined") return;
  var r = Sect.joinSect(state, sectId || (panelArg && panelArg.sect));
  if (r.ok) {
    saveGame(state); sfx("success");
    toast(t("sect_joined") + ": " + t(SECTS[r.joined || Sect.joinedSect(state)].nameKey));
    renderPanel();
  } else if (r.reason === "can_ma_dao") {
    toast(t("sect_need_ma")); sfx("fail");
  } else { toast(t("sect_joined")); sfx("fail"); }
}

/* ================= GACHA TẦM BẢO CÁC ================= */
function gachaTab() { return (panelArg && panelArg.tab) || "pham"; }
function renderGacha() {
  if (typeof Gacha === "undefined") return "";
  var tb = gachaTab();
  var h = tabBtns([
    ["pham", t("gacha_banner_pham")], ["dia", t("gacha_banner_dia")], ["thien", t("gacha_banner_thien")],
  ], tb, "gacha-tab");
  var b = Gacha.gachaBanner(tb);
  h += '<div class="gacha-banner banner-' + tb + '"><div class="gacha-banner-name">' + esc(t(b.nameKey)) + "</div>" +
    '<div class="gacha-sub">' + esc(t("gacha_sub")) + "</div></div>";
  /* tỷ lệ minh bạch */
  h += '<div class="gacha-rates"><b>' + esc(t("gacha_rates")) + ":</b> " +
    b.rates.map(function (r) { return esc(t("tier_" + r[1])) + " " + Math.round(r[0] * 100) + "%"; }).join(" · ") +
    (b.guarantee10 ? ' · <span class="gacha-guarantee">' + esc(t("gacha_guarantee", { n: t("tier_" + b.guarantee10) })) + "</span>" : "") +
    "</div>";
  if (tb === "thien") {
    var pity = (state.gachaPity && state.gachaPity.thien) || 0;
    h += '<div class="gacha-pity">' + (pity >= 30 ? esc(t("gacha_pity_ready"))
      : esc(t("gacha_pity", { n: pity }))) + "</div>";
  }
  h += '<div class="lingen-row">' +
    '<button class="btn btn-jade" data-act="gacha-pull" data-n="1">' + esc(t("gacha_pull1")) +
    " (" + formatTien(b.cost1) + " 💎)</button>" +
    '<button class="btn btn-jade" data-act="gacha-pull" data-n="10">' + esc(t("gacha_pull10")) +
    " (" + formatTien(b.cost10) + " 💎)</button></div>";
  /* kết quả quay gần nhất */
  var last = panelArg && panelArg.lastPulls;
  if (last && last.length) {
    h += '<div class="gacha-cards">' + last.map(function (p) {
      var mi = null;
      try { mi = Skills.manualInfo(p.manualId); } catch (e) {}
      var tierCls = "tier-" + ["pham", "dia", "thien"][p.tier];
      var locked = mi && !Skills.manualRealmOk(state, p.manualId);
      return '<div class="gacha-card flip ' + tierCls + (p.tier === 2 ? " thien" : "") + '">' +
        '<span class="gacha-card-icon">' + itemIcon(p.manualId) + "</span>" +
        '<span class="manual-name">' + esc(itemName(p.manualId)) + "</span>" +
        '<span class="manual-type">' + esc(t("tier_" + p.tier)) + "</span>" +
        (locked ? '<span class="manual-locked">🔒</span>' : "") +
        (p.res && p.res.fragments ? '<span class="item-desc">→ ' + p.res.got + " " + esc(t("frag_name")) + "</span>" : "") +
        "</div>";
    }).join("") + "</div>";
  }
  /* ghép mảnh */
  h += '<div class="item-name" style="margin-top:8px">' + esc(t("gacha_merge")) +
    " (" + (state.fragments || 0) + " " + esc(t("frag_name")) + ")</div>";
  h += Gacha.GACHA_MERGE.map(function (mg) {
    return '<button class="mini" data-act="gacha-merge" data-v="' + mg.tier + '">' +
      mg.frags + " 🧩 → " + esc(t("tier_" + mg.tier)) + "</button>";
  }).join(" ");
  /* lịch sử */
  var hist = state.gachaHistory || [];
  if (hist.length) {
    h += '<div class="item-name" style="margin-top:8px">' + esc(t("gacha_history")) + "</div>" +
      hist.map(function (gh) {
        return '<div class="row"><div class="item-name">' + itemIcon(gh.manualId) + " " + esc(itemName(gh.manualId)) +
          ' <span class="item-desc">' + esc(t("tier_" + gh.tier)) + "</span></div></div>";
      }).join("");
  }
  return h;
}
function doGachaPull(n) {
  if (typeof Gacha === "undefined") return;
  var tb = gachaTab();
  var r = Gacha.rollGacha(state, tb, n);
  if (!r.ok) {
    if (r.reason === "no_stone") toast(t("gacha_no_stone"));
    sfx("fail"); return;
  }
  sfx("success");
  panelArg = { tab: tb, lastPulls: r.pulls };
  refreshHUD(); renderPanel();
}

/* ================= BÍ TỊCH: HỌC / NÂNG CẤP ================= */
function renderManual() {
  if (typeof Skills === "undefined") return "";
  var it = state.bag[(panelArg && panelArg.bagIdx) || 0];
  if (!it) return "";
  var manualId = it.id;
  var mi = Skills.manualInfo(manualId);
  if (!mi) return "";
  var techId = mi.skill || mi.passive;
  var isP = !!mi.passive;
  var def = isP ? Skills.passiveDef(techId) : Skills.skillDef(techId);
  var lv = Skills.manualLevel(state, techId);
  var learned = lv > 0;
  var max = Skills.manualMaxLevel(mi.tier);
  var realmOk = Skills.manualRealmOk(state, manualId);
  var tierCls = "tier-" + ["pham", "dia", "thien"][mi.tier];
  var h = '<div class="manual-card ' + tierCls + '">' +
    '<span class="manual-icon">' + itemIcon(manualId) + " " + (def ? skillIconHtml(techId, def.icon) : "") + "</span>" +
    '<div class="item-name">' + esc(itemName(manualId)) + "</div>" +
    '<div class="item-desc">' + esc(t(isP ? "manual_type_passive" : "manual_type_active")) + " · " +
    esc(t("tier_" + mi.tier)) + (learned ? " · " + esc(t("manual_level", { n: lv })) + "/" + max : "") + "</div>" +
    '<div class="item-desc">' + esc(itemDesc(manualId)) + "</div>" +
    (def && def.descKey ? '<div class="item-desc">' + esc(t(def.descKey)) + "</div>" : "") +
    "</div>";
  if (!realmOk) {
    h += '<p class="sect-note">🔒 ' + esc(t("manual_locked_realm", { realm: stageName(mi.realm, 0) })) + "</p>";
    return h;
  }
  if (!learned) {
    var cost = mi.learnCost || 0;
    h += '<button class="btn btn-jade big" style="width:100%" data-act="manual-learn">' +
      esc(t("manual_learn")) + (cost ? " (" + formatTien(cost) + " 💎)" : "") + "</button>";
    return h;
  }
  /* preview trước/sau */
  if (!isP) {
    var pw = Skills.skillPower(state, techId);
    var cfg = Skills.tierUpCfg(mi.tier);
    var nextMult = pw.mult / (1 + cfg.per * (lv - 1)) * (1 + cfg.per * lv);
    h += '<div class="item-desc">' + esc(t("upg_preview", { a: Math.round(pw.mult * 100) + "%", b: Math.round(nextMult * 100) + "%" })) + "</div>";
  } else {
    h += '<div class="item-desc">' + esc(t("upg_preview", { a: "Lv" + lv, b: "Lv" + (lv + 1) })) + "</div>";
  }
  /* mốc đặc biệt */
  var ms = (Skills.TIER_MILESTONE[mi.tier] || {});
  Object.keys(ms).forEach(function (mlv) {
    if (lv < +mlv) h += '<div class="item-desc">🎯 ' + esc(t("upg_milestone", { n: mlv, eff: t(ms[mlv].msKey) })) + "</div>";
  });
  if (lv >= max) {
    h += '<p class="sect-note">' + esc(t("upg_maxed")) + "</p>";
    return h;
  }
  /* cách (a): bí tịch trùng */
  var dup = 0;
  state.bag.forEach(function (bit, bi) {
    if (bit.id === manualId && bi !== panelArg.bagIdx) dup += bit.qty;
  });
  if (dup > 0) {
    h += '<button class="btn btn-jade big" style="width:100%;margin-bottom:8px" data-act="manual-upg-dup">' +
      esc(t("upg_by_dup")) + " (x" + dup + ")</button>";
  }
  /* cách (b): mảnh + Linh Thạch */
  var cost2 = Skills.upgradeCost(mi.tier, lv);
  h += '<button class="btn btn-paper big" style="width:100%" data-act="manual-upg-frag">' +
    esc(t("upg_by_frag")) + " (" + cost2.frags + " 🧩 + " + formatTien(cost2.stones) + " 💎)</button>";
  return h;
}
function doManualLearn() {
  var it = state.bag[(panelArg && panelArg.bagIdx) || 0];
  if (!it) return;
  var r = Skills.learnManual(state, it.id);
  if (!r.ok) {
    if (r.reason === "thieu_linh_thach") toast(t("shop_no_stone"));
    else if (r.reason === "realm_lock") toast(t("manual_locked_realm", { realm: stageName(r.need, 0) }));
    else if (r.reason === "sai_tong_mon") toast(t("manual_wrong_sect"));
    else if (r.reason === "khong_hop_dao") toast(t("manual_wrong_dao"));
    else if (r.reason === "thieu_uy_vong") toast(t("manual_low_contrib", { n: r.need }));
    sfx("fail"); return;
  }
  saveGame(state); sfx("success");
  toast(r.learned ? t("manual_learned") : t("upg_done", { n: r.level }));
  refreshHUD(); renderSkillbar(); openPanel("manual", { bagIdx: panelArg.bagIdx });
}
function doManualUpgDup() {
  var it = state.bag[(panelArg && panelArg.bagIdx) || 0];
  if (!it) return;
  /* tìm 1 bí tịch trùng khác để làm nguyên liệu */
  var di = -1;
  for (var i = 0; i < state.bag.length; i++) {
    if (state.bag[i].id === it.id && i !== panelArg.bagIdx) { di = i; break; }
  }
  if (di < 0) { toast(t("bag_empty")); return; }
  /* tạm đổi bagIdx sang bản trùng rồi gọi learnManual (nó tự lên cấp) */
  var r = Skills.learnManual(state, it.id);
  if (!r.ok) { sfx("fail"); return; }
  saveGame(state); sfx("success");
  toast(r.fragments ? t("frag_name") + " +" + r.got : t("upg_done", { n: r.level }));
  refreshHUD(); renderSkillbar(); renderPanel();
}
function doManualUpgFrag() {
  var it = state.bag[(panelArg && panelArg.bagIdx) || 0];
  if (!it) return;
  var r = Skills.upgradeManual(state, it.id);
  if (!r.ok) {
    if (r.reason === "no_frag") toast(t("gacha_no_frag"));
    else if (r.reason === "thieu_linh_thach") toast(t("shop_no_stone"));
    else if (r.reason === "upg_maxed") toast(t("upg_maxed"));
    sfx("fail"); return;
  }
  saveGame(state); sfx("success");
  toast(t("upg_done", { n: r.level }));
  refreshHUD(); renderSkillbar(); renderPanel();
}

/* ================= KỲ NGỘ ================= */
var _encCd = 0;
function encounterTick() {
  if (screen !== "game" || panel) return;
  if (typeof Encounter === "undefined") return;
  _encCd--;
  if (_encCd > 0) return;
  _encCd = 45 + Math.floor(Math.random() * 45); /* mỗi 45-90s thử 1 lần */
  if (Math.random() > 0.35) return;
  var cls = (state.char && state.char.sect) || "kiem";
  var enc = null;
  try { enc = Encounter.rollEncounter(cls, curMapId); } catch (e) {}
  if (enc) openPanel("encounter", { enc: enc });
}
function renderEncounter() {
  var enc = panelArg && panelArg.enc;
  if (!enc) return "";
  var h = '<div class="encounter-modal"><div class="item-name">' + esc(t("kngo_title")) + ": " +
    esc(t(enc.nameKey)) + "</div>" +
    '<div class="item-desc" style="margin:8px 0">' + esc(t(enc.descKey)) + "</div>" +
    '<div class="item-desc">' + esc(t("kngo_choose")) + ":</div>";
  enc.choices.forEach(function (ch) {
    h += '<button class="btn btn-paper big" style="width:100%;margin-bottom:8px" data-act="enc-choice" data-id="' +
      esc(ch.id) + '">' + esc(t(ch.labelKey)) + "</button>";
  });
  h += "</div>";
  return h;
}
function doEncounterChoice(choiceId) {
  var enc = panelArg && panelArg.enc;
  if (!enc) return;
  var r = Encounter.applyChoice(state, enc.id, choiceId);
  if (r.ok && r.res) {
    if (r.res.failed) toast(t("kngo_risk_fail"));
    else {
      if (r.res.manual) {
        var r2 = null;
        try { r2 = Skills.obtainManual(state, r.res.manual); } catch (e) {}
        toast(t("kngo_reward", { name: itemName(r.res.manual) }) +
          (r2 && r2.leveled ? " (" + t("upg_done", { n: r2.level }) + ")" : ""));
      }
      if (r.res.stones) { state.stones += 0; toast("+" + formatTien(r.res.stones) + " 💎"); }
      if (r.res.exp) { var g = gainExp(state, r.res.exp); if (g.leveled) toast(t("lvlup_msg")); }
    }
    saveGame(state); refreshHUD();
  }
  closePanel();
}

/* ================= LINH THÚ ================= */
function renderPet() {
  if (typeof Pet === "undefined") return "";
  var h = "";
  var realm = (state.char && state.char.realm) || 0;
  if (realm < 2) {
    return '<p class="sect-note">🔒 ' + esc(t("manual_locked_realm", { realm: stageName(2, 0) })) + "</p>";
  }
  var pet = state.pet;
  if (state.petHatch) {
    var left = Math.max(0, state.petHatch.readyAt - Date.now());
    h += '<div class="item-name">' + esc(t("pet_hatch_wait")) + ": " + Math.ceil(left / 60000) + "′</div>";
    return h;
  }
  if (!pet) {
    h += '<p class="sect-note">' + esc(t("pet_no_pet")) + "</p>";
    var eggIdx = (panelArg && panelArg.eggIdx != null) ? panelArg.eggIdx : -1;
    if (eggIdx < 0) {
      for (var i = 0; i < state.bag.length; i++) {
        var d = itemDef(state.bag[i].id);
        if (d && d.kind === "pet_egg") { eggIdx = i; break; }
      }
    }
    if (eggIdx >= 0) {
      var it = state.bag[eggIdx];
      var pv = Pet.eggPreview(it.id);
      if (pv) {
        var tc = Pet.petTier(pv.tier).color;
        h += '<div class="pet-egg egg-' + pv.tier + '"><div class="item-name">' + esc(itemName(it.id)) + "</div>" +
          '<div class="item-desc">' + esc(t("pet_tier_" + pv.tier)) + " · " + esc(t("pet_atk")) + " " + pv.stats.atk +
          " · HP " + pv.stats.maxHp + "</div>" +
          '<button class="mini" data-act="egg-hatch-now" data-i="' + eggIdx + '">' +
          esc(t("pet_hatch_now", { n: formatTien(pv.hatchCost) })) + "</button> " +
          '<button class="mini paper" data-act="egg-hatch-wait" data-i="' + eggIdx + '">' +
          esc(t("pet_hatch")) + " (30′)</button></div>";
      }
    }
    return h;
  }
  var st = Pet.petStats(pet);
  var tc2 = Pet.petTier(pet.tier).color;
  h += '<div class="pet-panel"><div class="pet-aura" style="border-color:' + tc2 + '">' +
    '<img src="assets/sprs/sprs_pet_linh_thu.png" alt="" onerror="this.style.display=\'none\'"></div>' +
    '<div class="item-name">' + esc(pet.name || t("pet_title")) + " · " + esc(t("pet_tier_" + pet.tier)) + "</div>" +
    '<div class="item-desc">' + esc(t("pet_level")) + " " + pet.level + " · " + esc(t("pet_atk")) + " " + st.atk +
    " · HP " + Math.ceil(pet.hp == null ? st.maxHp : pet.hp) + "/" + st.maxHp + "</div>";
  var rest = Pet.petRestLeft(state);
  if (rest > 0) h += '<div class="item-desc">😴 ' + esc(t("pet_rest", { n: Math.ceil(rest / 60000) + "′" })) + "</div>";
  h += '<div class="item-desc">✨ ' + esc(t("pet_pickup_note")) + "</div>";
  h += '<div class="lingen-row"><button class="mini" data-act="pet-feed">' + esc(t("pet_feed")) +
    " (" + formatTien(pet.level * 50) + " 💎)</button>" +
    '<button class="mini paper" data-act="pet-rename">' + esc(t("pet_rename")) + "</button></div>";
  h += '<div class="lingen-row"><input id="pet-name" class="fld-input" maxlength="12" placeholder="' +
    esc(t("pet_rename")) + '"><button class="mini" data-act="pet-rename-do">' + esc(t("ui_use")) + "</button></div>";
  h += "</div>";
  return h;
}
function doPetFeed() {
  if (typeof Pet === "undefined" || !Pet.feedPet) { toast(t("coming_soon")); return; }
  var r = Pet.feedPet(state);
  if (!r.ok) {
    if (r.reason === "no_pet") toast(t("pet_no_pet"));
    else if (r.reason === "max_level") toast(t("pet_max_level"));
    else toast(t("shop_no_stone"));
    sfx("fail"); return;
  }
  try { if (typeof SectQuest !== "undefined" && SectQuest.onFeedPet) SectQuest.onFeedPet(state); } catch (e) {}
  saveGame(state); sfx("success");
  toast(t("pet_fed"));
  refreshHUD(); renderPanel();
}
function doEggHatch(idx, instant) {
  var it = state.bag[idx];
  if (!it) return;
  var r = Pet.startHatch(state, it.id, instant);
  if (!r.ok) {
    if (r.reason === "no_stone") toast(t("shop_no_stone"));
    else if (r.reason === "realm_lock") toast(t("manual_locked_realm", { realm: stageName(2, 0) }));
    else if (r.reason === "has_pet") toast(t("pet_title"));
    sfx("fail"); return;
  }
  saveGame(state); sfx("success");
  toast(r.waiting ? t("pet_hatch_wait") : t("pet_hatched"));
  refreshHUD(); renderPanel();
}

/* ================= LINH ĐIỀN ================= */
function renderFarm() {
  if (typeof Farm === "undefined") return "";
  var now = Date.now();
  var h = "";
  var f = { unlocked: 6, plots: [] };
  try {
    state.farm = state.farm || { unlocked: 6, plots: [] };
    while (state.farm.plots.length < state.farm.unlocked)
      state.farm.plots.push({ seed: null, plantedAt: 0, readyAt: 0, needTill: false });
    f = state.farm;
  } catch (e) {}
  h += '<div class="item-grid">';
  for (var i = 0; i < f.unlocked; i++) {
    var st = Farm.plotStatus(state, i, now);
    var label = "", act = "", cls = "plot-" + st.phase;
    if (st.phase === "empty") { label = "🟫"; act = "farm-plant"; }
    else if (st.phase === "growing") { label = "🌱 " + st.pct + "%"; act = "farm-speedup"; }
    else if (st.phase === "ready") { label = "🌾 ✓"; act = "farm-harvest"; }
    else if (st.phase === "need_till") { label = "🟤"; act = "farm-till"; }
    h += '<button class="plot-cell ' + cls + '" data-act="' + act + '" data-i="' + i + '">' +
      '<span class="plot-icon">' + label + "</span></button>";
  }
  h += "</div>";
  if (f.unlocked < Farm.FARM_MAX_PLOTS) {
    var cost = Farm.plotUnlockCost(f.unlocked);
    h += '<button class="btn btn-jade big" style="width:100%;margin-top:8px" data-act="farm-unlock">' +
      esc(t("farm_unlock")) + " (" + formatTien(cost) + " 💎)</button>";
  }
  /* hạt giống trong túi */
  var seeds = state.bag.filter(function (it) {
    var d = itemDef(it.id); return d && d.kind === "seed";
  });
  if (seeds.length) {
    h += '<div class="item-name" style="margin-top:8px">' + esc(t("bag_sub_items")) + "</div>" +
      seeds.map(function (sd) {
        return '<div class="row"><div class="item-name">' + itemIcon(sd.id) + " " + esc(itemName(sd.id)) +
          ' <span class="item-qty">x' + sd.qty + "</span></div></div>";
      }).join("");
  }
  return h;
}

/* ================= CHỢ VẠN TIÊN CÁC ================= */
function marketTab() { return (panelArg && panelArg.tab) || "buy"; }
function renderMarket() {
  if (typeof Market === "undefined") return "";
  try { Market.seedDemoListings(state); } catch (e) {}
  var tb = marketTab();
  var h = tabBtns([
    ["buy", t("shop_tab_buy")], ["sell", t("shop_tab_sell")], ["hist", t("gacha_history")],
  ], tb, "market-tab");
  if (tb === "buy") {
    h += '<div class="lingen-row"><input id="market-q" class="fld-input" style="flex:1" placeholder="' +
      esc(t("shop_tab_buy")) + '...">' +
      '<button class="mini" data-act="market-search">' + esc(t("ui_use")) + "</button></div>";
    var q = (panelArg && panelArg.q) || "";
    var list = Market.searchListings(state, q);
    if (!list.length) h += '<p class="sect-note">' + esc(t("bag_empty")) + "</p>";
    h += list.map(function (l) {
      return '<div class="row"><div><div class="item-name">' + itemIcon(l.itemId) + " " + esc(itemName(l.itemId)) +
        ' <span class="item-qty">x' + l.qty + "</span></div>" +
        '<div class="item-desc">' + esc(l.seller) + ' · <span class="shop-price">' + formatTien(l.price) + " 💎</span></div></div>" +
        '<div class="row-btns">' + (l.mine
          ? '<button class="mini paper" data-act="market-cancel" data-id="' + l.id + '">' + esc(t("ui_close")) + "</button>"
          : '<button class="mini" data-act="market-buy" data-id="' + l.id + '">' + esc(t("shop_buy")) + "</button>") +
        "</div></div>";
    }).join("");
  } else if (tb === "sell") {
    h += '<div class="item-desc">' + esc(t("market_tax", { n: 5 })) + "</div>";
    h += state.bag.map(function (it, i) {
      var d = itemDef(it.id);
      if (!d || it.locked) return "";
      var sug = 100;
      try { sug = Market.suggestPrice(it.id); } catch (e) {}
      return '<div class="row"><div><div class="item-name">' + itemIcon(it.id) + " " + esc(itemName(it.id)) +
        ' <span class="item-qty">x' + it.qty + "</span></div>" +
        '<div class="item-desc">' + esc(t("market_suggest", { n: formatTien(sug) })) + "</div></div>" +
        '<div class="row-btns"><input class="fld-input" style="width:90px" id="mk-price-' + i + '" value="' + sug + '">' +
        '<button class="mini" data-act="market-list" data-i="' + i + '">' + esc(t("market_list")) + "</button></div></div>";
    }).join("");
  } else {
    var hist = ((state.market || {}).history) || [];
    if (!hist.length) h += '<p class="sect-note">' + esc(t("bag_empty")) + "</p>";
    h += hist.map(function (hh) {
      return '<div class="row"><div class="item-name">' + itemIcon(hh.itemId) + " " + esc(itemName(hh.itemId)) +
        ' <span class="item-qty">x' + hh.qty + "</span></div>" +
        '<div class="item-desc">' + formatTien(hh.price) + " 💎" +
        (hh.sold ? " → +" + formatTien(hh.net) : "") + "</div></div>";
    }).join("");
  }
  return h;
}

/* ================= QUÁN TRỌ ================= */
function doInnRest() {
  var cost = 50;
  if (state.stones < cost) { toast(t("npc_inn_no_stone")); sfx("fail"); return; }
  state.stones -= cost;
  var s = getStats();
  state.char.hp = s.maxHp; state.char.mp = s.maxMp;
  if (hasEngine() && Engine.player) {
    Engine.player.hp = s.maxHp; Engine.player.mp = s.maxMp; Engine.player.focus = 100;
  }
  saveGame(state); sfx("success");
  toast(t("npc_inn_rested"));
  refreshHUD(); renderPanel();
}
function doInnRumor() {
  /* gợi ý kỳ ngộ theo hệ phái */
  var rumor = t("npc_rumor_none");
  try {
    if (typeof Encounter !== "undefined") {
      var cls = (state.char && state.char.sect) || "kiem";
      var enc = Encounter.rollEncounter(cls, curMapId);
      if (enc) rumor = t("npc_rumor_hint", { name: t(enc.nameKey) });
    }
  } catch (e) {}
  toast(rumor);
}

/* ================= CÀI ĐẶT: MÀN HÌNH ================= */
function renderDisplayRows() {
  var d = (state.settings && state.settings.display) || {};
  var h = '<div class="row"><div class="item-name">' + esc(t("set_display")) + "</div></div>";
  h += '<div class="row"><div class="item-name">' + esc(t("set_fullscreen")) + '</div><div class="row-btns">' +
    '<button class="mini' + (d.fullscreen ? "" : " paper") + '" data-act="set-fullscreen">' +
    esc(d.fullscreen ? t("set_on") : t("set_off")) + "</button></div></div>";
  h += '<div class="row"><div class="item-name">' + esc(t("set_orientation")) + '</div><div class="row-btns">' +
    [["auto", t("orient_auto")], ["portrait", t("orient_portrait")], ["landscape", t("orient_landscape")]]
      .map(function (o) {
        return '<button class="mini' + (d.orientation === o[0] ? " on" : " paper") +
          '" data-act="set-orient" data-v="' + o[0] + '">' + esc(o[1]) + "</button>";
      }).join("") + "</div></div>";
  return h;
}

/* ================= XEM TRANG BỊ — chạm vào tên =================
 * Mở panel xem trang bị + túi đồ của 1 người chơi.
 * - Tên mình (HUD): dữ liệu đầy đủ từ state.
 * - Người chơi khác (bạn bè/chat): có gì hiện nấy; thiếu thì hiện
 *   "Chưa có thông tin" lịch sự, không vỡ layout.
 * Chỉ THÊM hàm mới, không đụng hàm hiện có. */
function inspectPowerOf(s) {
  return Math.round((s.atk || 0) * 3 + (s.maxHp || 0) / 5 + (s.maxMp || 0) / 10 + (s.def || 0) * 5);
}
function inspectData(pid) {
  if (!pid || pid === "me") {
    var s = getStats();
    return {
      isMe: true, name: state.char.name, gender: state.char.gender || "nam",
      sect: state.char.sect, realm: state.char.realm, tier: state.char.tier,
      element: state.char.element, elementQuality: state.char.elementQuality,
      online: true, power: inspectPowerOf(s),
      equip: state.equip, bag: state.bag
    };
  }
  var f = (typeof Social !== "undefined") ? Social.getFriend(state, pid) : null;
  if (!f) return null;
  return {
    isMe: false, name: f.name, gender: f.gender || "nam", sect: f.sect,
    realm: f.realm, tier: f.tier, online: f.online !== false,
    power: null, equip: null, bag: null
  };
}
function renderInspect(d) {
  var sprG = "assets/sprs/char_" + (d.gender === "nu" ? "nu" : "nam") + "_xuong_idle.png";
  var h = '<div class="insp-head"><div class="insp-ava"><img src="' + sprG + '" alt="" ' +
    'onerror="this.style.display=\'none\'"></div>' +
    '<div class="insp-who"><div class="insp-nm">' + esc(d.name) + "</div>" +
    '<div class="insp-sub">' + esc(stageName(d.realm, d.tier)) +
    (d.sect ? " · " + esc(t("sect_" + d.sect)) : "") + "</div>" +
    (d.element ? '<div class="insp-sub">' + lingenIconHtml(d.element, 20) +
      esc(t("el_" + d.element) + (d.elementQuality ? " · " + t("qual_" + d.elementQuality) : "")) + "</div>" : "") +
    '<div class="insp-sub">' + (d.online ? "🟢 Đang online" : "⚪ Ngoại tuyến") + "</div></div>" +
    '<div class="insp-power"><div class="pv">' + (d.power != null ? d.power : "—") +
    '</div><div class="pl">Lực chiến</div></div></div>';
  /* 9 ô trang bị */
  h += '<div class="insp-sec">⚔️ Trang bị đang mặc</div>';
  if (d.equip) {
    var slots = ["vukhi", "phapbao", "phihanh", "giap", "huanh", "phapboi", "yphuc", "hanhngoa", "linhgioi"];
    h += '<div class="insp-equip">' + slots.map(function (slot) {
      var id = d.equip[slot], def = id ? itemDef(id) : null;
      return '<div class="insp-slot' + (def ? "" : " empty") + '">' +
        '<span class="ic">' + (def ? itemIcon(id) : "＋") + "</span>" +
        '<span class="nm">' + esc(t("slot_" + slot)) + "</span>" +
        (def ? '<span class="it">' + esc(itemName(id)) + "</span>" : "") + "</div>";
    }).join("") + "</div>";
  } else {
    h += '<div class="insp-noinfo">Chưa có thông tin trang bị<br>của người chơi này</div>';
  }
  /* túi đồ */
  h += '<div class="insp-sec">🎒 Vật phẩm trong túi</div>';
  if (d.bag) {
    if (!d.bag.length) h += '<div class="insp-noinfo">Túi trống</div>';
    else h += '<div class="item-grid">' + d.bag.map(function (it) {
      return '<div class="item-cell"><span class="item-cell-icon">' + itemIcon(it.id) +
        '</span><span class="item-cell-qty">x' + it.qty + '</span><span class="item-cell-name">' +
        esc(itemName(it.id)) + "</span></div>";
    }).join("") + "</div>";
  } else {
    h += '<div class="insp-noinfo">Chưa có thông tin túi đồ<br>của người chơi này</div>';
  }
  return h;
}
function closeInspect() {
  var ov = (typeof document !== "undefined") ? document.getElementById("inspect-overlay") : null;
  if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
}
function openInspect(pid) {
  if (typeof document === "undefined") return;
  var d = inspectData(pid);
  if (!d) { toast("Không tìm thấy người chơi"); return; }
  closeInspect();
  var ov = document.createElement("div");
  ov.className = "panel-overlay";
  ov.id = "inspect-overlay";
  ov.innerHTML = '<div class="panel"><div class="panel-head"><h3>Xem Trang Bị</h3>' +
    '<button class="panel-x" id="inspect-x">✕</button></div>' +
    '<div class="panel-body">' + renderInspect(d) + "</div></div>";
  var app = document.getElementById("app") || document.body;
  app.appendChild(ov);
  document.getElementById("inspect-x").addEventListener("click", function () { closeInspect(); });
  ov.addEventListener("pointerdown", function (e) {
    if (e.target && e.target.id === "inspect-overlay") closeInspect();
  });
  try { if (typeof sfx !== "undefined") sfx("click"); } catch (e) {}
}

return {
  boot: boot,
  show: show,
  toast: toast,
  refreshHUD: refreshHUD,
  openPanel: openPanel,
  closePanel: closePanel,
  getStats: getStats,
  inspectPlayer: openInspect
};

/* Minimap góc trên-phải (chuẩn tutien2d): chấm vàng = mình, đỏ = quái,
 * tím = boss, xanh lá = NPC, vàng = cổng map. Vẽ thưa 600ms để nhẹ máy. */
var _mmLastDraw = 0;
function drawMinimap() {
  var cv = $("minimap");
  if (!cv || screen !== "game" || !state || !hasEngine() || !Engine.player) return;
  var now = Date.now();
  if (now - _mmLastDraw < 600) return;
  _mmLastDraw = now;
  try {
    var ctx = cv.getContext("2d"), W = cv.width, H = cv.height;
    var WW = 1600, WH = 1200, sx = W / WW, sy = H / WH;
    ctx.fillStyle = "#0e150e";
    ctx.fillRect(0, 0, W, H);
    var i, m;
    if (typeof Engine.getGates === "function") {
      var gates = Engine.getGates() || [];
      ctx.fillStyle = "#ffd76a";
      for (i = 0; i < gates.length; i++)
        ctx.fillRect(gates[i].x * sx - 2, gates[i].y * sy - 2, 4, 4);
    }
    if (typeof Engine.getNPCs === "function") {
      var npcs = Engine.getNPCs() || [];
      ctx.fillStyle = "#7fe08a";
      for (i = 0; i < npcs.length; i++) {
        ctx.beginPath(); ctx.arc(npcs[i].x * sx, npcs[i].y * sy, 2, 0, 6.3); ctx.fill();
      }
    }
    if (typeof Engine.getMonsters === "function") {
      var mons = Engine.getMonsters() || [];
      for (i = 0; i < mons.length; i++) {
        m = mons[i];
        if (m.dead) continue;
        ctx.fillStyle = m.boss ? "#c77fe8" : "#f0503c";
        ctx.beginPath(); ctx.arc(m.x * sx, m.y * sy, m.boss ? 3.5 : 2, 0, 6.3); ctx.fill();
      }
    }
    var p = Engine.player;
    ctx.fillStyle = "#ffd76a";
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(p.x * sx, p.y * sy, 3.5, 0, 6.3); ctx.fill(); ctx.stroke();
  } catch (e) {}
}

})();

/* Node.js export: chỉ hàm thuần logic (formatTien) */
if (typeof module !== "undefined" && module.exports) {
  module.exports = { formatTien: formatTien };
}

/* Chạm vào tên → xem trang bị. Lắng nghe toàn cục, không đụng hệ thống
 * data-act hiện có. Chạy sau UI để UI.inspectPlayer tồn tại. */
if (typeof document !== "undefined") {
  document.addEventListener("click", function (e) {
    if (!e.target || !e.target.closest) return;
    var el = e.target.closest("[data-inspect]");
    var pid = el ? el.getAttribute("data-inspect") : null;
    if ((!pid || !pid.length) && e.target.closest("#hud-name")) pid = "me";
    if (pid && typeof UI !== "undefined" && UI.inspectPlayer) UI.inspectPlayer(pid);
  });
}

/* ================= TAB BÍ TỊCH RÕ RÀNG (Bui 2026-10-18) ================= */
/* Liệt kê TẤT CẢ skill: đã học + chưa học (khóa + điều kiện) */
function allSkillEntries() {
  var out = [];
  try {
    if (typeof Skills === "undefined") return out;
    var seen = {};
    var cls = (state.char && state.char.sect) || "kiem";
    var addEntry = function (techId, manualId) {
      if (!techId || seen[techId]) return;
      seen[techId] = 1;
      var isP = Skills.isPassive(techId);
      var def = isP ? Skills.passiveDef(techId) : Skills.skillDef(techId);
      if (!def) return;
      var learned = Skills.hasLearned(state, techId);
      var realmOk = manualId ? Skills.manualRealmOk(state, manualId) : true;
      var mi = manualId ? Skills.manualInfo(manualId) : null;
      out.push({ id: techId, isP: isP, def: def, learned: learned,
        realmOk: realmOk, realm: mi ? (mi.realm || 1) : 1, manualId: manualId });
    };
    /* Từ ITEMS: tất cả bí tịch */
    if (typeof ITEMS !== "undefined" && ITEMS) {
      for (var mid in ITEMS) {
        var m = ITEMS[mid];
        if (!m || m.kind !== "manual") continue;
        /* Chỉ hiện skill cùng hệ phái hoặc bị động dùng chung */
        if (m.skill) {
          var d = Skills.skillDef(m.skill);
          if (d && d.sect && d.sect !== cls && d.sect !== "all") continue;
        }
        addEntry(m.skill || m.passive, mid);
      }
    }
    /* Từ SECT_SKILLS nếu có */
    if (typeof SECT_SKILLS !== "undefined" && SECT_SKILLS) {
      for (var sid in SECT_SKILLS) {
        var sd = SECT_SKILLS[sid];
        if (sd && (sd.sect === cls || sd.sect === "all" || !sd.sect))
          addEntry(sid, Skills.manualIdForSkill ? Skills.manualIdForSkill(sid) : null);
      }
    }
  } catch (e) {}
  /* Đã học trước, chủ động trước bị động */
  out.sort(function (a, b) {
    if (a.learned !== b.learned) return a.learned ? -1 : 1;
    if (a.isP !== b.isP) return a.isP ? 1 : -1;
    return 0;
  });
  return out;
}
/* Tên cảnh giới yêu cầu */
function realmReqName(realm) {
  try {
    if (typeof STAGES !== "undefined" && STAGES[realm]) return STAGES[realm].ten;
  } catch (e) {}
  return ["Phàm Nhân", "Luyện Khí", "Trúc Cơ", "Kim Đan", "Nguyên Anh", "Hóa Thần", "Đại Thừa", "Độ Kiếp"][realm] || "";
}
function renderManualTab() {
  if (typeof Skills === "undefined") return "";
  var entries = allSkillEntries();
  var h = '<div class="manual-list">';
  if (!entries.length) h += '<p class="sect-note">' + esc(t("skill_not_learned")) + "</p>";
  entries.forEach(function (e) {
    var def = e.def;
    var lv = e.isP ? Skills.passiveLevel(state, e.id) : Skills.manualLevel(state, e.id);
    var typeCls = e.isP ? "is-passive" : "is-active";
    var typeBadge = '<span class="' + (e.isP ? "manual-type-passive" : "manual-type-active") + '">' +
      esc(t(e.isP ? "manual_type_passive" : "manual_type_active")) + "</span>";
    var lockCls = (!e.learned) ? " is-locked" : "";
    h += '<div class="manual-card ' + typeCls + lockCls + '">' +
      '<span class="manual-icon">' + skillIconHtml(e.id, def.icon) + "</span>" +
      '<div class="manual-info">' +
      '<div class="manual-name">' + esc(t(def.nameKey)) + typeBadge +
      ' <span class="manual-lv2">Lv' + lv + "</span></div>" +
      '<div class="manual-desc">' + esc(t(def.descKey || "")) + "</div>";
    if (!e.learned) {
      h += '<div class="manual-lock-reason">🔒 ' +
        esc(t("skill_lock_realm", { realm: realmReqName(e.realm) })) + "</div>";
    } else if (!e.isP) {
      var onBar = state.skillSlots && state.skillSlots.indexOf(e.id) >= 0;
      h += '<div class="manual-assign"><button class="btn-assign' + (onBar ? " on-bar" : "") +
        '" data-act="assign-skill" data-tech="' + esc(e.id) + '">' +
        esc(t(onBar ? "skill_on_bar" : "skill_assign")) + "</button></div>";
    }
    h += "</div></div>";
  });
  h += "</div>";
  return h;
}
/* Gắn / gỡ skill khỏi thanh skill */
function doAssignSkill(skillId) {
  if (!state.skillSlots) state.skillSlots = [null, null, null, null, null, null, null];
  var idx = state.skillSlots.indexOf(skillId);
  if (idx >= 0) {
    state.skillSlots[idx] = null;
    toast(t("skill_unassigned"));
  } else {
    var empty = state.skillSlots.indexOf(null);
    if (empty < 0) { toast(t("skill_bar_full")); return; }
    state.skillSlots[empty] = skillId;
    toast(t("skill_assigned", { n: empty + 1 }));
  }
  try { if (typeof saveGame === "function") saveGame(); } catch (e) {}
  renderSkillbar();
  if (typeof renderPanel === "function") renderPanel();
}
/* Tooltip nhấn giữ trên ô skill (mobile) */
var _skillTipEl = null, _skillTipTimer = null;
function showSkillTip(skillId, x, y) {
  hideSkillTip();
  try {
    var def = Skills.skillDef(skillId);
    if (!def) return;
    var pw = Skills.skillPower(state, skillId);
    _skillTipEl = document.createElement("div");
    _skillTipEl.className = "skill-tip";
    _skillTipEl.innerHTML = "<b>" + esc(t(def.nameKey)) + "</b> Lv" + pw.level + "<br>" +
      esc(t(def.descKey || "")) + "<br><span class=\"tip-cd\">⏱ " + (def.cd || 0) + "s · 🔷 " + (pw.mp || 0) + " MP</span>";
    document.body.appendChild(_skillTipEl);
    var r = _skillTipEl.getBoundingClientRect();
    var lx = Math.min(Math.max(8, x - r.width / 2), window.innerWidth - r.width - 8);
    var ly = Math.max(8, y - r.height - 12);
    _skillTipEl.style.left = lx + "px";
    _skillTipEl.style.top = ly + "px";
  } catch (e) {}
}
function hideSkillTip() {
  if (_skillTipTimer) { clearTimeout(_skillTipTimer); _skillTipTimer = null; }
  if (_skillTipEl && _skillTipEl.parentNode) _skillTipEl.parentNode.removeChild(_skillTipEl);
  _skillTipEl = null;
}
function bindSkillLongPress(el, skillId) {
  var sx = 0, sy = 0, fired = false;
  var start = function (e) {
    fired = false;
    var p = e.touches && e.touches[0] ? e.touches[0] : e;
    sx = p.clientX; sy = p.clientY;
    _skillTipTimer = setTimeout(function () {
      fired = true;
      showSkillTip(skillId, sx, sy);
      if (typeof sfx === "function") sfx("tap");
    }, 500);
  };
  var cancel = function () {
    if (_skillTipTimer) { clearTimeout(_skillTipTimer); _skillTipTimer = null; }
    if (!fired) hideSkillTip();
  };
  el.addEventListener("touchstart", start, { passive: true });
  el.addEventListener("touchend", cancel);
  el.addEventListener("touchcancel", cancel);
  el.addEventListener("touchmove", cancel);
  /* Chuột: hover hiện tooltip */
  el.addEventListener("mouseenter", function (e) { showSkillTip(skillId, e.clientX, e.clientY); });
  el.addEventListener("mouseleave", hideSkillTip);
}
/* Skill vừa dùng: đánh dấu sáng */
var _lastUsedSkill = null;
function markSkillActive(skillId) {
  _lastUsedSkill = skillId;
  try {
    var bar = document.getElementById("skillbar");
    if (!bar) return;
    var slots = bar.querySelectorAll(".skill-slot");
    for (var i = 0; i < slots.length; i++)
      slots[i].classList.toggle("active-skill", slots[i].getAttribute("data-skill") === skillId);
  } catch (e) {}
}

/* ================= LỊCH LUYỆN BÍ CẢNH (secretbook.js) ================= */
function hasSecretBook() { return typeof SecretBook !== "undefined"; }
function sbTab() { return (panelArg && panelArg.sbtab) || "sched"; }
/* ms → "20:05" (giờ địa phương) */
function _sbHM(ms) {
  var d = new Date(ms);
  function p2(n) { return (n < 10 ? "0" : "") + n; }
  return p2(d.getHours()) + ":" + p2(d.getMinutes());
}
function _sbRealmTitle(id) {
  var icon = "🌀", nm = id;
  try {
    if (hasSecret()) { var r = Secret.realm(id); if (r) { icon = r.icon || icon; if (r.nameKey) nm = t(r.nameKey); } }
  } catch (e) {}
  return icon + " " + nm;
}
function _sbDayLabel(dayMs) {
  var d = new Date(dayMs);
  function p2(n) { return (n < 10 ? "0" : "") + n; }
  return p2(d.getDate()) + "/" + p2(d.getMonth() + 1);
}
function _sbWinStatus(s) {
  if (s.phase === "open") return '<span class="sr-open-tag">🔥 ' + esc(t("sb_open")) + " — " + esc(t("sb_time_left", { t: fmtDur(s.msLeft) })) + "</span>";
  if (s.phase === "soon") return '<span class="sr-time">⏳ ' + esc(t("sb_soon")) + " — " + esc(t("sb_opens_in", { t: fmtDur(s.msUntil) })) + "</span>";
  if (s.phase === "done") return '<span class="sr-time">🔒 ' + esc(t("sb_done")) + "</span>";
  return '<span class="sr-time">📅 ' + esc(t("sb_opens_in", { t: fmtDur(s.msUntil) })) + "</span>";
}
function _sbIsBooked(state, realmId, dateStr, win) {
  SecretBook.ensure(state);
  return state.secretBook.bookings.some(function (b) {
    return !b.used && b.realmId === realmId && b.date === dateStr && b.win === win;
  });
}
function _sbDateStr(ms) {
  var d = new Date(ms);
  function p2(n) { return (n < 10 ? "0" : "") + n; }
  return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate());
}

function renderSecretBook() {
  if (!hasSecretBook()) return "";
  var h = tabBtns([
    ["sched", t("sb_tab_sched")], ["my", t("sb_tab_my")], ["hist", t("sb_tab_hist")],
  ], sbTab(), "sb-tab");
  var tb = sbTab();
  if (tb === "my") h += renderSecretBookMy(Date.now());
  else if (tb === "hist") h += renderSecretBookHist();
  else h += renderSecretBookSched(Date.now());
  return h;
}

/* Tab Lịch mở: khung giờ hôm nay + ngày mai, nút đặt lịch */
function renderSecretBookSched(now) {
  SecretBook.ensure(state);
  var h = '<p class="sect-note">⚡ ' + esc(t("sb_note")) + "</p>";
  [0, 1].forEach(function (dayOff) {
    var dayMs = now + dayOff * 86400000;
    var d0 = new Date(dayMs); d0.setHours(0, 0, 0, 0);
    h += '<div class="item-name" style="margin-top:8px">📅 ' +
      esc((dayOff === 0 ? t("sb_today") : t("sb_tomorrow")) + " " + _sbDayLabel(dayMs)) + "</div>";
    SecretBook.realmIds().forEach(function (id) {
      var ce = hasSecret() ? Secret.canEnter(state, id) : { ok: true };
      var dstr = _sbDateStr(d0.getTime());
      var wins = SecretBook.daySchedule(d0.getTime(), dayOff === 0 ? now : d0.getTime())
        .filter(function (s) { return s.realmId === id; });
      var rows = wins.map(function (s) {
        var booked = _sbIsBooked(state, id, dstr, s.win);
        var canBook = ce.ok && !booked && s.phase !== "open" && s.phase !== "done" &&
          (dayOff === 1 || s.start > now + 60000);
        var btn = booked ? '<span class="sr-time">' + esc(t("sb_booked")) + "</span>"
          : !ce.ok ? '<button class="mini" disabled>' + esc(t("sr_locked", { realm: stageName(ce.need || 2, 0) })) + "</button>"
          : canBook ? '<button class="mini" data-act="sb-book" data-id="' + esc(id) + '" data-date="' + dayOff + '" data-win="' + s.win + '">' + esc(t("sb_book")) + "</button>"
          : '<button class="mini" disabled>' + esc(t("sb_book")) + "</button>";
        return '<div class="row"><div><div class="item-name">' + esc(_sbHM(s.start) + " – " + _sbHM(s.end)) +
          '</div><div class="item-desc">' + _sbWinStatus(s) + "</div></div>" +
          '<div class="row-btns">' + btn + "</div></div>";
      }).join("");
      h += '<div class="sr-row"><div class="item-name">' + esc(_sbRealmTitle(id)) + "</div>" + rows + "</div>";
    });
  });
  return h;
}

/* Tab Đã đặt: các lịch sắp tới + đếm ngược + hủy */
function renderSecretBookMy(now) {
  SecretBook.ensure(state);
  var list = SecretBook.upcomingBookings(state, now);
  if (!list.length) return '<p class="sect-note">' + esc(t("sb_no_book")) + "</p>";
  return list.map(function (b) {
    var live = now >= b.start && now < b.end;
    var cd = live ? '<span class="sr-open-tag">🔥 ' + esc(t("sb_open")) + " — " + esc(t("sb_time_left", { t: fmtDur(b.end - now) })) + "</span>"
                  : '<span class="sr-time">⏳ ' + esc(t("sb_opens_in", { t: fmtDur(b.start - now) })) + "</span>";
    var d = new Date(b.start);
    var dayLbl = _sbDateStr(b.start) === _sbDateStr(now) ? t("sb_today") : t("sb_tomorrow");
    return '<div class="sr-row"><div class="sr-head"><div class="item-name">' + esc(_sbRealmTitle(b.realmId)) + "</div>" +
      '<div class="row-btns"><button class="mini red" data-act="sb-cancel" data-id="' + esc(b.id) + '">' + esc(t("sb_cancel")) + "</button></div></div>" +
      '<div class="item-desc">📅 ' + esc(dayLbl + " " + _sbDayLabel(b.start) + " · " + _sbHM(b.start) + " – " + _sbHM(b.end)) + "</div>" +
      '<div style="margin-top:4px">' + cd + ' <span class="sr-time">· ' + esc(t("sb_priority", { n: SecretBook.DEF.priorityExpPct })) + "</span></div></div>";
  }).join("");
}

/* Tab Lịch sử: số lần đi, số lần ưu tiên, boss đã hạ */
function renderSecretBookHist() {
  SecretBook.ensure(state);
  var stats = SecretBook.stats(state);
  var ids = Object.keys(stats);
  var any = ids.some(function (id) { return stats[id].entries > 0; });
  if (!any) return '<p class="sect-note">' + esc(t("sb_no_hist")) + "</p>";
  return ids.map(function (id) {
    var s = stats[id];
    if (!s.entries) return "";
    return '<div class="sr-row"><div class="item-name">' + esc(_sbRealmTitle(id)) + "</div>" +
      '<div class="item-desc">⚔️ ' + esc(t("sb_entries", { n: s.entries })) +
      " · ⚡ " + esc(t("sb_priority_n", { n: s.priority })) + "</div>" +
      '<div class="item-desc">👹 ' + esc(t("sb_bosses", { s: s.bosses.length ? s.bosses.join(", ") : t("sb_no_boss") })) + "</div></div>";
  }).join("");
}

function onSecretBookClick(act, el) {
  if (!hasSecretBook()) return;
  var now = Date.now();
  if (act === "sb-tab") {
    panelArg = { dtab: (panelArg && panelArg.dtab) || "sb", sbtab: el.getAttribute("data-v") };
    renderPanel(); sfx("click"); return;
  }
  if (act === "sb-book") {
    var dayMs = now + (+el.getAttribute("data-date")) * 86400000;
    var r = SecretBook.book(state, el.getAttribute("data-id"), dayMs, +(el.getAttribute("data-win")), now);
    if (!r.ok) {
      var msg = r.reason === "dup" ? t("sb_book_dup") :
        r.reason === "full" ? t("sb_book_full", { n: r.max || SecretBook.DEF.maxBookingsPerDay }) :
        r.reason === "locked" ? t("sr_locked", { realm: stageName(r.need || 2, 0) }) :
        (r.reason === "past" || r.reason === "bad_day" || r.reason === "bad_window") ? t("sb_book_past") : t("sb_book_fail");
      toast(msg); sfx("fail"); return;
    }
    toast(t("sb_book_ok", { name: _sbRealmTitle(r.booking.realmId), t: _sbHM(r.booking.start) }));
    sfx("success"); saveGame(state); renderPanel(); return;
  }
  if (act === "sb-cancel") {
    var c = SecretBook.cancelBook(state, el.getAttribute("data-id"));
    toast(t(c.ok ? "sb_cancel_ok" : "sb_cancel_fail")); sfx(c.ok ? "click" : "fail");
    if (c.ok) saveGame(state);
    renderPanel(); return;
  }
}

/* Nhắc lịch hẹn trước giờ mở (gọi từ secretTick mỗi tick game) */
function secretBookTick() {
  if (typeof screen === "undefined" || screen !== "game" || !state || !hasSecretBook()) return;
  var due = SecretBook.tick(state, Date.now());
  if (!due.length) return;
  var now = Date.now();
  due.forEach(function (b) {
    toast("⏰ " + t("sb_remind", { name: _sbRealmTitle(b.realmId), t: fmtDur(Math.max(0, b.start - now)) }));
  });
  sfx("success");
  saveGame(state);
  try { if (panel === "dungeon") renderPanel(); } catch (e) {}
}

/* Click riêng cho Lịch Bí Cảnh (không động vào switch onPanelClick để tránh xung đột) */
if (typeof document !== "undefined") {
  document.addEventListener("click", function (e) {
    var el = e.target && e.target.closest ? e.target.closest("[data-act]") : null;
    if (!el) return;
    var act = el.getAttribute("data-act") || "";
    if (act === "sb-tab" || act === "sb-book" || act === "sb-cancel") {
      try { onSecretBookClick(act, el); } catch (err) {}
    }
  });
}
