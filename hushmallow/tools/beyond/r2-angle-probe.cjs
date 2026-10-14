// Browser probe for the final round 2 unit "Another Angle and detection" (tests/r2-angle.test.mjs has the node side).
//
//   node hushmallow/tools/beyond/r2-angle-probe.cjs W H [server] [scen=esc,resend,quiet,back,hidden,battery,befinish,mainesc]
//        [from=0] [to=18] [out=DIR] [base=URL] [dev=8790] [shots=some|none]
//
// The repo root must be served on http://localhost:8000 (the Another Angle mock harness only allows that origin). With `server`,
// ?angleDev=<dev> points the app at the mock harness and sharing is on (consent yes); without it nothing can be sent. Every /v1/
// request is recorded. Scenarios, each on a fresh page:
//   esc       the semantic review's escalation phrasings (tests/probes/r2-angle.mjs SEM_ESC_POS[from..to]) in Another Angle:
//             care ("…glad you told me…"), no question, 0 /v1/ requests
//   mainesc   the same phrasings on the main screen: care (S.level), no question, no Thought Mallow
//   resend    "I was holding her hand when she went" → the question → Another angle → a mechanic, walked to its end (assist),
//             "That's enough", "I'd rather just squeeze" → Tell (opens empty) → "I WAS HOLDING HER HAND WHEN SHE WENT!!" → the
//             question again, nothing made, said or sent before it
//   quiet     the question left unanswered (about 45 s): focus on its first answer while it is up; afterwards four squeezes say
//             nothing; the Tell opens with the words kept
//   back      the question closed with Back: four squeezes say nothing
//   hidden    the question while the page is hidden for 50 s: still asking; visible again, "Another angle" plays
//   battery   "the battery in my car is dead again" → the question (never the gentle path)
//   befinish  "I am worried about my exam tomorrow" → Just be with it → its own quiet lines (no "See support") → Finish → the
//             ordinary goodbye → home quiet (S.soft) with no safety level → "I am so angry my boss ignored me again" → the play question
// Prints "RESULT {...}". Playwright from /opt/node-tools; Chromium at /opt/pw-browsers/chromium (never playwright install).
// Touch through CDP Input.dispatchTouchEvent.
const { createRequire } = require('module');
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { pathToFileURL } = require('url');

const argv = process.argv.slice(2);
const W = +argv[0] || 390, H = +argv[1] || 844, SERVER = argv.includes('server');
const opt = (k, d) => { const a = argv.find((x) => x.startsWith(`${k}=`)); return a ? a.slice(k.length + 1) : d; };
const SCENS = opt('scen', 'battery,befinish,resend,quiet').split(',');
const OUT = opt('out', path.join(os.tmpdir(), 'r2-angle'));
const DEV = opt('dev', '8790');
const FROM = +opt('from', 0), TO = +opt('to', 99);
const BASE = opt('base', 'http://localhost:8000/hushmallow/index.html') + (SERVER ? `?angleDev=${DEV}` : '');
const SHOTS = opt('shots', 'some');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const res = { W, H, server: SERVER, scen: {}, fails: [] };
const fail = (s, k, v) => { res.fails.push({ s, k, v }); console.log('FAIL', s, k, JSON.stringify(v ?? '').slice(0, 400)); };
const TAG = `${W}x${H}${SERVER ? '-server' : '-offline'}`;
const ASK = 'Shall we look at this from another angle, or just be with it?';
const MAIN_ASK = 'Shall we play with this, or just be with it?';
const QUIPS = ['Squishy thinking helps, apparently.', 'Ooh. Spin me round.', 'Still here. Still squishy.', 'Every angle feels better squeezed.'];

