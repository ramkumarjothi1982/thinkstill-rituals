"""A detector for burned-in text: glyph components grouped into lines.

Text in a Hushmallow frame is drawn by the overlay (light Fredoka with an ink
shadow) or inside a glass card (dark ink on frosted glass). Either way a glyph
is a compact stroke structure, 10-110 design px tall, that stands out from its
local surroundings, and glyphs sit side by side on a common centre line.
Nothing else in the approved look has that signature: stars are specks, the
world is soft, the Mallow is a large blob, glass edges are long arcs.

  1. top-hat (light glyphs) and black-hat (dark glyphs) with an elliptical
     kernel a little wider than the thickest stroke remove everything broad;
  2. what remains above `level` is split into connected components, and only
     glyph-sized, glyph-shaped ones are kept;
  3. components on a shared centre line, of similar height and close
     horizontally are joined; a group of >= 3 glyphs is a line of text.

All sizes are in design px (1080 x 1920) times `scale` (video px per design px).
"""
import cv2
import numpy as np


def _odd(v):
    v = max(3, int(round(v)))
    return v if v % 2 else v + 1


def glyph_components(gray, scale=1.0, level=40, polarity=('light', 'dark')):
    """Glyph-like connected components of a uint8 grayscale image.

    -> list of dicts {x, y, w, h, area, cx, cy, polarity} in image px.
    """
    k = _odd(25 * scale)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))
    out = []
    hmin, hmax = 10 * scale, 110 * scale
    wmin, wmax = 2 * scale, 140 * scale
    amin = max(6, 15 * scale * scale)
    for pol in polarity:
        op = cv2.MORPH_TOPHAT if pol == 'light' else cv2.MORPH_BLACKHAT
        resp = cv2.morphologyEx(gray, op, kernel)
        binary = (resp >= level).astype(np.uint8)
        n, _, stats, cent = cv2.connectedComponentsWithStats(binary, connectivity=8)
        for j in range(1, n):
            x, y, w, h, a = (int(v) for v in stats[j])
            if not (hmin <= h <= hmax and wmin <= w <= wmax and a >= amin):
                continue
            fill = a / float(w * h)
            if not 0.08 <= fill <= 0.95:
                continue
            out.append({'x': x, 'y': y, 'w': w, 'h': h, 'area': a, 'cx': float(cent[j][0]), 'cy': float(cent[j][1]), 'polarity': pol})
    return out


def text_lines(comps, min_glyphs=3, max_comps=400):
    """Group glyph components into lines. -> list of {x0, y0, x1, y1, glyphs, polarity, height}."""
    lines = []
    for pol in ('light', 'dark'):
        cs = [c for c in comps if c['polarity'] == pol]
        if len(cs) > max_comps:                      # noise: keep the biggest, a line is never that dense
            cs = sorted(cs, key=lambda c: -c['area'])[:max_comps]
        cs.sort(key=lambda c: c['x'])
        parent = list(range(len(cs)))

        def find(i):
            while parent[i] != i:
                parent[i] = parent[parent[i]]
                i = parent[i]
            return i

        for i, a in enumerate(cs):
            for j in range(i + 1, len(cs)):
                b = cs[j]
                hmax = max(a['h'], b['h'])
                gap = b['x'] - (a['x'] + a['w'])
                if gap > 1.5 * hmax:
                    break                            # sorted by x: nothing further can be close
                if abs(a['cy'] - b['cy']) > 0.6 * hmax or max(a['h'], b['h']) > 2.2 * min(a['h'], b['h']):
                    continue
                parent[find(i)] = find(j)
        groups = {}
        for i in range(len(cs)):
            groups.setdefault(find(i), []).append(cs[i])
        for g in groups.values():
            if len(g) < min_glyphs:
                continue
            x0 = min(c['x'] for c in g)
            x1 = max(c['x'] + c['w'] for c in g)
            y0 = min(c['y'] for c in g)
            y1 = max(c['y'] + c['h'] for c in g)
            hmed = float(np.median([c['h'] for c in g]))
            if x1 - x0 < 1.5 * hmed:
                continue
            lines.append({'x0': x0, 'y0': y0, 'x1': x1, 'y1': y1, 'glyphs': len(g), 'polarity': pol, 'height': hmed})
    return lines


def periodicity(patch, min_shift):
    """Largest normalised autocorrelation of a grayscale line patch at a
    horizontal shift of at least min_shift px (up to half the patch width).

    A line of text is not periodic: shifting it by 0.4 of a glyph height or
    more lines up different letters. A stripe pattern cut into glyph-sized pieces lines up
    with itself one period on (close to 1). Horizontal stripes have no
    horizontal period, but they never form glyph-sized components either.
    """
    p = np.asarray(patch, dtype=np.float64)
    n = p.shape[1]
    best = 0.0
    for d in range(max(1, int(min_shift)), n // 2 + 1):
        a = p[:, :n - d] - p[:, :n - d].mean()
        b = p[:, d:] - p[:, d:].mean()
        den = np.sqrt((a * a).sum() * (b * b).sum())
        if den > 1e-9:
            best = max(best, float((a * b).sum() / den))
    return best


def gray_of(rgb):
    return cv2.cvtColor(np.ascontiguousarray(rgb), cv2.COLOR_RGB2GRAY)


def detect_lines(rgb, scale=1.0, level=40):
    """Text lines in an RGB crop. -> list of line dicts (crop px)."""
    return text_lines(glyph_components(gray_of(rgb), scale=scale, level=level))
