// The evaluation harness for the safety screen (tools/safety-eval.mjs): the clinicians' sheet
// is blind and complete, and scoring against labels counts misses and false alarms correctly.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  phrasings, toCsv, parseCsv, score, kappa, outcome, sampleIds, libraryCsv, outcomeDetail, normalisePhrasing, LABELS, OUTCOMES, DANGER_TITLE,
  displaySample, displayCsv, displayKeyCsv, withSheetIds, probeResults, probeResultsCsv, probeBlindCsv, probeSummary,
} from '../tools/safety-eval.mjs';
import { libraryCatalogue } from '../core/perspectives.js';

const P = JSON.parse(readFileSync(new URL('./fixtures/mallow-probes.json', import.meta.url), 'utf8'));
const doc = (name) => readFileSync(new URL(`../docs/clinical/${name}`, import.meta.url), 'utf8');

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
  // 11 phrasings appear twice in the full sheet, so a phrasing can have two ids: 10 are in the crisis list and among the
  // undecided, and 1 is listed twice among the undecided ("I just want to disappear for a while.")
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

test('the undecided-only sheet: just the phrasings the developers couldn’t call, with the full sheet’s ids', () => {
  const rows = phrasings();
  const ids = sampleIds(rows, { others: false });
  const sheet = parseCsv(toCsv(rows, { only: ids }));
  assert.equal(sheet.length, rows.filter((r) => r.group === 'undecided').length);
  assert.ok(sheet.every((r) => rows.some((x) => x.group === 'undecided' && x.phrasing === r.phrasing)));
  const alsoCrisis = rows.filter((r) => r.group === 'crisis').map((r) => r.phrasing).filter((p) => rows.some((x) => x.group === 'undecided' && x.phrasing === p));
  assert.equal(alsoCrisis.length, 10);
  assert.ok(alsoCrisis.every((p) => sheet.some((r) => r.phrasing === p)), 'a phrasing listed under both keeps its undecided copy');
});

test('the Mallow library sheet holds every line a Mallow can say, and docs/clinical has the current one', () => {
  const c = libraryCatalogue();
  const sheet = parseCsv(libraryCsv(c));
  assert.equal(sheet.length, c.openers.length + c.angles.length);
  assert.deepEqual(Object.keys(sheet[0]), ['n', 'kind', 'from', 'mallow', 'line', 'review', 'notes']);
  assert.deepEqual(new Set(sheet.map((r) => r.line)), new Set([...c.openers, ...c.angles].map((x) => x.text)));
  assert.ok(sheet.some((r) => r.from === 'reframe') && sheet.some((r) => r.from.startsWith('theme:')) && sheet.some((r) => r.from.startsWith('label:')));
  const file = readFileSync(new URL('../docs/clinical/mallow-library-for-review.csv', import.meta.url), 'utf8');
  assert.equal(file, libraryCsv(c), 'the Mallow library changed: re-export docs/clinical/mallow-library-for-review.csv (node tools/safety-eval.mjs --library <file>)');
});

test('the full sheet’s repeated phrasings are the 10 crisis/undecided pairs and 1 undecided phrasing listed twice', () => {
  const groups = new Map();
  for (const r of phrasings()) groups.set(r.phrasing, [...(groups.get(r.phrasing) || []), r.group]);
  const twice = [...groups].filter(([, g]) => g.length > 1);
  assert.equal(twice.length, 11);
  assert.equal(twice.filter(([, g]) => g.join() === 'crisis,undecided').length, 10);
  assert.deepEqual(twice.filter(([, g]) => g.join() === 'undecided,undecided').map(([p]) => p), ['I just want to disappear for a while.']);
});

test('outcomeDetail: the same answer as outcome, telling the writer’s own crisis screen from "Someone might be in danger" by its title', () => {
  for (const r of phrasings()) assert.equal(outcomeDetail(r.phrasing).outcome, outcome(r.phrasing), r.phrasing);
  assert.deepEqual(outcomeDetail(P.danger[0]), { outcome: 'danger', code: 'support', title: DANGER_TITLE });
  const own = outcomeDetail('I want to end my life tonight.');
  assert.equal(own.outcome, 'crisis');
  assert.notEqual(own.title, DANGER_TITLE);
  assert.equal(outcomeDetail(P.careNotCrisis[0]).outcome, 'care');
  // released on the sheet, but not by the screen: the code says why
  assert.deepEqual(outcomeDetail('Call me on 0412 345 678 tonight'), { outcome: 'release', code: 'contact', title: '' });
  assert.deepEqual(outcomeDetail('I’m nervous about my first day at the new job.'), { outcome: 'release', code: 'ok', title: '' });
});

