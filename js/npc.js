/* ============================================================
 * js/npc.js — Hội thoại NPC (Thiết kế Hệ thống viết)
 * Phụ thuộc: data.js (NPCS, QUESTS)
 * NPC.forMap(mapId) → [npcDef...]
 * NPC.talk(npcId, state) → {name, lines:[key...], options:[{label, act}]}
 * act: 'quest' | 'shop' | 'bye' — ui.js xử lý act.
 * Mọi label/line là key qua t() — KHÔNG hardcode tiếng Việt.
 * ============================================================ */

/* --- Dependency từ data.js (browser: global sẵn; node: require) --- */
var _ND = null;
if (typeof NPCS === "undefined" && typeof require !== "undefined") {
  _ND = require("./data.js");
}
function _npcs() {
  if (typeof globalThis !== "undefined" && typeof globalThis.NPCS !== "undefined") return globalThis.NPCS;
  if (_ND && _ND.NPCS !== undefined) return _ND.NPCS;
  /* browser: data.js nạp dạng classic script, const NPCS nằm ở lexical
   * scope toàn cục chứ không gắn lên globalThis → đọc trực tiếp */
  if (typeof NPCS !== "undefined") return NPCS;
  throw new Error("missing dep: NPCS");
}
function _quests() {
  if (typeof globalThis !== "undefined" && typeof globalThis.QUESTS !== "undefined") return globalThis.QUESTS;
  if (_ND && _ND.QUESTS !== undefined) return _ND.QUESTS;
  if (typeof QUESTS !== "undefined") return QUESTS;
  throw new Error("missing dep: QUESTS");
}

/* ============================================================
 * LỜI CHÀO LẦN ĐẦU GẶP (first-meet dialogue)
 * Mỗi NPC chính có đoạn chào hỏi riêng khi người chơi nói chuyện
 * lần đầu — giới thiệu bản thân + gợi ý nhiệm vụ, tạo cảm giác
 * thế giới sống động.
 * - k: key lang (vi/en trong js/lang.js)
 * - v: file lồng tiếng tương ứng (CHƯA tạo audio — đặt chỗ trước
 *      theo chuẩn assets/voice/, xem assets/voice/README.md)
 * Flag: state.flags["met_" + npcId] — đã gặp thì lần sau hiện thoại
 * thường, không lặp lại chào hỏi.
 * ============================================================ */
