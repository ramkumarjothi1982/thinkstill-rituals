// Hushmallow Sensory Lab — standalone development shell.
//
// Not the production app: no auth, no payments, no network. It imports the
// main app's Mallow rig, art and design tokens read-only, and keeps its own
// settings under its own storage key. Routes: #/ (lab home), #/<experience>.

import { h, iconBtn, segmented, openSheet } from './lab-ui.js';
import { EXPERIENCES, byId } from './features/registry.js';
import { Prefs } from './core/prefs.js';
import { SoundEngine } from './core/sound-engine.js';
import { Companion } from './core/companion.js';
import { initialTier, FrameMonitor, NEXT_TIER } from './core/perf.js';
import { MALLOWS, MALLOW_IDS } from '../src/mallows/registry.js';
import { ComfortDNA } from './core/comfort-dna.js';
import { LocalComfortStore } from './adapters/comfort-store.js';
import { MATERIALS } from './core/materials.js';
import { pocketById } from './features/pocket/catalog.js';

const params = new URLSearchParams(location.search);
const root = document.getElementById('lab');
const prefs = new Prefs();
const sound = new SoundEngine({ volume: prefs.get('volume'), muted: !prefs.get('sound') });
const dna = await new ComfortDNA(new LocalComfortStore()).load();

// Which Mallow: ?mallow=<id> locally (the query string never reaches a hosted
// preview), else the Comfort DNA favourite, else the last one picked, else Boppo.
const DEFAULT_MALLOW = 'boppo';
const askMallow = (params.get('mallow') || '').toLowerCase();
const validMallow = (id) => (MALLOW_IDS.includes(id) ? id : null);
const chosenMallow = () => (dna.enabled ? dna.get('favouriteMallow') : validMallow(prefs.get('mallow'))) || DEFAULT_MALLOW;
let mallowId = validMallow(askMallow) || chosenMallow();

const qParam = params.get('quality');
let quality = ['high', 'medium', 'low'].includes(qParam) ? qParam : initialTier(prefs.get('quality'));

const ctx = {
  prefs, sound, dna,
  get mallowId() { return mallowId; },
  /** Switch Mallow: remembered as the favourite when personalisation is on. */
  setMallow(id) {
    if (!validMallow(id)) return;
    mallowId = id;
    if (dna.enabled) dna.set('favouriteMallow', id); else prefs.set('mallow', id);
  },
  get quality() { return quality; },
  companion: null,
  setCompanion(c) { ctx.companion = c; lab.companion = c; },
  navigate(path) { go(path.replace(/^\/+/, '') || 'home'); },
  openSettings: () => settings(),
  monitor: null,
  log: (e) => { lab.events.push({ ...e, t: Math.round(performance.now()) }); if (lab.events.length > 200) lab.events.shift(); },
};

// adaptive quality (auto only): step down a tier if frames are consistently slow
function startMonitor() {
  ctx.monitor = new FrameMonitor((p75) => {
    const next = NEXT_TIER[quality];
    if (!next) { ctx.monitor.enabled = false; return; }
    console.info(`[sensory-lab] frames ~${p75.toFixed(1)} ms → quality ${next}`);
    quality = next;
    ctx.companion?.rig.setQuality(next);
  });
}
if (!qParam && prefs.get('quality') === 'auto') startMonitor();

// Theme: 'system' leaves the root alone, so the device setting (or a theme the
// hosting page sets on the root) decides; 'dark' / 'light' override it.
const rootEl = document.documentElement;
let hostTheme = rootEl.getAttribute('data-theme');
// An explicit Dark/Light wins over the host, but only up to 3 host overrides per
// choice: a host that keeps re-applying its own theme is never fought for long.
// (the allowance refills after 5 quiet seconds, so an occasional host change never wins for good)
let themeBudget = 3;
let lastHostWrite = 0;
const themeObserver = new MutationObserver(() => {
  hostTheme = rootEl.getAttribute('data-theme');   // only host writes reach here (ours are discarded below)
  const now = performance.now();
  if (now - lastHostWrite > 5000) themeBudget = 3;
  lastHostWrite = now;
  const t = prefs.get('theme');
  if ((t === 'dark' || t === 'light') && hostTheme !== t && themeBudget > 0) { themeBudget--; applyTheme(); }
});
themeObserver.observe(rootEl, { attributes: true, attributeFilter: ['data-theme'] });
function applyTheme() {
  const t = prefs.get('theme');
  const want = t === 'dark' || t === 'light' ? t : hostTheme;
  if (want) rootEl.setAttribute('data-theme', want); else rootEl.removeAttribute('data-theme');
  themeObserver.takeRecords();   // our own write is not a host change
}
applyTheme();
prefs.onChange((k, v) => {
  if (k === 'sound' || k === '*') sound.setMuted(!prefs.get('sound'));
  if (k === 'volume' || k === '*') sound.setVolume(prefs.get('volume'));
  if (k === 'theme' || k === '*') { themeBudget = 3; applyTheme(); }
  if (k === 'motion' || k === '*') ctx.companion?.setReducedMotion(prefs.reducedMotion());
  if (k === 'showMesh') ctx.companion?.setShowMesh(v);
  if (k === 'quality') {
    if (v === 'auto') { quality = initialTier('auto'); ctx.companion?.rig.setQuality(quality); startMonitor(); }
    else { quality = v; ctx.companion?.rig.setQuality(v); if (ctx.monitor) ctx.monitor.enabled = false; }
  }
});

