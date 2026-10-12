// HUSHMALLOW ULTRA · "Another Angle" (Reframe) content library.
//
// Everything in this file is authored by hand at development time. The app
// never writes new sentences at runtime: it only matches rule-based lexicons
// (keywords, phrases, regular expressions) and fills authored templates with
// the person's own words. Detection results are always shown as suggestions
// the person can confirm or correct, and every flow has a general fallback.
//
// Voice rules for every user-facing string here:
//   - warm, plain, a bit witty where it fits; never like a worksheet
//   - no clinical labels; thinking habits get friendly names
//   - other angles are possibilities ("might", "could"), never verdicts
//   - never invent facts about other people or claim to know their minds
//   - always leave room for the original worry being right
//   - harmful experiences (abuse, violence, threats, harassment,
//     discrimination, self-harm, danger) are never reframed
//
// Plain ES module, no dependencies. Works in browsers and Node.

const R = String.raw;

/** Context tags a scenario can belong to. */
export const CONTEXTS = [
  'work', 'school', 'relationship', 'partner', 'family', 'friends', 'money', 'health',
  'body', 'sleep', 'future', 'past', 'loss', 'self-image', 'social', 'conflict', 'change',
];

/** Kinds of "another angle" cards. */
export const ANGLE_KINDS = [
  'context', 'benign', 'neutral', 'growth', 'self-compassion', 'worry-partly-true', 'not-enough-info',
];

/** Kinds of next-step cards. */
export const STEP_KINDS = ['check', 'act', 'care', 'wait', 'talk', 'boundary'];

/** Mallows that may appear as guide or cameo. */
export const ULTRA_MALLOWS = ['zuzu', 'glitzi', 'blubi', 'boppo', 'pipzi', 'loomi', 'noomi'];

// ---------------------------------------------------------------------------
// 1. Thinking habits ("thought patterns")
// ---------------------------------------------------------------------------
// `triggers` are regular-expression sources, matched case-insensitively
// against the person's text after curly quotes are straightened. They are
// deliberately narrow: a match is a gentle "this might be in the mix", which
// the person can dismiss.

export const THOUGHT_PATTERNS = [
  {
    id: 'mind-reading',
    name: 'Mind-reading',
    explain: 'Deciding what someone else is thinking or feeling before they’ve said it.',
    question: 'What did they actually say or do, and which part am I guessing?',
    triggers: [
      R`\b(?:hates?|hating|can'?t stand|despises?) me\b`,
      R`\b(?:is|are|was|were|been|keeps?|just) (?:deliberately |purposely |intentionally |clearly |obviously |just )?(?:ignoring|avoiding|blanking|snubbing|ghosting) me\b`,
      R`\b(?:deliberately|on purpose|intentionally|purposely)\b`,
      R`(?<!\bi (?:just |really |honestly |kind of |sort of )?)\b(?:thinks?|thought|believes?) (?:that )?(?:i'?m|i am|i was|i'?ve)\b`,
      R`\b(?:doesn'?t|don'?t|didn'?t|does not|do not) (?:really |even )?(?:like|care about|want|respect|rate|love|value) me\b`,
      R`\b(?:doesn'?t|don'?t|does not|do not) (?:really |even )?care\b`,
      R`\b(?:is|are|was|were|must be|seems?|seemed) (?:so |really |super )?(?:annoyed|angry|mad|fed up|irritated|disappointed|bored|sick|tired) (?:with|at|of) me\b`,
      R`\b(?:judging|laughing at|talking about) me\b`,
      R`\b(?:must|probably|obviously|clearly) (?:think|thinks|hate|hates|be (?:annoyed|angry|mad|upset|bored|sick|fed up))\b`,
      R`\b(?:secretly|behind my back)\b`,
      R`\bthey all think\b`,
      R`\bwants? (?:nothing to do with|to get rid of) me\b`,
      R`\b(?:is|are) (?:losing interest|over me|done with me|bored of me)\b`,
    ],
    example: '“She hasn’t replied, so she must be annoyed with me.”',
  },
  {
    id: 'future-reading',
    name: 'Future-reading',
    explain: 'Treating a guess about what will happen as if it’s already certain.',
    question: 'How sure am I really, from 0 to 100, and what else could happen?',
    triggers: [
      R`\b(?:i|it|they|she|he|we|this|things)(?:'ll| will) never\b`,
      R`\bwill never\b`,
      R`\bnever going to\b`,
      R`\b(?:going to|gonna|will) (?:fail|go wrong|end badly|fall apart|be a disaster|be awful|be terrible|be a mess)\b`,
      R`\b(?:won'?t|will not|not going to|never going to) (?:ever )?(?:work out|get better|be okay|be ok|change|happen for me|find anyone)\b`,
      R`\bi (?:just )?know (?:it|they|she|he|this)(?:'ll| will| is going| are going|'s going|'re going)\b`,
      R`\bno (?:chance|hope)\b`,
      R`\bwhat'?s the point\b`,
      R`\bdoomed\b`,
      R`\bbound to (?:fail|go wrong|happen|mess)\b`,
    ],
    example: '“I’ll never get a job I actually like.”',
  },
  {
    id: 'big-label',
    name: 'Big label',
    explain: 'Summing up a whole person — often yourself — with one harsh word.',
    question: 'If I describe what happened instead of what I “am”, what changes?',
    triggers: [
      R`\b(?:i'?m|i am|i feel like)(?: (?:so|such|a|an|just|completely|totally|really|basically|the|absolute|total|complete|utter|utterly|literally|actually|massive|huge|biggest|such a|an absolute|a total|a complete))* (?:stupid|idiot|failure|loser|useless|terrible|pathetic|worthless|hopeless|incompetent|disaster|mess|joke|fraud|burden|awful|rubbish|garbage|trash|bad person|horrible person|unlovable|boring|weird|ugly|disgusting|embarrassment|let-?down|dumb|thick|crap|clueless|nobody|not good enough|not enough|too much)\b`,
      R`\b(?:terrible|useless|hopeless|rubbish|awful|crap|bad) at (?:my job|everything|this|life|work|school|relationships|people|money|dating)\b`,
      R`\bwhat an? (?:idiot|loser|failure)\b`,
      R`\b(?:he|she|they)(?:'s|'re| is| are) (?:such |so |a total |an absolute |a complete )*(?:an? )?(?:idiot|jerk|monster|narcissist|selfish|useless|horrible|nightmare|snob)\b`,
    ],
    example: '“I forgot the meeting. I’m so useless.”',
  },
  {
    id: 'all-or-nothing',
    name: 'All-or-nothing',
    explain: 'Seeing things as perfect or ruined, with nothing in between.',
    question: 'Where on a scale from 0 to 10 does this really sit?',
    triggers: [
      R`\b(?:completely|totally|entirely|utterly|absolutely) (?:ruined|failed|wrong|pointless|wasted|useless|blew it|messed (?:it )?up)\b`,
      R`\bruined (?:everything|it all|the whole|my whole)\b`,
      R`\b(?:complete|total|utter|absolute) (?:failure|disaster|mess|waste|write-?off)\b`,
      R`\bif it'?s not perfect\b`,
      R`\bperfect or\b`,
      R`\b(?:either|all) or nothing\b`,
      R`\bnothing (?:went|goes|is going|ever goes) right\b`,
      R`\bwaste of (?:time|space|effort)\b`,
      R`\bblew it\b`,
      R`\b(?:the )?whole (?:thing|day|night|evening|presentation|project|year|weekend) (?:is|was) (?:ruined|pointless|a mess|a disaster|a write-?off)\b`,
      R`\bit'?s all (?:ruined|over|gone|wasted|pointless)\b`,
    ],
    example: '“One bad slide and the whole presentation was a disaster.”',
  },
  {
    id: 'always-never',
    name: 'Always/never',
    explain: 'Turning one or two moments into a rule about every time.',
    question: 'Can I think of even one time it went differently?',
    triggers: [
      R`\balways\b`,
      R`\bnever\b`,
      R`\beveryone\b`,
      R`\beverybody\b`,
      R`\bno ?one\b`,
      R`\bnobody\b`,
      R`\beverything\b`,
      R`\bevery (?:single )?time\b`,
      R`\bnothing ever\b`,
      R`\bconstantly\b`,
      R`\ball the time\b`,
    ],
    example: '“I always say the wrong thing.”',
  },
  {
    id: 'spotlight-on-me',
    name: 'Spotlight on me',
    explain: 'Assuming you’re the cause of things, or that everyone is watching you.',
    question: 'What else might have played a part here, besides me?',
    triggers: [
      R`\b(?:my|all my) fault\b`,
      R`\bbecause of me\b`,
      R`\bit'?s (?:about|because of|down to) me\b`,
      R`\bi (?:must|must'?ve|must have) (?:done|said) something\b`,
      R`\bwhat did i do\b`,
      R`\bsomething i (?:said|did)\b`,
      R`\beveryone (?:noticed|saw|was looking|was staring|was laughing|heard)\b`,
      R`\b(?:everyone|people|they all) (?:will )?(?:remember|be talking about)\b`,
      R`\bi (?:ruin|ruined|spoil|spoiled|spoilt) (?:it|everything|the)\b`,
      R`\bi'?m to blame\b`,
      R`\bblame myself\b`,
      R`\bi'?m the (?:reason|problem)\b`,
    ],
    example: '“The meeting went quiet. It must be something I said.”',
  },
  {
    id: 'worst-case-jump',
    name: 'Worst-case jump',
    explain: 'Leaping from a small setback straight to the worst possible ending.',
    question: 'What’s the worst case, the best case, and the most likely case?',
    triggers: [
      R`\b(?:i'?ll|i will|i'?m going to|i'?m gonna|going to|gonna) (?:get |be )?(?:fired|sacked|dumped|kicked out|let go|laid off|evicted|left alone|alone forever|homeless|broke)\b`,
      R`\b(?:disaster|nightmare|catastroph\w*)\b`,
      R`\bruin(?:ed|s)? my (?:life|career|future|chances|reputation)\b`,
      R`\bend of the world\b`,
      R`\bit'?s all over\b`,
      R`\b(?:my life|my career|everything) is over\b`,
      R`\b(?:never|won'?t ever) recover\b`,
      R`\bfall(?:ing)? apart\b`,
      R`\bcan'?t (?:cope|survive|handle it) if\b`,
      R`\bthe worst (?:thing|case|possible)\b`,
      R`\b(?:everyone|they) will (?:hate|leave|laugh at|find out)\b`,
    ],
    example: '“I made a typo in the report. I’m going to get fired.”',
  },
  {
    id: 'should-rules',
    name: 'Should-rules',
    explain: 'Holding yourself (or others) to strict rules about how things must be.',
    question: 'Whose rule is this, and what happens if I swap “should” for “I’d like to”?',
    triggers: [
      R`\b(?:i|you|they|he|she|we|people) (?:really )?(?:should|shouldn'?t|should have|should'?ve|shouldn'?t have|ought to|ought not|must not|mustn'?t)\b`,
      R`\b(?:supposed|meant) to (?:be|have|know|do)\b`,
      R`\bby now\b`,
      R`\bat my age\b`,
      R`\b(?:a )?(?:proper|normal|real) (?:adult|grown-?up)\b`,
      R`\bshould be able to\b`,
    ],
    example: '“I should be over this by now.”',
  },
  {
    id: 'only-the-bad-bit',
    name: 'Only-the-bad-bit filter',
    explain: 'Zooming in on the one bad part and losing sight of everything else.',
    question: 'What else happened that I might be leaving out?',
    triggers: [
      R`\ball i can (?:think about|see|remember|hear)\b`,
      R`\bcan'?t stop (?:thinking about|replaying)\b`,
      R`\bkeep (?:replaying|thinking about|going over)\b`,
      R`\bone (?:bad|negative|mean|critical|harsh|small) (?:comment|thing|bit|mark|review|remark|point|mistake)\b`,
      R`\b(?:but|except) (?:the|that|this) one\b`,
      R`\bonly (?:thing|bit|part) (?:i|that) (?:remember|noticed|matters|heard)\b`,
      R`\b(?:ignore|ignoring|forget) (?:the|all the) (?:good|nice|positive)\b`,
    ],
    example: '“Ten nice comments and one harsh one, and I can’t stop thinking about the harsh one.”',
  },
  {
    id: 'feelings-as-proof',
    name: 'Feelings as proof',
    explain: 'Taking a strong feeling as evidence that something is true.',
    question: 'The feeling is real — but what are the facts saying?',
    triggers: [
      R`\bi feel (?:like )?(?:such )?(?:a |an )?(?:failure|idiot|fraud|loser|burden|joke|disappointment|let-?down|nobody|imposter|impostor)\b`,
      R`\bi feel (?:so )?(?:stupid|useless|worthless|unlovable|pathetic|ugly|dumb)\b`,
      R`\b(?:it|this) feels like (?:proof|evidence|they|she|he|everyone|nobody|no one)\b`,
      R`\bi feel (?:like|that) (?:everyone|they|she|he|nobody|no one|people)\b`,
      R`\bmy gut (?:says|tells me|is telling me)\b`,
      R`\bi (?:just )?know it\b`,
      R`\bi can (?:just )?feel (?:it|that)\b`,
      R`\bfeels? (?:so )?(?:true|real|obvious)\b`,
      R`\bso it must be true\b`,
    ],
    example: '“I feel like a fraud, so I must be one.”',
  },
  {
    id: 'comparison-trap',
    name: 'Comparison trap',
    explain: 'Measuring your whole life against the best bits of someone else’s.',
    question: 'Am I comparing my behind-the-scenes with their highlight reel?',
    triggers: [
      R`\beveryone else\b`,
      R`\beveryone (?:my age|i know|i went to school with)\b`,
      R`\b(?:better|prettier|thinner|richer|happier|cleverer|funnier|fitter|more successful|more popular|further ahead|more attractive|better looking) than me\b`,
      R`\bthan (?:me|i (?:am|was|ever))\b`,
      R`\bcompar(?:e|ed|ing) (?:myself|me)\b`,
      R`\bbehind (?:everyone|all my friends|my friends|my peers|people my age)\b`,
      R`\b(?:all|most) (?:of )?my friends (?:are|have|got)\b`,
      R`\bwhy (?:can'?t|don'?t) i (?:have|be)\b`,
      R`\bperfect (?:life|lives|relationship|body|bodies)\b`,
      R`\bcompared to\b`,
    ],
    example: '“Everyone my age has a house and I’m still renting a box room.”',
  },
  {
    id: 'shrinking-the-good',
    name: 'Shrinking the good',
    explain: 'Explaining away good things so they don’t count.',
    question: 'If this had gone badly, would I count it? Then can the good bit count too?',
    triggers: [
      R`\b(?:just|only) (?:luck|lucky|a fluke|pity|being (?:nice|polite|kind))\b`,
      R`\b(?:was|were) (?:just|only) being (?:nice|polite|kind)\b`,
      R`\b(?:doesn'?t|does not|didn'?t) (?:really )?(?:count|mean anything)\b`,
      R`\banyone could (?:have|'?ve)\b`,
      R`\b(?:fluke|got lucky)\b`,
      R`\bonly because\b`,
      R`\bnot a real (?:achievement|win)\b`,
      R`\bthey had to say that\b`,
      R`\bit was nothing\b`,
    ],
    example: '“They were just being polite when they said it was good.”',
  },
  {
    id: 'what-if-loop',
    name: 'What-if loop',
    explain: 'Spinning through one “what if” after another without landing anywhere.',
    question: 'If I answer one “what if” with “then I would…”, what do I say?',
    triggers: [
      R`\bwhat if\b`,
      R`\bi keep (?:imagining|picturing|worrying)\b`,
      R`\bcan'?t stop worrying\b`,
    ],
    example: '“What if I freeze? What if they laugh? What if I lose my job?”',
  },
];

// ---------------------------------------------------------------------------
// 2. Harm lexicon and copy
// ---------------------------------------------------------------------------
// Checked before anything else. A match switches reframing off. Patterns are
// matched case-insensitively against tidied text, after `idiomGuards` spans
// have been blanked out (so "this deadline is killing me" never trips).
// Judgement: we lean towards caution. A care message shown by mistake is a
// small cost; reframing someone's real harm is not.

