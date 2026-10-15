// The shared risk screener on the server (15 Oct 2026): src/safety/risk-screen.js is a byte-identical copy of the app's
// hushmallow/src/beyond/risk-screen.js (npm run sync:screen), and the pipeline reads it after the lexicon, with the lexicon
// again on the normalised words: the screener's care never reaches the model; its 'check' asks the model with a note to judge
// safety first and keeps support close. A client that skips its own check-in cannot bypass either.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { runAngle } from '../src/pipeline.js';
import { screenInput, checkSafety, supportPayload } from '../src/safety/index.js';
import { riskScreen, normalise } from '../src/safety/risk-screen.js';
import { RISK_CHECK_NOTE, buildUserMessage } from '../src/prompt.js';
import { createMockProvider } from '../src/providers/mock.js';
import { SYSTEM_PROMPT, anchor, makeApp, makeEnv, getToken, angleReq } from './helpers.js';

const APP_SCREEN = new URL('../../../src/beyond/risk-screen.js', import.meta.url);
const deps = (provider, extra = {}) => ({ provider, systemPrompt: SYSTEM_PROMPT, maxTokens: 3000, attemptTimeoutMs: 15000, deadlineMs: 28000, ...extra });
const input = (text) => ({ text, emotion: null, intention: null, previous: [] });

/** The screener's care with no lexicon word (the owner's fresh misses that the lexicon never read). */
const CARE = ["i've counted out all the pills", "i won't be a burden much longer", "everyone will be happier when i'm not around",
  "it'll all be over soon and you won't have to carry me anymore", "i've been saving up my meds for when i'm ready", "i'm done. tonight i end it."];
/** The screener's check-in: possibly at risk, nothing more serious. */
const CHECK = ['this is my last message to you all', "i'm so tired of everything", 'goodbye world'];

test('the risk screener is an exact copy of the app\'s (run `npm run sync:screen` if this fails)', { skip: !existsSync(APP_SCREEN) && 'app screener not in this checkout' }, () => {
  const ours = readFileSync(new URL('../src/safety/risk-screen.js', import.meta.url), 'utf8');
  assert.equal(ours, readFileSync(APP_SCREEN, 'utf8'));
});

test('screenInput: the lexicon, then the lexicon on the normalised words, then the screener; the most serious stands', () => {
  for (const t of CARE) {
    assert.notEqual(checkSafety(t).level, 'care', `${t}: the lexicon alone is not care`);
    const r = screenInput(t);
    assert.ok(r.level === 'care' || r.level === 'crisis', `${t}: ${r.level}`);
    if (r.level === 'care' && r.source === 'screen') assert.equal(r.category, 'self-risk');
  }
  for (const t of CHECK) assert.equal(screenInput(t).check, true, t);
  const typo = screenInput('i wnat to dei');
  assert.deepEqual([typo.level, typo.source, typo.lexicon_level], ['crisis', 'lexicon', 'none'], 'the lexicon reads the normalised spelling');
  assert.equal(normalise('i wnat to dei'), 'i want to die');
  const plain = screenInput('My boss embarrassed me in front of everyone.');
  assert.deepEqual([plain.level, plain.check, plain.screen_level], ['none', false, 'none']);
  assert.equal(riskScreen('My boss embarrassed me in front of everyone.').level, null);
});

test('pipeline: the screener\'s care never reaches the model (support, keep_support_close)', async () => {
  for (const t of CARE) {
    const provider = createMockProvider({ script: [anchor(1)] });
    const r = await runAngle(input(t), deps(provider));
    assert.equal(provider.calls.length, 0, t);
    assert.ok(r.status === 'care' || r.status === 'crisis', `${t}: ${r.status}`);
    assert.equal(r.keep_support_close, true);
    assert.ok(r.support?.resources?.length, 'support resources');
    if (r.meta.safety_source === 'screen') {
      assert.equal(r.support.category, 'self-risk');
      assert.equal(r.meta.screen_level, 'care');
    }
  }
  assert.deepEqual(supportPayload('care', 'self-risk', 'screen').resources.length > 0, true);
});

