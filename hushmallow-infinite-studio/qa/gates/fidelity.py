"""G-FINAL character fidelity (pixel side): the Mallow is relit, never
recoloured, never softened, and the painted rest does not pop.

The direction's geometry gives, per frame, the screen position of a few
hundred art points on the Mallow's skin (outside the face). The pixel at
that position shows that art point after the soft body, the camera, the
relight and the grade, so it can be compared with the pristine painting
point for point:

  grade      mean L*, C* and hue of the skin samples against the same art
             points in the pristine painting (blurred to the screen scale):
             lightness ratio, chroma ratio and hue shift. A value counts only
             when it holds for `sustainFrames` frames (a flash or a single
             odd frame belongs to other gates): the gate value is the
             largest deviation sustained that long.
  sharpness  band-pass (DoG) contrast energy of the skin on screen against
             the pristine painting's at the same scale, on still frames (the
             shutter moves < 2 px). An upscaled or re-sampled sprite loses
             its fine fur texture and drops far below the approved ratio.
  restFade   the largest consecutive face-box |delta| inside the painted-rest
             fade windows against the median of the surrounding second.

Samples under glass cards or text are skipped. The render-side half of the
gate (magnification log, asset hashes) is checked in Node from provenance.
"""
import os

import cv2
import numpy as np
from PIL import Image

from qalib import color
from qalib.checks import check, limits, num, band, range_band, not_run

GATE = 'G-FINAL:fidelity'


