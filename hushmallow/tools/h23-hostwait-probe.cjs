// Browser probe (H23 review round 3, the ocean's words after a paused storm): the person's words on the Luminous Ocean.
//
//   node hushmallow/tools/h23-hostwait-probe.cjs <scenario> W H [rm] [port=8251] [out=DIR] [n=K]
//
// The repo root must be served (python3 -m http.server <port> from it). Scenarios:
//   pause    Tell (angry) → the Static Storm; Pause from the panel, Resume from the pill; Drift on → the ocean.
//            Measures: when the words are first seen again after the melt, frames they are seen on Loomi's face or
//            body, frames hidden after they came back, the plate's lines (what the ocean asked for: labelFit).
//   first    Tell (embarrassed) → the ocean as the first world (a cold start): never on Loomi as it takes the stage.
//   arrival  Tell (angry) → the storm's arrival: the thought's step per frame, words never on Glitzi's face.
//   card     storm → slowing discovery → Keep → the Memory Garden card: never seen over the thought or its words.
//   raf      storm + ocean: the app's requestAnimationFrame callbacks per frame (Q15: one).
//   sheet    storm → ocean, then the panel's sheet opened and closed: frames the words are seen on Loomi.
// Prints one JSON line ("RESULT {...}") and writes screenshots + JSON to out (default the system temp dir).
// Playwright from /opt/node-tools; Chromium at /opt/pw-browsers/chromium (never playwright install). Touch via CDP.
const { createRequire } = require('module');
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');