var FIRST_MEET = {
  dai_phu: [
    { k: "npc_dai_phu_meet1", v: "assets/voice/npc_dai_phu_meet1.mp3" },
    { k: "npc_dai_phu_meet2", v: "assets/voice/npc_dai_phu_meet2.mp3" },
    { k: "npc_dai_phu_meet3", v: "assets/voice/npc_dai_phu_meet3.mp3" },
  ],
  lao_dan_duong: [
    { k: "npc_lao_dan_duong_meet1", v: "assets/voice/npc_lao_dan_duong_meet1.mp3" },
    { k: "npc_lao_dan_duong_meet2", v: "assets/voice/npc_lao_dan_duong_meet2.mp3" },
  ],
  tieu_nhi: [
    { k: "npc_tieu_nhi_meet1", v: "assets/voice/npc_tieu_nhi_meet1.mp3" },
    { k: "npc_tieu_nhi_meet2", v: "assets/voice/npc_tieu_nhi_meet2.mp3" },
  ],
  lao_ren: [
    { k: "npc_lao_ren_meet1", v: "assets/voice/npc_lao_ren_meet1.mp3" },
    { k: "npc_lao_ren_meet2", v: "assets/voice/npc_lao_ren_meet2.mp3" },
  ],
  thuong_nhan: [
    { k: "npc_thuong_nhan_meet1", v: "assets/voice/npc_thuong_nhan_meet1.mp3" },
    { k: "npc_thuong_nhan_meet2", v: "assets/voice/npc_thuong_nhan_meet2.mp3" },
  ],
  truong_tran: [
    { k: "npc_truong_tran_meet1", v: "assets/voice/npc_truong_tran_meet1.mp3" },
    { k: "npc_truong_tran_meet2", v: "assets/voice/npc_truong_tran_meet2.mp3" },
  ],
  tuan_thu_su: [
    { k: "npc_tuan_thu_su_meet1", v: "assets/voice/npc_tuan_thu_su_meet1.mp3" },
    { k: "npc_tuan_thu_su_meet2", v: "assets/voice/npc_tuan_thu_su_meet2.mp3" },
  ],
  tam_tien_bi_tich: [
    { k: "npc_tam_tien_meet1", v: "assets/voice/npc_tam_tien_meet1.mp3" },
    { k: "npc_tam_tien_meet2", v: "assets/voice/npc_tam_tien_meet2.mp3" },
  ],
  /* --- NPC nội thất 6 tông môn (17) --- */
  thu_cac_truong_lao: [
    { k: "npc_thu_cac_truong_lao_meet1", v: "assets/voice/npc_thu_cac_truong_lao_meet1.mp3" },
    { k: "npc_thu_cac_truong_lao_meet2", v: "assets/voice/npc_thu_cac_truong_lao_meet2.mp3" },
  ],
  giao_dau_kiem: [
    { k: "npc_giao_dau_kiem_meet1", v: "assets/voice/npc_giao_dau_kiem_meet1.mp3" },
    { k: "npc_giao_dau_kiem_meet2", v: "assets/voice/npc_giao_dau_kiem_meet2.mp3" },
  ],
  thu_tang_kiem: [
    { k: "npc_thu_tang_kiem_meet1", v: "assets/voice/npc_thu_tang_kiem_meet1.mp3" },
    { k: "npc_thu_tang_kiem_meet2", v: "assets/voice/npc_thu_tang_kiem_meet2.mp3" },
  ],
  thap_chu_phap: [
    { k: "npc_thap_chu_phap_meet1", v: "assets/voice/npc_thap_chu_phap_meet1.mp3" },
    { k: "npc_thap_chu_phap_meet2", v: "assets/voice/npc_thap_chu_phap_meet2.mp3" },
  ],
  chiem_tinh_su: [
    { k: "npc_chiem_tinh_su_meet1", v: "assets/voice/npc_chiem_tinh_su_meet1.mp3" },
    { k: "npc_chiem_tinh_su_meet2", v: "assets/voice/npc_chiem_tinh_su_meet2.mp3" },
  ],
  thu_vien_quan: [
    { k: "npc_thu_vien_quan_meet1", v: "assets/voice/npc_thu_vien_quan_meet1.mp3" },
    { k: "npc_thu_vien_quan_meet2", v: "assets/voice/npc_thu_vien_quan_meet2.mp3" },
  ],
  phuong_truong: [
    { k: "npc_phuong_truong_meet1", v: "assets/voice/npc_phuong_truong_meet1.mp3" },
    { k: "npc_phuong_truong_meet2", v: "assets/voice/npc_phuong_truong_meet2.mp3" },
  ],
  thu_thap_tang: [
    { k: "npc_thu_thap_tang_meet1", v: "assets/voice/npc_thu_thap_tang_meet1.mp3" },
    { k: "npc_thu_thap_tang_meet2", v: "assets/voice/npc_thu_thap_tang_meet2.mp3" },
  ],
  thien_su: [
    { k: "npc_thien_su_meet1", v: "assets/voice/npc_thien_su_meet1.mp3" },
    { k: "npc_thien_su_meet2", v: "assets/voice/npc_thien_su_meet2.mp3" },
  ],
  luyen_dan_su: [
    { k: "npc_luyen_dan_su_meet1", v: "assets/voice/npc_luyen_dan_su_meet1.mp3" },
    { k: "npc_luyen_dan_su_meet2", v: "assets/voice/npc_luyen_dan_su_meet2.mp3" },
  ],
  duoc_nong: [
    { k: "npc_duoc_nong_meet1", v: "assets/voice/npc_duoc_nong_meet1.mp3" },
    { k: "npc_duoc_nong_meet2", v: "assets/voice/npc_duoc_nong_meet2.mp3" },
  ],
  duoc_dien_quan: [
    { k: "npc_duoc_dien_quan_meet1", v: "assets/voice/npc_duoc_dien_quan_meet1.mp3" },
    { k: "npc_duoc_dien_quan_meet2", v: "assets/voice/npc_duoc_dien_quan_meet2.mp3" },
  ],
  tuan_thu_chuong: [
    { k: "npc_tuan_thu_chuong_meet1", v: "assets/voice/npc_tuan_thu_chuong_meet1.mp3" },
    { k: "npc_tuan_thu_chuong_meet2", v: "assets/voice/npc_tuan_thu_chuong_meet2.mp3" },
  ],
  dau_thu_quan: [
    { k: "npc_dau_thu_quan_meet1", v: "assets/voice/npc_dau_thu_quan_meet1.mp3" },
    { k: "npc_dau_thu_quan_meet2", v: "assets/voice/npc_dau_thu_quan_meet2.mp3" },
  ],
  te_tu_thu_than: [
    { k: "npc_te_tu_thu_than_meet1", v: "assets/voice/npc_te_tu_thu_than_meet1.mp3" },
    { k: "npc_te_tu_thu_than_meet2", v: "assets/voice/npc_te_tu_thu_than_meet2.mp3" },
  ],
  huyet_ve: [
    { k: "npc_huyet_ve_meet1", v: "assets/voice/npc_huyet_ve_meet1.mp3" },
    { k: "npc_huyet_ve_meet2", v: "assets/voice/npc_huyet_ve_meet2.mp3" },
  ],
  huyet_te_tu: [
    { k: "npc_huyet_te_tu_meet1", v: "assets/voice/npc_huyet_te_tu_meet1.mp3" },
    { k: "npc_huyet_te_tu_meet2", v: "assets/voice/npc_huyet_te_tu_meet2.mp3" },
  ],
};

