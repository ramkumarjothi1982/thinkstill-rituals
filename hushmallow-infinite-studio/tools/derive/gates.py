"""The shared asset gates: one function per gate, each returning
{value, threshold, verdict}, run together by run_gates() into asset-gates.json.

Verdicts: pass | warn (outside the threshold but not distinguishable from
sampling noise: reported, never a failure) | fail | n/a (the gate's input does
not exist, e.g. no glints, no cheek model, a clipped channel). The statistical
gates (band_energy, ghost, lighting_sweep, cross_profiles) estimate their own
noise: a block bootstrap, displaced feature templates, or the spread between
stretches of a stroke; see each function. Thresholds come from
docs/PHASE2-PLAN.md and docs/design/map-asset-*.md (GATES below); a config's
"qa" section overrides them and lists the gates it enforces.
"""
import json
import os

import numpy as np
import cv2
from PIL import Image

from . import metrics, paths
from .qa_draw import _label


GATES = {
    'integrity': dict(max_outside=0),
    'transparent_rgb': dict(alpha_below=2, max_pixels=0),
    'band_energy': dict(lo=0.85, hi=1.15, bands=[[1, 2], [2, 4], [4, 8], [8, 16]], clip_lo=12, clip_hi=245),
    'repeat_patch': dict(max_ncc=0.95, patch=24, stride=12, band=[1, 8]),
    'ghost': dict(max_abs_r=0.05, bands=[[1.5, 4], [4, 12], [12, 32]]),
    'lighting_sweep': dict(max_abs_r=0.05, elevation_deg=35, directions=8, bands=[[1.5, 4], [4, 12]]),
    'cheek_refit': dict(max_center_px=1.0, max_radius_px=1.0, max_radius_rel=None),
    'residue': dict(max_abs=3.0, channels=['R', 'G', 'B']),
    'boundary_step': dict(max_abs=2.0, sigma=6),
    'colour_match': dict(max_mean=2.0),
    'cross_profiles': dict(max_dev=1.5, reach=60),
    'texture_period': dict(max_rel=0.15, band=[1.5, 12], max_lag=48),
    'glint_density': dict(max_rel=0.25, min_expected=3),
    'reproducibility': dict(),
}
RING_PX = 48            # reference skin: untouched pixels within this distance of the edit mask
NULL_ANGLES = 12        # displaced copies of each feature template (ghost null distribution)
NULL_Z = 3.5            # a ghost correlation fails at >= 3.5 x the displaced templates' RMS
CH = ('R', 'G', 'B')
# Verdicts: pass | warn (outside the threshold but not distinguishable from sampling
# noise: reported, never fails) | fail | n/a (the gate's input does not exist).


def resolve_gates(qa_cfg):
    """GATES with the config's qa.gates overrides; plus the enforced gate names
    (qa.enforce, default: every gate)."""
    qa_cfg = qa_cfg or {}
    unknown = sorted(set(qa_cfg) - {'_about', 'enforce', 'gates', 'stretch'})
    if unknown:
        raise ValueError(f'unknown key(s) in the config\'s "qa" section: {", ".join(unknown)}')
    over = qa_cfg.get('gates') or {}
    bad = sorted(set(over) - set(GATES))
    if bad:
        raise ValueError(f'unknown asset gate(s) in qa.gates: {", ".join(bad)}')
    th = {}
    for name, base in GATES.items():
        o = over.get(name) or {}
        unknown = sorted(set(o) - set(base))
        if unknown:
            raise ValueError(f'qa.gates.{name}: unknown key(s) {", ".join(unknown)}')
        th[name] = {**base, **o}
    enforce = qa_cfg.get('enforce', list(GATES))
    bad = sorted(set(enforce) - set(GATES))
    if bad:
        raise ValueError(f'unknown asset gate(s) in qa.enforce: {", ".join(bad)}')
    return th, list(enforce)


def _r(x, n=4):
    """JSON-safe rounding (nan/inf become None)."""
    if x is None:
        return None
    if isinstance(x, (list, tuple)):
        return [_r(v, n) for v in x]
    x = float(x)
    return round(x, n) if np.isfinite(x) else None


def _verdict(ok, applicable=True):
    return 'n/a' if not applicable else ('pass' if ok else 'fail')


def _worst(verdicts):
    order = ('fail', 'warn', 'pass')
    for v in order:
        if v in verdicts:
            return v
    return 'n/a'


