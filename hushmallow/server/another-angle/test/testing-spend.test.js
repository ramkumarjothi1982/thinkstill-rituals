// Security review (17 Oct 2026): under billing+testing (staging today, and the
// production activation PAYMENTS.md describes), tester sessions and paying
// Beyond subscribers drew on one global DAILY_SPEND_CAP_USD. One tester code
// (leaked or shared) mints a fresh subject per session, so its holder could use
// up the whole day's cap and leave every subscriber on the authored angles
// ('capacity') until 00:00 UTC; and removing that code did not end the
// sessions it had minted while any other code remained. Now testers stop at
// TESTING_SPEND_SHARE of the cap (subscribers may use all of it), and a
// testing session carries a keyed tag of its code, refused once the code is
// removed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { req, angleReq } from './helpers.js';
import { setup, billingEnv, subscribe, TOKEN } from './billing-fixtures.js';
import { readConfig } from '../src/config.js';

const TEXT = 'My colleague got promoted instead of me.';
let ip = 0;
/** A tester's session from a new network, without a device_id (a fresh subject each time, as the review's probe did). */
async function testerSession(s, invite = 'MALLOW-ONE', env = s.env) {
  const r = await s.app.fetch(req('/v1/session', { body: { invite }, headers: { 'cf-connecting-ip': `2001:db8:${(++ip).toString(16)}::1` } }), env);
  assert.equal(r.status, 200, await r.clone().text());
  return (await r.json()).token;
}

test('billing+testing: testers stop at their share of the day’s spending cap, and subscribers still get the model', async () => {
  const env = billingEnv({ ENTITLEMENT_MODE: 'billing+testing', TESTER_INVITE_CODES: 'MALLOW-ONE', DAILY_SPEND_CAP_USD: '1.2' });
  assert.equal(readConfig(env).testingSpendShare, 0.3, 'the default share');
  const s = setup({ env });
  // one code holder: new sessions, angles until the model is refused
  let delivered = 0, capped = false;
  for (let i = 0; i < 40 && !capped; i++) {
    const token = await testerSession(s);
    for (let k = 0; k < 5 && !capped; k++) {
      const j = await (await s.app.fetch(angleReq(token, { text: TEXT }), s.env)).json();
      if (j.status === 'ok') delivered++;
      else { assert.deepEqual([j.status, j.fallback?.reason], ['fallback', 'capacity']); capped = true; }
    }
  }
  assert.ok(capped, 'the testers reach their share');
  assert.ok(delivered > 0, 'testers do get angles');
  // a subscriber, after the testers stopped: still the model, not 'capacity'
  await subscribe(s);
  const ses = await s.app.fetch(req('/v1/session', { body: { device_id: 'device-aaaaaaaaaaaaaaaa' }, headers: { authorization: `Bearer ${TOKEN}` } }), s.env);
  assert.equal(ses.status, 200);
  const sub = await ses.json();
  assert.equal(sub.source, 'billing');
  const a = await (await s.app.fetch(angleReq(sub.token, { text: TEXT }), s.env)).json();
  assert.equal(a.status, 'ok', 'a subscriber keeps the rest of the cap');
  // a share of 1 is the old rule (one cap for everyone); 0 keeps testers off the model entirely
  assert.equal(readConfig(billingEnv({ TESTING_SPEND_SHARE: '1' })).testingSpendShare, 1);
  assert.equal(readConfig(billingEnv({ TESTING_SPEND_SHARE: '7' })).testingSpendShare, 0.3, 'out of range: the default');
  const none = setup({ env: billingEnv({ ENTITLEMENT_MODE: 'billing+testing', TESTER_INVITE_CODES: 'MALLOW-ONE', TESTING_SPEND_SHARE: '0' }) });
  const j = await (await none.app.fetch(angleReq(await testerSession(none), { text: TEXT }), none.env)).json();
  assert.deepEqual([j.status, j.fallback?.reason], ['fallback', 'capacity']);
  // testing mode (no subscribers to keep room for): the whole cap, as before
  const plain = setup({ env: billingEnv({ ENTITLEMENT_MODE: 'testing', TESTER_INVITE_CODES: 'MALLOW-ONE', TESTING_SPEND_SHARE: '0' }) });
  assert.equal((await (await plain.app.fetch(angleReq(await testerSession(plain), { text: TEXT }), plain.env)).json()).status, 'ok');
});

test('billing+testing: removing one leaked tester code ends the sessions it minted; the other codes keep theirs', async () => {
  const both = billingEnv({ ENTITLEMENT_MODE: 'billing+testing', TESTER_INVITE_CODES: 'LEAKED-CODE,MALLOW-ONE' });
  const s = setup({ env: both });
  const leaked = await testerSession(s, 'LEAKED-CODE');
  const kept = await testerSession(s, 'MALLOW-ONE');
  for (const t of [leaked, kept]) assert.equal((await (await s.app.fetch(angleReq(t, { text: TEXT }), both)).json()).status, 'ok');
  // the owner removes the leaked code (a new env: the Worker's next config)
  const after = { ...both, TESTER_INVITE_CODES: 'MALLOW-ONE' };
  const gone = await s.app.fetch(angleReq(leaked, { text: TEXT }), after);
  assert.equal(gone.status, 401);
  assert.equal((await gone.json()).error.code, 'session_superseded');
  const fb = await s.app.fetch(req('/v1/feedback', { body: { rating: 'helped' }, headers: { authorization: `Bearer ${leaked}` } }), after);
  assert.equal(fb.status, 401);
  assert.equal((await (await s.app.fetch(angleReq(kept, { text: TEXT }), after)).json()).status, 'ok', 'the other code’s sessions carry on');
  // and the leaked code mints nothing new
  const again = await s.app.fetch(req('/v1/session', { body: { invite: 'LEAKED-CODE' } }), after);
  assert.equal(again.status, 403);
});
