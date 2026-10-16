// tools/auth/prod-readiness.mjs, the owner's read-only check of the production sign-in project (16 Oct 2026):
// exactly the app's own readiness questions (src/auth/readiness.js) and the rest of what the publishable key can
// read, with GET requests only; and with --app, what the live build published. Against the local fake of
// Supabase (tools/auth/fake-supabase.mjs) and a local Pages-like server (tools/auth/pages-serve.mjs), never
// the real project.
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, copyFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { checkProduction, formatReport, exposedSchemasFrom, cspAllowsConnect, parsePublicConfig, SITE_URL, TABLES, STEPS } from '../tools/auth/prod-readiness.mjs';
import { migrationFiles } from '../tools/auth/bundle-sql.mjs';
import { createFakeSupabase, TABLES as FAKE_TABLES } from '../tools/auth/fake-supabase.mjs';
import { createPagesServer } from '../tools/auth/pages-serve.mjs';
import { probeReadiness } from '../src/auth/readiness.js';
import { validatePublicConfig, publicConfigModule, PROJECT_URL, DEV_KEY } from '../src/auth/config.js';
import { headersFile } from '../tools/site/auth-config.mjs';

const run = promisify(execFile);
const root = fileURLToPath(new URL('../', import.meta.url));
const read = (p) => readFileSync(join(root, p), 'utf8');
const KEY = DEV_KEY;
const PROD_KEY = 'sb_publishable_NSv1Liou2yjKjauX09U5qQ_CxwzDuiw';
// fake secrets are assembled at run time, so no file ever holds a secret-shaped string
const SECRET = ['sb', 'secret', 'abcdefghijklmnopqrstuvwxyz0123'].join('_');
const jwt = (payload) => `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.c2lnbmF0dXJlLXBhcnQ`;
const fails = (r) => r.lines.filter((l) => l.status === 'FAIL');
const RESET = { autoconfirm: false, noSchema: false, emailOff: false, down: false, schemas: ['public', 'graphql_public'], disableSignup: false, anonymousUsers: false };

let fake, furl, seen;
/** fetch, recorded: method, address and headers of everything the checker sends */
const recording = (u, init = {}) => { seen.push({ url: String(u), method: init.method || 'GET', headers: { ...(init.headers || {}) } }); return fetch(u, init); };
const check = (o = {}) => checkProduction({ url: furl, key: KEY, mode: 'dev', fetchFn: recording, timeoutMs: 3000, ...o });

before(async () => {
  fake = createFakeSupabase({ siteUrl: SITE_URL });
  furl = `http://localhost:${await fake.listen(0)}`;
});
after(async () => { await fake.close(); });
beforeEach(() => { seen = []; fake.reset(); Object.assign(fake.cfg, RESET); });

test('checker: a ready project passes every check, with GET requests and the publishable key only, changing nothing', async () => {
  const r = await check();
  assert.equal(r.ok, true, JSON.stringify(fails(r)));
  assert.deepEqual(fails(r), []);
  const labels = r.lines.map((l) => `${l.status}  ${l.label}`);
  assert.ok(labels.includes("PASS  the app's own readiness gate (src/auth/readiness.js) would show sign-in"));
  for (const t of TABLES) assert.ok(labels.includes(`PASS  public.${t} is there and closed to anon (42501, by design)`), t);
  for (const x of ['Data API: hm_private is not exposed (exposed schemas: public, graphql_public)', 'Auth: the email provider is on', 'Auth: new users may sign up', 'Auth: "Confirm email" is on (every sign-up confirms its address)', 'Auth: anonymous sign-ins are off', `Site URL is exactly ${SITE_URL} (where Auth sends an email link)`, 'redirect allow-list: an address outside it is not honoured']) assert.ok(labels.includes(`PASS  ${x}`), x);
  assert.ok(labels.includes('INFO  Auth: other sign-in methods on: none'));
  // read only: GETs, the publishable key as apikey, never an Authorization header
  assert.ok(seen.length >= 12);
  for (const s of seen) {
    assert.equal(s.method, 'GET', s.url);
    assert.equal(s.headers.apikey, KEY, s.url);
    assert.ok(!Object.keys(s.headers).some((h) => h.toLowerCase() === 'authorization'), s.url);
    assert.ok(s.url.startsWith(furl), s.url);
  }
  const st = await (await fetch(`${furl}/__fake/state`)).json();
  assert.deepEqual([st.users.length, st.sessions, fake.outbox.length], [0, 0, 0], 'no account, no session, no email');
  const out = formatReport(r);
  assert.match(out, /^RESULT {2}READY: 14 PASS, 0 FAIL/m);
  assert.match(out, /Not readable with the publishable key/);
  assert.ok(!out.includes(KEY), 'the key is never printed in full');
});

