// A local stand-in for Supabase's Management API, for the staging tools' tests. It checks every
// request against the API's own OpenAPI document (tools/vendor/supabase-management-api.subset.json:
// field names, types, limits, patterns), runs SQL on a real local database, unpacks a function
// upload, and answers the project's keys masked unless they are asked for with reveal=true, as
// the real API does.

import http from 'node:http';
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { PG_URL } from './backend-helpers.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SPEC = JSON.parse(readFileSync(join(ROOT, 'tools', 'vendor', 'supabase-management-api.subset.json'), 'utf8')).operations;
export const TOKEN = 'sbp_test_token_for_these_tests_only';
export const REF = 'stagingrefabcdefghij';
export const STAGING = { id: 'p1', ref: REF, name: 'hushmates-staging', region: 'ap-southeast-2', status: 'ACTIVE_HEALTHY', organization_id: 'o1' };
export const KEYS = [
  { name: 'default', type: 'publishable', api_key: 'sb_publishable_stand_in' },
  { name: 'default', type: 'secret', api_key: 'sb_secret_stand_in_full_value_0001' },
];

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

/**
 * The stand-in. `project` is what GET /v1/projects/{ref} answers; `others` more projects the token can see
 * (or `list`, the whole list GET /v1/projects answers); the SQL runs on `database` (a name on the local
 * server) or `connectionString`; `keys` are the project's keys. Every query's SQL text is kept in
 * state.queries (the parameters are not). `extensions` ([{ name, installed_version }]) answers for
 * pg_cron and pg_net, which a local Postgres doesn't have: their "create extension" is recorded, not run.
 */
export async function standIn({ database, connectionString, project, others = [], list = null, keys = KEYS, extensions = null }) {
  const pool = new pg.Pool({ connectionString: connectionString || `${PG_URL}/${database}`, max: 2 });
  const state = { postgrest: { db_schema: 'public,graphql_public', max_rows: 1000 }, auth: { site_url: 'http://localhost:3000', mailer_otp_length: 6, mailer_otp_exp: 3600, external_email_enabled: true }, secrets: [], functions: {}, problems: [], calls: [], queries: [] };
  const ext = extensions && extensions.map((e) => ({ ...e }));
  const query = async (b) => {
    state.queries.push(b.query);
    if (ext && /pg_available_extensions/.test(b.query)) return ext.map((e) => ({ ...e }));
    const create = ext && /^\s*create extension if not exists (pg_cron|pg_net)\b/i.exec(b.query);
    if (create) { const e = ext.find((x) => x.name === create[1]); if (e) e.installed_version = '1.0'; return []; }
    return (await pool.query(b.query, b.parameters || [])).rows ?? [];
  };
  const routes = [
    ['GET /v1/projects', () => [200, list ?? [project, ...others]]],
    ['GET /v1/projects/{ref}', () => [200, project]],
    ['GET /v1/projects/{ref}/api-keys', (b, p) => [200, keys.map((k) => (k.type === 'secret' && !/^(true|1|yes|on|y|enabled)$/.test(p.reveal || '') ? { ...k, api_key: `${k.api_key.slice(0, 15)}••••••••` } : k))]],
    ['POST /v1/projects/{ref}/database/query', async (b) => [201, await query(b)]],
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

/**
 * An empty database on the local server. With `vault`, a minimal stand-in for Supabase Vault (the
 * table and the two functions the deploy uses, the same arguments in the same order; no encryption).
 */
export async function emptyDatabase({ vault = false } = {}) {
  const name = `hm_deploy_${randomBytes(4).toString('hex')}`;
  const admin = new pg.Client({ connectionString: `${PG_URL}/postgres` });
  await admin.connect();
  await admin.query(`create database ${name}`);
  if (vault) {
    const c = new pg.Client({ connectionString: `${PG_URL}/${name}` });
    await c.connect();
    await c.query(`create schema vault;
      create table vault.secrets (id uuid primary key default gen_random_uuid(), name text unique, secret text not null);
      create view vault.decrypted_secrets as select id, name, secret as decrypted_secret from vault.secrets;
      create function vault.create_secret(new_secret text, new_name text default null) returns uuid language sql
        as $$ insert into vault.secrets (name, secret) values ($2, $1) returning id $$;
      create function vault.update_secret(secret_id uuid, new_secret text) returns void language sql
        as $$ update vault.secrets set secret = $2 where id = $1 $$;`);
    await c.end();
  }
  return { name, drop: async () => { await admin.query(`drop database if exists ${name} with (force)`); await admin.end(); } };
}
