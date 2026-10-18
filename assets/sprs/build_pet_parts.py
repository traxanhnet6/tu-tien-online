"""Segment 12 linh thu (pet) sprites into skeletal parts (paper-doll).
Deterministic cut from ORIGINAL pet_<ten>.webp via alpha mask + geometry.
Every foreground pixel is assigned to exactly one part -> composite == original.
Per part: 3 color variants (base / _combat / _tinh_anh) via PIL only.
Output:
  pet_<ten>_part_<bophan>.png (+ _combat / _tinh_anh variants), same 1024x1024 canvas
  pet_parts_<ten>.json (canvas, note, parts: file, pivot, z, pixels, variants)
  pet_part_<ten>_preview.png (composite in z-order)
"""
from PIL import Image, ImageEnhance
import numpy as np
from scipy.ndimage import distance_transform_edt, label
import json, os

D = '/home/hatch/workspace/game-tu-tien/v2/assets/sprs'
H = W = 1024
YY, XX = np.arange(H)[:, None], np.arange(W)[None, :]

def rect(x0, x1, y0, y1):
    return (XX >= x0) & (XX <= x1) & (YY >= y0) & (YY <= y1)

def bbox(m):
    ys, xs = np.nonzero(m)
    return (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())) if len(xs) else None

# ---------------- part geometry per pet (rects in 1024x1024) ----------------
GEO = {
    # ===== BICH THUY GIAO (water dragon, coiled) =====
    'bich_thuy_giao': {
        'ham_duoi': rect(330, 705, 465, 585),
        'dau':      rect(215, 835, 40, 560),
        'than_1':   rect(150, 880, 560, 752),
        'duoi':     rect(300, 730, 815, 990),
        'than_2':   rect(150, 880, 752, 885),
        # than = fallback (belly column, coils, water splash deco)
    },
    # ===== TU DIEN DIEU (electric marten) =====
    'tu_dien_dieu': {
        'dau':             rect(140, 720, 100, 610),
        'duoi':            rect(680, 975, 380, 905),
        'chan_truoc_trai': rect(280, 430, 690, 940),
        'chan_truoc_phai': rect(430, 590, 690, 940),
        'chan_sau_trai':   rect(140, 300, 690, 915),
        'chan_sau_phai':   rect(560, 710, 690, 915),
        # than = fallback
    },
    # ===== HAN NGOC THO (jade rabbit) =====
    'han_ngoc_tho': {
        'tai_trai':        rect(190, 430, 40, 400),
        'tai_phai':        rect(600, 840, 40, 400),
        'dau':             rect(280, 750, 340, 705),
        'duoi':            rect(690, 865, 730, 905),
        'chan_truoc_trai': rect(350, 480, 700, 885),
        'chan_truoc_phai': rect(520, 650, 700, 885),
        'chan_sau_trai':   rect(280, 430, 770, 955),
        'chan_sau_phai':   rect(610, 760, 770, 955),
        # than = fallback (torso, ice mist)
    },
    # ===== PHONG DUC UNG (wind eagle, spread wings) =====
    'phong_duc_ung': {
        'dau':       rect(280, 750, 25, 585),
        'canh_trai': rect(45, 405, 385, 785),
        'canh_phai': rect(620, 985, 385, 785),
        'duoi':      rect(405, 625, 845, 985),
        'chan':      rect(295, 725, 805, 940),
        # than = fallback
    },
    # ===== DOC NHA MANG (venom cobra, coiled) =====
    'doc_nha_mang': {
        'ham_duoi': rect(310, 725, 520, 715),
        'dau':      rect(200, 830, 50, 550),
        'than_1':   rect(180, 850, 640, 768),
        'duoi':     rect(345, 605, 815, 968),
        'than_2':   rect(180, 850, 768, 872),
        'than_3':   rect(180, 850, 872, 988),
        # than = fallback (poison mist deco)
    },
    # ===== QUANG MINH LOC (light deer) =====
    'quang_minh_loc': {
        'sung':            rect(225, 805, 25, 335),
        'dau':             rect(225, 805, 275, 645),
        'duoi':            rect(775, 925, 555, 765),
        'chan_truoc_trai': rect(340, 470, 795, 995),
        'chan_truoc_phai': rect(480, 610, 795, 995),
        'chan_sau_trai':   rect(615, 750, 775, 970),
        'chan_sau_phai':   rect(725, 865, 795, 970),
        # than = fallback
    },
    # ===== THANH PHONG LANG (wind wolf) =====
    'thanh_phong_lang': {
        'dau':             rect(170, 850, 110, 565),
        'duoi':            rect(675, 970, 555, 865),
        'chan_truoc_trai': rect(330, 470, 675, 930),
        'chan_truoc_phai': rect(490, 630, 675, 930),
        'chan_sau_trai':   rect(235, 370, 695, 925),
        'chan_sau_phai':   rect(600, 730, 695, 925),
        # than = fallback
    },
    # ===== LINH VI HO (spirit fox, sitting) =====
    # chan sau trai khuat sau than trong art mat truoc -> part rong
    'linh_vi_ho': {
        'dau':             rect(150, 710, 100, 615),
        'duoi':            rect(665, 1000, 145, 905),
        'chan_truoc_trai': rect(220, 365, 715, 960),
        'chan_truoc_phai': rect(365, 545, 715, 960),
        'chan_sau_trai':   None,
        'chan_sau_phai':   rect(545, 710, 715, 955),
        # than = fallback
    },
    # ===== THIET GIAP QUY (iron-shell turtle) =====
    'thiet_giap_quy': {
        'dau':             rect(300, 740, 355, 645),
        'mai':             rect(150, 880, 60, 645),
        'duoi':            rect(445, 605, 825, 965),
        'chan_truoc_trai': rect(265, 470, 585, 815),
        'chan_truoc_phai': rect(565, 775, 585, 815),
        'chan_sau_trai':   rect(185, 415, 785, 960),
        'chan_sau_phai':   rect(625, 855, 785, 960),
        # than = fallback (under-shell body)
    },
    # ===== XICH HOA THU (fire fox) =====
    'xich_hoa_thu': {
        'dau':             rect(180, 850, 40, 665),
        'duoi':            rect(735, 965, 375, 875),
        'chan_truoc_trai': rect(320, 470, 685, 915),
        'chan_truoc_phai': rect(520, 670, 685, 915),
        'chan_sau_trai':   rect(275, 445, 825, 955),
        'chan_sau_phai':   rect(535, 705, 825, 955),
        # than = fallback
    },
    # ===== BICH NHAN NHA (blue-eyed spider, 8 legs) =====
    # 4 chan moi ben: chan_1 chum long tren, chan_2/3/4 chia deu chum long duoi
    'bich_nhan_nha': {
        'dau':         rect(190, 840, 235, 625),
        'chan_trai_1': rect(40, 425, 40, 335),
        'chan_trai_2': rect(40, 425, 330, 575),
        'chan_trai_3': rect(40, 425, 570, 745),
        'chan_trai_4': rect(40, 525, 740, 965),
        'chan_phai_1': rect(605, 990, 40, 335),
        'chan_phai_2': rect(605, 990, 330, 575),
        'chan_phai_3': rect(605, 990, 570, 745),
        'chan_phai_4': rect(505, 990, 740, 965),
        # than = fallback; khong co duoi trong art
    },
    # ===== NHAM THACH HUNG (rock bear) =====
    # duoi: khong co duoi ro trong art mat truoc -> part rong (pivot o lung duoi)
    'nham_thach_hung': {
        'dau':             rect(265, 765, 65, 585),
        'duoi':            None,
        'chan_truoc_trai': rect(180, 430, 615, 885),
        'chan_truoc_phai': rect(600, 850, 615, 885),
        'chan_sau_trai':   rect(245, 445, 855, 1000),
        'chan_sau_phai':   rect(585, 785, 855, 1000),
        # than = fallback (gom ca tinh the tren vai)
    },
}

