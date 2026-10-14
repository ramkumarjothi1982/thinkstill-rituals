// Shared full-screen stage for companion experiences: background, the touch
// stage, a minimal top bar, a feedback chip and a bottom control area. Also
// wires keyboard shortcuts so every gesture works without touch.
//
// Phase 3: the realm behind the Mallow lives in an Environment (s.env), a
// second Mallow can join on its own stage (setPartner: the duet), and features
// get hooks for keys, gestures, sound and layout. With none of the new options
// a screen behaves exactly as before.

import { h, icon, iconBtn, feedbackChip } from '../lab-ui.js';
import { Companion } from '../core/companion.js';
import { Environment, backdropTone } from '../core/environment.js';
import { MALLOWS } from '../../src/mallows/registry.js';

const defaultLabel = (name) => `${name}. Tap, double tap, hold, stroke, drag to stretch, or pinch to squeeze. Keys: Enter tap, D double tap, H hold, P stroke, S squeeze, T stretch.`;

/**
 * opts: title, subtitle, material, extraButtons, onEvent(e), plus for moments:
 *   backdrop   realm id (or null for the plain stage); default: Comfort DNA's choice for stage experiences
 *   onExit     replaces "Back to the Sensory Lab" with a Close button that calls it (also on Escape)
 *   settings   false hides the Settings button
 * Phase 3:
 *   sound      what every Companion plays through (default ctx.sound; or a soundFacade / quietSound)
 *   feedback   false: Companion labels are not echoed in the feedback chip
 *   keys       (e, k, phase 'down' | 'up') → true to skip the built-in handling (called first)
 *   onGesture  (type, d, companion): every Companion's raw gestures
 *   onLayout   ({ W, H, floor, baseline, fit, band, topBottom, bottomTop }) after every reframe
 *   stageLabel (mallowName) → aria-label for each stage
 * Returns { screen, wrap, stage, bottom, companion, feedback, env, realm, setPartner(id, opts),
 *           companions, stages, partner, unmount() }.
 */
