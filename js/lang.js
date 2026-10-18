/* ============================================================
 * js/lang.js — Hệ thống đa ngôn ngữ (Kỹ sư UI)
 * LANG = {vi, en}; t(key, params) hỗ trợ {param}; setLang(l) đổi + lưu.
 * Bao gồm: mọi key bắt buộc trong INTERFACES.md + nameKey/descKey
 * của ITEMS/MONSTERS/MAPS/NPCS/QUESTS/DUNGEONS/SKILLS/ELEMENTS.
 * ============================================================ */

var LANG = {
vi: {
  app_title: "Tu Tiên Online",
  menu_sub: "Con đường tu tiên vạn dặm bắt đầu từ một bước chân",
  btn_start: "Bắt đầu",
  btn_continue: "Tiếp tục",
  btn_create_role: "Tạo nhân vật",
  input_name: "Nhập tên nhân vật",
  create_name_label: "Tên nhân vật",
  create_sect_label: "Chọn hệ phái",
  create_lingen_label: "Linh căn",
  sect_kiem: "Kiếm Tu",
  sect_phap: "Pháp Tu",
  sect_the: "Thể Tu",
  sect_desc_kiem: "Sát thương cao, kiếm khí tung hoành",
  sect_desc_phap: "Linh lực dồi dào, thuật pháp mạnh",
  sect_desc_the: "Thân thể cường hãn, phòng thủ cao",
  btn_taycot: "Tẩy Cốt",
  btn_random_lingen: "Bốc linh căn",
  btn_begin: "Bắt đầu tu tiên",
  lingen_result: "Linh căn {name}",
  lingen_none: "Chưa tẩy cốt",
  qual_pham: "Phàm phẩm",
  qual_dia: "Địa phẩm",
  qual_thien: "Thiên phẩm",
  ui_back: "Quay lại",
  ui_close: "Đóng",
  ui_default_name: "Vô Danh",
  ui_use: "Dùng",
  ui_equip: "Trang bị",
  ui_equipped: "Đang mặc",
  ui_empty_slot: "Trống",
  ui_unlock: "Mở khóa",

  hud_hp: "HP",
  hud_mp: "MP",
  hud_stones: "Linh Thạch",
  hud_kills: "Quái hôm nay",
  hud_offline: "Chưa đồng bộ",
  btn_auto: "Auto",
  btn_fly: "Phi Hành",
  btn_run: "Chạy",
  msg_dead: "Bạn đã gục ngã, hồi sinh tại chỗ",
  lvlup_msg: "Lên cấp!",
  drop_get: "Nhận: {name} x{n}",

  nav_bag: "Túi",
  nav_char: "Nhân vật",
  nav_skill: "Kỹ năng",
  nav_quest: "Nhiệm vụ",
  nav_map: "Bản đồ",
  nav_dungeon: "Phụ bản",
  nav_gift: "Giftcode",
  nav_settings: "Cài đặt",

  panel_bag: "Túi đồ",
  panel_char: "Nhân vật",
  panel_skill: "Kỹ năng",
  panel_quest: "Nhiệm vụ",
  panel_map: "Bản đồ",
  panel_dungeon: "Phụ bản",
  panel_gift: "Giftcode",
  panel_settings: "Cài đặt",
  panel_npc: "Đối thoại",
  panel_shop: "Vạn Tiên Các",
  panel_breakthrough: "Đột phá",
  panel_donate: "Donate",

  bag_empty: "Túi trống",

  stat_atk: "Công",
  stat_def: "Thủ",
  stat_hp: "Sinh lực",
  stat_mp: "Linh lực",
  stat_exp: "Kinh nghiệm",
  stat_realm: "Cảnh giới",
  slot_weapon: "Vũ khí",
  slot_armor: "Giáp",
  slot_acc: "Phụ kiện",
  btn_enhance: "Cường hóa",
  enhance_ok: "Cường hóa thành công +{n}",
  enhance_fail: "Cường hóa thất bại, giữ nguyên cấp",
  enhance_max: "Đã đạt +15 tối đa",
  enhance_rate: "Tỉ lệ {n}%",
  btn_breakthrough: "Đột phá",
  bt_title: "Đột phá cảnh giới",
  bt_need: "Nguyên liệu cần",
  bt_do: "Bắt đầu đột phá",
  bt_success: "Đột phá thành công!",
  bt_fail: "Đột phá thất bại!",
  bt_cannot: "Chưa đủ điều kiện đột phá",
  bt_tamma_name: "Tâm Ma",
  bt_tamma_win: "Đã vượt qua tâm ma!",
  bt_tamma_lose: "Tâm ma phản phệ!",
  bt_loikiep: "Lôi kiếp giáng xuống!",

  quest_accept: "Nhận",
  quest_turnin: "Trả NV",
  quest_done: "Hoàn thành",
  q_progress: "{a}/{b}",
  q_need: "Yêu cầu",
  q_reward: "Thưởng",
  q_tab_avail: "Có thể nhận",
  q_tab_active: "Đang làm",
  q_tab_done: "Đã xong",
  q_no: "Chưa có nhiệm vụ",
  q_incomplete: "Chưa hoàn thành yêu cầu",

  npc_talk: "Nói chuyện",
  npc_quest: "Nhiệm vụ",
  npc_shop: "Cửa hàng",
  npc_bye: "Tạm biệt",

  shop_title: "Vạn Tiên Các",
  shop_buy: "Mua",
  shop_sell: "Bán",
  shop_sold: "Đã bán",
  shop_bought: "Mua thành công",
  shop_no_stone: "Không đủ Linh Thạch",
  shop_tab_buy: "Mua",
  shop_tab_sell: "Bán",
  shop_locked: "Vạn Tiên Các chưa mở khóa (cần Luyện Khí tầng 12)",
  shop_donate_open: "Mở khóa bằng Donate",
  recharge_title: "Nạp tiền",

  dg_left: "Còn {n} lượt",
  dg_fee: "Phí: {n}",
  dg_fee_free: "Miễn phí",
  dg_enter: "Vào",
  dg_resume: "Tiếp tục (Ải {n})",
  dg_buy_extra: "Mua thêm lượt (giá {n})",
  dg_no_turn: "Hết lượt hôm nay",
  dg_no_stone: "Không đủ Linh Thạch trả phí",
  dg_random: "Ngẫu nhiên",
  dg_stage: "Ải {n}",
  dg_stage_clear: "Qua ải!",
  dg_done: "Hoàn thành phụ bản!",
  dg_reward: "Thưởng ải",
  map_go: "Đi",
  map_here: "Hiện tại",
  map_locked: "Chưa đủ cảnh giới mở bản đồ này",

  gift_input: "Nhập giftcode",
  gift_redeem: "Đổi",
  gift_ok: "Đổi giftcode thành công!",
  gift_used: "Mã đã được sử dụng",
  gift_invalid: "Mã không hợp lệ",

  gfx_title: "Đồ họa",
  gfx_low: "Thấp",
  gfx_med: "Trung bình",
  gfx_high: "Cao",
  gfx_auto: "Tự động",
  gfx_auto_down: "Đã tự giảm đồ họa để mượt hơn",
  showp_title: "Hiển thị người chơi",
  showp_me: "Chỉ mình",
  showp_team: "Đồng đội",
  showp_all: "Tất cả mọi người",
  showp_suggest: "Đông người quá — thử chuyển Hiển thị người chơi xuống Đồng đội/Chỉ mình để mượt hơn",

  settings_music: "Nhạc nền",
  settings_sound: "Âm thanh",
  settings_lang: "Ngôn ngữ",
  settings_donate: "Donate mở khóa Vạn Tiên Các",
  settings_on: "Bật",
  settings_off: "Tắt",

  checkin: "Điểm danh",
  checkin_done: "Đã điểm danh hôm nay",
  checkin_ok: "Điểm danh nhận 100 Linh Thạch",

  donate_title: "Donate",
  donate_desc: "Quét mã để donate cho nhà phát triển — donate thành công được mở khóa Vạn Tiên Các ngay, không cần đợi Luyện Khí tầng 12.",
  donate_qr_wait: "QR đang cập nhật",
  donate_done_btn: "Tôi đã chuyển khoản",
  donate_pending: "Đã ghi nhận, chờ duyệt",
  donate_unlocked: "Đã mở khóa Vạn Tiên Các!",

  /* Linh căn */
  el_kim: "Kim", el_moc: "Mộc", el_thuy: "Thủy", el_hoa: "Hỏa", el_tho: "Thổ",
  el_bang: "Băng", el_loi: "Lôi", el_phong: "Phong", el_hondon: "Hỗn Độn",

  /* Quái */
  mon_da_tru: "Dã Trư",
  mon_son_ke: "Sơn Kê",
  mon_da_tru_vuong: "Dã Trư Vương",
  mon_phong_lang: "Phong Lang",
  mon_hu_thi: "Hủ Thi",
  mon_lang_vuong: "Lang Vương",
  mon_u_hon: "U Hồn",
  mon_thi_ma: "Thi Ma",
  mon_cot_tuong: "Cốt Tướng",

  /* Bản đồ */
  map_thanh_van_tran: "Thanh Vân Trấn",
  map_hac_phong_lam: "Hắc Phong Lâm",
  map_u_minh_coc: "U Minh Cốc",

  /* Phụ bản */
  dg_pb_tanthu_1: "Bí Cảnh Tân Thủ",
  dg_pb_tinhanh_1: "Bí Cảnh Tinh Anh",
  dg_pb_dotpha_lk: "Bí Cảnh Đột Phá",
  dg_pb_ngau_nhien_1: "Bí Cảnh Ngẫu Nhiên",

  /* Vật phẩm */
  it_pill_hx: "Hồi Xuân Đan",
  it_pill_hx_desc: "Hồi phục 30% sinh lực",
  it_pill_hl: "Hồi Linh Đan",
  it_pill_hl_desc: "Hồi phục 30% linh lực",
  it_pill_truccodan: "Trúc Cơ Đan",
  it_pill_truccodan_desc: "Đan dược đột phá Trúc Cơ",
  it_taycothao: "Tẩy Cốt Thảo",
  it_taycothao_desc: "Dược thảo tẩy cốt phạt tủy",
  it_yaodan1: "Yêu Đan Cấp 1",
  it_yaodan1_desc: "Yêu đan của yêu thú cấp 1",
  it_khaiphongphu: "Khai Phong Phù",
  it_khaiphongphu_desc: "Mở khóa vật phẩm bị khóa",
  it_wpn_phan: "Kiếm Phàm",
  it_arm_phan: "Giáp Phàm",
  it_acc_phan: "Ngọc Bội Phàm",
  it_wpn_linh: "Kiếm Linh",
  it_arm_linh: "Giáp Linh",
  it_acc_linh: "Ngọc Bội Linh",

  /* Kỹ năng */
  sk_sword_qi: "Kiếm Khí",
  sk_elemental: "Ngũ Hành Thuật",

  /* Nhiệm vụ */
  q_taycot: "Thu thập Tẩy Cốt Thảo",
  q_taycot_desc: "Thu thập 3 Tẩy Cốt Thảo cho Đại Phu",
  q_kill5: "Diệt trừ Dã Trư",
  q_kill5_desc: "Tiêu diệt 5 Dã Trư quanh Thanh Vân Trấn",
  q_boss1: "Khiêu chiến Dã Trư Vương",
  q_boss1_desc: "Đánh bại Dã Trư Vương trong rừng",

  /* NPC */
  npc_dai_phu: "Đại Phu",
  npc_van_tien_cac: "Vạn Tiên Các",
  npc_dai_phu_greet: "Lão phu là Đại Phu của Thanh Vân Trấn, ngươi cần giúp gì?",
  npc_dai_phu_has_quest: "Ta đang có việc cần nhờ, ngươi nhận chứ?",
  npc_dai_phu_progress: "Việc còn dang dở, cố gắng lên!",
  npc_dai_phu_turnin: "Tốt lắm! Đây là phần thưởng của ngươi.",
  npc_dai_phu_alldone: "Hiện tại không còn việc gì cho ngươi."
},
en: {
  app_title: "Tu Tien Online",
  menu_sub: "The thousand-mile cultivation path begins with a single step",
  btn_start: "Start",
  btn_continue: "Continue",
  btn_create_role: "Create character",
  input_name: "Enter character name",
  create_name_label: "Character name",
  create_sect_label: "Choose sect",
  create_lingen_label: "Spirit root",
  sect_kiem: "Sword Cultivator",
  sect_phap: "Spell Cultivator",
  sect_the: "Body Cultivator",
  sect_desc_kiem: "High damage, sweeping sword qi",
  sect_desc_phap: "Abundant spirit power, strong spells",
  sect_desc_the: "Tough body, high defense",
  btn_taycot: "Cleanse Bones",
  btn_random_lingen: "Draw spirit root",
  btn_begin: "Begin cultivation",
  lingen_result: "Spirit root: {name}",
  lingen_none: "Not cleansed yet",
  qual_pham: "Mortal grade",
  qual_dia: "Earth grade",
  qual_thien: "Heaven grade",
  ui_back: "Back",
  ui_close: "Close",
  ui_default_name: "Nameless",
  ui_use: "Use",
  ui_equip: "Equip",
  ui_equipped: "Equipped",
  ui_empty_slot: "Empty",
  ui_unlock: "Unseal",

  hud_hp: "HP",
  hud_mp: "MP",
  hud_stones: "Spirit Stones",
  hud_kills: "Kills today",
  hud_offline: "Not synced",
  btn_auto: "Auto",
  btn_fly: "Fly",
  btn_run: "Run",
  msg_dead: "You have fallen, revived on the spot",
  lvlup_msg: "Level up!",
  drop_get: "Got: {name} x{n}",

  nav_bag: "Bag",
  nav_char: "Character",
  nav_skill: "Skills",
  nav_quest: "Quests",
  nav_map: "Map",
  nav_dungeon: "Dungeon",
  nav_gift: "Giftcode",
  nav_settings: "Settings",

  panel_bag: "Inventory",
  panel_char: "Character",
  panel_skill: "Skills",
  panel_quest: "Quests",
  panel_map: "Map",
  panel_dungeon: "Dungeons",
  panel_gift: "Giftcode",
  panel_settings: "Settings",
  panel_npc: "Dialogue",
  panel_shop: "Myriad Immortals Pavilion",
  panel_breakthrough: "Breakthrough",
  panel_donate: "Donate",

  bag_empty: "Bag is empty",

  stat_atk: "ATK",
  stat_def: "DEF",
  stat_hp: "HP",
  stat_mp: "MP",
  stat_exp: "EXP",
  stat_realm: "Realm",
  slot_weapon: "Weapon",
  slot_armor: "Armor",
  slot_acc: "Accessory",
  btn_enhance: "Enhance",
  enhance_ok: "Enhance success +{n}",
  enhance_fail: "Enhance failed, level kept",
  enhance_max: "Already +15 max",
  enhance_rate: "Rate {n}%",
  btn_breakthrough: "Breakthrough",
  bt_title: "Realm breakthrough",
  bt_need: "Materials required",
  bt_do: "Begin breakthrough",
  bt_success: "Breakthrough successful!",
  bt_fail: "Breakthrough failed!",
  bt_cannot: "Requirements not met",
  bt_tamma_name: "Inner Demon",
  bt_tamma_win: "Inner demon vanquished!",
  bt_tamma_lose: "Consumed by the inner demon!",
  bt_loikiep: "Lightning tribulation descends!",

  quest_accept: "Accept",
  quest_turnin: "Turn in",
  quest_done: "Completed",
  q_progress: "{a}/{b}",
  q_need: "Requires",
  q_reward: "Reward",
  q_tab_avail: "Available",
  q_tab_active: "Active",
  q_tab_done: "Done",
  q_no: "No quests",
  q_incomplete: "Requirements not yet met",

  npc_talk: "Talk",
  npc_quest: "Quests",
  npc_shop: "Shop",
  npc_bye: "Farewell",

  shop_title: "Myriad Immortals Pavilion",
  shop_buy: "Buy",
  shop_sell: "Sell",
  shop_sold: "Sold",
  shop_bought: "Purchase successful",
  shop_no_stone: "Not enough Spirit Stones",
  shop_tab_buy: "Buy",
  shop_tab_sell: "Sell",
  shop_locked: "Pavilion locked (requires Qi Refining layer 12)",
  shop_donate_open: "Unlock via Donate",
  recharge_title: "Top up",

  dg_left: "{n} attempts left",
  dg_fee: "Fee: {n}",
  dg_fee_free: "Free",
  dg_enter: "Enter",
  dg_resume: "Resume (Stage {n})",
  dg_buy_extra: "Buy extra attempt ({n})",
  dg_no_turn: "No attempts left today",
  dg_no_stone: "Not enough Spirit Stones for fee",
  dg_random: "Random",
  dg_stage: "Stage {n}",
  dg_stage_clear: "Stage cleared!",
  dg_done: "Dungeon complete!",
  dg_reward: "Stage reward",
  map_go: "Go",
  map_here: "Current",
  map_locked: "Realm too low for this map",

  gift_input: "Enter giftcode",
  gift_redeem: "Redeem",
  gift_ok: "Giftcode redeemed!",
  gift_used: "Code already used",
  gift_invalid: "Invalid code",

  gfx_title: "Graphics",
  gfx_low: "Low",
  gfx_med: "Medium",
  gfx_high: "High",
  gfx_auto: "Auto",
  gfx_auto_down: "Graphics auto-lowered for smoothness",
  showp_title: "Show players",
  showp_me: "Me only",
  showp_team: "Teammates",
  showp_all: "Everyone",
  showp_suggest: "Crowded — try lowering Show players to Teammates/Me only",

  settings_music: "Music",
  settings_sound: "Sound",
  settings_lang: "Language",
  settings_donate: "Donate to unlock the Pavilion",
  settings_on: "On",
  settings_off: "Off",

  checkin: "Check in",
  checkin_done: "Already checked in today",
  checkin_ok: "Checked in: +100 Spirit Stones",

  donate_title: "Donate",
  donate_desc: "Scan to donate to the developer — a successful donation unlocks the Myriad Immortals Pavilion immediately, no need to wait for Qi Refining layer 12.",
  donate_qr_wait: "QR coming soon",
  donate_done_btn: "I've transferred",
  donate_pending: "Recorded, pending approval",
  donate_unlocked: "Myriad Immortals Pavilion unlocked!",

  /* Spirit roots */
  el_kim: "Metal", el_moc: "Wood", el_thuy: "Water", el_hoa: "Fire", el_tho: "Earth",
  el_bang: "Ice", el_loi: "Lightning", el_phong: "Wind", el_hondon: "Chaos",

  /* Monsters */
  mon_da_tru: "Wild Boar",
  mon_son_ke: "Mountain Pheasant",
  mon_da_tru_vuong: "Boar King",
  mon_phong_lang: "Wind Wolf",
  mon_hu_thi: "Rotting Corpse",
  mon_lang_vuong: "Wolf King",
  mon_u_hon: "Wandering Soul",
  mon_thi_ma: "Corpse Demon",
  mon_cot_tuong: "Bone General",

  /* Maps */
  map_thanh_van_tran: "Azure Cloud Town",
  map_hac_phong_lam: "Black Wind Forest",
  map_u_minh_coc: "Nether Valley",

  /* Dungeons */
  dg_pb_tanthu_1: "Novice Dungeon",
  dg_pb_tinhanh_1: "Elite Dungeon",
  dg_pb_dotpha_lk: "Breakthrough Dungeon",
  dg_pb_ngau_nhien_1: "Random Dungeon",

  /* Items */
  it_pill_hx: "Rejuvenation Pill",
  it_pill_hx_desc: "Restores 30% HP",
  it_pill_hl: "Spirit Pill",
  it_pill_hl_desc: "Restores 30% MP",
  it_pill_truccodan: "Foundation Pill",
  it_pill_truccodan_desc: "Breakthrough pill for Foundation Establishment",
  it_taycothao: "Bone Herb",
  it_taycothao_desc: "Herb for cleansing bones and marrow",
  it_yaodan1: "Tier-1 Beast Core",
  it_yaodan1_desc: "Beast core from tier-1 beasts",
  it_khaiphongphu: "Unseal Talisman",
  it_khaiphongphu_desc: "Unseals a locked item",
  it_wpn_phan: "Mortal Sword",
  it_arm_phan: "Mortal Armor",
  it_acc_phan: "Mortal Pendant",
  it_wpn_linh: "Spirit Sword",
  it_arm_linh: "Spirit Armor",
  it_acc_linh: "Spirit Pendant",

  /* Skills */
  sk_sword_qi: "Sword Qi",
  sk_elemental: "Elemental Art",

  /* Quests */
  q_taycot: "Gather Bone Herbs",
  q_taycot_desc: "Collect 3 Bone Herbs for the Herbalist",
  q_kill5: "Cull the Boars",
  q_kill5_desc: "Slay 5 Wild Boars around Azure Cloud Town",
  q_boss1: "Challenge the Boar King",
  q_boss1_desc: "Defeat the Boar King in the forest",

  /* NPC */
  npc_dai_phu: "Herbalist",
  npc_van_tien_cac: "Myriad Immortals Pavilion",
  npc_dai_phu_greet: "I am the herbalist of Azure Cloud Town. How can I help?",
  npc_dai_phu_has_quest: "I have a task for you. Will you take it?",
  npc_dai_phu_progress: "The task is not yet done. Keep going!",
  npc_dai_phu_turnin: "Well done! Here is your reward.",
  npc_dai_phu_alldone: "I have no more tasks for you right now."
}
};

var LANG_CUR = "vi";

/* Lấy chuỗi theo key; params thay {ten}. Thiếu key → trả key thô. */
function t(key, params) {
  var lang = LANG[LANG_CUR] || LANG.vi;
  var s = lang[key];
  if (s == null) s = LANG.vi[key];
  if (s == null) return key;
  if (params) {
    s = String(s).replace(/\{(\w+)\}/g, function (m, k) {
      return params[k] != null ? params[k] : m;
    });
  }
  return s;
}

/* Đổi ngôn ngữ + lưu (state.lang nếu có, kèm localStorage dự phòng). */
function setLang(l) {
  if (!LANG[l]) return;
  LANG_CUR = l;
  try { localStorage.setItem("ttonline_v2_lang", l); } catch (e) {}
  try {
    if (typeof state !== "undefined" && state && state.char) state.lang = l;
  } catch (e) {}
}

/* Node.js export (smoke test) */
if (typeof module !== "undefined" && module.exports) {
  module.exports = { LANG: LANG, t: t, setLang: setLang };
}
