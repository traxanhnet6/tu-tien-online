"""Skeletal segmentation for 3 priority targets (Tu Tien Online).
Deterministic cut from ORIGINAL art via alpha mask + geometry/color filters.
Every foreground pixel -> exactly one part -> composite == original.

Targets / prefixes:
  boss_hac_long        <- hac_long_combat.png   (1600x1600)
  boss_u_minh_cu_mang  <- boss_u_minh_cu_mang.png (1600x1600)
  pet_thanh_long       <- pet_thanh_long_down.png (1600x1600)

Per part: base PNG + _combat (red 25% + sat x1.3) + _tinh_anh (gold 25% + bright x1.1).
JSON: <prefix>_parts.json with pivots, z-order, variant notes.
"""
from PIL import Image, ImageDraw, ImageEnhance
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

# ---------------- geometry ----------------
# Hac Long (frontal boss; ham_duoi reused from mouth-task file)
HL = {
    'src': 'hac_long_combat.png',
    'geo': {
        'sung': poly([(470,360),(650,360),(630,110),(565,95),(480,160)])
               | poly([(950,360),(1130,360),(1120,160),(1035,95),(970,110)])
               | rect(650, 950, 180, 300),
        'canh_trai': rect(0, 660, 0, 560),
        'canh_phai': rect(940, 1600, 0, 560),
        'dau': rect(500, 1100, 240, 640),
        'chan_truoc_trai': rect(380, 640, 800, 1200),
        'chan_truoc_phai': rect(960, 1240, 800, 1200),
        'than_1': rect(560, 1040, 600, 980),
        # lua_phun: color filter, defined in filters below
        'than_2': None,  # fallback
    },
    'reuse': {'ham_duoi': 'boss_part_hac_long_ham_duoi.png'},
    'claim': ['sung', 'canh_trai', 'canh_phai', 'dau', 'ham_duoi',
              'chan_truoc_trai', 'chan_truoc_phai', 'lua_phun',
              'than_1', 'than_2'],
    'z': ['canh_trai', 'canh_phai', 'than_2', 'chan_truoc_trai',
          'chan_truoc_phai', 'sung', 'than_1', 'dau', 'ham_duoi', 'lua_phun'],
    'pivot': {
        'sung': [800, 300], 'canh_trai': [620, 420], 'canh_phai': [980, 420],
        'dau': [800, 600], 'ham_duoi': [800, 700],
        'chan_truoc_trai': [510, 900], 'chan_truoc_phai': [1090, 900],
        'than_1': [800, 800], 'than_2': [800, 1150], 'lua_phun': [800, 700],
    },
    'note': ('Hac Long frontal boss. ham_duoi reused from mouth-task cut '
             '(boss_part_hac_long_ham_duoi.png, RGB-identical). lua_phun = fire '
             'breath, segmented by color (bright purple R>110&B>110 within '
             'central zone), claimed after ham_duoi so the jaw keeps the '
             'flame base. than_2 = smoke/wisps/lower flames (fallback).'),
}

# U Minh Cu Mang (coiled snake; ham_duoi reused)
UM = {
    'src': 'boss_u_minh_cu_mang.png',
    'geo': {
        'dau': rect(510, 1090, 210, 880),   # head + red tongue (tongue ~y860)
        'than_1': rect(150, 1450, 330, 640),  # upper arc behind/under head
        'duoi': poly([(1230,1400),(1420,1380),(1330,1600),(1200,1570)]),
        'than_2': rect(100, 1500, 600, 1100),  # middle coils
        'than_3': None,  # fallback: outer coils + smoke
    },
    'reuse': {'ham_duoi': 'boss_part_u_minh_cu_mang_ham_duoi.png'},
    'claim': ['ham_duoi', 'dau', 'than_1', 'duoi', 'than_2', 'than_3'],
    'z': ['than_3', 'duoi', 'than_2', 'than_1', 'dau', 'ham_duoi'],
    'pivot': {
        'dau': [800, 640], 'ham_duoi': [820, 660],
        'than_1': [800, 480], 'than_2': [800, 850], 'than_3': [800, 1100],
        'duoi': [1300, 1420],
    },
    'note': ('U Minh Cu Mang coiled snake. ham_duoi reused from mouth-task cut '
             '(boss_part_u_minh_cu_mang_ham_duoi.png, RGB-identical), claimed '
             'BEFORE dau so the jaw is not eaten by the head rect. dau includes '
             'the red tongue. duoi = tapering tail tip (bottom-right coil). '
             'than_3 = outer coils + smoke wisps (fallback).'),
}

