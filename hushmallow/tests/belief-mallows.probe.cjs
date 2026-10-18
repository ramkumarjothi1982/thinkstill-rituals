// Browser probe: Belief Mallows inside Another Angle (workstream belief-mallows).
//
//   node hushmallow/tests/belief-mallows.probe.cjs <scenario> W H [rm] [big] [port=8000] [out=DIR] [cpu=4]
//
// The repo root must be served (python3 -m http.server 8000 --bind 127.0.0.1 from it). The switch is on for this page
// load as the published build has it. Scenarios:
//   flow      Beyond → Another Angle → "A story that keeps coming back" → the Tell in belief mode → the belief question →
//             "Look at it together" → a stone → see how it shapes things (two moments, touch) → loosen its hold (touch,
//             then the assist pill) → give it some room (a held finger) → get to know it → how it sits → Keep it on this
//             phone (stored, this phone only) → Finish. Then back in: the kept one is offered, visited, deleted.
//   crisis    crisis words in belief mode → urgent support, no question, no Belief Mallow
//   care      care words in belief mode → the care lines, no question, no Belief Mallow
//   check     words the risk screener reads as possibly at risk → the check-in (belief wording) → "Not really": support first
//   notokay   ordinary words → the belief question → "I'm not okay" → support first, no Belief Mallow
//   wipe      keep one, then Settings → Delete everything → nothing kept
//   flowtier  a Flow (not Beyond) plan: Another Angle (and so Belief Mallows) opens the plans page, whose Beyond card sells
//             "Belief Mallow investigation…" (behind "Everything included") and whose Flow card never does
//   (LIVE_FEATURES.beliefMallows is on since the integration of 16 Oct 2026: no development switch is used)
// Every request the page makes is logged: only GETs of this host's own files are allowed, and none may carry the words.
// Prints one JSON line ("RESULT {...}") and writes screenshots to out. Playwright from /opt/node-tools; Chromium at
// /opt/pw-browsers/chromium (never playwright install). Touch via CDP.
const { createRequire } = require('module');
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');

const argv = process.argv.slice(2);
const SCEN = argv[0] || 'flow', W = +argv[1] || 390, H = +argv[2] || 844, RM = argv.includes('rm'), BIG = argv.includes('big');
const opt = (k, d) => { const a = argv.find((x) => x.startsWith(`${k}=`)); return a ? a.slice(k.length + 1) : d; };
const PORT = +opt('port', 8000), CPU = +opt('cpu', 0);
const OUT = opt('out', path.join(os.tmpdir(), 'belief-probe'));
const TIER = SCEN === 'flowtier' ? 'paid' : 'ultra';
const BASE = `http://127.0.0.1:${PORT}/hushmallow/index.html`;
const TAG = `${SCEN}-${W}x${H}${RM ? '-rm' : ''}${BIG ? '-big' : ''}`;
const WORDS = { flow: 'I’m not good enough', crisis: 'I want to kill myself tonight', care: 'He hits me when he is angry', check: 'I’m not good enough', notokay: 'Everybody judges me', wipe: 'I must always be perfect', flowtier: 'x' }[SCEN];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const res = { scen: SCEN, W, H, RM, BIG, fails: [], notes: {}, shots: [] };
const fail = (k, v) => { res.fails.push({ k, v }); console.log('FAIL', k, JSON.stringify(v ?? null).slice(0, 400)); };
const check = (ok, k, v) => { if (!ok) fail(k, v); return ok; };
fs.mkdirSync(OUT, { recursive: true });

