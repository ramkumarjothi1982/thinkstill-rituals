// Static guard for deterministic code: engine/ and composer/ must never read
// wall-clock time or unseeded randomness. Frames are pure functions of t on a
// virtual clock, and every random choice comes from a seeded stream.
//
// How: every file is PARSED (Acorn, vendored in ./vendor) and the guard judges
// the syntax tree, not the text. So identifier escapes (M\u0061th) are decoded,
// a regex literal can never be mistaken for a division (or the reverse), and a
// file that does not parse is itself a finding: no spelling can hide code.
//
// What is a finding ("clock"):
//   - every use of Math, Date, performance, crypto and Temporal that can read
//     the clock or unseeded randomness. They are recognised by NAME, wherever
//     the name appears: as a variable, or as a property of ANY object, reached
//     by `.x`, `?.x` or a constant key (`['x']`, `['M'+'ath']`, `[\`x\`]`). So
//     window.window.Date.now(), frames.Math.random(), globalThis?.Math.random()
//     and document.defaultView.performance.now() are all Date.now/Math.random/
//     performance.now. Allowed uses:
//       Math         any member except random; destructuring without random
//       Date         new Date(<args>), Date.UTC, Date.parse, x instanceof Date
//       performance  nothing (typeof checks only)
//       crypto       anything except getRandomValues / randomUUID
//       Temporal     anything except Temporal.Now
//     Using the object as a value (const M = Math; f(Date); Reflect.get(Math, …)),
//     a computed key (Math[k]) or a rest destructuring is a finding, because it
//     hides which member is read. Assigning is allowed, because that is how the
//     virtual clock installs itself (Math.random = mulberry32(seed);
//     performance.now = () => t; window.Date = VirtualDate).
//   - Node's clocks: process.hrtime/uptime/cpuUsage/resourceUsage, node:perf_hooks,
//     and node:crypto's random functions; Intl's format()/formatToParts() with no
//     date (they format the current time), event.timeStamp, document.timeline.
//   - the global object indexed by a computed key (window[k], globalThis[f()]),
//     or handed to Reflect/Object reflection: either could reach any of the above.
//     Global objects are globalThis, window (and self, frames, top, parent,
//     opener unless the file declares that name), x.globalThis, x.window,
//     x.defaultView, x.contentWindow, <global>.self/frames/top/parent/opener,
//     local variables bound to one of these, and `this` at the top level of a
//     classic script (or in its plain functions).
//   - a string or template text that spells a banned call ('Math.random'):
//     it can be fed to one of the sinks below or injected into a page.
// What is a finding ("code"): every syntactic route from a string to running
//   code, because code built at run time could do any of the above: eval,
//   Function (except `x instanceof Function`), any .constructor access (it
//   reaches Function from any function), setTimeout/setInterval with a code
//   string, import()/Worker/SharedWorker/importScripts/addModule/require with a
//   computed specifier, document.write, innerHTML/outerHTML/srcdoc assignment,
//   insertAdjacentHTML, creating a <script> element (or <base>, <iframe>,
//   <frame>, <portal>, <object>, <embed>, which load from a URL; or
//   createElement with a computed tag), inline on* handler attributes,
//   javascript: URLs, node:vm/worker_threads/child_process/module/cluster/
//   inspector/repl, process.getBuiltinModule, and every route to CommonJS's
//   loader except require(<constant>) and module.require(<constant>): require
//   as a value (an alias, require.call, (0, require)), require.cache /
//   extensions / main, another module's .require, module.load / paths /
//   parent / children, the loader's internals (_compile, _load, …), and
//   `arguments` outside a function (in CommonJS, the wrapper's require). A
//   sink used other than by calling it (const st = setTimeout;
//   setTimeout.call(…)) is a finding too, so no alias can carry a code string
//   past the rules. A `with` statement is a finding: every name inside it may
//   read a property of an object the guard cannot follow.
// What is a finding ("scan"): a file that does not parse, a file type the guard
//   cannot read (.ts, .jsx, .wasm, …), a symlink to code outside the studio,
//   and an import the guard cannot follow (a URL, an absolute path, a package
//   that is not installed, a file outside the studio and the locked code, a
//   file that is neither JS nor JSON, an import map that is not inline JSON).
//
// What is followed: everything engine/ and composer/ can load is judged by the
// same rules, wherever it lives, so no helper can carry Date.now in:
//   - studio code they import from elsewhere ("followed");
//   - hash-locked code ("locked": the frozen v2 paths and the live app). It
//     cannot be edited, so a finding there needs a reviewed allowlist entry;
//   - packages ("packages"): a bare specifier is resolved through node_modules
//     as Node does, and every entry the package can expose (each `exports`
//     condition, main, module, browser) is judged; relative imports into a
//     node_modules folder too. Folders named node_modules are not walked
//     otherwise: code there runs only if something imports it;
//   - symlinked directories and files, walked by every PATH that reaches them
//     (sorted, so the result never depends on readdir order; a path whose real
//     directory is already open on the way down is a cycle and ends; more than
//     VISIT_CAP directories is a finding). A module's imports are resolved from
//     each path it is reachable by (browsers resolve against the URL) and from
//     its real path (Node), so every target is judged;
//   - HTML: <script src> (and the href / xlink:href of SVG scripts), the
//     addresses of import maps (a map can send any specifier anywhere, so every
//     address it names is loaded code, a prefix mapping a whole folder),
//     <iframe>/<frame>/<portal> pages, <object data>, <embed src>, <meta
//     http-equiv=refresh>, <iframe srcdoc> (judged in place), and a relative
//     <base href> (every relative URL of the page is resolved from the page's
//     directory and from the base; a base that is not a relative path is a
//     finding); navigator.serviceWorker.register(<constant>) (a service worker
//     can rewrite every module the page fetches; any other use of serviceWorker
//     is a finding); CommonJS require() and module.require() with Node's
//     probing (extensions incl. .node, index files, package main).
//
// What a static guard cannot see:
//   - a property NAME computed at run time from data (o[k] with k returned by a
//     function) on an object it cannot identify as the global object or a clock
//     object (for example the global object passed in as a function argument);
//   - time that arrives as data: requestAnimationFrame timestamps, media/audio
//     currentTime, the order of asynchronous events;
//   - an excused handle passed INTO a function on an allowlisted line: what the
//     line stores (the call's result) is watched, not what the callee keeps;
//   - what a carrier's OWN methods do with `this` (a `get self() { return this }`
//     would hand the carrier on): the object literal is reviewed with the entry
//     that makes it a carrier (the v1 clock's methods only touch its state);
//   - the page URL changed at run time (an existing <base> element's href set by
//     script, history.pushState), which moves the relative dynamic imports of
//     inline scripts; navigation to another page by script (location = …);
//   - which page loads a module: import maps are followed as extra targets, so
//     a module named both directly and through a map is judged both ways.
// Every route the language offers to NAME these APIs in source is covered. For
// the rest, the backstop is the virtual clock itself (it replaces Math.random,
// performance.now and Date.now on the global object before engine code runs,
// so even a run-time lookup gets the virtual one) and the pixel/state parity
// gates, which render twice and compare.
//
// Comments are ignored, so docs may name the rule. There is no inline opt-out.
// The only exceptions are WALLCLOCK_ALLOWED entries: each pins one file, one
// exact source line (which must occur exactly once in that file) and the
// finding(s) it may produce, with a reason. An entry fails the guard when it is
// stale (no longer produces that finding), pending (its file does not exist or
// is not scanned) or ambiguous (its line occurs more than once).
//
// Excusing a clock finding never excuses the handle it creates. The guard
// follows where the excused value goes (escapeOf), across files:
//   - a variable it is stored in (and every binding declared on the line) is
//     watched in that file: each later use or export of it is a finding;
//   - an object property it is stored in (`{ realNow: realPerfNow }`) is
//     watched by NAME in every scanned file: each read of `.realNow`, a
//     destructuring of it, a constant key or a string spelling it is a finding;
//   - the global property that property's object, or the value itself, is
//     published as (`window.__hushClock = clock`) is watched in every file:
//     each read of `__hushClock` is a finding;
//   - the object that holds it is a CARRIER (`export const clock = { realNow: … }`),
//     followed wherever it goes: into variables (aliases, destructured members),
//     exports and every import of them (named, default, namespace, re-exports,
//     export *), objects it is stored in (whose member it then is), and globals
//     (any read of the global is a finding). A carrier may be read by member
//     NAME (the handle's own name is watched everywhere) or tested; any other use
//     (Object.values, for-in, spread, rest, a computed key, `with`, passing it to
//     a call) could reach every member and is a finding, and so is loading its
//     module by import() or require(), whose module object the guard cannot follow;
//   - a value that leaves the line any other way (returned, exported, passed to
//     a call as a statement, stored under a computed key or on an object the
//     guard cannot name) is a finding that no entry can excuse.
// Each of these findings needs its own reviewed entry, and an entry for one
// extends the watch in turn (the guard iterates to a fixpoint).

import fs from 'node:fs';
import path from 'node:path';
import { builtinModules } from 'node:module';
import { parse as acornParse } from './vendor/acorn.mjs';
import { FROZEN } from './paths.mjs';

export const DETERMINISTIC_DIRS = Object.freeze(['engine', 'composer']);
const CODE_EXT = /\.(m?js|cjs)$/i;
const HTML_EXT = /\.html?$/i;
const UNSCANNABLE_EXT = /\.(ts|mts|cts|tsx|jsx|coffee|wasm)$/i;

/**
 * The reviewed exceptions: { file (studio-relative), line (exact source line,
 * trimmed), apis (the findings it may produce), reason }. Register an entry in
 * the same change that adds the line it excuses; entries for files that do not
 * exist fail the guard.
 *
 * The five entries below are all in hash-locked v1/v2 stage code (FROZEN), so
 * their lines cannot change. The guard reaches that code only on paper:
 * engine/directions.js imports the frozen v2 module, which names
 * '../stage2/*.js' literally; in the engine page, engine/index.html's import map
 * sends every one of those URLs to the engine's own copies, so frozen stage2
 * (and the v1 clock it imports) never loads there (tests/guard/no-wallclock.test.mjs
 * checks the map covers every stage2 import of the v2 module). The guard still
 * judges the literal graph, and the handles stay watched: excusing clock.js's
 * exports makes every read of `.realNow`, `.RealDate` and of the global
 * `__hushClock` (where clock.js publishes them) a finding in all scanned code,
 * and the exported `clock` object a carrier: every importer may read its members
 * by name (stage2/stage.js calls clock.step) and nothing else.
 */
const STAGE2_BY_IMPORT_MAP = 'Frozen v2 stage (hash-locked). Reached only because the frozen v2 module names ../stage2/stage.js; '
  + 'engine/index.html maps that URL to engine/stage.js, so this file never loads in the engine page.';
