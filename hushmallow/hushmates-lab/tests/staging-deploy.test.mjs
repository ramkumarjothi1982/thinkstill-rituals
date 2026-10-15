// The staging deploy tool (tools/staging-deploy.mjs) against a local stand-in for Supabase's
// Management API (tests/management-api-stand-in.mjs: every request checked against the API's own
// OpenAPI document, SQL on a real, empty local database), so the tool is tested before it ever
// meets the real API: its refusals, its dry run, a full deploy (the migrations really applied), a
// second run changing nothing, and publishing only to a Pages project the owner made.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deployStaging, createManagementApi, functionFiles, AUTH_CONFIG, makePublisher } from '../tools/staging-deploy.mjs';
import { standIn, emptyDatabase, TOKEN, REF, STAGING } from './management-api-stand-in.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const SITE = 'https://hushmates-staging-test.pages.dev';
const SECRETS = {
  HUSHMATES_DATA_KEYS: JSON.stringify({ k1: Buffer.alloc(32, 3).toString('base64') }), HUSHMATES_DATA_KEY_ID: 'k1',
  HUSHMATES_MAC_KEY: Buffer.alloc(32, 4).toString('base64'), HUSHMATES_JOB_SECRET: 'job-secret-for-these-tests-only', HUSHMATES_ALLOWED_ORIGINS: SITE,
};
const quiet = { log() {} };

test('it refuses anything that isn’t clearly the staging project', async () => {
  const db = await emptyDatabase();
  try {
    for (const [why, project, others, site, extra] of [
      ['a production-looking name', { ...STAGING, name: 'hushmallow' }, [], SITE, {}],
      ['outside Sydney', { ...STAGING, region: 'us-east-1' }, [], SITE, {}],
      ['a token that also reaches another project', STAGING, [{ ...STAGING, ref: 'prodrefabcdefghijklm', name: 'Hushmallow' }], SITE, {}],
      ['a site the secrets don’t name', STAGING, [], 'https://elsewhere.pages.dev', {}],
      ['AI set in the secrets', STAGING, [], SITE, { HUSHMATES_AI_URL: 'https://ai.example' }],
    ]) {
      const s = await standIn({ database: db.name, project, others });
      try {
        const r = await deployStaging({ api: createManagementApi({ token: TOKEN, base: s.base }), ref: REF, site, secrets: { ...SECRETS, ...extra }, apply: true, log: quiet });
        assert.equal(r.ok, false, why);
        assert.equal(r.steps.at(-1).status, 'refused', why);
        assert.ok(!s.state.calls.some((c) => !c.startsWith('GET')), `${why}: it changed something before refusing (${s.state.calls.join(', ')})`);
      } finally { await s.close(); }
    }
  } finally { await db.drop(); }
});

test('a dry run reads and changes nothing; --apply deploys everything, each request as the API documents it; a second run changes nothing', async () => {
  const db = await emptyDatabase();
  const s = await standIn({ database: db.name, project: STAGING });
  try {
    const api = createManagementApi({ token: TOKEN, base: s.base });
    const dry = await deployStaging({ api, ref: REF, site: SITE, secrets: SECRETS, apply: false, log: quiet });
    assert.ok(dry.ok, JSON.stringify(dry.steps));
    assert.ok(!s.state.calls.some((c) => c.startsWith('PATCH') || c.includes('/secrets') && c.startsWith('POST') || c.includes('/functions/deploy')), s.state.calls.join(', '));
    assert.equal((await s.pool.query("select count(*)::int n from pg_namespace where nspname = 'hushmates'")).rows[0].n, 0, 'the dry run changed the database');
    assert.equal(dry.steps.filter((x) => /^migration/.test(x.step) && x.status === 'would').length, 3);

    const published = [];
    const r = await deployStaging({ api, ref: REF, site: SITE, secrets: SECRETS, apply: true, log: quiet, publishSite: async (o) => { published.push(o); return { detail: 'published (test)' }; } });
    assert.deepEqual(s.state.problems, [], 'a request the API would refuse');
    assert.ok(r.ok, JSON.stringify(r.steps.filter((x) => x.status === 'failed')));
    // the migrations really ran, and are recorded where the Supabase CLI records them
    assert.equal((await s.pool.query('select count(*)::int n from supabase_migrations.schema_migrations')).rows[0].n, 3);
    assert.equal((await s.pool.query("select count(*)::int n from pg_tables where schemaname = 'hushmates'")).rows[0].n > 10, true);
    assert.equal((await s.pool.query('select hushmates_api.settings() -> \'ai\' ->> \'enabled\' as on')).rows[0].on, 'false');
    // the exposed schema, sign-in, secrets, the function
    assert.match(s.state.postgrest.db_schema, /hushmates_api/);
    for (const [k, v] of Object.entries(AUTH_CONFIG)) assert.equal(s.state.auth[k], v, k);
    assert.match(s.state.auth.mailer_templates_magic_link_content, /\{\{ \.Token \}\}/);
    assert.equal(s.state.auth.site_url, SITE);
    assert.deepEqual(s.state.secrets.map((x) => x.name).sort(), Object.keys(SECRETS).sort());
    const fn = s.state.functions.hushmates;
    assert.equal(fn.verify_jwt, false);
    assert.equal(fn.entrypoint_path, 'supabase/functions/hushmates/index.ts');
    for (const f of functionFiles()) assert.ok(fn.files[f]?.equals(readFileSync(join(ROOT, f))), `${f} wasn't uploaded as it is`);
    assert.deepEqual(published, [{ supabaseUrl: `https://${REF}.supabase.co`, anonKey: 'sb_publishable_stand_in', site: SITE }]);
    // extensions and Vault don't exist on this database: said so, not pretended
    assert.ok(r.steps.some((x) => /pg_cron/.test(x.step) && x.status === 'skipped'));
    assert.ok(r.steps.some((x) => /Vault/.test(x.step) && x.status === 'skipped'));

    const again = await deployStaging({ api, ref: REF, site: SITE, secrets: SECRETS, apply: true, log: quiet, publishSite: async () => ({ detail: 'again' }) });
    assert.ok(again.ok);
    assert.ok(again.steps.filter((x) => /^migration|schema is exposed|sign-in by email code/.test(x.step)).every((x) => x.status === 'unchanged'), JSON.stringify(again.steps));
    assert.equal((await s.pool.query('select count(*)::int n from supabase_migrations.schema_migrations')).rows[0].n, 3);
  } finally { await s.close(); await db.drop(); }
});

