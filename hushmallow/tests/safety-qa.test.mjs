// Final QA sweep (13 Oct 2026), safety: plain statements of being in danger
// and distress phrases the shared lexicon used to read as none (the probes
// are in ./safety-qa.probes.mjs, shared with the server's pre-check).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkText, checkTextFirstPass, safetyCopy } from '../src/engine/safety.js';
import { interpret } from '../src/engine/interpret.js';
import { POSITIVE, NEGATIVE, NEGATIVE_APP_ONLY } from './safety-qa.probes.mjs';

const RANK = { none: 0, concern: 1, care: 2, crisis: 3 };

test('safety QA: the probe table is big enough to mean something', () => {
  assert.ok(POSITIVE.length >= 25, `positives: ${POSITIVE.length}`);
  assert.ok(NEGATIVE.length + NEGATIVE_APP_ONLY.length >= 25, `negatives: ${NEGATIVE.length + NEGATIVE_APP_ONLY.length}`);
  assert.equal(new Set(POSITIVE.map(([t]) => t)).size, POSITIVE.length, 'no repeated positives');
  assert.equal(new Set([...NEGATIVE, ...NEGATIVE_APP_ONLY]).size, NEGATIVE.length + NEGATIVE_APP_ONLY.length, 'no repeated negatives');
});

test('safety QA: plain statements of being in danger and distress phrases are caught (checkText and interpret agree)', () => {
  for (const [t, level, category] of POSITIVE) {
    const r = checkText(t);
    assert.equal(r.level, level, `${t} → ${r.level} (${r.matched})`);
    assert.equal(r.category, category, `${t} → ${r.category}`);
    assert.equal(interpret(t).safety.level, level === 'care' ? 'concern' : level, `interpret: ${t}`);
  }
});

test('safety QA: the findings\' own phrases (blocking and major) are caught on the first pass, with no fillers to remove', () => {
  for (const t of ["I'm not safe", 'I am not safe', "i'm not safe here", "I'm afraid he'll hurt me"]) {
    assert.deepEqual([checkTextFirstPass(t).level, checkTextFirstPass(t).category], ['care', 'unsafe'], t);
    // the support copy, never a reframe
    assert.match(safetyCopy(checkText(t)).title, /safety comes first/i, t);
  }
  for (const t of ['I hate myself', 'I hate myself so much', 'I really hate myself', "I'm a failure and I hate me", 'I made myself throw up',
    "I'm all alone and I can't take it", "I'm having a panic attack", "I can't breathe I'm panicking"]) {
    assert.ok(RANK[checkTextFirstPass(t).level] >= RANK.concern, t);
  }
});

test('safety QA: everyday wording near the new phrases stays none', () => {
  for (const t of [...NEGATIVE, ...NEGATIVE_APP_ONLY]) {
    const r = checkText(t);
    assert.equal(r.level, 'none', `${t} → ${r.level} (${r.matched})`);
    assert.equal(interpret(t).safety.level, 'none', `interpret: ${t}`);
  }
});

test('safety QA: the new phrases are still caught inside longer messages, and a crisis in the same words still wins', () => {
  assert.equal(checkText("Honestly I don't know what to do. I'm not safe here and he's home soon.").level, 'care');
  assert.equal(checkText("it's 3am and I'm having a panic attack, I can't stop shaking").level, 'concern');
  assert.equal(checkText('I hate myself and I want to die').level, 'crisis');
  assert.equal(checkText("I'm not safe, I want to kill myself").level, 'crisis');
  // laughing with the same words still says the rest
  assert.equal(checkText("laughing so hard I can't breathe but honestly I hate myself").level, 'concern');
});
