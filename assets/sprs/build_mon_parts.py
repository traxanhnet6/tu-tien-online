"""Segment 4 monster sprites into skeletal parts (paper-doll).
Deterministic cut from ORIGINAL images via alpha mask + geometry (rects/polys).
Every foreground pixel is assigned to exactly one part -> composite == original.
Parts: PNG, same 1600x1600 canvas, part at original position, transparent elsewhere.
"""
from PIL import Image, ImageDraw
import numpy as np
import json, os

D = '/home/hatch/workspace/game-tu-tien/v2/assets/sprs'
H = W = 1600
YY, XX = np.arange(H)[:, None], np.arange(W)[None, :]

def rect(x0, x1, y0, y1):
    return (XX >= x0) & (XX <= x1) & (YY >= y0) & (YY <= y1)

def poly(pts):
    m = Image.new('L', (W, H), 0)
    ImageDraw.Draw(m).polygon(pts, fill=255)
    return np.array(m) > 0

def bbox(m):
    ys, xs = np.nonzero(m)
    return (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())) if len(xs) else None

# ---------------- part geometry per monster ----------------
GEO = {
    # ===== OAN LINH (ghost, green, frontal) =====
    'oan_linh': {
        'tay_trai': rect(140, 730, 380, 920),
        'tay_phai': rect(880, 1460, 380, 960),
        'dau':      rect(580, 1020, 54, 520),
        'than':     rect(520, 1080, 500, 1080),
        'duoi_vai': rect(150, 1450, 1000, 1530),
    },
    # ===== MA LANG (demon wolf, purple, facing right) =====
    # trai = near side (viewer), phai = far side
    'ma_lang': {
        'chan_truoc_trai': rect(860, 1170, 900, 1400),
        'chan_truoc_phai': poly([(1250, 900), (1420, 880), (1470, 960),
                                 (1490, 1290), (1290, 1290), (1240, 1100)]),
        'chan_sau_trai':   rect(230, 460, 950, 1370),
        'chan_sau_phai':   rect(580, 930, 940, 1320),
        'duoi':            rect(100, 590, 280, 1010),
        'dau':             rect(990, 1490, 380, 970),
        # than = fallback (body, mane smoke, shadow, sparkles)
    },
    # ===== NGOC THO (jade rabbit, white, frontal) =====
    'ngoc_tho': {
        'tai_trai':        rect(380, 700, 140, 510),
        'tai_phai':        rect(900, 1230, 140, 510),
        'duoi':            rect(1130, 1400, 1080, 1380),
        'chan_truoc_trai': rect(440, 660, 960, 1230),
        'chan_truoc_phai': rect(620, 830, 960, 1230),
        'chan_sau_trai':   rect(390, 720, 1260, 1470),
        'chan_sau_phai':   rect(880, 1240, 1260, 1470),
        'dau':             rect(420, 1180, 400, 960),
        # than = fallback (torso, necklace area, shadow, sparkles)
    },
    # ===== THIEN HAC (celestial crane, white, facing left) =====
    'thien_hac': {
        'chan_trai':  rect(580, 680, 970, 1460),   # straight leg (near)
        'chan_phai':  rect(450, 830, 940, 1230),   # bent leg (far)
        'canh_trai':  rect(480, 1060, 560, 960),   # folded wing (near)
        'duoi':       rect(880, 1340, 620, 1490),  # tail plumes
        'co':         rect(460, 660, 380, 720),
        'dau':        rect(370, 620, 130, 410),
        # canh_phai: far wing hidden in side view -> empty part
        # than = fallback (body, shadow, sparkles)
    },
}

CLAIM_ORDER = {
    'oan_linh': ['tay_trai', 'tay_phai', 'dau', 'than', 'duoi_vai'],
    'ma_lang':  ['chan_truoc_trai', 'chan_truoc_phai', 'chan_sau_trai',
                 'chan_sau_phai', 'duoi', 'dau', 'than'],
    'ngoc_tho': ['tai_trai', 'tai_phai', 'duoi', 'chan_truoc_trai',
                 'chan_truoc_phai', 'chan_sau_trai', 'chan_sau_phai',
                 'dau', 'than'],
    'thien_hac': ['chan_trai', 'chan_phai', 'canh_trai', 'duoi', 'co', 'dau',
                  'than', 'canh_phai'],
}

ZORDER = {
    'oan_linh': ['duoi_vai', 'tay_trai', 'tay_phai', 'than', 'dau'],
    'ma_lang':  ['chan_truoc_phai', 'chan_sau_phai', 'duoi', 'than',
                 'chan_sau_trai', 'chan_truoc_trai', 'dau'],
    'ngoc_tho': ['duoi', 'chan_sau_trai', 'chan_sau_phai', 'than',
                 'chan_truoc_trai', 'chan_truoc_phai', 'tai_trai',
                 'tai_phai', 'dau'],
    'thien_hac': ['canh_phai', 'chan_phai', 'duoi', 'chan_trai', 'than',
                  'canh_trai', 'co', 'dau'],
}

