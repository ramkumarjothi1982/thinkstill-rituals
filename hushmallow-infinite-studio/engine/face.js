// Compatibility entry: the face lives in face/ since WP-02 (modules, the face
// cache and the fast tube). engine/index.html's import map points the frozen
// direction's '../stage2/face.js' here, so this module instance is the one the
// direction draws with.

export { Face, NEUTRAL, specFromRig, specFromDerived } from './face/index.js';