// Comfort DNA changes reach a live Mallow straight away
dna.onChange((what) => {
  const t = dna.tuning();
  sound.setParts({ voice: t.voice, fx: t.touchSounds });
  ctx.companion?.applyTuning(t);
  if (what === 'enabled' || what === 'favouriteMallow' || what === 'reset' || what === '*') mallowId = validMallow(askMallow) || chosenMallow();
});
sound.setParts({ voice: dna.tuning().voice, fx: dna.tuning().touchSounds });

// Audio may only start from a real user gesture. Touch pointerdown does not
// count (pointerup / touchend / click / keydown do), so unlock on those too.
for (const ev of ['pointerup', 'touchend', 'click', 'keydown']) {
  addEventListener(ev, () => { if (prefs.get('sound')) sound.unlock(); }, { capture: true, passive: true });
}

// ------------------------------------------------------------------ home --
function home() {
  const m = MALLOWS[mallowId];
  const screen = h('section', { class: 'screen home', 'aria-label': 'Sensory Lab' });
  const offers = dna.suggestions(3);
  const inner = h('div', { class: 'home-inner' });
  const hero = h('div', { class: 'hero', role: 'img', 'aria-label': `${m.name}, ready to be touched` });
  inner.append(
    h('div', { class: 'brand' },
      h('h1', {}, 'Hushmallow ', h('span', {}, 'Sensory Lab')),
      h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
        h('span', { class: 'pill' }, 'Phase 2 preview'),
        iconBtn('settings', 'Settings', () => settings()))),
    hero,
    h('div', { class: 'hero-cap' }, h('h2', {}, m.name), h('p', {}, 'Touch me. Go on, I’m soft.')),
    offers.length ? h('p', { class: 'section-label' }, 'For you') : null,
    offers.length ? h('div', { class: 'offers' }, ...offers.map(offer)) : null,
    h('p', { class: 'section-label' }, 'Experiences'),
    h('div', { class: 'cards' }, ...EXPERIENCES.map(card)),
    h('p', { class: 'foot' }, 'Development preview. Not part of the Hushmallow app yet. Nothing here is saved anywhere except this browser.'));
  screen.append(inner);
  root.append(screen);
  const c = new Companion(hero, { mallowId, material: prefs.get('material'), quality, sound, prefs, rig: { fit: 0.62, baseline: 0.9 } });
  c.applyTuning(dna.tuning());
  ctx.setCompanion(c);
  return { unmount() { c.destroy(); ctx.setCompanion(null); screen.remove(); } };
}

// A familiar thing to come back to, with an honest reason
function offer(it) {
  const why = { favourite: 'Favourite', often: 'You use this often', helps: 'You said this helps' }[it.reason];
  let title = '', go = () => {};
  if (it.kind === 'pocket') { const p = pocketById(it.id); title = p ? p.title : it.id; go = () => ctx.navigate(`/pocket-${it.id}`); }
  else if (it.kind === 'softbody') {
    title = `${MALLOWS[it.mallow]?.name || MALLOWS[mallowId].name} as ${MATERIALS[it.material]?.label || it.material}`;
    go = () => { prefs.set('material', it.material); if (it.mallow) ctx.setMallow(it.mallow); ctx.navigate('/softbody'); };
  }
  return h('button', { class: 'offer', type: 'button', 'data-offer': it.kind + ':' + (it.id || it.material), onclick: go },
    h('span', { class: 't' }, title), h('span', { class: 'd' }, why));
}

function card(e) {
  const live = !!e.load;
  return h('button', {
    class: 'card', type: 'button', 'aria-disabled': String(!live), 'data-experience': e.id,
    onclick: () => { if (live) ctx.navigate('/' + e.id); },
  },
  h('span', { class: 'glyph', 'aria-hidden': 'true' }, e.glyph),
  h('span', { class: 'txt' }, h('span', { class: 't' }, e.title), h('span', { class: 'd' }, e.blurb)),
  live ? h('span', { class: 'go' }, 'Play') : h('span', { class: 'tag' }, `Phase ${e.phase}`));
}

