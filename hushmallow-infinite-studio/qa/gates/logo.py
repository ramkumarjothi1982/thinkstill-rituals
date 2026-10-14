"""G-FINAL logo: the wordmark is shown untouched at full alpha.

The reference is a probe of the LogoCard drawn by the engine's own class at
the same options and time (qa/gates/probes.mjs). Over the frames where the
card is at full alpha and full scale, the video's crop is averaged (the
grain is time-seeded, so averaging removes most of it and of the codec
noise), then compared with the probe where the probe is opaque (the plate and
the cores of the hushmallow.com glyphs):

  ssim     luminance SSIM: a rescaled or shifted logo collapses it
  colour   mean dE2000: a tinted logo raises it
"""
import os

import cv2
import numpy as np
from PIL import Image

from qalib import color
from qalib.checks import band, check, limits, num, not_run
from qalib.ssim import ssim

GATE = 'G-FINAL:logo'


class LogoGate:
    id = GATE

    def __init__(self, ctx):
        self.ctx = ctx
        self.L = limits(GATE)
        self.probes = ctx.get('logoProbes') or []
        self.acc = {}
        self.want = {}
        for p in self.probes:
            for i in range(p['frames'][0], p['frames'][1] + 1):
                self.want.setdefault(i, []).append(p)

    def wants(self, i):
        return i in self.want

    def frame(self, i, f):
        s = self.ctx['scale']
        for p in self.want[i]:
            x0, y0 = int(round(p['x'] * s)), int(round(p['y'] * s))
            w, h = int(round(p['w'] * s)), int(round(p['h'] * s))
            crop = f[y0:y0 + h, x0:x0 + w].astype(np.float64)
            a = self.acc.setdefault(p['id'], [np.zeros_like(crop), 0])
            if a[0].shape == crop.shape:
                a[0] += crop
                a[1] += 1

    def result(self):
        if not self.probes:
            return {'checks': {'ssim': not_run('the direction has no logo card'), 'colour': not_run('the direction has no logo card')},
                    'metrics': {}, 'artefacts': []}
        checks, metrics, art = {}, {}, []
        for p in self.probes:
            a = self.acc.get(p['id'])
            if not a or a[1] == 0:
                checks['ssim'] = checks['colour'] = not_run(f'no full-alpha frame of {p["id"]} decoded')
                continue
            mean = a[0] / a[1]
            P = np.array(Image.open(p['png']).convert('RGBA'))
            s = self.ctx['scale']
            if s != 1:
                P = cv2.resize(P, (mean.shape[1], mean.shape[0]), interpolation=cv2.INTER_AREA)
            mask = P[..., 3] >= 250
            pg = cv2.cvtColor(np.ascontiguousarray(P[..., :3]), cv2.COLOR_RGB2GRAY).astype(np.float64)
            vg = cv2.cvtColor(np.clip(mean, 0, 255).astype(np.uint8), cv2.COLOR_RGB2GRAY).astype(np.float64)
            sv = ssim(vg, pg, mask)
            de = color.de2000(color.lab_from_float_srgb(mean[mask]), color.lab(P[..., :3][mask]))
            dv = float(de.mean())
            checks['ssim'] = band(sv, self.L['ssim'], higher_is_worse=False)
            checks['ssim']['detail'] = f'luminance SSIM {num(sv, 4)} over {int(mask.sum())} opaque probe px, mean of {a[1]} full-alpha frames; ' + checks['ssim']['detail']
            checks['colour'] = band(dv, self.L['colourDE'])
            checks['colour']['detail'] = f'mean dE2000 {num(dv, 3)} (p99 {num(np.percentile(de, 99), 2)}); ' + checks['colour']['detail']
            metrics[p['id']] = {'ssim': num(sv, 5), 'dE': num(dv, 3), 'dEp99': num(np.percentile(de, 99), 3), 'frames': a[1], 'window': p['frames']}
            out = self.ctx.get('artefacts')
            if out:
                f = os.path.join(out, f'logo-{p["id"]}.png')
                Image.fromarray(np.hstack([np.clip(mean, 0, 255).astype(np.uint8), P[..., :3]])).save(f)
                art.append({'file': f, 'label': 'logo card: video (mean of full-alpha frames) | engine probe'})
        return {'checks': checks, 'metrics': metrics, 'artefacts': art}
