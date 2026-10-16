// Belief Mallows — whether they are on: hushmallow Beyond ('ultra') AND switched on in this build.
//
// LIVE_FEATURES.beliefMallows (src/app/entitlements.js) is the switch: on since the integration of 16 Oct 2026 (the plans
// line "Belief Mallow investigation…" follows the same flag). Were it switched off again, the development host only
// (localhost / 127.0.0.1) could still switch them on for one page load with ?beliefMallows=1; the published site never can.
// Beyond is required either way (Another Angle itself only loads through loadUltra(), which enforces it; checked here too).

import { LIVE_FEATURES } from '../../app/entitlements.js';

const DEV_HOSTS = new Set(['localhost', '127.0.0.1']);

/** The development host's switch (?beliefMallows=1), or false. */
export function devSwitch(loc = typeof location !== 'undefined' ? location : null) {
  try {
    if (!loc || !DEV_HOSTS.has(loc.hostname)) return false;
    return new URLSearchParams(loc.search || '').get('beliefMallows') === '1';
  } catch { return false; }
}

/** Belief Mallows are offered here: switched on (flag or the dev switch) and the person has Beyond. */
export function beliefMallowsOn(app, { live = LIVE_FEATURES.beliefMallows, dev = devSwitch() } = {}) {
  if (!(live || dev)) return false;
  try { return !!app?.ent?.has?.('ultra'); } catch { return false; }
}
