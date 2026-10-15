// tools/ops/monitor.mjs against a local fake of production (site + Worker):
// healthy, a wrong / stale version, a missing CSP, the Worker down, slow
// answers, a wrong Supabase project, a secret in the config, a flapping check.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { runOnce, runMonitor, format } from '../tools/ops/monitor.mjs';
import { headersFile } from '../tools/site/auth-config.mjs';
import { parseHeadersFile, headersFor } from '../tools/site/pages-headers.mjs';
import { PROJECT_URL } from '../src/auth/config.js';

const VER = 'a'.repeat(40);
const SUPA = new URL(PROJECT_URL).origin;
const rulesFor = (ver) => parseHeadersFile(headersFile(SUPA, { version: /^[0-9A-Za-z_-]+$/.test(ver) ? ver : 'x' }));

/** A fake production. `o` is changed by each test (reset per test). */
function fakeProd() {
  const o = {};
  const reset = () => Object.assign(o, { ver: VER, page: VER, csp: true, config: { enabled: true, url: PROJECT_URL, key: 'sb_publishable_live_looking_0000000', mode: 'production' }, configRaw: null, workerDown: false, health: null, delay: 0, delayPath: null, gate: false, failTimes: 0, seenCredentials: false, override: {}, rootBody: null });
  reset();
  let fails = 0;
  const site = http.createServer(async (req, res) => {
    if (req.headers.cookie || req.headers.authorization) o.seenCredentials = true;
    const path = new URL(req.url, 'http://x').pathname;
    if (o.delay && (!o.delayPath || o.delayPath === path)) await new Promise((r) => setTimeout(r, o.delay));
    const hs = Object.fromEntries([...headersFor(rulesFor(o.page), path).values()].filter(({ name }) => o.csp || name.toLowerCase() !== 'content-security-policy').map(({ name, value }) => [name, value]));
    for (const [k, v] of Object.entries(o.override[path] || {})) { if (v == null) delete hs[k]; else hs[k] = v; }
    if (o.failTimes && path === '/version.json' && fails < o.failTimes) { fails++; res.writeHead(502, hs); res.end('bad gateway'); return; }
    if (o.gate && !path.startsWith('/auth/')) { res.writeHead(200, { ...hs, 'content-type': 'text/html' }); res.end('<!doctype html><title>pilot</title><form method="post" data-pilot-gate><input name="code"></form>'); return; }
    if (path === '/' && o.rootBody) { res.writeHead(200, { ...hs, 'content-type': 'text/html' }); res.end(o.rootBody); return; }
    if (path === '/') { res.writeHead(200, { ...hs, 'content-type': 'text/html' }); res.end(`<!doctype html><script type="module" src="v/${o.page}/src/app/main.js"></script>`); return; }
    if (path === '/version.json') { res.writeHead(200, { ...hs, 'content-type': 'application/json' }); res.end(JSON.stringify({ v: o.ver })); return; }
    if (path === `/v/${o.page}/src/auth/public-config.js`) { res.writeHead(200, { ...hs, 'content-type': 'text/javascript' }); res.end(o.configRaw ?? `// generated\nexport default Object.freeze(${JSON.stringify(o.config)});\n`); return; }
    if (path === `/v/${o.page}/src/app/main.js`) { res.writeHead(200, { ...hs, 'content-type': 'text/javascript; charset=utf-8' }); res.end('export {};'); return; }
    if (path === '/auth/callback/') { res.writeHead(200, { ...hs, 'content-type': 'text/html' }); res.end('<!doctype html>'); return; }
    res.writeHead(404, hs); res.end();
  });
  const worker = http.createServer(async (req, res) => {
    if (o.workerDown) { req.socket.destroy(); return; }
    const origin = req.headers.origin;
    if (!origin) { res.writeHead(403, { 'content-type': 'application/json' }); res.end(JSON.stringify({ status: 'error', error: { code: 'origin_not_allowed' } })); return; }
    res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': origin });
    res.end(JSON.stringify(o.health ?? { ok: true, service: 'another-angle', prompt_version: 'p-7', schema_version: 'scene-v1', provider: 'anthropic', entitlement_mode: 'testing', invite_required: true, configured: { signing_key: true, provider_key: true } }));
  });
  return {
    o, reset,
    async start() {
      await new Promise((r) => site.listen(0, '127.0.0.1', r));
      await new Promise((r) => worker.listen(0, '127.0.0.1', r));
      return { site: `http://127.0.0.1:${site.address().port}`, worker: `http://127.0.0.1:${worker.address().port}` };
    },
    stop: () => Promise.all([new Promise((r) => site.close(r)), new Promise((r) => worker.close(r))]),
  };
}

