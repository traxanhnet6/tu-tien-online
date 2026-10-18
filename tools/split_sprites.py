#!/usr/bin/env python3
"""Split a 7-frame equipment spritesheet (1 row x 7 cols) into 128x128 PNGs.

Usage: split_sprites.py <sheet_png> <slot_name>
Writes equip_<slot>_r<1-7>.png into ~/workspace/game-tu-tien/v2/assets/equip/
"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

OUT = os.path.expanduser("~/workspace/game-tu-tien/v2/assets/equip")
SIZE = 128
FIT = 112          # max dimension of the sprite inside the 128 canvas
WHITE_TOL = 235    # channels >= this count as background white
MARGIN = 6

def remove_bg(cell: Image.Image) -> Image.Image:
    a = np.asarray(cell.convert("RGB")).astype(np.int16)
    near_white = (a >= WHITE_TOL).all(axis=2)
    labels, n = ndimage.label(near_white)
    border = np.zeros_like(labels, bool)
    border[0, :] = border[-1, :] = border[:, 0] = border[:, -1] = True
    bg_labels = set(np.unique(labels[border])) - {0}
    bg = np.isin(labels, list(bg_labels))
    rgba = np.dstack([a.astype(np.uint8), np.where(bg, 0, 255).astype(np.uint8)])
    return Image.fromarray(rgba, "RGBA")

def split_equal(sheet: Image.Image):
    """Legacy equal-column split (kept for reference)."""
    w, h = sheet.size
    cw = w // 7
    return [sheet.crop((i * cw, 0, (i + 1) * cw, h)) for i in range(7)]

def split_components(sheet: Image.Image):
    """Robust split: bg-remove whole sheet, then take 7 largest connected
    opaque components (dilated slightly to merge nearby sparkles), left to right."""
    rgba = remove_bg(sheet)
    alpha = (np.asarray(rgba)[:, :, 3] > 0)
    # dilate a bit so detached sparkles/glow bits near a sprite group with it
    grouped = ndimage.binary_dilation(alpha, iterations=10)
    labels, n = ndimage.label(grouped, structure=np.ones((3, 3)))
    comps = []
    for i in range(1, n + 1):
        ys, xs = np.where(labels == i)
        area = len(xs)
        if area < 200:
            continue
        comps.append((area, xs.min(), xs.max(), ys.min(), ys.max()))
    comps.sort(key=lambda c: -c[0])
    if len(comps) < 7:
        raise RuntimeError(f"only {len(comps)} components found, need 7")
    comps = comps[:7]
    comps.sort(key=lambda c: (c[1] + c[2]) / 2)  # left to right
    cells = []
    for _, x0, x1, y0, y1 in comps:
        # tight bbox from the ORIGINAL (undilated) mask inside this region
        sub = alpha[max(0, y0 - 30):y1 + 31, max(0, x0 - 30):x1 + 31]
        ys2, xs2 = np.where(sub)
        ox, oy = max(0, x0 - 30), max(0, y0 - 30)
        cells.append(rgba.crop((ox + xs2.min(), oy + ys2.min(),
                                ox + xs2.max() + 1, oy + ys2.max() + 1)))
    return cells

def process(sheet_path: str, slot: str, mode: str = "components"):
    sheet = Image.open(sheet_path).convert("RGB")
    cells = split_components(sheet) if mode == "components" else split_equal(sheet)
    for i, cell in enumerate(cells):
        rgba = remove_bg(cell) if mode == "equal" else cell
        alpha = np.asarray(rgba)[:, :, 3]
        ys, xs = np.where(alpha > 0)
        if len(xs) == 0:
            print(f"  r{i+1}: empty, skipped")
            continue
        x0, x1 = max(0, xs.min() - MARGIN), min(rgba.width, xs.max() + MARGIN + 1)
        y0, y1 = max(0, ys.min() - MARGIN), min(rgba.height, ys.max() + MARGIN + 1)
        spr = rgba.crop((x0, y0, x1, y1))
        s = FIT / max(spr.width, spr.height)
        nw, nh = max(1, round(spr.width * s)), max(1, round(spr.height * s))
        spr = spr.resize((nw, nh), Image.NEAREST)
        canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
        canvas.paste(spr, ((SIZE - nw) // 2, (SIZE - nh) // 2), spr)
        out = os.path.join(OUT, f"equip_{slot}_r{i+1}.png")
        canvas.save(out)
        print(f"  -> {out}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit("usage: split_sprites.py <sheet_png> <slot_name>")
    process(sys.argv[1], sys.argv[2])
