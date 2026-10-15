// Regression sweep of the existing experiences (P1, 15 Oct 2026): every scene reachable from the app, opened in a
// real browser at one size, with page / console errors, horizontal overflow and a screenshot of each.
//
//   node hushmallow/tools/p1-sweep.cjs W H [port=8311] [out=DIR] [tier=ultra|paid|none]
//
// The repo root must be served (python3 -m http.server <port> from it). Sign-in is off (the repository's
// public-config.js), as in a build without the two values. Scenes: the Hushfold (home), the classic home, express,
// encounter, a classic ritual, a V3 ritual (played with a few taps), landing, the Memory Garden (seeded with two kept
// tools), plans (both), settings, library, journey, mallows, the support sheet, Another Angle (no server: authored),
// and the account scene (sign-in off: its "off" card).
const { createRequire } = require('module');
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');

const argv = process.argv.slice(2);
const W = +argv[0] || 390, H = +argv[1] || 844;
const opt = (k, d) => { const a = argv.find((x) => x.startsWith(`${k}=`)); return a ? a.slice(k.length + 1) : d; };
const PORT = +opt('port', 8311), TIER = opt('tier', 'ultra'), LABEL = opt('label', 'sweep');
const OUT = opt('out', path.join(os.tmpdir(), 'p1-sweep'));
const BASE = `http://127.0.0.1:${PORT}/hushmallow/index.html`;
const SCENES = ['home', 'classic', 'express', 'encounter', 'ritual:moonmilk-wind-down', 'ritual:hm-0001', 'landing', 'garden', 'plans', 'plans:ultra', 'settings', 'library', 'journey', 'mallows', 'support', 'angle', 'account'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const res = { W, H, TIER, scenes: [], fails: [] };

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] });
  const kill = setTimeout(() => { console.log('TIMEOUT'); console.log('RESULT', JSON.stringify(res)); process.exit(2); }, 385000);
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true, isMobile: W < 700 });
  await ctx.addInitScript(([tier]) => {
    try {
      if (sessionStorage.getItem('sweep')) return;
      sessionStorage.setItem('sweep', '1');
      for (const k of Object.keys(localStorage)) if (/^hm2:/.test(k)) localStorage.removeItem(k);
      if (tier !== 'none') localStorage.setItem('hm2:entitlement', JSON.stringify({ tier, source: 'test', since: Date.now() }));
      localStorage.setItem('hm2:prefs', JSON.stringify({ seenIntro: true }));
    } catch { /* private mode */ }
  }, [TIER]);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  let errs = [];
  page.on('pageerror', (e) => errs.push(`pageerror: ${String(e).slice(0, 200)}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text())) errs.push(`console: ${m.text().slice(0, 200)}`); });
  page.on('response', (r) => { if (r.status() >= 400 && !/favicon/.test(r.url())) errs.push(`http ${r.status()} ${r.url().replace(/^https?:\/\/[^/]+/, '')}`); });
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__hush && document.querySelector('#scene > *'), null, { timeout: 90000 });
  await sleep(2500);
  // two kept tools in the Memory Garden, as after two discoveries
  await page.evaluate(async () => {
    const g = await import(new URL('src/engine/garden.js', location.href).href);
    g.saveSkill(window.__hush.store, { id: 'slowing-down', fromWorld: 'static-storm', mallow: 'glitzi' });
    g.saveSkill(window.__hush.store, { id: 'a-little-more-room', fromWorld: 'luminous-ocean', mallow: 'loomi' });
  });
  let tid = 30;
  const tap = async (x, y) => { const id = ++tid; await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id }] }); await sleep(70); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); };
  for (const spec of SCENES) {
    const [name, variant] = spec.split(':');
    errs = [];
    const row = { spec, ok: true };
    try {
      await page.evaluate(async ([name, variant]) => {
        const app = window.__hush;
        document.querySelectorAll('#sheet-root > *').forEach((n) => n.remove());
        const { RITUALS } = await import(new URL('src/data/rituals.js', location.href).href);
        app.state.input = { text: 'I am anxious about tomorrow', emotions: [{ id: 'anxiety', confidence: 1, intensity: 0.7 }], intensity: 0.7, contexts: [], desires: [], safety: { level: 'none' } };
        if (name === 'support') { const m = await import(new URL('src/app/scenes/support.js', location.href).href); return m.openSupport(app); }
        if (name === 'ritual') { app.state.ritual = RITUALS.find((r) => r.id === variant); return app.go('ritual', { id: variant }); }
        if (name === 'landing') { app.state.ritual = RITUALS.find((r) => r.id === 'drift-and-dock'); app.state.result = { summary: [{ label: 'You let go of', text: 'Two worries' }] }; return app.go('landing'); }
        if (name === 'plans') return app.go('plans', variant ? { reason: variant } : {});
        return app.go(name, {});
      }, [name, variant]);
    } catch (e) { row.ok = false; row.open = String(e).slice(0, 160); }
    await sleep(name === 'ritual' || name === 'angle' || name === 'garden' || name === 'home' ? 4500 : 2200);
    if (name === 'ritual') { for (let i = 0; i < 4; i++) { await tap(Math.round(W / 2), Math.round(H * 0.55)); await sleep(500); } await sleep(1200); }
    const m = await page.evaluate(() => {
      const se = document.scrollingElement;
      const over = [...document.querySelectorAll('#scene *, #sheet-root *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.right > innerWidth + 1 || r.left < -1) && getComputedStyle(e).position !== 'fixed' && !e.closest('canvas'); }).slice(0, 3)
        .map((e) => `${e.tagName.toLowerCase()}.${[...e.classList].slice(0, 2).join('.')} ${Math.round(e.getBoundingClientRect().left)}..${Math.round(e.getBoundingClientRect().right)}`);
      return { scrollW: se.scrollWidth, innerW: innerWidth, view: document.querySelector('[data-auth-view]')?.dataset.authView || null, scene: document.querySelector('#scene > *')?.className?.toString().slice(0, 40) || null, over };
    });
    row.hOverflow = m.scrollW > m.innerW + 1;
    row.offscreen = m.over;
    row.scene = m.scene;
    if (name === 'account') row.view = m.view;
    row.errors = errs.slice(0, 5);
    const shot = path.join(OUT, 'shots', `${LABEL}-${W}x${H}-${spec.replace(':', '-')}.png`);
    fs.mkdirSync(path.dirname(shot), { recursive: true });
    await page.screenshot({ path: shot });
    row.shot = shot;
    if (!row.ok || row.hOverflow || row.errors.length || (name === 'account' && row.view !== 'off')) { res.fails.push(spec); console.log('FAIL', spec, JSON.stringify(row).slice(0, 400)); }
    else console.log('ok  ', spec, row.offscreen.length ? `(wide children: ${row.offscreen.join('; ')})` : '');
    res.scenes.push(row);
    await page.evaluate(() => document.querySelectorAll('#sheet-root > *').forEach((n) => n.remove()));
  }
  clearTimeout(kill);
  await browser.close();
  console.log('RESULT', JSON.stringify(res));
  process.exit(res.fails.length ? 1 : 0);
})();
