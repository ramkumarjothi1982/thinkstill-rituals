// The staging deploy tool (tools/staging-deploy.mjs) against a local stand-in for Supabase's
// Management API (tests/management-api-stand-in.mjs: every request checked against the API's own
// OpenAPI document, SQL on a real, empty local database, every query's text kept), so the tool is
// tested before it ever meets the real API: its refusals (the Cloudflare account's included), a dry
// run that sends nothing but reads (with Vault there too), a full deploy (the migrations really
// applied), a second run that changes no schema or settings, the extensions and Vault that only
// Supabase has, a migration changed after it was applied, and publishing only to the Pages project
// the check found.

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deployStaging, createManagementApi, functionFiles, AUTH_CONFIG, makePublisher, wranglerEnv, WRANGLER } from '../tools/staging-deploy.mjs';
import { standIn, emptyDatabase, TOKEN, REF, STAGING } from './management-api-stand-in.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const SITE = 'https://hushmates-staging-test.pages.dev';
const SECRETS = {
  HUSHMATES_DATA_KEYS: JSON.stringify({ k1: Buffer.alloc(32, 3).toString('base64') }), HUSHMATES_DATA_KEY_ID: 'k1',
  HUSHMATES_MAC_KEY: Buffer.alloc(32, 4).toString('base64'), HUSHMATES_JOB_SECRET: 'job-secret-for-these-tests-only', HUSHMATES_ALLOWED_ORIGINS: SITE,
};
const PAGES = { name: 'hushmates-staging', subdomain: 'hushmates-staging-test.pages.dev', productionBranch: 'main' };
const quiet = { log() {} };

// a read: one select (or with … select, or show) that calls nothing that writes
const isRead = (q) => /^\s*(select|with|show)\b/i.test(q) && !/;\s*\S/.test(q)
  && !/\b(insert|update|delete|merge|create|alter|drop|grant|revoke|truncate|comment|copy|call|do|vacuum|refresh|lock)\b|create_secret|update_secret|set_config|nextval|setval|cron\.schedule|net\.http_/i.test(q);

/** A folder of small migrations, for the tests that don't need the real ones. */
function tinyMigrations(files = { '20260101000000_first.sql': 'create table public.t1 (id int);\ncreate table public.t2 (id int);\n' }) {
  const dir = mkdtempSync(join(tmpdir(), 'hushmates-migrations-'));
  for (const [name, sql] of Object.entries(files)) writeFileSync(join(dir, name), sql);
  return dir;
}

test('it refuses anything that isn’t clearly the staging project, or a Cloudflare account that isn’t staging only', async () => {
  const db = await emptyDatabase();
  try {
    for (const [why, project, others, site, extra, checkPages] of [
      ['a production-looking name', { ...STAGING, name: 'hushmallow' }, [], SITE, {}, null],
      ['outside Sydney', { ...STAGING, region: 'us-east-1' }, [], SITE, {}, null],
      ['a token that also reaches another project', STAGING, [{ ...STAGING, ref: 'prodrefabcdefghijklm', name: 'Hushmallow' }], SITE, {}, null],
      ['a site the secrets don’t name', STAGING, [], 'https://elsewhere.pages.dev', {}, null],
      ['AI set in the secrets', STAGING, [], SITE, { HUSHMATES_AI_URL: 'https://ai.example' }, null],
      ['a Cloudflare account with a project that isn’t staging', STAGING, [], SITE, {}, async () => ({ ok: false, why: 'the Cloudflare account also holds 1 Pages project(s) without "staging" in the name' })],
      ['a Cloudflare account that can’t be read', STAGING, [], SITE, {}, async () => { throw new Error('Cloudflare answered 403 to the list of Pages projects'); }],
    ]) {
      const s = await standIn({ database: db.name, project, others });
      try {
        const r = await deployStaging({ api: createManagementApi({ token: TOKEN, base: s.base }), ref: REF, site, secrets: { ...SECRETS, ...extra }, apply: true, checkPages, log: quiet });
        assert.equal(r.ok, false, why);
        assert.equal(r.steps.at(-1).status, 'refused', why);
        assert.ok(!s.state.calls.some((c) => !c.startsWith('GET')), `${why}: it changed something before refusing (${s.state.calls.join(', ')})`);
        assert.deepEqual(s.state.queries, [], `${why}: it ran SQL before refusing`);
      } finally { await s.close(); }
    }
  } finally { await db.drop(); }
});

