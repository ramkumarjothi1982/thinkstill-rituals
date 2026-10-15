// What the staging tools need, from the owner's computer or a cloud session (tools/staging-env.mjs):
// keys derived from one root secret, the private file when there is one (and never quietly over a
// root that holds other keys), SQL and the project's keys through the Management API (against the
// stand-in that checks the API's own document), the staging guard (whenever a token is there), the
// database address checks (and what a tool says when they can't cover everything), and the
// read-only look at the owner's Cloudflare account.

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deriveSecrets, rootProblems, stagingSecrets, managementSql, projectKeys, guardStaging, pagesProject, listPagesProjects, guardPages, resolveRun, runCaveats, createManagementApi, ROOT_ENV } from '../tools/staging-env.mjs';
import { problemsWith, makeSecrets } from '../tools/staging-secrets.mjs';
import { standIn, emptyDatabase, TOKEN, REF, STAGING } from './management-api-stand-in.mjs';

const ROOT_SECRET = 'q7Vd-Lm2#xR9pT4!wZ6nB8@kH3sJ5cF1yG0uE';     // a test value only
const SITE = 'https://hushmates-staging.pages.dev';
const noFile = join(tmpdir(), 'hushmates-no-such-staging.env');

test('the staging keys derived from the root: complete, stable across sessions, different for another project or root', () => {
  const a = deriveSecrets({ root: ROOT_SECRET, ref: REF, origin: SITE });
  assert.deepEqual(problemsWith(a), []);
  assert.deepEqual(deriveSecrets({ root: ROOT_SECRET, ref: REF, origin: `${SITE}/` }), a, 'the same root and project must give the same keys');
  const other = deriveSecrets({ root: ROOT_SECRET, ref: 'otherrefabcdefghijkl', origin: SITE });
  const otherRoot = deriveSecrets({ root: `${ROOT_SECRET}x`, ref: REF, origin: SITE });
  for (const k of ['HUSHMATES_DATA_KEYS', 'HUSHMATES_MAC_KEY', 'HUSHMATES_JOB_SECRET']) {
    assert.notEqual(other[k], a[k], `${k} is the same for another project`);
    assert.notEqual(otherRoot[k], a[k], `${k} is the same for another root`);
  }
  const keys = JSON.parse(a.HUSHMATES_DATA_KEYS);
  assert.notEqual(keys.k1, a.HUSHMATES_MAC_KEY, 'the data key and the MAC key must differ');
  assert.equal(a.HUSHMATES_ALLOWED_ORIGINS, SITE);
});

test('a weak root secret is refused, and the refusal never repeats it', () => {
  for (const weak of ['', 'short', 'a'.repeat(40), 'abababababababababababababababababab', ` ${ROOT_SECRET}`]) {
    const problems = rootProblems(weak);
    assert.ok(problems.length, `accepted ${JSON.stringify(weak)}`);
    if (weak.length > 4) assert.ok(problems.every((p) => !p.includes(weak.trim())));
  }
  assert.deepEqual(rootProblems(ROOT_SECRET), []);
  assert.throws(() => deriveSecrets({ root: 'short', ref: REF, origin: SITE }), /at least 32/);
  assert.throws(() => deriveSecrets({ root: ROOT_SECRET, ref: 'PROD', origin: SITE }), /20 lowercase/);
});