let tid = 10;
const touch = (o, type, pts) => o.cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p) => ({ radiusX: 8, radiusY: 8, force: 1, ...p })) });
async function tap(o, x, y, hold = 70) { const id = ++tid; await touch(o, 'touchStart', [{ x, y, id }]); await sleep(hold); await touch(o, 'touchEnd', []); }
async function holdAt(o, x, y, ms) { const id = ++tid; await touch(o, 'touchStart', [{ x, y, id }]); const n = Math.ceil(ms / 100); for (let i = 0; i < n; i++) { await sleep(100); await touch(o, 'touchMove', [{ x: x + (i % 2), y, id }]); } await touch(o, 'touchEnd', []); }
async function squeeze(o, x, y, ms = 600) { const id = ++tid; await touch(o, 'touchStart', [{ x, y, id }]); for (let i = 0; i < 8; i++) { await sleep(ms / 8); await touch(o, 'touchMove', [{ x: x + (i % 2) * 2, y: y + 2, id }]); } await touch(o, 'touchEnd', []); }
async function stroke(o, x, y, len = 60) { const id = ++tid; await touch(o, 'touchStart', [{ x: x - len / 2, y, id }]); for (let i = 1; i <= 12; i++) { await sleep(40); await touch(o, 'touchMove', [{ x: x - len / 2 + (len * i) / 12, y, id }]); } await touch(o, 'touchEnd', []); }
async function shot(o, name) { const f = path.join(OUT, `${TAG}-${String(res.shots.length).padStart(2, '0')}-${name}.png`); await o.page.screenshot({ path: f }); res.shots.push(f); return f; }
const chips = (o) => o.page.evaluate(() => [...document.querySelectorAll('.hf-chips:not([hidden]) .hf-chip')].filter((e) => e.offsetParent).map((e) => e.textContent.trim()));
async function waitChip(o, text, timeout = 30000) {
  await o.page.waitForFunction((t) => [...document.querySelectorAll('.hf-chips:not([hidden]) .hf-chip')].some((e) => e.offsetParent && e.textContent.includes(t) && e.getBoundingClientRect().height > 0), text, { timeout });
  await sleep(RM ? 250 : 450);
}
async function tapChip(o, text, timeout = 30000) {
  await waitChip(o, text, timeout);
  const r = await o.page.evaluate((t) => { const e = [...document.querySelectorAll('.hf-chips:not([hidden]) .hf-chip')].find((x) => x.offsetParent && x.textContent.includes(t)); const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width, h: b.height }; }, text);
  check(r.h >= 44 && r.w >= 44, `chip 44px: ${text}`, r);
  await tap(o, r.x, r.y);
  // (under load the chips may still be easing in under the finger: once more if this one is still there, unanswered)
  try { await o.page.waitForFunction((t) => ![...document.querySelectorAll('.hf-chips:not([hidden]) .hf-chip')].some((e) => e.offsetParent && e.textContent.includes(t)), text, { timeout: 3000 }); } catch {
    const q = await o.page.evaluate((t) => { const e = [...document.querySelectorAll('.hf-chips:not([hidden]) .hf-chip')].find((x) => x.offsetParent && x.textContent.includes(t)); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }, text);
    if (q) { res.notes.retaps = (res.notes.retaps || 0) + 1; await tap(o, q.x, q.y); }
  }
}
async function tapSel(o, sel, timeout = 15000) {
  await o.page.waitForSelector(sel, { state: 'visible', timeout });
  const r = await o.page.evaluate((s) => { const e = [...document.querySelectorAll(s)].find((x) => x.offsetParent && !x.hidden); e.scrollIntoView({ block: 'center' }); const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width, h: b.height }; }, sel);
  check(r.h >= 44 && r.w >= 44, `target 44px: ${sel}`, r);
  await tap(o, r.x, r.y);
}
const subtitle = (o) => o.page.evaluate(() => [...document.querySelectorAll('.hf-sublive .hf-sub .text')].map((e) => e.textContent).join(' | '));
async function waitLine(o, re, timeout = 25000) {
  const src = re.source;
  await o.page.waitForFunction((s) => new RegExp(s).test((window.__heard || []).join(' | ')), src, { timeout });
}

