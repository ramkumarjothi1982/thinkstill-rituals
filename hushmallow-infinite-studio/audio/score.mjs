// Hushmallow score generaliser (WP-04): cue log + direction → score plan → score.wav.
//
//   node audio/score.mjs <cues.json | job dir> <out.wav> [options]      (see USAGE below)
//
// The plan says WHAT plays WHEN; audio/render-offline.mjs (a fork of the frozen
// audio/soundtrack.mjs renderer and mastering) decides HOW it sounds. Three
// layers of sound, all through the app's own engine and the studio's synthesis:
//
//   1. the realm bed: the engine's REALM_BEDS ambience for the realm preset's bed,
//      mood automated by the world-dial curves (layers/bed.mjs);
//   2. the Mallow's kit: engine gestures through buildMallow(kit) (R8: v2 always
//      used Noomi's), tonal notes written in the reference key and transposed by
//      scale degree to the kit (audio/pitch.mjs);
//   3. cue recipes owned by the moves (audio/recipes): every cue in the direction
//      names its recipe in the move that emitted it; layers derived from cues
//      (tick, crickets, swirl, hum, pad, breath, sparkles: audio/layers).
//
// The report lists every tonal event (the studio's pitched notes and the engine
// motif sounds modelled from the kit's voice, library/sound/soundmap.json), and
// arrangeClose keeps MO-CLOSE rising for kits whose own closing phrase would
// leave the last tonal events falling (G-AUDIO; never for Noomi, never in compat).
// MO-CLOSE is heard on a phone: its eyes-open pair sits in the phone band
// (pitch.figure) and phoneClose doubles a closing phrase that lies below it.
//
// After the plan, the render loop (audio/score-cli.mjs) hears where every graded
// cue's hit lands and hands back hit-sync moves (opts.sync, audio/hits.mjs), and
// splices the circular mix where it is flat (audio/splice.mjs).
//
// Modes
//   --compat v2-score  reproduces the frozen buildPlanV2's event list exactly
//                      (checked against the live buildPlanV2 on every run), so the
//                      render is byte-identical to the approved soundtrack.
//   default            v2 plus the documented fixes, each a named flag (FIXES) so
//                      each can be heard on its own (docs/m0/audio):
//                      r10, r11, swirl, r7. --fixes picks a subset.
//
// Determinism: the plan is a pure function of (cue log, direction, spec sound
// slots, library); all randomness is one seeded stream (the spec's panSeed,
// v2's seed by default) drawn in v2's order.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mulberry32 } from './soundtrack.mjs';
import { transposer, PHONE_HZ } from './pitch.mjs';
import { RECIPES, recipeOf } from './recipes/index.mjs';
import { lintRecipe, lintEvents } from './lint-recipes.mjs';
import { contourRules, synthTonal, leadOf, CONTOUR } from './check.mjs';
import { contourOf, CHIME_BASE, DEFAULT_CONTOUR } from './recipes/contours.mjs';
import { clamp, curveSampler, r4, smoothstep, wrap } from './layers/util.mjs';
import { sparkles } from './layers/sparkles.mjs';
import { breath, v2ScoreEnvelope } from './layers/breath.mjs';
import { tick, V2_BUSY } from './layers/tick.mjs';
import { crickets, V2_CRICKETS } from './layers/crickets.mjs';
import { swirl, orbitItems } from './layers/swirl.mjs';
import { hum } from './layers/hum.mjs';
import { pad } from './layers/pad.mjs';
import { bed } from './layers/bed.mjs';
import { MOVES } from '../composer/moves/index.js';
import { breathEnvelope } from '../composer/acting.js';
import { PAN } from '../composer/audio.js';
import { studioPath } from '../render/lib/paths.mjs';

export const SR = 48000;
export const PRE = 1.0;            // pre-roll (s): rendered, then discarded
export const LAT = 0.012;          // engine master-chain look-ahead (2 compressors × 6 ms)
export const ENGINE_URL = '/hushmallow/src/engine/audio.js';
export const V2_SEED = 20261013;   // v2's plan seed (audio/soundtrack.mjs SEED); the default panSeed
export const TAIL = 4.0;           // circular render: seconds rendered past D and wrapped onto the start
export const BED_XFADE = 1.0;      // circular render: the bed's continuation crossfades with its start over this
export const SCORE_PAN_NORM = PAN.cueNorm;   // R11: the one pan constant (world px per unit pan), as the cue pans
export const CLOSE_STEP = 0.11;    // MO-CLOSE resolution: the second bell follows the first by this (Noomi's accent spacing)
export const CLOSE_DAMP = 0.03;    // MO-CLOSE: a falling kit accent is damped over this, ending as the accent would start
/**
 * A cue's hit window: the cue types whose sound is a transient hit and the span around
 * the cue in which that hit is heard (and graded: qa/gates/audio.py LOUD | QUIET and
 * thresholds.json sync.searchMs; tests/unit/audio-score.test.mjs holds them equal).
 * MO-CLOSE's resolution keeps out of every hit window but its own cue's.
 */
