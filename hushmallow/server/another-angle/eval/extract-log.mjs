#!/usr/bin/env node
// Turns the log of an "Another Angle eval" GitHub Actions job back into the
// JSON that tools/angle-eval.mjs writes (results[].rounds[] with scene,
// meta.drafts and judge), so a run can be replayed through the current gate
// (eval/replay-gate.mjs) when only the log is at hand. eval/runs/run1-answers.json
// and run2-answers.json were made this way.
//
//   node eval/extract-log.mjs <job-log.txt> <out.json> [--run "run 3 (…)"]
//
// It reads the markdown report the job prints: the "Gate rejections" list and
// the "Cases" section. A scene keeps what the report shows (both lines, the
// four explore fields, pattern, mechanic, Mallow, emotion, situation); a
// rejected draft keeps its lines and the text of each failing field. Lines
// it cannot read stop it with an error rather than guessing.

import { readFileSync, writeFileSync } from 'node:fs';

const [src, out] = process.argv.slice(2);
const runArg = process.argv.indexOf('--run');
if (!src || !out) {
  console.error('Usage: node eval/extract-log.mjs <job-log.txt> <out.json> [--run "<label>"]');
  process.exit(1);
}
const log = readFileSync(src, 'utf8').split('\n')
  // GitHub prefixes each line with a timestamp.
  .map((l) => l.replace(/\r$/, '').replace(/^﻿?\d{4}-\d\d-\d\dT[\d:.]+Z ?/, ''));
const start = log.findIndex((l) => l.startsWith('# Another Angle eval'));
if (start < 0) { console.error('No "# Another Angle eval" report in that log.'); process.exit(1); }
const endAt = log.findIndex((l, i) => i > start && l.startsWith('===== ') && l.includes('(scenes)'));
const md = log.slice(start, endAt < 0 ? undefined : endAt);
const header = md.find((l) => l.startsWith('Model `')) || '';
const prompt = /prompt (angle-v\d+)/.exec(header)?.[1] || null;
const model = /^Model `([^`]+)`/.exec(header)?.[1] || null;
const judgeModel = /judge `([^`]+)`/.exec(header)?.[1] || null;

/** @type {Map<string, { id: string, rounds: any[] }>} */
const cases = new Map();
/** @type {any[]} rejected drafts as listed: { id, round, attempt, lines, failures } */
const drafts = [];
/** @type {any} */ let cur = null;
/** @type {any} */ let round = null;
/** @type {any} */ let draft = null;
/** @type {string | null} */ let section = null;
for (const line of md) {
  if (line.startsWith('## ')) { section = line.slice(3).trim(); continue; }
  if (section === 'Gate rejections') {
    let m = /^- \*\*([\w-]+)\*\*(?: \(another angle(?: (\d+))?\))?, attempt (\d+): “(.*)” \/ “(.*)”$/.exec(line);
    if (m) {
      const again = line.includes('(another angle') ? Number(m[2] || 1) : 0;
      draft = { id: m[1], round: again, attempt: Number(m[3]), lines: [m[4], m[5]], failures: [] };
      drafts.push(draft);
      continue;
    }
    m = /^ {2}- `([a-z_]+)`(?: on ([a-z_0-9]+))?(?:: “(.*)”)?$/.exec(line);
    if (m && draft) { draft.failures.push({ code: m[1], field: m[2] || '', text: m[3] ?? null }); continue; }
    if (/^- \*\*[\w-]+\*\*.*\(no lines\)$/.test(line)) { draft = null; continue; }
    if (line.trim() && !line.startsWith('None:')) throw new Error(`unparsed rejection line: ${line}`);
    continue;
  }
  if (section !== 'Cases') continue;
  let m = /^### ([\w-]+) — /.exec(line);
  if (m) { cur = { id: m[1], rounds: [] }; cases.set(cur.id, cur); round = null; continue; }
  if (!cur) continue;
  m = /^(?:\*\*Another angle(?: \d+)?\*\* — )?status \*\*(\w+)\*\*(?: \((\w+)\))?; gate (\w+)(?: \[([^\]]*)\])?; attempts (\d+); ([\d.]+) s/.exec(line);
  if (m) {
    round = { status: m[1], fallback: m[2] ? { reason: m[2] } : null, scene: null, meta: { gate: m[3], gate_codes: m[4] ? m[4].split(', ') : [], attempts: Number(m[5]), drafts: [] }, ms: Math.round(Number(m[6]) * 1000) };
    cur.rounds.push(round);
    continue;
  }
  if (!round) continue;
  m = /^- (\w+) · (\w+) → (\w+) · (\w+) · (\w+)$/.exec(line);
  if (m) { round.scene = { mallow_character: m[1], reasoning_pattern: m[2], interaction_type: m[3], emotion: m[4], situation_type: m[5], safety_status: 'ok' }; continue; }
  m = /^- \*\*“(.*)”\*\* \/ \*\*“(.*)”\*\*(?: \(\d+ words\))?$/.exec(line);
  if (m) { Object.assign(round.scene, { subtitle_line_1: m[1], subtitle_line_2: m[2] }); continue; }
  m = /^- Know: (.*) · Assume: (.*) · Other angle: (.*) · Step: (.*)$/.exec(line);
  if (m) { Object.assign(round.scene, { known_fact: m[1], possible_assumption: m[2] === '—' ? '' : m[2], alternative_angle: m[3], practical_next_step: m[4] }); continue; }
  m = /^- Judge: (.*) — \*\*(\w+)\*\*: (.*)$/.exec(line);
  if (m) {
    /** @type {Record<string, string | number>} */
    const judge = { verdict: m[2], notes: m[3] };
    for (const p of m[1].split(', ')) { const [k, v] = p.split(' '); judge[k] = Number(v); }
    round.judge = judge;
    continue;
  }
  m = /^- Support: (\w+) \/ (\w+) \((\w+)\)$/.exec(line);
  if (m) { round.support = { level: m[1], category: m[2], source: m[3] }; continue; }
}
for (const d of drafts) {
  const r = cases.get(d.id)?.rounds[d.round];
  if (!r) throw new Error(`draft for ${d.id} round ${d.round} has no case`);
  r.meta.drafts.push({ attempt: d.attempt, lines: d.lines, failures: d.failures });
}
const results = [...cases.values()];
let nScenes = 0; let nDrafts = 0;
for (const c of results) {
  for (const r of c.rounds) {
    if (r.scene) {
      nScenes++;
      for (const k of ['known_fact', 'subtitle_line_1']) if (!(k in r.scene)) throw new Error(`${c.id}: the scene has no ${k}`);
    }
    nDrafts += r.meta.drafts.length;
  }
}
const label = runArg > 0 ? process.argv[runArg + 1] : `the run in ${src.split('/').pop()}`;
writeFileSync(out, `${JSON.stringify({
  source: `Another Angle eval ${label}, extracted from the job log by eval/extract-log.mjs. Synthetic inputs only (eval/cases.js).`,
  prompt, model, judge: judgeModel, results,
}, null, 1)}\n`);
console.log(`${results.length} cases, ${nScenes} scenes, ${nDrafts} rejected drafts (prompt ${prompt}) → ${out}`);
