/* ============================================================
 * js/giftcode.js — GIFT CODE mở rộng: mã mới + phần thưởng TRANG PHỤC
 * - Game đã có sẵn luồng đổi giftcode (data.js GIFT_CODES +
 *   combat.js redeemGift + ui.js doGiftRedeem + state.giftcodes).
 *   Module này CHỈ THÊM: gộp 5 mã mới vào GIFT_CODES lúc nạp, và
 *   bọc (wrap) doGiftRedeem để sau khi đổi thành công thì tặng thêm
 *   trang phục kèm theo mã (nếu có) — không sửa file/hàm gốc.
 * - Mỗi mã dùng 1 lần/tài khoản: state.giftcodes (field sẵn có của
 *   game); mã đã phát outfit được ghi vào state.giftcodeOutfits để
 *   chống phát trùng khi wrap chạy lại.
 * - GiftCode.redeem(code) → {ok, msg, rewards}: API độc lập theo
 *   spec (dùng cho test/tích hợp sau), áp dụng đủ stones/items/outfits.
 * Node-safe: mọi truy cập DOM/state đều có guard.
 * ============================================================ */
(function (global) {
  "use strict";

  /* 5 mã mới: {stones, items:[{id, qty}], outfits:[outfitId]} */
  var NEW_CODES = {
    TANTHU2026:   { stones: 1000, items: [], outfits: ["thu_sinh"] },
    TUTIENONLINE: { stones: 500,  items: [] },
    KHAIMAC:      { stones: 2000, items: [] },
    TRUNGTHU2026: { stones: 300,  items: [{ id: "den_long", qty: 1 }] },
    VIP8888:      { stones: 888,  items: [], outfits: ["tai_than"] },
  };

  /* Gộp vào bảng GIFT_CODES sẵn có của data.js (không ghi đè mã cũ) */
  try {
    if (typeof GIFT_CODES !== "undefined" && GIFT_CODES) {
      Object.keys(NEW_CODES).forEach(function (code) {
        if (!GIFT_CODES[code]) GIFT_CODES[code] = NEW_CODES[code];
      });
    }
  } catch (e) {}

  function _state() { return typeof state !== "undefined" ? state : null; }
  function _addItem(st, id, qty) {
    if (typeof addItem === "function") { addItem(st, id, qty || 1); return; }
    st.bag = st.bag || [];
    for (var i = 0; i < st.bag.length; i++) {
      if (st.bag[i].id === id) { st.bag[i].qty += (qty || 1); return; }
    }
    st.bag.push({ id: id, qty: qty || 1, locked: false });
  }

  /* Phát outfit của 1 mã (chỉ phát 1 lần/mã). Trả danh sách tên outfit vừa nhận. */
  function grantOutfits(code, st) {
    st = st || _state();
    var def = NEW_CODES[code];
    if (!st || !def || !def.outfits || !def.outfits.length) return [];
    if (!Array.isArray(st.giftcodeOutfits)) st.giftcodeOutfits = [];
    if (st.giftcodeOutfits.indexOf(code) >= 0) return [];
    st.giftcodeOutfits.push(code);
    var names = [];
    def.outfits.forEach(function (oid) {
      if (typeof Wardrobe !== "undefined" && Wardrobe.grantOutfit) {
        Wardrobe.grantOutfit(st, oid);
        names.push(Wardrobe.name(oid));
      }
    });
    return names;
  }

  /* API độc lập: đổi mã đầy đủ (stones + items + outfits). */
  function redeem(code, st) {
    st = st || _state();
    var msg = function (k) { return typeof t === "function" ? t(k) : k; };
    if (!st) return { ok: false, msg: "nostate", rewards: null };
    var c = String(code || "").trim().toUpperCase();
    if (!c) return { ok: false, msg: msg("gift_invalid"), rewards: null };
    if (!Array.isArray(st.giftcodes)) st.giftcodes = [];
    if (st.giftcodes.indexOf(c) >= 0) return { ok: false, msg: msg("gift_used"), rewards: null };
    var def = NEW_CODES[c];
    if (!def && typeof GIFT_CODES !== "undefined") def = GIFT_CODES[c];
    if (!def) return { ok: false, msg: msg("gift_invalid"), rewards: null };
    if (def.stones) st.stones = (st.stones || 0) + def.stones;
    (def.items || []).forEach(function (it) { _addItem(st, it.id, it.qty || 1); });
    grantOutfits(c, st);
    st.giftcodes.push(c);
    return { ok: true, msg: msg("gift_ok"), rewards: def };
  }

  var GiftCode = {
    CODES: NEW_CODES,
    redeem: redeem,
    grantOutfits: grantOutfits,
  };
  global.GiftCode = GiftCode;
  if (typeof module !== "undefined" && module.exports) module.exports = GiftCode;

  /* ---------- Bọc doGiftRedeem (ui.js): thêm phát outfit sau khi đổi thành công ---------- */
  function installHook() {
    if (typeof doGiftRedeem !== "function" || doGiftRedeem.__wdHook) return;
    var orig = doGiftRedeem;
    var wrapped = function () {
      var code = "";
      try {
        var inp = document.getElementById("gift-code");
        code = ((inp && inp.value) || "").trim().toUpperCase();
      } catch (e) {}
      var before = 0;
      try { var st = _state(); before = st && st.giftcodes ? st.giftcodes.length : 0; } catch (e) {}
      orig();
      try {
        var st2 = _state();
        if (code && st2 && st2.giftcodes && st2.giftcodes.length > before) {
          var names = grantOutfits(code, st2);
          if (names.length) {
            saveGame(st2);
            if (typeof toast === "function") toast(t("gift_outfit", { names: names.join(", ") }));
            if (typeof refreshHUD === "function") refreshHUD();
            if (typeof renderPanel === "function") renderPanel();
          }
        }
      } catch (e) {}
    };
    wrapped.__wdHook = true;
    try { doGiftRedeem = wrapped; } catch (e) {}
  }
  installHook();
})(typeof globalThis !== "undefined" ? globalThis : this);
