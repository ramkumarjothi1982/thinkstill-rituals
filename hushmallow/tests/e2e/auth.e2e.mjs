// hushmallow sign-in: the ISOLATED end-to-end check.
//
// In CI (.github/workflows/hushmallow-auth-e2e.yml) it drives the real BUILT
// site (tools/build-site.sh with HM_AUTH_MODE=ci, served at
// http://127.0.0.1:8000 by tools/auth/pages-serve.mjs the way Cloudflare
// Pages serves it) against a LOCAL Supabase stack the Supabase CLI starts on
// the GitHub runner: real Supabase Auth, PostgREST and Postgres with
// supabase/migrations applied, and Mailpit catching every email. It never
// talks to a hosted project: every address must be on this machine and only
// the stack's public (publishable / anon) key is accepted. Destructive steps
// (deleting accounts, ageing or deleting sessions) touch only that throwaway
// local database.
//
// Locally it dry-runs against the fake (tools/auth/fake-supabase.mjs), which
// renders the same email templates and answers the same Mailpit API; the fake
// is a test double, so only the CI run on the real stack is evidence that the
// flows work with Supabase itself.
//
//   E2E_SITE        the built site (default http://127.0.0.1:8000)
//   E2E_API_URL     the stack's API (CI: http://127.0.0.1:54321)
//   E2E_PUBLIC_KEY  its publishable key (sb_publishable_…) or anon JWT, never a secret
//   E2E_MAIL_URL    Mailpit (CI: http://127.0.0.1:54324; dry run: <fake>/__fake/mailpit)
//   E2E_DB_URL      CI: the stack's own database, for psql checks (postgres:postgres@127.0.0.1:54322)
//   E2E_FAKE_URL    dry run only, instead of E2E_DB_URL: the fake's control API
//   E2E_FAKE_TTL    dry run only: access-token lifetime on the fake, seconds (default 20)
//   E2E_OUT / --out screenshots, report.json and summary.md (default /tmp/claude-0/hf/e2e/out)
//   E2E_CHROMIUM, E2E_CHROMIUM_ARGS   a particular Chromium binary / extra flags
//   PLAYWRIGHT_DIR  a node_modules folder that holds playwright
// Prints one line per check; exits 0 only if every check passed.
//
// Flows (sections run in order; a section that cannot run says why):
//   guest       the app boots exactly as before for a guest: no supabase-js, no request to the stack
//   callback    /auth/callback with a bogus token and with an error link: the friendly message, a clean address bar
//   signup      create an account → the confirmation email (Mailpit) → "Send it again" → a second email →
//               its token_hash link opened on another device → signed in there; the used link → friendly error
//   signin      wrong password (same message as an unknown email) → right one → keep this phone's things →
//               reload keeps the session
//   sync        both opt-in switches: rows appear (consent time-stamped by the server), later changes follow,
//               withdrawing deletes them, the phone keeps its own copy
//   refresh     wait past the access token's expiry (jwt_expiry 120 s): still signed in, the next call works
//   guestkeys   coordinator decision 3: a snapshot of today's guest keys boots in the real app as a guest,
//               then sign in → "Not now" → the account → sign out: every guest key byte-identical, unmoved
//   password    real reauthentication for every session: the CURRENT password first, checked with a sign-in
//               on an isolated client that is signed out again with scope local. A session from today: a
//               wrong current password is refused ("That password doesn't match."), the right one changes
//               it at once with no code, the page's own session stays alive. A session aged past 24 hours
//               in the local database: Supabase asks for reauthentication, the emailed 6-digit code is
//               required, a wrong code is refused, the right one works
//   signout     every supabase-js key removed; the guest's things back; the account's copy kept apart
//   reset       forgot password → the reset email → its link on a small phone → a new password → signed in there →
//               signed in here with it
//   expiry      the session is ended on the server: the page drops to guest calmly, guest things untouched
//   people      a second account on the same browser: none of the first account's things; with A's token
//               PostgREST returns nothing of B's and refuses to write B's rows; anon gets nothing
//   shared      B's reset link opened in a second tab while A is signed in on the same browser: B's new
//               password is saved, A's session there ends on the server, the first tab leaves A's namespace
//   delete      delete account (typed confirmation) with a sync started just before → the auth user and
//               every row gone, sign-in fails, this device's copy wiped (and still wiped seconds later), the
//               other account and the guest untouched; a second tab of the same account, open in the Memory
//               Garden all along, writes nothing more into it and leaves nothing of it after its reload
//   unconfirmed sign in before confirming → "Please confirm your email first" → send the link again
import { createRequire } from 'node:module';
import { execFile } from 'node:child_process';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyKey, keyLabel } from '../../src/auth/config.js';
import { todayGuestKeys, APP_REWRITES } from '../helpers/guest-snapshot.mjs';

const LOOPBACK = new Set(['127.0.0.1', 'localhost']);
const isLocalUrl = (u, protocols = ['http:', 'https:']) => {
  try { const x = new URL(u); return LOOPBACK.has(x.hostname) && protocols.includes(x.protocol); } catch { return false; }
};

/** Everything that would make this run touch anything but a local stack (pure, for tests). */
export function targetProblems({ site, api, key, mail, db, fake } = {}) {
  const out = [];
  if (!isLocalUrl(site)) out.push(`E2E_SITE must be a localhost / 127.0.0.1 address (got ${String(site).slice(0, 60)})`);
  if (!api) out.push('E2E_API_URL is not set');
  else if (!isLocalUrl(api)) out.push(`E2E_API_URL must be a local stack on this machine, never a hosted project (got ${String(api).slice(0, 60)})`);
  const kind = classifyKey(key);
  if (kind !== 'publishable' && kind !== 'anon-jwt') out.push(`E2E_PUBLIC_KEY must be the stack's publishable or anon key (got a ${kind} key)`);
  if (!mail || !isLocalUrl(mail)) out.push('E2E_MAIL_URL must be the local mail server (Mailpit) on this machine');
  if (!!db === !!fake) out.push('set exactly one of E2E_DB_URL (a local Supabase stack) or E2E_FAKE_URL (the fake, dry run)');
  if (db && !isLocalUrl(String(db).replace(/^postgres(ql)?:/, 'http:'), ['http:'])) out.push('E2E_DB_URL must be the local stack\'s database on this machine');
  if (fake && !isLocalUrl(fake)) out.push('E2E_FAKE_URL must be on this machine');
  return out;
}

