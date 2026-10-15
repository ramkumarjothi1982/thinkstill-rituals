// Launch fixes on the real backend (Postgres + the gateway), each a finding from the review of 9012d6f;
// each failed before supabase/migrations/20261016090000_hushmates_launch_fixes.sql. The reference engine's
// side: tests/relay-launch-fixes.test.mjs (and tests/backend-differential.test.mjs compares the two).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { backend, FEELING, REFRAMES, cid, rejects } from './backend-helpers.mjs';
import { RELAY_MESSAGES } from '../core/relay-messages.js';
import { REPORT_REASON_IDS } from '../core/relay-config.js';

const MIGRATION = readFileSync(new URL('../supabase/migrations/20261016090000_hushmates_launch_fixes.sql', import.meta.url), 'utf8');

async function team(b, names = ['moon', 'cloud', 'star', 'fern']) {
  for (const n of names) await b.join(n);
  await b.join('desk', { role: 'moderator', catching: false });
}
const release = (b, who = 'moon', o = {}) => b.as(who).call('submitFeeling', { text: FEELING, label: 'worry', consent: true, clientId: cid('f'), ...o });
const paused = async (b, id) => (await b.as('moon').call('getJourney', { journeyId: id })).paused;
const memberId = async (b, name) => (await b.sql('select id::text from hushmates.members where pseudonym = $1', [name]))[0].id;
const desk = (b) => b.as('desk');

// ------------------------------------------------- 1. "Let it carry on" --
test('launch 1 (backend): "Let it carry on" leaves a feeling paused while a priority report on it is still open', async () => {
  const b = await backend();
  try {
    await team(b);
    const id = (await release(b)).journey.id;
    const a = (await b.as('cloud').call('findFeeling')).offer;
    const s = (await b.as('star').call('findFeeling')).offer;
    await b.as('cloud').call('reportFeeling', { holdId: a.holdId, reason: 'unkind' });
    assert.equal(await paused(b, id), false, 'setup: one ordinary report doesn’t pause it');
    await b.as('star').call('reportFeeling', { holdId: s.holdId, reason: 'safety' });
    assert.equal(await paused(b, id), true, 'setup: a priority report pauses it');
    const reports = (await desk(b).call('modListReports')).reports;
    const ordinary = reports.find((r) => r.reason === 'unkind');
    const priority = reports.find((r) => r.urgent);
    assert.deepEqual(await desk(b).call('modResolve', { id: ordinary.id, action: 'resume-feeling' }), { id: ordinary.id, status: 'no-action', paused: true });
    assert.equal(await paused(b, id), true, 'an ordinary decision undid the pause of a priority report');
    assert.equal((await b.as('fern').call('findFeeling')).offer, null, 'it was offered while a priority report on it was open');
    assert.deepEqual(await desk(b).call('modResolve', { id: priority.id, action: 'resume-feeling' }), { id: priority.id, status: 'no-action', paused: false });
    assert.equal(await paused(b, id), false);
    assert.equal((await b.as('fern').call('findFeeling')).offer?.feeling.text, FEELING, 'it travels again once nothing is waiting');
  } finally { await b.drop(); }
});

test('launch 1 (backend): two ordinary reports, and the safety check’s own priority report, keep it paused until each is decided', async () => {
  const b = await backend({ mallow: { perspective: async () => ({ status: 'support' }) }, settings: { mallow: { autoGenerate: false } } });
  try {
    await team(b);
    // two ordinary reports pause it; resuming one keeps it paused
    const id = (await release(b)).journey.id;
    for (const [who, reason] of [['cloud', 'unkind'], ['star', 'harassment']]) {
      const o = (await b.as(who).call('findFeeling')).offer;
      await b.as(who).call('reportFeeling', { holdId: o.holdId, reason });
    }
    assert.equal(await paused(b, id), true, 'setup: two reports pause it');
    const [r1, r2] = (await desk(b).call('modListReports')).reports;
    assert.equal((await desk(b).call('modResolve', { id: r1.id, action: 'resume-feeling' })).paused, true);
    assert.equal(await paused(b, id), true);
    assert.equal((await desk(b).call('modResolve', { id: r2.id, action: 'resume-feeling' })).paused, false);
    assert.equal(await paused(b, id), false);
    // the Mallow provider's safety verdict raises a priority report of its own (from the system)
    await b.as('moon').call('withdrawFeeling', { journeyId: id });
    const g = (await release(b, 'moon', { allowFallback: true, text: 'I keep replaying what I said in the meeting.' })).journey.id;
    const hold = (await b.as('fern').call('findFeeling')).offer.holdId;
    await b.advance(31 * 60e3);
    await b.as('moon').call('askMallow', { journeyId: g });
    assert.equal(await paused(b, g), true, 'setup: the provider’s safety verdict pauses it');
    await b.as('fern').call('reportFeeling', { holdId: hold, reason: 'other' });
    const mine = (await desk(b).call('modListReports')).reports.find((r) => r.reason === 'other');
    assert.equal((await desk(b).call('modResolve', { id: mine.id, action: 'resume-feeling' })).paused, true);
    assert.equal(await paused(b, g), true, 'a reader’s decision on another report undid the safety check’s pause');
  } finally { await b.drop(); }
});

