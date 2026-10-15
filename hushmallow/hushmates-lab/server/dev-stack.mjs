#!/usr/bin/env node
// The whole of Hushmates on one machine, with no outside service and nothing deployed:
//   · Postgres (local): the real schema, rules and jobs from supabase/migrations;
//   · a local copy of Supabase Auth: passwordless email codes (printed here, never emailed);
//   · the Hushmates Edge Function's own code (the gateway), on the same origin: run here under
//     Node (the default), or with edge: 'deno' (HUSHMATES_EDGE=deno) the real entry point
//     supabase/functions/hushmates/index.ts under Deno, reaching the database over HTTP through
//     a local stand-in for Supabase's PostgREST (/rest/v1/rpc/…), as it will on Supabase;
//   · the customer app at /app/, the safety team's desk at /staff/, and the lab at /lab/
//     for testers only (it prints the tester address);
//   · the scheduler: every 15 seconds, the same job the Supabase cron runs every minute.
//
//   node server/dev-stack.mjs [--port 8090] [--db hushmates_dev]
//   HUSHMATES_PG=postgres://postgres@127.0.0.1:54329  HUSHMATES_TESTER_KEY=…  HUSHMATES_INVITES=CODE1,CODE2
//
// Keys for encrypting words are made once and kept in .data/dev-keys.json (never committed).

