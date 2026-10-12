// Headless runner for the W7 labs (Playwright + Chromium, SwiftShader).
//   node tools/hires/lab/run.cjs fit <id> <out.json> [feats] [table]
//   node tools/hires/lab/run.cjs shot '<check.html query>' <out.png> [crop.png]
//   node tools/hires/lab/run.cjs json '<check.html query>'      (prints the numbers)
// Serve the repo root first:  python3 -m http.server 8000   (LAB_BASE overrides)
// Playwright is resolved from PLAYWRIGHT_DIR (default /opt/node-tools/node_modules)
// and Chromium from CHROMIUM (default /opt/pw-browsers/chromium).
const { createRequire } = require('module');
const fs = require('fs');
const req = createRequire((process.env.PLAYWRIGHT_DIR || '/opt/node-tools/node_modules') + '/');
const { chromium } = req('playwright');
const BASE = process.env.LAB_BASE || 'http://localhost:8000/hushmallow/tools/hires/lab/';

(async () => {
  const [cmd, a, b, c, d] = process.argv.slice(2);
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium',
    args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const page = await (await browser.newContext({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 1 })).newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  const t0 = Date.now();
  try {
    if (cmd === 'fit') {
      const q = new URLSearchParams({ mallow: a });
      if (c) q.set('feats', c);
      if (d) q.set('table', d);
      await page.goto(BASE + 'fit.html?' + q, { waitUntil: 'load' });
      await page.waitForFunction(() => window.__fit, null, { timeout: 380000, polling: 1000 });
      const fit = await page.evaluate(() => window.__fit);
      if (fit.error) throw new Error(fit.error);
      fs.writeFileSync(b, JSON.stringify(fit, null, 1));
      console.log(a, ((Date.now() - t0) / 1000).toFixed(0) + 's', JSON.stringify(fit.report));
    } else {
      await page.goto(BASE + 'check.html?' + a, { waitUntil: 'load' });
      await page.waitForFunction(() => window.__ready, null, { timeout: 380000, polling: 500 });
      const r = await page.evaluate(() => ({ err: window.__err, out: window.__out, crop: window.__crop, jump: window.__jump,
        jumps: window.__jumps, overflow: window.__overflow, info: window.__info }));
      if (r.err) throw new Error(r.err);
      if (cmd === 'shot') {
        fs.writeFileSync(b, Buffer.from(r.out.split(',')[1], 'base64'));
        if (c && r.crop) fs.writeFileSync(c, Buffer.from(r.crop.split(',')[1], 'base64'));
      }
      const { out, crop, ...nums } = r;
      console.log(JSON.stringify(nums));
    }
  } finally {
    if (errs.length) console.log('page errors:', errs.join(' | '));
    await browser.close();
  }
})().catch((e) => { console.error(String(e && e.stack || e)); process.exit(1); });
