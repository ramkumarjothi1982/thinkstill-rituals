"""High-resolution living-face assets for the six companions, from the approved art.

    python3 -I tools/derive_companions_hires.py [--q 2.5] [--only blubi,zuzu]

The app's rig (hushmallow/src/mallows/rig.js) animates every Mallow from three approved
inputs at ~380 px: the original PNG, a face-cleaned body and iris / spiral sprites. For
close-ups the studio needs the same three at the owner-supplied 1254 px quality. This tool
derives them, in the rig's own coordinate frame scaled by q (so the rig code runs unchanged):

  original.png   the hi-res approved painting, registered onto the rig frame (ECC affine)
  body.png       the same painting with the painted face removed: the face mask is where the
                 rig's own original and face-cleaned art differ; inside it the rig's clean skin
                 (colour-matched) carries the shading, and the painting's own fluff texture,
                 taken from just above or below, carries the detail
  <sprite>.png   irises / spirals re-cut from the painting where template matching finds the
                 rig's sprite in its original art, with the sprite's own alpha
  meta.json      the registration, its error, q
  qa.jpg         rig art vs derived at the same scale, face region

Pixels outside the (feathered) face mask are the approved painting itself.
"""
import json, os, sys
import cv2
import numpy as np

STUDIO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.join(os.path.dirname(STUDIO), 'hushmallow', 'assets')
OUT = os.path.join(STUDIO, 'assets', 'companions')
Q = float(sys.argv[sys.argv.index('--q') + 1]) if '--q' in sys.argv else 2.5
STROKE = float(sys.argv[sys.argv.index('--stroke') + 1]) if '--stroke' in sys.argv else 70
STROKES_ONLY = {'loomi'}  # hi-res painting with a different face from the rig's frame
ONLY = sys.argv[sys.argv.index('--only') + 1].split(',') if '--only' in sys.argv else None
SPRITES = {'boppo': ['boppo-iris-L', 'boppo-iris-R'], 'pipzi': ['pipzi-iris-L', 'pipzi-iris-R'], 'zuzu': ['zuzu-spiral-L', 'zuzu-spiral-R'], 'glitzi': [], 'blubi': [], 'loomi': []}


def load(p):
    im = cv2.imread(p, cv2.IMREAD_UNCHANGED)
    if im.shape[2] == 3:
        im = np.dstack([im, np.full(im.shape[:2], 255, np.uint8)])
    return im.astype(np.float32)


def bbox(a):
    ys, xs = np.nonzero(a > 128)
    return xs.min(), ys.min(), xs.max(), ys.max()


def gray(im):
    g = cv2.cvtColor(im[..., :3].astype(np.uint8), cv2.COLOR_BGRA2GRAY if im.shape[2] == 4 else cv2.COLOR_BGR2GRAY).astype(np.float32)
    return g * (im[..., 3] / 255.0)


def register(lo, hi):
    """Affine lo → hi (2×3), refined by ECC from the alpha-bbox fit."""
    l0, h0 = bbox(lo[..., 3]), bbox(hi[..., 3])
    sx = (h0[2] - h0[0]) / (l0[2] - l0[0]); sy = (h0[3] - h0[1]) / (l0[3] - l0[1])
    W = np.array([[sx, 0, h0[0] - sx * l0[0]], [0, sy, h0[1] - sy * l0[1]]], np.float32)
    tmpl = cv2.GaussianBlur(gray(lo), (0, 0), 0.8)
    inp = cv2.GaussianBlur(gray(hi), (0, 0), sx * 0.8)
    try:
        _, W = cv2.findTransformECC(tmpl, inp, W, cv2.MOTION_AFFINE, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 300, 1e-6), None, 5)
    except cv2.error as e:
        print('  ECC did not converge, keeping the bbox fit:', str(e).splitlines()[-1][:80])
    return W


def to_frame(hi, W, size, q):
    """Resample hi-res pixels into the rig frame scaled by q: frame (u, v) ← hi(W·(u/q, v/q))."""
    M = W.copy().astype(np.float64)
    M[:, :2] /= q
    return cv2.warpAffine(hi, M, (int(round(size[0] * q)), int(round(size[1] * q))), flags=cv2.INTER_AREA | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_CONSTANT, borderValue=0)


