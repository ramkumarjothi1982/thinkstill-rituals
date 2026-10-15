// Every phrasing the adversarial reviews of the safety screen and the Mallow library found
// (tests/fixtures/mallow-probes.json), held to what each should get. Each library case is asked of
// every Mallow, three times over. Keyword rules are a floor, not a guarantee: these keep each fix
// from undoing another, and give the clinical review (docs/READINESS.md) a list to start from.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { screenFeeling } from '../core/feeling-safety.js';
import { libraryProvider } from '../core/perspectives.js';
import { MALLOW_IDS } from '../core/relay-config.js';

const P = JSON.parse(readFileSync(new URL('./fixtures/mallow-probes.json', import.meta.url), 'utf8'));
const screen = (text) => screenFeeling(text, { minChars: 1, maxChars: 10000 });
const lib = libraryProvider();
const picks = async (text, label) => (await Promise.all([0, 1, 2].map((attempt) => Promise.all(MALLOW_IDS.map((mallow) => lib({ text, label, mallow, attempt })))))).flat();
const ids = async (text, label) => (await picks(text, label)).map((r) => r.angleId || r.status);

test('the safety screen: passive wishes not to be here are answered with crisis support', () => {
  const missed = P.crisis.filter((t) => { const r = screen(t); return r.ok || r.level !== 'crisis'; });
  assert.deepEqual(missed, []);
});

test('the safety screen: someone else in danger gets the "Someone might be in danger" screen', () => {
  assert.deepEqual(P.danger.filter((t) => { const r = screen(t); return r.ok || r.level !== 'crisis' || !/danger/i.test(r.support?.title || ''); }), []);
});

test('the safety screen: crisis words beside abuse or bullying still get crisis support; a hurt arm stays care', () => {
  assert.deepEqual(P.crisisNotCare.filter((t) => screen(t).level !== 'crisis'), []);
  assert.deepEqual(P.careNotCrisis.filter((t) => { const r = screen(t); return r.ok || r.level !== 'care'; }), []);
});

test('the safety screen: everyday getaways, other people, alarms and a death told plainly are released', () => {
  assert.deepEqual(P.released.filter((t) => !screen(t).ok), []);
});

test('the Mallow library: the work at home gets load lines and never "your partner seems distant"', async () => {
  const wrong = [];
  for (const text of P.load) for (const label of ['frustration', 'sadness', 'anger', null]) {
    const got = await ids(text, label);
    // with no label, another theme that fits may answer; it still never says the partner seems distant
    if (got.some((id) => /^pd-ang/.test(id)) || (label && got.filter((id) => /^hm-load-/.test(id)).length < got.length / 3)) wrong.push(`${label} · ${text}: ${got.join(' ')}`);
  }
  assert.deepEqual(wrong, []);
});

test('the Mallow library: a death, harm at home, health, mood or money never get chores lines', async () => {
  const wrong = [];
  for (const [label, text] of P.neverLoad) { const got = await ids(text, label); if (got.some((id) => /^hm-load-/.test(id))) wrong.push(`${label} · ${text}: ${got.join(' ')}`); }
  assert.deepEqual(wrong, []);
});

test('the Mallow library: harm, control or a loss never get "your partner seems distant"; real distance keeps it', async () => {
  const wrong = [];
  for (const [label, text] of P.noDistance) { const got = await ids(text, label); if (got.some((id) => /^pd-ang/.test(id))) wrong.push(`no distance · ${label} · ${text}: ${got.join(' ')}`); }
  for (const [label, text] of P.distance) { const got = await ids(text, label); if (!got.some((id) => /^pd-ang/.test(id))) wrong.push(`distance · ${label} · ${text}: ${got.join(' ')}`); }
  assert.deepEqual(wrong, []);
});

test('the Mallow library: a death or pregnancy loss is recognised as grief; passing a test is not', async () => {
  const wrong = [];
  for (const text of P.grief) {
    const got = await ids(text, 'sadness');
    if (!got.some((id) => /^hm-loss-/.test(id)) || got.some((id) => /^(?:hm-load-|pd-ang)/.test(id))) wrong.push(`grief · ${text}: ${got.join(' ')}`);
  }
  for (const [label, text] of P.notGrief) { const got = await ids(text, label); if (got.some((id) => /^hm-loss-/.test(id))) wrong.push(`not grief · ${label} · ${text}: ${got.join(' ')}`); }
  assert.deepEqual(wrong, []);
});

// Tier 0 (docs/safety/TIER0_SELF_ASSESSMENT.md §3): where the library's everyday lines must not reach.
test('the Mallow library: harm at home, a worrying silence, a mistake that hurt someone, a medical test and a death told with "he" each get the right lines', async () => {
  const { SCENARIOS } = await import('../../src/ultra/frameworks.js');
  const { libraryCatalogue } = await import('../core/perspectives.js');
  const of = (...scenarioIds) => new Set(SCENARIOS.filter((s) => scenarioIds.includes(s.id)).flatMap((s) => s.angles.map((a) => a.id)));
  const harmIds = of('partner-distant', 'family-argument', 'seemed-annoyed', 'family-criticism', 'work-criticism', 'appearance-comment', 'not-listened', 'future-worry');
  const silenceIds = of('unanswered-message', 'no-text-back');
  const mistakeIds = of('mistake-judged');
  const loud = libraryCatalogue().openers.filter((o) => o.family === 'heavy' && !o.tender).map((o) => o.text.split('{adj}')[0]);
  const wrong = []; let answered = 0;
  const check = async (label, text, bad, why) => {
    for (const r of await picks(text, label)) {
      if (r.status !== 'ok') continue;
      answered++;
      if (bad(r)) wrong.push(`${why} · ${label} · ${text}: ${r.angleId} · ${r.text}`);
    }
  };
  for (const [label, text] of [
    ['anger', 'He calls me names and puts me down every night.'],
    ['worry', 'I walk on eggshells around him, he gets so angry if I see my friends.'],
    ['sadness', 'My mum screams at me every day and says I am useless.'],
    ['frustration', 'My boyfriend goes through my phone and gets angry when I talk to anyone.'],
  ]) await check(label, text, (r) => harmIds.has(r.angleId) || /^gen-[a-z]+-[a-z-]+-ang/.test(r.angleId) || loud.some((o) => r.text.startsWith(o)), 'harm at home');
  for (const [label, text] of [
    ['worry', 'My friend sent me thanks for everything and now she is not answering my messages.'],
    ['worry', 'My daughter has been really low and has not replied to my texts for three days.'],
  ]) await check(label, text, (r) => silenceIds.has(r.angleId), 'a worrying silence');
  await check('sadness', 'I made a mistake at work and a patient got hurt.', (r) => mistakeIds.has(r.angleId), 'a mistake that hurt someone');
  await check('worry', 'I have a blood test tomorrow and I am nervous.', (r) => /^hm-exam-/.test(r.angleId), 'a medical test is not an exam');
  await check('sadness', 'I miss him so much since he passed.', (r) => !/^hm-loss-/.test(r.angleId), 'a death told with "he"');
  assert.deepEqual(wrong, []);
  assert.ok(answered > 50, `only ${answered} answers were checked`);
});
