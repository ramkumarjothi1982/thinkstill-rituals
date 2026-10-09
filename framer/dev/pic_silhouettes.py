#!/usr/bin/env python3
"""Precompute the opaque silhouette of every character expression (bubble-expressions/*.webp) for dev/pic_probe.mjs.

For each image: for 72 angles around the image centre, the farthest pixel with alpha > 40, as normalised
(u, v) in 0..1 image coordinates. pic_probe maps these points through the rendered picture box and checks that
none falls outside the clipping circle (= part of the character is cut off) and that the character fills the
circle reasonably (not shrunk). Output: dev/pic_silhouettes.json  {file: [[u,v], ...]}
"""
import glob, json, math, os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(os.path.dirname(os.path.dirname(HERE)), "bubble-expressions")
out = {}
for p in sorted(glob.glob(os.path.join(SRC, "*.webp"))):
    im = Image.open(p).convert("RGBA")
    w, h = im.size
    a = im.split()[3].load()
    cx, cy = (w - 1) / 2, (h - 1) / 2
    R = math.hypot(cx, cy)
    pts = []
    for k in range(72):
        t = 2 * math.pi * k / 72
        dx, dy = math.cos(t), math.sin(t)
        far = None
        r = 0.0
        while r <= R:
            x, y = int(round(cx + dx * r)), int(round(cy + dy * r))
            if 0 <= x < w and 0 <= y < h and a[x, y] > 40:
                far = (x, y)
            r += 1.0
        if far:
            pts.append([round(far[0] / (w - 1), 4), round(far[1] / (h - 1), 4)])
    out[os.path.basename(p)] = pts
json.dump(out, open(os.path.join(HERE, "pic_silhouettes.json"), "w"), separators=(",", ":"))
print(len(out), "silhouettes")
