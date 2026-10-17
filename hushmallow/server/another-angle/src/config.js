// Environment → validated configuration. Vars live in wrangler.toml [vars];
// secrets (ANTHROPIC_API_KEY, TOKEN_SIGNING_KEY, …) are set with
// `wrangler secret put` or the deploy workflow and never committed.

const DEFAULT_ORIGINS = 'https://ramkumarjothi1982.github.io';
const APPLE_ROOT_CA_G3_SHA256 = '63343ABFB89A6A03EBB57E9B3F5FA7BE7C4F5C756F3017B3A8C488C3653E9179';
/** hushmallow1 (Sydney): production's sign-in project, the one whose accounts can subscribe (hushmallow/src/auth/config.js PROJECT_URL). */
const SUPABASE_PROJECT_URL = 'https://igbxbfuaoybfzsroxuln.supabase.co';
/**
 * hushmallow-staging (Sydney): the STAGING Worker's own sign-in project (ACCOUNTS_STAGE = "staging" in
 * wrangler.toml [env.staging]; hushmallow/src/auth/config.js STAGING_PROJECT_REF, docs/STAGING.md), so the
 * staging Worker never accepts a production account and production never a staging one.
 * PLACEHOLDER: '' means "no staging project yet": the staging Worker's accounts are not configured.
 * Once the owner has created it, its Project URL goes here and into [env.staging.vars] SUPABASE_URL, together.
 */
const STAGING_SUPABASE_PROJECT_URL = '';
/**
 * Placeholder sign-in values, such as SUPABASE_URL "https://STAGING_TODO.supabase.co" and SUPABASE_PUBLISHABLE_KEY
 * "sb_publishable_TODO" (wrangler.toml [env.staging], until the owner creates the staging project). They count as
 * unset and say "accounts not configured": the sign-in project is never asked. Upper-case TODO only (a real project
 * ref is lower case), and the key only right after its prefix.
 */
const ACCOUNTS_URL_PLACEHOLDER = /TODO/;
const ACCOUNTS_KEY_PLACEHOLDER = /^sb_publishable_TODO(?:_|$)/;
/** ENTITLEMENT_MODE values; anything else reads as 'testing', as before. */
const MODES = ['testing', 'storekit', 'both', 'billing', 'billing+testing'];
/**
 * An obviously unset Stripe price id: a placeholder such as "price_TODO_owner" (wrangler.toml [env.staging],
 * docs/STAGING.md, until the owner pastes the real test ids). It counts as unset, like an empty value, so it is
 * never sent to Stripe; with no real price at all, billing is "not configured" and says why.
 */
const PRICE_PLACEHOLDER = /^price_todo/i;
const PRICE_VARS = ['STRIPE_PRICE_PAID_MONTHLY', 'STRIPE_PRICE_PAID_YEARLY', 'STRIPE_PRICE_ULTRA_MONTHLY', 'STRIPE_PRICE_ULTRA_YEARLY'];
/**
 * The owner's approval of live billing (decision D17): a reviewed commit that sets BILLING_LIVE = "approved" in
 * production's [vars]. Until then the production Worker refuses a live key, so no real card can be charged, whatever
 * secrets are set. Read on the production stage only; test/billing-env.test.js keeps it out of [env.staging.vars] and
 * [env.dev.vars]. Only this exact word approves.
 */
const BILLING_LIVE_APPROVED = 'approved';
/**
 * The Stripe API version the Worker pins (STRIPE_API_VERSION) and every webhook endpoint is created on. The code reads
 * both the older and the newer shapes, but one pinned version means the server's reads and the events it receives agree.
 * test/billing-env.test.js wants exactly this in any wrangler.toml table with billing vars: change both together.
 */
