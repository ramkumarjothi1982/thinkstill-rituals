// Hushmallow — your second brain for feelings.
// App bootstrap: storage, preferences, entitlements, recommender, the
// persistent Hushfold stage and a tiny scene router with real history.

import { createStore } from '../engine/storage.js';
import { createPrefs } from './prefs.js';
import { createEntitlements } from './entitlements.js';
import { createRecommender } from '../engine/recommend.js';
import { createWorld } from './world.js';
import { RITUALS } from '../data/rituals.js';
import { AVAILABLE } from '../rituals/index.js';
import { toast } from './ui.js';

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

app.go = async function go(name, params = {}, { replace = false, fromPop = false } = {}) {
  const load = SCENES[name];
  if (!load) throw new Error(`No scene ${name}`);
  const mod = await load();
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
  document.title = view.title ? `${view.title} · Hushmallow` : 'Hushmallow';
  sceneEl.querySelector('h1, h2, [data-focus]')?.setAttribute('tabindex', '-1');
};
app.back = () => history.back();

window.addEventListener('popstate', (e) => {
  const i = e.state?.i ?? 0;
  if (current?.blockBack) { history.pushState({ i: stack.length - 1 }, '', location.hash); current.blockBack(); return; }
  stack.length = Math.max(1, i + 1);
  const entry = stack[stack.length - 1] || { name: 'home', params: {} };
  app.go(entry.name, entry.params, { fromPop: true });
});

const SCENES = {
  home: () => import('./scenes/home.js'),
  express: () => import('./scenes/express.js'),
  encounter: () => import('./scenes/encounter.js'),
  ritual: () => import('./scenes/ritual.js'),
  landing: () => import('./scenes/landing.js'),
  plans: () => import('./scenes/plans.js'),
  mallows: () => import('./scenes/mallows.js'),
  settings: () => import('./scenes/settings.js'),
  angle: () => import('./scenes/angle.js'),
  library: () => import('./scenes/library.js'),
};

async function boot() {
  app.world = createWorld({ prefs, audio: audioProxy });
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
  });
  ent.refresh().catch(() => {});
  if (await devLab()) return;
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

boot();
window.__hush = app;
