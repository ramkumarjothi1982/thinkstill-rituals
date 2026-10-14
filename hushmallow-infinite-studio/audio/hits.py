"""Where each graded cue's hit lands, heard as the QA gate hears it (WP-04 hit sync).

    python3 -I audio/hits.py <in.json> <out.json>

in.json:  {"wav": path, "duration": s, "cues": [{t, type, ...}]}
out.json: [{i, t, type, kind, toleranceMs, errorMs, riseDb, graded, pass, peakT, lateDb}]

The detector is qa/gates/audio.py's own (decode, the 600 Hz high-pass, the 2 ms
envelope, onset(), the LOUD/QUIET cue classes, the search window and tolerances
from thresholds.json), imported, not re-implemented; the grading loop below is
the gate's, line for line (tests/unit/audio-score.test.mjs holds the two equal).
What it adds is what the score needs to correct a late hit (audio/hits.mjs): the
time of the peak the gate timed, and how much louder that peak is than the
cue's own first transient (lateDb: the envelope's maximum over [t - 5 ms,
t + 30 ms] against the peak).
"""
import importlib.util
import json
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
GATE = os.path.join(HERE, '..', 'qa', 'gates', 'audio.py')


def load_gate():
    sys.dont_write_bytecode = True          # read the gate; never write into qa/ (no __pycache__)
    spec = importlib.util.spec_from_file_location('qa_gate_audio', GATE)
    gate = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(gate)
    return gate


def hits(job):
    ga = load_gate()
    S = ga.limits(ga.GATE)['sync']
    SR = ga.SR
    dur = float(job['duration'])
    x = ga.decode(job['wav'], dur)
    mono = x.mean(axis=1)
    env = ga.envelope(ga.fft_band(mono, 600, SR / 2))
    cues = job['cues']
    times = sorted(c['t'] for c in cues if c['type'] in ga.LOUD | ga.QUIET)
    out = []
    for i, c in enumerate(cues):
        kind = 'loud' if c['type'] in ga.LOUD else 'quiet' if c['type'] in ga.QUIET else None
        if not kind:
            continue
        nxt = next((tt for tt in times if tt > c['t'] + 1e-6), dur)
        lo_s, hi_s = S['searchMs'][0] / 1000, min(S['searchMs'][1] / 1000, nxt - c['t'] - 0.012)
        o = ga.onset(env, c['t'], lo_s, hi_s)
        if not o:
            continue
        tol = S['loudMs'] if kind == 'loud' else S['quietMs']
        graded = bool(o['riseDb'] >= S['minRiseDb'])
        lo, hi = max(0, int((c['t'] + lo_s) * SR)), min(len(env) - 1, int((c['t'] + hi_s) * SR))
        ip = lo + int(np.argmax(env[lo:hi]))
        a, b = max(0, int((c['t'] - 0.005) * SR)), min(len(env), int((c['t'] + 0.030) * SR))
        first = float(env[a:b].max()) if b > a else 0.0
        out.append({'i': i, 't': c['t'], 'type': c['type'], 'kind': kind, 'toleranceMs': tol,
                    'errorMs': round(float(o['errorMs']), 2), 'riseDb': round(float(o['riseDb']), 2), 'graded': graded,
                    'pass': (not graded) or abs(o['errorMs']) <= tol + 1e-6,
                    'peakT': round(ip / SR, 5), 'lateDb': round(20 * float(np.log10(max(env[ip], 1e-12) / max(first, 1e-12))), 2)})
    return out


if __name__ == '__main__':
    with open(sys.argv[1]) as fh:
        job = json.load(fh)
    with open(sys.argv[2], 'w') as fh:
        json.dump(hits(job), fh)