export function stageScreen(root, ctx, {
  title, subtitle, material, extraButtons = [], onEvent, backdrop, onExit, settings = true,
  sound = ctx.sound, feedback = true, keys = null, onGesture = null, onLayout = null, stageLabel = null,
}) {
  const m = MALLOWS[ctx.mallowId];
  const label = (name) => stageLabel?.(name) || defaultLabel(name);
  const screen = h('section', { class: 'screen', 'aria-label': title });
  const wrap = h('div', { class: 'stage-wrap' });
  const tint = h('div', { class: 'stage-tint' });
  const pal = ctx.dna?.palette();
  tint.style.setProperty('--mallow-glow', hexA(pal ? pal.glow : m.colours.glow, 0.35));
  // Comfort DNA: a chosen Hushfold realm behind the Mallow (plain stage otherwise)
  const realmId = backdrop !== undefined ? backdrop : (ctx.dna?.environment('stage', ctx.mallowId) || null);
  const env = new Environment(wrap, { screen, quality: ctx.quality, reducedMotion: ctx.prefs.reducedMotion() });
  let realmDone = false;
  const stage = h('div', { class: 'stage', tabindex: '0', role: 'application', 'aria-label': label(m.name) });
  const soundBtn = iconBtn(ctx.prefs.get('sound') ? 'sound' : 'mute', 'Mute sound', () => {
    const on = !ctx.prefs.get('sound');
    ctx.prefs.set('sound', on);
    soundBtn.innerHTML = icon(on ? 'sound' : 'mute');
    soundBtn.setAttribute('aria-pressed', String(!on));
    if (on) ctx.sound.unlock();
  }, { 'aria-pressed': String(!ctx.prefs.get('sound')) });
  const exit = onExit ? iconBtn('close', 'Close', () => onExit()) : iconBtn('back', 'Back to the Sensory Lab', () => ctx.navigate('/'));
  const top = h('header', { class: 'topbar' },
    exit,
    h('div', { class: 'title' }, h('b', {}, title), h('small', {}, subtitle || m.name)),
    h('div', { class: 'tb-right' }, ...extraButtons, soundBtn, settings ? iconBtn('settings', 'Settings', () => ctx.openSettings()) : null));
  const bottom = h('footer', { class: 'bottom' });
  // chrome over a realm takes the realm's brightness, not the page theme (readable on any world)
  if (realmId) screen.dataset.backdrop = backdropTone(realmId);
  screen.append(wrap, tint, stage, top, bottom);
  root.append(screen);
  const fb = feedbackChip(screen);

  const emit = (e) => { if (feedback && e.label) fb.show(e.label); ctx.log?.(e); onEvent?.(e); };
  const companion = new Companion(stage, {
    mallowId: ctx.mallowId, material, quality: ctx.quality, sound, prefs: ctx.prefs, onGesture,
    onEvent: emit,
    onFrame: (t) => ctx.monitor?.frame(t),
  });
  if (ctx.dna) companion.applyTuning(ctx.dna.tuning());
  ctx.setCompanion(companion);

  // the duet: a second Mallow on its own stage beside the lead (never ctx.companion)
  let partner = null, pstage = null, unregister = null;

  // keyboard: every gesture has a key; built-ins act on the focused stage's Mallow
  const held = new Map();   // 'h' | 's' → the Companion that started it
  const target = () => (partner && document.activeElement === pstage ? partner : companion);
  const key = (e) => {
    if (e.target.closest?.('.sheet')) return;
    const k = (e.key || '').toLowerCase();
    if (keys?.(e, k, e.type === 'keydown' ? 'down' : 'up')) return;
    if (e.type === 'keydown') {
      if (k === 'escape') { if (onExit) onExit(); else ctx.navigate('/'); return; }
      if (e.repeat) { if (k === 'h' || k === 's') e.preventDefault(); return; }
      const c = target(), ae = document.activeElement;
      if ((k === 'enter' || k === ' ') && (ae === stage || (pstage && ae === pstage) || ae === document.body)) { e.preventDefault(); c.act('tap'); }
      else if (k === 'd') c.act('double');
      else if (k === 'h') { held.set('h', c); c.act('holdStart'); }
      else if (k === 's') { held.set('s', c); c.act('squeezeStart'); }
      else if (k === 'p') c.act('stroke');
      else if (k === 't') c.act('stretch');
    } else if (e.type === 'keyup') {
      const c = (k === 'h' || k === 's') ? held.get(k) : null;
      if (!c) return;
      held.delete(k);
      if (!c.destroyed) c.act(k === 'h' ? 'holdEnd' : 'squeezeEnd');
    }
  };
  document.addEventListener('keydown', key);
  document.addEventListener('keyup', key);

  // keep the Mallow framed between the top bar and the controls, with room above to stretch
  // body about half the free band tall, never wider than 60% of its stage
  const fitFor = (W, band) => Math.max(0.2, Math.min(0.64, Math.min(W * 0.64, band * 0.58) / W));
  const frame = () => {
    const H = stage.clientHeight || 1, W = stage.clientWidth || 1;
    const bottomH = bottom.getBoundingClientRect().height;
    const floor = Math.min(H - bottomH - 18, H * 0.84);
    const baseline = floor / H;
    const band = floor - 96;                       // top bar
    const fit = fitFor(W, band);
    companion.setLayout({ baseline, fit });
    if (partner) partner.setLayout({ baseline, fit: fitFor(pstage.clientWidth || 1, band) });
    if (realmId && !realmDone) {
      realmDone = true;
      env.mount(realmId, { emotion: 'calm', intensity: 0.4, groundY: baseline });
    }
    wrap.style.setProperty('--spot-y', `${Math.round((floor - band * 0.32) / H * 100)}%`);
    tint.style.setProperty('--spot-y', `${Math.round((floor - band * 0.32) / H * 100)}%`);
    if (onLayout) {
      const sy = screen.getBoundingClientRect().top;
      onLayout({ W, H, floor, baseline, fit, band, topBottom: top.getBoundingClientRect().bottom - sy, bottomTop: bottom.getBoundingClientRect().top - sy });
    }
  };
  const ro = new ResizeObserver(frame);
  ro.observe(stage); ro.observe(bottom);

  // a live Motion change reaches the realm too (lab.js handles the Mallows)
  const offPrefs = ctx.prefs.onChange((k) => { if (k === 'motion' || k === '*') env.setReducedMotion(ctx.prefs.reducedMotion()); });

  function dropPartner() {
    const focused = document.activeElement === pstage;
    for (const [k, c] of held) if (c === partner) held.delete(k);
    ro.unobserve(pstage);
    partner.destroy();
    unregister?.();
    pstage.remove();
    partner = null; pstage = null; unregister = null;
    if (focused) stage.focus({ preventScroll: true });
  }

  /**
   * Add, swap or remove the second Mallow. null (or an unknown id) removes it.
   * tier: maps the lab quality to the partner's (e.g. one tier lower), through ctx.addCompanion.
   */
  function setPartner(mallowId, { quality = ctx.quality, tier = null } = {}) {
    if (partner && mallowId === partner.id) return partner;
    if (partner) dropPartner();
    const pm = mallowId && Object.hasOwn(MALLOWS, mallowId) ? MALLOWS[mallowId] : null;
    if (!pm) {
      delete screen.dataset.layout;
      stage.classList.remove('lead');
      frame();
      return null;
    }
    pstage = h('div', { class: 'stage partner', tabindex: '0', role: 'application', 'aria-label': label(pm.name) });
    stage.after(pstage);
    screen.dataset.layout = 'duet';
    stage.classList.add('lead');
    partner = new Companion(pstage, {
      mallowId, material, quality, sound, prefs: ctx.prefs, onGesture,
      onEvent: (e) => emit({ ...e, partner: true }),
    });
    if (ctx.dna) partner.applyTuning(ctx.dna.tuning());
    unregister = ctx.addCompanion?.(partner, tier ? { tier } : {}) || null;
    ro.observe(pstage);
    frame();
    return partner;
  }

  const handle = {
    screen, wrap, stage, bottom, companion, feedback: fb, env,
    get realm() { return env.realm; },
    setPartner,
    get companions() { return partner ? [companion, partner] : [companion]; },
    get stages() { return pstage ? [stage, pstage] : [stage]; },
    get partner() { return partner; },
    unmount() {
      document.removeEventListener('keydown', key);
      document.removeEventListener('keyup', key);
      ro.disconnect();
      offPrefs();
      if (partner) dropPartner();
      env.destroy();
      companion.destroy();
      if (ctx.companion === companion) ctx.setCompanion(null);
      if (globalThis.__lab?.stage === handle) globalThis.__lab.stage = null;
      screen.remove();
    },
  };
  if (globalThis.__lab) globalThis.__lab.stage = handle;   // tests drive setPartner and read env
  return handle;
}

function hexA(hex, a) {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
