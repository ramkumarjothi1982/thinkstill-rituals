"""G-DRAFT safe zones (pixel side): no burned-in text where the platform's UI
sits or where the brand forbids it.

Forbidden zones (design px, PHASE2-PLAN G-DIR text rules): the right rail
(x > 900, 700 < y < 1500: the like/comment/share buttons), everything below
y = 1500 (caption and progress bar), the side margins (x < 60, x > 1020) and
the top band (y < 180), except the DRAFT/INTERNAL corner mark's own box.

Every `every`-th frame is scanned with the glyph/line detector
(qalib/text.py) at half the design resolution: a full-size video is halved, a
draft (0.5 scale) is scanned as it is. A detected line *intrudes* when at least
`intrudeFraction` of its box lies inside a zone; a line that only grazes a
zone is reported as a touch (warn). Text that can be read holds still: an
intrusion *persists* when the next scan finds the same content again (the
grayscale patch of the line matches the previous scan's within `shift` design
px, normalised correlation >= `persist`). Glyph-like fragments that shimmer
from scan to scan, such as a moving stripe pattern cutting a reflection into
pieces, do not count either way: a line whose patch lines up with itself one
period on (horizontal autocorrelation >= `periodic` at a shift of 0.4 of its
height or more; measured: text lines 0.25-0.54, stripe pieces 0.62-0.89) is a pattern, not text (patterns are G-FINAL flash's). The gate fails
when an intrusion persists over `sustainFrames` scans in a row. G-DIR checks the same rules on the direction's own text boxes; this
gate checks what the render actually shows.
"""
import os

import cv2
import numpy as np
from PIL import Image, ImageDraw

from qalib.checks import check, limits, longest_run
from qalib.text import detect_lines, periodicity
from flash import stripe_tiles

GATE = 'G-DRAFT:safezone'


def _inter(a, b):
    w = min(a[2], b[2]) - max(a[0], b[0])
    h = min(a[3], b[3]) - max(a[1], b[1])
    return max(0.0, w) * max(0.0, h)


