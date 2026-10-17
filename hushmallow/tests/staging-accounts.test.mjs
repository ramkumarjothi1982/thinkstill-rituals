// Staging accounts (docs/STAGING.md): the branch previews have their OWN Supabase project,
// hushmallow-staging, so a rehearsal's sign-ups never land in production's database.
//   - the host decides the project: a branch preview (src/app/config.js isPreviewHost) accepts ONLY the
//     staging project; every other host (app.hushmallow.com, hushmallow.pages.dev, the GitHub Pages copy,
//     localhost) ONLY production's hushmallow1, exactly as before. Never crossed, either way.
//   - the staging project is the owner's (17 Oct 2026): ref oghzabvkrxsejkkjdsuc, Singapore, its publishable
//     key committed (public). Never production's, and production never names it.
//   - STAGING_PROJECT_REF = '' would be "no staging project": a preview then has sign-in off, exactly like a
//     build without values, and never falls back to production (simulated below on a copy of the modules).
//   - the build (tools/site/auth-config.mjs): a Cloudflare Pages build of a branch other than main
//     (CF_PAGES_BRANCH) may only publish the staging project; main (and every build outside Pages) only
//     production's. Production's values on a branch build are never published: the build publishes the
//     committed staging project instead, with a warning (sign-in off were there no staging project). A
//     branch build given neither value publishes the committed staging project; a production build never does.
//   - the staging Worker's deploy uses the staging secrets, never production's.
// The simulated cases (the placeholder, another staging project) load a copy of the real modules with only the
// STAGING_PROJECT_REF line (and, for another project, the STAGING_PUBLISHABLE_KEY line) changed.
// Run with: node --test tests/
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, copyFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';

import * as realConfig from '../src/auth/config.js';
import * as realBuild from '../tools/site/auth-config.mjs';
import {
  validatePublicConfig, resolveAuthConfig, stageFor, storageKeyFor, classifyKey, PROJECTS, STAGES, DEV_KEY,
  PROJECT_URL, PROJECT_REF, PROJECT_REGION, STAGING_PROJECT_REF, STAGING_PROJECT_URL, STAGING_PROJECT_NAME, STAGING_PROJECT_REGION,
  STAGING_PUBLISHABLE_KEY,
} from '../src/auth/config.js';
import { buildPublicConfig, buildStage, headersFile, stagingDefault, PRODUCTION_BRANCH } from '../tools/site/auth-config.mjs';
import { guardedFetch } from '../src/auth/client.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const repo = fileURLToPath(new URL('../../', import.meta.url));
const read = (p) => readFileSync(root + p, 'utf8');
const KEY = 'sb_publishable_NSv1Liou2yjKjauX09U5qQ_CxwzDuiw';            // production's publishable key (public)
/** The owner's staging project (17 Oct 2026, Singapore): its public values, as the repository must hold them. */
const OWNER_REF = 'oghzabvkrxsejkkjdsuc';
const OWNER_URL = `https://${OWNER_REF}.supabase.co`;
const OWNER_KEY = 'sb_publishable_Sn4YKE3TRTzMkWVN9i45_A_MYYxxirc';
const STAGING_KEY = 'sb_publishable_staging_rehearsal_only_000';          // a made-up staging publishable key
const FAKE_REF = 'hmstagingtest0000000';                                  // a made-up 20-character staging ref
const FAKE_URL = `https://${FAKE_REF}.supabase.co`;
// fake secrets are assembled at run time, so no file ever holds a secret-shaped string
const SECRET = ['sb', 'secret', 'abcdefghijklmnopqrstuvwxyz0123'].join('_');
const jwt = (payload) => `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.c2lnbmF0dXJlLXBhcnQ`;
const loc = (hostname, { protocol = 'https:', search = '', port = '' } = {}) => ({ hostname, protocol, search, port, href: `${protocol}//${hostname}/${search}`, hash: '' });
const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
/** Production's hosts (and this machine's): only hushmallow1, as before. */
const PRODUCTION_HOSTS = ['app.hushmallow.com', 'hushmallow.pages.dev', 'hushmallow.com', 'ramkumarjothi1982.github.io', 'a.b.hushmallow.pages.dev'];
/** Branch previews (one label + .hushmallow.pages.dev): only the staging project. */
const PREVIEWS = ['claude-launch-rc.hushmallow.pages.dev', 'claude-upbeat-pasteur-b0aqg1.hushmallow.pages.dev', '3f9c2a1b.hushmallow.pages.dev', 'main.hushmallow.pages.dev'];
const PROD_PUBLISHED = Object.freeze({ enabled: true, url: PROJECT_URL, key: KEY, mode: 'production' });
const body = (source) => JSON.parse(/Object\.freeze\((\{.*\})\)/.exec(source)[1]);

// ---- a copy of the real modules with the staging ref (and key) changed: the placeholder, another project --
const tmp = mkdtempSync(join(tmpdir(), 'hm-staging-accounts-'));
after(() => rmSync(tmp, { recursive: true, force: true }));
const REF_LINE = /^export const STAGING_PROJECT_REF = '[^']*';$/m;
const KEY_LINE = /^export const STAGING_PUBLISHABLE_KEY = '[^']*';$/m;
/** @param {string} ref '' simulates "no staging project" @param {string} tag @param {{ key?: string }} [o] */
async function withStagingRef(ref, tag, { key } = {}) {
  const dir = join(tmp, tag);
  const files = ['src/auth/config.js', 'src/app/config.js', 'tools/site/auth-config.mjs', 'tools/site/security-headers.mjs', 'index.html', 'auth/callback/index.html'];
  for (const f of files) { mkdirSync(dirname(join(dir, f)), { recursive: true }); copyFileSync(root + f, join(dir, f)); }
  let src = read('src/auth/config.js');
  assert.equal(src.split(REF_LINE).length, 2, 'the STAGING_PROJECT_REF line is there exactly once');
  assert.equal(src.split(KEY_LINE).length, 2, 'the STAGING_PUBLISHABLE_KEY line is there exactly once');
  src = src.replace(REF_LINE, `export const STAGING_PROJECT_REF = '${ref}';`);
  if (key !== undefined) src = src.replace(KEY_LINE, `export const STAGING_PUBLISHABLE_KEY = '${key}';`);
  writeFileSync(join(dir, 'src/auth/config.js'), src);
  return {
    config: await import(pathToFileURL(join(dir, 'src/auth/config.js')).href),
    build: await import(pathToFileURL(join(dir, 'tools/site/auth-config.mjs')).href),
  };
}
/** The repository's own modules, and a copy naming another (made-up) staging project: the same rules hold for both. */
const projects = async (tag) => [
  { what: 'the owner\'s project (the repository)', config: realConfig, build: realBuild, ref: OWNER_REF, url: OWNER_URL, key: OWNER_KEY },
  { what: 'another staging project (simulated)', ...(await withStagingRef(FAKE_REF, `other-${tag}`, { key: STAGING_KEY })), ref: FAKE_REF, url: FAKE_URL, key: STAGING_KEY },
];

