"""A/B flip sheet for the owner (M0 gate): the 16 golden times, final profile vs exact.

    python3 -I tools/perf/ab_sheet.py <gate.json> <exact_png_dir> <final_png_dir> <out_dir> [--title T]

Inputs: a `hm bench gate --a golden --b final --save-png` result (gate.json with
per-frame PSNR / face-box PSNR / SSIM and the face boxes), the exact goldens
(golden-XX.XXXs.png) and the final renders (b-golden-XX.XXXs.png).

Writes into out_dir:
  index.html          the flip sheet: each card flips between A (exact) and B (final)
                      every second (hover or tap to hold one), full frame and the face
                      at 1:1, with the frame's metrics
  img/*.jpg           frames at half size and face crops at 1:1 (JPEG q92), the
                      face difference amplified 8x (PNG)
  contact-sheet.jpg   all 16 faces in one image: exact | final | |diff| x 8
  summary.json        the metrics shown
"""
import html, json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

args = [a for a in sys.argv[1:] if not a.startswith('--')]
title = 'Final profile vs exact (WP-02)'
if '--title' in sys.argv:
    title = sys.argv[sys.argv.index('--title') + 1]
    args = [a for a in args if a != title]
GATE, A_DIR, B_DIR, OUT = args[:4]
os.makedirs(os.path.join(OUT, 'img'), exist_ok=True)
gate = json.load(open(GATE))


def font(size):
    for p in ['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf']:
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            pass
    return ImageFont.load_default()


def num(v):
    return float('inf') if v in ('Infinity', None) else float(v)


cards, faces = [], []
for row in gate['rows']:
    t = row['t']
    name = f'golden-{t:06.3f}s.png'
    a = Image.open(os.path.join(A_DIR, name)).convert('RGB')
    b = Image.open(os.path.join(B_DIR, 'b-' + name)).convert('RGB')
    tag = f'{t:06.3f}'
    x0, y0, x1, y1 = row['box']
    fa, fb = a.crop((x0, y0, x1, y1)), b.crop((x0, y0, x1, y1))
    diff = np.abs(np.asarray(fa, dtype=np.int16) - np.asarray(fb, dtype=np.int16))
    dimg = Image.fromarray(np.clip(diff * 8, 0, 255).astype(np.uint8))
    a.resize((540, 960), Image.LANCZOS).save(os.path.join(OUT, 'img', f'{tag}-a.jpg'), quality=92)
    b.resize((540, 960), Image.LANCZOS).save(os.path.join(OUT, 'img', f'{tag}-b.jpg'), quality=92)
    fa.save(os.path.join(OUT, 'img', f'{tag}-face-a.jpg'), quality=92)
    fb.save(os.path.join(OUT, 'img', f'{tag}-face-b.jpg'), quality=92)
    dimg.save(os.path.join(OUT, 'img', f'{tag}-face-diff.png'))
    faces.append((t, fa, fb, dimg))
    cards.append({'t': t, 'tag': tag, 'psnr': num(row['psnr']), 'facePsnr': num(row['facePsnr']), 'faceSsim': row['faceSsim'],
                  'maxAbs': row['maxAbs'], 'differingShare': row['differingShare'], 'box': row['box'], 'faceSize': [x1 - x0, y1 - y0]})

