// Checks a site assembled by tools/build-site.sh before it is published.
//   node tools/site/check.mjs <out-dir> <version>
//
// 1. Every file index.html and the manifest name is there (styles, the
//    module script, icons, fonts), and version.json names <version>.
// 2. The module and stylesheet graph from index.html: every static import,
//    literal import(), new URL('…', import.meta.url), ensureStylesheet('…')
//    and CSS url() / @import resolves to a shipped file. A template specifier
//    (`./worlds/${id}.js`) must match at least one shipped file.
// 3. Every asset URL the Mallow registry, the hi-res table and the brand
//    export (art, rigs, logos) is a shipped file.
// 4. Developer-only folders are not shipped.
// 5. Sign-in: the vendored supabase-js (v/<version>/vendor/) is the pinned
//    file (sha256 from its manifest, LICENSE beside it, the same SRI as
//    src/auth/client.js) and is never parsed as app code; /auth/callback/
//    names only absolute /v/<version>/ files and its module graph resolves;
//    _headers keeps /auth/* uncached, unframed and referrer-free; the
//    published public-config.js holds only valid public values, for this
//    build's stage (auth-config.mjs buildStage: a branch build only the
//    staging project, main and every other build only production's).
// 6. The legal pages: every page src/app/legal.js links to (LEGAL_PAGES, read
//    from the published copy) is in the site; each loads only this version's
//    files through relative paths (its stylesheets and their fonts resolve,
//    and none of them names another site), carries no script, no inline
//    style or handler and a strict Content-Security-Policy meta tag, and links
//    only to shipped pages, ids that exist, https:, mailto: or tel:; _headers
//    gives /legal/* its strict policy too. Each page carries the version a new
//    account agrees to (LEGAL_VERSIONS, <meta name="legal-version">).
// 7. No secret in any published file, art and config included (the patterns of
//    tools/secret-scan.mjs, with no allow-list: no fake belongs on the site).
// 8. index.html preloads exactly the first screen's static module graph
//    (tools/site/boot-preload.mjs bootModules, from the published files): none
//    missing (it would load one import level at a time again), nothing else
//    (a preload of a module the first screen does not need costs a phone its
//    bandwidth), each once; and the Hushfold's logo as its <img> asks for it
//    (logoPreload: the same srcset and sizes, no href), every candidate a
//    shipped file.
// 9. 404.html, the answer to every path that is not a file: as inert as the
//    legal pages (no script, handler or inline style; a strict CSP meta tag),
//    and it names only "/" and absolute /v/<version>/ files, which are in the
//    site.
// Prints a short summary; exits 1 with the list of problems.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildStage } from './auth-config.mjs';
import { describe, scanFiles } from '../secret-scan.mjs';
import { bootModules, logoPreload, preloadsIn } from './boot-preload.mjs';

// Referenced only by localhost labs (main.js v3Lab) and removed from the
// published copy on purpose: listed, never a failure.
const LOCAL_ONLY = ['src/v3/dev/'];
// Never published (build-site.sh leaves them out).
const DEV_ONLY = ['src/v3/dev', 'src/studio', 'assets/source'];
// Modules whose exports name the art, rig and brand files.
const ASSET_MODULES = ['src/mallows/registry.js', 'src/mallows/hires.js', 'src/brand.js'];
// The module whose LEGAL_PAGES names the legal pages the app links to.
const LEGAL_MODULE = 'src/app/legal.js';