const V1_CLOCK = 'Frozen v1 clock (hash-locked), imported by frozen stage2/stage.js only, which the engine page never loads (import map). ';
export const WALLCLOCK_ALLOWED = Object.freeze([
  {
    file: 'stage2/stage.js', line: 'const mod = await import(`../videos/${videoId}.js`);',
    apis: ['import() with a computed specifier (dynamic code)'],
    reason: `${STAGE2_BY_IMPORT_MAP} The engine loads directions through constant import() thunks (engine/directions.js).`,
  },
  {
    file: 'stage/components/clock.js', line: 'const realPerfNow = performance.now.bind(performance);',
    apis: ['performance.now', 'performance (as a value)'],
    reason: `${V1_CLOCK}The capture is never called; its only use is the clock.realNow export (line 85), whose reads stay findings.`,
  },
  {
    file: 'stage/components/clock.js', line: 'const RealDate = Date;',
    apis: ['Date (as a value)'],
    reason: `${V1_CLOCK}The capture is never used; its only use is the clock.RealDate export (line 86), whose reads stay findings.`,
  },
  {
    file: 'stage/components/clock.js', line: 'realNow: realPerfNow,',
    apis: ['real-clock handle realPerfNow (from allowlisted line 42)'],
    reason: `${V1_CLOCK}Exported as clock.realNow and published as window.__hushClock: every read of .realNow or __hushClock is a finding.`,
  },
  {
    file: 'stage/components/clock.js', line: 'RealDate,',
    apis: ['real-clock handle RealDate (from allowlisted line 44)'],
    reason: `${V1_CLOCK}Exported as clock.RealDate and published as window.__hushClock: every read of .RealDate or __hushClock is a finding.`,
  },
]);

// ---------------------------------------------------------------- vocabulary

const CLOCK_OBJECTS = new Set(['Math', 'Date', 'performance', 'crypto', 'Temporal']);
const MEMBER_RULES = {
  Math: (m, assigned) => (m === 'random' && !assigned ? 'Math.random' : null),
  Date: (m, assigned) => (m === 'now' && !assigned ? 'Date.now' : null),
  performance: (m, assigned) => (m === 'now' && assigned ? null : `performance.${m}`),
  crypto: (m, assigned) => ((m === 'getRandomValues' || m === 'randomUUID') && !assigned ? `crypto.${m}` : null),
  Temporal: (m) => (m === 'Now' ? 'Temporal.Now' : null),
  // getBuiltinModule loads node:vm and friends by name; mainModule is another module (its require, load, _compile)
  process: (m) => (PROCESS_CLOCK.test(m) ? `process.${m}` : null),
};
const GLOBAL_IDS = new Set(['globalThis', 'window']);
const GLOBAL_IDS_UNLESS_DECLARED = new Set(['self', 'frames', 'top', 'parent', 'opener', 'global']);   // common local names too (global: Node's)
const GLOBAL_PROPS = new Set(['globalThis', 'window', 'defaultView', 'contentWindow']);       // on any receiver
const TIMERS = new Set(['setTimeout', 'setInterval', 'setImmediate', 'execScript']);
// code-running sinks: judged where they are called; used as a value (an alias) they are a finding
const SINKS = new Set([...TIMERS, 'importScripts', 'Worker', 'SharedWorker', 'insertAdjacentHTML', 'createContextualFragment']);
const BANNED_TEXT = /\b(Math\s*\.\s*random|Date\s*\.\s*now|performance\s*\.\s*now|crypto\s*\.\s*(?:getRandomValues|randomUUID))\b/g;
const BANNED_MODULES = {
  perf_hooks: 'reads the clock', vm: 'runs code from strings', worker_threads: 'runs code', child_process: 'runs programs',
  module: 'loads code (createRequire)', cluster: 'runs code', inspector: 'runs code', repl: 'runs code from strings',
};
const CRYPTO_RANDOM = /random|getRandomValues|webcrypto|subtle|generate/i;
const PROCESS_CLOCK = /^(hrtime|uptime|cpuUsage|resourceUsage|binding|_linkedBinding|dlopen|getBuiltinModule|mainModule)$/;
const BUILTINS = new Set(builtinModules);
// CommonJS: require(<constant>) and module.require(<constant>) are followed; every other route to the loader is a finding
const MODULE_LOADER = new Set(['require', 'load', 'paths', 'parent', 'children']);           // members of `module` that load or redirect code
const LOADER_INTERNALS = /^_(compile|load|resolveFilename|resolveLookupPaths|findPath|extensions|cache|pathCache|nodeModulePaths|initPaths|preloadModules)$/;
// elements a script can create that load a page or code from a URL (or change where relative URLs resolve)
const LOADING_TAGS = new Set(['script', 'base', 'iframe', 'frame', 'portal', 'object', 'embed']);
// expressions a value flows through on its way to where it is stored (escapeOf)
const FLOW_THROUGH = new Set(['MemberExpression', 'ChainExpression', 'AwaitExpression', 'UnaryExpression', 'BinaryExpression', 'LogicalExpression',
  'ConditionalExpression', 'TemplateLiteral', 'TaggedTemplateExpression', 'SequenceExpression', 'ArrayExpression', 'SpreadElement',
  'ArrowFunctionExpression', 'FunctionExpression', 'YieldExpression', 'ParenthesizedExpression', 'ClassExpression']);

// ---------------------------------------------------------------- parsing

const PARSE_OPTS = { ecmaVersion: 'latest', locations: true, allowHashBang: true };

/** Parse as an ES module, falling back to a classic script. Throws the module error if neither parses. */
function parseJs(code, sourceType) {
  if (sourceType) return { ast: acornParse(code, { ...PARSE_OPTS, sourceType }), sourceType };
  try {
    return { ast: acornParse(code, { ...PARSE_OPTS, sourceType: 'module' }), sourceType: 'module' };
  } catch (e) {
    try { return { ast: acornParse(code, { ...PARSE_OPTS, sourceType: 'script' }), sourceType: 'script' }; } catch { throw e; }
  }
}

const ENTITIES = { quot: '"', apos: "'", amp: '&', lt: '<', gt: '>' };
const decodeEntities = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') return String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1)));
  return ENTITIES[e.toLowerCase()] ?? m;
});
const JS_TYPES = /^(|module|text\/javascript|application\/javascript|text\/ecmascript|application\/ecmascript)$/i;

/** An attribute's value in a start tag's attribute text (entities decoded), or null. */
function attrOf(attrs, name) {
  const m = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i').exec(attrs);
  return m ? decodeEntities(m[1] ?? m[2] ?? m[3]) : null;
}
/** A <base href> the guard can resolve: a relative path (not a URL with a scheme, not rooted at the server). */
const relativeHref = (h) => !/^[a-z][a-z0-9+.-]*:/i.test(h) && !/^[/\\]/.test(h);

/**
 * The code inside an HTML file: <script> bodies (JS types only), inline on*
 * handler attributes, plus what the page loads: script sources (src, and the
 * href / xlink:href of SVG scripts), import maps (every address they map to is
 * code the page can load), other documents (<iframe>, <frame>, <portal>,
 * <object data>, <embed>, <meta http-equiv=refresh>, and <iframe srcdoc>,
 * scanned in place), javascript: URLs and <base href> (it moves every relative
 * URL of the page).
 * → { blocks: [{ code, offset, sourceType, lineShift? }], imports: [{ spec, offset, kind }],
 *     maps: [{ offset, body, src }], urls: [offset], bases: [{ href, offset }] }
 */
