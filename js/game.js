/* Logic game chính: chiến đấu, tu luyện, đột phá, shop, nhiệm vụ. */
const GAME = {
  state: null,
  hp: 100, mp: 50,
  target: null,          // {key, hp, maxHp, boss}
  atkCd: 0, mobCd: 0,
  stats: null,           // chỉ số đã tính
  tickN: 0,
};

function minorIndex(realm, tier) {
  if (realm === 0) return -1;
  if (realm === 1) return tier;
  return 12 + (realm - 2) * 3 + tier;
}

/* ---------- khởi tạo ---------- */
function initGame(state) {
  GAME.state = state;
  recalc();
  GAME.hp = Math.min(state.hp || GAME.stats.maxHp, GAME.stats.maxHp);
  GAME.mp = Math.min(state.mp || GAME.stats.maxMp, GAME.stats.maxMp);
  setInterval(gameTick, 500);
  renderAll();
}

function recalc() {
  const s = GAME.state;
  const b = baseStats(s.realm, s.tier);
  let atk = b.atk, def = b.def, hp = b.maxHp, mp = b.maxMp;
  for (const slot of ['weapon', 'armor', 'acc']) {
    const eq = s.equip[slot];
    if (!eq) continue;
    const it = ITEMS[eq.id];
    if (!it) continue;
    const mult = eq.locked ? 1.1 : 1; // đồ khóa +10% chỉ số
    atk += Math.round((it.atk || 0) * mult);
    def += Math.round((it.def || 0) * mult);
    hp += Math.round((it.hp || 0) * mult);
  }
  // linh căn hỗn độn: +10% toàn chỉ số
  if (s.linhCan === 'hondon') { atk = Math.round(atk * 1.1); def = Math.round(def * 1.1); }
  GAME.stats = { maxHp: hp, maxMp: mp, atk, def };
  GAME.hp = Math.min(GAME.hp || hp, hp);
  GAME.mp = Math.min(GAME.mp || mp, mp);
}

function realmName(realm = GAME.state.realm, tier = GAME.state.tier) {
  const r = REALMS[realm];
  let s = t(r.key);
  if (r.kind === 'tiers') s += ' ' + (tier + 1) + ' ' + t('tang');
  else if (r.kind === 'stages') s += ' ' + t(STAGE_KEYS[tier]);
  return s;
}

function playerPower() { return powerLevel(GAME.state.realm, GAME.state.tier); }

/* ---------- tạo nhân vật ---------- */
function createCharacter(name) {
  GAME.state.name = (name || '').trim() || 'Vô Danh';
  GAME.state.created = true;
  GAME.state.realm = 0; GAME.state.tier = 0;
  GAME.state.exp = 0;
  recalc();
  GAME.hp = GAME.stats.maxHp; GAME.mp = GAME.stats.maxMp;
  saveGame();
  renderAll();
}

/* ---------- nhiệm vụ tẩy cốt ---------- */
function rollLinhCan() {
  const r = Math.random() * 100;
  let acc = 0;
  for (const [el, rate] of LINGEN_RATES) {
    acc += rate;
    if (r < acc) return el;
  }
  return 'kim';
}
function doTayCot() {
  const s = GAME.state;
  if (s.quest.taycot !== 'active' || s.quest.herb < 5) return false;
  removeItem('taycothao', 5);
  s.linhCan = rollLinhCan();
  s.quest.taycot = 'done';
  s.realm = 1; s.tier = 0; s.exp = 0;
  if (!s.skills.includes('elemental')) s.skills.push('elemental');
  recalc();
  GAME.hp = GAME.stats.maxHp; GAME.mp = GAME.stats.maxMp;
  saveGame();
  return true;
}

/* ---------- chiến đấu ---------- */
function currentMap() { return MAPS[GAME.state.map]; }

function spawnMonster(forceKey) {
  const map = currentMap();
  let key = forceKey;
  if (!key) {
    const pool = map.monsters;
    key = pool[Math.floor(Math.random() * pool.length)];
  }
  const m = MONSTERS[key];
  const boss = !!m.boss;
  GAME.target = { key, hp: m.hp, maxHp: m.hp, boss };
  GAME.mobCd = 0;
  renderCombat();
}

