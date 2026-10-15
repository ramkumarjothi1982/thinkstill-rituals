// Unit tests for the Phase 3 shared engine (SHARED.md L3–L13, L24; L1 is in
// phase3-env.test.mjs) and the shared test libraries (L22, L23). Node only:
//   node --test hushmallow/sensory-lab/tests/phase3-shared.test.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlashGate, glowBlend, glowSprite, clearGlowSprites, glowSpriteCount, surfaceTone, EffectsLayer } from '../core/effects.js';
import { FaceMixer } from '../core/expression-engine.js';
import { Personality, GENTLE_REACT, softened } from '../core/personality.js';
import {
  ComfortDNA, sanitize, itemKey, capFavourites, motifNotes, tuneTitle, describeTune,
  HUSHBEAT_MOTIF_RE, PACES, FAV_CAP, BREATH, POCKET_MODES,
} from '../core/comfort-dna.js';
import { MemoryComfortStore } from '../adapters/comfort-store.js';
import { Prefs, DEFAULTS } from '../core/prefs.js';
import { RIG_CONTRACT } from '../adapters/rig-adapter.js';
import { EXPERIENCES } from '../features/registry.js';
import { MATERIALS } from '../core/materials.js';
import { MALLOW_IDS } from '../../src/mallows/registry.js';
import { personalityTable, comfortTable, readFixture, mismatches, oldProfile, PROFILES_N } from './lib/parity.mjs';
import { FakeAudioContext, FakeParam, installAudioGlobals, reaches } from './lib/fake-audio.mjs';
import { SoundEngine, MAX_VOICES, VOICES, soundFacade, quietSound } from '../core/sound-engine.js';
import { AmbientBed, noiseBuffer } from '../core/ambience.js';
import { SoftMallow, DEFAULT_PEEK, SOFT_FX, softKind, particleT, fieldFade, wispFade, liftPuff } from '../core/soft-mallow.js';
import { MeshRenderer } from '../core/mesh-renderer.js';
import { Companion } from '../core/companion.js';
import { MallowRig } from '../../src/mallows/rig.js';
import { digest } from './lib/parity.mjs';
import { BANNED, collectStrings, lintCopy } from './lib/copy-lint.mjs';
import { NETWORK, scanFiles, filesUnder } from './lib/static-scan.mjs';

const flush = () => new Promise((r) => setTimeout(r, 0));
const here = (p) => fileURLToPath(new URL(p, import.meta.url));

