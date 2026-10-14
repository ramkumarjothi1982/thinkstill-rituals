"""G-FINAL figure-ground: the Mallow separates from its world.

Per analysed frame, the Mallow's silhouette (the direction's contour on
screen) is filled at half resolution; the body colour is the mean Lab inside
the silhouette eroded by `inset` px, outside the face box; the ground colour
is the mean Lab of a ring from `ringGap` to `ring` px outside the silhouette
(the plan's 40 px ring), minus glass cards, text and the frame border. The
value is dE2000 between the two means. Like the grade guard, the gate takes
the lowest value held for `sustainFrames` frames, so a single odd frame
(a flash, a cut) does not decide it. This catches blue-on-blue (Loomi),
orange-on-apricot (Boppo) and a dark Glitzi on a night sky.
"""
import cv2
import numpy as np

from qalib import color
from qalib.checks import band, check, limits, num, not_run
from fidelity import sustained

GATE = 'G-FINAL:figure-ground'


class FigureGroundGate:
    id = GATE

    def __init__(self, ctx):
        self.ctx = ctx
        self.L = limits(GATE)
        self.g = ctx.get('geometry')
        self.values = []          # (frame, dE)

    def wants(self, i):
        return self.g is not None and i % self.L['every'] == 0 and i < len(self.g['perFrame'])

    def frame(self, i, f):
        k = 0.5 * self.ctx['scale']          # half-resolution analysis: design px -> analysis px
        small = cv2.resize(f, (f.shape[1] // 2, f.shape[0] // 2), interpolation=cv2.INTER_AREA)
        h, w = small.shape[:2]
        fr = self.g['perFrame'][i]
        poly = (np.asarray(fr['contour'], np.float32).reshape(-1, 2) * k).astype(np.int32)
        body = np.zeros((h, w), np.uint8)
        cv2.fillPoly(body, [poly], 1)
        if body.sum() < 200:
            return
        def ell(r):
            r = max(3, int(round(r * k)) * 2 + 1)
            return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (r, r))
        core = cv2.erode(body, ell(self.L['inset']))
        fb = fr['faceBox']
        core[max(0, int(fb[1] * k)):int(fb[3] * k), max(0, int(fb[0] * k)):int(fb[2] * k)] = 0
        ring = cv2.dilate(body, ell(self.L['ring'])) & ~cv2.dilate(body, ell(self.L['ringGap'])) & 1
        for b in [x[:4] for x in fr['glass']] + [t['box'] for t in fr['text']]:
            ring[max(0, int(b[1] * k)):max(0, int(b[3] * k)), max(0, int(b[0] * k)):max(0, int(b[2] * k))] = 0
            core[max(0, int(b[1] * k)):max(0, int(b[3] * k)), max(0, int(b[0] * k)):max(0, int(b[2] * k))] = 0
        ring[:2, :] = ring[-2:, :] = 0
        ring[:, :2] = ring[:, -2:] = 0
        if core.sum() < 100 or ring.sum() < 100:
            return
        lin = color.linear(small)
        lb = color.lab_from_linear(lin[core > 0].mean(0))
        lr = color.lab_from_linear(lin[ring > 0].mean(0))
        self.values.append((i, float(color.de2000(lb, lr))))

    def result(self):
        if self.g is None:
            return {'checks': {'contrast': not_run('no direction geometry: the Mallow cannot be located')}, 'metrics': {}, 'artefacts': []}
        if not self.values:
            return {'checks': {'contrast': not_run('no analysed frame showed the Mallow and its ring')}, 'metrics': {}, 'artefacts': []}
        n = max(1, self.L['sustainFrames'] // self.L['every'])
        v = sustained([x[1] for x in self.values], n, 'low')
        c = band(v, self.L['dE'], higher_is_worse=False)
        c['detail'] = f'lowest body-vs-ring dE2000 held for {self.L["sustainFrames"]} frames: {num(v, 2)}; {c["detail"]}'
        dv = [x[1] for x in self.values]
        return {'checks': {'contrast': c},
                'metrics': {'analysed': len(self.values), 'sustainedMin': num(v, 2), 'min': num(min(dv), 2), 'median': num(np.median(dv), 2)},
                'series': {'dE': [[x[0], num(x[1], 2)] for x in self.values]}, 'artefacts': []}
