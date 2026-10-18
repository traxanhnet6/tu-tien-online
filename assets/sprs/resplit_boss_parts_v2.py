"""Resplit skeletal boss parts v2 (Tu Tien Online) - DETERMINISTIC re-cut from existing part PNGs.

U Minh Cu Mang: body than_1..3 -> than_1..6 via geodesic ordering along the body tube.
Hac Long: new 'co' (neck, carved from dau+than_1) + body (than_1,than_2) -> than_1..3.

Every foreground pixel -> exactly one part. Composite == original art (diff 0).
Variants use the SAME PIL transforms as build_boss_pet_parts.py.
"""
from PIL import Image, ImageEnhance
import numpy as np
import json, os
from scipy.ndimage import label, binary_dilation, distance_transform_edt
from scipy.sparse import csr_matrix
from scipy.sparse.csgraph import dijkstra

D = '/home/hatch/workspace/game-tu-tien/v2/assets/sprs'
H = W = 1600
YY, XX = np.arange(H)[:, None], np.arange(W)[None, :]
SQ = np.ones((3, 3), bool)

# ---------------- color variants (VERBATIM from build_boss_pet_parts.py) ----------------
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

VARIANTS = {'': lambda im: im, '_combat': variant_combat, '_tinh_anh': variant_tinh_anh}

def load_mask(prefix, name):
    return np.array(Image.open(os.path.join(D, f'{prefix}_part_{name}.png'))
                      .convert('RGBA'))[:, :, 3] > 0

def save_part(prefix, name, mask, rgba):
    """Save base + 2 variants. Returns dict of per-variant foreground diff vs transform(base)."""
    base = np.dstack([rgba[:, :, :3], np.where(mask, 255, 0).astype(np.uint8)])
    bimg = Image.fromarray(base, 'RGBA')
    diffs = {}
    for suf, fn in VARIANTS.items():
        vimg = fn(bimg)
        va = np.array(vimg)
        assert np.array_equal(va[:, :, 3], base[:, :, 3]), f'alpha changed {name}{suf}'
        vimg.save(os.path.join(D, f'{prefix}_part_{name}{suf}.png'))
        if suf:
            ref = np.array(fn(bimg))
            d = np.abs(va.astype(int)[mask] - ref.astype(int)[mask])
            diffs[suf] = (float(d.mean()), int(d.max()))
    return diffs

def check_composite(prefix, zorder, masks, rgba, ref_full, fg):
    """Composite base + variants in z-order; diff vs reference art, measured on
    foreground pixels (background RGB of the transform is irrelevant: alpha 0)."""
    out = {}
    for suf, fn in VARIANTS.items():
        comp = np.zeros((H, W, 4), dtype=np.int16)
        for name in zorder:
            m = masks[name]
            if suf == '':
                comp[m] = rgba[m].astype(np.int16)
            else:
                v = np.array(Image.open(os.path.join(D, f'{prefix}_part_{name}{suf}.png'))
                            .convert('RGBA')).astype(np.int16)
                comp[m] = v[m]
        ref = ref_full if suf == '' else np.array(fn(Image.fromarray(ref_full))).astype(np.int16)
        d = np.abs(comp.astype(int)[fg] - ref.astype(int)[fg])
        out[suf or 'base'] = (float(d.mean()), float(d.max()), int((d.max(axis=1) > 5).sum()))
    return out

def make_previews(prefix, zorder, masks, rgba):
    comp = np.zeros((H, W, 3), np.uint8)
    for name in zorder:
        comp[masks[name]] = rgba[masks[name]][:, :3]
    Image.fromarray(comp).save(os.path.join(D, f'{prefix}_preview.png'))
    strip = Image.new('RGB', (W * 3, H), (20, 20, 20))
    for i, suf in enumerate(['', '_combat', '_tinh_anh']):
        c = np.zeros((H, W, 3), np.uint8)
        for name in zorder:
            p = np.array(Image.open(os.path.join(D, f'{prefix}_part_{name}{suf}.png')).convert('RGBA'))
            pm = p[:, :, 3] > 0
            c[pm] = p[pm][:, :3]
        strip.paste(Image.fromarray(c), (i * W, 0))
    strip.save(os.path.join(D, f'{prefix}_preview_variants.png'))
    small = strip.resize((1440, 480))
    small.save('/tmp/preview_3panel_%s.png' % prefix)
    print('  3-panel preview: /tmp/preview_3panel_%s.png' % prefix)

