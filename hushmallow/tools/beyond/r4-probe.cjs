// Browser probe (final round 4, the check of integ/final-r3: /tmp/claude-0/hf/check-r3.json). Four kinds of Tell, on the main screen
// or in Another Angle, each in a fresh context, every /v1/ request recorded:
//   care      six of the check's eight clause shapes after a death (grief.js selfEnding): care, the Support pill, no question, no
//             world, 0 /v1/ requests
//   held      two of the check's borderline wishes and its sea line (grief.js keepLocal, the safety net): the gentle path, never care;
//             main: the Support pill and no world offered (no "Somewhere calm"); Another Angle with sharing on: 0 /v1/ requests, the
//             authored gentle lines
//   question  three of the speaker's everyday sayings (death-words.js whoDied): the ordinary question, 0 /v1/ requests before it
//   gentle    three ordinary deaths: the gentle path as before (main: "Stay here quietly" / "Somewhere calm"; Another Angle with
//             sharing on: /v1/session and /v1/angle, as before)
//
//   node hushmallow/tools/beyond/r4-probe.cjs <main|angle> W H [server] [kind=care|held|question|gentle|all] [from=N] [count=N]
//        [base=URL] [dev=8790] [out=DIR] [shots=some|none]
//
// main:  offline (no endpoint): serve the repo root on any port and pass base=http://127.0.0.1:<port>/hushmallow/index.html.
// angle: with `server`, ?angleDev=<dev> points it at the mock harness (cd hushmallow/server/another-angle && npm run harness --
//        --serve 8790) and sharing is on; the harness allows only the origin http://localhost:8000 (the default base).
// Playwright from /opt/node-tools; Chromium at /opt/pw-browsers/chromium (never playwright install). Touch through CDP.
const { createRequire } = require('module');
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');

