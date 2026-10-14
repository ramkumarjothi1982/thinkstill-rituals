// Another Angle, server to server: the optional AI source for the Mallow.
//
// The existing Another Angle service (Account 1's Cloudflare Worker, POST /v1/angle)
// is used exactly as it is: this file wraps core/perspectives.js anotherAngleProvider
// (which owns the request shape, the safety and provenance checks and the one
// session refresh) and adds what the Hushmates server needs around it:
//   · configuration from the Edge Function's secrets, never from a browser;
//   · a hard deadline around everything, the session request included;
//   · an estimated cost per call in AUD, and whether a call was likely billed;
//   · one answer shape for the Mallow (supabase/functions/_shared/mallow.js).
// It is only ever called when the owner has switched AI on (settings.ai.enabled);
// until then nothing here runs. Runtime-neutral: fetch, AbortController, setTimeout.
//
// The cost estimate (ANOTHER_ANGLE_COST_PER_CALL_AUD, default A$0.06). The service
// doesn't report its token counts, so we estimate. From its README ("Costs"): its
// model costs US$4 per million input tokens, US$20 per million output tokens and
// US$0.20 per million cached instruction tokens; a typical angle is about US$0.02
// (≈6,200 cached instruction tokens, a few hundred of the person's words, up to
// ≈1,000 output tokens) and an answer it regenerates once is about double. At
// roughly A$1.55 to US$1 that is ≈A$0.03 typical, ≈A$0.06 regenerated. Every call
// is charged at the regenerated figure, so the monthly cap is a cautious ceiling.
// The service's own worst case per call is ≈US$0.31 (≈A$0.48), bounded on its side
// by its daily spending cap; set the estimate to 0.48 for a cap that holds even then.
//
// Who pays: a call is counted as billed unless it clearly never reached the model:
// nothing sent to /v1/angle (not configured, no session), the service's own limits or spending cap (429,
// capacity), a refused request (4xx), the service not configured (503), text with
// nothing to read (unclear), or the service's mock model. Anything uncertain (a
// timeout, a network error mid-request, a 500, a quality or safety fallback, a
// support answer that may have come from the model) is counted, so the ledger errs
// towards stopping early.

// (through deps.js: the vendored copy of core/perspectives.js, so a deploy carries it)
import { anotherAngleProvider } from './deps.js';

export const ANOTHER_ANGLE_DEFAULTS = Object.freeze({ timeoutMs: 20e3, costPerCallAud: 0.06 });

const NOT_BILLED = new Set(['unconfigured', 'session', 'limit', 'capacity', 'unclear', 'mock', 'http-503']);
const REASON = { limit: 'rate-limited', capacity: 'over-budget' };    // the service's words → the Mallow's
const DEVICE_ID = /^[A-Za-z0-9_-]{16,128}$/;

const str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const num = (v, d, lo, hi) => { const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN; return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };

/** Only HTTPS, or plain HTTP to this machine (local development and tests): tokens and words never cross a network in the clear. */
function safeBase(url) {
  const s = str(url);
  if (!s) return null;
  try {
    const u = new URL(s);
    const local = u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === '[::1]';
    if (u.protocol !== 'https:' && !(u.protocol === 'http:' && local)) return null;
    return `${u.origin}${u.pathname.replace(/\/+$/, '')}`;
  } catch { return null; }
}

/**
 * The adapter's configuration from the Edge Function's environment.
 * env: a plain object (Deno.env.toObject(), process.env) or a getter (name) => value.
 *   ANOTHER_ANGLE_URL                 the deployment, e.g. https://another-angle.<account>.workers.dev (or HUSHMATES_AI_URL)
 *   ANOTHER_ANGLE_SERVICE_TOKEN       a bearer token the service issued for Hushmates (or HUSHMATES_AI_TOKEN), or:
 *   ANOTHER_ANGLE_DEVICE_ID           Hushmates' own stable id for POST /v1/session (16–128 letters, digits, - or _)
 *   ANOTHER_ANGLE_INVITE              the service's tester invite code, if it asks for one
 *   ANOTHER_ANGLE_TIMEOUT_MS          default 20000 (1000–60000)
 *   ANOTHER_ANGLE_COST_PER_CALL_AUD   default 0.06 (see the estimate above)
 */
export function anotherAngleSettings(env = {}) {
  const get = typeof env === 'function' ? env : (k) => env?.[k];
  const deviceId = str(get('ANOTHER_ANGLE_DEVICE_ID'));
  return {
    baseUrl: safeBase(get('ANOTHER_ANGLE_URL') || get('HUSHMATES_AI_URL')),
    serviceToken: str(get('ANOTHER_ANGLE_SERVICE_TOKEN')) || str(get('HUSHMATES_AI_TOKEN')),
    deviceId: deviceId && DEVICE_ID.test(deviceId) ? deviceId : null,
    invite: str(get('ANOTHER_ANGLE_INVITE')),
    timeoutMs: num(get('ANOTHER_ANGLE_TIMEOUT_MS'), ANOTHER_ANGLE_DEFAULTS.timeoutMs, 1000, 60e3),
    costPerCallAud: num(get('ANOTHER_ANGLE_COST_PER_CALL_AUD'), ANOTHER_ANGLE_DEFAULTS.costPerCallAud, 0, 10),
  };
}

