// Writes the published sign-in config (called by tools/build-site.sh).
//   node tools/site/auth-config.mjs <config-out> [<version>] [<headers-out>]
//
// <headers-out> (the site's _headers, Cloudflare Pages) gets the whole site's
// security headers (tools/site/security-headers.mjs): an enforced Content-
// Security-Policy whose connect-src is this site, the one configured project
// and the Another Angle Worker (src/app/config.js; on the branch previews of the
// Pages project only, the staging Worker instead: PREVIEW_PATTERN), HSTS, nosniff, a referrer
// policy, a Permissions-Policy and COOP; the rules for /auth/*: never cached,
// no referrer, never framed; and the cache rules of the versioned layout.
//
// Reads SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY and HM_AUTH_MODE ('' | dev | ci)
// from the environment (Cloudflare Pages build variables; nothing in CI sets
// them for production), checks them with src/auth/config.js and writes a tiny
// ES module holding only the two public values. With neither set it writes
// { enabled: false } and the app runs exactly as without accounts.
//
// Which project a build may publish (buildStage, docs/STAGING.md): Cloudflare
// Pages sets CF_PAGES_BRANCH. A build of any branch other than main (a branch
// preview) may only publish the STAGING project hushmallow-staging; a build of
// main, and every build outside Pages (no CF_PAGES_BRANCH: GitHub Pages, CI,
// this machine), only production's hushmallow1, exactly as before. A branch
// build that is given production's values never publishes them: it writes
// { enabled: false } and says why (a warning in the log), so a preview never
// signs in to production, whatever its variables say.
//
// Fails the build loudly (exit 1) on a malformed value, a project other than
// the stage's own (staging's values on main included), a secret /
// service_role key, or a Supabase secret anywhere in the build environment.
// Never prints a key (only its first characters).
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validatePublicConfig, publicConfigModule, keyLabel, classifyKey, PROJECT_NAME, STAGING_PROJECT_NAME } from '../../src/auth/config.js';
import { ANGLE_ENDPOINT, ANGLE_ALLOWED_HOSTS, STAGING_ANGLE_ENDPOINT, STAGING_ALLOWED_HOSTS, PREVIEW_HOST_SUFFIX } from '../../src/app/config.js';
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

/** The Pages production branch: its builds serve app.hushmallow.com and hushmallow.pages.dev. */
export const PRODUCTION_BRANCH = 'main';

/**
 * Which project this build may publish: 'staging' for a Cloudflare Pages build of any branch but
 * PRODUCTION_BRANCH (CF_PAGES_BRANCH set and not main), 'production' otherwise (main, and every build
 * without CF_PAGES_BRANCH, as before). Pure, for tests.
 */
export function buildStage(env) {
  const b = typeof env.CF_PAGES_BRANCH === 'string' ? env.CF_PAGES_BRANCH.trim() : '';
  return b && b !== PRODUCTION_BRANCH ? 'staging' : 'production';
}

/** { ok, source, summary } | { ok: false, errors } for a given environment (pure, for tests). */
export function buildPublicConfig(env, { stamp = '', version } = {}) {
  const errors = envProblems(env);
  const mode = env.HM_AUTH_MODE ? String(env.HM_AUTH_MODE) : 'production';
  const stage = buildStage(env);
  const url = env.SUPABASE_URL ?? '', key = env.SUPABASE_PUBLISHABLE_KEY ?? '';
  let v = validatePublicConfig({ url, key, mode, stage });
  // a branch build given production's values (the Preview variables not changed yet): never published, sign-in off.
  // Only values production itself would accept: a secret, a malformed value or a Supabase secret in the
  // environment still fails the build, as before.
  let warning = '';
  const asProduction = !v.ok && stage === 'staging' ? validatePublicConfig({ url, key, mode }) : null;
  if (asProduction?.ok && asProduction.enabled && !asProduction.local) {
    warning = `SUPABASE_URL is the production project ${PROJECT_NAME}, and this is a build of branch "${String(env.CF_PAGES_BRANCH).trim().slice(0, 80)}" (a branch preview): a preview may only use the staging project ${STAGING_PROJECT_NAME}. Not published: this build has no sign-in. Give the Preview environment the staging project's values (docs/STAGING.md).`;
    v = { ok: true, enabled: false };
  }
  if (!v.ok) errors.push(v.error);
  if (errors.length) return { ok: false, errors };
  const summary = v.enabled
    ? `sign-in on: ${v.url} (${stage === 'staging' && !v.local ? `the staging project ${STAGING_PROJECT_NAME}${v.mode === 'production' ? '' : `, ${v.mode}`}` : v.mode}), key ${keyLabel(v.key)} [${classifyKey(v.key)}]`
    : warning ? 'sign-in off (production values refused on a branch build): publishing { enabled: false }'
      : 'sign-in off (no SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY): publishing { enabled: false }';
  return { ok: true, source: publicConfigModule(v, { stamp }), summary, enabled: !!v.enabled, stage, ...(warning ? { warning } : {}), headers: headersFile(v.enabled ? new URL(v.url).origin : null, { production: !v.enabled || !v.local, version }) };
}

/** The Another Angle origin(s) the app may call: ANGLE_ENDPOINT when it is https on an allowed host (as src/beyond/endpoint.js decides). */
export function angleOrigins(endpoint = ANGLE_ENDPOINT, hosts = ANGLE_ALLOWED_HOSTS) {
  try {
    const u = new URL(endpoint);
    return u.protocol === 'https:' && hosts.includes(u.hostname) ? [u.origin] : [];
  } catch { return []; }
}

/**
 * The branch previews of the Pages project (src/app/config.js isPreviewHost: one DNS label in front of
 * PREVIEW_HOST_SUFFIX), as a Pages host pattern: a host placeholder matches exactly one label, so neither
 * the production alias hushmallow.pages.dev nor app.hushmallow.com is matched.
 */
export const PREVIEW_PATTERN = `https://:preview${PREVIEW_HOST_SUFFIX}/*`;

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
 * is never cached, framed or leaked by a referrer; a branch preview's CSP names
 * the staging Worker instead of the production one. `origin` is the published
 * Supabase project origin (or null: sign-in off). `production` false for a
 * dev / ci build (a localhost stack over http: no upgrade-insecure-requests).
 */
export function headersFile(origin, { production = true, version, root = ROOT } = {}) {
  return headersText({
    supabase: origin,
    production,
    angle: angleOrigins(),
    inline: inlineSources(readPages(root)),
    srcTree: readSrcTree(resolve(root, 'src')),
    version,
    authRule: authRule(origin),
    // staging (docs/STAGING.md): previews talk to the staging Worker only, as src/app/config.js deploySettings decides
    preview: { pattern: PREVIEW_PATTERN, angle: angleOrigins(STAGING_ANGLE_ENDPOINT, STAGING_ALLOWED_HOSTS) },
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [outFile, ver, headersOut] = process.argv.slice(2);
  if (!outFile) { console.error('usage: node tools/site/auth-config.mjs <config-out> [<version>] [<headers-out>]'); process.exit(2); }
  const r = buildPublicConfig(process.env, { stamp: ver ? `version ${ver}` : '', version: ver || undefined });
  if (!r.ok) {
    console.error('auth config: REFUSED. The site was not built:');
    for (const e of r.errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, r.source);
  if (headersOut) writeFileSync(headersOut, r.headers);
  if (r.warning) console.error(`auth config: WARNING: ${r.warning}`);
  console.log(`auth config: ${r.summary}`);
}
