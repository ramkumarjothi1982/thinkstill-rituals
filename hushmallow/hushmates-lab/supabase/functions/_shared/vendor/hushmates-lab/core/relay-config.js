// Hushmates Feeling Relay: what people see. Labels, reasons, and the few
// limits the interface shows (how many perspectives, how many characters).
// "One feeling. Five perspectives. Back to you."
//
// This file reaches browsers. The service's own tuning (hold times, rate
// limits, budgets, review thresholds) is server-only, in core/relay-rules.js.

/** Limits a person can see in the interface. The service enforces them (core/relay-rules.js). */
export const SHOWN_LIMITS = {
  perspectivesPerFeeling: 5,          // distinct human perspectives before a feeling returns home
  maxActiveJourneys: 3,               // feelings travelling at once, per person
  feelingMinChars: 3,
  feelingMaxChars: 500,
  reframeMinChars: 8,
  reframeMaxChars: 280,
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

// What a person sees. Never technical, never misleading about who wrote it.
export const PERSPECTIVE_LABELS = {
  human: 'A Hushmate’s perspective',
  ai: 'A Mallow perspective · Automatically generated',
  library: 'A Mallow perspective · Automatically generated',     // the rule-based Reframe library: automatic, not a person
};
