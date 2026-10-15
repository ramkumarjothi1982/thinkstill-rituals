// A realistic snapshot of the localStorage keys TODAY's app keeps for a
// guest (no account), byte for byte as today's code writes them: every key
// the guest's own things live under (src/auth/namespace.js lists them; a
// real plan tier, 'paid', that Settings can show). Shared by
// tests/auth-guest-keys.test.mjs (Node) and tests/e2e/auth.e2e.mjs (the
// browser, CI and dry run): coordinator decision 3, guests keep today's data.
import { DEFAULTS } from '../../src/app/prefs.js';

export const GUEST_DEVICE_ID = 'Qm9vcHBvLWRldmljZS0xMjM0';   // makeDeviceId's shape: 22+ base64url characters

/** { 'hm2:<key>': '<raw string>' } for a guest, timestamps relative to `now`. */
export function todayGuestKeys(now = Date.now()) {
  return {
    // consistent the way today's app keeps them: the audio and haptics engines mirror prefs.sound / volume / haptics in their raw keys
    'hm2:prefs': JSON.stringify({ ...DEFAULTS, sound: false, volume: 0.35, textScale: 1.25, subtitleSpeed: 1.25, motion: 'reduced', haptics: false, mallow: 'zuzu', seenIntro: true }),
    'hm2:hushfold.favourites': JSON.stringify({ v: 1, ids: ['static-storm', 'luminous-ocean'] }),
    'hm2:hushfold.progress': JSON.stringify({ v: 1, savedAt: now - 3600_000, worldId: 'static-storm', idx: 1, sequence: ['luminous-ocean', 'static-storm'], step: 0.4, emotion: 'anxious', intention: 'calm', mallow: 'zuzu', seed: 12345 }),
    'hm2:hushfold.rotation': JSON.stringify({ v: 1, bags: { worlds: ['static-storm'] } }),
    // src/hushfold/flow/director.js: the Hushflow's own rotation (ids and counts only)
    'hm2:hushflow.rotation': JSON.stringify({ v: 1, sessionCount: 3, history: ['static-storm', 'luminous-ocean'], bags: { worlds: ['luminous-ocean'] } }),
    'hm2:hushfold.lines': JSON.stringify({ v: 1, seen: ['hello'] }),
    'hm2:garden': JSON.stringify({ v: 1, skills: { 'slowing-down': { savedAt: now - 86_400_000, lastPractised: now - 7200_000, practised: 3, fromWorld: 'static-storm', mallow: 'glitzi' } } }),
    // (Another Angle's notice is at version 2 since G1 went live, as the app writes it now; a version-1 choice is
    // asked again by design: src/beyond/consent.js CONSENT_VERSION, tests/beyond-*.test.mjs)
    'hm2:beyond.consent': JSON.stringify({ v: 2, choice: 'yes', at: '2026-10-01' }),
    'hm2:beyond.device': JSON.stringify(GUEST_DEVICE_ID),
    'hm2:beyond.session': JSON.stringify({ token: 'angle-session-token', exp: now + 3600_000, endpoint: null }),
    'hm2:beyond.feedback': JSON.stringify({ reframe: { helped: 2 } }),
    'hm2:beyond.seen': 'true',
    'hm2:beyond.visits': '4',
    'hm2:beyond.invite': JSON.stringify('tester-invite-01'),
    // src/engine/journey.js (feeling families, never words) and src/engine/played.js (ids)
    'hm2:journey': JSON.stringify([{ at: now - 2 * 86_400_000, felt: 'lighter', id: 'r-001', name: 'Soft Shoulders', kind: 'ritual', mallow: 'blubi', families: ['worry'], seconds: 140 }]),
    'hm2:played': JSON.stringify(['r-001']),
    // src/engine/recommend.js (the classic rituals' rotation: saved rituals, what was dealt and how it helped, ids only)
    'hm2:rotation': JSON.stringify({ bags: {}, dealt: [], history: [{ id: 'r-001', at: now - 2 * 86_400_000, helped: true, before: null, after: null }], favourites: ['hm-0001', 'moonmilk-wind-down'], feedback: { 'r-001': { helped: 1, notHelped: 0, runs: 1 } } }),
    // src/engine/round.js (one round per plan tier: what was tried in this round)
    'hm2:round-paid': JSON.stringify({ n: 1, seen: ['r-001'] }),
    // src/ultra/another-angle.js (Future Lens predictions sealed with "Keep my saved angles" on: the person's own words, on this phone only)
    'hm2:ultra.sealedPredictions': JSON.stringify([{ id: 'seal-1', text: 'They will ignore my message', certainty: 70, when: 'week', sealedAt: now - 8 * 86_400_000, dueAt: now - 86_400_000, scenario: 'friends' }]),
    'hm2:entitlement': JSON.stringify({ tier: 'paid', source: 'native', since: now - 30 * 86_400_000 }),
    'hm2:sound': JSON.stringify({ enabled: false, volume: 0.35 }),
    'hm2:haptics': 'false',
  };
}

/**
 * Keys today's app itself rewrites as it runs, with or without accounts (the
 * Hushfold's line bookkeeping when it greets): compared by presence only
 * in the browser, where the real Hushfold runs.
 */
export const APP_REWRITES = Object.freeze(['hm2:hushfold.lines']);
