# Tu Tiên Online v2 — Interface Contract (BẮT BUỘC tuân thủ)
# Milestone 1: bản OFFLINE chơi thử đầy đủ (online/Supabase dời sang milestone 2)

Thư mục: `~/workspace/game-tu-tien/v2/`. HTML/CSS/JS thuần, không framework, mobile-first.

## Thứ tự load script trong index.html
```
js/lang.js → js/stages.js → js/data.js → js/state.js → js/bodycult.js → js/lifespan.js → js/tower.js → js/social.js →
js/online.js → js/audio.js → js/engine.js → ... → js/ui.js → boot
```
Mọi file dùng `var`/function global (không dùng `import`/`export` ES6) để chạy
trực tiếp từ file://. Cuối file thêm block `module.exports` CHỈ cho các hàm
thuần logic (để smoke test chạy được bằng node) — bọc trong
`if (typeof module !== "undefined" && module.exports)`.

## js/mapload.js (Kỹ sư UI) — màn hình chờ khi vào map
- Mỗi map có màn hình chờ RIÊNG: `MapLoading.show(mapDef, onDone)` —
  full-screen ảnh nền của map + tên map kiểu thư pháp + thanh tiến trình
  % THẬT (phase 1: fetch `data/maps/map{id+1}.json`; phase 2: preload ảnh
  nền + sprite quái/boss của map, % theo từng ảnh xong) + mẹo chơi
  (`loadtip_1..8`) xoay vòng mỗi 3.2s.
- Ảnh theo map: `mapDef.loadingBg` (data-driven, vd
  `"assets/maps/map_thanh_van_tran.webp"`) → bảng `BG_BY_NAMEKEY`
  (key = nameKey) → `DEFAULT_BG` (`assets/ui/ui_loading.webp`, ảnh chờ cũ).
  Map chưa có ảnh riêng tự dùng ảnh mặc định.
- Hiệu ứng: ảnh zoom chậm (scale 1→1.12) + fade in/out, tên map font thư
  pháp; hiện tối thiểu 1.4s, failsafe 12s; thiếu ảnh → fallback êm.
- ui.js gọi ở 3 chỗ: `Engine.onGate` (đi cổng — xong loading mới
  `Engine.enterMap(to)`), `doMapGo` (dịch chuyển từ panel bản đồ),
  `startGame` (vào game lần đầu).
- Thêm map mới có ảnh chờ: 1 file vào `assets/maps/` + 1 dòng
  `BG_BY_NAMEKEY` (hoặc `loadingBg` trong def) + key tên map trong lang.js —
  không sửa code.
- Thuần logic `bgFor/preloadList` node-safe (guard DOM); cuối file có
  block `module.exports` cho smoke test.

## js/gamepad.js — Hỗ trợ tay cầm (Gamepad API)
- Module `GamepadInput`: tự nhận tay cầm qua `gamepadconnected` (toast
  "Đã kết nối tay cầm: <tên>"), poll mỗi frame bằng rAF, edge detection
  cho nút bấm.
- Di chuyển: cần trái (axes 0/1) analog 360° + D-pad (12–15), deadzone
  0.15, chuẩn hóa mượt. Vector đọc qua `GamepadInput.moveVec()` — engine
  (`_inputVec`) CỘNG DỒN vào joystick ảo/phím rồi chuẩn hóa max 1 → không
  xung đột.
- Map mặc định (chuẩn W3C): A(0)=đánh thường, X(2)/Y(3)/B(1)=skill 1-3,
  LB(4)/RB(5)=chuyển trang skill (3 trang × 3 ô), RT(7)=lướt, LT(6)=tương
  tác, Start(9)=menu, Select(8)=túi.
- Cài đặt (tab Cài đặt trong panel nhân vật): bật/tắt, trạng thái (tên tay
  cầm / chưa kết nối + gợi ý), test rung (`vibrationActuator`, báo nếu tay
  cầm không hỗ trợ), **tùy chỉnh map phím** (bấm "Đổi phím" → bấm nút trên
  tay cầm để gán, có Hủy), nút về mặc định. Lưu vào
  `state.settings.gamepad={enabled,map}` (migrate save cũ).
- `GamepadInput.onChange(evt)` — ui.js gán để tự refresh panel khi
  cắm/rút/gán phím xong. Pin tay cầm: Gamepad API không cung cấp → không
  hiển thị (đúng thực tế trình duyệt).