class GateInput:
    """The arrays the gates read, all in art pixel space.

    Regions: zone A (re-synthesised) and zone B (glow un-blended) inside the
    edit mask; the reference ring is untouched skin within RING_PX of it. All
    three leave out what is not plain skin: the finder's protected pixels
    (sparkles), its cheek discs and every pixel where a fitted cheek model
    exceeds 0.2 %, specular streaks and the top dimple."""

    def __init__(self, cfg, fin, art, clean, Hh, zA, features, normal8, face_doc):
        self.cfg, self.fin, self.art, self.clean = cfg, fin, art, clean
        self.Hh, self.zA, self.features = Hh, zA, features
        self.cores = features.cores
        self.coreU = np.maximum.reduce(list(self.cores.values()))
        self.face = face_doc or {}
        rgb = clean[..., :3].astype(np.float64)
        self.rgb, self.rgb_art = rgb, art[..., :3].astype(np.float64)
        self.Y, self.Y_art = metrics.luma(rgb), metrics.luma(self.rgb_art)
        shape = Hh.shape
        protect = features.protect if features.protect is not None else np.zeros(shape, bool)
        excl = features.excl if features.excl is not None else np.zeros(shape, bool)
        other = cv2.dilate((self.Y_art > 235).astype(np.uint8), np.ones((15, 15), np.uint8)).astype(bool)
        for ck in (features.cheeks or {}).values():               # the whole fitted blush, tails included
            if isinstance(ck, dict) and ck.get('C') is not None:
                other |= ck['C'] > 0.002
        if features.dimple and features.dimple.get('bbox'):
            x0, y0, x1, y1 = features.dimple['bbox']
            other[max(y0 - 12, 0):y1 + 13, max(x0 - 12, 0):x1 + 13] = True
        self.protect, self.excl = protect, excl | other
        self.body = art[..., 3] > 240
        self.w = (self.body & ~protect).astype(np.float64)          # blur weights
        keep = self.body & ~protect & ~self.excl
        self.keep = keep
        self.zoneA = zA & keep
        self.zoneB = Hh & ~zA & keep
        self.ring = ~Hh & keep & (metrics.dist_outside(Hh) <= RING_PX)
        self.known = self.body & ~Hh & ~protect & ~self.excl        # surround data: skin only
        n = normal8.astype(np.float64) / 255 * 2 - 1                 # what the engine samples
        self.n = n / np.maximum(np.linalg.norm(n, axis=2, keepdims=True), 1e-9)
        self.win = metrics.bbox(Hh, 80)                              # work window around the face
        self._expected = None

    def expected(self):
        """Smooth surround: the 4 px low-pass of the untouched skin around the
        edit mask, filled across it (and across cheeks, sparkles and other
        non-skin pixels) by a membrane (harmonic) interpolation."""
        if self._expected is None:
            from .common import laplace_fill
            win = self.win
            lp = metrics.masked_blur(self.rgb[win], self.known[win], 4)
            exp = np.zeros_like(self.rgb)
            exp[win] = laplace_fill(lp, ~self.known[win], biharm=False)
            self._expected = exp
        return self._expected


def gate_integrity(g, th):
    diff = np.abs(g.clean.astype(int) - g.art.astype(int)).max(2)
    outside = int(diff[~g.Hh].max()) if (~g.Hh).any() else 0
    alpha = bool((g.clean[..., 3] == g.art[..., 3]).all())
    return dict(value=dict(maxAbsDiffOutsideMask=outside, alphaIdentical=alpha, changedPixels=int((diff > 0).sum()),
                           editMaskPixels=int(g.Hh.sum()), resynthesizedPixels=int(g.zA.sum())),
                threshold=dict(maxAbsDiffOutsideMask=th['max_outside'], alphaIdentical=True),
                verdict=_verdict(outside <= th['max_outside'] and alpha))


def gate_transparent_rgb(g, th):
    lim = th['alpha_below']
    cnt = lambda img: int(((img[..., 3] < lim) & (img[..., :3].max(2) > 0)).sum())
    c_clean, c_art = cnt(g.clean), cnt(g.art)
    return dict(value=dict(cleanPixels=c_clean, artPixels=c_art), threshold=dict(maxPixels=th['max_pixels']),
                verdict=_verdict(c_clean <= th['max_pixels']))


