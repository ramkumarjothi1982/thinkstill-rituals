// Unit tests for Weather Weaver's pure core (spec-weather.md §13, U1–U18).
// Node only, no DOM:
//   node --test hushmallow/sensory-lab/tests/weather.test.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  DIAL_ORDER, WEATHER_IDS, WEATHERS, TOOLS, ALL_TOOLS, COPY, ENTRY, REALM_ORDER, DAY_REALMS, WATER_REALMS, DRY_REALMS, TIMING, POINTER, PULSE_EVENTS,
  hostScore, pickRealm, entryWeather, moodFor, transformFor, pulseFor, progressFor, captionFor, lineFor, realmShort, realmPhrase,
  classify, isFling, TransitionPlanner, WeatherSession,
} from '../core/weather.js';
import { FieldGrid, scatter } from '../core/weather/field.js';
import { CloudBank, MistField, StrikeClock, glowEnvelope, COLS, CENTRAL, GLOW_RISE, STRIKE_MIN, MIST_TAU } from '../core/weather/clouds.js';
import { RainField, orbRadius, ORB_REACH } from '../core/weather/rain.js';
import { WindField, Ribbons, Fluffs, WIND_TAU } from '../core/weather/wind.js';
import { WaveField, Puddles, ARRIVE_AT, DRY_TAU } from '../core/weather/water.js';
import { LightPool, EmberField, SUN_REST } from '../core/weather/light.js';
import { placeStars, constellationShape, StarSwarm, CONSTELLATION_STYLE, TWINKLE_HZ, TWINKLE_AMP, GATHER_R, MIN_GAP } from '../core/weather/stars.js';
import { FEEL, REST, EVENT_TYPES, GAP, CLOSED_EYES, decide, createMemory, restFor, isPositiveMix } from '../core/weather-mallow.js';
import { REALM_GEO, homeRealm } from '../core/environment.js';
import { softened } from '../core/personality.js';
import { REALMS, REALM_IDS } from '../../src/world/realm.js';
import { MALLOW_IDS } from '../../src/mallows/registry.js';
import { REACTIONS } from '../../src/mallows/reactions.js';
import { PRESETS } from '../../src/mallows/expressions.js';
import { rng } from '../core/math.js';
import { collectStrings, lintCopy } from './lib/copy-lint.mjs';

const LAB = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(LAB, '..', 'src');
const DT = 1 / 60;
const run = (fn, secs, dt = DT) => { for (let t = 0; t < secs - 1e-9; t += dt) fn(dt); };
const BODY = { cx: 195, top: 450, bottom: 700, mid: 575, w: 240, h: 250 };
const VIEWPORTS = [[390, 844], [375, 812], [320, 568], [412, 915], [1280, 860], [844, 390]];
const AXES = ['agitation', 'heaviness', 'clarity', 'warmth'];
const VOICE_KINDS = ['tap', 'giggle', 'surprise', 'boing', 'content', 'coo', 'hum', 'grumble'];
const FX_KINDS = ['spark', 'star', 'moon', 'heart', 'pixelHeart', 'drop', 'tear', 'rain', 'shard', 'ring', 'pop', 'ribbon', 'puff', 'steam', 'z', 'dust', 'cloud'];

// ------------------------------------------------------------------- U1 --
test('U1 eight weathers with complete copy, tools and host scores over the real realms', () => {
  assert.deepEqual(DIAL_ORDER, ['sunshine', 'wind', 'fog', 'rain', 'storm', 'moonlight', 'starlight', 'warm']);
  assert.equal(WEATHER_IDS, DIAL_ORDER);
  assert.deepEqual([...REALM_ORDER].sort(), [...REALM_IDS].sort());
  for (const [i, id] of DIAL_ORDER.entries()) {
    const w = WEATHERS[id];
    assert.equal(w.id, id);
    for (const k of ['label', 'hint', 'caption', 'say']) assert.ok(typeof w[k] === 'string' && w[k].length > 0, `${id}.${k}`);
    assert.ok(w.hint.length <= 48, `${id} hint ≤ 48: "${w.hint}"`);
    assert.ok(w.alt && typeof w.alt.label === 'string' && w.alt.label.length > 0 && typeof w.alt.hold === 'boolean', `${id} alt`);
    assert.equal(w.tool, TOOLS[i]);
    assert.ok(['cloud', 'light', 'night'].includes(w.family));
    assert.deepEqual(Object.keys(w.hosts).sort(), [...REALM_IDS].sort(), `${id} scores every realm`);
    for (const r of REALM_IDS) assert.ok([0, 1, 2, 3].includes(w.hosts[r]) && hostScore(id, r) === w.hosts[r]);
    assert.ok(w.order.length >= 2 && w.order.every((r) => REALM_IDS.includes(r) && w.hosts[r] >= 2), `${id} order`);
    for (const k of AXES) { assert.ok(w.base[k] >= 0 && w.base[k] <= 1); assert.ok(w.resolved[k] >= 0 && w.resolved[k] <= 1); }
    assert.ok(w.T > 0 && w.T <= 1);
  }
  // the seven required interactions: clouds, rain, wind, waves (water), sunlight, stars, moonlight
  const reach = new Set([...DIAL_ORDER.map((id) => WEATHERS[id].tool), 'water']);
  for (const t of ['clouds', 'rain', 'wind', 'water', 'sun', 'stars', 'moon']) assert.ok(reach.has(t), t);
  assert.deepEqual(ALL_TOOLS, [...TOOLS, 'water']);
  assert.equal(hostScore('nope', 'blue-drift'), 0);
  assert.equal(hostScore('rain', 'nowhere'), 0);
});

// ------------------------------------------------------------------- U2 --
test('U2 pickRealm keeps the sky rule, stays home when it can, and always returns a hosting realm', () => {
  const sky = (r) => REALM_GEO[r].sky;
  for (const w of DIAL_ORDER) {
    for (const home of REALM_IDS) {
      for (const current of [null, ...REALM_IDS]) {
        const r = pickRealm(w, { current, home });
        assert.ok(REALM_IDS.includes(r), `${w} ${current}/${home} → ${r}`);
        assert.ok(hostScore(w, r) >= 1, `${w} lands where it can happen (${r})`);
        if (w === 'sunshine') assert.equal(sky(r), 'day', `sunshine never at dusk or night (${r})`);
        if (w === 'moonlight' || w === 'starlight') assert.notEqual(sky(r), 'day', `${w} never by day (${r})`);
        if (hostScore(w, home) >= 1 && (current === null || current === home)) assert.equal(r, home, `${w} stays home (${home})`);
        if (current && hostScore(w, current) >= 2) assert.equal(r, current, `${w} stays in ${current}`);
      }
    }
  }
  assert.equal(pickRealm('sunshine', { current: 'moonmilk-cove', home: 'moonmilk-cove' }), 'sunpop-orchard');
  assert.equal(pickRealm('storm', { current: null, home: 'raindrop-lagoon' }), 'raindrop-lagoon');
  assert.equal(pickRealm('storm', { current: 'spiral-observatory', home: 'spiral-observatory' }), 'static-storm');
});

// ------------------------------------------------------------------- U3 --
test('U3 gentle entry weather per realm; homeRealm honours Comfort DNA', () => {
  assert.deepEqual(Object.keys(ENTRY).sort(), [...REALM_IDS].sort());
  for (const r of REALM_IDS) {
    const w = entryWeather(r);
    assert.notEqual(w, 'storm', r);
    assert.ok(hostScore(w, r) >= 2, `${r} opens with ${w}, which it hosts well`);
    assert.equal(pickRealm(w, { current: null, home: r }), r, `${r} opens at home`);
  }
  assert.equal(entryWeather('junk'), 'moonlight');
  const dna = (environment) => ({ get: (k) => (k === 'environment' ? environment : null) });
  for (const id of MALLOW_IDS) {
    const own = REALM_IDS.find((r) => REALMS[r].mallow === id);
    assert.equal(homeRealm(dna('auto'), id), own, `${id} auto`);
    assert.equal(homeRealm(dna('stage'), id), own, `${id} stage still needs a world`);
    assert.equal(homeRealm(dna('blue-drift'), id), 'blue-drift', `${id} chosen realm`);
    assert.equal(homeRealm(dna('junk'), id), own);
  }
  // a session opens in its home realm's entry weather, or the session's last weather
  const s = new WeatherSession({ home: 'spark-festival' });
  assert.equal(s.weather, 'warm'); assert.equal(s.realm, 'spark-festival');
  const s2 = new WeatherSession({ home: 'moonmilk-cove', weather: 'sunshine' });
  assert.equal(s2.weather, 'sunshine'); assert.equal(s2.realm, 'sunpop-orchard');
});

// ------------------------------------------------------------------- U4 --
test('U4 realm geometry and realm traits match the production realm sources', () => {
  const FILES = { 'blue-drift': 'blue-drift', 'sunpop-orchard': 'sunpop-orchard', 'raindrop-lagoon': 'raindrop-lagoon', 'moonmilk-cove': 'moonmilk-cove',
    'spark-festival': 'spark-festival', 'spiral-observatory': 'spiral-observatory', 'static-storm': 'static-storm' };
  const has = (src, axis, v) => new RegExp(`${axis} \\* ${String(v).replace('.', '\\.')}(?![0-9])`).test(src);
  for (const r of REALM_IDS) {
    const src = readFileSync(join(SRC, 'world', 'realms', `${FILES[r]}.js`), 'utf8'), g = REALM_GEO[r];
    assert.ok(has(src, 'H', g.horizon), `${r} horizon H * ${g.horizon}`);
    for (const k of ['sun', 'moon', 'feature']) {
      if (!g[k]) continue;
      assert.ok(has(src, 'W', g[k][0]) && has(src, 'H', g[k][1]), `${r} ${k} at W * ${g[k][0]}, H * ${g[k][1]}`);
    }
    if (g.shore) assert.ok(src.includes(`${g.shore[0]} - ${g.shore[1]}`), `${r} shoreline ${g.shore}`);
    if (g.water) assert.equal(g.water[0], g.horizon, `${r} water starts at the horizon`);
    // weather.js keeps only the traits it needs; they must agree with REALM_GEO
    assert.equal(DAY_REALMS.includes(r), g.sky === 'day', `${r} day`);
    assert.equal(WATER_REALMS.includes(r), !!g.water, `${r} water`);
    assert.equal(DRY_REALMS.includes(r), !g.water, `${r} dry`);
  }
});