function bossAlive(mapId) {
  const deadAt = GAME.state.bossDead[mapId];
  if (!deadAt) return true;
  return Date.now() - deadAt > 120000; // hồi sinh sau 120s (v1)
}
function bossCountdown(mapId) {
  const deadAt = GAME.state.bossDead[mapId];
  if (!deadAt) return 0;
  return Math.max(0, Math.ceil((120000 - (Date.now() - deadAt)) / 1000));
}

function playerAttack(skillId) {
  const tgt = GAME.target;
  if (!tgt || tgt.hp <= 0) return;
  const st = GAME.stats;
  let dmg, fx;
  if (skillId === 'sword_qi') {
    if (GAME.mp < SKILLS.sword_qi.mp) { toast(t('skill_not_enough_mp')); return; }
    GAME.mp -= SKILLS.sword_qi.mp;
    dmg = Math.round(st.atk * SKILLS.sword_qi.mult);
    fx = SKILLS.sword_qi.fx;
  } else if (skillId === 'elemental') {
    const el = ELEMENTS[GAME.state.linhCan];
    if (!el) return;
    if (GAME.mp < SKILLS.elemental.mp) { toast(t('skill_not_enough_mp')); return; }
    GAME.mp -= SKILLS.elemental.mp;
    dmg = Math.round(st.atk * SKILLS.elemental.mult);
    fx = el.fx;
  } else {
    dmg = Math.max(1, st.atk - Math.round(MONSTERS[tgt.key].def * 0.5));
    fx = null;
  }
  // dao động sát thương ±10%
  dmg = Math.max(1, Math.round(dmg * (0.9 + Math.random() * 0.2)));
  tgt.hp -= dmg;
  showFx(fx, 'enemy');
  floatText('#enemy-sprite', '-' + dmg, 'dmg');
  shakeScreen();
  if (tgt.hp <= 0) { monsterDie(); return; }
  renderCombat();
}

function monsterAttack() {
  const tgt = GAME.target;
  if (!tgt || tgt.hp <= 0) return;
  const m = MONSTERS[tgt.key];
  const dmg = Math.max(1, m.atk - Math.round(GAME.stats.def * 0.6));
  GAME.hp -= dmg;
  floatText('#player-sprite', '-' + dmg, 'dmg-p');
  if (GAME.hp <= 0) {
    GAME.hp = 0;
    toast(t('you_died'));
    GAME.target = null;
    setTimeout(() => {
      GAME.hp = GAME.stats.maxHp; GAME.mp = GAME.stats.maxMp;
      renderAll();
    }, 1500);
  }
  renderBars();
}

function monsterDie() {
  const tgt = GAME.target;
  const m = MONSTERS[tgt.key];
  const s = GAME.state;
  const map = currentMap();
  s.stats.kills++;
  toast(t('victory'));
  // EXP (kèm thưởng vượt cấp)
  const diff = m.power - playerPower();
  const bonus = diff > 0 ? Math.min(2.0, diff * 0.2) : 0;
  gainExp(Math.round(m.exp * (1 + bonus)));
  // Rớt Linh Thạch — chống farm lệch cấp
  const overfarmed = s.realm > map.realm + 1;
  if (overfarmed) {
    toast(t('no_drop_gap'));
  } else {
    const n = map.stoneDrop[0] + Math.floor(Math.random() * (map.stoneDrop[1] - map.stoneDrop[0] + 1));
    s.linhThach += n;
    toast(t('drop_stone', { n }));
    // Rớt vật phẩm của boss
    if (m.drops) for (const d of m.drops) {
      if (Math.random() < d.rate) {
        const q = d.min + Math.floor(Math.random() * (d.max - d.min + 1));
        addItem(d.id, q, false);
        toast(t('drop_item', { name: itemName(d.id) + ' x' + q }));
      }
    }
    // Tẩy Cốt Thảo cho nhiệm vụ (chỉ khi đang làm)
    if (s.quest.taycot === 'active' && tgt.key === 'da_tru' && s.quest.herb < 5 && Math.random() < 0.6) {
      addItem('taycothao', 1, false);
      s.quest.herb++;
      toast(t('drop_item', { name: t('item_taycothao') + ' (' + s.quest.herb + '/5)' }));
    }
    // Rớt đan hồi phục ngẫu nhiên
    if (!m.boss && Math.random() < 0.08) {
      const pid = Math.random() < 0.5 ? 'pill_hx' : 'pill_hl';
      addItem(pid, 1, false);
      toast(t('drop_item', { name: itemName(pid) }));
    }
  }
  if (m.boss) s.bossDead[map.id] = Date.now();
  GAME.target = null;
  saveGame();
  renderAll();
  // auto: tìm quái mới
  if (s.auto) setTimeout(() => { if (!GAME.target && GAME.hp > 0) spawnMonster(); }, 800);
}

