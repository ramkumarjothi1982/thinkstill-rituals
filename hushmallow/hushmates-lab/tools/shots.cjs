// Hushmates Lab QA for the Feeling Relay (2.0). For each viewport size it
//   1. captures every scene, put into a known state through lab fixtures, and
//      audits the layout of each one inside the phone: horizontal overflow,
//      text pushed off-screen or clipped, overlapping controls, tiny tap
//      targets and tiny text,
//   2. plays all three demonstrations through the real interface (real taps,
//      real service calls) and checks every guide step ticked from the
//      service's state: A five people, B nobody (Mallow fallback), C two people,
//   3. reports console errors and warnings.
// Then, once: a keyboard-only release (Tab, Space, Enter) and a reduced-motion
// run of all three demonstrations.
// Dev only. Serve the repository root first:
//   python3 -m http.server 8000
//   node hushmallow/hushmates-lab/tools/shots.cjs <outDir> [base-url]
// SIZES=mobile-390x844,... limits the sizes; SKIP_PLAY=1 skips the demonstrations.
const { createRequire } = require('module');
const path = require('path');
const fs = require('fs');
const req = createRequire('/opt/node-tools/node_modules/');
const { chromium } = req('playwright');

const SIZES = [
  { name: 'mobile-390x844', width: 390, height: 844, mobile: true },
  { name: 'mobile-375x812', width: 375, height: 812, mobile: true },
  { name: 'mobile-320x568', width: 320, height: 568, mobile: true },
  { name: 'tablet-768x1024', width: 768, height: 1024, mobile: true },
  { name: 'desktop-1280x860', width: 1280, height: 860, mobile: false },
];

// Each scene runs in the page with the lab's helpers; `who` picks the phone to audit and photograph.
const PRE = `const L = window.__lab; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const root = (who) => who === 'catcher' ? document.querySelector('#device-catcher .lab-device:not([hidden])') : document.querySelector('#device-author');
  const live = (s, who) => [...root(who).querySelectorAll(s)].find((e) => !e.closest('[inert], .is-leaving'));
  const q = live;
  const click = (s, who) => { const e = live(s, who); if (!e) throw new Error('missing ' + s); e.click(); };
  const type = (s, text, who) => { const e = live(s, who); e.value = text; e.dispatchEvent(new Event('input', { bubbles: true })); };
  const scrollTo = (s, who) => live(s, who)?.scrollIntoView({ block: 'center' });`;