// ------------------------------------------------------------------- U5 --
test('U5 every weather visibly changes its world, monotonically, within the realm rules', () => {
  const realmsFor = (w) => REALM_IDS.filter((r) => hostScore(w, r) > 0);
  const ps = Array.from({ length: 21 }, (_, i) => i / 20);
  for (const w of DIAL_ORDER) {
    const W = WEATHERS[w];
    // base → resolved differs by ≥ 0.4 on some axis (the four mood axes, or the realm transform)
    const diffs = AXES.map((k) => [k, Math.abs(W.resolved[k] - W.base[k])]).concat([['transform', W.T]]);
    const [axis, d] = diffs.reduce((a, b) => (b[1] > a[1] ? b : a));
    assert.ok(d >= 0.4 - 1e-9, `${w} changes its world (best axis ${axis} ${d.toFixed(2)})`);
    for (const r of realmsFor(w)) {
      for (const gentle of [false, true]) {
        let prev = null;
        for (const p of ps) {
          const m = moodFor(w, p, null, r, { gentle }), t = transformFor(w, p);
          const v = axis === 'transform' ? t : m[axis];
          if (prev != null) {
            const dir = axis === 'transform' ? 1 : Math.sign(W.resolved[axis] - W.base[axis]);
            assert.ok((v - prev) * dir >= -1e-9, `${w} in ${r}: ${axis} monotonic at p=${p}`);
          }
          prev = v;
          if (gentle) assert.ok(m.agitation <= 0.3 + 1e-9, `gentle ${w} ${r} agitation ≤ .30`);
          if (r === 'static-storm' && w === 'storm') assert.ok(m.agitation * (1 - t) * (1 - t) <= 0.33, `static-storm never auto-bolts (p=${p})`);
          if (r === 'spark-festival' && (w === 'rain' || w === 'storm')) assert.ok(m.heaviness <= 0.45 + 1e-9, `the fair stays lit in ${w}`);
        }
      }
    }
  }
  // raindrop-lagoon paints its own rain above heaviness 0.35: on at the start of Rain, off once resolved
  assert.ok(moodFor('rain', 0, null, 'raindrop-lagoon').heaviness > 0.35);
  assert.ok(WEATHERS.rain.resolved.heaviness * (1 - WEATHERS.rain.T) < 0.35 && moodFor('rain', 1, null, 'raindrop-lagoon').heaviness < 0.35);
  assert.equal(transformFor('rain', 0.3, true), WEATHERS.rain.T, 'transform latches at T once resolved');
  // live terms: wind energy raises agitation; calm and resolve bring it down; sunshine height moves warmth
  assert.ok(moodFor('wind', 0, { energy: 1, turb: 0.5 }).agitation > moodFor('wind', 0, { energy: 0 }).agitation + 0.4);
  assert.ok(moodFor('wind', 0, { energy: 0.5, calm: 1 }).agitation < moodFor('wind', 0, { energy: 0.5, calm: 0 }).agitation);
  assert.ok(moodFor('rain', 0, { energy: 1 }).agitation > moodFor('rain', 0, { energy: 0 }).agitation, 'gusts stir other weathers');
  assert.equal(moodFor('storm', 0, { energy: 1 }).agitation, moodFor('storm', 0, { energy: 0 }).agitation, 'but not the storm');
  assert.ok(moodFor('sunshine', 0, { height: 0 }).warmth > moodFor('sunshine', 0, { height: 1 }).warmth, 'low light is golden');
  assert.ok(moodFor('sunshine', 0, { painted: 1 }).heaviness < moodFor('sunshine', 0, { painted: 0 }).heaviness, 'burning the haze lifts the overcast');
  assert.ok(moodFor('warm', 0, { hearth: 1 }).warmth > moodFor('warm', 0, { hearth: 0 }).warmth);
  // clamped, finite and written in place, whatever comes in
  const out = {}, rnd = rng(9);
  for (let i = 0; i < 400; i++) {
    const w = DIAL_ORDER[i % 8], live = { energy: rnd() * 3 - 1, turb: rnd() * 3 - 1, calm: rnd() * 3 - 1, height: rnd() * 3 - 1, painted: rnd() * 3 - 1, hearth: i % 7 ? rnd() * 3 : NaN };
    const m = moodFor(w, rnd() * 3 - 1, live, REALM_IDS[i % 7], { gentle: i % 2 === 0 }, out);
    assert.equal(m, out);
    for (const k of AXES) assert.ok(Number.isFinite(m[k]) && m[k] >= 0 && m[k] <= 1, `${w} ${k} ${m[k]}`);
  }
  assert.ok(Number.isFinite(moodFor('nope', NaN).clarity));
});

// ------------------------------------------------------------------- U6 --
test('U6 transitions: covered swaps happen once, retargets are continuous, drags and reduced motion are bounded', () => {
  const drive = (pl, secs, dt = 1 / 60, each = null) => { const log = []; for (let t = 0; t < secs; t += dt) { const s = pl.step(dt); log.push({ ...s }); each?.(s, t); } return log; };
  // a realm change: swap only under a full front, swapNow for exactly one step, then a reveal
  const a = new TransitionPlanner({ weather: 'rain', realm: 'raindrop-lagoon' });
  assert.equal(a.request({ to: 'sunshine', toRealm: 'sunpop-orchard' }), 'front');
  const log = drive(a, 4);
  const swaps = log.filter((s) => s.swapNow);
  assert.equal(swaps.length, 1, 'one swap');
  assert.ok(swaps[0].cover >= TIMING.swapAt, `swap under cover ${swaps[0].cover}`);
  const iSwap = log.findIndex((s) => s.swapNow);
  assert.ok(log.slice(0, iSwap).every((s) => s.realm === 'raindrop-lagoon') && log[iSwap].realm === 'sunpop-orchard');
  assert.ok(log.slice(0, iSwap).filter((s) => s.cover >= TIMING.swapAt).length >= 2, 'two frames painted at full cover first');
  assert.equal(a.phase, 'idle'); assert.equal(a.amount('sunshine'), 1); assert.equal(a.amount('rain'), 0); assert.equal(a.cover, 0);
  // a retarget during cover to a weather the old realm hosts cancels the swap
  const b = new TransitionPlanner({ weather: 'rain', realm: 'raindrop-lagoon' });
  b.request({ to: 'sunshine', toRealm: 'sunpop-orchard' });
  drive(b, 0.3);
  assert.equal(b.request({ to: 'fog', toRealm: 'raindrop-lagoon' }), 'cancelled-swap');
  const blog = drive(b, 4);
  assert.equal(blog.filter((s) => s.swapNow).length, 0, 'no swap');
  assert.equal(b.realm, 'raindrop-lagoon'); assert.equal(b.amount('fog'), 1); assert.equal(b.phase, 'idle');
  // 10 rapid requests across realms: one swap at most, ending on the last pick
  const realmOf = { sunshine: 'sunpop-orchard', moonlight: 'moonmilk-cove', starlight: 'spiral-observatory', storm: 'static-storm', fog: 'blue-drift' };
  const picks = ['sunshine', 'moonlight', 'starlight', 'storm', 'fog', 'moonlight', 'sunshine', 'starlight', 'storm', 'moonlight'];
  const c = new TransitionPlanner({ weather: 'rain', realm: 'raindrop-lagoon' });
  let cs = 0, k = 0;
  for (let t = 0; t < 6; t += 1 / 60) {
    if (k < picks.length && t >= k * 0.06) { c.request({ to: picks[k], toRealm: realmOf[picks[k]] }); k++; }
    if (c.step(1 / 60).swapNow) cs++;
  }
  assert.ok(cs <= 1, `${cs} swaps`); assert.equal(c.weather, 'moonlight'); assert.equal(c.realm, 'moonmilk-cove'); assert.equal(c.amount('moonlight'), 1);
  // key picks that change realm wait 350 ms, so stepping through the dial rebuilds once
  const kp = new TransitionPlanner({ weather: 'rain', realm: 'raindrop-lagoon', pick: (w) => realmOf[w] || 'raindrop-lagoon' });
  let ks = 0;
  for (const [i, w] of ['sunshine', 'moonlight', 'starlight', 'storm'].entries()) {
    assert.equal(kp.request({ to: w, toRealm: realmOf[w], viaKey: true }), 'queued');
    drive(kp, 0.2, 1 / 60, (s) => { if (s.swapNow) ks++; });
    assert.equal(kp.phase, 'idle', `still waiting after key ${i}`);
  }
  drive(kp, 4, 1 / 60, (s) => { if (s.swapNow) ks++; });
  assert.equal(ks, 1); assert.equal(kp.realm, 'static-storm');
  // a drag shortens the reveal, never below 0.5 s
  const revealTime = (dragPx) => {
    const p = new TransitionPlanner({ weather: 'rain', realm: 'raindrop-lagoon' });
    p.request({ to: 'sunshine', toRealm: 'sunpop-orchard' });
    let t0 = null, t = 0;
    for (; t < 5; t += 1 / 60) { if (dragPx) p.drag(dragPx); const s = p.step(1 / 60); if (s.swapNow) t0 = t; if (t0 != null && s.phase !== 'reveal' && !s.swapNow) break; }
    return t - t0;
  };
  const plain = revealTime(0), pushed = revealTime(5000);
  assert.ok(Math.abs(plain - TIMING.reveal) < 0.1, `plain reveal ${plain.toFixed(2)}`);
  assert.ok(pushed < plain - 0.3 && pushed >= TIMING.revealMin - 1 / 60, `pushed reveal ${pushed.toFixed(2)} ≥ 0.5 s`);
  // reduced motion: the front is a fade, ≥ 0.6 s in and ≥ 0.9 s out
  const r = new TransitionPlanner({ weather: 'rain', realm: 'raindrop-lagoon', reduced: true });
  r.request({ to: 'sunshine', toRealm: 'sunpop-orchard' });
  const rlog = drive(r, 4);
  assert.ok(rlog.every((s) => s.mode === 'fade'));
  const firstFull = rlog.findIndex((s) => s.cover >= TIMING.swapAt), swapAt = rlog.findIndex((s) => s.swapNow), done = rlog.findIndex((s, i) => i > swapAt && s.cover === 0);
  assert.ok(firstFull * (1 / 60) >= TIMING.fadeIn * TIMING.swapAt - 0.02, `fade in ${(firstFull / 60).toFixed(2)} s`);
  assert.ok((done - swapAt) / 60 >= TIMING.fadeOut - 0.02, `fade out ${((done - swapAt) / 60).toFixed(2)} s`);
  // a same-realm turn: the old weather leaves while the new one enters from 0.3 s
  const tp = new TransitionPlanner({ weather: 'fog', realm: 'blue-drift' });
  assert.equal(tp.request({ to: 'wind', toRealm: 'blue-drift' }), 'turn');
  const tlog = drive(tp, 2.2);
  const start = tlog.findIndex((s) => s.enterK > 0);
  assert.ok(start >= 0 && start / 60 <= TIMING.delay + 0.02, `enter starts by 0.3 s (${(start / 60).toFixed(2)})`);
  assert.ok(tlog[Math.round(0.3 * 60)].leaveK > 0.2, 'the old weather is already leaving');
  assert.equal(tp.phase, 'idle'); assert.equal(tp.amount('wind'), 1); assert.equal(tp.amount('fog'), 0);
  // rapid same-realm retargets: no weather's presence ever jumps
  const q = new TransitionPlanner({ weather: 'fog', realm: 'blue-drift' }), rnd = rng(4), same = ['fog', 'wind', 'rain', 'storm', 'warm'];
  const prev = new Float32Array(8), maxStep = (1 / 60) * 3 / TIMING.leave + 1e-6;
  for (let i = 0; i < 8; i++) prev[i] = q.amount(DIAL_ORDER[i]);
  let enterPrev = 1;
  for (let i = 0; i < 600; i++) {
    let retarget = false;
    if (i % 17 === 0) retarget = q.request({ to: same[Math.floor(rnd() * same.length)], toRealm: 'blue-drift' }) === 'turn';
    const s = q.step(1 / 60);
    for (let j = 0; j < 8; j++) { const v = q.amount(DIAL_ORDER[j]); assert.ok(Math.abs(v - prev[j]) <= maxStep, `${DIAL_ORDER[j]} jumped at ${i}`); prev[j] = v; }
    if (!retarget) assert.ok(Math.abs(s.enterK - enterPrev) <= maxStep, `enterK continuous at ${i}`);
    enterPrev = s.enterK;
  }
  // Again: the weather leaves quickly, resetNow fires once, then it enters again
  const ag = new TransitionPlanner({ weather: 'storm', realm: 'static-storm' });
  assert.equal(ag.again(), 'again');
  const alog = drive(ag, 2.5);
  assert.equal(alog.filter((s) => s.resetNow).length, 1); assert.equal(ag.amount('storm'), 1); assert.equal(ag.phase, 'idle');
  // finish() completes a front at once (swapNow still fires exactly once)
  const f = new TransitionPlanner({ weather: 'rain', realm: 'raindrop-lagoon' });
  f.request({ to: 'starlight', toRealm: 'spiral-observatory' }); f.finish();
  let fs = 0, n = 0;
  while (f.busy && n++ < 20) if (f.step(0.016).swapNow) fs++;
  assert.equal(fs, 1); assert.equal(f.realm, 'spiral-observatory'); assert.equal(f.amount('starlight'), 1);
  assert.equal(JSON.stringify(f.snapshot()), JSON.stringify(f.snapshot()), 'snapshot is plain data');
});

