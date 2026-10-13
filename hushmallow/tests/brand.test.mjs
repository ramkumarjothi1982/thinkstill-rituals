// The brand, plan and typography rules, enforced (runs in the Pages workflow).
//
//  * The brand is always "hushmallow" — lowercase, also at sentence start —
//    in everything a customer can see. Technical identifiers that must not
//    change are allow-listed (HushmallowEmbed, the workbook file name, the
//    product ids).
//  * Customer plan names are "hushmallow Flow" / "hushmallow Beyond"; never
//    Paid / Ultra / Premium. The tier ids 'paid' / 'ultra' and every StoreKit
//    product id stay exactly as they are.
//  * The word "AI" never appears in the experience (consent / privacy
//    screens may describe automated processing accurately).
//  * Type floor: nothing below 12px anywhere (13px for reading text, 12px
//    for decorative badges); inputs ≥16px; Fredoka is retired.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { BRAND, brandName, brandTagline, flowPlanName, beyondPlanName, docTitle, planNameFor } from '../src/brand.js';
import { PLANS, LIVE_FEATURES } from '../src/app/entitlements.js';
import { TYPE, CANVAS_FONT, canvasFont, canvasFontPx, type } from '../src/ui/type.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (p) => readFileSync(root + p, 'utf8');

function walk(dir, exts, out = []) {
  for (const name of readdirSync(root + dir)) {
    const p = `${dir}/${name}`;
    if (statSync(root + p).isDirectory()) walk(p, exts, out);
    else if (exts.some((e) => name.endsWith(e))) out.push(p);
  }
  return out;
}

// Developer-only code is not customer-facing: generated data tables, the
// Emotion Studio dev page, dev fixtures and ritual-schema validation messages.
const DEV_ONLY = [/^src\/v3\/data\//, /^src\/studio\//, /^src\/v3\/dev\//, /^src\/data\/ritual-schema\.js$/];
// Files another workstream owns that still carry the old wording, as
// [path, owner note]. Listed so the guard is honest about them (reported as
// TODO, not hidden); remove an entry as soon as its owner fixes it. Empty now:
// W3 fixed settings.js on 12 Oct.
const PENDING_OTHERS = new Map([]);

const SOURCES = [
  'index.html', 'manifest.webmanifest',
  ...walk('framer', ['.tsx']),
  ...walk('src', ['.js', '.css']),
].filter((p) => !DEV_ONLY.some((re) => re.test(p)));

/** Source with comments removed (line + block comments; quotes respected per line). */
function stripComments(src, path) {
  if (path.endsWith('.html')) return src.replace(/<!--[\s\S]*?-->/g, '');
  if (path.endsWith('.webmanifest')) return src;
  let s = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  if (path.endsWith('.css')) return s;
  return s.split('\n').map((line) => {
    if (/^\s*\/\//.test(line)) return '';
    // drop a trailing // comment that is not inside a string (and not a URL)
    let q = null;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) { if (c === '\\') i++; else if (c === q) q = null; continue; }
      if (c === '"' || c === "'" || c === '`') q = c;
      else if (c === '/' && line[i + 1] === '/' && line[i - 1] !== ':' && line[i - 1] !== '\\') return line.slice(0, i);
    }
    return line;
  }).join('\n');
}

/** String literals in code ('…', "…", `…` on one line), with their line numbers. */
function literals(code) {
  const out = [];
  code.split('\n').forEach((line, n) => {
    const re = /'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)"|`((?:\\.|[^`\\])*)`/g;
    let m;
    while ((m = re.exec(line))) out.push({ text: m[1] ?? m[2] ?? m[3], line: n + 1 });
  });
  return out;
}

/**
 * A small JavaScript lexer: every string literal (template literals across
 * lines included, `${…}` expressions lexed too) with the line it starts on,
 * and the code with comments and regex literals blanked out (line numbers
 * kept). A regex literal is code, never customer text — so a guard such as
 * `/Hushmallow|HUSHMALLOW/.test(shown)` is not a brand problem.
 */
