// The first screen's modules, preloaded from the published index.html (run by tools/build-site.sh):
//   node tools/site/boot-preload.mjs <out-dir> <version>
//
// Without it a phone discovers the app's code one import level at a time: index.html → main.js → its imports →
// theirs → … → the Hushfold scene → its imports → MallowTouch's, each level a full round trip (about 0.6 s on a
// slow mobile connection) before the Mallow's art is even asked for. With <link rel="modulepreload"> for every
// module the first screen statically needs, the browser asks for all of them at once, straight from the page.
// A preload only fetches and compiles: nothing runs earlier or in another order, so nothing changes for the
// person except how soon the first screen is ready.
//
// BOOT_ENTRIES are the modules the page always loads before (or while) its first screen appears; the preload list
// is their static import closure (import / export … from, never import()), computed from the published files, so
// a new import is preloaded without editing anything here. tools/site/check.mjs fails the build when the published
// index.html misses one of them or preloads anything else (tests/boot-preload.test.mjs keeps the entries true).
//
// The first screen's logo is preloaded too (logoPreload): the Hushfold's top bar asks for it only once its scene
// has loaded, so without it the logo, the largest picture on that screen, arrives a round trip after everything
// else. The preload names the same srcset and sizes as the <img>, so the browser picks the same file for both.
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, posix, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
// (check.mjs imports this module too: neither runs the other's code at load, so the cycle is harmless)
import { stripJs } from './check.mjs';
import { LOGO_WIDTHS, logoUrl } from '../../src/brand.js';

/** Paths relative to the app folder (hushmallow/ in the repository, v/<version>/ in the site), in the order needed. */
export const BOOT_ENTRIES = Object.freeze([
  'src/app/main.js',                    // the page's module script
  'src/ui/type.js',                     // main.js boot(): the font gate before the first scene
  'src/app/scenes/hushfold.js',         // main.js boot(): app.go('home'), the first scene (scenes.home)
  'src/mallows/touch/mallow-touch.js',  // hushfold.js: the stage's squeezable Mallow (preloaded by index.html already)
  'src/engine/audio.js',                // main.js boot(): imported at start (not waited for)
  'src/engine/haptics.js',              // main.js boot(): imported at start (not waited for)
]);

/** The static import specifiers of a module (import … from, export … from, import '…'), never import(). */
export function staticImports(src) {
  const code = stripJs(String(src));
  const out = [];
  for (const m of code.matchAll(/(?:^|[\s;}])(?:import|export)\s[^'"`;()]*?from\s*['"]([^'"]+)['"]/g)) out.push(m[1]);
  for (const m of code.matchAll(/(?:^|[\s;}])import\s*['"]([^'"]+)['"]/g)) out.push(m[1]);
  return out;
}

/**
 * The static import closure of `entries` under `root` (the app folder), breadth first from each entry in turn, each
 * module once: [ 'src/app/main.js', 'src/auth/boot.js', … ] (posix paths relative to root). A specifier that leaves
 * root, is bare, or names a missing file throws: the published graph must be whole (check.mjs says which file).
 */
export function bootModules(root, entries = BOOT_ENTRIES) {
  const base = resolve(root);
  const seen = new Set();
  const order = [];
  for (const e of entries) {
    const queue = [resolve(base, e)];
    while (queue.length) {
      const f = queue.shift();
      if (seen.has(f)) continue;
      seen.add(f);
      const rel = relative(base, f).split(sep).join('/');
      if (rel.startsWith('../')) throw new Error(`boot module outside the app folder: ${f}`);
      let src;
      try { src = readFileSync(f, 'utf8'); } catch { throw new Error(`boot module missing: ${rel}`); }
      order.push(rel);
      for (const s of staticImports(src)) {
        if (!s.startsWith('./') && !s.startsWith('../')) throw new Error(`${rel}: '${s}' is not a relative module path`);
        queue.push(resolve(dirname(f), s.split(/[?#]/)[0]));
      }
    }
  }
  return order;
}

/** The Hushfold's logo (hushfold.js: logoImg({ tone: 'light', width: 132 }), so sizes is 132px). */
export const FIRST_LOGO = Object.freeze({ tone: 'light', sizes: '132px' });

/** The <link rel="preload" as="image"> for that logo: the <img>'s own src, srcset and sizes, under `prefix`. */
export function logoPreload(prefix, { tone, sizes } = FIRST_LOGO) {
  const rel = (w) => posix.join(prefix, 'assets/brand', basename(new URL(logoUrl(tone, w)).pathname));
  return `<link rel="preload" as="image" href="${rel(720)}" imagesrcset="${LOGO_WIDTHS.map((w) => `${rel(w)} ${w}w`).join(', ')}" imagesizes="${sizes}">`;
}

/** The <link rel="modulepreload"> lines for `modules` under `prefix` (the published index.html's v/<version>/). */
export const preloadLinks = (modules, prefix) => modules.map((m) => `<link rel="modulepreload" href="${posix.join(prefix, m)}">`);

/**
 * index.html with its one hand-written modulepreload (MallowTouch, src/mallows/touch/mallow-touch.js) replaced by
 * `links`, in the same place (after the stylesheets, before the inline script: the inline code, and with it the
 * Content-Security-Policy hashes, is untouched). Throws when that line is not there exactly once.
 */
export function injectPreloads(html, links, prefix) {
  const line = `<link rel="modulepreload" href="${posix.join(prefix, 'src/mallows/touch/mallow-touch.js')}">`;
  const at = html.indexOf(line);
  if (at < 0 || html.indexOf(line, at + 1) >= 0) throw new Error(`index.html: expected one ${line}`);
  return html.slice(0, at) + links.join('\n') + html.slice(at + line.length);
}

/** The modulepreload hrefs of an HTML page, in order. */
export const preloadsIn = (html) => [...String(html).replace(/<!--[\s\S]*?-->/g, '').matchAll(/<link\b[^>]*\brel="modulepreload"[^>]*>/g)]
  .map((m) => /\bhref="([^"]+)"/.exec(m[0])?.[1]).filter(Boolean);

let main = false;
try { main = !!process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url); } catch { /* imported */ }
if (main) {
  const [outArg, ver] = process.argv.slice(2);
  if (!outArg || !ver || !/^[0-9a-zA-Z_-]+$/.test(ver)) { console.error('usage: node tools/site/boot-preload.mjs <out-dir> <version>'); process.exit(2); }
  const out = resolve(outArg);
  const prefix = `v/${ver}`;
  const mods = bootModules(join(out, prefix));
  const p = join(out, 'index.html');
  writeFileSync(p, injectPreloads(readFileSync(p, 'utf8'), [...preloadLinks(mods, prefix), logoPreload(prefix)], prefix));
  console.log(`boot preload: ${mods.length} modules and the logo preloaded from index.html`);
}
