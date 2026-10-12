// The Memory Garden store: which tools the person chose to keep, on this
// device only. Written only after an explicit "Keep this" tap.
//
// Shape (app.store key 'garden', so Settings → Delete everything wipes it):
//   { v: 1, skills: { [skillId]: { savedAt, lastPractised, practised, fromWorld, mallow } } }
// Ids only: never the person's words, photos or anything they typed. Every
// id must look like a slug ('slowing-down'), so free text can't get in by
// accident. Corrupt or foreign data reads as an empty garden (journey.js
// style), and each entry is validated on its own, so one bad entry never
// costs the rest.

export const GARDEN_KEY = 'garden';
export const GARDEN_VERSION = 1;
export const MAX_SKILLS = 64;

const ID = /^[a-z][a-z0-9-]{1,47}$/;
const isId = (v) => typeof v === 'string' && ID.test(v);
const isTime = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0;

function clean(e) {
  if (!e || typeof e !== 'object' || !isTime(e.savedAt)) return null;
  return {
    savedAt: e.savedAt,
    lastPractised: isTime(e.lastPractised) ? e.lastPractised : null,
    practised: Number.isInteger(e.practised) && e.practised >= 0 ? Math.min(e.practised, 1e6) : 0,
    fromWorld: isId(e.fromWorld) ? e.fromWorld : null,
    mallow: isId(e.mallow) ? e.mallow : null,
  };
}

/** The stored garden, validated (never throws). */
export function readGarden(store) {
  let raw = null;
  try { raw = store.get(GARDEN_KEY, null); } catch { raw = null; }
  const out = { v: GARDEN_VERSION, skills: {} };
  if (!raw || typeof raw !== 'object' || raw.v !== GARDEN_VERSION || !raw.skills || typeof raw.skills !== 'object' || Array.isArray(raw.skills)) return out;
  for (const [id, e] of Object.entries(raw.skills)) {
    if (!isId(id)) continue;
    const c = clean(e);
    if (c) out.skills[id] = c;
    if (Object.keys(out.skills).length >= MAX_SKILLS) break;
  }
  return out;
}

function write(store, g) {
  try { return store.set(GARDEN_KEY, g) !== false; } catch { return false; }
}

/**
 * Keep a tool. Call it only from the person's explicit "Keep this" tap.
 * Saving one that is already there keeps its first save (and its first
 * Mallow, so the charm never changes) and counts as practising it again.
 * Returns the entry ({ id, …, isNew, stored }) or null when the id is not
 * valid. `stored` is false when the device refused the write (private mode,
 * storage full): callers must not tell the person it was saved.
 */
export function saveSkill(store, { id, fromWorld = null, mallow = null } = {}, now = Date.now()) {
  if (!isId(id)) return null;
  const g = readGarden(store);
  const had = g.skills[id];
  if (!had && Object.keys(g.skills).length >= MAX_SKILLS) return null;
  const entry = had
    ? { ...had, lastPractised: now, practised: had.practised + 1, fromWorld: had.fromWorld || (isId(fromWorld) ? fromWorld : null), mallow: had.mallow || (isId(mallow) ? mallow : null) }
    : { savedAt: now, lastPractised: null, practised: 0, fromWorld: isId(fromWorld) ? fromWorld : null, mallow: isId(mallow) ? mallow : null };
  g.skills[id] = entry;
  const stored = write(store, g);
  return { id, ...entry, isNew: !had, stored };
}

/** Every kept tool, oldest first: [{ id, savedAt, lastPractised, practised, fromWorld, mallow }]. */
export function garden(store) {
  const g = readGarden(store);
  return Object.entries(g.skills).map(([id, e]) => ({ id, ...e })).sort((a, b) => a.savedAt - b.savedAt || (a.id < b.id ? -1 : 1));
}

/** One kept tool, or null. */
export function gardenEntry(store, id) {
  if (!isId(id)) return null;
  const e = readGarden(store).skills[id];
  return e ? { id, ...e } : null;
}

export function hasSkill(store, id) { return gardenEntry(store, id) !== null; }

/**
 * "Practise again": notes when, for the person's own memory (never shown as a
 * score). Null if it isn't kept. `stored` is false when the device refused the
 * write (the note is then simply not kept; nothing else changes).
 */
export function practised(store, id, now = Date.now()) {
  if (!isId(id)) return null;
  const g = readGarden(store);
  const e = g.skills[id];
  if (!e) return null;
  g.skills[id] = { ...e, lastPractised: now, practised: e.practised + 1 };
  const stored = write(store, g);
  return { id, ...g.skills[id], stored };
}

/**
 * "Forget this": removes one tool. True only when it was there and the device
 * accepted the change; false when it wasn't kept or the write was refused
 * (then it is still in the garden: check gardenEntry() and say so).
 */
export function forgetSkill(store, id) {
  if (!isId(id)) return false;
  const g = readGarden(store);
  if (!g.skills[id]) return false;
  delete g.skills[id];
  return write(store, g);
}

/** Empties the garden (Settings uses store.clearAll; this is for tests and QA). */
export function clearGarden(store) { try { store.remove(GARDEN_KEY); } catch { /* ignore */ } }
