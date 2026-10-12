"""Face-cleaned bodies and sprites for the high-res rig (W7, step 3 of 4).

    python3 tools/hires/derive.py <work_dir> <rig_out_dir> [ids...]

Reads <work_dir>/<id>.png (prepare.py), measure-<id>.json and masks_<id>.npz
(measure.py). Writes to <rig_out_dir>:
  <id>-body.webp       the approved cut-out with its eyes, brows and mouth
                       removed, so the animated face never sits on the
                       painted one. Alpha is untouched (the rig cross-fades
                       the approved art over it with source-atop).
  glitzi-iris-L|R      Glitzi's own fiery iris, cut from its art; the part the
                       heavy lid hides is rebuilt by mirroring the visible
                       half across the iris centre line (never invented).
  zuzu-spiral-L|R      Zuzu's spirals with their dark rim (drawn at native px).
  boppo-/pipzi-iris-L|R  irises cut from the art.
  iris-navy            Boppo's iris recoloured for the closed-eyed Mallows.
and <work_dir>/erase_<id>.png (the removal mask) for review.

Body reconstruction, per Mallow:
  * shading: the face region is filled by a harmonic (Laplace) solve of the
    body's own blurred shading (Glitzi: anisotropic, so its glow bands stay
    on their rows),
  * texture: the high-frequency surface (cauliflower bumps, sparkles, glitch
    lines) is copied from clean body bands nearby. Every donor offset is
    checked exactly with an FFT cross-correlation of the band mask against
    the clean-body map, and scored by distance and shading similarity.
"""
import json, sys, os
import numpy as np
import cv2
from scipy import ndimage, sparse
from scipy.sparse.linalg import splu
from scipy.signal import fftconvolve
from PIL import Image

WORK, OUT = sys.argv[1], sys.argv[2]
IDS = sys.argv[3:] or ['glitzi', 'zuzu', 'boppo', 'pipzi', 'blubi', 'loomi', 'noomi']
os.makedirs(OUT, exist_ok=True)


def disk(r):
    r = max(1, int(round(r)))
    return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))


def dil(m, r):
    return cv2.dilate(m.astype(np.uint8), disk(r)).astype(bool)


# ------------------------------------------------------------- masks --
def loose_stroke(mask, img, u):
    """Painted strokes taper into lighter ends and soft shadows that the
    detection threshold misses: grow the stroke into every pixel near it that
    is clearly darker than the local body."""
    L = img[..., :3].astype(np.float64) @ [0.299, 0.587, 0.114]
    solid = (img[..., 3] > 240).astype(np.float64)
    near = dil(mask, 9 * u)
    Lb, _ = norm_blur(L, (solid * ~near).astype(np.float64), 14 * u)
    dark = near & (L < 0.82 * Lb)
    lab, n = ndimage.label(dark | mask)
    keep = np.unique(lab[mask])
    return np.isin(lab, keep[keep > 0])


def erase_mask(name, meas, masks, shape, img=None):
    u = meas['unit']
    f = meas['feats']
    style = meas['mapped']['eyeStyle']
    m = np.zeros(shape, bool)
    for s in 'LR':
        if style == 'closed':
            m |= dil(loose_stroke(masks['eye' + s], img, u), 12 * u)
        elif style == 'open':
            # sclera, its dark outline ring and the light rim halo around it;
            # inside the blush only a thin margin: the blush (and the eye's
            # glow over it) belongs to the approved face, and the harmonic
            # fill then lights the opening from it, as the current bodies do
            em = dil(masks['eye' + s], 12 * u)
            cxx, cyy, cr = f['cheeks'][s]
            yy, xx = np.mgrid[0:shape[0], 0:shape[1]]
            blush = np.hypot(xx - cxx, yy - cyy) < cr * 1.05
            m |= em & ~(blush & ~dil(masks['eye' + s], 4 * u))
        elif style == 'spiral':
            sp = f['spiral' + s]
            c = np.zeros(shape, np.uint8)
            # the spiral and its dark rim go; its soft blue glow on the body
            # stays, so leaving rest does not make the glow vanish
            cv2.circle(c, (int(round(sp['cx'])), int(round(sp['cy']))), int(round(sp['r_out'] + 3 * u)), 1, -1)
            m |= c.astype(bool)
        elif style == 'glitzi':
            # the opening plus its dark outline and the lid's shadow line,
            # but the heavy lid ridges above stay: they are Glitzi's body
            op = masks['eye' + s]
            grown = dil(op, 9 * u)
            ys, xs = np.nonzero(op)
            top = np.full(shape[1], -1)
            for x in np.unique(xs):
                top[x] = ys[xs == x].min()
            # smooth the top boundary and allow only a small rise above it
            valid = top >= 0
            tx = np.arange(shape[1])
            topi = np.interp(tx, tx[valid], top[valid])
            topi = ndimage.gaussian_filter1d(topi, 6)
            yy = np.arange(shape[0])[:, None]
            x0, x1 = xs.min(), xs.max()
            limit = (yy >= topi[None, :] - 4.5 * u) | (tx[None, :] < x0 - 2 * u) | (tx[None, :] > x1 + 2 * u)
            m |= grown & limit
        if 'brow' + s in masks:
            m |= dil(loose_stroke(masks['brow' + s], img, u), 12 * u)
    mouth = f['mouth']
    if mouth['style'] == 'crease':
        m |= dil(masks['mouth'], 9 * u)
    elif mouth['style'] == 'line':
        m |= dil(loose_stroke(masks['mouth'], img, u), 12 * u)
    else:
        m |= dil(masks['mouth'], 12 * u)
    return m


