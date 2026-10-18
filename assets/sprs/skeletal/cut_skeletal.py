#!/usr/bin/env python3
"""Deterministic skeletal part cutting for Tu Tien Online (PIL/scipy only).
Usage:
  python3 cut_skeletal.py --seeds   # render seed maps to /tmp for visual check
  python3 cut_skeletal.py           # full cut: parts + variants + json + preview + diff check
"""
import argparse, json, os, sys
from collections import deque
from PIL import Image, ImageDraw, ImageEnhance
import numpy as np
from scipy import ndimage

SRC = '/home/hatch/workspace/game-tu-tien/v2/assets/sprs'
OUT = '/home/hatch/workspace/game-tu-tien/v2/assets/sprs/skeletal'

# part tuple: (name, [seed(x,y), ...], pivot(x,y) canvas coords, z)
CONFIGS = {
 'boss_huyet_ma_vuong': {
   'src': 'mon_huyet_ma_vuong.png', 'note': 'Boss Huyết Ma Vương - quỷ giáp đỏ, sừng cong (sừng gộp vào dau), hào quang lửa + áo choàng gộp vào than',
   'post': [('ham_duoi', 'than', 1060)],
   'parts': [
     ('dau',      [(560, 820)],  (560, 1005), 5),
     ('ham_duoi', [(560, 960)],  (560, 935),  6),
     ('than',     [(560, 1320), (280, 1450), (840, 1450)], (560, 1200), 4),
     ('tay_trai', [(180, 1120)], (330, 1040), 3),
     ('tay_phai', [(940, 1120)], (790, 1040), 3),
     ('chan_trai',[(380, 1620)], (420, 1440), 3),
     ('chan_phai',[(740, 1620)], (700, 1440), 3),
   ]},
 'boss_thien_tuong': {
   'src': 'mon_thien_tuong.png', 'note': 'Boss Thiên Tướng - tướng giáp vàng, kiếm lớn tay trái (màn hình), hào quang lửa gộp vào than',
   'parts': [
     ('dau',      [(560, 640)],  (560, 810),  5),
     ('ham_duoi', [(560, 780)],  (560, 750),  6),
     ('than',     [(560, 1120)], (560, 1120), 4),
     ('tay_trai', [(300, 1220)], (360, 1060), 3),
     ('tay_phai', [(830, 1220), (880, 860)], (770, 1060), 3),
     ('chan_trai',[(400, 1720)], (430, 1480), 3),
     ('chan_phai',[(720, 1720)], (700, 1480), 3),
     ('vukhi',    [(240, 600)],  (300, 1150), 7),
   ]},
 'pet_ngu_trao_kim_long': {
   'src': 'pet_ngu_trao_kim_long.webp', 'note': 'Pet Ngũ Trảo Kim Long Thiên phẩm - rồng vàng cuộn, mây vàng gộp vào duoi',
   'parts': [
     ('sung',            [(390, 120), (635, 120)], (512, 190),  6),
     ('dau',             [(512, 300)],             (512, 420),  5),
     ('than',            [(512, 560)],             (512, 560),  4),
     ('chan_truoc_trai', [(300, 480)],             (330, 430),  3),
     ('chan_truoc_phai', [(700, 520)],             (670, 470),  3),
     ('chan_sau_trai',   [(330, 700)],             (360, 640),  3),
     ('chan_sau_phai',   [(690, 730)],             (660, 660),  3),
     ('duoi',            [(180, 640), (850, 600), (512, 860), (300, 860)], (440, 640), 2),
   ]},
 'pet_bach_ho': {
   'src': 'pet_bach_ho.webp', 'note': 'Pet Bạch Hổ Thiên phẩm - hổ trắng ngồi chính diện, vệt gió gộp vào part gần nhất',
   'parts': [
     ('dau',             [(512, 300)],  (512, 470),  5),
     ('than',            [(512, 620)],  (512, 620),  4),
     ('chan_truoc_trai', [(390, 800)],  (400, 700),  3),
     ('chan_truoc_phai', [(640, 800)],  (630, 700),  3),
     ('chan_sau_trai',   [(280, 700)],  (330, 660),  3),
     ('chan_sau_phai',   [(750, 700)],  (700, 660),  3),
     ('duoi',            [(800, 560)],  (720, 620),  2),
   ]},
 'pet_hoa_phuong_hoang': {
   'src': 'pet_hoa_phuong_hoang.webp', 'note': 'Pet Hỏa Phượng Hoàng Thiên phẩm - phượng lửa dang cánh, vệt lửa gộp vào part gần nhất',
   'parts': [
     ('dau',       [(512, 270)],  (512, 370),  5),
     ('than',      [(512, 460)],  (512, 460),  4),
     ('canh_trai', [(240, 290)],  (360, 420),  2),
     ('canh_phai', [(790, 290)],  (665, 420),  2),
     ('chan_trai', [(465, 555)],  (465, 530),  3),
     ('chan_phai', [(560, 555)],  (560, 530),  3),
     ('duoi_long', [(400, 700), (620, 700), (512, 900)], (512, 560), 1),
   ]},
 'pet_huyen_vu': {
   'src': 'pet_huyen_vu.webp', 'note': 'Pet Huyền Vũ Thiên phẩm - rùa mai núi, đuôi rắn quấn quanh mai, đá/orb trôi gộp vào part gần nhất',
   'parts': [
     ('dau',             [(512, 720)],  (512, 640),  5),
     ('mai',             [(512, 480)],  (512, 560),  4),
     ('chan_truoc_trai', [(300, 800)],  (330, 730),  3),
     ('chan_truoc_phai', [(730, 800)],  (700, 730),  3),
     ('chan_sau_trai',   [(260, 780)],  (300, 700),  3),
     ('chan_sau_phai',   [(770, 780)],  (740, 700),  3),
     ('duoi_ran',        [(860, 220), (700, 150), (330, 240), (180, 420), (820, 460), (250, 600)], (700, 300), 2),
   ]},
 'pet_hon_don_ky_lan': {
   'src': 'pixel_thu_hon_don_ky_lan.webp', 'note': 'Pet Hỗn Độn Kỳ Lân Thiên phẩm - kỳ lân bờm đỏ, sừng gộp vào dau, hào quang lửa gộp vào than, nền trắng tách theo mask',
   'parts': [
     ('dau',             [(800, 620)],   (800, 950),   5),
     ('than',            [(800, 1150)],  (800, 1150),  4),
     ('chan_truoc_trai', [(585, 1480)],  (580, 1300),  3),
     ('chan_truoc_phai', [(750, 1500)],  (770, 1310),  3),
     ('chan_sau_trai',   [(940, 1490)],  (950, 1300),  3),
     ('chan_sau_phai',   [(1135, 1490)], (1120, 1300), 3),
     ('duoi',            [(1350, 1080)], (1230, 1080), 2),
   ]},
}

