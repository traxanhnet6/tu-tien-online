/* ============================================================
 * js/events.js — Hệ thống SỰ KIỆN theo lịch dương + cửa hàng sự kiện
 * - Sự kiện tự mở theo ngày hiện tại, hết hạn tự ẩn (chỉ hiện trong panel).
 * - Stock bán bằng Linh Thạch (state.stones): trang phục (qua Wardrobe)
 *   hoặc vật phẩm sự kiện (gộp vào ITEMS của data.js lúc nạp).
 * - UI: đăng ký RENDER["events"] + lắng nghe click data-evact riêng,
 *   KHÔNG sửa hàm nào của ui.js.
 * Node-safe: mọi truy cập DOM/state đều có guard.
 * ============================================================ */
(function (global) {
  "use strict";

  /* ---------- Vật phẩm sự kiện (gộp vào ITEMS) ---------- */
  var EVENT_ITEMS = {
    phao_hoa:       { kind: "event", nameKey: "it_phao_hoa",       descKey: "it_phao_hoa_desc",       price: 200, sell: 60,  icon: "🎆" },
    bao_li_xi:      { kind: "event", nameKey: "it_bao_li_xi",      descKey: "it_bao_li_xi_desc",      price: 300, sell: 90,  icon: "🧧" },
    den_long:       { kind: "event", nameKey: "it_den_long",       descKey: "it_den_long_desc",       price: 500, sell: 150, icon: "🏮" },
    banh_trung_thu: { kind: "pill",  nameKey: "it_banh_trung_thu", descKey: "it_banh_trung_thu_desc", healHp: 0.5, price: 400, sell: 120, icon: "🥮" },
    banh_u_tro:     { kind: "pill",  nameKey: "it_banh_u_tro",     descKey: "it_banh_u_tro_desc",     healHp: 0.3, price: 250, sell: 75,  icon: "🍙" },
  };
  try {
    if (typeof ITEMS !== "undefined" && ITEMS) {
      Object.keys(EVENT_ITEMS).forEach(function (id) {
        if (!ITEMS[id]) ITEMS[id] = EVENT_ITEMS[id];
      });
    }
  } catch (e) {}

  /* ---------- Định nghĩa sự kiện (ngày dạng "MM-DD", gồm cả hai đầu) ---------- */
  var EVENTS = [
    {
      id: "tet_nguyen_dan", start: "01-25", end: "02-15",
      name: { vi: "Tết Nguyên Đán", en: "Lunar New Year" },
      desc: {
        vi: "Năm mới an khang! Sắm Hỷ Phục đón Tết, mua pháo hoa và bao lì xì lấy lộc đầu năm.",
        en: "Happy New Year! Grab festive outfits, fireworks and lucky red envelopes.",
      },
      stock: [
        { kind: "outfit", id: "hy_phuc",  price: 2000 },
        { kind: "outfit", id: "hy_khanh", price: 2000 },
        { kind: "item",   id: "phao_hoa", price: 200 },
        { kind: "item",   id: "bao_li_xi", price: 300 },
      ],
    },
    {
      id: "trung_thu", start: "09-01", end: "09-30",
      name: { vi: "Trung Thu Đoàn Viên", en: "Mid-Autumn Reunion" },
      desc: {
        vi: "Đêm rằm tháng Tám: rước đèn cá chép, phá cỗ bánh trung thu sum vầy.",
        en: "Full-moon night: carp lanterns and mooncakes for the whole family.",
      },
      stock: [
        { kind: "outfit", id: "thu_phong", price: 2000 },
        { kind: "item",   id: "den_long", price: 500 },
        { kind: "item",   id: "banh_trung_thu", price: 400 },
      ],
    },
    {
      id: "doan_ngo", start: "06-01", end: "06-15",
      name: { vi: "Tết Đoan Ngọ", en: "Dragon Boat Festival" },
      desc: {
        vi: "Mùng 5 tháng 5: ăn bánh ú tro diệt sâu bọ, cầu mùa màng tốt tươi.",
        en: "The 5th day of the 5th month: ash cakes for a healthy harvest season.",
      },
      stock: [
        { kind: "item", id: "banh_u_tro", price: 250 },
      ],
    },
    {
      id: "vu_lan", start: "08-15", end: "08-30",
      name: { vi: "Vu Lan Báo Hiếu", en: "Vu Lan Filial Festival" },
      desc: {
        vi: "Mùa hiếu hạnh: khoác áo lam đến chùa, cài hoa hồng tưởng nhớ đấng sinh thành.",
        en: "Season of gratitude: wear the lam robe and a rose for your parents.",
      },
      stock: [
        { kind: "outfit", id: "ca_sa", price: 500 },
      ],
    },
    {
      id: "tong_mon_le", always: true, start: null, end: null,
      name: { vi: "Lễ Hội Tông Môn", en: "Sect Festival" },
      desc: {
        vi: "Quầy lễ phục của 6 tông môn — mở quanh năm cho đệ tử các phái.",
        en: "Robes of all six sects — open all year for every disciple.",
      },
      stock: [
        { kind: "outfit", id: "kiem_tong", price: 500 },
        { kind: "outfit", id: "phap_tong", price: 500 },
        { kind: "outfit", id: "the_tong",  price: 500 },
        { kind: "outfit", id: "duoc_tong", price: 500 },
        { kind: "outfit", id: "thu_tong",  price: 500 },
        { kind: "outfit", id: "ma_tong",   price: 500 },
      ],
    },
  ];

  /* ---------- Logic thuần (không DOM) ---------- */
  function mdStr(d) {
    return ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
  }
  function isActive(ev, date) {
    if (!ev) return false;
    if (ev.always) return true;
    var md = mdStr(date || new Date());
    if (ev.start <= ev.end) return md >= ev.start && md <= ev.end;
    return md >= ev.start || md <= ev.end; /* sự kiện vắt qua năm mới */
  }
  function byId(id) {
    for (var i = 0; i < EVENTS.length; i++) if (EVENTS[i].id === id) return EVENTS[i];
    return null;
  }
  function activeEvents(date) {
    return EVENTS.filter(function (ev) { return isActive(ev, date); });
  }
  function loc(obj) {
    if (!obj) return "";
    var cur = (typeof LANG_CUR !== "undefined" && LANG_CUR) || "vi";
    return obj[cur] || obj.vi || "";
  }
  function _addItem(st, id, qty) {
    if (typeof addItem === "function") { addItem(st, id, qty || 1); return; }
    st.bag = st.bag || [];
    for (var i = 0; i < st.bag.length; i++) {
      if (st.bag[i].id === id) { st.bag[i].qty += (qty || 1); return; }
    }
    st.bag.push({ id: id, qty: qty || 1, locked: false });
  }
  /* Mua 1 món trong stock sự kiện. Trừ state.stones. Trả {ok, reason?, kind?, id?, price?} */
  function buy(st, evId, idx) {
    var ev = byId(evId);
    if (!ev || !isActive(ev)) return { ok: false, reason: "closed" };
    var s = ev.stock[+idx || 0];
    if (!s) return { ok: false, reason: "bad" };
    if ((st.stones || 0) < s.price) return { ok: false, reason: "stones" };
    if (s.kind === "outfit") {
      if (typeof Wardrobe === "undefined" || !Wardrobe.grantOutfit) return { ok: false, reason: "nodep" };
      if (Wardrobe.owned(st, s.id)) return { ok: false, reason: "owned" };
      st.stones -= s.price;
      Wardrobe.grantOutfit(st, s.id);
      return { ok: true, kind: "outfit", id: s.id, price: s.price };
    }
    st.stones -= s.price;
    _addItem(st, s.id, 1);
    return { ok: true, kind: "item", id: s.id, price: s.price };
  }

  var Events = {
    EVENTS: EVENTS,
    EVENT_ITEMS: EVENT_ITEMS,
    isActive: isActive,
    activeEvents: activeEvents,
    byId: byId,
    buy: buy,
    loc: loc,
  };
  global.Events = Events;
  if (typeof module !== "undefined" && module.exports) module.exports = Events;

  /* ================= UI (browser) ================= */
  function hasUI() {
    return typeof document !== "undefined" && typeof RENDER !== "undefined" &&
      typeof t === "function" && typeof esc === "function";
  }

  function stockName(s) {
    if (s.kind === "outfit" && typeof Wardrobe !== "undefined") return Wardrobe.name(s.id);
    if (typeof itemName === "function") return itemName(s.id);
    return s.id;
  }
  function stockIcon(s) {
    if (s.kind === "outfit" && typeof Wardrobe !== "undefined") return Wardrobe.imgHtml(s.id, 54);
    if (typeof itemIcon === "function") return itemIcon(s.id);
    return "🎁";
  }

  function renderEvents() {
    var list = activeEvents();
    var h = '<div class="fld-label">💎 ' + esc(t("wd_have_stones", { n: state.stones })) + "</div>";
    if (!list.length) {
      h += '<p class="sect-note">' + esc(t("ev_none")) + "</p>";
      return h;
    }
    list.forEach(function (ev) {
      h += '<div class="fld-label" style="margin-top:10px">🎉 ' + esc(loc(ev.name)) + "</div>";
      h += '<p class="sect-note">' + esc(loc(ev.desc)) + "</p>";
      h += '<p class="sect-note">' + (ev.always
        ? esc(t("ev_always"))
        : esc(t("ev_period", { s: ev.start, e: ev.end }))) + "</p>";
      ev.stock.forEach(function (s, idx) {
        var owned = s.kind === "outfit" && typeof Wardrobe !== "undefined" && Wardrobe.owned(state, s.id);
        var btn = owned
          ? '<span class="mini on">' + esc(t("wd_owned")) + "</span>"
          : '<button class="mini" data-evact="ev-buy" data-ev="' + esc(ev.id) + '" data-idx="' + idx + '">' +
            esc(t("wd_buy")) + " · " + s.price + " 💎</button>";
        h += '<div class="row"><div><div class="item-name">' + stockIcon(s) + " " + esc(stockName(s)) + "</div>" +
          '<div class="item-desc">' + (s.kind === "outfit" ? esc(t("nav_wardrobe")) : esc(itemDesc(s.id) || "")) + "</div></div>" +
          '<div class="row-btns">' + btn + "</div></div>";
      });
    });
    return h;
  }

  function onEvClick(e) {
    var el = e.target && e.target.closest ? e.target.closest('[data-evact="ev-buy"]') : null;
    if (!el) return;
    try {
      var r = buy(state, el.getAttribute("data-ev"), el.getAttribute("data-idx"));
      if (!r.ok) {
        toast(t(r.reason === "owned" ? "wd_owned" : "wd_not_enough"));
        if (typeof sfx === "function") sfx("fail");
        return;
      }
      var nm = r.kind === "outfit" && typeof Wardrobe !== "undefined" ? Wardrobe.name(r.id) : (typeof itemName === "function" ? itemName(r.id) : r.id);
      saveGame(state);
      if (typeof refreshHUD === "function") refreshHUD();
      toast(t("wd_buy_ok", { name: nm }));
      if (typeof sfx === "function") sfx("success");
      if (typeof renderPanel === "function") renderPanel();
    } catch (err) {}
  }

  function installUI() {
    if (!hasUI()) return;
    if (typeof RENDER !== "undefined" && !RENDER.events) RENDER.events = renderEvents;
    if (typeof document !== "undefined" && !installUI._bound) {
      installUI._bound = true;
      document.addEventListener("click", onEvClick);
    }
  }
  installUI();
  global.Events.renderEvents = renderEvents;
})(typeof globalThis !== "undefined" ? globalThis : this);