def sample(img, pts):
    """Bilinear samples of an image (HxW or HxWxC float32) at Nx2 points."""
    mx = np.ascontiguousarray(pts[:, 0], dtype=np.float32).reshape(-1, 1)
    my = np.ascontiguousarray(pts[:, 1], dtype=np.float32).reshape(-1, 1)
    out = cv2.remap(img, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    return out.reshape(len(pts), -1)


def band_energy(gray, s1, s2, win):
    """(local DoG energy, local mean) maps of a float32 grayscale image."""
    d = cv2.GaussianBlur(gray, (0, 0), s1) - cv2.GaussianBlur(gray, (0, 0), s2)
    return cv2.boxFilter(d * d, -1, (win, win)), cv2.boxFilter(gray, -1, (win, win))


def sustained(values, n, mode):
    """Largest deviation held for n consecutive values: mode 'high' -> max over
    windows of the window minimum; 'low' -> min over windows of the window maximum."""
    v = np.asarray([x for x in values if x is not None], dtype=np.float64)
    if len(v) == 0:
        return None
    if len(v) < n:
        return float(v.min() if mode == 'high' else v.max())
    w = np.lib.stride_tricks.sliding_window_view(v, n)
    return float(w.min(axis=1).max() if mode == 'high' else w.max(axis=1).min())


def _covered(pts, boxes):
    keep = np.ones(len(pts), bool)
    for b in boxes:
        keep &= ~((pts[:, 0] > b[0]) & (pts[:, 0] < b[2]) & (pts[:, 1] > b[1]) & (pts[:, 1] < b[3]))
    return keep


class FidelityGate:
    id = GATE

    def __init__(self, ctx):
        self.ctx = ctx
        self.L = limits(GATE)
        self.g = ctx.get('geometry')
        self.grade = []            # (frame, Lratio, Cratio, hueShift, kept)
        self.sharp = []            # (frame, ratio)
        self.face_d = []           # consecutive face-box |delta| per frame (index = frame)
        self.prev_face = None
        self._pristine = {}
        if self.g is None:
            return
        art = np.array(Image.open(ctx['art']).convert('RGBA'))
        self.art_rgb = art[..., :3].astype(np.float32)
        self.art_gray = cv2.cvtColor(art[..., :3], cv2.COLOR_RGB2GRAY).astype(np.float32)
        self.skin = np.asarray(self.g['samples']['skin'], np.float32)
        pf = self.g['perFrame']
        # one face box for the whole film (union), so consecutive deltas compare like with like
        fb = np.array([p['faceBox'] for p in pf])
        s = ctx['scale']
        self.fbox = (max(0, int(fb[:, 0].min() * s)), max(0, int(fb[:, 1].min() * s)),
                     min(ctx['width'], int(fb[:, 2].max() * s)), min(ctx['height'], int(fb[:, 3].max() * s)))

    def pristine(self, scale):
        """Pristine Lab and band energy at the skin points for a screen scale (cached per 0.02)."""
        q = round(scale / 0.02) * 0.02
        if q not in self._pristine:
            blur = cv2.GaussianBlur(self.art_rgb, (0, 0), max(0.3, 0.5 / q))
            lab = color.lab_from_float_srgb(sample(blur, self.skin))
            L = self.L['sharpness']
            e, m = band_energy(self.art_gray, L['sigma'][0] / q, L['sigma'][1] / q, int(round(L['window'] / q)) | 1)
            em = sample(np.dstack([e, m]), self.skin)
            self._pristine[q] = (lab, np.sqrt(em[:, 0]) / np.maximum(em[:, 1], 1.0))
        return self._pristine[q]

    def wants(self, i):
        return self.g is not None and i < len(self.g['perFrame'])

    def frame(self, i, f):
        s = self.ctx['scale']
        x0, y0, x1, y1 = self.fbox
        fc = f[y0:y1, x0:x1]
        if self.prev_face is not None:
            self.face_d.append(float(np.mean(cv2.mean(cv2.absdiff(fc, self.prev_face))[:3])))
        else:
            self.face_d.append(None)
        self.prev_face = fc
        if i % self.L['every']:
            return
        fr = self.g['perFrame'][i]
        pts = np.asarray(fr['skin'], np.float32).reshape(-1, 2)
        H, W = f.shape[:2]
        keep = _covered(pts, [b[:4] for b in fr['glass']] + [t['box'] for t in fr['text']])
        keep &= (pts[:, 0] > 2) & (pts[:, 1] > 2) & (pts[:, 0] < W / s - 2) & (pts[:, 1] < H / s - 2)
        if keep.mean() < self.L['minKept']:
            return
        plab, pband = self.pristine(fr['scale'])
        sp = pts[keep] * s
        lab = color.lab_from_float_srgb(sample(f.astype(np.float32), sp))
        L1, C1, h1 = color.lch(plab[keep].mean(0))
        L2, C2, h2 = color.lch(lab.mean(0))
        self.grade.append((i, float(L2 / L1), float(C2 / max(C1, 1e-6)), float(color.hue_delta(h1, h2)), int(keep.sum())))
        Ls = self.L['sharpness']
        if fr['motion'] < Ls['stillPx']:
            gx0, gy0 = int(max(0, sp[:, 0].min() - 20)), int(max(0, sp[:, 1].min() - 20))
            gx1, gy1 = int(min(W, sp[:, 0].max() + 20)), int(min(H, sp[:, 1].max() + 20))
            gray = cv2.cvtColor(np.ascontiguousarray(f[gy0:gy1, gx0:gx1]), cv2.COLOR_RGB2GRAY).astype(np.float32)
            e, m = band_energy(gray, Ls['sigma'][0] * s, Ls['sigma'][1] * s, int(round(Ls['window'] * s)) | 1)
            em = sample(np.dstack([e, m]), sp - [gx0, gy0])
            ratio = (np.sqrt(em[:, 0]) / np.maximum(em[:, 1], 1.0)) / np.maximum(pband[keep], 1e-6)
            self.sharp.append((i, float(np.median(ratio))))

    def _rest_fade(self):
        rest = [p['rest'] for p in self.g['perFrame']]
        n = min(len(rest), len(self.face_d))
        fades = [i for i in range(1, n) if (0.001 < rest[i] < 0.999) or (0.001 < rest[i - 1] < 0.999)]
        if not fades:
            return None
        groups, cur = [], [fades[0]]
        for i in fades[1:]:
            if i == cur[-1] + 1:
                cur.append(i)
            else:
                groups.append(cur)
                cur = [i]
        groups.append(cur)
        fps = self.ctx['fps']
        worst = None
        for g in groups:
            inside = [self.face_d[i] for i in g if self.face_d[i] is not None]
            around = [self.face_d[i] for i in range(max(1, g[0] - fps // 2), min(n, g[-1] + fps // 2 + 1))
                      if i not in g and self.face_d[i] is not None]
            if not inside or not around:
                continue
            r = max(inside) / max(np.median(around), 1e-6)
            if worst is None or r > worst[0]:
                worst = (r, g[0], g[-1], max(inside), float(np.median(around)))
        return worst

    def result(self):
        if self.g is None:
            nr = not_run('no direction geometry: the Mallow cannot be located')
            return {'checks': {'grade': nr, 'sharpness': nr, 'restFade': nr}, 'metrics': {}, 'artefacts': []}
        G = self.L['grade']
        n = max(1, G['sustainFrames'] // self.L['every'])
        checks, metrics = {}, {'analysed': len(self.grade), 'stillFrames': len(self.sharp)}
        if self.grade:
            Lr, Cr, hs = [g[1] for g in self.grade], [g[2] for g in self.grade], [abs(g[3]) for g in self.grade]
            hue = sustained(hs, n, 'high')
            l_hi, l_lo = sustained(Lr, n, 'high'), sustained(Lr, n, 'low')
            c_hi, c_lo = sustained(Cr, n, 'high'), sustained(Cr, n, 'low')
            lv = l_hi if abs(np.log(l_hi)) >= abs(np.log(l_lo)) else l_lo
            cv = c_hi if abs(np.log(c_hi)) >= abs(np.log(c_lo)) else c_lo
            hc = band(hue, G['hueShiftDeg'], unit=' deg')
            lc = range_band(lv, G['lightnessRatio'])
            cc = range_band(cv, G['chromaRatio'])
            worst = max([hc, lc, cc], key=lambda c: ['pass', 'warn', 'fail'].index(c['status']))
            checks['grade'] = check(worst['status'], {'hueShiftDeg': num(hue, 2), 'lightnessRatio': num(lv, 3), 'chromaRatio': num(cv, 3)},
                                    {'hueShiftDeg': G['hueShiftDeg']['fail'], 'lightnessRatio': G['lightnessRatio']['fail'], 'chromaRatio': G['chromaRatio']['fail']},
                                    f"sustained {G['sustainFrames']} frames: hue {hc['detail']}; lightness {lc['detail']}; chroma {cc['detail']}",
                                    parts={'hue': hc, 'lightness': lc, 'chroma': cc})
            metrics['grade'] = {'hueShiftRange': [num(min(g[3] for g in self.grade), 2), num(max(g[3] for g in self.grade), 2)],
                                'lightnessRange': [num(min(Lr), 3), num(max(Lr), 3)], 'chromaRange': [num(min(Cr), 3), num(max(Cr), 3)]}
        else:
            checks['grade'] = not_run('no frame showed enough uncovered skin')
        if self.sharp:
            v = float(np.median([x[1] for x in self.sharp]))
            checks['sharpness'] = band(v, self.L['sharpness'], higher_is_worse=False)
            checks['sharpness']['detail'] = f"median skin detail ratio {num(v, 3)} over {len(self.sharp)} still frames (render / pristine at the same scale); {checks['sharpness']['detail']}"
            metrics['sharpness'] = {'median': num(v, 3), 'min': num(min(x[1] for x in self.sharp), 3), 'max': num(max(x[1] for x in self.sharp), 3)}
        else:
            checks['sharpness'] = not_run('no still frame with enough uncovered skin')
        rf = self._rest_fade()
        if rf is None:
            checks['restFade'] = check('pass', None, self.L['restFade']['fail'], 'no painted-rest fade in this direction')
        else:
            c = band(rf[0], self.L['restFade'])
            c['detail'] = f'frames {rf[1]}-{rf[2]}: largest face-box |delta| {num(rf[3], 3)} vs median {num(rf[4], 3)} around; {c["detail"]}'
            checks['restFade'] = c
            metrics['restFade'] = {'ratio': num(rf[0], 3), 'frames': [rf[1], rf[2]]}
        return {'checks': checks, 'metrics': metrics,
                'series': {'grade': [[g[0], num(g[1], 3), num(g[2], 3), num(g[3], 2)] for g in self.grade], 'sharpness': [[x[0], num(x[1], 3)] for x in self.sharp]},
                'artefacts': []}
