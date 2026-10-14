"""Family-independent derivation code: numerics, stroke geometry, PatchMatch,
glow un-blending, zone-A re-synthesis, the bit-exact composite and the
height/normal maps.

Everything here was moved out of the approved Noomi derivation
(tools/derive/legacy_noomi.py, formerly tools/derive_noomi_hires.py) WITHOUT
changing a single arithmetic operation: function bodies are verbatim, and the
module constants they used (PAD, ALPHA_MIN, HALO_R, SEED, P, HN) became
arguments filled from configs/<id>.json. That is what keeps
`derive_mallow.py --mallow noomi` byte-identical to assets/noomi/*. If you need
different behaviour for another Mallow, add a parameter whose default keeps
today's arithmetic (and re-run the Noomi regression), or put the variant in
that family's finder.

Face-line removal works in three zones per feature (see pipeline.py):

  core + inner halo ("zone A")   the painted stroke and the part of its glow where the
                                 body texture is mostly destroyed.  Re-synthesised
                                 from the body's own texture: smooth low-frequency
                                 shading (thin-plate background + harmonic boundary
                                 match) plus detail copied by multi-scale PatchMatch
                                 (Wexler-style EM) from untouched skin, then multi-band
                                 texture-energy equalisation and a seamless boundary
                                 correction.
  low-frequency band             `band` px ring outside zone A: real pixels keep their
                                 texture, only the low-frequency shading is
                                 cross-faded to the smooth reconstruction.
  outer halo ("zone B")          the glow tail (out to halo_r px from the stroke).  The
                                 real texture is still there under a semi-transparent
                                 glow, so it is *un-blended*: every pixel is divided
                                 by a per-channel glow transmission measured from the
                                 art itself as a function of (position along the
                                 stroke outline, distance from the stroke).

Everything outside the edit mask is copied bit-for-bit (composite() raises otherwise).
"""
import time

import numpy as np
import cv2
import scipy.sparse as sp
import scipy.sparse.linalg as spla
from scipy.ndimage import gaussian_filter, gaussian_filter1d, map_coordinates
from scipy.spatial import cKDTree

LUMA = np.array([0.299, 0.587, 0.114])


# ----------------------------------------------------------------------------
# generic numerics
# ----------------------------------------------------------------------------
def ell(r):
    return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))


def laplace_fill(img, mask, biharm=False):
    """Fill `img` inside boolean `mask` with the harmonic (membrane) or
    biharmonic (thin-plate) interpolation of the surrounding values."""
    H, W = mask.shape
    img = np.asarray(img, np.float64)
    squeeze = img.ndim == 2
    if squeeze:
        img = img[..., None]
    out = img.copy()
    if not mask.any():
        return out[..., 0] if squeeze else out
    if not biharm:
        ys, xs = np.nonzero(mask)
        idx = -np.ones((H, W), np.int64)
        idx[ys, xs] = np.arange(len(ys))
        n = len(ys)
        rows, cols, vals = [], [], []
        rhs = np.zeros((n, img.shape[2]))
        diag = np.zeros(n)
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            ny, nx = ys + dy, xs + dx
            inside = (ny >= 0) & (ny < H) & (nx >= 0) & (nx < W)
            ny2, nx2 = np.clip(ny, 0, H - 1), np.clip(nx, 0, W - 1)
            diag += inside
            nb = idx[ny2, nx2]
            unk = inside & (nb >= 0)
            rows.append(np.nonzero(unk)[0]); cols.append(nb[unk]); vals.append(-np.ones(unk.sum()))
            kn = inside & (nb < 0)
            rhs[kn] += img[ny2[kn], nx2[kn]]
        rows.append(np.arange(n)); cols.append(np.arange(n)); vals.append(diag)
        A = sp.csc_matrix((np.concatenate(vals), (np.concatenate(rows), np.concatenate(cols))), shape=(n, n))
        out[ys, xs] = spla.splu(A).solve(rhs)
    else:
        # restrict to the bbox of the mask (+3 px) for speed
        ys, xs = np.nonzero(mask)
        y0, y1 = max(ys.min() - 3, 0), min(ys.max() + 4, H)
        x0, x1 = max(xs.min() - 3, 0), min(xs.max() + 4, W)
        m = mask[y0:y1, x0:x1]
        sub = img[y0:y1, x0:x1]
        h, w = m.shape
        N = h * w
        allid = np.arange(N).reshape(h, w)
        Y, X = np.mgrid[0:h, 0:w]
        r, cc, v = [], [], []
        dg = np.zeros((h, w))
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            ny, nx = Y + dy, X + dx
            ok = (ny >= 0) & (ny < h) & (nx >= 0) & (nx < w)
            dg += ok
            r.append(allid[ok]); cc.append(allid[ny[ok], nx[ok]]); v.append(-np.ones(ok.sum()))
        r.append(allid.ravel()); cc.append(allid.ravel()); v.append(dg.ravel())
        Lf = sp.csr_matrix((np.concatenate(v), (np.concatenate(r), np.concatenate(cc))), shape=(N, N))
        B = (Lf @ Lf).tocsr()
        unk, knw = allid[m], allid[~m]
        Buu = B[unk][:, unk].tocsc()
        Buk = B[unk][:, knw]
        flat = sub.reshape(N, -1)
        sol = spla.splu(Buu).solve(-(Buk @ flat[knw]))
        o = sub.reshape(N, -1).copy()
        o[unk] = sol
        out[y0:y1, x0:x1] = o.reshape(h, w, -1)
    return out[..., 0] if squeeze else out


