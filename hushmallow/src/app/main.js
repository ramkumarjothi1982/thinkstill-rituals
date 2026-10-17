// hushmallow — your second brain for feelings.
// App bootstrap: storage, preferences, entitlements, recommender, the
// persistent Hushfold stage and a tiny scene router with real history.
// 'home' is the Hushfold (src/app/scenes/hushfold.js); the old home screen
// stays reachable as 'classic' for QA and rollback.

import { authBoot, createAuthHandle, NOTICE_TEXT, noticeText } from '../auth/boot.js';
import { createPrefs } from './prefs.js';
import { createEntitlements, PLANS } from './entitlements.js';
import { createBilling, takeReturn, welcomeBack, planNow } from './billing.js';
import { resumeChange } from './plan-change.js';
import { createRecommender } from '../engine/recommend.js';
import { createWorld } from './world.js';
import { RITUALS } from '../data/rituals.js';
import { AVAILABLE } from '../rituals/index.js';
import { toast, createSheetHistory, setSheetHistory } from './ui.js';
import { createLayers, closeLayerOnBack } from './layers.js';
import { newerVersion, moveTo } from './update.js';
import { docTitle } from '../brand.js';

// Sign-in (optional, src/auth/): which local namespace this page runs in is
// decided here, synchronously, from the session already on this device. With
// sign-in off this is exactly createStore() and nothing else changes.
const AUTH = authBoot();
const store = AUTH.store;
const prefs = createPrefs(store);
// Web subscriptions (src/app/billing.js): null unless src/app/config.js switches them on and this build has
// sign-in; then the plans page sells through Stripe and a plan is the billing server's answer for the account.
// Always null in the App Store app's shell (createBilling checks for its StoreKit bridge), so app.billing, and with it
// the consent card's, the delete screen's and Another Angle's web-billing branches, never run there
const billing = createBilling({ auth: () => app.auth, signIn: !!AUTH.config.enabled && !AUTH.forwarding });
const ent = createEntitlements({ store, billing });

// sound + haptics engines load lazily; silent stubs until then
const silent = { play() {}, ui() {}, fx() {}, hold() { return { update() {}, stop() {} }; }, ambience() {}, setAmbienceMood() {}, stopAmbience() {}, unlock() {}, setEnabled() {}, setVolume() {} };
let audio = silent;
let hapticFn = () => {};
// Sound is decoration: an audio error must never stop a ritual.
const audioProxy = new Proxy({}, { get: (_, k) => (...a) => {
  try {
    if (prefs.get('sound') || k === 'unlock') return audio[k]?.(...a) ?? (k === 'hold' ? silent.hold() : undefined);
  } catch (e) { console.warn('[audio]', k, e); }
  return k === 'hold' ? silent.hold() : undefined;
} });

const app = {
  store, prefs, ent,
  rec: createRecommender({ rituals: RITUALS, store, modules: AVAILABLE }),
  audio: audioProxy,
  haptic: (k) => { if (prefs.get('haptics')) hapticFn(k); },
  toast,
  state: { input: null, ritual: null, result: null, mallow: null },
  world: null,
  scenes: {},
  auth: null,
  billing,
};

const sceneEl = document.getElementById('scene');
let current = null;
const stack = [];

// A newer deploy takes over at a safe moment: at start, or when the person
// is back on the home screen (never mid-ritual or mid-sentence). Code from
// an older deploy that can no longer load also moves to the newer one.
// The Hushfold is where people stay, so it decides when that moment is:
// safeForUpdate() is false while words are being typed, a world is
// mid-progress or a discovery waits to be acknowledged.
let newer = null;
const safeToUpdate = () => { try { return current?.safeForUpdate?.() ?? true; } catch { return false; } };

