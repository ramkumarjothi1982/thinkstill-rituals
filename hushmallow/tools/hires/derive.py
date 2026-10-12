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
  zuzu-spiral-L|R      Zuzu's spirals with their dark rim, rounded so the rim
                       sits on one radius and cut just inside it (drawn at
                       native px; ~300 px across at the 1024 px art scale).
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
            # sclera, its dark outline ring and the light rim halo around it,
            # also where it overlaps the blush: the eye's pink glow over the
            # blush would float as a smear once the eye closes. The bitten
            # blush is rebuilt by restore_cheeks (its own radial profile and
            # glitter), and the shading fill never takes its colour from the
            # blush (blush_discs -> inpaint lf_exclude)
            m |= dil(masks['eye' + s], 12 * u)
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
    # inpaint() rewrites the erased area plus a 2u grow and its feather: all
    # of it gets the blush back, or a thin ring of body colour is left along
    # the erase edge
    touched = dil(erase, 3 * u)
    intact = (~dil(erase, 4 * u)) & (img[..., 3] > 250)
    yy, xx = np.mgrid[0:H, 0:W]
    for s in 'LR':
        cx, cy, r = ch[s]
        d = np.hypot(xx - cx, yy - cy)
        reg = touched & (d < 1.3 * r)
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


def blush_discs(meas, shape, k=1.15):
    """The blush circles (cheeks), grown by k: kept out of the shading fill
    and the texture donors, so neither the blush colour nor its glitter is
    smeared into the erased eyes."""
    ch = meas['feats']['cheeks']
    yy, xx = np.mgrid[0:shape[0], 0:shape[1]]
    out = np.zeros(shape, bool)
    for s in 'LR':
        cx, cy, r = ch[s]
        out |= np.hypot(xx - cx, yy - cy) < r * k
    return out


def inpaint(name, img, mask, unit, protect=None, lf_exclude=None):
    rgb = img[..., :3].astype(np.float64)
    al = img[..., 3].astype(np.float64) / 255
    H, W = mask.shape
    glitzi = name == 'glitzi'
    grow = dil(mask, 2 * unit)
    known = (~grow) & (al > 0.5)
    if lf_exclude is not None:
        known &= ~lf_exclude
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


def rim_edges(L, cx, cy, r_lo, r_hi, n=180):
    """Per angle, the radius where a disc's dark rim ends: the luminance
    minimum in [r_lo, r_hi], then the first radius at which the profile has
    recovered half way back to the body outside it. Smoothed over angle."""
    th = np.arange(n) * 2 * np.pi / n
    rs = np.arange(r_lo - 12, r_hi + 14, 0.5)
    xs = (cx + rs[None, :] * np.cos(th)[:, None]).astype(np.float32)
    ys = (cy + rs[None, :] * np.sin(th)[:, None]).astype(np.float32)
    prof = cv2.remap(L.astype(np.float32), xs, ys, cv2.INTER_LINEAR)
    prof = ndimage.uniform_filter1d(prof, 3, axis=1)
    win = (rs > r_lo) & (rs < r_hi)
    edge = np.empty(n)
    ring = np.empty(n)
    for i in range(n):
        p = prof[i]
        j = np.argmin(np.where(win, p, np.inf))
        body = np.median(p[-10:])
        after = np.nonzero((rs > rs[j]) & (p > (p[j] + body) / 2))[0]
        edge[i] = rs[after[0]] if len(after) else rs[j] + 3
        ring[i] = rs[j]
    # circular smoothing: the painted rim is a smooth curve, single rays are noisy
    k = 4
    pad = lambda a: np.concatenate([a[-k * 3:], a, a[:k * 3]])
    edge = ndimage.gaussian_filter1d(pad(edge), k)[k * 3:-k * 3]
    ring = ndimage.gaussian_filter1d(pad(ring), k)[k * 3:-k * 3]
    return th, edge, ring