const prod = fakeProd();
let urls;
test.before(async () => { urls = await prod.start(); });
test.after(() => prod.stop());
test.beforeEach(() => prod.reset());
const run = (extra = {}) => runOnce({ ...urls, maxMs: 1500, timeoutMs: 3000, ...extra });
const failing = (r) => r.checks.filter((c) => !c.ok).map((c) => c.name);

test('healthy production: every check passes, never with credentials', async () => {
  const r = await run();
  assert.equal(r.ok, true, format(r));
  assert.deepEqual(r.checks.map((c) => c.name), ['site', 'version', 'config', 'code', 'callback', 'worker']);
  assert.ok(r.checks.every((c) => c.ms == null || c.ms < 1500));
  assert.equal(prod.o.seenCredentials, false);
  assert.match(format(r), /^OK$/m);
  // the expected version (from main) and the list of acceptable newer ones
  assert.equal((await run({ expectVersion: VER })).ok, true);
  assert.equal((await run({ allowedVersions: ['b'.repeat(40), VER] })).ok, true);
});

test('wrong version: page / version.json disagree, not a commit, older than main', async () => {
  prod.o.ver = 'c'.repeat(40);
  assert.deepEqual(failing(await run()), ['version']);
  prod.reset();
  assert.match(format(await run({ expectVersion: 'd'.repeat(40) })), /FAIL.*version aaaaaaaaaaaa, expected dddddddddddd/);
  assert.match(format(await run({ allowedVersions: ['e'.repeat(40)] })), /older than the last change on main/);
  prod.o.ver = 'test'; prod.o.page = 'test';
  assert.match(format(await run()), /is not a commit/);
});

test('missing CSP fails the site check (and a gated page still needs it)', async () => {
  prod.o.csp = false;
  const r = await run();
  assert.ok(failing(r).includes('site'));
  assert.match(format(r), /site .*no Content-Security-Policy/);
  prod.o.gate = true;
  const G = { allowGate: true, gateMarker: 'data-pilot-gate' };
  assert.ok(failing(await run(G)).includes('site'));
  prod.o.csp = true;
  const g = await run(G);
  assert.equal(g.ok, true, format(g));
  assert.ok(g.checks.find((c) => c.name === 'site').gated);
  assert.match(format(g), /^OK \(pilot gate on: version, config, code NOT checked\)$/m);
  // without --allow-gate the gate page is not the app; --allow-gate without a marker is refused
  assert.ok(failing(await run()).includes('site'));
  assert.match(format(await run({ allowGate: true })), /needs --gate-marker/);
  assert.match(format(await run({ allowGate: true, gateMarker: 'html' })), /needs --gate-marker/);
  // a broken site that is not the gate (no marker) is not excused by --allow-gate
  prod.o.gate = false; prod.o.rootBody = '<!doctype html><h1>Something went wrong</h1>';
  const broken = await run(G);
  assert.ok(failing(broken).includes('site'), format(broken));
  assert.match(format(broken), /not the app, and not the pilot gate/);
});

test('the sign-in config must be the Sydney project, a publishable key, never a secret', async () => {
  prod.o.config = { ...prod.o.config, url: 'https://abcdefghijklmnopqrst.supabase.co' };
  assert.match(format(await run()), /config: sign-in points at https:\/\/abcdefghijklmnopqrst\.supabase\.co.*project ref abcdefghijklmnopqrst is not igbxbfuaoybfzsroxuln/);
  prod.reset();
  prod.o.config = { enabled: false };
  assert.match(format(await run()), /sign-in is off in production/);
  prod.reset();
  prod.o.configRaw = 'export default Object.freeze({"enabled":true,"url":"https://igbxbfuaoybfzsroxuln.supabase.co","key":"sb_secret_abcdefghijklmnop"});';
  assert.match(format(await run()), /holds a SECRET/);
});

test('Worker down, misconfigured or on the mock provider', async () => {
  prod.o.workerDown = true;
  let r = await run();
  assert.deepEqual(failing(r), ['worker']);
  prod.reset();
  prod.o.health = { ok: true, service: 'another-angle', prompt_version: 'p', schema_version: 'scene-v1', provider: 'anthropic', entitlement_mode: 'testing', invite_required: false, configured: { signing_key: true, provider_key: false } };
  assert.match(format(await run()), /ANTHROPIC_API_KEY missing/);
  prod.o.health = { ...prod.o.health, provider: 'mock', configured: { signing_key: true, provider_key: true } };
  assert.match(format(await run()), /MOCK provider/);
  prod.o.health = { ok: false };
  r = await run();
  assert.deepEqual(failing(r), ['worker']);
});

