// Browser probe (final QA, tier B "patchwork face"): does a MallowTouch hero ever show its face parts without its
// body? A GPU process crash wipes every 2D canvas (Chrome: contextlost, then contextrestored with the canvas
// blank); the rig used to redraw only the changed face parts after that, so Zuzu came back as eye, brow, cheek and
// mouth tiles with no body until something forced a full skin redraw.
//
//   node hushmallow/tools/skin-loss-probe.cjs <angle|lab> [runs=40] [from=1] [port=8347] [quality=tri] [nocrash]
//                                            [out=DIR] [shots=2]
//
// The repo root must be served (python3 -m http.server <port> from it). One browser at a time, a fresh one per
// run. Scenarios:
//   angle  Another Angle at 390x844 (a Beyond plan and consent seeded): Tell, the heavy text typed with the overlay
//          open while the stage is set to the concerned face and the care mix, Send, the lines, five squeezes.
//          MallowTouch's own tier ('auto': B under SwiftShader, whose WebGL fails the strict check).
//   lab    touch-lab.html?mallow=zuzu&quality=<gl|tri|strip>: the concerned face + care mix, squeezes, a
//          devicePixelRatio flip and a resize, a Mallow swap (Zuzu -> Boppo -> Zuzu).
// Each run crashes the GPU process once (CDP Browser.crashGpuProcess; `nocrash`: never) at a phase that rotates
// with the run number, and adds one stressor (dpr 2<->3, a viewport resize, a hidden page, a Mallow swap, the
// concerned stage set again). Detector: a shared-loop ticker that runs after MallowTouch's composites the hero's
// own canvases (WebGL + 2D: what tier A, B or C shows) inside the frame that drew them and measures the opaque
// share of the body box; BROKEN when it falls under 0.7 x that Mallow's healthy baseline while no context is lost,
// the page is visible, the body box is on the canvas (>= 90 %), > 400 ms after a context came back and > 1.5 s
// after a Mallow swap. (A healthy Zuzu measures 0.8-1.0 x, squeezed or not; the patchwork 0.2-0.45 x.) The WebGL
// canvas is read with readPixels in that frame. Measured on 2026-10-13 (SwiftShader): before the fix 38 of 40
// angle runs broken, tiers B and C 3 of 3 each in the lab, tier A 2 of 3 (the patchwork while WebGL was lost and
// tier B stood in); after it 0 of 40 angle runs, 0 of 6 per tier in the lab (one tier A run saw one blank frame at
// the crash itself, before the browser reported the 2D loss).
// Prints "RUN {...}" per run and "RESULT {...}"; screenshots (the hero, cropped) of the first `shots` broken runs
// and of the first run go to out (default the system temp dir).
// Playwright from /opt/node-tools; Chromium at /opt/pw-browsers/chromium (never playwright install). Touch via CDP.
const { createRequire } = require('module');
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');

const argv = process.argv.slice(2);
const SCEN = argv[0] === 'lab' ? 'lab' : 'angle';
const opt = (k, d) => { const a = argv.find((x) => x.startsWith(`${k}=`)); return a ? a.slice(k.length + 1) : d; };
const RUNS = +opt('runs', 40), FROM = +opt('from', 1), PORT = +opt('port', 8347), Q = opt('quality', 'tri');
const CRASH = !argv.includes('nocrash'), SHOTS = +opt('shots', 2);
const OUT = opt('out', path.join(os.tmpdir(), 'skin-loss-probe'));
const APP = `http://127.0.0.1:${PORT}/hushmallow/`;
const TEXT = 'At the 12 week scan there was no heartbeat. I should have rested more.';
const CARE = [{ sad: 0.4, calm: 0.4, curious: 0.2 }, 0.55, { extra: { mouthSmile: 0.08, mouthOpen: 0.04, tears: 0, fxRain: 0, fxHeart: 0, leanBias: 0.2 }, quiet: true }];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });

