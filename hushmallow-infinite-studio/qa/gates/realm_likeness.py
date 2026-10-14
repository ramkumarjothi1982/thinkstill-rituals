"""G-FINAL realm likeness: the render looks like its realm at each mood.

The frame is reduced to a 9 x 16 grid (columns x rows) of Lab colours
(area-averaged in linear light). Frames are classed by the direction's world
dials: 'tense' when tension >= `moodMin`, 'resolved' when warmth >= `moodMin`,
'base' when both are <= `baseMax`; transitional frames are skipped. Per mood
the median grid over its frames is compared with the realm's reference grid
for that mood: mean dE2000 over the cells. The gate value is the worst mood.

References live in qa/fixtures/ref/realms/<realm>.json. Until WP-19 captures
the app's own realm stills they are measured from the approved v2 (marked
provisional): the owner's realm checkpoint stills stay the primary on-model
check (PHASE2-PLAN G-FINAL world).
"""
import json

import cv2
import numpy as np

from qalib import color
from qalib.checks import band, check, limits, num, not_run

GATE = 'G-FINAL:realm-likeness'
COLS, ROWS = 9, 16


def lab_grid(f):
    lin = color.linear(f)
    small = cv2.resize(lin, (COLS, ROWS), interpolation=cv2.INTER_AREA)
    return color.lab_from_linear(small)


def mood_of(tension, warmth, L):
    if tension >= L['moodMin'] and tension >= warmth:
        return 'tense'
    if warmth >= L['moodMin']:
        return 'resolved'
    if tension <= L['baseMax'] and warmth <= L['baseMax']:
        return 'base'
    return None


class RealmLikenessGate:
    id = GATE

    def __init__(self, ctx):
        self.ctx = ctx
        self.L = limits(GATE)
        self.g = ctx.get('geometry')
        self.ref = None
        if ctx.get('realmRef'):
            with open(ctx['realmRef']) as fh:
                self.ref = json.load(fh)
        self.grids = {}

    def wants(self, i):
        return self.g is not None and i % self.L['every'] == 0 and i < len(self.g['perFrame'])

    def frame(self, i, f):
        t, w = self.g['perFrame'][i]['mood']
        m = mood_of(t, w, self.L)
        if m:
            self.grids.setdefault(m, []).append(lab_grid(f))

    def grids_median(self):
        return {m: np.median(np.stack(v), axis=0) for m, v in self.grids.items()}

    def result(self):
        med = self.grids_median()
        if self.g is None:
            return {'checks': {'likeness': not_run('no direction geometry: moods unknown')}, 'metrics': {}, 'artefacts': []}
        if self.ref is None:
            return {'checks': {'likeness': not_run(f'no reference stills for realm {self.ctx.get("realm")} (qa/fixtures/ref/realms/)')},
                    'metrics': {'moods': {m: len(v) for m, v in self.grids.items()}}, 'grids': {m: np.round(g, 2).tolist() for m, g in med.items()}, 'artefacts': []}
        per = {}
        for m, g in med.items():
            r = self.ref['moods'].get(m)
            if r is None:
                continue
            per[m] = float(color.de2000(g, np.asarray(r['grid'], dtype=np.float64)).mean())
        if not per:
            return {'checks': {'likeness': not_run('no mood of this video has a reference')}, 'metrics': {}, 'artefacts': []}
        worst = max(per, key=per.get)
        c = band(per[worst], self.L['dE'])
        c['detail'] = f'worst mood {worst}: mean dE2000 {num(per[worst], 2)} over the 9x16 grid; {c["detail"]}'
        if self.ref.get('provisional'):
            c['provisional'] = True
        return {'checks': {'likeness': c}, 'metrics': {'perMood': {m: num(v, 2) for m, v in per.items()}, 'frames': {m: len(v) for m, v in self.grids.items()},
                                                         'reference': self.ref.get('source')},
                'grids': {m: np.round(g, 2).tolist() for m, g in med.items()}, 'artefacts': []}
