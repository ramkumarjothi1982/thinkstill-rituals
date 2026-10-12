// V3 ritual QA runner (dev only; needs the repo served on :8000 — `python3 -m http.server 8000` from the repo root).
//   node hushmallow/tools/v3-lab.cjs "<query>" <outPrefix> [tap|drag] [width] [height]
//   query: v3=HM-0001&photos=3   or   engine=GE-07&law=1&photos=0   (&text=...&motion=reduce)
// 'tap' completes the ritual with the Tap instead button; 'drag' performs the
// real gestures the ritual's ghost hints describe (paths, swipes and taps).
// Writes <outPrefix>-N-<phase>.png screenshots and prints one JSON line:
// {final:{phase,p,lp}, seconds, fps, errors}. phase 'end' = completed.
// V3_LOOP=1 also plays one 'Keep playing' round (ends with phase 'closed', round 3).
const { createRequire } = require('module');
const req = createRequire('/opt/node-tools/node_modules/');
const { chromium } = req('playwright');
(async () => {
  const [query, out, mode = 'tap', vw = '390', vh = '844'] = process.argv.slice(2);
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }).catch(() => chromium.launch());
  const page = await browser.newPage({ viewport: { width: +vw, height: +vh }, deviceScaleFactor: Number(process.env.V3_DPR || 1.5), hasTouch: true });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  await page.goto(`http://localhost:8000/hushmallow/index.html?${query}`);
  await page.waitForFunction(() => globalThis.__hm3 && globalThis.__hm3.phase === 'play', null, { timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}-0-start.png` });
  const st = () => page.evaluate(() => ({ phase: __hm3.phase, p: __hm3.progress, lp: __hm3.lawProgress, locked: __hm3.locked, round: __hm3.round }));
  const t0 = Date.now();
  let shots = 1, last = '', looped = false;
  async function dragPath(pts) {
    if (!pts || pts.length < 2) return;
    await page.mouse.move(pts[0][0], pts[0][1]); await page.mouse.down();
    for (const [x, y] of pts.slice(1)) { await page.mouse.move(x, y, { steps: 3 }); }
    await page.mouse.up();
  }
  const LIMIT = Number(process.env.V3_LIMIT_MS || 150000);
  while (Date.now() - t0 < LIMIT) {
    const s = await st();
    if (s.phase === 'end' && process.env.V3_LOOP && !looped) { looped = true; await page.screenshot({ path: `${out}-8-endcard.png` }); await page.evaluate(() => __hm3.keepPlaying()); await page.waitForTimeout(800); continue; }
    if (looped && s.round >= 3) { await page.screenshot({ path: `${out}-8-round3.png` }); await page.evaluate(() => __hm3.finishNow()); break; }
    if (s.phase === 'end' || s.phase === 'closed') break;
    if (s.phase === 'finale') { await page.waitForTimeout(400); continue; }
    if (mode === 'drag') {
      const h = await page.evaluate(() => __hm3.hint());
      if (h && h.path) await dragPath(h.path);
      else if (h && h.from) await dragPath(Array.from({ length: 14 }, (_, i) => [h.from.x + (h.to.x - h.from.x) * i / 13, h.from.y + (h.to.y - h.from.y) * i / 13]));
      else if (h && h.tap) { await page.mouse.click(h.tap.x, h.tap.y); }
      else await page.click('.v3-tap');
      await page.waitForTimeout(250);
    } else {
      await page.click('.v3-tap').catch(() => {});
      await page.waitForTimeout(450);
    }
    const s2 = await st();
    const key = `${s2.phase}:${Math.floor(s2.p * 3)}:${s2.lp == null ? '' : Math.floor(s2.lp * 2)}`;
    if (key !== last && shots < 7) { last = key; await page.screenshot({ path: `${out}-${shots++}-${s2.phase}.png` }); }
  }
  const s = await st();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}-9-final.png` });
  const fps = await page.evaluate(() => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(f); else r(n); }; requestAnimationFrame(f); }));
  console.log(JSON.stringify({ query, mode, final: s, seconds: (Date.now() - t0) / 1000, fps, errors: errors.slice(0, 12) }));
  await browser.close();
})().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
