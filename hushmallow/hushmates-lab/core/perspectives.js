// Mallow perspective providers: where the optional fallback comes from.
//
// Human first. These run only when the owner allowed a Mallow perspective,
// nobody has caught the feeling for a while, and the relay has reserved the
// single generation this feeling may ever have. Each provider returns
//   { status: 'ok', text, mallow, source: 'ai' | 'library' | 'demo', model?, angleId? (library) }
//   { status: 'support', level? } the words need care, not a reframe
//   { status: 'unavailable', reason }
// On the Supabase backend the choice between them (AI switch, AUD caps, daily
// limits, fallbacks, honest labels) is supabase/functions/_shared/mallow.js.
//
// 1. anotherAngleProvider: Claude Account 1's Another Angle server (POST
//    /v1/angle), the AI reframe being built for the main app. It owns the
//    model call, prompt, safety gate, quality gate and spending caps; we never
//    build a second AI system. Production: called from a Hushmates server
//    function, never from a browser (the token and the person's words stay
//    server-side). Not configured in the lab by default.
// 2. libraryProvider: the main app's authored Reframe engine
//    (src/ultra/reframe-engine.js, read-only), the same offline path Another
//    Angle falls back to, plus Hushmates' own authored lines for what Reframe
//    doesn't cover (good news, grief, tiredness, decisions, belonging…). Real,
//    free, on the server. Not AI, and labelled so.
// 3. demoProvider: fixed development examples, one per Mallow personality. Shown as "Example for
//    testing, not generated", and refused outside the lab (RelayService cannedExamples).

import { matchScenarios, detectPatterns, tidyInput } from '../../src/ultra/reframe-engine.js';
import { GENERAL, SCENARIOS } from '../../src/ultra/frameworks.js';
import { screenFeeling } from './feeling-safety.js';
import { normaliseText } from './text-policy.js';
import { LABEL_IDS, MALLOW_IDS } from './relay-config.js';

// ------------------------------------------------- the authored library --
// Why it changed: the first version always took the same general line when no
// Reframe situation matched, so a grief, a driving test passed and a job
// offer all got "This is clearly bothering you". Now the feeling's label and
// words choose among (best first):
//   1. Hushmates themes: grief, missing someone, tiredness, decisions,
//      belonging, an unfair share of the load, health, exams, interviews,
//      money, overwhelm; and for good feelings: achievements, people, new
//      beginnings, small joys;
//   2. the Reframe situation the words match (likely, or a near match that
//      fits the label);
//   3. the Reframe thinking habit the words show (the lines that don't quote
//      the person back);
//   4. lines written for the label itself (every label has its own);
//   5. Reframe's general angles (heavy feelings only).
// Joy and excitement are never "reframed": they get savouring lines, not
// worry lines. The author's Mallow opens in its own voice and prefers the
// kinds of angle that fit its personality. Every sentence is written by hand;
// the only filling is the label's own word ("worried", "lonely"). Nothing
// claims to know anyone's mind, diagnoses, or insists it will all be fine.
//
// Deterministic: the same words, label, Mallow and attempt give the same
// perspective (no Math.random). `avoid` (angle ids or textHash values) steers
// away from what a person has seen lately, whenever there's an alternative.

/** Small stable string hash (FNV-1a, 32-bit). */
function fnv(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}
/** A short, stable fingerprint of a perspective's words, for `avoid` lists (never the words themselves). */
export const textHash = (text) => `tx${fnv(normaliseText(text)).toString(16).padStart(8, '0')}`;

const BRIGHT = new Set(['joy', 'excitement']);
const ADJ = { worry: 'worried', sadness: 'sad', anger: 'angry', loneliness: 'lonely', confusion: 'unsure', frustration: 'frustrated', joy: 'happy', excitement: 'excited' };

// How each Mallow opens (MALLOW_VOICES in relay-rules.js). `tender` openers are gentle enough for grief;
// `soft` ones are tender and don't assume the feeling is hard (grief told with a happy label, say).
// Grief and harm at home get only tender ones, so every Mallow has at least two (no single line, such as
// Zuzu's "sky that can hold it", opens every account of abuse). No Mallow speaks as if it were a person.
const tender = (text) => ({ text, tender: true, soft: false });
const soft = (text) => ({ text, tender: true, soft: true });
const OPENERS = {
  noomi: {
    heavy: [tender('Oh, that sounds like a lot to be holding. Let’s go gently.'), 'It makes sense to feel {adj} about this.', soft('There’s no rush with this one. Let’s just sit with it a moment.'), soft('Thank you for letting this one out into the sky.')],
    bright: ['Oh, this is lovely to hear.', 'What a soft, good thing to share.', 'This one feels warm. Let’s keep it close for a moment.'],
  },
  blubi: {
    heavy: [tender('That sounds really hard, and it’s okay that it does.'), 'Feeling {adj} about this makes a lot of sense.', soft('Whatever you’re feeling about this is allowed here.'), tender('That’s a heavy one. No need to hurry through it.')],
    bright: ['Oh, this is so nice to hear.', 'This feels warm all the way through.', 'What a lovely thing to send out into the sky.'],
  },
  pipzi: {
    heavy: ['Can we look at this together for a second, really gently?', 'Feeling {adj} is allowed. Could we peek at this from a different side?', 'Hmm, let’s get curious about this one, kindly.', soft('Oh. That’s a big feeling. Let’s be soft with it.'), tender('Oh, that sounds really hard. We can take this one slowly, together.')],
    bright: ['Wait, this is brilliant!', 'Oh! That deserves a little bounce.', 'Yes! This is the good stuff.'],
  },
  boppo: {
    heavy: [soft('You put this into words, and that takes something.'), 'Feeling {adj} doesn’t cancel out how much you’re already handling.', soft('Sharing this was a brave little step.'), 'You’re looking at this carefully, and that counts for a lot.'],
    bright: ['This is wonderful news, and it deserves a moment.', 'Oh, this is worth cheering for!', 'Yes! That’s worth a big cheer.'],
  },
  zuzu: {
    heavy: ['Let’s sit on a quiet hilltop for a moment and look at this from a little further off.', soft('Imagine this feeling as weather, and you as the big, wide sky that can hold it.'), 'Let’s turn this sideways and see what it looks like from there.', 'Picture holding this up to the light, like a strange little crystal.', soft('Let’s find a sheltered spot under a big old tree, and take this slowly.')],
    bright: ['Somewhere a tiny star just did a cartwheel.', 'Ooh, this is the kind of news that makes clouds fizz.', 'This one deserves to go in a jar, it’s shiny.'],
  },
  loomi: {
    heavy: [soft('Let’s slow this down together.'), tender('One slow breath first. Then let’s look at this steadily.'), 'Feeling {adj} makes sense. Let’s see what’s solid here.', soft('Let’s set this down for a moment and look at it calmly.')],
    bright: ['Let’s take a slow breath and really let this land.', 'This is a good moment. Let’s stay with it for a bit.', 'Lovely. No need to rush past this.'],
  },
  glitzi: {
    heavy: [soft('Okay. Not going to pretend this is nothing.'), 'Real talk, the kind sort.', 'Feeling {adj}? Fair enough. Let’s look at this straight.', tender('Honestly? That sounds really, really hard.')],
    bright: ['…Okay, fine. That’s actually lovely.', 'Well, look at that. Not bad at all.', 'Hm. Annoyingly, this is great.'],
  },
};
for (const m of Object.values(OPENERS)) for (const f of Object.keys(m)) m[f] = m[f].map((o) => (typeof o === 'string' ? { text: o, tender: false, soft: false } : o));

// The kinds of angle each Mallow reaches for first (its personality), and the kinds that suit each label.
const MALLOW_KINDS = {
  noomi: ['self-compassion', 'context', 'time', 'savour'],
  blubi: ['self-compassion', 'connection', 'benign', 'savour'],
  pipzi: ['other-eyes', 'benign', 'growth', 'savour'],
  boppo: ['agency', 'growth', 'worry-partly-true', 'savour'],
  zuzu: ['other-eyes', 'time', 'neutral', 'growth'],
  loomi: ['neutral', 'not-enough-info', 'context', 'agency'],
  glitzi: ['worry-partly-true', 'agency', 'neutral', 'not-enough-info'],
};
const LABEL_KINDS = {
  worry: ['not-enough-info', 'neutral', 'worry-partly-true', 'time', 'agency', 'context'],
  sadness: ['self-compassion', 'context', 'time', 'connection', 'support'],
  anger: ['worry-partly-true', 'agency', 'not-enough-info', 'context', 'self-compassion'],
  loneliness: ['self-compassion', 'connection', 'context', 'agency', 'neutral'],
  confusion: ['not-enough-info', 'agency', 'other-eyes', 'neutral', 'time'],
  frustration: ['worry-partly-true', 'agency', 'neutral', 'self-compassion', 'time'],
  joy: ['savour', 'connection', 'self-compassion', 'growth'],
  excitement: ['savour', 'agency', 'connection', 'neutral', 'growth'],
};

