// The isolated sign-in E2E's own safety and plumbing, in Node (no browser, no Docker):
//   * supabase/config.toml describes a LOCAL stack only, with the settings the E2E relies on
//     (confirmations, secure password change, short tokens, the production templates, the redirect
//     the app asks for) and nothing hosted;
//   * .github/workflows/hushmallow-auth-e2e.yml runs only when asked, pins its tools, reads no
//     secret, never links / pushes / migrates anything, and runs every stage;
//   * tools/auth/e2e-stack-env.mjs passes on only the stack's public values;
//   * tests/e2e/auth.e2e.mjs refuses any target that is not on this machine, and reads the
//     templates' links and codes the way they are rendered (through the fake's Mailpit API).
// The E2E itself runs in CI on a real local Supabase stack; this file does not replace it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

import { createFakeSupabase, renderTemplate, TEMPLATE_FILES } from '../tools/auth/fake-supabase.mjs';
import { stackEnv } from '../tools/auth/e2e-stack-env.mjs';
import { targetProblems, parseMail, SUBJECTS } from './e2e/auth.e2e.mjs';
import { callbackUrl } from '../src/auth/client.js';
import { PASSWORD_MIN } from '../src/auth/errors.js';
import { PROJECT_REF, DEV_KEY } from '../src/auth/config.js';

const root = new URL('../', import.meta.url).pathname;
const repo = new URL('../../', import.meta.url).pathname;
const read = (p) => readFileSync(p, 'utf8');

// keys of the right SHAPE, built here so no file in the repository holds one
const SECRET = ['sb', 'secret', 'Zz9'.repeat(10)].join('_');
const b64u = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (role) => `${b64u({ alg: 'HS256', typ: 'JWT' })}.${b64u({ iss: 'supabase-demo', role, exp: 1983812996 })}.${'s1gnature'.repeat(4)}`;
const PUBLISHABLE = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';   // the CLI's fixed LOCAL publishable key (public)

/** The few TOML shapes config.toml uses: [tables], key = "string" | number | bool | [array of strings]. */
function parseToml(src) {
  const out = {};
  let cur = out;
  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].replace(/\s+#.*$/, '').trim();
    if (!line || line.startsWith('#')) continue;
    const t = /^\[([A-Za-z0-9_.]+)\]$/.exec(line);
    if (t) { cur = out; for (const k of t[1].split('.')) cur = (cur[k] ||= {}); continue; }
    const m = /^([A-Za-z0-9_]+)\s*=\s*(.*)$/.exec(line);
    assert.ok(m, `config.toml line ${i + 1} is not key = value: ${line}`);
    let v = m[2];
    if (v.startsWith('[') && !v.endsWith(']')) { while (!v.endsWith(']')) v += lines[++i].replace(/\s+#.*$/, '').trim(); }
    cur[m[1]] = JSON.parse(v.replace(/,\s*]$/, ']'));
  }
  return out;
}

const TOML_TEXT = read(`${root}supabase/config.toml`);
const cfg = parseToml(TOML_TEXT);

