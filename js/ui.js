/* Render giao diện mobile-first. */
let currentScreen = 'map';

function el(id) { return document.getElementById(id); }

/* ---------- toast & hiệu ứng ---------- */
function toast(msg) {
  const box = el('toasts');
  const d = document.createElement('div');
  d.className = 'toast';
  d.textContent = msg;
  box.appendChild(d);
  setTimeout(() => d.classList.add('show'), 10);
  setTimeout(() => { d.classList.remove('show'); setTimeout(() => d.remove(), 400); }, 2200);
  while (box.children.length > 4) box.firstChild.remove();
}
function floatText(sel, txt, cls) {
  const anchor = document.querySelector(sel);
  if (!anchor) return;
  const r = anchor.getBoundingClientRect();
  const layer = el('fx-layer');
  const lr = layer.getBoundingClientRect();
  const d = document.createElement('div');
  d.className = 'float-txt ' + cls;
  d.textContent = txt;
  d.style.left = (r.left - lr.left + r.width / 2) + 'px';
  d.style.top = (r.top - lr.top) + 'px';
  layer.appendChild(d);
  setTimeout(() => d.remove(), 1000);
}
function showFx(fx, target) {
  if (!fx) return;
  const anchor = document.querySelector(target === 'enemy' ? '#enemy-sprite' : '#player-sprite');
  if (!anchor) return;
  const r = anchor.getBoundingClientRect();
  const layer = el('fx-layer');
  const lr = layer.getBoundingClientRect();
  const img = document.createElement('img');
  img.src = 'assets/fx/' + fx + '.png';
  img.className = 'skill-fx';
  img.style.left = (r.left - lr.left + r.width / 2 - 60) + 'px';
  img.style.top = (r.top - lr.top + r.height / 2 - 60) + 'px';
  layer.appendChild(img);
  setTimeout(() => img.remove(), 700);
}
function shakeScreen() {
  const app = el('app');
  app.classList.remove('shake');
  void app.offsetWidth;
  app.classList.add('shake');
}
function showTribulation(fx, done) {
  const layer = el('fx-layer');
  const ov = document.createElement('div');
  ov.className = 'tribulation';
  ov.innerHTML = '<img src="assets/fx/' + fx + '.png"><div class="trib-txt">' + t('bt_tribulation') + '</div>';
  layer.appendChild(ov);
  shakeScreen();
  setTimeout(() => { shakeScreen(); }, 700);
  setTimeout(() => { ov.remove(); done(); }, 1800);
}
function modal(html) {
  closeModal();
  const ov = document.createElement('div');
  ov.className = 'modal-ov';
  ov.id = 'modal';
  ov.innerHTML = '<div class="modal">' + html + '</div>';
  document.body.appendChild(ov);
  ov.addEventListener('click', e => { if (e.target === ov) closeModal(); });
}
function closeModal() { const m = el('modal'); if (m) m.remove(); }

/* ---------- render chính ---------- */
function renderAll() {
  if (!GAME.state.created) { renderCreate(); return; }
  renderHUD();
  renderNav();
  if (currentScreen === 'map') renderMap();
  else if (currentScreen === 'bag') renderBag();
  else if (currentScreen === 'char') renderChar();
  else if (currentScreen === 'shop') renderShop();
  else if (currentScreen === 'more') renderMore();
}

function renderHUD() {
  const s = GAME.state;
  el('hud').innerHTML =
    '<div class="hud-row">' +
      '<div class="hud-name">' + esc(s.name) + '<span class="realm">' + realmName() + '</span></div>' +
      '<div class="hud-right"><span class="stone">💎 ' + s.linhThach + '</span>' +
      '<button class="mini-btn" onclick="toggleLang()">' + (s.lang === 'vi' ? 'EN' : 'VI') + '</button></div>' +
    '</div>' +
    '<div class="bar"><div class="bar-hp" id="bar-hp" style="width:' + pct(GAME.hp, GAME.stats.maxHp) + '%"></div><span>' + t('hp') + ' ' + Math.ceil(GAME.hp) + '/' + GAME.stats.maxHp + '</span></div>' +
    '<div class="bar"><div class="bar-mp" id="bar-mp" style="width:' + pct(GAME.mp, GAME.stats.maxMp) + '%"></div><span>' + t('mp') + ' ' + Math.ceil(GAME.mp) + '/' + GAME.stats.maxMp + '</span></div>' +
    '<div class="bar exp"><div class="bar-exp" style="width:' + pct(s.exp, expMaxFor(s.realm, s.tier)) + '%"></div><span>' + t('exp') + ' ' + s.exp + '/' + expMaxFor(s.realm, s.tier) + '</span></div>' +
    (s.linhCan ? '<div class="lc-badge">' + t('linh_can') + ': ' + t(ELEMENTS[s.linhCan].nameKey) + '</div>' : '');
  el('hud').style.display = 'block';
}

