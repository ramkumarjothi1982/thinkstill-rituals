// Browser probe for the risk screener (src/beyond/risk-screen.js) and its check-in, on the main screen and in Another Angle. Each
// Tell in a fresh context, every /v1/ request recorded, every console error kept:
//   concern   4 concerning messages: care (the care path, the Support pill, no question) or the check-in ("Before we go on —
//             are you okay right now?", its three chips and the Support pill), with 0 /v1/ requests
//   okay      the check-in answered "I'm okay": main — play goes on (a Thought Mallow or the plans page); Another Angle (mock,
//             sharing on) — the angle request goes to the server
//   notreally the check-in answered "Not really": "Thank you for telling me…", "See support" first, no world, 0 /v1/ requests
//   everyday  3 everyday look-alikes: whatever the screener says, shown
//   grief     2 ordinary griefs: the gentle path
//
//   node hushmallow/tools/beyond/risk-probe.cjs <main|angle> W H [server] [kind=all|concern|okay|notreally|everyday|grief]
//        [base=URL] [dev=8790] [out=DIR]
// main: offline; angle: with `server`, ?angleDev=<dev> (the mock harness allows only the origin http://localhost:8000).
// Playwright from /opt/node-tools; Chromium at /opt/pw-browsers/chromium (never playwright install).
const { createRequire } = require('module');
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');

const argv = process.argv.slice(2);
const SCREEN = argv[0] === 'angle' ? 'angle' : 'main', W = +argv[1] || 390, H = +argv[2] || 844, SERVER = argv.includes('server');
const opt = (k, d) => { const a = argv.find((x) => x.startsWith(`${k}=`)); return a ? a.slice(k.length + 1) : d; };
const KIND = opt('kind', 'all');
const OUT = opt('out', path.join(os.tmpdir(), 'risk-probe'));
const DEV = opt('dev', '8790');
const BASE = opt('base', 'http://localhost:8000/hushmallow/index.html') + (SCREEN === 'angle' && SERVER ? `?angleDev=${DEV}` : '');
const TAG = `${SCREEN}-${W}x${H}`;
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const res = { screen: SCREEN, W, H, server: SERVER, rows: [], fails: [], shots: [], errors: [] };
const fail = (t, k, v) => { res.fails.push({ t, k, v }); console.log('FAIL', t.slice(0, 50), k, JSON.stringify(v ?? '').slice(0, 300)); };
const CHECK_Q = 'Before we go on — are you okay right now?';
const MAIN_Q = 'Shall we play with this, or just be with it?';
const ANGLE_Q = 'Shall we look at this from another angle, or just be with it?';
const OKAY = SCREEN === 'main' ? 'I’m okay — let’s play' : 'I’m okay — show me another angle';
const HEARD = 'Thank you for telling me. You don’t have to hold this on your own.';

const SETS = {
  concern: [
    ["i've counted out all the pills", 'care'], ["i won't be a burden much longer", 'care'],
    ["i'm so tired of everything", 'check'], ['i keep looking at the train tracks near my house', 'check'],
  ],
  okay: [["i'm so tired of everything", 'check']],
  notreally: [['i keep looking at the train tracks near my house', 'check']],
  everyday: [['goodbye everyone, see you monday', 'any'], ["i'm dying to see the new film", 'any'], ["i'll be gone for the weekend", 'any']],
  grief: [['my grandpa died last week', 'gentle'], ['our cat was put down yesterday', 'gentle']],
};

let tid = 40;
const touch = (cdp, type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
async function tap(o, x, y) { const id = ++tid; await touch(o.cdp, 'touchStart', [{ x, y, id, radiusX: 8, radiusY: 8, force: 1 }]); await sleep(70); await touch(o.cdp, 'touchEnd', []); }
async function tapEl(o, sel, text = null, timeout = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const r = await o.page.evaluate(({ sel, text }) => { const e = [...document.querySelectorAll(sel)].find((x) => !x.hidden && x.offsetParent && (!text || x.textContent.includes(text))); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }, { sel, text });
    if (r) { await tap(o, r.x, r.y); return true; }
    await sleep(150);
  }
  throw new Error(`no ${sel} ${text || ''}`);
}
async function shot(o, name) {
  await o.page.evaluate(() => Promise.race([new Promise((r) => setTimeout(r, 2500)), Promise.all(document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.target?.closest?.('.hf-sublive, .hf-chips, .hf-subs')).map((a) => a.finished.catch(() => null)))])).catch(() => null);
  await sleep(300);
  const f = path.join(OUT, `risk-${name}-${TAG}.png`); await o.page.screenshot({ path: f }); res.shots.push(f); return f;
}

