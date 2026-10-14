// The Mallow, server side: which source answers, within which limits, and what it cost.
//
// Runs in the Hushmates Edge Function (Deno) and under Node in tests: Web APIs only
// (setTimeout, AbortController, crypto.subtle), everything else injected.
//
//   · The Reframe library is the default and costs nothing. It answers whenever AI is
//     off, not configured, over its limits, slow, failing or unsafe.
//   · AI (Another Angle) is asked only when the owner's server-side switch is on
//     (settings.ai.enabled === true), a provider is configured, and the call fits the
//     monthly AUD cap, the person's daily allowance and the service's daily ceiling.
//     The cost is estimated before the call, so the ledger never passes the cap.
//   · Words that need care are never sent anywhere: the answer is support, not a perspective.
//   · Whatever comes back meets the same standard as a person's perspective
//     (screenReframe), and is labelled with its real source: an AI answer is never
//     called library, and a library answer never called AI.
//
// createMallow({ library, ai, settings, usage, now, log })
//   library   async ({ text, label, mallow, avoid, attempt }) → library answer   (core/perspectives.js libraryProvider())
//   ai        async ({ text, label, mallow, estimateAud, signal }) → AI answer, or null (ai-another-angle.js)
//             Only the words, the label and the Mallow are sent: never who wrote them or which feeling it is.
//   settings  () → { ai: { enabled, monthlyCapAud, perMemberDaily, perDayGlobal, timeoutMs, model, costPerCallAud, cacheTtlMs } }
//             (sync or async; the database's hushmates.settings; anything missing or odd keeps AI off)
//   usage     the AI ledger (below); the database implements it, createMemoryUsage() is the reference
//   now       () → ms
//   log       { info?, warn?, error? }  metadata only: never anyone's words
//
// The usage interface (every method may be async):
//   aiSpentThisMonthAud(at)        → number   estimated A$ recorded (and held) this calendar month, UTC
//   aiCallsToday(memberId, at)     → number   AI attempts by this member today (UTC), whatever their outcome
//   aiCallsTodayGlobal(at)         → number   AI attempts by everyone today (UTC)
//   recordAi({ id, memberId, journeyId, provider, model, inputTokens, outputTokens, costAud, status, reason, ms, at })
//                                              one row per AI attempt (costAud 0 when nothing was billed);
//                                              with `id`, it settles the hold reserveAi made
//   reserveAi({ memberId, journeyId, costAud, at, limits: { monthlyCapAud, perMemberDaily, perDayGlobal } })   optional
//                                  → { ok: true, id } | { ok: false, reason: 'over-budget' | 'member-daily' | 'global-daily' }
//                                              checks the three limits and holds costAud in ONE atomic step (a
//                                              database transaction with a row lock), so two requests at once
//                                              can't both take the last room. Without it the three reads are
//                                              used, and holds are kept in this instance only.
//   recentAngles(memberId, limit)  → [angleId, …]  optional; newest first: library lines this member was shown
//   recordLibrary({ memberId, journeyId, angleId, at })   optional; a database can instead derive
//                                              recentAngles from the stored Mallow perspectives' angle ids
//
// perspective({ text, label, mallow, memberId, journeyId, recentAngles })
//   → { status: 'ok', text, source: 'ai' | 'library', model, angleId?, mallow, voice? }
//   → { status: 'support', level }                       words that need care: no perspective
//   → { status: 'unavailable', reason }

import { screenFeeling, screenReframe, normaliseText, charCount, LABEL_IDS } from './deps.js';
// (the vendored copy of core/relay-config.js that tools/sync-edge.mjs keeps byte-identical, so a deploy carries it)
import { MALLOW_IDS } from './vendor/hushmates-lab/core/relay-config.js';

const SCREEN = { minChars: 1, maxChars: 600 };   // a Mallow perspective's standard (as in core/relay.js)
const AI_MAX_CHARS = 600;                         // Another Angle accepts 1–600 characters
const LIBRARY_TRIES = 3;                          // a library line that fails screening: try the next one, at most 3
const RECENT = 12;                                // how many recent library lines a person is steered away from
const CACHE_MAX = 500;