# contact sheet: two columns of 8 rows, each row exact | final | diff x8 at 0.5x
cw = max(f[1].size[0] for f in faces) // 2
ch = max(f[1].size[1] for f in faces) // 2
cols, rows_n, lab = 2, (len(faces) + 1) // 2, 22
sheet = Image.new('RGB', (cols * (3 * cw + 24), rows_n * (ch + lab) + 40), (14, 12, 24))
d = ImageDraw.Draw(sheet)
d.text((10, 10), f'{title}: exact | final | |difference| x 8 (face box, half size)', fill=(235, 230, 255), font=font(18))
for k, (t, fa, fb, dimg) in enumerate(faces):
    cx, cy = (k // rows_n) * (3 * cw + 24) + 8, 40 + (k % rows_n) * (ch + lab)
    c = cards[k]
    d.text((cx, cy), f'{t:.2f} s   PSNR {c["psnr"]:.1f} dB   face {c["facePsnr"]:.1f} dB   SSIM {c["faceSsim"]:.4f}', fill=(200, 196, 230), font=font(14))
    for j, im in enumerate((fa, fb, dimg)):
        sheet.paste(im.resize((cw, ch), Image.LANCZOS), (cx + j * cw, cy + lab - 4))
sheet.save(os.path.join(OUT, 'contact-sheet.jpg'), quality=90)

s = gate['summary']
summary = {'title': title, 'a': gate['a'], 'b': gate['b'], 'summary': s, 'frames': cards}
json.dump(summary, open(os.path.join(OUT, 'summary.json'), 'w'), indent=1, default=str)


def db(v):
    return '∞' if v == float('inf') else f'{v:.2f}'


card_html = []
for c in cards:
    card_html.append(f'''
  <section class="card">
    <header><b>{c["t"]:.2f} s</b><span>PSNR {db(c["psnr"])} dB · face {db(c["facePsnr"])} dB · face SSIM {c["faceSsim"]:.5f} · max |Δ| {c["maxAbs"]} · {100 * c["differingShare"]:.1f} % px differ</span></header>
    <div class="pair">
      <figure class="flip"><img src="img/{c["tag"]}-a.jpg" alt="exact {c["t"]} s"><img class="b" src="img/{c["tag"]}-b.jpg" alt="final {c["t"]} s"><figcaption><span class="la">A exact</span><span class="lb">B final</span></figcaption></figure>
      <figure class="flip face"><img src="img/{c["tag"]}-face-a.jpg" alt="exact face"><img class="b" src="img/{c["tag"]}-face-b.jpg" alt="final face"><figcaption><span class="la">A exact · face 1:1</span><span class="lb">B final · face 1:1</span></figcaption></figure>
      <figure class="diff"><img src="img/{c["tag"]}-face-diff.png" alt="difference x8"><figcaption>|A − B| × 8</figcaption></figure>
    </div>
  </section>''')

page = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>A/B flip sheet</title>
<style>
:root {{ --bg: #0e0c18; --card: #181528; --ink: #ece8ff; --dim: #a9a3c8; --a: #8fd3ff; --b: #ffc98f; }}
body {{ margin: 0; background: var(--bg); color: var(--ink); font: 15px/1.45 system-ui, sans-serif; }}
main {{ max-width: 1500px; margin: 0 auto; padding: 16px; }}
h1 {{ font-size: 22px; margin: 8px 0 4px; }} p {{ color: var(--dim); max-width: 900px; }}
.card {{ background: var(--card); border-radius: 12px; padding: 12px; margin: 14px 0; }}
.card header {{ display: flex; gap: 14px; flex-wrap: wrap; align-items: baseline; margin-bottom: 8px; }} .card header span {{ color: var(--dim); }}
.pair {{ display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-start; }}
figure {{ margin: 0; position: relative; }} figure img {{ display: block; max-width: 100%; border-radius: 6px; }}
.flip {{ display: grid; }} .flip img {{ grid-area: 1 / 1; }}
.flip img.b {{ animation: flip 2s steps(1) infinite; }}
.flip:hover img.b, .flip:active img.b {{ animation-play-state: paused; }}
@keyframes flip {{ 0% {{ opacity: 0; }} 50% {{ opacity: 1; }} }}
figcaption {{ font-size: 13px; color: var(--dim); margin-top: 4px; }}
.flip figcaption .lb {{ display: none; color: var(--b); }} .flip figcaption .la {{ color: var(--a); }}
.flip figcaption span {{ animation: none; }}
.flip:has(img.b) figcaption .la {{ animation: capA 2s steps(1) infinite; }}
.flip:has(img.b) figcaption .lb {{ display: inline; animation: capB 2s steps(1) infinite; }}
.flip:hover figcaption span {{ animation-play-state: paused; }}
@keyframes capA {{ 0% {{ opacity: 1; }} 50% {{ opacity: 0; }} }} @keyframes capB {{ 0% {{ opacity: 0; }} 50% {{ opacity: 1; }} }}
.flip:not(.face) img {{ width: 360px; }} .face img {{ width: min(580px, 92vw); }} .diff img {{ width: 290px; }}
table {{ border-collapse: collapse; margin: 8px 0; }} td, th {{ padding: 2px 10px; text-align: right; }} th {{ color: var(--dim); font-weight: 500; }}
</style></head><body><main>
<h1>{html.escape(title)}</h1>
<p>Each picture flips between <b style="color:var(--a)">A, the exact profile</b> (the approved v2 render, bit-identical to the goldens) and
<b style="color:var(--b)">B, the final profile</b> once a second; hover or press to hold one. The face is shown at 1:1 output pixels.
The change to look for: the final profile draws the face once per frame (from quantised parameters), so an expression
that changes within one frame is no longer smeared across the shutter (blinks and eye pops still are); the face still moves
and blurs with the body.</p>
<table><tr><th>min PSNR</th><th>mean PSNR</th><th>min face PSNR</th><th>face SSIM mean</th><th>face SSIM min</th></tr>
<tr><td>{db(num(s["minPsnr"]))} dB</td><td>{db(num(s["meanPsnr"]))} dB</td><td>{db(num(s["minFacePsnr"]))} dB</td><td>{s["meanFaceSsim"]:.5f}</td><td>{s["minFaceSsim"]:.5f}</td></tr></table>
{''.join(card_html)}
</main></body></html>
'''
open(os.path.join(OUT, 'index.html'), 'w').write(page)
print(os.path.join(OUT, 'index.html'))
