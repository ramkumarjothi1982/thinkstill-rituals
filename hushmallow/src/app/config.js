// Deployment settings.
//
// Test purchases unlock a plan for free (no store exists in a plain browser).
// They must never be available on the public site, or anyone could unlock
// Hushmallow without paying. List only development / private preview hosts
// here — never the domain your customers use.
export const TEST_PURCHASE_HOSTS = [
  'localhost', '127.0.0.1',
  // (ramkumarjothi1982.github.io was here for the testing phase; removed for the pilot so nobody can unlock
  // Flow or Beyond for free there, nor reach the real model through Another Angle: docs/integration/DECISIONS.md)
];

/** Whether the free test-purchase provider may run on this host. */
export function testPurchasesAllowed(loc = globalThis.location) {
  if (!loc || !loc.hostname) return true; // Node tests and tooling
  return TEST_PURCHASE_HOSTS.includes(loc.hostname);
}

// Another Angle (hushmallow Beyond) — our own server (server/another-angle),
// the only place the app sends anything, and only after the person taps
// Accept on its consent card. Switched on 12 Oct 2026 with the owner's
// approval (docs/integration/DECISIONS.md): the production Cloudflare Worker,
// deployed from main by .github/workflows/another-angle.yml, which accepts
// only the app's own origins (wrangler.toml ALLOWED_ORIGINS: app.hushmallow.com,
// hushmallow.pages.dev, ramkumarjothi1982.github.io; docs/FRAMER.md). Whenever it can't be reached (before its first
// deploy, offline, a timeout), Zuzu's authored angles play on the phone after
// the app's own safety check. Development: ?angleDev=<port> on localhost
// (src/beyond/endpoint.js). To switch the server off, empty both lines (the
// consent card then never shows) and change the plans copy back; the tests in
// tests/beyond.test.mjs and tests/brand.test.mjs follow the endpoint.
export const ANGLE_ENDPOINT = 'https://hushmallow-another-angle.vibyfy-chat.workers.dev';
/** The only hosts ANGLE_ENDPOINT may point at (https, no path tricks): the production Worker. */
export const ANGLE_ALLOWED_HOSTS = ['hushmallow-another-angle.vibyfy-chat.workers.dev'];

// Web subscriptions (hushmallow Flow and hushmallow Beyond on the web): Stripe,
// through the billing routes of the same Worker (server/another-angle
// src/billing/, docs/PAYMENTS.md). OFF while BILLING_PROVIDER is '': the plans
// page, Settings and Another Angle are then exactly as before. To switch on,
// once the Worker's billing is set up: BILLING_PROVIDER = 'stripe' and
// BILLING_ENDPOINT = ANGLE_ENDPOINT (it must be one of ANGLE_ALLOWED_HOSTS).
// The build needs sign-in too: a web plan belongs to an account. The App Store
// app never uses it, and localhost keeps its test purchases unless
// ?billingDev=<port> points at a local server (src/app/billing.js). The tests in
// tests/billing.test.mjs follow these values (off: exactly today's; on: our
// own Worker and prices like 'A$9.99'), so switching on needs no test change.
export const BILLING_PROVIDER = '';
export const BILLING_ENDPOINT = '';
/**
 * The price each plan shows under its button, exactly as set in Stripe (for
 * example 'A$9.99'), by product id. Empty: no price is shown.
 */
export const BILLING_PRICES = Object.freeze({
  'hushmallow.paid.monthly': '', 'hushmallow.paid.yearly': '',
  'hushmallow.ultra.monthly': '', 'hushmallow.ultra.yearly': '',
});

/** Shown at the bottom of Settings so a tester can tell which version has loaded. */
export const BUILD = '2026-10-13 · Hushfold pilot + optional sign-in';
