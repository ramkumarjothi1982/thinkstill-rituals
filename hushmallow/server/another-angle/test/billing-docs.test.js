// docs/PAYMENTS.md and docs/STAGING.md say what the code does: the webhook's events, the pinned API version, the
// restricted key, the past_due cap, the approval word, the custom domain and its order, and the portal's flows
// (with STRIPE_INTEGRATION_TODO.md and the Worker's README). A change to one of these in the code fails here until
// the docs say the same.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EVENTS, PORTAL_RETURN } from '../src/billing/routes.js';
import { STRIPE_API_VERSION_EXPECTED, BILLING_LIVE_APPROVED } from '../src/config.js';
import { PAST_DUE_GRACE_MS } from '../src/billing/store.js';

const doc = (/** @type {string} */ name) => readFileSync(new URL(`../../../docs/${name}`, import.meta.url), 'utf8');
const PAYMENTS = doc('PAYMENTS.md'), STAGING = doc('STAGING.md');
const TODO = readFileSync(new URL('../../../STRIPE_INTEGRATION_TODO.md', import.meta.url), 'utf8');
const README = readFileSync(new URL('../README.md', import.meta.url), 'utf8');

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
  // D6 is cancel only: an unpaid subscription stays in place with its invoice open
  for (const [name, text] of [['PAYMENTS.md', PAYMENTS], ['STAGING.md', STAGING]]) {
    assert.match(text, /\*\*[Cc]ancel the subscription\*\* \(D6\)/, name);
    assert.doesNotMatch(text, /"Mark as unpaid" (?:is acceptable|also ends access)|cancel \(or unpaid\)|`canceled` or `unpaid`/, `${name}: unpaid is not an answer to D6`);
  }
  for (const [name, text] of [['PAYMENTS.md', PAYMENTS], ['STAGING.md', STAGING]]) {
    assert.ok(text.includes('checkout.hushmallow.com'), name);
    assert.doesNotMatch(text, /within two minutes/, `${name}: the duplicate guards are no longer a two-minute window`);
  }
  // the order: the client release, then DNS, then activation
  const order = /10\. \*\*The custom domain[\s\S]*?1\. First the app release[\s\S]*?2\. Then DNS[\s\S]*?3\. Then activation/;
  assert.match(PAYMENTS, order);
  assert.match(STAGING, /The order is: that client release, then DNS, then activation/);
});

test('the portal: every doc says the same: upgrades confirm and come back (?billing=changed / unchanged), never the home; all four prices in the portal; cancelling stays on Manage subscription', () => {
  const docs = [['PAYMENTS.md', PAYMENTS], ['STAGING.md', STAGING], ['STRIPE_INTEGRATION_TODO.md', TODO], ['README.md', README]];
  for (const [name, text] of docs) {
    for (const x of ['subscription_update_confirm', 'subscription_update`', PORTAL_RETURN.home.slice(1), PORTAL_RETURN.changed.slice(1), PORTAL_RETURN.unchanged.slice(1), 'plan_change_unavailable']) {
      assert.ok(text.includes(x), `${name}: ${x}`);
    }
    // the old fallback to the portal's home is gone everywhere
    assert.doesNotMatch(text, /falling back to the portal's home|the home opens instead|flow: "subscription_update" \| "portal"/, `${name}: no home fallback`);
  }
  // the owner's portal setting: both products, all four prices, switching on; cancellation at the period end (D7)
  for (const [name, text] of docs.slice(0, 3)) {
    assert.match(text, /all four\s+prices/, `${name}: all four prices in the portal`);
    assert.match(text, /[Cc]ancel(?:lations)?\*{0,2}:? (?:on, )?\*\*[Aa]t the end of the billing period\*\*|\*\*cancel at the end of\s+the billing period\*\*/, `${name}: cancel at the period end`);
  }
  // the routes, and every answer the app reads, in the owner guide and the Worker's README
  for (const [name, text] of [['PAYMENTS.md', PAYMENTS], ['README.md', README]]) {
    for (const c of ['payment_issue', 'no_subscription', 'not_updatable', 'change_pending', 'plan_ending', 'already_on_plan', 'not_an_upgrade', 'plan_change_unavailable']) assert.ok(text.includes(`409 ${c}`) || text.includes(`404 ${c}`) || text.includes(`503 ${c}`), `${name}: ${c}`);
    assert.match(text, /"intent": "upgrade"/, name);
    assert.match(text, /"refresh": true/, name);
  }
  assert.match(STAGING, /https:\/\/claude-launch-rc\.hushmallow\.pages\.dev\/\?billing=changed/);
});