let tid = 20;
const touch = (cdp, type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
async function tap(o, x, y, hold = 70) { const id = ++tid; await touch(o.cdp, 'touchStart', [{ x, y, id, radiusX: 8, radiusY: 8, force: 1 }]); await sleep(hold); await touch(o.cdp, 'touchEnd', []); }
async function tapEl(o, sel, text = null, timeout = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const r = await o.page.evaluate(({ sel, text }) => { const e = [...document.querySelectorAll(sel)].find((x) => !x.hidden && x.offsetParent && (!text || x.textContent.includes(text))); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }, { sel, text });
    if (r) { await tap(o, r.x, r.y); return true; }
    await sleep(150);
  }
  throw new Error(`no ${sel} ${text || ''}`);
}
const said = (o) => o.page.evaluate(() => window.__aaSaid || []);
const waitFor = (o, fn, arg, timeout = 30000) => o.page.waitForFunction(fn, arg, { timeout, polling: 100 });
const state = (o) => o.page.evaluate(() => { const A = window.__angle; if (!A) return null; return { phase: A.S.phase, grief: !!A.S.grief, level: A.S.level, follow: !!A.S.follow, care: !!A.S.care, noPlay: !!A.S.noPlay, beOnly: !!A.S.beOnly, keepWords: !!A.S.keepWords, mech: A.mechId || null, thought: !!A.thought, answers: [...A.S.answers.entries()], squeezes: A.S.squeezes, server: A.serverMode() }; });
const chips = (o) => o.page.$$eval('.hf-chips:not([hidden]) .hf-chip', (els) => els.filter((e) => e.offsetParent).map((e) => { const b = e.getBoundingClientRect(); return { t: e.textContent.trim(), h: Math.round(b.height), primary: e.classList.contains('primary'), tag: e.tagName }; }));
async function shot(o, name) {
  if (SHOTS === 'none') return null;
  await o.page.evaluate(() => Promise.race([new Promise((r) => setTimeout(r, 2500)), Promise.all(document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.target?.closest?.('.hf-sublive, .hf-chips')).map((a) => a.finished.catch(() => null)))])).catch(() => null);
  await sleep(250);
  const f = path.join(OUT, `r2a-${name}-${TAG}.png`); await o.page.screenshot({ path: f }); res.shots = [...(res.shots || []), f]; return f;
}

