#!/usr/bin/env python3
"""Realm aura effects (9) + attack trails (9) for equipment.
Writes: ~/workspace/game-tu-tien/v2/assets/weapons/aura_<realm>.png (256x256 RGBA)
        ~/workspace/game-tu-tien/v2/assets/weapons/trail_<realm>.png (256x128 RGBA)
"""
import os, math, random
from PIL import Image, ImageDraw, ImageFilter

HOME = os.path.expanduser("~")
OUT = os.path.join(HOME, "workspace/game-tu-tien/v2/assets/weapons")
S = 256

REALMS = [
    # (name, color(s), intensity, special)
    ("luyen_khi",   None, 0, None),                    # no aura
    ("truc_co",     (225, 225, 235), 1, None),          # white light
    ("kim_dan",     (255, 200, 80), 2, None),           # gold
    ("nguyen_anh",  (90, 160, 255), 3, None),          # blue
    ("hoa_than",    (175, 85, 255), 4, None),          # purple
    ("luyen_hu",    (255, 70, 70), 5, None),           # red
    ("hop_the",     "rainbow", 6, "rainbow"),          # 7-color
    ("dai_thua",    (255, 215, 90), 7, "brilliant"),   # brilliant gold
    ("do_kiep",     "rainbow", 8, "storm"),            # rainbow + lightning
]
RAINBOW = [(255,80,80),(255,160,60),(255,235,90),(110,220,110),(90,170,255),(170,100,255),(230,130,255)]

def aura_image(color, intensity, special, seed):
    rng = random.Random(seed)
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    if color is None:
        return img
    cx, cy = S//2, S//2
    colors = RAINBOW if color == "rainbow" else [color]
    # layered elliptical halo (taller than wide, wraps a character)
    for i, rad in enumerate([105, 88, 70, 52]):
        c = colors[i % len(colors)]
        al = 28 + intensity*8 - i*10
        layer = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        dl = ImageDraw.Draw(layer)
        dl.ellipse([cx-rad*0.72, cy-rad, cx+rad*0.72, cy+rad], outline=c+(max(20, al),), width=5+intensity)
        img = Image.alpha_composite(img, layer.filter(ImageFilter.GaussianBlur(6)))
    # draw everything else on a fresh layer, composite at end
    fg = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(fg)
    # rising particles
    for _ in range(10 + intensity*8):
        x = cx + rng.uniform(-70, 70); y = cy + rng.uniform(-100, 100)
        c = colors[rng.randrange(len(colors))]
        s = rng.randint(1, 3)
        d.rectangle([x, y, x+s, y+s], fill=tuple(min(255, v+60) for v in c)+(200,))
    if special == "brilliant":
        # radiant rays
        for i in range(20):
            ang = 2*math.pi*i/20
            x2 = cx + math.cos(ang)*115; y2 = cy + math.sin(ang)*115
            d.line([cx, cy, x2, y2], fill=(255, 230, 150, 90), width=2)
    if special == "storm":
        # lightning bolts
        for _ in range(6):
            x = cx + rng.uniform(-90, 90); y = cy - 110
            pts = [(x, y)]
            for k in range(6):
                x += rng.uniform(-16, 16); y += rng.uniform(18, 30)
                pts.append((x, y))
            c = colors[rng.randrange(len(colors))]
            d.line(pts, fill=tuple(min(255, v+80) for v in c)+(230,), width=3, joint="curve")
    img = Image.alpha_composite(img, fg)
    return img.filter(ImageFilter.GaussianBlur(0.4))

def trail_image(color, intensity, special, seed):
    rng = random.Random(seed)
    W, H = 256, 128
    if color is None:
        return Image.new("RGBA", (W, H), (0, 0, 0, 0))
    colors = RAINBOW if color == "rainbow" else [color]
    cy = H//2
    # glow core first (blurred, underneath)
    core = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dc = ImageDraw.Draw(core)
    c0 = colors[0]
    dc.line([14, cy, 200, cy], fill=c0+(110,), width=22)
    img = core.filter(ImageFilter.GaussianBlur(8))
    # sharp streak + sparkles on fg layer
    fg = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(fg)
    for i in range(24):
        t = i/24
        x = 10 + t*236
        half = int((1-t)*22 + 2)
        c = colors[int(t*len(colors)) % len(colors)]
        al = int(230*(1-t*0.7))
        d.line([x, cy-half, x, cy+half], fill=c+(al,), width=1)
    for _ in range(6 + intensity*3):
        x = rng.uniform(20, 230); y = cy + rng.uniform(-26, 26)
        c = colors[rng.randrange(len(colors))]
        s = rng.randint(1, 2)
        d.rectangle([x, y, x+s, y+s], fill=tuple(min(255, v+80) for v in c)+(220,))
    if special == "storm":
        for _ in range(3):
            x = rng.uniform(40, 200); y = cy - 30
            pts = [(x, y)]
            for k in range(4):
                x += rng.uniform(-10, 10); y += rng.uniform(12, 20)
                pts.append((x, y))
            d.line(pts, fill=(255, 255, 255, 220), width=2, joint="curve")
    img = Image.alpha_composite(img, fg)
    return img

def main():
    os.makedirs(OUT, exist_ok=True)
    for i, (name, color, inten, special) in enumerate(REALMS):
        aura_image(color, inten, special, seed=500+i).save(os.path.join(OUT, f"aura_{name}.png"))
        trail_image(color, inten, special, seed=900+i).save(os.path.join(OUT, f"trail_{name}.png"))
        print(f"aura_{name}.png + trail_{name}.png")
    print("18 realm fx done")

if __name__ == "__main__":
    main()
