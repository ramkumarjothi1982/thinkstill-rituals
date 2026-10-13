// The ten Hushmallow 2.0 experiences. `load` is present only for experiences
// that are actually built; the rest are listed with the phase they arrive in
// (shown as such, never as working features).
//
// `tier` is the *proposed* entitlement (free | hushmallow | ultra | review);
// it is metadata only. Nothing in the lab checks or grants a real plan.

export const EXPERIENCES = [
  { id: 'touchtalk', title: 'Mallow TouchTalk', blurb: 'Talk with touch: tap, hold, stroke, squeeze', glyph: '✋', phase: 1, tier: 'free',
    load: () => import('./touchtalk.js') },
  { id: 'softbody', title: 'SoftBody Lab', blurb: 'A living squishy in five materials', glyph: '◐', phase: 1, tier: 'hushmallow',
    load: () => import('./softbody-lab.js') },
  { id: 'pocket-hush', title: 'Pocket Hush', blurb: 'Comfort in 15 to 30 seconds', glyph: '✦', phase: 2, tier: 'free',
    load: () => import('./pocket-hush.js') },
  { id: 'comfort-dna', title: 'Comfort DNA', blurb: 'Your Mallow remembers what you enjoy', glyph: '♡', phase: 2, tier: 'hushmallow',
    load: () => import('./comfort-dna.js') },
  { id: 'weather', title: 'Hushfold Weather Weaver', blurb: 'Touch and reshape the weather', glyph: '☁', phase: 3, tier: 'hushmallow' },
  { id: 'hushbeat', title: 'Hushbeat Symphony', blurb: 'Make music by touching a Mallow', glyph: '♪', phase: 3, tier: 'hushmallow' },
  { id: 'nightlight', title: 'Mallow Nightlight', blurb: 'A gentle bedtime companion', glyph: '☾', phase: 3, tier: 'hushmallow' },
  { id: 'theatre', title: 'Two Mallow Theatre', blurb: 'Two Mallows, two ways to see it', glyph: '◑', phase: 4, tier: 'ultra' },
  { id: 'hushprints', title: 'Hushprints', blurb: 'Keepsakes made from your moments', glyph: '❋', phase: 4, tier: 'hushmallow' },
  { id: 'hug-bridge', title: 'Mallow Hug Bridge', blurb: 'Send someone a little comfort', glyph: '⟡', phase: 5, tier: 'review' },
];

export const byId = (id) => EXPERIENCES.find((e) => e.id === id);
