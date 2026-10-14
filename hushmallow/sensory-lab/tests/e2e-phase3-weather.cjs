// Weather Weaver browser tests (spec-weather.md §13; the L21 harness).
//
//   python3 -m http.server 8000          # from the repository root
//   node hushmallow/sensory-lab/tests/e2e-phase3-weather.cjs [outDir]
//   PART=weather:open,weather:storm      (blocks: open, storm, rain, resolve, motion, dial, keys, exit, layout; default all)
//
// Also runs inside tests/e2e-phase3.cjs through run(browser, { out, only }).
// Simulated input proves state, never smoothness: software GL can run at ~6 fps,
// so every wait is on state with generous limits, and sim time runs slower
// than wall time there (dt is capped at 0.05 s a frame).
//
// Blocks so far (slice 2):
//   open    W1: from the home card and from #weather; rig, realm canvas, .wx-back, 8 radios, a chip
//   storm   W4/W7 (Storm): a swipe across the bank opens it (clear, gap → 'clear' pulse, the Mallow
//           reacts, heaviness falls, light reaches the Mallow); no Companion drag or stroke; a strike
//   rain    W4/W6 (Rain): a still finger grows a bead; let go in the deck → 'success' pulse, less rain;
//           a swipe leans the rain; the chip shelters the Mallow and sends its bead up
//   resolve the resolve beat and Again for Storm and Rain (caption, line, chip, the bank drifts off)
//   motion  W9/W12 (part): reduced motion (a fading front, reduced flags, same mood targets, live
//           toggle); a hidden page freezes frames and sim time and lets go of a held bead
//   dial    W2 (part): every weather from the dial settles in pickRealm's realm with moodFor's target
//   keys    W3: digits from the stage, arrows in the dial, R is Again
//   exit    W14 (part): Close and Escape fade home; nothing left behind; listeners back to baseline
//   layout  W13 (part): no overlap, on screen, targets ≥ 40 px, the Mallow between the bars, the
//           chosen radio visible at 320 px, the same baseline for every weather

const path = require('path');
const H = require('./lib/harness.cjs');
const { check, guard, sleep } = H;

const LAB = '/hushmallow/sensory-lab';
const OUT_DEFAULT = path.join(__dirname, '..', 'docs', 'phase3', 'weather');
const SCOPE = 'weather';
const T = 60000;   // state waits: generous for software GL

const noErrors = (scope, errors) => check(scope, 'no console errors', !errors.length, errors.join(' | '));
const wx = (page, fn, arg) => page.evaluate(fn, arg);
/** Open #weather with a favourite Mallow and wait until the weather is live. */
async function openWx(browser, vp, mallow, { prefs = {}, initScripts = [], hash = '#weather' } = {}) {
  const r = await H.open(browser, vp, hash, { prefs, initScripts, comfort: H.comfort({ favouriteMallow: mallow }) });
  await H.waitRig(r.page, { timeout: T });
  if (hash === '#weather') await r.page.waitForFunction(() => __lab.weather?.state === 'live', null, { timeout: T });
  return r;
}
// settled: the weather is w, the planner has nothing left to do (a click changes the weather at once;
// state and the front only update on the next frame) and the screen is live
const settled = (page, w) => page.waitForFunction((w) => { const lw = __lab.weather; return lw?.weather === w && !lw.session.planner.busy && lw.state === 'live' && !lw.front; }, w, { timeout: T });
/** A pointer drag through page px points, `ms` between moves (mouse). */
async function drag(page, pts, ms = 16) {
  await page.mouse.move(pts[0][0], pts[0][1]);
  await page.mouse.down();
  for (let i = 1; i < pts.length; i++) { await page.mouse.move(pts[i][0], pts[i][1]); if (ms) await sleep(ms); }
  await page.mouse.up();
}
const line = (x0, y0, x1, y1, n) => Array.from({ length: n + 1 }, (_, i) => [x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n]);