import { existsSync, mkdirSync, readFileSync, writeFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import net from 'node:net';
import pg from 'pg';
import { createHushmatesServer } from './server.mjs';
import { appFiles, labFiles, staffFiles, LAB_ROOT } from './app-files.mjs';
import { inviteMac, newCode } from './admin.mjs';
import { createPgDb } from './pg-db.mjs';
import { migrate } from './migrate.mjs';
import { createAuthEmulator } from './auth-emulator.mjs';
import { createPostgrestEmulator } from './postgrest-emulator.mjs';
import { createGateway } from '../supabase/functions/_shared/gateway.js';
import { createVerifier } from '../supabase/functions/_shared/jwt.js';
import { createFieldCrypt } from '../supabase/functions/_shared/fieldcrypt.js';
import { createMallowFor } from '../supabase/functions/_shared/mallow-setup.js';
import { keyHeaders } from '../supabase/functions/_shared/postgrest-db.js';

export async function startDevStack({
  port = 8090, host = '127.0.0.1', pgUrl = process.env.HUSHMATES_PG || 'postgres://postgres@127.0.0.1:54329', database = 'hushmates_dev',
  pool: givenPool = null, anonKey: givenAnonKey = null, moveDbClock = false, files: givenFiles = null,
  testerKey = process.env.HUSHMATES_TESTER_KEY || null, invites = [], staffInvites = [], keysFile = join(LAB_ROOT, '.data', 'dev-keys.json'),
  now = () => Date.now(), dbNow = null, tickMs = 15e3, log = console, quiet = false,
  edge = process.env.HUSHMATES_EDGE || 'node', deno = process.env.HUSHMATES_DENO || 'deno',
} = {}) {
  if (!['node', 'deno'].includes(edge)) throw new Error(`edge is 'node' or 'deno', not ${edge}`);
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
      jobSecret: randomBytes(24).toString('base64url'), serviceKey: `sb_secret_dev_${randomBytes(18).toString('base64url')}` };   // a new-style secret key, as a new project has
    mkdirSync(join(keysFile, '..'), { recursive: true });
    writeFileSync(keysFile, JSON.stringify(keys, null, 2), { mode: 0o600 });
  }
  const anonKey = givenAnonKey || JSON.parse(readFileSync(join(LAB_ROOT, 'app', 'config.json'), 'utf8')).supabaseAnonKey;
  const origin = `http://${host}:${port}`;
  const issuer = `${origin}/auth/v1`;

  const auth = await createAuthEmulator({ pool, issuer, serviceKey: keys.serviceKey, anonKey, now, log: quiet ? {} : log });
  const verifier = createVerifier({ issuers: [{ iss: issuer, provider: 'hushmates', audience: 'authenticated', jwks: auth.jwks, methods: ['otp', 'magiclink'] }], now });
  const crypt = await createFieldCrypt({ keys: { [keys.dataKeyId]: keys.dataKey }, current: keys.dataKeyId, macKey: keys.macKey });
  // tests move the database's clock with theirs (with the Edge Function under Deno, only the database's: Deno keeps real time)
  const dbClock = dbNow || (moveDbClock ? now : null);
  const db = createPgDb(pool, dbClock ? { now: dbClock } : {});
  const allowedOrigins = [origin, `http://localhost:${port}`];
  let gateway;
  let edgeProcess = null;
  // Supabase's PostgREST, for the Edge Function under Deno, and for checks that it refuses browsers (tools/staging-check.mjs)
  const rest = createPostgrestEmulator({ pool, serviceKey: keys.serviceKey, anonKey, verifyUser: (t) => verifier.verify(t), now: dbClock, log });
  if (edge === 'node') {
    const mallow = createMallowFor({ db, env: process.env, log, now });
    gateway = createGateway({
      db, verifier, crypt, mallow, log, now,
      config: { allowedOrigins, jobSecret: keys.jobSecret, ownIssuers: [issuer] },
      authAdmin: { deleteUser: async ({ subject }) => {
        const res = await fetch(`${issuer}/admin/users/${subject}`, { method: 'DELETE', headers: keyHeaders(keys.serviceKey) });
        if (!res.ok && res.status !== 404) throw new Error(`auth delete ${res.status}`);    // gone already is fine
      } },
    });
  } else {
    const started = await startEdgeFunction({ deno, origin, allowedOrigins, keys, log, quiet });
    edgeProcess = started.child;
    gateway = edgeProxy({ edgeOrigin: started.origin, jobSecret: keys.jobSecret });
  }

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
  const host_ = createHushmatesServer({ mode: 'development', files, labFiles: testerKey ? labFiles() : null, testerKey, auth, rest, gateway, secureCookies: false, now, log });
  try {
    await new Promise((r, j) => { host_.server.once('error', j); host_.server.listen(port, host, r); });
  } catch (e) { edgeProcess?.kill('SIGTERM'); throw e; }
  const timer = setInterval(() => { gateway.tick().catch((e) => log.error?.('tick failed', e.message)); }, tickMs);
  timer.unref?.();
  if (!quiet) {
    log.log(`Hushmates (local) on ${origin}/app/   ·   the safety desk: ${origin}/staff/`);
    if (edge === 'deno') log.log('The Edge Function: supabase/functions/hushmates/index.ts under Deno, through the local PostgREST stand-in.');
    log.log(`Invitations: ${codes.join(', ')}   ·   for the safety team: ${staffCodes.join(', ')}`);
    log.log('Sign-in codes are printed here as they are asked for: no email is sent.');
    if (host_.hasLab) log.log(`Lab for testers: ${origin}/lab/?key=${testerKey}`);
  }
  return {
    origin, pool, db, crypt, gateway, auth, rest, edge, keys, codes, staffCodes, hasLab: host_.hasLab,
    async close() {
      clearInterval(timer);
      await host_.close();
      if (edgeProcess && edgeProcess.exitCode === null) { const gone = new Promise((r) => edgeProcess.once('exit', r)); edgeProcess.kill('SIGTERM'); await gone; }
      await auth.close?.();
      if (!givenPool) await pool.end();
    },
  };
}

const freePort = () => new Promise((r, j) => { const s = net.createServer(); s.on('error', j); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });

// every secret supabase/functions/hushmates/index.ts reads: Deno may read these and nothing else
const EDGE_ENV = ['SUPABASE_URL', 'SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY', 'HUSHMATES_DATA_KEYS', 'HUSHMATES_DATA_KEY_ID', 'HUSHMATES_MAC_KEY', 'HUSHMATES_JOB_SECRET',
  'HUSHMATES_ALLOWED_ORIGINS', 'HUSHMATES_JWT_SECRET', 'HUSHMATES_CLIENT_IP_HEADER', 'HUSHMATES_AI_URL', 'HUSHMATES_AI_TOKEN',
  'ANOTHER_ANGLE_COST_PER_CALL_AUD', 'ANOTHER_ANGLE_TIMEOUT_MS', 'HUSHMATES_EDGE_PORT'];

/**
 * The real Edge Function under Deno, given only its secrets (as on Supabase) and only this machine
 * to talk to: --allow-net=127.0.0.1 means any call to anywhere else fails, so AI stays off.
 */
