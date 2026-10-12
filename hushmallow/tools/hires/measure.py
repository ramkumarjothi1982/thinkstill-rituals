"""Measure every face feature of the high-res cut-outs (W7, step 2 of 4).

    python3 tools/hires/measure.py <work_dir> <old_registry.json> [ids...]

<work_dir>/<id>.png is the cut-out from prepare.py; <old_registry.json> is the
current registry (size, bodyBox, face) exported from src/mallows/registry.js:
    node -e "import('./src/mallows/registry.js').then(m=>console.log(JSON.stringify(m.MALLOWS)))"

The old face spec is mapped into the new pixel space by the alpha bounding
boxes and used only as a starting guess and search window. Every feature is
then measured on the new art and fitted with the rig's own geometry
(riggeom.py), so the drawn face lands on the painted one:
  strokes  closed eyes, brows, line mouths: dark-stroke centreline, quadratic
           fit, perpendicular width, round-cap inset
  lidded   Glitzi: visible sclera opening fitted with ellipse + upper lid lens
  open     Pipzi / Boppo: sclera ellipse
  iris     circle fit to the iris / sclera boundary (lid edge excluded)
  spiral   Zuzu: spiral disc centre + dark ring radius
  mouth    open mouths: dark interior region fitted with the rig mouth shape
  crease   Glitzi's carved frown: groove centreline fitted with the rig curve
  cheeks   blush blobs (Mallow-specific colour excess)
Writes <work_dir>/measure-<id>.json, masks_<id>.npz and an overlay PNG.
"""
import json, sys, os
import numpy as np
import cv2
from scipy import optimize, ndimage
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import riggeom as G

WORK, OLD = sys.argv[1], sys.argv[2]
IDS = sys.argv[3:] or ['glitzi', 'zuzu', 'boppo', 'pipzi', 'blubi', 'loomi', 'noomi']
OLD_REG = json.load(open(OLD))
OLD_ART = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'assets', 'mallows')

# Resting parameters re-measured on the new art (face.neutral). Glitzi's
# redraw has heavier, flatter lids that slope down toward the nose: a grid fit
# of the rig's lid lens over the painted opening gives IoU 0.89 at the old
# rest (lidTop .4, lidSlant -.12) and 0.93 at lidTop .55, lidSlant .2. Both
# stay inside Glitzi's expression range (angry/calm narrower, happy/excited
# wider), so the presets keep their meaning.
NEUTRAL = {'glitzi': {'lidTop': 0.55, 'lidSlant': 0.2},
           # the redrawn Boppo rests with a wider-open grin; at the old 0.45
           # the painted depth would make a full-open (surprised) mouth twice
           # as tall as the current rig's
           'boppo': {'mouthOpen': 0.7}}

# Open mouths, painted landmarks in cut-out px: corner tips (x left, x right,
# y), the upper-lip dip at the centre, and the bottom of the opening (tongue
# bottom, above the pale lip rim) read from the centre-column colour profile.
# The rig's two-cubic mouth is solved through these points: an IoU fit prefers
# a flat-topped "D" that loses the painted grin's dipping upper lip.
MOUTH_LANDMARKS = {
    'zuzu': dict(xl=356, xr=666, y=627.5, lip=659, bottom=797),
    'boppo': dict(xl=388, xr=635, y=641, lip=679, bottom=782),
    'pipzi': dict(xl=378, xr=657, y=636.5, lip=666, bottom=801),
}


def mouth_from_landmarks(M0, P, lm):
    s, o, r = P['mouthSmile'], P['mouthOpen'], P['mouthRound']
    w = lm['xr'] - lm['xl']
    sag = M0.get('sag')
    sagS = (w * 0.18 * (1 - min(o, 1)) if sag == 0 else sag) * s * (1 - 0.6 * r)
    U, Lo = lm['lip'] - lm['y'], lm['bottom'] - lm['y']
    upper = (U - (1 - o) * sagS) / (o * (0.4 + 0.6 * max(0, s)))
    depth = (Lo - sagS) / o
    return dict(M0, x=(lm['xl'] + lm['xr']) / 2, y=lm['y'], w=w, upper=upper, depth=depth)


def lum(rgb):
    return rgb[..., 0] * 0.299 + rgb[..., 1] * 0.587 + rgb[..., 2] * 0.114


def bbox(mask):
    ys, xs = np.nonzero(mask)
    return [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]


# ------------------------------------------------------------ mapping --
def old_to_new(name, new_alpha):
    a = np.array(Image.open(f'{OLD_ART}/{name}.png'))[..., 3]
    ob = bbox(a > 8)
    nb = bbox(new_alpha > 8)
    sx = (nb[2] - nb[0]) / (ob[2] - ob[0])
    sy = (nb[3] - nb[1]) / (ob[3] - ob[1])
    return (lambda x, y: [(x - ob[0]) * sx + nb[0], (y - ob[1]) * sy + nb[1]]), sx, sy


