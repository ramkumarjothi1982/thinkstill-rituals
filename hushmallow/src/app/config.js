// Deployment settings.
//
// Test purchases unlock a plan for free (no store exists in a plain browser).
// They must never be available on the public site, or anyone could unlock
// Hushmallow without paying. List only development / private preview hosts
// here — never the domain your customers use.
export const TEST_PURCHASE_HOSTS = ['localhost', '127.0.0.1'];

/** Whether the free test-purchase provider may run on this host. */
export function testPurchasesAllowed(loc = globalThis.location) {
  if (!loc || !loc.hostname) return true; // Node tests and tooling
  return TEST_PURCHASE_HOSTS.includes(loc.hostname);
}
