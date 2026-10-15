// Local rehearsal of ops/access.mjs: the real HTTP app (mock provider) behind
// a stand-in for the Cloudflare secrets API, so every step and every check of
// the access change runs before it touches a live Worker. Nothing leaves this
// machine.
//
//   node ops/rehearse.mjs            → the access script must pass every check
//   node ops/rehearse.mjs --broken   → the Worker ignores new invite codes; the
//                                      script must fail and switch the model off

import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createApp } from '../src/app.js';
import { memoryLedgerNamespace } from '../src/limits/ledger.js';
import { PROMPT_VERSION } from '../src/prompt.js';

const broken = process.argv.includes('--broken');
const SYSTEM_PROMPT = readFileSync(new URL(`../prompts/${PROMPT_VERSION}.md`, import.meta.url), 'utf8');
const open = { limit: async () => ({ success: true }) };
const secrets = { ANTHROPIC_API_KEY: 'sk-rehearsal-not-a-key', TOKEN_SIGNING_KEY: 'rehearsal-old-signing-key-0123456789abcdef', TOKEN_SIGNING_KEY_PREVIOUS: 'rehearsal-older-signing-key-0123456789abcd', IP_HASH_KEY: 'rehearsal-ip-key-0123' };
const vars = { PROVIDER: 'mock', ALLOWED_ORIGINS: 'http://localhost:8000', ALLOW_NO_ORIGIN: 'false', REQUIRE_HTTPS: 'false', ENTITLEMENT_MODE: 'testing', DAILY_SPEND_CAP_USD: '10' };
const ledger = memoryLedgerNamespace();
const app = createApp({ systemPrompt: SYSTEM_PROMPT, log: () => {} });
const envNow = () => {
  const s = { ...secrets };
  if (broken) delete s.TESTER_INVITE_CODES;
  // the mock provider stands in for the model; "no key" must read as the model switched off
  return { ...vars, ...s, PROVIDER: s.ANTHROPIC_API_KEY ? 'anthropic-mock' : 'mock', LEDGER: ledger, SESSION_IP_LIMITER: open, ANGLE_IP_LIMITER: open, FEEDBACK_IP_LIMITER: open };
};

async function toRequest(req, base) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  return new Request(new URL(req.url, base), { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : body });
}
async function send(res, r) {
  res.writeHead(r.status, Object.fromEntries(r.headers));
  res.end(Buffer.from(await r.arrayBuffer()));
}

const worker = createServer(async (req, res) => {
  const request = await toRequest(req, 'http://localhost:8961');
  const e = envNow();
  // health must report the provider key as the real Worker would
  if (new URL(request.url).pathname === '/v1/health') {
    const r = await app.fetch(request, { ...e, PROVIDER: 'mock' });
    const data = await r.json();
    data.provider = e.ANTHROPIC_API_KEY ? 'anthropic' : 'mock';
    data.configured = { ...data.configured, provider_key: !!e.ANTHROPIC_API_KEY };
    return send(res, new Response(JSON.stringify(data), { status: r.status, headers: r.headers }));
  }
  return send(res, await app.fetch(request, { ...e, PROVIDER: 'mock' }));
});
const calls = [];
const cfApi = createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : null;
  calls.push(`${req.method} ${req.url.replace(/\/accounts\/[^/]+/, '/accounts/…')}`);
  if (req.headers.authorization !== 'Bearer rehearsal-cf-token') { res.writeHead(403); return res.end(JSON.stringify({ success: false })); }
  const m = /^\/accounts\/acct\/workers\/scripts\/([^/]+)\/secrets(?:\/(.+))?$/.exec(req.url);
  if (!m || m[1] !== 'hushmallow-another-angle-rehearsal') { res.writeHead(404); return res.end(JSON.stringify({ success: false })); }
  if (req.method === 'GET') { res.writeHead(200); return res.end(JSON.stringify({ success: true, result: Object.keys(secrets).map((name) => ({ name, type: 'secret_text' })) })); }
  if (req.method === 'PUT') { secrets[body.name] = body.text; res.writeHead(200); return res.end(JSON.stringify({ success: true })); }
  if (req.method === 'DELETE') { delete secrets[decodeURIComponent(m[2])]; res.writeHead(200); return res.end(JSON.stringify({ success: true })); }
  res.writeHead(405); res.end('{}');
});

await new Promise((r) => worker.listen(8961, '127.0.0.1', r));
await new Promise((r) => cfApi.listen(8962, '127.0.0.1', r));
const child = spawn(process.execPath, [new URL('./access.mjs', import.meta.url).pathname], {
  env: {
    ...process.env, GITHUB_ACTIONS: '', GITHUB_STEP_SUMMARY: '', CF_TOKEN: 'rehearsal-cf-token', CF_ACCOUNT: 'acct', CF_API: 'http://127.0.0.1:8962', SLEEP_SCALE: '0.002',
    ACCESS_WORKERS: JSON.stringify([{ label: 'rehearsal', script: 'hushmallow-another-angle-rehearsal', url: 'http://localhost:8961', origin: 'http://localhost:8000', modelCall: true }]),
  },
  stdio: ['ignore', 'pipe', 'inherit'],
});
let log = '';
child.stdout.on('data', (d) => { log += d; process.stdout.write(d); });
const code = await new Promise((r) => child.on('close', r));
worker.close(); cfApi.close();

const sealed = /SEALED_CODES (\S+)/.exec(log)?.[1];
const problems = [];
if (broken) {
  if (code === 0) problems.push('the access script passed against a Worker that ignores invite codes');
  if ('ANTHROPIC_API_KEY' in secrets) problems.push('the model was not switched off after a failed check');
} else {
  if (code !== 0) problems.push(`the access script exited ${code}`);
  if (!secrets.TESTER_INVITE_CODES || secrets.TESTER_INVITE_CODES.split(',').length !== 10) problems.push('TESTER_INVITE_CODES was not set to 10 codes');
  if (secrets.TOKEN_SIGNING_KEY === 'rehearsal-old-signing-key-0123456789abcdef') problems.push('TOKEN_SIGNING_KEY was not replaced');
  if ('TOKEN_SIGNING_KEY_PREVIOUS' in secrets) problems.push('TOKEN_SIGNING_KEY_PREVIOUS was not deleted');
  if (!('ANTHROPIC_API_KEY' in secrets)) problems.push('the model was switched off although every check passed');
  for (const c of secrets.TESTER_INVITE_CODES?.split(',') || []) if (log.includes(c)) problems.push('an invite code appears in the log');
  if (log.includes(secrets.TOKEN_SIGNING_KEY)) problems.push('the signing key appears in the log');
}
if (!sealed) problems.push('no sealed codes in the output');
console.log(`\nCloudflare API calls: ${calls.join(' | ')}`);
console.log(problems.length ? `REHEARSAL FAILED:\n- ${problems.join('\n- ')}` : `REHEARSAL PASSED (${broken ? 'broken Worker: failed safe' : 'every check passed'})`);
process.exit(problems.length ? 1 : 0);