test('U6 session: arriving → live, picks turn or front, progress latches, Again resets', () => {
  const s = new WeatherSession({ home: 'raindrop-lagoon' });
  assert.equal(s.state, 'booting'); assert.equal(s.update(0.05, 0.5).phase, 'idle', 'nothing runs before begin');
  s.begin();
  assert.equal(s.state, 'arriving');
  let arrived = 0;
  run(() => { s.update(1 / 60, 0); if (s.arrivedNow) arrived++; }, 1.5);
  assert.equal(s.state, 'live'); assert.equal(arrived, 1, 'one arrival moment');
  // progress latches at 1 once resolved
  s.update(1 / 60, 0.6); assert.equal(s.progress, 0.6);
  s.update(1 / 60, 1); assert.ok(s.resolved && s.resolvedNow);
  s.update(1 / 60, 0.2); assert.equal(s.progress, 1); assert.ok(!s.resolvedNow);
  // re-picking the settled weather is Again
  assert.equal(s.choose('rain'), 'again');
  assert.equal(s.progress, 0); assert.ok(!s.resolved);
  let reset = 0; arrived = 0;
  run(() => { s.update(1 / 60, 0); if (s.resetNow) reset++; if (s.arrivedNow) arrived++; }, 2);
  assert.equal(reset, 1); assert.equal(arrived, 1); assert.equal(s.state, 'live');
  // a weather the lagoon cannot paint travels behind a front
  assert.equal(s.choose('sunshine'), 'front');
  const seen = new Set();
  let swapped = 0;
  run(() => { s.update(1 / 60, 0); seen.add(s.state); if (s.swapNow) swapped++; }, 4);
  assert.equal(swapped, 1); assert.ok(seen.has('fronting')); assert.equal(s.realm, 'sunpop-orchard'); assert.equal(s.weather, 'sunshine'); assert.equal(s.state, 'live');
  // wind scores only 1 in the orchard (not home), so it travels home; warm glow scores 2 there: a turn
  assert.equal(pickRealm('wind', { current: 'sunpop-orchard', home: 'raindrop-lagoon' }), 'raindrop-lagoon');
  assert.equal(s.choose('warm'), 'turn');
  run(() => s.update(1 / 60, 0), 0.5); assert.equal(s.state, 'turning');
  run(() => s.update(1 / 60, 0), 2); assert.equal(s.state, 'live'); assert.equal(s.realm, 'sunpop-orchard');
  s.pause(); assert.equal(s.state, 'paused'); s.resume(); assert.equal(s.state, 'live');
  s.leave(); assert.equal(s.choose('fog'), 'none');
  // a step that resets (Again) or runs a queued switch never counts the raw progress of the world before it
  const q = new WeatherSession({ home: 'raindrop-lagoon' });
  q.begin(); run(() => q.update(1 / 60, 0), 1.5);
  q.update(1 / 60, 1); assert.ok(q.resolved);
  q.again();
  let back = false;
  run(() => { q.update(1 / 60, 1); if (q.resetNow) { back = true; assert.ok(!q.resolved && q.progress === 0, 'the reset step ignores the stale raw'); } }, 0.5);
  assert.ok(back);
  const k = new WeatherSession({ home: 'raindrop-lagoon' });
  k.begin(); run(() => k.update(1 / 60, 0), 1.5);
  assert.equal(k.choose('sunshine', { viaKey: true }), 'queued');   // another realm by key: waits 350 ms
  let switchedAt = -1;
  run((dt) => { const before = k.weather; k.update(dt, 1); if (k.weather !== before && switchedAt < 0) { switchedAt = 1; assert.ok(!k.resolved, 'the switch step ignores the old weather\'s raw'); } }, 0.6);
  assert.equal(switchedAt, 1);
});

// ------------------------------------------------------------------- U7 --
test('U7 clouds part under a swipe and stay parted; rain cover follows the gaps', () => {
  for (const tier of ['high', 'medium', 'low']) {
    const c = new CloudBank({ kind: 'thunder', tier, seed: 3 }).resize({ W: 390, H: 844, top: 64, bottom: 420 });
    c.setAmount(1);
    const n0 = c.n;
    assert.ok(c.coverage() > 0.85, `${tier} starts overcast (${c.coverage().toFixed(2)})`);
    assert.equal(c.clear(), 0);
    let cov = c.coverage(), clear = c.clear();
    for (let k = 0; k < 8; k++) {
      const x = 195 + (k % 2 ? 1 : -1) * k * 22;
      c.push(x, 70, x, 410, 0.8);
      run((dt) => c.step(dt), 1.5);
      assert.ok(c.coverage() <= cov + 0.02, `${tier} coverage falls (swipe ${k})`);
      assert.ok(c.clear() >= clear - 0.02, `${tier} clear rises (swipe ${k})`);
      cov = c.coverage(); clear = c.clear();
    }
    assert.ok(clear > 0.6, `${tier} the sky opens (${clear.toFixed(2)})`);
    assert.equal(c.n, n0, 'puff count unchanged');
    assert.ok([...c.x.slice(0, c.n), ...c.y.slice(0, c.n)].every(Number.isFinite));
    // a gap: zero cover in its columns
    const gaps = new Float32Array(6), g = c.gaps(gaps);
    assert.ok(g >= 1, `${tier} reports a gap`);
    const col = Math.floor(gaps[0] / (390 / COLS));
    assert.ok(col >= CENTRAL[0] - 1 && col <= CENTRAL[1] + 1 && c.columnCover[col] < 0.4);
    assert.ok([...c.columnCover.slice(CENTRAL[0], CENTRAL[1] + 1)].some((v) => v === 0), 'cover is 0 under a gap');
    // parted puffs drift home by no more than 15 % over 30 s
    const disp = Array.from({ length: c.n }, (_, i) => Math.abs(c.x[i] - c.hx[i]));
    run((dt) => c.step(dt), 30, 1 / 30);
    for (let i = 0; i < c.n; i++) if (disp[i] > 20) assert.ok(Math.abs(c.x[i] - c.hx[i]) >= disp[i] * 0.85 - 1, `${tier} puff ${i} re-drift`);
  }
  // two fingers spreading open a gap at their midpoint
  const s = new CloudBank({ kind: 'thunder', tier: 'high', seed: 5 }).resize({ W: 390, H: 844, top: 64, bottom: 420 });
  s.setAmount(1);
  for (let i = 0; i < 6; i++) { s.spread(195, 240, 1); run((dt) => s.step(dt), 0.5); }
  const mid = Math.floor(195 / (390 / COLS));
  assert.ok(s.columnCover[mid] < 0.2 && s.clear() > 0.2, `spread opens a gap (${s.columnCover[mid].toFixed(2)})`);
  // the rain deck: a grabbed puff moves and stays; rain cover is per column
  const d = new CloudBank({ kind: 'deck', tier: 'medium', seed: 2 }).resize({ W: 390, H: 844, top: 64, bottom: 200 });
  d.setAmount(1);
  const i = d.hit(d.x[2], d.y[2]);
  assert.ok(i >= 0 && d.grab(1, d.x[i], d.y[i]));
  for (let k = 0; k < 30; k++) { d.drag(1, d.x[i] + 6, d.y[i]); d.step(DT); }
  const xd = d.x[i];
  d.release(1, 0, 0); run((dt) => d.step(dt), 3);
  assert.ok(Math.abs(d.x[i] - xd) < 30, 'a pushed deck puff stays where it was put');
  // arrow keys push the middle puff; glows are rate-limited and photosafe
  const before = s.vx.slice(0, s.n), j = s.nudge(1);
  assert.ok(j >= 0 && s.vx[j] > before[j]);
  assert.ok(s.flash(195) >= 0); assert.equal(s.flash(195), -1, 'one glow a second at most');
  run((dt) => s.step(dt), 1.05); assert.ok(s.flash(100) >= 0, 'and again after a second');
});

// ------------------------------------------------------------------- U8 --
test('U8 fog: wiping clears it, it refills with τ 9 s, a hold grows a clear patch', () => {
  const m = new MistField({ tier: 'medium' }).resize({ W: 390, H: 844, top: 64, floor: 700 });
  m.setAmount(1);
  assert.equal(m.fogClear(), 0);
  m.wipe(40, 100, 350, 600, 50);
  const f1 = m.fogClear();
  assert.ok(f1 > 0.05, `a wipe clears (${f1.toFixed(3)})`);
  m.wipe(350, 100, 40, 600, 60);
  assert.ok(m.fogClear() > f1);
  const f0 = m.fogClear();
  run((dt) => m.step(dt), MIST_TAU);
  const expect = f0 * Math.exp(-1);
  assert.ok(Math.abs(m.fogClear() - expect) <= expect * 0.1, `refill τ 9 s: ${m.fogClear().toFixed(3)} vs ${expect.toFixed(3)}`);
  // a hold: the clear patch grows the longer it is held
  const h = new MistField({ tier: 'high' }).resize({ W: 390, H: 844, top: 64, floor: 700 });
  const patch = () => { let k = 0; for (const v of h.grid.v) if (v < 0.5) k++; return k; };
  const sizes = [];
  for (let i = 0; i < 4; i++) { run((dt) => h.hold(195, 380, dt), 0.4); sizes.push(patch()); }
  assert.ok(sizes[0] > 0 && sizes.every((v, i) => i === 0 || v >= sizes[i - 1]) && sizes[3] > sizes[0], `patch grows ${sizes}`);
  // lifting on resolve thins the mist fast but fogClear stays high; FieldGrid basics
  const l = new MistField({}).resize({ W: 390, H: 844, top: 64, floor: 700 });
  l.lift(true); run((dt) => l.step(dt), 2);
  assert.ok(l.fogClear() > 0.8, `lifted fog ${l.fogClear().toFixed(2)}`);
  const g = new FieldGrid(4, 2).fill(1);
  g.paint(0, 0.5, 4, 0.5, 0.6, -1);
  assert.ok(g.mean() < 0.6 && g.meanIn(0, 0, 4, 1) < 0.6 && g.sample(0.5, 1.5) > 0.9);
  const u8 = new Uint8ClampedArray(32);
  g.toRGBA(u8, [10, 20, 30], 1);
  assert.equal(u8[0], 10); assert.ok(u8[3] < 128 && u8[4 * 4 + 3] > 200);
  g.advect(1, 0); g.relax(100, 0.5, 1);
  assert.ok(Math.abs(g.mean() - 0.5) < 1e-3);
});

