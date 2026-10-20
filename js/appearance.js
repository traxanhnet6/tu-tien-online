/* ============================================================
 * js/appearance.js — Tùy chỉnh ngoại hình khi TẠO NHÂN VẬT
 * (Bui 2026-10-20: chọn mặt mũi / tóc / màu da / màu tóc / màu áo
 *  bằng bảng mẫu sẵn, đơn giản cho tân thủ; kèm nút NGẪU NHIÊN
 *  tên nhân vật + NGẪU NHIÊN ngoại hình.)
 *
 * Dữ liệu lưu ở state.char.appearance:
 *   { face, hair, skin, hairColor, outfitColor } — toàn id chuỗi.
 * Áp dụng vào game qua CharAnim (engine.js _drawPlayer):
 *   - mặt  -> part "dau" = assets/charparts/faces/<g>_<face>.png
 *   - tóc  -> part "toc" = assets/charparts/hairs/<g>_<hair>.png
 *             (chỉ khi chưa đội mũ từ EquipSet — mũ thắng tóc)
 *   - màu  -> opts.tints của CharAnim.draw (xem charanim.js)
 * Node-safe: không đụng DOM khi require; UI chỉ chạy ở trình duyệt.
 * ============================================================ */
(function (global) {
  "use strict";

  /* ---------------- Danh mục ---------------- */
  var FACES = [
    { id: "mat_thuong",     nameKey: "ap_face_mat_thuong" },
    { id: "mat_nghiem",     nameKey: "ap_face_mat_nghiem" },
    { id: "mat_hien",       nameKey: "ap_face_mat_hien" },
    { id: "mat_lanh",       nameKey: "ap_face_mat_lanh" },
    { id: "mat_ngay_tho",   nameKey: "ap_face_mat_ngay_tho" },
    { id: "mat_phong_tran", nameKey: "ap_face_mat_phong_tran" }
  ];

  var HAIRS = {
    nam: [
      { id: "toc_bui_cao",  nameKey: "ap_hair_toc_bui_cao" },
      { id: "toc_bui_thap", nameKey: "ap_hair_toc_bui_thap" },
      { id: "toc_xoa_dai",  nameKey: "ap_hair_toc_xoa_dai" },
      { id: "toc_dau_dinh", nameKey: "ap_hair_toc_dau_dinh" },
      { id: "toc_bui_doi",  nameKey: "ap_hair_toc_bui_doi" },
      { id: "toc_tem_lech", nameKey: "ap_hair_toc_tem_lech" },
      { id: "toc_dau_troc", nameKey: "ap_hair_toc_dau_troc" }
    ],
    nu: [
      { id: "toc_bui_cao_hoa",    nameKey: "ap_hair_toc_bui_cao_hoa" },
      { id: "toc_bui_doi",        nameKey: "ap_hair_toc_bui_doi" },
      { id: "toc_xoa_dai",        nameKey: "ap_hair_toc_xoa_dai" },
      { id: "toc_tem",            nameKey: "ap_hair_toc_tem" },
      { id: "toc_bim_dai",        nameKey: "ap_hair_toc_bim_dai" },
      { id: "toc_bui_thap_ngoc",  nameKey: "ap_hair_toc_bui_thap_ngoc" }
    ]
  };

  /* Màu da: hex = tông da đích (da_sang = màu gốc của art, không nhuộm) */
  var SKIN_COLORS = [
    { id: "da_trang", nameKey: "ap_skin_da_trang", hex: "#ffdfc4" },
    { id: "da_sang",  nameKey: "ap_skin_da_sang",  hex: null },
    { id: "da_vang",  nameKey: "ap_skin_da_vang",  hex: "#eec088" },
    { id: "da_ngam",  nameKey: "ap_skin_da_ngam",  hex: "#d69c60" },
    { id: "da_nau",   nameKey: "ap_skin_da_nau",   hex: "#b57a44" }
  ];

  /* Màu tóc: hex đích; màu gốc theo giới (nam: đen, nữ: nâu) = không nhuộm */
  var HAIR_COLORS = [
    { id: "toc_den",      nameKey: "ap_hc_toc_den",      hex: "#232733" },
    { id: "toc_nau",      nameKey: "ap_hc_toc_nau",      hex: "#7a4a2a" },
    { id: "toc_bac",      nameKey: "ap_hc_toc_bac",      hex: "#a8b0b8" },
    { id: "toc_bach_kim", nameKey: "ap_hc_toc_bach_kim", hex: "#ece7db" },
    { id: "toc_do",       nameKey: "ap_hc_toc_do",       hex: "#b2323a" },
    { id: "toc_tim",      nameKey: "ap_hc_toc_tim",      hex: "#7d4fa6" },
    { id: "toc_xanh",     nameKey: "ap_hc_toc_xanh",     hex: "#4079b8" },
    { id: "toc_hong",     nameKey: "ap_hc_toc_hong",     hex: "#e58bb1" }
  ];

  /* Màu áo: remap theo độ sáng lên các pixel vải có màu (giữ viền tối/trắng) */
  var OUTFIT_COLORS = [
    { id: "ao_goc",  nameKey: "ap_oc_ao_goc",  hex: null },
    { id: "ao_trang", nameKey: "ap_oc_ao_trang", hex: "#e8e6df" },
    { id: "ao_lam",  nameKey: "ap_oc_ao_lam",  hex: "#5b8fd6" },
    { id: "ao_do",   nameKey: "ap_oc_ao_do",   hex: "#c8404a" },
    { id: "ao_tim",  nameKey: "ap_oc_ao_tim",  hex: "#8a5fb0" },
    { id: "ao_vang", nameKey: "ap_oc_ao_vang", hex: "#d9a92c" },
    { id: "ao_luc",  nameKey: "ap_oc_ao_luc",  hex: "#3fae6a" },
    { id: "ao_den",  nameKey: "ap_oc_ao_den",  hex: "#565d6b" },
    { id: "ao_hong", nameKey: "ap_oc_ao_hong", hex: "#e58bb1" }
  ];

  /* Tông gốc trong art (để nhuộm tương đối) */
  var BASE = {
    nam: { skin: "#f0c698", skinFamily: ["#f0c698", "#deac80", "#c6946c"],
           hair: "#1e222e", hairFamily: ["#1e222e", "#18161a"], hairDefault: "toc_den" },
    nu:  { skin: "#f7d4b0", skinFamily: ["#f7d4b0", "#e4ba96", "#cda080", "#ee828c"],
           hair: "#422c1e", hairFamily: ["#422c1e", "#302016", "#18161a"], hairDefault: "toc_nau" }
  };

  var SKIN_PARTS = ["dau", "co", "than", "tay_trai_tren", "tay_trai_duoi", "tay_phai_tren", "tay_phai_duoi"];
  var OUTFIT_PARTS = ["ao", "quan"];

  function _find(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function _gender(g) { return g === "nu" ? "nu" : "nam"; }

  function defaults(gender) {
    gender = _gender(gender);
    return {
      face: "mat_thuong",
      hair: HAIRS[gender][0].id,
      skin: "da_sang",
      hairColor: BASE[gender].hairDefault,
      outfitColor: "ao_goc"
    };
  }

  /* Chuẩn hóa object appearance từ save/sel — id lạ thì rơi về mặc định */
  function normalize(a, gender) {
    gender = _gender(gender);
    var d = defaults(gender);
    if (!a || typeof a !== "object") return d;
    var out = {
      face: _find(FACES, a.face) ? a.face : d.face,
      hair: _find(HAIRS[gender], a.hair) ? a.hair : d.hair,
      skin: _find(SKIN_COLORS, a.skin) ? a.skin : d.skin,
      hairColor: _find(HAIR_COLORS, a.hairColor) ? a.hairColor : d.hairColor,
      outfitColor: _find(OUTFIT_COLORS, a.outfitColor) ? a.outfitColor : d.outfitColor
    };
    return out;
  }

  function faceImg(a, gender) {
    gender = _gender(gender);
    var f = (a && _find(FACES, a.face)) ? a.face : "mat_thuong";
    return "assets/charparts/faces/" + gender + "_" + f + ".png";
  }
  function hairImg(a, gender) {
    gender = _gender(gender);
    var h = (a && _find(HAIRS[gender], a.hair)) ? a.hair : HAIRS[gender][0].id;
    return "assets/charparts/hairs/" + gender + "_" + h + ".png";
  }

  /* Dựng opts cho CharAnim.draw từ state: {equip:{dau,toc}, tints:{...}} */
  function optsFor(state) {
    try {
      if (!state || !state.char) return null;
      var gender = _gender(state.char.gender);
      var a = normalize(state.char.appearance, gender);
      var base = BASE[gender];
      var equip = { dau: faceImg(a, gender), toc: hairImg(a, gender) };
      var tints = {};
      var skin = _find(SKIN_COLORS, a.skin);
      if (skin && skin.hex) {
        var sk = { m: "scale", from: base.skin, to: skin.hex, match: base.skinFamily, tol: 85 };
        SKIN_PARTS.forEach(function (p) { tints[p] = sk; });
      }
      if (a.hairColor !== base.hairDefault) {
        var hc = _find(HAIR_COLORS, a.hairColor);
        if (hc && hc.hex) {
          tints.toc = { m: "remap", to: hc.hex, ref: base.hair, match: base.hairFamily, tol: 80 };
        }
      }
      var oc = _find(OUTFIT_COLORS, a.outfitColor);
      if (oc && oc.hex) {
        var ot = { m: "remap", to: oc.hex, refLum: 0.55, satMin: 0.15 };
        OUTFIT_PARTS.forEach(function (p) { tints[p] = ot; });
      }
      return { equip: equip, tints: tints };
    } catch (e) { return null; }
  }

  /* ---------------- Ngẫu nhiên ngoại hình ---------------- */
  function _pick(list, rnd) { return list[Math.floor(rnd() * list.length)]; }
  function randomize(gender, rnd) {
    gender = _gender(gender);
    rnd = rnd || Math.random;
    return {
      face: _pick(FACES, rnd).id,
      hair: _pick(HAIRS[gender], rnd).id,
      skin: _pick(SKIN_COLORS, rnd).id,
      hairColor: _pick(HAIR_COLORS, rnd).id,
      outfitColor: _pick(OUTFIT_COLORS, rnd).id
    };
  }

  /* ---------------- Sinh tên ngẫu nhiên ---------------- */
  var SURNAMES = ["Trần", "Lý", "Vương", "Lưu", "Dương", "Hoàng", "Triệu", "Ngô",
    "Châu", "Từ", "Tôn", "Hồ", "Chu", "Cao", "Lâm", "Hà", "Quách", "Mã", "La",
    "Lương", "Tống", "Trịnh", "Tạ", "Hàn", "Đường", "Phùng", "Đổng", "Tiêu",
    "Trình", "Diệp", "Tô", "Sở", "Lục", "Bạch", "Liễu", "Phong", "Lăng", "Mặc",
    "Cố", "Thẩm", "Mộ Dung", "Âu Dương", "Tư Mã", "Gia Cát", "Đoàn", "Giang", "Âu", "Hàn"];
  var GIVEN_NAM = ["Vân", "Phong", "Thiên", "Kiếm", "Huyền", "Vô Kỵ", "Tử Hiên",
    "Trường Không", "Dật Phong", "Hàn Mặc", "Dạ Vũ", "Lăng Vân", "Thanh Phong",
    "Ngạo Thiên", "Kinh Hồng", "Lưu Vân", "Tinh Thần", "Vô Trần", "Thiên Vũ",
    "Trường Sinh", "Nhất Kiếm", "Phi Dương", "Hiểu Phong", "Tàn Nguyệt",
    "Mộ Hàn", "Thiếu Khanh", "Văn Xương", "Hạo Nhiên", "Tử Mặc", "Độc Cô"];
  var GIVEN_NU = ["Tuyết", "Nguyệt", "Linh", "Tử Yên", "Thanh Loan", "Mộng Điệp",
    "Nhược Hy", "Khuynh Thành", "Linh Nhi", "Tiểu Tuyết", "Băng Tâm", "Vân Thường",
    "Mộ Tuyết", "Lưu Ly", "Tuyết Nhi", "Nguyệt Hoa", "Linh Lung", "Tử Hàm",
    "Thanh Tuyết", "Mộng Dao", "Yên Nhiên", "Nhược Lan", "Vân Nhi", "Khinh Vũ",
    "Ngưng Sương", "Lạc Tuyết", "Tố Tâm", "Hương Lan", "Tử Huyên", "Minh Nguyệt"];

  function randomName(gender, avoid, rnd) {
    rnd = rnd || Math.random;
    var given = _gender(gender) === "nu" ? GIVEN_NU : GIVEN_NAM;
    var name = "";
    for (var i = 0; i < 12; i++) {
      name = _pick(SURNAMES, rnd) + " " + _pick(given, rnd);
      if (name !== avoid) break;
    }
    return name;
  }

  /* ---------------- Preview (trình duyệt) ---------------- */
  /* Preload part mặt/tóc để kiểm tra sẵn sàng trước khi vẽ. */
  var _preImgs = {};
  function readyImg(src) {
    if (!src || typeof document === "undefined") return false;
    var im = _preImgs[src];
    if (!im) { im = new Image(); im.src = src; _preImgs[src] = im; }
    return !!(im.complete && im.naturalWidth);
  }

  /* ---------------- Preview bằng SPRITE THẬT (Bui 2026-10-20) ---------------- */
  /* Preview màn tạo nhân vật / Đổi Ngoại Hình phải GIỐNG Y nhân vật trong map:
   * vẽ đúng file sprite player_<giới>_down.png rồi áp Y HỆT pipeline biến thể
   * của engine (Engine.variantSpecFor/variantCanvasFor). */
  var _sprImgs = {};    // src -> Image (preload sprite thật)
  var _sprWaiters = {}; // src -> [fn] gọi khi sprite vừa tải xong
  function _spriteSrc(gender) {
    return "assets/sprs/dirs/player_" + _gender(gender) + "_down.png";
  }
  /* Trả Image khi đã tải xong; chưa xong thì warm + xếp onready vào hàng đợi. */
  function _warmSprite(gender, onready) {
    if (typeof document === "undefined") return null;
    var src = _spriteSrc(gender);
    var im = _sprImgs[src];
    if (!im) {
      im = new Image();
      _sprImgs[src] = im;
      var _fire = function () {
        var ws = _sprWaiters[src] || [];
        _sprWaiters[src] = [];
        for (var i = 0; i < ws.length; i++) { try { ws[i](); } catch (e) {} }
      };
      im.onload = _fire;
      im.onerror = _fire; /* lỗi tải: bỏ hàng đợi, giữ fallback CharAnim */
      im.src = src;
    }
    if (im.complete && im.naturalWidth) return im;
    if (onready) {
      if (!_sprWaiters[src]) _sprWaiters[src] = [];
      _sprWaiters[src].push(onready);
    }
    return null;
  }

  /* Vẽ lại khi asset vừa sẵn; thử tối đa vài nhịp rồi thôi (tránh kẹt CharAnim). */
  function _redrawSoon(canvas, sel, tries) {
    if (typeof document === "undefined") return;
    if (!document.contains(canvas)) return;
    var ok = false;
    try { ok = !!drawPreview(canvas, sel); } catch (e) { ok = false; }
    if (!ok && tries > 0) {
      setTimeout(function () { _redrawSoon(canvas, sel, tries - 1); }, 400);
    }
  }

  /* Vẽ canvas/ảnh vừa khung preview (180x230), giữ tỉ lệ, pixel sắc nét. */
  function _drawFitted(ctx, canvas, img) {
    var cw = canvas.width, ch = canvas.height;
    var iw = img.width, ih = img.height;
    if (!iw || !ih) return false;
    ctx.clearRect(0, 0, cw, ch);
    var sc = Math.min(cw / iw, ch / ih) * 0.96;
    var dw = iw * sc, dh = ih * sc;
    var dx = (cw - dw) / 2, dy = (ch - dh) / 2;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.ellipse(cw / 2, dy + dh * 0.94, dw * 0.26, dh * 0.04, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    var _sm = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.imageSmoothingEnabled = _sm;
    return true;
  }

  /* Vẽ nhân vật bằng CharAnim lên canvas (fallback khi sprite thật chưa sẵn).
   * Giữ nguyên logic cũ — BUGFIX (Bui 2026-10-20): part mặt/tóc mới chọn tải
   * bất đồng bộ, chưa xong thì trả false để caller thử lại. */
  function _drawPreviewCharAnim(canvas, ctx, gender, a) {
    if (typeof CharAnim === "undefined" || !CharAnim.getManifest || !CharAnim.getManifest()) return false;
    var fakeState = { char: { gender: gender, appearance: a } };
    var o = optsFor(fakeState);
    if (o && o.equip) {
      var _need = [o.equip.dau, o.equip.toc];
      for (var _ni = 0; _ni < _need.length; _ni++) {
        if (!readyImg(_need[_ni])) return false;
      }
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    try {
      return !!CharAnim.draw(ctx, canvas.width / 2, canvas.height - 14, "idle", 0.3, {
        dir: 1, scale: 26, gender: gender,
        equip: o ? o.equip : null, tints: o ? o.tints : null
      });
    } catch (e) { return false; }
  }

  /* Vẽ preview: sprite thật + pipeline biến thể y hệt trong game.
   * Trả true khi đã vẽ xong bản ĐẦY ĐỦ; false khi còn asset đang tải
   * (caller thử lại theo nhịp 350/900ms có sẵn trong ui.js). */
  function drawPreview(canvas, sel) {
    if (!canvas || typeof document === "undefined") return false;
    var ctx = canvas.getContext("2d");
    if (!ctx) return false;
    var gender = _gender(sel && sel.gender);
    var a = normalize(sel && sel.appearance, gender);
    var hasPipe = (typeof Engine !== "undefined" && Engine &&
                   typeof Engine.variantSpecFor === "function" &&
                   typeof Engine.variantCanvasFor === "function" &&
                   typeof Engine.variantPartsReady === "function");
    /* Sprite thật chưa tải xong: warm, hẹn vẽ lại khi xong, tạm vẽ CharAnim. */
    var im = hasPipe ? _warmSprite(gender, function () { _redrawSoon(canvas, sel, 5); }) : null;
    if (!im || !hasPipe) return _drawPreviewCharAnim(canvas, ctx, gender, a);
    var src = _spriteSrc(gender);
    var spec = null;
    try { spec = Engine.variantSpecFor(gender, a); } catch (e) { spec = null; }
    /* Part mặt/tóc chưa xong trong cache engine -> giữ khung cũ, thử lại sau. */
    try {
      if (!Engine.variantPartsReady(spec)) return false;
    } catch (e) { return false; }
    var cv = null;
    try { cv = Engine.variantCanvasFor(im, src, spec); } catch (e) { cv = null; }
    /* spec null -> không cần biến thể: vẽ thẳng sprite gốc. */
    var drawIm = cv || im;
    return _drawFitted(ctx, canvas, drawIm);
  }

  /* ---------------- UI màn tạo nhân vật (trình duyệt) ---------------- */
  var _mounted = false;
  function _t(key) {
    try { if (typeof t === "function") return t(key); } catch (e) {}
    return key;
  }
  function _el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  /* Gắn toàn bộ UI tùy chỉnh vào màn tạo nhân vật.
   * opts: { panel, nameInput, getSel(), onChange() }
   * getSel() trả createSel (có .gender + .appearance). */
  function mountCreateUI(opts) {
    if (typeof document === "undefined" || !opts || !opts.panel) return false;
    var panel = opts.panel;
    if (_mounted && panel.getAttribute("data-ap-mounted") === "1") { syncCreateUI(opts); return true; }
    _mounted = true;
    panel.setAttribute("data-ap-mounted", "1");
    panel.innerHTML = "";

    var title = _el("div", "ap-title", _t("ap_title"));
    panel.appendChild(title);

    function makeRow(labelKey, buildChoices) {
      var row = _el("div", "ap-row");
      row.appendChild(_el("div", "ap-label", _t(labelKey)));
      var box = _el("div", "ap-choices");
      row.appendChild(box);
      panel.appendChild(row);
      buildChoices(box, row);
      return row;
    }
    function choiceBtn(list, getVal, setVal, swatchHex) {
      return function (box, row) {
        list.forEach(function (item) {
          var b = _el("button", "ap-choice" + (swatchHex ? " ap-swatch" : ""), swatchHex ? null : _t(item.nameKey));
          b.type = "button";
          if (swatchHex) {
            b.style.background = swatchHex(item) || "transparent";
            b.title = _t(item.nameKey);
          }
          b.setAttribute("data-ap-val", item.id);
          b.onclick = function () {
            setVal(item.id);
            syncCreateUI(opts);
            if (opts.onChange) opts.onChange();
            try { if (typeof sfx === "function") sfx("click"); } catch (e) {}
          };
          box.appendChild(b);
        });
        row._apRefresh = function (sel) {
          var v = getVal(sel);
          var bs = box.children;
          for (var i = 0; i < bs.length; i++) {
            bs[i].classList.toggle("sel", bs[i].getAttribute("data-ap-val") === v);
          }
        };
      };
    }
    function apOf(sel) { return sel.appearance; }

    var rows = [];
    rows.push(makeRow("ap_face", choiceBtn(FACES,
      function (s) { return apOf(s).face; },
      function (id) { apOf(opts.getSel()).face = id; })));
    rows.push(makeRow("ap_hair", function (box, row) {
      /* tóc theo giới — dựng lại khi đổi giới qua syncCreateUI */
      row._apBuildHair = function (sel) {
        box.innerHTML = "";
        HAIRS[_gender(sel.gender)].forEach(function (item) {
          var b = _el("button", "ap-choice", _t(item.nameKey));
          b.type = "button";
          b.setAttribute("data-ap-val", item.id);
          b.classList.toggle("sel", apOf(sel).hair === item.id);
          b.onclick = function () {
            apOf(opts.getSel()).hair = item.id;
            syncCreateUI(opts);
            if (opts.onChange) opts.onChange();
            try { if (typeof sfx === "function") sfx("click"); } catch (e) {}
          };
          box.appendChild(b);
        });
      };
      row._apBuildHair(opts.getSel());
    }));
    rows.push(makeRow("ap_skin", choiceBtn(SKIN_COLORS,
      function (s) { return apOf(s).skin; },
      function (id) { apOf(opts.getSel()).skin = id; },
      function (item) { return item.hex || "#f0c698"; })));
    rows.push(makeRow("ap_hair_color", choiceBtn(HAIR_COLORS,
      function (s) { return apOf(s).hairColor; },
      function (id) { apOf(opts.getSel()).hairColor = id; },
      function (item) { return item.hex; })));
    rows.push(makeRow("ap_outfit_color", choiceBtn(OUTFIT_COLORS,
      function (s) { return apOf(s).outfitColor; },
      function (id) { apOf(opts.getSel()).outfitColor = id; },
      function (item) { return item.hex || "#2e6f8e"; })));
    panel._apRows = rows;

    /* Nút NGẪU NHIÊN ngoại hình */
    var rndRow = _el("div", "ap-row ap-rnd-row");
    var rndBtn = _el("button", "btn btn-jade ap-rnd-btn", "🎲 " + _t("ap_random"));
    rndBtn.type = "button";
    rndBtn.onclick = function () {
      var sel = opts.getSel();
      sel.appearance = randomize(sel.gender);
      syncCreateUI(opts);
      if (opts.onChange) opts.onChange();
      try { if (typeof sfx === "function") sfx("click"); } catch (e) {}
    };
    rndRow.appendChild(rndBtn);
    panel.appendChild(rndRow);

    /* Nút xúc xắc NGẪU NHIÊN tên — chèn ngay sau ô nhập tên */
    if (opts.nameInput && opts.nameInput.parentNode) {
      var nameBtn = _el("button", "btn ap-name-rnd-btn", "🎲 " + _t("ap_name_random"));
      nameBtn.type = "button";
      nameBtn.title = _t("ap_name_random");
      nameBtn.onclick = function () {
        var sel = opts.getSel();
        var cur = (opts.nameInput.value || "").trim();
        opts.nameInput.value = randomName(sel.gender, cur);
        try { if (typeof sfx === "function") sfx("click"); } catch (e) {}
      };
      opts.nameInput.parentNode.insertBefore(nameBtn, opts.nameInput.nextSibling);
    }
    syncCreateUI(opts);
    return true;
  }

  function syncCreateUI(opts) {
    if (typeof document === "undefined" || !opts || !opts.panel) return;
    var sel = opts.getSel();
    if (!sel) return;
    sel.appearance = normalize(sel.appearance, sel.gender);
    var rows = opts.panel._apRows || [];
    rows.forEach(function (row) {
      if (row._apBuildHair) row._apBuildHair(sel);
      else if (row._apRefresh) row._apRefresh(sel);
    });
  }

  var Appearance = {
    FACES: FACES, HAIRS: HAIRS,
    SKIN_COLORS: SKIN_COLORS, HAIR_COLORS: HAIR_COLORS, OUTFIT_COLORS: OUTFIT_COLORS,
    BASE: BASE,
    defaults: defaults, normalize: normalize,
    faceImg: faceImg, hairImg: hairImg, optsFor: optsFor,
    randomize: randomize, randomName: randomName,
    drawPreview: drawPreview,
    mountCreateUI: mountCreateUI, syncCreateUI: syncCreateUI
  };

  if (typeof module !== "undefined" && module.exports) module.exports = Appearance;
  else global.Appearance = Appearance;
})(typeof globalThis !== "undefined" ? globalThis : this);
