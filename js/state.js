/* ============================================================
 * js/state.js — Trạng thái game + save/load + lượt phụ bản/ngày
 * Phụ thuộc: stages.js (todayStr dùng nội bộ, dungeon helpers)
 * ============================================================ */

/* Lấy dependency từ stages.js (browser: global sẵn; node: require) */
var _ST = null;
if (typeof dungeonType === "undefined" && typeof require !== "undefined") {
  _ST = require("./stages.js");
}
function _dep(name) {
  if (typeof globalThis !== "undefined" && typeof globalThis[name] === "function") return globalThis[name];
  if (_ST) return _ST[name];
  throw new Error("missing dep: " + name);
}
function _dungeonType(id) { return _dep("dungeonType")(id); }
function _dungeonBuyCost(t, b) { return _dep("dungeonBuyCost")(t, b); }
function _expMaxFor(r, t) { return _dep("expMaxFor")(r, t); }
function _baseStats(r, t, s) { return _dep("baseStats")(r, t, s); }

function todayStr(d) {
  d = d || new Date();
  const m = ("0" + (d.getMonth() + 1)).slice(-2);
  const day = ("0" + d.getDate()).slice(-2);
  return d.getFullYear() + "-" + m + "-" + day;
}

/* ---------- ID nhân vật: "TT-" + 6 ký tự, bộ chữ loại 0/O, 1/I, L để khỏi nhầm ---------- */
var CHARID_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function genCharId(randFn) {
  var r = randFn || Math.random, s = "TT-";
  for (var i = 0; i < 6; i++) s += CHARID_ALPHABET[Math.floor(r() * CHARID_ALPHABET.length)];
  return s;
}
function isValidCharId(id) { return /^TT-[A-HJ-KM-NP-Z2-9]{6}$/.test(id || ""); }

/* Khung state.social mặc định (bạn bè / nhắn tin) — social.js dùng thêm */
function defaultSocialState() {
  return { friends: [], requestsIn: [], requestsOut: [], threads: {}, world: [], unread: {}, lastMsgAt: 0 };
}

