# Tu Tiên Online v2 — Interface Contract (BẮT BUỘC tuân thủ)
# Milestone 1: bản OFFLINE chơi thử đầy đủ (online/Supabase dời sang milestone 2)

Thư mục: `~/workspace/game-tu-tien/v2/`. HTML/CSS/JS thuần, không framework, mobile-first.

## Thứ tự load script trong index.html
```
js/lang.js → js/stages.js → js/data.js → js/state.js → js/online.js →
js/audio.js → js/engine.js → js/combat.js → js/npc.js → js/quest.js → js/ui.js → boot
```
Mọi file dùng `var`/function global (không dùng `import`/`export` ES6) để chạy
trực tiếp từ file://. Cuối file thêm block `module.exports` CHỈ cho các hàm
thuần logic (để smoke test chạy được bằng node) — bọc trong
`if (typeof module !== "undefined" && module.exports)`.

## js/audio.js (Kỹ sư Engine) — hệ thống âm thanh
- `AudioSys.init()` — tạo AudioContext lười (lazy); tự unlock ở lần chạm
  đầu tiên của user (mobile autoplay policy): bind `pointerdown` một lần.
- `AudioSys.playMusic(name)` — `name`: 'menu'|'map'|'boss'|'breakthrough';
  phát lặp file `assets/music/<name>.mp3`; **thiếu file thì im lặng, không lỗi**.
- `AudioSys.stopMusic()`.
- `AudioSys.sfx(name)` — tổng hợp bằng Web Audio API, không cần file:
  'slash' (noise burst), 'hit', 'pickup' (ting), 'click', 'success'
  (arpeggio lên), 'fail' (tone xuống).
- `AudioSys.setMusicOn(b)`, `AudioSys.setSfxOn(b)` — đọc/ghi
  `state.settings.music` / `state.settings.sound` (đã có trong defaultState).
- `AudioSys.sfxLoaiQuai(monId)` → `{aggro, hit, death, skill}` — mỗi key là
  function phát 1 âm thanh tổng hợp bằng Web Audio (oscillator + noise +
  envelope), không dùng file, mỗi âm thanh <30 dòng code. Phân biệt theo
  `MONSTERS[monId].loai` ('thu': trầm gằn | 'ma': the thé cao) và
  `boss:true` (thêm delay/reverb cho vang):
  quái thường có aggro (gầm nhẹ khi xuất hiện) / hit (kêu khi trúng đòn) /
  death (gục); boss có aggro (rống lớn 2 tần số trầm chồng nhau) / skill
  (dậm chân + gầm, kèm cảnh báo) / death (gào, pitch rơi dần).
- engine.js và combat.js gọi audio PHẢI guard:
  `if (typeof AudioSys !== 'undefined')` (để chạy được trên node).
- ui.js: đổi nhạc theo màn hình (menu→'menu', game→'map', gặp boss→'boss',
  đột phá→'breakthrough'); panel settings có 2 toggle riêng: nhạc nền, âm thanh.

## Cường hóa trang bị (Thiết kế Hệ thống định nghĩa, Kỹ sư UI vẽ panel)
- `state.enhance = {weapon:0, armor:0, acc:0}` — cấp +0..+15 theo slot.
- `enhanceCost(plus)`, `enhanceRate(plus)`, `enhanceMult(plus)` (stages.js):
  mỗi cấp +8% chỉ số gốc món đồ; thất bại giữ nguyên cấp.
- Panel Nhân vật: nút "Cường hóa" mỗi món đang mặc → trừ Linh Thạch theo
  `enhanceCost`, roll `enhanceRate`, cộng cấp, tính lại chỉ số
  (`Engine.getStats` phải cộng `enhanceMult`).

## Đột phá — flow UI (Kỹ sư UI)
1. Panel Nhân vật → nút "Đột phá" (hiện khi `canBreakthrough(state)`).
2. Kiểm tra + trừ nguyên liệu theo `STAGES[realm].dot_pha` (Trúc Cơ: Trúc Cơ Đan + Yêu Đan 1).
3. Ải tâm ma (nếu `dot_pha.tam_ma`): quick-battle thuần logic trong ui.js
   (dùng `Combat.calcDamage`, đấu với "Tâm Ma" stats = 80% player, thanh HP
   chạy mỗi 800ms) — thắng mới qua bước 4.