// Signing in or out reloads the page into the right namespace: at once when
// the person asked for it (the account screen), otherwise (a session that
// expired, another tab) at the same kind of safe moment as an update.
let authReload = null;
const CALM_SCENES = ['account', 'settings'];
function reloadForAuth() {
  const hash = authReload?.hash || '#home';
  authReload = null;
  try { const u = new URL(location.href); u.hash = hash; history.replaceState(null, '', u.href); } catch { /* keep the URL */ }
  location.reload();
}
const authSafeNow = () => {
  const top = stack[stack.length - 1]?.name;
  return CALM_SCENES.includes(top) || (top === 'home' && safeToUpdate());
};
// what this page says when it did not ask for the reload itself: an expired session, or another tab
// of this device that deleted the account, signed out removing its things, or removed this phone's copy
const LATER_NOTICE = { expired: 'expired', 'deleted-elsewhere': 'deleted', 'removed-elsewhere': 'signed-out', 'cleared-elsewhere': 'device-cleared' };
app.auth = createAuthHandle(AUTH, {
  onReload: ({ urgent, hash, reason }) => {
    authReload = { hash };
    const kind = LATER_NOTICE[reason];
    if (urgent || authSafeNow()) {
      // the calm line shows once, after the reload
      if (kind) { try { sessionStorage.setItem('hm2:auth.notice', kind); } catch { /* no line then */ } }
      reloadForAuth();
    } else if (kind) toast(NOTICE_TEXT[kind], 4200);   // say it now; the reload waits for a calm moment
  },
});
/**
 * A plan Stripe has confirmed (src/app/plan-change.js, billing.js welcomeBack): its welcome (src/app/scenes/beyond-welcome.js)
 * over the Hushfold or a quiet screen; mid-ritual or mid-conversation (a check when the app came back on screen) a line
 * says it instead, so nothing covers what the person is in the middle of.
 */
const WELCOME_SCENES = ['home', 'plans', 'settings', 'account', 'mallows', 'library', 'journey', 'garden', 'landing', 'classic'];
app.welcomePlan = async (result) => {
  const top = stack[stack.length - 1]?.name;
  if (!WELCOME_SCENES.includes(top)) {
    toast(`Welcome to ${PLANS[result?.tier]?.name || 'your new plan'}`, 3200);
    app.haptic('success');
    return null;
  }
  return (await import('./scenes/beyond-welcome.js')).openPlanWelcome(app, result);
};
async function checkVersion() {
  newer = (await newerVersion()) || newer;
  if (newer && stack[stack.length - 1]?.name === 'home' && safeToUpdate()) moveTo(newer);
  return newer;
}
/** Called by the Hushfold when it becomes idle again (overlay closed, discovery acknowledged…). */
app.applyUpdateIfSafe = () => {
  if (authReload && authSafeNow()) { reloadForAuth(); return true; }
  if (newer && stack[stack.length - 1]?.name === 'home' && safeToUpdate()) { moveTo(newer); return true; }
  return false;
};
/**
 * Code from this deploy failed to load (a lazy import after a newer deploy
 * removed this version's folder): look for the newer version and move to it
 * now if the moment is safe, else at the next safe moment (back home, the
 * Hushfold idle). Resolves true when it is moving now.
 */
app.staleCode = async () => {
  newer = (await newerVersion()) || newer;
  return app.applyUpdateIfSafe();
};
const STALE_IMPORT = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i;
addEventListener('unhandledrejection', (e) => { if (STALE_IMPORT.test(String(e.reason?.message ?? e.reason ?? ''))) app.staleCode(); });

// scenes that may not be in this build yet: a gentle note instead of an error
const OPTIONAL_SCENES = { garden: 'The Memory Garden opens soon.' };

// Only the newest go() mounts its scene and names the tab: a scene that is
// still loading when another go() starts (two quick taps, Back during a
// load) is dropped instead of landing on top of the newer one.
let goSeq = 0;