function defaultState() {
  return {
    v: 2,
    lang: "vi",
    char: {
      name: "", sect: "kiem",          // kiem | phap | the
      element: null, elementQuality: null, // linh căn: kim/moc/... + pham/dia/thien
      realm: 0, tier: 1, exp: 0,       // realm 0=Phàm Nhân; realm1: tier 1..12; realm>=2: tier 0..3 (Sơ/Trung/Hậu/Đỉnh Phong)
      hp: 100, mp: 50,
      charId: null,                    // ID duy nhất "TT-XXXXXX" — sinh 1 lần, không đổi
      gender: "nam",                   // nam | nu — đổi bằng Thẻ Đổi Giới Tính
      nameHistory: [],                 // [{name, at}] tên cũ
      lastRenameAt: 0,                 // timestamp lần đổi tên gần nhất
      renameFreeUsed: false,           // đã dùng lượt đổi tên miễn phí chưa
    },
    social: defaultSocialState(),       // bạn bè + nhắn tin (xem social.js)
    stones: 0,                          // Linh Thạch
    bag: [],                            // [{id, qty, locked}]
    equip: { vukhi: null, phapbao: null, phihanh: null, giap: null, huanh: null,
             phapboi: null, yphuc: null, hanhngoa: null, linhgioi: null },
    enhance: { vukhi: 0, phapbao: 0, phihanh: 0, giap: 0, huanh: 0,
               phapboi: 0, yphuc: 0, hanhngoa: 0, linhgioi: 0 },
    skills: ["sword_qi"],
    skillsCd: {},                        // hồi chiêu bí thuật {skillId: timestampMs}
    skillGrades: {},                     // phẩm skill đã học {skillId: tier} (save cũ)
    skillManual: {},                     // bí tịch đang gắn {techId(skill|passive): manualId}
    manualLevels: {},                    // cấp bí tịch {manualId: level 1..max}
    passives: {},                        // mirror cấp bị động {pid: level}
    fragments: 0,                        // Mảnh Bí Tịch
    gachaHistory: [],                    // 10 lần quay gần nhất
    gachaPity: { thien: 0 },             // pity bảng Thiên
    pet: null,                           // linh thú {tier,name,level,exp,hp}
    petRestUntil: 0,                     // timestamp hồi phục nếu thú kiệt sức
    petHatch: null,                      // ấp dở {eggId, readyAt}
    autoCfg: { target: "nearest", autoSkill: true, autoPotion: true, potionAt: 30 },
    sectInfo: null,                      // {joined, contrib, daily} — xem sect.js
    daotam: 0,                           // đạo tâm -100..100 (kỳ ngộ)
    cancotLv: 0,                        // Căn Cốt cấp 0..100 — xem bodycult.js
    thanthucLv: 0,                      // Thần Thức cấp 0..100
    thoNguyen: 100,                     // Thọ Nguyên còn lại (năm) — xem lifespan.js
    tnLastTick: Date.now(),             // mốc trừ thọ nguyên theo ngày thực
    tnRebirths: 0,                      // số lần chuyển thế
    tnTalents: [],                      // thiên phú chuyển thế [talentId]
    tnHistory: [],                      // lịch sử chuyển thế [{at, realm, kept, talent}]
    tnReserve: 0,                       // tu vi dự trữ (30% giữ lại khi chuyển thế)
    meditateUntil: 0,                   // timestamp xong thiền định (0 = không thiền)
    yaodanElem: {},                     // buff nguyên tố từ luyện yêu đan {hoa: n, ...}
    bcDaily: null,                      // nhiệm vụ luyện thể ngày {date, kill, killClaimed, medClaimed}
    bcTitles: [],                       // danh hiệu đại mốc Căn Cốt/Thần Thức
    quests: {},                         // {questId: {status:'active'|'done', count}}
    killCount: 0, killDate: todayStr(),  // đếm quái hôm nay x/10000
    dungeons: { date: todayStr(), used: {}, bought: {} }, // lượt phụ bản/ngày
    dungeonRun: null,   // bí cảnh ngẫu nhiên đang dở: {dungeonId, seed, stageIdx, layout}
    secret: { claims: {} }, // Bí Cảnh tranh đoạt: {slotKey: {entered, nodes:{}, consolation}} — xem secret.js
    giftcodes: [],                      // mã đã dùng
    map: { id: 0, zone: 13 },
    pos: { x: 400, y: 300 },
    auto: false, fly: false, run: false,
    settings: { sound: true, music: true, graphics: "tudong", graphicsManual: null, showPlayers: "all", tapMove: true,
      vibrate: true, voice: true,
      display: { fullscreen: false, orientation: "auto" },
      gamepad: { enabled: true, map: null } },
    flags: { taycot_done: false, tutorial_done: false, da_donate: false },
  };
}

/* ---------- Đếm quái hôm nay (reset 0h) ---------- */
function bumpKill(state) {
  const t = todayStr();
  if (state.killDate !== t) { state.killDate = t; state.killCount = 0; }
  state.killCount++;
}

