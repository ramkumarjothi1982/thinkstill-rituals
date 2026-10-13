// Deployment settings.
//
// Test purchases unlock a plan for free (no store exists in a plain browser).
// They must never be available on the public site, or anyone could unlock
// Hushmallow without paying. List only development / private preview hosts
// here — never the domain your customers use.
export const TEST_PURCHASE_HOSTS = [
  'localhost', '127.0.0.1',
  // TESTING PHASE ONLY: lets anyone with the link unlock plans for free.
  // Remove before launch (nothing is on sale yet).
  'ramkumarjothi1982.github.io',
];

/** Whether the free test-purchase provider may run on this host. */
export function testPurchasesAllowed(loc = globalThis.location) {
  if (!loc || !loc.hostname) return true; // Node tests and tooling
  return TEST_PURCHASE_HOSTS.includes(loc.hostname);
}

// Another Angle (hushmallow Beyond) — our own server (server/another-angle),
// the only place the app sends anything. Empty = Zuzu's authored angles only,
// worked out on the phone (nothing is sent, the consent screen never shows).
// To switch it on, put the Worker's https address here (no trailing slash) and
// its host in ANGLE_ALLOWED_HOSTS, and change the plans copy that says the
// words stay on the phone (tests/beyond.test.mjs holds the two together).
export const ANGLE_ENDPOINT = '';
/** Hosts ANGLE_ENDPOINT may point at (https only), e.g. 'hushmallow-another-angle.<subdomain>.workers.dev'. */
export const ANGLE_ALLOWED_HOSTS = [];

/** Shown at the bottom of Settings so a tester can tell which version has loaded. */
export const BUILD = '2026-10-13 · Hushfold pilot + optional sign-in';
