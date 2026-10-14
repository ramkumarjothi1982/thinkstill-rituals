#!/usr/bin/env node
// Measure the app's Fredoka (hushmallow/assets/fonts/fredoka-latin.woff2) in
// the same headless Chromium the renderer uses, and write per-character
// advances plus kerning pairs to planner/metrics/fredoka-metrics.json.
//
// Why: the planner pre-lints copy layout (hook auto-fit 76 → 50 px, bubble and
// end-card widths) without a browser, in microseconds per string. The exact
// layout still happens in the page (composer/layout.js measures real text);
// the planner adds a 4 % margin on top of these numbers (planner/policy.json),
// so a string it accepts always fits in the page.
//
//   node tools/font-metrics.mjs            # measure and (re)write the JSON
//   node tools/font-metrics.mjs --check    # measure and compare with the committed JSON (exit 1 if different)
//
// Determinism: the output has no timestamps; two runs give identical bytes
// (the --check mode proves it). Canvas text advances are linear in the font
// size with --font-render-hinting=none (the render's flag), which the "check"
// block verifies on real strings at the sizes the videos use.

import fs from 'node:fs';
import crypto from 'node:crypto';
import { confine } from '../render/lib/write-jail.mjs';
import { HUSHMALLOW, studioPath, studioRel, assertWritable } from '../render/lib/paths.mjs';
import { withHeavyLock } from '../render/lib/heavy-lock.mjs';

await confine();

const FONT_FILE = `${HUSHMALLOW}/assets/fonts/fredoka-latin.woff2`;
const OUT = studioPath('planner', 'metrics', 'fredoka-metrics.json');
const WEIGHTS = [400, 500, 600, 700];
const REF = 1000;                          // measure at 1000 px: advances are per-mille of the em
// Every character copy may contain (Latin-1, planner/lint-copy.mjs) plus the
// typographic quotes the renderer substitutes for ASCII ones.
const TYPO = ['‘', '’', '“', '”', '…', '–', '—'];
const chars = [];
for (let c = 0x20; c <= 0x7e; c++) chars.push(String.fromCharCode(c));
for (let c = 0xa0; c <= 0xff; c++) chars.push(String.fromCharCode(c));
chars.push(...TYPO);
// Kerning is measured for the characters copy actually uses (ASCII + typographic quotes).
const kernChars = [...chars.filter((c) => c.charCodeAt(0) < 0x7f), ...TYPO.slice(0, 4)];
// Real strings at the sizes the videos use, to prove the per-mille model.
const CHECKS = [
  { text: 'ME TRYING TO SLEEP', weight: 600, size: 76, tracking: 2 },
  { text: 'SOMEONE: YOU’RE SO FUNNY.', weight: 600, size: 50, tracking: 2 },
  { text: 'Did I say something weird?', weight: 500, size: 50, tracking: 0 },
  { text: 'Give your feelings', weight: 500, size: 62, tracking: 0 },
  { text: 'somewhere soft to land.', weight: 500, size: 62, tracking: 0 },
  { text: 'hushmallow.com', weight: 500, size: 44, tracking: 1 },
  { text: 'AVATAR WAVE Yo! T.V. "quote"', weight: 700, size: 64, tracking: 0 },
];

const round = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

/**
 * Every library string in the style it is drawn in (story-library format.layout):
 * hook lines 600 weight, tracking 2, at 76 and 50 px; bubble rows 500/50;
 * end-card lines and brand closers 500/62. Used to measure the model's error.
 */
