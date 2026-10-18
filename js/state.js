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

function defaultState() {
  return {
    v: 2,
    lang: "vi",
    char: {
      name: "", sect: "kiem",          // kiem | phap | the
      element: null, elementQuality: null, // linh căn: kim/moc/... + pham/dia/thien
      realm: 0, tier: 1, exp: 0,       // realm 0=Phàm Nhân; realm1: tier 1..12; realm>=2: tier 0..2 (Sơ/Trung/Hậu)
      hp: 100, mp: 50,
    },
    stones: 0,                          // Linh Thạch
    bag: [],                            // [{id, qty, locked}]
    equip: { weapon: null, armor: null, acc: null }, // item id đang mặc
    enhance: { weapon: 0, armor: 0, acc: 0 },   // cấp cường hóa +0..+15 theo slot
    skills: ["sword_qi"],
    quests: {},                         // {questId: {status:'active'|'done', count}}
    killCount: 0, killDate: todayStr(),  // đếm quái hôm nay x/10000
    dungeons: { date: todayStr(), used: {}, bought: {} }, // lượt phụ bản/ngày
    dungeonRun: null,   // bí cảnh ngẫu nhiên đang dở: {dungeonId, seed, stageIdx, layout}
    giftcodes: [],                      // mã đã dùng
    map: { id: 0, zone: 13 },
    pos: { x: 400, y: 300 },
    auto: true, fly: false, run: false,
    settings: { sound: true, music: true, graphics: "tudong", graphicsManual: null, showPlayers: "all" },
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
  const c = state.char;
  c.exp += n;
  let leveled = false;
  for (;;) {
    const max = _expMaxFor(c.realm, c.tier);
    if (c.exp < max) break;
    // Đang ở max tiểu cảnh giới của đại cảnh giới → chờ đột phá, không tự lên
    if (c.realm === 1 && c.tier >= 12) { c.exp = max; break; }
    if (c.realm >= 2 && c.tier >= 2) { c.exp = max; break; }
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
  return (c.realm === 1 && c.tier >= 12) || (c.realm >= 2 && c.realm < 7 && c.tier >= 2);
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

/* ---------- Save/Load qua Online (stub localStorage) ---------- */
function saveGame(state) { Online.save(state); }
function loadGame() { return Online.load(); }

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    todayStr, defaultState, bumpKill,
    dungeonQuota, dungeonLeft, dungeonEnter, dungeonBuy,
    startDungeonRun, clearDungeonRun, vanTienCacUnlocked,
    addItem, removeItem, countItem, gainExp, canBreakthrough, doBreakthrough,
  };
}
