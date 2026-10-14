"""G-AUDIO: loudness, sync, the loop seam, gaps, the tension hum, the closing
contour, plus the audio half of the G-DUPES signature.

    python3 -I qa/gates/audio.py <job.json> <out.json>

job.json (from qa/run-qa.mjs): {video, duration, fps, cues: [...], plan (score
plan events or null), turn: [t0, t1] | null, score (score id), artefacts}

  loudness   integrated -16 +/- 0.5 LUFS, true peak <= -1.5 dBTP, LRA <= 10 LU:
             ffmpeg's ebur128 (the same meter render/verify.mjs used)
  sync       (a) the global A/V offset: cross-correlation of the audio's onset
             strength with the cue log's impulse train, over +/-500 ms;
             (b) per cue: the onset nearest each graded cue (600 Hz high-pass,
             2 ms RMS envelope, 20 % rise point, as audio/qa.py), loud cues
             within +/-20 ms, quiet cues within +/-45 ms. A cue whose sound
             rises < `minRiseDb` above its valley is not graded (masked).
  seam       the wrap step |x[0] - x[N-1]| in dBFS (< -60) and the 10 ms RMS
             across the seam, which must lie within 3 dB of the range of its two
             10 ms neighbours (a click rises above both, a dropout falls below)
  gap        no run longer than 1 s below -50 LUFS momentary (K-weighted
             400 ms windows every 100 ms, computed circularly because the
             film loops), outside the planned turn
  hum        the tension hum's level while it sounds, <= -24 dBFS: the power
             within +/-1 STFT bin (5.9 Hz) of the score plan's hum frequency,
             frame by frame, as a sine-equivalent RMS level (an upper bound:
             any other sound in that narrow band counts too)
  tonal      the last 3 tonal events of the score plan never fall
"""
import json
import os
import re
import subprocess
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from qalib.checks import band, check, limits, longest_run, not_run, num  # noqa: E402

GATE = 'G-AUDIO'
SR = 48000
# Cues whose sound is a transient, by loudness class (PHASE2-PLAN: loud +/-20 ms, quiet
# +/-45 ms). Cues scored with sustained sounds (breaths, swishes, sparkle beds, voices
# that swell) have no onset to time and are not graded.
LOUD = {'take', 'land', 'thought', 'release', 'eyes_open', 'logo', 'pop', 'impact', 'chime'}
QUIET = {'blink', 'wince', 'lift_off'}
TONAL = {'bell', 'ping', 'blip'}


def decode(path, duration):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-nostdin', '-i', path, '-map', '0:a:0', '-t', f'{duration:.6f}', '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype='<f4').reshape(-1, 2).astype(np.float64)


def ebur128(path):
    err = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-nostdin', '-i', path, '-map', '0:a:0', '-af', 'ebur128=peak=true:framelog=quiet',
                          '-f', 'null', '-'], capture_output=True, text=True).stderr
    s = err[err.rfind('Summary:'):]
    grab = lambda pat: float(re.search(pat, s).group(1)) if re.search(pat, s) else None
    return {'integratedLUFS': grab(r'I:\s+(-?[\d.]+) LUFS'), 'lra': grab(r'LRA:\s+(-?[\d.]+) LU'), 'truePeakDBTP': grab(r'Peak:\s+(-?[\d.]+) dBFS')}


def k_weight(x):
    """BS.1770 K-weighting at 48 kHz (two biquads), applied circularly (the film loops)."""
    from scipy.signal import lfilter
    b1, a1 = [1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585]
    b2, a2 = [1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621]
    n = len(x)
    y = lfilter(b2, a2, lfilter(b1, a1, np.concatenate([x, x]), axis=0), axis=0)
    return y[n:]


def momentary(x):
    """Momentary loudness (LUFS) of 400 ms windows every 100 ms, circular. -> (times of window centres, values)."""
    y = k_weight(x)
    p = (y ** 2).sum(axis=1)
    n = len(p)
    c = np.concatenate([[0.0], np.cumsum(np.concatenate([p, p[:int(0.4 * SR)]]))])
    starts = np.arange(0, n, int(0.1 * SR))
    w = int(0.4 * SR)
    ms = (c[starts + w] - c[starts]) / w
    return (starts + w / 2) / SR % (n / SR), -0.691 + 10 * np.log10(np.maximum(ms, 1e-20))


def fft_band(x, lo, hi):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X[(f < lo) | (f > hi)] = 0
    return np.fft.irfft(X, len(x))


def envelope(x, win=0.002):
    n = int(win * SR)
    c = np.concatenate([[0.0], np.cumsum(x * x)])
    e = np.sqrt(np.maximum((c[n:] - c[:-n]) / n, 0))
    return np.concatenate([e, np.full(n - 1, e[-1])])


