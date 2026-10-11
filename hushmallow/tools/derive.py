"""Derive rig layers from the approved Mallow PNGs:
  * <name>-body.png : the approved artwork with its eyes / brows / mouth
    removed by texture-aware inpainting (smooth shading fill + the body's own
    surface texture copied from a nearby donor patch), so animated features
    never sit on top of the old ones.
  * sprites cut from the approved art: Pipzi / Boppo irises, Zuzu spirals,
    and recoloured variants of Boppo's iris for Mallows whose approved face
    has closed eyes (used only when they open their eyes).
"""
import json, sys
import numpy as np
import cv2
from PIL import Image

SRC, DET, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
F = json.load(open(f'{DET}/features.json'))
NAMES = ['noomi', 'blubi', 'pipzi', 'boppo', 'zuzu', 'loomi', 'glitzi']

# Glitzi: lids occlude the sclera so detection under-fits; measured by hand.
GLITZI_EYES = {'eyeL': (126, 214, 58, 33), 'eyeR': (258, 206, 57, 39)}


def erase_mask(name, shape):
    masks = np.load(f'{DET}/masks_{name}.npz')
    H, W = shape
    m = np.zeros((H, W), np.uint8)
    for key, f in F[name].items():
        k = f['kind']
        if k == 'line':
            mm = masks[key].astype(np.uint8)
            m |= cv2.dilate(mm, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (27, 27)))
        elif k == 'eye' and name != 'glitzi':
            cx, cy = f['center']
            cv2.ellipse(m, (int(cx), int(cy)), (int(f['rx'] + 13), int(f['ry'] + 13)), 0, 0, 360, 1, -1)
        elif k == 'spiral':
            cx, cy = f['center']
            cv2.circle(m, (int(cx), int(cy)), int(f['r'] + 14), 1, -1)
        elif k == 'mouth':
            mm = masks[key].astype(np.uint8)
            m |= cv2.dilate(mm, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (27, 27)))
    if name == 'pipzi':
        cv2.ellipse(m, (218, 330), (52, 30), 0, 0, 360, 1, -1)
    if name == 'zuzu':
        cv2.ellipse(m, (188, 302), (52, 28), 0, 0, 360, 1, -1)
    if name == 'boppo':
        cv2.ellipse(m, (190, 268), (52, 26), 0, 0, 360, 1, -1)
    if name == 'glitzi':
        for (cx, cy, rx, ry) in GLITZI_EYES.values():
            cv2.ellipse(m, (cx, cy), (rx + 8, ry + 8), 0, 0, 360, 1, -1)
            # heavy-lid outline above the sclera
            cv2.ellipse(m, (cx, cy - ry + 2), (rx + 4, 16), 0, 180, 360, 1, -1)
        # carved frown crease
        pts = np.array([[112, 290], [118, 272], [160, 262], [198, 258], [238, 262],
                        [282, 271], [286, 292], [240, 288], [198, 284], [158, 288]], np.int32)
        cv2.fillPoly(m, [pts], 1)
    return m


