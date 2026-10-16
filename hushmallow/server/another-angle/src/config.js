// Environment → validated configuration. Vars live in wrangler.toml [vars];
// secrets (ANTHROPIC_API_KEY, TOKEN_SIGNING_KEY, …) are set with
// `wrangler secret put` or the deploy workflow and never committed.

const DEFAULT_ORIGINS = 'https://ramkumarjothi1982.github.io';
const APPLE_ROOT_CA_G3_SHA256 = '63343ABFB89A6A03EBB57E9B3F5FA7BE7C4F5C756F3017B3A8C488C3653E9179';
/** hushmallow1 (Sydney): the one sign-in project whose accounts can subscribe (hushmallow/src/auth/config.js PROJECT_URL). */
const SUPABASE_PROJECT_URL = 'https://igbxbfuaoybfzsroxuln.supabase.co';
/** ENTITLEMENT_MODE values; anything else reads as 'testing', as before. */
const MODES = ['testing', 'storekit', 'both', 'billing', 'billing+testing'];
/**
 * An obviously unset Stripe price id: a placeholder such as "price_TODO_owner" (wrangler.toml [env.staging],
 * docs/STAGING.md, until the owner pastes the real test ids). It counts as unset, like an empty value, so it is
 * never sent to Stripe; with no real price at all, billing is "not configured" and says why.
 */
const PRICE_PLACEHOLDER = /^price_todo/i;
const PRICE_VARS = ['STRIPE_PRICE_PAID_MONTHLY', 'STRIPE_PRICE_PAID_YEARLY', 'STRIPE_PRICE_ULTRA_MONTHLY', 'STRIPE_PRICE_ULTRA_YEARLY'];

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
 * (PRICE_PLACEHOLDER). `configured` needs the Stripe key, the sign-in project,
 * APP_ORIGIN and at least one real price; the webhook also needs its own secret.
 * No value here is ever logged or returned (placeholderPrices is only a count).
 * @param {Record<string, any>} env @param {string[]} allowedOrigins
 */
function readBilling(env, allowedOrigins) {
  const secretKey = /^(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{8,}$/.test(str(env.STRIPE_SECRET_KEY)) ? str(env.STRIPE_SECRET_KEY) : '';
  const webhookSecret = /^whsec_[A-Za-z0-9+/=_-]{8,}$/.test(str(env.STRIPE_WEBHOOK_SECRET)) ? str(env.STRIPE_WEBHOOK_SECRET) : '';
  /** @param {unknown} v */
  const price = (v) => (/^price_[A-Za-z0-9]{4,64}$/.test(str(v)) && !PRICE_PLACEHOLDER.test(str(v)) ? str(v) : '');
  const prices = {
    paid: { monthly: price(env.STRIPE_PRICE_PAID_MONTHLY), yearly: price(env.STRIPE_PRICE_PAID_YEARLY) },
    ultra: { monthly: price(env.STRIPE_PRICE_ULTRA_MONTHLY), yearly: price(env.STRIPE_PRICE_ULTRA_YEARLY) },
  };
  // only hushmallow1, and only its publishable key (a secret key never belongs in a var)
  const supabaseUrl = str(env.SUPABASE_URL).replace(/\/+$/, '') === SUPABASE_PROJECT_URL ? SUPABASE_PROJECT_URL : '';
  const supabaseKey = /^sb_publishable_[A-Za-z0-9_-]{16,128}$/.test(str(env.SUPABASE_PUBLISHABLE_KEY)) ? str(env.SUPABASE_PUBLISHABLE_KEY) : '';
  const appOrigin = appOriginOf(str(env.APP_ORIGIN), allowedOrigins);
  const anyPrice = [prices.paid, prices.ultra].some((p) => !!(p.monthly || p.yearly));
  // how many price vars still hold a placeholder (never their values): /v1/health and the 503 say so
  const placeholderPrices = PRICE_VARS.filter((k) => PRICE_PLACEHOLDER.test(str(env[k]))).length;
  return {
    secretKey, webhookSecret, prices, supabaseUrl, supabaseKey, appOrigin, placeholderPrices,
    // optional: pins the Stripe API version of the server's own requests (the webhook's comes from its endpoint)
    apiVersion: /^\d{4}-\d{2}-\d{2}(?:\.[a-z]+)?$/.test(str(env.STRIPE_API_VERSION)) ? str(env.STRIPE_API_VERSION) : '',
    tokenTtlMs: int(env.BILLING_TOKEN_TTL_HOURS, 24, 1, 168) * 3600000,
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

export { APPLE_ROOT_CA_G3_SHA256, SUPABASE_PROJECT_URL };
