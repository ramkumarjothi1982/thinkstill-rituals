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
// does). The reasoning pattern and Mallow come from the answer that round
// ended with (a draft that failed on repeats_previous would say so).

import { qualityGate } from '../src/gate.js';
import { validateAngleRequest } from '../src/validate.js';
import { PATTERN_INTERACTION } from '../src/vocab.js';

/**
 * @typedef {{ code: string, field: string, text?: string | null, message?: string }} Failure
 * @typedef {{ attempt: number, lines: [string, string] | null, failures: Failure[] }} Draft
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
    const first = rc.rounds[0]?.scene;
    rc.rounds.forEach((r, i) => {
      // "Another angle" rounds were asked with the first answer as the previous one.
      const previous = i > 0 && first ? [{ subtitle_line_1: first.subtitle_line_1, subtitle_line_2: first.subtitle_line_2, reasoning_pattern: first.reasoning_pattern }] : [];
      const ctx = { text: c.text, previous, emotion };
      if (r.scene && r.status === 'ok') {
        const g = gate(/** @type {any} */ (r.scene), ctx);
        out.push({ kind: 'accepted', id: rc.id, round: i, attempt: 0, lines: [r.scene.subtitle_line_1, r.scene.subtitle_line_2], before: [], after: g.failures, words: g.stats.words });
      }
      for (const d of r.meta?.drafts || []) {
        if (!d.lines) continue; // schema failures have no lines to re-check
        const known = new Set(LINE_FIELDS);
        const pattern = r.scene?.reasoning_pattern || 'fact_vs_assumption';
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

/** "code@field" labels for a list of failures. @param {Failure[]} fs */
export const labels = (fs) => fs.map((f) => `${f.code}@${f.field}`);