async function open(browser) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, reducedMotion: RM ? 'reduce' : 'no-preference' });
  const prefs = { ...(RM ? { motion: 'reduced' } : {}), ...(BIG ? { textScale: 1.25 } : {}) };
  await ctx.addInitScript(({ prefs, tier }) => {
    try {
      if (!sessionStorage.getItem('bm:seeded')) {
        sessionStorage.setItem('bm:seeded', '1');
        localStorage.clear();
        localStorage.setItem('hm2:entitlement', JSON.stringify({ tier, source: 'test', since: Date.now() }));
        if (Object.keys(prefs).length) localStorage.setItem('hm2:prefs', JSON.stringify(prefs));
      }
    } catch { /* storage blocked */ }
  }, { prefs, tier: TIER });
  // every line said (subtitles come and go: a wait looks in this log, never only at the screen now)
  await ctx.addInitScript(() => {
    window.__heard = [];
    setInterval(() => { for (const e of document.querySelectorAll('.hf-sublive .hf-sub .text, .hf-chips .hf-chip')) { const t = e.textContent; if (t && window.__heard[window.__heard.length - 1] !== t && !window.__heard.slice(-12).includes(t)) window.__heard.push(t); } }, 60);
  });
  const page = await ctx.newPage();
  const errors = [], requests = [];
  page.on('pageerror', (e) => errors.push(String((e && e.stack) || e).slice(0, 300)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
  page.on('request', (r) => requests.push({ m: r.method(), u: r.url(), body: r.postData() || '' }));
  const cdp = await ctx.newCDPSession(page);
  if (CPU) await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  return { ctx, page, cdp, errors, requests };
}

async function toAngle(o) {
  await o.page.goto(BASE);
  await o.page.waitForFunction(() => window.__hush && window.__hush.world, null, { timeout: 120000 });
  await o.page.evaluate(() => window.__hush.go('angle'));
  await o.page.waitForFunction(() => window.__angle?.zuzu, null, { timeout: 120000 });
  // the consent notice (an endpoint is configured on the development host): "Not now", nothing is sent
  await o.page.waitForFunction(() => window.__angle?.consent || [...document.querySelectorAll('.hf-chips:not([hidden]) .hf-chip')].some((e) => e.offsetParent), null, { timeout: 60000 });
  if (await o.page.evaluate(() => !!window.__angle.consent)) {
    await sleep(600);
    const r = await o.page.evaluate(() => { const b = [...document.querySelectorAll('[data-bx=consent] button')].find((x) => x.textContent.trim() === 'Not now'); const q = b.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; });
    await tap(o, r.x, r.y);
  }
  await waitChip(o, 'Tell Zuzu', 60000);
}
async function tellBelief(o, words) {
  await tapChip(o, 'A story that keeps coming back');
  await o.page.waitForSelector('.hf-input textarea', { timeout: 30000 });
  await sleep(500);
  const ui = await o.page.evaluate(() => ({ prompt: document.querySelector('.hf-input')?.textContent || '', note: document.querySelector('.hf-input')?.innerText || '' }));
  check(/story that keeps coming back/.test(ui.prompt), 'belief prompt', ui.prompt.slice(0, 120));
  check(!/secure server/.test(ui.note), 'no server note in belief mode', ui.note.slice(0, 200));
  await o.page.focus('.hf-input textarea');
  await o.page.keyboard.type(words, { delay: 12 });
  await sleep(700);
  await shot(o, 'typed');
  if (await o.page.evaluate(() => document.querySelectorAll('#sheet-root .sheet.open').length)) return 'sheet';
  await tapSel(o, '.hf-input .hf-send');
  return 'sent';
}
const stageProbe = (o) => o.page.evaluate(() => window.__belief?.stage?.probe?.() || null);

async function frameStats(o, ms = 3000) {
  return o.page.evaluate((ms) => new Promise((resolve) => {
    const ts = []; let last = performance.now();
    const f = (t) => { ts.push(t - last); last = t; if (ts.length < 2000 && performance.now() - t0 < ms) requestAnimationFrame(f); else { ts.sort((a, b) => a - b); const p = (q) => +ts[Math.floor(ts.length * q)].toFixed(1); resolve({ n: ts.length, p50: p(0.5), p95: p(0.95), max: +ts[ts.length - 1].toFixed(1) }); } };
    const t0 = performance.now(); requestAnimationFrame(f);
  }), ms);
}

async function overlapCheck(o, label) {
  // the words never under a label or the subtitles: the belief's words plate vs the visible chips, lines and moment labels
  const r = await o.page.evaluate(() => {
    const rect = (e) => { const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom }; };
    const words = [...document.querySelectorAll('.tm-tag')].filter((e) => e.offsetParent && getComputedStyle(e).opacity > 0.5).map(rect);
    const ui = [...document.querySelectorAll('.hf-sublive .hf-sub, .hf-chips:not([hidden]), .bx-tag')].filter((e) => e.offsetParent && +getComputedStyle(e).opacity > 0.5).map(rect);
    const dock = [...document.querySelectorAll('.bx-dock .hf-pill')].filter((e) => !e.hidden && e.offsetParent).map(rect);
    const ov = (a, b) => Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t));
    let worst = 0;
    for (const w of words) for (const u of [...ui, ...dock]) worst = Math.max(worst, ov(w, u));
    const off = words.some((w) => w.l < 0 || w.r > innerWidth || w.t < 0 || w.b > innerHeight);
    return { words: words.length, worst: Math.round(worst), off };
  });
  check(r.worst <= 40 && !r.off, `words readable (${label})`, r);
  return r;
}

