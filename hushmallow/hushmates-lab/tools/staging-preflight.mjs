#!/usr/bin/env node
// Before anything goes to the staging project: a checklist run on your own computer. It
// contacts nothing, deploys nothing and changes nothing outside a temporary folder.
//
//   node tools/staging-preflight.mjs [--project-ref <ref> --anon-key <the public anon / publishable key>]
//
// ✓ ready   ✗ must be fixed first   · not checked here (and why)

import { existsSync, readFileSync, mkdtempSync, rmSync, readdirSync, realpathSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sync } from './sync-edge.mjs';
import { build } from './build-app.mjs';
import { readEnvFile, problemsWith, ENV_FILE } from './staging-secrets.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// the migrations every staging database has, in this order; later ones may follow them. The scheduler's
// jobs are made in the API one (its schedules block), not necessarily the last
export const KNOWN_MIGRATIONS = ['20261014090000_hushmates_schema.sql', '20261014090100_hushmates_rules.sql', '20261014090200_hushmates_api.sql', '20261015090000_hushmates_tier0.sql'];
const SCHEDULES_IN = '20261014090200_hushmates_api.sql';
const JOBS = ['hushmates-tick', 'hushmates-retention'];

/** The migration checks, on a folder of migrations: → [{ status, what, detail }] */
export function migrationChecks(dir = join(ROOT, 'supabase', 'migrations')) {
  const out = [];
  const ok = (cond, what, detail) => out.push({ status: cond ? 'pass' : 'fail', what, detail: cond ? '' : detail });
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  const later = files.slice(KNOWN_MIGRATIONS.length);
  const missing = KNOWN_MIGRATIONS.filter((f, i) => files[i] !== f);
  ok(!missing.length, `the ${KNOWN_MIGRATIONS.length} known migrations, first and in order${later.length ? ` (then ${later.length} newer)` : ''}`,
    `not first and in order: ${missing.join(', ')} (the folder has ${files.join(', ') || 'nothing'})`);
  // the deploy and the Supabase CLI both record a migration by the timestamp in its name
  const unnamed = files.filter((f) => !/^\d+_.+\.sql$/.test(f));
  ok(!unnamed.length, 'every migration is named <timestamp>_<name>.sql', unnamed.join(', '));
  const sqlOf = (f) => readFileSync(join(dir, f), 'utf8');
  const schedules = (f) => JOBS.every((j) => sqlOf(f).includes(`cron.schedule('${j}'`));
  const where = files.includes(SCHEDULES_IN) && schedules(SCHEDULES_IN) ? SCHEDULES_IN : files.find(schedules);
  ok(!!where, `the scheduler’s jobs (${JOBS.join(', ')}) are in a migration${where ? ` (${where})` : ''}`, `no migration schedules both (they belong in ${SCHEDULES_IN})`);
  return out;
}

export function preflight({ projectRef = null, anonKey = null, deno = process.env.HUSHMATES_DENO || 'deno' } = {}) {
  const out = [];
  const add = (status, what, detail = '') => out.push({ status, what, detail });
  const ok = (cond, what, detail) => add(cond ? 'pass' : 'fail', what, cond ? '' : detail);

  const major = Number(process.versions.node.split('.')[0]);
  ok(major >= 20, 'Node 20 or newer', `this is Node ${process.versions.node}`);

  const edge = sync({ check: true });
  ok(!edge.changed.length && !edge.stale.length, 'the Edge Function’s shared copies match their sources', `run node tools/sync-edge.mjs (${[...edge.changed, ...edge.stale].join(', ')})`);
  const hasDeno = spawnSync(deno, ['--version']).status === 0;
  if (hasDeno) {
    const r = spawnSync(deno, ['check', 'supabase/functions/hushmates/index.ts'], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' } });
    ok(r.status === 0, 'the Edge Function passes Deno’s type check', (r.stderr || r.stdout).trim().split('\n').slice(0, 3).join(' '));
  } else add('skip', 'the Edge Function passes Deno’s type check', 'Deno isn’t installed here (the deploy bundles it with Deno anyway)');

  const toml = readFileSync(join(ROOT, 'supabase', 'config.toml'), 'utf8');
  ok(/\[functions\.hushmates\][^[]*verify_jwt\s*=\s*false/.test(toml), 'config.toml: the function checks tokens itself (verify_jwt = false)', 'add verify_jwt = false under [functions.hushmates]');
  ok(/schemas\s*=\s*\[[^\]]*"hushmates_api"/.test(toml), 'config.toml: the hushmates_api schema is exposed to the function', 'add "hushmates_api" to [api].schemas');
  ok(/otp_length\s*=\s*6/.test(toml) && /otp_expiry\s*=\s*600/.test(toml), 'config.toml: 6-digit email codes, 10 minutes', 'otp_length = 6, otp_expiry = 600');

  out.push(...migrationChecks());

  if (existsSync(ENV_FILE)) {
    const problems = problemsWith(readEnvFile());
    ok(!problems.length, '.data/staging.env is complete and well formed', problems.join('; '));
    const tracked = spawnSync('git', ['ls-files', '--error-unmatch', ENV_FILE], { cwd: ROOT }).status === 0;
    const ignored = spawnSync('git', ['check-ignore', '-q', ENV_FILE], { cwd: ROOT }).status === 0;
    ok(!tracked && ignored, '.data/staging.env can’t be committed (ignored by git)', tracked ? 'it is tracked by git: remove it from the repository now' : 'it isn’t ignored');
  } else add('fail', '.data/staging.env exists', 'make it: node tools/staging-secrets.mjs new --origin https://<staging web address> --project-ref <ref>');

  if (projectRef && anonKey) {
    const dir = mkdtempSync(join(tmpdir(), 'hushmates-preflight-'));
    try {
      const url = `https://${projectRef}.supabase.co`;
      const results = ['app', 'staff'].map((which) => build({ out: join(dir, which), which, deploy: { supabaseUrl: url, anonKey } }));
      ok(results.every((r) => r.ok), 'the app and the safety desk build for this project, and the build’s own scan finds nothing that mustn’t ship',
        results.flatMap((r) => r.problems).map((p) => `${p.url}: ${p.why}`).slice(0, 3).join('; '));
      if (results.every((r) => r.ok)) {
        const page = readFileSync(join(dir, 'app', 'app', 'index.html'), 'utf8');
        ok(page.includes(url), 'the app’s pages may connect to this project (and nowhere else)', 'the project’s address isn’t in the page’s security policy');
        ok(!existsSync(join(dir, 'app', 'lab')), 'the build has no lab', 'a lab folder was built');
      }
    } catch (e) {
      add('fail', 'the app builds for this project', e.message);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  } else add('skip', 'the app builds for this project', 'give --project-ref and --anon-key to try a build');
  return out;
}

function runAsCommand() {
  try { return !!process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; }
}

if (runAsCommand()) {
  const arg = (name) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : undefined; };
  const list = preflight({ projectRef: arg('project-ref'), anonKey: arg('anon-key') });
  for (const r of list) console.log(`${r.status === 'pass' ? '✓' : r.status === 'skip' ? '·' : '✗'} ${r.what}${r.detail ? `\n    ${r.detail}` : ''}`);
  const failed = list.filter((r) => r.status === 'fail').length;
  console.log(failed ? `\n${failed} to fix before staging.` : '\nReady for the staging steps that need the owner (docs/STAGING.md).');
  process.exit(failed ? 1 : 0);
}