/* Trả về mảng {k,v} lời chào lần đầu, đồng thời đánh dấu đã gặp.
 * Trả null nếu NPC không có lời chào riêng hoặc đã gặp rồi. */
function _firstMeet(npcId, state) {
  var fm = FIRST_MEET[npcId];
  if (!fm || !fm.length) return null;
  try {
    if (!state) return fm;
    state.flags = state.flags || {};
    var key = "met_" + npcId;
    if (state.flags[key]) return null;
    state.flags[key] = true;
    return fm;
  } catch (e) { return fm; }
}

var NPC = {
  /* Tất cả NPC trên một map */
  forMap: function (mapId) {
    var out = [];
    var npcs = _npcs();
    Object.keys(npcs).forEach(function (id) {
      if (npcs[id].mapId === mapId) {
        var def = {};
        Object.keys(npcs[id]).forEach(function (k) { def[k] = npcs[id][k]; });
        def.id = id;
        out.push(def);
      }
    });
    return out;
  },

  /* Hội thoại với NPC (wrapper): thêm lời chào lần đầu gặp lên trước
   * thoại thường. Lần sau nói chuyện chỉ hiện thoại thường. */
  talk: function (npcId, state) {
    var res = NPC._talkBase(npcId, state);
    try {
      var fm = _firstMeet(npcId, state);
      if (fm && fm.length) {
        res.lines = fm.map(function (e) { return e.k; }).concat(res.lines || []);
        res.firstMeet = true;
        res.voiceFiles = fm.map(function (e) { return e.v; });
      }
    } catch (e) {}
    return res;
  },

  /* Hội thoại gốc với NPC. lines thay đổi theo tiến trình quest của Đại Phu. */
  _talkBase: function (npcId, state) {
    var def = _npcs()[npcId];
    if (!def) return { name: npcId, lines: ["npc_unknown"], options: [{ label: "npc_bye", act: "bye" }] };

    if (def.kind === "quest") return _questTalk(npcId, def, state);
    if (npcId === "luyen_dan_su") return _alchemyTalk(npcId, def);
    if (def.kind === "shop") return _shopTalk(npcId, def, state);
    if (def.kind === "market") return _marketTalk(npcId, def, state);
    if (def.kind === "sect") return _sectTalk(npcId, def, state);
    if (def.kind === "gacha") return _gachaTalk(npcId, def, state);
    if (def.kind === "guide") return _guideTalk(npcId, def, state);
    if (def.kind === "forge") return _forgeTalk(npcId, def, state);
    if (def.kind === "sect_emissary") return _emissaryTalk(npcId, def, state);
    if (def.kind === "inn") return _innTalk(npcId, def, state);
    if (def.kind === "pet") return _petTalk(npcId, def, state);
    if (def.kind === "dungeon_guide") return _dungeonGuideTalk(npcId, def, state);
    if (def.kind === "tower_guide") return _towerGuideTalk(npcId, def, state);
    if (def.kind === "farm") return _farmTalk(npcId, def, state);
    if (def.kind === "alliance") return _allianceTalk(npcId, def, state);
    if (def.kind === "greet") return _greetTalk(npcId, def);
    /* kind lạ → chỉ chào rồi bye */
    return { name: def.nameKey, lines: ["npc_greet"], options: [{ label: "npc_bye", act: "bye" }] };
  },
};