async function libraryStrings() {
  const { loadLibrary, hooksOf, linePools, resolutionsOf, wrap2 } = await import('../planner/library.mjs');
  const { typographic } = await import('../planner/text-metrics.mjs');
  const lib = loadLibrary();
  const out = new Map();
  const add = (text, weight, size, tracking) => { const t = typographic(text); out.set(`${t}|${weight}|${size}|${tracking}`, { text: t, weight, size, tracking }); };
  for (const t of lib.templates.values()) {
    for (const h of hooksOf(t)) for (const l of h) { add(l, 600, 76, 2); add(l, 600, 50, 2); }
    for (const pool of linePools(t)) for (const l of pool) for (const row of wrap2(l, 17) || [l]) add(row, 500, 50, 0);
    for (const r of resolutionsOf(t)) for (const l of r.lines) add(l, 500, 62, 0);
    for (const n of t.nameWords || []) add(n, 500, 50, 0);
  }
  for (const c of lib.raw.brand.closers) for (const l of c) add(l, 500, 62, 0);
  return { strings: [...out.values()], librarySha256: lib.sha256 };
}

async function measure() {
  const { strings, librarySha256 } = await libraryStrings();
  const { chromium } = await import('playwright');
  const { LEGACY_ARGS } = await import('./golden/v2-harness.mjs');
  const fontB64 = fs.readFileSync(FONT_FILE).toString('base64');
  const browser = await chromium.launch({ args: [...LEGACY_ARGS] });
  try {
    const page = await browser.newPage();
    const raw = await page.evaluate(async ({ fontB64, WEIGHTS, REF, chars, kernChars, CHECKS, strings }) => {
      const bytes = Uint8Array.from(atob(fontB64), (c) => c.charCodeAt(0));
      const face = new FontFace('Fredoka', bytes.buffer, { weight: '300 700', style: 'normal' });   // as stage2/stage.js
      await face.load();
      document.fonts.add(face);
      await Promise.all(WEIGHTS.map((w) => document.fonts.load(`${w} 40px Fredoka`)));
      const ctx = document.createElement('canvas').getContext('2d');
      const width = (text, weight, size, tracking = 0) => {
        ctx.font = `${weight} ${size}px "Fredoka"`;
        ctx.letterSpacing = `${tracking}px`;
        return ctx.measureText(text).width;
      };
      // the face must really be Fredoka, not a fallback
      ctx.font = `500 ${REF}px monospace`;
      const mono = ctx.measureText('iiiiWWWW').width;
      const fred = width('iiiiWWWW', 500, REF);
      const out = { loaded: document.fonts.check(`500 ${REF}px Fredoka`) && Math.abs(mono - fred) > 1, weights: {}, checks: [] };
      for (const w of WEIGHTS) {
        const advance = {};
        for (const c of chars) advance[c] = width(c, w, REF);
        const kern = {};
        for (const a of kernChars) for (const b of kernChars) {
          const k = width(a + b, w, REF) - advance[a] - advance[b];
          if (Math.abs(k) >= 0.05) kern[a + b] = k;
        }
        // tracking model: canvas letterSpacing adds the spacing after every character
        const t0 = width('HUSH', w, REF), t1 = width('HUSH', w, REF, 10);
        out.weights[w] = { advance, kern, trackingPerChar: (t1 - t0) / 4 };
      }
      for (const c of CHECKS) out.checks.push({ ...c, measured: width(c.text, c.weight, c.size, c.tracking) });
      out.library = strings.map((c) => ({ ...c, measured: width(c.text, c.weight, c.size, c.tracking) }));
      return out;
    }, { fontB64, WEIGHTS, REF, chars, kernChars, CHECKS, strings });
    return { raw, chromium: browser.version(), librarySha256 };
  } finally {
    await browser.close();
  }
}