const decode = (s) => String(s ?? '').replace(/&amp;/g, '&').replace(/&#0*38;/g, '&').replace(/&quot;/g, '"').replace(/&#0*39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
/** What an email from supabase/templates carries: its token_hash link, the link's type, a 6-digit code (pure, for tests). */
export function parseMail(html) {
  const text = decode(html);
  const links = [...text.matchAll(/href\s*=\s*"([^"]+)"/gi)].map((m) => m[1].trim());
  const link = links.find((h) => /[?&]token_hash=/.test(h)) || null;
  let type = null, tokenHash = null;
  if (link) { try { const u = new URL(link); type = u.searchParams.get('type'); tokenHash = u.searchParams.get('token_hash'); } catch { /* not a URL */ } }
  const code = (/>\s*(\d{6})\s*</.exec(text) || [])[1] || null;
  const kind = type === 'recovery' ? 'recovery' : type === 'email_change' ? 'email_change' : (type === 'email' || type === 'signup') ? 'signup' : (!link && code) ? 'reauthentication' : 'unknown';
  return { link, type, tokenHash, code, kind, verifyLink: links.find((h) => /\/auth\/v1\/verify\?/.test(h)) || null };
}

/** The subject the owner pastes with each template (its first line), which config.toml repeats. */
export const SUBJECTS = Object.freeze({
  signup: 'Confirm your hushmallow account',
  recovery: 'Reset your hushmallow password',
  reauthentication: 'Your hushmallow code',
  email_change: 'Confirm your new email for hushmallow',
});

// ======================================================================
const env = process.env;
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const trim = (u) => String(u || '').replace(/\/+$/, '');
const SITE = trim(env.E2E_SITE || 'http://127.0.0.1:8000');
const API = trim(env.E2E_API_URL);
const KEY = env.E2E_PUBLIC_KEY || '';
const MAIL = trim(env.E2E_MAIL_URL);
const DB_URL = env.E2E_DB_URL || '';
const FAKE = trim(env.E2E_FAKE_URL);
const OUT = resolve(arg('--out', env.E2E_OUT || '/tmp/claude-0/hf/e2e/out'));
const BACKEND = DB_URL ? 'supabase-local' : 'fake';
const RUN = Date.now().toString(36);
const PASS1 = 'gentle-moon-42', PASS2 = 'quiet-harbour-77', PASS3 = 'soft-lantern-19', PASSX = 'misty-meadow-31';
const A = `ana.${RUN}@example.com`, B = `bo.${RUN}@example.com`, C = `cy.${RUN}@example.com`;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const report = { suite: 'hushmallow sign-in e2e', backend: BACKEND, site: SITE, api: API, key: keyLabel(KEY), run: RUN, startedAt: new Date().toISOString(), sections: [], checks: [], screenshots: [], console: { problems: [], expected: [] } };
let current = 'setup';
const check = (ok, label, detail = '') => {
  report.checks.push({ section: current, ok: !!ok, label, detail: detail ? String(detail).slice(0, 600) : '', at: new Date().toISOString() });
  console.log(`${ok ? 'PASS' : 'FAIL'}  [${current}] ${label}${detail ? `  (${String(detail).slice(0, 300)})` : ''}`);
  return !!ok;
};
const S = {};   // what earlier sections established

// -------------------------------------------------------------- server --
async function http(path, { method = 'GET', token = null, body, prefer, base = API } = {}) {
  const headers = { apikey: KEY, accept: 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  else if (classifyKey(KEY) === 'anon-jwt') headers.authorization = `Bearer ${KEY}`;
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (prefer) headers.prefer = prefer;
  const r = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await r.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
  return { status: r.status, json, text };
}
const grant = (email, password) => http('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } });
/** Whether these credentials sign in (HTTP status of the password grant); a session it opens is closed again at once. */
async function canSignIn(email, password) {
  const r = await grant(email, password);
  if (r.json?.access_token) await http('/auth/v1/logout?scope=local', { method: 'POST', token: r.json.access_token }).catch(() => {});
  return r.status;
}
const fakePost = (path, body) => fetch(`${FAKE}${path}`, { method: 'POST', body: JSON.stringify(body || {}) }).then((r) => r.json());

function psql(sql) {
  return new Promise((ok, no) => execFile('psql', [DB_URL, '-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-c', sql], { timeout: 30000 }, (e, out, err) => (e ? no(new Error(`psql: ${String(err || e.message).trim().slice(0, 300)}`)) : ok(String(out).trim()))));
}
const sqlText = (s) => `'${String(s).replace(/'/g, "''")}'`;
const sqlUid = (uid) => { if (!UUID.test(String(uid))) throw new Error(`not a user id: ${uid}`); return `'${uid}'`; };

/** The server's view, from the local database (CI) or the fake's state (dry run). */
const db = DB_URL ? {
  async user(email) {
    return JSON.parse(await psql(`select coalesce((select json_build_object('id', id, 'confirmed', email_confirmed_at is not null) from auth.users where email = lower(${sqlText(email)})), 'null'::json)`));
  },
  async rows(uid) {
    const u = sqlUid(uid);
    return JSON.parse(await psql(`select json_build_object(
      'user', (select count(*) from auth.users where id = ${u}),
      'sessions', (select count(*) from auth.sessions where user_id = ${u}),
      'profile', (select row_to_json(p) from public.profiles p where p.user_id = ${u}),
      'consents', (select row_to_json(c) from public.sync_consents c where c.user_id = ${u}),
      'preferences', (select row_to_json(x) from public.preferences x where x.user_id = ${u}),
      'favourites', (select coalesce(json_agg(f.world_id order by f.position, f.world_id), '[]'::json) from public.favourite_worlds f where f.user_id = ${u}),
      'garden', (select count(*) from public.garden_skills g where g.user_id = ${u}),
      'progress', (select count(*) from public.hushflow_progress h where h.user_id = ${u}))`));
  },
  /** as if this user's sessions had started `hours` ago (Auth's 24-hour window for a password change without the code) */
  async ageSessions(uid, hours) { await psql(`update auth.sessions set created_at = created_at - make_interval(hours => ${Number(hours) | 0}) where user_id = ${sqlUid(uid)}`); },
  /** the session ends on the server (an admin signs the user out everywhere / the session times out) */
  async endSessions(uid) { await psql(`delete from auth.sessions where user_id = ${sqlUid(uid)}`); },
  async sessionAlive(sid) { return (await psql(`select count(*) from auth.sessions where id = ${sqlUid(sid)}`)) !== '0'; },
} : {
  async user(email) { const s = await (await fetch(`${FAKE}/__fake/state`)).json(); const u = s.users.find((x) => x.email === email.toLowerCase()); return u ? { id: u.id, confirmed: u.confirmed } : null; },
  async rows(uid) {
    const s = await (await fetch(`${FAKE}/__fake/state`)).json();
    const own = (t) => s.rows[t].filter((r) => r.user_id === uid);
    return {
      user: s.users.some((u) => u.id === uid) ? 1 : 0, sessions: s.sessionsByUser?.[uid] || 0,
      profile: own('profiles')[0] || null, consents: own('sync_consents')[0] || null, preferences: own('preferences')[0] || null,
      favourites: own('favourite_worlds').sort((a, b) => a.position - b.position || a.world_id.localeCompare(b.world_id)).map((r) => r.world_id),
      garden: own('garden_skills').length, progress: own('hushflow_progress').length,
    };
  },
  ageSessions: (uid, hours) => fakePost('/__fake/age-sessions', { uid, hours }),
  endSessions: (uid) => fakePost('/__fake/revoke', { uid }),
  async sessionAlive(sid) { const s = await (await fetch(`${FAKE}/__fake/state`)).json(); return (s.liveSessions || []).includes(sid); },
};

// ---------------------------------------------------------------- mail --
const mail = {
  flavour: null,
  async detect() {
    try { const r = await fetch(`${MAIL}/api/v1/messages?limit=1`); if (r.ok) { const j = await r.json(); if (j && Array.isArray(j.messages)) { this.flavour = 'mailpit'; return; } } } catch { /* try Inbucket */ }
    this.flavour = 'inbucket';
  },
  async list(email) {
    const to = email.toLowerCase();
    if (this.flavour === 'mailpit') {
      const j = await (await fetch(`${MAIL}/api/v1/messages?limit=500`)).json();
      return (j.messages || []).filter((m) => (m.To || []).some((t) => String(t.Address || '').toLowerCase() === to)).map((m) => ({ id: m.ID, subject: m.Subject || '' }));
    }
    const r = await fetch(`${MAIL}/api/v1/mailbox/${encodeURIComponent(to.split('@')[0])}`);
    if (!r.ok) return [];
    return (await r.json()).map((m) => ({ id: m.id, subject: m.subject || '' })).reverse();
  },
  async body(email, id) {
    if (this.flavour === 'mailpit') { const j = await (await fetch(`${MAIL}/api/v1/message/${encodeURIComponent(id)}`)).json(); return j.HTML || j.Text || ''; }
    const j = await (await fetch(`${MAIL}/api/v1/mailbox/${encodeURIComponent(email.toLowerCase().split('@')[0])}/${encodeURIComponent(id)}`)).json();
    return j.body?.html || j.body?.text || '';
  },
  async seen(email) { return new Set((await this.list(email)).map((m) => m.id)); },
  /** The newest email of `kind` to `email` that was not in `seen` (waits up to `timeout`). */
  async next(email, seen, kind, timeout = 45000) {
    const t0 = Date.now();
    const looked = new Set();
    while (Date.now() - t0 < timeout) {
      for (const m of await this.list(email)) {
        if (seen.has(m.id) || looked.has(m.id)) continue;
        looked.add(m.id);
        const html = await this.body(email, m.id);
        const p = parseMail(html);
        if (p.kind === kind) return { id: m.id, subject: m.subject, html, ...p };
      }
      await sleep(400);
    }
    return null;
  },
};

// ------------------------------------------------------------- browser --
async function loadPlaywright() {
  for (const d of [env.PLAYWRIGHT_DIR, '/opt/node-tools/node_modules'].filter(Boolean)) {
    try { return createRequire(join(d, 'noop.cjs'))('playwright'); } catch { /* next */ }
  }
  return import('playwright');
}

let VER = null, browser = null, loads = 0;
const pages = new Set();
const shotPath = (n) => join(OUT, `${n}.png`);
async function shot(p, n) { try { await p.screenshot({ path: shotPath(n) }); report.screenshots.push(`${n}.png`); } catch { /* page gone */ } }
const tolerant = new Set(['expiry']);   // supabase-js may log a refused refresh while the session ends on purpose

async function newCtx(w = 390, h = 844, extra = {}) {
  return browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: w < 900, ...extra });
}
async function newPage(ctx, name) {
  const page = await ctx.newPage();
  page.__name = name;
  pages.add(page);
  page.on('close', () => pages.delete(page));
  page.on('console', (m) => {
    if (m.type() !== 'error' || /favicon/.test(m.text())) return;
    const where = m.location()?.url || '';
    // the browser logs every 4xx / 5xx the stack answers; those refusals are what several checks provoke
    if (/Failed to load resource/.test(m.text()) && (where.startsWith(API) || where.startsWith(MAIL))) { report.console.expected.push(`${name}: ${m.text().slice(0, 120)}`); return; }
    if (tolerant.has(current) && /refresh|AuthApiError|session/i.test(m.text())) { report.console.expected.push(`${current}/${name}: ${m.text().slice(0, 120)}`); return; }
    report.console.problems.push(`[${current}] ${name}: console: ${m.text().slice(0, 240)}`);
  });
  page.on('pageerror', (e) => report.console.problems.push(`[${current}] ${name}: pageerror: ${String(e).slice(0, 240)}`));
  return page;
}

const appReady = (p) => p.waitForFunction(() => window.__hush?.auth && document.querySelector('#scene > *'), null, { timeout: 60000 });
const viewOf = (p) => p.evaluate(() => document.querySelector('[data-auth-view]')?.dataset.authView || null);
async function waitView(p, v, timeout = 45000) {
  try {
    await p.waitForFunction((v) => document.querySelector(`[data-auth-view="${v}"]`) && window.__account?.mallow, v, { timeout });
  } catch (e) {
    const now = await p.evaluate(() => ({ view: document.querySelector('[data-auth-view]')?.dataset.authView, err: [...document.querySelectorAll('.hm-auth-error')].map((x) => x.textContent).join(' | '), hash: location.hash })).catch(() => null);
    await shot(p, `FAILED-${current}-wait-${v}`);
    throw new Error(`waited for the "${v}" screen on ${p.__name}: ${JSON.stringify(now)}`);
  }
}
const mood = (p) => p.evaluate(() => document.querySelector('.hm-account-mallow')?.dataset.mood);
const status = (p) => p.evaluate(() => window.__hush.auth.status());
const uidOf = (p) => p.evaluate(() => window.__hush.auth.namespace.uid || null);
const lsKeys = (p) => p.evaluate(() => Object.keys(localStorage));
const favs = (p) => p.evaluate((ver) => import(`/v/${ver}/src/engine/flow-store.js`).then((m) => m.favouriteWorlds(window.__hush.store)), VER);
const star = (p, id) => p.evaluate(({ ver, id }) => import(`/v/${ver}/src/engine/flow-store.js`).then((m) => m.toggleFavouriteWorld(window.__hush.store, id)), { ver: VER, id });
const pref = (p, k) => p.evaluate((k) => window.__hush.prefs.get(k), k);
const toastText = (p) => p.waitForFunction(() => document.querySelector('.toast')?.textContent || '', null, { timeout: 20000 }).then((h) => h.jsonValue(), () => '');
const errText = (p) => p.evaluate(() => [...document.querySelectorAll('[data-auth-view] .hm-auth-error')].map((e) => e.textContent).join(' ').trim());
const clearCooldowns = (p) => p.evaluate(() => { for (const k of Object.keys(sessionStorage)) if (k.startsWith('hm2:auth.cooldown')) sessionStorage.removeItem(k); });
/** supabase-js's persisted session on this page ({ access_token, refresh_token, expires_at, … }) */
const sessionOf = (p) => p.evaluate(() => { const k = Object.keys(localStorage).find((x) => /^sb-.*-auth-token$/.test(x)); try { return k ? JSON.parse(localStorage.getItem(k)) : null; } catch { return null; } });
const jwtPayload = (t) => { try { return JSON.parse(Buffer.from(String(t).split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()); } catch { return null; } };

/** A real touch (CDP Input.dispatchTouchEvent) at the element's centre, once it has stopped moving. */
async function tap(p, selector) {
  const el = await p.waitForSelector(selector, { state: 'visible', timeout: 30000 });
  await el.scrollIntoViewIfNeeded();
  await sleep(150);
  let b = await el.boundingBox();
  for (let i = 0; i < 20; i++) { await sleep(120); const c = await el.boundingBox(); if (c && b && Math.abs(c.y - b.y) < 0.5 && Math.abs(c.x - b.x) < 0.5) break; b = c; }
  const x = b.x + b.width / 2, y = b.y + b.height / 2;
  p.__cdp ||= await p.context().newCDPSession(p);
  await p.__cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1, radiusX: 4, radiusY: 4, force: 1 }] });
  await sleep(40);
  await p.__cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
