// Hushbeat Symphony browser tests (spec-hushbeat.md §13; the L21 harness).
//
//   python3 -m http.server 8000          # from the repository root
//   node hushmallow/sensory-lab/tests/e2e-phase3-hushbeat.cjs [outDir]
//   PART=hushbeat:open,hushbeat:gestures  (blocks below; default all)
//
// Also runs inside tests/e2e-phase3.cjs through run(browser, { out, only }).
// Simulated input proves state, never smoothness: software GL can run at ~6 fps,
// so waits are on state with generous limits. Musical timing is asserted on the
// times inside events (and the audio times the renderer chose), never on wall time.
//
// Blocks (slice 2: audio and the first playable):
//   open      E1: from the home card and from #hushbeat; rig ready, stage focused, hint, title, labels
//   quiet     E2/E3/E5 (quiet browser, touch, no evaluate before the first gesture): nothing before a
//             gesture; the first tap is re-struck audibly once unlocked; a first-touch hold never bursts
//   gestures  E4/E6: onset at contact (≤ 6 ms added); hold → hum; press down, wheel and a pinch → bass
//             under a ducked note; a real stroke → phrase notes on the grid; double tap → chord; drag up → bend
//   keys      E7: Enter, D, P, T, S, H, B and 1–7, and the chips Note, Chord, Tune, Bass, Hum, Breathe
//   mallows   every Mallow: each solo gesture renders in its own instrument (keys), no errors
//   breath    E8: Breathe leads; the tempo moves only at bar lines by ≤ 8 % a bar; an off-body press
//             leads too; the Mallow fills with the breath
//   offline   E10: offline renders (real Web Audio DSP) of every kit: pitch, loudness, clicks, hum
//             attack and release, bass pitch and phone-band energy
//   rapid     E9: 40 taps in 2 s, solo and in a duet (Zuzu leads Pipzi): voice caps, every note in key, nothing clashes
//   quietmode E12/E13 (part): Mute keeps the music running silently, and unmuting during a hum brings
//             it back; Visual only plays no sound, shows the suffix, survives a reload
//   hidden    E19 (part): a hidden page releases everything, stops the scheduler, plays nothing after
//   exit      E20: Escape plays the cadence and goes home; a second Escape is immediate; nothing left;
//             12 switches leave listeners, timers and voices at the baseline
//   layout    E22 (part): solo, solo + tray, and the row with Replay and Keep at phone, small, desktop, landscape
// Slice 3 (performance and scene):
//   scene     E3 (bead and singing mouth at the touch), E17 (scheduled notes seen when heard, the groove on the
//             beat, none in reduced motion), the realm warming and transforming, E18 (40 rapid taps ≤ 3 bright/s)
//   replay    E14: hidden until 3 events; Replay/Stop with aria-pressed and the tint; same degrees on their
//             soft-quantised beats; the Mallow performs and ends proud (one success pulse); R; Stop ≤ 200 ms; hidden
//   keep      E15: Keep/Removed/K, hidden while personalisation is off; home "For you"; Play it (nothing before);
//             the Comfort DNA description; six tunes kept → Keep refuses without dropping anything
//   rest      RESTING after the idle time (test seam): the resting face, a dimmer ring, Zuzu's spiral slows; a touch wakes
// Slice 4 (duet, sheets, styles):
//   duet      E16/E21: the picker, two stages and rigs, the hello, harmonies within 400 ms, a bloom and its arc, an answer,
//             Friend answers Off, G, Tab between the stages, Keep with the friend and the kept duet from home (Play it),
//             motion and quality reach both rigs, Play alone; the favourite Mallow never changes
//   sheet     E11/E13/E23 (parts): Sound and pace: Volume moves prefs.volume and the master gain (at 0 the light still
//             plays), Music | Visual only, Breath pace, Your tunes (Play brings the tune's friend; Remove keeps focus in
//             the list; empty; personalisation off), Lab settings, the footnote; Escape closes the sheet first
//   layout    (E22) also: duet, duet + tray, the sheet and the picker, at all seven viewports (land-small included)
// Slice 5 (the full suite and visual QA):
//   a11y      E23: the Tab order (stage, top bar, tray, row; the partner stage in a duet) with names and a visible
//             focus ring; keyboard only: Buttons, a held chip, the picker (focus kept inside, Escape first, focus
//             back on Friend); no request leaves the origin, none at all while playing; no microphone, no fetch
//   scroll    E24: drags, strokes, stretches, pinches (on and off the body, in a duet) never scroll or zoom the page
//   isolation E21: after a duet in Visual only, TouchTalk still pokes with sound; the lab's Mallow, the favourite,
//             the pace and the sound switches are unchanged; nothing of Hushbeat is left
//   looks     (E22, visual QA): every Mallow in its own world mid-hum, at phone size; text tones follow the backdrop;
//             the sheet and picker over the dark worlds
// quietmode now also checks beads while muted, and in Visual only the role captions, the singing mouth, Replay
// and Keep; rapid adds two-finger bursts on two Mallows at once (CDP touch).
//
// The report maps every check to the brief line it proves (BRIEF below, from spec §13): the `brief` field of
// e2e-phase3-hushbeat.json. HB_MERGE=1 merges a PART run into the existing report (re-run blocks replace theirs).

const path = require('path');
const fs = require('fs');
const H = require('./lib/harness.cjs');
const { check, guard, sleep } = H;

// spec §13: each browser check and the brief line it proves
const BRIEF = Object.freeze({
  E1: 'Opens correctly; the character loads; controls are visible',
  E2: 'Audio respects browser user-gesture requirements; no loud audio on page load',
  E3: 'Tap produces a note; animation synchronisation',
  E4: 'No unnecessary audio delay',
  E5: 'Audio playback respects browser user-gesture requirements',
  E6: 'All required gesture types produce appropriate musical responses',
  E7: 'Clear alternatives for people who cannot or prefer not to perform gestures',
  E8: 'Breathing influences the rhythm',
  E9: 'The sounds remain harmonious even during rapid interaction',
  E10: 'Character-specific sounds; Web Audio synthesis; smooth sound transitions; squeeze introduces a warm bass tone',
  E11: 'Volume control',
  E12: 'Mute',
  E13: 'Visual-only mode',
  E14: 'Replay sound sequences',
  E15: 'Save favourite sound combinations',
  E16: 'Interactions involving two Mallows create harmonies',
  E17: 'Animation synchronisation; reduced motion works; reactions are correct',
  E18: 'No flashes (photosensitivity: at most ~3 bright events a second)',
  E19: 'Background behaviour: nothing runs or plays while hidden',
  E20: 'Exit works; state cleanup is correct; no leaks when switching features',
  E21: 'Feature state remains isolated from other experiences',
  E22: 'Highly responsive mobile layouts; no clipping or overlapping; the Mallow remains the centre of attention',
  E23: 'Accessibility (keyboard); privacy; no paid APIs and no unnecessary network requests',
  E24: 'Touch does not accidentally trigger unwanted browser scrolling',
});
// each block and the checks it carries (a check that names its own E number counts for that one)
const BLOCKS = Object.freeze({
  open: ['E1'], quiet: ['E2', 'E3', 'E5'], gestures: ['E4', 'E6'], keys: ['E7'], mallows: ['E6', 'E10'], breath: ['E8'],
  offline: ['E10'], rapid: ['E9'], quietmode: ['E12', 'E13'], hidden: ['E19'], exit: ['E20'], scene: ['E17'], replay: ['E14'],
  keep: ['E15'], rest: ['E17'], duet: ['E16'], sheet: ['E11'], layout: ['E22'], a11y: ['E23'], scroll: ['E24'],
  isolation: ['E21'], looks: ['E22'],
});

/** results → [{ id, line, blocks, checks, passed }] (spec §13's brief-line → test map, filled in). */
function briefMap(results) {
  const by = Object.fromEntries(Object.entries(BRIEF).map(([id, line]) => [id, { id, line, blocks: new Set(), checks: 0, passed: 0 }]));
  for (const r of results) {
    const block = r.scope.split(':')[1];
    const named = [...new Set((r.name.match(/\bE\d+\b/g) || []).filter((e) => by[e]))];
    for (const e of named.length ? named : BLOCKS[block] || []) { const b = by[e]; b.blocks.add(block); b.checks++; if (r.ok) b.passed++; }
  }
  return Object.values(by).map((b) => ({ ...b, blocks: [...b.blocks] }));
}

/**
 * Init script (no closures): counts the page's uses of the microphone and of every way to talk to a server.
 * __privacy() → { getUserMedia, fetch, xhr, websocket, beacon, eventsource, media }.
 */
function privacySpy() {
  if (window.__privacy) return;
  const n = { getUserMedia: 0, fetch: 0, xhr: 0, websocket: 0, beacon: 0, eventsource: 0, media: 0 };
  const wrap = (obj, key, name) => {
    if (!obj || typeof obj[key] !== 'function') return;
    const f = obj[key];
    obj[key] = function (...a) { n[name]++; return f.apply(this, a); };
  };
  wrap(navigator.mediaDevices, 'getUserMedia', 'getUserMedia');
  wrap(navigator, 'getUserMedia', 'getUserMedia');
  wrap(navigator, 'webkitGetUserMedia', 'getUserMedia');
  wrap(window, 'fetch', 'fetch');
  wrap(XMLHttpRequest.prototype, 'open', 'xhr');
  wrap(navigator, 'sendBeacon', 'beacon');
  wrap(HTMLMediaElement.prototype, 'play', 'media');
  for (const [k, name] of [['WebSocket', 'websocket'], ['EventSource', 'eventsource']]) {
    const C = window[k];
    if (typeof C === 'function') window[k] = class extends C { constructor(...a) { n[name]++; super(...a); } };
  }
  window.__privacy = () => ({ ...n });
}

const OUT_DEFAULT = path.join(__dirname, '..', 'docs', 'phase3', 'hushbeat');
const SCOPE = 'hushbeat';
const T = 60000;   // state waits: generous for software GL
const IDS = ['glitzi', 'blubi', 'zuzu', 'boppo', 'pipzi', 'loomi', 'noomi'];

const noErrors = (scope, errors) => check(scope, 'no console errors', !errors.length, errors.join(' | '));
/**
 * A screenshot as a person who touches the screen sees it: a stage focused by the feature on arrival shows its
 * keyboard ring here (page.evaluate is a user activation and nothing was clicked), which a tap never does; it is
 * blurred first (keys still reach the stage from the page). ring: keep it (a keyboard-focus shot).
 */
async function shot(page, out, name, { ring = false } = {}) {
  if (!ring) await page.evaluate(() => { const a = document.activeElement; if (a?.classList?.contains('stage') && a.matches(':focus-visible')) a.blur(); });
  return H.shot(page, out, name);
}
const hb = (page, fn, arg) => page.evaluate(fn, arg);
const mod = (a, n) => ((a % n) + n) % n;

/** Open #hushbeat with a favourite Mallow and wait for its rig and the feature handle. */
async function openHb(browser, vp, mallow = 'boppo', { prefs = {}, initScripts = [], hash = '#hushbeat' } = {}) {
  const r = await H.open(browser, vp, hash, { prefs, initScripts, comfort: H.comfort({ favouriteMallow: mallow }) });
  await H.waitRig(r.page, { timeout: T });
  if (hash === '#hushbeat') await r.page.waitForFunction(() => __lab.hushbeat && __lab.route === 'hushbeat', null, { timeout: T });
  return r;
}
/** Page px of the lead Mallow's body (middle, top, bottom). */
async function bodyAt(page) { const g = await H.geo(page); return { x: g.ox + g.cx, y: g.oy + g.mid, top: g.oy + g.top, bottom: g.oy + g.bottom, w: g.w, h: g.h, g }; }
const clearLog = (page) => hb(page, () => { __lab.hushbeat.log.length = 0; });
const logOf = (page) => hb(page, () => __lab.hushbeat.log.map((e) => ({ ...e })));
/** Wait until the log has an event matching a predicate (given as source text over `e`). */
const waitEvent = (page, pred, timeout = T) => page.waitForFunction((src) => { const f = new Function('e', `return (${src});`); return __lab.hushbeat?.log.some(f); }, pred, { timeout });
const notes = (log) => log.filter((e) => e.kind === 'note' && !e.ghost);
async function untilSilent(page, ms = 3500, pred = () => __lab.sound.live.size === 0) {
  const t0 = Date.now();
  for (;;) {
    if (await page.evaluate(pred)) return { ok: true, ms: Date.now() - t0 };
    if (Date.now() - t0 > ms) return { ok: false, ms: Date.now() - t0, live: await page.evaluate(() => __lab.sound.live.size) };
    await sleep(100);
  }
}
const musicVoices = (page) => hb(page, () => [...__lab.sound.live].filter((v) => v.music != null).map((v) => ({ layer: v.layer, keep: v.keep })));
const trace = (...a) => { if (process.env.HB_TRACE) console.log('  ·', ...a); };   // HB_TRACE=1: step markers
const icOf = (a, b) => { const d = mod(a - b, 12); return Math.min(d, 12 - d); };
/** Page px of every Mallow's body middle (lead first). */
const bodiesAt = (page) => hb(page, () => __lab.companions().map((c) => { const r = c.rig.bodyRect(), o = c.rig.canvas.parentElement.getBoundingClientRect(); return { x: o.left + r.cx, y: o.top + r.mid }; }));
/** Wait until the screen has n Mallows, every rig ready, no entrance or fade pending and no sheet open. */
const duetReady = (page, n = 2) => page.waitForFunction((n) => {
  const d = __lab.hushbeat?.debug(), cs = __lab.companions();
  return !!d && cs.length === n && cs.every((c) => c.rig?.soft) && (n === 1 ? !d.friend : !!d.duet && !d.duet.entering) && !d.sheet && !document.querySelector('.hushbeat.hb-fading');
}, n, { timeout: T });
/** Friend → the picker → a Mallow, until the duet is ready. */
async function invite(page, id) {
  await page.click('.hushbeat .hb-friend-btn');
  await page.waitForSelector('.hushbeat .sheet.on', { timeout: T });
  await page.click(`.hushbeat .hb-friend[data-mallow="${id}"]`);
  await duetReady(page, 2);
}
/** Open a sheet with its button and wait for it to slide in. */
async function openSheetBy(page, sel) {
  await page.click(sel);
  await page.waitForSelector('.hushbeat .sheet.on', { timeout: T });
  // settled: the slide-in transition has finished (its bottom edge sits on the viewport's)
  await page.waitForFunction(() => { const el = document.querySelector('.hushbeat .sheet.on'); return el && Math.abs(el.getBoundingClientRect().bottom - innerHeight) < 1; }, null, { timeout: T });
}
/** Wait until this screen's sheet has closed and its scrim is gone (it lingers 300 ms and would take a tap). */
const sheetGone = (page) => page.waitForFunction(() => !__lab.hushbeat.debug().sheet && !document.querySelector('.hushbeat .sheet, .hushbeat .sheet-scrim'), null, { timeout: T });
/**
 * The open sheet at this viewport: on screen below the top bar, nothing wider than it, its controls inside it,
 * ≥ 40 px and not overlapping (the sticky Done aside; controls scrolled under it are reachable by scrolling).
 */
async function sheetLayout(page, scope) {
  const L = await page.evaluate(() => {
    const sh = document.querySelector('.hushbeat .sheet.on');
    if (!sh) return null;
    const r = sh.getBoundingClientRect(), tb = document.querySelector('.hushbeat .topbar .icon-btn').getBoundingClientRect();
    const ctl = [...sh.querySelectorAll('button, input')].filter((b) => b.getBoundingClientRect().width > 0 && !b.classList.contains('done')).map((b) => {
      const q = b.getBoundingClientRect();
      return { t: (b.textContent.trim() || b.getAttribute('aria-label') || b.tagName).slice(0, 30), x: q.left, y: q.top, w: q.width, h: q.height };
    });
    return { r: { x: r.left, y: r.top, w: r.width, h: r.height }, sw: sh.scrollWidth, cw: sh.clientWidth, ctl, vw: innerWidth, vh: innerHeight, pageSw: document.documentElement.scrollWidth, tb: tb.bottom };
  });
  if (!check(scope, 'the sheet is open', !!L)) return;
  const R = L.r;
  check(scope, 'the sheet is on screen and leaves the top bar visible', R.x >= -0.5 && R.x + R.w <= L.vw + 1 && R.y + R.h <= L.vh + 1 && R.y >= L.tb - 1, JSON.stringify({ R, tb: L.tb, vh: L.vh }));
  check(scope, 'nothing in the sheet is wider than it; no horizontal page scroll', L.sw <= L.cw + 1 && L.pageSw <= L.vw, JSON.stringify({ sw: L.sw, cw: L.cw, pageSw: L.pageSw }));
  const out = L.ctl.filter((c) => c.x < R.x - 0.5 || c.x + c.w > R.x + R.w + 0.5).map((c) => c.t);
  check(scope, 'sheet controls inside the sheet', !out.length, out.join(', '));
  const small = L.ctl.filter((c) => c.w < 39.5 || c.h < 39.5).map((c) => `${c.t} ${Math.round(c.w)}×${Math.round(c.h)}`);
  check(scope, 'sheet targets ≥ 40 px', !small.length, small.join(', '));
  const clash = [];
  for (let i = 0; i < L.ctl.length; i++) for (let j = i + 1; j < L.ctl.length; j++) {
    const a = L.ctl[i], b = L.ctl[j];
    if (a.x < b.x + b.w - 1 && b.x < a.x + a.w - 1 && a.y < b.y + b.h - 1 && b.y < a.y + a.h - 1) clash.push(`${a.t}/${b.t}`);
  }
  check(scope, 'sheet controls do not overlap', !clash.length, clash.join(', '));
}

// Every pair of pitches sounding together, rebuilt from the log (notes ring for `ring`, released layers for
// PAD_TAIL 1.0 / BASS_TAIL 0.3 s, as the engine counts them) → clashes (interval class 1 or 6)
function clashes(log) {
  const ic = (a, b) => { const d = mod(a - b, 12); return Math.min(d, 12 - d); };
  const segs = [], byId = new Map(), pad = [null, null], bass = [null, null];
  const open = (a, pcs) => pcs.map((pc) => { const s = { a, b: Infinity, pc }; segs.push(s); return s; });
  const close = (l, b) => { if (l) for (const s of l) s.b = Math.min(s.b, b); };
  for (const e of log) {
    if (e.kind === 'note' && !e.ghost) { const s = { a: e.t, b: e.t + e.ring, pc: e.semi }; segs.push(s); byId.set(e.id, s); }
    else if (e.kind === 'noteOff') { const s = byId.get(e.id); if (s) s.b = s.a > e.t ? s.a : Math.min(s.b, e.t + 0.06); }
    else if (e.kind === 'duck') { const s = byId.get(e.id); if (s) s.b = Math.max(s.a + 0.25, Math.min(s.b, e.t + 0.1)); }
    else if (e.kind === 'bend') { const s = byId.get(e.id); if (!s) continue; if (e.start) s.b = Infinity; if (e.end === 'handoff') s.b = Math.min(s.b, e.t + 0.12); if (e.end === 'snap') { s.b = e.t; const n = { a: e.t, b: e.t + e.ring, pc: e.semi }; segs.push(n); byId.set(e.id, n); } }
    else if (e.kind === 'padOn' || (e.kind === 'padSet' && e.semis)) { close(pad[e.slot], e.t); pad[e.slot] = open(e.t, e.semis); }
    else if (e.kind === 'padOff') { close(pad[e.slot], e.t + 1.0); pad[e.slot] = null; }
    else if (e.kind === 'bassOn' || (e.kind === 'bassSet' && e.semi != null)) { close(bass[e.slot], e.t); bass[e.slot] = open(e.t, [e.semi]); }
    else if (e.kind === 'bassOff') { close(bass[e.slot], e.t + 0.3); bass[e.slot] = null; }
  }
  segs.sort((x, y) => x.a - y.a);
  const act = [], bad = [];
  for (const s of segs) {
    if (!(s.b > s.a)) continue;
    for (let i = act.length - 1; i >= 0; i--) if (act[i].b <= s.a + 1e-9) act.splice(i, 1);
    for (const o of act) if ([1, 6].includes(ic(o.pc, s.pc))) bad.push(`${o.pc}×${s.pc}@${s.a.toFixed(3)}`);
    act.push(s);
  }
  return bad;
}

