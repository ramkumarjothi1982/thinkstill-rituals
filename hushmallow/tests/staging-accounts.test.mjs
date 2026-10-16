// Staging accounts (docs/STAGING.md): the branch previews have their OWN Supabase project,
// hushmallow-staging, so a rehearsal's sign-ups never land in production's database.
//   - the host decides the project: a branch preview (src/app/config.js isPreviewHost) accepts ONLY the
//     staging project; every other host (app.hushmallow.com, hushmallow.pages.dev, the GitHub Pages copy,
//     localhost) ONLY production's hushmallow1, exactly as before. Never crossed, either way.
//   - STAGING_PROJECT_REF = '' is the placeholder ("no staging project yet"): a preview then has sign-in
//     off, exactly like a build without values, and never falls back to production.
//   - the build (tools/site/auth-config.mjs): a Cloudflare Pages build of a branch other than main
//     (CF_PAGES_BRANCH) may only publish the staging project; main (and every build outside Pages) only
//     production's. Production's values on a branch build are never published (sign-in off, a warning).
//   - the staging Worker's deploy uses the staging secrets, never production's.
// The cases "once the staging project exists" load a copy of the real modules with only the
// STAGING_PROJECT_REF line filled in, exactly the change the owner's values will make.
// Run with: node --test tests/
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, copyFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';

import {
  validatePublicConfig, resolveAuthConfig, stageFor, storageKeyFor, PROJECTS, STAGES, DEV_KEY,
  PROJECT_URL, PROJECT_REF, STAGING_PROJECT_REF, STAGING_PROJECT_URL, STAGING_PROJECT_NAME, STAGING_PROJECT_REGION,
} from '../src/auth/config.js';
import { buildPublicConfig, buildStage, headersFile, PRODUCTION_BRANCH } from '../tools/site/auth-config.mjs';
import { guardedFetch } from '../src/auth/client.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const repo = fileURLToPath(new URL('../../', import.meta.url));
const read = (p) => readFileSync(root + p, 'utf8');
const KEY = 'sb_publishable_NSv1Liou2yjKjauX09U5qQ_CxwzDuiw';            // production's publishable key (public)
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

// ---- a copy of the real modules with the staging ref filled in (the one line the owner's values change) --
const tmp = mkdtempSync(join(tmpdir(), 'hm-staging-accounts-'));
after(() => rmSync(tmp, { recursive: true, force: true }));
const REF_LINE = "export const STAGING_PROJECT_REF = '';";
async function withStagingRef(ref, tag) {
  const dir = join(tmp, tag);
  const files = ['src/auth/config.js', 'src/app/config.js', 'tools/site/auth-config.mjs', 'tools/site/security-headers.mjs', 'index.html', 'auth/callback/index.html'];
  for (const f of files) { mkdirSync(dirname(join(dir, f)), { recursive: true }); copyFileSync(root + f, join(dir, f)); }
  const src = read('src/auth/config.js');
  assert.equal(src.split(REF_LINE).length, 2, 'the placeholder line is there exactly once');
  writeFileSync(join(dir, 'src/auth/config.js'), src.replace(REF_LINE, `export const STAGING_PROJECT_REF = '${ref}';`));
  return {
    config: await import(pathToFileURL(join(dir, 'src/auth/config.js')).href),
    build: await import(pathToFileURL(join(dir, 'tools/site/auth-config.mjs')).href),
  };
}

