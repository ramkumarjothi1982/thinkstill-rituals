// The web-subscription checks any deploy of the Worker can be given without a Stripe key, a webhook secret or an
// account (docs/STAGING.md "Key-free checks"). scripts/e2e.mjs runs them after every deploy, staging and production;
// scripts/billing-e2e.mjs runs them as its phase P1. They send nothing that could change a subscription: a webhook
// without a valid signature, and a checkout without a usable token.
//
//   keyFreeChecks({ call, check, info, health, stage, … })   the checks, through the caller's call() and check()
//   expectedFlags(stage)  /v1/health's billing flags as the committed wrangler.toml table of that stage gives them
//   stageOf(url)          'staging' for the staging Worker's address, else 'production'
//
// The flags are read from the same wrangler.toml the deploy used, so the activation commit (BILLING_LIVE = "approved",
// docs/PAYMENTS.md) changes what is expected with it and needs no change here.

import { readFileSync } from 'node:fs';
import { readConfig, STRIPE_API_VERSION_EXPECTED } from '../src/config.js';
import { PATHS } from '../src/billing/routes.js';

/** An origin no Worker allows (the .invalid domain never resolves): the CORS check must refuse it. */
export const REFUSED_ORIGIN = 'https://e2e-refused.hushmallow.invalid';

/**
 * @typedef {{ status: number, json: any, headers: Headers }} Answer
 * @typedef {(path: string, o?: { method?: string, body?: unknown, raw?: string, token?: string, origin?: string, headers?: Record<string, string> }) => Promise<Answer>} Call
 * @typedef {(ok: boolean, what: string, extra?: string) => boolean} Check
 * @typedef {{ live_approved: boolean, api_version: string | null, automatic_tax: boolean }} Flags
 */

/** wrangler.toml's three [vars] tables (production, dev, staging) as { NAME: value }; comments left out. @param {string} toml */
export function varsTables(toml) {
  /** @type {Record<string, string>} */
  const names = { vars: 'production', 'env.dev.vars': 'dev', 'env.staging.vars': 'staging' };
  /** @type {Record<string, Record<string, string>>} */
  const out = {};
  /** @type {string | null} */
  let cur = null;
  for (const line of toml.split('\n')) {
    const head = /^\s*\[\[?([^\]]+)\]\]?\s*(?:#.*)?$/.exec(line);
    if (head) { cur = names[head[1].trim()] || null; if (cur) out[cur] = {}; continue; }
    const kv = /^\s*([A-Z][A-Z0-9_]*)\s*=\s*"([^"]*)"\s*(?:#.*)?$/.exec(line);
    if (cur && kv) out[cur][kv[1]] = kv[2];
  }
  return out;
}

/** The committed wrangler.toml. */
export const readWrangler = () => readFileSync(new URL('../wrangler.toml', import.meta.url), 'utf8');

/** The staging Worker is the one whose name ends in -staging (wrangler.toml [env.staging]). @param {string} url */
export const stageOf = (url) => (/-staging\./.test(new URL(url).hostname) ? 'staging' : 'production');

/**
 * What /v1/health's billing flags must say on this stage: the committed table read as the Worker reads it (no secret
 * is needed for these three).
 * @param {'staging' | 'production'} stage @param {string} [toml] @returns {Flags}
 */
export function expectedFlags(stage, toml = readWrangler()) {
  const b = readConfig(varsTables(toml)[stage] || {}).billing;
  return { live_approved: b.liveApproved, api_version: b.apiVersion || null, automatic_tax: b.automaticTax };
}

/** A Supabase-shaped access token of another sign-in project (a made-up account, never signed by it). @param {string} project @param {number} nowMs */
export function foreignToken(project, nowMs) {
  /** @param {object} o */
  const part = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const sig = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url');
  return `${part({ alg: 'HS256', typ: 'JWT' })}.${part({ sub: crypto.randomUUID(), exp: Math.floor(nowMs / 1000) + 600, iss: `${project}/auth/v1`, role: 'authenticated', aud: 'authenticated' })}.${sig}`;
}

/** Why billing is off, from /v1/health alone (never a value). @param {any} b */
function offWhy(b) {
  if (b?.accounts_configured === false) return 'its sign-in project is still a placeholder';
  if (b?.placeholder_prices) return 'its price ids are still placeholders';
  if (b?.key_refused) return `its Stripe key is refused (${b.key_refused})`;
  if (!b?.stripe_mode) return 'no Stripe key';
  return 'not configured';
}

/**
 * @param {{ call: Call, check: Check, info?: (what: string) => void, health: any, stage: 'staging' | 'production',
 *   expected?: Flags, refusedOrigin?: string, foreignProject?: string, now?: () => number }} o
 *   health: the Worker's /v1/health body; foreignProject: a sign-in project this Worker must never accept (staging:
 *   hushmallow1), whose token is then sent to checkout once billing is on
 */