test('scoring shows what the headline figures leave out: every label × screen, unsure rows, misrouted risk, released care, distinct phrasings', () => {
  const crisis = 'I want to end my life tonight.';
  const danger = P.danger[0];
  const care = P.careNotCrisis[0];
  const everyday = 'I’m nervous about my first day at the new job.';
  assert.deepEqual([outcome(crisis), outcome(danger), outcome(care), outcome(everyday)], ['crisis', 'danger', 'care', 'release']);
  const rows = [
    { id: '1', phrasing: crisis, agreed: 'crisis' },
    { id: '2', phrasing: 'i want to end my life  tonight', agreed: 'crisis' },   // the same phrasing, typed differently
    { id: '3', phrasing: crisis, agreed: 'danger' },                             // danger, shown the writer’s own crisis screen
    { id: '4', phrasing: danger, agreed: 'crisis' },                             // crisis, shown "Someone might be in danger"
    { id: '5', phrasing: everyday, agreed: 'care' },                             // care, released to strangers
    { id: '6', phrasing: care, agreed: 'care' },
    { id: '7', phrasing: everyday, agreed: 'release' },
    { id: '8', phrasing: crisis, agreed: 'unsure' },
    { id: '9', phrasing: everyday, agreed: 'unsure' },
    { id: '10', phrasing: danger, clinician_1: 'danger', agreed: '' },          // labelled by one clinician, not agreed yet
  ];
  const s = score(rows);
  // the headline figures are as before: misrouted risk still counts as caught
  assert.equal(s.labelled, 7);
  assert.equal(s.unsure, 2);
  assert.equal(s.sensitivity, 1);
  assert.equal(s.falseAlarmRate, 0);
  assert.equal(s.ppv, 1);
  assert.deepEqual(s.confusion, { crisis: { crisis: 2, danger: 1 }, danger: { crisis: 1 }, care: { release: 1, care: 1 }, release: { release: 1 } });
  // every agreed label (unsure too) against every screen, zeros included
  assert.deepEqual(Object.keys(s.matrix), LABELS);
  assert.deepEqual(s.matrix, {
    crisis: { crisis: 2, danger: 1, care: 0, release: 0 },
    danger: { crisis: 1, danger: 0, care: 0, release: 0 },
    care: { crisis: 0, danger: 0, care: 1, release: 1 },
    release: { crisis: 0, danger: 0, care: 0, release: 1 },
    unsure: { crisis: 1, danger: 0, care: 0, release: 1 },
  });
  for (const l of LABELS) assert.deepEqual(Object.keys(s.matrix[l]), OUTCOMES);
  assert.deepEqual(s.unsureRows, [{ id: '8', phrasing: crisis, now: 'crisis' }, { id: '9', phrasing: everyday, now: 'release' }]);
  assert.deepEqual(s.misrouted, [
    { id: '3', phrasing: crisis, agreed: 'danger', now: 'crisis' },
    { id: '4', phrasing: danger, agreed: 'crisis', now: 'danger' },
  ]);
  assert.deepEqual(s.careReleased, [{ id: '5', phrasing: everyday, now: 'release' }]);
  assert.deepEqual(s.awaitingAgreement, ['10']);
  assert.equal(s.prevalence, 4 / 7);
  // rows, and the distinct phrasings behind them
  assert.equal(normalisePhrasing(rows[1].phrasing), normalisePhrasing(crisis));
  assert.equal(normalisePhrasing('I’m  done.'), normalisePhrasing("i'm done"));
  assert.deepEqual(s.counts.sheet, { rows: 10, phrasings: 4 });
  assert.deepEqual(s.counts.labelled, { rows: 7, phrasings: 4 });
  assert.deepEqual(s.counts.unsure, { rows: 2, phrasings: 2 });
  assert.deepEqual(s.counts.risk, { rows: 4, phrasings: 2 });
  assert.deepEqual(s.counts.caught, { rows: 4, phrasings: 2 });
  assert.deepEqual(s.counts.missed, { rows: 0, phrasings: 0 });
  assert.deepEqual(s.counts.care, { rows: 2, phrasings: 2 });
  assert.deepEqual(s.counts.careReleased, { rows: 1, phrasings: 1 });
  assert.deepEqual(s.counts.misrouted, { rows: 2, phrasings: 2 });
  assert.deepEqual(s.repeated.map((r) => [r.ids, r.agreed]), [
    [['1', '2', '3', '8'], ['crisis', 'crisis', 'danger', 'unsure']],
    [['4', '10'], ['crisis', '']],
    [['5', '7', '9'], ['care', 'release', 'unsure']],
  ]);
  // an old sheet (ids, both clinicians' columns, agreed) scores as it always did
  const old = score(parseCsv(`id,phrasing,clinician_1,clinician_2,agreed,notes\n1,${crisis},crisis,crisis,crisis,\n2,"${everyday}",release,care,release,\n`));
  assert.equal(old.labelled, 2);
  assert.equal(old.raterPairs, 2);
  assert.deepEqual(old.missed, []);
});

