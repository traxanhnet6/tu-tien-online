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
  return _ND.NPCS;
}
function _quests() {
  if (typeof globalThis !== "undefined" && typeof globalThis.QUESTS !== "undefined") return globalThis.QUESTS;
  return _ND.QUESTS;
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

  /* Hội thoại với NPC. lines thay đổi theo tiến trình quest của Đại Phu. */
  talk: function (npcId, state) {
    var def = _npcs()[npcId];
    if (!def) return { name: npcId, lines: ["npc_unknown"], options: [{ label: "npc_bye", act: "bye" }] };

    if (def.kind === "quest") return _questTalk(npcId, def, state);
    if (def.kind === "shop") return _shopTalk(npcId, def, state);
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
  if (mine.length === 0) lines = ["npc_dai_phu_greet"];
  else if (hasReadyTurnIn) lines = ["npc_dai_phu_turnin"];
  else if (hasActive) lines = ["npc_dai_phu_progress"];
  else if (allDone) lines = ["npc_dai_phu_alldone"];
  else lines = ["npc_dai_phu_greet", "npc_dai_phu_has_quest"];

  return {
    name: def.nameKey,
    lines: lines,
    options: [
      { label: "npc_quest", act: "quest" },
      { label: "npc_bye", act: "bye" },
    ],
  };
}

/* Vạn Tiên Các — NPC cửa hàng */
function _shopTalk(npcId, def) {
  return {
    name: def.nameKey,
    lines: ["npc_vtc_greet"],
    options: [
      { label: "npc_shop", act: "shop" },
      { label: "npc_bye", act: "bye" },
    ],
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
