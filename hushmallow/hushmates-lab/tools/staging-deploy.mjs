#!/usr/bin/env node
// Sets up and deploys the STAGING project from a script, step by step, with the owner's
// approval already given for staging (never production). It uses Supabase's Management API
// directly (no Supabase CLI binary, no Docker) and, for the web app, Cloudflare's own wrangler.
//
//   node tools/staging-deploy.mjs --project-ref <ref> --site https://<name>.pages.dev            a dry run: reads, changes nothing
//   node tools/staging-deploy.mjs --project-ref <ref> --site https://<name>.pages.dev --apply    does it
//
// It refuses unless:
//   · the project is named like staging (contains "staging"), is in Sydney (ap-southeast-2) and healthy;
//   · the access token can see NO project that isn't staging (so a token from the account that holds
//     Hushmallow's production project is refused: make a separate Supabase account for staging);
//   · the staging secrets are complete, with AI off, and name the same site. They come from
//     .data/staging.env on the owner's computer, or are derived from HUSHMATES_STAGING_ROOT_SECRET
//     in a cloud session (tools/staging-env.mjs, docs/STAGING_CLOUD.md).
//
// What --apply does, each step idempotent (safe to run again):
//   1. enables pg_cron and pg_net (as Supabase documents);
//   2. applies supabase/migrations not yet applied, each in one transaction, recorded where the
//      Supabase CLI records them (supabase_migrations.schema_migrations);
//   3. exposes the hushmates_api schema to the Data API;
//   4. sets sign-in by email code: code length 6, 10 minutes, the two email templates with the code,
//      no auto-confirm, captcha off (no widget yet), the site address;
//   5. sets the Edge Function's secrets from .data/staging.env;
//   6. stores the scheduler's address and secret in Vault (as query parameters, never in the SQL text);
//   7. deploys the Edge Function (the entry point and every file it imports, with verify_jwt off);
//   8. builds the site for this project with its publishable key, and publishes it with wrangler to
//      the Pages project the owner made (CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID set), or says
//      where to upload it. It never creates a Pages project.
//
//   SUPABASE_ACCESS_TOKEN   a personal access token of the staging-only Supabase account
//   CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID   optional: a token with "Cloudflare Pages: Edit" on the staging account
//   HUSHMATES_STAGING_ROOT_SECRET   in a cloud session, instead of .data/staging.env
// Nothing secret is printed. AI stays off. It never touches billing, and makes no paid change.

