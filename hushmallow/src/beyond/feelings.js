// Another Angle: a feeling the person names about themselves, now ("I feel empty", "I can't stop crying").
//
//   feelingClause(piece)   → the kind of feeling ('low' | 'lonely' | 'anxious' | 'guilty' | 'tired' | 'crying' | 'angry')
//                            when a clause is a feeling of their own, else null
//   feelingStatement(text) → { kind } when the whole message is feelings of their own (nothing that happened,
//                            nobody's mind read, no verdict on themselves), else null
//
// A feeling is real, and it is the fact: it is never "what your mind added", never "one way to read what
// happened", and never something to fact-check. Pure ES module, no DOM. Deterministic.

/** How a Thought Mallow looks for each kind of feeling (an emotion id the tints know). */
export const FEELING_LOOK = Object.freeze({ low: 'sadness', heavy: 'sadness', lonely: 'loneliness', anxious: 'anxiety', guilty: 'guilt', tired: 'overwhelm', crying: 'sadness', angry: 'frustration' });

/** Feeling words, by kind (each a phrase that completes "I feel …"). */
const KINDS = {
  low: 'empty|numb|sad|down|low|flat|blue|miserable|awful|terrible|horrible|rubbish|crap|crappy|heavy|hollow|lost|broken|heartbroken|gutted|upset|hurt|depressed|hopeless|unhappy|defeated|deflated|teary|tearful|emotional|off|weird|strange|grey|gray|nothing|dead inside|not myself|not (?:ok|okay|alright|all right|right|good|great)|so bad|really bad|rough|fragile|raw|worthless',
  lonely: 'alone|lonely|isolated|disconnected|invisible|unloved|unwanted|forgotten|cut off|on my own|all alone|by myself',
  anxious: 'anxious|worried|nervous|scared|frightened|afraid|terrified|panicky|panicked|on edge|tense|stressed|stressed out|overwhelmed|uneasy|jittery|wired|restless|shaky|sick with worry|dread|full of dread|frazzled|unsettled|out of control|like i(?:[\'’]m| am) drowning|like i can[\'’]?t breathe',
  guilty: 'guilty|ashamed|embarrassed|bad|so guilty|awful about it|terrible about it|bad about it',
  tired: 'tired|exhausted|drained|worn out|burnt out|burned out|knackered|shattered|done|fed up|run down|wiped out|spent|sick of everything|tired of everything|sick and tired',
  crying: 'like crying|like i (?:could|want to|might|need to) cry|like (?:bursting into|breaking into) tears|tearful',
  angry: 'angry|frustrated|irritated|annoyed|cross|grumpy|irritable|resentful|bitter|wound up|mad',
};
/** "so", "really", "a bit"… before a feeling word. */
const INTENS = '(?:(?:so|really|very|quite|a bit|a little|kind of|kinda|sort of|pretty|totally|completely|incredibly|super|extremely|absolutely|just|too|that|rather|deeply|utterly|properly|a lot|more|even more|horribly|awfully|terribly|weirdly|strangely|constantly|always|still|all|honestly|genuinely|literally|actually)\\s+)*';
/** Openers before the feeling ("and", "honestly", "right now"). */
const LEAD = '^(?:(?:and|but|so|just|honestly|really|still|now|today|tonight|lately|recently|right now|i think|i guess|tbh|ugh|oh|well|sometimes|always|always just|at the moment|these days|most days|every day|again)[,\\s]+)*';
/** What may follow a feeling and keep it a feeling ("today", "for no reason", "all the time"). */
const TAIL = '(?:[,\\s]+(?:today|tonight|right now|again|lately|recently|at the moment|atm|this (?:week|morning|evening|afternoon|year|month)|all (?:day|night|week|the time|weekend|day long)|every (?:day|night|morning|single day)|for (?:days|weeks|months|ages|a while|so long|no reason|some reason|no real reason)|and i don[\'’]?t know why|and i can[\'’]?t (?:explain|shake|stop) it|i don[\'’]?t know why|for no reason at all|inside|all over|in my (?:chest|stomach|body|head)|about (?:it|everything|this|that|all of it|it all|life)|with (?:it all|everything|life)|now|still|too|anymore|any more|these days|most days|constantly|honestly|tbh|at all|lol|x+))*';
const END = '\\s*[.!?…]*\\s*$';
const ALL_WORDS = Object.values(KINDS).join('|');
const FEEL_VERB = '(?:feel|felt|am feeling|[\'’]m feeling|[\'’]ve been feeling|have been feeling|keep feeling|can feel|feel like i[\'’]m|have felt|[\'’]ve felt)';
const BE = '(?:[\'’]m|am|[\'’]ve been|have been|was|keep being|feel so|get so)';
/** "I'm …": only the plain states (never a verdict: "I'm terrible" is a label, "I feel terrible" a feeling). */
const STATE_KINDS = {
  low: 'empty|numb|sad|down|low|flat|miserable|heartbroken|gutted|upset|hurt|depressed|hopeless|unhappy|teary|tearful|emotional|struggling|not (?:ok|okay|alright|all right|coping|doing (?:well|great|good|ok|okay))|a mess inside|in pieces|falling apart|broken inside',
  lonely: 'alone|lonely|isolated|so alone|all alone|on my own|by myself',
  anxious: 'anxious|worried|nervous|scared|frightened|afraid|terrified|panicking|panicky|on edge|tense|stressed|stressed out|overwhelmed|uneasy|shaking|restless|freaking out|in a panic|a nervous wreck|frazzled',
  guilty: 'guilty|ashamed|embarrassed',
  tired: 'tired|exhausted|drained|worn out|burnt out|burned out|knackered|shattered|done|fed up|run down|wiped out|spent|sick and tired|so tired|over it',
  crying: 'crying|in tears|sobbing|tearful',
  angry: 'angry|frustrated|irritated|annoyed|cross|grumpy|irritable|wound up|fuming|livid|furious',
};
const kindOf = (word, table) => {
  const w = String(word || '').toLowerCase().replace(/[‘’]/g, "'");
  for (const [kind, list] of Object.entries(table)) if (new RegExp(`^(?:${list.replace(/’/g, "'")})$`, 'iu').test(w)) return kind;
  return null;
};
const FEEL_RE = new RegExp(`${LEAD}i\\s+(?:(?:just|still|really|honestly|always|often|sometimes|kind of|sort of|actually|genuinely|do|can)\\s+)*${FEEL_VERB}\\s+${INTENS}(?<w>${ALL_WORDS})(?:\\s*(?:,|and|or|but also|&)\\s*${INTENS}(?:${ALL_WORDS}))*`, 'iu');
const STATE_ALL = Object.values(STATE_KINDS).join('|');
const STATE_RE = new RegExp(`${LEAD}i\\s*${BE}\\s+${INTENS}(?<w>${STATE_ALL})(?:\\s*(?:,|and|or|&)\\s*${INTENS}(?:${STATE_ALL}))*`, 'iu');
/** Crying, said plainly ("I can't stop crying", "I've been crying all day", "I keep bursting into tears"). */
const CRY_RE = new RegExp(`${LEAD}(?:i\\s+(?:can[\'’]?t|cannot|couldn[\'’]?t)\\s+stop\\s+(?:crying|sobbing|shaking|tearing up)|i(?:[\'’]ve|\\s+have)\\s+been\\s+(?:crying|sobbing|in\\s+tears)|i\\s+(?:keep|kept)\\s+(?:crying|bursting\\s+into\\s+tears|tearing\\s+up|welling\\s+up)|i\\s+cried\\s+(?:all|so|for|myself)|i\\s+(?:just\\s+)?(?:want|need)\\s+to\\s+cry|i\\s+(?:keep|can[\'’]?t\\s+stop)\\s+worrying)`, 'iu');
/** "I'm so tired of everything", "I'm sick of it all". */
const TIRED_OF_RE = new RegExp(`${LEAD}i\\s*${BE}\\s+${INTENS}(?:tired|sick|fed\\s+up|exhausted|worn\\s+out|done|sick\\s+and\\s+tired)\\s+(?:of|with)\\s+(?:everything|it\\s+all|all\\s+of\\s+it|this|all\\s+this|this\\s+feeling|feeling\\s+like\\s+this|being\\s+like\\s+this|it|life|everyone|people|the\\s+world|myself)`, 'iu');
/** "Everything feels too much", "it's all so heavy", "this is hard". */
const HEAVY_RE = new RegExp(`${LEAD}(?:everything|it\\s+all|life|today|this\\s+week|things|the\\s+world|this|that|it)(?:[\'’]s|\\s+is|\\s+feels|\\s+seems|\\s+has\\s+been|\\s+feels\\s+like\\s+it[\'’]s)\\s+${INTENS}(?:heavy|hard|much|too\\s+much|a\\s+lot|overwhelming|exhausting|grey|gray|dark|bleak|difficult|tough|rough|awful|horrible|rubbish|crap|so\\s+hard|really\\s+hard)`, 'iu');
/** "I can't cope", "I can't switch off" (said about themselves, now). */
const CANT_RE = new RegExp(`${LEAD}i\\s+(?:just\\s+)?(?:can[\'’]?t|cannot)\\s+(?:cope|relax|settle|calm\\s+down|switch\\s+off|focus|concentrate|sleep|breathe|stop\\s+shaking|get\\s+out\\s+of\\s+bed|face\\s+(?:anything|today|it)|do\\s+this\\s+any\\s*more)`, 'iu');
/** No subject, or one word ("Feeling so low today.", "Exhausted.", "So lonely."). */
const BARE_RE = new RegExp(`${LEAD}(?:feeling\\s+|feel\\s+)?${INTENS}(?<w>${ALL_WORDS}|${STATE_ALL})`, 'iu');

