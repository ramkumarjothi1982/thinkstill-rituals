"""Automated playthrough of Loop Rodeo.

Serves the repo locally, plays the whole game with an in-page bot that drums on the beat
(with human-like jitter), captures screenshots per scene, a video, console errors and
frame-rate measurements.

Usage: python3 games/tests/play_rodeo.py [--url URL] [--out DIR] [--size 390x844] [--theme dark|bright]
"""
import argparse, json, os, subprocess, sys, time, socket
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

def free_port():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); p = s.getsockname()[1]; s.close(); return p

BOT = r"""
window.__bot = { on: true, taps: 0, jitter: 0.035 };
(function botLoop(){
  const r = window.__rodeo; if (!r) return requestAnimationFrame(botLoop);
  const g = r.game;
  if (window.__bot.on && g.phase === 'herd' && r.clock.running) {
    const bw = r.beatWindow();
    const target = bw.next.t + (window.__bot.offset ?? 0);
    const dt = target - r.vnow();
    if (dt < 0.012 && window.__bot.lastBeat !== bw.next.i) {
      window.__bot.lastBeat = bw.next.i;
      const j = (Math.random() * 2 - 1) * window.__bot.jitter;
      setTimeout(() => {
        const d = document.getElementById('drum');
        d.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'touch' }));
        setTimeout(() => window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })), 60);
        window.__bot.taps++;
      }, Math.max(0, (dt + j) * 1000));
    }
  }
  requestAnimationFrame(botLoop);
})();
"""

MOCK_AI = r"""
window.ThinkStillHost = { reason: (prompt) => new Promise(res => setTimeout(() => res(JSON.stringify({
  safety: 'ok',
  critters: [
    { label: 'WHAT I SAID IN THE MEETING', loop: 'replay' },
    { label: 'THE UNFINISHED REPORT', loop: 'todo' },
    { label: 'SHOULD HAVE STAYED QUIET', loop: 'shouldhave' },
    { label: 'WHAT IF IT HAPPENS AGAIN', loop: 'whatif' },
    { label: 'DID EVERYONE NOTICE', loop: 'mindread' }
  ],
  core: { label: "BOSS THINKS I'M USELESS", loop: 'mindread' },
  lines: { intro: 'Five loopers and one big worry. Let\'s bring them in, nice and steady.', catch: ['One home. Lovely.', 'Gentle rope, steady hands.', 'That one\'s already yawning.'], core: 'This big one stays out here with us. It doesn\'t need a pen tonight, just a warm spot by the fire.', close: 'Same thoughts, slower hooves. That\'s a good night\'s work.' }
})), 1200)) };
"""

