// Shared browser-test harness for the Phase 3 suites (SHARED.md L21).
//
// The Phase 2 helpers (tests/e2e-phase2.cjs, which stays as it is) extracted
// and extended: viewports, launching, opening a seeded page, rig waits and
// geometry, events, layout checks (with the Mallow band), results and
// reports, CDP multi-touch, hide/show, and init-script spies.
//
//   const H = require('./lib/harness.cjs');
//   const browser = await H.launch();
//   const { ctx, page, errors } = await H.open(browser, H.VIEWPORTS.phone, '#weather', { initScripts: [H.INIT.timerSpy] });
//   await H.waitRig(page);
//   await H.layout(page, 'weather:phone');
//   H.check('weather:phone', 'no console errors', !errors.length, errors.join(' | '));
//   H.writeReport(outDir, 'e2e-phase3-weather');
//
// Needs the repository root served at http://localhost:8000 (or LAB_URL):
//   cd /home/user/thinkstill-rituals && python3 -m http.server 8000
// Software GL makes frames slow: prefer state checks over timing.

const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');

const BASE = process.env.LAB_URL || 'http://localhost:8000/hushmallow/sensory-lab/index.html';
const EXECUTABLE = process.env.CHROMIUM || '/opt/pw-browsers/chromium';
// QUIET_ARGS keep Chromium's autoplay policy, for gesture-rule checks (no audio before a real gesture)
const QUIET_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const ARGS = [...QUIET_ARGS, '--autoplay-policy=no-user-gesture-required'];

const vp = (name, width, height, touch) => Object.freeze({ name, width, height, touch });
const VIEWPORTS = Object.freeze({
  phone: vp('phone', 390, 844, true),
  p375: vp('p375', 375, 812, true),
  small: vp('small', 320, 568, true),
  android: vp('android', 412, 915, true),
  desktop: vp('desktop', 1280, 860, false),
  land: vp('land', 844, 390, true),
  'land-small': vp('land-small', 568, 320, true),
});

// console noise from software GL is not an app error
const NOISE = /WebGL|GPU|swiftshader|GroupMarker/i;

/** @returns {Promise<import('playwright').Browser>} quiet: keep the autoplay policy (gesture-rule blocks). */
function launch({ quiet = false } = {}) {
  return chromium.launch({ executablePath: EXECUTABLE, args: quiet ? QUIET_ARGS : ARGS });
}

/**
 * New context + page at `hash`. Seeds localStorage once per context with
 * { quality: 'low', ...prefs } (and the Comfort DNA profile, if given), then
 * lets the app own storage. initScripts run before the app, in order: functions
 * without closures (e.g. INIT.timerSpy), [fn, arg] pairs, or source strings.
 * `vpOrName` is a VIEWPORTS entry, a name, or any { width, height, touch }.
 */
async function open(browser, vpOrName, hash = '', { prefs = {}, comfort = null, initScripts = [], scale = 1 } = {}) {
  const v = typeof vpOrName === 'string' ? VIEWPORTS[vpOrName] : vpOrName;
  if (!v) throw new Error(`unknown viewport ${vpOrName}`);
  const ctx = await browser.newContext({ viewport: { width: v.width, height: v.height }, deviceScaleFactor: scale, hasTouch: !!v.touch, isMobile: !!v.touch });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' || (m.type() === 'warning' && !NOISE.test(m.text()))) errors.push(m.type() + ': ' + m.text()); });
  for (const s of initScripts) {
    if (Array.isArray(s)) await page.addInitScript(s[0], s[1]);
    else if (typeof s === 'function') await page.addInitScript(s);
    else await page.addInitScript({ content: String(s) });
  }
  await page.addInitScript(([p, c]) => {
    if (sessionStorage.getItem('seeded')) return;    // seed once per context, then let the app own storage
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('hm.sensorylab.v1', JSON.stringify({ quality: 'low', ...p }));
    if (c) localStorage.setItem('hm.sensorylab.comfort.v1', JSON.stringify(c));
  }, [prefs, comfort]);
  await page.goto(`${BASE}${hash}`);
  return { ctx, page, errors };
}

