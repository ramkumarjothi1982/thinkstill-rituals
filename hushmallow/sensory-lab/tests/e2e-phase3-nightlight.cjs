// Mallow Nightlight browser tests (spec-nightlight.md §13; the L21 harness).
//
//   python3 -m http.server 8000          # from the repository root
//   node hushmallow/sensory-lab/tests/e2e-phase3-nightlight.cjs [outDir]
//   PART=nightlight:open,nightlight:moonlight   (blocks below; default all)
//
// Also runs inside tests/e2e-phase3.cjs through run(browser, { out, only }).
// Simulated input proves state, never smoothness: software GL can run at ~6 fps
// (and the Nightlight caps its own frames at 8–30), so every wait is on state
// with generous limits.
//
// Blocks so far (slice 2):
//   open       E1: from the home card and from #nightlight: rig ready, a painted still, no live realm,
//              rises from black with an opacity transition, a dark world at defaults, the start announcement
//   moonlight  E3: the glow floor, the halo, the touch-lamp swell (lower at +100 ms than at +700 ms),
//              ≤ 1 brightening start per 2 s under rapid taps; Boppo and Pipzi taps never hop or burst
//   sleepy     E5 (part): stretch → settle → 0; a heavy blink; Noomi's sleepy peek; asleep in your hand
//              after a 4.2 s hold; Less turns the stretch into a settle; 30 s of Boppo and Pipzi with
//              no hop, celebrate or idle overlays
//   mallows    E28: seven Mallows each paint their night world, rest at ≥ 0.6, answer a tap only with
//              night overlays, and their night tap tags differ
//   modes      every mode starts (rest, chip, sky mix, cap); keys 1–5 and ↑/↓; Drift's live window on
//              a high-tier context, back to a still on leaving Drift, none with Movement Less
//   exit       Escape and Close: the goodnight, home, nothing left behind, record cleared, trim 1;
//              three visits leak no listeners, timers, rAF, prefs or Comfort DNA listeners, canvases or sprites
//   (layout    slice 2's three viewports; now E23 at all seven, below)
//
// Slice 3:
//   sound      E2: no AudioContext and no bed before a gesture; after a real click the bed builds (≤ 0.035,
//              rising over ≥ 3 s), with Touch sounds off too (SHARED C7). E11: Volume is the trim; 0 lets the
//              bed go and rests the audio. E7: Quiet is silent and rests; its Sound chip brings a pad and takes
//              it away; few renders while idle. Drift's bell rings on a glint
//   fade       E12: the end time in the status row. E13: into the fade (status, chip, falling levels and bed),
//              "A little longer" (+10 min, a rise over ≥ 2 s, announced), deep in the fade (asleep, eyes closed,
//              slower, one sigh, heavier repaints), then a live end: the end view with the sleeping Mallow
//              above the card, nothing running, the audio resting. E30: Again from black, Done home. Fade Off
//   background E16: hidden mid-session (veiled, frozen, suspended), back after 5 min (same deadline, levels from
//              the clock under the veil, the veil lifts with a transition, the bed rebuilds from silence, the
//              "still here" sign). E17: hidden across the fade start (no late sigh) and across the end (the end
//              view at once, quietly). E18: pagehide / pageshow and CDP freeze / resume. E19: reloads (resume,
//              ended, left, malformed). E20: the audio will not resume → "Tap to bring the sound back"
//   wake       E21: no wake lock by default; opted in: requested, let go when hidden, asked again on return,
//              let go at the end and on exit; unsupported and refused are handled quietly
//   press      E4 (part): an off-body still press leads the breath without the Companion seeing a hold
//
// Slice 4:
//   sheet      the settings sheet: every row and its value, the live preview (input moves the scene, release
//              stores it), E8 brightness 100 → 5 (luminance, the Mallow's floor, the ratio), E9 Light Moon → Ember
//              (b/r, a repaint only on release), E10 Speed (rig speed, breath period × k), E11 Volume (trim),
//              Sound is off + Turn on, Timer / No timer, Fade Off, Movement Still, Keep screen on refused →
//              Off, stored on release; the chrome stays awake; focus is trapped, Escape closes the sheet first
//              and focus returns; Fade out now; Close Nightlight
//   motion     E14: the lab asks for less motion: Gentle disabled (arrows skip it), effective Less, reduced rig
//   access     E24 chrome sleep (faded, Close at 0.35, taps fall through, a tap or Tab wakes, nothing hidden
//              from assistive tech). E25 keyboard: Tab order, keys 1–5, arrows in the mode group, ↑/↓, only the
//              listed announcements. E15: Close works while the chrome sleeps, home within about a second
//   theme      E26: in the light theme the screen, the sheet and the end card keep the night tokens, the dim
//              chip colour and no blur; text on chrome ≥ 4.5:1
//   scroll     E27: drags and swipes never scroll the page; a pinch never zooms
//   privacy    E22: no service worker, no notification, no request after the screen is up, no setInterval
//              from Nightlight files, no voices while hidden
//   isolation  E29: TouchTalk afterwards is untouched (trim, rest, grade, filter, cap, peek, keys, Comfort DNA)
//   layout     E23 (replaces slice 2's three viewports): all seven viewports, steady, asleep (Close visible),
//              the sheet (scrolls, Done reachable, the Mallow beside a side panel), fading and the end view

const path = require('path');
const H = require('./lib/harness.cjs');
const { check, guard, sleep } = H;

const LAB = '/hushmallow/sensory-lab';
const OUT_DEFAULT = path.join(__dirname, '..', 'docs', 'phase3', 'nightlight');
const SCOPE = 'nightlight';
const T = 60000;   // state waits: generous for software GL
const MALLOWS = ['noomi', 'loomi', 'blubi', 'zuzu', 'boppo', 'pipzi', 'glitzi'];
const ALLOWED_OVERLAYS = /^(nl-[a-z-]+|peek|nod|yawn|sigh|release)$/;

const noErrors = (scope, errors) => check(scope, 'no console errors', !errors.length, errors.join(' | '));
const nl = (page, fn, arg) => page.evaluate(fn, arg);

/** Records whether the Nightlight screen was inserted entering from black (before any app code ran). */
function enterProbe() {
  window.__nlEnter = [];
  new MutationObserver((muts) => {
    for (const m of muts) for (const n of m.addedNodes || []) {
      if (n.classList?.contains('nightlight') && !n.classList.contains('nl-end')) window.__nlEnter.push({ t: performance.now(), entering: n.classList.contains('nl-entering') });
    }
  }).observe(document, { childList: true, subtree: true });
}

