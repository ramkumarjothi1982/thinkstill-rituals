// planner/morph.mjs: the one rule table behind the copy lint's lemma lists
// (FU-3). The stemmer the lint runs (analyze) is the exact inverse of the
// rules (attach): every derived form strips back to its lemma, and nothing
// strips back that the rules do not derive.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { policy, lib } from '../property/support.mjs';
import {
  RULES, MAX_DEPTH, attach, analyze, derivation, inflectionalBases, measure, inflections, forms, irregularForms,
  phraseForms, gluedForms, derivationStems, tokenize, STOP_WORDS,
} from '../../planner/morph.mjs';
import { parseTerm, wordMatcher } from '../../planner/policy.mjs';

const morph = policy.compiled.morph;
const derives = (word, lemma) => derivation(word, lemma, morph) !== null;
const has = (lemma, ...want) => { const f = forms(lemma, morph); for (const w of want) assert.ok(f.includes(w), `${lemma} → ${w} (got ${f.join(', ')})`); };

/** Every single-word lemma the lint uses: the topic lists and the library's banned terms with their participle bases. */
function lintLemmas() {
  const out = new Set();
  for (const [cat, terms] of Object.entries(policy.lint.topics)) {
    if (cat === 'source' || cat.startsWith('$')) continue;
    for (const term of terms) {
      const t = parseTerm(term, { inflectByDefault: true });
      if (t.kind === 'term' && t.inflect && /^[a-z]+$/.test(t.text)) out.add(t.text);
    }
  }
  for (const t of lib.raw.medicalTherapyFlags.banned) if (/^[a-z]+$/.test(t)) { out.add(t); for (const b of inflectionalBases(t, morph)) out.add(b); }
  return out;
}

test("Porter's measure, and the spelling rules of inflection", () => {
  for (const [w, m] of [['tree', 0], ['by', 0], ['die', 0], ['trouble', 1], ['oats', 1], ['fat', 1], ['grave', 1], ['troubles', 2], ['private', 2], ['suicide', 2], ['therapy', 2], ['symptom', 2]]) {
    assert.equal(measure(w), m, w);
  }
  has('smoke', 'smokes', 'smoked', 'smoking', 'smoker', 'smokers', "smoker's", "smoke's");   // final e dropped
  has('vomit', 'vomits', 'vomited', 'vomiting');
  has('starve', 'starved', 'starving', 'starves');
  has('die', 'dies', 'died', 'dying');                                                       // ie → ying
  has('drug', 'drugs', 'drugged', 'drugging');                                               // doubled consonant
  has('ugly', 'uglier', 'ugliest', 'uglies');                                                // y → i
  has('panic', 'panicked', 'panicking', 'panics');                                           // c → ck
  has('binge', 'binged', 'binging', 'bingeing');
  has('kill', 'killed', 'killing', 'killer', 'killers');
  assert.ok(!forms('kill', morph).includes('killled'));
  assert.ok(attach('dye', 'ing').includes('dyeing') && !attach('dye', 'ing').includes('dying'), 'dye keeps its e: dyeing, never dying');
  has('bleed', 'bled'); has('throw', 'threw', 'thrown'); has('get', 'got');                  // policy.lint.morphology.irregular
  assert.deepEqual(irregularForms('gaslight', morph), ['gaslit'], 'a compound inherits its head\'s irregular forms');
  assert.ok(irregularForms('overeat', morph).includes('overate'));
  assert.deepEqual(irregularForms('cheat', morph), [], 'no vowel in the prefix: cheat is no compound of eat');
  assert.deepEqual(inflections('ig'), ['ig']);
  assert.deepEqual(inflections('r.i.p'), ['r.i.p']);
});