/** Wait until the lead rig's soft body is ready; with partner, until there are ≥ 2 Companions and every rig is ready. */
function waitRig(page, { partner = false, timeout = 20000 } = {}) {
  return partner
    ? page.waitForFunction(() => { const cs = globalThis.__lab?.companions?.() || []; return cs.length >= 2 && cs.every((c) => c?.rig?.soft); }, null, { timeout })
    : page.waitForFunction(() => globalThis.__lab?.companion?.rig?.soft, null, { timeout });
}

/**
 * The Mallow's body, measured independently with the same maths as Pocket
 * Hush api.body() / rig.bodyRect(): { cx, base, top, bottom, mid, w, h, W, H }
 * in CSS px of the rig's container, plus ox / oy (the container's page offset:
 * page x = ox + cx). `which`: 0 = lead (default), 1 = partner (__lab.companions()).
 */
function geo(page, which = 0) {
  return page.evaluate((i) => {
    const c = i ? globalThis.__lab.companions()[i] : globalThis.__lab.companion;
    const r = c.rig, s = r.soft, S = r._S || r.S;
    const [bx0, by0, bx1, by1] = r.mallow.bodyBox;
    const h = (s ? s.H : by1 - by0) * S, w = (s ? s.W : bx1 - bx0) * S;
    const bottom = r.BASE - (r._lift || 0);
    const o = (r.container || r.canvas.parentElement).getBoundingClientRect();
    return { cx: r.CX, base: r.BASE, top: bottom - h, bottom, mid: bottom - h / 2, w, h, W: r.W, H: r.H, ox: o.left, oy: o.top };
  }, which);
}

const events = (page) => page.evaluate(() => __lab.events.map((e) => e.type));
const clearEvents = (page) => page.evaluate(() => { __lab.events.length = 0; });
/** A Comfort DNA profile for open({ comfort }). */
const comfort = (prefs = {}, extra = {}) => ({ version: 1, enabled: true, learn: false, prefs, favourites: [], history: {}, ...extra });
/** Durations of live Sound Engine voices (600 = a bed / pad). */
const liveVoices = (page) => page.evaluate(() => [...__lab.sound.live].map((v) => v.dur));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --------------------------------------------------------------- results --
const results = [];
const check = (scope, name, ok, detail = '') => { results.push({ scope, name, ok: !!ok, detail: String(detail ?? '') }); if (!ok) console.log(`  ✗ ${scope} · ${name} ${detail}`); return !!ok; };
/** PART filter: true when PART is unset or lists `name` (comma-separated). */
const only = (name) => { const p = process.env.PART; return !p || p.split(',').map((s) => s.trim()).includes(name); };
/** Run one block; a crash becomes a failed check and the context is always closed. own(ctx) registers it. */
async function guard(scope, fn) {
  let ctx = null;
  try { await fn(scope, (c) => { ctx = c; }); } catch (e) { check(scope, 'crashed', false, String(e.message).split('\n')[0]); } finally { await ctx?.close().catch(() => {}); }
}

/**
 * Write `${name}.json` (passed, failed, results) into outDir and print the summary.
 * prefix: only results whose scope starts with it (a feature suite run inside e2e-phase3 shares `results`).
 */
function writeReport(outDir, name, { prefix = '' } = {}) {
  fs.mkdirSync(outDir, { recursive: true });
  const list = prefix ? results.filter((r) => r.scope.startsWith(prefix)) : results;
  const failed = list.filter((r) => !r.ok).length, passed = list.length - failed;
  const file = path.join(outDir, name.endsWith('.json') ? name : `${name}.json`);
  fs.writeFileSync(file, JSON.stringify({ when: new Date().toISOString(), part: process.env.PART || null, passed, failed, results: list }, null, 1));
  console.log(`\n${passed}/${list.length} checks passed → ${path.relative(process.cwd(), file)}`);
  return { passed, failed };
}

/** JPEG screenshot into outDir (docs/phase3/<id>/<id>-<vp>-<state>.jpg by convention). */
const shot = (page, outDir, name) => { fs.mkdirSync(outDir, { recursive: true }); return page.screenshot({ path: path.join(outDir, name.endsWith('.jpg') ? name : `${name}.jpg`), type: 'jpeg', quality: 78 }); };

