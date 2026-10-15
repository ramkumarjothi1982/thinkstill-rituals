// What the service says when it can't do something, in words written for people.
// Shared by the lab's engine (core/relay.js) and the Hushmates Edge Function, so both
// answer the same way. A specific message given with an error replaces these.

import { SHOWN_LIMITS } from './relay-config.js';

export const RELAY_MESSAGES = {
  'not-signed-in': 'Please sign in again.',
  'account-inactive': 'This account can’t do that right now.',
  'not-found': 'That isn’t available.',
  'invalid': 'Something didn’t go through. Please try again.',
  'forbidden': 'That isn’t something you can do here.',
  'rate-limited': 'That’s a lot in a short time. Please pause for a moment.',
  'too-many-active': `You have ${SHOWN_LIMITS.maxActiveJourneys} feelings travelling already. When one comes home, you can send another.`,
  'not-catching': 'Turn on “Let feelings find me” to catch feelings.',
  'hold-expired': 'This feeling drifted on while you were away. Thank you for looking.',
  'not-available': 'This feeling has moved on.',
  'already-contributed': 'You’ve already offered a perspective on this feeling.',
  'fallback-off': 'You chose not to have a Mallow offer a perspective on this feeling.',
  'fallback-not-yet': 'A Mallow perspective becomes available if nobody catches your feeling for a while.',
  'fallback-budget': 'Mallows are resting for today. Your feeling keeps travelling and will still come home.',
  'fallback-held': 'A Mallow can’t offer a perspective while this feeling is with our safety team.',
  'consent-required': 'Please confirm you’re happy to share this without your name first.',
  'resend-limit': 'This feeling has already travelled a few times. You can keep it with you, or let it go.',
  'invite-required': 'Please enter your invitation first.',
  'already-decided': 'This report has already been decided, so nothing was changed.',
  'invite-invalid': 'That invitation code didn’t work. It may have been used already or expired. Please check it, or ask the person who invited you.',
};
