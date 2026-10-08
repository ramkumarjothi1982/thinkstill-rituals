#!/usr/bin/env python3
"""Tile many screenshots into ONE labelled image so an agent can look at 12-24 states
with a single image read instead of reading every PNG (each image read stays in the
agent's context and is re-sent on every later step — the biggest token cost we measured).

  python3 dev/contact_sheet.py OUT.png shot1.png shot2.png ... [--cols 4] [--width 1800]
  python3 dev/contact_sheet.py OUT.png 'dev/shots/eos/arrows_*.png'      (globs allowed)

Keeps full detail where it matters: use --cols 2 for a close look at 4 shots, --cols 4-6
for an overview. Labels each tile with its file name.
"""
import glob, math, os, sys
from PIL import Image, ImageDraw, ImageFont

args = sys.argv[1:]
cols, width = 4, 1800
if "--cols" in args:
    i = args.index("--cols"); cols = int(args[i + 1]); del args[i:i + 2]
if "--width" in args:
    i = args.index("--width"); width = int(args[i + 1]); del args[i:i + 2]
if len(args) < 2:
    sys.exit(__doc__)
out, pats = args[0], args[1:]
files = []
for p in pats:
    files += sorted(glob.glob(p)) if any(c in p for c in "*?[") else [p]
files = [f for f in files if os.path.exists(f)]
if not files:
    sys.exit("no images")
cols = max(1, min(cols, len(files)))
tile_w = width // cols
imgs = []
for f in files:
    im = Image.open(f).convert("RGB")
    h = int(im.height * tile_w / im.width)
    imgs.append((os.path.basename(f), im.resize((tile_w, h))))
label_h = 22
row_h = [max(im.height for _, im in imgs[r * cols:(r + 1) * cols]) + label_h for r in range(math.ceil(len(imgs) / cols))]
sheet = Image.new("RGB", (tile_w * cols, sum(row_h)), (18, 18, 24))
d = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype("DejaVuSans.ttf", 14)
except Exception:
    font = ImageFont.load_default()
y = 0
for r in range(len(row_h)):
    for c, (name, im) in enumerate(imgs[r * cols:(r + 1) * cols]):
        x = c * tile_w
        d.text((x + 6, y + 3), name[:60], fill=(235, 235, 245), font=font)
        sheet.paste(im, (x, y + label_h))
    y += row_h[r]
sheet.save(out, optimize=True)
print(f"{out}: {len(files)} shots, {sheet.width}x{sheet.height}")
