// Entry point for Another Angle (hushmallow Beyond): the cinematic experience
// in src/beyond/another-angle.js, loaded only through loadUltra(), which
// enforces the entitlement. The earlier dock-card ritual (src/ultra) stays in
// the build behind it: if the new experience cannot load, Another Angle opens
// as that ritual instead, so it is never missing.
import { h } from '../ui.js';
import { RITUALS } from '../../data/rituals.js';
import { loadUltra } from '../entitlements.js';

export default function angle(app, params = {}) {
  const el = h('div', { class: 'hushfold beyond', 'data-hf': 'angle' });
  let inner = null, left = false;
  const classic = () => {
    app.state.ritual = RITUALS.find((r) => r.id === 'another-angle');
    app.state.input = { ...(app.state.input || { emotions: [], intensity: 0.6 }), text: params.text ?? app.state.input?.text ?? '' };
    app.go('ritual', { id: 'another-angle' }, { replace: true });
  };
  return {
    el,
    title: 'Another Angle',
    async enter() {
      if (!app.ent.has('ultra')) { app.go('plans', { reason: 'ultra', focus: 'ultra' }, { replace: true }); return; }
      let mods = null;
      try { mods = await loadUltra(app.ent); } catch (e) { console.warn('[angle]', e?.message || e); }
      if (left) return;
      if (!mods?.beyond?.createAnotherAngle || params.classic) { classic(); return; }
      inner = mods.beyond.createAnotherAngle(app, { root: el, params: { text: params.text ?? '' } });
      await inner.enter();
    },
    leave() { left = true; inner?.leave(); },
    get blockBack() { return inner?.blockBack ?? null; },
    safeForUpdate() { return inner?.safeForUpdate?.() ?? true; },
  };
}