app.go = async function go(name, params = {}, { replace = false, fromPop = false } = {}) {
  // words waiting to come back to the Hushfold (Continue → plans → home) are never lost to a reload;
  // the Hushfold itself decides once they are on stage (safeForUpdate, applyUpdateIfSafe)
  if (newer && name === 'home' && !app.state.pendingTell && safeToUpdate()) { moveTo(newer); return; }
  if (authReload && name === 'home' && !app.state.pendingTell && safeToUpdate()) { reloadForAuth(); return; }
  const load = SCENES[name];
  if (!load) throw new Error(`No scene ${name}`);
  const seq = ++goSeq;
  // a layer that just closed is still stepping history back: let it land first
  await popsSettled();
  let mod;
  try { mod = await load(); } catch (e) {
    if (await checkVersion()) return moveTo(newer);
    if (seq !== goSeq) return null;
    if (OPTIONAL_SCENES[name]) { console.warn(`[scene ${name}]`, e?.message || e); toast(OPTIONAL_SCENES[name], 3200); return null; }
    throw e;
  }
  if (seq !== goSeq) return null;   // a newer go() took over while this scene loaded
  if (typeof mod?.default !== 'function') {
    if (OPTIONAL_SCENES[name]) { toast(OPTIONAL_SCENES[name], 3200); return null; }
    throw new Error(`Scene ${name} has no default export`);
  }
  // a scene change closes every sheet still open (Back closes the newest first; this is the safety net
  // for a scene that moves on by itself), stepping back over their entries before the next one is pushed
  if (layers.popMany(sheets.closeAll())) { await popsSettled(); if (seq !== goSeq) return null; }
  layers.forget();
  try { await current?.leave?.(); } catch (e) { console.warn(e); }
  sceneEl.replaceChildren();
  const view = mod.default(app, params);
  current = view;
  if (view.el) { view.el.classList.add('scene-enter'); sceneEl.append(view.el); }
  if (!fromPop) {
    const entry = { name, params };
    if (replace) { stack[stack.length - 1] = entry; history.replaceState({ i: stack.length - 1 }, '', `#${name}`); }
    else { stack.push(entry); history.pushState({ i: stack.length - 1 }, '', `#${name}`); }
  }
  await view.enter?.();
  if (name === 'home') checkVersion();
  if (seq === goSeq) document.title = docTitle(view.title);
  sceneEl.querySelector('h1, h2, [data-focus]')?.setAttribute('tabindex', '-1');
};
app.back = () => history.back();

// Transient layers (the Hushfold's input, side panel, reader, the account's
// deeper screens, every sheet) get a history entry of their own, so Back
// closes them first, even on the root scene (src/app/layers.js).
// app.pushLayer() → token; app.popLayer(token) removes the entry when the
// layer closes another way (✕, Escape, send). On Back the scene's
// blockBack(token) gets the token of the entry that was just consumed and
// closes that layer only (it must not call popLayer for it). Sheets
// (openSheet in ui.js) take part by themselves: Back on a sheet's entry
// closes that sheet before the scene hears of it, and a scene change closes
// the sheets still open. app.go() forgets the other layers (they become
// plain duplicates).
const layers = createLayers({ history, index: () => stack.length - 1, here: () => location.hash });
const popsSettled = () => layers.settled();
// every sheet's own entry (src/app/ui.js); a scene that asks for a layer as it opens a sheet owns that sheet's entry
const sheets = createSheetHistory({ push: () => layers.push(), pop: (t) => layers.popMany([t]) });
setSheetHistory(sheets);
app.pushLayer = () => { const t = layers.push(); sheets.claim(t); return t; };
app.popLayer = (t) => { layers.popMany([t]); };