- Node-safe: logic thuần (`axesVec`, `defaultMap`, `isValidMap`, `btnName`)
  export cho smoke test; mọi chạm `navigator`/DOM đều có guard.
- Thêm action mới: thêm tên vào `ACTIONS` + case trong `_fire()` + key
  `gp_<tên>` trong lang.js — không sửa code khác.

## js/engine.js — Tile-map kiểu tutien2d (Kỹ sư Engine)
- Map có `ground` (vd `"assets/map/tile_thanh_van_tran.webp"`, tile seamless
  256x256) → nền vẽ bằng **tile lát lặp lại khóa theo camera** (không dán ảnh
  tĩnh); đường viền tile mờ như video. Map không có `ground` giữ cách vẽ cũ
  (art parallax full).
- `mapDef.bg` (art đẹp) trong chế độ tile làm **lớp atmosphere parallax 0.3x,
  alpha 0.20** phía trên tile + sương mù + vignette.
- `mapDef.objects`: mảng vật thể `{x, y, sprite, w, h, solid, sw, sh}` —
  `x,y` là chân vật (điểm y-sort), `sw/sh` là hộp va chạm (mặc định 46x30).
  Vẽ y-sort cùng quái/NPC/player, có bóng đổ. `solid:true` (mặc định) chặn
  di chuyển: player trượt dọc vật (thử cả 2 trục → từng trục).
- **Lưới tọa độ ngầm**: world 1600x1200 chia ô 400x400 → 12 khu, đánh số
  1..12 từ trái-sang-phải, trên-xuống. `Engine.khu()` → khu của player,
  `Engine.khuOf(x, y)` → khu của tọa độ, `Engine.hitSolid(x, y)` →
  bool va chạm, `Engine.getObjects()` → mảng vật thể. Nhãn "Khu N" hiện
  góc trên-phải canvas.
- Thêm map tile mới: 1 file tile seamless vào `assets/map/` + `ground` và
  `objects` trong `data/maps/mapN.json` — không sửa code.

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
- `MONSTERS`: `{id: {nameKey, hp, atk, def, exp, img, fb (màu fallback), loai: 'thu'|'ma'|'tien',
  boss?, drops:[{id,rate,min,max}]}}`
  Cần có: `da_tru`, `son_ke`, `da_tru_vuong`(boss), `phong_lang`, `hu_thi`,
  `lang_vuong`(boss), `u_hon`, `thi_ma`, `cot_tuong`(boss),
  `ma_binh`, `oan_linh`, `ma_lang`, `huyet_ma_vuong`(boss, Huyết Ma Vực),
  `ngoc_tho`, `thien_hac`, `thien_tuong`(boss, Thái Hư Tiên Cảnh).
- `MAPS`: `[{id, nameKey, bg (ảnh), fb, monsters:[ids], boss: id, npcs:[ids],
  gates:[{to, x, y}], stoneDrop:[min,max], unlock: null|{realm,tier},
  dao?: 'ma'|'chinh'}]` — 6 map (0–5).
  Map có `dao`: người chơi trái đạo vào được nhưng bị aura **-30% công/thủ**
  (`state.mapAura`), hiển thị cảnh báo trong `renderMap()`/`doMapGo()`.
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
- `Combat.rollDrops(monDef, isElite)` → `[{id, qty}]` theo `drops` + tỉ lệ
  (`eliteRate` trên từng drop: tỉ lệ khi quái tinh anh, vd bí tịch boss 8% → 15%)
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

## Hệ thống NPC từng map + chuyển động 3D (Bui chốt)
Data chuẩn: `data/npcs.json` (browser, qua DataLoader) — `js/data.js` (const NPCS,
const MAPS) là bản đồng bộ cho node smoke test; sửa JSON rồi chạy
`/tmp/sync_datajs.py` để đồng bộ (KHÔNG sửa tay data.js).
- NPC def: `{nameKey, mapId, x, y, kind, img, stock?, shopTitle?, sect?, unlock?,
  wander?}` — `wander`: bán kính px đi tuần (không có = đứng yên).
- kind: quest|shop|market|sect|gacha|guide|forge|sect_emissary|inn|pet|
  dungeon_guide|farm|alliance|greet (flavor: đệ tử, ẩn sĩ, cô hồn...).
