// Safety check, second pass: the scope of a negation (review round 3).
// A second-pass match does not count when a negation in its own clause
// governs it ("I don't necessarily want to really die", "at no point did he
// actually hit me", "no one is actually in danger"), and still counts when a
// new subject and verb, a new clause or a joiner stand between them ("I
// don't know why I want to really die", "I don't care anymore, I just want to
// actually end it"). The rows are in safety-fillers.probes.mjs (SCOPE_ROWS),
// shared with the Another Angle server's test/safety-scope.test.js.
// Run: node --test hushmallow/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { checkText, checkTextFirstPass, fillerFreeCopy, fillerFreeCopyMapped, tidyForSafety, SECOND_PASS } from '../src/engine/safety.js';
import { checkSafety as classicCheck } from '../src/ultra/reframe-engine.js';
import * as P from './safety-fillers.probes.mjs';

const RANK = { none: 0, concern: 1, care: 2, crisis: 3 };
const copyOf = (t) => fillerFreeCopy(tidyForSafety(t));
const APP_SAFETY = new URL('../src/engine/safety.js', import.meta.url);
const SERVER_SAFETY = new URL('../server/another-angle/src/safety/index.js', import.meta.url);

test('scope: every round-3 row gets its level, and never less than the first pass', () => {
  assert.ok(P.SCOPE_ROWS.length >= 70, `rows: ${P.SCOPE_ROWS.length}`);
  for (const [t, level] of P.SCOPE_ROWS) {
    const r = checkText(t);
    assert.equal(r.level, level, `${t} → ${r.level} (${r.matched}) {${copyOf(t)}}`);
    assert.ok(RANK[r.level] >= RANK[checkTextFirstPass(t).level], t);
    // the classic Another Angle check stops exactly when checkText says crisis or care
    const stops = level === 'crisis' || level === 'care';
    assert.equal(classicCheck(t).reframeAppropriate, !stops, `classic: ${t}`);
  }
});

test('scope: the review\'s negated sentences add no flag, at any level, crisis included', () => {
  for (const t of [
    "i don't necessarily want to actually die", "i don't truly want to really die",
    'at no point did he actually hit me', 'never in my life has he actually hit me', 'in no way did he actually hit me', 'not one time has he really hit me',
    'no one is actually in danger', 'nobody here is really in danger', 'none of us are actually in danger', "i don't think anyone is really in danger",
    "there's no chance he would really hurt me", "i don't personally think he would ever really hurt me",
    "i don't want to actually die, i just want to be happy again", "i'm not saying i want to really die, i just want to sleep until monday",
    "it isn't that he really hit me, we just argued until 3am", "i don't think he would really hurt me, he has never done it before",
  ]) assert.deepEqual(checkText(t), checkTextFirstPass(t), `${t} {${copyOf(t)}}`);
  // ...while the ones that tell it still flag
  for (const [t, level] of [
    ["i don't know why i want to really die", 'crisis'], ["i can't stop thinking i want to actually die", 'crisis'],
    ["i don't care anymore, i just want to actually end it", 'crisis'], ['he never really hurt me until last year', 'concern'],
    ["it's not just that he actually hit me, it's that he enjoys it", 'care'], ["the police didn't believe he really hit me", 'care'],
    ["my mum doesn't believe he actually hit me", 'care'],
  ]) assert.equal(checkText(t).level, level, t);
});

test('scope: the mapped copy is the copy, and every character points back into the tidied text', () => {
  const root = fileURLToPath(new URL('./', import.meta.url));
  const texts = new Set([...P.SCOPE_ROWS.map(([t]) => t), ...P.NEGATION_SWEEP, ...P.NEGATIVE, ...P.POSITIVE.flatMap(([, a, b]) => [a, b])]);
  for (const f of readdirSync(root).filter((n) => n.endsWith('.test.mjs') || n.endsWith('.probes.mjs'))) {
    for (const m of readFileSync(root + f, 'utf8').matchAll(/'((?:[^'\\\n]|\\.){4,200})'|"((?:[^"\\\n]|\\.){4,200})"/g)) {
      const s = (m[1] ?? m[2]).replace(/\\'/g, "'");
      if (/[a-z] [a-z]/i.test(s)) texts.add(s);
    }
  }
  assert.ok(texts.size > 1000, `texts: ${texts.size}`);
  for (const raw of texts) {
    const t = tidyForSafety(raw);
    const { text, map } = fillerFreeCopyMapped(t);
    assert.equal(text, fillerFreeCopy(t), raw);
    assert.equal(map.length, text.length, raw);
    for (let i = 0; i < map.length; i++) {
      assert.ok(map[i] >= 0 && map[i] < t.length, `${raw} @${i}`);
      if (i) assert.ok(map[i] >= map[i - 1], `${raw} @${i}`);
    }
  }
});

test('scope: the scope block is the same text on the server (when it is in the checkout)', { skip: !existsSync(SERVER_SAFETY) && 'server not in this checkout' }, () => {
  const block = (url) => {
    const src = readFileSync(url, 'utf8');
    const a = src.indexOf('// ------------------------------------ second pass: the scope of a negation --');
    const b = src.indexOf('// ------------------------------------------------- end of the scope block --');
    assert.ok(a > 0 && b > a, String(url));
    return src.slice(a, b);
  };
  assert.equal(block(APP_SAFETY), block(SERVER_SAFETY));
});

test('scope: the word lists are plain data and compile', () => {
  for (const [k, v] of Object.entries(SECOND_PASS)) {
    if (k === 'guards') continue;
    assert.equal(typeof v, 'string', k);
    assert.doesNotThrow(() => new RegExp(v, 'gi'), k);
  }
});

test('scope: the second pass stays fast on long text with many negations and clauses', () => {
  const long = "i don't think he would ever really hurt me, but at no point did he actually hit me and i don't know why i really want to die. ".repeat(16);
  checkText(long);
  const t0 = performance.now();
  for (let i = 0; i < 5; i++) checkText(long);
  assert.ok((performance.now() - t0) / 5 < 150, 'checkText on 2,000 characters stays fast');
});
