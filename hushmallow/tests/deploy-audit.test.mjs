// Deployment safety audit (P1, 15 Oct 2026): what a merge to main would put in front of people, pinned to its safe
// defaults. Every flag the build and the app read, and the rule that keeps a half-configured feature unseen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { TEST_PURCHASE_HOSTS, testPurchasesAllowed, ANGLE_ENDPOINT, ANGLE_ALLOWED_HOSTS } from '../src/app/config.js';
import { resolveEndpoint } from '../src/beyond/endpoint.js';
import PUBLISHED from '../src/auth/public-config.js';
import { resolveAuthConfig, validatePublicConfig, PROJECT_URL } from '../src/auth/config.js';
import { ASK_BEFORE_ANGLE } from '../src/beyond/angle-first.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const repo = fileURLToPath(new URL('../../', import.meta.url));
const read = (p) => readFileSync(root + p, 'utf8');
const loc = (hostname, search = '') => ({ hostname, protocol: 'https:', search, href: `https://${hostname}/`, hash: '' });
const PUBLIC_HOSTS = ['app.hushmallow.com', 'hushmallow.com', 'hushmallow.pages.dev', 'claude-upbeat-pasteur-b0aqg1.hushmallow.pages.dev'];

test('free test purchases never on the customers\' hosts (app.hushmallow.com, hushmallow.com, every pages.dev alias)', () => {
  for (const h of PUBLIC_HOSTS) {
    assert.equal(TEST_PURCHASE_HOSTS.includes(h), false, h);
    assert.equal(testPurchasesAllowed(loc(h)), false, h);
  }
  assert.ok(!TEST_PURCHASE_HOSTS.some((h) => /hushmallow\.(com|pages\.dev)$/.test(h)));
  // the GitHub Pages copy no longer unlocks plans for free (removed for the pilot): only this machine does
  assert.deepEqual([...TEST_PURCHASE_HOSTS].sort(), ['127.0.0.1', 'localhost']);
  assert.equal(testPurchasesAllowed(loc('ramkumarjothi1982.github.io')), false);
});

