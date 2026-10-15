// What an account may keep on the server, and how it maps to this device.
//
// Opt-in only (src/auth/client.js checks the person's consent first, and the
// database refuses rows without it). Ids, numbers and switches only: never
// words, thoughts, feelings, photos or anything typed. Every value is
// validated on the way out and on the way back; anything else is dropped.
// Pure ES module, no DOM, no network (tests/auth-sync.test.mjs).
//
//   preferences      sound, volume, haptics, motion, low stimulation, history
//                    switch, saved-angles switch, intro seen, auto-flow,
//                    subtitle speed, text size, home Mallow
//   favourite_worlds world ids (★ in the side panel), position 0 = newest
//   garden_skills    Memory Garden tool ids, when kept / last practised, how
//                    often, which world and Mallow it came from (ids)
//   hushflow_progress  where a Hushflow paused: world id, step numbers, the
//                    world sequence (ids), the Mallow, the seed. Not the
//                    feeling or intention picked, not the world's own state.

export const MALLOW_IDS = Object.freeze(['glitzi', 'blubi', 'zuzu', 'boppo', 'pipzi', 'loomi', 'noomi']);
export const WORLD_ID = /^[a-z0-9][a-z0-9._-]{0,47}$/;   // flow-store.js ids
export const SKILL_ID = /^[a-z][a-z0-9-]{1,47}$/;        // garden.js ids
export const MAX_FAVOURITES = 64;
export const MAX_SKILLS = 64;
const isWorld = (s) => typeof s === 'string' && WORLD_ID.test(s);
const isSkill = (s) => typeof s === 'string' && SKILL_ID.test(s);
const isMallow = (s) => typeof s === 'string' && MALLOW_IDS.includes(s);
const iso = (t) => (Number.isFinite(t) && t > 0 ? new Date(t).toISOString() : null);
const ms = (s) => { const t = Date.parse(s); return Number.isFinite(t) && t > 0 ? t : null; };
const oneOf = (v, list, d) => (list.includes(v) ? v : d);
const bool = (v, d) => (typeof v === 'boolean' ? v : d);
const clampNum = (v, lo, hi, d) => (Number.isFinite(+v) && v !== null && v !== '' ? Math.min(hi, Math.max(lo, +v)) : d);

// ---------------------------------------------------------- preferences --
export const SPEEDS = Object.freeze([0.75, 1, 1.25, 1.5]);
export const TEXT_SCALES = Object.freeze([1, 1.12, 1.25]);
export const MOTIONS = Object.freeze(['system', 'reduced', 'full']);
/** prefs key → column (and the check each value must pass). */
export const PREF_COLUMNS = Object.freeze({
  sound: 'sound', volume: 'volume', haptics: 'haptics', motion: 'motion', lowStim: 'low_stim',
  saveHistory: 'save_history', saveWords: 'save_words', seenIntro: 'seen_intro', autoFlow: 'auto_flow',
  subtitleSpeed: 'subtitle_speed', textScale: 'text_scale', mallow: 'mallow',
});

/** A local prefs object → a preferences row (without user_id). Unknown keys are never sent. */
export function prefsToRow(p = {}) {
  return {
    sound: bool(p.sound, true),
    volume: Math.round(clampNum(p.volume, 0, 1, 0.6) * 100) / 100,
    haptics: bool(p.haptics, true),
    motion: oneOf(p.motion, MOTIONS, 'system'),
    low_stim: bool(p.lowStim, false),
    save_history: bool(p.saveHistory, true),
    save_words: bool(p.saveWords, false),
    seen_intro: bool(p.seenIntro, false),
    auto_flow: bool(p.autoFlow, false),
    subtitle_speed: oneOf(+p.subtitleSpeed, SPEEDS, 1),
    text_scale: oneOf(+p.textScale, TEXT_SCALES, 1),
    mallow: isMallow(p.mallow) ? p.mallow : null,
  };
}

/** A preferences row → the prefs keys it sets (only valid values; others are left as they are). */
export function rowToPrefs(r) {
  if (!r || typeof r !== 'object') return {};
  const out = {};
  if (typeof r.sound === 'boolean') out.sound = r.sound;
  if (Number.isFinite(+r.volume) && r.volume !== null && +r.volume >= 0 && +r.volume <= 1) out.volume = +r.volume;
  if (typeof r.haptics === 'boolean') out.haptics = r.haptics;
  if (MOTIONS.includes(r.motion)) out.motion = r.motion;
  if (typeof r.low_stim === 'boolean') out.lowStim = r.low_stim;
  if (typeof r.save_history === 'boolean') out.saveHistory = r.save_history;
  if (typeof r.save_words === 'boolean') out.saveWords = r.save_words;
  if (typeof r.seen_intro === 'boolean') out.seenIntro = r.seen_intro;
  if (typeof r.auto_flow === 'boolean') out.autoFlow = r.auto_flow;
  if (SPEEDS.includes(+r.subtitle_speed)) out.subtitleSpeed = +r.subtitle_speed;
  if (TEXT_SCALES.includes(+r.text_scale)) out.textScale = +r.text_scale;
  if (r.mallow === null || isMallow(r.mallow)) out.mallow = r.mallow;
  return out;
}

