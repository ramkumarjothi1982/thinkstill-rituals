// The customer app's link to the Hushmates gateway (the Edge Function in
// supabase/functions/hushmates). It has the shape RelayClient expects of any
// link (request, subscribe, onStatus, online), so every scene works unchanged.
//   • Who is calling is the signed-in person's access token (client/supabase-auth.js),
//     sent as a Bearer token on every call. The token argument RelayClient
//     passes is ignored.
//   • A token the gateway turns away is refreshed and the call tried once more;
//     if it's turned away again, the person is signed out (onSignedOut).
//   • Every call carries a header a page on another site can't send.
//   • Only the gateway's own words (written for people) are ever shown; anything
//     else is one gentle line.
//   • There is no realtime yet: while the page is visible, it asks for changes
//     every 20 seconds, and straight away when the page or the connection comes back.

import { KEY_HEADER } from './supabase-auth.js';

const GENTLE = 'Something went wrong on our side. Please try again in a moment.';
const OFFLINE = 'You’re offline. Nothing was sent; try again when you’re back.';
const LOST = 'The connection dropped before we heard back. It’s safe to try again: nothing is sent twice.';
const SIGNED_OUT = 'You’ve been signed out. Please sign in again.';

// `human`: words written for people, safe to show (anything else is shown as one gentle line)
const failure = (code, message, human = false) => Object.assign(new Error(message), { code, human });

export class FunctionsLink {
  /**
   * base         the gateway: '/functions/v1/hushmates' on this site, or a full address
   * auth         createAuth(…): accessToken({ force })
   * anonKey      the project's public key (Supabase's own gateway asks for it)
   * onSignedOut  called once when the session can't be used any more
   * pollMs       how often to look for changes while the page is visible
   * fetch, doc, win, timeoutMs   for tests
   */
  constructor({ base = '/functions/v1/hushmates', auth, anonKey, onSignedOut = null, pollMs = 20000, fetch: fetchImpl, doc = globalThis.document, win = globalThis, timeoutMs = 25e3 } = {}) {
    if (!auth || typeof auth.accessToken !== 'function') throw new Error('FunctionsLink needs the sign-in (createAuth)');
    this.base = String(base).replace(/\/+$/, '');
    this.auth = auth;
    this.anonKey = anonKey;
    this.onSignedOut = onSignedOut;
    this.pollMs = pollMs;
    this.fetch = fetchImpl;
    this.doc = doc;
    this.win = win;
    this.timeoutMs = timeoutMs;
    this.online = win?.navigator?.onLine !== false;
    this.statusListeners = new Set();
    this._ended = false;
    win?.addEventListener?.('online', () => this._status(true));
    win?.addEventListener?.('offline', () => this._status(false));
  }

  _status(on) {
    if (this.online === !!on) return;
    this.online = !!on;
    for (const fn of this.statusListeners) fn(this.online);
  }
  onStatus(fn) { this.statusListeners.add(fn); return () => this.statusListeners.delete(fn); }

  /** The session is over: say so once (until a call works again), and refuse the call. */
  _signedOut() {
    if (!this._ended) { this._ended = true; this.onSignedOut?.(); }
    return failure('not-signed-in', SIGNED_OUT, true);
  }

  async _token(force) {
    try {
      return await this.auth.accessToken(force ? { force: true } : undefined);
    } catch (e) {
      if (e?.code === 'not-signed-in') throw this._signedOut();
      if (e?.code === 'network') { this._status(false); throw failure('network', OFFLINE); }
      throw failure(e?.code === 'rate-limited' ? 'rate-limited' : 'error', e?.human && e.code !== 'error' ? e.message : GENTLE, !!e?.human && e.code !== 'error');
    }
  }

  async _post(method, token, args) {
    const send = this.fetch || globalThis.fetch;
    try {
      const res = await send(`${this.base}/rpc/${method}`, {
        method: 'POST', cache: 'no-store', credentials: 'omit',
        headers: { authorization: `Bearer ${token}`, [KEY_HEADER]: this.anonKey, 'content-type': 'application/json', 'x-hushmates': '1' },
        body: JSON.stringify({ args }),
        signal: typeof AbortSignal?.timeout === 'function' ? AbortSignal.timeout(this.timeoutMs) : undefined,
      });
      let data = null;
      try { data = await res.json(); } catch { /* not JSON: answered by status alone */ }
      return { status: res.status, data };
    } catch (e) {
      // no answer in time: the call may have arrived, so say it's safe to try again (changes carry ids)
      if (e?.name === 'TimeoutError' || e?.name === 'AbortError') return { status: -1, data: null };
      return { status: 0, data: null };
    }
  }

  /** The token argument is ignored: who is calling comes from the signed-in session. */
  async request(method, _token, args = {}) {
    if (typeof method !== 'string' || !/^[a-zA-Z]{1,40}$/.test(method)) throw failure('invalid', GENTLE);
    let token = await this._token(false);
    if (!token) throw this._signedOut();
    let r = await this._post(method, token, args);
    if (r.status === 401) {
      // the gateway didn't accept the token (it ran out, or was replaced): a fresh one, and one more try
      token = await this._token(true);
      if (!token) throw this._signedOut();
      r = await this._post(method, token, args);
      if (r.status === 401) throw this._signedOut();
    }
    if (r.status === 0) { this._status(false); throw failure('network', OFFLINE); }
    if (r.status === -1) throw failure('response-lost', LOST);
    this._status(true);
    const d = r.data;
    if (r.status >= 200 && r.status < 300 && d && d.ok === true) { this._ended = false; return d.result; }
    // the gateway's own refusals carry ok: false and words written for people; anything else
    // (a platform error page, a crash) is one gentle line, whatever it says
    if (d && d.ok === false && typeof d.code === 'string' && d.code) {
      const human = d.code !== 'error' && typeof d.message === 'string' && !!d.message.trim();
      if (d.code === 'not-signed-in') throw this._signedOut();
      throw failure(d.code, human ? d.message : GENTLE, human);
    }
    throw failure('error', GENTLE);
  }

  /**
   * While the page is visible: onEvent({ type: 'changed', scope }) for journeys and me every
   * pollMs. Hidden: nothing. Visible again, or back online: onReconnect, then polling resumes.
   * → unsubscribe
   */
  subscribe(_token, onEvent, { onReconnect } = {}) {
    let timer = null;
    let stopped = false;
    const visible = () => !this.doc || this.doc.visibilityState !== 'hidden';
    const tick = () => {
      if (stopped || !visible()) return;
      onEvent({ type: 'changed', scope: 'journeys' });
      onEvent({ type: 'changed', scope: 'me' });
    };
    const start = () => { if (!timer && !stopped && visible()) timer = setInterval(tick, this.pollMs); };
    const pause = () => { clearInterval(timer); timer = null; };
    const onVisibility = () => {
      if (stopped) return;
      if (!visible()) { pause(); return; }
      onReconnect?.();
      start();
    };
    const onOnline = () => { if (!stopped && visible()) onReconnect?.(); };
    this.doc?.addEventListener?.('visibilitychange', onVisibility);
    this.win?.addEventListener?.('online', onOnline);
    start();
    return () => {
      stopped = true;
      pause();
      this.doc?.removeEventListener?.('visibilitychange', onVisibility);
      this.win?.removeEventListener?.('online', onOnline);
    };
  }
}
