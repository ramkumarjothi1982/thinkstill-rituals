// Small, deterministic text helpers for validation and the quality gate.
// No dependencies; behaves the same in Workers and Node.

/** Straight quotes, single spaces, trimmed. */
export function tidy(text) {
  return String(text ?? '')
    .replace(/[‘’‛ʼ`´]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

const WORD_RE = /[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu;

/** Words as the person would count them (hyphenated and contracted words count once). */
export function words(text) {
  return tidy(text).match(WORD_RE) || [];
}

export function wordCount(text) {
  return words(text).length;
}

// Abbreviations that end in a full stop but do not end a sentence.
const ABBREV = /\b(?:mr|mrs|ms|dr|prof|st|vs|etc|e\.g|i\.e|approx|no)\.$/i;

/**
 * Split into sentences on . ! ? … followed by whitespace (or the end).
 * Closing quotes/brackets stay with their sentence.
 */
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
  ['message', 'messages', 'text', 'texts', 'texted', 'reply', 'replied', 'replies', 'respond', 'responded', 'response', 'answer', 'answered', 'dm', 'email', 'emailed', 'whatsapp'],
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
  ['said', 'say', 'saying', 'comment', 'comments', 'remark', 'words'],
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

/** Crude, stable stem: lower case, no possessive, common suffixes off. */
export function stem(word) {
  let w = word.toLowerCase().replace(/[’']s$/, '').replace(/[’']/g, "'");
  const syn = SYN_INDEX.get(w);
  if (syn) return syn;
  for (const suf of ['ingly', 'edly', 'ness', 'ment', 'ing', 'ies', 'ied', 'ed', 'es', 'ly', 's']) {
    if (w.length - suf.length >= 4 && w.endsWith(suf)) { w = w.slice(0, -suf.length); break; }
  }
  return w.length > 6 ? w.slice(0, 6) : w;
}

/** Content-word stems of a text (no stop words, no 1–2 letter words). */
export function contentStems(text) {
  const out = new Set();
  for (const raw of words(text)) {
    const w = raw.toLowerCase().replace(/’/g, "'");
    if (w.length < 3 || STOPWORDS.has(w) || /^\d+$/.test(w)) continue;
    out.add(stem(w));
  }
  return out;
}

/** Jaccard similarity of two sets. */
export function jaccard(a, b) {
  if (!a.size && !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'hundred', 'thousand', 'million', 'dozen', 'dozens', 'hundreds', 'thousands'];

/**
 * Numbers mentioned in a text, normalised so "5" and "five" match.
 * @returns {Set<string>}
 */
export function numbersIn(text) {
  const out = new Set();
  for (const raw of words(text)) {
    const w = raw.toLowerCase();
    if (/^\d+(?:[.,]\d+)?$/.test(w)) {
      const n = Number(w.replace(',', '.'));
      out.add(Number.isInteger(n) && n < NUMBER_WORDS.indexOf('thirty') ? NUMBER_WORDS[n] || w : w);
    } else if (NUMBER_WORDS.includes(w)) {
      out.add(w);
    }
  }
  return out;
}