let ctx;
async function open({ angle = true } = {}) {
  const page = await ctx.newPage();
  const o = { page, cdp: null, req: [], errors: [] };
  page.on('request', (r) => { if (/\/v1\//.test(r.url())) o.req.push({ m: r.method(), p: r.url().replace(/^https?:\/\/[^/]+/, ''), at: Date.now() }); });
  page.on('pageerror', (e) => o.errors.push(String(e.message || e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) o.errors.push(m.text()); });
  await page.goto(BASE);
  await page.waitForFunction(() => window.__hush && window.__hush.world && window.__hushfold, null, { timeout: 120000 });
  await page.evaluate(async () => { if (!window.__hush.ent.has('ultra')) await window.__hush.ent.purchase('ultra'); });
  o.cdp = await page.context().newCDPSession(page);
  if (!angle) { await page.waitForFunction(() => window.__hushfold?.touch?.ready && window.__hushfold?.mallow?.bodyRect?.(), null, { timeout: 60000 }); await sleep(1500); return o; }
  await page.evaluate(() => window.__hush.go('angle'));
  await page.waitForFunction(() => window.__angle && window.__angle.zuzu, null, { timeout: 120000 });
  await waitFor(o, () => [...document.querySelectorAll('.hf-chips:not([hidden]) .hf-chip, [data-bx=tell]')].some((e) => !e.hidden && e.offsetParent && /Tell Zuzu/.test(e.textContent)), null, 90000);
  await sleep(500);
  return o;
}
async function tell(o, text) {
  await tapEl(o, '.hf-chips:not([hidden]) .hf-chip, [data-bx=tell]', 'Tell Zuzu');
  await o.page.waitForSelector('.hf-input textarea', { timeout: 30000 });
  await sleep(350);
  const before = await o.page.$eval('.hf-input textarea', (t) => t.value);
  await o.page.fill('.hf-input textarea', text);
  await sleep(600);
  const sentAt = Date.now();
  await tapEl(o, '.hf-input .hf-send');
  return { before, sentAt };
}
/** The question within a few seconds of Send: two chips of equal weight, nothing made or sent, focus on its first answer. */
async function seeQuestion(o, sentAt, scen, name = null) {
  const n0 = (await said(o)).length;
  await waitFor(o, (ask) => [...document.querySelectorAll('.hf-sub')].some((e) => e.textContent.includes(ask)), ASK, 15000);
  await waitFor(o, () => [...document.querySelectorAll('.hf-chips:not([hidden]) .hf-chip')].some((e) => e.offsetParent && /Just be with it/.test(e.textContent)), null, 15000);
  const ms = Date.now() - sentAt;
  await sleep(700);
  const c = await chips(o);
  const st = await state(o);
  const focus = await o.page.evaluate(() => ({ tag: document.activeElement?.tagName, text: document.activeElement?.textContent?.trim() || '' }));
  const r = { ms, chips: c, focus, phase: st.phase, requests: o.req.filter((q) => q.at >= sentAt).length };
  if (st.phase !== 'asking') fail(scen, 'not asking', st);
  if (r.requests) fail(scen, 'requests before the answer', o.req);
  if (c.length !== 2 || c[0].t !== 'Another angle' || c[1].t !== 'Just be with it' || c.some((x) => x.primary || x.h < 44 || x.tag !== 'BUTTON')) fail(scen, 'chips (equal weight, Another angle first)', c);
  if (focus.tag !== 'BUTTON' || focus.text !== 'Another angle') fail(scen, 'focus on the first answer', focus);
  if (name) await shot(o, name);
  return { ...r, n0 };
}
async function squeezeZuzu(o, n = 4) {
  for (let i = 0; i < n; i++) {
    const b = await o.page.evaluate(() => { const r = window.__angle.zuzu.bodyRect(); return { x: r.cx ?? r.left + r.width / 2, y: r.cy ?? r.top + r.height / 2 }; });
    await tap(o, b.x, b.y, 380);
    await sleep(900);
  }
  await sleep(1500);
}

const SCEN = {
  async esc(o0) {
    const P = await import(pathToFileURL(path.join(__dirname, '../../tests/probes/r2-angle.mjs')).href);
    await o0.page.close();
    const out = [];
    for (const t of P.SEM_ESC_POS.slice(FROM, TO)) {
      const o = await open();
      const { sentAt } = await tell(o, t);
      try { await waitFor(o, () => [...document.querySelectorAll('.hf-sub')].some((e) => /glad you told me|real support/.test(e.textContent)), null, 20000); } catch { /* checked below */ }
      await sleep(1500);
      const st = await state(o);
      const lines = await said(o);
      const reqs = o.req.filter((x) => x.at >= sentAt).map((x) => x.p);
      const row = { t, level: st.level, follow: st.follow, asked: lines.includes(ASK), requests: reqs.length, mech: st.mech, thought: st.thought };
      if (st.level !== 'care' || row.asked || reqs.length || st.mech || st.thought) fail('esc', t, row);
      out.push(row);
      if (o.errors.length) fail('esc', 'page errors', o.errors);
      if (out.length === 1) await shot(o, 'esc-care');
      await o.page.close();
    }
    return { n: out.length, care: out.filter((r) => r.level === 'care').length, requests: out.reduce((a, r) => a + r.requests, 0), rows: out };
  },
  async mainesc(o0) {
    const P = await import(pathToFileURL(path.join(__dirname, '../../tests/probes/r2-angle.mjs')).href);
    await o0.page.close();
    const out = [];
    for (const t of P.SEM_ESC_POS.slice(FROM, TO)) {
      const o = await open({ angle: false });
      await o.page.evaluate(() => window.__hushfold.openTell());
      await o.page.waitForSelector('.hf-input textarea', { state: 'visible', timeout: 10000 });
      await o.page.fill('.hf-input textarea', t);
      await sleep(900);
      const sentAt = Date.now();
      await tapEl(o, '.hf-input .hf-send:not([disabled])');
      await sleep(3500);
      const st = await o.page.evaluate(() => { const Hf = window.__hushfold; return { level: Hf.S.level, asking: !!Hf.S.asking, thoughts: (Hf.thoughts?.list || []).filter((x) => !x.leaving).length, live: document.querySelector('.hf-sublive')?.textContent || '' }; });
      const row = { t, ...st, asked: st.live.includes(MAIN_ASK), requests: o.req.filter((x) => x.at >= sentAt).length };
      if (st.level !== 'care' && st.level !== 'crisis' || st.asking || row.asked || st.thoughts || row.requests) fail('mainesc', t, row);
      out.push(row);
      if (out.length === 1) await shot(o, 'mainesc-care');
      await o.page.close();
    }
    return { n: out.length, care: out.filter((r) => r.level === 'care' || r.level === 'crisis').length, rows: out.map((r) => [r.t.slice(0, 40), r.level]) };
  },
  async resend(o) {
    const [first, again] = ['I was holding her hand when she went', 'I WAS HOLDING HER HAND WHEN SHE WENT!!'];
    const t1 = await tell(o, first);
    const q1 = await seeQuestion(o, t1.sentAt, 'resend');
    await tapEl(o, '.hf-chips:not([hidden]) .hf-chip', 'Another angle');
    await waitFor(o, () => !!window.__angle.mech, null, 60000);
    const mech = (await state(o)).mech;
    // walk the mechanic with its assist (instead of touch) to its reveal, its held line's Continue, "That's enough", then
    // "I'd rather just squeeze a Mallow" (the dock's Tell comes back)
    for (let i = 0; i < 90; i++) {
      const ph = (await state(o)).phase;
      if (ph === 'squeeze') break;
      const step = await o.page.evaluate(() => {
        const vis = (e) => e && !e.hidden && e.offsetParent;
        const chip = (re) => [...document.querySelectorAll('.hf-chips:not([hidden]) .hf-chip')].find((e) => vis(e) && re.test(e.textContent));
        const go = [...document.querySelectorAll('.hf-subs button')].find((e) => vis(e) && /Continue/.test(e.textContent));
        const pick = chip(/rather just squeeze/) || chip(/That’s enough/) || go;
        if (pick) { const b = pick.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, t: pick.textContent.trim() }; }
        if (['playing', 'waiting'].includes(window.__angle.S.phase)) window.__angle.assist();
        return null;
      });
      if (step) { await tap(o, step.x, step.y); await sleep(700); } else await sleep(900);
    }
    await sleep(1200);
    const st1 = await state(o);
    const t2 = await tell(o, again);
    if (t2.before !== '') fail('resend', 'Tell prefilled after an angle', t2.before);
    const q2 = await seeQuestion(o, t2.sentAt, 'resend', 'resend-asked-again');
    const after = (await said(o)).slice(q2.n0);
    const before = after.slice(0, Math.max(0, after.indexOf(ASK)));
    if (before.length) fail('resend', 'lines before the question', before);
    return { firstQuestion: q1.ms, mech, phaseBeforeResend: st1.phase, prefill: t2.before, resendAsked: true, linesBeforeQuestion: before, requestsBeforeAnswer: q2.requests, answers: (await state(o)).answers };
  },
  async quiet(o) {
    const words = 'I was holding her hand when she went';
    const t = await tell(o, words);
    const q = await seeQuestion(o, t.sentAt, 'quiet', W === 390 ? 'quiet-question' : null);
    // about 45 s: still there at 40 s, gone by 47 s
    await sleep(40000 - (Date.now() - t.sentAt) + q.ms);
    const at40 = (await state(o)).phase;
    if (at40 !== 'asking') fail('quiet', 'timed out before ~45 s', at40);
    await waitFor(o, () => window.__angle.S.phase !== 'asking', null, 12000);
    const goneAt = Date.now() - t.sentAt - q.ms;
    const st = await state(o);
    const n0 = (await said(o)).length;
    await squeezeZuzu(o, 4);
    const lines = (await said(o)).slice(n0);
    const quips = lines.filter((l) => QUIPS.includes(l));
    if (quips.length) fail('quiet', 'squeeze quips after the question was let go', lines);
    if (!st.noPlay) fail('quiet', 'noPlay not set', st);
    await shot(o, 'quiet-after');
    // the words are kept for the next Tell
    await tapEl(o, '[data-bx=tell]', 'Tell Zuzu');
    await o.page.waitForSelector('.hf-input textarea', { timeout: 30000 });
    await sleep(400);
    const prefill = await o.page.$eval('.hf-input textarea', (x) => x.value);
    if (prefill !== words) fail('quiet', 'words not kept', prefill);
    return { questionMs: q.ms, focus: q.focus, at40, goneAfterMs: goneAt, noPlay: st.noPlay, squeezes: (await state(o)).squeezes, linesAfterSqueezes: lines, prefill };
  },
  async back(o) {
    const t = await tell(o, 'I was holding her hand when she went');
    await seeQuestion(o, t.sentAt, 'back');
    await o.page.goBack().catch(() => null);
    await waitFor(o, () => window.__angle && window.__angle.S.phase !== 'asking', null, 10000);
    const st = await state(o);
    const route = await o.page.evaluate(() => location.hash || location.pathname);
    const n0 = (await said(o)).length;
    await squeezeZuzu(o, 4);
    const lines = (await said(o)).slice(n0);
    if (lines.some((l) => QUIPS.includes(l))) fail('back', 'squeeze quips after Back', lines);
    if (!st.noPlay || st.phase !== 'invite') fail('back', 'not quiet', st);
    return { phase: st.phase, noPlay: st.noPlay, route, linesAfterSqueezes: lines };
  },
  async hidden(o) {
    const t = await tell(o, 'I am worried about my exam tomorrow');
    await seeQuestion(o, t.sentAt, 'hidden');
    await sleep(5000);
    // the page hidden (another tab, the phone locked) for 50 s
    await o.page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
    await sleep(50000);
    const whileHidden = (await state(o)).phase;
    await o.page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
    await sleep(1500);
    const back = (await state(o)).phase;
    if (whileHidden !== 'asking' || back !== 'asking') fail('hidden', 'timed out while hidden', { whileHidden, back });
    const reqBefore = o.req.filter((x) => x.at >= t.sentAt).length;
    const tapAt = Date.now();
    await tapEl(o, '.hf-chips:not([hidden]) .hf-chip', 'Another angle');
    await waitFor(o, () => !!window.__angle.mech, null, 60000);
    const st = await state(o);
    return { whileHidden, back, mech: st.mech, serverMode: st.server, requestsBeforeAnswer: reqBefore, requestsAfterAngle: o.req.filter((x) => x.at >= tapAt).map((x) => x.p) };
  },
  async battery(o) {
    const t = await tell(o, 'the battery in my car is dead again');
    const q = await seeQuestion(o, t.sentAt, 'battery', 'battery-question');
    const st = await state(o);
    if (st.grief) fail('battery', 'gentle', st);
    return { questionMs: q.ms, chips: q.chips.map((c) => c.t), focus: q.focus, grief: st.grief };
  },
  async befinish(o) {
    const t = await tell(o, 'I am worried about my exam tomorrow');
    await seeQuestion(o, t.sentAt, 'befinish');
    await tapEl(o, '.hf-chips:not([hidden]) .hf-chip', 'Just be with it');
    await waitFor(o, () => [...document.querySelectorAll('.hf-chips:not([hidden]) .hf-chip')].some((e) => e.offsetParent && /Just squeeze Zuzu/.test(e.textContent)), null, 30000);
    const c = (await chips(o)).map((x) => x.t);
    const st = await state(o);
    const lines = await said(o);
    const pill = await o.page.evaluate(() => !document.querySelector('.bx-dock .hf-pill.support').hidden);
    if (c.includes('See support') || pill) fail('befinish', 'support offered for ordinary words', { c, pill });
    if (st.grief || !st.beOnly || st.level !== 'none') fail('befinish', 'grief path', st);
    if (lines.some((l) => /That sounds like a lot to carry|Thank you for telling me/.test(l))) fail('befinish', 'grief lines', lines);
    await shot(o, 'befinish-be');
    const reqs = o.req.length;
    const n0 = lines.length;
    await tapEl(o, '.hf-chips:not([hidden]) .hf-chip', 'Finish');
    await o.page.waitForFunction(() => !window.__angle && window.__hushfold?.S, null, { timeout: 30000 });
    const bye = (await said(o)).slice(n0);
    if (bye.includes('Go gently.') || !bye.includes('That’s enough for now.')) fail('befinish', 'goodbye', bye);
    await o.page.waitForFunction(() => window.__hushfold?.touch?.ready && window.__hushfold?.mallow?.bodyRect?.(), null, { timeout: 60000 });
    await sleep(2500);
    const home = await o.page.evaluate(() => { const Hf = window.__hushfold; const sp = document.querySelector('.hf-dock .hf-pill.support'); return { level: Hf.S.level, careSaid: !!Hf.S.careSaid, soft: !!Hf.S.soft, supportPill: !!sp && !sp.hidden && sp.getBoundingClientRect().height > 0 }; });
    if (home.level !== 'none' || home.careSaid || home.supportPill) fail('befinish', 'home carried a safety level', home);
    // the quiet visit carries home ({ soft: true }: the Hushfold's softVisit), never a safety level
    if (!home.soft) fail('befinish', 'home not quiet after "Just be with it"', home);
    await o.page.evaluate(() => window.__hushfold.openTell());
    await o.page.waitForSelector('.hf-input textarea', { state: 'visible', timeout: 10000 });
    await o.page.fill('.hf-input textarea', 'I am so angry my boss ignored me again');
    await sleep(800);
    await tapEl(o, '.hf-input .hf-send:not([disabled])');
    let asked = true;
    try { await waitFor(o, (q) => [...document.querySelectorAll('.hf-subs .hf-sub')].some((e) => e.textContent.includes(q)) && [...document.querySelectorAll('.hf-subs .hf-chips:not([hidden]) .hf-chip')].some((b) => b.textContent === 'Play with it'), MAIN_ASK, 12000); } catch { asked = false; }
    if (!asked) fail('befinish', 'home Tell not asked the play question', await o.page.evaluate(() => document.querySelector('.hf-sublive')?.textContent));
    await sleep(800);
    await shot(o, 'befinish-home-question');
    return { chips: c, beLines: lines.slice(-4), goodbye: bye.slice(0, 2), home, homeAsked: asked, requests: reqs };
  },
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] });
  try {
    for (const s of SCENS) {
      ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
      await ctx.addInitScript(({ server }) => {
        try {
          localStorage.setItem('hm2:entitlement', JSON.stringify({ tier: 'paid', source: 'test', since: Date.now() }));
          localStorage.setItem('hm2:beyond.consent', JSON.stringify({ v: 2, choice: server ? 'yes' : 'no', at: '2026-10-14' }));
          localStorage.setItem('hm2:beyond.seen', 'true');
        } catch { /* storage blocked */ }
        window.__aaSaid = [];
        new MutationObserver(() => {
          for (const e of document.querySelectorAll('.hf-sublive .hf-sub .text, .hf-sublive .hf-sub')) {
            const t = (e.textContent || '').trim();
            if (t && window.__aaSaid[window.__aaSaid.length - 1] !== t && !window.__aaSaid.slice(-3).includes(t)) window.__aaSaid.push(t);
          }
        }).observe(document, { subtree: true, childList: true, characterData: true });
      }, { server: SERVER });
      const o = await open({ angle: !/esc$/.test(s) });
      try { res.scen[s] = await SCEN[s](o); } catch (e) { fail(s, 'error', String(e.message || e).split('\n')[0]); if (!o.page.isClosed()) await shot(o, `${s}-err`).catch(() => null); }
      if (!o.page.isClosed() && o.errors.length) fail(s, 'page errors', o.errors);
      await ctx.close();
    }
  } finally { await browser.close(); }
  console.log('RESULT', JSON.stringify(res));
  fs.writeFileSync(path.join(OUT, `r2a-result-${SCENS.join('+')}-${TAG}.json`), JSON.stringify(res, null, 1));
  process.exit(res.fails.length ? 1 : 0);
})();