// ---- in the page: seeds, every MallowTouch made (and its swaps), and the in-frame detector
function pageInit({ care }) {
  if (!/^https?:$/.test(location.protocol)) return;
  try {
    if (!sessionStorage.getItem('probe:seeded')) {
      sessionStorage.setItem('probe:seeded', '1');
      localStorage.clear();
      localStorage.setItem('hm2:entitlement', JSON.stringify({ tier: 'ultra', source: 'test', since: Date.now() }));
      localStorage.setItem('hm2:beyond.consent', JSON.stringify({ v: 2, choice: 'yes', at: '2026-10-13' }));
    }
  } catch { /* storage blocked */ }
  window.__care = care;
  const D = (window.__det = { on: false, samples: 0, broken: 0, skipped: 0, min: 9, first: null, base: {}, pend: {}, events: [], lastRestore: -1e9, lastSwap: -1e9, tiers: {}, mts: [], phase: '' });
  D.hero = () => { const r = window.__angle?.zuzu?.rig; return (r && D.mts.find((m) => m.rig === r)) || D.mts[0] || null; };
  const hooked = new WeakSet();
  const hook = (c, lost, back, tag) => { if (!c || hooked.has(c)) return; hooked.add(c); c.addEventListener(lost, () => D.events.push(`${tag} lost`)); c.addEventListener(back, () => { D.lastRestore = performance.now(); D.events.push(`${tag} back`); }); };
  const med = (a) => [...a].sort((x, y) => x - y)[a.length >> 1];
  let want = false, sc = null, sg = null;
  setInterval(() => { want = true; }, 150);
  let seenFrames = -1;
  const sample = () => {
    const mt = D.hero();
    // (only a frame MallowTouch drew just now: its frame count moved since this ticker last ran)
    const fresh = !!mt && mt.stats.frames !== seenFrames;
    if (mt) seenFrames = mt.stats.frames;
    if (!D.on || !want || !mt?.ready || mt.destroyed || !fresh || !mt.stats.last.drawn) return;
    want = false;
    const rig = mt.rig, root = mt.root;
    hook(rig.skin, 'contextlost', 'contextrestored', 'skin'); hook(mt.c2d, 'contextlost', 'contextrestored', '2d'); hook(mt.glCanvas, 'webglcontextlost', 'webglcontextrestored', 'gl');
    const lost = !!(mt.ctx?.isContextLost?.() || rig.sctx?.isContextLost?.() || (mt.tier === 'gl' && mt.renderer?.lost));
    const r = mt.bodyRect(), cr = root.getBoundingClientRect(), dpr = mt.view.dpr;
    const ix = r.width * 0.06, iy = r.height * 0.06;
    const bx0 = (r.left - cr.left + ix) * dpr, by0 = (r.top - cr.top + iy) * dpr, bw = (r.width - 2 * ix) * dpr, bh = (r.height - 2 * iy) * dpr;
    // the part of the body box on the canvas (a body moved partly off it is not a broken one)
    const CW = mt.c2d.width, CH = mt.c2d.height;
    const x0 = Math.max(0, Math.floor(bx0)), y0 = Math.max(0, Math.floor(by0));
    const w = Math.min(CW, Math.floor(bx0 + bw)) - x0, h = Math.min(CH, Math.floor(by0 + bh)) - y0;
    if (w < 8 || h < 8) return;
    const inside = (w * h) / Math.max(1, bw * bh);
    if (!sc) { sc = document.createElement('canvas'); sg = sc.getContext('2d', { willReadFrequently: true }); }
    sc.width = w; sc.height = h;
    // the 2D canvases through drawImage; the WebGL one through readPixels in this same frame (a WebGL canvas whose
    // context was restored reads back blank through drawImage here, though it shows fine)
    const glc = mt.glCanvas, gl = mt.renderer?.gl;
    const useGL = !!(glc && glc.style.display !== 'none' && gl && !mt.renderer.lost && glc.width === CW && glc.height === CH);
    for (const c of root.querySelectorAll('canvas')) if (c !== glc && c.style.display !== 'none' && c.width > 0) sg.drawImage(c, x0, y0, w, h, 0, 0, w, h);
    const d = sg.getImageData(0, 0, w, h).data;
    let gp = null;
    if (useGL) { gp = new Uint8Array(w * h * 4); gl.readPixels(x0, CH - y0 - h, w, h, gl.RGBA, gl.UNSIGNED_BYTE, gp); }
    let n = 0, op = 0;
    for (let y = 0; y < h; y += 3) for (let x = 0; x < w; x += 3) { n++; if (Math.max(d[(y * w + x) * 4 + 3], gp ? gp[((h - 1 - y) * w + x) * 4 + 3] : 0) > 200) op++; }
    const vis = op / n, now = performance.now(), id = rig.id, tier = mt.stats.tier;
    D.tiers[tier] = (D.tiers[tier] || 0) + 1;
    const skip = lost || document.hidden || inside < 0.9 || now - D.lastRestore < 400 || now - D.lastSwap < 1500;
    if (!D.base[id]) { if (!skip) { (D.pend[id] ||= []).push(vis); if (D.pend[id].length >= 6) D.base[id] = med(D.pend[id]); } return; }
    D.samples++;
    if (skip) { D.skipped++; return; }
    const k = vis / D.base[id];
    if (k < D.min) D.min = k;
    if (k < 0.7) {
      D.broken++;
      if (!D.first) D.first = { k: +k.toFixed(3), tier, id, phase: D.phase, box: [x0, y0, w, h].map(Math.round), canvas: [CW, CH], view: [mt.view.w, mt.view.h, dpr], skinV: rig.skinVersion, frames: mt.stats.frames };
    }
  };
  D.summary = () => ({ samples: D.samples, broken: D.broken, skipped: D.skipped, min: +D.min.toFixed(3), first: D.first, base: D.base, events: D.events.slice(0, 10), tiers: D.tiers });
  Promise.all([import('/hushmallow/src/mallows/touch/mallow-touch.js'), import('/hushmallow/src/mallows/rig.js')]).then(([{ MallowTouch }, { addTicker }]) => {
    const P = MallowTouch.prototype, init = P._init, swap = P.setMallow;
    // (the detector's ticker joins the shared loop after the first MallowTouch's, so it sees each frame as drawn)
    P._init = function (...a) { const out = init.apply(this, a); D.mts.push(this); if (!D.ticking) { D.ticking = true; addTicker(sample); } return out; };
    P.setMallow = function (...a) { D.lastSwap = performance.now(); const p = swap.apply(this, a); p?.then?.(() => { D.lastSwap = performance.now(); }); return p; };
  }).catch((e) => { D.events.push(`detector not installed: ${e?.message || e}`); });
}

