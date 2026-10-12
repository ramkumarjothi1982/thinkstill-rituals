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
  ['boss', 'manager', 'supervisor', 'line-manager', 'head'],
  ['partner', 'boyfriend', 'girlfriend', 'husband', 'wife', 'fiance', 'fiancé', 'fiancée', 'spouse', 'date'],
  ['message', 'messages', 'text', 'texts', 'texted', 'texting', 'reply', 'replied', 'replies', 'replying', 'respond', 'responded', 'response', 'answer', 'answered', 'dm', 'email', 'emailed', 'whatsapp', 'silence', 'silent', 'phone'],
  ['exam', 'exams', 'test', 'tests', 'assessment', 'assessments', 'resit', 'mark', 'marks', 'grade', 'grades', 'result', 'results'],
  ['mum', 'mom', 'mother', 'mam', 'mummy'],
  ['dad', 'father', 'daddy'],
  ['job', 'work', 'workplace', 'role', 'career', 'office', 'shift'],
  ['colleague', 'colleagues', 'coworker', 'coworkers', 'co-worker', 'co-workers', 'teammate', 'teammates', 'team'],
  ['friend', 'friends', 'mate', 'mates', 'pal', 'bestie', 'best-friend'],
  ['invite', 'invited', 'invitation', 'party', 'plans', 'group-chat'],
  ['promotion', 'promoted', 'promote'],
  ['mistake', 'mistakes', 'error', 'errors', 'slip', 'messed', 'blunder'],
  ['meeting', 'meetings', 'call', 'presentation', 'pitch', 'standup', 'stand-up'],
  ['school', 'class', 'uni', 'university', 'college', 'course', 'lecture', 'teacher', 'tutor'],
  // Speech: "told him I loved him" meets "words that big"; "we need to talk" meets "the conversation".
  ['said', 'say', 'says', 'saying', 'told', 'tell', 'tells', 'telling', 'comment', 'comments', 'remark', 'remarks', 'words', 'talk', 'talked', 'talking', 'talks', 'conversation', 'conversations', 'chat', 'spoke', 'speak', 'speaking'],
  // A doctor's appointment: "my doctor wants to see me" meets "booking the soonest slot".
  ['doctor', 'doctors', 'gp', 'nurse', 'appointment', 'appointments', 'clinic', 'surgery', 'hospital', 'consultant', 'slot'],
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
  let w = word.toLowerCase().replace(/[’']s$/, '').replace(/[’']/g, "'");
  const syn = SYN_INDEX.get(w);
  if (syn) return syn;
  const irr = IRREGULAR.get(w);
  if (irr) w = irr;
  else {
    for (const suf of ['ingly', 'edly', 'ations', 'ation', 'ness', 'ment', 'ing', 'ies', 'ied', 'ed', 'es', 'ly', 's']) {
      if (w.length - suf.length >= 3 && w.endsWith(suf)) { w = w.slice(0, -suf.length); break; }
    }
  }
  const syn2 = SYN_INDEX.get(w);
  if (syn2) return syn2;
  // "like"/"liked"/"liking" → "lik"; "cancelled"/"cancel" → "cancel".
  if (w.length > 3) w = w.replace(/e$/u, '');
  w = w.replace(/([b-df-hj-np-tv-z])\1$/u, '$1');
  return w.length > 6 ? w.slice(0, 6) : w;
}

/**
 * Lower-cased words, each hyphenated word followed by its parts, so
 * "first-choice" meets "first choice" and "second-hand" meets "hand".
 * @param {unknown} text @returns {string[]}
 */
function wordsAndParts(text) {
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

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'hundred', 'thousand', 'million', 'dozen', 'dozens', 'hundreds', 'thousands'];
// "for the third time" and "three times" are the same detail.
const ORDINALS = new Map(Object.entries({
  first: 'one', second: 'two', third: 'three', fourth: 'four', fifth: 'five', sixth: 'six', seventh: 'seven', eighth: 'eight',
  ninth: 'nine', tenth: 'ten', eleventh: 'eleven', twelfth: 'twelve', twentieth: 'twenty', hundredth: 'hundred',
  '1st': 'one', '2nd': 'two', '3rd': 'three', '4th': 'four', '5th': 'five', '6th': 'six', '7th': 'seven', '8th': 'eight', '9th': 'nine', '10th': 'ten',
  once: 'one', twice: 'two', thrice: 'three',
}));

/**
 * Numbers mentioned in a text, normalised so "5" and "five" match.
 * @returns {Set<string>}
 */
/** @param {unknown} text */
export function numbersIn(text) {
  const out = new Set();
  for (const raw of words(text)) {
    const w = raw.toLowerCase();
    const ord = ORDINALS.get(w);
    if (ord) { out.add(ord); continue; }
    if (/^\d+(?:[.,]\d+)*$/.test(w)) {
      // "1,000" is a thousand, "3,5" and "3.5" are three and a half.
      const n = Number(/^\d{1,3}(?:,\d{3})+$/.test(w) ? w.replace(/,/g, '') : w.replace(',', '.'));
      out.add(Number.isInteger(n) && n < NUMBER_WORDS.indexOf('thirty') ? NUMBER_WORDS[n] || String(n) : String(n));
    } else if (NUMBER_WORDS.includes(w)) {
      out.add(w);
    }
  }
  return out;
}
