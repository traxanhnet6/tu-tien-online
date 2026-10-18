#!/usr/bin/env python3
"""Lang Vuong (Wolf King) skeletal part cutting for Tu Tien Online.
Source: AI-generated side-view wolf (boss_lang_vuong.png), pure black bg.
Method: flood-fill bg from border (maxRGB<28) -> dilate 4px for BFS connectivity
-> carve mieng_trong (dark mouth interior region-grow) -> seeded geodesic BFS
for 11 parts -> labels read back on UNDILATED fg -> every fg pixel exactly one part.
Outputs boss_lang_vuong_part_<name>[_combat|_tinh_anh].png (RGBA full canvas)
+ boss_parts_lang_vuong.json. Variants use verbatim recipe from build_boss_pet_parts.py.
Usage: python3 build_lang_vuong_parts.py --seeds   # seed/label preview to /tmp
       python3 build_lang_vuong_parts.py           # full cut
"""
import argparse, json, os, shutil, sys
from collections import deque
from PIL import Image, ImageDraw, ImageEnhance
import numpy as np
from scipy import ndimage

D = '/home/hatch/workspace/game-tu-tien/v2/assets/sprs'
ART = os.path.join(D, '_gen_tmp',
    'media-generation-lang-vuong-wolf-b-0-b691418c-4695-4a5f-be27-94a8eb06142b.png')
SRC = os.path.join(D, 'boss_lang_vuong.png')
P = 'boss_lang_vuong'

# part: (name, [seeds...], pivot(x,y), z)
# trai = near-side leg (viewer side), phai = far-side leg. Wolf faces LEFT.
PARTS = [
    ('mieng_trong',     [(240, 715)],            (240, 720),   7),
    ('ham_duoi',        [(260, 830)],            (430, 740),   8),
    ('dau',             [(350, 540), (480, 620)], (470, 750),  9),
    ('duoi_2',          [(1300, 620), (1350, 750)], (1240, 700), 1),
    ('duoi_1',          [(1100, 780)],           (1080, 780),  2),
    ('chan_truoc_phai', [(260, 1150), (450, 1060)], (500, 1020), 3),
    ('chan_sau_phai',   [(1250, 1080), (1150, 980)], (1120, 1000), 3),
    ('chan_truoc_trai', [(180, 950), (330, 910)], (420, 920),  5),
    ('chan_sau_trai',   [(880, 1080), (1000, 1000)], (1000, 980), 5),
    ('co',              [(570, 800), (540, 900)], (560, 800),  6),
    ('than_truoc',      [(730, 860), (700, 950)], (740, 870),  4),
    ('than_sau',        [(950, 860), (930, 950)], (960, 870),  4),
]
PNAME = [p[0] for p in PARTS]
MOUTH_ROI = (120, 460, 600, 900)  # x0,x1,y0,y1 canvas coords

def variant_combat(img):
    im = ImageEnhance.Color(img).enhance(1.3)
    a = np.array(im).astype(np.float32)
    red = np.array([255, 40, 40], np.float32)
    a[:, :, :3] = a[:, :, :3] * 0.75 + red * 0.25
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGBA')

def variant_tinh_anh(img):
    im = ImageEnhance.Brightness(img).enhance(1.1)
    a = np.array(im).astype(np.float32)
    gold = np.array([255, 205, 60], np.float32)
    a[:, :, :3] = a[:, :, :3] * 0.75 + gold * 0.25
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGBA')

def load():
    if not os.path.exists(SRC):
        shutil.copy(ART, SRC)
    rgb = np.array(Image.open(SRC).convert('RGB')).astype(int)
    H, W = rgb.shape[:2]
    mx = rgb.max(axis=2)
    bg = np.zeros((H, W), bool)
    seed = np.zeros((H, W), bool)
    seed[0, :] = seed[-1, :] = seed[:, 0] = seed[:, -1] = True
    seed &= (mx < 28)
    dq = deque(zip(*np.nonzero(seed)))
    bg[seed] = True
    while dq:
        y, x = dq.popleft()
        if y > 0 and not bg[y-1, x] and mx[y-1, x] < 28:
            bg[y-1, x] = True; dq.append((y-1, x))
        if y < H-1 and not bg[y+1, x] and mx[y+1, x] < 28:
            bg[y+1, x] = True; dq.append((y+1, x))
        if x > 0 and not bg[y, x-1] and mx[y, x-1] < 28:
            bg[y, x-1] = True; dq.append((y, x-1))
        if x < W-1 and not bg[y, x+1] and mx[y, x+1] < 28:
            bg[y, x+1] = True; dq.append((y, x+1))
    return rgb, ~bg