const touch = (cdp, type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p.x, y: p.y, id: p.id ?? i + 1, radiusX: 8, radiusY: 8, force: 1 })) });
async function tap(cdp, x, y) { await touch(cdp, 'touchStart', [{ x, y }]); await sleep(70); await touch(cdp, 'touchEnd', []); }
async function squeeze(cdp, p, ms = 500) { await touch(cdp, 'touchStart', [p]); for (let i = 0; i < 6; i++) { await sleep(ms / 6); await touch(cdp, 'touchMove', [{ x: p.x + (i % 2), y: p.y + 1 }]); } await touch(cdp, 'touchEnd', []); }
async function tapEl(page, cdp, sel, text = null) {
  const r = await page.evaluate(({ sel, text }) => { const e = [...document.querySelectorAll(sel)].find((x) => !x.hidden && x.offsetParent !== null && (!text || x.textContent.includes(text))); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }, { sel, text });
  if (!r) throw new Error(`no ${sel} ${text || ''}`);
  await tap(cdp, r.x, r.y);
}
const heroRect = (page) => page.evaluate(() => window.__det.hero().bodyRect());
async function shotHero(page, file) {
  const z = await heroRect(page), vp = page.viewportSize();
  const x = Math.max(0, z.left - 30), y = Math.max(0, z.top - 30);
  await page.screenshot({ path: file, clip: { x, y, width: Math.min(vp.width - x, z.width + 60), height: Math.min(vp.height - y, z.height + 60) } });
  return file;
}