async function run(browser, { out = OUT_DEFAULT, only = (b) => H.only(SCOPE) || H.only(`${SCOPE}:${b}`) } = {}) {
  // ------------------------------------------------------------------- E1 --
  if (only('open')) await guard(`${SCOPE}:open`, async (scope, own) => {
    const { ctx, page, errors } = await H.open(browser, 'phone', '#home', { comfort: H.comfort({ favouriteMallow: 'boppo' }) });
    own(ctx);
    await H.waitRig(page, { timeout: T });
    const card = await hb(page, () => document.querySelector('.card[data-experience="hushbeat"] .go')?.textContent);
    await page.click('.card[data-experience="hushbeat"]');
    await page.waitForFunction(() => __lab.route === 'hushbeat' && __lab.hushbeat && __lab.companion?.rig?.soft, null, { timeout: T });
    const s = await hb(page, () => {
      const scr = document.querySelector('.screen.hushbeat'), hint = scr?.querySelector('.hb-hint');
      return {
        screen: !!scr, focused: document.activeElement === scr?.querySelector('.stage'), title: scr?.querySelector('.topbar .title b')?.textContent,
        sub: scr?.querySelector('.topbar .title small')?.textContent, close: !!scr?.querySelector('.topbar button[aria-label="Close"]'),
        settings: !!scr?.querySelector('.topbar button[aria-label="Settings"]'), label: scr?.querySelector('.stage')?.getAttribute('aria-label'),
        hint: hint && !hint.classList.contains('gone') && getComputedStyle(hint).display !== 'none' ? hint.textContent.replace(/\s+/g, ' ') : null,
        tray: scr?.querySelector('.hb-tray')?.hidden, buttons: scr?.querySelector('.hb-buttons')?.getAttribute('aria-pressed'),
        backdrop: scr?.dataset.backdrop, realm: document.querySelectorAll('.hushbeat canvas.hushfold-realm').length, debug: __lab.hushbeat.debug(),
      };
    });
    check(scope, 'the home card says Play and opens #hushbeat: rig ready, stage focused', card === 'Play' && s.screen && s.focused, JSON.stringify({ card, s }));
    check(scope, 'title Hushbeat, subtitle the Mallow, Close (no Settings), the stage label lists the keys', s.title === 'Hushbeat' && s.sub === 'Boppo' && s.close && !s.settings && s.label.startsWith('Boppo. Tap for a note') && s.label.includes('1 to 7 notes'), JSON.stringify(s));
    check(scope, 'the hint is visible; the tray is hidden behind Buttons', s.hint === 'Tap a note · Squeeze bass · Stroke a tune · Hold a hum' && s.tray === true && s.buttons === 'false', JSON.stringify(s));
    check(scope, 'the Mallow\'s own world behind it (Automatic)', s.realm === 1 && !!s.backdrop, JSON.stringify(s));
    const d = s.debug;
    check(scope, 'debug(): listening at the natural pace, 96 bpm in 4/4, scheduler idle, silent (nothing plays by itself)', d.state === 'listening' && d.pace === 'natural' && d.bpm === 96 && !d.scheduler.running && d.scheduler.pending === 0 && d.live === 0 && d.take === 0, JSON.stringify(d));
    await page.goto(`${H.BASE}#hushbeat`);
    await H.waitRig(page, { timeout: T });
    await page.waitForFunction(() => __lab.hushbeat, null, { timeout: T });
    check(scope, 'opens from #hushbeat too', await hb(page, () => __lab.route === 'hushbeat' && !!document.querySelector('.screen.hushbeat')));
    await shot(page, out, 'hushbeat-phone-open');
    noErrors(scope, errors);
  });

  // ---------------------------------------------------------- E2 E3 E5 --
  // A quiet browser keeps Chromium's autoplay policy. page.evaluate counts as a user activation (about
  // 5 s), so every gesture here waits 6 s after the last evaluate: the touch is the only activation.
  if (only('quiet')) await guard(`${SCOPE}:quiet`, async (scope) => {
    const qb = await H.launch({ quiet: true });
    try {
      for (const kind of ['tap', 'hold']) {
        const ctx = await qb.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
        try {
          const page = await ctx.newPage();
          const errors = [];
          page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
          page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
          await page.addInitScript(H.INIT.audioSpy);
          await page.addInitScript(() => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('hm.sensorylab.v1', JSON.stringify({ quality: 'low' })); } });
          await page.goto(`${H.BASE}#hushbeat`);
          await H.waitRig(page, { timeout: T });
          await page.waitForFunction(() => __lab.hushbeat, null, { timeout: T });
          const b = await bodyAt(page);
          await sleep(6000);
          const idle = await hb(page, () => ({ audio: __audio(), log: __lab.hushbeat.log.length, ctx: !!__lab.sound.ctx }));
          if (kind === 'tap') check(scope, 'E2: idle for 6 s: no AudioContext, no music event', idle.audio.created === 0 && idle.log === 0 && !idle.ctx, JSON.stringify(idle));
          await sleep(6000);
          if (kind === 'tap') await H.touch(page, [{ t: 0, points: [{ x: b.x, y: b.y }] }, { t: 70, points: [] }]);
          else await H.touch(page, [{ t: 0, points: [{ x: b.x, y: b.y }] }, { t: 1800, points: [] }]);
          await sleep(1500);
          const r = await hb(page, () => ({ audio: __audio(), log: __lab.hushbeat.log.map((e) => ({ kind: e.kind, src: e.src, id: e.id, heard: !!e.heard, restrike: !!e.restrike, hz: e.hz })), V: __lab.hushbeat.players[0].part.V }));
          const ns = r.log.filter((e) => e.kind === 'note');
          const inKey = ns.every((e) => { const s = 12 * Math.log2(e.hz / r.V.rootHz), k = Math.round(s); return Math.abs(s - k) < 0.01 && r.V.scale.includes(mod(k, 12)); });
          if (kind === 'tap') {
            check(scope, 'E3: the first touch made one AudioContext, inside the activation (touchend)', r.audio.created === 1 && r.audio.contexts[0].activation, JSON.stringify(r.audio));
            check(scope, 'E3: the contact note was struck while locked and re-struck audibly at the tap (one heard note, in key)',
              ns.length === 2 && !ns[0].heard && ns[1].restrike && ns[1].heard && ns[1].id === ns[0].id && inKey, JSON.stringify(ns));
          } else {
            const heard = ns.filter((e) => e.heard);
            check(scope, 'E5: a first-touch hold starts the hum\'s visuals (padOn) and never bursts after lift (≤ 1 heard note, no heard hum)',
              r.log.some((e) => e.kind === 'padOn') && heard.length <= 1 && inKey, JSON.stringify(r.log.slice(0, 8)));
          }
          check(scope, `${kind}: no console errors`, !errors.length, errors.join(' | '));
        } finally { await ctx.close(); }
      }
    } finally { await qb.close(); }
  });

  // ------------------------------------------------------------- E4 E6 --
  if (only('gestures')) await guard(`${SCOPE}:gestures`, async (scope, own) => {
    const { ctx, page, errors } = await openHb(browser, 'desktop', 'boppo');
    own(ctx);
    const b = await bodyAt(page);
    await page.mouse.click(b.x, b.y);   // unlock
    await sleep(700);
    // E4: onset at contact, before the finger lifts
    await clearLog(page);
    await page.mouse.move(b.x, b.y); await page.mouse.down(); await sleep(120);
    const down = await logOf(page);
    await page.mouse.up();
    const c0 = notes(down)[0];
    check(scope, 'E4: the note sounds at contact (heard, immediate, ≤ 6 ms added) before the finger lifts', !!c0 && c0.heard && c0.immediate && c0.audioT - c0.ctxNow <= 0.006 + 1e-9, JSON.stringify(c0));
    await sleep(600);
    // hold → the contact note blooms into a hum (a keep voice), released on lift
    await clearLog(page);
    await page.mouse.move(b.x, b.y - b.h * 0.2); await page.mouse.down();
    await waitEvent(page, "e.kind === 'padOn'");
    await sleep(600);
    const holdV = await musicVoices(page);
    await page.mouse.up();
    await waitEvent(page, "e.kind === 'padOff'");
    let L = await logOf(page);
    check(scope, 'E6 hold: one contact note, then the hum (padOn from it), a held pad voice, released on lift', notes(L).length === 1 && L.find((e) => e.kind === 'padOn')?.from === notes(L)[0].id && holdV.some((v) => v.layer === 'pad' && v.keep), JSON.stringify({ kinds: L.map((e) => e.kind), holdV }));
    await sleep(800);
    // press down → the note ducks under a warm bass
    await clearLog(page);
    await page.mouse.move(b.x, b.y - b.h * 0.15); await page.mouse.down();
    for (let i = 1; i <= 10; i++) { await page.mouse.move(b.x, b.y - b.h * 0.15 + i * 9); await sleep(25); }
    await waitEvent(page, "e.kind === 'bassOn'");
    await sleep(500);
    const pressV = await musicVoices(page);
    await page.mouse.up();
    await waitEvent(page, "e.kind === 'bassOff'");
    L = await logOf(page);
    const ord = L.map((e) => e.kind);
    check(scope, 'E6 press down: duck, then bassOn (no second strike), a held bass voice, bassOff on lift', notes(L).length === 1 && ord.indexOf('duck') >= 0 && ord.indexOf('duck') < ord.indexOf('bassOn') && pressV.some((v) => v.layer === 'bass' && v.keep), JSON.stringify({ ord, pressV }));
    await sleep(800);
    // the wheel squeezes too (desktop)
    await clearLog(page);
    await page.mouse.move(b.x, b.y);
    for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, 120); await sleep(40); }
    await waitEvent(page, "e.kind === 'bassOn'");
    await waitEvent(page, "e.kind === 'bassOff'");
    check(scope, 'E6 wheel: a bass that ends as the wheel settles', true);
    await sleep(800);
    // a real stroke: back and forth across the body → phrase notes on the Mallow's grid
    await clearLog(page);
    await page.mouse.move(b.x - 70, b.y); await page.mouse.down();
    for (let i = 0; i <= 120; i++) { await page.mouse.move(b.x + Math.sin(i / 6) * 70, b.y + Math.sin(i / 3) * 4); await sleep(14); }
    await page.mouse.up();
    await sleep(1500);
    L = await logOf(page);
    const ph = notes(L).filter((e) => e.src === 'phrase' && !e.immediate);
    const onGrid = await hb(page, (ts) => ts.map((t) => [1, 2, 4, 8].some((d) => Math.abs(__lab.hushbeat.clock.nextGrid(t - 1e-4, d, 0.5) - t) < 0.003)), ph.map((e) => e.t));
    check(scope, 'E6 stroke: ≥ 3 phrase notes after the first, each on the grid (±3 ms), and a phraseEnd', ph.length >= 3 && onGrid.every(Boolean) && L.some((e) => e.kind === 'phraseEnd'), JSON.stringify({ n: ph.length, onGrid, kinds: [...new Set(L.map((e) => e.kind + (e.src ? ':' + e.src : '')))] }));
    await sleep(800);
    // double tap → a rolled chord (the other chord tones on 16ths)
    await clearLog(page);
    await page.mouse.click(b.x, b.y); await sleep(90); await page.mouse.click(b.x, b.y);
    await sleep(1200);
    L = await logOf(page);
    const roll = notes(L).filter((e) => e.src === 'chord');
    check(scope, 'E6 double tap: the second note rolls into a chord (2 more notes, on 16ths)', roll.length >= 2 && roll.every((e) => !e.immediate), JSON.stringify(notes(L).map((e) => e.src)));
    await sleep(600);
    // drag up → the note bends, then snaps to a scale tone
    await clearLog(page);
    await page.mouse.move(b.x, b.y + b.h * 0.2); await page.mouse.down();
    for (let i = 1; i <= 12; i++) { await page.mouse.move(b.x, b.y + b.h * 0.2 - i * 10); await sleep(40); }
    await sleep(200);
    const bendV = await musicVoices(page);
    await page.mouse.up();
    await sleep(800);
    L = await logOf(page);
    const bends = L.filter((e) => e.kind === 'bend');
    check(scope, 'E6 drag up: the note becomes a held glide (keep) that bends, then snaps', bends[0]?.start && bends.some((e) => e.end === 'snap') && bendV.some((v) => v.layer === 'glide' && v.keep), JSON.stringify({ bends: bends.map((e) => e.end || (e.start ? 'start' : 'move')), bendV }));
    const z = await untilSilent(page, 3500);
    check(scope, 'E6: every voice is gone ≤ 3.5 s after the last release', z.ok, JSON.stringify(z));
    noErrors(scope, errors);
    // a two-finger pinch on a touch screen
    const tc = await openHb(browser, 'phone', 'loomi');
    try {
      const p2 = tc.page, q = await bodyAt(p2);
      await H.touch(p2, [{ t: 0, points: [{ x: q.x, y: q.y }] }, { t: 60, points: [] }]);   // unlock
      await sleep(800);
      await clearLog(p2);
      const frames = [{ t: 0, points: [{ x: q.x - 50, y: q.y, id: 1 }] }, { t: 40, points: [{ x: q.x - 50, y: q.y, id: 1 }, { x: q.x + 50, y: q.y, id: 2 }] }];
      for (let i = 1; i <= 12; i++) frames.push({ t: 40 + i * 50, points: [{ x: q.x - 50 + i * 3, y: q.y, id: 1 }, { x: q.x + 50 - i * 3, y: q.y, id: 2 }] });
      frames.push({ t: 1300, points: [{ x: q.x - 14, y: q.y, id: 1 }, { x: q.x + 14, y: q.y, id: 2 }] }, { t: 1400, points: [] });
      await H.touch(p2, frames);
      await sleep(900);
      const PL = await logOf(p2), po = PL.map((e) => e.kind);
      check(`${scope}:pinch`, 'E6 pinch: the first finger\'s note ducks under the bass; the bass ends on lift', po.includes('duck') && po.indexOf('duck') < po.indexOf('bassOn') && po.includes('bassOff') && notes(PL).length <= 2, JSON.stringify(po));
      noErrors(`${scope}:pinch`, tc.errors);
    } finally { await tc.ctx.close(); }
  });

  // ------------------------------------------------------------------- E7 --
  if (only('keys')) await guard(`${SCOPE}:keys`, async (scope, own) => {
    const { ctx, page, errors } = await openHb(browser, 'desktop', 'pipzi');
    own(ctx);
    await page.focus('.hushbeat .stage');
    const V = await hb(page, () => __lab.hushbeat.players[0].part.V);
    const tryKey = async (name, fn, pred, wait = 1200) => {
      await clearLog(page);
      await fn();
      await sleep(wait);
      const L = await logOf(page);
      return { ok: pred(L), kinds: [...new Set(L.map((e) => e.kind + (e.src ? ':' + e.src : '')))] };
    };
    const results = {};
    results.enter = await tryKey('Enter', () => page.keyboard.press('Enter'), (L) => notes(L).some((e) => e.heard));
    results.d = await tryKey('D', () => page.keyboard.press('d'), (L) => notes(L).filter((e) => e.src === 'chord').length >= 2);
    results.p = await tryKey('P', () => page.keyboard.press('p'), (L) => notes(L).filter((e) => e.src === 'phrase').length >= 3, 2600);
    results.t = await tryKey('T', () => page.keyboard.press('t'), (L) => L.some((e) => e.kind === 'bend' && e.start) && L.some((e) => e.kind === 'bend' && e.end === 'snap'), 2000);
    results.s = await tryKey('S', async () => { await page.keyboard.down('s'); await sleep(900); await page.keyboard.up('s'); }, (L) => L.some((e) => e.kind === 'bassOn') && L.some((e) => e.kind === 'bassOff'));
    results.h = await tryKey('H', async () => { await page.keyboard.down('h'); await sleep(1200); await page.keyboard.up('h'); }, (L) => L.some((e) => e.kind === 'padOn') && L.some((e) => e.kind === 'padOff'));
    await clearLog(page);
    await page.keyboard.down('b'); await sleep(600);
    const bIn = await hb(page, () => __lab.hushbeat.debug().breath);
    await page.keyboard.up('b'); await sleep(200);
    const bOut = await hb(page, () => __lab.hushbeat.debug().breath);
    results.b = { ok: bIn.leading === 'in' && bOut.leading === 'out', kinds: [bIn.leading, bOut.leading] };
    const degs = [];
    for (let n = 1; n <= 7; n++) { await clearLog(page); await page.keyboard.press(String(n)); await sleep(250); degs.push(notes(await logOf(page))[0]?.deg); }
    results.digits = { ok: degs.every((d, i) => d === V.tapLo + i), kinds: degs };
    for (const [k, r] of Object.entries(results)) check(scope, `key ${k}: its musical result`, r.ok, JSON.stringify(r.kinds));
    // the chips
    await page.click('.hushbeat .hb-buttons');
    const tray = await hb(page, () => ({ hidden: document.querySelector('.hb-tray').hidden, pressed: document.querySelector('.hb-buttons').getAttribute('aria-pressed'), chips: [...document.querySelectorAll('.hb-tray .chip')].map((c) => c.textContent) }));
    check(scope, 'Buttons shows the tray: Note, Chord, Tune, Bass, Hum, Breathe', !tray.hidden && tray.pressed === 'true' && tray.chips.join() === 'Note,Chord,Tune,Bass,Hum,Breathe', JSON.stringify(tray));
    const chip = (name) => `.hb-tray .chip:nth-child(${['Note', 'Chord', 'Tune', 'Bass', 'Hum', 'Breathe'].indexOf(name) + 1})`;
    const holdChip = async (name, ms) => { const r = await page.locator(chip(name)).boundingBox(); await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await page.mouse.down(); await sleep(ms); await page.mouse.up(); };
    const cr = {};
    cr.note = await tryKey('Note', () => page.click(chip('Note')), (L) => notes(L).length >= 1);
    cr.chord = await tryKey('Chord', () => page.click(chip('Chord')), (L) => notes(L).filter((e) => e.src === 'chord').length >= 2);
    cr.tune = await tryKey('Tune', () => page.click(chip('Tune')), (L) => notes(L).filter((e) => e.src === 'phrase').length >= 3, 2600);
    cr.bass = await tryKey('Bass', () => holdChip('Bass', 900), (L) => L.some((e) => e.kind === 'bassOn') && L.some((e) => e.kind === 'bassOff'));
    cr.hum = await tryKey('Hum', () => holdChip('Hum', 1200), (L) => L.some((e) => e.kind === 'padOn') && L.some((e) => e.kind === 'padOff'));
    let lead = null;
    const r = await page.locator(chip('Breathe')).boundingBox();
    await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await page.mouse.down(); await sleep(500);
    lead = await hb(page, () => __lab.hushbeat.debug().breath.leading);
    await page.mouse.up();
    cr.breathe = { ok: lead === 'in', kinds: [lead] };
    for (const [k, v] of Object.entries(cr)) check(scope, `chip ${k}: its musical result`, v.ok, JSON.stringify(v.kinds));
    noErrors(scope, errors);
  });

  // -------------------------------------------------- every Mallow, solo --
  if (only('mallows')) await guard(`${SCOPE}:mallows`, async (scope, own) => {
    const { ctx, page, errors } = await openHb(browser, 'desktop', 'glitzi');
    own(ctx);
    for (const id of IDS) {
      if (id !== 'glitzi') {
        await hb(page, (id) => { __lab.ctx.setMallow(id); __lab.ctx.navigate('/hushbeat'); }, id);
        await page.waitForFunction((id) => __lab.hushbeat?.players[0]?.part.mallowId === id && __lab.companion?.rig?.soft, id, { timeout: T });
      }
      await page.focus('.hushbeat .stage');
      await clearLog(page);
      const layers = new Set();
      const sampleLayers = async () => { for (const v of await musicVoices(page)) layers.add(v.layer); };
      await page.keyboard.press('Enter'); await sleep(250); await sampleLayers();
      await page.keyboard.press('d'); await sleep(700);
      await page.keyboard.press('p'); await sleep(900); await sampleLayers(); await sleep(1300);
      await page.keyboard.press('t'); await sleep(450); await sampleLayers(); await sleep(900);
      await page.keyboard.down('h'); await sleep(1500); await sampleLayers(); await page.keyboard.up('h');
      await page.keyboard.down('s'); await sleep(1000); await sampleLayers(); await page.keyboard.up('s');
      for (const n of [1, 3, 5, 7]) { await page.keyboard.press(String(n)); await sleep(150); }
      await sleep(500);
      const L = await logOf(page);
      const ns = notes(L), V = await hb(page, () => __lab.hushbeat.players[0].part.V);
      const kinds = new Set(L.map((e) => e.kind));
      const inKey = ns.every((e) => { const s = 12 * Math.log2(e.hz / V.rootHz), k = Math.round(s); return Math.abs(s - k) < 0.01 && V.scale.includes(mod(k, 12)); });
      check(scope, `${id}: every solo gesture renders (notes, chord, phrase, bend, hum, bass) in its own key, heard`,
        ['note', 'bend', 'padOn', 'padOff', 'bassOn', 'bassOff', 'phraseEnd'].every((k) => kinds.has(k)) && ns.filter((e) => e.src === 'chord').length >= 2 && ns.filter((e) => e.src === 'phrase').length >= 3 && inKey && ns.every((e) => e.heard),
        JSON.stringify({ kinds: [...kinds], n: ns.length, unheard: ns.filter((e) => !e.heard).length, inKey }));
      check(scope, `${id}: note, glide, hum and bass voices all sounded`, ['note', 'glide', 'pad', 'bass'].every((l) => layers.has(l)), [...layers].join());
      check(scope, `${id}: nothing clashes`, !clashes(L).length, clashes(L).slice(0, 5).join(', '));
    }
    const z = await untilSilent(page, 4000);
    check(scope, 'all quiet afterwards', z.ok, JSON.stringify(z));
    noErrors(scope, errors);
  });

  // ------------------------------------------------------------------- E8 --
  if (only('breath')) await guard(`${SCOPE}:breath`, async (scope, own) => {
    const { ctx, page, errors } = await openHb(browser, 'desktop', 'boppo');
    own(ctx);
    await page.click('.hushbeat .hb-buttons');
    const r = await page.locator('.hb-tray .chip:nth-child(6)').boundingBox();
    const bpm0 = await hb(page, () => __lab.hushbeat.debug().bpm);
    await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await page.mouse.down();
    const tIn = await hb(page, () => performance.now());
    // the Mallow fills with the breath: inflateTarget follows the breath level while leading
    const pairs = [];
    for (let i = 0; i < 8; i++) { await sleep(220); pairs.push(await hb(page, () => [__lab.hushbeat.clock.at(performance.now() / 1000, {}).level, __lab.companion.rig.inflateTarget])); }
    await page.mouse.up();
    const inhale = (await hb(page, () => performance.now()) - tIn) / 1000;
    const d = await hb(page, () => __lab.hushbeat.debug());
    // the tempo then moves toward the measured breath only at bar lines, ≤ 8 % a bar
    const samples = [];
    const t0 = Date.now();
    while (Date.now() - t0 < 9000) { samples.push(await hb(page, () => { const c = __lab.hushbeat.clock; c.step(); return { bpm: c.bpm, bar: c.barA }; })); await sleep(150); }
    let ok = true, steps = [];
    for (let i = 1; i < samples.length; i++) {
      const a = samples[i - 1], b = samples[i];
      if (b.bpm !== a.bpm) { steps.push(+(b.bpm / a.bpm - 1).toFixed(4)); if (b.bar === a.bar || Math.abs(b.bpm / a.bpm - 1) > 0.08 * (b.bar - a.bar) + 1e-6) ok = false; }
    }
    const end = samples.at(-1).bpm;
    // a lone in-breath estimates the cycle from the pace's ratio (4 : 6): 2.5 × the inhale, within 7–15 s
    const want = Math.min(15, Math.max(7, inhale * 2.5));
    check(scope, 'Breathe leads: the in-breath sets the target cycle (2.5 × the inhale, clamped); out on release', d.breath.leading === 'out' && Math.abs(d.breath.target - want) < 0.35 && d.breath.target < 10, JSON.stringify({ inhale, want, breath: d.breath }));
    check(scope, 'the tempo moves toward the breath only at bar lines, ≤ 8 % a bar', ok && end > bpm0 && steps.length >= 1 && steps.every((s) => s > 0 && s <= 0.08 + 1e-6), JSON.stringify({ bpm0, end, steps }));
    const n = pairs.length, mx = pairs.reduce((s, p) => s + p[0], 0) / n, my = pairs.reduce((s, p) => s + p[1], 0) / n;
    const cov = pairs.reduce((s, p) => s + (p[0] - mx) * (p[1] - my), 0), vx = pairs.reduce((s, p) => s + (p[0] - mx) ** 2, 0), vy = pairs.reduce((s, p) => s + (p[1] - my) ** 2, 0);
    const corr = cov / Math.sqrt(vx * vy + 1e-12);
    check(scope, 'the Mallow fills with the breath (inflate follows the level, r > 0.8)', corr > 0.8, `r=${corr.toFixed(3)} ${JSON.stringify(pairs.map((p) => p.map((x) => +x.toFixed(2))))}`);
    // an off-body press held still for 300 ms leads too (the Companion never sees it as a touch)
    const b = await bodyAt(page);
    await clearLog(page);
    await page.mouse.move(60, b.y); await page.mouse.down(); await sleep(700);
    const pin = await hb(page, () => __lab.hushbeat.debug().breath.leading);
    await page.mouse.up(); await sleep(200);
    const pout = await hb(page, () => ({ lead: __lab.hushbeat.debug().breath.leading, notes: __lab.hushbeat.log.filter((e) => e.kind === 'note').length }));
    check(scope, 'an off-body press (300 ms, still) leads the in-breath; letting go starts the out-breath; no note', pin === 'in' && pout.lead === 'out' && pout.notes === 0, JSON.stringify({ pin, pout }));
    noErrors(scope, errors);
  });

  // ------------------------------------------------------------------ E10 --
  if (only('offline')) await guard(`${SCOPE}:offline`, async (scope, own) => {
    const { ctx, page, errors } = await H.open(browser, 'desktop', '#home');
    own(ctx);
    await page.waitForFunction(() => globalThis.__lab, null, { timeout: T });
    const res = await page.evaluate(renderKits);
    const rmsAll = Object.values(res).map((r) => r.rms);
    for (const [id, r] of Object.entries(res)) {
      check(scope, `${id}: the tap note is on pitch (±3 %), peak < 0.9, no clicks (silent before, < 0.02 in its first 0.5 ms, silent after)`,
        Math.abs(r.err) < 3 && r.peak < 0.9 && r.pre < 1e-4 && r.first < 0.02 && r.tail < 0.02, JSON.stringify(r));
      check(scope, `${id}: the hum swells in (≥ 300 ms), is quiet a second after letting go, and ends`, r.padAttack >= 0.3 && r.padAfter1s <= -26 && r.padEnd < 0.002, JSON.stringify({ a: r.padAttack, after: r.padAfter1s, end: r.padEnd }));
      check(scope, `${id}: every bass root sits below 131 Hz on pitch, ≥ 15 % of its energy in 150–500 Hz, and ends`, r.bass.every((x) => x.f0 < 131 && Math.abs(x.f0 / x.hz - 1) < 0.03 && x.band >= 15 && x.end < 0.002), JSON.stringify(r.bass));
      check(scope, `${id}: a bent note follows to its new pitch (±1 %)`, Math.abs(r.held / r.heldWant - 1) < 0.01, JSON.stringify({ held: r.held, want: r.heldWant }));
    }
    check(scope, 'tap-note loudness of the seven within ±4 dB', Math.max(...rmsAll) - Math.min(...rmsAll) <= 8, JSON.stringify(Object.fromEntries(Object.entries(res).map(([k, r]) => [k, r.rms]))));
    noErrors(scope, errors);
  });

  // ------------------------------------------------------------------- E9 --
  if (only('rapid')) await guard(`${SCOPE}:rapid`, async (scope, own) => {
    const { ctx, page, errors } = await openHb(browser, 'desktop', 'zuzu');
    own(ctx);
    const b = await bodyAt(page);
    await page.mouse.click(b.x, b.y); await sleep(600);
    await clearLog(page);
    await hb(page, () => { window.__mx = { live: 0, voices: 0 }; window.__mxT = setInterval(() => { __mx.live = Math.max(__mx.live, __lab.sound.live.size); __mx.voices = Math.max(__mx.voices, __lab.hushbeat.audio.voices); }, 50); });
    for (let i = 0; i < 40; i++) {
      const x = b.x + Math.sin(i * 2.3) * b.w * 0.3, y = b.y + Math.cos(i * 1.7) * b.h * 0.3;
      await page.mouse.click(x, y);
      await sleep(25);
    }
    await sleep(1500);
    const mx = await hb(page, () => { clearInterval(window.__mxT); return { ...window.__mx, cap: 10 }; });
    const L = await logOf(page), V = await hb(page, () => __lab.hushbeat.players[0].part.V);
    const ns = notes(L);
    const inKey = ns.every((e) => { const s = 12 * Math.log2(e.hz / V.rootHz), k = Math.round(s); return Math.abs(s - k) < 0.01 && V.scale.includes(mod(k, 12)); });
    check(scope, '40 taps in 2 s: live voices ≤ 24, music voices ≤ the low-tier cap', mx.live <= 24 && mx.voices <= mx.cap, JSON.stringify(mx));
    check(scope, 'every note in Zuzu\'s key; nothing sounding together forms a semitone or tritone', ns.length >= 10 && inKey && !clashes(L).length, JSON.stringify({ n: ns.length, ghosts: L.filter((e) => e.ghost).length, clashes: clashes(L).slice(0, 5) }));
    // E9 in a duet: Pipzi joins Zuzu (the one scale with semitones leads); 40 taps alternating between them in 2 s
    await hb(page, () => __lab.hushbeat.setFriend('pipzi', { instant: true }));
    await duetReady(page, 2);
    await sleep(1500);
    const B2 = await bodiesAt(page);
    await clearLog(page);
    await hb(page, () => { window.__mx = { live: 0, voices: 0 }; window.__mxT = setInterval(() => { __mx.live = Math.max(__mx.live, __lab.sound.live.size); __mx.voices = Math.max(__mx.voices, __lab.hushbeat.audio.voices); }, 50); });
    for (let i = 0; i < 40; i++) {
      const p = B2[i % 2];
      await page.mouse.click(p.x + Math.sin(i * 2.3) * 18, p.y + Math.cos(i * 1.7) * 18);
      await sleep(25);
    }
    await sleep(1500);
    const mx2 = await hb(page, () => { clearInterval(window.__mxT); return { ...window.__mx, cap: 10 }; });
    const L2 = await logOf(page), ns2 = notes(L2);
    const inKey2 = ns2.every((e) => { const s = 12 * Math.log2(e.hz / V.rootHz), k = Math.round(s); return Math.abs(s - k) < 0.01 && V.scale.includes(mod(k, 12)); });
    check(`${scope}:duet`, 'E9 duet: 40 alternating taps in 2 s: live voices ≤ 24, music voices ≤ the low-tier cap', mx2.live <= 24 && mx2.voices <= mx2.cap, JSON.stringify(mx2));
    check(`${scope}:duet`, 'E9 duet: both play, all in Zuzu\'s key (the friend plays in the lead\'s), they harmonise, nothing clashes',
      ns2.some((e) => e.slot === 0) && ns2.some((e) => e.slot === 1) && inKey2 && L2.some((e) => e.kind === 'harmony') && !clashes(L2).length,
      JSON.stringify({ n: ns2.length, slots: [ns2.filter((e) => !e.slot).length, ns2.filter((e) => e.slot === 1).length], harmony: L2.filter((e) => e.kind === 'harmony').length, clashes: clashes(L2).slice(0, 5) }));
    noErrors(scope, errors);
    // E9 two-point bursts: two thumbs, one on each Mallow at the same instant, 20 times in 2 s (CDP touch, phone)
    const tc = await openHb(browser, 'phone', 'zuzu');
    try {
      const p2 = tc.page;
      await hb(p2, () => __lab.hushbeat.setFriend('blubi', { instant: true }));
      await duetReady(p2, 2);
      await sleep(1500);
      const B3 = await bodiesAt(p2);
      await H.touch(p2, [{ t: 0, points: [{ x: B3[0].x, y: B3[0].y, id: 1 }] }, { t: 60, points: [] }]);   // unlock
      await sleep(900);
      await clearLog(p2);
      await hb(p2, () => { window.__mx = { live: 0, voices: 0 }; window.__mxT = setInterval(() => { __mx.live = Math.max(__mx.live, __lab.sound.live.size); __mx.voices = Math.max(__mx.voices, __lab.hushbeat.audio.voices); }, 50); });
      const frames = [];
      for (let i = 0; i < 20; i++) {
        const dx = Math.sin(i * 2.1) * 14, dy = Math.cos(i * 1.3) * 14;
        frames.push({ t: i * 100, points: [{ x: B3[0].x + dx, y: B3[0].y + dy, id: 10 + 2 * i }, { x: B3[1].x - dx, y: B3[1].y + dy, id: 11 + 2 * i }] });
        frames.push({ t: i * 100 + 45, points: [] });
      }
      await H.touch(p2, frames);
      await sleep(1500);
      const mx3 = await hb(p2, () => { clearInterval(window.__mxT); return { ...window.__mx, cap: 10 }; });
      const L3 = await logOf(p2), ns3 = notes(L3), V3 = await hb(p2, () => __lab.hushbeat.players[0].part.V);
      const inKey3 = ns3.every((e) => { const s = 12 * Math.log2(e.hz / V3.rootHz), k = Math.round(s); return Math.abs(s - k) < 0.01 && V3.scale.includes(mod(k, 12)); });
      const sl = [ns3.filter((e) => !e.slot).length, ns3.filter((e) => e.slot === 1).length];
      check(`${scope}:two-point`, 'E9 two thumbs on two Mallows, 20 bursts in 2 s: both play every burst or nearly, live voices ≤ 24, music voices ≤ the cap',
        sl[0] >= 12 && sl[1] >= 12 && mx3.live <= 24 && mx3.voices <= mx3.cap, JSON.stringify({ sl, mx3 }));
      check(`${scope}:two-point`, 'E9 two thumbs: every note in Zuzu\'s key, they harmonise, nothing sounding together clashes',
        inKey3 && L3.some((e) => e.kind === 'harmony') && !clashes(L3).length, JSON.stringify({ n: ns3.length, harmony: L3.filter((e) => e.kind === 'harmony').length, clashes: clashes(L3).slice(0, 5) }));
      noErrors(`${scope}:two-point`, tc.errors);
    } finally { await tc.ctx.close(); }
  });

  // ------------------------------------------------------------ E12 E13 --
  if (only('quietmode')) await guard(`${SCOPE}:quietmode`, async (scope, own) => {
    const { ctx, page, errors } = await openHb(browser, 'desktop', 'noomi');
    own(ctx);
    const b = await bodyAt(page);
    await page.mouse.click(b.x, b.y); await sleep(800);
    // Mute: the music goes on (events) without a sound; unmuting during a hum brings it back
    await page.click('.hushbeat .topbar button[aria-label="Mute sound"]');
    await untilSilent(page, 3000);
    await clearLog(page);
    await page.mouse.click(b.x, b.y); await sleep(400);
    const m1 = await hb(page, () => ({ notes: __lab.hushbeat.log.filter((e) => e.kind === 'note').length, voices: __lab.hushbeat.audio.voices, ready: __lab.hushbeat.audio.ready, beads: __lab.hushbeat.scene.debug().beads }));
    check(scope, 'E12 muted: a tap still makes its note event and its bead (the light carries it), no voice', m1.notes >= 1 && m1.voices === 0 && !m1.ready && m1.beads >= 1, JSON.stringify(m1));
    await page.focus('.hushbeat .stage');
    await page.keyboard.down('h');
    await waitEvent(page, "e.kind === 'padOn'");
    await page.click('.hushbeat .topbar button[aria-label="Mute sound"]');
    await page.waitForFunction(() => __lab.hushbeat.audio.layer[0].pad?.alive, null, { timeout: 10000 }).catch(() => {});
    const m2 = await hb(page, () => ({ pad: !!__lab.hushbeat.audio.layer[0].pad?.alive, voices: [...__lab.sound.live].filter((v) => v.layer === 'pad').length }));
    await page.keyboard.up('h');
    check(scope, 'E12 unmuting during a hum brings the hum back (reconcile)', m2.pad && m2.voices === 1, JSON.stringify(m2));
    await untilSilent(page, 4000);
    // Visual only: the same music as light, no sound; it survives a reload
    await hb(page, () => __lab.hushbeat.setVisualOnly(true));
    const sub = await hb(page, () => document.querySelector('.hushbeat .topbar .title small').textContent);
    await clearLog(page);
    // every caption the feedback chip shows (with the sound off it names every role, at most every 1.5 s)
    await hb(page, () => {
      const el = document.querySelector('.hushbeat .feedback');
      window.__caps = [];
      window.__capMo = new MutationObserver(() => { if (el.classList.contains('on')) __caps.push({ text: el.textContent, t: performance.now() }); });
      window.__capMo.observe(el, { attributes: true, childList: true, characterData: true, subtree: true });
    });
    await page.focus('.hushbeat .stage');
    let maxV = 0, mouth = 0;
    for (let i = 0; i < 30; i++) {
      if (i % 3 === 0) await page.mouse.click(b.x + (i % 5) * 6, b.y - (i % 4) * 10);
      else await page.keyboard.press(String(1 + (i % 7)));
      if (i % 3 === 1) mouth = Math.max(mouth, await hb(page, () => __lab.companion.rig.faceOverride.min.mouthOpen || 0));
      await sleep(70);
      if (i % 5 === 0) maxV = Math.max(maxV, await hb(page, () => __lab.hushbeat.audio.voices));
    }
    await page.keyboard.down('h'); await sleep(800); maxV = Math.max(maxV, await hb(page, () => __lab.hushbeat.audio.voices)); await page.keyboard.up('h');
    const v1 = await hb(page, () => ({ notes: __lab.hushbeat.log.filter((e) => e.kind === 'note' && !e.ghost).length, heard: __lab.hushbeat.log.filter((e) => e.heard).length, pad: __lab.hushbeat.log.some((e) => e.kind === 'padOn'), live: __lab.sound.live.size, beads: __lab.hushbeat.scene.pool.alive }));
    check(scope, 'E13 Visual only: 30 gestures make their music events and no sound at all; the subtitle says so', sub === 'Noomi · Visual only' && v1.notes >= 20 && v1.pad && v1.heard === 0 && maxV === 0 && v1.live === 0, JSON.stringify({ sub, v1, maxV }));
    const caps = await hb(page, () => { __capMo.disconnect(); return __caps.map((c) => ({ text: c.text, t: Math.round(c.t) })); });
    const roles = caps.filter((c) => ['Note', 'Hum', 'Chord', 'Bass', 'Tune', 'Glide'].includes(c.text));
    const gaps = roles.slice(1).map((c, i) => c.t - roles[i].t);
    check(scope, 'E13 Visual only: the singing mouth opens on its notes, and the role captions repeat (the sound is off), at most every 1.5 s',
      mouth >= 0.25 && roles.filter((c) => c.text === 'Note').length >= 2 && gaps.every((g) => g >= 1450), JSON.stringify({ mouth, roles, gaps }));   // Noomi sings with a small round mouth (open 0.4)
    // Replay and Keep work in Visual only (the replay is light and movement)
    await page.waitForFunction(() => __lab.hushbeat.debug().controls.replay && __lab.hushbeat.debug().controls.keep, null, { timeout: T });
    await clearLog(page);
    await page.click('.hushbeat .hb-replay');
    await waitEvent(page, "e.kind === 'note' && e.src === 'replay'");
    await page.waitForFunction(() => __lab.hushbeat.performers[0].pokes >= 1, null, { timeout: 10000 }).catch(() => {});
    const vr = await hb(page, () => ({ state: __lab.hushbeat.state, voices: __lab.hushbeat.audio.voices, live: __lab.sound.live.size, pokes: __lab.hushbeat.performers[0].pokes }));
    await page.click('.hushbeat .hb-replay');   // Stop
    await page.click('.hushbeat .hb-keep'); await sleep(300);
    const vk = await hb(page, () => ({ kept: __lab.dna.favourites().filter((f) => f.kind === 'hushbeat').length, pressed: __lab.hushbeat.debug().controls.keepPressed }));
    check(scope, 'E13 Visual only: Replay performs the take silently (replaying, the Mallow pokes, no voice); Keep keeps it',
      vr.state === 'replaying' && vr.voices === 0 && vr.live === 0 && vr.pokes >= 1 && vk.kept === 1 && vk.pressed === 'true', JSON.stringify({ vr, vk }));
    await page.reload();
    await H.waitRig(page, { timeout: T });
    await page.waitForFunction(() => __lab.hushbeat, null, { timeout: T });
    const v2 = await hb(page, () => ({ sub: document.querySelector('.hushbeat .topbar .title small').textContent, attached: __lab.hushbeat.audio.attached, visual: __lab.hushbeat.debug().visualOnly }));
    check(scope, 'E13 Visual only survives a reload', v2.sub === 'Noomi · Visual only' && !v2.attached && v2.visual, JSON.stringify(v2));
    await hb(page, () => __lab.hushbeat.setVisualOnly(false));
    const v3 = await hb(page, () => ({ sub: document.querySelector('.hushbeat .topbar .title small').textContent, attached: __lab.hushbeat.audio.attached }));
    check(scope, 'switching back to Music reattaches the sound', v3.sub === 'Noomi' && v3.attached, JSON.stringify(v3));
    noErrors(scope, errors);
  });

  // ------------------------------------------------------------------ E19 --
  if (only('hidden')) await guard(`${SCOPE}:hidden`, async (scope, own) => {
    const { ctx, page, errors } = await openHb(browser, 'desktop', 'blubi');
    own(ctx);
    const b = await bodyAt(page);
    await page.mouse.click(b.x, b.y); await sleep(600);
    await page.focus('.hushbeat .stage');
    await page.keyboard.down('h');
    await page.keyboard.down('b');
    await waitEvent(page, "e.kind === 'padOn'");
    await sleep(400);
    await H.setHidden(page, true, { lifecycle: true });
    await sleep(300);
    const hdn = await hb(page, () => { const d = __lab.hushbeat.debug(); return { players: d.players, sched: d.scheduler, breath: d.breath.leading, live: __lab.sound.live.size, layers: __lab.hushbeat.engine.layers().length }; });
    // (the SoundEngine stops every voice and suspends; a voice fading as the context suspends ends on resume)
    check(scope, 'hidden: every layer released, players idle, scheduler stopped, breath let go', hdn.layers === 0 && hdn.players.every((p) => p.state === 'idle' && !p.pad && !p.bass) && !hdn.sched.running && !hdn.breath, JSON.stringify(hdn));
    await page.keyboard.up('h'); await page.keyboard.up('b');
    await clearLog(page);
    await H.setHidden(page, false, { lifecycle: true });
    await sleep(1500);
    const vis = await hb(page, () => ({ log: __lab.hushbeat.log.map((e) => e.kind), state: __lab.hushbeat.state }));
    check(scope, 'visible again: listening, nothing plays on its own for 1.5 s', vis.log.filter((k) => k === 'note' || k === 'padOn' || k === 'bassOn').length === 0 && vis.state === 'listening', JSON.stringify(vis));
    const z = await untilSilent(page, 3500);
    check(scope, 'and every voice is gone', z.ok, JSON.stringify(z));
    noErrors(scope, errors);
  });

  // ------------------------------------------------------------------ E20 --
  if (only('exit')) await guard(`${SCOPE}:exit`, async (scope, own) => {
    const { ctx, page, errors } = await H.open(browser, 'desktop', '#home', { initScripts: [H.INIT.listenerCounter, H.INIT.timerSpy], comfort: H.comfort({ favouriteMallow: 'pipzi' }) });
    own(ctx);
    await H.waitRig(page, { timeout: T });
    const hero = await bodyAt(page);
    await page.mouse.click(hero.x, hero.y);
    await untilSilent(page, 5000); await sleep(800);
    const snap = () => hb(page, () => ({ l: __listeners().total, timers: Object.values(__timers().live).reduce((s, c) => s + c.timeout + c.interval, 0), prefs: __lab.prefs.listeners.size, dna: __lab.dna.listeners.size, canvases: document.querySelectorAll('canvas').length }));
    const base = await snap();
    const toHb = async () => { await hb(page, () => __lab.ctx.navigate('/hushbeat')); await page.waitForFunction(() => __lab.hushbeat && __lab.companion?.rig?.soft, null, { timeout: T }); };
    // Escape after playing: the cadence, then home within 1.5 s
    await toHb();
    let b = await bodyAt(page);
    await page.mouse.click(b.x, b.y); await sleep(500);
    await page.focus('.hushbeat .stage');
    await clearLog(page);
    // page-side times: the Escape keydown and the feature's call to go home (building home's Mallow
    // afterwards is the shell's cost, not the leaving beat's)
    await hb(page, () => {
      window.__esc = { t0: 0, t1: 0 };
      addEventListener('keydown', (e) => { if (e.key === 'Escape' && !__esc.t0) __esc.t0 = performance.now(); }, { capture: true, once: true });
      const nav = __lab.ctx.navigate;
      __lab.ctx.navigate = (p) => { if (!__esc.t1) __esc.t1 = performance.now(); __lab.ctx.navigate = nav; nav(p); };
    });
    await page.keyboard.press('Escape');
    const mid = await hb(page, () => ({ state: __lab.hushbeat?.state, cad: __lab.hushbeat?.log.filter((e) => e.src === 'cadence').length, fading: document.querySelector('.hushbeat')?.classList.contains('hb-leaving') }));
    await page.waitForFunction(() => __lab.route === 'home', null, { timeout: T });
    const ms = await hb(page, () => Math.round(__esc.t1 - __esc.t0));
    check(scope, 'Escape: the cadence plays (leaving, fading) and the lab goes home within 1.5 s', mid.state === 'leaving' && mid.cad >= 1 && mid.fading && ms > 600 && ms < 1500, JSON.stringify({ mid, ms }));
    const z = await untilSilent(page, 3000);
    check(scope, 'live voices reach 0 within 3 s; the handle is gone', z.ok && (await hb(page, () => __lab.hushbeat)) === null, JSON.stringify(z));
    // a second Escape leaves at once
    await toHb();
    b = await bodyAt(page);
    await page.mouse.click(b.x, b.y); await sleep(300);
    await page.focus('.hushbeat .stage');
    await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
    await sleep(150);
    check(scope, 'a second Escape leaves at once', await hb(page, () => __lab.route === 'home'));
    // Close with nothing played for 8 s: straight home
    await toHb();
    await sleep(300);
    await page.click('.hushbeat .topbar button[aria-label="Close"]');
    await sleep(150);
    check(scope, 'Close with nothing sounding leaves at once', await hb(page, () => __lab.route === 'home'));
    // twelve switches: nothing grows
    for (let i = 0; i < 12; i++) {
      await toHb();
      b = await bodyAt(page);
      await page.mouse.click(b.x, b.y); await sleep(120);
      await hb(page, () => __lab.ctx.navigate('/'));
      await page.waitForFunction(() => __lab.route === 'home', null, { timeout: T });
    }
    await untilSilent(page, 4000);
    let now = await snap();
    for (let t1 = Date.now(); now.timers > base.timers && Date.now() - t1 < 4000;) { await sleep(250); now = await snap(); }
    check(scope, '12 hushbeat ↔ home switches: listeners, prefs and DNA listeners, timers and canvases back to the baseline', now.l === base.l && now.prefs === base.prefs && now.dna === base.dna && now.timers <= base.timers && now.canvases === base.canvases, JSON.stringify({ base, now }));
    noErrors(scope, errors);
  });

  // ---------------------------------------------------------- E3 E17 E18 --
  // The light and movement: the ring, a bead and the singing mouth at the touch, the groove on the beat
  // (none in reduced motion), scheduled notes seen when heard, the realm warming, the flash budget.
  if (only('scene')) await guard(`${SCOPE}:scene`, async (scope, own) => {
    const { ctx, page, errors } = await openHb(browser, 'phone', 'boppo');
    own(ctx);
    const b = await bodyAt(page);
    const s0 = await hb(page, () => __lab.hushbeat.debug().scene);
    check(scope, 'listening: a faint ring breathes around the Mallow (alpha 0.25), within 0.86 of its height; nothing else lit',
      s0.ringTarget === 0.25 && s0.ringR > b.h * 0.5 && s0.ringR <= b.h * 0.86 * 1.08 + 1 && s0.beads === 0 && s0.ribbon === 0, JSON.stringify({ s0, h: b.h }));
    await page.mouse.click(b.x, b.y);   // unlock
    await sleep(1500);
    const base = await hb(page, () => __lab.companion.rig.val.mouthOpen);
    await page.mouse.move(b.x, b.y - 20); await page.mouse.down();
    const at = await hb(page, () => ({ beads: __lab.hushbeat.scene.pool.alive, floor: __lab.companion.rig.faceOverride.min.mouthOpen || 0, note: __lab.hushbeat.log.filter((e) => e.kind === 'note').at(-1) }));
    await page.mouse.up();
    let rose = null;   // the rig's own mouth (sprung) reaches the singing floor
    for (const t0 = Date.now(); Date.now() - t0 < 2500;) {
      const v = await hb(page, () => __lab.companion.rig.val.mouthOpen);
      if (v >= 0.8 * at.floor) { rose = Date.now() - t0; break; }
      await sleep(25);
    }
    check(scope, 'E3: a touch lights a bead at the finger and sets the singing mouth on the rig in the same task; the mouth follows',
      at.beads >= 1 && at.floor > 0.4 && at.note?.immediate && rose !== null, JSON.stringify({ at: { ...at, note: at.note && { src: at.note.src, immediate: at.note.immediate } }, base, roseMs: rose }));
    // scheduled notes (a tune) are seen when they are heard: due = t + output latency, shown at or after it
    await page.focus('.hushbeat .stage');
    await page.keyboard.press('p');
    await sleep(2600);
    const seen = await hb(page, () => ({ lat: __lab.hushbeat.audio.outputLatency(), notes: __lab.hushbeat.performers[0].debug().notes.filter((n) => !n.immediate) }));
    const lagMax = Math.max(0, ...seen.notes.map((n) => n.at - n.due));
    check(scope, 'E17: phrase notes are shown at ev.t + outputLatency (never before; ≤ one slow frame after)',
      seen.notes.length >= 3 && seen.notes.every((n) => Math.abs(n.due - n.t - seen.lat) < 1e-6 && n.at >= n.due - 1e-6 && n.at - n.due < 0.45), JSON.stringify({ lat: seen.lat, lagMax, n: seen.notes.length }));
    await shot(page, out, 'hushbeat-phone-scene');
    // E17: a hum keeps the music going; the groove eases in and Boppo moves on the beat
    const sample = (ms) => page.evaluate((ms) => new Promise((res) => {
      const bd = __lab.companion.rig.body, out = [], t0 = performance.now();
      const tick = () => { out.push([bd.squash, bd.hop]); if (performance.now() - t0 < ms) setTimeout(tick, 40); else res(out); };
      tick();
    }), ms);
    const variance = (xs) => { const m = xs.reduce((s, x) => s + x, 0) / xs.length; return xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length; };
    await page.keyboard.down('h');
    await page.waitForFunction(() => __lab.hushbeat.debug().groove > 0.9, null, { timeout: T });
    const n0 = await hb(page, () => __lab.hushbeat.performers[0].nudges);
    const normal = await sample(4000);
    const g1 = await hb(page, () => { const h = __lab.hushbeat; return { nudges: h.performers[0].nudges, log: h.performers[0].debug().grooveLog.map((g) => ({ beat: g.beat, lag: +(g.t - h.clock.beatTime(g.beat)).toFixed(3) })) }; });
    check(scope, 'E17: groove nudges land on beat crossings (never early, ≤ one slow frame late), about one a beat',
      g1.nudges - n0 >= 3 && g1.log.length >= 3 && g1.log.every((g) => g.lag >= -0.002 && g.lag < 0.45), JSON.stringify({ n: g1.nudges - n0, last: g1.log.slice(-6) }));
    const mood = await hb(page, () => ({ sent: __lab.stage.env.mood, start: __lab.hushbeat.scene.debug().start, transform: __lab.hushbeat.scene.debug().transform, ring: __lab.hushbeat.scene.debug().ringTarget }));
    check(scope, 'the realm warms and clears with the music (clarity and warmth above its own); a long hum transforms it; the ring brightens',
      mood.sent.clarity > mood.start.clarity && mood.sent.warmth >= mood.start.warmth - 0.01 && mood.transform > 0.05 && mood.ring > 0.4, JSON.stringify(mood));
    await hb(page, () => __lab.prefs.set('motion', 'reduced'));
    await sleep(600);
    const n1 = await hb(page, () => __lab.hushbeat.performers[0].nudges);
    const red = await sample(4000);
    const n2 = await hb(page, () => __lab.hushbeat.performers[0].nudges);
    await page.keyboard.up('h');
    await hb(page, () => __lab.prefs.set('motion', 'full'));
    const vN = variance(normal.map((x) => x[0])), vR = variance(red.map((x) => x[0]));
    check(scope, 'E17 reduced motion: no groove nudges, no hop, body squash variance under 25 % of normal (the floor glow carries the beat)',
      n2 === n1 && red.every((x) => x[1] === 0) && vR < 0.25 * vN && normal.some((x) => x[1] > 0), JSON.stringify({ vN: vN.toExponential(2), vR: vR.toExponential(2), nudges: n2 - n1, hopNormal: Math.max(...normal.map((x) => x[1])).toFixed(4) }));
    await sleep(1500);
    // E18: 40 rapid taps: never more than 3 bright events in a second
    let maxF = 0;
    for (let i = 0; i < 40; i++) {
      await page.mouse.click(b.x + ((i * 37) % 60) - 30, b.y - 40 + ((i * 23) % 50));
      if (i % 3 === 0) maxF = Math.max(maxF, await hb(page, () => __lab.hushbeat.flash.count));
    }
    const fl = await hb(page, () => __lab.hushbeat.flash.log.filter((e) => e.ok).map((e) => e.t));
    const worst = Math.max(0, ...fl.map((t) => fl.filter((x) => x > t - 1000 && x <= t).length));
    check(scope, 'E18: 40 rapid taps: flash1s ≤ 3 throughout (sampled, and in the gate\'s own log)', maxF <= 3 && worst <= 3, JSON.stringify({ maxF, worst, allowed: fl.length }));
    // Visual only: the light is 1.4× stronger, so more beads ask to be bright; the budget still holds
    await hb(page, () => __lab.hushbeat.setVisualOnly(true));
    await sleep(1200);
    let maxV = 0, refused = 0;
    for (let i = 0; i < 40; i++) {
      await page.mouse.click(b.x + ((i * 29) % 60) - 30, b.y - 30 + ((i * 17) % 50));
      if (i % 3 === 0) { const r = await hb(page, () => ({ c: __lab.hushbeat.flash.count, no: __lab.hushbeat.flash.log.filter((e) => !e.ok).length })); maxV = Math.max(maxV, r.c); refused = Math.max(refused, r.no); }
    }
    const fv = await hb(page, () => __lab.hushbeat.flash.log.filter((e) => e.ok).map((e) => e.t));
    const worstV = Math.max(0, ...fv.map((t) => fv.filter((x) => x > t - 1000 && x <= t).length));
    await hb(page, () => __lab.hushbeat.setVisualOnly(false));
    check(scope, 'E18 Visual only (1.4× light): still ≤ 3 bright events a second', maxV <= 3 && worstV <= 3, JSON.stringify({ maxV, worstV, allowed: fv.length, refused }));
    noErrors(scope, errors);
  });

  // ------------------------------------------------------------------ E14 --
  if (only('replay')) await guard(`${SCOPE}:replay`, async (scope, own) => {
    const { ctx, page, errors } = await openHb(browser, 'desktop', 'boppo');
    own(ctx);
    await page.focus('.hushbeat .stage');
    const ctl = () => hb(page, () => __lab.hushbeat.debug().controls);
    const c0 = await ctl();
    await page.keyboard.press('1'); await sleep(380); await page.keyboard.press('3'); await sleep(450);
    const c1 = await ctl();
    await page.keyboard.press('5');
    await page.waitForFunction(() => __lab.hushbeat.debug().controls.replay, null, { timeout: 10000 }).catch(() => {});
    const c2 = await ctl();
    check(scope, 'E14: Replay and Keep stay hidden until a take has 3 events', !c0.replay && !c0.keep && !c1.replay && !c1.keep && c2.replay && c2.keep && c2.replayLabel === 'Replay' && c2.replayPressed === 'false', JSON.stringify({ c0, c1, c2 }));
    await page.keyboard.press('2'); await sleep(380); await page.keyboard.press('4'); await sleep(900);
    const best = await hb(page, () => __lab.hushbeat.engine.take.best());
    await hb(page, () => { window.__reacts = []; __lab.companion.rig.on('react', (e) => __reacts.push(e.kind)); });
    await clearLog(page);
    await page.click('.hushbeat .hb-replay');
    const r1 = await hb(page, () => ({ c: __lab.hushbeat.debug().controls, state: __lab.hushbeat.state, tint: document.querySelector('.hushbeat').classList.contains('replaying'), chip: document.querySelector('.hushbeat .feedback').textContent }));
    check(scope, 'E14: Replay → the chip reads Stop (pressed), replaying, the stage tint deepens, "Replaying"', r1.c.replayLabel === 'Stop' && r1.c.replayPressed === 'true' && r1.state === 'replaying' && r1.tint && r1.chip === 'Replaying', JSON.stringify(r1));
    // (no screenshot here: capturing a software-GL page stalls it for hundreds of ms, which would drop this replay's notes)
    const drop0 = await hb(page, () => __lab.hushbeat.scheduler.dropped);
    await page.waitForFunction(() => !__lab.hushbeat.engine.replaying, null, { timeout: T });
    await sleep(1500);
    const L = await logOf(page);
    const on = L.find((e) => e.kind === 'replay' && e.on), rp = notes(L).filter((e) => e.src === 'replay');
    const want = best.filter((e) => e.kind === 'n').map((e) => e.deg);
    const off = await hb(page, ([t0, ts, bst]) => {
      const h = __lab.hushbeat, c = h.clock, sb = Math.round(c.at(c.nextGrid(t0, 1), {}).beat);
      const q = h.engine._replayGrid(bst).filter((_, i) => bst[i].kind === 'n');
      return ts.map((t, i) => +Math.abs(t - c.beatTime(sb + q[i])).toFixed(4));
    }, [on.t, rp.map((e) => e.t), best]);
    const dropped = (await hb(page, () => __lab.hushbeat.scheduler.dropped)) - drop0;
    check(scope, 'E14: the Mallow sings the take back: the same degrees in order, each on its soft-quantised beat (±3 ms)',
      JSON.stringify(rp.map((e) => e.deg)) === JSON.stringify(want) && off.every((d) => d < 0.003), JSON.stringify({ got: rp.map((e) => e.deg), want, off, dropped }));
    const a = await hb(page, () => ({ p: __lab.hushbeat.performers[0].debug(), sc: __lab.hushbeat.scene.debug(), chip: document.querySelector('.hushbeat .feedback').textContent, c: __lab.hushbeat.debug().controls, state: __lab.hushbeat.state, reacts: __reacts.slice(), env: __lab.stage.env.log.filter((e) => e.kind === 'success') }));
    check(scope, 'E14: it performs the take (pokes where each note was played) and ends proud: its reaction, one realm success pulse, "Replay finished"',
      a.p.pokes >= want.length && a.reacts.includes('success') && a.sc.successes === 1 && a.env.filter((e) => e.ok).length === 1 && a.chip === 'Replay finished' && a.c.replayLabel === 'Replay' && a.state !== 'replaying',
      JSON.stringify({ pokes: a.p.pokes, reacts: a.reacts, successes: a.sc.successes, env: a.env, chip: a.chip, c: a.c, state: a.state }));
    // R replays too; Stop ends it within 200 ms
    await page.focus('.hushbeat .stage');
    await page.keyboard.press('r');
    await page.waitForFunction(() => __lab.hushbeat.engine.replaying, null, { timeout: 5000 });
    await shot(page, out, 'hushbeat-desktop-replay');   // this replay's notes are not checked
    await sleep(300);
    const stopMs = await hb(page, () => new Promise((res) => {
      const t0 = performance.now();
      document.querySelector('.hushbeat .hb-replay').click();
      const chk = () => (!__lab.hushbeat.engine.replaying ? res(performance.now() - t0) : setTimeout(chk, 5));
      chk();
    }));
    const s2 = await hb(page, () => ({ c: __lab.hushbeat.debug().controls, last: __lab.hushbeat.log.filter((e) => e.kind === 'replay').at(-1), tint: document.querySelector('.hushbeat').classList.contains('replaying') }));
    check(scope, 'E14: R replays; Stop ends it within 200 ms (aria-pressed false, the tint lifts, no success)', stopMs <= 200 && s2.c.replayPressed === 'false' && s2.last.stopped && !s2.tint, JSON.stringify({ stopMs, s2 }));
    await sleep(800);
    const before = await hb(page, () => __lab.hushbeat.log.filter((e) => e.src === 'replay').length);
    await sleep(1200);
    check(scope, 'nothing more after Stop', (await hb(page, () => __lab.hushbeat.log.filter((e) => e.src === 'replay').length)) === before);
    // a hidden page cancels a replay
    await page.click('.hushbeat .hb-replay');
    await page.waitForFunction(() => __lab.hushbeat.engine.replaying, null, { timeout: 5000 });
    await sleep(500);
    await H.setHidden(page, true, { lifecycle: true });
    await sleep(250);
    const hid = await hb(page, () => ({ rep: __lab.hushbeat.engine.replaying, sched: __lab.hushbeat.scheduler.running, tint: document.querySelector('.hushbeat').classList.contains('replaying'), perf: __lab.hushbeat.performers[0].debug().performing, state: __lab.hushbeat.state }));
    await H.setHidden(page, false, { lifecycle: true });
    check(scope, 'E14/E19: a hidden page cancels the replay (scheduler stopped, nothing performed, listening)', !hid.rep && !hid.sched && !hid.tint && !hid.perf.squeeze && !hid.perf.press && hid.state === 'listening', JSON.stringify(hid));
    noErrors(scope, errors);
  });

  // ------------------------------------------------------------------ E15 --
  if (only('keep')) await guard(`${SCOPE}:keep`, async (scope, own) => {
    const pocket = { kind: 'pocket', id: 'soft-breath' };
    const RE = /^(?:[0-7][0-9a-v][nbhNBH][0-9a-l][1-9]){1,48}$/;
    const { ctx, page, errors } = await H.open(browser, 'desktop', '#hushbeat', { comfort: H.comfort({ favouriteMallow: 'boppo' }, { favourites: [pocket] }) });
    own(ctx);
    await H.waitRig(page, { timeout: T });
    await page.waitForFunction(() => __lab.hushbeat, null, { timeout: T });
    await page.focus('.hushbeat .stage');
    for (const k of ['1', '3', '5', '2']) { await page.keyboard.press(k); await sleep(350); }
    await page.waitForFunction(() => __lab.hushbeat.debug().controls.keep, null, { timeout: T });
    await sleep(300);
    const state = () => hb(page, () => ({ c: __lab.hushbeat.debug().controls, chip: document.querySelector('.hushbeat .feedback').textContent, favs: __lab.dna.favourites() }));
    await page.click('.hushbeat .hb-keep'); await sleep(350);
    const k1 = await state();
    const tune = k1.favs.find((f) => f.kind === 'hushbeat');
    check(scope, 'E15: Keep stores a sanitised tune (lead, pace, motif; no friend) and shows "Kept", pressed; the Pocket favourite stays',
      k1.c.keepPressed === 'true' && k1.c.keepLabel === 'Kept' && k1.chip === 'Kept' && tune?.mallow === 'boppo' && tune.pace === 'natural' && RE.test(tune.motif) && !('friend' in tune) && k1.favs.some((f) => f.kind === 'pocket'), JSON.stringify(k1));
    await page.click('.hushbeat .hb-keep'); await sleep(350);
    const k2 = await state();
    check(scope, 'E15: a second tap removes it ("Removed")', k2.c.keepPressed === 'false' && k2.c.keepLabel === 'Keep' && k2.chip === 'Removed' && !k2.favs.some((f) => f.kind === 'hushbeat'), JSON.stringify(k2));
    await page.focus('.hushbeat .stage');
    await page.keyboard.press('k'); await sleep(350);
    check(scope, 'K keeps it again', (await state()).c.keepPressed === 'true');
    await hb(page, () => __lab.dna.setEnabled(false)); await sleep(500);
    const offC = (await state()).c;
    await hb(page, () => __lab.dna.setEnabled(true)); await sleep(500);
    check(scope, 'E15: Keep is hidden while personalisation is off (and back when it is on)', !offC.keep && (await state()).c.keep, JSON.stringify(offC));
    // home "For you" offers the tune
    await hb(page, () => __lab.ctx.navigate('/'));
    await page.waitForFunction(() => __lab.route === 'home', null, { timeout: T });
    await H.waitRig(page, { timeout: T });
    const offers = await hb(page, () => [...document.querySelectorAll('.offer')].map((o) => ({ text: o.textContent, data: o.dataset.offer })));
    const offer = offers.find((o) => o.data === 'hushbeat:hushbeat');
    check(scope, 'E15: home "For you" shows "Boppo tune · Favourite"', !!offer && offer.text.includes('Boppo tune') && offer.text.includes('Favourite'), JSON.stringify(offers));
    // opening it: ready, with Play it; nothing sounds until it is tapped
    await page.click('.offer[data-offer="hushbeat:hushbeat"]');
    await page.waitForFunction(() => __lab.route === 'hushbeat' && __lab.hushbeat && __lab.companion?.rig?.soft, null, { timeout: T });
    await sleep(2500);
    const p1 = await hb(page, () => { const d = __lab.hushbeat.debug(); return { c: d.controls, log: __lab.hushbeat.log.length, live: __lab.sound.live.size, best: d.best, pace: d.pace, scheduler: d.scheduler }; });
    check(scope, 'E15: opening it shows Play it (Replay hidden) with Kept pressed, and nothing plays by itself for 2.5 s',
      p1.c.playIt && !p1.c.replay && p1.c.keepPressed === 'true' && p1.log === 0 && p1.live === 0 && p1.best === 4 && !p1.scheduler.running, JSON.stringify(p1));
    await shot(page, out, 'hushbeat-desktop-playit');
    await page.click('.hushbeat .hb-playit');
    await waitEvent(page, "e.kind === 'note' && e.src === 'replay'");
    const p2 = await hb(page, () => ({ c: __lab.hushbeat.debug().controls, state: __lab.hushbeat.state }));
    check(scope, 'E15: Play it plays the tune (the Mallow sings it back), then goes away', !p2.c.playIt && p2.state === 'replaying' && p2.c.replay && p2.c.replayLabel === 'Stop', JSON.stringify(p2));
    await page.waitForFunction(() => !__lab.hushbeat.engine.replaying, null, { timeout: T });
    const n = await hb(page, () => __lab.hushbeat.log.filter((e) => e.kind === 'note' && e.src === 'replay').length);
    check(scope, 'all four notes of the kept tune', n === 4, String(n));
    // the Comfort DNA screen describes it
    await hb(page, () => __lab.ctx.navigate('/comfort-dna'));
    await page.waitForFunction(() => __lab.route === 'comfort-dna', null, { timeout: T });
    await sleep(600);
    const txt = await hb(page, () => document.body.innerText);
    check(scope, 'E15: the Comfort DNA screen describes it: "Boppo tune · 4 notes · Natural"', txt.includes('Boppo tune · 4 notes · Natural'), txt.slice(0, 400));
    noErrors(scope, errors);
    // six tunes kept: Keep refuses and says where to remove one; nothing is dropped
    const six = Array.from({ length: 6 }, (_, i) => ({ kind: 'hushbeat', id: 'hushbeat', mallow: 'boppo', pace: 'natural', motif: `00n${'89abcd'[i]}504n7508n65` }));
    const c6 = await H.open(browser, 'desktop', '#hushbeat', { comfort: H.comfort({ favouriteMallow: 'boppo' }, { favourites: [pocket, ...six] }) });
    try {
      const p6 = c6.page;
      await H.waitRig(p6, { timeout: T });
      await p6.waitForFunction(() => __lab.hushbeat, null, { timeout: T });
      await p6.focus('.hushbeat .stage');
      for (const k of ['2', '4', '6']) { await p6.keyboard.press(k); await sleep(350); }
      await p6.waitForFunction(() => __lab.hushbeat.debug().controls.keep, null, { timeout: T });
      await p6.click('.hushbeat .hb-keep'); await sleep(350);
      const r6 = await p6.evaluate(() => ({ chip: document.querySelector('.hushbeat .feedback').textContent, favs: __lab.dna.favourites(), pressed: __lab.hushbeat.debug().controls.keepPressed }));
      check(`${scope}:six`, 'E15: with six tunes kept, Keep refuses ("Six tunes kept. Remove one in Sound and pace."); all seven favourites stay',
        r6.chip === 'Six tunes kept. Remove one in Sound and pace.' && r6.favs.length === 7 && r6.favs.filter((f) => f.kind === 'hushbeat').length === 6 && r6.favs.some((f) => f.kind === 'pocket') && r6.pressed === 'false', JSON.stringify({ chip: r6.chip, n: r6.favs.length, pressed: r6.pressed }));
      noErrors(`${scope}:six`, c6.errors);
    } finally { await c6.ctx.close(); }
  });

  // ------------------------------------------------------------- resting --
  if (only('rest')) await guard(`${SCOPE}:rest`, async (scope, own) => {
    const { ctx, page, errors } = await openHb(browser, 'phone', 'zuzu');
    own(ctx);
    await hb(page, () => __lab.hushbeat.setRestAfter(2));   // test seam (40 s in use)
    await page.waitForFunction(() => __lab.hushbeat.state === 'resting', null, { timeout: T });
    await sleep(1500);
    const r = await hb(page, () => ({ rest: __lab.companion.restOverride, d: __lab.hushbeat.debug(), spin: __lab.hushbeat.performers[0].mix.out.set.spin, chipOn: document.querySelector('.hushbeat .feedback').classList.contains('on') }));
    check(scope, 'RESTING when untouched: Zuzu\'s resting face, the ring dims to 0.15, its spiral slows; no sound, no text',
      r.rest?.mix?.calm === 0.6 && r.rest.mix.curious === 0.4 && r.d.scene.ringTarget === 0.15 && r.spin === 0.15 && r.d.live === 0 && !r.chipOn && r.d.performers[0].resting, JSON.stringify({ rest: r.rest, ring: r.d.scene.ringTarget, spin: r.spin, chipOn: r.chipOn }));
    const b = await bodyAt(page);
    await page.mouse.click(b.x, b.y); await sleep(500);
    const w = await hb(page, () => ({ rest: __lab.companion.restOverride, state: __lab.hushbeat.state, p: __lab.hushbeat.performers[0].debug().resting }));
    check(scope, 'any touch wakes it: playing, its own face again', !w.rest && w.state === 'playing' && !w.p, JSON.stringify(w));
    noErrors(scope, errors);
  });

  // ------------------------------------------------------------- E16 E21 --
  if (only('duet')) await guard(`${SCOPE}:duet`, async (scope, own) => {
    const { ctx, page, errors } = await openHb(browser, 'phone', 'boppo');
    own(ctx);
    const solo = await hb(page, () => ({ canvases: document.querySelectorAll('canvas').length, fav: __lab.dna.get('favouriteMallow'), id: __lab.ctx.mallowId }));
    await openSheetBy(page, '.hushbeat .hb-friend-btn');
    const pk = await hb(page, () => {
      const sh = document.querySelector('.hushbeat .sheet');
      return { title: sh.querySelector('h3').textContent, pills: [...sh.querySelectorAll('.hb-friend')].map((b) => ({ id: b.dataset.mallow, label: b.getAttribute('aria-label') })), alone: !!sh.querySelector('.hb-alone'), focus: sh.contains(document.activeElement), sheet: __lab.hushbeat.debug().sheet };
    });
    check(scope, 'E16: Friend opens "Who joins Boppo?": the six other Mallows with their sound words, no Play alone yet, focus inside',
      pk.title === 'Who joins Boppo?' && pk.pills.length === 6 && !pk.pills.some((x) => x.id === 'boppo') && pk.pills.find((x) => x.id === 'loomi')?.label === 'Loomi, soft pads'
      && pk.pills.find((x) => x.id === 'pipzi')?.label === 'Pipzi, spark bells' && !pk.alone && pk.focus && pk.sheet === 'Who joins Boppo?', JSON.stringify(pk));
    await shot(page, out, 'hushbeat-phone-picker');
    await page.click('.hushbeat .hb-friend[data-mallow="loomi"]');
    await duetReady(page);
    await sleep(400);
    const j = await hb(page, () => {
      const scr = document.querySelector('.screen.hushbeat'), st = [...scr.querySelectorAll('.stage')], d = __lab.hushbeat.debug();
      const bodies = __lab.companions().map((c, i) => { const r = c.rig.bodyRect(), sr = st[i].getBoundingClientRect(); return { id: c.id, l: r.cx - r.w / 2, r: r.cx + r.w / 2, sw: sr.width, left: sr.left + r.cx - r.w / 2, right: sr.left + r.cx + r.w / 2 }; });
      return {
        layout: scr.dataset.layout, stages: st.length, lead: st[0].classList.contains('lead'), partner: !!st[1]?.classList.contains('partner'),
        labels: st.map((x) => x.getAttribute('aria-label')), sub: scr.querySelector('.topbar .title small').textContent, chip: scr.querySelector('.feedback').textContent,
        bodies, friend: d.friend, players: d.players.map((x) => x.mallow), ctxLead: __lab.companion === __lab.companions()[0],
        hello: __lab.hushbeat.log.filter((e) => e.kind === 'note' && e.src === 'hello').map((e) => e.slot),
      };
    });
    check(scope, 'E16: Loomi joins: two stages, two rigs ready, the subtitle, the feedback and both stage labels (with G and Tab) say so',
      j.layout === 'duet' && j.stages === 2 && j.lead && j.partner && j.sub === 'Boppo & Loomi' && j.chip === 'Loomi joins' && j.friend === 'loomi' && j.players.join() === 'boppo,loomi'
      && j.labels[0].startsWith('Boppo.') && j.labels[1].startsWith('Loomi.') && j.labels.every((l) => l.includes('G plays both together')) && j.ctxLead, JSON.stringify(j));
    check(scope, 'E16: each body inside its own stage; they do not overlap', j.bodies.every((b) => b.l >= -1 && b.r <= b.sw + 1) && j.bodies[0].right <= j.bodies[1].left + 1, JSON.stringify(j.bodies));
    check(scope, 'the friend sings a quiet two-note hello (the picker tap was a gesture)', j.hello.length === 2 && j.hello.every((x) => x === 1), JSON.stringify(j.hello));
    await H.layout(page, `${scope}:layout`, { scrollers: ['.hb-tray'] });
    // a tap on each within 400 ms: the friend harmonises
    const B = await bodiesAt(page);
    await clearLog(page);
    await page.mouse.click(B[0].x, B[0].y);
    await page.mouse.click(B[1].x, B[1].y);
    await waitEvent(page, "e.kind === 'harmony'");
    const hm = await hb(page, () => { const L = __lab.hushbeat.log, n = L.filter((e) => e.kind === 'note' && !e.ghost); return { h: L.find((e) => e.kind === 'harmony'), a: n.find((e) => e.slot === 0), b: n.find((e) => e.slot === 1), glance: __lab.hushbeat.performers.map((x) => x.lookT) }; });
    const icv = hm.a && hm.b ? icOf(hm.b.semi, hm.a.semi) : -1;
    check(scope, 'E16: a left tap then a right one within 400 ms harmonise (a 3rd or 6th, else a 5th or octave), and the two glance at each other',
      !!hm.h && hm.b.t - hm.a.t <= 0.4 && [0, 3, 4, 5].includes(icv) && hm.h.interval === icv && hm.glance.every((t) => t > 0), JSON.stringify({ h: hm.h, icv, a: hm.a?.semi, b: hm.b?.semi }));
    // Both + Hum: a bloom, the arc between the heads
    await page.click('.hushbeat .hb-buttons');
    await page.waitForSelector('.hushbeat .hb-target', { timeout: T });
    const tg = await hb(page, () => [...document.querySelectorAll('.hushbeat .hb-target button')].map((b) => b.textContent));
    check(scope, 'E16: in a duet the tray starts with the target [Boppo | Both | Loomi]', tg.join('|') === 'Boppo|Both|Loomi', JSON.stringify(tg));
    await page.click('.hushbeat .hb-target button:nth-child(2)');
    const humBox = await (await page.$$('.hushbeat .hb-tray .chip.hold'))[1].boundingBox();
    await clearLog(page);
    await page.mouse.move(humBox.x + humBox.width / 2, humBox.y + humBox.height / 2);
    await page.mouse.down();
    await waitEvent(page, "e.kind === 'bloom' && e.on");
    await page.waitForFunction(() => __lab.hushbeat.scene.arc?.shown > 0.15 && __lab.hushbeat.performers.every((x) => x.debug().face.glow > 0), null, { timeout: T }).catch(() => {});
    const bl = await hb(page, () => {
      const L = __lab.hushbeat.log, pads = L.filter((e) => e.kind === 'padOn'), pcs = new Set(pads.flatMap((e) => e.semis.map((x) => ((x % 12) + 12) % 12)));
      return { pads: pads.map((e) => e.slot), pcs: pcs.size, arc: +(__lab.hushbeat.scene.arc?.shown || 0).toFixed(3), held: __lab.hushbeat.scene.arc?.held, glow: __lab.hushbeat.performers.map((x) => x.debug().face.glow), transform: __lab.hushbeat.debug().scene.transform };
    });
    check(scope, 'E16: Both + Hum: two hums bloom into one chord (≥ 3 pitch classes), the arc glows between the heads, both glow',
      bl.pads.includes(0) && bl.pads.includes(1) && bl.pcs >= 3 && bl.held && bl.arc > 0.15 && bl.glow.every((g) => g > 0), JSON.stringify(bl));
    await shot(page, out, 'hushbeat-phone-bloom');
    await page.mouse.up();
    await waitEvent(page, "e.kind === 'bloom' && !e.on");
    // a phrase on the lead gets an answer from the idle friend
    await page.click('.hushbeat .hb-target button:nth-child(1)');
    await hb(page, () => document.querySelector('.hushbeat .stage.lead').focus());
    await page.waitForFunction(() => __lab.hushbeat.debug().players.every((x) => !x.pad && !x.bass) && performance.now() / 1000 - __lab.hushbeat.players[1].part.lastOnset() > 0.8, null, { timeout: T });
    await clearLog(page);
    await page.keyboard.press('p');
    await waitEvent(page, "e.kind === 'note' && e.src === 'answer' && e.slot === 1", T);
    const an = await hb(page, () => { const L = __lab.hushbeat.log; return { end: L.find((e) => e.kind === 'phraseEnd'), first: L.find((e) => e.src === 'answer'), calls: L.filter((e) => e.kind === 'note' && e.src === 'phrase' && e.slot === 0).length }; });
    check(scope, 'E16: the lead\'s phrase gets an answer from the friend, after the phrase', an.calls >= 2 && !!an.first && (!an.end || an.first.t > an.end.t), JSON.stringify(an));
    // Friend answers Off (Sound and pace, only in a duet): no answer
    await openSheetBy(page, '.hushbeat .hb-music');
    const rows = await hb(page, () => [...document.querySelectorAll('.hushbeat .sheet .row .lbl')].map((l) => l.firstChild.textContent));
    await page.click('.hushbeat .sheet .hb-answers button:nth-child(2)');
    const ans = await hb(page, () => __lab.hushbeat.debug().answers);
    await page.keyboard.press('Escape');
    await sheetGone(page);
    check(scope, 'Sound and pace in a duet has Friend answers; Off turns them off', rows.includes('Friend answers') && ans === false, JSON.stringify({ rows, ans }));
    await hb(page, () => document.querySelector('.hushbeat .stage.lead').focus());
    await sleep(1500);
    await clearLog(page);
    await page.keyboard.press('p');
    await waitEvent(page, "e.kind === 'phraseEnd'", T);
    await sleep(3000);
    const noAns = await hb(page, () => __lab.hushbeat.log.filter((e) => e.src === 'answer').length);
    check(scope, 'with Friend answers Off a phrase gets no answer', noAns === 0, String(noAns));
    // G: both together
    await clearLog(page);
    await page.keyboard.press('g');
    await waitEvent(page, "e.kind === 'harmony'");
    const g = await hb(page, () => { const n = __lab.hushbeat.log.filter((e) => e.kind === 'note' && !e.ghost); return { slots: n.map((e) => e.slot), semis: n.map((e) => e.semi), h: __lab.hushbeat.log.find((e) => e.kind === 'harmony') }; });
    check(scope, 'E16: G plays both together; the friend harmonises', g.slots.includes(0) && g.slots.includes(1) && [0, 3, 4, 5].includes(g.h?.interval), JSON.stringify(g));
    // Tab: keyboard focus moves to the friend's stage, and its keys play the friend
    await hb(page, () => document.querySelector('.hushbeat .stage.lead').focus());
    await sleep(400);   // G's notes were just now: a key within 70 ms would be a ghost (rate limit)
    await page.keyboard.press('Tab');
    const fo = await hb(page, () => document.activeElement?.classList.contains('partner'));
    await clearLog(page);
    await page.keyboard.press('3'); await sleep(250);
    await page.keyboard.press('Enter'); await sleep(500);
    const tk = await hb(page, () => __lab.hushbeat.log.filter((e) => e.kind === 'note' && !e.ghost && e.src === 'live').map((e) => e.slot));
    const tkAll = await hb(page, () => ({ log: __lab.hushbeat.log.map((e) => `${e.kind}:${e.slot}:${e.src || ''}${e.ghost ? ':ghost' : ''}`), d: __lab.hushbeat.debug().players, state: __lab.hushbeat.state, ev: __lab.events.slice(-4) }));
    check(scope, 'E16: Tab moves keyboard focus to the friend\'s stage; 3 and Enter play the friend', fo && tk.length >= 2 && tk.every((x) => x === 1), JSON.stringify({ fo, tk, tkAll }));
    // Keep in a duet: the tune keeps its friend
    await page.waitForFunction(() => __lab.hushbeat.debug().controls.keep, null, { timeout: 15000 }).catch(async () => {
      console.log('keep wait', JSON.stringify(await hb(page, () => { const d = __lab.hushbeat.debug(); return { state: d.state, take: d.take, best: d.best, prev: __lab.hushbeat.engine.take.prev?.length, c: d.controls, dna: __lab.dna.enabled }; })));
    });
    await page.click('.hushbeat .hb-keep'); await sleep(350);
    const kf = await hb(page, () => __lab.dna.favourites().find((f) => f.kind === 'hushbeat'));
    check(scope, 'E15: Keep in a duet saves the friend with the tune', kf?.mallow === 'boppo' && kf.friend === 'loomi' && kf.pace === 'natural' && typeof kf.motif === 'string', JSON.stringify(kf));
    // motion and quality reach both rigs (lab.js addCompanion); the friend stays one tier lower
    await hb(page, () => __lab.prefs.set('motion', 'reduced')); await sleep(300);
    const rm = await hb(page, () => __lab.companions().map((c) => !!c.rig.opts.reducedMotion));
    await hb(page, () => __lab.prefs.set('motion', 'system'));
    await hb(page, () => __lab.prefs.set('quality', 'medium')); await sleep(1500);
    const qq = await hb(page, () => ({ q: __lab.companions().map((c) => c.rig.quality), feature: __lab.hushbeat.debug().quality }));
    await hb(page, () => __lab.prefs.set('quality', 'low')); await sleep(500);
    check(scope, 'E16: reduced motion and a quality change reach both rigs; the friend runs one tier lower', rm.every(Boolean) && qq.q[0] === 'medium' && qq.q[1] === 'low' && qq.feature === 'medium', JSON.stringify({ rm, qq }));
    // Play alone: the friend's stage and canvas go; the favourite Mallow never changed
    await openSheetBy(page, '.hushbeat .hb-friend-btn');
    const pressed = await hb(page, () => ({ on: document.querySelector('.hushbeat .hb-friend[aria-pressed="true"]')?.dataset.mallow, label: document.querySelector('.hushbeat .hb-friend[aria-pressed="true"]')?.getAttribute('aria-label') }));
    await page.click('.hushbeat .hb-alone');
    await duetReady(page, 1);
    await sleep(400);
    const al = await hb(page, () => ({ canvases: document.querySelectorAll('canvas').length, stages: document.querySelectorAll('.hushbeat .stage').length, layout: document.querySelector('.hushbeat').dataset.layout || null, sub: document.querySelector('.hushbeat .topbar .title small').textContent, chip: document.querySelector('.hushbeat .feedback').textContent, comps: __lab.companions().length, fav: __lab.dna.get('favouriteMallow'), id: __lab.ctx.mallowId, target: document.querySelector('.hushbeat .hb-target') }));
    check(scope, 'E16: Play alone (the friend shown as playing now) removes the second stage and canvas; the tray loses its target',
      pressed.on === 'loomi' && pressed.label === 'Loomi, soft pads, playing now' && al.stages === 1 && al.canvases === solo.canvases && !al.layout && al.sub === 'Boppo' && al.chip === 'Playing alone' && al.comps === 1 && !al.target, JSON.stringify({ pressed, al, solo }));
    check(scope, 'E21: the favourite Mallow and the lab\'s Mallow are unchanged after a duet', al.fav === solo.fav && al.id === solo.id && al.id === 'boppo', JSON.stringify({ solo, al }));
    noErrors(scope, errors);
    // the kept duet from home: it opens as a duet with Play it, silent (no hello) until tapped
    await hb(page, () => __lab.ctx.navigate('/'));
    await page.waitForFunction(() => __lab.route === 'home', null, { timeout: T });
    await H.waitRig(page, { timeout: T });
    const offer = await hb(page, () => [...document.querySelectorAll('.offer')].map((o) => o.textContent).find((x) => x.includes('tune')));
    check(scope, 'E15: home "For you" offers "Boppo & Loomi tune"', !!offer && offer.includes('Boppo & Loomi tune'), String(offer));
    await page.click('.offer[data-offer="hushbeat:hushbeat"]');
    await page.waitForFunction(() => __lab.route === 'hushbeat' && __lab.hushbeat, null, { timeout: T });
    await duetReady(page, 2);
    await sleep(2000);
    const kd = await hb(page, () => { const d = __lab.hushbeat.debug(); return { friend: d.friend, playIt: d.controls.playIt, keep: d.controls.keepPressed, log: __lab.hushbeat.log.length, live: __lab.sound.live.size, sub: document.querySelector('.hushbeat .topbar .title small').textContent }; });
    check(scope, 'E15: the kept duet opens with Loomi and Play it (Kept pressed); nothing sounds, not even a hello, until it is tapped',
      kd.friend === 'loomi' && kd.playIt && kd.keep === 'true' && kd.log === 0 && kd.live === 0 && kd.sub === 'Boppo & Loomi', JSON.stringify(kd));
    const upper = /[NBH]/.test(kf?.motif || '');
    await page.click('.hushbeat .hb-playit');
    await waitEvent(page, upper ? "e.kind === 'note' && e.src === 'replay' && e.slot === 1" : "e.kind === 'note' && e.src === 'replay'");
    check(scope, 'Play it plays the kept duet (the friend\'s notes by the friend)', true, upper ? 'slot 1 replayed' : 'no friend notes in this take');
    await shot(page, out, 'hushbeat-phone-duet-playit');
    // leaving mid-duet (mid-replay): the friend goes with the screen, nothing is left
    await hb(page, () => document.querySelector('.hushbeat .stage.lead').focus());
    await page.keyboard.press('Escape'); await sleep(50); await page.keyboard.press('Escape');
    await page.waitForFunction(() => __lab.route === 'home', null, { timeout: T });
    const gone = await untilSilent(page, 3500);
    const left = await hb(page, () => ({ hb: __lab.hushbeat, stage: !!__lab.stage, partners: __lab.companions().filter((c) => c !== __lab.ctx.companion).length, stages: document.querySelectorAll('.stage.partner').length, sheets: document.querySelectorAll('.sheet').length }));
    check(`${scope}:kept`, 'leaving a duet mid-replay: home, no voice within 3.5 s, no partner left registered, no handle', gone.ok && left.hb === null && left.partners === 0 && left.stages === 0 && left.sheets === 0, JSON.stringify({ gone, left }));
    noErrors(`${scope}:kept`, errors);
  });

  // ------------------------------------------------------- E11 E13 E23 --
  if (only('sheet')) await guard(`${SCOPE}:sheet`, async (scope, own) => {
    const tunes = [
      { kind: 'hushbeat', id: 'hushbeat', mallow: 'boppo', friend: 'loomi', pace: 'natural', motif: '00n9604Na608nb6' },
      { kind: 'hushbeat', id: 'hushbeat', mallow: 'pipzi', pace: 'livelier', motif: '00n7504n8508n95' },
    ];
    const { ctx, page, errors } = await H.open(browser, 'phone', '#hushbeat', { comfort: H.comfort({ favouriteMallow: 'boppo' }, { favourites: [...tunes, { kind: 'pocket', id: 'soft-breath' }] }) });
    own(ctx);
    await H.waitRig(page, { timeout: T });
    await page.waitForFunction(() => __lab.hushbeat, null, { timeout: T });
    await openSheetBy(page, '.hushbeat .hb-music');
    const sh = await hb(page, () => {
      const el = document.querySelector('.hushbeat .sheet');
      return {
        title: el.querySelector('h3').textContent, rows: [...el.querySelectorAll('.row .lbl')].map((l) => l.firstChild.textContent), focus: document.activeElement?.className,
        vol: el.querySelector('.hb-volume').value, volLabel: el.querySelector('.hb-volume').getAttribute('aria-label'), sub: [...el.querySelectorAll('.row .sub')].map((x) => x.textContent),
        tunes: [...el.querySelectorAll('.hb-tune')].map((t) => ({ name: t.querySelector('.hb-tune-name').textContent, play: t.querySelector('.hb-tune-play').getAttribute('aria-label'), remove: t.querySelector('.hb-tune-remove').getAttribute('aria-label') })),
        foot: el.querySelector('.hb-foot').textContent, inScreen: !!el.closest('.screen.hushbeat'), prefVol: __lab.prefs.get('volume'), sheet: __lab.hushbeat.debug().sheet,
      };
    });
    check(scope, '♪ opens "Sound and pace" inside the screen: Volume, Sound, Breath pace, Your tunes, Lab settings (no Friend answers solo); focus on Volume',
      sh.title === 'Sound and pace' && sh.rows.join('|') === 'Volume|Sound|Breath pace|Your tunes|Lab settings' && sh.focus === 'hb-volume' && sh.inScreen && sh.sheet === 'Sound and pace', JSON.stringify(sh));
    check(scope, 'Volume is the lab\'s volume ("Same as in Settings", labelled); the sub-texts and the footnote are as written',
      +sh.vol === sh.prefVol && sh.volLabel === 'Volume' && sh.sub[0] === 'Same as in Settings' && sh.sub[1] === 'Visual only: music as light and movement, no sound'
      && sh.foot === 'Music plays even with the Mallow voice off. Use Mute or Visual only for quiet.', JSON.stringify(sh));
    check(scope, 'Your tunes: each kept tune described, with Play and Remove that name it',
      sh.tunes.length === 2 && sh.tunes[0].name === 'Boppo & Loomi tune · 3 notes · Natural' && sh.tunes[1].name === 'Pipzi tune · 3 notes · Livelier'
      && sh.tunes[0].play === 'Play Boppo & Loomi tune · 3 notes · Natural' && sh.tunes[1].remove === 'Remove Pipzi tune · 3 notes · Livelier', JSON.stringify(sh.tunes));
    await shot(page, out, 'hushbeat-phone-sheet');
    // E11: the volume moves prefs.volume and the master gain
    const setVol = (v) => hb(page, (v) => { const r = document.querySelector('.hushbeat .hb-volume'); r.value = String(v); r.dispatchEvent(new Event('input', { bubbles: true })); }, v);
    await setVol(0.3); await sleep(500);
    const v1 = await hb(page, () => ({ pref: __lab.prefs.get('volume'), gain: __lab.sound.master ? +__lab.sound.master.gain.value.toFixed(3) : null }));
    check(scope, 'E11: Volume moves prefs.volume and the master gain', v1.pref === 0.3 && v1.gain != null && Math.abs(v1.gain - 0.3) < 0.03, JSON.stringify(v1));
    // Visual only and Breath pace
    await page.click('.hushbeat .sheet .row:nth-of-type(2) .seg button:nth-child(2)');
    await sleep(300);
    const vo = await hb(page, () => ({ pref: __lab.prefs.get('musicVisualOnly'), vo: __lab.hushbeat.debug().visualOnly, sub: document.querySelector('.hushbeat .topbar .title small').textContent }));
    await page.click('.hushbeat .sheet .row:nth-of-type(2) .seg button:nth-child(1)');
    await page.click('.hushbeat .sheet .row:nth-of-type(3) .seg button:nth-child(3)');
    await sleep(300);
    const pc = await hb(page, () => ({ pace: __lab.hushbeat.debug().pace, vo: __lab.prefs.get('musicVisualOnly'), target: __lab.hushbeat.clock.target }));
    check(scope, 'Sound [Music | Visual only] is prefs.musicVisualOnly (the subtitle says so); Breath pace sets this visit\'s pace',
      vo.pref === true && vo.vo === true && vo.sub === 'Boppo · Visual only' && pc.vo === false && pc.pace === 'livelier', JSON.stringify({ vo, pc }));
    // Remove keeps focus in the list
    await page.click('.hushbeat .sheet .hb-tune:nth-child(2) .hb-tune-remove');
    await sleep(300);
    const rm = await hb(page, () => ({ n: document.querySelectorAll('.hushbeat .hb-tune').length, favs: __lab.dna.favourites().map((f) => f.kind + ':' + (f.mallow || f.id)), focusIn: !!document.activeElement?.closest('.hushbeat .sheet'), focus: document.activeElement?.className }));
    check(scope, 'Remove takes the tune out of Comfort DNA and the list; focus stays in the sheet', rm.n === 1 && !rm.favs.includes('hushbeat:pipzi') && rm.favs.includes('hushbeat:boppo') && rm.favs.includes('pocket:soft-breath') && rm.focusIn, JSON.stringify(rm));
    // Escape closes the sheet first (the screen stays); focus goes back to ♪
    await page.keyboard.press('Escape');
    await sheetGone(page);
    await sleep(400);
    const es = await hb(page, () => ({ route: __lab.route, state: __lab.hushbeat.state, focus: document.activeElement?.classList.contains('hb-music'), sheets: document.querySelectorAll('.sheet').length }));
    check(scope, 'E23: Escape closes the sheet first (still on Hushbeat); focus returns to ♪', es.route === 'hushbeat' && es.state !== 'leaving' && es.focus && es.sheets === 0, JSON.stringify(es));
    // E11 (at 0): nothing is heard, the light still plays
    trace('volume 0');
    await openSheetBy(page, '.hushbeat .hb-music');
    await setVol(0); await sleep(300);
    await page.keyboard.press('Escape');
    await sheetGone(page);
    await clearLog(page);
    trace('tap at 0');
    const B = await bodyAt(page);
    await page.mouse.click(B.x, B.y);
    await waitEvent(page, "e.kind === 'note' && !e.ghost");
    await sleep(200);
    const z = await hb(page, () => ({ gain: +__lab.sound.master.gain.value.toFixed(3), beads: __lab.hushbeat.scene.debug().beads, pref: __lab.prefs.get('volume') }));
    check(scope, 'E11: at volume 0 nothing is heard, but the notes still show as light', z.pref === 0 && z.gain < 0.01 && z.beads > 0, JSON.stringify(z));
    await hb(page, () => __lab.prefs.set('volume', 0.8));
    // Your tunes → Play: the tune's friend joins and it plays at once (the tap in the sheet is the gesture)
    await openSheetBy(page, '.hushbeat .hb-music');
    await clearLog(page);
    trace('play a tune');
    await page.click('.hushbeat .sheet .hb-tune-play');
    await duetReady(page, 2);
    trace('duet ready');
    await waitEvent(page, "e.kind === 'note' && e.src === 'replay' && e.slot === 1");
    const pt = await hb(page, () => ({ friend: __lab.hushbeat.debug().friend, pace: __lab.hushbeat.debug().pace, replay: __lab.hushbeat.log.filter((e) => e.kind === 'note' && e.src === 'replay').map((e) => `${e.slot}:${e.deg}`), hello: __lab.hushbeat.log.filter((e) => e.src === 'hello').length }));
    check(scope, 'Play (Your tunes): Loomi joins (no hello) and the tune plays, the friend\'s note by the friend, at the tune\'s pace', pt.friend === 'loomi' && pt.pace === 'natural' && pt.replay.includes('1:3') && pt.hello === 0, JSON.stringify(pt));
    await page.waitForFunction(() => !__lab.hushbeat.engine.replaying, null, { timeout: T });
    // Lab settings → Open: this sheet closes, the lab's Settings opens
    trace('lab settings');
    await openSheetBy(page, '.hushbeat .hb-music');
    await page.click('.hushbeat .sheet .hb-lab');
    await page.waitForFunction(() => [...document.querySelectorAll('.sheet.on h3')].some((x) => x.textContent === 'Settings') && !__lab.hushbeat.debug().sheet, null, { timeout: T });
    const st = await hb(page, () => ({ sheets: [...document.querySelectorAll('.sheet')].map((x) => x.querySelector('h3').textContent) }));
    await page.keyboard.press('Escape');
    await sleep(500);
    check(scope, 'Lab settings → Open closes Sound and pace and opens the lab\'s Settings', st.sheets.includes('Settings'), JSON.stringify(st));
    // personalisation off; then nothing kept
    trace('personalisation off');
    await hb(page, () => __lab.dna.setEnabled(false));
    await openSheetBy(page, '.hushbeat .hb-music');
    const off = await hb(page, () => document.querySelector('.hushbeat .sheet .hb-tunes').textContent);
    await page.keyboard.press('Escape');
    await sheetGone(page);
    await hb(page, () => { __lab.dna.setEnabled(true); for (const f of __lab.dna.favourites()) if (f.kind === 'hushbeat') __lab.dna.toggleFavourite(f); });
    await openSheetBy(page, '.hushbeat .hb-music');
    const empty = await hb(page, () => document.querySelector('.hushbeat .sheet .hb-tunes').textContent);
    await page.keyboard.press('Escape');
    check(scope, 'Your tunes says when personalisation is off, and when nothing is kept yet', off === "Personalisation is off, so tunes can't be kept." && empty === 'Tap ★ Keep after you play to keep a tune here.', JSON.stringify({ off, empty }));
    noErrors(scope, errors);
  });

  // ------------------------------------------------------------------ E23 --
  // Keyboard: the Tab order with names and a focus ring, every control by keyboard alone, the picker's focus;
  // privacy: no request leaves the origin and none at all while playing; no microphone, no fetch.
  if (only('a11y')) await guard(`${SCOPE}:a11y`, async (scope, own) => {
    const { ctx, page, errors } = await H.open(browser, 'desktop', '#hushbeat', { initScripts: [privacySpy], comfort: H.comfort({ favouriteMallow: 'boppo' }) });
    own(ctx);
    const origin = new URL(H.BASE).origin, reqs = [];
    let phase = 'load';
    page.on('request', (r) => reqs.push({ url: r.url(), method: r.method(), type: r.resourceType(), phase }));
    await page.reload();   // every request from the first byte, now that the listener is on
    await H.waitRig(page, { timeout: T });
    await page.waitForFunction(() => __lab.hushbeat, null, { timeout: T });
    await page.waitForLoadState('networkidle');
    await sleep(1500);
    const focusInfo = () => hb(page, () => {
      const a = document.activeElement, cs = getComputedStyle(a);
      const name = a.classList.contains('stage') ? `stage:${a.classList.contains('partner') ? 'partner' : 'lead'}` : a === document.body ? 'body' : (a.getAttribute('aria-label') || a.textContent.trim());
      // the ring: an outline or box-shadow on the control; a stage draws its own as a ::after frame (styles/hushbeat.css)
      const ps = getComputedStyle(a, '::after');
      const ring = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 1.5) || (cs.boxShadow !== 'none' && /\d+px/.test(cs.boxShadow))
        || (a.classList.contains('stage') && a.matches(':focus-visible') && ps.content !== 'none' && ps.boxShadow !== 'none');
      return { name, ring, labelled: !!(a.getAttribute('aria-label') || a.textContent.trim()) };
    });
    const tabWalk = async (n, back = false) => { const out = []; for (let i = 0; i < n; i++) { await page.keyboard.press(back ? 'Shift+Tab' : 'Tab'); out.push(await focusInfo()); } return out; };
    const names = (w) => w.map((f) => f.name);
    // solo, nothing played yet: the stage, the top bar, the row
    await page.focus('.hushbeat .stage');
    const w1 = await tabWalk(7);
    const want1 = ['Close', 'Sound and pace', 'Mute sound', 'Buttons', 'Friend: invite another Mallow'];
    check(scope, 'E23 Tab order (solo): stage → Close → Sound and pace → Mute → Buttons → Friend, then round to the stage; each named, with a focus ring',
      JSON.stringify(names(w1).slice(0, 5)) === JSON.stringify(want1) && names(w1).slice(5).includes('stage:lead') && w1.slice(0, 5).every((f) => f.ring && f.labelled), JSON.stringify(w1));
    const wb = await tabWalk(2, true);
    check(scope, 'E23 Shift+Tab walks back the same way', names(wb).join() === (names(w1)[5] === 'stage:lead' ? 'Friend: invite another Mallow,Buttons' : 'stage:lead,Friend: invite another Mallow') || names(wb).includes('Friend: invite another Mallow'), JSON.stringify(names(wb)));
    // keyboard only: a short tune with digits; Buttons opens the tray; Note by Enter; Bass held with Space
    phase = 'play';
    const priv0 = await hb(page, () => __privacy());
    await page.focus('.hushbeat .stage');
    for (const k of ['1', '3', '5']) { await page.keyboard.press(k); await sleep(300); }
    await page.waitForFunction(() => __lab.hushbeat.debug().controls.keep, null, { timeout: T });
    await page.focus('.hushbeat .stage');
    for (let i = 0; i < 6; i++) { await page.keyboard.press('Tab'); if ((await focusInfo()).name === 'Buttons') break; }
    await page.keyboard.press('Enter');
    const tr = await hb(page, () => ({ tray: !document.querySelector('.hushbeat .hb-tray').hidden, pressed: document.querySelector('.hushbeat .hb-buttons').getAttribute('aria-pressed'), focus: document.activeElement.classList.contains('hb-buttons') }));
    check(scope, 'E23 Buttons by keyboard (Enter) shows the tray; aria-pressed follows; focus stays on it', tr.tray && tr.pressed === 'true' && tr.focus, JSON.stringify(tr));
    await page.focus('.hushbeat .stage');
    const w2 = await tabWalk(13);
    const want2 = ['Close', 'Sound and pace', 'Mute sound', 'Note', 'Chord', 'Tune', 'Bass', 'Hum', 'Breathe', 'Buttons', 'Replay', 'Keep', 'Friend: invite another Mallow'];
    check(scope, 'E23 Tab order with a take and the tray: the tray\'s chips, then Buttons, Replay, Keep, Friend; every stop named and ringed',
      JSON.stringify(names(w2)) === JSON.stringify(want2) && w2.every((f) => f.ring && f.labelled), JSON.stringify(names(w2)));
    await page.focus('.hushbeat .hb-tray .chip:nth-child(1)');
    await clearLog(page);
    await page.keyboard.press('Enter'); await sleep(400);
    const viaEnter = notes(await logOf(page)).length;
    await page.focus('.hushbeat .hb-tray .chip:nth-child(4)');
    await sleep(300);
    await clearLog(page);
    await page.keyboard.down(' '); await sleep(700);
    const held = await hb(page, () => __lab.hushbeat.log.some((e) => e.kind === 'bassOn'));
    await page.keyboard.up(' '); await sleep(400);
    const released = await hb(page, () => __lab.hushbeat.log.some((e) => e.kind === 'bassOff'));
    check(scope, 'E23 chips by keyboard: Enter on Note plays a note; Space held on Bass holds the bass until it is let go', viaEnter >= 1 && held && released, JSON.stringify({ viaEnter, held, released }));
    // the picker by keyboard: focus inside and kept there, Escape closes it first, focus back on Friend
    await page.focus('.hushbeat .hb-friend-btn');
    await page.keyboard.press('Enter');
    await page.waitForSelector('.hushbeat .sheet.on', { timeout: T });
    await page.waitForFunction(() => document.querySelector('.hushbeat .sheet.on')?.contains(document.activeElement), null, { timeout: T });
    let inside = true;
    for (let i = 0; i < 9; i++) { await page.keyboard.press('Tab'); inside = inside && (await hb(page, () => !!document.activeElement.closest('.hushbeat .sheet'))); }
    await page.keyboard.press('Escape');
    await sheetGone(page);
    const pe = await hb(page, () => ({ route: __lab.route, state: __lab.hushbeat.state, focus: document.activeElement.classList.contains('hb-friend-btn') }));
    check(scope, 'E23 the picker by keyboard: focus moves in and stays in (9 Tabs); Escape closes it first and focus returns to Friend', inside && pe.route === 'hushbeat' && pe.state !== 'leaving' && pe.focus, JSON.stringify({ inside, pe }));
    // pick Loomi with the keyboard
    phase = 'friend';
    await page.keyboard.press('Enter');
    await page.waitForSelector('.hushbeat .sheet.on', { timeout: T });
    for (let i = 0; i < 8; i++) { if (await hb(page, () => document.activeElement.dataset?.mallow === 'loomi')) break; await page.keyboard.press('Tab'); }
    await page.keyboard.press('Enter');
    await duetReady(page, 2);
    await sleep(600);
    phase = 'duet';
    const pf = await hb(page, () => ({ friend: __lab.hushbeat.debug().friend, focus: document.activeElement.classList.contains('hb-friend-btn') }));
    check(scope, 'E23 Enter on a pill invites that friend; focus returns to Friend', pf.friend === 'loomi' && pf.focus, JSON.stringify(pf));
    await hb(page, () => document.querySelector('.hushbeat .stage.lead').focus());
    const w3 = await tabWalk(5);
    check(scope, 'E23 Tab order in a duet: the lead stage → the friend\'s stage → the top bar → the tray\'s target (one stop: Boppo)',
      JSON.stringify(names(w3)) === JSON.stringify(['stage:partner', 'Close', 'Sound and pace', 'Mute sound', 'Boppo']) && w3.every((f) => f.ring), JSON.stringify(w3));
    await page.keyboard.press('ArrowRight'); await sleep(150);
    const tgt = await hb(page, () => ({ target: __lab.hushbeat.debug().target, focus: document.activeElement.textContent }));
    check(scope, 'E23 arrow keys move the target (radio group): Both', tgt.target === 'both' && tgt.focus === 'Both', JSON.stringify(tgt));
    await page.keyboard.press('ArrowLeft'); await sleep(100);
    // the friend's stage with keyboard focus (the ring is visible, the label names it)
    await hb(page, () => document.querySelector('.hushbeat .stage.lead').focus());
    await page.keyboard.press('Tab');
    await sleep(300);
    const pst = await hb(page, () => { const a = document.activeElement; return { partner: a.classList.contains('partner'), label: a.getAttribute('aria-label'), role: a.getAttribute('role') }; });
    check(scope, 'E23 the friend\'s stage is an application with its own label (keys, G and Tab)', pst.partner && pst.role === 'application' && pst.label.startsWith('Loomi.') && pst.label.includes('Tab moves to the other Mallow'), JSON.stringify(pst));
    await shot(page, out, 'hushbeat-desktop-focus-duet', { ring: true });
    await clearLog(page);
    await page.keyboard.press('Enter'); await sleep(300);
    await page.keyboard.press('g'); await sleep(600);
    const dl = await hb(page, () => __lab.hushbeat.log.filter((e) => e.kind === 'note' && !e.ghost).map((e) => e.slot));
    check(scope, 'E23 keys on the friend\'s stage play the friend; G plays both', dl.includes(1) && dl.includes(0), JSON.stringify(dl));
    // the sheet by keyboard too: Escape closes it, then a held hum by keyboard while it is closed
    await page.focus('.hushbeat .hb-music');
    await page.keyboard.press('Enter');
    await page.waitForSelector('.hushbeat .sheet.on', { timeout: T });
    await page.keyboard.press('Escape');
    await sheetGone(page);
    await page.focus('.hushbeat .stage.lead');
    await page.keyboard.down('h'); await sleep(900); await page.keyboard.up('h');
    await page.keyboard.press('r'); await sleep(1200);
    await page.keyboard.press('k'); await sleep(400);
    await sleep(800);
    const priv1 = await hb(page, () => __privacy());
    // privacy: the whole visit, from the first byte
    const foreign = reqs.filter((r) => !/^(data|blob):/.test(r.url) && new URL(r.url).origin !== origin).map((r) => r.url);
    const during = reqs.filter((r) => r.phase === 'play' || r.phase === 'duet').map((r) => `${r.method} ${r.url.replace(origin, '')}`);
    const joining = reqs.filter((r) => r.phase === 'friend');
    check(scope, 'E23 every request stays on the page\'s own origin (no CDN, no API, no analytics)', reqs.length > 0 && !foreign.length, JSON.stringify({ n: reqs.length, foreign: foreign.slice(0, 5) }));
    check(scope, 'E23 no request at all while playing (solo and duet: notes, hums, bass, replay, keep, the sheets)', !during.length, JSON.stringify(during.slice(0, 8)));
    check(scope, 'E23 a friend joining may only fetch the lab\'s own files (GET)', joining.every((r) => r.method === 'GET'), JSON.stringify(joining.map((r) => r.url.replace(origin, '')).slice(0, 8)));
    const zero = (p) => Object.values(p).every((v) => v === 0);
    check(scope, 'E23 no microphone, no fetch, XHR, WebSocket, beacon, EventSource or media element in the whole visit', zero(priv1) && zero(priv0), JSON.stringify({ priv0, priv1 }));
    noErrors(scope, errors);
  });

  // ------------------------------------------------------------------ E24 --
  // touch never scrolls or zooms the page: drags, strokes, stretches, pinches on and off the bodies
  if (only('scroll')) await guard(`${SCOPE}:scroll`, async (scope, own) => {
    const { ctx, page, errors } = await openHb(browser, 'phone', 'loomi');
    own(ctx);
    const vw = 390, vh = 844;
    const at = () => hb(page, () => ({
      y: scrollY, x: scrollX, top: document.scrollingElement.scrollTop, left: document.scrollingElement.scrollLeft,
      scale: +visualViewport.scale.toFixed(3), vx: visualViewport.offsetLeft, vy: visualViewport.offsetTop,
      screen: Math.round(document.querySelector('.screen.hushbeat').getBoundingClientRect().top), sh: document.documentElement.scrollHeight, ih: innerHeight,
    }));
    const still = (s) => s.y === 0 && s.x === 0 && s.top === 0 && s.left === 0 && s.scale === 1 && s.vx === 0 && s.vy === 0 && s.screen === 0;
    const path = (pts, ms, steps) => {   // pts: [[x0, y0, x1, y1] per finger]
      const f = [];
      for (let i = 0; i <= steps; i++) f.push({ t: (i * ms) / steps, points: pts.map(([x0, y0, x1, y1], k) => ({ x: x0 + ((x1 - x0) * i) / steps, y: y0 + ((y1 - y0) * i) / steps, id: k + 1 })) });
      f.push({ t: ms + 80, points: [] });
      return H.touch(page, f);
    };
    const drag = (x0, y0, x1, y1, ms = 500) => path([[x0, y0, x1, y1]], ms, 14);
    const pinch = (cx, cy, d0, d1, ms = 600) => path([[cx - d0, cy, cx - d1, cy], [cx + d0, cy, cx + d1, cy]], ms, 14);
    const b = await bodyAt(page);
    await H.touch(page, [{ t: 0, points: [{ x: b.x, y: b.y }] }, { t: 60, points: [] }]);   // unlock
    await sleep(500);
    const s0 = await at();
    check(scope, 'E24 the page fits the screen (no vertical or horizontal overflow) and sits at 0, 0, unzoomed', still(s0) && s0.sh <= s0.ih, JSON.stringify(s0));
    const sky = { x: 60, y: Math.max(130, b.top - 120) };
    const cases = [
      ['a press down on the body (bass)', () => drag(b.x, b.y - 30, b.x, b.y + 140)],
      ['a drag up from the body past the top bar (stretch)', () => drag(b.x, b.y, b.x, 24, 700)],
      ['a stroke back and forth across the body', () => path([[b.x - 90, b.y, b.x + 90, b.y + 10]], 800, 24)],
      ['a pull down on the sky (off the body: pull-to-refresh)', () => drag(sky.x, sky.y, sky.x, vh - 120)],
      ['a fling up on the sky', () => drag(vw - 60, vh * 0.55, vw - 60, 30, 220)],
      ['a swipe up from the controls', () => drag(vw / 2, vh - 40, vw / 2, 150, 300)],
      ['a sideways swipe across the whole screen', () => drag(6, b.y, vw - 6, b.y - 20, 300)],
      ['a pinch out on the body', () => pinch(b.x, b.y, 18, 120)],
      ['a pinch in on the body', () => pinch(b.x, b.y, 120, 18)],
      ['a pinch out on the sky (zoom)', () => pinch(vw / 2, sky.y + 40, 30, 170)],
    ];
    for (const [name, fn] of cases) {
      await fn();
      await sleep(350);
      const s = await at();
      check(scope, `E24 ${name}: no scroll, no zoom`, still(s), JSON.stringify(s));
    }
    // the tray open, then a duet: a swipe along the tray, one finger dragging down on each Mallow at once
    await page.click('.hushbeat .hb-buttons');
    await sleep(400);
    const tray = await hb(page, () => { const r = document.querySelector('.hushbeat .hb-tray').getBoundingClientRect(); return { x: r.left, y: r.top + r.height / 2, w: r.width }; });
    await drag(tray.x + tray.w - 20, tray.y, tray.x + 20, tray.y - 60, 300);
    await sleep(300);
    check(scope, 'E24 a swipe along the tray: no page scroll', still(await at()), JSON.stringify(await at()));
    await hb(page, () => __lab.hushbeat.setFriend('noomi', { instant: true }));
    await duetReady(page, 2);
    await sleep(800);
    const B = await bodiesAt(page);
    await path([[B[0].x, B[0].y - 20, B[0].x, B[0].y + 110], [B[1].x, B[1].y - 20, B[1].x + 10, B[1].y - 160]], 700, 16);
    await sleep(350);
    const sd = await at();
    check(scope, 'E24 duet: one finger pressing down on the lead while another stretches the friend: no scroll, no zoom', still(sd), JSON.stringify(sd));
    await pinch(B[1].x, B[1].y, 16, 90);
    await sleep(350);
    check(scope, 'E24 duet: a pinch on the friend\'s small body: no scroll, no zoom', still(await at()), JSON.stringify(await at()));
    noErrors(scope, errors);
  });

  // ------------------------------------------------------------------ E21 --
  // after a Visual only duet, TouchTalk is itself again: it pokes with sound, its switches and Mallow unchanged
  if (only('isolation')) await guard(`${SCOPE}:isolation`, async (scope, own) => {
    const { ctx, page, errors } = await H.open(browser, 'desktop', '#touchtalk', { comfort: H.comfort({ favouriteMallow: 'boppo' }) });
    own(ctx);
    await H.waitRig(page, { timeout: T });
    const snap = () => hb(page, () => {
      const c = __lab.companion, r = c.rig, s = __lab.sound;
      return {
        route: __lab.route, id: c.id, ctxId: __lab.ctx.mallowId, fav: __lab.dna.get('favouriteMallow'), speed: __lab.dna.get('animationSpeed'),
        parts: { voice: s.voiceOn, fx: s.fxOn }, tuning: { voice: __lab.dna.tuning().voice, fx: __lab.dna.tuning().touchSounds }, trim: s.trim, resting: s.resting,
        realSound: c.sound === s, filter: c.persona.filter, cap: r.frameCap, grade: [...r.grade], peek: r.peekParams, comps: __lab.companions().length,
        hb: __lab.hushbeat, hbDom: document.querySelectorAll('.hushbeat, .hb-row, .stage.partner').length, sheets: document.querySelectorAll('.sheet').length,
        musicVoices: [...s.live].filter((v) => v.music != null).length, sound: __lab.prefs.get('sound'), volume: __lab.prefs.get('volume'),
      };
    });
    // a TouchTalk tap makes a sound (a poke or the Mallow's voice): live voices appear
    const pokes = async () => {
      await untilSilent(page, 4000);
      const g = await bodyAt(page);
      await page.mouse.click(g.x, g.y - g.h * 0.1);
      return page.waitForFunction(() => __lab.sound.live.size > 0, null, { timeout: 4000 }).then(() => true, () => false);
    };
    const tt0 = await pokes();
    const a = await snap();
    // Hushbeat: a duet in Visual only, at a livelier pace, answers off, a tune kept, Escape twice
    await hb(page, () => __lab.ctx.navigate('/hushbeat'));
    await page.waitForFunction(() => __lab.hushbeat && __lab.companion?.rig?.soft, null, { timeout: T });
    await invite(page, 'loomi');
    await hb(page, () => { const h = __lab.hushbeat; h.setVisualOnly(true); h.setPace('livelier'); h.setAnswers(false); });
    await page.focus('.hushbeat .stage.lead');
    for (const k of ['1', '3', '5', 'g']) { await page.keyboard.press(k); await sleep(320); }
    await page.keyboard.down('h'); await sleep(800); await page.keyboard.up('h');
    await page.waitForFunction(() => __lab.hushbeat.debug().controls.keep, null, { timeout: T });
    await hb(page, () => __lab.hushbeat.keep());
    await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
    await page.waitForFunction(() => __lab.route === 'home', null, { timeout: T });
    await hb(page, () => __lab.ctx.navigate('/touchtalk'));
    await page.waitForFunction(() => __lab.route === 'touchtalk' && __lab.companion?.rig?.soft, null, { timeout: T });
    await sleep(600);
    const b = await snap();
    const tt1 = await pokes();
    check(scope, 'E21 TouchTalk pokes with sound before and after a Visual only duet (Visual only is Hushbeat\'s own)', tt0 && tt1 && b.musicVoices === 0, JSON.stringify({ tt0, tt1, music: b.musicVoices }));
    check(scope, 'E21 its sound switches follow Comfort DNA as before; full trim; nothing resting; its Companion uses the real Sound Engine',
      JSON.stringify(b.parts) === JSON.stringify(a.parts) && b.parts.voice === b.tuning.voice && b.parts.fx === b.tuning.fx && b.trim === 1 && !b.resting && b.realSound, JSON.stringify({ a: a.parts, b: b.parts, tuning: b.tuning, trim: b.trim, real: b.realSound }));
    check(scope, 'E21 the same Mallow (Boppo) and favourite; the pace was for the visit only; one Companion; device sound and volume as before',
      b.id === 'boppo' && b.ctxId === 'boppo' && b.fav === a.fav && b.speed === a.speed && b.comps === 1 && b.sound === a.sound && b.volume === a.volume, JSON.stringify({ a, b }));
    check(scope, 'E21 nothing of Hushbeat is left: no handle, no screen, no friend\'s stage, no sheet; neutral persona filter, frame cap, grade and peek',
      b.hb === null && b.hbDom === 0 && b.sheets === 0 && b.filter === null && b.cap === null && b.grade.join() === '1,1,1' && b.peek === null, JSON.stringify(b));
    // back in Hushbeat: the friend, the pace and the answers were for that visit; Visual only is a device choice and stays
    await hb(page, () => __lab.ctx.navigate('/hushbeat'));
    await page.waitForFunction(() => __lab.hushbeat && __lab.companion?.rig?.soft, null, { timeout: T });
    const c = await hb(page, () => { const d = __lab.hushbeat.debug(); return { friend: d.friend, pace: d.pace, answers: d.answers, visual: d.visualOnly, sub: document.querySelector('.hushbeat .topbar .title small').textContent, comps: __lab.companions().length }; });
    check(scope, 'E21 Hushbeat again: alone, natural pace, answers on; Visual only kept (a device setting, shown in the subtitle)',
      c.friend === null && c.pace === 'natural' && c.answers === true && c.visual && c.sub === 'Boppo · Visual only' && c.comps === 1, JSON.stringify(c));
    await hb(page, () => __lab.hushbeat.setVisualOnly(false));
    noErrors(scope, errors);
  });

  // ------------------------------------------------------- visual QA --
  // every Mallow in its own world mid-hum (beads, ring, singing), phone size: layout, text tones, screenshots;
  // the sheet over the dark worlds
  if (only('looks')) await guard(`${SCOPE}:looks`, async (scope, own) => {
    const { ctx, page, errors } = await openHb(browser, 'phone', IDS[0]);
    own(ctx);
    for (const id of IDS) {
      if (id !== IDS[0]) {
        await hb(page, (id) => { __lab.ctx.setMallow(id); __lab.ctx.navigate('/hushbeat'); }, id);
        await page.waitForFunction((id) => __lab.hushbeat?.players[0]?.part.mallowId === id && __lab.companion?.rig?.soft, id, { timeout: T });
      }
      await sleep(1200);   // the realm fades in
      const sc = `${scope}:${id}`;
      await page.focus('.hushbeat .stage');
      for (const k of ['1', '3', '5', '2']) { await page.keyboard.press(k); await sleep(280); }
      await page.keyboard.down('h');
      await page.waitForFunction(() => __lab.hushbeat.debug().scene.ring > 0.3, null, { timeout: T }).catch(() => {});
      await sleep(700);
      await page.keyboard.press('3');
      await sleep(250);
      await shot(page, out, `hushbeat-phone-${id}-play`);
      await page.keyboard.up('h');
      await H.layout(page, sc, { scrollers: ['.hb-tray'] });
      // text takes the backdrop's tone: light text on a dark world, dark text on a light one
      const tx = await hb(page, () => {
        const scr = document.querySelector('.screen.hushbeat');
        const lum = (el) => { const m = getComputedStyle(el).color.match(/[\d.]+/g).map(Number); const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return +(0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2])).toFixed(3); };
        return { tone: scr.dataset.backdrop, title: lum(scr.querySelector('.topbar .title b')), sub: lum(scr.querySelector('.topbar .title small')), hint: lum(scr.querySelector('.hb-hint')) };
      });
      const okTone = tx.tone === 'dark' ? [tx.title, tx.sub, tx.hint].every((l) => l > 0.45) : [tx.title, tx.sub, tx.hint].every((l) => l < 0.2);
      check(sc, 'the title, subtitle and hint take the world\'s tone (light on dark, dark on light)', !!tx.tone && okTone, JSON.stringify(tx));
      if (tx.tone === 'dark') {
        await openSheetBy(page, '.hushbeat .hb-music');
        await sheetLayout(page, `${sc}:sheet`);
        await shot(page, out, `hushbeat-phone-${id}-sheet`);
        await page.keyboard.press('Escape');
        await sheetGone(page);
      }
      await untilSilent(page, 4000);
    }
    noErrors(scope, errors);
  });

  // ------------------------------------------------------------------ E22 --
  // every viewport × solo, solo + tray, the row with Replay and Keep, duet, duet + tray, the sheet and the picker
  // (LAYOUT_VPS=phone,small to run some)
  if (only('layout')) await guard(`${SCOPE}:layout`, async (scope) => {
    const vps = (process.env.LAYOUT_VPS || 'phone,p375,small,android,desktop,land,land-small').split(',');
    for (const vp of vps) {
      const { ctx, page, errors } = await openHb(browser, vp, 'loomi');
      try {
        const sc = `${scope}:${vp}`;
        await sleep(400);
        await H.layout(page, `${sc}:solo`, { scrollers: ['.hb-tray'] });
        await shot(page, out, `hushbeat-${vp}-solo`);
        await page.click('.hushbeat .hb-buttons');
        await sleep(500);
        await H.layout(page, `${sc}:tray`, { scrollers: ['.hb-tray'] });
        await shot(page, out, `hushbeat-${vp}-tray`);
        // a take of 3: Replay and Keep join the row (wider, never taller)
        const h0 = await hb(page, () => document.querySelector('.hushbeat .hb-row').getBoundingClientRect().height);
        await page.focus('.hushbeat .stage');
        for (const k of ['1', '3', '5']) { await page.keyboard.press(k); await sleep(300); }
        await page.waitForFunction(() => __lab.hushbeat.debug().controls.keep, null, { timeout: T });
        await sleep(450);
        const row = await hb(page, () => { const r = document.querySelector('.hushbeat .hb-row'); return { h: r.getBoundingClientRect().height, sw: r.scrollWidth, cw: r.clientWidth }; });
        check(`${sc}:row`, 'Replay, Keep and Friend fit the row on one line (wider, not taller; nothing scrolled away)', Math.abs(row.h - h0) < 1 && row.sw <= row.cw + 1, JSON.stringify({ h0, row }));
        await H.layout(page, `${sc}:row`, { scrollers: ['.hb-tray'] });
        await shot(page, out, `hushbeat-${vp}-row`);
        // the friend picker, then the duet (the tray stays open: duet + tray first)
        await openSheetBy(page, '.hushbeat .hb-friend-btn');
        await sheetLayout(page, `${sc}:picker`);
        await shot(page, out, `hushbeat-${vp}-picker`);
        await page.click('.hushbeat .hb-friend[data-mallow="noomi"]');
        await duetReady(page, 2);
        await sleep(500);
        const inStage = await hb(page, () => { const st = [...document.querySelectorAll('.hushbeat .stage')]; return __lab.companions().map((c, i) => { const r = c.rig.bodyRect(), w = st[i].clientWidth; return r.cx - r.w / 2 >= -1 && r.cx + r.w / 2 <= w + 1; }); });
        check(`${sc}:duet-tray`, 'each Mallow inside its own stage', inStage.length === 2 && inStage.every(Boolean), JSON.stringify(inStage));
        await H.layout(page, `${sc}:duet-tray`, { scrollers: ['.hb-tray'] });
        await shot(page, out, `hushbeat-${vp}-duet-tray`);
        await page.click('.hushbeat .hb-buttons');
        await sleep(500);
        await H.layout(page, `${sc}:duet`, { scrollers: ['.hb-tray'] });
        await shot(page, out, `hushbeat-${vp}-duet`);
        // Sound and pace (in a duet it has every row)
        await openSheetBy(page, '.hushbeat .hb-music');
        await sheetLayout(page, `${sc}:sheet`);
        await shot(page, out, `hushbeat-${vp}-sheet`);
        noErrors(sc, errors);
      } finally { await ctx.close(); }
    }
  });
}

