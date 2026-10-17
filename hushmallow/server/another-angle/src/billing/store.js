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
// current_period_end (ms), cancel_at_period_end, cancel_at (ms or null),
// as_of (ms), past_due_since (ms, only while past_due) }. Stripe ids,
// Stripe's status and the plan only: never words, feelings, card details,
// names or emails.
//
// The state machine (supersedes): for the same subscription, a newer answer
// (as_of: when the server asked Stripe for it) replaces an older one and an
// older one is ignored; another subscription of the same account replaces
// the record only when it gives access and the current one does not (its
// status, or its period over: periodOver), or gives more (a higher plan), so
// a late event about an old, cancelled subscription never takes access away
// from the one that replaced it. The exception is the best of a fresh list
// of the customer's subscriptions (bestOf; `covers` names the ones listed):
// read later than the record and including its subscription, it knows that
// one's state too, so it replaces it (Flow still billing after a second
// subscription, Beyond, ended).
//
// Access (effectiveTier): Stripe's active, trialing or past_due (Stripe is
// still retrying the card; docs/PAYMENTS.md), until a day after the period
// ends (a renewal event running late never locks anyone out), and past_due
// for at most PAST_DUE_GRACE_MS from when it began. Anything else
// (canceled, unpaid, incomplete, incomplete_expired, paused) is no plan.

/**
 * @typedef {{ v: 1, subscription: string, customer: string | null, status: string, tier: 'none' | 'paid' | 'ultra',
 *   period: 'monthly' | 'yearly' | null, current_period_end: number | null, cancel_at_period_end: boolean,
 *   cancel_at?: number | null, as_of: number, past_due_since?: number }} SubRecord
 * @typedef {{ get(key: string): Promise<any>, put(key: string, v: any): Promise<void>, delete(key: string | string[]): Promise<any>,
 *   list(opts?: { prefix?: string }): Promise<Map<string, any>> }} Storage
 */

const DAY_MS = 86400000;
export const PERIOD_GRACE_MS = DAY_MS;
export const EVENT_KEEP_MS = 30 * DAY_MS;
export const ACCESS = new Set(['active', 'trialing', 'past_due']);
/**
 * Access while a renewal payment keeps failing (decision D5): past_due gives access for this long after the
 * subscription first read past_due, then none, so "leave it past due" when retries run out can never mean a whole
 * unpaid year (and its model cost). Keep it in step with the Smart Retries window (about two weeks), so a card fixed
 * during the retries never loses access.
 */
export const PAST_DUE_GRACE_MS = 14 * DAY_MS;
const STATUSES = new Set(['incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused']);
const RANK = { none: 0, paid: 1, ultra: 2 };
const PRODUCT = /^hushmallow\.(paid|ultra)\.(monthly|yearly)$/;
const CUSTOMER = /^cus_[A-Za-z0-9]{4,250}$/;
const SUBSCRIPTION = /^sub_[A-Za-z0-9]{4,250}$/;
/**
 * Statuses in which a subscription gives no access and is not billing: when one is read, the customer's list decides
 * what the account has (it may have another one). An unpaid one can still come back if its open invoice is paid, so
 * checkout counts it as a subscription held (routes.js HELD_STATUSES).
 */
export const TERMINAL = new Set(['canceled', 'incomplete_expired', 'unpaid']);
/** The most subscription ids a listing may name (stripe.js lists 20). */
const COVERS_MAX = 32;
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
  const endMs = end > 0 ? end * 1000 : null;
  const cancelAt = typeof sub?.cancel_at === 'number' && sub.cancel_at > 0 ? sub.cancel_at * 1000 : null;
  return {
    v: 1, subscription: String(idOf(sub?.id) || ''), customer: idOf(sub?.customer), status, tier, period,
    current_period_end: endMs,
    // the portal cancels "at period end" either way, depending on the API version: the flag, or a cancel_at on the
    // period end (within a day of it). A cancel_at further out is a date of its own (cancel_at; ends_at in the status).
    cancel_at_period_end: sub?.cancel_at_period_end === true
      || (cancelAt != null && endMs != null && Math.abs(cancelAt - endMs) <= DAY_MS && status !== 'canceled'),
    cancel_at: cancelAt,
    as_of: asOf,
  };
}

/** When a past_due record's past_due began: the DO's mark, else (a record from before the mark) when it was read. @param {SubRecord} rec */
const pastDueSince = (rec) => (typeof rec.past_due_since === 'number' ? rec.past_due_since : rec.as_of);

/**
 * The record's period ended more than PERIOD_GRACE_MS before `t`: whatever its status says, it is out of date (a
 * renewal or an end whose events never landed), so it gives no access and decides nothing on its own.
 * @param {SubRecord} rec @param {number} t
 */
export const periodOver = (rec, t) => rec.current_period_end != null && rec.current_period_end + PERIOD_GRACE_MS <= t;

/** The plan this record gives right now. @param {SubRecord | null | undefined} rec @param {number} now */
export function effectiveTier(rec, now) {
  if (!rec || !ACCESS.has(rec.status)) return 'none';
  if (periodOver(rec, now)) return 'none';
  if (rec.status === 'past_due' && now > pastDueSince(rec) + PAST_DUE_GRACE_MS) return 'none';
  return rec.tier;
}

/** Until when this record gives access (for session tokens). @param {SubRecord} rec @param {number} now @param {number} fallbackMs */
export function accessUntil(rec, now, fallbackMs) {
  const until = rec.current_period_end != null ? rec.current_period_end + PERIOD_GRACE_MS : now + fallbackMs;
  return rec.status === 'past_due' ? Math.min(until, pastDueSince(rec) + PAST_DUE_GRACE_MS) : until;
}

