"""Cut 4 monsters (Tu Tien Online) into skeletal paper-doll parts.
Deterministic segmentation from the ORIGINAL pngs (PIL/scipy only, no generation).
Every foreground pixel (alpha>0) is assigned to exactly one part -> pixel-exact reassembly.
Convention: trai/phai = the creature's own left/right (front-facing), i.e.
trai = image-right, phai = image-left. Same convention as char_part_kiem_* task.
"""
from PIL import Image, ImageDraw
import numpy as np
import json
import os

D = '/home/hatch/workspace/game-tu-tien/v2/assets/sprs'
SIDE_NOTE = ("trai/phai theo goc nhin cua quai (quai doi dien nguoi choi): "
             "trai = nua phai cua anh (x lon), phai = nua trai cua anh (x nho)")


def load(name):
    a = np.array(Image.open(os.path.join(D, name)).convert('RGBA'))
    H, W = a.shape[:2]
    fg = a[:, :, 3] > 0
    XX, YY = np.meshgrid(np.arange(W), np.arange(H))
    return a, fg, XX, YY


def rect(XX, YY, x0, x1, y0, y1):
    return (XX >= x0) & (XX <= x1) & (YY >= y0) & (YY <= y1)


def poly(XX, YY, pts):
    H, W = XX.shape
    m = Image.new('L', (W, H), 0)
    ImageDraw.Draw(m).polygon(pts, fill=255)
    return np.array(m) > 0


def seg_dist(px, py, ax, ay, bx, by):
    vx, vy = bx - ax, by - ay
    wx, wy = px - ax, py - ay
    c = vx * vx + vy * vy
    t = np.clip((wx * vx + wy * vy) / max(c, 1e-9), 0, 1)
    dx, dy = wx - t * vx, wy - t * vy
    return np.sqrt(dx * dx + dy * dy)


def assign_polylines(fg, XX, YY, region, polylines, maxd=90):
    """Assign region pixels to nearest polyline (for multi-leg parts)."""
    cand = fg & region
    ys, xs = np.nonzero(cand)
    px, py = xs.astype(float), ys.astype(float)
    dists = []
    for pl in polylines:
        d = np.full(px.shape, 1e9)
        for (ax, ay), (bx, by) in zip(pl[:-1], pl[1:]):
            d = np.minimum(d, seg_dist(px, py, ax, ay, bx, by))
        dists.append(d)
    dists = np.stack(dists)
    best = dists.argmin(axis=0)
    bd = dists.min(axis=0)
    masks = []
    for k in range(len(polylines)):
        m = np.zeros(fg.shape, bool)
        sel = (best == k) & (bd <= maxd)
        m[ys[sel], xs[sel]] = True
        masks.append(m)
    return masks


def bbox(m):
    ys, xs = np.nonzero(m)
    return [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())] if len(xs) else None


def finish(monster, src, a, fg, parts, pivots, zorder):
    """parts: dict name->mask (exclusive). Save, composite-check, preview, JSON."""
    H, W = a.shape[:2]
    union = np.zeros(fg.shape, bool)
    for name, m in parts.items():
        assert not (union & m).any(), f'overlap in {monster}:{name}'
        union |= m
    leftover = fg & ~union
    print(f'[{monster}] fg={fg.sum()} covered={union.sum()} leftover={leftover.sum()}')
    # save parts
    for name, m in parts.items():
        rgba = np.dstack([a[:, :, :3], np.where(m, 255, 0).astype(np.uint8)]).astype(np.uint8)
        Image.fromarray(rgba, 'RGBA').save(os.path.join(D, f'mon_part_{monster}_{name}.png'))
        print(f'   {name}: px={m.sum()} bbox={bbox(m)}')
    # composite in z-order
    comp = np.zeros((H, W, 4), np.uint8)
    for name in zorder:
        m = parts[name]
        comp[m] = np.dstack([a[:, :, :3], np.full((H, W), 255, np.uint8)])[m]
    diff = np.abs(comp.astype(int) - a.astype(int))
    mean_diff = diff.mean()
    print(f'[{monster}] MEAN ABS DIFF vs original: {mean_diff:.4f} (limit 5.0), max={diff.max()}')
    # preview on black
    al = (comp[:, :, 3:4] / 255.0)
    pv = (comp[:, :, :3] * al).astype(np.uint8)
    Image.fromarray(pv).save(os.path.join(D, f'mon_part_{monster}_preview.png'))
    # JSON
    j = {
        'monster': monster,
        'source': src,
        'canvas': [W, H],
        'note': SIDE_NOTE,
        'parts': {},
    }
    for name in zorder:
        j['parts'][name] = {
            'file': f'mon_part_{monster}_{name}.png',
            'pivot': pivots[name],
            'z': zorder.index(name),
            'bbox': bbox(parts[name]),
        }
    with open(os.path.join(D, f'mon_parts_{monster}.json'), 'w') as f:
        json.dump(j, f, ensure_ascii=False, indent=2)
    print(f'[{monster}] wrote {len(parts)} parts + JSON')
    return mean_diff