# Thanh Long (pet dragon, frontal coiled)
TL = {
    'src': 'pet_thanh_long_down.png',
    'geo': {
        'sung': rect(540, 1060, 20, 300),          # antler horns
        'rau_trai': rect(250, 700, 270, 470),      # left whisker
        'rau_phai': rect(900, 1360, 270, 470),     # right whisker
        'ham_duoi': rect(660, 940, 520, 700),      # mouth/chin (closed mouth)
        'dau': rect(590, 1010, 330, 680),
        'chan_truoc_trai': rect(430, 680, 1140, 1300),
        'chan_truoc_phai': rect(990, 1230, 1140, 1300),
        'duoi': poly([(850,1100),(1050,1050),(1330,1180),
                      (1290,1600),(860,1600),(800,1350)]),  # feathered tail
        'than_1': rect(150, 1450, 540, 940),       # upper coil band
        'than_2': None,  # fallback: lower coil + clouds + lightning + leaves
    },
    'reuse': {},
    'claim': ['sung', 'rau_trai', 'rau_phai', 'ham_duoi', 'dau',
              'chan_truoc_trai', 'chan_truoc_phai', 'duoi',
              'than_1', 'than_2'],
    'z': ['than_2', 'chan_truoc_trai', 'chan_truoc_phai', 'duoi', 'than_1',
          'rau_trai', 'rau_phai', 'dau', 'ham_duoi', 'sung'],
    'pivot': {
        'sung': [800, 280], 'dau': [800, 620], 'ham_duoi': [800, 640],
        'rau_trai': [660, 400], 'rau_phai': [940, 400],
        'chan_truoc_trai': [555, 1200], 'chan_truoc_phai': [1110, 1200],
        'than_1': [800, 750], 'than_2': [800, 1150], 'duoi': [1050, 1150],
    },
    'note': ('Thanh Long pet (frontal coiled dragon). ham_duoi = mouth/chin area '
             '(closed mouth), claimed before dau. Only 2 clawed feet visible '
             'in this pose (no chan_sau). duoi = feathered tail fin. than_2 = '
             'lower coil + clouds + lightning bolts + leaves (fallback).'),
}

TARGETS = {'boss_hac_long': HL, 'boss_u_minh_cu_mang': UM, 'pet_thanh_long': TL}

# ---------------- color variants ----------------
def variant_combat(img):
    # red overlay 25% + saturation x1.3
    im = ImageEnhance.Color(img).enhance(1.3)
    a = np.array(im).astype(np.float32)
    red = np.array([255, 40, 40], np.float32)
    a[:, :, :3] = a[:, :, :3] * 0.75 + red * 0.25
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGBA')

def variant_tinh_anh(img):
    # gold overlay 25% + brightness x1.1
    im = ImageEnhance.Brightness(img).enhance(1.1)
    a = np.array(im).astype(np.float32)
    gold = np.array([255, 205, 60], np.float32)
    a[:, :, :3] = a[:, :, :3] * 0.75 + gold * 0.25
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGBA')

def lua_filter(fg, rgba):
    R, G, B = (rgba[:, :, i].astype(int) for i in range(3))
    zone = np.zeros_like(fg)
    zone[690:1330, 660:940] = True
    return zone & fg & (R > 110) & (B > 110) & (R + B > 260)