export const HIT = Object.freeze({
  cues: Object.freeze(['take', 'land', 'thought', 'release', 'eyes_open', 'logo', 'pop', 'impact', 'chime', 'blink', 'wince', 'lift_off']),
  before: 0.06, after: 0.12,
});
export const SYNC_MAX = 0.3;       // hit sync: a kit gesture is never advanced by more than this (a longer lead-in is another phrase)

/** v2's motif list for T01 (templates/story-library.json T01 sound.motifs), used when no spec is given. */
export const V2_MOTIFS = Object.freeze(['MO-GLASS-RISE', 'MO-ORBIT', 'MO-TICK', 'MO-HUM', 'MO-WARMPAD', 'MO-CLOSE']);

/**
 * The documented fixes over v2, in the order they land (each its own commit and
 * before/after WAV). Every one is off in --compat v2-score.
 */
export const FIXES = Object.freeze({
  r10: 'R10: no fallback times and no absolute times (missing cues are errors; the swirl timeline and the bed dip follow the first thought); every cue has a recipe from its move and every recipe its cue; the clock keeps clear of the recipes flagged transient',
  r11: 'R11: the sleeping breath uses the picture\'s own envelope (composer breathEnvelope: breath audible 11.8-13.3 s) and breath period; one pan constant (whoosh pans from world x / 400, as the cue pans)',
  swirl: 'swirl at spin_up: the orbit whooshes start at the spin_up cue, ramping in over 0.5 s (v2: from a hard-coded 2.9 s)',
  r7: 'R7: circular render: no synthetic pre-roll, no fade dip; rendered past D and the tail wrap-added onto the start, the bed crossfading into itself, a circular limiter',
});
export const FIX_ORDER = Object.freeze(Object.keys(FIXES));

// ------------------------------------------------------------------ library --

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
let soundmapCache = null;
/** library/sound/soundmap.json (cached). */
export function soundmap() {
  if (!soundmapCache) soundmapCache = readJson(studioPath('library', 'sound', 'soundmap.json'));
  return soundmapCache;
}

/** Kit, transposition register and recipe overrides for a Mallow. */
export function mallowSound(id, sm = soundmap()) {
  const m = sm.mallows[id];
  if (!m) throw new Error(`score: no sound entry for Mallow '${id}' in library/sound/soundmap.json (have: ${Object.keys(sm.mallows).join(', ')})`);
  const kit = sm.kits[m.kit];
  if (!kit) throw new Error(`score: Mallow '${id}' names kit '${m.kit}', which soundmap.json does not define`);
  const pack = m.pack ? readJson(studioPath(m.pack)) : {};
  if (pack.kit && pack.kit !== m.kit) throw new Error(`score: ${m.pack} names kit '${pack.kit}' but soundmap.json says '${m.kit}'`);
  return { id, kitId: m.kit, kit, homeBed: m.bed, octave: pack.octave ?? null, recipes: pack.recipes || {} };
}

/** Engine bed id and time-of-day layers for a realm (the realm preset's sound.bed when it has one). */
export function realmSound(id, tod, sm = soundmap()) {
  const r = sm.realms[id];
  if (!r) throw new Error(`score: no sound entry for realm '${id}' in library/sound/soundmap.json`);
  const presetPath = studioPath('library', 'realms', `${id}.json`);
  const presetBed = fs.existsSync(presetPath) ? readJson(presetPath).sound?.bed : undefined;
  if (presetBed !== undefined && presetBed !== r.bed) throw new Error(`score: realm preset ${id} says bed '${presetBed}', soundmap.json says '${r.bed}'`);
  const t = Object.hasOwn(r.tods, tod) ? tod : 'default';
  if (!r.tods[t]) throw new Error(`score: realm '${id}' has no sound for time of day '${tod}' and no 'default' entry`);
  return { id, bed: r.bed, tod: t, layers: r.tods[t].layers || {} };
}

// ------------------------------------------------------------------- inputs --

/** The direction's cues aligned with the cue log (the stage's log is {t, type, ...data}, in emission order). */
function ownership(log, direction) {
  const dc = direction.cues;
  if (dc.length !== log.cues.length) throw new Error(`score: the cue log has ${log.cues.length} cues, the direction ${dc.length}: not this direction's log`);
  return log.cues.map((c, i) => {
    if (dc[i].type !== c.type || +dc[i].t.toFixed(4) !== c.t) throw new Error(`score: cue ${i} is ${c.type}@${c.t} in the log but ${dc[i].type}@${dc[i].t} in the direction`);
    return dc[i].by;
  });
}

