// Server-only additions to the shared lexicon (src/safety/shared-lexicon.js is
// a verbatim copy of the app's and must not be edited here). These are extra
// ways of saying things the shared list already treats as crisis or care.
// If the app adopts any of them, delete them here.

const R = String.raw;

export const EXTRA_LEXICON = {
  crisis: [
    R`\b(?:took|take|taking|swallow(?:ed|ing)?) (?:all|a lot of|loads of|too many|a bunch of|a whole (?:box|packet) of) (?:of )?(?:my |the |those |these )?(?:pills|tablets|meds|medication|painkillers)\b`,
    R`\bwhat'?s the point (?:of|in) (?:living|being alive|going on|carrying on|me being here|me being alive)\b`,
    R`\bwant (?:it all|everything|it) to (?:stop|end) (?:for good|forever|permanently)\b`,
    R`\b(?:want|wanna|wish i could) (?:to )?disappear and never come back\b`,
    R`\bsewer ?slide\b`,
  ],
  crisisOther: [
    R`\b(?:he|she|they|my \w+) (?:took|has taken|have taken|swallowed) (?:an overdose|too many (?:pills|tablets))\b`,
    R`\b(?:said|says|keeps saying|told me) (?:she|he|they)(?:'d| would| wants? to| is going to|'s going to) (?:kill|hurt|harm) (?:himself|herself|themselves|themself)\b`,
  ],
  care: {
    abuse: [
      R`\b(?:hurts?|hurting|hits?|hitting) (?:my )?(?:child|children|kid|kids|son|daughter|baby)\b`,
      R`\bmakes? me (?:do sexual|have sex)\b`,
    ],
    threat: [
      R`\bthreat(?:en|ened|ening|ens) (?:my|us)\b`,
    ],
    unsafe: [
      R`\b(?:scared|afraid|frightened|terrified) for my (?:life|safety)\b`,
    ],
  },
};

/** Used when the model (not the lexicon) flags care: brief, warm, no reframe. */
export const GENERAL_CARE = {
  title: 'Let’s pause the angle',
  message: 'What you’ve written sounds like it might need more than a new perspective. You deserve real support with it. If you can, talk to someone you trust or a support service about what’s going on.',
};
