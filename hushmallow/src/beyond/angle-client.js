// Another Angle — the client for our own server (server/another-angle).
//
// This file holds the ONE network call hushmallow makes besides reading its
// own version.json (tests/core.test.mjs allows exactly the `netFetch` line
// below, and only to the configured endpoint). It is loaded only through
// loadUltra() (hushmallow Beyond), and the experience calls it only after
// the person has said yes on the consent screen.
//
//   createAngleClient({ store, endpoint?, fetchImpl?, timeouts?, accountToken? }) →
//     { available, endpoint, angle({text, emotion, intention, previous}) → Promise<Result>,
//       feedback(rating, scene) → Promise<boolean>, deviceId(), forgetSession() }
//   Result: { status: 'ok'|'crisis'|'care'|'unclear'|'fallback'|'error', scene?, keepSupportClose, reason?, hint?, category? }
//
// What is sent: POST /v1/session { device_id, platform, app_version, invite? } and
// POST /v1/angle { consent: true, text, emotion?, intention?, previous_angles?,
// locale, request_id }; POST /v1/feedback { rating, reasoning_pattern,
// interaction_type, mallow_character, prompt_version }. Never photos, never
// an account, never anything else (the server rejects unknown fields too).
// The one exception, only with web subscriptions on (src/app/billing.js passes
// accountToken): /v1/session also carries the signed-in account's access
// token (Authorization: Bearer), so the server can check its hushmallow Beyond
// subscription itself; never with the words.
// Nothing here ever logs the person's words: only status codes and reasons.
//
// Never safe by default: a non-200, a network error, a timeout or an answer
// that fails validateScene() is { status: 'error' }, which the experience
// treats like a fallback (its own safety check, then the authored engine).
//
// Tester codes: while the server has TESTER_INVITE_CODES, /v1/session without
// a valid code answers 403 invite_required → { status: 'error', reason:
// 'invite' }. That answer is remembered (with the code it refused) until the
// stored code changes, or for INVITE_RETRY_MS, so each angle does not spend a
// session request of the network's daily allowance.

import { BUILD } from '../app/config.js';

