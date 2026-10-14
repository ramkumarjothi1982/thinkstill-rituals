// Recipe lint (WP-04): what a cue recipe may never be, and that every cue has one.
//
//   node audio/lint-recipes.mjs [direction.json …]      exit 1 on any finding
//
// 1. Banned recipes (brand rule; templates/story-library.json scoreMotifs: "no
//    real-product sounds (no phone ringtones, messenger pops or alarm tones), no
//    heartbeat sounds, no jump-scare stingers"). Two independent nets:
//      - words: the recipe's id, cue, tags, doc and the engine sounds it names;
//      - shapes: the recipe is run on probe cues and what it plays is inspected for
//        the patterns themselves (audio/lint-shapes.mjs: what each banned sound IS,
//        read from a sound model of every event: pitch path, envelope, band and
//        level), so a banned sound cannot pass under an innocent name. Their limits
//        are the patterns' own (a beep's pitch holds still, a lub-dub is a heart's
//        S1–S2 apart, a machine repeats four or five times) or are calibrated on the
//        approved v2 sounds, as the plan asks: v2's fastest rise in level plus 3 dB
//        (LOUD, recomputed by tests/unit/audio-lint.test.mjs).
//    audio/score.mjs also runs the shapes on every cue recipe's events together
//    (lintEvents), so a pattern spread over several cues is caught too, while an
//    approved sound repeated by a direction (a triple blink, three glances) is not.
// 2. Silence is declared: a 'marker' or 'anchor' recipe emits nothing and says why
//    (`silent`); every other recipe sounds.
// 3. No absolute times: a recipe run at two cue times emits the same events shifted
//    by exactly the difference (translation invariance).
// 4. Coverage (per direction): every cue a move declares names a recipe that exists
//    and sounds that cue type; every emitted cue resolves (R10).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RECIPES } from './recipes/index.mjs';
import { CONTOURS, CHIME_BASE } from './recipes/contours.mjs';
import { transposer, REF_ROOT, REF_SCALE } from './pitch.mjs';
import { sounds, clusters, shapes, shapeFindings, riseMetrics, SHAPE, LOUD, ENGINE } from './lint-shapes.mjs';

export { sounds, clusters, shapes, shapeFindings, riseMetrics, SHAPE, LOUD, ENGINE };

export const BANNED = Object.freeze({
  ringtone: /ring[\s_-]*tone|phone[\s_-]*ring|ringing[\s_-]*phone|\bringer\b|\btrill[\s_-]*phone/i,
  alarm: /\balarm\b|\bsiren\b|\bbuzzer\b|beep[\s_-]*beep|\bklaxon\b|wake[\s_-]*up[\s_-]*tone/i,
  heartbeat: /heart[\s_-]*beat|\blub[\s_-]*dub\b|heart[\s_-]*(thump|pound|pulse)|pulse[\s_-]*thump/i,
  'messenger-pop': /messenger|notification|\bnotif\b|text[\s_-]*(message[\s_-]*)?(pop|ping|tone|alert)|\bsms\b|new[\s_-]*message|chat[\s_-]*(pop|ping)|whatsapp|imessage/i,
  'jump-scare': /jump[\s_-]*scare|\bscare\b|\bstinger\b|\bshriek|\bscream|shock[\s_-]*hit/i,
});
export const ROLES = Object.freeze(['foley', 'voice', 'motif', 'marker', 'anchor']);

// ---------------------------------------------------------------- probing --

/** Payload variants a recipe is probed with (it may branch on any of them). */
const PROBES = [{}, { i: 0, pan: -0.5 }, { i: 1, pan: 0.5 }, { i: 2, pan: 0 }, { soft: true }, { amp: 1 }, { dur: 1.5 }];

/** Run a recipe on a cue at time t → { engine, synth } (pure: a recording context). */
export function probe(recipe, t, payload = {}) {
  const engine = [], synth = [];
  const cue = { t, type: recipe.cue, ...payload };
  const R = {
    E: (tt, kind, name, o = {}, trim = 1, cut = null) => { const e = { t: tt, kind, name, opts: o, trim, cut }; engine.push(e); return e; },
    S: (tt, inst, p) => synth.push({ t: tt, inst, ...p }),
    of: (type) => (type === recipe.cue ? [cue] : []),
    pitch: transposer({ root: REF_ROOT, scale: [...REF_SCALE] }),
    contour: CONTOURS['arch-1'], CHIME_BASE,
    tonal: () => {}, kitGesture: () => {},
  };
  recipe.emit(R, cue);
  return { engine, synth };
}

/**
 * v2's maxima the LOUD limits are calibrated on: the largest 50 ms and 250 ms rises of
 * the level, the 50 ms rise of its bright broadband noise and the engine's voices
 * stacked, over every recipe and probe payload and over any further approved event
 * sets (the approved v2 score's events: tests/unit/audio-lint.test.mjs passes them). → { rise, riser, bright, engine }
 */
export function calibrateLoud(registry = RECIPES, approved = []) {
  const m = { rise: 0, riser: 0, bright: 0, engine: 0 };
  const take = (events) => { const r = riseMetrics(sounds(events)); for (const k of Object.keys(m)) m[k] = Math.max(m[k], r[k]); };
  for (const r of Object.values(registry)) for (const p of PROBES) take(probe(r, 2, p));
  for (const events of approved) take(events);
  return m;
}

