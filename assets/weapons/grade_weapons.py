#!/usr/bin/env python3
"""Grade weapon base images into 7 grades each (70 total) + 5 upgrade burst effects.
Grade colors: Pham(white) Luong(green) Uu(blue) Hiem(purple) SuThi(orange) TruyenThuyet(red) Tien(gold)
Usage: python3 grade_weapons.py
Reads:  ~/workspace/game-tu-tien/v2/assets/weapons/_base/base_<type>.png
Writes: ~/workspace/game-tu-tien/v2/assets/weapons/<type>_<grade>.png (256x256 RGBA)
        ~/workspace/game-tu-tien/v2/assets/weapons/tiengiai_<grade>.png (256x256 RGBA)
"""
import os, math, random
from PIL import Image, ImageDraw, ImageFilter, ImageChops

HOME = os.path.expanduser("~")
BASE_DIR = os.path.join(HOME, "workspace/game-tu-tien/v2/assets/weapons/_base")
OUT_DIR = os.path.join(HOME, "workspace/game-tu-tien/v2/assets/weapons")
SIZE = 256

WEAPONS = ["kiem", "dao", "thuong", "cung", "phien", "tieu", "roi", "liem", "kiem_hap", "but"]
GRADES = [
    # (name, rgb, glow_radius, glow_alpha, particles, wisps, tint_strength, label)
    ("pham",         (205, 205, 215),  4,  60,  0, False, 0.00),
    ("luong",        ( 70, 220, 110),  7,  90,  8, False, 0.06),
    ("uu",           ( 90, 160, 255), 10, 110, 16, False, 0.10),
    ("hiem",         (175,  85, 255), 13, 130, 26, True,  0.14),
    ("suthi",        (255, 150,  45), 16, 150, 38, True,  0.18),
    ("truyenthuyet", (255,  65,  65), 20, 170, 52, True,  0.22),
    ("tien",         (255, 215,  90), 24, 190, 70, True,  0.26),
]

def flood_fill_transparent(img):
    """Black background -> transparent via flood fill from borders."""
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()
    # sample border pixels as background color candidates
    bg_samples = []
    for x in range(0, w, 8):
        bg_samples.append(px[x, 0]); bg_samples.append(px[x, h-1])
    for y in range(0, h, 8):
        bg_samples.append(px[0, y]); bg_samples.append(px[w-1, y])
    def is_bg(c):
        return max(c[0], c[1], c[2]) < 28
    # flood fill
    from collections import deque
    visited = bytearray(w*h)
    q = deque()
    for x in range(w):
        for y in (0, h-1):
            if is_bg(px[x, y] if False else img.getpixel((x, y))): q.append((x, y))
    for y in range(h):
        for x in (0, w-1):
            if is_bg(img.getpixel((x, y))): q.append((x, y))
    # simpler: scanline flood using mask
    import numpy as np
    a = np.array(img)
    dark = (a[...,0].astype(int) + a[...,1].astype(int) + a[...,2].astype(int)) < 84
    # connected components from border via BFS on numpy
    mask = np.zeros((h, w), dtype=bool)
    stack = []
    for x in range(w):
        if dark[0, x]: stack.append((0, x))
        if dark[h-1, x]: stack.append((h-1, x))
    for y in range(h):
        if dark[y, 0]: stack.append((y, 0))
        if dark[y, w-1]: stack.append((y, w-1))
    while stack:
        y, x = stack.pop()
        if y < 0 or y >= h or x < 0 or x >= w: continue
        if mask[y, x] or not dark[y, x]: continue
        mask[y, x] = True
        stack.append((y+1, x)); stack.append((y-1, x)); stack.append((y, x+1)); stack.append((y, x-1))
    a[mask, 3] = 0
    return Image.fromarray(a)

