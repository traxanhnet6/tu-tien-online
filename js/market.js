/* ============================================================
 * js/market.js — Chợ Vạn Tiên Các: giao dịch GIỮA NGƯỜI CHƠI
 * (Bui chốt: Vạn Tiên Các không còn là shop hệ thống).
 * - Người chơi đăng bán vật phẩm (trang bị, bí tịch thừa chưa học,
 *   linh thảo...) đặt giá Linh Thạch; người khác mua; thuế 5%.
 * - Bản offline: listing lưu local (state.market). Milestone 2:
 *   online.js cắm Supabase (listing lên server, khớp lệnh thật).
 * - Demo offline: vài "thương nhân du hành" đăng bán mẫu.
 * - Mở khóa: Luyện Khí tầng 12+ hoặc donate (vanTienCacUnlocked).
 * - state.market = { listings: [{id, seller, itemId, qty, price, at}],
 *                    mine: [listingId...], history: [{...}] }
 * ============================================================ */

var MARKET_TAX = 0.05;

function _save() { if (typeof saveGame === "function") { try { saveGame(); } catch (e) {} } }
function _market(state) {
  if (!state.market) state.market = { listings: [], mine: [], history: [] };
  if (!state.market.listings) state.market.listings = [];
  if (!state.market.mine) state.market.mine = [];
  if (!state.market.history) state.market.history = [];
  return state.market;
}
function _uid() {
  return "m" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
}
/* Giá trị tham khảo để gợi ý giá bán (theo sell * 4) */
function suggestPrice(itemId) {
  var d = (typeof ITEMS !== "undefined" && ITEMS[itemId]) || null;
  if (!d) return 100;
  if (d.kind === "manual") {
    var p = [50, 300, 1500][d.tier || 0] || 50;
    return p * 4;
  }
  return Math.max(50, (d.sell || 10) * 4);
}
/* Đăng bán từ túi. reason: 'no_item' | 'bad_price' | 'cannot_sell' */
function listItem(state, itemId, qty, price) {
  var m = _market(state);
  price = Math.floor(price || 0);
  if (price <= 0) return { ok: false, reason: "bad_price" };
  qty = Math.max(1, Math.floor(qty || 1));
  /* kiểm tra túi */
  var bi = -1;
  for (var i = 0; i < state.bag.length; i++) {
    if (state.bag[i].id === itemId && !state.bag[i].locked) { bi = i; break; }
  }
  if (bi < 0 || (state.bag[bi].qty || 0) < qty) return { ok: false, reason: "no_item" };
  /* bí tịch đã học không được bán */
  try {
    var d = (typeof ITEMS !== "undefined" && ITEMS[itemId]) || null;
    if (d && d.kind === "manual" && typeof Skills !== "undefined" &&
        !Skills.canSellManual(state, itemId)) return { ok: false, reason: "cannot_sell" };
  } catch (e) {}
  /* đang mặc không bán */
  try {
    var eq = state.equip || {};
    for (var k in eq) if (eq[k] === itemId) return { ok: false, reason: "equipped" };
  } catch (e2) {}
  state.bag[bi].qty -= qty;
  if (state.bag[bi].qty <= 0) state.bag.splice(bi, 1);
  var seller = (state.char && state.char.name) || "?";
  var l = { id: _uid(), seller: seller, mine: true, itemId: itemId, qty: qty, price: price, at: Date.now() };
  m.listings.unshift(l);
  m.mine.push(l.id);
  _save();
  return { ok: true, listing: l };
}
/* Mua listing. Thuế 5% trừ vào người bán (bản offline: NPC demo thì đốt thuế). */
function buyListing(state, listingId) {
  var m = _market(state);
  var li = -1;
  for (var i = 0; i < m.listings.length; i++) {
    if (m.listings[i].id === listingId) { li = i; break; }
  }
  if (li < 0) return { ok: false, reason: "gone" };
  var l = m.listings[li];
  if ((state.stones || 0) < l.price) return { ok: false, reason: "no_stone", need: l.price };
  state.stones -= l.price;
  if (typeof addItem === "function") addItem(state, l.itemId, l.qty);
  else { state.bag = state.bag || []; state.bag.push({ id: l.itemId, qty: l.qty }); }
  m.listings.splice(li, 1);
  var mi = m.mine.indexOf(l.id);
  if (mi >= 0) m.mine.splice(mi, 1);
  var net = Math.floor(l.price * (1 - MARKET_TAX));
  if (l.mine) {
    /* bán được hàng của mình → nhận tiền sau thuế */
    state.stones += net;
    m.history.unshift({ itemId: l.itemId, qty: l.qty, price: l.price, net: net, at: Date.now(), sold: true });
  } else {
    m.history.unshift({ itemId: l.itemId, qty: l.qty, price: l.price, at: Date.now(), bought: true });
  }
  m.history = m.history.slice(0, 20);
  _save();
  return { ok: true, net: net };
}
/* Hủy tin đăng của mình (hoàn đồ về túi) */
function cancelListing(state, listingId) {
  var m = _market(state);
  var li = -1;
  for (var i = 0; i < m.listings.length; i++) {
    if (m.listings[i].id === listingId && m.listings[i].mine) { li = i; break; }
  }
  if (li < 0) return { ok: false };
  var l = m.listings[li];
  m.listings.splice(li, 1);
  var mi = m.mine.indexOf(l.id);
  if (mi >= 0) m.mine.splice(mi, 1);
  if (typeof addItem === "function") addItem(state, l.itemId, l.qty);
  else { state.bag = state.bag || []; state.bag.push({ id: l.itemId, qty: l.qty }); }
  _save();
  return { ok: true };
}
/* Tìm kiếm */
function searchListings(state, keyword) {
  var m = _market(state);
  var kw = (keyword || "").toLowerCase();
  if (!kw) return m.listings.slice();
  return m.listings.filter(function (l) {
    var nm = "";
    try {
      if (typeof ITEMS !== "undefined" && ITEMS[l.itemId]) {
        var nk = ITEMS[l.itemId].nameKey;
        if (typeof t === "function") nm = t(nk);
        else nm = l.itemId;
      }
    } catch (e) { nm = l.itemId; }
    return (nm + " " + l.itemId + " " + l.seller).toLowerCase().indexOf(kw) >= 0;
  });
}
/* Seed demo offline: thương nhân du hành đăng bán mẫu */
function seedDemoListings(state) {
  var m = _market(state);
  if (m._seeded) return false;
  m._seeded = true;
  var sellers = ["Thương Nhân Du Hành", "Lãng Khách Thần Bí", "Tiên Thương Lưu Động"];
  var goods = [
    ["dan_hx_trung", 3, 500], ["dan_hl_trung", 3, 500],
    ["wpn_linh", 1, 2500], ["arm_linh", 1, 2200],
    ["manual_kiem_1", 1, 800], ["manual_phap_1", 1, 800],
    ["truc_co_thao", 2, 900], ["thao_linh_chi", 5, 700],
    ["trung_linh", 1, 5000], ["kim_cang_dan", 2, 1200],
  ];
  goods.forEach(function (g, i) {
    m.listings.push({
      id: _uid(), seller: sellers[i % sellers.length], mine: false,
      itemId: g[0], qty: g[1], price: g[2], at: Date.now(),
    });
  });
  _save();
  return true;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    MARKET_TAX: MARKET_TAX,
    suggestPrice: suggestPrice, listItem: listItem, buyListing: buyListing,
    cancelListing: cancelListing, searchListings: searchListings,
    seedDemoListings: seedDemoListings,
  };
}

/* Browser global (song song với module.exports cho node) */
(function () {
  if (typeof module !== "undefined" && module.exports) return;
  var _g = (typeof globalThis !== "undefined") ? globalThis :
    ((typeof window !== "undefined") ? window : null);
  if (!_g) return;
  _g.Market = {
    MARKET_TAX: MARKET_TAX,
    suggestPrice: suggestPrice,
    listItem: listItem,
    buyListing: buyListing,
    cancelListing: cancelListing,
    searchListings: searchListings,
    seedDemoListings: seedDemoListings
  };
})();