export const HARM_LEXICON = {
  idiomGuards: [
    R`\bkill(?:ed|ing)? myself laughing\b`,
    R`\b(?:nearly|almost|could have|could've) died (?:laughing|of (?:embarrassment|shame|laughter|cringe))\b`,
    R`\bdied (?:of|from) (?:embarrassment|laughter|laughing|shame|cringe)\b`,
    R`\b(?:could|would) kill for an?\b`,
    R`\bkill for an?\b`,
    R`\b(?:is|are|was|were|it'?s|they'?re|that'?s|this is) (?:literally |actually |honestly )?killing me\b`,
    R`\bdying (?:to|for|of laughter|of embarrassment|laughing)\b`,
    R`\bto die for\b`,
    R`\b(?:want|wanted|wanna) to die of (?:embarrassment|shame|cringe|laughter|laughing|boredom)\b`,
  ],
  crisis: [
    R`\bkill(?:ing)? myself\b`,
    R`\bkms\b`,
    R`\bsuicid\w*`,
    R`\bend(?:ing)? (?:it all|my life|my own life|things for good|everything for good)\b`,
    R`\b(?:want|wanna|going|planning|ready|need) to end it\b(?! (?:with|between|off))`,
    R`\btake my (?:own )?life\b`,
    R`\b(?:don'?t|do not|no longer|dont) want to (?:be here|be alive|live|exist|wake up|go on|be around)\b`,
    R`\b(?:want|wanna|wish i could|going|deserve) to die\b`,
    R`\bwish i (?:was|were) dead\b`,
    R`\bwish i (?:wasn'?t|was not|weren'?t|were not) (?:here|alive|born|around)\b`,
    R`\b(?:hurt|hurting|harm|harming|cut|cutting|burn|burning|punish|punishing|starve|starving) myself\b`,
    R`\bself[- ]?harm\w*`,
    R`\bno (?:reason|point) (?:to|in|for) (?:live|living|going on|being alive|being here|me being here|carrying on)\b`,
    R`\bnothing (?:left )?to live for\b`,
    R`\bbetter off (?:dead|without me)\b`,
    R`\bcan'?t go on\b`,
    R`\boverdos\w*`,
    R`\bnot worth living\b`,
    R`\blife (?:isn'?t|is not|isnt) worth (?:it|living)\b`,
    R`\b(?:want|wish) to disappear (?:forever|for good)\b`,
    R`\bi'?m a burden (?:to|on) (?:everyone|everybody|my family|them|people)\b`,
    R`\b(?:goodbye|suicide) (?:letter|note)\b`,
    R`\bgo to sleep and never wake up\b`,
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

// ---------------------------------------------------------------------------
// 3. Guide lines per stage of the Another Angle flow
// ---------------------------------------------------------------------------
// Zuzu hosts the Spiral Observatory. Other guides fall back to Zuzu's line for
// any stage they don't have. The `safety` stage never uses cameo humour.

export const STAGES = [
  'welcome', 'fact', 'interpretation', 'split', 'patterns', 'evidence', 'eyes', 'future',
  'angles', 'next', 'conversation', 'done', 'safety',
];

/** Stages where the scenario's cameo Mallow speaks instead of the guide. */
export const CAMEO_STAGES = ['angles', 'done'];

export const GUIDE_LINES = {
  zuzu: {
    welcome: [
      'Welcome to the Spiral Observatory. Let’s turn this thought round slowly and see what’s on the other side.',
      'Pull up a cushion. We’re going to look at one thought from a few different angles.',
    ],
    fact: [
      'First, the camera view. Only what a camera would have caught — no voiceover.',
      'Let’s start with what actually happened. Plain facts, no commentary yet.',
    ],
    interpretation: [
      'Now, the story your brain told about it. It’s allowed to be dramatic — we’re only looking.',
      'What did your mind add on top? Write it the way it sounded in your head.',
    ],
    split: [
      'I’ve sorted your words into two piles: what happened, and what your brain added. These are guesses — move anything that landed in the wrong pile.',
    ],
    patterns: [
      'A few thinking habits might be in the mix. Tap any that ring a bell; ignore the rest.',
    ],
    evidence: [
      'Let’s weigh it up: what fits the worry, what doesn’t, and what’s still a blank.',
      'Pick the cards that are true for you — including the ones that back the worry up.',
    ],
    eyes: [
      'Let’s tilt the telescope. How might this look from a different seat?',
    ],
    future: [
      'Let’s write the prediction down, so future-you can check how it actually went.',
    ],
    angles: [
      'Here are some other ways it could look. Keep any that feel possible; toss the rest.',
      'Spin, spin… Some of these will fit, some won’t. Your call.',
    ],
    next: [
      'One small move. Not a fix-everything move — just the next one.',
    ],
    conversation: [
      'Want to practise what you might say? These are rehearsal lines, not predictions.',
    ],
    done: [
      'Look at that. Same event, more than one way to see it. You did the spinning.',
      'Your first thought is still allowed to be right. It just isn’t the only one in the room any more.',
    ],
    safety: [
      'Let’s put the telescope down for this one. What you’ve written matters more than any angle.',
    ],
  },
  blubi: {
    welcome: [
      'Hi. I’m right here. We can go as slowly as you like.',
    ],
    fact: [
      'Let’s start soft: just what happened, the way a camera would have seen it.',
    ],
    interpretation: [
      'And what did it make you feel or think about yourself? Whatever it is, it’s safe to put it here.',
    ],
    angles: [
      'Here are a few gentler ways it might look. Only keep what feels true to you.',
    ],
    done: [
      'You looked at something that hurt, and you stayed kind to yourself. That counts for a lot.',
    ],
    safety: [
      'I’m staying right here with you. This one needs real support, not a new angle.',
    ],
  },
};

// ---------------------------------------------------------------------------
// 4. Scenario builders (ids are derived, so they stay unique and stable)
// ---------------------------------------------------------------------------

const DEFAULT_PREDICTION_PROMPTS = [
  'How sure are you, from 0 to 100?',
  'If it did happen, what would you do first?',
  'When could you check whether it came true?',
];

const REPLY_NOTE = 'These are only possibilities. Real people can say anything — including things that aren’t on this list.';

// Future Lens: the predictions people in each situation often make, written
// the way a worried brain says them. Shown only as pieces the person sorts
// ("known" or "predicted") when their own words don't contain a prediction.
const FUTURE_PREDICTIONS = {
  'unanswered-message': ['They’re never going to reply', 'This friendship is going to fizzle out'],
  'work-criticism': ['I’m going to get fired', 'They’ll never trust me with anything big again'],
  'left-out': ['They’ll never invite me again', 'I’m going to end up with no friends'],
  'partner-distant': ['They’re going to leave me', 'It’s never going to feel close again'],
  'mistake-judged': ['Everyone will remember this for ever', 'This is going to follow me around'],
  'job-rejection': ['I’ll never get a good job', 'Every interview is going to go like this'],
  'plans-cancelled': ['They’ll keep cancelling on me', 'We’re going to drift apart'],
  'social-comparison': ['I’ll always be behind', 'I’m never going to have what they have'],
  'family-argument': ['They’ll never forgive me', 'We’ll never get on'],
  'group-chat-ignored': ['Nobody’s ever going to reply to me', 'They’ll start a new chat without me'],
  'seemed-annoyed': ['It’s going to be awkward from now on', 'They’ll be off with me tomorrow too'],
  'performance-review': ['I’ll never get promoted', 'This review is going to hold me back for years'],
  'bad-grade': ['I’m going to fail the whole course', 'I’ll never be good at this subject'],
  'no-text-back': ['They’re never going to text', 'I’ll be on my own for ever'],
  'family-criticism': ['They’ll never be proud of me', 'It’ll always be like this with them'],
  'money-setback': ['I’m never going to get on top of money', 'It’s all going to fall apart'],
  'appearance-comment': ['Everyone will notice now', 'I’ll always feel like this about how I look'],
  'future-worry': ['It’s going to go wrong', 'I won’t be able to cope'],
  'past-regret': ['I’ll regret this for ever', 'It’s too late to change anything'],
  'awkward-moment': ['They’ll think I’m weird from now on', 'Everyone will be talking about it'],
  'credit-promotion': ['I’ll never get the recognition I deserve', 'It’ll keep happening'],
  'not-listened': ['They’re never going to listen to me', 'It’ll always be like this'],
  general: ['It’s going to go badly', 'It’ll always be this way'],
};

// How the Future Lens frames each step. `{n}` is the person's own 0–100.
const FUTURE_LENS_COPY = {
  knownLabel: 'Known — true right now',
  predictedLabel: 'Predicted — hasn’t happened yet',
  unsureLabel: 'Not sure',
  sureQuestion: 'How sure does the prediction feel, from 0 to 100?',
  sealQuestion: 'When could you check whether it came true?',
};

function cards(prefix, texts) {
  return texts.map((text, i) => ({ id: `${prefix}${i + 1}`, text }));
}

function kinded(prefix, rows) {
  return rows.map(([kind, text], i) => ({ id: `${prefix}${i + 1}`, kind, text }));
}

function convo(code, c) {
  return {
    with: c.with,
    openers: cards(`${code}-o`, c.openers),
    replies: c.replies.map(([text, yourMove], i) => ({
      id: `${code}-r${i + 1}`,
      label: i === 0 ? 'They might say…' : 'Or they might say…',
      text,
      yourMove,
    })),
    tips: c.tips,
    note: REPLY_NOTE,
  };
}

function mk(d) {
  const c = d.code;
  return {
    id: d.id,
    code: c,
    title: d.title,
    guide: d.guide || 'zuzu',
    cameo: d.cameo,
    contexts: d.contexts,
    detect: { keywords: d.keywords || [], phrases: d.phrases || [] },
    factPrompt: d.factPrompt,
    interpretationPrompt: d.interpretationPrompt,
    commonInterpretations: d.commonInterpretations,
    likelyPatterns: d.likelyPatterns,
    evidence: {
      supports: cards(`${c}-s`, d.supports),
      against: cards(`${c}-a`, d.against),
      missing: cards(`${c}-m`, d.missing),
    },
    angles: kinded(`${c}-ang`, d.angles),
    otherEyes: cards(`${c}-eye`, d.otherEyes),
    futureLens: {
      predictionPrompts: [d.predict, ...DEFAULT_PREDICTION_PROMPTS],
      knowns: d.knowns,
      unknowns: d.unknowns,
      predictions: FUTURE_PREDICTIONS[d.id] || FUTURE_PREDICTIONS.general,
      copy: FUTURE_LENS_COPY,
    },
    nextSteps: kinded(`${c}-n`, d.nextSteps),
    conversation: d.conversation ? convo(c, d.conversation) : null,
    safetyNote: d.safetyNote,
  };
}

const DEFS = [];

// ---------------------------------------------------------------------------
// 5. Scenarios
// ---------------------------------------------------------------------------

DEFS.push(mk({
  id: 'unanswered-message',
  code: 'um',
  title: 'A message with no reply',
  guide: 'zuzu',
  cameo: {
    mallow: 'glitzi',
    lines: [
      'Ah, the read receipt. Tiny tick, enormous plot.',
      'Fun fact: “seen” tells you an eyeball happened. That’s it. That’s the whole fact.',
    ],
  },
  contexts: ['friends', 'social'],
  keywords: ['reply', 'replied', 'replies', 'respond*', 'answer*', 'messag*', 'text', 'texts', 'texted', 'dm', 'dms', 'whatsapp', 'ghost*', 'ignoring', 'ignored', 'unread', 'seen', 'friend', 'friends', 'mate', 'bestie'],
  phrases: [
    "hasn't replied", "hasn't responded", "hasn't answered", "hasn't texted back", "hasn't messaged back",
    "not replied", "no reply", "didn't reply", "didn't respond", "never replied", "never texted back",
    "left me on read", "left on read", "left me on seen", "read my message", "saw my message", "seen my message",
    "opened my message", "blue ticks", "two ticks", "no response", "waiting for a reply", "hasn't got back to me",
    "not got back to me", "hasn't gotten back to me", "ignoring my messages", "ignoring my texts", "ignoring me",
  ],
  factPrompt: 'Just the camera view: what did you send, when, and what’s happened since?',
  interpretationPrompt: 'And what did your brain decide the silence means?',
  commonInterpretations: [
    'They’re ignoring me on purpose',
    'They’re annoyed with me',
    'I must have said something wrong',
    'They don’t care about me',
    'They’ve got better people to talk to',
  ],
  likelyPatterns: ['mind-reading', 'spotlight-on-me', 'feelings-as-proof', 'worst-case-jump'],
  supports: [
    'They usually reply quickly, and this is different',
    'Things felt a bit tense the last time we spoke',
    'They’ve been posting or chatting elsewhere since I sent it',
    'This has happened a few times lately, not just once',
  ],
  against: [
    'They’ve been slow to reply before and things were fine',
    'They’ve got a lot going on right now (work, family, exams)',
    'Our last proper conversation was friendly',
    'They’ve shown up for me in other ways recently',
  ],
  missing: [
    'Whether they’ve had a proper chance to read it',
    'What their day or week has looked like',
    'Whether my message needed a reply, in their eyes',
    'How they’d explain the gap if I asked',
  ],
  angles: [
    ['context', 'Lots of people read a message, mean to reply later, and then life swallows it. The reply they wrote in their head can feel like a sent one.'],
    ['benign', 'They might be waiting until they have the time or energy to reply properly, rather than firing off something quick.'],
    ['neutral', 'Silence is an absence of information. It could mean almost anything — including nothing at all.'],
    ['worry-partly-true', 'Maybe something is a bit off between you. If so, the silence is a clue worth checking gently, not a verdict to accept on your own.'],
    ['not-enough-info', 'Right now you have one data point: no reply yet. That’s not enough to know why.'],
    ['self-compassion', 'Wanting to hear back from someone you care about isn’t needy. It means they matter to you.'],
    ['growth', 'This is a chance to practise sitting with a little uncertainty without filling it with the scariest story.'],
  ],
  otherEyes: [
    'If a kind friend saw this exact situation, what might they point out?',
    'If it were the other way round and you hadn’t replied yet, what would your reasons usually be?',
    'A week from now, how much do you think this gap will matter?',
  ],
  predict: 'What do you think will happen next? Write it down so you can check later.',
  knowns: ['I sent the message', 'There’s been no reply so far'],
  unknowns: ['Why there’s been no reply', 'When a reply might come', 'What they’d say if I asked'],
  nextSteps: [
    ['check', 'Check the facts: did my message ask something, or was there nothing that obviously needed a reply?'],
    ['wait', 'Pick a time — say, tomorrow evening — and hold off deciding anything until then.'],
    ['talk', 'Send one light, no-pressure follow-up: “No rush — just floating this back up!”'],
    ['act', 'Put the phone in another room for an hour and do something absorbing.'],
    ['care', 'Message someone else who usually feels easy to talk to.'],
    ['boundary', 'If this keeps happening and it hurts, it’s okay to change how much you reach out first.'],
  ],
  conversation: {
    with: 'your friend',
    openers: [
      'Hey, no pressure at all — just bumping my message in case it got buried.',
      'Hope your week’s going okay! Whenever you get a sec, I’d love to hear what you think.',
      'Hey, it’s felt a bit quiet between us. All good with you?',
    ],
    replies: [
      ['Sorry!! I saw it, then completely forgot. Life is chaos.', 'You could say: “Ha, no worries at all!”'],
      ['I’ve had a rough few days. I’ll reply properly soon.', 'You could say: “Sorry it’s been rough. I’m here if you want to talk.”'],
      ['Honestly, I wasn’t sure how to answer, so I put it off.', 'You could say: “That’s fair. Whatever you think is fine — no pressure.”'],
      ['To be honest, I was a bit hurt by something. Can we talk?', 'You could say: “I’m really glad you told me. Yes, let’s talk.”'],
    ],
    tips: [
      'Keep the opener light and easy to answer.',
      'One follow-up is plenty. Give it space after that.',
      'If something was wrong, listening first usually goes further than explaining.',
    ],
  },
  safetyNote: 'If the silence follows a threat, or you’re worried someone might be in danger, skip the reframe: contact them, someone close to them, or emergency services.',
}));

DEFS.push(mk({
  id: 'work-criticism',
  code: 'wc',
  title: 'Criticism at work',
  guide: 'zuzu',
  cameo: {
    mallow: 'loomi',
    lines: [
      'Feedback is weather. It passes over the work, not over you.',
      'One comment about one piece of work. That’s its real size. Let’s keep it that size.',
    ],
  },
  contexts: ['work', 'self-image', 'conflict'],
  keywords: ['boss', 'manager', 'supervisor', 'criticis*', 'criticiz*', 'critique*', 'critical', 'feedback', 'redo', 'rework', 'colleague', 'colleagues', 'job', 'work', 'project', 'report', 'presentation', 'client', 'deadline', 'office'],
  phrases: [
    'criticised my work', 'criticized my work', 'criticised me', 'criticized me', 'criticised my', 'criticized my',
    'line manager', 'tore apart', 'ripped apart', 'picked apart', 'told me off', 'had a go at me', 'pulled me aside',
    'pulled me up on', "wasn't happy with my", 'not happy with my', 'sent it back', 'asked me to redo',
    'negative feedback', 'harsh feedback', 'critical feedback', 'called me out', 'in front of the team',
    'terrible at my job', 'bad at my job', 'useless at my job', 'my work was',
  ],
  factPrompt: 'Just the camera view: what did they actually say or write, and about which piece of work? Quote it if you can.',
  interpretationPrompt: 'What did your brain conclude about you from it?',
  commonInterpretations: [
    'I’m terrible at my job',
    'They think I’m useless',
    'I’m going to get fired',
    'I always mess things up',
    'Everyone else is better than me',
  ],
  likelyPatterns: ['big-label', 'worst-case-jump', 'mind-reading', 'always-never', 'only-the-bad-bit'],
  supports: [
    'This is the same issue I’ve been told about before',
    'The criticism was about something central to my role',
    'They seemed more frustrated than usual',
    'I already had a feeling this piece wasn’t my best',
  ],
  against: [
    'They’ve praised other work of mine',
    'The comments were about one task, not me as a person',
    'Giving notes is a normal part of their job',
    'They gave specific things to fix, which suggests they expect me to fix them',
    'I’ve had criticism before and things carried on fine',
  ],
  missing: [
    'What they think of my work overall',
    'Whether they’re under pressure from above',
    'How common this level of feedback is for everyone',
    'What “good” looks like to them on this task',
  ],
  angles: [
    ['context', 'Managers often spot problems faster than they spot what’s working. Finding the gaps is part of their job, so criticism tends to be the loudest thing they say.'],
    ['benign', 'They might be pointing out fixes because they think the work is worth getting right.'],
    ['neutral', 'This was a comment about one piece of work. On its own, it says very little about your overall ability.'],
    ['worry-partly-true', 'Maybe this piece did miss the mark. That would mean there’s a skill to build here — not that you’re terrible at your job.'],
    ['not-enough-info', 'One round of feedback doesn’t tell you how they rate you overall. That part is still unknown.'],
    ['growth', 'Specific notes are a free map of what they care about. Next time, you’ll know where they look first.'],
    ['self-compassion', 'It stings because you care about doing good work. That caring is an asset, even when it hurts.'],
  ],
  otherEyes: [
    'If a colleague you respect got this same feedback, what would you think of them?',
    'What might your manager have been juggling when they gave it? (You can’t know — just wonder.)',
    'Six months from now, what do you think you’ll remember about this?',
  ],
  predict: 'What are you predicting this means for your job?',
  knowns: ['This piece of work got critical feedback', 'There are specific things to change'],
  unknowns: ['How they see my work overall', 'Whether this will matter in a month', 'What happens once I make the changes'],
  nextSteps: [
    ['check', 'Reread the feedback once, slowly, and underline what’s about the work rather than about you.'],
    ['act', 'Pick the easiest single fix and do just that one today.'],
    ['talk', 'Ask one clarifying question: “Could you show me an example of what you’re after?”'],
    ['care', 'Take a proper break before diving back in. Walk, water, fresh air.'],
    ['wait', 'Give it a night before deciding what the feedback “means”.'],
    ['boundary', 'If feedback gets personal, or keeps happening in public, it’s fine to ask for it privately and about the work.'],
  ],
  conversation: {
    with: 'your manager',
    openers: [
      'Thanks for the notes. Could we go through the main one together so I get it right?',
      'I want to make sure I fix the right things. What would “great” look like for this?',
      'I’ve taken your feedback on board. Is this a one-off, or something you’ve noticed more generally?',
    ],
    replies: [
      ['Sure — the main thing is the structure. The rest is small stuff.', 'You could say: “Great, I’ll start there and check in once it’s redone.”'],
      ['Honestly, it’s been a stressful week. That wasn’t my best feedback either.', 'You could say: “Thanks for saying that. Is there anything that would help on my end?”'],
      ['It’s come up a couple of times, so I’d like us to work on it.', 'You could say: “That’s useful to know. Could we agree what improvement looks like?”'],
      ['Overall you’re doing well. This one just needs tightening.', 'You could say: “Good to hear. I’ll tighten it up.”'],
    ],
    tips: [
      'Ask about the work, not about whether they like you.',
      'Jot their answer down afterwards so it stays accurate.',
      'If there is a bigger issue, knowing beats guessing.',
    ],
  },
  safetyNote: 'If the “criticism” is shouting, insults, threats, or singling you out because of who you are, that isn’t feedback to reframe. Keep notes and talk to HR, a union rep or someone you trust.',
}));

DEFS.push(mk({
  id: 'left-out',
  code: 'lo',
  title: 'Left out or not invited',
  guide: 'zuzu',
  cameo: {
    mallow: 'blubi',
    lines: [
      'Being left out stings in a very particular spot. It’s okay that it hurts.',
      'Want a blanket while we look at it? I brought two.',
    ],
  },
  contexts: ['friends', 'social', 'family', 'work'],
  keywords: ['invite*', 'uninvited', 'excluded', 'exclude', 'party', 'birthday', 'wedding', 'gathering', 'hangout', 'trip', 'dinner', 'drinks', 'photos', 'story', 'stories', 'friends', 'friend'],
  phrases: [
    "wasn't invited", "weren't invited", 'not invited', "didn't invite me", "didn't get invited", 'never invited',
    'left me out', 'left out', 'without me', 'went without me', "didn't ask me", "didn't include me", 'not included',
    'saw the photos', 'saw it on instagram', 'saw their story', 'found out on social media', 'nobody told me',
    'no one told me', 'everyone else was invited', 'everyone else went', 'hang out without me', 'hung out without me',
  ],
  factPrompt: 'Just the camera view: what happened, who went, and how did you find out?',
  interpretationPrompt: 'What did your brain decide it says about you or the friendship?',
  commonInterpretations: [
    'They don’t actually like me',
    'Nobody wants me around',
    'I’m always the one left out',
    'They did it on purpose',
    'I’m not part of the group any more',
  ],
  likelyPatterns: ['mind-reading', 'always-never', 'spotlight-on-me', 'feelings-as-proof'],
  supports: [
    'This has happened several times with the same people',
    'I’ve been included less and less recently',
    'Someone said something that suggested it was deliberate',
    'I was the only one from our usual group not there',
  ],
  against: [
    'They’ve invited me to other things recently',
    'It might have been a small or last-minute thing',
    'The person organising doesn’t know me that well',
    'People in the group still message me and seem warm',
  ],
  missing: [
    'How the invite list was actually decided',
    'Whether there was a limit on numbers',
    'Whether someone assumed I’d be busy or not interested',
    'Whether anyone noticed I wasn’t there',
  ],
  angles: [
    ['context', 'Guest lists often get decided by space, cost, a partner’s friends, or whoever happened to be in the chat that day — not by a ranking of people.'],
    ['benign', 'Someone might have assumed you’d be busy, or that it wasn’t your kind of thing.'],
    ['neutral', 'Not being at one event doesn’t settle where you stand with everyone who was there.'],
    ['worry-partly-true', 'It could be that you’re not as close to this group as you’d like right now. If so, that’s real and worth noticing — and it’s something you can do something about.'],
    ['not-enough-info', 'You know who went. You don’t yet know how the plan came together.'],
    ['self-compassion', 'Feeling hurt about this makes sense. Wanting to belong is about as human as it gets.'],
    ['growth', 'This might show you which connections you want more of. That’s useful to know.'],
  ],
  otherEyes: [
    'If a friend told you they weren’t invited to this, what would you say to them?',
    'If you were organising a small event, how would you choose who came?',
    'What might someone in the group remember about you that you’re forgetting right now?',
  ],
  predict: 'What do you think this means for the friendship from here?',
  knowns: ['There was an event and I wasn’t there', 'I found out about it'],
  unknowns: ['How it was planned', 'Whether it reflects how they feel about me', 'What happens if I suggest the next plan'],
  nextSteps: [
    ['check', 'Check the scale: was it a big group thing, or a smaller plan I wouldn’t usually be part of?'],
    ['act', 'Suggest a plan yourself, with one or two people from the group.'],
    ['talk', 'If it really bothers you, say it lightly: “Looked fun! Would love to come next time.”'],
    ['care', 'Do something tonight with someone who does make you feel included.'],
    ['wait', 'Hold off on posting or messaging while it still stings.'],
    ['boundary', 'If you keep being left out on purpose, it’s okay to put more energy into people who choose you back.'],
  ],
  conversation: {
    with: 'someone from the group',
    openers: [
      'Looked like a great night! Would love to be in on the next one.',
      'Hey, I saw you all went out. Honestly, I felt a bit left out. Everything okay with us?',
      'Fancy getting something in the diary soon? It’s been ages.',
    ],
    replies: [
      ['Oh no, it was super last-minute. Definitely come next time!', 'You could say: “Great — count me in.”'],
      ['I thought you were away that weekend!', 'You could say: “Ah, no, I was around! Easy mix-up.”'],
      ['It was just a few of us from work, sorry if it felt weird.', 'You could say: “Makes sense. Let’s do something soon, just us.”'],
      ['Honestly, things have felt a bit distant lately.', 'You could say: “I’ve felt that too. I’d like to fix it. Can we talk?”'],
    ],
    tips: [
      '“I felt left out” is braver and clearer than hinting.',
      'Ask about the next time, not for an explanation of the last one.',
      'Their answer is information either way.',
    ],
  },
  safetyNote: 'If you’re being shut out on purpose as part of bullying, or because of who you are, that isn’t something to reframe. Talk to someone you trust about what’s happening.',
}));

DEFS.push(mk({
  id: 'partner-distant',
  code: 'pd',
  title: 'Partner seems quiet or distant',
  guide: 'zuzu',
  cameo: {
    mallow: 'noomi',
    lines: [
      'Quiet can be a lot of things. Like fog. Sometimes it’s only weather.',
      'Let’s be gentle with both of you while we look.',
    ],
  },
  contexts: ['partner', 'relationship'],
  keywords: ['partner', 'boyfriend', 'girlfriend', 'husband', 'wife', 'fiance', 'fiancé', 'fiancee', 'fiancée', 'spouse', 'bf', 'gf', 'distant', 'withdrawn', 'cold', 'quiet', 'snappy', 'moody', 'affection', 'affectionate'],
  phrases: [
    'seems distant', 'being distant', 'been distant', 'really quiet', 'been quiet', 'going quiet', 'gone quiet',
    'seems off', 'acting off', 'acting weird', 'acting different', 'pulling away', 'losing interest',
    'falling out of love', "doesn't seem interested", 'one-word answers', 'short with me', 'barely talking',
    'not talking to me', 'on their phone', 'on his phone', 'on her phone', 'cold towards me', 'cold toward me',
    "doesn't want to be with me", 'going to leave me', 'going to break up', 'my partner', 'my boyfriend',
    'my girlfriend', 'my husband', 'my wife',
  ],
  factPrompt: 'Just the camera view: what have you actually noticed? Fewer messages, shorter answers — and for how long?',
  interpretationPrompt: 'What’s your brain afraid it means?',
  commonInterpretations: [
    'They’re losing interest in me',
    'I’ve done something wrong',
    'They’re going to leave me',
    'They’re annoyed with me',
    'They don’t love me any more',
  ],
  likelyPatterns: ['mind-reading', 'spotlight-on-me', 'worst-case-jump', 'future-reading'],
  supports: [
    'It’s been going on for a while, not just a day or two',
    'They’ve said they’re unhappy about something between us',
    'They seem fine with other people but different with me',
    'Things have felt tense since a particular moment',
  ],
  against: [
    'They’re dealing with stress outside the relationship (work, health, family)',
    'They still do caring things, even if they’re quieter',
    'They tend to go inward when they’re tired or worried',
    'When I’ve asked before, it turned out to be something else',
  ],
  missing: [
    'What’s actually on their mind right now',
    'Whether they’ve noticed anything has changed',
    'How they’re sleeping, feeling or coping',
    'What they’d say if I asked kindly',
  ],
  angles: [
    ['context', 'People often go quiet when they’re working through something of their own. Quiet usually points inward before it points at anyone else.'],
    ['benign', 'They might be tired, stressed, or distracted by something they haven’t mentioned yet.'],
    ['neutral', 'A quieter stretch is a change in behaviour. It could have lots of causes, not just one.'],
    ['worry-partly-true', 'There could be something between you that needs talking about. If so, noticing it now is a good thing, not a sign of doom.'],
    ['not-enough-info', 'You know what’s changed on the outside. You don’t yet know what’s going on inside them.'],
    ['self-compassion', 'When you love someone, any change can feel loud. Your radar is working — it just can’t read the label.'],
    ['growth', 'This could be a chance to practise asking directly and kindly, which tends to make relationships sturdier.'],
  ],
  otherEyes: [
    'If your partner described this week, what might they say was going on for them? (A guess, not a fact.)',
    'What might a friend who loves you both notice?',
    'If you were the one who’d gone quiet, what would you want your partner to do?',
  ],
  predict: 'What are you predicting will happen between you?',
  knowns: ['They’ve been quieter lately', 'I’ve noticed, and it’s on my mind'],
  unknowns: ['Why they’re quieter', 'Whether it’s about me at all', 'How they’ll respond if I ask'],
  nextSteps: [
    ['check', 'Check the timeline: when did it start, and did anything else change around then?'],
    ['talk', 'Ask kindly and openly: “You’ve seemed a bit quiet. How are you doing?”'],
    ['act', 'Suggest something low-pressure you both enjoy, like a walk or a film.'],
    ['care', 'Look after your own evening too: friends, food, sleep.'],
    ['wait', 'Give them a little room before reading too much into it.'],
    ['boundary', 'If distance turns into ongoing coldness or contempt, it’s okay to say that doesn’t work for you.'],
  ],
  conversation: {
    with: 'your partner',
    openers: [
      'You’ve seemed a bit quiet lately. How are you doing, really?',
      'I’ve been feeling a bit far from you this week. Is everything okay with us?',
      'No pressure, but if something’s on your mind, I’m around.',
    ],
    replies: [
      ['Work has been a lot. Sorry — I didn’t realise I’d gone quiet.', 'You could say: “Thanks for telling me. Want to talk about it, or just switch off together?”'],
      ['I’m just tired. It’s not you.', 'You could say: “Okay. Let me know if that changes.”'],
      ['Actually, something has been bothering me about us.', 'You could say: “I’m glad you said it. I want to hear it.”'],
      ['I don’t really know. I’m a bit all over the place.', 'You could say: “That’s okay. We can figure it out slowly.”'],
    ],
    tips: [
      'Start with them, not the worry: “How are you?” before “Are we okay?”',
      'A calm moment beats a tense one.',
      'If they do raise something real, listening first helps you both.',
    ],
  },
  safetyNote: 'If your partner’s distance comes with threats, control, checking up on you, or you feel afraid of them, don’t reframe it. Your safety comes first, and support is available.',
}));

DEFS.push(mk({
  id: 'mistake-judged',
  code: 'mj',
  title: 'A mistake I think everyone noticed',
  guide: 'zuzu',
  cameo: {
    mallow: 'pipzi',
    lines: [
      'ALERT! A human made a mistake! Oh wait — that’s every human, every day.',
      'Fun fact: people spend way more time thinking about their own mistakes than about yours!',
    ],
  },
  contexts: ['work', 'school', 'social', 'self-image'],
  keywords: ['mistake', 'mistakes', 'error', 'errors', 'wrong', 'blunder', 'typo', 'stupid', 'idiot', 'dumb', 'forgot', 'slip', 'oops'],
  phrases: [
    'made a mistake', 'made an error', 'messed up', 'screwed up', 'got it wrong', 'slipped up',
    "think i'm stupid", "think i'm an idiot", "think i'm useless", "thinks i'm stupid", "thinks i'm an idiot",
    'everyone saw', 'everyone noticed', 'looked stupid', 'look stupid', 'looked like an idiot',
    'sent it to the wrong', 'wrong email', 'reply all', 'replied all', 'forgot to', 'my mistake',
  ],
  factPrompt: 'Just the camera view: what was the mistake, who saw it, and what happened next?',
  interpretationPrompt: 'What did your brain decide people now think of you?',
  commonInterpretations: [
    'Everyone thinks I’m stupid',
    'I’ll never live this down',
    'I always mess things up',
    'They’ll trust me less now',
    'I’m useless',
  ],
  likelyPatterns: ['mind-reading', 'spotlight-on-me', 'big-label', 'always-never', 'worst-case-jump'],
  supports: [
    'The mistake had a real knock-on effect for other people',
    'Someone commented on it directly',
    'It’s a mistake I’ve made before',
    'It happened in something important or public',
  ],
  against: [
    'Most people moved on quickly afterwards',
    'Others have made similar mistakes without anyone thinking less of them',
    'I fixed it, or it can be fixed',
    'People who know me have seen me get plenty right',
  ],
  missing: [
    'What anyone actually thought, as opposed to what I imagine',
    'How many people even noticed',
    'Whether anyone still remembers it',
    'How it compares to the mistakes other people make',
  ],
  angles: [
    ['context', 'People tend to overestimate how much others notice their slip-ups. Everyone else is mostly busy with their own day.'],
    ['benign', 'Anyone who did notice might have thought “oops, been there” and moved on.'],
    ['neutral', 'A mistake is something you did, not something you are.'],
    ['worry-partly-true', 'A few people might well have noticed and been briefly annoyed. That can be true and still be a small, recoverable thing.'],
    ['not-enough-info', 'You know what you did. You don’t know what anyone thought, or for how long.'],
    ['growth', 'What tends to stick in people’s minds is the fix, the apology, or what you did next.'],
    ['self-compassion', 'You’d forgive a friend for this in about four seconds. You’re allowed the same deal.'],
  ],
  otherEyes: [
    'If a colleague or classmate made this exact mistake, what would you think of them a week later?',
    'What might someone who likes you say about it?',
    'Will you even remember this a year from now?',
  ],
  predict: 'What do you think will happen because of this?',
  knowns: ['I made a mistake', 'Some people may have seen it'],
  unknowns: ['What anyone thought', 'Whether anyone still remembers', 'What effect it’ll have, if any'],
  nextSteps: [
    ['check', 'List what actually changed because of the mistake — the real consequences, not the imagined ones.'],
    ['act', 'If it needs fixing, fix it, or make a plan to.'],
    ['talk', 'A short, plain acknowledgement can help: “That was my mistake — it’s sorted now.”'],
    ['care', 'Do something steadying for ten minutes before you replay it again.'],
    ['wait', 'Notice how often people actually mention it over the next few days. Let real life do the fact-checking.'],
    ['boundary', 'If someone keeps bringing it up to make fun of you, it’s fine to say: “I’ve fixed it. Let’s move on.”'],
  ],
  conversation: {
    with: 'someone who was there',
    openers: [
      'Hey, sorry about earlier — that was my mistake, and it’s sorted now.',
      'That was a bit of a slip from me! Anything I need to do to tidy it up?',
      'Can I check — did my mistake earlier cause you any hassle?',
    ],
    replies: [
      ['Oh, I barely noticed. Don’t worry about it.', 'You could say: “Thanks. Good to know.”'],
      ['It did cause a bit of a headache, but it’s fine now.', 'You could say: “Sorry about that. I’ll double-check next time.”'],
      ['Ha, I did the same thing last month.', 'You could say: “Glad it’s not just me!”'],
      ['Maybe just check before sending next time?', 'You could say: “Fair. Will do.”'],
    ],
    tips: [
      'Keep the apology short. Over-apologising can make it bigger.',
      'One acknowledgement is enough.',
      'If they were annoyed, that’s okay too — it usually passes.',
    ],
  },
  safetyNote: 'If a mistake has put someone at risk, deal with the safety part first: tell the right person straight away.',
}));

DEFS.push(mk({
  id: 'job-rejection',
  code: 'jr',
  title: 'Interview or job rejection',
  guide: 'zuzu',
  cameo: {
    mallow: 'boppo',
    lines: [
      'A rejection is a door closing. Good news: doors are the most common thing in buildings!',
      'You got far enough to be turned down. That’s further than not trying!',
    ],
  },
  contexts: ['work', 'future', 'self-image', 'change'],
  keywords: ['interview', 'interviews', 'interviewed', 'rejected', 'rejection', 'unsuccessful', 'application', 'applications', 'applied', 'applying', 'recruiter', 'hiring', 'candidate', 'candidates', 'role', 'position', 'job', 'jobs', 'offer', 'shortlist', 'shortlisted', 'cv', 'resume', 'résumé'],
  phrases: [
    "didn't get the job", "didn't get the role", "didn't get it", 'got rejected', 'rejection email', 'turned down',
    'not successful', 'unsuccessful on this occasion', 'went with another candidate', 'other candidates',
    'failed the interview', 'bombed the interview', 'messed up the interview', 'never heard back',
    "won't hire me", 'no one will hire me', 'nobody will hire me', 'job hunting', 'job search', 'job application',
  ],
  factPrompt: 'Just the camera view: which role, which stage, and what exactly did they say?',
  interpretationPrompt: 'What did your brain decide this means about you or your future?',
  commonInterpretations: [
    'I’m not good enough',
    'No one will ever hire me',
    'I completely blew the interview',
    'I’ll never get a decent job',
    'Everyone else is getting jobs except me',
  ],
  likelyPatterns: ['future-reading', 'big-label', 'all-or-nothing', 'comparison-trap', 'always-never'],
  supports: [
    'I’ve had several rejections at the same stage',
    'They gave feedback about a specific gap',
    'I know I wasn’t prepared for some of the questions',
    'The role was a big stretch from my experience',
  ],
  against: [
    'I got through at least one earlier stage',
    'There may have been lots of strong applicants for one spot',
    'I’ve been hired before, so people have said yes to me',
    'Hiring often comes down to fit, timing or an internal candidate',
  ],
  missing: [
    'Who else applied and what they brought',
    'How close it was',
    'What the deciding factor was',
    'What other roles are coming up',
  ],
  angles: [
    ['context', 'Most jobs get lots of applicants and only one person gets the yes. Being turned down is the most common outcome, even for great candidates.'],
    ['benign', 'They might have had an internal candidate, or been looking for a very specific background.'],
    ['neutral', 'A rejection is a decision about one role at one moment. It isn’t a ruling on your whole future.'],
    ['worry-partly-true', 'There might be a real gap worth working on. If so, that’s something you can build — not a permanent fact about you.'],
    ['not-enough-info', 'Without their reasons, your brain is filling the gap with its harshest guess.'],
    ['growth', 'Every interview is practice. You’ll walk into the next one already knowing some of the questions.'],
    ['self-compassion', 'Job hunting is tiring and exposing. Being disappointed means you let yourself hope. That’s allowed.'],
  ],
  otherEyes: [
    'If a friend got this rejection, what would you tell them about their chances?',
    'What might the hiring panel have been weighing that you can’t see from here?',
    'Looking back a year from now, what might you notice about this moment?',
  ],
  predict: 'What are you predicting about your job search from here?',
  knowns: ['I didn’t get this role', 'I got as far as this stage'],
  unknowns: ['Why they chose someone else', 'What the next application will bring', 'How close I came'],
  nextSteps: [
    ['check', 'Check the numbers: how many applications, how many interviews? Progress often hides in there.'],
    ['talk', 'Ask for brief feedback: “Is there anything that would have strengthened my application?”'],
    ['act', 'Write down three questions from the interview while they’re fresh, and how you’d answer next time.'],
    ['care', 'Do something today that has nothing to do with job hunting.'],
    ['wait', 'Give the disappointment a day before deciding what it means.'],
    ['boundary', 'Set a daily cut-off time for job hunting so it doesn’t eat everything.'],
  ],
  conversation: {
    with: 'the recruiter or hiring manager',
    openers: [
      'Thanks for letting me know. Would you be open to sharing any feedback?',
      'I appreciated the chance to interview. Is there anything that would have made my application stronger?',
      'Thanks for your time. I’d love to be considered if something else comes up that fits.',
    ],
    replies: [
      ['It was really close. We went with someone with more direct experience.', 'You could say: “Thanks, that’s helpful. I’ll keep building that.”'],
      ['Sorry, we can’t give individual feedback.', 'You could say: “No problem — thanks anyway.”'],
      ['Your answers on one area were strong, but we needed more depth in another.', 'You could say: “That’s really useful, thank you.”'],
      ['We’ll keep your details on file.', 'You could say: “Great, please do.”'],
    ],
    tips: [
      'Feedback is optional for them, so any reply is a bonus.',
      'Short and gracious gets remembered.',
      'Treat what you hear as information, not a verdict.',
    ],
  },
  safetyNote: 'If job-hunting money worries mean you’re struggling to eat or pay rent, talking to someone you trust or a free advice service matters more than any reframe.',
}));

DEFS.push(mk({
  id: 'plans-cancelled',
  code: 'pc',
  title: 'A friend cancelled plans',
  guide: 'zuzu',
  cameo: {
    mallow: 'glitzi',
    lines: [
      'Cancelled plans: the thing people secretly love and loudly apologise for.',
      'Your brain wrote a whole drama out of one rescheduled coffee. Let’s check the script.',
    ],
  },
  contexts: ['friends', 'social'],
  keywords: ['cancel*', 'bail', 'bailed', 'flaked', 'flake', 'flaky', 'reschedul*', 'postpone*', 'plans', 'plan', 'meetup', 'dinner', 'coffee', 'drinks', 'friend', 'friends', 'mate'],
  phrases: [
    'cancelled on me', 'canceled on me', 'cancelled plans', 'canceled plans', 'cancelled our plans', 'canceled our plans',
    'bailed on me', 'flaked on me', 'pulled out', 'dropped out', "can't make it", "couldn't make it",
    'something came up', 'rain check', 'last minute', 'last-minute', 'keeps cancelling', 'keeps canceling',
    'cancelled again', 'canceled again',
  ],
  factPrompt: 'Just the camera view: when did they cancel, and what did they say?',
  interpretationPrompt: 'What did your brain make of it?',
  commonInterpretations: [
    'They don’t want to see me',
    'I’m not a priority to them',
    'They always cancel on me',
    'They’ve found better friends',
    'I’m boring to be around',
  ],
  likelyPatterns: ['mind-reading', 'always-never', 'spotlight-on-me', 'big-label'],
  supports: [
    'They’ve cancelled several times in a row',
    'They didn’t suggest another time',
    'The reason they gave didn’t quite add up',
    'They seem to make time for other people',
  ],
  against: [
    'They suggested another date',
    'They gave a reason, and it’s a believable one',
    'They’ve made the effort to see me before',
    'They’ve been under a lot of pressure lately',
  ],
  missing: [
    'What actually came up for them',
    'How they felt about cancelling',
    'Whether they’re keen to rebook',
    'What’s going on in their life right now',
  ],
  angles: [
    ['context', 'Energy, money, health and family stuff cancel a lot of plans. People sometimes cancel on the people they feel safest with.'],
    ['benign', 'They might have felt rough or overwhelmed, and cancelling felt easier than explaining.'],
    ['neutral', 'One cancellation is one event. It doesn’t automatically say what the friendship is.'],
    ['worry-partly-true', 'If it keeps happening, the friendship might need a conversation. That’s a fair thing to notice.'],
    ['not-enough-info', 'You know they cancelled. You don’t know what their day was really like.'],
    ['growth', 'This is a chance to say what you’d like — more notice, or a rebooked date — instead of quietly stewing.'],
    ['self-compassion', 'Being disappointed means you were looking forward to it. That’s not needy, that’s caring.'],
  ],
  otherEyes: [
    'When you’ve cancelled on someone, what were your reasons?',
    'What might a friend who knows you both say about this?',
    'A month from now, what would make this feel like a blip?',
  ],
  predict: 'What do you think will happen next with this friend?',
  knowns: ['They cancelled this plan', 'They gave (or didn’t give) a reason'],
  unknowns: ['What really came up', 'Whether they’ll rebook', 'How they feel about it'],
  nextSteps: [
    ['check', 'Count honestly: is this the first cancellation, or part of a pattern?'],
    ['talk', 'Reply warmly and offer a new date: “No worries! How about next week?”'],
    ['act', 'Use the freed-up time for something you’d enjoy anyway.'],
    ['care', 'Let yourself be a bit disappointed. It doesn’t need fixing straight away.'],
    ['wait', 'Leave the next plan to them for a bit, and see what happens.'],
    ['boundary', 'If it keeps happening, it’s okay to say: “I’d love to see you, but last-minute cancels are hard for me.”'],
  ],
  conversation: {
    with: 'your friend',
    openers: [
      'No worries! Hope everything’s okay. Want to try next week?',
      'Ah, shame — I was looking forward to it. Shall we rebook?',
      'Hey, I’ve noticed we keep missing each other. Is everything alright?',
    ],
    replies: [
      ['Thanks for being cool about it. Next Thursday?', 'You could say: “Thursday’s perfect.”'],
      ['I’ve just been really overwhelmed lately.', 'You could say: “Sorry it’s been a lot. Want to do something low-key instead?”'],
      ['Honestly, money’s tight at the moment.', 'You could say: “Totally fine. Let’s do something free.”'],
      ['Yeah… I’ve been a bit flaky. Sorry.', 'You could say: “Thanks for saying that. Seeing you does matter to me.”'],
    ],
    tips: [
      'Offering a new date makes it easy to say yes.',
      'If it’s a pattern, name the pattern, not their character.',
      'Their reply tells you more than your guess can.',
    ],
  },
  safetyNote: 'If you’re worried the cancellation means your friend isn’t well or isn’t safe, check in on them directly — the reframe can wait.',
}));

DEFS.push(mk({
  id: 'social-comparison',
  code: 'sc',
  title: 'Comparing myself to others online',
  guide: 'zuzu',
  cameo: {
    mallow: 'glitzi',
    lines: [
      'Ah yes, the highlight reel. Nobody posts their 3am fridge snack.',
      'Comparing your behind-the-scenes to their trailer. Classic. Rigged game, terrible prizes.',
    ],
  },
  contexts: ['social', 'self-image', 'future', 'body', 'money'],
  keywords: ['instagram', 'insta', 'tiktok', 'linkedin', 'facebook', 'feed', 'scrolling', 'scroll', 'posts', 'posted', 'influencer', 'influencers', 'followers', 'likes', 'engaged', 'engagement', 'wedding', 'holiday', 'vacation', 'house', 'successful', 'behind', 'compar*', 'jealous*', 'envy', 'envious'],
  phrases: [
    'on instagram', 'on linkedin', 'on tiktok', 'on facebook', 'on social media', 'everyone else is', 'everyone else has',
    'all my friends are', 'all my friends have', 'better than me', 'doing better than me', 'ahead of me',
    'behind everyone', 'behind my friends', 'compare myself', 'comparing myself', 'perfect life', 'perfect lives',
    'at my age', 'just got engaged', 'bought a house', 'dream job', 'people my age',
  ],
  factPrompt: 'Just the camera view: what did you actually see? Whose post, and what did it show?',
  interpretationPrompt: 'What did your brain conclude about your own life?',
  commonInterpretations: [
    'Everyone’s doing better than me',
    'I’m so behind in life',
    'I should have achieved more by now',
    'My life is boring compared to theirs',
    'I’ll never have what they have',
  ],
  likelyPatterns: ['comparison-trap', 'should-rules', 'future-reading', 'only-the-bad-bit', 'always-never'],
  supports: [
    'There’s something specific they have that I really want',
    'I’ve felt stuck in that area for a while',
    'The people I compare myself to started from a similar place',
    'I can name a concrete gap, not just a vague feeling',
  ],
  against: [
    'I’m seeing the highlights, not the full picture',
    'There are things in my life they might envy',
    'Their path started from a different place, or with different resources',
    'I’ve made progress that doesn’t show up in a post',
  ],
  missing: [
    'What their life is like off-camera',
    'What they had to give up or deal with',
    'Whether they feel as sure as they look',
    'What “on track” even means for me',
  ],
  angles: [
    ['context', 'Feeds are highlight reels — chosen, cropped and sometimes filtered. Your whole day doesn’t stand a chance against their best minute.'],
    ['benign', 'They might genuinely be happy right now, and that might take nothing away from your life at all.'],
    ['neutral', 'Someone else’s good news is information about them. It doesn’t actually say anything about you.'],
    ['worry-partly-true', 'This might have shown you something you really want. That’s worth knowing — as a direction, not a scorecard.'],
    ['not-enough-info', 'You’re comparing everything you know about yourself with one post about them.'],
    ['growth', 'Envy can work like a compass. What exactly do you want more of — and what’s one tiny step toward it?'],
    ['self-compassion', 'Lives don’t run on one shared timetable. You’re allowed to be at your own point in yours.'],
  ],
  otherEyes: [
    'If a friend felt behind after seeing your posts, what would you want them to know?',
    'What might the person who posted it be dealing with that doesn’t make it into the photos? (You can only wonder.)',
    'What would you from five years ago think of where you are now?',
  ],
  predict: 'What are you predicting about your own future after seeing this?',
  knowns: ['I saw this post', 'It stirred up some feelings'],
  unknowns: ['What their life is like overall', 'Where I’ll be in a few years', 'Whether I’d actually want their life if I had it'],
  nextSteps: [
    ['check', 'Name one thing you have now that you didn’t have a year ago.'],
    ['act', 'Pick one tiny step toward the thing you actually want.'],
    ['care', 'Close the app for the evening. The feed will survive without you.'],
    ['boundary', 'Mute or unfollow accounts that leave you feeling worse. You can always follow back.'],
    ['talk', 'Tell a friend what you’re working toward. Saying it out loud makes it yours.'],
    ['wait', 'Notice whether the feeling fades after a night’s sleep.'],
  ],
  safetyNote: 'If comparing your body or eating to other people’s is turning into skipping meals or hurting yourself, please talk to a doctor or someone you trust rather than reframing.',
}));

DEFS.push(mk({
  id: 'family-argument',
  code: 'fa',
  title: 'An argument with family',
  guide: 'zuzu',
  cameo: {
    mallow: 'loomi',
    lines: [
      'Families know exactly which buttons to press. They were there when the buttons got installed.',
      'Let the dust settle. We can look at it in slow motion.',
    ],
  },
  contexts: ['family', 'conflict'],
  keywords: ['argument', 'argue', 'argued', 'arguing', 'row', 'rowed', 'fight', 'fought', 'fighting', 'shouted', 'shouting', 'yelled', 'yelling', 'screamed', 'slammed', 'mum', 'mom', 'dad', 'mother', 'father', 'parents', 'brother', 'sister', 'sibling*', 'family', 'aunt', 'uncle', 'grandma', 'grandad', 'grandpa', 'nan', 'stepmum', 'stepmom', 'stepdad', 'in-laws'],
  phrases: [
    'had an argument', 'had a fight', 'had a row', 'big fight', 'huge row', 'fell out with', 'falling out',
    'argued with my', 'fight with my', 'argument with my', 'row with my', 'said hurtful things', 'hung up on me',
    'stormed off', 'not speaking', 'not talking to each other', 'silent treat*',
  ],
  factPrompt: 'Just the camera view: what was actually said and done? Words and actions, not tone.',
  interpretationPrompt: 'What did your brain decide it means about you, them, or the relationship?',
  commonInterpretations: [
    'They’ll never forgive me',
    'They don’t respect me',
    'It’s all my fault',
    'We’ll never get on',
    'They always do this',
  ],
  likelyPatterns: ['always-never', 'spotlight-on-me', 'mind-reading', 'future-reading', 'big-label'],
  supports: [
    'This argument is part of a long-running pattern',
    'Things were said that were genuinely hurtful',
    'They haven’t been in touch since',
    'It’s about something that matters a lot to both of us',
  ],
  against: [
    'We’ve argued before and come back from it',
    'We both said things in the heat of the moment',
    'There’s love underneath, even when it’s messy',
    'It was about one topic, not the whole relationship',
  ],
  missing: [
    'How they’re feeling about it now',
    'Whether they regret anything they said',
    'What was going on for them before it started',
    'What they’d want to happen next',
  ],
  angles: [
    ['context', 'Family arguments often run on old scripts. The same few topics can set things off long after the original reason has gone.'],
    ['benign', 'They might be feeling just as rattled, and unsure how to come back from it.'],
    ['neutral', 'An argument is a moment of disagreement, not the final score on a relationship.'],
    ['worry-partly-true', 'This might be a real difference that won’t just disappear. You can still choose how you handle it, and what you will and won’t accept.'],
    ['not-enough-info', 'You know how it ended. You don’t yet know how it’ll look once things have cooled.'],
    ['growth', 'Noticing what set it off gives you choices next time: step in, step back, or change the subject.'],
    ['self-compassion', 'You can love someone and still be furious with them. Both are allowed at once.'],
  ],
  otherEyes: [
    'If a fair-minded relative had watched the whole thing, what might they say each of you wanted?',
    'What would you tell a friend who’d had this exact argument?',
    'How might this look a year from now?',
  ],
  predict: 'What do you predict will happen between you?',
  knowns: ['We argued', 'Some things were said'],
  unknowns: ['How they feel now', 'Whether they want to repair it', 'How the next conversation will go'],
  nextSteps: [
    ['check', 'Write down the main thing each of you was actually upset about — one line each.'],
    ['wait', 'Give it some cooling-off time before reopening it.'],
    ['talk', 'When you’re ready, try: “I didn’t like how that went. Can we try again?”'],
    ['act', 'Burn off some of the adrenaline — a brisk walk helps.'],
    ['care', 'Talk it over with someone outside the family who’s on your side.'],
    ['boundary', 'It’s okay to say: “I’m happy to talk, but not if we’re shouting.”'],
  ],
  conversation: {
    with: 'your family member',
    openers: [
      'I didn’t like how things went the other day. Can we talk about it calmly?',
      'I’m sorry for my part in it. I’d like us to be okay.',
      'I’ve been thinking about our argument. Can I tell you what I meant?',
    ],
    replies: [
      ['I’ve been feeling bad about it too.', 'You could say: “I’m glad. Let’s start again.”'],
      ['I still think I was right.', 'You could say: “We might not agree, and that’s okay. I just don’t want to fight about it.”'],
      ['I’m not ready to talk yet.', 'You could say: “That’s fine. I’m here when you are.”'],
      ['You really hurt me with what you said.', 'You could say: “I’m sorry. Can you tell me which part hurt most?”'],
    ],
    tips: [
      'Talk about one thing, not every argument you’ve ever had.',
      '“I felt…” tends to land better than “You always…”.',
      'If it starts heating up again, it’s okay to pause.',
    ],
  },
  safetyNote: 'If an argument involved violence or threats, or you don’t feel safe at home, that isn’t something to reframe. Please talk to someone you trust or a support service.',
}));

DEFS.push(mk({
  id: 'group-chat-ignored',
  code: 'gc',
  title: 'Ignored in the group chat',
  guide: 'zuzu',
  cameo: {
    mallow: 'pipzi',
    lines: [
      'The group chat moved on in 0.3 seconds! Group chats have the attention span of a squirrel on espresso!',
      'Messages in group chats get buried faster than socks in a laundry pile!',
    ],
  },
  contexts: ['friends', 'social', 'work'],
  keywords: ['group', 'groupchat', 'gc', 'chat', 'whatsapp', 'discord', 'slack', 'thread', 'ignored', 'ignoring', 'reacted', 'reaction', 'reactions', 'emoji', 'buried', 'crickets', 'tumbleweed'],
  phrases: [
    'group chat', 'the chat', 'in the group', 'nobody replied', 'no one replied', 'nobody responded',
    'no one responded', 'no one reacted', 'nobody reacted', 'everyone ignored', 'ignored my message',
    'got ignored', 'carried on talking', 'kept talking about', 'no reactions', 'nobody answered', 'no one answered',
  ],
  factPrompt: 'Just the camera view: what did you post, and what happened after? How busy was the chat?',
  interpretationPrompt: 'What did your brain decide the silence meant?',
  commonInterpretations: [
    'Nobody cares what I say',
    'They don’t really want me in the group',
    'I said something stupid',
    'I always get ignored',
    'They all find me annoying',
  ],
  likelyPatterns: ['mind-reading', 'always-never', 'spotlight-on-me', 'feelings-as-proof'],
  supports: [
    'Other messages around mine got replies',
    'This happens a lot in this particular chat',
    'I’ve noticed I get left out in person too',
    'A few people in the group mostly reply only to each other',
  ],
  against: [
    'The chat was busy and moving fast',
    'People respond to me there at other times',
    'My message didn’t ask a question',
    'Some of them have messaged me separately recently',
  ],
  missing: [
    'How many people actually saw it',
    'Whether anyone meant to reply and forgot',
    'How the others feel about the chat in general',
    'Whether anyone noticed it got lost',
  ],
  angles: [
    ['context', 'Group chats are chaos. Messages without a question often get a silent read, even when people liked them.'],
    ['benign', 'People might have read it, agreed, and assumed someone else would reply.'],
    ['neutral', 'In a group, “no reply” often means nobody in particular felt it was their turn.'],
    ['worry-partly-true', 'Maybe the group doesn’t make much room for you right now. If so, that’s worth noticing — and you get to decide what to do about it.'],
    ['not-enough-info', 'Silence in a group is very hard to read. You don’t know what any one person thought.'],
    ['growth', 'Asking a direct question, or tagging someone, can make replies more likely next time.'],
    ['self-compassion', 'Feeling invisible, even for a moment, is uncomfortable. It’s okay that it bothered you.'],
  ],
  otherEyes: [
    'When you’ve read a group message and not replied, what was usually going on?',
    'What might the most easy-going person in the group think about this?',
    'A week from now, will this message still matter to anyone?',
  ],
  predict: 'What do you think will happen in the chat from here?',
  knowns: ['I posted something', 'Nobody has replied yet'],
  unknowns: ['Who saw it', 'Why nobody answered', 'How people feel about me'],
  nextSteps: [
    ['check', 'Scroll back: how often do other people’s messages go unanswered too?'],
    ['act', 'Next time, try ending with a question, or tagging one person.'],
    ['talk', 'Message one person from the group directly — one-to-one is often warmer.'],
    ['care', 'Mute the chat for an hour so you’re not refreshing it.'],
    ['wait', 'Give it until tomorrow. Group chats often catch up late.'],
    ['boundary', 'If the chat keeps leaving you feeling worse, you’re allowed to mute it or step back.'],
  ],
  conversation: {
    with: 'one person from the chat',
    openers: [
      'Hey! Did you see my message in the group? Keen to know what you think.',
      'Group chat was chaos earlier! Fancy doing something this week?',
      'Random question — do you ever feel like stuff gets lost in that chat?',
    ],
    replies: [
      ['Oh, I totally missed that! Yes, I’m in.', 'You could say: “Great!”'],
      ['Ha, that chat is a mess. I mute it most of the time.', 'You could say: “Same, honestly.”'],
      ['I saw it and meant to reply, sorry!', 'You could say: “No worries at all.”'],
      ['Not sure — I’m a bit busy at the moment.', 'You could say: “No problem, maybe another time.”'],
    ],
    tips: [
      'One-to-one messages usually get warmer replies than group ones.',
      'Keep it light. No need to mention feeling ignored unless you want to.',
      'Their reply is real information. Your guess was only a guess.',
    ],
  },
  safetyNote: 'If people in a group chat are mocking you, sharing things about you or ganging up on you, that’s bullying, not a reframing moment. Screenshot it and talk to someone you trust.',
}));

DEFS.push(mk({
  id: 'seemed-annoyed',
  code: 'sa',
  title: 'Someone seemed annoyed with me',
  guide: 'zuzu',
  cameo: {
    mallow: 'noomi',
    lines: [
      'Faces are a bit like clouds. Sometimes one looks like a dragon, and it’s still just a cloud.',
      'Their frown might belong to a whole other story.',
    ],
  },
  contexts: ['work', 'friends', 'social', 'family', 'conflict'],
  keywords: ['annoyed', 'irritated', 'irritable', 'snappy', 'snapped', 'curt', 'frown*', 'sighed', 'sighing', 'eye-roll', 'grumpy', 'tone', 'blunt', 'abrupt', 'cross', 'mad', 'off'],
  phrases: [
    'seemed annoyed', 'seemed irritated', 'seemed off', 'seemed cold', 'seemed angry', 'seemed upset',
    'was short with me', 'snapped at me', 'rolled their eyes', 'rolled her eyes', 'rolled his eyes', 'gave me a look',
    'dirty look', 'funny look', 'sighed at me', 'one-word answer', 'short reply', 'blunt reply', 'annoyed with me',
    'annoyed at me', 'angry with me', 'mad at me', 'upset with me', 'fed up with me', 'cold with me', 'off with me',
    'weird with me', 'irritated with me',
  ],
  factPrompt: 'Just the camera view: what did you actually see or hear? Their words, face and tone, as a camera would catch them.',
  interpretationPrompt: 'What did your brain decide they were feeling, and why?',
  commonInterpretations: [
    'They’re annoyed with me',
    'I did something to upset them',
    'They don’t like me',
    'They think I’m irritating',
    'I’ve ruined things with them',
  ],
  likelyPatterns: ['mind-reading', 'spotlight-on-me', 'feelings-as-proof', 'worst-case-jump'],
  supports: [
    'It happened straight after something I said or did',
    'They’re usually warm with me, and this was different',
    'Someone else noticed it too',
    'They’ve told me before when something like this annoyed them',
  ],
  against: [
    'They seemed the same with other people',
    'They’re dealing with a lot right now',
    'This is how they come across when they’re busy or tired',
    'Things were normal the next time we spoke',
  ],
  missing: [
    'What was actually on their mind',
    'Whether they even noticed how they came across',
    'What happened to them just before we spoke',
    'Whether it had anything to do with me',
  ],
  angles: [
    ['context', 'Faces and tone are hard to read. Tired, busy, hungry and worried can all look a lot like annoyed.'],
    ['benign', 'They might have been dealing with something else entirely, and you happened to be there.'],
    ['neutral', 'A short reply or a flat face is one moment. On its own, it doesn’t tell you the reason.'],
    ['worry-partly-true', 'They might have been annoyed with you. That happens in every relationship, and it’s usually fixable with a quick, honest chat.'],
    ['not-enough-info', 'You saw the outside. You haven’t heard the inside yet.'],
    ['growth', 'This is a chance to practise checking in instead of guessing.'],
    ['self-compassion', 'Being tuned in to other people’s moods is a strength. It just needs a fact-check now and then.'],
  ],
  otherEyes: [
    'If a friend described this moment to you, what other reasons might you suggest?',
    'If you came across as annoyed on a bad day, what would you want people to assume?',
    'How might this look tomorrow?',
  ],
  predict: 'What do you predict will happen next time you see them?',
  knowns: ['They seemed short or off', 'It bothered me'],
  unknowns: ['What they were feeling', 'Why they seemed that way', 'Whether it had anything to do with me'],
  nextSteps: [
    ['check', 'Check: were they like this with everyone, or only with me?'],
    ['talk', 'If it matters, ask lightly: “You seemed a bit stressed earlier — all good?”'],
    ['wait', 'See how the next interaction goes before drawing conclusions.'],
    ['act', 'Carry on with your day as normal and notice what happens.'],
    ['care', 'If your mind keeps replaying it, do something steadying with your hands.'],
    ['boundary', 'If someone is regularly rude to you, it’s okay to say so, calmly.'],
  ],
  conversation: {
    with: 'them',
    openers: [
      'You seemed a bit stressed earlier — everything okay?',
      'Hey, did I catch you at a bad time before?',
      'I might be reading too much into it, but are we okay?',
    ],
    replies: [
      ['Oh, sorry! I had a horrible morning. Nothing to do with you.', 'You could say: “Ah, sorry about your morning. Hope it gets better.”'],
      ['Was I? I didn’t even notice.', 'You could say: “No worries, just checking!”'],
      ['Honestly, I was a bit annoyed about earlier.', 'You could say: “Thanks for telling me. What would help?”'],
      ['I’m fine, just busy.', 'You could say: “Okay! Shout if you need anything.”'],
    ],
    tips: [
      'A light question tends to get a more honest answer than a heavy one.',
      'If they were annoyed, now you can actually sort it out.',
      'Take “I’m fine” at face value for now.',
    ],
  },
  safetyNote: 'If someone’s anger towards you is frightening, comes with threats, or you feel you’re always walking on eggshells around them, that isn’t something to reframe. Reach out to someone you trust.',
}));

DEFS.push(mk({
  id: 'performance-review',
  code: 'pr',
  title: 'A so-so performance review',
  guide: 'zuzu',
  cameo: {
    mallow: 'boppo',
    lines: [
      '“Meets expectations” means you met them! That’s literally the thing they expected!',
      'Middle of the road is still on the road. And roads go places!',
    ],
  },
  contexts: ['work', 'future', 'self-image'],
  keywords: ['review', 'appraisal', 'performance', 'rating', 'rated', 'evaluation', 'annual', 'quarterly', 'midyear', 'mid-year', 'objectives', 'kpis', 'okrs', 'targets', 'mediocre', 'satisfactory', 'adequate', 'raise', 'bonus'],
  phrases: [
    'performance review', 'annual review', 'end of year review', 'year-end review', 'meets expectations',
    'met expectations', 'below expectations', 'room for improvement', 'areas for improvement', 'areas to improve',
    'development areas', 'average rating', 'mediocre review', 'so-so review', 'okay review', 'not a great review',
    'bad review', 'performance improvement plan', "didn't get a raise", 'no pay rise', 'no raise', 'no bonus',
  ],
  factPrompt: 'Just the camera view: what did the review actually say? The rating and the comments, word for word if you have them.',
  interpretationPrompt: 'What did your brain decide it means about you and your job?',
  commonInterpretations: [
    'I’m not good at my job',
    'They’re going to let me go',
    'I’ll never get promoted',
    'All the good stuff I did didn’t count',
    'They don’t value me',
  ],
  likelyPatterns: ['only-the-bad-bit', 'shrinking-the-good', 'worst-case-jump', 'all-or-nothing', 'big-label'],
  supports: [
    'The review named specific things that need to change',
    'My rating dropped compared with last time',
    'I’ve missed targets this year',
    'My manager has raised the same points before',
  ],
  against: [
    'The review also included positive comments',
    'A middle rating is the most common rating in many workplaces',
    'There was no mention of serious problems',
    'They set goals for next year, which suggests they see a future for me there',
  ],
  missing: [
    'How ratings are spread across the team',
    'Whether there are limits on top ratings',
    'What exactly would move me up a level',
    'How my manager sees where I’m heading',
  ],
  angles: [
    ['context', 'Lots of workplaces limit how many top ratings they give, so “meets expectations” is often the most common result by design.'],
    ['benign', 'Your manager might have rated cautiously, or been working within limits you can’t see.'],
    ['neutral', 'A rating squeezes a whole year into one word. It leaves a lot out.'],
    ['worry-partly-true', 'There may be real areas to improve. That can be true without meaning you’re bad at your job.'],
    ['not-enough-info', 'You don’t yet know how this rating compares to your team, or what would change it.'],
    ['growth', 'A clear list of what to work on can be more useful than vague praise. It’s a map for next year.'],
    ['self-compassion', 'It’s disappointing to hope for more and get less. That doesn’t erase the work you put in.'],
  ],
  otherEyes: [
    'If a colleague got this exact review, would you think they were bad at their job?',
    'What might your manager have been balancing when they wrote it? (Wonder — don’t decide.)',
    'At your next review, what would you like to be able to point to?',
  ],
  predict: 'What are you predicting will happen because of this review?',
  knowns: ['I got this rating', 'Some areas were named to work on'],
  unknowns: ['How it compares to others', 'Whether it affects my future there', 'What would move it up'],
  nextSteps: [
    ['check', 'Write the positive comments next to the critical ones, so you can see the whole review at once.'],
    ['talk', 'Ask your manager: “What would an excellent rating look like for me next year?”'],
    ['act', 'Choose one development area and one concrete action for this month.'],
    ['care', 'Be kind to yourself tonight. It’s been a tense day.'],
    ['wait', 'Wait a day before replying to anything about the review.'],
    ['boundary', 'If something in the review is factually wrong, it’s okay to ask for it to be corrected — calmly, and in writing.'],
  ],
  conversation: {
    with: 'your manager',
    openers: [
      'Thanks for the review. Could we talk about what would move me to the next rating?',
      'I was hoping for a stronger rating. Can you help me see where the gap is?',
      'I’d like to focus on the right things this year. What matters most to you?',
    ],
    replies: [
      ['Honestly, you’re close. A bit more ownership of projects would do it.', 'You could say: “That’s really helpful. Could we check in on it in three months?”'],
      ['Ratings were tight across the whole team this year.', 'You could say: “Thanks, that’s useful context.”'],
      ['There are a couple of things that do need to improve.', 'You could say: “Okay. Can we make a plan together?”'],
      ['You’re doing well. “Meets expectations” is a good rating here.', 'You could say: “Good to know, thank you.”'],
    ],
    tips: [
      'Ask for specific examples of what “better” looks like.',
      'Bring a note so you don’t forget what you wanted to ask.',
      'If there is a real concern, a plan beats guessing.',
    ],
  },
  safetyNote: 'If you think a review was unfair because of discrimination or retaliation, that isn’t something to reframe. Keep records and talk to HR, a union or an employment advice service.',
}));

DEFS.push(mk({
  id: 'bad-grade',
  code: 'bg',
  title: 'A bad grade or exam result',
  guide: 'zuzu',
  cameo: {
    mallow: 'pipzi',
    lines: [
      'A grade! One letter or number! Trying to sum up a whole entire human! Outrageous!',
      'You are not a number. You are, at minimum, several numbers and a snack!',
    ],
  },
  contexts: ['school', 'future', 'self-image'],
  keywords: ['grade', 'grades', 'mark', 'marks', 'marked', 'exam', 'exams', 'test', 'tests', 'results', 'result', 'gcse', 'gcses', 'a-level', 'a-levels', 'sats', 'gpa', 'essay', 'coursework', 'assignment', 'module', 'failed', 'fail', 'flunked', 'resit', 'retake', 'teacher', 'lecturer', 'professor', 'tutor', 'uni', 'university', 'college', 'school', 'degree', 'revision', 'revised', 'studied', 'studying'],
  phrases: [
    'bad grade', 'low grade', 'bad mark', 'low mark', 'bad result', 'failed my exam', 'failed the exam', 'failed the test',
    'failed my test', 'did badly', 'did terribly', "didn't pass", 'got a c', 'got a d', 'got an e', 'got an f',
    'got a 2:2', 'barely passed', 'below average', 'lower than expected', 'worse than i expected',
    'need to resit', 'have to retake', 'exam results',
  ],
  factPrompt: 'Just the camera view: what was the result, and for what? Any comments from the marker?',
  interpretationPrompt: 'What did your brain decide it means about you or your future?',
  commonInterpretations: [
    'I’m stupid',
    'I’ll never get into the course or job I want',
    'I’ve ruined my future',
    'Everyone else did better than me',
    'I should have done better',
  ],
  likelyPatterns: ['big-label', 'future-reading', 'worst-case-jump', 'comparison-trap', 'should-rules'],
  supports: [
    'I didn’t revise as much as I needed to',
    'This subject has been hard for me for a while',
    'This result counts towards something important',
    'The marker pointed out the weak spots I’d suspected',
  ],
  against: [
    'I’ve done well in other tests or subjects',
    'One result rarely decides a whole future',
    'Something was going on that affected my prep or the day itself',
    'There’s usually a resit, a next module or another route',
  ],
  missing: [
    'How much this result actually counts',
    'How the rest of the group did',
    'What options exist from here',
    'What the marker would suggest working on',
  ],
  angles: [
    ['context', 'Exams test one set of questions on one day. They’re useful, but they don’t measure everything you can do.'],
    ['benign', 'The paper might have been unusually tough, or marked more harshly than you expected.'],
    ['neutral', 'A grade measures one piece of work at one moment. It isn’t a measure of your whole brain.'],
    ['worry-partly-true', 'It might mean you need a different way of revising, or some extra help. That’s a fixable problem, not a verdict on you.'],
    ['not-enough-info', 'You don’t yet know how much this counts, or what your options are. Find that out before deciding it’s a disaster.'],
    ['growth', 'A result like this can show exactly where to focus. That’s more useful than a lucky pass.'],
    ['self-compassion', 'You’re allowed to be gutted. Disappointment means it mattered to you.'],
  ],
  otherEyes: [
    'If your best friend got this result, what would you tell them?',
    'What might a teacher who has seen thousands of results say about one bad one?',
    'Five years from now, how much do you think this one result will matter?',
  ],
  predict: 'What are you predicting this result means for your future?',
  knowns: ['I got this result', 'It’s lower than I hoped'],
  unknowns: ['How much it counts overall', 'What options there are', 'How I’ll do next time with a new plan'],
  nextSteps: [
    ['check', 'Find out exactly how much this result counts, and what the options are: resits, appeals, other routes.'],
    ['talk', 'Ask a teacher or tutor: “What one thing would make the biggest difference?”'],
    ['act', 'Make a small plan for your weakest area: three short sessions this week.'],
    ['care', 'Eat something proper and get some sleep before deciding anything big.'],
    ['wait', 'Give it a day before telling yourself what it “means”.'],
    ['boundary', 'If someone is piling on pressure, it’s okay to say: “I know. I’m working out a plan.”'],
  ],
  conversation: {
    with: 'your teacher or tutor',
    openers: [
      'I was disappointed with my result. Could you help me see where I lost marks?',
      'What would you focus on if you were me?',
      'Is there a resit, or another way to make this up?',
    ],
    replies: [
      ['Your ideas were good, but you ran out of time on the last section.', 'You could say: “That makes sense. Any tips for timing?”'],
      ['A lot of people found this paper hard.', 'You could say: “Good to know. What would help me next time?”'],
      ['You need to go deeper in your answers.', 'You could say: “Could you show me an example of a stronger answer?”'],
      ['There’s a resit option in the summer.', 'You could say: “Great. What should I focus on?”'],
    ],
    tips: [
      'Ask about the work, not whether you’re “good enough”.',
      'Bring the paper with you.',
      'Write down what they say so you can use it later.',
    ],
  },
  safetyNote: 'If pressure about grades is making you feel unsafe, or someone at home reacts to results with violence or threats, please tell a teacher or someone you trust.',
}));

DEFS.push(mk({
  id: 'no-text-back',
  code: 'nt',
  title: 'A date or crush didn’t text back',
  guide: 'zuzu',
  cameo: {
    mallow: 'glitzi',
    lines: [
      'The typing bubble appeared and then vanished. Truly the most dramatic three dots in history.',
      'Waiting for a text: a horror film where the monster is a notification sound.',
    ],
  },
  contexts: ['relationship', 'social', 'self-image'],
  keywords: ['date', 'dated', 'dating', 'crush', 'tinder', 'hinge', 'bumble', 'match', 'matched', 'ghost*', 'situationship', 'flirt*', 'texted', 'texting'],
  phrases: [
    "didn't text back", "didn't text me back", "hasn't texted back", "hasn't texted me back", "hasn't messaged back",
    "didn't message back", 'not texting back', 'stopped texting', 'stopped replying', 'stopped messaging',
    'got ghosted', 'ghosted me', 'first date', 'second date', 'after our date', 'after the date', 'my crush',
    "the guy i'm seeing", "the girl i'm seeing", "the person i'm seeing", "someone i'm seeing", 'talking to someone',
    'talking stage', 'asked them out', 'asked her out', 'asked him out', 'on a dating app', 'dating app',
  ],
  factPrompt: 'Just the camera view: when did you last hear from them, and what was the last message?',
  interpretationPrompt: 'What did your brain decide the silence means?',
  commonInterpretations: [
    'They’re not interested in me',
    'I did something to put them off',
    'I’m unlovable',
    'I always get ghosted',
    'I came on too strong',
  ],
  likelyPatterns: ['mind-reading', 'big-label', 'always-never', 'spotlight-on-me', 'feelings-as-proof'],
  supports: [
    'They used to reply quickly and have suddenly stopped',
    'They’ve been vague about making plans',
    'They’re active elsewhere but not replying to me',
    'There were mixed signals already',
  ],
  against: [
    'It hasn’t been very long yet',
    'They seemed keen when we last spoke',
    'They mentioned being busy this week',
    'Early dating often comes with uneven texting styles',
  ],
  missing: [
    'What their week has been like',
    'What they’re looking for right now',
    'How they feel about texting in general',
    'Whether they’re slow, unsure, or no longer interested',
  ],
  angles: [
    ['context', 'Early dating comes with lots of uncertainty, and people have wildly different texting habits.'],
    ['benign', 'They might be busy, nervous, or not sure what to say next.'],
    ['neutral', 'Silence early on is information about their situation. It isn’t a judgement on your worth.'],
    ['worry-partly-true', 'They might not be interested. If so, that would hurt — and it would also tell you they’re not your person, which saves you time.'],
    ['not-enough-info', 'You know they haven’t replied. You don’t know why yet, and you might never fully know.'],
    ['growth', 'This is good practice in staying steady while things are uncertain — a very useful dating skill.'],
    ['self-compassion', 'Hoping someone likes you back takes courage. Putting yourself out there is a good thing, whatever happens.'],
  ],
  otherEyes: [
    'If a friend told you this had happened to them, would it change how you saw them?',
    'What might someone with a totally different texting style make of the gap?',
    'Six months from now, what might you be glad you didn’t do in a panic?',
  ],
  predict: 'What do you predict will happen next?',
  knowns: ['There’s been no reply', 'I like them'],
  unknowns: ['Why they haven’t replied', 'What they’re looking for', 'Whether they’ll get back in touch'],
  nextSteps: [
    ['check', 'Check how long it’s actually been, and whether your last message needed a reply.'],
    ['talk', 'Send one clear, easy message — “I had fun the other night. Up for another?” — then leave it.'],
    ['wait', 'Pick a time frame, and let silence after that be your answer.'],
    ['act', 'Make plans with friends so your evening isn’t spent watching your phone.'],
    ['care', 'Remind yourself of three things the people in your life value about you.'],
    ['boundary', 'You deserve someone who’s clearly keen. It’s okay to stop waiting.'],
  ],
  conversation: {
    with: 'your date or crush',
    openers: [
      'I had a really nice time the other day. Up for doing it again?',
      'Hey! Hope your week’s going well. Fancy a drink this weekend?',
      'I’d love to see you again — but no pressure if you’re not feeling it.',
    ],
    replies: [
      ['Sorry for going quiet, this week has been mad! Yes, I’d love to.', 'You could say: “Great — how about Saturday?”'],
      ['I’ve had a nice time, but I don’t think we’re a match.', 'You could say: “Thanks for being honest. Take care!”'],
      ['I’m not great at texting, but I am keen!', 'You could say: “Good to know! Let’s just make a plan, then.”'],
      ['(No reply.)', 'Your move: let the silence be the answer, and put your energy back into things that fill you up.'],
    ],
    tips: [
      'One follow-up is enough. A second is fine; a third is a spiral.',
      'A clear yes or no beats a maybe that drags on.',
      'Their answer — or no answer — is about fit, not your worth.',
    ],
  },
  safetyNote: 'If someone you’ve been dating is pressuring you, threatening you, or sharing things about you without permission, that isn’t something to reframe. Stop contact and talk to someone you trust.',
}));

DEFS.push(mk({
  id: 'family-criticism',
  code: 'fc',
  title: 'Criticism from a parent or sibling',
  guide: 'zuzu',
  cameo: {
    mallow: 'blubi',
    lines: [
      'Words from family can land extra hard. Let’s hold this one gently.',
      'You can love them and still not let every word in.',
    ],
  },
  contexts: ['family', 'self-image', 'conflict'],
  keywords: ['mum', 'mom', 'dad', 'mother', 'father', 'parent', 'parents', 'brother', 'sister', 'sibling*', 'family', 'nagging', 'nags', 'nagged', 'criticis*', 'criticiz*', 'disappointed', 'disappointment', 'lecture*', 'judgy', 'judgemental', 'judgmental'],
  phrases: [
    'my mum said', 'my mom said', 'my dad said', 'my mother said', 'my father said', 'my parents said',
    'my sister said', 'my brother said', 'my mum thinks', 'my mom thinks', 'my dad thinks', 'my parents think',
    'disappointed in me', 'always criticising', 'always criticizing', 'always criticises', 'always criticizes',
    'never good enough for them', 'compares me to my', "why can't you be more like", 'picks on me',
    'made a comment about my', 'said i was', 'told me i was',
  ],
  factPrompt: 'Just the camera view: what did they actually say? Quote the words if you can.',
  interpretationPrompt: 'What did your brain hear underneath the words?',
  commonInterpretations: [
    'They think I’m a failure',
    'I’ll never be good enough for them',
    'They love my sibling more',
    'They’re disappointed in me',
    'They always do this',
  ],
  likelyPatterns: ['mind-reading', 'always-never', 'big-label', 'should-rules', 'comparison-trap'],
  supports: [
    'They’ve said similar things many times',
    'They compared me directly to someone else',
    'They seemed genuinely let down',
    'It’s about something they’ve always had strong views on',
  ],
  against: [
    'They’ve also said proud or kind things to me',
    'This is how they talk to everyone, not just me',
    'Worry sometimes comes out of them sideways, as criticism',
    'They grew up with different expectations from mine',
  ],
  missing: [
    'What they meant, versus how it landed',
    'What worry or pressure might be behind it',
    'Whether they know how much it hurts',
    'How they’d describe their feelings about me',
  ],
  angles: [
    ['context', 'Family criticism often comes from habits, old worries, or the way they were raised. It can say as much about their history as about you.'],
    ['benign', 'They might be clumsy with worry. Sometimes “Why haven’t you…?” is a nervous way of saying “I want things to go well for you.”'],
    ['neutral', 'Their opinion is one view of you, from one particular seat.'],
    ['worry-partly-true', 'They might genuinely disapprove of this choice. You can hear that and still decide it’s your life to steer.'],
    ['not-enough-info', 'You heard the words. You don’t know exactly what was behind them unless they tell you.'],
    ['growth', 'This is a chance to practise holding your own view, even when someone you love disagrees.'],
    ['self-compassion', 'Wanting a parent’s or sibling’s approval doesn’t switch off at any age. It makes sense that this landed hard.'],
  ],
  otherEyes: [
    'If a friend’s parent said this to them, would you agree with it?',
    'What worry might be coming out as criticism? (You can only guess, not know.)',
    'What would the most supportive person in your life say about this?',
  ],
  predict: 'What do you predict will happen with them from here?',
  knowns: ['They said this', 'It hurt'],
  unknowns: ['What they really meant', 'Whether they’d say it differently if they knew how it landed', 'How the next conversation will go'],
  nextSteps: [
    ['check', 'Separate the words they said from the tone you heard. Write both down.'],
    ['talk', 'If it feels safe, try: “When you say that, it comes across as… Is that what you meant?”'],
    ['act', 'When the same topic comes up again, change the subject or step out of the room.'],
    ['care', 'Spend some time with people who see you clearly.'],
    ['wait', 'Let the sting fade before deciding how to respond.'],
    ['boundary', 'It’s okay to say: “I know you care, but I’m not discussing this today.”'],
  ],
  conversation: {
    with: 'your parent or sibling',
    openers: [
      'When you said that, it really stung. What did you mean by it?',
      'I know you care, but comments about this are hard for me to hear.',
      'Can I tell you how I’m feeling about this, without us arguing?',
    ],
    replies: [
      ['Oh, I didn’t mean it like that. I just worry about you.', 'You could say: “Thanks. It helps when you put it like that.”'],
      ['Well, it’s true though, isn’t it?', 'You could say: “We see it differently. I’d rather not keep going over it.”'],
      ['I’m sorry. I didn’t realise it upset you.', 'You could say: “Thank you for hearing me.”'],
      ['You’re too sensitive.', 'You could say: “Maybe — but it still matters to me, and I’d like you to try.”'],
    ],
    tips: [
      'Pick a calm moment, not the middle of an argument.',
      'Their reaction is theirs. You’re only saying how it lands.',
      'A boundary doesn’t need their agreement to be real.',
    ],
  },
  safetyNote: 'If criticism at home is constant or cruel, or comes with threats, control or violence, it isn’t something to reframe. You deserve support — talk to someone you trust or a support service.',
}));

DEFS.push(mk({
  id: 'money-setback',
  code: 'ms',
  title: 'A money setback',
  guide: 'zuzu',
  cameo: {
    mallow: 'loomi',
    lines: [
      'Money worry is loud. Looking at the actual numbers usually turns the volume down a notch.',
      'One setback. Breathe out. Then a list.',
    ],
  },
  contexts: ['money', 'future', 'change'],
  keywords: ['money', 'broke', 'debt', 'debts', 'overdraft', 'overdrawn', 'bill', 'bills', 'rent', 'mortgage', 'bank', 'loan', 'loans', 'savings', 'overspent', 'expensive', 'afford', 'budget', 'payday', 'paycheck', 'paycheque', 'salary', 'wages', 'repair', 'scam', 'scammed', 'owe', 'owed', 'fine'],
  phrases: [
    "can't afford", 'cannot afford', 'lost money', 'lost my savings', 'unexpected bill', 'huge bill', 'credit card',
    'in debt', 'into debt', 'ran out of money', 'running out of money', 'behind on rent', 'behind on bills',
    'late payment', 'car broke down', 'pay cut', 'lost my job', 'got scammed', 'bad investment', 'wasted money',
    'spent too much', 'money problems', 'money worries', 'bad with money', 'terrible with money',
  ],
  factPrompt: 'Just the camera view: what happened, in numbers if you can? What’s the amount, and what is it for?',
  interpretationPrompt: 'What did your brain decide this means for you?',
  commonInterpretations: [
    'I’m terrible with money',
    'I’ll never get out of this',
    'I’m going to lose everything',
    'I should have known better',
    'Everyone else has their finances sorted',
  ],
  likelyPatterns: ['big-label', 'worst-case-jump', 'future-reading', 'should-rules', 'comparison-trap'],
  supports: [
    'The amount is genuinely large for my budget',
    'It’s affecting essentials like rent, food or bills',
    'It’s part of an ongoing pattern',
    'I don’t have a cushion to absorb it',
  ],
  against: [
    'I’ve handled money setbacks before',
    'There are options I haven’t looked into yet (payment plans, support, advice)',
    'This was partly out of my control',
    'It’s a setback, not a total loss of income',
  ],
  missing: [
    'The exact numbers, all laid out in one place',
    'What help or payment options are available',
    'How long it would realistically take to recover',
    'Whether there are costs I can pause',
  ],
  angles: [
    ['context', 'Unexpected costs happen to most people, and lots of people have little or no buffer. You’re far from alone in this.'],
    ['benign', 'This might be a one-off rather than a sign of how things will always be.'],
    ['neutral', 'A money setback is a numbers problem. Numbers can be planned around, even when it’s hard.'],
    ['worry-partly-true', 'This might genuinely be serious and need real changes. Seeing that clearly is the first step to dealing with it.'],
    ['not-enough-info', 'Until the numbers are laid out, your brain fills the gaps with worst cases.'],
    ['growth', 'Getting through this could leave you with a clearer budget and more confidence for the next surprise.'],
    ['self-compassion', 'Money stress isn’t a character flaw. A lot of it comes from things nobody could fully control.'],
  ],
  otherEyes: [
    'If a friend told you about this setback, what would you suggest they do first?',
    'What might a free money adviser spot that’s hard to see from inside the worry?',
    'How might this look in six months, with a plan in place?',
  ],
  predict: 'What are you predicting will happen because of this?',
  knowns: ['I’ve lost or owe this amount', 'It’s affecting my budget'],
  unknowns: ['What options exist', 'How long recovery will take', 'What else might change'],
  nextSteps: [
    ['check', 'Write down the actual numbers: what’s coming in, what’s going out, and what’s owed.'],
    ['act', 'Make one call or search today: a payment plan, your bank, or a free advice service.'],
    ['talk', 'Tell one person you trust. Money worries shrink a little when they’re shared.'],
    ['care', 'Do one free thing that helps you feel steady.'],
    ['wait', 'Hold off on big money decisions while you’re in panic mode.'],
    ['boundary', 'It’s okay to say no to spending you can’t afford right now, even socially.'],
  ],
  conversation: {
    with: 'your bank or lender',
    openers: [
      'I’ve had an unexpected setback and I’m struggling with this payment. What are my options?',
      'Could we talk about a payment plan?',
      'I want to sort this out. Is there any support I might be eligible for?',
    ],
    replies: [
      ['We can set up a payment plan for you.', 'You could say: “Thanks. What would that look like each month?”'],
      ['There are some fees, but we may be able to waive them.', 'You could say: “That would really help. What do I need to do?”'],
      ['We can’t change this, but here’s an advice service you can contact.', 'You could say: “Thanks, I’ll get in touch with them.”'],
      ['Let me transfer you to our support team.', 'You could say: “Great, thanks.”'],
    ],
    tips: [
      'Have the numbers in front of you.',
      'Ask what options exist — they don’t always volunteer them.',
      'Write down names, dates and what was agreed.',
    ],
  },
  safetyNote: 'If money worries are leaving you without food or a safe place to stay, or feeling hopeless, please contact a free advice service or someone you trust today.',
}));

DEFS.push(mk({
  id: 'appearance-comment',
  code: 'ac',
  title: 'A comment about how I look',
  guide: 'blubi',
  cameo: {
    mallow: 'noomi',
    lines: [
      'Your body carries you through every single day. That’s its real job.',
      'One comment is one sentence. You are a whole person.',
    ],
  },
  contexts: ['body', 'self-image', 'social', 'family'],
  keywords: ['weight', 'fat', 'thin', 'skinny', 'ugly', 'looks', 'appearance', 'face', 'hair', 'skin', 'acne', 'spots', 'body', 'outfit', 'clothes', 'wearing', 'nose', 'teeth', 'chubby', 'wrinkles', 'height'],
  phrases: [
    'comment about my', 'commented on my', 'said i looked', 'said i look', 'told me i look', 'told me i looked',
    'you look tired', "you've put on weight", "you've lost weight", 'put on weight', 'about my weight', 'about my body',
    'about my appearance', 'about my looks', 'about my hair', 'about my skin', 'about my face', 'what i was wearing',
    'what i wore', 'made fun of my', 'laughed at my outfit', 'looked me up and down', 'how i look',
  ],
  factPrompt: 'Just the camera view: what exactly did they say, and where were you?',
  interpretationPrompt: 'What did your brain decide it means about how you look, or how others see you?',
  commonInterpretations: [
    'I look awful',
    'Everyone thinks I’m unattractive',
    'I need to change how I look',
    'Everyone was staring at me',
    'They were being cruel on purpose',
  ],
  likelyPatterns: ['mind-reading', 'feelings-as-proof', 'big-label', 'spotlight-on-me', 'comparison-trap'],
  supports: [
    'They’ve made comments like this before',
    'The tone felt mocking or sharp',
    'Other people reacted to it',
    'It touched on something I already feel unsure about',
  ],
  against: [
    'It was one person’s comment, not everyone’s opinion',
    'They often blurt things out without thinking',
    'Other people have said kind things about how I look',
    'It might have been meant as concern or small talk, even if it landed badly',
  ],
  missing: [
    'What they actually meant by it',
    'What anyone else thought, if they noticed at all',
    'Why they felt the need to comment',
    'Whether they’d say it again if they knew how it landed',
  ],
  angles: [
    ['context', 'Comments about appearance often say more about the speaker’s habits, worries or culture than about the person they’re aimed at.'],
    ['benign', 'They might have been clumsy, thinking out loud, or trying to make conversation.'],
    ['neutral', 'How one person describes your appearance is their opinion, from their angle, on that day.'],
    ['worry-partly-true', 'They might have been unkind. If so, that’s on them — and you’re allowed to decide their opinion doesn’t get a vote.'],
    ['not-enough-info', 'You heard one comment. You don’t know what anyone else thought, or whether they noticed at all.'],
    ['growth', 'This could be a chance to practise a calm reply, or to notice whose voices you let decide how you feel about your body.'],
    ['self-compassion', 'Appearance comments can sting for days. You don’t have to agree with them to feel the hurt.'],
  ],
  otherEyes: [
    'If someone said this to a friend of yours, would you agree with it?',
    'What might the people who love you notice about you that has nothing to do with looks?',
    'How much will this comment matter to you a year from now?',
  ],
  predict: 'What do you predict people will think of you now?',
  knowns: ['Someone commented on how I look', 'It stung'],
  unknowns: ['What they meant', 'What anyone else thought', 'Whether it’ll ever come up again'],
  nextSteps: [
    ['check', 'Write down the exact words, then separately, what your brain added to them.'],
    ['act', 'Wear something that makes you feel like yourself.'],
    ['talk', 'If you want to, say: “I’d rather you didn’t comment on my body.”'],
    ['care', 'Do something kind for your body that isn’t about changing it: a stretch, a shower, a good meal.'],
    ['wait', 'Let it sit for a day before deciding what it means.'],
    ['boundary', 'It’s okay to step back from people who keep commenting on how you look.'],
  ],
  conversation: {
    with: 'the person who said it',
    openers: [
      'You might not have meant anything by it, but comments about my body don’t feel great.',
      'Hey, can I ask what you meant by that comment earlier?',
      'I’d rather we didn’t talk about my looks.',
    ],
    replies: [
      ['Oh no, I’m sorry. I didn’t think.', 'You could say: “Thanks. I appreciate that.”'],
      ['I was just being honest!', 'You could say: “Maybe, but I’d still rather you didn’t.”'],
      ['I was worried about you, that’s all.', 'You could say: “Thanks for caring. You can just ask how I am instead.”'],
      ['It was a joke.', 'You could say: “It didn’t feel like one to me.”'],
    ],
    tips: [
      'You don’t need to explain why it hurt.',
      'Short and calm is powerful.',
      'You can set the boundary even if they don’t agree with it.',
    ],
  },
  safetyNote: 'If comments about your body are part of bullying or harassment, or you’re skipping meals or hurting yourself because of how you feel about your body, please talk to someone you trust or a doctor rather than reframing.',
}));

DEFS.push(mk({
  id: 'future-worry',
  code: 'fw',
  title: 'Worried something bad will happen',
  guide: 'zuzu',
  cameo: {
    mallow: 'loomi',
    lines: [
      'The future hasn’t happened yet. It isn’t even dressed.',
      'Worry is rehearsing for a play that might never open.',
    ],
  },
  contexts: ['future', 'health', 'work', 'change', 'sleep'],
  keywords: ['worried', 'worry', 'worrying', 'worries', 'anxious', 'nervous', 'scared', 'afraid', 'dread', 'dreading', 'terrified', 'fear', 'panic', 'panicking', 'future', 'tomorrow', 'upcoming', 'appointment', 'flight', 'moving'],
  phrases: [
    'what if', 'something bad will happen', 'something bad is going to happen', 'something will go wrong',
    "it'll go wrong", "it's going to go wrong", "it won't work out", 'going to fail', "i just know it'll",
    'worst case', 'worst-case', "can't stop worrying", 'keep worrying', "i'm scared that", "i'm worried that",
    "i'm afraid that", 'bad feeling about', 'feeling of dread', 'next week', 'coming up',
  ],
  factPrompt: 'Just the camera view: what do you actually know right now — today, not in the future? What’s coming up, and when?',
  interpretationPrompt: 'What is your brain predicting will happen?',
  commonInterpretations: [
    'It’s going to go wrong',
    'I won’t be able to cope',
    'Something terrible is coming',
    'If it goes wrong, everything will fall apart',
    'I just know it’ll be bad',
  ],
  likelyPatterns: ['future-reading', 'worst-case-jump', 'what-if-loop', 'feelings-as-proof'],
  supports: [
    'There’s a real risk here that other people have noticed too',
    'Something similar has gone wrong before',
    'Important parts of this are out of my control',
    'There are early signs of a problem',
  ],
  against: [
    'Lots of my past worries didn’t come true, or turned out smaller',
    'I’ve coped with hard things before',
    'There are steps I can take to prepare',
    'Other outcomes are possible, including okay ones',
  ],
  missing: [
    'How likely the bad outcome really is',
    'What support would be there if it happened',
    'What I’d actually do if it happened',
    'Which parts I can influence',
  ],
  angles: [
    ['context', 'Brains are built to scan for danger, so they often treat “possible” as “probable”. That’s a protective habit, not a forecast.'],
    ['benign', 'It might go better than expected, or turn out more manageable than it looks from here.'],
    ['neutral', 'Right now this is a possibility, not an event. It hasn’t happened.'],
    ['worry-partly-true', 'Something might go wrong — and that’s fair to plan for. Preparing for a bump is different from bracing for a crash.'],
    ['not-enough-info', 'The future really is unknown. That cuts both ways: it isn’t certain to go badly either.'],
    ['growth', 'If you can list what you’d do if it went wrong, the worry often loosens its grip.'],
    ['self-compassion', 'Worrying usually means you care how it turns out. You don’t have to worry perfectly, or stop worrying, to be okay.'],
  ],
  otherEyes: [
    'What would a calm friend say about the odds here?',
    'What has past-you worried about that turned out okay?',
    'If it did happen, what would future-you want present-you to have done?',
  ],
  predict: 'What exactly do you predict will happen? Write it down so you can check it later.',
  knowns: ['This thing is coming up', 'I’m worried about it'],
  unknowns: ['How it will actually turn out', 'How I’ll feel on the day', 'What help will be around'],
  nextSteps: [
    ['check', 'Write the prediction down with a 0–100 confidence score. Check it afterwards.'],
    ['act', 'Do one practical thing that would help if it did go wrong.'],
    ['care', 'Try a few slow breaths with longer out-breaths, to remind your body it isn’t happening right now.'],
    ['wait', 'Set a ten-minute worry slot for later today, and park the worry until then.'],
    ['talk', 'Tell someone what you’re worried about. Saying it out loud often shrinks it.'],
    ['boundary', 'Limit how often you check news, results or updates about it.'],
  ],
  safetyNote: 'If you’re worried something bad will happen because someone has threatened you or you’re in danger, contact emergency services or someone you trust now. If worry is constant and stopping you from living your life, a doctor can help.',
}));

DEFS.push(mk({
  id: 'past-regret',
  code: 'rg',
  title: 'Regret about a past decision',
  guide: 'zuzu',
  cameo: {
    mallow: 'noomi',
    lines: [
      'Past-you chose with past-you’s map. The map has been updated since.',
      'Regret can be a kind of love for a road you didn’t take.',
    ],
  },
  contexts: ['past', 'change', 'self-image', 'loss'],
  keywords: ['regret', 'regrets', 'regretting', 'regretted', 'decision', 'decisions', 'choice', 'choices', 'chose', 'past', 'missed', 'wasted', 'years', 'ago', 'hindsight'],
  phrases: [
    'i regret', 'i wish i had', "i wish i hadn't", 'i should have', "i shouldn't have", "should've done",
    "shouldn't have done", 'wrong decision', 'wrong choice', 'bad decision', 'if only i had', "if only i hadn't",
    'missed my chance', 'missed the chance', 'wasted years', 'wasted my time', 'go back in time', 'turned it down',
    'said no to', 'left my job', 'broke up with', 'dropped out', 'back then',
  ],
  factPrompt: 'Just the camera view: what was the decision, and when? What did you know at the time?',
  interpretationPrompt: 'What does your brain say about it now?',
  commonInterpretations: [
    'I ruined my life',
    'I should have known better',
    'I always make the wrong choice',
    'It’s too late now',
    'Everything would be better if I’d chosen differently',
  ],
  likelyPatterns: ['should-rules', 'all-or-nothing', 'always-never', 'worst-case-jump', 'only-the-bad-bit'],
  supports: [
    'The decision did have real consequences',
    'I ignored some warning signs at the time',
    'People I trusted advised against it',
    'I can see clearly now what I’d do differently',
  ],
  against: [
    'I made the best choice I could with what I knew then',
    'The other path might have had problems I can’t see',
    'Some good things came from the choice too',
    'I’ve learned things from it that matter now',
  ],
  missing: [
    'How the other path would really have turned out',
    'Which options are still open now',
    'What I’d have lost by choosing differently',
    'How much of the outcome came down to luck or timing',
  ],
  angles: [
    ['context', 'Hindsight makes past choices look obvious. At the time, you didn’t have the information you have now.'],
    ['benign', 'The road not taken might have had its own problems that you’d never get to see.'],
    ['neutral', 'A decision is something you did with the information you had. It isn’t a final verdict on you.'],
    ['worry-partly-true', 'It might have been the wrong call. You can own that and learn from it without punishing yourself forever.'],
    ['not-enough-info', 'You can’t know how the other path would have gone. Your brain is comparing real life with a perfect guess.'],
    ['growth', 'Regret can point to what you value now. What does it tell you about what you want from here?'],
    ['self-compassion', 'Past-you was doing their best with what they had. They deserve some kindness from present-you.'],
  ],
  otherEyes: [
    'If a friend had made the same choice, how would you judge them?',
    'What would someone who knew you back then say about why you chose it?',
    'Ten years from now, how might you see this decision?',
  ],
  predict: 'What do you think this decision means for your future?',
  knowns: ['I made this choice', 'It led to some outcomes I don’t like'],
  unknowns: ['How the other path would have gone', 'What’s still possible from here', 'What good might still come out of it'],
  nextSteps: [
    ['check', 'Write down what you actually knew at the time you decided.'],
    ['act', 'Find one thing you could still do now, if any part of it is still open.'],
    ['talk', 'Talk it over with someone who knew you back then.'],
    ['care', 'Write a short note to past-you, the way you’d talk to a friend.'],
    ['wait', 'Notice whether the regret gets louder at certain times — late at night, or when you’re tired.'],
    ['boundary', 'Put a limit on the replays. When it starts, call it “the old film” and change the channel.'],
  ],
  safetyNote: 'If regret is turning into thoughts of not wanting to be here, please stop here and reach out to someone right now. You deserve support.',
}));

DEFS.push(mk({
  id: 'awkward-moment',
  code: 'aw',
  title: 'Said something awkward',
  guide: 'zuzu',
  cameo: {
    mallow: 'pipzi',
    lines: [
      'Cringe attack! Code red! …Actually, code beige. Nobody else is still thinking about it!',
      'Everyone has a 3am cringe file. Yours just got a new folder!',
    ],
  },
  contexts: ['social', 'work', 'school', 'self-image'],
  keywords: ['awkward', 'cringe', 'cringey', 'cringy', 'cringing', 'cringed', 'embarrassed', 'embarrassing', 'mortified', 'blurted', 'rambled', 'overshared', 'oversharing', 'silence', 'joke', 'weird', 'presentation', 'speech', 'party'],
  phrases: [
    'said something awkward', 'said something stupid', 'said something weird', 'said something dumb',
    'said the wrong thing', 'made it awkward', 'awkward silence', 'nobody laughed', 'no one laughed',
    'joke fell flat', "joke didn't land", 'made a fool of myself', 'embarrassed myself', 'put my foot in it',
    "can't stop cringing", 'keep replaying', 'everyone stared', 'everyone was staring', 'in front of everyone',
    'tripped over my words', 'mind went blank', 'stumbled over',
  ],
  factPrompt: 'Just the camera view: what did you say, and what happened straight after?',
  interpretationPrompt: 'What did your brain decide everyone thought?',
  commonInterpretations: [
    'Everyone thinks I’m weird',
    'They’ll all remember it forever',
    'I made a fool of myself',
    'I always say the wrong thing',
    'They’re all talking about it',
  ],
  likelyPatterns: ['mind-reading', 'spotlight-on-me', 'always-never', 'big-label', 'only-the-bad-bit'],
  supports: [
    'Someone reacted awkwardly in the moment',
    'It touched on a sensitive topic',
    'It’s happened with the same people before',
    'The conversation went quiet afterwards',
  ],
  against: [
    'The conversation carried on fairly quickly',
    'Nobody has mentioned it since',
    'Other people say slightly awkward things all the time',
    'I’ve had perfectly normal chats with these people before and since',
  ],
  missing: [
    'What anyone else actually thought',
    'Whether anyone even remembers it',
    'How it looked from outside my own head',
    'Whether anyone found it funny or endearing',
  ],
  angles: [
    ['context', 'People notice our awkward moments far less than we think. Most of them are busy worrying about what they said.'],
    ['benign', 'Someone might even have found it funny, or relatable.'],
    ['neutral', 'An awkward moment is a few seconds out of a whole conversation.'],
    ['worry-partly-true', 'It might have landed a bit oddly. That’s a normal part of being around people, and it usually fades fast for everyone else.'],
    ['not-enough-info', 'You only have the replay from inside your own head. You don’t have anyone else’s.'],
    ['growth', 'This is a chance to practise letting a moment stay small instead of replaying it on a loop.'],
    ['self-compassion', 'Joining in means sometimes things come out wrong. That’s the price of taking part, and it’s worth paying.'],
  ],
  otherEyes: [
    'If someone else had said this, how long would you think about it?',
    'What would a friend who was there say about it?',
    'Will anyone, including you, remember this in a month?',
  ],
  predict: 'What do you predict people will think of you next time?',
  knowns: ['I said it', 'It felt awkward to me'],
  unknowns: ['What anyone else thought', 'Whether anyone noticed', 'Whether anyone still remembers'],
  nextSteps: [
    ['check', 'Ask yourself: has anyone actually mentioned it since?'],
    ['act', 'Do something absorbing for 20 minutes to interrupt the replay.'],
    ['talk', 'If it really matters, one light line helps: “Ha, that came out wrong earlier — what I meant was…”'],
    ['care', 'Remember three times you said exactly the right thing.'],
    ['wait', 'Give it a night. Cringe tends to fade by morning.'],
    ['boundary', 'When the replay starts again, name it — “cringe film, already seen it” — and change the channel.'],
  ],
  conversation: {
    with: 'someone who was there',
    openers: [
      'Ha, that came out wrong earlier — what I meant was…',
      'Sorry if that was a bit awkward before!',
      'Was what I said earlier okay? It felt a bit off to me.',
    ],
    replies: [
      ['What? I didn’t even notice.', 'You could say: “Ha — my brain was making a big deal of it, then.”'],
      ['It was a bit awkward, but honestly, it was funny.', 'You could say: “Glad it gave you a laugh!”'],
      ['Don’t worry, I knew what you meant.', 'You could say: “Thanks.”'],
      ['It did catch me off guard a bit.', 'You could say: “Fair enough. Sorry about that.”'],
    ],
    tips: [
      'Keep it light. A big apology makes a small thing bigger.',
      'You don’t have to say anything at all. That’s an option too.',
      'If they say they didn’t notice, you’re allowed to believe them.',
    ],
  },
  safetyNote: 'If people keep mocking you about something you said, that’s bullying, not just awkwardness. Please talk to someone you trust.',
}));

DEFS.push(mk({
  id: 'credit-promotion',
  code: 'cp',
  title: 'Someone else got the credit or promotion',
  guide: 'zuzu',
  cameo: {
    mallow: 'glitzi',
    lines: [
      'Watching someone else get the gold star. Very rude of the universe.',
      'Envy is just ambition wearing a scratchy jumper.',
    ],
  },
  contexts: ['work', 'self-image', 'future', 'conflict'],
  keywords: ['promotion', 'promoted', 'credit', 'recognition', 'recognised', 'recognized', 'award', 'praised', 'overlooked', 'colleague', 'coworker', 'co-worker', 'teammate', 'unfair', 'idea', 'ideas'],
  phrases: [
    'got the promotion', 'got promoted', 'promoted over me', 'passed over', 'passed me over', 'took credit',
    'took the credit', 'stole my idea', 'stole my work', 'got the credit', 'got all the credit', "didn't get credit",
    "didn't get the credit", 'no credit', 'no recognition', 'not recognised', 'not recognized', 'overlooked for',
    'got the raise', 'chose someone else', 'someone else got', 'my idea', 'my work',
  ],
  factPrompt: 'Just the camera view: what happened, exactly? Who got what, and how did you find out?',
  interpretationPrompt: 'What did your brain decide this means about you?',
  commonInterpretations: [
    'They don’t value me at all',
    'I’ll never get promoted here',
    'They’re better than me',
    'My work doesn’t count',
    'I should have pushed harder',
  ],
  likelyPatterns: ['comparison-trap', 'shrinking-the-good', 'future-reading', 'mind-reading', 'all-or-nothing'],
  supports: [
    'My contribution was clearly overlooked',
    'This has happened more than once',
    'The process didn’t seem open or clear',
    'They took credit for something specific that I did',
  ],
  against: [
    'They might have brought skills or experience I didn’t see',
    'I’ve had recognition here before',
    'Promotions often depend on timing and openings, not just ability',
    'My manager knows about my contribution',
  ],
  missing: [
    'How the decision was actually made',
    'What the criteria were',
    'What my manager thinks of my progress',
    'What opportunities are coming next',
  ],
  angles: [
    ['context', 'Promotions and credit often depend on timing, visibility and budget, not only on who worked hardest.'],
    ['benign', 'Your colleague might not have realised how much of the work was yours.'],
    ['neutral', 'Their win is information about this one decision. It doesn’t set a ceiling on you.'],
    ['worry-partly-true', 'It might have been unfair. If so, that’s worth raising — calmly and with specifics — rather than swallowing.'],
    ['not-enough-info', 'Without knowing how the decision was made, it’s hard to know what it says about you.'],
    ['growth', 'This could be a nudge to make your work more visible, or to ask clearly about your path.'],
    ['self-compassion', 'It’s natural to feel disappointed, or even resentful. Feeling it doesn’t make you petty.'],
  ],
  otherEyes: [
    'If a friend was passed over like this, what would you encourage them to do?',
    'What might the person who decided have been weighing? (You can’t know, but you can ask.)',
    'A year from now, what would you like to have done about this?',
  ],
  predict: 'What are you predicting this means for your future here?',
  knowns: ['Someone else got this', 'I wanted it, or contributed to it'],
  unknowns: ['How the decision was made', 'What’s next for me', 'What my manager thinks of my work'],
  nextSteps: [
    ['check', 'Write down what you contributed, as plain facts with dates.'],
    ['talk', 'Ask your manager: “What would I need to show to be considered next time?”'],
    ['act', 'Make your work visible: share an update, or name your part in a meeting.'],
    ['care', 'Vent to someone outside work before raising it at work.'],
    ['wait', 'Give the first sting a day before sending any messages.'],
    ['boundary', 'If credit keeps going missing, it’s okay to say: “I’d like my part in this to be noted.”'],
  ],
  conversation: {
    with: 'your manager',
    openers: [
      'I was disappointed not to get the role. What would I need to show next time?',
      'I did a lot of the work on that project, and I want my part to be visible. Can we talk about that?',
      'Could you walk me through how the decision was made?',
    ],
    replies: [
      ['You were a strong candidate. Next time, more leadership experience would help.', 'You could say: “That’s helpful. Could I take the lead on something soon?”'],
      ['I didn’t realise how much you did on that. Thanks for telling me.', 'You could say: “Thanks. I’ll share updates more often.”'],
      ['It was a tough call, and timing played a part.', 'You could say: “Okay. When might the next opportunity come up?”'],
      ['I don’t think you’re ready yet.', 'You could say: “Could you be specific about what ready would look like?”'],
    ],
    tips: [
      'Bring facts, not frustration.',
      'Ask what’s next, not only why.',
      'If it was unfair, keep notes of what was said.',
    ],
  },
  safetyNote: 'If you think you were passed over because of discrimination, that isn’t something to reframe. Keep records and talk to HR, a union or an employment advice service.',
}));

DEFS.push(mk({
  id: 'not-listened',
  code: 'nl',
  title: 'Interrupted or not listened to',
  guide: 'zuzu',
  cameo: {
    mallow: 'boppo',
    lines: [
      'Your voice deserves airtime! Let’s find the volume knob together!',
      'Getting cut off doesn’t cut your idea off. It’s still right there!',
    ],
  },
  contexts: ['work', 'family', 'friends', 'partner', 'conflict', 'social'],
  keywords: ['interrupt*', 'dismissed', 'dismissive', 'listen', 'listens', 'listened', 'listening', 'unheard', 'invisible', 'meeting', 'meetings', 'opinion', 'voice'],
  phrases: [
    'interrupted me', 'keeps interrupting', 'always interrupts', 'cut me off', 'cuts me off', 'talked over me',
    'talks over me', 'spoke over me', 'talking over me', "didn't listen", "doesn't listen", "don't listen",
    'not listening', 'never listens', "wasn't listened to", 'nobody listens', 'no one listens', 'ignored what i said',
    'ignored my idea', 'brushed me off', "didn't let me finish", "couldn't get a word in", 'repeated my idea',
    'nobody heard me', 'not heard',
  ],
  factPrompt: 'Just the camera view: what happened, exactly? Who said what, and where?',
  interpretationPrompt: 'What did your brain decide it means?',
  commonInterpretations: [
    'Nobody cares what I think',
    'They don’t respect me',
    'I’m invisible',
    'My ideas are worthless',
    'They always do this to me',
  ],
  likelyPatterns: ['mind-reading', 'always-never', 'big-label', 'feelings-as-proof'],
  supports: [
    'This happens often with the same person',
    'They let other people finish, but not me',
    'My idea was later repeated by someone else and praised',
    'Other people in the room noticed it too',
  ],
  against: [
    'They interrupt lots of people, not just me',
    'The conversation was fast and lively',
    'They’ve listened to me carefully at other times',
    'They came back to my point later',
  ],
  missing: [
    'Whether they noticed they’d cut me off',
    'How others in the room experienced it',
    'Whether it’s their habit or something about this moment',
    'What would happen if I asked to finish',
  ],
  angles: [
    ['context', 'Some people interrupt everyone when they’re excited, stressed, or used to fast conversations. It can be a habit before it’s a judgement.'],
    ['benign', 'They might have been jumping in with enthusiasm, not trying to shut you down.'],
    ['neutral', 'Being interrupted is about turn-taking in that moment. It doesn’t measure the worth of what you were saying.'],
    ['worry-partly-true', 'It might be a real pattern of not giving you space. That’s worth addressing, and you have every right to.'],
    ['not-enough-info', 'You know you got cut off. You don’t yet know whether they noticed, or why it happened.'],
    ['growth', 'This is a chance to practise one simple line: “Let me just finish this point.”'],
    ['self-compassion', 'Wanting to be heard is completely reasonable. It’s frustrating to have your words swept aside.'],
  ],
  otherEyes: [
    'If someone else got cut off like this, what would you think of what they were saying?',
    'What might a fair-minded person in the room have noticed?',
    'What would the most confident version of you do next time?',
  ],
  predict: 'What do you predict will happen next time you speak up?',
  knowns: ['I was interrupted or not listened to', 'It frustrated me'],
  unknowns: ['Whether they noticed', 'Why it happened', 'How they’d respond if I asked to finish'],
  nextSteps: [
    ['check', 'Check: do they do this to everyone, or mostly to me?'],
    ['act', 'Next time, try: “Hang on — let me finish this thought.”'],
    ['talk', 'Raise it privately: “I’ve noticed I sometimes get cut off. Could we make more space for each other?”'],
    ['care', 'Write down what you wanted to say. It still matters.'],
    ['wait', 'Notice how the next couple of conversations go.'],
    ['boundary', 'It’s okay to keep finishing your sentence, calmly, when someone talks over you.'],
  ],
  conversation: {
    with: 'the person who talked over you',
    openers: [
      'I got cut off a few times earlier. Could I finish my point now?',
      'Sometimes I feel a bit talked over in meetings. Could we try to give each other more space?',
      'I had more to say earlier. Can I run it by you?',
    ],
    replies: [
      ['Oh, sorry! I didn’t realise I was doing that.', 'You could say: “Thanks. I appreciate that.”'],
      ['I get excited and jump in. I’ll try to catch it.', 'You could say: “That would really help.”'],
      ['I didn’t think it was a big deal.', 'You could say: “It matters to me, so I wanted to mention it.”'],
      ['Go on, I’m listening.', 'Your move: make your point, clearly and calmly.'],
    ],
    tips: [
      'Raise it privately first, if you can.',
      'Talk about what happened, not about their character.',
      'You’re allowed to keep talking when you’re interrupted.',
    ],
  },
  safetyNote: 'If being ignored or shut down is part of being controlled, intimidated, or treated unfairly because of who you are, that isn’t something to reframe. Please talk to someone you trust.',
}));

// ---------------------------------------------------------------------------
// 6. General framework (fallback for anything unmatched)
// ---------------------------------------------------------------------------
// `patternKit` holds general angles, "doesn't quite fit" cards and a next step
// for each thinking habit. `{thought}` is filled with the person's own words
// (or "that first thought" when there are none).

const GENERAL_DEF = mk({
  id: 'general',
  code: 'gen',
  title: 'Something else on my mind',
  guide: 'zuzu',
  cameo: {
    mallow: 'loomi',
    lines: [
      'Not every thought fits in a box. That’s fine. We can still look at it from the side.',
      'Same thought, a few more windows. Let’s open one.',
    ],
  },
  contexts: CONTEXTS.slice(),
  keywords: [],
  phrases: [],
  factPrompt: 'Just the camera view: what happened, as a camera would have seen it? No commentary yet.',
  interpretationPrompt: 'And what did your brain make of it?',
  commonInterpretations: [
    'It’s all my fault',
    'Something bad is going to happen',
    'They don’t like me',
    'I’m not good enough',
    'I always mess things up',
  ],
  likelyPatterns: ['mind-reading', 'big-label', 'worst-case-jump', 'always-never'],
  supports: [
    'Something specific happened that fits the worry',
    'This has happened before in a similar way',
    'Someone I trust sees it the same way',
    'There are clear consequences I can point to',
  ],
  against: [
    'There are other times things went differently',
    'Some of the facts don’t quite fit the worry',
    'I’ve coped with something like this before',
    'Someone I trust sees it differently',
  ],
  missing: [
    'What the other people involved were thinking or dealing with',
    'How this will look in a week or a month',
    'What I haven’t been told yet',
    'What options I haven’t spotted',
  ],
  angles: [
    ['context', 'Thoughts that arrive fast and loud often come from tiredness, stress or old experiences as much as from the facts in front of you.'],
    ['benign', 'There might be a more ordinary explanation that hasn’t had a chance to come up yet.'],
    ['neutral', 'What happened and what it means are two different things. The first is fixed; the second is still open.'],
    ['worry-partly-true', 'Your worry might be partly right. If so, seeing it clearly is what lets you do something about it.'],
    ['not-enough-info', 'Right now there may not be enough information to know for sure. That’s uncomfortable, and it’s also honest.'],
    ['growth', 'Whatever the answer turns out to be, you’ve just practised slowing a thought down. That’s a skill that builds.'],
    ['self-compassion', 'This is clearly bothering you, and that makes sense. You don’t have to have it figured out tonight.'],
  ],
  otherEyes: [
    'What might a kind friend notice that you’re too close to see?',
    'If someone else involved told the story, what might they include? (You can only guess, not know.)',
    'How might you see this a year from now?',
  ],
  predict: 'What do you predict will happen?',
  knowns: ['What happened', 'How I feel about it'],
  unknowns: ['What other people were thinking', 'How it will turn out', 'What options I haven’t spotted yet'],
  nextSteps: [
    ['check', 'Check one fact you’re unsure about, instead of guessing.'],
    ['act', 'Do one small thing that helps, even a little.'],
    ['talk', 'Talk it through with someone you trust.'],
    ['care', 'Do something kind for your body: water, food, fresh air, rest.'],
    ['wait', 'Sleep on it before deciding what it means.'],
    ['boundary', 'If something or someone keeps leaving you feeling this way, it’s okay to set a limit.'],
  ],
  safetyNote: 'If this involves someone hurting or threatening you, or you thinking about hurting yourself, please don’t reframe it — reach out for support instead.',
});

const KIT = {
  'mind-reading': {
    angles: [
      ['not-enough-info', '“{thought}” is a guess about what’s going on inside someone else. Guesses can be right, and they can be wrong.'],
      ['benign', 'They might be thinking about something that has nothing to do with you.'],
    ],
    against: ['They haven’t actually said this', 'I’ve guessed what someone was thinking before and been wrong'],
    step: ['check', 'Write down what they actually said or did, and keep it separate from the guess.'],
  },
  'future-reading': {
    angles: [
      ['neutral', '“{thought}” is a forecast, not a fact. Forecasts are often wrong — even the confident ones.'],
      ['growth', 'What would you do if it went better than you expect?'],
    ],
    against: ['I’ve predicted bad things before that didn’t happen', 'There’s more than one way this could go'],
    step: ['check', 'Write the prediction down, and check it later.'],
  },
  'big-label': {
    angles: [
      ['self-compassion', '“{thought}” squashes a whole person into one word. You’re a lot more than one moment.'],
      ['neutral', 'Try swapping the label for what actually happened: “I did this” instead of “I am this”.'],
    ],
    against: ['There are times I’ve done the opposite of this label', 'People who know me wouldn’t use that word'],
    step: ['act', 'Rewrite the label as one specific action: “I made a mistake on…” rather than “I am…”.'],
  },
  'all-or-nothing': {
    angles: [
      ['neutral', 'Most things land somewhere between perfect and disaster. Where on that line is this, really?'],
      ['growth', 'What would a “partly good, partly not” version of this look like?'],
    ],
    against: ['Parts of this went okay', 'It isn’t completely one thing or the other'],
    step: ['check', 'Give it a rough score from 0 to 10, instead of pass or fail.'],
  },
  'always-never': {
    angles: [
      ['context', 'Words like “always” and “never” are powerful, but they’re rarely exactly true.'],
      ['not-enough-info', 'Can you think of even one exception? One is enough to loosen an “always”.'],
    ],
    against: ['I can think of at least one exception', 'This hasn’t happened every single time'],
    step: ['check', 'Write down one time it went differently.'],
  },
  'spotlight-on-me': {
    angles: [
      ['context', 'Lots of things shape how a situation goes. You might be one part of it, not the whole cause.'],
      ['benign', 'Other people might be busy thinking about their own stuff, not about you.'],
    ],
    against: ['Other people and circumstances were involved', 'Not everything around me is about me'],
    step: ['check', 'Sketch a quick pie chart of everything that played a part. How big is your slice, really?'],
  },
  'worst-case-jump': {
    angles: [
      ['neutral', 'The worst case is one possibility. There’s also a best case and a most-likely case.'],
      ['growth', 'If the worst did happen, what would you do first? Having a plan can make it less scary.'],
    ],
    against: ['The worst case hasn’t happened', 'There are several steps between now and that worst case'],
    step: ['check', 'Write down the worst case, the best case and the most likely case.'],
  },
  'should-rules': {
    angles: [
      ['self-compassion', '“Should” can turn a hope into a rule you’re failing. What happens if you swap it for “I’d like to”?'],
      ['context', 'Lots of “shoulds” come from other people’s timelines, not yours.'],
    ],
    against: ['This rule isn’t written down anywhere', 'People I respect don’t live by this rule'],
    step: ['act', 'Rewrite one “should” as “I’d like to…”, and notice how it feels.'],
  },
  'only-the-bad-bit': {
    angles: [
      ['neutral', 'The bad bit is real. It’s also not the only bit.'],
      ['growth', 'What else happened that you might be leaving out?'],
    ],
    against: ['There were good or neutral parts too', 'I’m focusing on one moment out of many'],
    step: ['check', 'Write down three things from the same situation that weren’t bad.'],
  },
  'feelings-as-proof': {
    angles: [
      ['self-compassion', 'The feeling is real and worth listening to. It just isn’t the same thing as proof.'],
      ['not-enough-info', 'A feeling can be strong even while the facts are still unclear.'],
    ],
    against: ['I’ve felt this strongly before and been wrong', 'The facts don’t fully match the feeling'],
    step: ['care', 'Name the feeling, then find one fact that supports it and one that doesn’t.'],
  },
  'comparison-trap': {
    angles: [
      ['context', 'You’re comparing your whole story with a small slice of theirs.'],
      ['growth', 'What does this comparison tell you that you want? That’s worth knowing.'],
    ],
    against: ['I don’t know their full story', 'I’ve made progress that doesn’t show from the outside'],
    step: ['act', 'Compare yourself with you from a year ago instead.'],
  },
  'shrinking-the-good': {
    angles: [
      ['self-compassion', 'If it had gone badly, you’d count it. So the good bit gets to count too.'],
      ['neutral', 'Luck and help can play a part, and it can still be yours.'],
    ],
    against: ['I did put effort into the good parts', 'Other people noticed the good parts'],
    step: ['act', 'Write down one good thing and let it count — no “but”.'],
  },
  'what-if-loop': {
    angles: [
      ['neutral', '“What if” questions can go on forever. Try answering one: “Then I would…”'],
      ['self-compassion', 'Your brain is trying to keep you safe. You can thank it, and still not follow every what-if.'],
    ],
    against: ['Most what-ifs never happen', 'I’ve handled surprises before'],
    step: ['wait', 'Give the what-ifs a ten-minute slot later on, and park them until then.'],
  },
};

GENERAL_DEF.patternKit = Object.fromEntries(Object.entries(KIT).map(([pid, k]) => [pid, {
  angles: kinded(`gen-${pid}-ang`, k.angles),
  against: cards(`gen-${pid}-a`, k.against),
  nextStep: { id: `gen-${pid}-n`, kind: k.step[0], text: k.step[1] },
}]));

// ---------------------------------------------------------------------------
// 7. Exports
// ---------------------------------------------------------------------------

function deepFreeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o)) deepFreeze(v);
  }
  return o;
}

/** The authored real-world scenarios (the general fallback is separate). */
export const SCENARIOS = deepFreeze(DEFS);

/** The general framework used when nothing else matches. */
export const GENERAL = deepFreeze(GENERAL_DEF);

/** Every framework, general last. */
export const ALL_FRAMEWORKS = Object.freeze([...SCENARIOS, GENERAL]);

deepFreeze(THOUGHT_PATTERNS);
deepFreeze(HARM_LEXICON);
deepFreeze(HARM_COPY);
deepFreeze(GUIDE_LINES);

const frameworkById = new Map(ALL_FRAMEWORKS.map((s) => [s.id, s]));
const patternById = new Map(THOUGHT_PATTERNS.map((p) => [p.id, p]));

/** Look up a scenario (or 'general') by id. */
export const getScenario = (id) => frameworkById.get(id) || null;

/** Look up a thinking habit by id. */
export const getPattern = (id) => patternById.get(id) || null;