FPS = r"""
(ms) => new Promise(res => {
  const times = []; let start = performance.now(), last = start;
  function f(now){ times.push(now - last); last = now; if (now - start < ms) requestAnimationFrame(f); else {
    times.shift(); const sorted = times.slice().sort((a,b)=>a-b);
    const avg = times.reduce((a,b)=>a+b,0)/times.length;
    res({ frames: times.length, avgMs: +avg.toFixed(2), fps: +(1000/avg).toFixed(1), p95Ms: +sorted[Math.floor(sorted.length*0.95)].toFixed(2), worstMs: +sorted[sorted.length-1].toFixed(2), over33: times.filter(t=>t>33.4).length });
  }}
  requestAnimationFrame(f);
})
"""

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--url', default=None)
    ap.add_argument('--out', default=os.path.join(ROOT, 'games', 'tests', 'out', 'rodeo'))
    ap.add_argument('--size', default='390x844')
    ap.add_argument('--theme', default='dark')
    ap.add_argument('--text', default="I keep replaying what I said in the meeting, what if my boss thinks I'm useless, and I still haven't finished the report")
    ap.add_argument('--video', action='store_true')
    ap.add_argument('--mock-ai', action='store_true', help='inject a host AI that answers like the model would')
    ap.add_argument('--path', default='games/loop-rodeo/index.html', help='page to load, relative to the repo root')
    ap.add_argument('--tag', default='')
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    w, h = map(int, a.size.split('x'))
    server = None
    url = a.url
    if not url:
        port = free_port()
        server = subprocess.Popen([sys.executable, '-m', 'http.server', str(port), '--bind', '127.0.0.1'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        time.sleep(0.8)
        url = f'http://127.0.0.1:{port}/{a.path}'
    sep = '&' if '?' in url else '?'
    url = url + f'{sep}theme={a.theme}'
    report = { 'size': a.size, 'theme': a.theme, 'console': [], 'shots': [], 'fps': {} }
    try:
        with sync_playwright() as p:
            b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
            ctx_args = dict(viewport={'width': w, 'height': h}, device_scale_factor=2 if w < 700 else 1, has_touch=w < 700, is_mobile=w < 700)
            if a.video: ctx_args['record_video_dir'] = a.out; ctx_args['record_video_size'] = {'width': w, 'height': h}
            ctx = b.new_context(**ctx_args)
            page = ctx.new_page()
            if a.mock_ai:
                page.add_init_script(MOCK_AI)
            page.on('console', lambda m: report['console'].append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
            page.on('pageerror', lambda e: report['console'].append(f'pageerror: {e}'))
            def shot(name):
                path = os.path.join(a.out, f'{a.size}-{a.theme}{a.tag}-{name}.png'); page.screenshot(path=path); report['shots'].append(path)
            t0 = time.time()
            page.goto(url); page.wait_for_load_state('networkidle')
            report['loadSeconds'] = round(time.time() - t0, 2)
            page.wait_for_timeout(1400); shot('01-camp')
            report['fps']['camp'] = page.evaluate(FPS, 3000)
            page.fill('#dump', a.text)
            page.click('#saddle'); page.wait_for_timeout(1300);
            page.evaluate("() => { const s = document.getElementById('speed'); s.value = '8'; s.dispatchEvent(new Event('input', {bubbles:true})); }")
            page.wait_for_timeout(500); shot('02-speed')
            page.add_script_tag(content=BOT)
            page.click('#loose')
            page.wait_for_timeout(1500); shot('03-rollcall')
            page.wait_for_function("window.__rodeo.game.phase === 'herd'", timeout=20000)
            page.wait_for_timeout(2500); shot('04-herd-early')
            report['fps']['herd'] = page.evaluate(FPS, 5000)
            page.wait_for_function("window.__rodeo.game.penned >= Math.ceil(window.__rodeo.game.total/2)", timeout=60000)
            shot('05-herd-mid')
            page.wait_for_function("window.__rodeo.game.phase === 'core'", timeout=90000)
            page.wait_for_timeout(1400); shot('06-big-one')
            # first press: the lasso slides off
            page.dispatch_event('#drum', 'pointerdown')
            page.wait_for_timeout(120); page.evaluate("window.dispatchEvent(new PointerEvent('pointerup'))")
            page.wait_for_function("window.__rodeo.game.coreStage === 'hold'", timeout=20000)
            page.wait_for_timeout(600); shot('07-core-line')
            page.dispatch_event('#drum', 'pointerdown')
            page.wait_for_timeout(2600); shot('08-holding')
            page.wait_for_function("window.__rodeo.game.coreStage === 'done'", timeout=20000)
            page.evaluate("window.dispatchEvent(new PointerEvent('pointerup'))")
            page.wait_for_timeout(1800); shot('09-settle')
            page.wait_for_function("window.__rodeo.game.phase === 'finale'", timeout=20000)
            page.wait_for_timeout(3200); shot('10-stars')
            page.wait_for_function("window.__rodeo.game.phase === 'end'", timeout=30000)
            page.wait_for_timeout(1200)
            page.evaluate("() => { const s = document.getElementById('after'); s.value = '4'; s.dispatchEvent(new Event('input', {bubbles:true})); s.dispatchEvent(new Event('change', {bubbles:true})); }")
            page.wait_for_timeout(400); shot('11-end')
            report['fps']['end'] = page.evaluate(FPS, 3000)
            report['game'] = page.evaluate("() => { const g = window.__rodeo.game; return { perfect: g.perfect, good: g.good, miss: g.miss, startBpm: g.startBpm, endBpm: g.endBpm, total: g.total, penned: g.penned, taps: window.__bot.taps }; }")
            report['events'] = page.evaluate("() => JSON.parse(localStorage.getItem('thinkstill:events') || '[]').map(e => e.name)")
            report['overflowX'] = page.evaluate("() => document.documentElement.scrollWidth > window.innerWidth")
            report['totalSeconds'] = round(time.time() - t0, 1)
            ctx.close(); b.close()
    finally:
        if server: server.terminate()
    with open(os.path.join(a.out, f'report-{a.size}-{a.theme}{a.tag}.json'), 'w') as f: json.dump(report, f, indent=2)
    print(json.dumps({k: v for k, v in report.items() if k != 'shots'}, indent=2))

if __name__ == '__main__':
    main()
