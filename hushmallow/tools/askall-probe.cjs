// Browser probe ('Ask before every world', 14 Oct 2026): the main screen's question after every ordinary Tell.
//
//   node hushmallow/tools/askall-probe.cjs <scenario> W H [rm] [port=8263] [out=DIR]
//
// The repo root must be served (python3 -m http.server <port> from it). Scenarios:
//   slice     squeeze → Tell (Angry) → the question → Play → Thought Mallow → the Static Storm → Drift on → the ocean → Finish
//   be-home   Tell → the question → Just be with it → one line + the one soft chip → Somewhere calm (the ocean, gentle, no words)
//   stay-home Tell → the question → Just be with it → the soft chip fades (~12 s), nothing starts; a squeeze after says nothing
//   be-storm  Tell (Angry) → Play → storm; a new Tell in the storm → it pauses, postcards folded → Just be with it → one
//             line + the soft chip → Somewhere calm (gentle melt)
//   stay-storm the same → the soft chip fades: the storm ends quietly (home)
//   ignore    Tell → the question, left 46 s → nothing made, quiet face, a squeeze says nothing; the Tell opens with the words
//   back      Tell → the question → Back (history) closes it like no answer; the Tell opens with the words
//   hidden    Tell → the question → the page hidden 47 s → still asking; seen again → still asking
//   keys      Tell sent with Enter → the focus is on "Play with it" → Tab → Enter on "Just be with it" → focus on the Tell button
//   ignore-storm  storm → a new Tell → the question left 46 s → the storm stays paused with its Resume pill; Resume plays it
//   race-arrive   Tell → Play → a second Tell sent in the beat → the first world arrives under the question: paused, folded
//   race-tell     Tell → Play → the Tell opened 120 ms later → Play kept (a Thought Mallow, no second question)
//   soft-play     a quiet visit (Back over the question), then Play for new words: soft ends, the ordinary goodbye
//   noplan        free tier: Tell → Play → plans → Back → Tell me again → Send unchanged → the plans page again, not asked
//   layout        storm → a new Tell → the question and the soft chip never over a postcard or the Thought Mallow
//   from-angle    back from Another Angle with { safety: { level: 'none' } } and { soft: true }: no Support pill; a Tell is asked
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
const FREE = SCEN === 'noplan';
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
  await ctx.addInitScript(({ prefs, free }) => {
    try {
      if (!sessionStorage.getItem('aa:seeded')) {
        sessionStorage.setItem('aa:seeded', '1');
        for (const k of Object.keys(localStorage)) if (/flow|progress|garden/i.test(k)) localStorage.removeItem(k);
        if (!free) localStorage.setItem('hm2:entitlement', JSON.stringify({ tier: 'paid', source: 'test', since: Date.now() }));
        else localStorage.removeItem('hm2:entitlement');
        if (Object.keys(prefs).length) localStorage.setItem('hm2:prefs', JSON.stringify(prefs));
      }
    } catch { /* storage blocked */ }
  }, { prefs, free: FREE });
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
    focus: document.activeElement?.textContent?.trim()?.slice(0, 40) || document.activeElement?.tagName || null,
    focusHf: document.activeElement?.getAttribute?.('data-hf') || null,
    folded: document.body.classList.contains('hf-ask-fold'),
    front: (() => { const c = document.querySelector('#fx-layer > canvas.hf-front'); return c ? +getComputedStyle(c).opacity : null; })(),
    label: document.querySelector('.hf-touch[aria-label], .hf-touch [aria-label]')?.getAttribute('aria-label')?.split('.')[0] || null,
  };
});
/** The question's (or a choice's) line and chips, the world's postcards and the person's thoughts, as on screen now. */
const geometry = (page) => page.evaluate(() => {
  const Hf = window.__hushfold, R = (r) => ({ l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom) });
  const line = document.querySelector('.hf-subs .hf-sub'), chips = [...document.querySelectorAll('.hf-subs .hf-chips:not([hidden]) .hf-chip')];
  const mine = [line, ...chips].filter(Boolean).map((e) => R(e.getBoundingClientRect()));
  const world = (Hf.flow?.avoid?.() || []).map((a) => ({ kind: a.kind, l: Math.round(a.x), t: Math.round(a.y), r: Math.round(a.x + a.w), b: Math.round(a.y + a.h) }));
  const thoughts = (Hf.thoughts?.rects?.() || []).map((r) => ({ kind: 'thought-layer', ...R(r) }));
  const hit = (a, b) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
  const over = [];
  for (const m of mine) for (const w of [...world, ...thoughts]) if (hit(m, w)) over.push({ mine: m, what: w });
  const folded = document.body.classList.contains('hf-ask-fold'), thoughtFolded = document.body.classList.contains('hf-ask-fold-thought');
  // (what is folded away under the veil is not seen: a line over it is over nothing)
  const seen = over.filter((x) => (x.what.kind === 'card' || x.what.kind === 'bubble' ? !folded : !thoughtFolded));
  return { mine, world, thoughts, over, seen, folded, thoughtFolded };
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
  check(s.chips.length === 2 && s.chips[0].label === 'Play with it' && s.chips[1].label === 'Just be with it', `${label}: two chips, Play first`, s.chips);
  check(!s.chips.some((c) => c.primary), `${label}: equal weight (neither primary)`, s.chips);
  check(s.focus === 'Play with it', `${label}: the focus is on the first choice`, s.focus);
  check(s.label && !/sad/.test(s.label), `${label}: the Mallow's label is attentive, never "sad"`, s.label);
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

const BE = 'Okay. Let’s just be with it for a while.';
const softChip = (page) => waitFor(page, () => { const c = [...document.querySelectorAll('.hf-subs .hf-chips:not([hidden]):not(.out) .hf-chip')]; return c.length === 1 && c[0].textContent === 'Somewhere calm'; }, null, 12000);
/** After "Just be with it": the one gentle line with the one soft chip — never a second question. */
async function checkSoft(o, label, t0) {
  const { page } = o;
  check(await softChip(page), `${label}: one line with the single soft chip`, await state(page));
  await sleep(RM ? 300 : 900);
  const s = await state(page);
  const l = await linesSince(page, t0);
  res.notes[`${label}BeLines`] = l;
  check(l.some((x) => x.text === BE), `${label}: the gentle line`, l);
  check(!l.some((x) => /\?$/.test(x.text) && x.text !== QUESTION), `${label}: no second question`, l);
  check(!l.some((x) => /Support|support|stay here quietly/i.test(x.text)), `${label}: no support pitch, no second choice`, l);
  check(s.chips.length === 1 && s.chips[0].label === 'Somewhere calm' && s.chips[0].h >= 44, `${label}: the one soft chip`, s.chips);
  check(s.thoughts === 0 && !s.supportPill && s.soft && s.level === 'none', `${label}: no Thought Mallow, no Support pill; soft`, s);
  return s;
}
async function scenBeHome(o, { stay = false } = {}) {
  const { page } = o;
  await sleep(1000);
  await typeTell(o, 'I keep thinking about the weekend');
  await waitQuestion(o, 'home');
  await shot(o, '01-question');
  const t0 = await now(page);
  await tapChip(o, 'Just be with it');
  const s = await checkSoft(o, 'home', t0);
  check(!s.world, 'home: no world', s);
  check(s.focusHf === 'tell', 'home: the focus is back on the Tell button', s.focus);
  await shot(o, '02-soft-chip');
  if (stay) {
    // the chip fades by itself after ~12 s; nothing starts (staying is the default)
    const gone = await waitFor(page, () => !document.querySelector('.hf-subs .hf-chips:not([hidden]) .hf-chip'), null, 16000);
    check(gone, 'stay: the soft chip fades by itself');
    await sleep(1500);
    const s2 = await state(page);
    check(!s2.world && s2.thoughts === 0, 'stay: nothing starts', s2);
    res.notes.stayLines = (await linesSince(page, t0)).map((x) => x.text);
    await quietSqueeze(o, 'after stay');
    check((await state(page)).tellPill, 'the Tell pill stays');
    await shot(o, '03-after');
    return;
  }
  const t1 = await now(page);
  await tapChip(o, 'Somewhere calm');
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
  check(q.folded && q.front < 0.05, 'the postcards fold away while asking', q);
  await sleep(3000);
  const q2 = await state(page);
  check(q2.world?.paused && q2.asking, 'still paused 3 s on', q2);
  const g = await geometry(page);
  res.notes.questionGeometry = g;
  check(g.seen.length === 0, 'the question never over a postcard or the Thought Mallow that can be seen', g.seen);
  await shot(o, '01-question');
  const t0 = await now(page);
  await tapChip(o, 'Just be with it');
  const s = await checkSoft(o, 'storm', t0);
  check(s.world?.paused && !s.pausedPill && s.hold === 'quiet' && s.folded, 'held quietly, no Resume pill, postcards still folded', s);
  const g2 = await geometry(page);
  res.notes.softGeometry = g2;
  check(g2.seen.length === 0, 'the soft chip never over a postcard or the Thought Mallow that can be seen', g2.seen);
  await shot(o, '02-soft-chip');
  if (stay) {
    // the chip fades: the storm ends quietly, the person's own Mallow comes home
    const home = await waitFor(page, () => !document.querySelector('.hushfold')?.classList.contains('hf-world'), null, 20000);
    check(home, 'the soft chip let go: the storm ends quietly');
    await sleep(3500);
    const s2 = await state(page);
    check(!s2.world && !s2.pausedPill && !s2.folded, 'home, nothing to resume, nothing folded', s2);
    const l = await linesSince(page, t0);
    res.notes.after = l.map((x) => x.text);
    check(!l.some((x) => /All done/.test(x.text)), 'no cheery goodbye', l.slice(-3));
    await shot(o, '03-home');
    return;
  }
  const t1 = await now(page);
  await tapChip(o, 'Somewhere calm');
  const ok = await waitFor(page, () => window.__hushfold.flow?.state?.phase === 'playing' && window.__hushfold.flow.state.worldId === 'luminous-ocean' && !window.__hushfold.flow.state.paused, null, 25000);
  check(ok, 'somewhere calm: melts into the ocean');
  await sleep(5000);
  const l = await linesSince(page, t1);
  res.notes.oceanLines = l;
  check(!l.some((x) => /storm became a sea|Open water|Splashy/.test(x.text)), 'never "Ahh. The storm became a sea."', l);
  check(l.some((x) => /quieter here|Somewhere quiet/.test(x.text)), 'a gentle line', l);
  const s3 = await state(page);
  check(s3.world?.gentle && !s3.folded, 'gentle session, the front layer back', s3);
  await shot(o, '03-ocean');
}

const WORDS = 'I keep replaying the meeting where I froze';
async function reopenHasWords(o, label, want = WORDS) {
  await o.page.evaluate(() => window.__hushfold.openTell());
  await o.page.waitForSelector('.hf-input textarea', { state: 'visible', timeout: 10000 });
  await sleep(500);
  const v = await o.page.$eval('.hf-input textarea', (t) => t.value);
  check(v === want, `${label}: the Tell opens with the words`, v);
  return v;
}
async function scenIgnore(o) {
  const { page } = o;
  await sleep(1000);
  await typeTell(o, WORDS);
  await waitQuestion(o, 'ignore');
  const t0 = await now(page);
  await sleep(30000);
  check((await state(page)).asking, 'still asking at 30 s (the clock is ~45 s now)');
  await sleep(16500);
  const s = await state(page);
  check(!s.asking && s.chips.length === 0, 'the question went at ~45 s', s);
  check(s.thoughts === 0 && !s.world && s.soft && s.face === 'concerned' && s.tellPill && !s.supportPill, 'nothing made, quiet face, Tell there, no Support', s);
  check(s.focusHf === 'tell', 'the focus is on the Tell button', s.focus);
  const l = (await linesSince(page, t0)).filter((x) => x.text !== QUESTION);
  check(l.length === 0, 'nothing said', l);
  await quietSqueeze(o, 'after ignore');
  await shot(o, '01-after');
  await reopenHasWords(o, 'ignore');
  await shot(o, '02-reopen');
  // sent again: asked again, once
  await tapSel(o, '.hf-input .hf-send:not([disabled])');
  await waitQuestion(o, 'again');
}

async function scenBack(o) {
  const { page } = o;
  await sleep(1000);
  await typeTell(o, WORDS);
  await waitQuestion(o, 'back');
  await page.goBack();
  await sleep(1500);
  const s = await state(page);
  check(!s.asking && s.chips.length === 0 && s.thoughts === 0 && !s.world && s.soft, 'Back closed it: nothing made, quiet', s);
  check(page.url().includes('index.html'), 'still on the Hushfold', page.url());
  await reopenHasWords(o, 'back');
  await shot(o, '01-reopen');
}

async function scenHidden(o) {
  const { page } = o;
  await sleep(1000);
  await typeTell(o, WORDS);
  await waitQuestion(o, 'hidden');
  const setHidden = (h) => page.evaluate((h) => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => h }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') }); document.dispatchEvent(new Event('visibilitychange')); }, h);
  await sleep(2000);
  await setHidden(true);
  await sleep(47000);
  check((await state(page)).asking, 'hidden 47 s: the question still waits');
  await setHidden(false);
  await sleep(5000);
  const s = await state(page);
  check(s.asking && s.chips.length === 2, 'seen again: still asking (at least 15 s more)', s);
  res.notes.hidden = s;
}

async function scenKeys(o) {
  const { page } = o;
  await sleep(1000);
  await page.evaluate(() => window.__hushfold.openTell());
  await page.waitForSelector('.hf-input textarea', { state: 'visible', timeout: 10000 });
  await page.focus('.hf-input textarea');
  await page.keyboard.type(WORDS, { delay: 4 });
  await sleep(700);
  await page.keyboard.press('Enter');
  await waitQuestion(o, 'keys');
  await shot(o, '01-focus-play');
  await page.keyboard.press('Tab');
  await sleep(200);
  const s = await state(page);
  check(s.focus === 'Just be with it', 'Tab: the second choice', s.focus);
  const t0 = await now(page);
  await page.keyboard.press('Enter');
  const s2 = await checkSoft(o, 'keys', t0);
  check(s2.focusHf === 'tell', 'answered: the focus is back on the Tell button', s2.focus);
  await shot(o, '02-after');
}

async function scenIgnoreStorm(o) {
  const { page } = o;
  await sleep(1000);
  await toStorm(o);
  await typeTell(o, 'my nan is not doing so well');
  await waitQuestion(o, 'in-storm');
  await sleep(46500);
  const s = await state(page);
  check(!s.asking && s.world?.paused && s.pausedPill && s.thoughts === 1 && s.soft && !s.folded, 'the storm stays paused, its Resume pill there, unfolded, the new words not made', s);
  await shot(o, '01-paused');
  await tapSel(o, '.hf-pill.paused');
  const ok = await waitFor(page, () => window.__hushfold.flow?.state?.phase === 'playing' && !window.__hushfold.flow.state.paused, null, 6000);
  check(ok, 'Resume plays it again');
}

/** A Tell sent as fast as a person could (the words pasted). */
async function quickTell(o, text) {
  await o.page.evaluate(() => window.__hushfold.openTell());
  await o.page.waitForSelector('.hf-input textarea', { state: 'visible', timeout: 10000 });
  await o.page.fill('.hf-input textarea', text);
  await sleep(450);
  await tapSel(o, '.hf-input .hf-send:not([disabled])');
}
async function scenRaceArrive(o) {
  const { page } = o;
  await sleep(1000);
  await typeTell(o, 'I am so angry my boss ignored me again', { chip: true });
  await waitQuestion(o, 'first');
  await tapChip(o, 'Play with it');
  await sleep(300);
  // a second Tell sent in the Thought Mallow's beat, before the first world has arrived
  await quickTell(o, 'and the printer jammed again');
  await waitQuestion(o, 'second');
  const before = await state(page);
  res.notes.beforeArrive = before;
  // the first world arrives under the question: held under its veil, folded, the question still up
  const arrived = await waitFor(page, () => document.querySelector('.hushfold')?.classList.contains('hf-world'), null, 20000);
  check(arrived, 'the first world arrives meanwhile');
  const samples = [];
  for (let i = 0; i < 8; i++) { await sleep(1000); const s = await state(page); samples.push({ phase: s.world?.phase, paused: s.world?.paused, asking: s.asking, folded: s.folded }); }
  res.notes.samples = samples;
  check(samples.every((x) => x.asking && x.paused && x.folded), 'while asking, the arriving world never plays (8 s)', samples);
  await shot(o, '01-arrived-asking');
  await tapChip(o, 'Play with it');
  const ok = await waitFor(page, () => window.__hushfold.flow?.state?.phase === 'playing' && !window.__hushfold.flow.state.paused, null, 8000);
  check(ok, 'Play: the world plays, with the new words');
  await sleep(1500);
  const s = await state(page);
  check(s.thoughts >= 1 && !s.folded, 'the new words in it, the postcards back', s);
}

async function scenRaceTell(o) {
  const { page } = o;
  await sleep(1000);
  await typeTell(o, WORDS);
  await waitQuestion(o, 'race');
  const t0 = await now(page);
  await tapChip(o, 'Play with it');
  await sleep(120);
  // the Tell opened inside the line's fade (~0.4 s)
  await page.evaluate(() => window.__hushfold.openTell());
  await page.waitForSelector('.hf-input textarea', { state: 'visible', timeout: 10000 });
  const th = await waitFor(page, () => (window.__hushfold.thoughts?.list || []).length > 0, null, 6000);
  check(th, 'Play kept: a Thought Mallow of the words, with the Tell open');
  const v = await page.$eval('.hf-input textarea', (t) => t.value);
  check(v === '', 'the Tell opened empty (the words were played with)', v);
  await shot(o, '01-tell-open');
  await page.keyboard.press('Escape'); await sleep(1500);
  const ok = await waitFor(page, () => !!window.__hushfold.flow?.state?.worldId, null, 20000);
  check(ok, 'the world for those words comes');
  const l = (await linesSince(page, t0)).filter((x) => x.text === QUESTION);
  check(l.length === 0, 'never asked a second time', l);
}

async function scenNoPlan(o) {
  const { page } = o;
  await sleep(1000);
  await typeTell(o, WORDS);
  await waitQuestion(o, 'noplan');
  await tapChip(o, 'Play with it');
  const plans = await waitFor(page, () => /plans/.test(location.hash) || !!document.querySelector('[data-scene=plans], .plans'), null, 10000);
  check(plans, 'Play with no plan: the plans page');
  await sleep(1200);
  await page.goBack();
  const back = await waitFor(page, () => !!window.__hushfold?.touch?.ready, null, 20000);
  check(back, 'back on the Hushfold');
  const offer = await waitFor(page, () => [...document.querySelectorAll('.hf-subs .hf-chips:not([hidden]) .hf-chip')].some((b) => b.textContent === 'Tell me again'), null, 10000);
  check(offer, 'Tell me again is offered');
  await shot(o, '01-retell-offer');
  await page.evaluate(() => { window.__aaLines.length = 0; });
  await tapChip(o, 'Tell me again');
  await page.waitForSelector('.hf-input textarea', { state: 'visible', timeout: 10000 });
  await sleep(500);
  const v = await page.$eval('.hf-input textarea', (t) => t.value);
  check(v === WORDS, 'the words come back', v);
  await tapSel(o, '.hf-input .hf-send:not([disabled])');
  const plans2 = await waitFor(page, () => /plans/.test(location.hash), null, 8000);
  const l = (await page.evaluate(() => window.__aaLines)).filter((x) => x.text === QUESTION);
  check(plans2 && l.length === 0, 'sent unchanged: the plans page again, never asked the same words twice', { plans2, l });
}

async function scenSoftPlay(o) {
  // a quiet visit (the question closed with Back), then "Play with it" for new words: the quiet is over for that world
  const { page } = o;
  await sleep(1000);
  await typeTell(o, WORDS);
  await waitQuestion(o, 'first');
  await page.goBack();
  await sleep(1500);
  check((await state(page)).soft, 'Back: a quiet visit');
  await page.evaluate(() => window.__hushfold.openTell());
  await page.waitForSelector('.hf-input textarea', { state: 'visible', timeout: 10000 });
  await page.fill('.hf-input textarea', 'I am so angry my boss ignored me again');
  await sleep(700);
  await tapSel(o, '.hf-input .hf-send:not([disabled])');
  await waitQuestion(o, 'second');
  await tapChip(o, 'Play with it');
  const ok = await waitFor(page, () => window.__hushfold.flow?.state?.phase === 'playing', null, 25000);
  check(ok, 'Play: a world plays');
  await sleep(3000);
  const s = await state(page);
  res.notes.inWorld = s;
  check(!s.soft && s.face !== 'concerned' && !(await page.evaluate(() => window.__hush.state.hfSoft)), 'Play ended the quiet: soft off, the face ordinary', s);
  await tapSel(o, '[data-hf=panel-handle]'); await sleep(1100);
  check(await tapButton(o, '.hf-panel button.hf-ghost', /Finish/), 'the panel has Finish');
  await waitFor(page, () => !document.querySelector('.hushfold')?.classList.contains('hf-world'), null, 10000);
  await sleep(3800);
  const bye = await linesSince(page, 0);
  res.notes.goodbye = bye.slice(-2);
  check(bye.slice(-2).some((l) => /All done|Thank you for spending this with me/.test(l.text)), 'the ordinary goodbye', bye.slice(-3));
  check(!bye.slice(-2).some((l) => /I’m right here. Squeeze me/.test(l.text)), 'never the quiet goodbye', bye.slice(-3));
  await shot(o, '01-home');
}

async function scenLayout(o) {
  // the in-world question and the soft chip at this size: never over a postcard or the Thought Mallow
  await scenBeStorm(o, { stay: false });
}

async function scenFromAngle(o) {
  const { page } = o;
  await sleep(1200);
  for (const params of [{ safety: { level: 'none' } }, { soft: true }]) {
    await page.evaluate(() => window.__hush.go('settings'));
    await sleep(900);
    await page.evaluate((p) => window.__hush.go('home', p), params);
    await page.waitForFunction(() => window.__hushfold?.touch?.ready && window.__hushfold?.mallow?.bodyRect?.(), null, { timeout: 30000 });
    await sleep(1500);
    const s = await state(page);
    res.notes[`from-${Object.keys(params)[0]}`] = s;
    check(!s.supportPill && s.level === 'none' && !(await page.evaluate(() => window.__hushfold.S.careSaid)), `${JSON.stringify(params)}: no Support pill, no level, no careSaid`, s);
    if (params.soft) check(s.soft, 'soft: the quiet state only', s);
    await typeTell(o, 'I am so angry my boss ignored me again');
    await waitQuestion(o, `from-${Object.keys(params)[0]}`);
    await tapChip(o, 'Just be with it');
    await sleep(2500);
  }
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

async function scenScrimQ(o) {
  // the question's scrim on a bright home (Boppo's sun at 320: review r2 P3), close-up, with the bare home for reference
  const { page } = o;
  await sleep(3500);
  const clip = { x: 0, y: 0, width: W, height: Math.round(H * 0.45) };
  await page.evaluate(() => window.__hushfold.subtitles.clear?.());
  await sleep(800);
  await shot(o, '00-bare', clip);
  await typeTell(o, WORDS);
  await waitFor(page, (q) => document.querySelector('.hf-subs .hf-sub .text')?.textContent === q, QUESTION, 8000);
  const read = () => page.evaluate(() => { const n = [...document.querySelectorAll('.hf-subs .hf-sub')].pop(); if (!n) return null; const r = n.getBoundingClientRect();
    return { scrim: n.style.getPropertyValue('--hf-scrim'), hotA: n.style.getPropertyValue('--hf-hot-a'), hotR: n.style.getPropertyValue('--hf-hot-r'), hotCx: n.style.getPropertyValue('--hf-hot-cx'), hotCy: n.style.getPropertyValue('--hf-hot-cy'), edge: n.style.getPropertyValue('--hf-edge-a'), r: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) } }; });
  await sleep(150);
  res.notes.at150 = await read();
  await shot(o, '01-q-150ms', clip);
  await sleep(1500);
  res.notes.at1650 = await read();
  await shot(o, '02-q-1650ms', clip);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] });
  let o = null;
  try {
    o = await open(browser, { dsf: SCEN === 'scrim' || SCEN === 'scrim-q' ? 2 : 1 });
    await boot(o);
    const S = { slice: scenSlice, 'be-home': scenBeHome, 'stay-home': (x) => scenBeHome(x, { stay: true }), 'be-storm': scenBeStorm, 'stay-storm': (x) => scenBeStorm(x, { stay: true }),
      ignore: scenIgnore, back: scenBack, hidden: scenHidden, keys: scenKeys, 'ignore-storm': scenIgnoreStorm, 'race-arrive': scenRaceArrive, 'race-tell': scenRaceTell,
      noplan: scenNoPlan, layout: scenLayout, 'scrim-q': scenScrimQ, 'soft-play': scenSoftPlay, 'from-angle': scenFromAngle, death: scenDeath, crisis: scenCrisis, care: scenCare, scrim: scenScrim }[SCEN];
    if (!S) throw new Error(`unknown scenario ${SCEN}`);
    await S(o);
  } catch (e) { fail('exception', String(e?.stack || e).slice(0, 600)); }
  res.errors = o ? o.errors.filter((e) => !/favicon/.test(e.text)) : [];
  if (res.errors.length) fail('console errors', res.errors.slice(0, 5));
  res.shots = shots;
  await browser.close();
  try { fs.writeFileSync(path.join(OUT, `${TAG}.json`), JSON.stringify(res, null, 1)); } catch { /* the line below has it */ }
  console.log('RESULT', JSON.stringify(res));
  process.exit(0);
})();
