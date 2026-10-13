// The account screens' pure parts (src/auth/view-model.js), the home Mallow
// above the card (src/auth/mallow.js, with a stand-in rig), the three-way
// merges behind the opt-in sync, "Not now" then "Bring them in", the
// autosync scheduler, and static checks on the scene (fields, autocomplete,
// entry points, delete wording). The flows themselves run in the browser:
// tools/auth/screens-e2e.cjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import * as VM from '../src/auth/view-model.js';
import { createAuthMallow, pickMallow, MOODS } from '../src/auth/mallow.js';
import { mergeFavourites3, mergeGarden3, mergeProgress3, libraryBase } from '../src/auth/sync.js';
import { applyGuestChoice, bootNamespace, createNamespacedStore, readMarker, accountPrefix } from '../src/auth/namespace.js';
import { createAuthHandle } from '../src/auth/boot.js';
import { startAutoSync, LIBRARY_KEYS } from '../src/auth/autosync.js';
import { createPrefs } from '../src/app/prefs.js';
import { toggleFavouriteWorld, favouriteWorlds } from '../src/engine/flow-store.js';
import { memoryStorage, ROOT } from './helpers/auth-env.mjs';

const A = '11111111-1111-4111-8111-111111111111';
const CONFIG = Object.freeze({ enabled: true, url: 'http://localhost:8203', key: 'sb_publishable_hushmallow_local_dev_only', storageKey: 'sb-localhost-auth-token', mode: 'dev' });
const signIn = (ls, uid) => ls.setItem(CONFIG.storageKey, JSON.stringify({ access_token: 'a.b.c', refresh_token: 'r1', expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: uid, email: 'a@example.com' } }));
const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------ view model --
test('the first screen: off, the guest question, the account, or a guest’s screen', () => {
  assert.equal(VM.initialView({ enabled: false, status: 'off' }), 'off');
  assert.equal(VM.initialView({ enabled: true, status: 'guest' }), 'welcome');
  assert.equal(VM.initialView({ enabled: true, status: 'guest', view: 'signin' }), 'signin');
  assert.equal(VM.initialView({ enabled: true, status: 'guest', view: 'delete' }), 'welcome', 'a guest cannot open an account-only screen');
  assert.equal(VM.initialView({ enabled: true, status: 'signed-in' }), 'account');
  assert.equal(VM.initialView({ enabled: true, status: 'signed-in', view: 'signin' }), 'account', 'signed in: never the sign-in form');
  assert.equal(VM.initialView({ enabled: true, status: 'signed-in', view: 'password' }), 'password');
  assert.equal(VM.initialView({ enabled: true, status: 'signed-in', pendingGuestChoice: true, view: 'delete' }), 'guest-choice', 'the once-only question comes first');
  assert.equal(VM.initialView({ enabled: true, status: 'expired' }), 'expired');
  for (const v of [...VM.GUEST_ENTRY, ...VM.ACCOUNT_ENTRY]) assert.ok(VM.VIEWS.includes(v), v);
});

test('cooldown labels, consent lines, dates, the typed confirmation, codes, greeting, keyboard', () => {
  assert.equal(VM.cooldownLabel(0), 'Send it again');
  assert.equal(VM.cooldownLabel(41_200), 'Send it again in 42 s');
  assert.equal(VM.cooldownLabel(-5, 'Send a new code'), 'Send a new code');
  const at = new Date(2026, 9, 13, 9, 5).getTime();
  assert.equal(VM.formatWhen(at), '13 Oct 2026, 09:05');
  assert.equal(VM.formatWhen(at, { time: false }), '13 Oct 2026');
  assert.equal(VM.formatWhen('nonsense'), null);
  assert.equal(VM.consentLine(null), 'Off.');
  assert.equal(VM.consentLine({ on: false }), 'Off. Nothing is kept with your account.');
  assert.match(VM.consentLine({ on: true, at: new Date(at).toISOString() }), /^On since 13 Oct 2026, 09:05\. You can turn it off any time\.$/);
  assert.match(VM.consentLine({ on: false, withdrawnAt: new Date(at).toISOString() }), /^Off since 13 Oct 2026, 09:05\. What was kept with your account was deleted then\.$/);
  for (const t of ['delete', ' Delete ', 'DELETE']) assert.equal(VM.deleteConfirmed(t), true, t);
  for (const t of ['', 'delet', 'delete it', 'yes', null]) assert.equal(VM.deleteConfirmed(t), false, String(t));
  assert.equal(VM.cleanCode(' 123 456 '), '123456');
  assert.equal(VM.codeLooksRight('12345'), false);
  assert.equal(VM.codeLooksRight('123 456'), true);
  assert.equal(VM.greeting('  Ana  '), 'Hi, Ana');
  assert.equal(VM.greeting(''), null);
  assert.equal(VM.greeting('A'.repeat(40)).length <= 28, true, 'a long name is shortened in the title');
  assert.equal(VM.keyboardInset({ innerHeight: 844, vvHeight: 508 }), 336);
  assert.equal(VM.keyboardInset({ innerHeight: 844, vvHeight: 830 }), 0, 'a toolbar is not a keyboard');
});

