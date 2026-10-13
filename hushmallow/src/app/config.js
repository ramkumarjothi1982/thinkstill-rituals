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

/** Shown at the bottom of Settings so a tester can tell which version has loaded. */
export const BUILD = '2026-10-12 · the Hushfold slice (high-res Mallows, MallowTouch)';
