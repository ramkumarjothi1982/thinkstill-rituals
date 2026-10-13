// Sign-in configuration: the one Supabase project hushmallow may talk to.
//
// Checked twice with the same code: when the site is built
// (tools/site/auth-config.mjs refuses to publish anything else) and in the
// browser (resolveAuthConfig() switches sign-in off rather than talk to a
// project it does not know). Pure ES module, no DOM, no network.
//
// Only two PUBLIC values ever reach the browser: the project URL and the
// publishable key (sb_publishable_…, public by design; Row Level Security
// is what protects the data). A secret key (sb_secret_…) or a service_role
// JWT is refused everywhere, in every mode.
//
// Modes (HM_AUTH_MODE at build time, `mode` in the published file):
//   production  the default: exactly PROJECT_URL + an sb_publishable_ key
//   dev / ci    additionally http(s)://localhost:<port> or 127.0.0.1:<port>
//               (the fake server or a local Supabase stack), and a local
//               stack's legacy anon JWT; such a build only runs on localhost.
// No mode accepts any other *.supabase.co project (the retired Singapore
// project included).

/** hushmallow1, Sydney (ap-southeast-2). */
export const PROJECT_REF = 'igbxbfuaoybfzsroxuln';
export const PROJECT_NAME = 'hushmallow1';
export const PROJECT_REGION = 'ap-southeast-2';
export const PROJECT_URL = 'https://igbxbfuaoybfzsroxuln.supabase.co';
export const MODES = Object.freeze(['production', 'dev', 'ci']);
export const DEV_HOSTS = Object.freeze(['localhost', '127.0.0.1']);
/** The key the localhost-only `?authDev=<port>` override uses (the fake server accepts any publishable key). */
export const DEV_KEY = 'sb_publishable_hushmallow_local_dev_only';

const SUPABASE_URL_RE = /^https:\/\/([a-z0-9]{20})\.supabase\.co\/?$/;
const LOCAL_URL_RE = /^(https?):\/\/(localhost|127\.0\.0\.1):(\d{2,5})\/?$/;
const PUBLISHABLE_RE = /^sb_publishable_[A-Za-z0-9_-]{16,128}$/;
const JWT_RE = /^[A-Za-z0-9_-]{8,}\.([A-Za-z0-9_-]{8,})\.[A-Za-z0-9_-]{8,}$/;

function b64urlJson(part) {
  try {
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((part.length + 3) % 4);
    const text = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
    return JSON.parse(text);
  } catch { return null; }
}

/**
 * What kind of key this is (never echoes it):
 * 'publishable' | 'secret' | 'anon-jwt' | 'service-jwt' | 'other-jwt' | 'empty' | 'invalid'.
 */
export function classifyKey(key) {
  if (key == null || key === '') return 'empty';
  if (typeof key !== 'string') return 'invalid';
  if (/^sb_secret_/i.test(key)) return 'secret';
  if (PUBLISHABLE_RE.test(key)) return 'publishable';
  const m = JWT_RE.exec(key);
  if (m) {
    const p = b64urlJson(m[1]);
    if (!p || typeof p !== 'object') return 'invalid';
    if (p.role === 'service_role' || p.role === 'supabase_admin' || p.role === 'postgres') return 'service-jwt';
    if (p.role === 'anon') return 'anon-jwt';
    return 'other-jwt';
  }
  if (/service_role/i.test(key)) return 'service-jwt';
  return 'invalid';
}

/** A short, safe label for logs: the first 15 characters, never the whole key. */
export const keyLabel = (key) => (typeof key === 'string' && key ? `${key.slice(0, 15)}…` : '(none)');

/**
 * Validate the two public values.
 *   validatePublicConfig({ url, key, mode }) →
 *     { ok: true, enabled: false }                                   (neither set: sign-in off)
 *     { ok: true, enabled: true, url, key, ref, mode, local }        (url normalised: no trailing slash)
 *     { ok: false, error }                                           (a sentence for the build log)
 */
