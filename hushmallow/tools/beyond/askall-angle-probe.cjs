// Browser probe (owner decision 'Ask before every world', 14 Oct 2026): Another Angle asks "Shall we look at this from another
// angle, or just be with it?" after every Tell that is not a detected loss, crisis or care, before anything is sent or played.
//
//   node hushmallow/tools/beyond/askall-angle-probe.cjs W H [server] [scen=angle,be,death,care,match] [out=DIR] [base=URL] [dev=8790]
//
// The repo root must be served on http://localhost:8000 (the Another Angle mock harness only allows that origin):
//   python3 -m http.server 8000      (from the repo root)
// With `server`, ?angleDev=<dev> points the app at the mock harness (cd hushmallow/server/another-angle && npm run harness --
// --serve 8790) and sharing is on (consent yes); without it no endpoint is configured (Zuzu's own angles, nothing can be sent).
// Every /v1/ request is recorded (method, path, when). Scenarios, each in a fresh context:
//   angle  'I am worried about my exam tomorrow' → the question (no thought, no mechanic, no waiting line, no request) →
//          Another angle → a mechanic
//   be     'we had to let our dog go, I think it was my fault' → the question → Just be with it → the gentle lines, nothing sent;
//          then Tell Zuzu (opens empty) → the same words again → the gentle path, no question, still nothing sent
//   death  'my mum died last week' → the gentle path with no question
//   care   'my best friend killed himself and I keep thinking about doing the same' → care, no question, 0 requests
//   match  'my dad never came to my football match' → the ordinary question (never the gentle path) → Another angle → a mechanic
// Prints "RESULT {...}" and writes a few screenshots to out. Playwright from /opt/node-tools; Chromium at /opt/pw-browsers/chromium
// (never playwright install). Touch through CDP Input.dispatchTouchEvent.
const { createRequire } = require('module');
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');

const argv = process.argv.slice(2);
const W = +argv[0] || 390, H = +argv[1] || 844, SERVER = argv.includes('server');
const opt = (k, d) => { const a = argv.find((x) => x.startsWith(`${k}=`)); return a ? a.slice(k.length + 1) : d; };
const SCENS = opt('scen', 'angle,be,death,care,match').split(',');
const OUT = opt('out', path.join(os.tmpdir(), 'askall-angle'));
const DEV = opt('dev', '8790');
const BASE = opt('base', 'http://localhost:8000/hushmallow/index.html') + (SERVER ? `?angleDev=${DEV}` : '');
const SHOTS = opt('shots', 'some');   // some | none
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const res = { W, H, server: SERVER, scen: {}, fails: [] };
const fail = (s, k, v) => { res.fails.push({ s, k, v }); console.log('FAIL', s, k, JSON.stringify(v ?? '').slice(0, 300)); };
const TAG = `${W}x${H}${SERVER ? '-server' : '-offline'}`;
const ASK = 'Shall we look at this from another angle, or just be with it?';

let tid = 20;
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
const chipTexts = (o) => o.page.$$eval('.hf-chips:not([hidden]) .hf-chip', (els) => els.filter((e) => e.offsetParent).map((e) => e.textContent.trim()));
const said = (o) => o.page.evaluate(() => window.__aaSaid || []);
async function waitFor(o, fn, arg, timeout = 30000) { return o.page.waitForFunction(fn, arg, { timeout, polling: 100 }); }
const state = (o) => o.page.evaluate(() => { const A = window.__angle; return { phase: A.S.phase, grief: !!A.S.grief, level: A.S.level, follow: !!A.S.follow, mech: A.mechId || null, thought: !!A.thought, answers: [...A.S.answers.entries()], lastGentle: A.S.lastGentle, server: A.serverMode() }; });
async function shot(o, name) {
  if (SHOTS === 'none') return null;
  // (the subtitles' soft reveal finished, so the picture shows what a person reads)
  await o.page.evaluate(() => Promise.race([new Promise((r) => setTimeout(r, 2500)), Promise.all(document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.target?.closest?.('.hf-sublive, .hf-chips')).map((a) => a.finished.catch(() => null)))])).catch(() => null);
  await sleep(250);
  const f = path.join(OUT, `aa-${name}-${TAG}.png`); await o.page.screenshot({ path: f }); res.shots = [...(res.shots || []), f]; return f; }

