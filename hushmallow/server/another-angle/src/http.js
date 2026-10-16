// HTTP helpers: JSON responses, CORS allowlist, bounded body reading.

const BASE_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'cross-origin-resource-policy': 'cross-origin',
};

/**
 * @param {number} status
 * @param {unknown} body
 * @param {Record<string, string>} [headers]
 */
export function json(status, body, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...BASE_HEADERS, ...headers } });
}

/**
 * Error body: { status: 'error', error: { code, message } }. Messages are for
 * developers; the client shows its own copy.
 * @param {number} status @param {string} code @param {string} message @param {Record<string, string>} [headers] @param {Record<string, unknown>} [extra]
 */
export function error(status, code, message, headers = {}, extra = {}) {
  return json(status, { status: status === 429 ? 'limit' : 'error', error: { code, message }, ...extra }, headers);
}

/**
 * Decide CORS for a request. Returns headers to add, or null when the origin
 * is not allowed. Requests without an Origin header (native, curl, the eval)
 * are allowed only when ALLOW_NO_ORIGIN is set; auth still applies to them.
 * @param {Request} request
 * @param {{ allowedOrigins: string[], allowNoOrigin: boolean }} cfg
 * @returns {Record<string, string> | null}
 */
export function corsHeaders(request, cfg) {
  const origin = request.headers.get('origin');
  if (!origin) return cfg.allowNoOrigin ? {} : null;
  if (!cfg.allowedOrigins.includes(origin)) return null;
  return {
    'access-control-allow-origin': origin,
    'access-control-expose-headers': 'retry-after',
    vary: 'Origin',
  };
}

/** @param {Record<string, string>} cors */
export function preflight(cors) {
  return new Response(null, {
    status: 204,
    headers: {
      ...cors,
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'authorization, content-type',
      'access-control-max-age': '600',
      'cache-control': 'no-store',
    },
  });
}

/**
 * Read a JSON body of at most maxBytes without buffering more than that.
 * @param {Request} request
 * @param {number} maxBytes
 * @returns {Promise<{ ok: true, value: unknown } | { ok: false, status: number, code: string, message: string }>}
 */
export async function readJson(request, maxBytes) {
  const text = await readText(request, maxBytes);
  if (!text.ok) return text;
  try { return { ok: true, value: JSON.parse(text.value) }; } catch { return { ok: false, status: 400, code: 'invalid_json', message: 'Body is not valid JSON.' }; }
}

/**
 * Read a JSON-typed body of at most maxBytes as UTF-8 text, exactly as sent
 * (the Stripe webhook's signature is over these bytes), without buffering more than that.
 * @param {Request} request
 * @param {number} maxBytes
 * @returns {Promise<{ ok: true, value: string } | { ok: false, status: number, code: string, message: string }>}
 */
export async function readText(request, maxBytes) {
  const type = request.headers.get('content-type') || '';
  if (!/^application\/json\b/i.test(type)) return { ok: false, status: 415, code: 'unsupported_media_type', message: 'Send Content-Type: application/json.' };
  const declared = Number(request.headers.get('content-length') || '0');
  if (declared > maxBytes) return { ok: false, status: 413, code: 'too_large', message: `Body is larger than ${maxBytes} bytes.` };
  if (!request.body) return { ok: false, status: 400, code: 'invalid_json', message: 'Body is empty.' };
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel().catch(() => {});
      return { ok: false, status: 413, code: 'too_large', message: `Body is larger than ${maxBytes} bytes.` };
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let off = 0;
  for (const c of chunks) { bytes.set(c, off); off += c.byteLength; }
  try { return { ok: true, value: new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(bytes) }; } catch { return { ok: false, status: 400, code: 'invalid_json', message: 'Body is not valid UTF-8.' }; }
}

/** Next UTC midnight (when daily counters reset). @param {number} now */
export function nextUtcMidnight(now) {
  const d = new Date(now);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1)).toISOString();
}

/** @param {number} now */
export const utcDay = (now) => new Date(now).toISOString().slice(0, 10);