CLAIM_ORDER = {
    'bich_thuy_giao': ['ham_duoi', 'dau', 'than_1', 'duoi', 'than_2', 'than'],
    'tu_dien_dieu': ['dau', 'duoi', 'chan_truoc_trai', 'chan_truoc_phai',
                     'chan_sau_trai', 'chan_sau_phai', 'than'],
    'han_ngoc_tho': ['tai_trai', 'tai_phai', 'dau', 'duoi',
                     'chan_truoc_trai', 'chan_truoc_phai',
                     'chan_sau_trai', 'chan_sau_phai', 'than'],
    'phong_duc_ung': ['dau', 'canh_trai', 'canh_phai', 'duoi', 'chan', 'than'],
    'doc_nha_mang': ['ham_duoi', 'dau', 'than_1', 'duoi', 'than_2', 'than_3', 'than'],
    'quang_minh_loc': ['sung', 'dau', 'duoi', 'chan_truoc_trai', 'chan_truoc_phai',
                       'chan_sau_trai', 'chan_sau_phai', 'than'],
    'thanh_phong_lang': ['dau', 'duoi', 'chan_truoc_trai', 'chan_truoc_phai',
                         'chan_sau_trai', 'chan_sau_phai', 'than'],
    'linh_vi_ho': ['dau', 'duoi', 'chan_truoc_trai', 'chan_truoc_phai',
                   'chan_sau_trai', 'chan_sau_phai', 'than'],
    'thiet_giap_quy': ['dau', 'mai', 'duoi', 'chan_truoc_trai', 'chan_truoc_phai',
                       'chan_sau_trai', 'chan_sau_phai', 'than'],
    'xich_hoa_thu': ['dau', 'duoi', 'chan_truoc_trai', 'chan_truoc_phai',
                     'chan_sau_trai', 'chan_sau_phai', 'than'],
    'bich_nhan_nha': ['dau', 'chan_trai_1', 'chan_trai_2', 'chan_trai_3',
                      'chan_trai_4', 'chan_phai_1', 'chan_phai_2',
                      'chan_phai_3', 'chan_phai_4', 'than'],
    'nham_thach_hung': ['dau', 'duoi', 'chan_truoc_trai', 'chan_truoc_phai',
                        'chan_sau_trai', 'chan_sau_phai', 'than'],
}