# ================= SNAKE: 3 -> 6 body segments =================
print('=== boss_u_minh_cu_mang ===')
P = 'boss_u_minh_cu_mang'
src = np.array(Image.open(os.path.join(D, 'boss_u_minh_cu_mang.png')).convert('RGBA'))
fg = src[:, :, 3] > 0
pm = {n: load_mask(P, n) for n in ['dau', 'ham_duoi', 'duoi']}
B = fg & ~pm['dau'] & ~pm['ham_duoi'] & ~pm['duoi']   # body = old than_1..3 union
# sanity: B must equal union of the than_* part files currently on disk
U = np.zeros((H, W), bool)
nthan = 0
for i in range(1, 10):
    fn = os.path.join(D, f'{P}_part_than_{i}.png')
    if os.path.exists(fn):
        U |= np.array(Image.open(fn).convert('RGBA'))[:, :, 3] > 0
        nthan = i
print(f'  body px {B.sum()} (= union of than_1..{nthan} on disk: {np.array_equal(B, U)})')
lab, ncomp = label(B, structure=SQ)
sizes = np.bincount(lab.ravel()); sizes[0] = 0
print(f'  {ncomp} components; wisps {(B & (lab != int(np.argmax(sizes)))).sum()} px')

# ---- body centerline (hand-traced from art, head->tail) ----
# Anatomy (front view, belly faces coil center throughout):
#   neck (hidden behind head) -> crown -> top arc (L->R) -> right column down ->
#   middle coil (R->L) -> left side down -> bottom coil (L->R) -> tail tip.
# Hidden segments (behind head / crown->arc) contain no body pixels; they only
# set correct arc-length ordering. Deterministic: hardcoded waypoints.
TRACE = [(800,800),(800,600),(800,400),(800,250),(800,170),
         (700,220),(550,300),(400,380),(250,430),
         (150,470),(300,500),(500,520),(700,530),(900,530),(1100,520),(1300,500),
         (1380,600),(1350,750),(1300,900),(1250,1000),
         (1150,1070),
         (1000,1100),(800,1110),(600,1100),(400,1080),(250,1040),
         (180,1120),(170,1220),
         (250,1320),(450,1400),(700,1440),(950,1440),(1150,1410),
         (1300,1420),(1400,1450)]
tp = np.array(TRACE, float)
segs = np.diff(tp, axis=0)
slen = np.hypot(segs[:,0], segs[:,1])
cum = np.concatenate([[0], np.cumsum(slen)])
L = cum[-1]
print(f'  centerline length {L:.0f}px, {len(TRACE)} waypoints')
# densify every ~2px
pts, ss = [], []
for i in range(len(tp)-1):
    n = max(2, int(round(slen[i]/2)))
    for k in range(n):
        t = k/n
        pts.append(tp[i]*(1-t)+tp[i+1]*t)
        ss.append(cum[i]+slen[i]*t)
pts = np.array(pts); ss = np.array(ss)
praster = np.zeros((H,W), bool)
pxi = np.clip(pts[:,0].astype(int),0,W-1); pyi = np.clip(pts[:,1].astype(int),0,H-1)
praster[pyi,pxi] = True
_, (niy, nix) = distance_transform_edt(~praster, return_indices=True)
# arc-length of nearest centerline point for every pixel
smap = np.full((H,W), -1.0)
smap[pyi,pxi] = ss
# nearest centerline pixel -> its s (resolve ties deterministically: first max)
s_of = smap[niy, nix]
segmap = np.zeros((H,W), np.uint8)
q = L/6
segmap[B] = np.clip((s_of[B]/q).astype(int)+1, 1, 6)
assert (segmap[B] > 0).all()

def _J_at(s_target):
    j = int(np.clip(np.searchsorted(ss, s_target), 0, len(ss)-1))
    return [int(round(pts[j,0])), int(round(pts[j,1]))]
