// Races on the real database: many people (and the same person twice) acting at the same
// instant, on separate connections. The rules must hold however the timing falls.

import test from 'node:test';
import assert from 'node:assert/strict';
import { backend, FEELING, REFRAMES, cid } from './backend-helpers.mjs';

const NAMES = ['moon', 'cloud', 'star', 'fern', 'dream', 'pebble', 'ember', 'river', 'maple', 'cedar', 'willow', 'sage'];
const settle = (ps) => Promise.allSettled(ps);

test('races: twelve people looking at once for one feeling never get more than five places', async () => {
  const b = await backend();
  try {
    for (const n of NAMES) await b.join(n);
    const r = await b.as('moon').call('submitFeeling', { text: FEELING, consent: true, clientId: cid('f') });
    const catchers = NAMES.slice(1);
    const finds = await settle(catchers.map((n) => b.as(n).call('findFeeling')));
    const offers = finds.map((f, i) => ({ n: catchers[i], offer: f.value?.offer })).filter((x) => x.offer);
    assert.equal(offers.length, 5, `places handed out: ${offers.length}`);
    await settle(offers.map((x) => b.as(x.n).call('catchFeeling', { holdId: x.offer.holdId })));
    const writes = await settle(offers.map((x, i) => b.as(x.n).call('submitReframe', { holdId: x.offer.holdId, text: REFRAMES[i % 4] + ` (${i})`, clientId: cid('r') })));
    const slots = writes.filter((w) => w.status === 'fulfilled').map((w) => w.value.slot).sort();
    assert.deepEqual(slots, [1, 2, 3, 4, 5]);
    const j = await b.as('moon').call('getJourney', { journeyId: r.journey.id });
    assert.equal(j.status, 'returned');
    assert.equal(j.humanCount, 5);
    assert.equal(j.events.filter((e) => e.type === 'returned').length, 1, 'it came home twice');
    const rows = await b.sql('select count(*)::int n from hushmates.perspectives where journey_id = $1', [r.journey.id]);
    assert.equal(rows[0].n, 5);
  } finally { await b.drop(); }
});

test('races: the same release, perspective and resend sent twice at once are written once', async () => {
  const b = await backend();
  try {
    for (const n of NAMES.slice(0, 3)) await b.join(n);
    const id = cid('f');
    const twice = await settle([0, 1, 2].map(() => b.as('moon').call('submitFeeling', { text: FEELING, consent: true, clientId: id })));
    const ok = twice.filter((x) => x.status === 'fulfilled');
    assert.ok(ok.length >= 1);
    assert.equal(new Set(ok.map((x) => x.value.journey.id)).size, 1, 'two journeys from one release');
    assert.equal((await b.sql('select count(*)::int n from hushmates.journeys'))[0].n, 1);
    const { offer } = await b.as('cloud').call('findFeeling');
    await b.as('cloud').call('catchFeeling', { holdId: offer.holdId });
    const rid = cid('r');
    const writes = await settle([0, 1, 2].map(() => b.as('cloud').call('submitReframe', { holdId: offer.holdId, text: REFRAMES[0], clientId: rid })));
    const done = writes.filter((x) => x.status === 'fulfilled').map((x) => x.value);
    assert.ok(done.length >= 1 && done.every((x) => x.slot === 1));
    assert.equal((await b.sql('select count(*)::int n from hushmates.perspectives'))[0].n, 1, 'the same perspective written twice');
  } finally { await b.drop(); }
});

test('races: one person looking from two devices at once holds one feeling', async () => {
  const b = await backend();
  try {
    for (const n of NAMES.slice(0, 4)) await b.join(n);
    await b.as('moon').call('submitFeeling', { text: FEELING, consent: true, clientId: cid('f') });
    await b.as('star').call('submitFeeling', { text: 'I keep replaying what I said in the meeting.', consent: true, clientId: cid('f') });
    const finds = await settle([0, 1, 2, 3].map(() => b.as('cloud').call('findFeeling')));
    const holds = new Set(finds.filter((f) => f.status === 'fulfilled' && f.value.offer).map((f) => f.value.offer.holdId));
    assert.equal(holds.size, 1, `one person holds ${holds.size} feelings`);
    const live = await b.sql("select count(*)::int n from hushmates.holds where status in ('offered','caught')");
    assert.equal(live[0].n, 1);
  } finally { await b.drop(); }
});