// Temporarily define globals (fake DOM pieces) for one test.
function withGlobals(defs, fn) {
  const saved = Object.fromEntries(Object.keys(defs).map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  for (const [k, value] of Object.entries(defs)) Object.defineProperty(globalThis, k, { value, configurable: true, writable: true });
  try { return fn(); } finally { for (const [k, d] of Object.entries(saved)) { if (d) Object.defineProperty(globalThis, k, d); else delete globalThis[k]; } }
}

// A minimal DOM for EffectsLayer / glowSprite: canvases with a recording 2D context.
function fakeDom({ dpr = 3, size = [200, 100] } = {}) {
  const raf = new Map(); let rafId = 0; const cancelled = [];
  const docListeners = new Map();
  const ctx2d = () => {
    const calls = [];
    return new Proxy({ calls }, {
      get: (t, k) => (k in t ? t[k] : k === 'createRadialGradient' ? (...a) => { calls.push(['createRadialGradient', ...a]); return { stops: [], addColorStop(o, c) { this.stops.push([o, c]); calls.push(['stop', o, c]); } }; } : (...a) => { calls.push([k, ...a]); }),
      set: (t, k, v) => { calls.push(['=' + String(k), v]); return true; },
    });
  };
  const el = (tag) => ({
    tag, children: [], style: {}, attrs: {}, className: '', width: 300, height: 150, parentNode: null,
    setAttribute(k, v) { this.attrs[k] = v; },
    getContext() { return (this._g ||= ctx2d()); },
    append(c) { this.children.push(c); c.parentNode = this; },
    insertBefore(c, ref) { const i = this.children.indexOf(ref); if (i < 0) throw new Error('NotFoundError'); this.children.splice(i, 0, c); c.parentNode = this; },
    remove() { const p = this.parentNode; if (p) p.children.splice(p.children.indexOf(this), 1); this.parentNode = null; },
    getBoundingClientRect: () => ({ width: size[0], height: size[1], left: 0, top: 0 }),
  });
  const document = {
    hidden: false, documentElement: { getAttribute: () => null },
    createElement: el,
    addEventListener(t, fn) { if (!docListeners.has(t)) docListeners.set(t, new Set()); docListeners.get(t).add(fn); },
    removeEventListener(t, fn) { docListeners.get(t)?.delete(fn); },
  };
  class ResizeObserver { constructor(cb) { this.cb = cb; this.n = 0; } observe() { this.n++; } disconnect() { this.n = 0; } }
  return {
    globals: {
      document, ResizeObserver, devicePixelRatio: dpr,
      requestAnimationFrame: (fn) => { raf.set(++rafId, fn); return rafId; },
      cancelAnimationFrame: (id) => { cancelled.push(id); raf.delete(id); },
    },
    el, raf, cancelled, listeners: (t) => docListeners.get(t)?.size || 0,
    /** run pending rAF callbacks once at time `now` (ms) */
    frame(now) { const fns = [...raf.values()]; raf.clear(); for (const fn of fns) fn(now); },
  };
}

// ======================================================= L7 effects.js ==
test('L7 FlashGate: at most `max` bright events per window; the window slides', () => {
  let t = 0;
  const g = new FlashGate({ now: () => t });
  assert.deepEqual([0, 100, 200, 300].map((ms) => g.allow('bright', ms)), [true, true, true, false]);
  t = 300; assert.equal(g.count, 3);
  assert.equal(g.allow('bright', 999), false, 'the first one is still inside the window');
  assert.equal(g.allow('bright', 1000), true, 'one slot frees exactly windowMs after the first');
  assert.equal(g.allow('bright', 1050), false);
  t = 1150; assert.equal(g.count, 2, 'count uses now(): 200 and 1000 are inside the last second');
  t = 1250; assert.equal(g.count, 1);
  const one = new FlashGate({ max: 1, windowMs: 2000, now: () => 0 });   // Nightlight's limiter
  assert.equal(one.allow(), true); assert.equal(one.allow('bright', 1999), false); assert.equal(one.allow('bright', 2000), true);
  assert.equal(new FlashGate({ max: 0 }).allow('x', 0), false, 'max 0 refuses every bright event');
});

test('L7 FlashGate: per-kind gaps, and bright null (every kind) vs a list', () => {
  const g = new FlashGate({ max: 2, gaps: { strike: 1500, tap: 90 }, bright: ['strike', 'burst'] });
  assert.equal(g.allow('tap', 0), true);
  assert.equal(g.allow('tap', 50), false, 'tap gap 90 ms');
  assert.equal(g.allow('tap', 90), true);
  for (let i = 0; i < 10; i++) assert.equal(g.allow('ripple', 100 + i), true, 'non-bright kinds without a gap always pass');
  assert.equal(g.allow('strike', 200), true);
  assert.equal(g.allow('strike', 300), false, 'strike gap');
  assert.equal(g.allow('burst', 300), true);
  assert.equal(g.allow('burst', 400), false, 'two bright allowed in the window: full');
  assert.equal(g.allow('tap', 400), true, 'non-bright kinds do not count against the window');
  assert.equal(g.allow('strike', 1700), true, 'gap passed and the window has room again');
  // a gap refusal does not use a window slot
  const h = new FlashGate({ max: 1, gaps: { a: 500 } });
  assert.equal(h.allow('a', 0), true); assert.equal(h.allow('a', 1100), true); assert.equal(h.allow('a', 1200), false);
  // bright: null → every kind counts
  const all = new FlashGate({ max: 2 });
  assert.deepEqual(['tap', 'ripple', 'anything'].map((k) => all.allow(k, 10)), [true, true, false]);
  // PULSE_GAPS-like gaps on a shared gate (Hushbeat): kinds without a gap entry are still limited by the window
  const shared = new FlashGate({ max: 3, gaps: { success: 900 } });
  assert.deepEqual([shared.allow('bead', 0), shared.allow('success', 0), shared.allow('arc', 0), shared.allow('bead', 10)], [true, true, true, false]);
});

test('L7 FlashGate: the log is a copy of the last 32 decisions, refusals included', () => {
  const g = new FlashGate({ max: 1, now: () => 0 });
  g.allow('a', 0); g.allow('b', 1);
  assert.deepEqual(g.log, [{ t: 0, kind: 'a', ok: true }, { t: 1, kind: 'b', ok: false }]);
  const copy = g.log; copy[0].ok = 'edited'; copy.push({});
  assert.equal(g.log[0].ok, true, 'a copy, not the ring');
  for (let i = 0; i < 40; i++) g.allow('k' + i, 2000 + i * 2000);
  const log = g.log;
  assert.equal(log.length, 32);
  assert.equal(log[0].kind, 'k8'); assert.equal(log[31].kind, 'k39'); assert.ok(log.every((e) => e.ok));
  assert.equal(new FlashGate().allow(), true, 'defaults work with performance.now()');
});

test('L7 glowBlend and surfaceTone', () => {
  assert.equal(glowBlend('light'), 'source-over');
  assert.equal(glowBlend('dark'), 'lighter');
  assert.equal(glowBlend(undefined), 'lighter');
  const inScreen = (backdrop) => ({ closest: (sel) => (sel === '.screen' ? { dataset: backdrop ? { backdrop } : {} } : null) });
  assert.equal(surfaceTone(inScreen('light')), 'light');
  assert.equal(surfaceTone(inScreen('dark')), 'dark');
  withGlobals({ document: { documentElement: { getAttribute: () => 'light' } }, matchMedia: () => ({ matches: false }) }, () => {
    assert.equal(surfaceTone(inScreen(null)), 'light', 'no backdrop → <html data-theme>');
  });
  withGlobals({ document: { documentElement: { getAttribute: () => null } }, matchMedia: (q) => ({ matches: q.includes('light') }) }, () => {
    assert.equal(surfaceTone({ closest: () => null }), 'light', 'no theme → prefers-color-scheme');
  });
  withGlobals({ document: { documentElement: { getAttribute: () => null } }, matchMedia: () => ({ matches: false }) }, () => {
    assert.equal(surfaceTone(null), 'dark');
  });
});

test('L7 glowSprite: drawn once per key, LRU of 32, clearGlowSprites releases the bitmaps', () => {
  const dom = fakeDom();
  withGlobals(dom.globals, () => {
    clearGlowSprites();
    const a = glowSprite('#ffd98a', 10.2, { dpr: 2 });
    assert.equal(a.width, 40); assert.equal(a.height, 40);
    assert.equal(glowSprite('#ffd98a', 9.8, { dpr: 2 }), a, 'same key (radius rounded) → same canvas');
    assert.notEqual(glowSprite('#ffd98a', 10, { dpr: 2, rim: true }), a, 'rim is part of the key');
    assert.notEqual(glowSprite('#ffd98a', 10, { dpr: 1 }), a, 'dpr is part of the key');
    const stops = a.getContext().calls.filter((c) => c[0] === 'stop').map((c) => [c[1], c[2]]);
    assert.deepEqual(stops, [[0, 'rgba(255,217,138,1.000)'], [0.35, 'rgba(255,217,138,0.450)'], [1, 'rgba(255,217,138,0.000)']]);
    const rim = glowSprite('#ffffff', 20, { rim: true, core: 0.5 }).getContext().calls;
    assert.ok(rim.some((c) => c[0] === '=strokeStyle' && c[1] === 'rgba(26,20,64,0.18)') && rim.some((c) => c[0] === 'arc' && Math.abs(c[3] - 18.4) < 1e-9), 'rim ring at 0.92 r');
    clearGlowSprites();
    assert.equal(a.width, 0, 'cleared sprites are released');
    const first = glowSprite('#000001', 5);
    for (let i = 2; i <= 32; i++) glowSprite('#' + String(i).padStart(6, '0'), 5);
    assert.equal(glowSpriteCount(), 32);
    assert.equal(glowSprite('#000001', 5), first, 'a hit refreshes it');
    glowSprite('#000033', 5);
    assert.equal(glowSpriteCount(), 32, 'capped at 32');
    assert.equal(glowSprite('#000001', 5), first, 'the recently used one survived');
    assert.notEqual(glowSprite('#000002', 5).width, 0);
    clearGlowSprites();
    assert.equal(glowSpriteCount(), 0);
  });
});

test('L7 EffectsLayer: defaults unchanged (append, fx-layer, z 2, DPR ≤ 2, own rAF + visibility listener)', () => {
  const dom = fakeDom({ dpr: 3 });
  withGlobals(dom.globals, () => {
    const parent = dom.el('div');
    const L = new EffectsLayer(parent, { quality: 'high' });
    assert.equal(parent.children[0], L.canvas);
    assert.equal(L.canvas.className, 'fx-layer');
    assert.equal(L.canvas.style.zIndex, '2');
    assert.equal(L.canvas.attrs['aria-hidden'], 'true');
    assert.equal(L.dpr, 2); assert.equal(L.canvas.width, 400); assert.equal(L.canvas.height, 200);
    assert.equal(dom.raf.size, 1, 'own loop'); assert.equal(dom.listeners('visibilitychange'), 1);
    let steps = 0;
    L.add({ step: (dt) => { steps++; assert.ok(dt >= 0 && dt <= 0.05); return true; }, draw() {} });
    dom.frame(1000); dom.frame(1016);
    assert.equal(steps, 2, '_loop renders every frame');
    assert.ok(Math.abs(L.t - 0.016) < 1e-9);
    L.destroy();
    assert.equal(parent.children.length, 0); assert.equal(dom.listeners('visibilitychange'), 0); assert.ok(dom.cancelled.length >= 1);
  });
});

test('L7 EffectsLayer: manual, before, dprCap, className, zIndex, render(dt), setDprCap', () => {
  const dom = fakeDom({ dpr: 3 });
  withGlobals(dom.globals, () => {
    const parent = dom.el('div'), stage = dom.el('div');
    parent.append(stage);
    const L = new EffectsLayer(parent, { manual: true, before: stage, dprCap: 1, className: 'nl-sky', zIndex: '' });
    assert.equal(parent.children[0], L.canvas, 'inserted before the stage');
    assert.equal(L.canvas.className, 'nl-sky'); assert.equal(L.canvas.style.zIndex, '');
    assert.equal(L.dpr, 1); assert.equal(L.canvas.width, 200);
    assert.equal(dom.raf.size, 0, 'manual: no own rAF'); assert.equal(dom.listeners('visibilitychange'), 0, 'manual: no visibility listener');
    const g = L.canvas.getContext(), clears = () => g.calls.filter((c) => c[0] === 'clearRect').length;
    L.render(0.016);
    assert.equal(clears(), 0, 'an empty layer that never drew costs nothing');
    let life = 2, draws = 0;
    const item = L.add({ step: () => life-- > 0, draw: (gg, layer) => { draws++; assert.equal(layer, L); } });
    assert.equal(item.layer, L);
    L.render(0.016); L.render(0.016);
    assert.equal(draws, 2);
    L.render(0.016);
    assert.equal(L.items.size, 0, 'a finished item is removed');
    const n = clears();
    L.render(0.016);
    assert.equal(clears(), n + 1, 'clears once after the last item goes');
    L.render(0.016); L.render(0.016);
    assert.equal(clears(), n + 1, '…then nothing');
    assert.ok(Math.abs(L.t - 0.016 * 7) < 1e-9, 'render advances t');
    // items added while stepping start on the next frame (snapshot, as before)
    let late = 0;
    L.add({ step: () => { L.add({ step: () => { late++; return false; }, draw() {} }); return false; }, draw() {} });
    L.render(0.016); assert.equal(late, 0); L.render(0.016); assert.equal(late, 1);
    L.setDprCap(1.5); assert.equal(L.dpr, 1.5); assert.equal(L.canvas.width, 300);
    L.canvas.width = 7; L.setDprCap(1.5); assert.equal(L.canvas.width, 7, 'same cap: no resize');
    L.setDprCap(NaN); assert.equal(L.dprCap, 1.5, 'junk ignored');
    L.destroy();
    assert.deepEqual(parent.children, [stage]);
    L.render(0.016);   // after destroy: harmless
  });
});

// ============================================ L8 expression-engine.js ==
const fakeRig = () => ({ calls: 0, faceOverride: { set: {}, min: {} }, setFaceOverride(o = {}) { this.calls++; this.faceOverride = { set: o.set || {}, min: o.min || {} }; } });

test('L8 FaceMixer: later owners win set, min takes the max, null removes', () => {
  const rig = fakeRig(), fm = new FaceMixer(rig);
  assert.equal(rig.calls, 1, 'installs one override in the constructor');
  assert.equal(rig.faceOverride.set, fm.out.set); assert.equal(rig.faceOverride.min, fm.out.min);
  fm.set('event', 'glow', 0.9).set('base', 'glow', 0.2).set('mode', 'glow', 0.5).set('base', 'breath', 1);
  fm.min('base', 'blush', 1.2).min('event', 'blush', 0.4).min('mode', 'eyeOpen', 0.3);
  assert.equal(fm.apply(), true);
  assert.deepEqual(rig.faceOverride.set, { glow: 0.9, breath: 1 });
  assert.deepEqual(rig.faceOverride.min, { blush: 1.2, eyeOpen: 0.3 });
  fm.set('event', 'glow', null); fm.min('base', 'blush', undefined);
  fm.apply();
  assert.deepEqual(rig.faceOverride.set, { glow: 0.5, breath: 1 }, 'removing the top owner reveals the next');
  assert.deepEqual(rig.faceOverride.min, { blush: 0.4, eyeOpen: 0.3 });
  // unknown owners are appended with the highest priority
  fm.set('fade', 'glow', 0.1); fm.apply();
  assert.equal(rig.faceOverride.set.glow, 0.1);
  assert.deepEqual(new FaceMixer(fakeRig(), ['a', 'b']).set('c', 'x', 1).set('b', 'x', 2).apply() && 1, 1);
  const two = new FaceMixer(fakeRig(), ['a', 'b']); two.set('c', 'x', 1).set('b', 'x', 2).apply();
  assert.equal(two.out.set.x, 1);
});

test('L8 FaceMixer: release, in-place reuse with no new override, no-op when unchanged, clear', () => {
  const rig = fakeRig(), fm = new FaceMixer(rig);
  const set = fm.out.set, min = fm.out.min;
  fm.set('mode', 'breathRate', 0.11).min('mode', 'glow', 0.45).set('event', 'cheekPuff', 0.6);
  fm.apply();
  assert.equal(fm.apply(), false, 'nothing changed → no-op');
  fm.set('mode', 'breathRate', 0.11); assert.equal(fm.apply(), false, 'same value is not a change');
  fm.release('mode'); fm.apply();
  assert.deepEqual(rig.faceOverride, { set: { cheekPuff: 0.6 }, min: {} });
  assert.equal(fm.out.set, set); assert.equal(fm.out.min, min);
  assert.equal(rig.faceOverride.set, set, 'the rig still holds the same objects');
  assert.equal(rig.calls, 1, 'apply never re-installs');
  fm.release('nobody'); assert.equal(fm.apply(), false);
  fm.clear();
  assert.equal(rig.calls, 2); assert.deepEqual(rig.faceOverride, { set: {}, min: {} });
  assert.notEqual(rig.faceOverride.set, set, 'clear hands the rig a fresh empty override');
  assert.deepEqual(fm.out, { set: {}, min: {} });
  assert.equal(fm.apply(), false, 'nothing to apply after clear');
  fm.min('base', 'glow', 0.3); fm.apply();
  assert.equal(rig.calls, 3, 'used again after clear: re-installed once');
  assert.deepEqual(rig.faceOverride.min, { glow: 0.3 });
});

// ================================================== L9 personality.js ==
test('L9 parity: respond() / _styled output identical to Phase 2 for every profile × style × gesture × 50 seeds', () => {
  const bad = mismatches(readFixture('personality'), personalityTable());
  assert.deepEqual(bad, [], `changed: ${bad.join(', ')}`);
});

test('L9 softened and GENTLE_REACT', () => {
  assert.ok(Object.isFrozen(GENTLE_REACT));
  assert.deepEqual(GENTLE_REACT, { hop: 'nod', doubleTap: 'nod', celebrate: 'nod', flick: 'tap', shiver: 'tap', glitchBurst: 'tap' });
  for (const [k, v] of Object.entries(GENTLE_REACT)) assert.equal(softened(k, { gentle: true }), v);
  assert.equal(softened('glitchBurst', { gentle: true, reduced: true }), 'tap');
  assert.deepEqual(['hop', 'doubleTap', 'celebrate', 'flick', 'shiver', 'glitchBurst', 'nod'].map((k) => softened(k, { reduced: true })),
    ['nod', 'nod', 'nod', 'flick', 'shiver', 'glitchBurst', 'nod'], 'reduced only removes jumps');
  assert.equal(softened('hop'), 'hop'); assert.equal(softened('hop', {}), 'hop');
  for (const k of [null, undefined, '']) assert.equal(softened(k, { gentle: true }), k, 'falsy kinds pass through');
  assert.equal(softened('sigh', { gentle: true }), 'sigh');
  assert.equal(softened('toString', { gentle: true }), 'toString', 'own keys only');
});

test('L9 setFilter: can null a response or rewrite its tag; null restores the old behaviour', () => {
  const p = new Personality('boppo', { seed: 7 });
  assert.equal(p.filter, null);
  const seen = [];
  p.setFilter((out, g, d) => { seen.push([g, d.streak]); return g === 'doubletap' ? null : { ...out, tag: 'night-' + out.tag }; });
  const r = p.respond('tap', { streak: 1 });
  assert.ok(r.tag.startsWith('night-tap-'));
  assert.deepEqual(seen, [['tap', 1]]);
  assert.equal(p.respond('doubletap', {}), null, 'nulled');
  assert.deepEqual(p.history, [r.tag], 'a nulled response is not remembered; a rewritten tag is');
  // the filter sees the styled output (gentle applies first)
  const q = new Personality('boppo', { seed: 3, style: 'gentle' });
  q.setFilter((out) => { assert.ok(!['hop', 'doubleTap', 'celebrate'].includes(out.react)); return out; });
  for (let i = 0; i < 12; i++) q.respond('doubletap', {});
  // null (or junk) restores: same outputs as a Personality that never had a filter
  const a = new Personality('pipzi', { seed: 11 }), b = new Personality('pipzi', { seed: 11 });
  a.setFilter(() => null); a.setFilter(null);
  b.setFilter('not a function'); assert.equal(b.filter, null);
  const c = new Personality('pipzi', { seed: 11 });
  for (const [g, d] of [['tap', { streak: 1 }], ['doubletap', {}], ['holdstart', {}], ['holdend', {}], ['squeezeend', { peak: 0.6 }]]) {
    const x = c.respond(g, d);
    assert.deepEqual(a.respond(g, d), x); assert.deepEqual(b.respond(g, d), x);
  }
  assert.deepEqual(a.history, c.history);
});

// ================================================== L11 comfort-dna.js ==
const MOTIF = '00n7501n9600b4300h7400N9500n75';   // 4 notes (n, n, N, n), a bass and a hum
const tune = (o = {}) => ({ kind: 'hushbeat', mallow: 'boppo', friend: 'loomi', pace: 'natural', motif: MOTIF, ...o });

test('L11 constants: motif format, paces, caps, BREATH', () => {
  assert.ok(HUSHBEAT_MOTIF_RE.test(MOTIF));
  assert.ok(HUSHBEAT_MOTIF_RE.test('v'.repeat(0) + '7vHl9'.repeat(48)), '48 tokens');
  assert.ok(!HUSHBEAT_MOTIF_RE.test('00n75'.repeat(49)), 'not 49');
  for (const bad of ['', '00n7', '80n75', '0wn75', '00x75', '00n7m', '00n70', '00n75 ']) assert.ok(!HUSHBEAT_MOTIF_RE.test(bad), bad);
  assert.deepEqual(PACES, ['slower', 'natural', 'livelier']);
  assert.deepEqual(FAV_CAP, { hushbeat: 6, other: 12 });
  assert.deepEqual(BREATH.natural, { inhale: 4, exhale: 6 });
});

test('L11 a hushbeat item is cleaned: a bad friend or motif is dropped, the item kept', () => {
  const d = sanitize({ version: 1, favourites: [
    tune(),
    tune({ friend: 'boppo', motif: 'nope', pace: 'zoom', extra: '<b>' }),
    tune({ friend: 'nobody', motif: 42 }),
    { kind: 'hushbeat', mallow: 'nobody', friend: 'loomi' },
    { kind: 'hushbeat' },
  ] });
  assert.deepEqual(d.favourites, [
    { kind: 'hushbeat', id: 'hushbeat', mallow: 'boppo', friend: 'loomi', pace: 'natural', motif: MOTIF },
    { kind: 'hushbeat', id: 'hushbeat', mallow: 'boppo', pace: 'natural' },
    { kind: 'hushbeat', id: 'hushbeat', mallow: 'boppo', pace: 'natural' },
  ]);
  assert.equal(sanitize({ version: 1, favourites: [tune({ pace: 'livelier', friend: undefined })] }).favourites[0].pace, 'livelier');
});

test('L11 itemKey is stable and tells tunes apart', () => {
  const k = itemKey(tune());
  assert.match(k, /^hushbeat:boppo:loomi:natural:[0-9a-z]+$/);
  assert.equal(itemKey({ ...tune() }), k);
  assert.equal(itemKey(sanitize({ version: 1, favourites: [tune()] }).favourites[0]), k, 'same key after cleaning');
  assert.equal(itemKey({ kind: 'hushbeat', mallow: 'boppo' }), `hushbeat:boppo:-:natural:${(0x811c9dc5).toString(36)}`, 'no friend, no pace, no motif');
  const keys = new Set([tune(), tune({ friend: 'zuzu' }), tune({ pace: 'slower' }), tune({ motif: '00n75' }), tune({ mallow: 'noomi' })].map(itemKey));
  assert.equal(keys.size, 5);
  assert.equal(itemKey({ kind: 'softbody', material: 'jelly' }), 'softbody:*:jelly', 'old kinds unchanged');
  assert.equal(itemKey({ kind: 'pocket', id: 'soft-breath' }), 'pocket:soft-breath');
});

test('L11 sanitize round-trips profiles with tunes', () => {
  const raw = { version: 1, enabled: true, learn: true, prefs: { responses: 'gentle' },
    favourites: [tune(), { kind: 'pocket', id: 'gentle-glow' }, tune({ friend: 'zuzu', pace: 'slower' })],
    history: { a: { ...tune(), n: 3, last: 9 }, b: { kind: 'experience', id: 'hushbeat', n: 2, last: 5 } } };
  const once = sanitize(raw), twice = sanitize(JSON.parse(JSON.stringify(once)));
  assert.deepEqual(twice, once);
  assert.equal(once.favourites.length, 3);
  assert.ok(once.history[itemKey(tune())], 'a tune in history is keyed by its tune key');
});

test('L11 seven keeps never evict a pocket favourite; the oldest tune goes', async () => {
  const dna = await new ComfortDNA(new MemoryComfortStore()).load();
  const others = [...POCKET_MODES.map((id) => ({ kind: 'pocket', id })), ...MALLOW_IDS.map((id) => ({ kind: 'mallow', id }))];
  for (const it of others) dna.toggleFavourite(it);
  assert.equal(dna.favourites().length, 12);
  const tunes = MALLOW_IDS.map((m) => tune({ mallow: m, friend: undefined }));   // 7 different tunes, oldest first
  for (const t of tunes) assert.equal(dna.toggleFavourite(t), true);
  const favs = dna.favourites();
  assert.equal(favs.filter((f) => f.kind === 'hushbeat').length, 6);
  assert.equal(favs.filter((f) => f.kind !== 'hushbeat').length, 12, 'every Pocket and Mallow favourite kept');
  for (const id of POCKET_MODES) assert.ok(dna.isFavourite({ kind: 'pocket', id }), id);
  assert.ok(!dna.isFavourite(tunes[0]), 'the oldest tune is the one dropped');
  assert.ok(dna.isFavourite(tunes[6]));
  assert.equal(dna.toggleFavourite(tunes[6]), false, 'a second Keep removes it');
  assert.ok(!dna.isFavourite(tunes[6]));
  // a 13th other favourite still drops the oldest other one, as in Phase 2
  dna.toggleFavourite({ kind: 'softbody', material: 'jelly' });
  assert.equal(dna.favourites().filter((f) => f.kind !== 'hushbeat').length, 12);
  assert.ok(!dna.isFavourite({ kind: 'pocket', id: POCKET_MODES[0] }));
});

test('L11 old profiles sanitise identically (recorded Phase 2 parity + capFavourites ≡ slice(0, 12) without tunes)', async () => {
  const bad = mismatches(readFixture('comfort'), await comfortTable());
  assert.deepEqual(bad, [], `changed: ${bad.join(', ')}`);
  for (let seed = 1; seed <= PROFILES_N; seed++) {
    const list = (oldProfile(seed).raw.favourites || []);
    if (!Array.isArray(list)) continue;
    const objs = list.filter((x) => x && typeof x === 'object');
    assert.deepEqual(capFavourites(objs), objs.filter(Boolean).slice(0, 12));
  }
  const mixed = [tune(), ...Array.from({ length: 14 }, (_, i) => ({ kind: 'pocket', id: 'p' + i })), ...Array.from({ length: 8 }, (_, i) => tune({ motif: '0' + i + 'n75' }))];
  const capped = capFavourites(mixed);
  assert.equal(capped.filter((f) => f.kind === 'hushbeat').length, 6);
  assert.equal(capped.filter((f) => f.kind === 'pocket').length, 12);
  assert.equal(capped[0], mixed[0], 'order kept');
});

test('L11 motifNotes, tuneTitle and describeTune', () => {
  assert.equal(motifNotes(MOTIF), 4);
  assert.equal(motifNotes('00b7500h75'), 0);
  for (const bad of [undefined, null, '', 'nope', 42, '00n75'.repeat(49)]) assert.equal(motifNotes(bad), 0);
  assert.equal(motifNotes('00n75'.repeat(14)), 14);
  assert.equal(tuneTitle(tune()), 'Boppo & Loomi tune');
  assert.equal(tuneTitle(tune({ friend: undefined })), 'Boppo tune');
  assert.equal(tuneTitle(tune({ friend: 'boppo' })), 'Boppo tune');
  assert.equal(describeTune(tune({ motif: '00n75'.repeat(14) })), 'Boppo & Loomi tune · 14 notes · Natural');
  assert.equal(describeTune(tune({ friend: undefined, motif: undefined })), 'Boppo tune · Natural');
  assert.equal(describeTune(tune({ motif: '00n75', pace: 'slower' })), 'Boppo & Loomi tune · 1 note · Slower');
  assert.equal(describeTune(tune({ motif: '00b75', pace: 'livelier', mallow: 'noomi' })), 'Noomi & Loomi tune · Livelier');
  assert.equal(describeTune(tune({ pace: 'junk' })), 'Boppo & Loomi tune · 4 notes · Natural');
});

test('L11 suggestions() offers a kept tune', async () => {
  const dna = await new ComfortDNA(new MemoryComfortStore()).load();
  dna.set('comfort', ['breathe']);
  dna.toggleFavourite(tune());
  const s = dna.suggestions(3);
  assert.equal(s[0].kind, 'hushbeat'); assert.equal(s[0].reason, 'favourite'); assert.equal(s[0].motif, MOTIF);
  assert.deepEqual(s.map((x) => x.reason), ['favourite', 'helps']);
  dna.setEnabled(false);
  assert.deepEqual(dna.suggestions(), []);
  await flush();
});

test('L11 suggestions() offers only the newest kept tune, so other favourites and offers keep their places', async () => {
  const dna = await new ComfortDNA(new MemoryComfortStore()).load();
  dna.set('comfort', ['breathe']);
  dna.toggleFavourite({ kind: 'pocket', id: 'gentle-glow' });
  const tunes = ['00n75', '00n7501n96', '00n7501n9602n97'].map((motif) => tune({ friend: undefined, motif }));   // three Boppo tunes
  for (const t of tunes) dna.toggleFavourite(t);
  const s = dna.suggestions(3);
  assert.deepEqual(s.map((x) => `${x.kind}:${x.reason}`), ['hushbeat:favourite', 'pocket:favourite', 'pocket:helps']);
  assert.equal(s[0].motif, tunes[2].motif, 'the newest tune');
  assert.equal(s[1].id, 'gentle-glow'); assert.equal(s[2].id, 'soft-breath');
  assert.equal(dna.suggestions(12).filter((x) => x.kind === 'hushbeat').length, 1, 'never two tunes, however long the list');
  await flush();
});

// ======================================================== L12 prefs.js ==
test('L12 prefs: musicVisualOnly and nightlight defaults, persistence and reset', () => {
  assert.equal(DEFAULTS.musicVisualOnly, false);
  assert.equal(DEFAULTS.nightlight, null);
  const store = new Map();
  const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) };
  const p = new Prefs(storage), seen = [];
  p.onChange((k) => seen.push(k));
  assert.equal(p.get('musicVisualOnly'), false); assert.equal(p.get('nightlight'), null);
  p.set('musicVisualOnly', true);
  const night = { mode: 'breathe', brightness: 0.3 };
  p.set('nightlight', night);
  night.brightness = 0.9; p.set('nightlight', night);
  assert.deepEqual(seen, ['musicVisualOnly', 'nightlight'], 'the same reference is skipped: always write a new object');
  p.set('nightlight', { ...night });
  const q = new Prefs(storage);
  assert.equal(q.get('musicVisualOnly'), true);
  assert.deepEqual(q.get('nightlight'), { mode: 'breathe', brightness: 0.9 });
  assert.deepEqual(q.legacy, {}, 'not treated as legacy keys');
  q.reset();
  assert.equal(q.get('musicVisualOnly'), false); assert.equal(q.get('nightlight'), null);
  assert.equal(store.size, 0);
});