def grow(seed_xy, allow):
    H, W = allow.shape
    seen = np.zeros((H, W), bool)
    dq = deque([seed_xy]); seen[seed_xy] = True
    while dq:
        y, x = dq.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W and allow[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True; dq.append((ny, nx))
    return seen

def segment(rgb, fg):
    H, W = fg.shape
    R, G, B = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    mx = rgb.max(axis=2)
    x0, x1, y0, y1 = MOUTH_ROI
    roi = np.zeros((H, W), bool); roi[y0:y1, x0:x1] = True
    # mieng_trong: dark-red mouth interior, grown from inside the mouth.
    # (seed must be fg: the mouth cavity; fur is grey -> excluded by R>B+15)
    mieng = grow((735, 285), roi & fg & (mx < 130) & (R > 40) & (R > B + 15))
    # dilated mask for BFS connectivity (labels read back on undilated fg)
    fgd = ndimage.binary_dilation(fg, iterations=4) & ~mieng
    labels = np.zeros((H, W), dtype=np.int32)
    seen = np.zeros((H, W), bool)
    dq = deque()
    for i, (name, seeds, pivot, z) in enumerate(PARTS, start=1):
        if name == 'mieng_trong':
            continue
        for (sx, sy) in seeds:
            if not fgd[sy, sx]:
                ys, xs = np.nonzero(fgd)
                d = (xs - sx) ** 2 + (ys - sy) ** 2
                j = int(np.argmin(d)); sx, sy = int(xs[j]), int(ys[j])
            if not seen[sy, sx]:
                seen[sy, sx] = True; labels[sy, sx] = i; dq.append((sx, sy, i))
    while dq:
        x, y, lab = dq.popleft()
        if x + 1 < W and fgd[y, x+1] and not seen[y, x+1]:
            seen[y, x+1] = True; labels[y, x+1] = lab; dq.append((x+1, y, lab))
        if x - 1 >= 0 and fgd[y, x-1] and not seen[y, x-1]:
            seen[y, x-1] = True; labels[y, x-1] = lab; dq.append((x-1, y, lab))
        if y + 1 < H and fgd[y+1, x] and not seen[y+1, x]:
            seen[y+1, x] = True; labels[y+1, x] = lab; dq.append((x, y+1, lab))
        if y - 1 >= 0 and fgd[y-1, x] and not seen[y-1, x]:
            seen[y-1, x] = True; labels[y-1, x] = lab; dq.append((x, y-1, lab))
    # read back on undilated fg
    full = np.zeros((H, W), dtype=np.int32)
    full[fg] = labels[fg]
    full[mieng] = 1  # mieng_trong is part index 1
    # post-rules
    idx = {n: i + 1 for i, n in enumerate(PNAME)}
    upper = roi & fg & (np.arange(H)[:, None] < 695)  # upper snout/teeth -> dau
    full[upper & (full != idx['mieng_trong'])] = idx['dau']
    # unseeded leftovers (should be none) -> nearest seed
    if (fg & (full == 0)).any():
        seed_list, sidx = [], []
        for j, (name, ss, _, _) in enumerate(PARTS):
            if name == 'mieng_trong':
                continue
            for (sx, sy) in ss:
                seed_list.append((sx, sy)); sidx.append(j + 1)
        seeds_arr = np.array(seed_list); sidx = np.array(sidx)
        yy, xx = np.nonzero(fg & (full == 0))
        d = ((seeds_arr[None, :, 0] - xx[:, None]) ** 2 +
             (seeds_arr[None, :, 1] - yy[:, None]) ** 2)
        full[yy, xx] = sidx[np.argmin(d, axis=1)]
    return full

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--seeds', action='store_true')
    args = ap.parse_args()
    rgb, fg = load()
    H, W = fg.shape
    print('canvas', W, H, 'fg px', int(fg.sum()))
    labels = segment(rgb, fg)
    # coverage sanity
    uncovered = fg & (labels == 0)
    print('uncovered fg px:', int(uncovered.sum()))
    if args.seeds:
        vis = Image.fromarray((np.clip(rgb, 0, 255)).astype(np.uint8)).resize((W // 2, H // 2))
        dr = ImageDraw.Draw(vis)
        cols = [(255, 0, 0), (0, 255, 0), (0, 0, 255), (255, 255, 0), (255, 0, 255),
                (0, 255, 255), (255, 128, 0), (128, 0, 255), (255, 0, 128), (128, 255, 0),
                (0, 128, 255), (255, 255, 255)]
        for i, (name, seeds, pivot, z) in enumerate(PARTS):
            for (sx, sy) in seeds:
                x, y = sx // 2, sy // 2
                dr.ellipse([x-6, y-6, x+6, y+6], fill=cols[i % len(cols)], outline=(0, 0, 0))
            px, py = pivot[0] // 2, pivot[1] // 2
            dr.line([px-8, py, px+8, py], fill=(255, 255, 255), width=2)
            dr.line([px, py-8, px, py+8], fill=(255, 255, 255), width=2)
            dr.text((seeds[0][0] // 2 + 8, seeds[0][1] // 2 - 8), f'{i}:{name}', fill=(255, 255, 0))
        vis.save('/tmp/lv_seeds.png')
        # label map preview
        labvis = np.zeros((H, W, 3), np.uint8)
        for i in range(1, len(PARTS) + 1):
            labvis[labels == i] = cols[(i - 1) % len(cols)]
        Image.fromarray(labvis).resize((W // 2, H // 2)).save('/tmp/lv_labels.png')
        print('saved /tmp/lv_seeds.png /tmp/lv_labels.png')
        return
    rgba = np.dstack([np.clip(rgb, 0, 255).astype(np.uint8),
                      np.full((H, W), 255, np.uint8)])
    jparts = {}
    order = sorted(enumerate(PARTS, start=1), key=lambda t: t[1][3])
    comp = np.zeros((H, W, 4), np.uint8)
    for idx, (name, seeds, pivot, z) in order:
        pm = (labels == idx) & fg
        npx = int(pm.sum())
        part = np.zeros((H, W, 4), np.uint8)
        part[pm] = rgba[pm]
        im = Image.fromarray(part, 'RGBA')
        base = f'{P}_part_{name}.png'
        im.save(os.path.join(D, base))
        cb = f'{P}_part_{name}_combat.png'
        ta = f'{P}_part_{name}_tinh_anh.png'
        variant_combat(im).save(os.path.join(D, cb))
        variant_tinh_anh(im).save(os.path.join(D, ta))
        jparts[name] = {'file': base, 'pivot': [int(pivot[0]), int(pivot[1])], 'z': z,
                        'pixels': npx,
                        'variants': {'base': base, 'combat': cb, 'tinh_anh': ta}}
        a = part[:, :, 3:4].astype(np.float32) / 255.0
        region = comp.astype(np.float32)
        m = pm[:, :, None]
        region[:, :, :3] = np.where(m, part[:, :, :3], region[:, :, :3])
        region[:, :, 3:4] = np.maximum(region[:, :, 3:4], part[:, :, 3:4])
        comp = region.astype(np.uint8)
        print(f'{name}: px={npx} pivot={pivot} z={z}')
    orig = rgba.copy(); orig[~fg] = (0, 0, 0, 0)
    diff = np.abs(comp.astype(np.int16) - orig.astype(np.int16))
    print('composite meanabsdiff:', round(float(diff.mean()), 4),
          '| px>40:', int((diff.max(axis=2) > 40).sum()))
    manifest = {
        'monster': 'lang_vuong', 'canvas': {'width': W, 'height': H},
        'source': 'boss_lang_vuong.png',
        'note': ('Lang Vuong - wolf king, side view facing left. trai=near-side leg '
                 '(viewer side), phai=far-side leg. Upper teeth stay with dau; '
                 'mieng_trong is the dark mouth interior patch (child of dau). '
                 'Background: pure black, flood-filled from border (maxRGB<28).'),
        'jaw_animation': ('Open the jaw by translating ham_duoi DOWN from its pivot '
                          '(hinge at jaw joint); small rotation (<10deg) may be mixed in.'),
        'leg_convention': 'trai = near-side (viewer side), phai = far-side',
        'parts': jparts,
    }
    with open(os.path.join(D, 'boss_parts_lang_vuong.json'), 'w') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)
    print('wrote boss_parts_lang_vuong.json')
    # preview grid
    thumbs = []
    for idx, (name, seeds, pivot, z) in enumerate(PARTS, start=1):
        pm = (labels == idx) & fg
        yy, xx = np.nonzero(pm)
        if len(xx) == 0:
            continue
        x0, x1, y0, y1 = xx.min(), xx.max(), yy.min(), yy.max()
        crop = rgba[y0:y1+1, x0:x1+1].copy(); crop[~pm[y0:y1+1, x0:x1+1]] = (0, 0, 0, 0)
        th = Image.fromarray(crop); th.thumbnail((220, 220))
        cell = Image.new('RGB', (240, 260), (18, 18, 18))
        cell.paste(th, (10, 10), th)
        dr = ImageDraw.Draw(cell)
        s = min(220 / max(x1-x0+1, 1), 220 / max(y1-y0+1, 1))
        _px, _py = int((pivot[0]-x0)*s+10), int((pivot[1]-y0)*s+10)
        dr.line([_px-7, _py, _px+7, _py], fill=(255, 0, 0), width=2)
        dr.line([_px, _py-7, _px, _py+7], fill=(255, 0, 0), width=2)
        dr.text((10, 238), f'{name} z{z}', fill=(200, 200, 200))
        thumbs.append(cell)
    cols = 4; rows = (len(thumbs)+cols-1)//cols
    grid = Image.new('RGB', (cols*240, rows*260), (40, 40, 40))
    for i, t in enumerate(thumbs):
        grid.paste(t, ((i % cols)*240, (i//cols)*260))
    grid.save('/tmp/lv_parts_grid.png')
    print('saved /tmp/lv_parts_grid.png')

if __name__ == '__main__':
    main()