ZORDER = {
    'bich_thuy_giao': ['duoi', 'than_2', 'than_1', 'than', 'ham_duoi', 'dau'],
    'tu_dien_dieu': ['duoi', 'chan_sau_trai', 'chan_sau_phai', 'than',
                     'chan_truoc_trai', 'chan_truoc_phai', 'dau'],
    'han_ngoc_tho': ['duoi', 'chan_sau_trai', 'chan_sau_phai', 'than',
                     'chan_truoc_trai', 'chan_truoc_phai',
                     'tai_trai', 'tai_phai', 'dau'],
    'phong_duc_ung': ['duoi', 'canh_trai', 'canh_phai', 'chan', 'than', 'dau'],
    'doc_nha_mang': ['duoi', 'than_3', 'than_2', 'than_1', 'than', 'ham_duoi', 'dau'],
    'quang_minh_loc': ['duoi', 'chan_sau_trai', 'chan_sau_phai', 'than',
                       'chan_truoc_trai', 'chan_truoc_phai', 'sung', 'dau'],
    'thanh_phong_lang': ['duoi', 'chan_sau_trai', 'chan_sau_phai', 'than',
                         'chan_truoc_trai', 'chan_truoc_phai', 'dau'],
    'linh_vi_ho': ['duoi', 'chan_sau_trai', 'chan_sau_phai', 'than',
                   'chan_truoc_trai', 'chan_truoc_phai', 'dau'],
    'thiet_giap_quy': ['duoi', 'chan_sau_trai', 'chan_sau_phai', 'than',
                       'chan_truoc_trai', 'chan_truoc_phai', 'mai', 'dau'],
    'xich_hoa_thu': ['duoi', 'chan_sau_trai', 'chan_sau_phai', 'than',
                     'chan_truoc_trai', 'chan_truoc_phai', 'dau'],
    'bich_nhan_nha': ['chan_trai_1', 'chan_phai_1', 'chan_trai_2', 'chan_phai_2',
                      'chan_trai_3', 'chan_phai_3', 'chan_trai_4', 'chan_phai_4',
                      'than', 'dau'],
    'nham_thach_hung': ['duoi', 'chan_sau_trai', 'chan_sau_phai', 'than',
                        'chan_truoc_trai', 'chan_truoc_phai', 'dau'],
}