def gate_band_energy(g, th):
    """Texture energy (RMS of each difference-of-Gaussians band) in zone A and
    zone B over the reference ring, per channel. A ratio outside [lo, hi] fails
    only when its 95 % block-bootstrap interval is outside too; otherwise it warns."""
    win = g.win
    w = g.w[win]
    ring = g.ring[win]
    chans = dict(R=g.rgb[win][..., 0], G=g.rgb[win][..., 1], B=g.rgb[win][..., 2], Y=g.Y[win])
    clipped = {c: not (th['clip_lo'] <= float(np.median(x[ring])) <= th['clip_hi']) for c, x in chans.items()}
    out, verdicts, worst = {}, [], None
    for zname, zm in (('zoneA', g.zoneA[win]), ('zoneB', g.zoneB[win])):
        if zm.sum() < 500 or ring.sum() < 500:
            out[zname] = None
            continue
        tab = {}
        for s0, s1 in th['bands']:
            row = {}
            for c, x in chans.items():
                if clipped[c]:
                    row[c] = None
                    continue
                b = metrics.band(x, w, s0, s1)
                ratio, lo, hi = metrics.energy_ratio_ci(b, zm, ring, block=max(16, int(4 * s1)))
                if th['lo'] <= ratio <= th['hi']:
                    v = 'pass'
                elif hi < th['lo'] or lo > th['hi']:
                    v = 'fail'
                else:
                    v = 'warn'
                verdicts.append(v)
                row[c] = dict(ratio=_r(ratio, 3), ci95=[_r(lo, 3), _r(hi, 3)], verdict=v)
                dev = abs(ratio - 1)
                if worst is None or dev > worst[0]:
                    worst = (dev, zname, f'{s0}-{s1}', c, ratio, v)
            tab[f'{s0}-{s1}'] = row
        out[zname] = tab
    return dict(value=dict(ratios=out, clippedChannels=[c for c, v in clipped.items() if v],
                           worst=dict(zone=worst[1], band=worst[2], channel=worst[3], ratio=_r(worst[4], 3), verdict=worst[5])
                           if worst else None),
                threshold=dict(lo=th['lo'], hi=th['hi'], failsWhen='the 95 % interval lies outside [lo, hi]'),
                verdict=_worst(verdicts))


def gate_repeat_patch(g, th):
    win = metrics.bbox(g.Hh, 200)
    s0, s1 = th['band']
    detail = metrics.band(g.Y[win], g.w[win], s0, s1)
    src = g.body[win] & ~g.Hh[win] & ~g.protect[win]
    res = metrics.repeat_patch(detail, g.zoneA[win], src, patch=th['patch'], stride=th['stride'])
    if res['worst'] is not None:
        res['worst'] = [res['worst'][0] + win[0].start, res['worst'][1] + win[1].start]
    over = int(sum(v > th['max_ncc'] for v in res['values']))
    return dict(value=dict(maxNcc=_r(res['max']), p99Ncc=_r(res['p99']), patches=res['n'], over=over,
                           worstPatchTopLeftYX=res['worst']),
                threshold=dict(maxNcc=th['max_ncc'], patch=th['patch']),
                verdict=_verdict(res['n'] > 0 and res['max'] <= th['max_ncc'], res['n'] > 0))


def _ghost_scan(g, images, bands):
    """Correlation of each band of each image with the same band of each
    feature's core mask, over that feature's halo (skin only), plus a null
    distribution: the same correlation with the template and its halo displaced
    by 2 halo radii in NULL_ANGLES directions, where no ghost can be. Returns
    {image: {feature: {band: (r, [|r_null|, ...])}}}."""
    win = metrics.bbox(g.Hh, 2 * g.cfg.halo_r + 80)
    w = g.w[win].astype(np.float32)
    keep = g.keep[win]
    D = 2 * g.cfg.halo_r
    offsets = [(0, 0)] + [(int(round(D * np.sin(a))), int(round(D * np.cos(a))))
                          for a in np.linspace(0, 2 * np.pi, NULL_ANGLES, endpoint=False)]
    ib = {name: {(s0, s1): metrics.band(img[win].astype(np.float32), w, s0, s1) for s0, s1 in bands}
          for name, img in images.items()}
    out = {name: {} for name in images}
    for k, m in g.cores.items():
        mk = m[win] > 0
        region = keep & (metrics.dist_outside(mk) <= g.cfg.halo_r)
        n0 = int(region.sum())
        res = {name: {b: [None, []] for b in bands} for name in images}
        for dy, dx in offsets:
            mm = metrics.shift_mask(mk, dy, dx)
            rr = metrics.shift_mask(region, dy, dx) & keep
            if (dy, dx) != (0, 0) and rr.sum() < 0.6 * n0:
                continue                                   # displaced off the body
            for s0, s1 in bands:
                tb = metrics.band(mm.astype(np.float32), w, s0, s1)
                for name in images:
                    r = metrics.pearson(ib[name][(s0, s1)], tb, rr)
                    if (dy, dx) == (0, 0):
                        res[name][(s0, s1)][0] = r
                    elif np.isfinite(r):
                        res[name][(s0, s1)][1].append(abs(r))
        for name in images:
            out[name][k] = res[name]
    return out


