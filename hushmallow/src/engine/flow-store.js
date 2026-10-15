// Hushflow storage on this device: saved progress, favourite worlds and the
// rotation bags that keep worlds (and Mallow lines) from repeating.
//
// Everything goes through app.store (prefix hm2:), so Settings → Delete
// everything wipes it. Every record is versioned and validated on read:
// anything corrupt, from another version or too old reads as the fallback.
//
// PRIVACY: no words and no photos, ever. Progress keeps ids, numbers and
// short id-like strings only; validation drops anything that looks like
// free text (spaces, long strings), so a world's serialize() can never smuggle
// the person's words into storage by mistake.
//
// Pure ES module, no DOM. Works in browsers and Node.

const V = 1;
const KEYS = Object.freeze({ progress: 'hushfold.progress', favourites: 'hushfold.favourites', rotation: 'hushfold.rotation' });
export const FLOW_KEYS = KEYS;
export const PROGRESS_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const STATE_MAX_CHARS = 2048;
const ID = /^[a-z0-9][a-z0-9._-]{0,47}$/i;   // world, emotion, intention, Mallow and skill ids
const isId = (s) => typeof s === 'string' && ID.test(s);
const num = (x, lo, hi, d) => (Number.isFinite(+x) ? Math.min(hi, Math.max(lo, +x)) : d);

// ------------------------------------------------------------ helpers --
/** Small stable string hash (FNV-1a). */
export function hashString(str) {
  let h = 0x811c9dc5;
  const s = String(str);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

/** Deterministic PRNG (mulberry32) from a seed (number or string). */
export function seededRng(seed) {
  let a = (typeof seed === 'number' ? seed : hashString(seed)) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Copy of a world's serialize() output with every free-text-looking value removed. */
export function sanitizeState(x, depth = 0) {
  if (depth > 4) return undefined;
  if (x == null || typeof x === 'boolean') return x;
  if (typeof x === 'number') return Number.isFinite(x) ? x : undefined;
  if (typeof x === 'string') return x === '' || isId(x) ? x : undefined;
  if (Array.isArray(x)) return x.slice(0, 32).map((v) => sanitizeState(v, depth + 1)).filter((v) => v !== undefined);
  if (typeof x === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(x).slice(0, 32)) {
      if (!isId(k)) continue;
      const s = sanitizeState(v, depth + 1);
      if (s !== undefined) out[k] = s;
    }
    return out;
  }
  return undefined;
}

// ----------------------------------------------------------- progress --
/** Validate a stored progress record; returns a clean copy or null. */
export function validateProgress(p, now = Date.now()) {
  if (!p || typeof p !== 'object' || p.v !== V) return null;
  if (!isId(p.worldId)) return null;
  const savedAt = +p.savedAt;
  if (!Number.isFinite(savedAt) || savedAt > now + 60_000 || now - savedAt > PROGRESS_MAX_AGE_MS) return null;
  const sequence = Array.isArray(p.sequence) ? p.sequence.filter(isId).slice(0, 24) : [];
  const out = {
    v: V, savedAt, worldId: p.worldId,
    idx: Math.round(num(p.idx, 0, 999, 0)),
    sequence,
    step: num(p.step, 0, 1, 0),
    emotion: isId(p.emotion) ? p.emotion : null,
    intention: isId(p.intention) ? p.intention : null,
    mallow: isId(p.mallow) ? p.mallow : null,
    seed: Math.round(num(p.seed, 0, 2 ** 32 - 1, 0)),
  };
  if (p.state != null) {
    const st = sanitizeState(p.state);
    if (st && JSON.stringify(st).length <= STATE_MAX_CHARS) out.state = st;
  }
  return out;
}

/**
 * Save Hushflow progress. Call on pause, on pagehide / hidden and between
 * worlds — only while prefs.saveHistory is on (pass {enabled:false} otherwise,
 * which also clears any old record). Returns the stored record or null.
 */
export function saveProgress(store, p, { now = Date.now(), enabled = true } = {}) {
  if (!enabled) { clearProgress(store); return null; }
  const rec = validateProgress({ ...p, v: V, savedAt: now }, now);
  if (!rec) return null;
  store.set(KEYS.progress, rec);
  return rec;
}

/** The saved progress if it is valid and less than 7 days old, else null. */
export function loadProgress(store, now = Date.now()) {
  const rec = validateProgress(store.get(KEYS.progress, null), now);
  if (!rec && store.get(KEYS.progress, null) != null) store.remove(KEYS.progress);
  return rec;
}

export function clearProgress(store) { store.remove(KEYS.progress); }

// --------------------------------------------------------- favourites --
/** Favourite world ids, most recent first (explicit taps only). */
export function favouriteWorlds(store) {
  const rec = store.get(KEYS.favourites, null);
  if (!rec || rec.v !== V || !Array.isArray(rec.ids)) return [];
  return [...new Set(rec.ids.filter(isId))].slice(0, 64);
}

export function isFavouriteWorld(store, id) { return favouriteWorlds(store).includes(id); }

/** Toggle a favourite world; returns true when it is now a favourite. */
export function toggleFavouriteWorld(store, id) {
  if (!isId(id)) return false;
  const ids = favouriteWorlds(store);
  const on = !ids.includes(id);
  store.set(KEYS.favourites, { v: V, ids: on ? [id, ...ids] : ids.filter((x) => x !== id) });
  return on;
}

// ----------------------------------------------------------- rotation --
function readBags(store, key) {
  const rec = store.get(key, null);
  if (!rec || rec.v !== V || typeof rec.bags !== 'object' || !rec.bags) return {};
  return rec.bags;
}

/**
 * Draw the next item from a rotation bag, deterministically and without
 * repeats until every item has had its turn.
 *   items   the ids (or indices) currently allowed
 *   key     the bag's name, e.g. `${emotion}|${intention}`
 *   avoid   ids to skip when anything else is left (e.g. the last 3 played)
 *   storeKey defaults to 'hushfold.rotation'; lines.js keeps its own key
 * A refill is a seeded shuffle (round number + key), never starting with the
 * item that ended the previous round. Returns null when items is empty.
 */
export function drawFromBag(store, key, items, { avoid = [], storeKey = KEYS.rotation, rng } = {}) {
  const pool = [...new Set(items)].filter((x) => x != null);
  if (!pool.length) return null;
  const bags = readBags(store, storeKey);
  const b = bags[key] && Array.isArray(bags[key].left) ? bags[key] : { left: [], last: null, round: 0 };
  const okLeft = b.left.filter((x) => pool.includes(x));
  let left = okLeft;
  let round = Number.isFinite(b.round) ? b.round : 0;
  if (!left.length) {
    round += 1;
    const r = rng || seededRng(`${key}#${round}`);
    left = [...pool];
    for (let i = left.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [left[i], left[j]] = [left[j], left[i]]; }
    if (left.length > 1 && left[0] === b.last) left.push(left.shift());
  }
  let i = left.findIndex((x) => !avoid.includes(x));
  if (i < 0) i = 0;
  const pick = left[i];
  left = left.filter((_, k) => k !== i);
  bags[key] = { left, last: pick, round };
  // keep the record small: at most 200 bags
  const names = Object.keys(bags);
  if (names.length > 200) for (const n of names.slice(0, names.length - 200)) delete bags[n];
  store.set(storeKey, { v: V, bags });
  return pick;
}

/** Favourites first (in their saved order), then the rest in the given order. */
export function favouritesFirst(store, ids) {
  const fav = favouriteWorlds(store).filter((id) => ids.includes(id));
  return [...fav, ...ids.filter((id) => !fav.includes(id))];
}