import { readFileSync, realpathSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { guardStaging, pagesProject } from './staging-env.mjs';

export { createManagementApi } from './staging-env.mjs';

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

/**
 * Read the project, decide what would change, and (with apply) change it.
 * → { ok, steps: [{ step, status: 'done'|'would'|'unchanged'|'skipped'|'failed'|'refused', detail }] }
 */
export async function deployStaging({ api, ref, site, secrets, apply = false, migrationsDir = join(ROOT, 'supabase', 'migrations'), publishSite = null, log = console }) {
  const steps = [];
  const say = (step, status, detail = '') => { steps.push({ step, status, detail }); (log.log || (() => {}))(`${{ done: '✓', unchanged: '·', would: '→', skipped: '·', failed: '✗', refused: '⛔' }[status] || '?'} ${step}${detail ? `: ${detail}` : ''}`); };
  const verb = apply ? 'done' : 'would';

  // ------------------------------------------------------------------ guards --
  const guard = await guardStaging({ api, ref });
  if (!guard.ok) { say('the project is staging, in Sydney, running, and the only one the token reaches', 'refused', guard.why); return { ok: false, steps }; }
  say('the project is a staging project, in Sydney, and the token reaches nothing else', 'unchanged', guard.project.name);
  const siteOrigin = new URL(site).origin;
  if (!String(secrets.HUSHMATES_ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).includes(siteOrigin)) { say('the secrets name this site', 'refused', `${siteOrigin} isn't in HUSHMATES_ALLOWED_ORIGINS`); return { ok: false, steps }; }
  if (secrets.HUSHMATES_AI_URL || secrets.HUSHMATES_AI_TOKEN) { say('AI stays off', 'refused', 'the secrets file sets AI: remove it'); return { ok: false, steps }; }

  // -------------------------------------------------------------- 1. extensions --
  const available = (await api.query(ref, "select name, installed_version from pg_catalog.pg_available_extensions where name in ('pg_cron', 'pg_net')")) || [];
  for (const ext of ['pg_cron', 'pg_net']) {
    const row = available.find((r) => r.name === ext);
    if (!row) say(`the ${ext} extension`, 'skipped', 'not available on this database (it is on Supabase)');
    else if (row.installed_version) say(`the ${ext} extension`, 'unchanged', `already on (${row.installed_version})`);
    else { if (apply) await api.query(ref, EXTENSIONS_SQL[ext]); say(`the ${ext} extension`, verb, 'enabled'); }
  }

  // -------------------------------------------------------------- 2. migrations --
  await (apply ? api.query(ref, 'create schema if not exists supabase_migrations; create table if not exists supabase_migrations.schema_migrations (version text not null primary key, statements text[], name text);') : Promise.resolve());
  const appliedRows = apply || (await api.query(ref, "select 1 from pg_catalog.pg_tables where schemaname = 'supabase_migrations' and tablename = 'schema_migrations'"))?.length
    ? await api.query(ref, 'select version from supabase_migrations.schema_migrations') : [];
  const applied = new Set((appliedRows || []).map((r) => String(r.version)));
  for (const file of (await import('node:fs')).readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()) {
    const [, version, name] = /^(\d+)_(.+)\.sql$/.exec(file) || [];
    if (!version) { say(`migration ${file}`, 'failed', 'not named <timestamp>_<name>.sql'); return { ok: false, steps }; }
    if (applied.has(version)) { say(`migration ${file}`, 'unchanged', 'already applied'); continue; }
    const sql = readFileSync(join(migrationsDir, file), 'utf8');
    // one request: the migration and its record together (a multi-statement query runs as one transaction)
    if (apply) await api.query(ref, `${sql}\n;\ninsert into supabase_migrations.schema_migrations (version, name, statements) values ('${version}', '${name.replace(/'/g, "''")}', array[${dollarQuote(sql)}]);`);
    say(`migration ${file}`, verb, 'applied');
  }

  // ---------------------------------------------------- 3. the exposed schema --
  const pgrst = await api.getPostgrest(ref);
  const schemas = String(pgrst.db_schema || 'public').split(',').map((s) => s.trim()).filter(Boolean);
  if (schemas.includes('hushmates_api')) say('the hushmates_api schema is exposed to the Data API', 'unchanged');
  else { if (apply) await api.patchPostgrest(ref, { db_schema: [...schemas, 'hushmates_api'].join(',') }); say('the hushmates_api schema is exposed to the Data API', verb, `${schemas.join(',')} → +hushmates_api`); }

  // -------------------------------------------------------------- 4. sign-in --
  const auth = await api.getAuth(ref);
  const wantAuth = { ...AUTH_CONFIG, site_url: siteOrigin };
  const authDiff = Object.fromEntries(Object.entries(wantAuth).filter(([k, v]) => auth?.[k] !== v));
  if (!Object.keys(authDiff).length) say('sign-in by email code (length, expiry, both templates, site address)', 'unchanged');
  else { if (apply) await api.patchAuth(ref, authDiff); say('sign-in by email code (length, expiry, both templates, site address)', verb, `changes: ${Object.keys(authDiff).join(', ')}`); }

  // ------------------------------------------------- 5. the function's secrets --
  const names = ['HUSHMATES_DATA_KEYS', 'HUSHMATES_DATA_KEY_ID', 'HUSHMATES_MAC_KEY', 'HUSHMATES_JOB_SECRET', 'HUSHMATES_ALLOWED_ORIGINS', ...(secrets.HUSHMATES_JWT_SECRET ? ['HUSHMATES_JWT_SECRET'] : []), ...(secrets.HUSHMATES_CLIENT_IP_HEADER ? ['HUSHMATES_CLIENT_IP_HEADER'] : [])];
  const existing = new Set(((await api.listSecrets(ref)) || []).map((s) => s.name));
  if (apply) await api.createSecrets(ref, names.map((name) => ({ name, value: secrets[name] })));
  say('the Edge Function’s secrets (values not shown)', verb, `${names.length} set (${names.filter((n) => !existing.has(n)).length} new)`);

  // --------------------------------------------- 6. the scheduler's Vault secrets --
  const hasVault = (await api.query(ref, "select 1 from pg_catalog.pg_namespace where nspname = 'vault'"))?.length;
  if (!hasVault) say('the scheduler’s address and secret in Vault', 'skipped', 'no Vault on this database (it is on Supabase)');
  else {
    const jobUrl = `https://${ref}.supabase.co/functions/v1/hushmates`;
    if (apply) {
      for (const [name, value] of [['hushmates_job_url', jobUrl], ['hushmates_job_secret', secrets.HUSHMATES_JOB_SECRET]]) {
        const found = await api.query(ref, 'select id from vault.secrets where name = $1', [name]);
        if (found?.length) await api.query(ref, 'select vault.update_secret($1::uuid, $2)', [found[0].id, value]);
        else await api.query(ref, 'select vault.create_secret($1, $2)', [value, name]);
      }
    }
    say('the scheduler’s address and secret in Vault (as parameters, never in the SQL text)', verb);
    if (apply) {
      const jobs = (await api.query(ref, "select jobname from cron.job where jobname like 'hushmates-%' order by jobname").catch(() => [])) || [];
      say('the scheduled jobs', jobs.length === 2 ? 'unchanged' : 'failed', jobs.map((j) => j.jobname).join(', ') || 'none: enable pg_cron and pg_net, then run the schedules block of the last migration');
    }
  }

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
    const r = apply ? await publishSite({ supabaseUrl: `https://${ref}.supabase.co`, anonKey: publishable, site: siteOrigin }) : { detail: 'would build and publish dist/site' };
    say('the web app', r?.failed ? 'failed' : verb, r?.detail || '');
  }
  return { ok: !steps.some((s) => ['failed', 'refused'].includes(s.status)), steps };
}