// ---------------------------------------------------------------- layout --
/**
 * Layout checks for the visible controls in `.topbar`, `.bottom`, `.end-card`
 * (+ `extra` selectors): no overlaps, all on screen, no horizontal page scroll,
 * every target ≥ minTarget px, and with `band` every Mallow's body
 * (rig.bodyRect) between the top bar's bottom and the bottom area's top.
 * A control inside one of `scrollers` is clipped to that scroller: it may be
 * scrolled out of view, and counts as on screen when the scroller is.
 * Records checks under `scope` and returns the measurements.
 */
async function layout(page, scope, { extra = [], scrollers = [], band = true, minTarget = 40 } = {}) {
  const L = await page.evaluate(({ extra, scrollers }) => {
    const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !el.closest('[hidden]') && getComputedStyle(el).visibility !== 'hidden'; };
    const box = (r) => ({ x: r.left, y: r.top, w: r.width, h: r.height });
    const sel = ['.topbar button', '.bottom button', '.end-card button', ...extra].join(', ');
    const ctrls = [...document.querySelectorAll(sel)].filter(vis).map((b) => {
      const r = b.getBoundingClientRect();
      const sc = scrollers.length ? b.closest(scrollers.join(', ')) : null;
      let clip = box(r), scroller = null;
      if (sc) {
        const s = sc.getBoundingClientRect();
        scroller = box(s);
        const x0 = Math.max(r.left, s.left), y0 = Math.max(r.top, s.top), x1 = Math.min(r.right, s.right), y1 = Math.min(r.bottom, s.bottom);
        clip = x1 > x0 && y1 > y0 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null;   // null: scrolled out of view
      }
      return { t: (b.textContent.trim() || b.getAttribute('aria-label') || b.tagName).slice(0, 40), ...box(r), clip, scroller };
    });
    // chrome edges (visible parts only) and every Mallow's body in page px
    const edge = (q, side) => { const els = [...document.querySelectorAll(q)].filter(vis); return els.length ? Math[side === 'bottom' ? 'max' : 'min'](...els.map((e) => e.getBoundingClientRect()[side])) : null; };
    const lab = globalThis.__lab;
    const comps = (lab?.companions?.() || [lab?.companion]).filter((c) => c?.rig);
    const bodies = comps.map((c) => {
      const r = c.rig, o = (r.container || r.canvas.parentElement).getBoundingClientRect();
      let b;
      if (typeof r.bodyRect === 'function') b = r.bodyRect();
      else { const S = r._S || r.S, s = r.soft, [bx0, by0, bx1, by1] = r.mallow.bodyBox, hh = (s ? s.H : by1 - by0) * S, ww = (s ? s.W : bx1 - bx0) * S, bottom = r.BASE - (r._lift || 0); b = { cx: r.CX, top: bottom - hh, bottom, w: ww, h: hh }; }
      return { id: r.id, left: o.left + b.cx - b.w / 2, right: o.left + b.cx + b.w / 2, top: o.top + b.top, bottom: o.top + b.bottom };
    });
    return { ctrls, bodies, topBottom: edge('.topbar', 'bottom'), bottomTop: edge('.bottom', 'top'), sw: document.documentElement.scrollWidth, vw: innerWidth, vh: innerHeight };
  }, { extra, scrollers });

  const onScreen = (b) => b.x >= -0.5 && b.x + b.w <= L.vw + 1 && b.y >= -0.5 && b.y + b.h <= L.vh + 1;
  const overlap = (a, b) => a.x < b.x + b.w - 1 && b.x < a.x + a.w - 1 && a.y < b.y + b.h - 1 && b.y < a.y + a.h - 1;
  const shown = L.ctrls.filter((c) => !c.scroller || c.clip);
  const clash = [];
  for (let i = 0; i < shown.length; i++) for (let j = i + 1; j < shown.length; j++) {
    const a = shown[i], b = shown[j];
    if (overlap(a.scroller ? a.clip : a, b.scroller ? b.clip : b)) clash.push(`${a.t}/${b.t}`);
  }
  check(scope, 'controls do not overlap', !clash.length, clash.join(', '));
  const off = L.ctrls.filter((c) => !onScreen(c.scroller || c)).map((c) => c.t);
  check(scope, 'controls on screen', !off.length, off.join(', '));
  check(scope, 'no horizontal page scroll', L.sw <= L.vw, L.sw <= L.vw ? '' : `${L.sw} > ${L.vw}`);
  if (minTarget > 0) {
    const small = L.ctrls.filter((c) => c.w < minTarget - 0.5 || c.h < minTarget - 0.5).map((c) => `${c.t} ${Math.round(c.w)}×${Math.round(c.h)}`);
    check(scope, `targets ≥ ${minTarget} px`, !small.length, small.join(', '));
  }
  if (band) {
    const top = L.topBottom ?? 0, bottom = L.bottomTop ?? L.vh;
    const out = L.bodies.filter((b) => b.top < top - 1 || b.bottom > bottom + 1 || b.left < -1 || b.right > L.vw + 1)
      .map((b) => `${b.id} ${Math.round(b.top)}–${Math.round(b.bottom)} not in ${Math.round(top)}–${Math.round(bottom)}`);
    check(scope, 'the Mallow sits between the top bar and the bottom area', L.bodies.length > 0 && !out.length, L.bodies.length ? out.join(', ') : 'no Mallow on screen');
  }
  return L;
}

