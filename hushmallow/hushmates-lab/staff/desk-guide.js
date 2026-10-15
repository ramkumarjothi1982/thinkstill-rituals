// What the safety desk tells the team: the decisions it can make and, for a report that
// someone may be in danger, what to do. Written for the private beta in Australia.
//
// To be reviewed before launch by a clinical safety adviser and by legal counsel (duty of
// care, escalation, record keeping): see docs/READINESS.md. The numbers are the national
// services' published numbers; check them again at that review.

export const DESK_ACTIONS = {
  feeling: [
    { id: 'resume-feeling', label: 'Let it carry on', explain: 'Nothing wrong with it. If it still has time, it travels again.' },
    { id: 'remove-feeling', label: 'Take it out of circulation', strong: true, explain: 'Nobody else is offered it. It goes home to the person who wrote it now, with whatever came back.' },
    { id: 'restrict-user', label: 'Restrict the person who wrote it', explain: 'They can no longer release or catch feelings, ask their Mallow, or write to anyone. Feelings already travelling stop being offered, and still come home to them.',
      confirm: 'Restrict this person? They will no longer be able to release or catch feelings, ask their Mallow, or write to anyone. A team lead can lift it later.' },
  ],
  perspective: [
    { id: 'dismiss', label: 'No action needed', explain: 'It breaks no rule. (It has already left the collection of the person who reported it.)' },
    { id: 'remove-perspective', label: 'Remove the perspective', strong: true, explain: 'It disappears from the collection it was in, for good.' },
    { id: 'restrict-user', label: 'Restrict the person who wrote it', explain: 'They can no longer release or catch feelings, ask their Mallow, or write to anyone. Feelings already travelling stop being offered, and still come home to them.',
      confirm: 'Restrict this person? They will no longer be able to release or catch feelings, ask their Mallow, or write to anyone. A team lead can lift it later.' },
  ],
  mallow: [
    { id: 'dismiss', label: 'Close: noted for the library', strong: true, explain: 'Automatic words that missed. Note what went wrong so the Mallow library can be improved.' },
  ],
};

export const URGENT_GUIDE = {
  title: 'Someone may be in danger',
  // In this order, the same as docs/ESCALATION.md §3 (tests/desk-guide.test.mjs checks they match).
  steps: [
    'Read the words first. The desk never shows who anyone is, and it can’t contact anyone.',
    'If it’s a feeling, take it out of circulation unless it clearly isn’t about danger (a “Someone may be in danger” report usually pauses it, but not always: check, and take it out of circulation if it’s still travelling). If it’s a perspective, remove it.',
    'If the words point to immediate danger and the team independently holds information that identifies the person (for example, they emailed us directly), call 000 and give what you know.',
    'Write what you saw and did in the team notes (no diagnosis, no guesses about who it is), and tell the safety lead today. If you can’t decide, ring the safety lead now.',
    'If the screen should have caught these words, add a paraphrase (never their words) to the review list.',
    'Look after yourself too: reading this is hard. Talk to the safety lead, or one of the services below.',
  ],
  resources: [
    { label: 'Emergency:', detail: '000 (police, ambulance, fire).' },
    { label: 'Lifeline:', detail: '13 11 14, any time, day or night.' },
    { label: 'Suicide Call Back Service:', detail: '1300 659 467, any time.' },
    { label: 'Beyond Blue:', detail: '1300 22 4636, any time.' },
    { label: '13YARN (Aboriginal and Torres Strait Islander crisis support):', detail: '13 92 76.' },
    { label: '1800RESPECT (family, domestic and sexual violence):', detail: '1800 737 732.' },
  ],
};

// The team's own target for a priority report (docs/ESCALATION.md §2): looked at within 12 hours.
// It's never promised to reporters; the desk marks a priority report still open after it.
export const OVERDUE_MS = 12 * 60 * 60e3;

/** True for a priority report ("Someone may be in danger") still open more than 12 hours after it came in. */
export function isOverdue(report, now = Date.now()) {
  if (!report || !report.urgent || report.status !== 'open' || report.at == null || report.at === '') return false;
  const at = Number(report.at);
  return Number.isFinite(at) && Number.isFinite(now) && now - at > OVERDUE_MS;
}