/** Tap a button that opens another account screen; a touch Chromium took for the end of a scroll changes nothing, so tap once more. */
async function tapView(p, selector, view) {
  await tap(p, selector);
  const moved = await p.waitForFunction((v) => document.querySelector(`[data-auth-view="${v}"]`), view, { timeout: 6000 }).then(() => true, () => false);
  if (!moved && await p.$(selector)) { console.log(`      (tapped ${selector} again: the first touch opened nothing)`); await tap(p, selector); }
  await waitView(p, view);
}
async function tapNav(p, selector) { await Promise.all([p.waitForNavigation({ timeout: 60000 }), tap(p, selector)]); await appReady(p); }
async function fill(p, name, value) { const s = `[data-auth-view] input[name="${name}"]`; await p.waitForSelector(s, { timeout: 20000 }); await p.fill(s, value); }
/** The sign-up form's required tick (18 or older, the Terms and the Privacy Policy): a real touch on the box, then it is ticked. */
async function agree(p) { await tap(p, '[data-auth-view] input[name="agree"]'); await p.waitForFunction(() => document.querySelector('[data-auth-view] input[name="agree"]')?.checked === true, null, { timeout: 10000 }); }
const createOff = (p) => p.evaluate(() => document.querySelector('[data-act="create-submit"]')?.disabled === true);
/** A fresh load of the app at /#account (the query keeps it from being a same-page hash change). */
async function openAccount(p) { await p.goto(`${SITE}/?n=${++loads}#account`); await appReady(p); await p.waitForFunction(() => document.querySelector('[data-auth-view]') && window.__account?.mallow, null, { timeout: 60000 }); }
/** Sign in through the screens; resolves 'nav' (into the account) or 'choice' (the guest question). */
async function signInUi(p, email, password) {
  if ((await viewOf(p)) !== 'signin') { await tapView(p, '[data-act="signin"]', 'signin'); }
  await fill(p, 'email', email); await fill(p, 'password', password);
  const nav = p.waitForNavigation({ timeout: 60000 }).then(() => 'nav', () => 'none');
  const gc = p.waitForSelector('[data-auth-view="guest-choice"]', { timeout: 60000 }).then(() => 'choice', () => 'none');
  await tap(p, '[data-act="signin-submit"]');
  const r = await Promise.race([nav, gc]);
  if (r === 'nav') await appReady(p);
  return r;
}
async function signOutUi(p) { await tapView(p, '[data-act="signout"]', 'signout'); await tapNav(p, '[data-act="signout-confirm"]'); }
async function waitFor(fn, { timeout = 20000, every = 500 } = {}) {
  const t0 = Date.now();
  let last;
  while (Date.now() - t0 < timeout) { last = await fn(); if (last) return last; await sleep(every); }
  return last;
}
const switchesReady = (p) => p.waitForFunction(() => !document.querySelector('[data-sync="settings"]')?.disabled && !document.querySelector('[data-sync="library"]')?.disabled, null, { timeout: 45000 });
const syncStatus = (p, re) => p.waitForFunction((src) => new RegExp(src).test(document.querySelector('[data-sync-status]')?.textContent || ''), re.source, { timeout: 45000 });

async function section(name, fn, needs = []) {
  current = name;
  const t0 = Date.now();
  const miss = needs.filter((k) => !S[k]);
  if (miss.length) { check(false, `${name}: not run, it needs ${miss.join(', ')} from an earlier section`); report.sections.push({ name, ms: 0, ran: false }); return; }
  try { await fn(); } catch (e) {
    check(false, `${name}: stopped early: ${String(e?.message || e).split('\n')[0].slice(0, 400)}`);
    for (const p of pages) await shot(p, `FAILED-${name}-${p.__name}`);
  }
  report.sections.push({ name, ms: Date.now() - t0, ran: true });
}

// ============================================================== flows ==
async function guest() {
  const phone = await newCtx(390, 844);
  const p = await newPage(phone, 'phone');
  S.phone = p;
  const calls = [];
  p.on('request', (r) => { if (r.url().startsWith(API)) calls.push(r.url()); });
  await p.goto(`${SITE}/`); await appReady(p);
  await sleep(2500);
  const g = await p.evaluate(() => ({ status: window.__hush.auth.status(), enabled: window.__hush.auth.enabled, lib: !!document.querySelector('script[src*="vendor/supabase"]'), scene: !!document.querySelector('#scene > *'), sb: Object.keys(localStorage).filter((k) => k.startsWith('sb-')).length }));
  check(g.enabled && g.status === 'guest' && g.scene, 'the app boots for a guest with sign-in available, the Hushfold drawn', JSON.stringify(g));
  check(!g.lib && calls.length === 0 && g.sb === 0, 'a guest downloads no supabase-js and sends nothing to the sign-in server', `${calls.length} requests to the stack`);
  await shot(p, 'guest-01-home-390');
  await star(p, 'static-storm');
  await p.evaluate(() => window.__hush.prefs.set('haptics', false));
  check((await favs(p)).join() === 'static-storm' && (await pref(p, 'haptics')) === false, 'a guest keeps a favourite and a setting on this phone, as before');
  // the callback route as Cloudflare Pages serves it (headers from the generated _headers)
  const h = await fetch(`${SITE}/auth/callback/`);
  const hd = { status: h.status, cache: h.headers.get('cache-control'), frame: h.headers.get('x-frame-options'), ref: h.headers.get('referrer-policy') };
  check(hd.status === 200 && /no-store/.test(hd.cache || '') && hd.frame === 'DENY' && hd.ref === 'no-referrer', '/auth/callback/ is served with no-store, DENY and no-referrer', JSON.stringify(hd));
  const r = await fetch(`${SITE}/auth/callback?token_hash=abc&type=email`, { redirect: 'manual' });
  check([301, 308].includes(r.status) && /\/auth\/callback\/\?token_hash=abc&type=email$/.test(r.headers.get('location') || ''), '/auth/callback redirects to /auth/callback/ with the query kept', `${r.status} ${r.headers.get('location')}`);
  S.guest = true;
}

