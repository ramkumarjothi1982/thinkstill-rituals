#!/usr/bin/env node
// Another Angle evaluation: runs the server pipeline (safety pre-check →
// Claude → schema → quality gate → one regeneration) on the realistic inputs
// in server/another-angle/eval/cases.js, grades every answer with the
// deterministic gate and an LLM judge (relevance, accuracy, concision,
// actionability, respect, safety, novelty for "another angle"), and writes a
// report to server/another-angle/eval/reports/.
//
// It calls the real API and costs money, so it prints an estimate and stops
// unless you pass --yes.
//
//   cd hushmallow/server/another-angle && npm install
//   ANTHROPIC_API_KEY=sk-ant-... node ../../tools/angle-eval.mjs          # estimate only
//   ANTHROPIC_API_KEY=sk-ant-... node ../../tools/angle-eval.mjs --yes    # run it
//   node ../../tools/angle-eval.mjs --mock                                 # free dry run (mock provider, no judge)
//
// Options: --yes  --mock  --no-judge  --only id1,id2  --concurrency 2
//          --model claude-opus-5-5  --effort low  --judge-model claude-opus-5-5  --out <dir>
//          --attempt-timeout <ms>  --deadline <ms>   (default: the Worker's production
//                                                     MODEL_TIMEOUT_MS / REQUEST_DEADLINE_MS)
//
// The three safety probes skip the word-list pre-check so the model's own
// safety judgement is measured (the report shows both). The report also lists
// every draft the quality gate rejected, with the reasons, so false
// rejections are visible; drafts are kept only in this local report.

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SERVER = new URL('../server/another-angle/', import.meta.url);
const load = (p) => import(new URL(p, SERVER).href);

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, dflt) => { const i = argv.indexOf(`--${name}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt; };

const MOCK = flag('mock');
const YES = flag('yes');
const JUDGE = !flag('no-judge') && !MOCK;
const MODEL = opt('model', process.env.MODEL || 'claude-opus-5-5');
const EFFORT = opt('effort', process.env.EFFORT || 'low');
const JUDGE_MODEL = opt('judge-model', MODEL);
const CONCURRENCY = Math.max(1, Math.min(4, Number(opt('concurrency', '2')) || 2));
const ONLY = opt('only', '').split(',').filter(Boolean);
const OUT = opt('out', fileURLToPath(new URL('eval/reports/', SERVER)));
const MAX_TOKENS = 3000;

let deps;
try {
  deps = {
    ...(await load('src/pipeline.js')),
    ...(await load('src/safety/index.js')),
    ...(await load('src/cost.js')),
    ...(await load('src/providers/mock.js')),
    ...(await load('src/prompt.js')),
    ...(await load('src/validate.js')),
    ...(await load('src/config.js')),
    CASES: (await load('eval/cases.js')).CASES,
    anthropic: MOCK ? null : await load('src/providers/anthropic.js'),
  };
} catch (e) {
  console.error('Could not load the server code. Run `npm install` in hushmallow/server/another-angle first.');
  console.error(String(e?.message || e));
  process.exit(1);
}
const { runAngle, checkSafety, costMicros, roughTokens, rateFor, createMockProvider, escapeData, validateAngleRequest, readConfig, CASES } = deps;

// Production settings (wrangler.toml defaults), so latency and timeouts in the
// report are what people would get.
const PROD = readConfig({});
const ATTEMPT_TIMEOUT = Number(opt('attempt-timeout', String(PROD.attemptTimeoutMs))) || PROD.attemptTimeoutMs;
const DEADLINE = Number(opt('deadline', String(PROD.deadlineMs))) || PROD.deadlineMs;
const isProbe = (c) => c.category === 'safety';

const SYSTEM_PROMPT = readFileSync(new URL('prompts/angle-v1.md', SERVER), 'utf8');
const JUDGE_PROMPT = readFileSync(new URL('eval/judge-v1.md', SERVER), 'utf8');
const cases = CASES.filter((c) => !ONLY.length || ONLY.includes(c.id));

// --- cost estimate ----------------------------------------------------------

function estimate() {
  // Safety probes skip the lexicon, so they reach the model too.
  const modelCases = cases.filter((c) => isProbe(c) || !['crisis', 'care'].includes(checkSafety(c.text).level));
  const followUps = modelCases.filter((c) => c.followUp).length;
  const angleCalls = modelCases.length + followUps;
  const sys = roughTokens(SYSTEM_PROMPT);
  const r = rateFor(MODEL);
  const j = rateFor(JUDGE_MODEL);
  // Typical: one attempt, the system prompt read from cache after the first
  // call, ~900 output tokens (thinking at low effort + ~250 tokens of JSON);
  // 15% of answers regenerated once.
  const typicalAngle = angleCalls * 1.15 * (sys * r.cacheRead + 350 * r.input + 900 * r.output) + sys * r.cacheWrite;
  const judgeSys = roughTokens(JUDGE_PROMPT);
  const typicalJudge = JUDGE ? angleCalls * (judgeSys * j.cacheRead + 600 * j.input + 700 * j.output) + judgeSys * j.cacheWrite : 0;
  // Worst case: every answer regenerated, every call uses all of max_tokens,
  // nothing cached.
  const worstAngle = angleCalls * 2 * ((sys + 400) * r.cacheWrite + MAX_TOKENS * r.output);
  const worstJudge = JUDGE ? angleCalls * ((judgeSys + 800) * j.cacheWrite + 2000 * j.output) : 0;
  return { cases: cases.length, modelCases: modelCases.length, followUps, angleCalls, typical: (typicalAngle + typicalJudge) / 1e6, worst: (worstAngle + worstJudge) / 1e6 };
}

const est = estimate();
console.log(`Another Angle eval — ${est.cases} cases (${est.modelCases} reach the model, ${est.followUps} with "another angle"), model ${MODEL} (effort ${EFFORT}), judge ${JUDGE ? JUDGE_MODEL : 'off'}, timeouts ${ATTEMPT_TIMEOUT / 1000} s per attempt / ${DEADLINE / 1000} s per answer`);
if (!MOCK) {
  console.log(`Estimated cost: about $${est.typical.toFixed(2)} (worst case $${est.worst.toFixed(2)}).`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('\nSet ANTHROPIC_API_KEY to run it. Nothing was sent.');
    process.exit(0);
  }
  if (!YES) {
    console.log('\nNothing was sent. Re-run with --yes to accept the cost and run the eval (or --mock for a free dry run).');
    process.exit(0);
  }
}

// --- providers --------------------------------------------------------------

const provider = MOCK
  ? createMockProvider({ mode: 'heuristic', model: MODEL })
  : deps.anthropic.createAnthropicProvider({ apiKey: process.env.ANTHROPIC_API_KEY, model: MODEL, effort: EFFORT, maxRetries: PROD.maxRetries, fallbacks: PROD.refusalFallback });
const judgeProvider = JUDGE
  ? deps.anthropic.createAnthropicProvider({ apiKey: process.env.ANTHROPIC_API_KEY, model: JUDGE_MODEL, effort: 'medium', maxRetries: 2, fallbacks: true })
  : null;

const score = { type: 'integer', enum: [0, 1, 2, 3, 4, 5] };
const JUDGE_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['relevance', 'accuracy', 'concision', 'actionability', 'respect', 'safety', 'novelty', 'overall', 'verdict', 'notes'],
  properties: {
    relevance: score, accuracy: score, concision: score, actionability: score, respect: score, safety: score,
    novelty: { ...score, description: '0 unless this was an "another angle" request.' },
    overall: score,
    verdict: { type: 'string', enum: ['strong', 'acceptable', 'weak'] },
    notes: { type: 'string', description: 'At most 40 words.' },
  },
};

async function judge(c, scene, previous) {
  const user = [
    '<case>',
    `<category>${escapeData(c.category)}</category>`,
    `<chosen_feeling>${escapeData(c.emotion || 'not chosen')}</chosen_feeling>`,
    '<person_text>', escapeData(c.text), '</person_text>',
    previous ? `<previous_angle>${escapeData(previous.subtitle_line_1)} / ${escapeData(previous.subtitle_line_2)}</previous_angle>` : '<previous_angle>none (first answer)</previous_angle>',
    '<answer>', escapeData(JSON.stringify(scene)), '</answer>',
    '</case>',
    'Grade the answer.',
  ].join('\n');
  const r = await judgeProvider.generate({ system: JUDGE_PROMPT, user, schema: JUDGE_SCHEMA, maxTokens: 2000, timeoutMs: 60000 });
  return r.ok ? { scores: r.json, usage: r.usage } : { scores: null, error: r.reason, usage: r.usage };
}

// --- run --------------------------------------------------------------------

async function runCase(c) {
  const v = validateAngleRequest({ consent: true, text: c.text, emotion: c.emotion, intention: c.intention });
  if (!v.ok) return { case: c, error: `invalid case: ${v.code}` };
  const deps1 = {
    provider, systemPrompt: SYSTEM_PROMPT, maxTokens: MAX_TOKENS, attemptTimeoutMs: ATTEMPT_TIMEOUT, deadlineMs: DEADLINE,
    recordDrafts: true, skipLexicon: isProbe(c),
  };
  const t0 = Date.now();
  const first = await runAngle(v.value, deps1);
  const rounds = [{ result: first, ms: Date.now() - t0 }];
  if (c.followUp && first.status === 'ok' && first.scene) {
    const prev = { subtitle_line_1: first.scene.subtitle_line_1, subtitle_line_2: first.scene.subtitle_line_2, reasoning_pattern: first.scene.reasoning_pattern };
    const t1 = Date.now();
    const again = await runAngle({ ...v.value, previous: [prev] }, deps1);
    rounds.push({ result: again, ms: Date.now() - t1, previous: prev });
  }
  for (const r of rounds) {
    if (judgeProvider && r.result.status === 'ok' && r.result.scene) {
      const j = await judge(c, r.result.scene, r.previous);
      r.judge = j.scores;
      r.judgeError = j.error;
      r.judgeUsage = j.usage;
    }
  }
  const expected = Array.isArray(c.expect) ? c.expect : [c.expect];
  const json = JSON.stringify(rounds.map((r) => r.result));
  const leaked = (c.mustNot || []).filter((s) => json.toLowerCase().includes(s.toLowerCase()));
  return { case: c, rounds, statusOk: expected.includes(first.status), leaked, lexicon: checkSafety(c.text).level };
}

async function pool(items, n, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
      process.stdout.write(`  ${String(i + 1).padStart(2)}/${items.length} ${items[i].id}: ${out[i].rounds?.[0]?.result.status ?? out[i].error}\n`);
    }
  }));
  return out;
}

const started = new Date();
const results = await pool(cases, CONCURRENCY, runCase);

// --- report -----------------------------------------------------------------

const dims = ['relevance', 'accuracy', 'concision', 'actionability', 'respect', 'safety', 'overall'];
const allRounds = results.flatMap((r) => (r.rounds || []).map((x) => ({ ...x, case: r.case })));
const judged = allRounds.filter((r) => r.judge);
const avg = (k, list = judged) => (list.length ? list.reduce((a, r) => a + r.judge[k], 0) / list.length : NaN);
const usage = allRounds.flatMap((r) => [...r.result.meta.usage, ...(r.judgeUsage || [])]);
const cost = MOCK ? 0 : costMicros(usage) / 1e6; // the mock reports placeholder usage
const lat = allRounds.filter((r) => r.result.meta.attempts > 0).map((r) => r.ms).sort((a, b) => a - b);
const pct = (p) => (lat.length ? lat[Math.min(lat.length - 1, Math.floor(p * lat.length))] : 0);
const count = (f) => allRounds.filter(f).length;
const weak = judged.filter((r) => r.judge.verdict === 'weak' || r.judge.overall <= 2);
const followUps = judged.filter((r) => r.previous);

const lines = [];
lines.push(`# Another Angle eval — ${started.toISOString().slice(0, 16).replace('T', ' ')} UTC`, '');
lines.push(`Model \`${MODEL}\` (effort ${EFFORT})${MOCK ? ' — MOCK PROVIDER (dry run: placeholder lines, not real quality)' : ''}; judge ${JUDGE ? `\`${JUDGE_MODEL}\` (judge-v1)` : 'off'}; prompt angle-v1.`, '');
lines.push('## Summary', '');
lines.push('| Measure | Result |', '|---|---|');
lines.push(`| Cases | ${results.length} (${allRounds.length} answers incl. "another angle") |`);
lines.push(`| Expected status (ok / support / fallback) | ${results.filter((r) => r.statusOk).length}/${results.length} |`);
lines.push(`| Gate: passed first time | ${count((r) => r.result.meta.gate === 'pass')} |`);
lines.push(`| Gate: passed after one regeneration | ${count((r) => r.result.meta.gate === 'regen_pass')} |`);
lines.push(`| Gate: fallback to authored engine | ${count((r) => r.result.meta.gate === 'fail')} |`);
lines.push(`| Support instead of a reframe | ${count((r) => ['crisis', 'care'].includes(r.result.status))} (lexicon ${count((r) => r.result.meta.safety_source === 'lexicon')}, model ${count((r) => r.result.meta.safety_source === 'model')}) |`);
const probes = results.filter((r) => isProbe(r.case));
if (probes.length) lines.push(`| Safety probes flagged by the model alone (word list skipped) | ${probes.filter((r) => ['crisis', 'care'].includes(r.rounds?.[0]?.result.status)).length}/${probes.length} |`);
lines.push(`| Injection leaks | ${results.reduce((a, r) => a + (r.leaked?.length || 0), 0)} |`);
if (judged.length) {
  for (const d of dims) lines.push(`| Judge ${d} (1–5) | ${avg(d).toFixed(2)} |`);
  if (followUps.length) lines.push(`| Judge novelty on "another angle" (1–5) | ${avg('novelty', followUps).toFixed(2)} |`);
  lines.push(`| Verdicts | strong ${judged.filter((r) => r.judge.verdict === 'strong').length}, acceptable ${judged.filter((r) => r.judge.verdict === 'acceptable').length}, weak ${judged.filter((r) => r.judge.verdict === 'weak').length} |`);
}
lines.push(`| Latency p50 / p95 | ${(pct(0.5) / 1000).toFixed(1)} s / ${(pct(0.95) / 1000).toFixed(1)} s |`);
lines.push(`| Answers over ${ATTEMPT_TIMEOUT / 1000} s / over ${DEADLINE / 1000} s / timed out | ${lat.filter((ms) => ms > ATTEMPT_TIMEOUT).length} / ${lat.filter((ms) => ms > DEADLINE).length} / ${count((r) => r.result.fallback?.reason === 'timeout')} |`);
lines.push(`| Cost | $${cost.toFixed(3)} |`, '');
const codeCounts = {};
for (const r of allRounds) for (const c of r.result.meta.gate_codes) codeCounts[c] = (codeCounts[c] || 0) + 1;
if (Object.keys(codeCounts).length) lines.push(`Gate failure codes seen (before regeneration): ${Object.entries(codeCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ×${v}`).join(', ')}.`, '');
// Every draft the gate rejected, with its reasons: read these for false
// rejections (a good line refused) as well as real ones.
const rejections = allRounds.flatMap((r) => (r.result.meta.drafts || []).map((d) => ({ ...d, case: r.case, again: Boolean(r.previous) })));
lines.push('## Gate rejections', '');
if (!rejections.length) lines.push('None: every answer passed the gate first time.', '');
for (const d of rejections) {
  lines.push(`- **${d.case.id}**${d.again ? ' (another angle)' : ''}, attempt ${d.attempt}: ${d.lines ? `“${d.lines[0]}” / “${d.lines[1]}”` : '(no lines)'}`);
  for (const f of d.failures) lines.push(`  - \`${f.code}\`${f.field ? ` on ${f.field}` : ''}${f.text ? `: “${f.text}”` : ''}`);
}
if (rejections.length) lines.push('');
if (weak.length) {
  lines.push('## Fix before expanding', '');
  for (const r of weak) lines.push(`- **${r.case.id}** (${r.case.category}): ${r.judge.notes}`);
  lines.push('');
}
lines.push('## Cases', '');
for (const r of results) {
  const c = r.case;
  lines.push(`### ${c.id} — ${c.category}${r.statusOk ? '' : ' ⚠ unexpected status'}${r.leaked?.length ? ` ⚠ leaked: ${r.leaked.join(', ')}` : ''}`, '');
  lines.push(`> ${c.text}`, '');
  if (isProbe(c)) lines.push(`Word list: **${r.lexicon}** (skipped for this probe, so the model decided).`, '');
  if (r.error) { lines.push(`Error: ${r.error}`, ''); continue; }
  r.rounds.forEach((x, i) => {
    const res = x.result;
    const m = res.meta;
    lines.push(`${i ? '**Another angle** — ' : ''}status **${res.status}**${res.fallback ? ` (${res.fallback.reason})` : ''}; gate ${m.gate}${m.gate_codes.length ? ` [${m.gate_codes.join(', ')}]` : ''}; attempts ${m.attempts}; ${(x.ms / 1000).toFixed(1)} s${m.fallback_model ? `; served by ${m.fallback_model}` : ''}`, '');
    if (res.scene) {
      const s = res.scene;
      lines.push(`- ${s.mallow_character} · ${s.reasoning_pattern} → ${s.interaction_type} · ${s.emotion} · ${s.situation_type}`);
      lines.push(`- **“${s.subtitle_line_1}”** / **“${s.subtitle_line_2}”**`);
      lines.push(`- Know: ${s.known_fact} · Assume: ${s.possible_assumption || '—'} · Other angle: ${s.alternative_angle} · Step: ${s.practical_next_step}`);
    }
    if (res.support) lines.push(`- Support: ${res.support.level} / ${res.support.category} (${res.support.source})`);
    if (x.judge) lines.push(`- Judge: ${dims.map((d) => `${d} ${x.judge[d]}`).join(', ')}${x.previous ? `, novelty ${x.judge.novelty}` : ''} — **${x.judge.verdict}**: ${x.judge.notes}`);
    if (x.judgeError) lines.push(`- Judge error: ${x.judgeError}`);
    lines.push('');
  });
}

mkdirSync(OUT, { recursive: true });
const stamp = started.toISOString().replace(/[:T]/g, '-').slice(0, 16);
const base = `${OUT.replace(/\/$/, '')}/angle-eval-${stamp}${MOCK ? '-mock' : ''}`;
writeFileSync(`${base}.md`, `${lines.join('\n')}\n`);
writeFileSync(`${base}.json`, JSON.stringify({ started, model: MODEL, effort: EFFORT, judge: JUDGE ? JUDGE_MODEL : null, mock: MOCK, cost, results: results.map((r) => ({ id: r.case.id, statusOk: r.statusOk, leaked: r.leaked, rounds: (r.rounds || []).map((x) => ({ status: x.result.status, scene: x.result.scene, fallback: x.result.fallback, support: x.result.support && { level: x.result.support.level, category: x.result.support.category, source: x.result.support.source }, meta: { ...x.result.meta, usage: undefined }, ms: x.ms, judge: x.judge })) })), timeouts: { attemptMs: ATTEMPT_TIMEOUT, deadlineMs: DEADLINE } }, null, 2));
console.log(`\nReport: ${base}.md`);
console.log(`Expected status ${results.filter((r) => r.statusOk).length}/${results.length}; cost $${cost.toFixed(3)}.`);
