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
import { PLANS } from '../src/app/entitlements.js';
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

const WRONG_BRAND = /Hushmallow|HUSHMALLOW|HushMallow|Hush ?Mallow/g;
const BRAND_ALLOW = /HushmallowEmbed|Hushmallow_1000_Rituals_V3/g;

function brandProblems(paths) {
  const bad = [];
  for (const p of paths) {
    const code = stripComments(read(p), p).replace(BRAND_ALLOW, '');
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
    const texts = p.endsWith('.js') || p.endsWith('.tsx') ? literals(code) : code.split('\n').map((text, i) => ({ text, line: i + 1 }));
    for (const { text, line } of texts) {
      if (PLAN_WORDS.test(text)) bad.push(`${p}:${line}: plan word in "${text.slice(0, 90)}"`);
      if (AI_WORD.test(text) && !/consent|privacy/i.test(p)) bad.push(`${p}:${line}: "AI" in "${text.slice(0, 90)}"`);
    }
  }
  return bad;
}

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
  for (const k of ['Another Angle', 'fresh perspectives', 'Fact versus interpretation', 'Alternative explanations', 'Belief Mallow']) assert.match(beyond, new RegExp(k));
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

test('brand: the brand never sits inside an uppercasing style unprotected', () => {
  // .brand-name can never be transformed
  assert.match(read('src/ui/type.css'), /\.brand-name \{[^}]*text-transform: none !important/);
  // no brand text handed straight to an overline / badge / speaker label
  const bad = [];
  for (const p of mine.filter((x) => x.endsWith('.js'))) {
    stripComments(read(p), p).split('\n').forEach((l, i) => {
      if (/class: '(eyebrow|badge|who|k)\b/.test(l) && /hushmallow|brandName|PlanName|planName|PLANS\.\w+\.name|p\.name/.test(l) && !/brandMark\(/.test(l)) bad.push(`${p}:${i + 1}`);
    });
  }
  assert.deepEqual(bad, []);
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
  });
  return found;
}
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
