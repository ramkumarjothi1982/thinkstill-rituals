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
      const kinds = new Set();
      for (let i = 0; i < 4; i++) {
        await r2.page.mouse.click(q.x, q.y);
        for (let k = 0; k < 4; k++) {
          const s = await nl(r2.page, () => { const r = __lab.companion.rig; return { hop: r.body.hop, kinds: r.overlays.map((o) => o.kind) }; });
          hop = Math.max(hop, s.hop); s.kinds.forEach((x) => kinds.add(x));
          await sleep(150);
        }
        await sleep(1000);
      }
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