def map_face(face, mp, sx, sy):
    f = json.loads(json.dumps(face))
    sl = (sx * sy) ** 0.5
    for s in 'LR':
        e = f['eyes'][s]
        e['x'], e['y'] = mp(e['x'], e['y'])
        for k in ('rx', 'hw'):
            e[k] *= sx
        for k in ('ry', 'sag', 'tilt'):
            if k in e:
                e[k] *= sy
        e['lw'] *= sl
        if 'irisR' in e:
            e['irisR'] *= sl
        if 'spriteR' in e:
            e['spriteR'] *= sl
        if 'irisOff' in e:
            e['irisOff'] = [e['irisOff'][0] * sx, e['irisOff'][1] * sy]
        b = f['brows'][s]
        for k in ('p0', 'c', 'p1'):
            b[k] = mp(*b[k])
        b['lw'] *= sl
        cx, cy, r = f['cheeks'][s]
        f['cheeks'][s] = mp(cx, cy) + [r * sl]
    M = f['mouth']
    M['x'], M['y'] = mp(M['x'], M['y'])
    M['w'] *= sx
    for k in ('sag', 'upper', 'depth'):
        if k in M:
            M[k] *= sy
    M['lw'] *= sl
    return f


# ------------------------------------------------------------ raster --
def poly_mask(shape, pts, ss=1):
    m = np.zeros(shape, np.uint8)
    cv2.fillPoly(m, [np.round(np.asarray(pts) * 8).astype(np.int32)], 1, lineType=cv2.LINE_8, shift=3)
    return m.astype(bool)


def ellipse_mask(shape, cx, cy, rx, ry):
    m = np.zeros(shape, np.uint8)
    cv2.ellipse(m, (int(round(cx * 8)), int(round(cy * 8))), (int(round(rx * 8)), int(round(ry * 8))), 0, 0, 360, 1, -1,
                shift=3)
    return m.astype(bool)


def stroke_mask(shape, pts, w):
    m = np.zeros(shape, np.uint8)
    cv2.polylines(m, [np.round(np.asarray(pts) * 8).astype(np.int32)], False, 1, thickness=max(1, int(round(w))),
                  lineType=cv2.LINE_8, shift=3)
    return m.astype(bool)


def iou(a, b):
    u = (a | b).sum()
    return (a & b).sum() / u if u else 0.0


# ----------------------------------------------------------- features --
class Art:
    def __init__(self, name):
        img = np.array(Image.open(f'{WORK}/{name}.png').convert('RGBA'))
        self.img = img
        self.rgb = img[..., :3].astype(np.float64)
        self.al = img[..., 3].astype(np.float64) / 255
        self.L = lum(self.rgb)
        self.hsv = cv2.cvtColor(img[..., :3], cv2.COLOR_RGB2HSV).astype(np.float64)  # H 0..180
        w = (self.al > 0.9).astype(np.float64)
        self.solid = w > 0
        sig = 36
        self.Lb = cv2.GaussianBlur(self.L * w, (0, 0), sig) / np.maximum(cv2.GaussianBlur(w, (0, 0), sig), 1e-3)
        self.shape = self.L.shape


def roi_box(pts, margin, shape):
    pts = np.asarray(pts)
    x0, y0 = np.floor(pts.min(0) - margin).astype(int)
    x1, y1 = np.ceil(pts.max(0) + margin).astype(int)
    H, W = shape
    return max(0, x0), max(0, y0), min(W, x1), min(H, y1)


def largest(mask, near=None):
    n, lab, st, cen = cv2.connectedComponentsWithStats(mask.astype(np.uint8), 8)
    if n <= 1:
        return np.zeros_like(mask, bool)
    if near is None:
        k = 1 + int(np.argmax(st[1:, 4]))
    else:
        # biggest component, penalised by distance to the expected centre
        d = np.hypot(cen[1:, 0] - near[0], cen[1:, 1] - near[1])
        score = st[1:, 4] / (1 + (d / 60.0) ** 2)
        k = 1 + int(np.argmax(score))
    return lab == k


def measure_stroke(A, guess_pts, margin, dark_k=0.55, absmax=110, close=7):
    x0, y0, x1, y1 = roi_box(guess_pts, margin, A.shape)
    sub = (slice(y0, y1), slice(x0, x1))
    L, Lb = A.L[sub], A.Lb[sub]
    dark = (L < np.minimum(absmax, dark_k * Lb)) & A.solid[sub]
    dark = cv2.morphologyEx(dark.astype(np.uint8), cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (close, close)))
    dark = ndimage.binary_fill_holes(dark)
    gc = np.asarray(guess_pts).mean(0) - [x0, y0]
    m = largest(dark, near=gc)
    full = np.zeros(A.shape, bool)
    full[sub] = m
    ys, xs = np.nonzero(m)
    cols = {}
    for x, y in zip(xs, ys):
        cols.setdefault(x, []).append(y)
    cx = np.array(sorted(cols))
    cy = np.array([np.mean(cols[x]) for x in cx])
    wts = np.array([len(cols[x]) for x in cx], float)
    a, b, c = np.polyfit(cx, cy, 2, w=np.sqrt(wts))
    f = lambda x: a * x * x + b * x + c
    xa, xb = cx.min(), cx.max() + 1
    # perpendicular width = area / centreline length
    xx = np.linspace(xa, xb, 200)
    yy = f(xx)
    length = np.hypot(np.diff(xx), np.diff(yy)).sum()
    width = m.sum() / max(length, 1)
    # the rig draws round caps: inset the centreline ends by half a width
    def inset(xe, sgn):
        slope = 2 * a * xe + b
        return xe + sgn * (width / 2) / np.sqrt(1 + slope * slope)
    pa, pb = inset(xa, 1), inset(xb, -1)
    pm = (pa + pb) / 2
    p0 = [pa + x0, f(pa) + y0]
    p1 = [pb + x0, f(pb) + y0]
    ctrl = [pm + x0, 2 * f(pm) - (f(pa) + f(pb)) / 2 + y0]
    mid = [pm + x0, f(pm) + y0]
    return dict(p0=p0, p1=p1, ctrl=ctrl, mid=mid, width=float(width), mask=full)


