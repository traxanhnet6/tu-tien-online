/* ============================================================
 * js/skill-preview.js — Thử chiêu theo tông ở MÀN TẠO NHÂN VẬT
 * (Bui 2026-10-27: chọn từng tông, thử chiêu của tông đó vào hình nộm
 *  trước khi chốt nhân vật.)
 *
 * - Tông -> lớp (chuẩn build 98/114): Kiếm Tông->Kiếm Tu,
 *   Thiên Pháp Tông->Pháp Tu, Kim Cang Tông->Đao Tu,
 *   Ngự Thú Tông->Cung Tu, Dược Vương Tông->Thuật Sĩ.
 * - Dữ liệu skill CHỈ ĐỌC từ js/class-skills-*.js (build 114): file này
 *   tự nạp động 5 file pack (nếu chưa nạp) rồi đọc globalThis
 *   .CLASS_SKILL_PACKS, không sửa pack, không tạo nhân vật, không tốn
 *   tài nguyên, không ghi save.
 * - Demo: nhân vật ĐỨNG YÊN tung chiêu kiểu tutien2d (chỉ hiệu ứng di
 *   chuyển), FX vẽ bằng code theo fxType, chạy đúng 20 frame; số damage
 *   hiện lên hình nộm; tông chọn ở đây chỉ để thử, không đổi tông của
 *   nhân vật khi chốt (gia nhập tông vẫn diễn ra trong game sau).
 * - Nạp động từ ui.js (initCreate) nên không cần sửa index.html.
 * - Node-safe: không đụng DOM khi require; chỉ chạy UI ở trình duyệt.
 * ============================================================ */
