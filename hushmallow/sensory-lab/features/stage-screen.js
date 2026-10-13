// Shared full-screen stage for companion experiences: background, the touch
// stage, a minimal top bar, a feedback chip and a bottom control area. Also
// wires keyboard shortcuts so every gesture works without touch.

import { h, icon, iconBtn, feedbackChip } from '../lab-ui.js';
import { Companion } from '../core/companion.js';
import { MALLOWS } from '../../src/mallows/registry.js';

export function stageScreen(root, ctx, { title, subtitle, material, extraButtons = [], onEvent }) {
  const m = MALLOWS[ctx.mallowId];
  const screen = h('section', { class: 'screen', 'aria-label': title });
  const wrap = h('div', { class: 'stage-wrap' });
  const tint = h('div', { class: 'stage-tint' });
  tint.style.setProperty('--mallow-glow', hexA(m.colours.glow, 0.35));
  const stage = h('div', { class: 'stage', tabindex: '0', role: 'application',
    'aria-label': `${m.name}. Tap, double tap, hold, stroke, drag to stretch, or pinch to squeeze. Keys: Enter tap, D double tap, H hold, P stroke, S squeeze, T stretch.` });
  const soundBtn = iconBtn(ctx.prefs.get('sound') ? 'sound' : 'mute', 'Mute sound', () => {
    const on = !ctx.prefs.get('sound');
    ctx.prefs.set('sound', on);
    soundBtn.innerHTML = icon(on ? 'sound' : 'mute');
    soundBtn.setAttribute('aria-pressed', String(!on));
    if (on) ctx.sound.unlock();
  }, { 'aria-pressed': String(!ctx.prefs.get('sound')) });
  const top = h('header', { class: 'topbar' },
    iconBtn('back', 'Back to the Sensory Lab', () => ctx.navigate('/')),
    h('div', { class: 'title' }, h('b', {}, title), h('small', {}, subtitle || m.name)),
    h('div', { class: 'tb-right' }, ...extraButtons, soundBtn, iconBtn('settings', 'Settings', () => ctx.openSettings())));
  const bottom = h('footer', { class: 'bottom' });
  screen.append(wrap, tint, stage, top, bottom);
  root.append(screen);
  const fb = feedbackChip(screen);

  const companion = new Companion(stage, {
    mallowId: ctx.mallowId, material, quality: ctx.quality, sound: ctx.sound, prefs: ctx.prefs,
    onEvent: (e) => { if (e.label) fb.show(e.label); ctx.log?.(e); onEvent?.(e); },
    onFrame: (t) => ctx.monitor?.frame(t),
  });
  ctx.setCompanion(companion);

  // keyboard: every gesture has a key
  const held = new Set();
  const key = (e) => {
    if (e.target.closest?.('.sheet')) return;
    const k = e.key.toLowerCase();
    if (e.type === 'keydown') {
      if (k === 'escape') { ctx.navigate('/'); return; }
      if (e.repeat) { if (k === 'h' || k === 's') e.preventDefault(); return; }
      if ((k === 'enter' || k === ' ') && (document.activeElement === stage || document.activeElement === document.body)) { e.preventDefault(); companion.act('tap'); }
      else if (k === 'd') companion.act('double');
      else if (k === 'h') { held.add('h'); companion.act('holdStart'); }
      else if (k === 's') { held.add('s'); companion.act('squeezeStart'); }
      else if (k === 'p') companion.act('stroke');
      else if (k === 't') companion.act('stretch');
    } else if (e.type === 'keyup') {
      if (k === 'h' && held.delete('h')) companion.act('holdEnd');
      if (k === 's' && held.delete('s')) companion.act('squeezeEnd');
    }
  };
  document.addEventListener('keydown', key);
  document.addEventListener('keyup', key);

  // keep the Mallow framed between the top bar and the controls, with room above to stretch
  const frame = () => {
    const H = stage.clientHeight || 1, W = stage.clientWidth || 1;
    const bottomH = bottom.getBoundingClientRect().height;
    const floor = Math.min(H - bottomH - 18, H * 0.84);
    const baseline = floor / H;
    const band = floor - 96;                       // top bar
    // body about half the free band tall, never wider than 60% of the screen
    const fit = Math.max(0.2, Math.min(0.64, Math.min(W * 0.64, band * 0.58) / W));
    companion.setLayout({ baseline, fit });
    wrap.style.setProperty('--spot-y', `${Math.round((floor - band * 0.32) / H * 100)}%`);
    tint.style.setProperty('--spot-y', `${Math.round((floor - band * 0.32) / H * 100)}%`);
  };
  const ro = new ResizeObserver(frame);
  ro.observe(stage); ro.observe(bottom);

  return {
    screen, stage, bottom, companion, feedback: fb,
    unmount() {
      document.removeEventListener('keydown', key);
      document.removeEventListener('keyup', key);
      ro.disconnect();
      companion.destroy();
      ctx.setCompanion(null);
      screen.remove();
    },
  };
}

function hexA(hex, a) {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