def restore_cheeks(body, img, erase, meas):
    """The blush is part of the approved face, but an eye or mouth margin
    can bite into it. The blush is a soft radial glow, so the bitten part
    gets the radial colour profile measured from the blush's intact pixels,
    and its glitter (the fine detail above that profile) is taken from the
    intact lower half, mirrored across the blush's centre line."""
    ch = meas['feats']['cheeks']
    if ch.get('base', 1) <= 0:
        return body
    u = meas['unit']
    H, W = erase.shape
    out = body.astype(np.float64)
    sig = 3.0 * u
    orig_lf = cv2.GaussianBlur(img[..., :3].astype(np.float64), (0, 0), sig)
    intact = (~dil(erase, 1.5 * u)) & (img[..., 3] > 250)
    yy, xx = np.mgrid[0:H, 0:W]
    for s in 'LR':
        cx, cy, r = ch[s]
        d = np.hypot(xx - cx, yy - cy)
        reg = erase & (d < 1.3 * r)
        if not reg.any():
            continue
        bins = np.arange(0, 1.5 * r + 3, 1.5)
        prof = np.full((len(bins), 3), np.nan)
        sel = intact & (d < 1.5 * r)
        bi = np.digitize(d[sel], bins) - 1
        vals = orig_lf[sel]
        for k in range(len(bins)):
            v = vals[bi == k]
            if len(v) > 12:
                prof[k] = np.median(v, axis=0)
        ok = ~np.isnan(prof[:, 0])
        if ok.sum() < 5:
            continue
        for c in range(3):
            prof[:, c] = np.interp(bins, bins[ok], prof[ok, c])
            prof[:, c] = ndimage.gaussian_filter1d(prof[:, c], 2)
        cur_lf = cv2.GaussianBlur(out[..., :3], (0, 0), sig)
        target = np.stack([np.interp(d, bins, prof[:, c]) for c in range(3)], -1)
        w = np.clip((1.3 * r - d) / (0.3 * r), 0, 1) * reg
        w = cv2.GaussianBlur(w, (0, 0), 1.5 * u)
        out[..., :3] += (target - cur_lf) * w[..., None]
        # glitter: mirrored fine detail of the intact blush, only where the
        # mirror source is itself intact, faded out toward the blush edge
        my = np.clip(np.round(2 * cy - yy).astype(int), 0, H - 1)
        src_hf = img[..., :3].astype(np.float64) - orig_lf
        cur_hf = out[..., :3] - cv2.GaussianBlur(out[..., :3], (0, 0), sig)
        ok = intact[my, xx]
        wg = np.clip((1.05 * r - d) / (0.35 * r), 0, 1) * reg * ok
        wg = cv2.GaussianBlur(wg, (0, 0), 1.0 * u)
        out[..., :3] += (src_hf[my, xx] - cur_hf) * wg[..., None]
    res = body.copy()
    res[..., :3] = np.clip(np.round(out[..., :3]), 0, 255).astype(np.uint8)
    res[..., :3][img[..., 3] == 0] = 0
    return res


# ---------------------------------------------------------- inpaint --
def norm_blur(img, w, sigma):
    if img.ndim == 2:
        num = cv2.GaussianBlur(img * w, (0, 0), sigma)
        den = cv2.GaussianBlur(w, (0, 0), sigma)
        return num / np.maximum(den, 1e-4), den
    num = cv2.GaussianBlur(img * w[..., None], (0, 0), sigma)
    den = cv2.GaussianBlur(w, (0, 0), sigma)[..., None]
    return num / np.maximum(den, 1e-4), den[..., 0]


