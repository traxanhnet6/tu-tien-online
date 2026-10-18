# Voiceover — Phân công giọng đọc

Phong cách: thuyết minh phim bộ Trung Quốc ngày xưa (giọng Việt trầm, diễn cảm).

## Giọng đã chọn (Vietnamese)

| Nhân vật | Voice ID | Tên | Đặc điểm |
|---|---|---|---|
| Người dẫn chuyện | `avocado_v2:vd2_r8_rep5k_3494_v068_28k_g5k` | Zealous Harbor | Nam, trầm, hùng hồn — giọng thuyết minh |
| Lão Dẫn Đường | `avocado_v2:vd2_smoky_teacup` | Questioning Satchel | Nam, tò mò — giọng ông già |
| Đại Phu | `avocado_v2:vd2_r8_rep5k_3491_v068_28k_g5k` | Kindhearted Jetty | Nam, tự tin — giọng điềm đạm |
| Kẻ phản diện / Tâm Ma | `avocado_v2:vd2_r8_rep5k_3497_v068_28k_g5k` | Tenacious Mooring | Nam, kiên quyết — giọng lạnh |

## File đã tạo (cốt truyện mở đầu)

- `assets/voice/story_open_1.mp3` — Người dẫn chuyện (đêm đen như mực...)
- `assets/voice/story_open_2.mp3` — Lão Dẫn Đường (tiểu hữu...)
- `assets/voice/story_open_3.mp3` — Lão Dẫn Đường (thiên địa linh khí...)
- `assets/voice/story_open_4.mp3` — Lão Dẫn Đường (Đại Phu...)
- `assets/voice/story_open_5.mp3` — Lão Dẫn Đường (nhớ kỹ...)

## Cách tạo thêm

```bash
/opt/hatch/bin/tts speak --output <path> --text-stdin --voice "<voice_id>" --language vi
# (truyền text qua stdin, không qua command line)
```

Lưu ý: thay `!` bằng `chấm than` trong text để TTS đọc đúng.

## Code

- `js/story.js`: mỗi segment có field `voice: "assets/voice/xxx.mp3"`, tự phát khi hiện đoạn
- `js/state.js`: `settings.voice` (default true)
- `js/ui.js`: toggle Cài đặt → `set-voice`, tắt thì dừng audio đang phát
- `js/lang.js`: `settings_voice` (vi/en)