function gainExp(n) {
  const s = GAME.state;
  s.exp += n;
  let max = expMaxFor(s.realm, s.tier);
  while (s.exp >= max) {
    const r = REALMS[s.realm];
    const maxTier = r.kind === 'tiers' ? r.count - 1 : r.kind === 'stages' ? 2 : 0;
    if (s.tier >= maxTier) { s.exp = max; break; } // chờ đột phá
    s.exp -= max;
    s.tier++;
    max = expMaxFor(s.realm, s.tier);
    toast('↑ ' + realmName());
  }
  recalc();
  GAME.hp = Math.min(GAME.hp + 5, GAME.stats.maxHp);
}

/* ---------- đột phá ---------- */
function breakthroughConfig() {
  const s = GAME.state;
  return BREAKTHROUGHS.find(b => b.fromRealm === s.realm && b.fromTier === s.tier && !b.locked) || null;
}
function canBreakthrough() {
  const cfg = breakthroughConfig();
  if (!cfg) return null;
  const s = GAME.state;
  if (s.exp < expMaxFor(s.realm, s.tier)) return null;
  for (const m of cfg.materials) if (bagQty(m.id) < m.qty) return null;
  return cfg;
}
function doBreakthrough() {
  const cfg = canBreakthrough();
  if (!cfg) { toast(t('bt_not_ready')); return; }
  for (const m of cfg.materials) removeItem(m.id, m.qty);
  showTribulation(cfg.tribFx, () => {
    const ok = Math.random() < cfg.rate;
    const s = GAME.state;
    if (ok) {
      s.realm = cfg.toRealm; s.tier = cfg.toTier; s.exp = 0;
      recalc();
      GAME.hp = GAME.stats.maxHp; GAME.mp = GAME.stats.maxMp;
      toast(t('bt_success', { realm: realmName() }));
    } else {
      s.tier = Math.max(0, s.tier - 1); // rớt 1 tiểu cảnh giới
      recalc();
      toast(t('bt_fail', { realm: realmName() }));
    }
    saveGame();
    renderAll();
  });
}

/* ---------- shop Vạn Tiên Các ---------- */
function shopUnlocked() {
  const s = GAME.state;
  return s.realm > SHOP_UNLOCK.realm || (s.realm === SHOP_UNLOCK.realm && s.tier >= SHOP_UNLOCK.tier);
}
function buyItem(id) {
  const it = ITEMS[id];
  if (!it || !it.price) return;
  const s = GAME.state;
  if (s.linhThach < it.price) { toast(t('not_enough_stone')); return; }
  s.linhThach -= it.price;
  addItem(id, 1, false);
  toast(t('buy_ok'));
  saveGame(); renderAll();
}
function sellBagItem(idx) {
  const b = GAME.state.bag[idx];
  if (!b) return;
  if (b.locked) { toast(t('cannot_sell_locked')); return; }
  const it = ITEMS[b.id];
  if (!it || !it.sell) return;
  removeItem(b.id, 1, false);
  GAME.state.linhThach += it.sell;
  toast(t('sell_ok'));
  saveGame(); renderAll();
}