test('regular derivation, guarded by syllable weight and suffix order', () => {
  for (const [word, lemma] of [
    ['suicidally', 'suicide'], ['suicidal', 'suicide'], ['starvation', 'starve'], ['traumatised', 'trauma'], ['traumatized', 'trauma'], ['traumatic', 'trauma'],
    ['symptomatic', 'symptom'], ['insomniac', 'insomnia'], ['drunken', 'drunk'], ['drunkenness', 'drunk'], ['deathly', 'death'], ['murderous', 'murder'],
    ['hospitalized', 'hospital'], ['hospitalisation', 'hospital'], ['fattening', 'fat'], ['feverishly', 'fever'], ['violently', 'violent'], ['depressing', 'depress'],
    ['depressingly', 'depress'], ['depressive', 'depress'], ['catastrophically', 'catastrophe'], ['idiocy', 'idiot'], ['idiotic', 'idiot'], ['stupidity', 'stupid'],
    ['ugliness', 'ugly'], ['bloody', 'blood'], ['smoky', 'smoke'], ['druggy', 'drug'], ['alcoholism', 'alcohol'], ['anorexic', 'anorexia'], ['allergic', 'allergy'],
    ['therapist', 'therapy'], ['addiction', 'addict'], ['addictive', 'addict'], ['medicated', 'medicate'], ['infectious', 'infect'], ['narcissistic', 'narcissist'],
    ['toxicity', 'toxic'], ['insanity', 'insane'], ['panicky', 'panic'], ['curable', 'cure'], ['worthlessness', 'worthless'], ['gaslit', 'gaslight'], ['overate', 'overeat'],
  ]) assert.ok(derives(word, lemma), `${word} ← ${lemma}: ${JSON.stringify([...analyze(word, morph)])}`);
  // the weight guard (Porter's m): grave never gives gravity, fat never fatal, pub never pubic, die never dial
  for (const [word, lemma] of [['gravity', 'grave'], ['fatal', 'fat'], ['pubic', 'pub'], ['dial', 'die'], ['warren', 'war'], ['wary', 'war'], ['ginger', 'gin'],
    ['public', 'pub'], ['warm', 'war'], ['father', 'fat'], ['rummy', 'rum'], ['heroine', 'heroin'], ['dying', 'dye'], ['health', 'heal']]) {
    assert.ok(!derives(word, lemma), `${word} is no derivative of ${lemma}`);
  }
  // suffix order: an adverb in -ly takes only -ness or -er, so stab → *staby → *stabily → stability is no derivation
  assert.ok(!derives('stability', 'stab') && !derives('stabilize', 'stab'));
  assert.ok(derives('sickliness', 'sick'), 'sick → sickly → sickliness');
  // notForms: innocent words the rules derive are listed with a reason, and nothing derives through them
  for (const [word, lemma] of [['gravy', 'grave'], ['gravies', 'grave'], ['treaty', 'treat'], ['treaties', 'treat'], ['treats', 'treat'], ['hospitality', 'hospital'],
    ['weighty', 'weight'], ['weightier', 'weight'], ['weightless', 'weight'], ['weighted', 'weight'], ['gravely', 'grave'], ['curation', 'cure']]) {
    assert.ok(!derives(word, lemma), `${word} is listed in notForms`);
    assert.ok(morph.notForms.has(word) || [...analyze(word, morph).keys()].some((b) => morph.notForms.has(b)), `${word}: a notForm or derived through one`);
  }
  for (const why of morph.notForms.values()) assert.ok(why.length > 5, 'each notForm has its reason');
});

test('the stemmer is the exact inverse of the rule table (both directions, every lint lemma)', () => {
  const lemmas = lintLemmas();
  assert.ok(lemmas.size > 350, `${lemmas.size} lemmas`);
  let checked = 0;
  for (const lemma of lemmas) {
    // forward then back: every word one or two suffixes from a lemma strips back to it
    const once = RULES.flatMap((r) => attach(lemma, r.id).map((w) => [w, r]));
    for (const [w, r] of once) {
      if (morph.notForms.has(w)) continue;
      checked++;
      assert.ok(analyze(w, morph).has(lemma), `${lemma} +${r.id} = ${w}, which does not stem back`);
      if (r.terminal) continue;
      for (const r2 of RULES) {
        if (r.kind === 'deriv' && r2.kind === 'deriv' && !r.next.includes(r2.id)) continue;
        if (r.kind === 'infl' && r2.kind === 'deriv' && !r.next.includes(r2.id)) continue;
        for (const w2 of attach(w, r2.id)) {
          if (morph.notForms.has(w2)) continue;
          checked++;
          assert.ok(analyze(w2, morph).has(lemma), `${lemma} +${r.id} +${r2.id} = ${w2}, which does not stem back`);
        }
      }
    }
  }
  assert.ok(checked > 20000, `${checked} derived forms checked`);
  // back then forward: every base the stemmer proposes, re-attached along its path, gives the word again
  for (const word of ['suicidally', 'hospitalizations', 'traumatising', 'depressingly', 'fattening', 'catastrophically', 'smokers', 'idiocies', 'whatever', 'gravity']) {
    for (const [base, path] of analyze(word, morph)) {
      if (path[0] === 'irregular' || !path.length) continue;
      let cur = [base];
      for (const id of path) cur = cur.flatMap((b) => attach(b, id));
      assert.ok(cur.includes(word), `${word} → ${base} [${path.join('+')}] does not re-attach`);
    }
  }
  assert.equal(MAX_DEPTH, 4);
});

