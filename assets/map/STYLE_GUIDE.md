# STYLE GUIDE — Map & Object (chibi pixel cổ trang Trung Quốc)

Mẫu chuẩn: `~/workspace/game-tu-tien/ref-combat/panel-nhanvat-tutien2d.jpg`
(chibi đầu to thân nhỏ, pixel sắc nét, Hán phục, tóc đen dài, mặt đơn giản).

## 1. Nguyên tắc đồng bộ

- TẤT CẢ object/nhà/tile vẽ cùng style chibi pixel cổ trang, nền trong suốt (PNG).
- Nhà dân + lối đi + vật phụ: DÙNG CHUNG bộ neutral cho mọi map.
  CẤM vẽ nhà kiểu khác nhau mỗi map.
- Bản sắc map thể hiện qua: tile nền + màu palette + công trình tông môn + bg art.
- Mỗi tông phái có 2 công trình ĐẶC TRƯNG riêng (bản sắc tông), đặt ở map tông đó.

## 2. Bộ object dùng chung (`assets/map/`)

| Nhóm | File | Dùng ở đâu |
|---|---|---|
| Nhà | `obj_nha_go.png`, `obj_nha_go2.png`, `obj_nha_ngoi.png`, `obj_lau_cac.png`, `obj_leu.png` | Trấn, làng, map trung lập |
| Lối đi (seamless 256) | `tile_duong_dat.png`, `tile_duong_da.png`, `tile_cau_go.png`, `tile_bac_thang_da.png` | Lát đường |
| Lối đi phối cảnh | `tile_path_thang.png`, `tile_path_cong_trai.png`, `tile_path_cong_phai.png` (512) | Đường uốn lượn có chiều sâu — XẾP CHỒNG DỌC, rộng ở dưới hẹp ở trên |
| Bậc thang tầng | `tile_bac_thang_tang.png` (512) | Dốc lên xuống có tầng rõ |
| Vật phụ | `obj_hang_rao_go.png`, `obj_cong_lang.png`, `obj_gieng.png`, `obj_den_da.png`, `obj_cau_da.png` | Trang trí |
| Cầu có độ cao | `obj_cau_go_cao.png`, `obj_cau_da_cao.png` | Xem mục 5 |

## 3. Công trình tông môn (`assets/map/obj_<tong>_*.png`)

- Kiếm Tông: `obj_kiem_tong_kiem_cac.png`, `obj_kiem_tong_kiem_thap.png`
- Thiên Pháp Tông: `obj_thien_phap_tong_phap_thap.png`, `obj_thien_phap_tong_quan_tinh_dai.png`
- Kim Cang Tông: `obj_kim_cang_tong_chua.png`, `obj_kim_cang_tong_bao_thap.png`
- Dược Vương Tông: `obj_duoc_vuong_tong_dan_phong.png`, `obj_duoc_vuong_tong_vuon_thuoc.png`
- Ngự Thú Tông: `obj_ngu_thu_tong_chuong_thu.png`, `obj_ngu_thu_tong_dau_thu_truong.png`
- Cửu U Ma Tông: `obj_cuu_u_ma_tong_ma_dien.png` (+ huyết trì: CHƯA VẼ — công cụ từ chối)

## 4. Palette từng map

| Map | Nền đất | Bg art | Tông màu |
|---|---|---|---|
| Thanh Vân Trấn | `tile_thanh_van_tran.webp` (giữ) | `map_thanh_van_tran.webp` | Xanh lá + nâu gỗ, yên bình |
| Hắc Phong Lâm | `tile_ground_forest.png` | `map_hac_phong_lam.webp` | Xanh đen âm u |
| U Minh Cốc | `tile_ground_nether.png` | `map_u_minh_coc.webp` | Tím đen quỷ dị |
| Linh Điền | `tile_ground_farm.png` | `map_linh_dien.webp` | Nâu đất + xanh non |
| Mỏ Linh Thạch | `tile_ground_mine.png` | `map_mo_linh_thach.webp` | Xám đá + tinh thể xanh |
| 6 map tông môn | `tile_ground_sect.png` | `map_<tong>.webp` | Sân đá xám + màu tông |
| Cửu U Ma Tông | `tile_ground_blood.png` | `map_cuu_u_ma_tong.webp` | Đen + tím ma khí |
| Huyết Ma Vực | `tile_ground_blood.png` | `map_huyet_ma_vuc.webp` (giữ cũ) | Đỏ đen |
| Thái Hư / Thông Thiên | `tile_ground_celestial.png` | `map_thai_hu_tien_canh.webp` | Trắng vàng tiên khí |

## 5. Cầu có độ cao (3D)

Object cầu trong `data/maps/mapN.json`:
```json
{"x": 800, "y": 600, "sprite": "assets/map/obj_cau_go_cao.png",
 "w": 300, "h": 140, "solid": false,
 "bridge": true, "lift": 34, "deckW": 280, "deckH": 60}
```
- `solid: false` — nhân vật đi được lên cầu.
- `lift`: độ cao mặt cầu (px). Nhân vật trong deck zone được nâng sprite,
  y-sort theo mặt cầu, bóng đổ nhỏ lại trên mặt cầu (engine.js `_bridgeLiftAt`).
- `deckW/deckH`: vùng mặt cầu (mặc định = w / 40).
- Cầu vòm 3 nhịp: đặt giữa 2 bờ, deck zone phủ hết mặt cầu.

## 6. Quy tắc đặt object

- Object solid (nhà, cây): `y` = chân vật; engine y-sort theo chân.
- Không đặt object đè lên cổng (gates) và điểm spawn quái.
- Nhà quay mặt về đường chính (hướng nam).
- Đèn đá/đèn lồng đặt dọc lối đi, cách nhau 200-300px.
- Mỗi map tối đa ~40 object để nhẹ máy.

## 7. Ảnh loading

`assets/maps/loading_<N>.webp` render từ bg art mới của map
(960x540 crop giữa). Bảng ánh xạ trong `js/mapload.js` → `BG_BY_NAMEKEY`.
Map mới có ảnh: thêm 1 dòng + file vào `assets/maps/`.