test('a dry run sends nothing but reads (the Cloudflare check too); --apply deploys everything, each request as the API documents it; a second run changes no schema or settings, and re-sets the secrets and redeploys the function', async () => {
  const db = await emptyDatabase();
  const s = await standIn({ database: db.name, project: STAGING });
  try {
    const api = createManagementApi({ token: TOKEN, base: s.base });
    const asked = [];
    const checkPages = async () => { asked.push(s.state.calls.length); return { ok: true, project: PAGES }; };
    const dry = await deployStaging({ api, ref: REF, site: SITE, secrets: SECRETS, apply: false, checkPages, publishSite: async () => { throw new Error('a dry run published'); }, log: quiet });
    assert.ok(dry.ok, JSON.stringify(dry.steps));
    assert.deepEqual(asked, [2], 'the Cloudflare check runs once, right after the Supabase guard (its two reads), in the dry run too');
    assert.ok(s.state.calls.every((c) => c.startsWith('GET') || c === 'POST /v1/projects/{ref}/database/query'), s.state.calls.join(', '));
    assert.ok(s.state.queries.length >= 3, s.state.queries.join('\n'));
    for (const q of s.state.queries) assert.ok(isRead(q), `the dry run sent a query that isn't a read: ${q}`);
    assert.equal((await s.pool.query("select count(*)::int n from pg_namespace where nspname in ('hushmates', 'supabase_migrations')")).rows[0].n, 0, 'the dry run changed the database');
    assert.equal(dry.steps.filter((x) => /^migration/.test(x.step) && x.status === 'would').length, 3);
    assert.match(dry.steps.find((x) => x.step === 'the web app').detail, /Pages project hushmates-staging \(main\)/);

    const before = s.state.queries.length;
    const published = [];
    const r = await deployStaging({ api, ref: REF, site: SITE, secrets: SECRETS, apply: true, log: quiet, checkPages, publishSite: async (o) => { published.push(o); return { detail: 'published (test)' }; } });
    assert.deepEqual(s.state.problems, [], 'a request the API would refuse');
    assert.ok(r.ok, JSON.stringify(r.steps.filter((x) => x.status === 'failed')));
    assert.ok(s.state.queries.slice(before).some((q) => !isRead(q)), 'the read check above would pass anything');
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
    // published only to the project the Cloudflare check found
    assert.deepEqual(published, [{ supabaseUrl: `https://${REF}.supabase.co`, anonKey: 'sb_publishable_stand_in', site: SITE, pages: PAGES }]);
    // extensions and Vault don't exist on this database: said so, not pretended
    assert.ok(r.steps.some((x) => /pg_cron/.test(x.step) && x.status === 'skipped'));
    assert.ok(r.steps.some((x) => /Vault/.test(x.step) && x.status === 'skipped'));
    assert.equal(r.steps.find((x) => x.step === 'the scheduled jobs')?.status, 'skipped');

    const again = await deployStaging({ api, ref: REF, site: SITE, secrets: SECRETS, apply: true, log: quiet, checkPages, publishSite: async () => ({ detail: 'again' }) });
    assert.ok(again.ok, JSON.stringify(again.steps));
    const schemaAndSettings = again.steps.filter((x) => /^migration|schema is exposed|sign-in by email code/.test(x.step));
    assert.equal(schemaAndSettings.length, 5);
    assert.ok(schemaAndSettings.every((x) => x.status === 'unchanged'), JSON.stringify(again.steps));
    assert.ok(again.steps.filter((x) => /^migration/.test(x.step)).every((x) => /the same as the file/.test(x.detail)));
    assert.equal((await s.pool.query('select count(*)::int n from supabase_migrations.schema_migrations')).rows[0].n, 3);
    // what a second run does do (their values can't be read back to compare)
    assert.match(again.steps.find((x) => /secrets \(values not shown\)/.test(x.step)).detail, /5 set \(0 new\)/);
    assert.equal(again.steps.find((x) => x.step === 'the Edge Function').status, 'done');
    assert.equal(again.steps.find((x) => x.step === 'the web app').status, 'done');
  } finally { await s.close(); await db.drop(); }
});

