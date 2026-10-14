// Smoke test for tests/lib/harness.cjs: proves every helper works against the
// running lab (not a feature suite; nothing here is a product check).
//   node hushmallow/sensory-lab/tests/lib/harness-smoke.cjs [outDir]   (default: the OS temp dir)

const os = require('os');
const path = require('path');
const H = require('./harness.cjs');

const OUT = process.argv[2] || path.join(os.tmpdir(), 'hm-harness-smoke');

(async () => {
  const browser = await H.launch();
  const spies = Object.values(H.INIT);
  try {
    if (H.only('home')) await H.guard('smoke:home', async (scope, own) => {
      const { ctx, page, errors } = await H.open(browser, H.VIEWPORTS.phone, '#home', { initScripts: spies });
      own(ctx);
      await H.waitRig(page);
      await page.waitForTimeout(500);
      const g = await H.geo(page);
      const br = await page.evaluate(() => (typeof __lab.companion.rig.bodyRect === 'function' ? __lab.companion.rig.bodyRect() : null));
      H.check(scope, 'geo() measures the body', g.w > 50 && g.h > 50 && g.bottom > g.top, JSON.stringify(g));
      if (br) H.check(scope, 'geo() equals rig.bodyRect()', ['cx', 'top', 'bottom', 'mid', 'w', 'h', 'W', 'H'].every((k) => Math.abs(br[k] - g[k]) < 0.5), JSON.stringify({ br, g }));
      const L = await H.layout(page, scope);
      H.check(scope, 'layout() found the home Mallow', L.bodies.length === 1, JSON.stringify(L.bodies));
      const spy = await page.evaluate(() => ({ l: __listeners(), t: __timers(), a: __audio(), r: __raf(1000) }));
      H.check(scope, '__listeners() counts window and document listeners', spy.l.total > 0 && Object.keys(spy.l.window).length > 0, JSON.stringify(spy.l));
      H.check(scope, '__raf() sees the running loops', spy.r.inWindow > 0 && spy.r.pending > 0 && Object.keys(spy.r.pendingByFile).every((f) => f.startsWith('/')), JSON.stringify(spy.r));
      H.check(scope, '__audio(): no AudioContext before a gesture', spy.a.created === 0, JSON.stringify(spy.a));
      await page.mouse.click(g.ox + g.cx, g.oy + g.mid);
      await page.waitForTimeout(400);
      const a2 = await page.evaluate(() => __audio());
      const t2 = await page.evaluate(() => __timers());   // unlock() schedules its buffers with setTimeout
      H.check(scope, '__timers() attributes timers to page files', Object.keys(t2.created).some((f) => f.endsWith('/core/sound-engine.js')), JSON.stringify(t2));
      H.check(scope, '__audio(): one context after a click, made inside the gesture', a2.created === 1 && a2.contexts[0].activation && a2.toDestination >= 1, JSON.stringify(a2));
      await H.setHidden(page, true, { lifecycle: true });
      await page.waitForTimeout(300);
      const hid = await page.evaluate(() => ({ hidden: document.hidden, vs: document.visibilityState, state: __lab.sound.ctx?.state }));
      H.check(scope, 'setHidden(true) reaches the app', hid.hidden && hid.vs === 'hidden' && hid.state === 'suspended', JSON.stringify(hid));
      await H.setHidden(page, false, { lifecycle: true });
      H.check(scope, 'setHidden(false) restores', await page.evaluate(() => !document.hidden && document.visibilityState === 'visible'));
      await H.shot(page, OUT, 'smoke-home-phone');
      H.check(scope, 'no console errors', !errors.length, errors.join(' | '));
    });

    if (H.only('touch')) await H.guard('smoke:touch', async (scope, own) => {
      const { ctx, page, errors } = await H.open(browser, 'small', '#touchtalk', { prefs: { mallow: 'loomi' }, initScripts: [H.INIT.listenerCounter] });
      own(ctx);
      await H.waitRig(page);
      await page.waitForTimeout(500);
      const base = await page.evaluate(() => __listeners().total);
      const g = await H.geo(page);
      await H.clearEvents(page);
      const x = g.ox + g.cx, y = g.oy + g.mid;
      await H.touch(page, [{ t: 0, points: [{ x, y, id: 1 }] }, { t: 60, points: [] }]);
      await page.waitForTimeout(500);
      const ev = await H.events(page);
      H.check(scope, 'touch() taps through CDP', ev.includes('tap'), ev.join());
      await page.waitForTimeout(600);
      await H.clearEvents(page);
      const fr = [{ t: 0, points: [{ x: x - 30, y, id: 1 }, { x: x + 30, y, id: 2 }] }];
      for (let i = 1; i <= 8; i++) fr.push({ t: i * 30, points: [{ x: x - 30 - i * 4, y, id: 1 }, { x: x + 30 + i * 4, y, id: 2 }] });
      fr.push({ t: 300, points: [{ x: x + 62, y, id: 2 }] }, { t: 340, points: [] });
      await H.touch(page, fr);
      await page.waitForTimeout(400);
      const ev2 = await H.events(page);
      H.check(scope, 'two-finger frames reach the gesture engine', ev2.length > 0, ev2.join());
      await H.layout(page, scope, { minTarget: 40 });
      // leaving TouchTalk puts the window/document listeners back where they were on the stage
      await page.evaluate(() => { location.hash = '#home'; });
      await page.waitForFunction(() => __lab.route === 'home' && __lab.companion?.rig?.soft, null, { timeout: 20000 });
      await page.evaluate(() => { location.hash = '#touchtalk'; });
      await page.waitForFunction(() => __lab.route === 'touchtalk' && __lab.companion?.rig?.soft, null, { timeout: 20000 });
      await page.waitForTimeout(500);
      const again = await page.evaluate(() => __listeners().total);
      H.check(scope, '__listeners() is stable across a remount', again === base, `${base} → ${again}`);
      await H.shot(page, OUT, 'smoke-touchtalk-small');
      H.check(scope, 'no console errors', !errors.length, errors.join(' | '));
    });
  } finally { await browser.close(); }
  const { failed } = H.writeReport(OUT, 'harness-smoke');
  process.exit(failed ? 1 : 0);
})();