const FORMS = [
  [FEEL_RE, (m) => kindOf(m.groups?.w, KINDS)],
  [STATE_RE, (m) => kindOf(m.groups?.w, STATE_KINDS)],
  [CRY_RE, (m) => (/worrying/i.test(m[0]) ? 'anxious' : 'crying')],
  [TIRED_OF_RE, () => 'tired'],
  [HEAVY_RE, () => 'low'],
  [CANT_RE, (m) => (/breathe|shaking|relax|settle|calm|switch/i.test(m[0]) ? 'anxious' : /sleep|bed/i.test(m[0]) ? 'tired' : 'low')],
];
const tidy = (s) => String(s ?? '').replace(/[‘’`´]/g, '’').replace(/\s+/g, ' ').trim();

/** The kind of feeling when `piece` opens as a feeling of their own ("I feel guilty for saying no"), else null. */
export function feelingClause(piece) {
  const p = tidy(piece).replace(/^["“(]+/u, '');
  for (const [re, kind] of FORMS) { const m = re.exec(p); if (m) return kind(m) || 'low'; }
  return null;
}

/** Things in the words that make a message more than a feeling (something that happened, a guess, a verdict, a plan). */
const MORE_THAN_A_FEELING = /\b(?:because|cos|when|if|what if|will|won['’]?t|going to|gonna|tomorrow|next|should|shouldn['’]?t|must|always|never|everyone|everybody|nobody|no one|he|she|they|them|him|her|his|their|boss|manager|friend|friends|mum|mom|dad|partner|sister|brother|family|teacher|colleague|work|school|exam|test|interview|deadline|said|told|did|didn['’]?t|made|make|ignored|left|like a (?:failure|loser|burden|fraud|joke|idiot)|my fault|hate|hates)\b/iu;

/**
 * { kind } when every clause of the message is a feeling of their own, said plainly ("I feel empty",
 * "I feel so alone", "I can't stop crying", "I'm so tired of everything"), else null.
 */
export function feelingStatement(text) {
  const t = tidy(text);
  if (!t || t.length > 200) return null;
  // the clauses: sentences, then "and" / "but" / a comma before a new "I" or a new feeling
  const clauses = t.split(/(?<=[.!?…])\s+|\s*(?:[,;]|\band\b|\bbut\b|\bso\b)\s+(?=(?:i\b|i['’]|everything\b|it\s+all\b|life\b|feeling\b|this\b|it['’]s\b))/iu)
    .map((c) => c.trim()).filter((c) => /\p{L}/u.test(c));
  if (!clauses.length || clauses.length > 4) return null;
  let kind = null;
  for (const c of clauses) {
    const k = wholeFeeling(c);
    if (!k) return null;
    if (k !== 'alongside') kind ||= k;
  }
  return kind ? { kind } : null;
}
/** Clauses that keep a feeling company without adding anything to it. */
const ALONGSIDE = /^(?:and\s+|but\s+)?i\s+(?:(?:just|really|honestly)\s+)?(?:don['’]?t|do\s+not|can['’]?t|cannot)\s+(?:know\s+why|know\s+what['’]?s\s+wrong(?:\s+with\s+me)?|know\s+what\s+to\s+do|explain\s+it|explain\s+why|shake\s+it|shake\s+it\s+off|work\s+out\s+why)\s*[.!?…]*$|^(?:and\s+)?it\s+won['’]?t\s+(?:go\s+away|stop|lift|shift)\s*[.!?…]*$/iu;
/** A clause that is only a feeling (and what may trail one), with nothing more in it. */
function wholeFeeling(clause) {
  const c = tidy(clause).replace(/^["“(]+|["”)]+$/gu, '');
  for (const [re, kind] of FORMS) {
    const m = new RegExp(`${re.source}${TAIL}${END}`, re.flags).exec(c);
    if (m) return kind(m) || 'low';
  }
  // a little context that names nothing more than the feeling ("I feel guilty for saying no", "I feel numb
  // since the breakup", "I feel lonely at uni"): no one else's mind, no verdict, nothing ahead
  for (const [re, kind] of FORMS) {
    const m = re.exec(c);
    if (!m) continue;
    const rest = c.slice(m.index + m[0].length).trim().replace(/[.!?…]+$/u, '');
    const ctx = /^(?:for|about|over|since|after|at|in|around|from|with|without|because of|ever since|all through)\s+(.+)$/iu.exec(rest);
    if (ctx && rest.split(/\s+/).length <= 8 && !MORE_THAN_A_FEELING.test(ctx[1]) && !/\b(?:after|since)\s+(?:he|she|they|my|i)\b/iu.test(rest)) return kind(m) || 'low';
  }
  // what may stand beside a feeling as a clause of its own ("…and I don't know why")
  if (ALONGSIDE.test(c)) return 'alongside';
  const b = new RegExp(`${BARE_RE.source}${TAIL}${END}`, BARE_RE.flags).exec(c);
  if (b) return kindOf(b.groups?.w, KINDS) || kindOf(b.groups?.w, STATE_KINDS) || 'low';
  return null;
}
