// The customer app's connection to the Hushmates server. It has the shape
// RelayClient expects of any link (request, subscribe, onStatus, online), so
// every scene works unchanged.
//   • The session lives in an HttpOnly cookie that page scripts can't read;
//     nothing secret is kept in the browser.
//   • Every change carries a header a page on another site can't send, and
//     the server refuses any change without it.
//   • Realtime updates arrive as server-sent events and reconnect by themselves.

const GENTLE = 'Something went wrong on our side. Please try again in a moment.';
const OFFLINE = 'You’re offline. Nothing was sent; try again when you’re back.';
const HEADERS = { 'content-type': 'application/json', 'x-hushmates': '1' };

// `human`: the server's own words, written for people (anything else is shown as one gentle line)
const failure = (code, message, human = false) => Object.assign(new Error(message), { code, human });

async function call(url, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(url, { method, credentials: 'same-origin', cache: 'no-store', headers: method === 'GET' ? {} : HEADERS, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw failure('network', OFFLINE);
  }
  let data = null;
  try { data = await res.json(); } catch { /* not JSON: answered below */ }
  if (res.ok && data && data.ok !== false) return data;
  const code = data?.code || (res.status === 401 ? 'not-signed-in' : 'error');
  throw failure(code, typeof data?.message === 'string' && code !== 'error' ? data.message : GENTLE, typeof data?.message === 'string' && code !== 'error');
}

/** Who is here: { signedIn } (the cookie itself is never visible to this page). */
export const session = (base = '/api/v1') => call(`${base}/session`);
/** Redeem an invitation: { invite, name, adult } → signed in. */
export const signIn = (form, base = '/api/v1') => call(`${base}/session`, { method: 'POST', body: form });
export const signOut = (base = '/api/v1') => call(`${base}/session`, { method: 'DELETE', body: {} });

export class HttpLink {
  constructor({ base = '/api/v1', onSignedOut = null } = {}) {
    this.base = base;
    this.onSignedOut = onSignedOut;
    this.online = globalThis.navigator?.onLine !== false;
    this.statusListeners = new Set();
    globalThis.addEventListener?.('online', () => this._status(true));
    globalThis.addEventListener?.('offline', () => this._status(false));
  }
  _status(on) {
    if (this.online === !!on) return;
    this.online = !!on;
    for (const fn of this.statusListeners) fn(this.online);
  }
  onStatus(fn) { this.statusListeners.add(fn); return () => this.statusListeners.delete(fn); }

  /** The token argument is ignored: the server knows who is calling from the session cookie. */
  async request(method, _token, args = {}) {
    if (!/^[a-zA-Z]{1,40}$/.test(method)) throw failure('invalid', GENTLE);
    try {
      const data = await call(`${this.base}/rpc/${method}`, { method: 'POST', body: { args } });
      this._status(true);
      return data.result;
    } catch (e) {
      if (e.code === 'network') this._status(false);
      if (e.code === 'not-signed-in') this.onSignedOut?.();
      throw e;
    }
  }

  subscribe(_token, onEvent, { onReconnect } = {}) {
    let es = null;
    let dropped = false;
    let stopped = false;
    let retry = 0;
    const open = () => {
      if (stopped || typeof EventSource === 'undefined') return;
      es = new EventSource(`${this.base}/events`, { withCredentials: true });
      es.onopen = () => { retry = 0; this._status(true); if (dropped) onReconnect?.(); dropped = false; };
      es.onmessage = (m) => { let ev = null; try { ev = JSON.parse(m.data); } catch { return; } onEvent(ev); };
      es.onerror = () => {
        dropped = true;
        if (es.readyState !== EventSource.CLOSED) return;            // the browser is already reconnecting
        es.close();
        // closed for good (signed out, or the server went away): check which, then try again gently
        session(this.base).then((s) => { if (!s.signedIn) { stopped = true; this.onSignedOut?.(); } }, () => this._status(false))
          .finally(() => { if (!stopped) setTimeout(open, Math.min(30e3, 2e3 * 2 ** retry++)); });
      };
    };
    open();
    return () => { stopped = true; es?.close(); };
  }
}