J = [_J_at(i*q) for i in range(7)]
print('  joints:', J)

masks = {'dau': pm['dau'], 'ham_duoi': pm['ham_duoi'], 'duoi': pm['duoi']}
for i in range(1, 7):
    masks[f'than_{i}'] = segmap == i
zorder = ['than_6', 'duoi', 'than_5', 'than_4', 'than_3', 'than_2', 'than_1',
          'dau', 'ham_duoi']
union_new = np.zeros((H, W), bool)
for m_ in masks.values():
    assert not (union_new & m_).any(); union_new |= m_
assert np.array_equal(union_new, fg), 'new tiling broken'

vdiffs = {}
for name, m_ in masks.items():
    if name.startswith('than_'):
        vdiffs[name] = save_part(P, name, m_, src)
print('  variant-vs-transform(base) diffs (mean,max):',
      {k: v for k, v in vdiffs.items()})
cd = check_composite(P, zorder, masks, src,
                     np.dstack([src[:, :, :3], np.where(fg, 255, 0).astype(np.uint8)]).astype(np.uint8), fg)
print('  composite diffs (mean,max,px>5):', cd)
assert all(v[2] == 0 for v in cd.values()), 'composite diff too big'
make_previews(P, zorder, masks, src)

with open(os.path.join(D, f'{P}_parts.json')) as f:
    data = json.load(f)
parts = {}
for zi, name in enumerate(zorder):
    piv = None; pivb = None
    if name.startswith('than_'):
        i = int(name.split('_')[1])
        piv, pivb = J[i - 1], J[i]
    elif name == 'duoi':
        piv = [1300, 1420]
    elif name == 'dau':
        piv = [800, 640]
    elif name == 'ham_duoi':
        piv = [820, 660]
    e = {'file': f'{P}_part_{name}.png',
         'file_combat': f'{P}_part_{name}_combat.png',
         'file_tinh_anh': f'{P}_part_{name}_tinh_anh.png',
         'pivot': piv, 'z': zi, 'pixels': int(masks[name].sum())}
    if pivb:
        e['pivot_b'] = pivb
    parts[name] = e
data['parts'] = parts
data['note'] = ('U Minh Cu Mang coiled snake, 6 body segments ordered head->tail '
    'along a hand-traced body centerline (neck->crown->top arc->right column->'
    'middle coil->left side->bottom coil->tail tip; re-cut from old than_1..3 union, '
    'exact tiling preserved). pivot = head-side joint, pivot_b = tail-side joint '
    '("diem noi 2 dau"). ham_duoi reused from mouth-task cut, claimed before dau. '
    'duoi = tapering tail tip. Smoke wisps assigned to nearest body segment.')
with open(os.path.join(D, f'{P}_parts.json'), 'w') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
print('  JSON updated:', list(parts))

# ================= DRAGON: +co neck, body -> than_1..3 =================
print('=== boss_hac_long ===')
P = 'boss_hac_long'
src = np.array(Image.open(os.path.join(D, 'hac_long_combat.png')).convert('RGBA'))
fg = src[:, :, 3] > 0
names = ['sung', 'canh_trai', 'canh_phai', 'dau', 'ham_duoi', 'chan_truoc_trai',
         'chan_truoc_phai', 'lua_phun', 'than_1', 'than_2']
pm = {n: load_mask(P, n) for n in names}
union_old = np.zeros((H, W), bool)
for m_ in pm.values():
    assert not (union_old & m_).any(); union_old |= m_
assert np.array_equal(union_old, fg), 'old dragon parts do not tile source'

zone = np.zeros((H, W), bool); zone[600:800, 600:1000] = True
co = (pm['dau'] | pm['than_1']) & zone
print(f'  co px {co.sum()} (from dau {(pm["dau"] & zone).sum()}, from than_1 {(pm["than_1"] & zone).sum()})')
assert co.any()
dau2 = pm['dau'] & ~zone
t1t = pm['than_1'] & ~zone
body = t1t | pm['than_2']
assert (t1t & (YY >= 1000)).sum() == 0, 'than_1 extends below y1000'
nthan_1 = body & (YY < 1000)
nthan_2 = body & (YY >= 1000) & (YY < 1280)
nthan_3 = body & (YY >= 1280)
print('  body split px:', nthan_1.sum(), nthan_2.sum(), nthan_3.sum())

