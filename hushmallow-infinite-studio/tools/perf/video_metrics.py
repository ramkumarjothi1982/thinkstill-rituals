"""Loop-seam and flash metrics of a rendered film (WP-02 criterion: final within 2 % of exact).

    python3 -I tools/perf/video_metrics.py <video.mp4> [<video2.mp4> …] [--face x0,y0,x1,y1] [--json out.json]

With exactly two videos it also reports the second's relative change against the first
(within2pct: every seam and flash number within 2 %, the same flash count).

The definitions follow PHASE2-PLAN's G-FINAL gates (WP-05 owns the gates
themselves; this is the measurement WP-02 needs to compare two profiles):

Loop seam
  seam      mean |delta| (RGB, 0..255) from the last frame to frame 0
  median    median of the consecutive mean |delta| inside the film (frames 0..N-1)
  p90       90th percentile of the same
  quietMedian  median over "quiet" consecutive pairs (those at or below the median)
  limit     max(1.15 x quietMedian, p90): the seam must not exceed it
  The same four numbers inside the face box (--face, output px), when given.

Flash (brand rule, stricter than WCAG; plan: v2 must pass)
  Linear relative luminance (sRGB decode, BT.709 weights) averaged over a 34 x 60
  block grid. A transition between consecutive frames is a FLASH when 25 % or more
  of the blocks change by 10 % or more of full luminance and the darker state of
  those blocks is below 0.8. Reported: the flash count (must be 0), the largest
  share of blocks changing >= 10 % in any frame pair, and the largest mean block
  luminance change.
"""
import json, subprocess, sys
import numpy as np

W, H = 1080, 1920
GX, GY = 34, 60


def frames(path):
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', path, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
    size = W * H * 3
    while True:
        buf = p.stdout.read(size)
        if len(buf) < size:
            break
        yield np.frombuffer(buf, dtype=np.uint8).reshape(H, W, 3)
    p.wait()


def srgb_to_linear(c):
    c = c / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def block_luma(f):
    lin = srgb_to_linear(f.astype(np.float64))
    y = 0.2126 * lin[..., 0] + 0.7152 * lin[..., 1] + 0.0722 * lin[..., 2]
    bh, bw = H // GY, W // GX
    y = y[:bh * GY, :bw * GX]
    return y.reshape(GY, bh, GX, bw).mean(axis=(1, 3))


def seam_stats(deltas, seam):
    d = np.array(deltas)
    med = float(np.median(d))
    quiet = d[d <= med]
    qmed = float(np.median(quiet))
    p90 = float(np.percentile(d, 90))
    return {'seam': round(float(seam), 4), 'median': round(med, 4), 'quietMedian': round(qmed, 4), 'p90': round(p90, 4),
            'limit': round(max(1.15 * qmed, p90), 4), 'pass': bool(seam <= max(1.15 * qmed, p90))}


def measure(path, face=None):
    first = prev = None
    prevL = None
    deltas, fdeltas = [], []
    flashes, maxShare, maxMean, n = 0, 0.0, 0.0, 0
    for f in frames(path):
        fi = f.astype(np.int16)
        L = block_luma(f)
        if prev is None:
            first = fi
        else:
            deltas.append(float(np.abs(fi - prev).mean()))
            if face:
                x0, y0, x1, y1 = face
                fdeltas.append(float(np.abs(fi[y0:y1, x0:x1] - prev[y0:y1, x0:x1]).mean()))
            dL = np.abs(L - prevL)
            big = dL >= 0.10
            share = float(big.mean())
            maxShare = max(maxShare, share)
            maxMean = max(maxMean, float(dL.mean()))
            if share >= 0.25 and float(np.minimum(L, prevL)[big].mean()) < 0.8:
                flashes += 1
        prev, prevL = fi, L
        n += 1
    seam = float(np.abs(first - prev).mean())
    out = {'video': path, 'frames': n, 'seam': seam_stats(deltas, seam),
           'flash': {'count': flashes, 'maxShareChanging10pct': round(maxShare, 5), 'maxMeanBlockDelta': round(maxMean, 5)}}
    if face:
        x0, y0, x1, y1 = face
        fseam = float(np.abs(first[y0:y1, x0:x1] - prev[y0:y1, x0:x1]).mean())
        out['seamFace'] = seam_stats(fdeltas, fseam)
    return out


if __name__ == '__main__':
    argv = sys.argv[1:]
    face, out = None, None
    if '--face' in argv:
        i = argv.index('--face'); face = [int(v) for v in argv[i + 1].split(',')]; del argv[i:i + 2]
    if '--json' in argv:
        i = argv.index('--json'); out = argv[i + 1]; del argv[i:i + 2]
    res = [measure(v, face) for v in argv]
    if len(res) == 2:
        # the WP-02 criterion: the second video's metrics within 2 % of the first's
        a, b = res

        def rel(x, y):
            return 0.0 if x == y else (y - x) / x if x else float('inf')
        keys = [('seam', 'seam'), ('seam', 'median'), ('seam', 'quietMedian'), ('seam', 'p90'),
                ('flash', 'maxShareChanging10pct'), ('flash', 'maxMeanBlockDelta')]
        change = {f'{g}.{k}': round(rel(a[g][k], b[g][k]), 5) for g, k in keys}
        res.append({'compare': f'{b["video"]} against {a["video"]}', 'relativeChange': change,
                    'flashCountEqual': a['flash']['count'] == b['flash']['count'],
                    'seamPassEqual': a['seam']['pass'] == b['seam']['pass'],
                    'within2pct': all(abs(v) <= 0.02 for v in change.values()) and a['flash']['count'] == b['flash']['count']})
    print(json.dumps(res, indent=1))
    if out:
        json.dump(res, open(out, 'w'), indent=1)