/**
 * Build dist/site for the project, then publish it with wrangler to the Pages project the owner
 * made (CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID set). It never creates a project: the owner
 * makes it in the Cloudflare dashboard (docs/STAGING_CLOUD.md), so it is theirs and its address is
 * the one they saw; and deploying to an existing Pages project is a plain Pages deploy.
 */
export function makePublisher({ pagesProject: name, env = process.env, run = spawnSync, lookup = pagesProject }) {
  return async ({ supabaseUrl, anonKey, site }) => {
    const { packSite } = await import('./pack-site.mjs');
    const out = join(ROOT, 'dist', 'site');
    packSite({ supabaseUrl, anonKey, out });
    if (!env.CLOUDFLARE_API_TOKEN || !env.CLOUDFLARE_ACCOUNT_ID) return { detail: `built ${relative(ROOT, out)}: upload it to the Pages project by hand (docs/STAGING.md part 7)` };
    const found = await lookup({ token: env.CLOUDFLARE_API_TOKEN, accountId: env.CLOUDFLARE_ACCOUNT_ID, name });
    if (!found.exists) return { failed: true, detail: `there is no Pages project called "${name}" on the Cloudflare account: make it in the dashboard first (docs/STAGING_CLOUD.md, step 3). This tool never creates one` };
    if (site && found.subdomain && `https://${found.subdomain}` !== new URL(site).origin) return { failed: true, detail: `the Pages project "${name}" is at https://${found.subdomain}, not ${new URL(site).origin}: run again with --site https://${found.subdomain}` };
    const wr = (args) => run('npx', ['--yes', WRANGLER, ...args], { cwd: ROOT, encoding: 'utf8', env: { ...env, WRANGLER_SEND_METRICS: 'false' } });
    const dep = wr(['pages', 'deploy', out, '--project-name', name, '--branch', found.productionBranch, '--commit-dirty=true']);
    if (dep.status !== 0) return { failed: true, detail: `wrangler pages deploy failed: ${(dep.stderr || '').slice(-200)}` };
    return { detail: `built and published to the Pages project ${name} (${found.productionBranch})` };
  };
}

function runAsCommand() {
  try { return !!process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; }
}

if (runAsCommand()) {
  const arg = (name) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : undefined; };
  const stop = (m) => { console.error(m); process.exit(2); };
  const { stagingSecrets } = await import('./staging-env.mjs');
  const ref = arg('project-ref') || '';
  const site = arg('site') || '';
  if (!process.env.SUPABASE_ACCESS_TOKEN) stop('SUPABASE_ACCESS_TOKEN isn’t set (a personal access token of the staging-only Supabase account; docs/STAGING_CLOUD.md)');
  if (!/^https:\/\/[a-z0-9.-]+$/i.test(site)) stop('Give the staging site: --site https://<name>.pages.dev');
  let secrets;
  try { ({ secrets } = stagingSecrets({ ref, site })); } catch (e) { stop(`✗ ${e.message}`); }
  const apply = process.argv.includes('--apply');
  const pagesProject = arg('pages-project') || new URL(site).hostname.replace(/\.pages\.dev$/, '');
  console.log(apply ? 'Deploying STAGING (approved for staging only).' : 'A dry run: reading only. Add --apply to make the changes.');
  try {
    const r = await deployStaging({ api: createManagementApi({ token: process.env.SUPABASE_ACCESS_TOKEN }), ref, site, secrets, apply, publishSite: makePublisher({ pagesProject }) });
    console.log(r.ok ? (apply ? '\nDone. Next: npm run staging:check, then npm run staging:e2e (docs/STAGING.md).' : '\nThe dry run found nothing in the way.') : '\nStopped: see the line marked ✗ or ⛔.');
    process.exit(r.ok ? 0 : 1);
  } catch (e) { console.error(`✗ ${e.message}`); process.exit(1); }
}