// ------------------------------------------------------------------- U9 --
test('U9 rain: beads collect, release thins the rain, swipes redirect, shelter works, the pool is stable', () => {
  const geo = { W: 390, H: 844, skyTop: 64, horizonY: 480, floorY: 700, water: null, body: BODY };
  const mk = (tier = 'high') => { const r = new RainField({ tier, seed: 5 }).resize(geo); r.setAmount(1); r.enter(); return r; };
  const opts = { cover: 1, coverK: 1 };
  // a bead pulls in drops within 90 px and grows as 10 + 3√n
  const a = mk();
  run((dt) => a.step(dt, opts), 2);
  assert.ok(a.orbStart(1, 30, 250));            // off to the side: not sheltering the Mallow
  assert.ok(!a.sheltered());
  let merges = 0, last = 0;
  a.emit = (t, x, y, k) => { if (t === 'merge') { merges++; last = k; assert.ok(Math.hypot(x - 30, y - 250) < 1); } };
  const far = [];
  for (let i = 0; i < a.cap; i++) if (a.on[i] && Math.hypot(a.x[i] - 30, a.y[i] - 250) > ORB_REACH + 40) far.push(i);
  a.step(DT, opts);
  assert.ok(far.every((i) => !a.on[i] || !a.cap8[i]), 'drops beyond 90 px are not pulled');
  run((dt) => a.step(dt, opts), 1.5);
  assert.ok(merges > 3 && a.oN[0] === last && last === merges, `merged ${merges}`);
  assert.equal(orbRadius(0), 10); assert.equal(orbRadius(16), 22);
  // release up (a fling, or inside the deck) lowers the level by min(0.2, 0.025·n)
  const lv = a.level, n = a.oN[0], res = a.orbRelease(1, 0, -900);
  assert.equal(res.to, 'up'); assert.equal(res.n, n);
  assert.ok(Math.abs(a.level - (lv - Math.min(0.2, 0.025 * n))) < 1e-6, 'up thins the rain');
  assert.ok(a.orbStart(2, 300, a.deckY - 10)); assert.equal(a.orbRelease(2, 0, 0).to, 'up', 'inside the deck goes up');
  assert.ok(a.orbStart(3, 60, 420)); assert.equal(a.orbRelease(3, 0, 50).to, 'ground', 'low falls');
  assert.ok(!a.orbStart(4, 10, 10), 'three beads at most (the released ones are still in flight)');
  const onto = mk(); assert.ok(onto.orbStart(4, BODY.cx, BODY.top - 40)); assert.equal(onto.orbRelease(4, 0, 0).to, 'body');
  const wet = mk(); wet.resize({ ...geo, water: [480, 844] });
  assert.ok(wet.orbStart(1, 60, 420)); assert.equal(wet.orbRelease(1, 0, 0).to, 'water');
  let splash = null;
  wet.emit = (t, x, y, k) => { if (t.startsWith('splash')) splash = t; };
  run((dt) => wet.step(dt, opts), 1);
  assert.equal(splash, 'splash-water');
  // a swipe changes drop velocities near its path only
  const s = mk();
  run((dt) => s.step(dt, opts), 2);
  const vx0 = Float32Array.from(s.vx), k = s.sweep(195, 80, 195, 640, 900, 0);
  let near = 0, farChanged = 0;
  for (let i = 0; i < s.cap; i++) {
    if (!s.on[i]) continue;
    const changed = Math.abs(s.vx[i] - vx0[i]) > 1, dx = Math.abs(s.x[i] - 195);
    if (changed && (dx > 51 || s.y[i] < 30 || s.y[i] > 690)) farChanged++;
    if (changed) near++;
  }
  assert.ok(k > 0 && near === k && farChanged === 0, `swept ${k}, far ${farChanged}`);
  assert.ok(s.lean > 0); s.step(DT, opts); assert.ok(s.slant > 0, 'the rain leans with the swipe');
  run((dt) => s.step(dt, opts), 6); assert.ok(Math.abs(s.lean) < 0.01, 'and straightens (τ 1.5 s)');
  s.nudge(-1); assert.ok(s.lean < 0); for (let i = 0; i < 9; i++) s.nudge(-1); assert.ok(s.lean >= -0.5);
  // a held bead above the Mallow cuts body hits by ≥ 60 %
  const free = mk(), shel = mk();
  run((dt) => free.step(dt, opts), 2); run((dt) => shel.step(dt, opts), 2);
  shel.orbStart(9, BODY.cx, BODY.top - 70);
  assert.ok(shel.sheltered());
  const h0 = free.hits, h1 = shel.hits;
  run((dt) => free.step(dt, opts), 10); run((dt) => shel.step(dt, opts), 10);
  const fh = free.hits - h0, sh = shel.hits - h1;
  assert.ok(fh > 20 && sh <= fh * 0.4, `sheltered hits ${sh} vs ${fh}`);
  // rain stops under a gap and waits for the deck
  const g = mk(), cover = new Float32Array(16).fill(1);
  for (let c = 6; c < 10; c++) cover[c] = 0;
  run((dt) => g.step(dt, { cover, coverK: 1 }), 3);
  let under = 0, beside = 0;
  for (let i = 0; i < g.cap; i++) if (g.on[i]) { const c = Math.floor(g.x[i] / (390 / 16)); if (c >= 6 && c <= 9) under++; else beside++; }
  assert.ok(beside > 10 && under === 0, `no rain under the gap (${under} under, ${beside} beside)`);
  const thin = mk();
  run((dt) => thin.step(dt, { cover: 1, coverK: 0.3 }), 3);
  assert.equal(thin.alive, 0, 'no rain until the deck covers ≥ 0.45');
  // the pool never grows: 600 steps at dt 1/60 and at 0.05, every tier, live count consistent
  for (const tier of ['high', 'medium', 'low']) {
    for (const dt of [1 / 60, 0.05]) {
      const p = mk(tier), cap = p.cap, len = p.x.length;
      p.orbStart(1, 195, 300);
      for (let i = 0; i < 600; i++) {
        p.step(dt, opts);
        if (i === 300) p.orbRelease(1, 0, -900);
        assert.ok(p.alive <= p.active);
      }
      let live = 0; for (const v of p.on) live += v;
      assert.equal(live, p.alive); assert.equal(p.cap, cap); assert.equal(p.x.length, len);
      assert.ok([...p.x, ...p.y].every(Number.isFinite));
    }
  }
  // the lagoon paints most of the rain itself (×0.4); reduced motion ×0.4 too
  const lag = new RainField({ tier: 'high', lagoon: true }); assert.equal(lag.active, 56);
  lag.setReduced(true); assert.equal(lag.active, 22);
});

// ------------------------------------------------------------------ U10 --
test('U10 wind: jets raise energy (τ 2.5 s), slow smooth strokes build calm, circles make eddies, ribbons stay bounded', () => {
  const f = new WindField({ tier: 'medium' }).resize({ W: 390, H: 844 });
  f.inject(195, 300, 300, 0, 120); f.step(DT);
  const e0 = f.energy;
  assert.ok(e0 > 0.01);
  run((dt) => f.step(dt), WIND_TAU);
  assert.ok(Math.abs(f.energy / e0 - Math.exp(-1)) < 0.05, `energy τ 2.5 s: ${(f.energy / e0).toFixed(3)}`);
  const s = { vx: 0, vy: 0 };
  const g = new WindField({}).resize({ W: 390, H: 844 });
  g.inject(100, 400, 500, 0, 100); g.step(DT);
  assert.ok(g.sample(100, 400, s).vx > 100 && Math.abs(g.sample(380, 40, s).vx) < 50, 'flow is local');
  // calm: slow, smooth strokes yes; fast or jagged no
  const stroke = (speed, jag) => {
    const w = new WindField({}).resize({ W: 390, H: 844 });
    let x = 40, y = 400, t = 0;
    for (let i = 0; i < 300; i++) { t += DT; x += speed * DT; y = 400 + (jag ? (i % 2 ? 30 : -30) : 0); if (x > 360) x = 40; w.track(x, y, t, 1); }
    return w.calm;
  };
  assert.ok(stroke(150, false) > 0.3, 'slow smooth strokes calm the wind');
  assert.equal(stroke(900, false), 0, 'fast ones do not');
  assert.ok(stroke(150, true) < stroke(150, false) * 0.5, 'jagged ones barely');
  // a circular path emits an eddy (and swirls the flow)
  const q = new WindField({}).resize({ W: 390, H: 844 }), ev = [];
  q.emit = (t, x, y, k) => ev.push({ t, x, y, k });
  let t = 0;
  for (let i = 0; i < 90; i++) { t += DT; const a = (i / 40) * Math.PI * 2; q.track(195 + Math.cos(a) * 80, 400 + Math.sin(a) * 80, t, 2); }
  assert.ok(ev.some((e) => e.t === 'eddy' && Math.abs(e.x - 195) < 30 && Math.abs(e.y - 400) < 30), JSON.stringify(ev));
  q.step(DT); assert.ok(q.turb > 0);
  // ambient gusts while the Wind weather is up; calm quietens them
  const amb = new WindField({}).resize({ W: 390, H: 844 });
  amb.ambient = 1; amb.step(DT);
  const loud = amb.energy;
  amb.calm = 1; amb.step(DT);
  assert.ok(loud > 0.2 && amb.energy < 0.01);
  // ribbons and fluffs stay finite and bounded at dt 0.05 under violent flow
  for (const tier of ['high', 'medium', 'low']) {
    const r = new Ribbons({ tier, seed: 1 }).resize({ W: 390, H: 844, skyTop: 64, horizonY: 480 });
    const fl = new Fluffs({ tier }).resize({ W: 390, H: 844, skyTop: 64, floorY: 700 });
    const w = new WindField({ tier }).resize({ W: 390, H: 844 }), rnd = rng(7);
    r.setAmount(1); w.ambient = 1;
    for (let i = 0; i < 600; i++) {
      if (i % 5 === 0) w.inject(rnd() * 390, rnd() * 600, (rnd() - 0.5) * 6000, (rnd() - 0.5) * 6000, 150);
      w.step(0.05); r.step(0.05, w); fl.step(0.05, w);
    }
    for (let k = 0; k < r.n * r.capS; k++) {
      if (k % r.capS >= r.segs) continue;
      assert.ok(Number.isFinite(r.px[k]) && Math.abs(r.px[k]) <= 2 * 390 && Math.abs(r.py[k]) <= 2 * 844, `ribbon ${tier} ${k}`);
    }
    for (let k = 0; k < fl.n; k++) assert.ok(fl.x[k] >= -31 && fl.x[k] <= 421 && fl.y[k] >= 64 && fl.y[k] <= 680);
  }
  // a jet bends the ribbons toward it
  const rb = new Ribbons({ tier: 'high', seed: 1 }).resize({ W: 390, H: 844, skyTop: 64, horizonY: 480 });
  const jet = new WindField({ tier: 'high' }).resize({ W: 390, H: 844 }), hx = rb.hx[0];
  for (let i = 0; i < 60; i++) { jet.inject(rb.hx[0], rb.hy[0], 600, 0, 140); jet.step(DT); rb.step(DT, jet); }
  assert.ok(rb.px[0] > hx + 10, 'the head bends with the jet');
});

