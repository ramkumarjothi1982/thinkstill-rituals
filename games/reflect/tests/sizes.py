"""Layout check across the required viewports: each ritual's main play screen at 360×780, 375×812, 390×844, 430×932,
1280×860 and 1440×900. Checks: no horizontal page scroll, every visible control inside the viewport, primary controls at
least 44 px, nothing clipped by the top bar. Usage: python3 sizes.py <base> <out-dir>"""
import json, os, sys
from playwright.sync_api import sync_playwright

SIZES = [(360, 780), (375, 812), (390, 844), (430, 932), (1280, 860), (1440, 900)]
PILOTS = {
    'shadow-monsters': {'ready': '!!window.__smBuilder', 'skip': '.sm-skip', 'controls': ['.sm-canvas', '.sm-tray', '.sm-item', '.sm-tagbtn', '.sm-chain']},
    'mess-auction': {'ready': '!!window.__maStudio', 'skip': '.ma-skip', 'controls': ['.ma-paper', '.ma-head', '[data-act=blindfold]']},
    'emotional-rollercoaster': {'ready': '!!window.__erBuilder', 'skip': '.er-btn', 'controls': ['.er-card', '.er-canvas', '.er-mod', '.er-lever']},
}
PRIMARY = ['.sm-item', '.sm-tagbtn', '.sm-chain', '[data-act=blindfold]', '.er-mod', '.er-lever', '.rf-ib']

CHECK = """(sels) => {
  const host = [...document.querySelectorAll('*')].find(e => e.shadowRoot && e.shadowRoot.querySelector('.rf'));
  const root = host ? host.shadowRoot : document;
  const vw = innerWidth, vh = innerHeight, out = [];
  const small = [];
  for (const s of sels) {
    const els = [...root.querySelectorAll(s)].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
    if (!els.length) { out.push(s + ': missing'); continue; }
    for (const e of els) {
      // items inside a sideways-scrolling strip (the toybox) may sit past the edge: they scroll into view
      let sc = e.parentElement, scrolls = false;
      while (sc && sc !== root.host) { const st = getComputedStyle(sc); if (/(auto|scroll)/.test(st.overflowX) && sc.scrollWidth > sc.clientWidth + 1) { scrolls = true; break; } sc = sc.parentElement; }
      const r = e.getBoundingClientRect();
      const box = scrolls ? sc.getBoundingClientRect() : null;
      const out1 = scrolls ? (r.top < 47 || r.bottom > vh + 1 || box.left < -1 || box.right > vw + 1) : (r.left < -1 || r.top < 47 || r.right > vw + 1 || r.bottom > vh + 1);
      if (out1) out.push(s + ' outside: ' + [r.left, r.top, r.right, r.bottom].map(Math.round).join(','));
    }
  }
  return { hscroll: document.documentElement.scrollWidth > vw + 1, outside: out };
}"""
SMALL = """(sels) => {
  const host = [...document.querySelectorAll('*')].find(e => e.shadowRoot && e.shadowRoot.querySelector('.rf'));
  const root = host ? host.shadowRoot : document; const out = [];
  for (const s of sels) for (const e of root.querySelectorAll(s)) { const r = e.getBoundingClientRect(); if (r.width > 0 && (r.width < 43.5 || r.height < 43.5)) out.push(s + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); }
  return out;
}"""


def main(base, out):
    os.makedirs(out, exist_ok=True)
    report = {}
    with sync_playwright() as p:
        b = p.chromium.launch()
        for pid, cfg in PILOTS.items():
            for (w, h) in SIZES:
                ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2 if w < 900 else 1, is_mobile=w < 900, has_touch=w < 900)
                page = ctx.new_page()
                errs = []
                page.on('pageerror', lambda e: errs.append(str(e)[:200]))
                page.goto(base + '/index.html'); page.wait_for_timeout(1200)
                page.locator(f'[data-ritual={pid}] [data-act=solo]').click()
                page.wait_for_timeout(1500)
                try:
                    page.locator(cfg['skip']).filter(has_text='Skip').first.click(timeout=4000)
                except Exception:
                    pass
                page.wait_for_function(cfg['ready'], timeout=20000)
                page.wait_for_timeout(900)
                name = f'{pid}-{w}x{h}'
                page.screenshot(path=os.path.join(out, name + '.png'))
                r = page.evaluate(CHECK, cfg['controls'])
                r['small_targets'] = page.evaluate(SMALL, PRIMARY)
                r['errors'] = errs
                report[name] = r
                ctx.close()
        b.close()
    json.dump(report, open(os.path.join(out, 'sizes.json'), 'w'), indent=1)
    bad = {k: v for k, v in report.items() if v['hscroll'] or v['outside'] or v['small_targets'] or v['errors']}
    print(json.dumps({'checked': len(report), 'issues': bad}, indent=1))


if __name__ == '__main__':
    main(sys.argv[1].rstrip('/'), sys.argv[2])