// ================================================== L13 rig contract ==
test('L13 rig contract lists the Phase 3 fields', () => {
  for (const f of ['overlays', 'intensity']) assert.ok(RIG_CONTRACT.fields.includes(f), f);
  for (const f of ['squashV', 'leanV', 'shearV', 'tiltV', 'hopV', 'glitchBurst', 'burstRows']) assert.ok(RIG_CONTRACT.body.includes(f), f);
  assert.equal(new Set(RIG_CONTRACT.body).size, RIG_CONTRACT.body.length, 'no duplicates');
});

// ========================================================= L24 extra ==
test('L24 registry: the live list is the 7 playable ids', () => {
  assert.deepEqual(EXPERIENCES.filter((e) => e.load).map((e) => e.id), ['touchtalk', 'softbody', 'pocket-hush', 'comfort-dna', 'weather', 'hushbeat', 'nightlight']);
});

// ====================================================== L22 fake audio ==
test('L22 fake audio: params record events and evaluate ramps', () => {
  const p = new FakeParam(1, 'g');
  p.value = 0;
  p.setValueAtTime(0, 0).linearRampToValueAtTime(1, 2).setTargetAtTime(0, 3, 0.5);
  assert.deepEqual(p.events.map((e) => e.type), ['set', 'linear', 'target']);
  assert.equal(p.valueAt(1), 0.5); assert.equal(p.valueAt(2.5), 1);
  assert.ok(Math.abs(p.valueAt(3.5) - Math.exp(-1)) < 1e-9);
  p.cancelScheduledValues(3);
  assert.equal(p.valueAt(10), 1, 'cancel removes later automation');
  assert.equal(p.events.length, 4, '…but the call is still recorded');
  assert.equal(p.last('linear').v, 1);
  const e = new FakeParam(1); e.setValueAtTime(1, 0); e.exponentialRampToValueAtTime(0.25, 2);
  assert.ok(Math.abs(e.valueAt(1) - 0.5) < 1e-9);
  assert.throws(() => e.exponentialRampToValueAtTime(0, 3), RangeError);
});

