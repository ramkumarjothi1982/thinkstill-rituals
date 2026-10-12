// Anthropic provider (Claude via @anthropic-ai/sdk).
//
// One call = one structured-output request:
//   * model from env MODEL (default claude-opus-5-5); thinking is always on
//     for this model, so the only depth control is output_config.effort
//     (env EFFORT, default "low" for latency). `thinking` is not sent.
//   * output_config.format = json_schema → the reply is schema-valid JSON
//     (types, enums, required fields); lengths are checked by the server.
//   * server-side refusal fallback: fallbacks:"default" with the beta header
//     server-side-fallback-2026-07-01, so a false-positive classifier decline
//     is retried on Anthropic's recommended model inside the same call.
//   * the system prompt is sent as a cached block (byte-stable file).
//   * per-request timeout and retries (the SDK retries 408/409/429/5xx and
//     connection errors with backoff); an AbortSignal enforces the overall
//     request deadline.
// The person's text never appears in logs: this module returns metadata only.

import Anthropic from '@anthropic-ai/sdk';

export const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

/**
 * @typedef {import('../cost.js').UsagePart} UsagePart
 * @typedef {{
 *   system: string, user: string, schema: Record<string, unknown>, maxTokens: number,
 *   timeoutMs: number, signal?: AbortSignal, userTag?: string,
 * }} GenerateArgs
 * @typedef {'refusal' | 'max_tokens' | 'invalid_json' | 'empty' | 'timeout' | 'rate_limited' | 'overloaded' | 'auth' | 'bad_request' | 'network' | 'config' | 'error'} FailReason
 * @typedef {{ ok: true, json: unknown, usage: UsagePart[], model: string, fallbackModel: string | null, ms: number }
 *         | { ok: false, reason: FailReason, usage: UsagePart[], status?: number, category?: string | null, ms: number }} GenerateResult
 * @typedef {{ name: string, model: string, generate(args: GenerateArgs): Promise<GenerateResult> }} Provider
 */

/**
 * Usage per attempt. With fallbacks, usage.iterations lists every model that
 * ran (top-level usage covers only the attempt that produced the message).
 * @param {any} usage @param {string} model
 * @returns {UsagePart[]}
 */
export function usageParts(usage, model) {
  if (!usage) return [];
  const its = Array.isArray(usage.iterations) ? usage.iterations : null;
  /** @param {any} u @param {string | null | undefined} m @returns {UsagePart} */
  const one = (u, m) => ({
    model: m || model,
    input: u.input_tokens || 0,
    output: u.output_tokens || 0,
    cacheWrite: u.cache_creation_input_tokens || 0,
    cacheRead: u.cache_read_input_tokens || 0,
  });
  if (its && its.length) return its.filter((/** @type {any} */ u) => u && (u.type === 'message' || u.type === 'fallback_message')).map((/** @type {any} */ u) => one(u, u.model));
  return [one(usage, model)];
}

/**
 * @param {{ apiKey: string, model: string, effort: 'low' | 'medium' | 'high' | 'xhigh' | 'max', maxRetries: number,
 *   fallbacks: boolean, baseURL?: string, fetch?: typeof fetch }} cfg
 * @returns {Provider}
 */
export function createAnthropicProvider(cfg) {
  const client = new Anthropic({
    apiKey: cfg.apiKey,
    maxRetries: cfg.maxRetries,
    ...(cfg.baseURL ? { baseURL: cfg.baseURL } : {}),
    ...(cfg.fetch ? { fetch: cfg.fetch } : {}),
  });

  return {
    name: 'anthropic',
    model: cfg.model,
    async generate(args) {
      const t0 = Date.now();
      /** @type {Anthropic.Beta.MessageCreateParamsNonStreaming} */
      const params = {
        model: cfg.model,
        max_tokens: args.maxTokens,
        system: [{ type: 'text', text: args.system, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: args.user }],
        output_config: { effort: cfg.effort, format: { type: 'json_schema', schema: args.schema } },
        ...(args.userTag ? { metadata: { user_id: args.userTag } } : {}),
        ...(cfg.fallbacks ? { betas: [FALLBACK_BETA], fallbacks: 'default' } : {}),
      };
      try {
        const res = await client.beta.messages.create(params, { timeout: args.timeoutMs, maxRetries: cfg.maxRetries, signal: args.signal });
        const usage = usageParts(res.usage, res.model);
        const ms = Date.now() - t0;
        // Branch on stop_reason before reading content.
        if (res.stop_reason === 'refusal') return { ok: false, reason: 'refusal', usage, category: res.stop_details?.category ?? null, ms };
        if (res.stop_reason === 'max_tokens') return { ok: false, reason: 'max_tokens', usage, ms };
        const text = res.content.filter((b) => b.type === 'text').map((b) => /** @type {{ text: string }} */ (b).text).join('');
        if (!text.trim()) return { ok: false, reason: 'empty', usage, ms };
        let json;
        try { json = JSON.parse(text); } catch { return { ok: false, reason: 'invalid_json', usage, ms }; }
        const iterations = /** @type {any[]} */ (/** @type {any} */ (res.usage)?.iterations || []);
        const fellBack = iterations.some((u) => u && u.type === 'fallback_message');
        return { ok: true, json, usage, model: res.model, fallbackModel: fellBack ? res.model : null, ms };
      } catch (err) {
        const ms = Date.now() - t0;
        if (err instanceof Anthropic.APIConnectionTimeoutError || err instanceof Anthropic.APIUserAbortError) return { ok: false, reason: 'timeout', usage: [], ms };
        if (err instanceof Anthropic.RateLimitError) return { ok: false, reason: 'rate_limited', usage: [], status: 429, ms };
        if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) return { ok: false, reason: 'auth', usage: [], status: err.status, ms };
        if (err instanceof Anthropic.BadRequestError) return { ok: false, reason: 'bad_request', usage: [], status: 400, ms };
        if (err instanceof Anthropic.InternalServerError) return { ok: false, reason: 'overloaded', usage: [], status: err.status, ms };
        if (err instanceof Anthropic.APIConnectionError) return { ok: false, reason: 'network', usage: [], ms };
        if (err instanceof Anthropic.APIError) return { ok: false, reason: 'error', usage: [], status: err.status, ms };
        return { ok: false, reason: 'error', usage: [], ms };
      }
    },
  };
}