PIVOTS = {
    'oan_linh': {
        'dau': [800, 490], 'than': [800, 720],
        'tay_trai': [640, 540], 'tay_phai': [960, 540],
        'duoi_vai': [800, 1030],
    },
    'ma_lang': {
        'dau': [1000, 700], 'than': [700, 850],
        'chan_truoc_trai': [1000, 950], 'chan_truoc_phai': [1320, 900],
        'chan_sau_trai': [350, 1000], 'chan_sau_phai': [750, 1000],
        'duoi': [520, 650],
    },
    'ngoc_tho': {
        'dau': [800, 940], 'than': [790, 1180],
        'tai_trai': [530, 480], 'tai_phai': [1070, 480],
        'chan_truoc_trai': [550, 1000], 'chan_truoc_phai': [730, 1000],
        'chan_sau_trai': [560, 1300], 'chan_sau_phai': [1050, 1300],
        'duoi': [1180, 1220],
    },
    'thien_hac': {
        'dau': [560, 390], 'co': [560, 690], 'than': [700, 800],
        'canh_trai': [620, 700], 'canh_phai': [700, 750],  # far wing hidden
        'chan_trai': [625, 990], 'chan_phai': [700, 980],
        'duoi': [980, 760],
    },
}

NOTES = {
    'ma_lang': 'trai = near side (viewer), phai = far side',
    'ngoc_tho': 'trai = viewer-left, phai = viewer-right (frontal view)',
    'thien_hac': 'canh_phai (far wing) is fully occluded in this side-view pose: empty part, pivot at far shoulder',
}

def build(mon):
    src = os.path.join(D, f'mon_{mon}.png')
    rgba = np.array(Image.open(src).convert('RGBA')).astype(np.uint8)
    fg = rgba[:, :, 3] > 0
    geo = GEO[mon]
    order = CLAIM_ORDER[mon]
    claimed = np.zeros((H, W), bool)
    masks = {}
    for name in order:
        g = geo.get(name, None)
        if g is None:  # fallback part: everything left
            m = fg & ~claimed
        else:
            m = g & fg & ~claimed
        masks[name] = m
        claimed |= m
    # leftover (should be none since fallback takes all) -> nearest centroid
    # leftover (gaps between geometry) -> nearest part MASK (distance transform:
    # wisps glue to the adjacent part, looks natural when animated)
    leftover = fg & ~claimed
    if leftover.any():
        from scipy.ndimage import distance_transform_edt
        ly, lx = np.nonzero(leftover)
        print(f'  leftover bbox: x {lx.min()}-{lx.max()} y {ly.min()}-{ly.max()} px {leftover.sum()}')
        names = [n for n in order if masks[n].any()]
        Dd = np.stack([distance_transform_edt(~masks[n]).astype(np.float32)
                       for n in names])
        best = np.argmin(Dd[:, ly, lx], axis=0)
        for i, n in enumerate(names):
            sel = best == i
            if sel.any():
                masks[n][ly[sel], lx[sel]] = True
        print(f'  leftover px reassigned: {leftover.sum()}')

    # save parts (same canvas, original position)
    for name in order:
        m = masks[name]
        out = np.dstack([rgba[:, :, :3], np.where(m, 255, 0).astype(np.uint8)])
        Image.fromarray(out, 'RGBA').save(
            os.path.join(D, f'mon_part_{mon}_{name}.png'))
    print(f'  parts: ' + ', '.join(f'{n}:{masks[n].sum()}' for n in order))

    # composite in z-order + diff vs original (RGBA exact: unassociated RGB
    # under transparent pixels is irrelevant, so compare full RGBA)
    comp = np.zeros((H, W, 4), dtype=np.int16)
    for name in ZORDER[mon]:
        m = masks[name]
        comp[m] = rgba[m]
    orig = np.array(Image.open(src).convert('RGBA')).astype(np.int16)
    diff = np.abs(comp.astype(int) - orig.astype(int)).mean(axis=2)
    mean_diff = diff.mean()
    nbig = (diff > 40).sum()
    print(f'  MEAN ABS DIFF: {mean_diff:.4f}/255 | px>40: {nbig}')
    if nbig:
        ys, xs = np.nonzero(diff > 40)
        print(f'  !! diff bbox: {(xs.min(), ys.min(), xs.max(), ys.max())}')
    comp_img = Image.fromarray(comp[:, :, :3].astype(np.uint8), 'RGB')
    comp_img.save(os.path.join(D, f'mon_part_{mon}_preview.png'))

    # JSON
    parts_json = {}
    for i, name in enumerate(ZORDER[mon]):
        parts_json[name] = {
            'file': f'mon_part_{mon}_{name}.png',
            'pivot': PIVOTS[mon][name],
            'z': i,
            'pixels': int(masks[name].sum()),
        }
    data = {
        'monster': mon,
        'canvas': {'width': W, 'height': H},
        'note': NOTES.get(mon, ''),
        'parts': parts_json,
    }
    with open(os.path.join(D, f'mon_parts_{mon}.json'), 'w') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f'  JSON saved. mean_diff={mean_diff:.4f}')

for mon in ['oan_linh', 'ma_lang', 'ngoc_tho', 'thien_hac']:
    print('===', mon, '===')
    build(mon)
print('DONE')
