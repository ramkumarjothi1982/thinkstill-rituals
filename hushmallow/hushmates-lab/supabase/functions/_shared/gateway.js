// The Hushmates Edge Function's logic: the only door to the database.
//
// Runs on Supabase (Deno) and under Node in tests: only Web APIs (Request, Response,
// fetch, crypto.subtle) and injected dependencies.
//   · who is calling comes only from a verified access token (issuer + subject);
//   · only allow-listed methods; bodies are JSON and small; other sites can't call it
//     (CORS lists the app's own origins);
//   · people's words are screened here (the shared safety lexicon) and encrypted before
//     they reach the database; everything that comes back is decrypted here;
//   · the Mallow (Reframe library by default, AI only behind its switch) is asked here;
//   · the database does the rest, in transactions (supabase/migrations).

import { screenFeeling, screenReframe, providerSupport } from './deps.js';
import { normaliseText, charCount, checkPseudonym } from './deps.js';
import { LABEL_IDS } from './deps.js';
import { RELAY_MESSAGES } from './deps.js';
import { formatExport } from './deps.js';

export const CLIENT_METHODS = [
  'me', 'savePreferences', 'redeemInvite',
  'submitFeeling', 'listJourneys', 'getJourney', 'withdrawFeeling', 'askMallow', 'markMallowSeen', 'resendJourney', 'setGiftSharing', 'withdrawPerspective',
  'markReturnSeen', 'choosePerspective', 'saveJourney', 'releaseJourney', 'deleteJourney',
  'findFeeling', 'catchFeeling', 'letFloatPast', 'submitReframe', 'myGifts',
  'reportFeeling', 'reportPerspective', 'blockContributor', 'exportMyData', 'deleteMyData',
];
export const MODERATOR_METHODS = ['modListReports', 'modGetReport', 'modResolve', 'modAuditLog'];
const METHODS = new Set([...CLIENT_METHODS, ...MODERATOR_METHODS]);
const CLIENT_ID = /^[a-z0-9_-]{8,64}$/i;
const STATUS = { 'not-signed-in': 401, forbidden: 403, 'account-inactive': 403, 'not-found': 404, 'rate-limited': 429, invalid: 400, 'invite-required': 403 };
const GENTLE = 'Something went wrong on our side. Please try again in a moment.';
const MAX_BODY = 64 * 1024;

export class GatewayError extends Error {
  constructor(code, message) {
    super(message || RELAY_MESSAGES[code] || 'Something went wrong. Please try again.');
    this.name = 'GatewayError';
    this.code = code;
    this.human = true;
  }
}
const fail = (code, message) => { throw new GatewayError(code, message); };

/**
 * deps:
 *   db        { rpc(fn, params) → Promise<json> }  (functions in schema hushmates_api)
 *   verifier  { verify(token) → Promise<{ iss, sub, provider }> }  (supabase/functions/_shared/jwt.js)
 *   crypt     { encrypt, decrypt, mac, decryptDeep }  (supabase/functions/_shared/fieldcrypt.js)
 *   mallow    { perspective({ text, label, mallow, memberId, journeyId, recentAngles }) }  (supabase/functions/_shared/mallow.js)
 *   authAdmin { deleteUser({ issuer, subject }) }   ends the person's sign-in identity when they delete their data
 *   config    { allowedOrigins: [..], jobSecret, ownIssuers: [..] }
 */
