// Safety pre-check, second pass: the scope of a negation (review round 3).
// Mirrors the app's tests/safety-scope.test.mjs over the same rows
// (SCOPE_ROWS in ./safety-fillers.probes.mjs, the app's probe table byte for
// byte). On the server a 'none' row must equal the server's own first pass
// (its extra rules may already flag it, and nothing is ever taken away); a
// flagged row must reach the app's level, or the first pass's if higher.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { checkSafety, checkSafetyFirstPass, fillerFreeCopy, fillerFreeCopyMapped, tidyForSafety } from '../src/safety/index.js';

const RANK = { none: 0, concern: 1, care: 2, crisis: 3 };
const PROBES = new URL('./safety-fillers.probes.mjs', import.meta.url);
const SERVER_SAFETY = new URL('../src/safety/index.js', import.meta.url);
const APP_SAFETY = new URL('../../../src/engine/safety.js', import.meta.url);
const copyOf = (/** @type {string} */ t) => fillerFreeCopy(tidyForSafety(t));

test('scope: every round-3 row gets its level on the server too', async () => {
  const P = await import(PROBES.href);
  assert.ok(P.SCOPE_ROWS.length >= 70, `rows: ${P.SCOPE_ROWS.length}`);
  for (const [t, level] of P.SCOPE_ROWS) {
    const r = checkSafety(t);
    const first = checkSafetyFirstPass(t);
    if (level === 'none') assert.deepEqual(r, first, `${t} → ${r.level} {${copyOf(t)}}`);
    else {
      const want = RANK[first.level] > RANK[level] ? first.level : level;
      assert.equal(r.level, want, `${t} → ${r.level} {${copyOf(t)}}`);
    }
  }
});

test('scope: the review\'s rows, as the brief has them', () => {
  for (const t of [
    "i don't necessarily want to actually die", "i don't truly want to really die", 'not one time has he really hit me',
    'no one is actually in danger', 'nobody here is really in danger', 'none of us are actually in danger', "i don't think anyone is really in danger",
    "there's no chance he would really hurt me", "i don't personally think he would ever really hurt me",
    "i don't want to actually die, i just want to be happy again", "i'm not saying i want to really die, i just want to sleep until monday",
    "it isn't that he really hit me, we just argued until 3am", "i don't think he would really hurt me, he has never done it before",
  ]) assert.deepEqual(checkSafety(t), { level: 'none', category: null }, `${t} {${copyOf(t)}}`);
  // the server's own extra rules already read these as care, before any second pass
  for (const t of ['at no point did he actually hit me', 'never in my life has he actually hit me', 'in no way did he actually hit me']) {
    assert.deepEqual(checkSafety(t), checkSafetyFirstPass(t), t);
  }
  for (const [t, level, category] of [
    ["i don't know why i want to really die", 'crisis', 'self-harm'], ["i can't stop thinking i want to actually die", 'crisis', 'self-harm'],
    ["i don't care anymore, i just want to actually end it", 'crisis', 'self-harm'], ['he never really hurt me until last year', 'concern', 'distress'],
    ["it's not just that he actually hit me, it's that he enjoys it", 'care', 'violence'], ["the police didn't believe he really hit me", 'care', 'violence'],
    ["my mum doesn't believe he actually hit me", 'care', 'violence'], ['my bf always hits me when hes drunk', 'care', 'violence'],
  ]) assert.deepEqual(checkSafety(t), { level, category }, t);
});

test('scope: the mapped copy is the copy, and every character points back into the tidied text', async () => {
  const P = await import(PROBES.href);
  const dir = fileURLToPath(new URL('./', import.meta.url));
  const texts = new Set([...P.SCOPE_ROWS.map((/** @type {string[]} */ [t]) => t), ...P.NEGATION_SWEEP, ...P.NEGATIVE]);
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.test.js'))) {
    for (const m of readFileSync(dir + f, 'utf8').matchAll(/'((?:[^'\\\n]|\\.){4,200})'|"((?:[^"\\\n]|\\.){4,200})"/g)) {
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

test('scope: the scope block is the app\'s, line for line', { skip: !existsSync(APP_SAFETY) && 'app not in this checkout' }, () => {
  const block = (/** @type {URL} */ url) => {
    const src = readFileSync(url, 'utf8');
    const a = src.indexOf('// ------------------------------------ second pass: the scope of a negation --');
    const b = src.indexOf('// ------------------------------------------------- end of the scope block --');
    assert.ok(a > 0 && b > a, String(url));
    return src.slice(a, b);
  };
  assert.equal(block(SERVER_SAFETY), block(APP_SAFETY));
});
