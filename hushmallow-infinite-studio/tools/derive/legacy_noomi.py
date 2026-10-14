#!/usr/bin/env python3
"""Derive full-resolution Noomi rig assets from the owner's APPROVED high-res art.

    python3 -I tools/derive_noomi_hires.py [path/to/noomi.webp]

Input (read only):
    ../hushmallow/assets/source/hires/noomi.webp   (1254x1254 RGBA, commit 71780dc)

Outputs (all in the noomi-art.png pixel space):
    assets/noomi/noomi-art.png          approved art cropped to its alpha bbox + 24 px
    assets/noomi/noomi-clean.png        same art with the painted face lines removed
    assets/noomi/noomi-clean-mask.png   edit mask (255 = pixels allowed to differ)
    assets/noomi/noomi-face.json        face / silhouette measurements (documented)
    assets/noomi/noomi-height.png       16-bit height map (pillow dome + cloud bumps)
    assets/noomi/noomi-normal.png       8-bit tangent-space normal map (OpenGL, +Y up)
    output/asset-qa/*                   before/after crops, diff proof, shading preview

This is a faithful, deterministic reconstruction (no generative model, no upscaling,
no external service).  Face-line removal works in three zones per line:

  core + inner halo ("zone A")   the navy stroke and the part of its glow where the
                                 body texture is mostly destroyed.  Re-synthesised
                                 from the body's own texture: smooth low-frequency
                                 shading (thin-plate background + harmonic boundary
                                 match) plus detail copied by multi-scale PatchMatch
                                 (Wexler-style EM) from untouched skin, then multi-band
                                 texture-energy equalisation and a seamless boundary
                                 correction.
  low-frequency band             16 px ring outside zone A: real pixels keep their
                                 texture, only the low-frequency shading is
                                 cross-faded to the smooth reconstruction (hides any
                                 residual glow edge).
  outer halo ("zone B")          the glow tail (out to 64 px from the stroke).  The
                                 real texture is still there under a semi-transparent
                                 glow, so it is *un-blended*: every pixel is divided
                                 by a per-channel glow transmission measured from the
                                 art itself as a function of (position along the
                                 stroke outline, distance from the stroke).

Everything outside the edit mask is copied bit-for-bit.
"""
import json
import os
import sys
import time

import numpy as np
import cv2
from PIL import Image
import scipy.sparse as sp
import scipy.sparse.linalg as spla
from scipy.ndimage import gaussian_filter, gaussian_filter1d, map_coordinates
from scipy.optimize import least_squares
from scipy.spatial import cKDTree
from scipy.special import erfc

HERE = os.path.dirname(os.path.abspath(__file__))
STUDIO = os.path.dirname(HERE)
DEFAULT_SRC = os.path.join(os.path.dirname(STUDIO), 'hushmallow', 'assets', 'source', 'hires', 'noomi.webp')
OUT = os.path.join(STUDIO, 'assets', 'noomi')
QA = os.path.join(STUDIO, 'output', 'asset-qa')

LUMA = np.array([0.299, 0.587, 0.114])
PAD = 24                 # transparent padding around the alpha bbox
ALPHA_MIN = 2            # alpha bbox threshold (alpha==1 is a scattered sub-visible noise floor)
HALO_R = 64              # outer radius of the glow correction (px from the stroke edge)
SEED = 1234              # PatchMatch RNG seed (determinism)

P = dict(                # inpainting parameters (documented in noomi-face.json)
    lbg_sigma=10.0,      # local-linear low-pass used as thin-plate boundary data
    ratio_su=4,          # outline smoothing of the glow transmission (bins of 2 px)
    ratio_sv=1.0,        # distance smoothing of the glow transmission (px)
    zone_thr=0.07,       # zone A = where the glow changes luminance by > 7 %
    zone_vmin=10,        # ...but at least 10 px beyond the stroke edge
    band=16,             # low-frequency cross-fade band outside zone A (px)
    detail_sigma=24,     # detail layer = image - local-linear low-pass(sigma)
    energy_sigma=16,     # texture-energy normalisation window
    pm_levels=4, pm_r=3, pm_known_w=2.0, pm_em=(6, 5, 4, 3), pm_iters=(5, 4, 3, 2),
    band_gain_max=2.2,   # cap of the multi-band texture-energy equalisation
    seam_sigma=5,        # boundary-mismatch smoothing for the seamless correction
)


def log(*a):
    print('[derive_noomi_hires]', *a, flush=True)


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
# main pipeline
# ----------------------------------------------------------------------------
def crop_art(src_rgba):
    al = src_rgba[..., 3]
    ys, xs = np.nonzero(al >= ALPHA_MIN)
    x0, y0 = xs.min() - PAD, ys.min() - PAD
    x1, y1 = xs.max() + PAD + 1, ys.max() + PAD + 1
    H, W = al.shape
    # pad with transparency only if the window leaves the source canvas
    pt, pl, pb, pr = max(0, -y0), max(0, -x0), max(0, y1 - H), max(0, x1 - W)
    canvas = np.pad(src_rgba, ((pt, pb), (pl, pr), (0, 0)))
    art = canvas[y0 + pt:y1 + pt, x0 + pl:x1 + pl].copy()
    return art, (int(x0), int(y0))


