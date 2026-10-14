"""Image-metric primitives for the asset gates (asset_qa.py), numpy/OpenCV only.

Everything is deterministic and works on float64 arrays in 0..255 levels.
Masks are boolean arrays of the image's height and width. The functions are
small on purpose: each one is unit-tested on synthetic images in
tests/test_metrics.py, so a gate's verdict can be traced to a tested number.
"""
import numpy as np
import cv2

from .common import LUMA


def luma(rgb):
    return np.asarray(rgb, np.float64)[..., :3] @ LUMA


def masked_blur(img, w, sigma):
    """Normalised Gaussian blur: the weighted mean of `img` under weights `w`
    (0 where the weights vanish). Data outside `w` never leaks in."""
    w = np.asarray(w, np.float64)
    img = np.asarray(img, np.float64)
    den = cv2.GaussianBlur(w, (0, 0), sigma)
    if img.ndim == 3:
        num = cv2.GaussianBlur(img * w[..., None], (0, 0), sigma)
        return np.where(den[..., None] > 1e-6, num / np.maximum(den, 1e-6)[..., None], 0.0)
    num = cv2.GaussianBlur(img * w, (0, 0), sigma)
    return np.where(den > 1e-6, num / np.maximum(den, 1e-6), 0.0)


def band(img, w, s0, s1):
    """Difference-of-Gaussians band (sigma s0 minus sigma s1, s0 < s1; s0 = 0
    means the image itself), with normalised blurs under the weights `w`."""
    lo = np.asarray(img, np.float64) if s0 == 0 else masked_blur(img, w, s0)
    return lo - masked_blur(img, w, s1)


def rms(x, mask):
    v = x[mask]
    return float(np.sqrt(np.mean(v * v))) if v.size else float('nan')


def pearson(x, y, mask):
    """Pearson correlation of x and y over the mask (nan when either is constant)."""
    a, b = x[mask].astype(np.float64), y[mask].astype(np.float64)
    if a.size < 3:
        return float('nan')
    a = a - a.mean()
    b = b - b.mean()
    den = np.sqrt((a * a).sum() * (b * b).sum())
    return float((a * b).sum() / den) if den > 1e-12 else float('nan')


def dist_outside(mask):
    """Euclidean distance (px) of every pixel to the mask (0 inside it)."""
    return cv2.distanceTransform((~mask).astype(np.uint8), cv2.DIST_L2, 5)


def bbox(mask, pad, shape=None):
    """Slices of the mask's bounding box grown by `pad` px (clipped to the image)."""
    H, W = shape or mask.shape
    ys, xs = np.nonzero(mask)
    return (slice(max(int(ys.min()) - pad, 0), min(int(ys.max()) + pad + 1, H)),
            slice(max(int(xs.min()) - pad, 0), min(int(xs.max()) + pad + 1, W)))


