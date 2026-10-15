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
//   insertAdjacentHTML, <script> element creation (or createElement with a
//   computed tag), inline on* handler attributes, javascript: URLs, and
//   node:vm/worker_threads/child_process/module/cluster/inspector/repl. A sink
//   used other than by calling it (const st = setTimeout; setTimeout.call(…))
//   is a finding too, so no alias can carry a code string past the rules.
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
//   - symlinked directories and files (each real file is judged once; cycles
//     end). A module reached through a symlink has its imports resolved from
//     its own path (browsers) and its real path (Node), so both are judged;
//   - HTML: <script src>, the addresses of import maps (a map can send any
//     specifier anywhere, so every address it names is loaded code, a prefix
//     mapping a whole folder), and <iframe>/<frame> pages; CommonJS require()
//     with Node's probing (extensions, index files, package main).
//
// What a static guard cannot see:
//   - a property NAME computed at run time from data (o[k] with k returned by a
//     function) on an object it cannot identify as the global object or a clock
//     object (for example the global object passed in as a function argument);
//   - time that arrives as data: requestAnimationFrame timestamps, media/audio
//     currentTime, the order of asynchronous events;
//   - an excused handle passed INTO a function on an allowlisted line: what the
//     line stores (the call's result) is watched, not what the callee keeps;
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
//   - a value that leaves the line any other way (returned, exported, passed to
//     a call as a statement, stored under a computed key) is a finding that no
//     entry can excuse.
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
 * `__hushClock` (where clock.js publishes them) a finding in all scanned code.
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
  process: (m) => (['hrtime', 'uptime', 'cpuUsage', 'resourceUsage', 'binding', 'dlopen'].includes(m) ? `process.${m}` : null),
};
const GLOBAL_IDS = new Set(['globalThis', 'window']);
const GLOBAL_IDS_UNLESS_DECLARED = new Set(['self', 'frames', 'top', 'parent', 'opener']);   // common local names too
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
const PROCESS_CLOCK = /^(hrtime|uptime|cpuUsage|resourceUsage|binding|dlopen)$/;
const BUILTINS = new Set(builtinModules);
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

/**
 * The code inside an HTML file: <script> bodies (JS types only), inline on*
 * handler attributes, plus script src imports, import maps (every address they
 * map to is code the page can load), frames (another page and its scripts)
 * and javascript: URLs.
 * → { blocks: [{ code, offset, sourceType }], imports: [{ spec, offset, kind }],
 *     maps: [{ offset, body, src }], urls: [offset] }
 */