def onset(env, tc, lo_s, hi_s):
    lo, hi = max(0, int((tc + lo_s) * SR)), min(len(env) - 1, int((tc + hi_s) * SR))
    if hi - lo < 10:
        return None
    ip = lo + int(np.argmax(env[lo:hi]))
    p = env[ip]
    v0 = max(0, ip - int(0.09 * SR))
    iv = v0 + int(np.argmin(env[v0:ip + 1]))
    fl = env[iv]
    th = fl + 0.2 * (p - fl)
    i = ip
    while i > iv and env[i] >= th:
        i -= 1
    on = (i + 1) / SR
    return {'onset': on, 'errorMs': (on - tc) * 1000, 'riseDb': 20 * np.log10(max(p, 1e-12) / max(fl, 1e-12))}


def global_offset(mono, cues, max_ms=500):
    """Lag (ms) that best aligns the audio's onset strength with the cue impulse train."""
    hop = int(0.005 * SR)
    e = np.array([float((mono[i:i + hop] ** 2).sum()) for i in range(0, len(mono) - hop, hop)])
    le = np.log10(e + 1e-10)
    flux = np.maximum(0, np.diff(le, prepend=le[0]))
    train = np.zeros_like(flux)
    for c in cues:
        k = int(round(c['t'] * SR / hop))
        if 0 <= k < len(train):
            train[k] += 1.0
    best = (0, -1.0)
    m = max_ms // 5
    for lag in range(-m, m + 1):
        v = float(np.dot(np.roll(flux, -lag), train))      # circular: the film loops
        if v > best[1]:
            best = (lag, v)
    zero = float(np.dot(flux, train))
    return best[0] * 5, best[1], zero


def hum_level(mono, freq, t0, dt, a, b, nfft=8192, hop=2400):
    """Median narrowband level (dBFS, sine-equivalent RMS) of a tone that follows freq(t)."""
    win = np.hanning(nfft)
    norm = (win ** 2).sum()
    df = SR / nfft
    levels, fs = [], []
    for s0 in range(int(a * SR), int(b * SR) - nfft, hop):
        tc = (s0 + nfft / 2) / SR
        k = int(np.clip(round((tc - t0) / dt), 0, len(freq) - 1))
        f = float(freq[k])
        X = np.fft.rfft(mono[s0:s0 + nfft] * win)
        j = int(round(f / df))
        p = float((np.abs(X[max(0, j - 1):j + 2]) ** 2).sum())
        ms = 2.0 * p / (nfft * norm)          # mean square of the tone (one-sided spectrum)
        levels.append(10 * np.log10(max(ms * 2.0, 1e-20)))   # x2: sine-equivalent (0 dBFS = full-scale sine)
        fs.append(f)
    if not levels:
        return None, None
    return float(np.median(levels)), float(np.median(fs))


def db(v):
    return 20 * np.log10(max(v, 1e-12))


def rms(x):
    return float(np.sqrt(np.mean(x ** 2))) if len(x) else 0.0


