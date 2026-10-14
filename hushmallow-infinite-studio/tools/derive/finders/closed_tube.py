"""closed_tube finder: Mallows whose face is painted as glossy navy tubes
(closed eyes, line mouth, optionally brows) - Noomi, Blubi, Loomi.

Moved out of the approved Noomi derivation (tools/derive/legacy_noomi.py):
find_features, fit_cheeks and measure_stroke keep their arithmetic verbatim,
and the thresholds they hard-coded for Noomi are read from the config's
"finder" section (DEFAULTS below are the Noomi values):

    stroke_pixel         conditions a stroke pixel meets, ANDed: [channel, '<' | '>', value]
                         with channel R, G, B, A or Y (luma). Noomi: R < 70, G < 130, A > 200.
    stroke_min_area      px; stroke_rel_y: (lo, hi) of the centroid in the body's height;
    stroke_min_sil_dist  px a stroke keeps from the silhouette
    rows                 stroke names, top row first, each row left to right; the
                         largest sum(len(row)) candidates are sorted into them
    core_close_r         closing radius that bridges a stroke's highlight
    dimple               {rel_y_max, min_area} of the top dimple, or null
    cheeks               erfc blush-disc fit: count, pink_min (R - G), window, core_clearance,
                         init (radius, softness, aspect, angle, offset, slope x, slope y, gain),
                         sparkle_min_rgb, sparkle_min_area, sparkle_glow_pad
    open_eye_ratio       {num, den, note}: open-eye radius / closed half-width

The asset reports list what Blubi and Loomi still need on top (B/luma
detector, narrow zone A, pedestals, all-channel glow fit, cheek as a layer,
per-side masks); WP-30 and WP-31 add them here as options whose defaults keep
Noomi byte-identical.
"""
import copy
import os

import numpy as np
import cv2
from scipy.ndimage import map_coordinates
from scipy.optimize import least_squares
from scipy.special import erfc

from .. import paths
from ..common import (LUMA, arclen_samples, bez, bez_tan, colour, ell, fit_quad_bezier, r1, side_cos,
                      skeleton_path, zhang_suen)
from ..config import ConfigError
from . import FeatureError, Features

FAMILY = 'closed_tube'
STATUS = 'implemented'
OWNER = 'WP-07 (Noomi); WP-30 Blubi and WP-31 Loomi extend it'

DEFAULTS = {
    'stroke_pixel': [['R', '<', 70], ['G', '<', 130], ['A', '>', 200]],
    'stroke_min_area': 2000,
    'stroke_rel_y': [0.3, 0.8],
    'stroke_min_sil_dist': 40,
    'rows': [['eyeL', 'eyeR'], ['mouth']],
    'core_close_r': 4,
    'dimple': {'rel_y_max': 0.25, 'min_area': 300},
    'cheeks': {
        'count': 2, 'pink_min': 20, 'window': 170, 'core_clearance': 70,
        'init': [80, 15, 1.0, 0.0, -70, 0, 0, 180],
        'sparkle_min_rgb': 236, 'sparkle_min_area': 4, 'sparkle_glow_pad': 9.0,
    },
    'open_eye_ratio': {'num': 36, 'den': 44, 'note': 'the ratio the 439 px app rig used'},
}
_CHANNELS = ('R', 'G', 'B', 'A', 'Y')
# top-level keys of the face JSON; a stroke is stored under its own name next to them
_RESERVED = {'_about', 'source', 'fields', 'cheeks', 'topDimple', 'silhouette', 'edit', 'heightNormalMaps'}