def _ghost_verdicts(scan, max_abs_r, z_fail=NULL_Z):
    """Table, worst |r| and verdict of one image's scan. |r| < max_abs_r passes.
    Above it, the correlation fails when it is also significant against the
    displaced templates, |r| >= z_fail x their RMS (chance correlations of the
    skin texture with a stroke shape), and warns otherwise. Without enough
    displaced templates (a face filling the body) it fails."""
    tab, verdicts, worst = {}, [], (0.0, None)
    for k, per in scan.items():
        row = {}
        for (s0, s1), (r, null) in per.items():
            rms = float(np.sqrt(np.mean(np.square(null)))) if len(null) >= 4 else float('nan')
            if r is None or not np.isfinite(r):
                v = 'n/a'
            elif abs(r) < max_abs_r:
                v = 'pass'
            elif np.isfinite(rms) and abs(r) < z_fail * rms:
                v = 'warn'
            else:
                v = 'fail'
            verdicts.append(v)
            row[f'{s0}-{s1}'] = dict(r=_r(r), nullRms=_r(rms), nullN=len(null), verdict=v)
            if r is not None and np.isfinite(r) and abs(r) > worst[0]:
                worst = (abs(r), f'{k} {s0}-{s1}')
        tab[k] = row
    return tab, worst, _worst(verdicts)


def gate_ghost(g, th):
    scan = _ghost_scan(g, dict(clean=g.Y, art=g.Y_art), [tuple(b) for b in th['bands']])
    tab, worst, verdict = _ghost_verdicts(scan['clean'], th['max_abs_r'])
    art_tab, art_worst, _ = _ghost_verdicts(scan['art'], th['max_abs_r'])
    return dict(value=dict(maxAbsR=_r(worst[0]), at=worst[1], clean=tab,
                           artReference=dict(maxAbsR=_r(art_worst[0]), at=art_worst[1])),
                threshold=dict(maxAbsR=th['max_abs_r'], failsWhen=f'|r| is also >= {NULL_Z} x the RMS r of displaced templates'),
                verdict=verdict)


def _sweep_lights(th):
    el = np.radians(th['elevation_deg'])
    for i in range(th['directions']):
        az = 360.0 * i / th['directions']
        a = np.radians(az)
        yield az, np.array([np.cos(el) * np.cos(a), np.cos(el) * np.sin(a), np.sin(el)])


def gate_lighting_sweep(g, th, qa_dir=None):
    """The ghost test on the normal map lit from `directions` azimuths: a height
    or normal map that still carries the old face only shows under moving light."""
    shades = {f'{az:g}': np.clip((g.n * L).sum(2), 0, 1) * 255.0 for az, L in _sweep_lights(th)}
    scan = _ghost_scan(g, shades, [tuple(b) for b in th['bands']])
    per, verdicts, worst = {}, [], (0.0, None)
    for az, s in scan.items():
        tab, wv, v = _ghost_verdicts(s, th['max_abs_r'])
        per[az] = dict(maxAbsR=_r(wv[0]), at=wv[1], verdict=v)
        verdicts.append(v)
        if wv[0] > worst[0]:
            worst = (wv[0], f'azimuth {az}: {wv[1]}')
    if qa_dir:
        _sweep_sheet(g, [(float(az), s) for az, s in shades.items()], os.path.join(qa_dir, 'qa-lighting-sweep.png'))
    return dict(value=dict(maxAbsR=_r(worst[0]), at=worst[1], byAzimuthDeg=per),
                threshold=dict(maxAbsR=th['max_abs_r'], elevationDeg=th['elevation_deg']),
                verdict=_worst(verdicts))


def gate_cheek_refit(g, th):
    if not hasattr(g.fin, 'refit_cheeks') or not g.features.cheeks:
        return dict(value=None, threshold=None, verdict='n/a', note='this family has no cheek model')
    refit = g.fin.refit_cheeks(g.clean, g.coreU, g.cfg)
    sides, ok = {}, True
    for side, ck in sorted(g.features.cheeks.items()):
        p0 = ck['params']
        if side not in refit:
            sides[side] = dict(found=False)
            ok = False
            continue
        p1 = refit[side]['params']
        dc = float(np.hypot(p1[0] - p0[0], p1[1] - p0[1]))
        dr = float(abs(p1[2] - p0[2]))
        sp0, sp1 = ck['sparkles'], refit[side]['sparkles']
        sides[side] = dict(found=True, centerShiftPx=_r(dc, 3), radiusChangePx=_r(dr, 3),
                           radiusChangeRel=_r(dr / max(abs(p0[2]), 1e-9), 4),
                           softnessChangePx=_r(abs(p1[3] - p0[3]), 3),
                           sparklesArt=len(sp0), sparklesClean=len(sp1))
        ok &= dc <= th['max_center_px'] and dr <= th['max_radius_px'] and len(sp0) == len(sp1)
        if th['max_radius_rel'] is not None:
            ok &= dr / max(abs(p0[2]), 1e-9) <= th['max_radius_rel']
    return dict(value=sides, threshold=dict(maxCenterPx=th['max_center_px'], maxRadiusPx=th['max_radius_px'],
                                            maxRadiusRel=th['max_radius_rel'], sparkles='all present'),
                verdict=_verdict(ok))


