// The staging deploy tool (tools/staging-deploy.mjs) against a local stand-in for Supabase's
// Management API. The stand-in checks every request against the API's own OpenAPI document
// (tools/vendor/supabase-management-api.subset.json: field names, types, limits, patterns),
// runs SQL on a real, empty local database, and unpacks the function upload, so the tool is
// tested before it ever meets the real API: its refusals, its dry run, a full deploy (the
// migrations really applied), and a second run changing nothing.

import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { deployStaging, createManagementApi, functionFiles, AUTH_CONFIG } from '../tools/staging-deploy.mjs';
import { PG_URL } from './backend-helpers.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SPEC = JSON.parse(readFileSync(join(ROOT, 'tools', 'vendor', 'supabase-management-api.subset.json'), 'utf8')).operations;
const TOKEN = 'sbp_test_token_for_these_tests_only';
const REF = 'stagingrefabcdefghij';

/** A JSON Schema check, for the OpenAPI 3.0 subset the document uses. → a list of problems */
function validate(schema, value, at = 'body') {
  if (!schema) return [];
  if (value === null) return schema.nullable || schema.type === 'null' ? [] : [`${at} is null`];
  const out = [];
  const t = schema.type;
  const typeOk = !t || (t === 'integer' ? Number.isInteger(value) : t === 'number' ? typeof value === 'number' : t === 'array' ? Array.isArray(value)
    : t === 'object' ? typeof value === 'object' && !Array.isArray(value) : typeof value === t);
  if (!typeOk) return [`${at} should be ${t}`];
  if (schema.enum && !schema.enum.includes(value)) out.push(`${at} is not one of ${schema.enum.join(', ')}`);
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) out.push(`${at} < ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) out.push(`${at} > ${schema.maximum}`);
  }
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) out.push(`${at} too short`);
    if (schema.maxLength !== undefined && value.length > schema.maxLength) out.push(`${at} too long`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) out.push(`${at} doesn't match ${schema.pattern}`);
  }
  if (Array.isArray(value) && schema.items) value.forEach((v, i) => out.push(...validate(schema.items, v, `${at}[${i}]`)));
  if (t === 'object' || schema.properties) {
    for (const k of schema.required || []) if (value[k] === undefined) out.push(`${at}.${k} is required`);
    for (const [k, v] of Object.entries(value)) {
      if (schema.properties?.[k]) out.push(...validate(schema.properties[k], v, `${at}.${k}`));
      else if (schema.properties && schema.additionalProperties !== true && !schema.additionalProperties) out.push(`${at}.${k} is not a field the API knows`);
    }
  }
  return out;
}
const paramsOk = (op, params) => op.parameters.filter((p) => p.in === 'path' || p.in === 'query').flatMap((p) => (params[p.name] === undefined
  ? (p.required ? [`${p.name} missing`] : []) : validate(p.schema, params[p.name], p.name)));

