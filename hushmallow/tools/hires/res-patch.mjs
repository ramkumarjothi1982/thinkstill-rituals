// W7: read and apply tools/hires/rig-res.patch (a unified diff) without git.
//
// One source for the high-res seams: W2 merges the patch with `git apply`;
// the labs (lab/rig-loader.js) apply the same file to the live modules in the
// browser, and tests/hires.test.mjs applies it in memory to check that it
// still fits today's files and that the patched code draws every art asset
// at the rig's logical size. Pure ES module, no imports (node and browser).
//
// Matching is tolerant of line offsets (other workstreams keep editing these
// files) and, like `patch`, of fuzz on the outer context lines. A hunk whose
// result is already in the file counts as merged.

/** Parse a unified diff -> [{ file, hunks: [{ at, before:[...], after:[...] }] }]
 *  `file` is the path after `b/` (e.g. 'hushmallow/src/mallows/rig.js'). */
export function parsePatch(text) {
  const files = [];
  let cur = null, h = null;
  for (const line of text.split('\n')) {
    if (line.startsWith('diff --git ')) { cur = null; h = null; continue; }
    if (line.startsWith('--- ')) continue;
    if (line.startsWith('+++ ')) {
      cur = { file: line.slice(4).replace(/^b\//, '').trim(), hunks: [] };
      files.push(cur); h = null; continue;
    }
    const m = /^@@ -(\d+)(?:,\d+)? \+\d+(?:,\d+)? @@/.exec(line);
    if (m && cur) { h = { at: +m[1] - 1, before: [], after: [], ctxHead: 0, ctxTail: 0 }; cur.hunks.push(h); continue; }
    if (!h) continue;
    if (line.startsWith('\\')) continue;            // "\ No newline at end of file"
    const tag = line[0], body = line.slice(1);
    if (tag === ' ') { h.before.push(body); h.after.push(body); } else if (tag === '-') h.before.push(body);
    else if (tag === '+') h.after.push(body);
    else if (line === '') { h.before.push(''); h.after.push(''); }
  }
  for (const f of files) for (const k of f.hunks) {
    // trailing blank lines from the split are not context
    while (k.before.length && k.after.length && k.before.at(-1) === '' && k.after.at(-1) === '' && k.before.length > 1) { k.before.pop(); k.after.pop(); }
    let i = 0;
    while (i < k.before.length && i < k.after.length && k.before[i] === k.after[i]) i++;
    k.ctxHead = i;
    let j = 0;
    while (j < k.before.length - i && j < k.after.length - i && k.before.at(-1 - j) === k.after.at(-1 - j)) j++;
    k.ctxTail = j;
  }
  return files;
}

// all line indices where block occurs in lines, nearest to `near` first
function find(lines, block, near) {
  const hits = [];
  if (!block.length) return hits;
  outer: for (let i = 0; i + block.length <= lines.length; i++) {
    for (let j = 0; j < block.length; j++) if (lines[i + j] !== block[j]) continue outer;
    hits.push(i);
  }
  return hits.sort((a, b) => Math.abs(a - near) - Math.abs(b - near));
}

/** Apply one file's hunks to `src`.
 *  -> { text, state: 'applied'|'merged'|'partial'|'failed', hunks: [{ state, fuzz, offset, header }] }
 *  'applied': every hunk applied; 'merged': every hunk's result was already
 *  there; 'partial': some merged, the rest applied; 'failed': a hunk fits nowhere. */
export function applyFilePatch(src, fp) {
  let lines = src.split('\n');
  const out = [];
  let delta = 0;
  for (const h of fp.hunks) {
    const header = h.before.find((l, i) => i >= h.ctxHead && l.trim()) || h.after.find((l) => l.trim()) || '';
    let done = null;
    // fuzz 0, 1, 2: drop up to that many outer context lines on each side
    for (let fz = 0; fz <= 2 && !done; fz++) {
      const a = Math.min(fz, h.ctxHead), b = Math.min(fz, h.ctxTail);
      const before = h.before.slice(a, h.before.length - b), after = h.after.slice(a, h.after.length - b);
      if (before.length < 2 && before.length === (h.ctxHead - a) + (h.ctxTail - b)) break;   // a pure insertion needs two anchors
      const near = h.at + delta + a;
      // already there? (checked first: an insertion's context can recur after it)
      const merged = find(lines, after, near);
      if (merged.length) { done = { state: 'merged', fuzz: fz, offset: merged[0] - near, header }; break; }
      const hit = find(lines, before, near);
      if (hit.length) {                       // nearest to where the patch says
        lines.splice(hit[0], before.length, ...after);
        delta += after.length - before.length;
        done = { state: 'applied', fuzz: fz, offset: hit[0] - near, header };
        break;
      }
    }
    out.push(done || { state: 'failed', fuzz: null, offset: null, header });
  }
  const st = out.map((o) => o.state);
  const state = st.includes('failed') ? 'failed' : st.every((s) => s === 'merged') ? 'merged' : st.includes('merged') ? 'partial' : 'applied';
  return { text: lines.join('\n'), state, hunks: out };
}

/** The patch's file paths, relative to the app folder ('src/mallows/rig.js'). */
export function appPath(file) { return file.replace(/^hushmallow\//, ''); }