// ------------------------------------------------------------------ U11 --
test('U11 water: a swell reaches the Mallow on time, ripples decay, puddles grow and dry', () => {
  for (const [x0, v] of [[40, 150], [380, -100], [100, 220], [20, 60]]) {
    const w = new WaveField({ tier: 'high' }).resize({ W: 390, band: [480, 844], bodyX: 195 });
    w.setAmount(1);
    let at = null, t = 0, maxH = 0;
    w.emit = (type, x, y, k) => { if (type === 'arrive' && at == null) { at = t; assert.ok(k >= ARRIVE_AT); } };
    w.push(x0, v, 0.8);
    for (; t < 8; t += DT) { w.step(DT); maxH = Math.max(maxH, Math.abs(w.height(195))); }
    const expect = Math.abs(195 - x0) / Math.min(220, Math.max(60, Math.abs(v)));
    assert.ok(at != null && Math.abs(at - expect) <= expect * 0.2, `swell from ${x0} at ${v}: ${at?.toFixed(2)} vs ${expect.toFixed(2)}`);
    assert.ok(maxH <= 1.5 && maxH > 0.25, 'bounded');
  }
  // at most the tier's live swells; a warm swell is remembered on arrival
  const m = new WaveField({ tier: 'low' }).resize({ W: 390, band: [480, 844], bodyX: 195 });
  for (let i = 0; i < 6; i++) m.push(20, 200, 1, i === 5);
  assert.equal(m.swells(), 2);
  let gold = false;
  m.emit = (t) => { if (t === 'arrive') gold ||= m.lastGold; };
  run((dt) => m.step(dt), 2);
  assert.equal(gold, true, 'a warm swell arrives gold');
  // reduced motion: slower and lower
  const red = new WaveField({}).resize({ W: 390, band: [480, 844], bodyX: 195 }).setReduced(true);
  red.push(40, 200, 1);
  assert.ok(Math.abs(red.sv[0]) === 100 && red.sa[0] <= 0.4 + 1e-6);
  // a ripple decays
  const r = new WaveField({}).resize({ W: 390, band: [480, 844], bodyX: 195 });
  r.ripple(100, 1);
  const es = [];
  for (let i = 0; i < 600; i++) { r.step(DT); if (i % 60 === 59) es.push(r.energy); }
  assert.ok(Math.max(...es) > 0.01 && es[es.length - 1] < Math.max(...es) * 0.2, `ripple decays ${es.map((v) => v.toFixed(3))}`);
  // puddles: they grow with wet and dry with τ 60 s
  const p = new Puddles().resize({ floorY: 700, body: { ...BODY, w: 150 }, W: 390 });
  assert.equal(p.visible, 0);
  for (let i = 0; i < 300; i++) p.addWet(DT, 0.4);
  assert.ok(p.wet > 0.2 && p.wet < 0.3 && p.visible === 0, 'not yet');
  const s0 = p.scale;
  for (let i = 0; i < 300; i++) p.addWet(DT, 1);
  assert.ok(p.wet > 0.3 && p.visible === 1 && p.scale > s0, 'puddles appear and grow');
  assert.ok(p.hit(p.e[0], p.e[1]) === 0 && p.hit(p.e[4], p.e[5]) === 1 && p.hit(195, 300) === -1);
  const w0 = p.wet;
  run((dt) => p.step(dt), DRY_TAU, 1 / 30);
  assert.ok(Math.abs(p.wet / w0 - Math.exp(-1)) < 0.01, 'dries with τ 60 s');
  for (let k = 0; k < 2; k++) assert.ok(p.e[4 * k] - p.e[4 * k + 2] >= 0 && p.e[4 * k] + p.e[4 * k + 2] <= 390, 'on screen');
});

// ------------------------------------------------------------------ U12 --
test('U12 light pools: the sun is quicker than the moon, rest, painting, body and water, dwell', () => {
  const geo = { W: 390, H: 844, anchor: [281, 211], skyTop: 64, horizonY: 481, water: [481, 844], floorY: 700 };
  const lag = (kind) => { const p = new LightPool({ kind }).resize(geo); p.setAmount(1); p.place(100, 200); p.to(300, 200); let t = 0; while (Math.abs(p.x - 300) > 10 && t < 3) { p.step(DT); t += DT; } return t; };
  const sun = lag('sun'), moon = lag('moon');
  assert.ok(sun < moon, `sun ${sun.toFixed(2)} lags less than moon ${moon.toFixed(2)}`);
  assert.ok(sun > 0.1 && sun < 0.3 && moon > 0.2 && moon < 0.45);
  // 'rest' fires once after 0.8 s still
  const s = new LightPool({ kind: 'sun' }).resize(geo);
  s.setAmount(1); s.place(100, 150);
  const ev = [];
  let t = 0;
  s.emit = (type) => ev.push({ type, t });
  for (; t < 2; t += DT) s.step(DT);
  const rests = ev.filter((e) => e.type === 'rest');
  assert.equal(rests.length, 1); assert.ok(Math.abs(rests[0].t + DT - SUN_REST) < 0.03, `rest at ${rests[0].t}`);
  // painting burns the haze only along the path
  const before = Float32Array.from(s.haze.v), p0 = s.painted;
  s.to(300, 150); run((dt) => s.step(dt), 1);
  assert.ok(s.painted > p0, 'painted grows');
  for (let j = 0; j < s.haze.rows; j++) {
    for (let i = 0; i < s.haze.cols; i++) {
      const cy = s.haze.y0 + (j + 0.5) * s.haze.ch, k = j * s.haze.cols + i;
      if (Math.abs(cy - 150) > s.r * 1.2) assert.equal(s.haze.v[k], before[k], 'untouched away from the path');
    }
  }
  // on the Mallow (within 0.5·body.h), on water, height
  s.to(BODY.cx, BODY.mid); run((dt) => s.step(dt, BODY), 1.5);
  assert.ok(s.onBody && s.bask > 1 && ev.some((e) => e.type === 'body-in'));
  assert.ok(s.onWater, 'the body sits on the water band here');
  assert.equal(s.height, 0);
  s.to(BODY.cx, 100); run((dt) => s.step(dt, BODY), 1);
  assert.ok(!s.onBody && ev.some((e) => e.type === 'body-out') && s.height > 0.8 && !s.onWater);
  // dwell builds only while resting, faster on water or the Mallow
  const m = new LightPool({ kind: 'moon' }).resize(geo);
  m.setAmount(1); m.place(60, 200);
  for (let i = 0; i < 150; i++) { m.to(60 + i * 2, 200); m.step(DT); }
  assert.equal(m.dwell, 0, 'no dwell while moving');
  run((dt) => m.step(dt), 3);
  const sky = m.dwell;
  assert.ok(sky > 0);
  const mw = new LightPool({ kind: 'moon' }).resize(geo);
  mw.setAmount(1); mw.place(60, 600); run((dt) => mw.step(dt), 3);
  assert.ok(mw.onWater && mw.dwell > sky, 'faster on water');
  run((dt) => mw.step(dt), 12);
  assert.equal(mw.dwell, 1);
  assert.equal(new LightPool({ kind: 'moon' }).haze, null, 'only the sun burns haze');
  // enter slides down the beam from the realm's light
  const e = new LightPool({ kind: 'sun' }).resize(geo);
  e.enter(1);
  assert.equal(e.x, 281); assert.equal(e.y, 211);
  run((dt) => e.step(dt), 1.5);
  assert.ok(e.amount === 1 && Math.abs(e.x - e.start()[0]) < 2);
});