(function (global) {
  "use strict";

  /* Tông chọn để thử (thứ tự hiển thị) + lớp tương ứng + hệ cho baseStats */
  var SECT_ORDER = [
    { sect: "kiem_tong",       cls: "kiem_tu",  name: "Kiếm Tông",       className: "Kiếm Tu",  bs: "kiem" },
    { sect: "thien_phap_tong",  cls: "phap_tu",  name: "Thiên Pháp Tông",  className: "Pháp Tu",  bs: "phap" },
    { sect: "kim_cang_tong",    cls: "dao_tu",   name: "Kim Cang Tông",    className: "Đao Tu",   bs: "the"  },
    { sect: "ngu_thu_tong",     cls: "cung_tu",  name: "Ngự Thú Tông",     className: "Cung Tu",  bs: null  },
    { sect: "duoc_vuong_tong",  cls: "thuat_si", name: "Dược Vương Tông",  className: "Thuật Sĩ", bs: null  }
  ];
  var PACK_FILES = [
    "js/class-skills-kiem-tu.js", "js/class-skills-phap-tu.js",
    "js/class-skills-dao-tu.js", "js/class-skills-cung-tu.js",
    "js/class-skills-thuat-si.js"
  ];
  var FX_TYPES = { bolt: 1, slash: 1, fire: 1, lightning: 1, circle: 1 };
  var FRAMES = 20, FRAME_MS = 40, IMPACT_FRAME = 12;
  var DUMMY_MAX_HP = 500;

  function _packs() {
    try { return global.CLASS_SKILL_PACKS || null; } catch (e) { return null; }
  }
  function packsReady() {
    var p = _packs();
    if (!p) return false;
    for (var i = 0; i < SECT_ORDER.length; i++) if (!p[SECT_ORDER[i].cls]) return false;
    return true;
  }
  /* Nạp động 5 file pack theo thứ tự; xong gọi cb(true/false). */
  function loadPacks(cb) {
    if (packsReady()) { if (cb) cb(true); return; }
    if (typeof document === "undefined") { if (cb) cb(false); return; }
    var i = 0;
    (function next() {
      if (i >= PACK_FILES.length) { if (cb) cb(packsReady()); return; }
      var s = document.createElement("script");
      s.src = PACK_FILES[i] + "?v=" + (typeof TT_BUILD !== "undefined" ? TT_BUILD : "1");
      i++;
      s.onload = next;
      s.onerror = next; /* file lỗi: vẫn thử file sau, cuối cùng báo thiếu */
      document.head.appendChild(s);
    })();
  }
  /* Skill của 1 lớp: { basic, actives[], passives[] } — chỉ đọc, không sửa. */
  function skillsOf(cls) {
    var p = _packs();
    if (!p || !p[cls]) return null;
    var pk = p[cls];
    return { basic: pk.basic || null, actives: pk.actives || [], passives: pk.passives || [] };
  }
  function kindLabel(skill, isBasic) {
    if (isBasic) return "Đánh thường";
    var k = skill && skill.kind;
    if (k === "dmg") return "Chủ động · Sát thương";
    if (k === "aoe") return "Chủ động · Diện rộng";
    if (k === "control") return "Chủ động · Khống chế";
    if (k === "heal") return "Chủ động · Hồi phục";
    if (k === "buff") return "Chủ động · Buff";
    return "Chủ động";
  }
  function costText(skill) {
    if (!skill) return "Không tốn";
    var parts = [];
    if (skill.mp) parts.push("Linh Lực " + skill.mp);
    if (skill.focus) parts.push("Thần Thức " + skill.focus);
    return parts.length ? parts.join(" · ") : "Không tốn";
  }
  /* Công kích demo ở Luyện Khí tầng 1 (baseStats như ui.js); lỗi -> 56. */
  function demoAtk(sectEntry) {
    try {
      if (typeof baseStats === "function") {
        var bs = baseStats(1, 1, sectEntry.bs || undefined);
        if (bs && bs.atk) return bs.atk;
      }
    } catch (e) {}
    return 56;
  }
  /* Damage demo: đánh thường/dmg/aoe/control dùng hệ số mult; buff/heal -> 0. */
  function demoDamage(skill, atk) {
    if (!skill) return 0;
    var k = skill.kind;
    if (k === "buff" || k === "heal") return 0;
    var m = (typeof skill.mult === "number") ? skill.mult : 1;
    return Math.max(1, Math.round((atk || 56) * m));
  }
  function realmLabel(realm) {
    if (realm === 1) return "Luyện Khí";
    if (realm === 2) return "Trúc Cơ";
    if (realm === 3) return "Kim Đan";
    if (realm === 4) return "Nguyên Anh";
    return realm ? ("Cảnh giới " + realm) : "—";
  }

  /* ---------------- UI trình duyệt ---------------- */
  var _imgCache = {};
  function _img(src) {
    if (typeof document === "undefined") return null;
    var im = _imgCache[src];
    if (!im) { im = new Image(); im.src = src; _imgCache[src] = im; }
    return (im.complete && im.naturalWidth) ? im : null;
  }
  function _el(tag, style, text) {
    var e = document.createElement(tag);
    if (style) e.setAttribute("style", style);
    if (text != null) e.textContent = text;
    return e;
  }
  function _btn(text, style) {
    var b = _el("button", "cursor:pointer;border:1px solid #8a6d3b;border-radius:8px;padding:6px 10px;background:#2e2620;color:#f5eeda;font-size:14px;" + (style || ""), text);
    b.type = "button";
    return b;
  }
  function _gender(getSel) {
    try { var s = getSel(); return (s && s.gender === "nu") ? "nu" : "nam"; } catch (e) { return "nam"; }
  }

  function mount(opts) {
    if (typeof document === "undefined" || !opts || !opts.wrap) return false;
    var wrap = opts.wrap;
    var getSel = opts.getSel || function () { return {}; };
    var old = document.getElementById("sp-preview-block");
    if (old) { /* gắn lại khi mở màn tạo lần nữa: vẽ lại theo tông đang chọn */
      var st0 = old._spState;
      if (st0) { renderSect(st0); drawIdle(st0); }
      return true;
    }
    var block = _el("div", "margin:12px 0;padding:10px;border:1px solid #8a6d3b;border-radius:10px;background:rgba(0,0,0,0.28);");
    block.id = "sp-preview-block";
    var title = _el("div", "font-weight:bold;margin-bottom:8px;color:#ffd98a;", "Chọn tông môn — thử chiêu trước khi chốt");
    block.appendChild(title);
    var sectRow = _el("div", "display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;");
    block.appendChild(sectRow);
    var skillRow = _el("div", "display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;");
    block.appendChild(skillRow);
    var info = _el("div", "font-size:13px;line-height:1.5;color:#f5eeda;margin-bottom:8px;min-height:66px;");
    block.appendChild(info);
    var stage = _el("canvas", "width:100%;max-width:420px;height:210px;background:linear-gradient(#2b2118,#17100a);border:1px solid #8a6d3b;border-radius:8px;image-rendering:pixelated;display:block;");
    stage.width = 360; stage.height = 210;
    block.appendChild(stage);
    var note = _el("div", "font-size:12px;color:#cbbd93;margin-top:6px;",
      "Thử chiêu không tốn tài nguyên, không tạo nhân vật. Tông chọn ở đây chỉ để thử — chốt nhân vật vẫn bằng nút “Bắt đầu tu tiên”, tông chính thức gia nhập trong game sau.");
    block.appendChild(note);
    var btnBegin = wrap.querySelector("#btn-begin");
    if (btnBegin && btnBegin.parentNode === wrap) wrap.insertBefore(block, btnBegin);
    else wrap.appendChild(block);

    var state = { block: block, sectRow: sectRow, skillRow: skillRow, info: info,
      stage: stage, ctx: stage.getContext("2d"), sect: SECT_ORDER[0],
      skill: null, isBasic: false, isPassive: false,
      anim: null, floaters: [], dummyHp: DUMMY_MAX_HP, dummyFlash: 0,
      charImg: null, idleTimer: null, getSel: getSel };
    block._spState = state;

    SECT_ORDER.forEach(function (se) {
      var b = _btn(se.name + " · " + se.className, "");
      b.setAttribute("data-sp-sect", se.sect);
      b.onclick = function () {
        state.sect = se; state.skill = null;
        try { var s = getSel(); if (s) s._previewSect = se.sect; } catch (e) {}
        try { if (typeof sfx === "function") sfx("click"); } catch (e) {}
        renderSect(state); drawIdle(state);
      };
      sectRow.appendChild(b);
    });

    /* Nạp pack rồi dựng skill của tông đầu; lỗi tải -> giữ nút tông, báo rõ. */
    loadPacks(function (ok) {
      if (!ok) {
        info.textContent = "Chưa tải được dữ liệu skill của các tông — thử mở lại màn tạo nhân vật. (Việc tạo nhân vật vẫn hoạt động bình thường.)";
        return;
      }
      renderSect(state); drawIdle(state);
    });
    /* Vẽ lại khung chờ khi đổi giới tính ở màn tạo (sprite demo theo giới). */
    state.idleTimer = setInterval(function () {
      if (!document.contains(stage)) { clearInterval(state.idleTimer); return; }
      if (!state.anim && !state.floaters.length) drawIdle(state);
    }, 1000);
    return true;
  }

  function renderSect(state) {
    var sk = skillsOf(state.sect.cls);
    var sbs = state.sectRow.children;
    for (var i = 0; i < sbs.length; i++)
      sbs[i].style.background = (sbs[i].getAttribute("data-sp-sect") === state.sect.sect) ? "#7a5a1e" : "#2e2620";
    state.skillRow.innerHTML = "";
    state.info.innerHTML = "";
    if (!sk) { state.info.textContent = "Chưa có dữ liệu skill cho tông này."; return; }
    var list = [];
    if (sk.basic) list.push({ s: sk.basic, basic: true, passive: false });
    (sk.actives || []).forEach(function (a) { list.push({ s: a, basic: false, passive: false }); });
    (sk.passives || []).forEach(function (p) { list.push({ s: p, basic: false, passive: true }); });
    /* Skill chưa có FX vẽ được thì ẩn hẳn (FX code phủ đủ 5 loại nên thường không ẩn). */
    list = list.filter(function (it) {
      if (it.passive) return true;
      var fx = (it.s && it.s.fxType) || "slash";
      return !!FX_TYPES[fx];
    });
    list.forEach(function (it) {
      var b = _btn(it.s.name + (it.passive ? " · Bị động" : ""), it.passive ? "opacity:0.85;" : "");
      b.onclick = function () {
        state.skill = it.s; state.isBasic = it.basic; state.isPassive = it.passive;
        try { if (typeof sfx === "function") sfx("click"); } catch (e) {}
        renderInfo(state);
        if (it.passive) playPassive(state);
        else playSkill(state);
      };
      state.skillRow.appendChild(b);
    });
    if (list.length) {
      var first = list[0];
      state.skill = first.s; state.isBasic = first.basic; state.isPassive = first.passive;
      renderInfo(state);
    }
  }

  function renderInfo(state) {
    var s = state.skill;
    if (!s) { state.info.innerHTML = ""; return; }
    var atk = demoAtk(state.sect);
    var dmg = state.isPassive ? 0 : demoDamage(s, atk);
    var lines = [];
    lines.push("<b>" + escHtml(s.name) + "</b> · " +
      (state.isPassive ? "Bị động" : kindLabel(s, state.isBasic)) +
      " · " + state.sect.name + " (" + state.sect.className + ")");
    if (state.isPassive) {
      lines.push("Tác dụng: " + escHtml(s.desc || "—"));
      if (s.effect) lines.push("Hiệu quả: " + escHtml(JSON.stringify(s.effect)));
      lines.push("Bị động tự kích hoạt sau khi học — bấm để xem hào quang buff demo, không gây damage lên hình nộm.");
    } else {
      lines.push("Tác dụng: " + escHtml(s.desc || "—"));
      lines.push("Hồi chiêu: " + (s.cd ? s.cd + "s" : "Không") + " · Chi phí: " + costText(s) +
        " · Tầm: " + (s.range != null ? s.range : "—") +
        (s.realm ? " · Mở ở: " + realmLabel(s.realm) : ""));
      if (dmg) lines.push("Damage demo (công " + atk + " ở Luyện Khí tầng 1): <b>-" + dmg + "</b>");
      if (s.kind === "heal" && s.healPct) lines.push("Hồi phục demo: +" + s.healPct + "% HP");
      if (s.stunDur) lines.push("Khống chế: choáng " + s.stunDur + "s");
    }
    state.info.innerHTML = lines.join("<br>");
  }
  function escHtml(x) {
    return String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /* ---------------- Vẽ sân demo ---------------- */
  function drawDummy(ctx, x, y, hp, maxHp, flash, shake) {
    var sx = shake ? (Math.random() * 6 - 3) : 0;
    ctx.save();
    ctx.translate(x + sx, y);
    /* cọc gỗ + đòn ngang + rơm */
    ctx.fillStyle = "#6b4a2a"; ctx.fillRect(-4, -70, 8, 110);
    ctx.fillStyle = "#7d5a33"; ctx.fillRect(-34, -58, 68, 10);
    ctx.fillStyle = "#c9a44a"; ctx.fillRect(-26, -100, 52, 44);
    ctx.fillStyle = "#a8823a"; ctx.fillRect(-26, -100, 52, 8);
    ctx.fillStyle = "#3a2a18"; ctx.fillRect(-30, 36, 60, 8);
    if (flash > 0) { ctx.fillStyle = "rgba(255,255,255," + (flash * 0.7) + ")"; ctx.fillRect(-26, -100, 52, 44); }
    ctx.restore();
    /* thanh HP */
    ctx.fillStyle = "#1a120a"; ctx.fillRect(x - 34, y - 122, 68, 10);
    ctx.fillStyle = hp > maxHp * 0.3 ? "#3fae6a" : "#c8404a";
    ctx.fillRect(x - 33, y - 121, 66 * Math.max(0, hp / maxHp), 8);
    ctx.fillStyle = "#f5eeda"; ctx.font = "11px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("Hình nộm", x, y - 128);
    ctx.fillText(Math.max(0, Math.round(hp)) + "/" + maxHp, x, y + 58);
  }
  function drawChar(ctx, x, y, gender, clsColor) {
    var im = _img("assets/sprs/dirs/player_" + gender + "_right.png");
    ctx.save();
    if (im) {
      ctx.imageSmoothingEnabled = false;
      var h = 96, w = 96 * (im.width / im.height);
      ctx.drawImage(im, x - w / 2, y - h, w, h);
    } else {
      /* fallback vẽ bằng code khi sprite chưa tải: chibi đứng yên */
      ctx.fillStyle = "#1e222e"; ctx.beginPath(); ctx.arc(x, y - 82, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = clsColor || "#e8e6df"; ctx.fillRect(x - 13, y - 66, 26, 44);
      ctx.fillStyle = "#c8404a"; ctx.fillRect(x - 13, y - 30, 26, 6);
      ctx.fillStyle = "#2e2a26"; ctx.fillRect(x - 11, y - 22, 10, 22); ctx.fillRect(x + 1, y - 22, 10, 22);
    }
    /* bóng đổ */
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath(); ctx.ellipse(x, y + 2, 22, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  function drawFx(ctx, fx, frame, cx, cy, dx, dy, color) {
    var p = frame / (FRAMES - 1); /* 0..1 */
    ctx.save();
    ctx.globalAlpha = 1;
    if (fx === "bolt") {
      /* đạn bay ngang từ nhân vật tới hình nộm, nổ ở frame impact */
      var bx = (frame < IMPACT_FRAME) ? cx + (dx - cx) * (frame / IMPACT_FRAME) : dx;
      var by = cy - 62 + Math.sin(frame * 0.9) * 2;
      ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(bx, by, 7 + (frame >= IMPACT_FRAME ? (frame - IMPACT_FRAME) * 1.2 : 0), 0, Math.PI * 2); ctx.fill();
      if (frame >= IMPACT_FRAME) {
        ctx.globalAlpha = Math.max(0, 1 - (frame - IMPACT_FRAME) / 7);
        ctx.beginPath(); ctx.arc(dx, cy - 62, 10 + (frame - IMPACT_FRAME) * 4, 0, Math.PI * 2); ctx.fill();
      }
    } else if (fx === "slash") {
      /* vệt chém quét ngang qua hình nộm rồi mờ */
      var a = (frame < 10) ? frame / 10 : Math.max(0, 1 - (frame - 10) / 9);
      ctx.globalAlpha = a; ctx.strokeStyle = color; ctx.lineWidth = 7; ctx.shadowColor = color; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(dx, cy - 60, 34, -0.6, 1.1); ctx.stroke();
    } else if (fx === "fire") {
      /* cụm lửa nở ra ở hình nộm */
      var r = 8 + p * 30;
      ctx.globalAlpha = 0.9 - p * 0.4;
      ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.arc(dx, cy - 60, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffd54f";
      ctx.beginPath(); ctx.arc(dx, cy - 60, r * 0.55, 0, Math.PI * 2); ctx.fill();
    } else if (fx === "lightning") {
      /* sét đánh từ trời xuống hình nộm */
      if (frame >= 4 && frame <= 16) {
        ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.shadowColor = color; ctx.shadowBlur = 16;
        ctx.beginPath(); ctx.moveTo(dx - 8, cy - 190); ctx.lineTo(dx + 6, cy - 120);
        ctx.lineTo(dx - 4, cy - 60); ctx.stroke();
        if (frame >= 8) { ctx.globalAlpha = Math.max(0, 1 - (frame - 8) / 8); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(dx, cy - 60, 26, 0, Math.PI * 2); ctx.fill(); }
      }
    } else { /* circle: vòng tròn nở ra */
      ctx.globalAlpha = 0.95 - p * 0.5; ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.shadowColor = color; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(dx, cy - 60, 10 + p * 44, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
  function drawScene(state, fxFrame) {
    var ctx = state.ctx, cv = state.stage;
    if (!ctx) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    /* nền đất */
    ctx.fillStyle = "#241a12"; ctx.fillRect(0, cv.height - 40, cv.width, 40);
    ctx.fillStyle = "#3a2c1c"; ctx.fillRect(0, cv.height - 40, cv.width, 3);
    var gender = _gender(state.getSel);
    var cx = 80, cy = cv.height - 40, dx = 280;
    var pack = null;
    try { pack = (_packs() || {})[state.sect.cls]; } catch (e) {}
    var color = (pack && pack.color) || "#35c8ff";
    drawChar(ctx, cx, cy, gender, color);
    var shake = state.dummyFlash > 0.5;
    drawDummy(ctx, dx, cy, state.dummyHp, DUMMY_MAX_HP, state.dummyFlash, shake);
    if (state.anim && fxFrame != null) {
      var a = state.anim;
      var tx = (a.target === "self") ? cx : dx;
      var ty = cy;
      drawFx(ctx, a.fx, fxFrame, cx, cy, tx, ty, color);
    }
    /* số damage / chữ hiệu ứng bay lên */
    ctx.textAlign = "center";
    state.floaters.forEach(function (f) {
      ctx.globalAlpha = Math.max(0, f.t / f.maxT);
      ctx.font = "bold 20px sans-serif";
      ctx.fillStyle = f.color;
      ctx.fillText(f.txt, f.x, f.y - (1 - f.t / f.maxT) * 34);
    });
    ctx.globalAlpha = 1;
  }
  function drawIdle(state) {
    if (!state.anim) { state.floaters = []; drawScene(state, null); }
  }
  function tick(state) {
    if (!document.contains(state.stage)) { state.anim = null; return; }
    var a = state.anim;
    if (!a) return;
    a.frame++;
    if (a.frame === IMPACT_FRAME) {
      if (a.dmg > 0) {
        state.dummyHp -= a.dmg;
        state.floaters.push({ txt: "-" + a.dmg, color: "#ffd54f", x: 280, y: 90, t: 1.1, maxT: 1.1 });
        state.dummyFlash = 1;
        if (state.dummyHp <= 0) {
          state.floaters.push({ txt: "Hình nộm đã vỡ!", color: "#ff8a6a", x: 280, y: 60, t: 1.4, maxT: 1.4 });
          setTimeout(function () { state.dummyHp = DUMMY_MAX_HP; drawIdle(state); }, 1200);
        }
      } else if (a.label) {
        state.floaters.push({ txt: a.label, color: "#7dff9a", x: a.target === "self" ? 80 : 280, y: 90, t: 1.1, maxT: 1.1 });
      }
    }
    if (state.dummyFlash > 0) state.dummyFlash = Math.max(0, state.dummyFlash - 0.25);
    state.floaters.forEach(function (f) { f.t -= FRAME_MS / 1000; });
    state.floaters = state.floaters.filter(function (f) { return f.t > 0; });
    drawScene(state, a.frame);
    if (a.frame < FRAMES - 1) {
      setTimeout(function () { tick(state); }, FRAME_MS);
    } else {
      state.anim = null;
      setTimeout(function () { if (!state.anim) drawScene(state, null); }, 300);
    }
  }
  function playSkill(state) {
    var s = state.skill;
    if (!s || state.anim) return;
    var fx = (s.fxType && FX_TYPES[s.fxType]) ? s.fxType : "slash";
    var atk = demoAtk(state.sect);
    var dmg = demoDamage(s, atk);
    var selfKind = (s.kind === "buff" || s.kind === "heal") && (!s.range || s.range === 0);
    var label = null;
    if (s.kind === "heal" && s.healPct) label = "+" + s.healPct + "% HP";
    else if (s.kind === "buff") label = s.name;
    else if (s.kind === "control") label = "Choáng!";
    state.anim = { fx: fx, frame: -1, dmg: dmg,
      target: selfKind ? "self" : "dummy", label: label };
    try { if (typeof sfx === "function") sfx("slash"); } catch (e) {}
    tick(state);
  }
  function playPassive(state) {
    var s = state.skill;
    if (!s || state.anim) return;
    state.anim = { fx: "circle", frame: -1, dmg: 0, target: "self", label: s.name };
    tick(state);
  }

  var SkillPreview = {
    SECT_ORDER: SECT_ORDER, PACK_FILES: PACK_FILES, FRAMES: FRAMES,
    packsReady: packsReady, loadPacks: loadPacks, skillsOf: skillsOf,
    kindLabel: kindLabel, costText: costText, demoAtk: demoAtk,
    demoDamage: demoDamage, mount: mount
  };
  if (typeof module !== "undefined" && module.exports) module.exports = SkillPreview;
  else global.SkillPreview = SkillPreview;
})(typeof globalThis !== "undefined" ? globalThis : this);