const STRIPE_API_VERSION_EXPECTED = '2026-08-26.dahlia';
/**
 * Stripe Tax on Checkout (decision D3; the checkout route reads cfg.billing.automaticTax). Off unless STRIPE_AUTOMATIC_TAX
 * says so: automatic_tax without an active registration (Collecting) calculates and collects nothing, silently, so it is
 * switched on per environment only once that registration is verified. While it is off a price of any tax behaviour
 * sells; with it on only an inclusive or exclusive one (src/billing/routes.js CHECKOUT_PRICE_RULES).
 */
const AUTOMATIC_TAX_DEFAULT = false;
/** A Stripe secret or restricted key, and its mode (a publishable pk_ key is never one). */
const STRIPE_KEY = /^(?:sk|rk)_(live|test)_[A-Za-z0-9]{8,}$/;

/** @param {unknown} v @param {number} dflt @param {number} min @param {number} max */
function int(v, dflt, min, max) {
  const n = Number.parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) && n >= min && n <= max ? n : dflt;
}
/** @param {unknown} v @param {number} dflt @param {number} min @param {number} max */
function num(v, dflt, min, max) {
  const n = Number.parseFloat(String(v ?? ''));
  return Number.isFinite(n) && n >= min && n <= max ? n : dflt;
}
/** @param {unknown} v */
const list = (v) => String(v ?? '').split(',').map((s) => s.trim()).filter(Boolean);
/** @param {unknown} v @param {boolean} dflt */
const bool = (v, dflt) => (v == null || v === '' ? dflt : /^(?:1|true|yes|on)$/i.test(String(v)));
/** @param {unknown} v */
const str = (v) => String(v ?? '').trim();

/**
 * APP_ORIGIN, where Stripe sends people back: an origin only (no path, query or
 * credentials), https (http only for localhost), and one of ALLOWED_ORIGINS. '' otherwise.
 * @param {string} v @param {string[]} allowed
 */
function appOriginOf(v, allowed) {
  /** @type {URL} */
  let u;
  try { u = new URL(v); } catch { return ''; }
  const local = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  if (u.protocol !== 'https:' && !(local && u.protocol === 'http:')) return '';
  if (u.origin !== v.replace(/\/+$/, '')) return '';
  return allowed.includes(u.origin) ? u.origin : '';
}

/**
 * Web subscriptions (src/billing/, docs/PAYMENTS.md). Every value is checked for its
 * shape; one that does not fit counts as unset, and so does a placeholder price id
 * (PRICE_PLACEHOLDER) or sign-in value (ACCOUNTS_*_PLACEHOLDER). `configured` needs the Stripe key,
 * this stage's sign-in project, APP_ORIGIN and at least one real price; the webhook also needs its own
 * secret. No value here is ever logged or returned (placeholderPrices is only a count, accountsPlaceholder
 * only a flag, keyMode and keyRefused only codes).
 *
 * The key must fit the stage. The staging Worker (and any stage but production) takes test keys only, so the
 * public preview never takes real money. Production takes live keys only, so card 4242 never opens a plan there, and
 * only once BILLING_LIVE is "approved". A refused key counts as unset (keyRefused says why).
 * @param {Record<string, any>} env @param {string[]} allowedOrigins
 */