// ----------------------------------------------------------- favourites --
/** Local favourite ids (newest first) → rows; position keeps the order. */
export function favouritesToRows(ids) {
  const list = [...new Set((Array.isArray(ids) ? ids : []).filter(isWorld))].slice(0, MAX_FAVOURITES);
  return list.map((world_id, position) => ({ world_id, position }));
}

/** Rows → ids, newest first. */
export function rowsToFavourites(rows) {
  return (Array.isArray(rows) ? rows : []).filter((r) => r && isWorld(r.world_id))
    .sort((a, b) => (Number(a.position) || 0) - (Number(b.position) || 0)).map((r) => r.world_id)
    .filter((v, i, a) => a.indexOf(v) === i).slice(0, MAX_FAVOURITES);
}

/** Union: this device's order first, then any the server has that this device does not. */
export function mergeFavourites(local, remote) {
  return [...new Set([...(local || []).filter(isWorld), ...(remote || []).filter(isWorld)])].slice(0, MAX_FAVOURITES);
}

// --------------------------------------------------------------- garden --
/** garden.js's stored object ({ v:1, skills:{ id: entry } }) → rows. */
export function gardenToRows(g) {
  const skills = g && typeof g === 'object' && g.skills && typeof g.skills === 'object' ? g.skills : {};
  return Object.entries(skills).filter(([id, e]) => isSkill(id) && e && Number.isFinite(e.savedAt) && e.savedAt > 0).slice(0, MAX_SKILLS).map(([skill_id, e]) => ({
    skill_id,
    saved_at: iso(e.savedAt),
    last_practised_at: iso(e.lastPractised),
    practised: Number.isInteger(e.practised) && e.practised >= 0 ? Math.min(e.practised, 1e6) : 0,
    from_world: isSkill(e.fromWorld) ? e.fromWorld : null,   // garden.js keeps ids in its own (slug) shape
    mallow: isMallow(e.mallow) ? e.mallow : null,
  }));
}

/** Rows → garden.js's stored object. */
export function rowsToGarden(rows) {
  const skills = {};
  for (const r of Array.isArray(rows) ? rows : []) {
    if (!r || !isSkill(r.skill_id)) continue;
    const savedAt = ms(r.saved_at);
    if (!savedAt) continue;
    skills[r.skill_id] = {
      savedAt,
      lastPractised: ms(r.last_practised_at),
      practised: Number.isInteger(r.practised) && r.practised >= 0 ? Math.min(r.practised, 1e6) : 0,
      fromWorld: isSkill(r.from_world) ? r.from_world : null,
      mallow: isMallow(r.mallow) ? r.mallow : null,
    };
    if (Object.keys(skills).length >= MAX_SKILLS) break;
  }
  return { v: 1, skills };
}

/** Union by id: the first save wins its date and Mallow, practice counts and dates take the larger. */
export function mergeGarden(local, remote) {
  const a = local?.skills || {}, b = remote?.skills || {};
  const skills = {};
  for (const id of [...new Set([...Object.keys(a), ...Object.keys(b)])]) {
    if (!isSkill(id)) continue;
    const x = a[id], y = b[id];
    if (!x || !y) { skills[id] = { ...(x || y) }; continue; }
    const first = x.savedAt <= y.savedAt ? x : y;
    skills[id] = {
      savedAt: Math.min(x.savedAt, y.savedAt),
      lastPractised: Math.max(x.lastPractised || 0, y.lastPractised || 0) || null,
      practised: Math.max(x.practised || 0, y.practised || 0),
      fromWorld: first.fromWorld || x.fromWorld || y.fromWorld || null,
      mallow: first.mallow || x.mallow || y.mallow || null,
    };
    if (Object.keys(skills).length >= MAX_SKILLS) break;
  }
  return { v: 1, skills };
}

