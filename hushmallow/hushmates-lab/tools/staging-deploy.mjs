#!/usr/bin/env node
// Sets up and deploys the STAGING project from a script, step by step, with the owner's
// approval already given for staging (never production). It uses Supabase's Management API
// directly (no Supabase CLI binary, no Docker) and, for the web app, Cloudflare's own wrangler.
//
//   node tools/staging-deploy.mjs --project-ref <ref> --site https://<name>.pages.dev            a dry run: reads, changes nothing
//   node tools/staging-deploy.mjs --project-ref <ref> --site https://<name>.pages.dev --apply    does it
//   [--pages-project <name>]   the Pages project to publish to, when several are on the account (it must be at --site)
//
// It refuses unless:
//   · the project is named like staging (contains "staging"), is in Sydney (ap-southeast-2) and healthy;
//   · the access token reaches this project and NO other (so a token from the account that holds
//     Hushmallow's production project is refused: make a separate Supabase account for staging);
//   · with CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID set: every Pages project on the Cloudflare
//     account has "staging" in its name (a separate Cloudflare account for staging), and one of them is
//     at --site. This is read before anything changes, in the dry run too;
//   · the staging secrets are complete, with AI off, and name the same site. They come from
//     .data/staging.env on the owner's computer, or are derived from HUSHMATES_STAGING_ROOT_SECRET
//     in a cloud session (tools/staging-env.mjs, docs/STAGING_CLOUD.md); never both, unless they agree.
//
// What --apply does, each step idempotent (safe to run again):
//   1. enables pg_cron and pg_net (as Supabase documents);
//   2. stores the scheduler's address and secret in Vault (as query parameters, never in the SQL text),
//      before the migrations: the last one starts a job every minute that reads them;
//   3. applies supabase/migrations not yet applied, each in one transaction, recorded where the
//      Supabase CLI records them (supabase_migrations.schema_migrations); one changed after it was
//      applied stops the deploy (add a new migration instead);
//   4. exposes the hushmates_api schema to the Data API;
//   5. sets sign-in by email code: code length 6, 10 minutes, the two email templates with the code,
//      no auto-confirm, captcha off (no widget yet), the site address;
//   6. sets the Edge Function's secrets (every run: their values can't be read back to compare);
//   7. deploys the Edge Function (the entry point and every file it imports, with verify_jwt off);
//   8. builds the site for this project with its publishable key, and publishes it with wrangler to
//      the Pages project the Cloudflare check found, or says where to upload it. It never creates a
//      Pages project, and wrangler gets none of the Hushmates or Supabase secrets.
//
//   SUPABASE_ACCESS_TOKEN   a personal access token of the staging-only Supabase account
//   CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID   optional: a token with "Cloudflare Pages: Edit" on the staging-only account
//   HUSHMATES_STAGING_ROOT_SECRET   in a cloud session, instead of .data/staging.env
// Nothing secret is printed. AI stays off. It never touches billing, and makes no paid change.

