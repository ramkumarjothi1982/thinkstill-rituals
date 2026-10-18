// Australian support lines in the server's authored support (16 Oct 2026, launch blocker 1; Australia is the launch market).
// The support copy is the app's (shared-lexicon.js, byte-identical with hushmallow/src/data/safety-lexicon.js): every crisis
// and care payload names 000 beside 999, 911 and 112, crisis adds Lifeline, the Suicide Call Back Service and 13YARN, someone
// in danger adds Lifeline, and care adds 1800RESPECT. The UK and US lines and findahelpline.com all stay.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { supportPayload } from '../src/safety/index.js';
import { makeApp, makeEnv, getToken, angleReq } from './helpers.js';

const text = (p) => p.resources.map((r) => `${r.label}: ${r.detail}`).join('\n');
const has = (p, list, what) => { const t = text(p); for (const s of list) assert.ok(t.includes(s), `${what}: ${s}`); };
const EVERYWHERE = ['999 (UK), 911 (US), 112 (EU), 000 (Australia)', 'findahelpline.com'];

test('crisis support names 000, Lifeline (call or text), the Suicide Call Back Service and 13YARN, and keeps Samaritans and 988', () => {
  for (const [level, category, source] of [['crisis', 'self-harm', 'lexicon'], ['crisis', null, 'model'], ['care', 'self-risk', 'screen']]) {
    const p = supportPayload(/** @type {any} */ (level), category, /** @type {any} */ (source));
    has(p, [...EVERYWHERE, 'Lifeline (Australia)', 'Call 13 11 14, any time', 'text 0477 13 11 14', 'Suicide Call Back Service (Australia)', '1300 659 467',
      '13YARN (Australia)', '13 92 76', 'Aboriginal and Torres Strait Islander', 'Samaritans', '116 123', '988'], `${level}/${category}`);
  }
});

test('someone in danger: 000 and Lifeline, beside Samaritans and 988', () => {
  const p = supportPayload('crisis', 'someone-in-danger', 'lexicon');
  assert.equal(p.category, 'someone-in-danger');
  has(p, [...EVERYWHERE, 'Lifeline (Australia)', '13 11 14', 'worried about someone else', 'Samaritans', '988'], 'someone in danger');
});

test('care support names 000 and 1800RESPECT, and keeps the UK and US domestic-abuse lines', () => {
  for (const category of ['abuse', 'violence', 'threat', 'harassment', 'discrimination', 'unsafe', null]) {
    const p = supportPayload('care', category, 'lexicon');
    has(p, [...EVERYWHERE, '1800RESPECT', '1800 737 732', 'family, domestic or sexual violence', '0808 2000 247', '1-800-799-7233'], `care/${category}`);
  }
});

test('the support copy never says "AI" or a plan name, and every line is a label with words', () => {
  for (const p of [supportPayload('crisis', 'self-harm', 'lexicon'), supportPayload('crisis', 'someone-in-danger', 'lexicon'), supportPayload('care', 'abuse', 'lexicon')]) {
    for (const r of p.resources) {
      assert.ok(r.label.length > 3 && r.detail.length > 10, r.label);
      assert.doesNotMatch(`${r.label} ${r.detail}`, /\bAI\b|\bPaid\b|\bUltra\b|\bPremium\b|Anthropic/);
    }
  }
});

test('the API: a crisis answer carries the Australian lines, and still never reaches the model', async () => {
  const { app, provider } = makeApp({ script: [] });
  const env = makeEnv();
  const token = await getToken(app, env);
  const crisis = await (await app.fetch(angleReq(token, { text: 'Honestly nobody would miss me if I was gone.' }), env)).json();
  assert.equal(crisis.status, 'crisis');
  has(crisis.support, [...EVERYWHERE, '13 11 14', '1300 659 467', '13 92 76', '116 123'], 'api crisis');
  const care = await (await app.fetch(angleReq(token, { text: 'My partner threatens me when I go out with friends.' }), env)).json();
  assert.equal(care.status, 'care');
  has(care.support, [...EVERYWHERE, '1800 737 732'], 'api care');
  assert.equal(provider.calls.length, 0);
});
