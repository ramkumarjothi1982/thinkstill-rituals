// The Another Angle pipeline, independent of HTTP, auth and quotas so the
// Worker, the Node tests and tools/angle-eval.mjs all run the same code.
//
//   1. safety pre-check (shared lexicon)  crisis/care → support, no model call
//   2. model call (structured JSON)       refusal/timeout/error → fallback signal
//   3. strict schema validation           invalid → regenerate
//   4. model's safety_status honoured     care/crisis → support, no reframe
//   5. "unclear" situation                → fallback signal (client asks for more)
//   6. output safety post-check           unsafe → regenerate
//   7. deterministic quality gate         fail → ONE regeneration with reasons
//   8. still failing                      → fallback signal (authored engine)

import { checkSafety, supportPayload, outputIsSafe } from './safety/index.js';
import { buildUserMessage, looksLikeInjection, PROMPT_VERSION } from './prompt.js';
import { SCENE_SCHEMA, validateScene, normaliseScene } from './schema.js';
import { qualityGate, VISIBLE_FIELDS } from './gate.js';
import { SCHEMA_VERSION } from './vocab.js';

/**
 * @typedef {import('./prompt.js').PreviousAngle} PreviousAngle
 * @typedef {import('./schema.js').Scene} Scene
 * @typedef {import('./safety/index.js').Support} Support
 * @typedef {import('./cost.js').UsagePart} UsagePart
 * @typedef {import('./providers/anthropic.js').Provider} Provider
 * @typedef {{ text: string, emotion: string | null, intention: any, previous: PreviousAngle[] }} AngleInput
 * @typedef {'quality' | 'unclear' | 'refusal' | 'timeout' | 'provider' | 'capacity'} FallbackReason
 * @typedef {{
 *   status: 'ok' | 'care' | 'crisis' | 'fallback',
 *   scene: Scene | null, support: Support | null,
 *   fallback: { reason: FallbackReason, hint: { reasoning_pattern: string, interaction_type: string, mallow_character: string } | null } | null,
 *   keep_support_close: boolean,
 *   meta: {
 *     attempts: number, gate: 'pass' | 'regen_pass' | 'fail' | 'skipped', gate_codes: string[], safety_level: string,
 *     safety_category: string | null, safety_source: 'lexicon' | 'model' | null, injection: boolean, normalised: string[],
 *     provider_error: string | null, refusal_category: string | null, model: string | null, fallback_model: string | null,
 *     usage: UsagePart[], model_ms: number,
 *   }
 * }} AngleResult
 */

/**
 * @param {AngleInput} input
 * @param {{ provider: Provider, systemPrompt: string, maxTokens: number, attemptTimeoutMs: number,
 *   deadlineMs: number, minRetryBudgetMs?: number, userTag?: string, now?: () => number }} deps
 * @returns {Promise<AngleResult>}
 */
