// The OFFLINE dry run of the staging rehearsal driver (tools/staging/rehearsal.cjs), on this machine only: a dev build
// of the site (tools/build-site.sh, its sign-in pointed at the LOCAL fake of Supabase, tools/auth/fake-supabase.mjs),
// served the way Cloudflare Pages serves it (tools/auth/pages-serve.mjs), and the driver's R0, R1, R2 (with the
// sign-up) and R6 against it, with --base http://127.0.0.1:PORT --allow-local-for-testing. Stripe and the real model
// cannot be reached from here and nothing of theirs is faked: R3, R4, R5 and R7 are not run (the driver says SKIP).
//
//   timeout 900 node hushmallow/tools/staging/rehearsal-dryrun.mjs [--steps R1,R2,R6] [--keep] [--no-signals]
//
// It makes one confirmed account on the fake (a made-up address and password, passed to the driver in its environment
// as REHEARSAL_A_EMAIL / REHEARSAL_A_PASSWORD, with a made-up REHEARSAL_SIGNUP_EMAIL, and a made-up STAGING_E2E_EMAIL
// standing for the sandbox driver's account, which must never be used), runs the driver, then checks what only the
// fake can tell: no secret appears in anything the driver printed, the sign-up reached the fake's outbox (no email is
// ever sent), and R6's two switches and its favourite reached the account's rows. Then (unless --no-signals) the
// driver twice more, stopped in the middle of R1 the way a person or the outer `timeout` stops it: a Ctrl-C to its
// process group, then a SIGTERM. Each time the step running must stop at once, the rest be skipped, the teardown run,
// the driver exit 1 on its own within 10 s, and the browser it started be gone. Both servers stop and its folder (in
// the system's temporary directory, never the repository) is deleted, unless --keep.
// Exit: the driver's, or 1 when one of these checks fails.
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFakeSupabase } from '../auth/fake-supabase.mjs';
import { createPagesServer } from '../auth/pages-serve.mjs';
import { DEV_KEY } from '../../src/auth/config.js';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, '../..');
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const STEPS = opt('--steps', 'R1,R2,R6');
const KEEP = argv.includes('--keep');
const SIGNALS = !argv.includes('--no-signals');

const results = [];
const check = (ok, what, extra = '') => { results.push(!!ok); console.log(`${ok ? 'PASS' : 'FAIL'}  dry run: ${what}${extra ? `  (${extra})` : ''}`); return !!ok; };