async function open(browser) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  await ctx.addInitScript(({ server }) => {
    try {
      if (!sessionStorage.getItem('rp:seeded')) {
        sessionStorage.setItem('rp:seeded', '1');
        for (const k of Object.keys(localStorage)) if (/flow|progress|garden/i.test(k)) localStorage.removeItem(k);
        localStorage.setItem('hm2:entitlement', JSON.stringify({ tier: 'paid', source: 'test', since: Date.now() }));
        localStorage.setItem('hm2:beyond.consent', JSON.stringify({ v: 2, choice: server ? 'yes' : 'no', at: '2026-10-15' }));
        localStorage.setItem('hm2:beyond.seen', 'true');
      }
    } catch { /* storage blocked */ }
    window.__rpSaid = [];
    new MutationObserver(() => {
      for (const e of document.querySelectorAll('.hf-subs .hf-sub .text, .hf-sublive .hf-sub .text')) {
        const t = (e.textContent || '').trim();
        if (t && !window.__rpSaid.slice(-4).includes(t)) window.__rpSaid.push(t);
      }
    }).observe(document, { subtree: true, childList: true, characterData: true });
  }, { server: SERVER });
  const page = await ctx.newPage();
  const o = { ctx, page, cdp: null, req: [], errors: [] };
  page.on('request', (r) => { if (/\/v1\//.test(r.url())) o.req.push({ m: r.method(), p: r.url().replace(/^https?:\/\/[^/]+/, '').replace(/\?.*$/, ''), at: Date.now() }); });
  page.on('pageerror', (e) => o.errors.push(String(e.message || e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|favicon/.test(m.text())) o.errors.push(m.text()); });
  o.cdp = await ctx.newCDPSession(page);
  await page.goto(BASE);
  if (SCREEN === 'main') {
    await page.waitForFunction(() => window.__hushfold?.touch?.ready && window.__hushfold?.mallow?.bodyRect?.(), null, { timeout: 90000 });
    await sleep(800);
  } else {
    await page.waitForFunction(() => window.__hush && window.__hush.world && window.__hushfold, null, { timeout: 120000 });
    await page.evaluate(async () => { if (!window.__hush.ent.has('ultra')) await window.__hush.ent.purchase('ultra'); });
    await page.evaluate(() => window.__hush.go('angle'));
    await page.waitForFunction(() => window.__angle && window.__angle.zuzu, null, { timeout: 120000 });
    await page.waitForFunction(() => [...document.querySelectorAll('.hf-chips:not([hidden]) .hf-chip, [data-bx=tell]')].some((e) => !e.hidden && e.offsetParent && /Tell Zuzu/.test(e.textContent)), null, { timeout: 90000, polling: 100 });
    await sleep(500);
  }
  return o;
}
async function tell(o, text) {
  if (SCREEN === 'main') await o.page.evaluate(() => window.__hushfold.openTell());
  else await tapEl(o, '.hf-chips:not([hidden]) .hf-chip, [data-bx=tell]', 'Tell Zuzu');
  await o.page.waitForSelector('.hf-input textarea', { state: 'visible', timeout: 30000 });
  await sleep(350);
  await o.page.fill('.hf-input textarea', text);
  await sleep(700);
  await tapEl(o, '.hf-input .hf-send:not([disabled])');
}
const chips = (o) => o.page.$$eval('.hf-chips:not([hidden]) .hf-chip', (els) => els.filter((e) => e.offsetParent).map((e) => e.textContent.trim()));
const supportPill = (o) => o.page.evaluate(() => [...document.querySelectorAll('.hf-pill.support')].some((e) => !e.hidden && e.offsetParent && getComputedStyle(e).visibility !== 'hidden'));
/** What the stage settles on: the check-in, the usual question, care's or the gentle path's chips. */
async function settle(o) {
  return o.page.waitForFunction(({ cq, mq, aq }) => {
    const said = window.__rpSaid || [];
    const cs = [...document.querySelectorAll('.hf-chips:not([hidden]) .hf-chip')].filter((e) => e.offsetParent).map((e) => e.textContent.trim());
    if (said.includes(cq) && cs.some((c) => /Not really/.test(c))) return 'check';
    if ((said.includes(mq) || said.includes(aq)) && cs.some((c) => /Just be with it/.test(c))) return 'question';
    // (the gentle path's own lines first: Another Angle's gentle chips carry "See support" too)
    if (cs.length && said.some((l) => /nothing to fix here|a lot to carry/i.test(l))) return 'gentle';
    if (cs.some((c) => /See support/.test(c))) return 'care';
    // (the main screen's death care: its own line, the Support pill, and no chip at all — no world offered)
    const lv = window.__hushfold?.S?.level;
    const pill = [...document.querySelectorAll('.hf-pill.support')].some((e) => !e.hidden && e.offsetParent);
    if ((lv === 'care' || lv === 'crisis') && pill && said.length && !cs.length) return 'care';
    if (cs.some((c) => /Stay here quietly|Just squeeze Zuzu/.test(c))) return 'gentle';
    return null;
  }, { cq: CHECK_Q, mq: MAIN_Q, aq: ANGLE_Q }, { timeout: 40000, polling: 150 }).then((h) => h.jsonValue()).catch(() => 'timeout');
}

async function probe(browser, t, want, kind, n) {
  const o = await open(browser);
  const row = { kind, t, want };
  try {
    await tell(o, t);
    row.got = await settle(o);
    row.said = (await o.page.evaluate(() => window.__rpSaid || [])).slice(-4);
    row.chips = await chips(o);
    row.supportPill = await supportPill(o);
    row.requestsBefore = o.req.length;
    if (SCREEN === 'main') row.state = await o.page.evaluate(() => { const S = window.__hushfold?.S || {}; return { level: S.level, category: S.category, deathCare: S.deathCare, supportFirst: S.supportFirst, world: !!window.__hushfold?.flow?.state?.worldId }; });
    const name = `${kind}-${n}`;
    await shot(o, name);
    // the reading
    if (want === 'care' && row.got !== 'care') fail(t, 'care', row);
    if (want === 'check' && row.got !== 'check') fail(t, 'check-in', row);
    if (want === 'gentle' && row.got !== 'gentle') fail(t, 'gentle', row);
    if (want === 'check' && row.got === 'check') {
      if (!row.chips.includes(OKAY) || !row.chips.includes('Not really') || !row.chips.includes('Just be with it')) fail(t, 'chips', row.chips);
      if (!row.supportPill && SCREEN === 'main') fail(t, 'support pill while asking', row);
    }
    if ((want === 'care' || want === 'check') && row.requestsBefore) fail(t, '/v1/ before an answer', o.req);
    // the answers
    if (kind === 'okay' && row.got === 'check') {
      await tapEl(o, '.hf-chips:not([hidden]) .hf-chip', OKAY);
      await sleep(SCREEN === 'main' ? 5000 : 9000);
      row.after = SCREEN === 'main'
        ? await o.page.evaluate(() => ({ thoughts: window.__hushfold?.thoughts?.rects?.().length || 0, world: !!window.__hushfold?.flow?.state?.worldId, route: location.hash, plans: !!document.querySelector('[data-scene=plans], .plans') }))
        : { requests: o.req.map((r) => r.p) };
      if (SCREEN === 'main' && !(row.after.thoughts || row.after.world || /plans/.test(row.after.route) || row.after.plans)) fail(t, 'play goes on', row.after);
      if (SCREEN === 'angle' && SERVER && !row.after.requests.some((p) => /\/v1\/angle/.test(p))) fail(t, 'angle request', row.after);
      await shot(o, `${kind}-after-${n}`);
    }
    if (kind === 'notreally' && row.got === 'check') {
      await tapEl(o, '.hf-chips:not([hidden]) .hf-chip', 'Not really');
      await o.page.waitForFunction((h) => (window.__rpSaid || []).includes(h), HEARD, { timeout: 15000, polling: 100 }).catch(() => null);
      // (the choice follows the line once it has been read)
      await o.page.waitForFunction(() => [...document.querySelectorAll('.hf-chips:not([hidden]) .hf-chip')].some((e) => e.offsetParent && /See support/.test(e.textContent)), null, { timeout: 20000, polling: 150 }).catch(() => null);
      await sleep(600);
      row.after = { said: (await o.page.evaluate(() => window.__rpSaid || [])).slice(-3), chips: await chips(o), requests: o.req.length, supportPill: await supportPill(o) };
      if (SCREEN === 'main') row.after.state = await o.page.evaluate(() => { const S = window.__hushfold?.S || {}; return { level: S.level, supportFirst: S.supportFirst, world: !!window.__hushfold?.flow?.state?.worldId }; });
      if (!row.after.said.includes(HEARD)) fail(t, 'heard line', row.after);
      if (row.after.chips[0] !== 'See support') fail(t, 'See support first', row.after.chips);
      if (row.after.requests) fail(t, 'nothing sent', o.req);
      await shot(o, `${kind}-after-${n}`);
    }
  } catch (e) { fail(t, 'exception', String(e.stack || e)); }
  row.errors = o.errors.slice();
  res.errors.push(...o.errors);
  res.rows.push(row);
  console.log(JSON.stringify({ kind, t, want, got: row.got, chips: row.chips, pill: row.supportPill, req: row.requestsBefore, after: row.after, state: row.state, errors: row.errors.length }));
  await o.ctx.close();
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] });
  try {
    const kinds = KIND === 'all' ? Object.keys(SETS) : KIND.split(',');
    for (const kind of kinds) { let n = 0; for (const [t, want] of SETS[kind]) await probe(browser, t, want, kind, n++); }
  } finally { await browser.close(); }
  fs.writeFileSync(path.join(OUT, `risk-probe-${TAG}.json`), JSON.stringify(res, null, 1));
  console.log(`DONE ${TAG}: ${res.rows.length} rows, ${res.fails.length} fails, ${res.errors.length} console errors`);
  process.exit(res.fails.length || res.errors.length ? 1 : 0);
})();
