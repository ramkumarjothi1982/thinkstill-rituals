// The Edge Function's database client (supabase/functions/_shared/postgrest-db.js) against the
// local PostgREST stand-in, on a real migrated database. On Supabase the same client calls the
// real PostgREST; here the stand-in follows PostgREST's documented rules for what Hushmates
// relies on, and Postgres itself (the migrations' grants) decides who may call what: the
// service role may call hushmates_api, nobody else may, and no other schema is reachable.

import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createPostgrestEmulator } from '../server/postgrest-emulator.mjs';
import { createPostgrestDb } from '../supabase/functions/_shared/postgrest-db.js';
import { freshDb } from './backend-helpers.mjs';

const SERVICE = 'sb_secret_service-key-for-these-tests-only';   // a new-style secret key (apikey only)
const LEGACY = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.legacy-service-key';   // a legacy one (a JWT)
const ANON = 'anon-key-for-these-tests-only';
const USER = 'a-signed-in-person-s-token';

let db; let server; let url;
test.before(async () => {
  db = await freshDb();
  const rest = createPostgrestEmulator({ pool: db.pool, serviceKey: SERVICE, anonKey: ANON, log: { error() {} },
    verifyUser: async (t) => { if (t !== USER) throw new Error('not signed'); return { sub: 'x' }; } });
  server = http.createServer(async (req, res) => { if (!(await rest.handle(req, res, new URL(req.url, 'http://x').pathname))) { res.writeHead(404); res.end(); } });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  url = `http://127.0.0.1:${server.address().port}`;
});
test.after(async () => { await new Promise((r) => server.close(r)); await db.drop(); });

const raw = (fn, body, { key = SERVICE, bearer = /^eyJ/.test(String(key)) ? key : null, profile = 'hushmates_api', method = 'POST' } = {}) => fetch(`${url}/rest/v1/rpc/${fn}`, {
  method,
  headers: { ...(key ? { apikey: key } : {}), ...(bearer ? { authorization: `Bearer ${bearer}` } : {}), 'content-type': 'application/json', ...(profile ? { 'content-profile': profile } : {}) },
  body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
});

test('the Edge Function’s database client works through PostgREST’s interface', async () => {
  const edgeDb = createPostgrestDb({ url, serviceKey: SERVICE });
  const settings = await edgeDb.rpc('settings', {});
  assert.equal(typeof settings, 'object');
  assert.ok(settings.limits || settings.ai || Object.keys(settings).length > 0, 'settings came back empty');
  // the one door: a person's call comes back as an answer (errors included), never as an HTTP failure
  const out = await edgeDb.rpc('rpc', { p_issuer: 'https://nobody.example/auth/v1', p_subject: 'nobody', p_method: 'listJourneys', p_args: {}, p_ctx: {} });
  assert.equal(out.error?.code, 'invite-required', JSON.stringify(out));
  // a void function answers 204 and the client reads it as null
  assert.equal(await edgeDb.rpc('auth_deletion_done', { p_issuer: 'https://nobody.example/auth/v1', p_subject: 'nobody' }), null);
  // optional arguments may be left out; a null is passed as SQL null
  assert.equal(typeof await edgeDb.rpc('job_mallow_claim', {}), 'object');
  assert.equal(typeof await edgeDb.rpc('ai_summary', { p_member: null }), 'object');
  // a refused call is an error the function sees (and logs), with PostgREST's status
  await assert.rejects(() => createPostgrestDb({ url, serviceKey: 'wrong-key-wrong-key-wrong' }).rpc('settings', {}), (e) => e.status === 401);
  // a new-style key sent as a Bearer token is refused, as on Supabase ("Invalid JWT"): the client never does that
  const asBearer = await raw('settings', {}, { bearer: SERVICE });
  assert.equal(asBearer.status, 401);
  assert.match((await asBearer.json()).message, /Invalid JWT/);
});

test('a project still on the legacy keys: the same client sends the service key as a Bearer token too', async () => {
  const rest = createPostgrestEmulator({ pool: db.pool, serviceKey: LEGACY, anonKey: ANON, log: { error() {} } });
  const srv = http.createServer(async (req, res) => { await rest.handle(req, res, new URL(req.url, 'http://x').pathname); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  try {
    const seen = [];
    const spy = (u, o) => { seen.push(o.headers); return fetch(u, o); };
    const legacyDb = createPostgrestDb({ url: `http://127.0.0.1:${srv.address().port}`, serviceKey: LEGACY, fetch: spy });
    assert.equal(typeof await legacyDb.rpc('settings', {}), 'object');
    assert.equal(seen[0].authorization, `Bearer ${LEGACY}`);
    const newDb = [];
    await createPostgrestDb({ url, serviceKey: SERVICE, fetch: (u, o) => { newDb.push(o.headers); return fetch(u, o); } }).rpc('settings', {});
    assert.equal(newDb[0].authorization, undefined, 'a new-style key was sent as a Bearer token');
  } finally { await new Promise((r) => srv.close(r)); }
});

test('only the service role may call hushmates_api: Postgres’s own grants decide', async () => {
  const anon = await raw('settings', {}, { key: ANON });
  assert.equal(anon.status, 401);
  assert.equal((await anon.json()).code, '42501', 'the anon role reached hushmates_api');
  const person = await raw('settings', {}, { key: ANON, bearer: USER });
  assert.equal(person.status, 403);
  assert.equal((await person.json()).code, '42501', 'a signed-in person reached hushmates_api directly');
  // the door itself is refused too, so nobody can call it with someone else's identity
  const door = await raw('rpc', { p_issuer: 'x', p_subject: 'y', p_method: 'listJourneys' }, { key: ANON, bearer: USER });
  assert.equal(door.status, 403);
  // a forged bearer is refused before the database
  assert.equal((await raw('settings', {}, { key: ANON, bearer: 'forged' })).status, 401);
  assert.equal((await raw('settings', {}, { key: null, bearer: SERVICE })).status, 401, 'no API key, yet answered');
  assert.equal((await raw('settings', {}, { key: 'not-a-project-key', bearer: SERVICE })).status, 401);
});

test('only the exposed schema, only named arguments that exist', async () => {
  const internal = await raw('clock', {}, { profile: 'hushmates' });
  assert.equal(internal.status, 406, 'the internal schema was reachable');
  assert.equal((await internal.json()).code, 'PGRST106');
  assert.equal((await raw('settings', {}, { profile: null })).status, 404, 'found without the schema header (public has no such function)');
  const extra = await raw('settings', { p_sneaky: 1 });
  assert.equal(extra.status, 404, 'an unknown argument was accepted');
  assert.equal((await extra.json()).code, 'PGRST202');
  assert.equal((await raw('rpc', { p_issuer: 'x' })).status, 404, 'a call without a required argument was accepted');
  assert.equal((await raw('settings', {}, { method: 'GET' })).status, 405);
  assert.equal((await raw('no_such_function', {})).status, 404);
  const table = await fetch(`${url}/rest/v1/members`, { headers: { apikey: SERVICE, authorization: `Bearer ${SERVICE}` } });
  assert.equal(table.status, 404, 'tables are not served');
});