def gate_residue(g, th):
    exp = g.expected()
    d = g.rgb - exp
    out, ok, worst = {}, True, 0.0
    for zname, zm in (('zoneA', g.zoneA), ('zoneB', g.zoneB)):
        if zm.sum() < 100:
            out[zname] = None
            continue
        row = {}
        for i, c in enumerate(CH):
            v = float(d[..., i][zm].mean())
            row[c] = _r(v, 2)
            if c in th['channels']:
                ok &= abs(v) <= th['max_abs']
                worst = max(worst, abs(v))
        out[zname] = row
    return dict(value=dict(meanMinusSurround=out, worstAbs=_r(worst, 2)),
                threshold=dict(maxAbs=th['max_abs'], channels=th['channels']), verdict=_verdict(ok))


def _side_step(g, A, B, sigma):
    """Median signed and p95 absolute low-pass step (A side minus B side) at
    the A/B boundary, per channel. Each side's low-pass is a local-linear fit of
    that side alone, so a smooth shading gradient across the boundary gives no step."""
    from .common import loclin_lowpass
    win = g.win
    a, b = A[win], B[win]
    la = loclin_lowpass(g.rgb[win], (a & g.body[win] & ~g.protect[win]).astype(np.float64), sigma)
    lb = loclin_lowpass(g.rgb[win], (b & g.body[win] & ~g.protect[win]).astype(np.float64), sigma)
    k = np.ones((5, 5), np.uint8)
    edge = ((a & cv2.dilate(b.astype(np.uint8), k).astype(bool)) | (b & cv2.dilate(a.astype(np.uint8), k).astype(bool)))
    edge &= g.body[win] & ~g.protect[win] & ~g.excl[win]
    if edge.sum() < 50:
        return None
    s = (la - lb)[edge]
    return dict(medianSigned={c: _r(float(np.median(s[:, i])), 2) for i, c in enumerate(CH)},
                p95Abs={c: _r(float(np.percentile(np.abs(s[:, i]), 95)), 2) for i, c in enumerate(CH)},
                pixels=int(edge.sum()))


def gate_boundary_step(g, th):
    res = dict(editMask=_side_step(g, g.Hh, ~g.Hh, th['sigma']),
               zoneA=_side_step(g, g.zA, g.Hh & ~g.zA, th['sigma']))
    vals = [abs(v) for r in res.values() if r for v in r['medianSigned'].values() if v is not None]
    worst = max(vals) if vals else None
    return dict(value=dict(**res, worstAbsMedian=worst), threshold=dict(maxAbsMedian=th['max_abs'], sigma=th['sigma']),
                verdict=_verdict(worst is not None and worst <= th['max_abs'], worst is not None))


def gate_colour_match(g, th):
    exp = g.expected()
    region = (g.zoneA | g.zoneB)
    win = g.win
    lp = metrics.masked_blur(g.rgb[win], g.w[win], 4)
    de = metrics.delta_e2000(metrics.srgb_to_lab(lp[region[win]]), metrics.srgb_to_lab(exp[win][region[win]]))
    if de.size == 0:
        return dict(value=None, threshold=dict(maxMean=th['max_mean']), verdict='n/a')
    return dict(value=dict(meanDE2000=_r(de.mean(), 3), p95DE2000=_r(np.percentile(de, 95), 3),
                           p99DE2000=_r(np.percentile(de, 99), 3), pixels=int(de.size)),
                threshold=dict(maxMean=th['max_mean']), verdict=_verdict(de.mean() < th['max_mean']))


