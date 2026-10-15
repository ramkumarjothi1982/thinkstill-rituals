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
import { ANGLE_ENDPOINT } from '../src/app/config.js';

const VER = 'a'.repeat(40);
const SUPA = new URL(PROJECT_URL).origin;
const RULES = parseHeadersFile(headersFile(SUPA));

/** A fake production. `o` is changed by each test (reset per test). */
function fakeProd() {
  const o = {};
  const reset = () => Object.assign(o, { ver: VER, page: VER, csp: true, config: { enabled: true, url: PROJECT_URL, key: 'sb_publishable_live_looking_0000000', mode: 'production' }, configRaw: null, workerDown: false, health: null, delay: 0, delayPath: null, gate: false, failTimes: 0, seenCredentials: false });
  reset();
  let fails = 0;
  const site = http.createServer(async (req, res) => {
    if (req.headers.cookie || req.headers.authorization) o.seenCredentials = true;
    const path = new URL(req.url, 'http://x').pathname;
    if (o.delay && (!o.delayPath || o.delayPath === path)) await new Promise((r) => setTimeout(r, o.delay));
    const hs = Object.fromEntries([...headersFor(RULES, path).values()].filter(({ name }) => o.csp || name.toLowerCase() !== 'content-security-policy').map(({ name, value }) => [name, value]));
    if (o.failTimes && path === '/version.json' && fails < o.failTimes) { fails++; res.writeHead(502, hs); res.end('bad gateway'); return; }
    if (o.gate && !path.startsWith('/auth/')) { res.writeHead(200, { ...hs, 'content-type': 'text/html' }); res.end('<!doctype html><title>pilot</title><form method="post"><input name="code"></form>'); return; }
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
const CSP_WORKER = new URL(ANGLE_ENDPOINT).origin;
const run = (extra = {}) => runOnce({ ...urls, cspWorkerOrigin: CSP_WORKER, maxMs: 1500, timeoutMs: 3000, ...extra });
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
  assert.match(format(r), /no Content-Security-Policy header/);
  prod.o.gate = true;
  assert.ok(failing(await run({ allowGate: true })).includes('site'));
  prod.o.csp = true;
  const g = await run({ allowGate: true });
  assert.equal(g.ok, true, format(g));
  assert.ok(g.checks.find((c) => c.name === 'site').gated);
  // without --allow-gate the gate page is not the app
  assert.ok(failing(await run()).includes('site'));
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
  const r = await runMonitor({ ...urls, cspWorkerOrigin: CSP_WORKER, maxMs: 1500, timeoutMs: 3000, retryMs: 50 });
  assert.equal(r.ok, true);
  assert.equal(r.retried, true);
  assert.match(format(r), /RECOVERED version/);
  prod.reset();
  prod.o.workerDown = true;
  const bad = await runMonitor({ ...urls, cspWorkerOrigin: CSP_WORKER, maxMs: 1500, timeoutMs: 3000, retryMs: 50 });
  assert.equal(bad.ok, false);
  assert.match(format(bad), /^FAIL: worker: /m);
});
