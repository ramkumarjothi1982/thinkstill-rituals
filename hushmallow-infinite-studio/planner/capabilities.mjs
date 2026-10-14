// Capability gating: the planner may only sample Mallows, realm presets,
// times of day, loop durations and move cells that library/capabilities.json
// enables. Production plans need everything approved; review plans
// (hm plan --review) may also use candidate move cells (PHASE2-PLAN WP-06,
// OWNER-DECISIONS D2). Nothing absent from the file is ever enabled.

import fs from 'node:fs';
import { studioPath } from '../render/lib/paths.mjs';
import { sha256Hex } from './canonical.mjs';

export const CAPABILITIES_FILE = studioPath('library', 'capabilities.json');
export const STATUSES = Object.freeze(['blocked', 'untuned', 'candidate', 'approved']);
export const MODES = Object.freeze(['production', 'review']);
/** Spec slot → move kind; the kind each move id must declare (by prefix). */
export const MOVE_KINDS = Object.freeze({ gag: 'G-', metaphor: 'M-', ritual: 'R-', loop: 'LP-', camera: 'C-', arc: 'A-', turn: 'TURN-' });
/** The turn moves of the plan (the library has no turn catalogue). */
export const TURN_MOVES = Object.freeze(['TURN-SQUEEZE', 'TURN-STOP', 'TURN-SIGH']);

const rank = (s) => STATUSES.indexOf(s);

/** Problems with a capabilities object against the library (empty = valid). */
export function validateCapabilities(raw, lib) {
  const errs = [];
  const bad = (w, m) => errs.push(`${w}: ${m}`);
  if (raw.schema !== 'hm-capabilities/1') bad('schema', `must be hm-capabilities/1, got ${raw.schema}`);
  const status = (w, s) => { if (!STATUSES.includes(s)) bad(w, `status "${s}" is not one of ${STATUSES.join('|')}`); };
  for (const [m, e] of Object.entries(raw.mallows || {})) {
    if (!lib.MALLOWS.includes(m)) bad(`mallows.${m}`, 'not a library Mallow');
    status(`mallows.${m}`, e.status);
  }
  const homeRealms = new Map(lib.MALLOWS.map((m) => [lib.raw.mallows[m].realm, m]));
  for (const [r, e] of Object.entries(raw.realms || {})) {
    status(`realms.${r}`, e.status);
    if (!homeRealms.has(r)) { bad(`realms.${r}`, 'not the home realm of any library Mallow'); continue; }
    const realmTods = new Set(lib.MALLOWS.filter((m) => lib.raw.mallows[m].realm === r).flatMap((m) => lib.raw.mallows[m].tods));
    for (const [tod, s] of Object.entries(e.tods || {})) { status(`realms.${r}.tods.${tod}`, s); if (!realmTods.has(tod)) bad(`realms.${r}.tods.${tod}`, 'not a time of day of this realm'); }
    for (const [d, s] of Object.entries(e.durations || {})) { status(`realms.${r}.durations.${d}`, s); if (!lib.clocks[d]) bad(`realms.${r}.durations.${d}`, 'no beat clock for this duration'); }
    for (const [w, s] of Object.entries(e.weather || {})) status(`realms.${r}.weather.${w}`, s);
    for (const [id, d] of Object.entries(e.dressing || {})) {
      status(`realms.${r}.dressing.${id}`, d.status);
      if (!(d.costMs >= 0)) bad(`realms.${r}.dressing.${id}`, 'needs costMs >= 0');
    }
    if (e.status === 'approved' && !(e.dressingBudget && Number.isInteger(e.dressingBudget.maxItems) && e.dressingBudget.maxCostMs >= 0)) {
      bad(`realms.${r}`, 'an approved realm needs dressingBudget {maxItems, maxCostMs}');
    }
  }
  const catalogue = { gag: lib.ids.gags, metaphor: lib.ids.metaphors, ritual: lib.ids.rituals, loop: lib.ids.loops, camera: lib.ids.cameras, arc: lib.ids.arcs, turn: TURN_MOVES };
  for (const [id, mv] of Object.entries(raw.moves || {})) {
    const w = `moves.${id}`;
    if (!MOVE_KINDS[mv.kind]) { bad(w, `unknown kind "${mv.kind}"`); continue; }
    if (!id.startsWith(MOVE_KINDS[mv.kind])) bad(w, `id does not match kind ${mv.kind} (${MOVE_KINDS[mv.kind]}*)`);
    if (!catalogue[mv.kind].includes(id)) bad(w, `not in the ${mv.kind} catalogue`);
    for (const [m, s] of Object.entries(mv.cells || {})) { status(`${w}.cells.${m}`, s); if (!lib.MALLOWS.includes(m)) bad(`${w}.cells.${m}`, 'not a library Mallow'); }
  }
  return errs;
}