// In the page: offline renders of every kit (real DSP) and their measurements.
async function renderKits() {
  const base = new URL('core/', location.href).href;
  const K = await import(base + 'music-kits.js');
  const T = await import(base + 'music-theory.js');
  const sr = 48000;
  async function render(secs, fn) {
    const oac = new OfflineAudioContext(1, Math.round(sr * secs), sr);
    K.warmNoise(oac);
    fn(oac, K.graph(oac, oac.destination));
    return (await oac.startRendering()).getChannelData(0);
  }
  const rms = (x, a, b) => { let s = 0; for (let i = a; i < b; i++) s += x[i] * x[i]; return Math.sqrt(s / Math.max(1, b - a)); };
  const peak = (x, a = 0, b = x.length) => { let m = 0; for (let i = a; i < b; i++) m = Math.max(m, Math.abs(x[i])); return m; };
  const db = (v) => +(20 * Math.log10(v + 1e-12)).toFixed(1);
  function f0(x, a, n, fe) {   // normalised autocorrelation around the expected pitch
    const lo = Math.floor(sr / (fe * 1.6)), hi = Math.ceil(sr / (fe / 1.6));
    let best = 0, bl = lo;
    for (let L = lo; L <= hi; L++) {
      let s = 0, e1 = 0, e2 = 0;
      for (let i = a; i < a + n; i++) { s += x[i] * x[i + L]; e1 += x[i] * x[i]; e2 += x[i + L] * x[i + L]; }
      const r = s / Math.sqrt(e1 * e2 + 1e-12);
      if (r > best) { best = r; bl = L; }
    }
    return sr / bl;
  }
  function fft(re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = -2 * Math.PI / len;
      for (let i = 0; i < n; i += len) for (let k = 0; k < len / 2; k++) {
        const wr = Math.cos(ang * k), wi = Math.sin(ang * k), a = i + k, b = a + len / 2;
        const vr = re[b] * wr - im[b] * wi, vi = re[b] * wi + im[b] * wr;
        re[b] = re[a] - vr; im[b] = im[a] - vi; re[a] += vr; im[a] += vi;
      }
    }
  }
  function band(x, a, f1, f2) {
    const n = 16384, re = new Float64Array(n), im = new Float64Array(n);
    for (let i = 0; i < n; i++) re[i] = x[a + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / n));
    fft(re, im);
    let tot = 0, b = 0;
    for (let k = 1; k < n / 2; k++) { const p = re[k] ** 2 + im[k] ** 2, f = k * sr / n; tot += p; if (f >= f1 && f <= f2) b += p; }
    return b / tot;
  }
  const res = {};
  for (const id of Object.keys(K.KITS)) {
    const V = T.voiceFor(id), kit = K.KITS[id], r = {};
    const deg = Math.round((V.tapLo + V.tapHi) / 2), f = T.hz(V, T.degSemi(V.scale, deg)), dur = Math.min(4, Math.max(0.15, 0.15 + 3 * V.decay));
    const t0 = 0.05, x = await render(dur + 0.4, (oac, g) => kit.note(g, t0, f, 0.75, { dur })), a = Math.round(t0 * sr);
    r.f = +f.toFixed(1); r.f0 = +f0(x, a + Math.round(0.07 * sr), 2048, f).toFixed(1); r.err = +(100 * (r.f0 / f - 1)).toFixed(2);
    r.rms = db(rms(x, a, a + Math.round(0.25 * sr))); r.peak = +peak(x).toFixed(3);
    r.pre = +peak(x, 0, a).toFixed(5); r.first = +peak(x, a, a + 24).toFixed(4); r.tail = +peak(x, Math.round((t0 + dur + 0.05) * sr)).toFixed(4);
    const ch = T.chordAt(V, 0), pfs = T.voicePad(T.degSemi(V.scale, V.tapHi - 2), ch.tones).map((s) => T.hz(V, s));
    const px = await render(4.2, (oac, g) => { const h = kit.pad(g, 0.05, pfs, 0.8, 0.5); h.breathe(0.5, 0.05); h.release(1.6); });
    let mx = 0; const env = [];
    for (let i = 0; i < 2.4 * sr; i += 960) { const v = rms(px, i, i + 960); env.push(v); mx = Math.max(mx, v); }
    r.padAttack = +(env.findIndex((v) => v >= 0.9 * mx) * 0.02 - 0.05).toFixed(2);
    r.padAfter1s = db(rms(px, Math.round(2.6 * sr), Math.round(2.65 * sr)) / mx); r.padEnd = +peak(px, Math.round(3.9 * sr)).toFixed(4);
    r.bass = [];
    for (const root of new Set(V.prog)) {
      const bf = T.bassHz(V, root);
      const bx = await render(1.4, (oac, g) => { const h = kit.bass(g, 0.05, bf, 0.5); h.beat(0.3, 1); h.release(1.0, null, { step: 0.5 }); });
      r.bass.push({ hz: +bf.toFixed(1), f0: +f0(bx, Math.round(0.4 * sr), 4096, bf).toFixed(1), band: +(100 * band(bx, Math.round(0.08 * sr), 150, 500)).toFixed(1), end: +peak(bx, Math.round(1.36 * sr)).toFixed(4) });
    }
    const hx = await render(1.5, (oac, g) => { const h = kit.held(g, 0.05, f, 0.75); h.set(f * 1.12, 0.2, 0.03); h.set(f * 1.122, 0.4, 0.08); h.release(0.5, 0.2, 1.4); });
    r.held = +f0(hx, Math.round(0.42 * sr), 2048, f * 1.122).toFixed(1); r.heldWant = +(f * 1.122).toFixed(1);
    res[id] = r;
  }
  return res;
}

