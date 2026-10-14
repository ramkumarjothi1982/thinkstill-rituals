// Which files a browser may load, worked out by following imports.
//
// The customer app's list starts at app/index.html and follows every script,
// stylesheet, import, @import and url() it reaches. The server serves exactly
// that list (and nothing else) to customers, and tools/build-app.mjs copies
// exactly that list into dist/app. The lab, tests, tools, docs and simulated
// test data are never in it, because nothing in the app loads them.
//
// URLs mirror the source tree: /app/, /ui/, /client/, /core/, /styles/ and
// /assets/ come from this folder; /src/ultra/ is the main app's Reframe
// engine (read-only). The lab's own list (development servers only, behind a
// tester key) starts at /lab/index.html.

import { readFileSync, existsSync, statSync, realpathSync, readdirSync } from 'node:fs';
import { join, dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const LAB_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function mountsFor(labRoot = LAB_ROOT, { lab = false } = {}) {
  const ultra = resolve(labRoot, '..', 'src', 'ultra');
  return [{ prefix: '/src/ultra/', dir: ultra }, { prefix: lab ? '/lab/' : '/', dir: labRoot }];
}

/** The file behind a URL path, if the path is inside a mount (never outside it, symlinks included). */
export function fileFor(urlPath, mounts) {
  const m = mounts.find((x) => urlPath.startsWith(x.prefix));
  if (!m) return null;
  const file = resolve(m.dir, `.${sep}${urlPath.slice(m.prefix.length)}`);
  if (!existsSync(file) || !statSync(file).isFile()) return null;
  const real = realpathSync(file);
  const root = realpathSync(m.dir);
  return real.startsWith(root + sep) ? real : null;
}

const strip = (u) => u.split('#')[0].split('?')[0];
const local = (u) => u && !/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(u);

function refsOf(urlPath, text) {
  const out = [];
  if (urlPath.endsWith('.html')) {
    for (const m of text.matchAll(/<(?:script|img|source|audio|video)\b[^>]*\ssrc="([^"]+)"/gi)) out.push(m[1]);
    for (const m of text.matchAll(/<link\b[^>]*\shref="([^"]+)"/gi)) out.push(m[1]);
  } else if (urlPath.endsWith('.css')) {
    for (const m of text.matchAll(/@import\s+(?:url\()?\s*["']?([^"')\s;]+)/g)) out.push(m[1]);
    for (const m of text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) out.push(m[1]);
  } else if (/\.m?js$/.test(urlPath)) {
    for (const m of text.matchAll(/\b(?:import|export)\s*(?:[^'"`;]*?\sfrom\s*)?['"]([^'"]+)['"]/g)) out.push(m[1]);
    for (const m of text.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)) out.push(m[1]);
  }
  return out.filter(local).map(strip).filter(Boolean);
}

/**
 * Follow everything `entry` loads. `extra` adds URL paths a module builds at run time
 * (the Mallow art in ui/mallows-data.js). → Map(urlPath → absolute file)
 */
export function collect({ entry, mounts, extra = [] }) {
  const files = new Map();
  const queue = [entry, ...extra];
  while (queue.length) {
    const url = queue.shift();
    if (files.has(url)) continue;
    const file = fileFor(url, mounts);
    if (!file) throw new Error(`${url} is referenced but isn’t a file inside the app`);
    files.set(url, file);
    if (!/\.(?:html|css|m?js)$/.test(url)) continue;
    for (const ref of refsOf(url, readFileSync(file, 'utf8'))) {
      if (/\.m?js$/.test(url) && !ref.startsWith('.') && !ref.startsWith('/')) throw new Error(`${url} imports "${ref}": only relative imports can ship`);
      queue.push(new URL(ref, `http://app${url}`).pathname);
    }
  }
  return files;
}

/**
 * Files a module names at run time, so the import walk can't see them: the Mallow art
 * (ui/mallows-data.js, one picture and an eyelid layer per Mallow) and the fonts' licences.
 */
function extrasOf(labRoot, prefix) {
  const art = readdirSync(join(labRoot, 'assets', 'art')).filter((f) => /^(?:noomi|blubi|pipzi|boppo|zuzu|loomi|glitzi)(?:-lids)?\.webp$/.test(f));
  const licences = readdirSync(join(labRoot, 'assets', 'fonts')).filter((f) => /^OFL-.+\.txt$/.test(f));
  return [...art.map((f) => `${prefix}assets/art/${f}`), ...licences.map((f) => `${prefix}assets/fonts/${f}`)];
}

// the app's settings (where Supabase is, its public key) are fetched, not imported
const configOf = (labRoot) => (existsSync(join(labRoot, 'app', 'config.json')) ? ['/app/config.json'] : []);

export function appFiles(labRoot = LAB_ROOT) {
  return collect({ entry: '/app/index.html', mounts: mountsFor(labRoot), extra: [...extrasOf(labRoot, '/'), ...configOf(labRoot)] });
}

/** The safety team's desk: its own page, sharing the app's sign-in code and settings. */
export function staffFiles(labRoot = LAB_ROOT) {
  return collect({ entry: '/staff/index.html', mounts: mountsFor(labRoot), extra: configOf(labRoot) });
}

export function labFiles(labRoot = LAB_ROOT) {
  return collect({ entry: '/lab/index.html', mounts: mountsFor(labRoot, { lab: true }), extra: extrasOf(labRoot, '/lab/') });
}