function htmlCode(html) {
  const blocks = [], imports = [], maps = [], urls = [], bases = [];
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    const attrs = m[1];
    const type = (attrOf(attrs, 'type') ?? '').trim();
    if (/^importmap$/i.test(type)) { maps.push({ offset: m.index, body: m[2], src: attrOf(attrs, 'src') !== null }); continue; }
    if (!JS_TYPES.test(type)) continue;                                   // data blocks (JSON, shaders)
    blocks.push({ code: m[2], offset: m.index + m[0].indexOf('>') + 1, sourceType: /module/i.test(type) ? 'module' : 'script' });
  }
  for (const m of html.matchAll(/<script\b([^>]*)>/gi)) {                   // every start tag, closed or not (SVG: <script href="…"/>)
    if (!JS_TYPES.test((attrOf(m[1], 'type') ?? '').trim())) continue;
    for (const a of ['src', 'href', 'xlink:href']) { const v = attrOf(m[1], a); if (v) imports.push({ spec: v, offset: m.index, kind: 'script' }); }
  }
  for (const m of html.matchAll(/<(iframe|frame|portal|object|embed|base|meta)\b([^>]*)>/gi)) {
    const tag = m[1].toLowerCase(), attrs = m[2];
    if (tag === 'base') { const h = attrOf(attrs, 'href'); if (h !== null) bases.push({ href: h, offset: m.index }); continue; }
    if (tag === 'meta') {                                                    // <meta http-equiv="refresh" content="0; url=page.html">: navigates
      if (!/^refresh$/i.test((attrOf(attrs, 'http-equiv') ?? '').trim())) continue;
      const u = /;\s*url\s*=\s*['"]?([^'"]+)/i.exec(attrOf(attrs, 'content') ?? '')?.[1].trim();
      if (u) imports.push({ spec: u, offset: m.index, kind: 'frame' });
      continue;
    }
    const src = attrOf(attrs, tag === 'object' ? 'data' : 'src');
    if (src && !/^about:blank$/i.test(src)) imports.push({ spec: src, offset: m.index, kind: 'frame' });
    const doc = tag === 'iframe' ? attrOf(attrs, 'srcdoc') : null;
    if (doc !== null) {                                                      // an inline document: judged in place, at the iframe's line
      const inner = htmlCode(doc);
      for (const b of inner.blocks) blocks.push({ ...b, offset: m.index, lineShift: doc.slice(0, b.offset).split('\n').length - 1 + (b.lineShift ?? 0) });
      for (const x of inner.imports) imports.push({ ...x, offset: m.index });
      for (const x of inner.maps) maps.push({ ...x, offset: m.index });
      for (const x of inner.bases) bases.push({ ...x, offset: m.index });
      for (let k = 0; k < inner.urls.length; k++) urls.push(m.index);
    }
  }
  for (const m of html.matchAll(/<[a-z][^>]*>/gi)) {
    for (const a of m[0].matchAll(/\s(on[a-z]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
      const raw = a[3] ?? a[4] ?? a[5];
      blocks.push({ code: decodeEntities(raw), offset: m.index + a.index + a[0].indexOf(raw), sourceType: 'script', handler: true });
    }
    for (const a of m[0].matchAll(/=\s*["']?\s*javascript:/gi)) urls.push(m.index + a.index);
  }
  return { blocks, imports, maps, urls, bases };
}

/** Every address an import map maps to (imports and scopes). Throws if the map is not JSON. */
function importMapTargets(body) {
  const map = JSON.parse(body);
  const values = (o) => (o && typeof o === 'object' ? Object.values(o).filter((v) => typeof v === 'string') : []);
  return [...values(map.imports), ...Object.values(map.scopes ?? {}).flatMap(values)];
}

// ---------------------------------------------------------------- tree helpers

function* children(node) {
  for (const key in node) {
    if (key === 'type' || key === 'loc' || key === 'start' || key === 'end') continue;
    const v = node[key];
    if (Array.isArray(v)) { for (const c of v) if (c && typeof c.type === 'string') yield c; }
    else if (v && typeof v.type === 'string') yield v;
  }
}
// Acorn shares one node between two parents in a few places (export { x }: local
// and exported), so each node is visited once.
function walk(node, visit, anc = [], seen = new WeakSet()) {
  if (seen.has(node)) return;
  seen.add(node);
  visit(node, anc);
  anc.push(node);
  for (const c of children(node)) walk(c, visit, anc, seen);
  anc.pop();
}

/** Names bound by a declaration pattern. */
function patternNames(p, out = []) {
  if (!p) return out;
  switch (p.type) {
    case 'Identifier': out.push(p); break;
    case 'ObjectPattern': for (const q of p.properties) patternNames(q.type === 'RestElement' ? q.argument : q.value, out); break;
    case 'ArrayPattern': for (const q of p.elements) patternNames(q, out); break;
    case 'RestElement': patternNames(p.argument, out); break;
    case 'AssignmentPattern': patternNames(p.left, out); break;
    default: break;
  }
  return out;
}

/** True when Identifier `id`, child of `p` (grandparent `g`), is a read or write of a variable (not a name or a binding). */
function isReference(id, p, g) {
  if (!p) return true;
  switch (p.type) {
    case 'MemberExpression': return p.object === id || p.computed;
    case 'Property': if (p.key === id && !p.computed) return false; return !(g?.type === 'ObjectPattern' && p.value === id);
    case 'PropertyDefinition': case 'MethodDefinition': return p.computed && p.key === id || p.value === id;
    case 'VariableDeclarator': return p.init === id;
    case 'FunctionDeclaration': case 'FunctionExpression': case 'ArrowFunctionExpression': return p.body === id;
    case 'ClassDeclaration': case 'ClassExpression': return p.superClass === id;
    case 'CatchClause': return p.param !== id;
    case 'ImportSpecifier': case 'ImportDefaultSpecifier': case 'ImportNamespaceSpecifier': return false;
    case 'ExportSpecifier': return p.local === id && !g?.source;           // export { x }: x is read (not in a re-export)
    case 'ExportAllDeclaration': return false;
    case 'LabeledStatement': case 'BreakStatement': case 'ContinueStatement': return false;
    case 'MetaProperty': return false;
    case 'ArrayPattern': case 'RestElement': return false;
    case 'AssignmentPattern': return p.right === id;
    default: return true;
  }
}

// ---------------------------------------------------------------- analysis

/**
 * Analyse one source text (a JS module/script, or an HTML page with `html`).
 * → { findings: [{ api, cat, line, text }],
 *     imports: [{ spec, line, kind, specifiers?, reexports? }]   specifiers: [{ imported ('*' for a namespace), local }],
 *                                              reexports: [{ local ('*' for export *), exported (null for export * from) }],
 *     bases:   [{ href, line }]                  relative <base href> of an HTML page,
 *     declared: Map<line, [{ name, exported, exportedAs }]>,
 *     refs:    [{ name, line, write, escape, carry }]   variable references,
 *     members: [{ name, line, write, escape, carry, chain }]  property reads by a static or constant name (destructuring
 *                                              keys included); chain: ['a', 'b', 'c'] for a.b.c, or null,
 *     strings: [{ value, line }]                 string and template texts }
 * A clock finding also carries a non-enumerable `escape`: where the value it
 * reads ends up (see escapeOf); `carry` says how a reference or member value is
 * used (see carryOf). scanDirs uses them and the lists above to follow a
 * real-clock handle that an allowlist entry excuses, and the objects that hold one.
 */
export function analyzeSource(src, { html = false } = {}) {
  const lines = src.split('\n');
  const lineAt = (offset) => src.slice(0, offset).split('\n').length;
  const out = { findings: [], imports: [], bases: [], declared: new Map(), refs: [], members: [], strings: [] };
  const finding = (api, cat, line, escape) => {
    const f = { api, cat, line, text: (lines[line - 1] ?? '').trim() };
    if (escape) Object.defineProperty(f, 'escape', { value: escape, enumerable: false });
    out.findings.push(f);
  };

  let units;
  if (html) {
    const h = htmlCode(src);
    for (const u of h.urls) finding('javascript: URL (dynamic code)', 'code', lineAt(u));
    for (const i of h.imports) out.imports.push({ spec: i.spec, line: lineAt(i.offset), kind: i.kind });
    for (const m of h.maps) {
      const line = lineAt(m.offset);
      if (m.src) { finding('an external import map (src=): the guard cannot follow it', 'scan', line); continue; }
      let targets;
      try { targets = importMapTargets(m.body); } catch (e) { finding(`unparseable import map (${e.message}): the guard cannot follow it`, 'scan', line); continue; }
      for (const spec of targets) out.imports.push({ spec, line, kind: 'importmap' });
    }
    for (const b of h.bases) {
      const line = lineAt(b.offset);
      if (relativeHref(b.href)) out.bases.push({ href: b.href, line });
      else finding(`a <base href> that is not a relative path (${b.href.slice(0, 40)}): the guard cannot follow the page's relative URLs`, 'scan', line);
    }
    units = h.blocks.map((b) => ({ ...b, lineBase: lineAt(b.offset) - 1 + (b.lineShift ?? 0) }));
  } else {
    units = [{ code: src, offset: 0, lineBase: 0 }];
  }
  for (const u of units) {
    let parsed;
    try { parsed = parseJs(u.code, u.sourceType); } catch (e) {
      finding(`unparseable (${e.message.replace(/\s*\(\d+:\d+\)$/, '')}): the guard cannot check it`, 'scan', u.lineBase + (e.loc?.line ?? 1));
      continue;
    }
    analyzeTree(parsed.ast, parsed.sourceType, (line) => line + u.lineBase, out, finding);
  }
  out.findings.sort((a, b) => a.line - b.line);
  return out;
}

function analyzeTree(ast, sourceType, L, out, finding) {
  // Pass 1: declared names, `const` initialisers (for constant folding), local aliases of the global object.
  const declared = new Set(), consts = new Map(), constCount = new Map();
  walk(ast, (n, anc) => {
    const p = anc[anc.length - 1];
    if (n.type === 'VariableDeclarator') {
      for (const id of patternNames(n.id)) declared.add(id.name);
      if (n.id.type === 'Identifier' && p?.kind === 'const' && n.init) { consts.set(n.id.name, n.init); constCount.set(n.id.name, (constCount.get(n.id.name) ?? 0) + 1); }
    } else if (/Function/.test(n.type)) {
      if (n.id) declared.add(n.id.name);
      for (const q of n.params) for (const id of patternNames(q)) declared.add(id.name);
    } else if (n.type === 'ClassDeclaration' && n.id) declared.add(n.id.name);
    else if (n.type === 'CatchClause' && n.param) for (const id of patternNames(n.param)) declared.add(id.name);
    else if (/^Import(Default|Namespace)?Specifier$/.test(n.type)) declared.add(n.local.name);
  });
  for (const [k, c] of constCount) if (c > 1) consts.delete(k);     // only unambiguous constants fold

  // Constant value of an expression (a string), or null when it is not a compile-time constant.
  const fold = (node, seen = new Set()) => {
    if (!node) return null;
    switch (node.type) {
      case 'Literal': return node.regex || node.value === null || typeof node.value === 'object' ? null : String(node.value);
      case 'TemplateLiteral': {
        let s = node.quasis[0].value.cooked ?? '';
        for (let i = 0; i < node.expressions.length; i++) {
          const v = fold(node.expressions[i], seen);
          if (v === null) return null;
          s += v + (node.quasis[i + 1].value.cooked ?? '');
        }
        return s;
      }
      case 'BinaryExpression': {
        if (node.operator !== '+') return null;
        const a = fold(node.left, seen), b = fold(node.right, seen);
        return a === null || b === null ? null : a + b;
      }
      case 'SequenceExpression': return fold(node.expressions[node.expressions.length - 1], seen);
      case 'NewExpression':                  // new URL('./w.js', import.meta.url): the module worker idiom
        if (node.callee.type === 'Identifier' && node.callee.name === 'URL' && isImportMetaUrl(node.arguments[1])) return fold(node.arguments[0], seen);
        return null;
      case 'MemberExpression':               // new URL(…, import.meta.url).href
        return !node.computed && node.property.name === 'href' && node.object.type === 'NewExpression' ? fold(node.object, seen) : null;
      case 'Identifier': {
        if (!consts.has(node.name) || seen.has(node.name)) return null;
        seen.add(node.name);
        return fold(consts.get(node.name), seen);
      }
      default: return null;
    }
  };
  function isImportMetaUrl(a) {
    return a?.type === 'MemberExpression' && a.object.type === 'MetaProperty' && a.object.meta.name === 'import' && !a.computed && a.property.name === 'url';
  }
  /** The property name a member expression reads: static, or a constant computed key; null if computed at run time. */
  const propName = (m) => {
    if (!m.computed) return m.property.type === 'PrivateIdentifier' ? `#${m.property.name}` : m.property.name;
    return fold(m.property);
  };
  const keyName = (prop) => (prop.computed ? fold(prop.key) : prop.key.type === 'Identifier' ? prop.key.name : String(prop.key.value));
  const calleeName = (c) => {
    if (!c) return null;
    if (c.type === 'ChainExpression') return calleeName(c.expression);
    if (c.type === 'Identifier') return c.name;
    if (c.type === 'MemberExpression') return propName(c);
    return null;
  };

  // Local aliases of the global object (const g = window; let h = g; f(k = g)), collected to a fixpoint below.
  const aliases = new Set();
  const isGlobalObject = (node, anc) => {
    if (!node) return false;
    switch (node.type) {
      case 'ChainExpression': return isGlobalObject(node.expression, anc);
      case 'Identifier':
        return GLOBAL_IDS.has(node.name) || aliases.has(node.name) || (GLOBAL_IDS_UNLESS_DECLARED.has(node.name) && !declared.has(node.name));
      case 'MemberExpression': {
        const k = propName(node);
        return GLOBAL_PROPS.has(k) || (GLOBAL_IDS_UNLESS_DECLARED.has(k) && isGlobalObject(node.object, anc));
      }
      case 'ThisExpression': return sourceType === 'script' && thisIsGlobal(anc);
      default: return false;
    }
  };
  for (let size = -1; size !== aliases.size;) {
    size = aliases.size;
    walk(ast, (n) => {
      if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier' && isGlobalObject(n.init, [])) aliases.add(n.id.name);
      if (n.type === 'AssignmentExpression' && n.left.type === 'Identifier' && isGlobalObject(n.right, [])) aliases.add(n.left.name);
      if (n.type === 'AssignmentPattern' && n.left.type === 'Identifier' && isGlobalObject(n.right, [])) aliases.add(n.left.name);
    });
  }

  /** Which clock object (or 'process') an expression denotes, or null. */
  const clockObject = (node, p, g) => {
    if (node.type === 'Identifier') {
      if (!isReference(node, p, g)) return null;
      if (CLOCK_OBJECTS.has(node.name)) return node.name;
      if (node.name === 'process' && !declared.has(node.name)) return 'process';
      return null;
    }
    if (node.type === 'MemberExpression') {
      const k = propName(node);
      if (CLOCK_OBJECTS.has(k)) return k;
      if (k === 'process' && isGlobalObject(node.object, [])) return 'process';
    }
    return null;
  };

  /** Skip optional-chain wrappers: → { child, p, i } where p = anc[i] is the effective parent. */
  const useSite = (node, anc) => {
    let child = node, i = anc.length - 1;
    while (i >= 0 && anc[i].type === 'ChainExpression') { child = anc[i]; i--; }
    return { child, p: anc[i], i };
  };
  const isAssignTarget = (m, anc, i) => { const q = anc[i - 1]; return q?.type === 'AssignmentExpression' && q.operator === '=' && q.left === m; };
  const isWrite = (node, anc) => {
    const { child, p } = useSite(node, anc);
    return (p?.type === 'AssignmentExpression' && p.operator === '=' && p.left === child) || (p?.type === 'UpdateExpression')
      || ((p?.type === 'ForInStatement' || p?.type === 'ForOfStatement') && p.left === child);
  };

  /**
   * The binding or global property an object literal (anc[j]) is stored in, directly:
   * → { obj } | { globalObj } | {} (anywhere else, a literal nested in another included:
   * the guard cannot name the object that holds the value)
   */
  const objectHolder = (anc, j) => {
    const lit = anc[j], q = anc[j - 1];
    if (q?.type === 'VariableDeclarator' && q.init === lit && q.id.type === 'Identifier') return { obj: q.id.name };
    if (q?.type === 'AssignmentExpression' && q.operator === '=' && q.right === lit) {
      if (q.left.type === 'Identifier') return { obj: q.left.name };
      if (q.left.type === 'MemberExpression' && isGlobalObject(q.left.object, [])) { const k = propName(q.left); if (k !== null) return { globalObj: k }; }
    }
    return {};
  };
  /** An object the guard can follow by name: a variable, but not CommonJS's module/exports (what they hold is exported). */
  const namedObject = (o) => o.type === 'Identifier' && o.name !== 'module' && o.name !== 'exports';
  const nameOf = (x) => (x.type === 'Identifier' ? x.name : String(x.value));      // export names may be string literals
  /**
   * Where the value of `node` ends up, for following a real-clock handle that
   * an allowlist entry excuses. The value flows up through expressions (member
   * reads, calls, operators, arrays, function values) to its destination:
   *   { kind: 'bind', names }               a variable (declared or assigned)
   *   { kind: 'prop', prop, obj?, global?, globalObj? }  an object property: of the
   *                                         variable `obj`, of the global object, or
   *                                         of a literal bound to `obj` or stored on
   *                                         the global object as `globalObj`
   *   { kind: 'export', names }             exported under these names
   *   { kind: 'none' }                      consumed (a call of the handle, a test)
   *   { kind: 'untracked' }                 returned, thrown, passed to a call as a
   *                                         statement, or stored on an object the
   *                                         guard cannot name (an unbound or nested
   *                                         literal, module.exports, a.b.c = …)
   */
  function escapeOf(node, anc) {
    let child = node, viaArg = false;
    for (let i = anc.length - 1; i >= 0; i--) {
      const p = anc[i];
      switch (p.type) {
        case 'VariableDeclarator': return p.init === child ? { kind: 'bind', names: patternNames(p.id).map((x) => x.name) } : { kind: 'none' };
        case 'AssignmentPattern': return p.right === child ? { kind: 'bind', names: patternNames(p.left).map((x) => x.name) } : { kind: 'none' };
        case 'AssignmentExpression':
          if (p.right !== child) return { kind: 'none' };                       // overwritten: installing a replacement
          if (p.left.type === 'MemberExpression') {
            const o = p.left.object, global = isGlobalObject(o, []);
            if (!global && !namedObject(o)) return { kind: 'untracked' };
            return { kind: 'prop', prop: propName(p.left), global, ...(!global && { obj: o.name }) };
          }
          return { kind: 'bind', names: patternNames(p.left).map((x) => x.name) };
        case 'Property': {
          if (p.value !== child || anc[i - 1]?.type !== 'ObjectExpression') return { kind: 'untracked' };
          const holder = objectHolder(anc, i - 1);
          return holder.obj || holder.globalObj ? { kind: 'prop', prop: keyName(p), ...holder } : { kind: 'untracked' };
        }
        case 'ExportSpecifier': return { kind: 'export', names: [nameOf(p.exported)] };
        case 'ExportDefaultDeclaration': return { kind: 'export', names: ['default'] };
        case 'CallExpression': case 'NewExpression':
          if (p.callee !== child) viaArg = true;
          child = p;
          continue;
        case 'ExpressionStatement': case 'IfStatement': case 'WhileStatement': case 'DoWhileStatement': case 'ForStatement': case 'SwitchStatement': case 'SwitchCase':
          return { kind: viaArg ? 'untracked' : 'none' };
        default:
          if (FLOW_THROUGH.has(p.type)) { child = p; continue; }
          return { kind: 'untracked' };
      }
    }
    return { kind: 'untracked' };
  }

  /**
   * How the value of `node` (a reference or a member read) is used, for following
   * a carrier: an object that holds an excused real-clock handle (scanDirs).
   * A carrier may be read by member NAME (the handle's own name is watched
   * everywhere) or moved whole to a place the guard can name; any other use could
   * reach every member, the handle included (Object.values, for-in, spread, rest,
   * computed keys, with, passing it to a call), so it is { k: 'use' }.
   *   { k: 'member', name }        x.name or x['name']
   *   { k: 'destructure', keys }   const { a, b: c } = x   (keys: [{ key, names }])
   *   { k: 'alias', names }        const y = x; y = x
   *   { k: 'store', prop, obj? , global? }  o.prop = x; const o = { prop: x }; window.prop = x
   *   { k: 'export', names }       export { x as n }; export default x
   *   { k: 'safe' }                typeof x, !x, x === y, a test (if, while, ?:)
   *   { k: 'use' }                 anything else
   */
  const USE = Object.freeze({ k: 'use' }), SAFE = Object.freeze({ k: 'safe' });
  const carryTarget = (t) => {
    if (t.type === 'Identifier') return { k: 'alias', names: [t.name] };
    if (t.type === 'ObjectPattern') {
      const keys = [];
      for (const q of t.properties) {
        if (q.type === 'RestElement') return USE;
        const key = keyName(q), v = q.value.type === 'AssignmentPattern' ? q.value.left : q.value;
        if (key === null || v.type !== 'Identifier') return USE;              // computed key, nested pattern
        keys.push({ key, names: [v.name] });
      }
      return { k: 'destructure', keys };
    }
    if (t.type === 'MemberExpression') {
      const prop = propName(t);
      if (prop !== null && isGlobalObject(t.object, [])) return { k: 'store', prop, global: true };
      if (prop !== null && namedObject(t.object)) return { k: 'store', prop, obj: t.object.name };
    }
    return USE;
  };
  function carryOf(node, anc) {
    const { child, p, i } = useSite(node, anc);
    switch (p?.type) {
      case 'MemberExpression': {
        if (p.object !== child) return USE;                                     // used as a computed key
        const k = propName(p);
        return k === null ? USE : { k: 'member', name: k };
      }
      case 'UnaryExpression': return p.operator === 'typeof' || p.operator === '!' ? SAFE : USE;
      case 'BinaryExpression': return p.operator === '===' || p.operator === '!==' ? SAFE : USE;
      case 'IfStatement': case 'WhileStatement': case 'DoWhileStatement': case 'ForStatement':
        return p.test === child ? SAFE : USE;
      // the value flows on: judged where the whole expression goes (an object is truthy, so `x && y` never yields x)
      case 'ConditionalExpression': return p.test === child ? SAFE : carryOf(p, anc.slice(0, i));
      case 'LogicalExpression': return p.operator === '&&' && p.left === child ? SAFE : carryOf(p, anc.slice(0, i));
      case 'SequenceExpression': return p.expressions.at(-1) === child ? carryOf(p, anc.slice(0, i)) : SAFE;
      case 'AwaitExpression': return carryOf(p, anc.slice(0, i));
      case 'AssignmentExpression':
        if (p.operator !== '=') return USE;
        return p.left === child ? SAFE : carryTarget(p.left);                  // replaced, or moved
      case 'VariableDeclarator': return p.init === child ? carryTarget(p.id) : USE;
      case 'AssignmentPattern': return p.right === child ? carryTarget(p.left) : USE;
      case 'Property': {
        if (p.value !== child || anc[i - 1]?.type !== 'ObjectExpression') return USE;
        const prop = keyName(p), holder = objectHolder(anc, i - 1);
        if (prop === null) return USE;
        if (holder.obj) return { k: 'store', prop, obj: holder.obj };
        if (holder.globalObj) return { k: 'store', prop: holder.globalObj, global: true };   // the literal itself is published
        return USE;
      }
      case 'ExportSpecifier': return { k: 'export', names: [nameOf(p.exported)] };
      case 'ExportDefaultDeclaration': return { k: 'export', names: ['default'] };
      default: return USE;
    }
  }
  /** a.b.c → ['a', 'b', 'c'] (static or constant keys, rooted at a variable), else null. */
  const chainOf = (m) => {
    const k = propName(m);
    if (k === null) return null;
    if (m.object.type === 'Identifier') return [m.object.name, k];
    if (m.object.type !== 'MemberExpression') return null;
    const c = chainOf(m.object);
    return c && [...c, k];
  };

  const judgeDestructure = (name, pattern, line) => {
    const binds = (p) => ({ kind: 'bind', names: patternNames(p).map((x) => x.name) });
    for (const prop of pattern.properties) {
      if (prop.type === 'RestElement') { finding(`${name} (rest destructuring)`, 'clock', line, binds(prop.argument)); continue; }
      const k = keyName(prop);
      const api = k === null ? `${name}[…] (computed member)` : MEMBER_RULES[name](k, false);
      if (api) finding(api, 'clock', line, binds(prop.value));
    }
  };

  /** Judge one use of a clock object. */
  const judgeClock = (name, node, anc) => {
    const line = L(node.loc.start.line);
    const { child, p, i } = useSite(node, anc);
    const clock = (api) => finding(api, 'clock', line, escapeOf(node, anc));
    if (p?.type === 'MemberExpression' && p.object === child) {
      const k = propName(p);
      const api = k === null ? `${name}[…] (computed member)` : MEMBER_RULES[name](k, isAssignTarget(p, anc, i));
      if (api) clock(api);
      return;
    }
    if (p?.type === 'NewExpression' && p.callee === child && name === 'Date') {
      if (!p.arguments.length || p.arguments.some((a) => a.type === 'SpreadElement')) clock('new Date() (current time)');
      return;
    }
    if (p?.type === 'CallExpression' && p.callee === child && name === 'Date') { clock('Date() (current time)'); return; }
    if (p?.type === 'UnaryExpression' && p.operator === 'typeof') return;
    if (p?.type === 'BinaryExpression' && p.operator === 'instanceof' && p.right === child) return;
    if (p?.type === 'AssignmentExpression' && p.operator === '=' && p.left === child) return;   // installs a replacement
    if (p?.type === 'VariableDeclarator' && p.init === child && p.id.type === 'ObjectPattern') { judgeDestructure(name, p.id, line); return; }
    if (p?.type === 'AssignmentExpression' && p.right === child && p.left.type === 'ObjectPattern') { judgeDestructure(name, p.left, line); return; }
    clock(`${name} (as a value)`);
  };

  /** Judge one use of the global object: only static member access and plain value uses are safe. */
  const judgeGlobal = (node, anc) => {
    const line = L(node.loc.start.line);
    const { child, p } = useSite(node, anc);
    if (p?.type === 'MemberExpression' && p.object === child && propName(p) === null) finding('global object[…] (computed member)', 'clock', line);
    else if (p?.type === 'CallExpression' && p.arguments.includes(child)) {
      const c = p.callee.type === 'ChainExpression' ? p.callee.expression : p.callee;
      if (c.type === 'MemberExpression' && c.object.type === 'Identifier' && (c.object.name === 'Reflect' || c.object.name === 'Object')) {
        finding(`global object passed to ${c.object.name}.${propName(c) ?? '[…]'}`, 'clock', line);
      }
    } else if ((p?.type === 'VariableDeclarator' && p.init === child && p.id.type === 'ObjectPattern')
      || (p?.type === 'AssignmentExpression' && p.right === child && p.left.type === 'ObjectPattern')) {
      const pat = p.id ?? p.left;
      if (pat.properties.some((q) => q.type === 'RestElement' || keyName(q) === null)) finding('global object (computed or rest destructuring)', 'clock', line);
    }
  };

  const judgeModule = (spec, specifiers, line) => {
    if (typeof spec !== 'string') return;
    const name = spec.replace(/^node:/, '');
    if (!spec.startsWith('node:') && !BUILTINS.has(name)) return;
    const base = name.split('/')[0];
    if (BANNED_MODULES[base]) { finding(`node:${base} (${BANNED_MODULES[base]})`, base === 'perf_hooks' ? 'clock' : 'code', line); return; }
    const check = (re, label) => {
      if (!specifiers) { finding(`${label} (require: import the functions you need by name)`, 'clock', line); return; }
      for (const s of specifiers) {
        const named = s.type === 'ImportSpecifier' ? s.imported : s.type === 'ExportSpecifier' ? s.local : null;
        if (!named) finding(`${label} (namespace/default import: import the functions you need by name)`, 'clock', line);
        else if (re.test(named.name ?? named.value)) finding(`${label} ${named.name ?? named.value}`, 'clock', line);
      }
    };
    if (base === 'crypto') check(CRYPTO_RANDOM, 'node:crypto');
    if (base === 'process') check(PROCESS_CLOCK, 'node:process');
  };
  const recordImport = (node, kind, line, label) => {
    const spec = fold(node);
    if (spec === null) { finding(`${label} with a computed specifier (dynamic code)`, 'code', line); return null; }
    out.imports.push({ spec, line, kind });
    return spec;
  };

  // Pass 2: judge.
  walk(ast, (n, anc) => {
    const p = anc[anc.length - 1], g = anc[anc.length - 2];
    const line = n.loc ? L(n.loc.start.line) : 0;
    switch (n.type) {
      case 'Identifier': {
        if (isReference(n, p, g)) out.refs.push({ name: n.name, line, write: isWrite(n, anc), escape: escapeOf(n, anc), carry: carryOf(n, anc) });
        const c = clockObject(n, p, g);
        if (c) judgeClock(c, n, anc);
        if (!isReference(n, p, g)) break;
        if (isGlobalObject(n, anc)) judgeGlobal(n, anc);
        if (n.name === 'eval') finding('eval (dynamic code)', 'code', line);
        if (n.name === 'Function') judgeFunction(n, anc, line);
        if (SINKS.has(n.name) && !declared.has(n.name)) judgeSink(n.name, n, anc, line);
        if (n.name === 'require') judgeRequire(n, anc, line);
        if (n.name === 'arguments' && !anc.some((a) => a.type === 'FunctionDeclaration' || a.type === 'FunctionExpression')) {
          finding('arguments outside a function (in CommonJS: the module wrapper\'s require and module, which the guard cannot follow)', 'code', line);
        }
        break;
      }
      case 'MemberExpression': {
        const k = propName(n);
        if (k !== null) out.members.push({ name: k, line, write: isWrite(n, anc), escape: escapeOf(n, anc), carry: carryOf(n, anc), chain: chainOf(n) });
        const c = clockObject(n, p, g);
        if (c) judgeClock(c, n, anc);
        if (isGlobalObject(n, anc)) judgeGlobal(n, anc);
        if (k === 'eval') finding('eval (dynamic code)', 'code', line);
        if (k === 'Function') judgeFunction(n, anc, line);
        if (k === 'constructor') finding('.constructor (reaches Function: dynamic code)', 'code', line);
        if (SINKS.has(k)) judgeSink(k, n, anc, line);
        if (k !== null) judgeLoaderMember(k, n, anc, line);
        if (k === 'timeStamp' && !isAssignTarget(n, anc, anc.length)) finding('event.timeStamp (wall-clock time)', 'clock', line);
        if (k === 'timeline' && (n.object.type === 'Identifier' ? n.object.name === 'document' : n.object.type === 'MemberExpression' && propName(n.object) === 'document')) {
          finding('document.timeline (wall-clock time)', 'clock', line);
        }
        if ((k === 'write' || k === 'writeln') && (n.object.type === 'Identifier' ? n.object.name === 'document' : n.object.type === 'MemberExpression' && propName(n.object) === 'document')) {
          finding(`document.${k} (dynamic code)`, 'code', line);
        }
        if ((k === 'innerHTML' || k === 'outerHTML' || k === 'srcdoc') && p?.type === 'AssignmentExpression' && p.left === n) finding(`${k} assignment (HTML can run code)`, 'code', line);
        break;
      }
      case 'ThisExpression':
        if (isGlobalObject(n, anc)) judgeGlobal(n, anc);
        break;
      case 'ObjectPattern':
        for (const prop of n.properties) {
          if (prop.type !== 'Property') continue;
          const k = keyName(prop);
          if (k !== null) out.members.push({ name: k, line: L(prop.loc.start.line), write: false, escape: { kind: 'bind', names: patternNames(prop.value).map((x) => x.name) }, carry: USE, chain: null });
          if (CLOCK_OBJECTS.has(k) || k === 'process') finding(`${k} (destructured)`, 'clock', L(prop.loc.start.line));
          if (k === 'eval' || k === 'Function') finding(`${k} (destructured: dynamic code)`, 'code', L(prop.loc.start.line));
          if (k === 'constructor') finding('.constructor (destructured: reaches Function)', 'code', L(prop.loc.start.line));
          if (k === 'require' || k === 'serviceWorker' || LOADER_INTERNALS.test(k ?? '')) finding(`${k} (destructured: loads code the guard cannot follow)`, 'code', L(prop.loc.start.line));
        }
        break;
      case 'WithStatement':                            // every name inside may read a property of the object: nothing can be attributed
        finding('with statement (names inside it read properties of an object the guard cannot follow)', 'scan', line);
        break;
      case 'Literal':
        if (typeof n.value === 'string') {
          out.strings.push({ value: n.value, line });
          for (const m of n.value.matchAll(BANNED_TEXT)) finding(`${m[1].replace(/\s+/g, '')} (in a string)`, 'clock', line);
          if (n.value === 'constructor' && (p?.type === 'CallExpression' || p?.type === 'NewExpression') && p.arguments.includes(n)) {
            finding('"constructor" passed to a call (reaches Function: dynamic code)', 'code', line);   // Reflect.get(f, 'constructor')
          }
          if (/^\s*javascript:/i.test(n.value)) finding('javascript: URL (dynamic code)', 'code', line);
        }
        break;
      case 'TemplateElement': {
        const s = n.value.cooked ?? n.value.raw;
        out.strings.push({ value: s, line });
        for (const m of s.matchAll(BANNED_TEXT)) finding(`${m[1].replace(/\s+/g, '')} (in a string)`, 'clock', line);
        if (/^\s*javascript:/i.test(s)) finding('javascript: URL (dynamic code)', 'code', line);
        break;
      }
      case 'CallExpression': {
        const name = calleeName(n.callee);
        if (TIMERS.has(name) && n.arguments.length && isCodeString(n.arguments[0])) finding(`${name} with a code string (dynamic code)`, 'code', line);
        // require(<constant>), and module.require(<constant>) (resolved from this module too); whatever the file declares,
        // a call of a name `require` is followed (a local helper of that name only means more files are judged)
        const callee = n.callee.type === 'ChainExpression' ? n.callee.expression : n.callee;
        if (name === 'require' && (callee.type === 'Identifier' || (callee.type === 'MemberExpression' && callee.object.type === 'Identifier' && callee.object.name === 'module'))) {
          const spec = recordImport(n.arguments[0], 'require', line, 'require()');
          if (spec !== null) judgeModule(spec, null, line);
        }
        if (name === 'importScripts') for (const a of n.arguments) recordImport(a, 'worker', line, 'importScripts()');
        if (name === 'addModule' && n.callee.type !== 'Identifier') recordImport(n.arguments[0], 'worker', line, 'addModule()');
        if (name === 'register' && callee.type === 'MemberExpression' && callee.object.type === 'MemberExpression' && propName(callee.object) === 'serviceWorker') {
          recordImport(n.arguments[0], 'worker', line, 'serviceWorker.register()');   // a service worker can rewrite every module the page fetches
        }
        if (name === 'createElement' || name === 'createElementNS') {
          const tag = fold(n.arguments[n.arguments.length - 1]);
          if (tag === null) finding(`${name} with a computed tag (could create a <script>: dynamic code)`, 'code', line);
          else if (tag.toLowerCase() === 'script') finding('creates a <script> element (dynamic code)', 'code', line);
          else if (LOADING_TAGS.has(tag.toLowerCase())) finding(`creates a <${tag.toLowerCase()}> element (it loads a page or code from a URL the guard cannot follow)`, 'code', line);
        }
        if ((name === 'format' || name === 'formatToParts') && n.callee.type !== 'Identifier' && !n.arguments.length) {
          finding(`${name}() with no date (Intl formats the current time)`, 'clock', line);
        }
        if (name === 'setAttribute' || name === 'setAttributeNS') {
          const attr = fold(n.arguments[name === 'setAttribute' ? 0 : 1]);
          if (attr === null || /^on/i.test(attr)) finding(`${name}(${attr === null ? '<computed>' : JSON.stringify(attr)}) (inline handler: dynamic code)`, 'code', line);
        }
        if (name === 'insertAdjacentHTML' || name === 'createContextualFragment') finding(`${name} (HTML can run code)`, 'code', line);
        break;
      }
      case 'NewExpression': {
        const name = calleeName(n.callee);
        if (name === 'Worker' || name === 'SharedWorker') recordImport(n.arguments[0], 'worker', line, `new ${name}()`);
        break;
      }
      case 'ImportExpression':
        recordImport(n.source, 'dynamic', line, 'import()');
        if (fold(n.source) !== null) judgeModule(fold(n.source), null, line);
        break;
      case 'ImportDeclaration':
        out.imports.push({
          spec: n.source.value, line, kind: 'static',
          specifiers: n.specifiers.map((s) => ({ imported: s.type === 'ImportNamespaceSpecifier' ? '*' : s.type === 'ImportDefaultSpecifier' ? 'default' : nameOf(s.imported), local: s.local.name })),
        });
        judgeModule(n.source.value, n.specifiers, line);
        break;
      case 'ExportNamedDeclaration': case 'ExportAllDeclaration':
        if (n.source) {
          const reexports = n.type === 'ExportAllDeclaration' ? [{ local: '*', exported: n.exported ? nameOf(n.exported) : null }]
            : n.specifiers.map((s) => ({ local: nameOf(s.local), exported: nameOf(s.exported) }));
          out.imports.push({ spec: n.source.value, line, kind: 'static', reexports });
          judgeModule(n.source.value, n.specifiers ?? [{ type: 'ExportAll' }], line);
        }
        break;
      default:
        break;
    }
    // bindings by line (for the allowlist: handles declared on an excused line stay watched), and what each is exported as
    if (n.type === 'VariableDeclarator' || n.type === 'FunctionDeclaration' || n.type === 'ClassDeclaration' || /^Import(Default|Namespace)?Specifier$/.test(n.type)) {
      const asDefault = anc.some((a) => a.type === 'ExportDefaultDeclaration');
      const exported = asDefault || anc.some((a) => a.type === 'ExportNamedDeclaration');
      const ids = n.type === 'VariableDeclarator' ? patternNames(n.id) : n.type.startsWith('Import') ? [n.local] : n.id ? [n.id] : [];
      for (const id of ids) {
        const l = L(id.loc.start.line);
        if (!out.declared.has(l)) out.declared.set(l, []);
        out.declared.get(l).push({ name: id.name, exported, exportedAs: exported ? (asDefault ? 'default' : id.name) : null });
      }
    }
  });

  /**
   * CommonJS's loader: require(<constant>) is followed (CallExpression); require.resolve only computes a path;
   * replacing require, or typeof, is harmless. Any other use (an alias, require.call/apply, (0, require),
   * require.cache, require.extensions, require.main, passing it on) could load code the guard never sees.
   */
  function judgeRequire(node, anc, line) {
    const { child, p } = useSite(node, anc);
    if ((p?.type === 'CallExpression' || p?.type === 'NewExpression') && p.callee === child) return;
    if (p?.type === 'UnaryExpression' && p.operator === 'typeof') return;
    if (p?.type === 'AssignmentExpression' && p.operator === '=' && p.left === child) return;
    if (p?.type === 'MemberExpression' && p.object === child) {
      const k = propName(p);
      if (k !== 'resolve') finding(`require.${k ?? '[…]'} (the guard cannot follow what it loads)`, 'code', line);
      return;
    }
    finding('require (as a value: the guard cannot follow what it loads)', 'code', line);
  }
  /**
   * `module` members that load or redirect code (module.require is followed only when called with a constant; module.load,
   * module.paths, module.parent / module.children: other modules and their require), any `.require` of another object
   * (require.main.require, process.mainModule.require resolve from elsewhere), and Node's loader internals (_compile runs a string).
   */
  function judgeLoaderMember(k, node, anc, line) {
    const onModule = node.object.type === 'Identifier' && node.object.name === 'module';
    if (LOADER_INTERNALS.test(k)) { finding(`.${k} (Node's module loader: runs or loads code the guard cannot follow)`, 'code', line); return; }
    if (k === 'serviceWorker') {
      const { child, p, i } = useSite(node, anc), q = anc[i - 1];
      const registered = p?.type === 'MemberExpression' && p.object === child && propName(p) === 'register' && q?.type === 'CallExpression' && q.callee === p;
      if (!registered && !(p?.type === 'UnaryExpression' && p.operator === 'typeof')) finding('serviceWorker (used other than to register a constant script: it can rewrite every module the page fetches)', 'code', line);
      return;
    }
    if (k !== 'require' && !(onModule && MODULE_LOADER.has(k))) return;
    const { child, p } = useSite(node, anc);
    if (p?.type === 'UnaryExpression' && p.operator === 'typeof') return;
    if (p?.type === 'AssignmentExpression' && p.operator === '=' && p.left === child) return;
    if (k === 'require' && onModule && p?.type === 'CallExpression' && p.callee === child) return;       // module.require(<spec>): followed
    finding(`${onModule ? 'module' : ''}.${k} (${onModule ? 'Node\'s module loader' : 'another module\'s require'}: the guard cannot follow what it loads)`, 'code', line);
  }

  /** A code-running sink: calling it is judged by the call rules; any other use except typeof or installing a replacement is a finding. */
  function judgeSink(name, node, anc, line) {
    const { child, p } = useSite(node, anc);
    if ((p?.type === 'CallExpression' || p?.type === 'NewExpression') && p.callee === child) return;
    if (p?.type === 'UnaryExpression' && p.operator === 'typeof') return;
    if (p?.type === 'AssignmentExpression' && p.operator === '=' && p.left === child) return;
    finding(`${name} (as a value: could run a code string)`, 'code', line);              // incl. setTimeout.call(…, 'code')
  }
  function judgeFunction(node, anc, line) {
    const { child, p } = useSite(node, anc);
    if (p?.type === 'BinaryExpression' && p.operator === 'instanceof' && p.right === child) return;
    if (p?.type === 'UnaryExpression' && p.operator === 'typeof') return;
    finding('Function (dynamic code)', 'code', line);
  }
  function isCodeString(a) {
    if (a.type === 'Literal') return typeof a.value === 'string';
    if (a.type === 'TemplateLiteral' || a.type === 'BinaryExpression') return true;
    return fold(a) !== null;
  }
  /** `this` is the global object at the top level of a classic script and inside its plain (non-method) functions. */
  function thisIsGlobal(anc) {
    for (let i = anc.length - 1; i >= 0; i--) {
      const a = anc[i];
      if (a.type === 'ArrowFunctionExpression') continue;
      if (a.type === 'FunctionDeclaration' || a.type === 'FunctionExpression') {
        const q = anc[i - 1];
        return !(q && (q.type === 'MethodDefinition' || (q.type === 'Property' && (q.method || q.kind !== 'init')) || q.type === 'PropertyDefinition'));
      }
      if (a.type === 'ClassBody' || a.type === 'StaticBlock') return false;
    }
    return true;
  }
}

/** Findings in one source text. → [{ api, cat, line, text }] sorted by line */
export function scanSource(src, opts) {
  return analyzeSource(src, opts).findings;
}

// ---------------------------------------------------------------- directories

const inside = (p, root) => { const r = path.relative(root, p); return r === '' || (!r.startsWith('..') && !path.isAbsolute(r)); };
const realOf = (p) => { try { return fs.realpathSync(p); } catch { return null; } };
const statOf = (p) => fs.statSync(p, { throwIfNoEntry: false });
const isFile = (p) => statOf(p)?.isFile() ?? false;
const isDir = (p) => statOf(p)?.isDirectory() ?? false;
const readJson = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } };
const PROBE_EXT = ['.js', '.mjs', '.cjs', '.json', '.node'];      // .node: a native addon, which the guard cannot read (a finding)
const VISIT_CAP = 20000;                                          // directory visits per walk: more is a finding, never a silent stop

/**
 * The file a relative specifier names: the exact file, else Node's CommonJS
 * probing (extensions, a directory's package.json main, index files). An ES
 * module import of an extension-less path fails at run time; probing anyway
 * only ever scans more. → [abs] or []
 */
function probe(p, depth = 0) {
  if (isFile(p)) return [p];
  for (const ext of PROBE_EXT) if (isFile(p + ext)) return [p + ext];
  if (!isDir(p) || depth > 4) return [];
  const main = readJson(path.join(p, 'package.json'))?.main;
  if (typeof main === 'string') { const m = probe(path.resolve(p, main), depth + 1); if (m.length) return m; }
  for (const ext of PROBE_EXT) if (isFile(path.join(p, `index${ext}`))) return [path.join(p, `index${ext}`)];
  return [];
}

/** Every target string an `exports` entry can resolve to (all conditions: browser, node, import, require, default, …). */
function exportTargets(entry, star) {
  if (typeof entry === 'string') return [star === undefined ? entry : entry.replaceAll('*', star)];
  if (Array.isArray(entry)) return entry.flatMap((e) => exportTargets(e, star));
  if (entry && typeof entry === 'object') return Object.values(entry).flatMap((e) => exportTargets(e, star));
  return [];
}
/** The entry of package.json `exports` for subpath key ('.' or './x'), or undefined. */
function exportsEntry(exp, key) {
  const isSubpathMap = exp && typeof exp === 'object' && !Array.isArray(exp) && Object.keys(exp).some((k) => k.startsWith('.'));
  if (!isSubpathMap) return key === '.' ? { entry: exp } : undefined;     // a string, an array or a conditions object: the package root
  if (key in exp) return { entry: exp[key] };
  for (const [k, v] of Object.entries(exp)) {
    const at = k.indexOf('*');
    if (at < 0) continue;
    const pre = k.slice(0, at), post = k.slice(at + 1);
    if (key.startsWith(pre) && key.endsWith(post) && key.length >= pre.length + post.length) return { entry: v, star: key.slice(pre.length, key.length - post.length) };
  }
  return undefined;
}

/**
 * A package import (bare specifier), resolved as Node does from `fromDir`
 * upward through node_modules, conservatively: every entry the package can
 * expose for that subpath (every `exports` condition, main, module, browser)
 * is a target. → { kind: 'files', files, pkgDir } | { kind: 'unfollowable', why }
 */
function resolvePackage(fromDir, spec) {
  const parts = spec.split('/');
  const name = spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
  const sub = parts.slice(name.split('/').length).join('/');
  let pkgDir = null;
  for (let d = fromDir; ; d = path.dirname(d)) {
    if (path.basename(d) !== 'node_modules' && isDir(path.join(d, 'node_modules', name))) { pkgDir = path.join(d, 'node_modules', name); break; }
    if (d === path.dirname(d)) break;
  }
  if (!pkgDir) return { kind: 'unfollowable', why: `a package (${name}) that is not installed here` };
  const pkg = readJson(path.join(pkgDir, 'package.json')) ?? {};
  const targets = [];
  if (pkg.exports !== undefined) {
    const e = exportsEntry(pkg.exports, sub ? `./${sub}` : '.');
    if (e) targets.push(...exportTargets(e.entry, e.star));
  }
  if (sub) targets.push(`./${sub}`);                                          // the path itself (resolvers that ignore exports)
  else {
    for (const f of [pkg.main, pkg.module, typeof pkg.browser === 'string' ? pkg.browser : null]) if (typeof f === 'string') targets.push(f);
    if (pkg.browser && typeof pkg.browser === 'object') for (const v of Object.values(pkg.browser)) if (typeof v === 'string') targets.push(v);
    if (typeof pkg.main !== 'string') targets.push('./index.js');
  }
  const files = [...new Set(targets.flatMap((t) => probe(path.resolve(pkgDir, t))))];
  if (!files.length) return { kind: 'unfollowable', why: `a package (${spec}) whose entry the guard cannot find` };
  return { kind: 'files', files, pkgDir };
}

/**
 * How an import resolves for scanning, from directory `fromDir`.
 * → { kind: 'builtin' } | { kind: 'files', files: [abs], pkgDir? } | { kind: 'dir', dir }
 *   | { kind: 'missing' } | { kind: 'unfollowable', why }
 */
function resolveSpec(fromDir, spec, kind) {
  const bare = spec.replace(/^node:/, '');
  if (spec.startsWith('node:') || BUILTINS.has(bare) || BUILTINS.has(bare.split('/')[0])) return { kind: 'builtin' };
  if (/^[a-z][a-z0-9+.-]*:/i.test(spec)) return { kind: 'unfollowable', why: `code from a URL (${spec.split(':')[0]}:)` };
  if (spec.startsWith('/')) return { kind: 'unfollowable', why: 'an absolute import path' };
  if (spec.startsWith('#')) return { kind: 'unfollowable', why: `a package-internal import (${spec})` };
  const rel = spec === '.' || spec === '..' || spec.startsWith('./') || spec.startsWith('../');
  if (!rel) {
    if (kind === 'script' || kind === 'frame') return resolveSpec(fromDir, `./${spec}`, kind);                 // a page-relative URL
    if (kind === 'importmap') return { kind: 'unfollowable', why: `an import map address that is not a URL (${spec})` };
    return resolvePackage(fromDir, spec);
  }
  const abs = path.resolve(fromDir, spec.replace(/[?#].*$/, ''));
  if (kind === 'importmap' && spec.endsWith('/')) return isDir(abs) ? { kind: 'dir', dir: abs } : { kind: 'missing' };   // a prefix mapping: the whole directory
  const files = probe(abs);
  return files.length ? { kind: 'files', files } : { kind: 'missing' };
}

/** readdir, sorted by name: the walk, and so the report, never depend on the filesystem's order. */
const entriesOf = (dir) => fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

/**
 * Walk the tree at `dir` by PATH: a directory reachable through several symlinks
 * is walked once per path, because a browser resolves a module's imports against
 * the path it was loaded from. A path whose real directory is already open on
 * the way down is a cycle and ends there. visit(path, dirent, stat) → true to
 * descend into a directory. → { capped } (true when VISIT_CAP directories were walked)
 */
function walkPaths(dir, visit) {
  let visits = 0, capped = false;
  const open = [];
  const go = (d) => {
    const real = realOf(d);
    if (!real || open.includes(real)) return;
    if (++visits > VISIT_CAP) { capped = true; return; }
    open.push(real);
    for (const e of entriesOf(d)) {
      const p = path.join(d, e.name), st = e.isSymbolicLink() ? statOf(p) : e;
      if (visit(p, e, st) && st?.isDirectory()) go(p);
    }
    open.pop();
  };
  go(dir);
  return { capped };
}

/** Every JS or HTML file under `dir`, by every path (symlinks followed): what an import-map prefix mapping can load. → { files, capped } */
function codeFilesUnder(dir) {
  const files = [];
  const { capped } = walkPaths(dir, (p, e, st) => {
    if (st?.isFile() && (CODE_EXT.test(e.name) || HTML_EXT.test(e.name))) files.push(p);
    return true;
  });
  return { files, capped };
}

/** The default locked roots for a studio: the frozen v2 paths and the live app next to it. */
export function lockedRoots(root) {
  return [...FROZEN.map((f) => path.join(root, f.replace(/\/$/, ''))), path.join(path.dirname(root), 'hushmallow')];
}

/**
 * Scan every file under root/<dir> for each dir that exists, and all the code
 * they can load. → { scanned, followed, locked, packages, symlinks, missing,
 *   findings, allowed, watched, stale, pending, ambiguous }
 *   scanned:   studio-relative paths (of the real file) of every file judged
 *   followed:  [{ file, from }] studio code outside the dirs that they load
 *   locked:    [{ file, from }] hash-locked code they load (frozen v2, live app):
 *              followed and judged by the same rules. Locked files cannot be
 *              edited, so a finding there needs a reviewed allowlist entry
 *              (pinned in a hash-locked file, the entry cannot go stale silently)
 *   packages:  [{ file, from }] code in node_modules they load (package imports
 *              and relative imports into node_modules): followed too
 *   symlinks:  [{ link, target }] symlinks the walk followed, by path (a symlink
 *              to code outside the studio and the locked code is a finding)
 *   allowed:   findings excused by an allowlist entry (reported, never silent)
 *   watched:   [{ name, kind, origin, file? }] what excused lines let escape and
 *              the guard follows: 'binding' (a variable of that file), 'property'
 *              (any read of .name, in any file), 'global' (any read of that global,
 *              in any file), 'carrier' (a variable of `file` that holds an object
 *              holding a handle: only member reads by name are allowed), 'export'
 *              (a carrier `file` exports: its importers' bindings are carriers)
 *   stale / pending / ambiguous: allowlist entries that no longer apply, whose
 *              file is not scanned, or whose line occurs more than once. All fail the guard.
 * Every import is resolved from each path the importing file is reachable by
 * (the walk follows every path through symlinks: browsers resolve against the
 * URL) and from its real path (Node), and an HTML page's also from its <base
 * href>, so every possible target is judged.
 * `locked` (option) lists absolute locked roots; default: lockedRoots(root).
 */
export function scanDirs(root, dirs = DETERMINISTIC_DIRS, allowlist = WALLCLOCK_ALLOWED, { locked = lockedRoots(root) } = {}) {
  const report = {
    scanned: [], followed: [], locked: [], packages: [], symlinks: [], missing: [], findings: [], allowed: [], watched: [], stale: [], pending: [], ambiguous: [],
  };
  const realRoot = realOf(root) ?? root;
  const realLocked = locked.map((l) => realOf(l) ?? l);
  const relReal = (real) => path.relative(realRoot, real).split(path.sep).join('/');
  const relLex = (abs) => path.relative(root, abs).split(path.sep).join('/');
  const place = (real) => (realLocked.some((l) => inside(real, l)) ? 'locked' : inside(real, realRoot) ? 'studio' : 'outside');
  const realDirs = dirs.map((d) => realOf(path.join(root, d)) ?? path.join(root, d));
  const inDirs = (real) => realDirs.some((d) => inside(real, d));

  const files = new Map();                        // real path → { real, file, src, lines, a, base, edges }
  const pathFindings = [];                        // findings on paths that are not scanned files (symlinks, unscannable types)
  const queue = [], reached = new Set(), reportedVia = new Set();
  const enqueue = (abs, real) => { const k = `${real}\0${abs}`; if (!reached.has(k)) { reached.add(k); queue.push({ abs, real }); } };
  const capFinding = (where) => pathFindings.push({ file: relLex(where), api: `more than ${VISIT_CAP} directory paths through symlinks: the guard cannot follow them all`, cat: 'scan', line: 1, text: '' });

  // Walk each dir by every path (code files are scanned, symlinked directories followed, node_modules only where imported).
  for (const d of dirs) {
    const top = path.join(root, d);
    if (!isDir(top)) { report.missing.push(d); continue; }
    const { capped } = walkPaths(top, (p, e, st) => {
      if (e.isSymbolicLink()) {
        const target = realOf(p);
        if (!st || !target) return false;                                        // a dangling link loads nothing
        report.symlinks.push({ link: relLex(p), target: relReal(target) });
        if (place(target) === 'outside') {
          pathFindings.push({ file: relLex(p), api: `a symlink to ${st.isDirectory() ? 'a directory' : 'a file'} outside the studio: the guard cannot follow it`, cat: 'scan', line: 1, text: '' });
          return false;
        }
      }
      if (st.isDirectory()) return e.name !== 'node_modules';
      if (!st.isFile()) return false;
      if (CODE_EXT.test(e.name) || HTML_EXT.test(e.name)) enqueue(p, realOf(p));
      else if (UNSCANNABLE_EXT.test(e.name)) pathFindings.push({ file: relLex(p), api: 'file type the guard cannot scan (use .js/.mjs)', cat: 'scan', line: 1, text: '' });
      return false;
    });
    if (capped) capFinding(top);
  }

  /** Judge one resolved target of an import in `rec`. */
  const follow = (rec, imp, target, via) => {
    const real = realOf(target);
    if (!real) return;
    const where = place(real);
    if (where === 'outside') {
      const through = place(path.resolve(target)) !== 'outside' ? ' (through a symlink)' : '';
      rec.addBase(`imports code from outside the studio${through}: the guard cannot follow it`, 'scan', imp.line);
      return;
    }
    if (/\.json$/i.test(real)) return;                                             // data, not code
    if (!CODE_EXT.test(real) && !HTML_EXT.test(real)) { rec.addBase('imports a file the guard cannot read as JS: the guard cannot follow it', 'scan', imp.line); return; }
    const file = relReal(real);
    if (!inDirs(real) && !reportedVia.has(file)) {
      reportedVia.add(file);
      const entry = { file, from: rec.file };
      if (where === 'locked') report.locked.push(entry);
      else if (via === 'package' || real.split(path.sep).includes('node_modules')) report.packages.push(entry);
      else report.followed.push(entry);
    }
    if (!rec.edges.has(imp)) rec.edges.set(imp, new Set());
    rec.edges.get(imp).add(real);                                                 // what this import loads (carriers: see below)
    enqueue(target, real);
  };
  /** The directories an import of `rec`, loaded as `abs`, resolves from: its path, its real path, and its <base href> from each. */
  const baseDirs = (rec, abs) => {
    const own = [path.dirname(abs), path.dirname(rec.real)];
    const out = new Set(own);
    for (const b of rec.a.bases) {
      const href = b.href.replace(/[?#].*$/, '');
      for (const d of own) out.add(href === '' || href.endsWith('/') ? path.resolve(d, href) : path.dirname(path.resolve(d, href)));
    }
    return out;
  };

  while (queue.length) {
    const { abs, real } = queue.shift();
    let rec = files.get(real);
    if (!rec) {
      const src = fs.readFileSync(real, 'utf8');
      const a = analyzeSource(src, { html: HTML_EXT.test(real) });
      const lines = src.split('\n').map((l) => l.trim());
      const seen = new Set();
      rec = { real, file: relReal(real), src, lines, a, base: [...a.findings], edges: new Map(), exportsAs: new Map() };
      rec.addBase = (api, cat, line) => { const k = `${line}\0${api}`; if (!seen.has(k)) { seen.add(k); rec.base.push({ api, cat, line, text: lines[line - 1] ?? '' }); } };
      for (const ds of a.declared.values()) for (const d of ds) if (d.exportedAs) rec.exportsAs.set(d.name, [...(rec.exportsAs.get(d.name) ?? []), d.exportedAs]);
      files.set(real, rec);
      report.scanned.push(rec.file);
    }
    for (const fromDir of baseDirs(rec, abs)) {
      for (const imp of rec.a.imports) {
        const r = resolveSpec(fromDir, imp.spec, imp.kind);
        if (r.kind === 'builtin' || r.kind === 'missing') continue;               // a broken import fails at run time, not here
        if (r.kind === 'unfollowable') { rec.addBase(`imports ${r.why}: the guard cannot follow it`, 'scan', imp.line); continue; }
        if (r.kind === 'dir') {
          const { files: under, capped } = codeFilesUnder(r.dir);
          if (capped) rec.addBase(`an import-map prefix maps more than ${VISIT_CAP} directory paths: the guard cannot follow them all`, 'scan', imp.line);
          for (const f of under) follow(rec, imp, f, 'importmap');
          continue;
        }
        for (const f of r.files) follow(rec, imp, f, r.pkgDir ? 'package' : 'file');
      }
    }
  }

  // The allowlist, to a fixpoint. Excusing a clock finding watches where its value goes (a variable, a property name, a
  // global), and an object that ends up holding the value is a CARRIER: it is followed through variables, exports, imports
  // (named, default, namespace, re-exports) and the objects it is stored in. A carrier may only be read by member name (the
  // handle's own name is watched everywhere) or moved whole somewhere the guard can follow; any other use is a finding.
  const W = {
    n: 0, binds: new Map(), props: new Map(), globals: new Map(), untracked: new Map(), carriers: new Map(), exports: new Map(), namespaces: new Map(),
  };
  const mapIn = (m, k) => { if (!m.has(k)) m.set(k, new Map()); return m.get(k); };
  const put = (m, k, v) => { if (!m.has(k)) { m.set(k, v); W.n++; } return m.get(k); };
  /** info: { origin (the allowlisted line whose handle it holds), props: Map<name, info> (members that are carriers themselves) } */
  const carrierIn = (m, name, origin) => put(m, name, { origin, props: new Map() });
  const join = (m, name, info) => {                                                // a name bound to a carrier (or to either of two)
    const cur = m.get(name);
    if (!cur) put(m, name, info);
    else if (cur !== info) for (const [k, v] of info.props) put(cur.props, k, v);
  };
  const namespaceOf = (real) => put(W.namespaces, real, { origin: [...W.exports.get(real).values()][0].origin, props: W.exports.get(real) });
  const recs = [...files.values()];
  const derived = (rec) => {
    const out = [], seen = new Set();
    const add = (api, line, escape) => {
      if (seen.has(`${line}\0${api}`)) return;
      seen.add(`${line}\0${api}`);
      const f = { api, cat: 'clock', line, text: rec.lines[line - 1] ?? '' };
      if (escape) Object.defineProperty(f, 'escape', { value: escape, enumerable: false });
      out.push(f);
    };
    for (const [name, line] of W.binds.get(rec.real) ?? []) {
      if ((rec.a.declared.get(line) ?? []).some((d) => d.name === name && d.exported)) add(`exports the real-clock handle ${name} (declared on an allowlisted line)`, line, { kind: 'untracked' });
      for (const r of rec.a.refs) if (r.name === name && r.line !== line) add(`real-clock handle ${name} (from allowlisted line ${line})`, r.line, r.escape);
    }
    for (const m of rec.a.members) {
      if (m.write) continue;
      if (W.props.has(m.name)) add(`real-clock handle .${m.name} (exported by ${W.props.get(m.name)})`, m.line, m.escape);
      else if (W.globals.has(m.name)) add(`real-clock carrier ${m.name} (published by ${W.globals.get(m.name)})`, m.line, m.escape);
    }
    for (const r of rec.a.refs) if (!r.write && W.globals.has(r.name)) add(`real-clock carrier ${r.name} (published by ${W.globals.get(r.name)})`, r.line, r.escape);
    for (const s of rec.a.strings) {
      const origin = W.props.get(s.value) ?? W.globals.get(s.value);
      if (origin) add(`names the real-clock handle "${s.value}" in a string (exported by ${origin})`, s.line);
    }

    // carriers: modules this file loads that export one ...
    const cars = mapIn(W.carriers, rec.real), exps = mapIn(W.exports, rec.real);
    for (const [imp, reals] of rec.edges) {
      for (const real of reals) {
        const ex = W.exports.get(real);
        if (!ex?.size) continue;
        if (imp.kind === 'dynamic' || imp.kind === 'require') {
          const [name, info] = [...ex][0];
          add(`loads ${relReal(real)} by ${imp.kind === 'require' ? 'require' : 'import'}(), which exports the real-clock carrier ${name} (holds the handle excused at ${info.origin}): the guard cannot follow a module object`, imp.line, { kind: 'untracked' });
          continue;
        }
        for (const s of imp.specifiers ?? []) {
          if (s.imported === '*') join(cars, s.local, namespaceOf(real));
          else if (ex.has(s.imported)) join(cars, s.local, ex.get(s.imported));
        }
        for (const x of imp.reexports ?? []) {
          if (x.local !== '*') { if (ex.has(x.local)) join(exps, x.exported, ex.get(x.local)); } else if (x.exported !== null) join(exps, x.exported, namespaceOf(real));
          else for (const [name, info] of [...ex]) if (name !== 'default') join(exps, name, info);
        }
      }
    }
    // ... and every use of a carrier in this file: references, members that are carriers themselves (ns.clock), exports
    const judge = (label, info, carry, line, escape) => {
      switch (carry.k) {
        case 'member': case 'safe': return;
        case 'destructure': for (const { key, names } of carry.keys) { const sub = info.props.get(key); if (sub) for (const n of names) join(cars, n, sub); } return;
        case 'alias': for (const n of carry.names) join(cars, n, info); return;
        case 'export': for (const n of carry.names) join(exps, n, info); return;
        case 'store':
          if (carry.global) put(W.globals, carry.prop, `${rec.file}:${line}`);
          else put(carrierIn(cars, carry.obj, info.origin).props, carry.prop, info);
          return;
        default:
          add(`real-clock carrier ${label} (holds the handle excused at ${info.origin}): a use that can reach members the guard cannot name`, line, escape);
      }
    };
    for (const r of rec.a.refs) { const info = cars.get(r.name); if (info && !r.write) judge(r.name, info, r.carry, r.line, r.escape); }
    for (const m of rec.a.members) {
      if (m.write || !m.chain || !cars.has(m.chain[0])) continue;
      let info = cars.get(m.chain[0]);
      for (let i = 1; info && i < m.chain.length; i++) info = info.props.get(m.chain[i]);
      if (info) judge(m.chain.join('.'), info, m.carry, m.line, m.escape);
    }
    for (const [name, info] of [...cars]) for (const as of rec.exportsAs.get(name) ?? []) join(exps, as, info);
    return out;
  };
  const watch = (rec, line, f) => {
    const origin = `${rec.file}:${line}`;
    const untracked = (why) => put(W.untracked, origin, { rec, line, why });
    const bind = (name) => put(mapIn(W.binds, rec.real), name, line);
    for (const d of rec.a.declared.get(line) ?? []) bind(d.name);                  // every binding declared on an excused clock line
    const e = f.escape ?? { kind: 'none' };
    if (e.kind === 'bind') e.names.forEach(bind);
    else if (e.kind === 'prop') {
      if (e.prop === null) { untracked('stored under a computed property name'); return; }
      put(W.props, e.prop, origin);
      if (e.global) put(W.globals, e.prop, origin);
      if (e.globalObj) put(W.globals, e.globalObj, origin);
      if (e.obj) carrierIn(mapIn(W.carriers, rec.real), e.obj, origin);              // the object now holds a handle
    } else if (e.kind === 'untracked' || e.kind === 'export') untracked('returned, exported, thrown or passed on where the guard cannot follow it');
  };
  let final;
  for (let last = -1; last !== W.n;) {
    last = W.n;
    final = new Map();
    for (const rec of recs) {
      let cands = [...rec.base, ...derived(rec)];
      const excused = [], used = [], ambiguous = [];
      for (const entry of allowlist.filter((e) => e.file === rec.file)) {
        const at = rec.lines.flatMap((l, i) => (l === entry.line ? [i + 1] : []));
        if (at.length > 1) { ambiguous.push({ ...entry, lines: at }); continue; }
        if (!at.length) continue;
        const hit = cands.filter((f) => f.line === at[0] && entry.apis.includes(f.api));
        if (!hit.length) continue;
        used.push(entry);
        cands = cands.filter((f) => !hit.includes(f));
        for (const f of hit) {
          excused.push({ f, reason: entry.reason });
          if (f.cat === 'clock') watch(rec, at[0], f);
        }
      }
      final.set(rec, { cands, excused, used, ambiguous });
    }
  }

  const usedEntries = new Set();
  for (const [rec, r] of final) {
    for (const f of r.cands) report.findings.push({ file: rec.file, api: f.api, cat: f.cat, line: f.line, text: f.text });
    for (const { f, reason } of r.excused) report.allowed.push({ file: rec.file, api: f.api, cat: f.cat, line: f.line, text: f.text, reason });
    for (const e of r.used) usedEntries.add(e);
    report.ambiguous.push(...r.ambiguous);
  }
  for (const { rec, line, why } of W.untracked.values()) {
    report.findings.push({ file: rec.file, api: `a real-clock handle leaves this allowlisted line (${why})`, cat: 'clock', line, text: rec.lines[line - 1] ?? '' });
  }
  report.findings.push(...pathFindings);
  for (const [real, m] of W.binds) for (const [name, line] of m) report.watched.push({ name, kind: 'binding', origin: `${files.get(real).file}:${line}` });
  for (const [name, origin] of W.props) report.watched.push({ name, kind: 'property', origin });
  for (const [name, origin] of W.globals) report.watched.push({ name, kind: 'global', origin });
  for (const [kind, map] of [['carrier', W.carriers], ['export', W.exports]]) {
    for (const [real, m] of map) for (const [name, info] of m) report.watched.push({ name, kind, origin: info.origin, file: files.get(real).file });
  }
  for (const e of allowlist) {
    if (!report.scanned.includes(e.file)) report.pending.push(e);
    else if (!usedEntries.has(e) && !report.ambiguous.some((x) => x.file === e.file && x.line === e.line)) report.stale.push(e);
  }
  report.findings.sort((x, y) => x.file.localeCompare(y.file) || x.line - y.line || x.api.localeCompare(y.api));
  return report;
}