function renderBars() {
  const h = el('bar-hp'), m = el('bar-mp');
  if (h) { h.style.width = pct(GAME.hp, GAME.stats.maxHp) + '%'; h.nextElementSibling.textContent = t('hp') + ' ' + Math.ceil(GAME.hp) + '/' + GAME.stats.maxHp; }
  if (m) { m.style.width = pct(GAME.mp, GAME.stats.maxMp) + '%'; m.nextElementSibling.textContent = t('mp') + ' ' + Math.ceil(GAME.mp) + '/' + GAME.stats.maxMp; }
}

function renderNav() {
  const items = [
    ['map', '🗺️', 'nav_map'], ['bag', '🎒', 'nav_bag'], ['char', '🧍', 'nav_char'],
    ['shop', '🏪', 'nav_shop'], ['more', '⋯', 'nav_more'],
  ];
  el('bottomnav').innerHTML = items.map(([k, icon, lk]) =>
    '<button class="nav-btn' + (currentScreen === k ? ' active' : '') + '" data-scr="' + k + '">' + icon + '<span>' + t(lk) + '</span></button>'
  ).join('');
  el('bottomnav').style.display = 'flex';
  el('bottomnav').querySelectorAll('.nav-btn').forEach(b =>
    b.addEventListener('click', () => { currentScreen = b.dataset.scr; renderAll(); }));
}

function goScreen(s) { currentScreen = s; renderAll(); }

/* ---------- tạo nhân vật ---------- */
function renderCreate() {
  el('hud').style.display = 'none';
  el('bottomnav').style.display = 'none';
  el('screen').innerHTML =
    '<div class="create-box">' +
      '<div class="game-logo">⚔️</div>' +
      '<h1>' + t('app_title') + '</h1>' +
      '<p class="flavor">' + t('create_welcome') + '</p>' +
      '<h2>' + t('create_title') + '</h2>' +
      '<label>' + t('create_name') + '</label>' +
      '<input id="inp-name" maxlength="12" placeholder="' + t('create_name_ph') + '">' +
      '<button class="big-btn" id="btn-start">' + t('create_start') + '</button>' +
      '<button class="mini-btn" onclick="toggleLang()">' + (GAME.state.lang === 'vi' ? 'English' : 'Tiếng Việt') + '</button>' +
    '</div>';
  el('btn-start').addEventListener('click', () => createCharacter(el('inp-name').value));
}

/* ---------- map & chiến đấu ---------- */
function mobColor(m) {
  const d = m.power - playerPower();
  if (d <= -3) return 'low';
  if (d >= 3) return 'high';
  return 'same';
}
function mobColorName(m) {
  const c = mobColor(m);
  return t(c === 'low' ? 'monster_lv_low' : c === 'high' ? 'monster_lv_high' : 'monster_lv_same');
}

