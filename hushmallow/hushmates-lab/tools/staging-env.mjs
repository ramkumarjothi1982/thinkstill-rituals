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
/**
 * Where the Management API is: Supabase's, unless HUSHMATES_MANAGEMENT_API names a stand-in on this
 * computer (the tests run each command against one). Anything else is refused, so a token can never
 * be sent to another host by a stray setting.
 */
export function managementBase(env = process.env) {
  const v = env.HUSHMATES_MANAGEMENT_API;
  if (!v) return 'https://api.supabase.com';
  if (!/^http:\/\/127\.0\.0\.1:\d{2,5}$/.test(v)) throw new Error('HUSHMATES_MANAGEMENT_API is only for a test stand-in on this computer (http://127.0.0.1:<port>): unset it');
  return v;
}

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
 * derived from the root secret in the environment (a cloud session). When both are there they
 * must hold the same keys: a file left over from another set-up must never quietly win over the
 * root the owner meant to use. → { secrets, source }
 */
export function stagingSecrets({ ref, site, env = process.env, file = ENV_FILE }) {
  let secrets; let source;
  if (existsSync(file)) {
    secrets = readEnvFile(file); source = 'file';
    if (env[ROOT_ENV]) {
      // the MAC key depends on the root and the project only, so it tells the two apart without the site
      const problems = rootProblems(env[ROOT_ENV]);
      if (problems.length) throw new Error(problems.join('; '));
      if (!/^[a-z]{20}$/.test(ref)) throw new Error('the project reference should be 20 lowercase letters');
      if (secrets.HUSHMATES_MAC_KEY !== derive(env[ROOT_ENV], ref, 'mac-key', 32).toString('base64')) {
        throw new Error(`both ${file} and ${ROOT_ENV} are here, and they hold different keys: remove one (the file on your computer, or the root secret in a cloud session), so a run can’t use the wrong keys`);
      }
    }
  } else if (env[ROOT_ENV]) {
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
      // rows are always a list: anything else is an answer the checks can't read, never "no rows"
      // (several security checks pass on no rows)
      if (!Array.isArray(rows)) throw new Error(`the Management API answered a query with ${rows === null ? 'nothing' : `a ${typeof rows}`} instead of rows`);
      return { rows };
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
 * staging, in Sydney and running, and it is the only project the token reaches (so a token from
 * the account that holds production is refused, whatever the other projects are called). → { ok, why, project }
 */
export async function guardStaging({ api, ref }) {
  if (!/^[a-z]{20}$/.test(ref)) return { ok: false, why: 'the project reference should be 20 lowercase letters' };
  const project = await api.getProject(ref);
  if (!/staging/i.test(project.name || '')) return { ok: false, why: `it is named "${project.name}": staging projects have "staging" in their name` };
  if (project.region !== 'ap-southeast-2') return { ok: false, why: `it is in ${project.region}, not Sydney (ap-southeast-2)` };
  if (project.status && project.status !== 'ACTIVE_HEALTHY') return { ok: false, why: `its status is ${project.status} (resume it in the dashboard)` };
  const list = await api.listProjects();
  if (!Array.isArray(list)) return { ok: false, why: 'the token’s list of projects couldn’t be read, so it can’t be shown to reach nothing else' };
  // the API's `id` was the ref before `ref` was added
  const refOf = (p) => p?.ref || p?.id;
  if (!list.some((p) => refOf(p) === ref)) return { ok: false, why: 'the token’s own list of projects doesn’t include this one, so it can’t be shown to reach nothing else: use the staging account’s token' };
  const others = list.filter((p) => refOf(p) !== ref);
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

const PAGES_PER_PAGE = 10;

/** Every Pages project on the Cloudflare account, page by page (read only). → [{ name, subdomain, production_branch, … }] */
export async function listPagesProjects({ token, accountId, base = 'https://api.cloudflare.com/client/v4', fetch: doFetch = globalThis.fetch }) {
  if (!/^[a-f0-9]{32}$/.test(String(accountId))) throw new Error('CLOUDFLARE_ACCOUNT_ID should be the 32-character account id');
  const all = [];
  for (let page = 1; page <= 100; page += 1) {
    const res = await doFetch(`${base}/accounts/${accountId}/pages/projects?page=${page}&per_page=${PAGES_PER_PAGE}`, { headers: { authorization: `Bearer ${token}` } });
    let body = null;
    try { body = await res.json(); } catch { /* below */ }
    if (!res.ok || !body?.success || !Array.isArray(body.result)) throw new Error(`Cloudflare answered ${res.status} to the list of Pages projects${body?.errors?.[0]?.message ? `: ${String(body.errors[0].message).slice(0, 120)}` : ''}`);
    all.push(...body.result);
    const pages = Number(body.result_info?.total_pages);
    if (Number.isFinite(pages) && pages > 0 ? page >= pages : body.result.length < PAGES_PER_PAGE) return all;
  }
  throw new Error('the Cloudflare account lists more Pages projects than a staging account would have');
}

/**
 * The Cloudflare side, read only, before anything changes (the dry run included): every Pages project
 * on the account is a staging one, so a token from the account with the live site is refused, as the
 * Supabase guard refuses a token that reaches production; and one of them is at the --site address
 * (or, with --pages-project, that one, and it must be). Its real name and production branch are what
 * the deploy uses: the address alone can't say (Cloudflare may add a suffix, as in name-7xq.pages.dev).
 * → { ok, why?, project: { name, subdomain, productionBranch } }
 */
export async function guardPages({ token, accountId, site, name = null, ...rest }) {
  if (name && !/^[a-z0-9][a-z0-9-]{0,57}$/.test(String(name))) return { ok: false, why: 'a Pages project name is lowercase letters, digits and dashes' };
  const origin = new URL(site).origin;
  const host = new URL(site).hostname.toLowerCase();
  const projects = await listPagesProjects({ token, accountId, ...rest });
  const notStaging = projects.filter((p) => !/staging/i.test(p?.name || ''));
  if (notStaging.length) return { ok: false, why: `the Cloudflare account also holds ${notStaging.length} Pages project(s) without "staging" in the name. Use a separate Cloudflare account for staging, so a staging build can never be published over the live site` };
  const sub = (p) => String(p?.subdomain || '').toLowerCase();
  const match = name ? projects.find((p) => p.name === name) : projects.find((p) => sub(p) === host);
  if (!match) {
    const found = projects.map((p) => (p.subdomain ? `https://${p.subdomain}` : `${p.name} (no address yet)`));
    return { ok: false, why: `${name ? `there is no Pages project called "${name}"` : `no Pages project is at ${origin}`} on the Cloudflare account (${found.length ? `it has ${found.join(', ')}` : 'it has none'}). Make it in the dashboard first (docs/STAGING_CLOUD.md, step 3), or run again with --site set to its address. This tool never creates one` };
  }
  if (!match.subdomain) return { ok: false, why: `the Pages project "${match.name}" has no address yet: open it in the Cloudflare dashboard, and run again with --site set to the address it shows` };
  if (sub(match) !== host) return { ok: false, why: `the Pages project "${match.name}" is at https://${match.subdomain}, not ${origin}: run again with --site https://${match.subdomain}` };
  return { ok: true, project: { name: match.name, subdomain: match.subdomain, productionBranch: match.production_branch || 'main' } };
}

const LOCAL = new Set(['127.0.0.1', 'localhost', '[::1]']);

/**
 * Is HUSHMATES_ADMIN_PG this project's database, over a connection that checks the server? Throws if
 * not; never repeats the address. → 'local' for an address on this computer (a tunnel, say), which
 * can't be matched against the project; otherwise 'matched'.
 */
function checkAdminPg(address, ref) {
  let u;
  try { u = new URL(address); } catch { throw new Error('HUSHMATES_ADMIN_PG isn’t a postgres:// address'); }
  if (!['postgres:', 'postgresql:'].includes(u.protocol)) throw new Error('HUSHMATES_ADMIN_PG isn’t a postgres:// address');
  // pg takes any setting from the address's query (host=, user=, ssl=…, the last one winning), so
  // only the two the guide gives are accepted, once each: the checks below are then what pg uses
  const names = [...u.searchParams.keys()];
  const extra = [...new Set(names.filter((k) => !['sslmode', 'sslrootcert'].includes(k)))];
  // Named only when the query can't have begun inside the password. A ? or # before the last @
  // means it did (a password of 2024?Hunter= reads as port 2024 and a setting "Hunter"), so then
  // nothing is named, however much it looks like a setting
  const inPassword = /[?#]/.test(address.slice(0, Math.max(address.lastIndexOf('@'), 0)));
  const named = !inPassword && extra.every((k) => /^[a-z_]{1,40}$/i.test(k)) ? ` (${extra.join(', ')})` : '';
  if (extra.length) throw new Error(`HUSHMATES_ADMIN_PG has settings the tools don’t accept${named}: use the dashboard’s connection string with only sslmode=verify-full and sslrootcert, and a password with any ? # @ or / in it encoded (docs/STAGING.md, step 8)`);
  if (names.filter((k) => k === 'sslrootcert').length > 1) throw new Error('HUSHMATES_ADMIN_PG gives sslrootcert more than once');
  const host = u.hostname.toLowerCase();
  if (LOCAL.has(host)) return 'local';
  const modes = u.searchParams.getAll('sslmode');
  if (modes.length !== 1 || modes[0] !== 'verify-full') throw new Error('HUSHMATES_ADMIN_PG must use sslmode=verify-full, once (docs/STAGING.md, step 8)');
  if (host === `db.${ref}.supabase.co`) return 'matched';
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)*\.pooler\.supabase\.com$/.test(host)) {
    let user = '';
    try { user = decodeURIComponent(u.username); } catch { /* below */ }
    if (!user.endsWith(`.${ref}`)) throw new Error('HUSHMATES_ADMIN_PG is for a different project than --project-ref');
    return 'matched';
  }
  throw new Error('HUSHMATES_ADMIN_PG doesn’t look like this project’s database (db.<ref>.supabase.co, or the pooler with the user postgres.<ref>)');
}

/**
 * Everything a check or the E2E needs for one run, from the environment:
 *   · HUSHMATES_ADMIN_PG set (the owner's computer): the database over an encrypted connection,
 *     and the project's keys from HUSHMATES_STAGING_ANON_KEY / HUSHMATES_STAGING_SERVICE_KEY;
 *   · otherwise SUPABASE_ACCESS_TOKEN (a cloud session): SQL through the Management API and the
 *     project's keys read with the token.
 * Whenever a token (or an api) is there, the staging guard runs first, in both cases. With only
 * HUSHMATES_ADMIN_PG it can't (guarded: false): the address is then only matched against the
 * reference. An address on this computer (local: true) can't be matched at all, guard or not.
 * The tools say both (runCaveats).
 * The secrets come from .data/staging.env, or from the root secret.
 * → { secrets, source, anonKey, serviceKey, adminPg?, db?, via, guarded, local }
 */
export async function resolveRun({ ref, site, env = process.env, file = ENV_FILE, api = null }) {
  if (!/^[a-z]{20}$/.test(ref)) throw new Error('give the staging project’s reference: --project-ref <20 lowercase letters> (never production)');
  const { secrets, source } = stagingSecrets({ ref, site, env, file });
  const client = api || (env.SUPABASE_ACCESS_TOKEN ? createManagementApi({ token: env.SUPABASE_ACCESS_TOKEN, base: managementBase(env) }) : null);
  if (!client && !env.HUSHMATES_ADMIN_PG) throw new Error('set HUSHMATES_ADMIN_PG (your computer: docs/STAGING.md) or SUPABASE_ACCESS_TOKEN (a cloud session: docs/STAGING_CLOUD.md)');
  let local = false;
  if (env.HUSHMATES_ADMIN_PG) {
    for (const k of ['HUSHMATES_STAGING_ANON_KEY', 'HUSHMATES_STAGING_SERVICE_KEY']) if (!env[k]) throw new Error(`${k} isn’t set`);
    local = checkAdminPg(env.HUSHMATES_ADMIN_PG, ref) === 'local';
  }
  if (client) {
    const guard = await guardStaging({ api: client, ref });
    if (!guard.ok) throw new Error(`refused: ${guard.why}`);
  }
  if (env.HUSHMATES_ADMIN_PG) {
    return { secrets, source, anonKey: env.HUSHMATES_STAGING_ANON_KEY, serviceKey: env.HUSHMATES_STAGING_SERVICE_KEY, adminPg: env.HUSHMATES_ADMIN_PG, via: 'database connection', guarded: !!client, local };
  }
  const keys = env.HUSHMATES_STAGING_SERVICE_KEY && env.HUSHMATES_STAGING_ANON_KEY
    ? { anonKey: env.HUSHMATES_STAGING_ANON_KEY, serviceKey: env.HUSHMATES_STAGING_SERVICE_KEY } : await projectKeys({ api: client, ref });
  return { secrets, source, ...keys, db: managementSql({ api: client, ref }), via: 'Management API', guarded: true, local: false };
}

/**
 * The lines a tool prints before a run about what its guards couldn't cover (none when they covered
 * everything): no access token, so no staging guard; a database address on this computer, which
 * can't be matched against the project.
 */
export function runCaveats({ guarded, local }) {
  const out = [];
  if (!guarded) out.push(`· No SUPABASE_ACCESS_TOKEN here, so the staging guard (the project’s name, region, and the only project the token reaches) couldn’t run${local ? '.' : ': the database address is only matched against --project-ref.'}`);
  if (local) out.push('· The database address is on this computer, so it can’t be matched against --project-ref: the database checks only cover what it points to.');
  return out;
}
