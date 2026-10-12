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
    // added 12 Oct 2026 (review: missed by the shared list; sent to W3 for src/data/safety-lexicon.js)
    R`\b(?:stockpil\w*|hoard(?:ed|ing)?|sav(?:ed|ing) up) (?:up )?(?:all )?(?:of )?(?:my |the |some |those |these )?(?:pills|tablets|meds|medication|painkillers|paracetamol|sleeping pills)\b`,
    R`\b(?:so |completely |totally |just |really )?done with (?:life|living|being alive|existing)\b`,
    R`\b(?:no|(?:don'?t|do not|can'?t|cannot|never) see (?:a|any)) way out\b(?! of (?:the|this|that|my|our|a) (?:contract|deal|lease|job|course|meeting|car park|building|room|maze|queue|traffic))`,
    R`\b(?:want|wanna|wish i could|wish i would|would like) (?:to )?(?:just )?(?:go to )?sleep (?:forever|for ever|and never wake(?: up)?|and not wake(?: up)?)\b`,
    R`\b(?:anyone|anybody|nobody|no one|no-one|noone) would (?:even |really |ever )?(?:notice|care|miss me) if i (?:wasn'?t|weren'?t|was not|were not) (?:around|here|alive|there)(?: any ?more)?\b`,
    R`\b(?:anyone|anybody) would (?:even |really |ever )?(?:notice|care|miss me) if i (?:was|were) gone\b`,
    R`\blife (?:is|feels|seems) (?:so |completely |totally |just )?(?:pointless|meaningless)\b`,
    R`\bi'?m (?:just |only )?a burden\b(?! (?:on|to) (?:the|my|our) (?:team|project|budget|company|business))`,
  ],
  crisisOther: [
    R`\b(?:he|she|they|my \w+) (?:took|has taken|have taken|swallowed) (?:an overdose|too many (?:pills|tablets))\b`,
    R`\b(?:said|says|keeps saying|told me) (?:she|he|they)(?:'d| would| wants? to| is going to|'s going to) (?:kill|hurt|harm) (?:himself|herself|themselves|themself)\b`,
    // added 12 Oct 2026 (review): self-harm by someone else
    // Habitual or deliberate forms only: "cut herself a slice", "cut himself shaving" are not this.
    R`\b(?:cuts|cutting|burns|burning|starves|starving|punishes|punishing) (?:himself|herself|themselves|themself)\b`,
    R`\b(?:cut|burned|burnt|starved|hurt|harmed) (?:himself|herself|themselves|themself) (?:again|on purpose|deliberately|intentionally)\b`,
    R`\b(?:has|have|had|keeps?|started|been) (?:been )?(?:cutting|burning|starving|harming|hurting) (?:himself|herself|themselves|themself)\b`,
  ],
  care: {
    abuse: [
      R`\b(?:hurts?|hurting|hits?|hitting) (?:my )?(?:child|children|kid|kids|son|daughter|baby)\b`,
      R`\bmakes? me (?:do sexual|have sex)\b`,
      // added 12 Oct 2026 (review probes): monitoring as control
      R`\b(?:checks?|checking|reads?|reading|tracks?|tracking) (?:all )?(?:of )?my (?:phone|messages|texts|location|emails)\b(?= .*\b(?:every|always|all the time|each|won'?t let|makes? me|demands?|without asking)\b)`,
    ],
    harassment: [
      R`\b(?:keeps?|kept|keep on|always) calling me (?:names|\w+ names)\b`,
      R`\b(?:keeps?|kept) touching (?:me|my (?:shoulder|back|leg|legs|hair|waist|arm|knee|bum|bottom|hand|neck))\b`,
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