/** Open #nightlight with a favourite Mallow and wait until the session view has risen. */
async function openNl(browser, vp, mallow, { prefs = {}, initScripts = [], hash = '#nightlight' } = {}) {
  const r = await H.open(browser, vp, hash, { prefs, initScripts, comfort: H.comfort({ favouriteMallow: mallow }) });
  if (hash === '#nightlight') await ready(r.page);
  return r;
}
async function ready(page) {
  await H.waitRig(page, { timeout: T });
  await page.waitForFunction(() => __lab.nightlight?.view === 'session' && __lab.nightlight.state !== 'booting' && !document.querySelector('.nightlight.nl-entering'), null, { timeout: T });
}
/** Wake the chrome (asleep after 8 s without input, its controls let taps fall through), as a person's first touch would. */
async function wakeUi(page) {
  await page.keyboard.press('Shift');
  await page.waitForFunction(() => !document.querySelector('.nightlight.nl-asleep'), null, { timeout: 5000 });
}
/** Page px of the Mallow's middle. */
async function bodyPoint(page) { const g = await H.geo(page); return { x: g.ox + g.cx, y: g.oy + g.mid }; }
/** Poll fn(page) until pred(value) or ms pass; returns the last value. */
async function until(page, fn, pred, ms = 8000, every = 120) {
  const t0 = Date.now();
  let v;
  for (;;) { v = await page.evaluate(fn); if (pred(v) || Date.now() - t0 > ms) return v; await sleep(every); }
}
/** Open the settings sheet with the sliders button (waking the chrome first, as a person's touch would). */
async function openSheet(page) {
  await wakeUi(page);
  await page.click('.nightlight .nl-settings');
  await page.waitForFunction(() => document.querySelector('.nightlight .sheet.on') && __lab.nightlight.sheet, null, { timeout: 10000 });
  await sleep(350);   // the slide (or fade) in
}
/** Move a sheet slider: `input` only (a slide in progress), or `input` then `change` (released). */
function slide(page, sel, value, commit = true) {
  return page.evaluate(([sel, value, commit]) => {
    const el = document.querySelector(sel);
    el.value = String(value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    if (commit) el.dispatchEvent(new Event('change', { bubbles: true }));
  }, [sel, value, commit]);
}
/** Click the choice with this text in a sheet row. */
const pick = (page, row, text) => page.click(`.nightlight .sheet .nl-row-${row} button:text-is("${text}")`);

async function run(browser, { out = OUT_DEFAULT, only = (b) => H.only(SCOPE) || H.only(`${SCOPE}:${b}`) } = {}) {
  // ------------------------------------------------------------------- E1 --
  if (only('open')) await guard(`${SCOPE}:open`, async (scope, own) => {
    const { ctx, page, errors } = await H.open(browser, 'phone', '#home', { initScripts: [enterProbe], comfort: H.comfort({ favouriteMallow: 'noomi' }) });
    own(ctx);
    await H.waitRig(page, { timeout: T });
    await page.click('[data-experience="nightlight"]');
    await ready(page);
    const a = await nl(page, () => {
      const n = __lab.nightlight, scr = document.querySelector('.screen.nightlight');
      return {
        route: __lab.route, view: n.view, stills: document.querySelectorAll('canvas.nl-still').length, shown: [...document.querySelectorAll('canvas.nl-still')].filter((c) => c.style.opacity === '1').length,
        realms: document.querySelectorAll('canvas.hushfold-realm').length, sky: document.querySelectorAll('canvas.nl-sky').length,
        enter: window.__nlEnter.slice(), dur: getComputedStyle(scr).transitionDuration, prop: getComputedStyle(scr).transitionProperty,
        lum: n.world.sample()?.lum ?? null, realm: n.world.realmId, plain: n.world.plain, backdrop: scr.dataset.backdrop, sr: n.debug().sr,
      };
    });
    check(scope, 'from the home card: the session view with the rig ready', a.route === 'nightlight' && a.view === 'session', JSON.stringify({ route: a.route, view: a.view }));
    check(scope, 'a painted still is shown (two still canvases), the sky layer, no live realm outside Drift', a.stills === 2 && a.shown >= 1 && a.sky === 1 && a.realms === 0, JSON.stringify(a));
    check(scope, 'rose from black with an opacity transition', a.enter.length >= 1 && a.enter[0].entering === true && /opacity|all/.test(a.prop) && parseFloat(a.dur) > 0, JSON.stringify({ enter: a.enter, dur: a.dur, prop: a.prop }));
    check(scope, "Noomi's night world (moonmilk-cove), painted, not the fallback", a.realm === 'moonmilk-cove' && a.plain === false, `${a.realm} plain=${a.plain}`);
    check(scope, 'the world is dark at default brightness (mean luminance ≤ 0.25)', a.lum != null && a.lum <= 0.25, `${a.lum}`);
    check(scope, 'night chrome tone and the start announcement', a.backdrop === 'dark' && /^Nightlight on with Noomi/.test(a.sr[0] || ''), JSON.stringify(a.sr));
    noErrors(scope, errors);

    // and straight from the hash, in a fresh context
    const r2 = await openNl(browser, 'phone', 'boppo');
    try {
      const b = await nl(r2.page, () => ({ realm: __lab.nightlight.world.realmId, realms: document.querySelectorAll('canvas.hushfold-realm').length, title: document.querySelector('.nightlight .topbar .title b').textContent, sub: document.querySelector('.nightlight .topbar .title small').textContent }));
      check(scope, 'from #nightlight: Boppo in the cove, titled "Nightlight", subtitle "Moonlight · Boppo"', b.realm === 'moonmilk-cove' && b.realms === 0 && b.title === 'Nightlight' && b.sub === 'Moonlight · Boppo', JSON.stringify(b));
      await H.shot(r2.page, out, 'nightlight-phone-arriving');
      noErrors(`${scope}:hash`, r2.errors);
    } finally { await r2.ctx.close(); }
  });

  // ------------------------------------------------------------------- E3 --
  if (only('moonlight')) await guard(`${SCOPE}:moonlight`, async (scope, own) => {
    const { ctx, page, errors } = await openNl(browser, 'phone', 'boppo');
    own(ctx);
    await until(page, () => __lab.nightlight.sky.debug().halo.amount, (v) => v > 0.95, 15000);   // the sky fades in on rig time
    const a = await nl(page, () => ({ glow: __lab.companion.rig.faceOverride.min.glow, halo: __lab.nightlight.sky.debug().halo, mode: __lab.nightlight.mode, look: __lab.nightlight.look.glow }));
    check(scope, 'Moonlight: the glow floor ≥ 0.45 at defaults (0.55 × the ±12 % swell)', a.mode === 'moonlight' && a.glow >= 0.45, JSON.stringify(a));
    check(scope, 'the halo is drawn (alpha > 0, full amount)', a.halo.alpha > 0 && a.halo.amount > 0.9, JSON.stringify(a.halo));
    // the touch-lamp swell rises over ≥ 600 ms
    const p = await bodyPoint(page);
    await page.mouse.click(p.x, p.y);
    const t0 = Date.now();
    await sleep(Math.max(0, 100 - (Date.now() - t0)));
    const g100 = await nl(page, () => __lab.companion.rig.faceOverride.min.glow);
    await sleep(Math.max(0, 700 - (Date.now() - t0)));
    const g700 = await nl(page, () => __lab.companion.rig.faceOverride.min.glow);
    check(scope, "a tap's glow is lower at +100 ms than at +700 ms (a swell, never a flash)", g100 < g700 - 0.1, `${g100.toFixed(3)} → ${g700.toFixed(3)}`);
    // 20 rapid taps: at most one brightening start per 2 s
    await sleep(2200);
    const sparks0 = await nl(page, () => __lab.companion.rig.particles.list.filter((q) => q.kind === 'pop' || q.kind === 'spark').length);
    for (let i = 0; i < 20; i++) { await page.mouse.click(p.x + (i % 4) * 5 - 8, p.y + (i % 3) * 4); await sleep(45); }
    await sleep(600);
    const lim = await nl(page, () => __lab.nightlight.limiter.log);
    const starts = lim.filter((e) => e.ok).map((e) => e.t);
    const gaps = starts.slice(1).map((t, i) => t - starts[i]);
    check(scope, '20 rapid taps: ≤ 1 brightening start per 2 s (limiter log)', starts.length >= 1 && gaps.every((g) => g >= 1999), JSON.stringify({ starts: starts.length, gaps, refused: lim.filter((e) => !e.ok).length }));
    const b = await nl(page, () => { const r = __lab.companion.rig; return { hop: r.body.hop, kinds: r.overlays.map((o) => o.kind), parts: r.particles.list.filter((q) => q.kind === 'pop' || q.kind === 'spark').length, tags: __lab.events.slice(-8).map((e) => e.tag) }; });
    check(scope, 'Boppo: no hop overlay, body.hop 0, no pop or spark burst', !b.kinds.includes('hop') && !b.kinds.includes('tap') && b.hop === 0 && b.parts <= sparks0, JSON.stringify(b));
    check(scope, 'Boppo: tap tags are night tags', b.tags.length > 0 && b.tags.every((t) => !t || t.startsWith('night-')), JSON.stringify(b.tags));
    noErrors(scope, errors);
    await ctx.close();

    // Pipzi: its tap is two whisper sparks at most (its rig tap would be a hop and ten sparks)
    const r2 = await openNl(browser, 'phone', 'pipzi');
    try {
      await sleep(3500);   // after its greeting (two whisper sparks at 1.5 s)
      const q = await bodyPoint(r2.page);
      await nl(r2.page, () => {   // every particle burst from here on (the rig's own tap would be { spark, n: 10 } with a hop)
        const pf = __lab.companion.rig.particles, burst = pf.burst.bind(pf);
        window.__bursts = [];
        pf.burst = (spec, o) => { for (const x of [].concat(spec)) window.__bursts.push({ kind: x.kind, n: x.n }); return burst(spec, o); };
      });
      let hop = 0;
      const kinds = new Set(), sparks = [];
      for (let i = 0; i < 4; i++) {
        await r2.page.mouse.click(q.x, q.y);
        for (let k = 0; k < 4; k++) {
          const s = await nl(r2.page, () => { const r = __lab.companion.rig, g = r.grade; return { hop: r.body.hop, kinds: r.overlays.map((o) => o.kind), k: (g[0] + g[1] + g[2]) / 3, parts: r.particles.list.map((p) => ({ kind: p.kind, alpha: p.alpha, graded: !!p.nlGraded })) }; });   // graded as they are born, ambient ones too
          hop = Math.max(hop, s.hop); s.kinds.forEach((x) => kinds.add(x));
          for (const pt of s.parts) sparks.push({ ...pt, k: s.k });
          await sleep(150);
        }
        await sleep(1000);
      }
      check(`${scope}:pipzi`, "particles take the Mallow's brightness (graded alpha, never full bright at night)",
        sparks.length > 0 && sparks.every((pt) => pt.graded && pt.alpha <= pt.k + 0.05 && pt.alpha < 0.95), JSON.stringify(sparks.filter((pt) => !(pt.graded && pt.alpha <= pt.k + 0.05 && pt.alpha < 0.95)).slice(0, 6).concat([{ n: sparks.length }])));
      const bursts = await nl(r2.page, () => window.__bursts);
      check(`${scope}:pipzi`, 'Pipzi: no hop; its tap answer is whisper sparks only (every burst ≤ 2 sparks)',
        hop === 0 && !kinds.has('hop') && !kinds.has('tap') && bursts.length >= 1 && bursts.every((b) => b.kind === 'spark' && b.n <= 2), JSON.stringify({ hop, kinds: [...kinds], bursts }));
      noErrors(`${scope}:pipzi`, r2.errors);
    } finally { await r2.ctx.close(); }
  });

  // ------------------------------------------------------------ E5 (part) --
  if (only('sleepy')) await guard(`${SCOPE}:sleepy`, async (scope, own) => {
    const { ctx, page, errors } = await openNl(browser, 'phone', 'boppo');
    own(ctx);
    await nl(page, () => __lab.nightlight.setMode('sleepy'));
    await sleep(800);
    await nl(page, () => __lab.nightlight.force('stretch'));
    const sq = { min: 0, max: 0, back: null };
    const t0 = Date.now();
    while (Date.now() - t0 < 9000) {
      const v = await nl(page, () => __lab.companion.rig.squeeze.target);
      sq.min = Math.min(sq.min, v);
      if (sq.min < -0.2) sq.max = Math.max(sq.max, v);
      if (sq.max > 0 && v === 0) { sq.back = Date.now() - t0; break; }
      await sleep(60);
    }
    check(scope, "force('stretch'): the squeeze goes below −0.2, then a settle above 0, then back to 0", sq.min < -0.2 && sq.max > 0 && sq.back != null, JSON.stringify(sq));
    await sleep(1200);
    await nl(page, () => __lab.nightlight.force('blink'));
    const blink = await until(page, () => __lab.companion.rig.overlays.map((o) => o.kind), (k) => k.includes('nl-blink'), 3000, 50);
    check(scope, "force('blink') on Boppo: a heavy blink overlay (nl-blink)", blink.includes('nl-blink'), JSON.stringify(blink));
    // asleep in your hand: hold (H) for 4.2 s, let go
    await page.focus('.stage');
    await page.keyboard.down('h');
    await sleep(4200);
    await page.keyboard.up('h');
    const d = await until(page, () => __lab.nightlight.script.d, (v) => v >= 0.9, 3000);
    check(scope, 'a 4.2 s hold: asleep in your hand (drowsiness ≥ 0.9)', d >= 0.9, `${d}`);
    // Less: a stretch becomes a settle (no negative squeeze)
    await nl(page, () => __lab.nightlight.set('motion', 'less'));
    await sleep(300);
    await nl(page, () => __lab.nightlight.force('stretch'));
    let lessMin = 0;
    const t1 = Date.now();
    while (Date.now() - t1 < 3500) { lessMin = Math.min(lessMin, await nl(page, () => __lab.companion.rig.squeeze.target)); await sleep(80); }
    const lessState = await nl(page, () => ({ motion: __lab.nightlight.motion, reduced: __lab.companion.rig.opts.reducedMotion }));
    check(scope, 'Movement Less: no negative squeeze (the stretch became a settle), reduced motion on the rig', lessMin >= 0 && lessState.motion === 'less' && lessState.reduced, JSON.stringify({ lessMin, ...lessState }));
    noErrors(scope, errors);
    await ctx.close();

    // Noomi's sleepy peek uses its night peek params
    const r2 = await openNl(browser, 'phone', 'noomi');
    try {
      await nl(r2.page, () => __lab.nightlight.setMode('sleepy'));
      await sleep(600);
      await nl(r2.page, () => __lab.nightlight.force('peek'));
      const pk = await until(r2.page, () => { const r = __lab.companion.rig, o = r.overlays.find((x) => x.kind === 'nl-peek'); return { o: o ? o.params : null, pp: r.peekParams }; }, (v) => !!v.o, 3000, 50);
      check(`${scope}:noomi`, "Noomi's peek uses peekParams (half-open, sleepy)", !!pk.o && JSON.stringify(pk.o) === JSON.stringify(pk.pp) && pk.pp.eyeOpen < 0.5, JSON.stringify(pk));
      noErrors(`${scope}:noomi`, r2.errors);
    } finally { await r2.ctx.close(); }

    // 30 s each of Boppo and Pipzi in Sleepy (touched now and then): never hop, celebrate or idle
    for (const m of ['boppo', 'pipzi']) {
      const r = await openNl(browser, 'phone', m);
      try {
        await nl(r.page, () => __lab.nightlight.setMode('sleepy'));
        const p = await bodyPoint(r.page);
        const seen = new Set();
        let hop = 0;
        const tEnd = Date.now() + 30000;
        let n = 0;
        while (Date.now() < tEnd) {
          if (n++ % 20 === 5) await r.page.mouse.click(p.x, p.y);
          const s = await nl(r.page, () => { const rg = __lab.companion.rig; return { k: rg.overlays.map((o) => o.kind), hop: rg.body.hop }; });
          s.k.forEach((k) => seen.add(k)); hop = Math.max(hop, s.hop);
          await sleep(250);
        }
        const bad = [...seen].filter((k) => k === 'hop' || k === 'celebrate' || k === 'idle' || k === 'doubleTap' || k === 'tap');
        check(`${scope}:${m}-30s`, `${m}: 30 s of Sleepy with taps: no hop, celebrate or idle overlays and no hop`, !bad.length && hop === 0, JSON.stringify({ seen: [...seen], hop }));
        noErrors(`${scope}:${m}-30s`, r.errors);
      } finally { await r.ctx.close(); }
    }
  });

  // ------------------------------------------------------------------ E28 --
  if (only('mallows')) await guard(`${SCOPE}:mallows`, async (scope) => {
    const tags = {};
    for (const m of MALLOWS) {
      const r = await openNl(browser, 'phone', m);
      const sc = `${scope}:${m}`;
      try {
        const want = await nl(r.page, async ({ LAB, m }) => {
          const { nightWorld } = await import(`${LAB}/features/nightlight/ways.js`);
          return nightWorld(m, __lab.dna.get('environment')).realmId;
        }, { LAB, m });
        const a = await nl(r.page, () => ({ realm: __lab.nightlight.world.realmId, plain: __lab.nightlight.world.plain, rest: __lab.companion.restOverride?.i, id: __lab.companion.id, filter: typeof __lab.companion.persona.filter }));
        check(sc, `${m}: paints its night world (${want})`, a.id === m && a.realm === want && !a.plain, JSON.stringify({ ...a, want }));
        check(sc, `${m}: rests at intensity ≥ 0.6 (idle hops stay asleep) with the night filter installed`, a.rest >= 0.6 && a.filter === 'function', JSON.stringify(a));
        await sleep(1200);
        const p = await bodyPoint(r.page);
        const kinds = new Set();
        await H.clearEvents(r.page);
        for (let i = 0; i < 3; i++) {
          await r.page.mouse.click(p.x, p.y);
          for (let k = 0; k < 6; k++) { (await nl(r.page, () => __lab.companion.rig.overlays.map((o) => o.kind))).forEach((x) => kinds.add(x)); await sleep(120); }
          await sleep(700);
        }
        const ev = await nl(r.page, () => __lab.events.filter((e) => e.type === 'tap' || e.type === 'doubletap').map((e) => e.tag));
        tags[m] = [...new Set(ev)].sort();
        const bad = [...kinds].filter((k) => !ALLOWED_OVERLAYS.test(k));
        check(sc, `${m}: a tap answers only with night overlays`, !bad.length, JSON.stringify([...kinds]));
        check(sc, `${m}: tap tags are night tags`, ev.length > 0 && ev.every((t) => typeof t === 'string' && t.startsWith('night-')), JSON.stringify(ev));
        await H.shot(r.page, out, `nightlight-phone-${m}`);
        noErrors(sc, r.errors);
      } finally { await r.ctx.close(); }
    }
    const distinct = new Set(Object.values(tags).map((t) => t.join(','))).size;
    check(scope, 'the seven Mallows answer with different night tap tags', distinct >= 5, JSON.stringify(tags));
  });

  // ---------------------------------------------------------------- modes --
  if (only('modes')) await guard(`${SCOPE}:modes`, async (scope, own) => {
    const { ctx, page, errors } = await openNl(browser, 'phone', 'blubi');
    own(ctx);
    const want = { moonlight: [null, 0.64], breathe: ['breathe', 0.66], sleepy: [null, 0.62], drift: [null, 0.64], quiet: ['sound', 0.7] };
    for (const [m, [chip, rest]] of Object.entries(want)) {
      await nl(page, (m) => __lab.nightlight.setMode(m), m);
      await sleep(1800);
      const s = await nl(page, () => { const d = __lab.nightlight.debug(); return { mode: d.mode, chip: d.chip, rest: __lab.companion.restOverride?.i, cfg: d.sky.cfg, quiet: d.quiet, cap: d.cap, sub: document.querySelector('.nightlight .topbar .title small').textContent, checked: document.querySelector('.nl-modes [aria-checked="true"]')?.dataset.mode }; });
      check(`${scope}:${m}`, `${m}: starts with its rest (≥ ${rest}), chip, sky mix and the radio checked`, s.mode === m && s.chip === chip && s.rest >= rest - 1e-6 && s.checked === m && s.sub.endsWith('· Blubi'), JSON.stringify(s));
      if (m === 'quiet') check(`${scope}:quiet`, 'Quiet is silent by default (the facade is quiet); the sky is static', s.quiet === true && s.cfg.animated === false, JSON.stringify(s));
      if (m === 'breathe') {
        const inf = await until(page, () => __lab.companion.rig.inflateTarget, (v) => v > 0.3, 9000);
        check(`${scope}:breathe`, 'Breathe: the Mallow inflates with the breath', inf > 0.3, `${inf}`);
      }
    }
    // keys: 1–5 from the stage, ↑ / ↓ brightness (announced)
    await page.focus('.stage');
    await page.keyboard.press('Digit2'); await sleep(300);
    const k2 = await nl(page, () => __lab.nightlight.mode);
    const b0 = await nl(page, () => __lab.nightlight.settings.brightness);
    await page.keyboard.press('ArrowUp'); await sleep(300);
    const k = await nl(page, () => ({ b: __lab.nightlight.settings.brightness, sr: __lab.nightlight.debug().sr.slice(-1)[0] }));
    check(scope, 'keys: 2 → Breathe; ↑ → brightness +10 % (announced)', k2 === 'breathe' && Math.abs(k.b - (b0 + 0.1)) < 1e-6 && k.sr === `Brightness ${Math.round(k.b * 100)} %.`, JSON.stringify({ k2, b0, ...k }));
    await page.keyboard.press('Digit1'); await sleep(200);
    noErrors(scope, errors);
    await ctx.close();

    // Drift's live window: high tier only, back to a still on leaving, none with Movement Less
    const r = await openNl(browser, 'phone', 'noomi', { prefs: { quality: 'high' } });
    try {
      await nl(r.page, () => __lab.nightlight.setMode('drift'));
      const live = await until(r.page, () => ({ live: __lab.nightlight.world.isLive, realms: document.querySelectorAll('canvas.hushfold-realm').length }), (v) => v.live && v.realms === 1, 15000);
      check(`${scope}:drift`, 'Drift on a high-tier context: one live realm within the window', live.live && live.realms === 1, JSON.stringify(live));
      await H.shot(r.page, out, 'nightlight-phone-drift');
      await nl(r.page, () => __lab.nightlight.setMode('moonlight'));
      const still = await until(r.page, () => ({ live: __lab.nightlight.world.isLive, realms: document.querySelectorAll('canvas.hushfold-realm').length, shown: [...document.querySelectorAll('canvas.nl-still')].filter((c) => c.style.opacity === '1').length }), (v) => !v.live && v.realms === 0, 6000);
      check(`${scope}:drift`, 'leaving Drift turns the live realm back into a still', !still.live && still.realms === 0 && still.shown >= 1, JSON.stringify(still));
      await nl(r.page, () => { __lab.nightlight.set('motion', 'less'); __lab.nightlight.setMode('drift'); });
      await sleep(2500);
      const less = await nl(r.page, () => ({ live: __lab.nightlight.world.isLive, realms: document.querySelectorAll('canvas.hushfold-realm').length, max: __lab.nightlight.sky.debug().maxSpeed }));
      check(`${scope}:drift`, 'Movement Less: no live window; fireflies stay under 12 px/s', !less.live && less.realms === 0 && less.max < 12, JSON.stringify(less));
      noErrors(`${scope}:drift`, r.errors);
    } finally { await r.ctx.close(); }
  });

  // ----------------------------------------------------------------- exit --
  if (only('exit')) await guard(`${SCOPE}:exit`, async (scope, own) => {
    const { ctx, page, errors } = await openNl(browser, 'phone', 'zuzu');
    own(ctx);
    const rec = await nl(page, () => !!sessionStorage.getItem('hm.sensorylab.nightlight.session.v1'));
    check(scope, 'a session record is written at start', rec, `${rec}`);
    await page.keyboard.press('Escape');
    const leaving = await nl(page, () => __lab.nightlight?.state);
    const t0 = Date.now();
    await page.waitForFunction(() => __lab.route === 'home' && __lab.companion?.rig?.soft, null, { timeout: T });
    const ms = Date.now() - t0;
    await sleep(400);
    const a = await nl(page, () => ({ nl: __lab.nightlight, canvases: document.querySelectorAll('canvas').length, left: document.querySelectorAll('.nl-still, .nl-sky, .hushfold-realm, .nightlight').length,
      trim: __lab.sound.trim, rec: sessionStorage.getItem('hm.sensorylab.nightlight.session.v1'), filter: __lab.companion.persona.filter, cap: __lab.companion.rig.frameCap, grade: [...__lab.companion.rig.grade] }));
    check(scope, 'Escape: the goodnight, then home', leaving === 'leaving' && ms < 8000, `${leaving} ${ms} ms`);
    check(scope, 'nothing left behind: no handle, one canvas (home), no night canvases, trim 1, record cleared', a.nl === null && a.canvases === 1 && a.left === 0 && a.trim === 1 && a.rec === null, JSON.stringify(a));
    check(scope, 'the home Mallow is neutral (no filter, no cap, identity grade)', a.filter === null && a.cap === null && a.grade.join() === '1,1,1', JSON.stringify(a));
    // Close, from a reroute-free second visit
    await nl(page, () => __lab.ctx.navigate('/nightlight'));
    await ready(page);
    await page.click('.nightlight .topbar button[aria-label="Close"]');
    await page.waitForFunction(() => __lab.route === 'home', null, { timeout: T });
    const b = await nl(page, () => ({ nl: __lab.nightlight, rec: sessionStorage.getItem('hm.sensorylab.nightlight.session.v1') }));
    check(scope, 'Close: home, record cleared', b.nl === null && b.rec === null, JSON.stringify(b));
    noErrors(scope, errors);
  });

  if (only('exit')) await guard(`${SCOPE}:leaks`, async (scope, own) => {
    const I = H.INIT;
    const { ctx, page, errors } = await H.open(browser, 'phone', '#home', { initScripts: [I.listenerCounter, I.timerSpy, I.rafProbe], comfort: H.comfort({ favouriteMallow: 'glitzi' }) });
    own(ctx);
    await H.waitRig(page, { timeout: T });
    const home = await bodyPoint(page);
    await page.mouse.click(home.x, home.y);
    await sleep(1500);
    const snap = () => nl(page, async (LAB) => {
      const { glowSpriteCount } = await import(`${LAB}/core/effects.js`);
      const live = __timers().live, mine = Object.entries(live).filter(([f]) => f.includes('nightlight')).map(([f, c]) => `${f}:${c.timeout}/${c.interval}`);
      return { listeners: __listeners().total, byType: __listeners(), timers: Object.values(live).reduce((a, c) => a + c.timeout + c.interval, 0), mine,
        raf: __raf().pendingByFile, prefsL: __lab.prefs.listeners.size, dnaL: __lab.dna.listeners.size, canvases: document.querySelectorAll('canvas').length, sprites: glowSpriteCount() };
    }, LAB);
    const base = await snap();
    for (let round = 1; round <= 3; round++) {
      await nl(page, () => __lab.ctx.navigate('/nightlight'));
      await ready(page);
      const p = await bodyPoint(page);
      await page.mouse.click(p.x, p.y);
      await nl(page, (m) => __lab.nightlight.setMode(m), ['sleepy', 'drift', 'breathe'][round - 1]);
      await sleep(1200);
      await nl(page, () => __lab.ctx.navigate('/'));
      await page.waitForFunction(() => __lab.route === 'home' && __lab.companion?.rig?.soft, null, { timeout: T });
    }
    await sleep(1500);
    const now = await snap();
    const rafExtra = Object.entries(now.raf).filter(([f, n]) => n > (base.raf[f] || 0));
    check(scope, 'three visits: listeners on window and document back to baseline', now.listeners <= base.listeners, JSON.stringify({ base: base.byType, now: now.byType }));
    check(scope, 'no live Nightlight timers, no extra rAF', !now.mine.length && now.timers <= base.timers && !rafExtra.length, JSON.stringify({ mine: now.mine, timers: [base.timers, now.timers], rafExtra }));
    check(scope, 'prefs and Comfort DNA listeners back to baseline; one canvas; no cached sprites left', now.prefsL === base.prefsL && now.dnaL === base.dnaL && now.canvases === 1 && now.sprites === 0, JSON.stringify({ base, now }));
    noErrors(scope, errors);
  });

  // ================================================================ slice 3 --
  // ----------------------------------------------------------- E2, E11, E7 --
  if (only('sound')) await guard(`${SCOPE}:sound`, async (scope, own) => {
    const { ctx, page, errors } = await openNl(browser, 'phone', 'noomi', { initScripts: [H.INIT.audioSpy] });
    own(ctx);
    await sleep(3000);   // idle on a deep link: nothing may sound before a gesture
    const a = await nl(page, () => ({ created: __audio().created, bed: __lab.nightlight.bed.debug(), ready: __lab.sound.ready }));
    check(scope, 'E2: deep link, 3 s idle: no AudioContext, the bed not alive', a.created === 0 && !a.bed.alive && !a.ready, JSON.stringify(a));
    const p = await bodyPoint(page);
    await page.mouse.click(p.x, p.y);
    const b0 = await until(page, () => __lab.nightlight.bed.debug(), (d) => d.alive, 15000, 60);
    const t0 = Date.now();
    const early = b0.fade;
    await sleep(900);
    const b1 = await nl(page, () => __lab.nightlight.bed.debug());
    check(scope, 'E2: after a real click the bed builds: its own texture (waves), peak ≤ 0.035', b0.alive && b0.texture === 'waves' && b0.gain > 0 && b0.gain <= 0.035, JSON.stringify(b0));
    check(scope, 'E2: it rises from silence over ≥ 3 s (master fade still under 0.5 after ~1 s)', early < 0.3 && b1.fade > early && b1.fade < 0.5, JSON.stringify({ early, later: b1.fade, ms: Date.now() - t0 }));
    // Touch sounds off: the bed has its own controls (SHARED C7)
    await nl(page, () => __lab.sound.setParts({ fx: false }));
    await sleep(1600);
    const fx = await nl(page, () => ({ alive: __lab.nightlight.bed.alive, fxOn: __lab.sound.fxOn }));
    check(scope, 'Touch sounds off does not silence the night bed (C7)', fx.alive && fx.fxOn === false, JSON.stringify(fx));
    await nl(page, () => __lab.sound.setParts({ fx: true }));
    // E11: Volume is the session trim; 0 lets the bed go and then rests the audio
    await nl(page, () => __lab.nightlight.set('volume', 0.2));
    const tr = await nl(page, () => __lab.sound.debug().trim);
    await nl(page, () => __lab.nightlight.set('volume', 0));
    const off = await until(page, () => ({ alive: __lab.nightlight.bed.alive, trim: __lab.sound.debug().trim }), (v) => !v.alive, 4000);
    check(scope, 'E11: Volume sets the trim (0.2); Volume 0 lets the bed go', tr === 0.2 && !off.alive && off.trim === 0, JSON.stringify({ tr, off }));
    const rest = await until(page, () => __lab.sound.debug(), (d) => d.resting, 16000, 250);
    check(scope, 'E11: Volume 0 rests the audio 10 s after the last touch (suspended, resting)', rest.resting && rest.state === 'suspended', JSON.stringify(rest));
    await nl(page, () => __lab.nightlight.set('volume', 0.5));
    await page.mouse.click(p.x, p.y);   // the next gesture wakes it
    const back = await until(page, () => ({ resting: __lab.sound.resting, alive: __lab.nightlight.bed.alive }), (v) => !v.resting && v.alive, 15000);
    check(scope, 'E11: a tap brings the audio and the bed back', !back.resting && back.alive, JSON.stringify(back));
    // E7: Quiet is silent and rests; its Sound chip brings a faint pad and takes it away again
    await page.focus('.stage');
    await page.keyboard.press('Digit5');
    const q0 = await until(page, () => ({ alive: __lab.nightlight.bed.alive, quiet: __lab.nightlight.debug().quiet, chip: __lab.nightlight.debug().chip }), (v) => !v.alive, 4000);
    check(scope, 'E7: Quiet: the bed lets go, the Companion is silent, the Sound chip is offered', !q0.alive && q0.quiet && q0.chip === 'sound', JSON.stringify(q0));
    const qr = await until(page, () => __lab.sound.debug().resting, (v) => v, 16000, 250);
    check(scope, 'E7: silent Quiet rests the audio within 11 s of the last touch', qr === true, `${qr}`);
    await wakeUi(page);
    await page.click('.nl-chip[data-chip="sound"]');
    const q1 = await until(page, () => ({ alive: __lab.nightlight.bed.alive, quiet: __lab.nightlight.debug().quiet, pressed: document.querySelector('.nl-chip[data-chip="sound"]').getAttribute('aria-pressed'), lv: __lab.nightlight.bed.debug().levels }), (v) => v.alive, 15000);
    check(scope, 'E7: Sound on: a faint pad only, touches and voice return', q1.alive && !q1.quiet && q1.pressed === 'true' && q1.lv.texture === 0 && q1.lv.pad > 0 && q1.lv.pad <= 0.5, JSON.stringify(q1));
    await wakeUi(page);
    await page.click('.nl-chip[data-chip="sound"]');
    const tOff = Date.now();
    const q2 = await until(page, () => ({ alive: __lab.nightlight.bed.alive, quiet: __lab.nightlight.debug().quiet }), (v) => !v.alive, 3500, 80);
    check(scope, 'E7: Sound off again: the bed lets go within 3.5 s', !q2.alive && q2.quiet, JSON.stringify({ ...q2, ms: Date.now() - tOff }));
    await sleep(3000);   // past the touch boost
    const r0 = await nl(page, () => __lab.companion.rig.renders);
    await sleep(3000);
    const r1 = await nl(page, () => ({ renders: __lab.companion.rig.renders, cap: __lab.companion.rig.frameCap }));
    check(scope, 'E7: Quiet idle: ≤ 10 × 3 × 1.3 + 2 renders in 3 s', r1.renders - r0 <= 41, JSON.stringify({ renders: r1.renders - r0, cap: r1.cap }));
    // Drift: a firefly's glint rings a soft bell now and then
    await page.focus('.stage');   // digits change mode only from the stage (the chip had focus)
    await page.keyboard.press('Digit4');
    const ch = await until(page, () => ({ ...__lab.nightlight.bed.debug(), mode: __lab.nightlight.mode }), (d) => d.chimes >= 1, 60000, 500);
    check(scope, "Drift: a firefly's glint rings a soft bell", ch.mode === 'drift' && ch.chimes >= 1 && ch.alive, JSON.stringify({ mode: ch.mode, chimes: ch.chimes, alive: ch.alive }));
    noErrors(scope, errors);
  });

  // ------------------------------------------------------- E12, E13, E30 --
  if (only('fade')) await guard(`${SCOPE}:fade`, async (scope, own) => {
    const { ctx, page, errors } = await openNl(browser, 'phone', 'boppo', { initScripts: [H.INIT.rafProbe], prefs: { nightlight: { minutes: 10 } } });
    own(ctx);
    const p = await bodyPoint(page);
    await page.mouse.click(p.x, p.y);
    await until(page, () => __lab.nightlight.bed.alive, (v) => v, 15000);
    const st = await nl(page, () => {
      const n = __lab.nightlight, c = n.clock, t = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(c.endsAt);
      return { full: document.querySelector('.nl-st-full').textContent, want: `Until ${t}`, span: c.endsAt - c.startedAt, fadeMs: c.fadeMs };
    });
    check(scope, 'E12: Timer 10: the status shows the local end time; a 200 s fade', st.full === st.want && st.span === 600000 && st.fadeMs === 200000, JSON.stringify(st));
    // into the fade
    await nl(page, () => { const c = __lab.nightlight.clock; __lab.nightlight.skew(c.fadeFrom - c.now() + 30000); });
    const f0 = await until(page, () => ({ state: __lab.nightlight.state, chip: __lab.nightlight.debug().chip }), (v) => v.state === 'fading' && v.chip === 'longer', 10000);
    const samples = [];
    for (let i = 0; i < 4; i++) { samples.push(await nl(page, () => ({ ...__lab.nightlight.debug().levels, gain: __lab.nightlight.bed.gain }))); await sleep(900); }
    const f1 = await nl(page, () => ({ full: document.querySelector('.nl-st-full').textContent, sr: __lab.nightlight.debug().sr }));
    const dec = samples.every((v, i) => i === 0 || (v.world <= samples[i - 1].world + 1e-9 && v.mallow <= samples[i - 1].mallow + 1e-9));
    const last = samples.at(-1);
    check(scope, 'E13: into the fade: "Fading · until", the "A little longer" chip, announced', f0.state === 'fading' && f0.chip === 'longer' && /^Fading · until /.test(f1.full) && f1.sr.includes('Fading out.'), JSON.stringify({ f0, f1 }));
    check(scope, 'E13: levels in (0, 1) that never rise; the bed is lower', dec && last.world < 1 && last.world > 0 && last.world < samples[0].world && last.gain < 0.035, JSON.stringify(samples));
    // "A little longer": +10 min, the light eases back up over ≥ 2 s
    const e0 = await nl(page, () => __lab.nightlight.clock.endsAt);
    await wakeUi(page);
    await page.click('.nl-chip[data-chip="longer"]');
    const t0 = Date.now();
    const l0 = await nl(page, () => __lab.nightlight.debug().levels.world);
    await sleep(Math.max(0, 300 - (Date.now() - t0)));
    const l1 = await nl(page, () => __lab.nightlight.debug().levels.world);
    const l2 = await until(page, () => __lab.nightlight.debug().levels.world, (v) => v > 0.999, 20000, 150);
    const e1 = await nl(page, () => ({ endsAt: __lab.nightlight.clock.endsAt, state: __lab.nightlight.state, sr: __lab.nightlight.debug().sr.slice(-1)[0], chip: __lab.nightlight.debug().chip }));
    check(scope, 'E13: "A little longer": endsAt + 10 min, back to steady, announced', e1.endsAt - e0 === 600000 && e1.state === 'steady' && e1.sr === 'Ten more minutes.' && e1.chip !== 'longer', JSON.stringify(e1));
    check(scope, 'E13: the light eases back up (not yet at +300 ms; there later)', l1 < 0.98 && l2 > 0.999 && Date.now() - t0 >= 1900, JSON.stringify({ l0, l1, l2, ms: Date.now() - t0 }));
    // deep in the fade: asleep, eyes closing, slower, one sigh, heavier repaints
    await nl(page, () => {
      const rig = __lab.companion.rig, react = rig.react.bind(rig);
      window.__reacts = [];
      rig.react = (k, o) => { window.__reacts.push(k); return react(k, o); };
    });
    const p0 = await nl(page, () => __lab.nightlight.world.debug().paints);
    // a 60 min timer (a 480 s fade) leaves time to look at the deep fade before it ends (a timer change restarts from now)
    await nl(page, () => __lab.nightlight.set('minutes', 60));
    await nl(page, () => { const c = __lab.nightlight.clock; __lab.nightlight.skew(c.fadeFrom - c.now() + 0.93 * c.fadeMs); });
    const deep = await until(page, () => { const d = __lab.nightlight.debug(); return { lv: d.levels, fade: d.fade, rest: __lab.companion.restOverride, eye: __lab.companion.rig.faceOverride.set.eyeOpen, ms: __lab.companion.rig.motionScale, cap: d.cap, paints: d.world.paints, reacts: window.__reacts.slice() }; },
      (v) => v.lv.mallow < 0.12 && v.fade.sighed, 90000, 300);
    check(scope, 'E13: deep in the fade it falls asleep: the asleep face (i 0.75), slower movement', deep.fade.asleep && deep.rest?.i === 0.75 && deep.ms < 0.6 && deep.ms >= 0.3 - 1e-9, JSON.stringify({ fade: deep.fade, rest: deep.rest, ms: deep.ms }));
    check(scope, "E13: Boppo's open eyes close (eyeOpen set toward 0), blinks slow", deep.eye != null && deep.eye <= 0.05 && deep.fade.blinkRate != null && deep.fade.blinkRate < 0.4, JSON.stringify({ eye: deep.eye, fade: deep.fade }));
    check(scope, 'E13: one soft sigh as the world fell asleep; the world repainted heavier', deep.reacts.filter((k) => k === 'sigh').length === 1 && deep.fade.step === 0.75 && deep.paints > p0, JSON.stringify({ reacts: deep.reacts, step: deep.fade.step, paints: [p0, deep.paints] }));
    const capDeep = await until(page, () => __lab.companion?.rig?.frameCap ?? -1, (v) => v != null && v <= 8, 8000, 200);   // after the sigh's own boost
    check(scope, 'E13: fading deep (world below 0.3): the frame cap drops to 8', capDeep === 8, `${capDeep} (during the sigh: ${deep.cap})`);
    // a live end
    await nl(page, () => { const c = __lab.nightlight.clock; __lab.nightlight.skew(c.endsAt - c.now() + 1000); });
    await page.waitForFunction(() => __lab.nightlight?.view === 'end', null, { timeout: T });
    const tEnd = Date.now();
    const end = await nl(page, () => {
      const d = __lab.nightlight.debug(), card = document.querySelector('.nl-endcard'), snap = document.querySelector('.nl-snap');
      const cr = card.getBoundingClientRect();
      return { d, canvases: [...document.querySelectorAll('canvas')].map((c) => c.className || 'rig'), focus: document.activeElement?.textContent,
        cap: card.querySelector('.end-cap').textContent, line: card.querySelector('.end-line')?.textContent, cardTop: cr.top, snapLift: snap?.style.transform || '' };
    });
    check(scope, 'E13: a live end: the end view with the sleeping Mallow (snapshot), not skipped, focus on Again', end.d.view === 'end' && !end.d.skipped && end.d.snap && end.focus === 'Again', JSON.stringify(end.d));
    check(scope, 'E13: only the snapshot canvas is left (no rig, realm, still or sky)', end.canvases.length === 1 && end.canvases[0] === 'nl-snap', JSON.stringify(end.canvases));
    check(scope, 'E13: the end card: the finish time (or morning) and a rest line in quotes, announced', /^(Nightlight finished at .+\.|Good morning\.)$/.test(end.cap) && /^“.+” Boppo$/.test(end.line || '') && end.d.sr.includes('Nightlight finished.'), JSON.stringify({ cap: end.cap, line: end.line }));
    const rest = await until(page, () => ({ s: __lab.sound.debug(), raf: __raf(2000).inWindow }), (v) => v.s.resting && v.s.live === 0, 6000, 200);
    check(scope, 'E13: nothing runs: voices gone within 3.5 s, the audio rests after 2.2 s', rest.s.live === 0 && rest.s.resting && rest.s.state === 'suspended' && Date.now() - tEnd < 7000, JSON.stringify({ ...rest.s, ms: Date.now() - tEnd }));
    await sleep(2100);
    const raf = await nl(page, () => __raf(2000).inWindow);
    check(scope, 'E13: the rAF probe counts ≤ 2 callbacks in 2 s', raf <= 2, `${raf}`);
    await H.shot(page, out, 'nightlight-phone-end');
    // E30: Again starts afresh from black; Done goes home
    const rec0 = await nl(page, () => sessionStorage.getItem('hm.sensorylab.nightlight.session.v1'));
    await page.click('.nl-endcard button.primary');
    await ready(page);
    const ag = await nl(page, () => ({ view: __lab.nightlight.view, endsAt: __lab.nightlight.clock.endsAt, rec: JSON.parse(sessionStorage.getItem('hm.sensorylab.nightlight.session.v1') || 'null'), state: __lab.nightlight.state }));
    check(scope, 'E30: Again: a fresh session (new deadline, new record)', ag.view === 'session' && ag.rec && ag.rec.endsAt === ag.endsAt && ag.endsAt > (JSON.parse(rec0 || '{}').endsAt || 0), JSON.stringify({ ag, rec0 }));
    // fade off: a 10 s settle
    await nl(page, () => __lab.nightlight.set('fade', false));
    const fo = await nl(page, () => __lab.nightlight.clock.fadeMs);
    check(scope, 'Fade Off: a 10 s settle instead of the long fade', fo === 10000, `${fo}`);
    await nl(page, () => { const c = __lab.nightlight.clock; __lab.nightlight.skew(c.endsAt - c.now() + 1000); });
    await page.waitForFunction(() => __lab.nightlight?.view === 'end', null, { timeout: T });
    await page.click('.nl-endcard button:not(.primary)');
    await page.waitForFunction(() => __lab.route === 'home', null, { timeout: T });
    const dn = await nl(page, () => ({ nl: __lab.nightlight, rec: sessionStorage.getItem('hm.sensorylab.nightlight.session.v1'), trim: __lab.sound.trim }));
    check(scope, 'E30: Done: home, record cleared, trim 1', dn.nl === null && dn.rec === null && dn.trim === 1, JSON.stringify(dn));
    noErrors(scope, errors);
  });

  // ------------------------------------------------- E16, E17, E18, E19, E20 --
  if (only('background')) await guard(`${SCOPE}:background`, async (scope, own) => {
    const { ctx, page, errors } = await openNl(browser, 'phone', 'noomi', { prefs: { nightlight: { minutes: 30 } } });
    own(ctx);
    const p = await bodyPoint(page);
    await page.mouse.click(p.x, p.y);
    await until(page, () => __lab.nightlight.bed.alive, (v) => v, 15000);
    const e0 = await nl(page, () => __lab.nightlight.clock.endsAt);
    // E16: hidden mid-session
    await H.setHidden(page, true);
    await sleep(300);
    const h0 = await nl(page, () => ({ t: __lab.companion.rig.time, s: __lab.sound.debug().state, d: __lab.nightlight.debug(), op: getComputedStyle(document.querySelector('.screen.nightlight')).opacity, tr: getComputedStyle(document.querySelector('.screen.nightlight')).transitionDuration }));
    await sleep(1000);
    const h1 = await nl(page, () => __lab.companion.rig.time);
    check(scope, 'E16: hidden: veiled at once (opacity 0, no transition), the rig frozen, the audio suspended', h0.d.veiled && h0.op === '0' && /^0s/.test(h0.tr) && h1 === h0.t && h0.s === 'suspended' && !h0.d.bed.alive, JSON.stringify({ veiled: h0.d.veiled, op: h0.op, tr: h0.tr, t: [h0.t, h1], s: h0.s }));
    await nl(page, () => __lab.nightlight.skew(5 * 60e3));
    await H.setHidden(page, false);
    const v0 = await nl(page, () => { const n = __lab.nightlight, c = n.clock, lv = c.levels(c.now(), {}); return { endsAt: c.endsAt, shown: n.debug().levels, clock: lv, veiled: n.debug().veiled }; });
    const v1 = await until(page, () => ({ cls: document.querySelector('.screen.nightlight').className, tr: getComputedStyle(document.querySelector('.screen.nightlight')).transitionDuration, veiled: __lab.nightlight.debug().veiled }), (v) => !v.veiled, 5000, 30);
    check(scope, 'E16: back after 5 min: the same deadline; the shown levels ≤ the clock', v0.endsAt === e0 && v0.shown.world <= v0.clock.world + 1e-6 && v0.shown.mallow <= v0.clock.mallow + 1e-6, JSON.stringify(v0));
    check(scope, 'E16: the veil lifts with a 600 ms transition', !v1.veiled && /nl-unveil/.test(v1.cls) && v1.tr.startsWith('0.6s'), JSON.stringify(v1));
    const bb = await until(page, () => __lab.nightlight.bed.debug(), (d) => d.alive, 15000, 60);
    check(scope, 'E16: the bed rebuilds from silence (a new build, fading in)', bb.alive && bb.builds >= 2 && bb.fade < 0.5, JSON.stringify(bb));
    const sh = await until(page, () => __lab.nightlight.moments.played.slice(), (v) => v.includes('peek'), 6000);
    check(scope, 'E16: away more than 30 s: its "still here" sign (Noomi peeks)', sh.includes('peek'), JSON.stringify(sh));
    // E18: pagehide / pageshow, then CDP freeze / resume
    await H.setHidden(page, true, { lifecycle: true });
    const ph = await nl(page, () => __lab.nightlight.debug().veiled);
    await H.setHidden(page, false, { lifecycle: true });
    const ps = await until(page, () => __lab.nightlight.debug().veiled, (v) => !v, 5000, 40);
    await H.setHidden(page, true);
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Page.setWebLifecycleState', { state: 'frozen' });
    await sleep(600);
    await cdp.send('Page.setWebLifecycleState', { state: 'active' });
    const fz = await nl(page, () => __lab.nightlight.debug().veiled);
    await H.setHidden(page, false);
    const fr = await until(page, () => __lab.nightlight.debug().veiled, (v) => !v, 5000, 40);
    check(scope, 'E18: pagehide veils, pageshow lifts; frozen and resumed while hidden stays veiled until visible', ph && !ps && fz && !fr, JSON.stringify({ ph, ps, fz, fr }));
    // E20: the audio will not come back on its own → the chip, announced; a real tap brings it back
    await H.setHidden(page, true);
    await nl(page, () => { window.__resume = AudioContext.prototype.resume; AudioContext.prototype.resume = function () { return new Promise(() => {}); }; });
    await H.setHidden(page, false);
    await nl(page, () => __lab.nightlight.sleepChrome());   // even with the chrome asleep, the notice is shown
    const sb = await until(page, () => ({ chip: __lab.nightlight.debug().chip, sr: __lab.nightlight.debug().sr.slice(-2), ready: __lab.sound.ready, asleep: !!document.querySelector('.nightlight.nl-asleep') }), (v) => v.chip === 'soundBack', 8000, 100);
    check(scope, 'E20: "Tap to bring the sound back" within 2 s, announced once, the chrome woken to show it', sb.chip === 'soundBack' && sb.sr.includes('Sound paused. Tap to bring it back.') && !sb.ready && !sb.asleep, JSON.stringify(sb));
    await nl(page, () => { AudioContext.prototype.resume = window.__resume; });
    // a real tap where the chip is (any tap is the gesture that lets the audio run; asleep chrome lets it fall through)
    const box = await page.locator('.nl-chip[data-chip="soundBack"]').boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    const sb2 = await until(page, () => ({ chip: __lab.nightlight.debug().chip, alive: __lab.nightlight.bed.alive, ready: __lab.sound.ready }), (v) => v.ready && v.alive && v.chip !== 'soundBack', 15000);
    check(scope, 'E20: a real tap brings the sound and the bed back; the chip goes', sb2.ready && sb2.alive && sb2.chip !== 'soundBack', JSON.stringify(sb2));
    // E17: hidden across the fade start: on return the levels match the clock, no late sigh
    await nl(page, () => { const rig = __lab.companion.rig, react = rig.react.bind(rig); window.__reacts = []; rig.react = (k, o) => { window.__reacts.push(k); return react(k, o); }; });
    await H.setHidden(page, true);
    await nl(page, () => { const c = __lab.nightlight.clock; __lab.nightlight.skew(c.fadeFrom - c.now() + 0.6 * c.fadeMs); });
    await H.setHidden(page, false);
    const fs = await nl(page, () => { const n = __lab.nightlight, c = n.clock, lv = c.levels(c.now(), {}); return { state: n.state, shown: n.debug().levels, clock: lv, sighed: n.debug().fade.sighed }; });
    await sleep(1500);
    const fsr = await nl(page, () => window.__reacts.slice());
    check(scope, 'E17: hidden across the fade start: back fading, levels match the clock at once, no late sigh',
      fs.state === 'fading' && Math.abs(fs.shown.world - fs.clock.world) < 0.02 && Math.abs(fs.shown.mallow - fs.clock.mallow) < 0.02 && fs.sighed && !fsr.includes('sigh'), JSON.stringify({ fs, fsr }));
    // E17: hidden across the end: the end view at once, quietly
    await nl(page, () => { window.__said = []; const s = __lab.sound, v = s.voice.bind(s), m = s.motif.bind(s); s.voice = (...a) => { window.__said.push(['voice', a[1]]); return v(...a); }; s.motif = (...a) => { window.__said.push(['motif']); return m(...a); }; });
    await H.setHidden(page, true);
    await nl(page, () => { const c = __lab.nightlight.clock; __lab.nightlight.skew(c.endsAt - c.now() + 60000); });
    await H.setHidden(page, false);
    const en = await until(page, () => ({ d: __lab.nightlight.debug(), focus: document.activeElement?.textContent, card: getComputedStyle(document.querySelector('.nl-endcard') || document.body).transitionDuration }), (v) => v.d.view === 'end', 5000, 50);
    await sleep(400);
    const said = await nl(page, () => ({ said: window.__said, s: __lab.sound.debug() }));
    check(scope, 'E17: hidden across the end: the end view at once (skipped, no snapshot), focus on Again', en.d.view === 'end' && en.d.skipped && !en.d.snap && en.focus === 'Again', JSON.stringify({ d: en.d, focus: en.focus }));
    check(scope, 'E17: quietly: no voice or motif, the audio resting', !said.said.length && said.s.resting, JSON.stringify(said));
    const sus = await until(page, () => __lab.sound.debug(), (v) => v.state === 'suspended', 5000, 150);
    check(scope, 'E17: the audio context ends up suspended (even with a resume pending on return)', sus.state === 'suspended' && sus.resting, JSON.stringify(sus));
    noErrors(scope, errors);

    // E19: reloads
    const r = await openNl(browser, 'phone', 'blubi', { prefs: { nightlight: { minutes: 20 } } });
    try {
      await nl(r.page, () => __lab.nightlight.setMode('drift'));
      await sleep(400);
      const a = await nl(r.page, () => ({ endsAt: __lab.nightlight.clock.endsAt, mode: __lab.nightlight.mode }));
      await r.page.reload();
      await ready(r.page);
      const b = await nl(r.page, () => ({ endsAt: __lab.nightlight.clock.endsAt, mode: __lab.nightlight.mode, sr: __lab.nightlight.debug().sr }));
      check(`${scope}:reload`, 'E19: a reload mid-session resumes the same deadline and mode (no new start announcement)', b.endsAt === a.endsAt && b.mode === 'drift' && !b.sr.some((x) => x.startsWith('Nightlight on')), JSON.stringify({ a, b }));
      // (a reload resets the debug skew, so the ended session is a record whose deadline really passed)
      await nl(r.page, () => { const k = 'hm.sensorylab.nightlight.session.v1', t = Date.now(); sessionStorage.setItem(k, JSON.stringify({ v: 1, startedAt: t - 21 * 60000, endsAt: t - 60000, fadeFrom: t - 60000 - 400000, minutes: 20, fade: true, mode: 'drift', extra: 0 })); });
      await r.page.reload();
      await r.page.waitForFunction(() => __lab.nightlight?.view, null, { timeout: T });
      const c = await nl(r.page, () => __lab.nightlight.debug());
      check(`${scope}:reload`, 'E19: a reload after the end (< 6 h) shows the end view, quietly', c.view === 'end' && c.skipped && !c.snap, JSON.stringify(c));
      // left more than 5 s ago → fresh; a malformed record → fresh, no errors
      await nl(r.page, () => { const k = 'hm.sensorylab.nightlight.session.v1', o = { v: 1, startedAt: Date.now() - 60000, endsAt: Date.now() + 600000, fadeFrom: Date.now() + 400000, minutes: 20, fade: true, mode: 'quiet', extra: 0, leftAt: Date.now() - 6000 }; sessionStorage.setItem(k, JSON.stringify(o)); });
      await r.page.reload();
      await ready(r.page);
      const d = await nl(r.page, () => ({ mode: __lab.nightlight.mode, left: __lab.nightlight.clock.remaining(), sr: __lab.nightlight.debug().sr }));
      check(`${scope}:reload`, 'E19: a record left more than 5 s ago starts fresh', d.mode !== 'quiet' && d.left > 19 * 60000 && d.sr.some((x) => x.startsWith('Nightlight on')), JSON.stringify(d));
      await nl(r.page, () => sessionStorage.setItem('hm.sensorylab.nightlight.session.v1', '{"v":1,"startedAt":"soon","endsAt":null'));
      await r.page.reload();
      await ready(r.page);
      const e = await nl(r.page, () => ({ view: __lab.nightlight.view, state: __lab.nightlight.state }));
      check(`${scope}:reload`, 'E19: a malformed record starts fresh', e.view === 'session', JSON.stringify(e));
      noErrors(`${scope}:reload`, r.errors);
    } finally { await r.ctx.close(); }
  });

  // ------------------------------------------------------------------ E21 --
  if (only('wake')) await guard(`${SCOPE}:wake`, async (scope, own) => {
    const { ctx, page, errors } = await openNl(browser, 'phone', 'zuzu', { initScripts: [wakeStub] });
    own(ctx);
    await sleep(1500);
    const a = await nl(page, () => ({ w: window.__wake, d: __lab.nightlight.debug().wake }));
    check(scope, 'E21: no wake lock by default', a.w.requests === 0 && a.d.supported && !a.d.wanted, JSON.stringify(a));
    await nl(page, () => __lab.nightlight.set('keepAwake', true));
    const b = await until(page, () => ({ w: { ...window.__wake }, d: __lab.nightlight.debug().wake }), (v) => v.d.held, 3000, 50);
    await H.setHidden(page, true);
    await sleep(200);
    const c = await nl(page, () => ({ w: { ...window.__wake }, d: __lab.nightlight.debug().wake }));
    await H.setHidden(page, false);
    const d = await until(page, () => ({ w: { ...window.__wake }, d: __lab.nightlight.debug().wake }), (v) => v.d.held, 3000, 50);
    check(scope, 'E21: opted in: requested; let go when hidden (no request while hidden); asked again on return',
      b.w.requests === 1 && b.d.held && c.w.releases === 1 && c.w.requests === 1 && !c.d.held && c.d.wanted && d.w.requests === 2 && d.d.held, JSON.stringify({ b, c, d }));
    await nl(page, () => { const k = __lab.nightlight.clock; __lab.nightlight.skew(k.endsAt - k.now() + 1000); });
    await page.waitForFunction(() => __lab.nightlight?.view === 'end', null, { timeout: T });
    const e = await nl(page, () => ({ ...window.__wake }));
    check(scope, 'E21: let go at the end', e.held === 0 && e.releases === 2, JSON.stringify(e));
    await page.click('.nl-endcard button.primary');   // Again: the setting persists, so it asks again
    await ready(page);
    const f = await until(page, () => ({ ...window.__wake }), (v) => v.held === 1, 3000, 50);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => __lab.route === 'home', null, { timeout: T });
    const g = await nl(page, () => ({ ...window.__wake }));
    check(scope, 'E21: a new session asks again (the setting persists); Escape lets it go', f.requests === 3 && g.held === 0, JSON.stringify({ f, g }));
    noErrors(scope, errors);

    // unsupported: no wakeLock at all → quiet, no errors; refused → back to Off
    const r = await openNl(browser, 'phone', 'zuzu', { initScripts: [() => { try { delete Navigator.prototype.wakeLock; } catch { /* ignore */ } }], prefs: { nightlight: { keepAwake: true } } });
    try {
      const u = await nl(r.page, () => __lab.nightlight.debug().wake);
      check(`${scope}:unsupported`, 'E21: unsupported: supported false, nothing wanted, no errors', !u.supported && !u.wanted && !r.errors.length, JSON.stringify({ u, errors: r.errors }));
    } finally { await r.ctx.close(); }
    const r2 = await openNl(browser, 'phone', 'zuzu', { initScripts: [[wakeStub, true]] });
    try {
      await nl(r2.page, () => __lab.nightlight.set('keepAwake', true));
      const x = await until(r2.page, () => ({ d: __lab.nightlight.debug().wake, s: __lab.nightlight.settings.keepAwake, stored: __lab.prefs.get('nightlight')?.keepAwake }), (v) => v.d.failed, 3000, 50);
      check(`${scope}:refused`, 'E21: a refusal switches Keep screen on back to Off (stored), never retried', x.d.failed && !x.d.wanted && x.s === false && x.stored === false && x.d.requests === 1, JSON.stringify(x));
      noErrors(`${scope}:refused`, r2.errors);
    } finally { await r2.ctx.close(); }
  });

  // ------------------------------------------------------------- E4 (part) --
  if (only('press')) await guard(`${SCOPE}:press`, async (scope, own) => {
    const { ctx, page, errors } = await openNl(browser, 'phone', 'blubi');
    own(ctx);
    await nl(page, () => __lab.nightlight.setMode('breathe'));
    await sleep(800);
    const g = await H.geo(page);
    const x = g.ox + Math.max(30, g.cx - g.w / 2 - 70), y = g.oy + g.mid;   // off the body, clear of the chrome
    await H.clearEvents(page);
    await page.mouse.move(x, y);
    await page.mouse.down();
    await sleep(700);
    const held = await nl(page, () => ({ leading: __lab.nightlight.breath.leading, phase: __lab.nightlight.breath.phase, ev: __lab.events.map((e) => e.type) }));
    await page.mouse.up();
    await sleep(250);
    const let_ = await nl(page, () => ({ leading: __lab.nightlight.breath.leading, phase: __lab.nightlight.breath.phase }));
    check(scope, 'E4: an off-body still press leads the in-breath while held; the Companion sees no hold', held.leading && ['in', 'holdIn'].includes(held.phase) && !held.ev.includes('hold'), JSON.stringify(held));
    check(scope, 'E4: letting go breathes out', !let_.leading && let_.phase === 'out', JSON.stringify(let_));
    // the chip and B lead too
    await page.focus('.stage');
    await page.keyboard.down('b');
    await sleep(500);
    const kb = await nl(page, () => __lab.nightlight.breath.leading);
    await page.keyboard.up('b');
    check(scope, 'E4: B held leads the breath too', kb === true, `${kb}`);
    noErrors(scope, errors);
  });

  // ================================================================ slice 4 --
  // ---------------------------------------------------------------- sheet --
  if (only('sheet')) await guard(`${SCOPE}:sheet`, async (scope, own) => {
    const { ctx, page, errors } = await openNl(browser, 'phone', 'noomi', { initScripts: [wakeStub] });
    own(ctx);
    await openSheet(page);
    const a = await nl(page, () => {
      const sh = document.querySelector('.nightlight .sheet'), q = (x) => sh.querySelector(x);
      const checked = (row) => q(`.nl-row-${row} [aria-checked="true"]`)?.textContent ?? null;
      const cs = getComputedStyle(sh);
      return {
        open: !!__lab.nightlight.sheet, dbg: __lab.nightlight.debug().sheet, label: sh.getAttribute('aria-label'), modal: sh.getAttribute('aria-modal'),
        inScreen: !!sh.closest('.screen.nightlight'), focusIn: sh.contains(document.activeElement),
        bright: [q('.nl-row-brightness input').value, q('.nl-row-brightness input').getAttribute('aria-valuetext'), q('.nl-row-brightness .nl-val').textContent],
        light: [q('.nl-row-light input').value, q('.nl-row-light input').getAttribute('aria-valuetext'), q('.nl-row-light .nl-val').textContent],
        volume: [q('.nl-row-volume input').value, q('.nl-row-volume input').getAttribute('aria-valuetext')],
        speed: checked('speed'), timer: checked('timer'), fade: checked('fade'), motion: checked('motion'), wake: checked('wake'),
        timerSub: q('.nl-row-timer .sub').textContent, fadeSub: q('.nl-row-fade .sub').textContent, wakeSub: q('.nl-row-wake .sub').textContent,
        foot: [...sh.querySelectorAll('.nl-foot')].map((x) => x.textContent), fadeNow: !q('.nl-fade-now').hidden, exit: q('.nl-exit')?.textContent,
        scrim: getComputedStyle(document.querySelector('.nightlight .sheet-scrim')).backgroundColor, bg: cs.backgroundColor, blur: cs.backdropFilter,
        endsAt: __lab.nightlight.clock.endsAt,
      };
    });
    check(scope, 'the sliders button opens the Nightlight sheet inside the screen, focus inside it', a.open && a.dbg && a.label === 'Nightlight' && a.modal === 'true' && a.inScreen && a.focusIn, JSON.stringify(a));
    const endTxt = await nl(page, (t) => new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(t), a.endsAt);
    check(scope, 'every row shows the settings: 40 %, Warm, Slow, 50 %, 30 (Ends at …), On, Gentle, Off',
      a.bright.join() === '40,40 %,40 %' && a.light.join() === '2,Warm,Warm' && a.volume.join() === '50,50 %' && a.speed === 'Slow' && a.timer === '30'
      && a.timerSub === `Ends at ${endTxt}` && a.fade === 'On' && /last 8 minutes$/.test(a.fadeSub) && a.motion === 'Gentle' && a.wake === 'Off' && /hour at most/.test(a.wakeSub), JSON.stringify(a));
    check(scope, 'the footnotes (night sounds and Touch sounds; not a treatment) and the two finishing buttons',
      a.foot.length === 2 && /not Touch sounds/.test(a.foot[0]) && /isn't a treatment/.test(a.foot[1]) && a.fadeNow && a.exit === 'Close Nightlight', JSON.stringify(a.foot));
    check(scope, 'opaque, no blur, over a clear scrim (the scene behind is the live preview)', a.scrim === 'rgba(0, 0, 0, 0)' && /^rgb\(/.test(a.bg) && a.blur === 'none', JSON.stringify({ scrim: a.scrim, bg: a.bg, blur: a.blur }));

    // live preview: a slide moves the scene at once, the setting is stored on release
    await slide(page, '.nightlight .sheet .nl-row-brightness input', 70, false);
    const mid = await nl(page, () => ({ s: __lab.nightlight.settings.brightness, stored: __lab.prefs.get('nightlight')?.brightness ?? null, out: document.querySelector('.nl-row-brightness .nl-val').textContent }));
    await slide(page, '.nightlight .sheet .nl-row-brightness input', 100, true);
    const rel = await nl(page, () => __lab.prefs.get('nightlight')?.brightness ?? null);
    check(scope, 'live preview: a slide changes the light at once (shown "70 %"); release stores it', mid.s === 0.7 && mid.stored !== 0.7 && mid.out === '70 %' && rel === 1, JSON.stringify({ mid, rel }));

    // E8: brightness 100 → 5 (the world falls ≥ 60 %; the Mallow keeps its floor and stays ≥ 2.5× its world)
    const hi = await until(page, () => ({ wb: __lab.nightlight.look.worldB, lum: __lab.nightlight.world.sample()?.lum }), (v) => v.wb > 0.97, 20000);
    await sleep(600);
    const hiLum = await nl(page, () => __lab.nightlight.world.sample()?.lum);
    await slide(page, '.nightlight .sheet .nl-row-brightness input', 5, true);
    const lo = await until(page, () => ({ wb: __lab.nightlight.look.worldB, mb: __lab.nightlight.look.mallowB, state: __lab.nightlight.state }), (v) => v.wb < 0.125, 20000);
    await sleep(600);
    const loLum = await nl(page, () => __lab.nightlight.world.sample()?.lum);
    check(scope, 'E8: brightness 100 → 5: the world luminance falls ≥ 60 %', hi.wb > 0.97 && hiLum > 0 && loLum <= hiLum * 0.4, JSON.stringify({ hiLum, loLum, hi, lo }));
    check(scope, "E8: the Mallow's floor (mallowB ≥ 0.45) and ≥ 2.5× its world while steady", lo.mb >= 0.45 && lo.mb / lo.wb >= 2.5 && ['steady', 'arriving'].includes(lo.state), JSON.stringify(lo));
    await slide(page, '.nightlight .sheet .nl-row-brightness input', 40, true);

    // E9: Light Moon → Ember: blue falls in the still; the Mallow shifts less (its blue ≥ 0.7); a repaint only on release
    await slide(page, '.nightlight .sheet .nl-row-light input', 0, true);
    await until(page, () => __lab.nightlight.look.warmth, (w) => Math.abs(w - 0.2) < 0.01, 20000);
    await sleep(2200);   // the repaint's 1.5 s cross-fade
    const moon = await nl(page, () => ({ s: __lab.nightlight.world.sample(), d: __lab.nightlight.world.debug() }));
    await slide(page, '.nightlight .sheet .nl-row-light input', 3, false);   // a slide in progress: only the grade follows
    await until(page, () => __lab.nightlight.look.warmth, (w) => Math.abs(w - 0.575) < 0.01, 20000);
    await sleep(800);
    const sliding = await nl(page, () => ({ d: __lab.nightlight.world.debug(), out: document.querySelector('.nl-row-light .nl-val').textContent, vt: document.querySelector('.nl-row-light input').getAttribute('aria-valuetext') }));
    await slide(page, '.nightlight .sheet .nl-row-light input', 4, true);
    await until(page, () => __lab.nightlight.look.warmth, (w) => Math.abs(w - 0.7) < 0.01, 20000);
    await sleep(2200);
    const ember = await nl(page, () => ({ s: __lab.nightlight.world.sample(), d: __lab.nightlight.world.debug(), mg: [...__lab.nightlight.look.mallowGain], g: [...__lab.companion.rig.grade] }));
    check(scope, 'E9: Light Moon → Ember: the still’s b/r falls ≥ 30 %', moon.s && ember.s && ember.s.br <= moon.s.br * 0.7, JSON.stringify({ moon: moon.s, ember: ember.s }));
    check(scope, "E9: the Mallow's blue stays ≥ 0.7 (it shifts less than its world)", ember.mg[2] >= 0.7 && ember.g[2] / ember.g[0] >= 0.7, JSON.stringify({ mg: ember.mg, g: ember.g }));
    check(scope, 'E9: during a slide only the grade re-bakes (no repaint, "Candle" shown); release repaints',
      sliding.d.paints === moon.d.paints && sliding.d.bakes > moon.d.bakes && sliding.out === 'Candle' && sliding.vt === 'Candle' && ember.d.paints > sliding.d.paints, JSON.stringify({ moon: moon.d, sliding, ember: ember.d }));
    await slide(page, '.nightlight .sheet .nl-row-light input', 2, true);

    // E10: Speed: the rig's speed, and the breath period scales by k
    await nl(page, () => __lab.nightlight.setMode('breathe'));
    const speeds = {};
    for (const [name, rigK, k] of [['Slowest', 0.62, 1.25], ['Natural', 0.9, 1], ['Slow', 0.75, 1.1]]) {
      await pick(page, 'speed', name);
      const v = await until(page, () => { const b = __lab.nightlight.breath; return { rig: __lab.companion.rig.speed, k: b?.speedK, scale: b ? (b.period - b.holdIn - b.holdOut) / ((b.inhale + b.exhale) * b.slow) : null, set: __lab.nightlight.settings.speed }; }, (x) => Math.abs(x.k - k) < 1e-6, 8000);
      speeds[name] = v;
      check(scope, `E10: Speed ${name}: rig speed ${rigK}, breath period × ${k}`, Math.abs(v.rig - rigK) < 1e-6 && Math.abs(v.scale - k) < 1e-6, JSON.stringify(v));
    }

    // E11: Volume is the session trim
    await slide(page, '.nightlight .sheet .nl-row-volume input', 20, true);
    const vol = await nl(page, () => ({ trim: __lab.sound.debug().trim, s: __lab.nightlight.settings.volume, vt: document.querySelector('.nl-row-volume input').getAttribute('aria-valuetext') }));
    check(scope, 'E11: the Volume slider sets the trim (20 %)', Math.abs(vol.trim - 0.2) < 1e-6 && vol.s === 0.2 && vol.vt === '20 %', JSON.stringify(vol));
    // muted: "Sound is off" with Turn on (and the top bar's Mute button follows)
    await nl(page, () => __lab.prefs.set('sound', false));
    await sleep(150);
    const mu = await nl(page, () => { const r = document.querySelector('.nl-row-volume'); return { slider: !r.querySelector('input').hidden, muted: !r.querySelector('.nl-muted').hidden, txt: r.querySelector('.nl-muted-txt').textContent, mute: document.querySelector('.nightlight .topbar button[aria-label="Mute sound"]').getAttribute('aria-pressed') }; });
    await page.focus('.nightlight .sheet .nl-turn-on');
    await page.click('.nightlight .sheet .nl-turn-on');
    await sleep(200);
    const on = await nl(page, () => { const r = document.querySelector('.nl-row-volume'); return { sound: __lab.prefs.get('sound'), slider: !r.querySelector('input').hidden, focus: document.activeElement === r.querySelector('input'), mute: document.querySelector('.nightlight .topbar button[aria-label="Mute sound"]').getAttribute('aria-pressed') }; });
    check(scope, 'muted: "Sound is off" and Turn on in place of the slider; Turn on brings it back (focus moves to the slider)',
      !mu.slider && mu.muted && mu.txt === 'Sound is off' && mu.mute === 'true' && on.sound === true && on.slider && on.focus && on.mute === 'false', JSON.stringify({ mu, on }));
    await slide(page, '.nightlight .sheet .nl-row-volume input', 50, true);

    // Timer: 10 → the new end in the row and the status; None → "Runs until you close it", the fade needs a timer
    const t0 = await nl(page, () => Date.now() + (__lab.nightlight.debug().skew || 0));
    await pick(page, 'timer', '10');
    const t10 = await nl(page, () => ({ endsAt: __lab.nightlight.clock.endsAt, sub: document.querySelector('.nl-row-timer .sub').textContent, st: document.querySelector('.nl-st-full').textContent, fadeSub: document.querySelector('.nl-row-fade .sub').textContent }));
    const t10Txt = await nl(page, (t) => new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(t), t10.endsAt);
    check(scope, 'Timer 10: restarts from now (ends in 10 min), "Ends at …" in the row and "Until …" in the status; a 3-minute fade',
      Math.abs(t10.endsAt - (t0 + 600000)) < 5000 && t10.sub === `Ends at ${t10Txt}` && t10.st === `Until ${t10Txt}` && /last 3 minutes$/.test(t10.fadeSub), JSON.stringify(t10));
    await pick(page, 'timer', 'None');
    const tn = await nl(page, () => ({ endsAt: __lab.nightlight.clock.endsAt, sub: document.querySelector('.nl-row-timer .sub').textContent, st: document.querySelector('.nl-st-full').textContent,
      fadeOff: [...document.querySelectorAll('.nl-row-fade button')].every((b) => b.disabled), fadeSub: document.querySelector('.nl-row-fade .sub').textContent }));
    check(scope, 'Timer None: no end, "Runs until you close it", "No timer"; Fade out disabled ("Needs a timer")',
      tn.endsAt === null && tn.sub === 'Runs until you close it' && tn.st === 'No timer' && tn.fadeOff && tn.fadeSub === 'Needs a timer', JSON.stringify(tn));
    await pick(page, 'timer', '30');
    await pick(page, 'fade', 'Off');
    const fo = await nl(page, () => ({ ms: __lab.nightlight.clock.fadeMs, sub: document.querySelector('.nl-row-fade .sub').textContent, fade: __lab.nightlight.settings.fade }));
    check(scope, 'Fade out Off: a 10 s settle at the end, and the row says so', fo.ms === 10000 && fo.fade === false && /last few seconds/.test(fo.sub), JSON.stringify(fo));
    await pick(page, 'fade', 'On');

    // Movement Still: effective at once (calm transitions, a static sky)
    await pick(page, 'motion', 'Still');
    await sleep(400);
    const still = await nl(page, () => ({ motion: __lab.nightlight.motion, calm: document.querySelector('.screen.nightlight').classList.contains('nl-calm'), reduced: __lab.companion.rig.opts.reducedMotion, anim: __lab.nightlight.sky.debug().motion }));
    check(scope, 'Movement Still: applied live (calm transitions, the rig reduced, a still sky)', still.motion === 'still' && still.calm && still.reduced && still.anim === 'still', JSON.stringify(still));
    await pick(page, 'motion', 'Gentle');

    // Keep screen on: On asks for a lock; refused → back to Off with "Not available right now"
    await pick(page, 'wake', 'On');
    const wk = await until(page, () => ({ w: { ...window.__wake }, d: __lab.nightlight.debug().wake }), (v) => v.d.held, 4000, 60);
    await pick(page, 'wake', 'Off');
    await nl(page, (refuse) => { window.__wake = { requests: 0, releases: 0, held: 0 }; Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request: () => { window.__wake.requests++; return refuse ? Promise.reject(new DOMException('Not allowed', 'NotAllowedError')) : Promise.resolve(null); } } }); }, true);
    await pick(page, 'wake', 'On');
    const wf = await until(page, () => ({ checked: document.querySelector('.nl-row-wake [aria-checked="true"]').textContent, sub: document.querySelector('.nl-row-wake .sub').textContent, s: __lab.nightlight.settings.keepAwake, req: window.__wake.requests }), (v) => v.checked === 'Off', 4000, 60);
    check(scope, 'Keep screen on: On holds a lock; a refusal switches it back to Off with "Not available right now" (asked once)',
      wk.d.held && wf.checked === 'Off' && wf.sub === 'Not available right now' && wf.s === false && wf.req === 1, JSON.stringify({ wk, wf }));

    // stored: what the person changed, on release (only those fields)
    const stored = await nl(page, () => __lab.prefs.get('nightlight'));
    check(scope, 'stored in the one nightlight pref, field by field', stored.brightness === 0.4 && stored.temp === 0.5 && stored.speed === 'slow' && stored.volume === 0.5 && stored.minutes === 30 && stored.fade === true && stored.motion === 'gentle' && stored.keepAwake === false, JSON.stringify(stored));

    // the chrome stays awake while the sheet is open (8 s without input would put it to sleep)
    await sleep(9000);
    const awake = await nl(page, () => ({ asleep: __lab.nightlight.debug().chromeAsleep, open: !!__lab.nightlight.sheet }));
    check(scope, 'the chrome stays awake while the sheet is open (9 s without input)', awake.open && !awake.asleep, JSON.stringify(awake));

    // focus is trapped; Escape closes the sheet first (the session goes on) and focus returns to the sliders button
    await page.focus('.nightlight .sheet .done');
    await page.keyboard.press('Tab');
    const wrapF = await nl(page, () => document.activeElement?.closest('.nl-row')?.className || document.activeElement?.className);
    await page.keyboard.press('Shift+Tab');
    const wrapB = await nl(page, () => document.activeElement?.className);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !__lab.nightlight.sheet, null, { timeout: 5000 });
    await sleep(400);
    const esc = await nl(page, () => ({ view: __lab.nightlight.view, state: __lab.nightlight.state, route: __lab.route, focus: document.activeElement?.getAttribute('aria-label'), sheets: document.querySelectorAll('.nightlight .sheet').length }));
    check(scope, 'focus is trapped in the sheet (Tab from Done wraps to the first control, Shift+Tab back to Done)', /nl-row-brightness/.test(wrapF) && wrapB === 'done', `${wrapF} / ${wrapB}`);
    check(scope, 'E15: Escape closes the sheet first; the Nightlight goes on and focus returns to the sliders button',
      esc.view === 'session' && esc.state !== 'leaving' && esc.route === 'nightlight' && esc.focus === 'Nightlight settings' && esc.sheets === 0, JSON.stringify(esc));
    // Escape with focus outside the sheet (a click on its plain text) still only closes the sheet
    await openSheet(page);
    await page.click('.nightlight .sheet .nl-foot');
    await page.keyboard.press('Escape');
    await sleep(500);
    const esc2 = await nl(page, () => ({ sheet: !!__lab.nightlight.sheet, state: __lab.nightlight.state, route: __lab.route }));
    check(scope, 'Escape with focus on the page (not in a control) closes only the sheet', !esc2.sheet && esc2.state !== 'leaving' && esc2.route === 'nightlight', JSON.stringify(esc2));

    // Fade out now: the sheet closes and the light goes down; the button hides while fading; Close Nightlight leaves
    await openSheet(page);
    await page.click('.nightlight .sheet .nl-fade-now');
    const fading = await until(page, () => ({ state: __lab.nightlight.state, sheet: !!__lab.nightlight.sheet, endsIn: __lab.nightlight.clock.endsAt - __lab.nightlight.clock.now(), sr: __lab.nightlight.debug().sr.slice(-1)[0] }), (v) => v.state === 'fading', 8000, 80);
    check(scope, 'Fade out now: the sheet closes, the fade starts (ends within 12 s), "Fading out."', fading.state === 'fading' && !fading.sheet && fading.endsIn <= 12000 && fading.sr === 'Fading out.', JSON.stringify(fading));
    await openSheet(page);
    const hid = await nl(page, () => document.querySelector('.nightlight .sheet .nl-fade-now').hidden);
    await page.click('.nightlight .sheet .nl-exit');
    await page.waitForFunction(() => __lab.route === 'home', null, { timeout: T });
    const gone = await nl(page, () => ({ nl: __lab.nightlight, rec: sessionStorage.getItem('hm.sensorylab.nightlight.session.v1'), trim: __lab.sound.trim, sheets: document.querySelectorAll('.sheet').length, wake: window.__wake }));
    check(scope, 'while fading the sheet hides Fade out now; Close Nightlight says goodnight and goes home (record cleared, trim 1)', hid && gone.nl === null && gone.rec === null && gone.trim === 1 && gone.sheets === 0, JSON.stringify({ hid, gone }));
    noErrors(scope, errors);
  });

  // ---------------------------------------------------------------- E14 --
  if (only('motion')) await guard(`${SCOPE}:motion`, async (scope, own) => {
    const { ctx, page, errors } = await openNl(browser, 'phone', 'pipzi', { prefs: { motion: 'reduced' } });
    own(ctx);
    await openSheet(page);
    const a = await nl(page, () => {
      const r = document.querySelector('.nl-row-motion'), b = [...r.querySelectorAll('button')];
      return { motion: __lab.nightlight.motion, setting: __lab.nightlight.settings.motion, reduced: __lab.companion.rig.opts.reducedMotion, gentle: b[0].disabled,
        checked: r.querySelector('[aria-checked="true"]').textContent, sub: r.querySelector('.sub').textContent, subShown: !r.querySelector('.sub').hidden, calm: document.querySelector('.screen.nightlight').classList.contains('nl-calm'),
        sheetTx: getComputedStyle(document.querySelector('.nightlight .sheet')).transform };
    });
    check(scope, 'E14: lab Motion Reduced: Gentle disabled ("Your device asks for less motion"), effective Less, the rig reduced',
      a.motion === 'less' && a.setting === 'gentle' && a.reduced && a.gentle && a.checked === 'Less' && a.sub === 'Your device asks for less motion' && a.subShown && a.calm, JSON.stringify(a));
    check(scope, 'E14: with less motion the sheet fades in place (no slide)', a.sheetTx === 'none', a.sheetTx);
    await page.focus('.nl-row-motion [aria-checked="true"]');
    await page.keyboard.press('ArrowLeft');
    const l = await nl(page, () => ({ checked: document.querySelector('.nl-row-motion [aria-checked="true"]').textContent, focus: document.activeElement.textContent, motion: __lab.nightlight.motion }));
    await page.keyboard.press('ArrowRight');
    const r = await nl(page, () => ({ checked: document.querySelector('.nl-row-motion [aria-checked="true"]').textContent, focus: document.activeElement.textContent }));
    check(scope, 'E14: arrow keys skip the disabled Gentle (Less ← wraps to Still, → back to Less)', l.checked === 'Still' && l.focus === 'Still' && l.motion === 'still' && r.checked === 'Less' && r.focus === 'Less', JSON.stringify({ l, r }));
    // the lab setting back to full: Gentle comes back (the person's own choice, Less now, is kept)
    await nl(page, () => __lab.prefs.set('motion', 'full'));
    await sleep(200);
    const b = await nl(page, () => ({ gentle: document.querySelector('.nl-row-motion button').disabled, sub: document.querySelector('.nl-row-motion .sub').hidden, motion: __lab.nightlight.motion }));
    check(scope, 'E14: the lab back to full motion: Gentle available again, the sub-label gone', !b.gentle && b.sub && b.motion === 'less', JSON.stringify(b));
    noErrors(scope, errors);
  });

  // ------------------------------------------------------- E24, E25, E15 --
  if (only('access')) await guard(`${SCOPE}:access`, async (scope, own) => {
    const { ctx, page, errors } = await openNl(browser, 'phone', 'blubi');
    own(ctx);
    await nl(page, () => __lab.nightlight.setMode('breathe'));   // a status chip to tab to
    await sleep(600);
    // E25: Tab order from the stage: Close → settings → sound → the mode radio → the status chip
    await page.focus('.nightlight .stage');
    const order = [];
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      order.push(await nl(page, () => { const e = document.activeElement; return e.getAttribute('aria-label') || e.dataset.chip || e.textContent.trim(); }));
    }
    check(scope, 'E25: Tab order: Close → Nightlight settings → Mute sound → the chosen mode → the status chip',
      JSON.stringify(order) === JSON.stringify(['Close', 'Nightlight settings', 'Mute sound', 'Breathing Together', 'breathe']), JSON.stringify(order));
    // arrows inside the mode group move and choose; keys 1–5 from the stage; ↑ / ↓ brightness
    await page.focus('.nl-modes [aria-checked="true"]');
    await page.keyboard.press('ArrowRight');
    await sleep(200);
    const arrow = await nl(page, () => ({ mode: __lab.nightlight.mode, focus: document.activeElement.dataset.mode, bright: __lab.nightlight.settings.brightness }));
    await page.focus('.nightlight .stage');
    await page.keyboard.press('Digit4'); await sleep(200);
    const k4 = await nl(page, () => __lab.nightlight.mode);
    await page.keyboard.press('ArrowDown'); await sleep(200);
    const down = await nl(page, () => ({ b: __lab.nightlight.settings.brightness, sr: __lab.nightlight.debug().sr.slice(-1)[0] }));
    await page.keyboard.press('Digit1'); await sleep(200);
    check(scope, 'E25: arrows in the mode group choose (Breathe → Sleepy, brightness untouched); 4 → Drift; ↓ → 30 % (announced)',
      arrow.mode === 'sleepy' && arrow.focus === 'sleepy' && arrow.bright === 0.4 && k4 === 'drift' && Math.abs(down.b - 0.3) < 1e-6 && down.sr === 'Brightness 30 %.', JSON.stringify({ arrow, k4, down }));
    const sr = await nl(page, () => __lab.nightlight.debug().sr);
    const allowed = /^(Nightlight on with \w+( until .+)?\.|Moonlight\.|Breathing Together\.|Sleepy Companion\.|Ambient Drift\.|Quiet Company\.|Brightness \d+ %\.|Fading out\.|Ten more minutes\.|Nightlight finished\.|Sound paused\. Tap to bring it back\.)$/;
    check(scope, 'E25: only the listed announcements (never breaths, blinks or captions)', sr.length >= 4 && sr.every((x) => allowed.test(x)), JSON.stringify(sr));

    // E24: chrome sleep: faded (Close at 0.35 and tappable), taps fall through, a tap or Tab wakes, nothing hidden
    await page.mouse.move(5, 5);
    await nl(page, () => __lab.nightlight.sleepChrome());
    await sleep(1500);
    const z = await nl(page, () => {
      const top = [...document.querySelectorAll('.nightlight .topbar > *')].map((e) => +getComputedStyle(e).opacity);
      const bottom = +getComputedStyle(document.querySelector('.nightlight .bottom')).opacity;
      const close = document.querySelector('.nightlight .topbar button[aria-label="Close"]'), cr = close.getBoundingClientRect();
      const chip = document.querySelector('.nl-modes [aria-checked="true"]').getBoundingClientRect();
      const under = document.elementFromPoint(chip.left + chip.width / 2, chip.top + chip.height / 2);
      const hidden = [...document.querySelectorAll('.nightlight .topbar, .nightlight .topbar *, .nightlight .bottom, .nightlight .bottom *')]
        .filter((e) => !e.closest('svg') && (e.getAttribute('aria-hidden') === 'true' || e.hasAttribute('inert'))).map((e) => e.className || e.tagName);
      return { top, bottom, closeOp: +getComputedStyle(close).opacity, closeHit: document.elementFromPoint(cr.left + cr.width / 2, cr.top + cr.height / 2)?.closest('button')?.getAttribute('aria-label'),
        closeSize: [cr.width, cr.height], under: under?.closest('.stage') ? 'stage' : under?.className || under?.tagName, hidden, pt: [chip.left + chip.width / 2, chip.top + chip.height / 2] };
    });
    check(scope, 'E24: asleep: the top bar and bottom fade (< 0.1), Close stays at 0.35, ≥ 40 px and tappable',
      z.top.slice(1).every((o) => o < 0.1) && z.bottom < 0.1 && Math.abs(z.closeOp - 0.35) < 0.01 && z.closeHit === 'Close' && z.closeSize.every((v) => v >= 40), JSON.stringify(z));
    check(scope, 'E24: a tap on a faded chip falls through to the stage; nothing is aria-hidden or inert', z.under === 'stage' && !z.hidden.length, JSON.stringify({ under: z.under, hidden: z.hidden }));
    await page.mouse.click(z.pt[0], z.pt[1]);
    await sleep(300);
    const woke = await nl(page, () => ({ asleep: __lab.nightlight.debug().chromeAsleep, mode: __lab.nightlight.mode }));
    await page.focus('.nightlight .stage');   // (focusing the stage itself would wake it: focus first, then sleep)
    await nl(page, () => __lab.nightlight.sleepChrome());
    const slept = await nl(page, () => __lab.nightlight.debug().chromeAsleep);
    await page.keyboard.press('Tab');
    await sleep(200);
    const tabWoke = await nl(page, () => __lab.nightlight.debug().chromeAsleep);
    check(scope, 'E24: a tap wakes the chrome without choosing the faded chip; Tab wakes it too', !woke.asleep && woke.mode === 'moonlight' && slept && !tabWoke, JSON.stringify({ woke, slept, tabWoke }));

    // E15: Close works while the chrome sleeps: the goodnight, home within about a second
    await page.mouse.move(5, 5);
    await nl(page, () => { document.activeElement?.blur(); __lab.nightlight.sleepChrome(); });
    await sleep(1400);
    const cb = await nl(page, () => { const r = document.querySelector('.nightlight .topbar button[aria-label="Close"]').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    const t0 = Date.now();
    await page.mouse.click(cb[0], cb[1]);
    await page.waitForFunction(() => __lab.route === 'home', null, { timeout: T, polling: 25 });
    const ms = Date.now() - t0;
    const after = await nl(page, () => ({ nl: __lab.nightlight, trim: __lab.sound.trim, rec: sessionStorage.getItem('hm.sensorylab.nightlight.session.v1') }));
    check(scope, 'E15: Close while asleep: one tap, the goodnight, home within ~1 s; record cleared, trim 1', ms <= 1500 && after.nl === null && after.trim === 1 && after.rec === null, `${ms} ms ${JSON.stringify(after)}`);
    noErrors(scope, errors);
  });

  // ----------------------------------------------------------------- E26 --
  if (only('theme')) await guard(`${SCOPE}:theme`, async (scope, own) => {
    const { ctx, page, errors } = await openNl(browser, 'phone', 'noomi', { prefs: { theme: 'light' } });
    own(ctx);
    await nl(page, () => __lab.nightlight.setMode('quiet'));   // a status chip too
    await sleep(800);
    await openSheet(page);
    const audit = () => nl(page, () => {
      const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
      const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      const L = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
      const over = (top, under) => [0, 1, 2].map((i) => top[i] * top[3] + under[i] * (1 - top[3])).concat(1);
      const wl = __lab.nightlight?.world?.sample()?.lum ?? 0;            // the world behind, as a grey of its mean luminance
      const g = Math.round(255 * (wl <= 0.0031308 ? wl * 12.92 : 1.055 * wl ** (1 / 2.4) - 0.055));
      const world = [g, g, g, 1];
      const bgOf = (el) => {   // the element's own and its ancestors' backgrounds, composited over the world
        const stack = [];
        for (let e = el; e && e !== document.body; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c[3] > 0) stack.push(c); if (e.classList.contains('screen')) break; }
        return stack.reverse().reduce((acc, c) => over(c, acc), world);
      };
      const ratio = (el) => { const fg = parse(getComputedStyle(el).color), bg = bgOf(el); const a = L(over(fg, bg)), b = L(bg); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
      const sel = ['.nl-modes button', '.nl-chip', '.sheet .nl-lbl', '.sheet .sub', '.sheet .nl-foot', '.sheet .nl-seg button', '.sheet .btn-quiet', '.sheet .done', '.nl-endcard .end-cap', '.nl-endcard .end-line', '.nl-endcard button'];
      const rows = [];
      for (const s of sel) for (const el of document.querySelectorAll(`.nightlight ${s}`)) { if (el.offsetParent === null || el.closest('[hidden]')) continue; rows.push({ s, t: el.textContent.trim().slice(0, 24), r: +ratio(el).toFixed(2) }); }
      const scr = document.querySelector('.screen.nightlight'), cs = getComputedStyle(scr);
      const blur = ['.nl-modes', '.icon-btn', '.nl-chip', '.sheet', '.end-card'].map((s) => [s, document.querySelector(`.nightlight ${s}`) ? getComputedStyle(document.querySelector(`.nightlight ${s}`)).backdropFilter : null]);
      return { theme: document.documentElement.dataset.theme || null, light: matchMedia('(prefers-color-scheme: light)').matches, text1: cs.getPropertyValue('--text-1').trim(), chipOn: cs.getPropertyValue('--chip-on').trim(), scheme: cs.colorScheme, bg: cs.backgroundColor, wl, blur, rows };
    });
    const a = await audit();
    const chipA = (() => { const m = a.chipOn.match(/rgba\(([^)]+)\)/); return m ? +m[1].split(',')[3] : 1; })();
    check(scope, 'E26: light theme: the screen keeps the night tokens (text, dark scheme, black), the dim chip colour', a.text1 === '#e9e3fa' && a.scheme === 'dark' && a.bg === 'rgb(0, 0, 0)' && chipA <= 0.3, JSON.stringify({ theme: a.theme, text1: a.text1, chipOn: a.chipOn, scheme: a.scheme, bg: a.bg }));
    check(scope, 'E26: no blur on the night chrome, the sheet or the chips', a.blur.every(([, v]) => v === null || v === 'none'), JSON.stringify(a.blur));
    const low = a.rows.filter((r) => r.r < 4.5);
    check(scope, 'E26: text on the chrome and in the sheet ≥ 4.5:1 (over the world behind it)', a.rows.length >= 20 && !low.length, JSON.stringify({ low, n: a.rows.length, wl: a.wl }));
    // the same at full brightness (the brightest world behind the chrome)
    await slide(page, '.nightlight .sheet .nl-row-brightness input', 100, true);
    await until(page, () => __lab.nightlight.look.worldB, (v) => v > 0.97, 20000);
    await sleep(800);
    const full = await audit();
    const lowFull = full.rows.filter((r) => r.r < 4.5);
    check(scope, 'E26: and at 100 % brightness', full.rows.length >= 20 && !lowFull.length && full.wl > a.wl, JSON.stringify({ low: lowFull, wl: full.wl, min: Math.min(...full.rows.map((r) => r.r)) }));
    // the end card, in the same theme
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !__lab.nightlight.sheet, null, { timeout: 5000 });
    await nl(page, () => { const c = __lab.nightlight.clock; __lab.nightlight.skew(c.endsAt - c.now() + 1000); });
    await page.waitForFunction(() => __lab.nightlight?.view === 'end', null, { timeout: T });
    await nl(page, () => document.querySelector('.nl-endcard').classList.add('lit'));
    await sleep(800);
    const e = await audit();
    const endRows = e.rows.filter((r) => r.s.startsWith('.nl-endcard'));
    check(scope, 'E26: the end card: night tokens, no blur, text ≥ 4.5:1', endRows.length >= 3 && endRows.every((r) => r.r >= 4.5) && e.blur.find(([s]) => s === '.end-card')[1] === 'none' && e.text1 === '#e9e3fa', JSON.stringify({ endRows, blur: e.blur }));
    noErrors(scope, errors);
  });

  // ----------------------------------------------------------------- E27 --
  if (only('scroll')) await guard(`${SCOPE}:scroll`, async (scope, own) => {
    const { ctx, page, errors } = await openNl(browser, 'small', 'loomi');
    own(ctx);
    const pos = () => nl(page, () => ({ y: scrollY, x: scrollX, se: document.scrollingElement.scrollTop, lab: document.getElementById('lab').scrollTop, scr: document.querySelector('.screen.nightlight').scrollTop, scale: visualViewport.scale, row: document.querySelector('.nl-modes').scrollLeft }));
    const g = await H.geo(page);
    const cx = g.ox + g.cx, cy = g.oy + g.mid;
    // a drag on the stage (pointer) and swipes on the stage and the mode row (touch)
    await page.mouse.move(cx, cy); await page.mouse.down(); await page.mouse.move(cx, cy - 160, { steps: 8 }); await page.mouse.move(cx + 60, cy + 120, { steps: 8 }); await page.mouse.up();
    await H.touch(page, [{ t: 0, points: [{ x: 40, y: cy - 60 }] }, { t: 40, points: [{ x: 40, y: cy - 200 }] }, { t: 80, points: [{ x: 40, y: cy - 320 }] }, { t: 120, points: [] }]);
    const row = await nl(page, () => { const r = document.querySelector('.nl-modes').getBoundingClientRect(); return { x: r.left + r.width - 30, y: r.top + r.height / 2 }; });
    await H.touch(page, [{ t: 0, points: [{ x: row.x, y: row.y }] }, { t: 50, points: [{ x: row.x - 90, y: row.y - 6 }] }, { t: 100, points: [{ x: row.x - 180, y: row.y - 40 }] }, { t: 150, points: [] }]);
    await sleep(400);
    const a = await pos();
    // a pinch on the stage
    await H.touch(page, [{ t: 0, points: [{ x: cx - 20, y: cy, id: 1 }, { x: cx + 20, y: cy, id: 2 }] }, { t: 60, points: [{ x: cx - 70, y: cy - 30, id: 1 }, { x: cx + 70, y: cy + 30, id: 2 }] },
      { t: 120, points: [{ x: cx - 120, y: cy - 60, id: 1 }, { x: cx + 120, y: cy + 60, id: 2 }] }, { t: 180, points: [] }]);
    await sleep(400);
    const b = await pos();
    check(scope, 'E27: drags on the stage and swipes on the mode row never scroll the page', a.y === 0 && a.x === 0 && a.se === 0 && a.lab === 0 && a.scr === 0, JSON.stringify(a));
    check(scope, 'E27: a pinch on the stage never zooms', b.scale === 1 && b.y === 0 && b.se === 0, JSON.stringify(b));
    noErrors(scope, errors);
  });

  // ----------------------------------------------------------------- E22 --
  if (only('privacy')) await guard(`${SCOPE}:privacy`, async (scope, own) => {
    const spies = () => {
      window.__asked = { notify: 0, sw: 0 };
      try { if (window.Notification) { const rp = Notification.requestPermission; Notification.requestPermission = (...a) => { window.__asked.notify++; return rp.apply(Notification, a); }; } } catch { /* ignore */ }
      try { const sw = navigator.serviceWorker; if (sw) { const reg = sw.register.bind(sw); sw.register = (...a) => { window.__asked.sw++; return reg(...a); }; } } catch { /* ignore */ }
    };
    const { ctx, page, errors } = await openNl(browser, 'phone', 'zuzu', { initScripts: [H.INIT.timerSpy, spies] });
    own(ctx);
    const reqs = [];
    page.on('request', (r) => reqs.push(`${r.method()} ${r.url()}`));
    const p = await bodyPoint(page);
    await page.mouse.click(p.x, p.y);
    for (const m of ['breathe', 'sleepy', 'drift', 'quiet', 'moonlight']) { await nl(page, (m) => __lab.nightlight.setMode(m), m); await sleep(700); }
    await openSheet(page);
    await slide(page, '.nightlight .sheet .nl-row-brightness input', 60, true);
    await page.keyboard.press('Escape');
    await sleep(1500);
    const a = await nl(page, async () => ({ regs: (await navigator.serviceWorker?.getRegistrations?.() || []).length, asked: window.__asked, perm: window.Notification?.permission ?? null,
      intervals: Object.entries(__timers().created).filter(([f, c]) => /nightlight|frame-pacer|screen-wake/.test(f) && c.interval > 0) }));
    check(scope, 'E22: no service worker, no notification asked for', a.regs === 0 && a.asked.sw === 0 && a.asked.notify === 0 && a.perm !== 'granted', JSON.stringify(a));
    check(scope, 'E22: no network request once the screen is up (taps, every mode, the sheet)', reqs.length === 0, JSON.stringify(reqs.slice(0, 8)));
    check(scope, 'E22: no setInterval from any Nightlight file', !a.intervals.length, JSON.stringify(a.intervals));
    // nothing sounds, and no voice is made, while hidden
    await nl(page, () => { const s = __lab.sound, v = s._voice.bind(s); window.__voices = 0; s._voice = (...x) => { window.__voices++; return v(...x); }; });
    await H.setHidden(page, true);
    await nl(page, () => { window.__voices = 0; });
    await sleep(2500);
    const hid = await nl(page, () => ({ voices: window.__voices, live: __lab.sound.live.size, bed: __lab.nightlight.bed.debug().alive, state: __lab.sound.debug().state }));
    await H.setHidden(page, false);
    // (a voice stopped as the page hid can stay listed until the suspended context runs again: it is silent)
    check(scope, 'E22: hidden: no voice is made, the bed is not alive, the audio is suspended', hid.voices === 0 && !hid.bed && hid.state !== 'running', JSON.stringify(hid));
    noErrors(scope, errors);
  });

  // ----------------------------------------------------------------- E29 --
  if (only('isolation')) await guard(`${SCOPE}:isolation`, async (scope, own) => {
    const { ctx, page, errors } = await openNl(browser, 'phone', 'boppo');
    own(ctx);
    const dna0 = await nl(page, () => JSON.stringify(__lab.dna.data ?? localStorage.getItem('hm.sensorylab.comfort.v1')));
    const p = await bodyPoint(page);
    await page.mouse.click(p.x, p.y);
    await nl(page, () => { __lab.nightlight.setMode('quiet'); __lab.nightlight.set('volume', 0.3); __lab.nightlight.set('brightness', 0.2); });
    await openSheet(page);
    await page.keyboard.press('Escape');
    await sleep(800);
    await nl(page, () => __lab.ctx.navigate('/touchtalk'));
    await page.waitForFunction(() => __lab.route === 'touchtalk' && __lab.companion?.rig?.soft, null, { timeout: T });
    await sleep(600);
    const q = await bodyPoint(page);
    await page.mouse.click(q.x, q.y);
    await sleep(500);
    await page.keyboard.press('Digit2');
    await page.keyboard.press('ArrowDown');
    await sleep(300);
    const a = await nl(page, () => {
      const c = __lab.companion, r = c.rig, t = __lab.dna.tuning();
      return { route: __lab.route, nl: __lab.nightlight, trim: __lab.sound.trim, resting: __lab.sound.resting, grade: [...r.grade], cap: r.frameCap, filter: c.persona.filter, peek: r.peekParams,
        speed: r.speed, dnaSpeed: t.speed, motion: r.motionScale ?? null, night: document.querySelectorAll('.nightlight, .nl-still, .nl-sky, .sheet').length,
        dna: JSON.stringify(__lab.dna.data ?? localStorage.getItem('hm.sensorylab.comfort.v1')), face: JSON.stringify(r.faceOverride || {}) };
    });
    check(scope, 'E29: TouchTalk afterwards: trim 1, not resting after a tap, no Nightlight handle or elements', a.route === 'touchtalk' && a.nl === null && a.trim === 1 && !a.resting && a.night === 0, JSON.stringify(a));
    check(scope, 'E29: its Mallow is untouched: identity grade, no frame cap, no filter, default peek, Comfort DNA speed',
      a.grade.join() === '1,1,1' && a.cap === null && a.filter === null && a.peek === null && Math.abs(a.speed - a.dnaSpeed) < 1e-6, JSON.stringify(a));
    check(scope, 'E29: keys 1–5 and ↑/↓ are inert there (still TouchTalk, no Nightlight); Comfort DNA unchanged', a.route === 'touchtalk' && a.nl === null && a.dna === dna0, a.dna === dna0 ? '' : `${dna0} → ${a.dna}`);
    noErrors(scope, errors);
  });

  // ----------------------------------------------------------------- E23 --
  if (only('layout')) await guard(`${SCOPE}:layout`, async (scope) => {
    for (const vp of ['phone', 'p375', 'small', 'android', 'desktop', 'land', 'land-small']) {
      const r = await openNl(browser, vp, 'loomi');
      const sc = `${scope}:${vp}`;
      try {
        await sleep(800);
        await H.layout(r.page, sc, { scrollers: ['.nl-modes'] });
        const d = await nl(r.page, () => {
          const row = document.querySelector('.nl-modes'), r0 = row.getBoundingClientRect(), on = row.querySelector('[aria-checked="true"]').getBoundingClientRect();
          const st = document.querySelector('.nl-status'), cap = document.querySelector('.nl-caption').getBoundingClientRect(), top = document.querySelector('.nightlight .topbar').getBoundingClientRect();
          return { inView: on.left >= r0.left - 1 && on.right <= r0.right + 1, scrolls: row.scrollWidth > row.clientWidth, sub: document.querySelector('.nightlight .topbar .title small').textContent,
            status: getComputedStyle(st).display, stText: getComputedStyle(document.querySelector('.nl-st')).display, capBelowTop: cap.top >= top.bottom - 1 || cap.height === 0, vw: innerWidth };
        });
        check(sc, 'the chosen mode is in view in the mode row', d.inView, JSON.stringify(d));
        if (vp.startsWith('land')) check(sc, 'landscape: the time moves into the subtitle; the status text hides, its chip stays inline', /· (until|no timer)/.test(d.sub) && d.stText === 'none', JSON.stringify(d));
        else check(sc, 'portrait: the subtitle is "{Mode} · {Mallow}", the status row shows', d.sub === 'Moonlight · Loomi' && d.status !== 'none', JSON.stringify(d));
        await H.shot(r.page, out, `nightlight-${vp}-steady`);

        // asleep: Close still visible and ≥ 40 px
        await r.page.mouse.move(2, 2);
        await nl(r.page, () => __lab.nightlight.sleepChrome());
        await sleep(1400);
        const z = await nl(r.page, () => { const c = document.querySelector('.nightlight .topbar button[aria-label="Close"]'), cr = c.getBoundingClientRect(); return { op: +getComputedStyle(c).opacity, w: cr.width, h: cr.height, on: cr.left >= 0 && cr.top >= 0 && cr.right <= innerWidth && cr.bottom <= innerHeight }; });
        check(sc, 'E15: asleep: Close visible (0.35), on screen, ≥ 40 px', Math.abs(z.op - 0.35) < 0.01 && z.w >= 40 && z.h >= 40 && z.on, JSON.stringify(z));
        await H.shot(r.page, out, `nightlight-${vp}-asleep`);

        // the sheet: fits, scrolls, Done reachable, ≥ 40 px controls, no sideways overflow; beside the Mallow where it is a side panel
        await openSheet(r.page);
        const sh = await nl(r.page, () => {
          const s = document.querySelector('.nightlight .sheet'), sr = s.getBoundingClientRect();
          const ctl = [...s.querySelectorAll('button, input')].filter((e) => e.offsetParent !== null && !e.closest('[hidden]'));
          const small = ctl.map((e) => { const b = e.getBoundingClientRect(); return { t: (e.textContent || e.getAttribute('aria-label') || e.type).trim().slice(0, 20), w: Math.round(b.width), h: Math.round(b.height) }; }).filter((b) => b.w < 39.5 || b.h < 39.5);
          const wide = [...s.querySelectorAll('*')].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && (b.left < sr.left - 0.5 || b.right > sr.right + 0.5); }).map((e) => e.className || e.tagName).slice(0, 5);
          const rig = __lab.companion.rig, o = rig.canvas.parentElement.getBoundingClientRect(), b = rig.bodyRect();
          const body = { l: o.left + b.cx - b.w / 2, r: o.left + b.cx + b.w / 2, t: o.top + b.top, b: o.top + b.bottom };
          const side = sr.top <= 1 && sr.height >= innerHeight - 1;
          return { rect: [sr.left, sr.top, sr.width, sr.height].map(Math.round), side, scrolls: s.scrollHeight > s.clientHeight, small, wide, hscroll: s.scrollWidth > s.clientWidth + 1,
            inView: sr.left >= -0.5 && sr.right <= innerWidth + 0.5 && sr.bottom <= innerHeight + 0.5, mallowClear: body.r <= sr.left + 1 || body.l >= sr.right - 1, body };
        });
        check(sc, 'the sheet fits the screen with no sideways overflow; every control ≥ 40 px', sh.inView && !sh.hscroll && !sh.wide.length && !sh.small.length, JSON.stringify(sh));
        if (['desktop', 'land', 'land-small'].includes(vp)) check(sc, 'a side panel: the Mallow stays in view beside it (live preview)', sh.side && sh.mallowClear, JSON.stringify(sh));
        else check(sc, 'a bottom sheet that leaves the top of the scene in view', !sh.side && sh.rect[1] >= 120, JSON.stringify(sh.rect));
        await H.shot(r.page, out, `nightlight-${vp}-sheet`);
        const done = await nl(r.page, () => { const s = document.querySelector('.nightlight .sheet'); s.scrollTop = s.scrollHeight; const d = s.querySelector('.done').getBoundingClientRect(), e = s.querySelector('.nl-exit').getBoundingClientRect(); return { d: d.bottom <= innerHeight + 0.5 && d.top >= 0, exit: e.bottom <= d.top + 1 && e.top >= s.getBoundingClientRect().top - 0.5 }; });
        check(sc, 'scrolled to its end: Done and the last row are reachable (Done does not cover them)', done.d && done.exit, JSON.stringify(done));
        await r.page.click('.nightlight .sheet .done');
        await r.page.waitForFunction(() => !__lab.nightlight.sheet, null, { timeout: 5000 });

        // fading (half way through the fade), then the end view
        await nl(r.page, () => { const c = __lab.nightlight.clock; __lab.nightlight.skew(c.fadeFrom - c.now() + c.fadeMs / 2); });
        await r.page.waitForFunction(() => __lab.nightlight.state === 'fading', null, { timeout: T });
        await wakeUi(r.page);
        await sleep(600);
        await H.layout(r.page, `${sc}:fading`, { scrollers: ['.nl-modes'] });
        await H.shot(r.page, out, `nightlight-${vp}-fading`);
        await nl(r.page, () => { const c = __lab.nightlight.clock; __lab.nightlight.skew(c.endsAt - c.now() + 1000); });
        await r.page.waitForFunction(() => __lab.nightlight?.view === 'end', null, { timeout: T });
        await nl(r.page, () => document.querySelector('.nl-endcard').classList.add('lit'));
        await sleep(800);
        await H.layout(r.page, `${sc}:end`, { band: false });
        await H.shot(r.page, out, `nightlight-${vp}-end`);
        noErrors(sc, r.errors);
      } finally { await r.ctx.close(); }
    }
  });
}

/** A navigator.wakeLock stub that records requests and releases (refuse: every request is refused). */
function wakeStub(refuse) {
  window.__wake = { requests: 0, releases: 0, held: 0 };
  const sentinel = () => {
    const L = new Set();
    const s = { type: 'screen', released: false, addEventListener: (t, f) => L.add(f), removeEventListener: (t, f) => L.delete(f),
      release() { if (!s.released) { s.released = true; window.__wake.releases++; window.__wake.held--; L.forEach((f) => f()); } return Promise.resolve(); } };
    return s;
  };
  Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request: () => {
    window.__wake.requests++;
    if (refuse) return Promise.reject(new DOMException('Not allowed', 'NotAllowedError'));
    window.__wake.held++;
    return Promise.resolve(sentinel());
  } } });
}

module.exports = { run };

if (require.main === module) {
  (async () => {
    const out = process.argv[2] || OUT_DEFAULT;
    const browser = await H.launch();
    try { await run(browser, { out }); } finally { await browser.close(); }
    const { failed } = H.writeReport(out, 'e2e-phase3-nightlight', { prefix: `${SCOPE}:` });
    process.exit(failed ? 1 : 0);
  })().catch((e) => { console.error(e); process.exit(2); });
}
