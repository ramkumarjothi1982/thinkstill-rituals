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
//
// About opens with what is written in advance (aboutIntro). Once Another Angle
// is live, the perspectives Zuzu shows there are prepared by the outside
// service, so that sentence names the exception too, from the same
// angleLive(endpoint) as the privacy lines: both change in the same release.
// This page never names the service, the company or the technology behind it
// (that belongs on Another Angle's consent card, privacy sheet and delete sheet).

import { resolveEndpoint } from '../beyond/endpoint.js';

/** The Plans page's Beyond note: before and after Another Angle goes live. */
export const PLANS_BEYOND_NOTE = Object.freeze({
  local: 'Another Angle works on this phone: what you type stays here.',
  live: 'Another Angle asks first, then sends only the words you choose to our secure server. Never your photos.',
});

/**
 * What an account keeps (the same list as the account screen's "Deleted from our server"): its profile row also notes when
 * the app was last opened signed in (profiles.last_seen_at, src/auth/client.js profile.touch at each start).
 */
export const ACCOUNT_KEEPS = 'An account is optional. If you make one, your email (and your name and home Mallow, if you choose them) is kept with it, as is when you last opened the app; if you switch on sync, so are the parts you choose: your settings, favourite worlds, Memory Garden and where a Hushflow paused. Never your words, feelings or photos.';

/** Whether Another Angle may send words from this build (resolveEndpoint() is not null). */
export function angleLive(endpoint = resolveEndpoint()) { return !!endpoint; }

/** The Plans page's Beyond note for this build. */
export function plansBeyondNote({ endpoint = resolveEndpoint() } = {}) {
  return angleLive(endpoint) ? PLANS_BEYOND_NOTE.live : PLANS_BEYOND_NOTE.local;
}

/**
 * Settings → About's first sentence (or two): what is written in advance. Live,
 * the perspectives Another Angle prepares are named as the one exception.
 * Plain text; Settings marks the brand in it.
 */
export function aboutIntro({ endpoint = resolveEndpoint(), beyond = 'hushmallow Beyond' } = {}) {
  return angleLive(endpoint)
    ? `Every Mallow line, world and ritual in hushmallow is written in advance, except the perspectives Another Angle prepares in ${beyond} after you say yes. Feelings are matched with fixed word lists: you always choose what fits.`
    : 'Every Mallow line, world and ritual in hushmallow is written in advance, and feelings are matched with fixed word lists: you always choose what fits.';
}

/**
 * Settings → About, after its first sentence (the written-in-advance one) and
 * before "It's a wellbeing app…": what stays on the phone, Another Angle, and
 * (sign-in on) what an account keeps.
 */
export function aboutPrivacy({ endpoint = resolveEndpoint(), signIn = false, beyond = 'hushmallow Beyond' } = {}) {
  const parts = [signIn ? 'Your words, feelings and photos stay on this phone.' : 'Nothing you type or add leaves this phone.'];
  // (what Another Angle sends is its words and, when picked there, the feeling and the kind of help: src/beyond/angle-client.js
  // angle(), as its privacy sheet says — so the exception names all three, beside "Your words, feelings and photos stay")
  parts.push(angleLive(endpoint)
    ? `The one exception is Another Angle in ${beyond}: only after you say yes, the words you choose go to our server, with the feeling and the kind of help you pick there, and an outside service prepares the perspectives you see.`
    : `Another Angle in ${beyond} works on this phone too: what you type there stays here.`);
  if (signIn) parts.push(ACCOUNT_KEEPS);
  return parts.join(' ');
}