test('L22 fake audio: graph, sources, ended and the clock', async () => {
  const c = new FakeAudioContext();
  assert.equal(c.state, 'running'); assert.equal(c.sampleRate, 48000); assert.equal(c.currentTime, 0);
  const g = c.createGain(), f = c.createBiquadFilter(), o = c.createOscillator(), pan = c.createStereoPanner();
  assert.equal(o.connect(f), f); f.connect(g); g.connect(pan); pan.connect(c.destination);
  assert.ok(reaches(o, c.destination)); assert.ok(!reaches(c.destination, o));
  const lfo = c.createOscillator(); assert.equal(lfo.connect(f.frequency), undefined);
  assert.ok(f.frequency.inputs.has(lfo));
  let ended = 0;
  o.onended = () => ended++;
  o.start(0.5); o.stop(2);
  assert.ok(c.live.has(o));
  assert.throws(() => o.start(), /InvalidStateError/);
  assert.throws(() => c.createOscillator().stop(), /InvalidStateError/);
  c.advance(1.9); assert.equal(ended, 0);
  c.advance(0.2); assert.equal(ended, 1); assert.ok(!c.live.has(o)); assert.ok(o.ended);
  const b = c.createBuffer(1, 4800, 48000);
  assert.equal(b.duration, 0.1); assert.equal(b.getChannelData(0).length, 4800); assert.equal(b.getChannelData(0), b.getChannelData(0));
  const s = c.createBufferSource(); s.buffer = b; let se = 0; s.addEventListener('ended', () => se++);
  s.start(); c.advance(0.05); assert.equal(se, 0); c.advance(0.06); assert.equal(se, 1, 'a non-looping buffer ends on its own');
  const loop = c.createBufferSource(); loop.buffer = b; loop.loop = true; loop.start(); c.advance(10);
  assert.ok(c.live.has(loop), 'a loop runs until stopped');
  g.disconnect(); assert.equal(g.outputs.size, 0); assert.ok(!reaches(o, c.destination));
  for (const k of ['createConvolver', 'createDynamicsCompressor', 'createWaveShaper', 'createDelay', 'createConstantSource']) assert.ok(c[k](), k);
  assert.equal(c.count('oscillator'), 3);
  await c.suspend(); assert.equal(c.state, 'suspended');
  await c.resume(); assert.equal(c.state, 'running');
  await c.close(); assert.equal(c.state, 'closed');
  await assert.rejects(c.resume());
});

test('L22 fake audio: installAudioGlobals drives the real Sound Engine, then restores', async () => {
  const before = { AC: globalThis.AudioContext, doc: globalThis.document, nav: globalThis.navigator };
  const restore = installAudioGlobals({ active: false });
  try {
    assert.equal(globalThis.AudioContext, FakeAudioContext);
    assert.equal(navigator.userActivation.isActive, false);
    assert.equal(typeof document.addEventListener, 'function');
    const { SoundEngine } = await import('../core/sound-engine.js');
    const s = new SoundEngine();
    s.unlock();
    assert.equal(s.ctx, null, 'no context outside a gesture');
    restore.setActive(true);
    s.unlock();
    assert.ok(s.ctx instanceof FakeAudioContext);
    assert.ok(s.ready);
    assert.ok(reaches(s.bus, s.ctx.destination), 'bus → … → destination');
    s.poke(MATERIALS.marshmallow, 0.6);
    assert.ok(s.live.size >= 1 && s.ctx.live.size >= 1);
    s.ctx.advance(2);
    assert.equal(s.live.size, 0, 'voices end and leave `live` as the clock passes');
    restore.setHidden(true);
    assert.equal(s.ctx.state, 'suspended', 'the engine hears visibilitychange through the fake document');
    s.dispose?.();
  } finally { restore(); }
  assert.equal(globalThis.AudioContext, before.AC);
  assert.equal(globalThis.document, before.doc);
  assert.equal(globalThis.navigator, before.nav);
});

// ================================================ L23 copy lint, scan ==
test('L23 copy lint: banned phrases at word starts, allow and extra', () => {
  const COPY = { a: 'A therapy session', b: ['Healing light', { c: 'Calm your mind' }], d: (n) => `${n} notes for your mood`, e: 'Kept', f: 'Nightlight is not a medical device' };
  const strings = collectStrings(COPY);
  assert.ok(strings.includes('notes for your mood'), 'string literals inside functions are collected');
  const hits = lintCopy(strings, { allow: ['Nightlight is not a medical device'] });
  assert.deepEqual(hits.map((h) => h.text).sort(), ['A therapy session', 'Calm your mind', 'Healing light', 'notes for your mood'].sort());
  assert.deepEqual(lintCopy(['retreat', 'secure', 'a bedtime story', 'scores'.slice(1)]), [], 'only at word starts');
  assert.deepEqual(lintCopy(['Weather mood']), []);
  assert.equal(lintCopy(['Weather mood'], { extra: [/\bmood\b/i] }).length, 1);
  assert.equal(lintCopy(['TREATMENT', 'Streaks!', 'blue light', 'sleep better', 'feel better', 'insomnia']).length, 6);
  assert.equal(BANNED.length, 18);
});

test('L23 static scan: network APIs found, comments and allowed files skipped', () => {
  const dir = mkdtempSync(join(tmpdir(), 'scan-'));
  try {
    const bad = join(dir, 'bad.js'), ok = join(dir, 'core', 'screen-wake.js');
    writeFileSync(bad, ["// fetch( in a comment is fine", "const r = fetch('/x');", "const ns = 'http://www.w3.org/2000/svg';", "const u = 'https://example.com';", 'setInterval(f, 10);', 'navigator.wakeLock.request()'].join('\n'));
    rmSync(join(dir, 'core'), { recursive: true, force: true });
    writeFileSync(join(dir, 'x.mjs'), 'export const a = 1;\n');
    const hits = scanFiles([bad], { forbid: [...NETWORK, /\bsetInterval\b/, 'navigator.wakeLock'] });
    assert.deepEqual(hits.map((h) => h.line), [2, 4, 5, 6]);
    assert.ok(scanFiles([bad], { forbid: ['navigator.wakeLock'], allow: { 'navigator.wakeLock': 'bad.js' } }).length === 0, 'allowed in that file');
    assert.equal(filesUnder(dir).length, 2);
    void ok;
  } finally { rmSync(dir, { recursive: true, force: true }); }
  // the shared modules edited for Phase 3 stay offline
  const shared = ['../core/effects.js', '../core/expression-engine.js', '../core/personality.js', '../core/comfort-dna.js', '../core/prefs.js', '../adapters/rig-adapter.js', '../features/comfort-dna.js'].map(here);
  assert.deepEqual(scanFiles(shared), []);
});

// ======================================================= L6 sound engine ==
// A Sound Engine on the fake AudioContext, unlocked as if from a gesture.
async function fakeEngine(opts) {
  const restore = installAudioGlobals({ active: true });
  const s = new SoundEngine(opts);
  s.unlock();
  await flush();   // the noise and reverb buffers are made in a timeout
  return { s, c: s.ctx, restore, done() { s.dispose(); restore(); } };
}
// A long voice with one running source (it stays live until killed or its time is up).
function holdVoice(s, opts = {}) {
  const v = s._voice(10, opts), o = s.ctx.createOscillator();
  o.connect(v.out); o.start(v.t); o.stop(v.t + 10); v.srcs.push(o); v.nodes.push(o); v.end(v.t + 10);
  return v;
}
const spyKills = (s) => { const killed = []; for (const v of s.live) { const k = v.kill; v.kill = () => { killed.push(v); k(); }; } return killed; };

// Digest of every node, connection and param event the Phase 1/2 sound paths
// make for a fixed script (seeded Math.random). REF was recorded from the
// Phase 2 sound-engine.js BEFORE the L6 edit; change it only for an intended sound change.
const SOUND_PARITY = '3caae3a4052429c2';
async function soundDigest() {
  const rand = Math.random;
  let seed = 12345;
  Math.random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const restore = installAudioGlobals({ active: true });
  const proto = Object.getPrototypeOf(new FakeAudioContext().createGain()), connect = proto.connect, conns = [];
  proto.connect = function (d) { conns.push([this, d]); return connect.call(this, d); };   // every connection, in order (voices disconnect when they end)
  try {
    const s = new SoundEngine({ volume: 0.6 }), log = [];
    s.unlock();
    await new Promise((r) => setTimeout(r, 5));
    const c = s.ctx, idx = new Map(c.nodes.map((n, i) => [n, i]));
    const id = (x) => { if (!idx.has(x)) idx.set(x, idx.size); return idx.get(x); };
    const step = (secs) => c.advance(secs);
    const snap = (label) => log.push({ label, live: [...s.live].map((v) => ({ dur: v.dur, nodes: v.nodes.map(id), srcs: v.srcs.map(id), t: +v.t.toFixed(6) })), master: s.master.gain.events.length, state: c.state });
    for (const m of Object.values(MATERIALS)) {
      s.poke(m, 0.6, -0.3); step(0.05); s.squish(m, 0.7, 0.2); step(0.05); s.release(m, 0.8, 0.5); step(0.05);
      s.impact(m, 0.6); step(0.05); s.settle(m); step(0.05);
      const st = s.stretch(m); st.update(0.6, 0.5); step(0.05); st.update(0.9, 0.2); st.end(); step(0.05);
      const br = s.brush(); br.update(0.5); step(0.05); br.end();
      snap('mat ' + m.id); step(2);
    }
    for (const m of Object.keys(VOICES)) {
      for (const k of ['tap', 'giggle', 'surprise', 'boing', 'content', 'coo', 'hum', 'grumble', 'tap', 'tap']) { s.voice(m, k, 0.7); step(0.05); }
      const b1 = s.breath('in', 3, 0.6, m); step(0.05); const b2 = s.breath('out', 4, 0.5, m); b1.end(); step(0.05);
      for (let i = 0; i < 10; i++) { s.chime(m, i, 0.5); step(0.05); }
      s.bubble(0.9); step(0.05);
      const p = s.pad(m); p.update(0.5); step(0.1);
      s.motif(m, 'bright'); step(0.05); s.motif(m, 'rest'); step(0.05);
      snap('voice ' + m);
      p.end(); b2.end(); step(5);
      snap('after ' + m);
    }
    const kinds = ['tap', 'giggle', 'surprise', 'boing', 'content', 'coo', 'hum', 'grumble'];
    for (let i = 0; i < 24; i++) { if (i % 2) s.chime('boppo', (i >> 1) % 10, 0.4); else s.voice('loomi', kinds[(i >> 1) % 8], 0.5); step(0.01); }
    snap('cap full');
    for (let i = 0; i < 12; i++) { s.chime('pipzi', i % 10, 0.4); step(0.12); if (i === 3) snap('cap evicting'); }
    snap('cap'); step(5);
    s.setVolume(0.3); s.setMuted(true); snap('muted'); s.setMuted(false); s.setVolume(0.8);
    s.pad('noomi'); step(0.2); restore.setHidden(true); snap('hidden'); restore.setHidden(false); step(1); snap('visible');
    s.stopAll(); step(3); snap('end');
    const owner = new Map();
    for (const n of c.nodes) for (const v of Object.values(n)) if (v instanceof FakeParam) owner.set(v, n);
    const nodes = c.nodes.map((n) => {
      const o = { k: n.kind, out: [...n.outputs].map((d) => (d.name ? `${id(owner.get(d))}.${d.name}` : id(d))) };
      for (const [key, v] of Object.entries(n)) if (v && v.events && v.name) o[key] = { v: v.value, e: v.events.map((e) => [e.type, +(+e.v || 0).toFixed(6), +e.t.toFixed(6), e.tau ?? null]) };
      if (n.type) o.type = n.type;
      if ('loop' in n) o.loop = n.loop;
      if ('startAt' in n) o.ss = [n.startAt, n.stopAt, +n.startOffset.toFixed(6)];
      if (n.buffer) o.buf = n.buffer.length + ':' + n.buffer.numberOfChannels;
      return o;
    });
    const wired = conns.map(([a, d]) => `${id(a)}>${d instanceof FakeParam ? `${id(owner.get(d))}.${d.name}` : id(d)}`);
    const out = digest(JSON.stringify({ nodes, wired, log, master: s.master.gain.events }));
    s.dispose();
    return out;
  } finally { proto.connect = connect; Math.random = rand; restore(); }
}

