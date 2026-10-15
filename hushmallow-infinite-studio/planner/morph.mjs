// English morphology for the copy lint's lemma lists (FU-3).
//
// A topic term, a banned medical term of the library and a 'term+' name are
// lemmas. One rule table, RULES, holds every suffix the lint knows. Each rule
// is a forward function: attach(base) returns the spellings English gives
// base + suffix. The table is read two ways, and both are used in production:
//
//   analyze(word)   the stemmer the copy lint runs on every word of a copy
//                   text (planner/policy.mjs wordMatcher): it strips suffixes,
//                   outermost first, and keeps a candidate base only when
//                   attaching the same rule to it gives the word back
//                   (propose, then confirm). So the stemmer is the exact
//                   inverse of the rules, not a second rule set: a word
//                   analyses to a base exactly when the rules derive the word
//                   from that base. The lint then looks the bases up in the
//                   lemma lists.
//   forms(lemma)    generation: the inflected forms, for the glued search
//                   inside hashtags, where there are no word boundaries to
//                   stem at (planner/lint-copy.mjs lintHashtag).
//
// Inflection (outermost, once): -s/-es/-ies, 's, -ed/-d/-ied, -ing/-ying,
// -est. Regular derivation (up to three, innermost first): -er (agent noun
// and comparative), -y, -ly, -ically, -ness, -ful, -less, -ment, -ish, -en,
// -able, -al, -ic, -ous, -ious, -ive, -ity, -ism, -ist, -ize/-ise, -ion,
// -ation, and the Greek and Latin patterns trauma → traumatic/traumatize,
// symptom → symptomatic, insomnia → insomniac, idiot → idiocy. So listing
// "suicide" also refuses "Suicidally sad.", "starve" refuses "Starvation
// mode.", "fat" refuses "Fattening snacks.", "hospital" refuses
// "Hospitalized.", and the library's "trauma" refuses "Traumatised.".
//
// Spelling: final e dropped before a vowel (smoke → smoky), y → i (ugly →
// ugliness) or dropped before an i (allergy → allergic, therapy →
// therapist), -ia dropped before -ic (anorexia → anorexic), a final
// consonant doubled after one short vowel (drug → druggy, fat → fattening),
// c → ck (panic → panicky).
//
// Derivation is guarded the way Porter's stemmer guards it, by the syllable
// weight of the base (measure(), Porter's m): -al, -ic, -ous, -ive, -ity,
// -ism, -ist and -ize need m >= 2; the lighter suffixes need m >= 1. So
// grave never gives gravity (m(grave) = 1), fat never gives fatal, pub never
// gives pubic, and die never gives dial (m = 0).
//
// What is data, not rules (planner/policy.json lint.morphology):
//   irregular  inflections no suffix rule makes (bleed → bled, light → lit).
//              A compound inherits its head's: gaslight → gaslit, overeat →
//              overate (the prefix must hold a vowel, so cheat is no
//              compound of eat).
//   notForms   innocent words the rules derive from a listed lemma (gravy
//              from grave, weighted from weight), each with its reason. They
//              never match a lemma other than themselves. The lint fails
//              closed: a new innocent look-alike is refused, with a message
//              naming the lemma, until it is listed here.
// Irregular derivation (disaster → disastrous, apocalypse → apocalyptic,
// nausea → nauseous) is a lemma of its own in the lists, as irregular
// inflection is listed in `irregular`. A term written '=term' is matched only
// as written. Words inside a phrase inflect but do not derive: a phrase
// names a situation, and a derived word changes it ("self harm" refuses
// "self-harming", not "self harmless").
//
// Pure (no imports).

/** Function words: never inflected inside a phrase ("end it all" inflects only "end"). */
export const STOP_WORDS = Object.freeze(new Set([
  'a', 'an', 'the', 'to', 'of', 'in', 'on', 'at', 'it', 'all', 'my', 'me', 'myself', 'your', 'yourself', 'our', 'his', 'her',
  'their', 'and', 'or', 'for', 'with', 'off', 'up', 'out', 'no', 'not', 'is', 'are', 'was', 'were', 'be', 'i', 'you', 'we',
  'they', 'so', 'too', 'own', 'by', 'as', 'than', 'that', 'this', 'one', 'into', 'over', 'under', 'again', 'never', 'way',
]));

