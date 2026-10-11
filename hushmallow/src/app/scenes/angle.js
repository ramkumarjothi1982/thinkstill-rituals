// Entry point for Hushmallow Ultra. From the home screen it offers the two
// Ultra doors: the full Another Angle, or a one-minute plot twist from the
// ThinkStill library. From Meet a Mallow (params.text) it goes straight into
// Another Angle. The ritual host loads Ultra code through loadUltra() /
// loadUltraTricks(), which enforce the entitlement.
import { h, iconBtn, say, clearBubble } from '../ui.js';
import { RITUALS } from '../../data/rituals.js';
import { playTrick } from '../trick-launch.js';
import { loadUltraTricks } from '../../engine/tricks.js';

export default function angle(app, params = {}) {
  const { world, ent } = app;
  const direct = params.text != null;

  function startAngle(replace) {
    app.state.ritual = RITUALS.find((r) => r.id === 'another-angle');
    app.state.input = { ...(app.state.input || { emotions: [], intensity: 0.6 }), text: params.text ?? '' };
    app.go('ritual', { id: 'another-angle' }, { replace });
  }

  const count = h('span', {}, 'Hundreds of');
  const el = direct ? h('div') : h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%' } },
    h('div', { class: 'topbar' }, iconBtn('back', 'Back', () => app.back()), h('div', { class: 'grow' }), h('span', { class: 'eyebrow', style: { color: '#d9a8ff' } }, 'Hushmallow Ultra')),
    h('div', { style: { marginTop: '14px' } },
      h('h1', { class: 'title' }, 'Another Angle'),
      h('p', { class: 'lede' }, 'There’s more than one way to see it.')),
    h('div', { class: 'spacer' }),
    h('div', { style: { display: 'grid', gap: '12px' } },
      h('button', { class: 'ultra-card', 'data-focus': '', onclick: () => { clearBubble(); app.audio.ui('open'); startAngle(false); } },
        h('div', { class: 'spiral', 'aria-hidden': 'true' }),
        h('div', {}, h('span', { class: 'badge' }, 'ABOUT 4 MIN'), h('div', { class: 't' }, 'Look at a real situation'),
          h('div', { class: 's' }, 'Split what happened from what your brain added, weigh it up, find your next move.'))),
      h('button', { class: 'ultra-card', onclick: () => { clearBubble(); app.audio.ui('open'); playTrick(app, { tier: 'ultra' }); } },
        h('div', { class: 'spiral', 'aria-hidden': 'true', style: { animationDuration: '3s' } }),
        h('div', {}, h('span', { class: 'badge' }, 'ABOUT 1 MIN'), h('div', { class: 't' }, 'Ready for the plot twist?'),
          h('div', { class: 's' }, count, ' quick mind-bends for thoughts that got a bit too sure of themselves.')))));

  return {
    el, title: 'Another Angle',
    async enter() {
      if (!ent.has('ultra')) { app.go('plans', { reason: 'ultra', focus: 'ultra' }, { replace: true }); return; }
      if (direct) { startAngle(true); return; }
      world.dim(false);
      world.showMallow(true);
      world.place({ x: 50, y: 44, scale: 0.8 });
      await Promise.all([world.setRealm('spiral-observatory'), world.setMallow('zuzu')]);
      world.setEmotion({ curious: 0.7, playful: 0.3 }, 0.7);
      say(world, 'Ooh, a thought to turn over. Big one or quick one?', { who: 'Zuzu', ms: 3200 });
      try { count.textContent = String((await loadUltraTricks(ent)).length); } catch { /* keep the generic label */ }
    },
    leave() { clearBubble(); },
  };
}
