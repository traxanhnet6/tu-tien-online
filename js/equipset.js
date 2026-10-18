/* ============================================================
 * js/equipset.js — Bộ trang bị 9 ô × 7 cảnh giới
 * (Bui yêu cầu 2026-10-18: thiết kế trang bị nhân vật chi tiết)
 *
 * 9 ô: vukhi, ao, quan, giay, mu, daychuyen, nhan, phapbao, toaky
 * 7 cảnh giới: 1=Luyện Khí, 2=Trúc Cơ, 3=Kim Đan, 4=Nguyên Anh,
 *              5=Hóa Thần, 6=Luyện Hư, 7=Hợp Thể
 *
 * Quy tắc (Bui chốt):
 * - Đồ THƯỜNG vượt cấp KHÔNG đeo được
 * - Đồ HIẾM vượt cấp: hiệu quả -50%, tốn linh lực ×2
 *
 * Node-safe.
 * ============================================================ */
(function (global) {
  "use strict";

  var REALMS = [
    null,
    { id: 1, name: "Luyện Khí", color: "#9aa0a6" },
    { id: 2, name: "Trúc Cơ",   color: "#34a853" },
    { id: 3, name: "Kim Đan",   color: "#fbbc04" },
    { id: 4, name: "Nguyên Anh", color: "#4285f4" },
    { id: 5, name: "Hóa Thần",  color: "#9c27b0" },
    { id: 6, name: "Luyện Hư",  color: "#ff6d01" },
    { id: 7, name: "Hợp Thể",   color: "#00bcd4" }
  ];

  var SLOTS = [
    { id: "vukhi",     name: "Vũ khí" },
    { id: "ao",        name: "Áo" },
    { id: "quan",      name: "Quần" },
    { id: "giay",      name: "Giày" },
    { id: "mu",        name: "Mũ" },
    { id: "daychuyen", name: "Dây chuyền" },
    { id: "nhan",      name: "Nhẫn" },
    { id: "phapbao",   name: "Pháp bảo" },
    { id: "toaky",     name: "Tọa kỵ" }
  ];

  // Tên trang bị theo slot × realm
  var NAMES = {
    vukhi:     ["Kiếm Gỗ Đào", "Kiếm Thanh Cương", "Kiếm Kim Đan", "Kiếm Nguyên Anh", "Kiếm Hóa Thần", "Kiếm Luyện Hư", "Kiếm Hợp Thể"],
    ao:        ["Áo Vải Thô", "Đạo Bào Xanh", "Đạo Bào Vàng", "Đạo Bào Lam", "Đạo Bào Tím", "Đạo Bào Lửa", "Đạo Bào Cầu Vồng"],
    quan:      ["Quần Vải", "Quần Lụa Xanh", "Quần Gấm Vàng", "Quần Lụa Lam", "Quần Gấm Tím", "Quần Lửa", "Quần Vân Hà"],
    giay:      ["Giày Vải", "Giày Đạp Gió", "Giày Kim Tuyến", "Giày Ngự Thủy", "Giày Đạp Mây", "Giày Hỏa Vân", "Giày Cửu Thiên"],
    mu:        ["Khăn Vải", "Mũ Trúc", "Mũ Vàng", "Mũ Ngọc Lam", "Mũ Tử Kim", "Mũ Hỏa Diệm", "Miện Hợp Thể"],
    daychuyen: ["Dây Gỗ", "Chuỗi Hạt Xanh", "Chuỗi Vàng", "Chuỗi Lam Ngọc", "Chuỗi Tử Tinh", "Chuỗi Hỏa Châu", "Chuỗi Hỗn Độn"],
    nhan:      ["Nhẫn Đồng", "Nhẫn Linh Mộc", "Nhẫn Kim Đan", "Nhẫn Hải Lam", "Nhẫn Tử Ma", "Nhẫn Luyện Hư", "Nhẫn Càn Khôn"],
    phapbao:   ["Gương Đồng", "Tháp Nhỏ Xanh", "Ấn Vàng", "Chuông Lam", "Phiên Tím", "Lò Lửa", "Tháp Cửu Tầng"],
    toaky:     ["Ngựa Thường", "Linh Mã Xanh", "Kim Sí Điểu", "Lam Giao", "Tử Vân Hạc", "Hỏa Kỳ Lân", "Cửu Vĩ Hồ"]
  };

  // Chỉ số cơ bản theo realm (scale)
  function _baseStats(slot, realm) {
    var m = realm * realm * 10; // scale bậc 2
    var s = { atk: 0, def: 0, hp: 0, mp: 0, spd: 0 };
    switch (slot) {
      case "vukhi":     s.atk = m * 2; break;
      case "ao":        s.def = m * 1.5; s.hp = m * 5; break;
      case "quan":      s.def = m; s.hp = m * 3; break;
      case "giay":      s.spd = realm * 2; s.def = m * 0.5; break;
      case "mu":        s.def = m * 0.8; s.mp = m * 4; break;
      case "daychuyen": s.mp = m * 6; s.atk = m * 0.5; break;
      case "nhan":      s.atk = m; s.def = m * 0.5; break;
      case "phapbao":   s.atk = m * 1.2; s.mp = m * 5; break;
      case "toaky":     s.spd = realm * 5; s.hp = m * 8; break;
    }
    // round
    for (var k in s) s[k] = Math.round(s[k]);
    return s;
  }

  // Sinh 63 item definitions
  function buildItems() {
    var items = [];
    for (var r = 1; r <= 7; r++) {
      for (var si = 0; si < SLOTS.length; si++) {
        var slot = SLOTS[si].id;
        items.push({
          id: "eq_" + slot + "_r" + r,
          kind: "equip",
          slot: slot,
          reqRealm: r,
          rarity: r >= 6 ? "truyenthuyet" : (r >= 4 ? "suthi" : (r >= 2 ? "hiem" : "thuong")),
          name: NAMES[slot][r - 1],
          icon: "assets/equip/equip_" + slot + "_r" + r + ".png",
          stats: _baseStats(slot, r),
          desc: NAMES[slot][r - 1] + " (" + REALMS[r].name + ")"
        });
      }
    }
    return items;
  }

  var _items = null;
  function items() {
    if (!_items) _items = buildItems();
    return _items;
  }

  function getById(id) {
    var all = items();
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === id) return all[i];
    }
    return null;
  }

  function forRealm(r) {
    return items().filter(function (it) { return it.reqRealm === r; });
  }

  function forSlot(slot) {
    return items().filter(function (it) { return it.slot === slot; });
  }

  var EquipSet = {
    REALMS: REALMS,
    SLOTS: SLOTS,
    items: items,
    getById: getById,
    forRealm: forRealm,
    forSlot: forSlot
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = EquipSet;
  } else {
    global.EquipSet = EquipSet;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
