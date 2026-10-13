// Hushmates — product rules in one place.
//
// Every limit here is enforced by the service (core/service.js), never only
// by the interface. The numbers are pilot defaults and are meant to be tuned
// after testing; changing them needs no other code change.

export const LIMITS = {
  maxActiveHushmates: 3,          // active mutual connections per person
  maxPendingOutgoing: 5,          // unanswered invitations a person may have out
  invitesPerDay: 10,              // invitations sent (any route) per rolling 24 h
  inviteTtlMs: 7 * 24 * 3600e3,   // an unanswered invitation expires after 7 days
  quietPeriodMs: 30 * 24 * 3600e3,// after a decline or disconnect, the other person can't re-invite for 30 days
  messageMaxChars: 1000,          // per message, counted in characters (code points)
  messagesPerMinute: 20,
  messagesPerDay: 600,
  pageSize: 30,                   // messages per page of history
  discoverCap: 12,                // cards returned by one Find a Hushmate request
  discoverPerHour: 40,            // limits scraping of the discovery list
  codeAttemptsPerHour: 10,        // private invitation code guesses
  reportsPerDay: 20,
  maxInterests: 5,
  reportEvidenceMessages: 20,     // a conversation report captures at most the last 20 messages
};

// The seven official Mallows (assets/mallows/<id>.png); a person's chosen
// Mallow is their only picture. Kept literal so this module has no DOM deps.
export const AVATARS = ['noomi', 'blubi', 'loomi', 'boppo', 'pipzi', 'zuzu', 'glitzi'];
export const AVATAR_NAMES = { noomi: 'Noomi', blubi: 'Blubi', loomi: 'Loomi', boppo: 'Boppo', pipzi: 'Pipzi', zuzu: 'Zuzu', glitzi: 'Glitzi' };

export const PSEUDONYM_SUGGESTIONS = [
  'MoonMallow', 'CloudMallow', 'StarMallow', 'SoftMallow', 'DreamMallow', 'MistMallow', 'DawnMallow',
  'FernMallow', 'PebbleMallow', 'LanternMallow', 'TideMallow', 'EmberMallow', 'MeadowMallow', 'HushMallow7',
];

export const INTENTS = [
  { id: 'listen', label: 'Just Listen', line: 'I’d like to share something without needing advice.' },
  { id: 'advice', label: 'Advice Welcome', line: 'I’d appreciate your thoughts.' },
  { id: 'perspective', label: 'Another Perspective', line: 'Help me see this differently.' },
  { id: 'company', label: 'Just Company', line: 'I’d simply like someone to talk to.' },
];
export const INTENT_IDS = INTENTS.map((i) => i.id);

export const STYLES = [
  { id: 'gentle', label: 'Gentle listener' },
  { id: 'slow', label: 'Slow & thoughtful' },
  { id: 'light', label: 'Light & chatty' },
  { id: 'deep', label: 'Deep conversations' },
  { id: 'practical', label: 'Practical & grounded' },
];
export const STYLE_IDS = STYLES.map((s) => s.id);

export const INTERESTS = [
  'Everyday stress', 'Work & study', 'Big changes', 'Creativity', 'Books', 'Music', 'Nature',
  'Games', 'Food', 'Movement', 'Quiet evenings', 'Living abroad', 'Pets', 'Parenting',
];

export const LANGUAGES = ['English', 'Español', 'Français', 'Deutsch', 'Português', 'हिन्दी', 'தமிழ்', '日本語'];

export const AVAILABILITY = [
  { id: 'mornings', label: 'Usually mornings' },
  { id: 'afternoons', label: 'Usually afternoons' },
  { id: 'evenings', label: 'Usually evenings' },
  { id: 'weekends', label: 'Mostly weekends' },
  { id: 'varies', label: 'It varies' },
];
export const AVAILABILITY_IDS = AVAILABILITY.map((a) => a.id);

// Voluntary status a person chooses. Never derived from activity.
export const STATUSES = [
  { id: 'available', label: 'Available', line: 'Open to conversation' },
  { id: 'quiet', label: 'Quiet mode', line: 'Here, but replies may be slow' },
  { id: 'break', label: 'Taking a break', line: 'Stepping back for a while' },
];
export const STATUS_IDS = STATUSES.map((s) => s.id);

export const REPORT_CATEGORIES = [
  { id: 'harassment', label: 'Harassment or bullying' },
  { id: 'sexual', label: 'Sexual or romantic pressure' },
  { id: 'exploitation', label: 'Grooming or exploitation concern' },
  { id: 'minor', label: 'I think this person is under 18' },
  { id: 'scam', label: 'Scam or asking for money' },
  { id: 'offplatform', label: 'Pressure to move to another app' },
  { id: 'hate', label: 'Hate or discrimination' },
  { id: 'selfharm', label: 'Worried about their safety' },
  { id: 'spam', label: 'Spam' },
  { id: 'other', label: 'Something else' },
];
export const REPORT_CATEGORY_IDS = REPORT_CATEGORIES.map((c) => c.id);
// Categories that go to the top of the human review queue.
export const URGENT_CATEGORIES = new Set(['exploitation', 'minor', 'selfharm']);

export const REPORT_STATUSES = ['open', 'in-review', 'actioned', 'no-action', 'escalated'];
export const ACCOUNT_STATES = ['active', 'restricted', 'suspended', 'removed', 'deleted'];
