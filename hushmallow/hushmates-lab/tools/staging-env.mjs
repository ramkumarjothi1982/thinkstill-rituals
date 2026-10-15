// What the staging tools need, from either place it can come from.
//
//   · On the owner's computer: .data/staging.env (tools/staging-secrets.mjs), plus the project's keys
//     and the database address in the environment (docs/STAGING.md).
//   · In a cloud session (docs/STAGING_CLOUD.md): one long random root secret the owner keeps in a
//     password manager (HUSHMATES_STAGING_ROOT_SECRET), from which the staging keys are derived
//     (HKDF-SHA256, bound to the project), and the Management API (SUPABASE_ACCESS_TOKEN) for SQL
//     and the project's own keys. Nothing then has to live on disk between sessions, and the owner
//     holds the one thing that unlocks the staging data.
//
// Staging only. Production keys are made and kept differently (docs/READINESS.md), and never
// derived from anything a cloud environment holds.

import { existsSync } from 'node:fs';
import { hkdfSync } from 'node:crypto';
import { ENV_FILE, readEnvFile, problemsWith } from './staging-secrets.mjs';

export const ROOT_ENV = 'HUSHMATES_STAGING_ROOT_SECRET';

/** A small client for the Management API endpoints the staging tools use. Errors carry the status; secrets never appear in them. */
export function createManagementApi({ token, base = 'https://api.supabase.com', fetch: doFetch = globalThis.fetch, wait = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  async function call(method, path, { json, form, query } = {}) {
    const url = `${base}${path}${query ? `?${new URLSearchParams(query)}` : ''}`;
    const headers = { authorization: `Bearer ${token}`, ...(json !== undefined ? { 'content-type': 'application/json' } : {}) };
    let res;
    // 120 requests a minute per endpoint: a 429 is refused before anything runs, so waiting and asking again is safe
    for (let attempt = 0; ; attempt += 1) {
      res = await doFetch(url, { method, headers, body: json !== undefined ? JSON.stringify(json) : form });
      if (res.status !== 429 || attempt === 3) break;
      await res.arrayBuffer().catch(() => {});
      await wait(Math.min(60, Math.max(1, Number(res.headers.get('x-ratelimit-reset')) || 5)) * 1000);
    }
    const text = await res.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    if (!res.ok) throw Object.assign(new Error(`${method} ${path.replace(/\/v1\/projects\/[a-z]+/, '/v1/projects/<ref>')} answered ${res.status}: ${String(typeof body === 'string' ? body : body?.message || '').slice(0, 160)}`), { status: res.status });
    return body;
  }
  return {
    listProjects: () => call('GET', '/v1/projects'),
    getProject: (ref) => call('GET', `/v1/projects/${ref}`),
    apiKeys: (ref, { reveal = false } = {}) => call('GET', `/v1/projects/${ref}/api-keys`, reveal ? { query: { reveal: 'true' } } : {}),
    query: (ref, query, parameters) => call('POST', `/v1/projects/${ref}/database/query`, { json: parameters ? { query, parameters } : { query } }),
    getPostgrest: (ref) => call('GET', `/v1/projects/${ref}/postgrest`),
    patchPostgrest: (ref, body) => call('PATCH', `/v1/projects/${ref}/postgrest`, { json: body }),
    getAuth: (ref) => call('GET', `/v1/projects/${ref}/config/auth`),
    patchAuth: (ref, body) => call('PATCH', `/v1/projects/${ref}/config/auth`, { json: body }),
    listSecrets: (ref) => call('GET', `/v1/projects/${ref}/secrets`),
    createSecrets: (ref, list) => call('POST', `/v1/projects/${ref}/secrets`, { json: list }),
    deployFunction: (ref, slug, form) => call('POST', `/v1/projects/${ref}/functions/deploy`, { form, query: { slug } }),
    getFunction: (ref, slug) => call('GET', `/v1/projects/${ref}/functions/${slug}`),
  };
}


/** What's wrong with a root secret (an empty list when nothing is). Never repeats it. */
export function rootProblems(root) {
  const s = String(root || '');
  if (!s) return [`${ROOT_ENV} isn’t set`];
  const out = [];
  if (s.length < 32) out.push(`${ROOT_ENV} should be at least 32 characters (a password manager's generated password of 40 or more)`);
  if (new Set(s).size < 12) out.push(`${ROOT_ENV} repeats too few characters to be random: generate one in a password manager`);
  if (/^\s|\s$/.test(s)) out.push(`${ROOT_ENV} starts or ends with a space: copy it again`);
  return out;
}

const derive = (root, ref, label, bytes) => Buffer.from(hkdfSync('sha256', Buffer.from(String(root), 'utf8'), Buffer.from(`hushmates-staging/${ref}`, 'utf8'), Buffer.from(label, 'utf8'), bytes));

/**
 * The staging secrets, derived from the root for this project and site. The same root, project
 * and site always give the same secrets, so a later session opens what an earlier one stored.
 * A different project gets different keys.
 */
export function deriveSecrets({ root, ref, origin }) {
  const problems = rootProblems(root);
  if (problems.length) throw new Error(problems.join('; '));
  if (!/^[a-z]{20}$/.test(ref)) throw new Error('the project reference should be 20 lowercase letters');
  return {
    HUSHMATES_DATA_KEYS: JSON.stringify({ k1: derive(root, ref, 'data-key k1', 32).toString('base64') }),
    HUSHMATES_DATA_KEY_ID: 'k1',
    HUSHMATES_MAC_KEY: derive(root, ref, 'mac-key', 32).toString('base64'),
    HUSHMATES_JOB_SECRET: derive(root, ref, 'job-secret', 24).toString('base64url'),
    HUSHMATES_ALLOWED_ORIGINS: new URL(origin).origin,
  };
}

/**
 * The secrets for a run: the private file if there is one (the owner's computer), otherwise
 * derived from the root secret in the environment (a cloud session). → { secrets, source }
 */
export function stagingSecrets({ ref, site, env = process.env, file = ENV_FILE }) {
  let secrets; let source;
  if (existsSync(file)) { secrets = readEnvFile(file); source = 'file'; }
  else if (env[ROOT_ENV]) {
    if (!site) throw new Error('give the staging site (--site https://<name>.pages.dev): the keys are derived for it');
    secrets = deriveSecrets({ root: env[ROOT_ENV], ref, origin: site }); source = 'root';
  } else throw new Error(`no ${file}, and ${ROOT_ENV} isn’t set: see docs/STAGING.md (your computer) or docs/STAGING_CLOUD.md (a cloud session)`);
  const problems = problemsWith(secrets);
  if (problems.length) throw new Error(problems.join('; '));
  return { secrets, source };
}

/**
 * SQL through the Management API, shaped like a pg Pool for the tools that read the database
 * (query(text, params) → { rows }). Parameters travel as parameters, never in the SQL text.
 */
export function managementSql({ api, ref }) {
  return {
    async query(text, params = []) {
      const parameters = params.map((p) => (p instanceof Date ? p.toISOString() : p));
      const rows = await api.query(ref, text, parameters.length ? parameters : undefined);
      return { rows: Array.isArray(rows) ? rows : [] };
    },
    async end() {},
  };
}

/** The project's public and secret keys, read with the access token (never printed). */
export async function projectKeys({ api, ref }) {
  const keys = (await api.apiKeys(ref, { reveal: true })) || [];
  const anonKey = keys.find((k) => k.type === 'publishable')?.api_key || keys.find((k) => k.name === 'anon')?.api_key;
  const serviceKey = keys.find((k) => k.type === 'secret')?.api_key || keys.find((k) => k.name === 'service_role')?.api_key;
  if (!anonKey || !serviceKey) throw new Error('the project has no publishable and secret key the token can read');
  if (/[^A-Za-z0-9_.-]/.test(serviceKey) || serviceKey.length < 20) throw new Error('the secret key came back masked: the token can’t reveal it');
  return { anonKey, serviceKey };
}

/**
 * The guard every staging tool applies before touching anything: the project is named like
 * staging, in Sydney and running, and the token reaches no other project (so a token from the
 * account that holds production is refused). → { ok, why, project }
 */
export async function guardStaging({ api, ref }) {
  if (!/^[a-z]{20}$/.test(ref)) return { ok: false, why: 'the project reference should be 20 lowercase letters' };
  const project = await api.getProject(ref);
  if (!/staging/i.test(project.name || '')) return { ok: false, why: `it is named "${project.name}": staging projects have "staging" in their name` };
  if (project.region !== 'ap-southeast-2') return { ok: false, why: `it is in ${project.region}, not Sydney (ap-southeast-2)` };
  if (project.status && project.status !== 'ACTIVE_HEALTHY') return { ok: false, why: `its status is ${project.status} (resume it in the dashboard)` };
  const others = ((await api.listProjects()) || []).filter((p) => !/staging/i.test(p.name || ''));
  if (others.length) return { ok: false, why: `the token can also reach ${others.length} other project(s). Use a separate Supabase account for staging, so a token can never touch production` };
  return { ok: true, project };
}

/**
 * The Cloudflare Pages project the owner made (read only: the tools never create one, so the site
 * can't end up somewhere the owner didn't choose). → { exists, subdomain, productionBranch }
 */
export async function pagesProject({ token, accountId, name, base = 'https://api.cloudflare.com/client/v4', fetch: doFetch = globalThis.fetch }) {
  if (!/^[a-z0-9][a-z0-9-]{0,57}$/.test(String(name))) throw new Error('a Pages project name is lowercase letters, digits and dashes');
  if (!/^[a-f0-9]{32}$/.test(String(accountId))) throw new Error('CLOUDFLARE_ACCOUNT_ID should be the 32-character account id');
  const res = await doFetch(`${base}/accounts/${accountId}/pages/projects/${name}`, { headers: { authorization: `Bearer ${token}` } });
  let body = null;
  try { body = await res.json(); } catch { /* below */ }
  if (res.status === 404 || body?.errors?.some((e) => e.code === 8000007)) return { exists: false };
  if (!res.ok || !body?.success) throw new Error(`Cloudflare answered ${res.status}${body?.errors?.[0]?.message ? `: ${String(body.errors[0].message).slice(0, 120)}` : ''}`);
  return { exists: true, subdomain: body.result?.subdomain, productionBranch: body.result?.production_branch || 'main' };
}

const LOCAL = new Set(['127.0.0.1', 'localhost', '[::1]']);

/**
 * Everything a check or the E2E needs for one run, from the environment:
 *   · HUSHMATES_ADMIN_PG set (the owner's computer): the database over an encrypted connection,
 *     and the project's keys from HUSHMATES_STAGING_ANON_KEY / HUSHMATES_STAGING_SERVICE_KEY;
 *   · otherwise SUPABASE_ACCESS_TOKEN (a cloud session): the staging guard first, then SQL through
 *     the Management API and the project's keys read with the token.
 * The secrets come from .data/staging.env, or from the root secret.
 * → { secrets, source, anonKey, serviceKey, adminPg?, db?, via }
 */
export async function resolveRun({ ref, site, env = process.env, file = ENV_FILE, api = null }) {
  if (!/^[a-z]{20}$/.test(ref)) throw new Error('give the staging project’s reference: --project-ref <20 lowercase letters> (never production)');
  const { secrets, source } = stagingSecrets({ ref, site, env, file });
  if (env.HUSHMATES_ADMIN_PG) {
    for (const k of ['HUSHMATES_STAGING_ANON_KEY', 'HUSHMATES_STAGING_SERVICE_KEY']) if (!env[k]) throw new Error(`${k} isn’t set`);
    let u;
    try { u = new URL(env.HUSHMATES_ADMIN_PG); } catch { throw new Error('HUSHMATES_ADMIN_PG isn’t a postgres:// address'); }
    if (!LOCAL.has(u.hostname) && u.searchParams.get('sslmode') !== 'verify-full') throw new Error('HUSHMATES_ADMIN_PG must use sslmode=verify-full (docs/STAGING.md, step 8)');
    if (!LOCAL.has(u.hostname) && !u.hostname.includes(ref) && !/pooler\.supabase\.com$/.test(u.hostname)) throw new Error('HUSHMATES_ADMIN_PG doesn’t look like this project’s database');
    if (/pooler\.supabase\.com$/.test(u.hostname) && !decodeURIComponent(u.username).endsWith(`.${ref}`)) throw new Error('HUSHMATES_ADMIN_PG is for a different project than --project-ref');
    return { secrets, source, anonKey: env.HUSHMATES_STAGING_ANON_KEY, serviceKey: env.HUSHMATES_STAGING_SERVICE_KEY, adminPg: env.HUSHMATES_ADMIN_PG, via: 'database connection' };
  }
  if (!env.SUPABASE_ACCESS_TOKEN && !api) throw new Error('set HUSHMATES_ADMIN_PG (your computer: docs/STAGING.md) or SUPABASE_ACCESS_TOKEN (a cloud session: docs/STAGING_CLOUD.md)');
  const client = api || createManagementApi({ token: env.SUPABASE_ACCESS_TOKEN });
  const guard = await guardStaging({ api: client, ref });
  if (!guard.ok) throw new Error(`refused: ${guard.why}`);
  const keys = env.HUSHMATES_STAGING_SERVICE_KEY && env.HUSHMATES_STAGING_ANON_KEY
    ? { anonKey: env.HUSHMATES_STAGING_ANON_KEY, serviceKey: env.HUSHMATES_STAGING_SERVICE_KEY } : await projectKeys({ api: client, ref });
  return { secrets, source, ...keys, db: managementSql({ api: client, ref }), via: 'Management API' };
}
