// Metadata-only logging. The person's text, the model's lines, tokens, IPs
// and device ids are never logged: only whitelisted keys with short,
// code-like values (numbers, booleans, enums, error codes) get through.

const KEYS = new Set([
  'evt', 'route', 'http', 'status', 'latency_ms', 'model_ms', 'attempts', 'gate', 'gate_codes', 'pattern',
  'interaction', 'mallow', 'emotion', 'situation', 'safety_level', 'safety_category', 'safety_source', 'injection',
  'normalised', 'provider', 'provider_error', 'refusal_category', 'model', 'fallback_model', 'fallback_reason',
  'tokens_in', 'tokens_out', 'cache_read', 'cache_write', 'cost_micros', 'quota_left', 'source', 'err', 'prompt_version',
  'previous', 'intention', 'chosen_emotion', 'text_len_bucket', 'cap_left_micros', 'rating',
]);
const SAFE_STRING = /^[A-Za-z0-9_.:-]{0,48}$/;

/** @param {unknown} v */
function clean(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  if (typeof v === 'boolean' || v === null) return v;
  if (typeof v === 'string') return SAFE_STRING.test(v) ? v : undefined;
  if (Array.isArray(v)) {
    const out = v.filter((x) => typeof x === 'string' && SAFE_STRING.test(x)).slice(0, 16);
    return out.length === v.length ? out : out.concat('…');
  }
  return undefined;
}

/**
 * @param {(line: string) => void} [sink]
 * @returns {{ event(fields: Record<string, unknown>): Record<string, unknown> }}
 */
export function createLogger(sink = (line) => console.log(line)) {
  return {
    event(fields) {
      /** @type {Record<string, unknown>} */
      const out = { t: new Date().toISOString() };
      for (const [k, v] of Object.entries(fields)) {
        if (!KEYS.has(k)) continue;
        const c = clean(v);
        if (c !== undefined) out[k] = c;
      }
      sink(JSON.stringify(out));
      return out;
    },
  };
}

/** Coarse length bucket so logs never reveal more than "short/medium/long". @param {number} n */
export function lengthBucket(n) {
  return n <= 60 ? 'short' : n <= 200 ? 'medium' : 'long';
}