def _profiles(img_list, bez, reach, valid, bin_px=2, segments=6, t_range=(0.2, 0.8)):
    """Cross-stroke profiles by signed distance to the stroke centreline.

    Every valid pixel within `reach` of the central part of the centreline
    (t in t_range) is binned by its signed distance (+ = away from the Bezier
    control point) and by which of `segments` equal stretches of the stroke it
    is nearest to. Per stretch and bin: the median (a cheek met by one stretch
    does not leak into the others); per bin: the mean over stretches and its
    standard error from their spread (stretches share no pixels, so the error
    is honest even where texture is coarse). Returns (bin centres, [(profile,
    stderr) per image]) for bins seen by at least 4 stretches."""
    from scipy.spatial import cKDTree
    from .common import bez as bezier, bez_tan
    p0, c, p1 = (np.array(bez[k], np.float64) for k in ('p0', 'c', 'p1'))
    tt = np.linspace(0, 1, 2001)
    curve = bezier(p0, c, p1, tt)
    H, W = valid.shape
    x0, y0 = np.floor(curve.min(0) - reach - 2).astype(int)
    x1, y1 = np.ceil(curve.max(0) + reach + 3).astype(int)
    x0, y0, x1, y1 = max(x0, 0), max(y0, 0), min(x1, W), min(y1, H)
    yy, xx = np.mgrid[y0:y1, x0:x1]
    pts = np.stack([xx.ravel(), yy.ravel()], 1).astype(np.float64)
    dist, j = cKDTree(curve).query(pts)
    t = tt[j]
    tan = bez_tan(p0, c, p1, t)
    rel = pts - curve[j]
    side = np.sign(tan[:, 0] * rel[:, 1] - tan[:, 1] * rel[:, 0])
    mid, tm = bezier(p0, c, p1, [0.5])[0], bez_tan(p0, c, p1, [0.5])[0]
    away = -np.sign(tm[0] * (c - mid)[1] - tm[1] * (c - mid)[0])      # sign of the side away from c
    d = side * away * dist
    # on the concave side (+) the normals converge at the centre of curvature,
    # where "nearest stretch" stops meaning anything: stop at half the radius
    b1 = p1 - p0                                          # B'(0.5) of the quadratic Bezier
    b2 = 2 * (p0 - 2 * c + p1)
    radius = float(np.linalg.norm(b1) ** 3 / max(abs(b1[0] * b2[1] - b1[1] * b2[0]), 1e-9))
    reach_pos = min(reach, 0.5 * radius)
    sel = (valid[y0:y1, x0:x1].ravel() & (t >= t_range[0]) & (t <= t_range[1]) & (d >= -reach) & (d <= reach_pos))
    nb = int(np.ceil(2 * reach / bin_px))
    bi = np.clip(((d[sel] + reach) / bin_px).astype(int), 0, nb - 1)
    si = np.clip(((t[sel] - t_range[0]) / (t_range[1] - t_range[0]) * segments).astype(int), 0, segments - 1)
    centres = -reach + (np.arange(nb) + 0.5) * bin_px
    out = []
    for img in img_list:
        v = img[y0:y1, x0:x1].ravel()[sel]
        med = np.full((segments, nb), np.nan)
        key = si * nb + bi
        order = np.argsort(key, kind='stable')
        ks, vs = key[order], v[order]
        starts = np.r_[0, np.nonzero(np.diff(ks))[0] + 1]
        ends = np.r_[starts[1:], len(ks)]
        for s0, s1 in zip(starts, ends):
            if s1 - s0 >= 3:
                med.flat[ks[s0]] = np.median(vs[s0:s1])
        n = np.sum(np.isfinite(med), 0)
        good = n >= 4
        prof = np.nanmean(med[:, good], 0)
        se = np.nanstd(med[:, good], 0, ddof=1) / np.sqrt(n[good])
        out.append((prof, se))
        keep = good
    return centres[keep], out


def _flatness(x, y, se=None, max_dev=None, z_min=4.0):
    """Max deviation of y from its straight-line fit; with `se`, also whether a
    deviation above max_dev is significant: |deviation| >= z_min pooled standard
    errors (the median of the per-bin errors: one bin's error, estimated from six
    stretches, is too noisy to divide by)."""
    if len(x) < 10:
        return None, False
    A = np.stack([x, np.ones_like(x)], 1)
    coef, *_ = np.linalg.lstsq(A, y, rcond=None)
    res = y - A @ coef
    sig = False
    if se is not None and max_dev is not None:
        pooled = max(float(np.median(se)), 0.3)
        sig = bool(np.any((np.abs(res) > max_dev) & (np.abs(res) / pooled >= z_min)))
    return float(np.abs(res).max()), sig