test('pg_cron and pg_net: a dry run only says it would enable them; --apply does', async () => {
  const db = await emptyDatabase();
  const dir = tinyMigrations();
  // a local Postgres has neither: the stand-in answers as Supabase would, available but not installed
  const s = await standIn({ database: db.name, project: STAGING, extensions: [{ name: 'pg_cron', installed_version: null }, { name: 'pg_net', installed_version: null }] });
  try {
    const api = createManagementApi({ token: TOKEN, base: s.base });
    const dry = await deployStaging({ api, ref: REF, site: SITE, secrets: SECRETS, apply: false, migrationsDir: dir, log: quiet });
    assert.ok(dry.ok, JSON.stringify(dry.steps));
    for (const ext of ['pg_cron', 'pg_net']) assert.equal(dry.steps.find((x) => x.step === `the ${ext} extension`).status, 'would');
    assert.ok(!s.state.queries.some((q) => /create extension/i.test(q)), 'the dry run enabled an extension');
    for (const q of s.state.queries) assert.ok(isRead(q), `the dry run sent a query that isn't a read: ${q}`);

    const before = s.state.queries.length;
    const r = await deployStaging({ api, ref: REF, site: SITE, secrets: SECRETS, apply: true, migrationsDir: dir, log: quiet });
    const sent = s.state.queries.slice(before);
    for (const ext of ['pg_cron', 'pg_net']) {
      assert.equal(r.steps.find((x) => x.step === `the ${ext} extension`).status, 'done');
      assert.ok(sent.some((q) => q.startsWith(`create extension if not exists ${ext}`)), `${ext} wasn't enabled`);
    }
    // pg_cron is on now, so the deploy looks for its jobs (this stand-in has no cron.job: rightly a failure here)
    assert.equal(r.steps.find((x) => x.step === 'the scheduled jobs')?.status, 'failed');
    assert.ok(sent.findIndex((q) => /create extension if not exists pg_cron/.test(q)) < sent.findIndex((q) => /create table public\.t1/.test(q)), 'the extensions come before the migrations');
  } finally { await s.close(); await db.drop(); rmSync(dir, { recursive: true, force: true }); }
});

test('the scheduler’s Vault secrets: a dry run only reads; then stored before the migrations, made then updated, always as query parameters (never in the SQL text)', async () => {
  const db = await emptyDatabase({ vault: true });
  const dir = tinyMigrations();
  const s = await standIn({ database: db.name, project: STAGING });
  try {
    const api = createManagementApi({ token: TOKEN, base: s.base });
    const secretsNow = async () => (await s.pool.query('select name, secret from vault.secrets order by name')).rows;
    // with Vault there, a dry run says what it would store, and stores nothing
    const dry = await deployStaging({ api, ref: REF, site: SITE, secrets: SECRETS, apply: false, migrationsDir: dir, log: quiet });
    assert.ok(dry.ok, JSON.stringify(dry.steps));
    assert.equal(dry.steps.find((x) => /Vault/.test(x.step)).status, 'would');
    assert.ok(s.state.queries.length >= 3, s.state.queries.join('\n'));
    for (const q of s.state.queries) assert.ok(isRead(q), `the dry run sent a query that isn't a read: ${q}`);
    assert.deepEqual(await secretsNow(), [], 'the dry run stored the scheduler’s secrets');
    const first = await deployStaging({ api, ref: REF, site: SITE, secrets: SECRETS, apply: true, migrationsDir: dir, log: quiet });
    assert.ok(first.ok, JSON.stringify(first.steps));
    const vaultAt = first.steps.findIndex((x) => /Vault/.test(x.step));
    assert.equal(first.steps[vaultAt].status, 'done');
    assert.ok(vaultAt < first.steps.findIndex((x) => /^migration/.test(x.step)), 'Vault comes after the migrations: the job they start would run without its secrets');
    const jobUrl = { name: 'hushmates_job_url', secret: `https://${REF}.supabase.co/functions/v1/hushmates` };
    assert.deepEqual(await secretsNow(), [{ name: 'hushmates_job_secret', secret: SECRETS.HUSHMATES_JOB_SECRET }, jobUrl]);
    // a second run with another job secret updates the same two, and makes no third
    const other = { ...SECRETS, HUSHMATES_JOB_SECRET: 'another-job-secret-for-these-tests' };
    const second = await deployStaging({ api, ref: REF, site: SITE, secrets: other, apply: true, migrationsDir: dir, log: quiet });
    assert.ok(second.ok, JSON.stringify(second.steps));
    assert.deepEqual(await secretsNow(), [{ name: 'hushmates_job_secret', secret: other.HUSHMATES_JOB_SECRET }, jobUrl]);
    assert.ok(s.state.queries.some((q) => /vault\.create_secret/.test(q)) && s.state.queries.some((q) => /vault\.update_secret/.test(q)), 'both ways in were used');
    for (const value of [SECRETS.HUSHMATES_JOB_SECRET, other.HUSHMATES_JOB_SECRET]) {
      assert.ok(!s.state.queries.some((q) => q.includes(value)), 'a job secret went into the SQL text');
    }
    assert.deepEqual(s.state.problems, []);
  } finally { await s.close(); await db.drop(); rmSync(dir, { recursive: true, force: true }); }
});

