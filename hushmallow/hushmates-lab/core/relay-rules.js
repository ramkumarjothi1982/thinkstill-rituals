// Hushmates Feeling Relay: the service's own tuning. Server-only: it never
// reaches a browser (tools/build-app.mjs refuses a build that includes it).
//
// Durations are pilot defaults, meant to be tested and tuned; nothing here is
// a permanent product rule. The service (core/relay.js) enforces all of it.

import { SHOWN_LIMITS } from './relay-config.js';

export const RELAY = {
  ...SHOWN_LIMITS,
  offerHoldMs: 3 * 60e3,              // a feeling waits 3 min for the person it found to decide
  catchHoldMs: 10 * 60e3,             // after catching, 10 min to write a perspective
  fallbackAfterMs: 30 * 60e3,         // no human perspective by then → offer a Mallow perspective (if allowed)
  journeyTtlMs: 24 * 3600e3,          // after 24 h a feeling returns with whatever it has
  maxResends: 2,                      // "Send it out again" for a feeling nobody caught, per feeling
  submissionsPerHour: 6,              // anti-spam, not a lifetime quota
  submissionsPerDay: 24,
  findsPerHour: 40,                   // looking for a feeling to catch
  reframesPerHour: 12,
  reportsPerDay: 20,
  fallbackPerPersonPerDay: 5,         // Mallow perspectives a person can ask for per day
  fallbackGlobalPerDay: 500,          // whole-service ceiling (cost guard), on top of the provider's own caps
  fallbackMaxOutputTokens: 300,       // passed to the provider
  fallbackTimeoutMs: 45e3,            // a provider that hasn't answered by then has failed (the feeling still comes home)
  fairnessPool: 3,                    // pick at random among the N longest-waiting eligible feelings
  reportsToPause: 2,                  // independent reports pause a feeling for human review
  similarity: 0.8,                    // a perspective this close to an earlier one is asked to rephrase
};

// How each Mallow offers a perspective (used by the providers).
// Every Mallow stays grounded: no forced positivity, no humour that shrinks
// distress, no diagnosis, nothing presented as fact about another mind.
export const MALLOW_VOICES = {
  noomi: 'gentle and reassuring',
  blubi: 'warm, empathetic and accepting',
  pipzi: 'playful, curious and optimistic',
  boppo: 'encouraging and appreciative',
  zuzu: 'unexpected and imaginative',
  loomi: 'calm, balanced and grounded',
  glitzi: 'cheeky, direct and constructively challenging',
};

// The Mallow perspective comes from the author's own Mallow (the one that carried
// the feeling), in that Mallow's voice (MALLOW_VOICES).