function htmlCode(html) {
  const blocks = [], imports = [], maps = [], urls = [];
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    const attrs = m[1];
    const type = /\btype\s*=\s*["']?([^"'\s>]*)/i.exec(attrs)?.[1] ?? '';
    if (/^importmap$/i.test(type)) { maps.push({ offset: m.index, body: m[2], src: /\bsrc\s*=/i.test(attrs) }); continue; }
    if (!JS_TYPES.test(type)) continue;                                   // data blocks (JSON, shaders)
    const src = /\bsrc\s*=\s*["']?([^"'\s>]+)/i.exec(attrs)?.[1];
    if (src) imports.push({ spec: src, offset: m.index, kind: 'script' });
    blocks.push({ code: m[2], offset: m.index + m[0].indexOf('>') + 1, sourceType: /module/i.test(type) ? 'module' : 'script' });
  }
  for (const m of html.matchAll(/<(?:iframe|frame)\b[^>]*?\ssrc\s*=\s*["']?([^"'\s>]+)/gi)) {
    if (!/^about:blank$/i.test(m[1])) imports.push({ spec: m[1], offset: m.index, kind: 'frame' });
  }
  for (const m of html.matchAll(/<[a-z][^>]*>/gi)) {
    for (const a of m[0].matchAll(/\s(on[a-z]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
      const raw = a[3] ?? a[4] ?? a[5];
      blocks.push({ code: decodeEntities(raw), offset: m.index + a.index + a[0].indexOf(raw), sourceType: 'script', handler: true });
    }
    for (const a of m[0].matchAll(/=\s*["']?\s*javascript:/gi)) urls.push(m.index + a.index);
  }
  return { blocks, imports, maps, urls };
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
 * → { findings: [{ api, cat, line, text }], imports: [{ spec, line, kind }],
 *     declared: Map<line, [{ name, exported }]>,
 *     refs:    [{ name, line, write, escape }]   variable references,
 *     members: [{ name, line, write, escape }]   property reads by a static or constant name (destructuring keys included),
 *     strings: [{ value, line }]                 string and template texts,
 *     globalSets: [{ prop, value, line }]        `<global object>.prop = identifier` }
 * A clock finding also carries a non-enumerable `escape`: where the value it
 * reads ends up (see escapeOf). scanDirs uses escapes and the lists above to
 * follow a real-clock handle that an allowlist entry excuses.
 */
export function analyzeSource(src, { html = false } = {}) {
  const lines = src.split('\n');
  const lineAt = (offset) => src.slice(0, offset).split('\n').length;
  const out = { findings: [], imports: [], declared: new Map(), refs: [], members: [], strings: [], globalSets: [] };
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
    units = h.blocks.map((b) => ({ ...b, lineBase: lineAt(b.offset) - 1 }));
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

  /** The binding or global property an object literal (anc[j]) is stored in: → { obj } | { globalObj } | {} */
  const objectHolder = (anc, j) => {
    const lit = anc[j], q = anc[j - 1];
    if (q?.type === 'VariableDeclarator' && q.init === lit && q.id.type === 'Identifier') return { obj: q.id.name };
    if (q?.type === 'AssignmentExpression' && q.right === lit) {
      if (q.left.type === 'Identifier') return { obj: q.left.name };
      if (q.left.type === 'MemberExpression' && isGlobalObject(q.left.object, [])) return { globalObj: propName(q.left) };
    }
    if (q?.type === 'Property' && q.value === lit && anc[j - 2]?.type === 'ObjectExpression') return objectHolder(anc, j - 2);
    return {};
  };
  /**
   * Where the value of `node` ends up, for following a real-clock handle that
   * an allowlist entry excuses. The value flows up through expressions (member
   * reads, calls, operators, arrays, function values) to its destination:
   *   { kind: 'bind', names }               a variable (declared or assigned)
   *   { kind: 'prop', prop, obj?, global?, globalObj? }  an object property: of the
   *                                         literal bound to `obj`, of the global
   *                                         object, or of a literal stored on it
   *   { kind: 'none' }                      consumed (a call of the handle, a test)
   *   { kind: 'untracked' }                 returned, thrown, exported, passed to a
   *                                         call as a statement, or stored where the
   *                                         guard cannot name it
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
            const o = p.left.object;
            return { kind: 'prop', prop: propName(p.left), global: isGlobalObject(o, []), ...(o.type === 'Identifier' && { obj: o.name }) };
          }
          return { kind: 'bind', names: patternNames(p.left).map((x) => x.name) };
        case 'Property':
          if (p.value !== child || anc[i - 1]?.type !== 'ObjectExpression') return { kind: 'untracked' };
          return { kind: 'prop', prop: keyName(p), ...objectHolder(anc, i - 1) };
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
    } else if (p?.type === 'WithStatement' && p.object === child) finding('with (global object)', 'clock', line);
    else if ((p?.type === 'VariableDeclarator' && p.init === child && p.id.type === 'ObjectPattern')
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
        if (isReference(n, p, g)) out.refs.push({ name: n.name, line, write: isWrite(n, anc), escape: escapeOf(n, anc) });
        const c = clockObject(n, p, g);
        if (c) judgeClock(c, n, anc);
        if (!isReference(n, p, g)) break;
        if (isGlobalObject(n, anc)) judgeGlobal(n, anc);
        if (n.name === 'eval') finding('eval (dynamic code)', 'code', line);
        if (n.name === 'Function') judgeFunction(n, anc, line);
        if (SINKS.has(n.name) && !declared.has(n.name)) judgeSink(n.name, n, anc, line);
        break;
      }
      case 'MemberExpression': {
        const k = propName(n);
        if (k !== null) out.members.push({ name: k, line, write: isWrite(n, anc), escape: escapeOf(n, anc) });
        const c = clockObject(n, p, g);
        if (c) judgeClock(c, n, anc);
        if (isGlobalObject(n, anc)) judgeGlobal(n, anc);
        if (k === 'eval') finding('eval (dynamic code)', 'code', line);
        if (k === 'Function') judgeFunction(n, anc, line);
        if (k === 'constructor') finding('.constructor (reaches Function: dynamic code)', 'code', line);
        if (SINKS.has(k)) judgeSink(k, n, anc, line);
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
          if (k !== null) out.members.push({ name: k, line: L(prop.loc.start.line), write: false, escape: { kind: 'bind', names: patternNames(prop.value).map((x) => x.name) } });
          if (CLOCK_OBJECTS.has(k) || k === 'process') finding(`${k} (destructured)`, 'clock', L(prop.loc.start.line));
          if (k === 'eval' || k === 'Function') finding(`${k} (destructured: dynamic code)`, 'code', L(prop.loc.start.line));
          if (k === 'constructor') finding('.constructor (destructured: reaches Function)', 'code', L(prop.loc.start.line));
        }
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
        if (name === 'require' && n.callee.type === 'Identifier' && !declared.has('require')) {
          const spec = recordImport(n.arguments[0], 'require', line, 'require()');
          if (spec !== null) judgeModule(spec, null, line);
        }
        if (name === 'importScripts') for (const a of n.arguments) recordImport(a, 'worker', line, 'importScripts()');
        if (name === 'addModule' && n.callee.type !== 'Identifier') recordImport(n.arguments[0], 'worker', line, 'addModule()');
        if (name === 'createElement' || name === 'createElementNS') {
          const tag = fold(n.arguments[n.arguments.length - 1]);
          if (tag === null) finding(`${name} with a computed tag (could create a <script>: dynamic code)`, 'code', line);
          else if (tag.toLowerCase() === 'script') finding('creates a <script> element (dynamic code)', 'code', line);
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
      case 'AssignmentExpression':
        if (n.operator === '=' && n.left.type === 'MemberExpression' && n.right.type === 'Identifier' && isGlobalObject(n.left.object, anc)) {
          const k = propName(n.left);
          if (k !== null) out.globalSets.push({ prop: k, value: n.right.name, line });
        }
        break;
      case 'ImportExpression':
        recordImport(n.source, 'dynamic', line, 'import()');
        if (fold(n.source) !== null) judgeModule(fold(n.source), null, line);
        break;
      case 'ImportDeclaration':
        out.imports.push({ spec: n.source.value, line, kind: 'static' });
        judgeModule(n.source.value, n.specifiers, line);
        break;
      case 'ExportNamedDeclaration': case 'ExportAllDeclaration':
        if (n.source) { out.imports.push({ spec: n.source.value, line, kind: 'static' }); judgeModule(n.source.value, n.specifiers ?? [{ type: 'ExportAll' }], line); }
        break;
      default:
        break;
    }
    // bindings by line (for the allowlist: handles declared on an excused line stay watched)
    if (n.type === 'VariableDeclarator' || n.type === 'FunctionDeclaration' || n.type === 'ClassDeclaration' || /^Import(Default|Namespace)?Specifier$/.test(n.type)) {
      const exported = anc.some((a) => a.type === 'ExportNamedDeclaration' || a.type === 'ExportDefaultDeclaration');
      const ids = n.type === 'VariableDeclarator' ? patternNames(n.id) : n.type.startsWith('Import') ? [n.local] : n.id ? [n.id] : [];
      for (const id of ids) {
        const l = L(id.loc.start.line);
        if (!out.declared.has(l)) out.declared.set(l, []);
        out.declared.get(l).push({ name: id.name, exported });
      }
    }
  });

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
const PROBE_EXT = ['.js', '.mjs', '.cjs', '.json'];

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

/** Every JS or HTML file under `dir` (symlinks followed, each real directory once): what an import-map prefix mapping can load. */
function codeFilesUnder(dir, out = [], seenDirs = new Set()) {
  const real = realOf(dir);
  if (!real || seenDirs.has(real)) return out;
  seenDirs.add(real);
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name), st = statOf(p);
    if (st?.isDirectory()) codeFilesUnder(p, out, seenDirs);
    else if (st?.isFile() && (CODE_EXT.test(e.name) || HTML_EXT.test(e.name))) out.push(p);
  }
  return out;
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
 *   symlinks:  [{ link, target }] symlinks the walk followed (a symlink to code
 *              outside the studio and the locked code is a finding)
 *   allowed:   findings excused by an allowlist entry (reported, never silent)
 *   watched:   [{ name, kind, origin }] real-clock handles that excused lines let
 *              escape and that the guard follows: 'binding' (a variable of that
 *              file), 'property' (any read of .name, in any file), 'global' (any
 *              read of that global, in any file)
 *   stale / pending / ambiguous: allowlist entries that no longer apply, whose
 *              file is not scanned, or whose line occurs more than once. All fail the guard.
 * Every import is resolved from the importing file's own path and, when it was
 * reached through a symlink, from its real path too (browsers resolve against
 * the URL, Node against the real file), so both possible targets are judged.
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

  const files = new Map();                        // real path → { real, file, src, lines, a, base }
  const pathFindings = [];                        // findings on paths that are not scanned files (symlinks, unscannable types)
  const queue = [], reached = new Set(), reportedVia = new Set();
  const enqueue = (abs, real) => { const k = `${real}\0${abs}`; if (!reached.has(k)) { reached.add(k); queue.push({ abs, real }); } };

  /** Walk a directory: code files are scanned, symlinked directories followed (once per real directory), node_modules only where imported. */
  const walkDir = (abs, seenDirs = new Set()) => {
    const real = realOf(abs);
    if (!real || seenDirs.has(real)) return;
    seenDirs.add(real);
    for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
      const p = path.join(abs, e.name);
      let dir = e.isDirectory(), file = e.isFile();
      if (e.isSymbolicLink()) {
        const st = statOf(p), target = realOf(p);
        if (!st || !target) continue;                                            // a dangling link loads nothing
        report.symlinks.push({ link: relLex(p), target: relReal(target) });
        if (place(target) === 'outside') {
          pathFindings.push({ file: relLex(p), api: `a symlink to ${st.isDirectory() ? 'a directory' : 'a file'} outside the studio: the guard cannot follow it`, cat: 'scan', line: 1, text: '' });
          continue;
        }
        dir = st.isDirectory(); file = st.isFile();
      }
      if (dir) { if (e.name !== 'node_modules') walkDir(p, seenDirs); continue; }
      if (!file) continue;
      if (CODE_EXT.test(e.name) || HTML_EXT.test(e.name)) enqueue(p, realOf(p));
      else if (UNSCANNABLE_EXT.test(e.name)) pathFindings.push({ file: relLex(p), api: 'file type the guard cannot scan (use .js/.mjs)', cat: 'scan', line: 1, text: '' });
    }
  };
  for (const d of dirs) {
    if (isDir(path.join(root, d))) walkDir(path.join(root, d)); else report.missing.push(d);
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
    enqueue(target, real);
  };

  while (queue.length) {
    const { abs, real } = queue.shift();
    let rec = files.get(real);
    if (!rec) {
      const src = fs.readFileSync(real, 'utf8');
      const a = analyzeSource(src, { html: HTML_EXT.test(real) });
      const lines = src.split('\n').map((l) => l.trim());
      const seen = new Set();
      rec = { real, file: relReal(real), src, lines, a, base: [...a.findings] };
      rec.addBase = (api, cat, line) => { const k = `${line}\0${api}`; if (!seen.has(k)) { seen.add(k); rec.base.push({ api, cat, line, text: lines[line - 1] ?? '' }); } };
      files.set(real, rec);
      report.scanned.push(rec.file);
    }
    for (const fromDir of new Set([path.dirname(abs), path.dirname(real)])) {
      for (const imp of rec.a.imports) {
        const r = resolveSpec(fromDir, imp.spec, imp.kind);
        if (r.kind === 'builtin' || r.kind === 'missing') continue;               // a broken import fails at run time, not here
        if (r.kind === 'unfollowable') { rec.addBase(`imports ${r.why}: the guard cannot follow it`, 'scan', imp.line); continue; }
        if (r.kind === 'dir') { for (const f of codeFilesUnder(r.dir)) follow(rec, imp, f, 'importmap'); continue; }
        for (const f of r.files) follow(rec, imp, f, r.pkgDir ? 'package' : 'file');
      }
    }
  }

  // The allowlist, to a fixpoint: excusing a clock finding watches where its value goes.
  const W = { binds: new Map(), props: new Map(), globals: new Map(), carriers: new Map(), untracked: new Map() };
  const size = () => [...W.binds.values()].reduce((n, m) => n + m.size, 0) + W.props.size + W.globals.size
    + [...W.carriers.values()].reduce((n, s) => n + s.size, 0) + W.untracked.size;
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
    return out;
  };
  const watch = (rec, line, f) => {
    const origin = `${rec.file}:${line}`;
    const bind = (name) => { if (!W.binds.has(rec.real)) W.binds.set(rec.real, new Map()); if (!W.binds.get(rec.real).has(name)) W.binds.get(rec.real).set(name, line); };
    for (const d of rec.a.declared.get(line) ?? []) bind(d.name);                  // every binding declared on an excused clock line
    const e = f.escape ?? { kind: 'none' };
    if (e.kind === 'bind') e.names.forEach(bind);
    else if (e.kind === 'prop') {
      if (e.prop === null) { W.untracked.set(origin, { rec, line, why: 'stored under a computed property name' }); return; }
      if (!W.props.has(e.prop)) W.props.set(e.prop, origin);
      if (e.global && !W.globals.has(e.prop)) W.globals.set(e.prop, origin);
      if (e.globalObj && !W.globals.has(e.globalObj)) W.globals.set(e.globalObj, origin);
      if (e.obj && !e.global) { if (!W.carriers.has(rec.real)) W.carriers.set(rec.real, new Set()); W.carriers.get(rec.real).add(e.obj); }
    } else if (e.kind === 'untracked') W.untracked.set(origin, { rec, line, why: 'returned, exported, thrown or passed on where the guard cannot follow it' });
  };
  let final;
  for (let last = -1; last !== size();) {
    last = size();
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
      for (const name of W.carriers.get(rec.real) ?? []) {
        for (const g of rec.a.globalSets) if (g.value === name && !W.globals.has(g.prop)) W.globals.set(g.prop, `${rec.file}:${g.line}`);
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
  for (const e of allowlist) {
    if (!report.scanned.includes(e.file)) report.pending.push(e);
    else if (!usedEntries.has(e) && !report.ambiguous.some((x) => x.file === e.file && x.line === e.line)) report.stale.push(e);
  }
  report.findings.sort((x, y) => x.file.localeCompare(y.file) || x.line - y.line || x.api.localeCompare(y.api));
  return report;
}
