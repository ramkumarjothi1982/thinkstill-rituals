// One person's view of the Feeling Relay. Talks to the service only through
// a network link (the lab's LocalNetwork today; Supabase in Phase 2) and keeps
// what this person may see. The interface only uses this class.

const newClientId = () => {
  try { if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID(); } catch { /* insecure context */ }
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
};

export class RelayClient {
  constructor(link, token) {
    this.link = link;
    this.token = token;
    this.listeners = new Set();
    this.state = { online: link.online, ready: false, me: null, journeys: [], gifts: [], offer: null };
    this.skew = 0;                       // service clock minus this device's clock
    this._pending = new Map();
    this._queued = false;
    this._detail = null;
    this._announced = new Set();
  }

  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  _notify(detail = {}) {
    this._detail = { ...(this._detail || {}), ...detail };
    if (this._queued) return;
    this._queued = true;
    queueMicrotask(() => {
      this._queued = false;
      const d = this._detail; this._detail = null;
      for (const fn of this.listeners) fn(this.state, d);
    });
  }
  api(method, args) { return this.link.request(method, this.token, args); }
  newId() { return newClientId(); }

  async start() {
    this.link.onStatus((online) => { this.state.online = online; this._notify({ status: true }); });
    this.unsub = this.link.subscribe(this.token, (ev) => this._onEvent(ev), { onReconnect: () => this.refreshAll().catch(() => {}) });
    await this.refreshAll();
    this.state.ready = true;
    this._notify({ ready: true });
  }
  stop() { this.unsub?.(); this.listeners.clear(); }

  async refreshAll() { await Promise.all([this.refresh('me'), this.refresh('journeys')]); }

  async refresh(scope) {
    const s = this.state;
    if (scope === 'me') { s.me = await this.api('me'); this._clock(s.me.now); }
    else if (scope === 'journeys') {
      const before = new Map(s.journeys.map((j) => [j.id, j.status]));
      const r = await this.api('listJourneys');
      s.journeys = r.journeys;
      this._clock(r.now);
      // a feeling that just came home (the scene plays the return moment)
      // announced once per journey, even when refreshes overlap
      const cameHome = s.journeys.filter((j) => j.status === 'returned' && before.get(j.id) === 'travelling' && !this._announced.has(j.id)).map((j) => j.id);
      cameHome.forEach((id) => this._announced.add(id));
      this._notify({ journeys: true, cameHome });
      return;
    } else if (scope === 'gifts') s.gifts = (await this.api('myGifts')).gifts;
    this._notify({ [scope]: true });
  }

  _onEvent(ev) {
    if (ev.type !== 'changed') return;
    this._soon(ev.scope === 'journeys' ? 'journeys' : ev.scope);
    this._soon('me');
  }
  _soon(scope) {
    if (this._pending.has(scope)) return;
    this._pending.set(scope, setTimeout(() => { this._pending.delete(scope); this.refresh(scope).catch(() => {}); }, 60));
  }

  _clock(t) { if (typeof t === 'number') this.skew = t - Date.now(); }
  /** Now, on the service's clock. */
  now() { return Date.now() + this.skew; }

  journey(id) { return this.state.journeys.find((j) => j.id === id) || null; }

  /** Release a feeling (idempotent: the same clientId is reused on retry). */
  async release({ text, label, mallow, allowFallback, clientId = newClientId() }) {
    const r = await this.api('submitFeeling', { text, label, mallow, allowFallback, clientId });
    if (r.status === 'released') await this.refresh('journeys').catch(() => {});
    await this.refresh('me').catch(() => {});
    return r;
  }
  async act(method, args, refresh = ['journeys', 'me']) {
    const r = await this.api(method, args);
    await Promise.all(refresh.map((s) => this.refresh(s).catch(() => {})));
    return r;
  }
}
