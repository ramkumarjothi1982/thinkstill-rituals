// What the app says about where words go, in one place, so Settings → About
// and the Plans page never disagree.
//
// The Another Angle clause follows resolveEndpoint() (src/beyond/endpoint.js):
// while it is null (no ANGLE_ENDPOINT in src/app/config.js), Another Angle
// plays Zuzu's authored angles on the phone and both places say so; once
// Another Angle goes live (integration unit G1 sets ANGLE_ENDPOINT), both
// switch together to the approved wording (docs/integration/DECISIONS.md:
// "Plans page sentence"). On localhost, ?angleDev=<port> switches them too,
// because the words then really go to that local server.
//
// With sign-in on (src/auth/), "nothing you type leaves this phone" would not
// be true (the email and the optional name typed on the account screens are
// kept with the account), so About names what an account keeps instead.

import { resolveEndpoint } from '../beyond/endpoint.js';

/** The Plans page's Beyond note: before and after Another Angle goes live. */
export const PLANS_BEYOND_NOTE = Object.freeze({
  local: 'Another Angle works on this phone: what you type stays here.',
  live: 'Another Angle asks first, then sends only the words you choose to our secure server. Never your photos.',
});

/** What an account keeps (the same list as the account screen's "Deleted from our server"). */
export const ACCOUNT_KEEPS = 'An account is optional. If you make one, your email (and your name and home Mallow, if you choose them) is kept with it; if you switch on sync, so are the parts you choose: your settings, favourite worlds, Memory Garden and where a Hushflow paused. Never your words, feelings or photos.';

/** Whether Another Angle may send words from this build (resolveEndpoint() is not null). */
export function angleLive(endpoint = resolveEndpoint()) { return !!endpoint; }

/** The Plans page's Beyond note for this build. */
export function plansBeyondNote({ endpoint = resolveEndpoint() } = {}) {
  return angleLive(endpoint) ? PLANS_BEYOND_NOTE.live : PLANS_BEYOND_NOTE.local;
}

/**
 * Settings → About, after its first sentence (the written-in-advance one) and
 * before "It's a wellbeing app…": what stays on the phone, Another Angle, and
 * (sign-in on) what an account keeps.
 */
export function aboutPrivacy({ endpoint = resolveEndpoint(), signIn = false, beyond = 'hushmallow Beyond' } = {}) {
  const parts = [signIn ? 'Your words, feelings and photos stay on this phone.' : 'Nothing you type or add leaves this phone.'];
  parts.push(angleLive(endpoint)
    ? `The one exception is Another Angle in ${beyond}: only after you say yes, the words you choose go to our server, where an outside service prepares the perspectives you see.`
    : `Another Angle in ${beyond} works on this phone too: what you type there stays here.`);
  if (signIn) parts.push(ACCOUNT_KEEPS);
  return parts.join(' ');
}
