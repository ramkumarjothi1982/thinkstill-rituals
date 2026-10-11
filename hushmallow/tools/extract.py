"""Split the approved transparent seven-Mallow sheet into individual tightly
cropped transparent PNGs, cutting between touching Mallows along a
minimum-alpha seam instead of a straight line."""
import sys, json
import numpy as np
from PIL import Image

SRC = sys.argv[1]
OUT = sys.argv[2]
DECON = len(sys.argv) > 3 and sys.argv[3] == 'decon'

img = np.array(Image.open(SRC).convert('RGBA'))
H, W = img.shape[:2]
alpha = img[:, :, 3].astype(np.float64) / 255.0
_rgb = img[:, :, :3].astype(np.float64)
grad = np.zeros((H, W))
grad[:, 2:-2] = np.linalg.norm(_rgb[:, 4:] - _rgb[:, :-4], axis=2)

ROWS = {
    'top': (140, 566, [525, 923], ['noomi', 'blubi', 'pipzi']),
    'bottom': (560, 952, [370, 730, 1076], ['boppo', 'zuzu', 'loomi', 'glitzi']),
}


def seam(y0, y1, x_guess, half=45):
    """Vertical seam of minimum alpha between rows y0..y1 near x_guess."""
    xs = np.arange(x_guess - half, x_guess + half + 1)
    a_win = alpha[y0:y1, xs[0]:xs[-1] + 1]
    # where neighbours are fused (no alpha gap) follow the strongest colour
    # boundary between them instead
    g = grad[y0:y1, xs[0]:xs[-1] + 1]
    g = g / max(np.percentile(g, 99.5), 1e-6)
    cost = a_win ** 2 * (1.0 - 0.9 * np.clip(g, 0, 1)) * 100 + 0.002
    # bias toward the guess so empty rows don't wander
    cost += (np.abs(xs - x_guess) / half) ** 2 * 0.01
    h, w = cost.shape
    acc = cost.copy()
    back = np.zeros((h, w), dtype=np.int64)
    for y in range(1, h):
        prev = acc[y - 1]
        left = np.r_[np.inf, prev[:-1]]
        right = np.r_[prev[1:], np.inf]
        stack = np.vstack([left, prev, right])
        idx = np.argmin(stack, axis=0)
        acc[y] += stack[idx, np.arange(w)]
        back[y] = idx - 1
    path = np.zeros(h, dtype=np.int64)
    path[-1] = int(np.argmin(acc[-1]))
    for y in range(h - 1, 0, -1):
        path[y - 1] = np.clip(path[y] + back[y, path[y]], 0, w - 1)
    return {y0 + i: xs[0] + p for i, p in enumerate(path)}