- Map mới: thêm `data/maps/mapN.json` (id = N-1), KHÔNG sửa code. Map có thêm
  trường `dao`: "chinh"|"ma" (vào map trái đạo bị aura bài xích).
- 13 map: 0 Thanh Vân Trấn, 1 Hắc Phong Lâm, 2 U Minh Cốc, 3 Linh Điền,
  4 Mỏ Linh Thạch, 5–10 sáu tông môn, 11 Huyết Ma Vực, 12 Thái Hư Tiên Cảnh.
- Runtime (engine.js): NPC đi tuần arrive mượt (tăng/giảm tốc, không giật);
  nghiêng người theo vận tốc (lean), bóng đổ lệch ngược hướng nghiêng,
  to/nhỏ theo chiều sâu, Y-sort chuẩn; quay mặt về người chơi khi lại gần +
  cúi chào (10s/lần); idle thở (scaleY) + đầu khẽ quay.
- Animation nghề: `forge` đập búa (tia lửa _burst), `inn` lau bàn (khăn),
  đang thoại (`Engine.talkNpcId`, ui.js set/clear) hiện 💬 + gật gù.
- NPC không chặn đường (đi xuyên được); quái spawn tránh NPC/cổng
  (`_randPosClear`, clear 110px).

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

## Linh thú: 30 loài + kiểu di chuyển (Kỹ sư Gameplay)
- `PET_SPECIES` trong js/pet.js: 30 loài (6/phẩm Phàm→Thiên), mỗi loài có
  `{vi, en, tier, element, movement, img, skill:{vi,en,effect_sheet,effect_mau}}`.
- `movement`: `fly` (bay lượn trên đầu, vỗ cánh) | `run` (chạy ngang vai,
  nhấp nhô) | `crawl` (bò/trườn hơi sau, uốn mình). Engine đọc qua
  `Pet.petMovement(pet)`; tốc độ theo kịp mọi trạng thái (`_speed()*1.15`).
- Sprite: `assets/sprs/pet_<id>.webp` (nền trong suốt, pixel art).
- Thêm loài mới: 1 entry `PET_SPECIES` + 1 file sprite — không sửa code.
- Save cũ (pet chưa có `speciesId`): `petSpeciesOf()` tự map loài mặc định theo phẩm.

## Pseudo-3D khi di chuyển (Kỹ sư Engine)
- Y-sort: quái/NPC/pet/người chơi xếp theo `y` (dưới đè lên trên).
- `_drawCreature()`: bóng đổ dưới chân (bay cao → mờ/nhỏ), scale to/nhỏ theo
  chiều sâu (y lớn = gần người xem). Thân người LUÔN đứng thẳng — cấm
  rotate sprite khi di chuyển (auto-tilt theo vận tốc đã bỏ).
- Nền parallax: lớp xa trôi 0.3x camera + sương mù trôi + vignette.

## Quay mặt theo hướng di chuyển (Kỹ sư Engine) — chuẩn demo-joystick.html
- Mọi entity (nhân vật, linh thú, quái, boss) có `ang` (radian, `atan2(dy,dx)`),
  nội suy mượt đường ngắn nhất qua `_angLerp(a, b, t)`. Tốc độ xoay:
  nhân vật `dt*10`, linh thú `dt*8`, quái `dt*6`, boss `dt*4` (nặng nề).
- `_face4(o, ang)`: chọn 1 trong 4 hướng up/down/left/right, có hysteresis
  (đổi khi góc vào sâu >0.65 rad khỏi ranh giới) — chống giật.
- `_drawCreature(..., { faceAng })`: chỉ lật ngang khi `cos(faceAng) < 0`
  (đi sang trái); KHÔNG rotate — thân luôn đứng thẳng như người thật.
- Linh thú dùng sprite 4 hướng `pet_<id>_up/_down/_right.png`
  (`_petDirSrc()`; trái = `_right` lật; fallback ảnh gốc khi đang tải/thiếu
  file). Nhân vật/quái/boss chưa có sprite 4 hướng → dùng sprite gốc + lật.
- Nguồn di chuyển nào cũng quay mặt đúng (đều qua `_moveBy`): joystick ảo,
  phím WASD/mũi tên, tay cầm (GamepadInput), tap-to-move, auto dí quái, lướt.
