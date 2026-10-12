// hushmallow — your second brain for feelings.
// App bootstrap: storage, preferences, entitlements, recommender, the
// persistent Hushfold stage and a tiny scene router with real history.
// 'home' is the Hushfold (src/app/scenes/hushfold.js); the old home screen
// stays reachable as 'classic' for QA and rollback.

import { createStore } from '../engine/storage.js';
import { createPrefs } from './prefs.js';
import { createEntitlements } from './entitlements.js';
import { createRecommender } from '../engine/recommend.js';
import { createWorld } from './world.js';
import { RITUALS } from '../data/rituals.js';
import { AVAILABLE } from '../rituals/index.js';
import { toast } from './ui.js';
import { newerVersion, moveTo } from './update.js';
import { docTitle } from '../brand.js';

const store = createStore();
const prefs = createPrefs(store);
const ent = createEntitlements({ store });

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
async function checkVersion() {
  newer = (await newerVersion()) || newer;
  if (newer && stack[stack.length - 1]?.name === 'home' && safeToUpdate()) moveTo(newer);
  return newer;
}
/** Called by the Hushfold when it becomes idle again (overlay closed, discovery acknowledged…). */
app.applyUpdateIfSafe = () => {
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
  layers.length = 0;
  pendingPush.clear();
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

// Transient layers (the Hushfold's input, side panel, reader) get a history
// entry of their own, so Back closes them first, even on the root scene.
// pushLayer() → token; popLayer(token) removes the entry when the layer
// closes another way (✕, Escape, send). On Back the scene's blockBack(token)
// gets the token of the entry that was just consumed and closes that layer
// only (it must not call popLayer for it). app.go() forgets them (they
// become plain duplicates).
const layers = [];
let layerSeq = 0, ignorePops = 0;
const popWaiters = [];
const popsSettled = () => (ignorePops ? new Promise((r) => { popWaiters.push(r); setTimeout(r, 400); }) : null);
// A layer that opens while another's history.back() is still in flight (the panel closing as the
// overlay opens, in one tap) waits for that pop to land, or its new entry would be the one popped.
const pendingPush = new Map();   // token → push()
app.pushLayer = () => {
  const t = ++layerSeq;
  layers.push(t);
  const push = () => { if (ignorePops && !pendingPush.has(t)) return; pendingPush.delete(t); history.pushState({ i: stack.length - 1, layer: t }, '', location.hash); };
  if (!ignorePops) push();
  else { pendingPush.set(t, push); popWaiters.push(() => pendingPush.get(t)?.()); setTimeout(() => pendingPush.get(t)?.(), 500); }
  return t;
};
app.popLayer = (t) => {
  const k = layers.lastIndexOf(t);
  if (k < 0) return;
  layers.splice(k, 1);
  if (pendingPush.delete(t)) return;   // its entry was never pushed: nothing to step back over
  ignorePops++; history.back();
};

window.addEventListener('popstate', (e) => {
  if (ignorePops > 0) { ignorePops--; if (!ignorePops) popWaiters.splice(0).forEach((r) => r()); return; }
  // Back consumed the newest layer's entry: the scene closes the layer that owns that
  // token, without stepping history back again (so two open layers take two Backs)
  if (layers.length) { const t = layers.pop(); try { const close = current?.blockBack; if (typeof close === 'function') close(t); } catch (err) { console.warn(err); } return; }
  const i = e.state?.i ?? 0;
  if (current?.blockBack) { history.pushState({ i: stack.length - 1 }, '', location.hash); current.blockBack(); return; }
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
};

async function boot() {
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkVersion(); });
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

boot();
window.__hush = app;
