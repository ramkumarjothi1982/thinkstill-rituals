// Belief Mallows — what this phone keeps, and only when the person chooses "Keep it on this phone".
//
// By default nothing is kept: a Belief Mallow lives in memory for the visit and goes when Another Angle closes. Kept,
// it is stored in the app's own store (app.store: this phone, the person's namespace) under BELIEF_KEYS.kept, and
// nowhere else: never sent, never synced (the account sync carries only its own listed keys: src/auth/autosync.js
// LIBRARY_KEYS and the settings), and removed by:
//   * "Delete it from this phone" (the Belief Mallow's own end choice: forgetBelief),
//   * Settings → "Delete everything on this phone" (app.store.clearAll()),
//   * Settings → Another Angle → "Delete my Another Angle data" (consent.js deleteAngleData: BELIEF_KEYS.kept is listed in
//     its ANGLE_EXTRA_KEYS, and hasAngleData counts it).
// What is kept: the words as typed, the prop they picked and how far it was explored / given room / understood, and the
// day it was kept (no time of day). At most MAX_KEPT. Every record is validated on read; anything malformed is dropped.

// (the props of src/mallows/thought/belief.js PROPS, listed here so this stays light: the test checks they match)
export const PROPS = Object.freeze(['stone', 'shell', 'thread', 'charm']);

export const BELIEF_KEYS = Object.freeze({ kept: 'beyond.belief.kept' });
export const MAX_KEPT = 3;
/** The longest belief kept (the compact input's own limit is longer; a belief is a sentence). */
export const MAX_TEXT = 280;
const UNDERSTOOD = new Set(['safe', 'going', 'familiar', 'unsure']);

const clamp01 = (v) => (Number.isFinite(+v) ? Math.min(1, Math.max(0, +v)) : 0);
const today = (now) => new Date(now).toISOString().slice(0, 10);

/** One record, made safe (or null). */
export function cleanBelief(r) {
  if (!r || typeof r !== 'object') return null;
  const text = typeof r.text === 'string' ? r.text.replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT) : '';
  if (!/[\p{L}\p{N}]/u.test(text)) return null;
  const id = typeof r.id === 'string' && /^[a-z0-9]{6,24}$/.test(r.id) ? r.id : null;
  if (!id) return null;
  return {
    id, text,
    prop: PROPS.includes(r.prop) ? r.prop : 'stone',
    explored: +clamp01(r.explored).toFixed(3),
    room: +clamp01(r.room).toFixed(3),
    understood: UNDERSTOOD.has(r.understood) ? r.understood : null,
    kept: typeof r.kept === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.kept) ? r.kept : null,
  };
}

/** The Belief Mallows kept on this phone (newest first), validated. */
export function keptBeliefs(store) {
  let raw = null;
  try { raw = store?.get(BELIEF_KEYS.kept, null); } catch { raw = null; }
  if (!Array.isArray(raw)) return [];
  const out = [], seen = new Set();
  for (const r of raw) { const c = cleanBelief(r); if (c && !seen.has(c.id)) { seen.add(c.id); out.push(c); } }
  return out.slice(0, MAX_KEPT);
}

const newId = () => {
  let s = '';
  try { const a = new Uint32Array(2); globalThis.crypto.getRandomValues(a); s = a[0].toString(36) + a[1].toString(36); } catch { s = Math.random().toString(36).slice(2) + Date.now().toString(36); }
  return s.replace(/[^a-z0-9]/g, '').slice(0, 16).padEnd(8, '0');
};

/**
 * Keep (or update) a Belief Mallow on this phone: { text, prop, explored, room, understood, id? } → { ok, id } |
 * { ok: false, full: true } (MAX_KEPT already, and this is a new one) | { ok: false } (the store refused: sealed, full).
 */
export function keepBelief(store, b, { now = Date.now() } = {}) {
  const list = keptBeliefs(store);
  const id = b?.id && list.some((x) => x.id === b.id) ? b.id : newId();
  const rec = cleanBelief({ ...b, id, kept: today(now) });
  if (!rec) return { ok: false };
  const rest = list.filter((x) => x.id !== id);
  if (rest.length >= MAX_KEPT) return { ok: false, full: true };
  try { store.set(BELIEF_KEYS.kept, [rec, ...rest]); } catch { return { ok: false }; }
  // (a sealed or wiped store may take the write and keep nothing: read it back)
  return keptBeliefs(store).some((x) => x.id === id) ? { ok: true, id } : { ok: false };
}

/** Delete one kept Belief Mallow from this phone. */
export function forgetBelief(store, id) {
  const rest = keptBeliefs(store).filter((x) => x.id !== id);
  try { if (rest.length) store.set(BELIEF_KEYS.kept, rest); else store.remove(BELIEF_KEYS.kept); } catch { /* nothing more to do here */ }
  return !keptBeliefs(store).some((x) => x.id === id);
}

/** Delete every kept Belief Mallow from this phone. */
export function deleteBeliefData(store) {
  for (const k of Object.values(BELIEF_KEYS)) { try { store?.remove(k); } catch { /* ignore */ } }
}
export function hasBeliefData(store) { return keptBeliefs(store).length > 0; }