async function callbackErrors() {
  const ctx = await newCtx(390, 844);
  const c = await newPage(ctx, 'callback');
  await c.goto(`${SITE}/auth/callback?token_hash=pkce_${'0'.repeat(56)}&type=email`);
  await c.waitForFunction(() => /didn’t open/.test(document.getElementById('hm-auth-title')?.textContent || ''), null, { timeout: 45000 });
  const t = await c.evaluate(() => ({ title: document.getElementById('hm-auth-title').textContent, line: document.getElementById('hm-auth-status').textContent, href: location.href }));
  check(/expired or was already used/.test(t.line) && !/token_hash/.test(t.href), 'a bogus token_hash link: the server refuses it and the page says so kindly; no token left in the address bar', JSON.stringify(t));
  await sleep(600);
  await shot(c, 'callback-01-bogus-token-390');
  await c.goto(`${SITE}/auth/callback/?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired`);
  await c.waitForFunction(() => /didn’t open/.test(document.getElementById('hm-auth-title')?.textContent || ''), null, { timeout: 30000 });
  const t2 = await c.evaluate(() => ({ line: document.getElementById('hm-auth-status').textContent, href: location.href, back: document.querySelector('#hm-auth-body a')?.getAttribute('href') }));
  check(/expired or was already used/.test(t2.line) && !/error/.test(t2.href) && new URL(t2.back, SITE).origin === new URL(SITE).origin, 'an error link: the same friendly line, a clean address bar, the only way out is this site', JSON.stringify(t2));
  await ctx.close();
}

async function signup() {
  const p = S.phone;
  await openAccount(p);
  check((await viewOf(p)) === 'welcome', '/#account as a guest: the welcome screen');
  await tapView(p, '[data-act="create"]', 'create');
  await fill(p, 'email', A); await fill(p, 'password', PASS1); await fill(p, 'name', 'Ana');
  check(await createOff(p), 'Create my account stays off until the 18+ / Terms and Privacy Policy box is ticked');
  await agree(p);
  check(!(await createOff(p)), 'ticked: Create my account wakes');
  const seen = await mail.seen(A);
  await tap(p, '[data-act="create-submit"]');
  await waitView(p, 'check-email');
  await sleep(400);
  await shot(p, 'signup-01-check-email-390');
  const m1 = await mail.next(A, seen, 'signup');
  check(!!m1, `the confirmation email arrives (${mail.flavour})`, m1 ? m1.subject : 'no email');
  if (!m1) throw new Error('no confirmation email');
  check(m1.subject === SUBJECTS.signup, 'its subject is the template\'s (config.toml)', m1.subject);
  check(m1.link?.startsWith(`${SITE}/auth/callback?token_hash=`) && m1.type === 'email' && !m1.verifyLink, 'its button is the token_hash link to this site\'s /auth/callback (supabase/templates/confirmation.html)', m1.link);
  // "Send it again" (the app's own 60 s cooldown, as if the minute had passed; Auth allows one a second here)
  await sleep(1500);
  await clearCooldowns(p);
  await p.waitForFunction(() => document.querySelector('[data-act="resend"]')?.getAttribute('aria-disabled') === 'false', null, { timeout: 5000 });
  const seen2 = await mail.seen(A);
  await tap(p, '[data-act="resend"]');
  const m2 = await mail.next(A, seen2, 'signup');
  check(!!m2 && m2.tokenHash !== m1.tokenHash, '"Send it again": a second email with a new link', m2 ? 'new link' : 'no second email');
  const link = (m2 || m1).link;
  // the email opened on another device
  const laptop = await newCtx(1280, 800);
  const l = await newPage(laptop, 'laptop');
  await l.goto(link);
  await l.waitForFunction(() => window.__hush?.auth?.status?.() === 'signed-in' && document.querySelector('[data-auth-view="account"]'), null, { timeout: 60000 });
  check(true, 'the link opened on another device confirms the email and signs in there');
  await l.waitForFunction(() => !document.querySelector('[data-sync="settings"]')?.disabled, null, { timeout: 30000 }).catch(() => {});
  await shot(l, 'signup-02-confirmed-other-device-1280');
  await laptop.close();
  const u = await db.user(A);
  check(u?.confirmed && UUID.test(u.id), 'the server has the account, confirmed', JSON.stringify(u));
  if (!u?.id) throw new Error('no account on the server');
  S.uidA = u.id;
  const rows = await db.rows(u.id);
  check(rows.profile?.display_name === 'Ana' && rows.profile?.schema_version === 1, 'the sign-up trigger made its profile (the name, schema version 1)', JSON.stringify(rows.profile));
  check(!rows.preferences && rows.favourites.length === 0 && !rows.consents?.settings_sync && !rows.consents?.library_sync, 'nothing is kept with the account before the person opts in', JSON.stringify({ prefs: !!rows.preferences, favs: rows.favourites, consents: rows.consents }));
  // the same link again, and the link the resend replaced
  const again = await newCtx(390, 844);
  const g = await newPage(again, 'used-link');
  await g.goto(link);
  await g.waitForFunction(() => /didn’t open/.test(document.getElementById('hm-auth-title')?.textContent || ''), null, { timeout: 45000 });
  check(/expired or was already used/.test(await g.textContent('#hm-auth-status')), 'the same link a second time: "expired or was already used", no sign-in');
  await shot(g, 'signup-03-used-link-390');
  if (m2 && m1.link !== m2.link) {
    await g.goto(m1.link);
    await g.waitForFunction(() => /didn’t open/.test(document.getElementById('hm-auth-title')?.textContent || ''), null, { timeout: 45000 }).catch(() => {});
    check(/expired or was already used/.test(await g.textContent('#hm-auth-status').catch(() => '')) && (await g.evaluate(() => window.__hush?.auth?.status?.() ?? 'none')) !== 'signed-in', 'the first link, replaced by "Send it again", no longer works');
  }
  await again.close();
  S.a = true;
}

async function signin() {
  const p = S.phone;
  await tapView(p, '[data-act="confirmed-signin"]', 'signin');
  check(await p.inputValue('[data-auth-view] input[name="email"]') === A, 'Sign in: the email carried over from Check your email');
  await fill(p, 'password', 'not-my-password');
  await tap(p, '[data-act="signin-submit"]');
  await p.waitForFunction(() => document.querySelector('[data-auth-view] .hm-auth-error')?.textContent, null, { timeout: 30000 });
  const wrong = await errText(p);
  check(/don’t match/.test(wrong) && await mood(p) === 'concerned' && await p.getAttribute('[data-auth-view] input[name="password"]', 'aria-invalid') === 'true', 'a wrong password: "That email and password don’t match…", a concerned Mallow, the field marked', wrong);
  const unknown = await p.evaluate(() => window.__hush.auth.load().then((a) => a.signIn({ email: 'nobody.here@example.com', password: 'whatever-123' })));
  check(unknown.error?.message === wrong, 'an unknown email reads exactly the same (no account enumeration)', unknown.error?.message);
  await shot(p, 'signin-01-wrong-password-390');
  await fill(p, 'password', PASS1);
  await tap(p, '[data-act="signin-submit"]');
  await waitView(p, 'guest-choice');
  check(true, 'first sign-in on a phone with guest things: asked once whether to keep them');
  await sleep(400);
  await shot(p, 'signin-02-guest-choice-390');
  await tapNav(p, '[data-act="keep"]');
  await waitView(p, 'account');
  // the arrival is said on the account card's lede, not in a toast over the card
  const arrived = await p.evaluate(() => document.getElementById('hm-account-lede')?.textContent || '');
  const k = { ns: await p.evaluate(() => window.__hush.auth.namespace.mode), uid: await uidOf(p), favs: await favs(p), haptics: await pref(p, 'haptics') };
  check(k.ns === 'account' && k.uid === S.uidA && k.favs.includes('static-storm') && k.haptics === false, 'Keep: signed in as this account, in its own namespace, with a copy of the guest\'s things', JSON.stringify({ ...k, arrived }));
  await p.reload(); await appReady(p);
  const sb = (await lsKeys(p)).filter((x) => /^sb-.*-auth-token$/.test(x));
  check(await status(p) === 'signed-in' && await uidOf(p) === S.uidA && sb.length === 1, 'a reload keeps the session (supabase-js\'s persisted session, same account)', sb.join());
  S.aSignedIn = true;
}

async function sync() {
  const p = S.phone;
  await openAccount(p);
  await waitView(p, 'account');
  await switchesReady(p);
  await tap(p, '[data-sync="library"]');
  await syncStatus(p, /kept with your account now/);
  await tap(p, '[data-sync="settings"]');
  await syncStatus(p, /settings are kept/);
  const r1 = await db.rows(S.uidA);
  check(r1.favourites.includes('static-storm') && r1.preferences?.haptics === false, 'opt in: the favourites and settings rows appear for this account only', JSON.stringify({ favs: r1.favourites, haptics: r1.preferences?.haptics }));
  check(r1.consents?.library_sync === true && r1.consents?.settings_sync === true && !!r1.consents?.library_sync_at && !!r1.consents?.settings_sync_at, 'consent recorded with the server\'s timestamps', JSON.stringify({ library: r1.consents?.library_sync_at, settings: r1.consents?.settings_sync_at }));
  const line = await p.evaluate(() => document.querySelector('[data-sync="library"]').closest('.hm-account-row').querySelector('.hm-account-consent').textContent);
  check(/^On since /.test(line), 'the switch shows when consent was given', line);
  await p.evaluate(() => document.querySelector('[data-sync="library"]').scrollIntoView({ block: 'center' }));
  await sleep(300);
  await shot(p, 'sync-01-on-390');
  await star(p, 'luminous-ocean');
  await p.evaluate(() => window.__hush.prefs.set('subtitleSpeed', 1.25));
  const followed = await waitFor(async () => { const r = await db.rows(S.uidA); return r.favourites.includes('luminous-ocean') && Number(r.preferences?.subtitle_speed) === 1.25; }, { timeout: 30000 });
  check(followed, 'while it is on, a new favourite and a changed setting follow within seconds');
  await tap(p, '[data-sync="library"]');
  await syncStatus(p, /deleted from your account/);
  const r2 = await db.rows(S.uidA);
  check(r2.favourites.length === 0 && r2.garden === 0 && r2.progress === 0 && !!r2.consents?.library_withdrawn_at && r2.consents?.library_sync === false && !!r2.preferences, 'withdraw: favourites, garden and progress rows deleted on the server, the withdrawal time-stamped, settings untouched', JSON.stringify({ favs: r2.favourites, withdrawn: r2.consents?.library_withdrawn_at }));
  check((await favs(p)).includes('luminous-ocean'), 'this phone keeps its own copy after withdrawing');
  await tap(p, '[data-sync="settings"]');
  await syncStatus(p, /settings were deleted/);
  const r3 = await db.rows(S.uidA);
  check(!r3.preferences && !!r3.consents?.settings_withdrawn_at, 'turning settings sync off deletes the preferences row', JSON.stringify({ prefs: r3.preferences, withdrawn: r3.consents?.settings_withdrawn_at }));
  await shot(p, 'sync-02-off-390');
}