export function createGateway({ db, verifier, crypt, mallow, authAdmin = null, config = {}, log = console, now = () => Date.now() }) {
  let settingsCache = null;
  let settingsAt = 0;
  async function settings() {
    if (!settingsCache || now() - settingsAt > 30e3) { settingsCache = await db.rpc('settings', {}); settingsAt = now(); }
    return settingsCache;
  }
  const limits = async () => (await settings()).limits || {};

  async function rpc(who, method, args, ctx = {}) {
    const out = await db.rpc('rpc', { p_issuer: who.iss, p_subject: who.sub, p_method: method, p_args: args, p_ctx: { provider: who.provider || 'hushmates', ...ctx } });
    if (out && typeof out === 'object' && out.error) fail(out.error.code, out.error.message || undefined);
    return out;
  }
  const open = (value) => crypt.decryptDeep(value);
  const sealed = async (text) => ({ textEnc: await crypt.encrypt(text), textMac: await crypt.mac(text) });

  // --------------------------------------------------------------- methods --
  const special = {
    async submitFeeling(who, a) {
      if (typeof a.clientId !== 'string' || !CLIENT_ID.test(a.clientId)) fail('invalid');
      if (a.label != null && !LABEL_IDS.includes(a.label)) fail('invalid');
      const L = await limits();
      const screen = screenFeeling(a.text, { minChars: L.feelingMinChars, maxChars: L.feelingMaxChars });
      // a safety concern is answered with support first: never circulated, never stored
      if (!screen.ok && screen.code === 'support') return { status: 'support', level: screen.level, support: screen.support };
      if (!screen.ok) fail(`feeling-${screen.code}`, screen.message);
      return rpc(who, 'submitFeeling', {
        clientId: a.clientId, label: a.label ?? null, mallow: a.mallow, allowFallback: a.allowFallback === true, consent: a.consent === true,
        ...(await sealed(screen.text)),
      });
    },

    async submitReframe(who, a) {
      if (typeof a.clientId !== 'string' || !CLIENT_ID.test(a.clientId)) fail('invalid');
      const p = await rpc(who, 'submitReframe:prepare', { holdId: a.holdId, clientId: a.clientId });
      if (p.duplicate) return p.duplicate;
      const L = await limits();
      const earlier = await Promise.all((p.prepare.earlier || []).map((t) => crypt.decrypt(t)));
      const screen = screenReframe(a.text, { minChars: L.reframeMinChars, maxChars: L.reframeMaxChars, earlier, threshold: L.similarity });
      if (!screen.ok && screen.code === 'support') {
        // the writer may not be safe: support for them; their words are never stored, and the feeling floats on
        await rpc(who, 'submitReframe:support', { holdId: a.holdId });
        return { status: 'support', level: screen.level, support: screen.support };
      }
      if (!screen.ok) fail(`reframe-${screen.code}`, screen.message);
      const c = await rpc(who, 'submitReframe:commit', { holdId: a.holdId, clientId: a.clientId, allowShare: a.allowShare === true, ...(await sealed(screen.text)) });
      return c.duplicate || c;
    },

    async resendJourney(who, a) {
      if (typeof a.clientId !== 'string' || !CLIENT_ID.test(a.clientId)) fail('invalid');
      const r = await rpc(who, 'resendJourney:check', { journeyId: a.journeyId, clientId: a.clientId });
      if (r.duplicate) return r;
      const L = await limits();
      const screen = screenFeeling(await crypt.decrypt(r.check.text), { minChars: L.feelingMinChars, maxChars: L.feelingMaxChars });
      if (!screen.ok && screen.code === 'support') return { status: 'support', level: screen.level, support: screen.support };
      if (!screen.ok) fail(`feeling-${screen.code}`, screen.message);
      const args = { journeyId: a.journeyId, clientId: a.clientId };
      if (a.allowFallback === true || a.allowFallback === false) args.allowFallback = a.allowFallback;
      return rpc(who, 'resendJourney:commit', args);
    },

    async askMallow(who, a) {
      const r = await rpc(who, 'askMallow', { journeyId: a.journeyId, consent: a.consent === true });
      if (!r.reserved) return r;
      return completeMallow(who, r.reserved);
    },

    async reportFeeling(who, a) { return rpc(who, 'reportFeeling', { holdId: a.holdId, reason: a.reason, ...(await details(a.details)) }); },
    async reportPerspective(who, a) { return rpc(who, 'reportPerspective', { journeyId: a.journeyId, perspectiveId: a.perspectiveId, reason: a.reason, ...(await details(a.details)) }); },

    async modResolve(who, a) {
      const note = normaliseText(a.note || '').slice(0, 1000);
      return rpc(who, 'modResolve', { id: a.id, action: a.action, noteEnc: note ? await crypt.encrypt(note) : '' });
    },

    async redeemInvite(who, a, ctx) {
      const name = checkPseudonym(typeof a.name === 'string' ? a.name : '');
      if (!name.ok) fail('invalid', name.message);
      const code = normaliseCode(a.code);
      if (!code) fail('invite-invalid');
      return rpc(who, 'redeemInvite', { codeMac: await crypt.mac(`invite:${code}`), name: name.text, adult: a.adult === true }, ctx);
    },

    async exportMyData(who) { return formatExport(await open(await rpc(who, 'exportMyData', {}))); },

    async deleteMyData(who, a) {
      const r = await rpc(who, 'deleteMyData', { confirm: a.confirm });
      // the person's sign-in identity goes too (only identities this project issues; never another app's)
      for (const id of r.identities || []) {
        if (!authAdmin || !(config.ownIssuers || []).includes(id.issuer)) continue;
        try { await authAdmin.deleteUser(id); } catch (e) { log.error?.('could not delete a sign-in identity', e?.message); }
      }
      return { deleted: true };
    },
  };

  async function details(text) {
    const note = normaliseText(text || '');
    return { detailsTooLong: charCount(note) > 600, detailsEnc: note && charCount(note) <= 600 ? await crypt.encrypt(note) : '' };
  }

  /** Ask the Mallow (hybrid: library by default, AI only behind its switch) and record what came back. */
  async function generate({ journeyId, text, label, mallow: mallowId, memberId, recentAngles = [] }) {
    const words = await crypt.decrypt(text);
    const screen = screenFeeling(words, { maxChars: 2000 });
    if (!screen.ok) return { status: 'failed', reason: 'safety' };            // flagged words never reach a provider
    let r;
    try { r = await mallow.perspective({ text: screen.text, label, mallow: mallowId, memberId, journeyId, recentAngles }); } catch (e) {
      log.error?.('Mallow perspective failed', e?.message);
      r = { status: 'unavailable', reason: 'error' };
    }
    if (r?.status === 'support') {
      return { status: 'support', support: providerSupport(), detailsEnc: await crypt.encrypt('The Mallow provider’s safety check flagged this feeling.') };
    }
    const clean = r?.status === 'ok' ? normaliseText(r.text) : '';
    // the Mallow's words meet the same standard as a person's (kind, no diagnosis, no contact details)
    if (r?.status === 'ok' && ['ai', 'library'].includes(r.source) && clean && screenReframe(clean, { minChars: 1, maxChars: 600 }).ok) {
      return { status: 'ok', text: await crypt.encrypt(clean), source: r.source, model: r.model || null, angleId: r.angleId || null,
        voice: r.mallow && r.mallow !== mallowId ? r.mallow : null };
    }
    return { status: 'failed', reason: r?.reason === 'timeout' ? 'timeout' : 'unavailable' };
  }
  async function completeMallow(who, reserved) {
    const ctx = await rpc(who, 'mallowContext', {});
    const result = await generate({ ...reserved, recentAngles: ctx.recentAngles || [] });
    const view = await db.rpc('mallow_complete', { p_issuer: who.iss, p_subject: who.sub, p_journey: reserved.journeyId, p_result: result });
    if (view?.error) fail(view.error.code, view.error.message || undefined);
    return view;
  }

  /** One call, as the verified person. → the answer (decrypted), or throws GatewayError. */
  async function call(who, method, args = {}, ctx = {}) {
    if (!METHODS.has(method)) fail('not-found');
    const a = args && typeof args === 'object' && !Array.isArray(args) ? args : {};
    const out = special[method] ? await special[method](who, a, ctx) : await rpc(who, method, a, ctx);
    return open(out);
  }

  // ------------------------------------------------------------------ jobs --
  /** The scheduler's minute: time's effects, then any Mallow perspectives waiting to be written. */
  async function tick({ batch = 10 } = {}) {
    const t = await db.rpc('job_tick', {});
    let written = 0;
    for (;;) {
      const claimed = await db.rpc('job_mallow_claim', { p_limit: batch });
      if (!claimed?.length) break;
      for (const c of claimed) {
        const result = await generate(c);
        await db.rpc('job_mallow_complete', { p_journey: c.journeyId, p_result: result });
        written += 1;
      }
      if (claimed.length < batch) break;
    }
    return { ...t, mallowWritten: written };
  }

  // ------------------------------------------------------------------ HTTP --
  function cors(req) {
    const origin = req.headers.get('origin');
    const allowed = origin && (config.allowedOrigins || []).includes(origin);
    return allowed ? {
      'access-control-allow-origin': origin, vary: 'Origin',
      'access-control-allow-headers': 'authorization, apikey, content-type, x-hushmates, x-client-info',
      'access-control-allow-methods': 'POST, GET, OPTIONS', 'access-control-max-age': '600',
    } : {};
  }
  const json = (req, status, body) => new Response(JSON.stringify(body), {
    status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...cors(req) },
  });
  async function readJson(req) {
    const text = await req.text();
    if (text.length > MAX_BODY) fail('invalid');
    if (!text) return {};
    try { return JSON.parse(text); } catch { fail('invalid'); }
    return {};
  }
  const sameSecret = async (a, b) => {
    if (typeof a !== 'string' || typeof b !== 'string' || !b) return false;
    const [x, y] = await Promise.all([crypt.mac(`job:${a}`), crypt.mac(`job:${b}`)]);
    return x === y;
  };
  const netOf = async (req) => {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
    return (await crypt.mac(`net:${ip}`)).slice(0, 16);               // never stored as an address
  };

  async function handle(req) {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^.*\/hushmates(?=\/|$)/, '') || '/';
    try {
      if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });
      if (path === '/health' && req.method === 'GET') return json(req, 200, { ok: true });
      if (path === '/jobs/tick' || path === '/jobs/retention') {
        if (req.method !== 'POST' || !(await sameSecret(req.headers.get('x-hushmates-job'), config.jobSecret))) return json(req, 404, { ok: false, code: 'not-found', message: RELAY_MESSAGES['not-found'] });
        const result = path === '/jobs/tick' ? await tick() : await db.rpc('job_retention', {});
        return json(req, 200, { ok: true, result });
      }
      const m = /^\/rpc\/([A-Za-z]{1,40})$/.exec(path);
      if (!m) return json(req, 404, { ok: false, code: 'not-found', message: RELAY_MESSAGES['not-found'] });
      if (req.method !== 'POST') return json(req, 405, { ok: false, code: 'invalid', message: RELAY_MESSAGES.invalid });
      if (!/^application\/json\b/i.test(req.headers.get('content-type') || '')) fail('invalid');
      const origin = req.headers.get('origin');
      if (origin && !(config.allowedOrigins || []).includes(origin)) fail('forbidden');
      const auth = req.headers.get('authorization') || '';
      const token = /^Bearer (.+)$/i.exec(auth)?.[1];
      if (!token) fail('not-signed-in');
      const who = await verifier.verify(token).catch(() => fail('not-signed-in'));
      const body = await readJson(req);
      const result = await call(who, m[1], body?.args, { net: await netOf(req) });
      return json(req, 200, { ok: true, result });
    } catch (e) {
      if (e?.name === 'GatewayError' || e?.code === 'not-signed-in') {
        return json(req, STATUS[e.code] || 409, { ok: false, code: e.code, message: e.message });
      }
      log.error?.('gateway error', e?.message || e);                 // details stay in the function's log
      return json(req, 500, { ok: false, code: 'error', message: GENTLE });
    }
  }

  return { handle, call, tick, retention: () => db.rpc('job_retention', {}), settings };
}

/** Invitation codes are read forgivingly: case, spaces and dashes don't matter. */
export function normaliseCode(v) {
  const s = typeof v === 'string' ? v.toUpperCase().replace(/[\s-]+/g, '') : '';
  return /^[A-Z0-9]{6,40}$/.test(s) ? s : '';
}
