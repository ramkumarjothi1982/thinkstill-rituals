// Entry point for Hushmallow Ultra's Another Angle. The ritual host loads the
// Ultra module through loadUltra(), which enforces the entitlement.
import { h } from '../ui.js';
import { RITUALS } from '../../data/rituals.js';

export default function angle(app, params = {}) {
  return {
    el: h('div'),
    enter() {
      if (!app.ent.has('ultra')) { app.go('plans', { reason: 'ultra', focus: 'ultra' }, { replace: true }); return; }
      app.state.ritual = RITUALS.find((r) => r.id === 'another-angle');
      app.state.input = { ...(app.state.input || { emotions: [], intensity: 0.6 }), text: params.text ?? app.state.input?.text ?? '' };
      app.go('ritual', { id: 'another-angle' }, { replace: true });
    },
  };
}
