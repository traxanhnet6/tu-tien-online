/* ============================================================
 * js/lang_events.js — Text VI+EN cho MODULE SỰ KIỆN THEO LỊCH ÂM
 * (Tết Nguyên Đán, Đoan Ngọ, Vu Lan, Trung Thu, Lễ Hội Tông Môn)
 * Gộp vào LANG.vi / LANG.en lúc nạp — KHÔNG sửa lang.js.
 * Node-safe: mọi truy cập đều có guard.
 * ============================================================ */
(function (global) {
  "use strict";

  var VI = {
    /* ---- Tên + mô tả sự kiện ---- */
    lev_tet: "Tết Nguyên Đán",
    lev_tet_desc: "Năm mới an khang thịnh vượng! Nhận lì xì Linh Thạch mỗi ngày, làm chuỗi nhiệm vụ Tết, ngắm đào mai khoe sắc khắp làng.",
    lev_tet_lunar: "Mùng 1 tháng Giêng âm lịch",
    lev_doanngo: "Tết Đoan Ngọ",
    lev_doanngo_desc: "Ngày diệt sâu bọ, cầu mùa màng bội thu. Giúp Lão Ngư Dân trừ sâu hại, thưởng thức bánh ú tro thơm ngon.",
    lev_doanngo_lunar: "Mùng 5 tháng 5 âm lịch",
    lev_vulan: "Lễ Vu Lan",
    lev_vulan_desc: "Mùa báo hiếu. Thắp hoa đăng cầu siêu cho cửu huyền thất tổ, siêu độ u hồn lang thang, tích đức hành thiện.",
    lev_vulan_lunar: "Rằm tháng 7 âm lịch",
    lev_trungthu: "Tết Trung Thu",
    lev_trungthu_desc: "Đêm rằm đoàn viên. Rước đèn cùng Hằng Nga, tìm Thỏ Ngọc lạc, thưởng bánh trung thu ngắm trăng.",
    lev_trungthu_lunar: "Rằm tháng 8 âm lịch",
    lev_lehoi: "Lễ Hội Tông Môn",
    lev_lehoi_desc: "Đại hội thi đấu giữa 6 tông môn mỗi tháng! Ghi danh khiêu chiến, cống hiến cho tông môn, nhận thưởng theo hạng.",
    lev_lehoi_lunar: "Mùng 1–7 dương lịch hàng tháng",

    /* ---- NPC sự kiện ---- */
    npc_than_tai: "Thần Tài",
    npc_lao_ngu_dan: "Lão Ngư Dân",
    npc_su_co_tu_tam: "Sư Cô Từ Tâm",
    npc_hang_nga: "Hằng Nga",
    npc_su_gia_le_hoi: "Sứ Giả Lễ Hội",

    /* ---- Quest Tết Nguyên Đán ---- */
    levq_tet_01: "Chúc Tết Thần Tài",
    levq_tet_01_desc: "Đến gặp Thần Tài tại làng để nhận lời chúc phúc đầu năm mới.",
    levq_tet_02: "Trừ Hại Vườn Đào",
    levq_tet_02_desc: "Dã Trư đang phá vườn đào của làng. Diệt 20 con Dã Trư để bảo vệ hoa Tết.",
    levq_tet_03: "Lì Xì Đầu Năm",
    levq_tet_03_desc: "Thu thập 5 Bao Lì Xì để phát cho trẻ nhỏ trong làng.",
    levq_tet_04: "Hàng Phục Trư Vương",
    levq_tet_04_desc: "Dã Trư Vương nổi giận vì đàn em bị diệt. Đánh bại nó để làng yên ổn đón Tết.",

    /* ---- Quest Đoan Ngọ ---- */
    levq_doanngo_01: "Thăm Lão Ngư Dân",
    levq_doanngo_01_desc: "Đến bờ hồ gặp Lão Ngư Dân, nghe kể về nạn sâu bọ năm nay.",
    levq_doanngo_02: "Diệt Sâu Hại",
    levq_doanngo_02_desc: "Sâu bọ phá hoại mùa màng. Diệt 15 con Sơn Kê (sâu chúa biến hình) để cứu vụ mùa.",
    levq_doanngo_03: "Bánh Ú Thơm Ngon",
    levq_doanngo_03_desc: "Thu thập 3 Bánh Ú Tro để cúng tổ tiên ngày Đoan Ngọ.",

    /* ---- Quest Vu Lan ---- */
    levq_vulan_01: "Thắp Hoa Đăng",
    levq_vulan_01_desc: "Đến gặp Sư Cô Từ Tâm, thắp hoa đăng cầu siêu cho cửu huyền thất tổ.",
    levq_vulan_02: "Siêu Độ U Hồn",
    levq_vulan_02_desc: "Siêu độ 15 U Hồn lang thang để chúng sớm siêu thoát trong mùa Vu Lan.",
    levq_vulan_03: "Báo Hiếu Song Thân",
    levq_vulan_03_desc: "Dâng 3 viên Hồi Khí Đan cho Sư Cô để phát cho người già neo đơn.",

    /* ---- Quest Trung Thu ---- */
    levq_trungthu_01: "Gặp Hằng Nga",
    levq_trungthu_01_desc: "Hằng Nga giáng trần đêm rằm. Đến gặp nàng tại làng để nhận nhiệm vụ.",
    levq_trungthu_02: "Tìm Thỏ Ngọc",
    levq_trungthu_02_desc: "Thỏ Ngọc ham chơi lạc xuống trần gian. Diệt 10 con Sơn Kê để tìm dấu vết của nó.",
    levq_trungthu_03: "Bánh Trung Thu",
    levq_trungthu_03_desc: "Thu thập 2 Bánh Trung Thu để cùng Hằng Nga phá cỗ đêm rằm.",
    levq_trungthu_04: "Rước Đèn Đêm Rằm",
    levq_trungthu_04_desc: "Lang Vương quấy phá lễ rước đèn. Đánh bại nó để đêm hội trọn vẹn.",

    /* ---- Quest Lễ Hội Tông Môn ---- */
    levq_lehoi_01: "Ghi Danh Lễ Hội",
    levq_lehoi_01_desc: "Đến gặp Sứ Giả Lễ Hội để ghi danh tham gia đại hội tông môn tháng này.",
    levq_lehoi_02: "Khiêu Chiến Quần Hùng",
    levq_lehoi_02_desc: "Chứng tỏ thực lực: diệt 15 con Phong Lang trong thời gian lễ hội.",
    levq_lehoi_03: "Quyết Chiến Vinh Quang",
    levq_lehoi_03_desc: "Đánh bại Lang Vương để mang vinh quang về cho tông môn.",

    /* ---- UI sự kiện ---- */
    lev_banner_active: "Sự kiện đang diễn ra",
    lev_daily: "Quà đăng nhập sự kiện",
    lev_daily_claim: "Nhận quà",
    lev_daily_done: "Đã nhận quà hôm nay",
    lev_daily_ok: "Nhận quà sự kiện thành công! +{stones} Linh Thạch",
    lev_calendar: "Lịch sự kiện",
    lev_upcoming: "Sắp diễn ra",
    lev_ongoing: "Đang diễn ra",
    lev_ended: "Đã kết thúc",
    lev_days_left: "Còn {n} ngày",
    lev_starts_in: "Bắt đầu sau {n} ngày",
    lev_quest_chain: "Chuỗi nhiệm vụ sự kiện",
    lev_no_event: "Hiện không có sự kiện nào đang diễn ra.",
    lev_decor_tet: "Khắp làng trang trí đào mai, đèn lồng đỏ rực rỡ đón xuân.",
    lev_decor_doanngo: "Bờ hồ treo lá ngải, hương bồ; thuyền rồng neo đậu sẵn sàng đua.",
    lev_decor_vulan: "Hoa đăng trôi trên mặt hồ, khói hương nghi ngút khắp chùa làng.",
    lev_decor_trungthu: "Đèn lồng cá chép treo khắp nơi, trăng rằm sáng vằng vặc.",
    lev_decor_lehoi: "Cờ xí 6 tông môn tung bay, lôi đài dựng giữa quảng trường.",
    lev_sect_rank: "Xếp hạng tông môn",
    lev_sect_reward: "Thưởng lễ hội tông môn",
    lev_sect_reward_ok: "Nhận thưởng lễ hội: hạng {rank} — +{stones} Linh Thạch!",
    lev_sect_reward_done: "Đã nhận thưởng lễ hội tháng này",
    lev_sect_no_sect: "Gia nhập tông môn để tham gia xếp hạng lễ hội.",
    lev_rank_1: "Hạng Nhất",
    lev_rank_2: "Hạng Nhì",
    lev_rank_3: "Hạng Ba",
    lev_rank_other: "Hạng {n}",
  };

  var EN = {
    /* ---- Event names + descriptions ---- */
    lev_tet: "Lunar New Year",
    lev_tet_desc: "Happy New Year! Claim daily lucky money, complete the Tet quest chain, and enjoy peach and apricot blossoms across the village.",
    lev_tet_lunar: "1st day of the 1st lunar month",
    lev_doanngo: "Dragon Boat Festival",
    lev_doanngo_desc: "Pest-extermination day for a bountiful harvest. Help the Old Fisherman clear pests and enjoy delicious ash cakes.",
    lev_doanngo_lunar: "5th day of the 5th lunar month",
    lev_vulan: "Vu Lan Festival",
    lev_vulan_desc: "Season of filial piety. Light lanterns for ancestors, liberate wandering souls, and accumulate merit.",
    lev_vulan_lunar: "15th day of the 7th lunar month",
    lev_trungthu: "Mid-Autumn Festival",
    lev_trungthu_desc: "Reunion night. Parade lanterns with Chang'e, find the lost Jade Rabbit, and share mooncakes under the moon.",
    lev_trungthu_lunar: "15th day of the 8th lunar month",
    lev_lehoi: "Sect Festival",
    lev_lehoi_desc: "Monthly tournament between the 6 sects! Register, prove your strength, contribute to your sect, and earn rank rewards.",
    lev_lehoi_lunar: "1st–7th of each solar month",

    /* ---- Event NPCs ---- */
    npc_than_tai: "God of Wealth",
    npc_lao_ngu_dan: "Old Fisherman",
    npc_su_co_tu_tam: "Nun Tu Tam",
    npc_hang_nga: "Chang'e",
    npc_su_gia_le_hoi: "Festival Envoy",

    /* ---- Lunar New Year quests ---- */
    levq_tet_01: "New Year Greetings",
    levq_tet_01_desc: "Visit the God of Wealth in the village for New Year blessings.",
    levq_tet_02: "Protect the Peach Garden",
    levq_tet_02_desc: "Wild Boars are ravaging the peach garden. Slay 20 Wild Boars to protect the Tet flowers.",
    levq_tet_03: "Lucky Money",
    levq_tet_03_desc: "Collect 5 Lucky Red Envelopes to give to village children.",
    levq_tet_04: "Subdue the Boar King",
    levq_tet_04_desc: "The Boar King rages over its fallen kin. Defeat it so the village celebrates in peace.",

    /* ---- Dragon Boat quests ---- */
    levq_doanngo_01: "Visit the Old Fisherman",
    levq_doanngo_01_desc: "Meet the Old Fisherman by the lake and hear about this year's pest plague.",
    levq_doanngo_02: "Exterminate Pests",
    levq_doanngo_02_desc: "Pests ravage the crops. Slay 15 Mountain Chickens (transformed pest lords) to save the harvest.",
    levq_doanngo_03: "Fragrant Ash Cakes",
    levq_doanngo_03_desc: "Collect 3 Ash Cakes to offer ancestors on Dragon Boat day.",

    /* ---- Vu Lan quests ---- */
    levq_vulan_01: "Light the Lanterns",
    levq_vulan_01_desc: "Visit Nun Tu Tam and light lanterns praying for your ancestors.",
    levq_vulan_02: "Liberate Souls",
    levq_vulan_02_desc: "Liberate 15 wandering Wraiths so they may rest during Vu Lan.",
    levq_vulan_03: "Filial Devotion",
    levq_vulan_03_desc: "Offer 3 Qi Recovery Pills to the Nun for lonely elders.",

    /* ---- Mid-Autumn quests ---- */
    levq_trungthu_01: "Meet Chang'e",
    levq_trungthu_01_desc: "Chang'e descends on full-moon night. Meet her in the village.",
    levq_trungthu_02: "Find the Jade Rabbit",
    levq_trungthu_02_desc: "The playful Jade Rabbit is lost in the mortal world. Slay 10 Mountain Chickens to find its trail.",
    levq_trungthu_03: "Mooncakes",
    levq_trungthu_03_desc: "Collect 2 Mooncakes to share with Chang'e on reunion night.",
    levq_trungthu_04: "Lantern Parade",
    levq_trungthu_04_desc: "The Wolf King disrupts the lantern parade. Defeat it for a perfect festival night.",

    /* ---- Sect Festival quests ---- */
    levq_lehoi_01: "Register for the Festival",
    levq_lehoi_01_desc: "Meet the Festival Envoy to register for this month's sect tournament.",
    levq_lehoi_02: "Challenge the Heroes",
    levq_lehoi_02_desc: "Prove your strength: slay 15 Wind Wolves during the festival.",
    levq_lehoi_03: "Glorious Showdown",
    levq_lehoi_03_desc: "Defeat the Wolf King to bring glory to your sect.",

    /* ---- Event UI ---- */
    lev_banner_active: "Ongoing event",
    lev_daily: "Event login gift",
    lev_daily_claim: "Claim gift",
    lev_daily_done: "Claimed today",
    lev_daily_ok: "Event gift claimed! +{stones} Spirit Stones",
    lev_calendar: "Event calendar",
    lev_upcoming: "Upcoming",
    lev_ongoing: "Ongoing",
    lev_ended: "Ended",
    lev_days_left: "{n} days left",
    lev_starts_in: "Starts in {n} days",
    lev_quest_chain: "Event quest chain",
    lev_no_event: "No event is currently running.",
    lev_decor_tet: "The village is decorated with peach and apricot blossoms and red lanterns for spring.",
    lev_decor_doanngo: "Mugwort hangs by the lake; dragon boats wait for the race.",
    lev_decor_vulan: "Lanterns drift on the lake, incense smoke fills the village temple.",
    lev_decor_trungthu: "Carp lanterns hang everywhere under the bright full moon.",
    lev_decor_lehoi: "Banners of the 6 sects fly; the arena stands in the square.",
    lev_sect_rank: "Sect ranking",
    lev_sect_reward: "Sect festival reward",
    lev_sect_reward_ok: "Festival reward claimed: rank {rank} — +{stones} Spirit Stones!",
    lev_sect_reward_done: "This month's festival reward already claimed",
    lev_sect_no_sect: "Join a sect to enter the festival ranking.",
    lev_rank_1: "1st Place",
    lev_rank_2: "2nd Place",
    lev_rank_3: "3rd Place",
    lev_rank_other: "Rank {n}",
  };

  /* Gộp vào LANG (không ghi đè key đã có) */
  try {
    if (typeof LANG !== "undefined" && LANG) {
      ["vi", "en"].forEach(function (l) {
        var src = l === "vi" ? VI : EN;
        if (!LANG[l]) LANG[l] = {};
        Object.keys(src).forEach(function (k) {
          if (LANG[l][k] == null) LANG[l][k] = src[k];
        });
      });
    }
  } catch (e) {}

  /* Node.js export (smoke test) */
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { LEV_VI: VI, LEV_EN: EN };
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
