// Environment → validated configuration. Vars live in wrangler.toml [vars];
// secrets (ANTHROPIC_API_KEY, TOKEN_SIGNING_KEY, …) are set with
// `wrangler secret put` or the deploy workflow and never committed.

const DEFAULT_ORIGINS = 'https://ramkumarjothi1982.github.io';
const APPLE_ROOT_CA_G3_SHA256 = '63343ABFB89A6A03EBB57E9B3F5FA7BE7C4F5C756F3017B3A8C488C3653E9179';

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

/**
 * @typedef {ReturnType<typeof readConfig>} Config
 */

/** @param {Record<string, any>} env */
export function readConfig(env) {
  const effort = String(env.EFFORT || 'low');
  const mode = String(env.ENTITLEMENT_MODE || 'testing');
  const signingKey = typeof env.TOKEN_SIGNING_KEY === 'string' && env.TOKEN_SIGNING_KEY.length >= 32 ? env.TOKEN_SIGNING_KEY : '';
  const previousKey = typeof env.TOKEN_SIGNING_KEY_PREVIOUS === 'string' && env.TOKEN_SIGNING_KEY_PREVIOUS.length >= 32 ? env.TOKEN_SIGNING_KEY_PREVIOUS : '';
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
    allowedOrigins: list(env.ALLOWED_ORIGINS || DEFAULT_ORIGINS),
    allowNoOrigin: bool(env.ALLOW_NO_ORIGIN, false),
    requireHttps: bool(env.REQUIRE_HTTPS, true),
    entitlementMode: /** @type {'testing' | 'storekit' | 'both'} */ (['testing', 'storekit', 'both'].includes(mode) ? mode : 'testing'),
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
  };
}

export { APPLE_ROOT_CA_G3_SHA256 };