// ---------------------------------------------------------------- touch --
/**
 * Multi-touch through CDP Input.dispatchTouchEvent. frames: [{ t (ms from start), points: [{ x, y, id }] }]
 * (page px). Each frame lists every finger that is down: a new id presses, a moved one moves, a missing one
 * lifts; an empty list lifts all. Use a touch viewport. Fingers still down after the last frame stay down.
 */
async function touch(page, frames) {
  const cdp = await page.context().newCDPSession(page);
  // CDP acknowledges a touch only after the renderer has handled it, so on slow software GL a
  // gesture's events can be hundreds of ms apart. Send a finger's first move with its touchStart,
  // and the lift with the last move, when they were meant to be close (as a real finger's are), and
  // fail a lost acknowledgement after 20 s instead of hanging the run.
  const send = (params) => Promise.race([
    cdp.send('Input.dispatchTouchEvent', params),
    new Promise((_, reject) => setTimeout(() => reject(new Error(`touch: ${params.type} not acknowledged in 20 s`)), 20000)),
  ]);
  const PAIR_MS = 40;
  const t0 = Date.now();
  let prev = new Set();
  const events = frames.map((f) => {
    const pts = (f.points || []).map((p, i) => ({ x: p.x, y: p.y, id: p.id ?? i + 1, radiusX: p.r ?? 4, radiusY: p.r ?? 4, force: p.force ?? 1 }));
    const ids = new Set(pts.map((p) => p.id));
    const type = !pts.length ? 'touchEnd' : pts.some((p) => !prev.has(p.id)) ? 'touchStart' : 'touchMove';
    prev = ids;
    return { t: f.t || 0, params: { type, touchPoints: pts } };
  });
  try {
    for (let i = 0; i < events.length; i++) {
      const e = events[i], next = events[i + 1];
      const wait = e.t - (Date.now() - t0);
      if (wait > 0) await sleep(wait);
      const pair = next && next.t - e.t <= PAIR_MS
        && ((e.params.type === 'touchStart' && next.params.type === 'touchMove') || (e.params.type === 'touchMove' && next.params.type === 'touchEnd'));
      if (pair) { await Promise.all([send(e.params), send(next.params)]); i++; }
      else await send(e.params);
    }
  } finally { await cdp.detach().catch(() => {}); }
}

// ------------------------------------------------------------ visibility --
/**
 * Pretend the page was hidden or shown: defines document.hidden / visibilityState
 * and dispatches visibilitychange; with lifecycle, also pagehide (after hiding) or
 * pageshow (before showing). Note: page.evaluate counts as a user activation.
 */
function setHidden(page, hidden, { lifecycle = false } = {}) {
  return page.evaluate(([h, life]) => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => h });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (h ? 'hidden' : 'visible') });
    if (life && !h) window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    document.dispatchEvent(new Event('visibilitychange'));
    if (life && h) window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
  }, [!!hidden, !!lifecycle]);
}

// ----------------------------------------------------------- init spies --
// Plain functions passed to page.addInitScript (no closures). Each installs once.