test('config.toml: a LOCAL stack only (no hosted project, no remote, no secret)', () => {
  assert.equal(cfg.project_id, 'hushmallow');
  assert.ok(!cfg.remotes, 'no [remotes] block');
  assert.doesNotMatch(TOML_TEXT, new RegExp(PROJECT_REF), 'the production ref is not in it');
  assert.doesNotMatch(TOML_TEXT, /supabase\.co\b|sb_secret_|service_role|env\(/, 'no hosted URL, no secret, no env() substitution');
  assert.ok(!existsSync(`${root}supabase/.temp/project-ref`), 'nothing is linked');
  assert.match(cfg.auth.site_url, /^http:\/\/127\.0\.0\.1:8000$/);
  for (const u of cfg.auth.additional_redirect_urls) assert.match(u, /^http:\/\/(127\.0\.0\.1|localhost):8000\/auth\/callback\/?$/, u);
});

test('config.toml: what the E2E relies on', () => {
  const e = cfg.auth.email;
  assert.equal(e.enable_confirmations, true, 'email confirmations on (like production)');
  assert.equal(e.secure_password_change, true, 'secure password change on (like production)');
  assert.equal(e.double_confirm_changes, true, 'secure email change on');
  assert.equal(e.otp_length, 6);
  assert.equal(cfg.auth.minimum_password_length, PASSWORD_MIN, 'the app\'s minimum');
  assert.ok(cfg.auth.jwt_expiry >= 60 && cfg.auth.jwt_expiry <= 300, 'short access tokens so supabase-js refreshes during the run');
  assert.equal(cfg.auth.enable_refresh_token_rotation, true);
  assert.equal(cfg.auth.enable_anonymous_sign_ins, false);
  // the redirect the built app asks for at http://127.0.0.1:8000 is on the allow-list
  assert.ok(cfg.auth.additional_redirect_urls.includes(callbackUrl({ origin: 'http://127.0.0.1:8000', pathname: '/' })));
  assert.equal(cfg.local_smtp.enabled, true, 'Mailpit catches the emails');
  for (const s of ['studio', 'realtime', 'storage', 'edge_runtime', 'analytics']) assert.equal(cfg[s].enabled, false, `${s} off`);
  assert.equal(cfg.db.seed.enabled, false);
  assert.equal(cfg.db.major_version, 17);
  assert.ok(!cfg.api.schemas.includes('hm_private'), 'hm_private is never exposed');
  assert.equal(cfg.api.auto_expose_new_tables, false, 'the migrations\' own grants must be enough');
});

test('config.toml: the production templates, each with its subject; links only through /auth/callback with token_hash', () => {
  const tpl = cfg.auth.email.template;
  assert.deepEqual(Object.keys(tpl).sort(), ['confirmation', 'email_change', 'magic_link', 'reauthentication', 'recovery']);
  for (const [id, t] of Object.entries(tpl)) {
    const path = `${root}${t.content_path.replace(/^\.\//, '')}`;
    assert.ok(existsSync(path), `${id}: ${t.content_path} exists`);
    const html = read(path);
    assert.equal((/Subject:\s*([^\n]*?)\s*-->/.exec(html) || [])[1], t.subject, `${id}: config.toml's subject is the one on the template's first line`);
    assert.doesNotMatch(html, /ConfirmationURL/, `${id}: never Supabase's own verify URL (it would bypass /auth/callback)`);
    const links = [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);
    if (id === 'reauthentication') { assert.equal(links.length, 0); assert.match(html, /\{\{ \.Token \}\}/); continue; }
    assert.equal(links.length, 1, `${id}: one link`);
    // always the Site URL's own /auth/callback: a token in an email can only ever reach the production app
    // (never a redirect_to that some allow-listed preview or a loopback address asked for)
    assert.match(links[0], /^\{\{ \.SiteURL \}\}\/auth\/callback\?token_hash=\{\{ \.TokenHash \}\}&amp;type=(email|recovery|email_change)$/, `${id}: ${links[0]}`);
    assert.doesNotMatch(html, /RedirectTo/, `${id}: never {{ .RedirectTo }}`);
  }
  // the spec expects the same subjects and the fake renders the same files
  assert.equal(SUBJECTS.signup, tpl.confirmation.subject);
  assert.equal(SUBJECTS.recovery, tpl.recovery.subject);
  assert.equal(SUBJECTS.reauthentication, tpl.reauthentication.subject);
  assert.equal(SUBJECTS.email_change, tpl.email_change.subject);
  assert.deepEqual(Object.values(TEMPLATE_FILES).sort(), Object.values(tpl).map((t) => t.content_path.split('/').pop()).sort());
});

const WF = read(`${repo}.github/workflows/hushmallow-auth-e2e.yml`);
test('the E2E workflow: runs only when asked, pinned tools, no secrets, never touches a hosted project', () => {
  assert.match(WF, /\non:\n {2}push:\n {4}branches: \['claude\/\*\*'\]\n {4}paths: \['hushmallow\/tools\/auth\/E2E'\]\n {2}workflow_dispatch:\n/, 'push to claude/** when tools/auth/E2E changes, or by hand');
  assert.doesNotMatch(WF, /pull_request|schedule:/);
  assert.ok(existsSync(`${root}tools/auth/E2E`), 'the trigger file exists');
  assert.match(WF, /\npermissions:\n {2}contents: read\n/);
  assert.doesNotMatch(WF, /secrets\./, 'no repository secret is read');
  assert.doesNotMatch(WF, /supabase (link|db push|config push|migration up|login)|--linked|--project-ref|--db-url/, 'nothing linked, pushed or migrated anywhere else');
  assert.doesNotMatch(WF, /\.(SERVICE_ROLE_KEY|SECRET_KEY|JWT_SECRET)\b|SERVICE_ROLE_KEY=|SECRET_KEY=/, 'the stack\'s secret keys are never read');
  assert.match(WF, /SUPABASE_CLI_VERSION: \d+\.\d+\.\d+\n/, 'the Supabase CLI is pinned');
  assert.match(WF, /PLAYWRIGHT_VERSION: \d+\.\d+\.\d+\n/, 'Playwright is pinned');
  assert.match(WF, /uses: supabase\/setup-cli@[0-9a-f]{40} /, 'setup-cli pinned to a commit');
  // the production ref appears once: in the step that refuses a config.toml naming it
  const lines = WF.split('\n').filter((l) => /igbxbfuaoybfzsroxuln|supabase\.co\b/.test(l));
  assert.equal(lines.length, 1);
  assert.match(lines[0], /if grep -nE .*hushmallow\/supabase\/config\.toml; then$/);
});

test('the E2E workflow: every stage, in order', () => {
  const order = [
    'Refuse anything but the local stack',
    'node --test hushmallow/tests/auth-*.test.mjs',
    'working-directory: hushmallow\n        run: supabase start',
    'supabase status -o json 2>/dev/null | node tools/auth/e2e-stack-env.mjs >> "$GITHUB_ENV"',
    'from hm_private.schema_migrations',
    '-f hushmallow/supabase/tests/rls_check.sql',
    "grep -qE '^ALL [0-9]+ CHECKS PASSED'",
    'HM_AUTH_MODE: ci',
    'SUPABASE_URL="$E2E_API_URL" SUPABASE_PUBLISHABLE_KEY="$E2E_PUBLIC_KEY" bash hushmallow/tools/build-site.sh',
    'node hushmallow/tools/auth/pages-serve.mjs "$RUNNER_TEMP/site" 8000',
    'playwright install --with-deps chromium',
    'node hushmallow/tests/e2e/auth.e2e.mjs --out "$RUNNER_TEMP/e2e"',
    'uses: actions/upload-artifact@v4',
    'supabase stop --no-backup',
  ];
  let at = 0;
  for (const s of order) { const i = WF.indexOf(s, at); assert.ok(i >= 0, `missing or out of order: ${s}`); at = i; }
  assert.match(WF, /Keep the stack's logs\n {8}if: always\(\)/);
  assert.match(WF, /Upload the screenshots, report and logs\n {8}if: always\(\)/);
});

test('the Pages workflow: tests run when the SQL or the fake changes; the E2E trigger file is not a site change', () => {
  const pages = read(`${repo}.github/workflows/hushmallow-pages.yml`);
  const blocks = pages.split(/\n {2}(?:push|pull_request):\n/).slice(1);
  assert.equal(blocks.length, 2);
  for (const b of blocks) {
    const paths = [...b.split('\npermissions')[0].matchAll(/- '([^']+)'/g)].map((m) => m[1]);
    const iAuth = paths.indexOf('hushmallow/tools/auth/**'), iNot = paths.indexOf('!hushmallow/tools/auth/E2E'), iSql = paths.indexOf('hushmallow/supabase/**');
    assert.ok(paths.indexOf('!hushmallow/tools/**') < iAuth && iAuth < iNot, 'tools/auth back in, then its E2E trigger out');
    assert.ok(iSql > paths.indexOf('!hushmallow/**/*.md'), 'supabase/** listed after the markdown exclusion');
  }
});

test('e2e-stack-env: only the public values of a local stack go on', () => {
  const status = JSON.stringify({
    API_URL: 'http://127.0.0.1:54321', REST_URL: 'http://127.0.0.1:54321/rest/v1', DB_URL: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
    MAILPIT_URL: 'http://127.0.0.1:54324', INBUCKET_URL: 'http://127.0.0.1:54324', PUBLISHABLE_KEY: PUBLISHABLE, SECRET_KEY: SECRET,
    ANON_KEY: jwt('anon'), SERVICE_ROLE_KEY: jwt('service_role'), JWT_SECRET: 'super-secret-jwt-token-with-at-least-32-characters-long',
    S3_PROTOCOL_ACCESS_KEY_ID: 'a'.repeat(32), S3_PROTOCOL_ACCESS_KEY_SECRET: 'b'.repeat(64),
  });
  const r = stackEnv(`Stopped services: [supabase_studio_hushmallow]\n${status}\n`);
  assert.equal(r.ok, true, r.error);
  assert.deepEqual(r.env, { E2E_API_URL: 'http://127.0.0.1:54321', E2E_PUBLIC_KEY: PUBLISHABLE, E2E_DB_URL: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres', E2E_MAIL_URL: 'http://127.0.0.1:54324' });
  // as the workflow runs it: the printed lines never carry a secret
  const out = execFileSync(process.execPath, [`${root}tools/auth/e2e-stack-env.mjs`], { input: status, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  assert.deepEqual(out.trim().split('\n').map((l) => l.split('=')[0]), ['E2E_API_URL', 'E2E_PUBLIC_KEY', 'E2E_DB_URL', 'E2E_MAIL_URL']);
  for (const s of [SECRET, jwt('service_role'), 'super-secret-jwt', 'b'.repeat(64)]) assert.ok(!out.includes(s));
  // an older stack without a publishable key: its anon JWT
  assert.equal(stackEnv(JSON.stringify({ ...JSON.parse(status), PUBLISHABLE_KEY: '' })).env.E2E_PUBLIC_KEY, jwt('anon'));
});

test('e2e-stack-env: refuses a hosted project, a secret-only status, a service-role "anon" key', () => {
  const base = { API_URL: 'http://127.0.0.1:54321', DB_URL: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres', PUBLISHABLE_KEY: PUBLISHABLE };
  assert.match(stackEnv(JSON.stringify({ ...base, API_URL: `https://${PROJECT_REF}.supabase.co` })).error, /not on this machine/);
  assert.match(stackEnv(JSON.stringify({ ...base, DB_URL: 'postgresql://postgres:x@db.example.com:5432/postgres' })).error, /DB_URL/);
  assert.match(stackEnv(JSON.stringify({ ...base, PUBLISHABLE_KEY: SECRET })).error, /public key/);
  assert.match(stackEnv(JSON.stringify({ ...base, PUBLISHABLE_KEY: '', ANON_KEY: jwt('service_role') })).error, /public key/);
  assert.match(stackEnv('no json here').error, /no JSON/);
  let failed = false;
  try { execFileSync(process.execPath, [`${root}tools/auth/e2e-stack-env.mjs`], { input: JSON.stringify({ ...base, PUBLISHABLE_KEY: SECRET }), stdio: 'pipe' }); } catch (e) { failed = e.status === 1 && /REFUSED/.test(String(e.stderr)) && !String(e.stdout).includes(SECRET); }
  assert.ok(failed, 'exit 1, nothing printed for $GITHUB_ENV');
});

test('the E2E refuses any target that is not on this machine, and any key that is not public', () => {
  const ok = { site: 'http://127.0.0.1:8000', api: 'http://127.0.0.1:54321', key: PUBLISHABLE, mail: 'http://127.0.0.1:54324', db: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres' };
  assert.deepEqual(targetProblems(ok), []);
  assert.deepEqual(targetProblems({ ...ok, db: undefined, fake: 'http://127.0.0.1:8203', key: DEV_KEY }), []);
  assert.ok(targetProblems({ ...ok, api: `https://${PROJECT_REF}.supabase.co` }).some((x) => /never a hosted project/.test(x)));
  assert.ok(targetProblems({ ...ok, site: 'https://app.hushmallow.com' }).length);
  assert.ok(targetProblems({ ...ok, key: SECRET }).some((x) => /publishable or anon/.test(x)));
  assert.ok(targetProblems({ ...ok, key: jwt('service_role') }).some((x) => /publishable or anon/.test(x)));
  assert.ok(targetProblems({ ...ok, db: 'postgresql://postgres:x@db.example.com:5432/postgres' }).length);
  assert.ok(targetProblems({ ...ok, fake: 'http://127.0.0.1:8203' }).some((x) => /exactly one/.test(x)), 'not both a stack and the fake');
  assert.ok(targetProblems({ ...ok, mail: 'https://mail.example.com' }).length);
});

test('parseMail reads the rendered templates: the token_hash link, its type, the 6-digit code', () => {
  const vars = { RedirectTo: 'http://127.0.0.1:9999/elsewhere', TokenHash: `pkce_${'ab'.repeat(28)}`, Token: '407113', SiteURL: 'http://127.0.0.1:8000', Email: 'ana@example.com', NewEmail: 'ana2@example.com' };
  const signup = parseMail(renderTemplate('signup', vars).html);
  assert.deepEqual([signup.kind, signup.type, signup.tokenHash, signup.link], ['signup', 'email', vars.TokenHash, `${vars.SiteURL}/auth/callback?token_hash=${vars.TokenHash}&type=email`]);
  assert.equal(signup.code, null, 'no code in a link email');
  assert.equal(parseMail(renderTemplate('recovery', vars).html).kind, 'recovery');
  assert.equal(parseMail(renderTemplate('email_change', vars).html).kind, 'email_change');
  const re = parseMail(renderTemplate('reauthentication', vars).html);
  assert.deepEqual([re.kind, re.code, re.link], ['reauthentication', '407113', null]);
  // Supabase may escape the ampersand inside the attribute
  assert.equal(parseMail('<a href="http://127.0.0.1:8000/auth/callback?token_hash=pkce_x1y2z3w4&amp;type=recovery">x</a>').type, 'recovery');
  assert.equal(renderTemplate('signup', vars).subject, SUBJECTS.signup);
});

test('the fake speaks enough Mailpit, Supabase\'s one-link-per-kind, 24-hour reauthentication and reuse interval for the dry run', async () => {
  const fake = createFakeSupabase({ siteUrl: 'http://127.0.0.1:8202' });
  const port = await fake.listen(0);
  const base = `http://127.0.0.1:${port}`;
  const call = (path, { method = 'GET', body, token } = {}) => fetch(`${base}${path}`, { method, headers: { apikey: DEV_KEY, 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }));
  try {
    Object.assign(fake.cfg, { singleToken: true, rateLimitMs: 0, recentLoginMs: 86_400_000 });
    const email = 'mail.test@example.com';
    assert.equal((await call('/auth/v1/signup?redirect_to=http%3A%2F%2F127.0.0.1%3A8202%2Fauth%2Fcallback', { method: 'POST', body: { email, password: 'gentle-moon-42' } })).status, 200);
    await call('/auth/v1/resend?redirect_to=http%3A%2F%2F127.0.0.1%3A8202%2Fauth%2Fcallback', { method: 'POST', body: { email, type: 'signup' } });
    const list = await (await fetch(`${base}/__fake/mailpit/api/v1/messages`)).json();
    assert.equal(list.total, 2);
    assert.equal(list.messages[0].To[0].Address, email);
    assert.equal(list.messages[0].Subject, SUBJECTS.signup);
    const [newest, oldest] = await Promise.all(list.messages.map((m) => fetch(`${base}/__fake/mailpit/api/v1/message/${m.ID}`).then((r) => r.json())));
    const a = parseMail(newest.HTML), b = parseMail(oldest.HTML);
    assert.ok(a.link.startsWith('http://127.0.0.1:8202/auth/callback?token_hash=') && a.tokenHash !== b.tokenHash);
    assert.equal((await call('/auth/v1/verify', { method: 'POST', body: { token_hash: b.tokenHash, type: 'email' } })).status, 403, 'the replaced link no longer works');
    const v = await call('/auth/v1/verify', { method: 'POST', body: { token_hash: a.tokenHash, type: 'email' } });
    assert.equal(v.status, 200);
    // a fresh session changes the password without the code (Supabase Auth's 24-hour window) …
    assert.equal((await call('/auth/v1/user', { method: 'PUT', token: v.json.access_token, body: { password: 'quiet-harbour-77' } })).status, 200);
    // … an aged one needs it
    assert.equal((await (await fetch(`${base}/__fake/age-sessions`, { method: 'POST', body: JSON.stringify({ email, hours: 25 }) })).json()).sessions, 1);
    assert.equal((await call('/auth/v1/user', { method: 'PUT', token: v.json.access_token, body: { password: 'soft-lantern-19' } })).json.error_code, 'reauthentication_needed');
    // a refresh token used a moment ago still works (reuse interval); long after, it does not
    const r1 = await call('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: v.json.refresh_token } });
    const r2 = await call('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: v.json.refresh_token } });
    assert.deepEqual([r1.status, r2.status], [200, 200]);
    fake.cfg.reuseIntervalMs = 0;
    await new Promise((r) => setTimeout(r, 5));
    assert.equal((await call('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: v.json.refresh_token } })).json.error_code, 'refresh_token_already_used');
    const state = await (await fetch(`${base}/__fake/state`)).json();
    assert.ok(Array.isArray(state.liveSessions) && state.liveSessions.length >= 1);
    await fetch(`${base}/__fake/mailpit/api/v1/messages`, { method: 'DELETE' });
    assert.equal((await (await fetch(`${base}/__fake/mailpit/api/v1/messages`)).json()).total, 0);
  } finally { await fake.close(); }
});