def stroke_to_closed_eye(st, side):
    (x0, y0), (x1, y1) = st['p0'], st['p1']
    x, y = (x0 + x1) / 2, (y0 + y1) / 2
    hw = (x1 - x0) / 2
    # inner end is the end toward the face centre: right end for L, left for R
    yin = y1 if side == 'L' else y0
    tilt = yin - y
    sag = st['mid'][1] - y
    return dict(x=x, y=y, hw=hw, sag=sag, tilt=tilt, lw=st['width'])


def stroke_to_line_mouth(st):
    (x0, y0), (x1, y1) = st['p0'], st['p1']
    return dict(x=(x0 + x1) / 2, y=(y0 + y1) / 2, w=x1 - x0, sag=st['mid'][1] - (y0 + y1) / 2, lw=st['width'])


def fit_line_mouth(A, M0, st, P):
    """Refine a line mouth so the rig's cubic (controls at 0.22 W) traces the
    painted stroke's centreline."""
    target = st['mask']
    def loss(v):
        M = dict(M0, x=v[0], y=v[1], w=v[2], sag=v[3])
        g = G.mouth_geom(M, P)
        sm = stroke_mask(A.shape, g['upper'], st['width'])
        return 1 - iou(sm, target)
    v0 = [M0['x'], M0['y'], M0['w'], M0['sag']]
    r = optimize.minimize(loss, v0, method='Nelder-Mead', options=dict(xatol=0.2, fatol=1e-4, maxiter=400,
                          initial_simplex=np.array(v0) + np.vstack([np.zeros(4), np.diag([4, 3, 6, 3])])))
    return dict(M0, x=r.x[0], y=r.x[1], w=r.x[2], sag=r.x[3]), 1 - r.fun


def fit_closed_eye(A, e0, side, st, P):
    target = st['mask']
    def loss(v):
        e = dict(e0, x=v[0], y=v[1], hw=v[2], sag=v[3], tilt=v[4])
        g = G.eye_geom(e, side, P, 'closed')
        sm = stroke_mask(A.shape, g['upper'], st['width'])
        return 1 - iou(sm, target)
    v0 = [e0['x'], e0['y'], e0['hw'], e0['sag'], e0.get('tilt', 0)]
    r = optimize.minimize(loss, v0, method='Nelder-Mead', options=dict(xatol=0.2, fatol=1e-4, maxiter=500,
                          initial_simplex=np.array(v0) + np.vstack([np.zeros(5), np.diag([4, 3, 5, 3, 2])])))
    return dict(e0, x=r.x[0], y=r.x[1], hw=r.x[2], sag=r.x[3], tilt=r.x[4]), 1 - r.fun


def opening_mask(A, guess_spec, margin, iris_too=True, ember=False):
    """Visible eye opening: bright sclera (+ the iris it surrounds). With
    ember=True (Glitzi) the fiery iris ring and the catchlight join the
    sclera, because the lid hides the iris top and the sclera alone does not
    enclose it."""
    ex, ey, rx, ry = guess_spec['x'], guess_spec['y'], guess_spec['rx'], guess_spec['ry']
    pts = [[ex - rx * 1.3, ey - ry * 1.3], [ex + rx * 1.3, ey + ry * 1.3]]
    x0, y0, x1, y1 = roi_box(pts, margin, A.shape)
    sub = (slice(y0, y1), slice(x0, x1))
    L, S = A.L[sub], A.hsv[sub][..., 1]
    if ember:
        Hh, V = A.hsv[sub][..., 0], A.hsv[sub][..., 2]
        scl = (L > 140) & (S < 110)
        ring = ((Hh < 25) | (Hh > 165)) & (S > 90) & (V > 70)
        u = (scl | ring | (L > 200)).astype(np.uint8)
        u = cv2.morphologyEx(u, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
        u = cv2.morphologyEx(u, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)))
        u = largest(ndimage.binary_fill_holes(u), near=(ex - x0, ey - y0))
        hull = cv2.convexHull(np.column_stack(np.nonzero(u)[::-1]).astype(np.int32))
        filled = np.zeros(u.shape, np.uint8)
        cv2.fillPoly(filled, [hull], 1)
        full = np.zeros(A.shape, bool)
        full[sub] = filled.astype(bool)
        # the iris/sclera boundary needs the strict sclera (pure white), not
        # the lilac-shaded rim that the opening needed
        strict = (L > 150) & (S < 95) & filled.astype(bool)
        sclera = np.zeros(A.shape, bool)
        sclera[sub] = cv2.morphologyEx(strict.astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8)).astype(bool)
        return full, sclera
    scl = (L > 150) & (S < 95)
    scl = cv2.morphologyEx(scl.astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8)).astype(bool)
    scl = largest(scl, near=(ex - x0, ey - y0)) if not iris_too else scl
    n, lab, st, cen = cv2.connectedComponentsWithStats(scl.astype(np.uint8), 8)
    if n > 1:
        big = st[1:, 4].max()
        keep = [1 + j for j in range(n - 1) if st[1 + j, 4] > 0.06 * big and
                np.hypot(cen[1 + j, 0] - (ex - x0), cen[1 + j, 1] - (ey - y0)) < max(rx, ry) * 1.6]
        scl = np.isin(lab, keep)
    pts2 = np.column_stack(np.nonzero(scl)[::-1]).astype(np.int32)
    hull = cv2.convexHull(pts2)
    filled = np.zeros(scl.shape, np.uint8)
    cv2.fillPoly(filled, [hull], 1)
    full = np.zeros(A.shape, bool)
    full[sub] = filled.astype(bool)
    sclera = np.zeros(A.shape, bool)
    sclera[sub] = scl
    return full, sclera