// -------------------------------------------------------------- the Mallow --
function fakeHolder() {
  const kids = [];
  return {
    dataset: {}, attrs: {}, classes: new Set(), kids,
    setAttribute(k, v) { this.attrs[k] = v; },
    classList: { toggle(c, on) { if (on) this.owner.classes.add(c); else this.owner.classes.delete(c); }, owner: null },
    replaceChildren(...k) { kids.length = 0; kids.push(...k); },
  };
}
function fakeRigModule(log, { fail = false } = {}) {
  return Promise.resolve({
    MallowRig: class {
      constructor(box, opts) { this.opts = opts; this.ready = false; log.push(['new', opts.id, opts.reducedMotion]); this.loaded = fail ? Promise.reject(new Error('no canvas')) : Promise.resolve().then(() => { this.ready = true; return this; }); }
      setEmotion(mix, i, o) { log.push(['face', Object.keys(mix).sort().join('+'), o?.extra?.eyeOpen ?? null]); }
      react(k) { log.push(['react', k]); }
      destroy() { log.push(['destroy']); }
    },
  });
}
const REG = Promise.resolve({ MALLOWS: { blubi: { file: 'blubi.webp' }, zuzu: { file: 'zuzu.webp' } }, MALLOW_IDS: ['blubi', 'zuzu'] });

test('the home Mallow: moods on the holder, eyes shut for passwords, one hop on success, back to idle', async () => {
  globalThis.document ??= { createElement: () => ({ className: '', style: {} }) };
  const log = [];
  const holder = fakeHolder(); holder.classList.owner = holder;
  const m = createAuthMallow(holder, { id: 'zuzu', rigModule: fakeRigModule(log), registry: REG });
  assert.equal(holder.dataset.mood, 'idle');
  assert.equal(holder.attrs['aria-hidden'], 'true', 'decoration only: every state is also said in words');
  assert.equal(await m.ready, 'rig');
  m.mood('away');
  assert.equal(holder.dataset.mood, 'away');
  assert.deepEqual(log.at(-1), ['face', 'calm+happy', 0], 'away: eyes shut');
  m.mood('happy');
  assert.deepEqual(log.filter((x) => x[0] === 'react').pop(), ['react', 'success'], 'a soft hop');
  m.mood('concerned');
  assert.equal(log.filter((x) => x[0] === 'react').length, 1, 'concerned: no shake, no extra reaction');
  m.mood('nonsense');
  assert.equal(holder.dataset.mood, 'concerned', 'unknown moods are ignored');
  m.mood('happy');
  await tick(1800);
  assert.equal(holder.dataset.mood, 'idle', 'happy returns to idle by itself');
  await m.setId('blubi');
  assert.deepEqual(log.filter((x) => x[0] === 'react').pop(), ['react', 'hop'], 'a new home Mallow arrives with a small hop');
  m.destroy();
  assert.deepEqual(MOODS, ['idle', 'away', 'busy', 'happy', 'concerned']);
});

