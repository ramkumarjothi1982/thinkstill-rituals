// Deterministic quality gate for an Another Angle scene (brief 2 §2, §3, §9).
//
// Runs after the scene has passed the strict schema. Every failure carries a
// stable code (for metadata logs) and a plain instruction (sent back to the
// model once, so the regeneration knows exactly what to fix). The gate never
// rewrites the model's words: a scene either passes or is regenerated, and
// after one failed regeneration the client falls back to the authored engine.

import { HEAVY_EMOTIONS } from './vocab.js';
import { tidy, words, wordCount, sentences, contentStems, jaccard, numbersIn } from './text.js';

export const LINE_FIELDS = /** @type {const} */ (['subtitle_line_1', 'subtitle_line_2']);
export const EXPLORE_FIELDS = /** @type {const} */ (['known_fact', 'possible_assumption', 'alternative_angle', 'practical_next_step']);
export const VISIBLE_FIELDS = /** @type {const} */ ([...LINE_FIELDS, ...EXPLORE_FIELDS]);

export const LIMITS = Object.freeze({
  totalMin: 15, totalMax: 35, lineMax: 22, lineMin: 3,
  field: { known_fact: 20, possible_assumption: 20, alternative_angle: 24, practical_next_step: 20 },
  repeatSimilarity: 0.5, repeatLineSimilarity: 0.6, samePatternSimilarity: 0.34,
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
      R`you matter`, R`keep going`, R`never give up`, R`you can do anything`, R`remember (?:that )?you(?:'re| are)`, R`worthy and valuable`,
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
    ]),
  },
  {
    code: 'ai_mention',
    message: 'Never mention AI, models, systems or technology.',
    re: any([R`as an ai`, R`a\.i\.`, R`artificial intelligence`, R`language model`, R`chat ?bot`, R`algorithm`, R`claude`, R`anthropic`, R`openai`, R`gpt`]),
  },
  { code: 'ai_mention', message: 'Never mention AI, models, systems or technology.', re: /\bAI\b/u },
  {
    code: 'human_claim',
    message: 'Do not imply a human speaker or personal experience ("I\'ve been there", "trust me", "I promise").',
    re: any([R`i(?:'ve| have) been there`, R`i(?:'ve| have) felt (?:that|the same|this)`, R`i felt the same`, R`when i was`, R`in my experience`, R`trust me`, R`i promise`, R`i guarantee`, R`as a friend`, R`i remember when`, R`me too`]),
  },
  {
    code: 'cure_claim',
    message: 'No promises of relief or fixes ("you\'ll feel better", "this will fix it").',
    re: any([R`you(?:'ll| will) feel (?:better|great|good|calmer|lighter)`, R`(?:will|this'?ll|that'?ll) (?:make you feel|fix (?:it|this|everything)|cure|heal)`, R`guarantee\w*`, R`cure\w*`, R`heal(?:s|ed|ing)?`]),
  },
  {
    code: 'blame',
    message: 'Never blame the person or call their reaction an overreaction.',
    re: any([R`your (?:own )?fault`, R`you should(?:n'?t)? have`, R`you should'?ve`, R`overreact\w*`, R`too sensitive`, R`(?:being|so|a bit) dramatic`, R`get over it`, R`just move on`, R`brought (?:it|this) on yourself`, R`you asked for`]),
  },
  {
    code: 'condescending',
    message: 'Avoid condescending or dismissive words ("obviously", "simply", "calm down", "no big deal").',
    re: any([R`obviously`, R`clearly`, R`simply`, R`of course`, R`silly`, R`not that deep`, R`calm down`, R`just relax`, R`chill out`, R`no big deal`, R`not a big deal`, R`not that big a deal`, R`it doesn'?t matter`, R`who cares`, R`you(?:'re| are) fine`, R`first[- ]world problem`]),
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
const OTHERS = R`(?:he|she|they|(?:your|their|his|her) (?:boss|manager|partner|boyfriend|girlfriend|husband|wife|friends?|colleagues?|co-?workers?|mum|mom|dad|mother|father|sister|brother|family|teacher|tutor|ex|team|flatmate|housemate|date|crush|son|daughter|parents|classmates?|mates?|landlord|client|customer)|everyone|everybody|nobody|no one|no-one|people)`;
const ADVS = R`(?: (?:definitely|really|just|probably|certainly|surely|actually|only|still|totally|secretly|likely|simply|honestly|genuinely))*`;
// Mental verbs: "he loves you", "she must hate me", "they don't care".
const MIND_VERB = R`(?:loves?|liked?|likes|cares?|cared|hates?|hated|resents?|respects?|values?|admires?|misses|missed|wants?|wanted|meant|means (?:it|to|well)|intended|intends|feels?|felt|thinks?|thought|knows?|knew|forgot|forgets|noticed|notices|notice|remembers?|remembered|judges?|judged|blames?|blamed|trusts?|trusted|tried to|ignored|minds?|minded|regrets?|appreciates?|appreciated)`;
// Mental states need a linking verb: "she is annoyed", "he was just busy".
const MIND_STATE = R`(?:annoyed|angry|upset|mad|disappointed|proud|jealous|threatened|insecure|busy|stressed|distracted|overwhelmed|happy|fine|okay|interested|bored|embarrassed|hurt|sorry|over it|ignoring|avoiding|judging|thinking|trying to|testing|punishing|annoyed with|fed up)`;
const CLAIM_RE = new RegExp(R`\b${OTHERS}(?: does| did| do| will| would| must| has| have| had| can)?(?: not| never)?${ADVS} ${MIND_VERB}\b`, 'iu');
const STATE_RE = new RegExp(R`\b${OTHERS}(?: is| are| was| were| will be| would be| must be| has been| have been| had been| seems to be)(?: not| never)?${ADVS} ${MIND_STATE}\b`, 'iu');
const NOT_PERSONAL_RE = /\b(?:it|this|that) (?:was|is|was not|is not|wasn't|isn't) (?:not )?(?:personal|about you)\b|\b(?:they|he|she) did not mean (?:it|to)\b/iu;
const HEDGE_RE = /\b(?:may|might|could|perhaps|possibly|maybe|(?<!\beven )if|whether|unless|whatever|not sure|do not know|don't know|can't know|cannot know|can not know|can't tell|cannot tell|no way to know|unclear|unknown|guess(?:ing)?|wonder|question|possibilit(?:y|ies)|possible|seems?|seemed|as if|does not prove|doesn't prove|is not proof|isn't proof|not proof|does not mean|doesn't mean|does not tell|doesn't tell|without knowing|has not said|hasn't said|have not said|haven't said|one reading|one explanation|explanations|interpretations?|story|stories|assum\w*|guesses)\b/iu;

/** Expand common contractions so the claim patterns see "he is", "does not" and so on. */
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
const LABEL_RE = new RegExp(R`\byou(?:'re| are)( not| never)?(?: just| really| so| such| totally| completely| clearly| obviously| actually)* ${HARSH}\b`, 'iu');

// American spellings (exempted when the person used the same word).
const IZE_ALLOW = new Set(['size', 'sizes', 'sized', 'resize', 'resized', 'downsize', 'downsized', 'oversize', 'oversized', 'prize', 'prizes', 'prized', 'seize', 'seized', 'seizes', 'seizing', 'capsize', 'maize', 'baize', 'assize']);
const AMERICAN = [
  /^\w+(?:ize|izes|ized|izing|ization|izations)$/,
  /^\w*(?:yze|yzes|yzed|yzing)$/,
];
const AMERICAN_WORDS = new Set(`color colors colored colorful coloring favor favors favored favorite favorites favorable behavior behaviors behavioral honor honors honored honorable humor humors humored labor labors labored neighbor neighbors neighborhood neighboring rumor rumors rumored flavor flavors harbor endeavor endeavors savior valor vapor odor center centers centered theater theaters fiber gray mom moms traveled traveling traveler canceled canceling labeled labeling modeled modeling leveled fueled jewelry defense offense pretense catalog dialog fulfill fulfillment enroll enrollment skillful willful aluminum pajamas cozy plow math mold molded somber meager maneuver mustache sulfur artifact`.split(' '));
const PRACTICE_VERB = /\b(?:to|could|can|might|try|then|and) practice\b/iu;

const SENTENCE_START_OK = new Set(['i', "i'm", "i'd", "i'll", "i've", 'zuzu', 'glitzi', 'noomi', 'loomi', 'blubi', 'boppo', 'pipzi',
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december', 'english', 'british', 'uk', 'hr', 'ok', 'christmas', 'easter', 'eid', 'diwali', 'hanukkah', 'ramadan', 'new', 'year']);

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
  const fail = (code, field, message) => {
    const k = `${code}|${field}`;
    if (!seen.has(k)) { seen.add(k); failures.push({ code, field, message }); }
  };
  const input = tidy(ctx.text);
  const inputLower = input.toLowerCase();
  const inputWords = new Set(words(input).map((w) => w.toLowerCase().replace(/’/g, "'")));
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
  if (total > LIMITS.totalMax) fail('too_long', 'lines', `The two lines have ${total} words together; the limit is ${LIMITS.totalMax} (aim for 18–28).`);
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
    for (const rule of RULES) if (rule.re.test(t)) fail(rule.code, field, rule.message);
    // Other people's minds stated as fact.
    // A hedge covers its own clause and what follows it, until "but", a
    // semicolon or a dash starts a new claim.
    for (const s of sentences(t)) {
      if (/\?["')\]]*$/.test(s)) continue;
      for (const seg of expand(s).split(/;|—|–|\s-\s|\bbut\b|\bhowever\b|\bthough\b/)) {
        if (HEDGE_RE.test(seg)) continue;
        if (CLAIM_RE.test(seg) || STATE_RE.test(seg) || NOT_PERSONAL_RE.test(seg)) {
          fail('claims_others_minds', field, `${LABEL[field]} states what someone else thinks, feels or intends as fact; only offer that as a possibility ("might", "could") or ask.`);
          break;
        }
      }
    }
    // The harsh label, repeated or flatly denied.
    const lab = LABEL_RE.exec(t);
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
    // Invented details: numbers and names the person never gave.
    const inputNums = numbersIn(input);
    for (const num of numbersIn(t)) {
      if (num === 'one' || num === 'two' || inputNums.has(num)) continue;
      fail('invented_detail', field, `Do not add details the person did not give (the number "${num}").`);
      break;
    }
    for (const s of sentences(t)) {
      const ws = s.match(/[\p{L}][\p{L}'’-]*/gu) || [];
      for (let i = 1; i < ws.length; i++) {
        const w = ws[i];
        if (!/^\p{Lu}/u.test(w)) continue;
        const lw = w.toLowerCase().replace(/’/g, "'");
        if (SENTENCE_START_OK.has(lw) || inputWords.has(lw) || inputLower.includes(lw)) continue;
        const before = s.slice(0, s.indexOf(w));
        if (/[:"“'‘]\s*$/.test(before)) continue;
        fail('invented_detail', field, `Do not add names or details the person did not give ("${w}").`);
        break;
      }
    }
  }

  // 4. Engagement with the person's actual situation.
  const inputStems = contentStems(input);
  const lineStems = contentStems(`${l1} ${l2}`);
  const inputAbs = [...inputWords].filter((w) => ABSOLUTES.has(w.replace(/'/g, '')));
  const quoted = [...`${l1} ${l2}`.matchAll(/["“‘']([^"”’']{2,40})["”’']/gu)].some((m) => inputLower.includes(m[1].toLowerCase()));
  const absRef = inputAbs.some((w) => new RegExp(R`\b${w}\b`, 'i').test(`${l1} ${l2}`));
  let overlap = 0;
  for (const s of lineStems) if (inputStems.has(s)) overlap++;
  if (inputStems.size >= 2 && overlap === 0 && !quoted && !absRef) {
    fail('not_specific', 'lines', 'The lines do not mention anything from the person\'s situation; refer to the concrete details they gave (the people, the event, their words).');
  }
  if (inputStems.size >= 1) {
    let factOverlap = 0;
    for (const s of contentStems(scene.known_fact)) if (inputStems.has(s)) factOverlap++;
    if (factOverlap === 0) fail('fact_not_from_text', 'known_fact', 'known_fact must restate what the person actually said happened, in terms of their own details.');
  }

  // 5. Novelty against angles already shown.
  const previous = ctx.previous || [];
  previous.forEach((p, i) => {
    const prevStems = contentStems(`${p.subtitle_line_1} ${p.subtitle_line_2}`);
    const sim = jaccard(lineStems, prevStems);
    const lineSim = Math.max(
      ...[l1, l2].flatMap((a) => [p.subtitle_line_1, p.subtitle_line_2].map((b) => jaccard(contentStems(a), contentStems(b)))),
    );
    const samePattern = p.reasoning_pattern && p.reasoning_pattern === scene.reasoning_pattern && i === previous.length - 1;
    if (sim >= LIMITS.repeatSimilarity || lineSim >= LIMITS.repeatLineSimilarity || tidy(p.subtitle_line_1).toLowerCase() === tidy(l1).toLowerCase()
      || (samePattern && sim >= LIMITS.samePatternSimilarity)) {
      fail('repeats_previous', 'lines', 'This angle repeats one the person has already seen; offer a genuinely different, still-accurate perspective (a different pattern, part of the situation, question or action).');
    }
  });

  return { pass: failures.length === 0, failures, stats: { words: total, line1: n1, line2: n2 } };
}
