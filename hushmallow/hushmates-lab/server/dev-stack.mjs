#!/usr/bin/env node
// The whole of Hushmates on one machine, with no outside service and nothing deployed:
//   · Postgres (local): the real schema, rules and jobs from supabase/migrations;
//   · a local copy of Supabase Auth: passwordless email codes (printed here, never emailed);
//   · the Hushmates Edge Function's own code (the gateway), on the same origin;
//   · the customer app at /app/, the safety team's desk at /staff/, and the lab at /lab/
//     for testers only (it prints the tester address);
//   · the scheduler: every 15 seconds, the same job the Supabase cron runs every minute.
//
//   node server/dev-stack.mjs [--port 8090] [--db hushmates_dev]
//   HUSHMATES_PG=postgres://postgres@127.0.0.1:54329  HUSHMATES_TESTER_KEY=…  HUSHMATES_INVITES=CODE1,CODE2
//
// Keys for encrypting words are made once and kept in .data/dev-keys.json (never committed).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import pg from 'pg';
import { createHushmatesServer } from './server.mjs';
import { appFiles, labFiles, staffFiles, LAB_ROOT } from './app-files.mjs';
import { inviteMac, newCode } from './admin.mjs';
import { createPgDb } from './pg-db.mjs';
import { migrate } from './migrate.mjs';
import { createAuthEmulator } from './auth-emulator.mjs';
import { createGateway } from '../supabase/functions/_shared/gateway.js';
import { createVerifier } from '../supabase/functions/_shared/jwt.js';
import { createFieldCrypt } from '../supabase/functions/_shared/fieldcrypt.js';
import { createMallowFor } from '../supabase/functions/_shared/mallow-setup.js';

export async function startDevStack({
  port = 8090, host = '127.0.0.1', pgUrl = process.env.HUSHMATES_PG || 'postgres://postgres@127.0.0.1:54329', database = 'hushmates_dev',
  pool: givenPool = null, anonKey: givenAnonKey = null, moveDbClock = false, files: givenFiles = null,
  testerKey = process.env.HUSHMATES_TESTER_KEY || null, invites = [], staffInvites = [], keysFile = join(LAB_ROOT, '.data', 'dev-keys.json'),
  now = () => Date.now(), tickMs = 15e3, log = console, quiet = false,
} = {}) {
  // the database, made and migrated if needed (tests hand in one of their own)
  let pool = givenPool;
  if (!pool) {
    const admin = new pg.Client({ connectionString: `${pgUrl}/postgres` });
    await admin.connect();
    if (!/^[a-z0-9_]+$/.test(database)) throw new Error('a database name is lowercase letters, digits and _');
    if (!(await admin.query('select 1 from pg_database where datname = $1', [database])).rowCount) await admin.query(`create database ${database}`);
    await admin.end();
    pool = new pg.Pool({ connectionString: `${pgUrl}/${database}`, max: 10 });
  }
  await pool.query(`do $$ begin
    if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
    if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
    if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
  end $$;`).catch(() => {});
  // a test's database comes with every migration applied (tests/backend-helpers.mjs)
  if (!givenPool) await migrate(pool, join(LAB_ROOT, 'supabase', 'migrations'), { log: quiet ? {} : log });

  // keys: made once, kept locally
  let keys;
  if (existsSync(keysFile)) keys = JSON.parse(readFileSync(keysFile, 'utf8'));
  else {
    keys = { dataKeyId: 'dev1', dataKey: randomBytes(32).toString('base64'), macKey: randomBytes(32).toString('base64'),
      jobSecret: randomBytes(24).toString('base64url'), serviceKey: `dev-service-${randomBytes(18).toString('base64url')}` };
    mkdirSync(join(keysFile, '..'), { recursive: true });
    writeFileSync(keysFile, JSON.stringify(keys, null, 2), { mode: 0o600 });
  }
  const anonKey = givenAnonKey || JSON.parse(readFileSync(join(LAB_ROOT, 'app', 'config.json'), 'utf8')).supabaseAnonKey;
  const origin = `http://${host}:${port}`;
  const issuer = `${origin}/auth/v1`;

  const auth = await createAuthEmulator({ pool, issuer, serviceKey: keys.serviceKey, anonKey, now, log: quiet ? {} : log });
  const verifier = createVerifier({ issuers: [{ iss: issuer, provider: 'hushmates', audience: 'authenticated', jwks: auth.jwks, methods: ['otp', 'magiclink'] }], now });
  const crypt = await createFieldCrypt({ keys: { [keys.dataKeyId]: keys.dataKey }, current: keys.dataKeyId, macKey: keys.macKey });
  const db = createPgDb(pool, moveDbClock ? { now } : {});     // tests move the database's clock with theirs
  const mallow = createMallowFor({ db, env: process.env, log, now });
  const gateway = createGateway({
    db, verifier, crypt, mallow, log, now,
    config: { allowedOrigins: [origin, `http://localhost:${port}`], jobSecret: keys.jobSecret, ownIssuers: [issuer] },
    authAdmin: { deleteUser: async ({ subject }) => {
      const res = await fetch(`${issuer}/admin/users/${subject}`, { method: 'DELETE', headers: { apikey: keys.serviceKey, authorization: `Bearer ${keys.serviceKey}` } });
      if (!res.ok && res.status !== 404) throw new Error(`auth delete ${res.status}`);    // gone already is fine
    } },
  });

  // invitations: the ones given, else three for members and one for the safety team (printed below)
  const codes = invites.length ? invites : [newCode(), newCode(), newCode()];
  const staffCodes = staffInvites.length ? staffInvites : [newCode()];
  for (const [list, role] of [[codes, 'member'], [staffCodes, 'moderator']]) {
    for (const code of list) {
      const mac = await inviteMac(crypt, code);
      const exists = (await pool.query('select 1 from hushmates.invites where code_mac = $1', [mac])).rowCount;
      if (!exists) await db.rpc('admin_create_invite', { p_code_mac: mac, p_role: role, p_max_uses: 1 });
    }
  }

  // the source tree's app and desk, or (for end-to-end tests) a production build of them
  const files = givenFiles || new Map([...appFiles(), ...staffFiles()]);
  const host_ = createHushmatesServer({ mode: 'development', files, labFiles: testerKey ? labFiles() : null, testerKey, auth, gateway, secureCookies: false, now, log });
  await new Promise((r) => host_.server.listen(port, host, r));
  const timer = setInterval(() => { gateway.tick().catch((e) => log.error?.('tick failed', e.message)); }, tickMs);
  timer.unref?.();
  if (!quiet) {
    log.log(`Hushmates (local) on ${origin}/app/   ·   the safety desk: ${origin}/staff/`);
    log.log(`Invitations: ${codes.join(', ')}   ·   for the safety team: ${staffCodes.join(', ')}`);
    log.log('Sign-in codes are printed here as they are asked for: no email is sent.');
    if (host_.hasLab) log.log(`Lab for testers: ${origin}/lab/?key=${testerKey}`);
  }
  return {
    origin, pool, db, crypt, gateway, auth, keys, codes, staffCodes, hasLab: host_.hasLab,
    async close() { clearInterval(timer); await host_.close(); await auth.close?.(); if (!givenPool) await pool.end(); },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
  const list = (v) => (v || '').split(',').map((x) => x.trim()).filter(Boolean);
  const stack = await startDevStack({ port: Number(arg('port', 8090)), database: arg('db', 'hushmates_dev'),
    invites: list(process.env.HUSHMATES_INVITES), staffInvites: list(process.env.HUSHMATES_STAFF_INVITES) });
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => stack.close().then(() => process.exit(0)));
}