/* ---------- Lượt phụ bản (reset 0h) ---------- */
function _dg(state) {
  const t = todayStr();
  if (!state.dungeons || state.dungeons.date !== t) {
    state.dungeons = { date: t, used: {}, bought: {} };
  }
  return state.dungeons;
}
/* Tổng lượt được phép hôm nay = lượt gốc + số lượt đã mua */
function dungeonQuota(state, dungeonId, typeId) {
  const d = _dg(state);
  const t = _dungeonType(typeId);
  return t.luot_ngay + (d.bought[dungeonId] || 0);
}
function dungeonLeft(state, dungeonId, typeId) {
  const d = _dg(state);
  const used = d.used[dungeonId] || 0;
  return Math.max(0, dungeonQuota(state, dungeonId, typeId) - used);
}
/* Vào phụ bản: trừ phí + trừ lượt. Trả {ok, reason?} */
function dungeonEnter(state, dungeonId, typeId) {
  const t = _dungeonType(typeId);
  if (dungeonLeft(state, dungeonId, typeId) <= 0) return { ok: false, reason: "het_luot" };
  if (state.stones < t.phi) return { ok: false, reason: "thieu_linh_thach" };
  state.stones -= t.phi;
  const d = _dg(state);
  d.used[dungeonId] = (d.used[dungeonId] || 0) + 1;
  return { ok: true };
}
/* Mua thêm 1 lượt trong ngày. Trả {ok, cost?, reason?} */
function dungeonBuy(state, dungeonId, typeId) {
  const d = _dg(state);
  const bought = d.bought[dungeonId] || 0;
  const cost = _dungeonBuyCost(typeId, bought);
  if (state.stones < cost) return { ok: false, reason: "thieu_linh_thach" };
  state.stones -= cost;
  d.bought[dungeonId] = bought + 1;
  return { ok: true, cost: cost };
}

/* ---------- Túi đồ ---------- */
function addItem(state, id, qty, locked) {
  qty = qty || 1;
  const ex = state.bag.find(function (it) { return it.id === id && !!it.locked === !!locked; });
  if (ex) ex.qty += qty;
  else state.bag.push({ id: id, qty: qty, locked: !!locked });
}
function removeItem(state, id, qty) {
  qty = qty || 1;
  for (let i = 0; i < state.bag.length; i++) {
    if (state.bag[i].id === id) {
      state.bag[i].qty -= qty;
      if (state.bag[i].qty <= 0) state.bag.splice(i, 1);
      return true;
    }
  }
  return false;
}
function countItem(state, id) {
  return state.bag.reduce(function (n, it) { return n + (it.id === id ? it.qty : 0); }, 0);
}

/* ---------- EXP / lên cấp ---------- */
/* Trả về {leveled: bool, tierUp: bool} — KHÔNG tự đột phá đại cảnh giới */
function gainExp(state, n) {
  /* Thiên phú chuyển thế: +% kinh nghiệm (lifespan.js, guard vì load sau) */
  try { if (typeof Lifespan !== "undefined" && Lifespan.talentExpPct) n = Math.round(n * (1 + Lifespan.talentExpPct(state))); } catch (e) {}
  /* Phẩm chất căn cốt: +tốc độ tu luyện (taycot.js) */
  try { if (typeof TayCot !== "undefined") n = Math.round(n * TayCot.cotBonus(state).expMult); } catch (e) {}
  /* Ưu tiên đặt lịch bí cảnh: +EXP (secretbook.js) */
  try { if (typeof SecretBook !== "undefined") n = Math.round(n * SecretBook.expMult(state)); } catch (e) {}
  const c = state.char;
  c.exp += n;
  let leveled = false;
  for (;;) {
    const max = _expMaxFor(c.realm, c.tier);
    if (c.exp < max) break;
    // Đang ở max tiểu cảnh giới của đại cảnh giới → chờ đột phá, không tự lên
    if (c.realm === 1 && c.tier >= 12) { c.exp = max; break; }
    if (c.realm >= 2 && c.tier >= 3) { c.exp = max; break; }
    c.exp -= max;
    c.tier++;
    leveled = true;
    const st = _baseStats(c.realm, c.tier, c.sect);
    c.hp = st.maxHp; c.mp = st.maxMp;
  }
  return { leveled: leveled };
}
/* Có đủ điều kiện đột phá đại cảnh giới không (đủ cấp, chưa cần check đan) */
function canBreakthrough(state) {
  const c = state.char;
  return (c.realm === 1 && c.tier >= 12) || (c.realm >= 2 && c.realm < 7 && c.tier >= 3);
}
/* Thực hiện đột phá: rate từ stages.js; fail → rớt 1 tiểu cảnh giới */
function doBreakthrough(state, rate) {
  const c = state.char;
  const roll = Math.random();
  if (roll < rate) {
    c.realm++;
    c.tier = c.realm === 1 ? 1 : 0;
    c.exp = 0;
    const st = _baseStats(c.realm, c.tier, c.sect);
    c.hp = st.maxHp; c.mp = st.maxMp;
    return { ok: true };
  }
  // Thất bại: rớt 1 tiểu cảnh giới
  if (c.realm === 1 && c.tier > 1) c.tier--;
  else if (c.realm >= 2 && c.tier > 0) c.tier--;
  c.exp = 0;
  return { ok: false };
}