test('which secrets a run uses: the private file, or the root, both only when they agree, otherwise a clear stop', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hushmates-env-'));
  try {
    const file = join(dir, 'staging.env');
    const made = makeSecrets({ origin: SITE, projectRef: REF });
    writeFileSync(file, made.file);
    const fromFile = stagingSecrets({ ref: REF, site: SITE, env: {}, file });
    assert.equal(fromFile.source, 'file');
    assert.equal(fromFile.secrets.HUSHMATES_MAC_KEY, made.env.HUSHMATES_MAC_KEY);
    // a file left over from another set-up never quietly wins over the root: remove one
    let said = '';
    assert.throws(() => { try { stagingSecrets({ ref: REF, site: SITE, env: { [ROOT_ENV]: ROOT_SECRET }, file }); } catch (e) { said = e.message; throw e; } }, /remove one/);
    for (const secret of [ROOT_SECRET, made.env.HUSHMATES_MAC_KEY, made.env.HUSHMATES_JOB_SECRET]) assert.ok(!said.includes(secret), 'the refusal repeats a secret');
    // a file that holds the keys the root gives this project agrees with it
    const derived = deriveSecrets({ root: ROOT_SECRET, ref: REF, origin: SITE });
    writeFileSync(file, `${Object.entries(derived).map(([k, v]) => `${k}='${v}'`).join('\n')}\n`);
    assert.equal(stagingSecrets({ ref: REF, site: SITE, env: { [ROOT_ENV]: ROOT_SECRET }, file }).source, 'file');
    assert.throws(() => stagingSecrets({ ref: 'otherrefabcdefghijkl', site: SITE, env: { [ROOT_ENV]: ROOT_SECRET }, file }), /remove one/, 'the same file and root for another project');
    const fromRoot = stagingSecrets({ ref: REF, site: SITE, env: { [ROOT_ENV]: ROOT_SECRET }, file: noFile });
    assert.equal(fromRoot.source, 'root');
    assert.deepEqual(fromRoot.secrets, derived);
    assert.throws(() => stagingSecrets({ ref: REF, site: SITE, env: {}, file: noFile }), /STAGING_CLOUD\.md/);
    assert.throws(() => stagingSecrets({ ref: REF, env: { [ROOT_ENV]: ROOT_SECRET }, file: noFile }), /--site/);
    assert.throws(() => stagingSecrets({ ref: REF, site: 'http://insecure.example', env: { [ROOT_ENV]: ROOT_SECRET }, file: noFile }), /https/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('SQL through the Management API behaves like the database connection: rows, parameters as parameters, dates', async () => {
  const db = await emptyDatabase();
  const s = await standIn({ database: db.name, project: STAGING });
  try {
    const sql = managementSql({ api: createManagementApi({ token: TOKEN, base: s.base }), ref: REF });
    const tricky = "it's a 'quote'; drop table x; --";
    const { rows } = await sql.query('select $1::text as t, $2::int + 1 as n, $3::timestamptz as at, $4::jsonb as j', [tricky, 41, new Date('2026-10-15T01:02:03Z'), JSON.stringify({ ok: true })]);
    assert.equal(rows[0].t, tricky);
    assert.equal(rows[0].n, 42);
    assert.equal(new Date(rows[0].at).toISOString(), '2026-10-15T01:02:03.000Z');
    assert.deepEqual(rows[0].j, { ok: true });
    assert.deepEqual((await sql.query('select 1 as one')).rows, [{ one: 1 }]);
    assert.deepEqual(s.state.problems, []);
    // an answer that isn't rows is an error, never "no rows" (several security checks pass on no rows)
    for (const odd of [null, {}, 'text', { result: [] }]) {
      await assert.rejects(managementSql({ api: { query: async () => odd }, ref: REF }).query('select 1'), /instead of rows/, JSON.stringify(odd));
    }
  } finally { await s.close(); await db.drop(); }
});

test('the project’s keys: read with reveal, refused if they come back masked', async () => {
  const db = await emptyDatabase();
  const s = await standIn({ database: db.name, project: STAGING });
  try {
    const api = createManagementApi({ token: TOKEN, base: s.base });
    assert.deepEqual(await projectKeys({ api, ref: REF }), { anonKey: 'sb_publishable_stand_in', serviceKey: 'sb_secret_stand_in_full_value_0001' });
    const masked = { ...api, apiKeys: (ref) => api.apiKeys(ref) };            // a token or client that doesn't reveal
    await assert.rejects(projectKeys({ api: masked, ref: REF }), /masked/);
    const legacy = { apiKeys: async () => [{ name: 'anon', type: 'legacy', api_key: 'eyJhbGciOiJIUzI1NiJ9.anon.sig' }, { name: 'service_role', type: 'legacy', api_key: 'eyJhbGciOiJIUzI1NiJ9.service.sig' }] };
    assert.deepEqual(await projectKeys({ api: legacy, ref: REF }), { anonKey: 'eyJhbGciOiJIUzI1NiJ9.anon.sig', serviceKey: 'eyJhbGciOiJIUzI1NiJ9.service.sig' });
    assert.deepEqual(s.state.problems, []);
  } finally { await s.close(); await db.drop(); }
});

test('the staging guard, and a run in a cloud session: refused for anything but the staging-only account', async () => {
  const db = await emptyDatabase();
  try {
    for (const [why, o] of [
      ['a production-looking name', { project: { ...STAGING, name: 'hushmallow' } }],
      ['outside Sydney', { project: { ...STAGING, region: 'us-east-1' } }],
      ['paused', { project: { ...STAGING, status: 'INACTIVE' } }],
      ['a token that also reaches production', { project: STAGING, others: [{ ...STAGING, ref: 'prodrefabcdefghijklm', name: 'Hushmallow' }] }],
      ['a token that also reaches another project with "staging" in its name', { project: STAGING, others: [{ ...STAGING, ref: 'otherrefabcdefghijkl', name: 'hushmallow-staging-old' }] }],
      ['a token whose list of projects is empty', { project: STAGING, list: [] }],
      ['a token whose list doesn’t include this project', { project: STAGING, list: [{ ...STAGING, ref: 'otherrefabcdefghijkl' }] }],
    ]) {
      const s = await standIn({ database: db.name, ...o });
      try {
        const api = createManagementApi({ token: TOKEN, base: s.base });
        assert.equal((await guardStaging({ api, ref: REF })).ok, false, why);
        await assert.rejects(resolveRun({ ref: REF, site: SITE, env: { [ROOT_ENV]: ROOT_SECRET }, file: noFile, api }), /refused/, why);
        assert.ok(!s.state.calls.some((c) => c.includes('api-keys') || c.includes('database/query')), `${why}: it read keys or the database before refusing`);
      } finally { await s.close(); }
    }
    const s = await standIn({ database: db.name, project: STAGING });
    try {
      const api = createManagementApi({ token: TOKEN, base: s.base });
      assert.equal((await guardStaging({ api, ref: REF })).ok, true);
      const run = await resolveRun({ ref: REF, site: SITE, env: { [ROOT_ENV]: ROOT_SECRET }, file: noFile, api });
      assert.equal(run.via, 'Management API');
      assert.equal(run.guarded, true);
      assert.equal(run.source, 'root');
      assert.equal(run.serviceKey, 'sb_secret_stand_in_full_value_0001');
      assert.equal(run.adminPg, undefined);
      assert.deepEqual((await run.db.query('select 2 as two')).rows, [{ two: 2 }]);
      await assert.rejects(resolveRun({ ref: 'Not-A-Ref', site: SITE, env: { [ROOT_ENV]: ROOT_SECRET }, file: noFile, api }), /20 lowercase/);
      // the secrets are there, but neither a database address nor an access token
      await assert.rejects(resolveRun({ ref: REF, site: SITE, env: { [ROOT_ENV]: ROOT_SECRET }, file: noFile }), /SUPABASE_ACCESS_TOKEN/);
    } finally { await s.close(); }
  } finally { await db.drop(); }
});

test('a run on the owner’s computer: the database address must be this project’s, over verify-full, and the guard runs when a token is there', async () => {
  const env = { [ROOT_ENV]: ROOT_SECRET, HUSHMATES_STAGING_ANON_KEY: 'sb_publishable_x', HUSHMATES_STAGING_SERVICE_KEY: 'sb_secret_x' };
  const pooler = `postgresql://postgres.${REF}:pw-not-for-messages@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres`;
  const direct = `postgresql://postgres:pw-not-for-messages@db.${REF}.supabase.co:5432/postgres`;
  for (const url of [`${pooler}?sslmode=verify-full`, `${pooler}?sslmode=verify-full&sslrootcert=/home/x/supabase-ca.crt`, `${direct}?sslmode=verify-full`, 'postgresql://x@127.0.0.1/db']) {
    const ok = await resolveRun({ ref: REF, site: SITE, file: noFile, env: { ...env, HUSHMATES_ADMIN_PG: url } });
    assert.equal(ok.via, 'database connection', url);
    assert.equal(ok.guarded, false, 'no token here: the guard couldn’t run, and the run says so');
    assert.equal(ok.local, url.includes('127.0.0.1'), url);
  }
  for (const [why, url, re] of [
    ['no verify-full', pooler, /verify-full/],
    ['verify-full, then disable (pg uses the last)', `${pooler}?sslmode=verify-full&sslmode=disable`, /verify-full, once/],
    ['an ssl= setting', `${pooler}?sslmode=verify-full&ssl=false`, /don’t accept \(ssl\)/],
    ['a host= setting (pg would connect there instead)', `${direct}?sslmode=verify-full&host=db.prodrefabcdefghijklm.supabase.co`, /don’t accept \(host\)/],
    ['a user= setting (pg would sign in as it)', `${pooler}?sslmode=verify-full&user=postgres.prodrefabcdefghijklm`, /don’t accept \(user\)/],
    ['a local address with a host= setting', 'postgresql://x@127.0.0.1/db?host=db.prodrefabcdefghijklm.supabase.co', /don’t accept \(host\)/],
    ['a password with a bare ? and @ (part of it lands in the query)', `postgresql://postgres.${REF}:x@h?pw-not-for-messages@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres?sslmode=verify-full`, /don’t accept: .*encoded/],
    // digits first: the address reads them as the port, and the rest as a setting that looks like one
    ['a password of digits, a bare ? and letters', `postgresql://postgres:2024?pwnotformessages=@db.${REF}.supabase.co:5432/postgres?sslmode=verify-full`, /don’t accept: .*encoded/],
    ['a password of a digit, a / and a bare ?', `postgresql://postgres:7/Opensesame?pwnotformessages=x@db.${REF}.supabase.co:5432/postgres?sslmode=verify-full`, /don’t accept: .*encoded/],
    ['another project’s pooler user', 'postgresql://postgres.prodrefabcdefghijklm:pw-not-for-messages@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres?sslmode=verify-full', /different project/],
    ['a host that only contains the reference', `postgresql://postgres:pw-not-for-messages@db.${REF}.supabase.co.example.net:5432/postgres?sslmode=verify-full`, /doesn’t look like/],
    ['a pooler-like host somewhere else', `postgresql://postgres.${REF}:pw-not-for-messages@pooler.supabase.com.example.net:5432/postgres?sslmode=verify-full`, /doesn’t look like/],
    ['an unrelated host', 'postgresql://postgres:pw-not-for-messages@db.example.com:5432/postgres?sslmode=verify-full', /doesn’t look like/],
    ['not a postgres address', `https://db.${REF}.supabase.co/?sslmode=verify-full`, /postgres:\/\//],
  ]) {
    await assert.rejects(resolveRun({ ref: REF, site: SITE, file: noFile, env: { ...env, HUSHMATES_ADMIN_PG: url } }), (e) => re.test(e.message) && !/pw-?not-?for-?messages|Opensesame|2024/.test(e.message), why);
  }
  await assert.rejects(resolveRun({ ref: REF, site: SITE, file: noFile, env: { [ROOT_ENV]: ROOT_SECRET, HUSHMATES_ADMIN_PG: 'postgresql://x@127.0.0.1/db' } }), /ANON_KEY/);
  // with a token (or an api) there too, the staging guard runs first, as in a cloud session
  const db = await emptyDatabase();
  try {
    for (const [project, want] of [[{ ...STAGING, name: 'hushmallow' }, false], [STAGING, true]]) {
      const s = await standIn({ database: db.name, project });
      try {
        const api = createManagementApi({ token: TOKEN, base: s.base });
        const run = resolveRun({ ref: REF, site: SITE, file: noFile, api, env: { ...env, HUSHMATES_ADMIN_PG: `${pooler}?sslmode=verify-full` } });
        if (!want) await assert.rejects(run, /refused/);
        else assert.deepEqual([(await run).via, (await run).guarded, (await run).local], ['database connection', true, false]);
        assert.ok(s.state.calls.includes('GET /v1/projects/{ref}'), 'the guard didn’t run');
        if (want) assert.ok(s.state.calls.includes('GET /v1/projects'), 'the guard didn’t look at what else the token reaches');
      } finally { await s.close(); }
    }
    // an address on this computer (a tunnel, say): the guard runs on the project, but the database
    // can't be matched against it, and the run says so
    const s = await standIn({ database: db.name, project: STAGING });
    try {
      const run = await resolveRun({ ref: REF, site: SITE, file: noFile, api: createManagementApi({ token: TOKEN, base: s.base }), env: { ...env, HUSHMATES_ADMIN_PG: 'postgresql://x@localhost:6543/postgres' } });
      assert.deepEqual([run.guarded, run.local], [true, true]);
      assert.deepEqual(runCaveats(run), ['· The database address is on this computer, so it can’t be matched against --project-ref: the database checks only cover what it points to.']);
    } finally { await s.close(); }
  } finally { await db.drop(); }
});

test('what a tool says before a run about what its guards couldn’t cover, and never that a local address was matched', () => {
  assert.deepEqual(runCaveats({ guarded: true, local: false }), [], 'the guard ran and the address matched the project: nothing to say');
  const [noToken] = runCaveats({ guarded: false, local: false });
  assert.match(noToken, /^· No SUPABASE_ACCESS_TOKEN here, so the staging guard .* couldn’t run: the database address is only matched against --project-ref\.$/);
  const both = runCaveats({ guarded: false, local: true });
  assert.equal(both.length, 2);
  assert.match(both[0], /couldn’t run\.$/);
  assert.match(both[1], /on this computer, so it can’t be matched against --project-ref/);
  assert.ok(!both.some((l) => /only matched against/.test(l)), 'a local address is said to be matched');
});

test('the Pages project lookup reads only, and tells "not there" from an error', async () => {
  const calls = [];
  const fake = (status, body) => async (url, init) => { calls.push({ url, method: init?.method || 'GET', auth: init?.headers?.authorization }); return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }); };
  const accountId = 'b'.repeat(32);
  const found = await pagesProject({ token: 't', accountId, name: 'hushmates-staging', fetch: fake(200, { success: true, result: { name: 'hushmates-staging', subdomain: 'hushmates-staging.pages.dev', production_branch: 'main' } }) });
  assert.deepEqual(found, { exists: true, subdomain: 'hushmates-staging.pages.dev', productionBranch: 'main' });
  assert.deepEqual(calls[0], { url: `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/hushmates-staging`, method: 'GET', auth: 'Bearer t' });
  assert.deepEqual(await pagesProject({ token: 't', accountId, name: 'hushmates-staging', fetch: fake(404, { success: false, errors: [{ code: 8000007, message: 'Project not found' }] }) }), { exists: false });
  await assert.rejects(pagesProject({ token: 't', accountId, name: 'hushmates-staging', fetch: fake(403, { success: false, errors: [{ code: 10000, message: 'Authentication error' }] }) }), /403: Authentication error/);
  await assert.rejects(pagesProject({ token: 't', accountId: 'nope', name: 'x', fetch: fake(200, {}) }), /32-character/);
  await assert.rejects(pagesProject({ token: 't', accountId, name: '../evil', fetch: fake(200, {}) }), /lowercase/);
  assert.ok(calls.every((c) => c.method === 'GET'));
});

test('the Cloudflare check reads every page of Pages projects, refuses an account with anything but staging, and finds the project at the site', async () => {
  const accountId = 'c'.repeat(32);
  const staging = Array.from({ length: 11 }, (_, i) => ({ name: `hushmates-staging-${i}`, subdomain: `hushmates-staging-${i}.pages.dev`, production_branch: 'main' }));
  const target = { name: 'hushmates-staging', subdomain: 'hushmates-staging-7xq.pages.dev', production_branch: 'production' };
  const calls = [];
  // as Cloudflare answers: ?page=N&per_page=M, with result_info.total_pages
  const account = (projects) => async (url, init) => {
    const u = new URL(url);
    calls.push({ path: u.pathname, method: init?.method || 'GET', auth: init?.headers?.authorization });
    const page = Number(u.searchParams.get('page')); const per = Number(u.searchParams.get('per_page'));
    const result = projects.slice((page - 1) * per, page * per);
    return Response.json({ success: true, errors: [], result, result_info: { page, per_page: per, count: result.length, total_count: projects.length, total_pages: Math.max(1, Math.ceil(projects.length / per)) } });
  };
  const check = (projects, o = {}) => guardPages({ token: 't', accountId, site: 'https://hushmates-staging-7xq.pages.dev', fetch: account(projects), ...o });
  const found = { ok: true, project: { name: 'hushmates-staging', subdomain: 'hushmates-staging-7xq.pages.dev', productionBranch: 'production' } };

  // on the second page, at an address with a suffix: its real name and production branch
  assert.equal((await listPagesProjects({ token: 't', accountId, fetch: account([...staging, target]) })).length, 12);
  assert.deepEqual(await check([...staging, target]), found);
  assert.deepEqual(await check([...staging, target], { name: 'hushmates-staging' }), found);
  // any project without "staging" in its name, even on a later page: a separate account for staging
  let r = await check([...staging, { name: 'hushmallow-web', subdomain: 'hushmallow-web.pages.dev' }, target]);
  assert.equal(r.ok, false);
  assert.match(r.why, /separate Cloudflare account for staging/);
  // nothing at the site's address: it says which staging addresses there are, and never makes one
  r = await check(staging.slice(0, 2));
  assert.equal(r.ok, false);
  assert.match(r.why, /no Pages project is at https:\/\/hushmates-staging-7xq\.pages\.dev .*https:\/\/hushmates-staging-0\.pages\.dev, https:\/\/hushmates-staging-1\.pages\.dev/);
  assert.match(r.why, /never creates one/);
  assert.match((await check([])).why, /it has none/);
  // --pages-project: that one, and it must be at the site
  r = await check([...staging, target], { name: 'hushmates-staging-3' });
  assert.match(r.why, /is at https:\/\/hushmates-staging-3\.pages\.dev, not https:\/\/hushmates-staging-7xq\.pages\.dev: run again with --site https:\/\/hushmates-staging-3\.pages\.dev/);
  assert.match((await check([target], { name: 'hushmates-staging-nope' })).why, /no Pages project called "hushmates-staging-nope"/);
  assert.match((await check([{ name: 'hushmates-staging', production_branch: 'main' }], { name: 'hushmates-staging' })).why, /has no address yet/);
  assert.match((await check([target], { name: '../evil' })).why, /lowercase/);
  // an error is an error, not "no projects"
  await assert.rejects(guardPages({ token: 't', accountId, site: 'https://x.pages.dev', fetch: async () => Response.json({ success: false, errors: [{ code: 10000, message: 'Authentication error' }] }, { status: 403 }) }), /403.*Authentication error/);
  await assert.rejects(listPagesProjects({ token: 't', accountId: 'nope', fetch: account([]) }), /32-character/);
  assert.ok(calls.length > 10 && calls.every((c) => c.method === 'GET' && c.auth === 'Bearer t' && c.path === `/client/v4/accounts/${accountId}/pages/projects`));
});

test('the Management API client waits and asks again when it is rate limited (429), then gives up', async () => {
  const waits = [];
  let n = 0;
  const fetch = async () => { n += 1; return n < 3 ? new Response('{"message":"Too many requests"}', { status: 429, headers: { 'x-ratelimit-reset': '7' } }) : new Response('[{"ok":1}]', { status: 201 }); };
  const api = createManagementApi({ token: 't', base: 'http://x', fetch, wait: async (ms) => { waits.push(ms); } });
  assert.deepEqual(await api.query(REF, 'select 1 as ok'), [{ ok: 1 }]);
  assert.deepEqual(waits, [7000, 7000]);
  const always = createManagementApi({ token: 't', base: 'http://x', fetch: async () => new Response('{"message":"slow down"}', { status: 429 }), wait: async () => {} });
  await assert.rejects(always.query(REF, 'select 1'), (e) => e.status === 429);
});
