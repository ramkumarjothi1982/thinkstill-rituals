"""A small synthetic closed-tube Mallow for fast tests (seeded, deterministic).

A light-blue cushion with soft cloud texture, two closed-eye arcs and a smile
painted as navy tubes with a dark glow, two pink cheeks with white sparkles
and a dark top dimple: the features the closed-tube finder and the approved
pipeline expect, on a 560 x 540 canvas instead of 1254 x 1254, so the whole
derivation runs in seconds.
"""
import numpy as np
import cv2
from scipy.special import erfc


def _arc_mask(shape, p0, c, p1, width):
    t = np.linspace(0, 1, 400)[:, None]
    pts = (1 - t) ** 2 * np.array(p0) + 2 * (1 - t) * t * np.array(c) + t ** 2 * np.array(p1)
    m = np.zeros(shape, np.uint8)
    cv2.polylines(m, [np.round(pts * 16).astype(np.int32)], False, 1, thickness=int(width), lineType=cv2.LINE_AA, shift=4)
    return m.astype(bool)


def make_source(seed=7, H=540, W=560, face=True):
    """(RGBA uint8 source art, stroke masks, stroke Bezier control points).
    face=False paints the same body (same texture, cheeks, dimple) without the
    face strokes and their glow: the ideal clean body for gate tests."""
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float64)
    # body: a soft super-ellipse, alpha 255 inside with a 2 px anti-aliased rim
    cx, cy, rx, ry = W / 2, H / 2 + 10, 225.0, 215.0
    r = (np.abs((xx - cx) / rx) ** 3.2 + np.abs((yy - cy) / ry) ** 3.2) ** (1 / 3.2)
    alpha = np.clip((1 - r) * 110, 0, 1)
    # light-blue skin (G - R > 30 everywhere, so the pink-exclusion rule leaves the body usable as source)
    base = np.stack([150 - 0.04 * (yy - cy), 202 - 0.03 * (yy - cy), 246 + 0 * yy], -1)
    tex = cv2.GaussianBlur(rng.normal(0, 1, (H, W)), (0, 0), 2.5)
    tex = tex / tex.std() * 4.0
    rgb = base + tex[..., None] * np.array([0.8, 1.0, 0.4])
    # cheeks: pink erfc discs with white sparkles
    for sx in (-1, 1):
        ccx, ccy = cx + sx * 150, cy + 60
        d = np.hypot(xx - ccx, (yy - ccy) * 1.1)
        k = 0.5 * erfc((d - 38) / (9 * np.sqrt(2)))
        rgb = rgb * (1 - 0.8 * k[..., None]) + 0.8 * k[..., None] * np.array([252.0, 150.0, 205.0])
        for ox, oy in ((-12, -8), (10, 6)):
            rgb[np.hypot(xx - (ccx + ox), yy - (ccy + oy)) < 3.2] = 255.0
    # face strokes: navy tubes with a dark-blue glow on both sides
    strokes = {
        'eyeL': ((cx - 140, cy - 40), (cx - 95, cy + 5), (cx - 40, cy - 38)),
        'eyeR': ((cx + 40, cy - 38), (cx + 95, cy + 5), (cx + 140, cy - 40)),
        'mouth': ((cx - 55, cy + 40), (cx, cy + 90), (cx + 55, cy + 40)),
    }
    masks = {k: _arc_mask((H, W), *v, width=22) for k, v in strokes.items()}
    if face:
        core = np.maximum.reduce([m.astype(np.uint8) for m in masks.values()]).astype(bool)
        de = cv2.distanceTransform((~core).astype(np.uint8), cv2.DIST_L2, 5)
        glow = 0.75 * 0.5 * erfc((de - 2) / (7 * np.sqrt(2)))
        rgb = rgb * (1 - glow[..., None]) + glow[..., None] * np.array([10.0, 40.0, 150.0])
        rgb[core] = np.array([22.0, 30.0, 92.0]) + tex[core][:, None] * 0.5
    # top dimple: a small dark blob near the top
    dim = np.hypot(xx - cx, (yy - (cy - ry + 45)) * 1.6) < 13
    rgb[dim] = np.array([30.0, 40.0, 110.0])
    out = np.zeros((H, W, 4), np.uint8)
    out[..., :3] = np.clip(np.round(rgb), 0, 255).astype(np.uint8)
    out[..., 3] = np.round(alpha * 255).astype(np.uint8)
    out[..., :3][out[..., 3] == 0] = 0
    return out, masks, strokes