test('slow answers fail with the time, and a hang times out', async () => {
  prod.o.delay = 1700;
  prod.o.delayPath = '/';
  const r = await run();
  assert.deepEqual(failing(r), ['site']);
  assert.match(format(r), /slow: \d{4} ms \(limit 1500 ms\)/);
  prod.o.delay = 3500;
  prod.o.delayPath = '/version.json';
  assert.match(format(await run()), /version: no answer in 3000 ms/);
});

test('a blip is retried once and shown as recovered; a real failure survives the retry', async () => {
  prod.o.failTimes = 1;
  const r = await runMonitor({ ...urls, maxMs: 1500, timeoutMs: 3000, retryMs: 50 });
  assert.equal(r.ok, true);
  assert.equal(r.retried, true);
  assert.match(format(r), /RECOVERED version/);
  prod.reset();
  prod.o.workerDown = true;
  const bad = await runMonitor({ ...urls, maxMs: 1500, timeoutMs: 3000, retryMs: 50 });
  assert.equal(bad.ok, false);
  assert.match(format(bad), /^FAIL: worker: /m);
});

test('weakened headers fail: a broad CSP, a cached callback, a leaky referrer, a cached sign-in config', async () => {
  prod.o.override = { '/': { 'Content-Security-Policy': "default-src 'self'; script-src * 'unsafe-inline' data:; frame-ancestors *" } };
  let r = await run();
  assert.deepEqual(failing(r), ['site']);
  assert.match(format(r), /CSP script-src/);
  prod.o.override = { '/auth/callback/': { 'Cache-Control': 'public, max-age=31536000, no-store-not' } };
  assert.match(format(await run()), /callback: .*cache-control/);
  prod.o.override = { '/auth/callback/': { 'Referrer-Policy': 'unsafe-url' } };
  assert.match(format(await run()), /callback: .*referrer-policy/);
  prod.o.override = { '/': { 'X-Frame-Options': 'SAMEORIGIN' } };
  assert.match(format(await run()), /site: .*x-frame-options/);
  prod.o.override = { '/': { 'Cross-Origin-Opener-Policy': null } };
  assert.match(format(await run()), /no cross-origin-opener-policy/);
  prod.o.override = { [`/v/${VER}/src/auth/public-config.js`]: { 'Cache-Control': 'public, max-age=31536000, immutable' } };
  assert.match(format(await run()), /public-config\.js is cached/);
  // a repeated directive: browsers obey the FIRST one, so a weak one in front must not hide behind the built one
  const built = headersFor(rulesFor(VER), '/').get('content-security-policy').value;
  prod.o.override = { '/': { 'Content-Security-Policy': built.replace("script-src 'self'", "script-src * 'unsafe-inline' 'unsafe-eval'; script-src 'self'") } };
  assert.match(format(await run()), /CSP repeats script-src/);
  prod.o.override = { '/': { 'Content-Security-Policy': `frame-ancestors *; ${built}` } };
  assert.match(format(await run()), /CSP repeats frame-ancestors/);
  const cbBuilt = headersFor(rulesFor(VER), '/auth/callback/').get('content-security-policy').value;
  prod.o.override = { '/auth/callback/': { 'Content-Security-Policy': cbBuilt.replace(/, default-src 'self'; script-src 'self';/, ", default-src 'self'; script-src *; connect-src *; script-src 'self';") } };
  assert.match(format(await run()), /callback: .*CSP repeats script-src/);
  prod.o.override = { '/': { 'Content-Security-Policy': built.replace("script-src 'self'", "script-src 'self' 'sha256-EXTRA1=' 'sha256-EXTRA2='") } };
  assert.match(format(await run()), /more inline-code hash/);
  prod.o.override = { '/version.json': { 'Cache-Control': 'public, max-age=31536000, immutable' } };
  assert.match(format(await run()), /version: .*cache-control/);
  // only the inline-code hashes may differ from this checkout's build
  prod.o.override = { '/': { 'Content-Security-Policy': headersFor(rulesFor(VER), '/').get('content-security-policy').value.replace(/'sha256-[^']+'/g, "'sha256-AAAA'") } };
  assert.equal((await run()).ok, true);
});
