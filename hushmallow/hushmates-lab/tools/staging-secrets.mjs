#!/usr/bin/env node
// The staging project's own secrets, made on the owner's computer and kept in one private
// file (.data/staging.env, readable by the owner only, never committed). Nothing secret is
// printed: Supabase reads the file directly (`supabase secrets set --env-file …`), and the
// one value the database's scheduler needs goes into a second private file to paste into the
// SQL editor (.data/staging-vault.sql).
//
//   node tools/staging-secrets.mjs new --origin https://<staging web address> --project-ref <ref>
//   node tools/staging-secrets.mjs check            is the file complete and well formed? (prints no secret)
//
// Keep a copy of .data/staging.env in a password manager. Losing it makes every stored
// feeling unreadable and every invitation code useless; that is what the encryption is for.

import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync, realpathSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const ENV_FILE = join(ROOT, '.data', 'staging.env');
export const VAULT_FILE = join(ROOT, '.data', 'staging-vault.sql');
export const SECRET_NAMES = ['HUSHMATES_DATA_KEYS', 'HUSHMATES_DATA_KEY_ID', 'HUSHMATES_MAC_KEY', 'HUSHMATES_JOB_SECRET', 'HUSHMATES_ALLOWED_ORIGINS'];
// set only with the owner's approval (AI), or only on a legacy project (the shared JWT secret)
const NEVER_HERE = ['HUSHMATES_AI_URL', 'HUSHMATES_AI_TOKEN'];

/** KEY=value lines (values may be single-quoted); # comments and blank lines ignored. */
export function readEnvFile(file = ENV_FILE) {
  const out = {};
  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line);
    if (!m) throw new Error(`a line in ${file} isn't KEY=value`);
    out[m[1]] = m[2].replace(/^'(.*)'$/, '$1');
  }
  return out;
}

const b64bytes = (s) => { try { return Buffer.from(String(s), 'base64').length; } catch { return 0; } };

/** What's wrong with a set of secrets (an empty list when nothing is). Never repeats a value. */
export function problemsWith(env) {
  const problems = [];
  for (const k of SECRET_NAMES) if (!env[k]) problems.push(`${k} is missing`);
  let keys = {};
  try { keys = JSON.parse(env.HUSHMATES_DATA_KEYS || '{}'); } catch { problems.push('HUSHMATES_DATA_KEYS isn’t JSON like {"k1":"<base64>"}'); }
  for (const [kid, key] of Object.entries(keys)) {
    if (!/^[a-z0-9]{1,16}$/i.test(kid)) problems.push(`the key id "${kid}" should be letters and digits`);
    if (b64bytes(key) !== 32) problems.push(`the data key ${kid} isn’t 32 bytes of base64`);
  }
  if (env.HUSHMATES_DATA_KEY_ID && !keys[env.HUSHMATES_DATA_KEY_ID]) problems.push('HUSHMATES_DATA_KEY_ID names a key that isn’t in HUSHMATES_DATA_KEYS');
  if (env.HUSHMATES_MAC_KEY && b64bytes(env.HUSHMATES_MAC_KEY) !== 32) problems.push('HUSHMATES_MAC_KEY isn’t 32 bytes of base64');
  if (env.HUSHMATES_JOB_SECRET && env.HUSHMATES_JOB_SECRET.length < 24) problems.push('HUSHMATES_JOB_SECRET is too short');
  for (const o of String(env.HUSHMATES_ALLOWED_ORIGINS || '').split(',').map((x) => x.trim()).filter(Boolean)) {
    let u = null;
    try { u = new URL(o); } catch { /* below */ }
    if (!u || u.protocol !== 'https:' || u.origin !== o) problems.push(`"${o}" in HUSHMATES_ALLOWED_ORIGINS should be just https:// and the host, with no path or trailing slash`);
  }
  for (const k of NEVER_HERE) if (env[k]) problems.push(`${k} is set: AI must stay off until the owner approves it (docs/STAGING.md, step 9)`);
  return problems;
}

function writePrivate(file, text) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text, { mode: 0o600 });
  chmodSync(file, 0o600);
}

export function makeSecrets({ origin, projectRef }) {
  const env = {
    HUSHMATES_DATA_KEYS: JSON.stringify({ k1: randomBytes(32).toString('base64') }),
    HUSHMATES_DATA_KEY_ID: 'k1',
    HUSHMATES_MAC_KEY: randomBytes(32).toString('base64'),
    HUSHMATES_JOB_SECRET: randomBytes(24).toString('base64url'),
    HUSHMATES_ALLOWED_ORIGINS: origin,
  };
  const file = [
    '# Hushmates STAGING secrets. Private: never commit, never paste into chat, keep a copy in a password manager.',
    `# Made ${new Date().toISOString()} for project ${projectRef}. Losing HUSHMATES_DATA_KEYS makes stored feelings unreadable.`,
    ...Object.entries(env).map(([k, v]) => `${k}='${v}'`),
    '',
  ].join('\n');
  const vault = [
    '-- Hushmates STAGING: the scheduler\'s two secrets, for Supabase\'s SQL editor (docs/STAGING.md, step 5).',
    '-- Private: this file holds the job secret. Paste it, run it, then you may delete this file.',
    `select vault.create_secret('https://${projectRef}.supabase.co/functions/v1/hushmates', 'hushmates_job_url');`,
    `select vault.create_secret('${env.HUSHMATES_JOB_SECRET}', 'hushmates_job_secret');`,
    '',
  ].join('\n');
  return { env, file, vault };
}

function runAsCommand() {
  try { return !!process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; }
}

if (runAsCommand()) {
  const [cmd] = process.argv.slice(2);
  const arg = (name) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : undefined; };
  if (cmd === 'new') {
    const origin = String(arg('origin') || '').replace(/\/+$/, '');
    const projectRef = String(arg('project-ref') || '');
    if (!/^[a-z0-9]{20}$/.test(projectRef)) { console.error('Give the staging project’s reference: --project-ref <the 20 letters in its dashboard address>'); process.exit(2); }
    if (existsSync(ENV_FILE) && !process.argv.includes('--replace-and-lose-data')) {
      console.error(`${ENV_FILE} already exists. Making new keys would make everything already stored with the old ones unreadable.`);
      console.error('If this staging project has no data worth keeping, add --replace-and-lose-data.');
      process.exit(2);
    }
    const made = makeSecrets({ origin, projectRef });
    const problems = problemsWith(made.env);
    if (problems.length) { for (const p of problems) console.error(`✗ ${p}`); process.exit(2); }
    writePrivate(ENV_FILE, made.file);
    writePrivate(VAULT_FILE, made.vault);
    console.log(`✓ Secrets made and saved (readable by you only):\n    ${ENV_FILE}\n    ${VAULT_FILE}`);
    console.log('\nNext:');
    console.log('  1. Copy .data/staging.env into your password manager now.');
    console.log('  2. supabase secrets set --env-file .data/staging.env');
    console.log('  3. Open .data/staging-vault.sql, paste it into the SQL editor of the staging project, and run it.');
  } else if (cmd === 'check') {
    if (!existsSync(ENV_FILE)) { console.error(`No ${ENV_FILE} yet: run "new" first.`); process.exit(2); }
    const problems = problemsWith(readEnvFile());
    if (problems.length) { for (const p of problems) console.error(`✗ ${p}`); process.exit(1); }
    console.log('✓ .data/staging.env is complete and well formed (values not shown).');
  } else {
    console.log('node tools/staging-secrets.mjs new --origin https://<staging web address> --project-ref <ref>\nnode tools/staging-secrets.mjs check');
  }
}
