/* ============================================================
 * js/combat.js — Logic chiến đấu THUẦN LOGIC, không DOM.
 * Chạy được trên node (mọi gọi AudioSys đều có guard).
 * - calcDamage(atk, def, mult) → số nguyên ≥ 1
 * - playerStrike(playerStats, mon) → {dmg} (trừ hp quái trong object,
 *   tự phát hit/death theo loài qua AudioSys.sfxLoaiQuai)
 * - monsterStrike(mon, playerStats) → {dmg}
 * - rollDrops(monDef) → [{id, qty}] theo drops + tỉ lệ
 * - stoneDrop(mapDef) → số Linh Thạch theo stoneDrop [min, max]
 * - redeemGift(code, GIFT_CODES) → {ok, reward?} (không đụng state)
 * - aggro(monId) / bossSkill(monId) — engine gọi khi quái xuất
 *   hiện / boss tung skill
 * ============================================================ */

function _audio() {
  return (typeof AudioSys !== 'undefined') ? AudioSys : null;
}

var Combat = (function () {
  'use strict';

  /* Sát thương = (atk - def*0.6) * mult, làm tròn, tối thiểu 1 */
  function calcDamage(atk, def, mult) {
    mult = (typeof mult === 'number' && mult > 0) ? mult : 1;
    var d = Math.round((atk - def * 0.6) * mult);
    return d < 1 ? 1 : d;
  }

  function _monIdOf(mon) {
    return (mon && (mon.monId || mon.id)) || '';
  }

  /* Player đánh quái: trừ hp trực tiếp trên object mon */
  function playerStrike(playerStats, mon) {
    var dmg = calcDamage(playerStats.atk, mon.def, 1);
    mon.hp -= dmg;
    var A = _audio();
    if (A) {
      try {
        var s = A.sfxLoaiQuai(_monIdOf(mon));
        if (mon.hp <= 0) s.death(); else s.hit();
      } catch (e) {}
    }
    return { dmg: dmg };
  }

  /* Quái đánh player: không trừ hp ở đây, engine tự trừ */
  function monsterStrike(mon, playerStats) {
    var dmg = calcDamage(mon.atk, playerStats.def, 1);
    return { dmg: dmg };
  }

  /* Roll rớt đồ: drops = [{id, rate, eliteRate, min, max}]
     eliteRate: tỉ lệ khi quái là tinh anh (vd bí tịch boss 8% → 15%) */
  function rollDrops(monDef, isElite) {
    var out = [];
    var drops = (monDef && monDef.drops) || [];
    for (var i = 0; i < drops.length; i++) {
      var dr = drops[i];
      var rate = (isElite && dr.eliteRate != null) ? dr.eliteRate : (dr.rate || 0);
      if (Math.random() < rate) {
        var min = dr.min || 1, max = dr.max || min;
        var qty = min + Math.floor(Math.random() * (max - min + 1));
        out.push({ id: dr.id, qty: qty });
      }
    }
    return out;
  }

  /* Linh Thạch rớt theo map: stoneDrop = [min, max] */
  function stoneDrop(mapDef) {
    var r = (mapDef && mapDef.stoneDrop) || [1, 5];
    var min = r[0], max = r[1];
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  /* Đổi giftcode: so khớp không phân biệt hoa/thường, không đụng state */
  function redeemGift(code, GIFT_CODES) {
    var c = String(code == null ? '' : code).trim().toUpperCase();
    if (!c || !GIFT_CODES) return { ok: false };
    var keys = Object.keys(GIFT_CODES);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].toUpperCase() === c) {
        return { ok: true, reward: GIFT_CODES[keys[i]] };
      }
    }
    return { ok: false };
  }

  /* Quái xuất hiện: gầm aggro theo loài */
  function aggro(monId) {
    var A = _audio();
    if (A) { try { A.sfxLoaiQuai(monId).aggro(); } catch (e) {} }
  }

  /* Sát thương xuyên giáp: bỏ qua pierce (0..1) phần def */
  function pierceDamage(atk, def, mult, pierce) {
    var p = (typeof pierce === 'number' && pierce > 0) ? Math.min(1, pierce) : 0;
    var d = Math.round((atk - def * 0.6 * (1 - p)) * (mult || 1));
    return d < 1 ? 1 : d;
  }

  /* Điểm (px,py) có nằm trong vòng AoE tâm (x,y) bán kính r? */
  function aoeHits(x, y, r, px, py) {
    var dx = px - x, dy = py - y;
    return dx * dx + dy * dy <= r * r;
  }

  /* Cửa sổ SƠ HỞ: boss lộ điểm yếu → sát thương +25% */
  function weaknessMult(isWeak) { return isWeak ? 1.25 : 1; }

  /* Boss tung skill: âm dậm chân + gầm cảnh báo */
  function bossSkill(monId) {
    var A = _audio();
    if (A) { try { A.sfxLoaiQuai(monId).skill(); } catch (e) {} }
  }

  return {
    calcDamage: calcDamage,
    playerStrike: playerStrike,
    monsterStrike: monsterStrike,
    rollDrops: rollDrops,
    stoneDrop: stoneDrop,
    redeemGift: redeemGift,
    aggro: aggro,
    bossSkill: bossSkill,
    pierceDamage: pierceDamage,
    aoeHits: aoeHits,
    weaknessMult: weaknessMult,
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calcDamage: Combat.calcDamage,
    playerStrike: function (ps, mon) { return Combat.playerStrike(ps, mon); },
    monsterStrike: function (mon, ps) { return Combat.monsterStrike(mon, ps); },
    rollDrops: Combat.rollDrops,
    stoneDrop: Combat.stoneDrop,
    redeemGift: Combat.redeemGift,
    aggro: Combat.aggro,
    bossSkill: Combat.bossSkill,
    pierceDamage: Combat.pierceDamage,
    aoeHits: Combat.aoeHits,
    weaknessMult: Combat.weaknessMult,
  };
}
