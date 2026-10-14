// Regression tests for what the independent security and privacy review found (each failed before
// its fix), on the real database through the gateway.

import test from 'node:test';
import assert from 'node:assert/strict';
import { backend, FEELING, REFRAMES, cid, rejects } from './backend-helpers.mjs';

const OTHER = 'I keep replaying what I said in the meeting.';
async function catchAndWrite(b, who, text) {
  const { offer } = await b.as(who).call('findFeeling');
  await b.as(who).call('catchFeeling', { holdId: offer.holdId });
  return b.as(who).call('submitReframe', { holdId: offer.holdId, text, clientId: cid('r') });
}

test('deleting your data takes your words out of the safety team’s reports too (the reports stay, wordless)', async () => {
  const b = await backend();
  try {
    for (const n of ['carol', 'alice', 'bobby']) await b.join(n);
    await b.join('mod', { role: 'moderator', catching: false });
    // Carol reports Bobby's perspective on her feeling, with a note of her own
    const carolFeeling = await b.as('carol').call('submitFeeling', { text: FEELING, consent: true, clientId: cid('f') });
    await catchAndWrite(b, 'bobby', REFRAMES[0]);
    await b.as('carol').call('withdrawFeeling', { journeyId: carolFeeling.journey.id });     // home early: now she can read it
    const pid = (await b.as('carol').call('getJourney', { journeyId: carolFeeling.journey.id })).collection[0].id;
    const r1 = await b.as('carol').call('reportPerspective', { journeyId: carolFeeling.journey.id, perspectiveId: pid, reason: 'other', details: 'My private note: I live on Elm Street.' });
    // Alice reports Carol's second feeling
    await b.as('carol').call('submitFeeling', { text: OTHER, consent: true, clientId: cid('f') });
    const { offer } = await b.as('alice').call('findFeeling');
    const r2 = await b.as('alice').call('reportFeeling', { holdId: offer.holdId, reason: 'unkind', details: 'Alice’s own words.' });
    await b.as('carol').call('deleteMyData', { confirm: 'DELETE' });
    const v1 = await b.as('mod').call('modGetReport', { id: r1.reportId });
    const v2 = await b.as('mod').call('modGetReport', { id: r2.reportId });
    assert.equal(v1.details, '', 'Carol’s note survived her deletion');
    assert.equal(v1.evidence.feeling, undefined, 'Carol’s feeling survived in a report she made');
    assert.equal(v1.evidence.perspective, REFRAMES[0], 'Bobby’s reported words were lost (they’re his, and the evidence)');
    assert.equal(v2.evidence.feeling, undefined, 'Carol’s feeling survived in a report about it');
    assert.equal(v2.details, 'Alice’s own words.', 'someone else’s report note was lost');
    const dump = JSON.stringify(await b.sql('select details_enc, evidence from hushmates.reports'));
    for (const enc of dump.match(/hmenc:v1:[^"]+/g) || []) assert.ok(!(await b.crypt.decrypt(enc)).includes('Elm Street'));
  } finally { await b.drop(); }
});

test('a sign-in the provider couldn’t end at deletion is retried by the scheduler until it’s gone', async () => {
  const b = await backend();
  try {
    await b.join('carol');
    // the gateway in the helpers ends sign-ins at once; simulate the provider being down by clearing what it did
    await b.as('carol').call('deleteMyData', { confirm: 'DELETE' });
    assert.equal((await b.sql('select count(*)::int n from hushmates.auth_deletions'))[0].n, 0, 'an ended sign-in stayed queued');
    await b.sql("insert into hushmates.auth_deletions (issuer, subject, created_at) values ('test', 'sub-ghost', now())");
    const before = b.deleted.length;
    await b.tick();
    assert.equal(b.deleted.length, before + 1, 'the scheduler didn’t retry');
    assert.equal((await b.sql('select count(*)::int n from hushmates.auth_deletions'))[0].n, 0);
  } finally { await b.drop(); }
});

test('the request ceiling counts calls that fail, and people without an invitation have one too', async () => {
  const b = await backend({ settings: { limits: { requestsPerMinute: 5 } } });
  try {
    await b.join('carol');
    await b.advance(61e3);                                   // (joining used this minute's calls)
    const codes = [];
    for (let i = 0; i < 8; i++) codes.push(await b.as('carol').call('getJourney', { journeyId: '00000000-0000-4000-8000-000000000000' }).then(() => 'ok', (e) => e.code));
    assert.deepEqual(codes.slice(0, 5), Array(5).fill('not-found'));
    assert.deepEqual(codes.slice(5), Array(3).fill('rate-limited'), 'failing calls weren’t counted');
    const stranger = { iss: 'test', sub: 'sub-stranger', provider: 'hushmates' };
    const tries = [];
    for (let i = 0; i < 7; i++) tries.push(await b.gw.call(stranger, 'me').then(() => 'ok', (e) => e.code));
    assert.equal(tries.filter((t) => t === 'rate-limited').length, 2, 'someone without an invitation has no ceiling');
  } finally { await b.drop(); }
});

test('people sending at the same moment can’t all slip past a limit (releases, guesses)', async () => {
  const b = await backend({ settings: { limits: { maxActiveJourneys: 3 } } });
  try {
    await b.join('carol');
    const sent = await Promise.allSettled(Array.from({ length: 8 }, (_, i) => b.as('carol').call('submitFeeling', { text: `${FEELING} (${i})`, consent: true, clientId: cid('f') })));
    assert.equal(sent.filter((x) => x.status === 'fulfilled').length, 3, 'more feelings travelling than allowed');
    const who = { iss: 'test', sub: 'sub-guesser', provider: 'hushmates' };
    const guesses = await Promise.allSettled(Array.from({ length: 25 }, (_, i) => b.gw.call(who, 'redeemInvite', { code: `GUESS${i}XXX`, name: 'Guesser', adult: true }, { net: 'n1' })));
    const wrong = guesses.filter((g) => g.status === 'rejected' && g.reason.code === 'invite-invalid').length;
    assert.ok(wrong <= 10, `${wrong} wrong guesses were checked at once (the limit is 10)`);
  } finally { await b.drop(); }
});

test('later catchers never see a perspective the owner reported or hid; removed words are erased', async () => {
  const b = await backend();
  try {
    for (const n of ['alice', 'bobby', 'carol']) await b.join(n);
    await b.join('mod', { role: 'moderator', catching: false });
    const r = await b.as('alice').call('submitFeeling', { text: FEELING, consent: true, clientId: cid('f') });
    await catchAndWrite(b, 'bobby', REFRAMES[0]);
    // the owner hides Bobby's words (here: by reporting them, which she can do once she can read them);
    // a catcher writing on the same feeling afterwards must not be shown them
    const pid = (await b.sql('select id from hushmates.perspectives where journey_id = $1', [r.journey.id]))[0].id;
    await b.sql('update hushmates.perspectives set hidden_for_owner = true where id = $1', [pid]);
    const after = await catchAndWrite(b, 'carol', REFRAMES[1]);
    assert.deepEqual(after.earlier, [], 'a perspective its owner hid was shown to the next catcher');
    await b.sql('update hushmates.perspectives set hidden_for_owner = false where id = $1', [pid]);
    await b.as('alice').call('withdrawFeeling', { journeyId: r.journey.id });
    const rep = await b.as('alice').call('reportPerspective', { journeyId: r.journey.id, perspectiveId: pid, reason: 'identifying' });
    const view = await b.as('mod').call('modGetReport', { id: rep.reportId });
    assert.ok(!('by' in view) && !('subject' in view), 'the desk is told who reported it');
    assert.ok(view.evidence.perspective, 'the evidence lost its words');
    await b.as('mod').call('modResolve', { id: rep.reportId, action: 'remove-perspective' });
    const stored = await b.sql('select text_enc, removed from hushmates.perspectives where id = $1', [pid]);
    assert.deepEqual(stored[0], { text_enc: '', removed: true }, 'removed words stayed stored');
    const log = (await b.as('mod').call('modAuditLog')).entries;
    assert.ok(log.every((e) => !/^[0-9a-f-]{36}$/.test(e.actor)), 'the activity log names accounts by full id');
  } finally { await b.drop(); }
});

test('an open report’s words don’t stay forever: retention clears them after its limit', async () => {
  const b = await backend();
  try {
    await b.join('alice');
    await b.join('bobby');
    await b.as('alice').call('submitFeeling', { text: FEELING, consent: true, clientId: cid('f') });
    const { offer } = await b.as('bobby').call('findFeeling');
    const rep = await b.as('bobby').call('reportFeeling', { holdId: offer.holdId, reason: 'other', details: 'A note.' });
    await b.advance(181 * 86400e3);
    await b.gw.retention();
    const row = (await b.sql('select evidence, details_enc, status from hushmates.reports where id = $1', [rep.reportId]))[0];
    assert.deepEqual([row.evidence, row.details_enc, row.status], [{}, '', 'open']);
    await rejects(Promise.reject(Object.assign(new Error('x'), { code: 'x' })), 'x');
  } finally { await b.drop(); }
});
