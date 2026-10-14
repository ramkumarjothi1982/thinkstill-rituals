// The operator's side and the spending guard, on the real database: invitations made by the
// admin tool (hashed, expiring, use-limited, revocable), settings, lifting a restriction, the AI
// budget hold under concurrency, the desk's report view, and the safety fixes found in review.

import test from 'node:test';
import assert from 'node:assert/strict';
import { backend, FEELING, REFRAMES, cid, rejects } from './backend-helpers.mjs';
import { createAdmin, newCode, inviteMac } from '../server/admin.mjs';
import { createMallowFor, dbUsage } from '../supabase/functions/_shared/mallow-setup.js';
import { screenReframe } from '../core/feeling-safety.js';

const who = (n) => ({ iss: 'test', sub: `ops-${n}`, provider: 'hushmates' });
const adminOf = (b) => createAdmin({ db: { query: async (sql, params) => ({ rows: await b.sql(sql, params) }) }, crypt: b.crypt, now: () => b.clock.t });

test('admin: invitations are shown once, stored only as a keyed hash, and follow their rules', async () => {
  const b = await backend();
  try {
    const admin = adminOf(b);
    const made = await admin.invite({ count: 3, uses: 2, expiresDays: 7 });
    assert.equal(made.codes.length, 3);
    for (const c of made.codes) assert.match(c, /^[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$/);
    const stored = JSON.stringify(await b.sql('select * from hushmates.invites'));
    for (const c of made.codes) assert.ok(!stored.includes(c) && !stored.includes(c.replace('-', '')), 'a code is stored as it is');
    // two uses, then it's spent
    const [code] = made.codes;
    await b.gw.call(who(1), 'redeemInvite', { code: code.toLowerCase(), name: 'Firstone', adult: true });
    await b.gw.call(who(2), 'redeemInvite', { code, name: 'Secondone', adult: true });
    await rejects(b.gw.call(who(3), 'redeemInvite', { code, name: 'Thirdone', adult: true }), 'invite-invalid');
    // revoked: no use
    assert.deepEqual(await admin.revoke(made.codes[1]), { revoked: true });
    await rejects(b.gw.call(who(4), 'redeemInvite', { code: made.codes[1], name: 'Fourthone', adult: true }), 'invite-invalid');
    // expired: no use
    await b.advance(8 * 86400e3);
    await rejects(b.gw.call(who(5), 'redeemInvite', { code: made.codes[2], name: 'Fifthone', adult: true }), 'invite-invalid');
    // the defaults come from the settings
    await admin.set('invites', { defaultExpiryDays: 2, defaultMaxUses: 1 });
    const d = await admin.invite();
    assert.equal(d.maxUses, 1);
    assert.equal(new Date(d.expires).getTime(), b.clock.t + 2 * 86400e3);
    await assert.rejects(admin.invite({ role: 'owner' }), /member or moderator/);
    await assert.rejects(admin.set('secrets', { x: 1 }), /settings are/);
    assert.equal(await inviteMac(b.crypt, 'abcde-fghjk'), await inviteMac(b.crypt, 'ABCDEFGHJK'), 'case and dashes change the hash');
    assert.notEqual(newCode(), newCode());
  } finally { await b.drop(); }
});

test('admin: settings merge (AI stays off unless switched on), and a team lead can lift a restriction', async () => {
  const b = await backend();
  try {
    const admin = adminOf(b);
    const ai = await admin.set('ai', { monthlyCapAud: 20 });
    assert.equal(ai.enabled, false, 'changing the cap switched AI on');
    assert.equal(ai.monthlyCapAud, 20);
    assert.equal(ai.perMemberDaily, 3, 'merging lost the other settings');
    await b.join('moon');
    await b.join('cloud');
    const r = await b.as('moon').call('submitFeeling', { text: FEELING, consent: true, clientId: cid('f') });
    const { offer } = await b.as('cloud').call('findFeeling');
    await b.as('cloud').call('catchFeeling', { holdId: offer.holdId });
    const member = (await b.sql("select id from hushmates.members where pseudonym = 'cloudxx' or pseudonym = 'cloud'"))[0].id;
    const restricted = await admin.member(member, 'restricted');
    assert.deepEqual([restricted.from, restricted.to], ['active', 'restricted']);
    assert.equal((await b.sql("select count(*)::int n from hushmates.holds where status in ('offered','caught')"))[0].n, 0, 'a restricted person still holds a feeling');
    await rejects(b.as('cloud').call('submitReframe', { holdId: offer.holdId, text: REFRAMES[0], clientId: cid('r') }), 'account-inactive');
    await admin.member(member, 'active');
    // catching stays off until they choose it again
    await rejects(b.as('cloud').call('findFeeling'), 'not-catching');
    await b.as('cloud').call('savePreferences', { catching: true });
    // (the feeling they were holding isn't offered to them again: a new one is)
    await b.as('moon').call('submitFeeling', { text: 'I keep replaying what I said in the meeting.', consent: true, clientId: cid('f') });
    assert.ok((await b.as('cloud').call('findFeeling')).offer, 'after lifting, they can catch again');
    await assert.rejects(admin.member(member, 'owner'), /state is/);
    const audit = await b.sql("select action, detail from hushmates.audit_log where action = 'account.state' order by id");
    assert.equal(audit.length, 2);
    assert.ok(r.journey.id);
  } finally { await b.drop(); }
});

test('AI budget: holds are atomic, so instances asking at once never pass the cap; the switch is read at the moment of the call', async () => {
  const b = await backend({ settings: { ai: { enabled: true, monthlyCapAud: 0.3, perMemberDaily: 100, perDayGlobal: 100, costPerCallAud: 0.1 } } });
  try {
    const usage = dbUsage(b.db);
    const memberId = '00000000-0000-4000-8000-00000000000a';
    const tries = await Promise.all(Array.from({ length: 12 }, () => usage.reserveAi({ memberId, journeyId: null, costAud: 0.1 })));
    assert.equal(tries.filter((t) => t.ok).length, 3, `${tries.filter((t) => t.ok).length} calls fitted in a cap of three`);
    assert.ok(tries.filter((t) => !t.ok).every((t) => t.reason === 'over-budget'));
    // settling a hold records the outcome in place
    const held = tries.find((t) => t.ok);
    await usage.recordAi({ id: held.id, memberId, provider: 'another-angle', model: 'x', costAud: 0.1, status: 'ok', ms: 12 });
    const rows = await b.sql('select status, cost_aud::float c from hushmates.ai_usage order by id');
    assert.equal(rows.length, 3);
    assert.deepEqual(rows.map((r) => r.status).sort(), ['held', 'held', 'ok']);
    assert.equal((await usage.aiSpentThisMonthAud()).toFixed(2), '0.30');
    // switched off in the database: refused at once, whatever an instance still has cached
    await b.db.rpc('admin_set_setting', { p_key: 'ai', p_value: { enabled: false } });
    assert.deepEqual(await usage.reserveAi({ memberId, costAud: 0.1 }), { ok: false, reason: 'disabled' });
    // per person per day
    await b.db.rpc('admin_set_setting', { p_key: 'ai', p_value: { enabled: true, monthlyCapAud: 100, perMemberDaily: 4 } });
    const more = [];
    for (let i = 0; i < 3; i++) more.push(await usage.reserveAi({ memberId, costAud: 0.1 }));
    assert.deepEqual(more.map((m) => m.ok), [true, false, false]);
    assert.equal(more[1].reason, 'member-daily');
  } finally { await b.drop(); }
});

test('the Mallow as deployed: with AI switched on but no provider configured, the free library answers and nothing is spent', async () => {
  const b = await backend({ settings: { ai: { enabled: true, monthlyCapAud: 50 } } });
  try {
    let fetched = 0;
    const mallow = createMallowFor({ db: b.db, env: {}, log: { log() {}, error() {} }, now: () => b.clock.t, fetch: async () => { fetched += 1; throw new Error('no network'); } });
    assert.equal(mallow.aiConfigured, false);
    const r = await mallow.perspective({ text: 'I keep worrying I said the wrong thing to my sister.', label: 'worry', mallow: 'noomi', memberId: '00000000-0000-4000-8000-00000000000b', journeyId: '00000000-0000-4000-8000-00000000000c' });
    assert.equal(r.status, 'ok');
    assert.equal(r.source, 'library');
    assert.equal(fetched, 0);
    assert.equal((await b.sql('select count(*)::int n from hushmates.ai_usage'))[0].n, 0);
  } finally { await b.drop(); }
});

test('the desk: a report shows earlier reports about the same person (never who they are), and the activity log keeps each entry’s name', async () => {
  const b = await backend();
  try {
    for (const n of ['moon', 'cloud', 'star']) await b.join(n);
    await b.join('mod', { role: 'moderator', catching: false });
    const ids = [];
    for (const [i, reporter] of ['cloud', 'star'].entries()) {
      await b.as('moon').call('submitFeeling', { text: `${FEELING} (${i})`, consent: true, clientId: cid('f') });
      const { offer } = await b.as(reporter).call('findFeeling');
      const rep = await b.as(reporter).call('reportFeeling', { holdId: offer.holdId, reason: 'unkind' });
      ids.push(rep.reportId);
      await b.advance(60e3);
    }
    const second = await b.as('mod').call('modGetReport', { id: ids[1] });
    assert.deepEqual(second.subjectHistory, { reports: 1, actioned: 0, restricted: false });
    assert.equal(second.isMallow, false);
    assert.ok(!JSON.stringify(second).includes('moonxx') && !JSON.stringify(second).includes('"moon"'), 'the report names the person');
    await b.as('mod').call('modResolve', { id: ids[1], action: 'restrict-user', note: 'Second unkind feeling.' });
    const log = (await b.as('mod').call('modAuditLog')).entries;
    const resolve = log.find((e) => e.action === 'mod.resolve');
    assert.ok(resolve, 'the decision is logged under another name');
    assert.equal(resolve.decision, 'restrict-user');
    assert.equal((await b.as('mod').call('modGetReport', { id: ids[0] })).subjectHistory.restricted, true);
  } finally { await b.drop(); }
});

test('screening: unkind and diagnosing words are caught with a phone’s curly apostrophes too', () => {
  for (const t of ['You’re so pathetic, honestly.', 'You’re overreacting about this whole thing.', 'Your friend’s definitely a narcissist I think.', 'Honestly they’re a psychopath, cut them off.']) {
    assert.equal(screenReframe(t, { minChars: 8, maxChars: 280 }).ok, false, t);
  }
  for (const t of ['Maybe they’re carrying something you can’t see right now.', 'Could it be that they’re just busy this week?']) {
    const r = screenReframe(t, { minChars: 8, maxChars: 280 });
    assert.equal(r.ok, true, t);
    assert.equal(r.text, t, 'the person’s own words were changed');
  }
});
