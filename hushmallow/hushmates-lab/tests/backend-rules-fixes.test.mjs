// Regression tests for what the independent rules-and-honesty review found on the real backend
// (each failed before its fix).

import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { backend, FEELING, REFRAMES, cid, PG_URL } from './backend-helpers.mjs';

test('the 30-minute Mallow offer is recorded and charged once, even when the scheduler and the app overlap', async () => {
  const b = await backend();
  try {
    await b.join('moon');
    const r = await b.as('moon').call('submitFeeling', { text: FEELING, consent: true, allowFallback: true, clientId: cid('f') });
    await b.advance(31 * 60e3);
    const db = (await b.sql('select current_database() d'))[0].d;
    const tick = new pg.Client({ connectionString: `${PG_URL}/${db}` });
    await tick.connect();
    try {
      await tick.query('begin');
      await tick.query("select set_config('hushmates.fake_now', $1, true)", [new Date(b.clock.t).toISOString()]);
      await tick.query('select hushmates_api.job_tick()');
      const me = b.as('moon').call('me');                    // the app polling at the same moment
      await new Promise((res) => setTimeout(res, 300));
      await tick.query('commit');
      await me;
    } finally { await tick.end(); }
    const j = await b.as('moon').call('getJourney', { journeyId: r.journey.id });
    assert.equal(j.events.filter((e) => e.type === 'mallow-offer').length, 1, 'offered twice');
    const used = await b.sql("select used from hushmates.usage_daily where kind = 'mallow' and scope <> 'global'");
    assert.ok(used.every((u) => u.used === 1), `charged ${JSON.stringify(used)}`);
  } finally { await b.drop(); }
});

test('a scheduled Mallow is never written for a feeling held for safety, removed, or answered by a person meanwhile', async () => {
  for (const what of ['safety-report', 'answered']) {
    const calls = [];
    const spy = { perspective: async (o) => { calls.push(o.text); return { status: 'ok', text: 'Another way to see it could be that their week has been full.', mallow: o.mallow, source: 'library', model: 'spy' }; } };
    const b = await backend({ mallow: spy });
    try {
      for (const n of ['moon', 'cloud']) await b.join(n);
      const r = await b.as('moon').call('submitFeeling', { text: FEELING, consent: true, allowFallback: true, clientId: cid('f') });
      await b.advance(29 * 60e3);
      const o = (await b.as('cloud').call('findFeeling')).offer;
      await b.advance(2 * 60e3);
      await b.as('moon').call('me');                         // the poll schedules the Mallow
      if (what === 'safety-report') await b.as('cloud').call('reportFeeling', { holdId: o.holdId, reason: 'safety' });
      else {
        await b.as('cloud').call('catchFeeling', { holdId: o.holdId });
        await b.as('cloud').call('submitReframe', { holdId: o.holdId, text: REFRAMES[0], clientId: cid('r') });
      }
      await b.tick();
      assert.equal(calls.length, 0, `${what}: the feeling’s words still went to the Mallow’s writer`);
      const j = await b.as('moon').call('getJourney', { journeyId: r.journey.id });
      assert.ok(!j.collection.some((x) => x.kind === 'mallow'), `${what}: a Mallow perspective appeared`);
    } finally { await b.drop(); }
  }
});

test('the Mallow waits while someone is writing (it isn’t "nobody caught it"); it comes if they let it go', async () => {
  const b = await backend();
  try {
    for (const n of ['moon', 'cloud']) await b.join(n);
    const r = await b.as('moon').call('submitFeeling', { text: FEELING, consent: true, allowFallback: true, clientId: cid('f') });
    await b.advance(25 * 60e3);
    const o = (await b.as('cloud').call('findFeeling')).offer;
    await b.as('cloud').call('catchFeeling', { holdId: o.holdId });
    await b.advance(6 * 60e3);                              // minute 31, still writing
    await b.tick();
    let j = await b.as('moon').call('getJourney', { journeyId: r.journey.id });
    assert.ok(!['ready', 'pending', 'available'].includes(j.fallback.status), `fallback ${j.fallback.status} while someone was writing`);
    await b.advance(11 * 60e3);                             // they didn't write in time: the hold lapses
    await b.tick();
    j = await b.as('moon').call('getJourney', { journeyId: r.journey.id });
    assert.equal(j.fallback.status, 'ready', 'the Mallow never came after the catcher left');
  } finally { await b.drop(); }
});

test('restricting an author ends other people’s holds on their feelings', async () => {
  const b = await backend();
  try {
    for (const n of ['moon', 'cloud', 'star']) await b.join(n);
    await b.join('desk', { role: 'moderator', catching: false });
    const r = await b.as('moon').call('submitFeeling', { text: FEELING, consent: true, clientId: cid('f') });
    const held = (await b.as('cloud').call('findFeeling')).offer;
    const rep = await b.as('star').call('reportFeeling', { holdId: (await b.as('star').call('findFeeling')).offer.holdId, reason: 'unkind' });
    await b.as('desk').call('modResolve', { id: rep.reportId, action: 'restrict-user' });
    const live = await b.sql("select count(*)::int n from hushmates.holds where journey_id = $1 and status in ('offered', 'caught')", [r.journey.id]);
    assert.equal(live[0].n, 0, 'someone still holds the restricted author’s feeling');
    await assert.rejects(b.as('cloud').call('catchFeeling', { holdId: held.holdId }), (e) => ['not-available', 'not-found', 'hold-expired'].includes(e.code));
    assert.equal((await b.sql('select count(*)::int n from hushmates.perspectives'))[0].n, 0);
  } finally { await b.drop(); }
});

test('homecoming is honest when people caught it but their words were taken back; a resent feeling shows its new release time', async () => {
  const b = await backend();
  try {
    for (const n of ['moon', 'cloud']) await b.join(n);
    const r = await b.as('moon').call('submitFeeling', { text: FEELING, consent: true, clientId: cid('f') });
    const o = (await b.as('cloud').call('findFeeling')).offer;
    await b.as('cloud').call('catchFeeling', { holdId: o.holdId });
    const w = await b.as('cloud').call('submitReframe', { holdId: o.holdId, text: REFRAMES[0], clientId: cid('r') });
    await b.as('cloud').call('withdrawPerspective', { perspectiveId: w.perspective.id });
    await b.advance(25 * 3600e3);
    await b.tick();
    const j = await b.as('moon').call('getJourney', { journeyId: r.journey.id });
    assert.equal(j.humanCount, 0);
    assert.equal(j.placesTaken, 1, 'the homecoming can’t tell that someone caught it');
    // another feeling, sent out again: the view carries its new release time
    const r2 = await b.as('moon').call('submitFeeling', { text: 'I keep replaying what I said in the meeting.', consent: true, clientId: cid('f') });
    await b.advance(25 * 3600e3);
    await b.tick();
    await b.as('moon').call('resendJourney', { journeyId: r2.journey.id, clientId: cid('s') });
    const j2 = await b.as('moon').call('getJourney', { journeyId: r2.journey.id });
    assert.equal(j2.releasedAt, b.clock.t, 'the resent feeling shows its first release time');
  } finally { await b.drop(); }
});