// ------------------------------------------------------------------ U13 --
test('U13 stars: spaced placement at every viewport, gather within 56 px, constellations per Mallow, gifts', () => {
  for (const [W, H] of VIEWPORTS) {
    const top = 64, horizon = Math.round(H * 0.6), body = { cx: W / 2, top: H * 0.83 - H * 0.3, bottom: H * 0.83, mid: H * 0.68, w: Math.min(W * 0.6, H * 0.3), h: H * 0.3 };
    const rect = { x0: 16, y0: top, x1: W - 16, y1: horizon };
    const avoid = [{ x0: 0, y0: 0, x1: W, y1: 64 }, { x0: body.cx - body.w / 2 - 24, y0: body.top - 24, x1: body.cx + body.w / 2 + 24, y1: body.bottom + 24 }];
    for (const n of [12, 20, 28]) {
      const p = placeStars(n, rect, avoid, MIN_GAP, 11);
      const k = p.length / 2;
      assert.ok(k >= Math.min(n, 8), `${W}×${H} placed ${k}/${n}`);
      for (let i = 0; i < k; i++) {
        const x = p[2 * i], y = p[2 * i + 1];
        assert.ok(x >= rect.x0 && x <= rect.x1 && y >= rect.y0 && y <= rect.y1);
        for (const r of avoid) assert.ok(!(x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1), `${W}×${H} star in a keep-out`);
        for (let j = i + 1; j < k; j++) assert.ok(Math.hypot(x - p[2 * j], y - p[2 * j + 1]) >= MIN_GAP, `${W}×${H} spacing`);
      }
    }
    assert.deepEqual(placeStars(20, rect, avoid, MIN_GAP, 3), placeStars(20, rect, avoid, MIN_GAP, 3), 'deterministic');
  }
  // gather within 56 px
  const rect = { x0: 16, y0: 72, x1: 374, y1: 480 }, body = { cx: 195, top: 480, bottom: 700, mid: 590, w: 220, h: 220 };
  const sw = new StarSwarm({ tier: 'high', seed: 4, mallowId: 'glitzi' }).resize({ rect, avoid: [], body, W: 390 });
  sw.setAmount(1); run((dt) => sw.step(dt), 0.5);
  const i0 = 3, x0 = sw.x[i0], y0 = sw.y[i0];
  const near = []; for (let i = 0; i < sw.n; i++) if (Math.hypot(sw.x[i] - x0, sw.y[i] - y0) < GATHER_R) near.push(i);
  assert.equal(sw.sweep(1, x0, y0), near.length);
  for (let i = 0; i < sw.n; i++) if (!near.includes(i)) assert.notEqual(sw.st[i], 1, 'stars beyond 56 px stay put');
  let n = 0;
  for (let x = 20; x < 370; x += 10) n = sw.sweep(1, x, 150);
  for (let x = 370; x > 20; x -= 10) n = sw.sweep(1, x, 300);
  assert.ok(n >= 3, `gathered ${n}`);
  const res = sw.release(1);
  assert.equal(res.kind, 'constellation'); assert.ok(res.n >= 3 && res.n <= 8);
  run((dt) => sw.step(dt), 4);
  assert.equal(sw.constellations, 1);
  let placed = 0; for (let i = 0; i < sw.n; i++) if (sw.st[i] === 3) placed++;
  assert.equal(placed, res.n, 'every star found its slot');
  // three kept; a fourth replaces the oldest, whose stars drift home
  const kp = new StarSwarm({ tier: 'high', seed: 6, mallowId: 'pipzi' }).resize({ rect, avoid: [], body, W: 390 });
  kp.setAmount(1); run((dt) => kp.step(dt), 0.5);
  const firstStars = [];
  for (let k = 0; k < 4; k++) {
    for (let i = 0; i < kp.n && kp.clusterSize(7) < 3; i++) if (kp.st[i] === 0) kp.sweep(7, kp.x[i], kp.y[i]);
    kp.sweep(7, 60, 90);
    const rel = kp.release(7);
    assert.equal(rel.kind, 'constellation', `constellation ${k + 1}`);
    if (k === 0) for (let i = 0; i < kp.n; i++) if (kp.st[i] === 2) firstStars.push(i);
    run((dt) => kp.step(dt), 3);
  }
  assert.equal(kp.made, 4); assert.equal(kp.constellations, 3);
  assert.ok(firstStars.length >= 3 && firstStars.every((i) => kp.st[i] === 0 || kp.st[i] === 5), 'the oldest constellation went home');
  // near the Mallow: a gift, and the stars drift home
  const g = new StarSwarm({ tier: 'high', seed: 2, mallowId: 'noomi' }).resize({ rect, avoid: [], body, W: 390 });
  g.setAmount(1); run((dt) => g.step(dt), 0.5);
  for (let x = 20; x < 370; x += 10) g.sweep(5, x, 200);
  g.sweep(5, body.cx, body.mid);
  const gift = g.release(5);
  assert.equal(gift.kind, 'gift'); assert.ok(gift.n > 0);
  run((dt) => g.step(dt), 8);
  let free = 0; for (let i = 0; i < g.n; i++) if (g.st[i] === 0) free++;
  assert.equal(free, g.n, 'gift stars return to the sky');
  // shapes: Glitzi equal edges (±1 %), Zuzu radius always increasing, Noomi on one arc; all deterministic
  for (const k of [3, 5, 8]) {
    const gl = constellationShape('glitzi', k, 100, 100, 50), edges = [];
    for (let i = 0; i < k; i++) { const j = (i + 1) % k; edges.push(Math.hypot(gl[2 * i] - gl[2 * j], gl[2 * i + 1] - gl[2 * j + 1])); }
    const mean = edges.reduce((a, b) => a + b) / k;
    assert.ok(edges.every((e) => Math.abs(e - mean) <= mean * 0.01), `glitzi ${k}: ${edges}`);
    const zu = constellationShape('zuzu', k, 0, 0, 50), radii = [];
    for (let i = 0; i < k; i++) radii.push(Math.hypot(zu[2 * i], zu[2 * i + 1] / 0.85));
    assert.ok(radii.every((r, i) => i === 0 || r > radii[i - 1]), `zuzu spiral ${radii}`);
    const no = constellationShape('noomi', k, 10, 20, 50);
    // circumcentre of first, middle and last; every slot at the same distance
    const [ax, ay, bx, by, cx, cy] = [no[0], no[1], no[2 * (k >> 1)], no[2 * (k >> 1) + 1], no[2 * k - 2], no[2 * k - 1]];
    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
    const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
    const R0 = Math.hypot(ax - ux, ay - uy);
    for (let i = 0; i < k; i++) assert.ok(Math.abs(Math.hypot(no[2 * i] - ux, no[2 * i + 1] - uy) - R0) < 0.01, `noomi arc ${k}`);
    for (const id of MALLOW_IDS) {
      const s1 = constellationShape(id, k, 50, 60, 40), s2 = constellationShape(id, k, 50, 60, 40);
      assert.deepEqual(Array.from(s1), Array.from(s2), `${id} deterministic`);
      assert.ok(Array.from(s1).every(Number.isFinite));
    }
  }
  assert.deepEqual(Object.keys(CONSTELLATION_STYLE).sort(), [...MALLOW_IDS].sort());
  assert.equal(CONSTELLATION_STYLE.glitzi.style, 'snap'); assert.equal(CONSTELLATION_STYLE.zuzu.style, 'spiral');
  assert.ok(CONSTELLATION_STYLE.pipzi.style === 'bloom' && CONSTELLATION_STYLE.pipzi.fadeMs >= 450);
  assert.equal(CONSTELLATION_STYLE.boppo.style, 'bounce'); assert.equal(CONSTELLATION_STYLE.blubi.style, 'drift-down');
  assert.equal(CONSTELLATION_STYLE.loomi.style, 'slow'); assert.equal(CONSTELLATION_STYLE.noomi.style, 'settle');
  // seeded from rain drops: they rise into place
  const sd = new StarSwarm({ tier: 'low', seed: 1, mallowId: 'zuzu' }).resize({ rect, avoid: [], body, W: 390 });
  sd.setAmount(1);
  assert.equal(sd.seedFrom(new Float32Array([100, 600, 200, 620, 300, 640]), 3), 3);
  run((dt) => sd.step(dt), 6);
  assert.ok(Math.hypot(sd.x[0] - sd.hx[0], sd.y[0] - sd.hy[0]) < 3);
  // reduced motion: they fade between places instead of flying
  const rd = new StarSwarm({ tier: 'high', seed: 4, mallowId: 'zuzu' }).resize({ rect, avoid: [], body, W: 390 }).setReduced(true);
  rd.setAmount(1); run((dt) => rd.step(dt), 0.5);
  for (let x = 20; x < 370; x += 10) rd.sweep(1, x, 150);
  rd.release(1); run((dt) => rd.step(dt), 0.35);
  const fl = []; for (let i = 0; i < rd.n; i++) if (rd.st[i] === 2) fl.push(i);
  assert.ok(fl.every((i) => rd.x[i] === rd.sx[i] && rd.y[i] === rd.sy[i]), 'jumped to the slot while faded');
});

// ------------------------------------------------------------------ U14 --
test('U14 warm glow: kindling along a path, monotonic heat, the hearth kindles by radius', () => {
  const rect = { x0: 16, y0: 120, x1: 374, y1: 690 };
  const e = new EmberField({ tier: 'high', seed: 2 }).resize({ rect, avoid: [], body: BODY });
  e.setAmount(1);
  const kindled = [];
  e.emit = (t, x, y, i) => { if (t === 'kindle') kindled.push(i); };
  const inPath = []; for (let i = 0; i < e.n; i++) if (Math.abs(e.y[i] - 300) < 40) inPath.push(i);
  assert.equal(e.kindleAlong(16, 300, 374, 300, 40), inPath.length);
  assert.deepEqual([...kindled].sort((a, b) => a - b), inPath, 'only within r of the path');
  const hs = [];
  for (let i = 0; i < 60; i++) { e.step(DT); hs.push(e.heat); }
  assert.ok(hs.every((h, i) => i === 0 || h >= hs[i - 1]) && e.heat > 0, 'heat monotonic');
  assert.ok(e.kindleAt(e.x[inPath[0]], e.y[inPath[0]]) === -1, 'a lit ember does not kindle twice');
  // the hearth: rings kindle by radius
  const h = new EmberField({ tier: 'high', seed: 3 }).resize({ rect, avoid: [], body: BODY });
  const dist = Array.from({ length: h.n }, (_, i) => Math.hypot(h.x[i] - BODY.cx, h.y[i] - BODY.mid));
  h.radiate(BODY.cx, BODY.mid, 1);
  for (let i = 0; i < h.n; i++) assert.equal(h.litT[i] >= 0, dist[i] <= 140, `ember ${i} at ${dist[i].toFixed(0)} px`);
  let allLit = false;
  h.emit = (t) => { if (t === 'all-lit') allLit = true; };
  const heats = [];
  for (let i = 0; i < 400; i++) { h.radiate(BODY.cx, BODY.mid, DT); h.step(DT); heats.push(h.heat); }
  assert.ok(heats.every((v, i) => i === 0 || v >= heats[i - 1]) && h.heat === 1 && allLit);
  // a tap kindles the nearest; a warm swell kindles the nearest few; embers keep off the Mallow
  const t = new EmberField({ tier: 'low', seed: 4 }).resize({ rect, avoid: [], body: BODY });
  const j = t.kindleAt(t.x[0] + 5, t.y[0] + 5);
  assert.equal(j, 0);
  assert.equal(t.kindleNear(BODY.cx, BODY.mid, 2), 2);
  for (let i = 0; i < t.n; i++) assert.ok(!(Math.abs(t.hx[i] - BODY.cx) < BODY.w / 2 + 24 && t.hy[i] > BODY.top - 24 && t.hy[i] < BODY.bottom + 24), 'off the Mallow');
  // reduced motion: they swell without drifting
  const r = new EmberField({ tier: 'low', seed: 4 }).resize({ rect, avoid: [], body: BODY }).setReduced(true);
  r.kindleAt(r.x[0], r.y[0]); run((dt) => r.step(dt), 3);
  assert.equal(r.x[0], r.hx[0]); assert.equal(r.y[0], r.hy[0]); assert.equal(r.lit[0], 1);
});

// ------------------------------------------------------------------ U15 --
const SHARED_REACT = Object.keys(REACTIONS._shared).filter((k) => k !== 'squeezeFace');
const validReact = (id, k) => k == null || SHARED_REACT.includes(k) || (k !== 'squeezeFace' && Object.hasOwn(REACTIONS[id] || {}, k));
const ALL_EVENTS = EVENT_TYPES.filter((t) => t !== 'idle');
const fire = (input, mem, type, extra = {}) => decide({ ...input, event: { type, x: 120, y: 200, k: 0.8, vx: 300, vy: 0, ...extra } }, mem, rng(3));