test('L6 parity: every Phase 1/2 sound builds the same graph, params and timing as before the edit', async () => {
  assert.equal(await soundDigest(), SOUND_PARITY);
});

test('L6 _voice: the default graph is unchanged (out → panner → bus + reverb send)', async () => {
  const { s, c, done } = await fakeEngine();
  try {
    assert.equal(MAX_VOICES, 24);
    const n0 = c.nodes.length, v = s._voice(0.5, { pan: 3 });
    assert.deepEqual(c.nodes.slice(n0).map((n) => n.kind), ['gain', 'panner'], 'two nodes, in this order');
    const [out, p] = v.nodes;
    assert.equal(v.nodes.length, 2); assert.equal(v.out, out);
    assert.deepEqual([...out.outputs], [p]);
    assert.deepEqual([...p.outputs], [s.bus, s.verbSend], 'bus first, then the reverb send');
    assert.equal(p.pan.value, 1, 'pan clamped');
    assert.equal(v.keep, false); assert.equal(v.dur, 0.5);
    assert.ok(Math.abs(v.t - (c.currentTime + 0.005)) < 1e-9);
    assert.ok(s.live.has(v));
    // without a StereoPanner: out → bus only
    c.createStereoPanner = undefined;
    const w = s._voice(1);
    assert.deepEqual(w.nodes, [w.out]); assert.deepEqual([...w.out.outputs], [s.bus]);
  } finally { done(); }
});

test('L6 _voice: dest and send routing, keep flag', async () => {
  const { s, c, done } = await fakeEngine();
  try {
    const sub = c.createGain(); sub.connect(s.bus);
    const a = s._voice(1, { dest: sub, keep: true });
    assert.deepEqual([...a.nodes[1].outputs], [sub, s.verbSend], 'dest replaces the bus; send 1 connects directly');
    assert.equal(a.keep, true);
    const b = s._voice(1, { dest: sub, send: 0 });
    assert.deepEqual([...b.nodes[1].outputs], [sub], 'send 0: no reverb');
    assert.equal(b.nodes.length, 2);
    const d = s._voice(1, { send: 0.4 });
    assert.equal(d.nodes.length, 3, 'a per-voice send gain joins v.nodes');
    const sg = d.nodes[2];
    assert.equal(sg.kind, 'gain'); assert.equal(sg.gain.value, 0.4);
    assert.deepEqual([...d.nodes[1].outputs], [s.bus, sg]); assert.deepEqual([...sg.outputs], [s.verbSend]);
    assert.equal(s._voice(1, { send: -1 }).nodes.length, 2, 'a negative send adds nothing');
    c.createStereoPanner = undefined;
    const e = s._voice(1, { dest: sub, send: 0.5 });
    assert.deepEqual([...e.out.outputs], [sub], 'no panner: out → dest, no send');
    // all of them end and disconnect as usual
    for (const v of [a, b, d, e]) v.end(c.currentTime);
    await new Promise((r) => setTimeout(r, 80));
    assert.equal(s.live.size, 1, 'only the negative-send voice (never ended) is left');
    assert.equal(sg.outputs.size, 0, 'the send gain was disconnected');
  } finally { done(); }
});

test('L6 _room: keep-aware eviction, never the same voice twice; _ok uses it', async () => {
  const { s, c, done } = await fakeEngine();
  try {
    const bed = holdVoice(s, { keep: true });
    const plain = Array.from({ length: MAX_VOICES - 2 }, () => holdVoice(s));
    const held = holdVoice(s, { keep: true });
    assert.equal(s.live.size, MAX_VOICES);
    let killed = spyKills(s);
    s._room();
    assert.deepEqual(killed, [plain[0]], 'the oldest voice without keep');
    s._room();
    assert.deepEqual(killed, [plain[0], plain[1]], 'not the one already fading');
    c.advance(0.2);   // the two killed voices end
    assert.equal(s.live.size, MAX_VOICES - 2);
    s._room();
    assert.equal(killed.length, 2, 'below the cap: nothing');
    // a one-shot at the cap evicts through _room
    holdVoice(s); holdVoice(s);
    killed = spyKills(s);
    s.poke(MATERIALS.marshmallow, 0.6);
    assert.deepEqual(killed, [plain[2]], '_ok() makes room the same way');
    // every voice keeps: the oldest goes
    s.stopAll(); c.advance(1);
    assert.equal(s.live.size, 0);
    const keeps = Array.from({ length: MAX_VOICES }, () => holdVoice(s, { keep: true }));
    killed = spyKills(s);
    s._room(); s._room();
    assert.deepEqual(killed, [keeps[0], keeps[1]]);
    void bed; void held;
  } finally { done(); }
});

test('L6 trim: master gain = volume × trim; setTrim clamps, NaN gives 1', async () => {
  const restore = installAudioGlobals({ active: true });
  const s = new SoundEngine({ volume: 0.7 });
  try {
    s.setTrim(0.5);   // before unlock: stored, nothing to ramp
    assert.equal(s.trim, 0.5); assert.equal(s._gain(), 0.35);
    s.unlock();
    assert.equal(s.master.gain.value, 0.35, 'unlock starts the master at volume × trim');
    s.setVolume(0.4);
    assert.ok(Math.abs(s.master.gain.last('target').v - 0.2) < 1e-12); assert.equal(s.master.gain.last('target').tau, 0.04);
    s.setTrim(0.25);
    assert.deepEqual([s.master.gain.last('target').v, s.master.gain.last('target').tau], [0.1, 0.08]);
    for (const [k, want] of [[NaN, 1], [undefined, 1], ['x', 1], [2, 1], [-1, 0], [0.3, 0.3], ['0.6', 0.6]]) { s.setTrim(k); assert.equal(s.trim, want, String(k)); }
    s.setTrim(0.5);
    s.setMuted(true);
    assert.equal(s.master.gain.last('target').v, 0, 'muted: 0');
    const n = s.master.gain.events.length;
    s.setTrim(0.8);
    assert.equal(s.master.gain.events.length, n, 'muted: setTrim only stores');
    s.setMuted(false);
    assert.ok(Math.abs(s.master.gain.last('target').v - 0.32) < 1e-12, 'unmute restores volume × trim');
    assert.equal(new SoundEngine()._gain(), 0.7, 'default trim 1: the Phase 2 gain');
  } finally { s.dispose(); restore(); }
});

test('L6 rest: stops and suspends, blocks the resume in _visibility; unlock clears it', async () => {
  const { s, c, restore, done } = await fakeEngine();
  try {
    holdVoice(s);
    s.rest();
    assert.equal(s.resting, true); assert.equal(c.state, 'suspended');
    c.advance(0.2); assert.equal(s.live.size, 0, 'rest stops every voice');
    const resumes = c.calls.resume;
    restore.setHidden(true); restore.setHidden(false);
    assert.equal(c.state, 'suspended', 'still asleep after the page comes back');
    assert.equal(c.calls.resume, resumes);
    assert.ok(!s.ready);
    restore.setActive(false); s.unlock();
    assert.equal(s.resting, true, 'no gesture: still resting');
    restore.setActive(true); s.unlock();
    assert.equal(s.resting, false); assert.equal(c.state, 'running');
    assert.equal(s.ready, true);
    restore.setHidden(true); assert.equal(c.state, 'suspended');
    restore.setHidden(false); assert.equal(c.state, 'running', 'without rest the page resumes as before');
    s.setMuted(true); s.rest(); s.setMuted(false);
    assert.equal(s.resting, false, 'unmuting from a tap unlocks, which clears resting');
  } finally { done(); }
});

test('L6 wake: leaves a rest behind without a gesture; nothing while muted or hidden; a no-op when not resting', async () => {
  const { s, c, restore, done } = await fakeEngine();
  try {
    restore.setActive(false);   // a route change from Back: no gesture
    const r0 = c.calls.resume;
    s.wake();
    assert.equal(c.calls.resume, r0, 'not resting: nothing to do');
    s.rest(); await flush();
    assert.equal(c.state, 'suspended');
    s.wake(); await flush();
    assert.equal(s.resting, false); assert.equal(c.state, 'running'); assert.equal(c.calls.resume, r0 + 1);
    assert.equal(s.ready, true, 'the next screen\'s first touch sounds');
    s.rest(); s.setMuted(true); await flush();
    const r1 = c.calls.resume;
    s.wake();
    assert.equal(s.resting, false); assert.equal(c.calls.resume, r1, 'muted: no resume');
    assert.equal(c.state, 'suspended');
    s.setMuted(false); restore.setActive(true); s.unlock(); await flush();
    s.rest(); restore.setHidden(true); await flush();
    const r2 = c.calls.resume;
    s.wake();
    assert.equal(s.resting, false); assert.equal(c.calls.resume, r2, 'hidden: no resume');
    restore.setHidden(false); await flush();
    assert.equal(c.state, 'running', 'the page coming back resumes, as without rest');
  } finally { done(); }
});

test('L6 debug adds trim, resting and keep', async () => {
  const { s, done } = await fakeEngine();
  try {
    holdVoice(s, { keep: true }); holdVoice(s);
    s.setTrim(0.6);
    assert.deepEqual(s.debug(), { state: 'running', live: 2, muted: false, volume: 0.7, trim: 0.6, resting: false, keep: 1 });
  } finally { done(); }
});

// A stand-in engine that records every call the facade forwards.
function recorder() {
  const calls = [];
  const rec = (name) => (...a) => { calls.push([name, ...a]); };
  const handle = (name) => () => ({ update: rec(name + '.update'), end: rec(name + '.end') });
  return {
    calls, ready: true, muted: false,
    unlock: rec('unlock'), setParts: rec('setParts'), poke: rec('poke'), squish: rec('squish'), release: rec('release'),
    impact: rec('impact'), settle: rec('settle'), stretch: handle('stretch'), brush: handle('brush'),
    voice: (...a) => { calls.push(['voice', ...a]); return true; },
  };
}

