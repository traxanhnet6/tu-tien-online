"""Segment the T-pose character into paper-doll parts for skeletal animation.
All body parts are cut from the ORIGINAL T-pose (pixel-perfect reassembly).
vukhi is built from px_kiem.png (fallback: media generation for vukhi failed)."""
from PIL import Image
import numpy as np
from scipy import ndimage
import os

D = '/home/hatch/workspace/game-tu-tien/v2/assets/sprs'
ORIG = os.path.join(D, 'media-generation-char-part-kiem-tpose-0-a4a0e09b-a7cf-463b-ae1c-94d52fdd32c4.webp')
a = np.array(Image.open(ORIG).convert('RGB')).astype(int)
H, W = a.shape[:2]
R, G, B = a[:, :, 0], a[:, :, 1], a[:, :, 2]
MX = a.max(axis=2)
YY, XX = np.arange(H)[:, None], np.arange(W)[None, :]

nonbg = MX >= 28
skin = (R > 200) & (G > 160) & (B > 120) & (B < 200) & (R - B > 40) & (R - B < 100) & (R > G) & (G > B)
vividblue = (B > 140) & (B > R + 40) & (B > G + 20)
gold = (R > 140) & (G > 90) & (B < 120) & (R > B + 50) & (G > B + 20)
white_robe = (R > 100) & (G > 100) & (B > 100) & (np.abs(R - G) < 70) & (np.abs(G - B) < 70)
darkwrap = (MX >= 12) & (MX < 95)
# dark navy robe shadows (blue-tinted dark, distinct from neutral-black hair)
robe_dark = (MX >= 12) & (MX < 150) & (B > R + 15) & (B > G + 5)

def rect(x0, x1, y0, y1):
    return (XX >= x0) & (XX <= x1) & (YY >= y0) & (YY <= y1)

def bbox(m):
    ys, xs = np.nonzero(m)
    return (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())) if len(xs) else None

# ---------- TOC (hair): connected dark component seeded in hair mass ----------
haircand = (MX >= 12) & (MX <= 150)
lab, n = ndimage.label(haircand)
seed = lab[400, 800]
hair_raw = (lab == seed)
# clip: the component leaked into robe shadows via dark bridges; true hair is in head box
# the sword handle also touches the hair's right strands: cut along x=1085 in overlap zone
sword_cut = (XX > 1085) & rect(1060, 1260, 585, 815)
hair = hair_raw & rect(350, 1250, 80, 810) & ~sword_cut
print('hair bbox:', bbox(hair), 'px:', hair.sum(), '(raw:', hair_raw.sum(), ')')
# sanity: must not touch sword (x>1120 & y 550-860 dark area is separate)
pin = vividblue & rect(450, 1150, 200, 320)
print('pin px:', pin.sum(), bbox(pin))
toc_mask = hair | pin

# ---------- back-sword (goes into ao) ----------
sword_geo = rect(1060, 1260, 540, 870)
sword_mask = nonbg & sword_geo & ~toc_mask & ~skin & ~pin
print('sword px:', sword_mask.sum(), bbox(sword_mask))

# ---------- DAU (head): face/ears/neck, no hair ----------
headrect = rect(440, 1160, 540, 935)
dau_mask = headrect & nonbg & ~toc_mask & ~sword_mask & ~vividblue & ~robe_dark & ~(white_robe & ~skin & (YY > 895))
print('dau px:', dau_mask.sum(), bbox(dau_mask))

# ---------- AO (outer robe + wide sleeves + back-sword) ----------
robe_color = ((white_robe & ~skin) | vividblue | robe_dark)
body = rect(440, 1160, 840, 1450) | rect(955, 1395, 835, 1065) | rect(205, 645, 835, 1065)
beltzone = vividblue & rect(580, 1020, 1055, 1155)
ao_mask = (robe_color & body & ~beltzone & ~toc_mask & ~dau_mask) | sword_mask
print('ao px:', ao_mask.sum(), bbox(ao_mask))

# ---------- THAN (inner torso, hidden under ao) ----------
than_mask = nonbg & rect(600, 1000, 850, 1150) & ~dau_mask & ~toc_mask
print('than px:', than_mask.sum(), bbox(than_mask))

# ---------- QUAN (belt + pants, pants hidden) ----------
pants = (white_robe & ~skin) & rect(600, 1000, 1140, 1410)
quan_mask = beltzone | pants
print('quan px:', quan_mask.sum(), bbox(quan_mask))

