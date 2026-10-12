// W7 lab: the rig with high-res (`res`) support.
//
// Until W2 merges tools/hires/rig-res.patch into src/mallows/rig.js, the lab
// patches a copy of the live rig.js in the browser (the same text edits as
// the patch, nothing else) and imports it from a blob URL. Its imports are
// rewritten to absolute URLs, so it shares registry.js / expressions.js with
// the page (one MALLOWS, one SPRITES). Once rig.js has the support, the real
// module is used as is.
const RIG = new URL('../../../src/mallows/rig.js', import.meta.url).href;

// The res support as text edits on rig.js (the intent of rig-res.patch):
// [what, pattern, replacement]. Patterns are loose on purpose: rig.js keeps
// changing (W2), and the lab must keep working until the support is merged.
const EDITS = [
  // skin resolution may follow the art (q up to 1.25 * res)
  ['q cap', /clamp\(this\.S \* dpr \* 1\.05, 0\.28, 1\.25\)/, 'clamp(this.S * dpr * 1.05, 0.28, 1.25 * (m.res || 1))'],
  // body and approved art drawn at the logical size
  ['body at m.size', /ctx\.drawImage\(A\.body, 0, 0\);/, 'ctx.drawImage(A.body, 0, 0, m.size[0], m.size[1]);'],
  ['art at m.size', /ctx\.drawImage\(A\.original, 0, 0\);/, 'ctx.drawImage(A.original, 0, 0, m.size[0], m.size[1]);'],
  // spiral sprites drawn at native px / res
  ['spiral / res', /const r = \(img\.width \/ 2\) \* P\.eyeScale;/, 'const r = (img.width / 2 / (rig.mallow.res || 1)) * P.eyeScale;'],
  // Glitzi's glitch rows: the Mallow's own (m.glitchRows) when it has them.
  // The lab renders synchronously, so a module-level switch set on entry to
  // the two readers is enough here (the merged patch reads them per rig).
  ['glitch rows', /const GLITCH_ROWS = (\[[^\]]*\]);/, 'const GLITCH_ROWS_BASE = $1;\nlet GLITCH_ROWS = GLITCH_ROWS_BASE;'],
  ['rows: skin', /\n  _renderSkin\(\) \{\n/, '\n  _renderSkin() {\n    GLITCH_ROWS = this.mallow.glitchRows || GLITCH_ROWS_BASE;\n'],
  ['rows: shader', /\n  glitchLines\(([^\n]*)\) \{\n/, (m, a) => `\n  glitchLines(${a.replace('GLITCH_ROWS.length', '(this.mallow.glitchRows || GLITCH_ROWS_BASE).length')}) {\n    GLITCH_ROWS = this.mallow.glitchRows || GLITCH_ROWS_BASE;\n`],
];

let cached = null;

/** The rig module (MallowRig, PRESETS, STAGES, faceRectSrc, ...) with res support. */
export function loadRig() {
  if (cached) return cached;
  cached = (async () => {
    const src = await (await fetch(RIG, { cache: 'no-store' })).text();
    if (/1\.25 \* \(m\.res \|\| 1\)/.test(src) && /glitchRows/.test(src)) {
      const mod = await import(RIG);       // rig.js has the support (merged)
      return Object.assign({ patched: false }, mod);
    }
    const missing = EDITS.filter(([, re]) => !re.test(src)).map(([w]) => w);
    if (missing.length) throw new Error('rig.js changed; cannot apply: ' + missing.join(', '));
    let s = src;
    for (const [, re, to] of EDITS) s = s.replace(re, to);
    s = s.replace(/from '\.\/([\w./-]+\.js)'/g, (m, f) => `from '${new URL(f, RIG).href}'`);
    const url = URL.createObjectURL(new Blob([s], { type: 'text/javascript' }));
    const mod = await import(url);
    return Object.assign({ patched: true }, mod);
  })();
  return cached;
}