4. Hiệu ứng lôi kiếp (chớp sáng + `AudioSys.playMusic('breakthrough')`).
5. `doBreakthrough(state, breakthroughRate(realm))` → toast thành công/thất bại.

## Đã viết sẵn (Producer viết, các vai trò CHỈ đọc)
- `js/stages.js`: `STAGES`, `DUNGEON_TYPES`, `dungeonType(id)`,
  `dungeonBuyCost(typeId, bought)`, `stageName(realm, tier)`,
  `expMaxFor(realm, tier)`, `baseStats(realm, tier, sect)`,
  `featuresUnlocked(realm)`, `hasFeature(realm, f)`,
  `breakthroughRate(realm)`, `powerLevel(realm, tier)`,
  `makeRng(seed)`, `randInt(rng, min, max)`, `pickRng(rng, arr)` (random có seed).
  tier: realm 1 → tầng 1..12; realm ≥2 → 0..2 (Sơ/Trung/Hậu).
- `js/state.js`: `defaultState()`, `todayStr()`, `bumpKill(state)`,
  `dungeonQuota/Left/Enter/Buy(state, dungeonId, typeId)`,
  `addItem/removeItem/countItem(state, id, qty)`,
  `gainExp(state, n)` → `{leveled}`, `canBreakthrough(state)`,
  `doBreakthrough(state, rate)` → `{ok}`, `saveGame(state)`, `loadGame()`.
- `js/state.js` thêm: `state.dungeonRun` (null hoặc
  `{dungeonId, seed, stageIdx, layout}`), `startDungeonRun(state, dungeonId,
  seed, layout)`, `clearDungeonRun(state)`.
- `js/online.js`: `Online.save/load/hasSave/wipe`.

State shape xem `defaultState()` trong state.js. KHÔNG tự ý đổi field.

## Quy ước chung
- Ngôn ngữ: mọi chuỗi hiển thị qua `t('key')` (định nghĩa trong lang.js).
  KHÔNG hardcode tiếng Việt trong logic/UI.
- Ảnh: đường dẫn tương đối từ v2/, ví dụ `../assets-ai/map1-thanh-van-tran.webp`
  (assets-ai nằm cùng cấp với v2). Code PHẢI chịu được ảnh thiếu:
  `<img>` thêm `onerror` ẩn/hiện fallback; canvas: nếu ảnh lỗi thì vẽ
  hình chữ nhật màu + tên thay thế.
- Màu UI: giấy da `#f3e9d2`/be kem `#efe3c8`, khung nâu gỗ `#6b4a2f`,
  nút xanh ngọc `#2fa3a0`, chữ đen thư pháp `#2b2118`, điểm nhấn đỏ `#b03a2e`.

## data.js (Thiết kế Hệ thống) PHẢI export
- `ELEMENTS`: `{kim:{fx,nameKey}, moc:..., thuy, hoa, tho, bang, loi, phong, hondon}`
- `LINGEN_RATES`: `[['kim',18],['moc',18],['thuy',18],['hoa',18],['tho',18],['bang',3],['loi',3],['phong',3],['hondon',1]]`
- `MONSTERS`: `{id: {nameKey, hp, atk, def, exp, img, fb (màu fallback), loai: 'thu'|'ma',
  boss?, drops:[{id,rate,min,max}]}}`
  Cần có: `da_tru`, `son_ke`, `da_tru_vuong`(boss), `phong_lang`, `hu_thi`,
  `lang_vuong`(boss), `u_hon`, `thi_ma`, `cot_tuong`(boss).
- `MAPS`: `[{id, nameKey, bg (ảnh), fb, monsters:[ids], boss: id, npcs:[ids],
  gates:[{to, x, y}], stoneDrop:[min,max], unlock: null|{realm,tier}}]` — 3 map.
