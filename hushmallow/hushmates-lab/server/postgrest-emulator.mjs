// A local stand-in for the one part of Supabase's PostgREST the Edge Function uses: calling
// database functions (POST /rest/v1/rpc/<name>). It lets the real Edge Function entry point
// (supabase/functions/hushmates/index.ts, under Deno) run against the local Postgres exactly
// as it will on Supabase: over HTTP, with the service key, through the exposed hushmates_api
// schema, as the service_role database role, so the grants in the migrations are what
// decides who may call what.
//
// It follows PostgREST's documented behaviour for what Hushmates relies on:
//   · the schema comes from the Content-Profile header and must be an exposed one (else 406, PGRST106);
//   · the JSON body's keys are the function's named arguments; a function is found only if every
//     key is one of its arguments and every argument without a default is given (else 404, PGRST202);
//   · arguments are converted the way PostgREST converts them (jsonb_to_record);
//   · the database role comes from the bearer key: the service key → service_role, the anon key
//     (or none) → anon, a signed-in person's token → authenticated; each call is one transaction
//     with SET LOCAL ROLE, so a role without EXECUTE is refused (401 for anon, 403 otherwise);
//   · a function's value is the response body; a void function answers 204;
//   · a raised error answers 400 (P0001 and data errors), 409 (unique and foreign keys), 500 otherwise,
//     with { code, message, details, hint }.
// Development and tests only: it refuses to start with NODE_ENV=production.

import { createHash, timingSafeEqual } from 'node:crypto';

const NAME = /^[a-z_][a-z0-9_]*$/;
const MAX_BODY = 256 * 1024;
const sha = (s) => createHash('sha256').update(String(s)).digest();
const same = (a, b) => typeof a === 'string' && typeof b === 'string' && timingSafeEqual(sha(a), sha(b));

class RestError extends Error {
  constructor(status, code, message, extra = {}) { super(message); Object.assign(this, { status, code, details: null, hint: null, ...extra }); }
}

/**
 * @param {object} o
 *   pool        a pg Pool for the local database (connects as a superuser, then SET LOCAL ROLE per call)
 *   serviceKey  the key the Edge Function sends (apikey and Bearer)
 *   anonKey     the public key the app ships with
 *   schemas     the exposed schemas (supabase/config.toml [api].schemas)
 *   verifyUser  optional async (token) → claims, for a signed-in person's token (role authenticated)
 *   now         optional () → ms: moves the database's clock (hushmates.fake_now), for tests only
 */