/** Sound slots of the spec (audio-only, remux may override), validated. */
export function soundSlots(spec, overrides = {}) {
  const s = { contour: DEFAULT_CONTOUR, tickTempo: 1, panSeed: V2_SEED, motifs: V2_MOTIFS, ...(spec?.sound || {}), ...overrides };
  contourOf(s.contour);
  if (!(Number.isFinite(s.tickTempo) && s.tickTempo >= 0.9 && s.tickTempo <= 1.1)) throw new Error(`score: sound.tickTempo ${s.tickTempo} is outside 0.9..1.1`);
  if (!Number.isInteger(s.panSeed) || s.panSeed < 0) throw new Error(`score: sound.panSeed must be a non-negative integer, got ${s.panSeed}`);
  if (!Array.isArray(s.motifs) || !s.motifs.includes('MO-CLOSE')) throw new Error('score: sound.motifs must include MO-CLOSE (mandatory)');
  return s;
}

// --------------------------------------------------------------------- plan --

/**
 * Build the score plan.
 *   input: { log: cues.json {video, title, fps, duration, cues, curves}, direction?, spec? }
 *   opts:  { compat: 'v2-score' | null, fixes: [...FIX_ORDER], mallow, realm, tod, sound: slot overrides,
 *            sync: hit sync from audio/hits.mjs: { advance: {cueIndex: s}, soften: {cueIndex: {k: dB}}, clearTicks: {cueIndex: true} } }
 * → { plan, report }. compat → plan deep-equal to buildPlanV2(log).
 *
 * Hit sync (sync): the score's render loop (audio/hits.mjs) hears where each graded
 * cue's hit lands and hands back moves, which take effect as the recipes emit:
 *   advance  the kit gesture a cue's recipe plays starts earlier by s, so the note that
 *            is its loudest heard transient lands on the cue (its first notes lead in);
 *   soften   the k-th studio event a cue's recipe plays is lowered by dB (an answer
 *            note heard louder than its accent);
 *   clearTicks  the clock keeps out of the cue's whole hit window (a tick heard as its hit).
 */
