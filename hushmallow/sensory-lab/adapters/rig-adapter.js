// Rig adapter — the one place that records which MallowRig internals the
// Sensory Lab depends on.
//
// SoftMallow (core/soft-mallow.js) subclasses the production rig
// (src/mallows/rig.js) without modifying it. That keeps the approved art,
// faces and reactions identical to the main app, but it means these members
// are a contract. If the main app's rig changes any of them, SoftMallow warns
// at construction and this file is the integration point to update.

export const RIG_CONTRACT = {
  // methods SoftMallow overrides or calls
  methods: ['_resize', '_label', '_composeTargets', '_updateBody', '_render', '_renderSkin',
    'setEmotion', 'react', 'lookAt', 'setReducedMotion', 'describe', 'destroy', 'on', '_emit'],
  // state SoftMallow reads
  fields: ['mallow', 'opts', 'canvas', 'ctx', 'skin', 'sctx', 'body', 'val', 'particles', 'loaded',
    'S', 'CX', 'BASE', 'W', 'H', 'dpr', 'q', 'time', 'breathPhase'],
  // body sub-fields used as the soft body's pose
  body: ['squash', 'lean', 'shear', 'tilt', 'hop', 'hopV', 'grounded', 'spin'],

  /** Returns the list of missing members (and warns once) so a rig change is caught early. */
  check(rig) {
    const missing = [];
    for (const m of this.methods) if (typeof rig[m] !== 'function') missing.push(m + '()');
    for (const f of this.fields) if (!(f in rig)) missing.push(f);
    for (const f of this.body) if (!rig.body || !(f in rig.body)) missing.push('body.' + f);
    if (missing.length && !this._warned) {
      this._warned = true;
      console.warn('[sensory-lab] MallowRig contract changed; update adapters/rig-adapter.js:', missing.join(', '));
    }
    return missing;
  },
};
