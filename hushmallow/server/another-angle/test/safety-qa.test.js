// Safety pre-check: the final QA sweep's probes (13 Oct 2026). Plain
// statements of being in danger ("I'm not safe", "I'm afraid he'll hurt me")
// and distress phrases ("I hate myself", "I made myself throw up", "I'm having
// a panic attack") now in the shared lexicon. The probe table is the app's
// (hushmallow/tests/safety-qa.probes.mjs), kept here byte for byte
// (./safety-qa.probes.mjs) so a server-only checkout runs it too.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { checkSafety, checkSafetyFirstPass, supportPayload } from '../src/safety/index.js';
import { POSITIVE, NEGATIVE, NEGATIVE_APP_ONLY } from './safety-qa.probes.mjs';

const APP_PROBES = new URL('../../../tests/safety-qa.probes.mjs', import.meta.url);
const PROBES = new URL('./safety-qa.probes.mjs', import.meta.url);
const APP_SAFETY = new URL('../../../src/engine/safety.js', import.meta.url);

test('safety QA: the probe table here is the app\'s, byte for byte', { skip: !existsSync(APP_PROBES) && 'app not in this checkout' }, () => {
  assert.equal(readFileSync(PROBES, 'utf8'), readFileSync(APP_PROBES, 'utf8'),
    'copy hushmallow/tests/safety-qa.probes.mjs to server/another-angle/test/safety-qa.probes.mjs');
});

test('safety QA: plain statements of being in danger and distress phrases are caught, as in the app', () => {
  assert.ok(POSITIVE.length >= 25 && NEGATIVE.length >= 25);
  for (const [t, level, category] of /** @type {[string, string, string][]} */ (POSITIVE)) {
    assert.deepEqual(checkSafety(t), { level, category }, t);
  }
  // the findings' own words need no second pass, and get the authored support copy (no reframe)
  for (const t of ["I'm not safe", 'I am not safe', "i'm not safe here", "I'm afraid he'll hurt me"]) {
    assert.deepEqual(checkSafetyFirstPass(t), { level: 'care', category: 'unsafe' }, t);
    assert.match(supportPayload('care', 'unsafe', 'lexicon').title, /safety comes first/i);
  }
});

test('safety QA: everyday wording near the new phrases stays none', () => {
  for (const t of NEGATIVE) assert.deepEqual(checkSafety(t), { level: 'none', category: null }, t);
});

test('safety QA: the app gives the same answers (and the server is never less careful)', { skip: !existsSync(APP_SAFETY) && 'app not in this checkout' }, async () => {
  const app = await import(APP_SAFETY.href);
  const rank = { none: 0, concern: 1, care: 2, crisis: 3 };
  for (const [t, level, category] of /** @type {[string, string, string][]} */ (POSITIVE)) {
    const a = app.checkText(t);
    assert.deepEqual([a.level, a.category], [level, category], `app: ${t}`);
  }
  for (const t of [...NEGATIVE, ...NEGATIVE_APP_ONLY]) {
    const a = app.checkText(t);
    assert.equal(a.level, 'none', `app: ${t} (${a.matched})`);
    assert.ok(rank[checkSafety(t).level] >= rank[a.level], t);
  }
});