test('the home Mallow: reduced motion nods instead of hopping; without a rig, a still picture', async () => {
  globalThis.document ??= { createElement: () => ({ className: '', style: {} }) };
  const log = [];
  const h1 = fakeHolder(); h1.classList.owner = h1;
  const m1 = createAuthMallow(h1, { id: 'blubi', reducedMotion: true, rigModule: fakeRigModule(log), registry: REG });
  await m1.ready;
  assert.equal(log[0][2], true, 'the rig is told');
  assert.ok(h1.classes.has('hm-auth-rm'));
  m1.mood('happy');
  assert.deepEqual(log.filter((x) => x[0] === 'react').pop(), ['react', 'nod']);
  m1.destroy();
  const h2 = fakeHolder(); h2.classList.owner = h2;
  const warn = console.warn; console.warn = () => {};
  const m2 = createAuthMallow(h2, { id: 'blubi', mood: 'busy', rigModule: fakeRigModule([], { fail: true }), registry: REG });
  assert.equal(await m2.ready, 'still');
  console.warn = warn;
  assert.equal(h2.dataset.kind, 'still');
  assert.equal(h2.dataset.mood, 'busy', 'it starts in the mood it was given');
  assert.equal(pickMallow(['blubi', 'zuzu'], null, 'nope', 'zuzu'), 'zuzu');
  assert.equal(pickMallow(['blubi', 'zuzu'], undefined), 'blubi');
});

test('the home Mallow: { instant } shows the concerned face from the very next frame, with no reaction left playing', async () => {
  globalThis.document ??= { createElement: () => ({ className: '', style: {} }) };
  const faces = [];
  const rigModule = Promise.resolve({
    MallowRig: class {
      constructor() { this.ready = false; this.overlays = []; this.body = { grounded: true, hopV: 0 }; this.loaded = Promise.resolve().then(() => { this.ready = true; }); }
      setEmotion(mix, i, o) { faces.push({ mix: Object.keys(mix).sort().join('+'), instant: !!o?.instant, smile: o?.extra?.mouthSmile ?? null }); }
      react(k) { this.overlays.push({ kind: k }); if (k === 'success') { this.body.grounded = false; this.body.hopV = 1.2; } }
      destroy() {}
    },
  });
  const holder = fakeHolder(); holder.classList.owner = holder;
  const m = createAuthMallow(holder, { id: 'zuzu', rigModule, registry: REG });
  await m.ready;
  assert.equal(faces[0].instant, true, 'it arrives already wearing the screen’s face');
  m.mood('happy');
  assert.deepEqual(m.rig.overlays.map((o) => o.kind), ['success'], 'a success reaction is playing (and a hop rising)');
  m.mood('concerned', { instant: true });
  assert.equal(holder.dataset.mood, 'concerned');
  assert.deepEqual(m.rig.overlays, [], 'no smile left over from the reaction');
  assert.equal(m.rig.body.hopV, 0, 'no hop still rising');
  assert.deepEqual(faces.at(-1), { mix: 'anxious+sad', instant: true, smile: -0.25 }, 'the concerned face at once (springs skipped)');
  m.mood('happy', { instant: true });
  assert.equal(faces.at(-1).instant, false, 'happy is never instant: it always arrives with its gentle reaction');
  m.destroy();
});

// ------------------------------------------------------- three-way merges --
test('favourites: a removal on either side since the last sync stays removed; additions on both sides stay', () => {
  assert.deepEqual(mergeFavourites3(['a', 'b'], ['c'], undefined), ['a', 'b', 'c'], 'first sync on a device: union');
  const base = ['a', 'b', 'c'];
  assert.deepEqual(mergeFavourites3(['a', 'c'], ['a', 'b', 'c'], base), ['a', 'c'], 'un-starred here: gone there too');
  assert.deepEqual(mergeFavourites3(['a', 'b', 'c'], ['b', 'c'], base), ['b', 'c'], 'un-starred on another device: gone here too');
  assert.deepEqual(mergeFavourites3(['n1', 'a', 'b', 'c'], ['a', 'b', 'c', 'n2'], base), ['n1', 'a', 'b', 'c', 'n2'], 'new on both sides: both kept, this device’s order first');
  assert.deepEqual(mergeFavourites3([], ['a', 'b', 'c'], []), ['a', 'b', 'c'], 'an empty base is a base: what the account gained since is kept');
  assert.deepEqual(mergeFavourites3(['Bad Id!', 'a'], ['a'], ['a']), ['a'], 'only world ids');
});