- Test hook: `Engine._faceTest = { angLerp, face4 }` (chỉ dùng trong test).

## Bạn bè + nhắn tin + ID nhân vật (social.js — THUẦN LOGIC, không DOM)
- `CHARID_ALPHABET` + `genCharId()` + `isValidCharId()` trong state.js:
  ID dạng `TT-XXXXXX` (6 ký tự, loại 0/O, 1/I, L). Sinh khi tạo nhân vật,
  lưu `char.charId`, KHÔNG đổi suốt đời. Save cũ tự sinh khi load lần đầu
  (`migrateState` + `Social.ensureCharId`). Chống trùng: registry
  localStorage `ttonline_v2_charids`; bản online unique constraint
  `profiles.char_id` (supabase-schema.sql).
- `Social`: registry ID, `shortId()` ("TT-8X4K2N" → "…4K2N"),
  `BANNED_WORDS` + `containsBanned()` + `censor()` (che ***),
  `checkPlayerName()` (2-12 ký tự, không từ cấm).
- Đổi tên (`the_doi_ten`, mua ở Tầm Tiên Bảo): `canRename()` — lần đầu FREE,
  các lần sau mỗi 15 ngày (kể cả có thẻ); `doRename()` trừ thẻ, lưu tên cũ
  vào `char.nameHistory` (tối đa 20). ID không đổi.
- Đổi giới tính (`the_doi_gioi_tinh`): `doGenderChange()` — có thẻ là đổi,
  không giới hạn 15 ngày; `xungHoKey(gender, formal)` → key `xung_huynh`/
  `xung_muoi`/`xung_cong_tu`/`xung_co_nuong`; NPC dùng placeholder `{xh}`
  trong line (renderNpc thay qua `t(ln, {xh})`).
- Kết bạn: `SAMPLE_PLAYERS` (8 bạn mẫu demo offline), `searchPlayers(q)`
  (theo tên hoặc ID, trừ chính mình), `sendRequest/cancelRequest/
  acceptRequest/declineRequest/removeFriend/getFriend/pendingInCount`.
  Bạn mẫu tự chấp nhận lời mời sau vài giây (giả lập realtime).
- Chat 1-1: `sendMessage()` (chặn spam 5s, che từ cấm, lưu `name` lúc gửi —
  tin cũ giữ tên cũ), `getThread/markRead/totalUnread`, `mockTick()`
  (bạn mẫu trả lời + lời mời đến ngẫu nhiên + đảo online).
- Chat thế giới: `sendWorld/getWorld/mockWorldTick` (tối đa 50 tin).
- State: `char.gender` ('nam'|'nu'), `char.nameHistory`, `char.lastRenameAt`,
  `char.renameFreeUsed`, `state.social` = `{friends, requestsIn, requestsOut,
  threads, world, unread, lastMsgAt}` (xem `defaultSocialState()`).
- `Online.socialOnline` (stub, `enabled:false`): `searchPlayers,
  sendFriendRequest, acceptFriendRequest, declineFriendRequest, removeFriend,
  listFriends, sendMessage, fetchThread, renameOnline` — milestone 2 cắm
  Supabase thật theo `supabase-schema.sql` (RLS: chỉ đọc/ghi hàng của mình).
- ui.js: panels `friends` (3 tab: bạn bè/lời mời/thế giới), `chat`,
  `rename`, `gender`; nút 💬 trên HUD + badge đỏ (`updateChatBadge`,
  `socialTick` mỗi ~5s, sfx `message`); nút Bạn bè ở menu chính + panel
  nhân vật; panel nhân vật hiện ID + nút copy + giới tính + lịch sử tên;
  dùng thẻ từ túi → mở panel đổi tên/giới tính.
- lang.js: mọi chuỗi qua `t()` — key nhóm `fr_*`, `chat_*`, `world_*`,
  `msg_*`, `rename_*`, `gender_*`, `it_the_doi_ten(_desc)`,
  `it_the_doi_gioi_tinh(_desc)`, `xung_*` (đủ cả vi + en).