def round_disc(img, cx, cy, th, edge, R, inset=1.5, soft=1.2):
    """A painted disc that is not quite round (Zuzu's spirals: their dark rim
    sits 145-156 px from the centre) would show a crescent of body inside the
    eye once it rotates. Resample it radially so the rim's outer edge lands on
    one radius R everywhere (a <= 4% radial stretch, never repainted), then
    cut `inset` px inside that edge: no body pixel is left in the sprite."""
    Rc = R - inset
    S = int(np.ceil(Rc + 2))
    yy, xx = np.mgrid[0:2 * S, 0:2 * S].astype(np.float64) + 0.5
    dx, dy = xx - S, yy - S
    d = np.hypot(dx, dy)
    a = np.mod(np.arctan2(dy, dx), 2 * np.pi)
    e = np.interp(a, np.concatenate([th, [2 * np.pi]]), np.concatenate([edge, edge[:1]]))
    sr = d * e / R
    mx = (cx + sr * np.cos(a)).astype(np.float32)
    my = (cy + sr * np.sin(a)).astype(np.float32)
    # resample premultiplied so the cut edge gets no fringe
    src = img.astype(np.float32)
    pm = src.copy()
    pm[..., :3] *= src[..., 3:4] / 255
    out = cv2.remap(pm, mx, my, cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    al = np.clip(out[..., 3], 0, 255)
    cut = np.clip((Rc - d) / soft + 0.5, 0, 1)
    rgb = np.where(al[..., None] > 0, out[..., :3] / np.maximum(al[..., None], 1e-3) * 255, 0)
    res = np.zeros((2 * S, 2 * S, 4), np.uint8)
    res[..., :3] = np.clip(np.round(rgb), 0, 255).astype(np.uint8)
    res[..., 3] = np.clip(np.round(al * cut), 0, 255).astype(np.uint8)
    res[..., :3][res[..., 3] == 0] = 0
    return res


def even_rim(sprite, rim_rgb, width, strength=0.7):
    """Deepen the outermost `width` px of a round sprite toward the painted
    rim's own darkest colour, so the rim reads evenly all the way round while
    the sprite rotates (its painted lighting would otherwise orbit too)."""
    S = sprite.shape[0] / 2
    yy, xx = np.mgrid[0:sprite.shape[0], 0:sprite.shape[1]] + 0.5
    d = np.hypot(xx - S, yy - S)
    Rc = S - 2
    t = np.clip((d - (Rc - width)) / width, 0, 1)
    w = (t * t * (3 - 2 * t) * strength)[..., None]
    out = sprite.copy()
    rgb = sprite[..., :3].astype(np.float64)
    # never lighten: only pixels brighter than the rim colour move toward it
    tgt = np.minimum(rgb, np.asarray(rim_rgb, np.float64)[None, None, :]) * 0.5 + np.asarray(rim_rgb)[None, None, :] * 0.5
    out[..., :3] = np.clip(np.round(rgb * (1 - w) + tgt * w), 0, 255).astype(np.uint8)
    out[..., :3][out[..., 3] == 0] = 0
    return out


def rim_colour(img, cx, cy, th, ring):
    """Median colour of the darkest quarter of the rim's luminance minimum."""
    cols = np.array([img[int(round(cy + r * np.sin(t))), int(round(cx + r * np.cos(t))), :3] for t, r in zip(th, ring)], np.float64)
    Lc = cols @ [0.299, 0.587, 0.114]
    return np.median(cols[Lc <= np.percentile(Lc, 25)], axis=0)


def glitzi_iris(img, opening, cx, cy, r, unit):
    """Glitzi's iris: the lid hides its top, and a painted catchlight sits
    against the lid edge (cut flat by it).
      1. the painted catchlight is lifted out (inpainted from the dark pupil
         around it) so it is never mirrored or left as a flat-topped cut,
      2. hidden pixels are rebuilt from the visible lower half: right at the
         lid seam by mirroring across the iris's centre line (continuous
         seam), further up by the point reflection through the centre, so the
         fiery ring keeps its radius but its stars do not repeat as a
         Rorschach mirror image,
      3. the catchlight is put back whole: an oval whose lower half is the
         painted one, so at rest (lid down) it looks as painted, and an eye
         opened wider shows a complete highlight instead of a cut one."""
    R = int(np.ceil(r + 2))
    x0, y0 = int(round(cx)) - R, int(round(cy)) - R
    sl = (slice(y0, y0 + 2 * R), slice(x0, x0 + 2 * R))
    src = img[sl].astype(np.float64)
    ccx, ccy = cx - x0, cy - y0
    yy, xx = np.mgrid[0:2 * R, 0:2 * R]
    d = np.hypot(xx + 0.5 - ccx, yy + 0.5 - ccy)
    vis_b = cv2.erode(opening[sl].astype(np.uint8), disk(1.2 * unit)).astype(bool) & (d < r)
    # 1. the catchlight: bright, pale, inside the visible iris
    rgb8 = img[sl][..., :3]
    hsv = cv2.cvtColor(rgb8, cv2.COLOR_RGB2HSV).astype(np.float64)
    pale = (hsv[..., 2] > 185) & (hsv[..., 1] < 90) & (d < r - 2 * unit)
    lab, n = ndimage.label(pale & dil(vis_b, 2 * unit))
    catch = None
    if n:
        area = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
        k = int(np.argmax(area)) + 1
        if area[k - 1] > (2.5 * unit) ** 2 * np.pi:
            catch = lab == k
    spec = None
    if catch is not None:
        ys, xs = np.nonzero(catch)
        cc = rgb8[catch].astype(np.float64)
        spec = dict(x=(xs.min() + xs.max() + 1) / 2, a=(xs.max() - xs.min() + 1) / 2,
                    top=float(ys.min()), b=float(ys.max() - ys.min() + 1),
                    col=np.percentile(cc, 75, axis=0))
        hole = dil(catch, 2 * unit).astype(np.uint8)
        filled = cv2.inpaint(rgb8.copy(), hole, int(round(4 * unit)), cv2.INPAINT_TELEA)
        src[..., :3] = np.where(hole[..., None] > 0, filled.astype(np.float64), src[..., :3])
    # 2. rebuild the hidden top
    vis = cv2.GaussianBlur(vis_b.astype(np.float64), (0, 0), 1.0 * unit)
    my = np.clip(np.round(2 * ccy - yy - 1).astype(int), 0, 2 * R - 1)
    px = np.clip(np.round(2 * ccx - xx - 1).astype(int), 0, 2 * R - 1)
    mirror = src[my, xx]
    point = src[my, px]
    dist = ndimage.distance_transform_edt(~vis_b)
    wm = np.clip(1 - (dist - 5 * unit) / (8 * unit), 0, 1)[..., None]
    hidden = mirror * wm + point * (1 - wm)
    out = src * vis[..., None] + hidden * (1 - vis[..., None])
    # 3. the whole catchlight: below its flat top (the lid's cut) exactly the
    # painted width and depth, above it a shorter dome (a lying oval, as a
    # highlight is drawn), with a soft edge and a slightly brighter core
    if spec is not None:
        dy = yy + 0.5 - spec['top']
        ex = (xx + 0.5 - spec['x']) / spec['a']
        ey = np.where(dy > 0, dy / spec['b'], dy / (0.55 * spec['b']))
        q = np.hypot(ex, ey)
        soft = 1.2 * unit / min(spec['a'], spec['b'])
        a = np.clip((1 - q) / soft + 0.5, 0, 1) * (0.92 + 0.08 * np.clip(1 - q * q, 0, 1))
        out[..., :3] = out[..., :3] * (1 - a[..., None]) + spec['col'][None, None, :] * a[..., None]
    out[..., 3] = 255
    res = np.clip(np.round(out), 0, 255).astype(np.uint8)
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
        lf_ex = None
        if meas['mapped']['eyeStyle'] == 'open':
            lf_ex = blush_discs(meas, m.shape)
            protect = lf_ex if protect is None else (protect | lf_ex)
        body = inpaint(name, img, m, u, protect=protect, lf_exclude=lf_ex)
        body = restore_cheeks(body, img, m, meas)
        assert (body[..., 3] == img[..., 3]).all()
        Image.fromarray(body, 'RGBA').save(f'{WORK}/{name}-body.png')
        save(body, f'{OUT}/{name}-body.webp')
        f = meas['feats']
        spr = {}
        rims = {}
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
                # the painted disc is slightly oval: round it so its dark rim
                # sits on one radius (the median rim edge), then cut just
                # inside the rim, so no body pixel orbits inside the eye
                L = img[..., :3].astype(np.float64) @ [0.299, 0.587, 0.114]
                th, edge, ring = rim_edges(L, sp['cx'], sp['cy'], sp['r_cyan'] * 0.93, sp['r_cyan'] * 1.12)
                R = float(np.median(edge))
                disc = round_disc(img, sp['cx'], sp['cy'], th, edge, R)
                spr['zuzu-spiral-' + s] = even_rim(disc, rim_colour(img, sp['cx'], sp['cy'], th, ring), width=5 * u / 2.645)
                rims[s] = {'R': round(R, 2), 'edge_min': round(float(edge.min()), 2), 'edge_max': round(float(edge.max()), 2),
                           'ring_min': round(float(ring.min()), 2), 'ring_max': round(float(ring.max()), 2)}
        for k, a in spr.items():
            save(a, f'{OUT}/{k}.webp', lossless=True)
            Image.fromarray(a, 'RGBA').save(f'{WORK}/{k}.png')
        report[name] = {'erase_px': int(m.sum()), 'sprites': {k: [a.shape[1], a.shape[0]] for k, a in spr.items()},
                        **({'spiral_rims': rims} if rims else {}),
                        'body_kb': round(os.path.getsize(f'{OUT}/{name}-body.webp') / 1024, 1)}
        print(name, report[name])
    prev = {}
    if os.path.exists(f'{WORK}/derive-report.json'):
        prev = json.load(open(f'{WORK}/derive-report.json'))
    prev.update(report)
    json.dump(prev, open(f'{WORK}/derive-report.json', 'w'), indent=1)