def norm_blur(img, w, sigma):
    """Normalised (masked) Gaussian blur."""
    w = w.astype(np.float64)
    if img.ndim == 3:
        return cv2.GaussianBlur(img * w[..., None], (0, 0), sigma) / np.maximum(cv2.GaussianBlur(w, (0, 0), sigma), 1e-9)[..., None]
    return cv2.GaussianBlur(img * w, (0, 0), sigma) / np.maximum(cv2.GaussianBlur(w, (0, 0), sigma), 1e-9)


def loclin_lowpass(img, w, sigma):
    """Locally weighted *linear* regression (normalised convolution of order 1):
    a low-pass that is unbiased for linear shading gradients even next to holes."""
    H, W = img.shape[:2]
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
    G = lambda a: cv2.GaussianBlur(a, (0, 0), sigma)
    S0 = np.maximum(G(w), 1e-9)
    mx, my = G(w * xx) / S0, G(w * yy) / S0
    cxx = G(w * xx * xx) / S0 - mx * mx
    cxy = G(w * xx * yy) / S0 - mx * my
    cyy = G(w * yy * yy) / S0 - my * my
    det = cxx * cyy - cxy * cxy
    ok = det > 1e-3 * sigma ** 4
    out = np.zeros_like(img, dtype=np.float64)
    for ch in range(img.shape[2]):
        f = img[..., ch]
        mf = G(w * f) / S0
        cxf = G(w * xx * f) / S0 - mx * mf
        cyf = G(w * yy * f) / S0 - my * mf
        bx = np.where(ok, (cyy * cxf - cxy * cyf) / np.where(ok, det, 1), 0)
        by = np.where(ok, (cxx * cyf - cxy * cxf) / np.where(ok, det, 1), 0)
        out[..., ch] = mf + bx * (xx - mx) + by * (yy - my)
    return out


# ----------------------------------------------------------------------------
# stroke geometry
# ----------------------------------------------------------------------------
def zhang_suen(mask):
    """Vectorised Zhang-Suen thinning -> 1-px skeleton."""
    img = np.pad((mask > 0).astype(np.uint8), 1)
    while True:
        changed = False
        for step in (0, 1):
            Pm = img
            p2 = Pm[:-2, 1:-1]; p3 = Pm[:-2, 2:]; p4 = Pm[1:-1, 2:]; p5 = Pm[2:, 2:]
            p6 = Pm[2:, 1:-1]; p7 = Pm[2:, :-2]; p8 = Pm[1:-1, :-2]; p9 = Pm[:-2, :-2]
            nb = [p2, p3, p4, p5, p6, p7, p8, p9]
            Bn = sum(n.astype(np.int32) for n in nb)
            seq = nb + [p2]
            An = sum(((seq[i] == 0) & (seq[i + 1] == 1)).astype(np.int32) for i in range(8))
            c = Pm[1:-1, 1:-1] == 1
            if step == 0:
                m = c & (Bn >= 2) & (Bn <= 6) & (An == 1) & (p2 * p4 * p6 == 0) & (p4 * p6 * p8 == 0)
            else:
                m = c & (Bn >= 2) & (Bn <= 6) & (An == 1) & (p2 * p4 * p8 == 0) & (p2 * p6 * p8 == 0)
            if m.any():
                img[1:-1, 1:-1][m] = 0
                changed = True
        if not changed:
            break
    return img[1:-1, 1:-1].astype(bool)


def skeleton_path(skel):
    """Longest simple path through the skeleton (two BFS passes), left->right."""
    ys, xs = np.nonzero(skel)
    pts = np.stack([xs, ys], 1)
    index = {(int(x), int(y)): i for i, (x, y) in enumerate(pts)}
    nbrs = [[index[(x + dx, y + dy)] for dx in (-1, 0, 1) for dy in (-1, 0, 1)
             if (dx or dy) and (x + dx, y + dy) in index] for x, y in map(tuple, pts)]

    def bfs(s):
        dist = -np.ones(len(pts), int); prev = -np.ones(len(pts), int)
        dist[s] = 0; q = [s]
        for u in q:
            for v in nbrs[u]:
                if dist[v] < 0:
                    dist[v] = dist[u] + 1; prev[v] = u; q.append(v)
        return dist, prev
    d0, _ = bfs(int(np.argmin(pts[:, 0])))
    a = int(np.argmax(d0))
    d1, prev = bfs(a)
    b = int(np.argmax(d1))
    path = [b]
    while path[-1] != a:
        path.append(prev[path[-1]])
    path = pts[path].astype(np.float64)
    return path[::-1] if path[0, 0] > path[-1, 0] else path


def bez(p0, c, p1, t):
    t = np.asarray(t, np.float64)[:, None]
    return (1 - t) ** 2 * p0 + 2 * (1 - t) * t * c + t ** 2 * p1


def bez_tan(p0, c, p1, t):
    t = np.asarray(t, np.float64)[:, None]
    return 2 * (1 - t) * (c - p0) + 2 * t * (p1 - c)