/** The stand-in. `project` is what GET /v1/projects/{ref} answers; `others` more projects the token can see. */
async function standIn({ database, project, others = [] }) {
  const pool = new pg.Pool({ connectionString: `${PG_URL}/${database}`, max: 2 });
  const state = { postgrest: { db_schema: 'public,graphql_public', max_rows: 1000 }, auth: { site_url: 'http://localhost:3000', mailer_otp_length: 6, mailer_otp_exp: 3600, external_email_enabled: true }, secrets: [], functions: {}, problems: [], calls: [] };
  const routes = [
    ['GET /v1/projects', () => [200, [project, ...others]]],
    ['GET /v1/projects/{ref}', () => [200, project]],
    ['GET /v1/projects/{ref}/api-keys', () => [200, [{ name: 'default', type: 'publishable', api_key: 'sb_publishable_stand_in' }]]],
    ['POST /v1/projects/{ref}/database/query', async (b) => [201, (await pool.query(b.query, b.parameters || [])).rows ?? []]],
    ['GET /v1/projects/{ref}/postgrest', () => [200, state.postgrest]],
    ['PATCH /v1/projects/{ref}/postgrest', (b) => [200, Object.assign(state.postgrest, b)]],
    ['GET /v1/projects/{ref}/config/auth', () => [200, state.auth]],
    ['PATCH /v1/projects/{ref}/config/auth', (b) => [200, Object.assign(state.auth, b)]],
    ['GET /v1/projects/{ref}/secrets', () => [200, state.secrets.map(({ name }) => ({ name, value: 'hidden' }))]],
    ['POST /v1/projects/{ref}/secrets', (b) => { for (const s of b) { state.secrets = state.secrets.filter((x) => x.name !== s.name); state.secrets.push(s); } return [201, null]; }],
    ['GET /v1/projects/{ref}/functions/{function_slug}', (b, p) => (state.functions[p.function_slug] ? [200, state.functions[p.function_slug]] : [404, { message: 'not found' }])],
  ];
  const server = http.createServer(async (req, res) => {
    const u = new URL(req.url, 'http://x');
    const send = (status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(body == null ? '' : JSON.stringify(body)); };
    if (req.headers.authorization !== `Bearer ${TOKEN}`) return send(401, { message: 'Unauthorized' });
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks);
    // which documented operation is this?
    const opKey = Object.keys(SPEC).find((k) => {
      const [m, p] = k.split(' ');
      return m === req.method && new RegExp(`^${p.replace(/\{[^}]+\}/g, '[^/]+')}$`).test(u.pathname);
    });
    if (!opKey) { state.problems.push(`undocumented: ${req.method} ${u.pathname}`); return send(404, { message: 'no such endpoint' }); }
    const op = SPEC[opKey];
    const names = [...op.path.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
    const values = new RegExp(`^${op.path.replace(/\{[^}]+\}/g, '([^/]+)')}$`).exec(u.pathname).slice(1);
    const params = { ...Object.fromEntries(names.map((n, i) => [n, decodeURIComponent(values[i])])), ...Object.fromEntries(u.searchParams) };
    const problems = paramsOk(op, params);
    let body = null;
    const ct = req.headers['content-type'] || '';
    if (op.requestBody) {
      if (ct.startsWith('multipart/form-data')) {
        const form = await new Request('http://x', { method: 'POST', headers: { 'content-type': ct }, body: raw }).formData();
        let meta = null;
        try { meta = JSON.parse(form.get('metadata')); } catch { problems.push('metadata is not JSON'); }
        const schema = op.requestBody.content['multipart/form-data'].schema;
        problems.push(...validate(schema.properties.metadata, meta, 'metadata'));
        const files = form.getAll('file').map((f) => ({ name: f.name, size: f.size }));
        if (!files.length) problems.push('no files');
        body = { meta, files, form };
      } else {
        try { body = JSON.parse(raw.toString('utf8')); } catch { problems.push('body is not JSON'); }
        problems.push(...validate(op.requestBody.content['application/json'].schema, body));
      }
    }
    state.calls.push(`${req.method} ${op.path}`);
    if (problems.length) { state.problems.push(`${opKey}: ${problems.join('; ')}`); return send(400, { message: problems.join('; ') }); }
    if (opKey === 'POST /v1/projects/{ref}/functions/deploy') {
      const contents = {};
      for (const f of body.form.getAll('file')) contents[f.name] = Buffer.from(await f.arrayBuffer());
      state.functions[params.slug] = { slug: params.slug, name: body.meta.name, entrypoint_path: body.meta.entrypoint_path, verify_jwt: body.meta.verify_jwt, status: 'ACTIVE', version: 1, files: contents };
      return send(201, { id: 'fn', slug: params.slug, version: 1, status: 'ACTIVE' });
    }
    const route = routes.find(([k]) => k === opKey);
    try { const [status, out] = await route[1](body, params); send(status, out); } catch (e) { send(400, { message: e.message }); }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { base: `http://127.0.0.1:${server.address().port}`, state, pool, close: async () => { await new Promise((r) => server.close(r)); await pool.end(); } };
}

async function emptyDatabase() {
  const name = `hm_deploy_${randomBytes(4).toString('hex')}`;
  const admin = new pg.Client({ connectionString: `${PG_URL}/postgres` });
  await admin.connect();
  await admin.query(`create database ${name}`);
  return { name, drop: async () => { await admin.query(`drop database if exists ${name} with (force)`); await admin.end(); } };
}

const SITE = 'https://hushmates-staging-test.pages.dev';
const SECRETS = {
  HUSHMATES_DATA_KEYS: JSON.stringify({ k1: Buffer.alloc(32, 3).toString('base64') }), HUSHMATES_DATA_KEY_ID: 'k1',
  HUSHMATES_MAC_KEY: Buffer.alloc(32, 4).toString('base64'), HUSHMATES_JOB_SECRET: 'job-secret-for-these-tests-only', HUSHMATES_ALLOWED_ORIGINS: SITE,
};
const STAGING = { id: 'p1', ref: REF, name: 'hushmates-staging', region: 'ap-southeast-2', status: 'ACTIVE_HEALTHY', organization_id: 'o1' };
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