function build({ raw, chromium, librarySha256 }, measureText) {
  if (!raw.loaded) throw new Error('Fredoka did not load in the page (fallback font measured)');
  const weights = {};
  for (const [w, m] of Object.entries(raw.weights)) {
    if (Math.abs(m.trackingPerChar - 10) > 1e-6) throw new Error(`unexpected letterSpacing model at ${w}: ${m.trackingPerChar}px per char for 10px`);
    weights[w] = {
      advance: Object.fromEntries(Object.entries(m.advance).map(([c, v]) => [c, round(v)])),
      kern: Object.fromEntries(Object.entries(m.kern).map(([p, v]) => [p, round(v)]).filter(([, v]) => v !== 0)),
    };
  }
  const json = {
    schema: 'hm-font-metrics/1',
    $doc: 'Generated by tools/font-metrics.mjs; do not edit. Advances and kerning in px at font-size 1000 (per-mille of the em), measured with canvas measureText in the render\'s Chromium. width(text) = size/1000 * sum(advance[c] + kern[c_i c_i+1]) + tracking * chars. The planner adds the margin from planner/policy.json.',
    font: { family: 'Fredoka', file: 'hushmallow/assets/fonts/fredoka-latin.woff2', sha256: crypto.createHash('sha256').update(fs.readFileSync(FONT_FILE)).digest('hex'), axes: 'wght 300-700' },
    measuredWith: { tool: 'tools/font-metrics.mjs', browser: chromium, flags: '--font-render-hinting=none (render/render.mjs)' },
    unitsPerEm: 1000,
    tracking: 'letterSpacing px is added after every character, the last one included',
    weights,
  };
  // self-check: the per-mille model against real measurements at video sizes
  json.check = raw.checks.map((c) => ({ ...c, measured: round(c.measured, 3) }));
  // and against every library string in its drawn style: the planner's layout
  // margin (policy.layout.margin) must exceed the worst relative error
  let worst = null;
  for (const c of raw.library) {
    const err = measureText(c.text, { weight: c.weight, size: c.size, tracking: c.tracking, metrics: json }) - c.measured;
    const rel = Math.abs(err) / c.measured;
    if (!worst || rel > worst.rel) worst = { ...c, measured: round(c.measured, 3), errPx: round(err, 3), rel };
  }
  json.libraryCheck = {
    librarySha256, strings: raw.library.length,
    maxRelErrorPct: round(worst.rel * 100, 3),
    worst: { text: worst.text, weight: worst.weight, size: worst.size, tracking: worst.tracking, measured: worst.measured, modelErrorPx: worst.errPx },
  };
  return json;
}

const check = process.argv.includes('--check');
const measured = await withHeavyLock({ mode: 'shared', label: 'font-metrics' }, () => measure());
const { measureText } = await import('../planner/text-metrics.mjs');
const { loadPolicy } = await import('../planner/policy.mjs');
const json = build(measured, measureText);
const text = `${JSON.stringify(json, null, 1)}\n`;
const lc = json.libraryCheck, marginPct = (loadPolicy().layout.margin - 1) * 100;
console.log(`fredoka metrics: ${Object.keys(json.weights[500].advance).length} chars x ${WEIGHTS.length} weights, ` +
  `${Object.values(json.weights).reduce((n, w) => n + Object.keys(w.kern).length, 0)} kerning pairs`);
console.log(`model vs Chromium on ${lc.strings} library strings: worst ${lc.maxRelErrorPct}% (${lc.worst.modelErrorPx} px on "${lc.worst.text}" ` +
  `${lc.worst.weight}/${lc.worst.size}px); planner margin ${marginPct.toFixed(1)}%`);
if (lc.maxRelErrorPct >= marginPct / 2) { console.error('model error is more than half the planner margin: raise policy.layout.margin or refine the model'); process.exitCode = 1; }
if (check) {
  const same = fs.existsSync(OUT) && fs.readFileSync(OUT, 'utf8') === text;
  console.log(same ? `${studioRel(OUT)}: identical` : `${studioRel(OUT)}: DIFFERENT from a fresh measurement`);
  if (!same) process.exitCode = 1;
} else {
  fs.mkdirSync(studioPath('planner', 'metrics'), { recursive: true });
  fs.writeFileSync(assertWritable(OUT), text);
  console.log(`wrote ${studioRel(OUT)} (${text.length} bytes)`);
}
