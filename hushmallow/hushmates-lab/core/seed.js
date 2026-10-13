// Simulated test identities for the lab. Every one is flagged `test: true`
// and the interface labels them as test identities. Their e-mails are
// private registration details used only to prove that nothing shows them.

export const DEMO_ACCOUNTS = [
  { key: 'moon', email: 'moon.test@example.invalid' },   // starts with no identity: the lab shows creating one
  {
    key: 'cloud', email: 'cloud.test@example.invalid',
    profile: { pseudonym: 'CloudMallow', avatar: 'blubi', interests: ['Everyday stress', 'Work & study', 'Music'], style: 'gentle', language: 'English', availability: 'evenings', discoverable: true },
  },
  {
    key: 'star', email: 'star.test@example.invalid',
    profile: { pseudonym: 'StarMallow', avatar: 'pipzi', interests: ['Books', 'Nature', 'Big changes'], style: 'deep', language: 'English', availability: 'weekends', discoverable: true },
  },
  {
    key: 'fern', email: 'fern.test@example.invalid',
    profile: { pseudonym: 'FernMallow', avatar: 'loomi', interests: ['Quiet evenings', 'Creativity'], style: 'slow', language: 'English', availability: 'varies', discoverable: true, acceptingInvites: false },
  },
  {
    key: 'dream', email: 'dream.test@example.invalid',   // has an identity but never opted into discovery
    profile: { pseudonym: 'DreamMallow', avatar: 'zuzu', interests: ['Everyday stress', 'Music'], style: 'gentle', language: 'English', availability: 'evenings', discoverable: false },
  },
  { key: 'mod', email: 'moderator.test@example.invalid', role: 'moderator' },
];

export function seedDemo(service) {
  for (const a of DEMO_ACCOUNTS) {
    service.createTestAccount({ key: a.key, email: a.email, role: a.role || 'member' });
    if (a.profile) service.saveProfile(service.signInTestAccount(a.key), a.profile);
  }
  return service;
}
