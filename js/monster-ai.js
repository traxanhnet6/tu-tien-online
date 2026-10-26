/* ============================================================
 * js/monster-ai.js — AI quái + dân? KHÔNG: chỉ quái (dân trấn
 * đi lại nằm ở js/ambient-life.js). Chuẩn tutien2d đã phân tích
 * (Bui 2026-10-26, quan sát live tại Mỏ Linh Thạch):
 *  - Quái ĐI LANG THANG trong bãi, TRUY ĐUỔI người chơi khi lại
 *    gần; vào tầm đánh thì ĐỨNG YÊN, để hệ combat sẵn có của
 *    engine xử lý sát thương (module này chỉ di chuyển, không
 *    gây sát thương, không chạm combat).
 *  - Quái bị đánh còn ít máu VẪN ĐỨNG ĐÁNH TỚI CHẾT: module này
 *    CỐ TÌNH KHÔNG có nhánh chạy trốn (flee), KHÔNG đặt kx/ky
 *    giật lùi. (Lưu ý: engine.js hiện còn nhánh flee HP < 25%
 *    và quán tính kx/ky ở _updateMonsters — file HOOK đi kèm
 *    hướng dẫn coordinator bypass 2 chỗ đó, nếu không hook thì
 *    hành vi cũ vẫn thắng.)
 *  - Quá xa bãi thì QUAY VỀ, không đuổi vô hạn (leash).
 *  - HỒI SINH: KHÔNG tự làm — dùng cơ chế sẵn có của engine
 *    (_updateRespawn: respawn đúng trong bãi spawnZones, mỗi
 *    2.5s kiểm tra một lần).
 *
 * Cách gắn (coordinator áp theo js/monster-ai-HOOK.txt, KHÔNG
 * sửa engine.js ở đây): thẻ script sau js/tilemap.js; gọi
 * MonsterAI.updateOne(m, player, dt, ctx) trong _updateMonsters
 * rồi bỏ qua khối AI inline cũ khi nó trả về true.
 *
 * Va chạm: CHỈ đi qua ô đi bộ được, dùng đúng hàm của Tilemap
 * mà engine cũng dùng — Tilemap.isBlocked(mapId, x, y, false)
 * (flying=false, tức chế độ đi bộ; tương đương hàm nội bộ
 * _tileBlockedWalk của engine). Quái đi bộ nên bay cũng không
 * qua được nước/cây/nhà/vách đá; map chưa có tilemap thì
 * isBlocked trả false, giữ hành vi cũ. Di chuyển trượt theo
 * từng trục như _moveBy của engine (thử cả 2 trục, rồi từng
 * trục) để không kẹt góc.
 *
 * Trạng thái (m.aiState, đọc qua MonsterAI.stateOf(m)):
 *  - 'wander': đi chậm (0.3x tốc) tới điểm đi bộ được ngẫu
 *    nhiên trong bãi, tới nơi hoặc hết lượt thì 'idle' nghỉ
 *    ngẫu nhiên 1–3s rồi đi tiếp.
 *  - 'chase': người chơi cùng map trong tầm CHASE_RANGE (220px)
 *    thì tiến lại gần với tốc độ đầy đủ (thường 70, boss 95 —
 *    khớp tốc độ engine đang dùng).
 *  - 'fight': đã vào tầm đánh MELEE_RANGE (52px, khớp ngưỡng
 *    engine ra đòn d <= 52) thì ĐỨNG YÊN — combat xử lý. Thấp
 *    máu cũng ở đây, không chạy, không hất văng.
 *  - 'return': xa bãi quá LEASH (600px) mà người chơi cũng đã
 *    ngoài tầm đuổi thì đi về bãi với 0.8x tốc, tới gần bãi
 *    thì lại 'wander'. Truy đuổi được ưu tiên hơn quay về khi
 *    người chơi còn trong tầm (khớp thứ tự leash/chase cũ).
 *
 * Bãi (home): quái có m.zone + ctx.zones thì lấy tâm/bán kính
 * bãi đó; không có thì lấy điểm spawn (m.sx, m.sy) + bán kính
 * mặc định 150px. ctx.worldW/worldH để kẹp biên map (hook
 * truyền WORLD_W/WORLD_H của engine); thiếu thì 1600x1200.
 *
 * Node-safe: không require, không chạm DOM/canvas; global
 * MonsterAI, có module.exports để test-smoke/test Node dùng.
 * ============================================================ */
