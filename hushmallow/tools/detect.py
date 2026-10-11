"""Detect each Mallow's facial features inside hand-placed regions and fit
their geometry. Writes features.json plus debug overlays."""
import json, sys
import numpy as np
import cv2
from PIL import Image, ImageDraw

SRC = sys.argv[1]   # dir with <name>.png
OUT = sys.argv[2]

# kind: line  -> dark stroke, fitted with a quadratic centreline
#       eye   -> bright sclera (+ iris inside), fitted ellipse + iris circle
#       spiral-> Zuzu's spiral disc, fitted circle
#       mouth -> dark open mouth (+ tongue), contour
#       crease-> Glitzi's carved frown, dark relative stroke
ROI = {
    'noomi': {'eyeL': ('line', (88, 212, 195, 262)), 'eyeR': ('line', (248, 212, 355, 262)),
              'mouth': ('line', (165, 270, 272, 318))},
    'blubi': {'browL': ('line', (96, 168, 172, 210)), 'browR': ('line', (252, 168, 326, 210)),
              'eyeL': ('line', (88, 228, 184, 274)), 'eyeR': ('line', (238, 228, 336, 274)),
              'mouth': ('line', (162, 288, 262, 328))},
    'loomi': {'browL': ('line', (70, 168, 148, 206)), 'browR': ('line', (212, 168, 294, 204)),
              'eyeL': ('line', (72, 220, 158, 258)), 'eyeR': ('line', (204, 220, 292, 258)),
              'mouth': ('line', (140, 262, 224, 300))},
    'pipzi': {'browL': ('line', (82, 102, 166, 148)), 'browR': ('line', (264, 102, 348, 148)),
              'eyeL': ('eye', (66, 150, 194, 276)), 'eyeR': ('eye', (240, 150, 366, 276)),
              'mouth': ('mouth', (154, 266, 284, 350))},
    'boppo': {'browL': ('line', (72, 104, 146, 142)), 'browR': ('line', (232, 100, 306, 138)),
              'eyeL': ('eye', (58, 140, 170, 250)), 'eyeR': ('eye', (210, 136, 322, 250)),
              'mouth': ('mouth', (138, 242, 240, 294))},
    'zuzu': {'eyeL': ('spiral', (50, 115, 180, 245)), 'eyeR': ('spiral', (200, 115, 330, 245)),
             'mouth': ('mouth', (120, 246, 256, 320))},
    'glitzi': {'eyeL': ('eye', (66, 168, 184, 246)), 'eyeR': ('eye', (200, 156, 316, 246)),
               'mouth': ('crease', (118, 258, 278, 300))},
}


def lum(rgb):
    return rgb[..., 0] * 0.299 + rgb[..., 1] * 0.587 + rgb[..., 2] * 0.114


