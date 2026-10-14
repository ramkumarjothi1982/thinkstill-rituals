// The benchmark table of the performance pass: one row per hm bench result.
//
//   node tools/perf/bench-table.mjs <label=bench.json> [<label=bench.json> …] [--md out.md] [--json out.json]
//
// Each row: the median ms per frame and per sub-frame, the predicted 15 s film,
// the change against the previous row, the three runs, and the heaviest passes
// of the fenced split. Rows keep the order given (the order the steps landed).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PASSES = ['face.draw', 'face.upload', 'world', 'sub.reflection', 'sub.composite', 'sub.glass', 'sub.mesh', 'accum', 'composite', 'bloom', 'post', 'overlay.upload', 'state'];

/** rows: [{ label, file }] → { rows: [...], markdown } */
export function benchTable(items) {
  const rows = items.map(({ label, file }) => {
    const r = JSON.parse(fs.readFileSync(file, 'utf8'));
    return { label, file, profile: r.profile, features: r.features, runs: r.perRun.map((x) => Math.round(x.msPerFrame)), ...r.median, sample: r.sample };
  });
  const head = ['step', 'ms/frame', 'ms/sub-frame', 'sub-frames (sample)', '15 s film', 'vs previous', 'runs (ms/frame)', ...PASSES];
  const lines = [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`];
  rows.forEach((r, k) => {
    const prev = rows[k - 1];
    const delta = prev ? `${(((r.filmSeconds - prev.filmSeconds) / prev.filmSeconds) * 100).toFixed(1)} %` : '—';
    lines.push(`| ${[r.label, r.msPerFrame, r.msPerSubframe, r.subframes, `${r.filmSeconds} s (${r.filmMinutes} min)`, delta, r.runs.join(' / '),
      ...PASSES.map((p) => (r.passes?.[p] != null ? r.passes[p] : '—'))].join(' | ')} |`);
  });
  return { rows, markdown: lines.join('\n') };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2), opt = (k) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv.splice(i, 2)[1] : null; };
  const md = opt('md'), json = opt('json');
  const t = benchTable(argv.map((a) => { const [label, file] = a.split('='); return { label, file }; }));
  if (md) fs.writeFileSync(md, t.markdown + '\n');
  if (json) fs.writeFileSync(json, JSON.stringify(t.rows, null, 1) + '\n');
  console.log(t.markdown);
}
