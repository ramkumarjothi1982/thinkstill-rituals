"""High-res Mallow cut-outs (W7, step 1 of 4).

    python3 tools/hires/prepare.py <src_dir> <out_dir> <work_dir> [ids...]

<src_dir>/<id>.webp is the owner's 1254 px transparent artwork
(assets/source/hires). For each Mallow this writes the approved cut-out the
rig uses, <out_dir>/<id>.webp (and a lossless <work_dir>/<id>.png that the
later steps measure), trimmed to its alpha
bounding box with an 8 px pad and resampled to a 1024 px max side.

Clean-ups (no repainting of the artwork):
  * alpha: the source body is 251-253 inside, not 255 (lossy encoder), which
    would make the Mallow ~1% see-through and print faint bands where the
    rig's warp strips overlap. Alpha is remapped so >= 250 is opaque and the
    <= 4/255 haze around the silhouette is cleared; the 3 px anti-aliased rim
    keeps its shape.
  * stray specks outside the silhouette are dropped (largest component kept).
  * resampling is done on premultiplied colour, so no dark or light fringe.
A report (<work_dir>/prepare-report.json) records the crop box and scale so any point
in the 1254 px source maps to the cut-out: x' = (x - box[0]) * scale.
"""
import json, sys, os
import numpy as np
import cv2
from PIL import Image

SRC, OUT, WORK = sys.argv[1], sys.argv[2], sys.argv[3]
IDS = sys.argv[4:] or ['glitzi', 'zuzu', 'boppo', 'pipzi', 'blubi', 'loomi', 'noomi']
MAX_SIDE, PAD = 1024, 8
os.makedirs(OUT, exist_ok=True)
os.makedirs(WORK, exist_ok=True)


def clean_alpha(a8):
    a = a8.astype(np.float64)
    a = np.clip((a - 4.0) / (250.0 - 4.0), 0, 1)
    m = (a > 0.02).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(cv2.dilate(m, np.ones((5, 5), np.uint8)), connectivity=8)
    if n > 1:
        keep = 1 + int(np.argmax(st[1:, 4]))
        a[lab != keep] = 0
    return a


def resample(rgb, a, box, size):
    """Premultiplied Lanczos resample of the source region box -> size."""
    chans = []
    for c in range(3):
        pm = Image.fromarray((rgb[..., c] * a).astype(np.float32), 'F')
        chans.append(np.array(pm.resize(size, Image.LANCZOS, box=box), np.float64))
    aa = np.array(Image.fromarray(a.astype(np.float32), 'F').resize(size, Image.LANCZOS, box=box), np.float64)
    aa = np.clip(aa, 0, 1)
    aa[aa < 1.5 / 255] = 0
    aa[aa > 254.0 / 255] = 1
    out = np.zeros((size[1], size[0], 4), np.float64)
    safe = np.maximum(aa, 1e-6)
    for c in range(3):
        out[..., c] = np.where(aa > 0, np.clip(chans[c] / safe, 0, 255), 0)
    out[..., 3] = aa * 255
    return np.round(out).astype(np.uint8)


report = {}
for name in IDS:
    img = np.array(Image.open(f'{SRC}/{name}.webp').convert('RGBA'))
    rgb = img[..., :3].astype(np.float64)
    a = clean_alpha(img[..., 3])
    ys, xs = np.nonzero(a > 0)
    bx0, by0, bx1, by1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    bw, bh = bx1 - bx0, by1 - by0
    s = (MAX_SIDE - 2 * PAD) / max(bw, bh)
    W, H = int(round(bw * s)) + 2 * PAD, int(round(bh * s)) + 2 * PAD
    # exact source box for the output canvas (sub-pixel, so the scale is uniform)
    x0 = bx0 - PAD / s
    y0 = by0 - PAD / s
    box = (x0, y0, x0 + W / s, y0 + H / s)
    out = resample(rgb, a, box, (W, H))
    Image.fromarray(out, 'RGBA').save(f'{WORK}/{name}.png')
    Image.fromarray(out, 'RGBA').save(f'{OUT}/{name}.webp', quality=94, method=6, alpha_quality=100, exact=False)
    al = out[..., 3]
    ys, xs = np.nonzero(al > 0)
    report[name] = {
        'src_box': [round(v, 3) for v in box], 'scale': s, 'size': [W, H],
        'alpha_bbox': [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1],
        'opaque_frac': float((al == 255).sum() / max(1, (al > 0).sum())),
        'webp_kb': round(os.path.getsize(f'{OUT}/{name}.webp') / 1024, 1),
    }
    print(name, report[name])

json.dump(report, open(f'{WORK}/prepare-report.json', 'w'), indent=1)