test('the display sheet for the Tier A reviewer: the same 108 rows shuffled afresh, ids 1 to 108, a key back to the full sheet, nothing leaked', () => {
  const rows = phrasings();
  const ids = sampleIds(rows);
  assert.equal(ids.size, 108);
  assert.equal(displayCsv(rows), displayCsv(phrasings()), 'the display sheet is not the same every time');
  assert.equal(displayKeyCsv(rows), displayKeyCsv(phrasings()), 'the key is not the same every time');
  const csv = displayCsv(rows);
  const sheet = parseCsv(csv);
  const key = parseCsv(displayKeyCsv(rows));
  assert.equal(sheet.length, 108);
  assert.equal(key.length, 108);
  // only display ids, phrasings and empty label columns: no group, note, screen outcome or full sheet id
  assert.equal(csv.split('\n')[0], 'display_id,phrasing,clinician_1,clinician_2,agreed,notes');
  assert.ok(sheet.every((r) => !r.clinician_1 && !r.clinician_2 && !r.agreed && !r.notes), 'the sheet came pre-labelled');
  assert.ok(displaySample(rows).every((r) => !csv.includes(`,${r.group},`) && !csv.includes(`,${outcome(r.phrasing)},`)), 'a group or an outcome leaked');
  assert.deepEqual(Object.keys(key[0]), ['display_id', 'full_sheet_id', 'phrasing']);
  assert.deepEqual(sheet.map((r) => r.display_id), Array.from({ length: 108 }, (_, i) => String(i + 1)));
  // the same phrasings as the shorter sheet (one phrasing is on it twice), in a fresh order
  const sample = parseCsv(toCsv(rows, { only: ids }));
  assert.deepEqual(sheet.map((r) => r.phrasing).sort(), sample.map((r) => r.phrasing).sort());
  assert.notDeepEqual(sheet.map((r) => r.phrasing), sample.map((r) => r.phrasing), 'not reshuffled');
  assert.ok(sheet.filter((r, i) => r.phrasing === sample[i].phrasing).length < 10, 'too close to the shorter sheet’s order');
  // the key maps each display id back to the full sheet's row with the same phrasing, each of the sample's ids once
  assert.deepEqual(key.map((k) => k.display_id), sheet.map((r) => r.display_id));
  assert.deepEqual(new Set(key.map((k) => k.full_sheet_id)), new Set([...ids].map(String)));
  const full = new Map(parseCsv(toCsv(rows)).map((r) => [r.id, r.phrasing]));
  const back = withSheetIds(sheet, key);
  for (const r of back) assert.equal(full.get(r.id), r.phrasing, `display id ${r.display_id} maps to the wrong row`);
  assert.throws(() => withSheetIds([{ display_id: '109', phrasing: 'x' }], key), /not in the key/);
  // a key that isn't the one made with the sheet that was sent never moves labels onto other phrasings
  const stale = key.map((k, i) => ({ ...k, full_sheet_id: key[(i + 1) % key.length].full_sheet_id, phrasing: key[(i + 1) % key.length].phrasing }));
  assert.throws(() => withSheetIds(sheet, stale), /different phrasing/);
  assert.throws(() => withSheetIds(sheet, key.map(({ display_id, full_sheet_id }) => ({ display_id, full_sheet_id }))), /columns/);
  assert.throws(() => withSheetIds(sheet, key.map((k) => ({ ...k, full_sheet_id: 'x' }))), /two numbers/);
  // a labelled display sheet scores by its display ids, or by the full sheet's with the key
  const labelled = sheet.map((r) => ({ ...r, agreed: 'release' }));
  const held = score(labelled).falseAlarms;
  assert.ok(held.length > 0);
  assert.ok(held.every((f) => sheet.some((r) => r.display_id === f.id && r.phrasing === f.phrasing)), 'reported by the wrong display id');
  const heldFull = score(withSheetIds(labelled, key)).falseAlarms;
  assert.equal(heldFull.length, held.length);
  assert.ok(heldFull.every((f) => full.get(f.id) === f.phrasing), 'reported by the wrong full sheet id');
});

