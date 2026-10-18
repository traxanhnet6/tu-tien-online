#!/usr/bin/env python3
"""Huyet Ma Vuong (Blood Demon King) remaining skeletal parts for Tu Tien Online.
dau/ham_duoi/mieng_trong already exist (kept as-is). This cuts the other 12 parts
from mon_huyet_ma_vuong.png (1120x2240) via seeded geodesic BFS on the foreground
(flood-filled from border, maxRGB<28), excluding already-claimed pixels.
canh_trai/canh_phai = the big flame-wing masses on both sides; duoi = the bright
flame tongues hanging between the legs (restricted to R>100).
Outputs boss_huyet_ma_vuong_part_<name>[_combat|_tinh_anh].png (RGBA full canvas),
adds _combat/_tinh_anh variants for the 3 existing parts, and updates
boss_parts_huyet_ma_vuong.json. Variants use verbatim recipe from build_boss_pet_parts.py.
Usage: python3 build_huyet_ma_vuong_parts2.py --seeds | (full)
"""
import argparse, json, os
from collections import deque
from PIL import Image, ImageDraw, ImageEnhance
import numpy as np
from scipy import ndimage

D = '/home/hatch/workspace/game-tu-tien/v2/assets/sprs'
SRC = os.path.join(D, 'mon_huyet_ma_vuong.png')
P = 'boss_huyet_ma_vuong'
MANIFEST = os.path.join(D, 'boss_parts_huyet_ma_vuong.json')

# (name, [seeds...], pivot(x,y), z). trai = screen-left (same convention as
# skeletal/cut_skeletal.py config for this boss).
PARTS = [
    ('duoi',           [(560, 1700), (600, 1750), (520, 1730)], (560, 1650), 3),
    ('tay_trai_duoi',  [(120, 1030), (160, 1100)], (210, 1090), 5),
    ('tay_phai_duoi',  [(1000, 1030), (960, 1100)], (910, 1090), 5),
    ('tay_trai_tren',  [(290, 1100), (330, 1180)], (330, 1080), 5),
    ('tay_phai_tren',  [(830, 1100), (790, 1180)], (790, 1080), 5),
    ('chan_trai_duoi', [(370, 1980), (350, 2040)], (370, 1900), 4),
    ('chan_phai_duoi', [(780, 1980), (770, 2040)], (780, 1900), 4),
    ('chan_trai_tren', [(370, 1780)], (370, 1700), 4),
    ('chan_phai_tren', [(780, 1780)], (780, 1700), 4),
    ('canh_trai',      [(120, 1400), (180, 1600), (100, 1720), (90, 900)], (330, 1200), 3),
    ('canh_phai',      [(1000, 1400), (950, 1600), (1030, 1720), (1030, 900)], (790, 1200), 3),
    ('than',           [(560, 1150), (560, 1300), (560, 1500), (480, 1650), (640, 1650)],
     (560, 1250), 6),
]
PNAME = [p[0] for p in PARTS]
OLD = ['dau', 'ham_duoi', 'mieng_trong']

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
    a = np.array(Image.open(SRC).convert('RGBA'))
    H, W = a.shape[:2]
    rgb = a[:, :, :3].astype(int); mx = rgb.max(axis=2)
    bg = np.zeros((H, W), bool)
    seed = np.zeros((H, W), bool)
    seed[0, :] = seed[-1, :] = seed[:, 0] = seed[:, -1] = True
    seed &= (mx < 28)
    dq = deque(zip(*np.nonzero(seed))); bg[seed] = True
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
    fg = ~bg
    claimed = np.zeros((H, W), bool)
    for n in OLD:
        m = np.array(Image.open(os.path.join(D, f'{P}_part_{n}.png'))
                     .convert('RGBA'))[:, :, 3] > 0
        claimed |= m
    return a, rgb, fg & ~claimed

