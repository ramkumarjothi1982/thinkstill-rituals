// Sign-in readiness: production must never show a half-configured sign-in.
//
// A build can have the two public values (sign-in "on") while the Supabase
// project behind them is not ready yet: the tables were never created (the
// migrations not run), or email sign-up is not set up the way the app needs
// it (email sign-in switched off, or "Confirm email" off, which would let
// anyone sign up as any address). Before the account entry is shown, and
// before any sign-up, sign-in, resend or reset call, the app asks the
// project two public questions with the publishable key, once a session:
//
//   1. the schema: GET /rest/v1/profiles?select=user_id&limit=0
//        200                       present (rows the anon role may read: none)
//        401/403 + code 42501      present (the table is there; anon may not read it, by design: 0002_profiles.sql)
//        404 or code PGRST205      missing  → not ready ('schema-missing')
//   2. email sign-up: GET /auth/v1/settings
//        external.email true and mailer_autoconfirm false → ready
//        external.email not true   → not ready ('email-off')
//        mailer_autoconfirm true   → not ready ('autoconfirm-on')
//
// A development or CI build (a server on this machine: the fake in tools/auth/, a local Supabase stack;
// config.dev) may confirm sign-ups at once on purpose: there "Confirm email" off is allowed (the schema and
// email sign-in still count). Production (the hushmallow1 project) never allows it.
// Anything else (offline, a timeout, a 5xx, a key the gateway refuses) is
// 'unknown': not ready either, for this page only — a reload asks again.
// Definite answers are kept for the browser session (sessionStorage), so the
// questions go out at most once a session; nothing is ever retried in a loop.
// Not ready: sign-in stays hidden exactly as with sign-in off, one console
// info line says why, and guests are never affected (nothing waits on this).
// Pure ES module apart from the fetch and storage it is given (tests:
// tests/auth-readiness.test.mjs with tools/auth/fake-supabase.mjs).

export const READY_KEY = 'hm2:auth.ready';
export const READY_TIMEOUT_MS = 8000;
/** The reasons a project is not ready, as the console line words them. */
export const NOT_READY = Object.freeze({
  'schema-missing': 'the database tables are missing (run supabase/migrations on the project)',
  'email-off': 'email sign-in is switched off in Supabase Auth',
  'autoconfirm-on': '"Confirm email" is off in Supabase Auth (sign-ups would not be confirmed)',
  unknown: 'the project could not be checked just now (offline, a timeout or an error)',
});

const safe = (fn, d = null) => { try { return fn(); } catch { return d; } };

/** Reads a fetch Response's JSON body, or null. */
async function json(res) { try { return await res.json(); } catch { return null; } }

async function timed(fetchFn, url, init, ms) {
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const t = ctl ? setTimeout(() => ctl.abort(), ms) : 0;
  try { return await fetchFn(url, { ...init, signal: ctl?.signal }); } finally { clearTimeout(t); }
}

/** 'present' | 'missing' | 'unknown' from the schema question's answer. Pure. */
export function schemaFrom(status, body) {
  const code = body && typeof body === 'object' ? String(body.code ?? '') : '';
  if (code === 'PGRST205' || status === 404) return 'missing';
  if (status === 200 || status === 206) return 'present';
  if ((status === 401 || status === 403) && code === '42501') return 'present';
  return 'unknown';
}

/** { ready, reason } from the settings answer (a JSON object, or null). Pure. allowAutoconfirm: local builds only. */
export function settingsFrom(status, body, { allowAutoconfirm = false } = {}) {
  if (status !== 200 || !body || typeof body !== 'object') return { ready: false, reason: 'unknown' };
  if (body.external?.email !== true) return { ready: false, reason: 'email-off' };
  if (body.mailer_autoconfirm === true && allowAutoconfirm) return { ready: true, reason: 'ready' };
  if (body.mailer_autoconfirm !== false) return { ready: false, reason: body.mailer_autoconfirm === true ? 'autoconfirm-on' : 'unknown' };
  return { ready: true, reason: 'ready' };
}

/**
 * Ask the project once: → Promise<{ ready: boolean, reason: 'ready' | keyof NOT_READY, checked: { schema, settings } }>.
 * Never throws. config: the resolved sign-in config ({ enabled, url, key }).
 */
export async function probeReadiness(config, { fetchFn = globalThis.fetch, timeoutMs = READY_TIMEOUT_MS } = {}) {
  if (!config?.enabled || !config.url || !config.key || typeof fetchFn !== 'function') return { ready: false, reason: 'unknown', checked: null };
  const headers = { apikey: config.key, accept: 'application/json' };
  const base = String(config.url).replace(/\/+$/, '');
  const [schema, settings] = await Promise.all([
    timed(fetchFn, `${base}/rest/v1/profiles?select=user_id&limit=0`, { method: 'GET', headers, credentials: 'omit', cache: 'no-store' }, timeoutMs)
      .then(async (r) => schemaFrom(r.status, await json(r)), () => 'unknown'),
    timed(fetchFn, `${base}/auth/v1/settings`, { method: 'GET', headers, credentials: 'omit', cache: 'no-store' }, timeoutMs)
      .then(async (r) => settingsFrom(r.status, await json(r), { allowAutoconfirm: config.dev === true }), () => ({ ready: false, reason: 'unknown' })),
  ]);
  const checked = { schema, settings: settings.reason };
  if (schema === 'missing') return { ready: false, reason: 'schema-missing', checked };
  if (!settings.ready) return { ready: false, reason: settings.reason, checked };
  if (schema !== 'present') return { ready: false, reason: 'unknown', checked };
  return { ready: true, reason: 'ready', checked };
}

/**
 * The page's readiness check: createReadiness(config, { session, fetchFn, log }) → { check(), get result }.
 * check() → Promise<boolean> (true: the account entry may show), one question a page at most and a definite answer
 * kept for the session (keyed by the project URL). Not ready: one console info line, once.
 */
export function createReadiness(config, { session = safe(() => globalThis.sessionStorage), fetchFn = globalThis.fetch, log = (...a) => console.info(...a), timeoutMs = READY_TIMEOUT_MS } = {}) {
  let result = null, pending = null, said = false;
  const key = config?.url || '';
  const say = (r) => {
    if (said || r.ready) return;
    said = true;
    try { log(`[auth] sign-in is hidden: ${NOT_READY[r.reason] || r.reason}.`); } catch { /* no console */ }
  };
  const cached = () => {
    const raw = safe(() => session?.getItem(READY_KEY));
    const v = raw ? safe(() => JSON.parse(raw)) : null;
    return v && v.url === key && typeof v.ready === 'boolean' && typeof v.reason === 'string' && v.reason !== 'unknown' ? { ready: v.ready, reason: v.reason, cached: true } : null;
  };
  return {
    get result() { return result; },
    check() {
      if (result) { say(result); return Promise.resolve(result.ready); }
      if (!config?.enabled) { result = { ready: false, reason: 'off' }; return Promise.resolve(false); }
      const c = cached();
      if (c) { result = c; say(c); return Promise.resolve(c.ready); }
      pending ||= probeReadiness(config, { fetchFn, timeoutMs }).then((r) => {
        result = r;
        // (a definite answer for the session; 'unknown' — offline, a timeout — only for this page)
        if (r.reason !== 'unknown') safe(() => session?.setItem(READY_KEY, JSON.stringify({ url: key, ready: r.ready, reason: r.reason, at: Date.now() })));
        say(r);
        return r.ready;
      });
      return pending;
    },
  };
}
