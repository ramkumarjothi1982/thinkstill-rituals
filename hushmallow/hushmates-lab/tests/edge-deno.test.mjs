// The real Edge Function entry point (supabase/functions/hushmates/index.ts) under Deno, as
// Supabase runs it: given only its secrets, reaching Supabase Auth's keys and the database
// over HTTP (the local Auth copy and the local PostgREST stand-in), allowed to talk to this
// machine only. Skipped (with a note) when no Deno is installed: HUSHMATES_DENO=<path>, or
// `deno` on the PATH. The full app runs through it too: HUSHMATES_EDGE=deno tools/app-shots.mjs.

import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startDevStack } from '../server/dev-stack.mjs';
import { freshDb } from './backend-helpers.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DENO = process.env.HUSHMATES_DENO || 'deno';
const hasDeno = spawnSync(DENO, ['--version'], { encoding: 'utf8' }).status === 0;
const skip = hasDeno ? false : 'no Deno here (set HUSHMATES_DENO to its path to run these)';
const ANON = 'hushmates-test-anon-key-0001';
const quiet = { error() {}, log() {}, warn() {} };
const freePort = () => new Promise((resolve) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); }); });

test('index.ts passes Deno’s type check (what a Supabase deploy bundles)', { skip }, () => {
  const r = spawnSync(DENO, ['check', 'supabase/functions/hushmates/index.ts'], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' } });
  assert.equal(r.status, 0, r.stderr || r.stdout);
});

test('the real entry point under Deno: sign-in keys over HTTP, the database through PostgREST, the scheduler, deletion', { skip, timeout: 120e3 }, async () => {
  const db = await freshDb();
  const dir = mkdtempSync(join(tmpdir(), 'hushmates-deno-'));
  const s = await startDevStack({ port: await freePort(), pool: db.pool, anonKey: ANON, keysFile: join(dir, 'keys.json'), quiet: true, log: quiet,
    invites: ['DENOCODE01', 'DENOCODE02'], staffInvites: ['DENOSTAFF1'], tickMs: 3600e3, edge: 'deno', deno: DENO });
  try {
    const H = { 'content-type': 'application/json', apikey: ANON, origin: s.origin };
    const signIn = async (email) => {
      await fetch(`${s.origin}/auth/v1/otp`, { method: 'POST', headers: H, body: JSON.stringify({ email, create_user: true }) });
      return (await (await fetch(`${s.origin}/auth/v1/verify`, { method: 'POST', headers: H, body: JSON.stringify({ type: 'email', email, token: s.auth.mailbox(email) }) })).json()).access_token;
    };
    const rpc = async (token, method, args = {}, headers = {}) => {
      const r = await fetch(`${s.origin}/functions/v1/hushmates/rpc/${method}`, { method: 'POST', headers: { ...H, authorization: `Bearer ${token}`, ...headers }, body: JSON.stringify({ args }) });
      return { status: r.status, body: await r.json() };
    };
    const a = await signIn('deno-a@example.com');
    assert.equal((await rpc(a, 'me')).body.result.needsInvite, true);
    const joined = await rpc(a, 'redeemInvite', { code: 'DENOCODE01', name: 'Denolight', adult: true });
    assert.equal(joined.status, 200, JSON.stringify(joined.body));
    assert.equal((await rpc(a, 'savePreferences', { catching: true, onboarded: true })).status, 200);
    const sent = await rpc(a, 'submitFeeling', { text: 'I keep replaying what I said in the meeting.', label: 'worry', consent: true, clientId: 'deno-feeling-0001' });
    assert.equal(sent.status, 200, JSON.stringify(sent.body));
    // words are stored locked: the database never holds them readable
    const stored = (await s.pool.query('select text_enc from hushmates.journeys')).rows;
    assert.equal(stored.length, 1);
    assert.ok(!stored[0].text_enc.includes('meeting'), 'the feeling was stored readable');
    // a crisis feeling is held back with support, on Deno as on Node
    const crisis = await rpc(a, 'submitFeeling', { text: 'I want to end my life tonight.', label: 'sadness', consent: true, clientId: 'deno-feeling-0002' });
    assert.equal(crisis.body.result?.status, 'support', JSON.stringify(crisis.body));
    assert.equal(crisis.body.result.level, 'crisis');
    assert.ok(crisis.body.result.support.resources.some((r) => r.tel === '000'));
    assert.equal((await s.pool.query('select count(*)::int n from hushmates.journeys')).rows[0].n, 1, 'the crisis feeling was sent');
    // refusals: another site, no token, a forged token
    assert.equal((await rpc(a, 'me', {}, { origin: 'https://elsewhere.example' })).body.code, 'forbidden');
    assert.equal((await fetch(`${s.origin}/functions/v1/hushmates/rpc/me`, { method: 'POST', headers: H, body: '{}' })).status, 401);
    assert.equal((await rpc(`${a.slice(0, -4)}AAAA`, 'me')).status, 401);
    // the scheduler's route: unknown without the job secret, working with it
    assert.equal((await fetch(`${s.origin}/functions/v1/hushmates/jobs/tick`, { method: 'POST' })).status, 404);
    assert.equal(typeof (await s.gateway.tick()).holdsExpired, 'number');
    // deleting: the account's words and its sign-in go, through Supabase Auth's admin API
    const del = await rpc(a, 'deleteMyData', { confirm: 'DELETE' });
    assert.deepEqual(del.body.result, { deleted: true });
    assert.equal((await s.pool.query("select count(*)::int n from auth.users where email = 'deno-a@example.com'")).rows[0].n, 0, 'the sign-in still exists');
    assert.equal((await s.pool.query("select count(*)::int n from hushmates.journeys where text_enc <> ''")).rows[0].n, 0, 'the words are still stored');
    // every database call went through PostgREST as the service role, nothing else
    assert.ok(s.rest.calls.total > 5);
    assert.deepEqual(Object.keys(s.rest.calls.byRole), ['service_role']);
  } finally {
    await s.close();
    await db.drop();
    rmSync(dir, { recursive: true, force: true });
  }
});
