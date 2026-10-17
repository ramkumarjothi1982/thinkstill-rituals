// HTTP layer for the Another Angle Worker.
//
//   GET  /v1/health   liveness + versions + whether a tester invite is needed (no secrets)
//   POST /v1/session  entitlement check → signed session token
//   POST /v1/angle    one Another Angle scene (or support, or a fallback signal)
//   POST /v1/feedback which of the four feedback buttons was pressed (metadata only)
//   /v1/billing/*     web subscriptions through Stripe (src/billing/routes.js), off until configured
//
// Order of checks on /v1/angle: HTTPS → CORS allowlist → body size/type →
// safety pre-check on the text (crisis/care get support straight away: no
// token, no burst limit, no quota, no model) → per-network rate limit (IPv4
// address or IPv6 /64, hashed) → bearer token → strict validation →
// emoji-only text ("unclear", no quota) → per-device daily quota → global
// daily spend reservation → pipeline → spend settled → metadata log.

import { readConfig } from './config.js';
import { json, error, corsHeaders, preflight, readJson, nextUtcMidnight, utcDay } from './http.js';
import { validateAngleRequest, validateSessionRequest, validateFeedbackRequest, cleanText, ANGLE_BODY_MAX_BYTES, SESSION_BODY_MAX_BYTES } from './validate.js';
import { checkSafety, supportPayload } from './safety/index.js';
import { runAngle, hasWords, PROMPT_VERSION, SCHEMA_VERSION } from './pipeline.js';
import { signToken, verifyToken, keyedHash } from './auth/tokens.js';
import { checkEntitlement } from './auth/entitlement.js';
import { ledgerClient, memoryLedgerNamespace } from './limits/ledger.js';
import { allow, memoryRateLimiter } from './limits/ratelimit.js';
import { networkKey } from './limits/netkey.js';
import { createLogger, lengthBucket } from './log.js';
import { costMicros, worstCaseMicros } from './cost.js';
import { createAnthropicProvider } from './providers/anthropic.js';
import { createMockProvider } from './providers/mock.js';
import { createBilling, bearerOf, PATHS as BILLING } from './billing/routes.js';

/** The unauthenticated safety pre-check reads at most this many characters of the text (src/validate.js TEXT_MAX is 600). */
export const EARLY_CHECK_CHARS = 2000;

/**
 * A session issued under rules this mode no longer has: after the switch to "billing", any session but a billing one;
 * under "billing+testing" without TESTER_INVITE_CODES, a testing one (it was open to anyone). Without this a 30-day
 * testing session minted before the switch would keep reaching the model without Beyond. The client asks for a new
 * session on a 401 (src/beyond/angle-client.js), and that one follows the current rules. Other modes are unchanged.
 * @param {import('./config.js').Config} cfg @param {{ src?: string }} payload
 */
export function sessionSuperseded(cfg, payload) {
  if (cfg.entitlementMode === 'billing') return payload.src !== 'billing';
  if (cfg.entitlementMode === 'billing+testing') return payload.src === 'testing' && cfg.inviteCodes.length === 0;
  return false;
}

/**
 * @typedef {import('./providers/anthropic.js').Provider} Provider
 * @typedef {{ waitUntil?(p: Promise<unknown>): void }} Ctx
 */

/**
 * @param {{
 *   systemPrompt: string,
 *   provider?: Provider | ((cfg: import('./config.js').Config) => Provider),
 *   now?: () => number,
 *   log?: (line: string) => void,
 *   fetch?: typeof fetch,
 * }} options (fetch: the billing routes' calls to Stripe and the sign-in project; tests pass a fake)
 */