# ---------------------------------------------------------------- 1. U HON LANG (wolf)
def wolf():
    monster, src = 'u_hon_lang', 'mon_u_hon_lang.png'
    a, fg, XX, YY = load(src)
    dau = fg & poly(XX, YY, [(500, 195), (1060, 195), (1140, 350), (1170, 550),
                             (1150, 700), (1040, 810), (800, 845), (560, 810),
                             (450, 700), (430, 550), (460, 350)])
    duoi = fg & poly(XX, YY, [(1315, 1105), (1370, 920), (1395, 780), (1420, 700),
                              (1440, 710), (1470, 790), (1465, 930), (1410, 1080),
                              (1365, 1125)])
    ctt = fg & rect(XX, YY, 995, 1355, 940, 1590) & ~duoi          # chan truoc trai (img-R)
    ctp = fg & rect(XX, YY, 290, 605, 890, 1495)                    # chan truoc phai (img-L)
    cst = fg & rect(XX, YY, 1280, 1485, 1045, 1355) & ~ctt & ~duoi  # chan sau trai (img-R)
    csp = fg & rect(XX, YY, 600, 825, 935, 1310) & ~ctp             # chan sau phai (img-L)
    than = fg & ~dau & ~duoi & ~ctt & ~ctp & ~cst & ~csp
    parts = {'dau': dau, 'than': than,
             'chan_truoc_trai': ctt, 'chan_truoc_phai': ctp,
             'chan_sau_trai': cst, 'chan_sau_phai': csp, 'duoi': duoi}
    pivots = {'dau': [800, 830], 'than': [800, 1080],
              'chan_truoc_trai': [1175, 975], 'chan_truoc_phai': [465, 925],
              'chan_sau_trai': [1380, 1105], 'chan_sau_phai': [675, 975],
              'duoi': [1355, 1050]}
    zorder = ['duoi', 'chan_sau_phai', 'chan_sau_trai', 'than',
              'chan_truoc_phai', 'chan_truoc_trai', 'dau']
    return finish(monster, src, a, fg, parts, pivots, zorder)


# ------------------------------------------------- 2. THACH GIAP TRUNG (stone beetle)
def beetle():
    monster, src = 'thach_giap_trung', 'mon_thach_giap_trung.png'
    a, fg, XX, YY = load(src)
    rau = fg & (rect(XX, YY, 625, 690, 260, 362) | rect(XX, YY, 915, 980, 260, 362))
    dau = fg & poly(XX, YY, [(560, 315), (1040, 315), (1060, 500), (1050, 700),
                             (980, 840), (620, 840), (550, 700), (540, 500)]) & ~rau
    # legs: 1=front(outer) 2=middle 3=rear(inner); trai=img-R, phai=img-L
    pl_L = [[(200, 915), (190, 1150), (140, 1420)],     # phai_1 front/outer
            [(360, 920), (360, 1150), (345, 1445)],     # phai_2 middle
            [(555, 985), (555, 1300)]]                 # phai_3 rear/inner
    pl_R = [[(1400, 915), (1410, 1150), (1460, 1420)],  # trai_1
            [(1240, 920), (1240, 1150), (1255, 1445)],  # trai_2
            [(1045, 985), (1045, 1300)]]               # trai_3
    mL = assign_polylines(fg, XX, YY, rect(XX, YY, 40, 660, 880, 1495), pl_L)
    mR = assign_polylines(fg, XX, YY, rect(XX, YY, 940, 1560, 880, 1495), pl_R)
    taken = rau | dau | mL[0] | mL[1] | mL[2] | mR[0] | mR[1] | mR[2]
    mai_giap = fg & ~taken
    parts = {'dau': dau, 'mai_giap': mai_giap, 'rau': rau,
             'chan_trai_1': mR[0], 'chan_trai_2': mR[1], 'chan_trai_3': mR[2],
             'chan_phai_1': mL[0], 'chan_phai_2': mL[1], 'chan_phai_3': mL[2]}
    pivots = {'dau': [800, 830], 'mai_giap': [800, 700], 'rau': [800, 350],
              'chan_trai_1': [1400, 930], 'chan_trai_2': [1240, 935], 'chan_trai_3': [1045, 1000],
              'chan_phai_1': [200, 930], 'chan_phai_2': [360, 935], 'chan_phai_3': [555, 1000]}
    zorder = ['chan_phai_1', 'chan_phai_2', 'chan_phai_3',
              'chan_trai_1', 'chan_trai_2', 'chan_trai_3',
              'mai_giap', 'rau', 'dau']
    return finish(monster, src, a, fg, parts, pivots, zorder)


