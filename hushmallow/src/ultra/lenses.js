// hushmallow Beyond (internal tier: ultra) · "Another Angle" — the optional lenses.
//
//   ZOOM OUT       pull the camera back: this moment → today → this week →
//                  this year → the whole picture, picking context lines that
//                  are true for you
//   FUTURE LENS    sort what is KNOWN from what is PREDICTED, rate how sure the
//                  prediction feels, optionally seal it to check later
//   MEANING MIXER  turn "dials" on the loudest words and choose the version
//                  that feels most accurate — including the original
//
// Everything here is authored by hand. Nothing is generated at runtime: the
// engine (reframe-engine.js) only matches these word lists and fills these
// templates with the person's own words. No line here claims to know what
// anyone else thinks, and every lens keeps "your worry might be partly right"
// and "not enough information yet" on the table.
//
// Plain ES module, no DOM, no dependencies. Works in browsers and Node.

const R = String.raw;

// ---------------------------------------------------------------------------
// 1. The lenses
// ---------------------------------------------------------------------------

/** Library order, also the tie-break order when lenses score the same. */
export const LENS_IDS = ['future', 'mixer', 'zoom'];

export const LENSES = {
  future: {
    id: 'future', name: 'Future Lens', glyph: '◐', hue: '#9f8bff',
    tagline: 'Sort what you know from what you’re predicting.',
  },
  mixer: {
    id: 'mixer', name: 'Meaning Mixer', glyph: '◍', hue: '#ff5be9',
    tagline: 'Turn the dials on the loudest words.',
  },
  zoom: {
    id: 'zoom', name: 'Zoom Out', glyph: '◎', hue: '#39f0ff',
    tagline: 'Pull the camera back from the moment.',
  },
};

/** Why a lens was suggested. `{words}` is filled with the person's own words. */
export const LENS_REASONS = {
  future: {
    pattern: 'Your thought makes a prediction. Let’s see which bits are known and which are guesses.',
    context: 'This one’s about something that hasn’t happened yet. Let’s look through the lens.',
  },
  mixer: {
    words: 'Some loud words in there — {words}. Try the dials, or keep yours.',
  },
  zoom: {
    pattern: 'Your brain zoomed right in on this. Let’s see how it looks from further back.',
    default: 'See how big this moment looks from a little further away.',
  },
};

/** Zuzu's lines for each lens. */
export const LENS_LINES = {
  offer: {
    first: 'Ooh, spare lenses! Pick one to look through — or skip. Both are fine.',
    again: 'Nice lens work. Fancy one more?',
  },
  zoom: {
    intro: 'Let’s pull the camera back. Pinch, drag upwards or use the slider.',
    moment: 'Right now it fills the whole screen. Fresh worries do that.',
    today: 'Here’s today, around it. Anything in there that went okay?',
    week: 'Wider still. Life’s usually juggling more than one thing.',
    year: 'From here it’s one dot among lots. It might still matter — let’s ask how much.',
    whole: 'The whole picture. Your moment’s still there. It’s just not the only star.',
    done: 'Same moment, more sky around it.',
  },
  future: {
    intro: 'Crystal-ball time! Sort what you know from what you’re predicting.',
    sorted: 'Look at that: the known bits up top, the guesses down in the mist.',
    rate: 'How sure does the prediction feel? There’s no right number.',
    noPrediction: 'No predictions in the mist — the known bits are carrying this one.',
    sealed: 'Sealed! Future-you can open it and see how it really went.',
    sealedSession: 'Sealed for today. It’s in your star map, not saved on this phone.',
    done: 'A forecast is a guess about tomorrow. Tomorrow still gets a say.',
  },
  mixer: {
    intro: 'These are the loud words. Turn a dial and see how the sentence changes.',
    none: 'No especially loud words here. Your sentence is already pretty plain.',
    turned: 'Does that version match what actually happened? Only you can say.',
    back: 'Back to your own words. They’re always an option.',
    kept: 'Your original stays. Sometimes the first words are the right ones.',
    mixed: 'That version’s yours now. Same situation, different words.',
  },
};