test('a migration changed after it was applied stops the deploy (whitespace aside, and however the Supabase CLI split it)', async () => {
  const db = await emptyDatabase();
  const dir = tinyMigrations();
  const file = join(dir, '20260101000000_first.sql');
  const s = await standIn({ database: db.name, project: STAGING });
  try {
    const api = createManagementApi({ token: TOKEN, base: s.base });
    const run = (apply = true) => deployStaging({ api, ref: REF, site: SITE, secrets: SECRETS, apply, migrationsDir: dir, log: quiet });
    const step = (r) => r.steps.find((x) => x.step === 'migration 20260101000000_first.sql');
    assert.equal(step(await run()).status, 'done');
    // only the spacing changed: the same migration
    writeFileSync(file, '  create table public.t1 (id int);\n\n\ncreate table public.t2   (id int)  ;');
    assert.equal(step(await run()).status, 'unchanged');
    // recorded as the Supabase CLI records it: split into statements, trimmed, without the semicolons
    await s.pool.query("update supabase_migrations.schema_migrations set statements = array['create table public.t1 (id int)', 'create table public.t2 (id int)']");
    assert.equal(step(await run()).status, 'unchanged');
    // nothing recorded to compare with: said so, not failed
    await s.pool.query('update supabase_migrations.schema_migrations set statements = null');
    let r = await run();
    assert.ok(r.ok);
    assert.match(step(r).detail, /no statements were recorded/);
    // edited in place: the dry run and the deploy both stop at it, and run nothing of it
    await s.pool.query("update supabase_migrations.schema_migrations set statements = array['create table public.t1 (id int);', 'create table public.t2 (id int);']");
    writeFileSync(file, 'create table public.t1 (id bigint);\ncreate table public.t2 (id int);\n');
    for (const apply of [false, true]) {
      r = await run(apply);
      assert.equal(r.ok, false);
      assert.equal(step(r).status, 'failed');
      assert.equal(step(r).detail, '20260101000000_first.sql changed after it was applied: add a new migration instead');
      assert.equal(r.steps.at(-1), step(r), 'it went on after the changed migration');
    }
    assert.equal((await s.pool.query("select data_type from information_schema.columns where table_name = 't1' and column_name = 'id'")).rows[0].data_type, 'integer');
  } finally { await s.close(); await db.drop(); rmSync(dir, { recursive: true, force: true }); }
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

test('publishing: only to the Pages project the check found, still at the site’s address, on its production branch; nothing built when refused; wrangler gets no Hushmates or Supabase secret', async () => {
  const secretsNotForWrangler = { HUSHMATES_STAGING_ROOT_SECRET: 'root-secret-never-for-wrangler', SUPABASE_ACCESS_TOKEN: 'sbp_never_for_wrangler', HUSHMATES_ADMIN_PG: 'postgresql://never-for-wrangler@db', HUSHMATES_STAGING_SERVICE_KEY: 'sb_secret_never_for_wrangler', SUPABASE_DB_PASSWORD: 'never-for-wrangler' };
  const env = {
    CLOUDFLARE_API_TOKEN: 'cf-test-token', CLOUDFLARE_ACCOUNT_ID: 'a'.repeat(32), PATH: '/usr/bin:/bin', HOME: '/home/owner', TMPDIR: '/tmp',
    HTTPS_PROXY: 'http://proxy:3128', https_proxy: 'http://proxy:3128', NO_PROXY: 'localhost', NODE_EXTRA_CA_CERTS: '/ca.crt', SSL_CERT_FILE: '/ca.pem', npm_config_cache: '/tmp/npm-cache',
    NODE_OPTIONS: '--require ./not-for-wrangler.js', AWS_SECRET_ACCESS_KEY: 'unrelated', ...secretsNotForWrangler,
  };
  const ran = [];
  const run = (cmd, args, o) => { ran.push({ cmd, args: args.join(' '), env: o.env }); return { status: 0, stdout: '', stderr: '' }; };
  const dir = mkdtempSync(join(tmpdir(), 'hushmates-publish-'));
  const out = join(dir, 'site');
  const site = 'https://hushmates-staging-7xq.pages.dev';
  const pages = { name: 'hushmates-staging', subdomain: 'hushmates-staging-7xq.pages.dev', productionBranch: 'production' };
  const opts = { supabaseUrl: `https://${REF}.supabase.co`, anonKey: 'sb_publishable_stand_in', site, pages };
  const notAsked = async () => { throw new Error('Cloudflare was asked'); };
  try {
    // the Cloudflare account wasn't checked before the deploy: nothing published, nothing built
    let r = await makePublisher({ env, run, out, lookup: notAsked })({ ...opts, pages: null });
    assert.equal(r.failed, true);
    assert.match(r.detail, /wasn’t checked/);
    // the project is gone since the check: it says so, and builds and creates nothing (wrangler isn't even started)
    r = await makePublisher({ env, run, out, lookup: async () => ({ exists: false }) })(opts);
    assert.equal(r.failed, true);
    assert.match(r.detail, /make it in the dashboard first/);
    // Cloudflare moved it to another address since: it stops and names it
    r = await makePublisher({ env, run, out, lookup: async () => ({ exists: true, subdomain: 'hushmates-staging-8ab.pages.dev', productionBranch: 'main' }) })(opts);
    assert.equal(r.failed, true);
    assert.match(r.detail, /--site https:\/\/hushmates-staging-8ab\.pages\.dev/);
    assert.deepEqual(ran, []);
    assert.ok(!existsSync(out), 'a refused publish built the site');
    // the project the check found: a plain deploy to its production branch, never "project create"
    const asked = [];
    r = await makePublisher({ env, run, out, lookup: async (o) => { asked.push(o.name); return { exists: true, subdomain: pages.subdomain, productionBranch: 'production' }; } })(opts);
    assert.ok(!r.failed, r.detail);
    assert.deepEqual(asked, ['hushmates-staging']);
    assert.ok(existsSync(join(out, 'app', 'index.html')), 'it published a folder it didn’t build');
    assert.equal(ran.length, 1);
    assert.equal(ran[0].cmd, 'npx');
    assert.equal(ran[0].args, `--yes ${WRANGLER} pages deploy ${out} --project-name hushmates-staging --branch production --commit-dirty=true`);
    // wrangler's environment: what npx needs to run, the proxy and its certificates, and the Cloudflare settings
    assert.deepEqual(Object.keys(ran[0].env).sort(), ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN', 'HOME', 'HTTPS_PROXY', 'NODE_EXTRA_CA_CERTS', 'NO_PROXY', 'PATH', 'SSL_CERT_FILE', 'TMPDIR', 'WRANGLER_SEND_METRICS', 'https_proxy', 'npm_config_cache']);
    assert.equal(ran[0].env.WRANGLER_SEND_METRICS, 'false');
    for (const v of Object.values(secretsNotForWrangler)) assert.ok(!JSON.stringify(ran[0].env).includes(v), 'wrangler was given a secret');
    assert.deepEqual(Object.keys(wranglerEnv({ HUSHMATES_NPM_CONFIG: 'x', npm_config_registry: 'https://registry.npmjs.org/', NPM_CONFIG_USERCONFIG: '/x/.npmrc', SUPABASE_URL: 'x' })).sort(), ['NPM_CONFIG_USERCONFIG', 'WRANGLER_SEND_METRICS', 'npm_config_registry']);
    // without the Cloudflare settings: built for uploading by hand, Cloudflare not asked
    rmSync(out, { recursive: true, force: true });
    r = await makePublisher({ env: { PATH: env.PATH }, run, out, lookup: notAsked })({ ...opts, pages: null });
    assert.ok(!r.failed, r.detail);
    assert.match(r.detail, /upload it to the Pages project by hand/);
    assert.ok(existsSync(join(out, 'app', 'index.html')));
    assert.equal(ran.length, 1);
    // and the source never asks wrangler to create one
    assert.ok(!/'project', 'create'|project create/.test(readFileSync(join(ROOT, 'tools', 'staging-deploy.mjs'), 'utf8')));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