def gate_cross_profiles(g, th):
    """Cross-stroke luma and green profiles of the clean body over +-reach px
    must be flat: max deviation from a straight line <= max_dev levels. A larger
    deviation fails when it is significant (>= 4 standard errors, from the spread
    between stretches of the stroke) and warns when texture noise could explain it."""
    strokes = {k: v['bezier'] for k, v in g.face.items()
               if isinstance(v, dict) and isinstance(v.get('bezier'), dict)}     # ('fields' documents 'bezier' as text)
    if not strokes:
        return dict(value=None, threshold=dict(maxDev=th['max_dev']), verdict='n/a', note='no stroke centrelines in the face JSON')
    valid = g.body & ~g.protect & ~g.excl
    out, verdicts, worst = {}, [], 0.0
    for k, bz in strokes.items():
        offs, ((pY, sY), (pG, sG), (aY, _)) = _profiles([g.Y, g.rgb[..., 1], g.Y_art], bz, th['reach'], valid)
        fY, zY = _flatness(offs, pY, sY, th['max_dev'])
        fG, zG = _flatness(offs, pG, sG, th['max_dev'])
        if fY is None:
            v = 'n/a'
        elif max(fY, fG) <= th['max_dev']:
            v = 'pass'
        else:
            v = 'fail' if (zY or zG) else 'warn'
        verdicts.append(v)
        out[k] = dict(lumaDev=_r(fY, 2), greenDev=_r(fG, 2), medianStdErr=_r(float(np.median(np.r_[sY, sG])) if len(offs) else None, 2),
                      artLumaDevReference=_r(_flatness(offs, aY)[0], 2), bins=int(len(offs)), verdict=v)
        worst = max(worst, fY or 0.0, fG or 0.0)
    return dict(value=dict(strokes=out, worstDev=_r(worst, 2)),
                threshold=dict(maxDev=th['max_dev'], reachPx=th['reach'],
                               failsWhen='a deviation above maxDev is also >= 4 standard errors'),
                verdict=_worst(verdicts))


def gate_texture_period(g, th):
    s0, s1 = th['band']
    win = g.win
    x = metrics.band(g.Y[win], g.w[win], s0, s1)
    res = {}
    for name, m in (('zoneA', g.zoneA[win]), ('ring', g.ring[win])):
        if m.sum() < 2000:
            res[name] = None
            continue
        ac, sup = metrics.radial_autocorr(x, m, th['max_lag'])
        period, corr_len = metrics.texture_scale(ac, sup)
        res[name] = dict(periodPx=_r(period, 2), corrLenPx=_r(corr_len, 2))
    if not res.get('zoneA') or not res.get('ring'):
        return dict(value=res, threshold=dict(maxRel=th['max_rel']), verdict='n/a')
    a, b = res['zoneA'], res['ring']
    if a['periodPx'] and b['periodPx']:
        basis, ratio = 'period', a['periodPx'] / b['periodPx']
    elif a['corrLenPx'] and b['corrLenPx']:
        basis, ratio = 'correlation length (no cell period found)', a['corrLenPx'] / b['corrLenPx']
    else:
        return dict(value=res, threshold=dict(maxRel=th['max_rel']), verdict='n/a')
    return dict(value=dict(**res, basis=basis, ratio=_r(ratio, 3)), threshold=dict(maxRel=th['max_rel']),
                verdict=_verdict(abs(ratio - 1) <= th['max_rel']))


def gate_glint_density(g, th):
    zone = g.zoneA | g.zoneB
    nz, nr = metrics.glints(g.rgb, zone), metrics.glints(g.rgb, g.ring)
    az, ar = int(zone.sum()), int(g.ring.sum())
    dz, dr = 1e4 * nz / max(az, 1), 1e4 * nr / max(ar, 1)
    expected = dr * az / 1e4
    value = dict(zoneCount=nz, ringCount=nr, zonePer10k=_r(dz, 3), ringPer10k=_r(dr, 3), expectedInZone=_r(expected, 2))
    if expected < th['min_expected']:
        return dict(value=value, threshold=dict(maxRel=th['max_rel']), verdict='n/a',
                    note='too few glints in the surrounding skin to estimate a density')
    ratio = dz / dr
    value['ratio'] = _r(ratio, 3)
    return dict(value=value, threshold=dict(maxRel=th['max_rel']), verdict=_verdict(abs(ratio - 1) <= th['max_rel']))


def _face_crop(g, pad=40):
    return metrics.bbox(g.Hh, pad)


