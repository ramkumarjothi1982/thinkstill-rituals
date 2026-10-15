// The Another Angle pipeline, independent of HTTP, auth and quotas so the
// Worker, the Node tests and tools/angle-eval.mjs all run the same code.
//
//   0. no letters or digits (emoji only)  → "unclear" fallback, no model call
//   1. safety pre-check (shared lexicon)  crisis/care → support, no model call
//  1b. the lexicon on the normalised words and the shared risk screener: care → support, no model call;
//      'check' → the model is told the words may carry risk and to judge safety_status first; support kept close
//   2. model call (structured JSON)       refusal/timeout/error → fallback signal
//   3. strict schema validation           invalid → regenerate
//   4. model's safety_status honoured     care/crisis → support, no reframe
//   5. "unclear" situation                → fallback signal (client asks for more)
//   6. output safety post-check           unsafe → regenerate
//   7. deterministic quality gate         fail → ONE regeneration with reasons
//   8. still failing                      → fallback signal (authored engine)

import { checkSafety, screenInput, supportPayload, outputIsSafe } from './safety/index.js';
import { buildUserMessage, looksLikeInjection, PROMPT_VERSION } from './prompt.js';
import { SCENE_SCHEMA, validateScene, normaliseScene } from './schema.js';
import { qualityGate, VISIBLE_FIELDS } from './gate.js';
import { SCHEMA_VERSION, PATTERN_TO_AUTHORED } from './vocab.js';

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
 *   fallback: { reason: FallbackReason, hint: { reasoning_pattern: string, interaction_type: string, mallow_character: string, authored_pattern: string | null } | null } | null,
 *   keep_support_close: boolean,
 *   meta: {
 *     attempts: number, gate: 'pass' | 'regen_pass' | 'fail' | 'skipped', gate_codes: string[], safety_level: string,
 *     safety_category: string | null, safety_source: 'lexicon' | 'model' | 'screen' | null, screen_level: string, injection: boolean, normalised: string[],
 *     provider_error: string | null, refusal_category: string | null, model: string | null, fallback_model: string | null,
 *     usage: UsagePart[], model_ms: number, lexicon_level: string, drafts?: Draft[],
 *   }
 * }} AngleResult
 * @typedef {{ attempt: number, lines: [string, string] | null, pattern?: string, failures: { code: string, field: string, text: string | null, message?: string }[] }} Draft
 *   A rejected attempt (only with deps.recordDrafts, for tools/angle-eval.mjs;
 *   never logged or returned by the Worker). A draft that passed the schema
 *   keeps its reasoning_pattern, and each gate failure the instruction the
 *   regeneration was given, so a replay need not guess either.
 */

/** True when the text has something to work with (not only emoji or punctuation). @param {string} text */
export const hasWords = (text) => /[\p{L}\p{N}]/u.test(text);

/**
 * @param {AngleInput} input
 * @param {{ provider: Provider, systemPrompt: string, maxTokens: number, attemptTimeoutMs: number,
 *   deadlineMs: number, minRetryBudgetMs?: number, userTag?: string, now?: () => number,
 *   skipLexicon?: boolean, recordDrafts?: boolean, usage?: UsagePart[], promptVersion?: string }} deps
 *   usage, when given, is the array model usage is pushed into as each call
 *   returns (so the caller can settle spend even if a later step throws).
 *   promptVersion names the prompt file systemPrompt came from (default the
 *   server's PROMPT_VERSION), so the request wording matches it.
 *   skipLexicon and recordDrafts are for the eval only: skipLexicon sends
 *   lexicon-flagged text to the model anyway (to measure the model's own
 *   safety judgement); recordDrafts keeps rejected drafts in meta.drafts.
 * @returns {Promise<AngleResult>}
 */
