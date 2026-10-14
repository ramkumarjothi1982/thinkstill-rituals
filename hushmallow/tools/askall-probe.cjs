// Browser probe ('Ask before every world', 14 Oct 2026): the main screen's question after every ordinary Tell.
//
//   node hushmallow/tools/askall-probe.cjs <scenario> W H [rm] [port=8263] [out=DIR]
//
// The repo root must be served (python3 -m http.server <port> from it). Scenarios:
//   slice     squeeze → Tell (Angry) → the question → Play → Thought Mallow → the Static Storm → Drift on → the ocean → Finish
//   be-home   Tell → the question → Just be with it → the quiet choice → Somewhere calm (the ocean, gentle, no words)
//   stay-home Tell → the question → Just be with it → Stay here quietly; a squeeze after says nothing
//   be-storm  Tell (Angry) → Play → storm; a new Tell in the storm → it pauses → Just be with it → Somewhere calm (gentle melt)
//   stay-storm the same → Stay here quietly (the storm ends quietly)
//   ignore    Tell → the question, left 21 s → nothing made, quiet face, a squeeze says nothing, Tell still there
//   death     a death typed (one Support control while typing at 320) → Send → gentle, no question
//   crisis    crisis words → the urgent sheet, no question, nothing made
//   care      care words → the support line and the quiet choice, no question
//   scrim     Loomi's bright sky: a line 200 ms after load, its scrim at +60 ms and +1 s (close-ups, deviceScaleFactor 2)
// Prints one JSON line ("RESULT {...}") and writes screenshots to out. Playwright from /opt/node-tools; Chromium at
// /opt/pw-browsers/chromium (never playwright install). Touch via CDP.
const { createRequire } = require('module');
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');

