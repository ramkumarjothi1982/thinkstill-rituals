#!/usr/bin/env python3
"""Soundtrack QA for Hushmallow Infinite Studio.

    python3 audio/qa.py <cues.json> <soundtrack.wav> <outdir>

Writes to <outdir>:
  waveform.png     ffmpeg showwavespic + cue markers / labels / time grid (PIL)
  spectrogram.png  ffmpeg showspectrumpic (log frequency, with legend)
  report.json      EBU R128 loudness (integrated, LRA, true peak), per-cue onset
                   error for the transient cues, per-section RMS and 2-5 kHz share,
                   and the mix checks: phone-band contrast per cue, event and
                   segment loudness (full range and phone-simulated), low-end
                   share in the warm section, start / end of file

Onset detection (per cue): 600 Hz high-pass (FFT) -> 2 ms RMS envelope -> the
largest peak in [cue-50 ms, cue+120 ms] (clipped before the next transient
cue) -> the onset is where the rise into that peak crosses 20 % of the way
from the preceding valley to the peak. Error = onset - cue time.

Phone model: a 350 Hz high-pass (phone speakers play little below ~350-400 Hz).
Phone contrast = RMS of the high-passed mix over [cue, cue+150 ms] vs the
150 ms before the cue, in dB (a bubble pop measures about +9 dB).
Phone-simulated loudness = EBU R128 momentary loudness after a 4-pole 350 Hz
high-pass.
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
PHONE_HP = 350.0


def story_segments(cues, dur):
    """Story beats (from the cue log) -> analysis windows [(name, from, to)]."""
    t = lambda typ, d=None: min([c['t'] for c in cues if c['type'] == typ] or [d])
    last = lambda typ, d=None: max([c['t'] for c in cues if c['type'] == typ] or [d])
    ping, startle, close = t('ping', 1.4), t('startle', 1.8), t('close', 7.0)
    b0, m1 = t('bubble', 3.2), last('mini', 6.0)
    inhale, hold, exhale = t('inhale', close + 0.2), t('hold', close + 1.7), t('exhale', close + 2.0)
    squish, release, opn, chime = t('squish', exhale + 1.3), last('release', exhale + 1.5), t('open', exhale + 2.3), t('chime', dur - 1.6)
    seg = [('night', 0.0, ping - 0.05), ('startle', startle - 0.05, startle + 0.9), ('bubbles', b0 - 0.3, b0 + 1.6),
           ('spiral', m1 + 0.2, close), ('inhale', inhale, hold), ('exhale', exhale, exhale + 1.2),
           ('squash+release', squish - 0.05, release + 0.5), ('calm', opn + 0.3, chime - 0.1), ('chime', chime, min(dur - 0.6, chime + 1.0)),
           ('fade', dur - 0.6, dur)]
    return [(n, round(a, 3), round(b, 3)) for n, a, b in seg if b - a > 0.2]


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


def momentary(wav, pre=''):
    """EBU R128 momentary loudness (400 ms window) every 100 ms: {window end time: LUFS}."""
    af = (pre + ',' if pre else '') + 'ebur128'
    err = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-loglevel', 'verbose', '-i', str(wav), '-af', af,
                          '-f', 'null', '-'], capture_output=True, text=True).stderr
    return {round(float(m.group(1)), 1): float(m.group(2))
            for m in re.finditer(r't:\s*([\d.]+)\s+TARGET:-?\d+ LUFS\s+M:\s*(-?[\d.]+)', err)}


def probe(wav):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'stream=sample_rate,channels,codec_name,duration_ts,duration',
                          '-of', 'json', str(wav)], check=True, capture_output=True, text=True).stdout
    return json.loads(out)['streams'][0]


def lowpass(x, fc):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    w = np.clip((fc * 1.15 - f) / (fc * 0.15), 0, 1)
    return np.fft.irfft(X * w, len(x))


def rms(x, a, b):
    s = x[int(a * SR):int(b * SR)]
    return float(np.sqrt(np.mean(s ** 2) + 1e-30))


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


def segment_loudness(wav, a, b, pre=''):
    """EBU R128 integrated loudness of [a, b] (optionally after a pre-filter)."""
    af = (pre + ',' if pre else '') + 'ebur128'
    err = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-ss', str(a), '-to', str(b), '-i', str(wav), '-af', af,
                          '-f', 'null', '-'], capture_output=True, text=True).stderr
    m = re.search(r'I:\s+(-?[\d.]+) LUFS', err[err.rfind('Summary:'):])
    return float(m.group(1)) if m else None


def section_stats(st, mono_hp_band, a, b, mom=None):
    i0, i1 = int(a * SR), int(b * SR)
    seg = st[i0:i1]
    rms = np.sqrt(np.mean(seg ** 2))
    band = np.sqrt(np.mean(mono_hp_band[i0:i1] ** 2))
    mono = seg.mean(axis=1)
    return {'from': a, 'to': b, 'rms_dbfs': db(rms), 'peak_dbfs': db(np.max(np.abs(seg))),
            'band_2_5k_db_rel': round(db(band) - db(np.sqrt(np.mean(mono ** 2))), 1),
            'momentary_max_lufs': max([v for t, v in (mom or {}).items() if a + 0.4 <= t <= b + 1e-6] or [None], key=lambda v: -999 if v is None else v)}


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
    mom = momentary(wav)
    phone_pre = f'highpass=f={PHONE_HP:g}:poles=2,highpass=f={PHONE_HP:g}:poles=2'
    mom_phone = momentary(wav, phone_pre)

    # --- mix checks
    phone = highpass(mono, PHONE_HP)
    contrast = []
    for c in cues:
        if c['type'] in TRANSIENT + ('ping', 'open'):
            tc = c['t']
            contrast.append({'type': c['type'] + ('(soft)' if c.get('soft') else ''), 'cue_s': tc,
                             'phone_contrast_db': round(db(rms(phone, tc, tc + 0.15)) - db(rms(phone, tc - 0.15, tc)), 1),
                             'full_contrast_db': round(db(rms(mono, tc, tc + 0.15)) - db(rms(mono, tc - 0.15, tc)), 1)})
    first_t = lambda typ, d: min([c['t'] for c in cues if c['type'] == typ] or [d])
    mmax = lambda M, a, b: max([v for t, v in M.items() if a <= t <= b] or [None], key=lambda v: -999 if v is None else v)
    events = {}
    for name, a, b in [('startle', first_t('startle', 1.8), first_t('startle', 1.8) + 0.6),
                       ('squash+release', first_t('squish', 10.3), max([c['t'] for c in cues if c['type'] == 'release'] or [10.5]) + 0.6),
                       ('chime', first_t('chime', 13.4), first_t('chime', 13.4) + 1.0)]:
        events[name] = {'momentary_max_lufs': mmax(mom, a + 0.1, b), 'phone_momentary_max_lufs': mmax(mom_phone, a + 0.1, b)}
    o, ch = first_t('open', 11.3), first_t('chime', 13.4)
    wa, wb = o, min(ch, o + 2.0)                     # warm section: eyes open -> chime (<= 2 s)
    lo = lowpass(mono, 200)
    warm = {'from': wa, 'to': wb, 'share_below_200hz': round(rms(lo, wa, wb) ** 2 / rms(mono, wa, wb) ** 2, 3),
            'below_200hz_rms_dbfs': db(rms(lo, wa, wb)), 'above_350hz_rms_dbfs': db(rms(phone, wa, wb)),
            'whole_piece_share_below_200hz': round(rms(lo, 0, dur) ** 2 / rms(mono, 0, dur) ** 2, 3)}
    segments = {n: {'from': a, 'to': b, 'integrated_lufs': segment_loudness(wav, a, b),
                    'phone_integrated_lufs': segment_loudness(wav, a, b, phone_pre)} for n, a, b in story_segments(cues, dur)}
    report = {
        'file': str(wav),
        'format': {'codec': info.get('codec_name'), 'sample_rate': int(info['sample_rate']), 'channels': info['channels'],
                   'samples': int(st.shape[0]), 'duration_s': st.shape[0] / SR},
        'loudness': {**loud, 'target_lufs': -16.0, 'max_true_peak_dbtp': -1.5,
                     'pass': abs(loud['integrated_lufs'] + 16) <= 0.5 and loud['true_peak_dbtp'] <= -1.5},
        'onsets': {'tolerance_ms': TOL_MS, 'graded_count': len(graded), 'all_pass': bool(all(o['pass'] for o in graded)),
                   'max_abs_error_ms': float(np.max(np.abs(errs))) if len(errs) else None,
                   'mean_error_ms': round(float(np.mean(errs)), 1) if len(errs) else None, 'cues': onsets},
        'sections': {name: section_stats(st, band, a, b, mom) for name, a, b in SECTIONS},
        'fine_sections': {name: section_stats(st, band, a, b, mom) for name, a, b in story_segments(cues, dur)},
        'mix': {'phone_highpass_hz': PHONE_HP, 'contrast': contrast, 'events': events,
                'phone_integrated_lufs': segment_loudness(wav, 0, dur, phone_pre), 'warm_section': warm,
                'story_segments': segments},
        'edges': {'first_5ms_rms_dbfs': db(rms(st, 0, 0.005)), 'first_33ms_rms_dbfs': db(np.sqrt(np.mean(st[:int(0.033 * SR)] ** 2))),
                  'first_100ms_rms_dbfs': db(rms(st, 0, 0.1)), 'last_10ms_peak_dbfs': db(np.max(np.abs(st[-480:])))},
    }
    (outdir / 'report.json').write_text(json.dumps(report, indent=1))
    waveform_png(wav, cues, outdir / 'waveform.png', dur)
    spectrogram_png(wav, outdir / 'spectrogram.png')
    print(json.dumps({'loudness': report['loudness'], 'onsets_all_pass': report['onsets']['all_pass'],
                      'max_abs_error_ms': report['onsets']['max_abs_error_ms']}, indent=1))


if __name__ == '__main__':
    main()