const FEELING = 'My friend hasn’t replied. I think they’re avoiding me.';
// Groups start from a fresh lab so fixtures never collide.
const GROUPS = [
  [
    { name: '01-welcome', js: '' },
    { name: '02-welcome-how', js: "click('[data-test=welcome-next]');", wait: 2200 },
    { name: '03-welcome-promises', js: "click('[data-test=welcome-next]');" },
    { name: '04-release', js: "await L.fixture('ready'); L.show('moon','release');", wait: 1600 },
    { name: '05-compose', js: `type('[data-test=feeling-text]', '${FEELING}'); click('[data-test=label-worry]'); click('[data-test=share-consent]'); scrollTo('[data-test=share-consent]');` },
    { name: '06-privacy', js: "click('[data-test=privacy-link]');", wait: 900 },
    { name: '07-release-moment', js: "document.querySelector('.hm-sheet [data-test=confirm], .hm-sheet .kit-btn--ink')?.click(); await sleep(500); click('[data-test=release-submit]');", wait: 2600 },
    { name: '08-sent', js: '', wait: 3600 },
    { name: '09-catch', who: 'catcher', js: "L.setView('catcher'); L.show('cloud','catch');", wait: 1600 },
    { name: '10-offer', who: 'catcher', js: "click('[data-test=find-feeling]','catcher');", wait: 3800 },
    { name: '11-writing', who: 'catcher', js: "click('[data-test=catch-feeling]','catcher'); await sleep(1000); type('[data-test=reframe-text]', 'Maybe they’ve had a really full week and meant to reply when they had more energy.', 'catcher');", wait: 1200 },
    { name: '12-passing', who: 'catcher', js: "click('[data-test=reframe-submit]','catcher');", wait: 1500 },
    { name: '13-after', who: 'catcher', js: '', wait: 4400 },
  ],
  [
    { name: '14-journeys', js: "await L.fixture('three'); await L.fixture('fallback-available'); L.setView('author'); L.show('moon','journeys');", wait: 1600 },
    { name: '15-journey', js: "L.show('moon','journey', { id: L.journeyFor('relay').id });", wait: 1500 },
    { name: '16-mallow-offer', js: "L.show('moon','journey', { id: L.journeyFor('fallback').id }); await sleep(900); scrollTo('[data-test=ask-mallow]');" },
    { name: '17-mallow-magic', js: "click('[data-test=ask-mallow]');", wait: 2600 },
    { name: '18-mallow-ready', js: '', wait: 3400 },
    { name: '19-homecoming-moment', js: "await L.fixture('home'); L.show('moon','returned'); await sleep(900); click('[data-test=returned-' + L.journeyFor('relay').id + ']');", wait: 4400 },
    { name: '20-homecoming', js: '', wait: 6400 },
    { name: '21-homecoming-choices', js: "scrollTo('.hf-choices-list');", wait: 700 },
    { name: '22-share', js: "L.show('moon','share', { id: L.journeyFor('relay').id }); await sleep(900); document.querySelectorAll('#device-author [data-test=share-pick]').forEach((b, i) => { if (i < 2) b.click(); });", wait: 2400 },
    { name: '23-share-picture', js: "click('[data-test=share-save]');", wait: 2000 },
  ],
  [
    { name: '24-homecoming-partial', js: "await L.fixture('partial'); L.show('moon','homecoming', { id: L.journeyFor('partial').id, refresh: true });", wait: 1800 },
  ],
  [
    { name: '25-homecoming-zero', js: "await L.fixture('zero'); L.show('moon','homecoming', { id: L.journeyFor('fallback').id, refresh: true });", wait: 1800 },
    { name: '26-homecoming-zero-actions', js: "scrollTo('[data-test=send-again]');", wait: 700 },
  ],
  [
    { name: '27-homecoming-zero-mallow', js: "await L.fixture('zero-mallow'); L.show('moon','homecoming', { id: L.journeyFor('fallback').id, refresh: true });", wait: 1800 },
  ],
  [
    { name: '28-homecoming-extra', js: "await L.fixture('home-extra'); L.show('moon','homecoming', { id: L.journeyFor('fallback').id, refresh: true }); await sleep(900); live('[data-test=mallow-extra]').open = true; scrollTo('[data-test=mallow-extra]');", wait: 1200 },
  ],
  [
    { name: '29-you', js: "await L.fixture('ready'); L.show('moon','you');", wait: 1600 },
    { name: '30-support', js: "L.show('moon','release', { compose: true }); await sleep(700); type('[data-test=feeling-text]', 'I took a load of pills an hour ago and feel strange.'); click('[data-test=share-consent]'); click('[data-test=release-submit]');", wait: 1800 },
  ],
];