/* ---------- trang bị & đan ---------- */
function wearItem(idx) {
  const b = GAME.state.bag[idx];
  if (!b) return;
  const it = ITEMS[b.id];
  if (!it || it.kind !== 'equip') return;
  if (GAME.state.realm < it.reqRealm) { toast(t('req_realm', { realm: t(REALMS[it.reqRealm].key) })); return; }
  const cur = GAME.state.equip[it.slot];
  if (cur) addItem(cur.id, 1, true); // tháo ra vẫn khóa
  removeItem(b.id, 1, b.locked);
  GAME.state.equip[it.slot] = { id: b.id, locked: true }; // mặc vào tự khóa
  recalc();
  saveGame(); renderAll();
}
function unwearItem(slot) {
  const cur = GAME.state.equip[slot];
  if (!cur) return;
  addItem(cur.id, 1, true);
  GAME.state.equip[slot] = null;
  recalc();
  saveGame(); renderAll();
}
function usePill(id) {
  const it = ITEMS[id];
  if (!it || it.kind !== 'pill' || bagQty(id) < 1) return;
  if (it.healHp) GAME.hp = Math.min(GAME.stats.maxHp, GAME.hp + Math.round(GAME.stats.maxHp * it.healHp));
  if (it.healMp) GAME.mp = Math.min(GAME.stats.maxMp, GAME.mp + Math.round(GAME.stats.maxMp * it.healMp));
  removeItem(id, 1);
  saveGame(); renderBars();
}

/* ---------- map ---------- */
function switchMap(i) {
  const m = MAPS[i];
  if (!m) return;
  if (m.unlock) {
    const s = GAME.state;
    const ok = s.realm > m.unlock.realm || (s.realm === m.unlock.realm && s.tier >= m.unlock.tier);
    if (!ok) { toast(t('map_locked', { n: m.unlock.tier + 1 })); return; }
  }
  GAME.state.map = i;
  GAME.target = null;
  saveGame();
  renderAll();
}

/* ---------- vòng lặp ---------- */
function gameTick() {
  GAME.tickN++;
  const s = GAME.state;
  if (!s || !s.created) return;
  // quái đánh trả
  if (GAME.target && GAME.target.hp > 0) {
    GAME.mobCd++;
    if (GAME.mobCd >= 3) { GAME.mobCd = 0; monsterAttack(); }
    // auto đánh
    if (s.auto) {
      GAME.atkCd++;
      if (GAME.atkCd >= 2) {
        GAME.atkCd = 0;
        // tự dùng đan khi yếu
        if (GAME.hp < GAME.stats.maxHp * 0.3 && bagQty('pill_hx') > 0) usePill('pill_hx');
        else if (GAME.mp < 20 && bagQty('pill_hl') > 0) usePill('pill_hl');
        const el = s.linhCan ? ELEMENTS[s.linhCan] : null;
        if (el && GAME.mp >= SKILLS.elemental.mp) playerAttack('elemental');
        else if (GAME.mp >= SKILLS.sword_qi.mp) playerAttack('sword_qi');
        else playerAttack(null);
      }
    }
  } else if (s.auto && GAME.hp > 0 && !document.hidden) {
    if (GAME.tickN % 4 === 0) spawnMonster();
  }
  // hồi phục chậm ngoài chiến đấu
  if (!GAME.target) {
    GAME.hp = Math.min(GAME.stats.maxHp, GAME.hp + GAME.stats.maxHp * 0.01);
    GAME.mp = Math.min(GAME.stats.maxMp, GAME.mp + GAME.stats.maxMp * 0.02);
    if (GAME.tickN % 2 === 0) renderBars();
  }
  if (GAME.tickN % 20 === 0) { saveGame(); renderBossBtn(); }
}

function itemName(id) {
  const it = ITEMS[id];
  if (!it) return id;
  if (it.kind === 'equip') return t(it.nameKey) + ' ' + t('slot_' + it.slot);
  return t(it.nameKey);
}