var MonsterAI = (function () {
  'use strict';

  var CHASE_RANGE = 220;   /* tầm truy đuổi (px) — chuẩn task, khác MONSTER_AGGRO=300 cũ */
  var MELEE_RANGE = 52;    /* vào tầm này thì đứng yên, combat engine xử lý (khớp d <= 52) */
  var LEASH = 600;         /* xa bãi quá mức này + player ngoài tầm -> quay về */
  var WANDER_R_DEFAULT = 150;
  var SPEED_NORMAL = 70, SPEED_BOSS = 95; /* khớp spd của engine: (boss ? 95 : 70) */
  var SEP_DIST = 36, SEP_PUSH = 40;       /* separation: khớp ngưỡng/đẩy của engine */

  function _clampDt(dt) {
    if (!dt || dt <= 0) return 0.016;
    return dt > 0.25 ? 0.25 : dt;
  }

  /* Va chạm đi bộ: đúng Tilemap.isBlocked(mapId, x, y, false).
   * Map chưa có tilemap / Tilemap chưa nạp -> không chặn. */
  function _blocked(ctx, x, y) {
    try {
      if (typeof Tilemap !== 'undefined' && Tilemap && Tilemap.isBlocked)
        return !!Tilemap.isBlocked(ctx.mapId, x, y, false);
    } catch (e) {}
    return false;
  }

  function _angLerp(a, b, t) {
    if (a == null) return b;
    var d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
  }

  /* Di chuyển có va chạm, trượt theo trục (như _moveBy của engine).
   * Trả về true nếu vị trí thực sự đổi. */
  function _step(m, dx, dy, step, ctx) {
    var w = (ctx && ctx.worldW > 0) ? ctx.worldW : 1600;
    var h = (ctx && ctx.worldH > 0) ? ctx.worldH : 1200;
    var nx = Math.max(20, Math.min(w - 20, m.x + dx * step));
    var ny = Math.max(20, Math.min(h - 20, m.y + dy * step));
    var ox = m.x, oy = m.y;
    if (!_blocked(ctx, nx, ny)) { m.x = nx; m.y = ny; }
    else if (!_blocked(ctx, nx, oy)) { m.x = nx; }
    else if (!_blocked(ctx, ox, ny)) { m.y = ny; }
    /* else: kẹt góc — đứng yên */
    return (m.x !== ox || m.y !== oy);
  }

  function _moveToward(m, tx, ty, speed, dt, ctx, turnRate) {
    var dx = tx - m.x, dy = ty - m.y;
    var d = Math.hypot(dx, dy);
    if (d < 6) return true;
    var moved = _step(m, dx / d, dy / d, speed * dt, ctx);
    var a = Math.atan2(dy, dx);
    m.ang = _angLerp(m.ang, a, Math.min(1, dt * (turnRate || 6)));
    if (moved) m._lastMove = Date.now();
    return false;
  }

  /* Tâm + bán kính bãi của quái. */
  function _home(m, ctx) {
    var zones = (ctx && ctx.zones) || null;
    if (zones && m.zone != null && zones[m.zone])
      return { x: zones[m.zone].x, y: zones[m.zone].y, r: zones[m.zone].r || WANDER_R_DEFAULT };
    return { x: (m.sx != null ? m.sx : m.x), y: (m.sy != null ? m.sy : m.y), r: WANDER_R_DEFAULT };
  }

  /* Chọn điểm lang thang đi bộ được trong bãi (thử tối đa 8 lần). */
  function _pickWander(m, home, ctx) {
    for (var t = 0; t < 8; t++) {
      var a = Math.random() * Math.PI * 2;
      var d = Math.sqrt(Math.random()) * home.r;
      var p = { x: home.x + Math.cos(a) * d, y: home.y + Math.sin(a) * d };
      if (!_blocked(ctx, p.x, p.y)) return p;
    }
    return null; /* không tìm được ô đi được -> đứng nghỉ */
  }

  /* Separation: đẩy nhau ra nếu chồng lấn (khớp engine, có kiểm
   * tra va chạm ô để không bị đẩy xuyên tường/cây). */
  function _separate(m, ctx, dt) {
    var list = (ctx && ctx.monsters) || null;
    if (!list) return;
    for (var i = 0; i < list.length; i++) {
      var o = list[i];
      if (o === m || o.dead) continue;
      var dx = m.x - o.x, dy = m.y - o.y;
      var d = Math.hypot(dx, dy);
      if (d > 0 && d < SEP_DIST) _step(m, dx / d, dy / d, SEP_PUSH * dt, ctx);
    }
  }

  /* Một bước AI cho 1 quái. Trả về true = đã xử lý di chuyển
   * (hook bỏ qua khối AI inline cũ); false = để engine xử lý
   * như cũ (choáng/sợ hãi từ thần thú, quái đã chết...).
   * CỐ TÌNH: không nhánh flee, không đặt kx/ky — thấp máu vẫn
   * chase/fight tới chết. */
  function updateOne(m, player, dt, ctx) {
    if (!m || m.dead || (m.dieT > 0)) return false;
    if (!player) return false;
    /* Choáng/sợ hãi (sbDb) do engine xử lý trước — không tranh. */
    if (m.sbDb) {
      if ((m.sbDb.stunT || 0) > 0 || (m.sbDb.fearT || 0) > 0) return false;
    }
    dt = _clampDt(dt);
    ctx = ctx || {};
    if (ctx.mapId == null) ctx.mapId = 0;
    /* Không hất văng: xóa quán tính giật lùi combat đã đặt (hook
     * gọi updateOne TRƯỚC khối kx của engine nên khối đó thấy 0
     * và không đẩy quái đi — xem HOOK.txt). */
    m.kx = 0; m.ky = 0;

    var spd = (m.boss ? SPEED_BOSS : SPEED_NORMAL);
    /* Chậm từ thần thú (sbDb.slowT) — khớp sbSlowMult = 0.5 của engine. */
    if (m.sbDb && (m.sbDb.slowT || 0) > 0) spd *= 0.5;
    var home = _home(m, ctx);
    var dPlayer = Math.hypot(player.x - m.x, player.y - m.y);
    var dHome = Math.hypot(m.x - home.x, m.y - home.y);
    var playerAlive = !(player.hp != null && player.hp <= 0);

    /* Ưu tiên 1: truy đuổi khi player trong tầm (kể cả khi quái
     * đã chạy quá leash — chỉ buông khi player ra khỏi tầm). */
    if (playerAlive && dPlayer <= CHASE_RANGE) {
      if (dPlayer <= MELEE_RANGE) {
        m.aiState = 'fight'; /* đứng yên, combat engine ra đòn */
      } else {
        m.aiState = 'chase';
        _moveToward(m, player.x, player.y, spd, dt, ctx, m.boss ? 4 : 6);
      }
    } else if (dHome > LEASH) {
      /* Ưu tiên 2: quá xa bãi + player ngoài tầm -> quay về. */
      m.aiState = 'return';
      m.aiTx = null; m.aiTy = null;
      if (dHome <= Math.max(home.r, 100)) m.aiState = 'wander';
      else _moveToward(m, home.x, home.y, spd * 0.8, dt, ctx, 6);
    } else {
      /* Ưu tiên 3: lang thang trong bãi + nghỉ ngẫu nhiên. */
      if (m.aiIdleT > 0) {
        m.aiIdleT -= dt;
        m.aiState = 'idle';
      } else {
        m.aiState = 'wander';
        if (m.aiTx == null || m.aiTy == null) {
          var p = _pickWander(m, home, ctx);
          if (!p) { m.aiIdleT = 1 + Math.random() * 2; return true; }
          m.aiTx = p.x; m.aiTy = p.y;
        }
        var arrived = _moveToward(m, m.aiTx, m.aiTy, spd * 0.3, dt, ctx, 6);
        if (arrived) {
          m.aiTx = null; m.aiTy = null;
          m.aiIdleT = 1 + Math.random() * 2; /* dừng nghỉ ngẫu nhiên */
        }
      }
    }
    _separate(m, ctx, dt);
    return true;
  }

  /* Cập nhật cả đàn quái mỗi frame (hook có thể gọi hàm này
   * thay cho updateOne từng con — separation vẫn đúng). */
  function update(monsters, player, dt, ctx) {
    if (!monsters) return 0;
    var n = 0;
    for (var i = 0; i < monsters.length; i++)
      if (updateOne(monsters[i], player, dt, ctx)) n++;
    return n;
  }

  return {
    CHASE_RANGE: CHASE_RANGE,
    MELEE_RANGE: MELEE_RANGE,
    LEASH: LEASH,
    updateOne: updateOne,
    update: update,
    stateOf: function (m) { return (m && m.aiState) || 'wander'; },
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = MonsterAI;