def derive(mid):
    lo = load(os.path.join(APP, 'mallows', f'{mid}.png'))
    body_lo = load(os.path.join(APP, 'rig', f'{mid}-body.png'))
    hi = load(os.path.join(APP, 'source', 'hires', f'{mid}.webp'))
    H, Wd = lo.shape[:2]
    W = register(lo, hi)
    orig = to_frame(hi, W, (Wd, H), Q)
    # registration error: the hi-res painting back at rig resolution vs the rig's original
    back = cv2.resize(orig, (Wd, H), interpolation=cv2.INTER_AREA)
    a = (lo[..., 3] > 200) & (back[..., 3] > 200)
    err = float(np.abs(back[..., :3][a] - lo[..., :3][a]).mean())
    # face mask: where the rig's original and its face-cleaned body differ
    d = np.abs(lo[..., :3] - body_lo[..., :3]).max(axis=2) * (lo[..., 3] / 255.0)
    m = (d > 14).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    m = cv2.dilate(m, np.ones((5, 5), np.uint8))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(m)
    keep = np.zeros_like(m)
    for k in range(1, n):
        if stats[k, cv2.CC_STAT_AREA] >= 12:
            keep[lab == k] = 1
    mq = cv2.resize(keep.astype(np.float32), (orig.shape[1], orig.shape[0]), interpolation=cv2.INTER_LINEAR)
    mq = cv2.dilate((mq > 0.3).astype(np.uint8), np.ones((int(3 * Q), int(3 * Q)), np.uint8)).astype(np.float32)
    # shading from the rig's clean body (upscaled), colour-matched to the painting around the face
    body_up = cv2.resize(body_lo, (orig.shape[1], orig.shape[0]), interpolation=cv2.INTER_CUBIC)
    ring = (cv2.dilate(mq.astype(np.uint8), np.ones((int(10 * Q), int(10 * Q)), np.uint8)) > 0) & (mq < 0.5) & (orig[..., 3] > 220)
    gain = (orig[..., :3][ring].mean(axis=0) + 1) / (body_up[..., :3][ring].mean(axis=0) + 1)
    sigma = 1.4 * Q
    body_g = cv2.GaussianBlur(body_up[..., :3] * gain, (0, 0), sigma)
    low = body_g
    # the painting's own face strokes: the hi-res painting is not always the rig's exact frame
    # (Loomi's has a different face), so anything near the face that departs strongly from the
    # clean skin joins the mask
    near = cv2.dilate(mq.astype(np.uint8), np.ones((int(24 * Q), int(24 * Q)), np.uint8)) > 0
    dev = np.abs(cv2.GaussianBlur(orig[..., :3], (0, 0), 1.5 * Q) - cv2.GaussianBlur(low, (0, 0), 1.5 * Q)).max(axis=2)
    darker = (cv2.GaussianBlur(low, (0, 0), 1.5 * Q) - cv2.GaussianBlur(orig[..., :3], (0, 0), 1.5 * Q)).mean(axis=2)
    extra = (near & (dev > STROKE) & (darker > STROKE * 0.5) & (orig[..., 3] > 220)).astype(np.uint8)
    extra = cv2.morphologyEx(extra, cv2.MORPH_OPEN, np.ones((int(Q), int(Q)), np.uint8))
    extra = cv2.dilate(extra, np.ones((int(4 * Q), int(4 * Q)), np.uint8))
    if mid in STROKES_ONLY:
        # the painting's face is not the rig's: remove only its own strokes (with their soft
        # shadow and gloss), keep its own blush
        mq = cv2.dilate(extra, np.ones((int(6 * Q), int(6 * Q)), np.uint8)).astype(np.float32)
    else:
        mq = np.maximum(mq, extra.astype(np.float32))
    feather = cv2.GaussianBlur(mq, (0, 0), 1.6 * Q)
    # shading: the painting's own light, carried in across the mask (normalised convolution),
    # with the rig body's local shading variation on top
    def nconv(img, w, sg):
        return cv2.GaussianBlur(img * w[..., None], (0, 0), sg) / (cv2.GaussianBlur(w, (0, 0), sg)[..., None] + 1e-4)
    keepw = ((1 - mq) * (orig[..., 3] > 220)).astype(np.float32)
    big = (6 if mid in STROKES_ONLY else 9) * Q
    low = nconv(orig[..., :3], keepw, big) + np.clip(body_g - nconv(body_g, keepw, big), -14, 8)
    detail = orig[..., :3] - cv2.GaussianBlur(orig[..., :3], (0, 0), sigma)
    # the painting's own fluff, carried from just above / below each masked pixel
    fill = np.zeros_like(detail); have = np.zeros(mq.shape, bool)
    hard = mq > 0.5
    for dy in [int(v * Q) for v in (-26, -40, 26, 40, -56, 56, -72, 72, -90, 90)]:
        src = np.roll(detail, dy, axis=0); srcm = np.roll(hard, dy, axis=0); srca = np.roll(orig[..., 3] > 220, dy, axis=0)
        take = hard & ~have & ~srcm & srca
        fill[take] = src[take]; have |= take
    rgb = low + fill
    out = orig.copy()
    out[..., :3] = orig[..., :3] * (1 - feather[..., None]) + rgb * feather[..., None]
    out[..., :3] = np.clip(out[..., :3], 0, 255)
    d_out = os.path.join(OUT, mid)
    os.makedirs(d_out, exist_ok=True)
    cv2.imwrite(os.path.join(d_out, 'original.png'), orig.astype(np.uint8))
    cv2.imwrite(os.path.join(d_out, 'body.png'), out.astype(np.uint8))
    # sprites: find each rig sprite in the rig's original art, re-cut it from the painting
    sprites = {}
    for name in SPRITES[mid]:
        sp = load(os.path.join(APP, 'rig', f'{name}.png'))
        sa = sp[..., 3] / 255.0
        res = cv2.matchTemplate(lo[..., :3], sp[..., :3], cv2.TM_SQDIFF, mask=np.dstack([sa] * 3).astype(np.float32))
        _, _, minloc, _ = cv2.minMaxLoc(res)
        x0, y0 = minloc
        sh, sw = sp.shape[:2]
        crop = orig[int(y0 * Q):int((y0 + sh) * Q), int(x0 * Q):int((x0 + sw) * Q)].copy()
        crop = cv2.resize(crop, (int(sw * Q), int(sh * Q)), interpolation=cv2.INTER_AREA) if crop.shape[:2] != (int(sh * Q), int(sw * Q)) else crop
        alpha = cv2.resize(sp[..., 3], (crop.shape[1], crop.shape[0]), interpolation=cv2.INTER_CUBIC)
        crop[..., 3] = np.clip(alpha, 0, 255)
        cv2.imwrite(os.path.join(d_out, f'{name}.png'), crop.astype(np.uint8))
        sprites[name] = {'at': [int(x0), int(y0)], 'size': [int(sw), int(sh)]}
    # QA: rig art vs derived, the face region at the same on-screen scale
    ys, xs = np.nonzero(keep)
    fx0, fy0, fx1, fy1 = max(0, xs.min() - 20), max(0, ys.min() - 20), min(Wd, xs.max() + 20), min(H, ys.max() + 20)
    def comp(im):
        bg = np.full(im.shape[:2] + (3,), 40, np.float32); a = im[..., 3:4] / 255.0
        return (im[..., :3] * a + bg * (1 - a)).astype(np.uint8)
    rig_face = cv2.resize(comp(body_lo)[fy0:fy1, fx0:fx1], None, fx=Q, fy=Q, interpolation=cv2.INTER_CUBIC)
    our_face = comp(out)[int(fy0 * Q):int(fy1 * Q), int(fx0 * Q):int(fx1 * Q)]
    hh = min(rig_face.shape[0], our_face.shape[0])
    cv2.imwrite(os.path.join(d_out, 'qa.jpg'), np.hstack([rig_face[:hh], np.full((hh, 8, 3), 255, np.uint8), our_face[:hh]]), [cv2.IMWRITE_JPEG_QUALITY, 88])
    meta = {'id': mid, 'q': Q, 'frame': [Wd, H], 'warp_lo_to_hi': W.tolist(), 'registrationMeanAbsErr': round(err, 2), 'faceDiffersFromRig': mid in STROKES_ONLY, 'maskPx': int(keep.sum()), 'strokeMaskPxQ': int(extra.sum()), 'sprites': sprites}
    json.dump(meta, open(os.path.join(d_out, 'meta.json'), 'w'), indent=1)
    print(f'{mid}: registration error {err:.2f}/255, face mask {int(keep.sum())} px, sprites {list(sprites)}')


for mid in ['blubi', 'loomi', 'pipzi', 'glitzi', 'zuzu', 'boppo']:
    if ONLY and mid not in ONLY:
        continue
    derive(mid)
