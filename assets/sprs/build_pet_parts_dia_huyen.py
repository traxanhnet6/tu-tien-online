"""Cut SKELETAL parts for 12 linh thu Dia/Huyen grade (Tu Tien Online).
Deterministic PIL/scipy cut from ORIGINAL art - NO regeneration.
Follows the same convention as build_pet_parts.py (Pham-grade pets):
  out (in sprs/): pet_<ten>_part_<part>.png (+ _combat / _tinh_anh), full canvas
  pet_parts_<ten>.json {pet, canvas, note, parts: {file, pivot, z, pixels, variants}}
  pet_part_<ten>_preview.png ; composite diff assert < 5/255.

Per task: 3 color variants per part (base / _combat: red 25% + sat x1.3 /
_tinh_anh: gold 25% + bright x1.1), pivots: dau=co, ham_duoi=khop ham,
chan=vai/hong, canh=goc canh, duoi=goc duoi. Variants share pivots.
"""
from PIL import Image, ImageEnhance
import numpy as np
from scipy.ndimage import distance_transform_edt, label
import json, os

D = '/home/hatch/workspace/game-tu-tien/v2/assets/sprs'

# ---------------- geometry: (x0, x1, y0, y1) inclusive ----------------
# claim = priority order (front claims overlap first). fallback 'than'/'mai' last.
PETS = {
 'liet_diem_su': dict(src='pet_liet_diem_su.webp', note='Su tu lua, view truoc. Duoi khong thay trong art -> khong tach.',
   geo={'chan_trai_truoc':(150,330,510,800),'chan_phai_truoc':(694,874,510,800),
        'chan_trai_sau':(210,430,750,1000),'chan_phai_sau':(594,814,750,1000),
        'dau':(140,910,0,580),'than':(280,744,540,880)},
   claim=['chan_trai_truoc','chan_phai_truoc','chan_trai_sau','chan_phai_sau','dau','than'],
   z=['than','chan_trai_sau','chan_phai_sau','chan_trai_truoc','chan_phai_truoc','dau'],
   parent={'dau':'than','chan_trai_truoc':'than','chan_phai_truoc':'than','chan_trai_sau':'than','chan_phai_sau':'than'}),
 'dai_dia_hung': dict(src='pet_dai_dia_hung.webp', note='Gau dat, view truoc. Duoi khong thay trong art -> khong tach.',
   geo={'chan_trai_truoc':(150,330,520,820),'chan_phai_truoc':(690,870,520,820),
        'chan_trai_sau':(280,470,800,1000),'chan_phai_sau':(550,740,800,1000),
        'dau':(250,780,90,570),'than':(300,720,520,900)},
   claim=['chan_trai_truoc','chan_phai_truoc','chan_trai_sau','chan_phai_sau','dau','than'],
   z=['than','chan_trai_sau','chan_phai_sau','chan_trai_truoc','chan_phai_truoc','dau'],
   parent={'dau':'than','chan_trai_truoc':'than','chan_phai_truoc':'than','chan_trai_sau':'than','chan_phai_sau':'than'}),
 'kim_si_dai_bang': dict(src='pet_kim_si_dai_bang.webp', note='Dai bang vang, view truoc, canh xoe. chan = 1 part gom 2 chan. duoi = cum long duoi nhon giua 2 chan.',
   geo={'dau':(320,710,50,490),'chan':(320,710,700,1000),'than':(360,660,450,780),
        'canh_trai':(0,370,40,720),'canh_phai':(654,1024,40,720),'duoi':(465,565,705,835)},
   claim=['dau','duoi','chan','than','canh_trai','canh_phai'],
   z=['duoi','canh_trai','canh_phai','than','chan','dau'],
   parent={'dau':'than','chan':'than','canh_trai':'than','canh_phai':'than','duoi':'than'}),
 'bang_suong_long': dict(src='pet_bang_suong_long_down.png', note='Rong bang: DUNG _down.png (pose serpentine) thay webp (webp la chan dung, khong thay than/duoi). Canh + chan sau KHONG thay trong art. Bong dat (ellipse day) gom vao duoi (part gan nhat) de rap khit.',
   geo={'dau':(380,1230,0,950),'ham_duoi':(690,930,835,990),
        'chan_trai_truoc':(530,700,820,1120),'chan_phai_truoc':(910,1080,820,1120),
        'than_1':(550,1060,950,1200),'than_2':(600,1010,1150,1360),'duoi':(650,970,1300,1460)},
   claim=['dau','ham_duoi','chan_trai_truoc','chan_phai_truoc','than_1','than_2','duoi'],
   z=['duoi','than_2','than_1','chan_trai_truoc','chan_phai_truoc','ham_duoi','dau'],
   parent={'dau':'than_1','ham_duoi':'dau','chan_trai_truoc':'than_1','chan_phai_truoc':'than_1','than_1':'than_2','duoi':'than_2'}),
 'thach_giap_long_quy': dict(src='pet_thach_giap_long_quy.webp', note='Rua rong, view truoc. dau gom ria mep dai (lien net). duoi = vay duoi ben phai.',
   geo={'dau':(50,980,0,560),'chan_trai_truoc':(180,330,560,800),'chan_phai_truoc':(700,850,560,800),
        'chan_trai_sau':(220,380,780,1000),'chan_phai_sau':(650,810,780,1000),
        'duoi':(740,960,550,780),'mai':(250,780,480,900)},
   claim=['dau','chan_trai_truoc','chan_phai_truoc','chan_trai_sau','chan_phai_sau','duoi','mai'],
   z=['duoi','mai','chan_trai_sau','chan_phai_sau','chan_trai_truoc','chan_phai_truoc','dau'],
   parent={'dau':'mai','chan_trai_truoc':'mai','chan_phai_truoc':'mai','chan_trai_sau':'mai','chan_phai_sau':'mai','duoi':'mai'}),
 'cuu_dau_xa': dict(src='pet_cuu_dau_xa.webp', note='Ran 9 dau, view truoc. dau = cum 9 dau + co (1 part). 2 tay nho gom vao than_1. duoi = doan cuoi cuon duoi.',
   geo={'dau':(80,945,0,640),'than_1':(180,850,590,800),'than_2':(150,880,750,950),'duoi':(200,800,900,1024)},
   claim=['dau','than_1','than_2','duoi'],
   z=['duoi','than_2','than_1','dau'],
   parent={'dau':'than_1','than_1':'than_2','duoi':'than_2'}),
 'u_minh_bao': dict(src='pet_u_minh_bao.webp', note='Bao den, view truoc. duoi cuon ben phai than.',
   geo={'dau':(210,820,110,510),'chan_trai_truoc':(130,350,640,960),'chan_phai_truoc':(570,760,640,960),
        'chan_trai_sau':(50,260,540,820),'chan_phai_sau':(750,970,540,820),
        'duoi':(800,990,200,680),'than':(280,740,450,800)},
   claim=['dau','chan_trai_truoc','chan_phai_truoc','chan_trai_sau','chan_phai_sau','duoi','than'],
   z=['duoi','than','chan_trai_sau','chan_phai_sau','chan_trai_truoc','chan_phai_truoc','dau'],
   parent={'dau':'than','chan_trai_truoc':'than','chan_phai_truoc':'than','chan_trai_sau':'than','chan_phai_sau':'than','duoi':'than'}),
 'cuu_vi_yeu_ho': dict(src='pet_cuu_vi_yeu_ho.webp', note='Cao 9 duoi, view truoc. duoi_9 = toan bo cum 9 duoi (1 part, nam sau than).',
   geo={'dau':(270,750,40,530),'chan_trai_truoc':(270,430,670,960),'chan_phai_truoc':(590,730,670,960),
        'chan_trai_sau':(170,330,630,900),'chan_phai_sau':(690,840,630,900),
        'than':(330,690,480,800),'duoi_9':(0,1024,0,1024)},
   claim=['dau','chan_trai_truoc','chan_phai_truoc','chan_trai_sau','chan_phai_sau','than','duoi_9'],
   z=['duoi_9','than','chan_trai_sau','chan_phai_sau','chan_trai_truoc','chan_phai_truoc','dau'],
   parent={'dau':'than','chan_trai_truoc':'than','chan_phai_truoc':'than','chan_trai_sau':'than','chan_phai_sau':'than','duoi_9':'than'}),
 'huyet_duc_buc': dict(src='pet_huyet_duc_buc.webp', note='Doi mau, view truoc, canh xoe. chan = 1 part gom 2 chan. duoi nho nhon giua bung duoi.',
   geo={'dau':(320,710,70,510),'chan':(330,700,690,960),'than':(380,650,450,800),
        'canh_trai':(0,380,70,700),'canh_phai':(640,1024,70,700),'duoi':(495,530,740,800)},
   claim=['dau','duoi','chan','than','canh_trai','canh_phai'],
   z=['duoi','canh_trai','canh_phai','than','chan','dau'],
   parent={'dau':'than','chan':'than','canh_trai':'than','canh_phai':'than','duoi':'than'}),
 'hac_long': dict(src='pet_hac_long_down.png', note='Rong den PET (khac boss Hac Long): DUNG _down.png (khong co webp). Pose serpentine, chi thay 2 tay truoc. Khong co canh trong art. Bong dat (ellipse day) gom vao duoi (part gan nhat) de rap khit.',
   geo={'dau':(380,1240,0,960),'ham_duoi':(680,930,870,1000),
        'chan_trai_truoc':(520,660,820,1180),'chan_phai_truoc':(950,1090,820,1180),
        'than_1':(580,1030,980,1240),'than_2':(620,990,1190,1400),'duoi':(650,970,1340,1470)},
   claim=['dau','ham_duoi','chan_trai_truoc','chan_phai_truoc','than_1','than_2','duoi'],
   z=['duoi','than_2','than_1','chan_trai_truoc','chan_phai_truoc','ham_duoi','dau'],
   parent={'dau':'than_1','ham_duoi':'dau','chan_trai_truoc':'than_1','chan_phai_truoc':'than_1','than_1':'than_2','duoi':'than_2'}),
 'tam_dau_khuyen': dict(src='pet_tam_dau_khuyen.webp', note='Cho 3 dau, view truoc. dau = cum 3 dau + bom lua (1 part). duoi toi ben phai.',
   geo={'dau':(40,985,0,570),'chan_trai_truoc':(270,440,740,1000),'chan_phai_truoc':(590,750,740,1000),
        'chan_trai_sau':(110,290,590,870),'chan_phai_sau':(740,910,590,870),
        'duoi':(830,1024,480,800),'than':(280,740,520,870)},
   claim=['dau','chan_trai_truoc','chan_phai_truoc','chan_trai_sau','chan_phai_sau','duoi','than'],
   z=['duoi','than','chan_trai_sau','chan_phai_sau','chan_trai_truoc','chan_phai_truoc','dau'],
   parent={'dau':'than','chan_trai_truoc':'than','chan_phai_truoc':'than','chan_trai_sau':'than','chan_phai_sau':'than','duoi':'than'}),
 'mong_yem_thu': dict(src='pet_mong_yem_thu.webp', note='Thu ac mong, view truoc. duoi bong ben phai than.',
   geo={'dau':(200,820,10,550),'chan_trai_truoc':(280,430,700,970),'chan_phai_truoc':(590,740,700,970),
        'chan_trai_sau':(110,280,560,860),'chan_phai_sau':(740,910,560,860),
        'duoi':(730,980,360,780),'than':(300,720,500,860)},
   claim=['dau','chan_trai_truoc','chan_phai_truoc','chan_trai_sau','chan_phai_sau','duoi','than'],
   z=['duoi','than','chan_trai_sau','chan_phai_sau','chan_trai_truoc','chan_phai_truoc','dau'],
   parent={'dau':'than','chan_trai_truoc':'than','chan_phai_truoc':'than','chan_trai_sau':'than','chan_phai_sau':'than','duoi':'than'}),
}

