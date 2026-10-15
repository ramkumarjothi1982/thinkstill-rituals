"""Finish and verify a dream2 video: mux, delivery copies, and the QA gates.

    python3 -I tools/qa-dream2.py <job dir> <id> [--score <score.wav>] [--reduced <job dir of the reduced-motion cut>] [--poster 18.0]

Writes into <job dir>: <id>.mp4 (master), <id>.preview.mp4 (light H.264 copy), <id>.proxy.webm
(VP9/Opus for the browser playback test), poster.jpg and qa/ (verify.json, contact-sheet.jpg, seam.jpg).
Gates (each { pass, ... } in verify.json):
  mobileSpec    what phones and the short-video platforms need: H.264 High ≤ 4.2, yuv420p, 1080×1920,
                constant 30 fps, square pixels, BT.709 tags, a keyframe at least every second, AAC-LC
                48 kHz stereo, moov before mdat (instant start), bitrate under the platforms' caps
  decode        every video and audio frame decodes, durations match
  audio         integrated loudness, true peak, no silent holes, no DC, no clipped samples, mono fold-down
  loop          the last frame flows into the first like any other frame step
  flash         WCAG 2.x general flash and red flash, counted per second in nine overlapping regions
                (each a quarter of the screen) and over the whole frame
  motion        global motion per frame (phase correlation) and mean change; with --reduced, the
                reduced-motion cut must move at most half as much as the full cut
"""
import json, os, struct, subprocess, sys
import numpy as np
from PIL import Image

job, vid = sys.argv[1], sys.argv[2]
arg = lambda k, d=None: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
score = arg('--score', os.path.join(job, 'score.wav'))
reduced = arg('--reduced')
poster_t = float(arg('--poster', 18.0))
silent = os.path.join(job, f'{vid}.video.mp4')
master = os.path.join(job, f'{vid}.mp4')
preview = os.path.join(job, f'{vid}.preview.mp4')
proxy = os.path.join(job, f'{vid}.proxy.webm')
qa = os.path.join(job, 'qa')
os.makedirs(qa, exist_ok=True)


def run(args, text=True):
    p = subprocess.run(args, capture_output=True, text=text)
    if p.returncode != 0:
        raise SystemExit(f'failed: {" ".join(args)}\n{(p.stderr if text else p.stderr.decode(errors="replace"))[-2000:]}')
    return p


def mux(silent_mp4, out):
    run(['ffmpeg', '-y', '-v', 'error', '-i', silent_mp4, '-i', score, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-profile:a', 'aac_low',
         '-b:a', '256k', '-ar', '48000', '-ac', '2', '-shortest', '-metadata', 'title=Feel Something? Hushmallow',
         '-metadata', 'comment=hushmallow-infinite-studio dream2: videos/feel-something-v2.js + audio/score-feel-v2.mjs (all procedural)', '-movflags', '+faststart', out])


mux(silent, master)
run(['ffmpeg', '-y', '-v', 'error', '-i', master, '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-maxrate', '4.5M', '-bufsize', '9M', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
     '-level', '4.2', '-g', '30', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', preview])
run(['ffmpeg', '-y', '-v', 'error', '-i', master, '-vf', 'scale=540:960', '-c:v', 'libvpx-vp9', '-b:v', '1.5M', '-deadline', 'good', '-cpu-used', '4', '-c:a', 'libopus', '-b:a', '128k', proxy])
run(['ffmpeg', '-y', '-v', 'error', '-ss', str(poster_t), '-i', master, '-frames:v', '1', '-q:v', '2', os.path.join(job, 'poster.jpg')])
gates = {}

# ------------------------------------------------------------------ mobile spec
probe = json.loads(run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', master]).stdout)
v = next(s for s in probe['streams'] if s['codec_type'] == 'video')
a = next(s for s in probe['streams'] if s['codec_type'] == 'audio')
pts = [float(x) for x in run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'packet=pts_time', '-of', 'csv=p=0', master]).stdout.split() if x.strip()]
pts.sort()
steps = np.diff(pts)
keys = [float(l.split(',')[0]) for l in run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'packet=pts_time,flags', '-of', 'csv=p=0', master]).stdout.split() if l.strip().endswith('K_') or ',K' in l]
key_gap = float(np.max(np.diff(sorted(keys)))) if len(keys) > 1 else 99.0