test('races: asking for a Mallow perspective many times at once makes one', async () => {
  let calls = 0;
  const slow = { perspective: async ({ label, mallow }) => { calls += 1; await new Promise((r) => setTimeout(r, 80)); return { status: 'ok', text: `A gentle thought about ${label} from ${mallow}.`, mallow, source: 'library', model: 'stub' }; } };
  const b = await backend({ mallow: slow, settings: { mallow: { autoGenerate: false } } });
  try {
    await b.join('moon');
    const r = await b.as('moon').call('submitFeeling', { text: FEELING, label: 'worry', consent: true, allowFallback: true, clientId: cid('f') });
    await b.advance(31 * 60e3);
    const asks = await settle([0, 1, 2, 3, 4].map(() => b.as('moon').call('askMallow', { journeyId: r.journey.id })));
    assert.ok(asks.every((a) => a.status === 'fulfilled'));
    assert.equal(calls, 1, `the provider was asked ${calls} times`);
    const j = await b.as('moon').call('getJourney', { journeyId: r.journey.id });
    assert.equal(j.fallback.status, 'ready');
    assert.equal((await b.sql('select used from hushmates.usage_daily where scope = $1', ['global']))[0].used, 1, 'the allowance was charged more than once');
  } finally { await b.drop(); }
});

test('races: a single-use invitation redeemed by two people at once lets in one', async () => {
  const b = await backend();
  try {
    const code = await b.invite('RACECODE01');
    const people = [0, 1, 2, 3].map((i) => ({ iss: 'test', sub: `racer-${i}`, provider: 'hushmates' }));
    const tries = await settle(people.map((p, i) => b.gw.call(p, 'redeemInvite', { code, name: `Racer${i}`, adult: true })));
    assert.equal(tries.filter((t) => t.status === 'fulfilled').length, 1);
    assert.ok(tries.filter((t) => t.status === 'rejected').every((t) => t.reason.code === 'invite-invalid'));
    assert.equal((await b.sql('select count(*)::int n from hushmates.members'))[0].n, 1);
    assert.equal((await b.sql('select uses from hushmates.invites'))[0].uses, 1);
  } finally { await b.drop(); }
});

test('races: scheduled jobs running on top of each other bring a feeling home once and write one Mallow perspective', async () => {
  let calls = 0;
  const m = { perspective: async ({ mallow }) => { calls += 1; await new Promise((r) => setTimeout(r, 50)); return { status: 'ok', text: 'A gentle thought for you.', mallow, source: 'library', model: 'stub' }; } };
  const b = await backend({ mallow: m });
  try {
    await b.join('moon');
    const r = await b.as('moon').call('submitFeeling', { text: FEELING, consent: true, allowFallback: true, clientId: cid('f') });
    await b.advance(31 * 60e3);
    await settle([0, 1, 2, 3].map(() => b.tick()));
    assert.equal(calls, 1, `the Mallow was written ${calls} times`);
    await b.advance(24 * 3600e3);
    await settle([0, 1, 2, 3].map(() => b.tick()));
    const j = await b.as('moon').call('getJourney', { journeyId: r.journey.id });
    assert.equal(j.status, 'returned');
    assert.equal(j.events.filter((e) => e.type === 'returned').length, 1, 'it came home more than once');
    assert.equal(j.events.filter((e) => e.type === 'mallow-offer').length, 1);
  } finally { await b.drop(); }
});

test('races: blocking while someone writes never lets their words reach the person who blocked them', async () => {
  const b = await backend();
  try {
    for (const n of NAMES.slice(0, 3)) await b.join(n);
    const a1 = await b.as('moon').call('submitFeeling', { text: FEELING, consent: true, clientId: cid('f') });
    const o1 = (await b.as('cloud').call('findFeeling')).offer;
    await b.as('cloud').call('catchFeeling', { holdId: o1.holdId });
    await b.as('cloud').call('submitReframe', { holdId: o1.holdId, text: REFRAMES[0], clientId: cid('r') });
    await b.as('moon').call('withdrawFeeling', { journeyId: a1.journey.id });
    const pid = (await b.as('moon').call('getJourney', { journeyId: a1.journey.id })).collection[0].id;
    await b.advance(1000);
    const a2 = await b.as('moon').call('submitFeeling', { text: 'I keep replaying what I said in the meeting.', consent: true, clientId: cid('f') });
    const o2 = (await b.as('cloud').call('findFeeling')).offer;
    await b.as('cloud').call('catchFeeling', { holdId: o2.holdId });
    await settle([
      b.as('moon').call('blockContributor', { journeyId: a1.journey.id, perspectiveId: pid }),
      b.as('cloud').call('submitReframe', { holdId: o2.holdId, text: REFRAMES[1], clientId: cid('r') }),
    ]);
    await b.as('moon').call('withdrawFeeling', { journeyId: a2.journey.id }).catch(() => {});
    const j2 = await b.as('moon').call('getJourney', { journeyId: a2.journey.id });
    assert.ok(!j2.collection.some((p) => p.text === REFRAMES[1]), 'a blocked person’s words reached the blocker');
  } finally { await b.drop(); }
});