class SafezoneGate:
    id = GATE

    def __init__(self, ctx):
        self.ctx = ctx
        self.L = limits(GATE)
        self.flashL = limits('G-FINAL:flash')
        self.s = ctx['scale']
        self.zones = {k: v for k, v in self.L['zones'].items()}
        mk = ctx.get('markBox')            # design px; the mark is allowed in its own corner
        self.mark = mk
        self.scans = []                    # (frame, intrusions [(zone, box, frac)], touches, persistent)
        self.worst = None
        self.prev = []                     # last scan's intrusions: (zone, box, gray patch)
        self.patterns = 0                  # glyph-like lines rejected as periodic patterns

    def wants(self, i):
        return i % self.L['every'] == 0

    def frame(self, i, f):
        s = self.s
        H, W = f.shape[:2]
        pad = self.L['pad']
        intr, touch, cur = [], [], []
        gray = cv2.cvtColor(f, cv2.COLOR_RGB2GRAY)
        P = self.flashL['pattern']
        small = cv2.resize(gray, tuple(P['size']), interpolation=cv2.INTER_AREA).astype(np.float64) / 255.0
        striped = {t[0] for t in stripe_tiles(small, P)}
        rows, cols = P['tiles']
        for name, z in self.zones.items():
            x0, y0 = max(0, int((z[0] - pad) * s)), max(0, int((z[1] - pad) * s))
            x1, y1 = min(W, int((z[2] + pad) * s)), min(H, int((z[3] + pad) * s))
            if x1 - x0 < 8 or y1 - y0 < 8:
                continue
            d = 2 if s > 0.75 else 1                     # analyse at about 0.5 px per design px
            crop = f[y0:y1, x0:x1]
            if d > 1:
                crop = cv2.resize(crop, ((x1 - x0) // d, (y1 - y0) // d), interpolation=cv2.INTER_AREA)
            for ln in detect_lines(crop, scale=s / d, level=self.L['level']):
                box = (x0 / s + ln['x0'] * d / s, y0 / s + ln['y0'] * d / s, x0 / s + ln['x1'] * d / s, y0 / s + ln['y1'] * d / s)
                area = max(1.0, (box[2] - box[0]) * (box[3] - box[1]))
                if self.mark and _inter(box, self.mark) / area > 0.5:
                    continue
                frac = _inter(box, z) / area
                if frac >= self.L['intrudeFraction']:
                    patch = self._patch(gray, box)
                    cx, cy = (box[0] + box[2]) / 2 * s, (box[1] + box[3]) / 2 * s
                    tile = min(rows - 1, int(cy / (H / rows))) * cols + min(cols - 1, int(cx / (W / cols)))
                    if tile in striped or (patch.size >= 16 and periodicity(patch, 0.4 * (box[3] - box[1]) * s) >= self.L['periodic']):
                        self.patterns += 1
                        continue
                    intr.append((name, [round(v, 1) for v in box], round(frac, 3)))
                    cur.append((name, box, patch))
                elif frac > 0:
                    touch.append((name, [round(v, 1) for v in box], round(frac, 3)))
        persistent = any(self._persists(c, gray) for c in cur) if cur else False
        self.prev = cur
        self.scans.append((i, intr, touch, persistent))
        if intr and (self.worst is None or len(intr) > len(self.worst[1])):
            self.worst = (i, intr, f.copy())

    def _patch(self, gray, box):
        s = self.s
        x0, y0, x1, y1 = (int(round(v * s)) for v in box)
        return gray[max(0, y0):max(0, y1), max(0, x0):max(0, x1)].astype(np.float32)

    def _persists(self, c, gray):
        """Does intrusion c show the same content as one of the previous scan's, within the shift?"""
        name, box, patch = c
        if patch.size < 16:
            return False
        sh = self.L['shift']
        s = self.s
        for pname, pbox, ppatch in self.prev:
            if pname != name or ppatch.size < 16:
                continue
            if _inter((pbox[0] - sh, pbox[1] - sh, pbox[2] + sh, pbox[3] + sh), box) <= 0:
                continue
            x0, y0 = max(0, int(round((pbox[0] - sh) * s))), max(0, int(round((pbox[1] - sh) * s)))
            x1, y1 = int(round((pbox[2] + sh) * s)), int(round((pbox[3] + sh) * s))
            win = gray[y0:y1, x0:x1].astype(np.float32)
            if win.shape[0] < ppatch.shape[0] or win.shape[1] < ppatch.shape[1] or float(ppatch.std()) < 1.0:
                continue
            if float(cv2.matchTemplate(win, ppatch, cv2.TM_CCOEFF_NORMED).max()) >= self.L['persist']:
                return True
        return False

    def result(self):
        flags = [s[3] for s in self.scans]
        run = longest_run(flags)                       # consecutive scans whose intrusion persisted from the scan before
        need = self.L['sustainFrames']
        frames = [s[0] for s in self.scans if s[1]]
        touches = [s[0] for s in self.scans if s[2] and not s[1]]
        zones = sorted({z for s in self.scans for (z, _, _) in s[1]})
        steady = [s[0] for s in self.scans if s[3]]
        checks = {
            'zones': check('fail' if run >= need else ('warn' if frames else 'pass'), run, need,
                           (f'text inside {", ".join(zones)}, holding still for {run} scans in a row (every {self.L["every"]} frames); first at frame {frames[0]}'
                            if run >= need else f'glyph-like structures inside {", ".join(zones)} in {len(frames)} scans, never holding still for {need} scans (first at frame {frames[0]})'
                            if frames else 'no text inside a forbidden zone'),
                           frames=frames[:40], steady=steady[:40], zones=zones),
            'touches': check('warn' if touches else 'pass', len(touches), None,
                             f'{len(touches)} scanned frames where a text line grazes a zone edge (less than {self.L["intrudeFraction"]:.0%} inside)'
                             if touches else 'no text grazes a forbidden zone', frames=touches[:40]),
        }
        art = []
        out = self.ctx.get('artefacts')
        if out and self.worst:
            i, intr, f = self.worst
            im = Image.fromarray(f)
            d = ImageDraw.Draw(im)
            s = self.s
            for z in self.zones.values():
                d.rectangle([z[0] * s, z[1] * s, z[2] * s, z[3] * s], outline=(255, 200, 0), width=3)
            for _, b, _ in intr:
                d.rectangle([b[0] * s, b[1] * s, b[2] * s, b[3] * s], outline=(255, 40, 40), width=4)
            p = os.path.join(out, 'safezone-worst.jpg')
            im.resize((im.width // 2, im.height // 2)).save(p, quality=85)
            art.append({'file': p, 'label': f'frame {i}: text in a forbidden zone (red), zones (amber)'})
        return {'checks': checks, 'metrics': {'scanned': len(self.scans), 'intrusionFrames': len(frames), 'steadyFrames': len(steady), 'periodicLines': self.patterns, 'longestRun': run, 'touchFrames': len(touches)},
                'artefacts': art}