NOTES = {
    'bich_thuy_giao': 'giao nuoc cuon: than_1 khoi than tren, than_2 khoi than duoi, duoi la dau duoi cuon + tia nuoc gan',
    'tu_dien_dieu': 'chon dien, trai/phai theo goc nhin',
    'han_ngoc_tho': 'tho ngoc, tai_trai/phai theo goc nhin',
    'phong_duc_ung': 'ung gio: 1 chan gom ca 2 mong vuot, duoi la chum long duoi giua 2 chan',
    'doc_nha_mang': 'tran doc cuon: ham_duoi gom rang nanh + luoi; than_1/2/3 la 3 doan cuon tu tren xuong; duoi la dau duoi xoan o day',
    'quang_minh_loc': 'huou sang: sung gom ca 2 gac (1 part)',
    'thanh_phong_lang': 'soi gio, trai/phai theo goc nhin',
    'linh_vi_ho': 'cao linh ngoi: duoi to ben phai; chan sau trai khuat sau than -> part RONG, pivot [260,900]',
    'thiet_giap_quy': 'rua sat: mai la dom mai sat; duoi nho o giua day',
    'xich_hoa_thu': 'cao lua: dau gom mao lua tren dau, duoi lua ben phai',
    'bich_nhan_nha': 'nhen mat xanh: 8 chan (4 moi ben, tu tren xuong duoi); khong co duoi trong art',
    'nham_thach_hung': 'gau da: tinh the tren vai thuoc than; duoi la part RONG (khong co duoi ro trong art mat truoc), pivot [512,965]',
}

PIVOT_EMPTY = {'duoi': [512, 965], 'chan_sau_trai': [260, 900]}

