"""Automated QA for every game in the Reset / Reframe consoles.

For each game it launches the console straight into the game (?game=<id>), lets the game's own autoplay() play it to the
end through its real input handlers, and checks: it finishes, no console/page errors, text >= 12px (player words >= 15px),
nothing spills outside the frame, frame times while playing, and the sound-sync log. Screenshots: start, mid, finale, after.

Usage:
  python3 games/tests/qa.py --mode reset                       # all reset games, phone dark
  python3 games/tests/qa.py --mode reframe --games case-file   # one game
  python3 games/tests/qa.py --mode reset --configs 390x844:dark,1280x860:bright --jobs 4
Outputs games/tests/out/qa-<mode>/<id>/... and games/tests/out/qa-<mode>/summary.json
"""
import argparse, json, os, re, socket, subprocess, sys, time

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

FRAMES = r"""
() => {
  if (window.__qaFrames) return;
  window.__qaFrames = []; let last = performance.now();
  const f = (now) => { window.__qaFrames.push(now - last); last = now; if (window.__qaFrames.length < 20000) requestAnimationFrame(f); };
  requestAnimationFrame(f);
}
"""
TEXT_SCAN = r"""
(mode) => {
  const root = document.getElementById('app');
  const rr = root.getBoundingClientRect();
  const small = [], userSmall = [], outside = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    const t = n.textContent.trim(); if (!t) continue;
    const el = n.parentElement; if (!el) continue;
    if (el.closest('.tsg-sr, [hidden], style, script, .tsg-guide[hidden]')) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) === 0) continue;
    let hiddenAnc = false, a = el; for (let i = 0; i < 8 && a; i++) { const s = getComputedStyle(a); if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) < 0.05) { hiddenAnc = true; break; } a = a.parentElement; }
    if (hiddenAnc) continue;
    const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
    const fs = parseFloat(cs.fontSize);
    if (fs < 11.95) small.push({ text: t.slice(0, 40), px: fs, cls: el.className && el.className.baseVal === undefined ? String(el.className).slice(0, 60) : '' });
    if (el.closest('.gk-user, .r-banner, [data-user-words]') && fs < 14.95) userSmall.push({ text: t.slice(0, 40), px: fs });
    if (r.right > rr.right + 2 || r.left < rr.left - 2) outside.push({ text: t.slice(0, 40), left: Math.round(r.left - rr.left), right: Math.round(r.right - rr.left) });
  }
  return { small: small.slice(0, 12), smallCount: small.length, userSmall: userSmall.slice(0, 8), outside: outside.slice(0, 8), docOverflowX: document.documentElement.scrollWidth > innerWidth + 1 };
}
"""


def free_port():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); p = s.getsockname()[1]; s.close(); return p


def stats(frames):
    fr = sorted(x for x in frames[5:] if x > 0)
    if not fr:
        return {}
    pct = lambda q: round(fr[min(len(fr) - 1, int(len(fr) * q))], 1)
    return {'frames': len(fr), 'p50': pct(0.5), 'p95': pct(0.95), 'max': round(fr[-1], 1), 'over33': sum(1 for x in fr if x > 33.4), 'over50': sum(1 for x in fr if x > 50), 'fps': round(1000 / (sum(fr) / len(fr)), 1)}


