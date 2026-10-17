// Billing: a Durable Object (SQLite-backed, wrangler.toml migration "v2")
// holding each account's web subscription, as Stripe's webhook last told it.
//
// One instance per name (env.BILLING.idFromName(name)):
//   "user:<supabase user id>"  sub       the account's subscription record (below)
//                              evt:<id>  Stripe events already applied (kept 30 days)
//                              customer  the account's own Stripe customer, set once (checkout creates it)
//                              checkout  the last Checkout Session started: { id, expires_at (ms) }
//   "customer:<cus_…>"         uid       which account a Stripe customer belongs to
// A Durable Object handles one request at a time, so each apply (seen? →
// decide → write → mark seen) is atomic: the same event delivered twice, or
// two events racing, can never both write. sync is apply without an event
// id (a read the server made itself, such as checkout's return).
//
// The record: { v, subscription, customer, status, tier, period,
// current_period_end (ms), cancel_at_period_end, as_of (ms) }. Stripe ids,
// Stripe's status and the plan only: never words, feelings, card details,
// names or emails.
//
// The state machine (supersedes): for the same subscription, a newer answer
// (as_of: when the server asked Stripe for it) replaces an older one and an
// older one is ignored; another subscription of the same account replaces
// the record only when it gives access and the current one does not, or
// gives more (a higher plan), so a late event about an old, cancelled
// subscription never takes access away from the one that replaced it.
//
// Access (effectiveTier): Stripe's active, trialing or past_due (Stripe is
// still retrying the card; docs/PAYMENTS.md), until a day after the period
// ends (a renewal event running late never locks anyone out). Anything else
// (canceled, unpaid, incomplete, incomplete_expired, paused) is no plan.

/**
 * @typedef {{ v: 1, subscription: string, customer: string | null, status: string, tier: 'none' | 'paid' | 'ultra',
 *   period: 'monthly' | 'yearly' | null, current_period_end: number | null, cancel_at_period_end: boolean, as_of: number }} SubRecord
 * @typedef {{ get(key: string): Promise<any>, put(key: string, v: any): Promise<void>, delete(key: string | string[]): Promise<any>,
 *   list(opts?: { prefix?: string }): Promise<Map<string, any>> }} Storage
 */

const DAY_MS = 86400000;
export const PERIOD_GRACE_MS = DAY_MS;
export const EVENT_KEEP_MS = 30 * DAY_MS;
export const ACCESS = new Set(['active', 'trialing', 'past_due']);
const STATUSES = new Set(['incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused']);
const RANK = { none: 0, paid: 1, ultra: 2 };
const PRODUCT = /^hushmallow\.(paid|ultra)\.(monthly|yearly)$/;
const CUSTOMER = /^cus_[A-Za-z0-9]{4,250}$/;
const CHECKOUT_SESSION = /^cs_(?:test|live)_[A-Za-z0-9]{10,250}$/;
/** A Checkout Session's expires_at in ms, never Stripe's seconds by mistake (any time after 1973 in ms is past 1e11). */
const MS_TIME_MIN = 1e11;

/**
 * @typedef {{ paid: { monthly: string, yearly: string }, ultra: { monthly: string, yearly: string } }} Prices
 * @typedef {{ plan: 'paid' | 'ultra', period: 'monthly' | 'yearly' }} Plan
 */

/** The configured slot a price id sits in, or null. @param {string | undefined} id @param {Prices} prices @returns {Plan | null} */
function slotOf(id, prices) {
  for (const plan of /** @type {const} */ (['paid', 'ultra'])) {
    for (const period of /** @type {const} */ (['monthly', 'yearly'])) if (id && prices[plan][period] === id) return { plan, period };
  }
  return null;
}

/** A price with no lookup key (Stripe sends null). @param {unknown} k */
const noLookupKey = (k) => k == null || k === '';

/**
 * Which plan a Stripe price is. Its lookup key decides when it is one of the app's product ids
 * (hushmallow.ultra.monthly…): the key is set on the price in Stripe, so an id pasted into the wrong slot never changes
 * what was bought, and a price the owner replaces later still maps. Only a price with no lookup key falls back to
 * the configured ids; any other lookup key is no plan of ours.
 * @param {string | undefined} id @param {string | undefined | null} lookupKey @param {Prices} prices
 * @returns {Plan | null}
 */