/** How deep the stemmer strips: one inflection plus three derivations (hospital → hospitalize → hospitalization → hospitalizations). */
export const MAX_DEPTH = 4;

// ---- letters ----------------------------------------------------------------

/** Porter's consonant: not a, e, i, o, u, and not a y that follows a consonant. */
function isCons(w, i) {
  const c = w[i];
  if ('aeiou'.includes(c)) return false;
  if (c === 'y') return i === 0 ? true : !isCons(w, i - 1);
  return true;
}

/**
 * Porter's measure m of a word written [C](VC)^m[V]: how many times a vowel
 * is followed by a consonant. tree, by: 0; trouble, oats, fat, grave: 1;
 * troubles, private, suicide, therapy: 2.
 */
export function measure(word) {
  const w = String(word).toLowerCase();
  let m = 0;
  for (let i = 1; i < w.length; i++) if (isCons(w, i) && !isCons(w, i - 1)) m++;
  return m;
}

/** A consonant-vowel-consonant ending whose last consonant doubles before a vowel suffix; w, x and y never double. */
const doubles = (w) => /(^|[^aeiou])[aeiou][b-df-hj-np-tvz]$/.test(w);
const consonantY = (w) => /[^aeiou]y$/.test(w);
/** Vowel suffixes that may also keep a final e: binge → bingeing, puke → pukey, cure → cureable. */
const KEEP_E = new Set(['ing', 'y', 'able', 'ous']);

/**
 * w + a suffix that starts with a vowel (or y), with every spelling English
 * allows. Over-generating a rare non-word (vomit → vomitted) is harmless: it
 * only ever matches itself.
 */
function vowelSuffix(w, sfx) {
  const out = new Set();
  if (/[eoy]e$/.test(w) && sfx === 'ing') {
    out.add(w + sfx);                                                    // dye → dyeing, see → seeing (never "dying")
  } else if (w.endsWith('e')) {
    out.add(w.slice(0, -1) + sfx);                                       // smoke → smoking, smoky; suicide → suicidal
    if (KEEP_E.has(sfx)) out.add(w + sfx);                               // binge → bingeing, puke → pukey
  } else if (consonantY(w)) {
    if (sfx === 'ing' || sfx === 'ish') out.add(w + sfx);                // carry → carrying
    else if (sfx[0] === 'i') out.add(w.slice(0, -1) + sfx);              // allergy → allergic, therapy → therapist
    else out.add(`${w.slice(0, -1)}i${sfx}`);                            // ugly → uglier, carry → carried
  } else if (w.endsWith('ia') && sfx === 'ic') {
    out.add(w.slice(0, -2) + sfx);                                       // anorexia → anorexic
  } else {
    out.add(w + sfx);
    if (doubles(w)) out.add(w + w.at(-1) + sfx);                         // drug → drugged, druggy; fat → fatten
    if (w.endsWith('c') && /^[eiy]/.test(sfx)) out.add(`${w}k${sfx}`);   // panic → panicked, panicky
  }
  return [...out];
}

/** w + a suffix that starts with a consonant (ly, ness, ful, less, ment). */
function consSuffix(w, sfx) {
  if (consonantY(w)) return [`${w.slice(0, -1)}i${sfx}`];               // crazy → crazily, ugly → ugliness
  if (sfx === 'ly' && /[^aeiou]le$/.test(w)) return [`${w.slice(0, -1)}y`, w + sfx];   // gentle → gently
  if (sfx === 'ly' && w.endsWith('ll')) return [`${w}y`];               // full → fully
  return [w + sfx];
}

function plural(w) {
  if (/(s|x|z|ch|sh)$/.test(w)) return [`${w}es`];
  if (consonantY(w)) return [`${w.slice(0, -1)}ies`];
  return w.endsWith('o') ? [`${w}s`, `${w}es`] : [`${w}s`];
}

// ---- the rule table ---------------------------------------------------------

const vowel = (sfx) => (w) => vowelSuffix(w, sfx);
const cons = (sfx) => (w) => consSuffix(w, sfx);
const rule = (id, attach, opts = {}) => Object.freeze({ id, attach, kind: 'deriv', minM: 0, when: null, terminal: false, next: [], ends: [id], ...opts });

