// Node-side fixtures shared by the composer unit and parity tests: the golden
// spec, the composer's inputs from disk, fixture moves (a loop with a moving
// seam, a pose-mismatching move, an intent writer) and a G-DIR mutation helper.

import fs from 'node:fs';
import { studioPath } from '../../render/lib/paths.mjs';
import { loadComposerData } from '../../composer/lib-node.mjs';
import { loadLibrary } from '../../planner/library.mjs';
import { composeWith } from '../../composer/compose.js';
import { MOVES } from '../../composer/moves/index.js';
import { TEXT_STYLES } from '../../composer/layout.js';

export const GOLDEN_SPEC_FILE = studioPath('specs', 'golden', 't01-v2.json');
export const goldenSpec = () => JSON.parse(fs.readFileSync(GOLDEN_SPEC_FILE, 'utf8'));
export const lib = loadLibrary();            // the planner's index (the composer also accepts its own lite one)
export const baseData = (spec = goldenSpec()) => loadComposerData(spec);

/** Compose synchronously with Node inputs; overrides: { spec, data, options, moves }. */
export function composeNode({ spec = goldenSpec(), data = null, options = {}, moves = MOVES } = {}) {
  const d = data || baseData(spec);
  return composeWith(spec, { lib, data: d, measure: d.measure, options, moves });
}

/** A deep copy of the inputs with a modified pack (for personality tests). */
export function dataWithPack(patch, spec = goldenSpec()) {
  const d = baseData(spec);
  const pack = structuredClone(d.pack);
  patch(pack);
  return { ...d, pack, tuning: d.tuning };
}

/** Deep equality where every number must be bit-identical (Object.is). */
export function bitEqual(a, b, path = '$', out = []) {
  if (typeof a === 'number' && typeof b === 'number') { if (!Object.is(a, b)) out.push(`${path}: ${a} vs ${b}`); return out; }
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) { out.push(`${path}: array shape`); return out; }
    a.forEach((x, i) => bitEqual(x, b[i], `${path}[${i}]`, out));
    return out;
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a).sort(), kb = Object.keys(b).sort();
    if (ka.join() !== kb.join()) { out.push(`${path}: keys ${ka} vs ${kb}`); return out; }
    for (const k of ka) bitEqual(a[k], b[k], `${path}.${k}`, out);
    return out;
  }
  if (a !== b) out.push(`${path}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
  return out;
}

// ------------------------------------------------------- fixture moves --

/**
 * LP-TEST-RETRIGGER: a loop strategy with a moving seam. The seam sits at
 * HOOK_IN (P = D − HOOK_IN) and a small body twitch plays straight across
 * frame 0 (composition time −0.3 … +0.2): the "here we go again" retrigger.
 * twitchAt: composition time of the twitch; seamless: P > 0 or P = 0 (naive).
 */
export function retriggerLoop({ seamless = true } = {}) {
  return {
    id: 'LP-TEST-RETRIGGER',
    kind: 'loop',
    summary: 'test fixture: the retrigger plays across frame 0',
    cost: {}, requires: {}, params: {},
    span: ['CARD_OUT', 'END'],
    entry: 'asleep', exit: 'asleep',
    seam: (A) => (seamless ? A.END - A.HOOK_IN : 0),
    owns: seamless ? { 'body.squash': [-0.34, 0] } : { 'body.squash': [14.6, 15] },
    cues: { loop: { recipe: 'test/loop' } },
    compile(ctx, A) {
      ctx.post('rest.return', [ctx.at(A.CARD_OUT, -0.1), ctx.at(A.CARD_OUT, 0.2)]);
      const t0 = seamless ? -0.3 : A.END - 0.3;
      ctx.key('body.squash', t0, 0.05, { f: 4, z: 0.7 });
      ctx.key('body.squash', seamless ? -0.05 : A.END - 0.05, 0, { f: 3, z: 0.9 });
      if (!seamless) {
        const hook = ctx.layout.hook, st = TEXT_STYLES.hook;
        ctx.text({ id: 'hookReturn', kind: 'textblock', z: 1, drawFrom: A.HOOK_IN, opts: { lines: hook.lines, y: st.y, size: hook.size, weight: st.weight, tracking: st.tracking, enterAt: A.HOOK_IN, inDur: 0.3, stagger: 0, rise: 0 }, widths: hook.widths, readable: { min: 2.0, with: 'hook' } });
      }
      ctx.cue(seamless ? 0 : A.HOOK_IN, 'loop');
    },
  };
}

/**
 * A-TEST-SETTLE: v2's arc with the warmth back to night by CARD_OUT + 0.2, so a
 * seam moved to HOOK_IN finds the world at rest (v2's arc settles at 14.95 s,
 * which only suits a seam at frame 0).
 */
export function settledArc() {
  const base = MOVES['A-COLD-DIP-WARM'];
  return {
    ...base,
    id: 'A-TEST-SETTLE',
    summary: 'test fixture: v2 arc that settles before a moved seam',
    compile(ctx, A, p) {
      const { at } = ctx;
      const keys = [];
      const shadow = { ...ctx, key: (ch, t, v, o) => { if (ch === 'world.warmth') keys.push([t, v]); else ctx.key(ch, t, v, o); return shadow; } };
      base.compile(shadow, A, p);
      const R0 = A.RITUAL0;
      for (const [t, v] of [[A.COVER, 0], [at(R0, 1.85), 0], [at(R0, 4.0), 1], [at(A.SETTLE, 0.1), 1], [at(A.CARD_OUT, 0.2), 0], [A.END, 0]]) ctx.key('world.warmth', t, v);
      if (keys.length !== 6) throw new Error('A-COLD-DIP-WARM changed shape: update A-TEST-SETTLE');
    },
  };
}

/** A registry with extra fixture moves. */
export const registryWith = (...moves) => Object.freeze({ ...MOVES, ...Object.fromEntries(moves.map((m) => [m.id, m])) });

/** The golden spec with other move ids (and a matching tuning cell for each fixture move). */
export function specWith(patch) {
  const s = goldenSpec();
  patch(s);
  return s;
}

/** Inputs whose tuning matrix also holds approved Noomi cells for the given fixture move ids. */
export function dataWithCells(ids, spec = goldenSpec()) {
  const d = baseData(spec);
  const tuning = structuredClone(d.tuning);
  for (const id of ids) tuning[id] = { version: 'sha256:' + '0'.repeat(64), cells: { noomi: { status: 'approved', tuning: {}, ranges: {}, evidence: {}, flags: [] } } };
  return { ...d, tuning };
}
