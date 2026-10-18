/* ============================================================
 * js/auth.js — Hệ thống TÀI KHOẢN Tu Tiên Online
 * Đăng ký: tên tài khoản + mật khẩu + email (lấy lại mật khẩu).
 * Đăng nhập: tên tài khoản (hoặc email) + mật khẩu.
 * Quên mật khẩu: gửi mail reset qua Supabase Auth.
 *
 * Nền: Supabase Auth email/password. username lưu ở:
 *  - auth.users.user_metadata.username
 *  - public.usernames (username → user_id, email) — để tra email
 *    khi đăng nhập bằng tên tài khoản
 *    (xem supabase-migration-20261018-accounts.sql)
 *  - public.profiles.username (best-effort, hiển thị)
 *
 * Tích hợp KHÔNG sửa ui.js/online_sb.js:
 *  - index.html gọi Auth.bootFlow() thay vì UI.boot().
 *  - Chưa có session → hiện màn hình #screen-auth trước; đăng nhập
 *    xong mới gọi UI.boot(). Đã có session → vào thẳng UI.boot().
 *  - Save theo tài khoản: bọc Online.save/load/hasSave/wipe để dùng
 *    key riêng theo uid (chế độ ẩn danh giữ key cũ "ttonline_v2_save").
 * Supabase tự lưu session (ghi nhớ đăng nhập) trong localStorage.
 * ============================================================ */
