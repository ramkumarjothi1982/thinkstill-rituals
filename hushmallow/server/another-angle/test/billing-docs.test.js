// docs/PAYMENTS.md and docs/STAGING.md say what the code does: the webhook's events, the pinned API version, the
// restricted key, the past_due cap, the approval word, the custom domain and its order. A change to one of these in
// the code fails here until the docs say the same.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EVENTS } from '../src/billing/routes.js';
import { STRIPE_API_VERSION_EXPECTED, BILLING_LIVE_APPROVED } from '../src/config.js';
import { PAST_DUE_GRACE_MS } from '../src/billing/store.js';

const doc = (/** @type {string} */ name) => readFileSync(new URL(`../../../docs/${name}`, import.meta.url), 'utf8');
const PAYMENTS = doc('PAYMENTS.md'), STAGING = doc('STAGING.md');

test('both docs name exactly the webhook events the Worker handles, and the local `stripe listen` asks for exactly those', () => {
  assert.equal(EVENTS.length, 11);
  for (const [name, text] of [['PAYMENTS.md', PAYMENTS], ['STAGING.md', STAGING]]) {
    for (const e of EVENTS) assert.ok(text.includes(`\`${e}\``), `${name}: ${e}`);
    assert.match(text, /exactly the(?:se)? 11/, `${name}: says the endpoint takes exactly the 11`);
  }
  const listen = /--events ([a-z_.,]+)/.exec(PAYMENTS)?.[1];
  assert.deepEqual(listen?.split(','), [...EVENTS]);
});

test('both docs pin the endpoint to the Worker\'s API version, and neither says any version works', () => {
  for (const [name, text] of [['PAYMENTS.md', PAYMENTS], ['STAGING.md', STAGING]]) {
    assert.ok(text.includes(`\`${STRIPE_API_VERSION_EXPECTED}\``), name);
    assert.doesNotMatch(text, /any API version works/i, name);
  }
});

test('keys: a restricted key with its permissions, a test key never on production, no key or publishable key anywhere', () => {
  // the Worker's restricted key (STAGING.md B8): exactly the permissions it uses
  const table = /### B8\.[\s\S]*?\n\| Resource \| Permission \|\n\|---\|---\|\n((?:\|.*\|\n)+)/.exec(STAGING)?.[1] || '';
  assert.deepEqual(table.trim().split('\n').map((l) => l.split('|').slice(1, 3).map((x) => x.trim().split(' ')[0])), [
    ['Checkout', 'Write'], ['Customer', 'Write'], ['Subscriptions', 'Read'], ['Customers', 'Write'], ['Prices', 'Read'],
  ]);
  for (const p of ['Checkout Sessions: **Write**', 'Customer portal: **Write**', 'Subscriptions: **Read**', 'Customers: **Write**', 'Prices: **Read**']) assert.ok(PAYMENTS.includes(p), p);
  // the production Worker's secrets: the live key only
  const prod = /## 2\. Set the Worker's secrets and vars[\s\S]*?```\n([\s\S]*?)```/.exec(PAYMENTS)?.[1] || '';
  assert.match(prod, /STRIPE_SECRET_KEY\s+# the rk_live_… key/);
  assert.doesNotMatch(prod, /[sr]k_test_/);
  for (const [name, text] of [['PAYMENTS.md', PAYMENTS], ['STAGING.md', STAGING]]) {
    assert.doesNotMatch(text, /\b[spr]k_(?:live|test)_[A-Za-z0-9]{4,}/, `${name}: a Stripe key`);
    assert.doesNotMatch(text, /whsec_[A-Za-z0-9]{4,}|sb_secret_[A-Za-z0-9]|\b(?:acct|we|prod|cus|sub)_[A-Za-z0-9]{6,}/, `${name}: a secret or an id`);
    assert.doesNotMatch(text, /\bprice_(?!…|TODO|misconfigured|not_configured)[A-Za-z0-9]/, `${name}: a price id`);
  }
});

test('the defaults the docs state are the code\'s: the 14-day past_due cap, the approval word, tax off, the custom domain after the client', () => {
  assert.equal(PAST_DUE_GRACE_MS / 86400000, 14);
  assert.match(PAYMENTS, /at most \*\*14 days\*\* from when the subscription first read `past_due`/);
  assert.match(STAGING, /14-day\s+`past_due` cap/);
  assert.equal(BILLING_LIVE_APPROVED, 'approved');
  assert.ok(PAYMENTS.includes('`BILLING_LIVE = "approved"`'));
  assert.match(PAYMENTS, /`STRIPE_AUTOMATIC_TAX` stays `"false"`/);
  assert.match(PAYMENTS, /never "leave the subscription past due"/);
  for (const [name, text] of [['PAYMENTS.md', PAYMENTS], ['STAGING.md', STAGING]]) {
    assert.ok(text.includes('checkout.hushmallow.com'), name);
    assert.doesNotMatch(text, /within two minutes/, `${name}: the duplicate guards are no longer a two-minute window`);
  }
  // the order: the client release, then DNS, then activation
  const order = /10\. \*\*The custom domain[\s\S]*?1\. First the app release[\s\S]*?2\. Then DNS[\s\S]*?3\. Then activation/;
  assert.match(PAYMENTS, order);
  assert.match(STAGING, /The order is: that client release, then DNS, then activation/);
});
