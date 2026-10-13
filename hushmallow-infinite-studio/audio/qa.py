#!/usr/bin/env python3
"""Soundtrack QA for Hushmallow Infinite Studio.

    python3 audio/qa.py <cues.json> <soundtrack.wav> <outdir>

Writes to <outdir>:
  waveform.png     ffmpeg showwavespic + cue markers / labels / time grid (PIL)
  spectrogram.png  ffmpeg showspectrumpic (log frequency, with legend)
  report.json      EBU R128 loudness (integrated, LRA, true peak), per-cue onset
                   error for the transient cues, per-section RMS and 2-5 kHz share

Onset detection (per cue): 600 Hz high-pass (FFT) -> 2 ms RMS envelope -> the
largest peak in [cue-50 ms, cue+120 ms] (clipped before the next transient
cue) -> the onset is where the rise into that peak crosses 20 % of the way
from the preceding valley to the peak. Error = onset - cue time.
Requires numpy, Pillow and ffmpeg/ffprobe on PATH.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

SR = 48000
TRANSIENT = ('startle', 'bubble', 'mini', 'blink', 'squish', 'release', 'chime')
ALSO = ('ping', 'tail')        # measured too, reported separately (not in the pass/fail set)
TOL_MS = 33.3                  # one frame at 30 fps
SECTIONS = [('hook', 0.0, 3.0), ('overthinking', 3.0, 7.0), ('hushmallow', 7.0, 12.0), ('ending', 12.0, 15.0)]
FINE = [('night (0-1.45)', 0.0, 1.45), ('startle+blinks (1.75-2.7)', 1.75, 2.7), ('bubbles (3.0-4.8)', 3.0, 4.8),
        ('swirl peak (6.2-7.0)', 6.2, 7.0), ('inhale (7.2-8.7)', 7.2, 8.7), ('exhale+dissolve (9.0-10.2)', 9.0, 10.2),
        ('warm calm (11.6-13.3)', 11.6, 13.3), ('chime (13.4-14.4)', 13.4, 14.4), ('fade (14.4-15)', 14.4, 15.0)]


def decode(wav):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(wav), '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype='<f4').reshape(-1, 2).astype(np.float64)


def loudness(wav):
    err = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(wav), '-af', 'ebur128=peak=true:framelog=quiet',
                          '-f', 'null', '-'], capture_output=True, text=True).stderr
    s = err[err.rfind('Summary:'):]
    num = lambda pat: float(re.search(pat, s).group(1))
    return {'integrated_lufs': num(r'I:\s+(-?[\d.]+) LUFS'), 'lra_lu': num(r'LRA:\s+(-?[\d.]+) LU'),
            'true_peak_dbtp': num(r'Peak:\s+(-?[\d.]+) dBFS')}


def probe(wav):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'stream=sample_rate,channels,codec_name,duration_ts,duration',
                          '-of', 'json', str(wav)], check=True, capture_output=True, text=True).stdout
    return json.loads(out)['streams'][0]


def highpass(x, fc):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    w = np.clip((f - fc * 0.7) / (fc * 0.3), 0, 1)       # short linear taper below fc
    return np.fft.irfft(X * w, len(x))


def envelope(x, win=0.002):
    n = int(win * SR)
    c = np.concatenate([[0.0], np.cumsum(x * x)])
    e = np.sqrt(np.maximum((c[n:] - c[:-n]) / n, 0))
    return np.concatenate([e, np.full(n - 1, e[-1])])  # value at i = RMS of [i, i+n)


def onset(env, tc, t_next):
    lo = int((tc - 0.05) * SR)
    hi = int(min(tc + 0.12, t_next - 0.012) * SR)
    seg = env[lo:hi]
    ip = lo + int(np.argmax(seg))
    p = env[ip]
    v0 = max(0, ip - int(0.09 * SR))
    iv = v0 + int(np.argmin(env[v0:ip + 1]))
    f = env[iv]
    th = f + 0.2 * (p - f)
    i = ip
    while i > iv and env[i] >= th:
        i -= 1
    on = (i + 1) / SR
    return {'onset_s': round(on, 4), 'error_ms': round((on - tc) * 1000, 1), 'peak_s': round(ip / SR, 4),
            'rise_db': round(20 * np.log10(max(p, 1e-12) / max(f, 1e-12)), 1)}


def db(x):
    return round(float(20 * np.log10(max(x, 1e-12))), 1)


def section_stats(st, mono_hp_band, a, b):
    i0, i1 = int(a * SR), int(b * SR)
    seg = st[i0:i1]
    rms = np.sqrt(np.mean(seg ** 2))
    band = np.sqrt(np.mean(mono_hp_band[i0:i1] ** 2))
    mono = seg.mean(axis=1)
    return {'from': a, 'to': b, 'rms_dbfs': db(rms), 'peak_dbfs': db(np.max(np.abs(seg))),
            'band_2_5k_db_rel': round(db(band) - db(np.sqrt(np.mean(mono ** 2))), 1)}


def waveform_png(wav, cues, out, dur):
    W, H, top, bot = 3000, 900, 60, 90
    tmp = out.with_suffix('.tmp.png')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(wav), '-filter_complex',
                    f'showwavespic=s={W}x{H - top - bot}:split_channels=1:colors=0x8f7fe6|0x6fb7d9:scale=sqrt', '-frames:v', '1', str(tmp)], check=True)
    wave = Image.open(tmp).convert('RGBA')
    img = Image.new('RGBA', (W, H), (14, 12, 28, 255))
    img.alpha_composite(wave, (0, top))
    d = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 18)
        small = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 15)
    except OSError:
        font = small = ImageFont.load_default()
    x_of = lambda t: int(t / dur * (W - 1))
    for s in range(int(dur) + 1):
        x = x_of(s)
        d.line([(x, top), (x, H - bot)], fill=(255, 255, 255, 40), width=1)
        d.text((x + 3, H - bot + 52), f'{s}s', fill=(200, 200, 220, 255), font=small)
    for name, a, b in SECTIONS:
        d.text((x_of(a) + 6, 8), name.upper(), fill=(230, 220, 255, 255), font=font)
    colors = {'startle': (255, 90, 90), 'bubble': (255, 200, 80), 'mini': (255, 160, 60), 'blink': (120, 230, 140),
              'squish': (90, 200, 255), 'release': (90, 200, 255), 'chime': (255, 255, 255), 'ping': (200, 160, 255),
              'tail': (150, 130, 90), 'inhale': (140, 200, 200), 'exhale': (140, 200, 200), 'close': (200, 200, 200),
              'dissolve': (190, 170, 255), 'dissolveMini': (150, 130, 220), 'open': (255, 210, 160), 'sleep': (180, 180, 220)}
    row = 0
    for c in sorted(cues, key=lambda c: c['t']):
        col = colors.get(c['type'], (160, 160, 160))
        x = x_of(c['t'])
        d.line([(x, top), (x, H - bot)], fill=col + (170,), width=2 if c['type'] in TRANSIENT else 1)
        if c['type'] in ('tail', 'dissolveMini'):
            continue
        label = c['type'] + (' (soft)' if c.get('soft') else '')
        d.text((x + 3, H - bot + 4 + 22 * (row % 2)), label, fill=col + (255,), font=small)
        row += 1
    img.convert('RGB').save(out)
    tmp.unlink()


def spectrogram_png(wav, out):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(wav), '-lavfi',
                    'showspectrumpic=s=2400x900:mode=combined:color=intensity:scale=log:fscale=log:legend=1:drange=100',
                    '-frames:v', '1', str(out)], check=True)


def main():
    cues_path, wav, outdir = map(Path, sys.argv[1:4])
    outdir.mkdir(parents=True, exist_ok=True)
    log = json.loads(cues_path.read_text())
    cues = sorted(log['cues'], key=lambda c: c['t'])
    dur = float(log['duration'])
    st = decode(wav)
    mono = st.mean(axis=1)
    env = envelope(highpass(mono, 600))
    band = highpass(mono, 2000) - highpass(mono, 5000)

    tset = sorted(c['t'] for c in cues if c['type'] in TRANSIENT + ALSO)
    onsets = []
    for c in cues:
        if c['type'] not in TRANSIENT + ALSO:
            continue
        nxt = min([t for t in tset if t > c['t'] + 1e-6] or [dur])
        r = {'type': c['type'] + ('(soft)' if c.get('soft') else ''), 'cue_s': c['t'], **({'id': c['id']} if 'id' in c else {}),
             **onset(env, c['t'], nxt)}
        r['pass'] = abs(r['error_ms']) <= TOL_MS
        r['graded'] = c['type'] in TRANSIENT
        onsets.append(r)
    graded = [o for o in onsets if o['graded']]
    errs = np.array([o['error_ms'] for o in graded])

    info = probe(wav)
    loud = loudness(wav)
    report = {
        'file': str(wav),
        'format': {'codec': info.get('codec_name'), 'sample_rate': int(info['sample_rate']), 'channels': info['channels'],
                   'samples': int(st.shape[0]), 'duration_s': st.shape[0] / SR},
        'loudness': {**loud, 'target_lufs': -16.0, 'max_true_peak_dbtp': -1.5,
                     'pass': abs(loud['integrated_lufs'] + 16) <= 0.5 and loud['true_peak_dbtp'] <= -1.5},
        'onsets': {'tolerance_ms': TOL_MS, 'graded_count': len(graded), 'all_pass': bool(all(o['pass'] for o in graded)),
                   'max_abs_error_ms': float(np.max(np.abs(errs))) if len(errs) else None,
                   'mean_error_ms': round(float(np.mean(errs)), 1) if len(errs) else None, 'cues': onsets},
        'sections': {name: section_stats(st, band, a, b) for name, a, b in SECTIONS},
        'fine_sections': {name: section_stats(st, band, a, b) for name, a, b in FINE},
        'edges': {'first_33ms_rms_dbfs': db(np.sqrt(np.mean(st[:int(0.033 * SR)] ** 2))),
                  'last_10ms_peak_dbfs': db(np.max(np.abs(st[-480:])))},
    }
    (outdir / 'report.json').write_text(json.dumps(report, indent=1))
    waveform_png(wav, cues, outdir / 'waveform.png', dur)
    spectrogram_png(wav, outdir / 'spectrogram.png')
    print(json.dumps({'loudness': report['loudness'], 'onsets_all_pass': report['onsets']['all_pass'],
                      'max_abs_error_ms': report['onsets']['max_abs_error_ms']}, indent=1))


if __name__ == '__main__':
    main()
