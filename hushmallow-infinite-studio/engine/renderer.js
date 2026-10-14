// Compatibility entry: the renderer lives in renderer/ since WP-02 (passes split
// out, quality profiles). engine/index.html's import map points the frozen
// direction's '../stage2/renderer.js' here.

export { Renderer, DESIGN_W, DESIGN_H, assertNoRoll } from './renderer/index.js';