/** Runs inside the page: audits the visible scene of one phone. */
function audit(who) {
  const host = who === 'catcher' ? document.querySelector('#device-catcher .lab-device:not([hidden])') : document.querySelector('#device-author');
  const screen = host?.querySelector('.hm-screens') || host;
  const box = screen.getBoundingClientRect();
  const issues = [];
  // an open sheet is modal: audit only what is in it
  const sheet = [...host.querySelectorAll('.hm-sheet')].find((x) => x.getBoundingClientRect().height > 0);
  const scope = sheet || host;
  // the header and the dock float over scrolling content; content passing beneath them is not a collision
  const chrome = (e) => !!e.closest('.hf-head, .rl-dock-slot, .rl-head-slot');
  const visible = (e) => {
    if (e.closest('[inert], .is-leaving, [hidden], .rl-flight, [aria-hidden="true"], .hf-sr')) return false;
    const r = e.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    for (let n = e; n && n !== host; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.05) return false; }
    return true;
  };
  const inHScroller = (e) => { for (let n = e.parentElement; n && n !== host; n = n.parentElement) { const ox = getComputedStyle(n).overflowX; if ((ox === 'auto' || ox === 'scroll') && n.scrollWidth > n.clientWidth + 1) return true; } return false; };
  const name = (e) => e.dataset?.test || e.getAttribute('aria-label') || (e.textContent || '').trim().slice(0, 40) || e.className;
  // 1. sideways scrolling inside the phone, and pages whose end can't scroll clear of the dock
  const dock = [...host.querySelectorAll('.rl-dock-slot')].find((d) => visible(d) && !d.hidden);
  for (const s of host.querySelectorAll('.hf-scroll, .hm-scroll')) {
    if (!visible(s)) continue;
    if (s.scrollWidth > s.clientWidth + 1) issues.push({ kind: 'h-overflow', el: s.className, by: s.scrollWidth - s.clientWidth });
    if (dock && !sheet) {
      const covered = s.getBoundingClientRect().bottom - dock.getBoundingClientRect().top;
      const room = parseFloat(getComputedStyle(s).paddingBottom) || 0;
      if (covered > room + 4) issues.push({ kind: 'dock-covers-end', el: s.className, covered: Math.round(covered), room: Math.round(room) });
    }
  }
  // 2. text pushed off the side of the screen, or clipped inside its box
  const texts = [...scope.querySelectorAll('h1, h2, h3, p, button, a, label, strong, small, li, blockquote, figcaption, .kit-chip')].filter(visible);
  for (const e of texts) {
    const r = e.getBoundingClientRect();
    if (!inHScroller(e) && (r.left < box.left - 1 || r.right > box.right + 1)) issues.push({ kind: 'off-screen', el: name(e), left: Math.round(r.left - box.left), right: Math.round(r.right - box.right) });
    const cs = getComputedStyle(e);
    if ((cs.overflow === 'hidden' || cs.overflowY === 'hidden') && cs.textOverflow !== 'ellipsis' && e.scrollHeight > e.clientHeight + 3 && !e.querySelector('svg, canvas')) issues.push({ kind: 'clipped', el: name(e), by: e.scrollHeight - e.clientHeight });
    if (e.childNodes.length && [...e.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim()) && parseFloat(cs.fontSize) < 10.5) issues.push({ kind: 'tiny-text', el: name(e), px: cs.fontSize });
  }
  // 3. controls on top of each other (one partly covering another)
  const controls = [...scope.querySelectorAll('button, a[href], input, textarea, [role="checkbox"], [role="switch"], [role="radio"], [role="tab"]')].filter(visible);
  for (let i = 0; i < controls.length; i++) {
    const a = controls[i].getBoundingClientRect();
    for (let k = i + 1; k < controls.length; k++) {
      if (controls[i].contains(controls[k]) || controls[k].contains(controls[i])) continue;
      if (chrome(controls[i]) !== chrome(controls[k])) continue;
      const b = controls[k].getBoundingClientRect();
      const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const hh = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (w > 3 && hh > 3) {
        // only count it when both are on screen and the one underneath is really covered
        const cx = Math.max(a.left, b.left) + w / 2; const cy = Math.max(a.top, b.top) + hh / 2;
        if (cy < box.top || cy > box.bottom) continue;
        const top = document.elementFromPoint(cx, cy);
        const covered = [controls[i], controls[k]].filter((c) => !c.contains(top));
        if (covered.length) issues.push({ kind: 'overlap', a: name(controls[i]), b: name(controls[k]), w: Math.round(w), h: Math.round(hh) });
      }
    }
    if ((a.width < 32 || a.height < 32) && a.top >= box.top && a.bottom <= box.bottom && !controls[i].closest('.hf-link, .hf-pager-dots, .hf-beats')) issues.push({ kind: 'small-target', el: name(controls[i]), w: Math.round(a.width), h: Math.round(a.height) });
  }
  return issues;
}

