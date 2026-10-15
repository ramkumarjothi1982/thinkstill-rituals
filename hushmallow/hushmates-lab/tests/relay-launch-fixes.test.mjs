// Launch fixes in the reference engine (core/relay.js), each a finding from the review of 9012d6f; each
// failed before its fix. The same behaviour on the real backend: tests/backend-launch-fixes.test.mjs
// (and tests/backend-differential.test.mjs compares the two).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { world, throwsCode, FEELING, REFRAMES } from './relay-helpers.mjs';
import { RelayService } from '../core/relay.js';
import { REPORT_REASONS, REPORT_REASON_IDS } from '../core/relay-config.js';
import { RELAY_MESSAGES } from '../core/relay-messages.js';

const accOf = (w, key) => Object.values(w.svc.s.accounts).find((a) => a.key === key).id;
const paused = (w, id) => w.svc.getJourney(w.T.moon, { journeyId: id }).paused;

// ------------------------------------------------- 1. "Let it carry on" --
test('launch 1: "Let it carry on" leaves a feeling paused while a priority report on it is still open', () => {
  const w = world();
  const id = w.release('moon').journey.id;
  const a = w.svc.findFeeling(w.T.cloud).offer;
  const b = w.svc.findFeeling(w.T.star).offer;
  w.svc.reportFeeling(w.T.cloud, { holdId: a.holdId, reason: 'unkind' });
  assert.equal(paused(w, id), false, 'setup: one ordinary report doesn’t pause it');
  w.svc.reportFeeling(w.T.star, { holdId: b.holdId, reason: 'safety' });
  assert.equal(paused(w, id), true, 'setup: a priority report pauses it');
  const reports = w.svc.modListReports(w.T.mod).reports;
  const ordinary = reports.find((r) => r.reason === 'unkind');
  const priority = reports.find((r) => r.urgent);
  // the ordinary one is read first: it's fine, but the priority one is still waiting
  assert.deepEqual(w.svc.modResolve(w.T.mod, { id: ordinary.id, action: 'resume-feeling' }), { id: ordinary.id, status: 'no-action', paused: true });
  assert.equal(paused(w, id), true, 'an ordinary decision undid the pause of a priority report');
  assert.equal(w.svc.findFeeling(w.T.fern).offer, null, 'it was offered to someone while a priority report on it was open');
  // once the last open report on it is decided the same way, it carries on
  assert.deepEqual(w.svc.modResolve(w.T.mod, { id: priority.id, action: 'resume-feeling' }), { id: priority.id, status: 'no-action', paused: false });
  assert.equal(paused(w, id), false);
  assert.equal(w.svc.findFeeling(w.T.fern).offer?.feeling.text, FEELING, 'it travels again once nothing is waiting');
});

test('launch 1: two ordinary reports pause it; resuming one keeps it paused until the other is decided too', () => {
  const w = world();
  const id = w.release('moon').journey.id;
  const holds = ['cloud', 'star'].map((k) => w.svc.findFeeling(w.T[k]).offer.holdId);
  w.svc.reportFeeling(w.T.cloud, { holdId: holds[0], reason: 'unkind' });
  w.svc.reportFeeling(w.T.star, { holdId: holds[1], reason: 'harassment' });
  assert.equal(paused(w, id), true, 'setup: two reports pause it');
  const [r1, r2] = w.svc.modListReports(w.T.mod).reports;
  assert.equal(w.svc.modResolve(w.T.mod, { id: r1.id, action: 'resume-feeling' }).paused, true);
  assert.equal(paused(w, id), true);
  // the last one decided the same way lets it carry on
  assert.equal(w.svc.modResolve(w.T.mod, { id: r2.id, action: 'resume-feeling' }).paused, false);
  assert.equal(paused(w, id), false);
});

test('launch 1: the safety check’s own priority report (a Mallow provider’s verdict) keeps it paused too', async () => {
  const w = world({ provider: async () => ({ status: 'support' }) });
  const id = w.release('moon', { allowFallback: true }).journey.id;
  const hold = w.svc.findFeeling(w.T.cloud).offer.holdId;
  w.advance(31 * 60e3);                                            // nobody caught it; the Mallow may be asked
  await w.svc.askMallow(w.T.moon, { journeyId: id });
  assert.equal(paused(w, id), true, 'setup: the provider’s safety verdict pauses it');
  w.svc.reportFeeling(w.T.cloud, { holdId: hold, reason: 'other' });
  const mine = w.svc.modListReports(w.T.mod).reports.find((r) => r.reason === 'other');
  assert.equal(w.svc.modResolve(w.T.mod, { id: mine.id, action: 'resume-feeling' }).paused, true);
  assert.equal(paused(w, id), true, 'a reader’s decision on another report undid the safety check’s pause');
});

