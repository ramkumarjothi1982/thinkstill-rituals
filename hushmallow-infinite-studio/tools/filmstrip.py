"""Consecutive frames as a grid, for judging spacing / timing / arcs by eye.

    python3 tools/filmstrip.py <video.mp4> <t0> <t1> <out.jpg> [step_frames=1] [crop=x,y,w,h] [cols=8] [width=270]
"""
import subprocess, sys
from PIL import Image, ImageDraw

path, t0, t1, out = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), sys.argv[4]
step = int(sys.argv[5]) if len(sys.argv) > 5 else 1
crop = tuple(int(v) for v in sys.argv[6].split(',')) if len(sys.argv) > 6 and sys.argv[6] != '-' else (0, 0, 1080, 1920)
cols = int(sys.argv[7]) if len(sys.argv) > 7 else 8
tw = int(sys.argv[8]) if len(sys.argv) > 8 else 270
fps = 30
f0, f1 = round(t0 * fps), round(t1 * fps)
x, y, w, h = crop
raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{f0 / fps:.4f}', '-i', path, '-frames:v', str(f1 - f0 + 1),
                      '-vf', f'crop={w}:{h}:{x}:{y}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
n = len(raw) // (w * h * 3)
frames = [Image.frombytes('RGB', (w, h), raw[i * w * h * 3:(i + 1) * w * h * 3]) for i in range(0, n, step)]
th = round(tw * h / w)
rows = (len(frames) + cols - 1) // cols
sheet = Image.new('RGB', (cols * tw, rows * (th + 16)), (12, 12, 12))
d = ImageDraw.Draw(sheet)
for i, im in enumerate(frames):
    cx, cy = (i % cols) * tw, (i // cols) * (th + 16)
    sheet.paste(im.resize((tw, th), Image.LANCZOS), (cx, cy + 16))
    d.text((cx + 3, cy + 2), f'{(f0 + i * step) / fps:.2f}s  f{f0 + i * step}', fill=(220, 220, 220))
sheet.save(out, quality=90)
print(out, len(frames), 'frames')
