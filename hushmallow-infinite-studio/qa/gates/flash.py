"""G-FINAL flash and pattern (brand rule, stricter than WCAG 2.3.1).

Measured on linear relative luminance averaged over a 34 x 60 block grid
(every second pixel of each block: a block mean over 15 x 16 samples instead
of 31 x 32 pixels, statistically the same and four times cheaper).

  flash      a transition between consecutive frames in which >= 25 % of the
             blocks change by >= 10 % of full luminance while the darker state
             of those blocks averages < 0.8. The brand allows none.
  red        the same rule on WCAG's saturated-red quantity: per block
             (R - G - B) * 320 when R / (R + G + B) >= 0.8 (sRGB 0..1), a block
             changing by > 20. The brand allows none.
  pattern    a moving periodic pattern (the Zuzu stripe check): >= 25 % of the
             frame's tiles carry one strong periodic component with > 5 stripe
             pairs across the pattern, and its phase moves between frames.
  wcag       reported only: the most WCAG general flashes (pairs of opposing
             >= 10 % transitions) in any 1-second window.
The film loops, so the wrap from the last frame back to frame 0 is judged as
one more transition.
"""
import numpy as np
import cv2

from qalib.color import SRGB_TO_LINEAR, LUMA709
from qalib.checks import check, limits, num, band

GATE = 'G-FINAL:flash'


def block_stats(f, gx=34, gy=60):
    """(luminance blocks, red-quantity blocks) of an RGB frame, on every second pixel.

    Block means are exact box averages: the subsampled frame is cropped to a
    whole number of blocks and reduced with INTER_AREA at an integer factor.
    """
    sub = f[::2, ::2]
    h, w = sub.shape[:2]
    bh, bw = h // gy, w // gx
    sub = np.ascontiguousarray(sub[:bh * gy, :bw * gx])
    lin = SRGB_TO_LINEAR[sub]
    y = cv2.transform(lin, LUMA709.reshape(1, 3))
    L = cv2.resize(y, (gx, gy), interpolation=cv2.INTER_AREA).astype(np.float64)
    c = cv2.resize(sub.astype(np.float32), (gx, gy), interpolation=cv2.INTER_AREA).astype(np.float64) / 255.0
    s = c.sum(axis=-1)
    ratio = np.where(s > 1e-6, c[..., 0] / np.maximum(s, 1e-6), 0.0)
    red = np.where(ratio >= 0.8, (c[..., 0] - c[..., 1] - c[..., 2]) * 320.0, 0.0)
    return L, np.maximum(red, 0.0)


_TILE_CACHE = {}


def _tile_basis(th, tw, min_cycles):
    key = (th, tw, min_cycles)
    if key not in _TILE_CACHE:
        win = np.outer(np.hanning(th), np.hanning(tw))
        ky = np.fft.fftfreq(th) * th
        kx = np.fft.rfftfreq(tw) * tw
        KY, KX = np.meshgrid(ky, kx, indexing='ij')
        _TILE_CACHE[key] = (win, KY, KX, np.hypot(KY, KX) < min_cycles, float(win.sum()))
    return _TILE_CACHE[key]


def stripe_tiles(gray, lim):
    """Per-tile dominant periodic component of a small grayscale frame (0..1 floats).

    -> list of (tile index, (ky, kx), amplitude, share, phase) for striped tiles.
    """
    rows, cols = lim['tiles']
    h, w = gray.shape
    th, tw = h // rows, w // cols
    win, KY, KX, low, wsum = _tile_basis(th, tw, lim['minCyclesPerTile'])
    tiles = gray[:th * rows, :tw * cols].reshape(rows, th, cols, tw).transpose(0, 2, 1, 3)
    tiles = tiles - tiles.mean(axis=(2, 3), keepdims=True)
    F = np.fft.rfft2(tiles * win, axes=(2, 3))
    mag = np.abs(F)
    mag[:, :, low] = 0.0
    out = []
    for r in range(rows):
        for c in range(cols):
            m = mag[r, c]
            tot = float((m ** 2).sum())
            if tot <= 1e-12:
                continue
            j = int(np.argmax(m))
            share = float(m.flat[j] ** 2 / tot)
            amp = float(2.0 * m.flat[j] / wsum)      # sinusoid amplitude in luminance units
            if share >= lim['peakShare'] and amp >= lim['amplitude']:
                out.append((r * cols + c, (float(KY.flat[j]), float(KX.flat[j])), amp, share, float(np.angle(F[r, c].flat[j]))))
    return out