async function flow(o) {
  await toAngle(o);
  await shot(o, 'invite');
  res.notes.framesBaseline = await frameStats(o, 3000);
  check((await chips(o)).includes('A story that keeps coming back'), 'belief answer offered', await chips(o));
  await tellBelief(o, WORDS);
  // the question (or, for words the risk screener reads as possibly at risk, the check-in in its place): as for any Tell
  await o.page.waitForFunction(() => [...document.querySelectorAll('.hf-chips:not([hidden]) .hf-chip')].some((e) => e.offsetParent && /Look at it together|let’s look at it/.test(e.textContent)), null, { timeout: 30000 });
  await sleep(400);
  const q = await o.page.evaluate(() => [...document.querySelectorAll('.hf-sublive .hf-sub .text')].map((e) => e.textContent).join(' '));
  const ch = await chips(o);
  res.notes.question = { q, ch };
  const asked = /how this story sits with you/.test(q) && JSON.stringify(ch) === JSON.stringify(['Look at it together', 'Just be with it', 'I’m not okay']);
  const checked = /are you okay right now/.test(q) && JSON.stringify(ch) === JSON.stringify(['I’m okay — let’s look at it', 'Not really', 'Just be with it']);
  check(asked || checked, 'the belief question (or the check-in), three equal answers', { q, ch });
  check(await o.page.evaluate(() => !document.querySelector('.bx-dock .hf-pill.support').hidden), 'Support pill while asking');
  await shot(o, 'question');
  await tapChip(o, checked ? 'let’s look at it' : 'Look at it together');
  await tapChip(o, 'A heavy stone');
  await o.page.waitForFunction(() => window.__belief?.stage, null, { timeout: 20000 });
  await sleep(1800);
  await shot(o, 'meet');
  await overlapCheck(o, 'meet');
  check(await o.page.evaluate(() => !document.querySelector('.bx-dock .hf-pill.support').hidden), 'Support pill while playing');
  res.notes.frames = await frameStats(o, 3000);
  // the stage's own cost per frame (its ThoughtLayer, moments, room ring and checks), measured in place
  res.notes.stageMs = await o.page.evaluate(() => new Promise((resolve) => {
    const st = window.__belief.stage, f0 = st.frame, ms = [];
    st.frame = (dt, t) => { const a = performance.now(); f0(dt, t); ms.push(performance.now() - a); };
    setTimeout(() => { st.frame = f0; ms.sort((x, y) => x - y); resolve({ n: ms.length, p50: +ms[ms.length >> 1].toFixed(2), p95: +ms[Math.floor(ms.length * 0.95)].toFixed(2) }); }, 3000);
  }));
  // the experiences' chips never sit on the belief's words (the band is sized for them)
  await waitChip(o, 'See how it shapes things');
  await sleep(1200);
  await overlapCheck(o, 'chips');
  await shot(o, 'chips');
  // 1. see how it shapes things: two moments, by touch
  await tapChip(o, 'See how it shapes things');
  await sleep(1500);
  for (let i = 0; i < 2; i++) {
    await o.page.waitForFunction(() => window.__belief?.stage?.probe?.()?.moments?.some((m) => m.state === 'waiting'), null, { timeout: 15000 });
    const p = await stageProbe(o);
    const m = p.moments.find((x) => x.state === 'waiting');
    if (i === 0) { await shot(o, 'moment-waiting'); await tap(o, m.x, m.y); }
    else { const id = ++tid; await touch(o, 'touchStart', [{ x: m.x, y: m.y, id }]); for (let k = 1; k <= 6; k++) { await sleep(30); await touch(o, 'touchMove', [{ x: m.x + k * 9, y: m.y - k * 2, id }]); } await touch(o, 'touchEnd', []); }
    await sleep(900);
    if (i === 0) await shot(o, 'moment-moving');
    await sleep(1800);
  }
  const p1 = await stageProbe(o);
  res.notes.shape = p1;
  await waitLine(o, /lean its way|pass it more easily/);
  await shot(o, 'shaped');
  // 2. loosen its hold: squeezes and strokes, then the assist pill
  await tapChip(o, 'Loosen its hold');
  await sleep(1200);
  const ex0 = (await stageProbe(o)).belief.explored;
  for (let i = 0; i < 4; i++) { const p = await stageProbe(o); if (i % 2) await stroke(o, p.belief.x, p.belief.y + 6); else await squeeze(o, p.belief.x, p.belief.y + 4); await sleep(350); }
  const ex1 = (await stageProbe(o)).belief.explored;
  res.notes.loosenTouch = { ex0: +ex0.toFixed(3), ex1: +ex1.toFixed(3) };
  check(ex1 > ex0 + 0.1, 'touch loosens it', res.notes.loosenTouch);
  await shot(o, 'loosening');
  for (let i = 0; i < 6 && (await o.page.evaluate(() => !document.querySelector('[data-bx=assist]').hidden)); i++) { try { await tapSel(o, '[data-bx=assist]', 2000); } catch { break; } await sleep(700); }
  await waitLine(o, /set the stone down|shell has opened|Looser now|not pulling so hard/);
  await sleep(1200);
  const p2 = await stageProbe(o);
  res.notes.loosened = p2.belief;
  res.notes.prop = await o.page.evaluate(() => window.__belief.stage.snapshot().prop);
  check(p2.belief.pull < 0.45 && (res.notes.prop !== 'stone' || p2.belief.down >= 0.99), 'loosened (the stone set down)', p2.belief);
  await shot(o, 'loosened');
  // 3. room: a finger held on the space beside it
  await tapChip(o, 'Give it some room');
  await sleep(1200);
  const a = await o.page.evaluate(() => window.__angle.area);
  const p3 = await stageProbe(o);
  // open sky beside it (left of it, level with its middle: never its words, whose tap opens the reader)
  const hx = Math.max(a.x + 24, p3.belief.x - 115), hy = p3.belief.y + 10;
  await holdAt(o, hx, hy, RM ? 4300 : 5400);
  await waitLine(o, /isn’t the whole sky/, 15000);
  const p4 = await stageProbe(o);
  res.notes.room = { room: p4.room, z: p4.belief.z };
  check(p4.room >= 1, 'room grows while held', res.notes.room);
  await shot(o, 'room');
  await overlapCheck(o, 'room');
  // 4. get to know it
  await tapChip(o, 'Get to know it');
  await tapChip(o, 'Keep me safe');
  await waitLine(o, /look after you/);
  // how it sits; end
  await tapChip(o, 'A bit lighter', 40000);
  await tapChip(o, 'Keep it on this phone', 30000);
  await waitLine(o, /Kept on this phone only/);
  const kept = await o.page.evaluate(() => JSON.parse(localStorage.getItem('hm2:beyond.belief.kept') || 'null'));
  check(Array.isArray(kept) && kept.length === 1 && kept[0].prop === 'stone' && kept[0].explored > 0.7 && kept[0].room >= 1, 'kept on this phone', kept);
  await shot(o, 'kept');
  await tapChip(o, 'Finish');
  await o.page.waitForFunction(() => !window.__angle, null, { timeout: 30000 });
  await sleep(800);
  // back in: the kept one is offered; visit it; delete it
  await o.page.evaluate(() => window.__hush.go('angle'));
  await waitChip(o, 'A story that keeps coming back', 60000);
  await tapChip(o, 'A story that keeps coming back');
  await waitChip(o, 'Visit “');
  await shot(o, 'source');
  await tapChip(o, 'Visit “');
  // read again as a Tell: the question (or the check-in) comes first
  await o.page.waitForFunction(() => [...document.querySelectorAll('.hf-chips:not([hidden]) .hf-chip')].some((e) => e.offsetParent && /Look at it together|let’s look at it/.test(e.textContent)), null, { timeout: 30000 });
  await tapChip(o, (await chips(o)).includes('Look at it together') ? 'Look at it together' : 'let’s look at it');
  await o.page.waitForFunction(() => window.__belief?.stage, null, { timeout: 20000 });
  await sleep(1500);
  const p5 = await stageProbe(o);
  check(p5.belief.explored > 0.7 && p5.room >= 1, 'visited as it was left', p5.belief);
  await shot(o, 'revisit');
  await tapChip(o, 'That’s enough');
  await tapChip(o, 'Delete it from this phone');
  await waitLine(o, /Deleted from this phone/);
  check(await o.page.evaluate(() => localStorage.getItem('hm2:beyond.belief.kept') === null), 'deleted from this phone');
  await tapChip(o, 'Finish');
  await sleep(1500);
}

