/* Quản lý state + lưu localStorage. */
const SAVE_KEY = 'ttol_save_v1';

function defaultState() {
  return {
    v: 1,
    lang: 'vi',
    name: '',
    created: false,
    realm: 0, tier: 0,           // 0=Phàm Nhân; 1=Luyện Khí (tier 0..11); 2+=Trúc Cơ... (0=Sơ,1=Trung,2=Hậu)
    exp: 0,
    hp: 100, mp: 50,
    linhCan: null,              // 'kim' | 'moc' | ...
    linhThach: 0,
    map: 0,
    bag: [],                    // [{id, qty, locked}]
    equip: { weapon: null, armor: null, acc: null }, // itemId hoặc null
    skills: ['sword_qi'],
    quest: { taycot: 'active', herb: 0 },  // active -> done
    auto: false,
    bossDead: {},                // mapId -> timestamp hồi sinh
    stats: { kills: 0 },
  };
}

function saveGame() {
  try {
    const s = GAME.state;
    s.hp = GAME.hp; s.mp = GAME.mp;
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    return true;
  } catch (e) { return false; }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || s.v !== 1 || !s.created) return null;
    return Object.assign(defaultState(), s);
  } catch (e) { return null; }
}

function resetGame() {
  localStorage.removeItem(SAVE_KEY);
}

/* Túi đồ helpers */
function bagQty(id) {
  const it = GAME.state.bag.find(b => b.id === id);
  return it ? it.qty : 0;
}
function addItem(id, qty = 1, locked = false) {
  const b = GAME.state.bag;
  const ex = b.find(x => x.id === id && x.locked === locked);
  if (ex) ex.qty += qty;
  else b.push({ id, qty, locked });
}
function removeItem(id, qty = 1, locked = null) {
  const b = GAME.state.bag;
  const ex = b.find(x => x.id === id && (locked === null || x.locked === locked));
  if (!ex || ex.qty < qty) return false;
  ex.qty -= qty;
  if (ex.qty <= 0) b.splice(b.indexOf(ex), 1);
  return true;
}