const HEAVY_LABELS = ['worry', 'sadness', 'anger', 'loneliness', 'confusion', 'frustration'];
// Hushmates themes. `cues` read the tidied, lower-cased words (straight apostrophes); `labels` are where they fit.
// The work at home, said many ways. A partner or housemate who "never helps" or "does nothing to help"
// counts however the sentence goes on; other ways of not helping ("isn't helping", "refuses to help")
// only with the job right after; he/she/they and family only with a job at home named. None of it is
// about chores when the words are about a death, harm at home, or health, mood or treatment
// (NOT_CHORES): those never get chores lines. Every phrasing below is in tests/fixtures/mallow-probes.json.
const HOME_WORDS = String.raw`(?:around the (?:house|flat|home|place)|around here|at home|the house|housework|house ?work|chores|cooking|cleaning|tidying|dishes|washing|laundry|ironing|hoover\w*|vacuum\w*|mopping|kitchen|shopping|food shop|groceries|bins|garden\w*|lawn|the dogs?|pets?|kids|children|child ?care|baby|babies|toddlers?|newborns?|twins|nappies|diapers|bedtime|bath ?time|school runs?|school forms|dinner|meals?|mental load|bills|rent|admin|paperwork|appointments)`;
// parents or family helping with rent, bills or forms is about money or support, not the work at home
const FAMILY_HOME_WORDS = HOME_WORDS.replace('|bills|rent|admin|paperwork|appointments', '');
// the jobs themselves (not just a word from home life): what rules out "your partner seems distant" for any label
const HOME_WORK = String.raw`(?:around the (?:house|flat|home|place)|housework|house ?work|chores|cooking|cleaning|tidying|dishes|washing|laundry|ironing|hoover\w*|vacuum\w*|mopping|child ?care|nappies|diapers|school runs?|mental load)`;
const NEVER_HELPS = String.raw`(?:(?:never|doesn'?t|does not|won'?t|will not|don'?t|do not) (?:ever )?help(?:s)?|do(?:es)? nothing to help)`;
const STOPPED_HELPING = String.raw`(?:hasn'?t|isn'?t|refuses to|refused to|won'?t even) (?:ever )?help(?:s|ed|ing)?`;
const NOT_HELPING = String.raw`(?:${NEVER_HELPS}|${STOPPED_HELPING})`;
const WITH_THE_JOB = String.raw`(?: me| us)?(?: out)?(?: at all| much)?(?: (?:with|around|at|in) (?:anything |everything |the |my |our )?(?:new |little |youngest |eldest |older |younger |two |three )?| )${HOME_WORDS}\b`;
const HOUSEMATE = String.raw`my (?:partner|husband|wife|boyfriend|girlfriend|fiance\w*|flatmates?|housemates?|roommates?|kids|children)`;
const HELP_AT_HOME = String.raw`(?:${HOUSEMATE} ${NEVER_HELPS}|(?:${HOUSEMATE}|he|she|they) ${STOPPED_HELPING}${WITH_THE_JOB}|(?:he|she|they) ${NEVER_HELPS}(?=\s*out\b|[^.!?;]*?\b${HOME_WORDS}\b)|(?<=\b${HOME_WORDS}\b[^.!?;]{0,80})(?:he|she|they) ${NOT_HELPING}|my (?:family|parents|mum|mom|mam|dad|brothers?|sisters?|siblings|in-laws) ${NOT_HELPING}(?:(?: me| us)? (?:out )?(?:with|around|at) (?:anything |everything |the |my |our )?${FAMILY_HOME_WORDS}\b))`;
// harm or control at home, done to the writer or someone in the family (not "I could scream"). HARM_PLAIN
// reads as harm even beside good news; HARM_LOOSE ("drinks", "so scary", "they all shouted") turns up in good
// news too, so it counts only for a heavy feeling. HARM_AT_HOME is both: the Tier 0 list, plus a few plain forms
// ("he's scary", "when he's drinking").
const CHILD = String.raw`(?:the (?:kids|children|baby|boys|girls)|(?:my|our|his|her|their) (?:kids?|children|sons?|daughters?|baby|boys?|girls?|step(?:sons?|daughters?|kids)))`;
const HARM_PLAIN = String.raw`(?:(?:hit(?:s|ting)?|smack\w*|slap\w*|punch\w*|shak(?:es?|ing)|abus(?:es|ed|ing)) ${CHILD}|(?:kick\w*|beat(?:s|ing)?) ${CHILD}(?! (?:out|off|at|to|home|in|by)\b)|(?:grab\w*|push\w*) ${CHILD} (?:by|around|about)\b|(?<!play(?:s|ing)? )(?:rough|violent|aggressive|cruel|abusive|horrible|nasty|mean) (?:with|to|towards?) ${CHILD}|takes? (?:his|her|their) (?:anger|temper) out on|calls ${CHILD} (?:useless|lazy|stupid|worthless|names|fat|ugly)|(?:scream|shout|yell)\w* at (?:me|us)|(?:get|gets|got|getting|being) (?:screamed|shouted|yelled) at|(?:he|she|they)(?:'s| is)?(?: always| still| just| constantly)?(?: keeps?(?: on)?)? (?:screams|shouts|yells|screaming|shouting|yelling)\b|swear\w* at (?:me|us)|hits? (?:me|us)|(?<!\b(?:it|this|that|what)(?: really| just| so)? )hurt(?:s|ing)? (?:me|us|my (?:mum|mom|mam|mother|dad|sister|brother)|${CHILD})|kicks? (?:me|us)|threaten\w*|(?:when|whenever|if|after) (?:he|she|they)(?:'s| is| gets?| got| has been|'s been)? (?:drunk|drinking)|(?:comes?|came|got|gets) home drunk|(?:he|she|they) drinks (?:too much|every|all|again|and)\b|break(?:s|ing)? things|smash\w* things|throw\w* (?:things|stuff|plates|cups)(?! (?:on|onto|around|all over|everywhere|in|into|down|away|out)\b)|punch\w* (?:me|us|walls?|the wall|holes|doors?)|push(?:es|ed|ing)? (?:me|us)(?! to\b)|grab\w* (?:me|us|my (?:arms?|wrists?|neck|throat|hair))(?! (?:a|an|some|the)\b)|beat\w* (?:me|us)(?! (?:to|at|why|how)\b)|(?:won'?t|doesn'?t|don'?t|will not|does not) let (?:me|us) eat|or (?:i|we) (?:don'?t|won'?t|do not) get (?:to eat|food|fed)|(?:says|tells me|calls me) (?:i'?m|im|i am) (?:so )?(?:useless|lazy|stupid|worthless|nothing|fat|ugly|crazy)|calls me (?:useless|lazy|stupid|worthless|names|fat|ugly)|puts? me down|controls? (?:what|who|where|how|when|everything)|tracks? my|goes through my|checks my phone|who i can see|eggshells|nothing without (?:him|her)|(?:scared|afraid|frightened) of (?:him|her|them|how (?:he|she|they|my \w+) treats)|tries? to take the kids|(?:he|she|they)(?:'ll| will|'s going to| is going to|'s gonna| is gonna) take the kids(?! (?:to|for|out|on|swimming|camping|fishing|shopping)\b)|take the kids (?:away|off me|from me)|controlling|(?:is|gets|got|getting|be|so|really|very) (?:violent|aggressive|possessive)|(?:he|she|they|partner|husband|wife|boyfriend|girlfriend|ex|dad|father|mum|mom|mother|stepdad|stepmum)(?:'s| is|'re| are| gets?| got| can be| can get)(?: so| really| very)? scary|scary when (?:he|she|they)|(?:his|her|their) temper|(?:he|she|they|partner|husband|wife|boyfriend|girlfriend) (?:has|has got|'s got) (?:a |such a )?(?:\w+ ){0,2}temper|(?:scared|afraid|frightened|terrified) (?:when (?:he|she|they)|of what (?:he|she|they)(?:'ll| will| might| would| could)? do)|call\w* me (?:\w+ )?names|makes? me feel (?:so |really )?(?:worthless|useless|stupid|small|like nothing)|no ?(?:one|body) else (?:would|will|could) (?:ever )?(?:want|love) me|humiliat\w* me|reads? (?:all )?my (?:messages|texts)|takes? my phone|check\w* (?:up on me|where i am)|(?:angry|mad|furious|jealous) (?:if|when|whenever) i (?:don'?t|go|see|talk|text|wear)|(?:won'?t|doesn'?t|will not|does not) let me (?:wear|go out|see my|talk to|have my own)|punish\w* me)`;
const HARM_LOOSE = String.raw`(?:screams|shouts|yells)\b|(?:he|she|they)(?: \w+)? (?:scream|shout|yell)\w*|drunk|drinks\b|(?:is|gets|got|getting|be|so|really|very) scary|(?:will|'ll|going to|gonna) take the kids`;
const HARM_AT_HOME = String.raw`(?:${HARM_PLAIN}|${HARM_LOOSE})`;
// things whose "died" is not a death ("my phone died")
const DEVICES = String.raw`(?:machine|dishwasher|hoover|vacuum|fridge|freezer|boiler|oven|cooker|kettle|dryer|microwave|car|phone|laptop|battery|tv|telly)`;
const NOT_CHORES = new RegExp(String.raw`\b(?:panic\w*|anxi\w*|depress(?!ing)\w*|mental health|my mental|homesick\w*|feel less\b(?! like\b)|(?:i|me)(?: \w+){0,3} disappear|hopeless|worthless|numb|so low|feel(?:ing)? low|(?:what(?:'?s| is) the|no|see(?:ing)? (?:the|any)) point (?:of|in) (?:anything|everything|it all|life|any of it)|(?:can'?t|cannot|don'?t|do not) see (?:a|any) way out|no way out|(?:me )?when (?:i'?m|im|i am|i feel|i get) (?:sick|unwell|ill|low|down|sad|upset|struggling|anxious|crying|overwhelmed|scared|panicking)|therap\w*|counsell?\w*|meds|medication|tablets|pills|antidepressant\w*|eating disorder|self[- ]harm\w*|suicid\w*|(?:help\w*|make\w*|made) (?:me |us )?(?:to )?(?:feel (?:any )?(?:better|okay|ok)|cope|calm (?:me )?down)|feel any better|feel safe|calm me down|emotional(?:ly)? (?:support\w*|abus\w*|neglect\w*)|griev\w*|grief|(?<!${DEVICES} )died|dying(?! (?:for|to)\b)|passed away|funeral|miscarr\w*|stillb(?:orn|irth)\w*|lost (?:the|a|our) (?:baby|pregnancy)|illness|ill\b|unwell|my (?:illness|condition|pain|recovery|health|period)|in (?:\w+ )?(?:pain|agony)|migraines?|flare[- ]?ups?|strokes?|my disab(?:ility|ilities)|(?:i'?m|i am) disabled|wheelchair|physio\w*|injur(?:y|ies|ed)|diabet\w*|insulin|hospital|operation|diagnos\w*|symptoms?|chronic|long covid|cancer|chemo\w*|surgery|rehab|(?:i'?m|im|i am|i'?ve been|i have been|i was|i got|i get|i feel|i felt)(?: (?:feeling|so|really|very|quite|too|a bit))* (?:sick|poorly|not (?:feeling )?well)\b(?! (?:of|and tired|to death|to the back teeth|paid|off)\b)|(?:don'?t|do not) feel well|heart attack|crutches|broke my (?:leg|arm|ankle|wrist|foot|hip|knee|back)|(?:hurt|injured) my back|bad back|my back is|my op|(?:my|car) accident|(?:had|got|have|caught) (?:covid|the flu|flu)|flares?|cramps|fibro\w*)\b|${HARM_AT_HOME}`);
const HARM_AT_HOME_RE = new RegExp(String.raw`\b${HARM_AT_HOME}`);
const HARM_PLAIN_RE = new RegExp(String.raw`\b${HARM_PLAIN}`);
// Tier 0 (docs/safety/TIER0_SELF_ASSESSMENT.md §3): when the words describe harm or control at home, none of
// Reframe's lines that ask the person to see the other side, read it more kindly or blame a thinking habit,
// including the ones that explain a cancelled plan, an unanswered message or being left out away.
const HARM_CROWDS = ['partner-distant', 'family-argument', 'seemed-annoyed', 'family-criticism', 'work-criticism', 'appearance-comment', 'not-listened', 'future-worry',
  'plans-cancelled', 'group-chat-ignored', 'no-text-back', 'left-out'];
