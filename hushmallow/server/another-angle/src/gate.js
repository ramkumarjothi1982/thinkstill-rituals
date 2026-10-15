// Deterministic quality gate for an Another Angle scene (brief 2 §2, §3, §9).
//
// Runs after the scene has passed the strict schema. Every failure carries a
// stable code (for metadata logs) and a plain instruction (sent back to the
// model once, so the regeneration knows exactly what to fix). The gate never
// rewrites the model's words: a scene either passes or is regenerated, and
// after one failed regeneration the client falls back to the authored engine.

import { HEAVY_EMOTIONS } from './vocab.js';
import { LENSES, PATTERN_LENS } from './prompt.js';
import { tidy, words, wordCount, sentences, contentStems, allStems, meaningStems, jaccard, numberTokens, stem, plainStem, wordsAndParts, STOPWORDS, BROAD_SYNONYMS, IRREGULAR as TEXT_IRREGULAR } from './text.js';

export const LINE_FIELDS = /** @type {const} */ (['subtitle_line_1', 'subtitle_line_2']);
export const EXPLORE_FIELDS = /** @type {const} */ (['known_fact', 'possible_assumption', 'alternative_angle', 'practical_next_step']);
export const VISIBLE_FIELDS = /** @type {const} */ ([...LINE_FIELDS, ...EXPLORE_FIELDS]);

export const LIMITS = Object.freeze({
  totalMin: 15, totalMax: 35, lineMax: 22, lineMin: 3,
  field: { known_fact: 20, possible_assumption: 20, alternative_angle: 24, practical_next_step: 20 },
  repeatSimilarity: 0.5, repeatLineSimilarity: 0.6,
  // Lines that share only the person's own words count as a repeat when they
  // share this many of them (the event restated: "In front of the team, your
  // boss criticised the report you wrote" after "Your boss criticised your
  // report in front of the whole team", five of their words at 0.71), or are
  // this close (near-verbatim). Three of their words at 0.6 can be a new
  // point (run 3, ho-cancelled: "Three cancellations in one month is a lot to
  // carry" after "Being cancelled on three times this month would hurt
  // almost anyone"); among the follow-ups the gate accepted in runs 1–3 the
  // closest line pair is 0.50 (four of their words).
  repeatRestated: 4, repeatVerbatim: 0.8,
  // Novelty on meaning-bearing words (eval runs 1 and 2: real follow-ups
  // shared at most one; close paraphrases three or more at a Jaccard of 0.27
  // and up). A backstop for near-verbatim repeats only: it cannot see the same
  // point made in other words, which the judge measures (README).
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

// Third parties whose minds must never be described as fact (also used by
// the condescending rule: "a friend who cares" is no shrug).
const OTHER_NOUNS = ['boss(?:es)?', 'managers?', 'partners?', 'boyfriends?', 'girlfriends?', 'husband', 'wife', 'friends?', 'colleagues?', 'co-?workers?', 'mums?', 'moms?', 'dads?', 'mothers?', 'fathers?', 'sisters?', 'brothers?', 'family', 'teachers?', 'tutors?', 'lecturers?', 'coach(?:es)?', 'ex(?:es)?', 'team', 'flatmates?', 'housemates?', 'roommates?', 'date', 'crush', 'sons?', 'daughters?', 'parents?', "parents' friends", 'classmates?', 'mates?', 'landlord', 'clients?', 'customers?', 'neighbou?rs?', 'in-laws', 'kids', 'children', 'cousins?', 'grandparents', 'nan', 'gran', 'auntie', 'aunt', 'uncle', 'examiners?', 'interviewers?', 'audience', 'group', 'class', 'followers'];
const OTHER_NOUN_SRC = OTHER_NOUNS.join('|');

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
      R`it(?:'s| is) (?:simply|clearly) (?:not|nothing)`, R`silly`, R`just (?:study|try|work|revise|practi[sc]e) harder`, R`not that deep`, R`calm down`, R`just relax`, R`chill out`, R`no big deal`, R`not a big deal`, R`not that big a deal`, R`it doesn'?t matter`, R`you(?:'re| are) fine`, R`first[- ]world problem`,
      // "Who cares?" is a shrug wherever it stands ("In the end who cares how
      // many came?", "Three people came and who cares about the rest?", "Who
      // cares about you crying at work?"). Only a "who cares" that names the
      // people who care is kind, and only right after: "not" ("…tells you who
      // could make that evening, not who cares"), "of" or "about", a verb that
      // shows, finds out or asks it ("shows you who cares", "find out who
      // cares", "ask yourself who cares"),
      // or the person it describes ("someone who cares"); and "who cares
      // most" in a real either/or question ("…, the ones who came or the ones
      // who could not?").
      R`(?<!\b(?:not|of|about|(?:shows?|showed|shown|tells?|told|counts?|counted|sees?|saw|seen|see|knows?|knew|known|learns?|learned|learnt|find out|finds out|found out|finding out|notices?|noticed|reveals?|revealed|proves?|proved|measures?|measured|ask|asks|asked|asking|wonder|wondering|remember)(?: you| them| us| me| him| her| yourself)?|someone|somebody|anyone|anybody|everyone|everybody|one|person|people|the ones?|${OTHER_NOUN_SRC})\s)who(?: (?:on earth|even|really|actually|honestly|else|exactly|ever|truly|seriously))* cares\b(?!\s+(?:most|more)\b[^.?!]*\bor\b[^.?!]*\?)`,
      // Telling them what they ought to know already: "You should know by now…".
      R`you should (?:already |really |surely |honestly )?(?:know|realise|realize|understand) (?:that|by now|better|this|how|why)\b`, R`you should (?:already |really )?know by now`]),
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

const OTHERS = R`(?:he|she|they|(?:your|their|his|her) (?:${OTHER_NOUNS.join('|')})|(?:the|those) people (?:around|in|at|near|close to|with) (?:you|your [\p{L}'-]+)|(?:most|all|the) people|everyone|everybody|nobody|no one|no-one|people|others|other people)`;
const ADVS = R`(?: (?:definitely|really|just|probably|certainly|surely|actually|only|still|totally|secretly|likely|simply|honestly|genuinely|clearly|obviously|even|already|always|never))*`;
// Mental verbs: "he loves you", "she must hate me", "they don't care".
const MIND_VERB = R`(?:loves?|loved|enjoys?|enjoyed|needs? (?:a bit of |some |more |a little |a lot of |plenty of )?(?:space|time|you|rest|quiet|a break|a day|a moment|a minute|a while|a hug|a sorry|an apology|to (?:hear|know|feel|be|see|talk|calm|cool|think))|needed (?:space|time|you|a break|to (?:hear|know|feel|be|see|talk))|liked?|likes|cares?|cared|hates?|hated|resents?|respects?|values?|admires?|misses|missed|wants?|wanted|meant|means (?:it|to|well)|mean (?:it|to|well|anything by it|any harm)|rates? you|rated you|thinks? (?:highly|the world) of|intended|intends|feels?|felt|thinks?|thought|knows?|knew|forgot|forgets|noticed|notices|notice|remembers?|remembered|judges?|judged|blames?|blamed|trusts?|trusted|tried to|ignored|ignores?|minds?|minded|regrets?|appreciates?|appreciated|prefers?|preferred|favou?rs?|favou?red|adores?|envies|envied|dislikes?|disliked|understands?|understood|realises?|realised|realizes?|realized|forgives?|forgave)`;
// Mental states need a linking verb: "she is annoyed", "he was just busy".
const MIND_STATE = R`(?:annoyed|angry|upset|mad|disappointed|proud|jealous|threatened|insecure|busy|stressed|distracted|overwhelmed|happy|fine|okay|interested|bored|embarrassed|hurt|sorry|over it|ignoring|avoiding|judging|thinking|trying to|testing|punishing|annoyed with|fed up|worried|scared|afraid|anxious|nervous|concerned|protective|ashamed|tired|exhausted|lonely|sad|grieving|struggling|going through something|joking|teasing|kidding|messing about|messing around|being playful|being kind|being honest|being nice|impressed|pleased|grateful|thankful|in love|attracted|threatened by you|intimidated|envious)`;
// A short phrase may sit between the person and the verb: "everyone at that dinner was judging you".
const PP = R`(?: (?:at|in|on|from|around|across|with|near|close to) (?:(?:the|that|this|your|their|his|her|a|an) [\p{L}'-]+(?: [\p{L}'-]+)?|you|work|school|home|uni|college))?`;
// Groups: 1 the person, 2 auxiliaries and negation, 3 the mind word.
const CLAIM_G = new RegExp(R`\b(${OTHERS})${PP}${ADVS}((?: does| did| do| will| would| must| has| have| had| can)?(?: not| never)?)${ADVS} (${MIND_VERB})\b`, 'giu');
const STATE_G = new RegExp(R`\b(${OTHERS})${PP}((?: is| are| was| were| will be| would be| must be| has been| have been| had been| seems to be)(?: not| never)?)${ADVS} (${MIND_STATE})\b`, 'giu');
const OTHERS_RE = new RegExp(R`\b${OTHERS}\b`, 'iu');
const OTHERS_G = new RegExp(R`\b(${OTHERS})\b`, 'giu');
const COORD_HINT = /\b(?:and|then|so)\b/iu;
// A mind word joined to a restated event with the same subject ("…noticed and thinks…").
const COORD_MIND = new RegExp(R`^(?: [\p{L}'-]+){0,4}? (?:and|then|so)${ADVS}(?: does| did| do)?(?: not| never)?${ADVS} (${MIND_VERB}|(?:is|was|are|were)(?: not)?${ADVS} ${MIND_STATE})\b`, 'iu');
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
const LIKE_WORDS = new Set(['like', 'liked', 'likes', 'liking', 'love', 'loved', 'loves']);
// "Often" and "usually" frame a typical reading, not a known one ("A slow
// reply often means she is busy"), as angle-v5 asks for reassurance that is
// likely but not known. Between a person and the mind word they are no hedge
// anyway: the claim patterns do not read "she often feels…" as a claim.
const HEDGE_SRC = String.raw`\b(?:may|might|could|can(?! not)|perhaps|possibly|maybe|often|usually|more often than not|if|whether|unless|whatever|not sure|do not know|don't know|can't know|cannot know|can not know|can't tell|cannot tell|no way to know|unclear|unknown|guess(?:ing)?|wonder|question|possibilit(?:y|ies)|possible|seems?|seemed|as if|does not prove|doesn't prove|is not proof|isn't proof|not proof|does not mean|doesn't mean|does not tell|doesn't tell|without knowing|has not said|hasn't said|have not said|haven't said|one reading|one explanation|explanations|interpretations?|story|stories|assum\w*|guesses|only (?:he|she|they|him|her|them) (?:knows?|can (?:say|tell|answer|explain)))\b`;
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
// …unless the verb before it takes the feeling as given: "does not change
// how much she values you" still says she values you.
const PRESUPPOSE_WH = /\b(?:change|changes|changed|affect|affects|alter|alters|reduce|reduces|lessen|lessens|erase|erases|undo|undoes|take away from|(?<!(?:not|never) )(?:shows?|showed|proves?|proved|reflects?))\s+(?:how|what)(?: much| far| deeply)?\s*$/iu;
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
 *
 * "They" that means a thing ("…until they feel familiar") is not a person
 * (thingPronouns). Returns the words that read as a claim, or null.
 * @param {string} sentence
 * @param {InputInfo | null} echo
 * @param {string} before what the person reads just before the sentence (line 1, for line 2), expanded
 * @returns {{ phrase: string, subject: string, thing: boolean } | null}
 */