def fit_open_eye(A, e0, side, P, style, opening, free=('x', 'y', 'rx', 'ry')):
    def region(e):
        g = G.eye_geom(e, side, P, style)
        return ellipse_mask(A.shape, g['ex'], g['ey'], g['rx'], g['ry']) & poly_mask(A.shape, g['region'])
    def loss(v):
        e = dict(e0, **dict(zip(free, v)))
        # keep the lid's closed curve sane (it also shapes blinks)
        pen = max(0, abs(e['sag']) / e['ry'] - 0.35) * 2 if 'sag' in free else 0
        return 1 - iou(region(e), opening) + pen
    v0 = [e0[k] for k in free]
    steps = {'x': 5, 'y': 5, 'rx': 6, 'ry': 6, 'sag': 3}
    r = optimize.minimize(loss, v0, method='Nelder-Mead', options=dict(xatol=0.2, fatol=1e-5, maxiter=800,
                          initial_simplex=np.array(v0) + np.vstack([np.zeros(len(v0)), np.diag([steps[k] for k in free])])))
    e = dict(e0, **dict(zip(free, r.x)))
    return e, 1 - r.fun, region(e)


def fit_circle(xs, ys):
    A_ = np.column_stack([xs, ys, np.ones_like(xs)])
    b = xs * xs + ys * ys
    c, *_ = np.linalg.lstsq(A_, b, rcond=None)
    cx, cy = c[0] / 2, c[1] / 2
    r = np.sqrt(c[2] + cx * cx + cy * cy)
    return cx, cy, r


def measure_iris(A, opening, sclera, lid_edge=None, exclude_top_frac=0.0):
    """Iris = the non-sclera part of the opening; circle fitted to the
    iris/sclera boundary only (the lid edge is not the iris outline)."""
    iris = opening & ~cv2.dilate(sclera.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool)
    iris = cv2.morphologyEx(iris.astype(np.uint8), cv2.MORPH_OPEN, np.ones((7, 7), np.uint8)).astype(bool)
    iris = largest(iris)
    sc = cv2.dilate(sclera.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool)
    edge = iris & ~cv2.erode(iris.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool)
    bnd = edge & sc
    ys, xs = np.nonzero(bnd)
    cx, cy, r = fit_circle(xs.astype(float), ys.astype(float))
    # one robust refit without outliers
    d = np.abs(np.hypot(xs - cx, ys - cy) - r)
    k = d < 3
    if k.sum() > 20:
        cx, cy, r = fit_circle(xs[k].astype(float), ys[k].astype(float))
    return dict(cx=float(cx), cy=float(cy), r=float(r), mask=iris, boundary=bnd)


def measure_iris_radial(A, opening, sclera, c0):
    """Glitzi: the lid hides the iris top, so the outline is found along rays
    through the lower hemisphere (first pure-white sclera pixel), then a
    robust circle fit."""
    cx, cy = c0
    pts = []
    for th in np.radians(np.arange(-15, 196, 3)):
        dx, dy = np.cos(th), np.sin(th)
        for r in np.arange(8, 160, 0.5):
            x, y = int(round(cx + dx * r)), int(round(cy + dy * r))
            if not (0 <= y < A.shape[0] and 0 <= x < A.shape[1]) or not opening[y, x]:
                break
            if sclera[y, x]:
                pts.append((cx + dx * r, cy + dy * r))
                break
    pts = np.array(pts)
    x, y = pts[:, 0], pts[:, 1]
    fx, fy, fr = fit_circle(x, y)
    for _ in range(3):
        d = np.abs(np.hypot(x - fx, y - fy) - fr)
        k = d < max(2.5, np.percentile(d, 80))
        fx, fy, fr = fit_circle(x[k], y[k])
    return dict(cx=float(fx), cy=float(fy), r=float(fr), n=int(len(pts)))


def measure_spiral(A, guess):
    ex, ey, rr = guess['x'], guess['y'], guess['rx']
    x0, y0, x1, y1 = roi_box([[ex - rr, ey - rr], [ex + rr, ey + rr]], rr * 0.5, A.shape)
    sub = (slice(y0, y1), slice(x0, x1))
    rgb = A.rgb[sub]
    cyan = (rgb[..., 2] > 150) & (rgb[..., 1] > 130) & (rgb[..., 0] < 160)
    cyan = largest(cv2.morphologyEx(cyan.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8)), near=(ex - x0, ey - y0))
    ys, xs = np.nonzero(cyan)
    hull = cv2.convexHull(np.column_stack([xs, ys]).astype(np.int32))
    (cx, cy), r_enc = cv2.minEnclosingCircle(hull)
    # the outer edge of the dark ring: radial luminance profile minimum then rise
    yy, xx = np.mgrid[y0:y1, x0:x1]
    cxa, cya = cx + x0, cy + y0
    d = np.hypot(xx - cxa, yy - cya)
    L = A.L[sub]
    prof = [L[(d >= r) & (d < r + 1)].mean() for r in np.arange(0, r_enc * 1.35)]
    prof = np.array(prof)
    rs = np.arange(len(prof))
    # dark ring: lowest luminance beyond the cyan disc's enclosing radius
    win = (rs > r_enc * 0.9) & (rs < r_enc * 1.25)
    r_ring = rs[win][np.argmin(prof[win])]
    # outer edge where luminance recovers half way back to the body
    body_L = np.median(prof[(rs > r_enc * 1.25)])
    after = rs[(rs > r_ring) & (prof > (prof[r_ring] + body_L) / 2)]
    r_out = after[0] if len(after) else r_ring + 6
    m = np.zeros(A.shape, bool)
    m[sub] = d <= r_out
    return dict(cx=float(cxa), cy=float(cya), r_cyan=float(r_enc), r_ring=float(r_ring), r_out=float(r_out), mask=m,
                profile=prof.tolist())


