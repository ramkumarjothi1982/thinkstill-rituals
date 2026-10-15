#!/usr/bin/env node
// Checks a real Hushmates staging project from the outside, the way people and the platform
// will use it, and says plainly what passed, what failed and what it couldn't check. It is
// read-mostly and cleans up after itself; it never sends an email and never calls AI.
//
// What it does, in order:
//   1. Refusals with no account: the function's health, no token, a project key as a token,
//      the scheduler's route without its secret, and browsers going round the function to the
//      database (PostgREST) directly.
//   2. The database's own rules, read over an encrypted connection: row level security on every
//      table, no browser role with any way into the Hushmates schemas, AI off, the scheduler's
//      jobs and Vault secrets present (names only), and the scheduler's last calls answered.
//   3. Real accounts: three test people made with Supabase Auth's admin API and signed in with
//      a generated email code (no email is sent), and invitations made for them.
//   4. The relay end to end through the Edge Function: joining, a feeling, a perspective, a
//      crisis feeling held back with support, another site refused, the same feeling sent five
//      times at once stored once, two people answering at once, and the words stored locked
//      (and readable with the keys in .data/staging.env, which proves the backup keys are the
//      deployed ones).
//   5. A sign-in by password (if the project allows one) is refused by the function.
//   6. The scheduler: called with its secret; and (unless --quick) a short wait to watch the
//      platform's own scheduler end an offer that ran out, about four minutes.
//   7. Deletion: each test person deletes their data; their sign-in is gone from Supabase Auth.
//      Leftover invitations are revoked.
//
//   node tools/staging-check.mjs --project-ref <ref> [--quick]
//
// It needs, in the environment (never on the command line, never committed):
//   HUSHMATES_STAGING_ANON_KEY      the project's anon / publishable key (public)
//   HUSHMATES_STAGING_SERVICE_KEY   the project's service role / secret key (admin: test accounts)
//   HUSHMATES_ADMIN_PG              the database connection string, with sslmode=verify-full (docs/STAGING.md)
// and the staging secrets file .data/staging.env (tools/staging-secrets.mjs).
// A full report is written to .data/staging-check-<time>.json (no secrets in it).

import { mkdirSync, writeFileSync, realpathSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { createFieldCrypt } from '../supabase/functions/_shared/fieldcrypt.js';
import { createAdmin } from '../server/admin.mjs';
import { readEnvFile, problemsWith, ENV_FILE } from './staging-secrets.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOCAL = new Set(['127.0.0.1', 'localhost', '[::1]']);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * @param {object} o
 *   url        the project's URL (https://<ref>.supabase.co; a local stack's origin in the tests)
 *   anonKey, serviceKey, adminPg   as above
 *   secrets    the staging secrets (readEnvFile())
 *   origin     the app's web address (one of HUSHMATES_ALLOWED_ORIGINS)
 *   waitForScheduler   watch the platform's scheduler end an expired offer (needs pg_cron)
 * @returns {Promise<{ ok: boolean, results: {area, what, status, detail}[] }>}
 */