/* Đại Phu — NPC nhiệm vụ: line đổi theo trạng thái quest của ông ta */
function _questTalk(npcId, def, state) {
  var mine = _quests().filter(function (q) { return q.npc === npcId; });
  var qs = (state && state.quests) || {};
  var hasActive = false, hasReadyTurnIn = false, allDone = true;

  mine.forEach(function (q) {
    var s = qs[q.id];
    if (!s || !s.status) { allDone = false; return; }
    if (s.status === "active") {
      allDone = false;
      if (_questReady(q, s)) hasReadyTurnIn = true;
      else hasActive = true;
    }
  });

  var lines;
  if (mine.length === 0) lines = ["npc_" + npcId + "_greet"];
  else if (hasReadyTurnIn) lines = ["npc_dai_phu_turnin"];
  else if (hasActive) lines = ["npc_dai_phu_progress"];
  else if (allDone) lines = ["npc_dai_phu_alldone"];
  else lines = ["npc_dai_phu_greet", "npc_dai_phu_has_quest"];

  /* Thọ Nguyên thấp: Đại Phu nhắc nhở (lifespan.js) */
  try {
    if (npcId === "dai_phu" && typeof Lifespan !== "undefined" && Lifespan.isLow(state)) {
      lines.unshift("npc_tn_warn_dai_phu");
    }
  } catch (e) {}

  return {
    name: def.nameKey,
    lines: lines,
    options: [
      { label: "npc_quest", act: "quest" },
      /* Đại Phu bán đan dược hồi phục */
      ...(npcId === "dai_phu" ? [{ label: "npc_shop", act: "shop",
        stock: ["dan_hx_tieu", "dan_hx_trung", "dan_hl_tieu", "dan_hl_trung",
                "duong_than_dan", "thanh_tam_qua",
                "dan_tho_tieu", "dan_dien_tho"] }] : []),
      { label: "npc_bye", act: "bye" },
    ],
  };
}

/* Vạn Tiên Các — CHỢ giữa người chơi (không còn là shop hệ thống) */
function _marketTalk(npcId, def) {
  return {
    name: def.nameKey,
    lines: ["npc_vtc_market_greet"],
    options: [
      { label: "npc_market_open", act: "market" },
      { label: "npc_bye", act: "bye" },
    ],
  };
}

/* Tầm Tiên Bảo (Thương Nhân) / Lão Rèn / Đại Phu — shop hệ thống */
function _shopTalk(npcId, def) {
  var greet = "npc_vtc_greet";
  if (npcId === "thuong_nhan") greet = "npc_thuong_nhan_greet";
  if (npcId === "lao_ren") greet = "npc_lao_ren_greet";
  if (npcId === "lao_nong_dan") greet = "npc_lao_nong_dan_greet";
  return {
    name: def.nameKey,
    lines: [greet],
    title: def.shopTitle || null,
    options: [
      { label: "npc_shop", act: "shop", stock: def.stock || null, title: def.shopTitle || null },
      { label: "npc_bye", act: "bye" },
    ],
  };
}

/* Trưởng Trấn — nhiệm vụ chính tuyến, chỉ dẫn tân thủ */
function _guideTalk(npcId, def) {
  return {
    name: def.nameKey,
    lines: ["npc_truong_tran_greet", "npc_truong_tran_guide"],
    options: [
      { label: "npc_quest", act: "quest" },
      { label: "npc_bye", act: "bye" },
    ],
  };
}

/* Lão Rèn — shop trang bị + cường hóa */
function _forgeTalk(npcId, def) {
  return {
    name: def.nameKey,
    lines: ["npc_" + npcId + "_greet"],
    options: [
      { label: "npc_shop", act: "shop", stock: def.stock || null },
      { label: "npc_enhance", act: "enhance" },
      { label: "npc_refine_yaodan", act: "refine" },
      { label: "npc_bye", act: "bye" },
    ],
  };
}

/* Luyện Đan Sư (Đan Phòng Dược Vương Tông) — luyện Khai Mạch Đan */
function _alchemyTalk(npcId, def) {
  return {
    name: def.nameKey,
    lines: ["npc_" + npcId + "_greet", "npc_alchemy_intro"],
    options: [
      { label: "npc_alchemy", act: "alchemy" },
      { label: "npc_quest", act: "quest" },
      { label: "npc_bye", act: "bye" },
    ],
  };
}