test('Memory Garden and the Hushflow pause merge three ways too', () => {
  const e = (t) => ({ savedAt: t, lastPractised: null, practised: 0, fromWorld: null, mallow: null });
  const local = { v: 1, skills: { 'slowing-down': e(1), 'a-little-more-room': e(2) } };
  const remote = { v: 1, skills: { 'slowing-down': { ...e(1), practised: 3 }, 'another-angle': e(5) } };
  const g = mergeGarden3(local, remote, ['slowing-down', 'a-little-more-room', 'another-angle']);
  assert.deepEqual(Object.keys(g.skills).sort(), ['slowing-down'], 'let go on either side: gone');
  assert.equal(g.skills['slowing-down'].practised, 3, 'on both sides: merged (practice counts take the larger)');
  assert.deepEqual(Object.keys(mergeGarden3(local, remote, null).skills).sort(), ['a-little-more-room', 'another-angle', 'slowing-down'], 'first sync: union');
  const p = (t) => ({ v: 1, savedAt: t, worldId: 'static-storm' });
  assert.equal(mergeProgress3(p(5), p(9), 5).savedAt, 9, 'both: the newer pause');
  assert.equal(mergeProgress3(null, p(5), 5), null, 'finished here since the base: not brought back');
  assert.equal(mergeProgress3(p(5), null, 5), null, 'finished on another device: gone here');
  assert.equal(mergeProgress3(p(8), null, 5).savedAt, 8, 'paused again here after the base: kept');
  assert.equal(mergeProgress3(null, p(7), null).savedAt, 7, 'no base: whichever exists');
  assert.deepEqual(libraryBase({ favourites: ['a', 'Bad!'], garden: local, progress: p(4) }), { favourites: ['a'], garden: ['slowing-down', 'a-little-more-room'], progressAt: 4 }, 'the base keeps ids and one time only');
});

// ------------------------------------------- "Not now", then "Bring them in" --
test('"Not now", then "Bring them in": the guest’s favourites and garden merge with the account’s own', () => {
  const ls = memoryStorage();
  const guest = createNamespacedStore({ ns: bootNamespace({ config: CONFIG, ls }), backend: ls });
  toggleFavouriteWorld(guest, 'static-storm');
  createPrefs(guest).set('textScale', 1.25);
  signIn(ls, A);
  applyGuestChoice(ls, A, 'fresh');
  assert.equal(readMarker(ls, A).guestChoice, 'fresh');
  const handle = createAuthHandle({ config: CONFIG, ns: bootNamespace({ config: CONFIG, ls }) }, { ls });
  assert.equal(handle.guestDataWaiting, true, 'the account screen offers them again (synchronously, before supabase-js)');
  const acct = createNamespacedStore({ ns: bootNamespace({ config: CONFIG, ls }), backend: ls });
  toggleFavouriteWorld(acct, 'luminous-ocean');
  createPrefs(acct).set('textScale', 1.12);
  const r = applyGuestChoice(ls, A, 'keep');
  assert.ok(r.copied >= 1);
  assert.deepEqual(favouriteWorlds(acct).sort(), ['luminous-ocean', 'static-storm'], 'favourites merged');
  assert.equal(createPrefs(acct).get('textScale'), 1.12, 'a setting the account already has stays the account’s');
  assert.deepEqual(favouriteWorlds(guest), ['static-storm'], 'the guest keeps its own copy');
  assert.equal(createAuthHandle({ config: CONFIG, ns: bootNamespace({ config: CONFIG, ls }) }, { ls }).guestDataWaiting, false, 'offered once');
});