test('launch 1: an open report about a perspective on the feeling doesn’t hold the feeling back', () => {
  const w = world();
  const id = w.release('moon').journey.id;
  w.give('cloud', REFRAMES[0]);
  const hold = w.svc.findFeeling(w.T.star).offer.holdId;
  w.svc.reportFeeling(w.T.star, { holdId: hold, reason: 'safety' });   // paused
  w.svc.withdrawFeeling(w.T.moon, { journeyId: id });
  const p = w.svc.getJourney(w.T.moon, { journeyId: id }).collection[0];
  w.svc.reportPerspective(w.T.moon, { journeyId: id, perspectiveId: p.id, reason: 'unkind' });
  const feelingReport = w.svc.modListReports(w.T.mod).reports.find((r) => r.kind === 'feeling');
  assert.equal(w.svc.modResolve(w.T.mod, { id: feelingReport.id, action: 'resume-feeling' }).paused, false);
});

test('launch 1: a dismissal of the last open report lets it carry on too; a feeling a reader acted on stays paused', () => {
  const w = world();
  const id = w.release('moon').journey.id;
  const holds = ['cloud', 'star'].map((k) => w.svc.findFeeling(w.T[k]).offer.holdId);
  w.svc.reportFeeling(w.T.cloud, { holdId: holds[0], reason: 'unkind' });
  w.svc.reportFeeling(w.T.star, { holdId: holds[1], reason: 'harassment' });
  const [r1, r2] = w.svc.modListReports(w.T.mod).reports;
  assert.equal(w.svc.modResolve(w.T.mod, { id: r1.id, action: 'resume-feeling' }).paused, true);
  // "no action" through the API on the last one: it isn't left paused with nothing open (it was, before)
  assert.deepEqual(w.svc.modResolve(w.T.mod, { id: r2.id, action: 'dismiss' }), { id: r2.id, status: 'no-action' });
  assert.equal(paused(w, id), false, 'a dismissal left the feeling paused with no report open');
  // a feeling whose author a reader restricted stays paused, whatever the other report's decision
  const w2 = world();
  const id2 = w2.release('moon').journey.id;
  const h2 = ['cloud', 'star'].map((k) => w2.svc.findFeeling(w2.T[k]).offer.holdId);
  w2.svc.reportFeeling(w2.T.cloud, { holdId: h2[0], reason: 'unkind' });
  w2.svc.reportFeeling(w2.T.star, { holdId: h2[1], reason: 'harassment' });
  const [q1, q2] = w2.svc.modListReports(w2.T.mod).reports;
  w2.svc.modResolve(w2.T.mod, { id: q1.id, action: 'restrict-user' });
  assert.equal(w2.svc.modResolve(w2.T.mod, { id: q2.id, action: 'resume-feeling' }).paused, true);
  assert.equal(w2.svc.getJourney(w2.T.moon, { journeyId: id2 }).paused, true, 'a feeling a reader acted on carried on');
});