/**
 * Every suffix the lint knows. kind 'infl' is inflection, 'deriv' regular
 * derivation. minM: the least measure() of the base; when: a further
 * condition on the base; terminal: nothing can follow it (a plural, a
 * possessive, a superlative); next: the derivational suffixes that may
 * follow it (English orders its suffixes: an adverb in -ly takes only -ness
 * or -er, so stab → *staby → *stabily → stability is no derivation; any
 * inflection may follow a derivation); ends: what the derived word ends
 * with, for the stemmer's proposals (attach() confirms each one).
 */
export const RULES = Object.freeze([
  // inflection
  rule('s', plural, { kind: 'infl', terminal: true }),
  rule("'s", (w) => [`${w}'s`], { kind: 'infl', terminal: true }),
  rule('ed', vowel('ed'), { kind: 'infl', next: ['ly', 'ness'] }),
  rule('ing', (w) => (w.endsWith('ie') ? [`${w.slice(0, -2)}ying`] : vowelSuffix(w, 'ing')), { kind: 'infl', next: ['ly', 'ness'] }),   // die → dying
  rule('est', vowel('est'), { kind: 'infl', terminal: true }),
  // regular derivation: weight-guarded, as Porter's steps 2 to 4
  rule('er', vowel('er')),                                                                        // smoker, killer; fatter, uglier
  rule('ly', cons('ly'), { minM: 1, next: ['ness', 'er'] }),                                                            // deathly, violently, suicidally
  rule('y', vowel('y'), { minM: 1, when: (w) => w.length >= 4 && !w.endsWith('y'), next: ['ly', 'ness', 'er'] }),            // bloody, smoky, druggy, vomity
  rule('ally', (w) => [`${w}ally`], { minM: 1, when: (w) => w.endsWith('ic') }),                  // catastrophically
  rule('ness', cons('ness'), { minM: 1 }),                                                        // ugliness, worthlessness
  rule('ful', cons('ful'), { minM: 1, next: ['ly', 'ness'] }),
  rule('less', cons('less'), { minM: 1, next: ['ly', 'ness'] }),
  rule('ment', cons('ment'), { minM: 1 }),                                                        // treatment
  rule('ish', vowel('ish'), { minM: 1, next: ['ly', 'ness'] }),                                                         // feverish
  rule('en', vowel('en'), { minM: 1, when: (w) => measure(w) === 1 && /[bdgkpt]$/.test(w), next: ['ly', 'ness', 'er'] }),     // drunken, fatten, sicken, deaden
  rule('able', vowel('able'), { minM: 1, next: ['ly'] }),                                                       // treatable, curable
  rule('al', vowel('al'), { minM: 2, next: ['ly', 'ity', 'ize', 'ise', 'ism', 'ist'] }),                                                           // suicidal, medicinal
  rule('ic', vowel('ic'), { minM: 2, next: ['ally', 'al', 'ity', 'ism', 'ize', 'ise'] }),                                                           // alcoholic, idiotic, allergic, anorexic
  rule('ous', vowel('ous'), { minM: 2, next: ['ly', 'ness'] }),                                                         // murderous, cancerous
  rule('ious', vowel('ious'), { minM: 2, when: (w) => /[ct]$/.test(w), next: ['ly', 'ness'] }),                         // infectious
  rule('ive', vowel('ive'), { minM: 2, next: ['ly', 'ness', 'ity'] }),                                                         // depressive, addictive
  rule('ity', vowel('ity'), { minM: 2 }),                                                         // stupidity, toxicity, insanity
  rule('ism', vowel('ism'), { minM: 2 }),                                                         // alcoholism
  rule('ist', vowel('ist'), { minM: 2, next: ['ic'] }),                                                         // therapist
  rule('ize', vowel('ize'), { minM: 2, next: ['ation', 'er'] }),                                                         // hospitalize
  rule('ise', vowel('ise'), { minM: 2, next: ['ation', 'er'] }),                                                         // hospitalise
  rule('ion', vowel('ion'), { minM: 1, when: (w) => /(t|te|ss|se)$/.test(w) }),                  // infection, addiction, depression, medication
  rule('ation', vowel('ation'), { minM: 1 }),                                                     // starvation, hospitalization
  rule('tic', (w) => [`${w}tic`], { minM: 1, when: (w) => w.endsWith('ma'), next: ['ally'] }),                    // trauma → traumatic, asthma → asthmatic
  rule('tize', (w) => [`${w}tize`], { minM: 1, when: (w) => w.endsWith('ma'), next: ['ation', 'er'] }),                  // traumatize
  rule('tise', (w) => [`${w}tise`], { minM: 1, when: (w) => w.endsWith('ma'), next: ['ation', 'er'] }),                  // traumatise
  rule('atic', (w) => [`${w}atic`], { minM: 2, when: (w) => /[^aeiouy]$/.test(w), next: ['ally'] }),             // symptom → symptomatic
  rule('ac', (w) => [`${w}c`], { minM: 1, when: (w) => w.endsWith('ia'), ends: ['c'] }),          // insomnia → insomniac
  rule('cy', (w) => [w.replace(/te?$/, 'cy')], { minM: 2, when: (w) => /[^t]te?$/.test(w) }),    // idiot → idiocy
]);
const RULE_BY_ID = new Map(RULES.map((r) => [r.id, r]));
/** The rules that inflect: the forms a phrase word or a 'term+' name may take (the -er agent noun included, as before). */
export const INFLECTING = Object.freeze(new Set(['s', "'s", 'ed', 'ing', 'est', 'er', 'irregular']));

