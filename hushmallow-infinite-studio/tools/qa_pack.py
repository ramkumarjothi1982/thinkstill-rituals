"""Review pack for a rendered short: contact sheet, filmstrips, loop-seam and audio-sync evidence.

    python3 tools/qa_pack.py <video.mp4> <cues.json> <out_dir> [poster_time]

Writes into out_dir:
  contact-sheet.jpg          a frame every 0.5 s
  strip-*.jpg                consecutive frames of the key moments (motion spacing by eye)
  loop-seam.json             mean |Δpixel| across the 449→0 seam vs. neighbouring frame pairs
  audio-cues.png             waveform + spectrogram with every cue marked
  audio-onsets.json          for each percussive cue, the nearest audio onset (ms offset)
and ../poster.jpg (next to out_dir) from poster_time (default 3.6 s).
"""
import json, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw

VIDEO, CUES, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
POSTER_T = float(sys.argv[4]) if len(sys.argv) > 4 else 3.6
os.makedirs(OUT, exist_ok=True)
W, H, FPS = 1080, 1920, 30
HERE = os.path.dirname(os.path.abspath(__file__))

raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', VIDEO, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
N = len(raw) // (W * H * 3)
frame = lambda i: np.frombuffer(raw[i * W * H * 3:(i + 1) * W * H * 3], np.uint8).reshape(H, W, 3)

# contact sheet
tw, th, cols = 216, 384, 10
idx = list(range(0, N, 15))
rows = (len(idx) + cols - 1) // cols
sheet = Image.new('RGB', (cols * tw, rows * (th + 18)), (12, 12, 14))
d = ImageDraw.Draw(sheet)
for k, i in enumerate(idx):
    x, y = (k % cols) * tw, (k // cols) * (th + 18)
    sheet.paste(Image.fromarray(frame(i)).resize((tw, th), Image.LANCZOS), (x, y + 18))
    d.text((x + 4, y + 3), f'{i / FPS:.1f}s', fill=(225, 225, 230))
sheet.save(os.path.join(OUT, 'contact-sheet.jpg'), quality=90)

# filmstrips
for name, t0, t1, step, crop in [('opening-jolt-landing', 0.2, 1.6, 1, '140,380,800,1000'), ('overthinking', 2.8, 7.4, 4, '0,300,1080,1100'),
                                 ('breath-dissolve', 7.2, 11.0, 3, '0,300,1080,1100'), ('ending-loop', 11.4, 15.0, 3, '0,200,1080,1150')]:
    subprocess.run([sys.executable, os.path.join(HERE, 'filmstrip.py'), VIDEO, str(t0), str(t1), os.path.join(OUT, f'strip-{name}.jpg'), str(step), crop, '9', '200'],
                   check=True, capture_output=True)

# loop seam
f = lambda i: frame(i).astype(np.float32)
diff = lambda a, b: round(float(np.abs(f(a) - f(b)).mean()), 3)
seam = {'seam_449_to_0': diff(N - 1, 0), 'neighbours': {'446-447': diff(N - 4, N - 3), '447-448': diff(N - 3, N - 2), '448-449': diff(N - 2, N - 1), '0-1': diff(0, 1), '1-2': diff(1, 2)},
        'median_consecutive_all': round(float(np.median([diff(i, i + 1) for i in range(0, N - 1, 5)])), 3)}
json.dump(seam, open(os.path.join(OUT, 'loop-seam.json'), 'w'), indent=1)

# audio: waveform + spectrogram + cue markers, onset alignment
spec = os.path.join(OUT, '_spec.png')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', VIDEO, '-lavfi', 'showspectrumpic=s=1500x400:legend=0:scale=log:fscale=log:color=intensity', spec], check=True)
pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', VIDEO, '-f', 'f32le', '-ac', '1', '-ar', '48000', '-'], capture_output=True, check=True).stdout
x = np.frombuffer(pcm, np.float32)
cues = json.load(open(CUES))['cues']
PW, PH = 1500, 200
img = Image.new('RGB', (PW, PH + 420), (10, 10, 16)); dd = ImageDraw.Draw(img)
img.paste(Image.open(spec).convert('RGB').resize((PW, 400)), (0, PH + 20)); os.remove(spec)
n = len(x)
for i in range(PW):
    seg = x[i * n // PW:(i + 1) * n // PW]
    pk, rms = float(np.abs(seg).max()), float(np.sqrt((seg ** 2).mean()))
    dd.line([(i, PH / 2 - pk * PH / 2), (i, PH / 2 + pk * PH / 2)], fill=(90, 110, 200))
    dd.line([(i, PH / 2 - rms * PH / 2), (i, PH / 2 + rms * PH / 2)], fill=(200, 220, 255))
for k, c in enumerate(cues):
    xx = int(c['t'] / (n / 48000) * PW)
    dd.line([(xx, 0), (xx, PH + 420)], fill=(255, 120, 80))
    dd.text((xx + 2, 2 + (k % 9) * 11), c['type'][:10], fill=(255, 200, 160))
img.save(os.path.join(OUT, 'audio-cues.png'))
# onset detection: spectral-flux-like energy rise in 5 ms hops
hop = 240
e = np.array([float((x[i:i + hop] ** 2).sum()) for i in range(0, n - hop, hop)])
le = np.log10(e + 1e-9)
flux = np.maximum(0, np.diff(le, prepend=le[0]))
onsets = []
for c in cues:
    if c['type'] not in ('take', 'land', 'blink', 'thought', 'wince', 'release', 'eyes_open', 'logo', 'lift_off'):
        continue
    i0 = int(c['t'] * 48000 / hop)
    lo, hi = max(0, i0 - 8), min(len(flux), i0 + 12)
    j = lo + int(np.argmax(flux[lo:hi]))
    onsets.append({'cue': c['type'], 't': c['t'], 'onset_ms_offset': round((j - i0) * hop / 48, 1)})
json.dump(onsets, open(os.path.join(OUT, 'audio-onsets.json'), 'w'), indent=1)

# poster
i = int(round(POSTER_T * FPS))
Image.fromarray(frame(i)).save(os.path.join(os.path.dirname(os.path.abspath(OUT)), 'poster.jpg'), quality=92)
print(json.dumps({'frames': N, 'seam': seam, 'onsets': onsets}, indent=1))
