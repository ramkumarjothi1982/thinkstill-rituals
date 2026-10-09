"""Smoke tests for the built consoles (run games/tools/build.js first).

  artifact    games/dist/artifact/<mode>/ served locally inside the same page skeleton claude.ai wraps it in: the console
              boots, every shown face image loads from img/, and games load lazily from g/ and play to the end.
  framer      games/framer/*.tsx bundled with React 19 and a stub "framer" module: a Reset and a Reframe component
              mounted side by side, a prop change applied live, one unmounted (its DOM and styles must be gone) and
              remounted, and a lazy game played through the component (Game Base URL pointed at games/cdn/).

Usage: python3 games/tests/build_smoke.py [--games 2] [--only artifact|framer]
Outputs screenshots and report.json in games/tests/out/build/.
"""
import argparse, json, os, re, socket, subprocess, sys, time

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
GAMES = os.path.join(ROOT, 'games')
OUT = os.path.join(GAMES, 'tests', 'out', 'build')
NODE_MODULES = '/opt/npm-tools/node_modules'

SKELETON = ('<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover">'
            '<style>:root{color-scheme:light;padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui}'
            'img{max-width:100%}[hidden]{display:none!important}</style></head><body>{page}</body></html>')

FRAMER_STUB = r"""
export const ControlType = new Proxy({}, { get: (t, k) => String(k) });
export const RenderTarget = { canvas: 'CANVAS', export: 'EXPORT', thumbnail: 'THUMBNAIL', preview: 'PREVIEW', current: () => (window.__renderTarget || 'PREVIEW') };
export function addPropertyControls(C, controls) { (window.__controls = window.__controls || {})[C.name] = controls; }
"""

HARNESS = r"""
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import ResetArcade from '@framer/ThinkStillResetArcade.tsx';
import ReframeArcade from '@framer/ThinkStillReframeArcade.tsx';

const box = (id) => { const d = document.createElement('div'); d.id = id; d.style.cssText = 'position:absolute;top:0;width:390px;height:844px;left:' + (id === 'a' ? 0 : 400) + 'px'; document.body.appendChild(d); return d; };
const roots = { a: createRoot(box('a')), b: createRoot(box('b')) };
const base = (m) => location.origin + '/games/cdn/' + m + '/';
window.__h = {
  props: { a: { vibe: 'Cheeky', gameBase: base('reset'), onComplete: () => { window.__completed = (window.__completed || 0) + 1; } }, b: { theme: 'bright', gameBase: base('reframe') } },
  render(which) { const C = which === 'a' ? ResetArcade : ReframeArcade; roots[which].render(React.createElement(C, this.props[which])); },
  set(which, p) { Object.assign(this.props[which], p); this.render(which); },
  unmount(which) { roots[which].unmount(); },
  remount(which) { roots[which] = createRoot(document.getElementById(which)); this.render(which); },
};
window.__h.render('a'); window.__h.render('b');
"""


def free_port():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); p = s.getsockname()[1]; s.close(); return p


def collect(page, rep):
    page.on('console', lambda m: rep['errors'].append(m.text[:300]) if m.type == 'error' and 'net::ERR_' not in m.text else None)
    page.on('pageerror', lambda e: rep['errors'].append('pageerror: ' + str(e)[:300]))
    page.route(re.compile(r'https://(fonts\.googleapis\.com|fonts\.gstatic\.com|raw\.githubusercontent\.com|cdn\.jsdelivr\.net)/.*'), lambda r: r.abort())


TEXT = {'reset': "I keep replaying the meeting where I froze and now I can't switch off",
        'reframe': "My boss said 'we need to talk tomorrow' and I'm sure I'm getting fired"}


def play(page, mode, gid, timeout=170):
    """Launch a (lazy) game through the console's dev hook and let its autoplay finish it."""
    page.evaluate("([m, t]) => window.__arcade[m].setText(t)", [mode, TEXT[mode]])
    page.evaluate(f"() => {{ window.__qaDone = null; window.__arcade['{mode}'].launch('{gid}'); }}")
    page.wait_for_function(f"() => {{ const c = window.__arcade['{mode}'].current(); return c && c.id === '{gid}' && c.api; }}", timeout=30000)
    page.wait_for_timeout(900)
    page.evaluate(f"() => {{ window.__arcade['{mode}'].autoplay().then(r => window.__qaDone = r || 'ok', e => window.__qaDone = 'error: ' + (e && e.stack || e)); }}")
    t0 = time.time()
    while time.time() - t0 < timeout:
        page.wait_for_timeout(2000)
        cur = page.evaluate(f"() => {{ const c = window.__arcade['{mode}'].current(); return {{ done: !!(c && c.done), auto: window.__qaDone }}; }}")
        if cur['auto'] and str(cur['auto']).startswith('error'):
            return False, str(cur['auto'])[:300]
        if cur['done']:
            return True, round(time.time() - t0, 1)
    return False, 'timeout'