class FlashGate:
    id = GATE

    def __init__(self, ctx):
        self.ctx = ctx
        self.L = limits(GATE)
        self.prev = self.first = None
        self.pairs = []          # per consecutive pair: (share, meanDelta, flash, sign, redShare, redFlash)
        self.pattern = []        # per analysed frame: (frame, striped tiles, moving)
        self.prev_tiles = None

    def wants(self, i):
        return True

    def transition(self, a, b):
        """(share, meanDelta, flash, sign, redShare, redFlash) from block stats a to b."""
        (pL, pR), (L, R) = a, b
        dL = np.abs(L - pL)
        big = dL >= self.L['changeMin']
        share = float(big.mean())
        darker = float(np.minimum(L, pL)[big].mean()) if big.any() else 1.0
        fl = share >= self.L['areaMin'] and darker < self.L['darkerMax']
        sign = float(np.sign((L - pL)[big].mean())) if big.any() else 0.0
        rshare = float((np.abs(R - pR) > self.L['red']['change']).mean())
        return (share, float(dL.mean()), fl, sign, rshare, rshare >= self.L['areaMin'])

    def frame(self, i, f):
        cur = block_stats(f, *self.L['blockGrid'])
        if self.prev is None:
            self.first = cur
        else:
            self.pairs.append(self.transition(self.prev, cur))
        self.prev = cur
        P = self.L['pattern']
        if i % P['every'] == 0:
            small = cv2.resize(cv2.cvtColor(f, cv2.COLOR_RGB2GRAY), tuple(P['size']), interpolation=cv2.INTER_AREA).astype(np.float64) / 255.0
            tiles = stripe_tiles(small, P)
            moving = False
            if tiles and self.prev_tiles:
                prev = {t[0]: t for t in self.prev_tiles}
                for t in tiles:
                    p = prev.get(t[0])
                    if p and abs(np.angle(np.exp(1j * (t[4] - p[4])))) > P['phaseMove']:
                        moving = True
            ntile = P['tiles'][0] * P['tiles'][1]
            cycles = max((np.hypot(*t[1]) for t in tiles), default=0.0)
            pattern = len(tiles) >= P['areaMin'] * ntile and cycles * max(1, len(tiles)) ** 0.5 > P['minPairs']
            self.pattern.append((i, len(tiles), bool(pattern and moving)))
            self.prev_tiles = tiles

    def result(self):
        fps = self.ctx['fps']
        if self.prev is not None and len(self.pairs) > 1:
            self.pairs.append(self.transition(self.prev, self.first))      # the loop's wrap
        flashes = [k for k, p in enumerate(self.pairs) if p[2]]
        reds = [k for k, p in enumerate(self.pairs) if p[5]]
        moving = sum(1 for p in self.pattern if p[2])
        # WCAG (report only): a flash is a pair of opposing transitions; count them per 1 s window
        trans = [(k, p[3]) for k, p in enumerate(self.pairs) if p[0] >= self.L['areaMin'] and p[3] != 0]
        best = 0
        for k0, _ in trans:
            win = [s for k, s in trans if k0 <= k < k0 + fps]
            pairs = sum(1 for a, b in zip(win, win[1:]) if a != b)
            best = max(best, (pairs + 1) // 2)
        P = self.L['pattern']
        checks = {
            'flash': check('pass' if len(flashes) <= self.L['maxFlashes'] else 'fail', len(flashes), self.L['maxFlashes'],
                           f'{len(flashes)} brand flashes' + (f' at frames {[k + 1 for k in flashes[:8]]}' if flashes else ''),
                           frames=[k + 1 for k in flashes[:50]]),
            'red': check('pass' if len(reds) <= self.L['red']['maxFlashes'] else 'fail', len(reds), self.L['red']['maxFlashes'],
                         f'{len(reds)} saturated-red flashes' + (f' at frames {[k + 1 for k in reds[:8]]}' if reds else '')),
            'pattern': check('pass' if moving <= P['maxMovingFrames'] else 'fail', moving, P['maxMovingFrames'],
                             f'{moving} analysed frames (every {P["every"]}) show a moving stripe pattern over >= {int(P["areaMin"] * 100)} % of the frame'),
            'wcag': check('pass' if best <= 3 else 'warn', best, 3, f'WCAG 2.3.1 general flashes, worst 1 s window: {best} (reported only)', reportOnly=True),
        }
        share = [p[0] for p in self.pairs]
        metrics = {
            'pairs': len(self.pairs), 'flashCount': len(flashes), 'redFlashCount': len(reds),
            'maxShareChanging10pct': num(max(share, default=0), 5), 'maxMeanBlockDelta': num(max((p[1] for p in self.pairs), default=0), 5),
            'maxRedShare': num(max((p[4] for p in self.pairs), default=0), 5),
            'maxStripedTiles': max((p[1] for p in self.pattern), default=0), 'wcagWorstWindow': best,
        }
        return {'checks': checks, 'metrics': metrics, 'series': {'shareChanging': [num(s, 4) for s in share]}, 'artefacts': []}