# ------------------------------------------------- 3. TINH THACH QUAI (crystal golem)
def crystal():
    monster, src = 'tinh_thach_quai', 'mon_tinh_thach_quai.png'
    a, fg, XX, YY = load(src)
    dau = fg & poly(XX, YY, [(640, 190), (960, 190), (990, 320), (970, 480),
                             (900, 560), (700, 560), (630, 480), (610, 320)])
    tay_phai = fg & poly(XX, YY, [(425, 495), (585, 595), (560, 680), (520, 780),
                                  (460, 850), (400, 830), (330, 870), (260, 830),
                                  (180, 850), (155, 900), (160, 970), (220, 1020),
                                  (320, 1030), (410, 1000), (445, 930), (480, 850),
                                  (540, 720), (575, 620)]) & ~dau
    tay_trai = fg & poly(XX, YY, [(1175, 495), (1015, 595), (1040, 680), (1080, 780),
                                  (1140, 850), (1200, 830), (1270, 870), (1340, 830),
                                  (1420, 850), (1445, 900), (1440, 970), (1380, 1020),
                                  (1280, 1030), (1190, 1000), (1155, 930), (1120, 850),
                                  (1060, 720), (1025, 620)]) & ~dau
    chan_phai = fg & poly(XX, YY, [(380, 940), (640, 940), (660, 1060), (640, 1250),
                                   (620, 1400), (580, 1500), (280, 1500), (290, 1390),
                                   (360, 1260), (400, 1100)]) & ~tay_phai
    chan_trai = fg & poly(XX, YY, [(1220, 940), (960, 940), (940, 1060), (960, 1250),
                                   (980, 1400), (1020, 1500), (1320, 1500), (1310, 1390),
                                   (1240, 1260), (1200, 1100)]) & ~tay_trai
    than = fg & ~dau & ~tay_phai & ~tay_trai & ~chan_phai & ~chan_trai
    parts = {'dau': dau, 'than': than, 'tay_trai': tay_trai, 'tay_phai': tay_phai,
             'chan_trai': chan_trai, 'chan_phai': chan_phai}
    pivots = {'dau': [800, 560], 'than': [800, 850],
              'tay_trai': [1080, 640], 'tay_phai': [520, 640],
              'chan_trai': [1100, 1080], 'chan_phai': [500, 1080]}
    zorder = ['chan_phai', 'chan_trai', 'than', 'tay_phai', 'tay_trai', 'dau']
    return finish(monster, src, a, fg, parts, pivots, zorder)


# ------------------------------------------------- 4. MA BINH (demon soldier)
def demon():
    monster, src = 'ma_binh', 'mon_ma_binh.png'
    a, fg, XX, YY = load(src)
    MX = a[:, :, :3].max(axis=2)
    dau = fg & rect(XX, YY, 460, 760, 190, 560)
    # sword band: pommel+grip+guard+blade. Guard zone separated bone-vs-vambrace by brightness.
    band = poly(XX, YY, [(10, 835), (110, 765), (210, 750), (330, 720),
                         (1050, 1195), (1045, 1305), (260, 905), (120, 905),
                         (40, 885), (10, 870)])
    fist_r = rect(XX, YY, 135, 305, 815, 975)
    gz = rect(XX, YY, 100, 350, 700, 800)  # guard/vambrace overlap: bone->sword
    vukhi = fg & band & ~fist_r & (~gz | (MX > 140)) & ~dau
    tay_phai = fg & rect(XX, YY, 140, 410, 690, 975) & ~vukhi & ~dau   # img-L arm (holds sword)
    tay_trai = fg & rect(XX, YY, 795, 1075, 690, 1005) & ~dau          # img-R arm
    chan_phai = fg & rect(XX, YY, 220, 510, 1330, 1630) & ~vukhi       # img-L leg
    chan_trai = fg & rect(XX, YY, 840, 1150, 1330, 1630) & ~vukhi      # img-R leg
    than = fg & ~dau & ~vukhi & ~tay_phai & ~tay_trai & ~chan_phai & ~chan_trai
    parts = {'dau': dau, 'than': than, 'tay_trai': tay_trai, 'tay_phai': tay_phai,
             'chan_trai': chan_trai, 'chan_phai': chan_phai, 'vukhi': vukhi}
    pivots = {'dau': [605, 550], 'than': [600, 1050],
              'tay_trai': [910, 700], 'tay_phai': [320, 700],
              'chan_trai': [990, 1340], 'chan_phai': [365, 1340],
              'vukhi': [220, 870]}
    zorder = ['chan_phai', 'chan_trai', 'than', 'tay_phai', 'tay_trai', 'vukhi', 'dau']
    return finish(monster, src, a, fg, parts, pivots, zorder)


if __name__ == '__main__':
    import sys
    which = sys.argv[1] if len(sys.argv) > 1 else 'all'
    fns = {'wolf': wolf, 'beetle': beetle, 'crystal': crystal, 'demon': demon}
    for k in (fns if which == 'all' else [which]):
        print('=' * 60)
        fns[k]()