test('docs/clinical has the current display sheet and its key', () => {
  const rows = phrasings();
  const again = 'node tools/safety-eval.mjs --export docs/clinical/tier-a-sample-display.csv --sample --display-ids docs/clinical/tier-a-display-key.csv';
  assert.equal(doc('tier-a-sample-display.csv'), displayCsv(rows), `docs/clinical/tier-a-sample-display.csv is out of date: ${again}`);
  assert.equal(doc('tier-a-display-key.csv'), displayKeyCsv(rows), `docs/clinical/tier-a-display-key.csv is out of date: ${again}`);
});

test('the Tier 0 probe keeps its ids when it is refreshed, even if the rows are reordered, and numbers only new rows', () => {
  const results = parseCsv(doc('tier0-probe-results.csv'));
  const again = probeResults([...results].reverse());
  assert.deepEqual(new Map(again.map((r) => [r.phrasing, r.id])), new Map(results.map((r) => [r.phrasing, Number(r.id)])));
  const added = probeResults([...results, { phrasing: 'A brand new probe phrasing.', category: 'x', intended: 'release', screen_000c0cd: 'release' }]);
  assert.equal(added.at(-1).id, results.length + 1);
  assert.throws(() => probeResults([{ ...results[0] }, { ...results[1], id: results[0].id }]), /same id twice/);
});

test('refusals that aren’t support screens are never counted as released to strangers', () => {
  const s = score([{ id: '1', phrasing: 'Call me on 0412 345 678 tonight', agreed: 'care' }, { id: '2', phrasing: 'I made pancakes and they were lovely.', agreed: 'release' }]);
  assert.equal(s.careReleased.length, 0);
  assert.deepEqual(s.refused.map((r) => [r.id, r.code]), [['1', 'contact']]);
  const e = score([{ id: '1', phrasing: 'Call me on 0412 345 678 tonight', agreed: 'release' }]);
  assert.equal(e.falseAlarms.length, 1, 'an everyday feeling refused is held back too');
});

test('the Tier 0 probe: its blind sheet holds every phrasing once with nothing about intent or the screen, and screen_now is today’s screen', () => {
  const results = parseCsv(doc('tier0-probe-results.csv'));
  assert.deepEqual(Object.keys(results[0]), ['id', 'phrasing', 'category', 'intended', 'screen_000c0cd', 'screen_now']);
  assert.ok(results.every((r) => LABELS.includes(r.intended) && OUTCOMES.includes(r.screen_000c0cd) && OUTCOMES.includes(r.screen_now)));
  assert.equal(new Set(results.map((r) => normalisePhrasing(r.phrasing))).size, results.length, 'a phrasing is in the probe twice');
  // the blind sheet: ids 1..n, phrasings only, empty label columns, not grouped by kind
  const blind = doc('tier0-probe-blind.csv');
  assert.equal(blind, probeBlindCsv(results), 'docs/clinical/tier0-probe-blind.csv is out of date: node tools/safety-eval.mjs --probe docs/clinical/tier0-probe-results.csv --blind docs/clinical/tier0-probe-blind.csv');
  assert.equal(blind.split('\n')[0], 'id,phrasing,clinician_1,clinician_2,agreed,notes');
  const sheet = parseCsv(blind);
  assert.deepEqual(sheet.map((r) => r.id), results.map((_, i) => String(i + 1)));
  assert.ok(sheet.every((r) => !r.clinician_1 && !r.clinician_2 && !r.agreed && !r.notes), 'the blind sheet came pre-labelled');
  assert.deepEqual(sheet.map((r) => r.phrasing).sort(), results.map((r) => r.phrasing).sort());
  const byId = new Map(results.map((r) => [r.id, r]));
  for (const r of sheet) assert.equal(byId.get(r.id).phrasing, r.phrasing, `blind id ${r.id} is another row in the results`);
  assert.ok(new Set(sheet.slice(0, 20).map((r) => byId.get(r.id).category)).size > 5, 'the blind sheet is grouped by kind');
  // the ids and screen_now are what the tool makes, from today's screen
  const fresh = probeResults(results.map(({ id, screen_now, ...r }) => r));
  assert.deepEqual(fresh.map((r) => String(r.id)), results.map((r) => r.id));
  assert.equal(doc('tier0-probe-results.csv'), probeResultsCsv(fresh),
    'the screen now answers a Tier 0 probe phrasing differently: refresh screen_now (node tools/safety-eval.mjs --probe docs/clinical/tier0-probe-results.csv --blind docs/clinical/tier0-probe-blind.csv) and report the change');
  // at 000c0cd the screen caught 25 of the 127 crisis or danger rows (the baseline column never changes)
  const p = probeSummary(results);
  assert.deepEqual([p.rows, p.risk.rows, p.risk.caughtBefore, p.care.rows, p.care.heldBefore, p.everyday.rows, p.everyday.heldBefore], [246, 127, 25, 41, 7, 54, 20]);
});
