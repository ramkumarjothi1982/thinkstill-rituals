// planner/morph.mjs: the inflection rules behind the copy lint's lemma lists
// (FU-3). Generation (forms) and the stemmer (lemmaCandidates) are one rule
// table read two ways: every generated form strips back to its lemma.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { policy } from '../property/support.mjs';
import { inflections, forms, lemmaCandidates, phraseForms, gluedForms, STOP_WORDS } from '../../planner/morph.mjs';
import { parseTerm, termRegex } from '../../planner/policy.mjs';

const morph = policy.compiled.morph;
const has = (lemma, ...want) => { const f = forms(lemma, morph); for (const w of want) assert.ok(f.includes(w), `${lemma} → ${w} (got ${f.join(', ')})`); };
const lacks = (lemma, ...not) => { const f = forms(lemma, morph); for (const w of not) assert.ok(!f.includes(w), `${lemma} must not give ${w}`); };

test('regular inflections with the English spelling rules', () => {
  has('smoke', 'smokes', 'smoked', 'smoking', 'smoker', 'smokers', "smoker's", "smoke's");   // final e dropped
  has('vomit', 'vomits', 'vomited', 'vomiting');
  has('starve', 'starved', 'starving', 'starves');
  has('die', 'dies', 'died', 'dying');                                                       // ie → ying
  has('drug', 'drugs', 'drugged', 'drugging');                                               // doubled consonant
  has('cut', 'cuts', 'cutting');
  has('ugly', 'uglier', 'ugliest', 'uglies');                                                // y → i
  has('panic', 'panicked', 'panicking', 'panics');                                           // c → ck
  has('binge', 'binged', 'binging', 'bingeing');
  has('loser', 'losers');
  has('stupid', 'stupider', 'stupidest');
  has('kill', 'killed', 'killing', 'killer', 'killers');
  lacks('kill', 'killled');
  // irregular forms come from policy.lint.morphology.irregular
  has('bleed', 'bled');
  has('throw', 'threw', 'thrown');
  has('get', 'got');
  // derivation is never generated: a derived word is a lemma of its own (the lemma list)
  lacks('grave', 'gravity', 'gravely');
  lacks('suicide', 'suicidal');
  lacks('sick', 'sickly');
  // notForms: everyday words a rule would make from a listed lemma
  lacks('weight', 'weighted');
  has('weight', 'weights');
  // abbreviations and words with digits or punctuation are matched as written
  assert.deepEqual(inflections('ig'), ['ig']);
  assert.deepEqual(inflections('r.i.p'), ['r.i.p']);
  assert.deepEqual(inflections("mcdonald's"), ["mcdonald's"]);
});

test('the stemmer undoes every generated form: one rule table read two ways', () => {
  const lemmas = new Set();
  const lists = Object.entries(policy.lint.topics).filter(([k]) => k !== 'source' && !k.startsWith('$'));
  for (const [, terms] of lists) {
    for (const term of terms) {
      const t = parseTerm(term, { inflectByDefault: true });
      if (t.kind === 're' || !t.inflect) continue;
      for (const w of t.text.split(/[ -]/)) if (!STOP_WORDS.has(w)) lemmas.add(w);
    }
  }
  assert.ok(lemmas.size > 300, `${lemmas.size} content lemmas`);
  let checked = 0;
  for (const lemma of lemmas) {
    for (const f of forms(lemma, morph)) {
      checked++;
      assert.ok(lemmaCandidates(f, morph).includes(lemma), `${f} does not stem back to ${lemma}: ${lemmaCandidates(f, morph).join(', ')}`);
    }
  }
  assert.ok(checked > 3000, `${checked} forms checked`);
  // and some words the rules must not read as a listed lemma
  for (const [word, notLemma] of [['gravity', 'grave'], ['weighted', 'weight'], ['ginger', 'gin'], ['public', 'pub'], ['warm', 'war']]) {
    assert.ok(!forms(notLemma, morph).includes(word), `${word} is not a form of ${notLemma}`);
  }
});

test('phrases inflect their content words only; glued forms vary one word at a time', () => {
  const { words, seps } = phraseForms('end it all', morph);
  assert.deepEqual(words.slice(1), [['it'], ['all']], 'function words stay as written');
  assert.ok(words[0].includes('ending'));
  assert.deepEqual(seps, [' ', ' ']);
  const g = gluedForms('self harm', morph);
  for (const want of ['selfharm', 'selfharming', 'selfharmed']) assert.ok(g.includes(want), want);
  assert.ok(gluedForms('want to die', morph).includes('wanttodie'));
  // the regex a topic entry compiles to: inflected, spacing-flexible, whole words only
  const re = termRegex('self harm', { flex: true, inflect: true, morph });
  for (const ok of ['Self harming.', 'Self-harming.', 'Selfharm.', 'self harmed']) assert.ok(re.test(ok), ok);
  assert.ok(!re.test('Myself harmless.'));
  const exact = termRegex('=rip', { flex: true, inflect: true, morph });
  assert.ok(exact.test('RIP.') && !exact.test('Ripped jeans.'), "'=term' is matched only as written");
  assert.ok(termRegex('google+', { morph }).test('GOOGLING'), "a '+' name inflects");
  assert.ok(!termRegex('bumble app', { morph }).test('bumbling'), 'a plain name does not');
});