/** How sure the prediction feels → an authored response. Never steers the number. */
export const CERTAINTY_BANDS = [
  { id: 'low', max: 30, text: 'Not very sure, then. That leaves room for other endings.' },
  { id: 'middle', max: 69, text: 'Somewhere in the middle. The future’s still got a few doors open.' },
  { id: 'high', max: 89, text: 'Pretty sure. That feeling makes sense — and it’s still a forecast, not a fact.' },
  { id: 'certain', max: 100, text: 'It feels certain. That feeling is real. It just isn’t the same as knowing.' },
];

/** When a sealed prediction can be opened. */
export const SEAL_WHEN = [
  { id: 'week', label: 'In a week', days: 7 },
  { id: 'month', label: 'In a month', days: 30 },
  { id: 'after', label: 'After it happens', days: 0 },
];

/** Opening a sealed prediction later. */
export const SEAL_OUTCOMES = [
  { id: 'yes', label: 'It happened', reply: 'Thanks for checking. Your worry was onto something — and you’re still here, working it out.' },
  { id: 'partly', label: 'Partly', reply: 'Partly. The future usually lands somewhere in between.' },
  { id: 'no', label: 'It didn’t happen', reply: 'Interesting! Worth remembering next time this prediction comes knocking.' },
  { id: 'unknown', label: 'Too soon to tell', reply: 'Fair enough. It stays sealed — have another look later.' },
];

/** The scenario's cameo Mallow pops in once per lens. Fallback: Loomi. */
export const LENS_CAMEOS = {
  zoom: {
    glitzi: 'From up here your worry is the size of a sequin. Still sparkly. Still small.',
    blubi: 'Further away, it’s still allowed to hurt. It just isn’t the whole sky.',
    boppo: 'Zoom zoom! Look how much other stuff is in your life. Loads of room to bounce.',
    pipzi: 'Tiny dot! I could fit it in my pocket. I won’t. But I could.',
    loomi: 'Distance doesn’t make it vanish. It just shows its real size.',
    noomi: 'Big skies make small storms look their proper size.',
    zuzu: 'Spirals look different from far away. So do days.',
  },
  future: {
    glitzi: 'Crystal balls are mostly glitter. Pretty, yes. Accurate? Debatable.',
    blubi: 'Whatever happens, future-you won’t be on their own with it.',
    boppo: 'Predictions are just guesses wearing a serious hat!',
    pipzi: 'I predicted rain once. It was a sprinkler. Classic.',
    loomi: 'Sealed and stored. The future gets to answer for itself.',
    noomi: 'The future is a sealed letter. We only find out by getting there.',
    zuzu: 'My spirals can’t see the future either. They just spin faster when I guess.',
  },
  mixer: {
    glitzi: 'Words are outfits. Same thought, different look. You pick what fits.',
    blubi: 'Whichever words you keep, you were brave to look at them.',
    boppo: 'Turning dials is my favourite sport. Sentence remix!',
    pipzi: 'Big words, small moment? Or big words, big moment? Only you know.',
    loomi: 'The truest words aren’t always the gentlest. Choose the ones that fit.',
    noomi: 'Change one word and the whole sentence breathes differently.',
    zuzu: 'Twist, twist. Every setting is allowed — even the first one.',
  },
};

// ---------------------------------------------------------------------------
// 2. Lens selection rules
// ---------------------------------------------------------------------------
// recommendLenses() in the engine adds these up. A lens is only offered when
// it can do something: the Meaning Mixer needs at least one loud word, the
// Future Lens needs a prediction (a detected habit, a future-tense cue, or a
// future-flavoured situation). Zoom Out is always available, so it fills in.

export const LENS_RULES = {
  /** points per detected thinking habit */
  patterns: {
    future: { 'future-reading': 3, 'worst-case-jump': 2, 'what-if-loop': 2 },
    mixer: { 'big-label': 3, 'always-never': 3, 'should-rules': 3, 'all-or-nothing': 2, 'mind-reading': 1 },
    zoom: { 'only-the-bad-bit': 2, 'comparison-trap': 1, 'spotlight-on-me': 1, 'feelings-as-proof': 1 },
  },
  /** a future-tense cue in the person's own words */
  predictionCue: 3,
  /** the situation itself is about what's coming */
  futureContext: 1,
  /** each loud word the Meaning Mixer can dial (max 3) */
  mixerWord: 1,
  /** Zoom Out's base score, so it fills an empty slot */
  zoomBase: 1,
  /** minimum score for the Future Lens to be offered */
  futureMin: 2,
};