function renderMap() {
  const s = GAME.state;
  const map = currentMap();
  let tabs = MAPS.map((m, i) => {
    let locked = false;
    if (m.unlock) locked = !(s.realm > m.unlock.realm || (s.realm === m.unlock.realm && s.tier >= m.unlock.tier));
    return '<button class="map-tab' + (i === s.map ? ' active' : '') + (locked ? ' locked' : '') + '" data-map="' + i + '"' + (locked ? ' disabled' : '') + '>' + t(m.nameKey) + (locked ? ' 🔒' : '') + '</button>';
  }).join('');
  let mobs = map.monsters.map(k => {
    const m = MONSTERS[k];
    return '<button class="mob" data-mob="' + k + '"><span class="mob-icon">' + m.icon + '</span>' +
      '<span class="mob-name ' + mobColor(m) + '">' + t(m.nameKey) + ' <i>(' + mobColorName(m) + ')</i></span></button>';
  }).join('');
  const boss = MONSTERS[map.boss];
  const alive = bossAlive(map.id);
  let bossBtn = '<button class="boss-btn" id="boss-btn" data-mob="' + map.boss + '"' + (alive ? '' : ' disabled') + '>' +
    '💀 ' + t('boss') + ': ' + t(boss.nameKey) + (alive ? '' : ' (' + t('boss_respawn') + ' ' + bossCountdown(map.id) + t('sec') + ')') + '</button>';

  let npc = '';
  if (s.quest.taycot === 'active') {
    npc = '<button class="npc-btn" id="npc-truong">🧙 ' + t('npc_truong') + '</button>';
  }
  if (shopUnlocked()) {
    npc += '<button class="npc-btn" id="npc-shop">🏪 ' + t('shop_name') + '</button>';
  }

  el('screen').innerHTML =
    '<div class="map-tabs">' + tabs + '</div>' +
    '<div class="map-area bg-' + map.bg + '">' +
      '<div class="hint">' + t('gather_hint') + '</div>' +
      '<div class="player" id="player-sprite">🧑‍🦰</div>' +
      '<div class="enemy" id="enemy-sprite">' + (GAME.target ? MONSTERS[GAME.target.key].icon : '❔') + '</div>' +
      '<div class="mobs">' + mobs + '</div>' +
    '</div>' +
    '<div id="combat-panel">' + combatPanelHtml() + '</div>' +
    '<div class="npc-row">' + npc + bossBtn + '</div>';
  bindMap();
}
function combatPanelHtml() {
  const s = GAME.state;
  const tgt = GAME.target;
  let h = '';
  if (tgt) {
    const m = MONSTERS[tgt.key];
    h += '<div class="target-bar"><b>' + t(m.nameKey) + '</b>' +
      '<div class="bar"><div class="bar-hp" style="width:' + pct(tgt.hp, tgt.maxHp) + '%"></div></div></div>';
    h += '<div class="btn-row">' +
      '<button class="atk-btn" id="btn-atk">⚔️ ' + t('atk') + '</button>' +
      '<button class="skill-btn" id="btn-skill1">⚡ ' + t('skill1_name') + '</button>';
    if (s.linhCan) {
      const elk = ELEMENTS[s.linhCan].skillKey;
      h += '<button class="skill-btn el" id="btn-skill2">✨ ' + t(elk) + '</button>';
    }
    h += '</div>';
  }
  h += '<button class="auto-btn' + (s.auto ? ' on' : '') + '" id="btn-auto">🤖 ' + t('auto') + ': ' + (s.auto ? t('auto_on') : t('auto_off')) + '</button>';
  return h;
}
function renderCombat() {
  const p = el('combat-panel');
  if (p && currentScreen === 'map') { renderMap(); }
}
function renderBossBtn() {
  const b = el('boss-btn');
  if (!b || currentScreen !== 'map') return;
  const map = currentMap();
  const alive = bossAlive(map.id);
  const boss = MONSTERS[map.boss];
  b.disabled = !alive;
  b.innerHTML = '💀 ' + t('boss') + ': ' + t(boss.nameKey) + (alive ? '' : ' (' + t('boss_respawn') + ' ' + bossCountdown(map.id) + t('sec') + ')');
}
function bindMap() {
  el('screen').querySelectorAll('[data-map]').forEach(b =>
    b.addEventListener('click', () => switchMap(parseInt(b.dataset.map))));
  el('screen').querySelectorAll('[data-mob]').forEach(b =>
    b.addEventListener('click', () => {
      if (b.disabled) return;
      const k = b.dataset.mob;
      if (MONSTERS[k].boss && !bossAlive(GAME.state.map)) return;
      spawnMonster(k);
    }));
  const ba = el('btn-atk'); if (ba) ba.addEventListener('click', () => playerAttack(null));
  const s1 = el('btn-skill1'); if (s1) s1.addEventListener('click', () => playerAttack('sword_qi'));
  const s2 = el('btn-skill2'); if (s2) s2.addEventListener('click', () => playerAttack('elemental'));
  const au = el('btn-auto'); if (au) au.addEventListener('click', () => {
    GAME.state.auto = !GAME.state.auto;
    if (GAME.state.auto && !GAME.target) spawnMonster();
    saveGame(); renderMap();
  });
  const nt = el('npc-truong'); if (nt) nt.addEventListener('click', showTayCotModal);
  const ns = el('npc-shop'); if (ns) ns.addEventListener('click', () => goScreen('shop'));
}

