// Ledger: a Durable Object of daily counters.
//
// One instance per name (env.LEDGER.idFromName(name)):
//   "global"        spend:<day> (micro-USD) and sessions:<day>
//   "dev:<subject>" angles:<day>  (per-device / per-subscriber daily quota)
//   "ip:<hash>"     sessions:<day> (new device tokens per IP per day)
// A Durable Object processes one request at a time, so each read-check-write
// below is atomic. Days are UTC; a day's counters are deleted two days after
// the day ends (at 00:00 UTC on the third day after it): on the next write, or
// by the object's alarm if nothing is ever written there again (15 Oct 2026,
// privacy review 2: the delete sheet says daily usage counts are cleared
// after two days, and an idle device's counter must not outlive that).
//
// Spend uses reserve → settle: before a model call the worst case is
// reserved against the cap; afterwards the real cost replaces it.

/**
 * @typedef {{ get(key: string): Promise<any>, put(key: string, v: any): Promise<void>, delete(key: string | string[]): Promise<any>,
 *   list(opts?: { prefix?: string }): Promise<Map<string, any>>,
 *   getAlarm(): Promise<number | null>, setAlarm(at: number | Date): Promise<void>, deleteAlarm(): Promise<void> }} Storage
 */

const DAY_MS = 86400000;
/** When a day's counters are deleted: 00:00 UTC on the third day after it, two days after the day ended. @param {string} day */
export const clearedAt = (day) => Date.parse(`${day}T00:00:00Z`) + 3 * DAY_MS;
/** @param {number} ms */
const dayOf = (ms) => new Date(ms).toISOString().slice(0, 10);

export class Ledger {
  /** @param {{ storage: Storage }} state @param {unknown} [_env] @param {{ now?: () => number }} [options] (tests and the in-memory namespace) */
  constructor(state, _env, options = {}) {
    this.storage = state.storage;
    this.now = options.now || Date.now;
    /** @type {string | null} */
    this.cleanedFor = null;
    /** @type {number | null | undefined} the alarm set in storage (undefined: not read yet) */
    this.alarmAt = undefined;
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
    if (op !== 'peek') {
      if (this.cleanedFor !== day) await this.cleanup(day);
      await this.wakeBy(clearedAt(day));
    }
    return Response.json(result);
  }

  /** Drop counters more than two days old. @param {string} today */
  async cleanup(today) {
    this.cleanedFor = today;
    const cutoff = new Date(Date.parse(`${today}T00:00:00Z`) - 2 * DAY_MS).toISOString().slice(0, 10);
    const all = await this.storage.list();
    const old = [...all.keys()].filter((k) => { const d = k.split(':')[1]; return d && d < cutoff; });
    if (old.length) await this.storage.delete(old);
  }

  /** Makes sure the alarm goes off no later than `at` (the earliest day still kept decides). @param {number} at */
  async wakeBy(at) {
    if (this.alarmAt === undefined) this.alarmAt = await this.storage.getAlarm();
    if (this.alarmAt != null && this.alarmAt <= at) return;
    await this.storage.setAlarm(at);
    this.alarmAt = at;
  }

  /**
   * The Durable Object alarm: deletes the counters that are more than two days
   * old even if this object is never written to again, then wakes again for
   * the oldest day left (none left: no alarm, and the object holds nothing).
   */
  async alarm() {
    this.alarmAt = null;   // a fired alarm is cleared by the runtime
    const now = this.now();
    await this.cleanup(dayOf(now));
    this.cleanedFor = null;   // the next write cleans up for its own day
    const days = [...(await this.storage.list()).keys()].map((k) => k.split(':')[1]).filter(Boolean).sort();
    if (days.length) await this.wakeBy(Math.max(clearedAt(days[0]), now + 60000));
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

/** In-memory Durable Object storage, alarm included (tests and the local harness). */
export function memoryStorage() {
  /** @type {Map<string, any>} */
  const m = new Map();
  const s = {
    map: m,
    /** @type {number | null} */
    alarm: null,
    /** @param {string} k */
    async get(k) { return m.get(k); },
    /** @param {string} k @param {any} v */
    async put(k, v) { m.set(k, v); },
    /** @param {string | string[]} k */
    async delete(k) { for (const x of Array.isArray(k) ? k : [k]) m.delete(x); return true; },
    async list({ prefix = '' } = {}) { return new Map([...m].filter(([k]) => k.startsWith(prefix))); },
    async getAlarm() { return s.alarm; },
    /** @param {number | Date} at */
    async setAlarm(at) { s.alarm = Number(at); },
    async deleteAlarm() { s.alarm = null; },
  };
  return s;
}

/**
 * A fake Durable Object namespace running real Ledger instances in memory,
 * one request at a time per instance (like the real thing), alarms included:
 * a due alarm runs before the next request to any instance, when runAlarms()
 * is called, or on a timer that never keeps the process alive. An instance
 * left with nothing stored and no alarm is dropped, as a real one holds nothing.
 * @param {{ now?: () => number }} [options]
 * @returns {{ idFromName(name: string): string, get(id: string): { fetch(input: string, init?: RequestInit): Promise<Response> },
 *   instances: Map<string, Ledger>, runAlarms(): Promise<void> }}
 */
export function memoryLedgerNamespace(options = {}) {
  const now = options.now || Date.now;
  /** @type {Map<string, Ledger>} */
  const instances = new Map();
  /** @type {Map<string, ReturnType<typeof memoryStorage>>} */
  const stores = new Map();
  /** @type {Map<string, Promise<unknown>>} */
  const queues = new Map();
  /** @type {ReturnType<typeof setTimeout> | null} */
  let timer = null;
  /** @template T @param {string} id @param {() => Promise<T>} job @returns {Promise<T>} */
  const queued = (id, job) => {
    const run = (queues.get(id) || Promise.resolve()).then(job);
    queues.set(id, run.catch(() => {}));
    return run;
  };
  async function runAlarms() {
    const t = now();
    const due = [...stores].filter(([, st]) => st.alarm != null && st.alarm <= t).map(([id]) => id);
    await Promise.all(due.map((id) => queued(id, async () => {
      const st = stores.get(id);
      if (!st || st.alarm == null || st.alarm > now()) return;
      st.alarm = null;
      await /** @type {Ledger} */ (instances.get(id)).alarm();
      if (!st.map.size && st.alarm == null) { instances.delete(id); stores.delete(id); queues.delete(id); }
    })));
    arm();
  }
  function arm() {
    if (timer) clearTimeout(timer);
    timer = null;
    const next = Math.min(...[...stores.values()].map((st) => st.alarm ?? Infinity));
    if (!Number.isFinite(next)) return;
    timer = setTimeout(() => { timer = null; runAlarms().catch(() => {}); }, Math.min(2 ** 31 - 1, Math.max(0, next - now())));
    /** @type {any} */ (timer).unref?.();
  }
  return {
    instances,
    runAlarms,
    idFromName: (name) => name,
    get(id) {
      return {
        async fetch(input, init) {
          await runAlarms();
          if (!instances.has(id)) {
            const st = memoryStorage();
            stores.set(id, st);
            instances.set(id, new Ledger({ storage: st }, undefined, { now }));
          }
          const obj = /** @type {Ledger} */ (instances.get(id));
          const res = await queued(id, () => obj.fetch(new Request(input, init)));
          arm();
          return res;
        },
      };
    },
  };
}
