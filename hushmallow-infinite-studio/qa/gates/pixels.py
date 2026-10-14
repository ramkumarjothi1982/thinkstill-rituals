"""The pixel gates: one decode of the video, every frame to every gate.

    python3 -I qa/gates/pixels.py <job.json> <out.json>

job.json is written by qa/run-qa.mjs: the video, its scale, the stage
(final or draft), the gates to run, the geometry file from
qa/gates/geometry.mjs, the pristine art, the brand probes, the realm
reference and the artefact directory. out.json gets, per gate, its checks,
metrics and artefacts, plus the decoder's frame count and errors (G-FINAL
delivery reads those instead of decoding the video a second time) and the
time each gate took.
"""
import json
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)        # -I does not put the script's directory on the path

from qalib.frames import VideoReader  # noqa: E402
from flash import FlashGate  # noqa: E402
from seam import SeamGate  # noqa: E402
from safezone import SafezoneGate  # noqa: E402
from readability import ReadabilityGate  # noqa: E402
from fidelity import FidelityGate  # noqa: E402
from figure_ground import FigureGroundGate  # noqa: E402
from realm_likeness import RealmLikenessGate  # noqa: E402
from logo import LogoGate  # noqa: E402
from marks import MarksGate  # noqa: E402
from signature import SignatureGate  # noqa: E402
from review import ReviewArtefacts  # noqa: E402

GATES = {g.id: g for g in (FlashGate, SeamGate, SafezoneGate, ReadabilityGate, FidelityGate, FigureGroundGate,
                           RealmLikenessGate, LogoGate, MarksGate, SignatureGate, ReviewArtefacts)}


def run(job):
    if job.get('geometryFile'):
        with open(job['geometryFile']) as fh:
            job['geometry'] = json.load(fh)
    reader = VideoReader(job['video'], threads=job.get('threads', 2))
    job['width'], job['height'] = reader.width, reader.height
    job['scale'] = reader.width / job.get('designWidth', 1080)
    if job.get('artefacts'):
        os.makedirs(job['artefacts'], exist_ok=True)
    active = []
    for gid in job['gates']:
        if gid not in GATES:
            raise SystemExit(f'pixels.py: unknown gate {gid}')
        active.append(GATES[gid](job))
    spent = {g.id: 0.0 for g in active}
    t0 = time.perf_counter()
    for i, f in reader:
        for g in active:
            if g.wants(i):
                a = time.perf_counter()
                g.frame(i, f)
                spent[g.id] += time.perf_counter() - a
    decode_s = time.perf_counter() - t0 - sum(spent.values())
    results = {}
    for g in active:
        a = time.perf_counter()
        results[g.id] = g.result()
        spent[g.id] += time.perf_counter() - a
    return {
        'schema': 'hm-qa-pixels/1',
        'video': {'width': reader.width, 'height': reader.height, 'scale': job['scale']},
        'decode': {'frames': reader.frames, 'errors': reader.errors[:50], 'errorCount': len(reader.errors), 'seconds': round(decode_s, 2)},
        'gates': results,
        'timings': {k: round(v, 2) for k, v in spent.items()},
        'seconds': round(time.perf_counter() - t0, 2),
    }


if __name__ == '__main__':
    with open(sys.argv[1]) as fh:
        job = json.load(fh)
    out = run(job)
    with open(sys.argv[2], 'w') as fh:
        json.dump(out, fh)
    print(json.dumps({'seconds': out['seconds'], 'frames': out['decode']['frames'], 'timings': out['timings']}))
