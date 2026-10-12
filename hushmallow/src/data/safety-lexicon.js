// Safety lexicon shared by every path that reads free text: the Hushfold's
// free input overlay, the classic express screen, Another Angle (hushmallow
// Beyond) and, as a copy, the Another Angle server's pre-check.
//
// Plain data (regular-expression sources as strings), no imports, so it can be
// copied verbatim into the server bundle. src/ultra/frameworks.js re-exports
// HARM_LEXICON and HARM_COPY from here; src/engine/safety.js compiles them.
//
// Patterns are matched case-insensitively against tidied text, after
// `idiomGuards` spans have been blanked out (so "this deadline is killing me"
// never trips). Judgement: we lean towards caution. A care message shown by
// mistake is a small cost; missing someone in danger is not.

const R = String.raw;

export const HARM_LEXICON = {
  idiomGuards: [
    R`\bkill(?:ed|ing)? my ?self laughing\b`,
    R`\b(?:nearly|almost|could have|could've) died (?:laughing|of (?:embarrassment|shame|laughter|cringe))\b`,
    R`\bdied (?:of|from) (?:embarrassment|laughter|laughing|shame|cringe)\b`,
    R`\b(?:could|would) kill for an?\b`,
    R`\bkill for an?\b`,
    R`\b(?:is|are|was|were|it'?s|they'?re|that'?s|this is) (?:literally |actually |honestly )?killing me\b`,
    R`\bdying (?:to|for|of laughter|of embarrassment|laughing)\b`,
    R`\bto die for\b`,
    R`\b(?:(?:want|wanted|going) to|wanna|gonna) (?:just )?die of (?:embarrassment|shame|cringe|laughter|laughing|boredom)\b`,
    // medicine taken as it should be
    R`\b(?:took|take|taking|taken) (?:all (?:of )?)?my (?:pills|tablets|meds|medication|medicine) (?:on time|as prescribed|like (?:i'?m|i am|i was) supposed to|like the doctor (?:said|told me))\b`,
  ],
  crisis: [
    // 'my self' as two words too (review 12 Oct: 'i want to kill my self')
    R`\bkill(?:ing)? my ?self\b`,
    R`\bkms\b`,
    R`\bsuicid\w*`,
    R`\bend(?:ing)? (?:it all|my life|my own life|things for good|everything for good)\b`,
    R`\b(?:want|wanna|going|planning|ready|need) to end it\b(?! (?:with|between|off))`,
    // any tense ('I'm thinking of taking my own life'); 'taking my life back' and 'my life in my hands' stay none
    R`\b(?:tak(?:e|es|ing|en)|took) my (?:own )?life\b(?! (?:back|in(?:to)? (?:my|both|your) (?:own )?hands|seriously|one day at a time|step by step|forward|in a new direction))`,
    R`\b(?:don'?t|do not|no longer|dont) want to (?:be here|be alive|live|exist|wake up|go on|be around)\b`,
    R`\b(?:want|wanted|going|deserve|need|ready) to (?:just )?die\b`,
    // 'wanna' already carries the 'to' (review 12 Oct: 'I wanna die', 'I wanna end it')
    R`\bwanna (?:just )?(?:die\b|end it\b(?! (?:with|between|off)))`,
    R`\bwish i could (?:just )?die\b`,
    R`\b(?:would|'d) (?:just )?rather (?:be dead|not be alive|not exist|die(?! than\b))\b`,
    R`\bwish (?:i (?:was|were|had)|i'd) never (?:been )?born\b`,
    R`\bshould (?:never have|have never|'ve never|never'?ve) been born\b`,
    R`\b(?:took|taken|take|taking|swallowed|downed) (?:a (?:bunch|load|handful|lot|whole (?:packet|box|bottle|strip)) of|all (?:of )?(?:my|the)|too many|loads of|lots of) (?:my |the )?(?:pills|tablets|meds|medication|painkillers|paracetamol|sleeping (?:pills|tablets))\b`,
    R`\bwhat(?:'?s| is) the point (?:of|in) (?:me )?(?:living(?! (?:in|with|here|there|near|at|on|together|off|like|abroad|alone|somewhere|by|next|apart|under|away|a|the|my|our)\b)|being alive|going on|carrying on|being here|existing)\b`,
    R`\bwant (?:my life|it all|everything) to (?:be over|end|stop)\b(?! (?:for a (?:bit|minute|moment|second|while|day)|so i can|until|till))`,
    R`\bwish i (?:was|were) dead\b`,
    R`\bwish i (?:wasn'?t|was not|weren'?t|were not) (?:here|alive|born|around)\b`,
    R`\b(?:hurt|hurting|harm|harming|cut|cutting|burn|burning|punish|punishing|starve|starving) my ?self\b`,
    R`\bself[- ]?harm\w*`,
    R`\bno (?:reason|point) (?:to|in|for) (?:live|living|go on|going on|carry on|being alive|being here|me being here|carrying on)\b`,
    R`\bnothing (?:left )?to live for\b`,
    R`\bbetter off (?:dead|without me)\b`,
    R`\bcan'?t go on\b`,
    R`\boverdos\w*`,
    R`\bnot worth living\b`,
    R`\blife (?:isn'?t|is not|isnt) worth (?:it|living)\b`,
    R`\b(?:(?:want|wish) to|wanna|wish i could) (?:just )?disappear (?:forever|for good|and never come back)\b`,
    R`\bi'?m a burden (?:to|on) (?:everyone|everybody|my family|them|people)\b`,
    R`\b(?:goodbye|suicide) (?:letter|note)\b`,
    R`\b(?:(?:go to|fall) )?(?:sleep|asleep) and (?:never|not) wake(?: up)?\b(?! up\b)(?! (?:until|till|before|for|early|at|in time|on time)\b)`,
    // added 12 Oct 2026 (audit: missed by both detectors)
    R`\b(?:nobody|no one|no-one|noone|nobody else) (?:would|will|is going to|'?d|is gonna) (?:even |really |ever )?(?:miss|notice) (?:me|if i(?:'?m| was| were) gone)\b`,
    R`\b(?:thinking|thought|think|considering|been thinking) (?:of|about) (?:ending it|ending it all|ending my life|ending things|killing myself|not being (?:here|alive|around))\b(?! (?:with|between|off))`,
    R`\b(?:hang|hanging|drown|drowning|poison|poisoning|unalive|unaliving) my ?self\b`,
    R`\b(?:want|wanna|wish i could) (?:to )?be dead\b`,
    R`\bjump(?:ing)? (?:off (?:a|the) (?:bridge|building|roof|cliff)|in front of (?:a|the) (?:train|bus|car|lorry|truck))\b`,
    R`\beveryone (?:would|will|'?d) be (?:better|happier) (?:off )?(?:if i (?:was|were) gone|without me)\b`,
    // added 12 Oct 2026, review round 3 (common first-person phrasings the free gate missed)
    R`\b(?:want|wanted|wanna|wish i could|wish to|would rather|'d rather) (?:to )?(?:just )?(?:stop existing|not exist(?:ing)?|cease to exist|stop being alive)\b(?! (?:on|online|in (?:the|this|that|our|my) (?:group|chat|office|class|team))\b)`,
    // 'dying', but never 'dying my hair' (a common spelling of dyeing)
    R`\b(?:keep |kept |been |always |constantly |can'?t stop |cannot stop )?(?:thinking|think|thought) (?:about|of) (?:dying\b(?! (?:my|her|his|their|the|it|your|a|some|them)\b)|being dead\b|not waking up\b|never waking up\b)`,
    R`\b(?:no one|nobody|no-one|noone) (?:would|will|'?d|is going to|is gonna) (?:even |really |ever )?(?:care|notice|mind|miss me) if i (?:died|die|was gone|were gone|disappeared|disappear|wasn'?t here|weren'?t here|was dead|were dead|killed myself)\b(?! (?:my|her|his|their) hair\b)`,
    // cutting as self-harm, never cutting carbs, costs, onions or hair
    R`\b(?:been |started |start |keep |kept |still |went back to |gone back to |back to |stopped )cutting(?: again\b| my ?self\b| my (?:arms?|legs?|wrists?|skin|thighs?|stomach|body)\b|\s*(?:[.!?,;]|$))`,
    R`\bdone with (?:life\b(?! (?:admin|insurance|coaching|lessons)\b)|being alive\b|existing\b|living\b(?! (?:in|with|here|there|at|on|near|abroad|together|apart|out of)\b))`,
    R`\b(?:hope|wish|want|pray) (?:that )?i (?:never|don'?t|do not|won'?t) wake(?: up)?\b(?! up\b)(?! (?:until|till|before|early|at|in time|on time|(?:this|that|so|as) (?:early|late))\b)`,
    R`\b(?:have|got|'ve got|saved|saving|stockpiled|stockpiling|collected|collecting) (?:up )?(?:the |my |enough |all (?:the |my )?)?(?:pills|tablets|meds|medication|painkillers) (?:ready|saved up|stockpiled|lined up|to (?:do it|end it|take them all))\b(?! for (?:the|my|a|our|your|work|school|holiday|travel|trip|journey|flight|morning|bed|breakfast|mum|mom|dad|grandma|grandad)\b)`,
    R`\bstockpil\w* (?:my |the )?(?:pills|tablets|meds|medication|painkillers)\b`,
  ],
  crisisOther: [
    R`\b(?:kill|killing|hurt|hurting|harm|harming|end) (?:himself|herself|themselves|themself)\b`,
    R`\btake (?:his|her|their) (?:own )?life\b`,
    R`\b(?:is|are|am|'s|'re|'m) in (?:immediate |real |serious )?danger\b(?! of)`,
    R`\b(?:he|she|they|someone|somebody) (?:is|are|'s|'re) not breathing\b`,
  ],
  care: {
    abuse: [
      R`\babus(?:e|ed|er|ers|ive|ing)\b`,
      R`\bcoerc\w*`,
      R`\bgaslight\w*`,
      R`\bmolest\w*`,
      R`\bassault(?:ed|ing|s)?\b`,
      R`\brap(?:e|ed|ist)\b`,
      R`\bgroomed me\b`,
      R`\btouched me (?:without|when i|even though|after i)\b`,
      R`\bforced me\b`,
      R`\bwon'?t let me (?:leave|go out|see (?:my )?(?:friends|family)|have (?:my own )?money|work|have my phone)\b`,
      R`\bcontrols? (?:all )?(?:of )?my (?:money|phone|messages|life|food)\b`,
      R`\b(?:goes|went|keeps going) through my phone\b`,
    ],
    violence: [
      R`\b(?:he|she|they|my (?:partner|boyfriend|girlfriend|husband|wife|ex|dad|father|mum|mom|mother|stepdad|stepmum|stepmom|brother|sister|boss|teacher|flatmate|roommate|son|daughter)|someone|somebody)(?: has| had)? (?:hit|hits|punched|punches|kicked|kicks|slapped|slaps|choked|chokes|strangled|strangles|beat|beats|shoved|shoves|smacked|smacks|attacked|attacks|grabbed|grabs) me\b`,
      R`\bbeat(?:s|en)? me up\b`,
      R`\b(?:physically|violently) (?:hurt|attacked|assaulted)\b`,
      R`\bdomestic (?:violence|abuse)\b`,
      R`\b(?:pulled|held|waved) a (?:knife|gun|weapon)\b`,
      R`\b(?:knife|gun|weapon) (?:at|to) (?:me|my)\b`,
      R`\bthrew (?:things|something|a \w+) at me\b`,
      R`\bpushed me (?:over|down|against|into|out)\b`,
    ],
    threat: [
      R`\bthreat(?:en|ened|ening|ens) (?:me|to)\b`,
      R`\bthreatening (?:messages|texts|calls|emails|me)\b`,
      R`\bdeath threats?\b`,
      R`\b(?:said|says|told me) (?:he|she|they)(?:'d| would| will|'ll) (?:kill|hurt|hit|find) me\b`,
      R`\bblackmail\w*`,
      R`\b(?:going to|gonna|will|threatened to) (?:leak|share|post|send) (?:my )?(?:photos|pictures|nudes|videos)\b`,
    ],
    harassment: [
      R`\bharass\w*`,
      R`\bstalk(?:s|ed|ing)? me\b`,
      R`\bstalker\b`,
      R`\bbull(?:y|ied|ies|ying)\b`,
      R`\bunwanted (?:touching|advances|messages|photos|pictures|attention|contact)\b`,
      R`\b(?:sexual|creepy|sleazy|dirty) (?:comments|messages|remarks|jokes) (?:about|at|to) me\b`,
      R`\bsends? me (?:nudes|explicit|sexual)\b`,
      R`\bwon'?t (?:stop (?:messaging|texting|calling|following|contacting) me|leave me alone)\b`,
      R`\bdoxx?(?:ed|ing)?\b`,
      R`\bleaked my\b`,
      R`\bfollow(?:s|ed|ing)? me home\b`,
      R`\bspread(?:s|ing)? (?:rumou?rs|lies) about me\b`,
    ],
    discrimination: [
      R`\b(?:racis[mt]|racial(?:ly)? (?:abuse|abused|slur|slurs)|sexis[mt]|homophob\w*|transphob\w*|biphob\w*|ableis[mt]|misogyn\w*|islamophob\w*|antisemit\w*|xenophob\w*|discriminat\w*)`,
      R`\bslurs?\b`,
      R`\b(?:because|cos|coz) (?:i'?m|i am) (?:black|brown|asian|gay|lesbian|bi|trans|queer|disabled|a woman|a girl|muslim|jewish|an immigrant|foreign|pregnant|autistic|neurodivergent)\b`,
      R`\bfor being (?:black|brown|asian|gay|lesbian|bi|trans|queer|disabled|a woman|muslim|jewish|an immigrant|pregnant|autistic)\b`,
    ],
    unsafe: [
      R`\b(?:don'?t|do not|dont) feel safe\b`,
      R`\b(?:not|never) safe (?:at home|with (?:him|her|them))\b`,
      R`\b(?:scared|afraid|frightened|terrified) (?:to go home|of (?:him|her|them|my (?:partner|boyfriend|girlfriend|husband|wife|dad|father|mum|mom|mother|stepdad|stepmum|stepmom|ex))(?!'s|\w))`,
      R`\bfear for my (?:life|safety)\b`,
    ],
  },
};