def segment(rgb, mask):
    H, W = mask.shape
    R, G = rgb[:, :, 0], rgb[:, :, 1]
    labels = np.zeros((H, W), dtype=np.int32)
    seen = np.zeros((H, W), bool)
    dq = deque()
    for i, (name, seeds, pivot, z) in enumerate(PARTS, start=1):
        for (sx, sy) in seeds:
            if not mask[sy, sx]:
                ys, xs = np.nonzero(mask)
                d = (xs - sx) ** 2 + (ys - sy) ** 2
                j = int(np.argmin(d)); sx, sy = int(xs[j]), int(ys[j])
            if not seen[sy, sx]:
                seen[sy, sx] = True; labels[sy, sx] = i; dq.append((sx, sy, i))
    while dq:
        x, y, lab = dq.popleft()
        if x + 1 < W and mask[y, x+1] and not seen[y, x+1]:
            seen[y, x+1] = True; labels[y, x+1] = lab; dq.append((x+1, y, lab))
        if x - 1 >= 0 and mask[y, x-1] and not seen[y, x-1]:
            seen[y, x-1] = True; labels[y, x-1] = lab; dq.append((x-1, y, lab))
        if y + 1 < H and mask[y+1, x] and not seen[y+1, x]:
            seen[y+1, x] = True; labels[y+1, x] = lab; dq.append((x, y+1, lab))
        if y - 1 >= 0 and mask[y-1, x] and not seen[y-1, x]:
            seen[y-1, x] = True; labels[y-1, x] = lab; dq.append((x, y-1, lab))
    idx = {n: i + 1 for i, n in enumerate(PNAME)}
    # duoi = flame tongues hanging BELOW the skirt's bottom edge (y>=1695);
    # dimmer skirt cloth above the edge -> than
    dm = (labels == idx['duoi'])
    keep = dm & (np.arange(H)[:, None] >= 1695) & (R > 40)
    labels[dm & ~keep] = idx['than']
    # unseeded blobs -> nearest seed
    left = mask & (labels == 0)
    if left.any():
        lab0, n0 = ndimage.label(left)
        seed_list, sidx = [], []
        for j, (name, ss, _, _) in enumerate(PARTS):
            for (sx, sy) in ss:
                seed_list.append((sx, sy)); sidx.append(j + 1)
        seeds_arr = np.array(seed_list); sidx = np.array(sidx)
        for c in range(1, n0 + 1):
            yy, xx = np.nonzero(lab0 == c)
            cx, cy = xx.mean(), yy.mean()
            d = ((seeds_arr - (cx, cy)) ** 2).sum(axis=1)
            labels[lab0 == c] = int(sidx[int(np.argmin(d))])
    return labels

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--seeds', action='store_true')
    args = ap.parse_args()
    a, rgb, mask = load()
    H, W = mask.shape
    print('canvas', W, H, 'unclaimed fg px', int(mask.sum()))
    labels = segment(rgb, mask)
    print('uncovered px:', int((mask & (labels == 0)).sum()))
    if args.seeds:
        vis = Image.fromarray(a[:, :, :3].astype(np.uint8)).resize((W // 2, H // 2))
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
        vis.save('/tmp/hmv_seeds.png')
        labvis = np.zeros((H, W, 3), np.uint8)
        for i in range(1, len(PARTS) + 1):
            labvis[labels == i] = cols[(i - 1) % len(cols)]
        Image.fromarray(labvis).resize((W // 2, H // 2)).save('/tmp/hmv_labels.png')
        print('saved /tmp/hmv_seeds.png /tmp/hmv_labels.png')
        return
    rgba_full = a.copy(); rgba_full[~mask & (rgba_full[:, :, 3] == 0)] = (0, 0, 0, 0)
    # NOTE: parts store source RGB where their mask; alpha 255 there, 0 elsewhere
    jparts = {}
    order = sorted(enumerate(PARTS, start=1), key=lambda t: t[1][3])
    comp = np.zeros((H, W, 4), np.uint8)
    fg_all = (a[:, :, 3] > 0)
    for idx, (name, seeds, pivot, z) in order:
        pm = (labels == idx) & mask
        npx = int(pm.sum())
        part = np.zeros((H, W, 4), np.uint8)
        part[pm] = np.dstack([rgb, np.full((H, W), 255)])[pm]
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
        m = pm[:, :, None]
        region = comp.astype(np.float32)
        region[:, :, :3] = np.where(m, part[:, :, :3], region[:, :, :3])
        region[:, :, 3:4] = np.maximum(region[:, :, 3:4], part[:, :, 3:4])
        comp = region.astype(np.uint8)
        print(f'{name}: px={npx} pivot={pivot} z={z}')
    # composite check: new parts + existing 3 parts (z-order) vs source
    for n in ['dau', 'mieng_trong', 'ham_duoi']:
        pm = np.array(Image.open(os.path.join(D, f'{P}_part_{n}.png'))
                      .convert('RGBA'))
        m = pm[:, :, 3] > 128
        comp[m, :3] = pm[m, :3]; comp[m, 3] = 255
    orig = np.zeros((H, W, 4), np.uint8)
    orig[fg_all] = np.dstack([rgb, np.full((H, W), 255)])[fg_all]
    diff = np.abs(comp.astype(np.int16) - orig.astype(np.int16))
    print('composite meanabsdiff:', round(float(diff.mean()), 4),
          '| px>40:', int((diff.max(axis=2) > 40).sum()))
    # variants for the 3 existing parts
    for n in OLD:
        im = Image.open(os.path.join(D, f'{P}_part_{n}.png')).convert('RGBA')
        variant_combat(im).save(os.path.join(D, f'{P}_part_{n}_combat.png'))
        variant_tinh_anh(im).save(os.path.join(D, f'{P}_part_{n}_tinh_anh.png'))
        print('variants for', n)
    # manifest update
    with open(MANIFEST) as f:
        man = json.load(f)
    for n in OLD:
        e = man['parts'][n]
        pm = np.array(Image.open(os.path.join(D, f'{P}_part_{n}.png'))
                      .convert('RGBA'))[:, :, 3] > 0
        e['pixels'] = int(pm.sum())
        e['variants'] = {'base': f'{P}_part_{n}.png',
                         'combat': f'{P}_part_{n}_combat.png',
                         'tinh_anh': f'{P}_part_{n}_tinh_anh.png'}
    for name, entry in jparts.items():
        man['parts'][name] = entry
    man['note'] = ('Huyet Ma Vuong - demon king, frontal. canh_trai/canh_phai = the big '
                   'flame-wing masses on both sides; duoi = bright flame tongues between '
                   'the legs; horns merged into dau. trai = screen-left.')
    with open(MANIFEST, 'w') as f:
        json.dump(man, f, ensure_ascii=False, indent=1)
    print('updated', MANIFEST)
    # preview grid
    thumbs = []
    for idx, (name, seeds, pivot, z) in enumerate(PARTS, start=1):
        pm = (labels == idx) & mask
        yy, xx = np.nonzero(pm)
        if len(xx) == 0:
            continue
        x0, x1, y0, y1 = xx.min(), xx.max(), yy.min(), yy.max()
        crop = np.dstack([rgb, np.full((H, W), 255)])[y0:y1+1, x0:x1+1].copy().astype(np.uint8)
        crop[~pm[y0:y1+1, x0:x1+1]] = (0, 0, 0, 0)
        th = Image.fromarray(crop, 'RGBA'); th.thumbnail((220, 220))
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
    grid.save('/tmp/hmv_parts_grid.png')
    print('saved /tmp/hmv_parts_grid.png')

if __name__ == '__main__':
    main()