// ------------------------------------------------- 2. one decision only --
test('launch 2 (backend): a decided report can’t be decided again through the API; nothing about it or the feeling changes', async () => {
  const b = await backend();
  try {
    await team(b);
    const id = (await release(b)).journey.id;
    const o = (await b.as('cloud').call('findFeeling')).offer;
    await b.as('cloud').call('reportFeeling', { holdId: o.holdId, reason: 'unkind' });
    const rep = (await desk(b).call('modListReports')).reports[0];
    await desk(b).call('modResolve', { id: rep.id, action: 'dismiss', note: 'First reader: fine.' });
    const row = async () => (await b.sql('select status, resolved_at, (select count(*)::int from hushmates.report_notes n where n.report_id = r.id) notes from hushmates.reports r where id = $1', [rep.id]))[0];
    const before = await row();
    await b.advance(60e3);
    for (const action of ['remove-feeling', 'restrict-user', 'remove-perspective', 'resume-feeling', 'dismiss', 'nonsense']) {
      const e = await rejects(desk(b).call('modResolve', { id: rep.id, action, note: 'Second reader: overwrite.' }), 'already-decided');
      assert.equal(e.message, RELAY_MESSAGES['already-decided'], `${action}: the refusal isn’t in plain words`);
    }
    assert.deepEqual(await row(), before, 'the status, decision time or notes of a decided report changed');
    assert.equal((await b.as('moon').call('getJourney', { journeyId: id })).status, 'travelling');
    assert.equal((await b.as('moon').call('me')).accountState, 'active');
    const decisions = await b.sql("select count(*)::int n from hushmates.audit_log where action = 'mod.resolve'");
    assert.equal(decisions[0].n, 1, 'a refused decision was logged as made');
  } finally { await b.drop(); }
});

test('launch 2 (backend): two readers deciding the same report at once: one decision stands, the other is told', async () => {
  const b = await backend();
  try {
    await team(b);
    await b.join('desk2', { role: 'moderator', catching: false });
    const id = (await release(b)).journey.id;
    const o = (await b.as('cloud').call('findFeeling')).offer;
    await b.as('cloud').call('reportFeeling', { holdId: o.holdId, reason: 'unkind' });
    const rep = (await desk(b).call('modListReports')).reports[0];
    const out = await Promise.allSettled([
      desk(b).call('modResolve', { id: rep.id, action: 'remove-feeling', note: 'Out.' }),
      b.as('desk2').call('modResolve', { id: rep.id, action: 'resume-feeling', note: 'Fine.' }),
    ]);
    const won = out.filter((x) => x.status === 'fulfilled');
    const lost = out.filter((x) => x.status === 'rejected');
    assert.equal(won.length, 1, JSON.stringify(out.map((x) => x.reason?.code || x.value)));
    assert.equal(lost[0].reason.code, 'already-decided');
    const [r] = await b.sql('select status, (select count(*)::int from hushmates.report_notes n where n.report_id = $1) notes from hushmates.reports where id = $1', [rep.id]);
    assert.equal(r.notes, 1, 'both decisions left a note');
    assert.equal(r.status, won[0].value.status);
    const j = await b.as('moon').call('getJourney', { journeyId: id });
    assert.equal(j.returnReason === 'removed', won[0].value.status === 'actioned', 'the feeling doesn’t match the decision that stood');
  } finally { await b.drop(); }
});