export async function runStagingCheck({ url, anonKey, serviceKey, adminPg, secrets, origin, waitForScheduler = true, log = console, fetch: doFetch = globalThis.fetch,
  // tests only: a local stack's own scheduler stands in for pg_cron, with a shorter wait
  schedulerHere = null, schedulerMarginMs = 100000 } = {}) {
  url = String(url).replace(/\/+$/, '');
  const results = [];
  const say = (area, what, status, detail = '') => {
    results.push({ area, what, status, detail: String(detail).slice(0, 300) });
    (log.log || (() => {}))(`${status === 'pass' ? '✓' : status === 'skip' ? '·' : '✗'} ${area}: ${what}${detail && status !== 'pass' ? ` (${String(detail).slice(0, 160)})` : ''}`);
  };
  const check = (area, what, ok, detail) => say(area, what, ok ? 'pass' : 'fail', ok ? '' : detail);
  const fn = `${url}/functions/v1/hushmates`;
  const run = randomBytes(4).toString('hex');
  const MARK = `staging check ${run}: I keep replaying the meeting and wondering what they thought of me.`;
  const created = { users: [], codes: [] };
  const issuer = `${url}/auth/v1`;

  const http = async (path, { method = 'POST', headers = {}, body } = {}) => {
    const r = await doFetch(path.startsWith('http') ? path : `${fn}${path}`, { method, headers, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) });
    const text = await r.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
    return { status: r.status, body: json, text };
  };
  const rpc = (token, method, args = {}, { from = origin } = {}) => http(`/rpc/${method}`, {
    headers: { 'content-type': 'application/json', apikey: anonKey, ...(token ? { authorization: `Bearer ${token}` } : {}), ...(from ? { origin: from } : {}), 'x-hushmates': '1' },
    body: { args },
  });
  const authAdmin = (path, { method = 'POST', body } = {}) => http(`${issuer}${path}`, {
    method, headers: { 'content-type': 'application/json', apikey: serviceKey, authorization: `Bearer ${serviceKey}` }, body,
  });

  // ------------------------------------------------------------------ 1 --
  const health = await http('/health', { method: 'GET' }).catch((e) => ({ status: 0, text: e.message }));
  check('function', 'answers at /health', health.status === 200 && health.body?.ok === true, `${health.status} ${health.text}`);
  if (health.status !== 200) return { ok: false, results };
  const noToken = await rpc(null, 'me');
  check('function', 'refuses a call with no sign-in (401)', noToken.status === 401, `${noToken.status} ${noToken.text}`);
  const keyAsToken = await rpc(anonKey, 'me');
  check('function', 'refuses the public project key as a sign-in (401)', keyAsToken.status === 401, `${keyAsToken.status}`);
  const tickNoSecret = await http('/jobs/tick', { headers: { 'content-type': 'application/json' }, body: {} });
  check('function', 'the scheduler’s route is “not found” without its secret', tickNoSecret.status === 404, `${tickNoSecret.status}`);
  const direct = await http(`${url}/rest/v1/rpc/settings`, { headers: { apikey: anonKey, authorization: `Bearer ${anonKey}`, 'content-type': 'application/json', 'content-profile': 'hushmates_api' }, body: {} });
  check('database', 'a browser can’t call the database’s functions directly (anon key → permission denied)', [401, 403].includes(direct.status) && direct.body?.code === '42501', `${direct.status} ${direct.text}`);
  const tables = await http(`${url}/rest/v1/journeys?select=*`, { method: 'GET', headers: { apikey: anonKey, authorization: `Bearer ${anonKey}`, 'accept-profile': 'hushmates' } });
  check('database', 'a browser can’t read the tables (the private schema isn’t exposed)', [404, 406].includes(tables.status) && !Array.isArray(tables.body), `${tables.status} ${tables.text}`);

  // ------------------------------------------------------------------ 2 --
  const pool = new pg.Pool({ connectionString: adminPg, max: 3 });
  const sql = async (q, p) => (await pool.query(q, p)).rows;
  const has = async (schema, name) => (await sql('select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace where n.nspname = $1 and c.relname = $2', [schema, name])).length > 0;
  const keys = JSON.parse(secrets.HUSHMATES_DATA_KEYS);
  const crypt = await createFieldCrypt({ keys, current: secrets.HUSHMATES_DATA_KEY_ID, macKey: secrets.HUSHMATES_MAC_KEY });
  const admin = createAdmin({ db: pool, crypt });
  try {
    const noRls = await sql(`select c.relname from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'hushmates' and c.relkind = 'r' and not c.relrowsecurity`);
    check('database', 'row level security is on for every Hushmates table', !noRls.length, noRls.map((r) => r.relname).join(', '));
    const leaks = await sql(`select r.rolname, s.nspname, has_schema_privilege(r.rolname, s.nspname, 'usage') as usage
      from (values ('anon'), ('authenticated')) r(rolname), (values ('hushmates'), ('hushmates_api')) s(nspname)
      where exists (select 1 from pg_catalog.pg_roles where rolname = r.rolname) and has_schema_privilege(r.rolname, s.nspname, 'usage')`);
    check('database', 'the browser roles (anon, authenticated) have no way into either Hushmates schema', !leaks.length, JSON.stringify(leaks));
    const callable = await sql(`select p.proname from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'hushmates_api' and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))`);
    check('database', 'no browser role may execute any hushmates_api function', !callable.length, callable.map((r) => r.proname).join(', '));
    const settings = await admin.settings();
    check('cost', 'AI is off (the free library writes every Mallow perspective)', settings?.ai?.enabled === false, JSON.stringify(settings?.ai));
    if (await has('cron', 'job')) {
      const jobs = (await sql("select jobname, schedule, active from cron.job where jobname like 'hushmates-%' order by jobname")).map((j) => `${j.jobname} ${j.schedule}${j.active ? '' : ' (inactive)'}`);
      check('scheduler', 'the two scheduled jobs are there and active', jobs.join('|') === 'hushmates-retention 17 3 * * *|hushmates-tick * * * * *', jobs.join(', ') || 'none');
      const vault = await has('vault', 'secrets') ? (await sql("select name from vault.secrets where name in ('hushmates_job_url', 'hushmates_job_secret') order by name")).map((r) => r.name) : null;
      if (vault) check('scheduler', 'its two Vault secrets are there (names only)', vault.join(',') === 'hushmates_job_secret,hushmates_job_url', vault.join(', ') || 'none');
      const runs = await sql(`select d.status, d.start_time from cron.job_run_details d join cron.job j on j.jobid = d.jobid
        where j.jobname = 'hushmates-tick' and d.start_time > now() - interval '5 minutes' order by d.start_time desc limit 5`);
      check('scheduler', 'it ran in the last five minutes, without errors', runs.length > 0 && runs.every((r) => r.status === 'succeeded'), JSON.stringify(runs));
      if (await has('net', '_http_response')) {
        const answers = await sql("select status_code, timed_out, error_msg from net._http_response where created > now() - interval '5 minutes' order by created desc limit 5");
        check('scheduler', 'and the Edge Function answered its calls (HTTP 200)', answers.length > 0 && answers.every((a) => a.status_code === 200), JSON.stringify(answers));
      } else say('scheduler', 'the Edge Function answered the scheduler’s calls', 'skip', 'no pg_net here');
    } else say('scheduler', 'the platform’s scheduler (pg_cron)', 'skip', 'no pg_cron here: a local stack');

    // ---------------------------------------------------------------- 3 --
    const invites = await admin.invite({ count: 3, role: 'member', uses: 1, expiresDays: 1, note: `staging-check ${run}` });
    created.codes.push(...invites.codes);
    async function person(tag) {
      const email = `staging-check+${run}-${tag}@example.com`;
      const made = await authAdmin('/admin/users', { body: { email, email_confirm: true } });
      if (made.status !== 200 || !made.body?.id) throw new Error(`couldn't make a test account (${made.status} ${made.text.slice(0, 120)})`);
      created.users.push(made.body.id);
      const link = await authAdmin('/admin/generate_link', { body: { type: 'magiclink', email } });
      const code = link.body?.email_otp ?? link.body?.properties?.email_otp;
      if (link.status !== 200 || !code) throw new Error(`couldn't generate a sign-in code (${link.status})`);
      const s = await http(`${issuer}/verify`, { headers: { 'content-type': 'application/json', apikey: anonKey }, body: { type: 'email', email, token: code } });
      if (s.status !== 200 || !s.body?.access_token) throw new Error(`the sign-in code didn't work (${s.status} ${s.text.slice(0, 120)})`);
      return { id: made.body.id, email, token: s.body.access_token };
    }
    let A; let B; let C;
    try {
      [A, B, C] = [await person('a'), await person('b'), await person('c')];
      const amr = JSON.parse(Buffer.from(A.token.split('.')[1], 'base64url').toString()).amr || [];
      check('sign-in', 'three test people signed in by email code, with no email sent', true);
      check('sign-in', 'a code sign-in is recorded as one (amr otp or magiclink)', amr.some((m) => ['otp', 'magiclink'].includes(m?.method || m)), JSON.stringify(amr));
    } catch (e) {
      say('sign-in', 'test people signed in by email code', 'fail', e.message);
      return { ok: false, results };
    }

    // ---------------------------------------------------------------- 4 --
    const needsInvite = await rpc(A.token, 'me');
    check('relay', 'a signed-in person without an invitation gets nothing but the invitation step', needsInvite.body?.result?.needsInvite === true, needsInvite.text);
    for (const [who, i, name] of [[A, 0, 'Checkstar'], [B, 1, 'Checkmoon'], [C, 2, 'Checkfern']]) {
      const joined = await rpc(who.token, 'redeemInvite', { code: invites.codes[i], name, adult: true });
      check('relay', `${name} joins with an invitation`, joined.body?.ok === true, joined.text);
      await rpc(who.token, 'savePreferences', { catching: who !== A, onboarded: true });
    }
    created.codes.length = 0;                                                  // all used
    const otherSite = await rpc(A.token, 'me', {}, { from: 'https://elsewhere.example' });
    check('function', 'refuses a page on another website', otherSite.body?.code === 'forbidden', otherSite.text);
    const crisis = await rpc(A.token, 'submitFeeling', { text: 'I don’t want to be alive anymore and I have a plan.', consent: true, clientId: `chk-${run}-crisis` });
    check('safety', 'a crisis feeling is held back, with Australian support lines', crisis.body?.result?.status === 'support' && (crisis.body.result.support?.resources || []).some((r) => r.tel === '000'), crisis.text);
    // the same feeling sent five times at once (a double tap, a flaky network): stored once
    const same = await Promise.all(Array.from({ length: 5 }, () => rpc(A.token, 'submitFeeling', { text: MARK, label: 'worry', consent: true, clientId: `chk-${run}-feeling` })));
    const ids = new Set(same.map((r) => r.body?.result?.journey?.id).filter(Boolean));
    const stored = await sql(`select j.id, j.text_enc from hushmates.journeys j join hushmates.identities i on i.member_id = j.owner
      where i.issuer = $1 and i.subject = $2`, [issuer, A.id]);
    check('concurrency', 'the same feeling sent five times at once is stored once', ids.size === 1 && stored.length === 1, `answers: ${same.map((r) => r.body?.result?.status || r.body?.code).join(',')}; stored: ${stored.length}`);
    check('encryption', 'the feeling is stored locked (hmenc:v1:…), never readable', stored.length === 1 && stored[0].text_enc.startsWith('hmenc:v1:') && !stored[0].text_enc.includes('replaying'), stored[0]?.text_enc?.slice(0, 12));
    let opened = '';
    try { opened = stored[0] ? await crypt.decrypt(stored[0].text_enc) : ''; } catch (e) { opened = `(${e.message})`; }
    check('encryption', 'the keys in .data/staging.env open it (they are the deployed keys: keep that file safe)', opened === MARK, opened.slice(0, 40));
    // two people find it and answer at the same moment: both perspectives arrive, in different places
    const offers = await Promise.all([B, C].map((w) => rpc(w.token, 'findFeeling')));
    const holds = offers.map((o) => o.body?.result?.offer?.holdId);
    check('concurrency', 'two people find the feeling at the same moment', holds.every(Boolean), offers.map((o) => o.text.slice(0, 80)).join(' | '));
    if (holds.every(Boolean)) {
      await Promise.all([B, C].map((w, i) => rpc(w.token, 'catchFeeling', { holdId: holds[i] })));
      const answers = await Promise.all([B, C].map((w, i) => rpc(w.token, 'submitReframe', { holdId: holds[i], text: i ? 'Maybe they were thinking about their own part in it.' : 'Could it be that nobody noticed as much as you did?', allowShare: false, clientId: `chk-${run}-p${i}` })));
      const slots = answers.map((a) => a.body?.result?.slot);
      check('concurrency', 'both answers arrive at once, each in its own place', slots.every(Number.isInteger) && slots[0] !== slots[1], answers.map((a) => a.text.slice(0, 100)).join(' | '));
      const pv = await sql('select text_enc from hushmates.perspectives where journey_id = $1', [stored[0].id]);
      check('encryption', 'perspectives are stored locked too', pv.length === 2 && pv.every((p) => p.text_enc.startsWith('hmenc:v1:')), `${pv.length}`);
    }

    // ---------------------------------------------------------------- 5 --
    const pwEmail = `staging-check+${run}-pw@example.com`;
    const pw = `Pw-${randomBytes(12).toString('base64url')}`;
    const pwUser = await authAdmin('/admin/users', { body: { email: pwEmail, password: pw, email_confirm: true } });
    if (pwUser.status === 200 && pwUser.body?.id) {
      created.users.push(pwUser.body.id);
      const s = await http(`${issuer}/token?grant_type=password`, { headers: { 'content-type': 'application/json', apikey: anonKey }, body: { email: pwEmail, password: pw } });
      if (s.status === 200 && s.body?.access_token) {
        const r = await rpc(s.body.access_token, 'me');
        check('sign-in', 'a password sign-in is refused by the function (only email codes count)', r.status === 401, `${r.status} ${r.text}`);
      } else say('sign-in', 'a password sign-in is refused', 'skip', `the project doesn't allow password sign-in (${s.status}), which is safer still`);
    } else say('sign-in', 'a password sign-in is refused', 'skip', `this server makes no password accounts (${pwUser.status})`);

    // ---------------------------------------------------------------- 6 --
    const tick = await http('/jobs/tick', { headers: { 'content-type': 'application/json', 'x-hushmates-job': secrets.HUSHMATES_JOB_SECRET }, body: {} });
    check('scheduler', 'the job secret in .data/staging.env is the deployed one (the scheduler’s route answers it)', tick.status === 200 && tick.body?.ok === true, `${tick.status} ${tick.text.slice(0, 120)}`);
    if (waitForScheduler && (schedulerHere ?? await has('cron', 'job'))) {
      // A sends a second feeling; B is offered it and lets the offer lapse; the platform's scheduler ends it
      const limits = settings?.limits || {};
      const second = await rpc(A.token, 'submitFeeling', { text: `${MARK} (second)`, consent: true, clientId: `chk-${run}-second` });
      const offer = await rpc(B.token, 'findFeeling');
      const hold = offer.body?.result?.offer?.holdId;
      if (second.body?.ok && hold) {
        const waitMs = Number(limits.offerHoldMs || 180000) + schedulerMarginMs;
        (log.log || (() => {}))(`  … waiting ${Math.round(waitMs / 60000)} minutes for the platform’s scheduler to end an offer that ran out`);
        await sleep(waitMs);
        const ended = await sql('select status from hushmates.holds where id = $1', [hold]).catch(() => []);
        check('scheduler', 'the platform’s scheduler ended an offer that ran out, with nobody calling the function', ended[0] && ended[0].status !== 'offered', JSON.stringify(ended));
      } else say('scheduler', 'the platform’s scheduler ends an offer that ran out', 'skip', 'no offer to watch');
    } else say('scheduler', 'the platform’s scheduler ends an offer that ran out', 'skip', waitForScheduler ? 'no pg_cron here' : '--quick');

    // ---------------------------------------------------------------- 7 --
    for (const who of [A, B, C]) {
      const del = await rpc(who.token, 'deleteMyData', { confirm: 'DELETE' });
      const gone = await authAdmin(`/admin/users/${who.id}`, { method: 'GET' });
      check('deletion', `test person ${who.email.split('-').pop()[0].toUpperCase()}: their data is deleted and their sign-in is gone from Supabase Auth`, del.body?.result?.deleted === true && gone.status === 404, `${del.text.slice(0, 80)} / auth ${gone.status}`);
      if (gone.status === 404) created.users.splice(created.users.indexOf(who.id), 1);
    }
    const left = await sql(`select count(*)::int n from hushmates.journeys j join hushmates.identities i on i.member_id = j.owner where i.issuer = $1 and i.subject = $2 and j.text_enc <> ''`, [issuer, A.id]);
    const words = await sql("select count(*)::int n from hushmates.journeys where text_enc <> '' and owner in (select id from hushmates.members where state = 'deleted')");
    check('deletion', 'no deleted account’s words are left in the database', left[0].n === 0 && words[0].n === 0, JSON.stringify({ left, words }));
  } finally {
    // whatever happened above: test accounts and unused invitations don't outlive the check
    for (const id of created.users) await authAdmin(`/admin/users/${id}`, { method: 'DELETE' }).catch(() => {});
    for (const code of created.codes) await admin.revoke(code).catch(() => {});
    await pool.end();
  }
  return { ok: results.every((r) => r.status !== 'fail'), results };
}