export function planForPrice(id, lookupKey, prices) {
  const m = typeof lookupKey === 'string' ? PRODUCT.exec(lookupKey) : null;
  if (m) return { plan: /** @type {Plan['plan']} */ (m[1]), period: /** @type {Plan['period']} */ (m[2]) };
  return noLookupKey(lookupKey) ? slotOf(id, prices) : null;
}

/**
 * A configured price id whose lookup key says something else (another plan or period, or not one of the app's): the
 * lookup key decides (planForPrice), and the webhook logs price_mismatch so the slot gets fixed.
 * @param {string | undefined} id @param {string | undefined | null} lookupKey @param {Prices} prices
 */
export function priceMismatch(id, lookupKey, prices) {
  const slot = slotOf(id, prices);
  return !!slot && !noLookupKey(lookupKey) && lookupKey !== `hushmallow.${slot.plan}.${slot.period}`;
}

/** A Stripe id (or an expanded object's id), or null. @param {unknown} v */
export function idOf(v) {
  const s = typeof v === 'string' ? v : v && typeof v === 'object' ? /** @type {any} */ (v).id : null;
  return typeof s === 'string' && /^[a-z]{2,8}_[A-Za-z0-9]{4,250}$/.test(s) ? s : null;
}

/**
 * A Stripe subscription → the record kept. The period end is the subscription's
 * own (older API versions) or the latest of its items' (newer ones).
 * @param {any} sub @param {Parameters<typeof planForPrice>[2]} prices @param {number} asOf
 * @returns {SubRecord}
 */
export function summarise(sub, prices, asOf) {
  let tier = /** @type {SubRecord['tier']} */ ('none'), period = /** @type {SubRecord['period']} */ (null);
  let end = typeof sub?.current_period_end === 'number' ? sub.current_period_end : 0;
  for (const it of Array.isArray(sub?.items?.data) ? sub.items.data : []) {
    const price = it?.price || it?.plan;
    const p = planForPrice(price?.id, price?.lookup_key, prices);
    if (p && RANK[p.plan] > RANK[tier]) { tier = p.plan; period = p.period; }
    if (typeof it?.current_period_end === 'number') end = Math.max(end, it.current_period_end);
  }
  const status = STATUSES.has(sub?.status) ? sub.status : 'unknown';
  return {
    v: 1, subscription: String(idOf(sub?.id) || ''), customer: idOf(sub?.customer), status, tier, period,
    current_period_end: end > 0 ? end * 1000 : null,
    // the portal can cancel "at period end" either way, depending on the API version
    cancel_at_period_end: sub?.cancel_at_period_end === true || (typeof sub?.cancel_at === 'number' && status !== 'canceled'),
    as_of: asOf,
  };
}

/** The plan this record gives right now. @param {SubRecord | null | undefined} rec @param {number} now */
export function effectiveTier(rec, now) {
  if (!rec || !ACCESS.has(rec.status)) return 'none';
  if (rec.current_period_end != null && rec.current_period_end + PERIOD_GRACE_MS <= now) return 'none';
  return rec.tier;
}

/** Until when this record gives access (for session tokens). @param {SubRecord} rec @param {number} now @param {number} fallbackMs */
export function accessUntil(rec, now, fallbackMs) {
  return rec.current_period_end != null ? rec.current_period_end + PERIOD_GRACE_MS : now + fallbackMs;
}

/** Does `next` replace `cur`? (the state machine in the header) @param {SubRecord | null} cur @param {SubRecord} next */
export function supersedes(cur, next) {
  if (!cur) return true;
  if (cur.subscription === next.subscription) return next.as_of >= cur.as_of;
  const a = ACCESS.has(cur.status), b = ACCESS.has(next.status);
  if (a !== b) return b;
  if (RANK[next.tier] !== RANK[cur.tier]) return RANK[next.tier] > RANK[cur.tier];
  return next.as_of >= cur.as_of;
}

