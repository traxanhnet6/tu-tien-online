/* ============================================================
 * js/tower.js — Thông Thiên Tháp + Sự kiện theo ngày (Kỹ sư Gameplay)
 * Thuần logic, không DOM, chạy được trên node (smoke test).
 * - Tháp 100 tầng: quái mạnh dần theo tầng, tầng % 10 == 0 là boss.
 * - 3 lượt leo/ngày, reset 0h. Lưu tầng cao nhất + lịch sử + rương mốc.
 * - Sự kiện theo ngày trong tuần (getDay(): 0=CN..6=T7):
 *   T2 quái Hỏa/thưởng Linh Thạch x2 · T3 quái Băng/rớt đan x2 ·
 *   T4 boss tinh anh/rớt đồ x2 · T5 exp x2 · T6 Yêu Đan x2 ·
 *   T7 bí tịch x2 · CN tất cả x1.5 + boss tháp đặc biệt.
 * - BXH tuần (top 10 lượt leo trong tuần, reset thứ 2 0h).
 * Dữ liệu gốc: data/tower.json (TOWER_DEF mirror ở đây để chạy
 * file:// + node; test kiểm tra 2 nơi đồng bộ).
 * ============================================================ */

var TOWER_DEF = {
  floors: 100,
  triesPerDay: 3,
  basePower: 30,
  growth: 1.06,
  bossEvery: 10,
  bossMult: 1.5,
  milestones: [10, 25, 50, 75, 100],
  milestoneChests: {
    "10":  { stones: 500,   items: [["dan_hx_trung", 3], ["trung_pham", 1]] },
    "25":  { stones: 1500,  items: [["dan_hl_trung", 3], ["manual_kiem_2", 1]] },
    "50":  { stones: 4000,  items: [["dan_dien_tho", 1], ["ho_mach_dan", 2]] },
    "75":  { stones: 9000,  items: [["dan_truong_sinh", 1], ["manual_phap_3", 1]] },
    "100": { stones: 20000, items: [["dan_truong_sinh", 2], ["manual_boss_thientuong", 1]] }
  },
  /* key = JS getDay() */
  events: {
    "1": { id: "hoa",      icon: "🔥", nameKey: "tw_ev_hoa",      descKey: "tw_ev_hoa_desc",      element: "hoa",  stoneMult: 2 },
    "2": { id: "bang",     icon: "❄️", nameKey: "tw_ev_bang",     descKey: "tw_ev_bang_desc",     element: "bang", pillMult: 2 },
    "3": { id: "tinh_anh", icon: "👹", nameKey: "tw_ev_tinh_anh", descKey: "tw_ev_tinh_anh_desc", elite: true,     equipMult: 2 },
    "4": { id: "exp",      icon: "✨", nameKey: "tw_ev_exp",      descKey: "tw_ev_exp_desc",      expMult: 2 },
    "5": { id: "yeu_dan",  icon: "🟣", nameKey: "tw_ev_yeu_dan",  descKey: "tw_ev_yeu_dan_desc",  yaodanMult: 2 },
    "6": { id: "bi_tich",  icon: "📜", nameKey: "tw_ev_bi_tich",  descKey: "tw_ev_bi_tich_desc",  manualMult: 2 },
    "0": { id: "dai_hoi",  icon: "🌟", nameKey: "tw_ev_dai_hoi",  descKey: "tw_ev_dai_hoi_desc",  allMult: 1.5, specialBoss: true }
  }
};

