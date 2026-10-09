/*
 * ThinkStill AI proxy: a Cloudflare Worker that the ThinkStill game consoles (the Framer components) call as
 * their "AI Endpoint", so the games get real AI reasoning without an API key in the browser.
 *
 *   POST {game, tier, prompt}  ->  200 {text}          (the contract in games/shared/ts-ai.js, viaEndpoint)
 *
 * Checks run in this order and the first failure answers, always as {"error": "<code>"}:
 *   origin allowlist (403, no CORS headers) -> OPTIONS preflight (204) -> method (405) -> content type (415)
 *   -> body size (413) -> fields and the ThinkStill guardrail opening (400) -> per-IP rate limit (429)
 *   -> one call to the Anthropic Messages API: upstream 429 -> 429, 529/overloaded -> 503, anything else -> 502.
 * Upstream error bodies and headers are never forwarded, and the API key only ever goes to api.anthropic.com.
 *
 * Privacy: prompt text is never logged or stored. Each request logs one JSON line holding only
 * game, tier, status, latency in ms and token counts.
 */

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const UPSTREAM_TIMEOUT_MS = 25000; // the browser gives up at 28 s
const TEMPERATURE = 0.6;
const TIERS = {
  quick: { modelVar: 'MODEL_QUICK', model: 'claude-haiku-5-5', maxTokens: 700 },
  default: { modelVar: 'MODEL_DEFAULT', model: 'claude-sonnet-5-5', maxTokens: 1200 }
};

// First sentence of AI.GUARDRAILS (games/shared/ts-ai.js). Every game prompt starts with it; anything else is
// refused, so the key cannot be borrowed as a general-purpose chatbot.
const GUARDRAIL_OPENING =
  'You are the reasoning engine inside ThinkStill, a playful game that helps people with everyday emotional moments.';

const SYSTEM_PROMPT =
  'You are the reasoning engine behind the ThinkStill games. Reply with a single JSON object only, in the shape ' +
  'the user message asks for. Follow every rule in the user message. ' +
  'Never include anything else: no prose, no markdown, no code fences.';

const MAX_BODY_BYTES = 16 * 1024;
const PROMPT_MIN_CHARS = 20;
const PROMPT_MAX_CHARS = 12000;
const GAME_SLUG = /^[a-z0-9][a-z0-9_-]{0,47}$/; // e.g. "loop-rodeo"; 1 to 48 chars

const FALLBACK_PER_MINUTE = 20; // in-isolate limiter, used only without the RATE_LIMITER binding
const MAX_BUCKETS = 10000;

export default {
  async fetch(request, env, ctx) {
    const started = Date.now();
    const meta = { cors: null, game: null, tier: null, tokensIn: 0, tokensOut: 0 };
    let response;
    try {
      response = await handle(request, env || {}, meta);
    } catch {
      // Unexpected failure: answer without detail, since an error message could carry request data.
      response = reply(500, { error: 'internal_error' }, meta.cors);
    }
    // The only log line: no prompt text, no IP, no key.
    console.log(JSON.stringify({
      game: meta.game,
      tier: meta.tier,
      status: response.status,
      ms: Date.now() - started,
      tokens_in: meta.tokensIn,
      tokens_out: meta.tokensOut
    }));
    return response;
  }
};

async function handle(request, env, meta) {
  const origin = request.headers.get('origin');
  if (!originAllowed(origin, env.ALLOWED_ORIGINS)) return reply(403, { error: 'origin_not_allowed' });
  const cors = (meta.cors = { 'access-control-allow-origin': origin });

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        ...cors,
        'access-control-allow-methods': 'POST, OPTIONS',
        'access-control-allow-headers': 'content-type',
        'access-control-max-age': '86400',
        vary: 'Origin'
      }
    });
  }
  if (request.method !== 'POST') return reply(405, { error: 'method_not_allowed' }, cors, { allow: 'POST, OPTIONS' });

  const type = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (type !== 'application/json') return reply(415, { error: 'unsupported_media_type' }, cors);

  const body = await readJson(request);
  if (body === TOO_LARGE) return reply(413, { error: 'payload_too_large' }, cors);
  if (!body || typeof body !== 'object' || Array.isArray(body)) return reply(400, { error: 'invalid_json' }, cors);

  const { game, tier, prompt } = body;
  if (typeof game !== 'string' || !GAME_SLUG.test(game)) return reply(400, { error: 'invalid_game' }, cors);
  meta.game = game;
  if (tier !== 'quick' && tier !== 'default') return reply(400, { error: 'invalid_tier' }, cors);
  meta.tier = tier;
  if (typeof prompt !== 'string' || prompt.length < PROMPT_MIN_CHARS || prompt.length > PROMPT_MAX_CHARS) {
    return reply(400, { error: 'invalid_prompt' }, cors);
  }
  if (!prompt.trimStart().startsWith(GUARDRAIL_OPENING)) return reply(400, { error: 'missing_guardrails' }, cors);

  const limited = await rateLimit(request, env);
  if (limited) {
    const retry = limited.retryAfter ? { 'retry-after': String(limited.retryAfter) } : null;
    return reply(429, { error: 'rate_limited' }, cors, retry);
  }

  const key = typeof env.ANTHROPIC_API_KEY === 'string' ? env.ANTHROPIC_API_KEY.trim() : '';
  if (!key) return reply(500, { error: 'not_configured' }, cors);

  const result = await askClaude(key, env, tier, prompt, meta);
  if (result.error) return reply(result.status, { error: result.error }, cors);
  return reply(200, { text: result.text }, cors);
}

