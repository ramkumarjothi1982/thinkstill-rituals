// Small, deterministic text helpers for validation and the quality gate.
// No dependencies; behaves the same in Workers and Node.

/** Straight quotes, single spaces, trimmed. */
/** @param {unknown} text */
export function tidy(text) {
  return String(text ?? '')
    .replace(/[‘’‛ʼ`´]/g, "'")
    .replace(/[“”„‟]/g, '"')
    // Hyphen and non-breaking hyphen are the same hyphen ("second‑hand").
    .replace(/[‐‑]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

// A word: letters/digits joined by apostrophes or hyphens ("weren't",
// "second-hand", "first-choice" count once); a number keeps its separators
// ("1,000", "3.5"); "e.g." and "i.e." are one word.
const WORD_RE = /\b(?:e\.g|i\.e|a\.m|p\.m)\.|\d+(?:[.,]\d+)+|[\p{L}\p{N}]+(?:['\-][\p{L}\p{N}]+)*/giu;

/** Words as the person would count them (hyphenated and contracted words count once). */
/** @param {unknown} text @returns {string[]} */
export function words(text) {
  return tidy(text).match(WORD_RE) || [];
}

/** @param {unknown} text */
export function wordCount(text) {
  return words(text).length;
}

// Abbreviations that end in a full stop but do not end a sentence.
const ABBREV = /\b(?:mr|mrs|ms|dr|prof|st|vs|etc|e\.g|i\.e|approx|no)\.$/i;

/**
 * Split into sentences on . ! ? … followed by whitespace (or the end).
 * Closing quotes/brackets stay with their sentence.
 */
/** @param {unknown} text @returns {string[]} */
export function sentences(text) {
  const t = tidy(text);
  if (!t) return [];
  const out = [];
  let start = 0;
  const re = /[.!?…]+["')\]]*(?=\s|$)/g;
  let m;
  while ((m = re.exec(t))) {
    const end = m.index + m[0].length;
    const chunk = t.slice(start, end).trim();
    if (m[0].startsWith('.') && ABBREV.test(t.slice(start, m.index + 1))) continue;
    if (chunk && /[\p{L}\p{N}]/u.test(chunk)) out.push(chunk);
    start = end;
  }
  const rest = t.slice(start).trim();
  if (rest && /[\p{L}\p{N}]/u.test(rest)) out.push(rest);
  return out;
}

/** Words that carry no situation-specific meaning. */
export const STOPWORDS = new Set(`a about above after again against ago all almost alone along already also although always am among an and another any anybody anyone anything anyway anywhere are aren't around as at away back be became because become been before being below between both but by can can't cannot could couldn't did didn't do does doesn't doing don't done down during each either else enough even ever every everybody everyone everything few for from further get gets getting go goes going gone got gotten had hadn't has hasn't have haven't having he he'd he'll he's her here hers herself him himself his how however i i'd i'll i'm i've if in into is isn't it it's its itself just keep keeps kind least less let let's like little lot lots made make makes many may maybe me might mine more most much must my myself near need needs never new next no nobody none nor not nothing now of off often oh ok okay on once one only onto or other others otherwise our ours ourselves out over own perhaps quite rather really right said same say says see seem seems shall she she'd she'll she's should shouldn't since so some somebody someone something sometimes somewhere soon still such sure take than that that's the their theirs them themselves then there there's these they they'd they'll they're they've thing things think this those though through thus till to too toward towards under until up upon us very was wasn't way we we'd we'll we're we've well were weren't what what's whatever when where whether which while who who's whom whose why will with within without won't would wouldn't yeah yes yet you you'd you'll you're you've your yours yourself yourselves feel feels feeling felt know knew want wanted wants thought thinking moment bit day today time times actually honestly literally basically totally completely`.split(/\s+/));

/** Groups of words that refer to the same thing in someone's situation. */
const SYNONYMS = [
  // Not "head": "your head is doing a lot of guessing" is not about the boss.
  ['boss', 'manager', 'supervisor', 'line-manager', 'head-teacher', 'headteacher'],
  ['partner', 'boyfriend', 'girlfriend', 'husband', 'wife', 'fiance', 'fiancé', 'fiancée', 'spouse', 'date'],
  ['message', 'messages', 'text', 'texts', 'texted', 'texting', 'reply', 'replied', 'replies', 'replying', 'respond', 'responded', 'response', 'answer', 'answered', 'dm', 'email', 'emailed', 'whatsapp', 'silence', 'silent', 'phone'],
  ['exam', 'exams', 'test', 'tests', 'assessment', 'assessments', 'resit', 'mark', 'marks', 'grade', 'grades', 'result', 'results',
    'topic', 'topics', 'revision', 'revise', 'revising', 'module', 'modules', 'coursework', 'syllabus'],
  ['mum', 'mom', 'mother', 'mam', 'mummy'],
  ['dad', 'father', 'daddy'],
  // A promotion is about the job: "promoted" meets "the role".
  ['job', 'work', 'workplace', 'role', 'career', 'office', 'shift', 'promotion', 'promoted', 'promote', 'position'],
  ['colleague', 'colleagues', 'coworker', 'coworkers', 'co-worker', 'co-workers', 'teammate', 'teammates', 'team'],
  ['friend', 'friends', 'mate', 'mates', 'pal', 'bestie', 'best-friend'],
  ['invite', 'invited', 'invitation', 'party', 'plans', 'group-chat'],
  ['mistake', 'mistakes', 'error', 'errors', 'slip', 'messed', 'blunder'],
  ['meeting', 'meetings', 'call', 'presentation', 'pitch', 'standup', 'stand-up'],
  ['school', 'class', 'uni', 'university', 'college', 'course', 'lecture', 'teacher', 'tutor'],
  // Speech: "told him I loved him" meets "words that big". "Conversation" and
  // "chat" are not here: almost any line can mention one ("Every conversation
  // is a chance…"), so the gate counts them only for a talk the person
  // reported (src/gate.js, PLANNED_TALK).
  ['said', 'say', 'says', 'saying', 'told', 'tell', 'tells', 'telling', 'comment', 'comments', 'remark', 'remarks', 'words', 'talk', 'talked', 'talking', 'talks', 'spoke', 'speak', 'speaking'],
  // A doctor's appointment. ("Slot" is not here: "every slot in life…" is not about the appointment.)
  ['doctor', 'doctors', 'gp', 'nurse', 'appointment', 'appointments', 'clinic', 'surgery', 'hospital', 'consultant'],
  ['embarrassed', 'embarrassing', 'embarrassment', 'awkward', 'cringe', 'humiliated'],
  ['ignored', 'ignoring', 'ignore', 'blanked', 'ghosted', 'unanswered'],
  ['fail', 'failed', 'failing', 'failure'],
  ['interview', 'application', 'applied', 'rejected', 'rejection'],
  ['sister', 'brother', 'sibling', 'siblings'],
  ['family', 'parents', 'relatives'],
  ['money', 'bill', 'bills', 'rent', 'debt', 'overdraft'],
  ['replaying', 'replay', 'replayed', 'loop', 'looping', 'going-over'],
];
const SYN_INDEX = new Map();
SYNONYMS.forEach((group, i) => group.forEach((w) => SYN_INDEX.set(w, `syn${i}`)));

// Irregular verb forms → base form, so "rewrote" meets "rewrite" and
// "thought" meets "think" when the gate compares a reply with the person's words.
export const IRREGULAR = new Map(Object.entries({
  wrote: 'write', written: 'write', rewrote: 'rewrite', rewritten: 'rewrite', thought: 'think', said: 'say', told: 'tell',
  felt: 'feel', left: 'leave', made: 'make', took: 'take', taken: 'take', gave: 'give', given: 'give', went: 'go', gone: 'go',
  came: 'come', saw: 'see', seen: 'see', got: 'get', gotten: 'get', forgot: 'forget', forgotten: 'forget', broke: 'break',
  broken: 'break', spoke: 'speak', spoken: 'speak', chose: 'choose', chosen: 'choose', ate: 'eat', eaten: 'eat', drove: 'drive',
  driven: 'drive', fell: 'fall', fallen: 'fall', lost: 'lose', won: 'win', sent: 'send', spent: 'spend', built: 'build',
  bought: 'buy', brought: 'bring', caught: 'catch', taught: 'teach', sold: 'sell', held: 'hold', kept: 'keep', slept: 'sleep',
  met: 'meet', ran: 'run', sat: 'sit', stood: 'stand', understood: 'understand', began: 'begin', begun: 'begin', threw: 'throw',
  thrown: 'throw', wore: 'wear', worn: 'wear', hid: 'hide', hidden: 'hide', shook: 'shake', woke: 'wake', woken: 'wake',
  blew: 'blow', grew: 'grow', knew: 'know', known: 'know', drew: 'draw', flew: 'fly', froze: 'freeze', frozen: 'freeze',
  stole: 'steal', stolen: 'steal', fought: 'fight', learnt: 'learn', burnt: 'burn', dreamt: 'dream', meant: 'mean', paid: 'pay',
  heard: 'hear', found: 'find', lied: 'lie', tried: 'try', cried: 'cry', died: 'die', dying: 'die',
}));

/** Crude, stable stem: lower case, no possessive, irregular forms mapped, common suffixes and a final e off. */
/** @param {string} word */
export function stem(word) {
  return stemWith(word, true);
}

/**
 * The same stem without the synonym groups: "manager" stays "manage" rather
 * than meeting "boss". The engagement check uses it to tell the person's own
 * word from a word that only shares a group with one.
 * @param {string} word
 */
export function plainStem(word) {
  return stemWith(word, false);
}

/** @param {string} word @param {boolean} syn */
function stemWith(word, syn) {
  let w = word.toLowerCase().replace(/[’']s$/, '').replace(/[’']/g, "'");
  // A plain plural of a listed word is that word: "courses" is "course"
  // (the suffix rule below would strip "es" and leave "cours").
  const group = syn && (SYN_INDEX.get(w) || (w.length > 3 && w.endsWith('s') ? SYN_INDEX.get(w.slice(0, -1)) : undefined));
  if (group) return group;
  const irr = IRREGULAR.get(w);
  if (irr) w = irr;
  else {
    for (const suf of ['ingly', 'edly', 'ations', 'ation', 'ness', 'ment', 'ing', 'ies', 'ied', 'ed', 'es', 'ly', 's']) {
      if (w.length - suf.length >= 3 && w.endsWith(suf)) { w = w.slice(0, -suf.length); break; }
    }
  }
  const syn2 = syn && SYN_INDEX.get(w);
  if (syn2) return syn2;
  // "like"/"liked"/"liking" → "lik"; "cancelled"/"cancel" → "cancel".
  if (w.length > 3) w = w.replace(/e$/u, '');
  w = w.replace(/([b-df-hj-np-tv-z])\1$/u, '$1');
  return w.length > 6 ? w.slice(0, 6) : w;
}

/**
 * Members of the synonym groups that fit almost any line ("the answer",
 * "your call", "a result", "work", "plans", "class", "tell yourself"): a line
 * that meets the person's words only through one of these says little about
 * their situation, so the engagement check needs a second hit beside it. The
 * rest of each group ("reply" for "texted", "courses" for "university",
 * "role" for "promoted") still counts on its own.
 */
export const BROAD_SYNONYMS = new Set(`answer answered answers phone silence silent result results mark marks work works worked working shift position
plans plan party call calls class classes said say says saying told tell tells telling words word talk talked talking talks spoke speak speaking`
  .split(/\s+/).map((w) => plainStem(w)));

/**
 * Lower-cased words, each hyphenated word followed by its parts, so
 * "first-choice" meets "first choice" and "second-hand" meets "hand".
 * @param {unknown} text @returns {string[]}
 */
export function wordsAndParts(text) {
  const out = [];
  for (const raw of words(text)) {
    const w = raw.toLowerCase();
    out.push(w);
    if (w.includes('-')) out.push(...w.split('-').filter(Boolean));
  }
  return out;
}

/** Content-word stems of a text (no stop words, no 1–2 letter words). */
/** @param {unknown} text @returns {Set<string>} */
export function contentStems(text) {
  const out = new Set();
  for (const w of wordsAndParts(text)) {
    if (w.length < 3 || STOPWORDS.has(w) || /^[\d.,]+$/.test(w)) continue;
    out.add(stem(w));
  }
  return out;
}

/**
 * Stems of every word, stop words included, for matching a reply against the
 * person's content words ("Each like is a tap" engages "keeps liking his ex's
 * photos" even though "like" is a stop word on its own).
 * @param {unknown} text @returns {Set<string>}
 */
export function allStems(text) {
  const out = new Set();
  for (const w of wordsAndParts(text)) {
    if (w.length < 3 || /^[\d.,]+$/.test(w)) continue;
    out.add(stem(w));
  }
  return out;
}

/**
 * Words that frame almost any angle ("the fact is real", "it's still a
 * question", "what it means"): they say how a line is built, not what it
 * says, so the novelty check leaves them out.
 */
const FRAME_WORDS = new Set(`fact facts real true question questions answer answered unanswered mean means meaning meant possible possibility part story guess decide decided matter matters worth sure`.split(' '));
const FRAME_STEMS = new Set([...FRAME_WORDS].map((w) => stem(w)));

/**
 * The meaning-bearing stems of an angle: its content words minus the
 * person's own (every angle may name the exam, the boss or the five hours)
 * and minus the framing words above. Two angles that share many of these
 * say the same new thing, however the sentences are built.
 * @param {unknown} text @param {Set<string>} inputStems contentStems of the person's text
 * @returns {Set<string>}
 */
export function meaningStems(text, inputStems) {
  const out = new Set();
  for (const s of contentStems(text)) if (!inputStems.has(s) && !FRAME_STEMS.has(s)) out.add(s);
  return out;
}

/** Jaccard similarity of two sets. */
/** @param {Set<string>} a @param {Set<string>} b */
export function jaccard(a, b) {
  if (!a.size && !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

const UNITS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const BIG = { hundred: 100, thousand: 1000, million: 1e6, dozen: 12 };
const ORD_UNITS = ['zeroth', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth', 'eighteenth', 'nineteenth'];
const ORD_TENS = { twentieth: 20, thirtieth: 30, fortieth: 40, fiftieth: 50, sixtieth: 60, seventieth: 70, eightieth: 80, ninetieth: 90 };
const ORD_BIG = { hundredth: 100, thousandth: 1000, millionth: 1e6 };
const TIMES = { once: 1, twice: 2, thrice: 3 };
/** @type {Map<string, number>} */
const CARD = new Map([...UNITS.map((w, i) => /** @type {[string, number]} */ ([w, i])), ...Object.entries(TENS), ...Object.entries(BIG)]);
/** @type {Map<string, number>} */
const ORD = new Map([...ORD_UNITS.map((w, i) => /** @type {[string, number]} */ ([w, i])), ...Object.entries(ORD_TENS), ...Object.entries(ORD_BIG)]);
const ALT = (/** @type {Iterable<string>} */ ws) => [...ws].sort((a, b) => b.length - a.length).join('|');
const TENS_ALT = ALT(Object.keys(TENS));
const UNIT_ALT = ALT(UNITS.slice(1, 10));
// One number as written: digits ("1,000", "3.5", "4th", "2am"), words
// ("twenty-five", "a hundred", "two hundred"), ordinals ("third",
// "twenty-first"), "once"/"twice", and the vague plurals ("hundreds").
const NUM_TOKEN = new RegExp(String.raw`(?<![\p{L}\p{N}])(?:(\d+(?:[.,]\d+)*)(st|nd|rd|th|am|pm)?|((?:a|an|one|${UNIT_ALT}) (?:hundred|thousand|million|dozen))|((?:${TENS_ALT})-(?:${UNIT_ALT}))|((?:${TENS_ALT})-(?:${ALT(ORD_UNITS.slice(1, 10))}))|(hundreds|thousands|millions|dozens)|([\p{L}]+))(?![\p{L}\p{N}])`, 'giu');

/**
 * @typedef {{ raw: string, value: number | null, kind: 'cardinal' | 'ordinal' | 'times' | 'clock' | 'vague', start: number, end: number }} NumberToken
 */

/**
 * Every number in a text, with its value, so "5", "five" and "fifth" meet,
 * and "1,000" meets "a thousand". Vague plurals ("hundreds of things") are
 * kept with no value.
 * @param {unknown} text @returns {NumberToken[]}
 */
export function numberTokens(text) {
  const t = tidy(text);
  /** @type {NumberToken[]} */
  const out = [];
  for (const m of t.matchAll(NUM_TOKEN)) {
    const start = m.index ?? 0;
    const end = start + m[0].length;
    const raw = m[0];
    if (m[1] !== undefined) {
      const d = m[1];
      // "1,000" is a thousand; "3,5" and "3.5" are three and a half.
      const value = Number(/^\d{1,3}(?:,\d{3})+$/.test(d) ? d.replace(/,/g, '') : d.replace(',', '.'));
      const suf = (m[2] || '').toLowerCase();
      out.push({ raw, value, kind: suf === 'am' || suf === 'pm' ? 'clock' : suf ? 'ordinal' : 'cardinal', start, end });
    } else if (m[3] !== undefined) {
      const [a, b] = m[3].toLowerCase().split(' ');
      out.push({ raw, value: (a === 'a' || a === 'an' ? 1 : CARD.get(a) ?? 1) * (BIG[/** @type {keyof typeof BIG} */ (b)] ?? 1), kind: 'cardinal', start, end });
    } else if (m[4] !== undefined) {
      const [a, b] = m[4].toLowerCase().split('-');
      out.push({ raw, value: TENS[/** @type {keyof typeof TENS} */ (a)] + (CARD.get(b) ?? 0), kind: 'cardinal', start, end });
    } else if (m[5] !== undefined) {
      const [a, b] = m[5].toLowerCase().split('-');
      out.push({ raw, value: TENS[/** @type {keyof typeof TENS} */ (a)] + (ORD.get(b) ?? 0), kind: 'ordinal', start, end });
    } else if (m[6] !== undefined) {
      out.push({ raw, value: null, kind: 'vague', start, end });
    } else {
      const w = m[7].toLowerCase();
      if (CARD.has(w)) out.push({ raw, value: /** @type {number} */ (CARD.get(w)), kind: 'cardinal', start, end });
      else if (ORD.has(w)) out.push({ raw, value: /** @type {number} */ (ORD.get(w)), kind: 'ordinal', start, end });
      else if (w in TIMES) out.push({ raw, value: TIMES[/** @type {keyof typeof TIMES} */ (w)], kind: 'times', start, end });
    }
  }
  return out;
}

/**
 * The numbers a text mentions, as values ("5", "five", "fifth" and "5th" are
 * all "5"; "1,000" and "a thousand" are both "1000"); vague plurals as words.
 * @param {unknown} text @returns {Set<string>}
 */
export function numbersIn(text) {
  return new Set(numberTokens(text).map((n) => (n.value === null ? n.raw.toLowerCase() : String(n.value))));
}
