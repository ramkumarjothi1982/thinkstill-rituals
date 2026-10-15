// The evaluation harness for the safety screen (tools/safety-eval.mjs): the clinicians' sheet
// is blind and complete, and scoring against labels counts misses and false alarms correctly.

import test from 'node:test';
import assert from 'node:assert/strict';
import { phrasings, toCsv, parseCsv, score, kappa, outcome } from '../tools/safety-eval.mjs';

test('the clinicians’ sheet holds every phrasing once, blind to what the screen does', () => {
  const rows = phrasings();
  const sheet = parseCsv(toCsv(rows));
  assert.equal(sheet.length, rows.length);
  assert.deepEqual(Object.keys(sheet[0]), ['id', 'phrasing', 'clinician_1', 'clinician_2', 'agreed', 'notes']);
  assert.deepEqual(new Set(sheet.map((r) => r.phrasing)), new Set(rows.map((r) => r.phrasing)));
  assert.ok(sheet.every((r) => !r.clinician_1 && !r.agreed), 'the sheet came pre-labelled');
  // not grouped: the first twenty aren't all from one group
  const groupOf = new Map(rows.map((r) => [r.phrasing, r.group]));
  assert.ok(new Set(sheet.slice(0, 20).map((r) => groupOf.get(r.phrasing))).size > 2);
  // commas, quotes and apostrophes survive the round trip
  assert.ok(sheet.some((r) => r.phrasing.includes(',')));
});

test('scoring: misses, false alarms and agreement are counted against the labels', () => {
  const crisis = 'I want to end my life tonight.';
  const everyday = 'I’m nervous about my first day at the new job.';
  const missedLine = 'I can’t do this anymore.';
  assert.equal(outcome(crisis), 'crisis');
  assert.equal(outcome(everyday), 'release');
  const rows = [
    { id: '1', phrasing: crisis, clinician_1: 'crisis', clinician_2: 'crisis', agreed: 'crisis' },
    { id: '2', phrasing: everyday, clinician_1: 'release', clinician_2: 'release', agreed: 'release' },
    { id: '3', phrasing: missedLine, clinician_1: 'crisis', clinician_2: 'care', agreed: 'crisis' },
    { id: '4', phrasing: 'I’m so tired of everything.', clinician_1: 'unsure', clinician_2: 'release', agreed: 'unsure' },
  ];
  const s = score(rows);
  assert.equal(s.labelled, 3);
  assert.equal(s.unsure, 1);
  assert.equal(s.sensitivity, outcome(missedLine) === 'release' ? 0.5 : 1);
  assert.equal(s.falseAlarmRate, 0);
  assert.equal(s.raterPairs, 4);
  assert.throws(() => score([{ id: '9', phrasing: crisis, agreed: 'maybe' }]), /labels must be one of/);
});

test('Cohen’s kappa: perfect, chance and a worked example', () => {
  assert.equal(kappa([['a', 'a'], ['b', 'b']]), 1);
  assert.equal(kappa([]), null);
  // 20 items: 15 agree; rater 1 says yes 10 times, rater 2 says yes 9 times → kappa 0.5 (textbook example values)
  const pairs = [...Array(7).fill(['y', 'y']), ...Array(3).fill(['y', 'n']), ...Array(2).fill(['n', 'y']), ...Array(8).fill(['n', 'n'])];
  assert.ok(Math.abs(kappa(pairs) - 0.5) < 0.01, String(kappa(pairs)));
});