## js/sectquest.js — Nhiệm vụ tông môn (Kỹ sư Hệ thống viết, THUẦN LOGIC)
- Data: `data/quests_sect.json` (canonical) + mirror trong `data.js`
  (`SECT_QUESTS`, `SECT_QUEST_CUNGCO`, `SECT_QUEST_DAILY`,
  `SECT_QUEST_WEEKLY`); dataloader.js tải `quests_sect` → globals cùng tên.
- Mỗi tông 12 nhiệm vụ chuỗi (`sq_<sid>_01..12`): Ngoại Môn(3) → Nội Môn(3)
  → Hộ Pháp(3) → Trưởng Lão(3). Quest cuối mỗi giai đoạn là TRIAL
  (`need.type:"trial"`, quick-battle như tâm ma): vượt qua mới thăng chức.
- Quy tắc Bui chốt:
  + Lên Luyện Khí tầng 5 mới nhập Nội Môn (trial q03, `minRealm:[1,5]`).
  + Trial q06/q09/q12 (`gatesBreakthrough: 2/3/4`) KHÓA đột phá Trúc Cơ/
    Kim Đan/Nguyên Anh — xem `SectQuest.breakthroughGate(state)`.
  + Lễ thăng cấp: `turnIn` trả `ceremony:{rank,titleKey,eventKey,fx}` —
    ui.js hiện overlay `showSectCeremony` + flash màu riêng từng tông.
  + Đột phá thất bại → `onBreakthroughFail` → nhiệm vụ `sq_<sid>_cungco`
    (Củng Cố Căn Cơ, 5 Trúc Cơ Thảo) → `btBonus` +10%/lần (tối đa +30%),
    cộng vào tỉ lệ đột phá ở `finishBreakthrough`.
  + Rời/đổi tông: `SectQuest.onLeaveSect` (gọi từ `switchSect` trong sect.js)
    hủy quest active, reset rank về Ngoại Môn.
- Chức vụ: `state.sectInfo.rank` ('ngoai_mon'|...), `titles:[{rank,nameKey,at}]`
  (danh hiệu, gồm grand title q12: Kiếm Thánh/Thiên Pháp Chân Quân/...).
- Nhiệm vụ ngày (reset 0h, `sqd_<sid>_*`) / tuần (reset thứ 2, `sqw_<sid>_*`):
  `dailyList/claimDaily/weeklyList/claimWeekly`; tiến trình qua
  `SectQuest.onKill` (hook trong `Engine.onKill` ở ui.js) và
  `SectQuest.onDonate` (gọi từ `donateStones` trong sect.js).
- State: `state.sectQuests[id]={status,count,trialPass?}`;
  `sectInfo:{rank,titles,btFail,cungCoDone,btBonus,sqDaily,sqWeekly}`.
- `need.type`: talk | kill {monster,count} | killboss {monster?,count} |
  item {item,count} | stones {count} | trial {boss:{nameKey,hp,atk,def}}.
  `target`: {kind:'npc',id} | {kind:'map',map} — nút "Tự tìm đường"
  (`sect-quest-nav`) gọi `Engine.enterMap` + `Engine.navigateTo(x,y)` (mới).
- ui.js: tab thứ 4 `sect` trong panel nhiệm vụ (`renderSectQuests`;
  chain + củng cố + ngày + tuần); actions `sect-quest-accept/turnin/nav`,
  `sect-trial-start` (quick-battle 800ms/tick, `sectTrialTick`),
  `sect-daily-claim`, `sect-weekly-claim`, `sect-cungco-accept/turnin`,
  `sect-open`, `bt-gate-go`; panel tông môn hiện chức vụ + điều kiện Nội Môn
  + danh hiệu. CSS: `.sect-ceremony`, `.sect-flash-label`.
- Thử thách theo tông (eventKey/fx riêng): Kiếm Tâm Vấn Đạo/Lôi Kiếp,
  Vạn Kiếm Quy Tông, Kiếm Đạo Thông Thiên; Cửu Thiên Lôi Ngục; Kim Cương
  Luyện Thể; Đan Hỏa Tẩy Tủy; Vạn Thú Triều Bái; Nhập Ma Luyện Hồn...
- lang.js: key `sq_*` (245 keys, đủ vi+en, sinh tự động — chạy
  `/tmp/gen_sectquests_part*.py` để tái sinh, KHÔNG sửa tay).