import { readFileSync, readdirSync, realpathSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { guardStaging, pagesProject, createManagementApi, managementBase } from './staging-env.mjs';

export { createManagementApi };

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const WRANGLER = 'wrangler@4.146.0';                        // pinned (published 2026-10-01)
export const FUNCTION = { slug: 'hushmates', entry: 'supabase/functions/hushmates/index.ts', verifyJwt: false };
const CODE_EMAIL = (title) => `<h2>${title}</h2>\n<p>Your code is <strong>{{ .Token }}</strong>. It works for 10 minutes.</p>\n<p>If you didn't ask for it, you can ignore this email.</p>\n`;
export const AUTH_CONFIG = {
  external_email_enabled: true,
  mailer_autoconfirm: false,
  mailer_otp_length: 6,
  mailer_otp_exp: 600,
  mailer_subjects_confirmation: 'Your Hushmates code',
  mailer_templates_confirmation_content: CODE_EMAIL('Your Hushmates code'),
  mailer_subjects_magic_link: 'Your Hushmates code',
  mailer_templates_magic_link_content: CODE_EMAIL('Your Hushmates code'),
  security_captcha_enabled: false,
};
// as Supabase documents them (guides/cron/install, guides/database/extensions/pg_net)
const EXTENSIONS_SQL = {
  pg_cron: 'create extension if not exists pg_cron with schema pg_catalog; grant usage on schema cron to postgres; grant all privileges on all tables in schema cron to postgres;',
  pg_net: 'create extension if not exists pg_net with schema extensions;',
};

/** The entry point and every local file it imports, as paths relative to the project folder (as the Supabase CLI sends them). */
export function functionFiles(entry = FUNCTION.entry, root = ROOT) {
  const seen = new Set();
  const walk = (rel) => {
    if (seen.has(rel)) return;
    seen.add(rel);
    const code = readFileSync(join(root, rel), 'utf8');
    for (const m of code.matchAll(/\b(?:import|export)\s*(?:[^'"`;]*?\sfrom\s*)?['"](\.{1,2}\/[^'"]+)['"]|\bimport\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g)) {
      const spec = m[1] || m[2];
      walk(relative(root, resolve(root, dirname(rel), spec)).split('\\').join('/'));
    }
  };
  walk(entry);
  return [...seen];
}

export function functionForm(files, { root = ROOT } = {}) {
  const form = new FormData();
  form.append('metadata', JSON.stringify({ entrypoint_path: FUNCTION.entry, name: FUNCTION.slug, verify_jwt: FUNCTION.verifyJwt }));
  for (const rel of files) form.append('file', new Blob([readFileSync(join(root, rel))]), rel);
  return form;
}

const dollarQuote = (text) => { let tag = 'hm'; while (text.includes(`$${tag}$`)) tag += 'x'; return `$${tag}$${text}$${tag}$`; };
// The Supabase CLI records a migration's statements split up and trimmed (we record the whole
// file as one), so a file and its record are compared as text with the whitespace and the
// semicolons between statements taken out
const sameSql = (a, b) => { const norm = (s) => String(s).replace(/;/g, ' ').replace(/\s+/g, ' ').trim(); return norm(a) === norm(b); };

/** Environment variables passed to wrangler: what npx and wrangler need to run, and nothing of Hushmates' or Supabase's. */
export function wranglerEnv(env = process.env) {
  const KEEP = /^(PATH|HOME|TMPDIR|HTTPS_PROXY|HTTP_PROXY|NO_PROXY|https_proxy|http_proxy|no_proxy|NODE_EXTRA_CA_CERTS|SSL_CERT_FILE|CLOUDFLARE_API_TOKEN|CLOUDFLARE_ACCOUNT_ID)$|^npm_config_/i;
  const out = {};
  for (const [k, v] of Object.entries(env)) if (v !== undefined && KEEP.test(k) && !/^(HUSHMATES_|SUPABASE_)/i.test(k)) out[k] = v;
  return { ...out, WRANGLER_SEND_METRICS: 'false' };
}

/**
 * Read the project, decide what would change, and (with apply) change it. `checkPages` (read only)
 * runs right after the Supabase guard, before anything changes, in the dry run too; the Pages
 * project it finds is the only one `publishSite` may publish to.
 * → { ok, steps: [{ step, status: 'done'|'would'|'unchanged'|'skipped'|'failed'|'refused', detail }] }
 */
export async function deployStaging({ api, ref, site, secrets, apply = false, migrationsDir = join(ROOT, 'supabase', 'migrations'), checkPages = null, publishSite = null, log = console }) {
  const steps = [];
  const say = (step, status, detail = '') => { steps.push({ step, status, detail }); (log.log || (() => {}))(`${{ done: '✓', unchanged: '·', would: '→', skipped: '·', failed: '✗', refused: '⛔' }[status] || '?'} ${step}${detail ? `: ${detail}` : ''}`); };
  const verb = apply ? 'done' : 'would';
  // a read's answer is always a list of rows: anything else would read as "nothing there"
  const rows = async (query, parameters) => {
    const r = await api.query(ref, query, parameters);
    if (!Array.isArray(r)) throw new Error('the Management API answered a query with something other than rows');
    return r;
  };

  // ------------------------------------------------------------------ guards --
  const guard = await guardStaging({ api, ref });
  if (!guard.ok) { say('the project is staging, in Sydney, running, and the only one the token reaches', 'refused', guard.why); return { ok: false, steps }; }
  say('the project is a staging project, in Sydney, and the token reaches nothing else', 'unchanged', guard.project.name);
  let pages = null;
  if (checkPages) {
    let found;
    try { found = await checkPages(); } catch (e) { found = { ok: false, why: e.message }; }
    if (!found?.ok) { say('the Cloudflare account holds staging Pages projects only, and one is at this site', 'refused', found?.why || 'no answer'); return { ok: false, steps }; }
    pages = found.project;
    say('the Cloudflare account holds staging Pages projects only, and one is at this site', 'unchanged', `${pages.name} (https://${pages.subdomain}, branch ${pages.productionBranch})`);
  }
  const siteOrigin = new URL(site).origin;
  if (!String(secrets.HUSHMATES_ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).includes(siteOrigin)) { say('the secrets name this site', 'refused', `${siteOrigin} isn't in HUSHMATES_ALLOWED_ORIGINS`); return { ok: false, steps }; }
  if (secrets.HUSHMATES_AI_URL || secrets.HUSHMATES_AI_TOKEN) { say('AI stays off', 'refused', 'the secrets file sets AI: remove it'); return { ok: false, steps }; }

  // -------------------------------------------------------------- 1. extensions --
  const available = await rows("select name, installed_version from pg_catalog.pg_available_extensions where name in ('pg_cron', 'pg_net')");
  let cronOn = false;
  for (const ext of ['pg_cron', 'pg_net']) {
    const row = available.find((r) => r.name === ext);
    if (!row) say(`the ${ext} extension`, 'skipped', 'not available on this database (it is on Supabase)');
    else if (row.installed_version) say(`the ${ext} extension`, 'unchanged', `already on (${row.installed_version})`);
    else { if (apply) await api.query(ref, EXTENSIONS_SQL[ext]); say(`the ${ext} extension`, verb, 'enabled'); }
    if (ext === 'pg_cron') cronOn = !!row && (!!row.installed_version || apply);
  }

  // ---------------------------------------------- 2. the scheduler's Vault secrets --
  // before the migrations: the last one schedules a job every minute, which reads these. The address
  // depends on the project only, and Vault is there on Supabase before any migration
  const hasVault = (await rows("select 1 from pg_catalog.pg_namespace where nspname = 'vault'")).length;
  if (!hasVault) say('the scheduler’s address and secret in Vault', 'skipped', 'no Vault on this database (it is on Supabase)');
  else {
    const jobUrl = `https://${ref}.supabase.co/functions/v1/hushmates`;
    if (apply) {
      for (const [name, value] of [['hushmates_job_url', jobUrl], ['hushmates_job_secret', secrets.HUSHMATES_JOB_SECRET]]) {
        const found = await rows('select id from vault.secrets where name = $1', [name]);
        if (found.length) await api.query(ref, 'select vault.update_secret($1::uuid, $2)', [found[0].id, value]);
        else await api.query(ref, 'select vault.create_secret($1, $2)', [value, name]);
      }
    }
    say('the scheduler’s address and secret in Vault (as parameters, never in the SQL text)', verb);
  }

  // -------------------------------------------------------------- 3. migrations --
  // (an early Supabase CLI made the table without the last two columns)
  if (apply) await api.query(ref, 'create schema if not exists supabase_migrations; create table if not exists supabase_migrations.schema_migrations (version text not null primary key, statements text[], name text); alter table supabase_migrations.schema_migrations add column if not exists statements text[], add column if not exists name text;');
  const appliedRows = apply || (await rows("select 1 from pg_catalog.pg_tables where schemaname = 'supabase_migrations' and tablename = 'schema_migrations'")).length
    ? await rows('select * from supabase_migrations.schema_migrations') : [];
  const applied = new Map(appliedRows.map((r) => [String(r.version), r.statements]));
  for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()) {
    const [, version, name] = /^(\d+)_(.+)\.sql$/.exec(file) || [];
    if (!version) { say(`migration ${file}`, 'failed', 'not named <timestamp>_<name>.sql'); return { ok: false, steps }; }
    const sql = readFileSync(join(migrationsDir, file), 'utf8');
    if (applied.has(version)) {
      // an applied migration edited in place would never run again: staging would quietly test the old SQL
      const recorded = applied.get(version);
      if (!Array.isArray(recorded) || !recorded.length) say(`migration ${file}`, 'unchanged', 'already applied (no statements were recorded, so it can’t be compared with the file)');
      else if (!sameSql(recorded.join('\n'), sql)) { say(`migration ${file}`, 'failed', `${file} changed after it was applied: add a new migration instead`); return { ok: false, steps }; }
      else say(`migration ${file}`, 'unchanged', 'already applied, the same as the file');
      continue;
    }
    // one request: the migration and its record together (a multi-statement query runs as one transaction)
    if (apply) await api.query(ref, `${sql}\n;\ninsert into supabase_migrations.schema_migrations (version, name, statements) values ('${version}', '${name.replace(/'/g, "''")}', array[${dollarQuote(sql)}]);`);
    say(`migration ${file}`, verb, 'applied');
  }
  if (apply) {
    if (!cronOn) say('the scheduled jobs', 'skipped', 'no pg_cron on this database (it is on Supabase)');
    else {
      const jobs = await rows("select jobname from cron.job where jobname like 'hushmates-%' order by jobname").catch(() => []);
      say('the scheduled jobs', jobs.length === 2 ? 'unchanged' : 'failed', jobs.map((j) => j.jobname).join(', ') || 'none: enable pg_cron and pg_net, then run the schedules block of the last migration');
    }
  }

  // ---------------------------------------------------- 4. the exposed schema --
  const pgrst = await api.getPostgrest(ref);
  const schemas = String(pgrst.db_schema || 'public').split(',').map((s) => s.trim()).filter(Boolean);
  if (schemas.includes('hushmates_api')) say('the hushmates_api schema is exposed to the Data API', 'unchanged');
  else { if (apply) await api.patchPostgrest(ref, { db_schema: [...schemas, 'hushmates_api'].join(',') }); say('the hushmates_api schema is exposed to the Data API', verb, `${schemas.join(',')} → +hushmates_api`); }

  // -------------------------------------------------------------- 5. sign-in --
  const auth = await api.getAuth(ref);
  const wantAuth = { ...AUTH_CONFIG, site_url: siteOrigin };
  const authDiff = Object.fromEntries(Object.entries(wantAuth).filter(([k, v]) => auth?.[k] !== v));
  if (!Object.keys(authDiff).length) say('sign-in by email code (length, expiry, both templates, site address)', 'unchanged');
  else { if (apply) await api.patchAuth(ref, authDiff); say('sign-in by email code (length, expiry, both templates, site address)', verb, `changes: ${Object.keys(authDiff).join(', ')}`); }

  // ------------------------------------------------- 6. the function's secrets --
  const names = ['HUSHMATES_DATA_KEYS', 'HUSHMATES_DATA_KEY_ID', 'HUSHMATES_MAC_KEY', 'HUSHMATES_JOB_SECRET', 'HUSHMATES_ALLOWED_ORIGINS', ...(secrets.HUSHMATES_JWT_SECRET ? ['HUSHMATES_JWT_SECRET'] : []), ...(secrets.HUSHMATES_CLIENT_IP_HEADER ? ['HUSHMATES_CLIENT_IP_HEADER'] : [])];
  const existing = new Set(((await api.listSecrets(ref)) || []).map((s) => s.name));
  if (apply) await api.createSecrets(ref, names.map((name) => ({ name, value: secrets[name] })));
  say('the Edge Function’s secrets (values not shown)', verb, `${names.length} set (${names.filter((n) => !existing.has(n)).length} new)`);

  // ------------------------------------------------------ 7. the Edge Function --
  const files = functionFiles();
  if (apply) {
    await api.deployFunction(ref, FUNCTION.slug, functionForm(files));
    const fnInfo = await api.getFunction(ref, FUNCTION.slug);
    if (fnInfo?.verify_jwt !== false) { say('the Edge Function', 'failed', 'it was deployed with the platform’s token check on: it must be off (the function checks every token itself)'); return { ok: false, steps }; }
  }
  say('the Edge Function', verb, `${FUNCTION.slug}: ${files.length} files, verify_jwt off`);

  // ------------------------------------------------------------------ 8. site --
  if (publishSite) {
    const keys = (await api.apiKeys(ref)) || [];
    const publishable = keys.find((k) => k.type === 'publishable')?.api_key || keys.find((k) => k.name === 'anon')?.api_key;
    if (!publishable) { say('the web app', 'failed', 'no publishable (or anon) key on the project'); return { ok: false, steps }; }
    const r = apply ? await publishSite({ supabaseUrl: `https://${ref}.supabase.co`, anonKey: publishable, site: siteOrigin, pages })
      : { detail: pages ? `would build the site and publish it to the Pages project ${pages.name} (${pages.productionBranch})` : 'would build the site for uploading by hand' };
    say('the web app', r?.failed ? 'failed' : verb, r?.detail || '');
  }
  return { ok: !steps.some((s) => ['failed', 'refused'].includes(s.status)), steps };
}

/**
 * Publish the site to the Pages project the Cloudflare check found (CLOUDFLARE_API_TOKEN and
 * CLOUDFLARE_ACCOUNT_ID set): read it again by name, and only if it is still there at the site's
 * address, build the folder and deploy it with wrangler to its production branch. It never creates
 * a project: the owner makes it in the Cloudflare dashboard (docs/STAGING_CLOUD.md), so it is theirs
 * and its address is the one they saw; and deploying to an existing Pages project is a plain Pages
 * deploy. Without the Cloudflare settings it builds the folder for uploading by hand.
 */
export function makePublisher({ env = process.env, run = spawnSync, lookup = pagesProject, out = join(ROOT, 'dist', 'site') } = {}) {
  return async ({ supabaseUrl, anonKey, site, pages = null }) => {
    const { packSite } = await import('./pack-site.mjs');
    const origin = new URL(site).origin;
    const cloudflare = env.CLOUDFLARE_API_TOKEN && env.CLOUDFLARE_ACCOUNT_ID;
    let found = null;
    // the lookup first: a refused publish builds nothing
    if (cloudflare) {
      if (!pages?.name) return { failed: true, detail: 'the Cloudflare account wasn’t checked before the deploy, so nothing was published' };
      found = await lookup({ token: env.CLOUDFLARE_API_TOKEN, accountId: env.CLOUDFLARE_ACCOUNT_ID, name: pages.name });
      if (!found.exists) return { failed: true, detail: `there is no Pages project called "${pages.name}" on the Cloudflare account: make it in the dashboard first (docs/STAGING_CLOUD.md, step 3). This tool never creates one` };
      if (!found.subdomain || `https://${found.subdomain}` !== origin) return { failed: true, detail: `the Pages project "${pages.name}" is at ${found.subdomain ? `https://${found.subdomain}` : 'no address yet'}, not ${origin}${found.subdomain ? `: run again with --site https://${found.subdomain}` : ''}` };
    }
    packSite({ supabaseUrl, anonKey, out });
    if (!cloudflare) return { detail: `built ${out.startsWith(`${ROOT}/`) ? relative(ROOT, out) : out}: upload it to the Pages project by hand (docs/STAGING.md part 7)` };
    const dep = run('npx', ['--yes', WRANGLER, 'pages', 'deploy', out, '--project-name', pages.name, '--branch', found.productionBranch, '--commit-dirty=true'], { cwd: ROOT, encoding: 'utf8', env: wranglerEnv(env) });
    if (dep.status !== 0) return { failed: true, detail: `wrangler pages deploy failed: ${(dep.stderr || '').slice(-200)}` };
    return { detail: `built and published to the Pages project ${pages.name} (${found.productionBranch})` };
  };
}

function runAsCommand() {
  try { return !!process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; }
}

if (runAsCommand()) {
  const arg = (name) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : undefined; };
  const stop = (m) => { console.error(m); process.exit(2); };
  const { stagingSecrets, guardPages } = await import('./staging-env.mjs');
  const ref = arg('project-ref') || '';
  const site = arg('site') || '';
  const env = process.env;
  if (!env.SUPABASE_ACCESS_TOKEN) stop('SUPABASE_ACCESS_TOKEN isn’t set (a personal access token of the staging-only Supabase account; docs/STAGING_CLOUD.md)');
  if (!/^https:\/\/[a-z0-9.-]+$/i.test(site)) stop('Give the staging site: --site https://<name>.pages.dev');
  if (!env.CLOUDFLARE_API_TOKEN !== !env.CLOUDFLARE_ACCOUNT_ID) stop('Set both CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID (to publish the site), or neither (to build it for uploading by hand)');
  let secrets; let source;
  try { ({ secrets, source } = stagingSecrets({ ref, site })); } catch (e) { stop(`✗ ${e.message}`); }
  const apply = process.argv.includes('--apply');
  const cloudflare = !!env.CLOUDFLARE_API_TOKEN;
  console.log(apply ? 'Deploying STAGING (approved for staging only).' : 'A dry run: reading only. Add --apply to make the changes.');
  console.log(`Secrets from ${source === 'root' ? 'the root secret (HUSHMATES_STAGING_ROOT_SECRET)' : '.data/staging.env'}; ${cloudflare ? 'the Cloudflare account is checked before anything changes' : 'no Cloudflare settings, so the site is built for uploading by hand'}.`);
  const checkPages = cloudflare ? () => guardPages({ token: env.CLOUDFLARE_API_TOKEN, accountId: env.CLOUDFLARE_ACCOUNT_ID, site, name: arg('pages-project') || null }) : null;
  try {
    const r = await deployStaging({ api: createManagementApi({ token: env.SUPABASE_ACCESS_TOKEN, base: managementBase(env) }), ref, site, secrets, apply, checkPages, publishSite: makePublisher() });
    console.log(r.ok ? (apply ? '\nDone. Next: npm run staging:check, then npm run staging:e2e (docs/STAGING.md).' : '\nThe dry run found nothing in the way.') : '\nStopped: see the line marked ✗ or ⛔.');
    process.exit(r.ok ? 0 : 1);
  } catch (e) { console.error(`✗ ${e.message}`); process.exit(1); }
}