/* ---------- Lượt chạy bí cảnh ngẫu nhiên (giữ seed để vào lại cùng bản đồ) ---------- */
function startDungeonRun(state, dungeonId, seed, layout) {
  state.dungeonRun = { dungeonId: dungeonId, seed: seed, stageIdx: 0, layout: layout };
}
function clearDungeonRun(state) { state.dungeonRun = null; }

/* ---------- Vạn Tiên Các: mở khi Luyện Khí tầng 12+ hoặc đã donate ---------- */
function vanTienCacUnlocked(state) {
  const c = state.char;
  return !!state.flags.da_donate || c.realm > 1 || (c.realm === 1 && c.tier >= 12);
}

/* ---------- Migrate save cũ: thêm field mới mà không mất dữ liệu ---------- */
function migrateState(state) {
  if (!state || typeof state !== "object") return state;
  if (!state.skillsCd) state.skillsCd = {};
  if (!state.skillGrades) state.skillGrades = {};
  if (!state.skillManual) state.skillManual = {};
  if (!state.manualLevels) state.manualLevels = {};
  if (!state.passives) state.passives = {};
  if (state.fragments == null) state.fragments = 0;
  if (!state.gachaHistory) state.gachaHistory = [];
  if (!state.gachaPity) state.gachaPity = { thien: 0 };
  if (!state.autoCfg) state.autoCfg = { target: "nearest", autoSkill: true, autoPotion: true, potionAt: 30 };
  /* migrate trang bị 3 ô cũ → 9 ô mới */
  if (state.equip && (state.equip.weapon !== undefined || state.equip.armor !== undefined || state.equip.acc !== undefined)) {
    var ne = { vukhi: null, phapbao: null, phihanh: null, giap: null, huanh: null,
               phapboi: null, yphuc: null, hanhngoa: null, linhgioi: null };
    var oe = state.equip;
    if (oe.weapon) ne.vukhi = oe.weapon;
    if (oe.armor) ne.giap = oe.armor;
    if (oe.acc) ne.phapboi = oe.acc;
    Object.keys(oe).forEach(function (k) { if (ne[k] === undefined && oe[k]) ne[k] = oe[k]; });
    state.equip = ne;
  }
  if (!state.equip) state.equip = { vukhi: null, phapbao: null, phihanh: null, giap: null, huanh: null, phapboi: null, yphuc: null, hanhngoa: null, linhgioi: null };
  if (state.enhance && state.enhance.weapon !== undefined) {
    var nh = { vukhi: 0, phapbao: 0, phihanh: 0, giap: 0, huanh: 0, phapboi: 0, yphuc: 0, hanhngoa: 0, linhgioi: 0 };
    if (state.enhance.weapon) nh.vukhi = state.enhance.weapon;
    if (state.enhance.armor) nh.giap = state.enhance.armor;
    if (state.enhance.acc) nh.phapboi = state.enhance.acc;
    state.enhance = nh;
  }
  /* migrate skillGrades (save cũ) → skillManual/manualLevels */
  try {
    var needSync = false;
    Object.keys(state.skillGrades).forEach(function (sid) {
      if (!state.skillManual[sid]) {
        var mid = null;
        if (typeof manualIdForSkill === "function") mid = manualIdForSkill(sid);
        if (mid) {
          state.skillManual[sid] = mid;
          state.manualLevels[mid] = 1;
          needSync = true;
        }
      }
    });
    if (needSync) {
      try {
        state.passives = state.passives || {};
        var pids = ["kiem_tam", "linh_mach", "the_phach", "than_phap",
                    "duoc_tam", "hoi_xuan", "ngu_thu_tam", "linh_thu_khe"];
        try {
          if (typeof PASSIVE_DEFS !== "undefined") pids = Object.keys(PASSIVE_DEFS);
        } catch (e3) {}
        pids.forEach(function (pid) {
          try { state.passives[pid] = passiveLevel(state, pid); } catch (e4) {}
        });
      } catch (e2) {}
    }
  } catch (e) {}
  if (!state.sectInfo) state.sectInfo = { joined: null, contrib: 0, daily: null };
  if (!state.sectInfo.rank) state.sectInfo.rank = "ngoai_mon";
  if (!Array.isArray(state.sectInfo.titles)) state.sectInfo.titles = [];
  if (!state.sectQuests) state.sectQuests = {};
  if (state.daotam == null) state.daotam = 0;
  /* Căn Cốt / Thần Thức — xem bodycult.js */
  if (state.cancotLv == null) state.cancotLv = 0;
  if (state.thanthucLv == null) state.thanthucLv = 0;
  if (state.meditateUntil == null) state.meditateUntil = 0;
  if (!state.yaodanElem || typeof state.yaodanElem !== "object") state.yaodanElem = {};
  if (!Array.isArray(state.bcTitles)) state.bcTitles = [];
  /* Thọ Nguyên — xem lifespan.js (null để Lifespan.ensure tính theo cảnh giới) */
  if (state.tnLastTick == null) state.tnLastTick = Date.now();
  if (state.tnRebirths == null) state.tnRebirths = 0;
  if (!Array.isArray(state.tnTalents)) state.tnTalents = [];
  if (!Array.isArray(state.tnHistory)) state.tnHistory = [];
  if (state.tnReserve == null) state.tnReserve = 0;
  /* ID nhân vật: save cũ tự sinh khi load lần đầu (không đổi về sau) */
  if (state.char) {
    if (!state.char.gender) state.char.gender = state.char.sect === "phap" ? "nu" : "nam";
    if (!Array.isArray(state.char.nameHistory)) state.char.nameHistory = [];
    if (state.char.lastRenameAt == null) state.char.lastRenameAt = 0;
    if (state.char.renameFreeUsed == null) state.char.renameFreeUsed = false;
    if (typeof Social !== "undefined" && Social.ensureCharId) {
      try { Social.ensureCharId(state); } catch (e) {}
    } else if (!state.char.charId || !isValidCharId(state.char.charId)) {
      state.char.charId = genCharId(); /* node test: không có Social/registry */
    }
  }
  if (!state.social) state.social = defaultSocialState();
  if (!state.settings) state.settings = {};
  if (state.settings.tapMove === undefined) state.settings.tapMove = true; /* save cũ: bật tap-to-move */
  if (state.settings.vibrate === undefined) state.settings.vibrate = true; /* save cũ: bật rung */
  if (state.settings.voice === undefined) state.settings.voice = true; /* save cũ: bật lồng tiếng */
  if (!state.settings.display) state.settings.display = { fullscreen: false, orientation: "auto" };
  if (!state.settings.gamepad) state.settings.gamepad = { enabled: true, map: null };
  if (!state.flags) state.flags = {};
  return state;
}

/* ---------- Save/Load qua Online (stub localStorage) ---------- */
function saveGame(state) {
  try {
    if (state && typeof state === "object" && typeof SAVE_VERSION !== "undefined") {
      state.saveVer = SAVE_VERSION; /* đóng dấu phiên bản để phát hiện save cũ */
    }
  } catch (e) {}
  Online.save(state);
}
function loadGame() { return migrateState(Online.load()); }

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    todayStr, defaultState, migrateState, bumpKill,
    dungeonQuota, dungeonLeft, dungeonEnter, dungeonBuy,
    startDungeonRun, clearDungeonRun, vanTienCacUnlocked,
    addItem, removeItem, countItem, gainExp, canBreakthrough, doBreakthrough,
    CHARID_ALPHABET, genCharId, isValidCharId, defaultSocialState,
  };
}
