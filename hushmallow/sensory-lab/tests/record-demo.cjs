// Records a short demo video of TouchTalk + SoftBody (Playwright video, webm).
//   node hushmallow/sensory-lab/tests/record-demo.cjs <outDir>
// Gestures are scripted (simulated touch); a small dot shows where the finger is.

const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const BASE = process.env.LAB_URL || 'http://localhost:8000/hushmallow/sensory-lab/index.html';
const OUT = process.argv[2] || '.';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, recordVideo: { dir: OUT, size: { width: 390, height: 844 } } });
  const page = await ctx.newPage();
  await page.addInitScript(() => localStorage.setItem('hm.sensorylab.v1', JSON.stringify({ quality: 'high', material: 'jelly' })));
  await page.goto(`${BASE}#/softbody`);
  await page.waitForFunction(() => globalThis.__lab?.companion?.rig?.soft);
  // finger indicator
  await page.evaluate(() => {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;background:rgba(255,255,255,.35);border:2px solid rgba(255,255,255,.8);pointer-events:none;z-index:99;opacity:0;transition:opacity .12s';
    document.body.append(d);
    const show = (e) => { d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px'; };
    addEventListener('pointerdown', (e) => { show(e); d.style.opacity = 1; }, true);
    addEventListener('pointermove', show, true);
    addEventListener('pointerup', () => { d.style.opacity = 0; }, true);
    const cap = document.createElement('div');
    cap.id = 'cap';
    cap.style.cssText = 'position:fixed;left:0;right:0;top:120px;text-align:center;font:600 15px system-ui;color:#fff;opacity:.9;z-index:99;pointer-events:none';
    document.body.append(cap);
  });
  const cap = (t) => page.evaluate((t) => { document.getElementById('cap').textContent = t; }, t);
  const g = await page.evaluate(() => { const r = __lab.companion.rig, s = r.soft; return { cx: r.CX, base: r.BASE, h: s.H * r.S, w: s.W * r.S }; });
  const top = { x: g.cx, y: g.base - g.h * 0.85 };
  const W = (ms) => page.waitForTimeout(ms);
  const drag = async (from, to, steps = 14, hold = 300) => {
    await page.mouse.move(from.x, from.y); await page.mouse.down();
    for (let i = 1; i <= steps; i++) { await page.mouse.move(from.x + (to.x - from.x) * i / steps, from.y + (to.y - from.y) * i / steps); await W(16); }
    await W(hold); await page.mouse.up();
  };
  const material = async (id, label) => { await page.locator(`[data-material="${id}"]`).click(); await cap(label); await W(900); };

  await cap('Jelly · pull and let go'); await W(800);
  await drag(top, { x: top.x + 20, y: top.y - 140 }); await W(1600);
  await cap('Jelly · press down'); await drag(top, { x: top.x, y: top.y + 110 }); await W(1600);
  await material('mochi', 'Mochi · stretchy');
  await drag({ x: top.x - 30, y: top.y + 10 }, { x: top.x - 90, y: top.y - 170 }, 18, 450); await W(1800);
  await material('marshmallow', 'Marshmallow · slow, soft recovery');
  await drag(top, { x: top.x, y: top.y - 120 }); await W(1800);
  await cap('Squish button (single-touch squeeze)');
  const sq = await page.getByRole('button', { name: 'Squish', exact: true }).boundingBox();
  await page.mouse.move(sq.x + sq.width / 2, sq.y + sq.height / 2); await page.mouse.down(); await W(900); await page.mouse.up(); await W(1500);
  await material('cloud', 'Cloud · airy, floating'); await drag(top, { x: top.x + 40, y: top.y - 100 }); await W(1800);
  await material('pillow', 'Pillow · deep compression'); await drag(top, { x: top.x, y: top.y + 120 }, 14, 500); await W(1800);
  await cap('Mesh view: the art itself deforms');
  await page.getByRole('button', { name: 'Show the soft-body mesh' }).click();
  await material('jelly', 'Mesh view · jelly');
  await drag({ x: top.x + 40, y: top.y + 30 }, { x: top.x + 110, y: top.y - 90 }); await W(1800);
  await page.getByRole('button', { name: 'Show the soft-body mesh' }).click();
  // TouchTalk
  await page.evaluate(() => { location.hash = '#/touchtalk'; });
  await page.waitForFunction(() => __lab.route === 'touchtalk' && __lab.companion?.rig?.soft);
  await page.evaluate(() => { const c = document.createElement('div'); c.id = 'cap'; c.style.cssText = 'position:fixed;left:0;right:0;top:120px;text-align:center;font:600 15px system-ui;color:#fff;opacity:.9;z-index:99;pointer-events:none'; document.body.append(c); });
  await cap('TouchTalk · tap'); await W(500);
  await page.mouse.click(g.cx - 40, g.base - g.h * 0.6); await W(1200);
  await cap('TouchTalk · tap, tap, tap (giggles)');
  for (let i = 0; i < 4; i++) { await page.mouse.click(g.cx + (i % 2 ? 30 : -30), g.base - g.h * 0.55); await W(260); }
  await W(1400);
  await cap('TouchTalk · press and hold'); await page.mouse.move(g.cx, g.base - g.h * 0.5); await page.mouse.down(); await W(2600); await page.mouse.up(); await W(1200);
  await cap('TouchTalk · stroke');
  const sy = g.base - g.h * 0.6;
  await page.mouse.move(8, sy); await page.mouse.down();
  for (let k = 0; k < 4; k++) for (let i = 0; i <= 16; i++) { const t = k % 2 ? 1 - i / 16 : i / 16; await page.mouse.move(8 + t * (g.cx + g.w * 0.3 - 8), sy + Math.sin(i / 2) * 6); await W(18); }
  await page.mouse.up(); await W(1500);
  await cap('TouchTalk · double tap'); await page.mouse.dblclick(g.cx, g.base - g.h * 0.7); await W(1800);
  await ctx.close();
  await browser.close();
  const vid = fs.readdirSync(OUT).filter((f) => f.endsWith('.webm')).map((f) => path.join(OUT, f)).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
  console.log(vid);
})();
