// Local harness: the real HTTP app on Node, with the mock provider by default.
//
//   npm run harness -- "My boss embarrassed me in front of everyone."
//       one-shot: issues a session token, sends the text, prints the response
//   npm run harness -- --serve 8790
//       serves http://localhost:8790/v1/{health,session,angle} for the app
//       (ALLOWED_ORIGINS includes http://localhost:8000)
//
// PROVIDER=anthropic with ANTHROPIC_API_KEY set uses the real model instead
// (costs money; see README). Nothing here is deployed.

import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { createApp } from '../src/app.js';
import { memoryLedgerNamespace } from '../src/limits/ledger.js';

const SYSTEM_PROMPT = readFileSync(new URL('../prompts/angle-v1.md', import.meta.url), 'utf8');
const args = process.argv.slice(2);
const serveAt = args.indexOf('--serve');
const port = serveAt >= 0 ? Number(args[serveAt + 1] || 8790) : 0;

const env = {
  PROVIDER: process.env.PROVIDER === 'anthropic' ? 'anthropic' : 'mock',
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
  MODEL: process.env.MODEL || 'claude-opus-5-5',
  EFFORT: process.env.EFFORT || 'low',
  TOKEN_SIGNING_KEY: process.env.TOKEN_SIGNING_KEY || 'local-harness-signing-key-0123456789abcdef',
  IP_HASH_KEY: process.env.IP_HASH_KEY || 'local-harness-ip-key-0123',
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || 'http://localhost:8000,http://127.0.0.1:8000',
  ALLOW_NO_ORIGIN: 'true',
  REQUIRE_HTTPS: 'false',
  DEVICE_DAILY_LIMIT: '100',
  SESSIONS_PER_IP_DAILY: '100',
  DAILY_SPEND_CAP_USD: process.env.DAILY_SPEND_CAP_USD || '1',
  LEDGER: memoryLedgerNamespace(),
};

const app = createApp({ systemPrompt: SYSTEM_PROMPT, log: (line) => process.stderr.write(`${line}\n`) });

if (port) {
  createServer(async (req, res) => {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = Buffer.concat(chunks);
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
    const request = new Request(`http://localhost:${port}${req.url}`, { method: req.method, headers, body: ['GET', 'HEAD', 'OPTIONS'].includes(req.method || '') ? undefined : body });
    const response = await app.fetch(request, env);
    res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
    res.end(Buffer.from(await response.arrayBuffer()));
  }).listen(port, '127.0.0.1', () => console.log(`Another Angle (${env.PROVIDER}) on http://localhost:${port}/v1/health`));
} else {
  const text = args.filter((a) => !a.startsWith('--')).join(' ') || 'My boss embarrassed me in front of everyone.';
  const base = 'http://localhost:8790';
  const session = await (await app.fetch(new Request(`${base}/v1/session`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }), env)).json();
  const res = await app.fetch(new Request(`${base}/v1/angle`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${session.token}` },
    body: JSON.stringify({ consent: true, text, locale: 'en-GB' }),
  }), env);
  console.log(JSON.stringify(await res.json(), null, 2));
}