def pivot_for(name, m, parent_mask):
    ys, xs = np.nonzero(m)
    if len(xs) == 0:
        return [0, 0]
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    if name == 'dau':  # co: day dau
        sel = ys >= np.percentile(ys, 85)
        return [int(np.median(xs[sel])), int(np.median(ys[sel]))]
    if name == 'ham_duoi':  # khop ham: diem gan dau nhat (tren ham)
        return _closest_point(m, parent_mask)
    if name in ('than', 'than_2', 'mai'):  # root: giua
        return [int(xs.mean()), int(ys.mean())]
    if name == 'than_1':  # khop voi than_2
        return _closest_point(m, parent_mask)
    if name.startswith('chan'):  # vai/hong: dinh chan
        sel = ys <= np.percentile(ys, 15)
        return [int(np.median(xs[sel])), int(ys[sel].min()) + 2]
    if name.startswith('canh'):  # goc canh: mep trong
        sel = xs >= np.percentile(xs, 85) if 'trai' in name else xs <= np.percentile(xs, 15)
        return [int(np.median(xs[sel])), int(np.median(ys[sel]))]
    if name.startswith('duoi'):  # goc duoi: diem gan than nhat
        return _closest_point(m, parent_mask)
    return [int(xs.mean()), int(ys.mean())]