function claimsOthersMinds(sentence, echo, before) {
  const s = thingPronouns(sentence, before);
  /** @param {string} clause @param {number} at @param {number} end @param {string} subject */
  // thing: "they" with a feeling or need a thing can also be said to have
  // ("they feel familiar", "they feel unfair"), so the message can say to
  // name the thing if one is meant; not "they are probably embarrassed".
  const hit = (clause, at, end, subject) => ({
    phrase: clause.slice(at, end).trim().split(/\s+/).slice(0, 8).join(' '), subject: subject.trim(),
    thing: /^(?:they|them)$/u.test(subject.trim()) && THING_VERB.test(clause.slice(at + subject.length).replace(PRONOUN_AUX, '')),
  });
  for (const seg of s.split(/;|—|–|\s-\s|\bbut\b|\bhowever\b|\bthough\b/)) {
    let leadIn = false;
    for (const clause of seg.split(/[,:]/)) {
      const hedged = HEDGE_RE.test(clause);
      const claims = [...clause.matchAll(CLAIM_G), ...clause.matchAll(STATE_G), ...clause.matchAll(HAVE_G), ...clause.matchAll(PREDICT_G)].map((m) => ({
        at: m.index ?? 0, end: (m.index ?? 0) + m[0].length, subject: m[1], neg: /not|never/.test(m[2] || ''), word: m[3],
      }))
        // "He liked a photo" reports something he did, not how he feels.
        .filter((c) => !(LIKE_WORDS.has(c.word.toLowerCase()) && POST_OBJECT.test(clause.slice(c.end))));
      for (const m of clause.matchAll(REL_G)) claims.push({ at: m.index ?? 0, end: (m.index ?? 0) + m[0].length, subject: m[1], neg: false, word: m[2] });
      // A mind word joined to something they did: "Your sister crossed a line and knew it."
      if (COORD_HINT.test(clause)) for (const m of clause.matchAll(OTHERS_G)) {
        const end = (m.index ?? 0) + m[0].length;
        const co = COORD_MIND.exec(clause.slice(end));
        if (co) claims.push({ at: m.index ?? 0, end: end + co[0].length, subject: m[1], neg: /\bnot\b|\bnever\b/.test(co[0]), word: co[1].split(' ').pop() || co[1] });
      }
      const motive = MOTIVE_RE.exec(clause);
      if (motive && OTHERS_RE.test(clause.slice(0, motive.index))) claims.push({ at: motive.index, end: motive.index + motive[0].length, subject: '', neg: false, word: 'motive' });
      const notPersonal = NOT_PERSONAL_RE.test(clause);
      if ((claims.length || notPersonal) && !leadIn) {
        if (notPersonal && !hedged) {
          const np = /** @type {RegExpExecArray} */ (NOT_PERSONAL_RE.exec(clause));
          return hit(clause, np.index, np.index + np[0].length, '');
        }
        // A hedge counts for a claim only when it comes first or inside it
        // ("If he is busy…"), not after it ("He is proud, even if…").
        const hedges = spans(HEDGE_G, clause);
        const attrib = spans(ATTRIB_G, clause);
        const negReport = spans(NEG_REPORT_G, clause);
        const report = echo && echo.report ? spans(REPORT_G, clause) : [];
        for (const c of claims) {
          const pre = clause.slice(0, c.at);
          if (hedges.some((h) => h.start < c.end) || (WH_BEFORE.test(pre) && !PRESUPPOSE_WH.test(pre))) continue;
          if (covered(attrib, clause, c.at) || covered(negReport, clause, c.at)) continue;
          if (echo && (echoes(c, echo) || covered(report, clause, c.at))) {
            // "Your manager noticed and thinks you are careless": the echo
            // covers what they reported, not a mind word joined on to it.
            const co = COORD_MIND.exec(clause.slice(c.end));
            if (co && !(EVENT_WORDS.has(co[1].toLowerCase()) && echo.roots.has(root(co[1])))) return hit(clause, c.at, c.end + co[0].length, c.subject);
            continue;
          }
          return hit(clause, c.at, c.end, c.subject);
        }
      }
      if (hedged && !claims.length && !notPersonal && !OTHERS_RE.test(clause)) leadIn = true;
    }
  }
  return null;
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
const DATE_PREP = /\b(?:by|before|until|till|on|this|next|over|for|from|at|after|around|in|during)\s*$/iu;

// The first word of a sentence is capitalised anyway, so there it is a name
// only when it is a common given name, or when it does what a person does:
// "Sarah may still be working out what to say", "Tom might need a day",
// "Ella's silence…". Pronouns, roles and everyday openers are not names.
const OPENERS = new Set(`i you he she it we they me him her us them this that these those there here the a an your my his her their our its
what which who why how when where if maybe perhaps only just even still sometimes often then so but and or not no yes both either neither
everyone everybody someone somebody anyone anybody nobody no-one nothing something anything everything people others all each some most many few none
one two three four five six seven eight nine ten mum mom dad nan gran grandma grandad grandpa mother father sister brother son daughter boss manager
partner friend friends colleague colleagues teacher family parents kids children auntie aunt uncle cousin wife husband girlfriend boyfriend ex flatmate
landlord doctor nurse today tonight tomorrow yesterday now time life work love silence distance sleep rest change space news school money home food
feedback waiting worry fear anger shame guilt grief luck hope`.split(/\s+/));
const NOT_A_NAME = /(?:ing|ness|tion|sion|ment|ity|ence|ance|ism|ship|hood|dom|ful|less|ly|ed)$/u;
const GIVEN_NAMES = new Set(`sarah emma emily olivia sophie sophia chloe charlotte jessica jess lucy hannah amy laura rachel rebecca becky megan katie kate lauren amelia
isla ava mia ella ellie zoe abigail alice anna georgia natalie claire helen karen lisa michelle nicola kelly jen jenny beth freya evie harriet phoebe imogen
rosie molly maya nina eva zara priya aisha fatima sunita tom tommy james jack harry oliver ollie charlie george william thomas daniel dan danny joshua josh
ben sam joe luke matt matthew david dave chris michael mike paul andrew andy steve john peter pete richard robert adam ryan liam noah leo oscar alfie archie
ethan jacob alex jamie freddie kyle connor callum lewis scott jordan aidan mohammed muhammad ali omar raj anil ahmed jake finn harvey theo arthur henry
edward louis toby dylan tyler kieran nathan jason gary kevin simon ian neil graham carl`.split(/\s+/));
const PERSON_PRED = /^\s+(?:(?:may|might|could|will|would|must|should)(?:\s+(?:still|just|not|never|also|really|probably|honestly|already))*\s+(?:be\s+[\p{L}]+ing|need|want|think|know|say|answer|reply|text|call|ring|message|come round|care|mind|miss|forgive|regret|wonder|worry|have (?:been|meant|wanted|thought|felt|seen|forgotten|said))\b|(?:has|had|is|was|does|did)(?:n't| not| never)?\s+(?:(?:still|just|probably|really|already|never)\s+)*(?:said|told|texted|replied|answered|called|rung|messaged|been in touch|got back|cancelled|invited|asked|forgotten|apologised|meant|busy|upset|angry|annoyed|hurt|cross|avoiding|ignoring|reply|text|call)\b|(?:said|says|told|texted|replied|answered|thinks|thought|feels|felt|knows|knew|wants|wanted|loves|loved|hates|hated|misses|missed|cancelled|invited|asked|forgot|cares|cared|meant|apologised|promised|admitted|agreed|decided|hasn't|didn't|won't|doesn't|isn't|wasn't)\b)/iu;
const PERSON_THING = /^\s+(?:silence|message|messages|text|texts|reply|replies|reaction|mood|side|view|words|answer|party|birthday|plans|friends|feelings|face|voice)\b/iu;

/**
 * Why a number counts as an invented fact, for the regeneration: the model is
 * told what made it a fact, not just that counts in steps are fine.
 * @param {import('./text.js').NumberToken} tok @param {number} from @param {FactSpan[]} facts
 */
function numberMessage(tok, from, facts) {
  const f = facts.find((sp) => tok.start >= sp.start && tok.end <= sp.end);
  const inStep = from >= 0 && tok.start >= from;
  let why;
  if (f) why = `${f.why}, so it reads as a fact about their situation${inStep ? ', not part of the step' : ''}`;
  else if (from < 0) why = 'here it reads as a fact about their situation';
  else if (tok.start < from) why = 'it comes before the suggestion, so it reads as a fact about their situation';
  else if ((tok.value ?? 0) > 10) why = 'only a small count (up to ten) or a time span ("for twenty minutes") reads as part of a step';
  else why = 'it does not count something to do or a length of time, so it reads as a fact about their situation';
  // What a second draft can do instead (run 3: told only that "three" read as
  // a fact, the regeneration dropped the count and tripped another check).
  const fix = inStep || from >= 0
    ? 'A suggested step may count what to do, with the count tied to the action ("write two lines", "say them out loud three times", "for ten minutes"), but it must not restate or add facts about what happened. Use their numbers, a count of what to do, or none.'
    : 'Use their numbers, or none; a count belongs only inside a suggested step, tied to what to do ("write two lines").';
  return `Do not add details the person did not give (the number "${tok.raw}"): ${why}. ${fix}`;
}

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
// A number is the person's detail when they gave it. Each number in a field is
// checked twice:
//  1. Against the person's own units, on the whole sentence: they said "two
//     weeks", so "three weeks" is wrong wherever it appears ("After three
//     weeks of silence…", "for three weeks"), and so is "three tests" after
//     "the second time", or "four friends" after "three people came". Only a
//     forward-looking time box ("give it another week", "spend twenty
//     minutes"), a vantage point ahead ("in five years' time"), a count of
//     people to contact ("invite two friends") and a repeat inside a step
//     ("say it three times") are left alone. An ordinal may name an earlier
//     one ("your second test" of three), and the next one may be looked at
//     ahead ("before booking test number four", "the third check is only in
//     your head" after "I checked twice").
//  2. Any other number they never gave is invented, apart from "one" and
//     "two", vague plurals ("hundreds of emails"), a general remark ("on the
//     tenth replay…") and what a suggested step says about the future.
//
// A suggested step is practical_next_step, or the part of a subtitle line from
// where it starts proposing something: an imperative clause ("Update your
// CV…", "…; now knock and offer him…") or a question that asks the person to
// do or choose something ("Could you…?", "Which… would you…?"). A question
// about the situation ("Did the six people in that meeting…?") is not one.
// Inside a step, these are about the future and not counted:
//  * a small count (up to ten) before a plural noun, with up to two words
//    between ("three things", "four cheap meals", "two or three people", "say
//    it three times");
//  * a time span: "for/over N minutes" (any unit up to weeks), "a
//    twenty-minute walk", "two evenings this week", or a forward-looking verb
//    with its time box ("spend twenty minutes", "wait 48 hours");
//  * a clock time with its marker ("until 9 tonight", "at 7.30").
// A count is a fact again when the words around it place it in the past:
// "the four friends who came", "the three colleagues who saw it", "the six
// people in that meeting", "the four strengths your manager praised", "three
// people came", "the last three", "which of the four…"; and a time span is a
// fact when a past or perfect verb leads up to it ("you've waited for three
// weeks"). Choosing from their past is still a step ("the three things you
// loved most", "three things that went well").

const NUM = R`(?:\d{1,3}(?:[.,]\d{1,2})?|(?:twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:-(?:one|two|three|four|five|six|seven|eight|nine))?|zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|a hundred|a dozen)`;
const SMALL_NUM = R`(?:[1-9]|10|one|two|three|four|five|six|seven|eight|nine|ten)`;
const TIME_UNIT = R`(?:minutes?|mins?|seconds?|hours?|hrs?|days?|evenings?|nights?|mornings?|afternoons?|weeks?|months?|breaths?)`;
// A forward-looking verb, then up to three words, then the time box.
const FORWARD_VERB = R`(?:spend|spending|take|taking|give (?:it|yourself|this|that|them|him|her)|allow (?:yourself|it)|set aside|set a timer for|wait|waiting|pause|stop|rest|sit|walk|breathe|step (?:away|back|out|outside)|put [\p{L}' ]{1,24}? (?:down|away|aside)|leave (?:it|this|that|them)|try (?:it|this|that)|keep (?:it|this|that) up|stay off|switch off|turn off|log off)`;
const FORWARD_BOX = new RegExp(R`\b${FORWARD_VERB}(?: (?!the\b|those\b|these\b|your\b)[\p{L}'-]+){0,3}? (?:for |about |around |roughly )?(?:the next |another |just |only |about |around |a full |at least |at most )?${NUM}(?:-| )${TIME_UNIT}\b`
  + R`|\b(?:for|in|within|over|during) the (?:next|coming|first) ${NUM} ${TIME_UNIT}\b`
  + R`|\b(?:another|one more) ${NUM} ${TIME_UNIT}\b|\b${NUM} more ${TIME_UNIT}\b`
  + R`|\bin (?:about |around )?${NUM} (?:minutes?|mins?|hours?)(?:'s?| time)?\b`, 'giu');
// Any time span inside a step: "for fifteen minutes", "over three evenings",
// "a twenty-minute walk", "a three-day buffer", "two evenings this week".
const SPAN_UNIT = R`(?:minutes?|mins?|seconds?|hours?|hrs?|days?|nights?|evenings?|mornings?|afternoons?|lunchtimes?|weeks?|weekends?)`;
const TIME_SPAN = new RegExp(R`\b(?:for|over|within|across|during)\s+(?:about |around |roughly |just |only |at least |at most |no more than |up to |a good )?${NUM}(?:-| )${SPAN_UNIT}\b`
  + R`|\b(?:a|an|one)\s+${NUM}-(?:minute|min|second|hour|day|night|evening|week)\b`
  + R`|\b${NUM}\s+(?:minutes|hours|days|nights|evenings|mornings|afternoons|lunchtimes|weekends)\b(?=\s+(?:this|next|a|each|per|every|out|off|before|until|till|over|in|of (?:your|the) (?:week|weekend|month))\b)`, 'giu');
// A small count of what to do. Never "times" (that is usually a count of
// occasions); see repeatCounts for "say it three times".
const ACTION_COUNT = new RegExp(R`\b${SMALL_NUM}(?: [\p{L}'-]+){0,2}? (?:things?|points?|questions?|lines?|sentences?|words?|examples?|reasons?|ways?|ideas?|items?|pieces?|moments?|steps?|names?|options?|bits?|breaths?|lessons?|notes?|parts?|wins?|strengths?|skills?|differences?|priorities|tasks?|choices?|bullet points?|minutes?|people|friends?|courses?|places?|flats?|jobs?|facts?|memories|photos?|messages?|texts?)\b`, 'giu');
const ACTION_RANGE = new RegExp(R`\b${SMALL_NUM} or ${SMALL_NUM}(?: [\p{L}'-]+){1,3}\b`, 'giu');
// Any small count before a plural noun, with up to two words between ("three
// cheap meals", "two short emails"): found word by word (countSpans below).
const COUNT_HEAD = new RegExp(R`\b${SMALL_NUM}\b`, 'giu');
const NOT_MODIFIER = new Set(`of the a an and or to in on at for from with by into onto about you your yours i me my he him his she her hers it its we us our they them their is was are were be been being has have had do did does will would can could may might should must shall this that these those more less than then times ago since before after so but if as all both each every any some no not there here who whom which what when where why how one two three four five six seven eight nine ten`.split(' '));
const NOT_PLURAL = new Set(`this his has was is its us yes less unless across always perhaps sometimes besides towards afterwards whereas thus plus minus news series means maths physics lens gas bus yours ours theirs hers does goes says gets makes takes needs wants keeps feels seems looks sounds lets puts tells asks gives means times its`.split(' '));
// Time units are counted as spans (TIME_SPAN, FORWARD_BOX), not as things to
// do, except the parts of a day or week a step can plan ("three evenings").
const SPAN_WORD = /^(?:minutes?|mins?|seconds?|hours?|hrs?|days?|nights?|weeks?|months?|years?|decades?)$/u;
// What a step picks out of their own past or present ("the three things that
// made you love it", "the two moments you were proud of"): a choice, not a
// count of what happened. People and occasions are not ("the four friends
// who came", "the three times you were late").
const SELECTION_NOUN = /^(?:things?|points?|questions?|lines?|sentences?|words?|examples?|reasons?|ways?|ideas?|items?|pieces?|moments?|steps?|bits?|lessons?|notes?|parts?|wins?|strengths?|skills?|differences?|priorities|tasks?|choices?|memories|details?|qualities|features?|habits?|costs?|bills?|expenses?|meals?|dinners?|options?)$/u;
/** @param {string} w */
const isPluralNoun = (w) => w.length >= 3 && /s$/u.test(w) && !/(?:ss|us|is|'s)$/u.test(w) && !NOT_PLURAL.has(w) && !SPAN_WORD.test(w);
// A clock time needs its marker: "after three" is not a time; "until 9 tonight" is.
const CLOCK_TIME = new RegExp(R`\b(?:at|by|until|till|before|after|from|around|about)\s+(?:\d{1,2}[:.]\d{2}(?:\s*(?:am|pm|a\.m\.|p\.m\.))?|${NUM}\s*(?:am|pm|a\.m\.|p\.m\.|o'clock)|${NUM}(?=\s+(?:tonight|tomorrow|this (?:evening|afternoon|morning)|today|on (?:mon|tues|wednes|thurs|fri|satur|sun)day)\b))(?![\p{L}\p{N}])|\b\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm)\b`, 'giu');
// A vantage point ahead of now (the distance-or-time lens). Never "after".
const VANTAGE = new RegExp(R`\bin (?:about |roughly |around )?${NUM} (?:weeks?|months?|years?)(?:'s?)? time\b|\b${NUM} (?:days?|weeks?|months?|years?) from (?:now|today)\b|\bin (?:about |roughly |around )?${NUM} (?:weeks?|months?|years?),? (?=(?:will|would|could|might|does|do|is|are|how|what|who|which|whether|you(?:'ll| will| might| may)|it(?:'ll| will| might| may)|this(?:'ll| will| might)|that(?:'ll| will| might)|anyone|anybody)\b)`, 'giu');

// What places a count in the past. Each is tried on the words after the count
// (THIRD_PAST, YOU_PAST, REL_PAST, IN_SITUATION, DIRECT_PAST) or before it
// (FACT_BEFORE, PAST_BEFORE).
const PAST_VERB = R`(?:came|went|saw|said|told|left|got|took|made|stayed|showed|turned up|laughed|noticed|watched|sat|stood|heard|knew|thought|felt|gave|sent|wrote|brought|forgot|met|ran|spoke|was|were|did|(?!(?:need|feed|speed|bleed|seed|heed|breed|proceed|succeed|exceed)\b)[\p{L}]{2,}ed)`;
// "the four strengths your manager praised", "…that he said".
const THIRD_PAST = new RegExp(R`^\s*(?:(?:that|which|who|when)\s+)?(?:(?:your|his|her|their|the|my|our) [\p{L}'-]+(?: [\p{L}'-]+)?|he|she|they|people|someone|everyone|everybody)\s+(?:[\p{L}'-]+ly\s+)?(?:had|has|have|did|was|were|said|told|gave|made|took|wrote|sent|thought|felt|knew|saw|left|got|brought|forgot|meant|chose|found|kept|showed|shown|[\p{L}]+ed)\b`, 'iu');
// "the three times you were late".
const YOU_PAST = /^\s*(?:(?:that|which|when)\s+)?you(?: have| had|'ve|'d)?\s+(?!most\b|best\b|really\b|would\b|could\b|might\b|want\b|like\b|love\b|need\b|can\b|will\b)(?:[\p{L}'-]+ly\s+)?(?:had|did|were|was|made|got|took|said|wrote|sent|forgot|missed|failed|lost|[\p{L}]+ed)\b/iu;
// "the four friends who came", "the ten people who did not come", "the three who laughed".
const REL_PAST = new RegExp(R`^\s*(?:[\p{L}'-]+\s+){0,2}?(?:who|that|which|whom)\s+(?:(?:all|both|really|actually|just|already|still|never|even)\s+)*(?:(?:did|didn't|had|hadn't|have|haven't|has|hasn't|was|wasn't|were|weren't)(?:\s+(?:not|never|all|already|just|really|even|been))?\s+[\p{L}'-]+|${PAST_VERB})\b`, 'iu');
// "the six people in that meeting", "the five people at the table".
const IN_SITUATION = /^\s*(?:[\p{L}'-]+\s+)?(?:in|at|from|on|during)\s+(?:that|the|this|those|your|his|her|their)\s+(?!(?:next|coming|list|card|page|phone|notes?|diary|calendar|fridge|wall)\b)/iu;
// "three people came", "two friends cancelled" (participles used as
// adjectives, "two meals based on…", are not events).
const DIRECT_PAST = new RegExp(R`^\s*(?:(?:all|both|never|already|just|really|actually)\s+)?(?!(?:did|didn't|was|were|had|hadn't)\s+(?:you|they|we|he|she|it|i)\b)(?!(?:based|aimed|planned|priced|timed|linked|related|tied|focused|focussed|centred|geared|designed|sized|spaced|placed|built|made|needed|wanted|chosen)\b)(?:${PAST_VERB}|had|hadn't|didn't|turned)\b`, 'iu');
// Before the count: "the last three", "of the four", "those three".
const FACT_BEFORE = /\b(?:last|previous|past|those)\s*$|\b(?:of|from|among) (?:the|those|these|your|his|her|their)\s*$/iu;
const DEFINITE_BEFORE = /\b(?:the|those|that|your|his|her|their)\s*$/iu;
// A past or perfect verb leading up to a time span: "you've waited for three weeks".
const PAST_BEFORE = /\b(?:have|has|had|'ve|'d|was|were|been|did|already|ago|since|so far)\b|\b(?:went|came|spent|waited|stayed|lasted|took|sat|slept|worked|lived|tried|felt|kept|left|gone)\b/iu;
// "the three things you loved most": picking from their own past is a choice, not a count of it.
const SELECTION = /^[^,;:.?!]*?\b(?:most|best|least|biggest|hardest|favourite|top)\b/iu;
// "Already" only with something done: "what is already in the cupboard" is not the past.
const PAST_MARK = /^[^,;:.?!]*?\b(?:last (?:week|month|year|night|term|time|summer|winter|spring|autumn)|yesterday|ago|so far|already (?:been|had|happened|done|said|sent|seen|gone|left|told|tried|made|got|written|[\p{L}]+ed)|earlier (?:today|this week)|since then)\b/iu;

// --- where a subtitle line starts suggesting something -------------------------

// What the eval report counts as "line 2 proposes a step or asks an answerable
// question" (a rough reading, kept as it was so runs stay comparable). The
// gate itself never requires one (an action is not always kind), and for
// numbers it uses the stricter reading in stepStart below.
const ACTION_CUE = /\?["')\]]*$|^(?:try|write|jot|list|name|pick|choose|send|ask|spend|take|give|set|make|note|plan|book|put|tell|message|text|call|decide|find|look|read|practise|start|wait|leave|keep|step|sleep|go|one (?:small|useful|tiny|kind) (?:move|step|thing))\b|\b(?:you could(?! (?:be|have|feel|still|never|not|well)\b)|you might(?! (?:be|have|feel|still|never|not|well|find yourself)\b)|could you|would you|might you|what if you|how about|it (?:might|could|may) help to|try (?:to|it|this|that|one|a|an|asking|writing|saying|sending|telling|[\p{L}]+ing)\b)/iu;
/**
 * Does a subtitle line propose something to do (an action or an answerable
 * question)? A rough reading, used by the eval report.
 * @param {string} line
 */
export const suggestsStep = (line) => ACTION_CUE.test(tidy(line));

// Verbs a step starts with, and the word that can follow each when it is a
// verb rather than a noun ("Work on your CV", not "Work deadlines are…").
const STEP_VERBS = 'add|agree|apologise|ask|block|book|breathe|bring|call|cancel|catch up|check|choose|clear|close|collect|compare|cook|count|cut|decide|delete|do|draft|drink|drop|eat|email|find|finish|fix|follow|gather|get|give|go|grab|have|head|hide|hold|invite|join|jot|keep|knock|label|leave|let|limit|list|listen|look|make|map|mark|meet|message|move|mute|name|note|offer|open|pack|park|pause|phone|pick|plan|post|practise|prepare|print|put|raise|read|rehearse|remind|reply|rest|return|review|rewrite|ring|run|save|say|schedule|send|set|share|shortlist|show|sit|skip|sketch|sleep|sort|speak|spend|split|start|stay|step|stop|swap|switch|take|talk|tell|text|thank|tidy|try|turn|unfollow|update|visit|wait|walk|watch|work|write';
const STEP_NEXT = R`(?:the|a|an|your|my|his|her|their|our|them|him|it|this|that|these|those|${NUM}|half|another|some|any|each|every|both|and|or|to|on|for|with|through|up|down|out|off|back|away|in|into|over|about|around|round|aside|by|from|at|before|after|until|till|if|yourself|what|how|when|whether|who|where|why|someone|something|anything|everything|sorry|hello|no|yes|thanks|now|today|tonight|tomorrow|first|once|twice|again|just|only|ahead|along|here|there|less|more|outside|inside|outdoors|somewhere|together|alone|still|[\p{L}]+ly)`;
const STEP_LEAD = R`(?:(?:then|now|first|next|tonight|today|tomorrow|this (?:week|evening|weekend|morning|afternoon)|after (?:that|work|school|lunch|dinner)|before (?:bed|work|school|lunch|dinner|then)|if you can|if it helps|when you(?:'re| are) ready|for now|maybe|perhaps|just|gently|calmly|quietly|kindly),?\s+){0,2}`;
// "Practise saying it…", "Say "I can do this"…" are steps too.
const STEP_START = new RegExp(R`^\s*${STEP_LEAD}(?:${STEP_VERBS})\b(?=\s+${STEP_NEXT}\b|\s+[\p{L}]{2,}ing\b|\s+["“]|\s*[.?!]?$)|^\s*one (?:small|useful|tiny|kind|good) (?:move|step|thing)\b`, 'iu');
// A question or proposal that asks the person to do or choose something.
const ASKS_TO_DO = /\b(?:you could(?! (?:be|have|feel|still|never|not|well)\b)|you might(?! (?:be|have|feel|still|never|not|well|find yourself)\b)|(?:could|would|will|might|can|shall) you\b|what if you|how about|it (?:might|could|may) help to|try (?:to|it|this|that|one|a|an|asking|writing|saying|sending|telling|[\p{L}]+ing)\b|(?:which|what|when|who|where|how)\b[^.?!]*?\b(?:would|could|will|might|can) you\b|what(?:'s| is) one\b|do you want to\b|which\b[^.?!]*?\b(?:most|best|least)\b)/iu;
// A condition about the future, just before the suggestion, belongs to it:
// "If someone mentions it on Monday, could you have one light line ready?"
const STEP_CONDITION = /^\s*(?:if|when|whenever|once|next time|before|until|by the time|as soon as)\b[^,;:]*[,;:]\s*$/iu;
const CLAUSE_EDGE = /[,;:—–]\s*|\s+-\s+|\b(?:and then|then|so|and|or|but)\s+/giu;
/**
 * Where a sentence starts suggesting something (an imperative clause, or a
 * question that asks the person to do or choose), or -1.
 * @param {string} s
 */
function stepStart(s) {
  const starts = [0, ...[...s.matchAll(CLAUSE_EDGE)].map((m) => (m.index ?? 0) + m[0].length)];
  let at = -1;
  for (const c of starts) if (STEP_START.test(s.slice(c))) { at = c; break; }
  const q = ASKS_TO_DO.exec(s);
  if (q) {
    const clause = Math.max(0, ...starts.filter((c) => c <= (q.index ?? 0)));
    if (at < 0 || clause < at) at = clause;
  }
  if (at > 0 && STEP_CONDITION.test(s.slice(0, at))) at = 0;
  return at;
}

// --- who "they" is ------------------------------------------------------------
//
// "They" is someone else's mind only when it means people. Run 3: "Tonight, say
// your opening lines out loud until they feel familiar" was read as a claim
// about other people's feelings, though "they" is the lines. A "they" is read
// as a thing only when all three hold:
//  * what follows it is something only a thing is said to feel or need, from
//    a short list ("feel familiar", "feel easier", "feel less like a script",
//    "need more practice"); "they feel relieved", "they feel the miss was bad
//    luck" or "they feel confident in you" are people's minds whatever came
//    before;
//  * no person is named earlier in the sentence (a person word, a name, "who"
//    or an owner: "your teammates saw the score, and they…", "your
//    colleagues have seen the slides, and they…"), however near a plural thing
//    is;
//  * a plural thing heading a noun phrase comes before it ("your opening
//    lines", "the worries", "Thursday's slides", "practise lines"), in the
//    sentence or, for line 2, in line 1 ("Your opening lines are the hard
//    part." / "They feel easier each time.").
// Anything else is people: a "they" with nothing before it ("They feel
// lighter after a loss") means people.
const PERSON_WORD = new RegExp(R`^(?:${OTHER_NOUNS.join('|')}|people|persons?|others|folks?|guests?|strangers?|everyone|everybody|someone|somebody|anyone|anybody|nobody|he|she|him|her|his|their|who|whom|whose|men|women|man|woman|girls?|boys?|lads?|adults?|students?|pupils?|staff|doctors?|nurses?|bosses|ones|person|whoever|team-?mates?|workmates?|schoolmates?|subs|substitutes|players?|regulars|members?|fans|supporters?|spectators?|viewers?|readers|listeners?|attendees?|invitees?|hosts|drivers?|judges|panel|panellists?|officials|referees?|refs|workers?|employees?|employers?|leaders?|peers|pals?|buddies|besties|relatives|relations|siblings?|twins|babies|baby|grown-ups?|elders|locals|newcomers?|passengers?|commuters?|patients|dentists?|vets|professors?|tenants?|recruiters?|police|officers?|instructors?|mentors|volunteers?|organisers?|residents?|bridesmaids?|crowd|everyone else|markers|assessors?|interviewers?|examiners?|selectors?)$`, 'iu');
const NP_DETERMINER = new RegExp(R`^(?:the|these|those|this|that|your|my|our|its|some|any|all|both|each|every|few|several|many|such|other|more|which|what|no|${SMALL_NUM}|\d+)$`, 'iu');
const OBJECT_LEAD = new RegExp(R`^(?:${STEP_VERBS}|of|with|on|about|through|over|into|from|for|at)$`, 'iu');
// "Thursday's slides", "today's lines", "let's": not owners.
const NOT_OWNER = /^(?:let|it|that|what|there|here|who|he|she|one|today|tonight|tomorrow|yesterday|week|month|year|night|morning|evening|weekend|term|life|world|monday|tuesday|wednesday|thursday|friday|saturday|sunday)'s$/u;
// What may come between "they" and its mind word.
const PRONOUN_AUX = /^(?:\s+(?:definitely|really|just|probably|certainly|surely|actually|only|still|totally|secretly|likely|simply|honestly|genuinely|clearly|obviously|even|already|always|never|not|do|does|did|will|would|must|can|could|might|may|should|start to|begin to|start|begin))*\s+/iu;
// What a thing can feel like: a short list, so "they feel relieved", "they
// feel generous" or "they feel the miss was bad luck" stay people's minds.
const THING_FEEL = R`(?:(?:a (?:bit|little|lot) |much |far |so |too |even |slightly |almost |quite |really |completely |totally |more |less )?(?:familiar|easier|easy|natural|smaller|lighter|shorter|smoother|smooth|simpler|clearer|automatic|normal|ordinary|routine|manageable|doable|fluent|second nature|less scary|less daunting|less (?:like|big|heavy|huge)|more (?:like|natural|familiar|manageable|normal|yours)|like (?:yours|your own|a (?:script|plan|list|habit|conversation|chat|routine|story))|yours|your own))(?! (?:like|as if|as though) (?:you|they|he|she|we|i)\b)(?!\s+(?:about|towards?|around|among|with (?:you|him|her|them|us|me|each other|one another|people|everyone)|to each other|to one another|that)\b)`;
// The mind words a thing can take: a "feel" from the list above, and "need"
// with what a thing needs ("need more practice", "need a second look");
// "need space" or "need more time to read" are people's needs.
const THING_PRED = new RegExp(R`^(?:(?:feel|feels|felt|feeling)\s+${THING_FEEL}|(?:need|needs|needed)\s+(?:more |a bit more |a little more |some )?(?:practice|practising|work|editing|polishing|checking|fixing|rewriting|a rewrite|another (?:look|read|go|run-through)|a second (?:look|read|go))\b)`, 'iu');
/** Does this word name a person, or own something (so its owner may be who "they" are)? @param {string} w lower case */
const personOrOwner = (w) => PERSON_WORD.test(w) || GIVEN_NAMES.has(w) || (/^.+(?:'s|s')$/u.test(w) && !NOT_OWNER.test(w));

/**
 * What "they" at `at` in a (lower-cased) sentence refers to: 'person',
 * 'thing', or null when nothing before it in the sentence is a candidate.
 * Any person earlier in the sentence makes it people, however near a thing
 * is ("Your colleagues have seen the slides, and they…").
 * @param {string} s @param {number} at
 */
function theyRefersTo(s, at) {
  const ws = [...s.slice(0, at).matchAll(/[\p{L}\p{N}][\p{L}\p{N}'-]*/gu)].map((m) => m[0].toLowerCase());
  if (ws.some(personOrOwner)) return 'person';
  for (let i = ws.length - 1; i >= 0; i--) {
    if (!isPluralNoun(ws[i])) continue;
    // A plural noun counts when it heads a noun phrase: a determiner or count
    // up to three words before it with only modifiers between ("your opening
    // lines"), or a verb or preposition just before it ("practise lines").
    for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
      if (NP_DETERMINER.test(ws[j]) || /^.+(?:'s|s')$/u.test(ws[j])) return 'thing';
      if (NOT_MODIFIER.has(ws[j])) break;
    }
    if (i > 0 && OBJECT_LEAD.test(ws[i - 1])) return 'thing';
  }
  return null;
}

/**
 * The sentence with each "they" that means a thing written as "these", so the
 * claim patterns below never see it as people.
 * @param {string} s expanded, lower-cased @param {string} before what the person reads just before it (line 1, for line 2), expanded
 */
function thingPronouns(s, before) {
  return s.replace(/\bthey\b/g, (w, at) => {
    if (!thingLike(s.slice(at + w.length))) return w;
    const ref = theyRefersTo(s, at) ?? (before ? theyRefersTo(before, before.length) : null);
    return ref === 'thing' ? 'these' : w;
  });
}

const THING_VERB = /^(?:feel|feels|felt|feeling|need|needs|needed)\b/u;
/** Is what follows a "they" something a thing could feel or need? @param {string} after */
const thingLike = (after) => THING_PRED.test(after.replace(PRONOUN_AUX, ''));

// --- a repeat inside a step ("say it three times") -----------------------------
//
// "Say your opening two sentences out loud three times" (run 3): the count ends
// the action's own phrase, so it says how often to do it. Between the verb and
// the count there may be only what the action is done to (one noun phrase: "your
// opening lines", "it"), particles ("out loud", "aloud", "again", "through")
// and phrases led by a preposition ("with a friend", "past the mirror", "of
// your notes"). Anything that starts another clause ends it, and the count then
// goes with that clause's verb, the nearer one:
//  * a wh-word, a subject or an auxiliary ("check why it went wrong three
//    times", "the lines you rehearsed three times");
//  * after a noun, with no preposition between: a second determiner or
//    possessive ("the comments your boss makes three times a week"), a person
//    ("the plans people cancel") or a verb form ("the trains arriving late",
//    "the report redone", "the letter slid under your door", "the comments
//    your boss made").
// The count must not follow a determiner ("the three times you froze" counts
// occasions) and no clause may follow it ("…three times you were late"). A
// count after a clause about a noun is a fact, and the message says so ("the
// friend who cancelled four times"); with a habitual frequency after it ("the
// bins overflowing three times this month", "the door your flatmate leaves
// open twice a week") it is one even for "twice", which is otherwise free in
// a step ("Ring her twice this week").
const REPEAT_VERBS = new Set('say saying read reading practise practising repeat repeating rehearse rehearsing run try do breathe write play count check look sing hum'.split(' '));
const STEP_VERB_WORDS = new Set(STEP_VERBS.split('|').filter((v) => !v.includes(' ')));
const REPEAT_COUNT = new RegExp(R`\b(?:${SMALL_NUM}(?: or ${SMALL_NUM})? times|twice)\b(?!\s+(?:you|he|she|they|we|it|that|which|when|where|who|i)\b)`, 'giu');
const HABITUAL = /^\s+(?:a|an|per|each|every|this|last|that|in a|in one) (?:day|week|month|year|term|quarter|fortnight|weekend|morning|evening|night|shift|lesson|session|meeting|semester|season)\b/iu;
const GAP_TOKEN = /"[^"]*"|“[^”]*”|[\p{L}\p{N}][\p{L}\p{N}'’-]*|[,;:()—–]|\s-\s/gu;
const GAP_STOP = new Set('why what when where who whom whose which whether if because since unless while although though so but than how'.split(' '));
const GAP_RELATIVE = new Set(['who', 'whom', 'whose', 'which', 'that', 'he', 'she', 'they', 'we', 'i']);
const GAP_SUBJECT = new Set(['i', 'you', 'he', 'she', 'they', 'we']);
const GAP_AUX = new Set('is are was were be been being am has have had do does did will would can could should might must may shall'.split(' '));
const GAP_DET = new Set('the a an this that these those your my his her their our its each every both all some any another'.split(' '));
const GAP_OBJECT = new Set('it them him us me yourself myself themselves everything something'.split(' '));
const GAP_PREP = new Set('with to in on at past into onto from under for by near beside behind through over of about across around against without towards toward before during inside outside along between front'.split(' '));
const GAP_PARTICLE = new Set('out loud aloud again back up down off round away together alone tonight today tomorrow now here there'.split(' '));
const NOUN_LY = new Set('reply family belly ally bully rally jelly lily holly tally folly assembly supply fly'.split(' '));
// The words a step may say ("say no", "say sorry"), and "-ing" words that are nouns ("the team meeting notes").
const SAY_WORDS = new Set('no yes sorry hello goodbye thanks please'.split(' '));
const ING_NOUNS = new Set('meeting opening ending beginning evening morning wedding building setting booking timing reading writing training spelling marking feeling painting drawing recording ceiling clothing heating parking shopping cooking cleaning washing warning briefing hearing greeting posting listing wording phrasing pudding thing nothing something anything everything king ring spring string sibling darling'.split(' '));
// How a step is done: "say your lines standing up three times".
const MANNER = new Set(['standing', 'sitting', 'walking', 'pacing', 'smiling', 'breathing']);
const PAST_FORMS = new Set([...[...TEXT_IRREGULAR.keys()].filter((w) => !/ing$/u.test(w)), 'done', 'redone', 'undone', 'overdone', 'shown', 'slid', 'fed', 'led', 'bred']);
const ED_WORDS = new Set('bed red need speed seed feed weed deed shed hundred sacred naked wicked kindred'.split(' '));
// Right before the count these make it a count of occasions ("the three times you froze"); "this", "that" and "her" there are what the step is done to ("say that three times").
const DET_BEFORE_COUNT = new Set('the those these your his their my our its of last past previous other all both many several few first next'.split(' '));
const COUNT_WORD = new RegExp(R`^(?:${SMALL_NUM}|first|second|third|fourth|fifth|last|next)$`, 'iu');
const CONTRACTED = /^(?:it|that|what|there|here|who|he|she|they|we|you|i)'(?:s|re|ve|ll|d|m)$/u;
/** @param {string} w */
const verbForm = (w) => (/ing$/u.test(w) && w.length > 4 && !ING_NOUNS.has(w)) || (/ed$/u.test(w) && w.length > 3 && !ED_WORDS.has(w)) || PAST_FORMS.has(w);
/** @param {string} w */
const isPersonWord = (w) => PERSON_WORD.test(w) || GIVEN_NAMES.has(w);

/**
 * Walks the words between a verb and a count. Returns null when they are only
 * what the action is done to, particles and phrases led by a preposition;
 * otherwise where the noun phrase began and whether a clause about that noun
 * started after it ("the comments your boss…").
 * @param {{ w: string }[]} gap
 * @returns {{ relative: boolean, np: number } | null}
 */
function walkGap(gap) {
  /** @type {'verb' | 'det' | 'noun' | 'prep' | 'post'} */
  let st = 'verb';
  let np = 0;
  for (let i = 0; i < gap.length; i++) {
    const { w } = gap[i];
    const prev = i ? gap[i - 1].w : '';
    const afterNoun = st === 'noun';
    const stop = (/** @type {boolean} */ relative) => ({ relative: relative && afterNoun, np });
    /** A new noun phrase starts here unless one is under way. */
    const begin = () => { if (st !== 'det' && st !== 'noun') np = i; };
    if (/^["“]/u.test(w)) { begin(); st = 'noun'; continue; }
    if (/^[,;:()—–]$|^\s-\s$/u.test(w)) return stop(false);
    if ((w === 'you' && prev === 'thank') || (SAY_WORDS.has(w) && i === 0)) { begin(); st = 'noun'; continue; }
    if (CONTRACTED.test(w)) return stop(false);
    if (GAP_STOP.has(w) || GAP_AUX.has(w) || GAP_SUBJECT.has(w)) return stop(GAP_RELATIVE.has(w));
    if (GAP_DET.has(w) || (/^.+(?:'s|s')$/u.test(w) && !NOT_OWNER.test(w))) {
      if (afterNoun) return stop(true);
      if (st === 'post') return stop(false);
      begin(); st = 'det'; continue;
    }
    if (GAP_OBJECT.has(w)) {
      if (afterNoun || st === 'post') return stop(false);
      begin(); st = 'noun'; continue;
    }
    if (GAP_PREP.has(w)) { st = 'prep'; continue; }
    // "slowly and clearly", "your notes and the slides".
    if (w === 'and' || w === 'or') { if (st !== 'post') st = 'prep'; continue; }
    if (GAP_PARTICLE.has(w) || (/ly$/u.test(w) && !NOUN_LY.has(w))) { if (st !== 'verb') st = 'post'; continue; }
    if (COUNT_WORD.test(w) || /^\d+$/u.test(w)) { begin(); st = 'det'; continue; }
    // After a noun: a person ("the plans people cancel", but "your friend
    // Sam") or a verb form ("the trains arriving late") starts a clause about it.
    if (afterNoun && ((isPersonWord(w) && !isPersonWord(prev)) || (verbForm(w) && !MANNER.has(w)))) return stop(true);
    // "Try saying it", "practise reading it aloud".
    if (st === 'verb' && /ing$/u.test(w) && verbForm(w)) continue;
    begin(); st = 'noun';
  }
  return null;
}

/**
 * Counts of occasions in a sentence ("three times", "twice") that say how often
 * to do a step, and those that describe what happens instead.
 * @param {string} s
 * @returns {{ spans: Span[], facts: FactSpan[] }}
 */
function repeatCounts(s) {
  /** @type {Span[]} */
  const spans = [];
  /** @type {FactSpan[]} */
  const facts = [];
  const toks = [...s.matchAll(GAP_TOKEN)].map((m) => ({ w: m[0].toLowerCase().replace(/’/g, "'"), start: m.index ?? 0, end: (m.index ?? 0) + m[0].length }));
  for (const m of s.matchAll(REPEAT_COUNT)) {
    const start = m.index ?? 0;
    const end = start + m[0].length;
    const habit = HABITUAL.exec(s.slice(end));
    const before = toks.filter((t) => t.end <= start);
    // The clause the count is in.
    let from = 0;
    for (let i = before.length - 1; i >= 0; i--) if (/^[,;:()—–]$|^\s-\s$/u.test(before[i].w)) { from = i + 1; break; }
    const clause = before.slice(from);
    // Each verb in the clause, nearest first: the first that takes the count as
    // a repeat gives the step; the first that shows a clause about a noun
    // before the count makes it a fact.
    for (let k = clause.length - 1; k >= 0; k--) {
      const { w } = clause[k];
      const isRepeat = REPEAT_VERBS.has(w) || (w === 'go' && /^(?:through|over)$/u.test(clause[k + 1]?.w || ''));
      if (!isRepeat && !STEP_VERB_WORDS.has(w)) continue;
      // "…the lines you say three times": a verb with a subject is not a step.
      const p1 = clause[k - 1]?.w || '';
      const p2 = clause[k - 2]?.w || '';
      if (GAP_SUBJECT.has(p1) && !(p1 === 'you' && /^(?:could|would|can|will|might|do|did|should|shall)$/u.test(p2))) continue;
      if (/^(?:it|that|which|who|people|everyone)$/u.test(p1) || isPersonWord(p1)) continue;
      const gap = clause.slice(k + 1);
      const last = gap.length ? gap[gap.length - 1].w : '';
      const walk = DET_BEFORE_COUNT.has(last) ? { relative: false, np: 0 } : walkGap(gap);
      if (!walk) {
        if (isRepeat) { spans.push({ start: clause[k].start, end }); break; }
        continue;
      }
      if (walk.relative) {
        const at = gap[walk.np].start;
        const phrase = tidy(s.slice(at, habit ? end + habit[0].length : end));
        facts.push(habit
          ? { start: at, end: end + habit[0].length, why: `"${phrase}" describes what happens` }
          : { start: at, end, why: `"${phrase}" describes what happened`, soft: true });
        break;
      }
    }
  }
  return { spans, facts };
}

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
  ['people', /^(?:people|persons|friends?|guests?|colleagues?|mates?|classmates?|teammates?|co-?workers?|relatives|cousins|kids|children)$/u],
]);
const TIME_CLASSES = new Set(['minute', 'hour', 'day', 'night', 'week', 'month', 'year']);
/** @param {string} w */
const unitClassOf = (w) => UNIT_CLASSES.find(([, re]) => re.test(w.toLowerCase()))?.[0] ?? null;
const UNIT_GAP_STOP = new Set(['of', 'or', 'and', 'to', 'in', 'on', 'at', 'more', 'less', 'other', 'than', 'a', 'an', 'the', 'for', 'by', 'from', 'with', 'per', 'you', 'your', 'it', 'is', 'was']);
const NEXT_AHEAD = /\b(?:if|before|next|booking|book|when|whether|will|would|could|might)\b/iu;
const NEXT_DONE = /\b(?:after|since|already|so far|ago|you(?:'ve| have| had))\b/iu;
// "The third check is happening only in your head": the next one, imagined.
const IN_HEAD = /\b(?:in your (?:head|mind|imagination)|imagin\w*|pictur\w*)\b/iu;
const UNIT_BEFORE = /\b(tests?|attempts?|tries|resits?|retakes?|goes|week|day|year|month)\s+(?:number\s+|no\.\s*)$/iu;
/**
 * The unit a number counts: "two weeks", "a five-hour wait", "three failed
 * tests", "the third time", "test number four", "twice", "three people".
 * @param {import('./text.js').NumberToken} tok @param {string} s
 */
function unitOf(tok, s) {
  if (tok.kind === 'times' || /^\s+times\b/iu.test(s.slice(tok.end))) return 'attempt';
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
 * @typedef {{ start: number, end: number }} Span
 * @typedef {{ start: number, end: number, kind: 'box' | 'count' | 'repeat' | 'span' | 'clock' | 'vantage' }} FutureSpan
 * @typedef {{ start: number, end: number, why: string, soft?: boolean }} FactSpan a count the words around place in the past (soft: only the message says so; "twice" stays free)
 */

/**
 * Why the words around a count make it a fact about the past, or null.
 * @param {string} s @param {number} start @param {number} end end of the counted noun
 */
function countIsFact(s, start, end) {
  const before = s.slice(0, start);
  const rest = s.slice(end);
  const near = (/** @type {RegExp} */ re) => {
    const m = re.exec(rest);
    return m ? `"${tidy(s.slice(start, end + m[0].length))}"` : '';
  };
  const fb = FACT_BEFORE.exec(before);
  if (fb) return `"${tidy(`${fb[0]}${s.slice(start, end)}`)}" names ones that already exist`;
  if (PAST_MARK.test(rest)) return `${near(PAST_MARK)} is about the past`;
  if (THIRD_PAST.test(rest)) return `${near(THIRD_PAST)} describes what happened`;
  if (DIRECT_PAST.test(rest)) return `${near(DIRECT_PAST)} describes what happened`;
  const head = (s.slice(start, end).match(/[\p{L}'-]+$/u)?.[0] || '').toLowerCase();
  if (DEFINITE_BEFORE.test(before) && !SELECTION.test(rest) && !SELECTION_NOUN.test(head)) {
    for (const re of [REL_PAST, YOU_PAST, IN_SITUATION]) if (re.test(rest)) return `${near(re)} presents it as part of what happened`;
  }
  return null;
}

/**
 * Spans of a sentence that are about the future, not the situation, from
 * `from` on (where a step starts; -1 for none), and the counts that would have
 * been but read as facts.
 * @param {string} s @param {{ from: number, vantage: boolean }} where
 * @returns {{ future: FutureSpan[], facts: FactSpan[] }}
 */
function futureSpans(s, where) {
  /** @type {FutureSpan[]} */
  const future = [];
  /** @type {FactSpan[]} */
  const facts = [];
  /** @param {RegExp} re @param {FutureSpan['kind']} kind @param {(start: number, end: number) => string | null} guard */
  const add = (re, kind, guard) => {
    for (const m of s.matchAll(re)) {
      const start = m.index ?? 0;
      const end = start + m[0].length;
      const why = guard(start, end);
      // Outside a step a count is a fact anyway; noting why still matters
      // for "two", which is otherwise free ("the two people who laughed").
      if (why) facts.push({ start, end, why });
      else if (where.from >= 0 && start >= where.from) future.push({ start, end, kind });
    }
  };
  const pastMarkOnly = (/** @type {number} */ _s, /** @type {number} */ e) => (PAST_MARK.test(s.slice(e)) ? 'it is about the past' : null);
  const spanGuard = (/** @type {number} */ st, /** @type {number} */ e) => {
    const rest = s.slice(e);
    const lead = s.slice(Math.max(where.from, ...[...s.slice(0, st).matchAll(/[,;:]/g)].map((m) => (m.index ?? 0) + 1)), st);
    if (PAST_BEFORE.test(lead)) return `"${tidy(`${lead}${s.slice(st, e)}`)}" is about time already spent`;
    if (PAST_MARK.test(rest) || THIRD_PAST.test(rest) || YOU_PAST.test(rest)) return 'what follows it is about the past';
    return null;
  };
  {
    add(FORWARD_BOX, 'box', pastMarkOnly);
    add(TIME_SPAN, 'span', spanGuard);
    const fact = (/** @type {number} */ st, /** @type {number} */ e) => countIsFact(s, st, e);
    add(ACTION_COUNT, 'count', fact);
    add(ACTION_RANGE, 'count', fact);
    const repeats = repeatCounts(s);
    facts.push(...repeats.facts);
    for (const sp of repeats.spans) {
      const why = countIsFact(s, sp.start, sp.end);
      if (why) facts.push({ ...sp, why });
      else if (where.from >= 0 && sp.start >= where.from) future.push({ ...sp, kind: 'repeat' });
    }
    // A small count before any plural noun: "three cheap meals", "five spends".
    for (const m of s.matchAll(COUNT_HEAD)) {
      const start = m.index ?? 0;
      let end = start + m[0].length;
      const after = /^(?:\s+[\p{L}'-]+){1,3}/u.exec(s.slice(end));
      if (!after) continue;
      const ws = after[0].trim().split(/\s+/u);
      let k = -1;
      for (let i = 0; i < ws.length && i < 3; i++) {
        const w = ws[i].toLowerCase();
        if (isPluralNoun(w)) { k = i; break; }
        if (NOT_MODIFIER.has(w) || SPAN_WORD.test(w) || w === 'times') break;
      }
      if (k < 0) continue;
      const tail = /^(?:\s+[\p{L}'-]+)/u;
      for (let i = 0; i <= k; i++) end += /** @type {RegExpExecArray} */ (tail.exec(s.slice(end)))[0].length;
      const why = countIsFact(s, start, end);
      if (why) facts.push({ start, end, why });
      else if (where.from >= 0 && start >= where.from) future.push({ start, end, kind: 'count' });
    }
    add(CLOCK_TIME, 'clock', () => null);
  }
  if (where.vantage) {
    for (const m of s.matchAll(VANTAGE)) future.push({ start: m.index ?? 0, end: (m.index ?? 0) + m[0].length, kind: 'vantage' });
  }
  return { future, facts };
}

/**
 * @param {keyof typeof LABEL} field
 * @param {{ phrase: string, subject: string, thing: boolean }} claim what read as a claim
 */
function mindsMessage(field, claim) {
  // Say which words read as someone else's mind (run 3: "until they feel
  // familiar", about the lines, was rejected without saying so, twice).
  const where = claim.phrase ? ` The words that read that way: "${claim.phrase}".` : '';
  // Only where a thing could be meant: not for "They're probably embarrassed".
  const pronoun = claim.thing
    ? ' If "they" there means a thing rather than people, name the thing instead ("until the lines feel familiar").'
    : '';
  if (field === 'known_fact') {
    return `known_fact adds a guess about what someone else thinks, feels or intends.${where} Restate what the person told you, plainly and in their own terms ("Your girlfriend forgot your anniversary"); where it is their reading of someone's feelings, say it as theirs ("You said your mum is angry with you", "It feels like nobody likes you"). Add no motives, and never cast doubt on what they said happened.${pronoun}`;
  }
  return `${LABEL[field]} states what someone else thinks, feels or intends as fact.${where} Restating what the person told you is fine (as theirs: "You said…", "It feels like…"); a new guess about anyone's mind must be one possibility among others ("might", "could") or a question. Never cast doubt on what the person said happened.${pronoun}`;
}

const ON_READ = /\bon (?:read|seen|delivered)\b/iu;
// One particular person, named by role or pronoun ("my boyfriend", "she").
const NAMED_PERSON = /\b(?:he|she|him|her|his|boss|manager|partner|boyfriend|girlfriend|husband|wife|friend|best friend|colleague|mum|mom|dad|mother|father|sister|brother|son|daughter|teacher|tutor|flatmate|housemate|ex|nephew|niece|aunt|auntie|uncle|cousin|nan|gran|grandma|grandad|doctor|landlord|neighbou?r)\b/iu;
const CONTACT_PERSON = /\b(?:ask|asking|tell|telling|text|texting|message|messaging|call|calling|ring|ringing|email|emailing|write to|writing to|talk to|talk with|talking to|speak to|speak with|speaking to|check with|check in with|raise it with|bring it up with|meet up with|catch up with|hear from|heard from|reply to|answer)\s+(?:him|her)\b/iu;
const PLANNED_TALK = /\b(?:need(?:s|ed)? to talk|can we talk|wants? to (?:see|talk to|speak to|speak with|meet) (?:me|us)|asked to see (?:me|us)|(?:would not|wouldn't|won't|will not|didn't|did not) (?:say|tell me|explain)|called me in|have a chat)\b/iu;
const TALK_REF = /\b(?:the|that|this|a|your|their|his|her) (?:conversation|chat|talk)\b/iu;
// Idioms built on words the synonym groups hold: generic whatever the situation.
const IDIOMS = /\bwork(?:s|ed|ing)? (?:it |this |that |things )?(?:out|through)\b|\b(?:your|my|their|his|her|the|a|an) (?:own |big |tough |hard |judgement |judgment |close )?call\b(?! (?:with|from|to|him|her|them|back))|\bcall (?:it|that) (?:a day|quits)\b|\bthe answers? (?:you (?:need|want|seek|are looking for)|may|might|is|lies|isn't|to (?:this|that|it|everything|life))\b|\bof course\b|\bin other words\b|\b(?:tell|telling|tells|told|talk|talking|talks|talked|say|saying|said) (?:to )?yourself\b|\bthat said\b|\bneedless to say\b|\bsay so\b|\bto say the least\b|\bas a result\b|\bresults? in\b|\bmake plans\b|\btalk(?:ing|ed|s)? (?:it |things |this |that )?(?:through|over)\b/giu;
// Everyday words that, even when the person used them, say little about
// their situation on their own ("What would help you rest tonight?",
// "something left to do"). Matched as words with their inflections, not as
// stems ("come" and "comment" share a stem).
const WEAK_BASE = `tonight today tomorrow morning evening night week weekend month year last first second third choice part people person life head mind
wrong right new old whole big small little good bad lot end start real true
give take make get go come see put try let find look keep leave help use stop turn show hold bring run move`.split(/\s+/);
const WEAK_WORDS = new Set(WEAK_BASE.flatMap((b) => [b, `${b}s`, `${b}es`, `${b}ed`, `${b}d`, `${b}ing`, `${b.replace(/e$/u, '')}ing`, `${b}${b.at(-1)}ing`, `${b}${b.at(-1)}ed`]));
for (const [form, base] of TEXT_IRREGULAR) if (WEAK_BASE.includes(base)) WEAK_WORDS.add(form);
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
      const m = rule.re.exec(t);
      if (!m) continue;
      // A word the person used themselves (a friend called Claude) is theirs.
      if (rule.unlessInInput && rule.unlessInInput.test(input)) continue;
      // Name the words that tripped the rule, so the regeneration does not
      // keep them (run 3: told "avoid condescending words" with a list that
      // did not include it, the second draft kept "not who cares").
      const hit = m[0].replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
      fail(rule.code, field, hit ? `${rule.message} The words that tripped this check: "${hit}".` : rule.message);
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
      const claim = claimsOthersMinds(expand(unquoted), echo, field === 'subtitle_line_2' ? expand(l1) : '');
      if (claim) fail('claims_others_minds', field, mindsMessage(field, claim));
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
    const isStep = field === 'practical_next_step';
    /** @param {string} s Where the sentence starts suggesting something (the whole step field when it never says). */
    const stepFrom = (s) => {
      const at = isLine || isStep ? stepStart(s) : -1;
      return isStep && at < 0 ? 0 : at;
    };
    numbers: for (const s of sentences(t)) {
      const toks = numberTokens(s);
      if (!toks.some((tok) => tok.value !== null)) continue;
      const from = stepFrom(s);
      const { future, facts } = futureSpans(s, { from, vantage: field !== 'known_fact' });
      /** @param {import('./text.js').NumberToken} tok @param {FutureSpan['kind'][]} kinds */
      const inside = (tok, kinds) => future.some((sp) => tok.start >= sp.start && tok.end <= sp.end && kinds.includes(sp.kind));
      /** @type {Span[]} */
      const skip = [...future];
      for (const m of s.matchAll(VAGUE_QUANTITY)) skip.push({ start: m.index ?? 0, end: (m.index ?? 0) + m[0].length });
      // Only in a general remark: a clause about "you" counting their replays is a fact.
      if (field !== 'known_fact' && GENERIC_CUE.test(s)) {
        let at = 0;
        for (const cl of s.split(/(?=[,;])/)) {
          if (!SECOND_PERSON.test(cl)) for (const m of cl.matchAll(REPEAT_ORDINAL)) skip.push({ start: at + (m.index ?? 0), end: at + (m.index ?? 0) + m[0].length });
          at += cl.length;
        }
      }
      const accepted = new Set();
      const attempts = inputNums.units.get('attempt');
      // 1. The person's own units, on the whole sentence.
      for (const tok of toks) {
        if (tok.value === null || tok.value === 1) continue;
        const unit = unitOf(tok, s);
        const theirs = unit ? inputNums.units.get(unit) : undefined;
        const lead = s.slice(0, tok.start).split(/[,;:]/).pop() || '';
        const clause = lead + (s.slice(tok.start).split(/[,;:]/)[0] || '');
        // The next one, looked at ahead or only imagined: "before booking test
        // number four", "if she cancels a fourth time", "the third check is
        // happening only in your head" after "I checked twice". Never as
        // something done ("you've failed a fourth time", "after a fourth test").
        const next = (/** @type {number[]} */ ns) => tok.value === Math.max(...ns) + 1 && (NEXT_AHEAD.test(lead) || IN_HEAD.test(clause)) && !NEXT_DONE.test(lead);
        if (!theirs) {
          if (!unit && tok.kind === 'ordinal' && attempts && next(attempts)) accepted.add(tok.start);
          continue;
        }
        if (inside(tok, ['box', 'vantage']) || (unit === 'people' && inside(tok, ['count'])) || (unit === 'attempt' && inside(tok, ['repeat']))) continue;
        // Their unit: the same value, or an ordinal naming an earlier one.
        if (theirs.includes(tok.value) || (tok.kind === 'ordinal' && tok.value <= Math.max(...theirs)) || (unit === 'attempt' && next(theirs))) {
          accepted.add(tok.start);
          continue;
        }
        fail('invented_detail', field, `Do not change the details the person gave: they gave ${theirs.join(' and ')} for this, not "${tok.raw}". Use their numbers, or none.`);
        break numbers;
      }
      // 2. Numbers they never gave, outside what a step says about the future.
      let x = s;
      for (const sp of skip) x = x.slice(0, sp.start) + '·'.repeat(sp.end - sp.start) + x.slice(sp.end);
      // "Write three things, then pick one of the three": the same count again.
      const stepValues = new Set(toks.filter((tok) => inside(tok, ['count', 'repeat', 'span', 'box'])).map((tok) => tok.value));
      for (const tok of numberTokens(x)) {
        if (tok.value === null || accepted.has(tok.start)) continue;
        const inStep = from >= 0 && tok.start >= from;
        const rest = s.slice(tok.end);
        const lead = s.slice(Math.max(inStep ? from : 0, s.lastIndexOf(',', tok.start) + 1), tok.start);
        // "Twice" counts occasions: theirs, or something to do ("ring her twice this week").
        const occasions = tok.kind === 'times' || /^\s+times\b/iu.test(rest);
        if (tok.value === 1 || inputNums.values.has(tok.value)) continue;
        // "Two" is free ("the two of you", "one or two things"), but not as a
        // count of what happened ("the two people who laughed"), a length of
        // time outside a step ("two days of silence") or occasions ("twice").
        const inFact = facts.some((sp) => !sp.soft && tok.start >= sp.start && tok.end <= sp.end);
        const unit = unitOf(tok, s);
        const elapsed = unit !== null && TIME_CLASSES.has(unit) && !inStep;
        if (tok.value === 2 && !inFact && !elapsed && (!occasions || (inStep && !PAST_BEFORE.test(lead) && !PAST_MARK.test(rest)))) continue;
        if (inStep && stepValues.has(tok.value)) continue;
        fail('invented_detail', field, numberMessage(tok, from, facts));
        break numbers;
      }
    }
    names: for (const s of sentences(t)) {
      let from = -2;
      for (const m of s.matchAll(/[\p{L}][\p{L}'’&-]*/gu)) {
        const w = m[0];
        const at = m.index ?? 0;
        if (!/^\p{Lu}/u.test(w)) continue;
        // "Saturday's argument" is Saturday; "Monday's interview" is Monday.
        const lw = w.toLowerCase().replace(/’/g, "'").replace(/'s?$/u, '');
        const before = s.slice(0, at);
        // A day, month or holiday is theirs, or the time of a suggested step ("by Friday", "in July").
        const holiday = DATE_WORDS.has(lw) || (lw === 'new' && /^New Year\b/u.test(s.slice(at)));
        if (holiday) {
          if (inputLower.includes(lw === 'new' ? 'new year' : lw)) continue;
          if (from === -2) from = stepFrom(s);
          if (from >= 0 && at >= from && DATE_PREP.test(before)) continue;
          fail('invented_detail', field, `Do not add a day or date the person did not give ("${w}").`);
          break names;
        }
        if (SENTENCE_START_OK.has(lw) || COMMON_CAPS.has(lw) || inputWords.has(lw) || inputLower.includes(lw)) continue;
        if (at === 0) {
          // The first word is capitalised anyway: a name only when it is one
          // ("Sarah may still be…") or does what a person does ("Tom might
          // need a day", "Ella's silence…").
          if (!GIVEN_NAMES.has(lw)) {
            if (OPENERS.has(lw) || NOT_A_NAME.test(lw)) continue;
            const rest = s.slice(at + w.length);
            if (!(/'s$/u.test(w.replace(/’/g, "'")) ? PERSON_THING : PERSON_PRED).test(rest)) continue;
          }
        }
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
  // A hit is a word in the lines that meets one of the person's content
  // words. Their own word counts on its own ("the exam", "five hours"); a word
  // that only shares a group with one ("manager" for "boss", "answer" for
  // "texted") or an everyday word ("tonight", "choice") counts only beside
  // another; a word inside an idiom ("work out", "your call", "the answer you
  // need", "tell yourself") does not count at all.
  const inputPlain = new Set(wordsAndParts(input).filter((w) => w.length >= 3 && !STOPWORDS.has(w)).map(plainStem));
  if (ON_READ.test(input)) inputPlain.add(plainStem('message'));
  let strong = 0;
  const weak = new Set();
  for (const w of wordsAndParts(`${l1} ${l2}`.replace(IDIOMS, ' '))) {
    if (w.length < 3 || /^[\d.,]+$/.test(w) || !inputStems.has(stem(w))) continue;
    if (WEAK_WORDS.has(w)) continue;
    const p = plainStem(w);
    // A stop word in the line ("like you", "see them") meets their word only weakly.
    if (STOPWORDS.has(w) || (!inputPlain.has(p) && BROAD_SYNONYMS.has(p))) weak.add(p);
    else strong++;
  }
  // Their own compound ("first-choice", "box room") is theirs, however everyday its parts.
  const lineFlat = ` ${words(`${l1} ${l2}`).join(' ').toLowerCase().replace(/-/g, ' ')} `;
  if (words(input).some((w) => w.includes('-') && lineFlat.includes(` ${w.toLowerCase().replace(/-/g, ' ')} `))) strong++;
  if (inputStems.size >= 2 && !strong && weak.size < 2 && !quoted && !absRef && !personRef && !talkRef) {
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
  //  * The person's own details are theirs in every form: "three
  //    cancellations" restates "the third time" (run 3), so a number word
  //    whose value they gave is one of their words, not a new point.
  //  * The whole-line checks need a shared word beyond the person's own:
  //    two lines that only both name the friend, the month and the three
  //    cancellations can still make different points (run 3, ho-cancelled),
  //    so on the person's words alone only a restatement counts (four or more
  //    of their words shared, or near-verbatim; LIMITS.repeatRestated).
  const previous = ctx.previous || [];
  const usedPatterns = [...new Set(previous.map((p) => p.reasoning_pattern).filter(Boolean))];
  const theirs = new Set(inputStems);
  if (previous.length) {
    for (const t of [l1, l2, ...previous.flatMap((p) => [p.subtitle_line_1, p.subtitle_line_2])]) {
      for (const tok of numberTokens(t)) if (tok.value !== null && inputNums.values.has(tok.value)) theirs.add(stem(tok.raw));
    }
  }
  const newMeaning = meaningStems(`${l1} ${l2}`, theirs);
  /** @param {Set<string>} a @param {Set<string>} b */
  const near = (/** @type {Set<string>} */ a, /** @type {Set<string>} */ b, /** @type {number} */ min) => {
    const sim = jaccard(a, b);
    const shared = [...a].filter((x) => b.has(x));
    const beyond = shared.some((x) => !theirs.has(x));
    return sim >= min && (beyond || shared.length >= LIMITS.repeatRestated || sim >= LIMITS.repeatVerbatim) ? sim : 0;
  };
  const close = (/** @type {Set<string>} */ a, /** @type {Set<string>} */ b) => near(a, b, LIMITS.repeatLineSimilarity);
  previous.forEach((p, i) => {
    const prevText = `${p.subtitle_line_1} ${p.subtitle_line_2}`;
    const prevStems = contentStems(prevText);
    const sim = near(lineStems, prevStems, LIMITS.repeatSimilarity) > 0;
    const pairs = [['Line 1', l1], ['Line 2', l2]].flatMap(([na, a]) => [['line 1', p.subtitle_line_1], ['line 2', p.subtitle_line_2]].map(([nb, b]) => ({ na, nb, sim: close(contentStems(a), contentStems(b)) })));
    const closest = pairs.reduce((x, y) => (y.sim > x.sim ? y : x));
    const prevMeaning = meaningStems(prevText, theirs);
    const shared = [...newMeaning].filter((x) => prevMeaning.has(x));
    const meaningSim = jaccard(newMeaning, prevMeaning);
    const n = previous.length > 1 ? `angle ${i + 1}` : 'the angle just shown';
    if (p.reasoning_pattern && p.reasoning_pattern === scene.reasoning_pattern) {
      fail('repeats_previous', 'lines', `This angle uses the same reasoning_pattern (${scene.reasoning_pattern}) as ${n}, so the app would replay the same scene the person has already played. Use a different reasoning_pattern from every earlier angle (not ${usedPatterns.join(', ')}), with its matching interaction_type, that still fits the situation, and look through a different lens in new words.`);
    } else if ((shared.length >= LIMITS.meaningShared && meaningSim >= LIMITS.meaningSimilarity) || (shared.length >= 2 && meaningSim >= LIMITS.meaningSimilarityPair)) {
      const echoed = words(`${l1} ${l2}`).filter((w) => shared.includes(stem(w)));
      // The lenses the earlier patterns did not use (as the follow-up request names them).
      const usedLenses = new Set(usedPatterns.map((x) => PATTERN_LENS[/** @type {string} */ (x)]));
      const free = LENSES.filter((l) => !usedLenses.has(l));
      fail('repeats_previous', 'lines', `This angle says what ${n} already said, in other words (it repeats "${[...new Set(echoed.map((w) => w.toLowerCase()))].slice(0, 4).join('", "')}"). Look through a different lens (${(free.length ? free : LENSES).join('; ')}) and offer a different question or action, without those words. The person's own details (their people, event and numbers) may stay.`);
    } else if (sim || closest.sim || tidy(p.subtitle_line_1).toLowerCase() === tidy(l1).toLowerCase()) {
      const which = closest.sim ? `${closest.na} is close to ${n}'s ${closest.nb}` : `The two lines are close to ${n}`;
      fail('repeats_previous', 'lines', `This angle repeats one the person has already seen: ${which}. Rewrite that line to make a point ${n} did not make (a different pattern, lens, question or action), in new words; the person's own details may stay.`);
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