def _sweep_sheet(g, tiles, path):
    sy, sx = _face_crop(g)
    cells = []
    for az, shade in tiles:
        t = np.ascontiguousarray(shade[sy, sx].astype(np.uint8))
        t = cv2.resize(t, (t.shape[1] // 2, t.shape[0] // 2), interpolation=cv2.INTER_AREA)
        cells.append(_label(cv2.cvtColor(t, cv2.COLOR_GRAY2RGB), f'light azimuth {az:g} deg', (8, 22), 0.55))
    h, w = cells[0].shape[:2]
    cols = 4
    rows = (len(cells) + cols - 1) // cols
    sheet = np.full((rows * (h + 6), cols * (w + 6), 3), 255, np.uint8)
    for i, c in enumerate(cells):
        y, x = (i // cols) * (h + 6), (i % cols) * (w + 6)
        sheet[y:y + h, x:x + w] = c
    Image.fromarray(sheet).save(path)


def stretched_channels(g, path, stretch=None):
    """Before/after of the face with each channel stretched on its own: glow
    residue, pale bands and seams that RGB hides show up here (Loomi Q2)."""
    sy, sx = _face_crop(g)
    rows = []
    for name, img in (('art', g.rgb_art), ('clean', g.rgb)):
        cells = []
        for i, c in enumerate(CH):
            lo, hi = (stretch or {}).get(c) or np.percentile(g.rgb_art[sy, sx][..., i][g.body[sy, sx]], [1, 99])
            v = np.clip((img[sy, sx][..., i] - lo) / max(hi - lo, 1e-6) * 255, 0, 255).astype(np.uint8)
            v = cv2.resize(v, (v.shape[1] // 2, v.shape[0] // 2), interpolation=cv2.INTER_AREA)
            cells.append(_label(cv2.cvtColor(v, cv2.COLOR_GRAY2RGB), f'{name} {c} {lo:.0f}-{hi:.0f}', (8, 22), 0.55))
        rows.append(np.hstack([np.hstack([c, np.full((c.shape[0], 6, 3), 255, np.uint8)]) for c in cells]))
    sheet = np.vstack([rows[0], np.full((6, rows[0].shape[1], 3), 255, np.uint8), rows[1]])
    Image.fromarray(sheet).save(path)


GATE_FUNCS = dict(integrity=gate_integrity, transparent_rgb=gate_transparent_rgb, band_energy=gate_band_energy,
                  repeat_patch=gate_repeat_patch, ghost=gate_ghost, lighting_sweep=gate_lighting_sweep,
                  cheek_refit=gate_cheek_refit, residue=gate_residue, boundary_step=gate_boundary_step,
                  colour_match=gate_colour_match, cross_profiles=gate_cross_profiles,
                  texture_period=gate_texture_period, glint_density=gate_glint_density)


def run_gates(g, qa_dir=None, reproducibility=None, log=None):
    """Every shared asset gate on GateInput `g`. Writes asset-gates.json and the
    two review images into qa_dir (when given) and returns the report."""
    th, enforce = resolve_gates(g.cfg.qa)
    if qa_dir:
        qa_dir = paths.assert_writable(qa_dir)
        os.makedirs(qa_dir, exist_ok=True)
    gates = {}
    for name, fn in GATE_FUNCS.items():
        gates[name] = fn(g, th[name], qa_dir) if name == 'lighting_sweep' else fn(g, th[name])
        if log:
            log(f'gate {name}: {gates[name]["verdict"]}')
    if reproducibility is not None:
        ok = all(c['identical'] for c in reproducibility.values())
        gates['reproducibility'] = dict(value=reproducibility, threshold='byte-identical', verdict=_verdict(ok))
    else:
        gates['reproducibility'] = dict(value=None, threshold='byte-identical', verdict='n/a',
                                        note='no reference set given (derive_mallow.py --expect)')
    for name, r in gates.items():
        r['enforced'] = name in enforce
    failed = sorted(n for n, r in gates.items() if r['enforced'] and r['verdict'] == 'fail')
    report = dict(
        _about=('Shared asset gates of tools/derive/asset_qa.py for one derived Mallow. Thresholds from '
                'docs/PHASE2-PLAN.md and docs/design/map-asset-*.md; "enforced" gates decide the verdict, the others '
                'are reported (provisional where calibrated on Noomi alone). warn = outside the threshold but within '
                'sampling noise; never a failure.'),
        mallow=g.cfg.id, family=g.cfg.family, verdict='fail' if failed else 'pass', failedEnforced=failed,
        failedReported=sorted(n for n, r in gates.items() if not r['enforced'] and r['verdict'] == 'fail'),
        warnings=sorted(n for n, r in gates.items() if r['verdict'] == 'warn'),
        enforced=enforce, gates=gates)
    if qa_dir:
        stretched_channels(g, os.path.join(qa_dir, 'qa-stretched-channels.png'), (g.cfg.qa or {}).get('stretch'))
        with open(os.path.join(qa_dir, 'asset-gates.json'), 'w') as f:
            json.dump(report, f, indent=1)
    return report


def summarize(report):
    """One line per gate for the console."""
    lines = []
    for name, r in report['gates'].items():
        v = r['value']
        key = None
        if isinstance(v, dict):
            for k in ('maxAbsDiffOutsideMask', 'maxNcc', 'maxAbsR', 'worst', 'worstAbs', 'worstAbsMedian', 'meanDE2000',
                      'worstDev', 'ratio', 'cleanPixels'):
                if k in v:
                    key = f'{k}={json.dumps(v[k])}'
                    break
        lines.append(f'  {r["verdict"]:<4} {"*" if r["enforced"] else " "} {name:<16} {key or ""}')
    return '\n'.join(lines)