def fit_quad_bezier(pts, iters=30):
    """Least-squares quadratic Bezier (free endpoints) with closest-point
    re-parameterisation."""
    d = np.r_[0, np.cumsum(np.hypot(*np.diff(pts, axis=0).T))]
    t = d / d[-1]
    tt = np.linspace(-0.05, 1.05, 4401)
    for _ in range(iters):
        A = np.stack([(1 - t) ** 2, 2 * (1 - t) * t, t ** 2], 1)
        sol, *_ = np.linalg.lstsq(A, pts, rcond=None)
        p0, c, p1 = sol
        _, j = cKDTree(bez(p0, c, p1, tt)).query(pts)
        t = np.clip(tt[j], 0, 1)
    resid = np.hypot(*(bez(p0, c, p1, t) - pts).T)
    return p0, c, p1, resid


def arclen_samples(p0, c, p1, n):
    tt = np.linspace(0, 1, 4001)
    q = bez(p0, c, p1, tt)
    s = np.r_[0, np.cumsum(np.hypot(*np.diff(q, axis=0).T))]
    ts = np.interp(np.linspace(0, s[-1], n), s, tt)
    return ts, bez(p0, c, p1, ts), s[-1]


def side_cos(p0, c, p1, shape):
    """Per pixel: nearest-point parameter t on the centreline and the side
    cosine s (+1 = concave/upper side of the arc, -1 = convex/lower side)."""
    H, W = shape
    tt = np.linspace(0, 1, 2001)
    curve = bez(p0, c, p1, tt)
    yy, xx = np.mgrid[0:H, 0:W]
    Pp = np.stack([xx.ravel(), yy.ravel()], 1).astype(np.float64)
    dist, j = cKDTree(curve).query(Pp)
    t = tt[j]
    tan = bez_tan(p0, c, p1, t)
    rel = Pp - curve[j]
    cross = tan[:, 0] * rel[:, 1] - tan[:, 1] * rel[:, 0]
    s = cross / np.maximum(np.hypot(tan[:, 0], tan[:, 1]) * dist, 1e-9)
    # orient: the control point lies on the convex side -> negative
    mid = bez(p0, c, p1, [0.5])[0]
    tm = bez_tan(p0, c, p1, [0.5])[0]
    cs = np.sign(tm[0] * (c - mid)[1] - tm[1] * (c - mid)[0])
    return t.reshape(H, W), np.clip(-cs * s, -1, 1).reshape(H, W)


# ----------------------------------------------------------------------------
# PatchMatch completion (vectorised, multi-scale, Wexler-style EM)
# ----------------------------------------------------------------------------
class _Level:
    def __init__(self, img, hole, src, r, known_w, rng):
        self.H, self.W = hole.shape
        self.C = img.shape[2]
        self.rng = rng
        H, W = self.H, self.W
        k = 2 * r + 1
        inner = np.zeros((H, W), bool); inner[r:H - r, r:W - r] = True
        tmask = cv2.dilate(hole.astype(np.uint8), np.ones((k, k), np.uint8)).astype(bool) & inner
        smask = cv2.erode(src.astype(np.uint8), np.ones((k, k), np.uint8)).astype(bool) & inner & ~tmask
        self.tmask, self.smask, self.hole = tmask, smask, hole
        self.ty, self.tx = np.nonzero(tmask)
        self.sy, self.sx = np.nonzero(smask)
        self.tidx = self.ty * W + self.tx
        dy, dx = np.mgrid[-r:r + 1, -r:r + 1]
        self.off = (dy * W + dx).ravel()
        self.wpix = np.where(hole, 1.0, known_w).astype(np.float32).ravel()
        self.img = img.reshape(-1, self.C).astype(np.float32).copy()
        self.tid_map = -np.ones((H, W), np.int64)
        self.tid_map[tmask] = np.arange(len(self.ty))

    def random_nnf(self):
        j = self.rng.integers(0, len(self.sy), len(self.ty))
        return self.sy[j].copy(), self.sx[j].copy()

    def cache_targets(self):
        idx = self.tidx[:, None] + self.off[None, :]
        self.Tp = self.img[idx]
        self.Tw = self.wpix[idx]
        self.Tws = np.maximum(self.Tw.sum(1), 1e-6)

    def dist(self, qy, qx, sel=None):
        tp = self.Tp if sel is None else self.Tp[sel]
        tw = self.Tw if sel is None else self.Tw[sel]
        tws = self.Tws if sel is None else self.Tws[sel]
        sidx = (qy * self.W + qx)[:, None] + self.off[None, :]
        d = ((self.img[sidx] - tp) ** 2).sum(2)
        return (d * tw).sum(1) / tws

    def valid(self, qy, qx):
        ok = (qy >= 0) & (qy < self.H) & (qx >= 0) & (qx < self.W)
        out = np.zeros_like(ok)
        out[ok] = self.smask[qy[ok], qx[ok]]
        return out

    def try_cand(self, ny, nx, nd, qy, qx, sel):
        ok = self.valid(qy, qx)
        s = np.nonzero(sel & ok)[0] if sel is not None else np.nonzero(ok)[0]
        if not len(s):
            return
        d = self.dist(qy[s], qx[s], s)
        b = d < nd[s]
        s = s[b]
        ny[s], nx[s], nd[s] = qy[s], qx[s], d[b]

    def patchmatch(self, ny, nx, iters, maxrad):
        nd = self.dist(ny, nx)
        H, W = self.H, self.W
        for _ in range(iters):
            for step in (8, 4, 2, 1):          # parallel (jump-flood) propagation
                for ddy, ddx in ((0, step), (0, -step), (step, 0), (-step, 0)):
                    py, px = self.ty - ddy, self.tx - ddx
                    inb = (py >= 0) & (py < H) & (px >= 0) & (px < W)
                    nb = np.full(len(py), -1)
                    nb[inb] = self.tid_map[py[inb], px[inb]]
                    sel = nb >= 0
                    qy = np.where(sel, ny[np.maximum(nb, 0)] + ddy, 0)
                    qx = np.where(sel, nx[np.maximum(nb, 0)] + ddx, 0)
                    self.try_cand(ny, nx, nd, qy, qx, sel)
            rad = maxrad                        # random search
            while rad >= 1:
                qy = ny + self.rng.integers(-rad, rad + 1, len(ny))
                qx = nx + self.rng.integers(-rad, rad + 1, len(nx))
                self.try_cand(ny, nx, nd, qy, qx, None)
                rad //= 2
            j = self.rng.integers(0, len(self.sy), len(ny))
            self.try_cand(ny, nx, nd, self.sy[j], self.sx[j], None)
        return nd

    def vote(self, ny, nx, nd):
        H, W, C = self.H, self.W, self.C
        sig2 = max(np.percentile(nd, 75), 1e-6)
        w = np.exp(-nd / (2 * sig2))
        acc = np.zeros((H * W, C)); wsum = np.zeros(H * W)
        sbase = ny * W + nx
        for o in self.off:
            t = self.tidx + o
            for ch in range(C):
                acc[:, ch] += np.bincount(t, weights=w * self.img[sbase + o, ch], minlength=H * W)
            wsum += np.bincount(t, weights=w, minlength=H * W)
        good = self.hole.ravel() & (wsum > 0)
        self.img[good] = (acc[good] / wsum[good, None]).astype(np.float32)