const dir = mkdtempSync(join(tmpdir(), 'hm-rehearsal-dry-'));
const site = join(dir, 'site');
let pages = null, fake = null, code = 1;
try {
  pages = createPagesServer(site);
  const sitePort = await new Promise((r) => pages.listen(0, '127.0.0.1', () => r(pages.address().port)));
  fake = createFakeSupabase({ siteUrl: `http://127.0.0.1:${sitePort}` });
  const fakePort = await fake.listen(0, '127.0.0.1');
  const FAKE = `http://127.0.0.1:${fakePort}`;
  console.log(`dry run: site http://127.0.0.1:${sitePort}, fake sign-in ${FAKE} (a test double, nothing leaves this machine)`);

  // the build: a dev build signing in only on this machine (HM_AUTH_MODE=dev), with nothing else of this environment
  const env = { PATH: process.env.PATH, HOME: process.env.HOME || dir, HM_AUTH_MODE: 'dev', SUPABASE_URL: FAKE, SUPABASE_PUBLISHABLE_KEY: DEV_KEY };
  const ver = `dryrun${Date.now().toString(36)}`;
  const b = spawnSync('bash', [join(ROOT, 'tools/build-site.sh'), site, ver], { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (!check(b.status === 0, `tools/build-site.sh (version ${ver})`, b.status === 0 ? (b.stdout.trim().split('\n').find((l) => /auth config/.test(l)) || '').slice(0, 160) : (b.stderr || b.stdout).trim().split('\n').slice(-3).join(' | '))) throw new Error('the build failed');

  // one confirmed account on the fake, made up for this run
  const tag = randomBytes(4).toString('hex');
  const A = { email: `dry-a-${tag}@example.com`, password: `${randomBytes(9).toString('base64url')}-q7` };
  const SIGNUP = `dry-signup-${tag}@example.com`;
  const post = (p, body, headers = {}) => fetch(`${FAKE}${p}`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body || {}) }).then((r) => r.json().catch(() => null));
  await post('/__fake/reset');
  await post('/__fake/config', { rateLimitMs: 0, autoconfirm: true });
  const made = await post('/auth/v1/signup', { email: A.email, password: A.password }, { apikey: DEV_KEY });
  await post('/__fake/config', { autoconfirm: false });
  if (made?.access_token) await post('/auth/v1/logout?scope=local', {}, { apikey: DEV_KEY, authorization: `Bearer ${made.access_token}` });
  const uid = made?.user?.id || null;
  if (!check(!!uid, 'a confirmed E2E account on the fake')) throw new Error('no account');

  // the driver, exactly as it runs online but for the two local flags; its output is read for the secrets
  const out = join(dir, 'shots');
  const B = { email: `dry-b-${tag}@example.com`, password: `${randomBytes(9).toString('base64url')}-b2` };
  const denv = { PATH: process.env.PATH, HOME: process.env.HOME || dir, REHEARSAL_A_EMAIL: A.email, REHEARSAL_A_PASSWORD: A.password, REHEARSAL_SIGNUP_EMAIL: SIGNUP, STAGING_E2E_EMAIL: B.email, STAGING_E2E_PASSWORD: B.password };
  const secrets = [A.email, A.password, SIGNUP, uid, encodeURIComponent(A.email), B.email, B.password];
  const driver = (steps, onLine = null, { underTimeout = false } = {}) => new Promise((r) => {
    const args = [join(here, 'rehearsal.cjs'), '--base', `http://127.0.0.1:${sitePort}`, '--allow-local-for-testing', '--steps', steps, '--out', out];
    // its own process group, as a terminal starts it: a Ctrl-C there goes to the whole group (the browser has its own).
    // underTimeout: as the docs run it, `timeout 1800 node …`, where one Ctrl-C reaches node twice (the group's, and
    // timeout passing its own on)
    const c = underTimeout
      ? spawn('timeout', ['1800', process.execPath, ...args], { env: denv, stdio: ['ignore', 'pipe', 'pipe'], detached: true })
      : spawn(process.execPath, args, { env: denv, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
    let printed = '';
    const tee = (d) => { const s = d.toString(); printed += s; process.stdout.write(s); onLine?.(c, printed); };
    c.stdout.on('data', tee); c.stderr.on('data', tee);
    c.on('close', (n, sig) => r({ exit: n, sig, printed, at: Date.now() }));
  });
  const run = await driver(STEPS);
  const printed = run.printed;
  check(run.exit === 0, `the driver's exit code`, String(run.exit));
  const leaks = secrets.filter((s) => printed.includes(s));
  check(!leaks.length, 'nothing the driver printed holds the account\'s email, password or id, the sign-up address or the sandbox driver\'s account', leaks.length ? `${leaks.length} found` : `${printed.split('\n').length} lines read`);

  // what only the fake can tell
  const state = await fetch(`${FAKE}/__fake/state`).then((r) => r.json());
  if (STEPS.includes('R2')) {
    const mail = await fetch(`${FAKE}/__fake/outbox?to=${encodeURIComponent(SIGNUP)}`).then((r) => r.json());
    check(mail.some((m) => m.kind === 'signup'), 'R2\'s sign-up reached the fake (a confirmation email in its outbox, never sent)');
  }
  if (STEPS.includes('R6')) {
    const cs = state.rows.sync_consents.find((r) => r.user_id === uid);
    const fav = state.rows.favourite_worlds.filter((r) => r.user_id === uid).map((r) => r.world_id);
    check(cs?.settings_sync === true && cs?.library_sync === true && fav.includes('static-storm'), 'R6\'s switches and favourite reached the account\'s rows on the fake', JSON.stringify({ settings: cs?.settings_sync, library: cs?.library_sync, favourites: fav }));
  }

  // stopped half way: a Ctrl-C to the driver's process group, then the outer timeout's SIGTERM, in the middle of R1
  if (SIGNALS) {
    // one Ctrl-C under `timeout 1800 node …` (the documented command): counted once, so the teardown runs
    for (let i = 0; i < 3; i++) {
      let sentAt = 0;
      const r = await driver('R1,R2', (c, text) => {
        if (sentAt || !/^PASS  R0 /m.test(text)) return;
        sentAt = Date.now();
        setTimeout(() => { try { process.kill(-c.pid, 'SIGINT'); } catch { /* gone */ } }, 1500);
      }, { underTimeout: true });
      const t = r.printed;
      check(sentAt && /^INFO  teardown: local test mode/m.test(t) && !/again: quitting at once/.test(t) && t.includes('interrupted (Ctrl-C)'),
        `one Ctrl-C under timeout (run ${i + 1} of 3): counted once, the teardown ran`, `exit ${r.exit}${r.sig ? ` by ${r.sig}` : ''}`);
    }
    for (const sig of ['SIGINT', 'SIGTERM']) {
      let sentAt = 0, browsers = [];
      const r = await driver('R1,R2', (c, text) => {
        if (sentAt || !/^PASS  R0 /m.test(text)) return;
        sentAt = Date.now();
        // the browser the driver started (its children), to see it gone afterwards
        const ps = spawnSync('ps', ['-o', 'pid=', '--ppid', String(c.pid)], { encoding: 'utf8' });
        browsers = ps.stdout.split('\n').map((x) => Number(x.trim())).filter(Boolean);
        setTimeout(() => { try { process.kill(sig === 'SIGINT' ? -c.pid : c.pid, sig); } catch { /* gone */ } }, 1500);
      });
      const t = r.printed, secs = sentAt ? Math.round((r.at - sentAt - 1500) / 100) / 10 : null;
      const alive = browsers.filter((pid) => { try { process.kill(pid, 0); return true; } catch { return false; } });
      const want = sig === 'SIGINT' ? 'interrupted (Ctrl-C)' : `terminated (${sig}`;
      check(sentAt && r.exit === 1 && !r.sig && secs !== null && secs <= 10
        && /^FAIL  R1  .*not finished/m.test(t) && new RegExp(`^SKIP  R2  not run: ${want.replace(/[()]/g, '\\$&')}`, 'm').test(t)
        && /^INFO  teardown: local test mode/m.test(t) && /^\d+ passed, \d+ failed, \d+ skipped · /m.test(t) && t.includes(want),
      `${sig} in the middle of R1: R1 stopped at once, R2 skipped, the teardown ran, the driver exited 1 on its own`, `exit ${r.exit}${r.sig ? ` by ${r.sig}` : ''}, ${secs} s after the signal`);
      check(browsers.length > 0 && !alive.length, `${sig}: the browser the driver started is gone`, `${browsers.length} child process(es), ${alive.length} left`);
      for (const pid of alive) { try { process.kill(pid, 'SIGKILL'); } catch { /* gone */ } }
      check(!secrets.some((s) => t.includes(s)), `${sig}: nothing printed holds a secret`);
    }
  }
  code = results.every(Boolean) ? 0 : 1;
} catch (e) {
  check(false, `stopped: ${String(e?.message || e).split('\n')[0]}`);
  code = 1;
} finally {
  pages?.closeAllConnections?.();
  fake?.server?.closeAllConnections?.();
  await new Promise((r) => (pages ? pages.close(() => r()) : r()));
  await fake?.close?.();
  if (!KEEP) rmSync(dir, { recursive: true, force: true });
  else console.log(`kept: ${dir}`);
}
console.log(code ? 'dry run: FAILED' : 'dry run: every check passed (offline: Stripe and the real model were not contacted, and not faked)');
process.exit(code);