async function refresh() {
  const p = S.phone;
  const s0 = await sessionOf(p);
  const j0 = jwtPayload(s0?.access_token);
  if (!j0?.exp) throw new Error('no persisted session to watch');
  const ttl = j0.exp - j0.iat;
  check(ttl > 0 && ttl <= 300, `this stack's access tokens are short-lived (${ttl} s) so refresh is exercised`);
  const waitMs = Math.max(0, j0.exp * 1000 - Date.now()) + 5000;
  console.log(`      waiting ${Math.round(waitMs / 1000)} s, past the first access token's expiry…`);
  await sleep(Math.min(waitMs, (ttl + 60) * 1000));
  check(await status(p) === 'signed-in', 'past the access token\'s expiry: still signed in');
  await fill(p, 'displayName', 'Ana R');
  await tap(p, '[data-act="save-name"]');
  await p.waitForFunction(() => /Hi, Ana R/.test(document.querySelector('.hm-auth-title')?.textContent || ''), null, { timeout: 30000 });
  const r = await db.rows(S.uidA);
  const s1 = await sessionOf(p);
  const j1 = jwtPayload(s1?.access_token);
  check(r.profile?.display_name === 'Ana R' && s1?.access_token !== s0.access_token && j1?.exp * 1000 > Date.now(), 'supabase-js refreshed the session and the next call just works (the name is saved)', JSON.stringify({ name: r.profile?.display_name, refreshed: s1?.access_token !== s0.access_token, validFor: j1 ? j1.exp - Math.floor(Date.now() / 1000) : null }));
}

async function password() {
  const p = S.phone;
  const current = S.passA || PASS1;
  // 1. a session signed in today: the CURRENT password is checked first; no code is asked for
  await tapView(p, '[data-act="password"]', 'password');
  const pa = await p.evaluate(() => ({ cur: document.querySelector('[data-auth-view] input[name="current"]')?.autocomplete, nw: document.querySelector('[data-auth-view] input[name="password"]')?.autocomplete, user: document.querySelector('[data-auth-view] input[name="username"]')?.autocomplete, forgot: !!document.querySelector('[data-act="forgot-current"]'), code: !!document.querySelector('[data-auth-view] input[name="code"]') }));
  check(pa.cur === 'current-password' && pa.nw === 'new-password' && pa.user === 'username' && pa.forgot && !pa.code, 'Change password asks for the current password and the new one (no code first); forgot-password one tap away', JSON.stringify(pa));
  const sid = jwtPayload((await sessionOf(p))?.access_token)?.session_id;
  let seen = await mail.seen(A);
  await fill(p, 'current', 'not-my-password'); await fill(p, 'password', PASSX);
  await tap(p, '[data-act="password-submit"]');
  await p.waitForFunction(() => document.querySelector('[data-auth-view] .hm-auth-error')?.textContent, null, { timeout: 30000 });
  const e1 = await errText(p);
  check(e1 === 'That password doesn’t match.' && (await canSignIn(A, PASSX)) === 400, 'a session from today, a wrong current password: "That password doesn’t match." and nothing changes', e1);
  await shot(p, 'password-01-wrong-current-390');
  await fill(p, 'current', current);
  await tap(p, '[data-act="password-submit"]');
  await waitView(p, 'account');
  const okX = await canSignIn(A, PASSX), okCur = await canSignIn(A, current);
  check(okX === 200 && okCur === 400, 'the right current password: the new one works at once, the old one no longer does', `${okX}/${okCur}`);
  S.passA = okX === 200 ? PASSX : current;
  const none = await mail.next(A, seen, 'reauthentication', 4000);
  check(!none, 'no code is emailed on a session signed in today');
  check(UUID.test(String(sid)) && await db.sessionAlive(sid) && await status(p) === 'signed-in', 'this page’s own session is alive: the check’s sign-in was ended with scope local, never global', String(sid));
  // 2. a session aged past Auth's 24-hour window (local database only), then refreshed so the page holds its next token
  await db.ageSessions(S.uidA, 25);
  const refreshed = await p.evaluate(() => window.__hush.auth.load().then((a) => a.ensureClient()).then((c) => c.auth.refreshSession()).then((r) => !!r.data?.session && !r.error));
  check(refreshed, 'the session is aged past Auth\'s 24-hour window (local database only) and refreshed');
  await tapView(p, '[data-act="password"]', 'password');
  await sleep(1200);   // Auth sends one of these a second at most here (config.toml max_frequency)
  seen = await mail.seen(A);
  await fill(p, 'current', S.passA); await fill(p, 'password', PASS2);
  await tap(p, '[data-act="password-submit"]');
  await p.waitForSelector('[data-auth-view="password"] input[name="code"]', { timeout: 30000 });
  const m = await mail.next(A, seen, 'reauthentication');
  check(!!m?.code && /^\d{6}$/.test(m.code) && m.subject === SUBJECTS.reauthentication, 'a session over 24 hours old: Supabase asks for reauthentication; a 6-digit code is emailed (supabase/templates/reauthentication.html)', m ? `${m.subject}` : 'no email');
  if (!m?.code) throw new Error('no reauthentication code');
  check(await p.getAttribute('[data-auth-view] input[name="code"]', 'autocomplete') === 'one-time-code', 'the code field is autocomplete=one-time-code');
  check((await canSignIn(A, PASS2)) === 400, 'nothing changes before the code');
  await fill(p, 'code', m.code === '000000' ? '111111' : '000000');
  await tap(p, '[data-act="code-submit"]');
  await p.waitForFunction(() => document.querySelector('[data-auth-view] .hm-auth-error')?.textContent || document.querySelector('[data-auth-view]')?.dataset.authView !== 'password', null, { timeout: 30000 });
  const refused = /code didn’t work/.test(await errText(p));
  check(refused && (await canSignIn(A, PASS2)) === 400, 'a wrong code is refused by the server ("That code didn’t work") and the password stays as it was', await errText(p));
  await shot(p, 'password-02-wrong-code-390');
  if (refused) {
    await fill(p, 'code', m.code);
    await tap(p, '[data-act="code-submit"]');
    await waitView(p, 'account');
  }
  const okNew = await canSignIn(A, PASS2), okOld = await canSignIn(A, S.passA);
  check(okNew === 200 && okOld === 400, 'the right code: the new password works, the old one no longer does', `${okNew}/${okOld}`);
  S.passA = okNew === 200 ? PASS2 : S.passA;
}

/** Coordinator decision 3: today's guest keys, byte for byte, through a sign-in that chose "Not now". */
async function guestKeys() {
  const ctx = await newCtx(390, 844);
  const g = await newPage(ctx, 'guestkeys');
  const snap = todayGuestKeys(Date.now());
  const want = Object.fromEntries(Object.entries(snap).sort());
  // the phone's own keys (src/auth/namespace.js DEVICE_KEYS) follow whoever uses it while an account is signed in
  const DEVICE = ['hm2:entitlement', 'hm2:beyond.device', 'hm2:beyond.session', 'hm2:beyond.invite', 'hm2:sound', 'hm2:haptics'];
  const keysNow = () => g.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter((k) => k.startsWith('hm2:') && !k.startsWith('hm2:u:')).sort().map((k) => [k, localStorage.getItem(k)])));
  const same = async (label, { device = true } = {}) => {
    const got = await keysNow();
    const changed = Object.keys({ ...want, ...got }).filter((k) => (!device && DEVICE.includes(k) ? false : APP_REWRITES.includes(k) ? !(k in got) : got[k] !== want[k]));
    const added = Object.keys(got).filter((k) => !(k in want));
    return check(!changed.length && !added.length, label, JSON.stringify({ changed, added }));
  };
  await g.goto(`${SITE}/version.json`);
  await g.evaluate((s) => { localStorage.clear(); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, snap);
  await g.goto(`${SITE}/`); await appReady(g);
  await sleep(3000);
  const reads = await g.evaluate((ver) => Promise.all([import(`/v/${ver}/src/engine/flow-store.js`), import(`/v/${ver}/src/engine/garden.js`), import(`/v/${ver}/src/beyond/consent.js`)]).then(([f, gd, c]) => ({ status: window.__hush.auth.status(), favs: f.favouriteWorlds(window.__hush.store), garden: Object.keys(gd.readGarden(window.__hush.store).skills), consent: c.consentState(window.__hush.store), textScale: window.__hush.prefs.get('textScale') })), VER);
  check(reads.status === 'guest' && reads.favs.join() === 'static-storm,luminous-ocean' && reads.garden.join() === 'slowing-down' && reads.consent === 'yes' && reads.textScale === 1.25, 'today’s guest keys boot in the built app (sign-in on): read exactly as before', JSON.stringify(reads));
  await same('after boot: every guest key byte-identical, nothing moved or added');
  await openAccount(g);
  const r = await signInUi(g, A, S.passA || PASS1);
  check(r === 'choice', 'signing in on a phone with guest things asks once', r);
  await same('signed in, before answering: no guest key touched');
  await tapNav(g, '[data-act="fresh"]');
  await waitView(g, 'account');
  check(await g.evaluate(() => window.__hush.auth.namespace.mode) === 'account', '“Not now”: the account’s own namespace');
  await same('in the account: the guest’s own keys are untouched (the phone’s sound / haptics follow the person using it)', { device: false });
  await signOutUi(g);
  await sleep(2500);
  check(await status(g) === 'guest', 'signed out: a guest again');
  await same('after sign-in → “Not now” → sign-out: every guest key byte-identical and unmoved');
  await shot(g, 'guestkeys-01-guest-again-390');
  await ctx.close();
}