// ------------------------------------------------------------ the constants --
test('the staging project is the owner\'s (17 Oct 2026): ref oghzabvkrxsejkkjdsuc, Singapore, its publishable key; never production\'s', () => {
  assert.equal(STAGING_PROJECT_NAME, 'hushmallow-staging', 'this code\'s label (the dashboard name may differ)');
  assert.equal(STAGING_PROJECT_REGION, 'ap-southeast-1', 'Singapore');
  assert.deepEqual([...STAGES], ['production', 'staging']);
  assert.equal(STAGING_PROJECT_REF, OWNER_REF);
  assert.equal(STAGING_PROJECT_URL, OWNER_URL);
  assert.equal(STAGING_PUBLISHABLE_KEY, OWNER_KEY);
  assert.equal(classifyKey(STAGING_PUBLISHABLE_KEY), 'publishable', 'a publishable key (public), never a secret');
  assert.deepEqual({ ...PROJECTS.staging }, { stage: 'staging', name: 'hushmallow-staging', ref: OWNER_REF, region: 'ap-southeast-1', url: OWNER_URL });
  // the two stages share nothing: ref, URL, key, region
  assert.notEqual(STAGING_PROJECT_REF, PROJECT_REF);
  assert.notEqual(STAGING_PROJECT_URL, PROJECT_URL);
  assert.notEqual(STAGING_PUBLISHABLE_KEY, KEY);
  assert.notEqual(STAGING_PROJECT_REGION, PROJECT_REGION);
  // no production value in the staging constants, and the staging ref in no production one
  const src = read('src/auth/config.js');
  const staging = src.split('\n').filter((l) => /^export const STAGING_/.test(l)).join('\n');
  assert.equal(staging.split('\n').length, 5, staging);
  for (const x of [PROJECT_REF, KEY, 'ap-southeast-2', 'hushmallow1']) assert.ok(!staging.includes(x), x);
  const production = src.split('\n').filter((l) => /^export const PROJECT_/.test(l)).join('\n');
  for (const x of [OWNER_REF, OWNER_KEY, 'ap-southeast-1']) assert.ok(!production.includes(x), x);
  assert.match(src, /PUBLIC by design, like production's, and safe to commit/);
  // production is exactly as before
  assert.deepEqual({ ...PROJECTS.production }, { stage: 'production', name: 'hushmallow1', ref: 'igbxbfuaoybfzsroxuln', region: 'ap-southeast-2', url: 'https://igbxbfuaoybfzsroxuln.supabase.co' });
  assert.ok(Object.isFrozen(PROJECTS) && Object.isFrozen(PROJECTS.staging) && Object.isFrozen(PROJECTS.production));
});

test('a staging ref that is not a ref, or is production\'s, counts as the placeholder', async () => {
  for (const [bad, tag] of [[PROJECT_REF, 'is-prod'], ['TOO-short', 'short'], ['HMSTAGINGTEST0000000', 'upper'], [`${FAKE_REF}x`, 'long']]) {
    const { config } = await withStagingRef(bad, `bad-${tag}`);
    assert.equal(config.STAGING_PROJECT_URL, '', bad);
    assert.equal(config.PROJECTS.staging.ref, '', bad);
    assert.equal(config.resolveAuthConfig({ published: PROD_PUBLISHED, loc: loc(PREVIEWS[0]), session: mem() }).enabled, false, `${bad}: a preview never takes production`);
    assert.equal(config.resolveAuthConfig({ published: PROD_PUBLISHED, loc: loc('app.hushmallow.com'), session: mem() }).enabled, true, `${bad}: production unchanged`);
  }
});

// ------------------------------------------------------- host → project --
test('stageFor: a branch preview is staging; production\'s hosts, localhost and Node are production', () => {
  for (const h of PREVIEWS) assert.equal(stageFor(loc(h)), 'staging', h);
  for (const h of PRODUCTION_HOSTS) assert.equal(stageFor(loc(h)), 'production', h);
  assert.equal(stageFor(loc('localhost', { protocol: 'http:' })), 'production');
  assert.equal(stageFor(loc('127.0.0.1', { protocol: 'http:' })), 'production');
  assert.equal(stageFor(loc(PREVIEWS[0], { protocol: 'http:' })), 'production', 'http is not a preview');
  assert.equal(stageFor(loc(PREVIEWS[0], { port: '8443' })), 'production', 'a port is not a preview');
  assert.equal(stageFor(null), 'production');
  assert.equal(stageFor(), 'production', 'Node: production');
});

test('no staging project (simulated: STAGING_PROJECT_REF \'\'): a preview has sign-in OFF, never production\'s; production\'s hosts keep hushmallow1 exactly as before', async () => {
  const { config } = await withStagingRef('', 'placeholder');
  assert.deepEqual([config.STAGING_PROJECT_URL, config.PROJECTS.staging.ref, config.PROJECTS.staging.url], ['', '', '']);
  for (const h of PRODUCTION_HOSTS) {
    const c = config.resolveAuthConfig({ published: PROD_PUBLISHED, loc: loc(h), session: mem() });
    assert.deepEqual({ ...c }, { enabled: true, reason: 'configured', url: PROJECT_URL, key: KEY, ref: PROJECT_REF, mode: 'production', storageKey: 'sb-igbxbfuaoybfzsroxuln-auth-token', dev: false }, h);
  }
  for (const h of PREVIEWS) {
    const c = config.resolveAuthConfig({ published: PROD_PUBLISHED, loc: loc(h), session: mem() });
    assert.deepEqual({ ...c }, { enabled: false, reason: 'no-staging-project', url: null, key: null, ref: null, mode: null, storageKey: null, dev: false }, h);
    // exactly like a build without values
    assert.equal(config.resolveAuthConfig({ published: { enabled: false }, loc: loc(h), session: mem() }).enabled, false);
    // any other hosted project too, the owner's included
    assert.equal(config.resolveAuthConfig({ published: { ...PROD_PUBLISHED, url: FAKE_URL }, loc: loc(h), session: mem() }).enabled, false, h);
    assert.equal(config.resolveAuthConfig({ published: { enabled: true, url: OWNER_URL, key: OWNER_KEY, mode: 'production' }, loc: loc(h), session: mem() }).enabled, false, h);
  }
  // the build-time check says the same, in words for the log
  assert.match(config.validatePublicConfig({ url: PROJECT_URL, key: KEY, stage: 'staging' }).error, /production project hushmallow1 .*may only use the staging project hushmallow-staging, never production/);
  assert.match(config.validatePublicConfig({ url: FAKE_URL, key: KEY, stage: 'staging' }).error, /no staging project yet .*STAGING_PROJECT_REF is still the placeholder/);
  assert.match(config.validatePublicConfig({ url: PROJECT_URL, key: KEY, stage: 'nowhere' }).error, /stage must be "production" or "staging"/);
  // production's checks are word for word as before
  assert.equal(config.validatePublicConfig({ url: PROJECT_URL, key: KEY }).ok, true);
  assert.deepEqual(config.validatePublicConfig({ url: PROJECT_URL, key: KEY }), validatePublicConfig({ url: PROJECT_URL, key: KEY, stage: 'production' }));
  assert.match(config.validatePublicConfig({ url: FAKE_URL, key: KEY }).error, /not hushmallow1/);
});

test('the repository today: a preview with production\'s values is refused (sign-in off), never a fall-back; production\'s hosts keep hushmallow1 exactly as before', () => {
  for (const h of PRODUCTION_HOSTS) {
    const c = resolveAuthConfig({ published: PROD_PUBLISHED, loc: loc(h), session: mem() });
    assert.deepEqual({ ...c }, { enabled: true, reason: 'configured', url: PROJECT_URL, key: KEY, ref: PROJECT_REF, mode: 'production', storageKey: 'sb-igbxbfuaoybfzsroxuln-auth-token', dev: false }, h);
  }
  for (const h of PREVIEWS) {
    const c = resolveAuthConfig({ published: PROD_PUBLISHED, loc: loc(h), session: mem() });
    assert.deepEqual({ ...c }, { enabled: false, reason: 'invalid', url: null, key: null, ref: null, mode: null, storageKey: null, dev: false }, h);
    assert.equal(resolveAuthConfig({ published: { enabled: false }, loc: loc(h), session: mem() }).enabled, false);
  }
  assert.match(validatePublicConfig({ url: PROJECT_URL, key: KEY, stage: 'staging' }).error, /production project hushmallow1 .*may only use the staging project hushmallow-staging, never production: remove SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY from the Preview environment/);
  assert.match(validatePublicConfig({ url: FAKE_URL, key: KEY, stage: 'staging' }).error, new RegExp(`not hushmallow-staging \\(${OWNER_REF}\\)`));
  assert.equal(validatePublicConfig({ url: OWNER_URL, key: OWNER_KEY, stage: 'staging' }).ok, true);
  assert.match(validatePublicConfig({ url: OWNER_URL, key: OWNER_KEY }).error, /not hushmallow1/, 'production never takes the staging project');
});

test('a staging project: a preview accepts ONLY it; production\'s hosts accept ONLY hushmallow1; never crossed (the owner\'s, and another one simulated)', async () => {
  for (const { what, config, ref: sRef, url: sUrl, key: sKey } of await projects('set')) {
    assert.equal(config.STAGING_PROJECT_URL, sUrl, what);
    assert.deepEqual({ ...config.PROJECTS.staging }, { stage: 'staging', name: 'hushmallow-staging', ref: sRef, region: 'ap-southeast-1', url: sUrl }, what);
    const staging = { enabled: true, url: sUrl, key: sKey, mode: 'production' };
    for (const h of PREVIEWS) {
      const c = config.resolveAuthConfig({ published: staging, loc: loc(h), session: mem() });
      assert.deepEqual({ ...c }, { enabled: true, reason: 'configured', url: sUrl, key: sKey, ref: sRef, mode: 'production', storageKey: `sb-${sRef}-auth-token`, dev: false }, h);
      // a production URL on a preview: refused (sign-in off), never a fall-back
      assert.equal(config.resolveAuthConfig({ published: PROD_PUBLISHED, loc: loc(h), session: mem() }).reason, 'invalid', h);
      assert.equal(config.resolveAuthConfig({ published: { ...staging, url: `${sUrl}/` }, loc: loc(h), session: mem() }).url, sUrl, 'a trailing slash is normalised');
      // the refusals that hold everywhere still hold on a preview
      for (const key of [SECRET, jwt({ role: 'service_role' }), jwt({ role: 'anon' }), 'hello']) assert.equal(config.resolveAuthConfig({ published: { ...staging, key }, loc: loc(h), session: mem() }).enabled, false, key.slice(0, 12));
      assert.equal(config.resolveAuthConfig({ published: { ...staging, url: 'https://abcdefghijklmnopqrst.supabase.co' }, loc: loc(h), session: mem() }).enabled, false, 'no third project');
      assert.equal(config.resolveAuthConfig({ published: { enabled: true, url: 'http://localhost:8203', key: DEV_KEY, mode: 'dev' }, loc: loc(h), session: mem() }).enabled, false, 'a local build never on a preview');
    }
    for (const h of PRODUCTION_HOSTS) {
      // the staging URL on production: refused (sign-in off)
      assert.equal(config.resolveAuthConfig({ published: staging, loc: loc(h), session: mem() }).enabled, false, h);
      assert.equal(config.resolveAuthConfig({ published: PROD_PUBLISHED, loc: loc(h), session: mem() }).url, PROJECT_URL, h);
    }
    // localhost: production's rules, and the dev override, exactly as before
    const local = loc('localhost', { protocol: 'http:' });
    assert.equal(config.resolveAuthConfig({ published: staging, loc: local, session: mem() }).enabled, false, 'staging values on localhost: off');
    assert.equal(config.resolveAuthConfig({ published: { enabled: true, url: 'http://localhost:8203', key: DEV_KEY, mode: 'ci' }, loc: local, session: mem() }).enabled, true, 'the CI fake stack');
    assert.equal(config.resolveAuthConfig({ published: { enabled: false }, loc: loc('localhost', { protocol: 'http:', search: '?authDev=8203' }), session: mem() }).url, 'http://localhost:8203');
    // the build-time messages name the right project
    assert.match(config.validatePublicConfig({ url: 'https://abcdefghijklmnopqrst.supabase.co', key: sKey, stage: 'staging' }).error, new RegExp(`not hushmallow-staging \\(${sRef}\\)`));
    assert.match(config.validatePublicConfig({ url: sUrl, key: sKey }).error, /not hushmallow1/);
    assert.match(config.validatePublicConfig({ url: sUrl, key: jwt({ role: 'anon' }), stage: 'staging' }).error, /publishable key/);
  }
});

test('the guarded fetch only reaches the project for this host', async () => {
  for (const { config, url: sUrl, key: sKey } of await projects('fetch')) {
    const realFetch = globalThis.fetch;
    const seen = [];
    globalThis.fetch = async (url) => { seen.push(String(url)); return new Response('{}'); };
    try {
      // a preview: the staging project, never production
      const p = config.resolveAuthConfig({ published: { enabled: true, url: sUrl, key: sKey, mode: 'production' }, loc: loc(PREVIEWS[0]), session: mem() });
      const fp = guardedFetch(new URL(p.url).origin, `https://${PREVIEWS[0]}/`);
      await fp(`${sUrl}/auth/v1/user`);
      await assert.rejects(fp(`${PROJECT_URL}/auth/v1/user`), /blocked/);
      // production: hushmallow1, never staging
      const c = config.resolveAuthConfig({ published: PROD_PUBLISHED, loc: loc('app.hushmallow.com'), session: mem() });
      const fc = guardedFetch(new URL(c.url).origin, 'https://app.hushmallow.com/');
      await fc(`${PROJECT_URL}/auth/v1/user`);
      await assert.rejects(fc(`${sUrl}/auth/v1/user`), /blocked/);
      assert.deepEqual(seen, [`${sUrl}/auth/v1/user`, `${PROJECT_URL}/auth/v1/user`]);
    } finally { globalThis.fetch = realFetch; }
  }
  // the client builds its fetch from the resolved url only (no other project is ever named there)
  const client = read('src/auth/client.js');
  assert.equal(client.match(/global: \{ fetch: guardedFetch\(new URL\(config\.url\)\.origin\) \}/g).length, 2);
  assert.doesNotMatch(client, /supabase\.co/);
});

test('/auth/callback on a preview uses the staging project (its email links come back to the preview)', () => {
  // the page resolves its config from its own location, like the app
  assert.match(read('src/auth/callback.js'), /const config = resolveAuthConfig\(\{ published: PUBLISHED \}\);/);
  assert.match(read('src/auth/config.js'), /export function resolveAuthConfig\(\{ published = null, loc = globalThis\.location, session = safeSession\(\) \} = \{\}\)/);
  // and its links: the templates build on {{ .SiteURL }}, which the staging project sets to the preview's origin
  for (const f of ['confirmation', 'recovery', 'email_change', 'magic_link']) assert.match(read(`supabase/templates/${f}.html`), /\{\{ \.SiteURL \}\}\/auth\/callback\?token_hash=\{\{ \.TokenHash \}\}/, f);
  const doc = read('docs/STAGING.md');
  assert.ok(doc.includes('**Site URL**: `https://claude-launch-rc.hushmallow.pages.dev`'), 'the staging Site URL is the preview origin');
  assert.ok(doc.includes('`https://claude-launch-rc.hushmallow.pages.dev/auth/callback`'));
  assert.ok(doc.includes('`https://claude-launch-rc.hushmallow.pages.dev/auth/callback/`'));
  // the owner's steps for this project: its facts, the staging copies of production's SQL run where the address bar
  // shows its ref (35 checks), the Email provider on, and Preview without production's values
  for (const x of ['`https://oghzabvkrxsejkkjdsuc.supabase.co`', `\`${OWNER_KEY}\``, 'Singapore (`ap-southeast-1`)', '**`/project/oghzabvkrxsejkkjdsuc`**',
    'Paste the whole of `supabase/staging/ALL_MIGRATIONS.sql`', 'Paste the whole of `supabase/staging/RLS_CHECK.sql`',
    '**`ALL 35 CHECKS PASSED. Everything this script created was rolled back.`**', 'the Email provider **on**',
    '**Delete** both `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`']) assert.ok(doc.includes(x), x);
  assert.ok(doc.indexOf('ALL_MIGRATIONS.sql`. The role') < doc.indexOf('RLS_CHECK.sql` (the staging bundle'), 'the migrations first, then the check');
  assert.doesNotMatch(doc, /STAGING_TODO|sb_publishable_TODO|STAGING_PROJECT_REF`, today the placeholder/);
});

// ---------------------------------------------------------- the build guard --
test('buildStage: a Cloudflare Pages build of any branch but main is staging; main and every build outside Pages are production', () => {
  assert.equal(PRODUCTION_BRANCH, 'main');
  assert.equal(buildStage({}), 'production', 'GitHub Pages, CI, this machine');
  assert.equal(buildStage({ CF_PAGES_BRANCH: '' }), 'production');
  assert.equal(buildStage({ CF_PAGES_BRANCH: 'main' }), 'production');
  assert.equal(buildStage({ CF_PAGES_BRANCH: ' main\n' }), 'production');
  for (const b of ['claude/launch-rc', 'claude/upbeat-pasteur-b0aqg1', 'Main', 'main2', 'feature/main', 'staging']) assert.equal(buildStage({ CF_PAGES_BRANCH: b }), 'staging', b);
});

test('the build: main and builds outside Pages publish hushmallow1 exactly as before; a branch build never publishes production', async () => {
  const env = { SUPABASE_URL: PROJECT_URL, SUPABASE_PUBLISHABLE_KEY: KEY };
  const before = buildPublicConfig(env, { version: 'abc123' });
  const main = buildPublicConfig({ ...env, CF_PAGES_BRANCH: 'main' }, { version: 'abc123' });
  for (const r of [before, main]) {
    assert.equal(r.ok, true);
    assert.equal(r.stage, 'production');
    assert.deepEqual(body(r.source), { enabled: true, url: PROJECT_URL, key: KEY, mode: 'production' });
    assert.equal(r.summary, `sign-in on: ${PROJECT_URL} (production), key sb_publishable_… [publishable]`);
    assert.equal(r.warning, undefined);
    assert.ok(!r.source.includes(OWNER_REF) && !r.headers.includes(OWNER_REF), 'staging is nowhere in a production build');
  }
  assert.equal(main.source, before.source);
  assert.equal(main.headers, before.headers);
  assert.equal(before.headers, headersFile(PROJECT_URL, { version: 'abc123' }));
  // a branch build given production's values (hushmallow-pages-env.yml sets Preview to them): never published; the
  // committed staging project instead, exactly as if the Preview environment gave its values, and the log says why
  const branch = buildPublicConfig({ ...env, CF_PAGES_BRANCH: 'claude/launch-rc' }, { version: 'abc123' });
  const asStaging = buildPublicConfig({ SUPABASE_URL: OWNER_URL, SUPABASE_PUBLISHABLE_KEY: OWNER_KEY, CF_PAGES_BRANCH: 'claude/launch-rc' }, { version: 'abc123' });
  assert.equal(branch.ok, true);
  assert.equal(branch.stage, 'staging');
  assert.equal(branch.enabled, true);
  assert.equal(branch.replaced, true);
  assert.deepEqual(body(branch.source), { enabled: true, url: OWNER_URL, key: OWNER_KEY, mode: 'production' });
  assert.equal(branch.source, asStaging.source);
  assert.equal(branch.headers, asStaging.headers);
  assert.match(branch.warning, /production project hushmallow1.*branch "claude\/launch-rc".*Production's values are not published: this build uses the staging project in src\/auth\/config\.js instead/);
  assert.equal(branch.summary, `sign-in on: ${OWNER_URL} (the staging project hushmallow-staging, from src/auth/config.js: production's values in the build environment were refused), key sb_publishable_… [publishable]`);
  assert.ok(!branch.source.includes('igbxbfuaoybfzsroxuln') && !branch.headers.includes('igbxbfuaoybfzsroxuln'), 'production is nowhere in a branch build');
  const slash = buildPublicConfig({ SUPABASE_URL: `${PROJECT_URL}/`, SUPABASE_PUBLISHABLE_KEY: KEY, CF_PAGES_BRANCH: 'x' });
  assert.ok(!slash.source.includes('igbxbfuaoybfzsroxuln') && !slash.headers.includes('igbxbfuaoybfzsroxuln'), 'nor with a trailing slash');
  // another project on a branch build: refused, as any unknown project is
  const other = buildPublicConfig({ SUPABASE_URL: FAKE_URL, SUPABASE_PUBLISHABLE_KEY: STAGING_KEY, CF_PAGES_BRANCH: 'claude/launch-rc' });
  assert.equal(other.ok, false);
  assert.match(other.errors.join('\n'), new RegExp(`not hushmallow-staging \\(${OWNER_REF}\\)`));
  // no staging project (simulated): another project names the placeholder; production's values and no values are off, as before
  const { build } = await withStagingRef('', 'build-placeholder');
  assert.match(build.buildPublicConfig({ SUPABASE_URL: FAKE_URL, SUPABASE_PUBLISHABLE_KEY: STAGING_KEY, CF_PAGES_BRANCH: 'claude/launch-rc' }).errors.join('\n'), /no staging project yet/);
  assert.deepEqual(body(build.buildPublicConfig({ ...env, CF_PAGES_BRANCH: 'claude/launch-rc' }).source), { enabled: false });
  assert.deepEqual(body(build.buildPublicConfig({ CF_PAGES_BRANCH: 'claude/launch-rc' }).source), { enabled: false });
  assert.equal(build.buildPublicConfig(env).source, before.source, 'production exactly as before');
});

test('the build: every existing refusal holds on a branch build too (secrets, service_role, half a pair, malformed)', () => {
  const branch = { CF_PAGES_BRANCH: 'claude/launch-rc' };
  for (const env of [
    { SUPABASE_URL: PROJECT_URL, SUPABASE_PUBLISHABLE_KEY: SECRET },
    { SUPABASE_URL: PROJECT_URL, SUPABASE_PUBLISHABLE_KEY: jwt({ role: 'service_role' }) },
    { SUPABASE_URL: PROJECT_URL, SUPABASE_PUBLISHABLE_KEY: KEY, SUPABASE_SERVICE_ROLE_KEY: 'x' },
    { SUPABASE_URL: PROJECT_URL, SUPABASE_PUBLISHABLE_KEY: KEY, OTHER: SECRET },
    { SUPABASE_URL: PROJECT_URL, SUPABASE_PUBLISHABLE_KEY: '' },
    { SUPABASE_URL: '', SUPABASE_PUBLISHABLE_KEY: KEY },
    { SUPABASE_URL: PROJECT_URL, SUPABASE_PUBLISHABLE_KEY: 'hello' },
    { SUPABASE_URL: PROJECT_URL, SUPABASE_PUBLISHABLE_KEY: jwt({ role: 'anon' }) },
    { SUPABASE_URL: `${PROJECT_URL}/rest/v1`, SUPABASE_PUBLISHABLE_KEY: KEY },
    { SUPABASE_URL: 'http://igbxbfuaoybfzsroxuln.supabase.co', SUPABASE_PUBLISHABLE_KEY: KEY },
    { SUPABASE_URL: 'http://localhost:54321', SUPABASE_PUBLISHABLE_KEY: KEY },
    { SUPABASE_URL: PROJECT_URL, SUPABASE_PUBLISHABLE_KEY: KEY, HM_AUTH_MODE: 'staging' },
    { SUPABASE_PUBLISHABLE_KEY: SECRET },
    // half of the staging pair, and a secret beside no values at all: the committed staging project never covers them
    { SUPABASE_URL: OWNER_URL },
    { SUPABASE_PUBLISHABLE_KEY: OWNER_KEY },
    { SUPABASE_URL: OWNER_URL, SUPABASE_PUBLISHABLE_KEY: '' },
    { SUPABASE_SERVICE_ROLE_KEY: 'x' },
    { OTHER: SECRET },
    { HM_AUTH_MODE: 'staging' },
  ]) {
    for (const extra of [{}, branch, { CF_PAGES_BRANCH: 'main' }]) {
      const r = buildPublicConfig({ ...env, ...extra });
      assert.equal(r.ok, false, `${JSON.stringify(extra)} ${JSON.stringify(env).slice(0, 90)}`);
    }
  }
  // the local CI fake stack (HM_AUTH_MODE=ci) builds as before, on any branch
  for (const extra of [{}, branch, { CF_PAGES_BRANCH: 'main' }]) {
    for (const [url, key] of [['http://127.0.0.1:8204', DEV_KEY], ['http://127.0.0.1:54321', 'sb_publishable_localstack_0000000000'], ['http://localhost:8203', jwt({ role: 'anon' })]]) {
      const r = buildPublicConfig({ SUPABASE_URL: url, SUPABASE_PUBLISHABLE_KEY: key, HM_AUTH_MODE: 'ci', ...extra });
      assert.equal(r.ok, true, `${url} ${JSON.stringify(extra)}`);
      assert.equal(body(r.source).url, url);
      assert.equal(body(r.source).mode, 'ci');
      assert.equal(r.summary, `sign-in on: ${url} (ci), key ${key.slice(0, 15)}… [${key.startsWith('sb_') ? 'publishable' : 'anon-jwt'}]`);
    }
  }
});

test('the build, a staging project given: a branch build publishes ONLY it; main ONLY production; never crossed (the owner\'s, and another one simulated)', async () => {
  for (const { what, build, url: sUrl, key: sKey } of await projects('build')) {
    const staging = { SUPABASE_URL: sUrl, SUPABASE_PUBLISHABLE_KEY: sKey };
    const on = build.buildPublicConfig({ ...staging, CF_PAGES_BRANCH: 'claude/launch-rc' }, { version: 'abc123' });
    assert.equal(on.ok, true, what);
    assert.equal(on.stage, 'staging');
    assert.equal(on.committed, undefined, 'given by the environment');
    assert.deepEqual(body(on.source), { enabled: true, url: sUrl, key: sKey, mode: 'production' });
    assert.equal(on.summary, `sign-in on: ${sUrl} (the staging project hushmallow-staging), key sb_publishable_… [publishable]`);
    // its CSP names the staging project, never production's
    assert.ok(on.headers.includes(`connect-src 'self' ${sUrl}`));
    assert.ok(!on.headers.includes('igbxbfuaoybfzsroxuln'));
    // the staging values on main, or outside Pages: refused (the build fails, production keeps its last good deploy)
    for (const extra of [{ CF_PAGES_BRANCH: 'main' }, {}]) {
      const r = build.buildPublicConfig({ ...staging, ...extra });
      assert.equal(r.ok, false, JSON.stringify(extra));
      assert.match(r.errors.join('\n'), /not hushmallow1/);
    }
    // production on main exactly as before; production on a branch: never published, the staging project instead
    assert.deepEqual(body(build.buildPublicConfig({ SUPABASE_URL: PROJECT_URL, SUPABASE_PUBLISHABLE_KEY: KEY, CF_PAGES_BRANCH: 'main' }).source), { enabled: true, url: PROJECT_URL, key: KEY, mode: 'production' });
    const branchProd = build.buildPublicConfig({ SUPABASE_URL: PROJECT_URL, SUPABASE_PUBLISHABLE_KEY: KEY, CF_PAGES_BRANCH: 'claude/launch-rc' });
    assert.deepEqual(body(branchProd.source), { enabled: true, url: sUrl, key: sKey, mode: 'production' });
    assert.ok(!branchProd.source.includes('igbxbfuaoybfzsroxuln') && !branchProd.headers.includes('igbxbfuaoybfzsroxuln'));
    assert.match(branchProd.warning, /may only use the staging project hushmallow-staging/);
    // the refusals still hold for the staging project
    for (const key of [SECRET, jwt({ role: 'service_role' }), jwt({ role: 'anon' })]) assert.equal(build.buildPublicConfig({ SUPABASE_URL: sUrl, SUPABASE_PUBLISHABLE_KEY: key, CF_PAGES_BRANCH: 'x' }).ok, false);
    assert.equal(build.buildPublicConfig({ ...staging, CF_PAGES_BRANCH: 'x', SUPABASE_SECRET_KEY: 'x' }).ok, false);
    assert.equal(build.buildPublicConfig({ SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co', SUPABASE_PUBLISHABLE_KEY: sKey, CF_PAGES_BRANCH: 'x' }).ok, false, 'no third project');
  }
});

test('the build without sign-in values: a branch build publishes the committed staging project (no Preview variables needed); main and every build outside Pages stay off, never staging', async () => {
  assert.deepEqual(stagingDefault('staging', 'production'), { url: OWNER_URL, key: OWNER_KEY });
  for (const [stage, mode] of [['production', 'production'], ['production', 'ci'], ['staging', 'dev'], ['staging', 'ci']]) assert.deepEqual(stagingDefault(stage, mode), { url: '', key: '' }, `${stage} ${mode}`);
  // what the Preview environment would publish if it set the staging project's values itself
  const given = buildPublicConfig({ SUPABASE_URL: OWNER_URL, SUPABASE_PUBLISHABLE_KEY: OWNER_KEY, CF_PAGES_BRANCH: 'claude/launch-rc' }, { version: 'abc123' });
  assert.equal(given.committed, undefined, 'values given: the usual path');
  for (const env of [{ CF_PAGES_BRANCH: 'claude/launch-rc' }, { CF_PAGES_BRANCH: 'claude/launch-rc', SUPABASE_URL: '', SUPABASE_PUBLISHABLE_KEY: '' }, { CF_PAGES_BRANCH: 'claude/upbeat-pasteur-b0aqg1' }]) {
    const r = buildPublicConfig(env, { version: 'abc123' });
    assert.equal(r.ok, true, JSON.stringify(env));
    assert.equal(r.stage, 'staging');
    assert.equal(r.enabled, true);
    assert.equal(r.committed, true);
    assert.equal(r.warning, undefined);
    assert.deepEqual(body(r.source), { enabled: true, url: OWNER_URL, key: OWNER_KEY, mode: 'production' });
    assert.equal(r.summary, `sign-in on: ${OWNER_URL} (the staging project hushmallow-staging, from src/auth/config.js: the build environment sets no SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY), key sb_publishable_… [publishable]`);
    // exactly the file and headers the staging values give
    assert.equal(r.source, given.source);
    assert.equal(r.headers, given.headers);
    assert.ok(r.headers.includes(`connect-src 'self' ${OWNER_URL}`));
    assert.ok(!r.source.includes(PROJECT_REF) && !r.headers.includes(PROJECT_REF), 'production is nowhere in a branch build');
    // what the browser makes of it: the staging project on a preview, sign-in off on production's hosts
    const published = body(r.source);
    for (const h of PREVIEWS) assert.equal(resolveAuthConfig({ published, loc: loc(h), session: mem() }).url, OWNER_URL, h);
    for (const h of PRODUCTION_HOSTS) assert.equal(resolveAuthConfig({ published, loc: loc(h), session: mem() }).enabled, false, h);
  }
  // production builds never fall back: main, and every build without CF_PAGES_BRANCH (GitHub Pages, CI, this machine)
  for (const env of [{}, { CF_PAGES_BRANCH: 'main' }, { CF_PAGES_BRANCH: '' }, { CF_PAGES_BRANCH: ' main\n' }, { SUPABASE_URL: '', SUPABASE_PUBLISHABLE_KEY: '' }]) {
    const r = buildPublicConfig(env, { version: 'abc123' });
    assert.equal(r.ok, true, JSON.stringify(env));
    assert.equal(r.stage, 'production');
    assert.deepEqual(body(r.source), { enabled: false });
    assert.equal(r.summary, 'sign-in off (no SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY): publishing { enabled: false }');
    assert.equal(r.committed, undefined);
    assert.equal(r.headers, headersFile(null, { version: 'abc123' }));
    assert.ok(!r.source.includes(OWNER_REF) && !r.headers.includes(OWNER_REF), `${JSON.stringify(env)}: staging is nowhere in a production build`);
  }
  // production's values on a branch are never published: replaced by the committed staging project (not "committed":
  // values were given), and a dev / ci build stays off
  const prodOnBranch = buildPublicConfig({ SUPABASE_URL: PROJECT_URL, SUPABASE_PUBLISHABLE_KEY: KEY, CF_PAGES_BRANCH: 'claude/launch-rc' });
  assert.deepEqual([prodOnBranch.enabled, prodOnBranch.committed, prodOnBranch.replaced, body(prodOnBranch.source)], [true, undefined, true, { enabled: true, url: OWNER_URL, key: OWNER_KEY, mode: 'production' }]);
  assert.match(prodOnBranch.warning, /Deleting SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY from the Preview environment silences this/);
  for (const mode of ['dev', 'ci']) assert.deepEqual(body(buildPublicConfig({ CF_PAGES_BRANCH: 'claude/launch-rc', HM_AUTH_MODE: mode }).source), { enabled: false }, mode);
  // no staging project (simulated): a branch build without values is off, as before
  const { build } = await withStagingRef('', 'build-default');
  assert.deepEqual(build.stagingDefault('staging', 'production'), { url: '', key: '' });
  const off = build.buildPublicConfig({ CF_PAGES_BRANCH: 'claude/launch-rc' });
  assert.deepEqual([off.ok, off.enabled, off.committed, body(off.source)], [true, false, undefined, { enabled: false }]);
  // and production's values on a branch, with no staging project to use instead: off, never production's
  const offProd = build.buildPublicConfig({ SUPABASE_URL: PROJECT_URL, SUPABASE_PUBLISHABLE_KEY: KEY, CF_PAGES_BRANCH: 'claude/launch-rc' });
  assert.deepEqual([offProd.ok, offProd.enabled, offProd.replaced, body(offProd.source)], [true, false, undefined, { enabled: false }]);
  assert.match(offProd.warning, /Not published: this build has no sign-in/);
  assert.match(offProd.summary, /sign-in off \(production values refused on a branch build\)/);
  // another staging project (simulated): the default follows the two constants
  const { build: other } = await withStagingRef(FAKE_REF, 'build-default-other', { key: STAGING_KEY });
  assert.deepEqual(body(other.buildPublicConfig({ CF_PAGES_BRANCH: 'x' }).source), { enabled: true, url: FAKE_URL, key: STAGING_KEY, mode: 'production' });
});

test('build-site.sh: a branch build given production\'s values, or none, builds with the staging project, never production\'s; the site check agrees', () => {
  const build = (tag, extra) => {
    const out = join(tmp, tag);
    const env = { PATH: process.env.PATH, HOME: process.env.HOME || '/tmp', CF_PAGES_BRANCH: 'claude/launch-rc', ...extra };
    const log = execFileSync('bash', [join(root, 'tools/build-site.sh'), out, 'stg0test'], { cwd: root, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const res = { log, config: body(readFileSync(join(out, 'v/stg0test/src/auth/public-config.js'), 'utf8')), headers: readFileSync(join(out, '_headers'), 'utf8'), shipped: statSync(join(out, 'v/stg0test/src/app/config.js')).isFile() };
    rmSync(out, { recursive: true, force: true });
    return res;
  };
  const r = build('site-branch', { SUPABASE_URL: PROJECT_URL, SUPABASE_PUBLISHABLE_KEY: KEY });
  assert.match(r.log, /auth config: sign-in on: https:\/\/oghzabvkrxsejkkjdsuc\.supabase\.co \(the staging project hushmallow-staging, from src\/auth\/config\.js: production's values in the build environment were refused\)/);
  assert.match(r.log, /check: .*sign-in on \(production, https:\/\/oghzabvkrxsejkkjdsuc\.supabase\.co\)/);
  assert.deepEqual(r.config, { enabled: true, url: OWNER_URL, key: OWNER_KEY, mode: 'production' });
  assert.ok(r.headers.includes(`connect-src 'self' ${OWNER_URL}`) && !r.headers.includes('igbxbfuaoybfzsroxuln'));
  assert.ok(!r.log.includes('NSv1Liou2yjKjauX09U5qQ'), 'the build log never prints a key');
  // the published src/auth/config.js imports src/app/config.js (isPreviewHost): both are shipped
  assert.ok(r.shipped);
  // no sign-in values at all (the Preview environment without them): the committed staging project, which the check accepts
  const d = build('site-branch-default', {});
  assert.match(d.log, /auth config: sign-in on: https:\/\/oghzabvkrxsejkkjdsuc\.supabase\.co \(the staging project hushmallow-staging, from src\/auth\/config\.js/);
  assert.match(d.log, /check: .*sign-in on \(production, https:\/\/oghzabvkrxsejkkjdsuc\.supabase\.co\)/);
  assert.deepEqual(d.config, { enabled: true, url: OWNER_URL, key: OWNER_KEY, mode: 'production' });
  assert.ok(d.headers.includes(`connect-src 'self' ${OWNER_URL}`) && !d.headers.includes('igbxbfuaoybfzsroxuln'));
  // the site check validates for the build's stage
  const check = read('tools/site/check.mjs');
  assert.match(check, /const auth = await checkAuth\(out, app, problems, buildStage\(env\)\);/);
  assert.match(check, /validatePublicConfig\(\{ url: cfg\.url, key: cfg\.key, mode: cfg\.mode, stage \}\)/);
});

// --------------------------------------------- the staging Worker's deploy --
test('another-angle-staging.yml: the staging Worker gets the STAGING model key and tester codes, never production\'s', () => {
  const wf = readFileSync(join(repo, '.github/workflows/another-angle-staging.yml'), 'utf8');
  const code = wf.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
  assert.match(code, /\$\{\{ secrets\.ANTHROPIC_API_KEY_STAGING \}\}/);
  assert.match(code, /\$\{\{ secrets\.TESTER_INVITE_CODES_STAGING \}\}/);
  // never the production secrets' names (only the _STAGING ones), anywhere in the file
  assert.doesNotMatch(wf, /secrets\.ANTHROPIC_API_KEY(?!_STAGING)\b/);
  assert.doesNotMatch(wf, /secrets\.TESTER_INVITE_CODES(?!_STAGING)\b/);
  assert.equal([...wf.matchAll(/secrets\.([A-Z0-9_]+)/g)].map((m) => m[1]).sort().join(','), 'ANTHROPIC_API_KEY_STAGING,CLOUDFLARE_ACCOUNT_ID,CLOUDFLARE_API_TOKEN,TESTER_INVITE_CODES_STAGING,TESTER_INVITE_CODES_STAGING');
  // without ANTHROPIC_API_KEY_STAGING the deploy sets no model key (scripts/ci-secrets.mjs only sets a non-empty one),
  // and the run's summary says the Worker keeps its key and that the owner must replace it
  assert.match(code, /if \[ -z "\$ANTHROPIC_API_KEY" \]; then/);
  assert.match(code, /keeps whatever ANTHROPIC_API_KEY it already has/);
  assert.match(code, /replace it in the Cloudflare dashboard with the staging key/);
  assert.match(code, />> "\$GITHUB_STEP_SUMMARY"/);
  assert.match(read('server/another-angle/scripts/ci-secrets.mjs'), /if \(env\.ANTHROPIC_API_KEY\) out\.ANTHROPIC_API_KEY = env\.ANTHROPIC_API_KEY;/);
  // its trigger and permissions are as they were: a line appended to deploy/STAGING on a claude/** branch, read-only
  assert.match(wf, /on:\n {2}push:\n {4}branches: \['claude\/\*\*'\]\n {4}paths: \['hushmallow\/server\/another-angle\/deploy\/STAGING'\]\n\npermissions:\n {2}contents: read\n/);
  // production's workflow still uses production's secrets (and only it)
  const prod = readFileSync(join(repo, '.github/workflows/another-angle.yml'), 'utf8');
  assert.match(prod, /ANTHROPIC_API_KEY: \$\{\{ secrets\.ANTHROPIC_API_KEY \}\}/);
  assert.doesNotMatch(prod, /_STAGING/);
});
