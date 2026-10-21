/* ============================================================
 * js/lang_outfit.js — Text VI/EN cho SHOP THỜI TRANG + GIFT CODE bổ sung
 * - KHÔNG sửa lang.js trực tiếp: merge vào LANG lúc nạp (giữ key cũ nếu có)
 * - Node-safe: export để test
 * ============================================================ */
(function (global) {
  "use strict";

  var STR = {
    vi: {
      nav_outfitshop: "Shop Thời Trang",
      os_title: "Shop Thời Trang",
      os_sub: "Y phục xứng với tiên nhân — mặc đẹp tăng khí chất",
      os_tab_shop: "Cửa hàng",
      os_tab_owned: "Tủ đồ",
      os_have_stones: "Linh Thạch: {n}",
      os_cat_ao: "Áo",
      os_cat_quan: "Quần",
      os_cat_mu: "Mũ",
      os_cat_vukhi: "Vũ khí",
      os_cat_canh: "Cánh",
      os_cat_haoquang: "Hào quang",
      os_cat_all: "Tất cả",
      os_buy: "Mua",
      os_wear: "Mặc",
      os_takeoff: "Tháo",
      os_worn: "Đang mặc",
      os_owned: "Đã sở hữu",
      os_not_owned: "Chưa sở hữu",
      os_not_enough: "Không đủ Linh Thạch!",
      os_buy_ok: "Đã mua: {name}",
      os_wear_ok: "Đã mặc: {name}",
      os_takeoff_ok: "Đã tháo trang phục",
      os_empty_shop: "Không có món nào trong loại này.",
      os_empty_owned: "Chưa sở hữu món nào. Hãy mua ở Cửa hàng!",
      os_stats: "Chỉ số",
      os_desc: "Mô tả",
      os_price: "Giá",
      os_tier: "Phẩm",
      os_wearing: "Đang mặc",
      os_gift_title: "Giftcode mới",
      os_gift_hint: "Nhập mã để nhận quà — mỗi mã dùng 1 lần",
    },
    en: {
      nav_outfitshop: "Fashion Shop",
      os_title: "Fashion Shop",
      os_sub: "Garments worthy of immortals — dress well, shine bright",
      os_tab_shop: "Shop",
      os_tab_owned: "Wardrobe",
      os_have_stones: "Spirit Stones: {n}",
      os_cat_ao: "Robes",
      os_cat_quan: "Pants",
      os_cat_mu: "Hats",
      os_cat_vukhi: "Weapons",
      os_cat_canh: "Wings",
      os_cat_haoquang: "Auras",
      os_cat_all: "All",
      os_buy: "Buy",
      os_wear: "Wear",
      os_takeoff: "Remove",
      os_worn: "Worn",
      os_owned: "Owned",
      os_not_owned: "Not owned",
      os_not_enough: "Not enough Spirit Stones!",
      os_buy_ok: "Purchased: {name}",
      os_wear_ok: "Wearing: {name}",
      os_takeoff_ok: "Outfit removed",
      os_empty_shop: "No items in this category.",
      os_empty_owned: "Nothing owned yet. Buy from the Shop!",
      os_stats: "Stats",
      os_desc: "Description",
      os_price: "Price",
      os_tier: "Rarity",
      os_wearing: "Wearing",
      os_gift_title: "New Giftcodes",
      os_gift_hint: "Enter a code to claim gifts — each code works once",
    }
  };

  /* Merge vào LANG (không ghi đè key đã có) */
  try {
    if (typeof LANG !== "undefined" && LANG) {
      ["vi", "en"].forEach(function (lg) {
        if (!LANG[lg]) LANG[lg] = {};
        Object.keys(STR[lg] || {}).forEach(function (k) {
          if (LANG[lg][k] === undefined) LANG[lg][k] = STR[lg][k];
        });
      });
    }
  } catch (e) {}

  global.LANG_OUTFIT = STR;
  if (typeof module !== "undefined" && module.exports) module.exports = STR;
})(typeof globalThis !== "undefined" ? globalThis : this);
