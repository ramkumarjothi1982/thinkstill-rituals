// Deterministic quality gate for an Another Angle scene (brief 2 §2, §3, §9).
//
// Runs after the scene has passed the strict schema. Every failure carries a
// stable code (for metadata logs) and a plain instruction (sent back to the
// model once, so the regeneration knows exactly what to fix). The gate never
// rewrites the model's words: a scene either passes or is regenerated, and
// after one failed regeneration the client falls back to the authored engine.

import { HEAVY_EMOTIONS } from './vocab.js';
import { LENSES } from './prompt.js';
import { tidy, words, wordCount, sentences, contentStems, allStems, meaningStems, jaccard, numberTokens, stem, IRREGULAR as TEXT_IRREGULAR } from './text.js';

export const LINE_FIELDS = /** @type {const} */ (['subtitle_line_1', 'subtitle_line_2']);
export const EXPLORE_FIELDS = /** @type {const} */ (['known_fact', 'possible_assumption', 'alternative_angle', 'practical_next_step']);
export const VISIBLE_FIELDS = /** @type {const} */ ([...LINE_FIELDS, ...EXPLORE_FIELDS]);

export const LIMITS = Object.freeze({
  totalMin: 15, totalMax: 35, lineMax: 22, lineMin: 3,
  field: { known_fact: 20, possible_assumption: 20, alternative_angle: 24, practical_next_step: 20 },
  repeatSimilarity: 0.5, repeatLineSimilarity: 0.6,
  // Novelty on meaning-bearing words (eval run 1: real follow-ups shared at
  // most one; paraphrases three or more at a Jaccard of 0.27 and up).
  meaningShared: 3, meaningSimilarity: 0.25, meaningSimilarityPair: 0.5,
  // What the prompt aims for; the gate enforces totalMin–totalMax.
  aimMin: 16, aimMax: 28,
});

const LABEL = {
  subtitle_line_1: 'Line 1', subtitle_line_2: 'Line 2', known_fact: 'known_fact',
  possible_assumption: 'possible_assumption', alternative_angle: 'alternative_angle', practical_next_step: 'practical_next_step',
};

// --- phrase lists ----------------------------------------------------------

const R = String.raw;
/** @param {string[]} parts */
const any = (parts, flags = 'i') => new RegExp(R`(?:^|[^\p{L}\p{N}])(?:${parts.join('|')})(?=$|[^\p{L}\p{N}])`, `${flags}u`);

