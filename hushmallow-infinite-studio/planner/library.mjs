// The story library (templates/story-library.json), loaded once and indexed
// for the planner. The library is the only source of copy and structure: the
// planner never edits it and never invents strings (OWNER-DECISIONS D8).
//
// The small helpers here (whoCan, todsFor, timeClasses, wrap2) restate the
// rules of templates/validate-library.mjs so the planner judges single picks
// exactly the way the validator judges the whole library.

import fs from 'node:fs';
import { studioPath } from '../render/lib/paths.mjs';
import { sha256Hex } from './canonical.mjs';

export const LIBRARY_FILE = studioPath('templates', 'story-library.json');
const cache = new Map();

const ownKeys = (o) => Object.keys(o).filter((k) => !k.startsWith('$'));

/** Load and index a story library file (cached per path). */
export function loadLibrary(file = LIBRARY_FILE) {
  if (cache.has(file)) return cache.get(file);
  const bytes = fs.readFileSync(file);
  const lib = indexLibrary(JSON.parse(bytes.toString('utf8')), { sha256: sha256Hex(bytes), file });
  cache.set(file, lib);
  return lib;
}

/** Index a parsed library object (exported for tests that build small libraries). */
export function indexLibrary(raw, { sha256 = null, file = null } = {}) {
  const MALLOWS = Object.keys(raw.mallows);
  const templates = new Map(raw.templates.map((t) => [t.id, t]));
  const shortIds = new Map(raw.templates.map((t) => [t.id.split('-')[0], t.id]));   // T01 → T01-brain-at-2am
  const timeWords = Object.entries(raw.timeWords).filter(([k]) => !k.startsWith('$'))
    .map(([k, pats]) => [k.split('|'), pats.map((p) => new RegExp(p, 'i'))]);
  const clocks = {};
  for (const d of ownKeys(raw.beatClocks)) clocks[d] = raw.beatClocks[d];

  const lib = {
    raw, sha256, file, version: raw.version, MALLOWS, templates, clocks,
    gags: raw.gags, rituals: raw.rituals, metaphors: raw.metaphors, loops: raw.loops,
    cameras: raw.cameras, arcs: raw.paletteArcs, motifs: raw.scoreMotifs,
    ids: {
      gags: ownKeys(raw.gags), rituals: ownKeys(raw.rituals), metaphors: ownKeys(raw.metaphors),
      loops: ownKeys(raw.loops), cameras: ownKeys(raw.cameras), arcs: ownKeys(raw.paletteArcs), motifs: ownKeys(raw.scoreMotifs),
    },
    /** 'T01' or 'T01-brain-at-2am' → the template, or null. */
    template(id) { return templates.get(id) || templates.get(shortIds.get(String(id).toUpperCase())) || null; },
    /** Which Mallows may perform a gag or ritual entry. */
    whoCan(entry) { return entry.mallows === 'all' ? MALLOWS : entry.mallows; },
    /** Times of day open to Mallow m in template t (home realm ToDs ∩ template ToDs). */
    todsFor(t, m) { return t.tod === 'any' ? raw.mallows[m].tods : raw.mallows[m].tods.filter((x) => t.tod.includes(x)); },
    /** The ritual window (s) of the beat clock for duration d. */
    ritualWindow(d) { const c = clocks[d]; return c.RITUAL[1] - c.RITUAL[0]; },
    /** Union of ToD classes implied by time words in text, or null when it has none. */
    timeClasses(text) {
      let out = null;
      for (const [classes, res] of timeWords) if (res.some((re) => re.test(text))) out = [...new Set([...(out || []), ...classes])];
      return out;
    },
  };
  return lib;
}

/** Cast of a template: primary then secondary Mallows. */
export const castOf = (t) => [...t.mallows.primary, ...t.mallows.secondary];

/** Hooks of a template (primary first), each an array of 1-2 lines. */
export const hooksOf = (t) => [t.hook.primary, ...t.hook.variants];

/** Resolution entries of a template as { lines, only|null }. */
export const resolutionsOf = (t) => [t.resolution.primary, ...t.resolution.variants]
  .map((r) => (Array.isArray(r) ? { lines: r, only: null } : { lines: r.lines, only: r.only }));

/** Thought-line pools: slot k (0..2) = primary line k plus pool Lk+1, in library order. */
export function linePools(t) {
  const e = t.escalation;
  return [0, 1, 2].map((k) => [e.lines[k], ...e.pools[`L${k + 1}`]]);
}

/** Gags of a template (primary first). */
export const gagsOf = (t) => [t.gag.primary, ...t.gag.alts];
/** Rituals of a template (primary first). */
export const ritualsOf = (t) => [t.ritual.primary, ...t.ritual.alts];
/** Metaphors of a template (primary first). */
export const metaphorsOf = (t) => [t.escalation.metaphor, ...(t.escalation.alts || [])];

/**
 * Can text be wrapped into <= 2 rows of <= max characters (word boundary
 * nearest the middle)? → rows, or null. Same rule as validate-library.mjs.
 */
export function wrap2(text, max) {
  if (text.length <= max) return [text];
  const words = text.split(' ');
  let best = null;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
    if (a.length <= max && b.length <= max) {
      const score = Math.abs(a.length - b.length);
      if (!best || score < best.score) best = { rows: [a, b], score };
    }
  }
  return best ? best.rows : null;
}
