// Browser probe (final round 3, unit ESCALATION): a suicide named, or a death and the self ending, is care on both screens —
// the gentle care lines, the Support pill, no question, no world, no "Somewhere calm", no Thought Mallow, and 0 /v1/ requests.
//
//   node hushmallow/tools/beyond/r3-esc-probe.cjs <main|angle> W H [server] [set=pos|neg|all] [from=N] [count=N] [lineAt=N] [base=URL] [dev=8790] [out=DIR]
//   (lineAt: a screenshot of the line itself, a moment after Send, for the Nth phrase of the run)
//
// main:  the main screen (offline: no endpoint). Serve the repo root and pass base=http://127.0.0.1:<port>/hushmallow/index.html.
// angle: Another Angle. With `server`, ?angleDev=<dev> points it at the mock harness (cd hushmallow/server/another-angle && npm run
//        harness -- --serve 8790) and sharing is on (consent yes); the harness only allows the origin http://localhost:8000.
// The phrasings: 8 of the check's verbatim misses and 4 of this unit's own (pos), 3 negatives (neg), from tests/probes/r3-esc.mjs.
// Each phrase in a fresh context. Every /v1/ request is recorded. Prints "RESULT {...}" and writes a few screenshots to out.
// Playwright from /opt/node-tools; Chromium at /opt/pw-browsers/chromium (never playwright install). Touch via CDP.
const { createRequire } = require('module');
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');

