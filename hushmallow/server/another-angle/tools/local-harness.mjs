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
//
// Web subscriptions rehearsal (docs/PAYMENTS.md "Test-mode rehearsal"): with
// a Stripe TEST key and the other billing values in the environment
// (STRIPE_SECRET_KEY=rk_test_… or sk_test_…, STRIPE_WEBHOOK_SECRET from
// `stripe listen`, STRIPE_PRICE_*, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY,
// APP_ORIGIN, ENTITLEMENT_MODE=billing, ACCOUNTS_STAGE=staging) --serve also
// answers /v1/billing/*, keeping the subscriptions in memory until it stops.
// It bills as the staging Worker does: test keys only, so only on the
// hushmallow-staging sign-in project (ACCOUNTS_STAGE=staging, once
// STAGING_SUPABASE_PROJECT_URL is filled in src/config.js), and a rehearsal
// never lands on a hushmallow1 account. A live key is refused, and
// BILLING_LIVE is never forwarded. The Stripe API version is pinned as on
// the Workers unless STRIPE_API_VERSION says otherwise.

import { createServer } from 'node:http';
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createApp } from '../src/app.js';
import { STRIPE_API_VERSION_EXPECTED } from '../src/config.js';
import { memoryLedgerNamespace } from '../src/limits/ledger.js';
import { memoryBillingNamespace } from '../src/billing/store.js';
import { PROMPT_VERSION } from '../src/prompt.js';

/** The billing values taken from the environment, only when given (never BILLING_LIVE: the harness is never live). */
export const BILLING_VARS = Object.freeze(['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_PRICE_PAID_MONTHLY', 'STRIPE_PRICE_PAID_YEARLY', 'STRIPE_PRICE_ULTRA_MONTHLY',
  'STRIPE_PRICE_ULTRA_YEARLY', 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'APP_ORIGIN', 'ENTITLEMENT_MODE', 'TESTER_INVITE_CODES',
  'ACCOUNTS_STAGE', 'STRIPE_API_VERSION', 'STRIPE_AUTOMATIC_TAX']);

/**
 * The env the harness runs the app with, from the process environment.
 * @param {Record<string, string | undefined>} [source]
 * @returns {{ env: Record<string, any>, error?: undefined } | { error: string, env?: undefined }}
 */
export function harnessEnv(source = process.env) {
  if (/^(?:sk|rk)_live_/.test(source.STRIPE_SECRET_KEY || '')) return { error: 'The harness only takes Stripe test keys (rk_test_… or sk_test_…).' };
  /** @type {Record<string, any>} */
  const env = {
    PROVIDER: source.PROVIDER === 'anthropic' ? 'anthropic' : 'mock',
    ANTHROPIC_API_KEY: source.ANTHROPIC_API_KEY || '',
    MODEL: source.MODEL || 'claude-opus-5-5',
    EFFORT: source.EFFORT || 'low',
    TOKEN_SIGNING_KEY: source.TOKEN_SIGNING_KEY || 'local-harness-signing-key-0123456789abcdef',
    IP_HASH_KEY: source.IP_HASH_KEY || 'local-harness-ip-key-0123',
    ALLOWED_ORIGINS: source.ALLOWED_ORIGINS || 'http://localhost:8000,http://127.0.0.1:8000',
    ALLOW_NO_ORIGIN: 'true',
    REQUIRE_HTTPS: 'false',
    DEVICE_DAILY_LIMIT: '100',
    SESSIONS_PER_IP_DAILY: '100',
    DAILY_SPEND_CAP_USD: source.DAILY_SPEND_CAP_USD || '1',
    LEDGER: memoryLedgerNamespace(),
  };
  for (const k of BILLING_VARS) if (source[k]) env[k] = source[k];
  if (source.STRIPE_SECRET_KEY) {
    env.BILLING = memoryBillingNamespace();
    env.STRIPE_API_VERSION ||= STRIPE_API_VERSION_EXPECTED;
  }
  return { env };
}

async function main() {
  const made = harnessEnv();
  if (made.error !== undefined) { console.error(made.error); process.exit(1); }
  const env = made.env;
  if (env.STRIPE_SECRET_KEY && env.ACCOUNTS_STAGE !== 'staging') {
    console.error('Billing stays off: the harness bills on the hushmallow-staging project only (ACCOUNTS_STAGE=staging); a test key is never taken for hushmallow1.');
  }
  const SYSTEM_PROMPT = readFileSync(new URL(`../prompts/${PROMPT_VERSION}.md`, import.meta.url), 'utf8');
  const args = process.argv.slice(2);
  const serveAt = args.indexOf('--serve');
  const port = serveAt >= 0 ? Number(args[serveAt + 1] || 8790) : 0;
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
}

// run as a command (npm run harness); imported (the tests), it only offers harnessEnv
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
