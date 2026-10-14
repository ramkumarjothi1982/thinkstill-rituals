// Real-database tests: each test file gets its own fresh copy of the Hushmates database
// (made from a template that has every migration applied), the real gateway logic, real
// field encryption, and a clock the tests can move. Postgres runs locally
// (HUSHMATES_TEST_PG, default postgres://postgres@127.0.0.1:54329).

import { readFileSync, readdirSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { createPgDb } from '../server/pg-db.mjs';
import { createGateway } from '../supabase/functions/_shared/gateway.js';
import { createFieldCrypt } from '../supabase/functions/_shared/fieldcrypt.js';
import { libraryProvider } from '../core/perspectives.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const PG_URL = process.env.HUSHMATES_TEST_PG || 'postgres://postgres@127.0.0.1:54329';
const MIGRATIONS = join(ROOT, 'supabase', 'migrations');

export function migrationSql() {
  return readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort().map((f) => readFileSync(join(MIGRATIONS, f), 'utf8'));
}
const LOCAL_ROLES = `do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;`;

async function admin(sql) {
  const c = new pg.Client({ connectionString: `${PG_URL}/postgres` });
  await c.connect();
  try { return await c.query(sql); } finally { await c.end(); }
}

/** A template database with every migration applied, rebuilt whenever a migration changes. */
async function template() {
  const hash = createHash('sha256').update(migrationSql().join('\n--\n')).digest('hex').slice(0, 12);
  const name = `hm_tpl_${hash}`;
  const exists = (await admin(`select 1 from pg_database where datname = '${name}'`)).rowCount > 0;
  if (exists) return name;
  const tmp = `${name}_build_${randomBytes(3).toString('hex')}`;
  await admin(`create database ${tmp}`);
  const c = new pg.Client({ connectionString: `${PG_URL}/${tmp}` });
  await c.connect();
  try {
    await c.query(LOCAL_ROLES);
    for (const sql of migrationSql()) await c.query(sql);
  } finally { await c.end(); }
  try { await admin(`alter database ${tmp} rename to ${name}`); } catch { await admin(`drop database if exists ${tmp}`); }   // another file built it first
  return name;
}

/** A fresh database for one test file. → { pool, url, drop() } */
export async function freshDb() {
  const tpl = await template();
  const name = `hm_t_${randomBytes(5).toString('hex')}`;
  for (let i = 0; ; i++) {
    try { await admin(`create database ${name} template ${tpl}`); break; } catch (e) {
      if (i > 20 || !/being accessed/.test(e.message)) throw e;
      await new Promise((r) => setTimeout(r, 100 + i * 50));
    }
  }
  const pool = new pg.Pool({ connectionString: `${PG_URL}/${name}`, max: 8 });
  // a connection still closing when the test's database is dropped is told so: that's the end of the test, not a failure
  let ending = false;
  pool.on('error', (e) => { if (!ending) throw e; });
  return {
    pool, url: `${PG_URL}/${name}`, name,
    async drop() {
      ending = true;
      await pool.end();
      // wait for the server to finish closing them, then drop (force only for anything left over)
      for (let i = 0; i < 40; i++) {
        if (!(await admin(`select 1 from pg_stat_activity where datname = '${name}'`)).rowCount) break;
        await new Promise((r) => setTimeout(r, 25));
      }
      await admin(`drop database if exists ${name} with (force)`);
    },
  };
}

const KEY = Buffer.alloc(32, 7).toString('base64');
const MAC = Buffer.alloc(32, 9).toString('base64');
export const testCrypt = () => createFieldCrypt({ keys: { k1: KEY }, current: 'k1', macKey: MAC });

/** The library alone (AI off), as the hybrid Mallow behaves with its switch off. */
export const libraryMallow = () => {
  const lib = libraryProvider();
  return { perspective: (o) => lib({ ...o, avoid: o.recentAngles || [] }) };
};

/**
 * A backend for one test file: a fresh database, the gateway, people who joined with invitations,
 * and a clock. → { gw, db, clock, join(name), as(name), advance(ms), sql(q, params), drop() }
 */
export async function backend({ mallow = libraryMallow(), settings = {}, start = Date.UTC(2026, 9, 14, 9) } = {}) {
  const fresh = await freshDb();
  const clock = { t: start };
  const db = createPgDb(fresh.pool, { now: () => clock.t });
  const crypt = await testCrypt();
  const deleted = [];
  const gw = createGateway({ db, crypt, mallow, verifier: null, config: { ownIssuers: ['test'], jobSecret: 'job-secret' }, now: () => clock.t,
    authAdmin: { deleteUser: async (id) => { deleted.push(id); } }, log: { error() {} } });
  for (const [key, value] of Object.entries(settings)) await db.rpc('admin_set_setting', { p_key: key, p_value: value });
  const people = {};
  let n = 0;
  async function invite(code = `CODE${++n}${randomBytes(3).toString('hex')}`.toUpperCase(), { role = 'member', maxUses = 1, expiresAt = null } = {}) {
    await db.rpc('admin_create_invite', { p_code_mac: await crypt.mac(`invite:${code}`), p_role: role, p_max_uses: maxUses, p_expires_at: expiresAt });
    return code;
  }
  async function join(name, { role = 'member', catching = true, mallow: m } = {}) {
    const who = { iss: 'test', sub: `sub-${name}`, provider: 'hushmates' };
    const code = await invite(undefined, { role });
    await gw.call(who, 'redeemInvite', { code, name: name.length >= 3 ? name : `${name}xx`, adult: true });
    await gw.call(who, 'savePreferences', { catching, onboarded: true, ...(m ? { mallow: m } : {}) });
    people[name] = who;
    return who;
  }
  const as = (name) => ({ call: (method, args) => gw.call(people[name], method, args) });
  return {
    gw, db, crypt, clock, people, invite, join, as, deleted,
    advance: async (ms) => { clock.t += ms; },
    tick: () => gw.tick(),
    sql: async (q, params) => { const c = await fresh.pool.connect(); try { await c.query("select set_config('hushmates.fake_now', $1, false)", [new Date(clock.t).toISOString()]); return (await c.query(q, params)).rows; } finally { c.release(); } },
    drop: () => fresh.drop(),
  };
}

export const FEELING = 'My friend hasn’t replied. I think they’re avoiding me.';
export const REFRAMES = [
  'Maybe they’ve had a really full week and meant to reply when they had more energy.',
  'Another possibility could be that they read it on the go and forgot it was still unanswered.',
  'Could there be another explanation, like them worrying about saying the wrong thing?',
  'Maybe the silence says more about their week than about how they feel about you.',
  'It might help to send something light, with no pressure, and see how they are.',
];
let cidN = 0;
export const cid = (p = 'c') => `${p}-${(++cidN).toString(36)}-${randomBytes(4).toString('hex')}`;

export async function rejects(promise, code) {
  try { await promise; } catch (e) { if (e.code === code) return e; throw new Error(`expected ${code}, got ${e.code}: ${e.message}`); }
  throw new Error(`expected ${code}, but it succeeded`);
}