// ------------------------------------------------------------------- lint --

const words = (r, events) => [r.id, r.cue, r.doc, r.silent, ...(r.tags || []), ...events.engine.map((e) => e.name)].filter(Boolean).join(' ');

/** Shape findings for a set of events (a whole score's recipe events): [{ rule, message }]. */
export function lintEvents(events) {
  return shapeFindings(events).map((f) => ({ recipe: null, rule: `banned:${f.category}`, message: `the events sound like a banned recipe (${f.category}: ${f.why})` }));
}

/** Findings for one recipe: [{ recipe, rule, message }]. */
export function lintRecipe(r) {
  const out = [];
  const bad = (rule, message) => out.push({ recipe: r.id, rule, message });
  if (!/^[a-z0-9-]+\/[a-z0-9_-]+$/.test(r.id || '')) bad('id', `recipe id '${r.id}' is not <family>/<name>`);
  if (!ROLES.includes(r.role)) bad('role', `role '${r.role}' is not one of ${ROLES.join(', ')}`);
  if (typeof r.emit !== 'function') { bad('emit', 'no emit(R, cue)'); return out; }
  const runs = PROBES.map((p) => probe(r, 2, p));
  const all = { engine: runs.flatMap((x) => x.engine), synth: runs.flatMap((x) => x.synth) };
  for (const [cat, re] of Object.entries(BANNED)) if (re.test(words(r, all))) bad(`banned:${cat}`, `names a banned sound (${cat})`);
  const shaped = new Map();
  for (const f of runs.flatMap(shapeFindings)) if (!shaped.has(f.category)) shaped.set(f.category, f.why);
  for (const [cat, why] of shaped) bad(`banned:${cat}`, `sounds like a banned recipe (${cat}: ${why})`);
  const silent = r.role === 'marker' || r.role === 'anchor';
  const n = all.engine.length + all.synth.length;
  if (silent && n) bad('silence', `a ${r.role} recipe must not sound (emits ${n} events)`);
  if (silent && !r.silent) bad('silence', `a ${r.role} recipe says why it is silent (field 'silent')`);
  if (!silent && !n) bad('silence', `a ${r.role} recipe must sound (emits nothing)`);
  // translation invariance: the same events, shifted by exactly Δ
  const D = 3.37;
  for (const p of PROBES) {
    const a = probe(r, 2, p), b = probe(r, 2 + D, p);
    const norm = (ev, s) => ev.map((e) => ({ ...e, t: +(e.t - s).toFixed(9), ...(e.cut ? { cut: { ...e.cut, at: +(e.cut.at - s).toFixed(9) } } : {}) }));
    if (JSON.stringify(norm(a.engine, 2)) !== JSON.stringify(norm(b.engine, 2 + D)) || JSON.stringify(norm(a.synth, 2)) !== JSON.stringify(norm(b.synth, 2 + D))) {
      bad('absolute-time', `events do not move with the cue (payload ${JSON.stringify(p)}): an absolute time or a time-dependent value`);
      break;
    }
  }
  return out;
}

/** Findings for the whole registry. */
export function lintRecipes(registry = RECIPES) {
  return Object.values(registry).flatMap(lintRecipe);
}

/**
 * Coverage of a direction (R10): every cue a move declares names a recipe that exists and
 * sounds that type; every cue the direction emits resolves to one.
 * moves: composer/moves MOVES.
 */
export function lintCoverage(direction, moves, registry = RECIPES) {
  const out = [];
  const bad = (rule, message) => out.push({ recipe: null, rule, message });
  for (const m of direction.moves || []) {
    for (const [type, decl] of Object.entries(moves[m.id]?.cues || {})) {
      const r = registry[decl.recipe];
      if (!r) bad('coverage:recipe', `${m.id} declares cue '${type}' with recipe '${decl.recipe}', which does not exist`);
      else if (r.cue !== type) bad('coverage:type', `${m.id}: recipe ${r.id} sounds '${r.cue}', not '${type}'`);
    }
  }
  for (const c of direction.cues) {
    const id = c.by === 'composer' ? `composer/${c.type}` : moves[c.by]?.cues?.[c.type]?.recipe;
    if (!id || !registry[id]) bad('coverage:cue', `cue '${c.type}' at ${c.t} s (${c.by}) has no recipe`);
  }
  return out;
}

// ---------------------------------------------------------------------- CLI --

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { MOVES } = await import('../composer/moves/index.js');
  const { studioPath } = await import('../render/lib/paths.mjs');
  const directions = process.argv.slice(2).length ? process.argv.slice(2) : [studioPath('specs', 'golden', 't01-v2.direction.json')];
  const findings = lintRecipes();
  for (const d of directions) findings.push(...lintCoverage(JSON.parse(fs.readFileSync(d, 'utf8')), MOVES).map((f) => ({ ...f, recipe: path.basename(d) })));
  for (const f of findings) console.log(`${f.recipe}: ${f.rule}: ${f.message}`);
  console.log(`[lint-recipes] ${Object.keys(RECIPES).length} recipes, ${directions.length} direction(s): ${findings.length} finding(s)`);
  process.exitCode = findings.length ? 1 : 0;
}
