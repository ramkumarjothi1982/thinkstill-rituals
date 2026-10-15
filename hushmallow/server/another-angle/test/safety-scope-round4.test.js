// Safety pre-check, second pass: the scope of a negation (review round 4).
// Mirrors the app's tests/safety-scope-round4.test.mjs over the same rows
// (SCOPE_ROUND4 in ./safety-fillers.probes.mjs, the app's probe table byte
// for byte). As for SCOPE_ROWS: a 'none' row must equal the server's own
// first pass (its extra rules may already flag it, and nothing is ever taken
// away); a flagged row must reach the app's level, or the first pass's if
// higher.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkSafety, checkSafetyFirstPass, fillerFreeCopy, tidyForSafety } from '../src/safety/index.js';

const RANK = { none: 0, concern: 1, care: 2, crisis: 3 };
const PROBES = new URL('./safety-fillers.probes.mjs', import.meta.url);
const copyOf = (/** @type {string} */ t) => fillerFreeCopy(tidyForSafety(t));

test('scope r4: every row gets its level on the server too', async () => {
  const P = await import(PROBES.href);
  assert.ok(P.SCOPE_ROUND4.length >= 90, `rows: ${P.SCOPE_ROUND4.length}`);
  for (const [t, level] of P.SCOPE_ROUND4) {
    const r = checkSafety(t);
    const first = checkSafetyFirstPass(t);
    if (level === 'none') assert.deepEqual(r, first, `${t} → ${r.level} {${copyOf(t)}}`);
    else {
      const want = RANK[first.level] > RANK[level] ? first.level : level;
      assert.equal(r.level, want, `${t} → ${r.level} {${copyOf(t)}}`);
    }
  }
});

test('scope r4: the review\'s rows, as it has them', () => {
  for (const t of [
    "that doesn't mean i want to actually die", "i don't want you to think i want to actually die", "please don't think i want to really die",
    "i'm not telling you i want to actually die", 'no one at home is actually in danger', 'nobody who lives here is actually in danger',
    "i doubt anyone here is actually in danger", "i don't think my kids are actually in danger", "i don't want to really die until i'm old",
    "i don't want to actually die but my brain won't stop", "i don't want to actually die so much as i want to sleep", "it's not because i want to actually die, i'm just tired",
  ]) assert.deepEqual(checkSafety(t), { level: 'none', category: null }, `${t} {${copyOf(t)}}`);
  for (const [t, level, category] of [
    ["i've never wanted to actually die so badly", 'crisis', 'self-harm'], ["i can't remember a day i didn't want to actually die", 'crisis', 'self-harm'],
    ["i didn't think i would want to really die", 'crisis', 'self-harm'], ["i didn't think he would actually hurt me but he did", 'concern', 'distress'],
    ["i didn't believe he really hit me at first", 'care', 'violence'],
  ]) assert.deepEqual(checkSafety(t), { level, category }, t);
});

test('scope r4: 2,000 characters built to make the second pass work hard stay cheap (README "Costs")', () => {
  // Review round 4 measured up to 112 ms here on such input (about 50 to 170
  // times the first pass); now it is a few ms, a few times the first pass (the
  // Workers free plan allows 10 ms of CPU). The median of nine runs is compared
  // with the first pass's, measured alongside, so a busy machine does not fail
  // it; the bound in ms only catches a blow-up.
  const median = (/** @type {number[]} */ xs) => xs.sort((a, b) => a - b)[xs.length >> 1];
  for (const seed of ['no no no no no want to actually die ', "i don't want to actually die ", 'nobody here is really in danger ',
    "i'm not sure i want to really die ", "not a day goes by that i don't want to actually die ", 'never... has he really hit me, ',
    "i don't think anyone at home is really in danger, ", 'no one i know is actually in danger but ']) {
    const t = seed.repeat(Math.ceil(2000 / seed.length)).slice(0, 2000);
    checkSafety(t); checkSafetyFirstPass(t); checkSafety(t); checkSafetyFirstPass(t);
    /** @type {number[]} */
    const full = [];
    /** @type {number[]} */
    const base = [];
    for (let i = 0; i < 9; i++) {
      let t0 = performance.now();
      checkSafety(t);
      full.push(performance.now() - t0);
      t0 = performance.now();
      checkSafetyFirstPass(t);
      base.push(performance.now() - t0);
    }
    const ms = median(full);
    const ratio = ms / Math.max(median(base), 0.05);
    assert.ok(ratio < 40 && ms < 80, `${seed.trim()} x${Math.ceil(2000 / seed.length)}: ${ms.toFixed(1)} ms, ${ratio.toFixed(1)} x the first pass`);
  }
});