/** B's reset link opened in a second tab while A is signed in on the same browser. */
async function shared() {
  const ctx = await newCtx(390, 844);
  const t1 = await newPage(ctx, 'tab1-a');
  await openAccount(t1);
  const r = await signInUi(t1, A, S.passA);
  if (r === 'choice') await tapNav(t1, '[data-act="fresh"]');
  await waitView(t1, 'account');
  check(await uidOf(t1) === S.uidA, 'tab 1: A is signed in on this browser');
  const sidA = jwtPayload((await sessionOf(t1))?.access_token)?.session_id;
  const seen = await mail.seen(B);
  await sleep(1200);
  const rec = await http(`/auth/v1/recover?redirect_to=${encodeURIComponent(`${SITE}/auth/callback`)}`, { method: 'POST', body: { email: B } });
  const m = await mail.next(B, seen, 'recovery');
  check([200, 204].includes(rec.status) && !!m?.link, 'B asks for a reset elsewhere; the email arrives', `${rec.status} ${m?.subject || 'no email'}`);
  if (!m?.link) throw new Error('no reset email for B');
  const t2 = await newPage(ctx, 'tab2-b-reset');
  const left = t1.waitForNavigation({ timeout: 90000 }).then(() => true, () => false);
  await t2.goto(m.link);
  await t2.waitForSelector('#hm-new-password', { timeout: 45000 });
  await t2.fill('#hm-new-password', PASS3);
  await tap(t2, '#hm-auth-body button[type=submit]');
  await t2.waitForFunction(() => /All set/.test(document.getElementById('hm-auth-title')?.textContent || '') || document.querySelector('.hm-auth-error')?.textContent, null, { timeout: 45000 });
  const res = await t2.evaluate(() => ({ title: document.getElementById('hm-auth-title').textContent, err: document.querySelector('.hm-auth-error')?.textContent || '' }));
  await shot(t2, 'shared-01-b-reset-while-a-signed-in-390');
  check(res.title === 'All set' && !res.err, 'B’s reset link works on a browser where A is signed in: "All set"', JSON.stringify(res));
  check((await canSignIn(B, PASS3)) === 200 && (await canSignIn(A, S.passA)) === 200, 'B signs in with the new password; A’s password is untouched');
  S.passB = PASS3;
  check(UUID.test(String(sidA)) && !(await db.sessionAlive(sidA)), 'A’s session on this browser was ended on the server (scope local)', String(sidA));
  check(await left, 'tab 1 hears the change and leaves A’s namespace');
  await appReady(t1);
  const fa = await favs(t1);
  check(await uidOf(t1) !== S.uidA && !fa.includes('luminous-ocean'), 'tab 1 now shows none of A’s things', JSON.stringify({ uid: await uidOf(t1), favs: fa }));
  await ctx.close();
}

async function signout() {
  const p = S.phone;
  const sid = jwtPayload((await sessionOf(p))?.access_token)?.session_id;
  await tapView(p, '[data-act="signout"]', 'signout');
  await shot(p, 'signout-01-confirm-390');
  await tapNav(p, '[data-act="signout-confirm"]');
  const keys = await lsKeys(p);
  const g = { status: await status(p), favs: await favs(p), haptics: await pref(p, 'haptics'), sb: keys.filter((k) => k.startsWith('sb-')), kept: keys.some((k) => k.startsWith(`hm2:u:${S.uidA}:`)) };
  check(g.status === 'guest' && g.sb.length === 0, 'signed out: a guest again; every supabase-js key removed from this browser', JSON.stringify(g.sb));
  check(g.favs.join() === 'static-storm' && g.haptics === false && g.kept, 'the guest\'s own things are back; the account\'s copy is kept apart for next time', JSON.stringify(g));
  check(UUID.test(String(sid)) && !(await db.sessionAlive(sid)), 'this browser\'s session is ended on the server too', String(sid));
}

async function reset() {
  const p = S.phone;
  await openAccount(p);
  await tapView(p, '[data-act="signin"]', 'signin');
  await fill(p, 'email', A);
  await tapView(p, '[data-act="forgot"]', 'forgot');
  const seen = await mail.seen(A);
  await tap(p, '[data-act="forgot-submit"]'); await waitView(p, 'reset-sent');
  check(/If there’s an account for/.test(await p.textContent('.hm-auth-lede')), 'Forgot your password: the same neutral answer for any email');
  await shot(p, 'reset-01-sent-390');
  const m = await mail.next(A, seen, 'recovery');
  check(!!m && m.subject === SUBJECTS.recovery && m.link?.startsWith(`${SITE}/auth/callback?token_hash=`) && m.type === 'recovery', 'the reset email: the template\'s subject and a token_hash link (type=recovery) to /auth/callback', m?.link);
  if (!m?.link) throw new Error('no reset email');
  const small = await newCtx(320, 568);
  const sp = await newPage(small, 'reset-320');
  await sp.goto(m.link);
  await sp.waitForSelector('#hm-new-password', { timeout: 45000 });
  check(!/token_hash/.test(sp.url()), 'the reset link leaves no token in the address bar', sp.url());
  await sp.fill('#hm-new-password', PASS3);
  await shot(sp, 'reset-02-new-password-320');
  await tap(sp, '#hm-auth-body button[type=submit]');
  await sp.waitForFunction(() => window.__hush?.auth?.status?.() === 'signed-in', null, { timeout: 60000 });
  check(true, 'the reset link on another (small) phone: a new password, signed in there');
  await small.close();
  await tapView(p, '[data-act="back-signin"]', 'signin');
  await fill(p, 'password', PASS3);
  await tapNav(p, '[data-act="signin-submit"]');
  await waitView(p, 'account');
  check(await status(p) === 'signed-in' && await uidOf(p) === S.uidA && (await favs(p)).includes('luminous-ocean'), 'signed in here with the new password; no second guest question; the account\'s things are back');
  const before = S.passA || PASS1;
  S.passA = PASS3;
  S.aSignedInAgain = true;
  const now = await canSignIn(A, PASS3), old = await canSignIn(A, before);
  check(now === 200 && old === 400, 'the server has the new password only', `${now}/${old}`);
}

async function expiry() {
  const p = S.phone;
  if (await viewOf(p) !== 'account') await openAccount(p);
  await waitView(p, 'account');
  // the notice the reloaded page shows is caught as soon as it appears (it fades after a few seconds)
  const toastSeen = p.waitForFunction(() => /signed out on this device/.test(document.querySelector('.toast')?.textContent || '') && document.querySelector('.toast').textContent, null, { timeout: 220000, polling: 100 }).then((h) => h.jsonValue(), () => '');
  const nav = p.waitForNavigation({ timeout: 200000 }).then(() => true, () => false);
  await db.endSessions(S.uidA);
  let done = false;
  nav.then(() => { done = true; });
  // bring the page "back to the front" now and then; supabase-js also refreshes on its own timer
  for (let i = 0; i < 40 && !done; i++) {
    await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))).catch(() => {});
    await Promise.race([nav, sleep(5000)]);
    if (!done && await viewOf(p).catch(() => null) === 'expired') { await tap(p, '[data-act="continue"]').catch(() => {}); }
  }
  check(await nav, 'the session ended on the server: the page noticed and reloaded at a calm moment');
  await appReady(p);
  const toast = (await Promise.race([toastSeen, sleep(20000).then(() => '')])) || await toastText(p);
  const keys = await lsKeys(p);
  const g = { status: await status(p), favs: await favs(p), haptics: await pref(p, 'haptics'), kept: keys.some((k) => k.startsWith(`hm2:u:${S.uidA}:`)), sb: keys.filter((k) => k.startsWith('sb-')).length, toast };
  check(g.status === 'guest' && /signed out on this device/.test(toast) && g.favs.join() === 'static-storm' && g.haptics === false && g.kept && !g.sb, 'one calm line, a guest again, the guest\'s things untouched, the account\'s copy kept', JSON.stringify(g));
  await shot(p, 'expiry-01-guest-again-390');
}

