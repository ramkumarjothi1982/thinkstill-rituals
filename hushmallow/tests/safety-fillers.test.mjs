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
import { checkSafety as classicCheck } from '../src/ultra/reframe-engine.js';
import { HARM_LEXICON, HARM_COPY, CONCERN_LEXICON, HARM_OTHERS_LEXICON } from '../src/data/safety-lexicon.js';
import { GROUPS, POSITIVE, NEGATIVE, NEGATIVE_APP_ONLY, NEGATIONS_TODAY, NEGATED_BUT_HAPPENED, AS_WITHOUT_FILLERS, NEGATION_CLAUSES, NEGATION_FRAMES, NEGATION_SWEEP } from './safety-fillers.probes.mjs';

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

test('fillers: words the lexicon already flags without fillers get that same level with them', () => {
  for (const [t, plain] of AS_WITHOUT_FILLERS) {
    assert.equal(checkText(t).level, checkText(plain).level, `${t} {${copyOf(t)}}`);
    assert.equal(checkText(plain).level, checkTextFirstPass(plain).level, plain);
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

test('fillers: the negation sweep — no new flag for a negated sentence, at any level (review round 2)', () => {
  // every clause flags on its own, so the sweep means something
  for (const c of NEGATION_CLAUSES) assert.notEqual(checkText(c).level, 'none', c);
  assert.ok(NEGATION_SWEEP.length >= NEGATION_FRAMES.length * NEGATION_CLAUSES.length, `rows: ${NEGATION_SWEEP.length}`);
  for (const t of NEGATION_SWEEP) {
    const r = checkText(t);
    assert.deepEqual(r, checkTextFirstPass(t), `${t} → ${r.level} (${r.matched}) {${copyOf(t)}}`);
    assert.deepEqual(r, referenceCheck(t), t);
  }
  // a bare negation straight before the phrase denies it, crisis included…
  for (const t of ["i don't want to actually die", 'i would never want to really die', "i don't want to seriously hurt him", "i'm not going to really end it"]) {
    assert.equal(checkText(t).level, 'none', t);
  }
  // …but not a phrase that starts with its own subject, or one worded for a
  // negation before it, and never a negation the phrase spells out itself
  assert.equal(checkText("i can't, he keeps on hitting me").level, 'care');
  assert.equal(checkText('i cant he keeps on hitting me').level, 'care');
  assert.equal(checkText("didn't he actually hit me last week?").level, 'care');
  assert.equal(checkText("I can't really go on").level, 'crisis');
  assert.equal(checkText("I honestly don't even want to exist").level, 'crisis');
  assert.equal(checkText('nobody would ever really miss me').level, 'crisis');
  assert.equal(checkText("he won't even let me see my friends").level, 'care');
  // a denial is weighed only straight before the phrase or its subject
  assert.equal(checkText("I don't know why he always hits me").level, 'care');
  assert.equal(checkText("I don't think anyone knows he always hits me").level, 'care');
  assert.equal(checkText("I can't believe he actually hit me").level, 'care');
  assert.equal(checkText("it's not true, he really hit me").level, 'care');
  assert.equal(checkText('no way! he actually hit me').level, 'care');
  assert.equal(checkText("I don't know, I want to actually die").level, 'crisis');
  assert.equal(checkText("It's not that I'm sad, I just want to actually die").level, 'crisis');
});

test('fillers: hurting, punctuation around a filler, and "be like" (review round 2 polish)', () => {
  for (const t of ['they keep on hurting me', 'they started hurting me', 'he started to hurt me', 'my stepdad keeps on hurting me']) {
    assert.deepEqual([checkText(t).level, checkText(t).category], ['care', 'violence'], t);
  }
  for (const [t, c] of [
    ['they keep on hurting me', 'they hurts me'],
    ['he started to hurt me', 'he hurts me'],
    ["she's started hitting me", 'she hits me'],
    ['he has started to hit me', 'he hits me'],
    ['my back keeps on hurting me', 'my back hurts me'],
    ['he... finally hit me', 'he hit me'],
    ['he (finally) hit me', 'he hit me'],
    ['he—finally—hit me', 'he hit me'],
    ['he finally, hit me', 'he hit me'],
    ['i want to… really die', 'i want to die'],
    ['i want to really, really die', 'i want to die'],
    ['i want to just really, really die', 'i want to die'],
    ['I would rather be like dead', 'I would rather be dead'],
    ['I wish I could disappear like forever', 'I wish I could disappear forever'],
    ['I want to be like him', 'I want to be like him'],
    ['he never... really hit me', 'he never... hit me'],
    ["he didn't (actually) hit me", "he didn't (actually) hit me"],
    ['he said... honestly, it was fine', 'he said... honestly, it was fine'],
  ]) assert.equal(copyOf(t), c, t);
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
    // review round 1
    ['i want to like die', 'i want to die'],
    ['i wanna like die', 'i wanna die'],
    ['nobody would care even if i died', 'nobody would care if i died'],
    ['my boyfriend, honestly, like, hit me', 'my boyfriend hit me'],
    ['he, like, honestly, really, hit me', 'he hit me'],
    ['I want to like him', 'I want to like him'],
    ["I'd like to die my hair", "I'd like to die my hair"],
    ['I would like to go home', 'I would like to go home'],
    ["I'm going to like this", "I'm going to like this"],
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

// The check exactly as it was before the second pass (13 Oct 2026), rebuilt
// here from the lexicon so an accidental edit to the first pass in
// src/engine/safety.js shows up (comparing checkText with checkTextFirstPass
// in the same module would not).
function referenceCheck(text) {
  const c = (list, flags = 'i') => list.map((src) => new RegExp(src, flags));
  const first = (regexes, t) => { for (const re of regexes) { const m = re.exec(t); if (m) return m[0]; } return null; };
  let t = String(text ?? '').slice(0, 2000).replace(/[‘’‛ʼ`´]/g, "'").replace(/[“”„‟]/g, '"').replace(/\s+/g, ' ').trim();
  if (!t) return { level: 'none', category: null, matched: null };
  for (const re of c(HARM_LEXICON.idiomGuards, 'gi')) t = t.replace(re, (m) => ' '.repeat(m.length));
  let hit = first(c(HARM_LEXICON.crisis), t);
  if (hit) return { level: 'crisis', category: 'self-harm', matched: hit };
  hit = first(c(HARM_LEXICON.crisisOther), t);
  if (hit) return { level: 'crisis', category: 'someone-in-danger', matched: hit };
  for (const [category, list] of Object.entries(HARM_LEXICON.care)) {
    hit = first(c(list), t);
    if (hit) return { level: 'care', category, matched: hit };
  }
  hit = first(c(HARM_OTHERS_LEXICON), t);
  if (hit) return { level: 'concern', category: 'harm-others', matched: hit };
  hit = first(c(CONCERN_LEXICON), t);
  if (hit) return { level: 'concern', category: 'distress', matched: hit };
  return { level: 'none', category: null, matched: null };
}

function quotedTestStrings() {
  const root = fileURLToPath(new URL('./', import.meta.url));
  const texts = new Set([...POSITIVE.flatMap(([, a, b]) => [a, b]), ...NEGATIVE, ...NEGATIVE_APP_ONLY, ...AS_WITHOUT_FILLERS.flat()]);
  for (const f of readdirSync(root).filter((n) => n.endsWith('.test.mjs') || n.endsWith('.probes.mjs'))) {
    for (const m of readFileSync(root + f, 'utf8').matchAll(/'((?:[^'\\\n]|\\.){4,200})'|"((?:[^"\\\n]|\\.){4,200})"/g)) {
      const s = (m[1] ?? m[2]).replace(/\\'/g, "'");
      if (/[a-z] [a-z]/i.test(s)) texts.add(s);
    }
  }
  return texts;
}

test('fillers: the first pass is the original check, rebuilt from the lexicon (frozen reference)', () => {
  const texts = quotedTestStrings();
  assert.ok(texts.size > 1000, `texts: ${texts.size}`);
  let raised = 0;
  for (const t of texts) {
    const ref = referenceCheck(t);
    assert.deepEqual(checkTextFirstPass(t), ref, t);
    const r = checkText(t);
    assert.ok(RANK[r.level] >= RANK[ref.level], `${t}: ${ref.level} → ${r.level}`);
    if (r.level === ref.level) assert.deepEqual(r, ref, t);
    if (RANK[r.level] > RANK[ref.level]) raised++;
  }
  assert.ok(raised >= 100, `raised: ${raised}`);
});

test('fillers: the classic Another Angle check (reframe-engine) takes its decision from checkText', () => {
  // the review's probes: the classic ritual used to reframe these
  for (const [t, level, category] of [
    ['he finally hit me', 'care', 'violence'], ['she always hits me', 'care', 'violence'],
    ['i want to actually die', 'crisis', 'self-harm'], ['nobody would even really miss me', 'crisis', 'self-harm'],
    ['he hit me', 'care', 'violence'], ['my husband hit me again', 'care', 'violence'],
    ['my sister honestly wants to die', 'crisis', 'someone-in-danger'], ['i want to like die', 'crisis', 'self-harm'],
  ]) {
    const r = classicCheck(t);
    assert.equal(r.reframeAppropriate, false, t);
    assert.equal(r.level, level, t);
    assert.equal(r.category, category, t);
    assert.equal(r.matched, checkText(t).matched, t);
    const copy = level === 'crisis' ? (category === 'someone-in-danger' ? HARM_COPY.crisisOther : HARM_COPY.crisis) : HARM_COPY.care[category];
    assert.equal(r.title, copy.title, t);
    assert.equal(r.message, copy.message, t);
    assert.deepEqual(r.resources, level === 'crisis' ? copy.resources : HARM_COPY.careResources, t);
    assert.equal(r.stillHere, HARM_COPY.stillHere, t);
  }
  // every care category has its own copy
  for (const category of Object.keys(HARM_LEXICON.care)) assert.ok(HARM_COPY.care[category]?.message, category);
  // agreement over every quoted test string: crisis and care as checkText has them, everything else reframes
  for (const t of quotedTestStrings()) {
    const a = checkText(t);
    const r = classicCheck(t);
    const stops = a.level === 'crisis' || a.level === 'care';
    assert.equal(r.reframeAppropriate, !stops, t);
    assert.deepEqual([r.level, r.category, r.matched], stops ? [a.level, a.category, a.matched] : ['none', null, null], t);
  }
  // concern (distress, wanting to hurt someone) still reframes here, as before
  assert.equal(classicCheck("I can't cope").reframeAppropriate, true);
  // past checkText's 2,000 characters the classic check still reads the rest, as it always did
  const long = `${'a calm day at the park with friends. '.repeat(60)}he hit me`;
  assert.equal(checkText(long).level, 'none');
  assert.equal(classicCheck(long).level, 'care');
});