def validate(fcfg):
    """The config's "finder" section with DEFAULTS filled in (nested objects
    merge one level deep). Raises ConfigError on unknown keys or bad values."""
    fcfg = fcfg or {}
    out = copy.deepcopy(DEFAULTS)
    unknown = sorted(set(fcfg) - set(DEFAULTS) - {'_about'})
    if unknown:
        raise ConfigError(f'closed_tube finder: unknown key(s): {", ".join(unknown)}')
    for k, v in fcfg.items():
        if k == '_about':
            continue
        if isinstance(DEFAULTS[k], dict) and isinstance(v, dict):
            bad = sorted(set(v) - set(DEFAULTS[k]))
            if bad:
                raise ConfigError(f'closed_tube finder: unknown key(s) in {k}: {", ".join(bad)}')
            out[k].update(v)
        else:
            out[k] = copy.deepcopy(v)
    for cond in out['stroke_pixel']:
        if (not isinstance(cond, list) or len(cond) != 3 or cond[0] not in _CHANNELS or cond[1] not in ('<', '>')
                or not isinstance(cond[2], (int, float))):
            raise ConfigError(f'closed_tube finder: bad stroke_pixel condition {cond!r} (want [R|G|B|A|Y, "<"|">", number])')
    rows = out['rows']
    names = [n for row in rows for n in row]
    if not rows or not all(isinstance(r, list) and r for r in rows) or len(set(names)) != len(names):
        raise ConfigError('closed_tube finder: rows must be non-empty lists of unique stroke names')
    if not all(isinstance(n, str) and n.isidentifier() for n in names):
        raise ConfigError('closed_tube finder: stroke names must be identifiers')
    clash = sorted(set(names) & _RESERVED)
    if clash:
        raise ConfigError(f'closed_tube finder: stroke name(s) {", ".join(clash)} collide with face-JSON keys')
    if not isinstance(out['core_close_r'], int) or out['core_close_r'] < 0:
        raise ConfigError('closed_tube finder: core_close_r must be a non-negative integer')
    if len(out['cheeks']['init']) != 8:
        raise ConfigError('closed_tube finder: cheeks.init needs 8 numbers')
    if not isinstance(out['cheeks']['count'], int) or out['cheeks']['count'] < 0:
        raise ConfigError('closed_tube finder: cheeks.count must be a non-negative integer')
    return out


def stroke_pixels(rgb, al, conds):
    """Boolean mask of pixels meeting every [channel, op, value] condition."""
    mask = None
    for ch, op, val in conds:
        x = al if ch == 'A' else (rgb @ LUMA if ch == 'Y' else rgb[..., 'RGB'.index(ch)])
        m = (x < val) if op == '<' else (x > val)
        mask = m if mask is None else mask & m
    return mask


# ----------------------------------------------------------------------------
# feature finding
# ----------------------------------------------------------------------------
def find_features(art, f):
    """Dark navy strokes, sorted into f['rows'] (Noomi: the two upper ones are
    the eyes, the lower one the mouth), plus the top dimple."""
    rgb = art[..., :3].astype(np.float64)
    al = art[..., 3]
    body = (al > 127).astype(np.uint8)
    dsil = cv2.distanceTransform(body, cv2.DIST_L2, 5)
    dark = stroke_pixels(rgb, al, f['stroke_pixel']).astype(np.uint8)
    n, lab, st, cen = cv2.connectedComponentsWithStats(dark, connectivity=8)
    ys, xs = np.nonzero(body)
    by0, by1 = ys.min(), ys.max()
    rel_lo, rel_hi = f['stroke_rel_y']
    cands = []
    for i in range(1, n):
        cx, cy = cen[i]
        rel = (cy - by0) / (by1 - by0)
        far = dsil[lab == i].min() > f['stroke_min_sil_dist']
        if st[i, 4] > f['stroke_min_area'] and rel_lo < rel < rel_hi and far:
            cands.append((st[i, 4], i))
    count = sum(len(row) for row in f['rows'])
    cands = [i for _, i in sorted(cands, reverse=True)[:count]]
    if len(cands) != count:
        raise FeatureError(f'expected {count} face strokes, found {len(cands)}')
    cands.sort(key=lambda i: cen[i][1])
    named, k = [], 0
    for row in f['rows']:
        named += zip(row, sorted(cands[k:k + len(row)], key=lambda i: cen[i][0]))
        k += len(row)
    H, W = dark.shape
    cores = {}
    for name, i in named:
        m = (lab == i).astype(np.uint8)
        m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, ell(f['core_close_r']))
        ff = m.copy(); mk = np.zeros((H + 2, W + 2), np.uint8)
        cv2.floodFill(ff, mk, (0, 0), 1)
        cores[name] = (m | (1 - ff)).astype(np.uint8)       # fill the highlight holes
    # top dimple: the dark blob in the upper part of the body
    dimple = None
    dc = f['dimple']
    if dc:
        top = []
        for i in range(1, n):
            cx, cy = cen[i]
            if (cy - by0) / (by1 - by0) < dc['rel_y_max'] and st[i, 4] > dc['min_area']:
                top.append((st[i, 4], i))
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