/**
 * Prediction cues: future tense, "going to", "what if"… matched against the
 * tidied text (straight apostrophes), case-insensitively.
 */
export const FUTURE_CUES = [
  R`\b(?:i|you|we|they|she|he|it|this|that|things|everyone|everybody|people|nobody|no one|my \w+)(?:'ll| will| won'?t| will not| shall)\b`,
  R`\b(?:going to|gonna)\b`,
  R`\bnever going to\b`,
  R`\bwhat if\b`,
  R`\b(?:bound to|doomed to|destined to)\b`,
  R`\bfor ever\b|\bforever\b`,
  R`\bfrom now on\b`,
  R`\bit'?s (?:too late|over)\b`,
];

// ---------------------------------------------------------------------------
// 3. Meaning Mixer lexicon
// ---------------------------------------------------------------------------
// Each entry finds one loud phrase. `options` are the other dial settings,
// in dial order, as [text, heat, number?]. Setting 0 is always the person's
// own words (heat = entry.heat). Heat is only "how heavy it sounds" for the
// meter — never a score to beat.
//
// Templates: {1}, {2} are the regex's capture groups (lower-cased unless
// "I"). `n` is grammatical number ('sg' | 'pl'): when a setting changes it,
// the next word is agreed (is → are, thinks → think…).
// Entries are listed most specific first; when matches overlap, the earlier
// and longer one wins, then list order.

const LABEL_FILLER = R`(?:so |really |just |completely |totally |such |absolutely |basically |literally |actually |a |an |such a |such an |a total |a complete |an absolute |the biggest |a massive |an utter )*`;