async function angle(page, cdp, crash, run, res) {
  const extra = ['stage', 'dpr', 'resize', 'hidden', 'swap'][run % 5], crashAt = ['typing', 'typed', 'lines', 'squeeze'][run % 4];
  Object.assign(res, { extra, crash: CRASH ? crashAt : null });
  const at = async (p) => { await page.evaluate((p) => { window.__det.phase = p; }, p); if (p === crashAt) await crash(); };
  await page.goto(APP + 'index.html');
  await page.waitForFunction(() => window.__hush && window.__hush.world, null, { timeout: 120000 });
  await page.evaluate(() => window.__hush.go('angle'));
  await page.waitForFunction(() => window.__angle?.zuzu?.ready && window.__det.hero(), null, { timeout: 120000 });
  await page.waitForFunction(() => [...document.querySelectorAll('.hf-chips:not([hidden]) .hf-chip')].some((e) => e.textContent.includes('Tell') && e.offsetParent), null, { timeout: 90000 });
  await page.evaluate(() => { window.__det.on = true; });
  await sleep(1200);
  await tapEl(page, cdp, '.hf-chips:not([hidden]) .hf-chip', 'Tell');
  await page.waitForSelector('.hf-input textarea', { timeout: 30000 });
  await sleep(500);
  await page.focus('.hf-input textarea');
  await page.evaluate(() => { window.__det.phase = 'typing'; });
  await page.keyboard.type(TEXT.slice(0, 35), { delay: 18 });
  await at('typing');
  await page.keyboard.type(TEXT.slice(35), { delay: 18 });
  // the gentle path's faces while the overlay is open: the concerned stage, then the care mix
  await page.evaluate(() => { const z = window.__angle.zuzu; z.setStage('concerned'); setTimeout(() => z.setEmotion(...window.__care), 600); });
  if (extra === 'dpr') await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: res.dsf === 3 ? 2 : 3, mobile: true });
  await at('typed');
  await sleep(1500);
  if (extra === 'dpr') { await cdp.send('Emulation.clearDeviceMetricsOverride'); await sleep(400); }
  if (await page.evaluate(() => document.querySelectorAll('#sheet-root .sheet.open').length)) { await page.goBack(); await sleep(800); }
  if (await page.evaluate(() => { const b = document.querySelector('.hf-input .hf-send'); return !!b && !b.disabled; })) await tapEl(page, cdp, '.hf-input .hf-send');
  await page.evaluate(() => { window.__det.phase = 'lines'; });
  await sleep(2500);
  await at('lines');
  if (extra === 'resize') { await page.setViewportSize({ width: 390, height: 560 }); await sleep(1500); await page.setViewportSize({ width: 390, height: 844 }); }
  if (extra === 'hidden') {
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
    await sleep(1200);
    await page.evaluate(() => { delete document.hidden; delete document.visibilityState; document.dispatchEvent(new Event('visibilitychange')); });
  }
  if (extra === 'swap') { await page.evaluate(() => window.__angle.zuzu.setMallow('boppo')); await sleep(1800); await page.evaluate(() => window.__angle.zuzu.setMallow('zuzu')); await sleep(1800); }
  await sleep(3000);
  await page.evaluate(() => { window.__det.phase = 'squeeze'; });
  for (let i = 0; i < 5; i++) {
    const z = await heroRect(page);
    await squeeze(cdp, { x: z.cx, y: z.cy }, 500);
    if (i === 2) await at('squeeze');
    if (extra === 'stage' && i < 3) await page.evaluate((i) => { const z = window.__angle.zuzu; if (i === 0) z.setStage('concerned'); else z.setEmotion(...window.__care); }, i);
    await sleep(900);
  }
  await sleep(1500);
  res.tierEnd = await page.evaluate(() => window.__angle.zuzu.tier);
}

