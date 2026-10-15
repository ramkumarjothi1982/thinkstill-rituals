// The site's security and cache headers (Cloudflare Pages _headers), built by
// tools/site/auth-config.mjs from the same values the app is built with:
//   * the Supabase project origin the build publishes (https + wss), or none;
//   * the Another Angle Worker origin(s) from src/app/config.js;
//   * SHA-256 hashes of every inline <script> (and inline event handler) in
//     index.html and auth/callback/index.html, so no 'unsafe-inline' for scripts;
//   * the versioned layout of tools/build-site.sh (v/<version>/…), so code and
//     art are cached for a year while HTML, version.json and public-config.js
//     are always revalidated.
//
// How Pages combines rules (https://developers.cloudflare.com/pages/configuration/headers/):
// every rule whose pattern matches applies, in file order; a header set by two
// rules is joined with ", "; "! Name" removes it. This file never depends on
// "!": Cache-Control is set by exactly one rule for any path, and the only
// headers two rules both set on /auth/* are joined into the stricter result
// (two CSPs are both enforced; "a, no-referrer" means no-referrer). Headers a
// browser reads as one exact token (X-Content-Type-Options, X-Frame-Options)
// are set by one rule only.
//
// Pure module: no network, no environment; tests call it directly.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Who may frame the app. docs/HUSHFOLD.md D1 and docs/FRAMER.md: the owner's
 * Framer site shows the app full-bleed in an iframe (framer/HushmallowEmbed.tsx),
 * and docs/AUTH.md keeps the root page frameable for it. The Framer site is
 * hushmallow.com; Framer serves a custom domain on one of apex / www and
 * redirects the other, so both are listed. Nothing else may frame the app
 * (not *.framer.website, not framer.com previews); /auth/* is never framed.
 */
export const FRAME_ANCESTORS = Object.freeze(['https://hushmallow.com', 'https://www.hushmallow.com']);

/**
 * Powerful features the app never uses. Not listed on purpose (the app uses
 * them, or the Framer iframe delegates them): accelerometer / gyroscope
 * (devicemotion in src/rituals/green-glitch-compass.js), autoplay (sound after
 * a tap), clipboard-write, web-share (share cards), fullscreen. Photos come
 * from a file input, which needs no camera permission.
 */
export const DENIED_FEATURES = Object.freeze([
  'camera', 'microphone', 'geolocation', 'payment', 'usb', 'serial', 'hid', 'midi',
  'display-capture', 'magnetometer', 'xr-spatial-tracking', 'idle-detection',
  'screen-wake-lock', 'publickey-credentials-create', 'publickey-credentials-get', 'otp-credentials',
  'browsing-topics', 'local-fonts', 'window-management',
]);

/** Cache-Control values. */
export const CACHE = Object.freeze({
  immutable: 'public, max-age=31536000, immutable',
  revalidate: 'no-cache',
  never: 'no-store',
});

const sha256 = (text) => `'sha256-${createHash('sha256').update(text, 'utf8').digest('base64')}'`;

/**
 * Every inline script and inline event-handler attribute in an HTML page.
 *   { scripts: [text], handlers: [{ attr, code }] }
 * Inline means a <script> without src (JSON / importmap types included: CSP
 * covers importmaps too); handlers are on…="…" attributes.
 */