test('L6 soundFacade: fx scaling, skip, voice mapping, live setFx / setVoice', () => {
  const eng = recorder(), mat = MATERIALS.jelly;
  const map = (id, kind, i) => (kind === 'coo' || kind === 'hum' ? [kind, i * 0.5] : kind === 'tap' ? ['coo', i * 0.5] : null);
  const f = soundFacade(eng, { fx: 0.5, skip: ['impact'], voice: map });
  assert.equal(Object.getPrototypeOf(f), Object.prototype, 'an explicit object');
  for (const k of ['unlock', 'setParts', 'poke', 'squish', 'release', 'impact', 'settle', 'stretch', 'brush', 'voice', 'setFx', 'setVoice']) assert.equal(typeof f[k], 'function', k);
  f.poke(mat); f.poke(mat, 1, -0.5); f.squish(mat); f.release(mat, 0.8, 0.2); f.impact(mat, 1); f.settle(mat);
  const st = f.stretch(mat); st.update(0.8, 0.4); st.end();
  const br = f.brush(); br.update(0.6); br.end();
  assert.deepEqual(eng.calls, [
    ['poke', mat, 0.3, undefined], ['poke', mat, 0.5, -0.5], ['squish', mat, 0.25, undefined], ['release', mat, 0.4, 0.2],
    ['settle', mat], ['stretch.update', 0.4, 0.4], ['stretch.end'], ['brush.update', 0.3, undefined], ['brush.end'],
  ]);
  eng.calls.length = 0;
  assert.equal(f.voice('noomi', 'giggle', 0.8), null, 'mapped to null: silent');
  assert.equal(f.voice('noomi', 'tap', 0.8), true);
  f.voice('noomi', 'hum');
  assert.deepEqual(eng.calls, [['voice', 'noomi', 'coo', 0.4], ['voice', 'noomi', 'hum', 0.3]]);
  eng.calls.length = 0;
  f.unlock(); f.setParts({ voice: false });
  assert.deepEqual(eng.calls, [['unlock']], 'unlock forwards; setParts is a no-op');
  eng.ready = false; eng.muted = true;
  assert.equal(f.ready, false); assert.equal(f.muted, true);
  // live changes
  assert.equal(f.fx, 0.5);
  f.setFx(0); eng.calls.length = 0;
  f.poke(mat); f.squish(mat); f.release(mat); f.settle(mat);
  const q = f.stretch(mat); q.update(1, 1); q.end(); f.brush().update(1);
  assert.deepEqual(eng.calls, [], 'fx 0: every touch sound silent');
  f.setFx(1); f.setVoice(null);
  f.poke(mat); f.voice('loomi', 'giggle');
  assert.deepEqual(eng.calls, [['poke', mat, 0.6, undefined], ['voice', 'loomi', 'giggle', 0.6]], 'voice null forwards unchanged');
  f.setVoice(() => null); eng.calls.length = 0;
  assert.equal(f.voice('loomi', 'tap'), null); assert.deepEqual(eng.calls, []);
  f.setFx(NaN); assert.equal(f.fx, 0);
  // defaults: everything forwards unscaled
  const g = soundFacade(eng); eng.calls.length = 0;
  g.impact(mat, 0.7); g.voice('boppo', 'tap', 0.9);
  assert.deepEqual(eng.calls, [['impact', mat, 0.7], ['voice', 'boppo', 'tap', 0.9]]);
});

test('L6 quietSound: silent, unlock forwards; a real engine stays at 0 voices', async () => {
  const eng = recorder(), mat = MATERIALS.mochi, q = quietSound(eng);
  q.poke(mat); q.squish(mat, 1); q.release(mat, 1); q.impact(mat, 1); q.settle(mat);
  const st = q.stretch(mat); st.update(1, 1); st.end(); const br = q.brush(); br.update(1); br.end();
  assert.equal(q.voice('boppo', 'giggle', 1), null);
  assert.deepEqual(eng.calls, []);
  q.unlock();
  assert.deepEqual(eng.calls, [['unlock']]);
  assert.equal(q.ready, true); assert.equal(q.muted, false);
  const { s, done } = await fakeEngine();
  try {
    const qs = quietSound(s);
    qs.poke(mat); qs.squish(mat); qs.release(mat); qs.impact(mat); qs.settle(mat); qs.stretch(mat).update(1, 1); qs.brush().update(1);
    for (const k of ['tap', 'giggle', 'coo', 'hum']) qs.voice('pipzi', k, 1);
    assert.equal(s.live.size, 0);
    soundFacade(s, { fx: 0.6 }).poke(mat);
    assert.equal(s.live.size, 1, 'the facade itself does reach the engine');
  } finally { done(); }
});

// ============================================================ L3 ambience ==
const BED = {
  layers: {
    rain: { type: 'bandpass', f: 1800, q: 0.5, peak: 0.05, color: 'pink' },
    wind: { type: 'bandpass', f: 500, peak: 0.04, lfo: 0.1, depth: 0.4 },
    rumble: { type: 'lowpass', f: 140, peak: 0.045 },
  },
  pad: { root: 196 },
};

test('L3 noiseBuffer: mono, cached per context by colour and length', () => {
  const a = new FakeAudioContext(), b = new FakeAudioContext();
  const br = noiseBuffer(a, 0.5, 'brown');
  assert.equal(br.numberOfChannels, 1); assert.equal(br.length, 24000);
  assert.equal(noiseBuffer(a, 0.5, 'brown'), br, 'same key, same buffer');
  assert.equal(noiseBuffer(a, 0.5), br, 'brown is the default');
  assert.notEqual(noiseBuffer(a, 0.5, 'pink'), br); assert.notEqual(noiseBuffer(a, 1, 'brown'), br);
  assert.notEqual(noiseBuffer(b, 0.5, 'brown'), br, 'per AudioContext');
  assert.equal(noiseBuffer(a), noiseBuffer(a, 4, 'brown'));
  const peak = (buf) => buf.getChannelData(0).reduce((m, x) => Math.max(m, Math.abs(x)), 0);
  for (const c of ['white', 'pink', 'brown']) {
    const buf = noiseBuffer(a, 0.25, c), d = buf.getChannelData(0);
    assert.ok(peak(buf) <= 0.9 + 1e-6 && peak(buf) > 0.5, `${c} peak ${peak(buf)}`);
    if (c !== 'white') assert.ok(Math.abs(d[d.length - 1] - d[0]) < 1e-6, `${c} loops without a step`);
  }
  // brown is darker than pink, pink darker than white (mean |Δ| between samples)
  const rough = (c) => { const d = noiseBuffer(a, 0.25, c).getChannelData(0); let s = 0; for (let i = 1; i < d.length; i++) s += Math.abs(d[i] - d[i - 1]); return s / d.length; };
  assert.ok(rough('brown') < rough('pink') && rough('pink') < rough('white'));
});

// An unlocked engine on the fake, a bed, and a clock for tick().
async function bedRig(opts = {}, engineOpts) {
  const r = await fakeEngine(engineOpts);
  let now = 0;
  const bed = new AmbientBed(r.s, { ...BED, ...opts });
  r.bed = bed;
  r.tick = async (ms = 150) => { now += ms; bed.tick(now); await flush(); };
  r.ready = async () => { bed.want(true); await r.tick(); await r.tick(); };   // the first tick may only make the noise buffers
  return r;
}
const bedVoice = (s) => [...s.live].find((v) => v.keep);

test('L3 AmbientBed: nothing before ready; builds once wanted and ready, through _room and a keep voice', async () => {
  const restore = installAudioGlobals({ active: false });
  const s = new SoundEngine();
  try {
    const bed = new AmbientBed(s, BED);
    bed.want(true); bed.tick(0);
    assert.equal(bed.alive, false); assert.equal(s.ctx, null, 'no context, no build');
    restore.setActive(true); s.unlock(); await flush();
    const c = s.ctx;
    bed.want(false); bed.tick(1000);
    assert.equal(bed.alive, false, 'ready but not wanted: nothing');
    bed.want(true); bed.tick(1050);
    assert.equal(bed.alive, false, 'throttled: work at most every 100 ms');
    let rooms = 0; const room = s._room.bind(s); s._room = () => { rooms++; room(); };
    bed.tick(1100);
    assert.equal(bed.alive, false, 'the first eligible tick only queues the noise buffers');
    await flush();
    bed.set({ rain: 0.5, wind: 0.25, pad: 1 }); bed.setFreq('wind', 650);
    bed.tick(1200);
    assert.ok(bed.alive); assert.equal(bed.builds, 1); assert.equal(rooms, 1, '_room() first');
    const v = bedVoice(s);
    assert.ok(v && s.live.size === 1, 'one keep voice');
    assert.equal(v.dur, 600);
    assert.ok(reaches(v.out, c.destination));
    assert.deepEqual(v.out.gain.events.map((e) => [e.type, e.v]), [['set', 0], ['linear', 1]], 'fades in 0 → 1');
    assert.ok(Math.abs(v.out.gain.last('linear').t - (v.t + 1)) < 1e-9, 'over fadeIn');
    // layers: looping noise → filter → level gain (→ AM) → out
    const srcs = v.srcs.filter((n) => n.kind === 'bufferSource');
    assert.equal(srcs.length, 3);
    assert.ok(srcs.every((n) => n.loop && n.startAt === v.t && n.startOffset >= 0 && n.startOffset < n.buffer.duration));
    assert.equal(srcs[0].buffer, noiseBuffer(c, 4, 'pink')); assert.equal(srcs[1].buffer, noiseBuffer(c, 4, 'brown'));
    const [rainF] = srcs[0].outputs, [rainG] = rainF.outputs;
    assert.deepEqual([rainF.type, rainF.frequency.value, rainF.Q.value], ['bandpass', 1800, 0.5]);
    assert.ok(Math.abs(rainG.gain.value - 0.5 * 0.05) < 1e-12, 'gain starts at level × peak');
    assert.deepEqual([...rainG.outputs], [v.out], 'no LFO: no AM stage');
    const [windF] = srcs[1].outputs, [windG] = windF.outputs, [am] = windG.outputs;
    assert.equal(windF.frequency.value, 650, 'a setFreq before the build is the starting centre');
    assert.equal(windF.Q.value, 0.7, 'q defaults to 0.7');
    assert.ok(Math.abs(am.gain.value - 0.8) < 1e-12, 'AM gain 1 − depth/2');
    const lfo = [...am.gain.inputs][0], lfoOsc = [...lfo.inputs][0];
    assert.ok(Math.abs(lfo.gain.value - 0.2) < 1e-12); assert.equal(lfoOsc.frequency.value, 0.1); assert.equal(lfoOsc.type, 'sine');
    assert.deepEqual([...am.outputs], [v.out]);
    assert.equal(srcs[2].outputs.values().next().value.outputs.values().next().value.gain.value, 0, 'an unset level is 0');
    // pad: SoundEngine.pad's recipe
    const oscs = v.srcs.filter((n) => n.kind === 'oscillator' && n !== lfoOsc);
    const tones = oscs.filter((o) => [...o.outputs][0].outputs.size && ![...o.outputs][0].outputs.values().next().value.name);
    assert.deepEqual(tones.map((o) => [o.type, +o.frequency.value.toFixed(4), [...o.outputs][0].gain.value]),
      [['sine', 49, 0.5], ['sine', +(49 * Math.pow(2, 7 / 12)).toFixed(4), 0.5], ['triangle', +(98 * 1.003).toFixed(4), 0.25]]);
    const padG = [...[...tones[0].outputs][0].outputs][0], padF = [...padG.outputs][0];
    assert.ok(Math.abs(padG.gain.value - 0.035) < 1e-12, 'pad level 1 × peak 0.035');
    assert.deepEqual([padF.type, padF.frequency.value, padF.Q.value], ['lowpass', 700, 0.4]);
    const padLfo = [...padF.frequency.inputs][0];
    assert.equal(padLfo.gain.value, 180); assert.equal([...padLfo.inputs][0].frequency.value, 0.07);
    assert.deepEqual([...padF.outputs], [v.out]);
    assert.ok(v.srcs.every((n) => n.startAt === v.t && n.stopAt === null), 'everything runs until the bed ends');
    assert.deepEqual(bed.debug(), { alive: true, wanted: true, builds: 1, levels: { rain: 0.5, wind: 0.25, rumble: 0, pad: 1 } });
    bed.destroy();
  } finally { s.dispose(); restore(); }
});

