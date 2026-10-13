// Local demonstration network between the lab's devices and the in-page
// service. It behaves like a network on purpose, so the client is written
// the way it will be against Supabase:
//   • requests and events are JSON-copied (no shared objects between the
//     device and the service);
//   • only whitelisted method names can be called; the token travels with
//     every request and the service resolves who is calling;
//   • each device can be switched offline; a request can then fail before
//     it arrives, or arrive and lose its response (the case that makes
//     duplicate-safe retries necessary);
//   • the realtime channel drops while offline and the client must catch up
//     when it comes back.
// It is not a security boundary in itself (it runs in one page); the
// service is what enforces the rules, and tests/attacks.test.mjs calls the
// same entry point with forged and stolen-looking requests.

// The service decides what a client may call: pass `methods`, or give the
// service a `clientMethods` array. Nothing else is reachable.
const wire = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const netError = (code = 'network') => Object.assign(new Error(code === 'network'
  ? 'You’re offline. We’ll keep this ready to try again.'
  : 'The connection dropped before we heard back.'), { code });

export class LocalNetwork {
  constructor(service, { latency = [50, 160], random = Math.random, schedule = (fn, ms) => setTimeout(fn, ms), methods = service.clientMethods } = {}) {
    this.service = service;
    this.allowed = new Set(methods || []);
    this.latency = latency;
    this.random = random;
    this.schedule = schedule;
  }
  _delay() { const [a, b] = this.latency; return a + (b - a) * this.random(); }
  link(name) { return new Link(this, name); }
}

export class Link {
  constructor(net, name) {
    this.net = net;
    this.name = name;
    this.online = true;
    this.loseNextResponse = false;   // test hook: the next request reaches the server, its reply is lost
    this.channels = new Set();
    this.statusListeners = new Set();
  }

  setOnline(on) {
    if (this.online === !!on) return;
    this.online = !!on;
    for (const ch of this.channels) on ? ch.open() : ch.close();
    for (const fn of this.statusListeners) fn(this.online);
  }
  onStatus(fn) { this.statusListeners.add(fn); return () => this.statusListeners.delete(fn); }

  request(method, token, args = {}) {
    const { net } = this;
    return new Promise((resolve, reject) => {
      if (!this.online) { reject(netError()); return; }
      const payload = wire({ method, token, args });
      net.schedule(() => {
        if (!this.online) { reject(netError()); return; }         // never arrived
        let ok = true;
        let out;
        try {
          if (!net.allowed.has(payload.method) || typeof net.service[payload.method] !== 'function') {
            throw Object.assign(new Error('That isn’t allowed.'), { code: 'forbidden' });
          }
          out = net.service[payload.method](payload.token, payload.args);
        } catch (e) {
          ok = false;
          out = { code: e.code || 'error', message: e.message };
        }
        const lose = this.loseNextResponse;
        this.loseNextResponse = false;
        const deliver = (good, value) => {
          const copy = good ? wire(value) : value;          // a snapshot, taken when the server answered
          net.schedule(() => {
            if (!this.online || lose) { reject(netError('response-lost')); return; }
            if (good) resolve(copy);
            else reject(Object.assign(new Error(copy.message), { code: copy.code }));
          }, net._delay() / 2);
        };
        // services may answer asynchronously (e.g. a Mallow perspective)
        if (ok && out && typeof out.then === 'function') {
          out.then((v) => deliver(true, v), (e) => deliver(false, { code: e.code || 'error', message: e.message }));
        } else deliver(ok, out);
      }, net._delay() / 2);
    });
  }

  /** Realtime channel for the signed-in account. Survives going offline:
   *  it closes, and re-opens (calling onReconnect) when the link is back. */
  subscribe(token, onEvent, { onReconnect } = {}) {
    const { net } = this;
    const ch = {
      unsub: null,
      open: () => {
        if (ch.unsub) return;
        try {
          ch.unsub = net.service.subscribe(token, (ev) => {
            const copy = wire(ev);
            net.schedule(() => { if (this.online && ch.unsub) onEvent(copy); }, net._delay());
          });
        } catch { ch.unsub = null; return; }
        if (ch.wasClosed) onReconnect?.();
        ch.wasClosed = false;
      },
      close: () => { ch.unsub?.(); ch.unsub = null; ch.wasClosed = true; },
    };
    this.channels.add(ch);
    if (this.online) ch.open(); else ch.wasClosed = true;
    return () => { ch.close(); this.channels.delete(ch); };
  }
}