test('the Vault secrets go in as query parameters, never in the SQL text', () => {
  const src = readFileSync(join(ROOT, 'tools', 'staging-deploy.mjs'), 'utf8');
  assert.match(src, /vault\.create_secret\(\$1, \$2\)', \[value, name\]/);
  assert.ok(!/vault\.create_secret\('\$\{/.test(src));
});

test('the stand-in refuses what the API would refuse (so the passes above mean something)', async () => {
  const db = await emptyDatabase();
  const s = await standIn({ database: db.name, project: STAGING });
  try {
    const api = createManagementApi({ token: TOKEN, base: s.base });
    await assert.rejects(api.patchAuth(REF, { mailer_otp_length: 4 }), (e) => e.status === 400);
    await assert.rejects(api.patchAuth(REF, { made_up_field: true }), (e) => e.status === 400);
    await assert.rejects(api.createSecrets(REF, [{ name: 'SUPABASE_URL', value: 'x' }]), (e) => e.status === 400);
    await assert.rejects(api.getProject('Not-A-Ref'), (e) => e.status === 400);
    await assert.rejects(createManagementApi({ token: 'wrong', base: s.base }).getProject(REF), (e) => e.status === 401);
    const form = new FormData();
    form.append('metadata', JSON.stringify({ name: 'hushmates', verify_jwt: false }));          // no entrypoint_path
    form.append('file', new Blob(['x']), 'supabase/functions/hushmates/index.ts');
    await assert.rejects(api.deployFunction(REF, 'hushmates', form), (e) => e.status === 400);
    assert.equal(s.state.problems.length, 5);                                  // (the wrong token is refused at the door, before any body check)
  } finally { await s.close(); await db.drop(); }
});

test('publishing: only to the Pages project the owner made, at the address they were given, on its production branch', async () => {
  const env = { CLOUDFLARE_API_TOKEN: 'cf-test-token', CLOUDFLARE_ACCOUNT_ID: 'a'.repeat(32) };
  const ran = [];
  const run = (cmd, args) => { ran.push(args.join(' ')); return { status: 0, stdout: '', stderr: '' }; };
  const site = 'https://hushmates-staging.pages.dev';
  const opts = { supabaseUrl: `https://${REF}.supabase.co`, anonKey: 'sb_publishable_stand_in', site };
  // no such project: it says so, and creates nothing (wrangler isn't even started)
  let r = await makePublisher({ pagesProject: 'hushmates-staging', env, run, lookup: async () => ({ exists: false }) })(opts);
  assert.equal(r.failed, true);
  assert.match(r.detail, /make it in the dashboard first/);
  assert.deepEqual(ran, []);
  // Cloudflare gave the project another address: it stops and names it
  r = await makePublisher({ pagesProject: 'hushmates-staging', env, run, lookup: async () => ({ exists: true, subdomain: 'hushmates-staging-7xq.pages.dev', productionBranch: 'main' }) })(opts);
  assert.equal(r.failed, true);
  assert.match(r.detail, /--site https:\/\/hushmates-staging-7xq\.pages\.dev/);
  assert.deepEqual(ran, []);
  // the project the owner made: a plain deploy to its production branch, never "project create"
  r = await makePublisher({ pagesProject: 'hushmates-staging', env, run, lookup: async () => ({ exists: true, subdomain: 'hushmates-staging.pages.dev', productionBranch: 'production' }) })(opts);
  assert.ok(!r.failed, r.detail);
  assert.equal(ran.length, 1);
  assert.match(ran[0], /^--yes wrangler@\S+ pages deploy \S+dist\/site --project-name hushmates-staging --branch production --commit-dirty=true$/);
  assert.ok(!ran.some((a) => /project create/.test(a)));
  // and the source never asks wrangler to create one
  assert.ok(!/'project', 'create'/.test(readFileSync(join(ROOT, 'tools', 'staging-deploy.mjs'), 'utf8')));
});
