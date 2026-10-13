// Hushmates Feeling Relay: every rule and limit in one place.
// "One feeling. Five perspectives. Back to you."
//
// Durations are pilot defaults, meant to be tested and tuned; nothing here is
// a permanent product rule. The service (core/relay.js) enforces all of it.

export const RELAY = {
  perspectivesPerFeeling: 5,          // distinct human reframes before a feeling returns home
  offerHoldMs: 3 * 60e3,              // a feeling waits 3 min for the person it found to decide
  catchHoldMs: 10 * 60e3,             // after catching, 10 min to write a perspective
  fallbackAfterMs: 30 * 60e3,         // no human perspective by then → offer a Mallow perspective (if allowed)
  journeyTtlMs: 24 * 3600e3,          // after 24 h a feeling returns with whatever it has
  maxActiveJourneys: 3,               // feelings travelling at once, per person
  feelingMinChars: 3,
  feelingMaxChars: 500,
  reframeMinChars: 8,
  reframeMaxChars: 280,
  submissionsPerHour: 6,              // anti-spam, not a lifetime quota
  submissionsPerDay: 24,
  findsPerHour: 40,                   // looking for a feeling to catch
  reframesPerHour: 12,
  reportsPerDay: 20,
  fallbackPerPersonPerDay: 5,         // Mallow perspectives a person can ask for per day
  fallbackGlobalPerDay: 500,          // whole-service ceiling (cost guard), on top of the provider's own caps
  fallbackMaxOutputTokens: 300,       // passed to the provider
  fairnessPool: 3,                    // pick at random among the N longest-waiting eligible feelings
  reportsToPause: 2,                  // independent reports pause a feeling for human review
  similarity: 0.8,                    // a perspective this close to an earlier one is asked to rephrase
};

export const FEELING_LABELS = [
  { id: 'worry', label: 'Worry', colour: '#7FD4FF' },
  { id: 'sadness', label: 'Sadness', colour: '#8FB8FF' },
  { id: 'anger', label: 'Anger', colour: '#FF8A7A' },
  { id: 'joy', label: 'Joy', colour: '#FFD14A' },
  { id: 'loneliness', label: 'Loneliness', colour: '#C9B8FF' },
  { id: 'confusion', label: 'Confusion', colour: '#B583FF' },
  { id: 'frustration', label: 'Frustration', colour: '#FF8C5C' },
  { id: 'excitement', label: 'Excitement', colour: '#FF6FB5' },
];
export const LABEL_IDS = FEELING_LABELS.map((l) => l.id);

export const MALLOW_IDS = ['noomi', 'blubi', 'pipzi', 'boppo', 'zuzu', 'loomi', 'glitzi'];

// How each Mallow offers a perspective (used by the providers and the UI).
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

// Which Mallow offers a fallback perspective for a feeling label.
export const FALLBACK_MALLOW = {
  worry: 'loomi', sadness: 'blubi', anger: 'glitzi', joy: 'boppo', loneliness: 'noomi',
  confusion: 'zuzu', frustration: 'glitzi', excitement: 'pipzi', none: 'loomi',
};

export const REPORT_REASONS = [
  { id: 'unkind', label: 'Unkind or judgemental' },
  { id: 'harassment', label: 'Harassment or hate' },
  { id: 'identifying', label: 'Shares personal details' },
  { id: 'sexual', label: 'Sexual content' },
  { id: 'scam', label: 'Spam, scam or asking for money' },
  { id: 'safety', label: 'Someone may be in danger' },
  { id: 'other', label: 'Something else' },
];
export const REPORT_REASON_IDS = REPORT_REASONS.map((r) => r.id);

export const PERSPECTIVE_LABELS = {
  human: 'From a Hushmates member',
  ai: 'A Mallow perspective · AI-generated',
  library: 'A Mallow perspective · from the Reframe library, not AI',
  demo: 'A Mallow perspective · demo example, not live AI',
};