function showTayCotModal() {
  const s = GAME.state;
  if (s.quest.taycot === 'done') return;
  const have = s.quest.herb;
  let body = '<h3>' + t('quest_taycot_name') + '</h3><p>' + t('quest_taycot_desc') + '</p>' +
    '<p>🌿 ' + t('quest_taycot_step1', { have }) + '</p>';
  if (have >= 5) body += '<button class="big-btn" id="btn-taycot">' + t('quest_taycot_do') + '</button>';
  else body += '<button class="big-btn" disabled>' + t('quest_taycot_step2') + '</button>';
  body += '<button class="mini-btn" onclick="closeModal()">' + t('close') + '</button>';
  modal(body);
  const b = el('btn-taycot');
  if (b) b.addEventListener('click', () => {
    if (doTayCot()) {
      closeModal();
      modal('<h3>✨ ' + t('quest_taycot_result') + '</h3><p class="lc-reveal">' + t(ELEMENTS[GAME.state.linhCan].nameKey) + '</p>' +
        '<button class="big-btn" onclick="closeModal();renderAll()">' + t('quest_done') + '</button>');
    }
  });
}

/* ---------- túi đồ ---------- */
function renderBag() {
  const s = GAME.state;
  let eq = '';
  for (const slot of ['weapon', 'armor', 'acc']) {
    const e = s.equip[slot];
    const it = e ? ITEMS[e.id] : null;
    eq += '<div class="eq-slot"><span>' + t('slot_' + slot) + '</span>' +
      (it ? '<button class="eq-item" data-unequip="' + slot + '">' + it.icon + ' ' + itemName(e.id) + ' 🔒</button>'
          : '<span class="eq-empty">—</span>') + '</div>';
  }
  let items = '';
  if (!s.bag.length) items = '<p class="empty">' + t('empty_bag') + '</p>';
  s.bag.forEach((b, i) => {
    const it = ITEMS[b.id];
    if (!it) return;
    let acts = '';
    if (it.kind === 'pill') acts += '<button data-use="' + i + '">' + t('use') + '</button>';
    if (it.kind === 'equip') acts += '<button data-wear="' + i + '">' + t('wear') + '</button>';
    if (!b.locked && it.sell) acts += '<button data-sell="' + i + '">' + t('sell') + ' +' + it.sell + '💎</button>';
    items += '<div class="bag-item"><span class="b-icon">' + itemIcon(it) + '</span>' +
      '<span class="b-name">' + itemName(b.id) + ' x' + b.qty + (b.locked ? ' 🔒' : '') + '</span>' +
      '<span class="b-acts">' + acts + '</span></div>';
  });
  el('screen').innerHTML = '<h2>🎒 ' + t('bag') + '</h2><div class="eq-row">' + eq + '</div>' +
    '<div class="bag-list">' + items + '</div>' +
    '<p class="note">' + t('locked_bonus') + '</p>';
  el('screen').querySelectorAll('[data-use]').forEach(b => b.addEventListener('click', () => usePill(s.bag[+b.dataset.use].id)));
  el('screen').querySelectorAll('[data-wear]').forEach(b => b.addEventListener('click', () => wearItem(+b.dataset.wear)));
  el('screen').querySelectorAll('[data-sell]').forEach(b => b.addEventListener('click', () => sellBagItem(+b.dataset.sell)));
  el('screen').querySelectorAll('[data-unequip]').forEach(b => b.addEventListener('click', () => unwearItem(b.dataset.unequip)));
}

