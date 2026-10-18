# Nhạc nền — Tu Tiên Online v2

4 file MP3 (tổng ~14MB), giấy phép **Pixabay Content License** (miễn phí,
không bắt buộc ghi nguồn).

| File | Dung lượng | Mô tả | Dùng khi |
|------|-----------|-------|----------|
| menu.mp3 | 3.1MB | Đàn tranh du dương | Màn hình menu chính |
| map.mp3 | 4.5MB | Ambient phiêu lưu | Farm map thường |
| boss.mp3 | 2.5MB | Trống trận | Gặp boss |
| breakthrough.mp3 | 4.0MB | Hoành tráng | Đột phá cảnh giới |

Code: `js/audio.js` → `AudioSys.playMusic('menu'|'map'|'boss'|'breakthrough')`
tải `assets/music/<name>.mp3`, phát lặp; autoplay trên mobile được unlock ở
lần chạm đầu tiên (`pointerdown`).