def fit_cheeks(art, coreU, c):
    """Pink blush discs: 0.5*erfc((r - radius)/softness) ellipses fitted on
    (R - G), plus their white sparkles. `art` may be the art or the clean body
    (the cheek-refit asset gate fits both)."""
    rgb = art[..., :3].astype(np.float64)
    al = art[..., 3]
    sm = cv2.GaussianBlur(rgb, (0, 0), 4)
    pink = sm[..., 0] - sm[..., 1]
    H, W = pink.shape
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
    de = cv2.distanceTransform(1 - coreU, cv2.DIST_L2, 5)
    n, lab, st, cen = cv2.connectedComponentsWithStats(((pink > c['pink_min']) & (al > 250)).astype(np.uint8))
    big = sorted([(st[i, 4], i) for i in range(1, n)], reverse=True)[:c['count']]
    cheeks = {}
    for _, i in big:
        cx0, cy0 = cen[i]
        win = (np.abs(xx - cx0) < c['window']) & (np.abs(yy - cy0) < c['window']) & (de > c['core_clearance']) & (al > 245)
        X, Yv, Z = xx[win], yy[win], pink[win]

        def model(p, x, y):
            cx, cy, r0, w, e, th = p[:6]
            ct, s_ = np.cos(th), np.sin(th)
            u = (x - cx) * ct + (y - cy) * s_
            v = (-(x - cx) * s_ + (y - cy) * ct) * e
            return 0.5 * erfc((np.hypot(u, v) - r0) / (w * np.sqrt(2)))

        def res(p):
            return p[6] + p[7] * (X - cx0) + p[8] * (Yv - cy0) + p[9] * model(p, X, Yv) - Z
        p = least_squares(res, [cx0, cy0, *c['init']], loss='soft_l1', f_scale=5).x
        C = model(p, xx, yy)
        inner = (C > 0.9) & (al > 250)
        # sparkles: the small pure-white glints inside the cheek (the cheek
        # itself is pink, so min(R, G, B) > 236 isolates them cleanly)
        Yl = rgb @ LUMA
        hp = Yl - cv2.GaussianBlur(Yl, (0, 0), 4)
        sp_ = ((rgb.min(2) > c['sparkle_min_rgb']) & (C > 0.15) & (al > 250)).astype(np.uint8)
        ns, ls, ss, cs = cv2.connectedComponentsWithStats(sp_)
        sparkles = []
        for j in range(1, ns):
            if ss[j, 4] >= c['sparkle_min_area']:
                rc = float(np.sqrt(ss[j, 4] / np.pi))
                sparkles.append(dict(center=[round(float(cs[j][0]), 1), round(float(cs[j][1]), 1)],
                                     radius=round(rc, 1), glowRadius=round(rc + c['sparkle_glow_pad'], 1)))
        col = np.median(rgb[inner & (hp < 6)], 0)
        side = 'L' if p[0] < W / 2 else 'R'
        cheeks[side] = dict(params=p, C=C, sparkles=sparkles, color=col)
    return cheeks


def cheek_masks(cheeks, shape):
    """Cheek discs (radius + 2 softness: kept out of the glow fit) and the
    sparkle glows (+2 px: protected from re-synthesis)."""
    H, W = shape
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
    excl_cheek = np.zeros((H, W), bool)
    sparkle_mask = np.zeros((H, W), bool)
    for ck in cheeks.values():
        p = ck['params']
        excl_cheek |= np.hypot(xx - p[0], yy - p[1]) < p[2] + 2 * p[3]
        for s_ in ck['sparkles']:
            sparkle_mask |= np.hypot(xx - s_['center'][0], yy - s_['center'][1]) < s_['glowRadius'] + 2
    return excl_cheek, sparkle_mask


def find(art, cfg):
    """Strokes, top dimple, cheeks and the masks derived from them."""
    f = cfg.finder
    cores, dimple = find_features(art, f)
    coreU = np.maximum.reduce(list(cores.values()))
    cheeks = fit_cheeks(art, coreU, f['cheeks'])
    excl, protect = cheek_masks(cheeks, art.shape[:2])
    return Features(cores=cores, dimple=dimple, cheeks=cheeks, excl=excl, protect=protect)


def measure(art, features, Lbg, cfg):
    return {k: measure_stroke(art, m, Lbg, k) for k, m in features.cores.items()}


def refit_cheeks(img, coreU, cfg):
    return fit_cheeks(img, coreU, cfg.finder['cheeks'])