# ----------------------------------------------------------------------------
# colour difference
# ----------------------------------------------------------------------------
def srgb_to_lab(rgb):
    """sRGB (0..255, any shape [..., 3]) to CIE L*a*b* (D65 white)."""
    c = np.asarray(rgb, np.float64) / 255.0
    lin = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    M = np.array([[0.4124564, 0.3575761, 0.1804375],
                  [0.2126729, 0.7151522, 0.0721750],
                  [0.0193339, 0.1191920, 0.9503041]])
    xyz = lin @ M.T / np.array([0.95047, 1.0, 1.08883])
    e = 216 / 24389
    f = np.where(xyz > e, np.cbrt(xyz), (24389 / 27 * xyz + 16) / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


def delta_e2000(lab1, lab2):
    """CIEDE2000 colour difference (Sharma, Wu and Dalal 2005), element-wise."""
    L1, a1, b1 = np.moveaxis(np.asarray(lab1, np.float64), -1, 0)
    L2, a2, b2 = np.moveaxis(np.asarray(lab2, np.float64), -1, 0)
    C1, C2 = np.hypot(a1, b1), np.hypot(a2, b2)
    Cm7 = ((C1 + C2) / 2) ** 7
    G = 0.5 * (1 - np.sqrt(Cm7 / (Cm7 + 25.0 ** 7)))
    a1p, a2p = (1 + G) * a1, (1 + G) * a2
    C1p, C2p = np.hypot(a1p, b1), np.hypot(a2p, b2)
    h1p = np.where((a1p == 0) & (b1 == 0), 0.0, np.degrees(np.arctan2(b1, a1p)) % 360)
    h2p = np.where((a2p == 0) & (b2 == 0), 0.0, np.degrees(np.arctan2(b2, a2p)) % 360)
    dLp = L2 - L1
    dCp = C2p - C1p
    dh = h2p - h1p
    dh = np.where(dh > 180, dh - 360, np.where(dh < -180, dh + 360, dh))
    dh = np.where(C1p * C2p == 0, 0.0, dh)
    dHp = 2 * np.sqrt(C1p * C2p) * np.sin(np.radians(dh) / 2)
    Lpm = (L1 + L2) / 2
    Cpm = (C1p + C2p) / 2
    hsum = h1p + h2p
    hpm = np.where(np.abs(h1p - h2p) <= 180, hsum / 2, np.where(hsum < 360, (hsum + 360) / 2, (hsum - 360) / 2))
    hpm = np.where(C1p * C2p == 0, hsum, hpm)
    T = (1 - 0.17 * np.cos(np.radians(hpm - 30)) + 0.24 * np.cos(np.radians(2 * hpm))
         + 0.32 * np.cos(np.radians(3 * hpm + 6)) - 0.20 * np.cos(np.radians(4 * hpm - 63)))
    dtheta = 30 * np.exp(-(((hpm - 275) / 25) ** 2))
    Cpm7 = Cpm ** 7
    RC = 2 * np.sqrt(Cpm7 / (Cpm7 + 25.0 ** 7))
    SL = 1 + 0.015 * (Lpm - 50) ** 2 / np.sqrt(20 + (Lpm - 50) ** 2)
    SC = 1 + 0.045 * Cpm
    SH = 1 + 0.015 * Cpm * T
    RT = -np.sin(np.radians(2 * dtheta)) * RC
    return np.sqrt((dLp / SL) ** 2 + (dCp / SC) ** 2 + (dHp / SH) ** 2 + RT * (dCp / SC) * (dHp / SH))


# ----------------------------------------------------------------------------
# repetition, texture scale, glints
# ----------------------------------------------------------------------------
def window_all(mask, k):
    """valid[y, x] = the k x k window with top-left (y, x) lies inside the mask
    (shape H-k+1, W-k+1, like cv2.matchTemplate's result)."""
    ii = cv2.integral((~mask).astype(np.uint8))
    s = ii[k:, k:] - ii[:-k, k:] - ii[k:, :-k] + ii[:-k, :-k]
    return s == 0


def repeat_patch(detail, hole, source, patch=24, stride=12, min_cover=0.5, min_std=0.5, search=None):
    """Repeat-patch detector. For every patch x patch window on a `stride` grid
    that is at least `min_cover` inside `hole` (and not flat), the maximum
    normalised cross-correlation (cv2.TM_CCOEFF_NORMED) against every window
    lying wholly in `source`. A PatchMatch result that copied skin verbatim
    shows NCC near 1. `search` (slices) limits the source search area.
    Returns dict(max, p99, n, worst=[y, x] of the worst patch, values)."""
    sy, sx = search or (slice(0, detail.shape[0]), slice(0, detail.shape[1]))
    img = np.ascontiguousarray(detail[sy, sx], np.float32)
    valid = window_all(source[sy, sx], patch)
    H, W = hole.shape
    vals, where = [], []
    for y in range(0, H - patch + 1, stride):
        for x in range(0, W - patch + 1, stride):
            if hole[y:y + patch, x:x + patch].mean() < min_cover:
                continue
            t = np.ascontiguousarray(detail[y:y + patch, x:x + patch], np.float32)
            if t.std() < min_std:
                continue
            r = cv2.matchTemplate(img, t, cv2.TM_CCOEFF_NORMED)
            r = np.where(valid, r, -1.0)
            vals.append(float(r.max()))
            where.append([y, x])
    if not vals:
        return dict(max=float('nan'), p99=float('nan'), n=0, worst=None, values=[])
    v = np.array(vals)
    return dict(max=float(v.max()), p99=float(np.percentile(v, 99)), n=len(v), worst=where[int(v.argmax())], values=vals)


def radial_autocorr(x, mask, max_lag):
    """Masked, mean-removed autocorrelation of x over the mask, averaged over
    directions, for integer lags 0..max_lag. Returns (ac, support): ac[0] = 1,
    support[d] = fraction of the pixel pairs at lag d relative to lag 0."""
    ys, xs = np.nonzero(mask)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    m = mask[y0:y1, x0:x1].astype(np.float64)
    v = np.where(m > 0, x[y0:y1, x0:x1] - x[mask].mean(), 0.0)
    h, w = m.shape
    sh = (cv2.getOptimalDFTSize(h + max_lag + 1), cv2.getOptimalDFTSize(w + max_lag + 1))
    F = np.fft.rfft2(v, sh)
    Fm = np.fft.rfft2(m, sh)
    num = np.fft.irfft2(F * np.conj(F), sh)
    cnt = np.fft.irfft2(Fm * np.conj(Fm), sh)
    num = np.fft.fftshift(num)
    cnt = np.fft.fftshift(np.round(cnt))
    cy, cx = sh[0] // 2, sh[1] // 2
    yy, xx = np.mgrid[-max_lag:max_lag + 1, -max_lag:max_lag + 1]
    rr = np.round(np.hypot(yy, xx)).astype(int)
    n_ = num[cy - max_lag:cy + max_lag + 1, cx - max_lag:cx + max_lag + 1]
    c_ = cnt[cy - max_lag:cy + max_lag + 1, cx - max_lag:cx + max_lag + 1]
    ac, sup = np.zeros(max_lag + 1), np.zeros(max_lag + 1)
    for d in range(max_lag + 1):
        sel = (rr == d) & (c_ > 0)
        ac[d] = (n_[sel] / c_[sel]).mean() if sel.any() else np.nan
        sup[d] = c_[sel].mean() if sel.any() else 0.0
    return ac / ac[0], sup / sup[0]


def texture_scale(ac, support, min_support=0.15):
    """(period, corr_len) of a radial autocorrelation: period = lag of the first
    local maximum after the first local minimum, if that peak rises at least
    0.02 above the minimum (None otherwise); corr_len = first lag where
    ac < 0.5 (linear interpolation). Lags with too little support are ignored."""
    ok = support >= min_support
    n = int(np.argmin(ok)) if not ok.all() else len(ac)
    a = ac[:n]
    corr_len = None
    below = np.nonzero(a < 0.5)[0]
    if below.size:
        j = int(below[0])
        corr_len = float(j - 1 + (a[j - 1] - 0.5) / (a[j - 1] - a[j]))
    period = None
    i = 1
    while i < n - 1 and not (a[i] <= a[i - 1] and a[i] <= a[i + 1]):
        i += 1
    if i < n - 1:
        jmin = i
        k = jmin + 1
        while k < n - 1 and not (a[k] >= a[k - 1] and a[k] >= a[k + 1]):
            k += 1
        if k < n - 1 and a[k] - a[jmin] >= 0.02:
            period = float(k)
    return period, corr_len


def glints(rgb, mask, min_rgb=236, min_hp=8.0, max_area=40):
    """Small bright glints inside the mask: connected pixels with
    min(R, G, B) > min_rgb standing min_hp levels above a 4 px local mean.
    Returns their count."""
    Y = luma(rgb)
    hp = Y - cv2.GaussianBlur(Y, (0, 0), 4)
    g = (np.asarray(rgb)[..., :3].min(2) > min_rgb) & (hp > min_hp) & mask
    n, lab, st, _ = cv2.connectedComponentsWithStats(g.astype(np.uint8), connectivity=8)
    return int(sum(1 for i in range(1, n) if st[i, 4] <= max_area))


# ----------------------------------------------------------------------------
# sampling uncertainty
# ----------------------------------------------------------------------------
def energy_ratio_ci(b, zone, ref, block, n_boot=300, seed=0, q=(2.5, 97.5)):
    """RMS(b over zone) / RMS(b over ref) and its block-bootstrap interval.

    Texture statistics of a thin re-synthesised band rest on few independent
    samples (a 8-16 px band in a 50 px wide zone holds a handful), so a ratio
    of 0.75 can be chance. Pixels are grouped into block x block tiles (a few
    correlation lengths); tiles are resampled with replacement (seeded, so the
    interval is deterministic) and the ratio recomputed. Returns
    (ratio, lo, hi) or (nan, nan, nan) when either region is empty."""
    H, W = b.shape
    nbx = W // block + 1
    yy, xx = np.mgrid[0:H, 0:W]
    tile = (yy // block) * nbx + (xx // block)
    n = (H // block + 1) * nbx
    b2 = b * b
    sz = np.bincount(tile[zone], weights=b2[zone], minlength=n)
    nz = np.bincount(tile[zone], minlength=n).astype(np.float64)
    sr = np.bincount(tile[ref], weights=b2[ref], minlength=n)
    nr = np.bincount(tile[ref], minlength=n).astype(np.float64)
    if nz.sum() == 0 or nr.sum() == 0:
        return float('nan'), float('nan'), float('nan')
    ratio = float(np.sqrt((sz.sum() / nz.sum()) / max(sr.sum() / nr.sum(), 1e-18)))
    zt, rt = np.nonzero(nz)[0], np.nonzero(nr)[0]
    rng = np.random.default_rng(seed)
    boots = []
    for _ in range(n_boot):
        a = rng.choice(zt, len(zt))
        c = rng.choice(rt, len(rt))
        boots.append(np.sqrt((sz[a].sum() / nz[a].sum()) / max(sr[c].sum() / nr[c].sum(), 1e-18)))
    lo, hi = np.percentile(boots, q)
    return ratio, float(lo), float(hi)


def shift_mask(mask, dy, dx):
    """`mask` translated by (dy, dx) px, zero-filled (no wrap-around)."""
    out = np.zeros_like(mask)
    H, W = mask.shape
    ys, yd = (slice(0, H - dy), slice(dy, H)) if dy >= 0 else (slice(-dy, H), slice(0, H + dy))
    xs, xd = (slice(0, W - dx), slice(dx, W)) if dx >= 0 else (slice(-dx, W), slice(0, W + dx))
    out[yd, xd] = mask[ys, xs]
    return out