masks = {'sung': pm['sung'], 'canh_trai': pm['canh_trai'], 'canh_phai': pm['canh_phai'],
         'dau': dau2, 'ham_duoi': pm['ham_duoi'],
         'chan_truoc_trai': pm['chan_truoc_trai'], 'chan_truoc_phai': pm['chan_truoc_phai'],
         'lua_phun': pm['lua_phun'], 'co': co,
         'than_1': nthan_1, 'than_2': nthan_2, 'than_3': nthan_3}
zorder = ['canh_trai', 'canh_phai', 'than_3', 'than_2', 'chan_truoc_trai',
          'chan_truoc_phai', 'sung', 'than_1', 'co', 'dau', 'ham_duoi', 'lua_phun']
union_new = np.zeros((H, W), bool)
for m_ in masks.values():
    assert not (union_new & m_).any(); union_new |= m_
assert np.array_equal(union_new, fg), 'new dragon tiling broken'

vdiffs = {}
for name in ['dau', 'co', 'than_1', 'than_2', 'than_3']:
    vdiffs[name] = save_part(P, name, masks[name], src)
print('  variant-vs-transform(base) diffs:', {k: v for k, v in vdiffs.items()})
cd = check_composite(P, zorder, masks, src,
                     np.dstack([src[:, :, :3], np.where(fg, 255, 0).astype(np.uint8)]).astype(np.uint8), fg)
print('  composite diffs (mean,max,px>5):', cd)
assert all(v[2] == 0 for v in cd.values()), 'composite diff too big'
make_previews(P, zorder, masks, src)

def band_pivot(mask, y_lo, y_hi):
    sel = mask & (YY >= y_lo) & (YY < y_hi)
    yy, xx = np.nonzero(sel)
    return [int(round(xx.mean())), int(round(yy.mean()))]

co_ys = np.nonzero(co)[0]
piv_co = band_pivot(co, co_ys.min(), co_ys.min() + 20)      # noi dau
pivb_co = band_pivot(co, co_ys.max() - 20, co_ys.max() + 1)  # noi than
t3_ys = np.nonzero(nthan_3)[0]
pivots = {
    'canh_trai': ([620, 420], None), 'canh_phai': ([980, 420], None),
    'than_3': ([800, 1280], band_pivot(nthan_3, t3_ys.max() - 20, t3_ys.max() + 1)),
    'than_2': ([800, 1000], [800, 1280]),
    'chan_truoc_trai': ([510, 900], None), 'chan_truoc_phai': ([1090, 900], None),
    'sung': ([800, 300], None),
    'than_1': ([800, 800], [800, 1000]),
    'co': (piv_co, pivb_co),
    'dau': ([800, 600], None), 'ham_duoi': ([800, 700], None),
    'lua_phun': ([800, 700], None),
}
with open(os.path.join(D, f'{P}_parts.json')) as f:
    data = json.load(f)
parts = {}
for zi, name in enumerate(zorder):
    piv, pivb = pivots[name]
    e = {'file': f'{P}_part_{name}.png',
         'file_combat': f'{P}_part_{name}_combat.png',
         'file_tinh_anh': f'{P}_part_{name}_tinh_anh.png',
         'pivot': piv, 'z': zi, 'pixels': int(masks[name].sum())}
    if pivb:
        e['pivot_b'] = pivb
    parts[name] = e
data['parts'] = parts
data['note'] = ('Hac Long frontal boss, now with neck (co) carved from dau+than_1 '
    'at the throat (x600-1000, y600-800), and body split into than_1 (chest, y<1000), '
    'than_2 (upper plume, 1000-1280), than_3 (lower plume, y>=1280). '
    'pivot = head-side joint ("diem noi"), pivot_b = tail-side joint; co carries '
    'both joints ("2 dau"). Exact tiling preserved; z-order keeps old relative order.')
with open(os.path.join(D, f'{P}_parts.json'), 'w') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
print('  JSON updated:', list(parts))
print('DONE')
