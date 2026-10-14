"""G-DRAFT text contrast: every readable text >= 4.5:1 against what is behind it.

For each text item of the direction (overlay rows and the text on glass
cards; the logo plate has its own gate) at the frames where it is readable
(alpha >= `alphaMin`, from qa/gates/geometry.mjs), the item's box is cropped
from the frame and:

  glyphs   top-hat (light text) or black-hat (dark ink) response >= `level`,
           eroded by 1 px so anti-aliased edges do not count as fill
  fill     the median relative luminance of the glyph pixels
  ring     a dilated background ring around the glyphs (from `ringInner` to
           `ringOuter` px), excluding the glyphs themselves
  contrast WCAG ratio of the fill against the ring's worst case: its p90
           luminance for light text, its p10 for dark text

An item's contrast is the median over its readable frames; the gate fails
when any item is below `minContrast`. (The plan words it as "glyph fill
against the p10 luminance of a dilated background ring"; for light text the
conservative side of the ring is its bright end, so light text uses p90. See
docs/QA.md.)
"""
import cv2
import numpy as np

from qalib.checks import band, check, limits, num
from qalib.color import luminance, contrast_ratio

GATE = 'G-DRAFT:readability'


def _odd(v):
    v = max(3, int(round(v)))
    return v if v % 2 else v + 1


def item_contrast(crop, polarity, scale, L):
    gray = cv2.cvtColor(np.ascontiguousarray(crop), cv2.COLOR_RGB2GRAY)
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (_odd(L['kernel'] * scale),) * 2)
    resp = cv2.morphologyEx(gray, cv2.MORPH_TOPHAT if polarity == 'light' else cv2.MORPH_BLACKHAT, k)
    glyph = (resp >= L['level']).astype(np.uint8)
    if glyph.sum() < 30:
        return None
    core = cv2.erode(glyph, np.ones((3, 3), np.uint8))
    if core.sum() < 15:
        core = glyph
    ri, ro = _odd(L['ringInner'] * scale), _odd(L['ringOuter'] * scale)
    inner = cv2.dilate(glyph, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (ri, ri)))
    outer = cv2.dilate(glyph, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (ro, ro)))
    ring = (outer > 0) & (inner == 0)
    if ring.sum() < 30:
        return None
    Y = luminance(crop)
    fill = float(np.median(Y[core > 0]))
    bg = float(np.percentile(Y[ring], 90 if polarity == 'light' else 10))
    return contrast_ratio(fill, bg), fill, bg


class ReadabilityGate:
    id = GATE

    def __init__(self, ctx):
        self.ctx = ctx
        self.L = limits(GATE)
        self.g = ctx.get('geometry')
        self.items = {}            # id -> list of (frame, contrast, fill, bg)

    def wants(self, i):
        return self.g is not None and i % self.L['every'] == 0 and i < len(self.g['perFrame'])

    def frame(self, i, f):
        s = self.ctx['scale']
        H, W = f.shape[:2]
        pad = self.L['pad']
        for it in self.g['perFrame'][i]['text']:
            if it['kind'] == 'logo' or it['alpha'] < self.L['alphaMin']:
                continue
            b = it['box']
            x0, y0 = max(0, int((b[0] - pad) * s)), max(0, int((b[1] - pad) * s))
            x1, y1 = min(W, int((b[2] + pad) * s)), min(H, int((b[3] + pad) * s))
            if x1 - x0 < 10 or y1 - y0 < 10:
                continue
            r = item_contrast(f[y0:y1, x0:x1], it['polarity'], s, self.L)
            if r:
                self.items.setdefault(it['id'].split(':')[0] if it['kind'] == 'glass' else it['id'], []).append((i,) + r)

    def result(self):
        if self.g is None:
            return {'checks': {'contrast': check('not-run', detail='no direction geometry: text boxes unknown')}, 'metrics': {}, 'artefacts': []}
        per = {}
        for k, v in self.items.items():
            c = [x[1] for x in v]
            per[k] = {'frames': len(v), 'median': num(np.median(c), 2), 'min': num(min(c), 2),
                      'fill': num(np.median([x[2] for x in v]), 4), 'background': num(np.median([x[3] for x in v]), 4)}
        if not per:
            return {'checks': {'contrast': check('not-run', detail='no readable text found in the scanned frames')}, 'metrics': {}, 'artefacts': []}
        checks = {}
        for kind, name in (('overlay', 'overlay'), ('glass', 'glass')):
            items = {k: v for k, v in per.items() if (k == 'glass') == (kind == 'glass')}
            if not items:
                checks[name] = check('pass', None, self.L['minContrast'][kind]['fail'], f'no readable {kind} text in this video')
                continue
            worst = min(items, key=lambda k: items[k]['median'])
            c = band(items[worst]['median'], self.L['minContrast'][kind], higher_is_worse=False, unit=':1')
            c['detail'] = f'lowest median contrast {items[worst]["median"]}:1 ({worst}, {items[worst]["frames"]} frames); ' + c['detail']
            checks[name] = c
        return {'checks': checks,
                'metrics': {'items': per}, 'artefacts': []}