/** The build's version for /v1/session: its date and the slice's short name ("2026-10-12 · the Hushfold slice"), never cut mid-word (review r9). */
export function appVersion(build = BUILD) {
  const parts = String(build || '').split(/\s+·\s+/u);
  const short = (parts[1] || '').replace(/\s*\(.*$/u, '').trim();
  const v = short ? `${parts[0]} · ${short}` : parts[0];
  return v.length <= 40 ? v : parts[0].slice(0, 40);
}
import { resolveEndpoint } from './endpoint.js';
import { STORE_KEYS } from './consent.js';
import { validateScene, previousAngles, PATTERNS, SCHEMA_VERSION } from './vocab.js';

export { resolveEndpoint };
export const PATHS = Object.freeze({ session: '/v1/session', angle: '/v1/angle', feedback: '/v1/feedback', health: '/v1/health' });
/**
 * Is this server ready for the person's words? GET /v1/health (no words, no id) must say ok, be the Another Angle
 * service, speak this client's scene schema and have its keys; a production server must not be the mock provider.
 * Anything else — a different schema version, a half-configured Worker, no answer — means the authored angles play.
 * Pure: (http, data, { dev }) → true | reason string.
 */
export function healthReady(http, data, { dev = false } = {}) {
  if (http !== 200 || !data || typeof data !== 'object') return 'health_unreachable';
  if (data.ok !== true || data.service !== 'another-angle') return 'health_not_ok';
  if (data.schema_version !== SCHEMA_VERSION) return 'schema_mismatch';
  if (data.configured?.signing_key !== true || data.configured?.provider_key !== true) return 'not_configured';
  if (!dev && data.provider === 'mock') return 'mock_provider';
  return true;
}
/** How long a ready answer from /v1/health is trusted (ms); a not-ready one only for this visit's client. */
export const HEALTH_TTL_MS = 10 * 60 * 1000;
/**
 * ms. The server's own model attempt is 15 s (it may retry once, up to 28 s), but nobody should watch waiting
 * lines for half a minute: the client waits a little over one attempt, then Zuzu's own angle plays (the
 * experience also caps the whole wait, session included, at ANGLE_BUDGET_MS in another-angle.js).
 */
export const TIMEOUTS = Object.freeze({ session: 6000, angle: 17000, feedback: 6000 });
/** How long an invite_required answer is trusted before one new session is tried (codes may have been switched off). */
export const INVITE_RETRY_MS = 12 * 3600000;

// THE network call (see the header): one place, one shape.
const netFetch = (url, init) => globalThis.fetch(url, init);

/** 16 random bytes, base64url (22 characters): the stable, meaningless id the server hashes for the daily allowance. */
export function makeDeviceId(random = (n) => globalThis.crypto.getRandomValues(new Uint8Array(n))) {
  const b = random(16);
  let s = '';
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const EMOTION_ID = /^[a-z][a-z-]{1,39}$/;
const INTENTION_ID = /^[a-z][a-z_-]{1,39}$/;
const ok200 = (r) => r && r.http === 200 && r.data && typeof r.data === 'object';

export function createAngleClient({ store, endpoint = resolveEndpoint(), fetchImpl = netFetch, timeouts = TIMEOUTS, random, now = () => Date.now(), platform = null, accountToken = null } = {}) {
  let session = null;   // { token, exp }
  let sessionReason = null;
  try { const s = store?.get(STORE_KEYS.session, null); if (s && typeof s.token === 'string' && s.exp > now() + 60000 && s.endpoint === endpoint) session = s; } catch { /* none */ }

  function deviceId() {
    let id = null;
    try { id = store?.get(STORE_KEYS.device, null); } catch { id = null; }
    if (typeof id === 'string' && /^[A-Za-z0-9_-]{16,128}$/.test(id)) return id;
    id = makeDeviceId(random);
    try { store?.set(STORE_KEYS.device, id); } catch { /* kept for this visit only */ }
    return id;
  }

  /** One POST (or the health GET: body null). Never throws: { http, data, timedOut }. http 0 = no response. */
  async function post(path, body, { token = null, timeout = 10000 } = {}) {
    if (!endpoint || !Object.values(PATHS).includes(path)) return { http: 0, data: null, reason: 'no_endpoint' };
    const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    let timer = 0, timedOut = false;
    const clock = new Promise((resolve) => { timer = setTimeout(() => { timedOut = true; try { ctrl?.abort(); } catch { /* ignore */ } resolve({ http: 0, data: null, timedOut: true }); }, timeout); });
    const url = `${endpoint}${path}`;
    const init = body == null
      ? { method: 'GET', mode: 'cors', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', redirect: 'error', signal: ctrl?.signal }
      : {
        method: 'POST', mode: 'cors', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', redirect: 'error',
        headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body), signal: ctrl?.signal,
      };
    const work = (async () => {
      try {
        const res = await fetchImpl(url, init);
        let data = null;
        try { data = await res.json(); } catch { data = null; }
        return { http: res.status, data, timedOut: false };
      } catch { return { http: 0, data: null, timedOut }; }
    })();
    try { return await Promise.race([work, clock]); } finally { clearTimeout(timer); }
  }

  /** The stored tester code, when it is one the server would accept the shape of. */
  function storedInvite() {
    let v = null;
    try { v = store?.get(STORE_KEYS.invite, null); } catch { v = null; }
    return typeof v === 'string' && v.length >= 1 && v.length <= 64 ? v : null;
  }
  let inviteBlock = null;   // { invite, endpoint, at } this visit (also kept in the store)
  function inviteNeeded() {
    let b = inviteBlock;
    try { b = store?.get(STORE_KEYS.inviteNeeded, null) || b; } catch { /* memory only */ }
    return !!b && typeof b === 'object' && b.endpoint === endpoint && (b.invite ?? null) === storedInvite() && now() - (Number(b.at) || 0) < INVITE_RETRY_MS;
  }

  // the server's readiness (healthReady): asked before the first session of this client, trusted for HEALTH_TTL_MS
  let health = null;   // { ok: true | reason, at }
  const devEndpoint = (() => { try { return ['localhost', '127.0.0.1'].includes(new URL(endpoint).hostname); } catch { return false; } })();
  async function serverReady() {
    if (health && (health.ok !== true || now() - health.at < HEALTH_TTL_MS)) return health.ok;
    const r = await post(PATHS.health, null, { timeout: timeouts.session });
    health = { ok: r.http === 0 ? (r.timedOut ? 'timeout' : 'network') : healthReady(r.http, r.data, { dev: devEndpoint }), at: now() };
    return health.ok;
  }

  async function getToken(force = false) {
    if (!force && session && session.exp > now() + 60000) return session.token;
    session = null;
    // never a session (nor the words) with a server that is not ready: the authored angles play instead
    const ready = await serverReady();
    if (ready !== true) { sessionReason = ready; return null; }
    // the server asked for a tester code and the stored one has not changed since: no request
    if (inviteNeeded()) { sessionReason = 'invite'; return null; }
    const body = { device_id: deviceId(), platform: platform || (globalThis.webkit?.messageHandlers?.hushStore || globalThis.HushNative ? 'ios' : 'web'), app_version: appVersion() };
    const invite = storedInvite();
    if (invite) body.invite = invite;
    // web subscriptions on: the account's token, for the server's own subscription check (session only)
    let account = null;
    if (typeof accountToken === 'function') { try { account = await accountToken(); } catch { account = null; } }
    const r = await post(PATHS.session, body, { token: typeof account === 'string' && account ? account : null, timeout: timeouts.session });
    if (ok200(r) && r.data.status === 'ok' && typeof r.data.token === 'string') {
      const exp = Date.parse(r.data.expires_at);
      session = { token: r.data.token, exp: Number.isFinite(exp) ? exp : now() + 3600000, endpoint };
      try { store?.set(STORE_KEYS.session, session); } catch { /* memory only */ }
      inviteBlock = null;
      try { store?.remove(STORE_KEYS.inviteNeeded); } catch { /* ignore */ }
      sessionReason = null;
      return session.token;
    }
    if (r.http === 403 && r.data?.error?.code === 'invite_required') {
      inviteBlock = { invite, endpoint, at: now() };
      try { store?.set(STORE_KEYS.inviteNeeded, inviteBlock); } catch { /* this visit only */ }
      sessionReason = 'invite';
      return null;
    }
    sessionReason = r.http === 0 ? (r.timedOut ? 'timeout' : 'network') : r.http === 403 ? 'forbidden' : r.http === 429 ? 'limit' : `session_${r.http}`;
    return null;
  }

  /** The server's answer → what the experience does. */
  function read(r) {
    if (!r || r.http === 0) return { status: 'error', reason: r?.timedOut ? 'timeout' : (r?.reason || 'network'), keepSupportClose: false };
    if (r.http !== 200 || !r.data) return { status: 'error', reason: r.http === 429 ? 'limit' : r.http === 401 ? 'auth' : `http_${r.http}`, keepSupportClose: false };
    const d = r.data;
    const keep = d.keep_support_close === true;
    // (fix round) with the category the server names for it (support.category: the lexicon's, 'self-risk' from the risk
    // screener, 'general' from the model's own safety check), so the care lines fit; never any words
    const category = typeof d.support?.category === 'string' && /^[a-z-]{1,40}$/.test(d.support.category) ? d.support.category : null;
    if (d.status === 'crisis' || d.status === 'care') return { status: d.status, keepSupportClose: true, category };
    if (d.status === 'fallback') {
      const reason = typeof d.fallback?.reason === 'string' ? d.fallback.reason.slice(0, 20) : 'unknown';
      if (reason === 'unclear') return { status: 'unclear', reason, keepSupportClose: keep };
      const hp = d.fallback?.hint?.reasoning_pattern;
      return { status: 'fallback', reason, hint: PATTERNS.includes(hp) ? { reasoning_pattern: hp } : null, keepSupportClose: keep };
    }
    if (d.status === 'ok') {
      // (fix round) the model's own safety judgement is honoured before anything else: a scene it marked crisis or care is
      // support, never Zuzu's own angle, even when the rest of the scene would not pass validateScene (invalid_scene → the
      // authored angle)
      const flagged = d.scene && typeof d.scene === 'object' ? d.scene.safety_status : null;
      if (flagged === 'crisis' || flagged === 'care') return { status: flagged, keepSupportClose: true, category: 'general' };
      const scene = validateScene(d.scene);
      if (!scene) return { status: 'error', reason: 'invalid_scene', keepSupportClose: keep };
      if (scene.safety_status === 'crisis' || scene.safety_status === 'care') return { status: scene.safety_status, keepSupportClose: true, category: 'general' };
      const pv = typeof d.prompt_version === 'string' && /^angle-v\d{1,3}$/.test(d.prompt_version) ? d.prompt_version : null;
      return { status: 'ok', scene: { ...scene, source: 'server', prompt_version: pv }, keepSupportClose: keep };
    }
    return { status: 'error', reason: 'unknown_status', keepSupportClose: keep };
  }

  return {
    get available() { return !!endpoint; },
    get endpoint() { return endpoint; },
    deviceId,
    /** Ask for a scene. Call only after consent and after the app's own safety check. */
    async angle({ text, emotion = null, intention = null, previous = [] } = {}) {
      if (!endpoint) return { status: 'error', reason: 'no_endpoint', keepSupportClose: false };
      const words = String(text ?? '').trim().slice(0, 600);
      if (!words) return { status: 'unclear', reason: 'empty', keepSupportClose: false };
      // a server that is not ready (another schema, half configured, the mock in production) never gets the words,
      // not even on a session kept from before: the authored angles play instead
      const ready = await serverReady();
      if (ready !== true) return { status: 'error', reason: ready, keepSupportClose: false };
      const body = { consent: true, text: words, locale: 'en-GB', request_id: makeDeviceId(random).replace(/_/g, '-').slice(0, 20) };   // the server allows letters, digits and '-'
      if (typeof emotion === 'string' && EMOTION_ID.test(emotion)) body.emotion = emotion;
      if (typeof intention === 'string' && INTENTION_ID.test(intention)) body.intention = intention;
      const prev = previousAngles(previous);
      if (prev.length) body.previous_angles = prev;
      let token = await getToken();
      if (!token) return { status: 'error', reason: sessionReason || 'session', keepSupportClose: false };
      let r = await post(PATHS.angle, body, { token, timeout: timeouts.angle });
      // an expired or rotated token: one new session, one more try
      if (r.http === 401) {
        token = await getToken(true);
        if (!token) return { status: 'error', reason: sessionReason || 'session', keepSupportClose: false };
        r = await post(PATHS.angle, body, { token, timeout: timeouts.angle });
      }
      // a feeling or intention this server version doesn't know: ask again without it (the words matter most)
      if (r.http === 400 && ['emotion', 'intention'].includes(r.data?.error?.field)) {
        delete body[r.data.error.field];
        r = await post(PATHS.angle, body, { token, timeout: timeouts.angle });
      }
      return read(r);
    },
    /** One of the four buttons, about a server scene (no words). Fire and forget; true when it was accepted. */
    async feedback(rating, scene) {
      if (!endpoint || !scene || scene.source !== 'server' || !['helped', 'another_angle', 'not_relevant', 'just_squeeze'].includes(rating)) return false;
      const token = session?.token || null;
      if (!token) return false;
      const body = { rating, reasoning_pattern: scene.reasoning_pattern, interaction_type: scene.interaction_type, mallow_character: scene.mallow_character };
      if (scene.prompt_version) body.prompt_version = scene.prompt_version;
      const r = await post(PATHS.feedback, body, { token, timeout: timeouts.feedback });
      return r.http === 202 || r.http === 200;
    },
    forgetSession() { session = null; try { store?.remove(STORE_KEYS.session); } catch { /* ignore */ } },
  };
}