/** @param {any} c @returns {c is { id: string, expires_at: number }} */
function isCheckout(c) {
  return !!c && typeof c === 'object' && Object.keys(c).every((k) => k === 'id' || k === 'expires_at')
    && typeof c.id === 'string' && CHECKOUT_SESSION.test(c.id) && Number.isFinite(c.expires_at) && c.expires_at > MS_TIME_MIN;
}

/** @param {any} r @returns {r is SubRecord} */
function isRecord(r) {
  return !!r && typeof r === 'object' && typeof r.subscription === 'string' && /^sub_/.test(r.subscription)
    && typeof r.status === 'string' && ['none', 'paid', 'ultra'].includes(r.tier) && typeof r.as_of === 'number';
}

export class Billing {
  /** @param {{ storage: Storage }} state @param {unknown} [_env] @param {{ now?: () => number }} [options] */
  constructor(state, _env, options = {}) {
    this.storage = state.storage;
    this.now = options.now || Date.now;
  }

  /** @param {Request} request */
  async fetch(request) {
    /** @type {any} */
    let body;
    try { body = await request.json(); } catch { return Response.json({ ok: false, error: 'bad_request' }, { status: 400 }); }
    const op = new URL(request.url).pathname.slice(1);
    const bad = () => Response.json({ ok: false, error: 'bad_request' }, { status: 400 });
    switch (op) {
      case 'get':
        return Response.json({ ok: true, record: (await this.storage.get('sub')) || null });
      case 'apply': {
        const event = body?.event, record = body?.record;
        if (typeof event !== 'string' || !/^evt_[A-Za-z0-9]{1,250}$/.test(event) || !isRecord(record)) return bad();
        if (await this.storage.get(`evt:${event}`)) return Response.json({ ok: true, applied: false, duplicate: true });
        const applied = await this.write(record);
        await this.storage.put(`evt:${event}`, this.now());
        await this.forgetOldEvents();
        return Response.json({ ok: true, applied, duplicate: false });
      }
      case 'sync': {
        if (!isRecord(body?.record)) return bad();
        return Response.json({ ok: true, applied: await this.write(body.record) });
      }
      case 'customer':
        return Response.json({ ok: true, customer: (await this.storage.get('customer')) || null });
      case 'set_customer': {
        if (typeof body?.customer !== 'string' || !CUSTOMER.test(body.customer)) return bad();
        const cur = await this.storage.get('customer');
        if (!cur) await this.storage.put('customer', body.customer);
        return Response.json({ ok: true, customer: cur || body.customer, conflict: !!cur && cur !== body.customer });
      }
      case 'checkout':
        return Response.json({ ok: true, checkout: (await this.storage.get('checkout')) || null });
      case 'set_checkout': {
        if (!isCheckout(body?.checkout)) return bad();
        await this.storage.put('checkout', { id: body.checkout.id, expires_at: body.checkout.expires_at });
        return Response.json({ ok: true });
      }
      case 'link': {
        if (typeof body?.uid !== 'string') return Response.json({ ok: false, error: 'bad_request' }, { status: 400 });
        const cur = await this.storage.get('uid');
        if (!cur) await this.storage.put('uid', body.uid);
        return Response.json({ ok: true, uid: cur || body.uid, conflict: !!cur && cur !== body.uid });
      }
      case 'owner':
        return Response.json({ ok: true, uid: (await this.storage.get('uid')) || null });
      default:
        return Response.json({ ok: false, error: 'unknown_op' }, { status: 404 });
    }
  }

  /** The state machine's write (supersedes): true when `record` replaced the account's. @param {SubRecord} record */
  async write(record) {
    const cur = (await this.storage.get('sub')) || null;
    const applied = supersedes(cur, record);
    if (applied) await this.storage.put('sub', record);
    return applied;
  }

  /** Events applied more than EVENT_KEEP_MS ago (Stripe stops retrying after three days). */
  async forgetOldEvents() {
    const cutoff = this.now() - EVENT_KEEP_MS;
    const old = [...(await this.storage.list({ prefix: 'evt:' }))].filter(([, at]) => Number(at) < cutoff).map(([k]) => k);
    if (old.length) await this.storage.delete(old);
  }
}

