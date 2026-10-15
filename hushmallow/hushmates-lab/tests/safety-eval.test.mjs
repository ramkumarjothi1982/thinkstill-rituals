// The evaluation harness for the safety screen (tools/safety-eval.mjs): the clinicians' sheet
// is blind and complete, and scoring against labels counts misses and false alarms correctly.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { phrasings, toCsv, parseCsv, score, kappa, outcome, sampleIds } from '../tools/safety-eval.mjs';

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

test('the full sheet in docs/clinical is the one the harness makes (379 phrasings, unchanged)', () => {
  const file = readFileSync(new URL('../docs/clinical/crisis-phrasings-for-review.csv', import.meta.url), 'utf8');
  assert.equal(file, toCsv(phrasings()));
  assert.equal(parseCsv(file).length, 379);
});

test('the shorter sheet for one reviewer: every undecided phrasing, each group represented, the full sheet’s ids', () => {
  const rows = phrasings();
  // 11 phrasings appear twice in the full sheet (once in a crisis list, once among the undecided), so a phrasing can have two ids
  const full = new Map();
  for (const r of parseCsv(toCsv(rows))) full.set(r.phrasing, [...(full.get(r.phrasing) || []), r.id]);
  const ids = sampleIds(rows);
  const sheet = parseCsv(toCsv(rows, { only: ids }));
  assert.equal(sheet.length, ids.size);
  for (const r of sheet) assert.ok(full.get(r.phrasing).includes(r.id), `id changed for "${r.phrasing}"`);
  const groupOf = new Map(rows.map((r) => [r.phrasing, r.group]));
  const undecided = rows.filter((r) => r.group === 'undecided');
  assert.ok(undecided.every((r) => sheet.some((s) => s.phrasing === r.phrasing)), 'an undecided phrasing was left out');
  assert.deepEqual(new Set(sheet.map((r) => groupOf.get(r.phrasing))), new Set(rows.map((r) => r.group)));
  assert.ok(sheet.length <= undecided.length * 2 + 5, `too long for one sitting: ${sheet.length}`);
  const file = readFileSync(new URL('../docs/clinical/tier-a-sample-for-review.csv', import.meta.url), 'utf8');
  assert.equal(file, toCsv(rows, { only: ids }), 'docs/clinical/tier-a-sample-for-review.csv is out of date: re-export it');
  // one reviewer's labels score without an agreement figure
  const s = score(sheet.slice(0, 3).map((r) => ({ ...r, agreed: 'crisis' })));
  assert.equal(s.raterPairs, 0);
  assert.equal(s.kappa, null);
});
