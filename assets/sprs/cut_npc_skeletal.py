#!/usr/bin/env python3
"""Cat skeletal deterministic cho 6 NPC Tu Tien Online bang PIL/numpy.
Moi part = tap hop pixels duoc gan nhan theo z-order (z cao thang tai vung overlap).
Composite parts theo z thap->cao phai == art goc (diff = 0).
Quy uoc: tay_trai/tay_phai, chan_trai/chan_phai theo phia NHAN VAT
(nhan vat nhin ra man hinh -> tay trai NV o ben PHAI anh).
"""
from PIL import Image
import numpy as np, json, os

SRC = '/home/hatch/workspace/game-tu-tien/v2/assets/sprs'
ALPHA_T = 8

# name, rects(list), z, pivot[x,y], note
NPCS = {
 'npc_lao_dan_duong': dict(parts=[
   dict(name='chan_trai', rects=[(600,1900,860,2160)], z=0, pivot=[720,1900],
        note='Chan trai NV (phai anh). Pivot hong. Dung cho animation di lai: xoay quanh hong.'),
   dict(name='chan_phai', rects=[(280,1900,590,2160)], z=0, pivot=[445,1900],
        note='Chan phai NV (trai anh). Pivot hong. Di lai: xoay quanh hong.'),
   dict(name='than', rects=[(230,660,870,2000),(230,2000,620,2130)], z=1, pivot=[560,760],
        note='Ao dai xam tu vai den chan (rect phu bao vat ao trai dai). Pivot giua nguc. Cui chao: xoay nhe quanh hong/than.'),
   dict(name='phu_kien_gay', rects=[(670,660,1090,2160)], z=2, pivot=[775,1010],
        note='Gay tre + ho lo treo. Pivot diem tay nam. Animation: lac nhe quanh diem nam khi di.'),
   dict(name='tay_trai', rects=[(640,750,920,1250)], z=3, pivot=[740,790],
        note='Tay trai NV (phai anh) cam gay. Pivot vai. Vay tay/cam gay: xoay quanh vai.'),
   dict(name='tay_phai', rects=[(90,90,420,840)], z=3, pivot=[350,780],
        note='Tay phai NV (trai anh) gio cao cam den long. Pivot vai. Vay chao: xoay quanh vai.'),
   dict(name='dau', rects=[(420,420,710,1080)], z=4, pivot=[565,700],
        note='Mat + rau trang dai. Pivot co. Gat/lac dau: xoay quanh co; rau di theo dau.'),
   dict(name='phu_kien_mu', rects=[(300,270,920,650)], z=5, pivot=[575,470],
        note='Non la. Pivot dinh dau. Nghieng theo dau khi gat.'),
   dict(name='phu_kien_den_long', rects=[(20,90,360,740)], z=6, pivot=[195,175],
        note='Den long do treo tren tay phai. Pivot diem tay cam. Lac nhe nhu treo day khi di/vay tay.'),
 ]),
 'npc_lao_ren': dict(parts=[
   dict(name='chan_trai', rects=[(590,1420,880,2170)], z=0, pivot=[735,1470],
        note='Chan trai NV (phai anh), quan + giay. Pivot hong. Di lai: xoay quanh hong.'),
   dict(name='chan_phai', rects=[(220,1420,590,2120)], z=0, pivot=[430,1470],
        note='Chan phai NV (trai anh), quan + giay. Pivot hong. Di lai: xoay quanh hong.'),
   dict(name='than', rects=[(260,480,910,1760)], z=1, pivot=[565,620],
        note='Than + tap de da, dung cu deo that lung. Pivot giua nguc. Cui chao: xoay nhe.'),
   dict(name='phu_kien_bua', rects=[(30,360,320,840)], z=2, pivot=[200,720],
        note='Bua ren cam tay phai. Pivot diem tay nam. REN DAP BUA: xoay bua quanh diem nam DONG BO voi tay_phai xoay quanh vai (bua z< tay de ngon tay ve tren can).'),
   dict(name='tay_trai', rects=[(700,470,1020,1360)], z=3, pivot=[760,640],
        note='Tay trai NV (phai anh) buong. Pivot vai. Vay tay: xoay quanh vai.'),
   dict(name='tay_phai', rects=[(90,570,350,980)], z=3, pivot=[330,620],
        note='Tay phai NV (trai anh) nam can bua. Pivot vai. REN: xoay tay quanh vai, bua quay theo quanh diem nam.'),
   dict(name='dau', rects=[(200,100,760,600)], z=4, pivot=[540,555],
        note='Dau + bui toc. Pivot co. Gat dau: xoay quanh co.'),
 ]),
 'npc_minh_chu': dict(parts=[
   dict(name='phu_kien_hieu_ung', rects=[(80,1990,900,2230)], z=-1, pivot=[520,2110],
        note='Vet sang trang duoi chan (hieu ung nen). z thap nhat, co dinh theo vi tri dung.'),
   dict(name='chan_trai', rects=[(590,1930,860,2180)], z=0, pivot=[725,1960],
        note='Chan trai NV (phai anh), giay den. Pivot hong. Di lai: xoay quanh hong.'),
   dict(name='chan_phai', rects=[(250,1930,530,2180)], z=0, pivot=[390,1960],
        note='Chan phai NV (trai anh), giay den. Pivot hong. Di lai: xoay quanh hong.'),
   dict(name='than', rects=[(100,420,930,2010)], z=1, pivot=[525,540],
        note='Long bao vang tu vai den chan. Pivot giua nguc. Cui chao: xoay nhe quanh than.'),
   dict(name='phu_kien_gay', rects=[(660,500,1090,2170)], z=2, pivot=[790,990],
        note='Gay tre + ho lo. Pivot diem tay nam. Lac nhe khi di.'),
   dict(name='tay_trai', rects=[(670,720,930,1200)], z=3, pivot=[790,720],
        note='Tay trai NV (phai anh) cam gay. Pivot vai.'),
   dict(name='tay_phai', rects=[(100,670,380,1200)], z=3, pivot=[250,700],
        note='Tay phai NV (trai anh) trong tay ao rong. Pivot vai. Vay chao: xoay quanh vai.'),
   dict(name='dau', rects=[(420,150,680,550)], z=4, pivot=[550,470],
        note='Mat + rau de. Pivot co. Gat/lac dau: xoay quanh co.'),
   dict(name='phu_kien_mu', rects=[(420,60,650,230)], z=5, pivot=[545,180],
        note='Mu quan den. Pivot dinh dau. Nghieng theo dau.'),
 ]),
 'npc_su_gia': dict(parts=[
   dict(name='chan_trai', rects=[(560,1850,790,2185)], z=0, pivot=[675,1890],
        note='Chan trai NV (phai anh), giay den. Pivot hong. Di lai: xoay quanh hong.'),
   dict(name='chan_phai', rects=[(310,1850,570,2185)], z=0, pivot=[450,1890],
        note='Chan phai NV (trai anh), giay den. Pivot hong. Di lai: xoay quanh hong.'),
   dict(name='phu_kien_kiem', rects=[(200,200,430,530),(670,1120,990,1930)], z=1, pivot=[330,420],
        note='Kiem deo cheo sau lung (chuoi + vo). z sau than. Pivot chuoi kiem. Rut kiem: truot kiem ra khoi vo.'),
   dict(name='than', rects=[(170,420,930,1930)], z=2, pivot=[550,540],
        note='Ao trang tu vai den chan. Pivot giua nguc. Cui chao: xoay nhe.'),
   dict(name='tay_trai', rects=[(650,670,950,1220)], z=3, pivot=[790,700],
        note='Tay trai NV (phai anh), tay ao rong. Pivot vai. Vay tay: xoay quanh vai.'),
   dict(name='tay_phai', rects=[(150,670,430,1220)], z=3, pivot=[280,700],
        note='Tay phai NV (trai anh), tay ao rong. Pivot vai. Vay tay: xoay quanh vai.'),
   dict(name='dau', rects=[(420,150,700,490)], z=4, pivot=[535,450],
        note='Mat + bui toc. Pivot co. Gat/lac dau: xoay quanh co.'),
   dict(name='phu_kien_tram', rects=[(300,70,670,310)], z=5, pivot=[505,200],
        note='Tram cai toc ngoc + tua rua. Pivot chan tram. Lac nhe theo dau.'),
 ]),
 'npc_su_gia_ma': dict(parts=[
   dict(name='phu_kien_hieu_ung', rects=[(40,120,1080,2090)], z=-1, pivot=[560,1100],
        note='Khoi tim + bong do duoi chan (hieu ung nen). z thap nhat. Animation: khoi bay luon lap (uv scroll/alpha pulse); bong co dinh theo chan.'),
   dict(name='chan_trai', rects=[(590,1620,870,2010)], z=0, pivot=[730,1670],
        note='Chan trai NV (phai anh), giay den. Pivot hong. Di lai: xoay quanh hong.'),
   dict(name='chan_phai', rects=[(270,1620,550,2010)], z=0, pivot=[410,1670],
        note='Chan phai NV (trai anh), giay den. Pivot hong. Di lai: xoay quanh hong.'),
   dict(name='than', rects=[(170,570,950,1740)], z=1, pivot=[560,700],
        note='Ao den vien do. Pivot giua nguc. Cui chao: xoay nhe.'),
   dict(name='tay_trai', rects=[(720,720,980,1280)], z=2, pivot=[850,750],
        note='Tay trai NV (phai anh) buong. Pivot vai. Vay tay: xoay quanh vai.'),
   dict(name='tay_phai', rects=[(170,670,510,1140)], z=2, pivot=[330,720],
        note='Tay phai NV (trai anh) chong hong. Pivot vai.'),
   dict(name='dau', rects=[(380,270,750,720)], z=3, pivot=[565,600],
        note='Mu trum + mat na quy. Pivot co. Gat/lac dau: xoay quanh co.'),
   dict(name='phu_kien_sung', rects=[(400,110,730,430)], z=4, pivot=[565,330],
        note='Cap sung vang + dau lau tren mu. Pivot goc sung. Nghieng theo dau.'),
 ]),
 'npc_tam_tien': dict(parts=[
   dict(name='chan_trai', rects=[(600,1930,880,2150)], z=0, pivot=[740,1960],
        note='Chan trai NV (phai anh), giay. Pivot hong. Di lai: xoay quanh hong.'),
   dict(name='chan_phai', rects=[(300,1930,590,2150)], z=0, pivot=[445,1960],
        note='Chan phai NV (trai anh), giay. Pivot hong. Di lai: xoay quanh hong.'),
   dict(name='than', rects=[(70,470,1060,2110)], z=1, pivot=[540,600],
        note='Ao xam tu vai den chan. Pivot giua nguc. Cui chao: xoay nhe.'),
   dict(name='phu_kien_gay', rects=[(630,240,1090,1280)], z=2, pivot=[765,850],
        note='Gay tre + ho lo treo. Pivot diem tay nam. Lac nhe khi di.'),
   dict(name='phu_kien_quat', rects=[(40,470,590,830)], z=2, pivot=[255,760],
        note='Quat giay ve son thuy. Pivot diem tay cam. QUAT: xoay/mo quat quanh diem cam dong bo tay_phai.'),
   dict(name='tay_trai', rects=[(670,670,900,1030)], z=3, pivot=[785,700],
        note='Tay trai NV (phai anh) cam gay. Pivot vai.'),
   dict(name='tay_phai', rects=[(110,660,440,1100)], z=3, pivot=[270,700],
        note='Tay phai NV (trai anh) cam quat. Pivot vai. Vay quat: xoay tay quanh vai, quat quay theo quanh diem cam.'),
   dict(name='dau', rects=[(400,250,680,980)], z=4, pivot=[540,540],
        note='Mat + rau trang dai. Pivot co. Gat/lac dau: xoay quanh co; rau di theo dau.'),
   dict(name='phu_kien_mu_trum', rects=[(350,70,730,480)], z=5, pivot=[540,280],
        note='Mu trum xam + bui toc. Pivot dinh dau. Nghieng theo dau.'),
 ]),
}

