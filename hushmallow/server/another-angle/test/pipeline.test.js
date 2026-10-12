// runAngle directly: the eval-only options and the cheap short cuts.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runAngle } from '../src/pipeline.js';
import { createMockProvider } from '../src/providers/mock.js';
import { SYSTEM_PROMPT, anchor, ANCHORS } from './helpers.js';

const deps = (provider, extra = {}) => ({ provider, systemPrompt: SYSTEM_PROMPT, maxTokens: 3000, attemptTimeoutMs: 15000, deadlineMs: 28000, ...extra });
const input = (text, previous = []) => ({ text, emotion: null, intention: null, previous });

test('emoji only: "unclear" without a model call', async () => {
  const provider = createMockProvider({ script: [anchor(1)] });
  const r = await runAngle(input('😭😭😭'), deps(provider));
  assert.deepEqual([r.status, r.fallback?.reason], ['fallback', 'unclear']);
  assert.equal(provider.calls.length, 0);
});

test('skipLexicon (eval only) lets the model judge a flagged text; without it the lexicon decides', async () => {
  const text = "I've been giving my things away and I don't think anyone would notice if I wasn't around.";
  const normal = await runAngle(input(text), deps(createMockProvider({ script: [anchor(1)] })));
  assert.deepEqual([normal.status, normal.meta.safety_source, normal.meta.lexicon_level], ['crisis', 'lexicon', 'crisis']);
  const provider = createMockProvider({ script: [anchor(1, { safety_status: 'crisis' })] });
  const probed = await runAngle(input(text), deps(provider, { skipLexicon: true }));
  assert.equal(provider.calls.length, 1, 'the model was asked');
  assert.deepEqual([probed.status, probed.meta.safety_source, probed.meta.lexicon_level], ['crisis', 'model', 'crisis']);
});

test('recordDrafts (eval only) keeps each rejected draft with its failing fields; off by default', async () => {
  const weak = anchor(2, { subtitle_line_1: 'Believe in yourself.', subtitle_line_2: 'You are amazing.' });
  const off = await runAngle(input(ANCHORS[2].text), deps(createMockProvider({ script: [weak, anchor(2)] })));
  assert.equal(off.meta.drafts, undefined);
  const on = await runAngle(input(ANCHORS[2].text), deps(createMockProvider({ script: [weak, anchor(2)] }), { recordDrafts: true }));
  assert.equal(on.status, 'ok');
  assert.equal(on.meta.drafts.length, 1);
  assert.deepEqual(on.meta.drafts[0].lines, ['Believe in yourself.', 'You are amazing.']);
  assert.ok(on.meta.drafts[0].failures.some((f) => f.code === 'generic_affirmation' && f.field === 'subtitle_line_1' && f.text === 'Believe in yourself.'));
});

test('a quality fallback hints the closest authored-engine pattern', async () => {
  const weak = anchor(2, { subtitle_line_1: 'Believe in yourself.', subtitle_line_2: 'You are amazing.' });
  const r = await runAngle(input(ANCHORS[2].text), deps(createMockProvider({ script: [weak, weak] })));
  assert.deepEqual(r.fallback, { reason: 'quality', hint: { reasoning_pattern: 'self_criticism', interaction_type: 'soften_harshness', mallow_character: 'boppo', authored_pattern: 'big-label' } });
});
