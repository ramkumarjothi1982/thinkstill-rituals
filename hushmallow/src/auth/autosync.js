// Keeps an account's opted-in things in step with the server while the app
// runs. It never decides whether to sync: the person's two switches on the
// account screen do (sync_consents), and the client checks them before every
// call (src/auth/client.js syncNow; the database refuses writes without them).
//
//   startAutoSync({ auth, store, prefs }) → { syncNow(), flush(), stop(), state, onChange(fn) }
//     auth   the full client (await app.auth.load()), signed in
//     store  app.store (the account's namespaced store: onWrite())
//     prefs  app.prefs
//
// When it runs:
//   * once at start (after the session check), and when the page comes back
//     to the front (at most once a minute) or the device comes back online;
//   * a few seconds after a setting changes ("Sync my settings" on) or after
//     a favourite, a Memory Garden tool or the Hushflow pause changes ("Keep
//     my favourites and progress" on); a change while a sync runs queues
//     one more run;
//   * when the page goes to the background, if a change is waiting.
// Its own writes (what it brings from the account) are not taken for local
// changes. Offline or a server error: nothing is lost, it tries again at the
// next of those moments. Pure of DOM except the two optional listeners.
import { FLOW_KEYS } from '../engine/flow-store.js';
import { GARDEN_KEY } from '../engine/garden.js';
import { PREF_COLUMNS } from './sync.js';

export const LIBRARY_KEYS = Object.freeze([FLOW_KEYS.favourites, GARDEN_KEY, FLOW_KEYS.progress]);
export const DEBOUNCE_MS = 4000;
export const VISIBLE_EVERY_MS = 60_000;

export function startAutoSync({ auth, store, prefs, win = globalThis, doc = globalThis.document, debounceMs = DEBOUNCE_MS, now = () => Date.now(), setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  let quiet = 0, timer = 0, running = null, again = false, stopped = false, lastRun = 0;
  const state = { last: null, error: null, running: false, settings: null, library: null };
  const listeners = new Set();
  const emit = () => { for (const fn of [...listeners]) { try { fn({ ...state }); } catch (e) { console.warn('[autosync]', e); } } };
  const quietly = (fn) => { quiet++; try { return fn(); } finally { quiet--; } };
  const signedIn = () => auth?.status?.() === 'signed-in';

  function markPrefsDirty() {
    try { const m = store.get('auth.sync', null) || {}; if (!m.prefsDirty) quietly(() => store.set('auth.sync', { ...m, prefsDirty: true })); } catch { /* storage refused */ }
  }

  async function syncNow() {
    if (stopped || !signedIn()) return { ok: false, skipped: true };
    if (running) { again = true; return running; }
    clearTimer(timer); timer = 0;
    state.running = true; emit();
    running = (async () => {
      let r;
      try { r = await auth.sync.syncNow(store, prefs, { quietly }); } catch (e) { r = { ok: false, error: { code: 'unknown', message: String(e?.message || e) } }; }
      lastRun = now();
      state.running = false;
      if (r?.ok) { state.last = now(); state.error = null; state.settings = r.settings; state.library = r.library; }
      else if (!r?.skipped) state.error = r?.error?.code || 'unknown';
      emit();
      return r;
    })();
    try { return await running; } finally {
      running = null;
      if (again && !stopped) { again = false; schedule(); }
    }
  }

  function schedule(ms = debounceMs) {
    if (stopped) return;
    if (running) { again = true; return; }
    clearTimer(timer);
    timer = setTimer(() => { timer = 0; syncNow(); }, ms);
  }

  // a setting changed here: mark it (the account's copy must not win over it) and sync soon
  // (a switch known to be off since the last run costs nothing: no request until it is turned on,
  // here on the account screen, which runs syncNow itself, or the next visibility / online check)
  const offPrefs = prefs?.onChange?.((k) => {
    if (quiet || stopped || !(k in PREF_COLUMNS) || state.settings === false) return;
    markPrefsDirty();
    if (running) again = true; else schedule();
  });
  // a favourite, a Memory Garden tool or the Hushflow pause changed here
  const offStore = store?.onWrite?.((k) => {
    if (quiet || stopped || !LIBRARY_KEYS.includes(k) || state.library === false) return;
    if (running) again = true; else schedule();
  });

  const onVisible = () => {
    if (stopped) return;
    if (doc?.visibilityState === 'hidden') { if (timer) { clearTimer(timer); timer = 0; syncNow(); } return; }
    if (now() - lastRun >= VISIBLE_EVERY_MS) schedule(250);
  };
  const onOnline = () => { if (!stopped) schedule(500); };
  doc?.addEventListener?.('visibilitychange', onVisible);
  win?.addEventListener?.('online', onOnline);

  return {
    state,
    syncNow,
    /** Run now if something is waiting. */
    flush() { if (timer) { clearTimer(timer); timer = 0; return syncNow(); } return Promise.resolve({ ok: true, idle: true }); },
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    stop() {
      stopped = true; clearTimer(timer); timer = 0;
      offPrefs?.(); offStore?.();
      doc?.removeEventListener?.('visibilitychange', onVisible);
      win?.removeEventListener?.('online', onOnline);
    },
  };
}
