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
//   cannot read (.ts, .jsx, .wasm, …), and an import the guard cannot follow
//   (a package, a URL, an absolute path, a file outside the studio, or a file
//   that is neither JS nor JSON).
//
// Imports: code that engine/ and composer/ import from elsewhere in the studio
// is scanned with the same rules ("followed"), so a helper in another folder
// cannot carry Date.now in. Imports of locked code are not followed: the frozen
// v2 paths and the live app are hash-locked by the frozen/app guards.
//
// What a static guard cannot see:
//   - a property NAME computed at run time from data (o[k] with k returned by a
//     function) on an object it cannot identify as the global object or a clock
//     object (for example the global object passed in as a function argument);
//   - time that arrives as data: requestAnimationFrame timestamps, media/audio
//     currentTime, the order of asynchronous events.
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
// is not scanned) or ambiguous (its line occurs more than once). Excusing a
// clock finding never excuses the handle it creates: every binding declared on
// an excused line is watched, so each later use of it (RealDate.now(), an
// export, `{ RealDate }`) is a finding that needs its own reviewed entry.

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
 */
export const WALLCLOCK_ALLOWED = Object.freeze([]);

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
 * handler attributes, plus script src imports and javascript: URLs.
 * → { blocks: [{ code, offset, sourceType }], imports: [{ spec, offset }], urls: [offset] }
 */
