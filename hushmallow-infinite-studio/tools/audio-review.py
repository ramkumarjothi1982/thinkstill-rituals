"""Objective audio review of a score: what can be measured without ears.

    python3 -I tools/audio-review.py <score dir> <cues.json> [--plan-chords v2]

<score dir> holds score.wav and stems/{music,rhythm,sfx,bed}.wav (audio/score-feel-v2.mjs).
Prints and writes <score dir>/audio-review.json:
  sections     loudness (RMS dBFS) of the mix and of each stem per story section: the dynamic arc
  balance      the mix's energy per band per section (mud: 200–500 Hz; harshness: 2–5 kHz)
  stereo       L/R correlation and how much level a mono phone speaker loses (L+R)/2
  harmony      per half bar, how much of the music stem's pitched energy lies on the chord's
               pitch classes (the rest is passing tones, or clashes)
  sync         for every on-screen cue that should sound, the offset to the nearest onset in the mix
These are proxies. They catch mud, clashes, collapse in mono, dead spots and late hits; they do
not tell whether it is beautiful — that needs a listening review.
"""
import json, os, sys, wave
import numpy as np

d = sys.argv[1]
cues = json.load(open(sys.argv[2]))
SR = 48000
BEAT = 0.625


def read(p):
    w = wave.open(p)
    n, ch, sw = w.getnframes(), w.getnchannels(), w.getsampwidth()
    raw = np.frombuffer(w.readframes(n), np.uint8)
    if sw == 3:
        a = raw.reshape(-1, 3).astype(np.int32)
        x = a[:, 0] | (a[:, 1] << 8) | (a[:, 2] << 16)
        x = np.where(x >= 1 << 23, x - (1 << 24), x) / float(1 << 23)
    else:
        x = np.frombuffer(raw.tobytes(), np.int16) / 32768.0
    return x.reshape(-1, ch).astype(np.float64)


mix = read(os.path.join(d, 'score.wav'))
stems = {k: read(os.path.join(d, 'stems', f'{k}.wav')) for k in ['music', 'rhythm', 'sfx', 'bed'] if os.path.exists(os.path.join(d, 'stems', f'{k}.wav'))}
DUR = len(mix) / SR
SECTIONS = [('hook', 0, 2.5), ('split+feelings', 2.5, 7.5), ('magic', 7.5, 12.5), ('dawn+talk', 12.5, 13.75), ('breath', 13.75, 15.0), ('meet', 15.0, 16.875), ('brand', 16.875, 19.15), ('return', 19.15, 20.0)]
db = lambda x: float(20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12))
seg = lambda x, a, b: x[int(a * SR):int(b * SR)]

out = {'sections': {}, 'balance': {}, 'stereo': {}, 'harmony': {}, 'sync': {}}
for name, a, b in SECTIONS:
    row = {'mix': round(db(seg(mix, a, b)), 1)}
    for k, x in stems.items():
        row[k] = round(db(seg(x, a, b)), 1)
    out['sections'][name] = row

BANDS = [(20, 80), (80, 200), (200, 500), (500, 2000), (2000, 5000), (5000, 12000), (12000, 24000)]
for name, a, b in SECTIONS:
    x = seg(mix, a, b).mean(1)
    X = np.abs(np.fft.rfft(x * np.hanning(len(x)))) ** 2
    f = np.fft.rfftfreq(len(x), 1 / SR)
    tot = X.sum()
    out['balance'][name] = {f'{lo}-{hi}': round(float(10 * np.log10(X[(f >= lo) & (f < hi)].sum() / tot + 1e-12)), 1) for lo, hi in BANDS}

L, R = mix[:, 0], mix[:, 1]
out['stereo'] = {
    'correlation': round(float(np.corrcoef(L, R)[0, 1]), 3),
    'monoLossDb': round(db((L + R) / 2) - db(mix), 2),
    'width_side_to_mid_db': round(db((L - R) / 2) - db((L + R) / 2), 1),
}