export function buildScore({ log, direction = null, spec = null }, opts = {}) {
  const compat = opts.compat ?? null;
  if (compat !== null && compat !== 'v2-score') throw new Error(`score: unknown compat mode '${compat}' (have: v2-score)`);
  const fixes = new Set(compat ? [] : (opts.fixes ?? FIX_ORDER));
  for (const f of fixes) if (!Object.hasOwn(FIXES, f)) throw new Error(`score: unknown fix '${f}' (have: ${FIX_ORDER.join(', ')})`);
  const fix = (k) => fixes.has(k);
  const sync = { advance: { ...(opts.sync?.advance || {}) }, soften: { ...(opts.sync?.soften || {}) }, clearTicks: { ...(opts.sync?.clearTicks || {}) } };
  if (compat && Object.values(sync).some((m) => Object.keys(m).length)) throw new Error('score: --compat v2-score takes no hit sync (it is v2 exactly)');
  for (const [i, a] of Object.entries(sync.advance)) if (!(a >= 0 && a <= SYNC_MAX)) throw new Error(`score: hit sync advance for cue ${i} is ${a} s (0..${SYNC_MAX})`);
  if (!Array.isArray(log?.cues) || !Array.isArray(log?.curves) || !log.curves.length) throw new Error('score: the cue log needs { cues, curves }');

  const { duration: DUR, fps, cues, curves } = log;
  const C = curveSampler(curves, fps);
  const of = (type) => cues.filter((c) => c.type === type).sort((a, b) => a.t - b.t);
  const sm = soundmap();
  const notes = [];

  // who sounds: Mallow kit, realm bed, sound slots
  const mallowId = direction?.mallow?.id ?? opts.mallow ?? 'noomi';
  const realmId = direction?.realm?.id ?? opts.realm ?? 'moonmilk-cove';
  const tod = direction?.realm?.tod ?? opts.tod ?? 'late-night';
  if (opts.mallow && direction && opts.mallow !== mallowId) throw new Error(`score: --mallow ${opts.mallow} contradicts the direction's Mallow ${mallowId}`);
  if (!direction && !compat) notes.push(`no direction: Mallow ${mallowId}, realm ${realmId} (${tod}) from options/defaults; cue recipes from soundmap.json (legacy)`);
  const ms = mallowSound(mallowId, sm);
  const rs = realmSound(realmId, tod, sm);
  const slots = soundSlots(spec, opts.sound);
  if (!spec && !compat) notes.push(`no spec: v2's sound slots (contour ${slots.contour}, tickTempo ${slots.tickTempo}, panSeed ${slots.panSeed}, T01 motifs)`);
  const pitch = transposer(ms.kit, { octave: ms.octave });
  const contour = contourOf(slots.contour);
  if (compat) {
    const v2 = { mallow: mallowId === 'noomi', realm: realmId === 'moonmilk-cove' && rs.bed === 'moonmilk-cove', key: pitch.identity,
      slots: slots.contour === DEFAULT_CONTOUR && slots.tickTempo === 1 && slots.panSeed === V2_SEED };
    const bad = Object.entries(v2).filter(([, ok]) => !ok).map(([k]) => k);
    if (bad.length) throw new Error(`score: --compat v2-score reproduces v2 (Noomi, Moonmilk Cove, v2's key and sound slots); this input differs in: ${bad.join(', ')}`);
  }

  // anchors from cues: v2's fallback times in compat, hard failures otherwise (R10)
  const strict = fix('r10');
  const need = (type, fallback) => {
    const c = of(type)[0];
    if (c) return c;
    if (!strict && fallback !== undefined) return fallback;
    throw new Error(`score: no '${type}' cue in the log, and the score needs it${strict ? ' (R10: no fallback times)' : ''}`);
  };
  const A = {
    take: () => need('take', { t: 0.4 }).t, land: () => need('land', { t: 0.98 }).t, squeeze: () => need('squeeze', { t: 6.98 }).t,
    inhale: () => need('inhale', { t: 7.42, dur: 1.48 }), exhale: () => need('exhale', { t: 9.2, dur: 1.9 }),
    crest: () => need('crest', { t: 8.9 }).t, open: () => need('eyes_open', { t: 11.7 }).t, logo: () => need('logo', { t: 12.6 }).t,
    firstThought: () => need('thought').t, spinUp: () => need('spin_up').t,
    loop: () => {
      const s = cues.find((c) => c.type === 'scene');
      if (strict && !s?.loop) throw new Error('score: no scene cue with the loop length (R10)');
      return s?.loop || DUR;
    },
  };

  // cue → recipe: the emitting move names it (direction); legacy logs use the sound map
  const by = direction ? ownership(log, direction) : cues.map(() => null);
  const recipeIds = cues.map((c, i) => {
    let id;
    if (by[i] === 'composer') id = `composer/${c.type}`;
    else if (by[i]) {
      id = MOVES[by[i]]?.cues?.[c.type]?.recipe;
      if (!id && strict) throw new Error(`score: move ${by[i]} emits '${c.type}' but declares no recipe for it (R10)`);
    } else id = sm.cues[c.type];
    if (!id) {
      if (strict) throw new Error(`score: cue '${c.type}' at ${c.t} s has no recipe (R10: every cue has a recipe)`);
      return null;                      // v2: an unknown cue type plays nothing
    }
    return ms.recipes[id] ?? id;
  });
  const recipes = recipeIds.map((id, i) => (id ? recipeOf(id, { by: by[i] ? `${by[i]} (${cues[i].type})` : `cue ${cues[i].type}` }) : null));
  for (const r of new Set(recipes.filter(Boolean))) assertLinted(r);
  recipes.forEach((r, i) => { if (r && r.cue !== cues[i].type) throw new Error(`score: recipe ${r.id} sounds '${r.cue}' cues, not '${cues[i].type}'`); });

  // the plan's arrays and the recipes' context
  const engine = [], synth = [], declared = [], gestures = [], kitVoices = [], studio = [];
  let current = null, cueIndex = -1, cueT = 0, emitted = 0;      // the recipe emitting, its cue, its studio events so far
  // a recipe's kit gesture (the Mallow's voice) may be advanced, a recipe's studio event softened (hit sync)
  const E = (t, kind, name, o = {}, trim = 1, cut = null) => {
    const a = kind === 'mallow' && cueIndex >= 0 ? sync.advance[cueIndex] || 0 : 0;
    const e = { t: t - a, kind, name, opts: o, trim, cut: cut && a ? { ...cut, at: cut.at - a } : cut };
    engine.push(e);
    if (kind === 'mallow' && cueIndex >= 0) kitVoices.push({ cue: cueIndex, cueT, offset: t - cueT, advance: a, name, event: e });
    return e;
  };
  const S = (t, inst, p) => {
    const dB = cueIndex >= 0 ? sync.soften[cueIndex]?.[emitted] : undefined;
    if (cueIndex >= 0) studio.push({ cue: cueIndex, k: emitted++, t, inst, f: p.f ?? p.f0 ?? null, softenDb: dB ?? 0 });
    synth.push(dB ? { t, inst, ...p, peak: p.peak * 10 ** (-dB / 20) } : { t, inst, ...p });
  };
  const { rnd, rr } = scoreStream(slots.panSeed);
  const R = {
    E, S, of, pitch, contour, CHIME_BASE,
    // a tonal note of a motif: labels the studio synth note at (t, hz), or, with no such
    // note, declares an engine sound with that static pitch (the tuned 'chime' fx)
    tonal: (t, hz, motif) => declared.push({ t, hz, motif, recipe: current }),
    // the tonal content of an engine kit gesture e (R.E's event), from the kit's voice model
    kitGesture: (e, motif) => gestures.push({ engine: e, motif, recipe: current, cueT, events: kitGestureEvents(ms, e) }),
  };

  // 1. the cue recipes, in cue-log order (v2's switch order)
  cues.forEach((c, i) => { const r = recipes[i]; if (!r) return; current = r.id; cueIndex = i; cueT = c.t; emitted = 0; r.emit(R, c); });
  current = null; cueIndex = -1;
  // the recipes' events together must not form a banned pattern either (a beep per cue
  // on regularly spaced cues is an alarm no single recipe shows)
  const together = lintEvents({ engine, synth });
  if (together.length) throw new Error(`score: the cue recipes together sound like a banned recipe: ${together.map((f) => f.message).join('; ')}`);

  // 2. the layers, in v2's order (the shared stream is drawn by sparkles, crickets, swirl)
  const L = { DUR, PRE, fps, cues, curves, of, C, rnd, rr, pitch, A, S, E };
  const motifs = new Set(compat ? V2_MOTIFS : slots.motifs);
  const owned = new Set(recipes.filter(Boolean).flatMap((r) => r.layers || []));
  const circular = fix('r7');
  if (circular && Math.abs(A.loop() - DUR) > 1e-9) throw new Error(`score: the scene loops every ${A.loop()} s but the film is ${DUR} s; the circular render needs exactly one loop`);
  const layers = [];
  const on = (name, cond) => { if (cond) layers.push(name); return cond; };

  if (on('sparkles', compat || owned.has('sparkles'))) sparkles(L);

  // the sleeping breath sounds where the direction has one (env.breath, acting/idle-breath); v2 always had it
  if (fix('r11') && !direction) throw new Error('score: R11 takes the breath envelope from the direction (env.breath); pass --direction (or --compat v2-score)');
  if (on('breath', !fix('r11') || !!direction.channels?.['env.breath'])) {
    let period, env;
    if (fix('r11')) {
      period = direction.anchors?.breathPeriod;
      env = breathEnvelope(direction);
    } else {
      period = A.loop() / 4;
      env = v2ScoreEnvelope;
    }
    breath(L, { period, env, circular });
  }

  // the clock keeps clear of the transient cues (R10: the recipes flagged transient; v2: its list), and of
  // a cue's whole hit window where hit sync heard a tick as that cue's hit
  const isBusy = strict ? (c, i) => recipes[i]?.transient : (c) => V2_BUSY.includes(c.type);
  const busy = cues.map((c, i) => [c, i]).filter(([c, i]) => isBusy(c, i)).map(([c, i]) => (sync.clearTicks[i] ? [c.t, HIT.after + 0.01] : c.t));
  const ticks = on('tick', motifs.has('MO-TICK')) ? tick(L, { busy, tempo: slots.tickTempo, circular }) : [];

  const cricketParams = compat ? V2_CRICKETS : rs.layers.crickets;
  const crk = on('crickets', !!cricketParams) ? crickets(L, { params: cricketParams, circular }) : [];

  let sw = null;
  const whoosh = motifs.has('MO-ORBIT'), humOn = motifs.has('MO-HUM');
  if (whoosh || humOn) {
    const curveNorm = direction?.audio?.pan?.curveNorm ?? PAN.curveNorm;
    const panAt = fix('r11')
      ? (i, t) => { const x = PAN.centre + C(`bx${i}`, t) * curveNorm; return r4(clamp(((x - PAN.centre) / SCORE_PAN_NORM) * 1.2, -1, 1)); }
      : (i, t) => r4(clamp(C(`bx${i}`, t) * 1.2, -1, 1));
    const count = strict ? orbitItems(curves) : 3;
    if (whoosh && strict && !count) throw new Error('score: MO-ORBIT needs orbit curves (bx0, bf0, ba0, …) and the cue log has none');
    let whooshRamp = null;
    if (whoosh && fix('swirl')) { const s0 = A.spinUp(); whooshRamp = (t) => smoothstep(s0, s0 + 0.5, t); }
    sw = swirl(L, {
      t0: strict ? A.firstThought() - 0.1 : 2.9, count, panAt, whooshRamp, whoosh,
      tension: humOn ? hum(L, { squeeze: A.squeeze() }) : null,
    });
    if (whoosh) layers.push('swirl');
    if (humOn) layers.push('hum');
  }

  const pd = on('pad', motifs.has('MO-WARMPAD')) ? pad(L) : null;
  layers.push('bed');
  const bd = bed(L, { realm: rs.bed, firstThought: strict ? A.firstThought() : 3.0, circular: circular ? { xfade: BED_XFADE } : null });

  // MO-CLOSE ends on top (G-AUDIO: the final tonal events never fall)
  const tonalAll = () => scoreTonal(synth, declared, gestures);
  if (!compat) {
    const hitWindows = cues.filter((c) => HIT.cues.includes(c.type)).map((c) => [c.t - HIT.before, c.t + HIT.after]);
    for (const n of [phoneClose({ gestures, S, kitId: ms.kitId }), arrangeClose({ gestures, tonalAll, pitch, S, kitId: ms.kitId, hitWindows })]) if (n) notes.push(n);
  }

  // circular: every discrete event lives inside the loop (a P > 0 direction may emit before 0)
  if (circular) {
    for (const e of [...engine, ...synth]) {
      const t = wrap(e.t, DUR);
      if (t !== e.t) { const d = t - e.t; e.t = t; if (e.cut) e.cut = { ...e.cut, at: e.cut.at + d }; }
    }
  }

  const plan = {
    SR, PRE, DUR, LAT, engineUrl: ENGINE_URL,
    engine: engine.sort((a, b) => a.t - b.t), synth: synth.sort((a, b) => a.t - b.t),
    ticks, crickets: crk, swirl: sw, pad: pd, bed: bd,
    // v2: frame 0 is the pre-roll's night; the end only dips a little so the loop has no hole
    fade: circular ? null : { inEnd: 0.02, inFloor: 0.85, outStart: DUR - 0.08, outFloor: 0.7 },
  };
  if (!compat) {
    plan.kit = ms.kitId;
    if (circular) plan.circular = { tail: TAIL };
  }

  const report = {
    mode: compat ? `compat ${compat}` : 'default', fixes: [...fixes],
    mallow: mallowId, kit: ms.kitId, realm: realmId, tod: rs.tod, bed: rs.bed,
    transposition: { identity: pitch.identity, octave: pitch.octave, keyRoot: pitch.keyRoot, scale: ms.kit.scale },
    sound: { contour: slots.contour, tickTempo: slots.tickTempo, panSeed: slots.panSeed, motifs: [...motifs] },
    layers,
    cues: cues.map((c, i) => ({ t: c.t, type: c.type, by: by[i], recipe: recipes[i]?.id ?? null, role: recipes[i]?.role ?? null })),
    tonal: tonalAll(),
    kitVoices: kitVoices.map(({ cue, cueT: ct, offset, advance, name, event }) => ({ cue, cueT: ct, t: event.t, offset, advance, name })),
    studio,
    sync: { advance: sync.advance, soften: sync.soften, clearTicks: sync.clearTicks },
    counts: { engine: plan.engine.length, synth: plan.synth.length, ticks: ticks.length, cricketPulses: crk.reduce((n, c) => n + c.ev.length, 0) },
    notes,
  };
  return { plan, report };
}