// ------------------------------------------------- 2. one decision only --
test('launch 2: a decided report can’t be decided again; the answer says so in words, and nothing changes', () => {
  const w = world();
  const id = w.release('moon').journey.id;
  const hold = w.svc.findFeeling(w.T.cloud).offer.holdId;
  w.svc.reportFeeling(w.T.cloud, { holdId: hold, reason: 'unkind' });
  const rep = w.svc.modListReports(w.T.mod).reports[0];
  assert.deepEqual(w.svc.modResolve(w.T.mod, { id: rep.id, action: 'dismiss', note: 'First reader: fine.' }), { id: rep.id, status: 'no-action' });
  const before = w.svc.modGetReport(w.T.mod, { id: rep.id });
  for (const action of ['remove-feeling', 'restrict-user', 'remove-perspective', 'resume-feeling', 'dismiss', 'nonsense']) {
    let e;
    try { w.svc.modResolve(w.T.mod, { id: rep.id, action, note: 'Second reader: overwrite.' }); } catch (x) { e = x; }
    assert.equal(e?.code, 'already-decided', `${action}: a decided report was decided again`);
    assert.equal(e.message, RELAY_MESSAGES['already-decided']);
  }
  assert.ok(!/request|invalid|forbidden|error|already-decided/i.test(RELAY_MESSAGES['already-decided']), 'plain words, not a code');
  const after = w.svc.modGetReport(w.T.mod, { id: rep.id });
  assert.equal(after.status, 'no-action');
  assert.deepEqual(after.notes, before.notes, 'a note was added to a decided report');
  assert.equal(w.svc.getJourney(w.T.moon, { journeyId: id }).status, 'travelling', 'the feeling was removed by the second decision');
  assert.equal(w.svc.me(w.T.moon).accountState, 'active', 'the author was restricted by the second decision');
  throwsCode(() => w.svc.modResolve(w.T.mod, { id: 'rep_missing0000000', action: 'dismiss' }), 'not-found');
});

// ------------------------------------------- 3. never who reported --
test('launch 3: the desk never sees who reported, in a report or in the activity log; the stored log keeps it', () => {
  const w = world();
  const id = w.release('moon').journey.id;
  const hold = w.svc.findFeeling(w.T.cloud).offer.holdId;
  w.svc.reportFeeling(w.T.cloud, { holdId: hold, reason: 'unkind', details: 'It felt off.' });
  w.give('star', REFRAMES[0]);
  w.svc.withdrawFeeling(w.T.moon, { journeyId: id });
  const p = w.svc.getJourney(w.T.moon, { journeyId: id }).collection[0];
  w.svc.reportPerspective(w.T.moon, { journeyId: id, perspectiveId: p.id, reason: 'harassment' });
  const list = w.svc.modListReports(w.T.mod);
  const views = list.reports.map((r) => w.svc.modGetReport(w.T.mod, { id: r.id }));
  const log = w.svc.modAuditLog(w.T.mod);
  const cloud = accOf(w, 'cloud');
  const moon = accOf(w, 'moon');
  // Cloud only ever reported here: nothing the desk sees names them
  const desk = JSON.stringify([list, views, log]);
  assert.ok(!desk.includes(cloud), 'the desk can see the reporter’s account');
  // Moon reported the perspective: that report, and every report entry in the log, name nobody
  const perspectiveView = views.find((v) => v.kind === 'perspective');
  assert.ok(!JSON.stringify(perspectiveView).includes(moon), 'the perspective report names who reported it');
  const reportEntries = log.entries.filter((e) => e.action.startsWith('report.'));
  assert.equal(reportEntries.length, 2);
  for (const e of reportEntries) assert.equal(e.actor, 'a member', `a report entry names its reporter: ${e.actor}`);
  // the operator's own record is unchanged
  assert.deepEqual(w.svc.s.audit.filter((e) => e.action === 'report.created').map((e) => e.actor), [cloud, moon]);
});

test('launch 3: beside a member’s report, the safety check’s own still says it came from the system', async () => {
  const w = world({ provider: async () => ({ status: 'support' }) });
  const id = w.release('moon', { allowFallback: true }).journey.id;
  const hold = w.svc.findFeeling(w.T.cloud).offer.holdId;
  w.advance(31 * 60e3);
  await w.svc.askMallow(w.T.moon, { journeyId: id });             // the provider's safety verdict: a report from the system
  w.svc.reportFeeling(w.T.cloud, { holdId: hold, reason: 'other' });
  const entries = w.svc.modAuditLog(w.T.mod).entries.filter((e) => e.action === 'report.created');
  assert.deepEqual(entries.map((e) => e.actor), ['system', 'a member']);
});

// ------------------------------------------ 4. what a catcher is sent --
test('launch 4: a catcher is sent the words, the label and the count, never the author’s Mallow', () => {
  const w = world();
  w.release('moon', { mallow: 'glitzi' });
  const want = ['label', 'of', 'perspectivesSoFar', 'text'];
  const { offer } = w.svc.findFeeling(w.T.cloud);
  assert.deepEqual(Object.keys(offer.feeling).sort(), want);
  assert.ok(!JSON.stringify(offer).includes('glitzi'), 'the offer names the author’s Mallow');
  assert.deepEqual(Object.keys(w.svc.catchFeeling(w.T.cloud, { holdId: offer.holdId }).offer.feeling).sort(), want);
  assert.deepEqual(Object.keys(w.svc.findFeeling(w.T.cloud).offer.feeling).sort(), want, 'the current hold, asked for again');
});

