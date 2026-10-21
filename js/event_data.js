/* ============================================================
 * js/event_data.js — ĐỊNH NGHĨA SỰ KIỆN THEO LỊCH ÂM
 * 5 sự kiện: Tết Nguyên Đán, Đoan Ngọ, Vu Lan, Trung Thu,
 * Lễ Hội Tông Môn (hàng tháng).
 * Ngày dương gần đúng với âm lịch 2026–2027.
 * Mỗi sự kiện: thời gian, quà daily, NPC, trang trí map, chuỗi quest.
 * Node-safe: chỉ khai báo dữ liệu, không chạm DOM/state lúc nạp.
 * ============================================================ */
(function (global) {
  "use strict";

  /* Ngày dạng "YYYY-MM-DD" — so sánh chuỗi an toàn. */
  var LUNAR_EVENTS = [
    /* ================= TẾT NGUYÊN ĐÁN =================
     * 2026: Tết Bính Ngọ 17/02 — sự kiện 10/02 → 03/03
     * 2027: Tết Đinh Mùi 06/02 — sự kiện 30/01 → 20/02 */
    {
      id: "lev_tet",
      icon: "🧧",
      nameKey: "lev_tet", descKey: "lev_tet_desc", lunarKey: "lev_tet_lunar",
      decorKey: "lev_decor_tet",
      color: "#ff3d5a",
      dates: [
        { start: "2026-02-10", end: "2026-03-03" },
        { start: "2027-01-30", end: "2027-02-20" },
      ],
      dailyGift: { stones: 888, items: [{ id: "bao_li_xi", qty: 2 }] },
      npc: {
        id: "npc_than_tai", nameKey: "npc_than_tai",
        mapId: 0, x: 850, y: 500, kind: "quest",
        img: "assets/sprs/npc_thuong_nhan.png", wander: 60,
      },
      decor: { mapId: 0, theme: "tet" },
      quests: [
        {
          id: "levq_tet_01", nameKey: "levq_tet_01", descKey: "levq_tet_01_desc",
          kind: "phu", event: "lev_tet", npc: "npc_than_tai",
          need: { type: "talk" },
          reward: { stones: 500, exp: 300 },
        },
        {
          id: "levq_tet_02", nameKey: "levq_tet_02", descKey: "levq_tet_02_desc",
          kind: "phu", event: "lev_tet", npc: "npc_than_tai", req: "levq_tet_01",
          need: { type: "kill", monster: "da_tru", count: 20 },
          reward: { stones: 1200, exp: 800 },
        },
        {
          id: "levq_tet_03", nameKey: "levq_tet_03", descKey: "levq_tet_03_desc",
          kind: "phu", event: "lev_tet", npc: "npc_than_tai", req: "levq_tet_02",
          need: { type: "item", item: "bao_li_xi", count: 5 },
          reward: { stones: 1500, exp: 1000, items: [{ id: "phao_hoa", qty: 3 }] },
        },
        {
          id: "levq_tet_04", nameKey: "levq_tet_04", descKey: "levq_tet_04_desc",
          kind: "phu", event: "lev_tet", npc: "npc_than_tai", req: "levq_tet_03",
          need: { type: "killboss", monster: "da_tru_vuong", count: 1 },
          reward: { stones: 3000, exp: 2500, items: [{ id: "bao_li_xi", qty: 5 }] },
        },
      ],
    },

    /* ================= TẾT ĐOAN NGỌ =================
     * 2026: 5/5 âm = 19/06 — sự kiện 12/06 → 26/06
     * 2027: 5/5 âm = 08/06 — sự kiện 01/06 → 15/06 */
    {
      id: "lev_doanngo",
      icon: "🐉",
      nameKey: "lev_doanngo", descKey: "lev_doanngo_desc", lunarKey: "lev_doanngo_lunar",
      decorKey: "lev_decor_doanngo",
      color: "#22aa88",
      dates: [
        { start: "2026-06-12", end: "2026-06-26" },
        { start: "2027-06-01", end: "2027-06-15" },
      ],
      dailyGift: { stones: 300, items: [{ id: "banh_u_tro", qty: 1 }] },
      npc: {
        id: "npc_lao_ngu_dan", nameKey: "npc_lao_ngu_dan",
        mapId: 1, x: 1050, y: 1050, kind: "quest",
        img: "assets/sprs/npc_lao_nong_dan.png", wander: 60,
      },
      decor: { mapId: 1, theme: "doanngo" },
      quests: [
        {
          id: "levq_doanngo_01", nameKey: "levq_doanngo_01", descKey: "levq_doanngo_01_desc",
          kind: "phu", event: "lev_doanngo", npc: "npc_lao_ngu_dan",
          need: { type: "talk" },
          reward: { stones: 300, exp: 200 },
        },
        {
          id: "levq_doanngo_02", nameKey: "levq_doanngo_02", descKey: "levq_doanngo_02_desc",
          kind: "phu", event: "lev_doanngo", npc: "npc_lao_ngu_dan", req: "levq_doanngo_01",
          need: { type: "kill", monster: "son_ke", count: 15 },
          reward: { stones: 800, exp: 600 },
        },
        {
          id: "levq_doanngo_03", nameKey: "levq_doanngo_03", descKey: "levq_doanngo_03_desc",
          kind: "phu", event: "lev_doanngo", npc: "npc_lao_ngu_dan", req: "levq_doanngo_02",
          need: { type: "item", item: "banh_u_tro", count: 3 },
          reward: { stones: 1200, exp: 900, items: [{ id: "dan_hx_trung", qty: 2 }] },
        },
      ],
    },

    /* ================= LỄ VU LAN =================
     * 2026: rằm tháng 7 = 25/08 — sự kiện 18/08 → 01/09
     * 2027: rằm tháng 7 = 14/08 — sự kiện 07/08 → 21/08 */
    {
      id: "lev_vulan",
      icon: "🏮",
      nameKey: "lev_vulan", descKey: "lev_vulan_desc", lunarKey: "lev_vulan_lunar",
      decorKey: "lev_decor_vulan",
      color: "#ffaa33",
      dates: [
        { start: "2026-08-18", end: "2026-09-01" },
        { start: "2027-08-07", end: "2027-08-21" },
      ],
      dailyGift: { stones: 400, items: [{ id: "den_long", qty: 1 }] },
      npc: {
        id: "npc_su_co_tu_tam", nameKey: "npc_su_co_tu_tam",
        mapId: 0, x: 300, y: 300, kind: "quest",
        img: "assets/sprs/npc_tam_tien.png", wander: 40,
      },
      decor: { mapId: 0, theme: "vulan" },
      quests: [
        {
          id: "levq_vulan_01", nameKey: "levq_vulan_01", descKey: "levq_vulan_01_desc",
          kind: "phu", event: "lev_vulan", npc: "npc_su_co_tu_tam",
          need: { type: "talk" },
          reward: { stones: 400, exp: 300 },
        },
        {
          id: "levq_vulan_02", nameKey: "levq_vulan_02", descKey: "levq_vulan_02_desc",
          kind: "phu", event: "lev_vulan", npc: "npc_su_co_tu_tam", req: "levq_vulan_01",
          need: { type: "kill", monster: "u_hon", count: 15 },
          reward: { stones: 1000, exp: 800 },
        },
        {
          id: "levq_vulan_03", nameKey: "levq_vulan_03", descKey: "levq_vulan_03_desc",
          kind: "phu", event: "lev_vulan", npc: "npc_su_co_tu_tam", req: "levq_vulan_02",
          need: { type: "item", item: "dan_hx_tieu", count: 3 },
          reward: { stones: 1500, exp: 1200 },
        },
      ],
    },

    /* ================= TẾT TRUNG THU =================
     * 2026: rằm tháng 8 = 25/09 — sự kiện 18/09 → 02/10
     * 2027: rằm tháng 8 = 15/09 — sự kiện 08/09 → 22/09 */
    {
      id: "lev_trungthu",
      icon: "🥮",
      nameKey: "lev_trungthu", descKey: "lev_trungthu_desc", lunarKey: "lev_trungthu_lunar",
      decorKey: "lev_decor_trungthu",
      color: "#ffcc44",
      dates: [
        { start: "2026-09-18", end: "2026-10-02" },
        { start: "2027-09-08", end: "2027-09-22" },
      ],
      dailyGift: { stones: 500, items: [{ id: "banh_trung_thu", qty: 1 }] },
      npc: {
        id: "npc_hang_nga", nameKey: "npc_hang_nga",
        mapId: 0, x: 1200, y: 400, kind: "quest",
        img: "assets/sprs/npc_diep_van.png", wander: 50,
      },
      decor: { mapId: 0, theme: "trungthu" },
      quests: [
        {
          id: "levq_trungthu_01", nameKey: "levq_trungthu_01", descKey: "levq_trungthu_01_desc",
          kind: "phu", event: "lev_trungthu", npc: "npc_hang_nga",
          need: { type: "talk" },
          reward: { stones: 500, exp: 400 },
        },
        {
          id: "levq_trungthu_02", nameKey: "levq_trungthu_02", descKey: "levq_trungthu_02_desc",
          kind: "phu", event: "lev_trungthu", npc: "npc_hang_nga", req: "levq_trungthu_01",
          need: { type: "kill", monster: "son_ke", count: 10 },
          reward: { stones: 800, exp: 600 },
        },
        {
          id: "levq_trungthu_03", nameKey: "levq_trungthu_03", descKey: "levq_trungthu_03_desc",
          kind: "phu", event: "lev_trungthu", npc: "npc_hang_nga", req: "levq_trungthu_02",
          need: { type: "item", item: "banh_trung_thu", count: 2 },
          reward: { stones: 1200, exp: 900, items: [{ id: "den_long", qty: 2 }] },
        },
        {
          id: "levq_trungthu_04", nameKey: "levq_trungthu_04", descKey: "levq_trungthu_04_desc",
          kind: "phu", event: "lev_trungthu", npc: "npc_hang_nga", req: "levq_trungthu_03",
          need: { type: "killboss", monster: "lang_vuong", count: 1 },
          reward: { stones: 2500, exp: 2000, items: [{ id: "banh_trung_thu", qty: 3 }] },
        },
      ],
    },

    /* ================= LỄ HỘI TÔNG MÔN =================
     * Hàng tháng: mùng 1 → mùng 7 dương lịch.
     * dates: null → tính động theo tháng hiện tại. */
    {
      id: "lev_lehoi",
      icon: "⚔️",
      nameKey: "lev_lehoi", descKey: "lev_lehoi_desc", lunarKey: "lev_lehoi_lunar",
      decorKey: "lev_decor_lehoi",
      color: "#9fd8ff",
      monthly: { startDay: 1, endDay: 7 },
      dates: null,
      dailyGift: { stones: 200, items: [{ id: "dan_hx_tieu", qty: 2 }] },
      npc: {
        id: "npc_su_gia_le_hoi", nameKey: "npc_su_gia_le_hoi",
        mapId: 0, x: 800, y: 800, kind: "quest",
        img: "assets/sprs/npc_su_gia.png", wander: 50,
      },
      decor: { mapId: 0, theme: "lehoi" },
      /* Thưởng xếp hạng theo cống hiến tông môn (state.sectInfo.contrib) */
      rankRewards: [
        { rank: 1, stones: 10000, exp: 8000, items: [{ id: "dan_hx_dai", qty: 3 }] },
        { rank: 2, stones: 6000,  exp: 5000, items: [{ id: "dan_hx_trung", qty: 3 }] },
        { rank: 3, stones: 4000,  exp: 3000, items: [{ id: "dan_hx_trung", qty: 2 }] },
        { rank: 0, stones: 1500,  exp: 1200, items: [{ id: "dan_hx_tieu", qty: 2 }] }, /* hạng 4+ */
      ],
      quests: [
        {
          id: "levq_lehoi_01", nameKey: "levq_lehoi_01", descKey: "levq_lehoi_01_desc",
          kind: "phu", event: "lev_lehoi", npc: "npc_su_gia_le_hoi",
          need: { type: "talk" },
          reward: { stones: 300, exp: 200, contrib: 20 },
        },
        {
          id: "levq_lehoi_02", nameKey: "levq_lehoi_02", descKey: "levq_lehoi_02_desc",
          kind: "phu", event: "lev_lehoi", npc: "npc_su_gia_le_hoi", req: "levq_lehoi_01",
          need: { type: "kill", monster: "phong_lang", count: 15 },
          reward: { stones: 1000, exp: 800, contrib: 50 },
        },
        {
          id: "levq_lehoi_03", nameKey: "levq_lehoi_03", descKey: "levq_lehoi_03_desc",
          kind: "phu", event: "lev_lehoi", npc: "npc_su_gia_le_hoi", req: "levq_lehoi_02",
          need: { type: "killboss", monster: "lang_vuong", count: 1 },
          reward: { stones: 2000, exp: 1500, contrib: 100 },
        },
      ],
    },
  ];

  /* Đếm quest sự kiện */
  var _count = 0;
  LUNAR_EVENTS.forEach(function (ev) { _count += (ev.quests || []).length; });

  /* Node.js export (smoke test) */
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { LUNAR_EVENTS: LUNAR_EVENTS, LUNAR_QUEST_COUNT: _count };
  } else {
    global.LUNAR_EVENTS = LUNAR_EVENTS;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