export function inlineCode(html) {
  const scripts = [];
  const handlers = [];
  html = String(html).replace(/<!--[\s\S]*?-->/g, '');
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    if (/\bsrc\s*=/i.test(m[1])) continue;
    if (/\btype\s*=\s*["']?(?:application\/ld\+json|text\/template)/i.test(m[1])) continue;
    scripts.push(m[2]);
  }
  for (const tag of html.replace(/(<script\b[^>]*>)[\s\S]*?<\/script\s*>/gi, '$1').matchAll(/<[a-z][^>]*>/gi)) {
    for (const a of tag[0].matchAll(/\s(on[a-z]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi)) handlers.push({ attr: a[1].toLowerCase(), code: decodeEntities(a[3] ?? a[4] ?? a[5]) });
  }
  return { scripts, handlers };
}

// the browser hashes an attribute's value after entity decoding
const decodeEntities = (s) => s.replace(/&(?:#(\d+)|#x([0-9a-f]+)|(amp|lt|gt|quot|apos));/gi, (_, d, x, n) => (d ? String.fromCodePoint(+d) : x ? String.fromCodePoint(parseInt(x, 16)) : { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[n.toLowerCase()]));

/** The script-src sources that allow exactly these pages' inline code (and 'unsafe-hashes' only when a handler needs it). */
export function inlineSources(pages) {
  const scripts = new Set();
  const handlers = new Set();
  for (const html of pages) {
    const c = inlineCode(html);
    for (const s of c.scripts) scripts.add(sha256(s));
    for (const h of c.handlers) handlers.add(sha256(h.code));
  }
  return [...scripts, ...(handlers.size ? ["'unsafe-hashes'", ...handlers] : [])];
}

/**
 * The app's Content-Security-Policy.
 *   supabase   the published project origin (https://…supabase.co, or a localhost stack in dev/ci) or null
 *   angle      Another Angle origins (https://…workers.dev)
 *   inline     extra script-src sources (inlineSources())
 *   production true → upgrade-insecure-requests (left out of dev/ci builds served over http://localhost)
 */
export function appCsp({ supabase = null, angle = [], inline = [], production = true, frameAncestors = FRAME_ANCESTORS } = {}) {
  const connect = ["'self'"];
  if (supabase) {
    const u = new URL(supabase);
    connect.push(u.origin, `${u.protocol === 'https:' ? 'wss:' : 'ws:'}//${u.host}`);
  }
  for (const a of angle) connect.push(new URL(a).origin);
  const d = [
    "default-src 'self'",
    // 'wasm-unsafe-eval': WebAssembly compiled from this site's own files (the on-device
    // safety model, onnxruntime-web); it does not allow eval() or new Function().
    `script-src 'self' 'wasm-unsafe-eval' ${inline.join(' ')}`.trim(),
    // CSS that the app's modules inject (<style> elements, style="" in SVG and innerHTML
    // templates, setAttribute('style')): see docs/workstreams/prod-security.md, "Styles".
    "style-src 'self' 'unsafe-inline'",
    // photos are local blob: URLs; canvas snapshots and tiny icons are data: URLs
    "img-src 'self' data: blob:",
    "font-src 'self'",
    // sound is synthesised with Web Audio; no media element plays data: or blob: URLs
    "media-src 'self'",
    `connect-src ${[...new Set(connect)].join(' ')}`,
    // onnxruntime-web loads its .wasm and .mjs from this site; workers only from this site
    "worker-src 'self'",
    "manifest-src 'self'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    `frame-ancestors ${frameAncestors.length ? frameAncestors.join(' ') : "'none'"}`,
  ];
  if (production) d.push('upgrade-insecure-requests');
  return d.join('; ');
}

/** Permissions-Policy: every listed feature off. */
export const permissionsPolicy = (features = DENIED_FEATURES) => features.map((f) => `${f}=()`).join(', ');

/**
 * Cache rules for the versioned layout, one rule per path (never two rules
 * setting Cache-Control on one file). srcTree: names directly inside src/
 * ({ dirs, files }) and inside src/auth/ (authFiles), read from the source
 * tree so a new folder or file is covered without editing this list.
 */
export function cacheRules({ dirs, files, authFiles }, version = ':version') {
  // The rules name THIS build's folder literally: a request for another version's folder (gone after a deploy or a
  // rollback) gets Pages' single-page fallback, index.html with 200, and must never be cached as immutable code.
  // (':version' only when no version is given: tests of the rule shapes.)
  if (version !== ':version' && !/^[0-9A-Za-z_-]+$/.test(version)) throw new Error(`bad version: ${version}`);
  const out = [];
  const rule = (pattern, value) => out.push({ pattern, headers: [['Cache-Control', value]] });
  // HTML, the current-version pointer, the manifest and the old-layout forwarder: always revalidated
  for (const p of ['/', '/index.html', '/version.json', '/manifest.webmanifest', '/src/app/main.js']) rule(p, CACHE.revalidate);
  // v/<version>/…: one folder per deploy, never rewritten, except the published sign-in values
  rule(`/v/${version}/assets/*`, CACHE.immutable);
  rule(`/v/${version}/vendor/*`, CACHE.immutable);
  for (const d of dirs) if (d !== 'auth') rule(`/v/${version}/src/${d}/*`, CACHE.immutable);
  for (const f of files) rule(`/v/${version}/src/${f}`, CACHE.immutable);
  for (const f of authFiles) if (f !== 'public-config.js') rule(`/v/${version}/src/auth/${f}`, CACHE.immutable);
  // rebuilt by every build from the Pages variables: a re-run of the same commit may publish other values
  rule(`/v/${version}/src/auth/public-config.js`, CACHE.revalidate);
  return out;
}

/** Read cacheRules' input from a source tree (hushmallow/src). Developer folders are left out by build-site.sh but harmless here. */
export function readSrcTree(srcDir) {
  const names = readdirSync(srcDir).sort();
  const isDir = (n) => statSync(join(srcDir, n)).isDirectory();
  return {
    dirs: names.filter(isDir),
    files: names.filter((n) => !isDir(n)),
    authFiles: readdirSync(join(srcDir, 'auth')).filter((n) => !statSync(join(srcDir, 'auth', n)).isDirectory()).sort(),
  };
}

/** The HTML pages build-site.sh publishes (their inline code is hashed). */
export function readPages(root) {
  return ['index.html', 'auth/callback/index.html'].map((p) => readFileSync(join(root, p), 'utf8'));
}

/**
 * The whole _headers file.
 *   supabase    published project origin or null (sign-in off)
 *   production  false for HM_AUTH_MODE=dev|ci builds (served over http on localhost)
 *   version     this build's version folder (tools/build-site.sh <version>)
 *   authRule    the /auth/* rule's lines (tools/site/auth-config.mjs authRule())
 *   angle, inline, srcTree, frameAncestors: see above
 */
export function headersText({ supabase = null, production = true, angle = [], inline = [], srcTree, version, authRule = [], frameAncestors = FRAME_ANCESTORS } = {}) {
  const lines = [
    '# Generated by tools/build-site.sh (tools/site/auth-config.mjs + tools/site/security-headers.mjs). Do not edit.',
    '# Every matching rule applies (Cloudflare Pages); a header set twice is joined with ", ".',
    '# Whole site: security headers and the app\'s Content-Security-Policy.',
    '/*',
    '  Strict-Transport-Security: max-age=31536000; includeSubDomains',
    '  X-Content-Type-Options: nosniff',
    '  Referrer-Policy: same-origin',
    `  Permissions-Policy: ${permissionsPolicy()}`,
    '  Cross-Origin-Opener-Policy: same-origin',
    `  Content-Security-Policy: ${appCsp({ supabase, angle, inline, production, frameAncestors })}`,
    '',
    ...authRule,
    '',
    '# Caching: v/<version>/ never changes once deployed; pages, version.json and the sign-in values are revalidated.',
  ];
  for (const r of cacheRules(srcTree, version)) {
    lines.push(r.pattern);
    for (const [k, v] of r.headers) lines.push(`  ${k}: ${v}`);
  }
  lines.push('');
  return lines.join('\n');
}