const RULES = [
  {
    code: 'generic_affirmation',
    message: 'Avoid generic affirmations and motivational phrases (for example "you are worthy", "believe in yourself", "be kind to yourself"); say something specific to their situation instead.',
    re: any([
      R`you(?:'re| are) (?:so |truly |really )?(?:worthy|enough|amazing|awesome|incredible|wonderful|brilliant|strong|stronger than you think|valued|loved|not alone|a good person|doing (?:great|amazing|so well|your best))`,
      R`believe in yourself`, R`you(?:'ve| have)? got this`, R`love yourself`, R`self-?love`, R`be proud of yourself`, R`you should be proud`,
      R`be kind to yourself`, R`be gentle (?:with|on) yourself`, R`treat yourself`, R`you deserve (?:happiness|better|the best|love|to be happy)`,
      R`(?<!(?:how much|whether|if|how|why|what|feel like|feeling that|means|mean|meant|sign) )you (?:really |truly |still |do )?matter(?! (?:less|any less|more|so little)\b)`,
      // "Keep going!" cheers the person on; "the loop can keep going without you" describes a thought.
      R`(?:just |so )keep going`, R`keep going(?=\s*(?:[,.!]|$))`, R`keep going,? you`, R`never give up`,
      R`you(?:'re| are) (?:so |really |clearly |obviously |such )?(?:clever|capable(?! of)|talented|smart|gifted|beautiful|hard[- ]working|a (?:hard[- ]working|talented|great|good|wonderful|lovely|kind|brilliant) (?:person|student|friend|parent|mum|mom|dad|partner|worker|colleague))\b`, R`you can do anything`, R`remember (?:that )?you(?:'re| are)`, R`worthy and valuable`,
      R`practi[sc]e self`, R`you(?:'re| are) only human`, R`everyone makes mistakes`, R`nobody(?:'s| is) perfect`, R`it(?:'s| is) okay not to be okay`,
    ]),
  },
  {
    code: 'empathy_opener',
    message: 'Do not open with a stock empathy phrase ("I understand", "That sounds hard", "It\'s okay to feel..."); start with something specific.',
    re: new RegExp(R`^(?:i understand|i hear you|i'?m (?:so |really )?sorry|i am (?:so |really )?sorry|i can (?:see|tell|imagine|understand)|i know (?:how|that|it)|that sounds (?:really |so |very |incredibly )?(?:hard|tough|difficult|painful|frustrating|awful|horrible|rough|upsetting|stressful)|it sounds like|it'?s (?:completely |totally |perfectly |so )?(?:okay|ok|normal|natural|understandable|valid|fine) to|it'?s understandable|your feelings are valid|what a (?:tough|hard|difficult))`, 'iu'),
  },
  {
    code: 'empathy_opener',
    message: 'Never write "I understand how you feel" or similar.',
    re: any([R`i (?:understand|know) (?:exactly )?how you feel`, R`i understand how hard`]),
  },
  {
    code: 'false_reassurance',
    message: 'No false reassurance or unrealistic positivity ("everything will be fine", "don\'t worry", "at least..."). Stay honest about what is uncertain.',
    re: any([
      R`everything (?:will|is going to|'ll) (?:be )?(?:fine|okay|ok|alright|all right|work out)`, R`it(?:'ll| will) (?:all )?(?:be fine|be okay|be ok|be alright|work out)`,
      R`you(?:'ll| will) be (?:fine|okay|ok|alright)`, R`nothing to worry about`, R`no need to worry`, R`don'?t worry`, R`do not worry`,
      R`everything happens for a reason`, R`bright side`, R`silver lining`, R`every cloud`, R`at least you`, R`it could (?:have been|be) worse`,
      R`stay positive`, R`think positive(?:ly)?`, R`positive vibes`, R`good vibes`, R`nobody (?:even )?noticed`, R`no one (?:even )?noticed`,
      // Promises about how things will turn out.
      R`you(?:'ll| will) (?:definitely |certainly |surely )?(?:do|be) (?:brilliantly|great|amazing|so well|really well|better next time|fine next time)`,
      R`(?:will|'ll) (?:definitely|certainly|surely|absolutely) (?:be|go|get|work|turn)`,
    ]),
  },
  {
    code: 'contradicts_person',
    message: 'Never tell the person their account or feeling is wrong ("that isn\'t true", "you\'re wrong"); show what else might also be true instead.',
    re: any([R`(?:that|this|it)(?:'s| is| was)(?: not|n't) true(?: at all)?`, R`that(?:'s| is) not right`, R`you(?:'re| are) wrong(?: about)?`, R`that(?:'s| is) (?:simply |just )?(?:false|untrue|nonsense|ridiculous)`]),
  },
  {
    code: 'ai_mention',
    message: 'Never mention AI, models, systems or technology.',
    re: any([R`as an ai`, R`a\.i\.`, R`artificial intelligence`, R`language model`, R`chat ?bot`, R`algorithm`, R`anthropic`, R`openai`, R`gpt`]),
  },
  // "Claude" is also a first name: allowed when the person wrote it themselves.
  { code: 'ai_mention', message: 'Never mention AI, models, systems or technology.', re: any([R`claude`]), unlessInInput: /\bclaude\b/iu },
  { code: 'ai_mention', message: 'Never mention AI, models, systems or technology.', re: /\bAI\b/u },
  {
    code: 'human_claim',
    message: 'Do not imply a human speaker or personal experience ("I\'ve been there", "trust me", "I promise").',
    re: any([R`i(?:'ve| have) been there`, R`i(?:'ve| have) felt (?:that|the same|this)`, R`i felt the same`, R`when i was`, R`in my experience`, R`trust me`, R`i promise`, R`i guarantee`, R`(?:^|speaking )as (?:a|your) friend`, R`as (?:a|your) friend,? (?:i|i'd|i'm|i'll|let me)`, R`i remember when`, R`me too`]),
  },
  {
    code: 'cure_claim',
    message: 'No promises of relief or fixes ("you\'ll feel better", "this will fix it").',
    re: any([R`you(?:'ll| will) feel (?:better|great|good|calmer|lighter)`, R`(?:will|this'?ll|that'?ll) (?:make you feel|fix (?:it|this|everything)|cure|heal)`, R`guarantee\w*`, R`cure\w*`, R`heal(?:s|ed|ing)?`]),
  },
  {
    code: 'blame',
    message: 'Never blame the person or call their reaction an overreaction.',
    re: any([R`your (?:own )?fault`, R`you should(?:n'?t)? have`, R`you should'?ve`, R`overreact\w*`, R`too sensitive`, R`(?:being|so|a bit) dramatic`, R`get over it`, R`just move on`, R`brought (?:it|this) on yourself`, R`you asked for`,
      R`(?:whether|if|how) you (?:contributed|provoked|caused|deserved|invited|asked for|brought)`, R`you (?:may|might|could) have (?:provoked|deserved|caused|invited|asked for|brought) (?:it|this|that)`,
      R`by being (?:unprepared|careless|lazy|rude|difficult|dramatic|too sensitive|so sensitive|needy|clingy)`]),
  },
  {
    code: 'condescending',
    message: 'Avoid condescending or dismissive words ("obviously", "just move on", "clearly overreacting", "calm down", "no big deal").',
    re: any([
      R`obviously`, R`of course`,
      // "simply"/"clearly" only where they dismiss ("simply move on"), not in "simply note what happened".
      R`(?:simply|just) (?:move on|get over (?:it|this|that|him|her|them)|forget (?:about )?(?:it|this|that)|stop (?:worrying|thinking about (?:it|this|that)|caring|overthinking)|relax|calm down|cheer up|accept (?:it|this|that)|deal with (?:it|this|that)|toughen up|snap out of it|ignore (?:it|this|that))`,
      R`(?:simply|clearly) (?:overreacting|overthinking|exaggerating|being (?:silly|dramatic|irrational|paranoid|unreasonable|too)|wrong|irrational|paranoid|nothing|fine|silly|not (?:a big deal|that bad|worth))`,
      R`it(?:'s| is) (?:simply|clearly) (?:not|nothing)`, R`silly`, R`just (?:study|try|work|revise|practi[sc]e) harder`, R`not that deep`, R`calm down`, R`just relax`, R`chill out`, R`no big deal`, R`not a big deal`, R`not that big a deal`, R`it doesn'?t matter`, R`who cares`, R`you(?:'re| are) fine`, R`first[- ]world problem`]),
  },
  {
    code: 'forgive_pressure',
    message: 'Do not push the person to forgive, let go or move on; if anger is valid, point to the boundary or response that may be needed.',
    re: any([R`you should forgive`, R`forgive (?:them|him|her) and`, R`let it go`, R`just let go`, R`move on from (?:it|this|that)`, R`rise above`, R`be the bigger person`]),
  },
  {
    code: 'therapy_jargon',
    message: 'No therapy or self-help jargon and no names of thinking patterns (e.g. reframe, catastrophising, rumination, validate, trigger, mindfulness, coping strategy). Use plain, everyday words.',
    re: any([
      R`cognitive`, R`distortions?`, R`catastroph\w*`, R`black[- ]and[- ]white thinking`, R`all[- ]or[- ]nothing(?: thinking)?`, R`mind[- ]reading`,
      R`overgenerali[sz]\w*`, R`personali[sz]ation`, R`rumina\w*`, R`self-critic\w*`, R`thinking (?:trap|pattern|error)s?`, R`thought patterns?`,
      R`CBT`, R`DBT`, R`reframe\w*`, R`validat\w*`, R`(?:is|are|feels?|feelings?) valid`, R`trauma\w*`, R`trigger(?:s|ed|ing)?`,
      R`inner child`, R`core beliefs?`, R`schemas?`, R`self-?care`, R`mindful\w*`, R`coping`, R`emotional(?:ly)? regulat\w*`, R`regulate`,
      R`nervous system`, R`attachment style`, R`toxic`, R`gaslight\w*`, R`narcissis\w*`, R`diagnos\w*`, R`disorders?`, R`depress\w*`,
      R`therap\w*`, R`counsell?\w*`, R`journal(?:l)?ing`, R`affirmations?`, R`manifest\w*`, R`process (?:your|these|those|the) (?:feelings|emotions)`,
      R`sit with (?:it|this|that|the feeling)`, R`hold space`, R`lean into`, R`safe space`, R`negative thoughts?`, R`automatic thoughts?`,
      R`radical acceptance`, R`wise mind`, R`opposite action`, R`grounding`, R`inner critic`, R`self-talk`, R`healing`,
    ]),
  },
  { code: 'therapy_jargon', message: 'No therapy acronyms (ACT, CBT, DBT).', re: /\bACT\b/u },
  {
    code: 'link_or_code',
    message: 'No links, email addresses, phone numbers, code, markup or brackets.',
    re: /https?:|www\.|\b[\w-]+\.(?:com|org|net|io|co\.uk|uk|app|ai)\b|[\w.+-]+@[\w-]+\.|<\/?[a-z!][^>]*>|```|[{}[\]<>|\\]|=>|\b(?:function|console|document|window|return)\b\s*[.(]|\+?\d[\d\s().-]{7,}\d/iu,
  },
  {
    code: 'jokey_tone',
    message: 'Keep the tone warm, not jokey: no "lol", "haha", "oops" and so on.',
    re: any([R`lol`, R`lmao`, R`haha+`, R`hehe`, R`rofl`, R`yikes`, R`oops`, R`whoops`, R`plot twist`, R`spoiler alert`]),
  },
  {
    code: 'list',
    message: 'No lists, bullets or line breaks: each line is one flowing sentence.',
    re: /[•▪●◦]|^\s*[-*]\s|^\s*\d[.)]\s/u,
  },
];

// Third parties whose minds must never be described as fact.
const OTHER_NOUNS = ['boss(?:es)?', 'managers?', 'partners?', 'boyfriends?', 'girlfriends?', 'husband', 'wife', 'friends?', 'colleagues?', 'co-?workers?', 'mums?', 'moms?', 'dads?', 'mothers?', 'fathers?', 'sisters?', 'brothers?', 'family', 'teachers?', 'tutors?', 'lecturers?', 'coach(?:es)?', 'ex(?:es)?', 'team', 'flatmates?', 'housemates?', 'roommates?', 'date', 'crush', 'sons?', 'daughters?', 'parents?', "parents' friends", 'classmates?', 'mates?', 'landlord', 'clients?', 'customers?', 'neighbou?rs?', 'in-laws', 'kids', 'children', 'cousins?', 'grandparents', 'nan', 'gran', 'auntie', 'aunt', 'uncle', 'examiners?', 'interviewers?', 'audience', 'group', 'class', 'followers'];
const OTHERS = R`(?:he|she|they|(?:your|their|his|her) (?:${OTHER_NOUNS.join('|')})|(?:the|those) people (?:around|in|at|near|close to|with) (?:you|your [\p{L}'-]+)|(?:most|all|the) people|everyone|everybody|nobody|no one|no-one|people|others|other people)`;
const ADVS = R`(?: (?:definitely|really|just|probably|certainly|surely|actually|only|still|totally|secretly|likely|simply|honestly|genuinely|clearly|obviously|even|already|always|never))*`;
// Mental verbs: "he loves you", "she must hate me", "they don't care".
const MIND_VERB = R`(?:loves?|liked?|likes|cares?|cared|hates?|hated|resents?|respects?|values?|admires?|misses|missed|wants?|wanted|meant|means (?:it|to|well)|mean (?:it|to|well|anything by it|any harm)|rates? you|rated you|thinks? (?:highly|the world) of|intended|intends|feels?|felt|thinks?|thought|knows?|knew|forgot|forgets|noticed|notices|notice|remembers?|remembered|judges?|judged|blames?|blamed|trusts?|trusted|tried to|ignored|ignores?|minds?|minded|regrets?|appreciates?|appreciated|prefers?|preferred|favou?rs?|favou?red|adores?|envies|envied|dislikes?|disliked|understands?|understood|realises?|realised|realizes?|realized|forgives?|forgave)`;
// Mental states need a linking verb: "she is annoyed", "he was just busy".
const MIND_STATE = R`(?:annoyed|angry|upset|mad|disappointed|proud|jealous|threatened|insecure|busy|stressed|distracted|overwhelmed|happy|fine|okay|interested|bored|embarrassed|hurt|sorry|over it|ignoring|avoiding|judging|thinking|trying to|testing|punishing|annoyed with|fed up|worried|scared|afraid|anxious|nervous|concerned|protective|ashamed|tired|exhausted|lonely|sad|grieving|struggling|going through something|joking|teasing|kidding|messing about|messing around|being playful|being kind|being honest|being nice|impressed|pleased|grateful|thankful|in love|attracted|threatened by you|intimidated|envious)`;
// A short phrase may sit between the person and the verb: "everyone at that dinner was judging you".
const PP = R`(?: (?:at|in|on|from|around|across|with|near|close to) (?:(?:the|that|this|your|their|his|her|a|an) [\p{L}'-]+(?: [\p{L}'-]+)?|you|work|school|home|uni|college))?`;
// Groups: 1 the person, 2 auxiliaries and negation, 3 the mind word.
const CLAIM_G = new RegExp(R`\b(${OTHERS})${PP}${ADVS}((?: does| did| do| will| would| must| has| have| had| can)?(?: not| never)?)${ADVS} (${MIND_VERB})\b`, 'giu');
const STATE_G = new RegExp(R`\b(${OTHERS})${PP}((?: is| are| was| were| will be| would be| must be| has been| have been| had been| seems to be)(?: not| never)?)${ADVS} (${MIND_STATE})\b`, 'giu');
const OTHERS_RE = new RegExp(R`\b${OTHERS}\b`, 'iu');
const THIRD_PARTY_RE = new RegExp(R`\b(?:he|she|they|him|her|them|his|their|${OTHER_NOUNS.join('|')}|everyone|everybody|nobody|no one|no-one|people)\b`, 'iu');
const NOT_PERSONAL_RE = /\b(?:it|this|that) (?:was|is|was not|is not|wasn't|isn't) (?:not )?(?:personal|about you)\b|\b(?:they|he|she) did not mean (?:it|to)\b|\b(?:nothing|not anything|anything) personal\b|\b(?:it|this|that) (?:was|is|were) (?:(?:probably|likely|surely|clearly|definitely|just|only|simply|almost certainly|most likely) (?:an? )?(?:oversight|accident|honest mistake|mix-up|mix up|misunderstanding|slip)|(?:an? )?(?:oversight|mix-up|mix up|misunderstanding))\b/iu;
// Motives stated as fact: "left you out on purpose to send a message".
const MOTIVE_RE = /\b(?:on purpose|deliberately|intentionally|to send (?:you )?a message|to make a point|to get at you|to hurt you|to punish you|to teach you a lesson|to humiliate you|to embarrass you|to upset you|to test you|out of spite|to spite you|out of jealousy|because (?:he|she|they)(?: is| are|'s|'re| was| were)? (?:jealous|threatened|insecure|intimidated))\b/iu;
// "She has no respect for you", "he has a lot of love for you".
const HAVE_G = new RegExp(R`\b(${OTHERS})${PP}${ADVS}((?: does| did| do)?(?: not| never)?(?: has| have| had| has got| have got| has had| have had| has never had| has always had))(?: no| zero| little| any| a lot of| lots of| so much| real| genuine| deep| great| huge| such| more| less)? (respect|love|feelings|interest|regard|affection|contempt|resentment|a grudge|it in|time) (?:for|towards|against|in)? ?(?:you)\b`, 'giu');
// Predictions about what someone else will do: "He will reply soon".
const PREDICT_G = new RegExp(R`\b(${OTHERS})${PP}${ADVS}((?: will| would| is going to| are going to| will not| would not| is not going to| are not going to)(?: soon| definitely| probably| surely| eventually| certainly| still| never)?) (reply|respond|text|call|message|answer|get back to you|come round|come around|forgive|forget|notice|remember|understand|apologi[sz]e|change|calm down|be (?:fine|okay|ok|happy|proud|angry|upset|disappointed|impressed|pleased)|see (?:it|that|how)|like|love|care|mind|judge|laugh|think)\b`, 'giu');
// Invented people who care: "all the people who love you".
const REL_G = new RegExp(R`\b((?:all )?(?:the|those) (?:people|friends|ones)|people|everyone|everybody|plenty of people|lots of people|many people|so many people)(?: around you| in your life)? (?:who|that) (?:really |truly |still |all |genuinely |deeply |already )?(love|loves|care|cares|like|likes|value|values|respect|respects|adore|adores|appreciate|appreciates|miss|misses|think about|believe in) (?:about )?you\b`, 'giu');
// "liked a photo" is something they did, not a feeling.
const POST_OBJECT = /^ (?:a|an|his|her|their|the|your|my|some|all|every|each|one of|two of|several|another|old|recent)(?: [\p{L}'-]+'s| [\p{L}'-]+)? (?:photos?|posts?|pictures?|pics?|stor(?:y|ies)|comments?|tweets?|status|statuses|reels?|videos?|selfies?|updates?|messages?)\b/iu;
const LIKE_WORDS = new Set(['like', 'liked', 'likes', 'liking']);
const HEDGE_SRC = String.raw`\b(?:may|might|could|can(?! not)|perhaps|possibly|maybe|if|whether|unless|whatever|not sure|do not know|don't know|can't know|cannot know|can not know|can't tell|cannot tell|no way to know|unclear|unknown|guess(?:ing)?|wonder|question|possibilit(?:y|ies)|possible|seems?|seemed|as if|does not prove|doesn't prove|is not proof|isn't proof|not proof|does not mean|doesn't mean|does not tell|doesn't tell|without knowing|has not said|hasn't said|have not said|haven't said|one reading|one explanation|explanations|interpretations?|story|stories|assum\w*|guesses|only (?:he|she|they|him|her|them) (?:knows?|can (?:say|tell|answer|explain)))\b`;
// "Some people find it hard to say things they still feel" is a general
// statement about how people work, so it covers its clause. A quantity word
// is no hedge for a claim about the person ("Plenty of people like you",
// "Sometimes people like you more than they show"): that still claims to know
// what others feel, so it only counts before an ordinary-experience verb whose
// object is not "you".
const QTY_HEDGE_SRC = String.raw`\b(?:(?:some|many|plenty of|lots of|a lot of|most|loads of) (?:people|parents|dads|mums|bosses|managers|teachers|friends|partners|families)|sometimes(?: people)?|people (?:often|sometimes))(?: (?:really|honestly|genuinely|just|also))? (?:find|finds|feel (?!(?:that )?(?:you|the same about you))|feels (?!(?:that )?you)|get|gets|notice|struggle|struggles|go quiet|freeze|need|take|have trouble|worry|forget)\b`;
const HEDGE_RE = new RegExp(`${HEDGE_SRC}|${QTY_HEDGE_SRC}`, 'iu');
const HEDGE_G = new RegExp(`${HEDGE_SRC}|${QTY_HEDGE_SRC}`, 'giu');
// Attribution frames: the person's own account or feeling, not a claim about
// anyone's mind ("You said your boss ignored you", "It feels like nobody likes you").
const ATTRIB_G = /\b(?:you(?: have| had| are| were| keep| kept)?(?: just| really| still| already| also| even)? (?:said|say|saying|wrote|write|writing|told (?:me|us)|mentioned|mention|described|describe|noticed|notice|noticing|felt|feel|feeling|fear|feared|worry|worried|suspect|suspected|think|thought|thinking|believe|believed|sense|sensed|imagine|imagined|picture|pictured|afraid|scared|convinced|sure|guessing|hearing|telling yourself|tell yourself|told yourself)|it (?:can |may |might |could )?(?:feels?|felt|seems?|seemed|looks?|looked|sounds?|sounded) (?:like|as if|as though|that)|in your (?:head|mind|telling|version))\b/giu;
// Negated reports: "your dad has not told you he is proud" reports a silence,
// it does not claim to know his mind.
const NEG_REPORT_G = /\b(?:not|never|no longer)(?: \w+){0,2}? (?:told|tell|tells|telling|said|say|says|saying|shown|show|shows|showed|mentioned|mention|mentions|written|write|writes|wrote|admitted|admit|admits|expressed|express|expresses|explained|explain|explains|texted|messaged)\b/giu;
// Positive reports ("she said she was busy"): a restatement only when the person reported speech too.
const REPORT_G = /\b(?:said|says|told you|tells you|texted|messaged|wrote|explained|admitted|mentioned)\b/giu;
const REPORT_IN_INPUT = /\b(?:said|says|say|told|tells|tell|texted|text|messaged|wrote|writes|explained|admitted|mentioned)\b/iu;
// An embedded question names a topic, it does not assert: "how people feel
// about you is mixed", "what he thinks is still unknown".
const WH_BEFORE = /\b(?:how|what|why|when|where)(?: much| far| often| exactly)?\s*$/iu;
// A frame covers a claim after it, unless a new clause starts in between.
const BOUNDARY = /\b(?:so|because|since|then|which|until)\b|\band\b(?! that\b)/iu;
const NEG_INPUT = /\b(?:not|never|no|nobody|none|nothing)\b|n't\b/iu;

// The same irregular forms the engagement check uses (src/text.js), plus a few
// regular ones the crude suffix rule below would get wrong.
const IRREGULAR = new Map([...TEXT_IRREGULAR, ...Object.entries({
  forgetting: 'forget', trying: 'try', liked: 'like', loved: 'love',
})]);
/** Rough lemma for comparing a mind word with the person's own words. @param {string} w */
function root(w) {
  const x = w.toLowerCase().replace(/’/g, "'");
  const irr = IRREGULAR.get(x);
  if (irr) return irr;
  return x.replace(/(?:ing|ed|es|(?<!s)s)$/u, '').replace(/e$/u, '');
}

/**
 * @typedef {{ text: string, roots: Set<string>, stems: Set<string>, neg: boolean, third: boolean, report: boolean }} InputInfo
 * @param {string} input
 * @returns {InputInfo}
 */
function inputInfo(input) {
  const ex = expand(input);
  const ws = words(ex).map((w) => w.toLowerCase());
  return {
    text: ex, roots: new Set(ws.map(root)), stems: new Set(ws.map(stem)),
    neg: NEG_INPUT.test(ex), third: THIRD_PARTY_RE.test(ex), report: REPORT_IN_INPUT.test(ex),
  };
}

// Mind words that describe something that happened (an event the person
// reported), so restating them is not mind-reading. Attitudes ("hates",
// "doesn't care", "is angry") and claims about everyone or nobody stay the
// person's reading: they are restated with a frame ("It feels like…").
const EVENT_WORDS = new Set(['forgot', 'forgets', 'ignored', 'ignore', 'ignores', 'noticed', 'remembered', 'missed', 'blamed', 'judged']);

/**
 * Is this claim a faithful restatement of an event the person wrote about?
 * Same event word, same polarity, and the same person (or, for "he"/"she"/
 * "they", someone the person mentioned).
 * @param {{ subject: string, neg: boolean, word: string }} c @param {InputInfo} info
 */
function echoes(c, info) {
  const w = c.word.toLowerCase();
  if (!EVENT_WORDS.has(w) || !info.roots.has(root(w))) return false;
  if (c.neg && !info.neg) return false;
  const s = c.subject.toLowerCase();
  if (/^(?:he|she|they)$/.test(s)) return info.third;
  if (!/^(?:your|their|his|her) /.test(s)) return false;
  return info.stems.has(stem(s.split(' ').pop() || ''));
}

/** @param {RegExp} re @param {string} s */
const spans = (re, s) => [...s.matchAll(re)].map((m) => ({ start: m.index ?? 0, end: (m.index ?? 0) + m[0].length }));

/**
 * Is a claim at `at` covered by a frame that ends before it, with no new clause in between?
 * @param {{ start: number, end: number }[]} frames @param {string} clause @param {number} at
 */
const covered = (frames, clause, at) => frames.some((f) => f.end <= at && !BOUNDARY.test(clause.slice(f.end, at)));

/**
 * Does a (contraction-expanded) sentence state another person's mind as
 * fact? A hedge covers its own clause ("Even if your boss is annoyed, …");
 * a lead-in hedge with no person in it ("It's possible that, after a long
 * day, he is tired") also covers the clauses after it. "but", ";" and dashes
 * start a fresh claim. "He might not have seen it, and he's probably busy"
 * fails on its second clause.
 *
 * Not claims: the person's own account or feeling ("You said…", "It feels
 * like…", "You've noticed…"), negated reports ("he has never said he is
 * proud"), and — where `echo` is given (known_fact and line 1) — a faithful
 * restatement of what the person wrote ("Your girlfriend forgot your
 * anniversary" for "My girlfriend forgot our anniversary"). New guesses
 * about anyone's mind stay claims everywhere.
 * @param {string} sentence
 * @param {InputInfo | null} echo
 */
function claimsOthersMinds(sentence, echo) {
  for (const seg of sentence.split(/;|—|–|\s-\s|\bbut\b|\bhowever\b|\bthough\b/)) {
    let leadIn = false;
    for (const clause of seg.split(/[,:]/)) {
      const hedged = HEDGE_RE.test(clause);
      const claims = [...clause.matchAll(CLAIM_G), ...clause.matchAll(STATE_G), ...clause.matchAll(HAVE_G), ...clause.matchAll(PREDICT_G)].map((m) => ({
        at: m.index ?? 0, end: (m.index ?? 0) + m[0].length, subject: m[1], neg: /not|never/.test(m[2] || ''), word: m[3],
      }))
        // "He liked a photo" reports something he did, not how he feels.
        .filter((c) => !(LIKE_WORDS.has(c.word.toLowerCase()) && POST_OBJECT.test(clause.slice(c.end))));
      for (const m of clause.matchAll(REL_G)) claims.push({ at: m.index ?? 0, end: (m.index ?? 0) + m[0].length, subject: m[1], neg: false, word: m[2] });
      const motive = MOTIVE_RE.exec(clause);
      if (motive && OTHERS_RE.test(clause.slice(0, motive.index))) claims.push({ at: motive.index, end: motive.index + motive[0].length, subject: '', neg: false, word: 'motive' });
      const notPersonal = NOT_PERSONAL_RE.test(clause);
      if ((claims.length || notPersonal) && !leadIn) {
        if (notPersonal && !hedged) return true;
        // A hedge counts for a claim only when it comes first or inside it
        // ("If he is busy…"), not after it ("He is proud, even if…").
        const hedges = spans(HEDGE_G, clause);
        const attrib = spans(ATTRIB_G, clause);
        const negReport = spans(NEG_REPORT_G, clause);
        const report = echo && echo.report ? spans(REPORT_G, clause) : [];
        for (const c of claims) {
          if (hedges.some((h) => h.start < c.end) || WH_BEFORE.test(clause.slice(0, c.at))) continue;
          if (covered(attrib, clause, c.at) || covered(negReport, clause, c.at)) continue;
          if (echo && (echoes(c, echo) || covered(report, clause, c.at))) continue;
          return true;
        }
      }
      if (hedged && !claims.length && !notPersonal && !OTHERS_RE.test(clause)) leadIn = true;
    }
  }
  return false;
}

/** Expand common contractions so the claim patterns see "he is", "does not" and so on. */
/** @param {string} s */
function expand(s) {
  return tidy(s).toLowerCase()
    .replace(/\b(he|she|it|that|there|who|what)'s\b/g, '$1 is')
    .replace(/\b(they|we|you)'re\b/g, '$1 are')
    .replace(/\b(\w+)'ll\b/g, '$1 will')
    .replace(/\b(\w+)'d\b/g, '$1 would')
    .replace(/\b(\w+)'ve\b/g, '$1 have')
    .replace(/\bwon't\b/g, 'will not').replace(/\bcan't\b/g, 'can not').replace(/\b(\w+)n't\b/g, '$1 not');
}

const HARSH = R`(?:useless|stupid|a failure|failure|worthless|pathetic|an idiot|idiot|a loser|loser|hopeless|unlovable|a burden|burden|a disaster|a fraud|fraud|terrible|rubbish|awful|not good enough|too much|a mess|broken|weak)`;
const LABEL_RE = new RegExp(R`\byou(?:'re| are)( not| never)?(?: just| really| so| such| totally| completely| clearly| obviously| actually)* ${HARSH}\b`, 'giu');
// "Three failed tests tell you the test is hard for you, not that you are
// stupid": the label is named only to set what the evidence shows against it.
const LABEL_CONTRAST = new RegExp(R`\b(?:tells?|shows?|measures?|measured|means?|says?|said|proves?|proved|is about|are about|was about|were about)\b[^.?!]*\b(?:not|rather than|instead of) (?:that |whether |proof that )?you(?:'re| are)(?: just| really| so| such| totally| completely)* ${HARSH}\b`, 'giu');
// "You might be treating three failed tests as proof you're stupid": the
// person's own verdict, named as the thing under examination ("as proof",
// "you called yourself"), is not the gate applying the label.
const LABEL_FRAME = new RegExp(R`\b(?:(?:as|like) (?:(?:proof|evidence|a sign|a verdict|confirmation|a ruling)(?: that)?|if|though)|you(?: have| had)?(?: (?:just|keep|kept|might|may|could)(?: be)?)? (?:said|say|wrote|called yourself|call yourself|calling yourself|told yourself|tell yourself|telling yourself|concluded|decided|feel|felt|fear|feared|think|thought|believe|believed)(?: that)?) you(?:'re| are)(?: just| really| so| such| totally| completely)* ${HARSH}\b`, 'giu');

// American spellings (exempted when the person used the same word).
const IZE_ALLOW = new Set(['size', 'sizes', 'sized', 'resize', 'resized', 'downsize', 'downsized', 'oversize', 'oversized', 'prize', 'prizes', 'prized', 'seize', 'seized', 'seizes', 'seizing', 'capsize', 'maize', 'baize', 'assize']);
const AMERICAN = [
  /^\w+(?:ize|izes|ized|izing|ization|izations)$/,
  /^\w*(?:yze|yzes|yzed|yzing)$/,
];
const AMERICAN_WORDS = new Set(`color colors colored colorful coloring favor favors favored favorite favorites favorable behavior behaviors behavioral honor honors honored honorable humor humors humored labor labors labored neighbor neighbors neighborhood neighboring rumor rumors rumored flavor flavors harbor endeavor endeavors savior valor vapor odor center centers centered theater theaters fiber gray mom moms traveled traveling traveler canceled canceling labeled labeling modeled modeling leveled fueled jewelry defense offense pretense catalog dialog fulfill fulfillment enroll enrollment skillful willful aluminum pajamas cozy plow math mold molded somber meager maneuver mustache sulfur artifact`.split(' '));
const PRACTICE_VERB = /\b(?:to|could|can|might|try|then|and) practice\b/iu;

const SENTENCE_START_OK = new Set(['i', "i'm", "i'd", "i'll", "i've", 'zuzu', 'glitzi', 'noomi', 'loomi', 'blubi', 'boppo', 'pipzi',
  'english', 'british', 'uk', 'hr', 'ok', 'year']);
// Days, months and holidays: the person's own, or when a suggested step should happen.
const DATE_WORDS = new Set(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'january', 'february', 'march', 'april',
  'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december', 'christmas', 'easter', 'eid', 'diwali', 'hanukkah', 'ramadan',
  'halloween', 'boxing']);
const DATE_PREP = /\b(?:by|before|until|till|on|this|next|over|for|from|at|after|around)\s*$/iu;

// Everyday objects and abbreviations a situation implies ("your CV" for a
// redundancy worry, "your GP"): not names or facts the person withheld.
const COMMON_CAPS = new Set(['cv', 'cvs', 'hr', 'gp', 'nhs', 'a&e', 'mot', 'ucas', 'gcse', 'gcses', 'a-level', 'a-levels', 'dm', 'dms', 'id', 'pin', 'tv', 'pe', 'pdf', 'phd', 'linkedin', 'mp', 'uk', 'ok', 'faq', 'wi-fi', 'wifi']);

// Fields that may restate what the person said happened ("Your girlfriend
// forgot your anniversary"), so a faithful restatement there is not a claim
// about anyone's mind. Line 2 and the step often restate the event before
// suggesting something ("Since she forgot the day, you could tell her…").
const ECHO_FIELDS = new Set(['known_fact', 'subtitle_line_1', 'subtitle_line_2', 'practical_next_step']);

// --- invented details: numbers ------------------------------------------------
//
// A number is the person's detail when they gave it. Two things are checked:
//  1. A number counting the same unit as one of theirs must be theirs: they
//     said "two weeks", so "three weeks" is wrong wherever it appears ("After
//     three weeks of silence…", "for three weeks"), and so is "three tests"
//     after "the second time". An ordinal may name an earlier one ("your
//     second test" of three).
//  2. Any other number they never gave is invented, apart from "one" and
//     "two", vague plurals ("hundreds of emails") and the idioms below.
// Not counted at all, because they are about the future, not the situation:
// inside a suggested action (practical_next_step, or a line that proposes
// one), a time box after a forward-looking verb ("spend twenty minutes",
// "wait 48 hours", "for the next hour"), a small count of what to do
// ("write down three things", "two or three people", "say them aloud three
// times") and a clock time with its marker ("until 9 tonight", "at 7.30");
// and outside known_fact, a vantage point ahead ("in five years' time", "six
// months from now", "in five years, will…"). A count followed by a clause
// about the past ("the four strengths your manager praised") is a fact again.

const NUM = R`(?:\d{1,3}(?:[.,]\d{1,2})?|(?:twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:-(?:one|two|three|four|five|six|seven|eight|nine))?|zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|a hundred|a dozen)`;
const SMALL_NUM = R`(?:[1-9]|10|one|two|three|four|five|six|seven|eight|nine|ten)`;
const TIME_UNIT = R`(?:minutes?|mins?|seconds?|hours?|hrs?|days?|evenings?|nights?|mornings?|afternoons?|weeks?|months?|breaths?)`;
// A forward-looking verb, then up to three words, then the time box.
const FORWARD_VERB = R`(?:spend|spending|take|taking|give (?:it|yourself|this|that|them|him|her)|allow (?:yourself|it)|set aside|set a timer for|wait|waiting|pause|stop|rest|sit|walk|breathe|step (?:away|back|out|outside)|put [\p{L}' ]{1,24}? (?:down|away|aside)|leave (?:it|this|that|them)|try (?:it|this|that)|keep (?:it|this|that) up|stay off|switch off|turn off|log off)`;
const FORWARD_BOX = new RegExp(R`\b${FORWARD_VERB}(?: (?!the\b|those\b|these\b|your\b)[\p{L}'-]+){0,3}? (?:for |about |around |roughly )?(?:the next |another |just |only |about |around |a full |at least |at most )?${NUM}(?:-| )${TIME_UNIT}\b`
  + R`|\b(?:for|in|within|over|during) the (?:next|coming|first) ${NUM} ${TIME_UNIT}\b`
  + R`|\b(?:another|one more) ${NUM} ${TIME_UNIT}\b|\b${NUM} more ${TIME_UNIT}\b`
  + R`|\bin (?:about |around )?${NUM} (?:minutes?|mins?|hours?)(?:'s?| time)?\b`, 'giu');
// A small count of what to do. Never "times" (that is usually a count of
// occasions); see REPEAT_ACTION for "say it three times".
const ACTION_COUNT = new RegExp(R`\b${SMALL_NUM}(?: [\p{L}'-]+){0,2}? (?:things?|points?|questions?|lines?|sentences?|words?|examples?|reasons?|ways?|ideas?|items?|pieces?|moments?|steps?|names?|options?|bits?|breaths?|lessons?|notes?|parts?|wins?|strengths?|skills?|differences?|priorities|tasks?|choices?|bullet points?|minutes?|people|friends?|courses?|places?|flats?|jobs?|facts?|memories|photos?|messages?|texts?)\b`, 'giu');
const ACTION_RANGE = new RegExp(R`\b${SMALL_NUM} or ${SMALL_NUM}(?: [\p{L}'-]+){1,3}\b`, 'giu');
const REPEAT_ACTION = new RegExp(R`\b(?:say|saying|read|reading|practise|practising|repeat|rehearse|run (?:it|them|that|this) through|try|do|breathe|write|play|count)(?: (?!the\b|those\b|these\b|your\b|his\b|her\b|their\b)[\p{L}'-]+){0,3}? ${SMALL_NUM}(?: or ${SMALL_NUM})? times\b`, 'giu');
// A clock time needs its marker: "after three" is not a time; "until 9 tonight" is.
const CLOCK_TIME = new RegExp(R`\b(?:at|by|until|till|before|after|from|around|about)\s+(?:\d{1,2}[:.]\d{2}(?:\s*(?:am|pm|a\.m\.|p\.m\.))?|${NUM}\s*(?:am|pm|a\.m\.|p\.m\.|o'clock)|${NUM}(?=\s+(?:tonight|tomorrow|this (?:evening|afternoon|morning)|today|on (?:mon|tues|wednes|thurs|fri|satur|sun)day)\b))(?![\p{L}\p{N}])|\b\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm)\b`, 'giu');
// A vantage point ahead of now (the distance-or-time lens). Never "after".
const VANTAGE = new RegExp(R`\bin (?:about |roughly |around )?${NUM} (?:weeks?|months?|years?)(?:'s?)? time\b|\b${NUM} (?:days?|weeks?|months?|years?) from (?:now|today)\b|\bin (?:about |roughly |around )?${NUM} (?:weeks?|months?|years?),? (?=(?:will|would|could|might|does|do|is|are|how|what|who|which|whether|you(?:'ll| will| might| may)|it(?:'ll| will| might| may)|this(?:'ll| will| might)|that(?:'ll| will| might)|anyone|anybody)\b)`, 'giu');
// A count is a claim about the past again when a clause about the past
// follows it in the same clause.
const THIRD_PAST = new RegExp(R`^\s*(?:(?:that|which|who|when)\s+)?(?:(?:your|his|her|their|the|my|our) [\p{L}'-]+(?: [\p{L}'-]+)?|he|she|they|people|someone|everyone|everybody)\s+(?:[\p{L}'-]+ly\s+)?(?:had|has|have|did|was|were|said|told|gave|made|took|wrote|sent|thought|felt|knew|saw|left|got|brought|forgot|meant|chose|found|kept|showed|shown|[\p{L}]+ed)\b`, 'iu');
const YOU_PAST = /^\s*(?:(?:that|which|when)\s+)?you(?: have| had|'ve|'d)?\s+(?!most\b|best\b|really\b|would\b|could\b|might\b|want\b|like\b|love\b|need\b|can\b|will\b)(?:[\p{L}'-]+ly\s+)?(?:had|did|were|was|made|got|took|said|wrote|sent|forgot|missed|failed|lost|[\p{L}]+ed)\b/iu;
// "the three things you loved most": picking from their own past is a choice, not a count of it.
const SELECTION = /^[^,;:.?!]*?\b(?:most|best|least|biggest|hardest|favourite|top)\b/iu;
const PAST_MARK = /^[^,;:.?!]*?\b(?:last (?:week|month|year|night|term|time|summer|winter|spring|autumn)|yesterday|ago|so far|already|earlier (?:today|this week)|since then)\b/iu;
// What makes a subtitle line a suggestion: it asks, or it proposes an action.
const ACTION_CUE = /\?["')\]]*$|^(?:try|write|jot|list|name|pick|choose|send|ask|spend|take|give|set|make|note|plan|book|put|tell|message|text|call|decide|find|look|read|practise|start|wait|leave|keep|step|sleep|go|one (?:small|useful|tiny|kind) (?:move|step|thing))\b|\b(?:you could(?! (?:be|have|feel|still|never|not|well)\b)|you might(?! (?:be|have|feel|still|never|not|well|find yourself)\b)|could you|would you|might you|what if you|how about|it (?:might|could|may) help to|try (?:to|it|this|that|one|a|an|asking|writing|saying|sending|telling|[\p{L}]+ing)\b)/iu;
/**
 * Does a subtitle line propose something to do (an action or an answerable
 * question)? A rough reading, used by the eval report to count how often line
 * 2 carries the step; the gate itself never requires one (an action is not
 * always kind).
 * @param {string} line
 */
export const suggestsStep = (line) => ACTION_CUE.test(tidy(line));
// "On the tenth replay an answer can sound worse": a general statement about
// how replays work, not a count of the person's replays.
const GENERIC_CUE = /\b(?:often|usually|sometimes|can|could|may|might|tends? to|by the|every|any|most|many)\b/iu;
const REPEAT_ORDINAL = /\b(?:third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|twentieth|fiftieth|hundredth|\d+(?:rd|th))(?: [\p{L}'-]+)? (?:replays?|re-?runs?|run-throughs?|times?|go|goes|attempts?|tries|pass|passes|listens?|reads?|looks?|rewrites?|versions?|drafts?|rounds?|loops?|retellings?)\b/giu;
const SECOND_PERSON = /\byou(?:r|rs|rself|'ve|'re|'d|'ll)?\b/iu;
const VAGUE_QUANTITY = /\b(?:a|one) (?:hundred|thousand|million|dozen)\b(?= (?:\w+ )?(?:things|reasons|ways|times|explanations|possibilities|thoughts|details|moments|ordinary|other|little|small|different|tiny)\b)|\b(?:hundreds|thousands|millions|dozens)\b/giu;
const QUOTED_IN_INPUT = /"([^"]{1,120})"|(?<![\p{L}\p{N}])'((?:[^']|'(?=\p{L}))+?)'(?![\p{L}\p{N}])/gu;
// Well-known short phrases people report without quote marks: "I told him I
// loved him" is three words ("I love you"), "she said we need to talk" four.
const KNOWN_PHRASES = [
  [/\bi (?:love|loved) (?:you|him|her|them)\b/iu, 3], [/\bi (?:miss|missed|hate|hated) (?:you|him|her|them)\b/iu, 3],
  [/\bwe need(?:ed)? to talk\b/iu, 4], [/\bcan we talk\b/iu, 3], [/\bi(?:'m| am) sorry\b/iu, 2], [/\bsaid sorry\b|\bapologi[sz]ed\b/iu, 1],
  [/\bit(?:'s| is) over\b/iu, 2], [/\bthank you\b/iu, 2], [/\bsaid thanks\b/iu, 1],
];

// Units a number can count. Two numbers counting the same unit must agree.
const UNIT_CLASSES = /** @type {const} */ ([
  ['minute', /^(?:minutes?|mins?)$/u], ['hour', /^(?:hours?|hrs?)$/u], ['day', /^days?$/u], ['night', /^(?:nights?|evenings?)$/u],
  ['week', /^weeks?$/u], ['month', /^months?$/u], ['year', /^(?:years?|yrs?)$/u],
  ['attempt', /^(?:times?|tests?|attempts?|tries|try|goes|resits?|retakes?)$/u],
]);
/** @param {string} w */
const unitClassOf = (w) => UNIT_CLASSES.find(([, re]) => re.test(w.toLowerCase()))?.[0] ?? null;
const UNIT_GAP_STOP = new Set(['of', 'or', 'and', 'to', 'in', 'on', 'at', 'more', 'less', 'other', 'than', 'a', 'an', 'the', 'for', 'by', 'from', 'with', 'per', 'you', 'your', 'it', 'is', 'was']);
const UNIT_BEFORE = /\b(tests?|attempts?|tries|resits?|retakes?|goes|week|day|year|month)\s+(?:number\s+|no\.\s*)$/iu;
/**
 * The unit a number counts: "two weeks", "a five-hour wait", "three failed
 * tests", "the third time", "test number four", "twice".
 * @param {import('./text.js').NumberToken} tok @param {string} s
 */
function unitOf(tok, s) {
  if (tok.kind === 'times') return 'attempt';
  const m = /^(?:-|\s+)([\p{L}']+)(?:(?:-|\s+)([\p{L}']+))?/u.exec(s.slice(tok.end));
  if (m) {
    const u1 = unitClassOf(m[1]);
    if (u1) return u1;
    if (m[2] && !UNIT_GAP_STOP.has(m[1].toLowerCase())) { const u2 = unitClassOf(m[2]); if (u2) return u2; }
  }
  const before = UNIT_BEFORE.exec(s.slice(0, tok.start));
  return before ? unitClassOf(before[1]) : null;
}

/**
 * The person's numbers: every value they wrote, the word count of a phrase
 * they quoted (or a well-known one they reported: "told him I loved him"),
 * and, per unit, the values they gave for it.
 * @param {string} input (tidied)
 */
function inputNumbers(input) {
  const values = new Set();
  /** @type {Map<string, number[]>} */
  const units = new Map();
  for (const tok of numberTokens(input)) {
    if (tok.value === null) continue;
    values.add(tok.value);
    const u = unitOf(tok, input);
    if (u) units.set(u, [...(units.get(u) || []), tok.value]);
  }
  for (const m of input.matchAll(QUOTED_IN_INPUT)) {
    const n = wordCount(m[1] ?? m[2] ?? '');
    if (n > 0) values.add(n);
  }
  for (const [re, n] of KNOWN_PHRASES) if (/** @type {RegExp} */ (re).test(input)) values.add(/** @type {number} */ (n));
  return { values, units };
}

/**
 * Spans of a sentence that are about the future, not the situation (see above).
 * @param {string} s @param {{ action: boolean, vantage: boolean }} where
 */
function futureSpans(s, where) {
  /** @type {{ start: number, end: number }[]} */
  const out = [];
  /** @param {RegExp} re @param {boolean} [guard] */
  const add = (re, guard = false) => {
    for (const m of s.matchAll(re)) {
      const start = m.index ?? 0;
      const end = start + m[0].length;
      const rest = s.slice(end);
      // "the three times you were late" names past occasions; "the three
      // things you most wanted" is still a choice to make.
      const definite = /\bthe\s*$/iu.test(s.slice(0, start));
      if (PAST_MARK.test(rest) || (guard && (THIRD_PAST.test(rest) || (definite && YOU_PAST.test(rest) && !SELECTION.test(rest))))) continue;
      out.push({ start, end });
    }
  };
  if (where.action) {
    add(FORWARD_BOX);
    add(ACTION_COUNT, true);
    add(ACTION_RANGE, true);
    add(REPEAT_ACTION, true);
    add(CLOCK_TIME);
  }
  if (where.vantage) add(VANTAGE);
  return out;
}

/** @param {keyof typeof LABEL} field */
function mindsMessage(field) {
  if (field === 'known_fact') {
    return 'known_fact adds a guess about what someone else thinks, feels or intends. Restate what the person told you, plainly and in their own terms ("Your girlfriend forgot your anniversary"); where it is their reading of someone\'s feelings, say it as theirs ("You said your mum is angry with you", "It feels like nobody likes you"). Add no motives, and never cast doubt on what they said happened.';
  }
  return `${LABEL[field]} states what someone else thinks, feels or intends as fact. Restating what the person told you is fine (as theirs: "You said…", "It feels like…"); a new guess about anyone's mind must be one possibility among others ("might", "could") or a question. Never cast doubt on what the person said happened.`;
}

const ON_READ = /\bon (?:read|seen|delivered)\b/iu;
// One particular person, named by role or pronoun ("my boyfriend", "she").
const NAMED_PERSON = /\b(?:he|she|him|her|his|boss|manager|partner|boyfriend|girlfriend|husband|wife|friend|best friend|colleague|mum|mom|dad|mother|father|sister|brother|son|daughter|teacher|tutor|flatmate|housemate|ex|nephew|niece|aunt|auntie|uncle|cousin|nan|gran|grandma|grandad|doctor|landlord|neighbou?r)\b/iu;
const CONTACT_PERSON = /\b(?:ask|asking|tell|telling|text|texting|message|messaging|call|calling|ring|ringing|email|emailing|write to|writing to|talk to|talk with|talking to|speak to|speak with|speaking to|check with|check in with|raise it with|bring it up with|meet up with|catch up with|hear from|heard from|reply to|answer)\s+(?:him|her)\b/iu;
const PLANNED_TALK = /\b(?:need(?:s|ed)? to talk|can we talk|wants? to (?:see|talk to|speak to|speak with|meet) (?:me|us)|asked to see (?:me|us)|(?:would not|wouldn't|won't|will not|didn't|did not) (?:say|tell me|explain)|called me in|have a chat)\b/iu;
const TALK_REF = /\b(?:the|that|this|a|your|their|his|her) (?:conversation|chat|talk)\b/iu;
const GENERIC_LINE = /\b(?:every|any|all|always|life|whatever|everyone|everybody|anything)\b/iu;
const STOP_SHORT = new Set(['a', 'i', 'an', 'am', 'as', 'at', 'be', 'by', 'do', 'go', 'he', 'if', 'in', 'is', 'it', 'me', 'my', 'no', 'of', 'oh', 'ok', 'on', 'or', 'so', 'to', 'up', 'us', 'we']);
const ABSOLUTES = new Set(['nobody', 'everyone', 'everybody', 'always', 'never', 'nothing', 'everything', 'anyone', 'noone']);

/**
 * @typedef {{ code: string, field: string, message: string }} GateFailure
 * @typedef {{ subtitle_line_1: string, subtitle_line_2: string, reasoning_pattern?: string }} PreviousAngle
 */

/**
 * @param {import('./schema.js').Scene} scene
 * @param {{ text: string, previous?: PreviousAngle[], emotion?: string | null }} ctx
 * @returns {{ pass: boolean, failures: GateFailure[], stats: { words: number, line1: number, line2: number } }}
 */
export function qualityGate(scene, ctx) {
  /** @type {GateFailure[]} */
  const failures = [];
  const seen = new Set();
  /** @param {string} code @param {string} field @param {string} message */
  const fail = (code, field, message) => {
    const k = `${code}|${field}`;
    if (!seen.has(k)) { seen.add(k); failures.push({ code, field, message }); }
  };
  const input = tidy(ctx.text);
  const inputLower = input.toLowerCase();
  const inputWords = new Set(words(input).map((w) => w.toLowerCase().replace(/’/g, "'")));
  const info = inputInfo(input);
  const inputNums = inputNumbers(input);
  const heavy = HEAVY_EMOTIONS.has(scene.emotion) || HEAVY_EMOTIONS.has(ctx.emotion || '') || scene.situation_type === 'loss';

  // 1. Shape of the two subtitle lines.
  const l1 = scene.subtitle_line_1;
  const l2 = scene.subtitle_line_2;
  const n1 = wordCount(l1);
  const n2 = wordCount(l2);
  const total = n1 + n2;
  for (const [field, line, n] of /** @type {const} */ ([['subtitle_line_1', l1, n1], ['subtitle_line_2', l2, n2]])) {
    const s = sentences(line);
    if (s.length !== 1) fail('line_sentence_count', field, `${LABEL[field]} must be exactly one sentence (it has ${s.length}).`);
    if (n > LIMITS.lineMax) fail('line_too_long', field, `${LABEL[field]} has ${n} words; keep each line to ${LIMITS.lineMax} words or fewer.`);
    if (n < LIMITS.lineMin) fail('line_too_short', field, `${LABEL[field]} is too short to say anything specific.`);
    if (!/[.?!]["')\]]*$/u.test(line)) fail('line_unfinished', field, `${LABEL[field]} must end with a full stop or question mark.`);
    if ((line.match(/\?/g) || []).length > 1) fail('too_many_questions', field, `${LABEL[field]} asks more than one question.`);
  }
  if (total > LIMITS.totalMax) fail('too_long', 'lines', `The two lines have ${total} words together; the limit is ${LIMITS.totalMax}. Aim for ${LIMITS.aimMin}–${LIMITS.aimMax}: one idea per line, plain words, no restating what they told you.`);
  if (total < LIMITS.totalMin) fail('too_short', 'lines', `The two lines have only ${total} words together; use ${LIMITS.totalMin}–${LIMITS.totalMax} so they say something specific.`);
  const bangs = (`${l1} ${l2}`.match(/!/g) || []).length;
  if (bangs > 1 || (heavy && bangs > 0)) fail('exclamation', 'lines', heavy ? 'No exclamation marks on a painful subject.' : 'Use at most one exclamation mark.');
  if (/\p{Extended_Pictographic}/u.test(`${l1}${l2}`)) fail('emoji', 'lines', 'No emoji.');

  // 2. Shape of the explore fields (shown when the person explores).
  for (const field of EXPLORE_FIELDS) {
    const v = scene[field];
    if (!v) continue;
    const n = wordCount(v);
    const max = LIMITS.field[field];
    if (n > max) fail('field_too_long', field, `${field} has ${n} words; keep it to ${max} or fewer.`);
    if (sentences(v).length > 1) fail('field_sentences', field, `${field} must be a single sentence.`);
    if (/\p{Extended_Pictographic}/u.test(v)) fail('emoji', field, 'No emoji.');
  }

  // 3. Content rules on everything the person may read.
  for (const field of VISIBLE_FIELDS) {
    const v = scene[field];
    if (!v) continue;
    const t = tidy(v);
    for (const rule of RULES) {
      if (!rule.re.test(t)) continue;
      // A word the person used themselves (a friend called Claude) is theirs.
      if (rule.unlessInInput && rule.unlessInInput.test(input)) continue;
      fail(rule.code, field, rule.message);
    }
    // Other people's minds stated as fact.
    // A hedge covers its own clause and what follows it, until "but", a
    // semicolon or a dash starts a new claim.
    // Quoting the person's own words is not a claim, so quoted spans are skipped.
    // known_fact and line 1 may restate what the person said happened.
    const echo = ECHO_FIELDS.has(field) ? info : null;
    for (const s of sentences(t)) {
      if (/\?["')\]]*$/.test(s)) continue;
      const unquoted = s.replace(/"[^"]*"|“[^”]*”|‘[^’]*’/g, ' … ');
      if (claimsOthersMinds(expand(unquoted), echo)) fail('claims_others_minds', field, mindsMessage(field));
    }
    // The harsh label, repeated or flatly denied.
    // A label inside quotes is the person's own word, quoted.
    // Each use of the label is checked on its own: a frame covers the use it
    // ends on ("…as proof you're stupid"), not another one in the same field.
    const tq = t.replace(/"[^"]*"/g, ' … ');
    const covers = [...tq.matchAll(LABEL_FRAME), ...tq.matchAll(LABEL_CONTRAST)].map((m) => (m.index ?? 0) + m[0].length);
    const lab = [...tq.matchAll(LABEL_RE)].find((m) => !covers.includes((m.index ?? 0) + m[0].length));
    if (lab) {
      fail(lab[1] ? 'counter_label' : 'label_echo', field, lab[1]
        ? 'Do not simply deny the harsh label ("you\'re not useless"); show what the evidence actually measures instead.'
        : 'Never apply a harsh label to the person.');
    }
    // British spelling.
    for (const raw of words(t)) {
      const w = raw.toLowerCase().replace(/’/g, "'");
      if (inputWords.has(w)) continue;
      const american = (AMERICAN.some((re) => re.test(w)) && !IZE_ALLOW.has(w)) || AMERICAN_WORDS.has(w);
      if (american) { fail('american_spelling', field, `Use British spelling ("${raw}" is American spelling).`); break; }
    }
    if (PRACTICE_VERB.test(t) && !/practice/i.test(inputLower)) fail('american_spelling', field, 'Use British spelling: "practise" is the verb.');
    // Invented details: numbers presented as facts, and names, that the
    // person never gave (see "invented details: numbers" above).
    const isLine = field === 'subtitle_line_1' || field === 'subtitle_line_2';
    numbers: for (const s of sentences(t)) {
      const action = field === 'practical_next_step' || (isLine && ACTION_CUE.test(s));
      const skip = futureSpans(s, { action, vantage: field !== 'known_fact' });
      for (const m of s.matchAll(VAGUE_QUANTITY)) skip.push({ start: m.index ?? 0, end: (m.index ?? 0) + m[0].length });
      // Only in a general remark: a clause about "you" counting their replays is a fact.
      if (field !== 'known_fact' && GENERIC_CUE.test(s)) {
        let at = 0;
        for (const cl of s.split(/(?=[,;])/)) {
          if (!SECOND_PERSON.test(cl)) for (const m of cl.matchAll(REPEAT_ORDINAL)) skip.push({ start: at + (m.index ?? 0), end: at + (m.index ?? 0) + m[0].length });
          at += cl.length;
        }
      }
      let x = s;
      for (const sp of skip) x = x.slice(0, sp.start) + '·'.repeat(sp.end - sp.start) + x.slice(sp.end);
      for (const tok of numberTokens(x)) {
        if (tok.value === null) continue;
        const unit = unitOf(tok, x);
        const theirs = unit ? inputNums.units.get(unit) : undefined;
        if (theirs && tok.value !== 1) {
          // Their unit: the same value, or an ordinal naming an earlier one.
          if (theirs.includes(tok.value) || (tok.kind === 'ordinal' && tok.value <= Math.max(...theirs))) continue;
          fail('invented_detail', field, `Do not change the details the person gave: they gave ${theirs.join(' and ')} for this, not "${tok.raw}". Use their numbers, or none.`);
          break numbers;
        }
        if (tok.value === 1 || tok.value === 2 || inputNums.values.has(tok.value)) continue;
        fail('invented_detail', field, `Do not add details the person did not give (the number "${tok.raw}"). A small count or a time span inside a suggested step is fine.`);
        break numbers;
      }
    }
    names: for (const s of sentences(t)) {
      const action = field === 'practical_next_step' || (isLine && ACTION_CUE.test(s));
      for (const m of s.matchAll(/[\p{L}][\p{L}'’&-]*/gu)) {
        const w = m[0];
        const at = m.index ?? 0;
        if (!/^\p{Lu}/u.test(w)) continue;
        // "Saturday's argument" is Saturday; "Monday's interview" is Monday.
        const lw = w.toLowerCase().replace(/’/g, "'").replace(/'s?$/u, '');
        const before = s.slice(0, at);
        // A day, month or holiday is theirs, or the time of a suggested step ("by Friday").
        const holiday = DATE_WORDS.has(lw) || (lw === 'new' && /^New Year\b/u.test(s.slice(at)));
        if (holiday) {
          if (inputLower.includes(lw === 'new' ? 'new year' : lw)) continue;
          if (action && DATE_PREP.test(before)) continue;
          fail('invented_detail', field, `Do not add a day or date the person did not give ("${w}").`);
          break names;
        }
        if (at === 0) continue;
        if (SENTENCE_START_OK.has(lw) || COMMON_CAPS.has(lw) || inputWords.has(lw) || inputLower.includes(lw)) continue;
        if (/[:"“'‘]\s*$/.test(before)) continue;
        fail('invented_detail', field, `Do not add names or details the person did not give ("${w}").`);
        break names;
      }
    }
  }

  // 4. Engagement with the person's actual situation.
  const inputStems = contentStems(input);
  // "Left me on read" is about a message, though no word says so.
  if (ON_READ.test(input)) inputStems.add(stem('message'));
  const lineStems = contentStems(`${l1} ${l2}`);
  const inputAbs = [...inputWords].filter((w) => ABSOLUTES.has(w.replace(/'/g, '')));
  const quoted = [...`${l1} ${l2}`.matchAll(/["“‘']([^"”’']{2,40})["”’']/gu)].some((m) => inputLower.includes(m[1].toLowerCase()));
  const absRef = inputAbs.some((w) => new RegExp(R`\b${w}\b`, 'i').test(`${l1} ${l2}`));
  // Contacting the one person they named ("check with him in person", "ask
  // her what happened") engages with the situation; a pronoun alone does not
  // ("Life is hard, for her and for you").
  const personRef = NAMED_PERSON.test(input) && CONTACT_PERSON.test(`${l1} ${l2}`);
  // A talk the person reported ("we need to talk", "wants to see me", "wouldn't
  // say why") is met by "the conversation" or "a chat" in a line that is not
  // a general remark ("Every conversation is a chance…" is not about theirs).
  const talkRef = PLANNED_TALK.test(input) && [l1, l2].some((l) => TALK_REF.test(l) && !GENERIC_LINE.test(l));
  let overlap = 0;
  for (const s of allStems(`${l1} ${l2}`)) if (inputStems.has(s)) overlap++;
  if (inputStems.size >= 2 && overlap === 0 && !quoted && !absRef && !personRef && !talkRef) {
    fail('not_specific', 'lines', 'The lines do not mention anything from the person\'s situation; refer to the concrete details they gave (the people, the event, their words).');
  }
  if (inputStems.size >= 1) {
    let factOverlap = 0;
    for (const s of allStems(scene.known_fact)) if (inputStems.has(s)) factOverlap++;
    // Short details count too: "You got a B." for "I got a B and…".
    for (const w of words(scene.known_fact)) {
      const lw = w.toLowerCase();
      if (lw.length <= 2 && !STOP_SHORT.has(lw) && inputWords.has(lw)) factOverlap++;
    }
    if (factOverlap === 0) fail('fact_not_from_text', 'known_fact', 'known_fact must restate what the person actually said happened, in terms of their own details.');
  }

  // 5. Novelty against angles already shown (brief §8: "genuinely different").
  //  * The mechanic follows the pattern, so a pattern already shown would
  //    replay a scene the person has played: every earlier angle's pattern is
  //    off limits (word overlap cannot see a paraphrase).
  //  * Meaning: the words each angle adds beyond the person's own (which
  //    every angle may name) and beyond framing words ("fact", "question").
  //    Sharing several of them is saying the same new thing again, however
  //    the sentences are built.
  //  * The old whole-line checks stay as a backstop.
  const previous = ctx.previous || [];
  const usedPatterns = [...new Set(previous.map((p) => p.reasoning_pattern).filter(Boolean))];
  const newMeaning = meaningStems(`${l1} ${l2}`, inputStems);
  previous.forEach((p, i) => {
    const prevText = `${p.subtitle_line_1} ${p.subtitle_line_2}`;
    const prevStems = contentStems(prevText);
    const sim = jaccard(lineStems, prevStems);
    const lineSim = Math.max(
      ...[l1, l2].flatMap((a) => [p.subtitle_line_1, p.subtitle_line_2].map((b) => jaccard(contentStems(a), contentStems(b)))),
    );
    const prevMeaning = meaningStems(prevText, inputStems);
    const shared = [...newMeaning].filter((s) => prevMeaning.has(s));
    const meaningSim = jaccard(newMeaning, prevMeaning);
    const n = previous.length > 1 ? `angle ${i + 1}` : 'the angle just shown';
    if (p.reasoning_pattern && p.reasoning_pattern === scene.reasoning_pattern) {
      fail('repeats_previous', 'lines', `This angle uses the same reasoning_pattern (${scene.reasoning_pattern}) as ${n}, so the app would replay the same scene the person has already played. Use a different reasoning_pattern from every earlier angle (not ${usedPatterns.join(', ')}), with its matching interaction_type, that still fits the situation, and look through a different lens in new words.`);
    } else if ((shared.length >= LIMITS.meaningShared && meaningSim >= LIMITS.meaningSimilarity) || (shared.length >= 2 && meaningSim >= LIMITS.meaningSimilarityPair)) {
      const echoed = words(`${l1} ${l2}`).filter((w) => shared.includes(stem(w)));
      fail('repeats_previous', 'lines', `This angle says what ${n} already said, in other words (it repeats "${[...new Set(echoed.map((w) => w.toLowerCase()))].slice(0, 4).join('", "')}"). Look through a different lens (${LENSES.join('; ')}) and offer a different question or action.`);
    } else if (sim >= LIMITS.repeatSimilarity || lineSim >= LIMITS.repeatLineSimilarity || tidy(p.subtitle_line_1).toLowerCase() === tidy(l1).toLowerCase()) {
      fail('repeats_previous', 'lines', 'This angle repeats one the person has already seen; offer a genuinely different, still-accurate perspective (a different pattern, lens, question or action).');
    }
  });

  return { pass: failures.length === 0, failures, stats: { words: total, line1: n1, line2: n2 } };
}

// Run the whole gate twice while the module loads. V8 compiles each regular
// expression on first use (and again to native code on the next), and the
// gate has a few hundred; doing it here moves roughly 100 ms of CPU out of
// the first request in a fresh Worker isolate and into its startup budget.
// Two different samples so every rule, claim pattern and the novelty check run.
export function warmGate() {
  /** @type {import('./schema.js').Scene} */
  const scene = {
    emotion: 'anxiety', situation_type: 'relationship', reasoning_pattern: 'fact_vs_assumption', interaction_type: 'pull_apart',
    mallow_character: 'zuzu', safety_status: 'ok', known_fact: 'Your message has gone five hours without a reply.',
    possible_assumption: 'You might be reading the silence as a sign of how he feels.',
    alternative_angle: 'Some people find it hard to reply, and your boss may not have seen it.',
    practical_next_step: 'Decide on a time to check again in the next twenty minutes.',
    subtitle_line_1: 'Five hours without a reply is a fact, not a verdict on you.',
    subtitle_line_2: 'What it means is still an unanswered question, for the third time today?',
  };
  const previous = [{ subtitle_line_1: 'Waiting is hard.', subtitle_line_2: 'He will reply when he likes the photo.', reasoning_pattern: 'rumination' }];
  qualityGate(scene, { text: "He hasn't replied to my message for 5 hours. Nobody likes me.", previous, emotion: 'anxiety' });
  qualityGate({ ...scene, subtitle_line_1: 'Your teachers think you are lazy, on purpose.', subtitle_line_2: 'She has no respect for the people who care about you.' }, { text: 'My boss rewrote my report for the second time.', previous });
}
warmGate();
