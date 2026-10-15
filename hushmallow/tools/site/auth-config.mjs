// Writes the published sign-in config (called by tools/build-site.sh).
//   node tools/site/auth-config.mjs <config-out> [<version>] [<headers-out>]
//
// <headers-out> (the site's _headers, Cloudflare Pages) gets the whole site's
// security headers (tools/site/security-headers.mjs): an enforced Content-
// Security-Policy whose connect-src is this site, the one configured project
// and the Another Angle Worker (src/app/config.js), HSTS, nosniff, a referrer
// policy, a Permissions-Policy and COOP; the rules for /auth/*: never cached,
// no referrer, never framed; and the cache rules of the versioned layout.
//
// Reads SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY and HM_AUTH_MODE ('' | dev | ci)
// from the environment (Cloudflare Pages build variables; nothing in CI sets
// them for production), checks them with src/auth/config.js and writes a tiny
// ES module holding only the two public values. With neither set it writes
// { enabled: false } and the app runs exactly as without accounts.
//
// Fails the build loudly (exit 1) on a malformed value, a project other than
// hushmallow1, a secret / service_role key, or a Supabase secret anywhere in
// the build environment. Never prints a key (only its first characters).
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validatePublicConfig, publicConfigModule, keyLabel, classifyKey } from '../../src/auth/config.js';
import { ANGLE_ENDPOINT, ANGLE_ALLOWED_HOSTS } from '../../src/app/config.js';
import { headersText, inlineSources, readPages, readSrcTree } from './security-headers.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** Names that must never be present where the site is built. */
export const FORBIDDEN_ENV = ['SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY', 'SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD', 'SERVICE_ROLE_KEY'];

/** Everything the build must refuse in its environment (pure, for tests). */
export function envProblems(env) {
  const out = [];
  for (const n of FORBIDDEN_ENV) if (env[n]) out.push(`${n} is set in the build environment. The site build must never see Supabase secrets: remove it.`);
  for (const [n, v] of Object.entries(env)) {
    if (typeof v !== 'string' || n === 'SUPABASE_PUBLISHABLE_KEY') continue;
    if (/(^|[^A-Za-z0-9])sb_secret_[A-Za-z0-9_-]{8,}/.test(v)) out.push(`${n} holds a Supabase secret key (sb_secret_…). Remove it from the build environment.`);
  }
  return out;
}

/** { ok, source, summary } | { ok: false, errors } for a given environment (pure, for tests). */
export function buildPublicConfig(env, { stamp = '' } = {}) {
  const errors = envProblems(env);
  const mode = env.HM_AUTH_MODE ? String(env.HM_AUTH_MODE) : 'production';
  const v = validatePublicConfig({ url: env.SUPABASE_URL ?? '', key: env.SUPABASE_PUBLISHABLE_KEY ?? '', mode });
  if (!v.ok) errors.push(v.error);
  if (errors.length) return { ok: false, errors };
  const summary = v.enabled
    ? `sign-in on: ${v.url} (${v.mode}), key ${keyLabel(v.key)} [${classifyKey(v.key)}]`
    : 'sign-in off (no SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY): publishing { enabled: false }';
  return { ok: true, source: publicConfigModule(v, { stamp }), summary, enabled: !!v.enabled, headers: headersFile(v.enabled ? new URL(v.url).origin : null, { production: !v.enabled || !v.local }) };
}

/** The Another Angle origin(s) the app may call: ANGLE_ENDPOINT when it is https on an allowed host (as src/beyond/endpoint.js decides). */
export function angleOrigins(endpoint = ANGLE_ENDPOINT, hosts = ANGLE_ALLOWED_HOSTS) {
  try {
    const u = new URL(endpoint);
    return u.protocol === 'https:' && hosts.includes(u.hostname) ? [u.origin] : [];
  } catch { return []; }
}

/**
 * The /auth/* rule, unchanged since sign-in shipped (docs/AUTH.md "/auth/callback"):
 * the sign-in callback is never cached, framed or leaked by a referrer, and may
 * only talk to this site and the project. It is added to the whole-site rule
 * (Pages applies every matching rule): both CSPs are enforced, so the stricter
 * wins, and "same-origin, no-referrer" means no-referrer. nosniff comes from
 * the whole-site rule only (one exact token).
 */
export function authRule(origin) {
  const connect = origin ? `'self' ${origin}` : "'self'";
  return [
    '# /auth/callback handles one-time sign-in links: never cached, never framed, no referrer.',
    '# (Its policy is added to the one above: both are enforced, so the stricter wins.)',
    '/auth/*',
    '  Cache-Control: no-store',
    '  Referrer-Policy: no-referrer',
    '  X-Frame-Options: DENY',
    `  Content-Security-Policy: default-src 'self'; script-src 'self'; connect-src ${connect}; img-src 'self' data:; style-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`,
  ];
}

/**
 * Cloudflare Pages _headers for the whole site; /auth/* (the sign-in callback)
 * is never cached, framed or leaked by a referrer. `origin` is the published
 * Supabase project origin (or null: sign-in off). `production` false for a
 * dev / ci build (a localhost stack over http: no upgrade-insecure-requests).
 */
export function headersFile(origin, { production = true, root = ROOT } = {}) {
  return headersText({
    supabase: origin,
    production,
    angle: angleOrigins(),
    inline: inlineSources(readPages(root)),
    srcTree: readSrcTree(resolve(root, 'src')),
    authRule: authRule(origin),
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [outFile, ver, headersOut] = process.argv.slice(2);
  if (!outFile) { console.error('usage: node tools/site/auth-config.mjs <config-out> [<version>] [<headers-out>]'); process.exit(2); }
  const r = buildPublicConfig(process.env, { stamp: ver ? `version ${ver}` : '' });
  if (!r.ok) {
    console.error('auth config: REFUSED. The site was not built:');
    for (const e of r.errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, r.source);
  if (headersOut) writeFileSync(headersOut, r.headers);
  console.log(`auth config: ${r.summary}`);
}