export async function keyFreeChecks({ call, check, info = () => {}, health, stage, expected = expectedFlags(stage), refusedOrigin = REFUSED_ORIGIN, foreignProject = '', now = Date.now }) {
  const b = health?.billing;
  const flags = !!b && typeof b === 'object' && ['configured', 'webhook', 'stripe_mode', 'live_approved', 'api_version', 'automatic_tax'].every((k) => k in b);
  check(flags, 'billing: /v1/health has the billing flags', flags ? JSON.stringify({ configured: b.configured, webhook: b.webhook, stripe_mode: b.stripe_mode, live_approved: b.live_approved, api_version: b.api_version, automatic_tax: b.automatic_tax }) : '');
  const on = flags && b.configured === true;
  if (flags) {
    const table = stage === 'staging' ? '[env.staging.vars]' : '[vars]';
    check(!b.key_refused, 'billing: no Stripe key refused for this stage', b.key_refused ? `key_refused ${b.key_refused}` : '');
    check(b.live_approved === expected.live_approved, `billing: live_approved ${expected.live_approved}, as wrangler.toml ${table} says`, String(b.live_approved));
    // staging takes test keys only; production a live key only, and only once approved (src/config.js)
    const modes = stage === 'staging' ? ['test', null] : expected.live_approved ? ['live', null] : [null];
    check(modes.includes(b.stripe_mode), `billing: stripe_mode ${modes.map(String).join(' or ')}`, String(b.stripe_mode));
    check(b.api_version === expected.api_version, `billing: api_version ${expected.api_version}, as wrangler.toml ${table} says`, String(b.api_version));
    if (on) check(b.api_version === STRIPE_API_VERSION_EXPECTED, `billing: on, so pinned to ${STRIPE_API_VERSION_EXPECTED}`);
    check(b.automatic_tax === expected.automatic_tax, `billing: automatic_tax ${expected.automatic_tax}, as wrangler.toml ${table} says`, String(b.automatic_tax));
    if (!on) info(`billing is off on this Worker (${offWhy(b)}): the off answers are expected below`);
  }

  // the webhook: POST only, and nothing without Stripe's signature (or, with no signing secret, nothing at all)
  const hook = PATHS.webhook;
  const get = await call(hook, { method: 'GET' });
  check(get.status === 405 && /POST/.test(get.headers.get('allow') || ''), 'webhook: GET is refused (405)', String(get.status));
  const raw = JSON.stringify({ id: 'evt_KeyFreeCheck1', object: 'event', type: 'customer.subscription.updated', livemode: false, created: Math.floor(now() / 1000), data: { object: {} } });
  const t = Math.floor(now() / 1000);
  const hex = () => Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex');
  const want = flags && b.webhook === true ? [400, 'bad_signature'] : [503, 'billing_not_configured'];
  for (const [what, sig] of /** @type {[string, string | null][]} */ ([['no signature', null], ['a bad signature', `t=${t},v1=${hex()}`], ['a stale signature', `t=${t - 3600},v1=${hex()}`]])) {
    const r = await call(hook, { method: 'POST', raw, headers: { 'content-type': 'application/json; charset=utf-8', ...(sig ? { 'stripe-signature': sig } : {}) } });
    check(r.status === want[0] && r.json?.error?.code === want[1], `webhook: ${what} → ${want[0]} ${want[1]}`, `${r.status} ${r.json?.error?.code || ''}`);
  }

  // checkout: an allowed origin with no token; then an origin that is not allowed; then another project's token
  const body = { plan: 'ultra', period: 'monthly' };
  const anon = await call(PATHS.checkout, { method: 'POST', body });
  if (on) {
    check(anon.status === 401 && anon.json?.error?.code === 'account_required' && /Bearer realm="billing"/.test(anon.headers.get('www-authenticate') || ''), 'checkout: no token → 401 account_required', `${anon.status} ${anon.json?.error?.code || ''}`);
  } else {
    check(anon.status === 503 && ['billing_not_configured', 'accounts_not_configured'].includes(anon.json?.error?.code), 'checkout: billing off → 503', `${anon.status} ${anon.json?.error?.code || ''}`);
  }
  const away = await call(PATHS.checkout, { method: 'POST', body, origin: refusedOrigin });
  check(away.status === 403 && away.json?.error?.code === 'origin_not_allowed', `checkout: Origin ${new URL(refusedOrigin).host} → 403`, `${away.status} ${away.json?.error?.code || ''}`);
  if (on && foreignProject) {
    const other = await call(PATHS.checkout, { method: 'POST', body, token: foreignToken(foreignProject, now()) });
    check(other.status === 401 && other.json?.error?.code === 'account_required', `checkout: a token of ${new URL(foreignProject).host.split('.')[0]} → 401`, `${other.status} ${other.json?.error?.code || ''}`);
  }
  return { on };
}