test('checker: it asks the app\'s own questions, and agrees with src/auth/readiness.js in every state', async () => {
  for (const cfg of [{}, { noSchema: true }, { emailOff: true }, { autoconfirm: true }, { down: true }]) {
    Object.assign(fake.cfg, RESET, cfg);
    const app = await probeReadiness({ enabled: true, url: furl, key: KEY, dev: false }, { fetchFn: fetch, timeoutMs: 3000 });
    seen = [];
    const r = await check();
    const gate = r.lines[0];
    assert.equal(gate.status, app.ready ? 'PASS' : 'FAIL', JSON.stringify(cfg));
    if (!app.ready) assert.match(gate.label, /would hide sign-in/);
    assert.ok(seen.some((s) => s.url === `${furl}/rest/v1/profiles?select=user_id&limit=0`));
    assert.ok(seen.some((s) => s.url === `${furl}/auth/v1/settings`));
  }
});

test('checker: each way a project can be unready is a FAIL that names the runbook step', async () => {
  const cases = [
    [{ noSchema: true }, STEPS.sql, /public\.profiles is missing: run ALL_MIGRATIONS\.sql/],
    [{ emailOff: true }, STEPS.signup, /Auth: the email provider is off/],
    [{ autoconfirm: true }, STEPS.signup, /"Confirm email" is off \(anyone could sign up as any address\)/],
    [{ disableSignup: true }, STEPS.signup, /"Allow new users to sign up" is off/],
    [{ anonymousUsers: true }, STEPS.signup, /anonymous sign-ins are on/],
    [{ schemas: ['public', 'graphql_public', 'hm_private'] }, STEPS.dataApi, /Data API: hm_private looks exposed/],
  ];
  for (const [cfg, step, re] of cases) {
    Object.assign(fake.cfg, RESET, cfg);
    const r = await check();
    assert.equal(r.ok, false, JSON.stringify(cfg));
    const hit = fails(r).find((l) => re.test(l.label));
    assert.ok(hit, `${JSON.stringify(cfg)}: ${JSON.stringify(fails(r))}`);
    assert.equal(hit.step, step, JSON.stringify(cfg));
    assert.match(formatReport(r), new RegExp(`→ RUNBOOK\\.md step ${step}$`, 'm'));
    assert.match(formatReport(r), /^RESULT {2}NOT READY: \d+ FAIL/m);
  }
  // a disabled sign-up or anonymous sign-ins are not something the app's own gate looks at: only this checker says so
  Object.assign(fake.cfg, RESET, { disableSignup: true });
  assert.equal((await check()).lines[0].status, 'PASS');
  // the project down: every question FAILs as "could not", never as a guess
  Object.assign(fake.cfg, RESET, { down: true });
  const d = await check();
  assert.ok(fails(d).length >= 8);
  assert.ok(!d.lines.some((l) => l.status === 'PASS'));
});

test('checker: the Site URL and the allow-list, as Auth applies them (a trailing slash, another site, a wildcard)', async () => {
  const other = async (opts, site = SITE_URL) => {
    const f = createFakeSupabase(opts);
    const u = `http://localhost:${await f.listen(0)}`;
    try { return await checkProduction({ url: u, key: KEY, mode: 'dev', site, fetchFn: fetch, timeoutMs: 3000 }); } finally { await f.close(); }
  };
  let r = await other({ siteUrl: `${SITE_URL}/` });
  assert.deepEqual(fails(r).map((l) => [l.label, l.step]), [[`Site URL ends with a slash (${SITE_URL}/): the email links would read …//auth/callback`, STEPS.urls]]);
  r = await other({ siteUrl: 'http://localhost:3000' });
  assert.deepEqual(fails(r).map((l) => [l.label, l.step]), [[`Site URL is http://localhost:3000, not ${SITE_URL}: every email link would open the wrong site`, STEPS.urls]]);
  r = await other({ siteUrl: SITE_URL, redirectAllow: () => true });
  assert.deepEqual(fails(r).map((l) => l.step), [STEPS.urls]);
  assert.match(fails(r)[0].label, /redirect allow-list accepts an address it should not/);
  // the expected Site URL may be given with a slash; it is compared without
  assert.equal((await check({ site: `${SITE_URL}/` })).ok, true);
});

