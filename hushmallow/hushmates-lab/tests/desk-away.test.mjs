// The desk-away notice (settings.desk.awayUntil, supabase/migrations/20261015090000_hushmates_tier0.sql) on a
// real database, with the clock pinned either side of a Sydney midnight: a date is read as Sydney's day and
// only as YYYY-MM-DD, never by DateStyle; anything else stored there reads as away with no day (never the
// usual "within a day" while nobody may be reading), and the answer is never empty. server/admin.mjs refuses
// what the database wouldn't read as a day.

import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { backend, FEELING, cid } from './backend-helpers.mjs';
import { createAdmin, deskProblem, sydneyDay, DESK_AWAY_MAX_DAYS } from '../server/admin.mjs';

// Thursday 15 October 2026, daylight time in Sydney (UTC+11): Sydney's midnight is 13:00 UTC
const BEFORE_MIDNIGHT = Date.UTC(2026, 9, 15, 12, 59);   // 11.59 pm Thursday 15 in Sydney (the 15th in UTC too)
const AFTER_MIDNIGHT = Date.UTC(2026, 9, 15, 13, 1);     // 12.01 am Friday 16 in Sydney (still the 15th in UTC)

const USUAL = {
  true: 'Thank you for telling us. This goes to the front of the queue for a person on our safety team. We’re a small team and we’re not here around the clock: during the pilot we aim to read priority reports within a day, and nights, weekends and holidays can take longer. We can’t see who wrote it, so we can’t contact them or send help. If you know someone is in danger right now, call 000. If this has stayed with you, Lifeline is there any time on 13 11 14. Nobody is told who reported.',
  false: 'Thank you for telling us. A person on our safety team will read it. We’re a small team, not here around the clock: during the pilot we aim to read reports within two days. Nobody is told who reported.',
};
const END = (urgent) => `We can’t see who wrote it, so we can’t contact them or send help. If someone is in danger right now, call 000. ${urgent ? 'If this has stayed with you, Lifeline is there any time on 13 11 14. ' : ''}Nobody is told who reported.`;
const AWAY_UNTIL = (day, urgent) => `Thank you for telling us. Our safety team is away until ${day}, so it will be read when we’re back. ${END(urgent)}`;
const AWAY = (urgent) => `Thank you for telling us. Our safety team is away for now and may not be able to read it straight away. It will be read when we’re back. ${END(urgent)}`;

test('hushmates.expectation: the desk-away notice, by Sydney’s day, and only for a YYYY-MM-DD date it can trust', async () => {
  const b = await backend({ start: AFTER_MIDNIGHT });
  // a connection of its own, so its DateStyle and time zone can be set: neither may matter
  const c = new pg.Client({ connectionString: b.url });
  await c.connect();
  try {
    // stored straight into the table, as a mistake made around server/admin.mjs would be
    const store = (value) => c.query("update hushmates.settings set value = $1::jsonb where key = 'desk'", [JSON.stringify(value)]);
    const said = async (urgent) => (await c.query('select hushmates.expectation($1) v', [urgent])).rows[0].v;
    const cases = [
      // [when, stored desk value, what a priority report is told, what any other report is told]
      [AFTER_MIDNIGHT, { awayUntil: null }, USUAL.true, USUAL.false],
      [AFTER_MIDNIGHT, {}, USUAL.true, USUAL.false],
      [AFTER_MIDNIGHT, { awayUntil: '2026-10-14' }, USUAL.true, USUAL.false],                          // past
      [AFTER_MIDNIGHT, { awayUntil: '2026-10-15' }, USUAL.true, USUAL.false],                          // yesterday in Sydney (today in UTC)
      [BEFORE_MIDNIGHT, { awayUntil: '2026-10-15' }, AWAY_UNTIL('Thursday 15 October', true), AWAY_UNTIL('Thursday 15 October', false)],  // today, to its last minute
      [AFTER_MIDNIGHT, { awayUntil: '2026-10-16' }, AWAY_UNTIL('Friday 16 October', true), AWAY_UNTIL('Friday 16 October', false)],      // today
      [AFTER_MIDNIGHT, { awayUntil: '2026-10-17' }, AWAY_UNTIL('Saturday 17 October', true), AWAY_UNTIL('Saturday 17 October', false)],  // tomorrow
      [BEFORE_MIDNIGHT, { awayUntil: '2026-10-16' }, AWAY_UNTIL('Friday 16 October', true), AWAY_UNTIL('Friday 16 October', false)],     // tomorrow
      [AFTER_MIDNIGHT, { awayUntil: '2027-01-14' }, AWAY_UNTIL('Thursday 14 January', true), AWAY_UNTIL('Thursday 14 January', false)],  // 90 days ahead
    ];
    // away, with no day it can trust: never the usual times, never empty
    for (const awayUntil of ['infinity', '-infinity', '29/12/2026', '12/01/2027', '2026-12-29T00:00', 'soon', '', ' 2026-10-17', '2026-02-30', '0000-01-01',
      '2027-01-15', '9999-12-31', 20261229, true, false, { day: '2026-10-17' }, ['2026-10-17']]) cases.push([AFTER_MIDNIGHT, { awayUntil }, AWAY(true), AWAY(false)]);
    // DateStyles that read 12/01/2027 as 1 December and as 12 January; zones a day apart from Sydney's
    for (const [style, zone] of [['ISO, MDY', 'UTC'], ['German, DMY', 'Australia/Perth'], ['SQL, MDY', 'America/Los_Angeles']]) {
      await c.query(`set datestyle = '${style}'`);
      await c.query(`set timezone = '${zone}'`);
      for (const [when, value, urgent, other] of cases) {
        await c.query("select set_config('hushmates.fake_now', $1, false)", [new Date(when).toISOString()]);
        await store(value);
        const at = `${new Date(when).toISOString()} ${JSON.stringify(value)} (${style}, ${zone})`;
        assert.equal(await said(true), urgent, at);
        assert.equal(await said(false), other, at);
        if (urgent !== USUAL.true) for (const words of [await said(true), await said(false)]) assert.ok(!/within a day|within two days/.test(words), at);
      }
    }
    // what reporters really get back, through the gateway
    b.clock.t = AFTER_MIDNIGHT;
    for (const n of ['moon', 'cloud', 'star']) await b.join(n);
    await b.as('moon').call('submitFeeling', { text: FEELING, consent: true, clientId: cid('f') });
    const starHold = (await b.as('star').call('findFeeling')).offer.holdId;
    const cloudHold = (await b.as('cloud').call('findFeeling')).offer.holdId;
    await store({ awayUntil: '2026-10-17' });
    assert.equal((await b.as('star').call('reportFeeling', { holdId: starHold, reason: 'unkind' })).expectation, AWAY_UNTIL('Saturday 17 October', false));
    await store({ awayUntil: '29/12/2026' });
    assert.equal((await b.as('cloud').call('reportFeeling', { holdId: cloudHold, reason: 'safety' })).expectation, AWAY(true));
  } finally { await c.end(); await b.drop(); }
});