async function open() {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  await ctx.addInitScript(({ server }) => {
    try {
      if (!sessionStorage.getItem('aa:seeded')) {
        sessionStorage.setItem('aa:seeded', '1');
        localStorage.setItem('hm2:entitlement', JSON.stringify({ tier: 'paid', source: 'test', since: Date.now() }));
        // (the notice is at version 2: sharing on with the mock harness, "Not now" offline)
        localStorage.setItem('hm2:beyond.consent', JSON.stringify({ v: 2, choice: server ? 'yes' : 'no', at: '2026-10-14' }));
        localStorage.setItem('hm2:beyond.seen', 'true');
      }
    } catch { /* storage blocked */ }
    // every line the subtitles show, in order (read from the live region)
    window.__aaSaid = [];
    new MutationObserver(() => {
      for (const e of document.querySelectorAll('.hf-sublive .hf-sub .text, .hf-sublive .hf-sub')) {
        const t = (e.textContent || '').trim();
        if (t && window.__aaSaid[window.__aaSaid.length - 1] !== t && !window.__aaSaid.slice(-3).includes(t)) window.__aaSaid.push(t);
      }
    }).observe(document, { subtree: true, childList: true, characterData: true });
  }, { server: SERVER });
  const page = await ctx.newPage();
  const o = { ctx, page, cdp: null, req: [], errors: [], t0: Date.now() };
  page.on('request', (r) => { if (/\/v1\//.test(r.url())) o.req.push({ m: r.method(), p: r.url().replace(/^https?:\/\/[^/]+/, ''), at: Date.now() }); });
  page.on('pageerror', (e) => o.errors.push(String(e.message || e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) o.errors.push(m.text()); });
  await page.goto(BASE);
  await page.waitForFunction(() => window.__hush && window.__hush.world && window.__hushfold, null, { timeout: 120000 });
  await page.evaluate(async () => { if (!window.__hush.ent.has('ultra')) await window.__hush.ent.purchase('ultra'); });
  o.cdp = await ctx.newCDPSession(page);
  await page.evaluate(() => window.__hush.go('angle'));
  await page.waitForFunction(() => window.__angle && window.__angle.zuzu, null, { timeout: 120000 });
  await waitFor(o, () => [...document.querySelectorAll('.hf-chips:not([hidden]) .hf-chip, [data-bx=tell]')].some((e) => !e.hidden && e.offsetParent && /Tell Zuzu/.test(e.textContent)), null, 90000);
  await sleep(500);
  return o;
}
async function tell(o, text, { expectEmpty = null } = {}) {
  await tapEl(o, '.hf-chips:not([hidden]) .hf-chip, [data-bx=tell]', 'Tell Zuzu');
  await o.page.waitForSelector('.hf-input textarea', { timeout: 30000 });
  await sleep(350);
  const before = await o.page.$eval('.hf-input textarea', (t) => t.value);
  if (expectEmpty !== null && (before === '') !== expectEmpty) fail(o.scen, 'tell prefill', { before });
  await o.page.fill('.hf-input textarea', text);
  await sleep(700);
  const sentAt = Date.now();
  await tapEl(o, '.hf-input .hf-send');
  return { before, sentAt };
}
/** The question, within a few seconds of Send: its two chips, nothing made, played or sent. */
async function seeQuestion(o, sentAt, name) {
  await waitFor(o, (ask) => (window.__aaSaid || []).includes(ask) || [...document.querySelectorAll('.hf-sub')].some((e) => e.textContent.includes(ask)), ASK, 15000);
  await waitFor(o, () => [...document.querySelectorAll('.hf-chips:not([hidden]) .hf-chip')].some((e) => e.offsetParent && /Just be with it/.test(e.textContent)), null, 15000);
  const ms = Date.now() - sentAt;
  // (the chips rise into place: a person's tap comes after they settle)
  await sleep(700);
  const chips = await o.page.$$eval('.hf-chips:not([hidden]) .hf-chip', (els) => els.filter((e) => e.offsetParent).map((e) => { const b = e.getBoundingClientRect(); return { t: e.textContent.trim(), w: Math.round(b.width), h: Math.round(b.height), primary: e.classList.contains('primary'), tag: e.tagName }; }));
  const st = await state(o);
  const lines = await said(o);
  const r = { ms, chips, phase: st.phase, thought: st.thought, mech: st.mech, requests: o.req.filter((q) => q.at >= sentAt).length, waiting: lines.filter((l) => /another side to this|look a little closer|What else could be true/.test(l)) };
  if (st.phase !== 'asking' || st.thought || st.mech) fail(o.scen, 'something made before the answer', st);
  if (r.requests) fail(o.scen, 'requests before the answer', o.req);
  if (r.waiting.length) fail(o.scen, 'a waiting line before the choice', r.waiting);
  if (chips.length !== 2 || chips[0].t !== 'Another angle' || !chips[0].primary || chips[1].t !== 'Just be with it' || chips.some((c) => c.h < 44 || c.tag !== 'BUTTON')) fail(o.scen, 'chips', chips);
  if (name) await shot(o, name);
  return r;
}

const SCEN = {
  async angle(o) {
    const { sentAt } = await tell(o, 'I am worried about my exam tomorrow');
    const q = await seeQuestion(o, sentAt, W === 390 ? 'angle-1-question' : null);
    const tapAt = Date.now();
    await tapEl(o, '.hf-chips:not([hidden]) .hf-chip', 'Another angle');
    await waitFor(o, () => !!window.__angle.mech, null, 60000);
    await sleep(1500);
    const st = await state(o);
    await shot(o, 'angle-2-mechanic');
    return { question: q, mech: st.mech, answers: st.answers, requestsAfter: o.req.filter((x) => x.at >= tapAt).map((x) => x.p) };
  },
  async be(o) {
    const words = 'we had to let our dog go, I think it was my fault';
    const { sentAt } = await tell(o, words);
    const q = await seeQuestion(o, sentAt, null);
    await tapEl(o, '.hf-chips:not([hidden]) .hf-chip', 'Just be with it');
    await waitFor(o, () => (window.__aaSaid || []).some((l) => l.includes('That sounds like a lot to carry.')), null, 30000);
    await waitFor(o, () => [...document.querySelectorAll('.hf-chips:not([hidden]) .hf-chip')].some((e) => e.offsetParent && /Just squeeze Zuzu/.test(e.textContent)), null, 30000);
    const st1 = await state(o);
    const lines1 = await said(o);
    await shot(o, 'be-1-gentle');
    const req1 = o.req.filter((x) => x.at >= sentAt).map((x) => x.p);
    if (req1.length) fail('be', 'requests after Just be with it', req1);
    if (!st1.grief || st1.mech || st1.thought) fail('be', 'not the gentle path', st1);
    // Yes-then-resend: the Tell opens empty; the same words again go gently, with no question and nothing sent
    const n0 = lines1.length;
    const again = await tell(o, words, { expectEmpty: true });
    await waitFor(o, (n) => (window.__aaSaid || []).slice(n).some((l) => l.includes('Thank you for telling me.')), n0, 20000);
    await sleep(4500);
    const st2 = await state(o);
    const lines2 = (await said(o)).slice(n0);
    if (lines2.includes(ASK)) fail('be', 'asked again on resend', lines2);
    if (!st2.grief || st2.mech || st2.thought) fail('be', 'resend not gentle', st2);
    const req2 = o.req.filter((x) => x.at >= again.sentAt).map((x) => x.p);
    if (req2.length) fail('be', 'requests on resend', req2);
    await shot(o, 'be-2-resend');
    return { question: q, gentleLines: lines1.slice(-4), prefillBeforeResend: again.before, resendLines: lines2, resendPhase: st2.phase, requests: [...req1, ...req2], answers: st2.answers };
  },
  async death(o) {
    const { sentAt } = await tell(o, 'my mum died last week');
    await waitFor(o, () => (window.__aaSaid || []).some((l) => l.includes('Thank you for telling me.')), null, 20000);
    await waitFor(o, () => [...document.querySelectorAll('.hf-chips:not([hidden]) .hf-chip')].some((e) => e.offsetParent && /Just squeeze Zuzu/.test(e.textContent)), null, 40000);
    const st = await state(o);
    const lines = await said(o);
    if (lines.includes(ASK)) fail('death', 'asked', lines);
    if (!st.grief || st.mech || st.thought) fail('death', 'not gentle', st);
    if (W === 320) await shot(o, 'death-gentle');
    return { lines: lines.slice(-4), phase: st.phase, requests: o.req.filter((x) => x.at >= sentAt).map((x) => x.p) };
  },
  async care(o) {
    const { sentAt } = await tell(o, 'my best friend killed himself and I keep thinking about doing the same');
    await waitFor(o, () => (window.__aaSaid || []).some((l) => /glad you told me/.test(l)), null, 20000);
    await sleep(2500);
    const st = await state(o);
    const lines = await said(o);
    if (lines.includes(ASK)) fail('care', 'asked', lines);
    if (st.level !== 'care' || !st.follow || st.mech || st.thought) fail('care', 'not care', st);
    const reqs = o.req.filter((x) => x.at >= sentAt).map((x) => x.p);
    if (reqs.length) fail('care', 'requests', reqs);
    await shot(o, 'care');
    return { lines: lines.slice(-3), level: st.level, follow: st.follow, requests: reqs, supportPill: await o.page.evaluate(() => !document.querySelector('.bx-dock .hf-pill.support').hidden) };
  },
  async match(o) {
    const { sentAt } = await tell(o, 'my dad never came to my football match');
    const q = await seeQuestion(o, sentAt, W === 320 ? 'match-question' : null);
    const st0 = await state(o);
    if (st0.grief) fail('match', 'gentle', st0);
    await tapEl(o, '.hf-chips:not([hidden]) .hf-chip', 'Another angle');
    await waitFor(o, () => !!window.__angle.mech, null, 60000);
    const st = await state(o);
    if (st.grief) fail('match', 'gentle after angle', st);
    return { question: q, mech: st.mech, grief: st.grief };
  },
};

let browser;
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] });
  try {
    for (const s of SCENS) {
      const o = await open();
      o.scen = s;
      try { res.scen[s] = await SCEN[s](o); } catch (e) { fail(s, 'error', String(e.message || e).split('\n')[0]); await shot(o, `${s}-err`); }
      res.scen[s] = { ...(res.scen[s] || {}), errors: o.errors };
      if (o.errors.length) fail(s, 'page errors', o.errors);
      await o.ctx.close();
    }
  } finally { await browser.close(); }
  console.log('RESULT', JSON.stringify(res));
  fs.writeFileSync(path.join(OUT, `aa-result-${TAG}.json`), JSON.stringify(res, null, 1));
  process.exit(res.fails.length ? 1 : 0);
})();
