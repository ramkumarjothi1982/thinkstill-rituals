// The Edge Function's way to the database on Supabase: PostgREST's RPC endpoint, as the
// service role, into schema hushmates_api only. The service key never leaves the function.

/**
 * The headers that carry a Supabase project key. A new-style key (sb_secret_…, sb_publishable_…)
 * isn't a JWT: it goes in `apikey` only, and the platform refuses it as a Bearer token ("Invalid
 * JWT"). A legacy key (a JWT, eyJ…) goes in both, as Supabase's clients have always sent it.
 * @param {string} key
 * @returns {Record<string, string>}
 */
export function keyHeaders(key) {
  return /^eyJ/.test(String(key)) ? { apikey: key, authorization: `Bearer ${key}` } : { apikey: key };
}

export function createPostgrestDb({ url, serviceKey, fetch = globalThis.fetch }) {
  return {
    async rpc(fn, params) {
      const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
        method: 'POST',
        headers: {
          ...keyHeaders(serviceKey), 'content-type': 'application/json',
          'content-profile': 'hushmates_api', 'accept-profile': 'hushmates_api',
        },
        body: JSON.stringify(params || {}),
      });
      const text = await res.text();
      if (!res.ok) throw Object.assign(new Error(`database call ${fn} failed (${res.status})`), { status: res.status, detail: text.slice(0, 300) });
      return text ? JSON.parse(text) : null;
    },
  };
}
