// Interaction modules. A ritual is only ever offered if its module is listed
// here, so the library can't advertise something that doesn't run.
// Ultra modules are NOT imported here — they load through loadUltra().
export const PAID_MODULES = {
  'static-to-signal': () => import('./static-to-signal.js'),
  'soft-landing': () => import('./soft-landing.js'),
  'spark-to-lantern': () => import('./spark-to-lantern.js'),
  'green-glitch-compass': () => import('./green-glitch-compass.js'),
  'raindrop-keeper': () => import('./raindrop-keeper.js'),
  'moonmilk-wind-down': () => import('./moonmilk-wind-down.js'),
  'drift-and-dock': () => import('./drift-and-dock.js'),
  'sunpop-savour': () => import('./sunpop-savour.js'),
  'untangle': () => import('./untangle.js'),
  'name-it': () => import('./name-it.js'),
};
export const ULTRA_MODULES = new Set(['another-angle']);
// 'v3' runs the 1,000 hushmallow rituals (src/v3/host.js); each ritual loads
// its own touch engine, and only rituals whose engine is built are listed.
export const AVAILABLE = new Set([...Object.keys(PAID_MODULES), ...ULTRA_MODULES, 'v3']);
