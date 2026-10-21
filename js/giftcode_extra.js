/* ============================================================
 * js/giftcode_extra.js — 5 GIFT CODE BỔ SUNG (đủ 10 code cho Bui phát)
 * - giftcode.js đã có 5 mã: TANTHU2026, TUTIENONLINE, KHAIMAC,
 *   TRUNGTHU2026, VIP8888. File này thêm 5 mã nữa, KHÔNG sửa file gốc.
 * - Mỗi mã dùng 1 lần/tài khoản: dùng state.giftcodes sẵn có.
 * - Gộp vào GIFT_CODES (data.js) để ui.js doGiftRedeem + Combat.redeemGift
 *   nhận diện; bọc thêm để phát trang phục kèm mã (wardrobe.js).
 * - Node-safe: mọi truy cập DOM/state đều có guard.
 * ============================================================ */
(function (global) {
  "use strict";

  /* 5 mã bổ sung: {stones, items:[{id, qty}], outfits:[wardrobeId]} */
  var EXTRA_CODES = {
    THANTHU888: { stones: 8888, items: [], outfits: ["thien_tuong"] },
    LINHTHU999: { stones: 9999, items: [] },
    QUATANGMOI: { stones: 3000, items: [] },
    VIP2026:    { stones: 2026, items: [], outfits: ["kim_quang"] },
    DAISUKIEN:  { stones: 5000, items: [] },
  };

  /* Gộp vào bảng GIFT_CODES sẵn có (không ghi đè mã cũ) */
  try {
    if (typeof GIFT_CODES !== "undefined" && GIFT_CODES) {
      Object.keys(EXTRA_CODES).forEach(function (code) {
        if (!GIFT_CODES[code]) GIFT_CODES[code] = EXTRA_CODES[code];
      });
    }
  } catch (e) {}

  function _state() { return (typeof state !== "undefined") ? state : null; }

  /* Phát outfit kèm mã (chỉ 1 lần/mã) */
  function grantExtraOutfits(code, st) {
    st = st || _state();
    var def = EXTRA_CODES[code];
    if (!st || !def || !def.outfits || !def.outfits.length) return [];
    if (!Array.isArray(st.giftcodeOutfits)) st.giftcodeOutfits = [];
    if (st.giftcodeOutfits.indexOf(code) >= 0) return [];
    st.giftcodeOutfits.push(code);
    var names = [];
    def.outfits.forEach(function (oid) {
      try {
        if (typeof Wardrobe !== "undefined" && Wardrobe.grantOutfit) {
          Wardrobe.grantOutfit(st, oid);
          names.push(Wardrobe.name(oid));
        }
      } catch (e) {}
    });
    return names;
  }

  var GiftCodeExtra = {
    CODES: EXTRA_CODES,
    grantExtraOutfits: grantExtraOutfits,
  };
  global.GiftCodeExtra = GiftCodeExtra;
  if (typeof module !== "undefined" && module.exports) module.exports = GiftCodeExtra;

  /* Bọc doGiftRedeem để phát outfit của 5 mã bổ sung (chạy sau hook của giftcode.js) */
  function installHook() {
    if (typeof document === "undefined") return;
    if (typeof doGiftRedeem !== "function" || doGiftRedeem.__gxHook) return;
    var orig = doGiftRedeem;
    var wrapped = function () {
      var code = "";
      try {
        var inp = document.getElementById("gift-code");
        code = ((inp && inp.value) || "").trim().toUpperCase();
      } catch (e) {}
      orig();
      try {
        var st = _state();
        /* chỉ phát khi mã vừa đổi thành công (đã vào giftcodes) và là mã bổ sung */
        if (code && EXTRA_CODES[code] && st && st.giftcodes && st.giftcodes.indexOf(code) >= 0) {
          var names = grantExtraOutfits(code, st);
          if (names.length) {
            try { saveGame(st); } catch (e) {}
            var msg = "";
            try { msg = t("gift_outfit", { names: names.join(", ") }); } catch (e) { msg = names.join(", "); }
            try { if (typeof toast === "function") toast(msg); } catch (e) {}
            try { if (typeof refreshHUD === "function") refreshHUD(); } catch (e) {}
            try { if (typeof renderPanel === "function") renderPanel(); } catch (e) {}
          }
        }
      } catch (e) {}
    };
    wrapped.__gxHook = true;
    try { doGiftRedeem = wrapped; } catch (e) {}
  }
  installHook();
})(typeof globalThis !== "undefined" ? globalThis : this);