async function people() {
  const p = S.phone;
  await openAccount(p);
  if (await status(p) === 'signed-in') { await signOutUi(p); await openAccount(p); }   // only if the expiry section could not end it
  await tapView(p, '[data-act="create"]', 'create');
  await fill(p, 'email', B); await fill(p, 'password', PASS1); await agree(p);
  const seen = await mail.seen(B);
  await tap(p, '[data-act="create-submit"]'); await waitView(p, 'check-email');
  const m = await mail.next(B, seen, 'signup');
  if (!m?.link) throw new Error('no confirmation email for the second account');
  const other = await newCtx(1280, 800);
  const o = await newPage(other, 'laptop-b');
  await o.goto(m.link);
  await o.waitForFunction(() => window.__hush?.auth?.status?.() === 'signed-in', null, { timeout: 60000 });
  await other.close();
  await tapView(p, '[data-act="confirmed-signin"]', 'signin');
  await fill(p, 'password', PASS1);
  await tap(p, '[data-act="signin-submit"]');
  await waitView(p, 'guest-choice');
  await tapNav(p, '[data-act="fresh"]');
  await waitView(p, 'account');
  const uidB = await uidOf(p);
  S.uidB = uidB;
  const b0 = { favs: await favs(p), haptics: await pref(p, 'haptics') };
  check(UUID.test(uidB) && uidB !== S.uidA && b0.favs.length === 0 && b0.haptics !== false, 'a second account on the same browser ("Not now") sees none of the first account\'s things, nor the guest\'s', JSON.stringify(b0));
  await star(p, 'quiet-lake');
  await switchesReady(p);
  await tap(p, '[data-sync="library"]');
  await syncStatus(p, /kept with your account now/);
  const rb = await db.rows(uidB);
  check(rb.favourites.join() === 'quiet-lake', 'the second account\'s synced rows are its own', JSON.stringify(rb.favourites));
  await shot(p, 'people-01-second-account-390');

  // ---- the server, with each account's own token (PostgREST + Row Level Security)
  const ga = await grant(A, S.passA), gb = await grant(B, PASS1);
  const tokA = ga.json?.access_token, tokB = gb.json?.access_token;
  if (!tokA || !tokB) throw new Error(`could not sign in by API (${ga.status}/${gb.status})`);
  const on = await http(`/rest/v1/sync_consents?user_id=eq.${S.uidA}&select=user_id,library_sync`, { method: 'PATCH', token: tokA, body: { library_sync: true }, prefer: 'return=representation' });
  const put = await http('/rest/v1/favourite_worlds', { method: 'POST', token: tokA, body: { user_id: S.uidA, world_id: 'static-storm', position: 0 }, prefer: 'resolution=merge-duplicates,return=minimal' });
  check(on.status === 200 && on.json?.[0]?.library_sync === true && [201, 204].includes(put.status), 'A, with its own token, can turn its own sync on and keep its own favourite', `${on.status}/${put.status}`);
  const allA = await http('/rest/v1/favourite_worlds?select=user_id,world_id', { token: tokA });
  check(allA.status === 200 && allA.json.length > 0 && allA.json.every((r) => r.user_id === S.uidA) && !allA.json.some((r) => r.world_id === 'quiet-lake'), 'everything A can read in favourite_worlds is A\'s own', JSON.stringify(allA.json));
  const reads = {};
  for (const t of ['favourite_worlds', 'profiles', 'sync_consents', 'preferences', 'garden_skills', 'hushflow_progress']) {
    const r = await http(`/rest/v1/${t}?user_id=eq.${uidB}&select=*`, { token: tokA });
    reads[t] = r.status === 200 ? r.json.length : `HTTP ${r.status}`;
  }
  check(Object.values(reads).every((n) => n === 0), 'B\'s rows, asked for by id with A\'s token: nothing in any table', JSON.stringify(reads));
  const patch = await http(`/rest/v1/profiles?user_id=eq.${uidB}`, { method: 'PATCH', token: tokA, body: { display_name: 'Forged by A' }, prefer: 'return=representation' });
  const forge = await http('/rest/v1/favourite_worlds', { method: 'POST', token: tokA, body: { user_id: uidB, world_id: 'forged-by-a', position: 0 }, prefer: 'return=minimal' });
  const del = await http(`/rest/v1/favourite_worlds?user_id=eq.${uidB}`, { method: 'DELETE', token: tokA, prefer: 'return=representation' });
  const rb2 = await db.rows(uidB);
  check((patch.status === 200 && Array.isArray(patch.json) && patch.json.length === 0) || patch.status === 204, 'A cannot change B\'s profile (0 rows)', `${patch.status} ${patch.text.slice(0, 80)}`);
  check([401, 403].includes(forge.status), 'A cannot create a row for B (Row Level Security refuses it)', `${forge.status} ${forge.json?.code || ''}`);
  check(((del.status === 200 && del.json?.length === 0) || del.status === 204) && rb2.favourites.join() === 'quiet-lake' && !rb2.favourites.includes('forged-by-a') && rb2.profile?.display_name == null, 'A cannot delete B\'s rows; B\'s data is exactly as it was', JSON.stringify({ del: del.status, favs: rb2.favourites, name: rb2.profile?.display_name }));
  const anon = await http('/rest/v1/favourite_worlds?select=*');
  const anonRpc = await http('/rest/v1/rpc/delete_my_account', { method: 'POST', body: {} });
  // PostgREST answers 401 (permission denied for anon) or, if it hides what anon may not run, 404
  check(([401, 403].includes(anon.status) || (anon.status === 200 && anon.json.length === 0)) && [401, 403, 404].includes(anonRpc.status), 'without a session: no rows, and delete_my_account() refuses', `${anon.status}/${anonRpc.status} ${anonRpc.json?.code || ''}`);
  const allB = await http('/rest/v1/favourite_worlds?select=user_id,world_id', { token: tokB });
  check(allB.status === 200 && allB.json.length === 1 && allB.json[0].user_id === uidB && allB.json[0].world_id === 'quiet-lake', 'and B, with its own token, reads exactly its own row', JSON.stringify(allB.json));
  check((await db.user(A))?.id === S.uidA && (await db.user(B))?.id === uidB, 'both accounts still exist (anon\'s delete call did nothing)');

  // ---- this browser: no crossing either way
  await signOutUi(p);
  const g = { favs: await favs(p), haptics: await pref(p, 'haptics') };
  check(g.favs.join() === 'static-storm' && g.haptics === false, 'B signed out: the guest\'s own things, as they were', JSON.stringify(g));
  await openAccount(p);
  const r = await signInUi(p, A, S.passA);
  if (r !== 'nav') throw new Error(`signing A in again went to ${r}`);
  await waitView(p, 'account');
  const fa = await waitFor(async () => { const f = await favs(p); return f.includes('luminous-ocean') && f.includes('static-storm') ? f : null; }, { timeout: 15000 }) || await favs(p);
  check(fa.includes('luminous-ocean') && !fa.includes('quiet-lake'), 'A again on the same browser: A\'s things, never B\'s', JSON.stringify(fa));
  const crossed = await p.evaluate(({ a, b }) => Object.keys(localStorage).filter((k) => k.startsWith(`hm2:u:${a}:`)).some((k) => (localStorage.getItem(k) || '').includes(b) || (localStorage.getItem(k) || '').includes('quiet-lake')), { a: S.uidA, b: uidB });
  check(!crossed, 'nothing of B\'s (its id or its favourite) in A\'s local namespace');
  await signOutUi(p);
  S.b = true;
}