var Tower = (function () {
  "use strict";
  var D = TOWER_DEF;

  function dayKey(d) {
    d = d || new Date();
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }
  function weekKey(d) {
    d = d || new Date();
    var onejan = new Date(d.getFullYear(), 0, 1);
    var w = Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
    return d.getFullYear() + "-W" + w;
  }

  /* Khởi tạo field thiếu (save cũ / node test). */
  function ensure(state) {
    if (!state) return state;
    if (!state.tower || typeof state.tower !== "object") {
      state.tower = { best: 0, dayKey: "", triesLeft: D.triesPerDay, weekKey: "", runs: [], chests: {}, history: [] };
    }
    var tw = state.tower;
    if (tw.best == null) tw.best = 0;
    if (!Array.isArray(tw.runs)) tw.runs = [];
    if (!tw.chests || typeof tw.chests !== "object") tw.chests = {};
    if (!Array.isArray(tw.history)) tw.history = [];
    /* reset lượt theo ngày */
    var dk = dayKey();
    if (tw.dayKey !== dk) { tw.dayKey = dk; tw.triesLeft = D.triesPerDay; }
    /* reset BXH theo tuần (thứ 2 0h ≈ tuần mới) */
    var wk = weekKey();
    if (tw.weekKey !== wk) { tw.weekKey = wk; tw.runs = []; }
    if (tw.triesLeft == null) tw.triesLeft = D.triesPerDay;
    return state;
  }

  /* Sự kiện hôm nay */
  function todayEvent(nowMs) {
    var d = nowMs ? new Date(nowMs) : new Date();
    var ev = D.events[String(d.getDay())] || D.events["1"];
    return ev;
  }

  /* Sức mạnh quái tầng f (đã tính boss tầng + sự kiện tinh anh CN) */
  function floorPower(floor, ev) {
    var p = D.basePower * Math.pow(D.growth, floor);
    if (floor % D.bossEvery === 0) p *= D.bossMult;
    if (ev && ev.specialBoss && floor % D.bossEvery === 0) p *= 1.25; /* boss đặc biệt CN */
    if (ev && ev.elite && floor % D.bossEvery === 0) p *= 1.2;       /* boss tinh anh T4 */
    return Math.round(p);
  }
  function isBossFloor(floor) { return floor % D.bossEvery === 0; }

  /* Lực chiến tổng hợp từ stats {atk, def, maxHp, maxMp} */
  function playerPower(stats) {
    stats = stats || {};
    return (stats.atk || 0) * 3 + (stats.def || 0) * 2 +
           (stats.maxHp || 0) / 8 + (stats.maxMp || 0) / 16;
  }

  /* Tỉ lệ thắng 1 tầng (người chơi hơn → cao hơn 50%) */
  function winChance(pw, fw) {
    if (fw <= 0) return 1;
    var x = (pw * 1.1) / (pw * 1.1 + fw);
    return Math.max(0.05, Math.min(0.97, x));
  }

  function triesLeft(state) { ensure(state); return state.tower.triesLeft; }
  function canClimb(state) { return triesLeft(state) > 0; }

  /* Phần thưởng 1 tầng (chưa gồm rương mốc) */
  function floorReward(floor, ev) {
    ev = ev || {};
    var all = ev.allMult || 1;
    var stones = Math.round(floor * 10 * (ev.stoneMult || 1) * all);
    var exp = Math.round(floor * 8 * (ev.expMult || 1) * all);
    var drops = [];
    /* đan dược: tầng chẵn, x2 vào T3 */
    if (floor % 2 === 0) drops.push({ id: "dan_hx_tieu", qty: 1, mult: (ev.pillMult || 1) * all, kind: "pill" });
    /* yêu đan: tầng % 5 == 0, x2 vào T6 */
    if (floor % 5 === 0) drops.push({ id: "yaodan2", qty: 1, mult: (ev.yaodanMult || 1) * all, kind: "yaodan" });
    /* đồ trang bị: boss tầng, x2 vào T4 */
    if (isBossFloor(floor)) drops.push({ id: "trung_pham", qty: 1, mult: (ev.equipMult || 1) * all, kind: "equip" });
    /* bí tịch: tầng % 25 == 0, x2 vào T7 */
    if (floor % 25 === 0) drops.push({ id: "manual_kiem_1", qty: 1, mult: (ev.manualMult || 1) * all, kind: "manual" });
    return { stones: stones, exp: exp, drops: drops, boss: isBossFloor(floor), element: ev.element || null };
  }

  /* Rương mốc (chỉ nhận 1 lần/mốc) — trả null nếu đã nhận */
  function milestoneChest(state, floor) {
    ensure(state);
    var key = String(floor);
    if (D.milestones.indexOf(floor) < 0) return null;
    if (state.tower.chests[key]) return null;
    state.tower.chests[key] = true;
    var c = D.milestoneChests[key];
    return { stones: c.stones, items: c.items.map(function (it) { return { id: it[0], qty: it[1] }; }) };
  }

  /* Leo 1 lượt: trừ lượt, đánh từng tầng đến khi thua hoặc hết 100.
     rng: hàm random (mặc định Math.random) — test truyền hàm cố định.
     Trả {floors, log:[{floor,win,boss}], rewards:{stones,exp,items[]}, chests:[], newBest} */
  function climb(state, stats, nowMs, rng) {
    ensure(state);
    rng = rng || Math.random;
    if (!canClimb(state)) return { ok: false, reason: "no_tries" };
    state.tower.triesLeft--;
    var ev = todayEvent(nowMs);
    var pw = playerPower(stats);
    var log = [], floors = 0;
    var stones = 0, exp = 0, items = [], chests = [];
    for (var f = 1; f <= D.floors; f++) {
      var fw = floorPower(f, ev);
      var win = rng() < winChance(pw, fw);
      log.push({ floor: f, win: win, boss: isBossFloor(f) });
      if (!win) break;
      floors = f;
      var rw = floorReward(f, ev);
      stones += rw.stones; exp += rw.exp;
      rw.drops.forEach(function (dp) {
        var q = Math.max(1, Math.round(dp.qty * dp.mult));
        items.push({ id: dp.id, qty: q, kind: dp.kind });
      });
      var chest = milestoneChest(state, f);
      if (chest) {
        chests.push({ floor: f, stones: chest.stones, items: chest.items });
        stones += chest.stones;
        chest.items.forEach(function (it) { items.push({ id: it.id, qty: it.qty, kind: "chest" }); });
      }
    }
    var newBest = false;
    if (floors > state.tower.best) { state.tower.best = floors; newBest = true; }
    recordRun(state, floors, nowMs);
    return { ok: true, floors: floors, log: log, rewards: { stones: stones, exp: exp, items: items }, chests: chests, newBest: newBest, event: ev.id };
  }

  /* Ghi lượt leo vào BXH tuần (giữ top 20, hiển thị top 10) */
  function recordRun(state, floor, nowMs) {
    ensure(state);
    state.tower.runs.push({ floor: floor, ts: nowMs || Date.now() });
    state.tower.runs.sort(function (a, b) { return b.floor - a.floor; });
    state.tower.runs = state.tower.runs.slice(0, 20);
    /* lịch sử 7 ngày gần nhất */
    var dk = dayKey(nowMs ? new Date(nowMs) : new Date());
    var h = state.tower.history;
    var last = h[h.length - 1];
    if (last && last.day === dk) last.best = Math.max(last.best, floor);
    else { h.push({ day: dk, best: floor }); if (h.length > 7) h.shift(); }
  }
  function weeklyBoard(state) {
    ensure(state);
    return state.tower.runs.slice(0, 10);
  }

  return {
    DEF: D,
    ensure: ensure,
    dayKey: dayKey,
    weekKey: weekKey,
    todayEvent: todayEvent,
    floorPower: floorPower,
    isBossFloor: isBossFloor,
    playerPower: playerPower,
    winChance: winChance,
    triesLeft: triesLeft,
    canClimb: canClimb,
    floorReward: floorReward,
    milestoneChest: milestoneChest,
    climb: climb,
    recordRun: recordRun,
    weeklyBoard: weeklyBoard
  };
})();

/* node export cho smoke test */
if (typeof module !== "undefined" && module.exports) {
  module.exports = { Tower: Tower, TOWER_DEF: TOWER_DEF };
}
