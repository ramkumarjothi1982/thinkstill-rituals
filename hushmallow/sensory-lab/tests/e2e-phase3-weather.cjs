// Weather Weaver browser tests (spec-weather.md §13; the L21 harness).
//
//   python3 -m http.server 8000          # from the repository root
//   node hushmallow/sensory-lab/tests/e2e-phase3-weather.cjs [outDir]
//   PART=weather:open,weather:storm      (blocks: open, storm, rain, sun, moon, stars, wind, fog, warm, water, front, morph,
//                                         resolve, motion, dial, keys, exit, layout; default all)
//
// Also runs inside tests/e2e-phase3.cjs through run(browser, { out, only }).
// Simulated input proves state, never smoothness: software GL can run at ~6 fps,
// so every wait is on state with generous limits, and sim time runs slower
// than wall time there (dt is capped at 0.05 s a frame).
//
// Blocks (slices 2 and 3):
//   open    W1: from the home card and from #weather; rig, realm canvas, .wx-back, 8 radios, a chip
//   storm   W4/W7 (Storm): a swipe across the bank opens it (clear, gap → 'clear' pulse, the Mallow
//           reacts, heaviness falls, light reaches the Mallow); no Companion drag or stroke; a strike
//   rain    W4/W6 (Rain): a still finger grows a bead; let go in the deck → 'success' pulse, less rain;
//           a swipe leans the rain; the chip shelters the Mallow and sends its bead up
//   sun     W4/W6 (Sunshine, Boppo): the pool burns the haze, bask (glow, blush, inflate), a sunbeam on rest,
//           arrows, "Bring the sun", golden hour
//   moon    W4/W6 (Moonlight, Noomi): ripples on water ≤ 1/s, moonlit (breathRate 0.12), a falling star, arrows,
//           "Bring the moonlight", "The tide is still."
//   stars   W4/W6 (Starlight, Zuzu): a held cluster, a constellation, a gift, "Gather stars", arrow gathering, resolve
//   wind    W4/W6 (Wind, Loomi): a gust leans it, an eddy, calm from slow strokes, an arrow breeze, "Send a breeze", resolve
//   fog     W4/W6 (Fog, Loomi): wipes, revealed, a hold's clear patch, arrow bands, "Clear the mist" until it lifts
//   warm    W4/W7 (Warm glow, Pipzi): a drag kindles (taps, sparks), holding Pipzi is the hearth, the chip resolves
//   water   W4 (waves): a drag sends a swell that reaches Loomi, "Push the water", gold swells add heat; puddles
//           after rain in a dry realm, touched
//   front   W8: a front's swap only under full cover, chips wait, a drag pushes it; a same-realm turn keeps the
//           old weather while the new enters; a swipe while Storm is still entering works
//   morph   the same-realm morphs: Rain → Starlight, Storm → Sunshine, Fog → any
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
/** Hold an action chip (mouse) until fn(arg) is true in the page, then let go. */
async function holdChip(page, action, fn, arg = null, timeout = T) {
  const bb = await (await page.$(`.wx-actions [data-action="${action}"]`)).boundingBox();
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
  await page.mouse.down();
  try { await page.waitForFunction(fn, arg, { timeout }); } finally { await page.mouse.up(); }
}
/** The resolve beat as shown: caption, the Mallow's line, the chips. */
async function resolvedView(page) {
  await page.waitForFunction(() => __lab.weather.resolved && document.querySelector('.wx-actions [data-action="again"]'), null, { timeout: T });
  return page.evaluate(() => ({ cap: document.querySelector('.weather .wx-hint .wx-cap')?.textContent, line: document.querySelector('.weather .wx-hint .line')?.textContent,
    chips: [...document.querySelectorAll('.wx-actions button')].map((b) => b.textContent), p: __lab.weather.progress }));
}

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
    check(scope, 'eight weather radios, Rain chosen (Blubi\'s lagoon), "Catch the rain" and "Push the water" chips', s.radios === 8 && s.checked === 'rain' && s.chips.join() === 'Catch the rain,Push the water', JSON.stringify(s));
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
    // held until it has parted them (sim time: software GL and a busy machine slow it, so wait on state)
    const parted = await holdChip(page, 'lead', (c0) => __lab.weather.metrics().clear > c0 + 0.15, c0).then(() => true, () => false);
    const c1 = await wx(page, () => __lab.weather.metrics().clear);
    check(scope, '"Part the clouds" (held) parts them from the centre', parted && c1 > c0 + 0.15, `${c0} → ${c1}`);
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
    const f = await wx(page, () => { const S = __lab.weather.sims; return { mode: __lab.weather.front.mode, layer: __lab.weather.layer.stats().reduced, env: __lab.weather.env.reduced,
      sims: ['rain', 'clouds', 'deck', 'sun', 'moon', 'stars', 'ribbons', 'fluffs', 'mist', 'embers', 'waves'].every((k) => S[k].reduced) }; });
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
        const lw = __lab.weather;
        lw.settle();
        await new Promise((res) => setTimeout(res, 400));
        // the target is moodFor at progress 0 with this frame's live terms (wind energy, the sun's height…)
        const want = moodFor(w, 0, lw.live(), lw.realmId, { gentle: __lab.dna.tuning().style === 'gentle' }), m = lw.env.mood;
        const lead = { sunshine: 'sun', wind: 'ribbons', fog: 'mist', rain: 'deck', storm: 'clouds', moonlight: 'moon', starlight: 'stars', warm: 'embers' }[w];
        return { w, realm: lw.realmId, amount: lw.sims[lead].amount, sub: document.querySelector('.weather .topbar small').textContent, checked: document.querySelector('.wx-dial [aria-checked="true"]').dataset.weather,
          dm: Math.max(...Object.keys(want).map((k) => Math.abs(want[k] - m[k]))), backdrop: document.querySelector('.weather').dataset.backdrop, realmAttr: document.querySelector('.weather').dataset.realm };
      }, { LAB, w });
      seen.push(r);
    }
    const expect = { wind: 'sunpop-orchard', fog: 'sunpop-orchard', rain: 'sunpop-orchard', storm: 'sunpop-orchard', moonlight: 'moonmilk-cove', starlight: 'moonmilk-cove', warm: 'moonmilk-cove', sunshine: 'sunpop-orchard' };
    check(scope, 'each pick settles in pickRealm\'s realm (Boppo: home Sunpop; night skies go to the cove and back)', seen.every((r) => r.realm === expect[r.w] && r.realmAttr === r.realm), JSON.stringify(seen.map((r) => [r.w, r.realm])));
    check(scope, 'each weather\'s own element is there (pool, ribbons, mist, deck, bank, stars, embers)', seen.every((r) => r.amount > 0.99), JSON.stringify(seen.map((r) => [r.w, r.amount])));
    check(scope, 'the realm is told moodFor(weather, 0, live) (within the throttle and the gusts)', seen.every((r) => r.dm < 0.05), JSON.stringify(seen.map((r) => [r.w, +r.dm.toFixed(3)])));
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

  // ---------------------------------------------------------- W4 sunshine --
  if (only('sun')) await guard(`${SCOPE}:sun`, async (scope, own) => {
    const { ctx, page, errors } = await openWx(browser, 'phone', 'boppo');
    own(ctx);
    await settled(page, 'sunshine');
    await wx(page, () => __lab.weather.settle());
    await sleep(500);
    const g = await wx(page, () => __lab.weather.geo());
    const s0 = await wx(page, () => ({ sun: __lab.weather.sims.sun.snapshot(), mood: __lab.weather.env.mood, realm: __lab.weather.realmId, chips: [...document.querySelectorAll('.wx-actions button')].map((b) => b.textContent) }));
    check(scope, 'Sunshine in the Sunpop Orchard: a light pool, a "Bring the sun" chip', s0.realm === 'sunpop-orchard' && s0.sun.amount === 1 && s0.chips.join() === 'Bring the sun', JSON.stringify(s0));
    // drag the light across the sky: the overcast haze burns away along its path and the realm lifts
    const p0 = [s0.sun.x, s0.sun.y];
    await drag(page, [p0, ...line(p0[0], p0[1], 40, g.skyTop + 70, 6), ...line(40, g.skyTop + 70, g.W - 40, g.skyTop + 90, 14), ...line(g.W - 40, g.skyTop + 90, 50, g.horizonY - 40, 14)], 30);
    await page.waitForFunction(() => __lab.weather.metrics().painted > 0.08, null, { timeout: T });
    await sleep(500);
    const s1 = await wx(page, () => ({ m: __lab.weather.metrics(), mood: __lab.weather.env.mood, p: __lab.weather.progress }));
    check(scope, 'the pool burns the haze along its path (painted ↑), heaviness falls, progress rises', s1.m.painted > 0.08 && s1.mood.heaviness < s0.mood.heaviness - 0.02 && s1.p > 0.1, JSON.stringify({ s0: s0.mood, s1 }));
    // take it to the Mallow and rest: bask (glow, blush, puffed up warm), and the rest fires a sunbeam
    // (drag anywhere moves the light: start in open sky, since a touch right beside the Mallow is TouchTalk)
    await H.clearEvents(page);
    await page.mouse.move(g.W * 0.7, g.skyTop + 140); await page.mouse.down();
    await page.mouse.move(g.body.cx, g.body.mid, { steps: 12 });
    await page.waitForFunction(() => __lab.weather.metrics().bask > 1.2, null, { timeout: T });
    await page.waitForFunction(() => __lab.weather.pulses.some((p) => p.kind === 'strike' && p.ok), null, { timeout: T }).catch(() => {});
    const b = await wx(page, () => ({ face: __lab.companion.rig.faceOverride, inflate: __lab.companion.rig.inflateTarget, log: __lab.weather.reactor.log.map((e) => e.tag), pulses: __lab.weather.pulses.filter((p) => p.kind === 'strike'), m: __lab.weather.metrics(), comp: __lab.events.map((e) => e.type) }));
    await page.mouse.up();
    check(scope, 'bask: the pool on the Mallow, glow ≥ 0.9, blush, inflated (Boppo the brightest)', b.m.onBody && b.face.min.glow >= 0.9 && b.face.min.blush >= 1.5 && b.inflate >= 0.35, JSON.stringify(b));
    check(scope, 'Boppo basks in character', b.log.some((t) => t === 'boppo-bask-glow'), JSON.stringify(b.log));
    check(scope, 'resting light fires a sunbeam ("strike") in a day realm', b.pulses.some((p) => p.ok), JSON.stringify(b.pulses));
    check(scope, 'dragging the light is not a Companion gesture', !b.comp.some((t) => t === 'drag' || t === 'stroke' || t === 'hold'), JSON.stringify(b.comp));
    await H.shot(page, out, 'weather-phone-sunshine-bask');
    // arrows move the pool 28 px; the chip brings it back to the Mallow; holding it there resolves
    await page.focus('.weather .stage');
    const ty0 = await wx(page, () => __lab.weather.sims.sun.ty);
    for (let k = 0; k < 6; k++) await page.keyboard.press('ArrowUp');
    const ty1 = await wx(page, () => __lab.weather.sims.sun.ty);
    check(scope, 'ArrowUp ×6 moves the light up 168 px (off the Mallow)', Math.abs(ty0 - ty1 - 168) < 2, `${ty0} → ${ty1}`);
    await page.waitForFunction(() => !__lab.weather.metrics().onBody, null, { timeout: T });
    await holdChip(page, 'lead', () => __lab.weather.resolved);
    const r = await resolvedView(page);
    check(scope, '"Bring the sun" (held) brings the light to the Mallow; basking resolves Sunshine: golden hour', r.cap === 'Golden hour.' && /BOOP/.test(r.line) && r.chips[0] === 'Again', JSON.stringify(r));
    noErrors(scope, errors);
  });

  // --------------------------------------------------------- W4 moonlight --
  if (only('moon')) await guard(`${SCOPE}:moon`, async (scope, own) => {
    const { ctx, page, errors } = await openWx(browser, 'phone', 'noomi');
    own(ctx);
    await settled(page, 'moonlight');
    await wx(page, () => __lab.weather.settle());
    await sleep(500);
    const g = await wx(page, () => __lab.weather.geo());
    const m0 = await wx(page, () => ({ moon: __lab.weather.sims.moon.snapshot(), realm: __lab.weather.realmId, chips: [...document.querySelectorAll('.wx-actions button')].map((b) => b.textContent) }));
    check(scope, 'Moonlight in the Moonmilk Cove: a silver pool; "Bring the moonlight" and "Push the water"', m0.realm === 'moonmilk-cove' && m0.moon.amount === 1 && m0.chips.join() === 'Bring the moonlight,Push the water', JSON.stringify(m0));
    // over the water: a ripple at most once a second while it moves
    const wy = g.water[0] + 24;
    await page.mouse.move(m0.moon.x, m0.moon.y); await page.mouse.down();
    await page.mouse.move(60, wy, { steps: 8 });
    for (let k = 0; k < 3; k++) { await page.mouse.move(g.W - 60, wy, { steps: 16 }); await page.mouse.move(60, wy, { steps: 16 }); }
    const rip = await wx(page, () => ({ ev: __lab.weather.events.filter((e) => e.type === 'moon-water').length, pulses: __lab.weather.pulses.filter((p) => p.kind === 'ripple' && p.ok).map((p) => p.t), onWater: __lab.weather.sims.moon.onWater }));
    const gapsOk = rip.pulses.every((t, i) => !i || t - rip.pulses[i - 1] >= 950);
    check(scope, 'the moon pool gliding on water: ripples, at most one a second', rip.ev >= 1 && rip.pulses.length >= 1 && gapsOk, JSON.stringify(rip));
    // onto Noomi: moonlit (silver glow, slow breath), dwell builds
    await page.mouse.move(g.body.cx, g.body.mid, { steps: 10 });
    await page.waitForFunction(() => __lab.companion.rig.faceOverride?.set?.breathRate === 0.12 && __lab.weather.metrics().dwell > 0.03, null, { timeout: T });
    const lit = await wx(page, () => ({ face: __lab.companion.rig.faceOverride, log: __lab.weather.reactor.log.map((e) => e.tag), m: __lab.weather.metrics(), p: __lab.weather.progress }));
    await H.shot(page, out, 'weather-phone-moonlit');
    check(scope, 'moonlit: breathRate 0.12 (Noomi slows the most), silver glow ≥ 0.8, dwell and progress rise', lit.face.set.breathRate === 0.12 && lit.face.min.glow >= 0.8 && lit.p > 0.02, JSON.stringify(lit));
    check(scope, 'Noomi dreams in the moonlight (its own beat)', lit.log.some((t) => /noomi-moon-dream/.test(t)), JSON.stringify(lit.log));
    // rest it in the sky: a falling star ('strike') in the cove
    await page.mouse.move(g.W * 0.3, g.skyTop + 90, { steps: 10 });
    await page.waitForFunction(() => __lab.weather.pulses.some((p) => p.kind === 'strike' && p.ok), null, { timeout: T });
    await page.mouse.up();
    const after = await wx(page, () => ({ log: __lab.weather.reactor.log.map((e) => e.type), face: __lab.companion.rig.faceOverride }));
    check(scope, 'resting moonlight in the sky sends a falling star; leaving Noomi, it looks after the light', after.log.includes('moon-leave') && after.face.set.breathRate == null, JSON.stringify(after));
    // arrows and the chip
    await page.focus('.weather .stage');
    const tx0 = await wx(page, () => __lab.weather.sims.moon.tx);
    for (let k = 0; k < 3; k++) await page.keyboard.press('ArrowLeft');
    const tx1 = await wx(page, () => __lab.weather.sims.moon.tx);
    check(scope, 'ArrowLeft ×3 moves the moonlight 84 px', Math.abs(tx0 - tx1 - 84) < 2 || tx1 <= 25, `${tx0} → ${tx1}`);
    await wx(page, () => { __lab.weather.sims.moon.dwell = Math.max(__lab.weather.sims.moon.dwell, 0.9); });
    await holdChip(page, 'lead', () => __lab.weather.resolved);
    const r = await resolvedView(page);
    check(scope, '"Bring the moonlight" rests it on Noomi until the night settles: "The tide is still."', r.cap === 'The tide is still.' && /Moonmilk/.test(r.line), JSON.stringify(r));
    noErrors(scope, errors);
  });

  // --------------------------------------------------------- W4 starlight --
  if (only('stars')) await guard(`${SCOPE}:stars`, async (scope, own) => {
    const { ctx, page, errors } = await openWx(browser, 'phone', 'zuzu');
    own(ctx);
    await settled(page, 'starlight');
    await wx(page, () => __lab.weather.settle());
    await sleep(800);
    const g = await wx(page, () => __lab.weather.geo());
    // a path through four free stars on the left of the sky, away from Zuzu
    const path = await wx(page, () => {
      const s = __lab.weather.sims.stars, b = __lab.weather.geo().body, pts = [];
      for (let i = 0; i < s.n; i++) if (s.st[i] === 0 && s.a[i] > 0.5 && Math.hypot(s.x[i] - b.cx, s.y[i] - b.mid) > b.h) pts.push([s.x[i], s.y[i]]);
      pts.sort((a, c) => (a[0] + a[1] * 0.5) - (c[0] + c[1] * 0.5));
      return pts.slice(0, 4).sort((a, c) => a[0] - c[0]);
    });
    await H.clearEvents(page);
    await page.mouse.move(path[0][0], path[0][1]); await page.mouse.down();
    for (const pt of path.slice(1)) await page.mouse.move(pt[0], pt[1], { steps: 8 });
    await page.waitForFunction(() => __lab.weather.metrics().heldStars >= 3, null, { timeout: T });
    const held = await wx(page, () => __lab.weather.metrics());
    await page.mouse.up();
    await page.waitForFunction(() => __lab.weather.metrics().constellations >= 1, null, { timeout: T });
    await page.waitForFunction(() => __lab.weather.reactor.log.some((e) => e.type === 'constellation'), null, { timeout: T }).catch(() => {});
    const c1 = await wx(page, () => ({ ev: __lab.weather.events.map((e) => e.type), pulses: __lab.weather.pulses.filter((p) => p.kind === 'success'), log: __lab.weather.reactor.log, m: __lab.weather.metrics(), mood: __lab.weather.env.mood }));
    check(scope, 'a sweep gathers an orbiting cluster (tinks), held at the fingertip', held.heldStars >= 3 && c1.ev.filter((t) => t === 'gather').length >= 3, JSON.stringify(held));
    check(scope, 'let go away from Zuzu: a constellation in Zuzu\'s shape, a realm "success", a celebration', c1.m.constellations === 1 && c1.pulses.some((p) => p.ok) && c1.log.some((e) => e.type === 'constellation'), JSON.stringify(c1));
    await H.shot(page, out, 'weather-phone-constellation');
    // gather near and let go on Zuzu: a star shower (gift)
    const near = await wx(page, () => {
      const s = __lab.weather.sims.stars; let best = null, bd = Infinity;
      for (let i = 0; i < s.n; i++) if (s.st[i] === 0 && s.a[i] > 0.5) { const d = s.y[i]; if (d < bd) { bd = d; best = [s.x[i], s.y[i]]; } }
      return best;
    });
    await page.mouse.move(near[0], near[1]); await page.mouse.down();
    await page.waitForFunction(() => __lab.weather.metrics().heldStars >= 1, null, { timeout: T });
    await page.mouse.move(g.body.cx, g.body.mid - g.body.h * 0.2, { steps: 12 }); await page.mouse.up();
    await page.waitForFunction(() => __lab.weather.events.some((e) => e.type === 'gift'), null, { timeout: T });
    check(scope, 'let go on Zuzu: a star shower (gift) at its feet', true);
    // the chip streams stars above Zuzu; letting go raises a constellation
    await holdChip(page, 'lead', () => __lab.weather.sims.stars.clusterSize(-11) >= 3);
    await page.waitForFunction(() => __lab.weather.metrics().constellations >= 2, null, { timeout: T });
    check(scope, '"Gather stars" (held) streams stars to a point; letting go makes a constellation', true);
    // arrow keys gather one star per press, then let go after a pause
    await page.focus('.weather .stage');
    const k0 = await wx(page, () => { const st = __lab.weather.sims.stars; return { made: st.made, st: Array.from(st.st.slice(0, st.n)).join(''), a: Array.from(st.a.slice(0, st.n), (v) => +v.toFixed(2)), cl: Array.from(st.cl.slice(0, st.n)), cId: Array.from(st.cId), cn: Array.from(st.cn) }; });
    for (let k = 0; k < 4; k++) { await page.keyboard.press('ArrowRight'); await sleep(120); }
    const ok = await page.waitForFunction((m) => __lab.weather.sims.stars.made > m, k0.made, { timeout: T }).then(() => true, () => false);
    if (!ok) check(scope, 'arrow keys gather a constellation', false, JSON.stringify({ k0, now: await wx(page, () => ({ snap: __lab.weather.sims.stars.snapshot(), tools: { keyT: __lab.weather.tools.stars.keyT, gp: __lab.weather.tools.stars.gp }, focus: document.activeElement?.className })) }));
    const r = await resolvedView(page);
    check(scope, 'arrow keys gather a third constellation, and Starlight resolves', r.cap === 'The stars found their places.' && /spiral/i.test(r.line), JSON.stringify(r));
    noErrors(scope, errors);
  });

  // -------------------------------------------------------------- W4 wind --
  if (only('wind')) await guard(`${SCOPE}:wind`, async (scope, own) => {
    const { ctx, page, errors } = await openWx(browser, 'phone', 'loomi');
    own(ctx);
    await settled(page, 'wind');
    await wx(page, () => __lab.weather.settle());
    await sleep(600);
    const g = await wx(page, () => __lab.weather.geo());
    const w0 = await wx(page, () => ({ m: __lab.weather.metrics(), realm: __lab.weather.realmId, ribbons: __lab.weather.layer.stats().drawn.ribbons, chips: [...document.querySelectorAll('.wx-actions button')].map((b) => b.textContent) }));
    check(scope, 'Wind in the Blue Drift: silk ribbons drawn, ambient gusts, "Send a breeze"', w0.realm === 'blue-drift' && w0.ribbons > 0 && w0.m.energy > 0.1 && w0.chips[0] === 'Send a breeze', JSON.stringify(w0));
    // a fast jet across Loomi: energy, a gust that brushes and leans it (clear of the arrival beat: a gust is a minor
    // beat, which never waits in line)
    await page.waitForFunction(() => { const r = __lab.weather.reactor; return r.t - r.mem.lastReact > 1.4; }, null, { timeout: T });
    await H.clearEvents(page);
    const y = g.body.top + 20;
    await drag(page, line(8, y, g.W - 8, y, 8), 10);
    await page.waitForFunction(() => __lab.weather.events.some((e) => e.type === 'gust'), null, { timeout: T });
    await page.waitForFunction(() => Math.abs(__lab.companion.rig.body.lean) > 0.004, null, { timeout: T });
    const gu = await wx(page, () => ({ lean: __lab.companion.rig.body.lean, e: __lab.weather.metrics().energy, log: __lab.weather.reactor.log.map((e) => e.tag), comp: __lab.events.map((e) => e.type) }));
    check(scope, 'a gust across Loomi leans it (rig.body.lean ≠ 0) and it floats in character', Math.abs(gu.lean) > 0.004 && gu.log.some((t) => t === 'loomi-gust-float'), JSON.stringify(gu));
    check(scope, 'the wind is not a Companion gesture', !gu.comp.some((t) => t === 'drag' || t === 'stroke'), JSON.stringify(gu.comp));
    // a circle makes an eddy
    const cx = g.W / 2, cy = g.skyTop + 150, circle = Array.from({ length: 41 }, (_, i) => [cx + Math.cos(i / 20 * Math.PI * 2) * 80, cy + Math.sin(i / 20 * Math.PI * 2) * 60]);
    await drag(page, circle, 12);
    await page.waitForFunction(() => __lab.weather.events.some((e) => e.type === 'eddy' || e.type === 'calm-loop'), null, { timeout: T });
    check(scope, 'a circular drag makes an eddy', true);
    // slow, smooth strokes build calm (progress); about 9 s of them calm the wind (real stroke time)
    const c0 = await wx(page, () => __lab.weather.metrics().calm);
    await drag(page, line(40, g.skyTop + 140, g.W - 40, g.skyTop + 140, 28), 50);
    const c1 = await wx(page, () => ({ calm: __lab.weather.metrics().calm, p: __lab.weather.progress }));
    check(scope, 'slow, smooth strokes build calm (progress rises)', c1.calm > c0 + 0.08 && c1.p > 0.08, JSON.stringify({ c0, c1 }));
    await H.shot(page, out, 'weather-phone-wind');
    // the arrow sends one breeze from its side; the chip held gives a slow breeze that calms
    await page.focus('.weather .stage');
    await page.keyboard.press('ArrowLeft');
    const br = await wx(page, () => ({ on: __lab.weather.tools.breeze.on, ux: __lab.weather.tools.breeze.ux }));
    check(scope, 'ArrowLeft sends a breeze from the left', br.on && br.ux === 1, JSON.stringify(br));
    const c2 = await wx(page, () => __lab.weather.metrics().calm);
    await holdChip(page, 'lead', (c2) => __lab.weather.metrics().calm > c2 + 0.04 || __lab.weather.resolved, c2);
    check(scope, '"Send a breeze" (held) is a steady slow breeze that builds calm', true);
    if (!(await wx(page, () => __lab.weather.resolved))) {
      await wx(page, () => { __lab.weather.sims.wind.calm = Math.max(__lab.weather.sims.wind.calm, 0.95); });
      await holdChip(page, 'lead', () => __lab.weather.resolved);
    }
    const r = await resolvedView(page);
    const amb = await wx(page, () => ({ ambient: __lab.weather.sims.wind.ambient, clear: __lab.weather.pulses.some((p) => p.kind === 'clear' && p.ok) }));
    check(scope, 'calm resolves the Wind: "Just a breeze now.", a realm "clear", the gusts settle', r.cap === 'Just a breeze now.' && amb.ambient === 0 && amb.clear, JSON.stringify({ r, amb }));
    noErrors(scope, errors);
  });

  // --------------------------------------------------------------- W4 fog --
  if (only('fog')) await guard(`${SCOPE}:fog`, async (scope, own) => {
    const { ctx, page, errors } = await openWx(browser, 'phone', 'loomi');
    own(ctx);
    await wx(page, () => __lab.weather.setWeather('fog'));
    await settled(page, 'fog');
    await wx(page, () => __lab.weather.settle());
    await sleep(600);
    const g = await wx(page, () => __lab.weather.geo());
    const f0 = await wx(page, () => ({ m: __lab.weather.metrics(), mood: __lab.weather.env.mood, realm: __lab.weather.realmId, chips: [...document.querySelectorAll('.wx-actions button')].map((b) => b.textContent), face: __lab.companion.rig.faceOverride }));
    check(scope, 'Fog in the Blue Drift (a turn, no front): mist everywhere, no water chip, Loomi glows like a lantern', f0.realm === 'blue-drift' && f0.m.fogClear < 0.05 && f0.chips.join() === 'Clear the mist' && f0.face.min.glow >= 0.7, JSON.stringify(f0));
    await H.clearEvents(page);
    for (let k = 0; k < 4; k++) await drag(page, line(20, g.skyTop + 60 + k * 70, g.W - 20, g.skyTop + 90 + k * 70, 12), 14);
    await drag(page, line(20, g.body.top - 10, g.W - 20, g.body.top - 10, 12), 14);
    const f1 = await wx(page, () => ({ m: __lab.weather.metrics(), mood: __lab.weather.env.mood, ev: __lab.weather.events.map((e) => e.type), log: __lab.weather.reactor.log.map((e) => e.type) }));
    check(scope, 'wiping clears the mist (fogClear ↑) and the realm clears (clarity target ↑)', f1.m.fogClear > 0.08 && f1.mood.clarity > f0.mood.clarity + 0.02, JSON.stringify({ f0: f0.mood, f1: f1.mood, fc: f1.m.fogClear }));
    check(scope, 'a wipe near Loomi reveals it', f1.ev.includes('revealed'), JSON.stringify(f1.ev));
    await H.shot(page, out, 'weather-phone-fog-wiped');
    // a still finger grows a clear patch
    const hp = [g.W * 0.78, g.skyTop + 150];
    const h0 = await wx(page, (p) => __lab.weather.sims.mist.grid.sample(p[0], p[1]), hp);
    await page.mouse.move(hp[0], hp[1]); await page.mouse.down();
    const held = await page.waitForFunction((p) => __lab.weather.sims.mist.grid.sample(p[0], p[1]) < 0.3, hp, { timeout: T }).then(() => true, () => false);
    const h1 = await wx(page, (p) => __lab.weather.sims.mist.grid.sample(p[0], p[1]), hp);
    await page.mouse.up();
    check(scope, 'a hold grows a clear patch under the finger', held, `${h0} → ${h1}`);
    // arrows wipe a band in from their side
    await page.focus('.weather .stage');
    const a0 = await wx(page, () => __lab.weather.metrics().fogClear);
    for (let k = 0; k < 3; k++) await page.keyboard.press('ArrowLeft');
    const a1 = await wx(page, () => __lab.weather.metrics().fogClear);
    check(scope, 'ArrowLeft ×3 wipes a band in from the left', a1 > a0 + 0.01, `${a0} → ${a1}`);
    // the chip spirals out from Loomi until the fog lifts
    await holdChip(page, 'lead', () => __lab.weather.resolved, null, 150000);
    const r = await resolvedView(page);
    const lift = await wx(page, () => ({ lifted: __lab.weather.sims.mist.lifted, dew: __lab.weather.layer.scene.dew, clear: __lab.weather.pulses.some((p) => p.kind === 'clear' && p.ok) }));
    check(scope, '"Clear the mist" (held) clears it; at 75 % the fog lifts as a whole, a realm "clear", dew glints', r.cap === 'The mist lifted.' && lift.lifted && lift.dew >= 0 && lift.clear, JSON.stringify({ r, lift }));
    noErrors(scope, errors);
  });

  // ---------------------------------------------------------- W4 warm glow --
  if (only('warm')) await guard(`${SCOPE}:warm`, async (scope, own) => {
    const { ctx, page, errors } = await openWx(browser, 'phone', 'pipzi');
    own(ctx);
    await settled(page, 'warm');
    await wx(page, () => __lab.weather.settle());
    await sleep(800);
    const g = await wx(page, () => __lab.weather.geo());
    const e0 = await wx(page, () => ({ m: __lab.weather.metrics(), mood: __lab.weather.env.mood, realm: __lab.weather.realmId, embers: __lab.weather.layer.stats().drawn.embers }));
    check(scope, 'Warm glow at the Spark Festival: dim embers waiting', e0.realm === 'spark-festival' && e0.embers > 0 && e0.m.heat === 0, JSON.stringify(e0));
    // a drag through embers kindles them (realm taps light lanterns), Pipzi sparks
    const path = await wx(page, () => {
      const e = __lab.weather.sims.embers, b = __lab.weather.geo().body, pts = [];
      for (let i = 0; i < e.n; i++) if (e.litT[i] < 0 && Math.hypot(e.x[i] - b.cx, e.y[i] - b.mid) > b.h * 0.8) pts.push([e.x[i], e.y[i]]);
      return pts.sort((a, c) => a[1] - c[1]).slice(0, 5).sort((a, c) => a[0] - c[0]);
    });
    await H.clearEvents(page);
    await page.mouse.move(path[0][0], path[0][1]); await page.mouse.down();
    for (const pt of path.slice(1)) await page.mouse.move(pt[0], pt[1], { steps: 6 });
    await page.mouse.up();
    await page.waitForFunction(() => __lab.weather.metrics().heat > 0.05, null, { timeout: T });
    await sleep(800);
    const e1 = await wx(page, () => ({ m: __lab.weather.metrics(), mood: __lab.weather.env.mood, taps: __lab.weather.pulses.filter((p) => p.kind === 'tap' && p.ok).length, log: __lab.weather.reactor.log.map((e) => e.tag), ev: __lab.weather.events.filter((e) => e.type === 'kindle').length }));
    check(scope, 'a drag kindles the embers it passes: heat ↑, warmth target ↑, kindle taps reach the realm', e1.m.heat > 0.05 && e1.ev >= 2 && e1.taps >= 1 && e1.mood.warmth > e0.mood.warmth, JSON.stringify(e1));
    check(scope, 'Pipzi sparks at a kindle (its own beat)', e1.log.some((t) => t === 'pipzi-kindle-spark'), JSON.stringify(e1.log));
    // hold Pipzi: it becomes the hearth (warm rings kindle embers by radius; 'success' at its feet every 2 s)
    const h0 = await wx(page, () => __lab.weather.metrics().heat);
    await page.mouse.move(g.body.cx, g.body.mid); await page.mouse.down();
    await page.waitForFunction(() => __lab.weather.metrics().hearth, null, { timeout: T });
    await page.waitForFunction((h0) => __lab.weather.metrics().heat > h0 + 0.1 && __lab.weather.pulses.some((p) => p.kind === 'success' && p.ok), h0, { timeout: T });
    await H.shot(page, out, 'weather-phone-hearth');
    await page.mouse.up();
    const hh = await wx(page, () => ({ comp: __lab.events.map((e) => e.type), ring: __lab.weather.sims.embers.ringR }));
    check(scope, 'holding Pipzi (a Companion hold) makes it the hearth: heat ↑ and "success" at its feet', hh.comp.includes('hold'), JSON.stringify(hh));
    // the chip is the hearth too, until every ember glows
    await holdChip(page, 'lead', () => __lab.weather.resolved);
    const r = await resolvedView(page);
    check(scope, '"Spread the warmth" (held) kindles the rest; Warm glow resolves: "Everything is glowing."', r.cap === 'Everything is glowing.' && /KAPOW/.test(r.line), JSON.stringify(r));
    noErrors(scope, errors);
  });

  // --------------------------------------------------- W4 water, puddles --
  if (only('water')) await guard(`${SCOPE}:water`, async (scope, own) => {
    const { ctx, page, errors } = await openWx(browser, 'phone', 'loomi');
    own(ctx);
    await settled(page, 'wind');
    await wx(page, () => __lab.weather.settle());
    await sleep(500);
    const g = await wx(page, () => __lab.weather.geo());
    await H.clearEvents(page);
    // a drag on the water (left of Loomi) sends a swell toward it
    const wy = g.water[0] + 50;
    await drag(page, line(6, wy, 70, wy, 6), 20);
    await page.waitForFunction(() => __lab.weather.events.some((e) => e.type === 'water-push'), null, { timeout: T });
    await page.waitForFunction(() => __lab.weather.events.some((e) => e.type === 'wave-arrive'), null, { timeout: T });
    await page.waitForFunction(() => __lab.weather.reactor.log.some((e) => e.type === 'wave-arrive'), null, { timeout: T }).catch(() => {});
    const w1 = await wx(page, () => ({ pulses: __lab.weather.pulses.filter((p) => p.kind === 'ripple'), log: __lab.weather.reactor.log.map((e) => e.tag), comp: __lab.events.map((e) => e.type) }));
    check(scope, 'a drag on the water sends a swell (realm "ripple"); it reaches Loomi, who bobs serenely', w1.pulses.some((p) => p.ok) && w1.log.some((t) => t === 'loomi-wave-serene'), JSON.stringify(w1));
    // "Push the water" (a tap chip) rolls a swell in from one side
    const n0 = await wx(page, () => __lab.weather.events.filter((e) => e.type === 'wave-arrive').length);
    await page.click('.wx-actions [data-action="water"]');
    await page.waitForFunction((n0) => __lab.weather.events.filter((e) => e.type === 'wave-arrive').length > n0, n0, { timeout: T });
    check(scope, '"Push the water" rolls a swell to Loomi', true);
    await H.shot(page, out, 'weather-phone-water');
    noErrors(scope, errors);
    // gold swells in Warm glow add heat (the Moonmilk Cove)
    const b = await openWx(browser, 'phone', 'noomi');
    try {
      await wx(b.page, () => __lab.weather.setWeather('warm', { instant: true }));
      await settled(b.page, 'warm');
      await wx(b.page, () => __lab.weather.act('water'));
      await b.page.waitForFunction(() => __lab.weather.sims.waves.snapshot().swells.some((s) => s.gold), null, { timeout: T });
      await b.page.waitForFunction(() => __lab.weather.events.some((e) => e.type === 'wave-arrive') && __lab.weather.metrics().heat > 0, null, { timeout: T });
      check(scope, 'in Warm glow the swell is gold and brings heat when it reaches Noomi', true);
      noErrors(`${scope}:warm`, b.errors);
    } finally { await b.ctx.close(); }
    // puddles in a dry realm after rain (Glitzi's Static Storm)
    const c = await openWx(browser, 'phone', 'glitzi');
    try {
      await wx(c.page, () => __lab.weather.setWeather('rain', { instant: true }));
      await settled(c.page, 'rain');
      await c.page.waitForFunction(() => __lab.weather.metrics().puddles > 0.5, null, { timeout: T * 2 });
      const e = await wx(c.page, () => Array.from(__lab.weather.sims.puddles.e)), W = (await wx(c.page, () => __lab.weather.geo())).W;
      const k = e[2] > 0 ? 0 : 1, px = Math.min(W - 4, Math.max(4, e[4 * k] + (k ? 0.4 : -0.4) * e[4 * k + 2]));   // its outer side, clear of Glitzi
      await c.page.mouse.click(px, e[4 * k + 1]);
      await c.page.waitForFunction(() => __lab.weather.events.some((x) => x.type === 'puddle'), null, { timeout: T });
      const pz = await wx(c.page, () => ({ realm: __lab.weather.realmId, rip: Array.from(__lab.weather.tools.puddleRip), taps: __lab.weather.pulses.filter((p) => p.kind === 'tap').length }));
      await H.shot(c.page, out, 'weather-phone-puddles');
      check(scope, 'rain soaks a dry realm: puddles appear either side of Glitzi and ripple when touched', pz.realm === 'static-storm' && pz.rip.some((a) => a < 2) && pz.taps >= 1, JSON.stringify(pz));
      noErrors(`${scope}:puddles`, c.errors);
    } finally { await c.ctx.close(); }
  });

  // ------------------------------------------------- W8 fronts and turns --
  if (only('front')) await guard(`${SCOPE}:front`, async (scope, own) => {
    const { ctx, page, errors } = await openWx(browser, 'phone', 'boppo');
    own(ctx);
    // record each realm swap and the cover at that moment, and any frame without a realm canvas
    await wx(page, () => {
      window.__swaps = []; window.__noRealm = 0;
      let realm = __lab.weather.env.realm;
      const tick = () => {
        const lw = __lab.weather;
        if (!lw) return;
        if (!document.querySelector('.weather canvas.hushfold-realm')) window.__noRealm++;
        if (lw.env.realm !== realm) { realm = lw.env.realm; window.__swaps.push({ cover: lw.layer.scene.front.cover, swapped: lw.layer.scene.front.swapped }); }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.click('.wx-dial [data-weather="moonlight"]');
    await page.waitForFunction(() => __lab.weather.front, null, { timeout: T });
    const f0 = await wx(page, () => ({ front: __lab.weather.front, chips: [...document.querySelectorAll('.wx-actions button')].map((b) => b.disabled) }));
    check(scope, 'a realm change sends a front (sweep); the chips wait under its cover', f0.front.mode === 'sweep' && f0.chips.every(Boolean), JSON.stringify(f0));
    // drags push the front on
    await drag(page, line(20, 300, 370, 320, 10), 10);
    const boost = await wx(page, () => __lab.weather.session.planner._boost);
    check(scope, 'dragging across the front pushes it (planner boost)', boost > 0, `${boost}`);
    await settled(page, 'moonlight');
    const sw = await wx(page, () => ({ swaps: window.__swaps, none: window.__noRealm, realm: __lab.weather.realmId, backdrop: document.querySelector('.weather').dataset.backdrop }));
    check(scope, 'one swap, only under a full cover (≥ 0.95), never without a realm canvas', sw.swaps.length === 1 && sw.swaps[0].cover >= 0.95 && sw.none === 0 && sw.realm === 'moonmilk-cove' && sw.backdrop === 'dark', JSON.stringify(sw));
    // a same-realm turn: the old weather is still there at 300 ms while the new one enters
    // (turn timings run in sim time, which software GL slows: wait on state, not the wall clock)
    await page.click('.wx-dial [data-weather="starlight"]');
    await page.waitForFunction(() => __lab.weather.sims.stars.amount > 0.05, null, { timeout: T });
    const t = await wx(page, () => ({ moon: __lab.weather.sims.moon.amount, stars: __lab.weather.sims.stars.amount, front: !!__lab.weather.front, state: __lab.weather.state, drawn: __lab.weather.layer.stats().drawn.stars }));
    check(scope, 'Moonlight → Starlight turns in place: the moon pool still fades while stars prick in', !t.front && t.moon > 0.3 && t.moon < 1 && t.stars > 0 && t.stars < 1 && t.state === 'turning', JSON.stringify(t));
    await H.shot(page, out, 'weather-phone-turn');
    // touchable at once: a storm swipe 300 ms after the pick opens the clouds
    await settled(page, 'starlight');
    await page.click('.wx-dial [data-weather="storm"]');
    await sleep(300);
    const g = await wx(page, () => __lab.weather.geo());
    for (let k = 0; k < 4; k++) { const x = g.body.cx + (k - 1.5) * 40; await drag(page, line(x, g.skyTop + 6, x, g.body.top - 30, 10), 12); }
    await page.waitForFunction(() => __lab.weather.metrics().clear > 0.1, null, { timeout: T });
    check(scope, 'a swipe 300 ms after picking Storm (still entering) opens the clouds', true);
    noErrors(scope, errors);
  });

  // ------------------------------------------------------------- morphs --
  if (only('morph')) await guard(`${SCOPE}:morph`, async (scope, own) => {
    const { ctx, page, errors } = await openWx(browser, 'phone', 'noomi');
    own(ctx);
    // Rain → Starlight: the drops in flight become the stars
    await wx(page, () => __lab.weather.setWeather('rain', { instant: true }));
    await settled(page, 'rain');
    await page.waitForFunction(() => __lab.weather.sims.rain.alive > 8, null, { timeout: T });
    const m = await wx(page, async () => {
      const lw = __lab.weather, n0 = lw.sims.rain.alive;
      lw.setWeather('starlight');
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const s = lw.sims.stars;
      let home = 0;
      for (let i = 0; i < s.n; i++) if (s.st[i] === 5) home++;
      return { n0, alive: lw.sims.rain.alive, home, realm: lw.realmId };
    });
    check(scope, 'Rain → Starlight (same realm): the drops in flight slow, rise and become the stars', m.n0 > 0 && m.alive === 0 && m.home > 0 && m.realm === 'moonmilk-cove', JSON.stringify(m));
    await settled(page, 'starlight');
    noErrors(scope, errors);
    // Storm → Sunshine (the Blue Drift): the clouds part from the centre; the pool slides down a shaft through the gap
    const b = await openWx(browser, 'phone', 'loomi');
    try {
      await wx(b.page, () => __lab.weather.setWeather('storm', { instant: true }));
      await settled(b.page, 'storm');
      await wx(b.page, () => __lab.weather.settle());
      await b.page.waitForFunction(() => !__lab.weather.session.planner._instant, null, { timeout: T });   // a normal turn, not a fast-forward
      await sleep(300);
      const r = await wx(b.page, async () => {
        const lw = __lab.weather, c0 = lw.sims.clouds.clear(), rows = [];
        lw.setWeather('sunshine');
        for (let k = 0; k < 6; k++) { await new Promise((res) => requestAnimationFrame(res)); rows.push({ sunAt: lw.geo().sunAt.map(Math.round), clear: +lw.sims.clouds.clear().toFixed(3) }); }
        return { c0, rows, W: lw.geo().W, sun: lw.geo().sun.map(Math.round) };
      });
      const atGap = r.rows.length && Math.abs(r.rows[0].sunAt[0] - r.W / 2) < r.W * 0.1, parted = r.rows[r.rows.length - 1].clear > r.c0 + 0.05;
      check(scope, 'Storm → Sunshine: the clouds part from the centre and the light starts at the gap, not the sun', atGap && parted, JSON.stringify(r));
      await settled(b.page, 'sunshine');
      const end = await wx(b.page, () => ({ sunAt: __lab.weather.geo().sunAt, sun: __lab.weather.geo().sun }));
      check(scope, '…then the beam hangs from the realm\'s own sun again', Math.abs(end.sunAt[0] - end.sun[0]) < 2 && Math.abs(end.sunAt[1] - end.sun[1]) < 2, JSON.stringify(end));
      // Fog → any: the mist sinks to the floor as it leaves
      await wx(b.page, () => __lab.weather.setWeather('fog', { instant: true }));
      await settled(b.page, 'fog');
      const tops = await wx(b.page, async () => {
        const lw = __lab.weather, out = [];
        lw.setWeather('wind');
        for (let k = 0; k < 6; k++) { await new Promise((r) => setTimeout(r, 150)); out.push([+lw.sims.mist.amount.toFixed(2), Math.round(lw.layer.scene.mistTop)]); }
        return out;
      });
      const sinking = tops.every((t, i) => !i || (t[0] <= tops[i - 1][0] && t[1] >= tops[i - 1][1]));
      check(scope, 'Fog → Wind: the mist sinks to the floor and thins, revealing the new weather from the top', sinking && tops[tops.length - 1][1] > tops[0][1], JSON.stringify(tops));
      noErrors(`${scope}:loomi`, b.errors);
    } finally { await b.ctx.close(); }
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
    // two chips (a water realm: the lead chip and "Push the water") at the narrowest phone and in landscape
    for (const vp of ['small', 'land']) {
      const { ctx, page, errors } = await openWx(browser, vp, 'noomi');
      try {
        const sc = `${scope}:${vp}:water`;
        await settled(page, 'moonlight');
        const chips = await wx(page, () => [...document.querySelectorAll('.wx-actions button')].map((b) => b.textContent));
        await H.layout(page, sc, { scrollers: ['.wx-dial', '.wx-actions'] });
        const rows = await wx(page, () => [...document.querySelectorAll('.weather .bottom > *')].map((e) => Math.round(e.getBoundingClientRect().height)));
        check(sc, 'two chips side by side, the rows still 50 px', chips.length === 2 && rows.join() === '50,50', JSON.stringify({ chips, rows }));
        await H.shot(page, out, `weather-${vp}-moonlight`);
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