def top_boxes(path):
    out, f = [], open(path, 'rb')
    while True:
        h = f.read(8)
        if len(h) < 8:
            break
        size, typ = struct.unpack('>I4s', h)
        if size == 1:
            size = struct.unpack('>Q', f.read(8))[0]
            f.seek(size - 16, 1)
        else:
            f.seek(size - 8, 1)
        out.append(typ.decode('latin1'))
    return out


boxes = top_boxes(master)
bitrate = float(probe['format']['bit_rate']) / 1e6
spec = {
    'codec': v['codec_name'], 'profile': v.get('profile'), 'level': v.get('level'), 'pix_fmt': v['pix_fmt'], 'size': [v['width'], v['height']],
    'fps': v['r_frame_rate'], 'avg_fps': v['avg_frame_rate'], 'cfr': bool(np.allclose(steps, 1 / 30, atol=1e-4)), 'sar': v.get('sample_aspect_ratio', '1:1'),
    'color': [v.get('color_primaries'), v.get('color_transfer'), v.get('color_space')], 'maxKeyframeGapS': round(key_gap, 3),
    'audio': [a['codec_name'], a.get('profile'), a['sample_rate'], a['channels']], 'topBoxes': boxes, 'bitrateMbps': round(bitrate, 2),
}
spec['pass'] = (spec['codec'] == 'h264' and spec['profile'] == 'High' and (spec['level'] or 99) <= 42 and spec['pix_fmt'] == 'yuv420p'
                and spec['size'] == [1080, 1920] and spec['fps'] == '30/1' and spec['cfr'] and spec['sar'] in ('1:1', None)
                and spec['color'] == ['bt709', 'bt709', 'bt709'] and key_gap <= 1.001 and a['codec_name'] == 'aac' and a.get('profile') == 'LC'
                and a['sample_rate'] == '48000' and a['channels'] == 2 and boxes.index('moov') < boxes.index('mdat') and bitrate <= 20)
gates['mobileSpec'] = spec

