// Token pricing (USD per million tokens) used for the daily spend cap and the
// eval's cost estimate. Amounts are kept in integer micro-dollars (1e-6 USD):
// tokens × ($/MTok) = micro-dollars. Unknown models are priced
// pessimistically so the cap errs on the side of stopping early.

/** @typedef {{ input: number, output: number, cacheWrite: number, cacheRead: number }} Rate */

/** @type {Record<string, Rate>} */
export const PRICES = {
  'claude-opus-5-5': { input: 4, output: 20, cacheWrite: 5, cacheRead: 0.2 },
  'claude-opus-5': { input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.5 },
  'claude-opus-4-8': { input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.5 },
  'claude-sonnet-5-5': { input: 2, output: 10, cacheWrite: 2.5, cacheRead: 0.2 },
};
const PESSIMISTIC = { input: 10, output: 50, cacheWrite: 12.5, cacheRead: 1 };

/** @param {string | null | undefined} model */
export function rateFor(model) {
  return (model && PRICES[model]) || PESSIMISTIC;
}

/**
 * @typedef {{ model: string | null, input: number, output: number, cacheWrite: number, cacheRead: number }} UsagePart
 */

/** @param {UsagePart[]} parts @returns {number} micro-dollars, rounded up */
export function costMicros(parts) {
  let total = 0;
  for (const p of parts) {
    const r = rateFor(p.model);
    total += p.input * r.input + p.output * r.output + p.cacheWrite * r.cacheWrite + p.cacheRead * r.cacheRead;
  }
  return Math.ceil(total);
}

/**
 * Worst case for one request (used to reserve against the daily cap before
 * calling the model): every attempt writes the whole prompt to the cache and
 * uses all of max_tokens.
 * @param {{ model: string, attempts: number, promptTokens: number, maxTokens: number }} o
 */
export function worstCaseMicros({ model, attempts, promptTokens, maxTokens }) {
  const r = rateFor(model);
  const rate = { input: Math.max(r.input, PESSIMISTIC.input / 2), output: Math.max(r.output, PESSIMISTIC.output / 2), cacheWrite: Math.max(r.cacheWrite, PESSIMISTIC.cacheWrite / 2) };
  // A server-side fallback can re-run the request on another model in the same call.
  const perAttempt = promptTokens * rate.cacheWrite + maxTokens * rate.output;
  return Math.ceil(perAttempt * attempts * 1.5);
}

/** Rough token count for budgeting (about 4 characters per token for English). @param {string} text */
export function roughTokens(text) {
  return Math.ceil(String(text).length / 3.6);
}

/** @param {number} m */
export const microsToUsd = (m) => m / 1e6;