registry = {}
for row, (y0, y1, guesses, names) in ROWS.items():
    seams = [seam(y0, y1, g) for g in guesses]
    for i, name in enumerate(names):
        import cv2
        from scipy.ndimage import median_filter, gaussian_filter1d
        mask = np.zeros((H, W), dtype=bool)
        for y in range(y0, y1):
            left = seams[i - 1][y] if i > 0 else 0
            right = seams[i][y] if i < len(seams) else W
            mask[y, left:right] = True
        a = alpha * mask
        foreign = np.zeros((H, W), dtype=bool)
        # Where this Mallow is fused with a neighbour, the seam leaves a
        # jagged cut. Rebuild that side as a smooth anti-aliased silhouette:
        # take the per-row edge (natural edge where there is a gap, seam where
        # fused), smooth it vertically, and re-derive coverage from it.
        for s_idx, side in ((i - 1, -1), (i, +1)):
            if not (0 <= s_idx < len(seams)):
                continue
            sm = seams[s_idx]
            rows = np.arange(y0, y1)
            e_raw = np.full(len(rows), np.nan)
            fused = np.zeros(len(rows), dtype=bool)
            for k, y in enumerate(rows):
                sx = sm[y]
                inner = sx - 1 if side > 0 else sx
                if alpha[y, inner] >= 0.5:
                    fused[k] = True
                    e_raw[k] = sx if side > 0 else sx
                else:
                    span = (np.arange(sx - 60, sx) if side > 0
                            else np.arange(sx, sx + 60))
                    span = span[(span >= 0) & (span < W)]
                    hit = span[alpha[y, span] >= 0.5]
                    if len(hit):
                        e_raw[k] = (hit.max() + 1) if side > 0 else hit.min()
            if not fused.any():
                continue
            valid = ~np.isnan(e_raw)
            ev = e_raw.copy()
            ev[valid] = median_filter(e_raw[valid], size=15, mode='nearest')
            ev[valid] = gaussian_filter1d(ev[valid], sigma=8, mode='nearest')
            near = np.convolve(fused.astype(float), np.ones(13), 'same') > 0
            for k, y in enumerate(rows):
                if not (near[k] and valid[k]):
                    continue
                e = ev[k]
                sx = sm[y]
                xs_ = np.arange(int(e) - 6, int(e) + 7)
                xs_ = xs_[(xs_ >= 0) & (xs_ < W)]
                cov = (np.clip(e - xs_, 0, 1) if side > 0
                       else np.clip(xs_ + 1 - e, 0, 1))
                for x, c in zip(xs_, cov):
                    own = (x < sx) if side > 0 else (x >= sx)
                    if own:
                        a[y, x] = min(alpha[y, x], c) if c < 1 else alpha[y, x]
                        # neighbour's edge colours bleed into this band
                        if fused[k] and abs(x + 0.5 - e) < 2.5:
                            foreign[y, x] = True
                    elif c > 0:
                        a[y, x] = c * max(alpha[y, x], 0.0)
                        foreign[y, x] = True
        # drop stray specks: keep only the largest connected component
        m = (a > 0.03).astype(np.uint8)
        n, lab, stats, _ = cv2.connectedComponentsWithStats(m, connectivity=8)
        if n > 1:
            keep = 1 + int(np.argmax(stats[1:, 4]))
            a[lab != keep] = 0
        ys, xs = np.where(a > 0.02)
        pad = 6
        bx0, bx1 = max(xs.min() - pad, 0), min(xs.max() + pad + 1, W)
        by0, by1 = max(ys.min() - pad, 0), min(ys.max() + pad + 1, H)
        rgb = img[by0:by1, bx0:bx1, :3].copy()
        aa = a[by0:by1, bx0:bx1]
        # colour decontamination: partially transparent edge pixels were
        # matted against a dark backdrop; pull their colour from the nearest
        # solid interior pixel so no dark halo shows on light backgrounds
        ff = foreign[by0:by1, bx0:bx1]
        solid = ((aa > 0.92) & ~ff).astype(np.uint8)
        dist, labels = cv2.distanceTransformWithLabels(
            1 - solid, cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
        sy, sx = np.where(solid > 0)
        lut = np.zeros((labels.max() + 1, 3), dtype=np.float64)
        lut[labels[sy, sx]] = rgb[sy, sx]
        nearest = lut[labels]
        # smooth colour field from nearby solid pixels (normalised
        # convolution) so recoloured edges follow the rim without streaks
        sw = solid.astype(np.float64)
        num = cv2.GaussianBlur(rgb.astype(np.float64) * sw[..., None], (0, 0), 2.2)
        den = cv2.GaussianBlur(sw, (0, 0), 2.2)[..., None]
        smooth = np.where(den > 0.02, num / np.maximum(den, 1e-6), nearest)
        nearest = smooth
        edge = ((aa > 0) & (aa <= 0.92)) | ff
        w_mix = np.where(ff, 1.0, np.clip((0.92 - aa) / 0.92, 0, 1))[..., None]
        fixed = rgb.astype(np.float64) * (1 - w_mix) + nearest * w_mix
        rgb = np.where(edge[..., None], fixed, rgb).astype(np.uint8) if DECON else np.where(ff[..., None], nearest, rgb).astype(np.uint8)
        rgb[aa <= 0] = 0
        out = np.dstack([rgb, np.round(aa * 255).astype(np.uint8)])
        Image.fromarray(out, 'RGBA').save(f'{OUT}/{name}.png', optimize=True)
        registry[name] = {
            'sheet_box': [int(bx0), int(by0), int(bx1), int(by1)],
            'size': [int(bx1 - bx0), int(by1 - by0)],
        }
        print(name, registry[name])

json.dump(registry, open(f'{OUT}/extract-report.json', 'w'), indent=1)