test('the account store reports its own writes (for the opt-in sync); device keys and removals too', () => {
  const ls = memoryStorage();
  signIn(ls, A);
  const store = createNamespacedStore({ ns: bootNamespace({ config: CONFIG, ls }), backend: ls });
  const seen = [];
  const off = store.onWrite((k) => seen.push(k));
  toggleFavouriteWorld(store, 'static-storm');
  store.set('entitlement', { tier: 'paid' });
  store.remove('garden');
  off();
  store.set('garden', { v: 1, skills: {} });
  assert.deepEqual(seen, ['hushfold.favourites', 'entitlement', 'garden']);
  assert.ok(ls.getItem(`${accountPrefix(A)}hushfold.favourites`));
});

// --------------------------------------------------------------- autosync --
function fakeAuth({ result = { ok: true, settings: true, library: true }, delay = 0 } = {}) {
  const calls = [];
  return {
    calls,
    status: () => 'signed-in',
    sync: { async syncNow(store, prefs, { quietly }) { calls.push(Date.now()); quietly(() => store.set('auth.sync', { at: calls.length })); if (delay) await tick(delay); return typeof result === 'function' ? result(calls.length) : result; } },
  };
}
function fakeTimers() {
  const q = new Map(); let id = 0;
  return { setTimer: (fn, ms) => { q.set(++id, { fn, ms }); return id; }, clearTimer: (t) => q.delete(t), flush: () => { const all = [...q.values()]; q.clear(); for (const t of all) t.fn(); }, get size() { return q.size; } };
}

test('autosync: a synced setting or a library change runs a sync a little later; its own writes do not', async () => {
  const ls = memoryStorage(); signIn(ls, A);
  const store = createNamespacedStore({ ns: bootNamespace({ config: CONFIG, ls }), backend: ls });
  const prefs = createPrefs(store);
  const auth = fakeAuth();
  const T = fakeTimers();
  const doc = { visibilityState: 'visible', l: {}, addEventListener(k, f) { this.l[k] = f; }, removeEventListener() {} };
  const s = startAutoSync({ auth, store, prefs, doc, win: { addEventListener() {}, removeEventListener() {} }, ...T });
  await s.syncNow();
  assert.equal(auth.calls.length, 1);
  assert.equal(T.size, 0, 'its own write (auth.sync) scheduled nothing');
  prefs.set('textScale', 1.25);
  assert.equal(store.get('auth.sync').prefsDirty, true, 'a setting changed here is marked: the account’s copy must not win over it');
  assert.equal(T.size, 1);
  toggleFavouriteWorld(store, 'static-storm');
  assert.equal(T.size, 1, 'debounced: one run for both');
  T.flush(); await tick(5);
  assert.equal(auth.calls.length, 2);
  store.set('entitlement', { tier: 'paid' });
  prefs.set('seenIntro', true);
  assert.equal(T.size, 1, 'seenIntro is a synced setting');
  T.flush(); await tick(5);
  store.set('rotation', [1, 2]);
  assert.equal(T.size, 0, 'bookkeeping keys are not synced');
  s.stop();
  prefs.set('sound', false);
  assert.equal(T.size, 0, 'stopped: nothing more');
});

test('autosync: switches known to be off cost nothing; a change during a run queues one more; hidden flushes', async () => {
  const ls = memoryStorage(); signIn(ls, A);
  const store = createNamespacedStore({ ns: bootNamespace({ config: CONFIG, ls }), backend: ls });
  const prefs = createPrefs(store);
  const T = fakeTimers();
  const doc = { visibilityState: 'visible', l: {}, addEventListener(k, f) { this.l[k] = f; }, removeEventListener() {} };
  const off = fakeAuth({ result: { ok: true, settings: false, library: false } });
  const s1 = startAutoSync({ auth: off, store, prefs, doc, win: { addEventListener() {}, removeEventListener() {} }, ...T });
  await s1.syncNow();
  prefs.set('textScale', 1.12); toggleFavouriteWorld(store, 'a-world');
  assert.equal(T.size, 0, 'both switches off: no request for local changes');
  s1.stop();

  const slow = fakeAuth({ delay: 30 });
  const s2 = startAutoSync({ auth: slow, store, prefs, doc, win: { addEventListener() {}, removeEventListener() {} }, ...T });
  const run = s2.syncNow();
  toggleFavouriteWorld(store, 'b-world');   // while the first run is on its way
  await run;
  assert.equal(T.size, 1, 'one more run is queued');
  doc.visibilityState = 'hidden'; doc.l.visibilitychange();
  await tick(40);
  assert.equal(slow.calls.length, 2, 'going to the background flushes what was waiting');
  assert.equal(T.size, 0);
  s2.stop();
  assert.deepEqual([...LIBRARY_KEYS], ['hushfold.favourites', 'garden', 'hushfold.progress']);
});

