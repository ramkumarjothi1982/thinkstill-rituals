"""Framer component smoke test: dist/framer/ThinkStillReflect.tsx bundled with React and a stub "framer" module.
Two instances side by side (dark + bright), play in one without touching the other, unmount / remount, and the
static (canvas) render. Usage: python3 framer_smoke.py <dev-server-base> <out-dir>"""
import json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
NODE_MODULES = '/opt/npm-tools/node_modules'
STUB = r"""
export const ControlType = new Proxy({}, { get: (t, k) => String(k) });
export const RenderTarget = { canvas: 'CANVAS', export: 'EXPORT', thumbnail: 'THUMBNAIL', preview: 'PREVIEW', current: () => (window.__renderTarget || 'PREVIEW') };
export function addPropertyControls(C, controls) { (window.__controls = window.__controls || {})[C.name] = controls; }
"""
HARNESS = r"""
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import Reflect from '@framer/ThinkStillReflect.tsx';
const box = (id, left) => { const d = document.createElement('div'); d.id = id; d.style.cssText = 'position:absolute;top:0;width:390px;height:844px;left:' + left + 'px'; document.body.appendChild(d); return d; };
const roots = { a: createRoot(box('a', 0)), b: createRoot(box('b', 400)) };
window.__h = {
  props: { a: { assetBase: '/img/', onComplete: (i) => { window.__completed = i; } }, b: { assetBase: '/img/', theme: 'bright' } },
  render(w) { roots[w].render(React.createElement(Reflect, this.props[w])); },
  set(w, p) { Object.assign(this.props[w], p); this.render(w); },
  unmount(w) { roots[w].unmount(); },
  remount(w) { roots[w] = createRoot(document.getElementById(w)); this.render(w); },
};
window.__h.render('a'); window.__h.render('b');
"""


def build():
    hdir = os.path.join(ROOT, 'dist', 'dev', 'framer-harness')
    os.makedirs(hdir, exist_ok=True)
    open(os.path.join(hdir, 'framer.js'), 'w').write(STUB)
    open(os.path.join(hdir, 'entry.jsx'), 'w').write(HARNESS)
    js = f"""
const esbuild = require({json.dumps(NODE_MODULES + '/esbuild')});
esbuild.buildSync({{ entryPoints: [{json.dumps(os.path.join(hdir, 'entry.jsx'))}], bundle: true, format: 'iife', outfile: {json.dumps(os.path.join(hdir, 'bundle.js'))},
  alias: {{ framer: {json.dumps(os.path.join(hdir, 'framer.js'))}, '@framer': {json.dumps(os.path.join(ROOT, 'dist', 'framer'))} }}, nodePaths: [{json.dumps(NODE_MODULES)}], loader: {{ '.tsx': 'tsx' }},
  define: {{ 'process.env.NODE_ENV': '"development"' }}, logLevel: 'error' }});
"""
    subprocess.run(['node', '-e', js], check=True)
    open(os.path.join(hdir, 'index.html'), 'w').write('<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#222"><script src="bundle.js"></script></body></html>')


def main(base, out):
    from playwright.sync_api import sync_playwright
    os.makedirs(out, exist_ok=True)
    build()
    rep = {'errors': [], 'checks': {}}
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={'width': 800, 'height': 860})
        page = ctx.new_page()
        page.on('pageerror', lambda e: rep['errors'].append(str(e)[:300]))
        page.on('console', lambda m: rep['errors'].append(m.text[:300]) if m.type == 'error' and 'net::ERR_' not in m.text else None)
        page.goto(base + '/framer-harness/index.html')
        page.wait_for_timeout(2500)
        cnt = lambda sel: page.evaluate(f"(sel) => ['a','b'].map(id => {{ const host = document.querySelector('#' + id + ' div div'); const r = host && host.shadowRoot; return r ? r.querySelectorAll(sel).length : -1; }})", sel)
        rep['checks']['both_mounted_hub_cards'] = cnt('.rf-card')
        rep['checks']['themes'] = page.evaluate("['a','b'].map(id => { const h = document.querySelector('#' + id + ' div div'); return h && h.shadowRoot ? h.shadowRoot.querySelector('.rf').getAttribute('data-theme') : null; })")
        page.screenshot(path=os.path.join(out, 'framer-two-instances.png'))
        page.locator('#a [data-act=solo]').click()
        page.wait_for_timeout(7000)
        rep['checks']['a_in_ritual_b_on_hub'] = [cnt('.gtg-inv')[0] > 0 or cnt('.gtg-stage')[0] > 0, cnt('.rf-card')[1] > 0]
        page.screenshot(path=os.path.join(out, 'framer-a-playing.png'))
        page.evaluate("window.__h.unmount('a')")
        page.wait_for_timeout(300)
        rep['checks']['a_unmounted'] = page.evaluate("!document.querySelector('#a div')")
        page.evaluate("window.__h.remount('a')")
        page.wait_for_timeout(1200)
        rep['checks']['a_remounted'] = cnt('.rf-card')[0] > 0
        page.evaluate("window.__renderTarget = 'CANVAS'; window.__h.set('b', { radius: 24 })")
        page.wait_for_timeout(800)
        rep['checks']['b_static_poster_no_engine'] = page.evaluate("(() => { const h = document.querySelector('#b div div'); return !!h && !h.shadowRoot || (h.shadowRoot && h.shadowRoot.childNodes.length === 0); })()")
        rep['checks']['property_controls'] = sorted(page.evaluate("Object.keys((window.__controls||{}).ThinkStillReflect||{})"))
        page.screenshot(path=os.path.join(out, 'framer-static-poster.png'))
        ctx.close(); b.close()
    json.dump(rep, open(os.path.join(out, 'framer-smoke.json'), 'w'), indent=1)
    print(json.dumps(rep, indent=1))


if __name__ == '__main__':
    main(sys.argv[1].rstrip('/'), sys.argv[2])