test('L3 respectFx: Touch sounds off blocks the bed (and fades a live one); respectFx false ignores it', async () => {
  const r = await bedRig();
  try {
    r.s.setParts({ fx: false });
    await r.ready();
    assert.equal(r.bed.alive, false);
    r.s.setParts({ fx: true }); await r.tick(); await r.tick();   // the noise buffers first, then the build
    assert.equal(r.bed.alive, true);
    const v = bedVoice(r.s), t = r.c.currentTime;
    r.s.setParts({ fx: false }); await r.tick();
    assert.equal(r.bed.alive, false, 'switched off while playing: dropped');
    assert.deepEqual([v.out.gain.last('target').v, v.out.gain.last('target').tau], [0, 0.5], '1.5 s fade (τ = 0.5)');
    assert.ok(v.srcs.every((n) => Math.abs(n.stopAt - (t + 1.6)) < 1e-9), 'sources stop at t + fade + 0.1');
    const n = new AmbientBed(r.s, { ...BED, respectFx: false });
    n.want(true); n.tick(1e6);
    assert.equal(n.alive, true, 'respectFx false: plays with Touch sounds off');
    n.destroy();
  } finally { r.bed.destroy(); r.done(); }
});

test('L3 stopAll (mute, hidden, cap) → not alive → rebuilt with a fresh fade-in on the next tick', async () => {
  const r = await bedRig();
  try {
    await r.ready();
    const v1 = bedVoice(r.s);
    r.s.stopAll();
    assert.equal(r.bed.alive, false, 'stopAll marks it not alive');
    r.c.advance(0.101); assert.ok(!r.s.live.has(v1), 'its sources stop within 0.1 s, like any killed voice (mute suspends 120 ms later)');
    await r.tick();
    const v2 = bedVoice(r.s);
    assert.ok(r.bed.alive && v2 !== v1); assert.equal(r.bed.builds, 2);
    assert.deepEqual(v2.out.gain.events.map((e) => e.type), ['set', 'linear']);
    r.s.setMuted(true);
    assert.equal(r.bed.alive, false, 'mute kills it');
    await r.tick(); await r.tick();
    assert.equal(r.bed.alive, false, 'no build while muted');
    r.s.setMuted(false); await r.tick();
    assert.equal(r.bed.alive, true, 'unmute brings it back'); assert.equal(r.bed.builds, 3);
    r.restore.setHidden(true);
    assert.equal(r.bed.alive, false, 'a hidden page kills it');
    await r.tick(); assert.equal(r.bed.alive, false);
    r.restore.setHidden(false); await r.tick();
    assert.equal(r.bed.alive, true); assert.equal(r.bed.builds, 4);
    // the cap evicts one-shots before the bed
    for (let i = 0; i < MAX_VOICES - 1; i++) holdVoice(r.s);
    const bed = bedVoice(r.s), killed = spyKills(r.s);
    r.s.chime('boppo', 1, 0.5);
    assert.equal(killed.length, 1); assert.notEqual(killed[0], bed); assert.equal(r.bed.alive, true);
    // an older voice still fading out is only cut short; it never drops the live bed
    r.s.stopAll(); r.c.advance(1); await r.tick();
    const live = bedVoice(r.s);
    r.bed.want(false); await r.tick();
    r.bed.want(true); await r.tick();
    const fresh = [...r.s.live].filter((v) => v.keep).pop();
    assert.notEqual(fresh, live);
    live.kill();
    assert.equal(r.bed.alive, true, "the old voice's kill leaves the new bed alone");
    assert.ok(live.srcs.every((n) => n.stopAt <= r.c.currentTime + 0.1 + 1e-9), 'the old fade is shortened');
  } finally { r.bed.destroy(); r.done(); }
});

test('L3 want(false) and end() release every source and the voice', async () => {
  const r = await bedRig();
  try {
    await r.ready();
    const v = bedVoice(r.s), n = v.srcs.length;
    assert.equal(n, 3 + 1 + 3 + 1, 'three noise layers, one AM LFO, three pad tones, the pad LFO');
    r.bed.want(false); await r.tick();
    assert.equal(r.bed.alive, false); assert.equal(r.bed.wanted, false);
    assert.ok(v.srcs.every((s) => s.stopAt !== null));
    r.c.advance(2);
    assert.ok(v.srcs.every((s) => s.ended), 'every source ended');
    assert.equal(r.s.live.size, 0, 'the voice left `live`');
    assert.ok(v.nodes.every((x) => x.outputs.size === 0), 'and disconnected');
    await r.tick(); assert.equal(r.bed.alive, false, 'not rebuilt while unwanted');
    r.bed.want(true); await r.tick();
    const w = bedVoice(r.s), t = r.c.currentTime;
    r.bed.end(0.4);
    assert.equal(r.bed.alive, false); assert.equal(r.bed.wanted, false);
    assert.ok(w.srcs.every((s) => Math.abs(s.stopAt - (t + 0.5)) < 1e-9), 'end(0.4) stops at t + 0.5');
    r.c.advance(1); assert.equal(r.s.live.size, 0);
    r.bed.destroy();   // idempotent
  } finally { r.done(); }
});

test('L3 set, setFreq and ramp schedule the right parameter events', async () => {
  const r = await bedRig({ tau: 0.6 });
  try {
    await r.ready();
    const v = bedVoice(r.s);
    const srcs = v.srcs.filter((n) => n.kind === 'bufferSource');
    const filt = (i) => [...srcs[i].outputs][0], gain = (i) => [...filt(i).outputs][0];
    const padF = [...v.nodes].find((n) => n.kind === 'biquad' && n.type === 'lowpass' && n.Q.value === 0.4);
    const padG = [...padF.inputs][0];
    const levels = r.bed.levels;
    r.bed.set({ rain: 0.6, pad: 0.5, junk: 1, rumble: NaN, wind: 3 });
    assert.equal(r.bed.levels, levels, 'the same live targets object');
    assert.deepEqual(levels, { rain: 0.6, wind: 1, rumble: 0, pad: 0.5 }, 'unknown names and NaN ignored; clamped to 0..1');
    r.bed.setFreq('wind', 900); r.bed.setFreq('pad', 400); r.bed.setFreq('junk', 100); r.bed.setFreq('rain', -5);
    await r.tick();
    const t = r.c.currentTime;
    const ev = (p) => { const e = p.last('target'); return e && [+e.v.toFixed(6), e.t, e.tau]; };
    assert.deepEqual(ev(gain(0).gain), [+(0.6 * 0.05).toFixed(6), t, 0.6]);
    assert.deepEqual(ev(gain(1).gain), [0.04, t, 0.6]);
    assert.deepEqual(ev(padG.gain), [+(0.5 * 0.035).toFixed(6), t, 0.6]);
    assert.deepEqual(ev(filt(1).frequency), [900, t, 0.6]);
    assert.deepEqual(ev(padF.frequency), [400, t, 0.6]);
    assert.equal(filt(0).frequency.events.length, 0, 'a bad frequency is ignored');
    assert.equal(gain(2).gain.events.length, 0, 'an unchanged layer gets nothing');
    const count = () => [gain(0), gain(1), gain(2), padG].reduce((n, g) => n + g.gain.events.length, 0);
    const before = count();
    r.bed.set({ rain: 0.6005 }); await r.tick();
    assert.equal(count(), before, 'no event for a change ≤ 1e-3');
    // ramp: one linear ramp from where it is now; tick leaves the layer alone until it ends
    r.c.advance(0.5);
    const t0 = r.c.currentTime;
    r.bed.ramp('rumble', 0.8, 2);
    const rg = gain(2).gain;
    assert.deepEqual(rg.events.map((e) => e.type), ['hold', 'linear']);
    assert.equal(rg.last('hold').t, t0);
    assert.deepEqual([+rg.last('linear').v.toFixed(6), rg.last('linear').t], [+(0.8 * 0.045).toFixed(6), t0 + 2]);
    assert.equal(levels.rumble, 0.8, 'the ramp end becomes the target');
    r.bed.set({ rumble: 0.2 }); await r.tick();
    assert.equal(rg.events.length, 2, 'no setTarget while the ramp runs');
    r.c.advance(2); await r.tick();
    assert.deepEqual(ev(rg), [+(0.2 * 0.045).toFixed(6), r.c.currentTime, 0.6], 'after it ends, tick eases to the target again');
    r.bed.ramp('nope', 1, 1); r.bed.ramp('pad', 0, 1.5);
    assert.equal(padG.gain.last('linear').v, 0, 'the pad ramps too');
    // a ramp before the build only sets the starting level
    const b2 = new AmbientBed(r.s, BED);
    b2.ramp('rain', 0.4, 3);
    assert.equal(b2.levels.rain, 0.4); assert.equal(b2.alive, false);
    b2.destroy();
  } finally { r.bed.destroy(); r.done(); }
});

test('L6/L3 stay offline and touch no Web Audio or DOM at import', async () => {
  assert.deepEqual(scanFiles(['../core/sound-engine.js', '../core/ambience.js'].map(here)), []);
  const before = FakeAudioContext.instances.length;
  await import('../core/ambience.js?fresh');
  assert.equal(FakeAudioContext.instances.length, before);
  assert.equal(typeof globalThis.AudioContext, 'undefined', 'no AudioContext global was needed');
});

// ======================================= L4 soft-mallow.js (pure parts) ==
// The browser checks (bodyRect vs geo, nudge, frame cap, grade) are in e2e-phase3.cjs.
// A SoftMallow without a DOM: the prototype plus the fields each method reads.
const bareRig = (o = {}) => Object.assign(Object.create(SoftMallow.prototype), {
  frameCap: null, _acc: 0, renders: 0, speed: 1, _tickEv: { dt: 0 }, _noRender: false, events: [],
  _emit(type, e) { this.events.push([type, e.dt, e]); },
}, o);
// Swap one MallowRig method (what `super.x()` reaches) for the length of fn.
function withSuper(name, impl, fn) {
  const orig = MallowRig.prototype[name];
  MallowRig.prototype[name] = impl;
  try { return fn(); } finally { MallowRig.prototype[name] = orig; }
}

test('L4 _tick: uncapped is one step a tick plus a reused tick event; a cap gathers time into ≤ 50 ms substeps, rendering the last', () => {
  const steps = [];
  withSuper('_tick', function (dt, now) { steps.push([+dt.toFixed(6), now, this._noRender]); }, () => {
    const r = bareRig();
    r._tick(0.016, 1); r._tick(0.05, 2);
    assert.deepEqual(steps, [[0.016, 1, false], [0.05, 2, false]], 'as today: one physics step per frame');
    assert.deepEqual(r.events.map((e) => [e[0], e[1]]), [['tick', 0.016], ['tick', 0.05]]);
    assert.equal(r.events[0][2], r.events[1][2], 'one reused event object');
    steps.length = 0; r.events.length = 0;
    r.speed = 0.5; r._tick(0.04, 3);
    assert.deepEqual(steps, [[0.02, 3, false]], 'speed scales the physics step');
    assert.equal(r.events[0][1], 0.04, 'the event carries the raw dt');
    steps.length = 0; r.events.length = 0; r.speed = 1;
    r.setFrameCap(10);
    for (let i = 0; i < 5; i++) r._tick(0.016, 4);
    assert.equal(steps.length + r.events.length, 0, 'held below 1/10 s − 4 ms');
    r._tick(0.03, 5);                                   // 0.11 s gathered
    assert.equal(r.events.length, 1); assert.ok(Math.abs(r.events[0][1] - 0.11) < 1e-9);
    assert.deepEqual(steps.map((x) => x[2]), [true, true, false], 'ceil(0.11 / 0.05) = 3 substeps; only the last renders');
    assert.ok(steps.every((x) => Math.abs(x[0] - 0.11 / 3) < 1e-6));
    assert.equal(r._noRender, false); assert.equal(r._acc, 0);
    steps.length = 0; r.setFrameCap(0); r._tick(0.5, 6); r._tick(0.5, 7);
    assert.equal(steps.length, 0, 'paused'); assert.equal(r._acc, 0, 'nothing gathered while paused');
    r.setFrameCap(null); r._tick(0.016, 8);
    assert.deepEqual(steps, [[0.016, 8, false]]);
  });
});