// ------------------------------------------------------------- progress --
/** flow-store.js's progress record → a row (ids and numbers only; no feeling, intention or world state). */
export function progressToRow(p) {
  if (!p || typeof p !== 'object' || !isWorld(p.worldId) || !Number.isFinite(p.savedAt)) return null;
  return {
    world_id: p.worldId,
    idx: Math.round(clampNum(p.idx, 0, 999, 0)),
    sequence: (Array.isArray(p.sequence) ? p.sequence : []).filter(isWorld).slice(0, 24),
    step: clampNum(p.step, 0, 1, 0),
    mallow: isMallow(p.mallow) ? p.mallow : null,
    seed: Math.round(clampNum(p.seed, 0, 2 ** 32 - 1, 0)),
    saved_at: iso(p.savedAt),
  };
}

/** A row → a flow-store progress record (v: 1), or null. */
export function rowToProgress(r) {
  if (!r || !isWorld(r.world_id)) return null;
  const savedAt = ms(r.saved_at);
  if (!savedAt) return null;
  return {
    v: 1, savedAt, worldId: r.world_id,
    idx: Math.round(clampNum(r.idx, 0, 999, 0)),
    sequence: (Array.isArray(r.sequence) ? r.sequence : []).filter(isWorld).slice(0, 24),
    step: clampNum(r.step, 0, 1, 0),
    emotion: null, intention: null,
    mallow: isMallow(r.mallow) ? r.mallow : null,
    seed: Math.round(clampNum(r.seed, 0, 2 ** 32 - 1, 0)),
  };
}

/** The newer of two progress records (either may be null). */
export function mergeProgress(local, remote) {
  if (!local) return remote || null;
  if (!remote) return local;
  return remote.savedAt > local.savedAt ? remote : local;
}

// ----------------------------------------------- three-way (with a base) --
// The base is what this device and the account agreed on at the last sync
// (ids and a time only, kept in this account's namespace under auth.sync).
// Without it (the first sync on a device) the merges are unions. With it, a
// world un-starred or a tool let go on either side since then stays gone,
// instead of coming back from the other side.

/** Favourite ids: kept when both sides have them, or when the side that has them added them since the base. */
export function mergeFavourites3(local, remote, base) {
  if (!Array.isArray(base)) return mergeFavourites(local, remote);
  const L = (local || []).filter(isWorld), R = (remote || []).filter(isWorld);
  const inL = new Set(L), inR = new Set(R), inB = new Set(base.filter(isWorld));
  const keep = (id) => (inL.has(id) && inR.has(id)) || !inB.has(id);
  return [...new Set([...L, ...R])].filter(keep).slice(0, MAX_FAVOURITES);
}

/** Memory Garden: the same rule by tool id; a tool on both sides merges as mergeGarden does. */
export function mergeGarden3(local, remote, baseIds) {
  const merged = mergeGarden(local, remote);
  if (!Array.isArray(baseIds)) return merged;
  const a = local?.skills || {}, b = remote?.skills || {}, inB = new Set(baseIds.filter(isSkill));
  const skills = {};
  for (const [id, e] of Object.entries(merged.skills)) if ((a[id] && b[id]) || !inB.has(id)) skills[id] = e;
  return { v: 1, skills };
}

/**
 * Hushflow pause: the newer one; a pause that was there at the base and is
 * now gone on one side (finished or let go there) is gone, unless the other
 * side paused again since (its savedAt is after the base).
 */
export function mergeProgress3(local, remote, baseAt) {
  if (!Number.isFinite(baseAt) || baseAt <= 0) return mergeProgress(local, remote);
  if (local && remote) return mergeProgress(local, remote);
  const only = local || remote;
  if (!only) return null;
  return only.savedAt > baseAt ? only : null;
}

/** The base to remember after a sync: ids and one time, nothing else. */
export function libraryBase({ favourites = [], garden = null, progress = null } = {}) {
  return {
    favourites: (favourites || []).filter(isWorld).slice(0, MAX_FAVOURITES),
    garden: Object.keys(garden?.skills || {}).filter(isSkill).slice(0, MAX_SKILLS),
    progressAt: progress && Number.isFinite(progress.savedAt) ? progress.savedAt : null,
  };
}

/** Every column name sync may ever write, per table (tests compare these with the SQL). */
export const SYNC_COLUMNS = Object.freeze({
  preferences: Object.freeze(['user_id', ...Object.values(PREF_COLUMNS)]),
  favourite_worlds: Object.freeze(['user_id', 'world_id', 'position']),
  garden_skills: Object.freeze(['user_id', 'skill_id', 'saved_at', 'last_practised_at', 'practised', 'from_world', 'mallow']),
  hushflow_progress: Object.freeze(['user_id', 'world_id', 'idx', 'sequence', 'step', 'mallow', 'seed', 'saved_at']),
});