// The perspective standard, also read with straight apostrophes: some rules are written for "you're"
// and a phone's curly "you’re" would otherwise slip past them.
function screened(text) {
  const words = normaliseText(typeof text === 'string' ? text : '');
  const sc = screenReframe(words, SCREEN);
  if (!sc.ok) return sc;
  const straight = screenReframe(words.replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"'), SCREEN);
  return straight.ok ? sc : straight;
}

const micros = (aud) => Math.round(aud * 1e6);    // money is compared in millionths of a dollar, never as floats
const toNum = (v) => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN);
const clamp = (v, lo, hi, d) => { const n = toNum(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };

/** The owner's AI settings, read strictly: anything missing or malformed keeps AI off or at zero. */
export function readAiSettings(raw) {
  const a = raw && typeof raw === 'object' && raw.ai && typeof raw.ai === 'object' ? raw.ai : {};
  const cost = toNum(a.costPerCallAud);
  return {
    enabled: a.enabled === true,
    monthlyCapAud: clamp(a.monthlyCapAud, 0, 1e6, 0),
    perMemberDaily: Math.floor(clamp(a.perMemberDaily, 0, 1e6, 0)),
    perDayGlobal: Math.floor(clamp(a.perDayGlobal, 0, 1e9, 0)),
    timeoutMs: clamp(a.timeoutMs, 500, 120e3, 20e3),
    model: typeof a.model === 'string' && a.model ? a.model : 'another-angle',
    costPerCallAud: Number.isFinite(cost) && cost > 0 ? cost : null,      // no estimate, no AI: a free guess would dodge the cap
    cacheTtlMs: clamp(a.cacheTtlMs, 0, 24 * 3600e3, 3600e3),
  };
}

const TIMED_OUT = Symbol('timed-out');
function withDeadline(start, ms) {
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  let timer;
  const deadline = new Promise((resolve) => { timer = setTimeout(() => { ctl?.abort(); resolve(TIMED_OUT); }, ms); });
  return Promise.race([Promise.resolve().then(() => start(ctl?.signal)), deadline]).finally(() => clearTimeout(timer));
}

async function sha256(text) {
  if (!globalThis.crypto?.subtle) return null;
  const buf = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function createMallow({ library, ai = null, settings = () => ({}), usage = null, now = () => Date.now(), log = null } = {}) {
  if (typeof library !== 'function') throw new TypeError('createMallow needs the Reframe library provider');
  const aiName = (ai && ai.providerName) || 'another-angle';
  const pending = { aud: 0, global: 0, members: new Map() };   // AI calls in flight in this instance (µA$ and counts)
  const cache = new Map();                                     // per person: the same words never pay twice in a row
  const inflight = new Map();                                  // one generation per feeling, even if asked twice at once
  let ledgerBroken = false;                                    // if a call can't be recorded, stop spending until restart
  const note = (level, msg, meta) => { try { log?.[level]?.(msg, meta); } catch { /* logging never breaks the Mallow */ } };

  // ------------------------------------------------------------ budget --
  async function reserve(s, memberId, journeyId) {
    const at = now();
    const limits = { monthlyCapAud: s.monthlyCapAud, perMemberDaily: s.perMemberDaily, perDayGlobal: s.perDayGlobal };
    if (typeof usage?.reserveAi === 'function') {
      const r = await usage.reserveAi({ memberId, journeyId, costAud: s.costPerCallAud, at, limits });
      return r?.ok ? { ok: true, id: r.id ?? null, local: false } : { ok: false, reason: r?.reason || 'over-budget' };
    }
    if (!usage || ['aiSpentThisMonthAud', 'aiCallsToday', 'aiCallsTodayGlobal', 'recordAi'].some((k) => typeof usage[k] !== 'function')) {
      return { ok: false, reason: 'no-ledger' };
    }
    const [spent, mine, all] = (await Promise.all([usage.aiSpentThisMonthAud(at), usage.aiCallsToday(memberId, at), usage.aiCallsTodayGlobal(at)])).map(toNum);
    if (![spent, mine, all].every(Number.isFinite)) return { ok: false, reason: 'ledger-unreadable' };
    // the reads above were awaited: anything held since then (by this instance) is counted now
    if (micros(spent) + pending.aud + micros(s.costPerCallAud) > micros(s.monthlyCapAud)) return { ok: false, reason: 'over-budget' };
    if (mine + (pending.members.get(memberId) || 0) >= s.perMemberDaily) return { ok: false, reason: 'member-daily' };
    if (all + pending.global >= s.perDayGlobal) return { ok: false, reason: 'global-daily' };
    pending.aud += micros(s.costPerCallAud);
    pending.global += 1;
    pending.members.set(memberId, (pending.members.get(memberId) || 0) + 1);
    return { ok: true, id: null, local: true };
  }
  function release(hold, s, memberId) {
    if (!hold?.local) return;
    pending.aud -= micros(s.costPerCallAud);
    pending.global -= 1;
    const n = (pending.members.get(memberId) || 1) - 1;
    if (n > 0) pending.members.set(memberId, n); else pending.members.delete(memberId);
  }

  // ------------------------------------------------------------- cache --
  async function cacheKey(memberId, label, mallow, words) {
    try { return await sha256(`${memberId}\u0000${label}\u0000${mallow}\u0000${words}`); } catch { return null; }
  }
  function cacheGet(key) {
    const e = key && cache.get(key);
    if (!e) return null;
    if (e.until <= now()) { cache.delete(key); return null; }
    return e.value;
  }
  function cachePut(key, memberId, value, ttl) {
    if (!key || ttl <= 0) return;
    cache.set(key, { member: memberId, value, until: now() + ttl });
    while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
  }

  // ---------------------------------------------------------------- AI --
  /** → { answer } when AI answered (ok or support), else { why } and the library answers. */
  async function fromAi(s, { words, label, mallow, memberId, journeyId }) {
    if (ledgerBroken) return { why: 'ledger-error' };
    if (s.costPerCallAud == null) return { why: 'no-cost-estimate' };
    const key = await cacheKey(memberId, label, mallow, words);
    const cached = cacheGet(key);
    if (cached) return { answer: { ...cached }, why: 'cached' };
    let hold;
    try { hold = await reserve(s, memberId, journeyId); } catch { return { why: 'ledger-unreadable' }; }
    if (!hold.ok) return { why: hold.reason };
    const t0 = now();
    let r;
    let status;
    try {
      try {
        r = await withDeadline((signal) => ai({ text: words, label, mallow, estimateAud: s.costPerCallAud, signal }), s.timeoutMs);
      } catch { r = { status: 'unavailable', reason: 'error' }; }
      if (r === TIMED_OUT) r = { status: 'unavailable', reason: 'timeout' };
      let answer = null;
      if (r?.status === 'support') {
        // the provider's safety check spoke: support, never a perspective
        status = 'support';
        answer = { status: 'support', level: r.level === 'crisis' ? 'crisis' : 'care' };
      } else if (r?.status === 'ok' && r.source === 'ai') {
        const sc = screened(r.text);
        if (sc.ok) {
          status = 'ok';
          answer = { status: 'ok', text: sc.text, source: 'ai', model: (typeof r.model === 'string' && r.model) || s.model, mallow,
            ...(MALLOW_IDS.includes(r.mallow) && r.mallow !== mallow ? { voice: r.mallow } : {}) };
        } else status = 'rejected';                            // fails the standard a person's words meet
      } else status = r?.status === 'ok' ? 'not-ai' : 'unavailable';   // e.g. a mock answer: never shown as AI
      // what it cost: the provider's own figure when it gives one, otherwise the estimate (assume it was billed)
      const stated = toNum(r?.costAud);
      const costAud = Number.isFinite(stated) && stated >= 0 ? stated : s.costPerCallAud;
      try {
        await usage.recordAi({ id: hold.id, memberId, journeyId, provider: aiName, model: (typeof r?.model === 'string' && r.model) || s.model,
          inputTokens: Number.isFinite(r?.inputTokens) ? r.inputTokens : null, outputTokens: Number.isFinite(r?.outputTokens) ? r.outputTokens : null,
          costAud, status, reason: r?.reason || null, ms: Math.max(0, now() - t0), at: now() });
      } catch (e) {
        ledgerBroken = true;
        note('error', 'Mallow: an AI call could not be recorded; AI paused until restart', { error: e?.message });
      }
      if (answer?.status === 'ok') cachePut(key, memberId, answer, s.cacheTtlMs);
      return answer ? { answer } : { why: status === 'unavailable' ? (r?.reason || 'unavailable') : status };
    } finally { release(hold, s, memberId); }
  }

  // ----------------------------------------------------------- library --
  async function fromLibrary({ words, label, mallow, memberId, journeyId, recentAngles }) {
    const avoid = [];
    const take = (list) => { for (const x of Array.isArray(list) ? list : []) if (typeof x === 'string' && x && !avoid.includes(x)) avoid.push(x); };
    take(recentAngles);
    if (memberId && typeof usage?.recentAngles === 'function') {
      try { take(await usage.recentAngles(memberId, RECENT)); } catch { /* variety is nice to have, never a reason to fail */ }
    }
    for (let attempt = 0; attempt < LIBRARY_TRIES; attempt++) {
      let r;
      try { r = await library({ text: words, label, mallow, avoid: avoid.slice(), attempt }); } catch { r = { status: 'unavailable', reason: 'error' }; }
      if (r?.status === 'support') return { status: 'support', level: r.level === 'crisis' ? 'crisis' : 'care' };
      if (r?.status !== 'ok') return { status: 'unavailable', reason: r?.reason || 'no-perspective' };
      if (r.source !== 'library') return { status: 'unavailable', reason: 'mislabelled' };   // never relabel anything as library
      const sc = screened(r.text);
      if (sc.ok) {
        const angleId = typeof r.angleId === 'string' && r.angleId ? r.angleId : null;
        if (angleId && memberId && typeof usage?.recordLibrary === 'function') {
          try { await usage.recordLibrary({ memberId, journeyId, angleId, at: now() }); } catch { /* as above */ }
        }
        return { status: 'ok', text: sc.text, source: 'library', model: r.model || 'reframe-library', ...(angleId ? { angleId } : {}),
          mallow: MALLOW_IDS.includes(r.mallow) ? r.mallow : mallow };
      }
      if (typeof r.angleId === 'string' && r.angleId) avoid.unshift(r.angleId);   // that line, newest: the next try steers away
    }
    return { status: 'unavailable', reason: 'screening' };
  }

  // -------------------------------------------------------- perspective --
  async function answer({ text, label = null, mallow = null, memberId = null, journeyId = null, recentAngles = [] } = {}) {
    const t0 = now();
    const words = normaliseText(typeof text === 'string' ? text : '');
    const done = (r, aiNote) => { note('info', 'Mallow perspective', { status: r.status, source: r.source || null, ai: aiNote, reason: r.reason || null, ms: now() - t0 }); return r; };
    if (!words) return done({ status: 'unavailable', reason: 'empty' }, 'skipped');
    // words that need care are never sent to any provider and never get a perspective
    const feeling = screenFeeling(words, { minChars: 1, maxChars: Infinity });
    if (!feeling.ok && feeling.code === 'support') return done({ status: 'support', level: feeling.level === 'crisis' ? 'crisis' : 'care' }, 'skipped');
    const args = { words, label: LABEL_IDS.includes(label) ? label : null, mallow: MALLOW_IDS.includes(mallow) ? mallow : 'loomi', memberId, journeyId, recentAngles };
    let s;
    let why = 'off';
    try { s = readAiSettings(await settings()); } catch { s = readAiSettings(null); why = 'settings-error'; }
    if (s.enabled) {
      why = typeof ai !== 'function' ? 'unconfigured'
        : !memberId ? 'no-member'                                 // every AI call is someone's, for the daily limits
          : !feeling.ok ? 'not-shareable'                         // contact details or identifying words stay with us
            : charCount(words) > AI_MAX_CHARS ? 'too-long' : null;
      if (!why) {
        const r = await fromAi(s, args);
        if (r.answer) return done(r.answer, r.why || 'used');
        why = r.why;
      }
    }
    return done(await fromLibrary(args), why);
  }

  return {
    perspective(args = {}) {
      const id = args?.journeyId;
      if (!id) return answer(args);
      if (inflight.has(id)) return inflight.get(id);
      const p = answer(args).finally(() => inflight.delete(id));
      inflight.set(id, p);
      return p;
    },
    /** Drop anything cached for a person (their account or data was deleted). */
    forgetMember(memberId) { for (const [k, e] of cache) if (e.member === memberId) cache.delete(k); },
    clearCache() { cache.clear(); },
  };
}

// --------------------------------------------------- in-memory ledger --
const dayOf = (t) => new Date(t).toISOString().slice(0, 10);
const monthOf = (t) => new Date(t).toISOString().slice(0, 7);

/** The usage interface in memory: the reference for tests and the lab (the database implements the same). */
export function createMemoryUsage({ now = () => Date.now() } = {}) {
  const ai = [];        // { id, at, memberId, journeyId, provider, model, inputTokens, outputTokens, costAud, status, reason, ms, held }
  const shown = [];     // { at, memberId, journeyId, angleId }
  let seq = 0;
  const spent = (at) => ai.filter((r) => monthOf(r.at) === monthOf(at)).reduce((n, r) => n + micros(r.costAud), 0);
  const calls = (at, memberId) => ai.filter((r) => dayOf(r.at) === dayOf(at) && (memberId === undefined || r.memberId === memberId)).length;
  return {
    async aiSpentThisMonthAud(at = now()) { return spent(at) / 1e6; },
    async aiCallsToday(memberId, at = now()) { return calls(at, memberId); },
    async aiCallsTodayGlobal(at = now()) { return calls(at); },
    async reserveAi({ memberId, journeyId = null, costAud, at = now(), limits = {} }) {
      // check and hold with no await in between: atomic in a single-threaded runtime
      if (spent(at) + micros(costAud) > micros(limits.monthlyCapAud ?? 0)) return { ok: false, reason: 'over-budget' };
      if (calls(at, memberId) >= (limits.perMemberDaily ?? 0)) return { ok: false, reason: 'member-daily' };
      if (calls(at) >= (limits.perDayGlobal ?? 0)) return { ok: false, reason: 'global-daily' };
      const id = `ai-${++seq}`;
      ai.push({ id, at, memberId, journeyId, provider: null, model: null, inputTokens: null, outputTokens: null, costAud, status: 'held', reason: null, ms: null, held: true });
      return { ok: true, id };
    },
    async recordAi(row) {
      const r = { inputTokens: null, outputTokens: null, reason: null, ...row, at: row.at ?? now(), held: false };
      const i = r.id ? ai.findIndex((x) => x.id === r.id) : -1;
      if (i >= 0) ai[i] = { ...ai[i], ...r, at: ai[i].at };
      else ai.push({ ...r, id: r.id || `ai-${++seq}` });
    },
    async recentAngles(memberId, limit = 12) {
      return shown.filter((x) => x.memberId === memberId).sort((a, b) => b.at - a.at || b.n - a.n).slice(0, limit).map((x) => x.angleId);
    },
    async recordLibrary({ memberId, journeyId = null, angleId, at = now() }) { shown.push({ memberId, journeyId, angleId, at, n: shown.length }); },
    /** For tests: a copy of the ledger rows. */
    rows() { return ai.map((r) => ({ ...r })); },
  };
}