def load_source(path):
    im = Image.open(path)
    a = np.array(im.convert('RGBA'))
    if im.mode == 'RGB' or (a[:, :, 3] == 255).all():
        rgb = a[:, :, :3].astype(np.int16)
        mask = (255 - rgb.max(axis=2)) > 25
    else:
        mask = a[:, :, 3] > 128
    # drop tiny specks
    lab, n = ndimage.label(mask)
    sizes = np.bincount(lab.ravel())
    keep = sizes >= 40
    keep[0] = False
    mask = keep[lab]
    return a, mask

def segment(mask, parts):
    """Seeded region growing restricted to mask; unseeded blobs -> nearest seed part.
    Runs at half resolution (pixel-art safe), then nearest-upscales labels.
    Deterministic multi-source BFS: ties go to the lower part index."""
    h, w = mask.shape
    # half-res max-pool of mask
    mh = (h + 1) // 2; mw = (w + 1) // 2
    m2 = mask[:mh * 2, :mw * 2].reshape(mh, 2, mw, 2).max(axis=(1, 3))
    markers = np.zeros((mh, mw), dtype=np.int32)
    seed_xy = []
    ys_all, xs_all = np.nonzero(m2)
    pts = np.stack([xs_all, ys_all], 1)
    # big-component map: seeds must land on a sizable component, never on a
    # tiny isolated fragment (armor has see-through holes/cutouts)
    lab_hr, _ = ndimage.label(m2)
    _sizes = np.bincount(lab_hr.ravel()); _sizes[0] = 0
    _big = _sizes >= 400
    big_pts = pts[_big[lab_hr[ys_all, xs_all]]]
    def nudge(qx, qy):
        if m2[qy, qx] and _big[lab_hr[qy, qx]]:
            return qx, qy
        d = ((big_pts - (qx, qy)) ** 2).sum(axis=1)
        j = int(np.argmin(d))
        return int(big_pts[j][0]), int(big_pts[j][1])
    for i, (name, seeds, pivot, z) in enumerate(parts, start=1):
        for (sx, sy) in seeds:
            qx, qy = min(max(int(sx) // 2, 0), mw - 1), min(max(int(sy) // 2, 0), mh - 1)
            qx, qy = nudge(qx, qy)
            markers[qy, qx] = i
            seed_xy.append((i, sx, sy))  # full-res coords for blob assignment
    labels = np.zeros((mh, mw), dtype=np.int32)
    # Exact deterministic multi-source BFS (4-connectivity) on the mask.
    # Seeds are enqueued in part-index order, so ties go to the lower index.
    seen = np.zeros((mh, mw), dtype=bool)
    dq = deque()
    for i, (name, seeds, pivot, z) in enumerate(parts, start=1):
        for (sx, sy) in seeds:
            qx, qy = min(max(int(sx) // 2, 0), mw - 1), min(max(int(sy) // 2, 0), mh - 1)
            qx, qy = nudge(qx, qy)
            if not seen[qy, qx]:
                seen[qy, qx] = True
                labels[qy, qx] = i
                dq.append((qx, qy, i))
    W = mw
    m2f = m2
    while dq:
        x, y, lab = dq.popleft()
        # unrolled 4-neighbourhood
        nx = x + 1
        if nx < W and m2f[y, nx] and not seen[y, nx]:
            seen[y, nx] = True; labels[y, nx] = lab; dq.append((nx, y, lab))
        nx = x - 1
        if nx >= 0 and m2f[y, nx] and not seen[y, nx]:
            seen[y, nx] = True; labels[y, nx] = lab; dq.append((nx, y, lab))
        ny = y + 1
        if ny < mh and m2f[ny, x] and not seen[ny, x]:
            seen[ny, x] = True; labels[ny, x] = lab; dq.append((x, ny, lab))
        ny = y - 1
        if ny >= 0 and m2f[ny, x] and not seen[ny, x]:
            seen[ny, x] = True; labels[ny, x] = lab; dq.append((x, ny, lab))
    # nearest-upscale to full res
    full = np.repeat(np.repeat(labels, 2, axis=0), 2, axis=1)[:h, :w].astype(np.int32)
    full[~mask] = 0
    # assign unseeded blobs (full-res connected components with label 0)
    lab0, n0 = ndimage.label((full == 0) & mask)
    if n0:
        seeds_arr = np.array([(x, y) for _, x, y in seed_xy])
        sidx = np.array([i for i, _, _ in seed_xy])
        for c in range(1, n0 + 1):
            yy, xx = np.nonzero(lab0 == c)
            cx, cy = xx.mean(), yy.mean()
            d = ((seeds_arr - (cx, cy)) ** 2).sum(axis=1)
            full[lab0 == c] = int(sidx[int(np.argmin(d))])
    return full

def overlay(img, color, frac):
    a = np.array(img).astype(np.float32)
    rgb, al = a[:, :, :3], a[:, :, 3:4]
    m = (al > 0).astype(np.float32)
    c = np.array(color, dtype=np.float32).reshape(1, 1, 3)
    rgb = rgb * (1 - frac * m) + c * (frac * m)
    a[:, :, :3] = np.clip(rgb, 0, 255)
    return Image.fromarray(a.astype(np.uint8))

def variant_combat(img):
    out = overlay(img, (255, 30, 20), 0.25)
    return ImageEnhance.Color(out).enhance(1.3)

def variant_tinh_anh(img):
    out = overlay(img, (255, 200, 60), 0.25)
    return ImageEnhance.Brightness(out).enhance(1.1)

def checker(w, h, s=32):
    t = np.zeros((h, w, 3), np.uint8)
    yy, xx = np.mgrid[0:h, 0:w]
    t[((xx // s) + (yy // s)) % 2 == 0] = (200, 200, 200)
    t[((xx // s) + (yy // s)) % 2 == 1] = (120, 120, 120)
    return Image.fromarray(t)

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--seeds', action='store_true')
    args = ap.parse_args()
    os.makedirs('/tmp/seeds', exist_ok=True)
    for prefix, cfg in CONFIGS.items():
        src_path = os.path.join(SRC, cfg['src'])
        rgba, mask = load_source(src_path)
        h, w = mask.shape
        if args.seeds:
            vis = Image.fromarray(rgba).convert('RGB').resize((w // 2, h // 2))
            dr = ImageDraw.Draw(vis)
            for i, (name, seeds, pivot, z) in enumerate(cfg['parts']):
                for k, (sx, sy) in enumerate(seeds):
                    x, y = sx // 2, sy // 2
                    dr.ellipse([x - 7, y - 7, x + 7, y + 7], fill=(0, 255, 0), outline=(0, 0, 0))
                    if k == 0: dr.text((x + 9, y - 6), name, fill=(255, 255, 0))
                px, py = pivot[0] // 2, pivot[1] // 2
                dr.line([px - 8, py, px + 8, py], fill=(255, 0, 0), width=2)
                dr.line([px, py - 8, px, py + 8], fill=(255, 0, 0), width=2)
            vis.save(f'/tmp/seeds/{prefix}.png')
            print('seed map:', prefix)
            continue
        labels = segment(mask, cfg['parts'])
        # post-cuts: (from_part, to_part, y_limit) reassign from_part pixels below y_limit
        _n2i = {name: i + 1 for i, (name, _, _, _) in enumerate(cfg['parts'])}
        for frm, to, ylim in cfg.get('post', []):
            fi, ti = _n2i[frm], _n2i[to]
            _yy, _xx = np.nonzero(labels == fi)
            _sel = _yy > ylim
            labels[_yy[_sel], _xx[_sel]] = ti
        odir = os.path.join(OUT, prefix); os.makedirs(odir, exist_ok=True)
        # composite check canvas
        comp = np.zeros((h, w, 4), dtype=np.float32)
        jparts = {}
        order = sorted(enumerate(cfg['parts'], start=1), key=lambda t: t[1][3])
        for idx, (name, seeds, pivot, z) in order:
            pm = labels == idx
            yy, xx = np.nonzero(pm)
            x0, x1, y0, y1 = xx.min(), xx.max(), yy.min(), yy.max()
            crop = rgba[y0:y1 + 1, x0:x1 + 1].copy()
            crop[~pm[y0:y1 + 1, x0:x1 + 1]] = (0, 0, 0, 0)
            part_img = Image.fromarray(crop)
            base = f'{prefix}_part_{name}.png'
            part_img.save(os.path.join(odir, base))
            variant_combat(part_img).save(os.path.join(odir, f'{prefix}_part_{name}_combat.png'))
            variant_tinh_anh(part_img).save(os.path.join(odir, f'{prefix}_part_{name}_tinh_anh.png'))
            pl = [int(pivot[0] - x0), int(pivot[1] - y0)]
            jparts[name] = {'file': base, 'bbox': [int(x0), int(y0), int(x1 - x0 + 1), int(y1 - y0 + 1)],
                            'offset': [int(x0), int(y0)], 'pivot': pl, 'z': z,
                            'variants': {'base': base, 'combat': f'{prefix}_part_{name}_combat.png',
                                         'tinh_anh': f'{prefix}_part_{name}_tinh_anh.png'}}
            # alpha composite onto canvas
            fg = crop.astype(np.float32); fa = fg[:, :, 3:4] / 255.0
            region = comp[y0:y1 + 1, x0:x1 + 1]
            region[:, :, :3] = fg[:, :, :3] * fa + region[:, :, :3] * (1 - fa)
            region[:, :, 3:4] = np.maximum(region[:, :, 3:4], fg[:, :, 3:4])
        comp = np.clip(comp, 0, 255).astype(np.uint8)
        orig = rgba.copy(); orig[~mask] = (0, 0, 0, 0)
        diff = np.abs(comp.astype(np.int16) - orig.astype(np.int16)).mean() / 255.0
        nparts = len(cfg['parts'])
        with open(os.path.join(odir, f'{prefix}_parts.json'), 'w') as f:
            json.dump({'prefix': prefix, 'source': cfg['src'], 'canvas': {'w': w, 'h': h},
                       'note': cfg['note'],
                       'pivot_convention': 'pivot=[x,y] local trong PNG part: dau=co, ham_duoi=khop ham, chan/tay=vai/hong, canh=goc canh, duoi=goc duoi; bien the mau dung chung pivot',
                       'parts': jparts}, f, ensure_ascii=False, indent=1)
        # preview: composite + part grid
        bg = checker(w, h); bg.paste(Image.fromarray(comp), (0, 0), Image.fromarray(comp))
        thumbs = []
        for idx, (name, seeds, pivot, z) in enumerate(cfg['parts'], start=1):
            pm = labels == idx
            yy, xx = np.nonzero(pm)
            x0, x1, y0, y1 = xx.min(), xx.max(), yy.min(), yy.max()
            crop = rgba[y0:y1 + 1, x0:x1 + 1].copy(); crop[~pm[y0:y1 + 1, x0:x1 + 1]] = (0, 0, 0, 0)
            th = Image.fromarray(crop); th.thumbnail((220, 220))
            cell = checker(240, 260); cell.paste(th, (10, 10), th)
            dr = ImageDraw.Draw(cell)
            _s = min(220 / max(crop.shape[1], 1), 220 / max(crop.shape[0], 1))
            _px, _py = int((pivot[0] - x0) * _s + 10), int((pivot[1] - y0) * _s + 10)
            dr.line([_px - 7, _py, _px + 7, _py], fill=(255, 0, 0), width=2)
            dr.line([_px, _py - 7, _px, _py + 7], fill=(255, 0, 0), width=2)
            dr.text((10, 238), f'{name} z{z}', fill=(0, 0, 0))
            thumbs.append(cell)
        cols = 4; rows = (len(thumbs) + cols - 1) // cols
        grid = Image.new('RGB', (cols * 240, rows * 260), (40, 40, 40))
        for i, t in enumerate(thumbs): grid.paste(t, ((i % cols) * 240, (i // cols) * 260))
        pv_w = 520
        bg_small = bg.resize((pv_w, int(pv_w * h / w)))
        prev = Image.new('RGB', (max(pv_w, cols * 240), bg_small.height + 20 + grid.height), (30, 30, 30))
        prev.paste(bg_small, (0, 0)); prev.paste(grid, (0, bg_small.height + 20))
        prev.save(os.path.join(odir, f'preview_{prefix}.png'))
        print(f'{prefix}: parts={nparts} files={nparts*3} composite_diff={diff:.4f}/255 {"OK" if diff < 5/255 else "FAIL"}')

if __name__ == '__main__':
    main()