function htmlCode(html) {
  const blocks = [], imports = [], urls = [];
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    const attrs = m[1];
    const type = /\btype\s*=\s*["']?([^"'\s>]*)/i.exec(attrs)?.[1] ?? '';
    if (!JS_TYPES.test(type)) continue;                                   // data blocks (JSON, shaders)
    const src = /\bsrc\s*=\s*["']?([^"'\s>]+)/i.exec(attrs)?.[1];
    if (src) imports.push({ spec: src, offset: m.index });
    blocks.push({ code: m[2], offset: m.index + m[0].indexOf('>') + 1, sourceType: /module/i.test(type) ? 'module' : 'script' });
  }
  for (const m of html.matchAll(/<[a-z][^>]*>/gi)) {
    for (const a of m[0].matchAll(/\s(on[a-z]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
      const raw = a[3] ?? a[4] ?? a[5];
      blocks.push({ code: decodeEntities(raw), offset: m.index + a.index + a[0].indexOf(raw), sourceType: 'script', handler: true });
    }
    for (const a of m[0].matchAll(/=\s*["']?\s*javascript:/gi)) urls.push(m.index + a.index);
  }
  return { blocks, imports, urls };
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
 *     declared: Map<line, [{ name, exported }]>, refs: [{ name, line }] }
 */
export function analyzeSource(src, { html = false } = {}) {
  const lines = src.split('\n');
  const lineAt = (offset) => src.slice(0, offset).split('\n').length;
  const out = { findings: [], imports: [], declared: new Map(), refs: [] };
  const finding = (api, cat, line) => out.findings.push({ api, cat, line, text: (lines[line - 1] ?? '').trim() });

  let units;
  if (html) {
    const h = htmlCode(src);
    for (const u of h.urls) finding('javascript: URL (dynamic code)', 'code', lineAt(u));
    for (const i of h.imports) out.imports.push({ spec: i.spec, line: lineAt(i.offset), kind: 'script' });
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

  const judgeDestructure = (name, pattern, line) => {
    for (const prop of pattern.properties) {
      if (prop.type === 'RestElement') { finding(`${name} (rest destructuring)`, 'clock', line); continue; }
      const k = keyName(prop);
      const api = k === null ? `${name}[…] (computed member)` : MEMBER_RULES[name](k, false);
      if (api) finding(api, 'clock', line);
    }
  };

  /** Judge one use of a clock object. */
  const judgeClock = (name, node, anc) => {
    const line = L(node.loc.start.line);
    const { child, p, i } = useSite(node, anc);
    if (p?.type === 'MemberExpression' && p.object === child) {
      const k = propName(p);
      const api = k === null ? `${name}[…] (computed member)` : MEMBER_RULES[name](k, isAssignTarget(p, anc, i));
      if (api) finding(api, 'clock', line);
      return;
    }
    if (p?.type === 'NewExpression' && p.callee === child && name === 'Date') {
      if (!p.arguments.length || p.arguments.some((a) => a.type === 'SpreadElement')) finding('new Date() (current time)', 'clock', line);
      return;
    }
    if (p?.type === 'CallExpression' && p.callee === child && name === 'Date') { finding('Date() (current time)', 'clock', line); return; }
    if (p?.type === 'UnaryExpression' && p.operator === 'typeof') return;
    if (p?.type === 'BinaryExpression' && p.operator === 'instanceof' && p.right === child) return;
    if (p?.type === 'AssignmentExpression' && p.operator === '=' && p.left === child) return;   // installs a replacement
    if (p?.type === 'VariableDeclarator' && p.init === child && p.id.type === 'ObjectPattern') { judgeDestructure(name, p.id, line); return; }
    if (p?.type === 'AssignmentExpression' && p.right === child && p.left.type === 'ObjectPattern') { judgeDestructure(name, p.left, line); return; }
    finding(`${name} (as a value)`, 'clock', line);
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
        if (isReference(n, p, g)) out.refs.push({ name: n.name, line });
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
          if (CLOCK_OBJECTS.has(k) || k === 'process') finding(`${k} (destructured)`, 'clock', L(prop.loc.start.line));
          if (k === 'eval' || k === 'Function') finding(`${k} (destructured: dynamic code)`, 'code', L(prop.loc.start.line));
          if (k === 'constructor') finding('.constructor (destructured: reaches Function)', 'code', L(prop.loc.start.line));
        }
        break;
      case 'Literal':
        if (typeof n.value === 'string') {
          for (const m of n.value.matchAll(BANNED_TEXT)) finding(`${m[1].replace(/\s+/g, '')} (in a string)`, 'clock', line);
          if (n.value === 'constructor' && (p?.type === 'CallExpression' || p?.type === 'NewExpression') && p.arguments.includes(n)) {
            finding('"constructor" passed to a call (reaches Function: dynamic code)', 'code', line);   // Reflect.get(f, 'constructor')
          }
          if (/^\s*javascript:/i.test(n.value)) finding('javascript: URL (dynamic code)', 'code', line);
        }
        break;
      case 'TemplateElement': {
        const s = n.value.cooked ?? n.value.raw;
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

/** How an import from `fromAbs` resolves for scanning. → { kind: 'builtin'|'file'|'unfollowable', abs?, why? } */
function resolveImport(fromAbs, spec) {
  const bare = spec.replace(/^node:/, '');
  if (spec.startsWith('node:') || BUILTINS.has(bare) || BUILTINS.has(bare.split('/')[0])) return { kind: 'builtin' };
  if (/^[a-z][a-z0-9+.-]*:/i.test(spec)) return { kind: 'unfollowable', why: `code from a URL (${spec.split(':')[0]}:)` };
  if (spec.startsWith('/')) return { kind: 'unfollowable', why: 'an absolute import path' };
  if (!spec.startsWith('./') && !spec.startsWith('../')) return { kind: 'unfollowable', why: `a package (${spec})` };
  return { kind: 'file', abs: path.resolve(path.dirname(fromAbs), spec.replace(/[?#].*$/, '')) };
}

const inside = (p, root) => { const r = path.relative(root, p); return r === '' || (!r.startsWith('..') && !path.isAbsolute(r)); };

/**
 * Scan every file under root/<dir> for each dir that exists, and the studio code
 * they import. → { scanned, followed, locked, missing, findings, allowed, stale, pending, ambiguous }
 *   scanned:   studio-relative paths of every file judged (dirs + followed)
 *   followed:  [{ file, from }] code outside the dirs that they import, scanned too
 *   locked:    [{ file, from }] imports of hash-locked code (frozen v2, live app): not followed
 *   allowed:   findings excused by an allowlist entry (reported, never silent)
 *   stale / pending / ambiguous: allowlist entries that no longer apply, whose
 *              file is not scanned, or whose line occurs more than once. All fail the guard.
 * `locked` (option) lists absolute locked roots; default: FROZEN under root, and root/../hushmallow.
 */
export function scanDirs(root, dirs = DETERMINISTIC_DIRS, allowlist = WALLCLOCK_ALLOWED, {
  locked = [...FROZEN.map((f) => path.join(root, f)), path.join(path.dirname(root), 'hushmallow')],
} = {}) {
  const report = { scanned: [], followed: [], locked: [], missing: [], findings: [], allowed: [], stale: [], pending: [], ambiguous: [] };
  const rel = (abs) => path.relative(root, abs).split(path.sep).join('/');
  const queue = [], seen = new Set();
  const enqueue = (abs) => { if (!seen.has(abs)) { seen.add(abs); queue.push(abs); } };
  const walkDir = (abs) => {
    for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
      const p = path.join(abs, e.name);
      if (e.isDirectory()) { if (e.name !== 'node_modules') walkDir(p); continue; }
      if (CODE_EXT.test(e.name) || HTML_EXT.test(e.name)) enqueue(p);
      else if (UNSCANNABLE_EXT.test(e.name)) report.findings.push({ file: rel(p), api: 'file type the guard cannot scan (use .js/.mjs)', cat: 'scan', line: 1, text: '' });
    }
  };
  const inDirs = (abs) => dirs.some((d) => inside(abs, path.join(root, d)));
  for (const d of dirs) {
    const abs = path.join(root, d);
    if (fs.existsSync(abs)) walkDir(abs); else report.missing.push(d);
  }
  const used = new Set();
  while (queue.length) {
    const abs = queue.shift();
    const file = rel(abs);
    report.scanned.push(file);
    const src = fs.readFileSync(abs, 'utf8');
    const a = analyzeSource(src, { html: HTML_EXT.test(abs) });
    let findings = a.findings;
    // follow imports
    for (const imp of a.imports) {
      const r = resolveImport(abs, imp.spec);
      if (r.kind === 'builtin') continue;
      const bad = (why) => findings.push({ api: `imports ${why}: the guard cannot follow it`, cat: 'scan', line: imp.line, text: (src.split('\n')[imp.line - 1] ?? '').trim() });
      if (r.kind === 'unfollowable') { bad(r.why); continue; }
      if (inDirs(r.abs)) continue;                                                 // scanned anyway
      if (locked.some((l) => inside(r.abs, l))) { report.locked.push({ file: rel(r.abs), from: file }); continue; }
      if (!inside(r.abs, root)) { bad('code from outside the studio'); continue; }
      if (!fs.existsSync(r.abs) || fs.statSync(r.abs).isDirectory()) continue;    // a broken import fails at run time, not here
      if (/\.json$/i.test(r.abs)) continue;                                         // data, not code
      if (!CODE_EXT.test(r.abs) && !HTML_EXT.test(r.abs)) { bad('a file the guard cannot read as JS'); continue; }
      if (!seen.has(r.abs)) report.followed.push({ file: rel(r.abs), from: file });
      enqueue(r.abs);
    }
    // allowlist: one exact, unique line per entry; handles declared on it stay watched
    const lines = src.split('\n').map((l) => l.trim());
    for (const entry of allowlist.filter((e) => e.file === file)) {
      const at = lines.flatMap((l, i) => (l === entry.line ? [i + 1] : []));
      if (at.length > 1) { report.ambiguous.push({ ...entry, lines: at }); continue; }
      if (!at.length) continue;
      const line = at[0];
      const excused = findings.filter((f) => f.line === line && entry.apis.includes(f.api));
      if (!excused.length) continue;
      used.add(entry);
      findings = findings.filter((f) => !excused.includes(f));
      for (const f of excused) report.allowed.push({ file, ...f, reason: entry.reason });
      if (!excused.some((f) => f.cat === 'clock')) continue;
      for (const d of a.declared.get(line) ?? []) {
        if (d.exported) findings.push({ api: `exports the real-clock handle ${d.name} (declared on an allowlisted line)`, cat: 'clock', line, text: entry.line });
        for (const r of a.refs.filter((x) => x.name === d.name && x.line !== line)) {
          findings.push({ api: `real-clock handle ${d.name} (from allowlisted line ${line})`, cat: 'clock', line: r.line, text: lines[r.line - 1] });
        }
      }
    }
    for (const f of findings) report.findings.push({ file, ...f });
  }
  for (const e of allowlist) {
    if (!report.scanned.includes(e.file)) report.pending.push(e);
    else if (!used.has(e) && !report.ambiguous.some((x) => x.file === e.file && x.line === e.line)) report.stale.push(e);
  }
  report.findings.sort((x, y) => x.file.localeCompare(y.file) || x.line - y.line);
  return report;
}