// ------------------------------------------- 3. never who reported --
test('launch 3 (backend): no moderator view names who reported (m_mod_get, m_mod_audit); the stored log keeps it for the operator', async () => {
  const b = await backend();
  try {
    await team(b);
    const id = (await release(b)).journey.id;
    const o = (await b.as('cloud').call('findFeeling')).offer;
    await b.as('cloud').call('reportFeeling', { holdId: o.holdId, reason: 'unkind', details: 'It felt off.' });
    const s = (await b.as('star').call('findFeeling')).offer;
    await b.as('star').call('catchFeeling', { holdId: s.holdId });
    await b.as('star').call('submitReframe', { holdId: s.holdId, text: REFRAMES[0], clientId: cid('r') });
    await b.as('moon').call('withdrawFeeling', { journeyId: id });
    const p = (await b.as('moon').call('getJourney', { journeyId: id })).collection[0];
    await b.as('moon').call('reportPerspective', { journeyId: id, perspectiveId: p.id, reason: 'harassment' });
    const list = await desk(b).call('modListReports');
    const views = [];
    for (const r of list.reports) views.push(await desk(b).call('modGetReport', { id: r.id }));
    const log = await desk(b).call('modAuditLog');
    const cloud = await memberId(b, 'cloud');
    const moon = await memberId(b, 'moon');
    // Cloud only reported here: no report, and no report entry in the log, carries their reference (full or short)
    for (const ref of [cloud, cloud.slice(0, 8)]) {
      assert.ok(!JSON.stringify([list, views]).includes(ref), `a report names who reported it (${ref})`);
      const where = log.entries.filter((e) => JSON.stringify(e).includes(ref)).map((e) => e.action);
      assert.deepEqual(where, ref === cloud ? [] : ['account.created'], `the log links ${ref} to something other than their joining`);
    }
    // Moon reported the perspective: that report names only its subject (the writer), never Moon
    const pv = views.find((v) => v.kind === 'perspective');
    assert.ok(!JSON.stringify(pv).includes(moon) && !JSON.stringify(pv).includes(moon.slice(0, 8)), 'the perspective report names who reported it');
    assert.equal(pv.subjectRef, await memberId(b, 'star'));
    const reportEntries = log.entries.filter((e) => e.action.startsWith('report.'));
    assert.equal(reportEntries.length, 2);
    for (const e of reportEntries) assert.equal(e.actor, 'a member', `a report entry names its reporter: ${e.actor}`);
    // other entries still name accounts by a short reference, as before
    assert.ok(log.entries.some((e) => e.action === 'mod.list-reports' && /^[0-9a-f]{8}$/.test(e.actor)));
    // the operator's own record keeps who reported
    assert.deepEqual((await b.sql("select actor from hushmates.audit_log where action = 'report.created' order by id")).map((x) => x.actor), [cloud, moon]);
  } finally { await b.drop(); }
});

// ------------------------------------------ 4. what a catcher is sent --
test('launch 4 (backend): a catcher’s device is sent the words, the label and the count, never the author’s Mallow', async () => {
  const b = await backend();
  try {
    await team(b);
    await release(b, 'moon', { mallow: 'glitzi' });
    const want = ['label', 'of', 'perspectivesSoFar', 'text'];
    const { offer } = await b.as('cloud').call('findFeeling');
    assert.deepEqual(Object.keys(offer.feeling).sort(), want);
    assert.ok(!JSON.stringify(offer).includes('glitzi'), 'the offer names the author’s Mallow');
    assert.deepEqual(Object.keys((await b.as('cloud').call('catchFeeling', { holdId: offer.holdId })).offer.feeling).sort(), want);
    assert.deepEqual(Object.keys((await b.as('cloud').call('findFeeling')).offer.feeling).sort(), want, 'the current hold, asked for again');
    const [raw] = await b.sql('select hushmates.offer_view(id) v from hushmates.holds');
    assert.deepEqual(Object.keys(raw.v.feeling).sort(), want);
  } finally { await b.drop(); }
});

// ----------------------------------------------- 5. the 18+ confirmation --
test('launch 5 (backend): the personal-data file says when the person confirmed they’re 18 or over (still version 2)', async () => {
  const b = await backend();
  try {
    await b.join('moon');
    await b.advance(3 * 86400e3);
    const file = await b.as('moon').call('exportMyData');
    const [m] = await b.sql("select adult_confirmed_at, created_at from hushmates.members where pseudonym = 'moon'");
    assert.equal(file.version, 2);
    assert.equal(file.you.confirmedYouAre18OrOverAt, new Date(m.adult_confirmed_at).toISOString());
    assert.equal(file.you.joinedAt, new Date(m.created_at).toISOString());
  } finally { await b.drop(); }
});

