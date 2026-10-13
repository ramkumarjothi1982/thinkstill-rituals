// Hushmates Lab QA: plays the first demonstration through the real
// interface at several viewport sizes, saves screenshots and reports any
// console errors. Dev only. Serve the repository root first:
//   python3 -m http.server 8000
//   node hushmallow/hushmates-lab/tools/shots.cjs <outDir> [base-url]
const { createRequire } = require('module');
const path = require('path');
const fs = require('fs');
const req = createRequire('/opt/node-tools/node_modules/');
const { chromium } = req('playwright');

const SIZES = [
  { name: 'mobile-390x844', width: 390, height: 844, mobile: true },
  { name: 'mobile-375x812', width: 375, height: 812, mobile: true },
  { name: 'mobile-320x568', width: 320, height: 568, mobile: true },
  { name: 'desktop-1280x860', width: 1280, height: 860, mobile: false },
  { name: 'desktop-1280x860-single', width: 1280, height: 860, mobile: false, query: '&layout=single' },
];

(async () => {
  const [out = 'shots', base = 'http://localhost:8000'] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }).catch(() => chromium.launch());
  const only = process.env.SIZES ? process.env.SIZES.split(',') : null;
  const report = {};
  for (const size of SIZES.filter((s) => !only || only.includes(s.name))) {
    const ctx = await browser.newContext({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: 2, hasTouch: size.mobile, isMobile: size.mobile,
      reducedMotion: process.env.REDUCED ? 'reduce' : 'no-preference' });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
    await page.goto(`${base}/hushmallow/hushmates-lab/index.html?fresh${size.query || ''}`);
    await page.waitForFunction(() => window.__lab?.ready, null, { timeout: 15000 });
    await page.evaluate(() => { window.__lab.pace.ms = 260; });
    await page.waitForTimeout(900);
    const shot = async (label) => page.screenshot({ path: path.join(out, `${size.name}-${label}.png`) });
    await shot('00-start');
    const labels = ['01-find', '02-discover', '03-invite', '04-accept', '05-hushspace', '06-moon-message', '07-cloud-reply', '08-perspective', '09-quiet', '10-blocked'];
    for (let i = 1; i <= 10; i++) {
      try { await page.evaluate((n) => window.__lab.runStep(n), i); } catch (e) { errors.push(`step ${i}: ${e.message.split('\n')[0]}`); }
      await page.waitForTimeout(500);
      if (size.mobile || size.query) {
        await shot(`${labels[i - 1]}`);
        // also the other person's view where it matters
        if ([4, 7, 8, 9, 10].includes(i)) {
          const other = await page.evaluate(() => (document.querySelector('.lab').dataset.view === 'moon' ? 'cloud' : 'moon'));
          await page.evaluate((k) => window.__lab.setView(k), other);
          await page.waitForTimeout(300);
          await shot(`${labels[i - 1]}-${other}`);
        }
      } else if ([2, 5, 7, 8, 10].includes(i)) await shot(labels[i - 1]);
    }
    const steps = await page.evaluate(() => window.__lab.steps());
    report[size.name] = { steps: steps.filter(Boolean).length, errors };
    await ctx.close();
  }
  await browser.close();
  console.log(JSON.stringify(report, null, 1));
})();