def _closest_point(m, parent_mask):
    ys, xs = np.nonzero(m)
    if parent_mask is None or not parent_mask.any():
        return [int(xs.mean()), int(ys.mean())]
    d = distance_transform_edt(~parent_mask)[ys, xs]
    k = max(9, len(xs) // 50)
    idx = np.argpartition(d, k)[:k]
    return [int(xs[idx].mean()), int(ys[idx].mean())]

def variant_combat(img):
    rgb = img.convert('RGB')
    out = ImageEnhance.Color(Image.blend(rgb, Image.new('RGB', rgb.size, (255, 0, 0)), 0.25)).enhance(1.3)
    return out

def variant_tinh_anh(img):
    rgb = img.convert('RGB')
    out = ImageEnhance.Brightness(Image.blend(rgb, Image.new('RGB', rgb.size, (255, 215, 0)), 0.25)).enhance(1.1)
    return out

def build(pet, cfg):
    im = Image.open(os.path.join(D, cfg['src'])).convert('RGBA')
    rgba = np.array(im).astype(np.uint8)
    H, W = rgba.shape[:2]
    YY, XX = np.mgrid[0:H, 0:W]
    fg = rgba[:, :, 3] > 8
    # NOTE: ground-shadow blobs are KEPT and assigned to the nearest part
    # (via the leftover mechanism) so the composite reassembles exactly.
    kept = fg
    def rect(x0, x1, y0, y1):
        return (XX >= x0) & (XX <= x1) & (YY >= y0) & (YY <= y1)
    claimed = np.zeros((H, W), bool)
    masks = {}
    for name in cfg['claim']:
        g = cfg['geo'].get(name)
        m = (kept & ~claimed) if g is None else (rect(*g) & kept & ~claimed)
        masks[name] = m
        claimed |= m
    leftover = kept & ~claimed
    if leftover.any():
        ly, lx = np.nonzero(leftover)
        names = [n for n in cfg['claim'] if masks[n].any()]
        Dd = np.stack([distance_transform_edt(~masks[n]).astype(np.float32) for n in names])
        best = np.argmin(Dd[:, ly, lx], axis=0)
        for i, n in enumerate(names):
            sel = best == i
            if sel.any():
                masks[n][ly[sel], lx[sel]] = True
    parts_json = {}
    for zi, name in enumerate(cfg['z']):
        m = masks[name]
        if not m.any():
            print(f'  WARNING empty part {name} -> skipped')
            continue
        out = np.dstack([rgba[:, :, :3], np.where(m, 255, 0).astype(np.uint8)])
        base = Image.fromarray(out, 'RGBA')
        f_base = f'pet_{pet}_part_{name}.png'
        f_cb = f'pet_{pet}_part_{name}_combat.png'
        f_ta = f'pet_{pet}_part_{name}_tinh_anh.png'
        base.save(os.path.join(D, f_base))
        alpha = base.split()[3]
        cb = variant_combat(base); cb.putalpha(alpha); cb.save(os.path.join(D, f_cb))
        ta = variant_tinh_anh(base); ta.putalpha(alpha); ta.save(os.path.join(D, f_ta))
        pm = masks.get(cfg['parent'].get(name))
        parts_json[name] = {'file': f_base, 'pivot': pivot_for(name, m, pm),
                            'z': zi, 'pixels': int(m.sum()),
                            'variants': {'combat': f_cb, 'tinh_anh': f_ta}}
    print('  parts: ' + ', '.join(f"{n}:{masks[n].sum()}" for n in cfg['z'] if masks[n].any()))
    # composite diff vs original (foreground incl. dropped shadow)
    comp = np.zeros((H, W, 4), dtype=np.int16)
    for name in cfg['z']:
        if masks[name].any():
            comp[masks[name]] = rgba[masks[name]]
    d4 = np.abs(comp[fg].astype(int) - rgba[fg].astype(int))
    md = d4.mean()
    nbig = int((d4.mean(axis=1) > 40).sum())
    print(f'  MEAN ABS DIFF: {md:.4f}/255 | px>40: {nbig}/{int(fg.sum())}')
    bg = Image.new('RGB', (W, H), (24, 26, 32))
    ca = np.array(bg)
    for name in cfg['z']:
        m = masks[name]
        ca[m] = rgba[:, :, :3][m]
    Image.fromarray(ca).save(os.path.join(D, f'pet_part_{pet}_preview.png'))
    with open(os.path.join(D, f'pet_parts_{pet}.json'), 'w') as f:
        json.dump({'pet': pet, 'canvas': {'width': W, 'height': H},
                   'note': cfg['note'], 'parts': parts_json},
                  f, ensure_ascii=False, indent=2)
    return md

if __name__ == '__main__':
    import sys
    want = sys.argv[1:] or list(PETS.keys())
    bad = []
    for pet in want:
        cfg = PETS[pet]
        print('===', pet, '===')
        md = build(pet, cfg)
        if md >= 5.0:
            bad.append((pet, md))
    print('DIFF FAIL:', bad if bad else 'none')
    print('DONE')