// ---------------------------------------------- 6. "Seems to be under 18" --
test('launch 6 (backend): "Seems to be under 18", from a report to the desk to a decision, at the usual priority', async () => {
  const b = await backend();
  try {
    await team(b);
    const id = (await release(b)).journey.id;
    const o = (await b.as('cloud').call('findFeeling')).offer;
    const got = await b.as('cloud').call('reportFeeling', { holdId: o.holdId, reason: 'under18', details: 'They mention year 9.' });
    assert.equal(got.received, true);
    assert.doesNotMatch(got.expectation, /front of the queue|priority/, 'an age concern is answered at the usual priority');
    assert.equal(await paused(b, id), false, 'one report at the usual priority doesn’t pause it');
    const listed = (await desk(b).call('modListReports')).reports;
    assert.deepEqual(listed.map((r) => [r.reason, r.urgent, r.status, r.kind]), [['under18', false, 'open', 'feeling']]);
    const view = await desk(b).call('modGetReport', { id: listed[0].id });
    assert.equal(view.reason, 'under18');
    assert.equal(view.details, 'They mention year 9.');
    assert.equal(view.evidence.feeling, FEELING);
    assert.deepEqual(await desk(b).call('modResolve', { id: view.id, action: 'restrict-user', note: 'age concern' }), { id: view.id, status: 'actioned' });
    assert.equal((await b.as('moon').call('me')).accountState, 'restricted');
    assert.equal((await b.as('cloud').call('exportMyData')).reportsYouMade[0].reason, 'Seems to be under 18');
    // about a perspective, too
    const g = (await release(b, 'cloud', { text: 'I keep replaying what I said in the meeting.' })).journey.id;
    const s = (await b.as('star').call('findFeeling')).offer;
    await b.as('star').call('catchFeeling', { holdId: s.holdId });
    await b.as('star').call('submitReframe', { holdId: s.holdId, text: REFRAMES[1], clientId: cid('r') });
    await b.as('cloud').call('withdrawFeeling', { journeyId: g });
    const p = (await b.as('cloud').call('getJourney', { journeyId: g })).collection[0];
    await b.as('cloud').call('reportPerspective', { journeyId: g, perspectiveId: p.id, reason: 'under18' });
    const second = (await desk(b).call('modListReports')).reports.find((r) => r.kind === 'perspective');
    assert.deepEqual([second.reason, second.urgent], ['under18', false]);
    // an unknown reason is still refused, by the rule and by the table itself
    await rejects(b.as('cloud').call('reportFeeling', { holdId: o.holdId, reason: 'nonsense' }), 'invalid');
    const err = await b.sql("insert into hushmates.reports (at, kind, journey_id, reason) values (now(), 'feeling', $1, 'nonsense')", [id]).catch((e) => e);
    assert.equal(err.code, '23514', 'the table took a reason nobody can choose');
  } finally { await b.drop(); }
});

test('launch 6 (backend): the database’s reasons are exactly the app’s, in the rule and in the table', async () => {
  const lists = [...MIGRATION.matchAll(/reason in \(([^)]*)\)/g), ...MIGRATION.matchAll(/'\) not in \(([^)]*)\)/g)]
    .map((m) => m[1].split(',').map((x) => x.trim().replace(/^'|'$/g, '')).sort());
  assert.equal(lists.length, 2, 'the constraint and the rule');
  for (const l of lists) assert.deepEqual(l, [...REPORT_REASON_IDS].sort());
  const b = await backend();
  try {
    const [c] = await b.sql("select pg_get_constraintdef(oid) d from pg_constraint where conname = 'reports_reason_check' and conrelid = 'hushmates.reports'::regclass");
    for (const r of REPORT_REASON_IDS) assert.ok(c.d.includes(`'${r}'`), r);
  } finally { await b.drop(); }
});

test('launch: the migration can be applied again, and changes nothing the second time', async () => {
  const b = await backend();
  try {
    await b.sql(MIGRATION);
    await b.sql(MIGRATION);
    const checks = await b.sql("select count(*)::int n from pg_constraint where conrelid = 'hushmates.reports'::regclass and conname like 'reports_reason%'");
    assert.equal(checks[0].n, 1);
    // still callable as before, by the gateway only (the grants of the functions it replaced are kept)
    const grants = await b.sql("select count(*)::int n from information_schema.routine_privileges where routine_schema = 'hushmates' and grantee in ('PUBLIC', 'anon', 'authenticated')");
    assert.equal(grants[0].n, 0);
    await team(b, ['moon', 'cloud']);
    await release(b);
    const o = (await b.as('cloud').call('findFeeling')).offer;
    assert.ok(!('mallow' in o.feeling));
    await b.as('cloud').call('reportFeeling', { holdId: o.holdId, reason: 'under18' });
    const rep = (await desk(b).call('modListReports')).reports[0];
    await desk(b).call('modResolve', { id: rep.id, action: 'dismiss' });
    await rejects(desk(b).call('modResolve', { id: rep.id, action: 'dismiss' }), 'already-decided');
  } finally { await b.drop(); }
});