const EMERGENCY = { label: 'Right now', detail: 'If you or anyone else is in immediate danger, call 999 (UK), 911 (US), 112 (EU) or your local emergency number.' };
const ELSEWHERE = { label: 'Anywhere else', detail: 'findahelpline.com lists free, confidential helplines in many countries.' };

export const HARM_COPY = {
  crisis: {
    title: 'Let’s pause the reframe',
    message: 'What you’ve written sounds really painful, and it matters. This isn’t something to look at from another angle — you deserve real support with it, right now. If you might act on these thoughts, or you’re not safe, please call your local emergency number. If you can, tell someone near you how you’re feeling. You don’t need the right words first.',
    resources: [
      EMERGENCY,
      { label: 'Samaritans (UK & Ireland)', detail: 'Call 116 123 — free, any time, day or night.' },
      { label: '988 Suicide & Crisis Lifeline (US)', detail: 'Call or text 988.' },
      ELSEWHERE,
    ],
  },
  crisisOther: {
    title: 'Someone might be in danger',
    message: 'If someone might be about to hurt themselves, or is in danger right now, that comes before anything else. Call your local emergency number. If it’s safe to, stay with them or keep talking to them. You don’t have to handle this alone — a helpline can also talk you through what to do.',
    resources: [
      EMERGENCY,
      { label: 'Samaritans (UK & Ireland)', detail: 'Call 116 123 — they also support people worried about someone else.' },
      { label: '988 Suicide & Crisis Lifeline (US)', detail: 'Call or text 988, including if you’re worried about someone else.' },
      ELSEWHERE,
    ],
  },
  care: {
    abuse: {
      title: 'This isn’t one to reframe',
      message: 'What you’re describing sounds like it could be abuse, and it isn’t something to find a kinder angle on. It’s not your fault, and you don’t deserve it. If you can, tell someone you trust or contact a support service — they can help you think through your options at your own pace.',
    },
    violence: {
      title: 'This isn’t one to reframe',
      message: 'Nobody has the right to hurt you. This isn’t a thought to rethink — it’s something that happened to you, and it matters. If you can, tell someone you trust, and reach out to a support service or the police when you feel ready.',
    },
    threat: {
      title: 'This isn’t one to reframe',
      message: 'Being threatened is serious, and it’s not something to talk yourself out of. Keep any messages or notes, tell someone you trust, and contact the police or a support service if you feel at risk.',
    },
    harassment: {
      title: 'This isn’t one to reframe',
      message: 'Being harassed or bullied isn’t a misunderstanding to rethink. It’s not okay, and it’s not on you to fix it by seeing it differently. If you can, save screenshots or notes, tell someone you trust, and use the reporting routes at school, at work or on the app or site.',
    },
    discrimination: {
      title: 'This isn’t one to reframe',
      message: 'Being treated unfairly because of who you are is real, and it isn’t something to explain away. Your reaction makes sense. If you want to, keep a record of what happened and talk to someone you trust, HR, a union or an advice organisation.',
    },
    unsafe: {
      title: 'Your safety comes first',
      message: 'Not feeling safe is important information, not a thinking habit. Please trust it. If you can, talk to someone you trust or a support service about what’s going on.',
    },
  },
  careResources: [
    EMERGENCY,
    { label: 'UK domestic abuse', detail: 'National Domestic Abuse Helpline: 0808 2000 247 — free, 24 hours.' },
    { label: 'US domestic violence', detail: 'National Domestic Violence Hotline: 1-800-799-7233.' },
    ELSEWHERE,
  ],
  /** Shown under any safety message, so the person never feels shut out. */
  stillHere: 'The Mallows are still here. When you’re ready, you can come back and look at something else together.',
};