// ----------------------------------------------- 5. the 18+ confirmation --
test('launch 5: the personal-data file says when the person confirmed they’re 18 or over', () => {
  let t = Date.UTC(2026, 9, 14, 9);
  const svc = new RelayService({ now: () => t });
  const joined = t;
  const tok = svc.issueSession(svc.createMember({ pseudonym: 'Moonbeam', adult: true }));
  t += 3 * 86400e3;
  const file = svc.exportMyData(tok);
  assert.equal(file.version, 2, 'still version 2: the field only adds');
  assert.equal(file.you.confirmedYouAre18OrOverAt, new Date(joined).toISOString());
  assert.equal(file.you.joinedAt, new Date(joined).toISOString());
  // a lab test identity never confirmed anything: the file says nothing rather than make a date up
  const w = world();
  assert.equal(w.svc.exportMyData(w.T.moon).you.confirmedYouAre18OrOverAt, null);
});

// ---------------------------------------------- 6. "Seems to be under 18" --
test('launch 6: "Seems to be under 18" is a reason at the usual priority, from report to the desk to a decision', () => {
  assert.deepEqual(REPORT_REASONS.find((r) => r.id === 'under18'), { id: 'under18', label: 'Seems to be under 18' });
  assert.ok(REPORT_REASON_IDS.indexOf('under18') < REPORT_REASON_IDS.indexOf('other'), '"Something else" stays last');
  // the member's report sheet offers every reason there is (so this one too), in this order
  const sheet = readFileSync(new URL('../ui/relay/common.js', import.meta.url), 'utf8');
  const body = sheet.slice(sheet.indexOf('export function reportSheet('), sheet.indexOf('export const errorText'));
  assert.match(body, /REPORT_REASONS\.map\(\(r\) => h\('button', \{/);
  const w = world();
  const id = w.release('moon').journey.id;
  const hold = w.svc.findFeeling(w.T.cloud).offer.holdId;
  const got = w.svc.reportFeeling(w.T.cloud, { holdId: hold, reason: 'under18', details: 'They mention year 9.' });
  assert.equal(got.received, true);
  assert.doesNotMatch(got.expectation, /front of the queue|priority/, 'an age concern is answered at the usual priority');
  assert.equal(paused(w, id), false, 'one report at the usual priority doesn’t pause it');
  const listed = w.svc.modListReports(w.T.mod).reports;
  assert.equal(listed.length, 1);
  assert.deepEqual({ reason: listed[0].reason, urgent: listed[0].urgent, status: listed[0].status, kind: listed[0].kind }, { reason: 'under18', urgent: false, status: 'open', kind: 'feeling' });
  const view = w.svc.modGetReport(w.T.mod, { id: listed[0].id });
  assert.equal(view.reason, 'under18');
  assert.equal(view.details, 'They mention year 9.');
  assert.equal(view.evidence.feeling, FEELING);
  // the age steps: restrict the account
  assert.deepEqual(w.svc.modResolve(w.T.mod, { id: view.id, action: 'restrict-user', note: 'age concern' }), { id: view.id, status: 'actioned' });
  assert.equal(w.svc.me(w.T.moon).accountState, 'restricted');
  // the reporter's own file names the reason in words
  assert.equal(w.svc.exportMyData(w.T.cloud).reportsYouMade[0].reason, 'Seems to be under 18');
  // and about a perspective, too
  const b = w.release('cloud', { text: 'I keep replaying what I said in the meeting.' }).journey.id;
  w.give('star', REFRAMES[1]);
  w.svc.withdrawFeeling(w.T.cloud, { journeyId: b });
  const p = w.svc.getJourney(w.T.cloud, { journeyId: b }).collection[0];
  w.svc.reportPerspective(w.T.cloud, { journeyId: b, perspectiveId: p.id, reason: 'under18' });
  const second = w.svc.modListReports(w.T.mod).reports.find((r) => r.kind === 'perspective');
  assert.deepEqual({ reason: second.reason, urgent: second.urgent }, { reason: 'under18', urgent: false });
});