window.addEventListener('popstate', (e) => {
  const t = layers.onPop();
  if (t === 'ours') return;   // one of our own steps back landing
  // Back consumed the newest layer's entry: a sheet's closes that sheet; else the scene closes the
  // layer that owns that token, without stepping history back again (so two open layers take two Backs)
  if (t) { closeLayerOnBack(t, { sheets, scene: current }); return; }
  const i = e.state?.i ?? 0;
  // the scene keeps Back for itself (a ritual asks first): its entry comes back, under its own name
  // (location.hash already names the entry Back went to)
  if (current?.blockBack) { history.pushState({ i: stack.length - 1 }, '', `#${stack[stack.length - 1]?.name || 'home'}`); current.blockBack(); return; }
  stack.length = Math.max(1, i + 1);
  const entry = stack[stack.length - 1] || { name: 'home', params: {} };
  app.go(entry.name, entry.params, { fromPop: true });
});

const SCENES = {
  home: () => import('./scenes/hushfold.js'),
  classic: () => import('./scenes/home.js'),
  garden: () => import('./scenes/garden.js'),
  express: () => import('./scenes/express.js'),
  encounter: () => import('./scenes/encounter.js'),
  ritual: () => import('./scenes/ritual.js'),
  landing: () => import('./scenes/landing.js'),
  plans: () => import('./scenes/plans.js'),
  mallows: () => import('./scenes/mallows.js'),
  settings: () => import('./scenes/settings.js'),
  angle: () => import('./scenes/angle.js'),
  library: () => import('./scenes/library.js'),
  journey: () => import('./scenes/journey.js'),
  account: () => import('./scenes/account.js'),
};

async function boot() {
  // back from Stripe (?billing=…): out of the address before anything else reads or keeps it, and the plan as kept
  // before the trip (before the first check below), so the way back from the portal can tell when its change arrives
  // (and a change kept in this tab from a page that was not signed in is judged against this account's own plan)
  const billingBack = billing ? takeReturn() : null;
  const planBefore = billing ? planNow(ent) : null;
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkVersion(); });
  // a web plan is checked again whenever the app comes back to the foreground (at most once a minute)
  if (billing) document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') ent.refresh().catch(() => {}); });
  // a change of plan Stripe had not confirmed yet in time (src/app/plan-change.js): asked again quietly when the app is back
  if (billing) document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') resumeChange(app, { quiet: true }).catch(() => {}); });
  // a page left open for hours still hears about a new deploy (only while it is on screen)
  setInterval(() => { if (document.visibilityState === 'visible') checkVersion(); }, 10 * 60 * 1000);
  app.world = createWorld({ prefs, audio: audioProxy, haptic: (k) => app.haptic(k) });
  applyTextScale(prefs.get('textScale'));
  const styles = ensureStylesheet('../ui/hushfold.css');
  // unlock sound on the first gesture (browsers require it)
  const unlock = () => { audio.unlock?.(); removeEventListener('pointerdown', unlock); };
  addEventListener('pointerdown', unlock);
  import('../engine/audio.js').then((m) => {
    audio = m.audio || silent;
    audio.setEnabled?.(prefs.get('sound'));
    audio.setVolume?.(prefs.get('volume'));
    app.world.setAudio(prefs.get('sound') ? audioProxy : null);
  }).catch(() => {});
  import('../engine/haptics.js').then((m) => { hapticFn = m.haptic || hapticFn; }).catch(() => {});
  prefs.onChange((k, v) => {
    if (k === 'sound') { audio.setEnabled?.(v); app.world.setAudio(v ? audioProxy : null); if (!v) audio.stopAmbience?.(); }
    if (k === 'volume') audio.setVolume?.(v);
    if (k === 'motion') app.world.setReducedMotion(prefs.reducedMotion());
    if (k === 'haptics') app.world.setHaptics(v);
    if (k === 'lowStim') app.world.setLowStim(v);
    if (k === 'textScale') applyTextScale(v);
  });
  ent.refresh().catch(() => {});
  if (await devLab()) return;
  await styles;
  await import('../ui/type.js').then((t) => t.fontsReady(['voice', 'ui'], 700), () => false);   // font gate: DOM text appears in its final face (the Mallow canvas is already live)
  history.replaceState({ i: 0 }, '', '#home');
  stack.push({ name: 'home', params: {} });
  await app.go('home', { intro: !prefs.get('seenIntro') }, { replace: true });
  if (app.auth.enabled) afterAuthBoot();
  if (billingBack) welcomeBack(app, billingBack, { before: planBefore }).catch(() => {});
  // a reload while a change of plan was being confirmed (kept in this tab for 15 minutes): it carries on
  else if (billing) resumeChange(app, { before: planBefore }).catch(() => {});
}

