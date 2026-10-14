// Unit tests for the Environment Engine (SHARED.md L1), with a fake realm
// mount and a fake clock. Node only:
//   node --test hushmallow/sensory-lab/tests/phase3-env.test.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REALM_GEO, PULSE_KINDS, BRIGHT_PULSES, PULSE_GAPS, backdropTone, homeRealm, lightAnchor, pulseGate,
  Environment, paintRealm, isBlank,
} from '../core/environment.js';
import { FlashGate } from '../core/effects.js';
import { REALMS, REALM_IDS, NEUTRAL_MOOD, moodForEmotion } from '../../src/world/realm.js';
import { MALLOW_IDS } from '../../src/mallows/registry.js';

// stage-screen.js's backdropTone before Phase 3 (the reference the moved copy must match)
function oldBackdropTone(realmId) {
  const sky = REALMS[realmId]?.palette.sky || '#000000';
  const n = parseInt(sky.replace('#', ''), 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.04 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] > 0.3 ? 'light' : 'dark';
}

// A recording stand-in for mountRealm: same option handling for the mood, no DOM.
function fakeRealms() {
  const mounts = [];
  const mount = (wrap, id, opts) => {
    const target = opts.mood ? { ...NEUTRAL_MOOD, ...opts.mood } : moodForEmotion(opts.emotion || 'neutral', opts.intensity ?? 0.6);
    const r = {
      id, opts, wrap, calls: [], destroyed: false, canvas: null,
      getMood: () => ({ ...target }),
      setMood(m) { r.calls.push(['setMood', { ...m }]); r.lastMoodArg = m; return r; },
      transform(p) { r.calls.push(['transform', p]); return r; },
      pulse(kind, pos) { r.calls.push(['pulse', kind, pos]); return r; },
      setFocus(nx, ny) { r.calls.push(['setFocus', nx, ny]); return r; },
      setReducedMotion(b) { r.calls.push(['setReducedMotion', b]); return r; },
      setQuality(q) { r.calls.push(['setQuality', q]); return r; },
      setLowStimulation(b) { r.calls.push(['setLowStimulation', b]); return r; },
      destroy() { r.destroyed = true; },
    };
    mounts.push(r);
    return r;
  };
  return { mount, mounts, last: () => mounts[mounts.length - 1] };
}
const clock = (t = 1000) => { const c = { t, now: () => c.t, add: (ms) => { c.t += ms; } }; return c; };
const named = (r, name) => r.calls.filter((c) => c[0] === name);
function env(o = {}) {
  const fr = fakeRealms(), ck = clock(), screen = { dataset: {} };
  const e = new Environment({ tag: 'wrap' }, { screen, mount: fr.mount, now: ck.now, ...o });
  return { e, fr, ck, screen };
}

test('REALM_GEO covers exactly the production realms, with sane fractions', () => {
  assert.deepEqual(Object.keys(REALM_GEO).sort(), [...REALM_IDS].sort());
  for (const [id, g] of Object.entries(REALM_GEO)) {
    assert.ok(['day', 'dusk', 'night'].includes(g.sky), id);
    assert.ok(g.horizon > 0.4 && g.horizon < 0.75, `${id} horizon`);
    for (const k of ['water', 'sun', 'moon', 'feature', 'shore']) if (g[k]) assert.ok(g[k].length === 2 && g[k].every((v) => v >= 0 && v <= 1), `${id} ${k}`);
    if (g.water) assert.equal(g.water[0], g.horizon, `${id}: water starts at the horizon`);
  }
});

test('pulse tables: bright kinds and gaps are within the known kinds', () => {
  assert.deepEqual(PULSE_KINDS, ['tap', 'ripple', 'success', 'burst', 'strike', 'clear']);
  assert.ok(BRIGHT_PULSES.every((k) => PULSE_KINDS.includes(k)));
  assert.deepEqual(Object.keys(PULSE_GAPS).sort(), [...PULSE_KINDS].sort());
});

test('backdropTone matches the old stage-screen function for every realm (and junk)', () => {
  for (const id of [...REALM_IDS, 'nowhere', undefined, null]) assert.equal(backdropTone(id), oldBackdropTone(id), String(id));
  assert.equal(backdropTone('blue-drift'), 'light');
  assert.equal(backdropTone('sunpop-orchard'), 'light');
  assert.equal(backdropTone('moonmilk-cove'), 'dark');
});

