// Browser probe for the two known small-phone layout problems (P1, 15 Oct 2026), with real CDP touch.
//
//   node hushmallow/tools/p1-layout-probe.cjs <offer|offerline|tag> W H [text=1.25] [port=8311] [out=DIR] [rm]
//
// The repo root must be served (python3 -m http.server <port> from it).
//   offer  Tell (Angry) → the question → Play → the Static Storm → a real 'stillness' discovery (a finger held still on
//          open storm; if it has not come after 22 s the shell's own onOffer is called with the storm's offer) → the
//          Memory Garden offer: measured against the hero's live body box for 8 s (every 100 ms), screenshots.
//   offerline  the same storm with a held line up in the band when the offer comes (a small phone has nothing free
//          but the hero then): the offer and its chip never over the hero, a tap on the chip meanwhile, the line goes
//          (Continue) → the choice opens by itself, clear of the hero.
//   tag    the same storm → a fast stroke that STARTS on the person's thought tag (the words) and runs across open
//          storm: the storm must stir (charge rises, sparks) and the thought must stay where it was (it is moved only
//          by its body or a deliberate hold); then a stroke that starts on the thought's body still carries it.
// Prints "RESULT {...}" and writes screenshots to out/shots.
const { createRequire } = require('module');
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');

const argv = process.argv.slice(2);
const SCEN = argv[0] || 'both', W = +argv[1] || 320, H = +argv[2] || 568, RM = argv.includes('rm');
const opt = (k, d) => { const a = argv.find((x) => x.startsWith(`${k}=`)); return a ? a.slice(k.length + 1) : d; };
const PORT = +opt('port', 8311);
const TEXT = +opt('text', 1);
const OUT = opt('out', path.join(os.tmpdir(), 'p1-layout-probe'));
const LABEL = opt('label', '');
const BASE = `http://127.0.0.1:${PORT}/hushmallow/index.html`;
const TAG = `${LABEL ? `${LABEL}-` : ''}${SCEN}-${W}x${H}${TEXT !== 1 ? `-t${TEXT}` : ''}${RM ? '-rm' : ''}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const res = { scen: SCEN, W, H, TEXT, RM, fails: [], notes: {}, shots: [] };
const fail = (k, v) => { res.fails.push({ k, v }); console.log('FAIL', k, JSON.stringify(v ?? null).slice(0, 600)); };
const check = (ok, k, v) => { if (!ok) fail(k, v); return ok; };

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
async function shot(o, name) { const p = path.join(OUT, 'shots', `${TAG}-${name}.png`); fs.mkdirSync(path.dirname(p), { recursive: true }); await o.page.screenshot({ path: p }); res.shots.push(p); return p; }

async function open(browser) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true, isMobile: true, reducedMotion: RM ? 'reduce' : 'no-preference' });
  const errors = [];
  await ctx.addInitScript(({ text, rm }) => {
    try {
      if (!sessionStorage.getItem('p1:seeded')) {
        sessionStorage.setItem('p1:seeded', '1');
        for (const k of Object.keys(localStorage)) if (/flow|progress|garden/i.test(k)) localStorage.removeItem(k);
        localStorage.setItem('hm2:entitlement', JSON.stringify({ tier: 'paid', source: 'test', since: Date.now() }));
        const prefs = { ...(text !== 1 ? { textScale: text } : {}), ...(rm ? { motion: 'reduced' } : {}) };
        if (Object.keys(prefs).length) localStorage.setItem('hm2:prefs', JSON.stringify(prefs));
      }
    } catch { /* storage blocked */ }
  }, { text: TEXT, rm: RM });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push({ kind: 'pageerror', text: String((e && e.stack) || e) }));
  page.on('console', (m) => { if (m.type() === 'error') errors.push({ kind: 'console', text: m.text() }); });
  const cdp = await ctx.newCDPSession(page);
  return { ctx, page, cdp, errors };
}

async function boot(o) {
  await o.page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await o.page.waitForFunction(() => window.__hushfold?.touch?.ready && window.__hushfold?.mallow?.bodyRect?.(), null, { timeout: 30000 });
}
async function typeTell(o, text) {
  await o.page.evaluate(() => window.__hushfold.openTell());
  await o.page.waitForSelector('.hf-input textarea', { state: 'visible', timeout: 10000 });
  await o.page.focus('.hf-input textarea');
  await o.page.keyboard.type(text, { delay: 6 });
  await sleep(700);
  try { await o.page.waitForSelector('.hf-input .hf-opt.suggested', { state: 'visible', timeout: 4000 }); await o.page.$eval('.hf-input .hf-opt.suggested', (e) => e.scrollIntoView({ inline: 'center', block: 'nearest' })); await sleep(250); await tapSel(o, '.hf-input .hf-opt.suggested'); } catch { /* no suggestion */ }
  await sleep(300);
  await tapSel(o, '.hf-input .hf-send:not([disabled])');
}
async function toStorm(o) {
  await typeTell(o, 'I am so angry my boss ignored me again');
  const q = await waitFor(o.page, () => [...document.querySelectorAll('.hf-subs .hf-chips:not([hidden]) .hf-chip')].some((b) => b.textContent === 'Play with it'), null, 10000);
  if (!q) throw new Error('the question never showed');
  await sleep(800);
  await tapButton(o, '.hf-subs .hf-chips:not([hidden]) .hf-chip', /^Play with it$/);
  const ok = await waitFor(o.page, () => window.__hushfold.flow?.state?.phase === 'playing' && window.__hushfold.flow.state.worldId === 'static-storm', null, 25000);
  if (!ok) throw new Error('the storm never played');
  await sleep(4500);
}

/** The hero's live body box, its face (garden-install's own face rect), the offer / chip boxes, and their overlaps. */
const offerGeom = (page) => page.evaluate(() => {
  const Hf = window.__hushfold;
  const R = (r) => r && ({ l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right ?? r.left + r.width), b: Math.round(r.bottom ?? r.top + r.height) });
  const body = Hf.mallow.bodyRect();
  const vis = (el) => { if (!el) return null; const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.05) return null; const r = el.getBoundingClientRect(); return r.width > 0 ? r : null; };
  const offer = vis(document.querySelector('.hm-offer'));
  const chip = vis(document.querySelector('.hm-chip'));
  const area = (a, b) => (a && b ? Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t)) : 0);
  const B = R(body), O = R(offer), C = R(chip);
  const el = document.querySelector('.hm-offer');
  return { body: B, offer: O, chip: C, form: el ? (el.classList.contains('is-bar') ? 'bar' : el.classList.contains('is-compact') ? 'compact' : 'full') : null,
    folded: !!el?.classList.contains('is-folded'), offerOnBody: area(O, B), chipOnBody: area(C, B) };
});

async function scenOffer(o) {
  const { page } = o;
  await toStorm(o);
  await shot(o, '01-storm');
  // a real discovery: a finger held still on open storm (low, beside the hero: away from the thought and its words)
  const spot = await page.evaluate(() => {
    const b = window.__hushfold.mallow.bodyRect();
    const th = (window.__hushfold.thoughts?.rects?.() || [])[0];
    const xs = [innerWidth * 0.18, innerWidth * 0.82];
    const y = Math.min(innerHeight - 120, b.bottom + 30);
    const x = th && Math.abs(th.left + th.width / 2 - xs[0]) < Math.abs(th.left + th.width / 2 - xs[1]) ? xs[1] : xs[0];
    return { x: Math.round(x), y: Math.round(y) };
  });
  const id = ++tid;
  await touch(o, 'touchStart', [{ x: spot.x, y: spot.y, id }]);
  let real = false, lines = false;
  const t0 = Date.now();
  while (Date.now() - t0 < 22000) {
    await sleep(250);
    // (a few sub-pixel nudges keep the finger "down and still" for the director)
    await touch(o, 'touchMove', [{ x: spot.x + ((Date.now() / 250) % 2 ? 0.4 : 0), y: spot.y, id }]);
    if (await page.evaluate(() => !!document.querySelector('.hm-offer'))) { real = true; break; }
    // the discovery's own lines (held, with Continue): the offer follows them
    if (await page.evaluate(() => /storm let go|You held still|See what happened|changed your pace/i.test(document.querySelector('.hf-subs')?.textContent || ''))) { lines = true; break; }
  }
  await touch(o, 'touchEnd', []);
  if (lines && !real) {
    await sleep(1500);
    await shot(o, '01b-discovery-lines');
    // the person reads the line and goes on (Continue, while it is held), as they would
    for (let i = 0; i < 3 && !real; i++) {
      await tapButton(o, '.hf-subctl button, .hf-subs button', /Continue/);
      real = await waitFor(page, () => !!document.querySelector('.hm-offer'), null, 5000);
    }
  }
  res.notes.discoveryLines = lines;
  res.notes.realDiscovery = real;
  console.log('discovery', real ? 'real (stillness): its own offer' : lines ? 'lines but no offer: onOffer called' : 'not in 22 s: onOffer called');
  if (!real) {
    // (not awaited: the shell's onOffer resolves only when the moment is over)
    await page.evaluate(() => { window.__hushfold.onOffer({ skillId: 'slowing-down', worldId: 'static-storm' }); });
    await waitFor(page, () => !!document.querySelector('.hm-offer.is-in, .hm-chip'), null, 8000);
  }
  await sleep(900);
  await shot(o, '02-offer');
  const samples = [];
  for (let i = 0; i < 80; i++) { samples.push(await offerGeom(page)); await sleep(100); }
  await shot(o, '03-offer-8s');
  const worst = samples.reduce((m, s) => Math.max(m, s.offerOnBody, s.chipOnBody), 0);
  res.notes.offer = { first: samples[0], last: samples[samples.length - 1], worstOverlapPx2: worst, forms: [...new Set(samples.map((s) => s.form))], foldedAny: samples.some((s) => s.folded) };
  check(worst === 0, 'the offer (or its chip) never lies over the hero', res.notes.offer);
  check(samples.some((s) => s.offer || s.chip), 'the offer or its chip is shown', samples[0]);
}

/** The hard case: the offer arrives while a line is held up in the band (nothing but the hero is free on a small phone). */
async function scenOfferLine(o) {
  const { page } = o;
  await toStorm(o);
  await page.evaluate(() => { window.__hushfold.subtitles.say(['The storm is listening to your pace.'], { who: 'glitzi', hold: true, id: 'p1-probe' }); });
  await sleep(1400);
  await page.evaluate(() => { window.__hushfold.onOffer({ skillId: 'slowing-down', worldId: 'static-storm' }); });
  await waitFor(page, () => !!document.querySelector('.hm-offer'), null, 8000);
  await sleep(900);
  await shot(o, '02-offer-with-line');
  const sample = async (n) => { const out = []; for (let i = 0; i < n; i++) { out.push(await offerGeom(page)); await sleep(100); } return out; };
  const a = await sample(30);
  const worstA = a.reduce((m, s) => Math.max(m, s.offerOnBody, s.chipOnBody), 0);
  res.notes.withLine = { first: a[0], worstOverlapPx2: worstA, offerShown: a.some((s) => s.offer), chipShown: a.some((s) => s.chip) };
  check(worstA === 0, 'with a line up: the offer and its chip never lie over the hero', res.notes.withLine);
  // the person taps the chip while the line is still up
  const chip = await page.$('.hm-chip:not(.is-blocked)');
  if (chip) {
    const b = await chip.boundingBox();
    await tap(o, b.x + b.width / 2, b.y + b.height / 2);
    await sleep(900);
    await shot(o, '03-chip-tapped-with-line');
    const t = await sample(20);
    const worstT = t.reduce((m, s) => Math.max(m, s.offerOnBody, s.chipOnBody), 0);
    res.notes.tapped = { first: t[0], worstOverlapPx2: worstT, waiting: await page.evaluate(() => !!document.querySelector('.hm-chip.is-waiting')) };
    check(worstT === 0, 'chip tapped with the line up: still never over the hero', res.notes.tapped);
  } else res.notes.tapped = 'no visible chip (it waits unseen: no corner clear of the hero)';
  // the lines move on (Continue, if one is held): when the band is free the choice opens by itself (or, once it has been
  // seen and a line took the band back, waits as its chip for a tap — FU2); never over the hero
  await tapButton(o, '.hf-subctl button, .hf-subs button', /Continue/);
  const seen = await waitFor(page, () => !!document.querySelector('.hm-offer.is-in') || !!document.querySelector('.hm-chip.is-in:not(.is-blocked)'), null, 12000);
  await sleep(900);
  await shot(o, '04-after-line');
  const c = await sample(30);
  const worstC = c.reduce((m, s) => Math.max(m, s.offerOnBody, s.chipOnBody), 0);
  res.notes.afterLine = { seen, offerOpen: c.some((x) => x.offer), chip: c.some((x) => x.chip), first: c[0], worstOverlapPx2: worstC };
  check(seen, 'once the band is free the choice (or its chip) can be seen', res.notes.afterLine);
  check(worstC === 0, 'after the line: never over the hero', res.notes.afterLine);
  // a tap on its chip now brings the choice back — never onto the hero
  const ch = await page.$('.hm-chip.is-in:not(.is-blocked)');
  if (ch) {
    const bb = await ch.boundingBox();
    await tap(o, bb.x + bb.width / 2, bb.y + bb.height / 2);
    await sleep(1200);
    await shot(o, '05-chip-tapped');
    const d = await sample(30);
    const worstD = d.reduce((m, x) => Math.max(m, x.offerOnBody, x.chipOnBody), 0);
    res.notes.chipTap = { offerOpen: d.some((x) => x.offer), waiting: await page.evaluate(() => !!document.querySelector('.hm-chip.is-waiting')), first: d[0], worstOverlapPx2: worstD };
    check(worstD === 0, 'chip tapped: never over the hero', res.notes.chipTap);
    check(res.notes.chipTap.offerOpen || res.notes.chipTap.waiting, 'chip tapped: the choice opens, or the chip glows waiting for room', res.notes.chipTap);
  }
}

const tagState = (page) => page.evaluate(() => {
  const Hf = window.__hushfold, L = Hf.thoughts, th = L?.primary || (L?.list || [])[0];
  const tag = th?.tag?.getBoundingClientRect?.();
  const m = Hf.flow?.world?.metrics || {};
  return { tx: th ? Math.round(th.x) : null, ty: th ? Math.round(th.y) : null, tag: tag && tag.width ? { l: Math.round(tag.left), t: Math.round(tag.top), r: Math.round(tag.right), b: Math.round(tag.bottom) } : null,
    charge: +((m.charge ?? 0).toFixed(3)), light: +((m.light ?? 0).toFixed(2)), speedU: +((m.speedU ?? 0).toFixed(2)), reader: !!document.querySelector('.hf-read, .tm-read'),
    tagPE: tag ? getComputedStyle(th.tag).pointerEvents : null };
});
async function stroke(o, pts, stepMs = 16) {
  const id = ++tid;
  await touch(o, 'touchStart', [{ x: pts[0][0], y: pts[0][1], id }]);
  for (let i = 1; i < pts.length; i++) { await sleep(stepMs); await touch(o, 'touchMove', [{ x: pts[i][0], y: pts[i][1], id }]); }
  await sleep(stepMs);
  await touch(o, 'touchEnd', []);
}
/** A fast scribble from (x0, y0): a zig-zag across open storm, ~1 s. */
function scribble(x0, y0, w, h) {
  const pts = [[x0, y0]];
  let x = x0, y = y0, dir = x0 < W / 2 ? 1 : -1;
  for (let i = 0; i < 60; i++) {
    x += dir * 18; y += (i % 2 ? -1 : 1) * 6 + (i < 10 ? 2 : 0);
    if (x > w - 20 || x < 20) dir = -dir;
    y = Math.max(80, Math.min(h - 90, y));
    pts.push([Math.round(x), Math.round(y)]);
  }
  return pts;
}
async function scenTag(o) {
  const { page } = o;
  await toStorm(o);
  const ok = await waitFor(page, () => { const th = window.__hushfold.thoughts?.primary; const r = th?.tag?.getBoundingClientRect?.(); return !!(r && r.width > 20 && getComputedStyle(th.tag).opacity > 0.5); }, null, 12000);
  check(ok, 'the thought tag shows in the storm');
  await sleep(2500);
  const s0 = await tagState(page);
  res.notes.before = s0;
  await shot(o, '01-tag');
  if (!s0.tag) { fail('no tag on screen', s0); return; }
  // two strokes: from the middle of the words, and from their edge nearest the thought's body
  const starts = [['middle', Math.round((s0.tag.l + s0.tag.r) / 2), Math.round((s0.tag.t + s0.tag.b) / 2)],
    ['edge', Math.round((s0.tag.l + s0.tag.r) / 2), s0.tag.t < s0.ty ? s0.tag.b - 5 : s0.tag.t + 5],
    // the words passing through (.tm-travel: they cannot take the touch themselves, it falls to the stage)
    ['travel', Math.round((s0.tag.l + s0.tag.r) / 2), s0.tag.t < s0.ty ? s0.tag.b - 5 : s0.tag.t + 5]];
  res.notes.tagStroke = {};
  for (const [name, cx, cy] of starts) {
    await sleep(1800);
    const b = await tagState(page);
    const under = await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? `${e.tagName.toLowerCase()}.${[...e.classList].join('.')}` : null; }, [cx, cy]);
    if (name === 'travel') await page.evaluate(() => window.__hushfold.thoughts.primary.tag.style.setProperty('pointer-events', 'none', 'important'));
    const pts = scribble(cx, cy, W, H);
    const id = ++tid;
    await touch(o, 'touchStart', [{ x: pts[0][0], y: pts[0][1], id }]);
    let maxMove = 0, maxSpeed = 0, mid = null;
    for (let i = 1; i < pts.length; i++) {
      await sleep(16); await touch(o, 'touchMove', [{ x: pts[i][0], y: pts[i][1], id }]);
      if (i % 6 === 0) {
        const s = await tagState(page);
        maxMove = Math.max(maxMove, Math.hypot(s.tx - b.tx, s.ty - b.ty)); maxSpeed = Math.max(maxSpeed, s.speedU);
        if (i === 36) { mid = s; await shot(o, `02-mid-stroke-${name}`); }
      }
    }
    await sleep(16); await touch(o, 'touchEnd', []);
    if (name === 'travel') await page.evaluate(() => window.__hushfold.thoughts.primary.tag.style.removeProperty('pointer-events'));
    await sleep(300);
    const s1 = await tagState(page);
    maxMove = Math.max(maxMove, Math.hypot(s1.tx - b.tx, s1.ty - b.ty));
    const r = { start: [cx, cy], under, thoughtMaxMovePx: Math.round(maxMove), stormFingerSpeedU: maxSpeed, readerOpened: s1.reader };
    res.notes.tagStroke[name] = r;
    check(maxMove < 30, `${name}: a stroke that starts on the words does not carry the thought`, r);
    check(maxSpeed > 0.5, `${name}: a stroke that starts on the words stirs the storm (the storm feels the finger)`, r);
    check(!s1.reader, `${name}: a stroke is not a tap: the reader does not open`, r);
    if (s1.reader) { await page.evaluate(() => document.querySelector('.hf-read button')?.click()); await sleep(500); }
  }
  await shot(o, '03-after-tag-strokes');
  // a plain tap on the words still reads them
  await sleep(1500);
  const s2 = await tagState(page);
  if (s2.tag) {
    await tap(o, Math.round((s2.tag.l + s2.tag.r) / 2), Math.round((s2.tag.t + s2.tag.b) / 2), 80);
    await sleep(600);
    const s3 = await tagState(page);
    res.notes.tapReads = s3.reader;
    check(s3.reader, 'a tap on the words still reads them', s3);
    await shot(o, '04-tap-reads');
    await page.evaluate(() => { const b = document.querySelector('.hf-read button, .tm-read button'); b?.click(); });
    await sleep(800);
  }
  // a deliberate hold on the words picks the thought up: it then moves with the finger
  await sleep(2500);
  const h0 = await tagState(page);
  if (h0.tag) {
    const hx = Math.round((h0.tag.l + h0.tag.r) / 2), hy = Math.round((h0.tag.t + h0.tag.b) / 2);
    const idh = ++tid;
    await touch(o, 'touchStart', [{ x: hx, y: hy, id: idh }]);
    for (let i = 0; i < 7; i++) { await sleep(100); await touch(o, 'touchMove', [{ x: hx + (i % 2 ? 0.5 : 0), y: hy, id: idh }]); }
    let holdMove = 0;
    for (let i = 1; i <= 20; i++) { await sleep(30); await touch(o, 'touchMove', [{ x: hx + i * (hx < W / 2 ? 3 : -3), y: hy - i * 1.5, id: idh }]); if (i % 5 === 0) { const s = await tagState(page); holdMove = Math.max(holdMove, Math.hypot(s.tx - h0.tx, s.ty - h0.ty)); } }
    await touch(o, 'touchEnd', []);
    await sleep(400);
    const hs = await tagState(page);
    res.notes.holdStroke = { thoughtMaxMovePx: Math.round(holdMove), readerOpened: hs.reader };
    check(holdMove > 25, 'a deliberate hold on the words, then a move, carries the thought', res.notes.holdStroke);
    check(!hs.reader, 'a hold is not a tap: the reader does not open', res.notes.holdStroke);
    if (hs.reader) { await page.evaluate(() => document.querySelector('.hf-read button')?.click()); await sleep(500); }
  }
  // a stroke that starts on the thought's body still carries it
  await sleep(2500);
  const b0 = await tagState(page);
  const pts2 = [];
  for (let i = 0; i <= 24; i++) pts2.push([Math.round(b0.tx + (i * (b0.tx < W / 2 ? 3 : -3))), Math.round(b0.ty + i * 1.5)]);
  const id2 = ++tid;
  await touch(o, 'touchStart', [{ x: pts2[0][0], y: pts2[0][1], id: id2 }]);
  let bodyMove = 0;
  for (let i = 1; i < pts2.length; i++) { await sleep(30); await touch(o, 'touchMove', [{ x: pts2[i][0], y: pts2[i][1], id: id2 }]); if (i % 6 === 0) { const s = await tagState(page); bodyMove = Math.max(bodyMove, Math.hypot(s.tx - b0.tx, s.ty - b0.ty)); } }
  await touch(o, 'touchEnd', []);
  res.notes.bodyStroke = { thoughtMaxMovePx: Math.round(bodyMove) };
  check(bodyMove > 25, 'a stroke on the thought body still carries it', res.notes.bodyStroke);
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] });
  const kill = setTimeout(() => { console.log('TIMEOUT'); process.exit(2); }, 380000);
  let o;
  try {
    o = await open(browser);
    await boot(o);
    if (SCEN === 'offer') await scenOffer(o);
    else if (SCEN === 'offerline') await scenOfferLine(o);
    else if (SCEN === 'tag') await scenTag(o);
    else { await scenTag(o); }
  } catch (e) { fail('exception', String(e && e.stack || e)); }
  if (o) {
    res.errors = o.errors.filter((e) => !/favicon|ERR_FILE_NOT_FOUND/.test(e.text)).slice(0, 8);
    check(res.errors.length === 0, 'no page errors', res.errors);
  }
  clearTimeout(kill);
  await browser.close();
  console.log('RESULT', JSON.stringify(res));
  process.exit(res.fails.length ? 1 : 0);
})();
