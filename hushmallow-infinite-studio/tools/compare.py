"""Visual comparison of two renders at matching story beats.

    python3 tools/compare.py <v1.mp4> <v2.mp4> <out_dir>

Writes
  v1-vs-v2-beats.jpg   the same story beats side by side (v1 left, v2 right)
  v1-vs-v2-crop.png    1:1 pixel crops of Noomi's face/texture (no resampling)
  v1-vs-v2-sharpness.json  a simple, honest sharpness measure on those crops
                       (mean gradient magnitude + high-frequency energy)
"""
import json, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

V1, V2, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(OUT, exist_ok=True)

# (label, v1 time, v2 time) — the nearest equivalent moment in each cut
BEATS = [
    ('Frame 0 (scroll-stop)', 0.0, 0.0),
    ('The memory hits', 1.62, 0.50),
    ('Landing / reaction', 2.1, 1.03),
    ('Overthinking', 5.6, 5.8),
    ('The big breath', 8.0, 8.5),
    ('Letting go', 8.95, 9.6),
    ('Calm, eyes open', 11.7, 12.2),
    ('End card', 13.6, 13.4),
]


def frame(path, t):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{t:.3f}', '-i', path, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                         capture_output=True, check=True).stdout
    return Image.frombytes('RGB', (1080, 1920), raw)


def font(size):
    for p in ['/home/user/thinkstill-rituals/hushmallow/assets/fonts/fredoka-latin.woff2', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf']:
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            pass
    return ImageFont.load_default()


# ---- beats sheet
tw, th = 360, 640
cols = len(BEATS)
sheet = Image.new('RGB', (cols * (tw + 16) + 16, 2 * (th + 54) + 70), (14, 12, 28))
d = ImageDraw.Draw(sheet)
F, Fs = font(30), font(22)
d.text((16, 18), 'v1 (not approved)  vs  v2 (this upgrade) — the same story beats', fill=(235, 230, 255), font=F)
for i, (label, t1, t2) in enumerate(BEATS):
    x = 16 + i * (tw + 16)
    for row, (path, t, tag) in enumerate([(V1, t1, 'v1'), (V2, t2, 'v2')]):
        y = 70 + row * (th + 54)
        im = frame(path, t).resize((tw, th), Image.LANCZOS)
        sheet.paste(im, (x, y + 34))
        d.text((x, y + 4), f'{tag} · {label} · {t:.2f}s', fill=(220, 215, 245), font=Fs)
sheet.save(os.path.join(OUT, 'v1-vs-v2-beats.jpg'), quality=92)

# ---- 1:1 crops (no resampling): the face region at a calm moment of each cut
def bbox_face(im):
    # Noomi = the large light-blue blob above the waterline; centre the crop on the face
    # (55 % down the body), so both cuts are framed the same way
    a = np.asarray(im.convert('RGB')).astype(np.int32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    m = (b > 200) & (g > 140) & (r < 215) & (g - r > 25)
    m[:420] = False
    m[1500:] = False
    rows, cols = np.nonzero(m.sum(1) > 40)[0], np.nonzero(m.sum(0) > 40)[0]
    top, bot = rows.min(), rows.max()
    if bot - top > 900:     # v1 stands on a shore: ignore the lower body/ground run
        bot = top + 650
    return int((cols.min() + cols.max()) / 2), int(top + 0.58 * (bot - top))

crops = []
for path, t in [(V1, 0.4), (V2, 0.05)]:
    im = frame(path, t)
    cx, cy = bbox_face(im)
    box = (max(0, cx - 260), max(0, cy - 170), max(0, cx - 260) + 520, max(0, cy - 170) + 300)
    crops.append(im.crop(box))
pair = Image.new('RGB', (520 * 2 + 30, 300 + 50), (14, 12, 28))
dd = ImageDraw.Draw(pair)
pair.paste(crops[0], (0, 50)); pair.paste(crops[1], (550, 50))
dd.text((6, 10), 'v1 · 1:1 pixels', fill=(230, 225, 250), font=Fs)
dd.text((556, 10), 'v2 · 1:1 pixels', fill=(230, 225, 250), font=Fs)
pair.save(os.path.join(OUT, 'v1-vs-v2-crop.png'))

# ---- sharpness numbers on the crops (luma)
def sharp(im):
    y = np.asarray(im.convert('L')).astype(np.float64)
    gx, gy = np.diff(y, axis=1)[:-1], np.diff(y, axis=0)[:, :-1]
    grad = np.hypot(gx, gy).mean()
    f = np.abs(np.fft.fftshift(np.fft.fft2(y - y.mean())))
    h, w = f.shape
    yy, xx = np.ogrid[:h, :w]
    r = np.hypot((yy - h / 2) / (h / 2), (xx - w / 2) / (w / 2))
    hf = f[r > 0.5].sum() / f.sum()
    return {'mean_gradient': round(float(grad), 3), 'high_freq_energy_ratio': round(float(hf), 4)}

res = {'v1': sharp(crops[0]), 'v2': sharp(crops[1])}
json.dump(res, open(os.path.join(OUT, 'v1-vs-v2-sharpness.json'), 'w'), indent=1)
print(json.dumps(res))
