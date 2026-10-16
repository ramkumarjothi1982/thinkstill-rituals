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
// app never uses it. Development: ?billingDev=<port> on localhost (src/app/billing.js).
// These two are production's switch; a branch preview has its own (Staging, below).
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

// Staging (the owner-approved rehearsal, docs/STAGING.md). A BRANCH PREVIEW
// of the Cloudflare Pages project (https, no port, exactly one DNS label in
// front of ".hushmallow.pages.dev": a branch alias such as claude-launch-rc
// for the branch claude/launch-rc, or a deployment's own hash) talks to the
// STAGING Worker for Another Angle and for billing, and has billing ON there
// (Stripe TEST mode: the staging Worker holds test keys only). Everywhere
// else nothing changes: the production alias hushmallow.pages.dev,
// app.hushmallow.com, the GitHub Pages copy and localhost keep exactly the
// production settings above. A preview never reaches the production Worker
// and production never reaches staging: each only on its own allow-list
// (src/beyond/endpoint.js, src/app/billing.js).
export const PREVIEW_HOST_SUFFIX = '.hushmallow.pages.dev';
export const STAGING_ANGLE_ENDPOINT = 'https://hushmallow-another-angle-staging.vibyfy-chat.workers.dev';
/** The only hosts a preview's endpoints may point at (https, no path tricks): the staging Worker. */
export const STAGING_ALLOWED_HOSTS = ['hushmallow-another-angle-staging.vibyfy-chat.workers.dev'];

/** One DNS label, as Pages writes them: lowercase letters, digits and inner hyphens, at most 63. */
const PREVIEW_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/** Whether this page is a branch preview of the Pages project: https, no port, one label + PREVIEW_HOST_SUFFIX. */
export function isPreviewHost(loc = globalThis.location) {
  if (!loc || typeof loc.hostname !== 'string' || loc.protocol !== 'https:' || (loc.port || '') !== '') return false;
  const host = loc.hostname;
  if (host.length <= PREVIEW_HOST_SUFFIX.length || !host.endsWith(PREVIEW_HOST_SUFFIX)) return false;
  return PREVIEW_LABEL.test(host.slice(0, -PREVIEW_HOST_SUFFIX.length));
}

const PRODUCTION = Object.freeze({
  stage: 'production', angleEndpoint: ANGLE_ENDPOINT, angleAllowedHosts: ANGLE_ALLOWED_HOSTS,
  billingProvider: BILLING_PROVIDER, billingEndpoint: BILLING_ENDPOINT,
});
const STAGING = Object.freeze({
  stage: 'staging', angleEndpoint: STAGING_ANGLE_ENDPOINT, angleAllowedHosts: STAGING_ALLOWED_HOSTS,
  billingProvider: 'stripe', billingEndpoint: STAGING_ANGLE_ENDPOINT,
});

/**
 * What this page talks to: { stage, angleEndpoint, angleAllowedHosts, billingProvider, billingEndpoint }.
 * The staging settings on a branch preview (isPreviewHost), the production ones everywhere else
 * (and in Node, with no location).
 */
export function deploySettings(loc = globalThis.location) {
  return isPreviewHost(loc) ? STAGING : PRODUCTION;
}

/** Shown at the bottom of Settings so a tester can tell which version has loaded. */
export const BUILD = '2026-10-13 · Hushfold pilot + optional sign-in';