/** Wrap a raw capabilities object in the query API. */
export function makeCapabilities(raw, { sha256 = null, file = null, lib = null } = {}) {
  if (lib) {
    const errs = validateCapabilities(raw, lib);
    if (errs.length) throw new Error(`${file || 'capabilities'} is invalid:\n  ${errs.join('\n  ')}`);
  }
  const mallows = raw.mallows || {}, realms = raw.realms || {}, moves = raw.moves || {};
  const atLeast = (s, min) => rank(s) >= rank(min);
  const realmOf = (r) => realms[r] || { status: 'blocked', reason: 'not listed in capabilities' };
  const caps = {
    raw, sha256, file,
    /** A Mallow's pack status. */
    mallowStatus: (m) => mallows[m]?.status || 'blocked',
    mallowOk: (m) => atLeast(mallows[m]?.status, 'approved'),
    realmOk: (r) => atLeast(realmOf(r).status, 'approved'),
    todOk: (r, tod) => caps.realmOk(r) && atLeast(realmOf(r).tods?.[tod], 'approved'),
    durationOk: (r, d) => caps.realmOk(r) && atLeast(realmOf(r).durations?.[String(d)], 'approved'),
    /** Approved weather states of a realm (in file order). */
    weather: (r) => Object.entries(realmOf(r).weather || {}).filter(([, s]) => atLeast(s, 'approved')).map(([w]) => w),
    /** Approved dressing items of a realm: [{ id, costMs, tods? }]. */
    dressing: (r) => Object.entries(realmOf(r).dressing || {}).filter(([, d]) => atLeast(d.status, 'approved')).map(([id, d]) => ({ id, costMs: d.costMs, tods: d.tods || null, variants: d.variants || 1 })),
    dressingBudget: (r) => realmOf(r).dressingBudget || { maxItems: 0, maxCostMs: 0 },
    /** Status of the (move x Mallow) cell. */
    cellStatus: (move, m) => moves[move]?.cells?.[m] || (moves[move] ? 'untuned' : 'blocked'),
    /** May this cell be sampled in this mode? */
    cellOk: (move, m, mode) => atLeast(caps.cellStatus(move, m), mode === 'review' ? 'candidate' : 'approved'),
    /** Move ids of a kind that have at least one cell usable in this mode for Mallow m. */
    movesOfKind: (kind, m, mode) => Object.entries(moves).filter(([id, mv]) => mv.kind === kind && caps.cellOk(id, m, mode)).map(([id]) => id),
    /** Pack and preset files this capability set pins (studio-relative, may not exist yet). */
    packFile: (m) => mallows[m]?.pack || null,
    presetFile: (r) => realmOf(r).preset || null,
    /** Unlocked Mallows (approved packs). */
    unlocked: () => Object.keys(mallows).filter((m) => caps.mallowOk(m)),
    /** Why a thing is not enabled (for coverage reports). */
    reason: (kind, id) => {
      const e = kind === 'mallow' ? mallows[id] : kind === 'realm' ? realms[id] : moves[id];
      return e?.reason || (e ? `status ${e.status || 'untuned'}` : 'not listed in capabilities');
    },
  };
  return Object.freeze(caps);
}

/** Load library/capabilities.json (or another file), validated against the library. */
export function loadCapabilities(lib, file = CAPABILITIES_FILE) {
  const bytes = fs.readFileSync(file);
  return makeCapabilities(JSON.parse(bytes.toString('utf8')), { sha256: sha256Hex(bytes), file, lib });
}

/**
 * Everything in the library enabled (every Mallow, realm ToD, duration and
 * move cell approved; weather 'clear'; no dressing unless given). For tests,
 * simulations and `hm lib coverage --what-if` only: never for real plans.
 */
export function openCapabilities(lib, { cellStatus = 'approved', realmExtras = {} } = {}) {
  const raw = { schema: 'hm-capabilities/1', library: lib.version, mallows: {}, realms: {}, moves: {} };
  for (const m of lib.MALLOWS) {
    raw.mallows[m] = { status: 'approved' };
    const r = lib.raw.mallows[m].realm;
    const realm = raw.realms[r] || (raw.realms[r] = { status: 'approved', tods: {}, durations: {}, weather: { clear: 'approved' }, dressing: {}, dressingBudget: { maxItems: 2, maxCostMs: 60 } });
    for (const tod of lib.raw.mallows[m].tods) realm.tods[tod] = 'approved';
    for (const d of Object.keys(lib.clocks)) realm.durations[d] = 'approved';
    Object.assign(realm, structuredClone(realmExtras[r] || {}));
  }
  const add = (kind, ids) => {
    for (const id of ids) {
      const entry = kind === 'gag' || kind === 'ritual' ? lib[`${kind}s`][id] : null;
      const who = entry ? lib.whoCan(entry) : lib.MALLOWS;
      raw.moves[id] = { kind, cells: Object.fromEntries(who.map((m) => [m, cellStatus])) };
    }
  };
  add('gag', lib.ids.gags); add('metaphor', lib.ids.metaphors); add('ritual', lib.ids.rituals);
  add('loop', lib.ids.loops.filter((l) => l !== 'LP-BASE')); add('camera', lib.ids.cameras); add('arc', lib.ids.arcs); add('turn', TURN_MOVES);
  return makeCapabilities(raw, { sha256: 'open', file: null, lib });
}
