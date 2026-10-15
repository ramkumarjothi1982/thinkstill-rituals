// Sign-in configuration: only hushmallow1, only a publishable key, never a
// secret; what the build publishes; the vendored library is the pinned file.
// Run: node --test hushmallow/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { validatePublicConfig, classifyKey, resolveAuthConfig, storageKeyFor, publicConfigModule, PROJECT_REF, PROJECT_URL, DEV_KEY } from '../src/auth/config.js';
import { buildPublicConfig, envProblems, headersFile } from '../tools/site/auth-config.mjs';
import PUBLISHED from '../src/auth/public-config.js';
import { VENDOR } from '../src/auth/client.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const KEY = 'sb_publishable_NSv1Liou2yjKjauX09U5qQ_CxwzDuiw';
// fake secrets are assembled at run time, so no file ever holds a secret-shaped string
const SECRET = ['sb', 'secret', 'abcdefghijklmnopqrstuvwxyz0123'].join('_');
const jwt = (payload) => `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.c2lnbmF0dXJlLXBhcnQ`;
const mem = (seed = {}) => { const m = new Map(Object.entries(seed)); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };

test('the one project: hushmallow1 in Sydney', () => {
  assert.equal(PROJECT_REF, 'igbxbfuaoybfzsroxuln');
  assert.equal(PROJECT_URL, 'https://igbxbfuaoybfzsroxuln.supabase.co');
  assert.equal(storageKeyFor(PROJECT_URL), 'sb-igbxbfuaoybfzsroxuln-auth-token');
});

test('production accepts exactly the project URL and a publishable key', () => {
  const v = validatePublicConfig({ url: PROJECT_URL, key: KEY });
  assert.deepEqual({ ok: v.ok, enabled: v.enabled, url: v.url, ref: v.ref, mode: v.mode }, { ok: true, enabled: true, url: PROJECT_URL, ref: PROJECT_REF, mode: 'production' });
  assert.equal(validatePublicConfig({ url: `${PROJECT_URL}/`, key: KEY }).url, PROJECT_URL, 'one trailing slash is normalised');
  assert.deepEqual(validatePublicConfig({}), { ok: true, enabled: false });
  assert.deepEqual(validatePublicConfig({ url: '', key: '' }), { ok: true, enabled: false });
});

test('another project (the old Singapore one included) is refused in every mode', () => {
  for (const mode of ['production', 'dev', 'ci']) {
    for (const url of ['https://abcdefghijklmnopqrst.supabase.co', 'https://zyxwvutsrqponmlkjihg.supabase.co/', 'https://igbxbfuaoybfzsroxuln.supabase.co.evil.example', 'https://evil.example/igbxbfuaoybfzsroxuln.supabase.co']) {
      const v = validatePublicConfig({ url, key: KEY, mode });
      assert.equal(v.ok, false, `${mode} ${url}`);
    }
  }
  assert.match(validatePublicConfig({ url: 'https://abcdefghijklmnopqrst.supabase.co', key: KEY }).error, /not hushmallow1/);
});

test('a secret key or a service_role JWT is refused in every mode, even alone', () => {
  for (const mode of ['production', 'dev', 'ci']) {
    for (const key of [SECRET, SECRET.toUpperCase(), jwt({ role: 'service_role', iss: 'supabase' })]) {
      assert.equal(validatePublicConfig({ url: PROJECT_URL, key, mode }).ok, false, `${mode} ${key.slice(0, 12)}`);
      assert.equal(validatePublicConfig({ url: '', key, mode }).ok, false, 'refused even without a URL');
      assert.equal(validatePublicConfig({ url: 'http://localhost:54321', key, mode }).ok, false);
    }
  }
  assert.equal(classifyKey('sb_secret_x'), 'secret');
  assert.equal(classifyKey(jwt({ role: 'service_role' })), 'service-jwt');
  assert.equal(classifyKey(jwt({ role: 'anon' })), 'anon-jwt');
  assert.equal(classifyKey(KEY), 'publishable');
});

test('malformed values fail loudly; half a config is malformed', () => {
  const bad = [
    { url: PROJECT_URL, key: '' }, { url: '', key: KEY },
    { url: ` ${PROJECT_URL}`, key: KEY }, { url: `${PROJECT_URL}\n`, key: KEY }, { url: PROJECT_URL, key: `${KEY} ` },
    { url: 'http://igbxbfuaoybfzsroxuln.supabase.co', key: KEY }, { url: `${PROJECT_URL}/rest/v1`, key: KEY },
    { url: `${PROJECT_URL}?x=1`, key: KEY }, { url: PROJECT_URL, key: 'sb_publishable_short' }, { url: PROJECT_URL, key: 'hello' },
    { url: PROJECT_URL, key: jwt({ role: 'anon' }) },   // production wants the publishable key
    { url: PROJECT_URL, key: KEY, mode: 'staging' },
  ];
  for (const c of bad) assert.equal(validatePublicConfig(c).ok, false, JSON.stringify(c).slice(0, 80));
});