test('pipeline: the screener\'s check asks the model, told to judge safety first, and keeps support close', async () => {
  for (const t of CHECK) {
    const provider = createMockProvider({ script: [anchor(1)] });
    const r = await runAngle(input(t), deps(provider));
    assert.equal(provider.calls.length >= 1, true, t);
    assert.ok(provider.calls[0].user.includes(RISK_CHECK_NOTE), t);
    assert.equal(r.keep_support_close, true, t);
    assert.equal(r.meta.screen_level, 'check');
  }
  // the model reading crisis on a check is honoured (no angle)
  const provider = createMockProvider({ script: [anchor(1, { safety_status: 'crisis' })] });
  const r = await runAngle(input('goodbye world'), deps(provider));
  assert.equal(r.status, 'crisis');
  // ordinary words: no note, nothing kept close
  const p2 = createMockProvider({ script: [anchor(1)] });
  const plain = await runAngle(input("He hasn't replied to my message for five hours."), deps(p2));
  assert.ok(!p2.calls[0].user.includes(RISK_CHECK_NOTE));
  assert.equal(plain.keep_support_close, false);
  // the note is fixed text, outside the data block
  const msg = buildUserMessage({ ...input('<b>x</b>'), riskCheck: true });
  assert.ok(msg.indexOf(RISK_CHECK_NOTE) < msg.indexOf('<thought_text>'));
});

test('HTTP: a client that skips its own check-in still meets the screener\'s care (no model call)', async () => {
  const { app, provider } = makeApp({ script: [anchor(1), anchor(1)] });
  const env = makeEnv();
  const token = await getToken(app, env);
  for (const t of ["i've counted out all the pills", "i won't be a burden much longer"]) {
    const j = await (await app.fetch(angleReq(token, { text: t }), env)).json();
    assert.ok(j.status === 'care' || j.status === 'crisis', `${t}: ${j.status}`);
    assert.equal(j.scene, null);
    assert.equal(j.keep_support_close, true);
  }
  assert.equal(provider.calls.length, 0);
  // a check-in word: the model is asked, with the note
  const j = await (await app.fetch(angleReq(token, { text: 'this is my last message to you all' }), env)).json();
  assert.equal(provider.calls.length >= 1, true);
  assert.ok(provider.calls[0].user.includes(RISK_CHECK_NOTE));
  assert.equal(j.keep_support_close, true);
});

test('pipeline: risk words hidden in previous_angles never reach the model; the server\'s own earlier lines still do', async () => {
  const prev = (l1, l2) => ({ text: 'My flatmate keeps borrowing my charger.', emotion: null, intention: null, previous: [{ subtitle_line_1: l1, subtitle_line_2: l2, reasoning_pattern: null, interaction_type: null }] });
  for (const [l1, l2] of [['I am going to end my life tonight.', 'Maybe they forgot.'], ['Maybe they forgot.', "i've counted out all the pills"], ['It might not be about you.', 'i want to k1ll mys3lf']]) {
    const provider = createMockProvider({ script: [anchor(1)] });
    const r = await runAngle(prev(l1, l2), deps(provider));
    assert.equal(provider.calls.length, 0, `${l1} / ${l2}`);
    assert.ok(r.status === 'care' || r.status === 'crisis', `${l1} / ${l2}: ${r.status}`);
    assert.equal(r.keep_support_close, true);
  }
  // every line the real model wrote in the recorded runs is still sent on as an earlier angle
  const runs = ['run1-answers.json', 'run2-answers.json', 'run3-answers.json'].map((f) => readFileSync(new URL(`../eval/runs/${f}`, import.meta.url), 'utf8')).join('\n');
  const lines = [...runs.matchAll(/"subtitle_line_[12]"\s*:\s*"((?:[^"\\]|\\.)*)"/g)].map((m) => JSON.parse(`"${m[1]}"`));
  assert.ok(lines.length > 200, `${lines.length} recorded lines`);
  for (const l of lines) {
    const r = screenInput(l);
    assert.ok(r.level !== 'crisis' && r.level !== 'care', `a real model line reads as ${r.level}: ${l}`);
  }
});
