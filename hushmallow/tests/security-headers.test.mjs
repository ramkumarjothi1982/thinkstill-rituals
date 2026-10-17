// The published site's security and cache headers (_headers, Cloudflare
// Pages): built by tools/site/auth-config.mjs + tools/site/security-headers.mjs,
// read here with the Pages semantics of tools/site/pages-headers.mjs (every
// matching rule applies; a repeated header is joined with ", ").
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { headersFile, buildPublicConfig } from '../tools/site/auth-config.mjs';
import { FRAME_ANCESTORS, inlineCode, inlineSources, appCsp } from '../tools/site/security-headers.mjs';
import { parseHeadersFile, headersFor, matchingRules } from '../tools/site/pages-headers.mjs';
import { PROJECT_URL } from '../src/auth/config.js';
import { ANGLE_ENDPOINT } from '../src/app/config.js';

const root = new URL('..', import.meta.url).pathname;
const SUPA = new URL(PROJECT_URL).origin;
const WORKER = new URL(ANGLE_ENDPOINT).origin;
const prod = parseHeadersFile(headersFile(SUPA, { version: '0123abcd' }));
const get = (rules, path, name) => headersFor(rules, path).get(name.toLowerCase())?.value ?? null;
/** CSP header value → [ Map(directive → [sources]) ] (one per comma-separated policy). */
const policies = (v) => String(v || '').split(',').map((p) => new Map(p.split(';').map((d) => d.trim()).filter(Boolean).map((d) => { const [k, ...s] = d.split(/\s+/); return [k.toLowerCase(), s]; })));

test('the whole site has an ENFORCED CSP: no unsafe-eval, no inline script, no wildcard or scheme-wide source', () => {
  for (const path of ['/', '/index.html', '/anything/else', '/v/abc123/src/app/main.js', '/version.json']) {
    const h = headersFor(prod, path);
    assert.ok(h.get('content-security-policy'), `${path}: CSP`);
    assert.equal(h.get('content-security-policy-report-only'), undefined, `${path}: enforced, not report-only`);
  }
  const [p] = policies(get(prod, '/', 'Content-Security-Policy'));
  for (const [d, srcs] of p) {
    assert.ok(!srcs.includes("'unsafe-eval'"), `${d}: no 'unsafe-eval'`);
    for (const s of srcs) {
      assert.ok(!s.includes('*'), `${d}: no wildcard (${s})`);
      assert.ok(!/^(https?|wss?):?$/.test(s.replace(/:$/, '')) || s.includes('//'), `${d}: no scheme-wide source (${s})`);
      if (/^(data|blob):$/.test(s)) assert.ok(['img-src', 'media-src'].includes(d), `${d}: ${s} only for images and media`);
    }
  }
  assert.deepEqual(p.get('default-src'), ["'self'"]);
  const script = p.get('script-src');
  assert.equal(script[0], "'self'");
  assert.ok(script.includes("'wasm-unsafe-eval'"), 'WebAssembly from our own files (onnxruntime-web)');
  assert.ok(!script.includes("'unsafe-inline'") && !script.includes('data:') && !script.includes('blob:'), 'no inline script, no data:/blob: script');
  assert.ok(script.slice(1).every((s) => /^'(wasm-unsafe-eval|unsafe-hashes|sha256-[A-Za-z0-9+/=]+)'$/.test(s)), `script-src: only self, wasm and hashes (${script.join(' ')})`);
  assert.deepEqual(p.get('worker-src'), ["'self'"]);
  assert.deepEqual(p.get('img-src'), ["'self'", 'data:', 'blob:']);
  assert.deepEqual(p.get('object-src'), ["'none'"]);
  assert.deepEqual(p.get('base-uri'), ["'none'"]);
  assert.deepEqual(p.get('form-action'), ["'self'"], 'no form posts anywhere else (payments are not on the web)');
  assert.deepEqual(p.get('frame-src'), ["'none'"]);
  assert.ok(p.has('upgrade-insecure-requests'));
});