/** The score's one seeded stream (v2's order: the sparkles draw first, then crickets and swirl). */
export function scoreStream(panSeed) {
  const rnd = mulberry32(panSeed ^ 0x2a2a);
  return { rnd, rr: (a, b) => a + rnd() * (b - a) };
}

/**
 * The sparkle layer's events in a score plan: the texture the shape lint counts for the
 * level only (audio/lint-shapes.mjs; G-AUDIO's plan lint, qa/gates/audio-gate.mjs). The
 * layer is regenerated from the cue log, the Mallow's key and the pan seed exactly as
 * buildScore runs it (the stream's first draws; v2's exhale fallback for a log without
 * one, as compat; wrapped into the loop for a circular plan), and only the plan's own
 * events equal to a regenerated sparkle are returned, so nothing else can pass as one.
 * → Set of plan.synth events (empty when the plan has none)
 */
export function sparkleTexture(plan, { log, mallow = 'noomi', panSeed = V2_SEED }) {
  const cues = log?.cues || [];
  const of = (type) => cues.filter((c) => c.type === type).sort((a, b) => a.t - b.t);
  const exhale = of('exhale')[0] ?? { t: 9.2, dur: 1.9 };
  const ms = mallowSound(mallow);
  const { rnd, rr } = scoreStream(panSeed);
  const made = [];
  sparkles({ S: (t, inst, p) => made.push({ t, inst, ...p }), of, A: { exhale: () => exhale }, rnd, rr, pitch: transposer(ms.kit, { octave: ms.octave }) });
  if (plan.circular) for (const e of made) e.t = wrap(e.t, plan.DUR);
  const out = new Set();
  const pool = (plan.synth || []).filter((e) => e.inst === 'ping');
  for (const m of made) {
    const keys = Object.keys(m).filter((k) => k !== 't');
    const hit = pool.find((e) => !out.has(e) && Math.abs(e.t - m.t) <= 1e-9 && Object.keys(e).length === keys.length + 1 && keys.every((k) => e[k] === m[k]));
    if (hit) out.add(hit);
  }
  return out;
}