- `DUNGEONS`: `[{id, nameKey, typeId ('tanthu'|'tinhanh'|'dotpha'), mapBg, monsters:[ids],
  boss:id, rewardNote}]` — tối thiểu 3: 1 Tân Thủ, 1 Tinh Anh, 1 Đột Phá
  (Đột Phá rớt nguyên liệu đột phá: `yaodan1`, `truccothao`...).
  Thêm 1 phụ bản `ngau_nhien: true`, có thêm:
  `realmPool: {monsters:[ids], bosses:[ids]}`,
  `rewardTables: {common:[{stones:[a,b], items:[{id,qty}]}], rare:[...], breakthrough:[...]}`.
  Export `genRandomDungeon(def, seed)` → `{seed, stages:[{monsters:[ids], boss:id,
  rewards:{stones:[a,b], items:[{id,qty}]}}]}`:
  random 3–5 ải bằng `makeRng/randInt/pickRng`; mỗi ải 3–5 quái từ pool,
  1 boss từ pool; thưởng cuối ải: 70% common, 25% rare, 5% breakthrough.
- `ITEMS`: `{id: {kind:'pill'|'material'|'equip'|'yaodan', nameKey, descKey?, price, sell,
  healHp? (tỉ lệ), healMp?, atk?, def?, hp?, slot?('weapon'|'armor'|'acc'),
  tier?(0..4), reqRealm?, locked?}}`
  Cần có: `pill_hx`, `pill_hl`, `pill_truccodan`, `taycothao`, `yaodan1`,
  `khaiphongphu` (Khai Phong Phù: mở khóa đồ khóa → không khóa),
  `wpn_phan`,`arm_phan`,`acc_phan` (tier 0), `wpn_linh`,`arm_linh`,`acc_linh` (tier 1).
- `SKILLS`: `{sword_qi:{nameKey, mp, mult, fx}, elemental:{nameKey, mp, mult}}`
  (elemental lấy fx theo linh căn).
- `SHOP_STOCK`: `['pill_hx','pill_hl','pill_truccodan','wpn_phan','arm_phan','acc_phan']`
- `GIFT_CODES`: `{CODE: {stones, items:[{id,qty}]}}` — ít nhất 3 mã mẫu.
- `NPCS`: `{id: {nameKey, mapId, x, y, kind:'quest'|'shop', img?}}`
  Cần có: `dai_phu` (map 0), `van_tien_cac` (map 0).
- `QUESTS`: `[{id, nameKey, descKey, npc:'dai_phu', need:{type:'kill', monster, count} |
  {type:'item', item, count} | {type:'talk'}, reward:{stones, exp, items:[{id,qty,locked}]}}]`
  Cần có: `q_taycot` (thu thập 3 taycothao), `q_kill5` (giết 5 da_tru),
  `q_boss1` (hạ da_tru_vuong).

## engine.js (Kỹ sư Engine) PHẢI export
- `Engine.init(canvasId)`, `Engine.start()`, `Engine.stop()`
- `Engine.enterMap(mapId)` — dựng quái theo MAPS, đặt player ở cổng vào
- `Engine.setAuto(b)`, `Engine.setFly(b)`, `Engine.setRun(b)`
- `Engine.player` = `{x, y, dir, hp, mp, speed, target}`
- `Engine.getStats = null` — ui.js gán `() => ({atk, def, maxHp, maxMp})`
  (baseStats + đồ đang mặc); engine fallback `baseStats(1, 1, 'kiem')`
- `Engine.tryInteract()` — gọi khi bấm Space/nút `?`: tìm NPC gần nhất
  trong 60px → gọi `Engine.onNpc(npcId)`
- `Engine.onGate = null` — callback `(toMapId)` khi đi vào cổng chuyển map
- `Engine.onKill = null` — ui.js gán callback `(monster) => {...}` để cộng EXP/rớt đồ
- `Engine.onNpc = null` — callback `(npcId) => {...}` khi bấm tương tác gần NPC
- Bí cảnh ngẫu nhiên: `Engine.enterDungeonRun(run, def)` — đánh theo ải
  (`run.layout.stages[run.stageIdx]`): spawn quái + boss của ải; hết quái →
  gọi `Engine.onStageClear(stageIdx, rewards)`; ui.js trao thưởng, tăng
  `stageIdx`, gọi `Engine.nextStage()` hoặc `Engine.onDungeonDone()` khi hết ải.
  Thoát giữa chừng: `state.dungeonRun` giữ nguyên; vào lại cùng phụ bản thì
  resume từ `stageIdx` (ui.js kiểm tra).
