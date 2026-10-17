// Security review (17 Oct 2026): two checkouts for one account at the same
// moment (two tabs or two devices) for different plans or periods each read
// the account's last Checkout Session before going to Stripe and each wrote
// its own afterwards, so both new sessions stayed open and payable (and the
// one overwritten was never tracked again): paying both made two
// subscriptions. Now the write is a compare-and-swap in the Billing Durable
// Object: the request that loses expires the session it just made, never hands
// out its address, and answers 409 checkout_in_progress.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { billingClient } from '../src/billing/store.js';
import { upstream, setup, billingReq, lines, assertClean, UID } from './billing-fixtures.js';

const ULTRA_M = { plan: 'ultra', period: 'monthly' };
const PAID_Y = { plan: 'paid', period: 'yearly' };
const post = (s, body) => s.app.fetch(billingReq('/v1/billing/checkout', { body }), s.env);
const open = (s) => [...s.up.sessions.values()].filter((x) => x.status === 'open').map((x) => x.id);
const kept = async (s) => (await billingClient(s.env.BILLING).lastCheckout(UID))?.id ?? null;

/** The app, with Stripe taking `ms` to make a Checkout Session (the window the two requests overlap in). */
function slowStripe(ms = 40) {
  const up = upstream();
  const inner = up.fetch;
  up.fetch = async (url, init = {}) => {
    if ((init.method || 'GET') === 'POST' && new URL(String(url)).pathname === '/v1/checkout/sessions') await new Promise((r) => setTimeout(r, ms));
    return inner(url, init);
  };
  return setup({ up });
}

test('two checkouts at once for different plans: one session open and tracked, the other expired and never handed out', async () => {
  const s = slowStripe();
  const [x, y] = await Promise.all([post(s, ULTRA_M), post(s, PAID_Y)]);
  const answers = [[x.status, (await x.clone().json()).error?.code ?? null], [y.status, (await y.clone().json()).error?.code ?? null]];
  assert.deepEqual(answers.map((a) => a[0]).sort(), [200, 409], JSON.stringify(answers));
  assert.ok(answers.some((a) => a[0] === 409 && a[1] === 'checkout_in_progress'));
  const won = x.status === 200 ? x : y;
  assert.ok((await won.json()).url);
  assert.equal(open(s).length, 1, 'the account never has two sessions it could pay');
  assert.equal(await kept(s), open(s)[0], 'and the open one is the one tracked');
  assert.ok(lines(s.logs).some((l) => l.route === 'checkout' && l.status === 'in_progress' && l.http === 409));
  assertClean(s.logs);
  // trying again (the loser's plan): the tracked session is settled as usual (expired) and one new one is open
  const lost = x.status === 409 ? ULTRA_M : PAID_Y;
  const again = await post(s, lost);
  assert.equal(again.status, 200);
  assert.equal(open(s).length, 1);
  assert.equal(await kept(s), open(s)[0]);
  // a returning account with an open session, two more at once: still one open
  const [p, q] = await Promise.all([post(s, ULTRA_M), post(s, PAID_Y)]);
  assert.deepEqual([p.status, q.status].sort(), [200, 409]);
  assert.equal(open(s).length, 1);
  assert.equal(await kept(s), open(s)[0]);
});

test('two taps for the same plan at once are still one session (Stripe\'s idempotency key), never a conflict', async () => {
  const s = slowStripe();
  const [x, y] = await Promise.all([post(s, ULTRA_M), post(s, ULTRA_M)]);
  assert.deepEqual([x.status, y.status], [200, 200]);
  assert.equal((await x.json()).url, (await y.json()).url);
  assert.equal(s.up.sessions.size, 1);
  assert.equal(open(s).length, 1);
});

test('the Billing object\'s compare-and-swap: written only while the stored session is the one expected', async () => {
  const s = setup();
  const db = billingClient(s.env.BILLING);
  const a = { id: `cs_live_A1${'x'.repeat(12)}`, expires_at: Date.now() + 3600000 };
  const b = { id: `cs_live_A2${'x'.repeat(12)}`, expires_at: Date.now() + 3600000 };
  assert.deepEqual(await db.setCheckout(UID, a, null), { ok: true });
  assert.deepEqual(await db.setCheckout(UID, b, null), { ok: true, conflict: true }, 'another one was stored since');
  assert.equal((await db.lastCheckout(UID)).id, a.id);
  assert.deepEqual(await db.setCheckout(UID, a, null), { ok: true }, 'the same session again is no conflict');
  assert.deepEqual(await db.setCheckout(UID, b, a.id), { ok: true });
  assert.equal((await db.lastCheckout(UID)).id, b.id);
  // without an expectation (older callers), as before
  assert.deepEqual(await db.setCheckout(UID, a), { ok: true });
});
