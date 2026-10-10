"""Group Think Glitch sightline test.

Renders every camera rig at 181 moments (0–9 s, every 50 ms) with and without the cat and counts the pixels that change
(tests/occlusion.ts, served by the dev server as /occlusion.html). The mystery depends on who could see what:

  door     must never see the cat                      (0 frames over 30 px)
  phone    must never see the cat                      (0 frames over 30 px)
  balcony  must see the cat on the stool               (≥ 10 frames)
  booth    must see the cat on the stool               (≥ 10 frames)

  python3 occlusion.py <base-url> [out.json]
Exit code 0 when every rule holds.
"""
import json, sys
from playwright.sync_api import sync_playwright

RULES = {'door': (0, 0, None), 'phone': (0, 0, None), 'balcony': (None, None, 10), 'booth': (None, None, 10)}


def ranges(rows):
    vis = [(t, n) for t, n in rows if n > 30]
    out = []
    for t, n in vis:
        if out and abs(t - out[-1][1] - 0.05) < 1e-6: out[-1][1] = t; out[-1][2] = max(out[-1][2], n)
        else: out.append([t, t, n])
    return vis, out


def main(base, dst=None):
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={'width': 400, 'height': 500})
        pg.goto(base.rstrip('/') + '/occlusion.html')
        pg.wait_for_function("document.body.dataset.done == '1'", timeout=240000)
        err = pg.evaluate("document.body.dataset.error || ''")
        if err: print('error:', err); sys.exit(2)
        res = pg.evaluate('window.__result')
        b.close()
    report, ok = {}, True
    for rig, rows in res.items():
        vis, rng = ranges(rows)
        peak = max([n for _, n in vis] or [0])
        max_frames, max_px, min_frames = RULES[rig]
        good = (max_frames is None or len(vis) <= max_frames) and (max_px is None or peak <= max_px) and (min_frames is None or len(vis) >= min_frames)
        ok &= good
        report[rig] = {'frames_visible': len(vis), 'of': len(rows), 'peak_px': peak, 'ranges': [f'{a:.2f}-{z:.2f}s (max {m}px)' for a, z, m in rng], 'pass': good}
        print(('PASS ' if good else 'FAIL ') + rig, json.dumps(report[rig]))
    if dst: json.dump(report, open(dst, 'w'), indent=1)
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