export function createApp(options) {
  const now = options.now || Date.now;
  const logger = createLogger(options.log);
  /** @type {WeakMap<object, import('./config.js').Config>} */
  const configs = new WeakMap();
  /** @type {Map<string, Provider>} */
  const providers = new Map();
  const fallbackNs = memoryLedgerNamespace({ now });
  const fallbackAngleLimiter = memoryRateLimiter({ limit: 6, periodMs: 60000, now });
  const fallbackSessionLimiter = memoryRateLimiter({ limit: 3, periodMs: 60000, now });
  const fallbackFeedbackLimiter = memoryRateLimiter({ limit: 20, periodMs: 60000, now });
  const billing = createBilling({ logger, now, ...(options.fetch ? { fetch: options.fetch } : {}), ipKey: (request, cfg) => ipKey(request, cfg) });

  /** @param {Record<string, any>} env */
  const configFor = (env) => {
    let c = configs.get(env);
    if (!c) { c = readConfig(env); configs.set(env, c); }
    return c;
  };

  /** @param {import('./config.js').Config} cfg */
  const providerFor = (cfg) => {
    if (typeof options.provider === 'function') return options.provider(cfg);
    if (options.provider) return options.provider;
    const key = `${cfg.provider}|${cfg.model}|${cfg.effort}|${cfg.maxRetries}|${cfg.refusalFallback}|${cfg.apiKey.slice(-6)}`;
    let p = providers.get(key);
    if (!p) {
      p = cfg.provider === 'mock'
        ? createMockProvider({ mode: 'heuristic', model: cfg.model })
        : createAnthropicProvider({ apiKey: cfg.apiKey, model: cfg.model, effort: cfg.effort, maxRetries: cfg.maxRetries, fallbacks: cfg.refusalFallback });
      providers.set(key, p);
    }
    return p;
  };

  /** @param {Ctx | undefined} ctx @param {Promise<unknown>} p */
  const defer = async (ctx, p) => {
    const safe = p.catch(() => logger.event({ evt: 'deferred_error' }));
    if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(safe); else await safe;
  };

  /**
   * @param {Request} request
   * @param {Record<string, any>} env
   * @param {Ctx} [ctx]
   */
  async function handle(request, env, ctx) {
    const cfg = configFor(env);
    const url = new URL(request.url);
    const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    if (cfg.requireHttps && url.protocol !== 'https:' && !local) return error(403, 'https_required', 'Use HTTPS.');
    // Stripe's webhook comes from Stripe, not a browser: no Origin and no CORS; its signature is the check
    if (url.pathname === BILLING.webhook) return billing.webhook(request, env, cfg);

    const cors = corsHeaders(request, cfg);
    if (!cors) return error(403, 'origin_not_allowed', 'This origin may not call the Another Angle server.');
    if (request.method === 'OPTIONS') return preflight(cors);

    const route = `${request.method} ${url.pathname}`;
    if (route === 'GET /v1/health') {
      return json(200, {
        ok: true, service: 'another-angle', prompt_version: PROMPT_VERSION, schema_version: SCHEMA_VERSION,
        provider: cfg.provider, entitlement_mode: cfg.entitlementMode,
        // a testing session needs one of TESTER_INVITE_CODES (src/auth/entitlement.js); only whether, never a code
        // (billing alone takes no invite code)
        invite_required: cfg.entitlementMode !== 'storekit' && cfg.entitlementMode !== 'billing' && cfg.inviteCodes.length > 0,
        configured: { signing_key: cfg.signingKeys.length > 0, provider_key: cfg.provider === 'mock' || cfg.apiKey.length > 0 },
        // web subscriptions (src/billing/): only whether they are set up, never a key or a price (and, while any
        // price id is still a placeholder such as price_TODO_owner, how many; while the sign-in project is a
        // placeholder, that it is: docs/STAGING.md). Enums and booleans only: the accepted key's Stripe mode (null
        // when unset or refused), why a key was refused, the owner's live approval, the pinned API version and the
        // Stripe Tax switch, so a deploy can be checked without a key.
        billing: {
          configured: billing.ready(env, cfg), webhook: cfg.billing.webhookSecret.length > 0,
          stripe_mode: cfg.billing.keyMode || null,
          ...(cfg.billing.keyRefused ? { key_refused: cfg.billing.keyRefused } : {}),
          live_approved: cfg.billing.liveApproved, api_version: cfg.billing.apiVersion || null, automatic_tax: cfg.billing.automaticTax,
          ...(cfg.billing.placeholderPrices ? { placeholder_prices: cfg.billing.placeholderPrices } : {}),
          ...(cfg.billing.accountsPlaceholder ? { accounts_configured: false } : {}),
        },
      }, cors);
    }
    if (route === 'POST /v1/session') return session(request, env, cfg, cors);
    if (route === 'POST /v1/angle') return angle(request, env, cfg, cors, ctx);
    if (route === 'POST /v1/feedback') return feedback(request, env, cfg, cors);
    if (route === `POST ${BILLING.checkout}`) return billing.checkout(request, env, cfg, cors);
    if (route === `GET ${BILLING.status}`) return billing.status(request, env, cfg, cors);
    if (route === `POST ${BILLING.sync}`) return billing.sync(request, env, cfg, cors);
    if (route === `POST ${BILLING.portal}`) return billing.portal(request, env, cfg, cors);
    if (['/v1/health', '/v1/session', '/v1/angle', '/v1/feedback', BILLING.checkout, BILLING.status, BILLING.sync, BILLING.portal].includes(url.pathname)) return error(405, 'method_not_allowed', 'Method not allowed.', { ...cors, allow: ['/v1/health', BILLING.status].includes(url.pathname) ? 'GET, OPTIONS' : 'POST, OPTIONS' });
    return error(404, 'not_found', 'Not found.', cors);
  }

  /**
   * Keyed hash of the client's network (IPv4 address or IPv6 /64), never the raw address.
   * @param {Request} request @param {import('./config.js').Config} cfg
   */
  async function ipKey(request, cfg) {
    return keyedHash(cfg.hashKey || 'unset', `ip:${networkKey(request.headers.get('cf-connecting-ip'))}`, 12);
  }

  /** @param {Record<string, any>} env */
  const ledgerFor = (env) => ledgerClient(env.LEDGER || fallbackNs);

  /**
   * The opaque tag sent to Anthropic as metadata.user_id, so abuse can be
   * spotted within a day: a keyed hash of the session subject and the UTC
   * day, so it changes every day and one phone's requests cannot be linked
   * across days by it (15 Oct 2026, privacy review 3).
   * @param {import('./config.js').Config} cfg @param {string} subject @param {string} day
   */
  const userTag = (cfg, subject, day) => keyedHash(cfg.hashKey, `tag:${day}:${subject}`, 12);

  /**
   * @param {Request} request @param {Record<string, any>} env
   * @param {import('./config.js').Config} cfg @param {Record<string, string>} cors
   */
  async function session(request, env, cfg, cors) {
    const t0 = now();
    if (!cfg.signingKeys.length) return error(503, 'not_configured', 'TOKEN_SIGNING_KEY is not set.', cors);
    const ip = await ipKey(request, cfg);
    if (!(await allow(env.SESSION_IP_LIMITER, fallbackSessionLimiter, ip))) {
      logger.event({ evt: 'session', status: 'rate_limited', http: 429 });
      return error(429, 'rate_limited', 'Too many requests. Try again in a minute.', { ...cors, 'retry-after': '60' });
    }
    const body = await readJson(request, SESSION_BODY_MAX_BYTES);
    if (!body.ok) return error(body.status, body.code, body.message, cors);
    const v = validateSessionRequest(body.value);
    if (!v.ok) return error(400, v.code, v.message, cors, { field: v.field });

    // billing modes: the signed-in account's Supabase token (Authorization) and its Beyond subscription; other modes never read it
    const billed = cfg.entitlementMode === 'billing' || cfg.entitlementMode === 'billing+testing';
    const ent = billed
      ? await checkEntitlement(v.value, cfg, now(), { accountToken: bearerOf(request), beyond: (t) => billing.beyondAccess(env, cfg, t) })
      : await checkEntitlement(v.value, cfg, now());
    if (!ent.ok) {
      logger.event({ evt: 'session', status: 'denied', http: ent.status, err: ent.code });
      return error(ent.status, ent.code, ent.message, cors);
    }
    const day = utcDay(now());
    const ledger = ledgerFor(env);
    if (ent.source === 'testing') {
      const perIp = await ledger.take(`ip:${ip}`, 'sessions', day, cfg.sessionsPerIpDaily);
      if (!perIp.ok) return error(429, 'session_limit', 'Too many new sessions from this network today.', { ...cors, 'retry-after': '3600' });
      const global = await ledger.take('global', 'sessions', day, cfg.sessionDailyCap);
      if (!global.ok) {
        await ledger.give(`ip:${ip}`, 'sessions', day); // no session was issued, so this network's count goes back
        return error(429, 'session_limit', 'No new testing sessions today.', { ...cors, 'retry-after': '3600' });
      }
    }
    const iat = Math.floor(now() / 1000) * 1000;
    const token = await signToken({ sub: ent.subject, ent: 'beyond', src: ent.source, iat, exp: ent.expiresAt }, cfg.signingKeys[0]);
    const used = await ledger.peek(`dev:${ent.subject}`, 'angles', day);
    logger.event({ evt: 'session', status: 'ok', http: 200, source: ent.source, latency_ms: now() - t0 });
    return json(200, {
      status: 'ok', token, token_type: 'Bearer', expires_at: new Date(ent.expiresAt).toISOString(), source: ent.source,
      quota: { daily: cfg.deviceDailyLimit, remaining: Math.max(0, cfg.deviceDailyLimit - used.used), resets_at: nextUtcMidnight(now()) },
    }, cors);
  }

  /**
   * @param {Request} request @param {Record<string, any>} env
   * @param {import('./config.js').Config} cfg @param {Record<string, string>} cors @param {Ctx | undefined} ctx
   */
  async function angle(request, env, cfg, cors, ctx) {
    const t0 = now();
    const rid = crypto.randomUUID();
    const base = { prompt_version: PROMPT_VERSION, schema_version: SCHEMA_VERSION, request_id: rid };
    /** @param {Record<string, unknown>} f */
    const logEvt = (f) => logger.event({ evt: 'angle', prompt_version: PROMPT_VERSION, provider: cfg.provider, latency_ms: now() - t0, ...f });

    // The body is read first so the safety pre-check can run before anything
    // that could turn a person in crisis away (a burst limit, an expired
    // token, a missing setting). The check is cheap, uses no quota and
    // returns only the authored support copy. It reads at most the first
    // EARLY_CHECK_CHARS characters (no token yet, so no unbounded CPU for
    // anyone); a longer text is refused later anyway (TEXT_MAX), and the full
    // checks run on the validated text after the token.
    const body = await readJson(request, ANGLE_BODY_MAX_BYTES);
    const raw = body.ok && body.value && typeof body.value === 'object' ? /** @type {Record<string, unknown>} */ (body.value).text : null;
    if (typeof raw === 'string') {
      const early = checkSafety(cleanText(raw.slice(0, EARLY_CHECK_CHARS)));
      if (early.level === 'crisis' || early.level === 'care') {
        logEvt({ status: early.level, http: 200, safety_level: early.level, safety_source: 'lexicon', text_len_bucket: lengthBucket(raw.length) });
        return json(200, { ...base, status: early.level, scene: null, support: supportPayload(early.level, early.category, 'lexicon'), fallback: null, keep_support_close: true }, cors);
      }
    }

    if (!cfg.signingKeys.length) return error(503, 'not_configured', 'TOKEN_SIGNING_KEY is not set.', cors);
    const ip = await ipKey(request, cfg);
    if (!(await allow(env.ANGLE_IP_LIMITER, fallbackAngleLimiter, ip))) {
      logEvt({ status: 'rate_limited', http: 429 });
      return error(429, 'rate_limited', 'Too many requests. Try again in a minute.', { ...cors, 'retry-after': '60' });
    }

    const auth = request.headers.get('authorization') || '';
    const m = /^Bearer ([A-Za-z0-9._-]{10,2048})$/.exec(auth);
    const verified = m ? await verifyToken(m[1], cfg.signingKeys, now()) : { ok: false, code: 'missing' };
    if (!verified.ok) {
      logEvt({ status: 'unauthorised', http: 401, err: /** @type {any} */ (verified).code });
      return error(401, 'unauthorised', 'A valid session token is required.', { ...cors, 'www-authenticate': 'Bearer realm="another-angle"' });
    }
    const payload = /** @type {any} */ (verified).payload;
    if (sessionSuperseded(cfg, payload)) {
      logEvt({ status: 'unauthorised', http: 401, err: 'session_superseded' });
      return error(401, 'session_superseded', 'This session is from before the current rules; start a new one.', { ...cors, 'www-authenticate': 'Bearer realm="another-angle"' });
    }
    const subject = payload.sub;

    if (!body.ok) { logEvt({ status: 'invalid', http: body.status, err: body.code }); return error(body.status, body.code, body.message, cors); }
    const v = validateAngleRequest(body.value);
    if (!v.ok) { logEvt({ status: 'invalid', http: 400, err: v.code }); return error(400, v.code, v.message, cors, { field: v.field }); }
    const input = v.value;
    if (input.requestId) Object.assign(base, { client_request_id: input.requestId });
    const common = {
      chosen_emotion: input.emotion, intention: input.intention, previous: input.previous.length, text_len_bucket: lengthBucket(input.text.length),
    };

    // Crisis and care never reach the model and never use quota (checked
    // again on the validated text, which is what the model would see).
    const safety = checkSafety(input.text);
    if (safety.level === 'crisis' || safety.level === 'care') {
      logEvt({ ...common, status: safety.level, http: 200, safety_level: safety.level, safety_source: 'lexicon' });
      return json(200, { ...base, status: safety.level, scene: null, support: supportPayload(safety.level, safety.category, 'lexicon'), fallback: null, keep_support_close: true }, cors);
    }

    const day = utcDay(now());
    const ledger = ledgerFor(env);
    const devName = `dev:${subject}`;

    // Only emoji or punctuation: ask for a little more (the "unclear"
    // fallback) without calling the model or using quota.
    if (!hasWords(input.text)) {
      const used = await ledger.peek(devName, 'angles', day);
      logEvt({ ...common, status: 'fallback', fallback_reason: 'unclear', err: 'no_words', http: 200 });
      return json(200, {
        ...base, status: 'fallback', scene: null, support: null, fallback: { reason: 'unclear', hint: null }, keep_support_close: false,
        quota: { daily: cfg.deviceDailyLimit, remaining: Math.max(0, cfg.deviceDailyLimit - used.used), resets_at: nextUtcMidnight(now()) },
      }, cors);
    }

    const quota = await ledger.take(devName, 'angles', day, cfg.deviceDailyLimit);
    const quotaOut = { daily: cfg.deviceDailyLimit, remaining: quota.remaining ?? 0, resets_at: nextUtcMidnight(now()) };
    if (!quota.ok) {
      logEvt({ ...common, status: 'daily_limit', http: 429, quota_left: 0 });
      return error(429, 'daily_limit', 'Today\'s Another Angle limit has been reached.', { ...cors, 'retry-after': String(Math.ceil((Date.parse(quotaOut.resets_at) - now()) / 1000)) }, { quota: quotaOut });
    }

    const provider = providerFor(cfg);
    if (cfg.provider === 'anthropic' && !cfg.apiKey) {
      await ledger.give(devName, 'angles', day);
      logEvt({ ...common, status: 'fallback', fallback_reason: 'provider', err: 'no_api_key', http: 200 });
      return json(200, { ...base, status: 'fallback', scene: null, support: null, fallback: { reason: 'provider', hint: null }, keep_support_close: safety.level === 'concern', quota: { ...quotaOut, remaining: quotaOut.remaining + 1 } }, cors);
    }

    const reserve = worstCaseMicros({ model: cfg.model, attempts: 2, promptTokens: cfg.promptTokenEstimate, maxTokens: cfg.maxTokens });
    const spend = await ledger.take('global', 'spend', day, cfg.dailySpendCapMicros, reserve);
    if (!spend.ok) {
      await ledger.give(devName, 'angles', day);
      logEvt({ ...common, status: 'fallback', fallback_reason: 'capacity', http: 200 });
      return json(200, { ...base, status: 'fallback', scene: null, support: null, fallback: { reason: 'capacity', hint: null }, keep_support_close: safety.level === 'concern', quota: { ...quotaOut, remaining: quotaOut.remaining + 1 } }, cors);
    }

    let result;
    // Usage is collected as each model call returns, so an exception later in
    // the pipeline still settles what was actually spent.
    /** @type {import('./cost.js').UsagePart[]} */
    const usage = [];
    try {
      result = await runAngle(input, {
        provider, systemPrompt: options.systemPrompt, maxTokens: cfg.maxTokens, attemptTimeoutMs: cfg.attemptTimeoutMs,
        deadlineMs: cfg.deadlineMs, userTag: await userTag(cfg, subject, day), now, usage,
      });
    } catch (e) {
      await defer(ctx, ledger.settle('global', 'spend', day, reserve, costMicros(usage)));
      await ledger.give(devName, 'angles', day);
      quotaOut.remaining += 1;
      logEvt({ ...common, status: 'fallback', fallback_reason: 'provider', err: 'exception', http: 200 });
      return json(200, { ...base, status: 'fallback', scene: null, support: null, fallback: { reason: 'provider', hint: null }, keep_support_close: safety.level === 'concern', quota: quotaOut }, cors);
    }

    const actual = costMicros(result.meta.usage);
    await defer(ctx, ledger.settle('global', 'spend', day, reserve, actual));
    // Nothing came back from the model (timeout, refusal, provider error):
    // give the quota unit back. A model answer held back by the quality gate,
    // or an "unclear" reading, used a model call and still counts, so a
    // device cannot spend the model budget for free (README "Costs").
    const undelivered = result.status === 'fallback' && ['provider', 'timeout', 'refusal'].includes(result.fallback?.reason || '');
    if (undelivered) { await ledger.give(devName, 'angles', day); quotaOut.remaining += 1; }

    const meta = result.meta;
    const usageSum = meta.usage.reduce((a, u) => ({ i: a.i + u.input, o: a.o + u.output, r: a.r + u.cacheRead, w: a.w + u.cacheWrite }), { i: 0, o: 0, r: 0, w: 0 });
    logEvt({
      ...common, status: result.status, http: 200, attempts: meta.attempts, gate: meta.gate, gate_codes: meta.gate_codes,
      pattern: result.scene?.reasoning_pattern, interaction: result.scene?.interaction_type, mallow: result.scene?.mallow_character,
      emotion: result.scene?.emotion, situation: result.scene?.situation_type, safety_level: meta.safety_level,
      safety_source: meta.safety_source, injection: meta.injection, normalised: meta.normalised,
      provider_error: meta.provider_error, refusal_category: meta.refusal_category, model: meta.model, fallback_model: meta.fallback_model,
      fallback_reason: result.fallback?.reason, model_ms: meta.model_ms, tokens_in: usageSum.i, tokens_out: usageSum.o,
      cache_read: usageSum.r, cache_write: usageSum.w, cost_micros: actual, quota_left: quotaOut.remaining,
    });
    return json(200, {
      ...base, status: result.status, scene: result.scene, support: result.support, fallback: result.fallback,
      keep_support_close: result.keep_support_close, quota: quotaOut,
    }, cors);
  }

  /**
   * "That helped" / "Show me another angle" / "Not relevant" / "I'd rather
   * just squeeze a Mallow": logged as metadata only (which button, which kind
   * of scene), so the owner can see which patterns land. No words, no ids.
   * @param {Request} request @param {Record<string, any>} env
   * @param {import('./config.js').Config} cfg @param {Record<string, string>} cors
   */
  async function feedback(request, env, cfg, cors) {
    if (!cfg.signingKeys.length) return error(503, 'not_configured', 'TOKEN_SIGNING_KEY is not set.', cors);
    if (!(await allow(env.FEEDBACK_IP_LIMITER, fallbackFeedbackLimiter, await ipKey(request, cfg)))) return error(429, 'rate_limited', 'Too many requests. Try again in a minute.', { ...cors, 'retry-after': '60' });
    const m = /^Bearer ([A-Za-z0-9._-]{10,2048})$/.exec(request.headers.get('authorization') || '');
    const verified = m ? await verifyToken(m[1], cfg.signingKeys, now()) : null;
    if (!verified?.ok) return error(401, 'unauthorised', 'A valid session token is required.', { ...cors, 'www-authenticate': 'Bearer realm="another-angle"' });
    if (sessionSuperseded(cfg, verified.payload)) return error(401, 'session_superseded', 'This session is from before the current rules; start a new one.', { ...cors, 'www-authenticate': 'Bearer realm="another-angle"' });
    const body = await readJson(request, 2048);
    if (!body.ok) return error(body.status, body.code, body.message, cors);
    const v = validateFeedbackRequest(body.value);
    if (!v.ok) return error(400, v.code, v.message, cors, { field: v.field });
    // Counted against the prompt that wrote the rated scene, not the one deployed now.
    logger.event({ evt: 'feedback', prompt_version: v.value.prompt_version || PROMPT_VERSION, rating: v.value.rating, pattern: v.value.reasoning_pattern, interaction: v.value.interaction_type, mallow: v.value.mallow_character });
    return json(202, { status: 'ok' }, cors);
  }

  return {
    /** @param {Request} request @param {Record<string, any>} env @param {Ctx} [ctx] */
    async fetch(request, env, ctx) {
      // CORS is decided first, so even a 500 reaches the browser as a
      // readable response rather than an opaque network error.
      /** @type {Record<string, string>} */
      let cors = {};
      try { cors = corsHeaders(request, configFor(env)) || {}; } catch { /* keep {} */ }
      try {
        return await handle(request, env, ctx);
      } catch {
        logger.event({ evt: 'unhandled_error', http: 500 });
        return error(500, 'internal', 'Something went wrong.', cors);
      }
    },
  };
}