export const MIXER_LEXICON = [
  // --- labels: who I "am" → what happened, what I'm doing ----------------
  {
    id: 'label-job', kind: 'label', heat: 0.95,
    re: R`\bi'?m ${LABEL_FILLER}(?:terrible|awful|rubbish|useless|hopeless|bad|crap|pants|the worst) at (?:my job|my work|work)\b`,
    options: [['I’m not doing this part well yet', 0.65], ['this piece of work needs fixing', 0.5], ['I’m still learning this part', 0.35]],
  },
  {
    id: 'label-everything', kind: 'label', heat: 0.95,
    re: R`\bi'?m ${LABEL_FILLER}(?:terrible|awful|rubbish|useless|hopeless|bad|crap) at (?:everything|life|anything)\b`,
    options: [['I’m finding a lot hard right now', 0.6], ['some things feel hard at the moment', 0.45], ['I’m having a rough patch', 0.4]],
  },
  {
    id: 'label-at', kind: 'label', heat: 0.85,
    re: R`\bi'?m ${LABEL_FILLER}(?:terrible|awful|rubbish|useless|hopeless|bad|crap) at (this|that|it|school|uni|college|maths|math|exams|tests|relationships|dating|people|friendships|sport|driving|money|interviews|presentations|my course|\w+ing(?: (?:friends|up|out|people|things|money|decisions|conversations|new \w+))?)\b`,
    options: [['I’m finding {1} hard right now', 0.55], ['I’m not as good at {1} as I’d like — yet', 0.45], ['I’m still learning', 0.35]],
  },
  {
    id: 'label-feel', kind: 'label', heat: 0.85,
    re: R`\bi feel (?:like )?(?:such )?(?:a |an )?(?:complete |total )?(?:failure|idiot|fraud|loser|burden|joke|disappointment|let-?down|nobody|imposter|impostor)\b`,
    options: [['I feel low about myself right now', 0.6], ['I’m being hard on myself', 0.45], ['this feels big right now', 0.4]],
  },
  {
    id: 'label-worth', kind: 'label', heat: 0.95,
    re: R`\bi'?m ${LABEL_FILLER}(?:worthless|pathetic|a burden|burden|unlovable|unlikeable|unlikable|not good enough|not enough|too much|a disappointment|disappointment|a let-?down|an embarrassment|embarrassment|a loser|loser|boring|a nobody)\b`,
    options: [['I feel like I’m not enough right now', 0.65], ['I’m being really hard on myself', 0.45], ['I’m having a tough moment', 0.35]],
  },
  {
    id: 'label-social', kind: 'label', heat: 0.85,
    re: R`\bi'?m ${LABEL_FILLER}(?:weird|a weirdo|weirdo|annoying|awkward|cringe|cringey|odd|strange|a freak|freak)\b`,
    options: [['I’m a bit awkward sometimes', 0.6], ['I had an awkward moment', 0.45], ['I’m human', 0.3]],
  },
  {
    id: 'label-competence', kind: 'label', heat: 0.9,
    re: R`\bi'?m ${LABEL_FILLER}(?:stupid|an idiot|idiot|a failure|failure|useless|hopeless|incompetent|dumb|thick|clueless|rubbish|terrible|awful|a mess|mess|a joke|joke|a fraud|fraud|a disaster|disaster)\b`,
    options: [['I got something wrong', 0.55], ['I’m finding this hard', 0.45], ['I’m still learning', 0.3]],
  },

  // --- other people's minds: certainty → possibility -----------------------
  {
    id: 'must-hate', kind: 'certainty', heat: 0.95,
    re: R`\b(?:must|probably|definitely|obviously|clearly|surely) (?:hates?|be sick of|be fed up with|be done with) me\b`,
    options: [['might be upset with me', 0.65], ['might be upset about something else', 0.45], ['might feel any number of ways — I don’t know yet', 0.3]],
  },
  {
    id: 'must-be-cross', kind: 'certainty', heat: 0.85,
    re: R`\b(?:must|probably|definitely|obviously|clearly|surely) be (?:so |really |super )?(annoyed|angry|mad|upset|fed up|bored|sick|tired|disappointed|cross|furious) (with|at|of) me\b`,
    options: [['might be {1} {2} me', 0.6], ['might be {1} about something else', 0.45], ['might feel any number of ways — I don’t know yet', 0.3]],
  },
  {
    id: 'hates-me', kind: 'certainty', heat: 0.9,
    re: R`\b(?:hates?|can'?t stand|despises?) me\b`,
    options: [['might be upset with me', 0.6], ['might be upset about something', 0.45], ['might feel any number of ways — I don’t know yet', 0.3]],
  },
  {
    id: 'ignoring-me', kind: 'certainty', heat: 0.85,
    re: R`(?:\b(?:is|are)|'s|'re) (?:deliberately |purposely |intentionally |clearly |obviously |just |totally )?(?:ignoring|avoiding|blanking|ghosting|snubbing) me\b`,
    options: [['might be ignoring me', 0.65], ['might not have got to it yet', 0.4], ['might be caught up in something', 0.35]],
  },
  {
    id: 'doesnt-care', kind: 'certainty', heat: 0.85,
    re: R`\b(?:doesn'?t|don'?t|does not|do not) (?:really |even )?(care about|like|want|love|respect|value|rate) me\b`,
    options: [['might not {1} me as much as I’d like', 0.6], ['might {1} me more than it looks right now', 0.4], ['might be wrapped up in something else', 0.35]],
  },
  {
    id: 'thinks-im', kind: 'certainty', heat: 0.75,
    re: R`(?<!\bi (?:just |really |honestly |kind of |sort of )?)(?<!(?:'ll|'d|\bwill|\bwould|\bmight|\bmay|\bcould|\bmust|\bto|\bdo|\bdon't|\bdid|\bdidn't|\bdoes|\bdoesn't) )\b(?:thinks?|thought|believes?)(?: that)?(?= (?:i'?m|i am|i was)\b)`,
    options: [['might think', 0.55], ['may not think', 0.35]],
  },
  {
    id: 'certain', kind: 'certainty', heat: 0.75,
    re: R`\b(?:definitely|obviously|clearly|surely)\b`,
    options: [['probably', 0.6], ['maybe', 0.45], ['possibly', 0.4]],
  },
  {
    id: 'must', kind: 'certainty', heat: 0.7,
    re: R`\bmust\b(?!n'?t)`,
    options: [['might', 0.5], ['could', 0.45], ['may', 0.4]],
  },

  // --- predictions -----------------------------------------------------------
  {
    id: 'ill-never', kind: 'prediction', heat: 0.95,
    re: R`\b(?:i'?ll|i will) never\b|\bi'?m never going to\b|\bi am never going to\b`,
    options: [['I might not', 0.6], ['it might take a while to', 0.45], ['I don’t know yet whether I’ll', 0.35]],
  },
  {
    id: 'will-never', kind: 'prediction', heat: 0.9,
    re: R`\b(it|this|things|they|she|he|we|that|people|nobody|no one|everyone)(?:'ll| will) never\b`,
    options: [['{1} might not', 0.6], ['{1} may take a while to', 0.45], ['I don’t know yet whether {1} will', 0.35]],
  },
  {
    id: 'theyll-think', kind: 'prediction', heat: 0.85,
    re: R`\b(they|she|he|everyone|everybody|people|we)(?:'ll| will) (?:all )?(think|say|decide|assume|notice)\b`,
    options: [['{1} might {2}', 0.6], ['I’m worried {1} will {2}', 0.5]],
  },
  {
    id: 'never-going', kind: 'prediction', heat: 0.85,
    re: R`\bnever going to\b`,
    options: [['not necessarily going to', 0.5], ['maybe not going to', 0.45]],
  },
  {
    id: 'get-fired', kind: 'prediction', heat: 0.95,
    re: R`\bi(?:'ll| will|'m going to|'m gonna| am going to) (?:get |be )?(fired|sacked|dumped|let go|kicked out|laid off)\b`,
    options: [['I might get {1}', 0.65], ['I’m scared I’ll get {1}', 0.55], ['I don’t know yet what will happen', 0.35]],
  },
  {
    id: 'go-wrong', kind: 'prediction', heat: 0.85,
    re: R`\b(it|this|things|everything)(?:'s| is| are|'re) (?:definitely |obviously |just )?going to (go wrong|fail|be a disaster|be awful|be terrible|fall apart|end badly|be a mess)\b`,
    options: [['{1} might {2}', 0.6], ['parts of {1} might not go to plan', 0.45], ['I don’t know yet how {1} will go', 0.35]],
  },

  // --- absolutes: always / never / everyone ----------------------------------
  {
    id: 'always', kind: 'absolute', heat: 0.85,
    re: R`\balways\b`,
    options: [['often', 0.6], ['sometimes', 0.4], ['now and then', 0.3]],
  },
  {
    id: 'never', kind: 'absolute', heat: 0.85,
    re: R`\bnever\b`,
    options: [['hardly ever', 0.6], ['rarely', 0.5]],
  },
  {
    id: 'everyone-else', kind: 'absolute', heat: 0.8, n: 'sg',
    re: R`\b(?:everyone|everybody) else\b`,
    options: [['lots of other people', 0.6, 'pl'], ['some people', 0.45, 'pl'], ['the people I’m comparing myself with', 0.35, 'pl']],
  },
  {
    id: 'everyone', kind: 'absolute', heat: 0.85, n: 'sg',
    re: R`\b(?:everyone|everybody)\b`,
    options: [['lots of people', 0.6, 'pl'], ['some people', 0.45, 'pl'], ['maybe one or two people', 0.35, 'pl']],
  },
  {
    id: 'nobody', kind: 'absolute', heat: 0.85, n: 'sg',
    re: R`\b(?:nobody|no one|no-one)\b`,
    options: [['hardly anyone', 0.6, 'sg'], ['not everyone', 0.4, 'sg']],
  },
  {
    id: 'everything', kind: 'absolute', heat: 0.8, n: 'sg',
    re: R`\beverything\b`,
    options: [['a lot', 0.6, 'sg'], ['some things', 0.45, 'pl'], ['this one thing', 0.3, 'sg']],
  },
  {
    id: 'nothing', kind: 'absolute', heat: 0.8,
    re: R`\bnothing\b`,
    options: [['not much', 0.55], ['not enough', 0.5]],
  },
  {
    id: 'every-time-when', kind: 'absolute', heat: 0.8,
    re: R`\bevery (?:single )?time(?= (?:i|you|we|they|he|she|it|my|someone|people)\b)`,
    options: [['often when', 0.6], ['sometimes when', 0.45], ['now and then when', 0.35]],
  },
  {
    id: 'every-time', kind: 'absolute', heat: 0.8,
    re: R`\bevery (?:single )?time\b`,
    options: [['a lot', 0.6], ['sometimes', 0.45], ['this time', 0.3]],
  },
  {
    id: 'all-the-time', kind: 'absolute', heat: 0.75,
    re: R`\ball the time\b`,
    options: [['a lot', 0.6], ['sometimes', 0.45], ['lately', 0.4]],
  },
  {
    id: 'constantly', kind: 'absolute', heat: 0.75,
    re: R`\bconstantly\b`,
    options: [['often', 0.6], ['sometimes', 0.45]],
  },

  // --- should-rules ------------------------------------------------------------
  {
    id: 'shouldnt-have', kind: 'should', heat: 0.8,
    re: R`\bi shouldn'?t have\b`,
    options: [['I wish I hadn’t', 0.6], ['part of me wishes I hadn’t', 0.45]],
  },
  {
    id: 'should-have', kind: 'should', heat: 0.8,
    re: R`\bi (?:should have|should'?ve)\b`,
    options: [['I wish I’d', 0.6], ['I could have', 0.45], ['it might have helped if I’d', 0.35]],
  },
  {
    id: 'should', kind: 'should', heat: 0.75,
    re: R`\bi should\b(?!n'?t| have|'ve)`,
    options: [['I’d like to', 0.5], ['I’m hoping to', 0.4], ['part of me wants to', 0.35]],
  },
  {
    id: 'by-now', kind: 'should', heat: 0.7,
    re: R`\bby now\b`,
    options: [['soon', 0.5], ['one day', 0.4], ['in my own time', 0.3]],
  },

  // --- size words ----------------------------------------------------------------
  {
    id: 'ruined', kind: 'intensity', heat: 0.9,
    re: R`\b(?:completely |totally )?ruined (?:everything|it all|the whole (?:thing|day|night|evening|presentation|project|weekend|party)|my (?:life|career|future|chances|reputation))\b`,
    options: [['made things harder', 0.6], ['got part of it wrong', 0.45], ['had a bad moment', 0.35]],
  },
  {
    id: 'disaster', kind: 'intensity', heat: 0.9,
    re: R`\ba (?:complete |total |utter |absolute |massive |huge )?(?:disaster|nightmare|catastrophe|car crash)\b`,
    options: [['a real mess', 0.65], ['a bit of a mess', 0.5], ['not what I wanted', 0.35]],
  },
  {
    id: 'terrible', kind: 'intensity', heat: 0.8,
    re: R`\b(?:terrible|awful|horrible|dreadful|horrendous)\b`,
    options: [['rough', 0.6], ['not great', 0.45], ['mixed', 0.35]],
  },
];