def _down(img, w):
    H2, W2 = w.shape[0] // 2, w.shape[1] // 2
    img = img[:H2 * 2, :W2 * 2]; w = w[:H2 * 2, :W2 * 2]
    ws = w.reshape(H2, 2, W2, 2).sum((1, 3))
    iv = (img * w[..., None]).reshape(H2, 2, W2, 2, -1).sum((1, 3))
    return iv / np.maximum(ws, 1e-6)[..., None]


def patchmatch_complete(img, hole, src, levels, r, known_w, em, pm_iters, seed):
    rng = np.random.default_rng(seed)
    pyr = [(img.astype(np.float32), hole.copy(), src.copy())]
    for _ in range(levels - 1):
        im, ho, sr = pyr[-1]
        H2, W2 = ho.shape[0] // 2, ho.shape[1] // 2
        pyr.append((_down(im, (~ho).astype(np.float32)).astype(np.float32),
                    ho[:H2 * 2, :W2 * 2].reshape(H2, 2, W2, 2).any((1, 3)),
                    sr[:H2 * 2, :W2 * 2].reshape(H2, 2, W2, 2).all((1, 3))))
    prev = None
    for li in range(levels - 1, -1, -1):
        im, ho, sr = pyr[li]
        L = _Level(im, ho, sr, r, known_w, rng)
        if prev is None:
            # coherent initialisation: every hole component is first copied from
            # one translated source region (keeps real texture energy instead of
            # starting from a flat average)
            ny, nx = L.random_nnf()
            ncomp, lab = cv2.connectedComponents(L.tmask.astype(np.uint8))
            tl = lab[L.ty, L.tx]
            for ci in range(1, ncomp):
                sel = np.nonzero(tl == ci)[0]
                best = (-1.0, 0, 0)
                for _ in range(400):
                    j = rng.integers(0, len(L.sy)); k = rng.integers(0, len(sel))
                    oy = L.sy[j] - L.ty[sel[k]]; ox = L.sx[j] - L.tx[sel[k]]
                    v = L.valid(L.ty[sel] + oy, L.tx[sel] + ox).mean()
                    if v > best[0]:
                        best = (v, oy, ox)
                    if v > 0.999:
                        break
                _, oy, ox = best
                qy, qx = L.ty[sel] + oy, L.tx[sel] + ox
                ok = L.valid(qy, qx)
                ny[sel[ok]] = qy[ok]; nx[sel[ok]] = qx[ok]
            hp = np.nonzero(L.hole.ravel())[0]
            tid = L.tid_map.ravel()[hp]
            L.img[hp] = L.img[ny[tid] * L.W + nx[tid]]
        else:
            pL, pny, pnx = prev
            cy = np.clip(L.ty // 2, 0, pL.H - 1); cx = np.clip(L.tx // 2, 0, pL.W - 1)
            pid = pL.tid_map[cy, cx]
            ry, rx = L.random_nnf()
            has = pid >= 0
            ny = np.where(has, pny[np.maximum(pid, 0)] * 2 + (L.ty % 2), ry)
            nx = np.where(has, pnx[np.maximum(pid, 0)] * 2 + (L.tx % 2), rx)
            bad = ~L.valid(ny, nx)
            ny[bad], nx[bad] = ry[bad], rx[bad]
            up = cv2.resize(pL.img.reshape(pL.H, pL.W, -1), (L.W, L.H), interpolation=cv2.INTER_LINEAR).reshape(-1, L.C)
            hf = ho.ravel()
            L.img[hf] = up[hf]
            L.cache_targets()
            L.vote(ny, nx, L.dist(ny, nx))
        step = levels - 1 - li
        for _ in range(em[step]):
            L.cache_targets()
            nd = L.patchmatch(ny, nx, pm_iters[step], max(8, max(L.H, L.W) // 2))
            L.vote(ny, nx, nd)
        prev = (L, ny, nx)
    return L.img.reshape(L.H, L.W, -1).astype(np.float64)


# ----------------------------------------------------------------------------
# pipeline steps (called in order by pipeline.py)
# ----------------------------------------------------------------------------
def crop_art(src_rgba, pad, alpha_min):
    """Crop the source to the bbox of alpha >= alpha_min plus `pad` px (transparent
    padding where the window leaves the canvas). Returns (art, (x0, y0) offset)."""
    al = src_rgba[..., 3]
    ys, xs = np.nonzero(al >= alpha_min)
    x0, y0 = xs.min() - pad, ys.min() - pad
    x1, y1 = xs.max() + pad + 1, ys.max() + pad + 1
    H, W = al.shape
    # pad with transparency only if the window leaves the source canvas
    pt, pl, pb, pr = max(0, -y0), max(0, -x0), max(0, y1 - H), max(0, x1 - W)
    canvas = np.pad(src_rgba, ((pt, pb), (pl, pr), (0, 0)))
    art = canvas[y0 + pt:y1 + pt, x0 + pl:x1 + pl].copy()
    return art, (int(x0), int(y0))


def halo_transmission(rgb, Lbg, cores, excl_cheek, ok_alpha, P, halo_r):
    """Per-channel glow transmission R(u, v) for every stroke (u = position along
    the stroke outline, v = distance from the stroke edge), measured as the
    (u, v)-smoothed ratio  art / smooth background.  Returns the total
    transmission field (product over strokes) and the per-stroke (u, v) tables."""
    H, W = rgb.shape[:2]
    SU, SV = P['ratio_su'], P['ratio_sv']
    feats = {}
    for k, m in cores.items():
        de = cv2.distanceTransform(1 - m, cv2.DIST_L2, 5)
        cnt, _ = cv2.findContours(m.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        cp = max(cnt, key=len)[:, 0, :].astype(np.float64)
        # smooth the pixel-staircase outline and resample it densely (0.25 px) so
        # the outline coordinate u of the nearest point varies continuously
        cp = np.stack([gaussian_filter1d(cp[:, 0], 3, mode='wrap'), gaussian_filter1d(cp[:, 1], 3, mode='wrap')], 1)
        seg = np.hypot(*np.diff(np.vstack([cp, cp[:1]]), axis=0).T)
        cum = np.r_[0, np.cumsum(seg)]
        ud = np.arange(0, cum[-1], 0.25)
        loop = np.vstack([cp, cp[:1]])
        cp = np.stack([np.interp(ud, cum, loop[:, 0]), np.interp(ud, cum, loop[:, 1])], 1)
        seg = np.full(len(ud), 0.25)
        ucum = ud
        near = (de <= halo_r) & (m == 0)
        ny_, nx_ = np.nonzero(near)
        _, j = cKDTree(cp).query(np.stack([nx_, ny_], 1))
        u = np.zeros((H, W)); u[ny_, nx_] = ucum[j]
        feats[k] = dict(m=m, de=de, u=u, P=seg.sum(), near=near)
    ratio = {k: np.ones((H, W, 3)) for k in cores}
    tables = {}
    for _ in range(2):
        for k, F in feats.items():
            m, de, u, Pk, near = F['m'], F['de'], F['u'], F['P'], F['near']
            oth = np.ones((H, W, 3))
            for o in cores:
                if o != k:
                    oth *= ratio[o]
            obs = rgb / oth
            others = np.maximum.reduce([cores[o] for o in cores if o != k])
            dO = cv2.distanceTransform(1 - others, cv2.DIST_L2, 5)
            ok = near & ~excl_cheek & (dO > de + 6) & ok_alpha
            UB = 2.0
            NU, NV = int(np.ceil(Pk / UB)), halo_r + 1
            iu = np.clip((u / UB).astype(int), 0, NU - 1)
            iv = np.clip(np.round(de).astype(int), 0, NV - 1)
            lin = (iu * NV + iv)[ok]
            So = np.stack([np.bincount(lin, weights=obs[..., ch][ok], minlength=NU * NV) for ch in range(3)], 1).reshape(NU, NV, 3)
            Sb = np.stack([np.bincount(lin, weights=Lbg[..., ch][ok], minlength=NU * NV) for ch in range(3)], 1).reshape(NU, NV, 3)
            Sn = np.bincount(lin, minlength=NU * NV).astype(float).reshape(NU, NV)
            pad = 3 * SU

            def sm(a):
                a = np.concatenate([a[-pad:], a, a[:pad]], 0)
                a = gaussian_filter(a, (SU, SV) + ((0,) if a.ndim == 3 else ()), mode='nearest')
                return a[pad:-pad]
            r = sm(So) / np.maximum(sm(Sb), 1e-6)
            cnt_s = sm(Sn)
            # outline stretches with little or no reliable data (cheek / other
            # stroke exclusions) are bridged by circular interpolation along the
            # outline from well-supported bins; the two are blended smoothly by
            # support so the transmission map has no seams
            solid = cnt_s > 3.0
            r_int = np.ones_like(r)
            uu = np.arange(NU)
            for iv_ in range(NV):
                g_ = solid[:, iv_]
                if not g_.any():
                    continue
                gu = uu[g_]
                ext = np.r_[gu - NU, gu, gu + NU]
                for ch in range(3):
                    vals = r[g_, iv_, ch]
                    r_int[:, iv_, ch] = np.interp(uu, ext, np.r_[vals, vals, vals])
            alpha = np.clip((cnt_s - 0.5) / 2.5, 0, 1)[..., None]
            r = alpha * np.nan_to_num(r, nan=1.0) + (1 - alpha) * r_int
            r = np.concatenate([r[-pad:], r, r[:pad]], 0)
            r = gaussian_filter(r, (1.0, 0.5, 0), mode='nearest')[pad:-pad]
            vv = np.arange(NV)
            taper = np.clip((halo_r - vv) / 16.0, 0, 1)
            taper = taper * taper * (3 - 2 * taper)
            r = 1 + (r - 1) * taper[None, :, None]          # exactly 1 at halo_r
            R = np.ones((H, W, 3))
            ny_, nx_ = np.nonzero(near)
            rext = np.concatenate([r[-pad:], r, r[:pad]], 0)
            cu = u[ny_, nx_] / UB + pad
            for ch in range(3):
                R[ny_, nx_, ch] = map_coordinates(rext[..., ch], [cu, de[ny_, nx_]], order=1, mode='nearest')
            ratio[k] = R
            tables[k] = (r, iu)
    tot = np.ones((H, W, 3))
    for k in cores:
        tot *= ratio[k]
    return tot, tables, feats


def zone_a(cores, tables, feats, P, halo_r):
    """Zone A (re-synthesised): stroke + the part of the glow where luminance
    transmission deviates by more than zone_thr, at least zone_vmin px."""
    H, W = next(iter(cores.values())).shape
    zone = np.zeros((H, W), bool)
    for k, m in cores.items():
        r, iu = tables[k]
        dev = np.abs(1 - r @ LUMA)
        vA = np.array([(np.nonzero(row > P['zone_thr'])[0].max() + 1) if (row > P['zone_thr']).any() else 0
                       for row in dev], float)
        vA = gaussian_filter1d(np.maximum(vA, P['zone_vmin']), 4, mode='wrap') + 2
        de = feats[k]['de']
        zone |= (m > 0) | ((de <= halo_r) & (de <= vA[iu]))
    zone = cv2.morphologyEx(zone.astype(np.uint8), cv2.MORPH_CLOSE, ell(7)).astype(bool)
    return cv2.GaussianBlur(zone.astype(np.float32), (0, 0), 3) > 0.5


def edit_mask(cores, halo_r):
    """Union of the feature cores and the edit mask (every pixel within halo_r
    of a core: the only pixels the clean body may change)."""
    coreU = np.maximum.reduce(list(cores.values()))
    de_all = cv2.distanceTransform(1 - coreU, cv2.DIST_L2, 5)
    return coreU, de_all <= halo_r


def background_fill(rgb, al, Hh, protect, lbg_sigma):
    """Smooth background under the glow: a local-linear low-pass of the
    untouched skin around the edit mask, filled across it by a thin-plate
    (biharmonic) interpolation. Pixels outside the edit window are 1."""
    H, W = Hh.shape
    ys, xs = np.nonzero(Hh)
    wy0, wy1 = max(ys.min() - 40, 0), min(ys.max() + 41, H)
    wx0, wx1 = max(xs.min() - 40, 0), min(xs.max() + 41, W)
    win = (slice(wy0, wy1), slice(wx0, wx1))
    valid = (~Hh[win]) & (al[win] > 240) & ~protect[win]
    Llp = loclin_lowpass(rgb[win], valid.astype(np.float64), lbg_sigma)
    Lbg = np.ones((H, W, 3))
    Lbg[win] = laplace_fill(Llp, Hh[win], biharm=True)
    return Lbg


def unblend(rgb, Lbg, cores, excl, al, P, halo_r):
    """Glow un-blending (zone B): divide by the measured per-channel transmission.
    Returns (corrected rgb, per-stroke (u, v) tables, per-stroke geometry)."""
    trans, tables, feats = halo_transmission(rgb, Lbg, cores, excl, al > 240, P, halo_r)
    return rgb / trans, tables, feats


def zone_a_mask(cores, tables, feats, protect, P, halo_r):
    """Zone A, minus a 4 px margin around protected pixels (sparkles)."""
    return zone_a(cores, tables, feats, P, halo_r) & ~cv2.dilate(protect.astype(np.uint8), ell(4)).astype(bool)


def resynthesize(corr, rgb, al, Lbg, zA, protect, coreU, P, seed, log=None):
    """Re-synthesise zone A inside a window around it (step 6 of the approved
    derivation). Returns (window slices, reconstructed window, band gains)."""
    H, W = zA.shape
    ys, xs = np.nonzero(zA)
    sy0, sy1 = max(ys.min() - 170, 0), min(ys.max() + 170, H)
    sx0, sx1 = max(xs.min() - 170, 0), min(xs.max() + 170, W)
    sw = (slice(sy0, sy1), slice(sx0, sx1))
    sub = corr[sw].copy()
    hole = zA[sw]
    alw = al[sw]
    Lb_w = Lbg[sw]
    spk = protect[sw]
    # 6a. low-frequency band outside zone A
    dA = cv2.distanceTransform((~hole).astype(np.uint8), cv2.DIST_L2, 5)
    band = (~hole) & (dA <= P['band'])
    big = hole | band
    wk = (~big) & (alw > 240) & ~spk
    base_big = Lb_w + laplace_fill(norm_blur(sub, wk, 4) - Lb_w, big, biharm=False)
    wk3 = (~hole) & ~spk
    clow = norm_blur(sub, wk3, 6)
    tt = np.clip(1 - dA / P['band'], 0, 1)
    wgt = (tt * tt * (3 - 2 * tt))[..., None]
    sub = np.where(band[..., None], sub - clow + (wgt * base_big + (1 - wgt) * clow), sub)
    # 6b. base inside zone A: thin-plate background + harmonic boundary match
    known = (~hole) & (alw > 240)
    Ls = norm_blur(sub, known & ~spk, 4)
    base = Lb_w + laplace_fill(Ls - Lb_w, hole, biharm=False)
    # 6c. detail layer, texture-energy normalised
    Lloc = loclin_lowpass(sub, (known & ~spk).astype(np.float64), P['detail_sigma'])
    D = sub - Lloc
    e2 = norm_blur((D @ LUMA) ** 2, known, P['energy_sigma'])
    Ef = np.maximum(np.sqrt(np.maximum(e2, 1e-4)), 0.25)
    Et = np.where(hole, np.exp(laplace_fill(np.log(Ef), hole)), Ef)
    # 6d. source region: untouched skin away from strokes, cheeks, speculars, rim
    dsil = cv2.distanceTransform((al > 127).astype(np.uint8), cv2.DIST_L2, 5)
    pinkm = cv2.dilate(((cv2.GaussianBlur(rgb, (0, 0), 3) @ [1, -1, 0]) > -30).astype(np.uint8), np.ones((21, 21), np.uint8)).astype(bool)
    specm = cv2.dilate(((rgb @ LUMA) > 235).astype(np.uint8), np.ones((31, 31), np.uint8)).astype(bool)
    src_ok = (dsil > 70) & ~pinkm & ~specm & ~cv2.dilate(coreU, np.ones((9, 9), np.uint8)).astype(bool)
    src_w = src_ok[sw] & ~big
    t0 = time.perf_counter()
    Dn = patchmatch_complete((D / Et[..., None]).astype(np.float32), hole, src_w, P['pm_levels'], P['pm_r'],
                             P['pm_known_w'], P['pm_em'], P['pm_iters'], seed)
    out = Dn * Et[..., None]
    if log:
        log('PatchMatch done in %.1fs' % (time.perf_counter() - t0))
    # 6e. multi-band texture-energy equalisation (targets from the real skin)
    sig = [0, 1, 2, 4, 8, 16]
    Dfull = np.where(hole[..., None], out, D)
    Gd = [Dfull] + [cv2.GaussianBlur(Dfull, (0, 0), s_) for s_ in sig[1:]]
    Yc = sub @ LUMA
    Gy = [Yc] + [cv2.GaussianBlur(Yc, (0, 0), s_) for s_ in sig[1:]]
    dout = cv2.distanceTransform((~hole).astype(np.uint8), cv2.DIST_L2, 5)
    newD = Gd[-1].copy()
    band_gains = []
    for k in range(len(sig) - 1):
        bd = Gd[k] - Gd[k + 1]
        by = Gy[k] - Gy[k + 1]
        rs = max(10, 3 * sig[k + 1])
        wt = (~hole) & (dout > 2 * sig[k + 1] + 2) & (alw > 240) & ~spk
        T = np.exp(laplace_fill(np.log(np.sqrt(np.maximum(norm_blur(by ** 2, wt, rs), 1e-6))), hole))
        S = np.sqrt(np.maximum(norm_blur((bd @ LUMA) ** 2, hole, rs), 1e-6))
        g = norm_blur(np.clip(T / S, 0.7, P['band_gain_max']), hole, 4)
        g = np.where(hole, g, 1.0)
        band_gains.append([float(x) for x in np.percentile(g[hole], [5, 50, 95]).round(2)])
        newD += bd * g[..., None]
    out = np.where(hole[..., None], newD, out)
    Rin = base + out
    # 6f. seamless boundary correction (smoothed mismatch, harmonic interpolation)
    k3 = np.ones((3, 3), np.uint8)
    outer = cv2.dilate(hole.astype(np.uint8), k3).astype(bool) & ~hole
    inner = hole & cv2.dilate(outer.astype(np.uint8), k3).astype(bool)
    full = np.where(hole[..., None], Rin, sub)
    wi = inner.astype(np.float64)
    nb = cv2.blur(full * wi[..., None], (3, 3)) / np.maximum(cv2.blur(wi, (3, 3)), 1e-6)[..., None]
    mis = norm_blur(np.where(outer[..., None], sub - nb, 0), outer, P['seam_sigma'])
    Rin = Rin + laplace_fill(np.where(outer[..., None], mis, 0), hole)
    sub = np.where(hole[..., None], Rin, sub)
    return sw, sub, band_gains


class EditIntegrityError(AssertionError):
    """The clean body differs from the art outside the edit mask, or in alpha."""


def composite(art, corr, sw, sub, Hh):
    """Original outside the edit mask, reconstruction inside, rounded to 8 bit.
    Raises EditIntegrityError unless every pixel outside the mask and the whole
    alpha channel are bit-identical to the art (explicit checks, so they hold
    under `python -O` too). Returns (clean, |clean - art| max over channels,
    max diff outside the mask)."""
    rec = corr.copy()
    rec[sw] = sub
    clean = art.copy()
    vals = np.clip(np.round(rec), 0, 255).astype(np.uint8)
    clean[..., :3][Hh] = vals[Hh]
    diff = np.abs(clean.astype(int) - art.astype(int)).max(2)
    outside = int(diff[~Hh].max()) if (~Hh).any() else 0
    if outside != 0:
        raise EditIntegrityError('pixels changed outside the edit mask')
    if not (clean[..., 3] == art[..., 3]).all():
        raise EditIntegrityError('alpha changed')
    return clean, diff, outside


# ----------------------------------------------------------------------------
# measurement formatting (face JSON)
# ----------------------------------------------------------------------------
def r1(v, n=1):
    return [round(float(x), n) for x in v]


def rgbhex(c):
    c = [int(round(float(x))) for x in np.clip(c, 0, 255)]
    return '#%02x%02x%02x' % tuple(c)


def colour(c):
    return dict(rgb=[int(round(float(x))) for x in np.clip(c, 0, 255)], hex=rgbhex(c))


# ----------------------------------------------------------------------------
# height / normal maps
# ----------------------------------------------------------------------------
def height_normal(art, clean, dimple, HN):
    """Height map (pillow dome + top dimple + fine cloud bumps from the clean art)
    and its tangent-space normal map. Returns the float maps, the encoded 16-bit
    height and 8-bit normal images, and the parameters for the face JSON."""
    al = art[..., 3].astype(np.float64) / 255
    H, W = al.shape
    body = (al > 0.5).astype(np.uint8)
    ys, xs = np.nonzero(body)
    bw, bh = xs.max() - xs.min() + 1, ys.max() - ys.min() + 1
    Rb = HN['bevel_frac'] * min(bw, bh)
    d = cv2.distanceTransform(body, cv2.DIST_L2, 5)
    d = cv2.GaussianBlur(d, (0, 0), 6) * body                # soften medial-axis creases
    t = np.clip(d / Rb, 0, 1)
    h_bevel = Rb * np.sqrt(np.clip(1 - (1 - t) ** 2, 0, 1))  # quarter-circle rounded edge
    cx, cy = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
    rho2 = ((xx - cx) / (bw / 2)) ** 2 + ((yy - cy) / (bh / 2)) ** 2
    h_front = HN['front_bulge'] * Rb * np.clip(1 - rho2, 0, 1) * t * t
    h_dimple = np.zeros((H, W))
    if dimple:
        dx, dy = dimple['center']
        h_dimple = -HN['dimple_depth'] * Rb * np.exp(-((xx - dx) ** 2 + (yy - dy) ** 2) / (2 * HN['dimple_radius'] ** 2))
    dome = (h_bevel + h_front + h_dimple) * body
    # fine cloud bumps from the luminance band-pass of the CLEAN art
    Y = clean[..., :3].astype(np.float64) @ LUMA
    w = body.astype(np.float64)
    b0, b1 = HN['detail_band']
    bp = norm_blur(Y, w, b0) - norm_blur(Y, w, b1)
    s = 1.4826 * np.median(np.abs(bp[body > 0] - np.median(bp[body > 0])))
    det = np.tanh(bp / s / HN['detail_clip']) * HN['detail_clip']
    sat = clean[..., :3].max(2).astype(np.float64) - clean[..., :3].min(2)
    spec = cv2.GaussianBlur(((Y > 238) & (sat < 40)).astype(np.float64), (0, 0), 6)
    wdet = np.clip(d / HN['edge_fade'], 0, 1) * (1 - (1 - HN['specular_weight']) * np.clip(spec * 2, 0, 1))
    h_detail = HN['detail_amp'] * det * wdet
    h = (dome + h_detail) * body
    h = np.maximum(h, 0)
    hmax = float(h.max())
    h16 = np.round(h / hmax * 65535).astype(np.uint16)
    # normals (OpenGL: +X right, +Y up, +Z toward the viewer)
    gx = cv2.Sobel(h, cv2.CV_64F, 1, 0, ksize=3) / 8
    gy = cv2.Sobel(h, cv2.CV_64F, 0, 1, ksize=3) / 8
    n = np.stack([-gx, gy, np.ones_like(h)], 2)
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    n[body == 0] = [0, 0, 1]
    nrm8 = np.round((n * 0.5 + 0.5) * 255).astype(np.uint8)
    info = dict(heightScalePx=round(hmax, 2), bevelRadiusPx=round(float(Rb), 1), **{k: (list(v) if isinstance(v, tuple) else v) for k, v in HN.items()},
                detailRobustSigmaLuma=round(float(s), 3))
    return dict(h=h, n=n, body=body, h16=h16, nrm8=nrm8, info=info)


def height_normal_doc(file_prefix, HN, info):
    """The face JSON's `heightNormalMaps` entry (file names, recipe, parameters)."""
    b0, b1 = HN['detail_band']
    return dict(
        heightFile=f'{file_prefix}-height.png (16-bit gray; value/65535 * heightScalePx = height in px)',
        normalFile=f'{file_prefix}-normal.png (8-bit RGB tangent space, OpenGL convention: R=+X right, G=+Y up, B=+Z out; flat = 128,128,255)',
        recipe='h = bevel + frontBulge + dimple + detail; bevel = Rb*sqrt(1-(1-t)^2), t = clamp(d/Rb) with d = Gaussian(6)-softened distance to the alpha>0.5 silhouette; frontBulge = front_bulge*Rb*(1-rho^2)*t^2 (rho = elliptical radius over the body bbox); dimple = -dimple_depth*Rb*Gaussian(dimple_radius) at topDimple.center; detail = detail_amp*detail_clip*tanh(bp/(sigma*detail_clip)) with bp = luminance band-pass (sigma %g..%g px) of %s-clean.png, faded over edge_fade px at the rim and down-weighted on specular streaks. Normals from Sobel gradients of h (px units).' % (b0, b1, file_prefix),
        **info)
