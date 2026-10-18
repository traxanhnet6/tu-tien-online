/* ============================================================
 * js/dataclear.js — Xóa dữ liệu cũ, GIỮ NGUYÊN hình ảnh & hiệu ứng.
 * Quy tắc an toàn (theo yêu cầu của Bui):
 *  - CHỈ xóa key DỮ LIỆU GAME trong localStorage (save, cài đặt, cache JSON).
 *  - KHÔNG BAO GIỜ dùng localStorage.clear().
 *  - Hình ảnh, hiệu ứng skill linh thú, sprite... nằm ở thư mục assets/
 *    và do cache HTTP của trình duyệt giữ — không nằm trong localStorage
 *    nên không bị động tới, không cần tải lại.
 * ============================================================ */

/* Phiên bản save hiện tại. Tăng số này khi cấu trúc save thay đổi
   không tương thích ngược → game sẽ đề xuất người chơi xóa dữ liệu cũ. */
var SAVE_VERSION = 4;

/* Lấy TT_BUILD từ index.html (nếu có) để reload đúng bản mới */
function _ttBuild() {
  try {
    if (typeof TT_BUILD !== "undefined" && TT_BUILD) return TT_BUILD;
  } catch (e) {}
  return Date.now();
}

/* Danh sách key dữ liệu game được phép xóa.
   LƯU Ý: chỉ liệt kê key save/cài đặt/cache JSON — mọi thứ khác
   (kể cả key lạ không rõ nguồn gốc) đều được GIỮ LẠI. */
function gameDataKeys() {
  var out = [];
  try {
    if (typeof localStorage === "undefined") return out;
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (!k) continue;
      if (k === "ttonline_v2_save" ||
          k.indexOf("ttonline_v2_save::") === 0 ||
          k === "ttonline_v2_lang" ||
          k.indexOf("ttonline_data_v") === 0) {
        out.push(k);
      }
    }
  } catch (e) {}
  return out;
}

/* Xóa dữ liệu cũ: save game + cài đặt + cache JSON dữ liệu.
   KHÔNG xóa hình ảnh / hiệu ứng skill linh thú / sprite. */
function clearOldData() {
  var keys = gameDataKeys();
  try {
    keys.forEach(function (k) {
      try { localStorage.removeItem(k); } catch (e) {}
    });
  } catch (e) {}
  return keys;
}

/* Tải lại trang với version mới để trình duyệt không dùng bản JS/CSS cũ */
function reloadFresh() {
  try {
    var v = _ttBuild();
    var url = location.pathname + "?v=" + encodeURIComponent(v) + "&_fresh=" + Date.now();
    location.replace(url);
  } catch (e) {
    try { location.reload(true); } catch (e2) {}
  }
}

/* Kiểm tra save có tương thích với bản game hiện tại không.
   - Chưa có saveVer (save từ bản rất cũ) → không tương thích
   - saveVer < SAVE_VERSION → không tương thích
   - Thiếu field cốt lõi của bản mới (char/settings) → không tương thích */
function isSaveIncompatible(saved) {
  if (!saved || typeof saved !== "object") return false;
  try {
    if (!saved.saveVer || saved.saveVer < SAVE_VERSION) return true;
    if (!saved.char || !saved.settings) return true;
  } catch (e) { return true; }
  return false;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    SAVE_VERSION: SAVE_VERSION,
    gameDataKeys: gameDataKeys,
    clearOldData: clearOldData,
    reloadFresh: reloadFresh,
    isSaveIncompatible: isSaveIncompatible,
  };
}
