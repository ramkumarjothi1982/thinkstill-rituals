// Safety check, second pass: filler words between the person and the verb
// ("he finally hit me", "I really want to die", "she always hits me").
// The first pass is the original check and is never changed; the second runs
// the same guards and rules on a copy without fillers; the more serious wins.
// Run: node --test hushmallow/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { checkText, checkTextFirstPass, fillerFreeCopy, tidyForSafety, FILLERS, SECOND_PASS } from '../src/engine/safety.js';
import { interpret } from '../src/engine/interpret.js';
import { GROUPS, POSITIVE, NEGATIVE, NEGATIVE_APP_ONLY, NEGATIONS_TODAY, NEGATED_BUT_HAPPENED } from './safety-fillers.probes.mjs';

const RANK = { none: 0, concern: 1, care: 2, crisis: 3 };
const copyOf = (t) => fillerFreeCopy(tidyForSafety(t));

test('fillers: the probe table is big enough and covers every group', () => {
  assert.ok(POSITIVE.length >= 60, `positives: ${POSITIVE.length}`);
  assert.ok(NEGATIVE.length + NEGATIVE_APP_ONLY.length >= 60, `negatives: ${NEGATIVE.length + NEGATIVE_APP_ONLY.length}`);
  for (const g of Object.keys(GROUPS)) assert.ok(POSITIVE.filter(([group]) => group === g).length >= 5, `group ${g}`);
  for (const [group] of POSITIVE) assert.ok(GROUPS[group], group);
});

test('fillers: every positive gets the same level and category as its words without fillers', () => {
  for (const [group, text, plain] of POSITIVE) {
    const { level, category } = GROUPS[group];
    const base = checkText(plain);
    assert.equal(base.level, level, `without fillers: ${plain} → ${base.level}`);
    assert.equal(base.category, category, `without fillers: ${plain} → ${base.category}`);
    const r = checkText(text);
    assert.equal(r.level, level, `${text} → ${r.level} (${r.matched}) {${copyOf(text)}}`);
    assert.equal(r.category, category, `${text} → ${r.category}`);
    assert.ok(r.matched, text);
    // interpret() delegates and keeps its old shape (care reads as concern)
    assert.equal(interpret(text).safety.level, level === 'care' ? 'concern' : level, `interpret: ${text}`);
  }
});

test('fillers: most positives were missed by the first pass alone (the second pass is what catches them)', () => {
  const missed = POSITIVE.filter(([group, text]) => checkTextFirstPass(text).level !== GROUPS[group].level);
  assert.ok(missed.length >= 60, `first pass missed ${missed.length} of ${POSITIVE.length}`);
  // the cases this work started from
  for (const t of ['he finally hit me', 'glad he finally hit me', 'she always hits me', 'he literally choked me', 'they keep on hitting me']) {
    assert.equal(checkTextFirstPass(t).level, 'none', t);
    assert.equal(checkText(t).level, 'care', t);
    assert.equal(checkText(t).category, 'violence', t);
  }
});

test('fillers: idioms and everyday words with fillers stay none', () => {
  for (const t of [...NEGATIVE, ...NEGATIVE_APP_ONLY]) {
    const r = checkText(t);
    assert.equal(r.level, 'none', `${t} → ${r.level} (${r.matched}) {${copyOf(t)}}`);
  }
});