def find_features(art):
    """Dark navy strokes: the two upper ones are the eyes, the lower one the mouth."""
    rgb = art[..., :3].astype(np.float64)
    al = art[..., 3]
    body = (al > 127).astype(np.uint8)
    dsil = cv2.distanceTransform(body, cv2.DIST_L2, 5)
    dark = ((rgb[..., 0] < 70) & (rgb[..., 1] < 130) & (al > 200)).astype(np.uint8)
    n, lab, st, cen = cv2.connectedComponentsWithStats(dark, connectivity=8)
    ys, xs = np.nonzero(body)
    by0, by1 = ys.min(), ys.max()
    cands = []
    for i in range(1, n):
        cx, cy = cen[i]
        rel = (cy - by0) / (by1 - by0)
        far = dsil[lab == i].min() > 40
        if st[i, 4] > 2000 and 0.3 < rel < 0.8 and far:
            cands.append((st[i, 4], i))
    cands = [i for _, i in sorted(cands, reverse=True)[:3]]
    assert len(cands) == 3, 'expected three face strokes'
    cands.sort(key=lambda i: cen[i][1])
    mouth = cands[2]
    eyes = sorted(cands[:2], key=lambda i: cen[i][0])
    H, W = dark.shape
    cores = {}
    for name, i in (('eyeL', eyes[0]), ('eyeR', eyes[1]), ('mouth', mouth)):
        m = (lab == i).astype(np.uint8)
        m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, ell(4))
        ff = m.copy(); mk = np.zeros((H + 2, W + 2), np.uint8)
        cv2.floodFill(ff, mk, (0, 0), 1)
        cores[name] = (m | (1 - ff)).astype(np.uint8)       # fill the highlight holes
    # top dimple: the dark blob in the upper part of the body
    top = []
    for i in range(1, n):
        cx, cy = cen[i]
        if (cy - by0) / (by1 - by0) < 0.25 and st[i, 4] > 300:
            top.append((st[i, 4], i))
    dimple = None
    if top:
        i = max(top)[1]
        Y = cv2.GaussianBlur(rgb @ LUMA, (0, 0), 3)
        m = cv2.dilate((lab == i).astype(np.uint8), ell(6)).astype(bool)
        yy, xx = np.nonzero(m)
        k = np.argmin(Y[yy, xx])
        x, y, w, h = st[i, :4]
        dimple = dict(center=[float(xx[k]), float(yy[k])], centroid=[float(cen[i][0]), float(cen[i][1])],
                      bbox=[int(x), int(y), int(x + w - 1), int(y + h - 1)])
    return cores, dimple


def fit_cheeks(art, coreU):
    rgb = art[..., :3].astype(np.float64)
    al = art[..., 3]
    sm = cv2.GaussianBlur(rgb, (0, 0), 4)
    pink = sm[..., 0] - sm[..., 1]
    H, W = pink.shape
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
    de = cv2.distanceTransform(1 - coreU, cv2.DIST_L2, 5)
    n, lab, st, cen = cv2.connectedComponentsWithStats(((pink > 20) & (al > 250)).astype(np.uint8))
    big = sorted([(st[i, 4], i) for i in range(1, n)], reverse=True)[:2]
    cheeks = {}
    for _, i in big:
        cx0, cy0 = cen[i]
        win = (np.abs(xx - cx0) < 170) & (np.abs(yy - cy0) < 170) & (de > 70) & (al > 245)
        X, Yv, Z = xx[win], yy[win], pink[win]

        def model(p, x, y):
            cx, cy, r0, w, e, th = p[:6]
            ct, s_ = np.cos(th), np.sin(th)
            u = (x - cx) * ct + (y - cy) * s_
            v = (-(x - cx) * s_ + (y - cy) * ct) * e
            return 0.5 * erfc((np.hypot(u, v) - r0) / (w * np.sqrt(2)))

        def res(p):
            return p[6] + p[7] * (X - cx0) + p[8] * (Yv - cy0) + p[9] * model(p, X, Yv) - Z
        p = least_squares(res, [cx0, cy0, 80, 15, 1.0, 0.0, -70, 0, 0, 180], loss='soft_l1', f_scale=5).x
        C = model(p, xx, yy)
        inner = (C > 0.9) & (al > 250)
        # sparkles: the small pure-white glints inside the cheek (the cheek
        # itself is pink, so min(R, G, B) > 236 isolates them cleanly)
        Yl = rgb @ LUMA
        hp = Yl - cv2.GaussianBlur(Yl, (0, 0), 4)
        sp_ = ((rgb.min(2) > 236) & (C > 0.15) & (al > 250)).astype(np.uint8)
        ns, ls, ss, cs = cv2.connectedComponentsWithStats(sp_)
        sparkles = []
        for j in range(1, ns):
            if ss[j, 4] >= 4:
                rc = float(np.sqrt(ss[j, 4] / np.pi))
                sparkles.append(dict(center=[round(float(cs[j][0]), 1), round(float(cs[j][1]), 1)],
                                     radius=round(rc, 1), glowRadius=round(rc + 9.0, 1)))
        col = np.median(rgb[inner & (hp < 6)], 0)
        side = 'L' if p[0] < W / 2 else 'R'
        cheeks[side] = dict(params=p, C=C, sparkles=sparkles, color=col)
    return cheeks