/* Sứ Giả Tông Môn — giới thiệu + gia nhập tông */
function _emissaryTalk(npcId, def, state) {
  var joined = state && state.sectInfo && state.sectInfo.joined;
  var opts = [];
  if (joined !== def.sect) opts.push({ label: "sect_join", act: "sect-join", sect: def.sect });
  else opts.push({ label: "npc_sect_open", act: "sect" });
  opts.push({ label: "npc_bye", act: "bye" });
  return {
    name: def.nameKey,
    lines: ["npc_" + npcId + "_greet"],
    options: opts,
  };
}

/* Tiểu Nhị — hồi HP/MP, tin đồn kỳ ngộ, điểm danh */
function _innTalk(npcId, def) {
  return {
    name: def.nameKey,
    lines: ["npc_tieu_nhi_greet"],
    options: [
      { label: "npc_inn_rest", act: "inn-rest" },
      { label: "npc_inn_rumor", act: "inn-rumor" },
      { label: "activity_checkin", act: "checkin" },
      { label: "npc_bye", act: "bye" },
    ],
  };
}

/* Tuần Thú Sư — ấp trứng linh thú */
function _petTalk(npcId, def) {
  return {
    name: def.nameKey,
    lines: ["npc_tuan_thu_su_greet"],
    options: [
      { label: "npc_pet_open", act: "pet" },
      { label: "npc_bye", act: "bye" },
    ],
  };
}

/* Lão Dẫn Đường — vào phụ bản/bí cảnh */
function _dungeonGuideTalk(npcId, def) {
  return {
    name: def.nameKey,
    lines: ["npc_lao_dan_duong_greet"],
    options: [
      { label: "npc_dungeon_open", act: "dungeon" },
      { label: "npc_bye", act: "bye" },
    ],
  };
}

/* Thủ Tháp Nhân — mở Thông Thiên Tháp */
function _towerGuideTalk(npcId, def, state) {
  var tries = 0, best = 0;
  try {
    if (typeof Tower !== "undefined") {
      Tower.ensure(state);
      tries = Tower.triesLeft(state);
      best = state.tower.best || 0;
    }
  } catch (e) {}
  return {
    name: def.nameKey,
    lines: ["npc_thu_thap_nhan_greet"],
    options: [
      { label: "npc_tower_open", act: "tower", sub: { tries: tries, best: best } },
      { label: "npc_bye", act: "bye" },
    ],
  };
}

/* Trưởng Lão Tông Môn — mở panel tông môn */
function _sectTalk(npcId, def) {
  return {
    name: def.nameKey,
    lines: ["npc_truong_lao_greet"],
    options: [
      { label: "npc_sect_open", act: "sect" },
      { label: "npc_bye", act: "bye" },
    ],
  };
}

/* Tầm Tiên Bí Tịch — NPC gacha: lại gần bấm "?" mở Tầm Bảo Các */
function _gachaTalk(npcId, def) {
  return {
    name: def.nameKey,
    lines: ["npc_tam_tien_greet"],
    options: [
      { label: "npc_gacha_open", act: "gacha" },
      { label: "npc_bye", act: "bye" },
    ],
  };
}

/* Trưởng Lão Linh Điền */
function _farmTalk(npcId, def) {
  return {
    name: def.nameKey,
    lines: ["npc_truong_lao_linh_dien_greet"],
    options: [
      { label: "npc_farm_open", act: "farm" },
      { label: "npc_shop", act: "shop", stock: def.stock || null },
      { label: "npc_bye", act: "bye" },
    ],
  };
}

/* Minh Chủ Vạn Tiên Minh — nhiệm vụ Minh + thoại thú triều */
function _allianceTalk(npcId, def, state) {
  return {
    name: def.nameKey,
    lines: ["npc_minh_chu_greet", "npc_minh_chu_duty"],
    options: [
      { label: "npc_quest", act: "quest" },
      { label: "npc_bye", act: "bye" },
    ],
  };
}

/* NPC flavor (đệ tử, ẩn sĩ, cô hồn...): thoại theo vai rồi chào */
function _greetTalk(npcId, def) {
  return {
    name: def.nameKey,
    lines: ["npc_" + npcId + "_greet"],
    options: [{ label: "npc_bye", act: "bye" }],
  };
}

/* Quest đã đủ điều kiện trả chưa (để đổi line hội thoại) */
function _questReady(q, s) {
  var need = q.need;
  if (need.type === "kill") return (s.count || 0) >= need.count;
  if (need.type === "talk") return true;
  return false; /* item: kiểm tra túi ở quest.js lúc trả */
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { NPC: NPC };
}
