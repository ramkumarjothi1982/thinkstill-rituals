"""G-DUPES signature (pixel side): what a video looks like, compactly.

  anchors   a 64-bit perceptual hash (pHash: 32x32 grayscale, 2-D DCT, the
            8x8 lowest frequencies without DC against their median) at the
            7 anchor frames (cover, gag, impact, peak, ritual-mid, eyes-open,
            end-card; from the direction's probes, else fixed fractions of D)
  colour    a 3x3 grid of mean Lab per anchor (rounded), for WP-25's colour
            distance
The audio signature comes from qa/gates/audio.py. Matching against the
ledger happens in Node (qa/gates/dupes.mjs); the signature is also written
into the QA report so an approval can record it (WP-25).
"""
import cv2
import numpy as np

from qalib import color

GATE = 'G-DUPES'
FALLBACK = (('cover', 0.0), ('gag', 0.03), ('impact', 0.07), ('peak', 0.42), ('ritual-mid', 0.63), ('eyes-open', 0.81), ('end-card', 0.87))


def phash(rgb):
    g = cv2.cvtColor(np.ascontiguousarray(rgb), cv2.COLOR_RGB2GRAY)
    g = cv2.resize(g, (32, 32), interpolation=cv2.INTER_AREA).astype(np.float32)
    d = cv2.dct(g)[:8, :8].flatten()
    bits = d[1:] > np.median(d[1:])
    bits = np.concatenate([[False], bits])
    v = 0
    for b in bits:
        v = (v << 1) | int(b)
    return f'{v:016x}'


def hamming(a, b):
    return bin(int(a, 16) ^ int(b, 16)).count('1')


def anchor_frames(ctx):
    g = ctx.get('geometry')
    n = ctx['framesExpected']
    fps = ctx['fps']
    if g and g.get('probes'):
        want = [p for p in g['probes'] if p['label'] != 'rest-end'][:7]
        return [(p['label'], min(n - 1, int(round(p['t'] * fps)))) for p in want]
    return [(label, min(n - 1, int(round(frac * n)))) for label, frac in FALLBACK]


class SignatureGate:
    id = GATE

    def __init__(self, ctx):
        self.ctx = ctx
        self.anchors = anchor_frames(ctx)
        self.at = {}
        for label, i in self.anchors:
            self.at.setdefault(i, []).append(label)
        self.out = {}

    def wants(self, i):
        return i in self.at

    def frame(self, i, f):
        h = phash(f)
        lab = color.lab_from_linear(cv2.resize(color.linear(f), (3, 3), interpolation=cv2.INTER_AREA))
        for label in self.at[i]:
            self.out[label] = {'frame': i, 'phash': h, 'lab3x3': np.round(lab, 1).tolist()}

    def result(self):
        return {'checks': {}, 'metrics': {'anchors': [{'label': l, 'frame': i} for l, i in self.anchors]},
                'signature': {'anchors': [{'label': l, 'frame': self.out[l]['frame'], 'phash': self.out[l]['phash']} for l, _ in self.anchors if l in self.out],
                              'colour': {l: self.out[l]['lab3x3'] for l, _ in self.anchors if l in self.out}},
                'artefacts': []}