def normalize(img):
    """Trim transparent borders, fit into 256x256 centered."""
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    w, h = img.size
    scale = 220 / max(w, h)
    nw, nh = max(1, int(w*scale)), max(1, int(h*scale))
    img = img.resize((nw, nh), Image.NEAREST)
    canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    canvas.paste(img, ((SIZE-nw)//2, (SIZE-nh)//2), img)
    return canvas

def add_glow(img, color, radius, alpha):
    """Colored outer glow behind the weapon."""
    a = img.split()[3]
    glow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    gm = a.filter(ImageFilter.GaussianBlur(radius))
    solid = Image.new("RGBA", img.size, color + (0,))
    solid.putalpha(gm.point(lambda v: int(v * alpha / 255)))
    # second tighter brighter layer
    gm2 = a.filter(ImageFilter.GaussianBlur(max(2, radius//3)))
    solid2 = Image.new("RGBA", img.size, tuple(min(255, c+60) for c in color) + (0,))
    solid2.putalpha(gm2.point(lambda v: int(v * min(255, alpha+60) / 255)))
    glow = Image.alpha_composite(glow, solid)
    glow = Image.alpha_composite(glow, solid2)
    return Image.alpha_composite(glow, img)

def tint_weapon(img, color, strength):
    if strength <= 0: return img
    r, g, b, a = img.split()
    tint = Image.new("RGB", img.size, color)
    rgb = Image.merge("RGB", (r, g, b))
    rgb = Image.blend(rgb, ImageChops.multiply(rgb, tint), strength)
    out = Image.merge("RGBA", (*rgb.split(), a))
    return out

def add_particles(img, color, count, seed, wisps=False):
    if count <= 0 and not wisps: return img
    rng = random.Random(seed)
    w, h = img.size
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx, cy = w//2, h//2
    # sparkles around the weapon silhouette
    for _ in range(count):
        ang = rng.uniform(0, 2*math.pi)
        rad = rng.uniform(40, 115)
        x = int(cx + rad*math.cos(ang)); y = int(cy + rad*math.sin(ang)*1.2)
        s = rng.choice([1, 1, 2, 2, 3])
        bright = tuple(min(255, c + 80) for c in color)
        d.rectangle([x, y, x+s, y+s], fill=bright + (220,))
        if rng.random() < 0.4:  # cross sparkle
            d.rectangle([x-s, y, x+2*s+1, y+1], fill=bright + (160,))
            d.rectangle([x, y-s, x+1, y+2*s+1], fill=bright + (160,))
    if wisps:
        # energy wisps: curved arcs around weapon
        for i in range(5):
            ang0 = rng.uniform(0, 2*math.pi)
            rad = rng.uniform(70, 105)
            x0 = cx + rad*math.cos(ang0); y0 = cy + rad*math.sin(ang0)
            x1 = cx + rad*math.cos(ang0+0.9); y1 = cy + rad*math.sin(ang0+0.9)
            mx = (x0+x1)/2 + rng.uniform(-18, 18); my = (y0+y1)/2 + rng.uniform(-18, 18)
            for t in [k/16 for k in range(17)]:
                x = (1-t)**2*x0 + 2*(1-t)*t*mx + t**2*x1
                y = (1-t)**2*y0 + 2*(1-t)*t*my + t**2*y1
                d.ellipse([x-1, y-1, x+1, y+1], fill=color + (140,))
    layer = layer.filter(ImageFilter.GaussianBlur(0.6))
    return Image.alpha_composite(img, layer)

def grade_weapon(base, gname, color, radius, alpha, particles, wisps, tint_s, seed):
    img = tint_weapon(base, color, tint_s)
    img = add_glow(img, color, radius, alpha)
    img = add_particles(img, color, particles, seed, wisps)
    return img

def upgrade_burst(color, seed):
    """Explosive light burst effect for grade-up, 256x256."""
    rng = random.Random(seed)
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx, cy = SIZE//2, SIZE//2
    # faint outer halo (subtle)
    l = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    dl = ImageDraw.Draw(l)
    dl.ellipse([cx-110, cy-110, cx+110, cy+110], fill=color + (45,))
    img = Image.alpha_composite(img, l.filter(ImageFilter.GaussianBlur(25)))
    # sharp rays first (under core, over halo)
    nrays = 28
    for i in range(nrays):
        ang = 2*math.pi*i/nrays + rng.uniform(-0.06, 0.06)
        length = rng.uniform(75, 124)
        wdt = rng.uniform(3, 8)
        x1 = cx + math.cos(ang)*22; y1 = cy + math.sin(ang)*22
        x2 = cx + math.cos(ang)*length; y2 = cy + math.sin(ang)*length
        px, py = -math.sin(ang)*wdt/2, math.cos(ang)*wdt/2
        bright = tuple(min(255, c+70) for c in color)
        d.polygon([(x1+px, y1+py), (x1-px, y1-py), (x2, y2)], fill=bright + (220,))
    # thin bright streaks between rays
    for i in range(nrays):
        ang = 2*math.pi*(i+0.5)/nrays
        length = rng.uniform(60, 100)
        x2 = cx + math.cos(ang)*length; y2 = cy + math.sin(ang)*length
        d.line([cx, cy, x2, y2], fill=(255, 255, 255, 160), width=1)
    # flying shards
    for _ in range(46):
        ang = rng.uniform(0, 2*math.pi); rad = rng.uniform(55, 122)
        x = cx + rad*math.cos(ang); y = cy + rad*math.sin(ang)
        s = rng.randint(1, 3)
        d.rectangle([x, y, x+s, y+s], fill=color + (235,))
    # hot core on top
    for rad, col, al in [(40, (255,255,255), 235), (26, color, 245), (14, (255,255,255), 255)]:
        d.ellipse([cx-rad, cy-rad, cx+rad, cy+rad], fill=col + (al,))
    return img

def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    done = 0
    for w in WEAPONS:
        src = os.path.join(BASE_DIR, f"base_{w}.png")
        if not os.path.exists(src):
            print(f"MISSING base: {src}")
            continue
        base = flood_fill_transparent(Image.open(src))
        base = normalize(base)
        for gi, (gname, color, radius, alpha, parts, wisps, tint_s) in enumerate(GRADES):
            out = grade_weapon(base, gname, color, radius, alpha, parts, wisps, tint_s, seed=1000+gi*17)
            out.save(os.path.join(OUT_DIR, f"{w}_{gname}.png"))
            done += 1
        print(f"{w}: 7 grades done")
    # 5 upgrade bursts (skip pham->luong? use luong..tien => 5 colors: uu,hiem,suthi,truyenthuyet,tien)
    burst_grades = [GRADES[i] for i in (2, 3, 4, 5, 6)]
    for i, (gname, color, *_rest) in enumerate(burst_grades):
        img = upgrade_burst(color, seed=777+i)
        img.save(os.path.join(OUT_DIR, f"tiengiai_{gname}.png"))
        print(f"tiengiai_{gname}.png done")
    print(f"TOTAL weapon images: {done}")

if __name__ == "__main__":
    main()
