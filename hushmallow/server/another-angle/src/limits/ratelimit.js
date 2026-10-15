// Per-IP rate limiting through the Workers rate-limit binding
// ([[ratelimits]] in wrangler.toml). The binding is per Cloudflare location
// and eventually consistent: it stops bursts, while the Ledger's daily
// counters and spend cap are the hard limits.
//
// Without a binding (unit tests, a bare local run) an in-memory fixed window
// per isolate stands in, so behaviour is the same shape everywhere.

/** @typedef {{ limit(opts: { key: string }): Promise<{ success: boolean }> }} RateLimitBinding */

/**
 * @param {{ limit: number, periodMs: number, now?: () => number }} opts
 * @returns {RateLimitBinding}
 */
export function memoryRateLimiter({ limit, periodMs, now = Date.now }) {
  /** @type {Map<string, { start: number, count: number }>} */
  const windows = new Map();
  return {
    async limit({ key }) {
      const t = now();
      let w = windows.get(key);
      if (!w || t - w.start >= periodMs) { w = { start: t, count: 0 }; windows.set(key, w); }
      if (windows.size > 10000) windows.clear();
      w.count++;
      return { success: w.count <= limit };
    },
  };
}

/**
 * @param {RateLimitBinding | undefined} binding
 * @param {RateLimitBinding} fallback
 * @param {string} key
 */
export async function allow(binding, fallback, key) {
  const limiter = binding && typeof binding.limit === 'function' ? binding : fallback;
  const { success } = await limiter.limit({ key });
  return success;
}