// someone who may not be safe, or a loss, behind a silence: never "they're probably just busy", "group chats
// are chaos", "they might have felt rough" or "guest lists get decided by space", and no thinking habit
const SILENCE_CROWDS = ['unanswered-message', 'no-text-back', 'group-chat-ignored', 'plans-cancelled', 'seemed-annoyed', 'left-out'];
// "low" or "down" said of a person, not of the wifi, a battery or a trip to the shops
const NOT_A_PERSON = String.raw`(?:it|that|this|there|wifi|wi-fi|internet|net|network|signal|reception|phone|battery|batteries|charge|server|servers|site|website|app|system|power|electricity|price|prices|rate|rates|score|stocks?|shares?|market|sales|numbers|temperature|temp|volume|water|tide|river|sugar|pressure|tyres?|fuel|petrol|ink|supplies|wages|pay|income|profit|car|lift|elevator|line|lines|email|portal|account|bank|card|screen|tv|telly|laptop|computer)`;
const LOW_MOOD = String.raw`(?:really |so |very |pretty |quite )?(?:low|down|depressed|struggling)\b(?! (?:to|at|the|by|here|there|under|south|north|for it|on (?:petrol|fuel|stock|battery|charge|money|cash|food|milk|supplies|data|credit|gas|space|storage|ink|time))\b| ?\d|-key| key\b| (?:maintenance|priority|risk|budget|carb|fat|tide|res|resolution)\b)`;
const WELFARE_WORDS = new RegExp(String.raw`\b(?:(?<!\b${NOT_A_PERSON}(?:'s|'ve| has| have| had)? )(?:been|is|was|seems?|seemed) ${LOW_MOOD}|(?:he|she|mum|mom|mam|dad|nan|gran)'s ${LOW_MOOD}|they'?re ${LOW_MOOD}|thanks for everything|(?:nobody|no ?one) knows where|lives (?:alone|on (?:his|her|their) own)|can'?t do this any ?more|talk(?:s|ing|ed)? about being a burden|missing (?:since|overnight|all night)|(?:hasn'?t|has not|haven'?t|have not) (?:come|been) home)\b`);
// a parent or partner whose moods can't be predicted: never "faces are hard to read" or "they might have had a bad day"
const VOLATILE_WORDS = /\b(?:(?:never|don'?t|do not|can'?t|cannot) (?:ever )?(?:know|tell|predict|guess) (?:what|which|how)(?: kind of)? (?:mood|(?:he|she|they)(?:'ll| will|'s| is|'re| are)? (?:be|going to be|react|act))|what mood (?:he|she|they|my \w+)(?:'ll| will|'s| is|'re| are)? (?:be )?in|mood swings|snap(?:s|ped|ping)? at (?:me|us) (?:again|all the time|constantly|every|for no reason|over nothing|over (?:the )?(?:smallest|little|tiny))|(?:keeps?|kept|always|constantly) snapping at (?:me|us)|on edge (?:around|with|near|when) (?:him|her|them|he|she|they|my \w+)|tip[- ]?toe\w* around (?:him|her|them|my \w+)|(?:his|her|their) moods)\b/;
// a mistake that hurt someone: never "everyone makes mistakes" lines (a phone that died, or a slip in a
// hospital's paperwork, is not that)
const SERIOUS_HARM_WORDS = new RegExp(String.raw`\b(?:(?:got|was|were|been|is|are|get) (?:badly |seriously )?(?:hurt|injured|killed)|(?<!\b${DEVICES}(?:'s)?(?: \w+)? )died|killed|went missing|(?:was|were|went) lost|(?:in|into|to) (?:the )?(?:hospital|icu|intensive care|emergency|a&e)|icu|intensive care|ambulance|run over|hit by a car|wrong (?:dose|dosage|medication|medicine|meds|tablets|pills|drugs?|patient|blood)|overdos\w*|broke (?:his|her|their|my \w+'?s?) (?:arm|leg|wrist|ankle|neck|back|nose|hip|collarbone|ribs?|skull|jaw|foot|hand|finger|toe)|crashed (?:the|my|our|his|her|their|a|mum'?s|dad'?s) (?:car|ute|van|truck|bike|motorbike|motorcycle|scooter)|crashed into|(?:car|ute|van|truck|bike|motorbike|scooter|bus|train) crash(?:ed)?|(?:car|road|bike|motorbike|scooter|work|workplace|farm) accident|fell (?:and|off|from|down)|(?:a|the) patient)\b`);
// the words Reframe's own "partner seems distant" situation listens for (src/ultra/frameworks.js): a
// partner described as cold, quiet, snappy or moody (not "I get snappy"), and the other signs of distance.
// A partner on their phone is distance only when no work at home is named (PHONE_WORDS).
const PARTNER_DISTANT_WORDS = /\b(?:distant|withdrawn|far away|(?:he|she|they|partner|husband|wife|boyfriend|girlfriend)\b[^.!?;,]{0,25}?\b(?:cold|quiet|snappy|moody)|affection\w*|seems off|acting (?:off|weird|different)|pull(?:ing|ed) away|losing interest|falling out of love|doesn'?t seem interested|one-word answers|short with me|off with me|(?:barely|hardly|never|don'?t|won'?t) (?:talk|speak)\w*(?! about)|barely (?:looks|texts)\w*|not (?:talking|speaking)|cold towards? me|doesn'?t (?:want to be with|want|love) me|spare room|going to (?:leave me|break up)|drifting)\b/;
const PHONE_WORDS = /\bon (?:their|his|her) phone\b/;
// for the load theme only: distance as it shows at home (the grief rule keeps the narrower list)
const DISTANT_AT_HOME = new RegExp(String.raw`${PARTNER_DISTANT_WORDS.source}|\b(?:(?:barely|hardly) (?:says?|said|notices?|looks at) (?:a word|me)|without a word|in silence|sleeps? on the (?:sofa|couch)|never wants to spend time|(?:feels|felt) like a stranger|stopped (?:eating|sitting|spending)|(?:doesn'?t|won'?t|never) (?:kiss|hug|touch|cuddle)\w*)\b`);

// "Passed" that is a test, a year, a subject or a remark, not a death ("passed Year 12", "passed comment",
// "passed on the message"). A time or a family beside it ("passed a year ago", "the day after", "with us
// all there", "it's been hard since") is still a death. A subject is a clause's start when a verb follows
// ("since mum passed, maths has been hard").
const PASSED_SUBJECT = String.raw`(?:maths?|english|science|chemistry|physics|biology|history|geography|art|music|french|spanish|japanese|german|italian|chinese|indonesian|inspection|audit|assessment|selection|trials?|course|units?|modules?|semester|interview|first aid|rsa)(?! (?:has|have|is|was|were|feels?|felt|seems?|seemed|hasn'?t|isn'?t|wasn'?t|became|becomes|got|gets|class|classes|homework|work|life|stuff|things|just|really|and)\b)`;
const PASSED_ON_OBJECT = String.raw`(?:it|that|this|word|news|(?:the|a|an|that|this|my|his|her|their|our) (?:message|messages|news|word|info\w*|baton|torch|details|invite|invitation|note|letter|card|number|email|cold|flu|bug|virus|chance|offer|opportunity|job|role|place|deal))`;
const PASSED_NOT = String.raw`out|over|by|through|around|round|up|along|down|me|us|him|them|his|her|their|all|both|the(?! (?:day|week|month|night|morning|evening|year|weekend|same)\b)|an?(?! (?:year|week|month|day|fortnight|few|couple|while|long time|hour)\b)|it(?!'s\b| has\b| hasn'?t\b| is\b| was\b| feels?\b| just\b)|with(?! (?:us|me|family|the family|everyone|all of us|(?:his|her|their|my|our) (?:family|wife|husband|partner|kids|children|daughter|son|mum|dad)|no pain|dignity)\b)|on ${PASSED_ON_OBJECT}|years? \d+|yr \d+|levels? \d+|grades? \d+|stage \d+|probation|comments?|judge?ments?|sentence|wind|gas|muster|hsc|vce|atar|gcses?|a-levels?|${PASSED_SUBJECT}`;
const PASSED_A_TEST = String.raw`(?:tests?|exams?|driving|(?:so|really|very|super) proud|proud of (?:him|her|them))`;
const LOSS_WHEN = String.raw`(?:last|this|yesterday|today|tonight|overnight|recently|suddenly|unexpectedly|peacefully|so (?:young|suddenly|early|soon)|too (?:soon|young|early)|early|in (?:january|february|march|april|may|june|july|august|september|october|november|december|\d{4}|(?:his|her|their) sleep|hospital|the hospice|the (?:night|early hours)(?! market)|spring|summer|autumn|winter)|on (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|christmas|new year'?s|(?:his|her|their) birthday|the \d+\w*)|to (?:cancer|covid|dementia|alzheimer'?s|suicide|sepsis|mnd|motor neurone|leuk(?:a)?emia|the virus|an? (?:overdose|accident|car accident|crash|heart attack|stroke|illness|brain tumou?r|tumou?r|long illness|short illness)|(?:a |his |her |their )?(?:long |short |brave )?(?:illness|battle|fight))|(?:a|one|two|three|four|five|six|seven|eight|nine|ten|\d+|a few|a couple of|several|many) (?:days?|weeks?|months?|years?)|after (?:a (?:long|short|brief|brave|hard)|his|her|their|years|months|weeks))`;
const DEATH_NEAR = String.raw`(?:died|passed|funeral|grief|griev\w*|death|dying|hospice|palliative|cremat\w*|buried|burial|wake|eulogy|memorial|condolences|rip|rest in peace|cancer|illness|stroke|heart attack|overdose|suicide|accident|crash)`;

// health, treatment or a pregnancy: "a test on Thursday to see if the cancer is back", "another negative test"
// (not a racing heart before an exam)
const MEDICAL_WORDS = /\b(?:cancer|ivf|embryos?|fertility|ttc|trying to conceive|two[- ]week wait|2ww|hcg|doctors?|gp|biopsy|scans?|ultrasound|mri|x-?rays?|mammogram|smear|pregnan\w*|blood(?!(?:'s| is| was)? boil\w*|,? sweat)|bloods|heart(?!(?:'s| is| was| keeps| kept)? (?:racing|pounding|beating|thumping|in my (?:mouth|throat)|sank|sinks|sinking|skipp\w*|set on))|hospital|clinic|specialist|chemo\w*|tumou?rs?|lump|covid|results? from|(?:negative|positive) (?:tests?|results?|again)|tests? (?:came back |was |were |is )?(?:negative|positive)|tested (?:negative|positive))\b/;
const THEMES = [
  { id: 'loss', labels: LABEL_IDS, tender: true,
    // a death only when it is someone's: "my phone died" and "dying to see her" are not grief
    cues: [new RegExp(String.raw`\b(?:passed away|passed on(?! ${PASSED_ON_OBJECT}\b)|funeral|grief|griev\w*|bereave\w*|widow\w*|a death in the family)\b`, 'g'),
      /\b(?:mum|mom|mam|mother|dad|father|nan|nana|gran|granny|grandma|grandmother|grandad|granddad|grandpa|grandfather|brother|sister|son|daughter|husband|wife|partner|boyfriend|girlfriend|fianc\w*|friend|baby|aunt|auntie|uncle|cousin|dog|cat|pet|he|she|they|someone)\b[^.!?]{0,30}?\b(?:died|is dying|was dying|has died|(?:was|were|got|been) killed|took (?:his|her|their) own life)\b/g,
      /\b(?:mum|mom|mam|mother|dad|father|nan|nana|gran|granny|grandma|grandmother|grandad|granddad|grandpa|grandfather|brother|sister|son|daughter|husband|wife|partner|boyfriend|girlfriend|fianc\w*|friend|aunt|auntie|uncle|cousin|dog|cat|pet)'?s death\b|\bthe death of (?:my|our) (?:\w+ )?(?:mum|mom|mam|mother|dad|father|nan|nana|gran|granny|grandma|grandmother|grandad|granddad|grandpa|grandfather|brother|sister|son|daughter|husband|wife|partner|boyfriend|girlfriend|fianc\w*|friend|aunt|auntie|uncle|cousin|dog|cat|baby|pet)\b/g,
      new RegExp(String.raw`\b(?:my|our) (?:mum|mom|mam|mother|dad|father|nan|nana|gran|granny|grandma|grandmother|grandad|granddad|grandpa|grandfather|brother|sister|son|daughter|husband|wife|partner|boyfriend|girlfriend|fianc\w*|friend|aunt|auntie|uncle|cousin|dog|cat) (?:has |had |just |sadly |recently )?passed(?! (?:${PASSED_NOT}|my|our|first|1st|again|so(?! (?:suddenly|young|quickly|unexpectedly|peacefully|recently|early|fast|soon)\b))\b)(?![^.!?]*\b(?:${PASSED_A_TEST}|failed)\b)(?![^.?]*!)`, 'g'),
      /\b(?:lost|(?<!\b(?:scared|afraid|terrified|frightened|petrified|fear|worried|worry|worrying|thought|imagine|imagining|risk) (?:of |about )?|\b(?:i'?m|im|i am|we'?re|we are) )losing) (?:my|our) (?:mum|mom|mam|mother|dad|father|nan|nana|gran|granny|grandma|grandmother|grandad|granddad|grandpa|grandfather|brother|sister|son|daughter|husband|wife|partner|boyfriend|girlfriend|fianc\w*|friend|aunt|auntie|uncle|cousin|dog|cat|best friend|baby|pet)\b(?! to (?:her|his|their|another|other|someone|somebody|some)\b| because (?:i|of (?:me|my))\b)/g,
      /\b(?:(?:lost|losing) (?:his|her|their) (?:mum|mom|mam|mother|dad|father|nan|nana|gran|granny|grandma|grandmother|grandad|granddad|grandpa|grandfather|brother|sister|son|daughter|husband|wife)|we(?:'ve| have)? lost (?:mum|mom|mam|dad|nan|nana|gran|granny|grandma|grandad|granddad|grandpa))\b(?!'s)(?! to (?:her|his|their)\b)/g,
      new RegExp(String.raw`\b(?:since|after|when) (?:(?:my|our|his|her|their) )?(?:mum|mom|mam|mother|dad|father|nan|nana|gran|granny|grandma|grandmother|grandad|granddad|grandpa|grandfather|brother|sister|husband|wife) (?:has |had |just |sadly |recently )?passed\b(?! (?:${PASSED_NOT})\b)(?![^.!?]*\b${PASSED_A_TEST}\b)`, 'g'),
      new RegExp(String.raw`\b(?:since|after|when) (?:he|she|they) (?:has |had |just |sadly |recently )?passed(?: away| on)?\b(?! (?:${PASSED_NOT}|my|our)\b)(?![^.!?]*\b${PASSED_A_TEST}\b)`, 'g'),
      // "we lost her" at a clause's end, with a time or a cause, or beside a death word; not "we lost her passport"
      new RegExp(String.raw`\bwe(?:'ve| have)? lost (?:him|her)(?=\s*(?:[.,;:!?…)\n]|$)|\s+(?:and|but|so|then|too|just|already|${LOSS_WHEN})\b|[^.!?]{0,60}\b${DEATH_NEAR}\b)`, 'g'),
      /\b(?:miscarr\w*|stillb(?:orn|irth)\w*|ectopic|no heartbeat|(?:lost|(?<!\b(?:scared|afraid|terrified|frightened|petrified|fear|worried|worry|worrying|thought|imagine|imagining|risk) (?:of |about )?|\b(?:i'?m|im|i am|we'?re|we are) )losing) (?:the|a|our) (?:baby|pregnancy))\b/g],   // a pregnancy loss is a loss too
    angles: [
      ['self-compassion', 'Missing someone this much can be a measure of how much they matter. Grief doesn’t need to be tidied away or hurried along.'],
      ['context', 'Grief often comes in waves rather than a straight line. A hard day doesn’t undo the steadier ones, or mean you’re going backwards.'],
      ['connection', 'If it feels right, there might be a small way to mark this today: a quiet moment, a song, or a few words with someone who gets it.'],
      ['time', 'There’s no right amount of time for this, and no right way to feel it. However long the feeling stays, it can simply be what love looks like.'],
      ['support', 'You don’t have to carry this on your own. Talking with someone who understands, or someone who simply listens well, might help a little.'],
      ['savour', 'Laughing and grieving can sit side by side. Remembering someone with joy can be one of the ways love carries on.', ['joy', 'excitement']],
    ] },
  { id: 'missing', labels: ['sadness', 'loneliness'], notWithGrief: true,   // its lines are about distance, not death
    cues: [/\bmiss(?:ing)? (?:him|her|them|you|home|everyone|my (?:\w+ )?(?:friends?|family|mum|mom|dad|partner|boyfriend|girlfriend|husband|wife|ex|kids?|brother|sister|nan|gran|grandma|grandad))\b/g],
    angles: [
      ['self-compassion', 'Missing someone often shows how much space they hold in your life. That ache is a kind of caring.'],
      ['agency', 'Could a small thread of connection help, like an old photo, a familiar song, or a chat with someone who gets it, even if it can’t close the distance?'],
      ['time', 'Distance can make a feeling louder in the quiet moments. It might ease and swell at different times, and both are normal.'],
    ] },
  // a rift with someone close: not speaking, falling out, drifting apart (distance between people, not death)
  { id: 'rift', labels: HEAVY_LABELS, notWithGrief: true,
    cues: [/\b(?:stopped (?:talking|speaking)|(?:haven'?t|have not|hasn'?t|has not|don'?t|do not|aren'?t|are not|not been|not) (?:spoken|speaking|talked|talking)(?: (?:to|with) (?:each other|him|her|them|me|my \w+))?(?: (?:in|for) (?:weeks|months|years|a (?:while|long time|year)))|stopped (?:calling|replying to me|visiting)|fell out|falling out|fallen out|estranged|cut (?:me|him|her|them) off|cut off contact|drifted apart|grown apart|grew apart|used to be (?:so |really )?close|(?:how|what) (?:things|we|it) used to be|not on speaking terms)\b/g],
    angles: [
      ['self-compassion', 'Missing how things used to be with someone can show how much that closeness mattered. No wonder the quiet hurts.'],
      ['time', 'A silence between people who were close can hold a lot: hurt, missing, even relief. It doesn’t have to be solved today, and what it means can get clearer with time.'],
      ['agency', 'You don’t have to decide the whole relationship today. If and when it feels right, one small, kind step can be enough, and if some distance keeps you well, that’s allowed too.'],
      ['neutral', 'Missing someone and still feeling hurt by them can sit side by side. Neither feeling has to win for both to be real.'],
      ['other-eyes', 'If a good friend were in your place, you might tell them that wanting things to be better says something kind about them. That could be true for you as well.'],
    ] },
  { id: 'care-for', labels: ['worry', 'sadness'],
    cues: [/\b(?:worr\w* about|scared for|afraid for|frightened for|something (?:bad )?(?:will|might|is going to) happen to) (?:him|her|them|(?:my|our) (?:mum|mom|mam|mother|dad|father|nan|gran|grandma|grandad|brother|sister|son|daughter|husband|wife|partner|friend|baby|kids?|parents?|family|dog|cat|pet))\b/g,
      /\b(?:getting old(?:er)?|getting frail|not getting any younger)\b/g],
    angles: [
      ['self-compassion', 'Worrying about someone you love can be love looking ahead. It makes sense that it shows up like this.'],
      ['agency', 'Maybe some of that care could go into today: time together, a call, or a small thing that would make them smile.'],
      ['not-enough-info', 'Nobody can see exactly how things will go. If something about them is worrying you, it’s okay to check in with them, and to lean on someone for support too.'],
    ] },
  { id: 'tired', labels: HEAVY_LABELS, notWithGrief: true,
    cues: [/\b(?:tired|exhausted|drained|worn out|burn(?:ed|t) out|burnout|no energy|knackered|can'?t sleep|cannot sleep|haven'?t slept|not sleeping)\b/g,
      /\b(?:feel(?:ing|s)?|felt) (?:so |really |a bit |kind of |pretty )?(?:flat|empty|numb|shattered)\b/g],
    angles: [
      ['context', 'Being worn out can make everything feel heavier and harder to hold. It’s okay to go easy on yourself, and on big conclusions, while you’re this tired.'],
      ['self-compassion', 'Feeling flat after a long stretch isn’t a failing. It might be your body and mind asking for a gentler pace for a while.'],
      ['agency', 'Could one small kindness for your body help a little today: water, a warm drink, some fresh air, or a rest?'],
      ['support', 'If it’s been going on for a while, it could be worth talking it over with someone you trust, or a doctor. You don’t need a big reason to ask.'],
    ] },
  { id: 'decision', labels: ['confusion', 'worry', 'frustration', 'excitement'],
    cues: [/\b(?:should i|can'?t decide|cannot decide|don'?t know (?:if|whether|what to do|which)|not sure (?:if|whether|what to do)|torn between|choose between|deciding between|stay or (?:go|leave)|or stay)\b/g],
    angles: [
      ['neutral', 'Feeling torn can mean a lot is riding on this, and that’s heavy to hold on your own. It’s okay not to have the answer yet.'],
      ['agency', 'Not every choice needs the whole answer today. Maybe one smaller question, answered first, would make the next one clearer.'],
      ['other-eyes', 'Imagine someone kind, who knows you well, hearing all of this. What might they say matters most to you here?'],
      ['worry-partly-true', 'There may not be a perfect option here. It’s okay to take your time, and to talk it through with someone you trust before you choose.'],
    ] },
  { id: 'belonging', labels: ['loneliness', 'sadness', 'worry'],
    cues: [/\b(?:fit in|fitting in|no friends|have friends|making friends|make friends|everyone (?:else )?(?:has|seems)|by myself|on my own|no ?one to talk to|nobody to talk to|alone|new (?:city|town|school|uni|place|country)|moved (?:here|away|to))\b/g],
    angles: [
      ['context', 'From the outside, other people’s friendships can look ready-made and easy. Lots of them were built slowly, through small repeated moments.'],
      ['benign', 'Some of the people around you might feel more on the outside than they show. Loneliness is often more common than it looks, just quieter.'],
      ['agency', 'Could there be one small, low-pressure way to be around people this week, where an activity does most of the talking?'],
      ['self-compassion', 'Wanting to belong isn’t too much to ask. It’s one of the most human things there is.'],
    ] },
  // an unfair share of the work at home (see HELP_AT_HOME). Never with a loss, harm or health in the words.
  // A partner who never helps at home isn't a partner who's distant, so the work at home rules that
  // situation out, unless the words describe distance too.
  { id: 'load', labels: ['frustration', 'anger', 'sadness'], notWithGrief: true, skipWhen: NOT_CHORES,
    crowds: { ids: ['partner-distant'], unless: DISTANT_AT_HOME, unlessNoHits: PHONE_WORDS,
      // for a label these lines don't serve: when the words name home life (unless they describe distance)
      home: new RegExp(String.raw`\b(?:${HELP_AT_HOME}|${HOME_WORDS}|washing up|clean(?:ing|s)? up|tidy(?:ing)? up|pull(?:ing)? (?:their|his|her) weight)\b`),
      near: new RegExp(String.raw`\b${HOME_WORDS}\b`) },
    cues: [new RegExp(String.raw`\b(?:flatmates?|housemates?|roommates?|chores|housework|house ?work|washing up|the dishes|the laundry|clean(?:ing|s)? up|tidy(?:ing)? up|do(?:ing)? everything|always end up (?:doing|cleaning|tidying|washing|paying|picking up)|nobody helps|no ?one helps|${HELP_AT_HOME}|does nothing (?:around (?:here|the (?:house|flat|home|place))|at home)|all the (?:cooking|cleaning|chores|housework|washing|laundry)|pull(?:ing)? (?:their|his|her) weight)\b`, 'g')],
    angles: [
      ['worry-partly-true', 'This feeling might be pointing at something real: the load doesn’t feel shared. If it feels safe to, that’s worth saying out loud, kindly and plainly.'],
      ['benign', 'Sometimes people don’t notice a job until it stops getting done. That doesn’t make it fair, but it might mean it’s more fixable than it feels.'],
      ['agency', 'If it feels okay to ask, could there be one specific thing, like a roster or a single job that’s theirs, rather than a general plea for help?'],
      ['self-compassion', 'Being the one who always notices what needs doing is tiring. It makes sense that you’ve had enough.'],
    ] },
  { id: 'health', labels: ['worry', 'sadness', 'confusion', 'frustration'], notWithGrief: true,
    cues: [/\b(?:doctors?|gp|hospital|scan|test results|blood tests?|symptoms?|lump|biopsy|diagnos\w*|unwell|operation|surgery|my health|cancer|chemo\w*|palliative)\b/g],
    angles: [
      ['not-enough-info', 'Health worries, yours or someone else’s, can send the mind racing ahead. Whatever you know so far, it’s okay to take this one small step at a time.'],
      ['agency', 'If there’s an appointment coming up, it might help to jot down your questions first, so some of this has somewhere to go.'],
      ['self-compassion', 'Taking a health worry seriously is a way of caring. Being shaken by it is understandable.'],
      ['support', 'You don’t have to hold this on your own. Telling one person you trust could make it a little lighter.'],
    ] },
  // a test about health or a pregnancy is never an exam, wherever in the words that shows (MEDICAL_WORDS)
  { id: 'exam', labels: ['worry', 'frustration', 'sadness', 'confusion'], notWithGrief: true, skipWhen: MEDICAL_WORDS,
    cues: [/\b(?:exams?|results day|finals|grades?|mocks|mock (?:exams?|tests?|papers?))\b/g, /\b(?<!\b(?:blood|pregnancy|covid|rat|pcr|medical|eye|hearing|smear|cervical|hiv|sti|genetic|allergy|lab|drug|urine|heart|breath|liver|kidney|glucose|diabetes) )tests? (?:tomorrow|today|on|next|this)\b/g],
    // after the result, lines about nerves and preparation don't fit
    notWhen: { re: /\b(?:failed|fail|results?|didn'?t pass|grades?|marks?|negative|positive)\b/, ids: ['hm-exam-1', 'hm-exam-3'] },
    angles: [
      ['context', 'Nerves before a test can be a sign you care how it goes, rather than a forecast of how it will go.'],
      ['neutral', 'One exam measures one day’s work on one set of questions. It isn’t a measure of you, or of everything you’ll do next.'],
      ['agency', 'Maybe the next step isn’t to feel ready, just to do one small, specific piece of preparation and then rest.'],
    ] },
  { id: 'study', labels: ['worry', 'frustration', 'sadness', 'confusion'],
    cues: [/\b(?:revision|revis(?:e|ing)|assignments?|essays?|coursework|dissertation|homework|studying|procrastinat\w*|deadlines?)\b/g],
    angles: [
      ['self-compassion', 'Getting work done while stressed is harder than it looks from the outside. Doing some of it, imperfectly, still counts.'],
      ['context', 'Putting things off often has more to do with how big a task feels than with how much you care.'],
      ['agency', 'Could you shrink the first step to something tiny, like ten minutes or one paragraph, and stop there if you want to?'],
    ] },
  { id: 'trying', labels: ['frustration', 'sadness', 'worry'], notWithGrief: true,
    cues: [/\b(?:trying|tried|practis\w*|practic\w*|learning|still bad|can'?t get (?:it|the hang)|keeps? (?:breaking|failing|going wrong|crashing))\b/g],
    angles: [
      ['neutral', 'You might be trying hard at something that’s genuinely hard. That isn’t the same as getting it wrong.'],
      ['growth', 'Feeling stuck after trying this hard is exhausting, and it isn’t a sign you’ve failed. Some things need more than effort alone, and that’s okay.'],
      ['agency', 'Could someone you trust look at this with you, or help you think through the next step? You don’t have to get unstuck alone.'],
    ] },
  { id: 'rejection', labels: ['sadness', 'frustration', 'worry', 'anger', 'confusion'], notWithGrief: true,
    cues: [/\b(?:didn'?t get (?:in|into|the job|the role|the place|picked|chosen|selected|accepted)|turned down|unsuccessful|rejection (?:letter|email)|application|applied)\b/g],
    angles: [
      ['neutral', 'A no from one place is a decision about one application at one moment. It isn’t a verdict on you.'],
      ['self-compassion', 'A hurt this sharp often means you let yourself hope, and hoping took courage.'],
      ['agency', 'When you’re ready, it might help to look at what’s still open, rather than only at what closed.'],
    ] },
  { id: 'perform', labels: ['worry', 'excitement', 'confusion'], notWithGrief: true,
    cues: [/\b(?:interviews?|presentation|first day|audition|speech|pitch|public speaking)\b/g,
      /\bstart(?:ing)? (?:a |my )?(?:new )?(?:job|role)\b/g],
    angles: [
      ['benign', 'The people on the other side of the table often want it to go well too. The room might be more on your side than it feels.'],
      ['context', 'Nerves before a big moment are very normal. They can feel loud in the body without meaning it will go badly.'],
      ['neutral', 'It doesn’t have to go perfectly to go well. A couple of wobbly moments rarely decide the whole thing.'],
      ['agency', 'Could you picture the first two minutes going okay? Having just the opening ready can make the rest feel steadier.'],
    ] },
  { id: 'money', labels: ['worry', 'frustration', 'sadness', 'confusion', 'anger'],
    cues: [/\b(?:rent|bills|(?:the|a|phone|power|electricity|gas|water|energy|credit card) bill|money|debts?|overdraft|afford|payday|skint|budget|savings|mortgage)\b/g, /\b(?:i'?m|am|so) broke\b/g],
    angles: [
      ['agency', 'Money worries can feel even heavier in a fog. Writing down what’s due and when might make the next step a little easier to see.'],
      ['self-compassion', 'Being stretched for money is stressful, and it says nothing about your worth. It happens to all sorts of people, for all sorts of reasons.'],
      ['support', 'If money keeps feeling tight, or scary, a free financial counsellor could help you sort out the next steps, without judgement.'],
    ] },
  { id: 'overwhelm', labels: ['worry', 'frustration', 'confusion', 'sadness'],
    cues: [/\b(?:overwhelm\w*|too much (?:to do|on|going on)|so much to do|can'?t keep up|everything at once|all at once|swamped|snowed under)\b/g],
    angles: [
      ['context', 'When everything arrives at once it can feel like one giant thing. It might really be several smaller things that only look joined up right now.'],
      ['agency', 'Could you pick just the next small piece, and give yourself permission to leave the rest for later?'],
      ['self-compassion', 'Feeling overwhelmed can mean you’re carrying a lot, not that you’re handling it badly.'],
    ] },
  { id: 'achievement', labels: ['joy', 'excitement'],
    cues: [/\b(?:passed|accepted|promot\w*|graduat\w*|finished|finally|did it|won|nailed|achiev\w*|proud)\b/g,
      /\bgot (?:the|a|my|in|into|accepted|promoted|offered|through)\b/g],
    angles: [
      ['self-compassion', 'This sounds like it took real effort. It’s worth letting it count, without rushing on to the next thing.'],
      ['growth', 'Maybe notice what helped you get here. That’s something you get to take with you into whatever comes next.'],
      ['savour', 'Good news can be oddly easy to skip past. What if you let yourself enjoy this one properly today?'],
    ] },
  { id: 'together', labels: ['joy'],
    cues: [/\b(?:friends?|family|mum|mom|dad|partner|boyfriend|girlfriend|husband|wife|kids?|laugh\w*|together|reunion|hugs?|hugged|visit\w*|date|wedding|party|birthday)\b/g],
    angles: [
      ['savour', 'Moments like this are worth keeping somewhere. Which part of it would you most like to remember?'],
      ['connection', 'If someone helped make this lovely, it could be worth telling them. Good feelings often grow when they’re shared.'],
      ['savour', 'Time with people who feel easy is a real kind of nourishment. It’s okay to soak it up.'],
    ] },
  { id: 'begin', labels: ['excitement'],
    cues: [/\b(?:start(?:ing)?|moving|trip|travel\w*|holiday|abroad|first|can'?t wait|next (?:week|month|year)|this (?:weekend|summer)|tomorrow|soon|adventure|gig|festival|concert)\b/g],
    angles: [
      ['neutral', 'Excitement and nerves often travel together, because both mean it matters. You don’t have to pick just one.'],
      ['savour', 'The looking-forward part is part of the good bit too. Plan whatever helps you feel ready, and let the rest wait.'],
      ['agency', 'What’s one small thing you could do to get ready that would also feel like a treat?'],
    ] },
  { id: 'small-joys', labels: ['joy'],
    cues: [/\b(?:sun|sunny|sunshine|beach|walk|garden|coffee|music|song|concert|book|puppy|kitten|weekend|rest|cosy|cozy)\b/g],
    angles: [
      ['savour', 'Small, ordinary good things count too. Noticing them is a quiet skill, and it’s a lovely one.'],
      ['savour', 'Moments like this can be little anchors. It might be nice to come back to this one on a harder day.'],
    ] },
];

// Lines written for each label, so every feeling has something that fits its emotion.
const LABEL_LINES = {
  worry: [
    ['context', 'Worry tends to speak in what-ifs. Some are guesses, and some are worth listening to, especially when they’re about your safety.'],
    ['not-enough-info', 'You might not have enough information yet to know how this goes. That gap is uncomfortable, and it isn’t the same as bad news.'],
    ['worry-partly-true', 'Your worry could be partly right, and that’s okay to admit. If it is, noticing it early gives you more time to act.'],
    ['agency', 'Maybe split this into two piles: the parts you can do something about, and the parts you might want some help with.'],
    ['self-compassion', 'Worrying about this suggests it matters to you. You don’t have to talk yourself out of caring.'],
    ['time', 'Think of another time something felt this big. What helped you get through it, even a little?'],
  ],
  sadness: [
    ['self-compassion', 'Sadness doesn’t always need fixing. Sometimes it just needs room, and a bit of company.'],
    ['context', 'Feeling this low can make everything look grey at once. It might help to go gently today, and leave big decisions for later.'],
    ['self-compassion', 'It might hurt this much because something here really mattered to you. That caring is worth honouring, even while it aches.'],
    ['agency', 'Is there one small comfort within reach right now? A warm drink, a short walk, or a message to someone who feels safe.'],
    ['time', 'Heavy feelings can shift, even when it seems like they won’t. Today doesn’t have to decide how next week feels.'],
  ],
  anger: [
    ['worry-partly-true', 'Your anger might be pointing at something that really wasn’t fair. It’s worth listening to before deciding what to do with it.'],
    ['agency', 'What would a fair outcome look like here? Knowing that can help you work out what you need next.'],
    ['time', 'Anger often gets clearer once it has cooled a little. You don’t owe anyone a quick reply, and there’s no rush to decide what to do with it.'],
    ['context', 'Sometimes anger shows up on top of hurt or tiredness. It could be worth asking what else is underneath it.'],
    ['not-enough-info', 'You don’t need the whole story of why it happened for your anger to count. It’s okay to start with what you need.'],
  ],
  loneliness: [
    ['self-compassion', 'Feeling lonely isn’t a sign that something is wrong with you. It’s a signal that you need connection, and that’s a very human need.'],
    ['context', 'Loneliness can be loud and convincing, telling you everyone else is fine. Plenty of people feel it quietly, more often than they say.'],
    ['agency', 'Could you reach out to one person, in a small way that feels safe? A quick hello can open a door without asking much of anyone.'],
    ['neutral', 'Being alone right now and being alone for good are different things. This might be a season, not the whole story.'],
    ['connection', 'Sending this feeling out is its own kind of reaching out. That part of you, the part that reaches, is worth trusting.'],
  ],
  confusion: [
    ['not-enough-info', 'Not knowing yet is allowed. Clarity often arrives after a few small steps, rather than before them.'],
    ['agency', 'Could you write down the one question that matters most right now, and leave the rest for later?'],
    ['neutral', 'Mixed feelings can sit side by side without one of them being wrong. Both might be telling you something useful.'],
    ['context', 'Feeling muddled can be a sign that something is changing. Things often look tangled in the middle of a change.'],
    ['other-eyes', 'If a friend described this exact situation to you, what might you notice for them that’s harder to see from the inside?'],
  ],
  frustration: [
    ['worry-partly-true', 'Frustration often shows up when you care and feel stuck. It might be a sign that something really does need to change.'],
    ['agency', 'Is there one part of this you can move, even slightly, today? A small shift can loosen the stuck feeling.'],
    ['context', 'Some things really are outside your control, and running into them again and again is wearing. Being fed up with that makes sense.'],
    ['time', 'Stepping away for a bit isn’t giving up. Sometimes the way through is easier to spot after a pause.'],
    ['self-compassion', 'You can be annoyed and still be kind to yourself. Both can happen on the same day.'],
  ],
  joy: [
    ['savour', 'This sounds worth slowing down for. Which part of it felt best?'],
    ['self-compassion', 'Good moments can slip past faster than hard ones. It’s okay to let this one count, fully, with no “but”.'],
    ['growth', 'Maybe notice what helped make this happen, whether it was you, someone else or a bit of both. It could be worth coming back to.'],
    ['connection', 'Joy often grows a little when it’s shared. Is there someone who’d love to hear about this?'],
    ['savour', 'You could keep a small note of this somewhere, so a harder day has something bright to find.'],
  ],
  excitement: [
    ['savour', 'Excitement means something here matters to you. It’s okay to let it be big.'],
    ['neutral', 'Nerves and excitement can feel almost the same in the body. If a flutter of worry turns up too, it might just be part of caring.'],
    ['agency', 'What would a small first step look like? Doing one tiny thing can give the excitement somewhere to land.'],
    ['neutral', 'It doesn’t have to go perfectly to be wonderful. Leave a little room for it to surprise you.'],
    ['connection', 'Is there someone you’d love to tell? Excitement often gets even better when someone gets excited with you.'],
  ],
  none: [
    ['self-compassion', 'Whatever this is, it’s okay that it’s on your mind. You don’t have to have it all worked out right now.'],
    ['other-eyes', 'If someone kind were reading this with you, what might they notice that’s harder to see from the inside?'],
    ['agency', 'Is there one small, kind thing you could do for yourself while this settles?'],
  ],
};

// an optional third column limits a line to some labels
const withIds = (prefix, rows) => rows.map(([kind, text, only], i) => ({ id: `${prefix}-${i + 1}`, kind, text, ...(only ? { only } : {}) }));
for (const t of THEMES) t.angles = withIds(`hm-${t.id}`, t.angles);
for (const k of Object.keys(LABEL_LINES)) LABEL_LINES[k] = withIds(k === 'none' ? 'hm-any' : `hm-${k}`, LABEL_LINES[k]);

// Which Reframe situations fit which labels, for near matches (a single strong match is used for any heavy label).
const SCENARIO_LABELS = {
  'unanswered-message': ['worry', 'sadness', 'loneliness', 'confusion', 'frustration'],
  'work-criticism': ['worry', 'sadness', 'anger', 'frustration'],
  'left-out': ['sadness', 'loneliness', 'anger', 'worry'],
  'partner-distant': ['worry', 'sadness', 'loneliness', 'confusion'],
  'mistake-judged': ['worry', 'sadness', 'frustration', 'confusion'],
  'job-rejection': ['sadness', 'frustration', 'worry', 'anger'],
  'plans-cancelled': ['sadness', 'loneliness', 'frustration', 'anger'],
  'social-comparison': ['sadness', 'worry', 'frustration', 'loneliness'],
  'family-argument': ['anger', 'sadness', 'frustration', 'worry', 'confusion'],
  'group-chat-ignored': ['loneliness', 'sadness', 'worry', 'frustration'],
  'seemed-annoyed': ['worry', 'confusion', 'sadness'],
  'performance-review': ['worry', 'sadness', 'frustration', 'anger'],
  'bad-grade': ['sadness', 'worry', 'frustration'],
  'no-text-back': ['worry', 'sadness', 'loneliness', 'confusion'],
  'family-criticism': ['sadness', 'anger', 'frustration'],
  'money-setback': ['worry', 'frustration', 'sadness', 'confusion'],
  'appearance-comment': ['sadness', 'anger', 'worry'],
  'future-worry': ['worry', 'confusion'],
  'past-regret': ['sadness', 'confusion', 'frustration', 'worry'],
  'awkward-moment': ['worry', 'sadness', 'confusion'],
  'credit-promotion': ['anger', 'frustration', 'sadness'],
  'not-listened': ['anger', 'frustration', 'sadness', 'loneliness'],
};
// Reframe lines Hushmates leaves out: they refer to Reframe's own steps, sound certain ("clearly"),
// state other people's minds as fact, or offer a silver lining for a hurt.
const SKIP = new Set([
  'gen-ang6', 'gen-ang7', 'aw-ang1', 'pd-ang1', 'nt-ang4',
  // Tier 0 (docs/safety/TIER0_SELF_ASSESSMENT.md §3): left out because, in the contexts they can reach,
  // they excuse a harmer, play down violence, discourage checking on someone at risk, blame the person,
  // or meet a passive wish not to be here. Tier A can return any of them line by line.
  'um-ang1', 'um-ang2', 'um-ang3', 'um-ang5', 'um-ang7', 'wc-ang1', 'wc-ang2', 'pd-ang7',
  'mj-ang1', 'mj-ang2', 'mj-ang4', 'mj-ang7', 'fa-ang1', 'fa-ang2', 'fa-ang3', 'fa-ang5',
  'fa-ang6', 'sa-ang4', 'sa-ang7', 'bg-ang5', 'nt-ang1', 'nt-ang2', 'nt-ang5', 'nt-ang6',
  'fc-ang2', 'ms-ang3', 'ms-ang6', 'ac-ang2', 'fw-ang1', 'fw-ang2', 'fw-ang3', 'fw-ang4',
  'fw-ang5', 'rg-ang4', 'aw-ang2', 'aw-ang6', 'aw-ang7', 'gen-ang2', 'gen-future-reading-ang2', 'gen-all-or-nothing-ang1',
  'gen-all-or-nothing-ang2', 'gen-always-never-ang1', 'gen-always-never-ang2', 'gen-spotlight-on-me-ang1', 'gen-worst-case-jump-ang2', 'gen-should-rules-ang2', 'gen-only-the-bad-bit-ang2', 'gen-feelings-as-proof-ang1',
  'gen-feelings-as-proof-ang2', 'gen-what-if-loop-ang1', 'gen-what-if-loop-ang2',
]);
// Reframe was written for worries: a line about "your worry" doesn't fit anger, grief or joy.
const WORRY_WORD = /\bworr(?:y|ies|ied|ying)\b/i;

// When a feeling arrives without a label, a light guess from its words (the label only tunes the choice).
const LABEL_CUES = {
  worry: /\b(?:worr\w*|anxious|anxiety|nervous|scared|afraid|frightened|panick?\w*|what if|dread\w*|stress\w*)\b/g,
  sadness: /\b(?:sad|unhappy|down|low|upset|crying|cried|tears|heartbroken|miss|missing|grief|griev\w*|died|passed away)\b/g,
  anger: /\b(?:angry|furious|livid|fuming|rage|mad at|so annoyed|outraged)\b/g,
  joy: /\b(?:happy|so glad|delighted|grateful|thankful|lovely|amazing|wonderful|best day|proud|celebrat\w*)\b/g,
  loneliness: /\b(?:lonely|alone|on my own|by myself|no friends|isolated|left out)\b/g,
  confusion: /\b(?:confus\w*|don'?t know|not sure|unsure|torn|mixed feelings|can'?t decide|muddled)\b/g,
  frustration: /\b(?:frustrat\w*|fed up|sick of|annoy\w*|irritat\w*|stuck|keeps? happening)\b/g,
  excitement: /\b(?:excited|exciting|can'?t wait|thrilled|buzzing|looking forward)\b/g,
};
function inferLabel(probe) {
  let best = null; let most = 0;
  for (const id of LABEL_IDS) {
    const n = (probe.match(LABEL_CUES[id]) || []).length;
    if (n > most) { best = id; most = n; }
  }
  return best;
}

// Which part of life the words are about, to tell apart Reframe situations that share words.
const CONTEXT_CUES = {
  family: /\b(?:mum|mom|mam|dad|mother|father|parents?|brother|sister|siblings?|family|nan|nana|gran|granny|grandma|grandad|grandpa|aunt|auntie|uncle|cousin|in-laws?)\b/,
  work: /\b(?:work|job|boss|manager|colleagues?|co-?workers?|office|meetings?|clients?|shifts?|promotion)\b/,
  partner: /\b(?:partner|boyfriend|girlfriend|husband|wife|fianc[ée]e?)\b/,
  friends: /\b(?:friends?|mates?|bestie)\b/,
  school: /\b(?:school|uni|university|college|class|teacher|lecturer|tutor)\b/,
  money: /\b(?:money|rent|bills?|debts?|bank|overdraft)\b/,
};
const contextsIn = (probe) => new Set(Object.keys(CONTEXT_CUES).filter((c) => CONTEXT_CUES[c].test(probe)));

const BASE = { theme: 10, likely: 8, maybe: 6, pattern: 5, weakPattern: 3, label: 4, general: 1 };
// "always", "never" and "nobody" turn up in most sentences: on their own they're weak evidence of the habit
const WEAK_PATTERNS = new Set(['always-never']);
const BAND = 2.5;            // how far below the best a candidate may be and still be chosen (variety among the fitting)
const MAX_BAND = 6;

function kindFit(kind, label, mallow) {
  let s = 0;
  const lk = LABEL_KINDS[label] || [];
  const li = lk.indexOf(kind);
  if (li >= 0) s += li < 2 ? 1.5 : 1;
  // an innocent explanation can feel like an argument with sadness, loneliness or anger
  if (kind === 'benign' && (label === 'sadness' || label === 'loneliness' || label === 'anger')) s -= 1;
  const mi = (MALLOW_KINDS[mallow] || []).indexOf(kind);
  if (mi >= 0) s += [2, 1.5, 1, 0.5][mi];
  return s;
}

/** Every line this feeling could get, with its fit. → { list: [{ id, kind, text, base }], family, grief, tender } */
function candidatesFor(text, label) {
  const probe = tidyInput(text).toLowerCase();
  const family = BRIGHT.has(label) ? 'bright' : 'heavy';
  const list = [];
  const seen = new Set();
  const add = (a, base, engine = false) => {
    if (!a?.text || seen.has(a.id) || SKIP.has(a.id) || a.text.includes('{thought}')) return;   // never quote the person back
    if (engine && label && label !== 'worry' && WORRY_WORD.test(a.text)) return;
    if (a.only && !a.only.includes(label)) return;
    seen.add(a.id);
    list.push({ id: a.id, kind: a.kind, text: a.text, base });
  };
  const hitsOf = (th) => th.cues.reduce((n, re) => n + (probe.match(re) || []).length, 0);
  // a loss outweighs a happy label: no "soak it up" for a funeral, however it was labelled
  const grief = THEMES.some((th) => th.tender && hitsOf(th) > 0);
  const fits = (th) => (label ? th.labels.includes(label) : th.labels.some((l) => HEAVY_LABELS.includes(l)));
  const skipped = (th) => (grief && !th.tender && (th.notWithGrief || th.labels.every((l) => BRIGHT.has(l)))) || th.skipWhen?.test(probe);
  // situations a theme rules out when its words are there: for a label it serves, on any of its cues;
  // otherwise only when the words name it outright. Never when the words also describe that situation.
  // harm or control at home, or a partner who has died: never "your partner seems distant" lines
  const harm = HARM_AT_HOME_RE.test(probe);
  // good news can mention drinks, a scary ride or a shout of joy: there only the plain signs of harm count
  const harmHere = family === 'heavy' ? harm : HARM_PLAIN_RE.test(probe);
  const welfare = WELFARE_WORDS.test(probe);
  const crowded = new Set(harm ? HARM_CROWDS : grief && !PARTNER_DISTANT_WORDS.test(probe) ? ['partner-distant'] : []);
  if (grief || welfare) for (const id of SILENCE_CROWDS) crowded.add(id);
  if (welfare) crowded.add('partner-distant');   // nor "they might be tired" for someone who's been really low
  if (VOLATILE_WORDS.test(probe)) crowded.add('seemed-annoyed');
  if (SERIOUS_HARM_WORDS.test(probe)) crowded.add('mistake-judged');
  // nor Reframe's "you need a different way of revising" for an IVF round or a scan
  if (MEDICAL_WORDS.test(probe)) crowded.add('bad-grade');
  for (const th of THEMES) {
    if (!th.crowds || th.crowds.unless.test(probe) || (th.crowds.unlessNoHits?.test(probe) && !hitsOf(th))) continue;
    if ((fits(th) && !skipped(th) && hitsOf(th) > 0) || th.crowds.home.test(probe) || (hitsOf(th) > 0 && th.crowds.near.test(probe))) for (const id of th.crowds.ids) crowded.add(id);
  }
  for (const th of THEMES) {
    if (!fits(th) || skipped(th)) continue;
    const hits = hitsOf(th);
    const not = th.notWhen && th.notWhen.re.test(probe) ? new Set(th.notWhen.ids) : null;
    if (hits) for (const a of th.angles) if (!not?.has(a.id)) add(a, BASE.theme + Math.min(hits - 1, 2) * 0.5);
  }
  if (family === 'heavy') {
    const where = contextsIn(probe);
    const fit = (sc) => (!where.size ? 0 : sc.contexts.some((c) => where.has(c)) ? 1.5 : -1.5);
    const matched = matchScenarios(text).filter((m) => m.confidence !== 'fallback' && !crowded.has(m.scenario.id));
    const likely = matched.filter((m) => m.confidence === 'likely');
    // a strong match is used for any heavy label; a near match when it suits the label and either nothing
    // is strong or the strong one is about another part of life ("my mum criticised…" isn't work)
    const strongFits = likely.some((m) => fit(m.scenario) > 0);
    const near = matched.filter((m) => m.confidence !== 'likely' && m.score >= 2 && (!label || SCENARIO_LABELS[m.scenario.id]?.includes(label))
      && (!likely.length || (!strongFits && fit(m.scenario) > 0)));
    const chosen = [...likely.map((m) => [m, BASE.likely]), ...near.map((m) => [m, BASE.maybe])];
    // when one situation fits the part of life the words are about, drop the ones that contradict it
    const anyFits = chosen.some(([m]) => fit(m.scenario) > 0);
    for (const [m, base] of chosen) {
      if (anyFits && fit(m.scenario) < 0) continue;
      for (const a of m.scenario.angles) add(a, base + fit(m.scenario), true);
    }
  }
  // no thinking habit beside harm, a loss or a worrying silence: the habit isn't what's wrong there
  for (const p of harmHere || grief || welfare ? [] : detectPatterns(text)) {
    // good news only borrows the habit of shrinking it ("it was just luck")
    if (family === 'bright' && p.pattern.id !== 'shrinking-the-good') continue;
    for (const a of GENERAL.patternKit[p.pattern.id]?.angles || []) add(a, WEAK_PATTERNS.has(p.pattern.id) ? BASE.weakPattern : BASE.pattern, true);
  }
  for (const a of LABEL_LINES[label] || LABEL_LINES.none) add(a, BASE.label);
  if (family === 'heavy') for (const a of GENERAL.angles) add(a, BASE.general, true);
  // harm at home gets the tender openers grief gets: no "Ooh" or "Fair enough"
  return { list, family, grief, tender: grief || harmHere };
}

function openerFor(mallow, family, tender, label, pickSeed) {
  let list = OPENERS[mallow][tender ? 'heavy' : family];
  if (tender) list = list.filter((o) => (family === 'bright' ? o.soft : o.tender));
  if (!ADJ[label]) list = list.filter((o) => !o.text.includes('{adj}'));
  const o = list[pickSeed % list.length];
  return o.text.replace('{adj}', ADJ[label] || '');
}

/**
 * The Reframe library, in the author's Mallow's voice.
 * provider({ text, label?, mallow?, avoid?: [angleId | textHash], attempt?: number })
 *   → { status: 'ok', text, mallow, source: 'library', model: 'reframe-library:<angle id>', angleId }
 *   → { status: 'support', level }               words that need care, not a new angle (no perspective)
 *   → { status: 'unavailable', reason }
 */
export function libraryProvider() {
  return async ({ text, label = null, mallow = 'loomi', avoid = [], attempt = 0 } = {}) => {
    const words = normaliseText(text);
    if (!words) return { status: 'unavailable', reason: 'empty' };
    // the same screen a feeling gets at release (Reframe's safety lexicon plus Hushmates' additions)
    const screen = screenFeeling(words, { minChars: 1, maxChars: Infinity });
    if (!screen.ok && screen.code === 'support') return { status: 'support', level: screen.level };
    const voice = MALLOW_IDS.includes(mallow) ? mallow : 'loomi';
    const feeling = LABEL_IDS.includes(label) ? label : inferLabel(tidyInput(words).toLowerCase());
    const { list, family, tender } = candidatesFor(words, feeling);
    if (!list.length) return { status: 'unavailable', reason: 'no-angle' };
    const seed = fnv(`${words}\u0000${feeling}\u0000${voice}\u0000${Number(attempt) || 0}`);
    const scored = list.map((c) => {
      const full = `${openerFor(voice, family, tender, feeling, fnv(`${seed}:open:${c.id}`))} ${c.text}`;
      return { ...c, full, score: c.base + kindFit(c.kind, feeling, voice), keys: [c.id, textHash(full), textHash(c.text)], mix: fnv(`${seed}:${c.id}`) };
    });
    const recent = Array.isArray(avoid) ? avoid.map(String) : [];
    const avoided = new Set(recent);
    let pool = scored.filter((c) => !c.keys.some((k) => avoided.has(k)));
    if (!pool.length) {
      // everything here was seen lately: the one seen longest ago (avoid lists are newest first)
      const age = (c) => Math.max(...c.keys.map((k) => recent.indexOf(k)));
      pool = [scored.reduce((a, b) => (age(b) > age(a) || (age(b) === age(a) && b.score > a.score) ? b : a))];
    }
    pool.sort((a, b) => b.score - a.score || a.mix - b.mix);
    const floor = pool[0].score - BAND;
    const band = pool.filter((c) => c.score >= floor).slice(0, MAX_BAND);
    // a seeded, weighted choice: the best fits most often, the near ones sometimes
    const weights = band.map((c) => c.score - floor + 0.5);
    let r = (seed / 2 ** 32) * weights.reduce((a, b) => a + b, 0);
    let pick = band[band.length - 1];
    for (let i = 0; i < band.length; i++) { r -= weights[i]; if (r < 0) { pick = band[i]; break; } }
    return { status: 'ok', text: pick.full, mallow: voice, source: 'library', model: `reframe-library:${pick.id}`, angleId: pick.id };
  };
}

/** Every authored opener and line the library can use (for tests and content review). */
export function libraryCatalogue() {
  const openers = [];
  for (const [mallow, fam] of Object.entries(OPENERS)) {
    for (const [family, list] of Object.entries(fam)) for (const o of list) openers.push({ mallow, family, tender: o.tender, soft: o.soft, text: o.text });
  }
  const angles = [
    ...THEMES.flatMap((t) => t.angles.map((a) => ({ ...a, from: `theme:${t.id}` }))),
    ...Object.entries(LABEL_LINES).flatMap(([l, rows]) => rows.map((a) => ({ ...a, from: `label:${l}` }))),
    ...[...SCENARIOS.flatMap((sc) => sc.angles), ...GENERAL.angles, ...Object.values(GENERAL.patternKit).flatMap((k) => k.angles)].filter((a) => !SKIP.has(a.id) && !a.text.includes('{thought}')).map((a) => ({ ...a, from: 'reframe' })),
  ];
  return { openers, angles, adjectives: { ...ADJ } };
}

// ----------------------------------------------------- the demo example --
const DEMO_LINES = {
  worry: 'Worry often borrows trouble from a future that hasn’t happened yet. What would you tell a friend in the same spot?',
  sadness: 'It makes sense that this feels heavy. Sadness can be a sign of how much something mattered to you.',
  anger: 'Your anger might be pointing at something that genuinely needs to change. What would a fair next step look like?',
  joy: 'This sounds worth savouring. What made it feel good, and how could you make a little more room for that?',
  loneliness: 'Feeling lonely around people can mean you’re missing being truly seen, not that something is wrong with you.',
  confusion: 'Not knowing yet is allowed. Could you pick one small question to answer first, and leave the rest for later?',
  frustration: 'Frustration often shows up when we care and feel stuck. Is there one part of this you can influence today?',
  excitement: 'Being excited and afraid at once is common: it means it matters. What would a small first step look like?',
  none: 'There might be more than one way to read this. What would someone who cares about you notice that you might be missing?',
};
// The same idea in each Mallow's voice (relay-rules MALLOW_VOICES), so the lab shows the personalities.
const DEMO_VOICES = {
  noomi: 'It makes sense this is weighing on you. Could there be a softer reading of it, the kind you’d offer someone you love?',
  blubi: 'That sounds like it has been sitting heavily with you. What might change if it meant a little less than it seems to right now?',
  pipzi: 'What if we turned this round for a moment? If it were a friend’s story, what lighter version might you spot?',
  boppo: 'You’re looking at this carefully, and that takes care. What’s one small part of it that’s still in your hands?',
  zuzu: 'Imagine looking back on this a year from now. Which part do you think you’d still notice, and which might have faded?',
  loomi: 'Let’s separate what happened from what it might mean. What do you know for sure, and what are you guessing?',
  glitzi: 'Your mind might be writing the worst-case script again. What would the less dramatic version of this story say?',
};
export function demoProvider() {
  return async ({ label, mallow = 'loomi' }) => ({ status: 'ok', text: DEMO_VOICES[mallow] || DEMO_LINES[label] || DEMO_LINES.none, mallow, source: 'demo', model: 'demo-canned-v1' });
}

// ------------------------------------------- Account 1's Another Angle --
// The relay's eight labels are all ids in the server's emotion taxonomy.
const EMOTION = { worry: 'worry', sadness: 'sadness', anger: 'anger', joy: 'joy', loneliness: 'loneliness', confusion: 'confusion', frustration: 'frustration', excitement: 'excitement' };

/**
 * @param {object} o
 *   baseUrl    the Another Angle deployment (e.g. https://another-angle.example.workers.dev)
 *   session    async () => bearer token (POST /v1/session with the service's own device id or service entitlement)
 *   fetch      fetch implementation (server-side in production)
 *   timeoutMs  one deadline for the whole answer: health, session, request and body
 */
export function anotherAngleProvider({ baseUrl, session, fetch: doFetch = globalThis.fetch, timeoutMs = 30000 } = {}) {
  const base = String(baseUrl || '').replace(/\/$/, '');
  let token = null;
  const timeout = (signal, ms) => new Promise((resolve) => {
    const t = setTimeout(() => resolve({ timedOut: true }), ms);
    signal?.addEventListener?.('abort', () => { clearTimeout(t); resolve({ timedOut: true }); }, { once: true });
  });
  /** Is the server running the real model right now? Asked for every answer (one cheap GET per feeling, at most),
   *  never cached, so a redeploy to the mock provider can't be labelled AI. → true | false | null (unknown) */
  const isLive = async (signal) => {
    try {
      const res = await doFetch(`${base}/v1/health`, { signal });
      if (!res.ok) return null;
      const h = await res.json();
      return h?.provider === 'anthropic' && !!h?.configured?.provider_key;
    } catch { return null; }
  };
  const call = async (body, signal) => {
    if (!token) {
      const t = await Promise.race([session(), timeout(signal, timeoutMs)]);
      if (!t || t.timedOut || typeof t !== 'string') throw Object.assign(new Error('no session'), { code: 'session' });   // refused, limited or too slow
      token = t;
    }
    return doFetch(`${base}/v1/angle`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
      signal,
    });
  };
  const answer = async ({ text, label, requestId }, signal) => {
    if (!base || !session) return { status: 'unavailable', reason: 'unconfigured' };
    const body = { consent: true, text, emotion: EMOTION[label] || 'something-else', intention: 'steady', locale: 'en-GB', ...(requestId ? { request_id: requestId } : {}) };
    let res;
    let data;
    try {
      res = await call(body, signal);
      if (res.status === 401) { token = null; res = await call(body, signal); }   // one fresh session, once
      if (res.status === 429) return { status: 'unavailable', reason: 'limit' };
      if (!res.ok) return { status: 'unavailable', reason: `http-${res.status}` };
      data = await res.json();                                                   // the deadline covers the body too
    } catch (e) {
      return { status: 'unavailable', reason: e?.code === 'session' ? 'session' : signal?.aborted ? 'timeout' : 'network' };
    }
    if (data.status === 'crisis' || data.status === 'care') return { status: 'support', level: data.status, support: data.support || null };
    if (data.status !== 'ok' || !data.scene) return { status: 'unavailable', reason: data.fallback?.reason || 'fallback' };
    const sc = data.scene;
    const line = [sc.subtitle_line_1, sc.subtitle_line_2].filter(Boolean).join(' ') || sc.alternative_angle;
    if (!line) return { status: 'unavailable', reason: 'empty' };
    // only a real model answer is labelled AI-generated; the mock provider is a demo; unknown is not shown at all
    const ai = await isLive(signal);
    if (ai === null) return { status: 'unavailable', reason: 'provenance-unknown' };
    return { status: 'ok', text: line, mallow: sc.mallow_character, source: ai ? 'ai' : 'demo', model: `${data.prompt_version || 'another-angle'}${ai ? '' : ':mock'}` };
  };
  return async (args) => {
    const ctl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = setTimeout(() => ctl?.abort(), timeoutMs);
    try {
      const out = await Promise.race([answer(args, ctl?.signal), timeout(ctl?.signal, timeoutMs + 50)]);
      return out?.timedOut ? { status: 'unavailable', reason: 'timeout' } : out;
    } finally { clearTimeout(timer); ctl?.abort(); }
  };
}

/** Try providers in order; the first that answers (ok or support) wins. */
export function chain(...providers) {
  return async (args) => {
    let last = { status: 'unavailable', reason: 'none' };
    for (const p of providers.filter(Boolean)) {
      try {
        const r = await p(args);
        if (r && (r.status === 'ok' || r.status === 'support')) return r;
        last = r || last;
      } catch { last = { status: 'unavailable', reason: 'error' }; }
    }
    return last;
  };
}