function readBilling(env, allowedOrigins) {
  // the sign-in project of this Worker's stage (ACCOUNTS_STAGE): production's hushmallow1 (the default, as before) or,
  // on the staging Worker, hushmallow-staging; never the other one.
  const accountsStage = str(env.ACCOUNTS_STAGE) || 'production';
  const liveApproved = accountsStage === 'production' && str(env.BILLING_LIVE) === BILLING_LIVE_APPROVED;
  const shaped = STRIPE_KEY.exec(str(env.STRIPE_SECRET_KEY));
  const mode = shaped ? /** @type {'live' | 'test'} */ (shaped[1]) : '';
  /** @type {'' | 'live_key_on_staging' | 'test_key_on_production' | 'live_not_approved'} */
  let keyRefused = '';
  if (mode && accountsStage !== 'production') keyRefused = mode === 'live' ? 'live_key_on_staging' : '';
  else if (mode) keyRefused = mode === 'test' ? 'test_key_on_production' : liveApproved ? '' : 'live_not_approved';
  const secretKey = mode && !keyRefused ? str(env.STRIPE_SECRET_KEY) : '';
  const keyMode = /** @type {'' | 'live' | 'test'} */ (secretKey ? mode : '');
  const webhookSecret = /^whsec_[A-Za-z0-9+/=_-]{8,}$/.test(str(env.STRIPE_WEBHOOK_SECRET)) ? str(env.STRIPE_WEBHOOK_SECRET) : '';
  /** @param {unknown} v */
  const price = (v) => (/^price_[A-Za-z0-9]{4,64}$/.test(str(v)) && !PRICE_PLACEHOLDER.test(str(v)) ? str(v) : '');
  const prices = {
    paid: { monthly: price(env.STRIPE_PRICE_PAID_MONTHLY), yearly: price(env.STRIPE_PRICE_PAID_YEARLY) },
    ultra: { monthly: price(env.STRIPE_PRICE_ULTRA_MONTHLY), yearly: price(env.STRIPE_PRICE_ULTRA_YEARLY) },
  };
  // Only the project's publishable key (a secret key never belongs in a var). A placeholder (or a staging Worker with
  // no staging project yet) is "accounts not configured".
  const project = accountsStage === 'production' ? SUPABASE_PROJECT_URL : accountsStage === 'staging' ? STAGING_SUPABASE_PROJECT_URL : '';
  const accountsPlaceholder = ACCOUNTS_URL_PLACEHOLDER.test(str(env.SUPABASE_URL)) || ACCOUNTS_KEY_PLACEHOLDER.test(str(env.SUPABASE_PUBLISHABLE_KEY))
    || (accountsStage === 'staging' && !STAGING_SUPABASE_PROJECT_URL);
  const supabaseUrl = !accountsPlaceholder && project && str(env.SUPABASE_URL).replace(/\/+$/, '') === project ? project : '';
  const supabaseKey = !accountsPlaceholder && /^sb_publishable_[A-Za-z0-9_-]{16,128}$/.test(str(env.SUPABASE_PUBLISHABLE_KEY)) ? str(env.SUPABASE_PUBLISHABLE_KEY) : '';
  const appOrigin = appOriginOf(str(env.APP_ORIGIN), allowedOrigins);
  const anyPrice = [prices.paid, prices.ultra].some((p) => !!(p.monthly || p.yearly));
  // how many price vars still hold a placeholder (never their values): /v1/health and the 503 say so
  const placeholderPrices = PRICE_VARS.filter((k) => PRICE_PLACEHOLDER.test(str(env[k]))).length;
  return {
    secretKey, webhookSecret, prices, supabaseUrl, supabaseKey, appOrigin, placeholderPrices, accountsStage, accountsPlaceholder,
    // the accepted key's mode ('' when unset or refused), why a key was refused, and the owner's approval
    keyMode, keyRefused, liveApproved,
    // pins the Stripe API version of the server's own requests (the webhook's comes from its endpoint, created on the
    // same one): STRIPE_API_VERSION_EXPECTED wherever billing is set (the wrangler guard), sent only when set
    apiVersion: /^\d{4}-\d{2}-\d{2}(?:\.[a-z]+)?$/.test(str(env.STRIPE_API_VERSION)) ? str(env.STRIPE_API_VERSION) : '',
    tokenTtlMs: int(env.BILLING_TOKEN_TTL_HOURS, 24, 1, 168) * 3600000,
    automaticTax: bool(env.STRIPE_AUTOMATIC_TAX, AUTOMATIC_TAX_DEFAULT),
    configured: !!(secretKey && supabaseUrl && supabaseKey && appOrigin && anyPrice),
  };
}

/**
 * @typedef {ReturnType<typeof readConfig>} Config
 */