# ---------- ARMS (30px joint overlap) ----------
notassel = ~(vividblue & (YY < 870))
taytrai_tren = nonbg & rect(985, 1180, 840, 1060) & ~toc_mask & notassel
taytrai_duoi = nonbg & rect(1120, 1395, 840, 1060) & ~toc_mask & notassel
tayphai_tren = nonbg & rect(420, 615, 840, 1060) & ~toc_mask
tayphai_duoi = nonbg & rect(205, 480, 840, 1060) & ~toc_mask
print('arms px:', taytrai_tren.sum(), taytrai_duoi.sum(), tayphai_tren.sum(), tayphai_duoi.sum())

# ---------- LEGS ----------
chantrai_tren = nonbg & rect(815, 965, 1100, 1380)   # thigh (hidden, robe px)
chanphai_tren = nonbg & rect(635, 785, 1100, 1380)
chantrai_duoi = nonbg & rect(895, 1055, 1425, 1555)  # shoe L (img-right)
chanphai_duoi = nonbg & rect(545, 705, 1425, 1555)  # shoe R (img-left)
print('legs px:', chantrai_tren.sum(), chanphai_tren.sum(), chantrai_duoi.sum(), chanphai_duoi.sum())
print('shoeL:', bbox(chantrai_duoi), 'shoeR:', bbox(chanphai_duoi))

parts = {
    'dau': dau_mask, 'toc': toc_mask, 'than': than_mask, 'ao': ao_mask,
    'quan': quan_mask, 'taytrai_tren': taytrai_tren, 'taytrai_duoi': taytrai_duoi,
    'tayphai_tren': tayphai_tren, 'tayphai_duoi': tayphai_duoi,
    'chantrai_tren': chantrai_tren, 'chantrai_duoi': chantrai_duoi,
    'chanphai_tren': chanphai_tren, 'chanphai_duoi': chanphai_duoi,
}
for name, m in parts.items():
    rgba = np.dstack([a, np.where(m, 255, 0).astype(np.uint8)]).astype(np.uint8)
    Image.fromarray(rgba, 'RGBA').save(os.path.join(D, f'char_part_kiem_{name}.png'))

# ---------- VUKHI from px_kiem.png ----------
k = Image.open('/home/hatch/workspace/game-tu-tien/v2/assets/weapons/px_kiem.png').convert('RGBA')
ka = np.array(k)
alpha = ka[:, :, 3] > 0
ys, xs = np.nonzero(alpha)
x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
trim = k.crop((x0, y0, x1 + 1, y1 + 1))
tw, th = trim.size
new_h = 950
new_w = int(tw * new_h / th)
sw = trim.resize((new_w, new_h), Image.LANCZOS)
canvas = Image.new('RGBA', (1600, 1600), (0, 0, 0, 0))
ox, oy = (1600 - new_w) // 2, (1600 - new_h) // 2
canvas.paste(sw, (ox, oy), sw)
canvas.save(os.path.join(D, 'char_part_kiem_vukhi.png'))
# grip point: widest row in lower half (guard), grip just below it
sa = np.array(sw)
sal = sa[:, :, 3] > 0
widths = sal.sum(axis=1)
lo = int(new_h * 0.60)
guard_local = lo + int(np.argmax(widths[lo:int(new_h * 0.92)]))
grip_y = oy + guard_local + int(new_h * 0.07)
print('vukhi trim:', (tw, th), 'scaled:', (new_w, new_h), 'offset:', (ox, oy),
      'guard_local_y:', guard_local, '-> pivot:', [800, grip_y])

# ---------- composite preview in z-order ----------
zorder = ['chantrai_duoi', 'chanphai_duoi', 'chantrai_tren', 'chanphai_tren',
          'quan', 'than', 'ao',
          'taytrai_tren', 'tayphai_tren', 'taytrai_duoi', 'tayphai_duoi',
          'dau', 'toc']
comp = Image.new('RGB', (1600, 1600), (0, 0, 0))
for name in zorder:
    im = Image.open(os.path.join(D, f'char_part_kiem_{name}.png')).convert('RGBA')
    comp.paste(Image.new('RGB', im.size, (0, 0, 0)), (0, 0), Image.merge('L', im.split()[3:4]).point(lambda v: 0 if v < 128 else 255))
    # paste actual pixels where alpha
    comp_arr = np.array(comp)
    ia = np.array(im)
    m = ia[:, :, 3] > 128
    comp_arr[m] = ia[:, :, :3][m]
    comp = Image.fromarray(comp_arr)
comp.save('/tmp/char_part_kiem_preview.png')
orig = Image.open(ORIG).convert('RGB')
diff = np.abs(np.array(comp).astype(int) - np.array(orig).astype(int)).mean(axis=2)
print('MEAN ABS DIFF vs original:', diff.mean().round(3), '| px>40:', (diff > 40).sum())
# where are the big diffs?
ys, xs = np.nonzero(diff > 40)
if len(xs):
    print('diff bbox:', (xs.min(), ys.min(), xs.max(), ys.max()))
print('DONE')