def inpaint(name, img, mask):
    rgb = img[..., :3].astype(np.float32)
    al = img[..., 3].astype(np.float32) / 255
    H, W = mask.shape
    # low frequency: membrane-like fill of the blurred image
    sigma = 3.0
    low = cv2.GaussianBlur(rgb, (0, 0), sigma)
    high = rgb - low
    grow = cv2.dilate(mask, np.ones((5, 5), np.uint8))
    keep = (1 - grow).astype(np.float32) * (al > 0.5)
    num = cv2.GaussianBlur(rgb * keep[..., None], (0, 0), sigma)
    den = cv2.GaussianBlur(keep, (0, 0), sigma)[..., None]
    lowc = np.where(den > 0.05, num / np.maximum(den, 1e-4), low)
    low8 = np.clip(lowc, 0, 255).astype(np.uint8)
    lowfill = cv2.inpaint(low8, grow, 18, cv2.INPAINT_TELEA).astype(np.float32)
    lowfill = cv2.GaussianBlur(lowfill, (0, 0), 3.0) * grow[..., None] + low * (1 - grow[..., None])
    # high frequency: the body's own surface texture from a donor patch
    body = (al > 0.96).astype(np.uint8)
    body = cv2.erode(body, np.ones((15, 15), np.uint8))
    forbidden = cv2.dilate(mask, np.ones((9, 9), np.uint8))
    horiz_only = name == 'glitzi'   # keep glitch lines on their rows
    ok = body.astype(bool) & ~forbidden.astype(bool)
    # One continuous donor offset per horizontal band of the mask (split into
    # column chunks only when a band has no valid donor). A translated copy has
    # no repeats and needs no window averaging, so texture contrast survives.
    cands = []
    for dx in range(-240, 241, 2):
        for dy in range(-140, 141, 2):
            if dx or dy:
                cands.append((abs(dx) + abs(dy) * (8.0 if horiz_only else 1.3), dx, dy))
    cands.sort()
    hf = np.zeros_like(high)
    wsum = np.zeros((H, W), np.float32)
    BAND, OVER = 34, 10
    gm = grow.astype(bool)
    ys_all = np.nonzero(gm.any(1))[0]

    def find(ys, xs):
        for _, dx, dy in cands:
            sy, sx = ys + dy, xs + dx
            if sy.min() < 0 or sx.min() < 0 or sy.max() >= H or sx.max() >= W:
                continue
            if ok[sy, sx].all():
                return dx, dy
        return None

    def place(y0, y1, x0, x1, depth=0):
        sub = np.zeros_like(gm)
        sub[y0:y1, x0:x1] = gm[y0:y1, x0:x1]
        ys, xs = np.nonzero(sub)
        if not len(ys):
            return
        off = find(ys, xs)
        if off is None:
            if x1 - x0 > 28 and depth < 6:
                xm = (x0 + x1) // 2
                place(y0, y1, x0, xm + 6, depth + 1)
                place(y0, y1, xm - 6, x1, depth + 1)
            return
        dx, dy = off
        # vertical feather inside the band overlap, horizontal at chunk edges
        wy = np.ones(y1 - y0, np.float32)
        r = min(OVER, (y1 - y0) // 2)
        if r > 0:
            ramp = np.linspace(0.05, 1, r)
            wy[:r] = ramp
            wy[-r:] = ramp[::-1]
        wx = np.ones(x1 - x0, np.float32)
        if depth > 0:
            rx = min(6, (x1 - x0) // 2)
            rampx = np.linspace(0.05, 1, rx)
            wx[:rx] = rampx
            wx[-rx:] = rampx[::-1]
        w = (wy[:, None] * wx[None, :])[ys - y0, xs - x0]
        hf[ys, xs] += high[ys + dy, xs + dx] * w[:, None]
        wsum[ys, xs] += w

    if len(ys_all):
        y = ys_all.min()
        while y <= ys_all.max():
            y1 = min(H, y + BAND)
            place(max(0, y - OVER), y1, 0, W)
            y = y1 - OVER + OVER  # next band starts where this one ended
    hf = np.where(wsum[..., None] > 1e-3, hf / np.maximum(wsum, 1e-3)[..., None], 0)
    # match texture contrast to the ring of untouched body around the face
    ring = cv2.dilate(mask, np.ones((41, 41), np.uint8)).astype(bool) & ~cv2.dilate(mask, np.ones((11, 11), np.uint8)).astype(bool) & (al > 0.98)
    if ring.any():
        k = np.clip(high[ring].std() / max(hf[gm].std(), 1e-3), 1.0, 1.3)
        hf *= k
    missing = gm & (wsum < 1e-3)
    if missing.any():
        print('  unfilled texture px', name, int(missing.sum()))
    filled = lowfill + hf
    # feathered blend back into the untouched artwork
    feather = cv2.GaussianBlur(grow.astype(np.float32), (0, 0), 1.6)
    feather = np.clip(feather * 1.6, 0, 1)[..., None]
    out = rgb * (1 - feather) + filled * feather
    res = img.copy()
    res[..., :3] = np.clip(out, 0, 255).astype(np.uint8)
    return res


def cut_circle(img, cx, cy, r, soft=1.5):
    H, W = img.shape[:2]
    R = int(np.ceil(r + 2))
    x0, y0 = int(round(cx)) - R, int(round(cy)) - R
    crop = img[y0:y0 + 2 * R, x0:x0 + 2 * R].copy()
    yy, xx = np.mgrid[0:2 * R, 0:2 * R] + 0.5
    d = np.hypot(xx - (cx - x0), yy - (cy - y0))
    a = np.clip((r - d) / soft + 0.5, 0, 1)
    crop[..., 3] = (crop[..., 3].astype(np.float32) * a).astype(np.uint8)
    return crop


def recolour(sprite, hue_deg, sat_mul=1.0, val_mul=1.0):
    rgb = sprite[..., :3]
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV_FULL).astype(np.float32)
    # keep the near-white sparkles white, shift everything else
    hsv[..., 0] = (hue_deg / 360.0 * 255.0)
    hsv[..., 1] = np.clip(hsv[..., 1] * sat_mul, 0, 255)
    hsv[..., 2] = np.clip(hsv[..., 2] * val_mul, 0, 255)
    out = sprite.copy()
    out[..., :3] = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2RGB_FULL)
    return out


if __name__ == '__main__':
    meta = {}
    for name in NAMES:
        img = np.array(Image.open(f'{SRC}/{name}.png').convert('RGBA'))
        m = erase_mask(name, img.shape[:2])
        body = inpaint(name, img, m)
        Image.fromarray(body, 'RGBA').save(f'{OUT}/{name}-body.png', optimize=True)
        Image.fromarray((m * 255).astype(np.uint8)).save(f'{DET}/erase_{name}.png')
        meta[name] = {'size': [img.shape[1], img.shape[0]]}
        f = F[name]
        if name in ('pipzi', 'boppo'):
            for side in ('eyeL', 'eyeR'):
                ix, iy = f[side]['iris']
                r = f[side]['irisR'] - 0.5
                spr = cut_circle(img, ix, iy, r)
                Image.fromarray(spr, 'RGBA').save(f'{OUT}/{name}-iris-{side[-1]}.png', optimize=True)
        if name == 'zuzu':
            for side in ('eyeL', 'eyeR'):
                cx, cy = f[side]['center']
                spr = cut_circle(img, cx, cy, f[side]['r'] + 3, soft=2.0)
                Image.fromarray(spr, 'RGBA').save(f'{OUT}/zuzu-spiral-{side[-1]}.png', optimize=True)
        print('done', name)
    # Boppo's approved sparkle iris, recoloured for the Mallows whose approved
    # face has closed eyes (deep navy, matching their line colour) and for
    # Glitzi (amber, matching its approved iris)
    boppo = np.array(Image.open(f'{OUT}/boppo-iris-L.png'))
    Image.fromarray(recolour(boppo, 232, 1.0, 1.15), 'RGBA').save(f'{OUT}/iris-navy.png')
    Image.fromarray(recolour(boppo, 28, 1.05, 1.35), 'RGBA').save(f'{OUT}/iris-amber.png')
    json.dump(meta, open(f'{OUT}/derive-report.json', 'w'), indent=1)