export function createPostgrestEmulator({ pool, serviceKey, anonKey, schemas = ['public', 'graphql_public', 'hushmates_api'], verifyUser = null, now = null, log = console } = {}) {
  if (process.env.NODE_ENV === 'production') throw new Error('the PostgREST stand-in is for local development only');
  if (!pool || typeof pool.connect !== 'function') throw new Error('createPostgrestEmulator needs a pg Pool');
  if (typeof serviceKey !== 'string' || serviceKey.length < 16 || !anonKey || serviceKey === anonKey) throw new Error('a service key (16+ characters) and a different anon key are needed');
  const calls = { total: 0, byRole: {} };

  async function role(req) {
    const apikey = req.headers.apikey;
    // Supabase's API gateway asks for a project key before PostgREST sees the request
    if (!apikey) throw new RestError(401, 'no_api_key', 'No API key found in request');
    if (!same(apikey, serviceKey) && !same(apikey, anonKey)) throw new RestError(401, 'invalid_api_key', 'Invalid API key');
    const m = /^Bearer[ ]+(\S+)$/i.exec(String(req.headers.authorization || ''));
    const token = m ? m[1] : apikey;
    if (same(token, serviceKey)) return 'service_role';
    if (same(token, anonKey)) return 'anon';
    if (verifyUser) { try { await verifyUser(token); return 'authenticated'; } catch { /* below */ } }
    throw new RestError(401, 'PGRST301', 'JWSError JWSInvalidSignature');
  }

  async function readBody(req) {
    const chunks = [];
    let size = 0;
    for await (const c of req) { size += c.length; if (size > MAX_BODY) throw new RestError(413, 'PGRST413', 'Request body too large'); chunks.push(c); }
    const text = Buffer.concat(chunks).toString('utf8');
    if (!text.trim()) return {};
    let body;
    try { body = JSON.parse(text); } catch { throw new RestError(400, 'PGRST102', 'Empty or invalid json'); }
    if (body === null || typeof body !== 'object' || Array.isArray(body)) throw new RestError(400, 'PGRST102', 'An object of named arguments was expected');
    return body;
  }

  async function findFunction(client, schema, fn, keys) {
    const { rows } = await client.query(
      `select p.proname, p.pronargs, p.pronargdefaults, p.proargnames, p.proretset,
              array(select pg_catalog.format_type(t, null) from unnest(p.proargtypes::oid[]) with ordinality u(t, i) order by i) as types,
              pg_catalog.format_type(p.prorettype, null) as returns
         from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
        where n.nspname = $1 and p.proname = $2 and p.prokind = 'f'`, [schema, fn]);
    for (const p of rows) {
      const names = (p.proargnames || []).slice(0, p.pronargs);
      if (names.length !== p.pronargs || names.some((n) => !NAME.test(n || ''))) continue;      // unnamed arguments: not callable by name
      const required = names.slice(0, p.pronargs - p.pronargdefaults);
      if (keys.every((k) => names.includes(k)) && required.every((k) => keys.includes(k))) {
        return { names, types: p.types, returns: p.returns, setof: p.proretset };
      }
    }
    throw new RestError(404, 'PGRST202', `Could not find the function ${schema}.${fn}(${keys.join(', ')}) in the schema cache`,
      { hint: null, details: `Searched for the function ${schema}.${fn} with parameters ${keys.join(', ') || 'none'}` });
  }

  function statusOf(e, who) {
    const c = String(e.code || '');
    if (c === '42501') return who === 'anon' ? 401 : 403;
    if (c === '42883' || c === '42P01') return 404;
    if (c === '23505' || c === '23503') return 409;
    if (c === 'P0001' || c.startsWith('22') || c.startsWith('23')) return 400;
    if (c === '57014') return 500;
    return 500;
  }

  async function rpc(req, fn) {
    if (req.method !== 'POST') throw new RestError(405, 'PGRST117', `Unsupported HTTP method: ${req.method}`);
    if (!NAME.test(fn)) throw new RestError(404, 'PGRST202', `Could not find the function ${fn}`);
    const who = await role(req);
    const schema = String(req.headers['content-profile'] || 'public');
    if (!schemas.includes(schema)) throw new RestError(406, 'PGRST106', `The schema must be one of the following: ${schemas.join(', ')}`);
    const body = await readBody(req);
    const keys = Object.keys(body);
    if (keys.some((k) => !NAME.test(k))) throw new RestError(404, 'PGRST202', `Could not find the function ${schema}.${fn}`);
    const client = await pool.connect();
    try {
      const f = await findFunction(client, schema, fn, keys);
      const given = f.names.map((n, i) => ({ n, t: f.types[i] })).filter((a) => keys.includes(a.n));
      const sql = given.length
        ? `select "${schema}"."${fn}"(${given.map((a) => `"${a.n}" => a."${a.n}"`).join(', ')}) as r from pg_catalog.jsonb_to_record($1::jsonb) as a(${given.map((a) => `"${a.n}" ${a.t}`).join(', ')})`
        : `select "${schema}"."${fn}"() as r`;
      await client.query('begin');
      try {
        await client.query(`set local role ${who}`);
        if (now) await client.query('select pg_catalog.set_config($1, $2, true)', ['hushmates.fake_now', new Date(now()).toISOString()]);
        const res = await client.query(sql, given.length ? [JSON.stringify(body)] : []);
        await client.query('commit');
        calls.total += 1;
        calls.byRole[who] = (calls.byRole[who] || 0) + 1;
        if (f.returns === 'void') return [204, undefined];
        return [200, f.setof ? res.rows.map((r) => r.r) : (res.rows[0]?.r ?? null)];
      } catch (e) {
        await client.query('rollback').catch(() => {});
        if (e instanceof RestError) throw e;
        throw new RestError(statusOf(e, who), e.code || 'XX000', e.message, { details: e.detail || null, hint: e.hint || null });
      }
    } finally {
      client.release();
    }
  }

  return {
    calls,
    /** Answers anything under /rest/v1/; false for any other path. */
    async handle(req, res, pathname) {
      if (pathname !== '/rest/v1' && !String(pathname).startsWith('/rest/v1/')) return false;
      const send = (status, body) => {
        const text = body === undefined ? '' : JSON.stringify(body);
        res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...(text ? { 'content-length': Buffer.byteLength(text) } : {}) });
        res.end(text || undefined);
      };
      try {
        const m = /^\/rest\/v1\/rpc\/([^/]+)$/.exec(pathname);
        if (!m) throw new RestError(404, 'PGRST125', 'Only database functions are served here (the Edge Function reads no tables directly)');
        const [status, body] = await rpc(req, decodeURIComponent(m[1]));
        send(status, body);
      } catch (e) {
        if (e instanceof RestError) send(e.status, { code: e.code, details: e.details, hint: e.hint, message: e.message });
        else { (log.error || (() => {}))('[postgrest stand-in]', e?.message || e); send(500, { code: 'XX000', details: null, hint: null, message: 'Unexpected failure' }); }
      }
      return true;
    },
  };
}