def mouth_region_mask(A, guess_pts, margin, vmax=150):
    """Open mouth = dark interior + the tongue/lip that touches it. No convex
    hull: a painted upper lip can dip into the mouth (Zuzu)."""
    x0, y0, x1, y1 = roi_box(guess_pts, margin, A.shape)
    sub = (slice(y0, y1), slice(x0, x1))
    Hh, S, V = (A.hsv[sub][..., k] for k in range(3))
    dk = (V < vmax) & A.solid[sub]
    dk = cv2.morphologyEx(dk.astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    gc = np.asarray(guess_pts).mean(0) - [x0, y0]
    m0 = largest(dk, near=gc)
    # tongue: warm pink/red, touching the interior. On red/pink bodies the
    # tongue has the body's hue, so it is told apart by being paler.
    body = A.solid[sub] & ~cv2.dilate(m0.astype(np.uint8), np.ones((41, 41), np.uint8)).astype(bool)
    body_h, body_s = np.median(Hh[body]), np.median(S[body])
    tg = (((Hh > 160) | (Hh < 8)) & (S > 90) & (V > 120))
    if abs(body_h - 170) < 12 or body_h < 10:
        tg &= (S < 0.86 * body_s) | (np.abs(Hh - body_h) > 6)
    near = cv2.dilate(m0.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (31, 31))).astype(bool)
    ys0, xs0 = np.nonzero(m0)
    ymid = (ys0.min() + ys0.max()) / 2
    yy, xx = np.mgrid[0:m0.shape[0], 0:m0.shape[1]]
    tg &= (yy > ymid) & (xx > xs0.min()) & (xx < xs0.max())
    lab, n = ndimage.label(tg)
    keep = np.unique(lab[near & tg])
    tongue = np.isin(lab, keep[keep > 0])
    u = m0 | tongue
    # the lower half of a painted open mouth is a bowl: close it over the tongue
    low = u & (yy > ymid)
    if low.any():
        hull = cv2.convexHull(np.column_stack(np.nonzero(low)[::-1]).astype(np.int32))
        hm = np.zeros(u.shape, np.uint8)
        cv2.fillPoly(hm, [hull], 1)
        u = u | (hm.astype(bool) & (yy > ymid))
    u = cv2.morphologyEx(u.astype(np.uint8), cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)))
    u = ndimage.binary_fill_holes(u)
    u = largest(u, near=gc)
    full = np.zeros(A.shape, bool)
    full[sub] = u
    return full


def fit_open_mouth(A, M0, P, target, free=('x', 'y', 'w', 'upper', 'depth')):
    def region(M):
        g = G.mouth_geom(M, P)
        return poly_mask(A.shape, np.vstack([g['upper'], g['lower']]))

    def loss(v):
        return 1 - iou(region(dict(M0, **dict(zip(free, v)))), target)
    ys, xs = np.nonzero(target)
    steps = dict(x=5, y=5, w=8, upper=5, depth=6, sag=4)
    best = None
    # multi-start: painted lips can dip into the mouth (upper > 0) or arch
    w0 = xs.max() - xs.min()
    for up in (M0.get('upper', 0), 0.08 * w0, -0.06 * w0):
        for yk in (0.0, 0.12):
            S0 = dict(M0, x=(xs.min() + xs.max()) / 2, w=w0 * 0.97, y=ys.min() + yk * (ys.max() - ys.min()),
                      upper=up, depth=(ys.max() - ys.min()) * 0.9)
            v0 = [S0[k] for k in free]
            r = optimize.minimize(loss, v0, method='Nelder-Mead', options=dict(
                xatol=0.2, fatol=1e-5, maxiter=900,
                initial_simplex=np.array(v0) + np.vstack([np.zeros(len(v0)), np.diag([steps[k] for k in free])])))
            if best is None or r.fun < best.fun:
                best = r
    M = dict(M0, **dict(zip(free, best.x)))
    return M, 1 - best.fun, region(M)