- Đồ họa chống lag: `Engine.GFX_LEVELS = {thap:{particle:0, shadows:false,
  scale:0.6, fps:30}, trungbinh:{particle:0.5, shadows:false, scale:0.85, fps:60},
  cao:{particle:1, shadows:true, scale:1.0, fps:60}}`;
  `Engine.setGraphics(mode)` với mode 'tudong'|'thap'|'trungbinh'|'cao'
  (lưu `state.settings.graphics`; khi chọn tay thì lưu thêm
  `state.settings.graphicsManual = mode` làm trần cho chế độ tự động).
  Chế độ 'tudong': bắt đầu ở 'cao', mỗi 3 giây đo FPS trung bình:
  <25 → hạ 1 mức (tối thiểu 'thap') + `UI.toast(t('gfx_auto_down'))`;
  >55 liên tục 30 giây → tăng 1 mức (tối đa = graphicsManual || 'cao').
  Áp dụng ngay: scale = canvas backing store, particle = hệ số số hạt hiệu ứng,
  shadows = bật/tắt shadowBlur, fps = giới hạn frame (30/60).
- Hiển thị người chơi (chống lag khi đông): `Engine.otherPlayers = []`
  (mỗi phần tử `{id, name, x, y, teamId}`; v2 offline để trống, online sau này
  điền). Khi render, lọc theo `state.settings.showPlayers`:
  'me' → chỉ vẽ bản thân; 'team' → thêm người cùng `teamId` với player
  (`Engine.player.teamId`, mặc định null); 'all' → vẽ tất cả.
  Người bị ẩn: không vẽ sprite, không vẽ tên, không tính hiệu ứng của họ.
  Kết hợp đồ họa Tự động: khi auto phải hạ mức vì FPS thấp VÀ
  `otherPlayers.length >= 3` thì toast gợi ý `t('showp_suggest')` 1 lần/session.
- Điều khiển: phím mũi tên/WASD, joystick ảo (div#joystick do ui.js tạo,
  engine đọc qua `Engine.joy = {dx, dy}`), chạm vào canvas để đi tới điểm chạm.
- Auto: tự tìm quái gần nhất trong tầm nhìn, di chuyển tới và đánh (gọi Combat).
- Render: vẽ bg map full-canvas (cover), entities (player, quái, NPC, cổng),
  thanh HP trên đầu quái/boss, damage numbers bay lên, hiệu ứng skill đơn giản
  (vòng tròn/xung theo hệ — dùng ảnh 06_hieuung nếu load được).

## combat.js (Kỹ sư Engine) — THUẦN LOGIC, không DOM
- `Combat.calcDamage(atk, def, mult)` → số nguyên ≥1
- `Combat.playerStrike(playerStats, mon)` → `{dmg}` (trừ hp quái trong object)
- `Combat.monsterStrike(mon, playerStats)` → `{dmg}`
- `Combat.rollDrops(monDef)` → `[{id, qty}]` theo `drops` + tỉ lệ
- `Combat.stoneDrop(mapDef)` → số Linh Thạch theo `stoneDrop`
- `Combat.redeemGift(code, GIFT_CODES)` → `{ok, reward?}` (không đụng state)
- Âm thanh quái: `Combat.aggro(monId)`, `Combat.bossSkill(monId)` (engine gọi
  khi quái xuất hiện / boss tung skill); trong `playerStrike` tự gọi
  hit/death qua `AudioSys.sfxLoaiQuai` — TẤT CẢ guard
  `typeof AudioSys !== 'undefined'` để node test không lỗi.

## npc.js (Thiết kế Hệ thống)
- `NPC.forMap(mapId)` → `[npcDef...]` (đọc từ NPCS trong data.js)
- `NPC.talk(npcId, state)` → `{name, lines:[t-key...], options:[{label, act}]}` —
  `act` là một trong: `'quest'`, `'shop'`, `'bye'`. ui.js xử lý act.