/** __listeners() → { window: {type: n}, document: {type: n}, total }: live listeners on window and document. */
function listenerCounter() {
  if (window.__listeners) return;
  const add = EventTarget.prototype.addEventListener, remove = EventTarget.prototype.removeEventListener;
  const live = new Map();   // target → Map(type → Map(fn → Set(capture)))
  const which = (t) => (t === window ? 'window' : t === document ? 'document' : null);
  const cap = (o) => !!(typeof o === 'boolean' ? o : o?.capture);
  const drop = (name, type, fn, c) => {
    const s = live.get(name)?.get(type)?.get(fn);
    if (s?.delete(c) && !s.size) live.get(name).get(type).delete(fn);
  };
  EventTarget.prototype.addEventListener = function (type, fn, o) {
    const name = which(this);
    if (name && fn && !String(type).startsWith('__playwright')) {   // Playwright's own probes are not the app's
      const c = cap(o);
      if (!live.has(name)) live.set(name, new Map());
      const byType = live.get(name);
      if (!byType.has(type)) byType.set(type, new Map());
      const byFn = byType.get(type);
      const fresh = !byFn.get(fn)?.has(c);
      if (!byFn.has(fn)) byFn.set(fn, new Set());
      byFn.get(fn).add(c);
      if (fresh && o && typeof o === 'object') {
        // once and signal remove the listener without removeEventListener
        if (o.once) add.call(this, type, () => drop(name, type, fn, c), { once: true, capture: c });
        if (o.signal) add.call(o.signal, 'abort', () => drop(name, type, fn, c), { once: true });
      }
    }
    return add.call(this, type, fn, o);
  };
  EventTarget.prototype.removeEventListener = function (type, fn, o) {
    const name = which(this);
    if (name && fn) drop(name, type, fn, cap(o));
    return remove.call(this, type, fn, o);
  };
  window.__listeners = () => {
    const out = { window: {}, document: {}, total: 0 };
    for (const [name, byType] of live) for (const [type, byFn] of byType) {
      let n = 0;
      for (const s of byFn.values()) n += s.size;
      if (n) { out[name][type] = n; out.total += n; }
    }
    return out;
  };
}

/**
 * __timers() → { live: {file: {timeout, interval}}, created: {file: {timeout, interval}} }, attributed to the
 * page script that called setTimeout / setInterval (pathname, e.g. /hushmallow/sensory-lab/core/companion.js).
 */
function timerSpy() {
  if (window.__timers) return;
  const st = window.setTimeout, ct = window.clearTimeout, si = window.setInterval, ci = window.clearInterval;
  const live = new Map();   // id → { file, kind }
  const created = {};
  const caller = () => {
    const lines = String(new Error().stack).split('\n');
    for (const l of lines) { const m = l.match(/(https?:\/\/[^\s)]+?):\d+:\d+/); if (m) { try { return new URL(m[1]).pathname; } catch { return m[1]; } } }
    return 'unknown';
  };
  const note = (file, kind) => { const c = (created[file] ||= { timeout: 0, interval: 0 }); c[kind]++; };
  window.setTimeout = function (fn, ms, ...a) {
    const file = caller();
    note(file, 'timeout');
    if (typeof fn !== 'function') return st(fn, ms, ...a);
    const id = st(function () { live.delete(id); return fn.apply(this, arguments); }, ms, ...a);
    live.set(id, { file, kind: 'timeout' });
    return id;
  };
  window.clearTimeout = function (id) { live.delete(id); return ct(id); };   // ids are one pool: either clear works for both
  window.setInterval = function (fn, ms, ...a) {
    const file = caller();
    note(file, 'interval');
    const id = si(fn, ms, ...a);
    live.set(id, { file, kind: 'interval' });
    return id;
  };
  window.clearInterval = function (id) { live.delete(id); return ci(id); };
  window.__timers = () => {
    const out = {};
    for (const { file, kind } of live.values()) { const c = (out[file] ||= { timeout: 0, interval: 0 }); c[kind]++; }
    return { live: out, created: JSON.parse(JSON.stringify(created)) };
  };
}

/**
 * __audio() → { created, contexts: [{ state, sampleRate, activation, t }], toDestination, started }:
 * AudioContexts made (with navigator.userActivation.isActive at construction), connections straight to a
 * destination, and source starts. Install it with a QUIET browser to test gesture rules.
 */