const isFile = (p) => { try { return statSync(p).isFile(); } catch { return false; } };
const isDir = (p) => { try { return statSync(p).isDirectory(); } catch { return false; } };
const external = (s) => /^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(s);   // https:, data:, blob:, #frag, //host
const bare = (s) => s.split(/[?#]/)[0];
const listAll = (d) => readdirSync(d, { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? listAll(join(d, e.name)).map((x) => `${e.name}/${x}`) : [e.name]));

/**
 * JS source with comments and regex literals blanked (strings and line
 * breaks kept), so an example in a comment is never taken for an import.
 */
export function stripJs(src) {
  const outc = src.split('');
  const n = src.length;
  let i = 0, prev = '';
  const blank = (a, b) => { for (let k = a; k < b && k < n; k++) if (outc[k] !== '\n') outc[k] = ' '; };
  const AFTER = new Set([...'(,=:[!&|?{};+-*%<>~^}']);
  const KW = new Set(['return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new', 'delete', 'void', 'throw', 'yield', 'await', 'instanceof']);
  const regexOk = () => !prev || AFTER.has(prev) || KW.has(prev) || prev === '=>';
  const quoted = (q) => { i++; while (i < n && src[i] !== q && src[i] !== '\n') i += src[i] === '\\' ? 2 : 1; i++; };
  function template() {
    i++;
    while (i < n && src[i] !== '`') {
      if (src[i] === '\\') { i += 2; continue; }
      if (src[i] === '$' && src[i + 1] === '{') { i += 2; scan(true); i++; continue; }
      i++;
    }
    i++;
  }
  function scan(inExpr) {
    let depth = 0;
    while (i < n) {
      const c = src[i], d = src[i + 1];
      if (c === ' ' || c === '\t' || c === '\r' || c === '\n') { i++; continue; }
      if (c === '/' && d === '/') { const s = i; while (i < n && src[i] !== '\n') i++; blank(s, i); continue; }
      if (c === '/' && d === '*') { const s = i; i += 2; while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++; i += 2; blank(s, i); continue; }
      if (c === "'" || c === '"') { quoted(c); prev = 'str'; continue; }
      if (c === '`') { template(); prev = 'str'; continue; }
      if (c === '/' && regexOk()) {
        const s = i; let cls = false; i++;
        while (i < n && src[i] !== '\n') {
          const e = src[i];
          if (e === '\\') { i += 2; continue; }
          if (e === '[') cls = true; else if (e === ']') cls = false; else if (e === '/' && !cls) break;
          i++;
        }
        i++;
        while (i < n && /[a-z]/i.test(src[i])) i++;
        blank(s, i); prev = 'regex'; continue;
      }
      if (/[\w$]/.test(c)) { const s = i; while (i < n && /[\w$]/.test(src[i])) i++; prev = src.slice(s, i); continue; }
      if (inExpr) { if (c === '{') depth++; else if (c === '}') { if (depth === 0) return; depth--; } }
      if (c === '=' && d === '>') { prev = '=>'; i += 2; continue; }
      prev = c; i++;
    }
  }
  scan(false);
  return outc.join('');
}

/** { lit, tpl }: the literal and template specifiers a JS or CSS file refers to. */
export function specifiers(src, isCss = false) {
  const lit = [], tpl = [];
  if (isCss) {
    const css = src.replace(/\/\*[\s\S]*?\*\//g, '');
    for (const m of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) lit.push(m[1].trim());
    for (const m of css.matchAll(/@import\s+["']([^"']+)["']/g)) lit.push(m[1]);
    return { lit, tpl };
  }
  const code = stripJs(src);
  for (const m of code.matchAll(/(?:^|[\s;}])(?:import|export)\s[^'"`;]*?from\s*['"]([^'"]+)['"]/g)) lit.push(m[1]);
  for (const m of code.matchAll(/(?:^|[\s;}])import\s*['"]([^'"]+)['"]/g)) lit.push(m[1]);
  for (const m of code.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g)) lit.push(m[1]);
  for (const m of code.matchAll(/new URL\(\s*['"]([^'"]+)['"]\s*,\s*import\.meta\.url/g)) lit.push(m[1]);
  for (const m of code.matchAll(/ensureStylesheet\(\s*['"]([^'"]+)['"]/g)) lit.push(m[1]);
  for (const m of code.matchAll(/import\(\s*`([^`]+)`\s*\)/g)) tpl.push(m[1]);
  for (const m of code.matchAll(/new URL\(\s*`([^`]+)`\s*,\s*import\.meta\.url/g)) tpl.push(m[1]);
  return { lit, tpl };
}

export async function checkSite(outArg, ver, { env = process.env } = {}) {
  const out = resolve(outArg);
  const app = join(out, 'v', ver);
  const problems = [], notes = [], allowed = [], templates = [];
  const rel = (p) => relative(out, p).split(sep).join('/');
  const localOnly = (p) => LOCAL_ONLY.some((d) => rel(p).startsWith(`v/${ver}/${d}`));
  // third-party bundles: checked by hash below, never parsed for imports
  const vendored = (p) => rel(p).startsWith(`v/${ver}/vendor/`);

  // ---------------------------------------------------------- 1. root --
  const indexPath = join(out, 'index.html');
  if (!isFile(indexPath)) return { problems: [`no index.html in ${out}`], notes, allowed, templates, reached: 0, assets: { checked: 0, missing: 0 } };
  const html = readFileSync(indexPath, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  try {
    const { v } = JSON.parse(readFileSync(join(out, 'version.json'), 'utf8'));
    if (v !== ver) problems.push(`version.json names ${v}, not ${ver}`);
  } catch (e) { problems.push(`version.json: ${e.message}`); }
  if (!isFile(join(out, 'src/app/main.js'))) problems.push('the forwarder src/app/main.js (for pages cached before versioned folders) is missing');
  if (!isFile(join(out, '.nojekyll'))) problems.push('.nojekyll is missing');
  for (const d of DEV_ONLY) if (existsSync(join(app, d))) problems.push(`developer-only ${d} is published`);

  const referrer = new Map();
  const queue = [];
  const named = [...html.matchAll(/\s(?:href|src)="([^"]+)"/g)].map((m) => m[1]).filter((s) => !external(s));
  for (const s of named) {
    const p = resolve(out, bare(s));
    if (!isFile(p)) { problems.push(`index.html names ${s}, which is not in the site`); continue; }
    if (p.endsWith('.webmanifest')) checkManifest(p);
    else { referrer.set(p, 'index.html'); queue.push(p); }
  }
  if (!named.includes(`v/${ver}/src/app/main.js`)) problems.push(`index.html does not load v/${ver}/src/app/main.js`);
  queue.push(join(out, 'src/app/main.js'));

  // /auth/callback/ (absolute /v/<version>/ paths: it is served two folders down)
  const cbPath = join(out, 'auth/callback/index.html');
  if (!isFile(cbPath)) problems.push('auth/callback/index.html is missing');
  else {
    const cb = readFileSync(cbPath, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
    const cbNamed = [...cb.matchAll(/\s(?:href|src)="([^"]+)"/g)].map((m) => m[1]).filter((x) => !external(x));
    for (const x of cbNamed) {
      if (!x.startsWith(`/v/${ver}/`)) { problems.push(`auth/callback/index.html names ${x} (not an absolute /v/${ver}/ path)`); continue; }
      const p = join(out, bare(x));
      if (!isFile(p)) { problems.push(`auth/callback/index.html names ${x}, which is not in the site`); continue; }
      referrer.set(p, 'auth/callback/index.html'); queue.push(p);
    }
    if (!cbNamed.includes(`/v/${ver}/src/auth/callback.js`)) problems.push(`auth/callback/index.html does not load /v/${ver}/src/auth/callback.js`);
  }

  // 404.html (9.): every path that is not a file gets it, at any depth, so it names only "/" and absolute
  // /v/<version>/ files (any quoting, every srcset candidate), and it is as inert as the legal pages: no script,
  // handler or inline style, and a strict policy of its own. Without it Pages serves index.html there instead.
  const nfPath = join(out, '404.html');
  if (!isFile(nfPath)) problems.push('404.html is missing (Pages would answer unknown paths with index.html)');
  else {
    const nf = readFileSync(nfPath, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
    if (/<script\b/i.test(nf)) problems.push('404.html has a <script> (it runs none)');
    if (/<style\b|\sstyle\s*=/i.test(nf)) problems.push('404.html has inline style');
    if (/<[a-z][^>]*\son[a-z]+\s*=/i.test(nf)) problems.push('404.html has an inline event handler');
    if (/<(?:iframe|object|embed|form|base)\b/i.test(nf)) problems.push('404.html has an iframe, object, embed, form or base element');
    const csp = /<meta http-equiv="Content-Security-Policy" content="([^"]+)"/i.exec(nf)?.[1] || '';
    if (!/(^|;)\s*default-src 'none'/.test(csp) || /script-src|unsafe-|https?:|\*/.test(csp)) problems.push("404.html: no strict Content-Security-Policy meta tag (default-src 'none', no script)");
    for (const [, name, dq, sq, uq] of nf.matchAll(/\s(href|src|srcset|imagesrcset|poster|data|action|formaction)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi)) {
      const value = dq ?? sq ?? uq;
      for (const x of /srcset$/i.test(name) ? value.split(',').map((c) => c.trim().split(/\s+/)[0]).filter(Boolean) : [value]) {
        if (x === '/' && name.toLowerCase() === 'href') continue;
        if (!x.startsWith(`/v/${ver}/`)) { problems.push(`404.html names ${x} (not "/" or an absolute /v/${ver}/ path)`); continue; }
        const p = join(out, bare(x));
        if (!isFile(p)) { problems.push(`404.html names ${x}, which is not in the site`); continue; }
        referrer.set(p, '404.html'); queue.push(p);
      }
    }
  }

  function checkManifest(p) {
    let man;
    try { man = JSON.parse(readFileSync(p, 'utf8')); } catch (e) { problems.push(`${rel(p)}: ${e.message}`); return; }
    for (const k of ['id', 'scope', 'start_url']) if (typeof man[k] !== 'string') problems.push(`${rel(p)}: no "${k}"`);
    const urls = [man.start_url, ...(man.icons || []).map((ic) => ic.src)].filter((s) => typeof s === 'string' && !external(s));
    for (const s of urls) if (!isFile(resolve(dirname(p), bare(s)))) problems.push(`${rel(p)} names ${s}, which is not in the site`);
  }

  // A template specifier: its fixed folder must be shipped and hold at least one file it can name.
  function checkTemplate(from, t) {
    const cut = t.indexOf('${');
    const fixed = cut < 0 ? t : t.slice(0, cut);
    if (!fixed.startsWith('.')) { notes.push(`${rel(from)}: \`${t}\` is built at run time (not checked)`); return; }
    const slash = fixed.lastIndexOf('/');
    const dir = resolve(dirname(from), slash < 0 ? '.' : fixed.slice(0, slash + 1));
    if (!isDir(dir)) {
      if (localOnly(join(dir, 'x'))) allowed.push(`${rel(dir)}/ (\`${t}\`)`);
      else problems.push(`${rel(from)}: \`${t}\` points into ${rel(dir)}/, which is not in the site`);
      return;
    }
    const parts = t.slice(slash + 1).split(/\$\{[^}]*\}/).map((s) => s.replace(/[.*+?^()|[\]\\{}$]/g, '\\$&'));
    const re = new RegExp(`^${parts.join('.+')}$`);
    const n = listAll(dir).filter((f) => re.test(f)).length;
    if (!n) problems.push(`${rel(from)}: \`${t}\` matches no file in ${rel(dir)}/`);
    else templates.push(`${rel(from)}: \`${t}\` (${n} file${n === 1 ? '' : 's'})`);
  }

  // ------------------------------------------- 6. the legal pages (their files join the graph) --
  const legal = await checkLegal(out, app, ver, problems, (p, from) => { if (!referrer.has(p)) referrer.set(p, from); queue.push(p); });

  // --------------------------------------------------------- 2. graph --
  const seen = new Set();
  while (queue.length) {
    const f = queue.shift();
    if (seen.has(f)) continue;
    seen.add(f);
    if (!isFile(f)) {
      if (isDir(f)) continue;   // new URL('../../', import.meta.url) names a folder
      if (localOnly(f)) allowed.push(rel(f));
      else problems.push(`missing: ${rel(f)} (named by ${referrer.get(f) || '?'})`);
      continue;
    }
    if (!/\.(m?js|css)$/.test(f) || vendored(f)) continue;
    const { lit, tpl } = specifiers(readFileSync(f, 'utf8'), f.endsWith('.css'));
    for (const s of lit) {
      if (external(s)) continue;
      if (!s.startsWith('.') && !s.startsWith('/')) { problems.push(`${rel(f)}: bare specifier '${s}' cannot load in a browser`); continue; }
      const p = s.startsWith('/') ? join(out, bare(s)) : resolve(dirname(f), bare(s));
      if (!referrer.has(p)) referrer.set(p, rel(f));
      queue.push(p);
    }
    for (const t of tpl) checkTemplate(f, t);
  }

  // -------------------------------------------------------- 3. assets --
  const urls = new Set();
  const walk = (o, d = 0) => {
    if (d > 6 || !o) return;
    if (typeof o === 'string') { if (o.startsWith('file:')) urls.add(o); return; }
    if (typeof o === 'object') for (const v of Object.values(o)) walk(v, d + 1);
  };
  for (const m of ASSET_MODULES) {
    const p = join(app, m);
    if (!isFile(p)) { problems.push(`asset table ${m} is missing`); continue; }
    try {
      const mod = await import(pathToFileURL(p).href);
      walk(mod);
      if (typeof mod.logoUrl === 'function') for (const tone of ['light', 'ink']) for (const w of mod.LOGO_WIDTHS || []) urls.add(mod.logoUrl(tone, w));
    } catch (e) { problems.push(`asset table ${m} does not load in Node: ${e.message}`); }
  }
  let missing = 0;
  for (const u of urls) {
    const p = fileURLToPath(u.split(/[?#]/)[0]);
    if (!p.startsWith(app + sep)) { problems.push(`asset outside v/${ver}/: ${p}`); continue; }
    if (!isFile(p)) { missing++; problems.push(`asset missing: ${rel(p)}`); }
  }

  const auth = await checkAuth(out, app, problems, buildStage(env));

  // -------------------------------------------- 8. the first screen's modules are preloaded --
  const preloads = preloadsIn(readFileSync(indexPath, 'utf8'));
  let boot = [];
  try { boot = bootModules(app).map((m) => `v/${ver}/${m}`); } catch (e) { problems.push(`the first screen's module graph: ${e.message}`); }
  for (const m of boot) if (!preloads.includes(m)) problems.push(`index.html does not modulepreload ${m} (the first screen needs it: tools/site/boot-preload.mjs)`);
  for (const m of new Set(preloads)) if (!boot.includes(m)) problems.push(`index.html preloads ${m}, which the first screen does not import statically (tools/site/boot-preload.mjs)`);
  for (const m of new Set(preloads.filter((x, i) => preloads.indexOf(x) !== i))) problems.push(`index.html preloads ${m} twice`);
  if (!html.includes(logoPreload(`v/${ver}`))) problems.push('index.html does not preload the Hushfold logo as its <img> asks for it (tools/site/boot-preload.mjs logoPreload)');
  for (const m of html.matchAll(/\simagesrcset="([^"]+)"/g)) {
    for (const c of m[1].split(',').map((x) => x.trim().split(/\s+/)[0]).filter(Boolean)) if (!external(c) && !isFile(resolve(out, bare(c)))) problems.push(`index.html preloads ${c}, which is not in the site`);
  }

  // ------------------------------------------------------- 7. secrets --
  const published = listAll(out);
  for (const f of scanFiles(out, published, { allow: false })) problems.push(`${describe(f)} is in the site: take it out of the repository and roll it`);
  return { problems, notes, allowed, templates, reached: seen.size, assets: { checked: urls.size, missing }, auth, legal, scanned: published.length, preloaded: preloads.length };
}

/** Section 6: the legal pages. enqueue(file, from) adds a file they load to the module and stylesheet graph. Returns their paths. */
async function checkLegal(out, app, ver, problems, enqueue) {
  let pages = [], versions = {}, kinds = {};
  try {
    const mod = await import(pathToFileURL(join(app, LEGAL_MODULE)).href);
    pages = Object.values(mod.LEGAL_PAGES || {});
    versions = mod.LEGAL_VERSIONS || {};
    kinds = Object.fromEntries(Object.entries(mod.LEGAL_PAGES || {}).map(([k, v]) => [v, k]));
  } catch (e) { problems.push(`${LEGAL_MODULE} does not load in Node: ${e.message}`); return pages; }
  if (!pages.length) problems.push(`${LEGAL_MODULE} names no legal pages`);
  const idsOf = (file) => new Set([...readFileSync(file, 'utf8').replace(/<!--[\s\S]*?-->/g, '').matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  for (const page of pages) {
    const p = join(out, page);
    if (!isFile(p)) { problems.push(`${page} (the app links to it) is not in the site`); continue; }
    const html = readFileSync(p, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
    // the version a sign-up records for this page (src/app/legal.js) is the one the page says it is
    const want = versions[kinds[page]];
    const stamps = [...html.matchAll(/<meta name="legal-version" content="([^"]*)">/g)].map((m) => m[1]);
    if (want && (stamps.length !== 1 || stamps[0] !== want)) problems.push(`${page} says legal-version ${stamps.join(', ') || '(none)'}, not ${want} (${LEGAL_MODULE})`);
    if (/<script\b/i.test(html)) problems.push(`${page} has a <script> (the legal pages run none)`);
    if (/<style\b|\sstyle\s*=/i.test(html)) problems.push(`${page} has inline style (its policy allows none)`);
    if (/<[a-z][^>]*\son[a-z]+\s*=/i.test(html)) problems.push(`${page} has an inline event handler`);
    if (/<(?:iframe|object|embed|form|base)\b/i.test(html)) problems.push(`${page} has an iframe, object, embed, form or base element`);
    const csp = /<meta http-equiv="Content-Security-Policy" content="([^"]+)"/i.exec(html)?.[1] || '';
    if (!/(^|;)\s*default-src 'none'/.test(csp) || /script-src|unsafe-|https?:|\*/.test(csp)) problems.push(`${page}: no strict Content-Security-Policy meta tag (default-src 'none', no script)`);
    const ids = idsOf(p);
    for (const m of html.matchAll(/<([a-z][a-z0-9]*)\b([^>]*)>/gi)) {
      const tag = m[1].toLowerCase();
      for (const [, name, value] of m[2].matchAll(/\s(href|src|srcset|poster|data|action|formaction)="([^"]*)"/gi)) {
        if (tag === 'a' && name === 'href') {
          // a link: an id on this page, another shipped page (and an id on it), or a way out (https:, mailto:, tel:)
          if (value.startsWith('#')) { if (!ids.has(value.slice(1))) problems.push(`${page} links to ${value}, which is not an id on the page`); continue; }
          if (/^(?:https:\/\/|mailto:|tel:)/i.test(value)) continue;
          if (external(value) || value.startsWith('/')) { problems.push(`${page} links to ${value} (only relative links, https:, mailto: and tel:)`); continue; }
          const target = resolve(dirname(p), bare(value));
          const file = isDir(target) ? join(target, 'index.html') : target;
          const frag = value.includes('#') ? value.slice(value.indexOf('#') + 1) : '';
          if (!isFile(file)) problems.push(`${page} links to ${value}, which is not in the site`);
          else if (frag && file.endsWith('.html') && !idsOf(file).has(frag)) problems.push(`${page} links to ${value}, which is not an id on that page`);
          continue;
        }
        // anything else the page loads (each candidate of a srcset): one of this version's files, through a relative
        // path, never another site
        for (const v of name === 'srcset' ? value.split(',').map((c) => c.trim().split(/\s+/)[0]).filter(Boolean) : [value]) {
          if (external(v) || v.startsWith('/')) { problems.push(`${page} loads ${v} (only this version's files, relative)`); continue; }
          const target = resolve(dirname(p), bare(v));
          if (!target.startsWith(app + sep)) { problems.push(`${page} loads ${v}, which is outside v/${ver}/`); continue; }
          if (!isFile(target)) { problems.push(`${page} loads ${v}, which is not in the site`); continue; }
          if (target.endsWith('.css')) {
            for (const s of specifiers(readFileSync(target, 'utf8'), true).lit) if (external(s) && !s.startsWith('#')) problems.push(`${rel(out, target)} (loaded by ${page}) names ${s}, another site`);
          }
          enqueue(target, page);
        }
      }
    }
  }
  // _headers: the same strict policy for /legal/*
  const hp = join(out, '_headers');
  if (isFile(hp)) {
    const block = readFileSync(hp, 'utf8').split(/\n(?=\S)/).find((b) => b.startsWith('/legal/*')) || '';
    if (!/Content-Security-Policy:\s*default-src 'none';/.test(block)) problems.push("_headers: /legal/* lacks Content-Security-Policy default-src 'none'");
    if (!/frame-ancestors 'none'/.test(block)) problems.push("_headers: /legal/* lacks frame-ancestors 'none'");
    if (/script-src|unsafe-/.test(block)) problems.push('_headers: /legal/* allows script');
  }
  return pages;
}
const rel = (out, p) => relative(out, p).split(sep).join('/');

/** Section 5: the sign-in pieces. Returns a one-line summary. */
async function checkAuth(out, app, problems, stage) {
  // the vendored library: exactly the pinned file
  const vdir = join(app, 'vendor/supabase');
  let man = null;
  try { man = JSON.parse(readFileSync(join(vdir, 'manifest.json'), 'utf8')); } catch (e) { problems.push(`vendor/supabase/manifest.json: ${e.message}`); }
  if (man) {
    const f = join(vdir, man.file || 'supabase.js');
    if (!isFile(f)) problems.push(`vendor/supabase/${man.file} is missing`);
    else {
      const buf = readFileSync(f);
      const sha = createHash('sha256').update(buf).digest('hex');
      if (sha !== man.sha256) problems.push(`vendor/supabase/${man.file}: sha256 ${sha.slice(0, 12)}... is not the pinned ${String(man.sha256).slice(0, 12)}...`);
      const sri = `sha384-${createHash('sha384').update(buf).digest('base64')}`;
      if (sri !== man.sri) problems.push(`vendor/supabase/${man.file}: SRI differs from manifest.json`);
      const client = join(app, 'src/auth/client.js');
      if (isFile(client) && !readFileSync(client, 'utf8').includes(`integrity: '${sri}'`)) problems.push('src/auth/client.js does not load vendor/supabase with the pinned SRI');
    }
    if (!isFile(join(vdir, 'LICENSE'))) problems.push('vendor/supabase/LICENSE is missing');
  }
  // _headers for /auth/*
  const hp = join(out, '_headers');
  if (!isFile(hp)) problems.push('_headers is missing');
  else {
    const h = readFileSync(hp, 'utf8');
    const block = h.split(/\n(?=\S)/).find((b) => b.startsWith('/auth/*')) || '';
    const need = { 'Cache-Control: no-store': /Cache-Control:\s*no-store/i, 'Referrer-Policy: no-referrer': /Referrer-Policy:\s*no-referrer/i, 'X-Frame-Options: DENY': /X-Frame-Options:\s*DENY/i, "frame-ancestors 'none'": /frame-ancestors 'none'/i };
    for (const [label, re] of Object.entries(need)) if (!re.test(block)) problems.push(`_headers: /auth/* lacks ${label}`);
  }
  // the published public values
  const pc = join(app, 'src/auth/public-config.js');
  let summary = 'sign-in: no public-config.js';
  if (!isFile(pc)) problems.push('src/auth/public-config.js is missing');
  else {
    const src = readFileSync(pc, 'utf8');
    if (/sb_secret_|service_role/i.test(src)) problems.push('src/auth/public-config.js holds a secret');
    try {
      const { default: cfg } = await import(`${pathToFileURL(pc).href}?check=${Date.now()}`);
      const { validatePublicConfig } = await import(pathToFileURL(join(app, 'src/auth/config.js')).href);
      const keys = Object.keys(cfg || {}).sort().join(',');
      if (cfg?.enabled) {
        if (keys !== 'enabled,key,mode,url') problems.push(`src/auth/public-config.js publishes ${keys} (only enabled, url, key, mode allowed)`);
        const v = validatePublicConfig({ url: cfg.url, key: cfg.key, mode: cfg.mode, stage });
        if (!v.ok) problems.push(`src/auth/public-config.js: ${v.error}`);
        summary = `sign-in on (${cfg.mode}, ${cfg.url})`;
      } else {
        if (keys !== 'enabled') problems.push(`src/auth/public-config.js (off) publishes ${keys}`);
        summary = 'sign-in off';
      }
    } catch (e) { problems.push(`src/auth/public-config.js does not load: ${e.message}`); }
  }
  return summary;
}

// run by any path: a linked checkout compares real paths (import.meta.url is the real one), or the check would silently not run
let main = false;
try { main = !!process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url); } catch { /* not a file: imported */ }
if (main) {
  const [outArg, ver] = process.argv.slice(2);
  if (!outArg || !ver) { console.error('usage: node tools/site/check.mjs <out-dir> <version>'); process.exit(2); }
  const r = await checkSite(outArg, ver);
  console.log(`check: ${r.reached} files reached from index.html, auth/callback/ and legal/; ${r.templates.length} template imports matched; asset urls ${r.assets.checked}, missing ${r.assets.missing}; ${r.auth}; legal pages ${(r.legal || []).length}; ${r.preloaded ?? 0} boot modules preloaded; ${r.scanned ?? 0} files scanned for secrets`);
  if (r.allowed.length) console.log(`check: local-only, not published (allowed): ${r.allowed.join(', ')}`);
  for (const n of r.notes) console.log(`check: note: ${n}`);
  if (process.env.CHECK_VERBOSE) for (const t of r.templates) console.log(`check: template ${t}`);
  if (r.problems.length) {
    console.error(`check: ${r.problems.length} problem${r.problems.length === 1 ? '' : 's'} in ${outArg}:`);
    for (const p of r.problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log('check: ok');
}
