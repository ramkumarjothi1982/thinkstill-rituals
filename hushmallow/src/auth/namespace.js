// Local namespaces: on a shared device, one account's things never appear
// for another account, and a guest's things stay the guest's.
//
//   guest (and sign-in off)   hm2:<key>               exactly as before accounts
//   account <uid>             hm2:u:<uid>:<key>       chosen at boot, synchronously,
//                                                     from the session supabase-js persisted
//   device-level keys         hm2:<key>               the same whoever is signed in
//
// Device-level keys (DEVICE_KEYS) belong to the phone, not to a person:
//   entitlement      the plan on this device (App Store / test purchase); the
//                    store account, not our account, owns a purchase
//   beyond.device    Another Angle's random device code (the server's daily
//                    allowance is per device) and the server session bound to
//                    it (beyond.session), and a tester invite code (beyond.invite)
//   sound, haptics   the two raw switches the audio / haptics engines keep
// Everything else is account-level: prefs, favourites, Hushflow progress,
// rotation bags, the Memory Garden, journey and played history, Another
// Angle's consent, feedback tally and visit counts (consent is a person's
// choice: a second person on the same phone is asked again).
//
// From the moment a sign-out, a deletion or "Remove this device's data"
// starts, the account's namespace is sealed (sealAccount): its store drops
// every write, so nothing in flight can put the account's things back.
// Every page on the device honours it, not only the one that started it: a
// device-level tombstone (hm2:auth.wipe:<uid>, writeWipe) is written first,
// and any page that booted into that account before it was written drops its
// writes from then on (wipedSince), removes what slipped in (honourWipe, on
// the storage event) and reloads; the next boot removes anything left
// (cleanupWipes). A plain sign-out or an expired session writes no tombstone:
// the account keeps its copy for its next sign-in.
// Sign-in and sign-out reload the page into the right namespace. The first
// time an account is used on this device it is asked once whether to keep
// this device's guest things with it (a local copy, nothing is uploaded).
// Pure: every function takes the Storage it works on, so Node tests run it
// on a fake localStorage.
import { createStore, PREFIX } from '../engine/storage.js';
import { DEFAULTS as PREF_DEFAULTS } from '../app/prefs.js';
import { mergeFavourites, mergeGarden } from './sync.js';

/** Keys whose guest copy merges into an account copy that already exists (applyGuestChoice 'keep'). */
const favIds = (r) => (r && r.v === 1 && Array.isArray(r.ids) ? r.ids : []);
const MERGE = Object.freeze({
  'hushfold.favourites': (mine, guest) => ({ v: 1, ids: mergeFavourites(favIds(mine), favIds(guest)) }),
  garden: (mine, guest) => mergeGarden(mine, guest),
});

export const ACCOUNT_PREFIX = `${PREFIX}u:`;
/** Device-level tombstones, one per account: hm2:auth.wipe:<uid> (see writeWipe). */
export const WIPE_PREFIX = `${PREFIX}auth.wipe:`;
export const DEVICE_KEYS = Object.freeze(['entitlement', 'beyond.device', 'beyond.session', 'beyond.invite', 'sound', 'haptics']);
/** Account-level, but only bookkeeping: on their own they are not "guest things" worth asking about. */
export const INTERNAL_KEYS = Object.freeze(['rotation', 'hushfold.rotation', 'hushflow.rotation', 'hushfold.lines', 'beyond.seen', 'beyond.visits']);
/**
 * Per account, on this device: { v, createdAt, guestChoice, choiceAt }.
 * guestChoice: 'keep' | 'fresh' (the "Not now" answer: the account screen
 * offers to bring them in later) | 'none' (nothing to ask about) | 'cleared'
 * (after "Remove this device's data") | null (still to ask).
 */
