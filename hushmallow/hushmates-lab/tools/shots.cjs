// Hushmates Lab QA for the Feeling Relay. For each viewport size it
//   1. captures the main scenes (put into a known state through lab fixtures),
//   2. plays both demonstrations through the real interface (real taps, real
//      service calls) and checks every guide step ticked from the service's state,
//   3. reports console errors and warnings.
// Dev only. Serve the repository root first:
//   python3 -m http.server 8000
//   node hushmallow/hushmates-lab/tools/shots.cjs <outDir> [base-url]
// SIZES=mobile-390x844,... limits the sizes; REDUCED=1 uses reduced motion.
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

// Each scene runs in the page with the lab's helpers; `who` picks the phone to photograph on narrow screens.
const PRE = `const L = window.__lab; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const root = (who) => who === 'catcher' ? document.querySelector('#device-catcher .lab-device:not([hidden])') : document.querySelector('#device-author');
  const q = (s, who) => root(who).querySelector(s);
  const click = (s, who) => { const e = q(s, who); if (!e) throw new Error('missing ' + s); e.click(); };
  const type = (s, text, who) => { const e = q(s, who); e.value = text; e.dispatchEvent(new Event('input', { bubbles: true })); };`;
const SCENES = [
  { name: '01-welcome', js: '' },
  { name: '02-release', js: "await L.fixture('ready'); L.show('moon','release');" },
  { name: '03-compose', js: "click('[data-test=start-feeling]'); await sleep(400); type('[data-test=feeling-text]', 'My friend hasn’t replied. I think they’re avoiding me.'); click('[data-test=label-worry]');" },
  { name: '04-review', js: "click('[data-test=review-feeling]');", wait: 1500 },
  { name: '05-release-moment', js: "click('[data-test=release-submit]');", wait: 2600 },
  { name: '06-sent', js: '', wait: 3200 },
  { name: '07-catch', js: "L.setView('catcher'); L.show('cloud','catch');" },
  { name: '08-offer', js: "click('[data-test=find-feeling]','catcher');", wait: 3600 },
  { name: '09-writing', js: "click('[data-test=catch-feeling]','catcher'); await sleep(900); type('[data-test=reframe-text]', 'Maybe they’ve had a really full week and meant to reply when they had more energy.', 'catcher');" },
  { name: '10-petal', js: "click('[data-test=reframe-submit]','catcher');", wait: 1500 },
  { name: '11-after', js: '', wait: 4200 },
  { name: '12-journeys', js: "await L.fixture('three'); L.setView('author'); L.show('moon','journeys');" },
  { name: '13-journey', js: "click('[data-test^=journey-]');" },
  { name: '14-homecoming-moment', js: "await L.fixture('home'); L.show('moon','returned'); await sleep(900); click('[data-test^=returned-]');", wait: 4200 },
  { name: '15-homecoming', js: '', wait: 5200 },
  { name: '16-share', js: "L.show('moon','share', { id: L.journeyFor('relay').id }); await sleep(900); click('[data-test=share-save]');", wait: 1800 },
  { name: '17-mallow-offer', js: "await L.fixture('fallback-available'); L.show('moon','journey', { id: L.journeyFor('fallback').id }); await sleep(400); q('.hm-scroll').scrollTop = 320;" },
  { name: '18-mallow-ready', js: "click('[data-test=ask-mallow]'); await sleep(700); click('[data-test=confirm]');", wait: 2200 },
  { name: '19-you', js: "L.show('moon','you');" },
  { name: '20-support', js: "L.show('moon','release', { compose: true }); await sleep(500); type('[data-test=feeling-text]', 'I took a load of pills an hour ago and feel strange.'); click('[data-test=review-feeling]');" },
];

(async () => {
  const [out = 'shots', base = 'http://localhost:8000'] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }).catch(() => chromium.launch());
  const only = process.env.SIZES ? process.env.SIZES.split(',') : null;
  const report = {};
  for (const size of SIZES.filter((s) => !only || only.includes(s.name))) {
    const open = async () => {
      const ctx = await browser.newContext({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: 2, hasTouch: size.mobile, isMobile: size.mobile,
        reducedMotion: process.env.REDUCED ? 'reduce' : 'no-preference', acceptDownloads: true });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
      page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
      await page.goto(`${base}/hushmallow/hushmates-lab/index.html?fresh${size.query || ''}`);
      await page.waitForFunction(() => window.__lab?.ready, null, { timeout: 15000 });
      await page.waitForTimeout(1200);
      return { ctx, page, errors };
    };
    // 1. scenes
    const a = await open();
    for (const s of SCENES) {
      if (s.js) { try { await a.page.evaluate(`(async () => { ${PRE} ${s.js} })()`); } catch (e) { a.errors.push(`scene ${s.name}: ${e.message.split('\n')[0]}`); } }
      await a.page.waitForTimeout(s.wait || 1300);
      await a.page.screenshot({ path: path.join(out, `${size.name}-${s.name}.png`) });
    }
    await a.ctx.close();
    // 2. both demonstrations, played through the interface
    const b = await open();
    const played = {};
    for (const sc of ['relay', 'fallback']) {
      const t0 = Date.now();
      await b.page.evaluate(async (name) => { window.__lab.pace.ms = 260; document.querySelector(`[data-scenario="${name}"]`).click(); await window.__lab.play(name); }, sc);
      await b.page.waitForTimeout(600);
      played[sc] = { progress: await b.page.textContent('#guide-progress'), seconds: Math.round((Date.now() - t0) / 1000),
        notTicked: await b.page.$$eval('#guide-steps .guide-step:not(.is-done) .guide-step__title', (els) => els.map((e) => e.textContent)) };
    }
    await b.ctx.close();
    report[size.name] = { scenes: SCENES.length, played, errors: [...a.errors, ...b.errors] };
    console.log(size.name, JSON.stringify(report[size.name]));
  }
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close();
  const failed = Object.values(report).some((r) => r.errors.length || Object.values(r.played).some((p) => p.notTicked.length));
  process.exit(failed ? 1 : 0);
})();