# ----------------------------------------------------------------------------
# measurements
# ----------------------------------------------------------------------------
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


# ----------------------------------------------------------------------------
# face JSON
# ----------------------------------------------------------------------------
FIELDS = {
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
    'openEyeSocket': 'recommended open-eye ellipse: radii = closed half-width (half the tip-to-tip span) x {ratio} ({note}), centre = midpoint of the p0-p1 chord moved up by 8 % of the radius.',
    'cheeks': 'pink blush discs fitted as 0.5*erfc((r - radius)/softness) ellipses on (R - G): center, radius (50 % level), softness (sigma, px), aspect (minor/major), angleDeg, color = median colour of the inner disc, sparkles = centres/radii of the white glints.',
    'topDimple': 'center = darkest point of the dimple at the top of the body; centroid/bbox of its dark navy core.',
    'silhouette': 'bbox [x0, y0, x1, y1] of alpha > 127 (inclusive); baseY = lowest row with alpha > 0.5; contactHalfWidth = half the opaque run width at row baseY-4 (contactCenterX its centre); centerX = bbox centre; bodyWidth/bodyHeight = bbox size.',
    'edit': 'face-line removal summary, see {generator}.',
    'heightNormalMaps': 'how {file_height} / {file_normal} were built.',
}


def _source_note(cfg):
    floor = ('alpha == 1 is a scattered, invisible noise floor in the source' if cfg.alpha_min == 2
             else f'alpha < {cfg.alpha_min} is treated as an invisible noise floor')
    return (f'source pixel = art pixel + cropOffset. Crop = bbox of alpha >= {cfg.alpha_min} plus {cfg.pad} px '
            f'padding ({floor}).')


def face_doc(d):
    """The <id>-face.json document for a derivation `d` (pipeline.Derivation),
    without `heightNormalMaps` (the pipeline appends it)."""
    cfg, art, meas = d.cfg, d.art, d.meas
    cheeks, dimple = d.features.cheeks, d.features.dimple
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
    ratio = cfg.finder['open_eye_ratio']
    LOWRES_RATIO = ratio['num'] / ratio['den']     # app rig at 439 px: closed half-width 44 <-> open radius 36 (Noomi)
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
    fields = dict(FIELDS)
    fields['openEyeSocket'] = FIELDS['openEyeSocket'].format(ratio=f'{ratio["num"]}/{ratio["den"]}', note=ratio['note'])
    fields['edit'] = FIELDS['edit'].format(generator=cfg.generator)
    fields['heightNormalMaps'] = FIELDS['heightNormalMaps'].format(file_height=cfg.file('height.png'),
                                                                  file_normal=cfg.file('normal.png'))
    P = cfg.inpaint
    doc = {
        '_about': (f'Measurements of the owner-approved high-resolution {cfg.name} (hushmallow commit '
                   f'{cfg.src_commit or "unknown"}) in the pixel space of {cfg.file("art.png")} / {cfg.file("clean.png")}. '
                   f'Coordinates are [x, y] in pixels, origin top-left, y down. Generated by {cfg.generator} (deterministic).'),
        'source': dict(file=os.path.relpath(d.src_path, paths.STUDIO), size=[int(d.src_shape[1]), int(d.src_shape[0])],
                       cropOffset=list(d.offset), artSize=[int(art.shape[1]), int(art.shape[0])],
                       note=_source_note(cfg)),
        'fields': fields,
        **face,
        'cheeks': cheek_out,
        'topDimple': {kk: (r1(vv) if isinstance(vv, list) and kk != 'bbox' else vv) for kk, vv in (dimple or {}).items()},
        'silhouette': sil,
        'edit': dict(
            maskFile=cfg.file('clean-mask.png'), maskRadiusPx=cfg.halo_r, editPixels=int(d.Hh.sum()),
            resynthesizedPixels=int(d.zA.sum()),
            maxAbsDiffOutsideMask=int(d.outside),
            method=('zone A (stroke + strong glow) re-synthesised from the body texture (thin-plate shading + PatchMatch detail + '
                    'multi-band energy equalisation + seamless boundary); %g px low-frequency cross-fade band; glow tail un-blended '
                    'with a measured per-channel transmission map.' % P['band']),
            params={k: (list(v) if isinstance(v, tuple) else v) for k, v in P.items()},
            bandGainPercentiles5_50_95=d.band_gains,
        ),
    }
    return doc