def harmonic_fill(img, unknown, wx=1.0, wy=1.0, scale=4):
    """Solve the (anisotropic) Laplace equation inside `unknown` with the
    surrounding pixels as boundary values, at 1/scale resolution."""
    H, W = unknown.shape
    h, w = (H + scale - 1) // scale, (W + scale - 1) // scale
    small = cv2.resize(img, (w, h), interpolation=cv2.INTER_AREA)
    unk = cv2.resize(unknown.astype(np.float32), (w, h), interpolation=cv2.INTER_AREA) > 0.001
    idx = -np.ones((h, w), np.int64)
    ys, xs = np.nonzero(unk)
    idx[ys, xs] = np.arange(len(ys))
    n = len(ys)
    rows, cols, vals = [], [], []
    rhs = np.zeros((n, img.shape[2]))
    diag = np.zeros(n)
    for dy, dx, wt in ((0, 1, wx), (0, -1, wx), (1, 0, wy), (-1, 0, wy)):
        y2, x2 = ys + dy, xs + dx
        ok = (y2 >= 0) & (y2 < h) & (x2 >= 0) & (x2 < w)
        diag[ok] += wt
        j = np.where(ok, idx[np.clip(y2, 0, h - 1), np.clip(x2, 0, w - 1)], -1)
        inner = ok & (j >= 0)
        rows.append(np.nonzero(inner)[0]); cols.append(j[inner]); vals.append(np.full(inner.sum(), -wt))
        bnd = ok & (j < 0)
        rhs[bnd] += wt * small[y2[bnd], x2[bnd]]
    rows.append(np.arange(n)); cols.append(np.arange(n)); vals.append(diag)
    Amat = sparse.csc_matrix((np.concatenate(vals), (np.concatenate(rows), np.concatenate(cols))), shape=(n, n))
    sol = splu(Amat).solve(rhs)
    out = small.copy()
    out[ys, xs] = sol
    return cv2.resize(out, (W, H), interpolation=cv2.INTER_CUBIC)


def quilt(high, hole, src_ok, P, O, K=700, seed=1):
    """Image quilting of the texture layer inside `hole`: overlapping PxP
    patches taken from `src_ok`, each picked by its match to everything
    already known in its window (the untouched surround and the patches
    placed before it), blended with feathered overlaps."""
    rng = np.random.default_rng(seed)
    H, W, C = high.shape
    out = np.where(hole[..., None], 0, high)
    known = ~hole
    ii = np.pad(src_ok.astype(np.int32), ((1, 0), (1, 0))).cumsum(0).cumsum(1)
    full = ii[P:, P:] - ii[:-P, P:] - ii[P:, :-P] + ii[:-P, :-P]
    cy_, cx_ = np.nonzero(full == P * P)
    if not len(cy_):
        raise RuntimeError('no source patches')
    step = P - O
    ys, xs = np.nonzero(hole)
    oy = np.arange(P)[:, None]
    ox = np.arange(P)[None, :]
    ramp = np.minimum(1, (np.minimum(oy, P - 1 - oy) + 1) / O) * np.minimum(1, (np.minimum(ox, P - 1 - ox) + 1) / O)
    for y in range(max(0, ys.min() - O), ys.max() + 1, step):
        for x in range(max(0, xs.min() - O), xs.max() + 1, step):
            y1, x1 = min(H, y + P), min(W, x + P)
            hw = hole[y:y1, x:x1]
            if not hw.any():
                continue
            ph, pw = y1 - y, x1 - x
            kn = known[y:y1, x:x1].astype(np.float64)
            tgt = out[y:y1, x:x1]
            # candidates: prefer nearby source patches
            d = np.abs(cy_ - y) + np.abs(cx_ - x)
            near = np.nonzero(d < 260)[0]
            pool = near if len(near) > K // 2 else np.arange(len(cy_))
            pick = rng.choice(pool, size=min(K, len(pool)), replace=False)
            py, px = cy_[pick], cx_[pick]
            patches = high[py[:, None, None] + oy[None, :ph, :1], px[:, None, None] + ox[None, :1, :pw]]
            if kn.sum() > 0:
                err = (((patches - tgt[None]) ** 2).sum(-1) * kn[None]).sum((1, 2)) / kn.sum()
            else:
                err = np.zeros(len(pick))
            best = np.argsort(err)[:3]
            j = best[rng.integers(len(best))]
            patch = patches[j]
            # feather into what is already synthesised; original pixels stay
            wv = ramp[:ph, :pw]
            synth = hw & known[y:y1, x:x1]
            fresh = hw & ~known[y:y1, x:x1]
            blk = out[y:y1, x:x1]
            blk[fresh] = patch[fresh]
            blk[synth] = blk[synth] * (1 - wv[synth][:, None]) + patch[synth] * wv[synth][:, None]
            known[y:y1, x:x1] |= hw
    return np.where(hole[..., None], out, 0)