def measure_crease(A, M0, P, margin):
    """Glitzi's carved frown: the groove is far darker than the body's own
    texture gaps once both are blurred, so its centreline is the per-column
    luminance minimum inside the darkest connected band."""
    g0 = G.mouth_geom(M0, P)
    x0, y0, x1, y1 = roi_box(g0['upper'], margin, A.shape)
    sub = (slice(y0, y1), slice(x0, x1))
    Lg = cv2.GaussianBlur(A.L, (0, 0), 6)[sub]
    floor = np.percentile(Lg, 2)
    dk = (Lg < floor + 6).astype(np.uint8)
    dk = cv2.morphologyEx(dk, cv2.MORPH_CLOSE, np.ones((5, 21), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(dk, 8)
    k = 1 + int(np.argmax(st[1:, 2]))  # the widest dark band is the groove
    core = lab == k
    xs = np.nonzero(core.any(0))[0]
    cy = np.array([np.argmin(np.where(core[:, x], Lg[:, x], 1e9)) for x in xs], float)
    depth = np.array([Lg[int(c), x] for c, x in zip(cy, xs)])
    # groove width: rows within +8 of the column minimum
    wid = np.array([((Lg[:, x] < Lg[int(c), x] + 8) & core[:, x]).sum() for c, x in zip(cy, xs)], float)
    full = np.zeros(A.shape, bool)
    full[sub] = core
    return dict(xs=xs + x0, ys=cy + y0, depth=depth, width=float(np.median(wid)), mask=full)


def fit_crease(M0, P, cr):
    xs, ys = cr['xs'].astype(float), cr['ys']
    wt = 1.0 / (1.0 + (cr['depth'] - cr['depth'].min()) / 4.0)

    def resid(v):
        M = dict(M0, x=v[0], y=v[1], w=v[2], sag=v[3])
        g = G.mouth_geom(M, P)
        cx, cyv = g['upper'][:, 0], g['upper'][:, 1]
        inside = (xs >= cx.min()) & (xs <= cx.max())
        yi = np.interp(xs, cx, cyv)
        r = np.where(inside, (yi - ys) * wt, 0)
        # ends: the drawn crease should end where the groove fades
        return np.concatenate([r, [(cx.min() - xs.min()) * 0.5, (cx.max() - xs.max()) * 0.5]])
    v0 = [(xs.min() + xs.max()) / 2, ys.max(), xs.max() - xs.min(), M0['sag']]
    r = optimize.least_squares(resid, v0)
    return dict(M0, x=r.x[0], y=r.x[1], w=r.x[2], sag=r.x[3], lw=cr['width']), float(np.sqrt(np.mean(r.fun[:-2] ** 2)))


def measure_cheek(A, guess, chan, margin, avoid=None):
    cx, cy, r = guess
    x0, y0, x1, y1 = roi_box([[cx - r, cy - r], [cx + r, cy + r]], margin, A.shape)
    sub = (slice(y0, y1), slice(x0, x1))
    c = A.rgb[sub][..., chan]
    w = A.solid[sub].astype(np.float64)
    yy, xx = np.mgrid[y0:y1, x0:x1]
    w *= np.hypot(xx - cx, yy - cy) < r * 1.7
    if avoid is not None:
        w *= ~cv2.dilate(avoid[sub].astype(np.uint8), np.ones((25, 25), np.uint8)).astype(bool)
    cb = cv2.GaussianBlur(A.rgb[..., chan] * A.solid, (0, 0), 90)[sub] / np.maximum(
        cv2.GaussianBlur(A.solid.astype(np.float64), (0, 0), 90)[sub], 1e-3)
    ex = np.clip(cv2.GaussianBlur(c - cb, (0, 0), 6), 0, None) * w
    if ex.max() <= 0:
        return None
    m = ex > 0.3 * ex.max()
    m = largest(m, near=(cx - x0, cy - y0))
    ys, xs = np.nonzero(m)
    wt = ex[m]
    mx, my = (xs * wt).sum() / wt.sum() + x0, (ys * wt).sum() / wt.sum() + y0
    # radius from the weighted second moment: a soft glow of std sigma reads
    # as a blush of about 2 sigma, which is how drawCheeks' gradient fades
    sig = np.sqrt((wt * ((xs + x0 - mx) ** 2 + (ys + y0 - my) ** 2)).sum() / wt.sum() / 2)
    rad = 2.0 * sig
    full = np.zeros(A.shape, bool)
    full[sub] = m
    return dict(x=float(mx), y=float(my), r=float(rad), mask=full)


OLD_GLITCH_ROWS = [61, 111, 122, 177, 215, 242, 269, 281, 329]   # rig.js GLITCH_ROWS (old art px)


def measure_glitch_rows(A, old_rows, mp, avoid):
    """Glitzi's neon glitch lines: bright saturated cyan/magenta (or white
    core) pixels that survive a long horizontal opening, counted per row.
    Each old row is mapped into the new space and snapped to the nearest
    detected line, so the rig keeps the same nine-line rhythm."""
    from scipy.signal import find_peaks
    Hh, S, V = (A.hsv[..., k] for k in range(3))
    neon = ((V > 200) & (S > 120) & (((Hh > 80) & (Hh < 105)) | ((Hh > 135) & (Hh < 172)))) | ((V > 235) & (S < 90))
    neon &= (A.al > 0.95) & ~cv2.dilate(avoid.astype(np.uint8), np.ones((25, 25), np.uint8)).astype(bool)
    ho = cv2.morphologyEx(neon.astype(np.uint8), cv2.MORPH_OPEN, np.ones((1, 25), np.uint8))
    thick = cv2.morphologyEx(ho, cv2.MORPH_OPEN, np.ones((13, 1), np.uint8))
    ho = (ho > 0) & ~(thick > 0)
    prof = ho.sum(1).astype(float)
    W = A.shape[1]
    pk, _ = find_peaks(prof, height=W * 0.06, distance=12, prominence=W * 0.03)
    ys = np.array([mp(0, r)[1] for r in old_rows])
    cost = np.abs(ys[:, None] - pk[None, :].astype(float))
    ri, ci = optimize.linear_sum_assignment(cost)   # one line per old row
    rows = [int(round(y)) for y in ys]
    for i, j in zip(ri, ci):
        if cost[i, j] < 30:
            rows[i] = int(pk[j])
    return sorted(rows), [int(p) for p in pk]


# --------------------------------------------------------------- run --
def body_box(A):
    return bbox(A.al > 3 / 255)


def rnd(v, k=1):
    if isinstance(v, dict):
        return {a: rnd(b, k) for a, b in v.items()}
    if isinstance(v, (list, tuple)):
        return [rnd(b, k) for b in v]
    if isinstance(v, (float, np.floating)):
        return round(float(v), k)
    if isinstance(v, np.integer):
        return int(v)
    return v


def measure(name):
    A = Art(name)
    mp, sx, sy = old_to_new(name, A.al * 255)
    old = OLD_REG[name]
    f = map_face(old['face'], mp, sx, sy)
    f['neutral'] = dict(f['neutral'], **NEUTRAL.get(name, {}))
    P = G.params(f['neutral'])
    style = f['eyeStyle']
    W = A.shape[1]
    out = {'size': [A.shape[1], A.shape[0]], 'bodyBox': body_box(A), 'map': {'sx': sx, 'sy': sy},
           'unit': (sx * sy) ** 0.5, 'mapped': rnd(f, 4), 'feats': {}, 'scores': {}}
    masks = {}
    feats = out['feats']
    # eyes ------------------------------------------------------------
    for s in 'LR':
        e = f['eyes'][s]
        if style == 'closed':
            g = G.eye_geom(e, s, P, 'closed')
            # wide window: redraws move and tilt closed eyes (Loomi's rise
            # ~36 px toward the nose), a tight one cuts the stroke
            st = measure_stroke(A, g['upper'], margin=0.08 * W)
            e1 = dict(e, **stroke_to_closed_eye(st, s))
            e1, sc = fit_closed_eye(A, e1, s, st, P)
            # open-eye geometry keeps the old proportions to the visible lid
            # line; the old hw included the round caps, the new one does not
            k = (e1['hw'] + e1['lw'] / 2) / (e['hw'])
            for kk in ('rx', 'ry', 'irisR'):
                e1[kk] = e[kk] * k
            e1['irisOff'] = [v * k for v in e['irisOff']]
            feats['eye' + s] = e1
            out['scores']['eye' + s] = sc
            masks['eye' + s] = st['mask']
        elif style in ('open', 'glitzi'):
            opening, sclera = opening_mask(A, e, margin=0.06 * W, ember=style == 'glitzi')
            free = ('x', 'y', 'rx', 'ry') if style == 'open' else ('x', 'y', 'rx', 'ry', 'sag')
            e_start = dict(e, ry=e['ry'] * 0.8, sag=e['ry'] * 0.16) if style == 'glitzi' else e
            e1, sc, reg = fit_open_eye(A, e_start, s, P, style, opening, free=free)
            ir = measure_iris(A, opening, sclera)
            if style == 'glitzi':
                rr = measure_iris_radial(A, opening, sclera, (ir['cx'], ir['cy']))
                ir.update(rr)
            # iris offset is relative to where the neutral gaze puts it
            irR = ir['r']
            lx, ly = P['lookX'], P['lookY']
            e1['irisR'] = irR
            e1['irisOff'] = [ir['cx'] - e1['x'] - lx * (e1['rx'] - irR) * 0.85,
                             ir['cy'] - e1['y'] - ly * (e1['ry'] - irR) * 0.8]
            k = e1['rx'] / e['rx']
            if style == 'open':
                e1['hw'] = e['hw'] * k
                e1['sag'] = e['sag'] * e1['ry'] / e['ry']
            else:
                e1['hw'] = e['hw'] * k
            e1['lw'] = e['lw'] * k
            feats['eye' + s] = e1
            feats['iris' + s] = {kk: v for kk, v in ir.items() if kk not in ('mask', 'boundary')}
            out['scores']['eye' + s] = sc
            masks['eye' + s] = opening
            masks['sclera' + s] = sclera
            masks['iris' + s] = ir['mask']
        elif style == 'spiral':
            sp = measure_spiral(A, e)
            e1 = dict(e, x=sp['cx'], y=sp['cy'])
            k = sp['r_out'] / (e['rx'] * 60 / 57)
            e1['rx'] = e1['ry'] = sp['r_out'] * 57 / 60
            e1['spriteR'] = sp['r_out']
            e1['hw'] = e['hw'] * k
            e1['sag'] = e['sag'] * k
            e1['lw'] = e['lw'] * k
            feats['eye' + s] = e1
            feats['spiral' + s] = {kk: v for kk, v in sp.items() if kk != 'mask'}
            masks['eye' + s] = sp['mask']
    # brows -----------------------------------------------------------
    for s in 'LR':
        b = f['brows'][s]
        e_old, e_new = f['eyes'][s], feats['eye' + s]
        if b['alpha'] > 0 and name != 'loomi':
            st = measure_stroke(A, [b['p0'], b['c'], b['p1']], margin=0.04 * W)
            feats['brow' + s] = dict(b, p0=st['p0'], c=st['ctrl'], p1=st['p1'], lw=st['width'])
            masks['brow' + s] = st['mask']
        else:
            # no painted brow: keep the old placement relative to the eye
            ref_old = e_old['hw'] if style == 'closed' else e_old['rx']
            ref_new = e_new['hw'] if style == 'closed' else e_new['rx']
            k = ref_new / ref_old
            def rel(p):
                return [e_new['x'] + (p[0] - e_old['x']) * k, e_new['y'] + (p[1] - e_old['y']) * k]
            feats['brow' + s] = dict(b, p0=rel(b['p0']), c=rel(b['c']), p1=rel(b['p1']), lw=b['lw'] * k,
                                     alpha=0 if name == 'loomi' else b['alpha'])
    # mouth -----------------------------------------------------------
    M = f['mouth']
    if M['style'] == 'line':
        g = G.mouth_geom(M, P)
        st = measure_stroke(A, g['upper'], margin=0.07 * W)
        M1 = dict(M, **stroke_to_line_mouth(st))
        M1, sc = fit_line_mouth(A, M1, st, P)
        feats['mouth'] = M1
        out['scores']['mouth'] = sc
        masks['mouth'] = st['mask']
    elif M['style'] == 'open':
        g = G.mouth_geom(M, P)
        target = mouth_region_mask(A, np.vstack([g['upper'], g['lower']]), margin=0.05 * W)
        M1, sc, reg = fit_open_mouth(A, M, P, target)
        k = M1['w'] / M['w']
        M1['lw'] = M['lw'] * k
        out['scores']['mouth_iou_fit'] = sc
        out['mouth_iou_fit'] = rnd(M1, 2)
        if name in MOUTH_LANDMARKS:
            M1 = mouth_from_landmarks(M1, P, MOUTH_LANDMARKS[name])
            g = G.mouth_geom(M1, P)
            sc = iou(poly_mask(A.shape, np.vstack([g['upper'], g['lower']])), target)
        feats['mouth'] = M1
        out['scores']['mouth'] = sc
        masks['mouth'] = target
    elif M['style'] == 'crease':
        cr = measure_crease(A, M, P, margin=0.05 * W)
        M1, rms = fit_crease(M, P, cr)
        feats['mouth'] = M1
        out['scores']['mouth_rms_px'] = rms
        masks['mouth'] = cr['mask']
    # cheeks ----------------------------------------------------------
    body_med = np.median(A.rgb[A.solid], axis=0)
    chan = int(np.argmin(body_med)) if name != 'zuzu' else 1
    ch = dict(f['cheeks'])
    for s in 'LR':
        avoid = np.zeros(A.shape, bool)
        for kk, mm in masks.items():
            avoid |= mm
        c = measure_cheek(A, f['cheeks'][s], chan, margin=0.06 * W, avoid=avoid) if f['cheeks'].get('base', 1) > 0 else None
        if c is not None:
            # the 2-sigma core under-reads a soft halo: keep the hand-tuned
            # (mapped) radius unless the painted blush is larger
            ch[s] = [c['x'], c['y'], max(c['r'], f['cheeks'][s][2])]
            masks['cheek' + s] = c['mask']
    feats['cheeks'] = ch
    if name == 'glitzi':
        avoid = masks['eyeL'] | masks['eyeR']
        out['glitchRows'], out['glitchPeaks'] = measure_glitch_rows(A, OLD_GLITCH_ROWS, mp, avoid)
    np.savez_compressed(f'{WORK}/masks_{name}.npz', **masks)
    json.dump(rnd(out, 3), open(f'{WORK}/measure-{name}.json', 'w'), indent=1)
    overlay(name, A, out, masks)
    return out


def overlay(name, A, out, masks):
    bg = Image.new('RGBA', (A.shape[1], A.shape[0]), (128, 128, 140, 255))
    bg.alpha_composite(Image.fromarray(A.img, 'RGBA'))
    tint = np.zeros((A.shape[0], A.shape[1], 4), np.uint8)
    for k, m in masks.items():
        tint[m] = (0, 255, 0, 60) if not k.startswith('cheek') else (255, 0, 255, 50)
    bg.alpha_composite(Image.fromarray(tint, 'RGBA'))
    d = ImageDraw.Draw(bg)
    f = out['feats']
    neutral = out['mapped']['neutral']
    P = G.params(neutral)
    style = out['mapped']['eyeStyle']
    for s in 'LR':
        e = f['eye' + s]
        g = G.eye_geom(e, s, P, style)
        d.line([tuple(p) for p in g['upper']], fill=(255, 40, 40, 255), width=2)
        if g['o'] > 0.015:
            d.line([tuple(p) for p in g['lower']], fill=(255, 40, 40, 160), width=1)
            d.ellipse([g['ex'] - g['rx'], g['ey'] - g['ry'], g['ex'] + g['rx'], g['ey'] + g['ry']], outline=(40, 255, 255, 255), width=2)
        if 'iris' + s in f:
            ir = f['iris' + s]
            d.ellipse([ir['cx'] - ir['r'], ir['cy'] - ir['r'], ir['cx'] + ir['r'], ir['cy'] + ir['r']], outline=(0, 120, 255, 255), width=2)
        b = f['brow' + s]
        d.line([tuple(p) for p in G.brow_curve(b, e, s, P)], fill=(255, 255, 0, 255 if b['alpha'] > 0 else 120), width=2)
        cx, cy, r = f['cheeks'][s]
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(255, 0, 255, 255), width=2)
    gm = G.mouth_geom(f['mouth'], P)
    d.line([tuple(p) for p in gm['upper']], fill=(0, 200, 255, 255), width=2)
    if gm['open']:
        d.line([tuple(p) for p in gm['lower']], fill=(0, 200, 255, 255), width=2)
    bb = out['bodyBox']
    d.rectangle(bb, outline=(255, 255, 255, 120))
    bg.convert('RGB').save(f'{WORK}/measure_{name}.png')


if __name__ == '__main__':
    for name in IDS:
        o = measure(name)
        print(name, json.dumps(rnd(o['scores'], 3)), 'unit %.3f' % o['unit'])