const applies = (r, base) => base.length >= 2 && measure(base) >= r.minM && (!r.when || r.when(base));

/** The spellings of base + rule (empty when the rule does not apply to base). */
export function attach(base, ruleId) {
  const r = RULE_BY_ID.get(ruleId);
  if (!r) throw new Error(`planner/morph.mjs: no rule ${ruleId}`);
  return applies(r, base) ? r.attach(base) : [];
}

/** What the base may have looked like before a suffix's spelling changed it (the stemmer's proposals; attach() confirms). */
function restorations(x) {
  const out = new Set([x, `${x}e`, `${x}y`, `${x}ia`, `${x}t`, `${x}te`, `${x}le`, `${x}l`]);   // ...le, ...l: gent(ly) → gentle, fu(lly) → full
  if (x.endsWith('i')) out.add(`${x.slice(0, -1)}y`);                 // ugli(er) → ugly
  if (x.endsWith('y')) out.add(`${x.slice(0, -1)}ie`);                // dy(ing) → die
  if (x.endsWith('ie')) out.add(`${x.slice(0, -2)}y`);                // carrie(s) → carry
  if (x.endsWith('e')) out.add(x.slice(0, -1));                       // watche(s) → watch
  if (x.endsWith('k')) out.add(x.slice(0, -1));                       // panick(ed) → panic
  if (/([b-df-hj-np-tvz])\1$/.test(x)) out.add(x.slice(0, -1));       // drugg(ed) → drug
  return out;
}

// ---- generation -------------------------------------------------------------

/**
 * The regular inflections of one word, the word itself included: plural and
 * 3rd person, possessive, past, gerund, superlative, and the -er agent noun
 * or comparative with its plural and possessive.
 * → array of distinct lowercase forms
 */
export function inflections(word) {
  const w = String(word).toLowerCase();
  if (w.length < 3 || /[^a-z]/.test(w)) return [w];   // 1-2 letters, digits, 'r.i.p', "mcdonald's", 'h&m': as written
  const out = new Set([w]);
  for (const id of ['s', "'s", 'ed', 'ing', 'est']) for (const f of attach(w, id)) out.add(f);
  for (const f of attach(w, 'er')) { out.add(f); for (const g of [...attach(f, 's'), ...attach(f, "'s")]) out.add(g); }
  return [...out];
}

/**
 * The irregular forms of a lemma: its own (morph.irregular[lemma]), and, for
 * a compound whose head is an irregular verb, the head's with the compound's
 * prefix (gaslight → gaslit; overeat → overate, overeaten). The prefix must
 * hold a vowel, so "cheat" is no compound of "eat".
 */
export function irregularForms(lemma, morph = null) {
  const w = String(lemma).toLowerCase();
  const irr = morph?.irregular || {};
  const out = new Set((irr[w] || []).map((f) => f.toLowerCase()));
  for (const [head, fs] of Object.entries(irr)) {
    if (head === w || !w.endsWith(head)) continue;
    const prefix = w.slice(0, -head.length);
    if (prefix.length >= 2 && /[aeiouy]/.test(prefix)) for (const f of fs) out.add(prefix + f.toLowerCase());
  }
  return [...out];
}

/**
 * Every inflected surface form of a lemma: its regular inflections and its
 * irregular forms, minus morph.notForms. The lemma itself is always a form.
 * morph: { irregular: { lemma: [forms] }, notForms: Map|Set|array } (optional).
 */