export async function runAngle(input, deps) {
  const now = deps.now || Date.now;
  const started = now();
  /** @type {AngleResult['meta']} */
  const meta = {
    attempts: 0, gate: 'skipped', gate_codes: [], safety_level: 'none', safety_category: null, safety_source: null,
    injection: false, normalised: [], provider_error: null, refusal_category: null, model: null, fallback_model: null,
    usage: [], model_ms: 0,
  };
  const done = (/** @type {Partial<AngleResult>} */ r) => ({
    status: 'fallback', scene: null, support: null, fallback: null, keep_support_close: false, ...r, meta,
  });

  // 1. Safety pre-check: no model call for crisis or care.
  const safety = checkSafety(input.text);
  meta.safety_level = safety.level;
  meta.safety_category = safety.category;
  if (safety.level === 'crisis' || safety.level === 'care') {
    meta.safety_source = 'lexicon';
    return /** @type {AngleResult} */ (done({ status: safety.level, support: supportPayload(safety.level, safety.category, 'lexicon'), keep_support_close: true }));
  }
  const concern = safety.level === 'concern';
  meta.injection = looksLikeInjection(input.text);

  /** @type {{ lines: [string, string] | null, reasons: string[] } | null} */
  let rejected = null;
  /** @type {Scene | null} */
  let lastValid = null;
  const minRetry = deps.minRetryBudgetMs ?? 6000;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const remaining = deps.deadlineMs - (now() - started);
    if (attempt === 2 && remaining < minRetry) break;
    const timeoutMs = Math.max(1000, Math.min(deps.attemptTimeoutMs, remaining));
    meta.attempts = attempt;
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs + 250);
    let res;
    try {
      res = await deps.provider.generate({
        system: deps.systemPrompt,
        user: buildUserMessage({ ...input, concern, injectionSuspect: meta.injection, rejected }),
        schema: SCENE_SCHEMA,
        maxTokens: deps.maxTokens,
        timeoutMs,
        signal: ac.signal,
        userTag: deps.userTag,
      });
    } finally {
      clearTimeout(timer);
    }
    meta.usage.push(...res.usage);
    meta.model_ms += res.ms;
    if (!res.ok) {
      meta.provider_error = res.reason;
      if (res.reason === 'refusal') {
        meta.refusal_category = res.category ?? null;
        return /** @type {AngleResult} */ (done({ fallback: { reason: 'refusal', hint: null }, keep_support_close: concern }));
      }
      // A truncated or unparseable reply is worth one more try; transport
      // errors were already retried inside the provider.
      if ((res.reason === 'max_tokens' || res.reason === 'invalid_json' || res.reason === 'empty') && attempt === 1) {
        rejected = { lines: null, reasons: ['The previous reply was not a complete JSON object. Reply with the JSON object only.'] };
        continue;
      }
      const reason = res.reason === 'timeout' ? 'timeout' : 'provider';
      return /** @type {AngleResult} */ (done({ fallback: { reason, hint: lastValid ? hintOf(lastValid) : null }, keep_support_close: concern }));
    }
    meta.model = res.model;
    meta.fallback_model = res.fallbackModel;

    // 3. Strict schema.
    const parsed = validateScene(res.json);
    if (!parsed.ok) {
      meta.gate_codes.push('schema');
      rejected = { lines: null, reasons: parsed.errors.slice(0, 6) };
      continue;
    }
    const { scene, changed } = normaliseScene(parsed.scene);
    meta.normalised = changed;

    // 4. The model's own safety judgement is honoured.
    if (scene.safety_status === 'crisis' || scene.safety_status === 'care') {
      meta.safety_source = 'model';
      meta.safety_level = scene.safety_status;
      return /** @type {AngleResult} */ (done({ status: scene.safety_status, support: supportPayload(scene.safety_status, null, 'model'), keep_support_close: true }));
    }
    // 5. Nothing to work with.
    if (scene.situation_type === 'unclear') {
      return /** @type {AngleResult} */ (done({ fallback: { reason: 'unclear', hint: null }, keep_support_close: concern }));
    }
    lastValid = scene;
    // 6. Output post-check.
    if (!outputIsSafe(scene, VISIBLE_FIELDS)) {
      meta.gate_codes.push('unsafe_output');
      rejected = { lines: [scene.subtitle_line_1, scene.subtitle_line_2], reasons: ['The draft used harm or crisis language; write a calm, safe angle instead.'] };
      continue;
    }
    // 7. Quality gate.
    const gate = qualityGate(scene, { text: input.text, previous: input.previous, emotion: input.emotion });
    if (gate.pass) {
      meta.gate = attempt === 1 ? 'pass' : 'regen_pass';
      return /** @type {AngleResult} */ (done({ status: 'ok', scene, keep_support_close: concern }));
    }
    meta.gate_codes.push(...gate.failures.map((f) => f.code));
    rejected = { lines: [scene.subtitle_line_1, scene.subtitle_line_2], reasons: gate.failures.map((f) => f.message) };
  }

  // 8. Two attempts and still not good enough: let the client use its
  // authored engine rather than show something weak.
  meta.gate = 'fail';
  meta.gate_codes = [...new Set(meta.gate_codes)];
  return /** @type {AngleResult} */ (done({ fallback: { reason: 'quality', hint: lastValid ? hintOf(lastValid) : null }, keep_support_close: concern }));
}

/** @param {Scene} s */
function hintOf(s) {
  return { reasoning_pattern: s.reasoning_pattern, interaction_type: s.interaction_type, mallow_character: s.mallow_character };
}

export { PROMPT_VERSION, SCHEMA_VERSION };