var Auth = (function () {
  "use strict";

  var sb = null;              // supabase client (dùng chung session storage)
  var user = null;            // {id, email, username} | null
  var anonMode = false;       // true = chơi không cần tài khoản
  var saveWrapped = false;
  var bound = false;
  var LEGACY_KEY = "ttonline_v2_save";

  function g() {
    return (typeof window !== "undefined") ? window :
      (typeof globalThis !== "undefined" ? globalThis : null);
  }
  function $(id) {
    try { return g().document.getElementById(id); } catch (e) { return null; }
  }
  function tt(key) {
    try { return (typeof t !== "undefined") ? t(key) : key; } catch (e) { return key; }
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function client() {
    if (sb) return sb;
    try {
      if (typeof SUPABASE_CONFIG === "undefined" || !SUPABASE_CONFIG.enabled) return null;
      var gg = g();
      if (!gg || !gg.supabase || !gg.supabase.createClient) return null;
      sb = gg.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
      return sb;
    } catch (e) { return null; }
  }

  /* ================= validators (thuần logic, có test) ================= */
  function normUsername(s) { return String(s == null ? "" : s).trim().toLowerCase(); }
  function validUsername(s) {
    s = normUsername(s);
    return s.length >= 3 && s.length <= 20 && !/\s/.test(s);
  }
  function validEmail(s) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s == null ? "" : s).trim());
  }
  function validPassword(s) { return String(s == null ? "" : s).length >= 6; }

  /* Ánh xạ lỗi Supabase → câu tiếng Việt */
  var ERRMAP = [
    [/user already registered/i, "auth_err_email_used"],
    [/invalid login credentials/i, "auth_err_bad_login"],
    [/email not confirmed/i, "auth_err_not_confirmed"],
    [/at least 6|password.*short/i, "auth_err_pw_short"],
    [/rate limit|too many/i, "auth_err_rate"],
  ];
  function errMsg(e) {
    var m = String((e && e.message) || "");
    if (m === "__taken__") return tt("auth_err_user_taken");
    if (m === "__nouser__") return tt("auth_err_user_notfound");
    if (m === "__nousertable__") return tt("auth_err_no_usertable");
    for (var i = 0; i < ERRMAP.length; i++)
      if (ERRMAP[i][0].test(m)) return tt(ERRMAP[i][1]);
    return m || tt("auth_err_unknown");
  }

  /* ================= save theo tài khoản ================= */
  function saveKey() {
    return (user && user.id) ? LEGACY_KEY + "::" + user.id : LEGACY_KEY;
  }
  function wrapSave() {
    if (saveWrapped) return;
    saveWrapped = true;
    try {
      var gg = g();
      var store = gg.localStorage;
      Online.save = function (state) {
        try { store.setItem(saveKey(), JSON.stringify(state)); return true; }
        catch (e) { return false; }
      };
      Online.load = function () {
        try {
          var raw = store.getItem(saveKey());
          return raw ? JSON.parse(raw) : null;
        } catch (e) { return null; }
      };
      Online.hasSave = function () {
        try { return !!store.getItem(saveKey()); } catch (e) { return false; }
      };
      Online.wipe = function () {
        try { store.removeItem(saveKey()); } catch (e) {}
      };
    } catch (e) {}
  }

  /* ================= core auth ================= */
  async function afterSignIn(u, username) {
    user = { id: u.id, email: u.email, username: username || u.email };
    anonMode = false;
    wrapSave();
    await ensureUsernameRow();
    scheduleProfileUsername();
  }

  /* Đảm bảo có hàng usernames (phòng khi đăng ký ở chế độ cần xác nhận
     email: lúc signUp chưa có session nên chưa insert được). */
  async function ensureUsernameRow() {
    try {
      var c = client();
      if (!c || !user) return;
      var uname = user.username;
      if (!uname || validEmail(uname)) return;
      uname = normUsername(uname);
      var q = await c.from("usernames").select("username").eq("user_id", user.id).maybeSingle();
      if (!q.data) {
        await c.from("usernames").insert({
          username: uname, user_id: user.id, email: user.email,
        });
      }
      user.username = uname;
    } catch (e) {}
  }

  /* Đồng bộ username lên profiles (best-effort, sau khi OnlineSB tạo profile) */
  function scheduleProfileUsername() {
    if (!user || !user.username || validEmail(user.username)) return;
    var tries = 0;
    var gg = g();
    var timer = gg.setInterval(function () {
      tries++;
      try {
        if (typeof OnlineSB !== "undefined" && OnlineSB.active()) {
          gg.clearInterval(timer);
          var c = client();
          if (!c) return;
          c.from("profiles").update({ username: user.username })
            .eq("user_id", user.id).then(function () {}, function () {});
        } else if (tries > 30) gg.clearInterval(timer);
      } catch (e) { gg.clearInterval(timer); }
    }, 1000);
  }

  async function signUp(username, email, password) {
    var c = client();
    if (!c) throw new Error(tt("auth_err_offline"));
    username = normUsername(username);
    email = String(email).trim();
    if (!validUsername(username)) throw new Error(tt("auth_err_bad_username"));
    if (!validEmail(email)) throw new Error(tt("auth_err_bad_email"));
    if (!validPassword(password)) throw new Error(tt("auth_err_pw_short"));
    /* kiểm tra trùng tên tài khoản */
    try {
      var chk = await c.from("usernames").select("username")
        .eq("username", username).maybeSingle();
      if (chk.data) throw new Error("__taken__");
    } catch (e) {
      if (e.message === "__taken__") throw e;
      /* bảng chưa có / lỗi mạng khi check → vẫn cho đăng ký tiếp,
         lỗi trùng sẽ bắt ở bước insert (PK) */
    }
    var r = await c.auth.signUp({
      email: email,
      password: password,
      options: { data: { username: username } },
    });
    if (r.error) throw r.error;
    if (!r.data.session) return { needConfirm: true };  // cần xác nhận email
    try {
      await c.from("usernames").insert({
        username: username, user_id: r.data.user.id, email: email,
      });
    } catch (e) {
      if (/duplicate|unique|23505/i.test(String((e && e.message) || "")))
        throw new Error("__taken__");
    }
    await afterSignIn(r.data.user, username);
    return { needConfirm: false };
  }

  async function signIn(login, password) {
    var c = client();
    if (!c) throw new Error(tt("auth_err_offline"));
    login = String(login == null ? "" : login).trim();
    if (!login) throw new Error(tt("auth_err_bad_login"));
    if (!validPassword(password)) throw new Error(tt("auth_err_bad_login"));
    var email = login;
    if (!validEmail(login)) {
      /* đăng nhập bằng tên tài khoản → tra email */
      var q = await c.from("usernames").select("email")
        .eq("username", normUsername(login)).maybeSingle();
      if (q.error) throw new Error("__nousertable__");
      if (!q.data) throw new Error("__nouser__");
      email = q.data.email;
    }
    var r = await c.auth.signInWithPassword({ email: email, password: password });
    if (r.error) throw r.error;
    var meta = (r.data.user && r.data.user.user_metadata) || {};
    await afterSignIn(r.data.user, meta.username || null);
    return true;
  }

  async function resetPassword(email) {
    var c = client();
    if (!c) throw new Error(tt("auth_err_offline"));
    email = String(email == null ? "" : email).trim();
    if (!validEmail(email)) throw new Error(tt("auth_err_bad_email"));
    var origin = "";
    try { origin = g().location.origin; } catch (e) {}
    var r = await c.auth.resetPasswordForEmail(email, {
      redirectTo: origin + "/reset-password.html",
    });
    if (r.error) throw r.error;
    return true;
  }

  async function signOut() {
    try {
      var c = client();
      if (c) await c.auth.signOut();
    } catch (e) {}
    user = null;
    anonMode = false;
    try { g().location.reload(); } catch (e) {}
  }

  /* ================= luồng vào game ================= */
  function hideAuth() {
    var el = $("screen-auth");
    if (el) el.classList.add("hidden");
  }
  function showAuth() {
    ["loading", "menu", "create", "game"].forEach(function (n) {
      var el = $("screen-" + n);
      if (el) el.classList.add("hidden");
    });
    var el = $("screen-auth");
    if (el) el.classList.remove("hidden");
    bindUI();
    refreshAuthBar();
  }

  /* Màn hình menu: hiện tên tài khoản + nút đăng xuất */
  function refreshAuthBar() {
    var bar = $("auth-bar");
    if (!bar) return;
    var menu = $("screen-menu");
    var menuVisible = menu && !menu.classList.contains("hidden");
    if (menuVisible && user) {
      bar.classList.remove("hidden");
      var nm = $("auth-bar-name");
      if (nm) nm.textContent = user.username || user.email;
    } else {
      bar.classList.add("hidden");
    }
  }
  function watchMenu() {
    try {
      var menu = $("screen-menu");
      if (!menu || typeof MutationObserver === "undefined") return;
      new MutationObserver(function () { refreshAuthBar(); })
        .observe(menu, { attributes: true, attributeFilter: ["class"] });
    } catch (e) {}
  }

  function enterGame() {
    hideAuth();
    try {
      if (typeof UI !== "undefined" && UI.boot) UI.boot();
    } catch (e) {}
  }

  async function bootFlow() {
    bindUI();
    watchMenu();
    var c = client();
    var session = null;
    try {
      if (c) {
        var s = await c.auth.getSession();
        session = s.data.session;
      }
    } catch (e) {}
    if (session && session.user) {
      var meta = session.user.user_metadata || {};
      await afterSignIn(session.user, meta.username || null);
      enterGame();   // đã đăng nhập (session được ghi nhớ) → vào thẳng game
    } else {
      showAuth();    // chưa đăng nhập → màn hình tài khoản trước
    }
  }

  function playAnonymous() {
    user = null;
    anonMode = true;
    enterGame();     // UI.boot → OnlineSB.boot tự signInAnonymously như cũ
  }

  /* ================= UI màn hình auth ================= */
  function msg(text, isErr) {
    var el = $("auth-msg");
    if (!el) return;
    el.textContent = text || "";
    el.className = text ? (isErr ? "err" : "ok") : "";
  }
  function setBusy(b) {
    ["auth-tab-login", "auth-tab-register", "btn-auth-reset"].forEach(function (id) {
      var el = $(id);
      if (el) el.disabled = !!b;
    });
  }
  function showPane(which) {
    ["auth-login", "auth-register", "auth-forgot"].forEach(function (id) {
      var el = $(id);
      if (el) el.classList.toggle("hidden", id !== "auth-" + which);
    });
    /* 2 nút hành động kiêm tab: nút của pane đang hiện = vàng, còn lại = tối */
    var bl = $("auth-tab-login"), br = $("auth-tab-register");
    var onLogin = (which === "login") || (which === "forgot");
    if (bl) { bl.classList.toggle("gold", onLogin); bl.classList.toggle("dark", !onLogin); }
    if (br) { br.classList.toggle("gold", !onLogin); br.classList.toggle("dark", onLogin); }
    /* pane quên mật khẩu: ẩn 2 nút hành động chính */
    try {
      var acts = g().document.querySelector(".auth-actions");
      if (acts) acts.classList.toggle("hidden", which === "forgot");
    } catch (e) {}
    msg("");
  }

  /* Nút hành động kiêm tab: bấm tab chưa hiện → chuyển pane;
     bấm tab đang hiện → submit luôn (giống tutien2d). */
  function isLoginPane() {
    var el = $("auth-login");
    return el && !el.classList.contains("hidden");
  }
  function isRegisterPane() {
    var el = $("auth-register");
    return el && !el.classList.contains("hidden");
  }
  async function doLogin() {
    msg("");
    var login = $("auth-login-id") ? $("auth-login-id").value : "";
    var pw = $("auth-login-pw") ? $("auth-login-pw").value : "";
    setBusy(true);
    try {
      await signIn(login, pw);
      msg(tt("auth_ok_login"), false);
      setTimeout(enterGame, 400);
    } catch (e) { msg(errMsg(e), true); }
    setBusy(false);
  }
  async function doRegister() {
    msg("");
    var un = $("auth-reg-user") ? $("auth-reg-user").value : "";
    var em = $("auth-reg-email") ? $("auth-reg-email").value : "";
    var p1 = $("auth-reg-pw") ? $("auth-reg-pw").value : "";
    var p2 = $("auth-reg-pw2") ? $("auth-reg-pw2").value : "";
    var terms = $("auth-reg-terms");
    if (terms && !terms.checked) { msg(tt("auth_err_terms"), true); return; }
    if (p1 !== p2) { msg(tt("auth_err_pw_mismatch"), true); return; }
    setBusy(true);
    try {
      var r = await signUp(un, em, p1);
      if (r.needConfirm) {
        msg(tt("auth_ok_need_confirm"), false);
      } else {
        msg(tt("auth_ok_register"), false);
        setTimeout(enterGame, 600);
      }
    } catch (e) { msg(errMsg(e), true); }
    setBusy(false);
  }

  function bindUI() {
    if (bound) return;
    bound = true;
    var on = function (id, fn) {
      var el = $(id);
      if (el) el.onclick = fn;
    };
    on("auth-tab-login", function () {
      if (isLoginPane()) doLogin(); else showPane("login");
    });
    on("auth-tab-register", function () {
      if (isRegisterPane()) doRegister(); else showPane("register");
    });
    on("auth-link-forgot", function () { showPane("forgot"); });
    on("auth-back-login", function () { showPane("login"); });
    on("auth-terms-quick", function () {
      msg(tt("auth_terms_quick_msg"), false);
    });
    on("btn-anon", function () { playAnonymous(); });
    on("btn-logout", function () { signOut(); });

    on("btn-auth-reset", async function () {
      msg("");
      var em = $("auth-forgot-email") ? $("auth-forgot-email").value : "";
      setBusy(true);
      try {
        await resetPassword(em);
        msg(tt("auth_ok_reset_sent"), false);
      } catch (e) { msg(errMsg(e), true); }
      setBusy(false);
    });

    /* Enter để submit */
    try {
      g().document.addEventListener("keydown", function (e) {
        if (e.key !== "Enter") return;
        var authEl = $("screen-auth");
        if (!authEl || authEl.classList.contains("hidden")) return;
        if (isRegisterPane()) doRegister();
        else if ($("auth-forgot") && !$("auth-forgot").classList.contains("hidden")) {
          var b2 = $("btn-auth-reset"); if (b2) b2.click();
        } else doLogin();
      });
    } catch (e) {}
  }

  return {
    bootFlow: bootFlow,
    signUp: signUp,
    signIn: signIn,
    resetPassword: resetPassword,
    signOut: signOut,
    playAnonymous: playAnonymous,
    currentUser: function () { return user; },
    isAnonymous: function () { return anonMode; },
    saveKey: saveKey,
    /* validators (có smoke test) */
    validUsername: validUsername,
    validEmail: validEmail,
    validPassword: validPassword,
    normUsername: normUsername,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = { Auth: Auth };
}