// ----------------------------------------------------------- the scene --
test('the account scene: every screen, the right autocomplete, entry points, and what delete says', () => {
  const src = readFileSync(`${ROOT}src/app/scenes/account.js`, 'utf8');
  for (const v of VM.VIEWS.filter((x) => x !== 'off')) assert.match(src, new RegExp(`V(\\.${v.replace('-', '\\-')}|\\['${v}'\\]) =`), `screen ${v}`);
  for (const a of ["autocomplete: 'email'", "autocomplete: 'new-password'", "autocomplete: 'current-password'", "autocomplete: 'one-time-code'", "autocomplete: 'username'"]) assert.ok(src.includes(a), a);
  assert.match(src, /export function mountAccountRow\(app, el\)/);
  assert.match(src, /export function openAccount\(app, params = \{\}\)/);
  assert.match(src, /role: 'alert'/, 'errors are announced');
  assert.match(src, /visualViewport/, 'keyboard-safe on iPhone');
  assert.match(src, /Deleted from our server, now/);
  assert.match(src, /Deleted from this phone/);
  assert.match(src, /Not touched/);
  assert.match(src, /app\.pushLayer/, 'deeper screens get a history entry (Back steps back)');
  assert.doesNotMatch(src, /innerHTML|html:/, 'no HTML strings: every text is a text node');
  // Change password: the current password first (an isolated check), a code only when Supabase asks
  const pw = src.slice(src.indexOf('V.password = '), src.indexOf("V.signout = "));
  assert.match(pw, /name: 'current', label: 'Current password', autocomplete: 'current-password'/);
  assert.match(pw, /updatePassword\(\{ current: v\.current, password: v\.password \}\)/);
  assert.match(pw, /if \(r\.needsCode\)/, 'the code step only when the server wants it');
  assert.match(pw, /Forgot your password\?/, 'forgot-password one tap away');
  assert.doesNotMatch(src, /Email me a code|'send-code'/, 'no always-ask-for-a-code step');
  // Delete account and Remove this phone's data: a sombre Mallow from the first frame
  assert.match(src, /const SOMBRE = \['delete', 'device-data'\]/);
  assert.match(src, /mood\(v\.mood \|\| 'idle', \{ instant: sombre\(\) \}\)/);
  assert.match(src, /if \(m === 'happy' && sombre\(\)\) return;/, 'a late happy from an earlier screen is ignored there');
  assert.match(src, /h\('strong', \{ class: 'hm-account-word'/, 'the word to type stands out');
  const main = readFileSync(`${ROOT}src/app/main.js`, 'utf8');
  assert.match(main, /account: \(\) => import\('\.\/scenes\/account\.js'\)/);
  assert.match(main, /app\.auth\.start\(\{ store, prefs \}\)/, 'signed in: the session check, then the opt-in sync');
  const css = readFileSync(`${ROOT}src/ui/account.css`, 'utf8');
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /--kb/);
  // nothing in the scene or the CSS is smaller than the 13 px reading floor
  for (const m of css.matchAll(/font(?:-size)?:[^;{}]*?\b(\d+(?:\.\d+)?)px/g)) assert.ok(+m[1] >= 13, m[0]);
});

test('the home Mallow: one chain for the picker and the Mallow above the card, the way the Hushfold picks it', async () => {
  const { MALLOW_IDS } = await import('../src/mallows/registry.js');
  const ids = [...MALLOW_IDS];
  assert.deepEqual([0, 5, 6, 10, 11, 16, 17, 20, 21, 23].map((hr) => VM.mallowForHour(hr)), ['noomi', 'noomi', 'boppo', 'boppo', 'pipzi', 'pipzi', 'loomi', 'loomi', 'noomi', 'noomi']);
  // nobody has picked one: the Mallow on the stage (the time of day), said honestly
  assert.deepEqual(VM.homeMallow({ ids, onStage: 'pipzi' }), { id: 'pipzi', chosen: false });
  assert.deepEqual(VM.homeMallow({ ids, hour: 22 }), { id: 'noomi', chosen: false }, 'no stage yet: the hour, never a Blubi fallback');
  assert.equal(VM.homeMallowLine('Pipzi', false), 'Pipzi is greeting you for now. Until you pick one, it changes with the time of day.');
  // a pick this visit wins, then the one this device last chose; the stage only follows them
  assert.deepEqual(VM.homeMallow({ ids, statePick: 'zuzu', prefsPick: 'loomi', onStage: 'pipzi' }), { id: 'zuzu', chosen: true });
  assert.deepEqual(VM.homeMallow({ ids, prefsPick: 'loomi', onStage: 'pipzi' }), { id: 'loomi', chosen: true });
  assert.deepEqual(VM.homeMallow({ ids, statePick: 'nope', prefsPick: 'also-nope', onStage: 'boppo' }), { id: 'boppo', chosen: false });
  assert.equal(VM.homeMallowLine('Loomi', true), 'Loomi greets you here and on the Hushfold.');
  // the scene uses this chain for both, and the account's own pick only fills a device that has none
  const src = readFileSync(`${ROOT}src/app/scenes/account.js`, 'utf8');
  assert.match(src, /createAuthMallow\(mallowEl, \{ id: shownMallow\(\)\.id/);
  assert.match(src, /const now = shownMallow\(\);/);
  assert.match(src, /p\.profile\.homeMallow && !shownMallow\(\)\.chosen/);
  assert.doesNotMatch(src, /pickMallow\(/, 'no second chain');
});

test('an arrival names the account it signed in (shortened); the guest question names it in full', async () => {
  const { maskEmail } = await import('../src/auth/namespace.js');
  const { noticeText, NOTICE_TEXT } = await import('../src/auth/boot.js');
  assert.equal(maskEmail('ana@example.com'), 'an…@example.com');
  assert.equal(maskEmail('b@example.com'), 'b…@example.com');
  assert.equal(maskEmail('bo@x.io'), 'b…@x.io');
  assert.equal(maskEmail('not an email'), null);
  assert.equal(maskEmail(null), null);
  const acct = { mode: 'account', uid: '11111111-1111-4111-8111-111111111111', email: 'ana@example.com' };
  assert.equal(noticeText('signed-in', acct), 'You’re signed in as an…@example.com.');
  assert.equal(noticeText('verified', acct), 'Your email is confirmed. You’re signed in as an…@example.com.');
  assert.equal(noticeText('signed-out', { mode: 'guest' }), NOTICE_TEXT['signed-out']);
  assert.equal(noticeText('signed-in', { mode: 'account', email: null }), NOTICE_TEXT['signed-in']);
  assert.equal(noticeText('nonsense', acct), null);
  const main = readFileSync(`${ROOT}src/app/main.js`, 'utf8');
  assert.match(main, /noticeText\(AUTH\.notice, AUTH\.ns\)/);
  const cb = readFileSync(`${ROOT}src/auth/callback.js`, 'utf8');
  assert.match(cb, /You’re signed in\$\{as\(r\.email\)\}/);
  const src = readFileSync(`${ROOT}src/app/scenes/account.js`, 'utf8');
  assert.match(src, /V\['guest-choice'\] = \(o\) => \{[\s\S]{0,400}You’re signed in as /);
  assert.match(src, /go\('guest-choice', \{ email: r\.email/);
  // a field's error sits right under that field (Change password: "That password doesn't match." under Current)
  assert.match(src, /if \(target\) target\.hintEl\.after\(errEl\); else actionsEl\.before\(errEl\);/);
  // an address stays together (moves to the next line whole), punctuation kept with it
  assert.match(src, /strong\(o\.email \|\| u\.email \|\| 'your email', '\.'\)/);
  const css = readFileSync(`${ROOT}src/ui/account.css`, 'utf8');
  assert.match(css, /\.hm-account-strong \{ display: inline-block; max-width: 100%;/);
});