/** Sign-in on: the notice from before a reload, a deep link to the account, and the session check. */
function afterAuthBoot() {
  const said = AUTH.notice ? noticeText(AUTH.notice, AUTH.ns) : null;   // an arrival names the account (shortened)
  // /#account (an email link, a bookmark) opens the account over the Hushfold, so Back comes home;
  // a first sign-in on this device opens it too, to ask once about this device's guest things.
  // Deep links: #account is the only one honoured (sign-in builds only); any other hash
  // (#garden, #settings, #plans, #angle…) opens the Hushfold, on purpose (docs/AUTH.md).
  const opensAccount = AUTH.deepLink === 'account' || AUTH.guestChoice;
  // the account scene says an arrival on its card (or toasts it itself); everywhere else it is a toast
  if (said && !opensAccount) setTimeout(() => toast(said, 3600), 500);
  // (a guest's #account opens only on a project ready for sign-in — src/auth/readiness.js; an account's never waits)
  if (opensAccount && AUTH.ns.mode !== 'account') {
    app.auth.ready().then((ok) => { if (ok && stack[stack.length - 1]?.name === 'home') app.go('account', { arrived: AUTH.notice || null, notice: said }); }, () => {});
  } else if (opensAccount) app.go('account', { arrived: AUTH.notice || null, notice: said });
  // signed in: supabase-js loads after the first screen, checks the session with the server,
  // then keeps in step only what the person opted into on the account screen (src/auth/autosync.js)
  if (AUTH.ns.mode === 'account') {
    const start = () => app.auth.start({ store, prefs }).catch((e) => console.warn('[auth]', e?.code || e?.message || e));
    if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 2500 }); else setTimeout(start, 1200);
  }
}

// Developer ritual lab (localhost only): run any module inside the real shell.
//   index.html?lab=src/rituals/<module>.js&spec=src/rituals/specs/<id>.js
//              &text=...&emotions=anger,hurt&intensity=0.7
// The spec module's default export is the ritual spec. Grants a local test
// tier for the session; never active on a deployed host.
async function devLab() {
  const qs = new URLSearchParams(location.search);
  if ((qs.get('v3') || qs.get('engine')) && ['localhost', '127.0.0.1'].includes(location.hostname)) return v3Lab(qs);
  // Hushflow lab (W4): ?hushflow=static-storm — see src/hushfold/flow/lab.js for the parameters
  if (qs.get('hushflow') && ['localhost', '127.0.0.1'].includes(location.hostname)) return (await import('../hushfold/flow/lab.js')).hushflowLab(app, qs);
  // Memory Garden lab (W5): ?gardenlab=install|offer|garden — see src/hushfold/garden-install.js gardenLab()
  if (qs.get('gardenlab') && ['localhost', '127.0.0.1'].includes(location.hostname)) return (await import('../hushfold/garden-install.js')).gardenLab(app, qs);
  if (!qs.get('lab') || !['localhost', '127.0.0.1'].includes(location.hostname)) return false;
  const base = new URL('../../', import.meta.url);
  const [mod, specMod] = await Promise.all([import(new URL(qs.get('lab'), base).href), qs.get('spec') ? import(new URL(qs.get('spec'), base).href) : null]);
  const spec = specMod?.default || { id: 'lab', name: 'Lab ritual', tier: 'paid', mallows: [qs.get('mallow') || 'blubi'], world: { realm: 'raindrop-lagoon' }, moves: [{ id: 'm', prompt: 'm', kind: 'k' }], checkIn: 'How is it now?' };
  if (ent.tier() === 'none' || (spec.tier === 'ultra' && !ent.has('ultra'))) await ent.purchase(spec.tier === 'ultra' ? 'ultra' : 'paid');
  const emotions = (qs.get('emotions') || '').split(',').filter(Boolean).map((id) => ({ id, confidence: 1, intensity: Number(qs.get('intensity') || 0.7) }));
  app.state.input = { text: qs.get('text') || '', emotions, intensity: Number(qs.get('intensity') || 0.7), contexts: [], desires: [], safety: { level: 'none' } };
  app.state.ritual = { ...spec, __load: async () => mod };
  history.replaceState({ i: 0 }, '', '#home');
  stack.push({ name: 'home', params: {} });
  await app.go('ritual', { id: spec.id });
  return true;
}

