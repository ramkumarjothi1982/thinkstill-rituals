// Brand smoke check (dev only): opens each scene in a real browser and fails
// when the brand shows on screen as anything but lowercase "hushmallow".
// innerText is the rendered text, so an uppercasing style that catches the
// brand (an eyebrow, a badge, a speaker label) shows up here even when the
// source scan in tests/brand.test.mjs cannot see it.
//   node hushmallow/tools/brand-smoke.cjs [--size 390x844] [--tier none|paid|ultra]
// Needs the repo served on :8000 and Playwright (see docs/HUSHFOLD.md §5).
const { createRequire } = require('module');
const req = createRequire('/opt/node-tools/node_modules/');
const { chromium } = req('playwright');
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const [W, H] = arg('size', '390x844').split('x').map(Number);
const TIER = arg('tier', 'ultra');
const BASE = arg('base', 'http://localhost:8000/hushmallow/index.html');
const WRONG = /Hushmallow|HUSHMALLOW|HushMallow|Hush Mallow|hushMallow/;
const SCENES = ['home', 'classic', 'express', 'encounter', 'plans', 'plans:ultra', 'settings', 'library', 'journey', 'mallows', 'landing', 'support', 'ritual:moonmilk-wind-down', 'angle'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true, isMobile: W < 700 });
  await ctx.addInitScript(([tier]) => {
    try {
      if (sessionStorage.getItem('smoke')) return;
      sessionStorage.setItem('smoke', '1');
      if (tier === 'none') localStorage.removeItem('hm2:entitlement');
      else localStorage.setItem('hm2:entitlement', JSON.stringify({ tier, source: 'test', since: Date.now() }));
      const p = JSON.parse(localStorage.getItem('hm2:prefs') || '{}'); p.seenIntro = true; localStorage.setItem('hm2:prefs', JSON.stringify(p));
    } catch { /* private mode */ }
  }, [TIER]);
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__hush && document.querySelector('#scene > *'), null, { timeout: 90000 });
  await sleep(2000);
  const fails = [];
  for (const spec of SCENES) {
    const [name, variant] = spec.split(':');
    try {
      await page.evaluate(async ([name, variant]) => {
        const app = window.__hush;
        const { RITUALS } = await import(new URL('src/data/rituals.js', location.href).href);
        app.state.input = { text: 'I am anxious about tomorrow', emotions: [{ id: 'anxiety', confidence: 1, intensity: 0.7 }], intensity: 0.7, contexts: [], desires: [], safety: { level: 'none' } };
        if (name === 'support') { const m = await import(new URL('src/app/scenes/support.js', location.href).href); return m.openSupport(app); }
        if (name === 'ritual') { app.state.ritual = RITUALS.find((r) => r.id === variant); return app.go('ritual', { id: variant }); }
        if (name === 'landing') { app.state.ritual = RITUALS.find((r) => r.id === 'drift-and-dock'); app.state.result = { summary: [{ label: 'You let go of', text: 'Two worries' }] }; return app.go('landing'); }
        if (name === 'plans') return app.go('plans', variant ? { reason: variant } : {});
        return app.go(name, {});
      }, [name, variant]);
    } catch (e) { fails.push(`${spec}: could not open (${String(e).slice(0, 120)})`); continue; }
    await sleep(name === 'ritual' || name === 'angle' ? 4500 : 2500);
    const r = await page.evaluate((src) => {
      const re = new RegExp(src);
      const text = document.body.innerText;
      const hit = text.split('\n').find((l) => re.test(l));
      return { hit: hit || null, title: document.title };
    }, WRONG.source);
    if (r.hit) fails.push(`${spec}: "${r.hit.trim().slice(0, 80)}"`);
    if (WRONG.test(r.title)) fails.push(`${spec}: title "${r.title}"`);
    await page.evaluate(() => document.querySelectorAll('#sheet-root > *').forEach((n) => n.remove()));
  }
  await browser.close();
  if (fails.length) { console.error(`brand smoke ${W}x${H} ${TIER}: ${fails.length} problem(s)\n  ${fails.join('\n  ')}`); process.exit(1); }
  console.log(`brand smoke ${W}x${H} ${TIER}: ${SCENES.length} scenes, brand lowercase everywhere`);
})().catch((e) => { console.error(e); process.exit(2); });
