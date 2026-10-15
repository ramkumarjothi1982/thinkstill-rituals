// English inflectional morphology for the copy lint's lemma lists.
//
// A plain topic term, a banned medical term of the library and a 'term+'
// name are lemmas: the lint matches each one in all of its regular English
// inflections, so listing "smoke" also refuses "Smoked again.", "smokes",
// "smoking" and "smoker", and "vomit" refuses "Vomiting." (FU-3; the round-4
// review found 97 of 174 everyday phrasings passing a whole-word list).
//
//   forms(lemma)          the lemma's surface forms (generation): plural and
//                         3rd person (-s, -es, -ies), possessive ('s), past
//                         and participle (-ed, -d, -ied), gerund (-ing,
//                         -ying), comparative, superlative and agent noun
//                         (-er, -est, -ier, -iest, -ers), with the spelling
//                         rules of English: final e dropped (smoke → smoking),
//                         final y to i (ugly → uglier), a final consonant
//                         doubled after one short vowel (drug → drugged,
//                         cut → cutting), c to ck (panic → panicked); plus
//                         the irregular forms policy.lint.morphology lists
//                         (bleed → bled, throw → threw, get → got).
//   lemmaCandidates(word) the inverse, a conservative suffix-stripping
//                         stemmer: every base a word could be an inflection
//                         of. Every generated form strips back to its lemma
//                         (tests/unit/planner-morph.test.mjs), so generation
//                         and stemming are one rule table read two ways.
//
// Derived words are NOT generated. Derivation changes what a word means
// (grave → gravity, gravely; weed → weedy), so a derived form the lint must
// refuse (suicidal, sickly, alcoholic, idiotic, starvation) is a lemma of its
// own in planner/policy.json: the lemma list. Words a regular rule would
// produce but that are everyday words of their own ("weighted", as in a
// weighted blanket) are listed in policy.lint.morphology.notForms and never
// generated. A term written '=term' is matched only as written (an
// abbreviation such as 'rip' or 'kms', or a word whose inflections are
// innocent: 'weed' → weeding the garden).
//
// Pure (no imports).

/** Function words: never inflected inside a phrase ("end it all" inflects only "end"). */
export const STOP_WORDS = Object.freeze(new Set([
  'a', 'an', 'the', 'to', 'of', 'in', 'on', 'at', 'it', 'all', 'my', 'me', 'myself', 'your', 'yourself', 'our', 'his', 'her',
  'their', 'and', 'or', 'for', 'with', 'off', 'up', 'out', 'no', 'not', 'is', 'are', 'was', 'were', 'be', 'i', 'you', 'we',
  'they', 'so', 'too', 'own', 'by', 'as', 'than', 'that', 'this', 'one', 'into', 'over', 'under', 'again', 'never', 'way',
]));

/** A consonant-vowel-consonant ending whose last consonant doubles before a vowel suffix; w, x and y never double. */
const doubles = (w) => /(^|[^aeiou])[aeiou][b-df-hj-np-tvz]$/.test(w);
const consonantY = (w) => /[^aeiou]y$/.test(w);

/**
 * w + a suffix starting with a vowel (ed, ing, er, est), with every spelling
 * the rules allow: final e dropped, y to i, doubled consonant, c to ck.
 * Over-generating a rare non-word (vomit → vomitted) is harmless: it only
 * ever matches itself.
 */
function vowelSuffix(w, sfx) {
  const out = [];
  if (w.endsWith('e')) {
    out.push(w.slice(0, -1) + sfx);                               // smoke → smoked, smoking, smoker
    if (sfx === 'ing') out.push(w + sfx);                         // binge → bingeing (and binging)
  } else if (consonantY(w) && sfx !== 'ing') {
    out.push(`${w.slice(0, -1)}i${sfx}`);                         // ugly → uglier, carry → carried
  } else {
    out.push(w + sfx);
    if (doubles(w)) out.push(w + w.at(-1) + sfx);                 // drug → drugged, cut → cutting
    if (w.endsWith('c')) out.push(`${w}k${sfx}`);                 // panic → panicked, panicking
  }
  return out;
}

/**
 * The regular inflections of one word, the word itself included.
 * → array of distinct lowercase forms
 */