def build(prefix, T):
    src = os.path.join(D, T['src'])
    rgba = np.array(Image.open(src).convert('RGBA')).astype(np.uint8)
    fg = rgba[:, :, 3] > 0
    geo, order = T['geo'], T['claim']
    masks, claimed = {}, np.zeros((H, W), bool)
    for name in order:
        if name in T.get('reuse', {}):
            rm = (np.array(Image.open(os.path.join(D, T['reuse'][name]))
                   .convert('RGBA'))[:, :, 3] > 0)
            assert rm.shape == fg.shape, f'reuse shape mismatch {name}'
            assert np.array_equal(
                rgba[rm][:, :3],
                np.array(Image.open(os.path.join(D, T['reuse'][name]))
                         .convert('RGBA')).astype(np.uint8)[rm][:, :3]
            ), f'reuse RGB mismatch {name}'
            m = rm & fg & ~claimed
        elif name == 'lua_phun':
            m = lua_filter(fg, rgba) & ~claimed
        elif geo.get(name) is None:  # fallback: everything left
            m = fg & ~claimed
        else:
            m = geo[name] & fg & ~claimed
        masks[name] = m
        claimed |= m
    # leftover -> nearest part mask (distance transform)
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

    # save parts + variants
    variants = {'': lambda im: im, '_combat': variant_combat,
                '_tinh_anh': variant_tinh_anh}
    files = {}
    for name in order:
        m = masks[name]
        base = np.dstack([rgba[:, :, :3],
                          np.where(m, 255, 0).astype(np.uint8)])
        bimg = Image.fromarray(base, 'RGBA')
        for suf, fn in variants.items():
            fn_ = f'{prefix}_part_{name}{suf}.png'
            fn(bimg).save(os.path.join(D, fn_))
        files[name] = f'{prefix}_part_{name}.png'
    print('  parts: ' + ', '.join(f'{n}:{masks[n].sum()}' for n in order))

    # composite per variant in z-order + diff
    orig = rgba.astype(np.int16)
    diffs = {}
    for suf in variants:
        comp = np.zeros((H, W, 4), dtype=np.int16)
        for name in T['z']:
            m = masks[name]
            if suf == '':
                comp[m] = rgba[m]
            else:
                v = np.array(Image.open(
                    os.path.join(D, f'{prefix}_part_{name}{suf}.png'))
                    .convert('RGBA')).astype(np.int16)
                comp[m] = v[m]
        if suf == '':
            ref = orig
        else:  # variant composite must equal color-transform(base composite)
            b = Image.fromarray(
                np.dstack([rgba[:, :, :3],
                           np.where(fg, 255, 0).astype(np.uint8)]), 'RGBA')
            ref = np.array(variants[suf](b)).astype(np.int16)
        d = np.abs(comp.astype(int) - ref.astype(int)).mean(axis=2)
        diffs[suf or 'base'] = (float(d.mean()), int((d > 40).sum()))
    for k, (md, nb) in diffs.items():
        print(f'  diff[{k}]: mean {md:.4f}/255, px>40: {nb}')

    # previews: base composite + 3-variant strip
    comp_rgb = np.zeros((H, W, 3), np.uint8)
    for name in T['z']:
        comp_rgb[masks[name]] = rgba[masks[name]][:, :3]
    Image.fromarray(comp_rgb).save(os.path.join(D, f'{prefix}_preview.png'))
    strip = Image.new('RGB', (W * 3, H), (20, 20, 20))
    for i, suf in enumerate(['', '_combat', '_tinh_anh']):
        comp = np.zeros((H, W, 3), np.uint8)
        for name in T['z']:
            p = np.array(Image.open(
                os.path.join(D, f'{prefix}_part_{name}{suf}.png'))
                .convert('RGBA'))
            pm = p[:, :, 3] > 0
            comp[pm] = p[pm][:, :3]
        strip.paste(Image.fromarray(comp), (i * W, 0))
    strip.save(os.path.join(D, f'{prefix}_preview_variants.png'))

    # JSON
    parts_json = {}
    for i, name in enumerate(T['z']):
        parts_json[name] = {
            'file': files[name],
            'file_combat': f'{prefix}_part_{name}_combat.png',
            'file_tinh_anh': f'{prefix}_part_{name}_tinh_anh.png',
            'pivot': T['pivot'][name],
            'z': i,
            'pixels': int(masks[name].sum()),
        }
    data = {'target': prefix, 'canvas': {'width': W, 'height': H},
            'source': T['src'], 'note': T['note'],
            'variants_note': ('_combat: red overlay 25% + saturation x1.3; '
                              '_tinh_anh: gold overlay 25% + brightness x1.1. '
                              'All variants share the same pivot and z-order.'),
            'parts': parts_json}
    with open(os.path.join(D, f'{prefix}_parts.json'), 'w') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f'  JSON saved.')
    return diffs, {n: int(masks[n].sum()) for n in order}

totals = {}
for prefix, T in TARGETS.items():
    print('===', prefix, '===')
    diffs, px = build(prefix, T)
    totals[prefix] = (diffs, px)
print('DONE')