/** @param {Record<string, any>} env */
export function readConfig(env) {
  const effort = String(env.EFFORT || 'low');
  const mode = String(env.ENTITLEMENT_MODE || 'testing');
  const signingKey = typeof env.TOKEN_SIGNING_KEY === 'string' && env.TOKEN_SIGNING_KEY.length >= 32 ? env.TOKEN_SIGNING_KEY : '';
  const previousKey = typeof env.TOKEN_SIGNING_KEY_PREVIOUS === 'string' && env.TOKEN_SIGNING_KEY_PREVIOUS.length >= 32 ? env.TOKEN_SIGNING_KEY_PREVIOUS : '';
  const allowedOrigins = list(env.ALLOWED_ORIGINS || DEFAULT_ORIGINS);
  return {
    provider: env.PROVIDER === 'mock' ? 'mock' : 'anthropic',
    apiKey: typeof env.ANTHROPIC_API_KEY === 'string' ? env.ANTHROPIC_API_KEY : '',
    model: String(env.MODEL || 'claude-opus-5-5'),
    effort: /** @type {'low' | 'medium' | 'high' | 'xhigh' | 'max'} */ (['low', 'medium', 'high', 'xhigh', 'max'].includes(effort) ? effort : 'low'),
    maxTokens: int(env.MAX_TOKENS, 3000, 512, 16000),
    attemptTimeoutMs: int(env.MODEL_TIMEOUT_MS, 15000, 2000, 60000),
    deadlineMs: int(env.REQUEST_DEADLINE_MS, 28000, 3000, 90000),
    maxRetries: int(env.MODEL_MAX_RETRIES, 1, 0, 4),
    refusalFallback: String(env.REFUSAL_FALLBACK || 'default') !== 'off',
    allowedOrigins,
    allowNoOrigin: bool(env.ALLOW_NO_ORIGIN, false),
    requireHttps: bool(env.REQUIRE_HTTPS, true),
    entitlementMode: /** @type {'testing' | 'storekit' | 'both' | 'billing' | 'billing+testing'} */ (MODES.includes(mode) ? mode : 'testing'),
    inviteCodes: list(env.TESTER_INVITE_CODES),
    signingKeys: [signingKey, previousKey].filter(Boolean),
    hashKey: typeof env.IP_HASH_KEY === 'string' && env.IP_HASH_KEY.length >= 16 ? env.IP_HASH_KEY : signingKey,
    testingTokenTtlMs: int(env.TESTING_TOKEN_TTL_DAYS, 30, 1, 365) * 86400000,
    storekitTokenTtlMs: int(env.STOREKIT_TOKEN_TTL_HOURS, 24, 1, 168) * 3600000,
    deviceDailyLimit: int(env.DEVICE_DAILY_LIMIT, 20, 1, 1000),
    sessionDailyCap: int(env.SESSION_DAILY_CAP, 500, 1, 1000000),
    sessionsPerIpDaily: int(env.SESSIONS_PER_IP_DAILY, 10, 1, 10000),
    dailySpendCapMicros: Math.round(num(env.DAILY_SPEND_CAP_USD, 10, 0, 100000) * 1e6),
    promptTokenEstimate: int(env.PROMPT_TOKEN_ESTIMATE, 4800, 500, 50000),
    apple: {
      bundleId: String(env.APPLE_BUNDLE_ID || ''),
      productIds: list(env.APPLE_PRODUCT_IDS || 'hushmallow.ultra.monthly,hushmallow.ultra.yearly'),
      environments: list(env.APPLE_ENVIRONMENTS || 'Production'),
      rootFingerprints: list(env.APPLE_ROOT_FINGERPRINTS || APPLE_ROOT_CA_G3_SHA256).map((f) => f.replace(/[^0-9a-f]/gi, '').toUpperCase()),
    },
    billing: readBilling(env, allowedOrigins),
  };
}

export { APPLE_ROOT_CA_G3_SHA256, SUPABASE_PROJECT_URL, STAGING_SUPABASE_PROJECT_URL, BILLING_LIVE_APPROVED, STRIPE_API_VERSION_EXPECTED };
