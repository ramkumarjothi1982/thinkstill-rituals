"""G-FINAL brand marks (pixel side): is a DRAFT / INTERNAL corner mark burned in?

The templates are the engine's own Marks canvases (qa/gates/probes.mjs) at
the video's output scale, placed where the renderer draws them. On every
`every`-th frame the normalised cross-correlation between the frame's
luminance and each template is taken over the template's opaque pixels
(stroke and lettering), allowing a small shift. A mark is present when the
median best NCC reaches `present`. Whether a mark *must* be there is decided
in Node (spec draft/internal, render parameters), qa/gates/brand-marks.mjs.
"""
import cv2
import numpy as np
from PIL import Image

from qalib.checks import limits, num

GATE = 'G-FINAL:brand-marks'


class MarksGate:
    id = GATE

    def __init__(self, ctx):
        self.ctx = ctx
        self.L = limits(GATE)
        self.tpl = []
        for m in ctx.get('markProbes') or []:
            T = np.array(Image.open(m['png']).convert('RGBA'))
            mask = T[..., 3] >= 200
            g = cv2.cvtColor(np.ascontiguousarray(T[..., :3]), cv2.COLOR_RGB2GRAY).astype(np.float64)[mask]
            self.tpl.append((m, mask, (g - g.mean()) / (g.std() + 1e-9)))
        self.scores = {m['label']: [] for m, _, _ in self.tpl}

    def wants(self, i):
        return bool(self.tpl) and i % self.L['every'] == 0

    def frame(self, i, f):
        g = cv2.cvtColor(f, cv2.COLOR_RGB2GRAY).astype(np.float64)
        H, W = g.shape
        r = self.L['search']
        for m, mask, t in self.tpl:
            best = -1.0
            for dy in range(-r, r + 1):
                for dx in range(-r, r + 1):
                    y, x = m['y'] + dy, m['x'] + dx
                    if x < 0 or y < 0 or x + m['w'] > W or y + m['h'] > H:
                        continue
                    c = g[y:y + m['h'], x:x + m['w']][mask]
                    c = (c - c.mean()) / (c.std() + 1e-9)
                    best = max(best, float((c * t).mean()))
            self.scores[m['label']].append(best)

    def result(self):
        per = {k: (float(np.median(v)) if v else None) for k, v in self.scores.items()}
        found = [k for k, v in per.items() if v is not None and v >= self.L['present']]
        best = max(found, key=lambda k: per[k]) if found else None
        return {'checks': {}, 'metrics': {'ncc': {k: num(v, 3) for k, v in per.items()}, 'present': self.L['present'],
                                         'detected': best, 'frames': len(next(iter(self.scores.values()), []))},
                'artefacts': []}