// ------------------------------------------------------------ tonal events --

/**
 * The tonal events an engine kit gesture plays, from the kit's voice model
 * (library/sound/soundmap.json kits[].voice, transcribed from the engine; the parity
 * test traces the engine's oscillators against it). Each event: { t, part, comps }
 * with absolute frequencies; a component whose glide is the kit's note articulation
 * is marked so (audio/check.mjs contourRules).
 */
export function kitGestureEvents(ms, e) {
  const k = ms.kit, voice = k.voice;
  const model = voice?.[e.name];
  if (!model) throw new Error(`score: kit ${ms.kitId} has no voice model for '${e.name}' (library/sound/soundmap.json kits.${ms.kitId}.voice)`);
  const root = k.root * clamp(e.opts?.pitch ?? 1, 0.25, 4);
  const D = (i) => root * Math.pow(2, (k.scale[((i % 5) + 5) % 5] + 12 * Math.floor(i / 5)) / 12);
  const shape = (c) => (c.glide > 0 && c.f1 !== c.f0 ? [c.f1 / c.f0, c.glide] : null);
  const art = voice.note.map(shape).filter(Boolean);
  const isArt = (c) => { const s = shape(c); return !!s && art.some(([r, g]) => Math.abs(s[0] / r - 1) < 0.01 && Math.abs(s[1] - g) < 0.001); };
  return model.events.map((ev, i) => {
    let base = D(ev.deg);
    if (ev.base) { base *= ev.base.mult ?? 1; if (ev.base.clamp) base = clamp(base, ev.base.clamp[0], ev.base.clamp[1]); }
    const comps = (ev.comps || voice.note).map((c) => ({ f0: base * c.f0, f1: base * c.f1, glide: c.glide || 0, level: c.level ?? 1, ...(c.vib ? { vib: c.vib } : {}), ...(isArt(c) ? { articulation: true } : {}) }));
    return { t: e.t + ev.dt * (ev.unscaled ? 1 : k.speed) + (ev.plus || 0), index: i, part: ev.part, comps, source: `kit:${ms.kitId}:${e.name}:${ev.part}` };
  });
}