## quest.js (Thiết kế Hệ thống) — thuần logic
- `Quest.available(state)` → quests chưa nhận mà đủ điều kiện
- `Quest.accept(state, id)`, `Quest.turnIn(state, id)` → `{ok, reward?}`
  (check need, trừ item nếu cần, cộng reward vào state)
- `Quest.onKill(state, monsterId)` — cập nhật tiến trình kill (lưu trong
  `state.quests[id] = {status:'active', count:n}`)

## lang.js (Kỹ sư UI) PHẢI có
- `LANG = {vi: {...}, en: {...}}`, `t(key)`, `setLang(l)` (đổi + lưu state).
- BẮT BUỘC đủ các key sau (và thêm tùy ý):
  app_title, btn_start, btn_continue, btn_create_role, input_name,
  sect_kiem, sect_phap, sect_the, btn_taycot, btn_random_lingen, btn_begin,
  lingen_result, hud_hp, hud_mp, hud_stones, hud_kills, btn_auto, btn_fly,
  btn_run, nav_bag, nav_char, nav_skill, nav_quest, nav_map, nav_dungeon,
  nav_gift, nav_settings, panel_bag, panel_char, panel_skill, panel_quest,
  panel_map, panel_gift, panel_settings, gift_input, gift_redeem, gift_ok,
  gift_used, gift_invalid, dg_left (dùng {n}), dg_fee (dùng {n}), dg_enter,
  dg_buy_extra (dùng {n}), dg_no_turn, dg_no_stone, dg_random ("Ngẫu nhiên"),
  dg_stage ("Ải {n}"), dg_stage_clear, dg_done,
  gfx_title ("Đồ họa"), gfx_low ("Thấp"), gfx_med ("Trung bình"),
  gfx_high ("Cao"), gfx_auto ("Tự động"),
  gfx_auto_down ("Đã tự giảm đồ họa để mượt hơn"),
  showp_title ("Hiển thị người chơi"), showp_me ("Chỉ mình"),
  showp_team ("Đồng đội"), showp_all ("Tất cả mọi người"),
  showp_suggest ("Đông người quá — thử chuyển Hiển thị người chơi xuống Đồng đội/Chỉ mình để mượt hơn"),
  shop_sell ("Bán"), checkin ("Điểm danh"), checkin_done ("Đã điểm danh hôm nay"),
  checkin_ok ("Điểm danh nhận 100 Linh Thạch"),
  donate_title ("Donate"), donate_desc, donate_qr_wait ("QR đang cập nhật"),
  donate_done_btn ("Tôi đã chuyển khoản"), donate_pending ("Đã ghi nhận, chờ duyệt"),
  msg_dead ("Bạn đã gục ngã, hồi sinh tại chỗ"),
  shop_title, shop_buy,
  shop_sold, quest_accept, quest_turnin, quest_done, npc_talk, npc_quest,
  npc_shop, npc_bye, bt_title, bt_need, bt_do, bt_success, bt_fail,
  realm_names... (dùng stageName() cho tên cảnh giới), cùng nameKey/descKey
  cho mọi ITEMS/MONSTERS/MAPS/NPCS/QUESTS trong data.js.

## ui.js (Kỹ sư UI) PHẢI có
- `UI.boot()` — đọc save (Online.load), chọn màn hình menu/create/game
- `UI.show(name)` — chuyển screen: 'menu' | 'create' | 'game'
- `UI.toast(msg)`, `UI.refreshHUD()`, `UI.openPanel(name)` / `UI.closePanel()`
  panels: 'bag','char','skill','quest','map','dungeon','gift','settings',
  'npc','shop','breakthrough'
- Tạo `#joystick` và nút `?` tương tác; gán `Engine.onKill`, `Engine.onNpc`.
- Panel settings: 2 toggle nhạc nền / âm thanh (AudioSys) + chọn Đồ họa
  4 mức (gọi `Engine.setGraphics`, áp dụng ngay không cần restart) +
  chọn Hiển thị người chơi 3 mức (lưu `state.settings.showPlayers`).
