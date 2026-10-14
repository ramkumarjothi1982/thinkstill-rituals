"""G-FINAL loop seam (picture): the jump from the last frame back to frame 0.

  seam    mean |delta| (RGB, 0..255) from the last frame to frame 0
  limit   max(1.15 x the median consecutive |delta| over quiet pairs, p90 of all
          consecutive |delta|), where quiet pairs are those at or below the median
The same inside the face box (union of the face's screen boxes at the first
and last frame, from the direction's geometry). The audio side of the seam
is G-AUDIO's.
"""
import os

import cv2
import numpy as np
from PIL import Image

from qalib.checks import check, limits, num

GATE = 'G-FINAL:seam'


def seam_stats(deltas, seam, k):
    d = np.asarray(deltas, dtype=np.float64)
    med = float(np.median(d))
    qmed = float(np.median(d[d <= med]))
    p90 = float(np.percentile(d, 90))
    lim = max(k * qmed, p90)
    return {'seam': num(seam), 'median': num(med), 'quietMedian': num(qmed), 'p90': num(p90), 'limit': num(lim), 'ratio': num(seam / lim if lim else 0)}


def mean_absdiff(a, b):
    return float(np.mean(cv2.mean(cv2.absdiff(a, b))[:3]))


class SeamGate:
    id = GATE

    def __init__(self, ctx):
        self.ctx = ctx
        self.L = limits(GATE)
        self.first = self.prev = None
        self.deltas, self.fdeltas = [], []
        self.box = None
        g = ctx.get('geometry')
        if g:
            pf = g['perFrame']
            a, b = pf[0]['faceBox'], pf[-1]['faceBox']
            s = ctx['scale']
            W, H = ctx['width'], ctx['height']
            x0, y0 = max(0, int(min(a[0], b[0]) * s)), max(0, int(min(a[1], b[1]) * s))
            x1, y1 = min(W, int(np.ceil(max(a[2], b[2]) * s))), min(H, int(np.ceil(max(a[3], b[3]) * s)))
            if x1 - x0 > 8 and y1 - y0 > 8:
                self.box = (x0, y0, x1, y1)

    def wants(self, i):
        return True

    def frame(self, i, f):
        if self.first is None:
            self.first = f
        if self.prev is not None:
            self.deltas.append(mean_absdiff(f, self.prev))
            if self.box:
                x0, y0, x1, y1 = self.box
                self.fdeltas.append(mean_absdiff(f[y0:y1, x0:x1], self.prev[y0:y1, x0:x1]))
        self.prev = f

    def result(self):
        if self.first is None or len(self.deltas) < 10:
            return {'checks': {'seam': check('not-run', detail='fewer than 11 frames decoded')}, 'metrics': {}, 'artefacts': []}
        k = self.L['quietFactor']
        whole = seam_stats(self.deltas, mean_absdiff(self.prev, self.first), k)
        checks = {'seam': check('pass' if whole['seam'] <= whole['limit'] else 'fail', whole['seam'], whole['limit'],
                                f"last -> first {whole['seam']} vs limit {whole['limit']} (quiet median {whole['quietMedian']} x {k}, p90 {whole['p90']})")}
        metrics = {'whole': whole}
        if self.box:
            x0, y0, x1, y1 = self.box
            face = seam_stats(self.fdeltas, mean_absdiff(self.prev[y0:y1, x0:x1], self.first[y0:y1, x0:x1]), k)
            checks['seamFace'] = check('pass' if face['seam'] <= face['limit'] else 'fail', face['seam'], face['limit'],
                                       f"face box {list(self.box)}: {face['seam']} vs limit {face['limit']}")
            metrics['face'] = face
            metrics['faceBox'] = list(self.box)
        else:
            checks['seamFace'] = check('not-run', detail='no direction geometry: the face box is unknown')
        art = []
        out = self.ctx.get('artefacts')
        if out:
            a = cv2.resize(self.prev, (270, 480), interpolation=cv2.INTER_AREA)
            b = cv2.resize(self.first, (270, 480), interpolation=cv2.INTER_AREA)
            d = cv2.resize(cv2.absdiff(self.prev, self.first), (270, 480), interpolation=cv2.INTER_AREA)
            d = np.clip(d.astype(np.float32) * 4, 0, 255).astype(np.uint8)
            p = os.path.join(out, 'seam-pair.jpg')
            Image.fromarray(np.hstack([a, b, d])).save(p, quality=88)
            art.append({'file': p, 'label': 'last frame | frame 0 | |difference| x4'})
        return {'checks': checks, 'metrics': metrics, 'series': {'deltas': [num(d, 3) for d in self.deltas]}, 'artefacts': art}