test('admin set desk: only null or a real YYYY-MM-DD day, today to 90 days ahead in Sydney, and nothing is stored otherwise', async () => {
  // the rule itself, with the clock either side of Sydney's midnight
  assert.equal(sydneyDay(BEFORE_MIDNIGHT), '2026-10-15');
  assert.equal(sydneyDay(AFTER_MIDNIGHT), '2026-10-16');
  assert.equal(sydneyDay(Date.UTC(2026, 3, 4, 14)), '2026-04-05', 'daylight time ends: midnight is 14:00 UTC again');
  assert.equal(DESK_AWAY_MAX_DAYS, 90);
  for (const [awayUntil, when] of [[null, AFTER_MIDNIGHT], ['2026-10-16', AFTER_MIDNIGHT], ['2026-10-17', AFTER_MIDNIGHT], ['2026-10-15', BEFORE_MIDNIGHT],
    ['2027-01-14', AFTER_MIDNIGHT], ['2027-01-13', BEFORE_MIDNIGHT]]) assert.equal(deskProblem({ awayUntil }, when), null, `${awayUntil} at ${new Date(when).toISOString()}`);
  for (const [awayUntil, why, when = AFTER_MIDNIGHT] of [
    ['29/12/2026', /written YYYY-MM-DD/], ['12/01/2027', /written YYYY-MM-DD/], ['infinity', /written YYYY-MM-DD/], ['soon', /written YYYY-MM-DD/],
    ['', /written YYYY-MM-DD/], ['2026-12-29T00:00', /written YYYY-MM-DD/], [20261229, /written YYYY-MM-DD/], [true, /written YYYY-MM-DD/],
    ['2026-02-30', /isn't a real date/], ['2027-02-29', /isn't a real date/], ['2026-13-01', /isn't a real date/], ['2026-10-00', /isn't a real date/],
    ['2026-10-15', /before today in Sydney \(2026-10-16\)/], ['2026-10-14', /before today/, BEFORE_MIDNIGHT],
    ['2027-01-15', /more than 90 days ahead \(the latest is 2027-01-14\)/], ['2027-01-14', /the latest is 2027-01-13/, BEFORE_MIDNIGHT], ['2028-02-29', /more than 90 days/],
  ]) assert.match(deskProblem({ awayUntil }, when) || '', why, JSON.stringify(awayUntil));
  assert.match(deskProblem({ awayUtil: '2026-12-29' }, AFTER_MIDNIGHT), /only awayUntil \(not awayUtil\)/, 'a misspelt key');
  assert.match(deskProblem({}, AFTER_MIDNIGHT), /only awayUntil/);
  assert.match(deskProblem({ awayUntil: null, note: 'x' }, AFTER_MIDNIGHT), /not note/);

  // through the operator's tool, on a real database: refused before anything is stored, with the reason
  const b = await backend({ start: AFTER_MIDNIGHT });
  const pool = new pg.Pool({ connectionString: b.url, max: 2 });
  try {
    const admin = createAdmin({ db: pool, now: () => AFTER_MIDNIGHT });
    for (const awayUntil of ['29/12/2026', 'infinity', 'soon', '2026-10-15', '2027-01-15']) {
      await assert.rejects(admin.set('desk', { awayUntil }), (e) => /awayUntil/.test(e.message), awayUntil);
      assert.deepEqual((await b.sql("select value from hushmates.settings where key = 'desk'"))[0].value, { awayUntil: null }, `${awayUntil} was stored`);
    }
    await assert.rejects(admin.set('desk', { awayUtil: '2026-12-29' }), /only awayUntil/);
    assert.deepEqual(await admin.set('desk', { awayUntil: '2026-12-29' }), { awayUntil: '2026-12-29' });
    assert.equal((await b.sql('select hushmates.expectation(false) v'))[0].v, AWAY_UNTIL('Tuesday 29 December', false));
    assert.deepEqual(await admin.set('desk', { awayUntil: null }), { awayUntil: null });
    assert.equal((await b.sql('select hushmates.expectation(true) v'))[0].v, USUAL.true);
    // other settings are not held to the desk's rule
    assert.equal((await admin.set('mallow', { autoGenerate: false })).autoGenerate, false);
  } finally { await pool.end(); await b.drop(); }
});