test('homeRealm: a chosen realm wins; auto, stage and junk give the Mallow\'s own world', () => {
  const dna = (v) => ({ get: (k) => (k === 'environment' ? v : null) });
  assert.equal(homeRealm(dna('auto'), 'blubi'), 'raindrop-lagoon');
  assert.equal(homeRealm(dna('stage'), 'glitzi'), 'static-storm');
  assert.equal(homeRealm(dna('blue-drift'), 'glitzi'), 'blue-drift');
  assert.equal(homeRealm(dna('moon'), 'boppo'), 'sunpop-orchard');
  assert.equal(homeRealm(dna(42), 'loomi'), 'blue-drift');
  assert.equal(homeRealm(dna('auto'), 'nobody'), 'moonmilk-cove');
  assert.equal(homeRealm(null, 'zuzu'), 'spiral-observatory');
  for (const id of MALLOW_IDS) assert.equal(REALMS[homeRealm(dna('auto'), id)].mallow, id);
});

test('lightAnchor: sun, else moon, else feature, else the default; always a fresh pair', () => {
  assert.deepEqual(lightAnchor('blue-drift'), [0.72, 0.25]);
  assert.deepEqual(lightAnchor('moonmilk-cove'), [0.70, 0.285]);
  assert.deepEqual(lightAnchor('spiral-observatory'), [0.5, 0.355]);
  assert.deepEqual(lightAnchor('static-storm'), [0.5, 0.2]);
  assert.deepEqual(lightAnchor('nowhere'), [0.5, 0.2]);
  const a = lightAnchor('blue-drift'); a[0] = 0;
  assert.deepEqual(REALM_GEO['blue-drift'].sun, [0.72, 0.25], 'callers cannot edit the table');
});

test('pulseGate: 2 bright a second by default, PULSE_GAPS per kind, taps not bright', () => {
  const g = pulseGate({ now: () => 0 });
  assert.ok(g instanceof FlashGate);
  assert.equal(g.max, 2); assert.equal(g.windowMs, 1000);
  assert.ok(g.allow('success', 0)); assert.ok(g.allow('strike', 10));
  assert.equal(g.allow('burst', 20), false, 'a third bright pulse within 1 s');
  for (let t = 100; t < 1000; t += 100) assert.ok(g.allow('tap', t), 'taps only have their gap');
  assert.equal(g.allow('tap', 950), false, 'tap gap 90 ms');
  assert.ok(pulseGate({ max: 3 }).max === 3);
});

test('mount: resolves ids, passes the realm options, writes the screen dataset', () => {
  const { e, fr, screen } = env({ quality: 'low', reducedMotion: true });
  e.mount('blue-drift', { groundY: 0.8 });
  const r = fr.last();
  assert.equal(r.id, 'blue-drift');
  assert.equal(r.wrap.tag, 'wrap');
  assert.deepEqual(r.opts, { emotion: 'calm', intensity: 0.4, transform: 0, groundY: 0.8, reducedMotion: true, lowStimulation: false, quality: 'low' });
  assert.equal(screen.dataset.backdrop, 'light');
  assert.equal(screen.dataset.realm, 'blue-drift');
  assert.equal(e.realm, r); assert.equal(e.realmId, 'blue-drift'); assert.equal(e.tone, 'light');
  assert.equal(e.geo, REALM_GEO['blue-drift']);
  assert.deepEqual(e.mood, moodForEmotion('calm', 0.4), 'the starting mood is what was sent');

  e.quality = 'high';
  e.mount('noomi', { mood: { clarity: 0.9 }, transform: 0.5 });
  assert.ok(r.destroyed, 'the old realm goes first');
  const r2 = fr.last();
  assert.equal(r2.id, 'moonmilk-cove', 'a Mallow id resolves to its realm');
  assert.deepEqual(r2.opts, { mood: { clarity: 0.9 }, transform: 0.5, groundY: 0.86, reducedMotion: true, lowStimulation: false, quality: 'auto' });
  assert.equal(screen.dataset.backdrop, 'dark');
  assert.equal(screen.dataset.realm, 'moonmilk-cove');
  assert.equal(e.mood.clarity, 0.9);

  e.mount('nowhere');
  assert.equal(fr.last().id, 'moonmilk-cove', 'junk falls back to the Moonmilk Cove');
});

test('destroy: removes the realm and data-realm, keeps data-backdrop; getters go null', () => {
  const { e, fr, screen } = env();
  e.mount('static-storm');
  e.destroy();
  assert.ok(fr.last().destroyed);
  assert.equal(screen.dataset.realm, undefined);
  assert.equal(screen.dataset.backdrop, 'dark');
  for (const k of ['realm', 'realmId', 'geo', 'tone', 'mood']) assert.equal(e[k], null, k);
  assert.equal(e.remount(), null, 'nothing to rebuild');
  assert.equal(e.setMood({ clarity: 1 }), false);
  assert.equal(e.transform(1), false);
  assert.equal(e.pulse('tap'), false);
  e.destroy();   // twice is fine
  const bare = new Environment({}, { mount: fakeRealms().mount });
  bare.mount('blue-drift'); bare.destroy();   // no screen: no dataset writes
});