/**
 * createAnotherAngle({ baseUrl, serviceToken, deviceId, invite, timeoutMs, costPerCallAud, fetch, now })
 *   → async ({ text, label, mallow, estimateAud?, signal? }) →
 *        { status: 'ok', text, source: 'ai', model, mallow, costAud, inputTokens: null, outputTokens: null, ms }
 *      | { status: 'support', level: 'crisis' | 'care', costAud, ms }
 *      | { status: 'unavailable', reason, costAud, ms }       reason: unconfigured, timeout, rate-limited, over-budget, mock, http-<n>, …
 * Only the words and the label are sent (what the service's API takes); never who wrote them or which feeling it is.
 */
export function createAnotherAngle({ baseUrl, serviceToken = null, deviceId = null, invite = null, timeoutMs = ANOTHER_ANGLE_DEFAULTS.timeoutMs,
  costPerCallAud = ANOTHER_ANGLE_DEFAULTS.costPerCallAud, fetch: doFetch = globalThis.fetch, now = () => Date.now() } = {}) {
  const base = safeBase(baseUrl);
  const token = str(serviceToken);
  const device = str(deviceId) && DEVICE_ID.test(deviceId) ? deviceId : null;
  const limitMs = num(timeoutMs, ANOTHER_ANGLE_DEFAULTS.timeoutMs, 50, 120e3);

  // a session for Hushmates itself: a token the service issued, or one asked for with Hushmates' own device id,
  // kept for later calls (the service limits new sessions) and shared by calls that need one at the same time
  let held = null;
  let asking = null;
  const askSession = async () => {
    const ctl = typeof AbortController === 'function' ? new AbortController() : null;
    const t = setTimeout(() => ctl?.abort(), limitMs);
    try {
      const res = await doFetch(`${base}/v1/session`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, signal: ctl?.signal,
        body: JSON.stringify({ device_id: device, ...(str(invite) ? { invite: str(invite) } : {}) }),
      });
      if (!res.ok) return null;
      const j = await res.json();
      return typeof j?.token === 'string' && j.token ? j.token : null;
    } catch { return null; } finally { clearTimeout(t); }
  };
  const session = token ? async () => token
    : device ? async () => {
      if (held) return held;
      asking ||= askSession().finally(() => { asking = null; });
      held = await asking;
      return held;
    }
      : null;
  const configured = !!(base && session && typeof doFetch === 'function');

  const provider = async ({ text, label = null, estimateAud, signal } = {}) => {
    const t0 = now();
    const est = num(estimateAud, num(costPerCallAud, ANOTHER_ANGLE_DEFAULTS.costPerCallAud, 0, 10), 0, 10);
    const out = (r) => ({ ...r, ms: Math.max(0, now() - t0) });
    if (!configured) return out({ status: 'unavailable', reason: 'unconfigured', costAud: 0 });
    let timer;
    const stop = new Promise((resolve) => {
      timer = setTimeout(() => resolve({ status: 'unavailable', reason: 'timeout' }), limitMs + 100);   // a deadline of our own, too
      signal?.addEventListener?.('abort', () => resolve({ status: 'unavailable', reason: 'timeout' }), { once: true });
    });
    // one provider per call (the session is shared above), so we know whether this call's words reached the model's door
    let reached = false;
    const callFetch = async (url, init) => {
      const angle = String(url).endsWith('/v1/angle');
      if (angle) reached = true;
      const res = await doFetch(url, init);
      if (angle && res.status === 401 && !token) held = null;          // a fresh session, once (the provider retries)
      return res;
    };
    const inner = anotherAngleProvider({ baseUrl: base, session, fetch: callFetch, timeoutMs: limitMs });
    let r;
    try { r = await Promise.race([inner({ text, label }), stop]); } catch { r = { status: 'unavailable', reason: 'network' }; } finally { clearTimeout(timer); }
    if (!reached) {
      // nothing was sent to /v1/angle (no session, too slow to get one): nothing could have been billed
      return out({ status: 'unavailable', reason: r?.reason === 'timeout' ? 'timeout' : String(r?.reason || 'session'), costAud: 0 });
    }
    if (r?.status === 'support') return out({ status: 'support', level: r.level === 'crisis' ? 'crisis' : 'care', costAud: est });
    if (r?.status === 'ok' && r.source === 'ai' && typeof r.text === 'string' && r.text) {
      return out({ status: 'ok', text: r.text, source: 'ai', model: `another-angle:${r.model || 'unknown'}`, mallow: r.mallow || null,
        costAud: est, inputTokens: null, outputTokens: null });
    }
    // the service's mock model answered: a placeholder, never shown as AI, and free
    const reason = r?.status === 'ok' ? 'mock' : String(r?.reason || 'unavailable');
    const billed = !(NOT_BILLED.has(reason) || /^http-4\d\d$/.test(reason));
    return out({ status: 'unavailable', reason: REASON[reason] || reason, costAud: billed ? est : 0 });
  };
  provider.providerName = 'another-angle';
  provider.configured = configured;
  return provider;
}