function audioSpy() {
  if (window.__audio) return;
  const list = [];
  let toDestination = 0, started = 0;
  for (const name of ['AudioContext', 'webkitAudioContext']) {
    const Orig = window[name];
    if (typeof Orig !== 'function') continue;
    window[name] = class extends Orig {
      constructor(...a) { super(...a); list.push({ ctx: this, activation: !!navigator.userActivation?.isActive, t: performance.now() }); }
    };
  }
  if (window.AudioNode) {
    const connect = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (dest, ...a) { if (window.AudioDestinationNode && dest instanceof AudioDestinationNode) toDestination++; return connect.call(this, dest, ...a); };
  }
  if (window.AudioScheduledSourceNode) {
    const start = AudioScheduledSourceNode.prototype.start;
    AudioScheduledSourceNode.prototype.start = function (...a) { started++; return start.apply(this, a); };
  }
  window.__audio = () => ({
    created: list.length,
    contexts: list.map((e) => ({ state: e.ctx.state, sampleRate: e.ctx.sampleRate, activation: e.activation, t: e.t })),
    toDestination, started,
  });
}

/**
 * __raf(windowMs = 1000) → { requested, ran, pending, inWindow, pendingByFile }: rAF callbacks requested, run,
 * still pending (by the calling page script) and run within the last windowMs.
 */
function rafProbe() {
  if (window.__raf) return;
  const raf = window.requestAnimationFrame, caf = window.cancelAnimationFrame;
  const pending = new Map();   // id → file
  const ring = new Float64Array(1024);
  let requested = 0, ran = 0;
  const caller = () => {
    const lines = String(new Error().stack).split('\n');
    for (const l of lines) { const m = l.match(/(https?:\/\/[^\s)]+?):\d+:\d+/); if (m) { try { return new URL(m[1]).pathname; } catch { return m[1]; } } }
    return 'unknown';
  };
  window.requestAnimationFrame = function (fn) {
    requested++;
    const file = caller();
    const id = raf(function (t) { pending.delete(id); ring[ran++ % ring.length] = performance.now(); return fn(t); });
    pending.set(id, file);
    return id;
  };
  window.cancelAnimationFrame = function (id) { pending.delete(id); return caf(id); };
  window.__raf = (windowMs = 1000) => {
    const now = performance.now(), n = Math.min(ran, ring.length);
    let inWindow = 0;
    for (let i = 0; i < n; i++) if (now - ring[i] <= windowMs) inWindow++;
    const pendingByFile = {};
    for (const f of pending.values()) pendingByFile[f] = (pendingByFile[f] || 0) + 1;
    return { requested, ran, pending: pending.size, inWindow, pendingByFile };
  };
}

const INIT = Object.freeze({ listenerCounter, timerSpy, audioSpy, rafProbe });

// ---------------------------------------------------------------- pixels --
/**
 * Decode a PNG screenshot (page.screenshot() with no type: 8-bit RGB or RGBA, not interlaced) into
 * { width, height, at(x, y) → [r, g, b] } so a check can compare what a person actually sees.
 */
function pngPixels(buf) {
  const zlib = require('zlib');
  let p = 8, width = 0, height = 0, ch = 0;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') {
      width = d.readUInt32BE(0); height = d.readUInt32BE(4);
      if (d[8] !== 8 || d[12] !== 0 || (d[9] !== 2 && d[9] !== 6)) throw new Error(`pngPixels: unsupported PNG (depth ${d[8]}, colour ${d[9]}, interlace ${d[12]})`);
      ch = d[9] === 6 ? 4 : 3;
    } else if (type === 'IDAT') idat.push(d);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat)), stride = width * ch, px = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1, row = y * stride;
    for (let i = 0; i < stride; i++) {
      const a = i >= ch ? px[row + i - ch] : 0, b = y ? px[row - stride + i] : 0, c = i >= ch && y ? px[row - stride + i - ch] : 0;
      let v = raw[src + i];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      px[row + i] = v & 255;
    }
  }
  return { width, height, at: (x, y) => { const i = Math.round(y) * stride + Math.round(x) * ch; return [px[i], px[i + 1], px[i + 2]]; } };
}
/** Largest channel difference between two [r, g, b] colours. */
const colourDiff = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));

module.exports = {
  chromium, BASE, ARGS, QUIET_ARGS, VIEWPORTS,
  launch, open, waitRig, geo, events, clearEvents, comfort, layout,
  results, check, writeReport, only,
  touch, setHidden, INIT,
  // extras
  guard, shot, liveVoices, sleep, pngPixels, colourDiff,
};
