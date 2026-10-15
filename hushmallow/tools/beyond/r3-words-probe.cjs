// Browser probe (final round 3, check-final.json blocking item 2): the weak death words count only when a person or a pet died.
// Six of the check's nine ordinary Tells get the one question, four deaths of a person or a pet the gentle path with no
// question, on the main screen or in Another Angle (offline: no endpoint, nothing can be sent).
//
//   node hushmallow/tools/beyond/r3-words-probe.cjs <main|angle> W H [base=http://127.0.0.1:8273] [out=DIR] [shots=some|none]
//
// The repo root must be served at `base` (python3 -m http.server <port> from it). One fresh context per phrasing. Prints
// "RESULT {...}" and writes two screenshots (a question and a gentle path). Playwright from /opt/node-tools; Chromium at
// /opt/pw-browsers/chromium (never playwright install). Touch through CDP Input.dispatchTouchEvent.
const { createRequire } = require('module');
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');

const argv = process.argv.slice(2);
const SCREEN = argv[0] === 'angle' ? 'angle' : 'main', W = +argv[1] || 390, H = +argv[2] || 844;
const opt = (k, d) => { const a = argv.find((x) => x.startsWith(`${k}=`)); return a ? a.slice(k.length + 1) : d; };
const BASE = `${opt('base', 'http://127.0.0.1:8273')}/hushmallow/index.html`;
const OUT = opt('out', path.join(os.tmpdir(), 'r3-words-probe'));
const SHOTS = opt('shots', 'some');
const TAG = `${SCREEN}-${W}x${H}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Six of the check's nine (verbatim) → the question; four deaths of a person or a pet → gentle. */
const PHRASES = [
  ['the plant on my desk died because I forgot to water it', 'question'],
  ['that joke totally killed at the open mic', 'question'],
  ['the traffic killed me this morning, I was an hour late', 'question'],
  ['I buried myself in work to avoid thinking about the fight', 'question'],
  ['the cemetery near my flat has the best autumn trees for walking', 'question'],
  ['my motivation is dead this week', 'question'],
  ['Pepper died this morning and the house feels empty', 'gentle'],
  ['The coach who taught me to swim died', 'gentle'],
  ['We buried Biscuit in the garden last night', 'gentle'],
  ['My neighbour, who used to bring us cakes, died in the night', 'gentle'],
];
const MAIN_Q = 'Shall we play with this, or just be with it?';
const ANGLE_Q = 'Shall we look at this from another angle, or just be with it?';
const res = { screen: SCREEN, W, H, runs: [], fails: [], shots: [] };
const fail = (t, k, v) => { res.fails.push({ t, k, v }); console.log('FAIL', t, k, JSON.stringify(v ?? '').slice(0, 300)); };

let tid = 30;
const touch = (cdp, type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
async function tap(o, x, y) { const id = ++tid; await touch(o.cdp, 'touchStart', [{ x, y, id, radiusX: 8, radiusY: 8, force: 1 }]); await sleep(70); await touch(o.cdp, 'touchEnd', []); }
async function tapEl(o, sel, text = null, timeout = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const r = await o.page.evaluate(({ sel, text }) => { const e = [...document.querySelectorAll(sel)].find((x) => !x.hidden && x.offsetParent && (!text || x.textContent.includes(text)) && !x.disabled); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }, { sel, text });
    if (r) { await tap(o, r.x, r.y); return true; }
    await sleep(150);
  }
  throw new Error(`no ${sel} ${text || ''}`);
}
const chips = (o) => o.page.$$eval('.hf-chips:not([hidden]) .hf-chip', (els) => els.filter((e) => e.offsetParent).map((e) => e.textContent.trim()));
const lines = (o) => o.page.evaluate(() => window.__r3Said || []);
async function shot(o, name) {
  if (SHOTS === 'none') return;
  await o.page.evaluate(() => Promise.race([new Promise((r) => setTimeout(r, 2000)), Promise.all(document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.target?.closest?.('.hf-sublive, .hf-chips, .hf-subs')).map((a) => a.finished.catch(() => null)))])).catch(() => null);
  await sleep(250);
  const f = path.join(OUT, `r3w-${TAG}-${name}.png`); await o.page.screenshot({ path: f }); res.shots.push(f);
}

async function open(browser) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  await ctx.addInitScript(() => {
    try {
      if (!sessionStorage.getItem('r3:seeded')) {
        sessionStorage.setItem('r3:seeded', '1');
        for (const k of Object.keys(localStorage)) if (/flow|progress|garden/i.test(k)) localStorage.removeItem(k);
        localStorage.setItem('hm2:entitlement', JSON.stringify({ tier: 'paid', source: 'test', since: Date.now() }));
        // (Another Angle offline: the notice answered "Not now", so nothing can be sent)
        localStorage.setItem('hm2:beyond.consent', JSON.stringify({ v: 2, choice: 'no', at: '2026-10-14' }));
        localStorage.setItem('hm2:beyond.seen', 'true');
      }
    } catch { /* storage blocked */ }
    window.__r3Said = [];
    new MutationObserver(() => {
      for (const e of document.querySelectorAll('.hf-sub .text, .hf-sublive .hf-sub')) {
        const t = (e.textContent || '').trim();
        if (t && !window.__r3Said.slice(-4).includes(t)) window.__r3Said.push(t);
      }
    }).observe(document, { subtree: true, childList: true, characterData: true });
  });
  const page = await ctx.newPage();
  const o = { ctx, page, cdp: null, errors: [], req: [] };
  page.on('pageerror', (e) => o.errors.push(String(e.message || e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text())) o.errors.push(m.text()); });
  page.on('response', (r) => { if (r.status() >= 400 && !/favicon/.test(r.url())) o.errors.push(`${r.status()} ${r.url()}`); });
  page.on('request', (r) => { if (/\/v1\//.test(r.url())) o.req.push(r.url()); });
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  o.cdp = await ctx.newCDPSession(page);
  if (SCREEN === 'main') {
    await page.waitForFunction(() => window.__hushfold?.touch?.ready && window.__hushfold?.mallow?.bodyRect?.(), null, { timeout: 60000 });
  } else {
    await page.waitForFunction(() => window.__hush && window.__hush.world && window.__hushfold, null, { timeout: 120000 });
    await page.evaluate(async () => { if (!window.__hush.ent.has('ultra')) await window.__hush.ent.purchase('ultra'); });
    await page.evaluate(() => window.__hush.go('angle'));
    await page.waitForFunction(() => window.__angle && window.__angle.zuzu, null, { timeout: 120000 });
    await page.waitForFunction(() => [...document.querySelectorAll('.hf-chips:not([hidden]) .hf-chip, [data-bx=tell]')].some((e) => !e.hidden && e.offsetParent && /Tell Zuzu/.test(e.textContent)), null, { timeout: 90000, polling: 100 });
  }
  await sleep(600);
  return o;
}

async function tellAndRead(o, text) {
  if (SCREEN === 'main') await o.page.evaluate(() => window.__hushfold.openTell());
  else await tapEl(o, '.hf-chips:not([hidden]) .hf-chip, [data-bx=tell]', 'Tell Zuzu');
  await o.page.waitForSelector('.hf-input textarea', { state: 'visible', timeout: 30000 });
  await o.page.fill('.hf-input textarea', text);
  await sleep(700);
  await tapEl(o, '.hf-input .hf-send');
  const Q = SCREEN === 'main' ? MAIN_Q : ANGLE_Q;
  // the question (its line and its two chips), or the gentle path (main: "Stay here quietly"; Another Angle: "Just squeeze Zuzu")
  const got = await o.page.waitForFunction((q) => {
    const said = window.__r3Said || [];
    const cs = [...document.querySelectorAll('.hf-chips:not([hidden]) .hf-chip')].filter((e) => e.offsetParent).map((e) => e.textContent.trim());
    if (said.includes(q) && cs.some((c) => /Just be with it/.test(c))) return 'question';
    if (cs.some((c) => /Stay here quietly|Just squeeze Zuzu/.test(c))) return 'gentle';
    return null;
  }, Q, { timeout: 40000, polling: 100 }).then((h) => h.jsonValue()).catch(() => 'nothing');
  await sleep(900);
  const st = await o.page.evaluate((screen) => {
    if (screen === 'main') { const Hf = window.__hushfold; return { level: Hf.S.level, asking: !!Hf.S.asking, thoughts: (Hf.thoughts?.list || []).filter((t) => !t.leaving).length, world: Hf.flow?.state && Hf.flow.state.phase !== 'finished' ? Hf.flow.state.worldId : null }; }
    const A = window.__angle; return { phase: A.S.phase, grief: !!A.S.grief, level: A.S.level, mech: A.mechId || null, thought: !!A.thought };
  }, SCREEN);
  return { got, st, chips: await chips(o), lines: (await lines(o)).slice(-3) };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] });
  let shotQ = false, shotG = false;
  try {
    for (const [text, want] of PHRASES) {
      const o = await open(browser);
      try {
        const r = await tellAndRead(o, text);
        r.text = text; r.want = want; r.requests = o.req.length; r.errors = o.errors;
        res.runs.push(r);
        if (r.got !== want) fail(text, `want ${want}`, r);
        // nothing made or played before an answer; a death never asked and never a game
        if (SCREEN === 'main' && (r.st.thoughts || r.st.world)) fail(text, 'something made', r.st);
        if (SCREEN === 'angle' && (r.st.mech || r.st.thought)) fail(text, 'something made', r.st);
        if (want === 'question' && (SCREEN === 'main' ? r.st.level !== 'none' : r.st.grief)) fail(text, 'a loss read', r.st);
        if (want === 'gentle' && (SCREEN === 'main' ? r.st.level !== 'concern' : !r.st.grief)) fail(text, 'not gentle', r.st);
        if (r.requests) fail(text, 'requests offline', o.req);
        if (o.errors.length) fail(text, 'console errors', o.errors);
        if (r.got === 'question' && !shotQ && text.startsWith('the plant')) { shotQ = true; await shot(o, 'question-plant'); }
        if (r.got === 'gentle' && !shotG && text.startsWith('The coach')) { shotG = true; await shot(o, 'gentle-coach'); }
      } catch (e) { fail(text, 'error', String(e.message || e).split('\n')[0]); }
      await o.ctx.close();
    }
  } finally { await browser.close(); }
  res.counts = res.runs.reduce((c, r) => { c[`${r.want}->${r.got}`] = (c[`${r.want}->${r.got}`] || 0) + 1; return c; }, {});
  fs.writeFileSync(path.join(OUT, `r3w-${TAG}.json`), JSON.stringify(res, null, 1));
  console.log('RESULT', JSON.stringify({ screen: SCREEN, W, H, counts: res.counts, fails: res.fails, shots: res.shots }));
  process.exit(res.fails.length ? 1 : 0);
})();
