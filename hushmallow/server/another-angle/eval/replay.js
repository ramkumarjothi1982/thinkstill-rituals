// Re-runs the quality gate ALONE over the answers of a recorded eval run: every
// accepted scene, and every draft the gate rejected at the time. No model call,
// no cost. Used by eval/replay-gate.mjs (a readable report) and by
// test/gate-run1.test.js (regressions from the first real-model run).
//
// A run is the JSON that tools/angle-eval.mjs writes (results[].rounds[] with
// scene and meta.drafts), or eval/runs/run1-answers.json, which has the same
// shape and was extracted from the run-1 log.
//
// A rejected draft only records its two lines and the text of each field that
// failed, so it is rebuilt from those: the fields it never showed stay empty,
// and only failures on fields the draft really showed count ("lines" always
// does). The reasoning pattern is the draft's own when the report recorded
// it (reports after run 3); otherwise it, and the Mallow, come from the answer
// that round ended with. A round that ended in a fallback has no answer: for a
// follow-up the replay then assumes the draft used a pattern no earlier angle
// used, as the request asked (a repeated pattern would fail anyway, so this
// tests the rest of the novelty check; run 3, ho-cancelled).

import { qualityGate } from '../src/gate.js';
import { validateAngleRequest } from '../src/validate.js';
import { PATTERN_INTERACTION, PATTERNS } from '../src/vocab.js';

/**
 * @typedef {{ code: string, field: string, text?: string | null, message?: string }} Failure
 * @typedef {{ attempt: number, lines: [string, string] | null, pattern?: string, failures: Failure[] }} Draft
 * @typedef {{ status: string, scene: Record<string, string> | null, meta: { gate: string, drafts?: Draft[] } }} Round
 * @typedef {{ id: string, rounds: Round[] }} RunCase
 * @typedef {{ kind: 'accepted' | 'draft', id: string, round: number, attempt: number, lines: [string, string],
 *   before: string[], after: Failure[], words: number }} ReplayItem
 */

const EXPLORE = ['known_fact', 'possible_assumption', 'alternative_angle', 'practical_next_step'];
const LINE_FIELDS = new Set(['subtitle_line_1', 'subtitle_line_2', 'lines']);

/**
 * @param {{ results: RunCase[] }} run
 * @param {{ cases: { id: string, text: string, emotion?: string, intention?: string }[], gate?: typeof qualityGate }} opts
 * @returns {ReplayItem[]}
 */
export function replayRun(run, opts) {
  const gate = opts.gate || qualityGate;
  const byId = new Map(opts.cases.map((c) => [c.id, c]));
  /** @type {ReplayItem[]} */
  const out = [];
  for (const rc of run.results) {
    const c = byId.get(rc.id);
    if (!c) continue;
    const v = validateAngleRequest({ consent: true, text: c.text, emotion: c.emotion, intention: c.intention });
    const emotion = v.ok ? v.value.emotion : null;
    rc.rounds.forEach((r, i) => {
      // An "another angle" round was asked with every earlier answer as a previous angle.
      const previous = rc.rounds.slice(0, i).filter((x) => x.scene).map((x) => ({
        subtitle_line_1: /** @type {Record<string, string>} */ (x.scene).subtitle_line_1, subtitle_line_2: /** @type {Record<string, string>} */ (x.scene).subtitle_line_2,
        reasoning_pattern: /** @type {Record<string, string>} */ (x.scene).reasoning_pattern,
      }));
      const ctx = { text: c.text, previous, emotion };
      if (r.scene && r.status === 'ok') {
        const g = gate(/** @type {any} */ (r.scene), ctx);
        out.push({ kind: 'accepted', id: rc.id, round: i, attempt: 0, lines: [r.scene.subtitle_line_1, r.scene.subtitle_line_2], before: [], after: g.failures, words: g.stats.words });
      }
      for (const d of r.meta?.drafts || []) {
        if (!d.lines) continue; // schema failures have no lines to re-check
        const known = new Set(LINE_FIELDS);
        const pattern = d.pattern || r.scene?.reasoning_pattern || draftPattern(previous);
        /** @type {Record<string, string>} */
        const scene = {
          emotion: r.scene?.emotion || 'worry', situation_type: r.scene?.situation_type || 'other', reasoning_pattern: pattern,
          interaction_type: /** @type {Record<string, string>} */ (PATTERN_INTERACTION)[pattern], mallow_character: r.scene?.mallow_character || 'zuzu',
          safety_status: 'ok', subtitle_line_1: d.lines[0], subtitle_line_2: d.lines[1],
          ...Object.fromEntries(EXPLORE.map((f) => [f, ''])),
        };
        for (const f of d.failures) if (f.text && EXPLORE.includes(f.field)) { scene[f.field] = f.text; known.add(f.field); }
        const g = gate(/** @type {any} */ (scene), ctx);
        out.push({ kind: 'draft', id: rc.id, round: i, attempt: d.attempt, lines: d.lines, before: d.failures.map((f) => `${f.code}@${f.field}`), after: g.failures.filter((f) => known.has(f.field)), words: g.stats.words });
      }
    });
  }
  return out;
}

/**
 * The pattern assumed for a draft whose own was not recorded and whose round
 * has no answer: the first one no earlier angle used.
 * @param {{ reasoning_pattern?: string }[]} previous
 */
function draftPattern(previous) {
  const used = new Set(previous.map((p) => p.reasoning_pattern));
  return PATTERNS.find((p) => !used.has(p)) || 'fact_vs_assumption';
}

/** "code@field" labels for a list of failures. @param {Failure[]} fs */
export const labels = (fs) => fs.map((f) => `${f.code}@${f.field}`);