export const MARKER_KEY = 'auth.local';
/** Preferences the app sets by itself (the intro seen, the Mallow last shown): not a reason to ask about guest things. */
export const AUTO_PREFS = Object.freeze(['seenIntro', 'mallow']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUid = (s) => typeof s === 'string' && UUID_RE.test(s);
export const accountPrefix = (uid) => `${ACCOUNT_PREFIX}${String(uid).toLowerCase()}:`;
const isDeviceKey = (k) => DEVICE_KEYS.includes(k);

// Sealed accounts: from the moment a sign-out, a deletion or "Remove this
// device's data" starts on this page, nothing more is written into that
// account's namespace through its store (a sync still in flight, a scene
// saving a favourite): what is removed stays removed. The page reloads next.
const SEALED = new Set();
/** Stop every write into this account's namespace from this page (src/auth/client.js, before a sign-out or deletion). */
export function sealAccount(uid) { if (isUid(uid)) SEALED.add(uid.toLowerCase()); }
/** A deletion that failed: the account carries on as before. */
export function unsealAccount(uid) { if (isUid(uid)) SEALED.delete(uid.toLowerCase()); }
export const isSealed = (uid) => isUid(uid) && SEALED.has(uid.toLowerCase());

const safeLocalStorage = () => { try { return globalThis.localStorage || null; } catch { return null; } };
const keysOf = (ls) => {
  const out = [];
  try { for (let i = 0; i < ls.length; i++) { const k = ls.key(i); if (k != null) out.push(k); } } catch { /* blocked */ }
  return out;
};
const getRaw = (ls, k) => { try { return ls.getItem(k); } catch { return null; } };

/**
 * The session supabase-js keeps under `storageKey` (default storage key),
 * read without loading supabase-js: { uid, email, expiresAt, hasRefresh } or null.
 * A session whose access token has expired still counts while it has a
 * refresh token: the client refreshes it, and a refresh that fails signs out.
 */
export function readPersistedSession(ls, storageKey) {
  if (!ls || !storageKey) return null;
  let s = null;
  try { s = JSON.parse(getRaw(ls, storageKey) || 'null'); } catch { return null; }
  if (!s || typeof s !== 'object') return null;
  // an older supabase-js layout kept { currentSession }
  if (s.currentSession && typeof s.currentSession === 'object') s = s.currentSession;
  let user = s.user;
  if (!user || typeof user !== 'object' || !isUid(user.id)) {
    try { user = JSON.parse(getRaw(ls, `${storageKey}-user`) || 'null')?.user; } catch { user = null; }
  }
  if (!user || !isUid(user.id)) return null;
  const hasRefresh = typeof s.refresh_token === 'string' && s.refresh_token.length > 0;
  if (!hasRefresh && !(typeof s.access_token === 'string' && s.access_token)) return null;
  return { uid: user.id.toLowerCase(), email: typeof user.email === 'string' ? user.email : null, expiresAt: Number(s.expires_at) || 0, hasRefresh };
}

/**
 * Which namespace this page boots into. config: resolveAuthConfig()'s result.
 * An account's namespace remembers the tombstone it booted with (wipeId), so
 * a later one seals it. A boot that lands while another tab is still
 * removing this very account's copy (its tombstone is pending and less than
 * WIPE_GRACE_MS old: the session is about to go) boots sealed (removing): it
 * writes nothing, and reloads once the session has gone.
 */
export function bootNamespace({ config, ls, now = Date.now() }) {
  if (!config?.enabled) return Object.freeze({ mode: 'off', uid: null, prefix: PREFIX });
  const s = readPersistedSession(ls, config.storageKey);
  if (!s) return Object.freeze({ mode: 'guest', uid: null, prefix: PREFIX });
  const w = readWipe(ls, s.uid);
  const removing = wipeUnderway(w, now);
  return Object.freeze({ mode: 'account', uid: s.uid, prefix: accountPrefix(s.uid), email: s.email, wipeId: removing ? null : (w?.id ?? null), removing });
}

/**
 * The app's store for a namespace. Same API as createStore().
 *   off      createStore() exactly as before accounts
 *   guest    the same keys; clearAll() leaves every account namespace alone
 *   account  account-level keys under hm2:u:<uid>:, DEVICE_KEYS under hm2:;
 *            clearAll() empties this account's namespace and the device keys
 *            (the guest's things and other accounts are left alone)
 */
export function createNamespacedStore({ ns, backend = 'auto', ls = backend && typeof backend === 'object' ? backend : safeLocalStorage() } = {}) {
  if (!ns || ns.mode === 'off') return createStore({ backend });
  if (ns.mode === 'guest') {
    // a guest's "Delete everything on this phone" leaves other accounts and the tombstones alone
    const s = createStore({ backend, protect: [ACCOUNT_PREFIX, WIPE_PREFIX] });
    return Object.assign(s, { namespace: ns });
  }
  const device = createStore({ backend, protect: [ACCOUNT_PREFIX, WIPE_PREFIX] });
  const acct = createStore({ backend, prefix: ns.prefix });
  const pick = (k) => (isDeviceKey(k) ? device : acct);
  // the opt-in sync (src/auth/autosync.js) hears which keys this page wrote
  const writes = new Set();
  const wrote = (k) => { for (const fn of [...writes]) { try { fn(k); } catch (e) { console.warn('[store]', e); } } };
  // sealed on this page, or by a tombstone another page wrote since this one booted
  const sealed = () => isSealed(ns.uid) || wipedSince(ls, ns.uid, ns.wipeId);
  return {
    namespace: ns,
    get persistent() { return acct.persistent; },
    /** True once a sign-out, a deletion or "Remove this device's data" has started (on any page of this device since this one booted): writes are dropped. */
    get sealed() { return sealed(); },
    get: (k, fallback = null) => pick(k).get(k, fallback),
    set: (k, v) => { if (sealed()) return false; const r = pick(k).set(k, v); wrote(k); return r; },
    remove: (k) => { if (sealed()) return undefined; const r = pick(k).remove(k); wrote(k); return r; },
    /** fn(key) after every set / remove through this store (not other tabs). Returns an unsubscribe. */
    onWrite(fn) { writes.add(fn); return () => writes.delete(fn); },
    clearAll() {
      if (sealed()) return;
      const marker = acct.get(MARKER_KEY, null);
      acct.clearAll();
      for (const k of DEVICE_KEYS) device.remove(k);
      // the account stays known on this device: no second "keep guest things?" question
      if (marker) acct.set(MARKER_KEY, { ...marker, guestChoice: marker.guestChoice || 'fresh' });
    },
  };
}

/** The guest's account-level keys on this device (without the hm2: prefix). */
export function guestKeys(ls) {
  return keysOf(ls).filter((k) => k.startsWith(PREFIX) && !k.startsWith(ACCOUNT_PREFIX))
    .map((k) => k.slice(PREFIX.length))
    .filter((k) => k && !isDeviceKey(k) && !k.startsWith('__probe__') && !k.startsWith('auth.'));
}

/**
 * Preferences a person chose (not the defaults, not what the app sets by
 * itself): a brand-new visitor's automatic hm2:prefs is not "guest things".
 */
export function prefsChosen(raw) {
  let p = null;
  try { p = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return false; }
  if (!p || typeof p !== 'object' || Array.isArray(p)) return false;
  return Object.keys(p).some((k) => Object.prototype.hasOwnProperty.call(PREF_DEFAULTS, k) && !AUTO_PREFS.includes(k) && p[k] !== PREF_DEFAULTS[k]);
}

/** Whether the guest has anything worth asking about (not only rotation bags or automatic preferences). */
export function guestHasData(ls) {
  return guestKeys(ls).some((k) => !INTERNAL_KEYS.includes(k) && (k !== 'prefs' || prefsChosen(getRaw(ls, PREFIX + k))));
}

export function readMarker(ls, uid) {
  try { const m = JSON.parse(getRaw(ls, accountPrefix(uid) + MARKER_KEY) || 'null'); return m && typeof m === 'object' && m.v === 1 ? m : null; } catch { return null; }
}

function writeMarker(ls, uid, m) {
  try { ls.setItem(accountPrefix(uid) + MARKER_KEY, JSON.stringify({ v: 1, ...m })); return true; } catch { return false; }
}

/**
 * Called once at boot in an account namespace. A first visit with no guest
 * things to offer is settled at once ('none'); otherwise the account screen
 * asks. Returns { firstVisit, needsChoice }.
 */
export function settleNamespace(ls, uid, now = Date.now()) {
  if (!isUid(uid)) return { firstVisit: false, needsChoice: false };
  const m = readMarker(ls, uid);
  if (m && m.guestChoice) return { firstVisit: false, needsChoice: false };
  if (!guestHasData(ls)) { writeMarker(ls, uid, { createdAt: m?.createdAt || now, guestChoice: 'none', choiceAt: now }); return { firstVisit: !m, needsChoice: false }; }
  if (!m) writeMarker(ls, uid, { createdAt: now, guestChoice: null, choiceAt: null });
  return { firstVisit: !m, needsChoice: true };
}

export function needsGuestChoice(ls, uid) {
  if (!isUid(uid)) return false;
  const m = readMarker(ls, uid);
  return !(m && m.guestChoice) && guestHasData(ls);
}

/**
 * The person's answer: 'keep' copies this device's guest things into the
 * account's namespace (keys the account does not have yet; favourites and
 * the Memory Garden merge with the account's own; the guest keeps its own
 * copy), 'fresh' ("Not now") starts the account empty. Asked once; the
 * account screen can bring them in later (client.importGuestData, 'keep').
 * Returns { copied }.
 */
export function applyGuestChoice(ls, uid, choice, now = Date.now()) {
  if (!isUid(uid) || !['keep', 'fresh'].includes(choice)) throw new Error('applyGuestChoice: bad arguments');
  let copied = 0;
  if (choice === 'keep') {
    const to = accountPrefix(uid);
    for (const k of guestKeys(ls)) {
      const raw = getRaw(ls, PREFIX + k);
      if (raw == null) continue;
      const mine = getRaw(ls, to + k);
      let next = mine == null ? raw : null;
      // favourites and the Memory Garden come together (a later "Bring them in" after "Not now");
      // anything else the account already has stays the account's
      if (mine != null && MERGE[k]) {
        try { const m = JSON.stringify(MERGE[k](JSON.parse(mine), JSON.parse(raw))); if (m !== mine) next = m; } catch { next = null; }
      }
      if (next == null) continue;
      try { ls.setItem(to + k, next); copied++; } catch { /* storage full: keep going */ }
    }
  }
  const m = readMarker(ls, uid);
  writeMarker(ls, uid, { createdAt: m?.createdAt || now, guestChoice: choice, choiceAt: now });
  return { copied };
}

// ---------------------------------------------------------- tombstones --
/**
 * Why an account's copy on this device is being removed:
 *   deleted      the account was deleted (here, or found deleted on the server)
 *   signed-out   "Sign out and remove my things from this phone"
 *   device-data  "Remove this phone's data" (the account stays signed in here)
 */
export const WIPE_REASONS = Object.freeze(['deleted', 'signed-out', 'device-data']);
/** The reload reason another page passes on when it hears a tombstone (main.js shows the matching notice). */
export const WIPE_RELOAD = Object.freeze({ deleted: 'deleted-elsewhere', 'signed-out': 'removed-elsewhere', 'device-data': 'cleared-elsewhere' });
/** How long a pending tombstone means "a removal is under way right now" to a boot into that same account. */
export const WIPE_GRACE_MS = 2 * 60 * 1000;
export const wipeKey = (uid) => `${WIPE_PREFIX}${String(uid).toLowerCase()}`;
const newWipeId = () => {
  try { if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID(); } catch { /* below */ }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
};

/** The tombstone for uid on this device: { v, id, at, reason, pending } or null. */
export function readWipe(ls, uid) {
  if (!ls || !isUid(uid)) return null;
  try {
    const w = JSON.parse(getRaw(ls, wipeKey(uid)) || 'null');
    return w && w.v === 1 && typeof w.id === 'string' && WIPE_REASONS.includes(w.reason) ? w : null;
  } catch { return null; }
}

/**
 * Written FIRST, before any of the account's keys are removed, with a new id
 * each time: every page that booted into this account before it is sealed
 * from then on. pending: the copy here still has to go wherever the account
 * is not signed in again (deleted, signed-out). "Remove this phone's data"
 * removes it at once and stays signed in, so it is never pending.
 */
export function writeWipe(ls, uid, reason, now = Date.now()) {
  if (!ls || !isUid(uid) || !WIPE_REASONS.includes(reason)) return null;
  const w = { v: 1, id: newWipeId(), at: now, reason, pending: reason !== 'device-data' };
  try { ls.setItem(wipeKey(uid), JSON.stringify(w)); return w; } catch { return null; }
}

/** True when uid's tombstone is not the one this page booted with (seenId): a removal began since. */
export function wipedSince(ls, uid, seenId) {
  if (!ls || !isUid(uid)) return false;
  const w = readWipe(ls, uid);
  return !!w && w.id !== (seenId ?? null);
}

/** A pending tombstone young enough that its removal may still be running in another tab. */
export function wipeUnderway(w, now = Date.now()) {
  const at = Number(w?.at) || 0;
  return !!w?.pending && Math.abs(now - at) < WIPE_GRACE_MS;
}

/**
 * Another page wrote a tombstone for the account this page booted into
 * (seenId: the one it booted with): seal this page's namespace at once (its
 * later writes are dropped) and, when the copy is to go, remove whatever this
 * page wrote before it heard. Returns the tombstone, or null when there is
 * nothing new.
 */
export function honourWipe(ls, uid, seenId) {
  const w = readWipe(ls, uid);
  if (!w || w.id === (seenId ?? null)) return null;
  sealAccount(uid);
  if (w.pending) removeAccountData(ls, uid);
  return w;
}

/**
 * The account signs in on this device again (a sign-in, a link on
 * /auth/callback): the cleanup its tombstone still owed is done now, and the
 * tombstone stops asking for it (the same id: pages that booted with it stay
 * open). Returns the number of keys removed.
 */
export function settleWipe(ls, uid, now = Date.now()) {
  const w = readWipe(ls, uid);
  if (!w?.pending) return 0;
  const n = removeAccountData(ls, uid);
  try { ls.setItem(wipeKey(uid), JSON.stringify({ ...w, pending: false, settledAt: now })); } catch { /* the next boot tries again */ }
  return n;
}

/**
 * At boot, before the namespace is chosen: every account whose tombstone
 * still asks for it loses whatever is left of its copy on this device
 * (anything a page wrote before it heard). The account this page is signed
 * in as is left to bootNamespace while its removal is under way; an older
 * pending tombstone for it is settled (it signed in again some other way).
 * Returns the uids cleaned.
 */
export function cleanupWipes(ls, sessionUid = null, now = Date.now()) {
  const out = [];
  for (const k of keysOf(ls)) {
    if (!k.startsWith(WIPE_PREFIX)) continue;
    const uid = k.slice(WIPE_PREFIX.length);
    const w = readWipe(ls, uid);
    if (!w?.pending) continue;
    if (uid === sessionUid) {
      if (!wipeUnderway(w, now)) { settleWipe(ls, uid, now); out.push(uid); }
      continue;
    }
    if (removeAccountData(ls, uid) > 0) out.push(uid);
  }
  return out;
}

/** Every account namespace on this device (uids). */
export function accountNamespaces(ls) {
  const ids = new Set();
  for (const k of keysOf(ls)) if (k.startsWith(ACCOUNT_PREFIX)) { const id = k.slice(ACCOUNT_PREFIX.length).split(':')[0]; if (isUid(id)) ids.add(id); }
  return [...ids];
}

/** Removes one account's namespace from this device. Returns the number of keys removed. */
export function removeAccountData(ls, uid) {
  if (!isUid(uid)) return 0;
  const p = accountPrefix(uid);
  const doomed = keysOf(ls).filter((k) => k.startsWith(p));
  for (const k of doomed) { try { ls.removeItem(k); } catch { /* ignore */ } }
  return doomed.length;
}

/** Removes what supabase-js keeps for a project (session, user copy, PKCE verifiers). */
export function removeSupabaseKeys(ls, storageKey) {
  if (!storageKey) return 0;
  const doomed = keysOf(ls).filter((k) => k === storageKey || k.startsWith(`${storageKey}-`));
  for (const k of doomed) { try { ls.removeItem(k); } catch { /* ignore */ } }
  return doomed.length;
}