test('setMood throttle: small changes wait 200 ms, big ones go at once, no change sends nothing', () => {
  const { e, fr, ck } = env();
  e.mount('blue-drift', { mood: { agitation: 0.2, heaviness: 0.2, clarity: 0.5, warmth: 0.5 } });
  const r = fr.last(), sends = () => named(r, 'setMood').length;
  assert.equal(e.setMood({ agitation: 0.2 }), false, 'nothing changed');
  ck.add(500);
  assert.equal(e.setMood({ clarity: 0.5, warmth: 0.5 }), false, 'nothing changed, even after 200 ms');
  assert.equal(sends(), 0);

  assert.equal(e.setMood({ agitation: 0.25 }), true, 'Δ 0.05 ≥ 0.02 goes at once');
  assert.equal(sends(), 1);
  assert.equal(r.calls.at(-1)[1].agitation, 0.25);
  ck.add(50);
  assert.equal(e.setMood({ agitation: 0.26 }), false, 'Δ 0.01 within 200 ms waits');
  ck.add(100);
  assert.equal(e.setMood({ agitation: 0.265 }), false, 'still within 200 ms of the last send');
  assert.equal(sends(), 1);
  assert.equal(e.mood.agitation, 0.25, 'mood is what was last sent');
  ck.add(60);   // 210 ms since the send: the held small change is flushed by the next call
  assert.equal(e.setMood({}), true);
  assert.equal(r.calls.at(-1)[1].agitation, 0.265);
  ck.add(10);
  assert.equal(e.setMood({ heaviness: 0.3 }), true, 'a big move ignores the 200 ms');
  assert.equal(sends(), 3);

  // merging: finite axes only, clamped; the realm gets the whole target (one reused object)
  ck.add(300);
  assert.equal(e.setMood({ warmth: 2, clarity: NaN, agitation: 'x', bogus: 1 }), true);
  assert.deepEqual(r.calls.at(-1)[1], { agitation: 0.265, heaviness: 0.3, clarity: 0.5, warmth: 1 });
  const arg = r.lastMoodArg;
  ck.add(300); e.setMood({ warmth: 0 });
  assert.equal(r.lastMoodArg, arg, 'no new object per send');
  assert.equal(e.setMood(null), false);
});

test('setMood after remount: the rebuilt realm starts at the target, sends compare against it', () => {
  const { e, fr, ck } = env();
  e.mount('blue-drift', { groundY: 0.8, transform: 0.3 });
  e.setMood({ clarity: 0.95 });
  ck.add(50); e.setMood({ clarity: 0.96 });   // held (small, too soon)
  e.remount({ groundY: 0.75 });
  const r = fr.last();
  assert.equal(fr.mounts.length, 2);
  assert.equal(r.id, 'blue-drift');
  assert.equal(r.opts.groundY, 0.75); assert.equal(r.opts.transform, 0.3);
  assert.equal(r.opts.mood.clarity, 0.96, 'the target, including the held change');
  e.remount();
  assert.equal(fr.last().opts.groundY, 0.75, 'the stored groundY');
  assert.equal(e.setMood({ clarity: 0.96 }), false, 'already there');
});

test('transform threshold: ≥ 0.005 moves, exact 0 and 1 always land', () => {
  const { e, fr } = env();
  e.mount('spark-festival');
  const r = fr.last(), sent = () => named(r, 'transform').map((c) => c[1]);
  assert.equal(e.transform(0), false, 'already 0');
  assert.equal(e.transform(0.004), false);
  assert.equal(e.transform(0.005), true);
  assert.equal(e.transform(0.008), false);
  assert.equal(e.transform(0.5), true);
  assert.equal(e.transform(0.998), true);
  assert.equal(e.transform(0.999), false, 'Δ 0.001');
  assert.equal(e.transform(1), true, 'exactly 1 lands even with a tiny Δ');
  assert.equal(e.transform(1), false, 'and only once');
  assert.equal(e.transform(1.5), false, 'clamped to 1');
  assert.equal(e.transform(0.003), true);
  assert.equal(e.transform(0), true, 'exactly 0 lands even with a tiny Δ');
  assert.equal(e.transform(NaN), false);
  assert.deepEqual(sent(), [0.005, 0.5, 0.998, 1, 0.003, 0]);
});