test('U15 the Mallow reacts in character, within the rules', () => {
  const body = { cx: 195, top: 450, mid: 575, w: 240, h: 250 };
  for (const id of MALLOW_IDS) {
    for (const style of ['gentle', 'balanced', 'playful']) {
      for (const reduced of [false, true]) {
        for (const w of DIAL_ORDER) {
          for (const type of ALL_EVENTS) {
            const mem = createMemory();
            const acts = fire({ mallowId: id, style, reduced, weather: w, progress: 0.3, body }, mem, type);
            for (const a of acts) {
              assert.ok(['react', 'rest', 'face', 'gaze', 'nudge', 'brush', 'poke', 'inflate', 'particles', 'peek'].includes(a.type), a.type);
              if (a.type === 'react') {
                assert.ok(validReact(id, a.react), `${id} ${type}: react ${a.react}`);
                if (a.mix) for (const k in a.mix) assert.ok(Object.hasOwn(PRESETS, k), `${id} ${type}: mix ${k}`);
                assert.ok(a.voice == null || VOICE_KINDS.includes(a.voice), `${id} voice ${a.voice}`);
                assert.ok(a.i >= 0 && a.i <= 1 && typeof a.tag === 'string');
                if (style === 'gentle' || reduced) assert.ok(!['hop', 'celebrate', 'doubleTap'].includes(a.react), `${id} ${style}/${reduced} ${type}: ${a.react}`);
                if (style === 'gentle') assert.ok(a.voice !== 'giggle');
              }
              if (a.type === 'particles') assert.ok(FX_KINDS.includes(a.fx.kind) && a.fx.n > 0, a.fx.kind);
              if (a.type === 'nudge') assert.equal(a.hop, 0, 'no hop impulses');
              if (a.type === 'peek') assert.ok(CLOSED_EYES.includes(id), 'only closed-eyed Mallows peek');
              if (a.type === 'face') assert.ok(Object.keys({ ...a.min, ...a.set }).length > 0);
            }
          }
        }
      }
    }
  }
  const base = { mallowId: 'boppo', style: 'balanced', reduced: false, weather: 'rain', progress: 0, body };
  // 1.2 s between one-shot reactions
  const m1 = createMemory();
  m1.t = 10;
  const first = fire({ ...base, t: 10 }, m1, 'gap');
  assert.ok(first.some((a) => a.type === 'react'));
  assert.ok(!fire({ ...base, t: 10.5 }, m1, 'sheltered').some((a) => a.type === 'react'), 'within 1.2 s: no reaction');
  assert.ok(fire({ ...base, t: 11.3 }, m1, 'sheltered').some((a) => a.type === 'react'), 'after 1.2 s: yes');
  // a minor beat (drips on the head) never holds back a bigger one, but two minor beats keep the gap
  const m2 = createMemory(), gzi = { ...base, mallowId: 'glitzi', weather: 'storm' };
  assert.ok(fire({ ...gzi, t: 20 }, m2, 'hit-body').some((a) => a.type === 'react'), 'Glitzi huffs at the drips');
  assert.ok(fire({ ...gzi, t: 20.4 }, m2, 'strike').some((a) => a.type === 'react' && a.tag === 'glitzi-strike-delight'), 'a strike right after still delights');
  assert.ok(!fire({ ...gzi, t: 20.8 }, m2, 'gust').some((a) => a.type === 'react'), 'but a minor beat waits after a big one');
  // the resolve beat takes the waiting slot from a lesser one, and plays as soon as the gap allows
  const m3 = createMemory(), bo = { ...base, weather: 'storm' };
  fire({ ...bo, t: 30 }, m3, 'arrive');
  fire({ ...bo, t: 30.3 }, m3, 'gap');
  assert.equal(m3.pending?.type, 'gap');
  fire({ ...bo, t: 30.5, progress: 1 }, m3, 'resolved');
  assert.equal(m3.pending?.type, 'resolved', 'resolved replaces a waiting gap');
  const replay = decide({ ...bo, progress: 1, cond: { t: 31.3, dt: 0.1 } }, m3, rng(3));
  assert.ok(replay.some((a) => a.type === 'react' && a.ev === 'resolved'), 'and plays once 1.2 s have passed');
  // the same tag never twice in a row
  for (const id of MALLOW_IDS) {
    for (const type of ['arrive', 'wave-arrive', 'gift', 'constellation', 'heat', 'revealed', 'resolved', 'gust', 'sheltered']) {
      const mem = createMemory(), tags = [];
      for (let k = 0; k < 8; k++) {
        const r = decide({ ...base, mallowId: id, weather: 'sunshine', t: k * 10, event: { type, x: 100, y: 100, k: 0.5 } }, mem, rng(k)).find((a) => a.type === 'react');
        if (r) tags.push(r.tag);
      }
      assert.ok(tags.length >= 4, `${id} ${type} reacts`);
      for (let k = 1; k < tags.length; k++) assert.notEqual(tags[k], tags[k - 1], `${id} ${type} repeats ${tags[k]}`);
    }
  }
  // strike habituation: full, half without hop, then a glance
  for (const id of MALLOW_IDS) {
    const mem = createMemory(), at = (t) => decide({ ...base, mallowId: id, weather: 'storm', t, event: { type: 'strike', x: 50, y: 300 } }, mem, rng(1));
    const s1 = at(0).find((a) => a.type === 'react'), s2 = at(10).find((a) => a.type === 'react'), s3 = at(20);
    assert.ok(s1 && s2, `${id} strikes 1 and 2 react`);
    assert.ok(Math.abs(s2.i - s1.i * 0.5) < 1e-9 && !['hop', 'celebrate', 'doubleTap'].includes(s2.react) && s2.tag !== s1.tag, `${id} strike 2 is half`);
    assert.ok(s3.length > 0 && s3.every((a) => a.type === 'gaze'), `${id} strike 3 is a glance`);
  }
  assert.equal(fire({ ...base, mallowId: 'glitzi', weather: 'storm' }, createMemory(), 'strike').find((a) => a.type === 'react').react, 'glitchBurst', 'Glitzi delights');
  // while touched, only the gaze moves
  for (const type of ALL_EVENTS) {
    const acts = decide({ ...base, event: { type, x: 1, y: 2, k: 0.9 }, cond: { t: 5, touched: true, bask: true, moonlit: true, lightOnBody: 1, windAt: { vx: 500 } } }, createMemory(), rng(1));
    assert.ok(acts.every((a) => a.type === 'gaze'), `${type} while touched: ${acts.map((a) => a.type)}`);
  }
  // a loved weather's arrival is a happy one; a wary one is low and curious
  for (const id of MALLOW_IDS) {
    for (const w of FEEL[id].loves) {
      const r = fire({ ...base, mallowId: id, weather: w }, createMemory(), 'arrive').find((a) => a.type === 'react');
      assert.ok(r && isPositiveMix(r.mix), `${id} loves ${w}: ${JSON.stringify(r?.mix)}`);
    }
    for (const w of FEEL[id].wary) {
      const r = fire({ ...base, mallowId: id, weather: w }, createMemory(), 'arrive').find((a) => a.type === 'react');
      assert.ok(r && r.i <= 0.5 && (r.mix.curious || r.mix.calm), `${id} wary of ${w}`);
    }
    assert.ok(FEEL[id].loves.includes(FEEL[id].home), `${id} loves its home weather`);
    const home = fire({ ...base, mallowId: id, weather: FEEL[id].home }, createMemory(), 'arrive');
    assert.ok(isPositiveMix(home.find((a) => a.type === 'react').mix) && home.some((a) => a.type === 'particles'), `${id} home weather: celebrate plus its signature`);
  }
  // the same event reads differently on different Mallows
  for (const [type, w] of [['strike', 'storm'], ['hit-body', 'rain'], ['bask', 'sunshine'], ['moonlit', 'moonlight'], ['wave-arrive', 'wind'], ['arrive', 'storm'], ['constellation', 'starlight']]) {
    const looks = new Set(MALLOW_IDS.map((id) => {
      const acts = fire({ ...base, mallowId: id, weather: w }, createMemory(), type);
      const r = acts.find((a) => a.type === 'react');
      return JSON.stringify([r?.react, r?.mix, acts.find((a) => a.type === 'face')?.set, acts.find((a) => a.type === 'particles')?.fx?.kind]);
    }));
    assert.ok(looks.size >= 3, `${type}: ${looks.size} distinct readings`);
  }
  // softened() is the shared mapping (core/personality.js): gentle Glitzi's delighted burst becomes a tap
  const g = fire({ ...base, mallowId: 'glitzi', style: 'gentle', weather: 'storm' }, createMemory(), 'strike').find((a) => a.type === 'react');
  assert.equal(g.react, softened('glitchBurst', { gentle: true }));
  assert.equal(g.react, 'tap');
  const rr = fire({ ...base, mallowId: 'boppo', reduced: true, weather: 'sunshine' }, createMemory(), 'arrive').find((a) => a.type === 'react');
  assert.equal(rr.react, softened('celebrate', { reduced: true }), 'reduced: the home celebration is a nod');
  assert.equal(fire({ ...base, style: 'gentle', weather: 'starlight' }, createMemory(), 'constellation').find((a) => a.type === 'react').react, 'success', 'gentle constellations are a success');
  // follow-ups: Noomi's startled peek is followed by a snuggle; Boppo hops in the puddles twice
  const nm = createMemory(), nin = { ...base, mallowId: 'noomi', weather: 'storm' };
  decide({ ...nin, t: 0, event: { type: 'strike', x: 10, y: 10 } }, nm, rng(1));
  const later = [];
  for (let t = 0.1; t < 3; t += 0.1) later.push(...decide({ ...nin, cond: { t } }, nm, rng(1)));
  assert.ok(later.some((a) => a.type === 'react' && a.tag === 'noomi-snuggle'));
  const bm = createMemory(), bin = { ...base, mallowId: 'boppo', weather: 'rain' };
  decide({ ...bin, t: 0, event: { type: 'resolved' } }, bm, rng(1));
  const hops = [];
  for (let t = 0.1; t < 5; t += 0.1) hops.push(...decide({ ...bin, cond: { t } }, bm, rng(1)).filter((a) => a.type === 'react' && a.react === 'hop'));
  assert.equal(hops.length, 2);
  // continuous coupling: resting face per weather, basking glow and inflate, moonlit breath, wind lean, Noomi lulled by rain
  const cm = createMemory(), cin = { ...base, mallowId: 'noomi', weather: 'moonlight', progress: 0 };
  const c1 = decide({ ...cin, cond: { t: 1, moonlit: true, lightOnBody: 0.5 } }, cm, rng(1));
  assert.deepEqual(c1.find((a) => a.type === 'rest').mix, REST.moonlight.mix);
  const face = c1.find((a) => a.type === 'face');
  assert.equal(face.set.breathRate, 0.12); assert.ok(face.min.glow >= 0.8 && face.min.float >= 0.3);
  assert.ok(!decide({ ...cin, cond: { t: 1.1, moonlit: true, lightOnBody: 0.5 } }, cm, rng(1)).some((a) => a.type === 'rest' || a.type === 'face'), 'unchanged → no rewrite');
  const bk = decide({ ...base, mallowId: 'boppo', weather: 'sunshine', cond: { t: 1, bask: true, windAt: { vx: 300 } } }, createMemory(), rng(1));
  assert.ok(bk.find((a) => a.type === 'face').min.glow >= 0.9 && bk.find((a) => a.type === 'face').min.blush === 1.6);
  assert.equal(bk.find((a) => a.type === 'inflate').v, 0.4);
  assert.ok(bk.find((a) => a.type === 'nudge').lean > 0, 'the wind leans it');
  assert.deepEqual(restFor('glitzi', 'sunshine').mix, { proud: 1 });
  assert.deepEqual(restFor('boppo', 'storm', 0).mix, { curious: 1, hopeful: 0 });
  assert.ok(restFor('blubi', 'storm', 0).mix.anxious > 0 && restFor('blubi', 'storm', 1).mix.hopeful === 1);
  const lm = createMemory(), lin = { ...base, mallowId: 'noomi', weather: 'rain' }, lulls = [];
  for (let t = 0; t < 12; t += 0.1) lulls.push(...decide({ ...lin, cond: { t, dt: 0.1, raining: true } }, lm, rng(1)).filter((a) => a.tag === 'noomi-rain-lulled'));
  assert.equal(lulls.length, 1);
  // gaze priority: touch → pool → cluster → front → recent event → its own
  const gz = (cond) => decide({ ...base, cond: { t: 50, ...cond } }, createMemory(), rng(1)).find((a) => a.type === 'gaze');
  assert.deepEqual(gz({ touch: { x: 1, y: 1 }, pool: { x: 2, y: 2 } }), { type: 'gaze', x: 1, y: 1 });
  assert.deepEqual(gz({ pool: { x: 2, y: 2 }, cluster: { x: 3, y: 3 } }), { type: 'gaze', x: 2, y: 2 });
  assert.deepEqual(gz({ cluster: { x: 3, y: 3 }, front: { x: 4, y: 4 } }), { type: 'gaze', x: 3, y: 3 });
  assert.deepEqual(gz({}), { type: 'gaze', x: null, y: null });
  assert.ok(GAP === 1.2);
});