test('connect-src is exactly this site, the Sydney project (https + wss) and the Another Angle Worker', () => {
  const [p] = policies(get(prod, '/', 'Content-Security-Policy'));
  assert.equal(SUPA, 'https://igbxbfuaoybfzsroxuln.supabase.co');
  assert.deepEqual(p.get('connect-src'), ["'self'", SUPA, 'wss://igbxbfuaoybfzsroxuln.supabase.co', WORKER]);
  // sign-in off: no Supabase at all
  const [off] = policies(get(parseHeadersFile(headersFile(null)), '/', 'Content-Security-Policy'));
  assert.deepEqual(off.get('connect-src'), ["'self'", WORKER]);
  // a dev / ci build (local stack over http): its own origin, ws://, and no upgrade (it runs on http://127.0.0.1)
  const ci = buildPublicConfig({ SUPABASE_URL: 'http://127.0.0.1:54321', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_localstack_0000000000', HM_AUTH_MODE: 'ci' });
  assert.equal(ci.ok, true);
  const [c] = policies(get(parseHeadersFile(ci.headers), '/', 'Content-Security-Policy'));
  assert.deepEqual(c.get('connect-src'), ["'self'", 'http://127.0.0.1:54321', 'ws://127.0.0.1:54321', WORKER]);
  assert.ok(!c.has('upgrade-insecure-requests'));
  // production builds are what buildPublicConfig publishes with the real values
  const live = buildPublicConfig({ SUPABASE_URL: PROJECT_URL, SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_only_0000000000' }, { version: '0123abcd' });
  assert.equal(live.headers, headersFile(SUPA, { version: '0123abcd' }));
});

test('frame-ancestors: only the owner\'s Framer site (the agreed embed); X-Frame-Options never contradicts it', () => {
  const [p] = policies(get(prod, '/', 'Content-Security-Policy'));
  assert.deepEqual(p.get('frame-ancestors'), [...FRAME_ANCESTORS]);
  assert.deepEqual([...FRAME_ANCESTORS], ['https://hushmallow.com', 'https://www.hushmallow.com']);
  // the root cannot carry X-Frame-Options (it has no "allow this origin"); /auth/* is DENY and frame-ancestors 'none'
  assert.equal(get(prod, '/', 'X-Frame-Options'), null);
  assert.equal(get(prod, '/auth/callback/', 'X-Frame-Options'), 'DENY');
  const auth = policies(get(prod, '/auth/callback/', 'Content-Security-Policy'));
  assert.equal(auth.length, 2, 'the app policy and the /auth/* policy are both enforced');
  assert.deepEqual(auth[1].get('frame-ancestors'), ["'none'"]);
});

test('HSTS, nosniff, referrer, COOP and Permissions-Policy on every path', () => {
  for (const path of ['/', '/auth/callback/', '/legal/privacy.html', '/v/x/src/app/main.js', '/version.json']) {
    assert.equal(get(prod, path, 'Strict-Transport-Security'), 'max-age=31536000; includeSubDomains', path);
    assert.equal(get(prod, path, 'X-Content-Type-Options'), 'nosniff', `${path}: one exact token`);
    assert.equal(get(prod, path, 'Cross-Origin-Opener-Policy'), 'same-origin', path);
  }
  assert.ok(!/preload/.test(get(prod, '/', 'Strict-Transport-Security')), 'preload is the owner\'s choice');
  assert.equal(get(prod, '/', 'Referrer-Policy'), 'same-origin');
  // a list: the last policy the browser knows wins → no-referrer on the sign-in callback
  assert.equal(get(prod, '/auth/callback/', 'Referrer-Policy').split(',').map((s) => s.trim()).pop(), 'no-referrer');
  const pp = get(prod, '/', 'Permissions-Policy');
  for (const f of ['camera', 'microphone', 'geolocation', 'payment', 'usb', 'display-capture']) assert.match(pp, new RegExp(`(^|, )${f}=\\(\\)`), f);
  for (const f of ['accelerometer', 'gyroscope', 'autoplay', 'fullscreen', 'web-share', 'clipboard-write']) assert.ok(!new RegExp(`(^|, )${f}=`).test(pp), `${f} stays available (used by the app or delegated by the Framer embed)`);
});

test('/auth/* stays uncached, unframed and referrer-free, with its own connect-src', () => {
  for (const path of ['/auth/callback/', '/auth/callback', '/auth/anything']) {
    assert.equal(get(prod, path, 'Cache-Control'), 'no-store', `${path}: exactly no-store`);
    assert.equal(get(prod, path, 'X-Frame-Options'), 'DENY');
  }
  const [, a] = policies(get(prod, '/auth/callback/', 'Content-Security-Policy'));
  assert.deepEqual(a.get('connect-src'), ["'self'", SUPA]);
  assert.deepEqual(a.get('script-src'), ["'self'"]);
  assert.deepEqual(a.get('style-src'), ["'self'"]);
});

test('/legal/* (Privacy Policy, Terms of Use): revalidated, unframed, referrer-free, and a second policy with no script', () => {
  for (const path of ['/legal/privacy.html', '/legal/terms.html']) {
    assert.equal(get(prod, path, 'Cache-Control'), 'no-cache', `${path}: exactly one cache rule`);
    assert.equal(get(prod, path, 'X-Frame-Options'), 'DENY');
    assert.equal(get(prod, path, 'Referrer-Policy').split(',').map((s) => s.trim()).pop(), 'no-referrer');
    const ps = policies(get(prod, path, 'Content-Security-Policy'));
    assert.equal(ps.length, 2, 'the app policy and the /legal/* policy are both enforced');
    assert.deepEqual(ps[1].get('default-src'), ["'none'"]);
    assert.equal(ps[1].get('script-src'), undefined, 'no script source: default-src none applies');
    assert.deepEqual(ps[1].get('frame-ancestors'), ["'none'"]);
  }
  // the app's own pages keep the app policy only
  assert.equal(policies(get(prod, '/', 'Content-Security-Policy')).length, 1);
});

test('cache: v/<version>/ is immutable, pages / version.json / public-config.js always revalidate, one rule per path', () => {
  const imm = 'public, max-age=31536000, immutable';
  for (const p of ['/v/0123abcd/src/app/main.js', '/v/0123abcd/src/auth/client.js', '/v/0123abcd/src/brand.js', '/v/0123abcd/assets/mallows/blubi.webp', '/v/0123abcd/vendor/supabase/supabase.js', '/v/0123abcd/src/ui/app.css']) assert.equal(get(prod, p, 'Cache-Control'), imm, p);
  for (const p of ['/', '/index.html', '/version.json', '/manifest.webmanifest', '/src/app/main.js', '/v/0123abcd/src/auth/public-config.js']) assert.equal(get(prod, p, 'Cache-Control'), 'no-cache', p);
  // an unknown path matches no cache rule and keeps Pages' default (max-age=0, must-revalidate), and so does ANOTHER
  // version's folder (gone after a deploy or a rollback): never immutable code. Both are answered by 404.html, which
  // Pages sends with no-store whatever the rules say (tests/not-found.test.mjs)
  for (const p of ['/something', '/v/oldversion/src/app/main.js', '/v/oldversion/vendor/supabase/supabase.js']) assert.equal(get(prod, p, 'Cache-Control'), 'public, max-age=0, must-revalidate', p);
  assert.ok(!headersFile(SUPA, { version: '0123abcd' }).includes(':version'));
  assert.throws(() => headersFile(SUPA, { version: '../x' }));
  const text = headersFile(SUPA, { version: '0123abcd' });
  assert.ok(prod.length < 100, `Pages allows 100 header rules (${prod.length})`);
  assert.ok(text.split('\n').every((l) => l.length <= 2000), 'Pages allows 2,000 characters a line');
});

test('pages-headers follows Pages: all matching rules, ", " joins, "!" detaches, :placeholders are one segment', () => {
  const r = parseHeadersFile('/*\n  A: 1\n  B: x\n/sub/*\n  A: 2\n  ! B\n/v/:ver/f.js\n  C: y\nhttps://other.example/*\n  D: z\n');
  assert.equal(get(r, '/sub/x', 'A'), '1, 2');
  assert.equal(get(r, '/sub/x', 'B'), null);
  assert.equal(get(r, '/top', 'B'), 'x');
  assert.equal(get(r, '/v/abc/f.js', 'C'), 'y');
  assert.equal(get(r, '/v/a/b/f.js', 'C'), null);
  assert.deepEqual(matchingRules(r, '/sub/x'), ['/*', '/sub/*', 'https://other.example/*']);
  assert.equal(headersFor(r, '/x', { host: 'app.example' }).get('d'), undefined);
  // a rule's header replaces Pages' default rather than joining it
  assert.equal(get(parseHeadersFile('/*\n  Cache-Control: no-cache\n'), '/', 'Cache-Control'), 'no-cache');
});

test('inline code: hashes for every inline script; handlers need unsafe-hashes', () => {
  const html = '<script>a()</script><script type="module" src="x.js" onerror="b()"></script><!-- <script>c()</script> --><img onload=\'d(&quot;q&quot;)\'><body onload=e()>';
  const c = inlineCode(html);
  assert.deepEqual(c.scripts, ['a()']);
  assert.deepEqual(c.handlers.map((h) => h.code), ['b()', 'd("q")', 'e()']);
  const h = (s) => `'sha256-${createHash('sha256').update(s).digest('base64')}'`;
  assert.deepEqual(inlineSources([html]), [h('a()'), "'unsafe-hashes'", h('b()'), h('d("q")'), h('e()')]);
  assert.ok(!appCsp({ inline: inlineSources(['<p>no code</p>']) }).includes('unsafe-hashes'));
});

test('the BUILT site: every inline script and handler is hashed, and every published file gets at most one Cache-Control rule', () => {
  const out = mkdtempSync(join(tmpdir(), 'hm-sec-'));
  try {
    execFileSync('bash', [join(root, 'tools/build-site.sh'), out, 'sec0test'], { cwd: root, stdio: 'ignore', env: { PATH: process.env.PATH, HOME: process.env.HOME || '/tmp', SUPABASE_URL: PROJECT_URL, SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_only_0000000000' } });
    const rules = parseHeadersFile(readFileSync(join(out, '_headers'), 'utf8'));
    const [p] = policies(get(rules, '/', 'Content-Security-Policy'));
    const script = p.get('script-src');
    const h = (s) => `'sha256-${createHash('sha256').update(s).digest('base64')}'`;
    for (const page of ['index.html', 'auth/callback/index.html']) {
      const c = inlineCode(readFileSync(join(out, page), 'utf8'));
      for (const s of c.scripts) assert.ok(script.includes(h(s)), `${page}: an inline script is hashed`);
      for (const x of c.handlers) assert.ok(script.includes("'unsafe-hashes'") && script.includes(h(x.code)), `${page}: ${x.attr} is hashed`);
    }
    const files = [];
    const walk = (d) => { for (const n of readdirSync(d)) { const f = join(d, n); if (statSync(f).isDirectory()) walk(f); else files.push(`/${relative(out, f)}`); } };
    walk(out);
    const cacheRules = rules.filter((r) => r.set.some(([k]) => k.toLowerCase() === 'cache-control'));
    for (const f of files) {
      const n = cacheRules.filter((r) => r.re.test(f)).length;
      assert.ok(n <= 1, `${f}: ${n} Cache-Control rules`);
      if (f.startsWith('/v/sec0test/')) assert.equal(n, 1, `${f}: covered by a cache rule`);
    }
    assert.equal(get(rules, '/v/sec0test/src/auth/public-config.js', 'Cache-Control'), 'no-cache');
  } finally { rmSync(out, { recursive: true, force: true }); }
});