async function lab(page, cdp, crash, run, res) {
  Object.assign(res, { quality: Q, crash: CRASH ? 'after-care' : null });
  await page.goto(`${APP}touch-lab.html?mallow=zuzu&quality=${Q}&ui=0&dots=0`);
  await page.waitForFunction(() => window.__touch?.mt?.ready && window.__det.hero(), null, { timeout: 120000 });
  await sleep(800);
  await page.evaluate(() => { window.__det.on = true; const mt = window.__touch.mt; mt.setStage('concerned'); setTimeout(() => mt.setEmotion(...window.__care), 600); });
  await sleep(2500);
  await page.evaluate(() => { window.__det.phase = 'crash'; });
  await crash();
  await sleep(2500);
  await page.evaluate(() => { window.__det.phase = 'squeeze'; });
  for (let i = 0; i < 3; i++) { const z = await heroRect(page); await squeeze(cdp, { x: z.cx, y: z.cy }, 500); await sleep(700); }
  await page.evaluate(() => { window.__det.phase = 'dpr+resize'; });
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: res.dsf === 3 ? 2 : 3, mobile: true });
  await sleep(1200);
  await cdp.send('Emulation.clearDeviceMetricsOverride');
  await page.setViewportSize({ width: 390, height: 600 }); await sleep(1000); await page.setViewportSize({ width: 390, height: 844 });
  await sleep(1000);
  await page.evaluate(() => { window.__det.phase = 'swap'; });
  await page.evaluate(() => window.__touch.switchTo('boppo'));
  await sleep(2200);
  await page.evaluate(() => window.__touch.switchTo('zuzu'));
  await sleep(2500);
  await page.evaluate(() => window.__touch.mt.setStage('concerned'));
  await sleep(1500);
  res.tierEnd = await page.evaluate(() => window.__touch.mt.stats.tier);
}

async function one(run) {
  const res = { scen: SCEN, run, dsf: run % 3 === 2 ? 3 : 2, notes: [] };
  const t0 = Date.now();
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'], timeout: 60000 });
  const errors = [];
  try {
    const bcdp = await browser.newBrowserCDPSession();
    const crash = () => (CRASH ? bcdp.send('Browser.crashGpuProcess').then(() => res.notes.push('gpu crashed'), (e) => res.notes.push(`crash: ${e.message}`)) : null);
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: res.dsf, hasTouch: true, isMobile: true });
    await ctx.addInitScript(pageInit, { care: CARE });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`pageerror: ${String(e?.message || e).slice(0, 200)}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text().slice(0, 200)}`); });
    page.on('crash', () => errors.push('page crashed'));
    const cdp = await ctx.newCDPSession(page);
    const work = (SCEN === 'lab' ? lab : angle)(page, cdp, crash, run, res);
    await Promise.race([work, sleep(380000).then(() => { throw new Error('run timed out (380 s)'); })]);
    res.det = await page.evaluate(() => window.__det.summary());
    res.broken = res.det.broken > 0;
    if ((res.broken && shotsLeft.broken-- > 0) || shotsLeft.first-- > 0) res.shot = await shotHero(page, path.join(OUT, `${SCEN}${SCEN === 'lab' ? '-' + Q : ''}-${run}-${res.broken ? 'broken' : 'ok'}.png`));
  } catch (e) { res.error = String(e?.message || e).split('\n')[0]; }
  res.errors = errors.slice(0, 5);
  res.sec = Math.round((Date.now() - t0) / 1000);
  await browser.close().catch(() => {});
  return res;
}

const shotsLeft = { broken: SHOTS, first: 1 };
(async () => {
  const all = [];
  for (let run = FROM; run < FROM + RUNS; run++) {
    const r = await one(run);
    all.push(r);
    console.log('RUN ' + JSON.stringify(r));
  }
  const done = all.filter((r) => r.det);
  console.log('RESULT ' + JSON.stringify({ scen: SCEN, quality: SCEN === 'lab' ? Q : 'auto', crash: CRASH, runs: all.length, measured: done.length,
    broken: done.filter((r) => r.broken).length, brokenRuns: done.filter((r) => r.broken).map((r) => r.run), errors: all.filter((r) => r.error).map((r) => `${r.run}: ${r.error}`),
    minRatio: Math.min(...done.map((r) => r.det.min)), shots: all.map((r) => r.shot).filter(Boolean) }));
})();