/**
 * Distress words that are not a crisis or a harm disclosure but still mean
 * "keep support close and go gently" (level 'concern'). Taken from the free
 * feeling finder's original list (src/engine/interpret.js).
 */
export const CONCERN_LEXICON = [
  R`\bfeel(?:s|ing)? like (?:i'?m )?dying\b`,
  R`\bcan'?t cope\b`,
  R`\bhopeless\b`,
  R`\bworthless\b`,
  R`\bcan'?t (?:do this|take (?:it|this)|keep going) any ?more\b`,
  R`\b(?:he|she|they) (?:hit|hits|hurt|hurts) me\b`,
  R`\bunsafe at home\b`,
  R`\b(?:want|wanna|wish i could) (?:to )?(?:just )?disappear\b`,
  R`\bfalling apart\b(?= .*\b(?:can'?t|cannot)\b)`,
  // added 12 Oct 2026, review round 3: passive or ambiguous wishes (support close by, not the urgent sheet)
  R`\b(?:wish i could|want to|wanna|i'?d like to|just want to) (?:just )?(?:go to )?sleep forever\b`,
  R`\b(?:there'?s|there is|is|feels like there'?s) (?:just )?no point (?:anymore|any more|in anything|to anything|in any of it)\b`,
  R`\bwhat'?s the point (?:anymore|any more|of anything|in anything|of any of it)\b`,
  R`\bthinking (?:about|of) (?:death|my (?:own )?death)\b`,
  // 'a way out of this car park' stays none: the phrase ends there, or with 'of this / of it all'
  R`\b(?:don'?t|do not|can'?t|cannot) see (?:a|any) way out(?=\s*(?:$|[.!?,;…]|(?:anymore|any more|of (?:this|it all|here|everything|anything))\s*(?:$|[.!?,;…])))`,
  R`\bno way out (?:anymore|any more|for me)\b`,
  R`\b(?:want|need|wish|just want) (?:the|this|all the|all this) (?:pain|hurt|hurting) to (?:stop|end|go away)\b`,
  R`\b(?:hate|hating) (?:my (?:whole |own )?life|being alive|living)\b(?! (?:in|with|here|there|at|on|near|abroad|together|admin|insurance)\b)`,
  R`\b(?:i'?m|i am) (?:going to|gonna|about to|ready to) jump\s*(?:[.!]|$)`,
];

/**
 * Wanting to hurt someone else (level 'concern', category 'harm-others'):
 * support stays one tap away and nothing playful is said, but the person is
 * not treated as being in crisis. Only intent phrasing counts; the everyday
 * angry idiom "I could kill him" stays none (owner to confirm, 12 Oct 2026).
 */
export const HARM_OTHERS_LEXICON = [
  R`\b(?:want|wanna|going|gonna|planning|plan|about|ready|tempted|need) (?:to )?(?:really |actually |just )?(?:kill|hurt|harm|stab|shoot|attack|beat up|strangle|poison) (?:him|her|them|someone|somebody|anyone|anybody|people|everyone|everybody|my (?:partner|boyfriend|girlfriend|husband|wife|ex|boss|manager|dad|father|mum|mom|mother|brother|sister|friend|flatmate|housemate|roommate|neighbou?r|teacher|colleague|son|daughter|kids?|child|baby|family))\b(?! (?:feelings|chances|pride|ego|reputation))`,
];

function deepFreeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o)) deepFreeze(v);
  }
  return o;
}
deepFreeze(HARM_LEXICON);
deepFreeze(HARM_COPY);
deepFreeze(CONCERN_LEXICON);
deepFreeze(HARM_OTHERS_LEXICON);