- Màn hình dungeon: liệt kê DUNGEONS, hiện rõ lượt còn lại hôm nay
  (`dungeonLeft`) + phí vào (`phi`); hết lượt → nút "Mua thêm lượt (giá X)"
  (`dungeonBuyCost`), bấm mua → `dungeonBuy` rồi refresh.
  Phụ bản `ngau_nhien` gắn nhãn "Ngẫu nhiên" (`t('dg_random')`).
  Vào phụ bản ngẫu nhiên: `dungeonEnter` trừ lượt/phí → nếu `state.dungeonRun`
  cùng dungeonId thì resume, else seed = `Date.now()`, layout =
  `genRandomDungeon(def, seed)`, `startDungeonRun(...)`, rồi
  `Engine.enterDungeonRun(...)`; `Engine.onStageClear` → trao `rewards`
  (random stones trong khoảng + items), save; `Engine.onDungeonDone` →
  `clearDungeonRun`, toast `t('dg_done')`.
- Giftcode: input + nút đổi → `Combat.redeemGift` + check `state.giftcodes`.

## index.html (Kỹ sư UI)
- `<div id="app">` chứa 3 `<section>` screen + `<div id="hud">` + `<nav id="bottomnav">`
  + `<div id="panels">` + `<div id="toasts">` + `<canvas id="game">`.
- Load script đúng thứ tự contract. viewport mobile, theme-color.

## Hệ thống Linh Thạch (tiền tệ duy nhất)
- Hiển thị rút gọn: `formatTien(n)` trong ui.js — >=1000000 → "3.4M",
  >=1000 → "1.2K", còn lại số nguyên. Dùng ở mọi chỗ hiện Linh Thạch (HUD, shop...).
- Nguồn kiếm: quái rớt, thưởng nhiệm vụ, điểm danh hằng ngày, thưởng ải phụ bản,
  bán đồ cho NPC (shop có nút Bán theo giá `sell`), giftcode, thành tựu.
- Nguồn tiêu: Vạn Tiên Các, phí phụ bản, mua thêm lượt, cường hóa,
  Khai Phong Phù, mua đan/phù ở NPC, thuế đấu giá 5% (milestone 2).
- Quy tắc (ghi chú trong code online.js): KHÔNG chuyển Linh Thạch trực tiếp
  giữa người chơi (chỉ qua đấu giá có thuế 5%); milestone online số dư do
  server quản lý.
- Nạp tiền thật: Kỹ sư UI làm sẵn nút + popup các gói nạp nhưng `display:none`
  (ẩn), không xử lý thanh toán.
- Điểm danh: nút ở menu khi `hasFeature(realm,'diem_danh')`; mỗi ngày 1 lần
  (`state.flags.diemdanh` = ngày đã điểm danh); thưởng 100 Linh Thạch.

## Donate QR mở khóa Vạn Tiên Các (Kỹ sư UI)
- Panel `donate`: vào từ (a) Vạn Tiên Các khi chưa đủ điều kiện (thay vì báo khóa),
  (b) Cài đặt. Hiển thị QR chuyển khoản: `<img src="assets/qr-donate.png">`
  (file do Producer sinh sau khi Bui cung cấp thông tin ngân hàng) —
  `onerror` hiện khung chờ + text `t('donate_qr_wait')`.
- Nội dung: `t('donate_desc')` — "Quét mã để donate cho nhà phát triển —
  donate thành công được mở khóa Vạn Tiên Các ngay, không cần đợi Luyện Khí tầng 12."
- Bản offline: nút `t('donate_done_btn')` ("Tôi đã chuyển khoản") →
  `state.flags.da_donate = true`, save, toast, mở khóa shop ngay
  (điều kiện mở: `vanTienCacUnlocked(state)` trong state.js).
- Chuẩn bị online: gọi `Online.submitDonate(ma_giao_dich)` (milestone 1 log +
  toast `t('donate_pending')` "Đã ghi nhận, chờ duyệt").

## Quy tắc code
- Không lỗi `node --check` từng file JS.
- Không dùng `fetch`, không framework, không ES module.
- Mọi text qua `t()`. Mọi số liệu game đọc từ stages.js/data.js.