def fit_line(mask, x0, y0):
    ys, xs = np.nonzero(mask)
    if len(xs) < 20:
        return None
    cols = {}
    for x, y in zip(xs, ys):
        cols.setdefault(x, []).append(y)
    cx = np.array(sorted(cols))
    cy = np.array([np.mean(cols[x]) for x in cx])
    th = np.array([len(cols[x]) for x in cx])
    a, b, c = np.polyfit(cx, cy, 2)
    xa, xb = cx.min(), cx.max()
    xm = (xa + xb) / 2
    f = lambda x: a * x * x + b * x + c
    thickness = float(np.median(th[len(th) // 4: -len(th) // 4 or None]))
    return {
        'p0': [float(xa + x0), float(f(xa) + y0)],
        'p1': [float(xb + x0), float(f(xb) + y0)],
        'mid': [float(xm + x0), float(f(xm) + y0)],
        # quadratic bezier control point that reproduces the parabola
        'ctrl': [float(xm + x0), float(2 * f(xm) - (f(xa) + f(xb)) / 2 + y0)],
        'width': thickness,
    }


def detect(name, img):
    rgb = img[..., :3].astype(np.float64)
    al = img[..., 3].astype(np.float64) / 255
    L = lum(rgb)
    Lb = cv2.GaussianBlur(L, (0, 0), 14)
    hsv = cv2.cvtColor(img[..., :3], cv2.COLOR_RGB2HSV).astype(np.float64)
    feats, masks = {}, {}
    for key, (kind, (x0, y0, x1, y1)) in ROI[name].items():
        sub = slice(y0, y1), slice(x0, x1)
        if kind == 'line':
            dark = ((Lb[sub] - L[sub]) > 38) & (L[sub] < 120)
            dark = cv2.morphologyEx(dark.astype(np.uint8), cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
            n, lab, st, _ = cv2.connectedComponentsWithStats(dark, 8)
            keep = 1 + int(np.argmax(st[1:, 4])) if n > 1 else 0
            m = (lab == keep)
            feats[key] = {'kind': 'line', **fit_line(m, x0, y0)}
        elif kind == 'crease':
            dark = ((Lb[sub] - L[sub]) > 14) & (L[sub] < 60)
            dark = cv2.morphologyEx(dark.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((3, 9), np.uint8))
            n, lab, st, _ = cv2.connectedComponentsWithStats(dark, 8)
            # the longest wide component is the frown
            best = 1 + int(np.argmax(st[1:, 2])) if n > 1 else 0
            m = (lab == best)
            feats[key] = {'kind': 'crease', **fit_line(m, x0, y0)}
        elif kind == 'eye':
            bright = (L[sub] > 175) & (hsv[sub][..., 1] < 80)
            bright = cv2.morphologyEx(bright.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
            n, lab, st, _ = cv2.connectedComponentsWithStats(bright, 8)
            big = st[1:, 4].max()
            m = np.isin(lab, [1 + j for j in range(n - 1) if st[1 + j, 4] > 0.08 * big]).astype(np.uint8)
            # fill the iris hole (and join sclera split by the iris)
            pts = np.column_stack(np.nonzero(m)[::-1]).astype(np.int32)
            hull = cv2.convexHull(pts)
            filled = np.zeros_like(m)
            cv2.fillPoly(filled, [hull], 1)
            (ex, ey), (ew, eh), ang = cv2.fitEllipse(hull)
            m = filled.astype(bool)
            # iris: dark, saturated-or-dark pixels inside the sclera hull
            inner = cv2.erode(filled, np.ones((5, 5), np.uint8)).astype(bool)
            dk = inner & ((L[sub] < 120) | ((hsv[sub][..., 1] > 120) & (L[sub] < 200)))
            n2, lab2, st2, _ = cv2.connectedComponentsWithStats(dk.astype(np.uint8), 8)
            k2 = 1 + int(np.argmax(st2[1:, 4]))
            iy, ix = np.nonzero(lab2 == k2)
            icx, icy = ix.mean(), iy.mean()
            ir = float(np.sqrt((lab2 == k2).sum() / np.pi))
            # extent-based radius is more robust to highlights inside the iris
            ir2 = float(max(ix.max() - ix.min(), iy.max() - iy.min()) / 2)
            feats[key] = {'kind': 'eye', 'center': [float(ex + x0), float(ey + y0)],
                          'rx': float(ew / 2), 'ry': float(eh / 2), 'angle': float(ang),
                          'iris': [float(icx + x0), float(icy + y0)],
                          'irisR': max(ir, ir2)}
        elif kind == 'spiral':
            s = hsv[sub][..., 1] > 60
            cyan = (rgb[sub][..., 2] > 150) & (rgb[sub][..., 1] > 120) & (rgb[sub][..., 0] < 150)
            ys, xs = np.nonzero(cyan)
            cx, cy = xs.mean(), ys.mean()
            r = float(np.percentile(np.hypot(xs - cx, ys - cy), 99.2))
            yy, xx = np.mgrid[y0:y1, x0:x1]
            m = np.hypot(xx - (cx + x0), yy - (cy + y0)) <= r + 2
            feats[key] = {'kind': 'spiral', 'center': [float(cx + x0), float(cy + y0)], 'r': r}
        elif kind == 'mouth':
            V = hsv[sub][..., 2]
            dk = (V < 150).astype(np.uint8)
            dk = cv2.morphologyEx(dk, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
            n, lab, st, _ = cv2.connectedComponentsWithStats(dk, 8)
            keep = 1 + int(np.argmax(st[1:, 4]))
            m0 = (lab == keep).astype(np.uint8)
            cnts, _ = cv2.findContours(m0, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
            c = max(cnts, key=cv2.contourArea)
            hull = cv2.convexHull(c)
            filled = np.zeros_like(m0)
            cv2.fillPoly(filled, [hull], 1)
            m = filled.astype(bool)
            ys, xs = np.nonzero(m)
            top, bot = {}, {}
            for x, y in zip(xs, ys):
                top[x] = min(top.get(x, 9e9), y)
                bot[x] = max(bot.get(x, -1), y)
            xa, xb = xs.min(), xs.max()
            xm = int((xa + xb) / 2)
            feats[key] = {'kind': 'mouth', 'left': [float(xa + x0), float(np.mean([top[xa], bot[xa]]) + y0)],
                          'right': [float(xb + x0), float(np.mean([top[xb], bot[xb]]) + y0)],
                          'topMid': [float(xm + x0), float(top[xm] + y0)],
                          'botMid': [float(xm + x0), float(bot[xm] + y0)],
                          'bbox': [float(xa + x0), float(ys.min() + y0), float(xb + x0), float(ys.max() + y0)]}
        full = np.zeros(al.shape, bool)
        if kind in ('line', 'crease'):
            full[sub] = m
        else:
            full[sub] = m
        masks[key] = full
    return feats, masks


def overlay(name, img, feats, masks):
    base = Image.new('RGBA', (img.shape[1], img.shape[0]), (255, 255, 255, 255))
    base.alpha_composite(Image.fromarray(img, 'RGBA'))
    base = base.resize((img.shape[1] * 2, img.shape[0] * 2), Image.LANCZOS)
    ov = Image.new('RGBA', base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    tint = np.zeros((img.shape[0], img.shape[1], 4), np.uint8)
    for m in masks.values():
        tint[m] = (0, 255, 0, 70)
    ov.alpha_composite(Image.fromarray(tint, 'RGBA').resize(base.size, Image.NEAREST))
    S = 2
    for k, f in feats.items():
        if f['kind'] in ('line', 'crease'):
            pts = []
            for t in np.linspace(0, 1, 30):
                p0, c, p1 = np.array(f['p0']), np.array(f['ctrl']), np.array(f['p1'])
                p = (1 - t) ** 2 * p0 + 2 * (1 - t) * t * c + t * t * p1
                pts.append(tuple(p * S))
            d.line(pts, fill=(255, 0, 0, 255), width=2)
        elif f['kind'] == 'eye':
            cx, cy = f['center']
            d.ellipse([(cx - f['rx']) * S, (cy - f['ry']) * S, (cx + f['rx']) * S, (cy + f['ry']) * S],
                      outline=(255, 0, 0, 255), width=2)
            ix, iy = f['iris']
            r = f['irisR']
            d.ellipse([(ix - r) * S, (iy - r) * S, (ix + r) * S, (iy + r) * S], outline=(0, 0, 255, 255), width=2)
        elif f['kind'] == 'spiral':
            cx, cy = f['center']
            r = f['r']
            d.ellipse([(cx - r) * S, (cy - r) * S, (cx + r) * S, (cy + r) * S], outline=(255, 0, 0, 255), width=2)
        elif f['kind'] == 'mouth':
            for p in ('left', 'right', 'topMid', 'botMid'):
                x, y = f[p]
                d.ellipse([x * S - 4, y * S - 4, x * S + 4, y * S + 4], fill=(255, 0, 0, 255))
    base.alpha_composite(ov)
    base.save(f'{OUT}/detect_{name}.png')


if __name__ == '__main__':
    allf = {}
    for name in ROI:
        img = np.array(Image.open(f'{SRC}/{name}.png').convert('RGBA'))
        feats, masks = detect(name, img)
        allf[name] = feats
        overlay(name, img, feats, masks)
        np.savez_compressed(f'{OUT}/masks_{name}.npz', **{k: v for k, v in masks.items()})
        print(name, json.dumps({k: {kk: (np.round(vv, 1).tolist() if isinstance(vv, list) else (round(vv, 1) if isinstance(vv, float) else vv)) for kk, vv in v.items()} for k, v in feats.items()}))
    json.dump(allf, open(f'{OUT}/features.json', 'w'), indent=1)