test('participle terms stand for their verb; plural-looking singulars do not', () => {
  assert.ok(inflectionalBases('triggered', morph).includes('trigger'));
  assert.ok(inflectionalBases('triggering', morph).includes('trigger'));
  assert.ok(inflectionalBases('depressed', morph).includes('depress'));
  assert.deepEqual(inflectionalBases('dying', morph), ['die']);
  assert.deepEqual(inflectionalBases('vagus', morph), [], 'vagus is no plural (so vaguer is no form of it)');
  assert.deepEqual(inflectionalBases('clinically', morph), [], 'derivation is not undone: a derived term keeps its meaning');
  assert.deepEqual(inflectionalBases('loser', morph), []);
});

test('phrases inflect their content words only; glued forms; hashtag stems', () => {
  const { words, seps } = phraseForms('end it all', morph);
  assert.deepEqual(words.slice(1), [['it'], ['all']], 'function words stay as written');
  assert.ok(words[0].includes('ending'));
  assert.deepEqual(seps, [' ', ' ']);
  const g = gluedForms('self harm', morph);
  for (const want of ['selfharm', 'selfharming', 'selfharmed']) assert.ok(g.includes(want), want);
  assert.ok(!gluedForms('treat', morph).includes('treats'), "a glued possessive (treat's) never brings back a notForm");
  assert.deepEqual(derivationStems('suicide'), ['suicide', 'suicid']);
  assert.deepEqual(derivationStems('starve'), ['starve', 'starv']);
  assert.deepEqual(derivationStems('therapy'), ['therapy', 'therap'], 'y dropped before -ist/-ic (m >= 2)');
  assert.deepEqual(derivationStems('brandy'), ['brandy'], 'brand is no stem of brandy (m = 1)');
  assert.deepEqual(derivationStems('hearse'), ['hearse'], 'hears reads as a plural of another word');
  assert.deepEqual(derivationStems('smoke'), ['smoke'], 'a stem under 5 letters is part of too many words');
  assert.deepEqual(tokenize("Smoker's lungs, self-harm."), [{ w: "smoker's", at: 0, end: 8 }, { w: 'lungs', at: 9, end: 14 }, { w: 'self', at: 16, end: 20 }, { w: 'harm', at: 21, end: 25 }]);
  assert.ok(STOP_WORDS.has('my'));
});

test('wordMatcher: the lint path runs the stemmer on every word', () => {
  const m = (term) => wordMatcher(term, { morph });
  assert.deepEqual(m('suicide').hit('Suicidally sad.'), { word: 'suicidally', lemma: 'suicide', path: ['al', 'ly'] });
  assert.ok(m('self harm').test('Self-harming again.') && m('self harm').test('Selfharm.') && !m('self harm').test('Myself harmless.'));
  assert.ok(m('=rip').test('RIP.') && !m('=rip').test('Ripped jeans.'), "'=term' is matched only as written");
  assert.ok(!m('self harm').test('self harmful'), 'phrase words inflect but do not derive');
  assert.ok(m('re:\\bfoo\\b').test('a foo b'));
  assert.ok(m('r.i.p').test('R.I.P. old phone') && !m('r.i.p').test('rip'), 'other characters: as written');
  const heads = wordMatcher('triggered', { morph, heads: inflectionalBases('triggered', morph) });
  for (const t of ['Triggers.', 'Trigger warning.', 'So triggering.']) assert.ok(heads.test(t), t);
});
