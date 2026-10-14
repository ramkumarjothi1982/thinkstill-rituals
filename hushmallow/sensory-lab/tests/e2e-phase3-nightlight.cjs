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
//   layout     phone, 320 × 568 and 568 × 320: no overlap, on screen, targets ≥ 40 px, the Mallow in its band
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

  // --------------------------------------------------------------- layout --
  if (only('layout')) await guard(`${SCOPE}:layout`, async (scope) => {
    for (const vp of ['phone', 'small', 'land-small']) {
      const r = await openNl(browser, vp, 'loomi');
      const sc = `${scope}:${vp}`;
      try {
        await sleep(800);
        await H.layout(r.page, sc, { scrollers: ['.nl-modes'] });
        const d = await nl(r.page, () => {
          const row = document.querySelector('.nl-modes'), r0 = row.getBoundingClientRect(), on = row.querySelector('[aria-checked="true"]').getBoundingClientRect();
          return { inView: on.left >= r0.left - 1 && on.right <= r0.right + 1, scrolls: row.scrollWidth > row.clientWidth, sub: document.querySelector('.nightlight .topbar .title small').textContent, status: getComputedStyle(document.querySelector('.nl-status')).display };
        });
        check(sc, 'the chosen mode is in view in the mode row', d.inView, JSON.stringify(d));
        if (vp === 'land-small') check(sc, 'landscape: the time moves into the subtitle', /· (until|no timer)/.test(d.sub), d.sub);
        await H.shot(r.page, out, `nightlight-${vp}-steady`);
        noErrors(sc, r.errors);
      } finally { await r.ctx.close(); }
    }
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
