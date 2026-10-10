"""Gate B evidence for the three Reflect pilots.

  python3 evidence.py run <pilot> <base> <out>     # solo phone + solo desktop + two-browser run for one pilot
  python3 evidence.py pack <out>                   # screenshots (4 moments × 2 sizes), videos, timing report

pilot: gtg | ddb | er.  Requires the dev server (dist/dev-server.js) on <base>.
"""
import json, os, shutil, subprocess, sys, statistics
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

PILOTS = {
    'gtg': {'mod': 'e2e_gtg', 'title': 'Group Think Glitch',
            'moments': [('start', '2-investigate-start'), ('mid', '5-board'), ('consequence', '7-reveal-verdicts'), ('finale', '15-finale-polaroids')],
            'extras': ['1-hook', '3-evidence-found', '4-pinned', '8-reveal-shards', '9-reveal-ceiling', '10-reveal-board', '13-finale-pose', '16-finale-card']},
    'ddb': {'mod': 'e2e_ddb', 'title': 'Drama Dubbing Booth',
            'moments': [('start', '2-studio'), ('mid', '4-drag-line'), ('consequence', '5-preview'), ('finale', '13-red-carpet')],
            'extras': ['1-hook', '3-perform', '7-title-card', '8-premiere-film', '10-same-frame', '11-board', '12-directors-cut', '14-poster']},
    'er': {'mod': 'e2e_er', 'title': 'Emotional Rollercoaster',
           'moments': [('start', '2-build'), ('mid', '3-shaping'), ('consequence', '8-ride-loop'), ('finale', '11-one-loop')],
           'extras': ['1-hook', '4-test-ride', '5-ride-lift', '6-ride-drop', '7-switch-lever', '9-ride-cork', '10-station', '12-photo']},
}


def run(pilot, base, out):
    mod = __import__(PILOTS[pilot]['mod'])
    root = os.path.join(out, pilot)
    for form in ('phone', 'desktop'):
        d = os.path.join(root, 'solo-' + form)
        shutil.rmtree(d, ignore_errors=True)
        mod.solo(base, d, form)
    d = os.path.join(root, 'multi')
    shutil.rmtree(d, ignore_errors=True)
    mod.multi(base, d)


def pct(xs, q):
    if not xs: return None
    xs = sorted(xs); k = min(len(xs) - 1, max(0, int(round(q * (len(xs) - 1)))))
    return round(xs[k], 1)


def ffmpeg(*args):
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *args], check=True)


def pack(out):
    ev = os.path.join(out, 'evidence')
    shutil.rmtree(ev, ignore_errors=True); os.makedirs(ev)
    timing = {}
    for pid, cfg in PILOTS.items():
        root = os.path.join(out, pid)
        if not os.path.isdir(root): continue
        dst = os.path.join(ev, pid); os.makedirs(dst)
        for form in ('phone', 'desktop'):
            src = os.path.join(root, 'solo-' + form)
            for i, (label, name) in enumerate(cfg['moments']):
                f = os.path.join(src, f'{form}-{name}.png')
                if os.path.exists(f): shutil.copy(f, os.path.join(dst, f'{form}-{i + 1}-{label}.png'))
            for name in cfg['extras']:
                f = os.path.join(src, f'{form}-{name}.png')
                if os.path.exists(f): shutil.copy(f, os.path.join(dst, f'{form}-x-{name}.png'))
            vid = os.path.join(src, f'{form}-solo.webm')
            if os.path.exists(vid):
                ffmpeg('-i', vid, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '27', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', os.path.join(dst, f'{form}-solo.mp4'))
            m = json.load(open(os.path.join(src, f'{form}-metrics.json')))
            evt = [e['dur'] for e in m.get('evt', [])]
            frames = m.get('frames', [])
            # a sound more than 250 ms after the last gesture was triggered by an animation, not by the gesture
            m['sound'] = [x for x in m.get('sound', []) if x < 250]
            timing[f'{pid}-{form}'] = {
                'input_to_next_frame_ms': {'n': len(m.get('input', [])), 'p50': pct(m.get('input', []), 0.5), 'p95': pct(m.get('input', []), 0.95), 'max': max(m.get('input', []) or [0])},
                'event_timing_over_16ms': {'n': len(evt), 'p50': pct(evt, 0.5), 'max': max(evt or [0])},
                'frame_ms': {'n': len(frames), 'p50': pct(frames, 0.5), 'p95': pct(frames, 0.95)},
                'sound_gesture_to_start_ms': {'n': len(m.get('sound', [])), 'p50': pct(m.get('sound', []), 0.5), 'p95': pct(m.get('sound', []), 0.95), 'max': max(m.get('sound', []) or [0])},
                'errors': [e for e in m.get('errors', []) if 'ERR_TUNNEL' not in e][:5],
            }
        mdir = os.path.join(root, 'multi')
        if os.path.isdir(mdir):
            shutil.copy(os.path.join(mdir, 'multi-log.json'), os.path.join(dst, 'multiplayer-log.json'))
            hp, gd = os.path.join(mdir, 'multi-host-phone.webm'), os.path.join(mdir, 'multi-guest-desktop.webm')
            if os.path.exists(hp) and os.path.exists(gd):
                font = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
                lab = lambda t: f"drawtext=fontfile={font}:text='{t}':x=12:y=12:fontsize=26:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=8"
                ffmpeg('-i', hp, '-i', gd, '-filter_complex',
                       f"[0:v]scale=-2:720,{lab('Browser 1 - host - phone')}[a];[1:v]scale=-2:720,{lab('Browser 2 - guest - desktop')}[b];[a][b]hstack=inputs=2,pad=ceil(iw/2)*2:ceil(ih/2)*2[v]",
                       '-map', '[v]', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-shortest', os.path.join(dst, 'multiplayer-two-browsers.mp4'))
    json.dump(timing, open(os.path.join(ev, 'timing.json'), 'w'), indent=1)
    print(json.dumps(timing, indent=1))


if __name__ == '__main__':
    if sys.argv[1] == 'run': run(sys.argv[2], sys.argv[3].rstrip('/'), sys.argv[4])
    else: pack(sys.argv[2])