def measure_stroke(art, m, Lbg, name):
    """Centreline, width, colours, highlight and glow of one stroke."""
    rgb = art[..., :3].astype(np.float64)
    path = skeleton_path(zhang_suen(m))
    p0, c, p1, resid = fit_quad_bezier(path)
    dt = cv2.distanceTransform(m, cv2.DIST_L2, 5)
    ins = dt[path[:, 1].astype(int), path[:, 0].astype(int)]
    width = 2 * float(np.median(ins[len(ins) // 10: -len(ins) // 10]))
    hw = width / 2
    ts, pts16, length = arclen_samples(p0, c, p1, 16)
    tan0 = bez_tan(p0, c, p1, [0.0])[0]; tan1 = bez_tan(p0, c, p1, [1.0])[0]
    tip0 = p0 - tan0 / np.linalg.norm(tan0) * hw
    tip1 = p1 + tan1 / np.linalg.norm(tan1) * hw
    # profiles across the stroke (normal pointing to the concave / upper side)
    Yl = rgb @ LUMA
    offs = np.arange(-hw, hw + 0.01, 0.25)
    hl_off, hl_w, hl_col, top_c, bot_c = [], [], [], [], []
    for t in np.linspace(0.12, 0.88, 40):
        q = bez(p0, c, p1, [t])[0]
        tg = bez_tan(p0, c, p1, [t])[0]; tg /= np.linalg.norm(tg)
        nrm = np.array([tg[1], -tg[0]])
        if np.dot(nrm, bez(p0, c, p1, [0.5])[0] - c) < 0:
            nrm = -nrm                                   # point away from the control point
        xs_, ys_ = q[0] + offs * nrm[0], q[1] + offs * nrm[1]
        prof = map_coordinates(Yl, [ys_, xs_], order=1)
        inner = np.abs(offs) < hw - 3
        k = np.argmax(np.where(inner, prof, -1))
        base = np.median(prof[inner])
        half = base + (prof[k] - base) / 2
        lo = k
        while lo > 0 and prof[lo] > half:
            lo -= 1
        hi = k
        while hi < len(prof) - 1 and prof[hi] > half:
            hi += 1
        hl_off.append(offs[k]); hl_w.append((hi - lo) * 0.25)
        hl_col.append([map_coordinates(rgb[..., ch], [[ys_[k]], [xs_[k]]], order=1)[0] for ch in range(3)])
        for o, store in ((hw - 7, top_c), (-(hw - 7), bot_c)):
            store.append([map_coordinates(rgb[..., ch], [[q[1] + o * nrm[1]], [q[0] + o * nrm[0]]], order=1)[0] for ch in range(3)])
    core_px = (cv2.erode(m, ell(5)) > 0) & (Yl < np.percentile(Yl[m > 0], 80))
    core_col = np.median(rgb[core_px], 0)
    # glow: arc-averaged profile on the concave side against the smooth background
    t_, s_ = side_cos(p0, c, p1, m.shape)
    de = cv2.distanceTransform(1 - m, cv2.DIST_L2, 5)
    vs = np.arange(1, 49, 1.0)
    O, B = [], []
    sel0 = (s_ > 0.9) & (t_ > 0.15) & (t_ < 0.85)
    for v in vs:
        rr = sel0 & (de > v - 1) & (de <= v)
        O.append(rgb[rr].mean(0)); B.append(Lbg[rr].mean(0))
    O, B = np.array(O), np.array(B)
    a = np.clip(1 - O[:, 0] / B[:, 0], 0, 1)             # glow transmission from R (glow R ~ 0)

    def gres(p):
        return p[0] * 0.5 * erfc((vs - p[2]) / (p[1] * np.sqrt(2))) - a
    A0, sg, v0 = least_squares(gres, [1.0, 8.0, 0.0], bounds=([0, 0.5, -30], [2, 60, 30])).x
    afit = A0 * 0.5 * erfc((vs - v0) / (sg * np.sqrt(2)))
    g = np.clip(((afit[:, None] * (O - B * (1 - afit[:, None]))).sum(0)) / (afit ** 2).sum(), 0, 255)
    sampled = O[(vs >= 1) & (vs <= 3)].mean(0)
    reach = float(vs[np.nonzero(a > 0.02)[0].max()]) if (a > 0.02).any() else 0.0
    # light under-glow on the convex side
    sel1 = (s_ < -0.9) & (t_ > 0.15) & (t_ < 0.85)
    ratio_b, Ob = [], []
    for v in vs:
        rr = sel1 & (de > v - 1) & (de <= v)
        ratio_b.append((rgb[rr] @ LUMA).mean() / (Lbg[rr] @ LUMA).mean())
        Ob.append(rgb[rr].mean(0))
    ratio_b = np.array(ratio_b)
    k = int(np.argmax(ratio_b))
    under = None
    if ratio_b[k] > 1.01:
        ext = vs[k:][ratio_b[k:] > 1.005]
        under = dict(peakOffset=float(vs[k]), peakGain=round(float(ratio_b[k]), 3),
                     extent=float(ext.max()) if len(ext) else float(vs[k]),
                     colorAtPeak=colour(Ob[k]))
    hl_off = np.array(hl_off); hl_w = np.array(hl_w)
    return dict(
        p0=p0, c=c, p1=p1, fitResidualMax=float(resid.max()), fitResidualMean=float(resid.mean()),
        pts16=pts16, length=float(length), width=width, tip0=tip0, tip1=tip1,
        core=core_col, coreTop=np.median(top_c, 0), coreBottom=np.median(bot_c, 0),
        hl_col=np.median(hl_col, 0), hl_off=float(np.median(hl_off)), hl_w=float(np.median(hl_w)),
        glow=dict(fitColor=g, sampled=sampled, alpha0=float(A0), sigma=float(sg), edgeShift=float(v0), reach=reach),
        under=under, ratio_below=ratio_b)


def halo_transmission(rgb, Lbg, cores, excl_cheek, ok_alpha):
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
        near = (de <= HALO_R) & (m == 0)
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
            NU, NV = int(np.ceil(Pk / UB)), HALO_R + 1
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
            taper = np.clip((HALO_R - vv) / 16.0, 0, 1)
            taper = taper * taper * (3 - 2 * taper)
            r = 1 + (r - 1) * taper[None, :, None]          # exactly 1 at HALO_R
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


def zone_a(cores, tables, feats):
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
        zone |= (m > 0) | ((de <= HALO_R) & (de <= vA[iu]))
    zone = cv2.morphologyEx(zone.astype(np.uint8), cv2.MORPH_CLOSE, ell(7)).astype(bool)
    return cv2.GaussianBlur(zone.astype(np.float32), (0, 0), 3) > 0.5


def main():
    t_start = time.time()
    src_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SRC
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(QA, exist_ok=True)
    src = np.array(Image.open(src_path).convert('RGBA'))
    log('source', src_path, src.shape)

    # 1. crop ------------------------------------------------------------------
    art, (ox, oy) = crop_art(src)
    Image.fromarray(art, 'RGBA').save(os.path.join(OUT, 'noomi-art.png'))
    H, W = art.shape[:2]
    log('crop offset', (ox, oy), 'size', (W, H))
    rgb = art[..., :3].astype(np.float64)
    al = art[..., 3]

    # 2. features --------------------------------------------------------------
    cores, dimple = find_features(art)
    coreU = np.maximum.reduce(list(cores.values()))
    cheeks = fit_cheeks(art, coreU)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
    excl_cheek = np.zeros((H, W), bool)
    sparkle_mask = np.zeros((H, W), bool)
    for ck in cheeks.values():
        p = ck['params']
        excl_cheek |= np.hypot(xx - p[0], yy - p[1]) < p[2] + 2 * p[3]
        for s_ in ck['sparkles']:
            sparkle_mask |= np.hypot(xx - s_['center'][0], yy - s_['center'][1]) < s_['glowRadius'] + 2
    de_all = cv2.distanceTransform(1 - coreU, cv2.DIST_L2, 5)
    Hh = de_all <= HALO_R                                    # = the edit mask
    log('features found; edit-mask px', int(Hh.sum()))

    # 3. smooth background under the glow (thin-plate fill) --------------------
    ys, xs = np.nonzero(Hh)
    wy0, wy1 = max(ys.min() - 40, 0), min(ys.max() + 41, H)
    wx0, wx1 = max(xs.min() - 40, 0), min(xs.max() + 41, W)
    win = (slice(wy0, wy1), slice(wx0, wx1))
    valid = (~Hh[win]) & (al[win] > 240) & ~sparkle_mask[win]
    Llp = loclin_lowpass(rgb[win], valid.astype(np.float64), P['lbg_sigma'])
    Lbg = np.ones((H, W, 3))
    Lbg[win] = laplace_fill(Llp, Hh[win], biharm=True)
    log('background fill done')

    # 4. measurements that need the background ---------------------------------
    meas = {k: measure_stroke(art, m, Lbg, k) for k, m in cores.items()}

    # 5. glow transmission and un-blending (zone B) ----------------------------
    trans, tables, feats = halo_transmission(rgb, Lbg, cores, excl_cheek, al > 240)
    corr = rgb / trans
    zA = zone_a(cores, tables, feats) & ~cv2.dilate(sparkle_mask.astype(np.uint8), ell(4)).astype(bool)
    log('glow model done; zone A px', int(zA.sum()))

    # 6. zone A re-synthesis ---------------------------------------------------
    ys, xs = np.nonzero(zA)
    sy0, sy1 = max(ys.min() - 170, 0), min(ys.max() + 170, H)
    sx0, sx1 = max(xs.min() - 170, 0), min(xs.max() + 170, W)
    sw = (slice(sy0, sy1), slice(sx0, sx1))
    sub = corr[sw].copy()
    hole = zA[sw]
    alw = al[sw]
    Lb_w = Lbg[sw]
    spk = sparkle_mask[sw]
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
    t0 = time.time()
    Dn = patchmatch_complete((D / Et[..., None]).astype(np.float32), hole, src_w, P['pm_levels'], P['pm_r'],
                             P['pm_known_w'], P['pm_em'], P['pm_iters'], SEED)
    out = Dn * Et[..., None]
    log('PatchMatch done in %.1fs' % (time.time() - t0))
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

    # 7. composite: original outside the edit mask, reconstruction inside -------
    rec = corr.copy()
    rec[sw] = sub
    clean = art.copy()
    vals = np.clip(np.round(rec), 0, 255).astype(np.uint8)
    clean[..., :3][Hh] = vals[Hh]
    diff = np.abs(clean.astype(int) - art.astype(int)).max(2)
    outside = int(diff[~Hh].max()) if (~Hh).any() else 0
    assert outside == 0, 'pixels changed outside the edit mask'
    assert (clean[..., 3] == art[..., 3]).all()
    Image.fromarray(clean, 'RGBA').save(os.path.join(OUT, 'noomi-clean.png'))
    Image.fromarray((Hh * 255).astype(np.uint8), 'L').save(os.path.join(OUT, 'noomi-clean-mask.png'))
    log('clean art written; changed px', int((diff > 0).sum()), 'max |diff| outside mask', outside)

    # 8. measurements JSON ------------------------------------------------------
    write_face_json(art, clean, meas, cheeks, dimple, (ox, oy), Hh, zA, band_gains, src_path, src.shape, outside)

    # 9. height / normal maps ---------------------------------------------------
    maps = height_normal(art, clean, dimple)

    # 10. QA ------------------------------------------------------------------
    qa_images(art, clean, Hh, zA, cores, maps)
    log('done in %.1fs' % (time.time() - t_start))


# ----------------------------------------------------------------------------
# measurements
# ----------------------------------------------------------------------------
def r1(v, n=1):
    return [round(float(x), n) for x in v]


def rgbhex(c):
    c = [int(round(float(x))) for x in np.clip(c, 0, 255)]
    return '#%02x%02x%02x' % tuple(c)


def colour(c):
    return dict(rgb=[int(round(float(x))) for x in np.clip(c, 0, 255)], hex=rgbhex(c))


def write_face_json(art, clean, meas, cheeks, dimple, offset, Hh, zA, band_gains, src_path, src_shape, outside):
    al = art[..., 3]
    body = al > 127
    ys, xs = np.nonzero(body)
    bx0, bx1, by0, by1 = int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max())
    baseY = by1
    row = np.nonzero(body[baseY - 4])[0]
    sil = dict(bbox=[bx0, by0, bx1, by1], baseY=baseY,
               contactHalfWidth=round((row.max() - row.min() + 1) / 2, 1),
               contactCenterX=round((row.max() + row.min()) / 2, 1),
               centerX=round((bx0 + bx1) / 2, 1), bodyWidth=bx1 - bx0 + 1, bodyHeight=by1 - by0 + 1)
    face = {}
    LOWRES_RATIO = 36.0 / 44.0     # app rig at 439 px: closed half-width 44 <-> open radius 36
    for k, M in meas.items():
        e = dict(
            bezier=dict(p0=r1(M['p0']), c=r1(M['c']), p1=r1(M['p1'])),
            centerline16=[r1(p) for p in M['pts16']],
            capTips=[r1(M['tip0']), r1(M['tip1'])],
            length=round(M['length'], 1),
            coreWidth=round(M['width'], 1),
            fitResidualPx=dict(max=round(M['fitResidualMax'], 2), mean=round(M['fitResidualMean'], 2)),
            colors=dict(
                core=colour(M['core']), coreUpper=colour(M['coreTop']), coreLower=colour(M['coreBottom']),
                highlight=dict(color=colour(M['hl_col']), offset=round(M['hl_off'], 1), width=round(M['hl_w'], 1)),
                glow=dict(color=colour(M['glow']['fitColor']), sampledAtEdge=colour(M['glow']['sampled']),
                          alphaAtEdge=round(M['glow']['alpha0'] * 0.5 * float(erfc(-M['glow']['edgeShift'] / (M['glow']['sigma'] * np.sqrt(2)))), 3),
                          blurSigma=round(M['glow']['sigma'], 1),
                          blurRadius=round(2.5 * M['glow']['sigma'], 1),
                          reach=M['glow']['reach']),
            ),
        )
        if M['under']:
            e['colors']['underGlow'] = M['under']
        if k.startswith('eye'):
            tip0, tip1 = M['tip0'], M['tip1']
            half = float(np.linalg.norm(tip1 - tip0) / 2)
            rad = half * LOWRES_RATIO
            chord_mid = (M['p0'] + M['p1']) / 2
            e['openEyeSocket'] = dict(center=r1(chord_mid - np.array([0, 0.08 * rad])), rx=round(rad, 1),
                                      ry=round(rad, 1), closedHalfWidth=round(half, 1))
        face[k] = e
    cheek_out = {}
    for side, ck in sorted(cheeks.items()):
        p = ck['params']
        cheek_out[side] = dict(center=r1(p[:2]), radius=round(float(p[2]), 1), softness=round(float(p[3]), 1),
                               aspect=round(float(1 / p[4]), 3), angleDeg=round(float(np.degrees(p[5])), 1),
                               color=colour(ck['color']), sparkles=ck['sparkles'])
    doc = {
        '_about': ('Measurements of the owner-approved high-resolution Noomi (hushmallow commit 71780dc) in the '
                   'pixel space of noomi-art.png / noomi-clean.png. Coordinates are [x, y] in pixels, origin '
                   'top-left, y down. Generated by tools/derive_noomi_hires.py (deterministic).'),
        'source': dict(file=os.path.relpath(src_path, STUDIO), size=[int(src_shape[1]), int(src_shape[0])],
                       cropOffset=list(offset), artSize=[int(art.shape[1]), int(art.shape[0])],
                       note='source pixel = art pixel + cropOffset. Crop = bbox of alpha >= 2 plus 24 px '
                            'padding (alpha == 1 is a scattered, invisible noise floor in the source).'),
        'fields': {
            'bezier': 'quadratic Bezier {p0, c, p1} least-squares fitted to the stroke skeleton (Zhang-Suen); p0/p1 are the centreline ends (centres of the round caps).',
            'centerline16': '16 points sampled at equal arc length along the Bezier centreline, p0 -> p1.',
            'capTips': 'p0/p1 extended by half the core width along the end tangents = the visible tips of the stroke.',
            'length': 'arc length of the centreline (px).',
            'coreWidth': 'full width of the navy stroke (2 x median inscribed radius along the skeleton, 50 % edge).',
            'fitResidualPx': 'distance of skeleton pixels to the fitted Bezier.',
            'colors.core': 'median navy of the stroke interior (highlight excluded).',
            'colors.coreUpper/coreLower': 'stroke colour 7 px inside the upper (concave) / lower (convex) edge: the stroke is lighter at the top and darker at the bottom.',
            'colors.highlight': 'thin glossy line inside the stroke: colour at its peak, offset of its centre from the centreline (px, + = toward the upper/concave side), full width at half maximum (px).',
            'colors.glow': 'dark-blue outer glow: color = fitted normal-blend glow colour; sampledAtEdge = actual art colour 1-3 px outside the stroke; alphaAtEdge = fitted glow opacity at the stroke edge; blurSigma = Gaussian sigma of the glow falloff (alpha ~ erfc profile); blurRadius = 2.5 sigma; reach = distance where the measured glow opacity drops below 2 %.',
            'colors.underGlow': 'light (white) glow under the stroke on the convex side: peakOffset = distance of its brightest point from the stroke edge, peakGain = luminance gain at the peak, extent = distance where the gain drops below 0.5 %.',
            'openEyeSocket': 'recommended open-eye ellipse: radii = closed half-width (half the tip-to-tip span) x 36/44 (the ratio the 439 px app rig used), centre = midpoint of the p0-p1 chord moved up by 8 % of the radius.',
            'cheeks': 'pink blush discs fitted as 0.5*erfc((r - radius)/softness) ellipses on (R - G): center, radius (50 % level), softness (sigma, px), aspect (minor/major), angleDeg, color = median colour of the inner disc, sparkles = centres/radii of the white glints.',
            'topDimple': 'center = darkest point of the dimple at the top of the body; centroid/bbox of its dark navy core.',
            'silhouette': 'bbox [x0, y0, x1, y1] of alpha > 127 (inclusive); baseY = lowest row with alpha > 0.5; contactHalfWidth = half the opaque run width at row baseY-4 (contactCenterX its centre); centerX = bbox centre; bodyWidth/bodyHeight = bbox size.',
            'edit': 'face-line removal summary, see tools/derive_noomi_hires.py.',
            'heightNormalMaps': 'how noomi-height.png / noomi-normal.png were built.',
        },
        'eyeL': face['eyeL'], 'eyeR': face['eyeR'], 'mouth': face['mouth'],
        'cheeks': cheek_out,
        'topDimple': {kk: (r1(vv) if isinstance(vv, list) and kk != 'bbox' else vv) for kk, vv in (dimple or {}).items()},
        'silhouette': sil,
        'edit': dict(
            maskFile='noomi-clean-mask.png', maskRadiusPx=HALO_R, editPixels=int(Hh.sum()),
            resynthesizedPixels=int(zA.sum()),
            maxAbsDiffOutsideMask=int(outside),
            method='zone A (stroke + strong glow) re-synthesised from the body texture (thin-plate shading + PatchMatch detail + multi-band energy equalisation + seamless boundary); 16 px low-frequency cross-fade band; glow tail un-blended with a measured per-channel transmission map.',
            params={k: (list(v) if isinstance(v, tuple) else v) for k, v in P.items()},
            bandGainPercentiles5_50_95=band_gains,
        ),
    }
    with open(os.path.join(OUT, 'noomi-face.json'), 'w') as f:
        json.dump(doc, f, indent=1)
    return doc


# ----------------------------------------------------------------------------
# height / normal maps
# ----------------------------------------------------------------------------
HN = dict(
    bevel_frac=0.18,      # bevel radius of the rounded-cube profile, x min(bodyW, bodyH)
    front_bulge=0.08,     # extra gentle dome on the front face, x bevel radius
    dimple_depth=0.22,    # top dimple depression depth, x bevel radius
    dimple_radius=70.0,   # px
    detail_amp=1.3,       # px of height per robust sigma of the luminance band-pass
    detail_band=(1.5, 12.0),
    detail_clip=2.5,      # soft clip (tanh) in robust sigmas
    edge_fade=10.0,       # px: detail fades in from the silhouette
    specular_weight=0.25, # detail weight on glossy specular streaks
)


def height_normal(art, clean, dimple):
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
    Image.fromarray(h16).save(os.path.join(OUT, 'noomi-height.png'))
    # normals (OpenGL: +X right, +Y up, +Z toward the viewer)
    gx = cv2.Sobel(h, cv2.CV_64F, 1, 0, ksize=3) / 8
    gy = cv2.Sobel(h, cv2.CV_64F, 0, 1, ksize=3) / 8
    n = np.stack([-gx, gy, np.ones_like(h)], 2)
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    n[body == 0] = [0, 0, 1]
    nrm8 = np.round((n * 0.5 + 0.5) * 255).astype(np.uint8)
    Image.fromarray(nrm8, 'RGB').save(os.path.join(OUT, 'noomi-normal.png'))
    info = dict(heightScalePx=round(hmax, 2), bevelRadiusPx=round(float(Rb), 1), **{k: (list(v) if isinstance(v, tuple) else v) for k, v in HN.items()},
                detailRobustSigmaLuma=round(float(s), 3))
    # add documentation of the maps to the face JSON
    pth = os.path.join(OUT, 'noomi-face.json')
    doc = json.load(open(pth))
    doc['heightNormalMaps'] = dict(
        heightFile='noomi-height.png (16-bit gray; value/65535 * heightScalePx = height in px)',
        normalFile='noomi-normal.png (8-bit RGB tangent space, OpenGL convention: R=+X right, G=+Y up, B=+Z out; flat = 128,128,255)',
        recipe='h = bevel + frontBulge + dimple + detail; bevel = Rb*sqrt(1-(1-t)^2), t = clamp(d/Rb) with d = Gaussian(6)-softened distance to the alpha>0.5 silhouette; frontBulge = front_bulge*Rb*(1-rho^2)*t^2 (rho = elliptical radius over the body bbox); dimple = -dimple_depth*Rb*Gaussian(dimple_radius) at topDimple.center; detail = detail_amp*detail_clip*tanh(bp/(sigma*detail_clip)) with bp = luminance band-pass (sigma 1.5..12 px) of noomi-clean.png, faded over edge_fade px at the rim and down-weighted on specular streaks. Normals from Sobel gradients of h (px units).',
        **info)
    with open(pth, 'w') as f:
        json.dump(doc, f, indent=1)
    return dict(h=h, n=n, body=body)


# ----------------------------------------------------------------------------
# QA images
# ----------------------------------------------------------------------------
def _on_bg(rgba, bg=(38, 42, 56)):
    a = rgba[..., 3:4].astype(np.float64) / 255
    return np.round(rgba[..., :3] * a + np.array(bg) * (1 - a)).astype(np.uint8)


def _label(img, text, org=(10, 26), scale=0.7):
    img = np.ascontiguousarray(img)
    (tw, th), bl = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, scale, 1)
    x, y = org
    y0, y1 = max(y - th - 6, 0), min(y + bl + 4, img.shape[0])
    x0, x1 = max(x - 6, 0), min(x + tw + 6, img.shape[1])
    img[y0:y1, x0:x1] = (img[y0:y1, x0:x1] * 0.35).astype(np.uint8)
    cv2.putText(img, text, org, cv2.FONT_HERSHEY_SIMPLEX, scale, (255, 255, 255), 1, cv2.LINE_AA)
    return img


def qa_images(art, clean, Hh, zA, cores, maps):
    A, B = _on_bg(art), _on_bg(clean)
    gap = lambda h: np.full((h, 8, 3), 255, np.uint8)
    stats = {}
    for k, m in cores.items():
        ys, xs = np.nonzero(Hh & (cv2.distanceTransform(1 - m, cv2.DIST_L2, 5) <= HALO_R))
        y0, y1, x0, x1 = ys.min() - 8, ys.max() + 9, xs.min() - 8, xs.max() + 9
        a, b = A[y0:y1, x0:x1], B[y0:y1, x0:x1]
        Image.fromarray(np.hstack([_label(a.copy(), 'approved art 1:1'), gap(a.shape[0]), _label(b.copy(), 'clean 1:1')])).save(
            os.path.join(QA, f'qa-{k}-1x.png'))
        # 2:1 of the central part of the stroke region (Lanczos)
        cy, cx = (y0 + y1) // 2, (x0 + x1) // 2
        hh, ww = 75, 120
        a2 = np.array(Image.fromarray(A[cy - hh:cy + hh, cx - ww:cx + ww]).resize((4 * ww, 4 * hh), Image.LANCZOS))
        b2 = np.array(Image.fromarray(B[cy - hh:cy + hh, cx - ww:cx + ww]).resize((4 * ww, 4 * hh), Image.LANCZOS))
        Image.fromarray(np.hstack([_label(a2, 'approved art 2:1'), gap(a2.shape[0]), _label(b2, 'clean 2:1')])).save(
            os.path.join(QA, f'qa-{k}-2x.png'))
        # nearest-neighbour 2:1 of the clean result alone (pixel-honest)
        Image.fromarray(B[cy - hh:cy + hh, cx - ww:cx + ww]).resize((4 * ww, 4 * hh), Image.NEAREST).save(
            os.path.join(QA, f'qa-{k}-2x-nearest-clean.png'))
    Image.fromarray(np.hstack([_label(A.copy(), 'approved art (noomi-art.png)'), gap(A.shape[0]),
                               _label(B.copy(), 'face lines removed (noomi-clean.png)')])).save(os.path.join(QA, 'qa-fullbody-before-after.png'))
    # contrast-boosted face (x2.5 around a 40 px local mean) to expose any ghost
    def boost(img):
        f = img.astype(np.float64)
        m = cv2.GaussianBlur(f, (0, 0), 40)
        return np.clip(m + (f - m) * 2.5, 0, 255).astype(np.uint8)
    ys, xs = np.nonzero(Hh)
    fy0, fy1, fx0, fx1 = ys.min() - 30, ys.max() + 30, xs.min() - 30, xs.max() + 30
    Image.fromarray(np.vstack([_label(boost(A)[fy0:fy1, fx0:fx1], 'approved art, contrast x2.5'),
                               np.full((8, fx1 - fx0, 3), 255, np.uint8),
                               _label(boost(B)[fy0:fy1, fx0:fx1], 'clean, contrast x2.5')])).save(os.path.join(QA, 'qa-face-contrast-boost.png'))
    # difference outside the mask: must be exactly zero
    diff = np.abs(clean.astype(int) - art.astype(int)).max(2)
    out_max = int(diff[~Hh].max())
    vis = np.clip(diff * 8, 0, 255).astype(np.uint8)
    vis = cv2.cvtColor(vis, cv2.COLOR_GRAY2RGB)
    vis[(~Hh) & (diff > 0)] = [255, 0, 0]          # (would be red if anything changed outside)
    cnt, _ = cv2.findContours(Hh.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    cv2.drawContours(vis, cnt, -1, (0, 200, 255), 1)
    cnt, _ = cv2.findContours(zA.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    cv2.drawContours(vis, cnt, -1, (255, 200, 0), 1)
    vis = _label(vis, f'|clean - art| x8   max abs diff OUTSIDE mask = {out_max}   (pixels outside: {int((~Hh).sum())})')
    vis = _label(vis, 'cyan = edit mask (noomi-clean-mask.png), yellow = re-synthesised zone A, inside the rest: glow un-blended', (10, 54), 0.55)
    Image.fromarray(vis).save(os.path.join(QA, 'qa-diff-outside-mask.png'))
    # Lambert preview from a top-right light
    n, body = maps['n'], maps['body']
    L = np.array([0.55, 0.55, 0.63]); L /= np.linalg.norm(L)
    lam = np.clip((n * L).sum(2), 0, 1)
    shade = 0.12 + 0.88 * lam
    al = art[..., 3:4].astype(np.float64) / 255
    clay = np.array([228, 232, 240.]) * shade[..., None]
    prev = np.round(clay * al + np.array([38, 42, 56.]) * (1 - al)).astype(np.uint8)
    alb = clean[..., :3].astype(np.float64) * (0.35 + 0.75 * lam[..., None])
    prev2 = np.round(np.clip(alb, 0, 255) * al + np.array([38, 42, 56.]) * (1 - al)).astype(np.uint8)
    nm = np.array(Image.open(os.path.join(OUT, 'noomi-normal.png')))
    Image.fromarray(np.hstack([_label(prev, 'normal map, Lambert, light top-right'), gap(prev.shape[0]),
                               _label(nm.copy(), 'noomi-normal.png'), gap(prev.shape[0]),
                               _label(prev2, 'clean art x Lambert')])).save(os.path.join(QA, 'qa-normal-lambert.png'))
    stats.update(maxAbsDiffOutsideMask=out_max, changedPixels=int((diff > 0).sum()), editMaskPixels=int(Hh.sum()),
                 resynthesizedPixels=int(zA.sum()), alphaIdentical=bool((clean[..., 3] == art[..., 3]).all()),
                 maxAbsDiffInsideMask=int(diff[Hh].max()))
    with open(os.path.join(QA, 'qa-stats.json'), 'w') as f:
        json.dump(stats, f, indent=1)


if __name__ == '__main__':
    main()