// V3 lab (localhost only): play one of the 1,000 rituals straight away.
//   index.html?v3=HM-0001&photos=3&text=I%27m%20furious%20about%20work
//   index.html?engine=GE-07&law=3&photos=0      (any engine × law pair, built or not)
//   photos=0 plays with the seven Mallow cards; add &mallows=0 for none at all
async function v3Lab(qs) {
  const R = await import('../v3/rituals.js');
  const code = qs.get('v3') || R.codeFor(qs.get('engine').toUpperCase(), qs.get('law') || 1);
  const spec = R.specFor(code);
  if (!spec) return false;
  spec.params.v3.force = true;
  // QA sweeps only: run the host clock faster (pacing only; every step still needs input)
  if (qs.get('speed')) spec.params.v3.speed = Math.max(1, Math.min(6, Number(qs.get('speed')) || 1));
  if (qs.get('mallows') === '0') spec.params.v3.noMallows = true;
  if (!ent.has('ultra')) await ent.purchase('ultra');
  const n = Number(qs.get('photos') || 0);
  if (n > 0) {
    const [{ samplePhotos }, { addPhotoCanvases, photoSession }] = await Promise.all([import('../v3/dev/sample-photos.js'), import('../v3/photos.js')]);
    photoSession.clear(); addPhotoCanvases(samplePhotos(n));
  }
  const text = qs.has('text') ? qs.get('text') : 'I’m so angry about what happened at work today';
  app.state.input = { text, emotions: spec.emotions.map((id) => ({ id, confidence: 1, intensity: 0.7 })), intensity: 0.7, contexts: [], desires: [], safety: { level: 'none' } };
  if (qs.get('motion') === 'reduce') prefs.set('motion', 'reduced');
  app.state.ritual = spec;
  history.replaceState({ i: 0 }, '', '#home');
  stack.push({ name: 'home', params: {} });
  await app.go('ritual', { id: spec.id });
  return true;
}

/** The Hushfold stylesheet, unless index.html already links it. Resolves when loaded (or after 1.5 s). */
function ensureStylesheet(rel) {
  const href = new URL(rel, import.meta.url).href;
  const name = href.split('/').pop();
  if ([...document.querySelectorAll('link[rel="stylesheet"]')].some((l) => (l.getAttribute('href') || '').endsWith(name))) return Promise.resolve();
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  const done = new Promise((r) => { link.onload = r; link.onerror = r; setTimeout(r, 1500); });
  document.head.append(link);
  return done;
}

/** Text size (Settings): 1 | 1.12 | 1.25 on every voice / UI type token. */
function applyTextScale(k) {
  const v = [1, 1.12, 1.25].includes(+k) ? +k : 1;
  import('../ui/type.js').then((m) => m.setTextScale(v)).catch(() => {
    if (v === 1) document.documentElement.style.removeProperty('--type-scale');
    else document.documentElement.style.setProperty('--type-scale', String(v));
  });
}

if (!AUTH.forwarding) boot();   // a sign-in link that landed here is on its way to /auth/callback
window.__hush = app;