const argv = process.argv.slice(2);
const SCREEN = argv[0] || 'main', W = +argv[1] || 390, H = +argv[2] || 844, SERVER = argv.includes('server');
const opt = (k, d) => { const a = argv.find((x) => x.startsWith(`${k}=`)); return a ? a.slice(k.length + 1) : d; };
const SET = opt('set', 'all'), FROM = +opt('from', 0), COUNT = +opt('count', 99);
const OUT = opt('out', path.join(os.tmpdir(), 'r3-esc-probe'));
const DEV = opt('dev', '8790');
const BASE = opt('base', 'http://localhost:8000/hushmallow/index.html') + (SCREEN === 'angle' && SERVER ? `?angleDev=${DEV}` : '');
const TAG = `${SCREEN}-${W}x${H}${SERVER ? '-server' : '-offline'}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const res = { screen: SCREEN, W, H, server: SERVER, phrases: [], fails: [] };
const fail = (t, k, v) => { res.fails.push({ t, k, v }); console.log('FAIL', t.slice(0, 50), k, JSON.stringify(v ?? '').slice(0, 300)); };
const MAIN_Q = 'Shall we play with this, or just be with it?';
const ANGLE_Q = 'Shall we look at this from another angle, or just be with it?';

let tid = 30;
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
  const f = path.join(OUT, `r3esc-${name}-${TAG}.png`); await o.page.screenshot({ path: f }); res.shots = [...(res.shots || []), f]; return f;
}

async function open(browser) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  await ctx.addInitScript(({ server }) => {
    try {
      if (!sessionStorage.getItem('r3:seeded')) {
        sessionStorage.setItem('r3:seeded', '1');
        for (const k of Object.keys(localStorage)) if (/flow|progress|garden/i.test(k)) localStorage.removeItem(k);
        localStorage.setItem('hm2:entitlement', JSON.stringify({ tier: 'paid', source: 'test', since: Date.now() }));
        localStorage.setItem('hm2:beyond.consent', JSON.stringify({ v: 2, choice: server ? 'yes' : 'no', at: '2026-10-14' }));
        localStorage.setItem('hm2:beyond.seen', 'true');
      }
    } catch { /* storage blocked */ }
    // every line the subtitles show, in order
    window.__r3Said = [];
    new MutationObserver(() => {
      for (const e of document.querySelectorAll('.hf-subs .hf-sub .text, .hf-sublive .hf-sub .text')) {
        const t = (e.textContent || '').trim();
        if (t && !window.__r3Said.slice(-4).includes(t)) window.__r3Said.push(t);
      }
    }).observe(document, { subtree: true, childList: true, characterData: true });
  }, { server: SERVER });
  const page = await ctx.newPage();
  const o = { ctx, page, cdp: null, req: [], errors: [] };
  page.on('request', (r) => { if (/\/v1\//.test(r.url())) o.req.push({ m: r.method(), p: r.url().replace(/^https?:\/\/[^/]+/, ''), at: Date.now() }); });
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

async function tellMain(o, text) {
  await o.page.evaluate(() => window.__hushfold.openTell());
  await o.page.waitForSelector('.hf-input textarea', { state: 'visible', timeout: 10000 });
  await o.page.fill('.hf-input textarea', text);
  await sleep(700);
  const at = Date.now();
  await tapEl(o, '.hf-input .hf-send:not([disabled])');
  return at;
}
async function tellAngle(o, text) {
  await tapEl(o, '.hf-chips:not([hidden]) .hf-chip, [data-bx=tell]', 'Tell Zuzu');
  await o.page.waitForSelector('.hf-input textarea', { timeout: 30000 });
  await sleep(350);
  await o.page.fill('.hf-input textarea', text);
  await sleep(700);
  const at = Date.now();
  await tapEl(o, '.hf-input .hf-send');
  return at;
}
const chips = (o) => o.page.$$eval('.hf-chips:not([hidden]) .hf-chip', (els) => els.filter((e) => e.offsetParent).map((e) => e.textContent.trim()));

async function probeMain(o, t, care) {
  const at = await tellMain(o, t);
  // the line (care: support; not care: the gentle path or the question)
  await o.page.waitForFunction(() => (window.__r3Said || []).length > 0, null, { timeout: 15000, polling: 100 }).catch(() => null);
  // (the line as a person reads it: once, for the phrase named by shotAt)
  if (o.lineShot) { await sleep(1200); await shot(o, o.lineShot); await sleep(3800); } else await sleep(5500);
  const st = await o.page.evaluate(() => {
    const Hf = window.__hushfold, f = Hf.flow?.state || null;
    const vis = (el) => !!el && !el.hidden && getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).opacity > 0.05 && el.getBoundingClientRect().height > 0;
    return { level: Hf.S.level, category: Hf.S.category, deathCare: !!Hf.S.deathCare, asking: !!Hf.S.asking, thoughts: (Hf.thoughts?.list || []).filter((x) => !x.leaving).length,
      world: f && f.phase !== 'finished' ? f.worldId : null, supportPill: vis(document.querySelector('.hf-dock .hf-pill.support')), face: Hf.touch?.rig?.stage || null };
  });
  const said = await o.page.evaluate(() => window.__r3Said || []);
  const ch = await chips(o);
  const reqs = o.req.filter((q) => q.at >= at).map((q) => q.p);
  const r = { t, care, ...st, said, chips: ch, requests: reqs };
  if (care) {
    if (!['care', 'crisis'].includes(st.level)) fail(t, 'not care', st);
    if (st.level === 'care' && !st.deathCare) fail(t, 'no deathCare flag', st);
    if (said.includes(MAIN_Q) || st.asking) fail(t, 'asked the question', said);
    if (st.thoughts || st.world) fail(t, 'something made or played', st);
    if (!st.supportPill) fail(t, 'no Support pill', st);
    if (ch.some((c) => /calm|Stay here quietly|Play/.test(c))) fail(t, 'a world offered', ch);
    if (st.level === 'care' && !said.some((l) => /a lot to carry|isn’t yours to fix alone/.test(l))) fail(t, 'no care line', said);
  } else if (['care', 'crisis'].includes(st.level)) fail(t, 'care on a negative', st);
  if (reqs.length) fail(t, '/v1/ requests', reqs);
  return r;
}
async function probeAngle(o, t, care) {
  const at = await tellAngle(o, t);
  await o.page.waitForFunction(() => (window.__r3Said || []).length > 0 && ['support', 'asking', 'invite', 'squeeze'].includes(window.__angle?.S?.phase), null, { timeout: 25000, polling: 100 }).catch(() => null);
  if (o.lineShot) { await sleep(2500); await shot(o, o.lineShot); await sleep(care ? 3000 : 6000); } else await sleep(care ? 6000 : 9000);
  const st = await o.page.evaluate(() => { const A = window.__angle; return { phase: A.S.phase, level: A.S.level, category: A.S.category, follow: !!A.S.follow, suicide: !!A.S.suicide, grief: !!A.S.grief, mech: A.mechId || null, thought: !!A.thought, server: A.serverMode(), supportPill: !document.querySelector('.bx-dock .hf-pill.support')?.hidden }; });
  const said = await o.page.evaluate(() => window.__r3Said || []);
  const reqs = o.req.filter((q) => q.at >= at).map((q) => q.p);
  const r = { t, care, ...st, said: said.slice(-5), chips: await chips(o), requests: reqs };
  if (SERVER && !st.server) fail(t, 'sharing is not on', st);
  if (care) {
    if (st.level !== 'care' && st.level !== 'crisis') fail(t, 'not care', st);
    if (said.includes(ANGLE_Q)) fail(t, 'asked the question', said);
    if (st.mech || st.thought) fail(t, 'a mechanic or a Thought Mallow', st);
    if (!st.supportPill) fail(t, 'no Support pill', st);
    if (reqs.length) fail(t, '/v1/ requests', reqs);
    if (st.level === 'care' && !said.some((l) => /a lot to carry|glad you told me/.test(l))) fail(t, 'no care line', said);
  } else if (st.level === 'care' || st.level === 'crisis') fail(t, 'care on a negative', st);
  return r;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const P = await import(path.join(__dirname, '../../tests/probes/r3-esc.mjs'));
  // 8 of the check's misses (both screens' and main-only), 4 of this unit's own, 3 negatives
  const pos = [...P.CHECK_MISSES.filter((_, i) => [0, 1, 2, 3, 4, 6, 9, 11].includes(i)), P.OWN_SUICIDE[0], P.OWN_SUICIDE[11], P.OWN_FOLLOW[1], P.OWN_FOLLOW[7]];
  const neg = [P.OWN_NEG[5], P.OWN_NEG[6], P.OWN_NEG[13]];
  const list = [...(SET !== 'neg' ? pos.map((t) => [t, true]) : []), ...(SET !== 'pos' ? neg.map((t) => [t, false]) : [])].slice(FROM, FROM + COUNT);
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] });
  try {
    let n = 0;
    for (const [t, care] of list) {
      const o = await open(browser);
      if (opt('lineAt', '') !== '' && n === +opt('lineAt', '-1')) o.lineShot = `line-${n}`;
      try {
        const r = SCREEN === 'main' ? await probeMain(o, t, care) : await probeAngle(o, t, care);
        r.errors = o.errors;
        if (o.errors.length) fail(t, 'console errors', o.errors);
        res.phrases.push(r);
        console.log(SCREEN, care ? 'POS' : 'NEG', r.level, r.category || '', `req=${r.requests.length}`, t.slice(0, 70));
        // a few screenshots: the first care, the first negative
        if ((n === 0 && care) || (!care && !res.negShot)) { await shot(o, `${care ? 'care' : 'neg'}-${n}`); if (!care) res.negShot = true; }
      } catch (e) { fail(t, 'error', String(e.message || e).split('\n')[0]); }
      await o.ctx.close();
      n++;
    }
  } finally { await browser.close(); }
  const summary = { screen: SCREEN, W, H, server: SERVER, pos: res.phrases.filter((r) => r.care).length, posCare: res.phrases.filter((r) => r.care && ['care', 'crisis'].includes(r.level)).length, neg: res.phrases.filter((r) => !r.care).length, negCare: res.phrases.filter((r) => !r.care && ['care', 'crisis'].includes(r.level)).length, requestsOnCare: res.phrases.filter((r) => r.care).reduce((a, r) => a + r.requests.length, 0), fails: res.fails.length };
  res.summary = summary;
  fs.writeFileSync(path.join(OUT, `r3esc-result-${TAG}-${FROM}.json`), JSON.stringify(res, null, 1));
  console.log('RESULT', JSON.stringify(summary), JSON.stringify(res.fails).slice(0, 1500));
  process.exit(res.fails.length ? 1 : 0);
})();
