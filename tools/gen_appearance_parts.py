#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Sinh biến thể part mặt (dau) + tóc (toc) cho hệ thống Appearance.

Chạy: python3 tools/gen_appearance_parts.py  (trong thư mục v2/)
Đầu ra:
  assets/charparts/faces/<g>_mat_<faceId>.png   (12 file)
  assets/charparts/hairs/<g>_toc_<hairId>.png   (12 file)
Cách làm: part gốc 256x256, lưới ô 4px (64x64). Mọi ô được "snap" về
màu palette gần nhất (alpha<128 = trong suốt), chỉnh sửa trên lưới nhãn
rồi render lại 256x256. Art gốc là màu bệt nên gần như không mất nét.
"""
import os, random, sys
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
CP = os.path.join(ROOT, "assets", "charparts")
CELL = 4
G = 256 // CELL  # 64

# ---------------- palette ----------------
PALS = {
    "nam_dau": {
        "SKIN": (240, 198, 152), "SHADE": (222, 172, 128), "O": (24, 22, 26),
        "EYE": (20, 20, 24), "W": (245, 245, 245), "BROW": (30, 34, 46),
        "MOUTH": (150, 70, 70), "NOSE": (198, 148, 108),
    },
    "nu_dau": {
        "SKIN": (247, 212, 176), "SHADE": (228, 186, 150), "O": (24, 22, 26),
        "EYE": (20, 20, 24), "W": (245, 245, 245), "BROW": (66, 44, 30),
        "MOUTH": (170, 90, 90), "NOSE": (205, 160, 128), "BLUSH": (238, 130, 140),
    },
    "nam_toc": {
        "H": (30, 34, 46), "O": (24, 22, 26), "G": (216, 178, 90), "R": (178, 44, 48),
    },
    "nu_toc": {
        "H": (66, 44, 30), "h": (48, 32, 22), "O": (24, 22, 26),
        "G": (216, 178, 90), "P": (205, 90, 125),
    },
}
# màu phụ cho biến thể (ngoài palette gốc)
EXTRA = {"JADE": (96, 186, 138), "DARKLIP": (140, 70, 70)}


def load_grid(name):
    pal = PALS[name]
    im = Image.open(os.path.join(CP, name + ".png")).convert("RGBA")
    px = im.load()
    grid = [[None] * G for _ in range(G)]
    for gy in range(G):
        for gx in range(G):
            r, g, b, a = px[gx * CELL + CELL // 2, gy * CELL + CELL // 2]
            if a < 128:
                continue
            best, bd = None, 1e18
            for k, c in pal.items():
                d = (r - c[0]) ** 2 + (g - c[1]) ** 2 + (b - c[2]) ** 2
                if d < bd:
                    bd, best = d, k
            grid[gy][gx] = best
    return grid


def save_grid(grid, pal, path):
    im = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    px = im.load()
    allc = dict(pal)
    allc.update(EXTRA)
    for gy in range(G):
        for gx in range(G):
            lab = grid[gy][gx]
            if not lab:
                continue
            c = allc[lab]
            for dy in range(CELL):
                for dx in range(CELL):
                    px[gx * CELL + dx, gy * CELL + dy] = (c[0], c[1], c[2], 255)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path)


def clone(g):
    return [row[:] for row in g]


def cells_of(g, labels):
    return [(x, y) for y in range(G) for x in range(G) if g[y][x] in labels]


def erase(g, pts, fill):
    for (x, y) in pts:
        g[y][x] = fill


def move_cells(g, pts, labelset, dx, dy, fill="SKIN"):
    """Di chuyển các ô thuộc labelset: xóa vị trí cũ (fill), vẽ ở vị trí mới."""
    src = [(x, y, g[y][x]) for (x, y) in pts if g[y][x] in labelset]
    for (x, y, _) in src:
        g[y][x] = fill
    for (x, y, lab) in src:
        nx, ny = x + dx, y + dy
        if 0 <= nx < G and 0 <= ny < G:
            g[ny][nx] = lab
    return g


# ---------------- FACE transforms ----------------
def face_features(g):
    brows = cells_of(g, {"BROW"})
    eyes = cells_of(g, {"EYE", "W"})
    mouth = cells_of(g, {"MOUTH"})
    cx = 32
    browL = [p for p in brows if p[0] < cx]
    browR = [p for p in brows if p[0] >= cx]
    eyeL = [p for p in eyes if p[0] < cx]
    eyeR = [p for p in eyes if p[0] >= cx]
    return browL, browR, eyeL, eyeR, mouth


def close_eyes(g, eye_blocks, rows):
    for blk in eye_blocks:
        cols = {}
        for (x, y) in blk:
            cols.setdefault(x, []).append(y)
        for x, ys in cols.items():
            for y in sorted(ys)[:rows]:
                g[y][x] = "SKIN"


def shift_brows(g, brow_blocks, dy):
    pts = [p for blk in brow_blocks for p in blk]
    move_cells(g, pts, {"BROW"}, 0, dy)


def angle_brows(g, browL, browR, inner_down=True):
    # trái: đầu trong (x lớn) xuống nếu inner_down, đầu ngoài (x nhỏ) giữ/ngược lại
    for blk, is_left in ((browL, True), (browR, False)):
        if not blk:
            continue
        xs = [p[0] for p in blk]
        mid = (min(xs) + max(xs)) / 2.0
        moved = []
        for (x, y) in blk:
            inner = (x >= mid) if is_left else (x <= mid)
            dy = 1 if (inner == inner_down) else -0
            if dy and 0 <= y + dy < G and g[y + dy][x] in ("SKIN", "BROW", None):
                moved.append((x, y, y + dy))
        for (x, y, _) in moved:
            g[y][x] = "SKIN"
        for (x, y, ny) in moved:
            g[ny][x] = "BROW"


def droop_brows(g, browL, browR):
    for blk, is_left in ((browL, True), (browR, False)):
        if not blk:
            continue
        xs = [p[0] for p in blk]
        mid = (min(xs) + max(xs)) / 2.0
        moved = []
        for (x, y) in blk:
            outer = (x < mid) if is_left else (x > mid)
            if outer:
                moved.append((x, y))
        for (x, y) in moved:
            g[y][x] = "SKIN"
        for (x, y) in moved:
            if y + 1 < G:
                g[y + 1][x] = "BROW"


def make_face(base, style, gender):
    g = clone(base)
    browL, browR, eyeL, eyeR, mouth = face_features(g)
    if style == "mat_thuong":
        pass
    elif style == "mat_nghiem":
        angle_brows(g, browL, browR, inner_down=True)
        close_eyes(g, [eyeL, eyeR], 1)
    elif style == "mat_hien":
        shift_brows(g, [browL, browR], -1)
        if mouth:
            ys = [p[1] for p in mouth]
            xs = [p[0] for p in mouth]
            top = min(ys)
            for cx_ in (min(xs), max(xs)):
                if top - 1 >= 0 and g[top - 1][cx_] == "SKIN":
                    g[top - 1][cx_] = "MOUTH"  # nhếch khóe miệng = cười
    elif style == "mat_lanh":
        shift_brows(g, [browL, browR], 1)
        close_eyes(g, [eyeL, eyeR], 2)
        if mouth:
            ys = sorted(set(p[1] for p in mouth))
            keep = ys[len(ys) // 2]
            erase(g, [p for p in mouth if p[1] != keep], "SKIN")
    elif style == "mat_ngay_tho":
        shift_brows(g, [browL, browR], -2)
        for blk in (eyeL, eyeR):
            if blk:
                bot = max(p[1] for p in blk)
                for (x, y) in list(blk):
                    if y == bot and bot + 1 < G and g[bot + 1][x] == "SKIN":
                        g[bot + 1][x] = "EYE"  # mắt to thêm 1 hàng
        if mouth:
            xs = [p[0] for p in mouth]
            ys = [p[1] for p in mouth]
            cxm = (min(xs) + max(xs)) // 2
            cym = (min(ys) + max(ys)) // 2
            erase(g, mouth, "SKIN")
            for dx in (0, 1):
                for dy in (0, 1):
                    g[cym + dy][cxm + dx] = "MOUTH"  # miệng "o" nhỏ
    elif style == "mat_phong_tran":
        droop_brows(g, browL, browR)
        for blk in (eyeL, eyeR):
            if blk:
                bot = max(p[1] for p in blk)
                xs = sorted(set(p[0] for p in blk))
                for i, x in enumerate(xs):
                    if i % 2 == 0 and bot + 1 < G and g[bot + 1][x] == "SKIN":
                        g[bot + 1][x] = "EYE"  # quầng mắt mệt
        if gender == "nam":
            if mouth:
                top = max(p[1] for p in mouth)
                rng = random.Random(42)
                for y in range(top + 2, 59):
                    for x in range(24, 41):
                        if g[y][x] == "SKIN" and rng.random() < 0.38:
                            g[y][x] = "SHADE"  # râu quai nón lún phún
                # sẹo chéo má trái
                for i in range(3):
                    x, y = 25 + i, 52 + i
                    if g[y][x] in ("SKIN", "SHADE"):
                        g[y][x] = "O"
        else:
            if mouth:
                for (x, y) in mouth:
                    g[y][x] = "DARKLIP"  # môi trầm
                mx = max(p[0] for p in mouth)
                my = max(p[1] for p in mouth)
                if my + 2 < G and g[my + 2][mx + 1] == "SKIN":
                    g[my + 2][mx + 1] = "EYE"  # nốt ruồi duyên
    return g


FACES = ["mat_thuong", "mat_nghiem", "mat_hien", "mat_lanh", "mat_ngay_tho", "mat_phong_tran"]

# ---------------- HAIR transforms ----------------
def draw_bun(g, cx, cy, r, accent=None):
    for y in range(cy - r, cy + r + 1):
        for x in range(cx - r, cx + r + 1):
            if 0 <= x < G and 0 <= y < G:
                d2 = (x - cx) ** 2 + (y - cy) ** 2
                if d2 <= r * r:
                    g[y][x] = "O" if d2 > (r - 1) ** 2 else "H"
    if accent:
        g[cy + r][cx] = accent


def shift_region(g, x0, x1, y0, y1, dx, dy, fill=None, labels=None):
    src = []
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if g[y][x] is not None and (labels is None or g[y][x] in labels):
                src.append((x, y, g[y][x]))
    for (x, y, _) in src:
        g[y][x] = fill
    for (x, y, lab) in src:
        nx, ny = x + dx, y + dy
        if 0 <= nx < G and 0 <= ny < G:
            g[ny][nx] = lab


def hair_nam(base, style):
    g = clone(base)
    if style == "toc_bui_cao":
        pass
    elif style == "toc_bui_thap":
        # dời cụm búi (dôme + dây vàng) xuống 4 ô; xóa dây đỏ cũ
        erase(g, [(x, y) for y in range(26, 31) for x in range(G) if g[y][x] == "R"], None)
        shift_region(g, 24, 40, 20, 27, 0, 4)
    elif style == "toc_xoa_dai":
        # bỏ búi/dây, xõa 2 bên dài xuống
        for y in range(19, 31):
            for x in range(G):
                if g[y][x] in ("H", "G", "R"):
                    g[y][x] = None
        for side_x in (range(23, 28), range(37, 42)):
            xs = list(side_x)
            for y in range(44, 57):
                taper = 1 if y > 52 else 0
                use = xs[taper:len(xs) - taper] or xs
                for x in use:
                    g[y][x] = "H"
                g[y][use[0]] = "O"
                g[y][use[-1]] = "O"
    elif style == "toc_dau_dinh":
        # cắt sạch phần trên hàng 32, giữ nắp tóc mỏng
        for y in range(0, 32):
            for x in range(G):
                g[y][x] = None
        for x in range(G):
            if g[32][x] == "H":
                g[32][x] = "O"
    elif style == "toc_bui_doi":
        for y in range(19, 31):
            for x in range(G):
                if g[y][x] in ("H", "G", "R"):
                    g[y][x] = None
        draw_bun(g, 26, 24, 3, accent="R")
        draw_bun(g, 38, 24, 3, accent="R")
    elif style == "toc_tem_lech":
        # búi lệch phải + mái chéo: trán trái thấp hơn phải
        shift_region(g, 24, 40, 20, 30, 3, 0)
        for x in range(25, 32):
            extra = 2 if x < 29 else 1
            col = [y for y in range(G) if g[y][x] == "H"]
            if col:
                bot = max(col)
                for k in range(1, extra + 1):
                    if bot + k < G and g[bot + k][x] is None:
                        g[bot + k][x] = "H"
    return g


def hair_nu(base, style):
    g = clone(base)
    if style == "toc_bui_cao_hoa":
        pass
    elif style == "toc_bui_doi":
        for y in range(18, 28):
            for x in range(G):
                if g[y][x] in ("H", "G", "P", "h"):
                    g[y][x] = None
        draw_bun(g, 26, 23, 3, accent="P")
        draw_bun(g, 38, 23, 3, accent="P")
    elif style == "toc_xoa_dai":
        for y in range(18, 28):
            for x in range(G):
                if g[y][x] in ("H", "G", "P", "h"):
                    g[y][x] = None
        # nối dài 2 dải tóc 2 bên từ hàng 50 xuống 56
        for y in range(50, 57):
            for x in range(G):
                if g[49][x] in ("H", "h", "O"):
                    g[y][x] = g[49][x]
    elif style == "toc_tem":
        # bỏ búi + cắt ngắn 2 bên dưới hàng 40
        for y in range(18, 28):
            for x in range(G):
                if g[y][x] in ("H", "G", "P", "h"):
                    g[y][x] = None
        for y in range(41, G):
            for x in range(G):
                if g[y][x] in ("H", "h"):
                    g[y][x] = None
    elif style == "toc_bim_dai":
        # bím tóc bên phải: zigzag H/h từ hàng 38 xuống 56, cột hoa hồng cuối bím
        bx = 45
        for i, y in enumerate(range(38, 57)):
            off = 1 if i % 2 else 0
            for dx in range(0, 3):
                x = bx + ((dx + off) % 3) - 1
                if 0 <= x < G:
                    g[y][x] = "h" if (dx + off) % 2 else "H"
            g[y][bx - 2] = "O"
            g[y][bx + 2] = "O"
        g[57][bx] = "P"
    elif style == "toc_bui_thap_ngoc":
        shift_region(g, 24, 44, 19, 27, 0, 3, labels={"H", "h", "P"})
        for y in range(G):
            for x in range(G):
                if g[y][x] == "G":
                    g[y][x] = "JADE"  # trâm ngọc thay băng vàng
    return g


HAIRS = {
    "nam": (hair_nam, ["toc_bui_cao", "toc_bui_thap", "toc_xoa_dai", "toc_dau_dinh", "toc_bui_doi", "toc_tem_lech"]),
    "nu": (hair_nu, ["toc_bui_cao_hoa", "toc_bui_doi", "toc_xoa_dai", "toc_tem", "toc_bim_dai", "toc_bui_thap_ngoc"]),
}


def main():
    out_f = os.path.join(CP, "faces")
    out_h = os.path.join(CP, "hairs")
    n = 0
    for gender in ("nam", "nu"):
        dbase = load_grid(gender + "_dau")
        for fid in FACES:
            g = make_face(dbase, fid, gender)
            save_grid(g, PALS[gender + "_dau"], os.path.join(out_f, "%s_%s.png" % (gender, fid)))
            n += 1
        tbase = load_grid(gender + "_toc")
        fn, ids = HAIRS[gender]
        for hid in ids:
            g = fn(tbase, hid)
            save_grid(g, PALS[gender + "_toc"], os.path.join(out_h, "%s_%s.png" % (gender, hid)))
            n += 1
    print("generated", n, "variant parts")


if __name__ == "__main__":
    sys.exit(main())