def pivot_for(name, m, than_mask):
    ys, xs = np.nonzero(m)
    if len(xs) == 0:
        return PIVOT_EMPTY.get(name, [512, 512])
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    if name == 'dau':
        sel = ys >= np.percentile(ys, 85)
        return [int(np.median(xs[sel])), int(np.median(ys[sel]))]
    if name == 'ham_duoi':
        return [int(x0 + (x1 - x0) * 0.2), int(y0 + (y1 - y0) * 0.35)]
    if name in ('than', 'than_1', 'than_2', 'than_3'):
        return [int(xs.mean()), int(ys.mean())]
    if name.startswith('chan'):
        sel = ys <= np.percentile(ys, 15)
        return [int(np.median(xs[sel])), int(ys[sel].min()) + 2]
    if name.startswith('canh'):
        sel = xs >= np.percentile(xs, 85) if 'trai' in name else xs <= np.percentile(xs, 15)
        return [int(np.median(xs[sel])), int(np.median(ys[sel]))]
    if name == 'duoi':
        if than_mask is not None and than_mask.any():
            dist = distance_transform_edt(~than_mask)
            d = dist[ys, xs]
            k = max(1, len(xs) // 50)
            idx = np.argpartition(d, k)[:k]
            return [int(xs[idx].mean()), int(ys[idx].mean())]
        return [int(xs.mean()), int(ys.mean())]
    if name.startswith('tai') or name == 'sung':
        sel = ys >= np.percentile(ys, 85)
        return [int(np.median(xs[sel])), int(ys[sel].max()) - 2]
    if name == 'mai':
        sel = ys >= np.percentile(ys, 80)
        return [int(np.median(xs[sel])), int(ys[sel].max()) - 4]
    return [int(xs.mean()), int(ys.mean())]

def variant_combat(img):
    """base + red overlay 25%, saturation x1.3 (PIL only)"""
    rgb = img.convert('RGB')
    red = Image.new('RGB', rgb.size, (255, 0, 0))
    out = Image.blend(rgb, red, 0.25)
    out = ImageEnhance.Color(out).enhance(1.3)
    return out

def variant_tinh_anh(img):
    """base + gold overlay 25%, brightness x1.1 (PIL only)"""
    rgb = img.convert('RGB')
    gold = Image.new('RGB', rgb.size, (255, 215, 0))
    out = Image.blend(rgb, gold, 0.25)
    out = ImageEnhance.Brightness(out).enhance(1.1)
    return out

def build(pet):
    src = os.path.join(D, f'pet_{pet}.webp')
    im = Image.open(src).convert('RGBA')
    rgba = np.array(im).astype(np.uint8)
    fg = rgba[:, :, 3] > 8
    order = CLAIM_ORDER[pet]
    claimed = np.zeros((H, W), bool)
    masks = {}
    for name in order:
        g = GEO[pet].get(name, 'FALLBACK')
        if isinstance(g, str):  # 'FALLBACK'
            m = fg & ~claimed
        elif g is None:  # part rong co chu dich (vd duoi khong co trong art)
            m = np.zeros((H, W), bool)
        else:
            m = g & fg & ~claimed
        masks[name] = m
        claimed |= m
    # leftover -> nearest part mask (distance transform)
    leftover = fg & ~claimed
    if leftover.any():
        ly, lx = np.nonzero(leftover)
        names = [n for n in order if masks[n].any()]
        Dd = np.stack([distance_transform_edt(~masks[n]).astype(np.float32) for n in names])
        best = np.argmin(Dd[:, ly, lx], axis=0)
        for i, n in enumerate(names):
            sel = best == i
            if sel.any():
                masks[n][ly[sel], lx[sel]] = True

    than_mask = masks.get('than', None)
    zorder = ZORDER[pet]
    parts_json = {}
    for i, name in enumerate(zorder):
        m = masks[name]
        # giu NGUYEN alpha goc (mem) trong part, 0 o ngoai; RGB=0 ngoai part
        pa = np.where(m, rgba[:, :, 3], 0).astype(np.uint8)
        prgb = rgba[:, :, :3].copy()
        prgb[pa == 0] = 0
        base = Image.fromarray(np.dstack([prgb, pa]), 'RGBA')
        f_base = f'pet_{pet}_part_{name}.png'
        f_cb = f'pet_{pet}_part_{name}_combat.png'
        f_ta = f'pet_{pet}_part_{name}_tinh_anh.png'
        base.save(os.path.join(D, f_base))
        cb = variant_combat(base); cb.putalpha(Image.fromarray(pa)); cb.save(os.path.join(D, f_cb))
        ta = variant_tinh_anh(base); ta.putalpha(Image.fromarray(pa)); ta.save(os.path.join(D, f_ta))
        parts_json[name] = {
            'file': f_base,
            'pivot': pivot_for(name, m, than_mask),
            'z': i,
            'pixels': int(m.sum()),
            'variants': {'combat': f_cb, 'tinh_anh': f_ta},
        }
    print(f'  parts: ' + ', '.join(f'{n}:{masks[n].sum()}' for n in zorder))

    # composite diff vs original (RGBA exact, ke ca alpha mem)
    comp = np.zeros((H, W, 4), dtype=np.int16)
    for name in zorder:
        m = masks[name]
        comp[m] = rgba[m]
    d4 = np.abs(comp.astype(int) - rgba.astype(int))
    d4[:, :, :3] *= (rgba[:, :, 3:4] > 0)  # RGB chi so voi pixel co alpha
    md = d4.mean()
    nbig = int((d4.mean(axis=2) > 40).sum())
    print(f'  MEAN ABS DIFF (RGBA): {md:.4f}/255 | px>40: {nbig} / {H*W}')

    # preview on dark bg
    bg = Image.new('RGB', (W, H), (24, 26, 32))
    ca = np.array(bg)
    for name in zorder:
        m = masks[name]
        ca[m] = rgba[:, :, :3][m]
    Image.fromarray(ca).save(os.path.join(D, f'pet_part_{pet}_preview.png'))

    data = {
        'pet': pet,
        'canvas': {'width': W, 'height': H},
        'note': NOTES.get(pet, ''),
        'parts': parts_json,
    }
    with open(os.path.join(D, f'pet_parts_{pet}.json'), 'w') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return md, nbig

if __name__ == '__main__':
    import sys
    pets = sys.argv[1:] if len(sys.argv) > 1 else list(GEO.keys())
    for pet in pets:
        assert pet in GEO, f'unknown pet: {pet}'
        print('===', pet, '===')
        md, nbig = build(pet)
        assert md < 5.0, f'diff too high: {md}'
    print('DONE')
