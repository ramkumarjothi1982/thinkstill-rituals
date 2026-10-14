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
    { id: 'restrict-user', label: 'Restrict the person who wrote it', explain: 'They can no longer catch feelings or write to anyone. Their own feelings still come home to them.',
      confirm: 'Restrict this person? They will no longer be able to catch feelings or write to anyone. A team lead can lift it later.' },
  ],
  perspective: [
    { id: 'dismiss', label: 'No action needed', explain: 'It breaks no rule. (It has already left the collection of the person who reported it.)' },
    { id: 'remove-perspective', label: 'Remove the perspective', strong: true, explain: 'It disappears from the collection it was in, for good.' },
    { id: 'restrict-user', label: 'Restrict the person who wrote it', explain: 'They can no longer catch feelings or write to anyone.',
      confirm: 'Restrict this person? They will no longer be able to catch feelings or write to anyone. A team lead can lift it later.' },
  ],
  mallow: [
    { id: 'dismiss', label: 'Close: noted for the library', strong: true, explain: 'Automatic words that missed. Note what went wrong so the Mallow library can be improved.' },
  ],
};

export const URGENT_GUIDE = {
  title: 'Someone may be in danger',
  steps: [
    'Read the words first. Hushmates never shows the team who people are, and the desk can’t contact anyone.',
    'If the words point to immediate danger and you hold information that identifies the person (for example, they reached out to us directly), call 000 and follow the safety team’s escalation procedure.',
    'Otherwise take the feeling out of circulation, note what you saw, and tell the safety lead today.',
    'Look after yourself too: reading this is hard. Talk to the safety lead, or one of the services below.',
  ],
  resources: [
    { label: 'Emergency:', detail: '000 (police, ambulance, fire).' },
    { label: 'Lifeline:', detail: '13 11 14, any time, day or night.' },
    { label: 'Suicide Call Back Service:', detail: '1300 659 467, any time.' },
    { label: 'Beyond Blue:', detail: '1300 22 4636.' },
    { label: '13YARN (Aboriginal and Torres Strait Islander crisis support):', detail: '13 92 76.' },
    { label: '1800RESPECT (family, domestic and sexual violence):', detail: '1800 737 732.' },
  ],
};