// -------------------------------------------------------------- settings --
function settings() {
  openSheet(root, 'Settings', (close) => {
    const vol = h('input', { type: 'range', min: '0', max: '1', step: '0.05', value: String(prefs.get('volume')), 'aria-label': 'Volume',
      oninput: (e) => prefs.set('volume', +e.target.value) });
    const row = (label, ctl, sub) => h('div', { class: 'row' }, h('span', { class: 'lbl' }, label, sub ? h('span', { class: 'sub' }, sub) : null), ctl);
    const onOff = (k, label) => segmented([[true, 'On'], [false, 'Off']], prefs.get(k), (v) => { prefs.set(k, v); if (k === 'sound' && v) sound.unlock(); }, label);
    return h('div', {},
      row('Sound', onOff('sound', 'Sound')),
      row('Volume', vol),
      row('Haptics', onOff('haptics', 'Haptics'), 'Android only; iPhone needs the app'),
      row('Motion', segmented([['system', 'System'], ['reduced', 'Reduced'], ['full', 'Full']], prefs.get('motion'), (v) => prefs.set('motion', v), 'Motion')),
      row('Theme', segmented([['system', 'System'], ['dark', 'Dark'], ['light', 'Light']], prefs.get('theme'),
        (v) => { if (prefs.get('theme') === v) { themeBudget = 3; applyTheme(); } else prefs.set('theme', v); }, 'Theme')),
      h('div', { class: 'row stack' }, h('span', { class: 'lbl' }, 'Mallow', h('span', { class: 'sub' }, dna.enabled ? 'Remembered as your favourite' : 'Personalisation is off, so this is for now only')), mallowPicker(close)),
      row('Comfort DNA', h('button', { class: 'btn-quiet', type: 'button', onclick: () => { close(); ctx.navigate('/comfort-dna'); } }, 'Open'), 'What your Mallow remembers'),
      row('Quality', segmented([['auto', 'Auto'], ['high', 'High'], ['medium', 'Med'], ['low', 'Low']], prefs.get('quality'), (v) => prefs.set('quality', v), 'Quality'), `Running: ${quality}`),
      row('Lab settings', h('button', { class: 'btn-quiet', type: 'button', onclick: () => {
        prefs.reset();
        mallowId = validMallow(askMallow) || chosenMallow();
        quality = initialTier('auto');
        startMonitor();
        close();
        reroute();
      } }, 'Reset'), prefs.persistent ? 'Stored only in this browser' : 'Not saved: this browser blocks storage'));
  });
}

function mallowPicker(close) {
  const wrap = h('div', { class: 'pills', role: 'group', 'aria-label': 'Mallow' },
    ...MALLOW_IDS.map((id) => h('button', {
      type: 'button', 'aria-pressed': String(id === mallowId), 'data-mallow': id,
      'aria-label': id === mallowId ? MALLOWS[id].name : `Switch to ${MALLOWS[id].name}`,
      onclick: () => {
        if (id === mallowId) return;
        ctx.setMallow(id);
        close();
        reroute();
      },
    }, MALLOWS[id].name)));
  return wrap;
}

/** Rebuild the current screen (after a Mallow change or Reset) and put focus back on Settings. */
function reroute() {
  route(lab.route).then(() => root.querySelector('button[aria-label="Settings"]')?.focus({ preventScroll: true }));
}

// ---------------------------------------------------------------- router --
// Routes are plain hash tokens (#touchtalk, #softbody, #home): hosted previews
// pass only a bare token through to the page. navigate() routes directly and
// mirrors the token into the hash for deep links and the back button.
let current = null;
let token = 0;
let echo = null;
const fromHash = () => location.hash.replace(/^#\/?/, '').split(/[?&=]/)[0] || 'home';
async function route(id = fromHash()) {
  const my = ++token;
  current?.unmount();
  current = null;
  root.replaceChildren();
  // #pocket-<mode> opens a Pocket Hush mode directly (one tap from anywhere that links it)
  const mode = id.startsWith('pocket-') && pocketById(id.slice(7)) ? id.slice(7) : null;
  const e = byId(mode ? 'pocket-hush' : id);
  if (!e || !e.load) { current = home(); lab.route = 'home'; return; }
  const mod = await e.load();
  if (my !== token) return;
  current = mod.mount(root, ctx, { mode });
  lab.route = id;
  dna.record({ kind: 'experience', id: e.id });
}
function go(id) {
  if (fromHash() !== id) {
    echo = id;
    try { location.hash = id; } catch { echo = null; }
  }
  route(id);
}
addEventListener('hashchange', () => {
  const id = fromHash();
  if (echo === id) { echo = null; return; }   // our own navigate() already routed
  echo = null;
  route(id);
});

// test / debugging handle (development lab only)
const lab = globalThis.__lab = { prefs, sound, dna, ctx, companion: null, route: null, events: [], quality: () => quality };
route();
