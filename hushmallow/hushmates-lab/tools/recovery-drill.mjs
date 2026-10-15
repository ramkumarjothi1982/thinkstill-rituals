#!/usr/bin/env node
// The recovery drill: proves a backup of the Hushmates database can be brought back and read.
// It restores a backup into a brand-new database on this computer (never onto Supabase), then
// opens every stored feeling, perspective and report note with the keys in .data/staging.env.
// A backup without its keys is unreadable by design: this drill is how you find out you have both.
//
//   1. Make a backup (Supabase's free plan keeps none for you; Pro keeps daily ones):
//        pg_dump "$HUSHMATES_ADMIN_PG" --format=custom --schema=hushmates --schema=hushmates_api --file=.data/hushmates-backup.dump
//      (pg_dump's major version must be at least the project's Postgres version: see docs/STAGING.md)
//   2. node tools/recovery-drill.mjs --dump .data/hushmates-backup.dump [--keep]
//
//   HUSHMATES_DRILL_PG   the local Postgres to restore into (default postgres://postgres@127.0.0.1:54329)
//   HUSHMATES_PG_BIN     where pg_restore is, if it isn't on the PATH

import { existsSync, realpathSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { createFieldCrypt, isEncrypted } from '../supabase/functions/_shared/fieldcrypt.js';
import { readEnvFile, ENV_FILE } from './staging-secrets.mjs';

const ENCRYPTED = [['journeys', 'text_enc'], ['perspectives', 'text_enc'], ['mallow_perspectives', 'text_enc'], ['reports', 'details_enc'], ['report_notes', 'text_enc']];
const COUNTED = ['members', 'invites', 'journeys', 'perspectives', 'mallow_perspectives', 'reports', 'audit_log'];

/** pg_dump / pg_restore: HUSHMATES_PG_BIN, the PATH, or the newest local Postgres install. */
export function pgTool(name) {
  const dirs = [process.env.HUSHMATES_PG_BIN, ...(process.env.PATH || '').split(':')].filter(Boolean);
  try { dirs.push(...readdirSync('/usr/lib/postgresql').sort((a, b) => Number(b) - Number(a)).map((v) => `/usr/lib/postgresql/${v}/bin`)); } catch { /* not Debian-style */ }
  for (const d of dirs) if (existsSync(join(d, name))) return join(d, name);
  return null;
}

/**
 * Restore `dump` into a new local database and read it back with `keys`.
 * → { database, tables: {name: rows}, encrypted, opened, unreadable, kids: {kid: n}, kept }
 */
export async function runRecoveryDrill({ dump, keys, current, macKey, pgUrl = process.env.HUSHMATES_DRILL_PG || 'postgres://postgres@127.0.0.1:54329', keep = false }) {
  const restore = pgTool('pg_restore');
  if (!restore) throw new Error('pg_restore isn’t installed here (install the Postgres client tools, or set HUSHMATES_PG_BIN)');
  if (!existsSync(dump)) throw new Error(`no backup at ${dump}`);
  const database = `hm_drill_${randomBytes(4).toString('hex')}`;
  const admin = new pg.Client({ connectionString: `${pgUrl}/postgres` });
  await admin.connect();
  try {
    await admin.query(`create database ${database}`);
  } finally { await admin.end(); }
  const pool = new pg.Pool({ connectionString: `${pgUrl}/${database}`, max: 2 });
  try {
    // the roles a Supabase backup refers to
    await pool.query(`do $$ begin
      if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
      if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
      if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
    end $$;`).catch(() => {});
    const r = spawnSync(restore, ['--no-owner', '--no-privileges', '--exit-on-error', '--dbname', `${pgUrl}/${database}`, dump], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`pg_restore failed: ${(r.stderr || '').trim().split('\n').slice(-3).join(' ')}`);
    const tables = {};
    for (const t of COUNTED) tables[t] = (await pool.query(`select count(*)::int n from hushmates.${t}`)).rows[0].n;
    const crypt = await createFieldCrypt({ keys, current, macKey });
    let encrypted = 0; let opened = 0; let unreadable = 0; let plain = 0;
    const kids = {};
    for (const [table, column] of ENCRYPTED) {
      const { rows } = await pool.query(`select ${column} as v from hushmates.${table} where ${column} <> ''`);
      for (const { v } of rows) {
        if (!isEncrypted(v)) { plain += 1; continue; }
        encrypted += 1;
        const kid = v.split(':')[2];
        kids[kid] = (kids[kid] || 0) + 1;
        try { await crypt.decrypt(v); opened += 1; } catch { unreadable += 1; }
      }
    }
    return { database, tables, encrypted, opened, unreadable, plain, kids, kept: keep };
  } finally {
    await pool.end();
    if (!keep) {
      const c = new pg.Client({ connectionString: `${pgUrl}/postgres` });
      await c.connect();
      try { await c.query(`drop database if exists ${database} with (force)`); } finally { await c.end(); }
    }
  }
}

function runAsCommand() {
  try { return !!process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; }
}

if (runAsCommand()) {
  const arg = (name) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : undefined; };
  const dump = arg('dump');
  if (!dump) { console.error('node tools/recovery-drill.mjs --dump <backup file> [--keep]   (see the top of this file)'); process.exit(2); }
  if (!existsSync(ENV_FILE)) { console.error('No .data/staging.env: the drill needs the keys the backup was locked with.'); process.exit(2); }
  const env = readEnvFile();
  try {
    const out = await runRecoveryDrill({ dump, keys: JSON.parse(env.HUSHMATES_DATA_KEYS), current: env.HUSHMATES_DATA_KEY_ID, macKey: env.HUSHMATES_MAC_KEY, keep: process.argv.includes('--keep') });
    console.log(`Restored into a new local database ${out.database}${out.kept ? ' (kept)' : ' (removed again)'}.`);
    console.log(`Rows: ${Object.entries(out.tables).map(([t, n]) => `${t} ${n}`).join(', ')}`);
    console.log(`Locked texts: ${out.encrypted}; opened with your keys: ${out.opened}; unreadable: ${out.unreadable}${out.plain ? `; stored unlocked (should be none): ${out.plain}` : ''}`);
    const ok = out.unreadable === 0 && out.plain === 0;
    console.log(ok ? '✓ The backup and the keys work together.' : '✗ Some stored words could not be read with these keys: find the right keys before you rely on this backup.');
    process.exit(ok ? 0 : 1);
  } catch (e) { console.error(`✗ ${e.message}`); process.exit(1); }
}
