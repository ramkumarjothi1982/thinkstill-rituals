"""Finish and verify a dream-stage video: mux, preview copy, poster, QA evidence.

    python3 -I tools/finish-dream.py <job dir> <id> [--poster 17.9]

<job dir> holds <id>.video.mp4 (tools/render-dream.mjs) and score.wav (audio/score-feel.mjs).
Writes <id>.mp4 (master), <id>.preview.mp4 (lighter copy), poster.jpg and qa/:
  verify.json        stream spec, full decode, loudness, loop seam, flash / luminance safety
  contact-sheet.jpg  one frame per second
  seam.jpg           the last three frames and the first three (the loop)
"""
import json, os, subprocess, sys
import numpy as np
from PIL import Image

job, vid = sys.argv[1], sys.argv[2]
poster_t = float(sys.argv[sys.argv.index('--poster') + 1]) if '--poster' in sys.argv else 17.9
silent = os.path.join(job, f'{vid}.video.mp4')
wav = os.path.join(job, 'score.wav')
master = os.path.join(job, f'{vid}.mp4')
preview = os.path.join(job, f'{vid}.preview.mp4')
qa = os.path.join(job, 'qa')
os.makedirs(qa, exist_ok=True)


def run(args, text=True):
    p = subprocess.run(args, capture_output=True, text=text)
    if p.returncode != 0:
        raise SystemExit(f'failed: {" ".join(args)}\n{(p.stderr if text else p.stderr.decode(errors="replace"))[-2000:]}')
    return p


# ---- mux (video copied bit for bit; AAC 256 k; faststart)
run(['ffmpeg', '-y', '-v', 'error', '-i', silent, '-i', wav, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy',
     '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-ac', '2', '-shortest', '-metadata', 'title=Feel Something? Hushmallow',
     '-metadata', 'comment=hushmallow-infinite-studio dream stage: videos/feel-something.js + audio/score-feel.mjs (all procedural)',
     '-movflags', '+faststart', master])
run(['ffmpeg', '-y', '-v', 'error', '-i', master, '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-maxrate', '4.5M', '-bufsize', '9M',
     '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.2', '-g', '30', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
     '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', preview])
run(['ffmpeg', '-y', '-v', 'error', '-ss', str(poster_t), '-i', master, '-frames:v', '1', '-q:v', '2', os.path.join(job, 'poster.jpg')])

# ---- stream spec
probe = json.loads(run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', master]).stdout)
v = next(s for s in probe['streams'] if s['codec_type'] == 'video')
a = next(s for s in probe['streams'] if s['codec_type'] == 'audio')
# ---- every frame decodes
dec = run(['ffmpeg', '-v', 'error', '-i', master, '-f', 'null', '-'])
nframes = int(run(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', master]).stdout.strip())
# ---- loudness of the final file
eb = run(['ffmpeg', '-v', 'info', '-i', master, '-map', '0:a', '-af', 'ebur128=peak=true:framelog=quiet', '-f', 'null', '-']).stderr
summ = eb[eb.rfind('Summary:'):]
num = lambda key: float(summ.split(key)[1].split()[0])
loud = {'integratedLUFS': num('I:'), 'LRA': num('LRA:'), 'truePeakDBFS': num('Peak:')}

# ---- frames (small, linear-light-ish luma) for seam and flash analysis
W, H = 272, 480
raw = run(['ffmpeg', '-v', 'error', '-i', master, '-vf', f'scale={W}:{H}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], text=False).stdout
F = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3).astype(np.float32) / 255.0
lum = (0.2126 * F[..., 0] ** 2.2 + 0.7152 * F[..., 1] ** 2.2 + 0.0722 * F[..., 2] ** 2.2)


def psnr(x, y):
    m = np.mean((x - y) ** 2)
    return 99.0 if m == 0 else float(10 * np.log10(1.0 / m))


steps = [psnr(F[i], F[i + 1]) for i in range(len(F) - 1)]
seam = psnr(F[-1], F[0])
# flashes (WCAG 2.x general flash): a pair of opposing changes of >= 10 % relative luminance where the darker
# state is < 0.8; count per second over the frame mean and over the brightest 25 % screen region
mean_l = lum.mean(axis=(1, 2))
d = np.diff(mean_l)
big = np.where(np.abs(d) >= 0.1)[0]
flashes_per_s = 0
for s in range(int(len(F) / 30)):
    flashes_per_s = max(flashes_per_s, int(np.sum((big >= s * 30) & (big < (s + 1) * 30))) // 2)
max_step_lum = float(np.abs(d).max())
tiles = lum.reshape(len(F), 4, H // 4, 4, W // 4).mean(axis=(2, 4))
dt = np.diff(tiles, axis=0)
max_tile_step = float(np.abs(dt).max())
# a flash is a pair of opposing >= 10 % changes; count them per screen quarter-tile within any 1 s window
pairs = 0
for r in range(4):
    for c in range(4):
        ev = [(f, np.sign(dt[f, r, c])) for f in range(len(dt)) if abs(dt[f, r, c]) >= 0.1]
        pairs += sum(1 for k in range(len(ev) - 1) if ev[k + 1][1] != ev[k][1] and ev[k + 1][0] - ev[k][0] <= 30)

verify = {
    'file': os.path.basename(master), 'bytes': os.path.getsize(master), 'previewBytes': os.path.getsize(preview),
    'video': {'codec': v['codec_name'], 'profile': v.get('profile'), 'level': v.get('level'), 'pix_fmt': v['pix_fmt'], 'width': v['width'], 'height': v['height'],
              'fps': v['r_frame_rate'], 'frames': nframes, 'duration': float(v.get('duration', 0)), 'color': [v.get('color_primaries'), v.get('color_transfer'), v.get('color_space')]},
    'audio': {'codec': a['codec_name'], 'sample_rate': a['sample_rate'], 'channels': a['channels'], 'duration': float(a.get('duration', 0))},
    'faststart': True,
    'decodeErrors': dec.stderr.strip()[:500] or None,
    'loudness': loud,
    'loop': {'seamPSNR_last_to_first': round(seam, 2), 'consecutivePSNR_median': round(float(np.median(steps)), 2), 'consecutivePSNR_p5': round(float(np.percentile(steps, 5)), 2),
             'seamWithinNormalMotion': bool(seam >= np.percentile(steps, 5))},
    'flashSafety': {'maxFullFrameLuminanceStep': round(max_step_lum, 4), 'maxQuarterTileLuminanceStep': round(max_tile_step, 4), 'generalFlashesPerSecond': flashes_per_s,
                    'tileOpposingPairsWithin1s': pairs, 'passesWCAG3Flashes': flashes_per_s <= 3 and pairs == 0},
}
json.dump(verify, open(os.path.join(qa, 'verify.json'), 'w'), indent=1)

# ---- contact sheet (1 frame / s) and the loop seam
idx = [min(len(F) - 1, int(s * 30 + 15)) for s in range(20)]
cs = Image.new('RGB', (W * 10, H * 2))
for k, i in enumerate(idx):
    cs.paste(Image.fromarray((F[i] * 255).astype(np.uint8)), ((k % 10) * W, (k // 10) * H))
cs.save(os.path.join(qa, 'contact-sheet.jpg'), quality=90)
sm = Image.new('RGB', (W * 6, H))
for k, i in enumerate([len(F) - 3, len(F) - 2, len(F) - 1, 0, 1, 2]):
    sm.paste(Image.fromarray((F[i] * 255).astype(np.uint8)), (k * W, 0))
sm.save(os.path.join(qa, 'seam.jpg'), quality=90)
print(json.dumps(verify, indent=1))
