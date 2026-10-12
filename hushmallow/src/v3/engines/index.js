// Registry of the 50 V3 touch engines. Each engine is its own module
// (ge-NN.js) and is loaded only when one of its rituals is played. Only
// engines listed in BUILT are offered anywhere in the app.

export const BUILT = new Set([
  'GE-01', 'GE-02', 'GE-03', 'GE-12', 'GE-17', 'GE-18', 'GE-22', 'GE-32', 'GE-33', 'GE-35', 'GE-42', 'GE-43',
]);

export function loadEngine(id, { force = false } = {}) {
  if (!BUILT.has(id) && !force) return Promise.reject(new Error(`Engine ${id} is not built yet`));
  return import(`./${id.toLowerCase()}.js`);
}