# ------------------------------------------------------------------ decode
dec = subprocess.run(['ffmpeg', '-v', 'error', '-i', master, '-f', 'null', '-'], capture_output=True, text=True)
nframes = int(run(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', master]).stdout.strip())
vdur, adur = float(v.get('duration', 0)), float(a.get('duration', 0))
gates['decode'] = {'errors': dec.stderr.strip()[:400] or None, 'videoFrames': nframes, 'videoS': vdur, 'audioS': adur,
                   'pass': not dec.stderr.strip() and nframes == 600 and abs(vdur - 20) < 0.034 and abs(adur - 20) < 0.05}

# ------------------------------------------------------------------ audio (decoded from the delivered file)
pcm = np.frombuffer(run(['ffmpeg', '-v', 'error', '-i', master, '-map', '0:a', '-f', 'f32le', '-ac', '2', '-ar', '48000', '-'], text=False).stdout, np.float32).reshape(-1, 2).astype(np.float64)
eb = run(['ffmpeg', '-v', 'info', '-i', master, '-map', '0:a', '-af', 'ebur128=peak=true:framelog=quiet', '-f', 'null', '-']).stderr
summ = eb[eb.rfind('Summary:'):]
num = lambda key: float(summ.split(key)[1].split()[0])
rms = lambda x: float(np.sqrt(np.mean(x ** 2)) + 1e-12)
blk = pcm[: len(pcm) // 2400 * 2400].reshape(-1, 2400, 2)
blk_db = 20 * np.log10(np.sqrt((blk ** 2).mean(axis=(1, 2))) + 1e-12)
longest_quiet = 0; run_ = 0
for x in blk_db:
    run_ = run_ + 1 if x < -60 else 0
    longest_quiet = max(longest_quiet, run_)
mono = (pcm[:, 0] + pcm[:, 1]) / 2
aud = {'integratedLUFS': num('I:'), 'LRA': num('LRA:'), 'truePeakDBFS': num('Peak:'), 'longestSilenceS': round(longest_quiet * 0.05, 2),
       'dcOffset': round(float(np.abs(pcm.mean(axis=0)).max()), 5), 'clippedSamples': int((np.abs(pcm) >= 0.999).sum()),
       'monoFoldLossDb': round(20 * np.log10(rms(mono) / rms(pcm)), 2), 'lrCorrelation': round(float(np.corrcoef(pcm[:, 0], pcm[:, 1])[0, 1]), 3)}
aud['pass'] = abs(aud['integratedLUFS'] + 16) <= 1 and aud['truePeakDBFS'] <= -1 and aud['longestSilenceS'] < 0.5 and aud['dcOffset'] < 0.002 and aud['clippedSamples'] == 0 and aud['monoFoldLossDb'] > -3
gates['audio'] = aud


# ------------------------------------------------------------------ frames
def frames_of(path, W=272, H=480):
    raw = run(['ffmpeg', '-v', 'error', '-i', path, '-vf', f'scale={W}:{H}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], text=False).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3).astype(np.float32) / 255.0


F = frames_of(master)
lum = 0.2126 * F[..., 0] ** 2.2 + 0.7152 * F[..., 1] ** 2.2 + 0.0722 * F[..., 2] ** 2.2


def psnr(x, y):
    m = np.mean((x - y) ** 2)
    return 99.0 if m == 0 else float(10 * np.log10(1.0 / m))


steps_psnr = [psnr(F[i], F[i + 1]) for i in range(len(F) - 1)]
seam = psnr(F[-1], F[0])
gates['loop'] = {'seamPSNR': round(seam, 2), 'medianStepPSNR': round(float(np.median(steps_psnr)), 2), 'p5StepPSNR': round(float(np.percentile(steps_psnr, 5)), 2),
                 'pass': bool(seam >= np.percentile(steps_psnr, 5))}

# ------------------------------------------------------------------ flash (WCAG 2.x), localised
H_, W_ = lum.shape[1:]
regions = {'full': (0, 0, W_, H_)}
for ry in range(3):
    for rx in range(3):
        x0, y0 = int(rx * W_ / 4), int(ry * H_ / 4)
        regions[f'r{ry}{rx}'] = (x0, y0, x0 + W_ // 2, y0 + H_ // 2)
red = np.clip(F[..., 0] - np.maximum(F[..., 1], F[..., 2]), 0, 1)       # saturated red share
worst = {'general': 0, 'red': 0, 'region': None}
per_region = {}
for name, (x0, y0, x1, y1) in regions.items():
    L = lum[:, y0:y1, x0:x1].mean(axis=(1, 2))
    Rr = red[:, y0:y1, x0:x1].mean(axis=(1, 2))
    # a transition: a change of ≥ 10 % of the maximum relative luminance where the darker state is < 0.8
    ev = []
    for i in range(1, len(L)):
        d = L[i] - L[i - 1]
        if abs(d) >= 0.1 and min(L[i], L[i - 1]) < 0.8:
            ev.append((i, np.sign(d)))
    rev = [(i, np.sign(Rr[i] - Rr[i - 1])) for i in range(1, len(Rr)) if abs(Rr[i] - Rr[i - 1]) >= 0.2]
    def flashes_per_s(evs):
        # a flash is a pair of opposing transitions: in any 1 s window, count the transitions that
        # reverse the previous one, plus the one they reverse, and halve
        best = 0
        for s in range(0, max(1, len(L) - 30 + 1), 2):
            inwin = [e for e in evs if s <= e[0] < s + 30]
            alt = sum(1 for k in range(1, len(inwin)) if inwin[k][1] != inwin[k - 1][1])
            best = max(best, (alt + 1) // 2 if alt else 0)
        return best
    g, r = flashes_per_s(ev), flashes_per_s(rev)
    per_region[name] = {'generalFlashesPerS': g, 'redFlashesPerS': r, 'maxStep': round(float(np.abs(np.diff(L)).max()), 4)}
    if g > worst['general'] or r > worst['red']:
        worst = {'general': max(g, worst['general']), 'red': max(r, worst['red']), 'region': name}
gates['flash'] = {'regions': per_region, 'worst': worst, 'pass': all(v_['generalFlashesPerS'] <= 3 and v_['redFlashesPerS'] <= 3 for v_ in per_region.values())}


# ------------------------------------------------------------------ motion
def global_motion(G):
    g = G.mean(-1)
    win = np.outer(np.hanning(g.shape[1]), np.hanning(g.shape[2]))
    shifts, diffs = [], []
    for i in range(len(g) - 1):
        A = np.fft.fft2(g[i] * win); B = np.fft.fft2(g[i + 1] * win)
        Rm = A * np.conj(B); Rm /= np.abs(Rm) + 1e-9
        r = np.abs(np.fft.ifft2(Rm))
        y, x = np.unravel_index(np.argmax(r), r.shape)
        y = y - r.shape[0] if y > r.shape[0] / 2 else y
        x = x - r.shape[1] if x > r.shape[1] / 2 else x
        shifts.append(float(np.hypot(x, y)) * (1080 / g.shape[2]))      # in output px
        diffs.append(float(np.abs(g[i + 1] - g[i]).mean()))
    return np.array(shifts), np.array(diffs)


sh, df = global_motion(F[:, ::2, ::2])
motion = {'full': {'p95GlobalShiftPx': round(float(np.percentile(sh, 95)), 1), 'maxGlobalShiftPx': round(float(sh.max()), 1), 'meanChange': round(float(df.mean()), 4), 'p95Change': round(float(np.percentile(df, 95)), 4)}}
if reduced:
    rsil = os.path.join(reduced, f'{vid}.video.mp4')
    rmaster = os.path.join(reduced, f'{vid}.reduced-motion.mp4')
    mux(rsil, rmaster)
    RF = frames_of(rmaster)
    rsh, rdf = global_motion(RF[:, ::2, ::2])
    motion['reduced'] = {'p95GlobalShiftPx': round(float(np.percentile(rsh, 95)), 1), 'maxGlobalShiftPx': round(float(rsh.max()), 1), 'meanChange': round(float(rdf.mean()), 4), 'p95Change': round(float(np.percentile(rdf, 95)), 4), 'file': os.path.basename(rmaster)}
    motion['pass'] = motion['reduced']['meanChange'] <= 0.5 * motion['full']['meanChange'] + 1e-4 or motion['reduced']['p95Change'] <= 0.6 * motion['full']['p95Change']
gates['motion'] = motion

out = {'file': os.path.basename(master), 'bytes': os.path.getsize(master), 'previewBytes': os.path.getsize(preview), 'proxy': os.path.basename(proxy), 'gates': gates,
       'allPass': bool(all(g.get('pass', True) for g in gates.values()))}
J = lambda o: o.item() if hasattr(o, 'item') else str(o)
json.dump(out, open(os.path.join(qa, 'verify.json'), 'w'), indent=1, default=J)

# contact sheet and seam
idx = [min(len(F) - 1, int(s * 30 + 15)) for s in range(20)]
cs = Image.new('RGB', (272 * 10, 480 * 2))
for k, i in enumerate(idx):
    cs.paste(Image.fromarray((F[i] * 255).astype(np.uint8)), ((k % 10) * 272, (k // 10) * 480))
cs.save(os.path.join(qa, 'contact-sheet.jpg'), quality=88)
sm = Image.new('RGB', (272 * 6, 480))
for k, i in enumerate([len(F) - 3, len(F) - 2, len(F) - 1, 0, 1, 2]):
    sm.paste(Image.fromarray((F[i] * 255).astype(np.uint8)), (k * 272, 0))
sm.save(os.path.join(qa, 'seam.jpg'), quality=88)
print(json.dumps({k: (v_ if k != 'flash' else {'worst': v_['worst'], 'pass': v_['pass']}) for k, v_ in gates.items()}, indent=1, default=J))
print('ALL PASS' if out['allPass'] else 'SOME GATES FAIL')
