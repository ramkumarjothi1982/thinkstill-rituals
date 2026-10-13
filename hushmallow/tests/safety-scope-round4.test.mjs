// Safety check, second pass: the scope of a negation (review round 4).
// A denial counts whoever says it ("that doesn't mean I want to die"), a
// view reaches a noun phrase or 'anyone here' before a helper ("I don't think
// the kids are really in danger"), a negative subject reaches past where or
// who they are ("no one at home is"), and the rest still flags: a past view
// ("I didn't think I'd ever want to actually die"), a double negation ("not a
// day goes by that I don't"), a comparison that says it is worse now ("like I
// do tonight"). Before / until do not rescue a wish in the present ("I don't
// want to actually die before 30"). The rows are SCOPE_ROUND4 in
// safety-fillers.probes.mjs, shared with the Another Angle server's
// test/safety-scope-round4.test.js.
// Run: node --test hushmallow/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { checkText, checkTextFirstPass, fillerFreeCopy, tidyForSafety, SECOND_PASS } from '../src/engine/safety.js';
import { checkSafety as classicCheck } from '../src/ultra/reframe-engine.js';
import * as P from './safety-fillers.probes.mjs';

const RANK = { none: 0, concern: 1, care: 2, crisis: 3 };
const copyOf = (t) => fillerFreeCopy(tidyForSafety(t));

test('scope r4: every row gets its level, never less than the first pass, and the classic check agrees', () => {
  assert.ok(P.SCOPE_ROUND4.length >= 90, `rows: ${P.SCOPE_ROUND4.length}`);
  for (const [t, level] of P.SCOPE_ROUND4) {
    const r = checkText(t);
    assert.equal(r.level, level, `${t} → ${r.level} (${r.matched}) {${copyOf(t)}}`);
    assert.ok(RANK[r.level] >= RANK[checkTextFirstPass(t).level], t);
    const stops = level === 'crisis' || level === 'care';
    assert.equal(classicCheck(t).reframeAppropriate, !stops, `classic: ${t}`);
  }
});

test('scope r4: the review\'s negated sentences add no flag at all (the result is the first pass\'s)', () => {
  for (const t of [
    "that doesn't mean i want to actually die", "just because i'm sad doesn't mean i want to actually die", "please don't think i want to really die",
    "i'm not trying to say i want to actually die", 'no one i know is actually in danger', 'none of the people at the party are really in danger',
    "i don't think the baby is really in danger", "i don't want to actually die before i see my kids grow up", 'i never want to actually die before my mum does',
    'no one is really in danger but my mum thinks so', "i don't want to really die any more than you do", "it's not because i want to actually die, i'm just tired",
    'never, not once, has he actually hit me',
  ]) assert.deepEqual(checkText(t), checkTextFirstPass(t), `${t} {${copyOf(t)}}`);
});

test('scope r4: what the second pass finds still counts when the negation does not deny it', () => {
  for (const [t, level, category] of [
    ["i've never wanted to actually die like i do tonight", 'crisis', 'self-harm'], ["not a day goes by that i don't want to actually die", 'crisis', 'self-harm'],
    ["i didn't think i'd ever want to actually die", 'crisis', 'self-harm'], ["that doesn't mean i don't want to really die", 'crisis', 'self-harm'],
    ['nobody in my house is actually in danger but my mum', 'crisis', 'someone-in-danger'], ["i didn't think he would really hurt me", 'concern', 'distress'],
    ["it's not like he actually hit me hard", 'care', 'violence'], ["i still don't believe he actually hit me", 'care', 'violence'],
  ]) {
    const r = checkText(t);
    assert.equal(r.level, level, `${t} → ${r.level} {${copyOf(t)}}`);
    assert.equal(r.category, category, t);
    // and only the second pass finds it
    assert.equal(checkTextFirstPass(t).level, 'none', t);
  }
});

test('scope r4: the new word lists are plain data', () => {
  for (const k of ['subject', 'helper', 'helperLead', 'self', 'because', 'clauseStart', 'viewEnd', 'frontOnly', 'outer', 'until', 'wish', 'pastNeg', 'believe', 'shock']) {
    assert.equal(typeof SECOND_PASS[k], 'string', k);
    assert.doesNotThrow(() => new RegExp(SECOND_PASS[k], 'gi'), k);
  }
});

test('scope r4: 2,000 characters built to make the second pass work hard stay cheap', () => {
  // Review round 4 measured up to 69 ms here on such input (about 50 to 170
  // times the first pass); now it is a few ms, a few times the first pass (the
  // Workers free plan allows 10 ms of CPU). The median of nine runs is compared
  // with the first pass's, measured alongside, so a busy machine does not fail
  // it; the bound in ms only catches a blow-up.
  const median = (xs) => xs.sort((a, b) => a - b)[xs.length >> 1];
  for (const seed of ['no no no no no want to actually die ', "i don't want to actually die ", 'nobody here is really in danger ',
    "i'm not sure i want to really die ", "not a day goes by that i don't want to actually die ", 'never... has he really hit me, ',
    "i don't think anyone at home is really in danger, ", 'no one i know is actually in danger but ']) {
    const t = seed.repeat(Math.ceil(2000 / seed.length)).slice(0, 2000);
    checkText(t); checkTextFirstPass(t); checkText(t); checkTextFirstPass(t);
    const full = [];
    const base = [];
    for (let i = 0; i < 9; i++) {
      let t0 = performance.now();
      checkText(t);
      full.push(performance.now() - t0);
      t0 = performance.now();
      checkTextFirstPass(t);
      base.push(performance.now() - t0);
    }
    const ms = median(full);
    const ratio = ms / Math.max(median(base), 0.05);
    assert.ok(ratio < 40 && ms < 80, `${seed.trim()} x${Math.ceil(2000 / seed.length)}: ${ms.toFixed(1)} ms, ${ratio.toFixed(1)} x the first pass`);
  }
});