test('checker: refused before asking anything — a secret, a service_role key, another project, a local address in production, no key', async () => {
  const never = () => { throw new Error('nothing may be asked'); };
  const cases = [
    [{ url: PROJECT_URL, key: SECRET }, /secret key/],
    [{ url: PROJECT_URL, key: jwt({ role: 'service_role' }) }, /service_role/],
    [{ url: 'https://abcdefghijklmnopqrst.supabase.co', key: PROD_KEY }, /not hushmallow1/],
    [{ url: furl, key: KEY, mode: 'production' }, /local address/],
    [{ url: PROJECT_URL, key: '' }, /Give the publishable key/],
  ];
  for (const [o, re] of cases) {
    const r = await checkProduction({ fetchFn: never, ...o });
    assert.equal(r.ok, false);
    assert.match(r.refused, re);
    assert.match(formatReport(r), /^prod-readiness: REFUSED, nothing was asked/);
    assert.ok(!formatReport(r).includes(SECRET));
  }
});

test('checker CLI: PASS / FAIL lines, exit 0 when ready, 1 on a FAIL, 2 when refused (the key from the environment)', async () => {
  const cli = join(root, 'tools/auth/prod-readiness.mjs');
  const env = { ...process.env, SUPABASE_PUBLISHABLE_KEY: KEY, SUPABASE_URL: '', HM_AUTH_MODE: '' };
  const ok = await run(process.execPath, [cli, '--dev', '--url', furl], { env });
  const lines = ok.stdout.split('\n');
  assert.ok(lines.filter((l) => /^(PASS|FAIL|INFO) {2}/.test(l)).length >= 15);
  assert.ok(!lines.some((l) => l.startsWith('FAIL')));
  assert.match(ok.stdout, /^RESULT {2}READY/m);
  Object.assign(fake.cfg, { noSchema: true });
  const bad = await run(process.execPath, [cli, '--dev', '--url', furl], { env }).then(() => null, (e) => e);
  assert.equal(bad?.code, 1);
  assert.match(bad.stdout, /^FAIL {2}public\.profiles is missing/m);
  const refused = await run(process.execPath, [cli], { env: { ...env, SUPABASE_PUBLISHABLE_KEY: SECRET } }).then(() => null, (e) => e);
  assert.equal(refused?.code, 2);
  assert.match(refused.stdout, /REFUSED, nothing was asked: SUPABASE_PUBLISHABLE_KEY is a secret key/);
  assert.ok(!refused.stdout.includes(SECRET));
});