def broken_images(page, scope='#app'):
    return page.evaluate(f"""() => Array.from(document.querySelectorAll('{scope} img')).filter(i => i.complete && i.getBoundingClientRect().width > 0 && !i.naturalWidth).map(i => i.getAttribute('src')).slice(0, 10)""")


def test_artifact(pw, port, mode, n_games, report):
    adir = os.path.join(GAMES, 'dist', 'artifact', mode)
    page_html = open(os.path.join(adir, 'index.html'), encoding='utf-8').read()
    with open(os.path.join(adir, '_local.html'), 'w', encoding='utf-8') as f:
        f.write(SKELETON.replace('{page}', page_html))
    catalog = json.load(open(os.path.join(GAMES, 'cdn', mode, 'catalog.json')))
    rep = {'kind': 'artifact', 'mode': mode, 'errors': [], 'games': {}}
    browser = pw.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True)
    page = ctx.new_page(); collect(page, rep)
    requested = []
    page.on('request', lambda r: requested.append(r.url))
    try:
        page.goto(f'http://127.0.0.1:{port}/games/dist/artifact/{mode}/_local.html?tsgdev=1', wait_until='load', timeout=30000)
        page.wait_for_function(f"() => window.__arcade && window.__arcade['{mode}'] && window.__arcade['{mode}'].stage() === 'home'", timeout=20000)
        page.wait_for_timeout(1500)
        rep['catalog'] = page.evaluate(f"() => window.__arcade['{mode}'].games.length")
        rep['gameScriptsAtBoot'] = sorted(set(u.split('/')[-1] for u in requested if '/g/' in u))
        rep['homeBrokenImages'] = broken_images(page)
        page.screenshot(path=os.path.join(OUT, f'artifact-{mode}-home.png'))
        for c in catalog[:n_games]:
            ok, info = play(page, mode, c['id'])
            rep['games'][c['id']] = {'finished': ok, 'info': info, 'brokenImages': broken_images(page)}
            page.wait_for_timeout(1200)
            page.screenshot(path=os.path.join(OUT, f'artifact-{mode}-{c["id"]}-after.png'))
            page.evaluate(f"() => window.__arcade['{mode}'].stage()")
        rep['loadedGameScripts'] = sorted(set(u.split('/')[-1] for u in requested if '/g/' in u))
        rep['external'] = sorted(set(u for u in requested if not u.startswith(f'http://127.0.0.1:{port}') and not u.startswith('data:')))[:10]
    except Exception as e:  # noqa
        rep['errors'].append('harness: ' + str(e)[:400])
        try: page.screenshot(path=os.path.join(OUT, f'artifact-{mode}-x-error.png'))
        except Exception: pass
    finally:
        ctx.close(); browser.close()
    report.append(rep)


def bundle_harness():
    hdir = os.path.join(GAMES, 'tests', 'out', 'build', 'harness')
    os.makedirs(hdir, exist_ok=True)
    open(os.path.join(hdir, 'framer.js'), 'w').write(FRAMER_STUB)
    open(os.path.join(hdir, 'entry.jsx'), 'w').write(HARNESS)
    js = f"""
const esbuild = require({json.dumps(NODE_MODULES + '/esbuild')});
esbuild.buildSync({{ entryPoints: [{json.dumps(os.path.join(hdir, 'entry.jsx'))}], bundle: true, format: 'iife', outfile: {json.dumps(os.path.join(hdir, 'bundle.js'))},
  alias: {{ framer: {json.dumps(os.path.join(hdir, 'framer.js'))}, '@framer': {json.dumps(os.path.join(GAMES, 'framer'))} }}, nodePaths: [{json.dumps(NODE_MODULES)}], loader: {{ '.tsx': 'tsx' }},
  define: {{ 'process.env.NODE_ENV': '"development"' }}, logLevel: 'error' }});
"""
    subprocess.run(['node', '-e', js], check=True)
    with open(os.path.join(hdir, 'index.html'), 'w') as f:
        f.write('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>'
                '<body style="margin:0;background:#222"><script src="bundle.js"></script></body></html>')