/** Verb agreement when a dial changes grammatical number (singular → plural). */
export const AGREE_PLURAL = {
  is: 'are', was: 'were', has: 'have', does: 'do', "doesn't": "don't", 'doesnt': 'dont', "isn't": "aren't",
  "wasn't": "weren't", "hasn't": "haven't", thinks: 'think', knows: 'know', hates: 'hate', sees: 'see',
  says: 'say', likes: 'like', wants: 'want', notices: 'notice', remembers: 'remember', cares: 'care',
  finds: 'find', judges: 'judge', laughs: 'laugh', ignores: 'ignore', gets: 'get', seems: 'seem',
  looks: 'look', feels: 'feel', agrees: 'agree', believes: 'believe', goes: 'go', talks: 'talk',
  expects: 'expect', loves: 'love', needs: 'need', wins: 'win', manages: 'manage',
};

/** Words the Mixer marks as "loud" in the meter caption, by kind. */
export const MIXER_KIND_NAMES = {
  label: 'a big label', certainty: 'a certainty word', prediction: 'a prediction', absolute: 'an always/never word',
  should: 'a should-rule', intensity: 'a size word',
};

/** The meter's caption bands (how heavy the sentence sounds). */
export const HEAT_BANDS = [
  { max: 0.4, label: 'Plain' },
  { max: 0.6, label: 'Medium' },
  { max: 0.8, label: 'Heavy' },
  { max: 1, label: 'Very heavy' },
];