/* ---------- nhân vật ---------- */
function renderChar() {
  const s = GAME.state;
  const st = GAME.stats;
  const cfg = breakthroughConfig();
  let bt = '';
  if (cfg) {
    const mats = cfg.materials.map(m => itemName(m.id) + ' x' + m.qty + ' (' + bagQty(m.id) + '/' + m.qty + ')').join('<br>');
    bt = '<div class="bt-box"><h3>⚡ ' + t('bt_title') + '</h3>' +
      '<p>' + t('bt_need') + ':<br>' + mats + '</p>' +
      '<p>' + t('bt_rate') + ': ' + Math.round(cfg.rate * 100) + '%</p>' +
      '<button class="big-btn" id="btn-bt">' + t('bt_start') + '</button></div>';
  }
  el('screen').innerHTML =
    '<h2>🧍 ' + t('char_info') + '</h2>' +
    '<div class="char-card"><p><b>' + esc(s.name) + '</b></p>' +
    '<p>' + realmName() + '</p>' +
    (s.linhCan ? '<p>' + t('linh_can') + ': ' + t(ELEMENTS[s.linhCan].nameKey) + '</p>' : '') +
    '<p>⚔️ ' + t('atk_stat') + ': ' + st.atk + ' &nbsp; 🛡️ ' + t('def_stat') + ': ' + st.def + '</p>' +
    '<p>❤️ ' + st.maxHp + ' &nbsp; 🔷 ' + st.maxMp + '</p>' +
    '<p>💎 ' + s.linhThach + ' ' + t('linh_thach') + '</p></div>' +
    bt +
    '<div class="quest-box"><h3>📜 ' + t('quest_title') + '</h3>' +
    (s.quest.taycot === 'active'
      ? '<p><b>' + t('quest_taycot_name') + '</b><br>' + t('quest_taycot_desc') + '<br>🌿 ' + t('quest_taycot_step1', { have: s.quest.herb }) + '</p>'
      : '<p>✅ ' + t('quest_taycot_name') + ' — ' + t('quest_done') + '</p>') +
    '</div>';
  const bb = el('btn-bt');
  if (bb) bb.addEventListener('click', () => {
    const c = canBreakthrough();
    if (!c) { toast(t('bt_not_ready')); return; }
    const mats = c.materials.map(m => itemName(m.id) + ' x' + m.qty).join(', ');
    modal('<h3>⚡ ' + t('bt_title') + '</h3><p>' + t('bt_need') + ': ' + mats + '</p>' +
      '<p>' + t('bt_rate') + ': ' + Math.round(c.rate * 100) + '%</p>' +
      '<button class="big-btn" id="btn-bt-go">' + t('bt_start') + '</button>' +
      '<button class="mini-btn" onclick="closeModal()">' + t('close') + '</button>');
    el('btn-bt-go').addEventListener('click', () => { closeModal(); doBreakthrough(); });
  });
}

/* ---------- shop ---------- */
function renderShop() {
  if (!shopUnlocked()) {
    el('screen').innerHTML = '<div class="locked-box">🏪<h2>' + t('shop_name') + '</h2><p>' + t('shop_locked') + '</p></div>';
    return;
  }
  let stock = SHOP_STOCK.map(id => {
    const it = ITEMS[id];
    return '<div class="shop-item"><span class="b-icon">' + itemIcon(it) + '</span>' +
      '<span class="b-name">' + itemName(id) + '<br><small>' + (it.descKey ? t(it.descKey) : '') + '</small></span>' +
      '<button data-buy="' + id + '">' + t('shop_buy') + ' ' + it.price + '💎</button></div>';
  }).join('');
  el('screen').innerHTML = '<h2>🏪 ' + t('shop_name') + '</h2><p class="flavor">' + t('shop_welcome') + '</p>' +
    '<div class="shop-list">' + stock + '</div>' +
    '<p class="note">💎 ' + GAME.state.linhThach + '</p>';
  el('screen').querySelectorAll('[data-buy]').forEach(b => b.addEventListener('click', () => buyItem(b.dataset.buy)));
}

/* ---------- thêm ---------- */
function renderMore() {
  el('screen').innerHTML = '<h2>⋯ ' + t('more_title') + '</h2>' +
    '<div class="more-list">' +
    '<button class="big-btn" onclick="toggleLang()">' + t('lang_label') + ': ' + (GAME.state.lang === 'vi' ? 'Tiếng Việt' : 'English') + '</button>' +
    '<button class="big-btn" id="btn-save">💾 ' + t('save') + '</button>' +
    '<button class="big-btn danger" id="btn-reset">🗑️ ' + t('new_game') + '</button>' +
    '<!-- topup: khung ẩn, mở khi có thanh toán store -->' +
    '<button class="big-btn" id="btn-topup" style="display:none">💳 ' + t('topup') + '</button>' +
    '<p class="note">' + t('version') + '</p>' +
    '</div>';
  el('btn-save').addEventListener('click', () => { saveGame(); toast(t('saved')); });
  el('btn-reset').addEventListener('click', () => {
    if (confirm(t('confirm_reset'))) { resetGame(); location.reload(); }
  });
}

function toggleLang() {
  GAME.state.lang = GAME.state.lang === 'vi' ? 'en' : 'vi';
  saveGame();
  renderAll();
}

function pct(a, b) { return Math.max(0, Math.min(100, Math.round(a / b * 100))); }
function itemIcon(it) {
  if (it.iconImg) return '<img src="' + it.iconImg + '" alt="">';
  return it.icon;
}
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