export async function runAngle(input, deps) {
  const now = deps.now || Date.now;
  const started = now();
  /** @type {AngleResult['meta']} */
  const meta = {
    attempts: 0, gate: 'skipped', gate_codes: [], safety_level: 'none', safety_category: null, safety_source: null, screen_level: 'none',
    injection: false, normalised: [], provider_error: null, refusal_category: null, model: null, fallback_model: null,
    usage: deps.usage || [], model_ms: 0, lexicon_level: 'none',
  };
  /** @type {Draft[] | null} */
  const drafts = deps.recordDrafts ? [] : null;
  if (drafts) meta.drafts = drafts;
  const done = (/** @type {Partial<AngleResult>} */ r) => ({
    status: 'fallback', scene: null, support: null, fallback: null, keep_support_close: false, ...r, meta,
  });

  // 0. Only emoji or punctuation: nothing to look at from another angle.
  if (!hasWords(input.text)) return /** @type {AngleResult} */ (done({ fallback: { reason: 'unclear', hint: null } }));

  // 1. Safety pre-check: no model call for crisis or care.
  const safety = checkSafety(input.text);
  meta.safety_level = safety.level;
  meta.safety_category = safety.category;
  meta.lexicon_level = safety.level;
  if ((safety.level === 'crisis' || safety.level === 'care') && !deps.skipLexicon) {
    meta.safety_source = 'lexicon';
    return /** @type {AngleResult} */ (done({ status: safety.level, support: supportPayload(safety.level, safety.category, 'lexicon'), keep_support_close: true }));
  }
  // 1b. The same words in their normalised spelling, and the shared risk screener (src/safety/risk-screen.js): a client that
  // skips its own check-in still meets them here. Care: no model call. 'check': the model is asked, told to judge safety first.
  const screened = screenInput(input.text);
  meta.screen_level = screened.screen_level;
  if ((screened.level === 'crisis' || screened.level === 'care') && !deps.skipLexicon) {
    meta.safety_source = screened.source;
    meta.safety_level = screened.level;
    meta.safety_category = screened.category;
    return /** @type {AngleResult} */ (done({ status: screened.level, support: supportPayload(screened.level, screened.category, screened.source || 'lexicon'), keep_support_close: true }));
  }
  // 1c. Earlier angles come back from the device, and the model reads them: a client could hide risk words there. The
  // server's own lines never read as crisis or care (outputIsSafe below; 0 of the 255 real ones in eval/runs), so any
  // that do were not written here: support, no model call.
  for (const p of input.previous) {
    if (deps.skipLexicon) break;
    const prev = [p.subtitle_line_1, p.subtitle_line_2].map((l) => screenInput(l)).find((r) => r.level === 'crisis' || r.level === 'care');
    if (!prev) continue;
    meta.safety_source = prev.source;
    meta.safety_level = prev.level;
    meta.safety_category = prev.category;
    const level = /** @type {'crisis' | 'care'} */ (prev.level);
    return /** @type {AngleResult} */ (done({ status: level, support: supportPayload(level, prev.category, prev.source || 'lexicon'), keep_support_close: true }));
  }
  const riskCheck = screened.check;
  const concern = safety.level === 'concern' || screened.level === 'concern' || riskCheck;
  // Earlier angles come back from the device too, so they are checked as well.
  meta.injection = looksLikeInjection(input.text)
    || input.previous.some((p) => looksLikeInjection(p.subtitle_line_1) || looksLikeInjection(p.subtitle_line_2));

  /** @type {{ lines: [string, string] | null, reasons: string[] } | null} */
  let rejected = null;
  /** @type {Scene[]} every valid draft, newest last (for the fallback hint) */
  const valid = [];
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
        user: buildUserMessage({ ...input, concern: safety.level === 'concern' || screened.level === 'concern', riskCheck, injectionSuspect: meta.injection, rejected, promptVersion: deps.promptVersion }),
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
      return /** @type {AngleResult} */ (done({ fallback: { reason, hint: hintFrom(valid, input.previous) }, keep_support_close: concern }));
    }
    meta.model = res.model;
    meta.fallback_model = res.fallbackModel;

    // 3. Strict schema.
    const parsed = validateScene(res.json);
    if (!parsed.ok) {
      meta.gate_codes.push('schema');
      rejected = { lines: null, reasons: parsed.errors.slice(0, 6) };
      drafts?.push({ attempt, lines: null, failures: parsed.errors.slice(0, 6).map((e) => ({ code: 'schema', field: '', text: e })) });
      continue;
    }
    const { scene, changed } = normaliseScene(parsed.scene);
    meta.normalised = changed;

    // 4. The model's own safety judgement is honoured.
    if (scene.safety_status === 'crisis' || scene.safety_status === 'care') {
      meta.safety_source = 'model';
      meta.safety_category = null;
      meta.safety_level = scene.safety_status;
      return /** @type {AngleResult} */ (done({ status: scene.safety_status, support: supportPayload(scene.safety_status, null, 'model'), keep_support_close: true }));
    }
    // 5. Nothing to work with.
    if (scene.situation_type === 'unclear') {
      return /** @type {AngleResult} */ (done({ fallback: { reason: 'unclear', hint: null }, keep_support_close: concern }));
    }
    valid.push(scene);
    // 6. Output post-check.
    if (!outputIsSafe(scene, VISIBLE_FIELDS)) {
      meta.gate_codes.push('unsafe_output');
      rejected = { lines: [scene.subtitle_line_1, scene.subtitle_line_2], reasons: ['The draft used harm or crisis language; write a calm, safe angle instead.'] };
      drafts?.push({ attempt, lines: rejected.lines, pattern: scene.reasoning_pattern, failures: [{ code: 'unsafe_output', field: '', text: null }] });
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
    drafts?.push({
      attempt, lines: rejected.lines, pattern: scene.reasoning_pattern,
      failures: gate.failures.map((f) => ({ code: f.code, field: f.field, text: f.field in scene ? /** @type {Record<string, string>} */ (scene)[f.field] : null, message: f.message })),
    });
  }

  // 8. Two attempts and still not good enough: let the client use its
  // authored engine rather than show something weak.
  meta.gate = 'fail';
  meta.gate_codes = [...new Set(meta.gate_codes)];
  return /** @type {AngleResult} */ (done({ fallback: { reason: 'quality', hint: hintFrom(valid, input.previous) }, keep_support_close: concern }));
}

/**
 * The pattern the client's authored engine should try. A draft that failed
 * for repeating an earlier angle carries a pattern the person has already
 * played, which the client then skips; so the newest draft whose pattern no
 * earlier angle used is the hint, and none at all if every draft repeated one
 * (the client then chooses from the text itself).
 * @param {Scene[]} valid @param {PreviousAngle[]} previous
 */
function hintFrom(valid, previous) {
  const used = new Set(previous.map((p) => p.reasoning_pattern).filter(Boolean));
  for (let i = valid.length - 1; i >= 0; i--) if (!used.has(valid[i].reasoning_pattern)) return hintOf(valid[i]);
  return null;
}

/** @param {Scene} s */
function hintOf(s) {
  return {
    reasoning_pattern: s.reasoning_pattern, interaction_type: s.interaction_type, mallow_character: s.mallow_character,
    authored_pattern: /** @type {Record<string, string | null>} */ (PATTERN_TO_AUTHORED)[s.reasoning_pattern] ?? null,
  };
}

export { PROMPT_VERSION, SCHEMA_VERSION };