export function inflections(word) {
  const w = String(word).toLowerCase();
  if (w.length < 3 || /[^a-z]/.test(w)) return [w];   // 1-2 letters, digits, 'r.i.p', "mcdonald's", 'h&m': as written
  const out = new Set([w]);
  // plural / 3rd person singular
  if (/(s|x|z|ch|sh)$/.test(w)) out.add(`${w}es`);
  else if (consonantY(w)) out.add(`${w.slice(0, -1)}ies`);
  else { out.add(`${w}s`); if (w.endsWith('o')) out.add(`${w}es`); }
  out.add(`${w}'s`);
  // past and participle
  for (const f of vowelSuffix(w, 'ed')) out.add(f);
  // gerund
  if (w.endsWith('ie')) out.add(`${w.slice(0, -2)}ying`);           // die → dying
  else for (const f of vowelSuffix(w, 'ing')) out.add(f);
  // comparative, superlative, agent noun (and the agent noun's plural and possessive)
  for (const f of vowelSuffix(w, 'est')) out.add(f);
  for (const f of vowelSuffix(w, 'er')) { out.add(f); out.add(`${f}s`); out.add(`${f}'s`); }
  return [...out];
}

/**
 * Every surface form of a lemma: its regular inflections, its irregular
 * forms (morph.irregular[lemma]), minus morph.notForms (everyday words that
 * only look like an inflection). The lemma itself is always a form.
 * morph: { irregular: { lemma: [forms] }, notForms: Set|array } (optional).
 */
export function forms(lemma, morph = null) {
  const w = String(lemma).toLowerCase();
  const out = new Set(inflections(w));
  for (const f of morph?.irregular?.[w] || []) out.add(f.toLowerCase());
  const not = morph?.notForms;
  if (not) for (const f of not) if (f !== w) out.delete(f);
  return [...out];
}

/**
 * The stemmer: every base `word` could be a regular inflection of (the word
 * itself included), plus the lemmas whose irregular form it is. Conservative:
 * it only undoes the suffixes forms() adds, so a candidate need not be a real
 * word; callers look candidates up in a lemma list.
 */
export function lemmaCandidates(word, morph = null) {
  const w = String(word).toLowerCase();
  const out = new Set([w]);
  const add = (b) => { if (b.length >= 2) out.add(b); };
  const vowelBase = (b, sfx) => {
    // b = w with a vowel-initial suffix removed: undo e-drop, y→i, doubling, c→ck
    add(b); add(`${b}e`);
    if (b.endsWith('i') && sfx !== 'ing') add(`${b.slice(0, -1)}y`);
    if (/([b-df-hj-np-tvz])\1$/.test(b)) add(b.slice(0, -1));
    if (b.endsWith('ck')) add(b.slice(0, -1));
  };
  const base = w.endsWith("'s") ? w.slice(0, -2) : w;
  add(base);
  for (const v of [w, base]) {
    if (v.endsWith('ies')) add(`${v.slice(0, -3)}y`);
    if (v.endsWith('es')) add(v.slice(0, -2));
    if (v.endsWith('s')) add(v.slice(0, -1));
    if (v.endsWith('ying')) add(`${v.slice(0, -4)}ie`);
    for (const sfx of ['ed', 'ing', 'est', 'er', 'ers']) {
      if (!v.endsWith(sfx) || v.length - sfx.length < 2) continue;
      vowelBase(v.slice(0, -sfx.length), sfx === 'ers' ? 'er' : sfx);
    }
  }
  for (const [lemma, irr] of Object.entries(morph?.irregular || {})) if (irr.some((f) => f.toLowerCase() === w)) out.add(lemma);
  return [...out];
}

/**
 * The forms of every word of a term (a word or a phrase): content words get
 * forms(), function words (STOP_WORDS) and short abbreviations stay as written.
 * → [[forms of word 1], [forms of word 2], ...] and the separators between them.
 */
export function phraseForms(term, morph = null) {
  const words = term.split(/[ -]/);
  const seps = term.match(/[ -]/g) || [];
  return { words: words.map((w) => (STOP_WORDS.has(w.toLowerCase()) ? [w.toLowerCase()] : forms(w, morph))), seps };
}

/**
 * The glued spellings of an inflected term, as they could sit inside a
 * hashtag: lowercase letters and digits only. A phrase varies one content
 * word at a time ("self harm" → selfharm, selfharming, selfharmed, ...),
 * which covers every inflection English puts on a phrase without the
 * product of all combinations.
 */
export function gluedForms(term, morph = null) {
  const glue = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const { words } = phraseForms(term, morph);
  const lemma = words.map((f) => f[0]);
  const out = new Set([glue(lemma.join(''))]);
  words.forEach((fs, i) => { for (const f of fs) out.add(glue([...lemma.slice(0, i), f, ...lemma.slice(i + 1)].join(''))); });
  out.delete('');
  return [...out];
}
