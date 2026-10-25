// TILEMAP-OBJECTS — dữ liệu vật thể trang trí cho tilemap (build 100).
// CHƯA TÍCH HỢP ENGINE: file này chỉ là dữ liệu ghi chú, CHƯA được nạp
// trong index.html (tilemap.js hiện chỉ vẽ decor theo ký tự ô, không có
// trường object). Các object dưới đây ĐÃ được vẽ đè bằng sprite thật lên
// ảnh xem trước sinh động (previews/map-{1,2,3}-vivid.png) để đối chiếu
// với ảnh nền gốc. Tích hợp engine (vẽ object trong game) làm sau, cần
// sửa tilemap.js — ngoài phạm vi đợt này (cấm sửa engine.js/tilemap.js).
// Quy ước: col,row = ô neo góc trên-trái; w,h = số ô chiếm chỗ;
// sprite = file trong v2/assets/objects/. Object không đè lên ô cổng (G)
// và không chặn cổng; ô nền bên dưới vẫn giữ ký tự tile đã định.
// Global TILEMAP_OBJECTS, Node-safe, không require.
var TILEMAP_OBJECTS = {
  // Map 1 Hắc Phong Lâm — đối chiếu map_hac_phong_lam.webp:
  // rừng thông kín 3 phía, đình mái xanh trên-phải, 2 nhà gỗ,
  // suối/hồ phía đông, đèn đá dọc đường đá, cầu qua suối.
  1: [
    { col: 4, row: 3, w: 2, h: 2, sprite: "tree_ancient_wide.png" },
    { col: 9, row: 5, w: 1, h: 2, sprite: "tree_tall.png" },
    { col: 27, row: 2, w: 1, h: 2, sprite: "tree_tall.png" },
    { col: 34, row: 6, w: 1, h: 2, sprite: "tree_tall.png" },
    { col: 13, row: 4, w: 2, h: 2, sprite: "tree_round.png" },
    { col: 36, row: 12, w: 1, h: 2, sprite: "tree_windswept.png" },
    { col: 4, row: 24, w: 1, h: 1, sprite: "tree_jade_short.png" },
    { col: 23, row: 15, w: 1, h: 1, sprite: "bush_dense.png" },
    { col: 21, row: 18, w: 1, h: 1, sprite: "campfire_1.png" },
    { col: 22, row: 6, w: 3, h: 2, sprite: "dai_dien.png" },
    { col: 25, row: 15, w: 2, h: 2, sprite: "house_wood.png" },
    { col: 23, row: 23, w: 2, h: 2, sprite: "house_wood.png" },
    { col: 8, row: 9, w: 1, h: 1, sprite: "fence_lamp.png" },
    { col: 24, row: 10, w: 1, h: 1, sprite: "fence_lamp.png" },
    { col: 30, row: 9, w: 1, h: 1, sprite: "fence_lamp.png" },
    { col: 26, row: 20, w: 1, h: 1, sprite: "fence_lamp.png" },
    { col: 5, row: 12, w: 1, h: 1, sprite: "rock_big.png" },
    { col: 30, row: 26, w: 1, h: 1, sprite: "rock_big.png" },
    { col: 20, row: 2, w: 1, h: 1, sprite: "cau_treo.png" },
  ],
  // Map 2 U Minh Cốc — đối chiếu map_u_minh_coc.webp:
  // cầu thang đá giữa-trên, hồ u minh giữa-dưới, cầu đá qua hồ,
  // tàn tích bia đá có chữ phát sáng, đình nhỏ, cây khô vặn vẹo.
  2: [
    { col: 5, row: 4, w: 1, h: 2, sprite: "tree_windswept.png" },
    { col: 29, row: 4, w: 1, h: 2, sprite: "tree_windswept.png" },
    { col: 3, row: 7, w: 1, h: 2, sprite: "tree_windswept.png" },
    { col: 35, row: 11, w: 1, h: 2, sprite: "tree_windswept.png" },
    { col: 5, row: 11, w: 1, h: 1, sprite: "bia_thu_thach.png" },
    { col: 12, row: 15, w: 1, h: 1, sprite: "tablet_stone.png" },
    { col: 27, row: 16, w: 1, h: 1, sprite: "tablet_stone.png" },
    { col: 30, row: 18, w: 1, h: 1, sprite: "tablet_stone.png" },
    { col: 4, row: 20, w: 2, h: 2, sprite: "house_wood.png" },
    { col: 10, row: 24, w: 2, h: 2, sprite: "house_wood.png" },
    { col: 31, row: 22, w: 2, h: 2, sprite: "house_wood.png" },
    { col: 34, row: 19, w: 2, h: 2, sprite: "house_wood.png" },
    { col: 15, row: 18, w: 3, h: 1, sprite: "path_bridge.png" },
    { col: 21, row: 20, w: 3, h: 1, sprite: "path_bridge.png" },
    { col: 16, row: 10, w: 1, h: 1, sprite: "rock_big.png" },
    { col: 30, row: 21, w: 1, h: 1, sprite: "rock_big.png" },
    { col: 10, row: 10, w: 1, h: 1, sprite: "mushroom_glow.png" },
    { col: 28, row: 11, w: 1, h: 1, sprite: "mushroom_glow.png" },
    { col: 8, row: 14, w: 1, h: 1, sprite: "fence_lamp.png" },
    { col: 32, row: 21, w: 1, h: 1, sprite: "fence_lamp.png" },
  ],
  // Map 3 Linh Điền — đối chiếu map_linh_dien.webp:
  // ruộng có hàng rào + giếng giữa-ruộng, ao sen đông-nam có lau sậy,
  // cây tròn, bụi rậm, đá tảng, đường đất uốn từ góc trên-phải.
  3: [
    { col: 6, row: 4, w: 2, h: 2, sprite: "tree_round.png" },
    { col: 2, row: 11, w: 2, h: 2, sprite: "tree_round.png" },
    { col: 21, row: 13, w: 2, h: 2, sprite: "tree_round.png" },
    { col: 13, row: 14, w: 2, h: 2, sprite: "tree_round.png" },
    { col: 33, row: 5, w: 1, h: 1, sprite: "bush_dense.png" },
    { col: 36, row: 7, w: 1, h: 1, sprite: "bush_spread.png" },
    { col: 10, row: 23, w: 1, h: 1, sprite: "bush_dense.png" },
    { col: 4, row: 11, w: 3, h: 2, sprite: "crops_mixed.png" },
    { col: 10, row: 16, w: 2, h: 2, sprite: "crops_mixed.png" },
    { col: 8, row: 17, w: 2, h: 1, sprite: "well_stone.png" },
    { col: 4, row: 8, w: 4, h: 1, sprite: "fence_field.png" },
    { col: 9, row: 8, w: 4, h: 1, sprite: "fence_field.png" },
    { col: 4, row: 21, w: 4, h: 1, sprite: "fence_field.png" },
    { col: 9, row: 21, w: 4, h: 1, sprite: "fence_field.png" },
    { col: 6, row: 15, w: 1, h: 2, sprite: "scarecrow_field.png" },
    { col: 28, row: 19, w: 1, h: 1, sprite: "lotus_red.png" },
    { col: 31, row: 22, w: 1, h: 1, sprite: "lotus_red.png" },
    { col: 23, row: 16, w: 1, h: 1, sprite: "reed.png" },
    { col: 36, row: 16, w: 1, h: 1, sprite: "reed.png" },
    { col: 23, row: 24, w: 1, h: 1, sprite: "reed.png" },
    { col: 8, row: 25, w: 1, h: 1, sprite: "rock_big.png" },
    { col: 20, row: 26, w: 1, h: 1, sprite: "rock_big.png" },
  ],
};
if (typeof module !== 'undefined' && module.exports) { module.exports = TILEMAP_OBJECTS; }