(async () => {
  const [out = 'shots', base = 'http://localhost:8000'] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }).catch(() => chromium.launch());
  const only = process.env.SIZES ? process.env.SIZES.split(',') : null;
  const report = { sizes: {} };
  const open = async (size, { reduced = false } = {}) => {
    const ctx = await browser.newContext({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: 2, hasTouch: size.mobile, isMobile: size.mobile, reducedMotion: reduced ? 'reduce' : 'no-preference' });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
    await page.goto(`${base}/hushmallow/hushmates-lab/index.html?fresh${size.query || ''}`);
    await page.waitForFunction(() => window.__lab?.ready, null, { timeout: 15000 });
    await page.waitForTimeout(1200);
    return { ctx, page, errors };
  };
  const playAll = async (size, reduced) => {
    const played = {};
    const errors = [];
    for (const sc of ['relay', 'fallback', 'partial']) {
      const b = await open(size, { reduced });
      const t0 = Date.now();
      await b.page.evaluate(async (name) => { window.__lab.pace.ms = 200; await window.__lab.play(name); }, sc);
      await b.page.waitForTimeout(800);
      played[sc] = { progress: await b.page.textContent('#guide-progress'), seconds: Math.round((Date.now() - t0) / 1000),
        notTicked: await b.page.$$eval('#guide-steps .guide-step:not(.is-done) .guide-step__title', (els) => els.map((e) => e.textContent)) };
      await b.page.screenshot({ path: path.join(out, `${size.name}${reduced ? '-reduced' : ''}-play-${sc}.png`) });
      errors.push(...b.errors);
      await b.ctx.close();
    }
    return { played, errors };
  };

  for (const size of SIZES.filter((s) => !only || only.includes(s.name))) {
    const r = { audit: {}, errors: [] };
    for (const group of GROUPS) {
      const a = await open(size);
      for (const s of group) {
        if (s.js) { try { await a.page.evaluate(`(async () => { ${PRE} ${s.js} })()`); } catch (e) { a.errors.push(`scene ${s.name}: ${e.message.split('\n')[0]}`); } }
        await a.page.waitForTimeout(s.wait || 1300);
        await a.page.screenshot({ path: path.join(out, `${size.name}-${s.name}.png`) });
        const issues = await a.page.evaluate(audit, s.who || 'author');
        if (issues.length) r.audit[s.name] = issues;
      }
      r.errors.push(...a.errors);
      await a.ctx.close();
    }
    if (!process.env.SKIP_PLAY) { const p = await playAll(size, false); r.played = p.played; r.errors.push(...p.errors); }
    report.sizes[size.name] = r;
    console.log(size.name, JSON.stringify({ audit: Object.fromEntries(Object.entries(r.audit).map(([k, v]) => [k, v.length])), played: r.played, errors: r.errors }));
  }

  // keyboard only: release a feeling with Tab, typing, Space and Enter
  {
    const size = SIZES[0];
    const k = await open(size);
    const p = k.page;
    await p.evaluate(async () => { await window.__lab.fixture('ready'); window.__lab.show('moon', 'release'); });
    await p.waitForTimeout(1200);
    await p.focus('#device-author [data-test=feeling-text]');
    await p.keyboard.type(FEELING, { delay: 5 });
    const order = [];
    const ring = [];
    for (let i = 0; i < 24; i++) {
      await p.keyboard.press('Tab');
      const f = await p.evaluate(() => {
        const e = document.activeElement; const cs = getComputedStyle(e);
        return { test: e.dataset?.test || e.getAttribute('aria-label') || e.textContent.trim().slice(0, 24), ring: cs.outlineStyle !== 'none' || cs.boxShadow !== 'none' };
      });
      order.push(f.test); ring.push(f.ring);
      if (f.test === 'share-consent') await p.keyboard.press('Space');
      if (f.test === 'release-submit') break;
    }
    const consent = await p.getAttribute('#device-author [data-test=share-consent]', 'aria-checked');
    await p.keyboard.press('Enter');
    const sent = await p.waitForSelector('#device-author [data-test=release-sent]', { timeout: 15000 }).then(() => true, () => false);
    report.keyboard = { order, focusVisibleEverywhere: ring.every(Boolean), consentBySpace: consent === 'true', releasedWithEnter: sent, errors: k.errors };
    await p.screenshot({ path: path.join(out, 'keyboard-release.png') });
    await k.ctx.close();
    console.log('keyboard', JSON.stringify(report.keyboard));
  }
  // reduced motion: motion really is reduced (no long animations during the moments, the welcome
  // beats don't advance on their own), and all three demonstrations still complete
  {
    const k = await open(SIZES[0], { reduced: true });
    const p = k.page;
    const long = async () => p.evaluate(() => document.getAnimations()
      .filter((a) => a.playState === 'running' && a.effect?.getTiming && Number(a.effect.getTiming().duration) > 450 && a.effect.getTiming().iterations !== Infinity)
      .map((a) => `${a.effect.target?.className?.baseVal ?? a.effect.target?.className ?? '?'}:${Math.round(a.effect.getTiming().duration)}`.slice(0, 80)));
    await p.evaluate(() => { document.querySelector('#device-author [data-test=welcome-next]')?.click(); });
    await p.waitForTimeout(4200);
    const beat = await p.evaluate(() => [...document.querySelectorAll('#device-author .hf-beat')].findIndex((b) => b.getAttribute('aria-selected') === 'true'));
    await p.evaluate(async () => { await window.__lab.fixture('ready'); window.__lab.show('moon', 'release'); });
    await p.waitForTimeout(900);
    await p.evaluate(() => {
      const root = document.querySelector('#device-author');
      const area = root.querySelector('[data-test=feeling-text]');
      area.value = 'My friend hasn’t replied. I think they’re avoiding me.';
      area.dispatchEvent(new Event('input', { bubbles: true }));
      root.querySelector('[data-test=share-consent]').click();
      root.querySelector('[data-test=release-submit]').click();
    });
    const samples = [];
    for (let i = 0; i < 6; i++) { await p.waitForTimeout(250); samples.push(...await long()); }
    const sent = await p.waitForSelector('#device-author [data-test=release-sent]', { timeout: 8000 }).then(() => true, () => false);
    report.reducedMotion = { welcomeBeatsStayPut: beat === 0, longAnimationsDuringRelease: [...new Set(samples)], releasedQuickly: sent, errors: k.errors };
    console.log('reduced-motion', JSON.stringify(report.reducedMotion));
    await k.ctx.close();
  }
  if (!process.env.SKIP_PLAY) {
    const p = await playAll(SIZES[0], true);
    report.reduced = p;
    console.log('reduced', JSON.stringify(p));
  }

  fs.writeFileSync(path.join(out, 'qa-report.json'), JSON.stringify(report, null, 2));
  await browser.close();
  const failed = Object.values(report.sizes).some((r) => r.errors.length || Object.values(r.played || {}).some((x) => x.notTicked.length))
    || !report.keyboard?.releasedWithEnter || (report.reduced && (report.reduced.errors.length || Object.values(report.reduced.played).some((x) => x.notTicked.length)))
    || !report.reducedMotion?.welcomeBeatsStayPut || !report.reducedMotion?.releasedQuickly || report.reducedMotion?.longAnimationsDuringRelease.length;
  process.exit(failed ? 1 : 0);
})();