// ------------------------------------------------------------ the constants --
test('the staging project: a separately named Sydney project whose ref is a marked placeholder until the owner creates it', () => {
  assert.equal(STAGING_PROJECT_NAME, 'hushmallow-staging');
  assert.equal(STAGING_PROJECT_REGION, 'ap-southeast-2');
  assert.deepEqual([...STAGES], ['production', 'staging']);
  // the placeholder: no staging project yet
  assert.equal(STAGING_PROJECT_REF, '');
  assert.equal(STAGING_PROJECT_URL, '');
  assert.deepEqual({ ...PROJECTS.staging }, { stage: 'staging', name: 'hushmallow-staging', ref: '', region: 'ap-southeast-2', url: '' });
  const src = read('src/auth/config.js');
  assert.ok(src.includes(REF_LINE));
  assert.match(src, /PLACEHOLDER: '' means "no staging project yet"/);
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

test('placeholder (today): a preview has sign-in OFF, never production\'s; production\'s hosts keep hushmallow1 exactly as before', () => {
  for (const h of PRODUCTION_HOSTS) {
    const c = resolveAuthConfig({ published: PROD_PUBLISHED, loc: loc(h), session: mem() });
    assert.deepEqual({ ...c }, { enabled: true, reason: 'configured', url: PROJECT_URL, key: KEY, ref: PROJECT_REF, mode: 'production', storageKey: 'sb-igbxbfuaoybfzsroxuln-auth-token', dev: false }, h);
  }
  for (const h of PREVIEWS) {
    const c = resolveAuthConfig({ published: PROD_PUBLISHED, loc: loc(h), session: mem() });
    assert.deepEqual({ ...c }, { enabled: false, reason: 'no-staging-project', url: null, key: null, ref: null, mode: null, storageKey: null, dev: false }, h);
    // exactly like a build without values
    assert.equal(resolveAuthConfig({ published: { enabled: false }, loc: loc(h), session: mem() }).enabled, false);
    // any other hosted project too
    assert.equal(resolveAuthConfig({ published: { ...PROD_PUBLISHED, url: FAKE_URL }, loc: loc(h), session: mem() }).enabled, false, h);
  }
  // the build-time check says the same, in words for the log
  assert.match(validatePublicConfig({ url: PROJECT_URL, key: KEY, stage: 'staging' }).error, /production project hushmallow1 .*may only use the staging project hushmallow-staging, never production/);
  assert.match(validatePublicConfig({ url: FAKE_URL, key: KEY, stage: 'staging' }).error, /no staging project yet .*STAGING_PROJECT_REF is still the placeholder/);
  assert.match(validatePublicConfig({ url: PROJECT_URL, key: KEY, stage: 'nowhere' }).error, /stage must be "production" or "staging"/);
  // production's checks are word for word as before
  assert.equal(validatePublicConfig({ url: PROJECT_URL, key: KEY }).ok, true);
  assert.deepEqual(validatePublicConfig({ url: PROJECT_URL, key: KEY }), validatePublicConfig({ url: PROJECT_URL, key: KEY, stage: 'production' }));
  assert.match(validatePublicConfig({ url: FAKE_URL, key: KEY }).error, /not hushmallow1/);
});

test('once the staging project exists: a preview accepts ONLY it; production\'s hosts accept ONLY hushmallow1; never crossed', async () => {
  const { config } = await withStagingRef(FAKE_REF, 'set');
  assert.equal(config.STAGING_PROJECT_URL, FAKE_URL);
  assert.deepEqual({ ...config.PROJECTS.staging }, { stage: 'staging', name: 'hushmallow-staging', ref: FAKE_REF, region: 'ap-southeast-2', url: FAKE_URL });
  const staging = { enabled: true, url: FAKE_URL, key: STAGING_KEY, mode: 'production' };
  for (const h of PREVIEWS) {
    const c = config.resolveAuthConfig({ published: staging, loc: loc(h), session: mem() });
    assert.deepEqual({ ...c }, { enabled: true, reason: 'configured', url: FAKE_URL, key: STAGING_KEY, ref: FAKE_REF, mode: 'production', storageKey: `sb-${FAKE_REF}-auth-token`, dev: false }, h);
    // a production URL on a preview: refused (sign-in off), never a fall-back
    assert.equal(config.resolveAuthConfig({ published: PROD_PUBLISHED, loc: loc(h), session: mem() }).reason, 'invalid', h);
    assert.equal(config.resolveAuthConfig({ published: { ...staging, url: `${FAKE_URL}/` }, loc: loc(h), session: mem() }).url, FAKE_URL, 'a trailing slash is normalised');
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
  assert.match(config.validatePublicConfig({ url: 'https://abcdefghijklmnopqrst.supabase.co', key: STAGING_KEY, stage: 'staging' }).error, new RegExp(`not hushmallow-staging \\(${FAKE_REF}\\)`));
  assert.match(config.validatePublicConfig({ url: FAKE_URL, key: STAGING_KEY }).error, /not hushmallow1/);
  assert.match(config.validatePublicConfig({ url: FAKE_URL, key: jwt({ role: 'anon' }), stage: 'staging' }).error, /publishable key/);
});

test('the guarded fetch only reaches the project for this host', async () => {
  const { config } = await withStagingRef(FAKE_REF, 'fetch');
  const realFetch = globalThis.fetch;
  const seen = [];
  globalThis.fetch = async (url) => { seen.push(String(url)); return new Response('{}'); };
  try {
    // a preview: the staging project, never production
    const p = config.resolveAuthConfig({ published: { enabled: true, url: FAKE_URL, key: STAGING_KEY, mode: 'production' }, loc: loc(PREVIEWS[0]), session: mem() });
    const fp = guardedFetch(new URL(p.url).origin, `https://${PREVIEWS[0]}/`);
    await fp(`${FAKE_URL}/auth/v1/user`);
    await assert.rejects(fp(`${PROJECT_URL}/auth/v1/user`), /blocked/);
    // production: hushmallow1, never staging
    const c = config.resolveAuthConfig({ published: PROD_PUBLISHED, loc: loc('app.hushmallow.com'), session: mem() });
    const fc = guardedFetch(new URL(c.url).origin, 'https://app.hushmallow.com/');
    await fc(`${PROJECT_URL}/auth/v1/user`);
    await assert.rejects(fc(`${FAKE_URL}/auth/v1/user`), /blocked/);
    assert.deepEqual(seen, [`${FAKE_URL}/auth/v1/user`, `${PROJECT_URL}/auth/v1/user`]);
  } finally { globalThis.fetch = realFetch; }
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

test('the build, placeholder (today): main and builds outside Pages publish hushmallow1 exactly as before; a branch build never publishes production', () => {
  const env = { SUPABASE_URL: PROJECT_URL, SUPABASE_PUBLISHABLE_KEY: KEY };
  const before = buildPublicConfig(env, { version: 'abc123' });
  const main = buildPublicConfig({ ...env, CF_PAGES_BRANCH: 'main' }, { version: 'abc123' });
  for (const r of [before, main]) {
    assert.equal(r.ok, true);
    assert.equal(r.stage, 'production');
    assert.deepEqual(body(r.source), { enabled: true, url: PROJECT_URL, key: KEY, mode: 'production' });
    assert.equal(r.summary, `sign-in on: ${PROJECT_URL} (production), key sb_publishable_… [publishable]`);
    assert.equal(r.warning, undefined);
  }
  assert.equal(main.source, before.source);
  assert.equal(main.headers, before.headers);
  assert.equal(before.headers, headersFile(PROJECT_URL, { version: 'abc123' }));
  // a branch build given production's values: not published, sign-in off, and the log says why
  const branch = buildPublicConfig({ ...env, CF_PAGES_BRANCH: 'claude/launch-rc' }, { version: 'abc123' });
  assert.equal(branch.ok, true);
  assert.equal(branch.stage, 'staging');
  assert.equal(branch.enabled, false);
  assert.deepEqual(body(branch.source), { enabled: false });
  assert.match(branch.warning, /production project hushmallow1.*branch "claude\/launch-rc".*Not published: this build has no sign-in/);
  assert.match(branch.summary, /sign-in off \(production values refused on a branch build\)/);
  assert.ok(!branch.source.includes('igbxbfuaoybfzsroxuln') && !branch.headers.includes('igbxbfuaoybfzsroxuln'), 'production is nowhere in a branch build');
  assert.equal(branch.headers, headersFile(null, { version: 'abc123' }));
  assert.equal(buildPublicConfig({ SUPABASE_URL: `${PROJECT_URL}/`, SUPABASE_PUBLISHABLE_KEY: KEY, CF_PAGES_BRANCH: 'x' }).enabled, false);
  // another project on a branch build, while there is no staging project: refused, as any unknown project is
  const other = buildPublicConfig({ SUPABASE_URL: FAKE_URL, SUPABASE_PUBLISHABLE_KEY: STAGING_KEY, CF_PAGES_BRANCH: 'claude/launch-rc' });
  assert.equal(other.ok, false);
  assert.match(other.errors.join('\n'), /no staging project yet/);
  // a branch build without values: off, as before
  assert.deepEqual(body(buildPublicConfig({ CF_PAGES_BRANCH: 'claude/launch-rc' }).source), { enabled: false });
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

test('the build, once the staging project exists: a branch build publishes ONLY it; main ONLY production; never crossed', async () => {
  const { build } = await withStagingRef(FAKE_REF, 'build');
  const staging = { SUPABASE_URL: FAKE_URL, SUPABASE_PUBLISHABLE_KEY: STAGING_KEY };
  const on = build.buildPublicConfig({ ...staging, CF_PAGES_BRANCH: 'claude/launch-rc' }, { version: 'abc123' });
  assert.equal(on.ok, true);
  assert.equal(on.stage, 'staging');
  assert.deepEqual(body(on.source), { enabled: true, url: FAKE_URL, key: STAGING_KEY, mode: 'production' });
  assert.equal(on.summary, `sign-in on: ${FAKE_URL} (the staging project hushmallow-staging), key sb_publishable_… [publishable]`);
  // its CSP names the staging project, never production's
  assert.ok(on.headers.includes(`connect-src 'self' ${FAKE_URL}`));
  assert.ok(!on.headers.includes('igbxbfuaoybfzsroxuln'));
  // the staging values on main, or outside Pages: refused (the build fails, production keeps its last good deploy)
  for (const extra of [{ CF_PAGES_BRANCH: 'main' }, {}]) {
    const r = build.buildPublicConfig({ ...staging, ...extra });
    assert.equal(r.ok, false, JSON.stringify(extra));
    assert.match(r.errors.join('\n'), /not hushmallow1/);
  }
  // production on main exactly as before; production on a branch: off, never published
  assert.deepEqual(body(build.buildPublicConfig({ SUPABASE_URL: PROJECT_URL, SUPABASE_PUBLISHABLE_KEY: KEY, CF_PAGES_BRANCH: 'main' }).source), { enabled: true, url: PROJECT_URL, key: KEY, mode: 'production' });
  const branchProd = build.buildPublicConfig({ SUPABASE_URL: PROJECT_URL, SUPABASE_PUBLISHABLE_KEY: KEY, CF_PAGES_BRANCH: 'claude/launch-rc' });
  assert.deepEqual(body(branchProd.source), { enabled: false });
  assert.match(branchProd.warning, /may only use the staging project hushmallow-staging/);
  // the refusals still hold for the staging project
  for (const key of [SECRET, jwt({ role: 'service_role' }), jwt({ role: 'anon' })]) assert.equal(build.buildPublicConfig({ SUPABASE_URL: FAKE_URL, SUPABASE_PUBLISHABLE_KEY: key, CF_PAGES_BRANCH: 'x' }).ok, false);
  assert.equal(build.buildPublicConfig({ ...staging, CF_PAGES_BRANCH: 'x', SUPABASE_SECRET_KEY: 'x' }).ok, false);
  assert.equal(build.buildPublicConfig({ SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co', SUPABASE_PUBLISHABLE_KEY: STAGING_KEY, CF_PAGES_BRANCH: 'x' }).ok, false, 'no third project');
});

test('build-site.sh: a branch build given production\'s values builds with sign-in off; the site check agrees', () => {
  const out = join(tmp, 'site-branch');
  const env = { PATH: process.env.PATH, HOME: process.env.HOME || '/tmp', SUPABASE_URL: PROJECT_URL, SUPABASE_PUBLISHABLE_KEY: KEY, CF_PAGES_BRANCH: 'claude/launch-rc' };
  const r = execFileSync('bash', [join(root, 'tools/build-site.sh'), out, 'stg0test'], { cwd: root, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  assert.match(r, /auth config: sign-in off \(production values refused on a branch build\)/);
  assert.match(r, /check: .*sign-in off/);
  assert.deepEqual(body(readFileSync(join(out, 'v/stg0test/src/auth/public-config.js'), 'utf8')), { enabled: false });
  assert.ok(!readFileSync(join(out, '_headers'), 'utf8').includes('igbxbfuaoybfzsroxuln'));
  // the published src/auth/config.js imports src/app/config.js (isPreviewHost): both are shipped
  assert.ok(statSync(join(out, 'v/stg0test/src/app/config.js')).isFile());
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
