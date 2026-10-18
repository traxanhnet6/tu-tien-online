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

  /* Roll rớt đồ: drops = [{id, rate, min, max}] */
  function rollDrops(monDef) {
    var out = [];
    var drops = (monDef && monDef.drops) || [];
    for (var i = 0; i < drops.length; i++) {
      var dr = drops[i];
      if (Math.random() < (dr.rate || 0)) {
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
  };
}