export function forms(lemma, morph = null) {
  const w = String(lemma).toLowerCase();
  const out = new Set(inflections(w));
  for (const f of irregularForms(w, morph)) out.add(f);
  for (const f of notFormsOf(morph)) if (f !== w) out.delete(f);
  return [...out];
}

const notFormsOf = (morph) => (morph?.notForms instanceof Map ? morph.notForms.keys() : morph?.notForms || []);
const isNotForm = (morph, w) => (morph?.notForms instanceof Map || morph?.notForms instanceof Set ? morph.notForms.has(w) : (morph?.notForms || []).includes(w));

// ---- the stemmer ------------------------------------------------------------

const analysisCache = new WeakMap();
const NO_MORPH = {};

/**
 * The stemmer: every base `word` is derived from by the rules, with how.
 * Strips one suffix at a time, outermost first, up to MAX_DEPTH; a proposal
 * survives only when attach() of the same rule gives the word back, so the
 * result is exactly the set of bases the table derives the word from. The
 * irregular forms (and a compound's head's) map back to their lemma.
 * → Map(base → [rule ids, innermost first]); the word itself maps to [].
 * Words with characters other than a-z and an apostrophe are taken as written.
 */
export function analyze(word, morph = null) {
  const w = String(word).toLowerCase();
  const key = morph || NO_MORPH;
  let cache = analysisCache.get(key);
  if (!cache) analysisCache.set(key, (cache = new Map()));
  if (cache.has(w)) return cache.get(w);
  const out = new Map([[w, []]]);
  // an innocent word of its own (morph.notForms) is never analysed further, and neither is a word derived
  // through one: gravy is no form of grave, so neither is gravies
  if (/^[a-z][a-z']*[a-z]$/.test(w) && !isNotForm(morph, w)) {
    let frontier = [[w, []]];
    for (let depth = 0; depth < MAX_DEPTH && frontier.length; depth++) {
      const next = [];
      for (const [cur, path] of frontier) {
        for (const r of RULES) {
          // r sits inside the suffix stripped before it (path[0]): a plural, possessive or superlative is always
          // outermost, any inflection may follow a derivation, and a derivation follows only what its `next` allows
          if (depth > 0) {
            const outer = RULE_BY_ID.get(path[0]);
            if (r.terminal || (outer.kind === 'deriv' && !r.next.includes(outer.id))) continue;
          }
          for (const end of r.ends) {
            if (!cur.endsWith(end) || cur.length - end.length < 2) continue;
            for (const base of restorations(cur.slice(0, -end.length))) {
              if (out.has(base) || base.length < 2 || !applies(r, base) || !r.attach(base).includes(cur)) continue;
              const p = [r.id, ...path];
              out.set(base, p);
              if (!isNotForm(morph, base)) next.push([base, p]);
            }
          }
        }
      }
      frontier = next;
    }
  }
  // irregular forms, and a compound's irregular head (gaslit → gaslight, overate → overeat)
  const irr = morph?.irregular || {};
  for (const [head, fs] of Object.entries(irr)) {
    for (const f of fs) {
      if (w === f) { if (!out.has(head)) out.set(head, ['irregular']); continue; }
      if (!w.endsWith(f)) continue;
      const prefix = w.slice(0, -f.length);
      if (prefix.length >= 2 && /[aeiouy]/.test(prefix) && !out.has(prefix + head)) out.set(prefix + head, ['irregular']);
    }
  }
  cache.set(w, out);
  return out;
}

/**
 * Does `word` derive from `lemma`? derive: false allows only inflection
 * (INFLECTING: phrase words, 'term+' names). A word in morph.notForms
 * never matches a lemma other than itself.
 * → the rule path (array, [] for the lemma itself) or null
 */
export function derivation(word, lemma, morph = null, { derive = true } = {}) {
  const w = String(word).toLowerCase(), l = String(lemma).toLowerCase();
  if (w === l) return [];
  if (isNotForm(morph, w)) return null;
  const path = analyze(w, morph).get(l);
  if (!path) return null;
  if (!derive && !path.every((id) => INFLECTING.has(id))) return null;
  return path;
}

/**
 * The bases a term written as a participle stands for: "triggered" and
 * "triggering" → trigger, "depressed" → depress, "dying" → die. Only a
 * participle is undone (it names the same thing as its verb); a plural-
 * looking term may be a singular (vagus, diagnosis), and a derived term keeps
 * its own meaning (loser is not lose, useless is not use). [] for a term
 * that is no participle.
 */
export function inflectionalBases(term, morph = null) {
  const w = String(term).toLowerCase();
  const out = [];
  for (const [base, path] of analyze(w, morph)) {
    if (path.length === 1 && ['ed', 'ing'].includes(path[0]) && base.length >= 3) out.push(base);
    else if (path.length === 1 && path[0] === 'irregular' && (morph?.irregular?.[base] || []).includes(w)) out.push(base);
  }
  return out;
}

// ---- tokens and phrases -----------------------------------------------------

const WORD = /[a-z0-9À-ÿ]+(?:'[a-z0-9À-ÿ]+)*/gi;

/** The words of a text, lowercase, with their offsets: [{ w, at, end }]. An apostrophe inside a word stays ("smoker's", "i'm"). */
export function tokenize(text) {
  return [...String(text).matchAll(WORD)].map((m) => ({ w: m[0].toLowerCase(), at: m.index, end: m.index + m[0].length }));
}

/**
 * The forms of every word of a term (a word or a phrase): content words get
 * forms(), function words (STOP_WORDS) stay as written.
 * → { words: [[forms of word 1], ...], seps: the separators between them }
 */
export function phraseForms(term, morph = null) {
  const words = term.split(/[ -]/);
  const seps = term.match(/[ -]/g) || [];
  return { words: words.map((w) => (STOP_WORDS.has(w.toLowerCase()) ? [w.toLowerCase()] : forms(w, morph))), seps };
}

/**
 * The glued spellings of an inflected term, as they could sit inside a
 * hashtag or a glued word: lowercase letters and digits only. A phrase varies
 * one content word at a time ("self harm" → selfharm, selfharming,
 * selfharmed, ...), which covers every inflection English puts on a phrase
 * without the product of all combinations.
 */
export function gluedForms(term, morph = null) {
  const glue = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const { words } = phraseForms(term, morph);
  const lemma = words.map((f) => f[0]);
  const out = new Set([glue(lemma.join(''))]);
  words.forEach((fs, i) => { for (const f of fs) out.add(glue([...lemma.slice(0, i), f, ...lemma.slice(i + 1)].join(''))); });
  out.delete('');
  // a glued possessive can spell an innocent word of its own (treat's → treats): notForms stay out
  const whole = glue(lemma.join(''));
  for (const f of notFormsOf(morph)) if (f !== whole) out.delete(f);
  return [...out];
}

/**
 * The spellings a regular derivative of a lemma starts with, for the glued
 * search inside a hashtag: the lemma, and the lemma with a final e, y or -ia
 * dropped (suicide → suicid: #suicidally; starve → starv: #starvation;
 * anorexia → anorex: #anorexic). The y is dropped only where the rules can
 * drop it, before -ic, -ist, -ism and -ize, which need measure 2 (therapy →
 * therap: #therapist; brandy, whisky and belly keep theirs). A shortened spelling counts
 * only from 5 letters on: a shorter one is part of too many innocent words
 * (smok, grav, cur), and those lemmas' inflections are searched in full. A
 * stem that would end in s (hearse → hears, corpse → corps) or come from an
 * -ie word (selfie) is not used.
 */
export function derivationStems(lemma) {
  const w = String(lemma).toLowerCase();
  if (/[^a-z]/.test(w)) return [w];
  const out = new Set([w]);
  // from 5 letters on; a stem ending in s reads as a plural of another word (hearse → hears, corpse → corps),
  // and an -ie word's derivatives keep the e (selfie → selfies, never "selfi-")
  const add = (s) => { if (s.length >= 5 && !s.endsWith('s') && !w.endsWith('ie')) out.add(s); };
  if (w.endsWith('e')) add(w.slice(0, -1));
  // the y is dropped only where the rules drop it, before -ic, -ist, -ism, -ize (m >= 2): allerg(ic), therap(ist);
  // never brand(y), whisk(y), bell(y). (y → i stems add nothing the glued inflections lack, and belli- is in belligerent.)
  if (consonantY(w) && measure(w) >= 2) add(w.slice(0, -1));
  if (w.endsWith('ia')) add(w.slice(0, -2));
  return [...out];
}