# harmony: pitch-class energy of the music stem per half bar vs the chord's pitch classes
CHORDS = {'Am9': [9, 0, 4, 7, 11], 'Fmaj9': [5, 9, 0, 4, 7], 'Cadd9': [0, 4, 7, 2], 'G/B': [7, 11, 2, 9], 'Em7': [4, 7, 11, 2, 6], 'Fmaj7s11': [5, 9, 0, 4, 11],
          'G6sus': [7, 0, 2, 4], 'G': [7, 11, 2, 9], 'Cmaj9': [0, 4, 7, 11, 2], 'G6': [7, 11, 2, 4], 'C': [0, 4, 7]}
HALF = ['Am9', 'Fmaj9', 'Cadd9', 'G/B', 'Am9', 'Em7', 'Fmaj7s11', 'Fmaj7s11', 'G6sus', 'G', 'Cmaj9', 'Cmaj9', 'Am9', 'G6', 'C', 'Am9']
SCALE = {0, 2, 4, 5, 7, 9, 11}
if 'music' in stems:
    mus = stems['music'].mean(1)
    fits, outs = [], []
    for h, name in enumerate(HALF):
        x = seg(mus, h * 1.25 + 0.05, h * 1.25 + 1.25)
        X = np.abs(np.fft.rfft(x * np.hanning(len(x)))) ** 2
        f = np.fft.rfftfreq(len(x), 1 / SR)
        m = (f > 100) & (f < 4200)
        midi = 69 + 12 * np.log2(f[m] / 440.0)
        pc = np.mod(np.round(midi), 12).astype(int)
        e = np.bincount(pc, weights=X[m], minlength=12)
        e = e / e.sum()
        fit = float(sum(e[p] for p in set(CHORDS[name])))
        out_of_key = float(sum(e[p] for p in range(12) if p not in SCALE and p not in CHORDS[name]))
        fits.append(fit); outs.append(out_of_key)
        out['harmony'][f'{h:02d} {name}'] = {'onChord': round(fit, 2), 'outOfKey': round(out_of_key, 3)}
    out['harmony']['summary'] = {'meanOnChord': round(float(np.mean(fits)), 2), 'worstOnChord': round(float(np.min(fits)), 2), 'maxOutOfKey': round(float(np.max(outs)), 3)}

# sync: onsets of the mix (spectral flux on 5 ms hops) vs the cues that should sound
x = mix.mean(1)
hop, win = 240, 1024
frames = np.lib.stride_tricks.sliding_window_view(np.concatenate([x, x[:win]]), win)[::hop] * np.hanning(win)
S = np.abs(np.fft.rfft(frames, axis=1))
flux = np.maximum(0, np.diff(np.log1p(S * 20), axis=0)).sum(1)
flux = (flux - np.median(flux)) / (np.std(flux) + 1e-9)
peaks = [i for i in range(1, len(flux) - 1) if flux[i] > 1.2 and flux[i] >= flux[i - 1] and flux[i] >= flux[i + 1]]
onsets = np.array([(i + 1) * hop / SR for i in peaks])
SOUNDING = ['split', 'reveal', 'emerge', 'land', 'group_land', 'logo', 'wave', 'wink', 'orb_pulse']
offs = []
for c in cues['cues']:
    if c['type'] not in SOUNDING:
        continue
    d_ = onsets - c['t']
    near = d_[np.abs(d_) < 0.08]
    o = float(near[np.argmin(np.abs(near))]) if len(near) else None
    offs.append(o)
    out['sync'].setdefault(c['type'], []).append(None if o is None else round(o * 1000, 1))
found = [o for o in offs if o is not None]
out['sync']['summary'] = {'cues': len(offs), 'withOnsetWithin80ms': len(found), 'medianAbsMs': round(float(np.median(np.abs(found)) * 1000), 1) if found else None,
                          'p90AbsMs': round(float(np.percentile(np.abs(found), 90) * 1000), 1) if found else None}
json.dump(out, open(os.path.join(d, 'audio-review.json'), 'w'), indent=1)
print(json.dumps({k: v for k, v in out.items() if k != 'harmony'} | {'harmony': out['harmony'].get('summary')}, indent=1))