async function deleteAccount() {
  const p = S.phone;
  await openAccount(p);
  const r = await signInUi(p, B, S.passB || PASS1);
  if (r !== 'nav') throw new Error(`signing B in again went to ${r}`);
  await waitView(p, 'account');
  check(await uidOf(p) === S.uidB, 'signed in as the second account');
  // a second tab of the same account sits in the Memory Garden (not a calm scene: its reload waits); round-2 review
  // a paid plan on this phone (device-level) so the Memory Garden really opens and stays open (a free plan sends it to Plans)
  const planBefore = await p.evaluate(() => localStorage.getItem('hm2:entitlement'));
  await p.evaluate(() => localStorage.setItem('hm2:entitlement', JSON.stringify({ tier: 'paid', source: 'native', since: Date.now() - 86400000 })));
  const t1 = await newPage(p.context(), 'delete-tab1-garden');
  await t1.goto(`${SITE}/?n=${++loads}#home`); await appReady(t1);
  await star(t1, 'luminous-ocean');
  await t1.evaluate(() => window.__hush.go('garden'));
  await t1.waitForFunction(() => location.hash === '#garden', null, { timeout: 30000 });
  await sleep(1500);   // and it stays there
  check(await uidOf(t1) === S.uidB && (await lsKeys(t1)).some((k) => k.startsWith(`hm2:u:${S.uidB}:`)), 'a second tab of the same account is open in the Memory Garden, with things of its own');
  check(await t1.evaluate(() => location.hash) === '#garden', 'it stays in the Memory Garden (a paid plan on this phone)');
  await tapView(p, '[data-act="delete"]', 'delete');
  await shot(p, 'delete-01-explained-390');
  await fill(p, 'confirm', 'nope');
  check(await p.evaluate(() => document.querySelector('[data-act="delete-confirm"]').disabled), 'Delete: the button waits for the typed word');
  await fill(p, 'confirm', 'delete');
  check(await p.evaluate(() => !document.querySelector('[data-act="delete-confirm"]').disabled), 'typing "delete" enables it');
  // a sync starts just before the tap (the race the first review found): the deletion waits for it and seals the namespace
  await p.evaluate(() => { try { window.__hush.auth.autosync?.syncNow(); } catch { /* not started */ } });
  await tapNav(p, '[data-act="delete-confirm"]');
  const toast = await toastText(p);
  const keys = await lsKeys(p);
  const rows = await db.rows(S.uidB);
  const d = {
    status: await status(p), toast,
    user: rows.user, sessions: rows.sessions,
    rows: (rows.profile ? 1 : 0) + (rows.consents ? 1 : 0) + (rows.preferences ? 1 : 0) + rows.favourites.length + rows.garden + rows.progress,
    localB: keys.filter((k) => k.startsWith(`hm2:u:${S.uidB}:`)).length,
    localA: keys.filter((k) => k.startsWith(`hm2:u:${S.uidA}:`)).length,
    sb: keys.filter((k) => k.startsWith('sb-')).length,
    guest: (await favs(p)).join(),
  };
  check(d.status === 'guest' && /deleted/.test(d.toast), 'deleted: back to guest with a calm line', JSON.stringify({ status: d.status, toast: d.toast }));
  check(d.user === 0 && d.sessions === 0 && d.rows === 0 && !(await db.user(B)), 'on the server: the auth user, its sessions and every one of its rows are gone', JSON.stringify({ user: d.user, sessions: d.sessions, rows: d.rows }));
  const again = await grant(B, PASS1);
  check(again.status === 400, 'signing in as the deleted account fails', `${again.status} ${again.json?.error_code || ''}`);
  check(d.localB === 0 && d.sb === 0, 'on this device: the deleted account\'s copy and every supabase-js key are gone', JSON.stringify({ localB: d.localB, sb: d.sb }));
  await sleep(3000);
  const later = (await lsKeys(p)).filter((k) => k.startsWith(`hm2:u:${S.uidB}:`) || k.startsWith('sb-'));
  check(later.length === 0, 'and still gone a few seconds later (nothing written back by a sync in flight)', JSON.stringify(later));
  const ra = await db.rows(S.uidA);
  check(d.localA > 0 && d.guest === 'static-storm' && ra.user === 1 && ra.favourites.includes('static-storm'), 'the other account (here and on the server) and the guest\'s things are untouched', JSON.stringify({ localA: d.localA, guest: d.guest, serverA: ra.favourites }));
  await shot(p, 'delete-02-guest-again-390');
  // the second tab, still in the garden: what it writes now never lands, and its reload leaves nothing of the account
  const t1Now = await t1.evaluate(() => ({ hash: location.hash, sealed: window.__hush.store.sealed }));
  await star(t1, 'static-storm');
  await t1.evaluate(() => { window.__hush.prefs.set('textScale', 1.12); window.__hush.store.set('journey', [{ at: Date.now(), families: ['worry'] }]); });
  const lateT1 = (await lsKeys(t1)).filter((k) => k.startsWith(`hm2:u:${S.uidB}:`));
  check(t1Now.hash === '#garden' && t1Now.sealed === true && lateT1.length === 0, 'the second tab, still in the garden, is sealed: a favourite, a setting and a journey entry written now never land', JSON.stringify({ t1Now, lateT1 }));
  const reloaded = t1.waitForNavigation({ timeout: 30000 }).then(() => true, () => false);
  await t1.evaluate(() => window.__hush.go('home')).catch(() => {});
  const navT1 = await reloaded;
  await appReady(t1); await sleep(2000);
  const leftT1 = (await lsKeys(t1)).filter((k) => k.startsWith(`hm2:u:${S.uidB}:`));
  check(navT1 && await status(t1) === 'guest' && leftT1.length === 0, 'it reloads as a guest when it comes home, and nothing of the deleted account is left on the device', JSON.stringify({ navT1, leftT1 }));
  await shot(t1, 'delete-03-second-tab-guest-390');
  await t1.close();
  await p.evaluate((v) => { if (v == null) localStorage.removeItem('hm2:entitlement'); else localStorage.setItem('hm2:entitlement', v); }, planBefore);   // the phone's plan as it was
}

async function unconfirmed() {
  const ctx = await newCtx(375, 812);
  const u = await newPage(ctx, 'unconfirmed-375');
  await openAccount(u);
  await tapView(u, '[data-act="create"]', 'create');
  await fill(u, 'email', C); await fill(u, 'password', PASS1); await agree(u);
  const seen = await mail.seen(C);
  await tap(u, '[data-act="create-submit"]'); await waitView(u, 'check-email');
  const first = await mail.next(C, seen, 'signup');
  await tapView(u, '[data-act="confirmed-signin"]', 'signin');
  await fill(u, 'password', PASS1);
  await tap(u, '[data-act="signin-submit"]');
  await u.waitForSelector('[data-act="resend-unconfirmed"]', { timeout: 30000 });
  check(/confirm your email first/.test(await errText(u)), 'signing in before confirming: "Please confirm your email first", with a way to send the link again');
  await shot(u, 'unconfirmed-01-375');
  await sleep(1200);
  await clearCooldowns(u);
  const seen2 = await mail.seen(C);
  await tap(u, '[data-act="resend-unconfirmed"]'); await waitView(u, 'check-email');
  const again = await mail.next(C, seen2, 'signup');
  check(!!first && !!again && again.tokenHash !== first.tokenHash, '"Send the link again": a new confirmation email');
  await ctx.close();
}

// ================================================================ main ==
async function main() {
  mkdirSync(OUT, { recursive: true });
  const problems = targetProblems({ site: SITE, api: API, key: KEY, mail: MAIL, db: DB_URL, fake: FAKE });
  if (problems.length) { console.error('auth e2e: REFUSED, nothing was run:'); for (const x of problems) console.error(`  - ${x}`); process.exit(2); }
  console.log(`auth e2e: ${BACKEND} · site ${SITE} · api ${API} · key ${keyLabel(KEY)} [${classifyKey(KEY)}] · out ${OUT}`);
  if (BACKEND === 'fake') {
    // the fake behaves like the CI stack: confirmations on, 24-hour reauthentication window, one link per kind, 1 s between emails
    await fetch(`${FAKE}/__fake/reset`, { method: 'POST' });
    await fakePost('/__fake/config', { autoconfirm: false, securePasswordChange: true, recentLoginMs: 86_400_000, singleToken: true, rateLimitMs: 1000, accessTtl: Number(env.E2E_FAKE_TTL) || 20, failRefresh: false, refreshDown: false, down: false });
  }
  VER = (await (await fetch(`${SITE}/version.json`)).json()).v;
  await mail.detect();
  const { chromium } = await loadPlaywright();
  const launch = { args: String(env.E2E_CHROMIUM_ARGS || '').split(/\s+/).filter(Boolean) };
  if (env.E2E_CHROMIUM) launch.executablePath = env.E2E_CHROMIUM;
  browser = await chromium.launch(launch);
  report.browser = browser.version();
  report.mail = mail.flavour;
  report.version = VER;
  try {
    await section('guest', guest);
    await section('callback', callbackErrors);
    await section('signup', signup, ['guest']);
    await section('guestkeys', guestKeys, ['a']);
    await section('signin', signin, ['a']);
    await section('sync', sync, ['aSignedIn']);
    await section('refresh', refresh, ['aSignedIn']);
    await section('password', password, ['aSignedIn']);
    await section('signout', signout, ['aSignedIn']);
    await section('reset', reset, ['a']);
    await section('expiry', expiry, ['aSignedInAgain']);
    await section('people', people, ['aSignedIn']);
    await section('shared', shared, ['b']);
    await section('delete', deleteAccount, ['b']);
    await section('unconfirmed', unconfirmed, ['guest']);
    current = 'console';
    check(report.console.problems.length === 0, 'no page errors or console errors from the site', report.console.problems.slice(0, 8).join(' | ') || `${report.console.expected.length} expected refusals from the stack`);
  } finally {
    await browser.close().catch(() => {});
  }
  report.finishedAt = new Date().toISOString();
  const failed = report.checks.filter((c) => !c.ok);
  report.summary = { passed: report.checks.length - failed.length, failed: failed.length, total: report.checks.length };
  writeFileSync(join(OUT, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  const md = [
    `### hushmallow sign-in e2e (${BACKEND === 'fake' ? 'dry run against the fake' : 'local Supabase stack'})`,
    '',
    failed.length ? `**${failed.length} of ${report.checks.length} checks failed.**` : `**All ${report.checks.length} checks passed.**`,
    '',
    `Site ${SITE} (version ${VER}) · API ${API} · key ${keyLabel(KEY)} · mail ${mail.flavour} · ${report.browser}`,
    '',
    '| | Section | Check | Detail |',
    '|---|---|---|---|',
    ...report.checks.map((c) => `| ${c.ok ? '✅' : '❌'} | ${c.section} | ${c.label.replace(/\|/g, '/')} | ${c.ok ? '' : c.detail.replace(/\|/g, '/').replace(/\n/g, ' ').slice(0, 200)} |`),
    '',
    `Sections: ${report.sections.map((s) => `${s.name} ${Math.round(s.ms / 1000)} s${s.ran ? '' : ' (not run)'}`).join(' · ')}`,
    '',
  ].join('\n');
  writeFileSync(join(OUT, 'summary.md'), md);
  if (env.GITHUB_STEP_SUMMARY) { try { appendFileSync(env.GITHUB_STEP_SUMMARY, md); } catch { /* no summary */ } }
  console.log(failed.length ? `${failed.length} OF ${report.checks.length} CHECKS FAILED (report: ${join(OUT, 'report.json')})` : `ALL ${report.checks.length} CHECKS PASSED (${BACKEND}; screenshots and report in ${OUT})`);
  process.exit(failed.length ? 1 : 0);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