const REGEX_AFTER = new Set([...'(,=:[!&|?{};+-*%<>~^}']);
const REGEX_KW = new Set(['return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new', 'delete', 'void', 'throw', 'yield', 'await', 'instanceof']);
export function lexJs(src) {
  const strings = [];
  const out = src.split('');
  const n = src.length;
  let i = 0, line = 1, prev = '';
  const blank = (a, b) => { for (let k = a; k < b && k < n; k++) if (out[k] !== '\n') out[k] = ' '; };
  const regexOk = () => !prev || REGEX_AFTER.has(prev) || REGEX_KW.has(prev) || prev === '=>';
  function readQuoted(q) {
    const l0 = line; let text = ''; i++;
    while (i < n && src[i] !== q && src[i] !== '\n') {
      if (src[i] === '\\') { text += src[i] + (src[i + 1] ?? ''); i += 2; continue; }
      text += src[i++];
    }
    i++;
    strings.push({ text, line: l0 });
  }
  function readTemplate() {
    const l0 = line; let text = ''; i++;
    while (i < n && src[i] !== '`') {
      const c = src[i];
      if (c === '\\') { if (src[i + 1] === '\n') line++; text += c + (src[i + 1] ?? ''); i += 2; continue; }
      if (c === '$' && src[i + 1] === '{') { i += 2; text += '…'; scan(true); i++; continue; }
      if (c === '\n') line++;
      text += c; i++;
    }
    i++;
    strings.push({ text, line: l0 });
  }
  function scan(inExpr) {
    let depth = 0;
    while (i < n) {
      const c = src[i], d = src[i + 1];
      if (c === '\n') { line++; i++; continue; }
      if (c === ' ' || c === '\t' || c === '\r') { i++; continue; }
      if (c === '/' && d === '/') { const s = i; while (i < n && src[i] !== '\n') i++; blank(s, i); continue; }
      if (c === '/' && d === '*') { const s = i; i += 2; while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') line++; i++; } i += 2; blank(s, i); continue; }
      if (c === "'" || c === '"') { readQuoted(c); prev = 'str'; continue; }
      if (c === '`') { readTemplate(); prev = 'str'; continue; }
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
  return { strings, code: out.join('') };
}

const WRONG_BRAND = /Hushmallow|HUSHMALLOW|HushMallow|Hush ?Mallow/g;
const BRAND_ALLOW = /HushmallowEmbed|Hushmallow_1000_Rituals_V3/g;

function brandProblems(paths) {
  const bad = [];
  for (const p of paths) {
    // JS: comments and regex literals are code, not customer text
    const src = p.endsWith('.js') ? lexJs(read(p)).code : stripComments(read(p), p);
    const code = src.replace(BRAND_ALLOW, '');
    code.split('\n').forEach((l, i) => { if (WRONG_BRAND.test(l)) bad.push(`${p}:${i + 1}: ${l.trim().slice(0, 120)}`); WRONG_BRAND.lastIndex = 0; });
  }
  return bad;
}

const PLAN_WORDS = /\b(Ultra|ULTRA|Premium|PREMIUM|Paid|PAID)\b/;
const AI_WORD = /\bAI\b/;
function wordingProblems(paths) {
  const bad = [];
  for (const p of paths) {
    const code = stripComments(read(p), p);
    // JS: every literal, multi-line template strings included; TSX: per line (JSX text is not a literal)
    const texts = p.endsWith('.js') ? lexJs(read(p)).strings
      : p.endsWith('.tsx') ? [...literals(code), ...code.split('\n').map((text, i) => ({ text: text.replace(/<[^>]*>/g, ' '), line: i + 1 })).filter((t) => !/[=;(){}]/.test(t.text))]
        : code.split('\n').map((text, i) => ({ text, line: i + 1 }));
    for (const { text, line } of texts) {
      if (PLAN_WORDS.test(text)) bad.push(`${p}:${line}: plan word in "${text.slice(0, 90)}"`);
      if (AI_WORD.test(text) && !/consent|privacy/i.test(p)) bad.push(`${p}:${line}: "AI" in "${text.slice(0, 90)}"`);
    }
  }
  return bad;
}

test('brand guard: the lexer tells regex guards and code from customer strings', () => {
  const src = [
    "if (/Hushmallow|HUSHMALLOW/.test(shown)) p.push('brand must be lowercase');   // a guard",
    'const half = w / 2, q = total / count; const s = \'Hushmallow\';',
    'const t = `first line',
    '  Ultra second line ${a / 2} and ${"inner AI"}`;',
    "const re = x.replace(/[/]/g, ''); const ok = 'Premium';",
    '/* Hushmallow in a comment */ const z = y;',
  ].join('\n');
  const { strings, code } = lexJs(src);
  assert.equal(code.split('\n').length, 6, 'line numbers kept');
  assert.doesNotMatch(code.split('\n')[0], /Hushmallow/, 'regex literal blanked');
  assert.match(code.split('\n')[1], /'Hushmallow'/, 'a string after a division is still a string');
  assert.doesNotMatch(code.split('\n')[5], /Hushmallow/, 'comment blanked');
  const texts = strings.map((s) => [s.text, s.line]);
  assert.ok(texts.some(([t, l]) => /Ultra second line/.test(t) && l === 3), 'multi-line template caught, on its first line');
  assert.ok(texts.some(([t]) => t === 'inner AI'), 'strings inside ${…} are lexed');
  assert.ok(texts.some(([t, l]) => t === 'Premium' && l === 5), 'a regex with / in a class does not swallow the line');
  // every real source lexes to the same number of lines
  for (const p of SOURCES.filter((x) => x.endsWith('.js'))) assert.equal(lexJs(read(p)).code.split('\n').length, read(p).split('\n').length, p);
});

const mine = SOURCES.filter((p) => !PENDING_OTHERS.has(p));
const pending = SOURCES.filter((p) => PENDING_OTHERS.has(p));

test('brand: always lowercase "hushmallow" in customer-facing code (case-sensitive)', () => {
  assert.deepEqual(brandProblems(mine), []);
});

test('plans: no customer string says Ultra / Premium / Paid, and none says "AI"', () => {
  assert.deepEqual(wordingProblems(mine), []);
});

for (const p of pending) {
  test(`brand + wording in ${p} (another workstream's file)`, { todo: PENDING_OTHERS.get(p) }, () => {
    assert.deepEqual([...brandProblems([p]), ...wordingProblems([p])], []);
  });
}

test('brand: the central configuration holds the exact approved wording', () => {
  assert.equal(brandName, 'hushmallow');
  assert.equal(brandTagline, 'Less noise. More magic.');
  assert.equal(BRAND.brandLockup, 'hushmallow — Less noise. More magic.');
  assert.equal(BRAND.productDescriptor, 'Your second brain for feelings.');
  assert.equal(flowPlanName, 'hushmallow Flow');
  assert.equal(beyondPlanName, 'hushmallow Beyond');
  assert.equal(BRAND.flowTagline, 'A little more room for your feelings.');
  assert.equal(BRAND.beyondTagline, 'There’s more than one way to see it.');
  assert.deepEqual({ ...BRAND.planName }, { paid: 'hushmallow Flow', ultra: 'hushmallow Beyond' });
  assert.equal(planNameFor('paid'), 'hushmallow Flow');
  assert.equal(planNameFor('none'), null);
  assert.equal(docTitle(''), 'hushmallow');
  assert.equal(docTitle('Settings'), 'Settings · hushmallow');
  assert.ok(Object.isFrozen(BRAND));
  // logo URLs resolve next to the code (they survive the v/<ver>/ layout)
  for (const u of [BRAND.logo.light, BRAND.logo.ink, BRAND.logo.light2x]) {
    assert.match(u, /\/assets\/brand\/hushmallow-logo-(light|ink)-(720|960)\.webp$/);
    assert.ok(existsSync(fileURLToPath(u)), u);
  }
});

test('plans: customer names from brand.js; ids and StoreKit product ids frozen', () => {
  assert.equal(PLANS.paid.id, 'paid');
  assert.equal(PLANS.ultra.id, 'ultra');
  assert.equal(PLANS.paid.name, flowPlanName);
  assert.equal(PLANS.ultra.name, beyondPlanName);
  assert.equal(PLANS.paid.tagline, BRAND.flowTagline);
  assert.equal(PLANS.ultra.tagline, BRAND.beyondTagline);
  assert.deepEqual(PLANS.paid.productIds, { monthly: 'hushmallow.paid.monthly', yearly: 'hushmallow.paid.yearly' });
  assert.deepEqual(PLANS.ultra.productIds, { monthly: 'hushmallow.ultra.monthly', yearly: 'hushmallow.ultra.yearly' });
  assert.equal(Object.keys(PLANS).length, 2, 'exactly two paid plans');
  // Beyond's value is a capability, said plainly
  const beyond = PLANS.ultra.includes.join(' ');
  for (const k of ['Another Angle', 'fresh perspectives', 'Fact versus interpretation', 'Alternative explanations']) assert.match(beyond, new RegExp(k));
  // it sells Belief Mallows only once they are switched on in the build
  if (LIVE_FEATURES.beliefMallows) assert.match(beyond, /Belief Mallow/);
  else assert.doesNotMatch(beyond, /Belief Mallow/);
  for (const line of [...PLANS.paid.includes, ...PLANS.ultra.includes]) {
    assert.doesNotMatch(line, /\bAI\b|\bUltra\b|\bPaid\b|\bPremium\b/);
    assert.doesNotMatch(line, /\bcure|\bfix(es)? your|guarantee/i, 'no cure or relief claims');
  }
});

test('brand: index.html, manifest and the Framer embed are lowercase', () => {
  const html = read('index.html');
  assert.equal(html.match(/<title>([^<]*)<\/title>/)[1], 'hushmallow');
  assert.match(html, /<meta name="description" content="hushmallow — Less noise\. More magic\./);
  assert.match(html, /<meta name="apple-mobile-web-app-title" content="hushmallow">/);
  const man = JSON.parse(read('manifest.webmanifest'));
  assert.equal(man.name, 'hushmallow');
  assert.equal(man.short_name, 'hushmallow');
  const tsx = read('framer/HushmallowEmbed.tsx');
  assert.match(tsx, /export default function HushmallowEmbed\(/, 'Framer instances bind to this name');
  assert.match(tsx, /title="hushmallow"/);
  assert.match(tsx, /\burl\b/);
});

// Classes that uppercase their text, read from the CSS itself: each entry is
// the class list of a selector's last compound (".badge.beyond" → both).
function upperCompounds() {
  const out = [];
  for (const p of walk('src', ['.css'])) {
    for (const m of stripComments(read(p), p).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (!/text-transform:\s*uppercase/.test(m[2])) continue;
      for (const sel of m[1].split(',')) {
        const last = sel.trim().split(/[\s>+~]+/).pop() || '';
        const cls = [...new Set([...last.matchAll(/\.([\w-]+)/g)].map((c) => c[1]))];
        if (cls.length) out.push(cls);
      }
    }
  }
  return out;
}
// End of the balanced bracket that opens at code[i] (strings and templates skipped).
function closeAt(code, i) {
  const open = code[i], close = { '(': ')', '{': '}', '[': ']' }[open];
  let depth = 0;
  for (let k = i; k < code.length; k++) {
    const c = code[k];
    if (c === "'" || c === '"') { k++; while (k < code.length && code[k] !== c && code[k] !== '\n') { if (code[k] === '\\') k++; k++; } continue; }
    if (c === '`') { k++; let d = 0; while (k < code.length && !(code[k] === '`' && d === 0)) { if (code[k] === '\\') k++; else if (code[k] === '$' && code[k + 1] === '{') { d++; k++; } else if (code[k] === '}' && d) d--; k++; } continue; }
    if (c === open) depth++;
    else if (c === close && --depth === 0) return k;
  }
  return code.length - 1;
}
const BRAND_REF = /hushmallow|brandName|PlanName|planName|PLANS\.\w+\.name|\bp\.name\b|BRAND\.\w+/;
/** Every h(tag, {attrs}, …kids) call whose attrs uppercase it, with a brand reference
 *  anywhere in its kids (nested elements inherit text-transform) that is not
 *  wrapped in brandMark(…) or a .brand-name element. */
export function uppercaseBrandProblems(src, path, compounds) {
  const code = lexJs(src).code;
  const bad = [];
  const isUpper = (attrs) => {
    if (/textTransform:\s*['"`]uppercase/.test(attrs) || /type\(\s*['"](overline|badge)['"]/.test(attrs)) return true;
    for (const m of attrs.matchAll(/class(?:Name)?:\s*(['"`])([^'"`]*)\1/g)) {
      const list = new Set(m[2].split(/\s+/));
      if (compounds.some((c) => c.every((x) => list.has(x)))) return true;
    }
    return false;
  };
  const scrub = (t) => {   // drop protected brand: brandMark(…) and h(…, { class: '…brand-name…' }, …)
    for (;;) {
      const m = /\bbrandMark\(/.exec(t) || /\bh\([^,]*,\s*\{[^{}]*brand-name[^{}]*\}/.exec(t);
      if (!m) return t;
      const at = t.indexOf('(', m.index);
      t = t.slice(0, m.index) + t.slice(closeAt(t, at) + 1);
    }
  };
  for (const m of code.matchAll(/\bh\(/g)) {
    const open = m.index + 1, end = closeAt(code, open);
    const call = code.slice(open + 1, end);
    const comma = call.search(/,\s*\{/);
    if (comma < 0) continue;
    const a0 = call.indexOf('{', comma), a1 = closeAt(call, a0);
    if (!isUpper(call.slice(a0, a1 + 1))) continue;
    if (BRAND_REF.test(scrub(call.slice(a1 + 1)))) bad.push(`${path}:${code.slice(0, m.index).split('\n').length}`);
  }
  // text handed to an eyebrow or a speaker label by name (setMove, say)
  code.split('\n').forEach((l, i) => { if (/\b(eyebrow|who):\s*[^,}]*?(hushmallow|brandName|PlanName|planName)/.test(scrub(l))) bad.push(`${path}:${i + 1}`); });
  return bad;
}

test('brand: the brand never sits inside an uppercasing style unprotected', () => {
  // .brand-name can never be transformed
  assert.match(read('src/ui/type.css'), /\.brand-name \{[^}]*text-transform: none !important/);
  const compounds = upperCompounds();
  for (const c of ['eyebrow', 'badge', 'who', 'k', 't-overline']) assert.ok(compounds.some((x) => x.length === 1 && x[0] === c), `${c} found uppercasing in the CSS`);
  const bad = mine.filter((x) => x.endsWith('.js')).flatMap((p) => uppercaseBrandProblems(read(p), p, compounds));
  assert.deepEqual(bad, []);
});

test('brand guard catches the brand in uppercase however it is written (mutation cases)', () => {
  const compounds = upperCompounds();
  const caught = (src) => uppercaseBrandProblems(src, 'x.js', compounds).length > 0;
  assert.ok(caught("h('div', { class: 'eyebrow' }, brandName)"), 'eyebrow class');
  assert.ok(caught("h('div', { class: 'eyebrow' },\n  'Welcome to',\n  ` ${BRAND.beyondPlanName}`)"), 'split across lines');
  assert.ok(caught("h('p', { class: 'card eyebrow muted' }, h('span', {}, flowPlanName))"), 'nested child inherits the uppercase');
  assert.ok(caught("h('span', { style: { textTransform: 'uppercase', color: 'red' } }, brandName)"), 'inline textTransform');
  assert.ok(caught("h('span', { style: type('overline', { color: 'red' }) }, 'hushmallow Flow')"), 'overline token');
  assert.ok(caught("h('span', { class: 'badge beyond' }, PLANS.ultra.name)"), 'badge');
  assert.ok(caught("setMove(0, { eyebrow: brandName, title: 'x' })"), 'eyebrow by name');
  assert.ok(!caught("h('div', { class: 'eyebrow' }, brandMark(BRAND.beyondPlanName), ' is open')"), 'brandMark is safe');
  assert.ok(!caught("h('div', { class: 'eyebrow' }, h('span', { class: 'brand-name' }, brandName))"), '.brand-name is safe');
  assert.ok(!caught("h('div', { class: 'eyebrow' }, 'Move 1 of 4'), h('p', {}, brandName)"), 'a sibling is not inside');
});

test('logo: approved artwork in assets/brand (light + ink, master + WebP sizes), shipped by the site build', () => {
  for (const tone of ['light', 'ink']) {
    const png = readFileSync(`${root}assets/brand/hushmallow-logo-${tone}.png`);
    assert.equal(png.toString('ascii', 1, 4), 'PNG');
    assert.equal(png.readUInt32BE(16), 1540);
    assert.equal(png.readUInt32BE(20), 289);
    for (const w of [360, 480, 720, 960]) {
      const webp = readFileSync(`${root}assets/brand/hushmallow-logo-${tone}-${w}.webp`);
      assert.equal(webp.toString('ascii', 8, 12), 'WEBP');
    }
  }
  assert.match(read('tools/build-site.sh'), /"\$here\/assets\/brand"/);
  // the high-res art ships too, so the switch at integration (D13) cannot 404 on Pages
  assert.match(read('tools/build-site.sh'), /"\$here\/assets\/mallows-hires" "\$here\/assets\/rig-hires"/);
});

test('icons: square PNGs from the mascot, for the manifest, the home screen and the tab', () => {
  const size = (f) => { const b = readFileSync(`${root}${f}`); assert.equal(b.toString('ascii', 1, 4), 'PNG', f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
  const man = JSON.parse(read('manifest.webmanifest'));
  assert.ok(man.icons.length >= 2);
  for (const ic of man.icons) {
    const [w, h] = size(ic.src);
    assert.equal(w, h, `${ic.src} is square`);
    assert.equal(ic.sizes, `${w}x${h}`, `${ic.src} sizes`);
  }
  for (const need of ['192x192', '512x512']) assert.ok(man.icons.some((i) => i.sizes === need && i.purpose === 'any'), need);
  assert.ok(man.icons.some((i) => i.purpose === 'maskable'));
  const html = read('index.html');
  const touch = html.match(/<link rel="apple-touch-icon" href="([^"]+)"/)[1];
  assert.deepEqual(size(touch), [180, 180]);
  const fav = html.match(/<link rel="icon" href="([^"]+)"/)[1];
  const [fw, fh] = size(fav);
  assert.ok(fw === fh && readFileSync(`${root}${fav}`).length < 40000, 'a small square favicon');
});

test('fonts: self-hosted, licensed, preloaded once; Fredoka retired', () => {
  const css = read('src/ui/type.css');
  const files = [...css.matchAll(/url\("\.\.\/\.\.\/assets\/fonts\/([^"]+)"\)/g)].map((m) => m[1]);
  assert.ok(files.length >= 6);
  for (const f of new Set(files)) assert.ok(existsSync(`${root}assets/fonts/${f}`), f);
  for (const fam of ['HM Nunito Sans', 'HM Manrope', 'HM Fraunces']) {
    assert.match(css, new RegExp(`font-family: "${fam}"; font-style: normal; font-weight: \\d+ \\d+; font-display: swap`));
    assert.match(css, new RegExp(`font-family: "${fam} Fallback"; src: local\\(`), `${fam} has a metric-matched fallback`);
  }
  for (const l of ['OFL-nunito-sans.txt', 'OFL-manrope.txt', 'OFL-fraunces.txt']) assert.match(read(`assets/fonts/${l}`), /SIL Open Font License/);
  const html = read('index.html');
  const preloads = [...html.matchAll(/<link rel="preload" href="([^"]+)" as="font"/g)].map((m) => m[1]);
  assert.deepEqual(preloads, ['assets/fonts/nunito-sans-latin-wght-normal.woff2', 'assets/fonts/manrope-latin-wght-normal.woff2']);
  assert.match(html, /href="src\/ui\/type\.css"/);
  for (const p of SOURCES) assert.doesNotMatch(stripComments(read(p), p), /Fredoka/, `${p} still uses Fredoka`);
  assert.equal(CANVAS_FONT.voice.split(',')[0], '"HM Nunito Sans"');
});

test('type: tokens in type.css match TYPE in type.js; floors hold', () => {
  const css = read('src/ui/type.css');
  for (const [k, t] of Object.entries(TYPE)) {
    assert.match(css, new RegExp(`--type-${k}-weight: ${t.weight};`), `${k} weight`);
    assert.match(css, new RegExp(`--type-${k}-lh: ${t.lh};`), `${k} has an explicit line-height`);
    const min = Array.isArray(t.size) ? t.size[0] : t.size;
    const re = Array.isArray(t.size) ? new RegExp(`--type-${k}-size: calc\\(clamp\\(${min}px, `) : new RegExp(`--type-${k}-size: calc\\(${min}px \\* `);
    assert.match(css, re, `${k} size`);
    assert.match(css, new RegExp(`\\.t-${k}\\.t-${k} \\{ font: var\\(--type-${k}\\);`), `${k} utility class`);
    assert.ok(min >= (k === 'badge' ? 12 : 13), `${k} ≥ floor`);
  }
  assert.ok(TYPE.input.size >= 16 && TYPE.entry.size >= 16, 'inputs ≥ 16px (iOS zooms below)');
  assert.ok(TYPE.subtitle.size[0] >= 19 && TYPE.dialogue.size[0] >= 19, 'dialogue + subtitles 19px+');
  // canvas: weights in hundreds, story falls back to voice
  assert.match(canvasFont('dialogue'), /^700 20px "HM Nunito Sans"/);
  assert.match(canvasFont('cinematic', 2), /^600 60px "HM Nunito Sans"/);
  assert.match(canvasFontPx(13, 650, 'ui'), /^700 13px "HM Manrope"/);
  assert.equal(type('caption').fontSize, 'var(--type-caption-size)');
  assert.equal(type('overline').textTransform, 'uppercase');
});

// px font sizes in CSS and in the JS files W1 migrated onto the tokens
const MIGRATED = [
  'src/app/scenes/home.js', 'src/app/scenes/landing.js', 'src/app/scenes/plans.js', 'src/app/scenes/journey.js', 'src/app/scenes/library.js',
  'src/app/scenes/encounter.js', 'src/app/scenes/mallows.js', 'src/app/scenes/express.js', 'src/app/scenes/support.js',
  'src/ultra/another-angle.js', 'src/v3/host.js', 'src/v3/fx.js',
  ...walk('src/rituals', ['.js']),
];
function pxFonts(code, isCss) {
  const found = [];
  const lines = code.split('\n');
  lines.forEach((l, i) => {
    const pats = isCss
      ? [/font-size:\s*[^;{}]*?\b([\d.]+)px/g, /font:\s*[^;{}]*?\b([\d.]+)px/g]
      : [/fontSize:\s*'([\d.]+)px'/g, /font(?:Size)?:\s*[`'"][^`'"]*?\b([\d.]+)px/g, /\.font\s*=\s*[`'"][^`'"]*?\b([\d.]+)px/g, /canvasFontPx\(\s*([\d.]+)\s*[,)]/g, /'font-size':\s*'([\d.]+)'/g,
        /fontSize:\s*[^,}]*\?\s*'([\d.]+)px'/g, /fontSize:\s*[^,}]*:\s*'([\d.]+)px'/g,
        /\bfont(?:-size)?:\s*[^;{}'"`]*?\b([\d.]+)px/g];   // CSS written inside JS strings
    for (const re of pats) { let m; while ((m = re.exec(l))) found.push({ px: Number(m[1]), line: i + 1 }); }
    // computed sizes in a font template: `${small ? 11 : 13}px`, `calc(${n ? 13 : 15}px * …)`
    if (!isCss) {
      for (const t of l.matchAll(/(?:fontSize\s*[:=]|\.font\s*=|\bfont\s*:|font-size\s*:)\s*`([^`]*)`/g)) {
        for (const e of t[1].matchAll(/\$\{([^}]*)\}px/g)) {
          for (const n of e[1].matchAll(/(?:^|[?:])\s*([\d.]+)\s*(?=[?:]|$)/g)) found.push({ px: Number(n[1]), line: i + 1 });
        }
      }
    }
  });
  return found;
}
test('type floor guard reads computed sizes in font templates', () => {
  const px = (l) => pxFonts(l, false).map((f) => f.px);
  assert.deepEqual(px("el.style.fontSize = `${small ? 11 : 13}px`;"), [11, 13]);
  assert.deepEqual(px("fontSize: `calc(${size < 170 ? 13 : size < 220 ? 15 : 17}px * var(--type-scale))`"), [13, 15, 17]);
  assert.deepEqual(px("ctx.font = `700 ${10}px ${FAMILY}`;"), [10]);
  assert.deepEqual(px("width: `${a ? 4 : 8}px`, fontSize: `${fs}px`"), [], 'widths and variables are not font sizes');
});
test('type floor: no px font size below 12 in CSS or the migrated JS', () => {
  const bad = [];
  for (const p of walk('src', ['.css'])) for (const f of pxFonts(stripComments(read(p), p), true)) if (f.px < 12) bad.push(`${p}:${f.line}: ${f.px}px`);
  for (const p of MIGRATED) for (const f of pxFonts(stripComments(read(p), p), false)) if (f.px < 12) bad.push(`${p}:${f.line}: ${f.px}px`);
  assert.deepEqual(bad, []);
});

test('type floor: no old family stacks or Fredoka left in the migrated JS', () => {
  const bad = [];
  for (const p of MIGRATED) {
    const code = stripComments(read(p), p);
    code.split('\n').forEach((l, i) => { if (/ui-rounded|"SF Pro Rounded"|\bsystem-ui, sans-serif\b|--font-display|--font-ui\b/.test(l)) bad.push(`${p}:${i + 1}`); });
  }
  assert.deepEqual(bad, []);
});

test('toasts and bubbles: centred toasts, dialogue never below 19px, calm under reduced motion', () => {
  const css = read('src/ui/app.css');
  // the toast's entrance keeps its translateX(-50%) centring (bubbleIn ends at transform:none)
  assert.match(css, /\.toast \{[^}]*animation: toastIn /);
  assert.match(css, /@keyframes toastIn \{ from \{[^}]*translate\(-50%, [^}]*\} to \{[^}]*translate\(-50%, 0\)/);
  // compact bubbles save room with padding and width, never a smaller font
  const compact = css.match(/\.bubble\.compact \{([^}]*)\}/)[1];
  assert.doesNotMatch(compact, /font(-size)?:/);
  // reduced motion: a plain fade for both
  const rm = [...css.matchAll(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/g)].map((m) => m[1]).join('\n');
  assert.match(rm, /\.toast \{ animation: softFade 120ms/);
  assert.match(rm, /\.bubble \{ animation: softFade 120ms/);
  // no speech is ever hidden from sighted people (the old sr-only fallback)
  assert.doesNotMatch(read('src/app/ui.js'), /classList\.add\('sr-only'\)/);
});

test('privacy copy matches what ships: Another Angle runs on the phone in this build', async () => {
  // no customer string in the plans screen or Another Angle claims a server; the
  // Plans note comes from src/app/privacy.js, which follows resolveEndpoint():
  // on the phone while there is no endpoint (this build), the approved
  // sentence once Another Angle goes live (G1), together with Settings → About
  for (const p of ['src/app/scenes/plans.js', 'src/ultra/another-angle.js']) {
    for (const { text } of lexJs(read(p)).strings) assert.doesNotMatch(text, /\bserver\b|secure server|beyond your phone/i, `${p}: "${text.slice(0, 80)}"`);
  }
  assert.match(read('src/app/scenes/plans.js'), /plansBeyondNote\(\)/);
  const { plansBeyondNote, PLANS_BEYOND_NOTE } = await import('../src/app/privacy.js');
  const { ANGLE_ENDPOINT } = await import('../src/app/config.js');
  assert.equal(PLANS_BEYOND_NOTE.local, 'Another Angle works on this phone: what you type stays here.');
  if (!ANGLE_ENDPOINT) assert.equal(plansBeyondNote({ endpoint: null }), PLANS_BEYOND_NOTE.local);
});