def waveform_png(x, cues, out, dur):
    from PIL import Image, ImageDraw
    W, H = 1500, 220
    img = Image.new('RGB', (W, H + 20), (10, 10, 16))
    d = ImageDraw.Draw(img)
    mono = x.mean(axis=1)
    n = len(mono)
    for i in range(W):
        seg = mono[i * n // W:(i + 1) * n // W]
        if not len(seg):
            continue
        pk, r = float(np.abs(seg).max()), rms(seg)
        d.line([(i, H / 2 - pk * H / 2), (i, H / 2 + pk * H / 2)], fill=(90, 110, 200))
        d.line([(i, H / 2 - r * H / 2), (i, H / 2 + r * H / 2)], fill=(200, 220, 255))
    for k, c in enumerate(cues):
        xx = int(c['t'] / dur * W)
        d.line([(xx, 0), (xx, H)], fill=(255, 120, 80))
        d.text((xx + 2, 2 + (k % 9) * 11), c['type'][:10], fill=(255, 200, 160))
    for s in range(int(dur) + 1):
        d.text((int(s / dur * W) + 2, H + 4), f'{s}s', fill=(160, 160, 170))
    img.save(out)


def signature(x):
    """Audio signature for G-DUPES: log energy in 8 octave-ish bands over 3 thirds of the film."""
    mono = x.mean(axis=1)
    edges = [60, 150, 300, 600, 1200, 2400, 4800, 9600, 20000]
    thirds = np.array_split(mono, 3)
    out = []
    for seg in thirds:
        X = np.abs(np.fft.rfft(seg)) ** 2
        f = np.fft.rfftfreq(len(seg), 1 / SR)
        tot = X.sum() + 1e-20
        out.append([num(10 * np.log10(X[(f >= a) & (f < b)].sum() / tot + 1e-12), 2) for a, b in zip(edges, edges[1:])])
    return out


def run(job):
    L = limits(GATE)
    dur = float(job['duration'])
    x = decode(job['video'], dur)
    checks, metrics, art = {}, {}, []
    if len(x) < SR:
        return {'checks': {'loudness': not_run('no audio stream (or under 1 s)')}, 'metrics': {}, 'artefacts': []}
    # loudness
    lo = ebur128(job['video'])
    metrics['loudness'] = lo
    I, tp, lra = lo['integratedLUFS'], lo['truePeakDBTP'], lo['lra']
    t, tol = L['loudness']['target'], L['loudness']['tol']
    checks['loudness'] = check('pass' if I is not None and abs(I - t) <= tol else 'fail', I, [t - tol, t + tol], f'integrated {I} LUFS (target {t} +/- {tol})')
    checks['truePeak'] = band(tp, L['truePeak'], unit=' dBTP')
    checks['lra'] = band(lra, L['lra'], unit=' LU')
    # sync
    cues = job.get('cues') or []
    mono = x.mean(axis=1)
    S = L['sync']
    if cues:
        lag, peak, zero = global_offset(mono, cues)
        metrics['globalOffsetMs'] = lag
        checks['offset'] = check('pass' if abs(lag) <= S['globalMs'] else 'fail', lag, S['globalMs'],
                                 f'global A/V offset {lag} ms (cross-correlation of onset strength with the cue log; limit +/-{S["globalMs"]} ms)')
        env = envelope(fft_band(mono, 600, SR / 2))
        times = sorted(c['t'] for c in cues if c['type'] in LOUD | QUIET)
        graded = []
        for c in cues:
            kind = 'loud' if c['type'] in LOUD else 'quiet' if c['type'] in QUIET else None
            if not kind:
                continue
            nxt = next((tt for tt in times if tt > c['t'] + 1e-6), dur)
            hi = min(S['searchMs'][1] / 1000, nxt - c['t'] - 0.012)
            o = onset(env, c['t'], S['searchMs'][0] / 1000, hi)
            if not o:
                continue
            tolms = S['loudMs'] if kind == 'loud' else S['quietMs']
            g = {'cue': c['type'], 't': c['t'], 'kind': kind, 'errorMs': num(o['errorMs'], 1), 'riseDb': num(o['riseDb'], 1), 'toleranceMs': tolms,
                 'graded': bool(o['riseDb'] >= S['minRiseDb'])}
            g['pass'] = (not g['graded']) or abs(o['errorMs']) <= tolms + 1e-6
            graded.append(g)
        bad = [g for g in graded if g['graded'] and not g['pass']]
        n_graded = sum(1 for g in graded if g['graded'])
        metrics['onsets'] = graded
        if n_graded < S['minGraded']:
            checks['onsets'] = not_run(f'only {n_graded} cues have a detectable onset (need {S["minGraded"]})')
        else:
            checks['onsets'] = check('pass' if not bad else 'fail', len(bad), 0,
                                     f'{n_graded} graded cues, {len(bad)} outside tolerance' + (': ' + ', '.join(f"{g['cue']}@{g['t']} {g['errorMs']} ms" for g in bad[:6]) if bad else ''))
    else:
        checks['offset'] = checks['onsets'] = not_run('no cue log')
    # seam
    Z = L['seam']
    step = float(np.abs(x[0] - x[-1]).max())
    legacy = Z.get('legacy', {}).get(job.get('score') or '', None)
    lim_step = legacy['stepDbfs'] if legacy else Z['stepDbfs']
    w = int(Z['windowMs'] / 1000 * SR)
    seamw = np.concatenate([x[-w // 2:], x[:w // 2]])
    before, after = x[-w // 2 - w:-w // 2], x[w // 2:w // 2 + w]
    r0, rb, ra = db(rms(seamw)), db(rms(before)), db(rms(after))
    lo_n, hi_n = min(rb, ra), max(rb, ra)
    ddb = max(0.0, r0 - hi_n, lo_n - r0)            # dB outside the neighbours' range
    metrics['seam'] = {'stepDbfs': num(db(step), 2), 'rmsSeamDb': num(r0, 2), 'rmsBeforeDb': num(rb, 2), 'rmsAfterDb': num(ra, 2)}
    if legacy:
        c = band(db(step), {'fail': legacy['stepDbfs'], 'warn': Z['stepDbfs']}, unit=' dBFS')
        c['detail'] += f' (legacy score {job.get("score")}: provisional limit, R7; new scores must meet {Z["stepDbfs"]} dBFS)'
        checks['seamStep'] = c
    else:
        checks['seamStep'] = band(db(step), {'fail': lim_step}, unit=' dBFS')
    checks['seamRms'] = check('pass' if ddb <= Z['rmsDb'] else 'fail', num(ddb, 2), Z['rmsDb'],
                              f'10 ms RMS across the seam {num(r0, 1)} dB, neighbours {num(rb, 1)} / {num(ra, 1)} dB: {num(ddb, 2)} dB outside their range')
    # gaps
    G = L['gap']
    tm, mom = momentary(x)
    turn = job.get('turn')
    quiet = [(v < G['lufs']) and not (turn and turn[0] <= tt <= turn[1]) for tt, v in zip(tm, mom)]
    gap = longest_run(quiet) * 0.1
    metrics['momentary'] = {'min': num(mom.min(), 1), 'max': num(mom.max(), 1)}
    checks['gap'] = check('pass' if gap <= G['seconds'] + 1e-9 else 'fail', num(gap, 1), G['seconds'],
                          f'longest run below {G["lufs"]} LUFS momentary outside the turn: {num(gap, 1)} s')
    # tension hum and the closing contour come from the score plan
    plan = job.get('plan')
    H = L['hum']
    ten = (plan or {}).get('swirl', {}).get('tension') if isinstance(plan, dict) else None
    if ten and ten.get('gain') and ten.get('freq'):
        sw = plan['swirl']
        gain, freq = np.asarray(ten['gain']), np.asarray(ten['freq'])
        dt, t0 = sw.get('dt', 0.02), sw.get('t0', 0.0)
        on = gain > 0.3 * gain.max() if gain.max() > 0 else np.zeros_like(gain, bool)
        if on.any():
            ts = t0 + np.nonzero(on)[0] * dt
            a, b = max(0.0, float(ts.min())), min(dur, float(ts.max()))
            lev, f0 = hum_level(mono, freq, t0, dt, a, b)
            checks['hum'] = band(lev, {'fail': H['fail']}, unit=' dBFS')
            checks['hum']['detail'] = f'tension hum near {num(f0, 1)} Hz over {num(a, 2)}-{num(b, 2)} s: {num(lev, 1)} dBFS (sine-equivalent RMS, upper bound); limit {H["fail"]} dBFS'
            metrics['hum'] = {'hz': num(f0, 1), 'window': [num(a, 2), num(b, 2)], 'dbfs': num(lev, 2)}
        else:
            checks['hum'] = check('pass', None, H['fail'], 'the score plan has no audible tension hum')
    elif plan is not None:
        checks['hum'] = check('pass', None, H['fail'], 'the score plan has no tension hum layer')
    else:
        checks['hum'] = not_run('no score plan (score-plan.json, or a buildPlanV2 replay for soundtrack-v2)')
    T = L['tonal']
    synth = (plan or {}).get('synth') if isinstance(plan, dict) else None
    if synth is not None:
        tonal = sorted([e for e in synth if e.get('inst') in TONAL and e.get('f')], key=lambda e: e['t'])[-T['last']:]
        cents = [1200 * np.log2(b['f'] / a['f']) for a, b in zip(tonal, tonal[1:])]
        falls = [c for c in cents if c < -T['toleranceCents']]
        checks['tonal'] = check('pass' if len(tonal) >= 2 and not falls else ('fail' if falls else 'not-run'), [num(e['f'], 2) for e in tonal], None,
                                f'last {len(tonal)} tonal events ' + ', '.join(f"{e['inst']} {num(e['f'], 1)} Hz @ {num(e['t'], 2)} s" for e in tonal)
                                + ('' if not falls else f': a fall of {num(min(falls), 0)} cents'))
    else:
        checks['tonal'] = not_run('no score plan events')
    if job.get('artefacts'):
        os.makedirs(job['artefacts'], exist_ok=True)
        p = os.path.join(job['artefacts'], 'waveform.png')
        waveform_png(x, cues, p, dur)
        art.append({'file': p, 'label': 'waveform with cue markers'})
    return {'checks': checks, 'metrics': metrics, 'signature': signature(x), 'artefacts': art}


if __name__ == '__main__':
    with open(sys.argv[1]) as fh:
        job = json.load(fh)
    out = run(job)
    with open(sys.argv[2], 'w') as fh:
        json.dump(out, fh)
    print(json.dumps({k: v['status'] for k, v in out['checks'].items()}))