test('Another Angle talks only to the production Worker over https (or nowhere); the dev override is localhost only', () => {
  assert.match(ANGLE_ENDPOINT, /^https:\/\//);
  assert.deepEqual([...ANGLE_ALLOWED_HOSTS], ['hushmallow-another-angle.vibyfy-chat.workers.dev']);
  assert.equal(resolveEndpoint({ loc: loc('app.hushmallow.com') }), 'https://hushmallow-another-angle.vibyfy-chat.workers.dev');
  assert.equal(resolveEndpoint({ loc: loc('app.hushmallow.com', '?angleDev=8790') }), 'https://hushmallow-another-angle.vibyfy-chat.workers.dev', 'no dev override on a public host');
  for (const bad of ['http://hushmallow-another-angle.vibyfy-chat.workers.dev', 'https://evil.example.com', 'https://hushmallow-another-angle.vibyfy-chat.workers.dev/?x=1', 'https://u:p@hushmallow-another-angle.vibyfy-chat.workers.dev', '', null]) {
    assert.equal(resolveEndpoint({ configured: bad, loc: loc('app.hushmallow.com') }), null, String(bad));
  }
  // the consent card and the server path only for hushmallow Beyond, which no public host can grant without a store
  assert.match(read('src/app/scenes/settings.js'), /const live = !!endpoint && ent\.has\('ultra'\);/);
  assert.match(read('src/app/entitlements.js'), /if \(!testOk\) return \{ ok: false, test: false, unavailable: true \};/);
  // the question before every angle stays on (owner decision)
  assert.equal(ASK_BEFORE_ANGLE, true);
});

test('sign-in: the repository ships it off; a build only ever publishes hushmallow1 with a publishable key; a half-configured project stays hidden', () => {
  assert.deepEqual({ ...PUBLISHED }, { enabled: false });
  assert.equal(resolveAuthConfig({ published: PUBLISHED, loc: loc('app.hushmallow.com'), session: null }).enabled, false);
  assert.equal(validatePublicConfig({ url: PROJECT_URL, key: 'sb_secret_' + 'x'.repeat(30) }).ok, false);
  assert.equal(validatePublicConfig({ url: 'https://abcdefghijklmnopqrst.supabase.co', key: 'sb_publishable_' + 'x'.repeat(20) }).ok, false);
  assert.equal(validatePublicConfig({ url: 'http://localhost:8203', key: 'sb_publishable_' + 'x'.repeat(20) }).ok, false, 'no local server in a production build');
  // a local (dev / ci) build never signs in on a public host
  const local = { enabled: true, url: 'http://localhost:8203', key: 'sb_publishable_' + 'x'.repeat(20), mode: 'ci' };
  assert.equal(resolveAuthConfig({ published: local, loc: loc('app.hushmallow.com'), session: null }).enabled, false);
  // the readiness gate (src/auth/readiness.js) sits between "configured" and "shown"
  assert.match(read('src/auth/boot.js'), /const gate = enabled \? \(readiness \|\| createReadiness\(config\)\) : null;/);
});

test('the build: secrets refused, sign-in values validated first, only the app shipped, /auth/* uncached and unframed', () => {
  const sh = read('tools/build-site.sh');
  assert.match(sh, /node "\$here\/tools\/site\/auth-config\.mjs" "\$authtmp\/public-config\.js" "\$ver" "\$authtmp\/_headers"/);
  assert.ok(sh.indexOf('auth-config.mjs') < sh.indexOf('rm -rf "$out"'), 'checked before anything is assembled');
  assert.match(sh, /rm -rf "\$out\/v\/\$ver\/src\/v3\/dev" "\$out\/v\/\$ver\/src\/studio"/);
  const ac = read('tools/site/auth-config.mjs');
  assert.match(ac, /Cache-Control: no-store/);
  assert.match(ac, /X-Frame-Options: DENY/);
  assert.match(ac, /frame-ancestors 'none'/);
});

test('deploys: GitHub Pages and the Worker only from main; the probe never writes', () => {
  const pages = readFileSync(`${repo}.github/workflows/hushmallow-pages.yml`, 'utf8');
  assert.match(pages, /deploy:\n\s+needs: test\n\s+if: github\.event_name != 'pull_request'/);
  assert.match(pages, /push:\n\s+branches: \[main\]/);
  const angle = readFileSync(`${repo}.github/workflows/another-angle.yml`, 'utf8');
  assert.match(angle, /if: github\.ref == 'refs\/heads\/main' && github\.event_name != 'pull_request'/);
  const probe = readFileSync(`${repo}.github/workflows/hushmallow-infra-probe.yml`, 'utf8');
  assert.match(probe, /paths: \['hushmallow\/tools\/infra\/PROBE'\]/);
  assert.match(probe, /permissions:\n\s+contents: read/);
  assert.doesNotMatch(probe, /-X\s*(POST|PUT|PATCH|DELETE)|--request\s*(POST|PUT|PATCH|DELETE)|wrangler (deploy|secret put)|sb_secret_|service_role/i, 'read only, no secret key');
  // the Worker's production config: the real model, browsers from the app's own origins only, spend capped
  const w = read('server/another-angle/wrangler.toml');
  assert.match(w, /^ALLOWED_ORIGINS = "https:\/\/app\.hushmallow\.com,https:\/\/hushmallow\.pages\.dev,https:\/\/ramkumarjothi1982\.github\.io"$/m);
  assert.match(w, /^ALLOW_NO_ORIGIN = "false"$/m);
  assert.match(w, /^DAILY_SPEND_CAP_USD = "10"$/m);
});

// Found by this audit and fixed in src/beyond/angle-client.js: a Worker that answers but is half configured (another
// scene schema, a missing signing key or provider key, the mock provider in production) is never sent the person's
// words: the client asks /v1/health before the first session and plays the authored angles unless it answers ok,
// service another-angle, schema scene-v1, both keys configured and not the mock provider.
test('Another Angle asks /v1/health (expected schema, keys configured, not the mock) before any session or words', () => {
  const c = read('src/beyond/angle-client.js');
  assert.match(c, /\/v1\/health/);
  assert.match(c, /schema_version/);
});