function reply(status, payload, cors, extra) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      vary: 'Origin',
      ...cors,
      ...extra
    }
  });
}

/* ---------------- CORS origin allowlist ---------------- */

// ALLOWED_ORIGINS is comma-separated: exact origins ("https://thinkstill.com", "http://localhost:8787") and
// wildcard subdomains ("https://*.framer.app": any subdomain at any depth, never the bare framer.app).
// A bare "*" or a TLD wildcard ("https://*.app") is ignored, and an empty list denies everyone.
let originRules = { source: null, exact: new Set(), wildcards: [] };
const HOST_LABELS = /^[a-z0-9-]+(?:\.[a-z0-9-]+)*$/;

function rulesFor(value) {
  const source = String(value || '');
  if (originRules.source === source) return originRules;
  const exact = new Set();
  const wildcards = [];
  for (const item of source.split(',')) {
    const entry = item.trim().toLowerCase().replace(/\/+$/, '');
    const wild = /^(https?):\/\/\*\.((?:[a-z0-9-]+\.)+[a-z0-9-]+)(?::(\d{1,5}))?$/.exec(entry);
    if (wild) {
      const defaultPort = wild[1] === 'https' ? '443' : '80';
      wildcards.push({ protocol: wild[1] + ':', suffix: '.' + wild[2], port: wild[3] && wild[3] !== defaultPort ? wild[3] : '' });
      continue;
    }
    try {
      const url = new URL(entry);
      if ((url.protocol === 'https:' || url.protocol === 'http:') && !url.hostname.includes('*')) exact.add(url.origin);
    } catch {
      // not an origin: ignored
    }
  }
  originRules = { source, exact, wildcards };
  return originRules;
}

function originAllowed(origin, allowed) {
  if (!origin) return false;
  let url;
  try {
    url = new URL(origin);
  } catch {
    return false; // includes the opaque origin "null"
  }
  if (url.origin !== origin || (url.protocol !== 'https:' && url.protocol !== 'http:')) return false;
  const rules = rulesFor(allowed);
  if (rules.exact.has(origin)) return true;
  return rules.wildcards.some((w) =>
    url.protocol === w.protocol &&
    url.port === w.port &&
    url.hostname.endsWith(w.suffix) &&
    HOST_LABELS.test(url.hostname.slice(0, -w.suffix.length)));
}

/* ---------------- request body ---------------- */

const TOO_LARGE = Symbol('too large');

// Reads at most MAX_BODY_BYTES whatever Content-Length claims, then parses JSON. Null when unreadable.
async function readJson(request) {
  if (Number(request.headers.get('content-length')) > MAX_BODY_BYTES) return TOO_LARGE;
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        reader.cancel().catch(() => {});
        return TOO_LARGE;
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let at = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, at);
      at += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    return null;
  }
}

/* ---------------- rate limiting (per client IP) ---------------- */

// key -> { tokens, at }. Best effort: each isolate keeps its own buckets and loses them when recycled.
const buckets = new Map();

async function rateLimit(request, env) {
  const key = clientKey(request.headers.get('cf-connecting-ip'));
  const binding = env.RATE_LIMITER;
  if (binding && typeof binding.limit === 'function') {
    try {
      const outcome = await binding.limit({ key });
      if (outcome && typeof outcome.success === 'boolean') return outcome.success ? null : { retryAfter: 0 };
    } catch {
      // binding unavailable: fall back to the in-isolate bucket below
    }
  }
  const perMinute = Math.min(Math.max(parseInt(env.RATE_LIMIT_PER_MINUTE, 10) || FALLBACK_PER_MINUTE, 1), 10000);
  return takeToken(key, perMinute, Date.now());
}