function runAsCommand() {
  try { return !!process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; }
}

if (runAsCommand()) {
  const arg = (name) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : undefined; };
  const ref = arg('project-ref') || '';
  const env = process.env;
  const stop = (m) => { console.error(m); process.exit(2); };
  if (!/^[a-z0-9]{20}$/.test(ref)) stop('Give the staging project’s reference: --project-ref <ref> (it must be the staging project, never production)');
  if (!existsSync(ENV_FILE)) stop('No .data/staging.env: make it with tools/staging-secrets.mjs first.');
  const secrets = readEnvFile();
  const problems = problemsWith(secrets);
  if (problems.length) stop(problems.map((p) => `✗ ${p}`).join('\n'));
  for (const k of ['HUSHMATES_STAGING_ANON_KEY', 'HUSHMATES_STAGING_SERVICE_KEY', 'HUSHMATES_ADMIN_PG']) if (!env[k]) stop(`${k} isn’t set (see the top of this file)`);
  let pgHost = '';
  try { const u = new URL(env.HUSHMATES_ADMIN_PG); pgHost = u.hostname; if (!LOCAL.has(pgHost) && u.searchParams.get('sslmode') !== 'verify-full') stop('HUSHMATES_ADMIN_PG must use sslmode=verify-full (docs/STAGING.md, step 8)'); } catch { stop('HUSHMATES_ADMIN_PG isn’t a postgres:// address'); }
  if (!LOCAL.has(pgHost) && !pgHost.includes(ref) && !/pooler\.supabase\.com$/.test(pgHost)) stop('HUSHMATES_ADMIN_PG doesn’t look like this project’s database');
  if (/pooler\.supabase\.com$/.test(pgHost) && !String(new URL(env.HUSHMATES_ADMIN_PG).username).endsWith(`.${ref}`)) stop('HUSHMATES_ADMIN_PG is for a different project than --project-ref');
  const origin = secrets.HUSHMATES_ALLOWED_ORIGINS.split(',')[0].trim();
  const out = await runStagingCheck({ url: `https://${ref}.supabase.co`, anonKey: env.HUSHMATES_STAGING_ANON_KEY, serviceKey: env.HUSHMATES_STAGING_SERVICE_KEY,
    adminPg: env.HUSHMATES_ADMIN_PG, secrets, origin, waitForScheduler: !process.argv.includes('--quick') });
  const file = join(ROOT, '.data', `staging-check-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify({ project: ref, at: new Date().toISOString(), ...out }, null, 2)}\n`, { mode: 0o600 });
  const n = (s) => out.results.filter((r) => r.status === s).length;
  console.log(`\n${n('pass')} passed, ${n('fail')} failed, ${n('skip')} not checked here. Report: ${file}`);
  process.exit(out.ok ? 0 : 1);
}