## js/lifespan.js — Thọ Nguyên theo cảnh giới (Kỹ sư Gameplay, THUẦN LOGIC, không DOM)
- Data: `data/lifespan.json` (canonical) + mirror `LIFESPAN_DEF` trong
  `js/lifespan.js` (chạy file:// + node); test kiểm tra 2 nơi đồng bộ.
- Năm CỘNG khi đạt cảnh giới `yearsPerRealm` = [100, 100, 300, 800, 2000,
  5000, 10000, 20000] (index = realm 0..7: Phàm Nhân→Độ Kiếp).
- 1 ngày thực = 1 năm: `tick(state, nowMs)` trừ theo `tnLastTick`,
  trả `{days, died, dripExp}`; thiên phú Trường Sinh Thể trôi chậm 20%.
- Đột phá thành công: `onBreakthrough(state)` cộng năm cảnh giới mới
  (móc trong `finishBreakthrough`, ui.js, kèm toast `tn_bt_bonus`).
- Thọ Nguyên Đan (dùng từ túi, `d.tnYears` trong `doBagUse`):
  `dan_tho_tieu` +10, `dan_dien_tho` +50, `dan_truong_sinh` +200;
  hưởng buff Dược Vương Tông + thiên phú Đan Thánh (+20%).
  Đại Phu bán tiểu/diên thọ; Thương Nhân bán cả 3.
- Bí tịch Trường Sinh Quyết (`manual_truong_sinh`, passive Địa, max 5):
  mỗi cấp học/lên cấp +30 năm trực tiếp qua `Lifespan.addYears`
  (hook `_grantTruongSinhYears` trong `_obtain` + `upgradeManual`,
  js/skills.js; passive id `truong_sinh_quyet` trong PASSIVE_DEFS).
  Bán ở Tàng Kinh Các mọi tông (400 điểm cống hiến, js/sect.js).
- Pháp bảo Ngọc Bội Trường Sinh (`ngoc_boi_truong_sinh`, slot `phapbao`):
  đang đeo giảm 15% tốc độ trừ thọ (`tnDrainRed: 0.15`,
  `Lifespan.equipDrainRed` cộng vào `talentDrainPct`).
- Cảnh báo: `isLow` (< 10 năm) → chữ đỏ + toast 1 lần/phiên + Đại Phu
  nhắc (`npc_tn_warn_dai_phu` unshift vào dialog).
- Về 0 → tọa hóa: panel `death` (KHÔNG cho đóng khi còn chết —
  guard trong `closePanel`): chuyển thế (`tn-rebirth`) hoặc Trường Sinh
  Đan hồi sinh khẩn (`tn-revive`, cần `dan_truong_sinh` trong túi).
- Chuyển thế `rebirth(state)`: reset về Phàm Nhân, giữ 30% tu vi vào
  `tnReserve` (mỗi ngày chuyển 5% thành exp qua `dripExp` → `gainExp`),
  +1 thiên phú ngẫu nhiên không trùng (6 loại: +exp, +HP, +đan, +đột phá,
  -drain, hỗn hợp); lịch sử `tnHistory` hiện ở tab trang bị + panel death.
- Thiên phú móc vào: `gainExp` (state.js, +%exp), `getStats`
  (`Lifespan.applyStats`, +%HP), `finishBreakthrough` (+%đột phá).
- State: `thoNguyen`, `tnLastTick`, `tnRebirths`, `tnTalents`,
  `tnHistory`, `tnReserve` (defaultState + migrateState; save cũ
  `thoNguyen=null` → `ensure` tính gộp theo cảnh giới hiện tại).
- UI (ui.js): dải `.tn-strip` trên mọi tab panel nhân vật (số năm + thanh,
  đỏ khi thấp); chi tiết thiên phú/lịch sử ở tab trang bị; CSS `.tn-*`.

## js/bodycult.js — Căn Cốt + Thần Thức (Kỹ sư Gameplay, THUẦN LOGIC, không DOM)
- Data: `data/bodycult.json` (canonical) + mirror `BODYCULT_DEF` trong
  `js/bodycult.js` (chạy file:// + node); test kiểm tra 2 nơi đồng bộ.
- Mỗi loại 100 cấp, band 20 cấp → phẩm đan: 0-19 hạ (Luyện Khí), 20-39
  trung (Trúc Cơ), 40-59 thượng (Kim Đan), 60-79 cực (Nguyên Anh),
  80-99 tiên (Hóa Thần+). `pillFor(type, lv)` → `ttd_<grade>`/`dtd_<grade>`;
  KHÔNG dùng đan sai phẩm (`doUpgrade` trả `no_pill`).
- Chi phí Linh Thạch: `stoneCost(lv) = round(45 * 1.06^lv)` (lv0: 45,
  lv99: ~14400) — tăng đều, không đột biến; nâng thuần đá tốn x3.
- Cách nâng: Căn Cốt = đan (`pill`) | đá x3 (`stones`) | tắm thuốc (`bath`,
  thảo dược theo band + đá) | luyện yêu đan (`doRefine`) | nv ngày;
  Thần Thức = đan | đá x3 | thiền định (180s, miễn phí, +1 cấp).
- Luyện hóa Yêu Đan: `yaodanInfo(id)` → {tier 1-5, elem}; `lvGain` =
  [1,2,4,7,12]; `failRate` = [0,.1,.2,.35,.5]; thất bại → mất yêu đan,
  GIỮ linh thạch; `ho_mach_dan` (Hộ Mạch Đan) → chắc chắn thành công.
  Yêu đan hệ (hoa/lôi/băng/phong/thổ) → buff nhỏ đúng hệ, cộng dồn tối
  đa 20 (hỏa +công, lôi +bạo kích, băng +giáp, phong +tầm đánh, thổ +HP).
- Mốc mỗi 10 cấp: `milestones` + `titleKey` (`bc_ms_cc*`/`bc_ms_tt*`,
  Đồng Bì→Kim Cương Bất Hoại, Nội Thị→Nhất Niệm Vạn Lý); danh hiệu lưu
  ở `state.bcTitles`; ui.js hiện flash `showBcMilestone`.
- Bonus: Căn Cốt `cancotBonus` → {hpPct, defFlat, btBonus} (+mốc);
  Thần Thức `thanthucBonus` → {rangePct, critPct, petSlots 1-5, resistPct}.
  `applyStats(s, state)` móc vào `getStats` (ui.js); `btBonus` cộng vào
  tỉ lệ đột phá ở `finishBreakthrough`; crit cộng ở `_rollCrit`
  (engine.js); tầm đánh qua `_atkRange()`; kháng hiệu ứng giảm sát
  thương kỹ năng boss + đòn tinh anh (`_applyResist`); petSlots →
  pet mạnh hơn (pet.js `petStats`, +8%/slot).
- Quái tinh anh: `BodyCult.eliteRoll()` ~5% ở `_spawnMon` (engine.js,
  không áp cho boss); `m.elite`: HP x2.5, công x2.2, giáp x1.5, to hơn
  30%, hào quang vàng + tên vàng "★ Tinh Anh"; rớt yêu đan 50%
  (`yaodanTierFor(mapId, isBoss)` = 1+floor(map/3), boss +1, max 5),
  35% ra bản hệ; đồ rớt roll 2 lần, đá x2, exp x3; `ev.elite` truyền qua
  `Engine.onKill` → `Combat.rollDrops(def, isElite)` (tương thích
  `eliteRate` của Bí tịch BOSS).
- State: `cancotLv`, `thanthucLv`, `meditateUntil`, `yaodanElem`,
  `bcDaily`, `bcTitles` (defaultState + migrateState, save cũ giữ nguyên).
- UI (ui.js): tab thứ 7 `cult` "Tu Luyện" trong panel nhân vật
  (`renderCultTab`): 2 thanh tiến trình + mốc + bonus + 3 cách nâng
  (hiện có/cần, thiếu đỏ `.bc-lack`); nv luyện thể ngày (đánh 50 quái
  → +2 Căn Cốt; thiền → +1 Thần Thức); panel `refine` "Luyện Yêu Đan"
  mở từ Lão Rèn (`npc_refine_yaodan`, opact `refine`); CSS `.bc-*`.
- Vật phẩm mới (data/items.json + js/data.js, kind/icon/giá):
  `ttd_ha/trung/thuong/cuc/tien`, `dtd_ha/trung/thuong/cuc/tien`,
  `ho_mach_dan`, `yaodan2..5`, `yaodan{t}_{hoa,loi,bang,phong,tho}`
  (t=1..5); Đan Sư bán đủ 5 phẩm + Hộ Mạch Đan, Thương Nhân bán hạ phẩm.
- lang.js: key `bc_*` + `it_ttd_*`/`it_dtd_*`/`it_yaodan*`/`it_ho_mach_dan`
  (đủ vi+en). test-smoke.js: 19 test `bc:` (band, phẩm, giá, nâng cấp,
  mốc, refine, thiền, nv ngày, sync JSON, items, lang, migrate).

## Bí tịch BOSS (rớt từ boss) — Bui chốt 2026-10-18
- Mỗi boss có 1 bí tịch signature trong `drops`: `{id: "manual_boss_*", rate: 0.08, eliteRate: 0.15}`
  (thường 8%, quái tinh anh 15%).
- 7 bí tịch: Đá Trụ Vương → Man Hoang Chấn Địa (Địa) · Lang Vương → Lang Vương Khiếu Nguyệt (Địa) ·
  Cốt Tướng → Bạch Cốt Ma Trảo (Thiên) · U Minh Cự Mãng → Độc Vụ Cuồng Triều (Thiên) ·
  Hắc Long → Ma Long Phệ Hồn (Thiên) · Huyết Ma Vương → Huyết Ma Trảm (Địa, Ma Đạo) ·
  Thiên Tướng → Thiên Lôi Phá (Thiên).
- Item `kind: "manual"` + cờ `bossDrop: true`, `skillDef` nhúng sẵn (không cần sửa skills.js);
  học/lên cấp/bán theo luồng bí tịch thường (Địa max 7, Thiên max 10).
- Rớt → toast vàng đặc biệt `boss_manual_drop` ("⚜️ BÍ TỊCH BOSS: {name}!") qua `toast(msg, "gold")`
  + `.toast.gold` trong css.
- Thêm boss mới: 1 entry `MONSTERS` (data/monsters.json + js/data.js) + tên trong lang.js
  (`mon_<id>`) + 1 manual item + drop entry. Boss bay thêm `bay: true`.

## Thông Thiên Tháp + Sự kiện ngày — Bui chốt 2026-10-18
- Tháp 100 tầng: `data/tower.json` (canonical) + mirror `TOWER_DEF` trong
  `js/tower.js` (thuần logic, không DOM; test kiểm tra 2 nơi đồng bộ).
- Sức mạnh tầng f: `30 * 1.06^f`; tầng % 10 == 0 là boss (x1.5).
  Lực chiến người chơi: `atk*3 + def*2 + maxHp/8 + maxMp/16`.
- 3 lượt leo/ngày (reset 0h, `tower.dayKey`); thua dừng ở tầng cao nhất đã qua.
- Sự kiện theo ngày (getDay()): T2 Hỏa/Linh Thạch x2 · T3 Băng/đan x2 ·
  T4 boss tinh anh/đồ x2 · T5 exp x2 · T6 Yêu Đan x2 · T7 bí tịch x2 ·
  CN tất cả x1.5 + boss tháp đặc biệt (boss tầng x1.25).
- Rương mốc 10/25/50/75/100 (nhận 1 lần/mốc, `tower.chests`); BXH tuần top 10
  (`tower.runs`, reset theo tuần, giữ 20 lượt).
- State: `tower: {best, dayKey, triesLeft, weekKey, runs[], chests{}, history[]}`
  (ensure + migrate, save cũ giữ nguyên).
- NPC Thủ Tháp Nhân (`thu_thap_nhan`, kind `tower_guide`) ở Thanh Vân Trấn
  (mapId 0, x 780 y 300) → option opact `tower` → `openPanel("tower")`.
- UI (ui.js): panel `tower` (`renderTower`): sự kiện hôm nay, kỷ lục, lượt còn,
  hiệu ứng leo tầng (`animateTowerClimb`, 90ms/tầng), rương mốc, BXH tuần;
  CSS `.tw-*`. Tạm tắt nút khi hết lượt.
- lang.js: key `panel_tower`, `npc_thu_thap_nhan*`, `tw_*` (đủ vi+en).
- test-smoke.js: test `tw:` (sự kiện ngày, công thức tầng, tỉ lệ thắng,
  lượt/reset ngày, leo thắng-thua, rương mốc 1 lần, BXH tuần, sync JSON).