test('checker --app: the live build\'s public values and the headers sign-in relies on', async () => {
  const site = mkdtempSync(join(tmpdir(), 'hm-app-'));
  const v = validatePublicConfig({ url: furl, key: KEY, mode: 'dev' });
  const write = (p, s) => { mkdirSync(join(site, p, '..'), { recursive: true }); writeFileSync(join(site, p), s); };
  write('index.html', '<!doctype html><title>hushmallow</title>');
  write('version.json', '{"v":"t1"}\n');
  write('v/t1/src/auth/public-config.js', publicConfigModule(v, { stamp: 'version t1' }));
  write('_headers', headersFile(new URL(furl).origin));
  mkdirSync(join(site, 'auth/callback'), { recursive: true });
  copyFileSync(join(root, 'auth/callback/index.html'), join(site, 'auth/callback/index.html'));
  const pages = createPagesServer(site);
  await new Promise((r) => pages.listen(0, '127.0.0.1', r));
  const app = `http://127.0.0.1:${pages.address().port}`;
  const appLines = (r) => r.lines.filter((l) => l.label.startsWith('app: '));
  try {
    let r = await check({ app });
    assert.equal(r.ok, true, JSON.stringify(fails(r)));
    assert.deepEqual(appLines(r).map((l) => `${l.status}  ${l.label}`), [
      'PASS  app: version t1 has sign-in on, for this project and this key',
      'PASS  app: /auth/callback/ is never cached, never framed, sends no referrer, and its CSP reaches the project',
      "PASS  app: /auth/callback (the email links' address) opens the callback page with the link's query",
      'PASS  app: the root page sets no CSP that could block sign-in',
    ]);
    assert.ok(seen.filter((s) => s.url.startsWith(app)).every((s) => s.method === 'GET' && !s.headers.apikey), 'the site is asked without the key');
    // a build without the two values (as every preview, and production before step 10)
    write('v/t1/src/auth/public-config.js', publicConfigModule({ enabled: false }));
    r = await check({ app });
    assert.deepEqual(fails(r).map((l) => [l.label.replace(/:.*/, ''), l.step]), [['app', STEPS.pages]]);
    assert.match(fails(r)[0].label, /version t1 has sign-in off/);
    // another key published than the one checked
    write('v/t1/src/auth/public-config.js', publicConfigModule(validatePublicConfig({ url: furl, key: 'sb_publishable_some_other_public_key_000', mode: 'dev' })));
    assert.match(fails(await check({ app }))[0].label, /names .* with key sb_publishable_…, not/);
    write('v/t1/src/auth/public-config.js', publicConfigModule(v));
    // headers lost (a deploy without the build's _headers), and a root CSP that would block the project
    write('_headers', `/\n  Content-Security-Policy: default-src 'self'\n`);
    r = await check({ app });
    assert.deepEqual(fails(r).map((l) => l.step), [STEPS.pages, STEPS.pages]);
    assert.match(fails(r)[0].label, /\/auth\/callback\/ lacks Cache-Control: no-store, X-Frame-Options: DENY, Referrer-Policy: no-referrer, a CSP whose connect-src reaches/);
    assert.match(fails(r)[1].label, /the root page's CSP blocks/);
    write('_headers', `${headersFile(new URL(furl).origin)}/\n  Content-Security-Policy: default-src 'self'; connect-src 'self' ${new URL(furl).origin}\n`);
    r = await check({ app });
    assert.equal(r.ok, true, JSON.stringify(fails(r)));
    assert.ok(appLines(r).some((l) => l.label === "app: the root page's CSP lets the app reach the project"));
    // an address with nothing there
    r = await check({ app: 'http://127.0.0.1:9' });
    assert.match(fails(r).at(-1).label, /version\.json could not be read/);
  } finally {
    await new Promise((r) => pages.close(r));
    rmSync(site, { recursive: true, force: true });
  }
});

test('checker helpers: exposed schemas (PostgREST 12 and 13 wording), CSP connect rules, the published config', () => {
  assert.deepEqual(exposedSchemasFrom({ code: 'PGRST106', message: 'The schema must be one of the following: public, graphql_public' }), ['public', 'graphql_public']);
  assert.deepEqual(exposedSchemasFrom({ code: 'PGRST106', message: 'Invalid schema: hm_private', hint: 'Only the following schemas are exposed: public, graphql_public' }), ['public', 'graphql_public']);
  assert.equal(exposedSchemasFrom({ code: 'PGRST106', message: 'Invalid schema' }), null);
  assert.equal(exposedSchemasFrom(null), null);
  const p = PROJECT_URL;
  assert.equal(cspAllowsConnect('', p), true);
  assert.equal(cspAllowsConnect("default-src 'self'", p), false);
  assert.equal(cspAllowsConnect(`default-src 'self'; connect-src 'self' ${p}`, p), true);
  assert.equal(cspAllowsConnect("connect-src 'self' https://*.supabase.co", p), true);
  assert.equal(cspAllowsConnect("connect-src 'self' https:", p), true);
  assert.equal(cspAllowsConnect("connect-src 'self' https://*.example.com", p), false);
  assert.equal(cspAllowsConnect("script-src 'self'", p), true, 'no connect-src and no default-src: not restricted');
  assert.equal(cspAllowsConnect(headersFile(new URL(p).origin).match(/Content-Security-Policy: (.*)/)[1], p), true, "the build's own /auth/* CSP");
  assert.deepEqual(parsePublicConfig(publicConfigModule(validatePublicConfig({ url: PROJECT_URL, key: PROD_KEY }))), { enabled: true, url: PROJECT_URL, key: PROD_KEY, mode: 'production' });
  assert.deepEqual(parsePublicConfig(publicConfigModule({ enabled: false })), { enabled: false });
  assert.equal(parsePublicConfig('export default 1;'), null);
});

test('checker lists match the repository: the six tables, the fake, the Site URL', () => {
  const sql = migrationFiles().map((f) => read(`supabase/migrations/${f}`)).join('\n');
  const created = [...sql.matchAll(/create table if not exists public\.(\w+)/g)].map((m) => m[1]);
  assert.deepEqual([...TABLES].sort(), [...created].sort());
  assert.deepEqual([...TABLES].sort(), Object.keys(FAKE_TABLES).sort());
  assert.match(read('docs/AUTH.md'), /Site URL: `https:\/\/app\.hushmallow\.com`/);
  assert.match(read('supabase/README.md'), /exactly `https:\/\/app\.hushmallow\.com`/);
});
