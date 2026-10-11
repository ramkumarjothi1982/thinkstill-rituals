// Interaction modules. A ritual is only ever offered if its module is listed
// here, so the library can't advertise something that doesn't run.
// Ultra modules are NOT imported here — they load through loadUltra().
export const PAID_MODULES = {
  'static-to-signal': () => import('./static-to-signal.js'),
  'soft-landing': () => import('./soft-landing.js'),
  'spark-to-lantern': () => import('./spark-to-lantern.js'),
};
export const ULTRA_MODULES = new Set(['another-angle']);
export const AVAILABLE = new Set([...Object.keys(PAID_MODULES), ...ULTRA_MODULES]);