def run_game(pw, port, mode, gid, w, h, theme, out, autoplay, timeout, video):
    tag = f'{w}x{h}-{theme}'
    gdir = os.path.join(out, gid); os.makedirs(gdir, exist_ok=True)
    rep = {'id': gid, 'config': tag, 'errors': [], 'warnings': []}
    browser = pw.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    phone = w < 700
    ctx_args = dict(viewport={'width': w, 'height': h}, device_scale_factor=2 if phone else 1, has_touch=phone, is_mobile=phone)
    if video:
        ctx_args['record_video_dir'] = gdir; ctx_args['record_video_size'] = {'width': w, 'height': h}
    ctx = browser.new_context(**ctx_args)
    page = ctx.new_page()
    page.on('console', lambda m: (None if 'net::ERR_' in m.text else rep['errors'].append(m.text[:300])) if m.type == 'error' else (rep['warnings'].append(m.text[:200]) if m.type == 'warning' else None))
    page.route(re.compile(r'https://(fonts\.googleapis\.com|fonts\.gstatic\.com|raw\.githubusercontent\.com)/.*'), lambda route: route.abort())
    page.on('pageerror', lambda e: rep['errors'].append('pageerror: ' + str(e)[:300]))
    # a page with only this game, so a half-written file from another builder can never break this run
    sys.path.insert(0, os.path.join(ROOT, 'games', 'tools'))
    import devpages
    gfile = next((f for f in devpages.game_files(mode) if re.search(r"\bid:\s*'" + re.escape(gid) + "'", open(os.path.join(ROOT, 'games', 'games-' + mode, f), encoding='utf-8').read())), None)
    qdir = os.path.join(ROOT, 'games', 'dev', '_qa'); os.makedirs(qdir, exist_ok=True)
    with open(os.path.join(qdir, f'{mode}-{gid}.html'), 'w', encoding='utf-8') as fh: fh.write(devpages.page(mode, [gfile] if gfile else [], '../../'))
    url = f'http://127.0.0.1:{port}/games/dev/_qa/{mode}-{gid}.html?game={gid}&tsgdev=1&theme={theme}'
    t0 = time.time()
    try:
        page.goto(url, wait_until='load', timeout=30000)
        page.wait_for_function(f"window.__arcade && window.__arcade['{mode}'] && window.__arcade['{mode}'].current() && window.__arcade['{mode}'].current().api", timeout=20000)
        page.wait_for_timeout(1400)
        page.screenshot(path=os.path.join(gdir, f'{tag}-1-start.png'))
        rep['textStart'] = page.evaluate(TEXT_SCAN, mode)
        if not autoplay:
            rep['finished'] = None
            return rep
        page.evaluate(FRAMES)
        page.evaluate(f"() => {{ window.__qaDone = null; window.__arcade['{mode}'].autoplay().then(r => window.__qaDone = r || 'ok', e => window.__qaDone = 'error: ' + (e && e.stack || e)); }}")
        shots, start = [], time.time()
        done = False
        while time.time() - start < timeout:
            page.wait_for_timeout(2500)
            cur = page.evaluate(f"() => {{ const c = window.__arcade['{mode}'].current(); return {{ done: !!(c && c.done), auto: window.__qaDone }}; }}")
            if cur['auto'] and str(cur['auto']).startswith('error'):
                rep['errors'].append('autoplay ' + str(cur['auto'])[:400]); break
            if cur['done']:
                done = True; break
            p = os.path.join(gdir, f'{tag}-tmp-{len(shots)}.png'); page.screenshot(path=p); shots.append(p)
            if len(shots) == 2:
                rep['textMid'] = page.evaluate(TEXT_SCAN, mode)
        rep['finished'] = done
        rep['autoplay'] = page.evaluate('() => window.__qaDone')
        rep['seconds'] = round(time.time() - start, 1)
        if shots:
            mid = shots[len(shots) // 2]; fin = shots[-1]
            os.replace(mid, os.path.join(gdir, f'{tag}-2-mid.png'))
            if fin != mid and os.path.exists(fin):
                os.replace(fin, os.path.join(gdir, f'{tag}-3-finale.png'))
            for p in shots:
                if os.path.exists(p): os.remove(p)
        if done:
            page.wait_for_timeout(1200)
            page.screenshot(path=os.path.join(gdir, f'{tag}-4-after.png'))
            rep['textAfter'] = page.evaluate(TEXT_SCAN, mode)
        frames = page.evaluate('() => window.__qaFrames || []')
        rep['frameStats'] = stats(frames)
        rep['sync'] = page.evaluate(f"() => window.__arcade['{mode}'].syncLog().slice(-60)")
    except Exception as e:  # noqa
        rep['errors'].append('harness: ' + str(e)[:400])
        try: page.screenshot(path=os.path.join(gdir, f'{tag}-x-error.png'))
        except Exception: pass
    finally:
        rep['wall'] = round(time.time() - t0, 1)
        ctx.close(); browser.close()
    return rep


def verdict(r):
    issues = []
    if r.get('finished') is False: issues.append('did not finish')
    if r['errors']: issues.append(f"{len(r['errors'])} errors")
    for k in ('textStart', 'textMid', 'textAfter'):
        t = r.get(k) or {}
        if t.get('smallCount'): issues.append(f"{k}: {t['smallCount']} texts < 12px")
        if t.get('userSmall'): issues.append(f"{k}: player words < 15px")
        if t.get('outside'): issues.append(f"{k}: text outside frame")
        if t.get('docOverflowX'): issues.append(f"{k}: page scrolls sideways")
    fs = r.get('frameStats') or {}
    if fs.get('p95', 0) > 34: issues.append(f"p95 frame {fs['p95']}ms")
    return issues


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--mode', default='reset')
    ap.add_argument('--games', default='')
    ap.add_argument('--configs', default='390x844:dark')
    ap.add_argument('--jobs', type=int, default=1)
    ap.add_argument('--timeout', type=int, default=150)
    ap.add_argument('--video', action='store_true')
    ap.add_argument('--port', type=int, default=0)
    ap.add_argument('--out', default='')
    ap.add_argument('--worker', action='store_true')
    a = ap.parse_args()
    out = a.out or os.path.join(ROOT, 'games', 'tests', 'out', 'qa-' + a.mode)
    os.makedirs(out, exist_ok=True)
    gdir = os.path.join(ROOT, 'games', 'games-' + a.mode)
    all_ids = []
    for f in sorted(os.listdir(gdir)):
        if f.endswith('.js'):
            src = open(os.path.join(gdir, f), encoding='utf-8').read()
            import re
            m = re.search(r"\bid:\s*'([a-z0-9-]+)'", src)
            if m: all_ids.append(m.group(1))
    ids = [g for g in a.games.split(',') if g] or all_ids
    server = None
    port = a.port
    if not port:
        subprocess.run([sys.executable, os.path.join(ROOT, 'games', 'tools', 'devpages.py')], check=True, stdout=subprocess.DEVNULL)
        port = free_port()
        server = subprocess.Popen([sys.executable, '-m', 'http.server', str(port), '--bind', '127.0.0.1'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        time.sleep(0.8)
    try:
        if a.jobs > 1 and not a.worker and len(ids) > 1:
            chunks = [ids[i::a.jobs] for i in range(a.jobs)]
            procs = [subprocess.Popen([sys.executable, __file__, '--mode', a.mode, '--games', ','.join(c), '--configs', a.configs, '--timeout', str(a.timeout), '--port', str(port), '--out', out, '--worker'] + (['--video'] if a.video else [])) for c in chunks if c]
            for p in procs: p.wait()
        else:
            from playwright.sync_api import sync_playwright
            with sync_playwright() as pw:
                for gid in ids:
                    for i, cfg in enumerate(a.configs.split(',')):
                        size, theme = cfg.split(':')
                        w, h = map(int, size.split('x'))
                        r = run_game(pw, port, a.mode, gid, w, h, theme, out, True, a.timeout, a.video and i == 0)
                        r['issues'] = verdict(r)
                        with open(os.path.join(out, gid, f'report-{w}x{h}-{theme}.json'), 'w') as f: json.dump(r, f, indent=1)
                        print(('PASS ' if not r['issues'] else 'FAIL ') + gid + ' ' + cfg + ' ' + str(r.get('seconds')) + 's ' + '; '.join(r['issues']), flush=True)
    finally:
        if server: server.terminate()
    if not a.worker:
        summary = []
        for gid in ids:
            d = os.path.join(out, gid)
            if not os.path.isdir(d): continue
            for f in sorted(os.listdir(d)):
                if f.startswith('report-'):
                    r = json.load(open(os.path.join(d, f)))
                    summary.append({'id': gid, 'config': r['config'], 'finished': r.get('finished'), 'issues': r.get('issues', []), 'seconds': r.get('seconds'), 'frame': r.get('frameStats'), 'errors': r['errors'][:3]})
        with open(os.path.join(out, 'summary.json'), 'w') as f: json.dump(summary, f, indent=1)
        bad = [s for s in summary if s['issues']]
        print(f"\n{len(summary) - len(bad)}/{len(summary)} runs clean")


if __name__ == '__main__':
    main()