// Token bucket: holds up to perMinute tokens and refills perMinute tokens a minute.
function takeToken(key, perMinute, now) {
  const bucket = buckets.get(key) || { tokens: perMinute, at: now };
  bucket.tokens = Math.min(perMinute, bucket.tokens + (Math.max(0, now - bucket.at) * perMinute) / 60000);
  bucket.at = now;
  buckets.delete(key); // re-insert so the Map stays in least-recently-used order
  buckets.set(key, bucket);
  if (buckets.size > MAX_BUCKETS) buckets.delete(buckets.keys().next().value);
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return null;
  }
  return { retryAfter: Math.max(1, Math.ceil(((1 - bucket.tokens) * 60000) / perMinute / 1000)) };
}

// IPv4 as is; IPv6 by its /64 network, since one device can rotate through a whole /64.
function clientKey(ip) {
  const raw = String(ip || '').trim().toLowerCase();
  if (!raw) return 'ip:unknown';
  if (!raw.includes(':')) return 'ip:' + raw;
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(raw);
  if (mapped) return 'ip:' + mapped[1];
  const halves = raw.split('::');
  if (halves.length > 2) return 'ip:' + raw;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const width = (groups) => groups.reduce((n, g) => n + (g.includes('.') ? 2 : 1), 0);
  const groups = halves.length === 2 ? [...head, ...Array(Math.max(0, 8 - width(head) - width(tail))).fill('0'), ...tail] : head;
  const prefix = groups.slice(0, 4);
  if (prefix.length < 4 || !prefix.every((g) => /^[0-9a-f]{1,4}$/.test(g))) return 'ip:' + raw;
  return 'ip6:' + prefix.map((g) => parseInt(g, 16).toString(16)).join(':') + '::/64';
}

/* ---------------- Anthropic Messages API ---------------- */

async function askClaude(key, env, tier, prompt, meta) {
  const conf = TIERS[tier];
  const model = String(env[conf.modelVar] || '').trim() || conf.model;
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, UPSTREAM_TIMEOUT_MS);
  try {
    let res;
    try {
      res = await fetch(ANTHROPIC_URL, {
        method: 'POST',
        headers: { 'x-api-key': key, 'anthropic-version': ANTHROPIC_VERSION, 'content-type': 'application/json' },
        body: JSON.stringify({
          model,
          max_tokens: conf.maxTokens,
          temperature: TEMPERATURE,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: prompt }]
        }),
        redirect: 'manual', // a redirect must never carry the key anywhere else
        signal: controller.signal
      });
    } catch {
      return { status: 502, error: timedOut ? 'upstream_timeout' : 'upstream_unreachable' };
    }
    if (!res.ok) return await upstreamFailure(res); // awaited so the timeout also covers reading the error body

    let data;
    try {
      data = await res.json(); // still under the timeout: a reply that stalls mid-body is cut off too
    } catch {
      return { status: 502, error: timedOut ? 'upstream_timeout' : 'upstream_invalid' };
    }
    const usage = (data && data.usage) || {};
    meta.tokensIn = tokenCount(usage.input_tokens);
    meta.tokensOut = tokenCount(usage.output_tokens);
    const blocks = data && Array.isArray(data.content) ? data.content : [];
    const text = blocks
      .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
      .map((b) => b.text)
      .join('');
    if (!text.trim()) return { status: 502, error: 'upstream_empty' };
    return { status: 200, text };
  } finally {
    clearTimeout(timer);
  }
}

// Maps an upstream failure to our own status and code. The upstream body is read only to spot an
// overloaded_error; it is never forwarded, and neither are upstream headers.
async function upstreamFailure(res) {
  if (res.status === 429) {
    discard(res);
    return { status: 429, error: 'upstream_rate_limited' };
  }
  let kind = '';
  try {
    const body = await res.json();
    kind = body && body.error && typeof body.error.type === 'string' ? body.error.type : '';
  } catch {
    // not JSON: classify by status alone
  }
  if (res.status === 529 || kind === 'overloaded_error') return { status: 503, error: 'upstream_overloaded' };
  if (res.status === 401 || res.status === 403) return { status: 502, error: 'upstream_auth' };
  if (res.status === 400 || res.status === 404) return { status: 502, error: 'upstream_rejected' };
  return { status: 502, error: 'upstream_error' };
}

function discard(res) {
  try {
    if (res.body) res.body.cancel().catch(() => {});
  } catch {
    // already consumed
  }
}

function tokenCount(n) {
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}