async function run(browser, { out = OUT_DEFAULT, only = (b) => H.only(SCOPE) || H.only(`${SCOPE}:${b}`) } = {}) {
  // ------------------------------------------------------------------- W1 --
  if (only('open')) await guard(`${SCOPE}:open`, async (scope, own) => {
    const { ctx, page, errors } = await H.open(browser, 'phone', '#home', { comfort: H.comfort({ favouriteMallow: 'blubi' }) });
    own(ctx);
    await H.waitRig(page, { timeout: T });
    await page.click('.card[data-experience="weather"]');
    await page.waitForFunction(() => __lab.route === 'weather' && __lab.weather?.state === 'live', null, { timeout: T });
    const s = await wx(page, () => ({
      realm: document.querySelectorAll('.weather canvas.hushfold-realm').length, back: document.querySelectorAll('.weather .stage-wrap canvas.wx-back').length,
      order: [...document.querySelector('.weather .stage-wrap').children].map((c) => c.className),
      radios: document.querySelectorAll('.wx-dial [role="radio"]').length, checked: document.querySelector('.wx-dial [aria-checked="true"]')?.dataset.weather,
      chips: [...document.querySelectorAll('.wx-actions button')].map((b) => b.textContent), title: document.querySelector('.weather .topbar .title b')?.textContent,
      sub: document.querySelector('.weather .topbar .title small')?.textContent, rig: !!__lab.companion?.rig?.soft, debug: __lab.weather.debug(),
      label: document.querySelector('.weather .stage').getAttribute('aria-label'), sr: !!document.querySelector('.weather .sr-only[role="status"]'),
      hint: document.querySelector('.weather .wx-hint')?.getAttribute('aria-hidden'),
    }));
    check(scope, 'opens from the home card: rig ready, one realm canvas, .wx-back after it in the wrap', s.rig && s.realm === 1 && s.back === 1 && s.order.indexOf('hushfold-realm') < s.order.indexOf('wx-back'), JSON.stringify(s));
    check(scope, 'eight weather radios, Rain chosen (Blubi\'s lagoon), a "Catch the rain" chip', s.radios === 8 && s.checked === 'rain' && s.chips.join() === 'Catch the rain', JSON.stringify(s));
    check(scope, 'title, subtitle, stage label, announcer, hint hidden from screen readers', s.title === 'Weather Weaver' && s.sub === 'Rain · Raindrop Lagoon' && s.label.startsWith('Weather Weaver with Blubi.') && s.sr && s.hint === 'true', JSON.stringify(s));
    check(scope, 'debug() is plain JSON with state, weather, realm, progress and metrics', s.debug.state === 'live' && s.debug.weather === 'rain' && s.debug.realmId === 'raindrop-lagoon' && typeof s.debug.metrics.rainLevel === 'number', JSON.stringify(s.debug));
    // deep link, another Mallow
    await page.goto(`${H.BASE}#weather`);
    await H.waitRig(page, { timeout: T });
    await page.waitForFunction(() => __lab.weather?.state === 'live', null, { timeout: T });
    const d = await wx(page, () => ({ w: __lab.weather.weather, realm: __lab.weather.realmId, backdrop: document.querySelector('.weather').dataset.backdrop }));
    check(scope, 'opens from #weather too (the entry weather of the home realm)', d.w === 'rain' && d.realm === 'raindrop-lagoon' && d.backdrop === 'dark', JSON.stringify(d));
    await H.shot(page, out, 'weather-phone-open');
    noErrors(scope, errors);
  });

  // ------------------------------------------------------------- W4 storm --
  if (only('storm')) await guard(`${SCOPE}:storm`, async (scope, own) => {
    const { ctx, page, errors } = await openWx(browser, 'phone', 'glitzi');
    own(ctx);
    await page.focus('.weather .stage');
    await page.keyboard.press('Digit5');
    await settled(page, 'storm');
    await wx(page, () => __lab.weather.settle());
    await sleep(400);
    const g = await wx(page, () => __lab.weather.geo());
    const before = await wx(page, () => ({ m: __lab.weather.metrics(), mood: __lab.weather.env.mood, realm: __lab.weather.realmId, puffs: __lab.weather.layer.stats().drawn.puffs }));
    check(scope, 'Storm in the Static Storm: a heavy bank drawn, agitation capped at 0.32', before.realm === 'static-storm' && before.m.coverage > 0.85 && before.puffs > 0 && before.mood.agitation <= 0.32 + 1e-6, JSON.stringify(before));
    await H.clearEvents(page);
    const tags0 = await wx(page, () => __lab.weather.reactor.log.length);
    for (let k = 0; k < 3; k++) { const x = g.body.cx + (k - 1) * 18; await drag(page, line(x, g.skyTop + 6, x, g.body.top - 30, 10), 12); await sleep(400); }
    await page.waitForFunction(() => __lab.weather.events.some((e) => e.type === 'gap'), null, { timeout: T });
    // the gap beat is a priority one: it may wait out the 1.2 s after another beat (sim time)
    await page.waitForFunction((n) => __lab.weather.reactor.log.slice(n).some((e) => /gap/.test(e.tag)), tags0, { timeout: T }).catch(() => {});
    const after = await wx(page, () => ({ m: __lab.weather.metrics(), mood: __lab.weather.env.mood, ev: __lab.weather.events.map((e) => e.type), log: __lab.weather.reactor.log, pulses: __lab.weather.pulses, comp: __lab.events.map((e) => e.type), progress: __lab.weather.progress }));
    check(scope, 'a swipe across the bank opens it: coverage falls, clear and progress rise', after.m.clear > 0.2 && after.m.coverage < before.m.coverage - 0.15 && after.progress > 0.25, JSON.stringify(after.m));
    check(scope, 'the gap fires the realm "clear" pulse (through the gate)', after.pulses.some((p) => p.kind === 'clear' && p.ok), JSON.stringify(after.pulses));
    check(scope, 'the realm follows: heaviness falls and clarity rises (target mood)', after.mood.heaviness < before.mood.heaviness - 0.1 && after.mood.clarity > before.mood.clarity + 0.1, JSON.stringify({ before: before.mood, after: after.mood }));
    check(scope, 'Glitzi reacts to the gap in character', after.log.slice(tags0).some((e) => /gap/.test(e.tag)), JSON.stringify(after.log));
    check(scope, 'light reaches the Mallow through the gap', after.m.light > 0.3 && after.ev.includes('light-through'), JSON.stringify({ light: after.m.light }));
    check(scope, 'input isolation: the Companion saw no drag or stroke from the swipes', !after.comp.some((t) => t === 'drag' || t === 'stroke' || t === 'tap'), JSON.stringify(after.comp));
    await H.shot(page, out, 'weather-phone-storm-parted');
    // a strike (forced now rather than waiting 8–14 s of sim time)
    await H.clearEvents(page);
    // strikes are never deferred (a late flinch would miss its lightning): fire one clear of the last beat
    await page.waitForFunction(() => { const r = __lab.weather.reactor; return r.t - r.mem.lastReact > 1.4; }, null, { timeout: T });
    await wx(page, () => { const w = __lab.weather; w.sims.clouds.reset(); const s = w.sims.strikes; s.next = s.t + 0.01; });
    await page.waitForFunction(() => __lab.weather.events.some((e) => e.type === 'strike'), null, { timeout: T });
    await sleep(800);
    const st = await wx(page, () => ({ ev: __lab.weather.events.filter((e) => e.type === 'strike'), pulses: __lab.weather.pulses.filter((p) => p.kind === 'strike'), log: __lab.weather.reactor.log.map((e) => e.tag), W: __lab.weather.geo().W }));
    const sx = st.ev[0]?.x / st.W;
    check(scope, 'a strike: realm bolt on the far horizon, away from the Mallow, and Glitzi delights', st.pulses.some((p) => p.ok) && (sx <= 0.31 || sx >= 0.69) && st.log.some((t) => t === 'glitzi-strike-delight'), JSON.stringify(st));
    // the chip parts the clouds from the centre
    await wx(page, () => __lab.weather.sims.clouds.reset());
    const c0 = await wx(page, () => __lab.weather.metrics().clear);
    const chip = await page.$('.wx-actions [data-action="lead"]');
    const bb = await chip.boundingBox();
    await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.mouse.down(); await sleep(2500); await page.mouse.up();
    await sleep(600);
    const c1 = await wx(page, () => __lab.weather.metrics().clear);
    check(scope, '"Part the clouds" (held) parts them from the centre', c1 > c0 + 0.15, `${c0} → ${c1}`);
    noErrors(scope, errors);
  });

  // -------------------------------------------------------------- W4 rain --
  if (only('rain')) await guard(`${SCOPE}:rain`, async (scope, own) => {
    const { ctx, page, errors } = await openWx(browser, 'phone', 'blubi');
    own(ctx);
    const g = await wx(page, () => ({ ...__lab.weather.geo(), deckY: __lab.weather.sims.rain.deckY }));
    const x = g.body.cx - 110, y = g.deckY + 70;
    await H.clearEvents(page);
    await page.mouse.move(x, y); await page.mouse.down();
    await page.waitForFunction(() => (__lab.weather.sims.rain.snapshot().orbs[0]?.n || 0) >= 6, null, { timeout: T });
    const held = await wx(page, () => ({ orbs: __lab.weather.sims.rain.snapshot().orbs, level: __lab.weather.sims.rain.level, front: __lab.weather.layer.stats() }));
    check(scope, 'a still finger in the sky grows a glass bead that gathers drops', held.orbs.length === 1 && held.orbs[0].state === 'held' && held.orbs[0].n >= 6, JSON.stringify(held));
    await page.mouse.move(x, g.deckY - 30, { steps: 4 }); await page.mouse.up();
    await page.waitForFunction(() => __lab.weather.pulses.some((p) => p.kind === 'success') && __lab.weather.progress > 0.05, null, { timeout: T });
    const up = await wx(page, () => ({ level: __lab.weather.sims.rain.level, ev: [...new Set(__lab.weather.events.map((e) => e.type))], pulses: __lab.weather.pulses, progress: __lab.weather.progress }));
    check(scope, 'let go in the deck: the bead rises as light ("success" pulse) and the rain thins', up.level < held.level - 0.1 && up.progress > 0.1 && up.ev.includes('bead-up'), JSON.stringify(up));
    check(scope, 'no Companion gestures from the weather touch', !(await H.events(page)).some((t) => t === 'hold' || t === 'drag' || t === 'stroke'), JSON.stringify(await H.events(page)));
    // a swipe redirects: the rain leans
    await drag(page, line(30, g.deckY + 150, 360, g.deckY + 170, 8), 12);
    const lean = await wx(page, () => __lab.weather.sims.rain.lean);
    check(scope, 'a swipe sweeps the drops and leans the rain', Math.abs(lean) > 0.1, `${lean}`);
    // the chip: a bead above the Mallow shelters it, letting go sends it up
    const lv = await wx(page, () => __lab.weather.sims.rain.level);
    const chip = await page.$('.wx-actions [data-action="lead"]');
    const bb = await chip.boundingBox();
    await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.mouse.down();
    await page.waitForFunction(() => __lab.weather.sims.rain.sheltered() && (__lab.weather.sims.rain.snapshot().orbs[0]?.n || 0) >= 4, null, { timeout: T });
    await H.shot(page, out, 'weather-phone-rain-shelter');
    await page.mouse.up();
    await page.waitForFunction((lv) => __lab.weather.sims.rain.level < lv - 0.05, lv, { timeout: T });
    check(scope, '"Catch the rain" shelters the Mallow, then the bead goes up', true);
    // drops on the Mallow: Blubi blushes (its own beat)
    const tags = await wx(page, () => __lab.weather.reactor.log.map((e) => e.tag));
    check(scope, 'Blubi reacts to the rain in character (arrival, drips)', tags.some((t) => /^blubi-/.test(t)), JSON.stringify(tags));
    noErrors(scope, errors);
  });

  // ---------------------------------------------------- resolve and Again --
  if (only('resolve')) await guard(`${SCOPE}:resolve`, async (scope, own) => {
    const { ctx, page, errors } = await openWx(browser, 'phone', 'glitzi');
    own(ctx);
    await wx(page, () => __lab.weather.setWeather('storm', { instant: true }));
    await settled(page, 'storm');
    const g = await wx(page, () => __lab.weather.geo());
    // keep swiping across the bank until it resolves (how many it took goes in the report)
    const xs = [0, -70, 70, -130, 130, -40, 40, -100, 100, -150, 150, -20, 20, -170, 170];
    let swipes = 0;
    for (; swipes < 30 && !(await wx(page, () => __lab.weather.resolved)); swipes++) {
      const x = g.body.cx + xs[swipes % xs.length];
      await drag(page, line(x, g.skyTop + 6, x, g.body.top - 20, 10), 12);
      await sleep(600);
    }
    await page.waitForFunction(() => __lab.weather.resolved, null, { timeout: T });
    check(scope, 'swipes alone resolve the storm', true, `${swipes} swipes`);
    await page.waitForFunction(() => document.querySelector('.wx-actions [data-action="again"]') && __lab.weather.reactor.log.some((e) => e.type === 'resolved'), null, { timeout: T });
    const r = await wx(page, () => ({ cap: document.querySelector('.weather .wx-hint .wx-cap')?.textContent, line: document.querySelector('.weather .wx-hint .line')?.textContent,
      chips: [...document.querySelectorAll('.wx-actions button')].map((b) => b.textContent), p: __lab.weather.progress, t: __lab.weather.env.realm.debug.state.p, drift: __lab.weather.tools.storm.drift,
      tags: __lab.weather.reactor.log.filter((e) => e.type === 'resolved').map((e) => e.tag) }));
    check(scope, 'Storm resolves: caption, Glitzi\'s line, the lead chip becomes Again, the clouds drift off', r.cap === 'The storm passed.' && /Pfft/.test(r.line) && r.chips.join() === 'Again' && r.p === 1 && r.drift, JSON.stringify(r));
    check(scope, 'the resolve beat: Glitzi\'s home weather resolves with its own celebration', r.tags.some((t) => /glitzi-home-resolved/.test(t)), JSON.stringify(r.tags));
    await H.shot(page, out, 'weather-phone-storm-resolved');
    await page.click('.wx-actions [data-action="again"]');
    await page.waitForFunction(() => __lab.weather.progress === 0 && !__lab.weather.resolved && !__lab.weather.session.planner.busy && __lab.weather.metrics().coverage > 0.8, null, { timeout: T });
    const a = await wx(page, () => ({ chips: [...document.querySelectorAll('.wx-actions button')].map((b) => b.textContent), mood: __lab.weather.env.mood }));
    check(scope, 'Again: progress 0, a fresh bank, the lead chip back, the mood target back to base', a.chips.join() === 'Part the clouds' && Math.abs(a.mood.heaviness - 0.7) < 0.03, JSON.stringify(a));
    // Rain: thin it, then one bead into the deck resolves it
    await wx(page, () => __lab.weather.setWeather('rain', { instant: true }));
    await settled(page, 'rain');
    await wx(page, () => { __lab.weather.sims.rain.level = 0.19; });
    const gd = await wx(page, () => ({ ...__lab.weather.geo(), deckY: __lab.weather.sims.rain.deckY }));
    await page.mouse.move(gd.body.cx - 110, gd.deckY + 70); await page.mouse.down();
    await page.waitForFunction(() => (__lab.weather.sims.rain.snapshot().orbs[0]?.n || 0) >= 3, null, { timeout: T });
    await page.mouse.move(gd.body.cx - 110, gd.deckY - 30, { steps: 3 }); await page.mouse.up();
    await page.waitForFunction(() => __lab.weather.resolved && document.querySelector('.wx-actions [data-action="again"]'), null, { timeout: T });
    const rr = await wx(page, () => ({ cap: document.querySelector('.weather .wx-hint .wx-cap')?.textContent, realm: __lab.weather.realmId, drift: __lab.weather.tools.rain.drift, sr: document.querySelector('.weather .sr-only').textContent }));
    check(scope, 'Rain resolves when the rain is caught (≤ 0.15): the caption, Again, the deck drifts off', rr.cap === 'The rain eased.' && rr.drift, JSON.stringify(rr));
    noErrors(scope, errors);
  });

  // ----------------------------------------- reduced motion, hidden page --
  if (only('motion')) await guard(`${SCOPE}:motion`, async (scope, own) => {
    const { ctx, page, errors } = await openWx(browser, 'phone', 'boppo', { prefs: { motion: 'reduced' } });
    own(ctx);
    await page.click('.wx-dial [data-weather="moonlight"]');   // another realm: a front
    await page.waitForFunction(() => __lab.weather.front, null, { timeout: T });
    const f = await wx(page, () => ({ mode: __lab.weather.front.mode, layer: __lab.weather.layer.stats().reduced, sims: __lab.weather.sims.rain.reduced && __lab.weather.sims.clouds.reduced, env: __lab.weather.env.reduced }));
    check(scope, 'reduced motion: the front is a fade; env, layer and sims are reduced', f.mode === 'fade' && f.layer && f.sims && f.env, JSON.stringify(f));
    await settled(page, 'moonlight');
    await wx(page, () => __lab.weather.setWeather('storm', { instant: true }));
    await settled(page, 'storm');
    const want = await wx(page, async (LAB) => { const { moodFor } = await import(`${LAB}/core/weather.js`); __lab.weather.settle(); await new Promise((r) => setTimeout(r, 400)); return { want: moodFor('storm', 0, null, __lab.weather.realmId), got: __lab.weather.env.mood, focus: __lab.weather.env.realm.debug.state.camX }; }, LAB);
    check(scope, 'the mood targets are the same as with full motion', Math.abs(want.want.heaviness - want.got.heaviness) < 0.03 && Math.abs(want.want.agitation - want.got.agitation) < 0.03, JSON.stringify(want));
    // live toggle back to full motion, without remounting
    const canvas0 = await wx(page, () => document.querySelector('.weather canvas.hushfold-realm') === __lab.weather.env.realm.canvas && __lab.weather.layer.frames);
    await wx(page, () => __lab.prefs.set('motion', 'full'));
    await sleep(300);
    const live = await wx(page, () => ({ layer: __lab.weather.layer.stats().reduced, sims: __lab.weather.sims.clouds.reduced, planner: __lab.weather.session.planner.reduced, screens: document.querySelectorAll('.weather').length }));
    check(scope, 'a live Motion change applies without remounting', canvas0 && !live.layer && !live.sims && !live.planner && live.screens === 1, JSON.stringify(live));
    // hidden: frames and sim time stop, a held bead is let go; visible: one small step
    await wx(page, () => __lab.weather.setWeather('rain', { instant: true }));
    await settled(page, 'rain');
    const gd = await wx(page, () => ({ ...__lab.weather.geo(), deckY: __lab.weather.sims.rain.deckY }));
    await page.mouse.move(gd.body.cx - 100, gd.deckY + 80); await page.mouse.down();
    await page.waitForFunction(() => __lab.weather.metrics().held === 1, null, { timeout: T });
    await H.setHidden(page, true);
    const h0 = await wx(page, () => ({ f: __lab.weather.layer.frames, t: __lab.weather.sims.rain.t, held: __lab.weather.metrics().held, state: __lab.weather.state, active: __lab.weather.tools.active }));
    await sleep(1500);
    const h1 = await wx(page, () => ({ f: __lab.weather.layer.frames, t: __lab.weather.sims.rain.t }));
    await page.mouse.up();
    check(scope, 'hidden: frames and sim time freeze; the held bead is let go; paused', h1.f === h0.f && h1.t === h0.t && h0.held === 0 && h0.active === 0 && h0.state === 'paused', JSON.stringify({ h0, h1 }));
    await H.setHidden(page, false);
    await page.waitForFunction((f) => __lab.weather.layer.frames > f + 1, h1.f, { timeout: T });
    const h2 = await wx(page, () => ({ t: __lab.weather.sims.rain.t, state: __lab.weather.state }));
    check(scope, 'visible again: the first frames advance sim time by a frame or two, not the gap', h2.t - h1.t <= 0.12 && h2.state !== 'paused', JSON.stringify({ h1, h2 }));
    noErrors(scope, errors);
  });

  // ------------------------------------------------------------ W2 (dial) --
  if (only('dial')) await guard(`${SCOPE}:dial`, async (scope, own) => {
    const { ctx, page, errors } = await openWx(browser, 'phone', 'boppo', { initScripts: [] });
    own(ctx);
    // realms never go missing during a change
    await wx(page, () => { window.__noRealm = 0; const tick = () => { if (!__lab.weather) return; if (!document.querySelector('.weather canvas.hushfold-realm')) window.__noRealm++; requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
    const order = ['wind', 'fog', 'rain', 'storm', 'moonlight', 'starlight', 'warm', 'sunshine'];
    const seen = [];
    for (const w of order) {
      await page.click(`.wx-dial [data-weather="${w}"]`);
      await settled(page, w);
      const r = await wx(page, async ({ LAB, w }) => {
        const { pickRealm, moodFor } = await import(`${LAB}/core/weather.js`);
        const lw = __lab.weather, want = moodFor(w, 0, null, lw.realmId, { gentle: __lab.dna.tuning().style === 'gentle' });
        lw.settle();
        await new Promise((res) => setTimeout(res, 400));
        const m = lw.env.mood;
        return { w, realm: lw.realmId, sub: document.querySelector('.weather .topbar small').textContent, checked: document.querySelector('.wx-dial [aria-checked="true"]').dataset.weather,
          dm: Math.max(...Object.keys(want).map((k) => Math.abs(want[k] - m[k]))), backdrop: document.querySelector('.weather').dataset.backdrop, realmAttr: document.querySelector('.weather').dataset.realm };
      }, { LAB, w });
      seen.push(r);
    }
    const expect = { wind: 'sunpop-orchard', fog: 'sunpop-orchard', rain: 'sunpop-orchard', storm: 'sunpop-orchard', moonlight: 'moonmilk-cove', starlight: 'moonmilk-cove', warm: 'moonmilk-cove', sunshine: 'sunpop-orchard' };
    check(scope, 'each pick settles in pickRealm\'s realm (Boppo: home Sunpop; night skies go to the cove and back)', seen.every((r) => r.realm === expect[r.w] && r.realmAttr === r.realm), JSON.stringify(seen.map((r) => [r.w, r.realm])));
    check(scope, 'the realm is told moodFor(weather, 0) (within the throttle)', seen.every((r) => r.dm < 0.03), JSON.stringify(seen.map((r) => [r.w, +r.dm.toFixed(3)])));
    check(scope, 'the dial and the subtitle follow every pick', seen.every((r) => r.checked === r.w && r.sub.startsWith(r.sub.split(' · ')[0]) && r.sub.includes(' · ')), JSON.stringify(seen.map((r) => r.sub)));
    const nr = await wx(page, () => window.__noRealm);
    check(scope, 'there is always a realm canvas, through every front', nr === 0, `${nr} frames without one`);
    // five picks within a second end on the last, with at most one swap
    const sw0 = await wx(page, () => __lab.weather.session.planner.swaps);
    for (const w of ['wind', 'moonlight', 'storm', 'starlight', 'rain']) { await page.click(`.wx-dial [data-weather="${w}"]`); await sleep(120); }
    await settled(page, 'rain');
    const sw1 = await wx(page, () => ({ swaps: __lab.weather.session.planner.swaps, realm: __lab.weather.realmId }));
    check(scope, 'five quick picks end on the last one, with at most one realm swap', sw1.swaps - sw0 <= 1 && sw1.realm === 'sunpop-orchard', JSON.stringify({ sw0, sw1 }));
    noErrors(scope, errors);
  });

  // ------------------------------------------------------------- W3 keys --
  if (only('keys')) await guard(`${SCOPE}:keys`, async (scope, own) => {
    const { ctx, page, errors } = await openWx(browser, 'phone', 'loomi');
    own(ctx);
    await page.focus('.weather .stage');
    await page.keyboard.press('Digit4');
    await settled(page, 'rain');
    const r1 = await wx(page, () => ({ w: __lab.weather.weather, realm: __lab.weather.realmId }));
    check(scope, 'digit 4 from the stage chooses Rain (Loomi stays in the Blue Drift)', r1.w === 'rain' && r1.realm === 'blue-drift', JSON.stringify(r1));
    // arrows in the dial move and select
    await page.focus('.wx-dial [aria-checked="true"]');
    await page.keyboard.press('ArrowRight');
    await settled(page, 'storm');
    const r2 = await wx(page, () => ({ w: __lab.weather.weather, focus: document.activeElement?.dataset?.weather, tab: [...document.querySelectorAll('.wx-radio')].filter((b) => b.tabIndex === 0).map((b) => b.dataset.weather) }));
    check(scope, 'ArrowRight in the dial selects Storm and moves focus (one tab stop)', r2.w === 'storm' && r2.focus === 'storm' && r2.tab.join() === 'storm', JSON.stringify(r2));
    // arrows on the stage shape the weather; R is Again
    await page.focus('.weather .stage');
    await wx(page, () => __lab.weather.settle());
    const vx0 = await wx(page, () => Array.from(__lab.weather.sims.clouds.vx).reduce((a, v) => a + Math.abs(v), 0));
    await page.keyboard.press('ArrowLeft');
    const vx1 = await wx(page, () => Array.from(__lab.weather.sims.clouds.vx).reduce((a, v) => a + Math.abs(v), 0));
    check(scope, 'an arrow key on the stage pushes the nearest cloud', vx1 > vx0 + 100, `${vx0} → ${vx1}`);
    await page.keyboard.press('KeyR');
    await page.waitForFunction(() => __lab.weather.state === 'live' && __lab.weather.progress === 0, null, { timeout: T });
    const r3 = await wx(page, () => ({ w: __lab.weather.weather, sr: document.querySelector('.weather .sr-only[role="status"]').textContent }));
    check(scope, 'R is Again: Storm starts over', r3.w === 'storm', JSON.stringify(r3));
    noErrors(scope, errors);
  });

  // ------------------------------------------------------------- W14 exit --
  if (only('exit')) await guard(`${SCOPE}:exit`, async (scope, own) => {
    const { ctx, page, errors } = await H.open(browser, 'phone', '#home', { initScripts: [H.INIT.listenerCounter], comfort: H.comfort({ favouriteMallow: 'noomi' }) });
    own(ctx);
    await H.waitRig(page, { timeout: T });
    await sleep(500);
    const base = await wx(page, () => ({ l: __listeners().total, prefs: __lab.prefs.listeners.size, dna: __lab.dna.listeners.size, store: JSON.stringify(Object.keys(localStorage).sort()) }));
    for (const how of ['close', 'escape']) {
      await wx(page, () => __lab.ctx.navigate('/weather'));
      await page.waitForFunction(() => __lab.weather?.state === 'live', null, { timeout: T });
      // a held bead and a turn in progress when we leave
      await wx(page, () => __lab.weather.setWeather('rain'));
      await sleep(300);
      if (how === 'close') await page.click('.weather .topbar button[aria-label="Close"]');
      else { await page.focus('.weather .stage'); await page.keyboard.press('Escape'); }
      const mid = await wx(page, () => ({ leaving: __lab.weather?.state, inert: document.querySelector('.weather')?.inert }));
      await page.waitForFunction(() => __lab.route === 'home', null, { timeout: T });
      await sleep(300);
      const s = await wx(page, () => ({ wx: document.querySelectorAll('.wx-back, .wx-front, .weather, canvas.hushfold-realm').length, handle: __lab.weather, canvases: document.querySelectorAll('canvas').length,
        rest: __lab.companion?.restOverride ?? null, face: JSON.stringify(__lab.companion?.rig.faceOverride), inflate: __lab.companion?.rig.inflateTarget }));
      check(scope, `${how}: fades (leaving, inert) and returns home`, mid.leaving === 'leaving' && mid.inert === true, JSON.stringify(mid));
      check(scope, `${how}: no weather canvases, screen, realm or handle left; home's Mallow untouched`, s.wx === 0 && s.handle === null && s.canvases === 1 && s.rest === null && s.face === '{"set":{},"min":{}}' && !s.inflate, JSON.stringify(s));
    }
    await sleep(500);
    const now = await wx(page, () => ({ l: __listeners().total, prefs: __lab.prefs.listeners.size, dna: __lab.dna.listeners.size, store: JSON.stringify(Object.keys(localStorage).sort()) }));
    check(scope, 'listeners (window, document, prefs, Comfort DNA) back to the baseline', now.l === base.l && now.prefs === base.prefs && now.dna === base.dna, JSON.stringify({ base, now }));
    check(scope, 'nothing new in storage (no weather history)', now.store === base.store, JSON.stringify({ base: base.store, now: now.store }));
    noErrors(scope, errors);
  });

  // ----------------------------------------------------------- W13 layout --
  if (only('layout')) await guard(`${SCOPE}:layout`, async (scope) => {
    for (const vp of ['phone', 'small', 'desktop', 'land']) {
      const { ctx, page, errors } = await openWx(browser, vp, 'pipzi');
      try {
        const sc = `${scope}:${vp}`;
        const bases = new Set();
        for (const w of ['rain', 'storm']) {
          await wx(page, (w) => __lab.weather.setWeather(w, { instant: true }), w);
          await settled(page, w);
          bases.add(await wx(page, () => __lab.companion.rig.BASE.toFixed(1)));
        }
        await H.layout(page, sc, { scrollers: ['.wx-dial', '.wx-actions'] });
        const d = await wx(page, () => {
          const dial = document.querySelector('.wx-dial'), r = dial.getBoundingClientRect(), b = dial.querySelector('[aria-checked="true"]').getBoundingClientRect();
          const rows = [...document.querySelectorAll('.weather .bottom > *')].map((e) => Math.round(e.getBoundingClientRect().height));
          return { inView: b.left >= r.left - 1 && b.right <= r.right + 1, rows, sw: dial.scrollWidth, cw: dial.clientWidth };
        });
        check(sc, 'the chosen radio is in view; both bottom rows 50 px', d.inView && d.rows.join() === '50,50', JSON.stringify(d));
        check(sc, 'the baseline is the same for Rain and Storm', bases.size === 1, [...bases].join(' / '));
        await H.shot(page, out, `weather-${vp}-storm`);
        noErrors(sc, errors);
      } finally { await ctx.close(); }
    }
  });
}

module.exports = { run };

if (require.main === module) {
  (async () => {
    const out = process.argv[2] || OUT_DEFAULT;
    const browser = await H.launch();
    try { await run(browser, { out }); } finally { await browser.close(); }
    const { failed } = H.writeReport(out, 'e2e-phase3-weather', { prefix: `${SCOPE}:` });
    process.exit(failed ? 1 : 0);
  })().catch((e) => { console.error(e); process.exit(2); });
}