/**
 * Typed client over the BILLING namespace binding.
 * @param {{ idFromName(name: string): any, get(id: any): { fetch(input: string, init?: RequestInit): Promise<Response> } }} ns
 */
export function billingClient(ns) {
  /** @param {string} name @param {string} op @param {Record<string, unknown>} body @returns {Promise<any>} */
  async function call(name, op, body) {
    const stub = ns.get(ns.idFromName(name));
    const res = await stub.fetch(`https://billing/${op}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`billing ${op} failed (${res.status})`);
    return res.json();
  }
  return {
    /** @param {string} uid @returns {Promise<SubRecord | null>} */
    get: async (uid) => (await call(`user:${uid}`, 'get', {})).record || null,
    /** @param {string} uid @param {string} event @param {SubRecord} record @returns {Promise<{ ok: boolean, applied: boolean, duplicate: boolean }>} */
    apply: (uid, event, record) => call(`user:${uid}`, 'apply', { event, record }),
    /** @param {string} customer @param {string} uid @returns {Promise<{ ok: boolean, uid: string, conflict: boolean }>} */
    link: (customer, uid) => call(`customer:${customer}`, 'link', { uid }),
    /** @param {string} customer @returns {Promise<string | null>} */
    owner: async (customer) => (await call(`customer:${customer}`, 'owner', {})).uid || null,
    /** A record the server read itself (no event id), through the same state machine. @param {string} uid @param {SubRecord} record @returns {Promise<{ ok: boolean, applied: boolean }>} */
    sync: (uid, record) => call(`user:${uid}`, 'sync', { record }),
    /** The account's own Stripe customer, or null. @param {string} uid @returns {Promise<string | null>} */
    customerOf: async (uid) => (await call(`user:${uid}`, 'customer', {})).customer || null,
    /** Set once: a different customer later is a conflict and changes nothing. @param {string} uid @param {string} customer @returns {Promise<{ ok: boolean, customer: string, conflict: boolean }>} */
    setCustomer: (uid, customer) => call(`user:${uid}`, 'set_customer', { customer }),
    /** The last Checkout Session started for the account, or null. @param {string} uid @returns {Promise<{ id: string, expires_at: number } | null>} */
    lastCheckout: async (uid) => (await call(`user:${uid}`, 'checkout', {})).checkout || null,
    /** @param {string} uid @param {{ id: string, expires_at: number }} checkout expires_at in ms @returns {Promise<{ ok: boolean }>} */
    setCheckout: (uid, checkout) => call(`user:${uid}`, 'set_checkout', { checkout }),
  };
}

/**
 * A fake BILLING namespace running real Billing instances in memory, one
 * request at a time per instance (tests and the local harness).
 * @param {{ now?: () => number }} [options]
 */
export function memoryBillingNamespace(options = {}) {
  /** @type {Map<string, { obj: Billing, map: Map<string, any>, queue: Promise<unknown> }>} */
  const instances = new Map();
  /** @param {string} id */
  const instance = (id) => {
    let i = instances.get(id);
    if (!i) {
      /** @type {Map<string, any>} */
      const map = new Map();
      /** @type {Storage} */
      const storage = {
        async get(k) { return structuredClone(map.get(k)); },
        async put(k, v) { map.set(k, structuredClone(v)); },
        async delete(k) { for (const x of Array.isArray(k) ? k : [k]) map.delete(x); return true; },
        async list({ prefix = '' } = {}) { return new Map([...map].filter(([k]) => k.startsWith(prefix))); },
      };
      i = { obj: new Billing({ storage }, undefined, options), map, queue: Promise.resolve() };
      instances.set(id, i);
    }
    return i;
  };
  return {
    instances,
    /** @param {string} name */
    idFromName: (name) => name,
    /** @param {string} id */
    get(id) {
      return {
        /** @param {string} input @param {RequestInit} [init] */
        fetch(input, init) {
          const i = instance(id);
          const run = i.queue.then(() => i.obj.fetch(new Request(input, init)));
          i.queue = run.catch(() => {});
          return run;
        },
      };
    },
  };
}