def test_framer(pw, port, report):
    bundle_harness()
    rep = {'kind': 'framer', 'errors': [], 'checks': {}}
    browser = pw.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    ctx = browser.new_context(viewport={'width': 800, 'height': 844})
    page = ctx.new_page(); collect(page, rep)
    ck = rep['checks']
    try:
        page.goto(f'http://127.0.0.1:{port}/games/tests/out/build/harness/index.html?tsgdev=1', wait_until='load', timeout=30000)
        page.wait_for_function("() => window.__arcade && window.__arcade.reset && window.__arcade.reframe && window.__arcade.reset.stage() === 'home' && window.__arcade.reframe.stage() === 'home'", timeout=20000)
        page.wait_for_timeout(1200)
        page.screenshot(path=os.path.join(OUT, 'framer-two-instances.png'))
        ck['controls'] = page.evaluate("() => Object.fromEntries(Object.entries(window.__controls || {}).map(([k, v]) => [k, Object.keys(v)]))")
        ck['scenes'] = page.evaluate("() => ['a', 'b'].map(id => document.querySelector('#' + id + ' .tsg') && document.querySelector('#' + id + ' .tsg').getAttribute('data-scene'))")
        ck['vibeDefault'] = page.evaluate("() => window.__arcade.reset.session && true")
        # live prop change: the theme of instance b goes dark without a remount
        root_b = page.evaluate("() => { window.__rootB = document.querySelector('#b .tsg'); return !!window.__rootB; }")
        page.evaluate("() => window.__h.set('b', { theme: 'dark' })")
        page.wait_for_timeout(400)
        ck['liveTheme'] = page.evaluate("() => ({ same: document.querySelector('#b .tsg') === window.__rootB, scene: document.querySelector('#b .tsg').getAttribute('data-scene'), stored: localStorage.getItem('thinkstill:settings') })")
        # unmount a: its DOM, styles and loop must be gone; b must keep running
        page.evaluate("() => window.__h.unmount('a')")
        page.wait_for_timeout(500)
        ck['afterUnmount'] = page.evaluate("() => ({ aChildren: document.getElementById('a').children.length, styles: document.querySelectorAll('#a style').length, bAlive: !!document.querySelector('#b .tsg') })")
        page.evaluate("() => window.__h.remount('a')")
        page.wait_for_function("() => window.__arcade.reset.stage() === 'home'", timeout=20000)
        ck['remounted'] = page.evaluate("() => document.querySelectorAll('#a .tsg').length")
        # a lazy game through the component, with the component's own Game Base URL
        cat = json.load(open(os.path.join(GAMES, 'cdn', 'reset', 'catalog.json')))
        gid = cat[1]['id'] if len(cat) > 1 else cat[0]['id']
        ok, info = play(page, 'reset', gid)
        ck['lazyGame'] = {'id': gid, 'finished': ok, 'info': info}
        page.wait_for_timeout(1500)
        ck['onComplete'] = page.evaluate("() => window.__completed || 0")
        page.screenshot(path=os.path.join(OUT, 'framer-after-game.png'))
        # canvas render target: static render (loops stop, no audio, no AI)
        page.evaluate("() => { window.__renderTarget = 'CANVAS'; window.__h.unmount('b'); window.__h.remount('b'); }")
        page.wait_for_timeout(2500)
        ck['canvasStatic'] = page.evaluate("() => !!document.querySelector('#b .tsg')")
    except Exception as e:  # noqa
        rep['errors'].append('harness: ' + str(e)[:400])
        try: page.screenshot(path=os.path.join(OUT, 'framer-x-error.png'))
        except Exception: pass
    finally:
        ctx.close(); browser.close()
    report.append(rep)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--games', type=int, default=2)
    ap.add_argument('--only', default='')
    ap.add_argument('--modes', default='reset,reframe')
    a = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    port = free_port()
    server = subprocess.Popen([sys.executable, '-m', 'http.server', str(port), '--bind', '127.0.0.1'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    report = []
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as pw:
            if a.only in ('', 'artifact'):
                for mode in a.modes.split(','):
                    test_artifact(pw, port, mode, a.games, report)
            if a.only in ('', 'framer'):
                test_framer(pw, port, report)
    finally:
        server.terminate()
    with open(os.path.join(OUT, 'report.json'), 'w') as f:
        json.dump(report, f, indent=1)
    print(json.dumps(report, indent=1)[:6000])


if __name__ == '__main__':
    main()
