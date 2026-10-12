// Ledger: a Durable Object of daily counters.
//
// One instance per name (env.LEDGER.idFromName(name)):
//   "global"        spend:<day> (micro-USD) and sessions:<day>
//   "dev:<subject>" angles:<day>  (per-device / per-subscriber daily quota)
//   "ip:<hash>"     sessions:<day> (new device tokens per IP per day)
// A Durable Object processes one request at a time, so each read-check-write
// below is atomic. Days are UTC; keys older than two days are deleted.
//
// Spend uses reserve → settle: before a model call the worst case is
// reserved against the cap; afterwards the real cost replaces it.

/** @typedef {{ get(key: string): Promise<any>, put(key: string, v: any): Promise<void>, delete(key: string | string[]): Promise<any>, list(opts?: { prefix?: string }): Promise<Map<string, any>> }} Storage */

export class Ledger {
  /** @param {{ storage: Storage }} state @param {unknown} [_env] */
  constructor(state, _env) {
    this.storage = state.storage;
    /** @type {string | null} */
    this.cleanedFor = null;
  }

  /** @param {Request} request */
  async fetch(request) {
    let body;
    try { body = await request.json(); } catch { return Response.json({ ok: false, error: 'bad_request' }, { status: 400 }); }
    const op = new URL(request.url).pathname.slice(1);
    const { key, day } = body || {};
    if (typeof key !== 'string' || !/^[a-z]+$/.test(key) || typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      return Response.json({ ok: false, error: 'bad_request' }, { status: 400 });
    }
    const k = `${key}:${day}`;
    const used = Number((await this.storage.get(k)) || 0);
    let result;
    switch (op) {
      case 'take': {
        const amount = Math.max(0, Math.floor(Number(body.amount ?? 1)));
        const limit = Math.max(0, Math.floor(Number(body.limit)));
        if (used + amount > limit) { result = { ok: false, used, limit, remaining: Math.max(0, limit - used) }; break; }
        await this.storage.put(k, used + amount);
        result = { ok: true, used: used + amount, limit, remaining: limit - used - amount };
        break;
      }
      case 'give': {
        const amount = Math.max(0, Math.floor(Number(body.amount ?? 1)));
        const next = Math.max(0, used - amount);
        await this.storage.put(k, next);
        result = { ok: true, used: next };
        break;
      }
      case 'settle': {
        const reserved = Math.max(0, Math.floor(Number(body.reserved)));
        const actual = Math.max(0, Math.ceil(Number(body.actual)));
        const next = Math.max(0, used - reserved + actual);
        await this.storage.put(k, next);
        result = { ok: true, used: next };
        break;
      }
      case 'peek':
        result = { ok: true, used };
        break;
      default:
        return Response.json({ ok: false, error: 'unknown_op' }, { status: 404 });
    }
    if (op !== 'peek' && this.cleanedFor !== day) await this.cleanup(day);
    return Response.json(result);
  }

  /** Drop counters more than two days old. @param {string} today */
  async cleanup(today) {
    this.cleanedFor = today;
    const cutoff = new Date(Date.parse(`${today}T00:00:00Z`) - 2 * 86400000).toISOString().slice(0, 10);
    const all = await this.storage.list();
    const old = [...all.keys()].filter((k) => { const d = k.split(':')[1]; return d && d < cutoff; });
    if (old.length) await this.storage.delete(old);
  }
}

/**
 * Typed client over a Durable Object namespace binding.
 * @param {{ idFromName(name: string): any, get(id: any): { fetch(input: string, init?: RequestInit): Promise<Response> } }} ns
 */
export function ledgerClient(ns) {
  /** @param {string} name @param {string} op @param {Record<string, unknown>} body */
  async function call(name, op, body) {
    const stub = ns.get(ns.idFromName(name));
    const res = await stub.fetch(`https://ledger/${op}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`ledger ${op} failed (${res.status})`);
    return /** @type {Promise<{ ok: boolean, used: number, limit?: number, remaining?: number }>} */ (res.json());
  }
  return {
    /** @param {string} name @param {string} key @param {string} day @param {number} limit @param {number} [amount] */
    take: (name, key, day, limit, amount = 1) => call(name, 'take', { key, day, limit, amount }),
    /** @param {string} name @param {string} key @param {string} day @param {number} [amount] */
    give: (name, key, day, amount = 1) => call(name, 'give', { key, day, amount }),
    /** @param {string} name @param {string} key @param {string} day @param {number} reserved @param {number} actual */
    settle: (name, key, day, reserved, actual) => call(name, 'settle', { key, day, reserved, actual }),
    /** @param {string} name @param {string} key @param {string} day */
    peek: (name, key, day) => call(name, 'peek', { key, day }),
  };
}

/** In-memory Durable Object storage (tests and the local harness). */
export function memoryStorage() {
  /** @type {Map<string, any>} */
  const m = new Map();
  return {
    map: m,
    async get(k) { return m.get(k); },
    async put(k, v) { m.set(k, v); },
    async delete(k) { for (const x of Array.isArray(k) ? k : [k]) m.delete(x); return true; },
    async list({ prefix = '' } = {}) { return new Map([...m].filter(([k]) => k.startsWith(prefix))); },
  };
}

/**
 * A fake Durable Object namespace running real Ledger instances in memory,
 * one request at a time per instance (like the real thing).
 * @returns {{ idFromName(name: string): string, get(id: string): { fetch(input: string, init?: RequestInit): Promise<Response> }, instances: Map<string, Ledger> }}
 */
export function memoryLedgerNamespace() {
  /** @type {Map<string, Ledger>} */
  const instances = new Map();
  /** @type {Map<string, Promise<unknown>>} */
  const queues = new Map();
  return {
    instances,
    idFromName: (name) => name,
    get(id) {
      if (!instances.has(id)) instances.set(id, new Ledger({ storage: memoryStorage() }));
      const obj = /** @type {Ledger} */ (instances.get(id));
      return {
        fetch(input, init) {
          const prev = queues.get(id) || Promise.resolve();
          const run = prev.then(() => obj.fetch(new Request(input, init)));
          queues.set(id, run.catch(() => {}));
          return run;
        },
      };
    },
  };
}