test('localhost needs dev or ci mode, and then a publishable or local anon key', () => {
  assert.equal(validatePublicConfig({ url: 'http://localhost:54321', key: KEY }).ok, false);
  const v = validatePublicConfig({ url: 'http://127.0.0.1:54321/', key: jwt({ role: 'anon' }), mode: 'ci' });
  assert.equal(v.ok, true); assert.equal(v.url, 'http://127.0.0.1:54321'); assert.equal(v.local, true);
  assert.equal(validatePublicConfig({ url: 'http://localhost:8203', key: DEV_KEY, mode: 'dev' }).ok, true);
  assert.equal(validatePublicConfig({ url: 'http://localhost:8203', key: jwt({ role: 'authenticated' }), mode: 'dev' }).ok, false);
  assert.equal(validatePublicConfig({ url: 'http://example.com:8203', key: DEV_KEY, mode: 'dev' }).ok, false);
});

test('the build refuses Supabase secrets anywhere in its environment', () => {
  assert.deepEqual(envProblems({ PATH: '/bin', SUPABASE_URL: PROJECT_URL, SUPABASE_PUBLISHABLE_KEY: KEY }), []);
  for (const n of ['SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ACCESS_TOKEN']) assert.equal(envProblems({ [n]: 'x' }).length, 1, n);
  assert.equal(envProblems({ SOMETHING: SECRET }).length, 1);
  const r = buildPublicConfig({ SUPABASE_URL: PROJECT_URL, SUPABASE_PUBLISHABLE_KEY: KEY, SUPABASE_SERVICE_ROLE_KEY: 'x' });
  assert.equal(r.ok, false);
});

test('the published file holds the two public values and nothing else', async () => {
  const on = buildPublicConfig({ SUPABASE_URL: PROJECT_URL, SUPABASE_PUBLISHABLE_KEY: KEY });
  assert.equal(on.ok, true);
  const body = JSON.parse(/Object\.freeze\((\{.*\})\)/.exec(on.source)[1]);
  assert.deepEqual(body, { enabled: true, url: PROJECT_URL, key: KEY, mode: 'production' });
  assert.doesNotMatch(on.source, /secret|service_role|password/i);
  assert.ok(!on.summary.includes(KEY), 'the build log never prints the whole key');
  const off = buildPublicConfig({});
  assert.equal(off.ok, true);
  assert.deepEqual(JSON.parse(/Object\.freeze\((\{.*\})\)/.exec(off.source)[1]), { enabled: false });
  assert.equal(publicConfigModule({ enabled: false }).includes('"enabled":false'), true);
  // the repository copy is always off: the app runs exactly as before without a build
  assert.deepEqual({ ...PUBLISHED }, { enabled: false });
});

test('_headers: /auth/* is never cached, framed or leaked, and may only talk to the project', () => {
  const h = headersFile('https://igbxbfuaoybfzsroxuln.supabase.co');
  assert.match(h, /^\/auth\/\*$/m);
  for (const line of ['Cache-Control: no-store', 'Referrer-Policy: no-referrer', 'X-Frame-Options: DENY', 'X-Content-Type-Options: nosniff']) assert.ok(h.includes(`  ${line}`), line);
  assert.match(h, /frame-ancestors 'none'/);
  assert.match(h, /connect-src 'self' https:\/\/igbxbfuaoybfzsroxuln\.supabase\.co;/);
  assert.match(h, /script-src 'self';/);
  assert.match(headersFile(null), /connect-src 'self';/);
});

test('runtime: the browser re-checks; a dev build signs in only on localhost; ?authDev is localhost-only', () => {
  const prod = { enabled: true, url: PROJECT_URL, key: KEY, mode: 'production' };
  const host = (hostname, search = '') => ({ hostname, protocol: hostname === 'localhost' ? 'http:' : 'https:', search });
  const c = resolveAuthConfig({ published: prod, loc: host('app.hushmallow.com'), session: mem() });
  assert.equal(c.enabled, true); assert.equal(c.storageKey, 'sb-igbxbfuaoybfzsroxuln-auth-token');
  assert.equal(resolveAuthConfig({ published: { ...prod, url: 'https://abcdefghijklmnopqrst.supabase.co' }, loc: host('app.hushmallow.com'), session: mem() }).enabled, false);
  assert.equal(resolveAuthConfig({ published: { ...prod, key: SECRET }, loc: host('app.hushmallow.com'), session: mem() }).enabled, false);
  const dev = { enabled: true, url: 'http://localhost:8203', key: DEV_KEY, mode: 'dev' };
  assert.equal(resolveAuthConfig({ published: dev, loc: host('hushmallow.pages.dev'), session: mem() }).enabled, false, 'a dev build published by mistake does nothing');
  assert.equal(resolveAuthConfig({ published: dev, loc: host('localhost'), session: mem() }).enabled, true);
  // the override
  const ss = mem();
  const o = resolveAuthConfig({ published: { enabled: false }, loc: host('localhost', '?authDev=8203'), session: ss });
  assert.equal(o.enabled, true); assert.equal(o.url, 'http://localhost:8203'); assert.equal(o.storageKey, 'sb-localhost-auth-token');
  assert.equal(resolveAuthConfig({ published: { enabled: false }, loc: host('localhost'), session: ss }).enabled, true, 'remembered for the tab');
  assert.equal(resolveAuthConfig({ published: { enabled: false }, loc: host('localhost', '?authDev=off'), session: ss }).enabled, false);
  assert.equal(resolveAuthConfig({ published: { enabled: false }, loc: host('app.hushmallow.com', '?authDev=8203'), session: mem() }).enabled, false, 'never on a real host');
  assert.equal(resolveAuthConfig({ published: null, loc: host('app.hushmallow.com'), session: mem() }).enabled, false);
});