def inpaint(name, img, mask, unit, protect=None):
    rgb = img[..., :3].astype(np.float64)
    al = img[..., 3].astype(np.float64) / 255
    H, W = mask.shape
    glitzi = name == 'glitzi'
    grow = dil(mask, 2 * unit)
    known = (~grow) & (al > 0.5)
    hsv = cv2.cvtColor(img[..., :3], cv2.COLOR_RGB2HSV).astype(np.float64)
    if glitzi:
        # Glitzi's shading is the dark body under the neon: leave the glitch
        # lines and sparkles out of it, they belong to the copied texture
        neon = (hsv[..., 2] > 150) & ((hsv[..., 1] > 110) | (hsv[..., 2] > 220))
        known &= ~dil(neon, 2.5 * unit)
    s_lo = (6.0 if glitzi else 9.0) * unit
    lf_known, den = norm_blur(rgb, known.astype(np.float64), s_lo)
    unknown = grow | (den < 0.05)
    lf_known[~(al > 0.02)] = 0
    lf = harmonic_fill(lf_known, unknown & (al > 0.02), wx=1.0, wy=1.0)
    lf = np.where(unknown[..., None], lf, lf_known)
    high = rgb - lf_known            # texture relative to clean shading
    # ---------------- texture: patch quilting from the hole's surroundings --
    body = cv2.erode((al > 0.985).astype(np.uint8), disk(5 * unit)).astype(bool)
    src = body & ~dil(mask, 4 * unit) & dil(mask, 55 * unit)
    if glitzi:
        # not the neon rim along the silhouette
        src &= cv2.erode((al > 0.985).astype(np.uint8), disk(24 * unit)).astype(bool)
    if protect is not None:
        src &= ~protect
    # never quilt specular highlights (glossy streaks): bright, pale blobs
    # bigger than a sparkle
    L = rgb @ [0.299, 0.587, 0.114]
    Lloc, _ = norm_blur(L, body.astype(np.float64), 10 * unit)
    sat = hsv[..., 1]
    spec = (L - Lloc > 28) & (sat < 130) & body
    lab, n = ndimage.label(spec)
    if n and not glitzi:
        area = ndimage.sum(spec, lab, range(1, n + 1))
        big = np.isin(lab, 1 + np.nonzero(area > np.pi * (2.5 * unit) ** 2)[0])
        src &= ~dil(big, 5 * unit)
    hf = quilt(high, grow, src, P=int(round(18 * unit)), O=int(round(6 * unit)), seed=sum(map(ord, name)))
    filled = lf + hf
    feather = np.clip(cv2.GaussianBlur(grow.astype(np.float64), (0, 0), 0.6 * unit) * 1.6, 0, 1)[..., None]
    outp = rgb * (1 - feather) + filled * feather
    res = img.copy()
    res[..., :3] = np.clip(np.round(outp), 0, 255).astype(np.uint8)
    res[..., :3][img[..., 3] == 0] = 0
    return res


# ----------------------------------------------------------- sprites --
def cut_circle(img, cx, cy, r, soft=1.5):
    R = int(np.ceil(r + 2))
    x0, y0 = int(round(cx)) - R, int(round(cy)) - R
    crop = img[y0:y0 + 2 * R, x0:x0 + 2 * R].copy()
    yy, xx = np.mgrid[0:2 * R, 0:2 * R] + 0.5
    d = np.hypot(xx - (cx - x0), yy - (cy - y0))
    a = np.clip((r - d) / soft + 0.5, 0, 1)
    crop[..., 3] = np.round(crop[..., 3].astype(np.float64) * a).astype(np.uint8)
    crop[..., :3][crop[..., 3] == 0] = 0
    return crop


