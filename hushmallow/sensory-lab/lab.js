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

const params = new URLSearchParams(location.search);
const root = document.getElementById('lab');
const prefs = new Prefs();
const sound = new SoundEngine({ volume: prefs.get('volume'), muted: !prefs.get('sound') });

// Phase 1 is tuned on Boppo. Other Mallows can be previewed (untuned) from
// Settings, or locally with ?mallow=<id> (the query string never reaches a hosted preview).
const PHASE1_MALLOW = 'boppo';
const askMallow = (params.get('mallow') || '').toLowerCase();
const validMallow = (id) => (MALLOW_IDS.includes(id) ? id : null);
let mallowId = validMallow(askMallow) || validMallow(prefs.get('mallow')) || PHASE1_MALLOW;

const qParam = params.get('quality');
let quality = ['high', 'medium', 'low'].includes(qParam) ? qParam : initialTier(prefs.get('quality'));

const ctx = {
  prefs, sound,
  get mallowId() { return mallowId; },
  get preview() { return mallowId !== PHASE1_MALLOW; },
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
  if (k === 'style' || k === '*') ctx.companion?.setStyle(prefs.get('style'));
  if (k === 'showMesh') ctx.companion?.setShowMesh(v);
  if (k === 'quality') {
    if (v === 'auto') { quality = initialTier('auto'); ctx.companion?.rig.setQuality(quality); startMonitor(); }
    else { quality = v; ctx.companion?.rig.setQuality(v); if (ctx.monitor) ctx.monitor.enabled = false; }
  }
});

// Audio may only start from a real user gesture. Touch pointerdown does not
// count (pointerup / touchend / click / keydown do), so unlock on those too.
for (const ev of ['pointerup', 'touchend', 'click', 'keydown']) {
  addEventListener(ev, () => { if (prefs.get('sound')) sound.unlock(); }, { capture: true, passive: true });
}

// ------------------------------------------------------------------ home --
function home() {
  const m = MALLOWS[mallowId];
  const preview = ctx.preview;
  const screen = h('section', { class: 'screen home', 'aria-label': 'Sensory Lab' });
  const inner = h('div', { class: 'home-inner' });
  const hero = h('div', { class: 'hero', role: 'img', 'aria-label': `${m.name}, ready to be touched` });
  inner.append(
    h('div', { class: 'brand' },
      h('h1', {}, 'Hushmallow ', h('span', {}, 'Sensory Lab')),
      h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
        h('span', { class: 'pill' }, preview ? `${m.name} · untuned preview` : 'Phase 1 preview'),
        iconBtn('settings', 'Settings', () => settings()))),
    hero,
    h('div', { class: 'hero-cap' }, h('h2', {}, m.name), h('p', {}, 'Touch me. Go on, I’m soft.')),
    h('p', { class: 'section-label' }, 'Experiences'),
    h('div', { class: 'cards' }, ...EXPERIENCES.map(card)),
    h('p', { class: 'foot' }, 'Development preview. Not part of the Hushmallow app yet. Nothing here is saved anywhere except this browser.'));
  screen.append(inner);
  root.append(screen);
  const c = new Companion(hero, { mallowId, material: prefs.get('material'), quality, sound, prefs, rig: { fit: 0.62, baseline: 0.9 } });
  ctx.setCompanion(c);
  return { unmount() { c.destroy(); ctx.setCompanion(null); screen.remove(); } };
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
      row('Responses', segmented([['gentle', 'Gentle'], ['balanced', 'Balanced'], ['playful', 'Playful']], prefs.get('style'), (v) => prefs.set('style', v), 'Response style')),
      row('Theme', segmented([['system', 'System'], ['dark', 'Dark'], ['light', 'Light']], prefs.get('theme'),
        (v) => { if (prefs.get('theme') === v) { themeBudget = 3; applyTheme(); } else prefs.set('theme', v); }, 'Theme')),
      h('div', { class: 'row stack' }, h('span', { class: 'lbl' }, 'Mallow', h('span', { class: 'sub' }, 'Boppo is tuned; the others are untuned previews')), mallowPicker(close)),
      row('Quality', segmented([['auto', 'Auto'], ['high', 'High'], ['medium', 'Med'], ['low', 'Low']], prefs.get('quality'), (v) => prefs.set('quality', v), 'Quality'), `Running: ${quality}`),
      row('Lab settings', h('button', { class: 'btn-quiet', type: 'button', onclick: () => {
        prefs.reset();
        mallowId = PHASE1_MALLOW;
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
        mallowId = id;
        prefs.set('mallow', id);
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
  const e = byId(id);
  if (!e || !e.load) { current = home(); lab.route = 'home'; return; }
  const mod = await e.load();
  if (my !== token) return;
  current = mod.mount(root, ctx);
  lab.route = id;
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
const lab = globalThis.__lab = { prefs, sound, ctx, companion: null, route: null, events: [], quality: () => quality };
route();
