// The Edge Function's way to the database on Supabase: PostgREST's RPC endpoint, as the
// service role, into schema hushmates_api only. The service key never leaves the function.

export function createPostgrestDb({ url, serviceKey, fetch = globalThis.fetch }) {
  return {
    async rpc(fn, params) {
      const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
        method: 'POST',
        headers: {
          apikey: serviceKey, authorization: `Bearer ${serviceKey}`, 'content-type': 'application/json',
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