/**
 * The record as kept: past_due_since set when the subscription first reads past_due, kept while it stays past_due,
 * gone otherwise. Only the DO decides it (a caller's value is dropped).
 * @param {SubRecord | null} cur @param {SubRecord} rec @returns {SubRecord}
 */
export function withPastDue(cur, rec) {
  const { past_due_since: _caller, ...next } = rec;
  if (next.status !== 'past_due') return next;
  const still = !!cur && cur.subscription === next.subscription && cur.status === 'past_due';
  return { ...next, past_due_since: still ? Math.min(pastDueSince(/** @type {SubRecord} */ (cur)), next.as_of) : next.as_of };
}

/**
 * Does `next` replace `cur`? (the state machine in the header)
 * @param {SubRecord | null} cur @param {SubRecord} next @param {string[] | null} [covers] the subscriptions a listing named, when next is its best
 */
export function supersedes(cur, next, covers = null) {
  if (!cur) return true;
  if (cur.subscription === next.subscription) return next.as_of >= cur.as_of;
  if (covers && covers.includes(cur.subscription) && next.as_of >= cur.as_of) return true;
  // a record whose period was over when `next` was read gives nothing, whatever its status: a lower plan bought
  // after it (its own end lost) replaces it
  const a = ACCESS.has(cur.status) && !periodOver(cur, next.as_of), b = ACCESS.has(next.status) && !periodOver(next, next.as_of);
  if (a !== b) return b;
  if (RANK[next.tier] !== RANK[cur.tier]) return RANK[next.tier] > RANK[cur.tier];
  return next.as_of >= cur.as_of;
}

/**
 * The subscription a customer's listing gives the account: of those giving access now, the higher plan, then the one
 * running longest; when none does, `fallback` (the ended one just read).
 * @param {SubRecord[]} recs @param {number} now @param {SubRecord} fallback
 */
export function bestOf(recs, now, fallback) {
  const live = recs.filter((r) => effectiveTier(r, now) !== 'none');
  if (!live.length) return fallback;
  const score = (/** @type {SubRecord} */ r) => [RANK[r.tier], r.current_period_end ?? 0];
  return live.reduce((a, b) => {
    const [ra, ea] = score(a), [rb, eb] = score(b);
    return rb > ra || (rb === ra && eb > ea) ? b : a;
  });
}

/** @param {unknown} c @returns {c is string[] | undefined} */
const isCovers = (c) => c === undefined || (Array.isArray(c) && c.length <= COVERS_MAX && c.every((x) => typeof x === 'string' && SUBSCRIPTION.test(x)));

/** @param {any} c @returns {c is { id: string, expires_at: number }} */
function isCheckout(c) {
  return !!c && typeof c === 'object' && Object.keys(c).every((k) => k === 'id' || k === 'expires_at')
    && typeof c.id === 'string' && CHECKOUT_SESSION.test(c.id) && Number.isFinite(c.expires_at) && c.expires_at > MS_TIME_MIN;
}

/** An optional time in ms. @param {unknown} v */
const optionalMs = (v) => v == null || Number.isFinite(v);

/** @param {any} r @returns {r is SubRecord} */
function isRecord(r) {
  return !!r && typeof r === 'object' && typeof r.subscription === 'string' && /^sub_/.test(r.subscription)
    && typeof r.status === 'string' && ['none', 'paid', 'ultra'].includes(r.tier) && typeof r.as_of === 'number'
    && optionalMs(r.cancel_at) && optionalMs(r.past_due_since);
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
        if (typeof event !== 'string' || !/^evt_[A-Za-z0-9]{1,250}$/.test(event) || !isRecord(record) || !isCovers(body?.covers)) return bad();
        if (await this.storage.get(`evt:${event}`)) return Response.json({ ok: true, applied: false, duplicate: true });
        const applied = await this.write(record, body.covers);
        await this.storage.put(`evt:${event}`, this.now());
        await this.forgetOldEvents();
        return Response.json({ ok: true, applied, duplicate: false });
      }
      case 'sync': {
        if (!isRecord(body?.record) || !isCovers(body?.covers)) return bad();
        return Response.json({ ok: true, applied: await this.write(body.record, body.covers) });
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

  /** The state machine's write (supersedes): true when `record` replaced the account's. @param {SubRecord} record @param {string[]} [covers] */
  async write(record, covers) {
    const cur = (await this.storage.get('sub')) || null;
    const next = withPastDue(cur, record);
    const applied = supersedes(cur, next, covers || null);
    if (applied) await this.storage.put('sub', next);
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
    /**
     * @param {string} uid @param {string} event @param {SubRecord} record @param {string[] | null} [covers] when record is the best of a listing
     * @returns {Promise<{ ok: boolean, applied: boolean, duplicate: boolean }>}
     */
    apply: (uid, event, record, covers = null) => call(`user:${uid}`, 'apply', { event, record, ...(covers ? { covers } : {}) }),
    /** @param {string} customer @param {string} uid @returns {Promise<{ ok: boolean, uid: string, conflict: boolean }>} */
    link: (customer, uid) => call(`customer:${customer}`, 'link', { uid }),
    /** @param {string} customer @returns {Promise<string | null>} */
    owner: async (customer) => (await call(`customer:${customer}`, 'owner', {})).uid || null,
    /**
     * A record the server read itself (no event id), through the same state machine.
     * @param {string} uid @param {SubRecord} record @param {string[] | null} [covers] @returns {Promise<{ ok: boolean, applied: boolean }>}
     */
    sync: (uid, record, covers = null) => call(`user:${uid}`, 'sync', { record, ...(covers ? { covers } : {}) }),
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