async function safetyRoute(o, kind) {
  await toAngle(o);
  const how = await tellBelief(o, WORDS);
  await sleep(2500);
  if (how === 'sheet' || kind === 'crisis') {
    const sheet = await o.page.evaluate(() => document.querySelectorAll('#sheet-root .sheet.open').length);
    check(sheet > 0, 'urgent support sheet', sheet);
    await shot(o, 'crisis-sheet');
    if (how === 'sheet') { await o.page.goBack(); await sleep(800); if (await o.page.evaluate(() => { const b = document.querySelector('.hf-input .hf-send'); return !!b && !b.disabled; })) await tapSel(o, '.hf-input .hf-send'); }
    await sleep(2500);
  }
  if (kind === 'care') await waitLine(o, /real support|See support/);
  if (kind === 'check') {
    await waitChip(o, 'I’m okay — let’s look at it');
    await shot(o, 'check-in');
    await tapChip(o, 'Not really');
    await waitChip(o, 'See support');
  }
  if (kind === 'notokay') {
    await waitChip(o, 'I’m not okay');
    await tapChip(o, 'I’m not okay');
    await waitChip(o, 'See support');
  }
  await sleep(1500);
  await shot(o, `${kind}-routed`);
  const st = await o.page.evaluate(() => ({ belief: !!window.__belief?.stage, mech: window.__angle?.mechId || null, chips: [...document.querySelectorAll('.hf-chips:not([hidden]) .hf-chip')].map((e) => e.textContent), support: !document.querySelector('.bx-dock .hf-pill.support')?.hidden || !!document.querySelector('#sheet-root .sheet.open') || [...document.querySelectorAll('.hf-chips:not([hidden]) .hf-chip')].some((e) => e.textContent.includes('See support')), question: /how this story sits/.test(document.body.innerText) }));
  res.notes.routed = st;
  check(!st.belief && st.mech !== 'belief', 'no Belief Mallow', st);
  check(st.support, 'support in reach', st);
  if (kind === 'crisis' || kind === 'care') check(!st.question, 'no question after crisis/care', st);
  const face = await o.page.evaluate(() => { const z = window.__angle?.touch; return z?.debugFace?.() || z?.emotionState?.() || null; });
  res.notes.face = face;
}