const argv = process.argv.slice(2);
const SCEN = argv[0] || 'slice', W = +argv[1] || 390, H = +argv[2] || 844, RM = argv.includes('rm');
const opt = (k, d) => { const a = argv.find((x) => x.startsWith(`${k}=`)); return a ? a.slice(k.length + 1) : d; };
const PORT = +opt('port', 8263);
const OUT = opt('out', path.join(os.tmpdir(), 'askall-probe'));
const MALLOW = opt('mallow', SCEN === 'scrim' ? 'loomi' : null);
const BASE = `http://127.0.0.1:${PORT}/hushmallow/index.html`;
const TAG = `${SCEN}-${W}x${H}${RM ? '-rm' : ''}${MALLOW ? `-${MALLOW}` : ''}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shots = [];
const res = { scen: SCEN, W, H, RM, fails: [], notes: {} };
const fail = (k, v) => { res.fails.push({ k, v }); console.log('FAIL', k, JSON.stringify(v ?? null).slice(0, 400)); };
const check = (ok, k, v) => { if (!ok) fail(k, v); return ok; };

async function open(browser, { dsf = 1 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: dsf, hasTouch: true, isMobile: true, reducedMotion: RM ? 'reduce' : 'no-preference' });
  const errors = [];
  const prefs = { ...(RM ? { motion: 'reduced' } : {}), ...(MALLOW ? { mallow: MALLOW } : {}) };
  await ctx.addInitScript(({ prefs }) => {
    try {
      if (!sessionStorage.getItem('aa:seeded')) {
        sessionStorage.setItem('aa:seeded', '1');
        for (const k of Object.keys(localStorage)) if (/flow|progress|garden/i.test(k)) localStorage.removeItem(k);
        localStorage.setItem('hm2:entitlement', JSON.stringify({ tier: 'paid', source: 'test', since: Date.now() }));
        if (Object.keys(prefs).length) localStorage.setItem('hm2:prefs', JSON.stringify(prefs));
      }
    } catch { /* storage blocked */ }
  }, { prefs });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push({ kind: 'pageerror', text: String((e && e.stack) || e) }));
  page.on('console', (m) => { if (m.type() === 'error') errors.push({ kind: 'console', text: m.text() }); });
  page.on('response', (r) => { if (r.status() >= 400) errors.push({ kind: 'http', text: `${r.status()} ${r.url()}` }); });
  const cdp = await ctx.newCDPSession(page);
  return { ctx, page, cdp, errors };
}
let tid = 10;
const touch = (o, type, pts) => o.cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
async function tap(o, x, y, hold = 60) { const id = ++tid; await touch(o, 'touchStart', [{ x, y, id }]); await sleep(hold); await touch(o, 'touchEnd', []); }
async function tapSel(o, sel, timeout = 10000) {
  const el = await o.page.waitForSelector(sel, { state: 'visible', timeout });
  const b = await el.boundingBox();
  await tap(o, b.x + b.width / 2, b.y + b.height / 2);
}
async function tapButton(o, sel, re) {
  for (const bb of await o.page.$$(sel)) {
    if (!re.test(await bb.textContent())) continue;
    const r = await bb.boundingBox();
    if (!r || !r.width) continue;
    await tap(o, r.x + r.width / 2, r.y + r.height / 2); return true;
  }
  return false;
}
const waitFor = async (page, fn, arg, timeout = 20000) => { try { await page.waitForFunction(fn, arg, { timeout, polling: 50 }); return true; } catch { return false; } };
async function shot(o, name, clip = null) { const p = path.join(OUT, 'shots', `${TAG}-${name}.png`); fs.mkdirSync(path.dirname(p), { recursive: true }); await o.page.screenshot({ path: p, ...(clip ? { clip } : {}) }); shots.push(p); return p; }

async function boot(o) {
  await o.page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await o.page.waitForFunction(() => window.__hushfold?.touch?.ready && window.__hushfold?.mallow?.bodyRect?.(), null, { timeout: 30000 });
  // every line the stage shows, as it shows it (text, who), and when
  await o.page.evaluate(() => {
    const log = window.__aaLines = [];
    const seen = new WeakSet();
    new MutationObserver(() => {
      for (const n of document.querySelectorAll('.hf-subs .hf-sub')) {
        if (seen.has(n)) continue; seen.add(n);
        log.push({ t: Math.round(performance.now()), who: n.querySelector('.who')?.firstChild?.textContent || '', text: n.querySelector('.text')?.textContent || '' });
      }
    }).observe(document.body, { subtree: true, childList: true });
  });
}
const linesSince = (page, t0) => page.evaluate((t0) => window.__aaLines.filter((l) => l.t >= t0), t0);
const now = (page) => page.evaluate(() => performance.now());
const state = (page) => page.evaluate(() => {
  const Hf = window.__hushfold, f = Hf.flow?.state || null;
  const vis = (el) => !!el && !el.hidden && getComputedStyle(el).opacity > 0.05 && getComputedStyle(el).visibility !== 'hidden' && el.getBoundingClientRect().height > 0;
  const supports = [...document.querySelectorAll('.hf-dock .hf-pill.support, .hf-input .support')].filter((e) => vis(e) && !e.closest('[inert]') && !e.inert);
  return {
    thoughts: (Hf.thoughts?.list || []).filter((t) => !t.leaving).length,
    world: f && f.phase !== 'finished' ? { id: f.worldId, phase: f.phase, paused: !!f.paused, gentle: !!f.gentle } : null,
    inWorld: document.querySelector('.hushfold')?.classList.contains('hf-world') || false,
    face: Hf.touch?.rig?.stage || null,
    supportPill: vis(document.querySelector('.hf-dock .hf-pill.support')),
    supportControls: supports.length,
    pausedPill: vis(document.querySelector('.hf-pill.paused')),
    tellPill: vis(document.querySelector('[data-hf=tell]')),
    level: Hf.S.level, soft: !!Hf.S.soft, asking: !!Hf.S.asking, hold: Hf.S.hold || null,
    chips: [...document.querySelectorAll('.hf-subs .hf-chips:not([hidden]) .hf-chip')].map((b) => { const r = b.getBoundingClientRect(); return { label: b.textContent, w: Math.round(r.width), h: Math.round(r.height), primary: b.classList.contains('primary'), tag: b.tagName }; }),
    live: document.querySelector('.hf-sublive')?.textContent || '',
    liveAttr: document.querySelector('.hf-sublive')?.getAttribute('aria-live') || null,
    sheet: !!document.querySelector('#sheet-root .sheet.open'),
  };
});

async function typeTell(o, text, { chip = false, send = true } = {}) {
  await o.page.evaluate(() => window.__hushfold.openTell());
  await o.page.waitForSelector('.hf-input textarea', { state: 'visible', timeout: 10000 });
  await o.page.focus('.hf-input textarea');
  await o.page.keyboard.type(text, { delay: 6 });
  await sleep(700);
  if (chip) {
    try { await o.page.waitForSelector('.hf-input .hf-opt.suggested', { state: 'visible', timeout: 4000 }); await o.page.$eval('.hf-input .hf-opt.suggested', (e) => e.scrollIntoView({ inline: 'center', block: 'nearest' })); await sleep(250); await tapSel(o, '.hf-input .hf-opt.suggested'); } catch { /* no suggestion */ }
    await sleep(300);
  }
  if (send) await tapSel(o, '.hf-input .hf-send:not([disabled])');
}
const QUESTION = 'Shall we play with this, or just be with it?';
async function waitQuestion(o, label) {
  const ok = await waitFor(o.page, (q) => [...document.querySelectorAll('.hf-subs .hf-chips:not([hidden]) .hf-chip')].some((b) => b.textContent === 'Play with it')
    && document.querySelector('.hf-subs .hf-sub .text')?.textContent === q, QUESTION, 8000);
  check(ok, `${label}: the question shows`, await state(o.page));
  await sleep(RM ? 300 : 800);
  const s = await state(o.page);
  check(s.chips.length === 2 && s.chips[0].label === 'Play with it' && s.chips[0].primary && s.chips[1].label === 'Just be with it', `${label}: two chips, Play first`, s.chips);
  check(s.chips.every((c) => c.h >= 44 && c.tag === 'BUTTON'), `${label}: real 44 px buttons`, s.chips);
  check(s.live.includes(QUESTION) && s.liveAttr === 'polite', `${label}: announced`, s.live);
  check(s.face === 'concerned', `${label}: attentive face`, s.face);
  check(s.asking, `${label}: S.asking`, s);
  res.notes[`${label}Q`] = s;
  return s;
}
const tapChip = (o, label) => tapButton(o, '.hf-subs .hf-chips:not([hidden]) .hf-chip', new RegExp(`^${label}$`));
async function squeeze(o) { const b = await o.page.evaluate(() => { const r = window.__hushfold.mallow.bodyRect(); return { x: r.cx ?? r.left + r.width / 2, y: (r.cy ?? r.top + r.height / 2) }; }); await tap(o, b.x, b.y, 500); }
async function quietSqueeze(o, label) {
  await sleep(600);
  const t0 = await now(o.page);
  await squeeze(o); await sleep(300); await squeeze(o); await sleep(300); await squeeze(o);
  await sleep(2600);
  const l = await linesSince(o.page, t0);
  check(l.length === 0, `${label}: squeezes say nothing`, l);
  const s = await state(o.page);
  check(s.face === 'concerned', `${label}: face stays quiet`, s.face);
}
async function toStorm(o) {
  await typeTell(o, 'I am so angry my boss ignored me again', { chip: true });
  await waitQuestion(o, 'storm');
  await tapChip(o, 'Play with it');
  const ok = await waitFor(o.page, () => window.__hushfold.flow?.state?.phase === 'playing' && window.__hushfold.flow.state.worldId === 'static-storm', null, 25000);
  if (!ok) throw new Error('the storm never played');
  await sleep(3500);
}

async function scenSlice(o) {
  const { page } = o;
  await sleep(1200);
  await squeeze(o); await sleep(1500);
  const first = await linesSince(page, 0);
  check(first.length > 0, 'a squeeze line at first (ordinary visit)', first);
  await typeTell(o, 'I am so angry my boss ignored me again', { chip: true });
  const q = await waitQuestion(o, 'slice');
  check(q.thoughts === 0 && !q.world, 'nothing made before the answer', q);
  await shot(o, '01-question');
  // a squeeze while it waits: the question stays, no line
  const t0 = await now(page);
  await squeeze(o); await sleep(1200);
  const during = (await linesSince(page, t0)).filter((l) => l.text !== QUESTION);
  check(during.length === 0, 'no squeeze line while asking', during);
  await tapChip(o, 'Play with it');
  const th = await waitFor(page, () => (window.__hushfold.thoughts?.list || []).length > 0, null, 6000);
  check(th, 'Play: a Thought Mallow of the words');
  await sleep(RM ? 600 : 1200);
  await shot(o, '02-thought');
  const ok = await waitFor(page, () => window.__hushfold.flow?.state?.phase === 'playing' && window.__hushfold.flow.state.worldId === 'static-storm', null, 25000);
  check(ok, 'Play: the Static Storm plays', await state(page));
  await sleep(4000);
  await shot(o, '03-storm');
  const s1 = await state(page);
  check(s1.thoughts >= 1 && !s1.world?.paused && !s1.soft, 'storm: the words in it, playing, not soft', s1);
  await page.evaluate(() => window.__hushfold.flow.next());
  const oc = await waitFor(page, () => window.__hushfold.flow?.state?.phase === 'playing' && window.__hushfold.flow.state.worldId === 'luminous-ocean', null, 25000);
  check(oc, 'Drift on: the ocean plays');
  await sleep(4000);
  const ocLines = await linesSince(page, 0);
  res.notes.oceanLines = ocLines.slice(-4);
  await tapSel(o, '[data-hf=panel-handle]'); await sleep(1100);
  check(await tapButton(o, '.hf-panel button.hf-ghost', /Finish/), 'the panel has Finish');
  const home = await waitFor(page, () => !document.querySelector('.hushfold')?.classList.contains('hf-world'), null, 10000);
  check(home, 'Finish: home again');
  await sleep(3800);
  const bye = await linesSince(page, 0);
  res.notes.goodbye = bye.slice(-2);
  check(bye.some((l) => /Thank you for spending this with me|All done|lovely|bye/i.test(l.text)), 'a goodbye line', bye.slice(-3));
  await shot(o, '04-home');
}

async function scenBeHome(o, { stay = false } = {}) {
  const { page } = o;
  await sleep(1000);
  await typeTell(o, 'I keep thinking about the weekend');
  await waitQuestion(o, 'home');
  await shot(o, '01-question');
  const t0 = await now(page);
  await tapChip(o, 'Just be with it');
  const ch = await waitFor(page, () => [...document.querySelectorAll('.hf-subs .hf-chips:not([hidden]) .hf-chip')].some((b) => b.textContent === 'Stay here quietly'), null, 12000);
  check(ch, 'the quiet choice follows');
  await sleep(RM ? 300 : 900);
  const s = await state(page);
  const l = await linesSince(page, t0);
  res.notes.beLines = l;
  check(l.some((x) => x.text === 'Okay. Let’s just be with it for a while.'), 'the gentle line', l);
  check(!l.some((x) => /Support|support/.test(x.text)), 'no support pitch', l);
  check(s.thoughts === 0 && !s.world && !s.supportPill && s.soft && s.level === 'none', 'no Thought Mallow, no world, no Support pill; soft', s);
  check(s.chips.map((c) => c.label).join('|') === 'Stay here quietly|Somewhere calm, with Loomi', 'the quiet choice', s.chips);
  await shot(o, '02-quiet-choice');
  if (stay) {
    const t1 = await now(page);
    await tapChip(o, 'Stay here quietly');
    await sleep(3000);
    const l2 = await linesSince(page, t1);
    res.notes.stayLines = l2;
    const s2 = await state(page);
    check(!s2.world && s2.thoughts === 0, 'stay: nothing starts', s2);
    await quietSqueeze(o, 'after stay');
    check((await state(page)).tellPill, 'the Tell pill stays');
    return;
  }
  const t1 = await now(page);
  await tapChip(o, 'Somewhere calm, with Loomi');
  const ok = await waitFor(page, () => window.__hushfold.flow?.state?.phase === 'playing' && window.__hushfold.flow.state.worldId === 'luminous-ocean', null, 25000);
  check(ok, 'somewhere calm: the ocean plays');
  await sleep(6000);
  const s3 = await state(page);
  check(s3.world?.gentle && s3.thoughts === 0, 'a gentle session, no words in it', s3);
  const l3 = await linesSince(page, t1);
  res.notes.oceanLines = l3;
  check(!l3.some((x) => /storm became a sea|Open water|Splashy/.test(x.text)), 'no playful ocean line', l3);
  check(l3.some((x) => /Somewhere quiet|quieter here/.test(x.text)), 'the gentle intro', l3);
  await shot(o, '03-ocean');
}

async function scenBeStorm(o, { stay = false } = {}) {
  const { page } = o;
  await sleep(1000);
  await toStorm(o);
  await typeTell(o, 'my nan is not doing so well');
  const q = await waitQuestion(o, 'in-storm');
  check(q.world?.paused && !q.pausedPill, 'the storm waits under its veil while asking (no Paused pill)', q);
  // it stays paused while asking (review P3: it kept playing for 20 s)
  await sleep(3000);
  const q2 = await state(page);
  check(q2.world?.paused && q2.asking, 'still paused 3 s on', q2);
  await shot(o, '01-question');
  const t0 = await now(page);
  await tapChip(o, 'Just be with it');
  const ch = await waitFor(page, () => [...document.querySelectorAll('.hf-subs .hf-chips:not([hidden]) .hf-chip')].some((b) => b.textContent === 'Stay here quietly'), null, 12000);
  check(ch, 'the quiet choice follows');
  await sleep(600);
  const s = await state(page);
  check(s.world?.paused && !s.pausedPill && s.hold === 'quiet' && !s.supportPill, 'held quietly, no Resume pill, no Support pill', s);
  res.notes.beLines = await linesSince(page, t0);
  await shot(o, '02-quiet-choice');
  if (stay) {
    await tapChip(o, 'Stay here quietly');
    const home = await waitFor(page, () => !document.querySelector('.hushfold')?.classList.contains('hf-world'), null, 10000);
    check(home, 'stay: the storm ends quietly');
    await sleep(3500);
    const s2 = await state(page);
    check(!s2.world && !s2.pausedPill, 'home, nothing to resume', s2);
    const l = await linesSince(page, t0);
    res.notes.after = l.slice(-2);
    check(l.some((x) => x.text === 'Okay. I’m right here. Squeeze me whenever you like.'), 'the quiet line', l.slice(-3));
    check(!l.some((x) => /All done/.test(x.text)), 'no cheery goodbye', l.slice(-3));
    await shot(o, '03-home');
    return;
  }
  const t1 = await now(page);
  await tapChip(o, 'Somewhere calm, with Loomi');
  const ok = await waitFor(page, () => window.__hushfold.flow?.state?.phase === 'playing' && window.__hushfold.flow.state.worldId === 'luminous-ocean' && !window.__hushfold.flow.state.paused, null, 25000);
  check(ok, 'somewhere calm: melts into the ocean');
  await sleep(5000);
  const l = await linesSince(page, t1);
  res.notes.oceanLines = l;
  check(!l.some((x) => /storm became a sea|Open water|Splashy/.test(x.text)), 'never "Ahh. The storm became a sea."', l);
  check(l.some((x) => /quieter here|Somewhere quiet/.test(x.text)), 'a gentle line', l);
  const s3 = await state(page);
  check(s3.world?.gentle, 'gentle session', s3);
  await shot(o, '03-ocean');
}

async function scenIgnore(o) {
  const { page } = o;
  await sleep(1000);
  await typeTell(o, 'I keep thinking about the weekend');
  await waitQuestion(o, 'ignore');
  const t0 = await now(page);
  await sleep(21500);
  const s = await state(page);
  check(!s.asking && s.chips.length === 0, 'the question went', s);
  check(s.thoughts === 0 && !s.world && s.soft && s.face === 'concerned' && s.tellPill && !s.supportPill, 'nothing made, quiet face, Tell there, no Support', s);
  const l = (await linesSince(page, t0)).filter((x) => x.text !== QUESTION);
  check(l.length === 0, 'nothing said', l);
  await quietSqueeze(o, 'after ignore');
  await shot(o, '01-after');
}

async function scenDeath(o) {
  const { page } = o;
  await sleep(1000);
  await typeTell(o, 'my dad died last week and I miss him', { send: false });
  await sleep(1200);
  const typing = await state(page);
  res.notes.typing = typing;
  check(typing.supportControls === 1, 'one Support control while typing', typing);
  await shot(o, '01-typing');
  const t0 = await now(page);
  await tapSel(o, '.hf-input .hf-send:not([disabled])');
  await sleep(2500);
  const s = await state(page);
  check(!s.asking && !s.chips.some((c) => c.label === 'Play with it'), 'no question', s);
  const ch = await waitFor(page, () => [...document.querySelectorAll('.hf-subs .hf-chips:not([hidden]) .hf-chip')].some((b) => b.textContent === 'Stay here quietly'), null, 12000);
  check(ch, 'the gentle choice');
  const s2 = await state(page);
  check(s2.thoughts === 0 && !s2.world && s2.supportPill && s2.level === 'concern', 'gentle: no Thought Mallow, no world, Support pill', s2);
  const l = await linesSince(page, t0);
  res.notes.lines = l;
  check(l.some((x) => /Support is right here too/.test(x.text)) && !l.some((x) => x.text === QUESTION), 'support line, never the question', l);
  await shot(o, '02-gentle');
  // somewhere calm: the ocean opens gently
  const t1 = await now(page);
  await tapChip(o, 'Somewhere calm, with Loomi');
  const ok = await waitFor(page, () => window.__hushfold.flow?.state?.phase === 'playing' && window.__hushfold.flow.state.worldId === 'luminous-ocean', null, 25000);
  check(ok, 'the calm ocean');
  await sleep(6000);
  const l2 = await linesSince(page, t1);
  res.notes.oceanLines = l2;
  check(!l2.some((x) => /storm became a sea|Open water|Splashy/.test(x.text)) && l2.some((x) => /Somewhere quiet|quieter here/.test(x.text)), 'the ocean opens gently', l2);
  await shot(o, '03-ocean');
}

async function scenCrisis(o) {
  const { page } = o;
  await sleep(1000);
  await typeTell(o, 'I want to die', { send: false });
  const sheet = await waitFor(page, () => !!document.querySelector('#sheet-root .sheet.open'), null, 6000);
  check(sheet, 'the urgent sheet while typing');
  await shot(o, '01-sheet');
  await page.keyboard.press('Escape'); await sleep(800);
  if (await page.$('.hf-input .hf-send:not([disabled])')) { await tapSel(o, '.hf-input .hf-send:not([disabled])'); }
  await sleep(3000);
  const s = await state(page);
  check(!s.asking && s.thoughts === 0 && !s.world && s.level === 'crisis' && s.supportPill, 'crisis: no question, nothing made, Support', s);
  const l = await linesSince(page, 0);
  res.notes.lines = l;
  check(!l.some((x) => x.text === QUESTION), 'never the question', l);
  await shot(o, '02-after');
}

async function scenCare(o) {
  const { page } = o;
  await sleep(1000);
  const t0 = await now(page);
  await typeTell(o, 'he hit me again last night');
  const ch = await waitFor(page, () => [...document.querySelectorAll('.hf-subs .hf-chips:not([hidden]) .hf-chip')].some((b) => b.textContent === 'Stay here quietly'), null, 12000);
  check(ch, 'care: the gentle choice');
  const s = await state(page);
  const l = await linesSince(page, t0);
  res.notes.lines = l;
  check(!l.some((x) => x.text === QUESTION) && l.some((x) => /isn’t yours to fix alone/.test(x.text)), 'the care line, never the question', l);
  check(s.thoughts === 0 && !s.world && s.level === 'care' && s.supportPill, 'care: nothing made, Support', s);
  await shot(o, '01-care');
}

async function scenScrim(o) {
  const { page } = o;
  // a line just after the Hushfold opens (the realm still fading in): its scrim from its very first frame
  await sleep(200);
  await squeeze(o);
  const ok = await waitFor(page, () => !!document.querySelector('.hf-subs .hf-sub'), null, 4000);
  check(ok, 'a line');
  await sleep(60);
  const read = () => page.evaluate(() => { const n = document.querySelector('.hf-subs .hf-sub'); if (!n) return null; const r = n.getBoundingClientRect(); return { scrim: n.style.getPropertyValue('--hf-scrim'), hot: n.style.getPropertyValue('--hf-hot-a'), fresh: n.classList.contains('fresh'), r: { x: r.left, y: r.top, w: r.width, h: r.height } }; });
  const a = await read();
  res.notes.at60 = a;
  const clip = a ? { x: Math.max(0, a.r.x - 60), y: Math.max(0, a.r.y - 50), width: Math.min(W - Math.max(0, a.r.x - 60), a.r.w + 120), height: a.r.h + 100 } : null;
  if (clip) await shot(o, '01-line-60ms', clip);
  await sleep(940);
  const b = await read();
  res.notes.at1s = b;
  if (clip) await shot(o, '02-line-1s', clip);
  check(a && b && Math.abs(+a.scrim - +b.scrim) < 0.08, 'the scrim is right from the first look (no later deepening by much)', { a, b });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] });
  let o = null;
  try {
    o = await open(browser, { dsf: SCEN === 'scrim' ? 2 : 1 });
    await boot(o);
    const S = { slice: scenSlice, 'be-home': scenBeHome, 'stay-home': (x) => scenBeHome(x, { stay: true }), 'be-storm': scenBeStorm, 'stay-storm': (x) => scenBeStorm(x, { stay: true }),
      ignore: scenIgnore, death: scenDeath, crisis: scenCrisis, care: scenCare, scrim: scenScrim }[SCEN];
    if (!S) throw new Error(`unknown scenario ${SCEN}`);
    await S(o);
  } catch (e) { fail('exception', String(e?.stack || e).slice(0, 600)); }
  res.errors = o ? o.errors.filter((e) => !/favicon/.test(e.text)) : [];
  if (res.errors.length) fail('console errors', res.errors.slice(0, 5));
  res.shots = shots;
  await browser.close();
  console.log('RESULT', JSON.stringify(res));
  process.exit(0);
})();