/** Every tonal event of the score: the studio's pitched synth events, declared engine notes, modelled kit gestures (minus a damped accent). */
function scoreTonal(synth, declared, gestures) {
  const out = synth.map((e) => { const x = synthTonal(e); return x && { ...x, inst: e.inst }; }).filter(Boolean);
  for (const d of declared) {
    const hit = out.find((x) => Math.abs(x.t - d.t) < 1e-9 && Math.abs(leadOf(x).f0 - d.hz) < 1e-6);
    if (hit) Object.assign(hit, { motif: d.motif, recipe: d.recipe });
    else out.push({ t: d.t, source: 'engine', comps: [{ f0: d.hz, f1: d.hz, glide: 0, level: 1 }], motif: d.motif, recipe: d.recipe });
  }
  for (const g of gestures) {
    const cutAt = g.engine.cut ? g.engine.cut.at + g.engine.cut.fade : Infinity;
    for (const ev of g.events) if (ev.t < cutAt - 1e-9) out.push({ t: ev.t, source: ev.source, comps: ev.comps, motif: g.motif, recipe: g.recipe });
  }
  return out.sort((a, b) => a.t - b.t);
}

/** The lowest note of the score's key at or above hz (the transposer's key root and kit scale). */
function keyNoteAtOrAbove(pitch, hz) {
  for (let o = -4; o <= 8; o++) for (const s of pitch.kit.scale) { const f = pitch.keyRoot * Math.pow(2, (s + 12 * o) / 12); if (f >= hz) return f; }
  throw new Error(`score: no key note above ${hz} Hz`);
}
/** The note of the key nearest `hz` among those at or above `atLeast`. */
function keyNoteNear(pitch, hz, atLeast) {
  let best = null;
  for (let o = -4; o <= 8; o++) for (const s of pitch.kit.scale) {
    const f = pitch.keyRoot * Math.pow(2, (s + 12 * o) / 12);
    if (f >= atLeast && (!best || Math.abs(Math.log(f / hz)) < Math.abs(Math.log(best / hz)))) best = f;
  }
  return best;
}

/**
 * MO-CLOSE ends on top. The logo plays the Mallow's own closing phrase (the kit's
 * 'success'); for Noomi (v2) its rising notes and rising celesta accent are the last
 * tonal events and nothing changes. Other kits end differently: Glitzi on an FM zap
 * that falls 22 semitones, Boppo on a cork pop that falls 23, Zuzu on a swell whose
 * top voice falls a whole tone; and where the kit's voice sits lower than the score's
 * register (Loomi G3, Zuzu G4) or Pipzi's phrase lands mid-way, the score's own
 * celesta tink of the sleepy blink (12.8 s in T01) leaves the line falling. When the
 * last tonal events fall:
 *   1. a kit accent that itself falls (contourRules on the phrase alone) is damped:
 *      the voice fades over CLOSE_DAMP and is silent where the accent would start;
 *   2. a two-bell celesta resolution (MO-CLOSE's own voice, as at the eyes opening)
 *      answers where the accent was, or just after the kit's ending, and never inside
 *      a cue's hit window (HIT: the logo's own, the sleepy blink's after it), where it
 *      would be heard as that cue's hit: the first bell is the lowest note of the key
 *      above everything sounding since the logo, the second the key note nearest a
 *      fifth above it.
 * → a report note, or null when the close already rises.
 */
