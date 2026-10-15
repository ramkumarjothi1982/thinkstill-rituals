// What the staging tools need, from the owner's computer or a cloud session (tools/staging-env.mjs):
// keys derived from one root secret, the private file preferred when there is one, SQL and the
// project's keys through the Management API (against the stand-in that checks the API's own
// document), the staging guard, and the read-only look at the owner's Pages project.

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deriveSecrets, rootProblems, stagingSecrets, managementSql, projectKeys, guardStaging, pagesProject, resolveRun, createManagementApi, ROOT_ENV } from '../tools/staging-env.mjs';
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

test('which secrets a run uses: the private file when there is one, otherwise the root, otherwise a clear stop', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hushmates-env-'));
  try {
    const file = join(dir, 'staging.env');
    const made = makeSecrets({ origin: SITE, projectRef: REF });
    writeFileSync(file, made.file);
    const fromFile = stagingSecrets({ ref: REF, site: SITE, env: { [ROOT_ENV]: ROOT_SECRET }, file });
    assert.equal(fromFile.source, 'file');
    assert.equal(fromFile.secrets.HUSHMATES_MAC_KEY, made.env.HUSHMATES_MAC_KEY);
    const fromRoot = stagingSecrets({ ref: REF, site: SITE, env: { [ROOT_ENV]: ROOT_SECRET }, file: noFile });
    assert.equal(fromRoot.source, 'root');
    assert.deepEqual(fromRoot.secrets, deriveSecrets({ root: ROOT_SECRET, ref: REF, origin: SITE }));
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
    for (const [why, project, others] of [
      ['a production-looking name', { ...STAGING, name: 'hushmallow' }, []],
      ['outside Sydney', { ...STAGING, region: 'us-east-1' }, []],
      ['paused', { ...STAGING, status: 'INACTIVE' }, []],
      ['a token that also reaches production', STAGING, [{ ...STAGING, ref: 'prodrefabcdefghijklm', name: 'Hushmallow' }]],
    ]) {
      const s = await standIn({ database: db.name, project, others });
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
      const run = await resolveRun({ ref: REF, site: SITE, env: { [ROOT_ENV]: ROOT_SECRET }, file: noFile, api });
      assert.equal(run.via, 'Management API');
      assert.equal(run.source, 'root');
      assert.equal(run.serviceKey, 'sb_secret_stand_in_full_value_0001');
      assert.equal(run.adminPg, undefined);
      assert.deepEqual((await run.db.query('select 2 as two')).rows, [{ two: 2 }]);
      await assert.rejects(resolveRun({ ref: 'Not-A-Ref', site: SITE, env: { [ROOT_ENV]: ROOT_SECRET }, file: noFile, api }), /20 lowercase/);
      await assert.rejects(resolveRun({ ref: REF, site: SITE, env: {}, file: noFile }), /STAGING_CLOUD/);
    } finally { await s.close(); }
  } finally { await db.drop(); }
});

test('a run on the owner’s computer: the database address must be this project’s, over verify-full', async () => {
  const env = { [ROOT_ENV]: ROOT_SECRET, HUSHMATES_STAGING_ANON_KEY: 'sb_publishable_x', HUSHMATES_STAGING_SERVICE_KEY: 'sb_secret_x' };
  const ok = await resolveRun({ ref: REF, site: SITE, file: noFile, env: { ...env, HUSHMATES_ADMIN_PG: `postgresql://postgres.${REF}:pw@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres?sslmode=verify-full` } });
  assert.equal(ok.via, 'database connection');
  for (const [why, url, re] of [
    ['no verify-full', `postgresql://postgres.${REF}:pw@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres`, /verify-full/],
    ['another project’s pooler user', 'postgresql://postgres.prodrefabcdefghijklm:pw@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres?sslmode=verify-full', /different project/],
    ['an unrelated host', 'postgresql://postgres:pw@db.example.com:5432/postgres?sslmode=verify-full', /doesn’t look like/],
  ]) await assert.rejects(resolveRun({ ref: REF, site: SITE, file: noFile, env: { ...env, HUSHMATES_ADMIN_PG: url } }), re, why);
  await assert.rejects(resolveRun({ ref: REF, site: SITE, file: noFile, env: { [ROOT_ENV]: ROOT_SECRET, HUSHMATES_ADMIN_PG: 'postgresql://x@127.0.0.1/db' } }), /ANON_KEY/);
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