test('pulse: through the gate; refused pulses are dropped (never converted) and logged', () => {
  const { e, fr, ck } = env();
  e.mount('static-storm');
  const r = fr.last(), pulses = () => named(r, 'pulse');
  const at = { nx: 0.5, ny: 0.3 };
  assert.equal(e.pulse('strike', at), true);
  assert.deepEqual(pulses()[0], ['pulse', 'strike', at]);
  ck.add(100);
  assert.equal(e.pulse('strike', at), false, 'strike gap 1500 ms');
  ck.add(10);
  assert.equal(e.pulse('success'), true);
  ck.add(10);
  assert.equal(e.pulse('burst'), false, 'third bright pulse within 1 s');
  ck.add(10);
  assert.equal(e.pulse('tap', { x: 10, y: 20 }), true, 'taps are not bright');
  ck.add(10);
  assert.equal(e.pulse('whirl'), false, 'unknown → tap, inside the 90 ms tap gap: dropped');
  ck.add(100);
  assert.equal(e.pulse('whirl'), true);
  assert.deepEqual(pulses().map((c) => c[1]), ['strike', 'success', 'tap', 'tap'], 'nothing was converted into a gentler kind');
  assert.deepEqual(e.log.map((x) => [x.kind, x.ok]), [['strike', true], ['strike', false], ['success', true], ['burst', false], ['tap', true], ['tap', false], ['tap', true]]);
  assert.equal(e.log[1].t, 1100);
  const copy = e.log; copy[0].kind = 'x';
  assert.equal(e.log[0].kind, 'strike', 'log is a copy');
  assert.equal(pulses()[0][2], at, 'pos is passed through');
  assert.deepEqual(pulses()[1][2], {}, 'no pos: the realm picks its default spot');
});

test('pulse log is a ring of 32, newest last', () => {
  const { e, ck } = env();
  e.mount('blue-drift');
  for (let i = 0; i < 40; i++) { ck.add(1000); e.pulse(i % 2 ? 'ripple' : 'tap'); }
  const log = e.log;
  assert.equal(log.length, 32);
  assert.equal(log.at(-1).t, 41000);
  assert.equal(log[0].t, 41000 - 31000);
  assert.ok(log.every((x) => x.ok));
});

test('gate is public and replaceable (one shared gate for realm and effects)', () => {
  const shared = new FlashGate({ max: 3, gaps: PULSE_GAPS });
  const { e, ck } = env({ gate: shared });
  assert.equal(e.gate, shared);
  e.mount('spark-festival');
  shared.allow('bead', ck.t); shared.allow('bead', ck.t);   // effects spend the budget first
  assert.equal(e.pulse('tap'), true, 'third event of the second');
  ck.add(100);
  assert.equal(e.pulse('ripple'), false, 'bright: null counts every kind; the budget is shared');
  const own = env();
  own.e.gate = new FlashGate({ max: 0 });
  own.e.mount('blue-drift');
  assert.equal(own.e.pulse('tap'), false);
});

test('setQuality maps lab tiers; motion, low stimulation and focus are forwarded', () => {
  const { e, fr } = env();
  e.setQuality('low'); e.setReducedMotion(true); e.setLowStimulation(true); e.setFocus(0.1, 0.2);   // no realm: stored only
  e.mount('raindrop-lagoon');
  const r = fr.last();
  assert.equal(r.opts.quality, 'low'); assert.equal(r.opts.reducedMotion, true); assert.equal(r.opts.lowStimulation, true);
  e.setQuality('medium'); e.setQuality('high'); e.setQuality('low');
  assert.deepEqual(named(r, 'setQuality').map((c) => c[1]), ['auto', 'auto', 'low']);
  e.setReducedMotion(0); e.setLowStimulation(false); e.setFocus(-0.5, 0.25);
  assert.deepEqual(named(r, 'setReducedMotion'), [['setReducedMotion', false]]);
  assert.deepEqual(named(r, 'setLowStimulation'), [['setLowStimulation', false]]);
  assert.deepEqual(named(r, 'setFocus'), [['setFocus', -0.5, 0.25]]);
});

test('snapshot is null without a realm canvas; paintRealm and isBlank fail safe without a DOM', () => {
  const { e } = env();
  assert.equal(e.snapshot(), null);
  e.mount('blue-drift');
  assert.equal(e.snapshot({ dpr: 2 }), null, 'the fake realm has no canvas');
  assert.equal(paintRealm({}, 'blue-drift'), null, 'no document in Node: caught, null');
  assert.equal(isBlank(null), true);
  assert.equal(isBlank({ width: 0, height: 10 }), true);
  assert.equal(isBlank({ width: 10, height: 10 }), false, 'unreadable (no DOM) counts as not blank');
});