async function wipe(o) {
  await toAngle(o);
  await tellBelief(o, WORDS);
  await tapChip(o, 'Look at it together');
  await tapChip(o, 'A shell');
  await tapChip(o, 'That’s enough', 30000);
  await tapChip(o, 'Keep it on this phone');
  await waitLine(o, /Kept on this phone only/);
  check(await o.page.evaluate(() => !!localStorage.getItem('hm2:beyond.belief.kept')), 'kept before wipe');
  await tapChip(o, 'Finish');
  await o.page.waitForFunction(() => !window.__angle, null, { timeout: 30000 });
  await o.page.evaluate(() => window.__hush.go('settings'));
  await tapSel(o, '[data-act=delete-local]');
  await sleep(600);
  await shot(o, 'delete-sheet');
  const r = await o.page.evaluate(() => { const b = [...document.querySelectorAll('#sheet-root .sheet.open button')].find((x) => x.textContent.trim() === 'Delete'); const q = b.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; });
  await tap(o, r.x, r.y);
  await sleep(1500);
  check(await o.page.evaluate(() => localStorage.getItem('hm2:beyond.belief.kept') === null), 'Delete everything removes it');
}

async function flowtier(o) {
  await o.page.goto(BASE);
  await o.page.waitForFunction(() => window.__hush && window.__hush.world, null, { timeout: 120000 });
  await o.page.evaluate(() => window.__hush.go('angle'));
  await o.page.waitForFunction(() => document.querySelector('.invite-beyond'), null, { timeout: 60000 });
  await sleep(1200);
  const r = await o.page.evaluate(() => ({
    angle: !!window.__angle, belief: !!window.__belief,
    beyond: document.querySelector('.invite-beyond')?.textContent || '',
    flow: document.querySelector('.invite-flow')?.textContent || '',
    hash: location.hash,
  }));
  res.notes.plans = { angle: r.angle, belief: r.belief, hash: r.hash };
  check(!r.angle && !r.belief, 'Flow: no Another Angle, no Belief Mallow (the plans page instead)', res.notes.plans);
  check(/Belief Mallow investigation for the stories that keep coming back/.test(r.beyond), 'Beyond sells Belief Mallows', r.beyond.slice(0, 300));
  check(!/Belief/.test(r.flow), 'Flow never sells Belief Mallows', r.flow.slice(0, 300));
  await shot(o, 'plans');
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
  const o = await open(browser);
  try {
    if (SCEN === 'flow') await flow(o);
    else if (['crisis', 'care', 'check', 'notokay'].includes(SCEN)) await safetyRoute(o, SCEN);
    else if (SCEN === 'wipe') await wipe(o);
    else if (SCEN === 'flowtier') await flowtier(o);
  } catch (e) {
    fail('exception', String(e && e.stack || e).slice(0, 600));
    try { await shot(o, 'exception'); res.notes.subs = await subtitle(o); res.notes.chips = await chips(o); } catch { /* ignore */ }
  }
  // the network: only this host's own files, fetched; never the words
  const words = (WORDS || '').toLowerCase().replace(/[’']/g, '');
  const bad = o.requests.filter((r) => !r.u.startsWith(`http://127.0.0.1:${PORT}/`) || r.m !== 'GET' || (words.length > 3 && decodeURIComponent(r.u + r.body).toLowerCase().replace(/[’']/g, '').includes(words)));
  res.notes.requests = o.requests.length;
  check(!bad.length, 'nothing sent (request log)', bad.slice(0, 5));
  check(!o.errors.length, 'no page errors', o.errors.slice(0, 5));
  await browser.close();
  console.log('RESULT', JSON.stringify(res));
  process.exit(res.fails.length ? 1 : 0);
})();