const argv = process.argv.slice(2);
const SCEN = argv[0] || 'pause', W = +argv[1] || 320, H = +argv[2] || 568, RM = argv.includes('rm');
const opt = (k, d) => { const a = argv.find((x) => x.startsWith(`${k}=`)); return a ? a.slice(k.length + 1) : d; };
const PORT = +opt('port', 8251), RUN = opt('n', '1');
const OUT = opt('out', path.join(os.tmpdir(), 'h23-hostwait'));
const BASE = `http://127.0.0.1:${PORT}/hushmallow/index.html`;
const TAG = `${SCEN}-${W}x${H}${RM ? '-rm' : ''}-${RUN}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shots = [];
const res = { scen: SCEN, W, H, RM, run: RUN, fails: [], notes: {} };
const fail = (k, v) => { res.fails.push({ k, v }); console.log('FAIL', k, JSON.stringify(v).slice(0, 400)); };

async function open(browser) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const errors = [];
  await ctx.addInitScript(({ prefs }) => {
    try {
      if (!sessionStorage.getItem('hw:seeded')) {
        sessionStorage.setItem('hw:seeded', '1');
        for (const k of Object.keys(localStorage)) if (/flow|progress|garden/i.test(k)) localStorage.removeItem(k);
        localStorage.setItem('hm2:entitlement', JSON.stringify({ tier: 'paid', source: 'test', since: Date.now() }));
        if (prefs) localStorage.setItem('hm2:prefs', JSON.stringify(prefs));
      }
    } catch { /* storage blocked */ }
    // the app's rAF callbacks per frame (the probe's own sampler uses __hwRaf, uncounted)
    const orig = window.requestAnimationFrame.bind(window);
    window.__hwRaf = orig;
    const R = window.__hwRafStats = { frames: new Map(), on: false };
    window.requestAnimationFrame = function (cb) { return orig((ts) => { if (R.on) R.frames.set(ts, (R.frames.get(ts) || 0) + 1); cb(ts); }); };
  }, { prefs: RM ? { motion: 'reduced' } : null });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push({ kind: 'pageerror', text: String((e && e.stack) || e) }));
  page.on('console', (m) => { if (m.type() === 'error') errors.push({ kind: 'console', text: m.text() }); });
  page.on('response', (r) => { if (r.status() >= 400) errors.push({ kind: 'http', text: `${r.status()} ${r.url()}` }); });
  const cdp = await ctx.newCDPSession(page);
  return { ctx, page, cdp, errors };
}
let tid = 10;
const touch = (o, type, pts) => o.cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
async function tap(o, x, y) { const id = ++tid; await touch(o, 'touchStart', [{ x, y, id }]); await sleep(60); await touch(o, 'touchEnd', []); }
async function stroke(o, a, b, speed, step = 16) {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(2, Math.round(((d / speed) * 1000) / step)), id = ++tid;
  await touch(o, 'touchStart', [{ x: a[0], y: a[1], id }]);
  for (let i = 1; i <= n; i++) { await sleep(step); await touch(o, 'touchMove', [{ x: a[0] + ((b[0] - a[0]) * i) / n, y: a[1] + ((b[1] - a[1]) * i) / n, id }]); }
  await sleep(step); await touch(o, 'touchEnd', []);
}
async function tapSel(o, sel, timeout = 10000) {
  const el = await o.page.waitForSelector(sel, { state: 'visible', timeout });
  const b = await el.boundingBox();
  await tap(o, b.x + b.width / 2, b.y + b.height / 2);
}
async function tapButton(o, sel, re) {
  for (const bb of await o.page.$$(sel)) if (re.test(await bb.textContent())) { const r = await bb.boundingBox(); await tap(o, r.x + r.width / 2, r.y + r.height / 2); return true; }
  return false;
}
const waitFor = async (page, fn, arg, timeout = 20000) => { try { await page.waitForFunction(fn, arg, { timeout, polling: 50 }); return true; } catch { return false; } };
async function shot(o, name) { const p = path.join(OUT, 'shots', `${TAG}-${name}.png`); fs.mkdirSync(path.dirname(p), { recursive: true }); await o.page.screenshot({ path: p }); shots.push(p); return p; }

async function boot(o) {
  await o.page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await o.page.waitForFunction(() => window.__hushfold?.touch?.ready && window.__hushfold?.mallow?.bodyRect?.(), null, { timeout: 30000 });
  // a per-frame sampler: the words as seen (effective opacity), the thought's body, the hero, its face, the card
  await o.page.evaluate(async () => {
    const gi = await import('/hushmallow/src/hushfold/garden-install.js');
    const reg = await import('/hushmallow/src/mallows/registry.js');
    const R = (r) => (r ? { l: +r.left.toFixed(1), t: +r.top.toFixed(1), r: +r.right.toFixed(1), b: +r.bottom.toFixed(1) } : null);
    const effOp = (el) => { if (!el || !el.isConnected) return 0; let o = 1; for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return 0; o *= +cs.opacity; if (e === document.body) break; } return +o.toFixed(3); };
    const hw = window.__hw = { frames: [], events: [], on: false };
    let hooked = null;
    setInterval(() => { const f = window.__hushfold?.flow; if (f && f !== hooked && f.on) { hooked = f; for (const ev of ['world', 'melt', 'host', 'discovery', 'offer', 'pause', 'resume']) f.on(ev, (d) => hw.events.push({ t: performance.now(), ev, d: JSON.parse(JSON.stringify(d || {}, (k, v) => (k === 'metrics' || k === 'error' ? undefined : v))) })); } }, 20);
    addEventListener('hm:install', (e) => hw.events.push({ t: performance.now(), ev: 'install', d: { phase: e.detail?.phase } }));
    const raf = window.__hwRaf;
    const tick = () => {
      raf(tick);
      if (!hw.on) return;
      const Hf = window.__hushfold, L = Hf.thoughts, st = Hf.flow?.state || {}, p = L?.primary || null;
      const fr = { t: +performance.now().toFixed(1), ph: st.phase || null, w: st.worldId || null, mk: st.melt ?? null, pz: !!st.paused, hid: Hf.touch?.id || null };
      if (p) {
        let bb = null; try { bb = p.bodyRect?.(); } catch { /* */ }
        const el = L.tagOf?.(p), tg = L.tags?.get(p);
        fr.p = { cx: +(+p.render.cx).toFixed(1), cy: +(+p.render.cy).toFixed(1), ap: +(+p.ov?.appear).toFixed(3), op: +(+(p.opacity ?? 1)).toFixed(3), body: R(bb), dr: !!p.driven };
        if (el) { const r = el.getBoundingClientRect(); fr.tag = { r: R(r), op: effOp(el), lines: tg?.cur?.rows ?? null, txt: el.textContent, hw: !!tg?.hostWait, fit: p.labelFit ? { ...p.labelFit } : null, drop: tg?.drop ?? null }; }
      }
      try { const b = Hf.mallow?.bodyRect?.(); fr.hero = R(b); const id = Hf.touch?.id; if (b && reg.MALLOWS[id]) fr.face = R(gi.mallowFaceRect(b, reg.MALLOWS[id])); } catch { /* */ }
      try { const b = Hf.flow?.subtitleBand?.(); if (b) fr.band = { t: b.y, b: b.y + b.h }; } catch { /* */ }
      const card = document.querySelector('.hm-install-card');
      if (card) fr.card = { r: R(card.getBoundingClientRect()), op: effOp(card) };
      const sub = document.querySelector('.hf-subs .hf-sub:not(.out)');
      if (sub) fr.sub = { op: effOp(sub), txt: (sub.querySelector('.text')?.textContent || '').slice(0, 50) };
      hw.frames.push(fr);
    };
    raf(tick);
  });
}
const startRec = (page) => page.evaluate(() => { window.__hw.frames.length = 0; window.__hw.on = true; });
const takeRec = (page) => page.evaluate(() => { const f = window.__hw.frames.slice(); window.__hw.frames.length = 0; return f; });
const events = (page) => page.evaluate(() => window.__hw.events.slice());
const ov = (a, b) => !!(a && b && a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t);
async function typeAndSend(o, text) {
  await o.page.evaluate(() => window.__hushfold.openTell());
  await o.page.waitForSelector('.hf-input textarea', { state: 'visible', timeout: 10000 });
  await o.page.focus('.hf-input textarea');
  await o.page.keyboard.type(text, { delay: 8 });
  await sleep(500);
  try { await o.page.waitForSelector('.hf-input .hf-opt.suggested', { state: 'visible', timeout: 4000 }); await o.page.$eval('.hf-input .hf-opt.suggested', (e) => e.scrollIntoView({ inline: 'center', block: 'nearest' })); await sleep(250); await tapSel(o, '.hf-input .hf-opt.suggested'); } catch { /* no suggestion */ }
  await sleep(300);
  await tapSel(o, '.hf-input .hf-send:not([disabled])');
}
/** The words as seen on the hero: frames (seen > 0.15) on its face / its live body; when first seen; hidden after. */
function wordsOnHero(frames, from) {
  const out = { face: 0, body: 0, firstSeen: null, hiddenAfter: 0, gapMax: 0, frames: 0, maxLines: null, faceAt: [] };
  let seen = false, gapFrom = null;
  for (const f of frames) {
    if (f.t < from) continue;
    out.frames++;
    const vis = f.tag && f.tag.op > 0.15 && !f.pz;
    if (!vis && !f.pz) { gapFrom ??= f.t; out.gapMax = Math.max(out.gapMax, Math.round(f.t - gapFrom)); } else gapFrom = null;
    if (vis) {
      if (!seen) { seen = true; out.firstSeen = +(f.t - from).toFixed(0); }
      if (ov(f.tag.r, f.face)) { out.face++; if (out.faceAt.length < 4) out.faceAt.push({ t: +(f.t - from).toFixed(0), tag: f.tag.r, face: f.face }); }
      if (ov(f.tag.r, f.hero)) out.body++;
      out.maxLines = Math.max(out.maxLines || 0, f.tag.lines || 0);
    } else if (seen && !f.pz) out.hiddenAfter++;
  }
  return out;
}
function steps(frames, from, to = Infinity) {
  let max = 0, at = null, prev = null;
  for (const f of frames) {
    if (f.t < from || f.t > to || !f.p) { prev = null; continue; }
    if (prev && f.p.ap > 0.1 && f.p.op > 0.1) { const n = Math.hypot(f.p.cx - prev.p.cx, f.p.cy - prev.p.cy) / Math.max(1, (f.t - prev.t) / (1000 / 60)); if (n > max) { max = n; at = +(f.t - from).toFixed(0); } }
    prev = f;
  }
  return { max60: +max.toFixed(2), at };
}

async function toStorm(o) {
  await typeAndSend(o, 'I am furious that the train was cancelled again');
  const ok = await waitFor(o.page, () => window.__hushfold.flow?.state?.phase === 'playing' && window.__hushfold.flow.state.worldId === 'static-storm', null, 25000);
  if (!ok) throw new Error('the storm never played');
}
async function pauseResume(o) {
  await tapSel(o, '[data-hf=panel-handle]'); await sleep(1100);
  if (!(await tapButton(o, '.hf-panel button.hf-ghost', /Pause/))) fail('no Pause button', {});
  await sleep(700); await tapSel(o, '.hf-panel [aria-label="Close panel"]'); await sleep(4200);
  await shot(o, '02-paused');
  await tapSel(o, '.hf-pill.paused'); await sleep(1800);
}
async function meltToOcean(o) {
  await o.page.evaluate(() => window.__hushfold.flow.next());
  const ok = await waitFor(o.page, () => window.__hushfold.flow?.state?.phase === 'playing' && window.__hushfold.flow.state.worldId === 'luminous-ocean', null, 25000);
  if (!ok) throw new Error('the ocean never played');
}

async function scenPause(o) {
  const { page } = o;
  await toStorm(o);
  await sleep(3000);
  await shot(o, '01-storm');
  await pauseResume(o);
  res.notes.beforeMelt = await page.evaluate(() => { const L = window.__hushfold.thoughts, p = L.primary, tg = L.tags.get(p); return { fit: p?.labelFit ? { ...p.labelFit } : null, drop: tg?.drop, lines: tg?.cur?.rows, txt: L.tagOf(p)?.textContent }; });
  await startRec(page);
  await meltToOcean(o);
  const ev = await events(page);
  const m0 = ev.find((e) => e.ev === 'melt' && e.d.k === 0), m1 = ev.find((e) => e.ev === 'melt' && e.d.k === 1);
  for (const ms of [600, 1500, 3000]) { const now = await page.evaluate(() => performance.now()); if (m1.t + ms > now) await sleep(m1.t + ms - now); await shot(o, `03-ocean-${ms}`); }
  await sleep(4000);
  await shot(o, '04-ocean-7s');
  // a few long strokes on the water: the words stay (and come back if they ever hid)
  for (let k = 0; k < 3; k++) { await stroke(o, [W / 2 - 100, H * 0.93], [W / 2 - 96, H * 0.8], 200, 24); await sleep(300); }
  await sleep(3000);
  await shot(o, '05-after-strokes');
  const fr = await takeRec(page);
  res.notes.plan = await page.evaluate(() => { const P = window.__hushfold.flow.world?.debug?.plan; const T = window.__hushfold.flow.world?.debug?.thought; return P ? { home: P.home, plate: P.plate, mallow: P.mallow, hy: P.hy, textMax: P.textMax, thought: T && { sx: T.sx, sy: T.sy, side: T.side, plateW: T.plateW, plateH: T.plateH } } : null; });
  const melt = wordsOnHero(fr, m0.t), after = wordsOnHero(fr, m1.t);
  res.notes.melt = { ms: Math.round(m1.t - m0.t) };
  res.notes.fromMelt = melt; res.notes.fromOcean = after;
  const last = fr.at(-1);
  res.notes.end = { tag: last?.tag, face: last?.face, hero: last?.hero, band: last?.band };
  if (melt.face) fail('words seen on Loomi\'s face', melt.faceAt);
  if (after.firstSeen == null) fail('words never seen in the ocean', { lastTag: last?.tag });
  else if (after.firstSeen > 2200) fail('words seen only late in the ocean', { firstSeen: after.firstSeen });
  if (!(last?.tag?.op > 0.9)) fail('words not showing at the end', last?.tag);
  return fr;
}
async function scenFirst(o) {
  const { page } = o;
  await startRec(page);
  await typeAndSend(o, 'My boss embarrassed me today.');
  const ok = await waitFor(page, () => window.__hw.events.some((e) => e.ev === 'world'), null, 20000);
  const wev = (await events(page)).find((e) => e.ev === 'world');
  if (!ok || wev?.d?.id !== 'luminous-ocean') fail('first world not the ocean', wev?.d);
  for (const ms of [150, 450, 900, 1500, 2600]) { const now = await page.evaluate(() => performance.now()); if (wev.t + ms > now) await sleep(wev.t + ms - now); await shot(o, `02-arrive-${ms}`); }
  await sleep(3500);
  await shot(o, '03-settled');
  const fr = await takeRec(page);
  const o1 = wordsOnHero(fr, wev.t - 400);
  res.notes.arrival = o1;
  res.notes.steps = steps(fr, wev.t);
  if (o1.face || o1.body) fail('words seen on Loomi as it takes the stage', o1.faceAt);
  const back = wordsOnHero(fr, wev.t + 300);
  res.notes.back = back.firstSeen;
  if (!(fr.at(-1)?.tag?.op > 0.9)) fail('words not back', fr.at(-1)?.tag);
  return fr;
}
async function scenArrival(o) {
  const { page } = o;
  await startRec(page);
  await toStorm(o);
  const wev = (await events(page)).find((e) => e.ev === 'world');
  await sleep(700); await shot(o, '02-storm-arriving');
  await sleep(2600); await shot(o, '03-storm-settled');
  const fr = await takeRec(page);
  res.notes.steps = steps(fr, wev.t - 300, wev.t + 3000);
  const w = wordsOnHero(fr, wev.t - 300);
  res.notes.words = w;
  res.notes.end = fr.at(-1)?.tag;
  if (w.face) fail('words seen on Glitzi\'s face', w.faceAt);
  if (res.notes.steps.max60 > 12) fail('the thought jumps on arrival', res.notes.steps);
  if (!(fr.at(-1)?.tag?.op > 0.9)) fail('words not showing in the storm', fr.at(-1)?.tag);
  return fr;
}
async function freeSeg(page) {
  return page.evaluate(() => {
    const Hf = window.__hushfold, Wd = innerWidth, Hh = innerHeight, b = Hf.flow?.subtitleBand?.() || { y: 0, h: 0 }, hero = Hf.mallow.bodyRect(), rs = Hf.thoughts?.rects?.() || [];
    const dock = document.querySelector('.hf-dock')?.getBoundingClientRect(), top = b.y + b.h + 12, bot = (dock ? dock.top : Hh) - 12, pad = 14;
    const blocks = [hero, ...rs].map((r) => ({ t: r.top - pad, b: r.bottom + pad, l: r.left - pad, r: r.right + pad }));
    const free = (x, y) => y > top && y < bot && x > 14 && x < Wd - 14 && !blocks.some((k) => x > k.l && x < k.r && y > k.t && y < k.b);
    let best = null;
    for (let y = top + 4; y < bot; y += 6) { let x0 = null; for (let x = 14; x <= Wd - 14; x += 4) { if (free(x, y)) { if (x0 == null) x0 = x; } else if (x0 != null) { const L = x - 4 - x0; if (!best || L > best.L) best = { L, a: [x0, y], b: [x - 4, y] }; x0 = null; } } if (x0 != null) { const L = Wd - 14 - x0; if (!best || L > best.L) best = { L, a: [x0, y], b: [Wd - 14, y] }; } }
    return best;
  });
}
async function scenCard(o) {
  const { page } = o;
  await toStorm(o);
  await sleep(2500);
  const seg = await freeSeg(page);
  let dir = 1;
  const tf = Date.now();
  while (Date.now() - tf < 2200) { await stroke(o, dir > 0 ? seg.a : seg.b, dir > 0 ? seg.b : seg.a, 1600, 16); dir = -dir; }
  const ts = Date.now(), slow = W <= 330 ? 100 : 150;
  while (Date.now() - ts < 30000) {
    await stroke(o, dir > 0 ? seg.a : seg.b, dir > 0 ? seg.b : seg.a, slow, 16); dir = -dir;
    if (await page.evaluate(() => window.__hw.events.some((e) => e.ev === 'discovery')) && Date.now() - ts > 4000) break;
  }
  await sleep(1500);
  try { await tapSel(o, '.hf-subctl .go', 6000); } catch { /* not held */ }
  if (!(await waitFor(page, () => !!document.querySelector('.hm-offer.is-in'), null, 8000))) { fail('no garden offer', {}); return []; }
  await sleep(600);
  await shot(o, '02-offer');
  await startRec(page);
  await tapSel(o, '.hm-offer .hm-primary');
  const tk = Date.now();
  for (const ms of [1500, 2700, 3600]) { await sleep(Math.max(0, ms - (Date.now() - tk))); await shot(o, `03-card-${ms}`); }
  await waitFor(page, () => window.__hw.events.some((e) => e.ev === 'install' && e.d.phase === 'end'), null, 15000);
  await sleep(800);
  await shot(o, '04-after-install');
  const fr = await takeRec(page);
  const cardF = fr.filter((f) => f.card && f.card.op > 0.15);
  let overBody = 0, overWords = 0;
  for (const f of cardF) { if (ov(f.card.r, f.p?.body)) overBody++; if (f.tag && f.tag.op > 0.15 && ov(f.card.r, f.tag.r)) overWords++; }
  res.notes.card = { frames: cardF.length, overBody, overWords };
  if (!cardF.length) fail('the card never showed', {});
  if (overBody || overWords) fail('the card seen over the thought', res.notes.card);
  return fr;
}
async function scenSheet(o) {
  // the ocean (after the storm), then the panel's sheet opened and closed: frames the words are seen on Loomi
  const { page } = o;
  await toStorm(o);
  await sleep(2500);
  await meltToOcean(o);
  await sleep(3500);
  await shot(o, '02-ocean');
  await startRec(page);
  const t0 = await page.evaluate(() => performance.now());
  await tapSel(o, '[data-hf=panel-handle]');
  await sleep(1500);
  await shot(o, '03-sheet');
  await tapSel(o, '.hf-panel [aria-label="Close panel"]');
  await sleep(2500);
  await shot(o, '04-closed');
  const fr = await takeRec(page);
  const w = wordsOnHero(fr, t0);
  res.notes.sheet = w;
  if (w.face) fail('words seen on Loomi\'s face with the sheet', w.faceAt);
  if (w.body) fail('words seen on Loomi\'s body with the sheet (polish: the hero glides through them while they fade)', { frames: w.body });
  return fr;
}
async function rafCount(page, ms) {
  await page.evaluate(() => { window.__hwRafStats.frames.clear(); window.__hwRafStats.on = true; });
  await sleep(ms);
  return page.evaluate(() => { const R = window.__hwRafStats; R.on = false; const c = [...R.frames.values()]; const hist = {}; for (const n of c) hist[n] = (hist[n] || 0) + 1; return { frames: c.length, max: Math.max(0, ...c), hist }; });
}
async function scenRaf(o) {
  const { page } = o;
  await toStorm(o);
  await sleep(2500);
  res.notes.storm = await rafCount(page, 3000);
  await meltToOcean(o);
  await sleep(2500);
  res.notes.ocean = await rafCount(page, 3000);
  await shot(o, '02-ocean');
  for (const k of ['storm', 'ocean']) if (res.notes[k].max !== 1) fail(`more than one rAF per frame (${k})`, res.notes[k]);
  return [];
}

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const o = await open(b);
  let frames = [];
  try {
    await boot(o);
    frames = await ({ pause: scenPause, first: scenFirst, arrival: scenArrival, card: scenCard, raf: scenRaf, sheet: scenSheet }[SCEN])(o);
  } catch (e) {
    fail('exception', String(e.stack || e));
    try { await shot(o, 'zz-fail'); } catch { /* */ }
  }
  res.errors = o.errors;
  if (o.errors.length) fail('page errors', o.errors.slice(0, 4));
  res.shots = shots;
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, `${TAG}.json`), JSON.stringify({ ...res, frames: frames.slice(-4000) }));
  console.log('RESULT', JSON.stringify(res));
  await b.close();
})();