export function validatePublicConfig({ url = '', key = '', mode = 'production' } = {}) {
  if (!MODES.includes(mode)) return { ok: false, error: `HM_AUTH_MODE must be empty, "dev" or "ci" (got "${String(mode).slice(0, 20)}")` };
  const hasUrl = url != null && url !== '';
  const hasKey = key != null && key !== '';
  const kind = classifyKey(key);
  // refusals that hold in every mode, even when the other value is missing
  if (kind === 'secret') return { ok: false, error: 'SUPABASE_PUBLISHABLE_KEY is a secret key (sb_secret_…). Only the publishable key may ever reach the browser: remove the secret from this build and rotate it in Supabase if it was exposed.' };
  if (kind === 'service-jwt') return { ok: false, error: 'SUPABASE_PUBLISHABLE_KEY is a service_role key. It bypasses every security rule and must never be in a build: remove it and rotate it in Supabase.' };
  if (!hasUrl && !hasKey) return { ok: true, enabled: false };
  if (!hasUrl || !hasKey) return { ok: false, error: 'SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be set together (or both left empty to build without sign-in).' };
  if (typeof url !== 'string' || /\s/.test(url)) return { ok: false, error: 'SUPABASE_URL contains spaces or line breaks.' };
  if (typeof key !== 'string' || /\s/.test(key)) return { ok: false, error: 'SUPABASE_PUBLISHABLE_KEY contains spaces or line breaks.' };

  const sb = SUPABASE_URL_RE.exec(url);
  const local = LOCAL_URL_RE.exec(url);
  if (sb) {
    if (sb[1] !== PROJECT_REF) return { ok: false, error: `SUPABASE_URL points at project ${sb[1]}, not ${PROJECT_NAME} (${PROJECT_REF}). Only ${PROJECT_URL} may be used.` };
    if (kind !== 'publishable') return { ok: false, error: `SUPABASE_PUBLISHABLE_KEY must be the project's publishable key (sb_publishable_…); got a ${kind} key.` };
    return { ok: true, enabled: true, url: PROJECT_URL, key, ref: PROJECT_REF, mode, local: false };
  }
  if (local) {
    if (mode === 'production') return { ok: false, error: `SUPABASE_URL ${url} is a local address; set HM_AUTH_MODE=dev or ci for a local build (production builds use ${PROJECT_URL} only).` };
    const port = +local[3];
    if (!(port >= 1 && port <= 65535)) return { ok: false, error: 'SUPABASE_URL has an invalid port.' };
    if (kind !== 'publishable' && kind !== 'anon-jwt') return { ok: false, error: `SUPABASE_PUBLISHABLE_KEY must be a publishable key or a local stack's anon key; got a ${kind} key.` };
    return { ok: true, enabled: true, url: `${local[1]}://${local[2]}:${port}`, key, ref: local[2] === 'localhost' ? 'localhost' : '127', mode, local: true };
  }
  if (/\.supabase\.(co|in|net)\b/i.test(url)) return { ok: false, error: `SUPABASE_URL must be exactly ${PROJECT_URL} (https, no path, no other project).` };
  return { ok: false, error: `SUPABASE_URL must be ${PROJECT_URL}${mode === 'production' ? '' : ' or a localhost address (dev/ci builds)'}; "${url.slice(0, 60)}" is not.` };
}

/** supabase-js's default storage key for a project URL: sb-<first host label>-auth-token. */
export function storageKeyFor(url) {
  try { return `sb-${new URL(url).hostname.split('.')[0]}-auth-token`; } catch { return null; }
}

const OFF = (reason) => Object.freeze({ enabled: false, reason, url: null, key: null, ref: null, mode: null, storageKey: null, dev: false });

/**
 * The configuration this page runs with (synchronous; called once at boot).
 *   published  the build's public-config.js default export
 *   loc        location ({ hostname, protocol, search })
 *   session    sessionStorage-like (for the localhost-only dev override)
 * Localhost only: `?authDev=<port>` points sign-in at a local fake or stack on
 * this machine for the rest of the tab (`?authDev=off` clears it).
 */
export function resolveAuthConfig({ published = null, loc = globalThis.location, session = safeSession() } = {}) {
  const host = loc?.hostname || '';
  const onDevHost = DEV_HOSTS.includes(host);
  if (onDevHost) {
    let port = null;
    try {
      const q = new URLSearchParams(loc.search || '').get('authDev');
      if (q === 'off' || q === '0') session?.removeItem('hm2:authDev');
      else if (q && /^\d{2,5}$/.test(q)) { port = q; session?.setItem('hm2:authDev', q); }
      if (!port && q !== 'off' && q !== '0') { const s = session?.getItem('hm2:authDev'); if (s && /^\d{2,5}$/.test(s)) port = s; }
    } catch { /* no override */ }
    if (port) {
      const url = `${loc.protocol === 'https:' ? 'https:' : 'http:'}//${host}:${port}`;
      return Object.freeze({ enabled: true, reason: 'dev-override', url, key: DEV_KEY, ref: host === 'localhost' ? 'localhost' : '127', mode: 'dev', storageKey: storageKeyFor(url), dev: true });
    }
  }
  if (!published || published.enabled !== true) return OFF('not-configured');
  const mode = published.mode || 'production';
  const v = validatePublicConfig({ url: published.url, key: published.key, mode });
  if (!v.ok || !v.enabled) return OFF('invalid');
  // a dev / ci build talks to a server on this machine: it never runs on a public host
  if (v.local && !onDevHost) return OFF('local-config-on-public-host');
  return Object.freeze({ enabled: true, reason: 'configured', url: v.url, key: v.key, ref: v.ref, mode, storageKey: storageKeyFor(v.url), dev: v.local });
}

function safeSession() { try { return globalThis.sessionStorage || null; } catch { return null; } }

/** The published module's source (tools/site/auth-config.mjs writes it). Only the validated public values. */
export function publicConfigModule(v, { stamp = '' } = {}) {
  const head = '// Generated by tools/build-site.sh: the public sign-in values for this build.\n'
    + '// Only the project URL and the publishable key (public by design). Nothing else, ever.\n'
    + (stamp ? `// ${stamp}\n` : '');
  const body = v.enabled
    ? { enabled: true, url: v.url, key: v.key, mode: v.mode }
    : { enabled: false };
  return `${head}export default Object.freeze(${JSON.stringify(body)});\n`;
}