test('fillers: a negation is never removed or stepped over', () => {
  // negations without fillers are exactly as they were
  for (const [t, level] of NEGATIONS_TODAY) {
    assert.equal(checkText(t).level, level, t);
    assert.deepEqual(checkText(t), checkTextFirstPass(t), t);
  }
  // the copy keeps every negation word
  for (const t of ["he didn't really hit me", 'he would never ever hurt me', 'she has not actually touched me', 'nobody would ever really miss me', 'I cannot even']) {
    const neg = (s) => s.match(/\b(?:not|never|no|nobody|cannot|\w+n't)\b/gi) || [];
    assert.deepEqual(neg(copyOf(t)), neg(t), t);
  }
  // ...but a negation the phrase itself spells out still counts
  assert.equal(checkText("I don't really feel safe at home").level, 'care');
  assert.equal(checkText('no one would honestly even notice if I was gone').level, 'crisis');
  // unless the sentence goes on to say it did happen
  for (const [t, level] of NEGATED_BUT_HAPPENED) assert.equal(checkText(t).level, level, t);
});

test('fillers: the copy only drops fillers (and reads "keeps hitting" as "hits")', () => {
  const cases = [
    ['he finally hit me', 'he hit me'],
    ['glad he finally hit me', 'glad he hit me'],
    ['she always hits me', 'she hits me'],
    ['they keep on hitting me', 'they hits me'],
    ['my mum started to slap me', 'my mum slaps me'],
    ['I keep on wanting to die', 'I want to die'],
    ['he, like, punched me', 'he punched me'],
    ['he like hit me', 'he hit me'],
    ['I like him', 'I like him'],
    ['I feel like crying', 'I feel like crying'],
    ['my partner has already hit me', 'my partner has hit me'],
    ["I'm finally taking my life seriously now", "I'm taking my life seriously now"],
    ['I just want it to be over already', 'I want it to be over already'],
    ['what kind of pills are these', 'what kind of pills are these'],
    ['I want to sleep for ever and never wake up', 'I want to sleep for ever and never wake up'],
    ['he touched me even though I said no', 'he touched me even though I said no'],
    ['this is honestly killing me', 'this is killing me'],
    ['he hit me', 'he hit me'],
  ];
  for (const [t, c] of cases) assert.equal(copyOf(t), c, t);
});

test('fillers: additive — the result is never less serious than the first pass, and filler-free text is unchanged', () => {
  const root = fileURLToPath(new URL('./', import.meta.url));
  const texts = new Set([...POSITIVE.flatMap(([, a, b]) => [a, b]), ...NEGATIVE, ...NEGATIVE_APP_ONLY]);
  // every quoted phrase in the app's test files, the safety probes among them
  for (const f of readdirSync(root).filter((n) => n.endsWith('.test.mjs'))) {
    for (const m of readFileSync(root + f, 'utf8').matchAll(/'((?:[^'\\\n]|\\.){4,200})'|"((?:[^"\\\n]|\\.){4,200})"/g)) {
      const s = (m[1] ?? m[2]).replace(/\\'/g, "'");
      if (/[a-z] [a-z]/i.test(s)) texts.add(s);
    }
  }
  assert.ok(texts.size > 1000, `texts: ${texts.size}`);
  for (const t of texts) {
    const first = checkTextFirstPass(t);
    const r = checkText(t);
    assert.ok(RANK[r.level] >= RANK[first.level], `${t}: ${first.level} → ${r.level}`);
    if (r.level === first.level) assert.deepEqual(r, first, t);
    if (copyOf(t) === tidyForSafety(t)) assert.deepEqual(r, first, t);
  }
});

test('fillers: the word lists are what the server mirrors (plain data)', () => {
  for (const k of ['free', 'positional', 'subject', 'helper', 'likeNot']) assert.equal(typeof FILLERS[k], 'string', k);
  for (const k of ['force', 'forceIng', 'wishIng']) assert.equal(typeof FILLERS[k], 'object', k);
  assert.ok(Object.isFrozen(FILLERS) && Object.isFrozen(SECOND_PASS) && Object.isFrozen(SECOND_PASS.guards));
  for (const src of [FILLERS.free, ...SECOND_PASS.guards, SECOND_PASS.negation, SECOND_PASS.denial, SECOND_PASS.unless]) assert.doesNotThrow(() => new RegExp(src, 'gi'));
});

test('fillers: the second pass stays fast on long text', () => {
  const long = 'he never really hurt me and my uncle has never actually touched me, honestly, like, really. '.repeat(25);
  checkText(long);
  const t0 = performance.now();
  for (let i = 0; i < 5; i++) checkText(long);
  assert.ok((performance.now() - t0) / 5 < 150, 'checkText on 2,000 characters with fillers and negations stays fast');
});