// ------------------------------------------------------------------ U16 --
test('U16 photosensitivity: slow glow rises, strikes ≥ 8 s apart and never gentle or reduced, calm twinkle, strike pulses', () => {
  // glows rise over ≥ 0.3 s (0.35 s), then fade
  assert.equal(glowEnvelope(0), 0);
  assert.ok(glowEnvelope(0.3) < 0.99 && glowEnvelope(GLOW_RISE) === 1 && glowEnvelope(3) === 0);
  let maxRise = 0;
  for (let t = 0; t < 2; t += 0.001) maxRise = Math.max(maxRise, glowEnvelope(t + 0.001) - glowEnvelope(t));
  assert.ok(maxRise / 0.001 <= 1.5 / GLOW_RISE + 0.01, 'smooth rise');
  // strike clock: ≥ 8 s apart in sim time, whatever the frame pacing; glows only when gentle or reduced
  for (const flags of [{}, { gentle: true }, { reduced: true }]) {
    const c = new StrikeClock({ seed: 3 }), rnd = rng(5), times = [];
    let thunder = 0;
    for (let t = 0; t < 600;) {
      const dt = 0.008 + rnd() * 0.06; t += dt;
      const e = c.step(dt, { coverage: t % 100 < 80 ? 0.9 : 0.3, ...flags });
      if (e === 'strike' || e === 'glow') times.push({ e, t: c.t });
      if (e === 'thunder') thunder++;
      if (flags.gentle || flags.reduced) assert.notEqual(e, 'strike');
    }
    assert.ok(times.length > 20 && thunder >= times.length - 1);
    for (let i = 1; i < times.length; i++) assert.ok(times[i].t - times[i - 1].t >= STRIKE_MIN - 1e-9, `gap ${times[i].t - times[i - 1].t}`);
    if (!flags.gentle && !flags.reduced) assert.ok(times.every((x) => x.e === 'strike'));
  }
  const thin = new StrikeClock({ seed: 1 });
  for (let t = 0; t < 60; t += 0.05) assert.equal(thin.step(0.05, { coverage: 0.4 }), null, 'no strikes over a thin bank');
  // twinkle ≤ 1.2 Hz with amplitude ≤ 0.25; none with reduced motion
  const s = new StarSwarm({ tier: 'high', seed: 9 });
  for (let i = 0; i < s.cap; i++) {
    assert.ok(s.tw[i] > 0 && s.tw[i] <= TWINKLE_HZ && s.ta[i] <= TWINKLE_AMP);
    for (let t = 0; t < 3; t += 0.05) assert.ok(Math.abs(s.twinkle(i, t) - 1) <= TWINKLE_AMP + 1e-9);
  }
  s.setReduced(true);
  assert.equal(s.twinkle(0, 1.234), 1);
  // pulseFor: 'strike' only for the static-storm storm strike, a resting sun by day and a resting moon in Moonmilk
  for (const event of PULSE_EVENTS) {
    for (const r of REALM_IDS) {
      for (const opts of [{}, { reduced: true }, { gentle: true }, { n: 12, weather: 'storm' }, { weather: 'sunshine' }]) {
        const k = pulseFor(event, r, opts);
        assert.ok(k === null || ['tap', 'ripple', 'success', 'burst', 'strike', 'clear'].includes(k), `${event} ${r} → ${k}`);
        if (k === 'strike') {
          assert.ok((event === 'strike' && r === 'static-storm') || (event === 'sun-rest' && DAY_REALMS.includes(r)) || (event === 'moon-rest' && r === 'moonmilk-cove'), `${event} ${r}`);
          if (r === 'static-storm') assert.equal(event, 'strike');
        }
      }
    }
  }
  assert.equal(pulseFor('strike', 'static-storm', { reduced: true }), null);
  assert.equal(pulseFor('strike', 'static-storm', { gentle: true }), null);
  assert.equal(pulseFor('strike', 'blue-drift'), null, 'other realms get soft cloud glows only');
  assert.equal(pulseFor('bead-up', 'spark-festival'), 'tap'); assert.equal(pulseFor('bead-up', 'raindrop-lagoon'), 'success');
  assert.equal(pulseFor('splash-water', 'blue-drift', { n: 8 }), 'burst'); assert.equal(pulseFor('splash-water', 'blue-drift', { n: 3 }), 'ripple');
  assert.equal(pulseFor('moon-rest', 'spark-festival'), 'tap'); assert.equal(pulseFor('sun-rest', 'moonmilk-cove'), null);
  for (const w of ['storm', 'rain', 'fog', 'wind']) assert.equal(pulseFor('resolved', 'blue-drift', { weather: w }), 'clear');
  for (const w of ['sunshine', 'moonlight', 'starlight', 'warm']) assert.equal(pulseFor('resolved', 'blue-drift', { weather: w }), 'success');
  assert.equal(pulseFor('touch', 'x'), 'tap'); assert.equal(pulseFor('nonsense', 'blue-drift'), null);
});

// ------------------------------------------------------------------ U17 --
test('U17 copy: no claims or banned words, short hints, announcements about the world and the Mallow', () => {
  const strings = collectStrings(COPY);
  assert.ok(strings.length > 100, `collected ${strings.length}`);
  assert.deepEqual(lintCopy(strings, { extra: [/\bmood\b/i, /\bfeelings?\b/i] }), []);
  for (const s of strings) assert.ok(!/H(?=ushmallow)/.test(s), 'brand with a small h');
  for (const w of DIAL_ORDER) assert.ok(COPY.weathers[w].hint.length <= 48);
  assert.ok(COPY.water.hint.length <= 48);
  // announcer templates, filled in: the world and the Mallow, never the person
  const a = COPY.announce, name = 'Boppo', samples = [];
  for (const k of Object.keys(a)) {
    const v = a[k];
    samples.push(typeof v === 'function' ? v(k === 'at' ? 'Rain' : name, 'the Raindrop Lagoon', 'Hold to catch it.') : v);
  }
  for (const s of samples) assert.ok(!/\b(you|your|yours|you're)\b/i.test(s), `announcement about the person: "${s}"`);
  assert.equal(a.at('Rain', realmPhrase(REALMS['raindrop-lagoon'].name), WEATHERS.rain.say), 'Rain at the Raindrop Lagoon. Hold to catch it.');
  assert.equal(a.travel(realmPhrase(REALMS['moonmilk-cove'].name)), 'Travelling to the Moonmilk Cove.');
  assert.equal(COPY.subtitle('Rain', realmShort(REALMS['raindrop-lagoon'].name)), 'Rain · Raindrop Lagoon');
  assert.ok(COPY.stageLabel('Zuzu').startsWith('Weather Weaver with Zuzu.') && COPY.stageLabel('Zuzu').includes('hold W'));
  // every Mallow has a line for every weather, short and in its own voice; captions per realm
  for (const id of MALLOW_IDS) for (const w of DIAL_ORDER) { const l = lineFor(id, w); assert.ok(l.length > 0 && l.length <= 48, `${id} ${w}: "${l}"`); }
  assert.equal(lineFor('nobody', 'rain'), '');
  assert.equal(captionFor('rain', 'raindrop-lagoon'), WEATHERS.rain.captionWater);
  assert.equal(captionFor('rain', 'static-storm'), WEATHERS.rain.caption);
  assert.equal(captionFor('storm', 'blue-drift'), 'The storm passed.');
});

// ------------------------------------------------------------------ U18 --
test('U18 module boundaries: every weather module imports in Node, weather.js imports only math.js, no cycles; pointer classes', async () => {
  const core = join(LAB, 'core');
  const files = [...readdirSync(core).filter((f) => /^weather.*\.js$/.test(f)).map((f) => join(core, f)),
    ...readdirSync(join(core, 'weather')).filter((f) => f.endsWith('.js')).map((f) => join(core, 'weather', f))];
  const pure = ['weather.js', 'weather-mallow.js', 'field.js', 'clouds.js', 'rain.js', 'wind.js', 'water.js', 'light.js', 'stars.js'];
  for (const p of pure) assert.ok(files.some((f) => f.endsWith(`/${p}`)), `${p} exists`);
  for (const f of files) await import(pathToFileURL(f).href);   // no DOM or audio at import time
  const imports = (f) => [...readFileSync(f, 'utf8').matchAll(/^\s*import\s[^'"]*['"]([^'"]+)['"]/gm)].map((m) => m[1]);
  assert.deepEqual(imports(join(core, 'weather.js')), ['./math.js']);
  for (const f of files.filter((x) => x.includes('/weather/'))) for (const s of imports(f)) assert.ok(s === '../math.js' || /^\.\/[a-z-]+\.js$/.test(s), `${f}: ${s}`);
  assert.deepEqual(imports(join(core, 'weather-mallow.js')).sort(), ['./math.js', './personality.js']);
  // the import graph among them has no cycle
  const graph = new Map(files.map((f) => [f, imports(f).map((s) => join(dirname(f), s)).filter((p) => files.includes(p))]));
  const state = new Map();
  const visit = (f, path) => {
    if (state.get(f) === 2) return;
    assert.notEqual(state.get(f), 1, `import cycle: ${[...path, f].join(' → ')}`);
    state.set(f, 1);
    for (const g of graph.get(f)) visit(g, [...path, f]);
    state.set(f, 2);
  };
  for (const f of files) visit(f, []);
  // pointer classification thresholds: tap < 220 ms and < 10 px, hold still for 220 ms (≤ 12 px), drag > 10 px
  const tr = (o) => ({ t0: 0, x0: 0, y0: 0, x: 0, y: 0, ...o });
  assert.equal(classify(tr({}), 100), 'pending');
  assert.equal(classify(tr({ up: true, tUp: 150, x: 5 }), 150), 'tap');
  assert.equal(classify(tr({ up: true, tUp: 219, maxDist: 9.9 }), 219), 'tap');
  assert.equal(classify(tr({ x: 4 }), 220), 'hold');
  assert.equal(classify(tr({ maxDist: 12 }), 400), 'hold');
  assert.equal(classify(tr({ maxDist: 10.5 }), 100), 'drag');
  assert.equal(classify(tr({ maxDist: 13 }), 400), 'drag');
  assert.equal(classify(tr({ x: 30, up: true, tUp: 80 }), 80), 'drag');
  assert.equal(POINTER.fling, 700); assert.ok(isFling(0, -700) && !isFling(400, 400));
  assert.ok(scatter(0, { x0: 0, y0: 0, x1: 0, y1: 0 }, [], 1, Math.random, new Float32Array(0)) === 0);
});