test('L4 setFrameCap values and _render counting', () => {
  const r = bareRig();
  for (const v of [null, undefined, NaN, Infinity, 'x']) { r.setFrameCap(v); assert.equal(r.frameCap, null, String(v)); }
  r.setFrameCap(-3); assert.equal(r.frameCap, 0);
  r.setFrameCap('12'); assert.equal(r.frameCap, 12);
  let sup = 0;
  withSuper('_render', () => { sup++; }, () => {
    const q = bareRig({ soft: null, renderer: null });
    q._noRender = true; q._render();
    assert.equal(q.renders + sup, 0, 'an earlier substep draws nothing and is not counted');
    q._noRender = false; q._render();
    assert.equal(q.renders, 1); assert.equal(sup, 1, 'no mesh yet: the standard rig draws');
  });
});

test('L4 nudge: react() units scaled by motion; a quarter and no hop with reduced motion', () => {
  const mk = (o) => bareRig({ body: { leanV: 0, squashV: 0, shearV: 0, tiltV: 0, hopV: 0, grounded: true, squash: 0 }, opts: { reducedMotion: false }, motionScale: 1, unsettled: 0, _unsettle() { this.unsettled++; }, ...o });
  const r = mk();
  assert.equal(r.nudge({ lean: 1, squash: 0.5, shear: -0.5, tilt: 0.01 }), r);
  assert.deepEqual([r.body.leanV, r.body.squashV, r.body.shearV, +r.body.tiltV.toFixed(9)], [4, 3, -2.5, 0.6]);
  assert.equal(r.unsettled, 1);
  r.nudge({ hop: 0.5 });
  assert.equal(r.body.grounded, false);
  assert.ok(Math.abs(r.body.hopV - Math.sqrt(2 * 9.8 * 0.5 * 0.14)) < 1e-12); assert.ok(Math.abs(r.body.squash - 0.06) < 1e-12);
  const v = r.body.hopV; r.nudge({ hop: 1 });
  assert.equal(r.body.hopV, v, 'no second hop in the air');
  const q = mk({ opts: { reducedMotion: true }, motionScale: 0.6 });
  q.nudge({ lean: 1, hop: 1 });
  assert.ok(Math.abs(q.body.leanV - 4 * 0.6 * 0.25) < 1e-12);
  assert.equal(q.body.grounded, true); assert.equal(q.body.hopV, 0);
  assert.equal(mk().nudge().body.leanV, 0, 'no arguments: nothing moves');
});

test('L4 bodyRect: Pocket Hush api.body() maths, written into the object given', () => {
  const r = bareRig({ S: 1, _S: 2, soft: { W: 100, H: 80 }, mallow: { bodyBox: [10, 20, 60, 70] }, BASE: 300, _lift: 10, CX: 150, W: 400, H: 800 });
  const o = {};
  assert.equal(r.bodyRect(o), o);
  assert.deepEqual(o, { cx: 150, top: 130, bottom: 290, mid: 210, w: 200, h: 160, W: 400, H: 800 });
  r.soft = null; r._S = 0; r._lift = 0;
  assert.deepEqual(r.bodyRect(), { cx: 150, top: 250, bottom: 300, mid: 275, w: 50, h: 50, W: 400, H: 800 }, 'no soft body: the art box at S');
});

test('L4 setGrade: clamped in place; the WebGL renderer gets it, otherwise a CSS brightness filter', () => {
  const got = [];
  const gl = { mode: 'webgl', setGrade(g) { got.push([...g]); } };
  const r = bareRig({ grade: [1, 1, 1], _gradeMean: 1, canvas: { style: { filter: '' } }, renderer: gl });
  const g = r.grade;
  r.setGrade([0.5, 2, -1]);
  assert.equal(r.grade, g, 'the same array'); assert.deepEqual(g, [0.5, 1, 0]);
  assert.deepEqual(got, [[0.5, 1, 0]]); assert.equal(r.canvas.style.filter, '');
  r.renderer = { mode: '2d' };
  r.setGrade([0.5, 0.5, 0.5]); assert.equal(r.canvas.style.filter, 'brightness(0.500)');
  r.setGrade([NaN, 1, 1]); assert.deepEqual(g, [1, 1, 1]); assert.equal(r.canvas.style.filter, '', 'identity clears it');
  r.renderer = null; r.setGrade([0.4, 0.4, 0.4]); assert.equal(r.canvas.style.filter, 'brightness(0.400)', 'the strip fallback too');
  r.renderer = gl; r.setGrade([0.4, 0.4, 0.4]); assert.equal(r.canvas.style.filter, '', 'WebGL: never graded twice');
});

test('L4 peek and overlay: DEFAULT_PEEK (today\'s look) unless peekParams; one overlay per kind', () => {
  assert.ok(Object.isFrozen(DEFAULT_PEEK));
  assert.deepEqual(DEFAULT_PEEK, { eyeOpen: 0.72, lidTop: 0.18, closedCurve: 0.2, browTilt: -0.25, mouthSmile: 1 });
  const r = bareRig({ ready: true, time: 3, overlays: [], peekParams: null, mallow: { face: { eyeStyle: 'closed' } }, looked: [], lookAtScreen(x, y) { this.looked.push([x, y]); } });
  r.peek(10, 20);
  assert.deepEqual(r.overlays, [{ start: 3, dur: 1.1, params: DEFAULT_PEEK, kind: 'peek' }]);
  const sleepy = { eyeOpen: 0.3 };
  r.peekParams = sleepy; r.time = 4; r.peek(null, null, 2);
  assert.deepEqual(r.overlays, [{ start: 4, dur: 2, params: sleepy, kind: 'peek' }], 'replaced, with the experience\'s look');
  r.overlay('blink', { eyeOpen: 0 }, 0.5);
  assert.equal(r.overlays.length, 2);
  r.mallow.face.eyeStyle = 'open'; r.peek(1, 1);
  assert.equal(r.overlays.length, 2, 'open-eyed Mallows only look');
  assert.deepEqual(r.looked, [[10, 20], [1, 1]]);
  r.ready = false;
  assert.equal(r.overlay('x', {}, 1), r); assert.equal(r.overlays.length, 2, 'nothing before ready');
});

// ===================================================== L5 mesh-renderer.js ==
test('L5 mesh grade: the shader multiplies by uGrade, set on every draw; identity by default', () => {
  const src = readFileSync(here('../core/mesh-renderer.js'), 'utf8');
  assert.match(src, /uniform vec3 uGrade;/);
  assert.match(src, /gl_FragColor = vec4\(min\(rgb, vec3\(c\.a\)\) \* uGrade, c\.a\);/);
  assert.match(src, /uGrade: gl\.getUniformLocation\(prog, 'uGrade'\)/);
  assert.match(src, /this\.grade = \[1, 1, 1\]/);
  const calls = [];
  const gl = new Proxy({}, { get: (t, k) => (k === 'isContextLost' ? () => false : /^[A-Z0-9_]+$/.test(k) ? k : (...a) => calls.push([k, ...a])) });
  const m = Object.assign(Object.create(MeshRenderer.prototype), { gl, mode: 'webgl', loc: { uGrade: 'G' }, canvas: { width: 10, height: 10 }, w: 10, h: 10, nTri: 3, grade: [1, 1, 1], _uploaded: true });
  m._drawGL(null, false, new Float32Array(6), new Float32Array(3));
  const u = () => calls.filter((c) => c[0] === 'uniform3f' && c[1] === 'G').map((c) => c.slice(2));
  assert.deepEqual(u(), [[1, 1, 1]], 'identity, and set even when never changed');
  assert.ok(calls.findIndex((c) => c[0] === 'uniform3f') < calls.findIndex((c) => c[0] === 'drawElements'));
  const g = [0.2, 0.3, 0.4];
  m.setGrade(g); assert.equal(m.grade, g);
  calls.length = 0; m._drawGL(null, false, new Float32Array(6), new Float32Array(3));
  assert.deepEqual(u(), [[0.2, 0.3, 0.4]]);
});

// ======================================================= L10 companion.js ==
test('L10 Companion.handle: the Companion handles first, then onGesture(type, d, companion)', () => {
  const seen = [];
  const c = Object.assign(Object.create(Companion.prototype), {
    o: { onGesture: (t, d, cc) => seen.push(['hook', t, d, cc === c]) },
    _handle: (t, d) => seen.push(['own', t, d]),
  });
  c.handle('tap', { x: 1 });
  c.handle('double');
  assert.deepEqual(seen, [['own', 'tap', { x: 1 }], ['hook', 'tap', { x: 1 }, true], ['own', 'double', {}], ['hook', 'double', {}, true]]);
  c.o = {}; c.handle('tap');
  assert.equal(seen.length, 5, 'no hook: the Companion alone');
});

// ================================================ visual QA: rig particles ==
test('soft particles: the lab draws puffs, dust and (but Zuzu\'s) rings itself; the field draws the rest', () => {
  for (const kind of ['puff', 'dust', 'ring']) assert.equal(softKind({ kind }, 'boppo'), true, kind);
  assert.equal(softKind({ kind: 'ring' }, 'zuzu'), false, 'Zuzu\'s rings circle its middle, as authored');
  for (const kind of ['spark', 'star', 'heart', 'drop', 'steam', 'z', 'cloud', 'nl-puff']) assert.equal(softKind({ kind }, 'boppo'), false, kind);
});

test('soft particles: progress (with a delay), the field\'s fade and the wisp\'s fade', () => {
  assert.equal(particleT({ age: 0.1, life: 1, delay: 0.2 }), -1, 'still waiting');
  assert.ok(Math.abs(particleT({ age: 0.6, life: 1.2, delay: 0.2 }) - 0.4) < 1e-12);
  const near = (a, b) => Math.abs(a - b) < 1e-9;
  assert.ok(near(fieldFade(-1), 0) && near(fieldFade(0.075), 0.5) && near(fieldFade(0.4), 1) && near(fieldFade(1), 0));
  assert.equal(wispFade(0), 0); assert.equal(wispFade(0.2), 1); assert.equal(wispFade(1), 0);
  assert.ok(wispFade(0.1) > 0 && wispFade(0.1) < 1 && wispFade(0.6) < wispFade(0.3), 'a quick rise, then a long fade');
  assert.ok(SOFT_FX.puff.peak <= 0.35 && SOFT_FX.dust.peak <= 0.35, 'fainter than the field\'s discs (white at 0.7 and 0.35)');
});

test('soft particles: a puff leaves the mouth up and away, in a small fan, gone within 0.9 s', () => {
  const vals = [0, 0.5, 1];
  for (const r of vals) {
    const p = liftPuff({ kind: 'puff', vx: 5, vy: -20, drag: 0.8, life: 1.5 }, 200, { rand: () => r });
    assert.ok(p.vy < -150, `rises fast (${p.vy})`);
    assert.ok(Math.abs(p.vx) <= Math.abs(p.vy) * Math.tan(SOFT_FX.puff.fan) + 1e-9, 'within the fan');
    assert.ok(p.life >= 0.7 && p.life <= 0.9 && p.labLifted === true);
  }
  const slow = liftPuff({ kind: 'puff' }, 200, { reduced: true, rand: () => 0.5 });
  const fast = liftPuff({ kind: 'puff' }, 200, { rand: () => 0.5 });
  assert.ok(Math.abs(slow.vy - fast.vy / 2) < 1e-9, 'half as fast with less motion');
});