// ---------------------------------------------------------------------------
// 4. Zoom Out
// ---------------------------------------------------------------------------
// Five stops. At each one the person sees a question and a few first-person
// lines they can mark as true for them. Lines are never asserted, and every
// stop keeps an honest option ("it might still matter", "today's been hard").

export const ZOOM_STOPS = [
  { id: 'moment', label: 'This moment', question: 'Pinch, drag upwards or use the slider to pull the camera back.' },
  { id: 'today', label: 'Today', question: 'What’s one thing that went fine today?' },
  { id: 'week', label: 'This week', question: 'What else is going on in your life right now?' },
  { id: 'year', label: 'This year', question: 'Will this matter in a month? In a year?' },
  { id: 'whole', label: 'The whole picture', question: 'What else is part of your story?' },
];

/** Scenario context tag → Zoom Out line family. */
export const ZOOM_FAMILY = {
  work: 'work', school: 'school', friends: 'social', social: 'social', partner: 'partner', relationship: 'partner',
  family: 'family', conflict: 'family', 'self-image': 'self', body: 'self', future: 'future', change: 'future',
  money: 'future', health: 'future', sleep: 'future', past: 'past', loss: 'past',
};

export const ZOOM_LINES = {
  today: {
    universal: [
      'Something small went fine — a drink, a song, a walk',
      'I got at least one thing done',
      'Someone was kind to me, or I was kind to someone',
    ],
    honest: 'Honestly, today’s been hard all round',
    work: ['Another bit of my work went okay today'],
    school: ['I understood at least one thing today'],
    social: ['I had an easy moment with someone today'],
    partner: ['We had at least one ordinary, okay moment'],
    family: ['There was a moment at home that wasn’t tense'],
    self: ['I did one thing today I’m quietly okay with'],
    future: ['In this exact minute, things are okay enough'],
    past: ['I did something today past-me would be glad about'],
  },
  week: {
    universal: [
      'I’m tired or a bit run down',
      'There’s a lot on my plate',
      'Something else is worrying me too',
    ],
    honest: 'It’s been a fairly normal week, actually',
    work: ['Work’s been busier than usual'],
    school: ['I’ve got a lot of deadlines at once'],
    social: ['I’ve been feeling a bit low or lonely anyway'],
    partner: ['Life’s been busy or stressful for both of us'],
    family: ['There’s been extra pressure at home lately'],
    self: ['I’ve been extra hard on myself lately'],
    future: ['I’ve got a few big things coming up at once'],
    past: ['Something recently stirred this back up'],
  },
  year: {
    universal: [
      'In a month, it probably won’t feel this big',
      'I honestly can’t tell yet',
    ],
    honest: 'It might still matter — and that’s worth knowing',
    work: ['By then I’ll have done lots of other pieces of work'],
    school: ['There’ll be other marks and chances by then'],
    social: ['By then there’ll have been lots of other chats and plans'],
    partner: ['I’ll know more about what’s going on by then'],
    family: ['We’ve come back from things like this before'],
    self: ['I’ll have had lots of other days by then, good and bad'],
    future: ['By then it’ll have happened one way or another, and I’ll know more'],
    past: ['I’ve carried this a while — I can choose what to do with it now'],
  },
  whole: {
    universal: [
      'I’ve got through hard things before',
      'There are people or things I care about beyond this',
      'This is one chapter, not the whole book',
    ],
    honest: 'It’s a big deal, and it’s still only part of my life',
    work: ['I’m more than my job'],
    school: ['I’m more than one mark'],
    social: ['My worth isn’t decided by one message or one plan'],
    partner: ['I’m a whole person, inside and outside this relationship'],
    family: ['Families are complicated — mine included'],
    self: ['I’m much more than one moment or one look'],
    future: ['Whatever happens, I’ll still have things I can do'],
    past: ['I’m still writing what happens next'],
  },
};