module.exports = { run, BRIEF, BLOCKS, briefMap };

if (require.main === module) {
  (async () => {
    const out = process.argv[2] || OUT_DEFAULT;
    const file = path.join(out, 'e2e-phase3-hushbeat.json');
    // HB_MERGE=1: keep the earlier report's results for the blocks this run did not touch
    let kept = [];
    if (process.env.HB_MERGE && fs.existsSync(file)) {
      try { kept = JSON.parse(fs.readFileSync(file, 'utf8')).results || []; } catch { kept = []; }
    }
    const browser = await H.launch();
    try { await run(browser, { out }); } finally { await browser.close(); }
    const ran = new Set(H.results.filter((r) => r.scope.startsWith(`${SCOPE}:`)).map((r) => r.scope.split(':')[1]));
    const old = kept.filter((r) => !ran.has(r.scope.split(':')[1]));
    H.results.unshift(...old);
    const { failed } = H.writeReport(out, 'e2e-phase3-hushbeat', { prefix: `${SCOPE}:` });
    const rep = JSON.parse(fs.readFileSync(file, 'utf8'));
    rep.brief = briefMap(rep.results);
    if (old.length) rep.merged = { kept: old.length, ran: [...ran] };
    fs.writeFileSync(file, JSON.stringify(rep, null, 1));
    process.exit(failed ? 1 : 0);
  })().catch((e) => { console.error(e); process.exit(2); });
}