def glitzi_iris(img, opening, cx, cy, r, unit):
    """Glitzi's iris: the lid hides its top. Hidden pixels are rebuilt from
    their mirror image across the iris's horizontal centre line (always in
    the visible lower half), with a short feather at the seam."""
    R = int(np.ceil(r + 2))
    x0, y0 = int(round(cx)) - R, int(round(cy)) - R
    sl = (slice(y0, y0 + 2 * R), slice(x0, x0 + 2 * R))
    src = img[sl].astype(np.float64)
    vis = cv2.erode(opening[sl].astype(np.uint8), disk(1.2 * unit)).astype(np.float64)
    vis = cv2.GaussianBlur(vis, (0, 0), 1.0 * unit)
    yy, xx = np.mgrid[0:2 * R, 0:2 * R]
    my = np.clip(np.round(2 * (cy - y0) - yy - 1).astype(int), 0, 2 * R - 1)
    mirror = src[my, xx]
    out = src * vis[..., None] + mirror * (1 - vis[..., None])
    out[..., 3] = 255
    res = np.round(out).astype(np.uint8)
    d = np.hypot(xx + 0.5 - (cx - x0), yy + 0.5 - (cy - y0))
    res[..., 3] = np.round(255 * np.clip((r - d) / 1.5 + 0.5, 0, 1)).astype(np.uint8)
    res[..., :3][res[..., 3] == 0] = 0
    return res


def recolour(sprite, hue_deg, sat_mul=1.0, val_mul=1.0):
    hsv = cv2.cvtColor(sprite[..., :3], cv2.COLOR_RGB2HSV_FULL).astype(np.float32)
    hsv[..., 0] = hue_deg / 360.0 * 255.0
    hsv[..., 1] = np.clip(hsv[..., 1] * sat_mul, 0, 255)
    hsv[..., 2] = np.clip(hsv[..., 2] * val_mul, 0, 255)
    out = sprite.copy()
    out[..., :3] = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2RGB_FULL)
    return out


def save(arr, path, lossless=False):
    im = Image.fromarray(arr, 'RGBA')
    if lossless:
        im.save(path, lossless=True, quality=100, method=6, exact=False)
    else:
        im.save(path, quality=94, method=6, alpha_quality=100, exact=False)


if __name__ == '__main__':
    report = {}
    for name in IDS:
        img = np.array(Image.open(f'{WORK}/{name}.png').convert('RGBA'))
        meas = json.load(open(f'{WORK}/measure-{name}.json'))
        masks = dict(np.load(f'{WORK}/masks_{name}.npz'))
        u = meas['unit']
        m = erase_mask(name, meas, masks, img.shape[:2], img)
        Image.fromarray((m * 255).astype(np.uint8)).save(f'{WORK}/erase_{name}.png')
        protect = None
        if name == 'glitzi':
            protect = np.zeros(m.shape, bool)
            for s_ in 'LR':
                ys_, xs_ = np.nonzero(masks['eye' + s_])
                top = ys_.min()
                protect[max(0, int(top - 70 * u)):top, max(0, int(xs_.min() - 30 * u)):int(xs_.max() + 30 * u)] = True
        body = inpaint(name, img, m, u, protect=protect)
        body = restore_cheeks(body, img, m, meas)
        assert (body[..., 3] == img[..., 3]).all()
        Image.fromarray(body, 'RGBA').save(f'{WORK}/{name}-body.png')
        save(body, f'{OUT}/{name}-body.webp')
        f = meas['feats']
        spr = {}
        if name == 'glitzi':
            for s in 'LR':
                ir = f['iris' + s]
                # r reaches the first white pixel: cut just inside it
                spr['glitzi-iris-' + s] = glitzi_iris(img, masks['eye' + s], ir['cx'], ir['cy'], ir['r'] - 2.5, u)
        if name in ('boppo', 'pipzi'):
            for s in 'LR':
                ir = f['iris' + s]
                spr[f'{name}-iris-{s}'] = cut_circle(img, ir['cx'], ir['cy'], ir['r'] - 0.5)
        if name == 'boppo':
            spr['iris-navy'] = recolour(spr['boppo-iris-L'], 232, 1.0, 1.15)
        if name == 'zuzu':
            for s in 'LR':
                sp = f['spiral' + s]
                # just outside the dark rim: no body texture that would orbit
                spr['zuzu-spiral-' + s] = cut_circle(img, sp['cx'], sp['cy'], sp['r_out'] + 4, soft=2.5)
        for k, a in spr.items():
            save(a, f'{OUT}/{k}.webp', lossless=True)
            Image.fromarray(a, 'RGBA').save(f'{WORK}/{k}.png')
        report[name] = {'erase_px': int(m.sum()), 'sprites': {k: [a.shape[1], a.shape[0]] for k, a in spr.items()},
                        'body_kb': round(os.path.getsize(f'{OUT}/{name}-body.webp') / 1024, 1)}
        print(name, report[name])
    prev = {}
    if os.path.exists(f'{WORK}/derive-report.json'):
        prev = json.load(open(f'{WORK}/derive-report.json'))
    prev.update(report)
    json.dump(prev, open(f'{WORK}/derive-report.json', 'w'), indent=1)