def cut_npc(npc):
    cfg = NPCS[npc]
    im = Image.open(os.path.join(SRC, npc + '.png')).convert('RGBA')
    W, H = im.size
    arr = np.array(im)
    mask = arr[:, :, 3] > ALPHA_T
    parts = cfg['parts']
    label = np.full((H, W), -1, dtype=np.int16)
    for i in sorted(range(len(parts)), key=lambda k: -parts[k]['z']):
        m = np.zeros((H, W), bool)
        for (x0, y0, x1, y1) in parts[i]['rects']:
            x0, y0 = max(0, x0), max(0, y0)
            x1, y1 = min(W, x1), min(H, y1)
            m[y0:y1, x0:x1] = True
        sel = m & mask & (label < 0)
        label[sel] = i
    uncovered = mask & (label < 0)
    n_uncovered = int(uncovered.sum())
    # luu parts full-canvas
    saved = []
    for i, p in enumerate(parts):
        pm = (label == i)
        if not pm.any():
            print(f'  [{npc}] part RONG: {p["name"]}')
            continue
        out = np.zeros_like(arr)
        out[pm] = arr[pm]
        fn = f'{npc}_part_{p["name"]}.png'
        Image.fromarray(out).save(os.path.join(SRC, fn))
        saved.append((p, fn, int(pm.sum())))
    # composite check: alpha-over theo z thap -> cao
    comp = np.zeros((H, W, 4), np.float32)
    for i in sorted(range(len(parts)), key=lambda k: parts[k]['z']):
        pm = (label == i)
        if not pm.any():
            continue
        src = arr[pm].astype(np.float32)
        sa = (src[:, 3:4] / 255.0)
        dst = comp[pm]
        da = dst[:, 3:4] / 255.0
        oa = sa + da * (1 - sa)
        o_rgb = np.where(oa > 0, (src[:, :3] * sa + dst[:, :3] * da * (1 - sa)) / np.maximum(oa, 1e-6), 0)
        comp[pm, :3] = o_rgb
        comp[pm, 3:4] = oa * 255.0
    comp_u8 = np.clip(np.round(comp), 0, 255).astype(np.uint8)
    diff = np.abs(comp_u8.astype(np.int16) - arr.astype(np.int16))
    maxdiff = float(diff[mask].max()) if mask.any() else 0.0
    meandiff = float(diff[mask].mean()) if mask.any() else 0.0
    print(f'[{npc}] parts={len(saved)} uncovered_px={n_uncovered} maxdiff={maxdiff}/255 meandiff={meandiff:.4f}/255')
    # preview: composite + thumbnails
    thumbs = []
    for p, fn, cnt in saved:
        pm = (label == parts.index(p))
        ys, xs = np.where(pm)
        crop = arr[ys.min():ys.max()+1, xs.min():xs.max()+1]
        th = Image.fromarray(crop)
        th.thumbnail((180, 360))
        thumbs.append((p['name'], th))
    n = len(thumbs)
    cols = 4
    rows = (n + cols - 1) // cols
    pw, ph = 1120 // 2, 2240 // 2
    prev = Image.new('RGBA', (pw + cols * 200, max(ph, rows * 380)), (20, 20, 30, 255))
    prev.paste(Image.fromarray(comp_u8).resize((pw, ph)), (0, 0), Image.fromarray(comp_u8).resize((pw, ph)))
    for idx, (nm, th) in enumerate(thumbs):
        cx = pw + (idx % cols) * 200 + 10
        cy = (idx // cols) * 380 + 10
        prev.paste(th, (cx, cy), th)
    prev.convert('RGB').save(f'/tmp/preview_{npc}.png')
    # JSON
    j = {
        'npc': npc,
        'canvas': {'w': W, 'h': H},
        'convention': 'tay_trai/tay_phai, chan_trai/chan_phai theo phia nhan vat (nhan vat nhin ra man hinh). z: so thap = ve sau (sau), so cao = ve truoc. pivot: [x,y] theo toa do canvas goc.',
        'parts': [
            {'name': p['name'], 'file': fn, 'rects': p['rects'], 'z': p['z'],
             'pivot': p['pivot'], 'pixels': cnt, 'note': p['note']}
            for (p, fn, cnt) in saved
        ],
    }
    with open(os.path.join(SRC, f'npc_parts_{npc}.json'), 'w') as f:
        json.dump(j, f, ensure_ascii=False, indent=1)
    return n_uncovered, maxdiff

if __name__ == '__main__':
    tot = 0
    for npc in NPCS:
        u, d = cut_npc(npc)
        tot += 1
    print('xong', tot, 'NPC')
