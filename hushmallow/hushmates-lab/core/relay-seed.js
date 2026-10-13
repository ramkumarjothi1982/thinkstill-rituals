// Development test identities for the lab. Every one is flagged `test` and
// labelled as a test identity in the interface. They are never presented to
// anyone as real community members, and nothing they "write" is generated:
// in the lab, a person (the test operator) types each perspective by hand.

export const RELAY_IDENTITIES = [
  { key: 'moon', pseudonym: 'MoonMallow', mallow: 'noomi' },     // releases the feelings in the demo
  { key: 'cloud', pseudonym: 'CloudMallow', mallow: 'blubi' },
  { key: 'star', pseudonym: 'StarMallow', mallow: 'pipzi' },
  { key: 'fern', pseudonym: 'FernMallow', mallow: 'loomi' },
  { key: 'dream', pseudonym: 'DreamMallow', mallow: 'zuzu' },
  { key: 'pebble', pseudonym: 'PebbleMallow', mallow: 'boppo' },
  { key: 'ember', pseudonym: 'EmberMallow', mallow: 'glitzi' },
  { key: 'mod', pseudonym: 'SafetyTeam', mallow: 'loomi', role: 'moderator', catching: false },
];

export function seedRelay(service) {
  for (const p of RELAY_IDENTITIES) service.createTestAccount({ catching: true, ...p });
  return service;
}