async function startEdgeFunction({ deno, origin, allowedOrigins, keys, log, quiet }) {
  const port = await freePort();
  const env = {
    PATH: process.env.PATH || '', HOME: process.env.HOME || '', NO_COLOR: '1', ...(process.env.DENO_DIR ? { DENO_DIR: process.env.DENO_DIR } : {}),
    // as a new project gives it (a legacy-style key, a JWT, comes as SUPABASE_SERVICE_ROLE_KEY instead)
    SUPABASE_URL: origin, ...(/^eyJ/.test(keys.serviceKey) ? { SUPABASE_SERVICE_ROLE_KEY: keys.serviceKey } : { SUPABASE_SECRET_KEYS: JSON.stringify({ default: keys.serviceKey }) }),
    HUSHMATES_DATA_KEYS: JSON.stringify({ [keys.dataKeyId]: keys.dataKey }), HUSHMATES_DATA_KEY_ID: keys.dataKeyId,
    HUSHMATES_MAC_KEY: keys.macKey, HUSHMATES_JOB_SECRET: keys.jobSecret, HUSHMATES_ALLOWED_ORIGINS: allowedOrigins.join(','),
    HUSHMATES_EDGE_PORT: String(port),
  };
  const child = spawn(deno, ['run', '--no-prompt', '--allow-net=127.0.0.1', `--allow-env=${EDGE_ENV.join(',')}`, join(LAB_ROOT, 'server', 'edge-local.ts')],
    { env, cwd: LAB_ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  let said = '';
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`the Edge Function didn't start under Deno in 30 s:\n${said.slice(-2000)}`)), 30e3);
    child.on('error', (e) => { clearTimeout(timer); reject(new Error(`couldn't run Deno (${deno}): ${e.message}`)); });
    child.on('exit', (code) => { clearTimeout(timer); reject(new Error(`the Edge Function stopped (exit ${code}):\n${said.slice(-2000)}`)); });
    child.stdout.on('data', (d) => {
      said += d;
      if (said.includes(`edge function listening on ${port}`)) { clearTimeout(timer); resolve(); }
      if (!quiet) process.stdout.write(`[edge] ${d}`);
    });
    child.stderr.on('data', (d) => { said += d; (log.error || (() => {}))(`[edge] ${String(d).trimEnd()}`); });
  });
  await ready;
  return { child, origin: `http://127.0.0.1:${port}` };
}

/** The dev host's way to the Edge Function under Deno: the same requests, passed on as they are. */
function edgeProxy({ edgeOrigin, jobSecret }) {
  const DROP_IN = new Set(['host', 'connection', 'content-length', 'accept-encoding', 'keep-alive', 'transfer-encoding']);
  const DROP_OUT = new Set(['content-encoding', 'content-length', 'transfer-encoding', 'connection', 'keep-alive', 'date']);
  return {
    async handle(request) {
      const u = new URL(request.url);
      const headers = [...request.headers].filter(([k]) => !DROP_IN.has(k));
      const body = ['GET', 'HEAD'].includes(request.method) ? undefined : Buffer.from(await request.arrayBuffer());
      const r = await fetch(`${edgeOrigin}${u.pathname}${u.search}`, { method: request.method, headers, body, redirect: 'manual' });
      return new Response(Buffer.from(await r.arrayBuffer()), { status: r.status, headers: [...r.headers].filter(([k]) => !DROP_OUT.has(k)) });
    },
    // the scheduler's call, as pg_cron makes it on Supabase: POST /jobs/tick with the job secret
    async tick() {
      const r = await fetch(`${edgeOrigin}/functions/v1/hushmates/jobs/tick`, { method: 'POST', headers: { 'x-hushmates-job': jobSecret, 'content-type': 'application/json' }, body: '{}' });
      const body = await r.json().catch(() => null);
      if (!r.ok || !body?.ok) throw new Error(`the scheduler's call failed (${r.status})`);
      return body.result;
    },
  };
}

/** Run as `node <this file>`? Compared as real paths, so spaces, % or a symlink in the path don't stop it. */
function runAsCommand() {
  try { return !!process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; }
}

if (runAsCommand()) {
  const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
  const list = (v) => (v || '').split(',').map((x) => x.trim()).filter(Boolean);
  const stack = await startDevStack({ port: Number(arg('port', 8090)), database: arg('db', 'hushmates_dev'),
    invites: list(process.env.HUSHMATES_INVITES), staffInvites: list(process.env.HUSHMATES_STAFF_INVITES) });
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => stack.close().then(() => process.exit(0)));
}