test('the vendored supabase-js is the pinned 2.117.2 file, with its licence, loaded with the same SRI', () => {
  const man = JSON.parse(readFileSync(`${root}vendor/supabase/manifest.json`, 'utf8'));
  const buf = readFileSync(`${root}vendor/supabase/supabase.js`);
  assert.equal(man.version, '2.117.2');
  assert.ok(Date.parse('2026-10-13') - Date.parse(man.published) >= 14 * 864e5, 'published at least 14 days before it was pinned');
  assert.equal(createHash('sha256').update(buf).digest('hex'), man.sha256);
  assert.equal(`sha384-${createHash('sha384').update(buf).digest('base64')}`, man.sri);
  assert.equal(VENDOR.integrity, man.sri);
  assert.equal(VENDOR.version, man.version);
  assert.match(readFileSync(`${root}vendor/supabase/LICENSE`, 'utf8'), /MIT License[\s\S]*Copyright \(c\) 2020 Supabase/);
  assert.match(readFileSync(`${root}vendor/supabase/README.md`, 'utf8'), new RegExp(man.sha256));
});

test('only src/auth/client.js loads the library, and only lazily (no static import, no CDN)', () => {
  const walk = (d) => readdirSync(d).flatMap((f) => (statSync(`${d}/${f}`).isDirectory() ? walk(`${d}/${f}`) : f.endsWith('.js') ? [`${d}/${f}`] : []));
  const users = walk(`${root}src`).filter((f) => readFileSync(f, 'utf8').includes('vendor/supabase'));
  assert.deepEqual(users.map((f) => f.slice(root.length)), ['src/auth/client.js']);
  for (const f of walk(`${root}src`)) {
    const s = readFileSync(f, 'utf8');
    assert.doesNotMatch(s, /from\s+['"][^'"]*supabase/, `${f}: no static import of supabase-js`);
    assert.doesNotMatch(s, /cdn\.jsdelivr|unpkg\.com|esm\.sh|cdnjs/, `${f}: no CDN`);
  }
  // main.js boots with the tiny boot module only; client.js is a dynamic import
  const main = readFileSync(`${root}src/app/main.js`, 'utf8');
  assert.match(main, /from '\.\.\/auth\/boot\.js'/);
  assert.doesNotMatch(main, /from '\.\.\/auth\/client\.js'/);
  assert.match(readFileSync(`${root}src/auth/boot.js`, 'utf8'), /import\('\.\/client\.js'\)/);
});

test('no secret key, service-role key or access token anywhere in the app, tools or tests', () => {
  const walk = (d) => readdirSync(d).flatMap((f) => {
    if (['node_modules', '.git', 'vendor', 'assets', 'content', 'server'].includes(f)) return [];
    const p = `${d}/${f}`;
    return statSync(p).isDirectory() ? walk(p) : /\.(m?js|cjs|json|html|sh|sql|ya?ml|toml|md)$/.test(f) ? [p] : [];
  });
  for (const f of walk(root.replace(/\/$/, ''))) {
    const s = readFileSync(f, 'utf8');
    assert.doesNotMatch(s, /sb_secret_[A-Za-z0-9_-]{20,}/, f);
    assert.doesNotMatch(s, /eyJhbGciOi[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]*c2VydmljZV9yb2xl/, `${f}: a service_role JWT`);
    assert.doesNotMatch(s, /sbp_[a-f0-9]{40}/, `${f}: a Supabase access token`);
  }
});

test('build-site.sh: a refused value stops the build before anything is written', () => {
  const out = join(tmpdir(), `hm-test-refused-${process.pid}`);
  let failed = false, msg = '';
  try {
    execFileSync('bash', [`${root}tools/build-site.sh`, out, 'test1'], { env: { ...process.env, SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co', SUPABASE_PUBLISHABLE_KEY: KEY }, stdio: 'pipe' });
  } catch (e) { failed = true; msg = String(e.stderr); }
  assert.ok(failed, 'the build failed');
  assert.match(msg, /REFUSED/);
  assert.throws(() => statSync(out), 'nothing was assembled');
});