const argv = process.argv.slice(2);
const SCREEN = argv[0] === 'angle' ? 'angle' : 'main', W = +argv[1] || 390, H = +argv[2] || 844, SERVER = argv.includes('server');
const opt = (k, d) => { const a = argv.find((x) => x.startsWith(`${k}=`)); return a ? a.slice(k.length + 1) : d; };
const KIND = opt('kind', 'all'), FROM = +opt('from', 0), COUNT = +opt('count', 99), SHOTS = opt('shots', 'some');
const OUT = opt('out', path.join(os.tmpdir(), 'r4-probe'));
const DEV = opt('dev', '8790');
const BASE = opt('base', 'http://localhost:8000/hushmallow/index.html') + (SCREEN === 'angle' && SERVER ? `?angleDev=${DEV}` : '');
const TAG = `${SCREEN}-${W}x${H}${SERVER ? '-server' : '-offline'}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const res = { screen: SCREEN, W, H, server: SERVER, phrases: [], fails: [], shots: [] };
const fail = (t, k, v) => { res.fails.push({ t, k, v }); console.log('FAIL', t.slice(0, 50), k, JSON.stringify(v ?? '').slice(0, 300)); };
const MAIN_Q = 'Shall we play with this, or just be with it?';
const ANGLE_Q = 'Shall we look at this from another angle, or just be with it?';

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
  await sleep(250);
  const f = path.join(OUT, `r4-${name}-${TAG}.png`); await o.page.screenshot({ path: f }); res.shots.push(f); return f;
}

async function open(browser) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  await ctx.addInitScript(({ server }) => {
    try {
      if (!sessionStorage.getItem('r4:seeded')) {
        sessionStorage.setItem('r4:seeded', '1');
        for (const k of Object.keys(localStorage)) if (/flow|progress|garden/i.test(k)) localStorage.removeItem(k);
        localStorage.setItem('hm2:entitlement', JSON.stringify({ tier: 'paid', source: 'test', since: Date.now() }));
        localStorage.setItem('hm2:beyond.consent', JSON.stringify({ v: 2, choice: server ? 'yes' : 'no', at: '2026-10-14' }));
        localStorage.setItem('hm2:beyond.seen', 'true');
      }
    } catch { /* storage blocked */ }
    window.__r4Said = [];
    new MutationObserver(() => {
      for (const e of document.querySelectorAll('.hf-subs .hf-sub .text, .hf-sublive .hf-sub .text')) {
        const t = (e.textContent || '').trim();
        if (t && !window.__r4Said.slice(-4).includes(t)) window.__r4Said.push(t);
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
    await page.waitForFunction(() => window.__hushfold?.touch?.ready && window.__hushfold?.mallow?.bodyRect?.(), null, { timeout: 60000 });
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
  const at = Date.now();
  await tapEl(o, '.hf-input .hf-send:not([disabled])');
  return at;
}
const chips = (o) => o.page.$$eval('.hf-chips:not([hidden]) .hf-chip', (els) => els.filter((e) => e.offsetParent).map((e) => e.textContent.trim()));
const vis = () => (el) => !!el && !el.hidden && getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).opacity > 0.05 && el.getBoundingClientRect().height > 0;

async function probe(o, t, want) {
  const at = await tell(o, t);
  const Q = SCREEN === 'main' ? MAIN_Q : ANGLE_Q;
  // (a screenshot of the line itself, a moment after it is said, for the first phrase of a kind)
  if (o.early) { await o.page.waitForFunction(() => (window.__r4Said || []).length > 0, null, { timeout: 15000, polling: 100 }).catch(() => null); await sleep(SCREEN === 'main' ? 1800 : 3500); await shot(o, `${want}-line-${FROM}`); }
  // what the stage settles on: the question; the gentle path's chips (main: "Stay here quietly"; Another Angle: "Just squeeze Zuzu");
  // care's choice; or (held, main) a line and nothing offered after it (waited out: careChoice offers nothing at all)
  const got = await o.page.waitForFunction(({ q, screen }) => {
    const said = window.__r4Said || [];
    const cs = [...document.querySelectorAll('.hf-chips:not([hidden]) .hf-chip')].filter((e) => e.offsetParent).map((e) => e.textContent.trim());
    if (said.includes(q) && cs.some((c) => /Just be with it/.test(c))) return 'question';
    if (cs.some((c) => /Stay here quietly|Just squeeze Zuzu|See support/.test(c))) return 'chips';
    return null;
  }, { q: Q, screen: SCREEN }, { timeout: want === 'held' && SCREEN === 'main' ? 16000 : 40000, polling: 100 }).then((h) => h.jsonValue()).catch(() => 'nothing');
  await sleep(1200);
  const st = await o.page.evaluate((screen) => {
    const vis = (el) => !!el && !el.hidden && getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).opacity > 0.05 && el.getBoundingClientRect().height > 0;
    if (screen === 'main') {
      const Hf = window.__hushfold, f = Hf.flow?.state || null;
      return { level: Hf.S.level, category: Hf.S.category, deathCare: !!Hf.S.deathCare, supportFirst: !!Hf.S.supportFirst, asking: !!Hf.S.asking,
        thoughts: (Hf.thoughts?.list || []).filter((x) => !x.leaving).length, world: f && f.phase !== 'finished' ? f.worldId : null,
        supportPill: vis(document.querySelector('.hf-dock .hf-pill.support')) };
    }
    const A = window.__angle;
    return { phase: A.S.phase, level: A.S.level, category: A.S.category, follow: !!A.S.follow, suicide: !!A.S.suicide, grief: !!A.S.grief, held: !!A.S.held,
      mech: A.mechId || null, thought: !!A.thought, server: A.serverMode(), supportPill: !document.querySelector('.bx-dock .hf-pill.support')?.hidden };
  }, SCREEN);
  const said = await o.page.evaluate(() => window.__r4Said || []);
  const ch = await chips(o);
  const reqs = o.req.filter((q) => q.at >= at).map((q) => q.p);
  const r = { t, want, got, ...st, said: said.slice(-6), chips: ch, requests: reqs };
  const care = st.level === 'care' || st.level === 'crisis';
  // (Another Angle: while its choice is up, "See support" carries support and the dock's pill steps aside, review r9)
  st.supportPill = st.supportPill || ch.includes('See support');
  const worldChip = ch.some((c) => /calm|Play|storm/i.test(c));
  if (SCREEN === 'angle' && SERVER && !st.server) fail(t, 'sharing is not on', st);
  if (want === 'care') {
    if (!care) fail(t, 'not care', st);
    if (SCREEN === 'main' && st.level === 'care' && !st.deathCare) fail(t, 'no deathCare flag', st);
    if (said.includes(Q) || st.asking) fail(t, 'asked the question', said);
    if (st.thoughts || st.world || st.mech || st.thought) fail(t, 'something made or played', st);
    if (!st.supportPill) fail(t, 'no Support pill', st);
    if (worldChip) fail(t, 'a world offered', ch);
    if (reqs.length) fail(t, '/v1/ requests', reqs);
  } else if (want === 'held') {
    if (care) fail(t, 'care (the net is never care)', st);
    if (said.includes(Q) || st.asking) fail(t, 'asked the question', said);
    if (!st.supportPill) fail(t, 'no Support pill', st);
    if (worldChip) fail(t, 'a world offered (Somewhere calm)', ch);
    if (reqs.length) fail(t, '/v1/ requests', reqs);
    if (SCREEN === 'main' && (st.level !== 'concern' || !st.supportFirst)) fail(t, 'not the gentle path held', st);
    if (SCREEN === 'angle' && (!st.grief || (SERVER && !st.held))) fail(t, 'not the gentle path held', st);
  } else if (want === 'question') {
    if (got !== 'question') fail(t, 'not the question', { got, said });
    if (care || (SCREEN === 'main' ? st.level !== 'none' : st.grief)) fail(t, 'a loss read', st);
    if (reqs.length) fail(t, '/v1/ requests before the answer', reqs);
  } else if (want === 'gentle') {
    if (care) fail(t, 'care on an ordinary death', st);
    if (got !== 'chips') fail(t, 'no gentle chips', { got, ch });
    if (SCREEN === 'main' && (st.level !== 'concern' || st.supportFirst)) fail(t, 'not the ordinary gentle path', st);
    if (SCREEN === 'angle' && SERVER && JSON.stringify(reqs) !== JSON.stringify(['/v1/session', '/v1/angle'])) fail(t, 'not sent as before', reqs);
    if (SCREEN === 'angle' && SERVER && st.held) fail(t, 'held', st);
  }
  return r;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const P = await import(path.join(__dirname, '../../tests/probes/r4.mjs'));
  const E = P.CHECK_ESC;
  // six shapes: a conditional absence, asking to die, an act, where he went, the ground, a typo
  const sets = {
    care: [E.absent[0], E.asking[0], E.act[0], E.where[0], E.where[7], E.typo[3]],
    held: [P.CHECK_BORDERLINE[1], P.CHECK_BORDERLINE[0], P.CHECK_SEA[0]],
    question: [P.CHECK_IDIOMS[0], P.CHECK_IDIOMS[12], P.CHECK_IDIOMS[13]],
    gentle: P.ORDINARY_DEATHS,
  };
  const list = Object.entries(sets).filter(([k]) => KIND === 'all' || k === KIND).flatMap(([k, ts]) => ts.map((t) => [t, k])).slice(FROM, FROM + COUNT);
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] });
  const shotDone = new Set();
  try {
    for (const [t, want] of list) {
      const o = await open(browser);
      if (SHOTS !== 'none' && !shotDone.has(`${want}-line`)) { shotDone.add(`${want}-line`); o.early = true; }
      try {
        const r = await probe(o, t, want);
        r.errors = o.errors;
        if (o.errors.length) fail(t, 'console errors', o.errors);
        res.phrases.push(r);
        console.log(SCREEN, want.padEnd(8), r.got.padEnd(8), r.level, r.category || '', `held=${r.supportFirst ?? r.held}`, `req=${JSON.stringify(r.requests)}`, `chips=${JSON.stringify(r.chips)}`, t.slice(0, 60));
        if (SHOTS !== 'none' && !shotDone.has(want)) { shotDone.add(want); await shot(o, `${want}-${FROM}`); }
      } catch (e) { fail(t, 'error', String(e.message || e).split('\n')[0]); }
      await o.ctx.close();
    }
  } finally { await browser.close(); }
  const by = (k) => res.phrases.filter((r) => r.want === k);
  res.summary = { screen: SCREEN, W, H, server: SERVER,
    care: `${by('care').filter((r) => ['care', 'crisis'].includes(r.level)).length}/${by('care').length}`, careRequests: by('care').reduce((a, r) => a + r.requests.length, 0),
    held: `${by('held').filter((r) => !['care', 'crisis'].includes(r.level) && !r.chips.some((c) => /calm/i.test(c))).length}/${by('held').length}`, heldRequests: by('held').reduce((a, r) => a + r.requests.length, 0),
    question: `${by('question').filter((r) => r.got === 'question').length}/${by('question').length}`, questionRequests: by('question').reduce((a, r) => a + r.requests.length, 0),
    gentle: `${by('gentle').filter((r) => r.got === 'chips').length}/${by('gentle').length}`, gentleRequests: by('gentle').map((r) => r.requests.length),
    consoleErrors: res.phrases.reduce((a, r) => a + r.errors.length, 0), fails: res.fails.length };
  fs.writeFileSync(path.join(OUT, `r4-result-${TAG}-${KIND}-${FROM}.json`), JSON.stringify(res, null, 1));
  console.log('RESULT', JSON.stringify(res.summary), JSON.stringify(res.fails).slice(0, 1500));
  process.exit(res.fails.length ? 1 : 0);
})();