function arrangeClose({ gestures, tonalAll, pitch, S, kitId, hitWindows = [] }) {
  const close = gestures.filter((g) => g.motif === 'MO-CLOSE').sort((a, b) => a.engine.t - b.engine.t).pop();
  if (!close || contourRules(tonalAll()).pass) return null;
  const evs = close.events, ai = evs.findIndex((e) => e.part === 'accent');
  let at, damped = null;
  if (ai >= 0 && !contourRules(evs).pass) {
    at = evs[ai].t;
    close.engine.cut = { at: at - CLOSE_DAMP, fade: CLOSE_DAMP };
    damped = close.engine.cut.at;
  } else at = evs[evs.length - 1].t + CLOSE_STEP;
  // the answer keeps out of every cue's hit window (its own logo's and the sleepy blink's after
  // it): a brighter bell there would be heard as that cue's hit, late. Both bells, pushed past.
  const inWindow = (t) => hitWindows.find(([a, b]) => t >= a - 1e-9 && t <= b + 1e-9);
  for (let w; (w = inWindow(at) || inWindow(at + CLOSE_STEP));) at = w[1] + 1e-3;
  const floor = 10 ** (-CONTOUR.audibleDb / 20);
  let top = 0;
  for (const e of tonalAll()) {
    if (e.t < close.engine.t - 1e-9 || e.t >= at) continue;
    const lv = Math.max(...e.comps.map((c) => c.level));
    for (const c of e.comps) if (c.level >= lv * floor) top = Math.max(top, c.f0, c.f1);
  }
  const f1 = keyNoteAtOrAbove(pitch, top * Math.pow(2, CONTOUR.toleranceCents / 1200 + 1e-9));
  const f2 = keyNoteNear(pitch, f1 * 1.5, f1 * 1.25);
  S(at, 'bell', { f: f1, peak: 0.022, decay: 0.7, partials: 'celesta', send: 0.4, lp: 5000 });
  S(at + CLOSE_STEP, 'bell', { f: f2, peak: 0.017, decay: 0.8, partials: 'celesta', send: 0.45, lp: 5000 });
  const ok = contourRules(tonalAll()).pass;
  return `MO-CLOSE (${kitId}): ${damped !== null ? `the kit's falling accent damped at ${damped.toFixed(3)} s, ` : ''}celesta resolution ${f1.toFixed(1)} → ${f2.toFixed(1)} Hz at ${at.toFixed(3)} s (above ${top.toFixed(1)} Hz since the logo)${ok ? '' : '; the last tonal events still fall (see the contour check)'}`;
}

/**
 * MO-CLOSE is heard on a phone. The logo's hit is the Mallow's closing phrase (its
 * 'success'); where every audible component of that phrase lies below the phone band
 * (PHONE_HZ: Loomi's G3 voice and its low bell, whose energy a phone speaker barely
 * plays), MO-CLOSE's own celesta doubles the phrase's first note on the logo, in the
 * lowest octave inside the band. Every other kit, Noomi included, has notes in the band
 * and is left alone. → a report note, or null.
 */
function phoneClose({ gestures, S, kitId }) {
  const close = gestures.filter((g) => g.motif === 'MO-CLOSE').sort((a, b) => a.engine.t - b.engine.t).pop();
  if (!close) return null;
  const floor = 10 ** (-CONTOUR.audibleDb / 20);
  const audible = close.events.flatMap((ev) => { const lv = Math.max(...ev.comps.map((c) => c.level)); return ev.comps.filter((c) => c.level >= lv * floor); });
  if (audible.some((c) => Math.max(c.f0, c.f1) >= PHONE_HZ)) return null;
  const first = leadOf(close.events[0]).f0;
  let f = first;
  while (f < PHONE_HZ) f *= 2;
  S(close.engine.t, 'bell', { f, peak: 0.022, decay: 0.7, partials: 'celesta', send: 0.4, lp: 5000 });
  return `MO-CLOSE (${kitId}): the closing phrase lies below the phone band (all audible components < ${PHONE_HZ} Hz); the celesta doubles its first note (${first.toFixed(1)} Hz) at ${f.toFixed(1)} Hz on the logo`;
}

const linted = new Map();
/** A recipe the banned-recipe lint rejects never plays (audio/lint-recipes.mjs). */
function assertLinted(r) {
  if (!linted.has(r)) linted.set(r, lintRecipe(r));
  const f = linted.get(r);
  if (f.length) throw new Error(`score: recipe ${r.id} fails the recipe lint: ${f.map((x) => `${x.rule} (${x.message})`).join('; ')}`);
}

export { RECIPES };

// ---------------------------------------------------------------------- CLI --

export const USAGE = `usage: node audio/score.mjs <cues.json | job dir> <out.wav> [options]

  --compat v2-score     reproduce v2's plan exactly (byte-identical approved soundtrack)
  --fixes a,b|none|all  which documented fixes to apply (default all: ${FIX_ORDER.join(', ')})
  --direction <file>    the composed direction.json (default: found from the job / cue log)
  --spec <file>         the variant spec (sound slots; default: found from the direction, else v2's)
  --sound <json>        sound slot overrides, e.g. '{"tickTempo":1.05,"panSeed":7,"contour":"rise-1"}'
  --mallow <id> --realm <id> --tod <tod>   only without a direction
  --plan <file>         also write the plan (and report) as JSON
  --check <file>        also measure the result (G-AUDIO: loudness, true peak, seam, contour) into a JSON report`;

// (no top-level await: score-cli.mjs imports this module, which must finish evaluating first)
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  import('./score-cli.mjs')
    .then(({ cli }) => cli(process.argv.slice(2)))
    .then((code) => { process.exitCode = code; }, (e) => { console.error('[score]', e); process.exitCode = 1; });
}
