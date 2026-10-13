// Hushmates Feeling Relay: the single place where the rules are enforced.
//
//   SUBMIT → RELEASE → TRAVEL → CATCH → REFRAME → PASS → RETURN → CHOOSE
//
// In the lab this runs in the page as a local demonstration service; it is
// written the way the backend must behave (docs/RELAY.md maps it onto
// Postgres, RLS and server functions):
//   • every call names a session token; the acting account comes from it;
//   • views are built per viewer: authors and catchers never see each other's
//     identity, and nobody can read a feeling that isn't theirs or offered to them;
//   • a feeling gets at most five perspectives from five different people,
//     never its author, each person once, through an atomic, expiring hold;
//   • holds are capped by the slots left, so two people can never take the
//     same last slot; every write is idempotent (clientId);
//   • nothing circulates without the author's explicit sharing consent;
//   • the Mallow fallback is opt-in, generated at most once per feeling,
//     cached, budgeted, never for safety-flagged text, never counted as a person.

import { RELAY, LABEL_IDS, MALLOW_IDS, REPORT_REASON_IDS, PERSPECTIVE_LABELS } from './relay-config.js';
import { screenFeeling, screenReframe } from './feeling-safety.js';
import { normaliseText, charCount, checkPseudonym } from './text-policy.js';

export class RelayError extends Error {
  constructor(code, message) { super(message || MESSAGES[code] || code); this.name = 'RelayError'; this.code = code; }
}
const MESSAGES = {
  'not-signed-in': 'Please sign in again.',
  'account-inactive': 'This account can’t do that right now.',
  'not-found': 'That isn’t available.',
  'invalid': 'Something in that request wasn’t right.',
  'forbidden': 'That isn’t allowed.',
  'rate-limited': 'That’s a lot in a short time. Please pause for a moment.',
  'too-many-active': `You have ${RELAY.maxActiveJourneys} feelings travelling already. When one comes home, you can send another.`,
  'not-catching': 'Turn on “Let feelings find me” to catch feelings.',
  'hold-expired': 'This feeling drifted on while you were away. Thank you for looking.',
  'not-available': 'This feeling has moved on.',
  'already-contributed': 'You’ve already offered a perspective on this feeling.',
  'fallback-off': 'You chose not to have a Mallow offer a perspective on this feeling.',
  'fallback-not-yet': 'A Mallow perspective becomes available if nobody catches your feeling for a while.',
  'fallback-budget': 'Mallows are resting for today. Your feeling keeps travelling and will still come home.',
  'fallback-held': 'A Mallow can’t offer a perspective while this feeling is with our safety team.',
  'consent-required': 'Please confirm you’re happy to share this anonymously first.',
  'resend-limit': 'This feeling has already travelled a few times. You can keep it with you, or let it go.',
};
const fail = (code, message) => { throw new RelayError(code, message); };

export const CLIENT_METHODS = [
  'me', 'savePreferences',
  'submitFeeling', 'listJourneys', 'getJourney', 'withdrawFeeling', 'askMallow', 'resendJourney', 'setGiftSharing', 'withdrawPerspective',
  'markReturnSeen', 'choosePerspective', 'saveJourney', 'releaseJourney', 'deleteJourney',
  'findFeeling', 'catchFeeling', 'letFloatPast', 'submitReframe', 'myGifts',
  'reportFeeling', 'reportPerspective', 'blockContributor', 'exportMyData', 'deleteMyData',
];
export const MODERATOR_METHODS = ['modListReports', 'modGetReport', 'modResolve', 'modAuditLog'];

function emptyState() {
  return {
    v: 1, accounts: {}, sessions: {}, profiles: {}, journeys: {}, holds: {}, reframes: {}, fallbacks: {},
    exposures: {}, blocks: [], reports: {}, audit: [], rate: {}, daily: {},
  };
}

export class RelayService {
  /**
   * @param {object} o
   *   state      persisted state to resume from
   *   now        clock (the lab advances it)
   *   random     randomness (tests make it deterministic)
   *   provider   async ({ text, label, mallow, maxTokens }) → Mallow perspective (see core/perspectives.js)
   *   limits     overrides for RELAY
   *   cannedExamples  allow fixed development examples (source 'demo') as Mallow perspectives. Lab and
   *                   tests only: a real deployment leaves it off, so testing copy can never reach people
   *                   (a canned answer is then treated as no answer, and the feeling still comes home)
   */
  constructor({ state = null, now = () => Date.now(), random = Math.random, provider = null, limits = {}, cannedExamples = false } = {}) {
    this.cannedExamples = cannedExamples === true;
    this.s = state ? structuredClone(state) : emptyState();
    this.now = now;
    this.random = random;
    this.provider = provider;
    this.L = { ...RELAY, ...limits };
    this.subs = new Map();
    this.onPersist = null;
    this.inflight = new Map();      // journeyId → Promise (Mallow perspective dedupe)
    this.providerCalls = 0;         // observable for tests and the lab
    // a generation that was in flight when the process stopped never finishes: say so
    for (const f of Object.values(this.s.fallbacks)) if (f.status === 'pending') Object.assign(f, { status: 'failed', reason: 'interrupted' });
  }

  get clientMethods() { return [...CLIENT_METHODS, ...MODERATOR_METHODS]; }
  toJSON() { return this.s; }

  // ----------------------------------------------------------- basics --
  _rand(n, alphabet = 'abcdefghijkmnpqrstuvwxyz23456789') {
    let out = '';
    for (let i = 0; i < n; i++) out += alphabet[Math.floor(this.random() * alphabet.length) % alphabet.length];
    return out;
  }
  _id(prefix) { return `${prefix}_${this._rand(14)}`; }
  _save() { this.onPersist?.(this.s); }
  _audit(actor, action, detail = {}) { this.s.audit.push({ id: this._id('aud'), at: this.now(), actor, action, ...detail }); }
  /** Check one or more allowances together; only when all have room is the attempt recorded in each. */
  _rate(accId, ...rules) {
    if (typeof rules[0] === 'string') rules = [rules];          // _rate(acc, kind, max, windowMs)
    const t = this.now();
    const bucket = (this.s.rate[accId] ||= {});
    const lists = rules.map(([kind, , windowMs]) => (bucket[kind] || []).filter((x) => t - x < windowMs));
    rules.forEach(([kind], i) => { bucket[kind] = lists[i]; });
    if (rules.some(([, max], i) => lists[i].length >= max)) fail('rate-limited');
    rules.forEach(([kind], i) => { lists[i].push(t); bucket[kind] = lists[i]; });
  }
  _day() { return new Date(this.now()).toISOString().slice(0, 10); }
  _emit(accId, event) {
    for (const fn of this.subs.get(accId) || []) { try { fn(structuredClone(event)); } catch { /* listener errors never break the service */ } }
  }
  _changed(accIds, scope, id) { for (const a of new Set(accIds)) this._emit(a, { type: 'changed', scope, id }); }

  // Phase 1 only: simulated sign-in for clearly labelled test identities.
  // Phase 2: Supabase Auth (token = the user's JWT, account id = auth.uid()).
  createTestAccount({ key, pseudonym, mallow, role = 'member', catching = true }) {
    const id = this._id('acc');
    this.s.accounts[id] = { id, key, role, state: 'active', test: true, createdAt: this.now() };
    const name = checkPseudonym(pseudonym);
    this.s.profiles[id] = { pseudonym: name.ok ? name.text : 'Mallow', mallow: MALLOW_IDS.includes(mallow) ? mallow : 'noomi', catching: !!catching, notifyReturn: true, onboarded: true };
    this._save();
    return id;
  }
  signInTestAccount(key) {
    const acc = Object.values(this.s.accounts).find((a) => a.key === key && a.state !== 'deleted');
    if (!acc) fail('not-found');
    const token = `tok_${this._rand(32)}`;
    this.s.sessions[token] = acc.id;
    this._save();
    return token;
  }
  _actor(token, { allow = ['active', 'restricted'] } = {}) {
    const id = typeof token === 'string' ? this.s.sessions[token] : undefined;
    const acc = id && this.s.accounts[id];
    if (!acc) fail('not-signed-in');
    if (!allow.includes(acc.state)) fail('account-inactive');
    return acc;
  }
  subscribe(token, fn) {
    const acc = this._actor(token, { allow: ['active', 'restricted', 'suspended'] });
    const set = this.subs.get(acc.id) || new Set();
    set.add(fn);
    this.subs.set(acc.id, set);
    return () => set.delete(fn);
  }
  _blocked(a, b) { return this.s.blocks.some((x) => (x.by === a && x.who === b) || (x.by === b && x.who === a)); }
  _blockedBy(by, who) { return this.s.blocks.some((x) => x.by === by && x.who === who); }

  // ------------------------------------------------------------ profile --
  me(token) {
    const acc = this._actor(token, { allow: ['active', 'restricted', 'suspended'] });
    this.tick();
    const p = this.s.profiles[acc.id];
    const mine = Object.values(this.s.journeys).filter((j) => j.owner === acc.id);
    return {
      accountState: acc.state, test: !!acc.test, isModerator: acc.role === 'moderator',
      profile: { ...p },
      limits: { perspectives: this.L.perspectivesPerFeeling, maxActiveJourneys: this.L.maxActiveJourneys, feelingMaxChars: this.L.feelingMaxChars, reframeMaxChars: this.L.reframeMaxChars },
      travelling: mine.filter((j) => j.status === 'travelling').length,
      homeUnseen: mine.filter((j) => j.status === 'returned' && !j.seenReturn).length,
      activeHold: this._activeHoldOf(acc.id)?.id || null,
      now: this.now(),                                   // the service clock (the lab's dev clock may run ahead)
    };
  }

  savePreferences(token, patch = {}) {
    const acc = this._actor(token, { allow: ['active', 'restricted', 'suspended'] });
    const p = this.s.profiles[acc.id];
    if (!patch || typeof patch !== 'object') fail('invalid');
    const has = (k) => Object.prototype.hasOwnProperty.call(patch, k);
    if (has('catching')) {
      if (patch.catching && acc.state !== 'active') fail('account-inactive');
      p.catching = !!patch.catching;
      if (!p.catching) for (const h of Object.values(this.s.holds)) if (h.user === acc.id && this._holdLive(h)) this._endHold(h, 'released');
    }
    if (has('notifyReturn')) p.notifyReturn = !!patch.notifyReturn;
    if (has('mallow')) { if (!MALLOW_IDS.includes(patch.mallow)) fail('invalid'); p.mallow = patch.mallow; }
    if (has('onboarded')) p.onboarded = !!patch.onboarded;
    this._save();
    return this.me(token);
  }

  // ------------------------------------------------------------- timers --
  /** Expire holds, offer Mallow perspectives, return feelings whose time is up. Idempotent. */
  tick() {
    const t = this.now();
    const touched = new Set();
    for (const h of Object.values(this.s.holds)) {
      if ((h.status === 'offered' || h.status === 'caught') && h.expiresAt <= t) { this._endHold(h, 'expired'); touched.add(h.user); }
    }
    for (const j of Object.values(this.s.journeys)) {
      if (j.status !== 'travelling') continue;
      if (j.expiresAt <= t) { this._return(j, 'expired'); touched.add(j.owner); continue; }
      if (!j.fallbackOfferedAt && this._askable(j)) {
        j.fallbackOfferedAt = t;
        j.events.push({ type: 'mallow-offer', at: t });
        touched.add(j.owner);
      }
    }
    if (touched.size) { this._changed([...touched], 'journeys'); this._save(); }
  }

  // ------------------------------------------------------------ release --
  submitFeeling(token, { text, label = null, mallow, allowFallback = false, consent = false, clientId } = {}) {
    const acc = this._actor(token);
    if (typeof clientId !== 'string' || !/^[a-z0-9_-]{8,64}$/i.test(clientId)) fail('invalid');
    if (label != null && !LABEL_IDS.includes(label)) fail('invalid');
    const screen = screenFeeling(text, { minChars: this.L.feelingMinChars, maxChars: this.L.feelingMaxChars });
    // a safety concern is answered with support first, whatever else is true: never circulated, never stored
    if (!screen.ok && screen.code === 'support') return { status: 'support', level: screen.level, support: screen.support };
    if (!screen.ok) fail(`feeling-${screen.code}`, screen.message);
    // the person must actively agree to share it anonymously; the interface can't skip this
    if (consent !== true) fail('consent-required');
    const dupe = Object.values(this.s.journeys).find((j) => j.owner === acc.id && j.clientId === clientId);
    if (dupe) {
      // a replay must be the same words; a reused id with different words is a client bug, not a release
      if (dupe.status === 'deleted' || dupe.text !== screen.text || dupe.allowFallback !== (allowFallback === true)) fail('invalid', 'This was sent before with different words. Please try again.');
      return { status: 'released', journey: this._journeyView(dupe, acc.id), duplicate: true };
    }
    if (acc.state !== 'active') fail('account-inactive');
    this.tick();
    const travelling = Object.values(this.s.journeys).filter((j) => j.owner === acc.id && j.status === 'travelling').length;
    if (travelling >= this.L.maxActiveJourneys) fail('too-many-active');
    this._rate(acc.id, ['submit-h', this.L.submissionsPerHour, 3600e3], ['submit-d', this.L.submissionsPerDay, 86400e3]);
    const t = this.now();
    const j = {
      id: this._id('jr'), owner: acc.id, clientId, text: screen.text, label,
      mallow: MALLOW_IDS.includes(mallow) ? mallow : this.s.profiles[acc.id].mallow,
      allowFallback: allowFallback === true, consentAt: t, fallbackConsentAt: allowFallback === true ? t : null,
      status: 'travelling', createdAt: t, releasedAt: t, expiresAt: t + this.L.journeyTtlMs, resends: 0,
      lastProgressAt: t, returnedAt: null, returnReason: null, paused: false,
      fallbackOfferedAt: null, seenReturn: false, saved: false, choices: {},
      events: [{ type: 'released', at: t }],
    };
    this.s.journeys[j.id] = j;
    this._changed([acc.id], 'journeys', j.id);
    this._save();
    return { status: 'released', journey: this._journeyView(j, acc.id), duplicate: false };
  }

  // -------------------------------------------------------------- catch --
  _humans(j) { return Object.values(this.s.reframes).filter((r) => r.journeyId === j.id).sort((a, b) => a.slot - b.slot); }
  _holdLive(h) { return (h.status === 'offered' || h.status === 'caught') && h.expiresAt > this.now(); }
  _liveHolds(jid) { return Object.values(this.s.holds).filter((h) => h.journeyId === jid && this._holdLive(h)); }
  _activeHoldOf(user) { return Object.values(this.s.holds).find((h) => h.user === user && this._holdLive(h)) || null; }
  _endHold(h, status) { h.status = status; h.endedAt = this.now(); }
  _exposed(jid, user) { return !!this.s.exposures[`${jid}:${user}`]; }

  _eligible(j, user) {
    if (j.status !== 'travelling' || j.paused || j.owner === user || !j.consentAt) return false;   // nothing circulates without recorded consent
    if (j.expiresAt <= this.now()) return false;
    if (this._exposed(j.id, user)) return false;                         // never shown twice
    if (this._blocked(j.owner, user)) return false;
    const owner = this.s.accounts[j.owner];
    if (!owner || owner.state !== 'active') return false;
    const taken = this._humans(j).length + this._liveHolds(j.id).length;
    return taken < this.L.perspectivesPerFeeling;                         // a slot must be free
  }

  /**
   * Find a feeling for this person: reserve it atomically (an expiring hold),
   * so nobody else can take the same slot. Fair: chosen at random among the
   * few longest-waiting eligible feelings, so older feelings never starve.
   * → { offer } or { offer: null }
   */
  findFeeling(token) {
    const acc = this._actor(token);
    if (acc.state !== 'active') fail('account-inactive');
    if (!this.s.profiles[acc.id].catching) fail('not-catching');
    this.tick();
    const current = this._activeHoldOf(acc.id);
    if (current) return { offer: this._offerView(current) };
    this._rate(acc.id, 'find', this.L.findsPerHour, 3600e3);
    const pool = Object.values(this.s.journeys).filter((j) => this._eligible(j, acc.id))
      .sort((a, b) => a.lastProgressAt - b.lastProgressAt || a.createdAt - b.createdAt)
      .slice(0, this.L.fairnessPool);
    if (!pool.length) return { offer: null };
    const j = pool[Math.floor(this.random() * pool.length) % pool.length];
    const t = this.now();
    const h = { id: this._id('hold'), journeyId: j.id, user: acc.id, status: 'offered', createdAt: t, expiresAt: t + this.L.offerHoldMs };
    this.s.holds[h.id] = h;
    this.s.exposures[`${j.id}:${acc.id}`] = t;
    this._save();
    return { offer: this._offerView(h) };
  }

  _myHold(token, holdId, { live = true } = {}) {
    const acc = this._actor(token);
    this.tick();
    const h = typeof holdId === 'string' ? this.s.holds[holdId] : undefined;
    if (!h || h.user !== acc.id) fail('not-found');
    if (live && acc.state !== 'active') fail('account-inactive');
    if (live && !this._holdLive(h)) fail(h.status === 'expired' ? 'hold-expired' : 'not-available');
    const j = this.s.journeys[h.journeyId];
    if (live && (!j || j.status !== 'travelling' || j.paused || this._blockedBy(j.owner, acc.id))) { this._endHold(h, 'voided'); this._save(); fail('not-available'); }
    return { acc, h, j };
  }

  catchFeeling(token, { holdId } = {}) {
    const { h } = this._myHold(token, holdId);
    if (h.status === 'offered') { h.status = 'caught'; h.caughtAt = this.now(); h.expiresAt = this.now() + this.L.catchHoldMs; this._save(); }
    return { offer: this._offerView(h) };
  }

  letFloatPast(token, { holdId } = {}) {
    const { h } = this._myHold(token, holdId, { live: false });
    if (this._holdLive(h)) { this._endHold(h, 'passed'); this._save(); }
    return { ok: true };                          // nobody is told; it stays out of this person's sky
  }

  submitReframe(token, { holdId, text, clientId, allowShare = false } = {}) {
    const acc = this._actor(token);
    if (typeof clientId !== 'string' || !/^[a-z0-9_-]{8,64}$/i.test(clientId)) fail('invalid');
    const dupe = Object.values(this.s.reframes).find((r) => r.author === acc.id && r.clientId === clientId);
    if (dupe) {
      const held = typeof holdId === 'string' ? this.s.holds[holdId] : undefined;
      if (held && held.user === acc.id && held.journeyId !== dupe.journeyId) fail('invalid', 'Please try again.');
      return this._afterReframe(dupe, acc.id, true);
    }
    const { h, j } = this._myHold(token, holdId);
    if (h.status !== 'caught') fail('invalid', 'Catch the feeling first.');
    if (j.owner === acc.id) fail('forbidden');
    const humans = this._humans(j);
    if (humans.some((r) => r.author === acc.id)) fail('already-contributed');
    if (humans.length >= this.L.perspectivesPerFeeling) { this._endHold(h, 'voided'); this._save(); fail('not-available'); }
    const screen = screenReframe(text, { minChars: this.L.reframeMinChars, maxChars: this.L.reframeMaxChars, earlier: humans.map((r) => r.text), threshold: this.L.similarity });
    if (!screen.ok && screen.code === 'support') {
      // the writer may not be safe: support for them, their words are never stored or passed on,
      // and the feeling floats on to someone else
      this._endHold(h, 'passed');
      this._save();
      return { status: 'support', level: screen.level, support: screen.support };
    }
    if (!screen.ok) fail(`reframe-${screen.code}`, screen.message);
    this._rate(acc.id, 'reframe', this.L.reframesPerHour, 3600e3);
    const t = this.now();
    // if this person has blocked the author, their words still fill the slot (ending the hold would tell
    // them whose feeling it is) but are never shown to the person they blocked
    const r = { id: this._id('pv'), journeyId: j.id, author: acc.id, slot: humans.length + 1, text: screen.text, clientId, at: t, mallow: this.s.profiles[acc.id].mallow, hiddenForOwner: this._blockedBy(acc.id, j.owner), removed: false,
      allowShare: allowShare === true, shareConsentAt: allowShare === true ? t : null };   // may the author include these words in a share picture? (off unless the writer says yes)
    this.s.reframes[r.id] = r;
    this._endHold(h, 'used');
    j.lastProgressAt = t;
    j.events.push({ type: 'perspective', at: t, slot: r.slot });
    if (r.slot >= this.L.perspectivesPerFeeling) this._return(j, 'complete');
    this._changed([j.owner], 'journeys', j.id);
    this._save();
    return this._afterReframe(r, acc.id, false);
  }

  _afterReframe(r, viewer, duplicate) {
    const j = this.s.journeys[r.journeyId];
    // after giving their own, a contributor sees how the others saw it (never who)
    const earlier = j ? this._humans(j).filter((x) => x.slot < r.slot && !x.removed).map((x) => ({ slot: x.slot, text: x.text })) : [];
    return { slot: r.slot, homeward: !!j && j.status !== 'travelling', earlier, duplicate, perspective: { id: r.id, text: r.text } };
  }

  /** What this person has given: their own words, no author details. */
  myGifts(token) {
    const acc = this._actor(token, { allow: ['active', 'restricted', 'suspended'] });
    const list = Object.values(this.s.reframes).filter((r) => r.author === acc.id && !r.removed).sort((a, b) => b.at - a.at);
    return { gifts: list.map((r) => ({ id: r.id, text: r.text, at: r.at, slot: r.slot, allowShare: !!r.allowShare, journeyHome: this.s.journeys[r.journeyId]?.status !== 'travelling' })) };
  }
  /**
   * A writer can take back a perspective they gave: its words are removed for good (the author's count
   * goes down honestly). The slot stays used, as when someone deletes their data, so it never reopens.
   */
  withdrawPerspective(token, { perspectiveId } = {}) {
    const acc = this._actor(token, { allow: ['active', 'restricted', 'suspended'] });
    const r = typeof perspectiveId === 'string' ? this.s.reframes[perspectiveId] : undefined;
    if (!r || r.author !== acc.id || r.removed) fail('not-found');
    Object.assign(r, { text: '', removed: true, withdrawnAt: this.now(), allowShare: false, shareConsentAt: null });
    const j = this.s.journeys[r.journeyId];
    if (j) {
      j.events.push({ type: 'perspective-withdrawn', at: this.now() });
      this._changed([j.owner], 'journeys', j.id);
    }
    this._audit(acc.id, 'withdraw-perspective', { perspectiveId: r.id });
    this._save();
    return this.myGifts(token);
  }

  /** A writer can change their mind about appearing in share pictures. Only their own words. */
  setGiftSharing(token, { perspectiveId, allowShare } = {}) {
    const acc = this._actor(token, { allow: ['active', 'restricted', 'suspended'] });
    const r = typeof perspectiveId === 'string' ? this.s.reframes[perspectiveId] : undefined;
    if (!r || r.author !== acc.id || r.removed) fail('not-found');
    if (allowShare !== true && allowShare !== false) fail('invalid');
    r.allowShare = allowShare;
    r.shareConsentAt = allowShare ? this.now() : null;
    this._changed([this.s.journeys[r.journeyId]?.owner].filter(Boolean), 'journeys', r.journeyId);
    this._save();
    return this.myGifts(token);
  }

  _offerView(h) {
    const j = this.s.journeys[h.journeyId];
    return {
      holdId: h.id, state: h.status, expiresAt: h.expiresAt,
      feeling: { text: j.text, label: j.label, mallow: j.mallow, perspectivesSoFar: this._humans(j).length, of: this.L.perspectivesPerFeeling },
    };
  }

  // ------------------------------------------------------------- return --
  _return(j, reason) {
    if (j.status !== 'travelling') return;
    j.status = 'returned';
    j.returnReason = reason;
    j.returnedAt = this.now();
    j.events.push({ type: 'returned', at: j.returnedAt, reason });
    for (const h of this._liveHolds(j.id)) this._endHold(h, 'voided');
    this._changed([j.owner], 'journeys', j.id);
  }

  /**
   * "Send it out again": a feeling nobody caught can travel once more (a few
   * times at most). It keeps its exposures, so nobody who already let it pass
   * sees it again, and its one Mallow generation, if it used it.
   */
  resendJourney(token, { journeyId, clientId, allowFallback } = {}) {
    const { acc, j } = this._mine(token, journeyId);
    if (typeof clientId !== 'string' || !/^[a-z0-9_-]{8,64}$/i.test(clientId)) fail('invalid');
    // a replay of a resend already applied is answered as a duplicate, whatever happened since (it never sends it out again)
    const usedIds = j.resendClientIds || [];
    if (usedIds.includes(clientId)) return { status: 'released', journey: this._journeyView(j, acc.id), duplicate: true };
    if (j.status !== 'returned' || j.paused || j.returnReason === 'removed') fail('not-available');
    if (this._humans(j).length > 0) fail('not-available', 'Only a feeling nobody caught can be sent out again.');
    if ((j.resends || 0) >= this.L.maxResends) fail('resend-limit');
    if (!j.consentAt) fail('consent-required');
    const screen = screenFeeling(j.text, { minChars: this.L.feelingMinChars, maxChars: this.L.feelingMaxChars });
    if (!screen.ok && screen.code === 'support') return { status: 'support', level: screen.level, support: screen.support };
    if (!screen.ok) fail(`feeling-${screen.code}`, screen.message);
    if (acc.state !== 'active') fail('account-inactive');
    this.tick();
    const travelling = Object.values(this.s.journeys).filter((x) => x.owner === acc.id && x.status === 'travelling').length;
    if (travelling >= this.L.maxActiveJourneys) fail('too-many-active');
    this._rate(acc.id, ['submit-h', this.L.submissionsPerHour, 3600e3], ['submit-d', this.L.submissionsPerDay, 86400e3]);
    const t = this.now();
    Object.assign(j, {
      status: 'travelling', releasedAt: t, expiresAt: t + this.L.journeyTtlMs, lastProgressAt: t,
      returnedAt: null, returnReason: null, seenReturn: false, resends: (j.resends || 0) + 1, resendClientIds: [...usedIds, clientId],
      fallbackOfferedAt: this.s.fallbacks[j.id] ? j.fallbackOfferedAt : null,
    });
    // the Mallow choice can be given or taken back for the new trip; left out, the earlier choice stands
    if (allowFallback === true && !j.allowFallback) { j.allowFallback = true; j.fallbackConsentAt = t; }
    else if (allowFallback === false) { j.allowFallback = false; j.fallbackConsentAt = null; }
    j.events.push({ type: 'resent', at: t });
    this._changed([acc.id], 'journeys', j.id);
    this._save();
    return { status: 'released', journey: this._journeyView(j, acc.id), duplicate: false };
  }

  withdrawFeeling(token, { journeyId } = {}) {
    const { acc, j } = this._mine(token, journeyId);
    if (j.status !== 'travelling') fail('not-available');
    this._return(j, 'withdrawn');
    this._save();
    return this._journeyView(j, acc.id);
  }

  _mine(token, journeyId, opts) {
    const acc = this._actor(token, opts || { allow: ['active', 'restricted', 'suspended'] });
    this.tick();
    const j = typeof journeyId === 'string' ? this.s.journeys[journeyId] : undefined;
    if (!j || j.owner !== acc.id || j.status === 'deleted') fail('not-found');   // same answer whether missing or not yours
    return { acc, j };
  }

  /**
   * What came back. Up to five visible perspectives, humans first. A Mallow's
   * fills a place no person has; once five people have answered it moves to
   * its own optional place (`extra`) so it never hides or inflates the human count.
   */
  _items(j) {
    const humans = this._humans(j).filter((r) => !r.removed && !r.hiddenForOwner).slice(0, this.L.perspectivesPerFeeling);
    const visible = humans.map((r) => ({ id: r.id, kind: 'human', source: 'human', label: PERSPECTIVE_LABELS.human, text: r.text, mallow: r.mallow, slot: r.slot, at: r.at, kept: j.choices[r.id] ?? null, shareable: !!r.allowShare }));
    const f = this.s.fallbacks[j.id];
    let extra = null;
    if (f && f.status === 'ready' && !f.hidden) {
      const item = { id: f.id, kind: 'mallow', source: f.source, label: PERSPECTIVE_LABELS[f.source] || PERSPECTIVE_LABELS.demo, text: f.text, mallow: f.mallow, at: f.at, kept: j.choices[f.id] ?? null };
      if (this._answered(j) < this.L.perspectivesPerFeeling && visible.length < this.L.perspectivesPerFeeling) visible.push(item);
      else extra = item;
    }
    return { visible, extra };
  }
  /** The people whose words still stand (humanCount counts the same people). Slots still use _humans. */
  _answered(j) { return this._humans(j).filter((r) => !r.removed).length; }
  _collection(j) { return this._items(j).visible; }
  _allItems(j) { const { visible, extra } = this._items(j); return extra ? [...visible, extra] : visible; }

  _fallbackView(j) {
    const f = this.s.fallbacks[j.id];
    if (f) {
      const v = { status: f.status, mallow: f.mallow, source: f.source || null, reason: f.reason || null, superseded: f.status === 'ready' && this._answered(j) >= this.L.perspectivesPerFeeling };
      if (f.support && !f.hidden) v.support = structuredClone(f.support);       // the provider's safety gate spoke: show support
      return v;
    }
    if (!j.allowFallback) return { status: 'off' };
    if (j.paused || j.returnReason === 'removed') return { status: 'held' };    // under human review: nothing goes to a provider
    if (this._askable(j)) return { status: 'available', mallow: j.mallow };
    if (this._humans(j).length > 0) return { status: 'not-needed' };            // a person caught it: humans first
    return { status: 'waiting', mallow: j.mallow, availableAt: (j.releasedAt || j.createdAt) + this.L.fallbackAfterMs };
  }
  /**
   * May a Mallow be asked? Opt-in, once per feeling, nothing under review, owner in good standing.
   * While it travels: only after the wait and while nobody has caught it (humans first).
   * Once it is home ("Explore another angle"): whatever came back, the people have had their turn.
   */
  _askable(j) {
    const t = this.now();
    if (!j.allowFallback || this.s.fallbacks[j.id] || j.paused || j.returnReason === 'removed') return false;
    if (this.s.accounts[j.owner]?.state !== 'active') return false;
    if (j.status === 'returned') return true;
    return j.status === 'travelling' && this._humans(j).length === 0 && t - (j.releasedAt || j.createdAt) >= this.L.fallbackAfterMs;
  }

  _journeyView(j, viewer) {
    const humans = this._humans(j).filter((r) => !r.removed);
    const home = j.status !== 'travelling';
    const { visible, extra } = this._items(j);
    const shownMallow = visible.find((x) => x.kind === 'mallow') || null;
    return {
      id: j.id, status: j.status, text: j.text, label: j.label, mallow: j.mallow, allowFallback: j.allowFallback,
      createdAt: j.createdAt, expiresAt: j.expiresAt, returnedAt: j.returnedAt, returnReason: j.returnReason,
      paused: j.paused, humanCount: humans.length, of: this.L.perspectivesPerFeeling,
      petals: humans.map((r) => ({ slot: r.slot, mallow: r.mallow })),          // the orb's luminous layers, no words
      mallowPetal: shownMallow ? { mallow: shownMallow.mallow, source: shownMallow.source } : null,   // only while it is really in the collection
      events: j.events.map((e) => ({ ...e })),                                   // privacy-conscious: no people in it
      fallback: this._fallbackView(j),
      // perspectives are revealed when the feeling comes home; a Mallow's (if asked for) straight away
      collection: home ? visible : visible.filter((x) => x.kind === 'mallow'),
      mallowExtra: extra,                                                        // a Mallow's, kept apart once five people answered
      seenReturn: j.seenReturn, saved: j.saved, resends: j.resends || 0,
      canResend: j.status === 'returned' && !!j.consentAt && this.s.accounts[j.owner]?.state === 'active' && this._humans(j).length === 0
        && !j.paused && j.returnReason !== 'removed' && (j.resends || 0) < this.L.maxResends,
      canExplore: j.status === 'returned' && this._askable({ ...j, allowFallback: true }),   // "Explore another angle", with consent
    };
  }

  listJourneys(token) {
    const acc = this._actor(token, { allow: ['active', 'restricted', 'suspended'] });
    this.tick();
    const mine = Object.values(this.s.journeys).filter((j) => j.owner === acc.id && j.status !== 'deleted')
      .sort((a, b) => b.createdAt - a.createdAt);
    return { journeys: mine.map((j) => this._journeyView(j, acc.id)), now: this.now() };
  }
  getJourney(token, { journeyId } = {}) { const { acc, j } = this._mine(token, journeyId); return this._journeyView(j, acc.id); }

  markReturnSeen(token, { journeyId } = {}) {
    const { acc, j } = this._mine(token, journeyId);
    if (j.status === 'returned' && !j.seenReturn) { j.seenReturn = true; this._save(); this._changed([acc.id], 'journeys', j.id); }
    return { ok: true };
  }
  choosePerspective(token, { journeyId, perspectiveId, keep } = {}) {
    const { acc, j } = this._mine(token, journeyId);
    if (!this._allItems(j).some((p) => p.id === perspectiveId)) fail('not-found');
    if (keep !== true && keep !== false && keep !== null) fail('invalid');
    j.choices[perspectiveId] = keep;
    this._save();
    return this._journeyView(j, acc.id);
  }
  saveJourney(token, { journeyId, saved = true } = {}) {
    const { acc, j } = this._mine(token, journeyId);
    if (j.status === 'travelling') fail('not-available');
    j.saved = !!saved;
    this._save();
    return this._journeyView(j, acc.id);
  }
  /** Let the feeling go: the words are cleared; perspectives you kept stay with you. */
  releaseJourney(token, { journeyId } = {}) {
    const { acc, j } = this._mine(token, journeyId);
    if (j.status === 'travelling') this._return(j, 'withdrawn');
    j.status = 'released';
    j.text = '';
    j.releasedAt = this.now();
    for (const p of this._allItems(j)) if (j.choices[p.id] !== true) this._forget(j, p);
    const f = this.s.fallbacks[j.id];
    if (f && j.choices[f.id] !== true) this._wipeFallback(j);               // let go: its words go too
    this._changed([acc.id], 'journeys', j.id);
    this._save();
    return this._journeyView(j, acc.id);
  }
  deleteJourney(token, { journeyId, confirm } = {}) {
    const { acc, j } = this._mine(token, journeyId);
    if (confirm !== 'DELETE') fail('invalid');
    if (j.status === 'travelling') this._return(j, 'withdrawn');
    for (const r of this._humans(j)) { r.text = ''; r.removed = true; }
    this._wipeFallback(j);
    j.text = ''; j.status = 'deleted'; j.events = []; j.choices = {};
    this._changed([acc.id], 'journeys', j.id);
    this._save();
    return { deleted: true };
  }
  _wipeFallback(j) {
    const f = this.s.fallbacks[j.id];
    if (!f) return;
    Object.assign(f, { text: '', hidden: true, support: null });
    if (f.status === 'pending') Object.assign(f, { status: 'failed', reason: 'withdrawn' });   // a late answer is dropped
  }
  _forget(j, p) {
    if (p.kind === 'human') { const r = this.s.reframes[p.id]; if (r) r.hiddenForOwner = true; }
    else { const f = this.s.fallbacks[j.id]; if (f) f.hidden = true; }
  }

  // ------------------------------------------------- Mallow perspective --
  /**
   * The optional fallback. Human first: only when the owner allowed it, after
   * fallbackAfterMs with no human perspective. At most one generation per
   * feeling, ever: concurrent and repeated requests share the same result.
   */
  async askMallow(token, { journeyId, consent } = {}) {
    const { acc, j } = this._mine(token, journeyId);
    const existing = this.s.fallbacks[j.id];
    if (existing) { if (this.inflight.has(j.id)) await this.inflight.get(j.id); return this._journeyView(j, acc.id); }
    // "Explore another angle": the person can opt in now, with the same disclosure, but the consent
    // is recorded only once the request is accepted (never for a refused one)
    const optIn = !j.allowFallback && consent === true;
    if (!j.allowFallback && !optIn) fail('fallback-off');
    if (acc.state !== 'active') fail('account-inactive');
    if (j.paused || j.returnReason === 'removed') fail('fallback-held');
    if (!this._askable(optIn ? { ...j, allowFallback: true } : j)) fail('fallback-not-yet');
    // budgets: per person per day and the whole service per day
    const day = this._day();
    const used = (this.s.daily[day] ||= { global: 0, people: {} });
    if (used.global >= this.L.fallbackGlobalPerDay || (used.people[acc.id] || 0) >= this.L.fallbackPerPersonPerDay) fail('fallback-budget');
    used.global += 1;
    used.people[acc.id] = (used.people[acc.id] || 0) + 1;
    if (optIn) { j.allowFallback = true; j.fallbackConsentAt = this.now(); }
    const mallow = j.mallow;                // the author's own Mallow offers it, in its own voice
    const f = { id: this._id('mp'), journeyId: j.id, status: 'pending', mallow, source: null, text: '', at: this.now(), requestedBy: acc.id };
    this.s.fallbacks[j.id] = f;           // reserved before the call: a second request can never start another
    this._save();
    const run = (async () => {
      // defence in depth: text is re-checked; flagged or held text never reaches a provider
      const screen = screenFeeling(j.text, { maxChars: this.L.feelingMaxChars });
      if (!screen.ok || j.paused || !this.provider) {
        Object.assign(f, { status: 'failed', reason: !this.provider && screen.ok && !j.paused ? 'unconfigured' : 'safety' });
        return;
      }
      let r;
      try {
        this.providerCalls += 1;
        let timer;
        const deadline = new Promise((resolve) => { timer = setTimeout(() => resolve({ status: 'unavailable', reason: 'timeout' }), this.L.fallbackTimeoutMs); });
        try { r = await Promise.race([this.provider({ text: j.text, label: j.label, mallow, maxTokens: this.L.fallbackMaxOutputTokens }), deadline]); }
        finally { clearTimeout(timer); }
      } catch {
        r = { status: 'unavailable', reason: 'error' };
      }
      // the person may have let go of it, deleted it, or left while we waited: a late answer is dropped
      if (this.s.fallbacks[j.id] !== f || f.hidden || f.status !== 'pending' || j.status === 'deleted' || j.status === 'released') {
        Object.assign(f, { status: 'failed', reason: f.reason || 'withdrawn', text: '' });
        return;
      }
      if (r?.status === 'support') {
        // the provider's safety gate saw danger the rules missed: stop the journey, bring support, ask a person to look
        Object.assign(f, { status: 'failed', reason: 'safety', support: r.support || null });
        this._holdForSafety(j, 'The Mallow provider’s safety check flagged this feeling.');
        return;
      }
      const canned = r?.source === 'demo' || !['ai', 'library', 'demo'].includes(r?.source);
      const clean = r && r.status === 'ok' && (!canned || this.cannedExamples) ? normaliseText(r.text) : '';
      // the provider's words meet the same standard as a person's (kind, no diagnosis, no contact details)
      const fit = clean && screenReframe(clean, { minChars: 1, maxChars: 600 }).ok;
      if (fit) {
        Object.assign(f, { status: 'ready', text: clean, mallow,   // the Mallow the person asked, whatever the provider picked
           source: ['ai', 'library', 'demo'].includes(r.source) ? r.source : 'demo', model: r.model || null, at: this.now(),
           voice: r.mallow && r.mallow !== mallow ? r.mallow : null });   // a provider that chose another character (recorded, for the team)
        j.events.push({ type: 'mallow-perspective', at: this.now() });
      } else {
        Object.assign(f, { status: 'failed', reason: r?.reason === 'timeout' ? 'timeout' : 'unavailable' });   // the feeling still comes home
      }
    })();
    this.inflight.set(j.id, run);
    try { await run; } finally { this.inflight.delete(j.id); }
    this._changed([acc.id], 'journeys', j.id);
    this._save();
    return this._journeyView(j, acc.id);
  }

  /** Pause a feeling, end anyone's hold on it, and put it in front of a person on the safety team. */
  _holdForSafety(j, details) {
    j.paused = true;
    for (const h of this._liveHolds(j.id)) this._endHold(h, 'voided');
    const rep = {
      id: this._id('rep'), at: this.now(), by: 'system', kind: 'feeling', journeyId: j.id, perspectiveId: null, reason: 'safety', details,
      subject: j.owner, status: 'open', notes: [], urgent: true, evidence: { feeling: j.text },
    };
    this.s.reports[rep.id] = rep;
    this._audit('system', 'report.created', { report: rep.id, kind: 'feeling', reason: 'safety' });
  }

  // -------------------------------------------------- reports and blocks --
  _report(acc, { kind, journeyId, perspectiveId = null, reason, details = '' }) {
    if (!REPORT_REASON_IDS.includes(reason)) fail('invalid', 'Choose what best describes it.');
    const note = normaliseText(details);
    if (charCount(note) > 600) fail('invalid', 'Please keep the details under 600 characters.');
    this._rate(acc.id, 'report', this.L.reportsPerDay, 86400e3);
    const j = this.s.journeys[journeyId];
    const r = perspectiveId ? (this.s.reframes[perspectiveId] || null) : null;
    const rep = {
      id: this._id('rep'), at: this.now(), by: acc.id, kind, journeyId, perspectiveId, reason, details: note,
      subject: kind === 'feeling' ? j.owner : (r?.author || null), status: 'open', notes: [],
      urgent: reason === 'safety',
      evidence: kind === 'feeling' ? { feeling: j.text } : { feeling: j.text, perspective: r?.text ?? this.s.fallbacks[journeyId]?.text ?? '' },
    };
    this.s.reports[rep.id] = rep;
    this._audit(acc.id, 'report.created', { report: rep.id, kind, reason });
    return rep;
  }

  /** A catcher reports the feeling they were offered. It leaves their sky; enough reports pause it. */
  reportFeeling(token, { holdId, reason, details } = {}) {
    const acc = this._actor(token, { allow: ['active', 'restricted', 'suspended'] });
    const h = typeof holdId === 'string' ? this.s.holds[holdId] : undefined;
    if (!h || h.user !== acc.id) fail('not-found');
    const j = this.s.journeys[h.journeyId];
    if (!j) fail('not-found');
    const mineOnIt = Object.values(this.s.reports).filter((x) => x.kind === 'feeling' && x.journeyId === j.id && x.by === acc.id);
    const open = mineOnIt.find((x) => x.status === 'open');
    if (open) { if (this._holdLive(h)) this._endHold(h, 'reported'); this._save(); return { received: true, reportId: open.id, expectation: this._expectation(open) }; }
    const rep = this._report(acc, { kind: 'feeling', journeyId: j.id, reason, details });
    if (this._holdLive(h)) this._endHold(h, 'reported');
    // a moderator already looked at this person's report on this feeling: a new one waits for review, it can't pause it alone
    const answered = mineOnIt.length > 0;
    const reporters = new Set(Object.values(this.s.reports).filter((x) => x.kind === 'feeling' && x.journeyId === j.id && x.status === 'open' && x.by !== 'system').map((x) => x.by));
    if (!answered && (reporters.size >= this.L.reportsToPause || reason === 'safety')) {
      j.paused = true;
      for (const x of this._liveHolds(j.id)) this._endHold(x, 'voided');
    }
    this._save();
    return { received: true, reportId: rep.id, expectation: this._expectation(rep) };
  }

  /** The owner reports a perspective: it disappears from their collection straight away. */
  reportPerspective(token, { journeyId, perspectiveId, reason, details } = {}) {
    const { acc, j } = this._mine(token, journeyId);
    const item = this._allItems(j).find((p) => p.id === perspectiveId);
    if (!item) fail('not-found');
    const rep = this._report(acc, { kind: 'perspective', journeyId: j.id, perspectiveId, reason, details });
    this._forget(j, item);
    this._save();
    return { received: true, reportId: rep.id, expectation: this._expectation(rep), journey: this._journeyView(j, acc.id) };
  }

  /** Never meet this person again in the relay, without either side learning who. */
  blockContributor(token, { journeyId, perspectiveId, holdId } = {}) {
    const acc = this._actor(token, { allow: ['active', 'restricted', 'suspended'] });
    let other = null;
    if (holdId) {
      const h = this.s.holds[holdId];
      if (!h || h.user !== acc.id) fail('not-found');
      other = this.s.journeys[h.journeyId]?.owner;
      if (this._holdLive(h)) this._endHold(h, 'passed');
    } else {
      const { j } = this._mine(token, journeyId);
      const r = this.s.reframes[perspectiveId];
      if (!r || r.journeyId !== j.id) fail('not-found');
      other = r.author;
      r.hiddenForOwner = true;
    }
    if (!other || other === acc.id) fail('not-found');
    if (!this._blockedBy(acc.id, other)) this.s.blocks.push({ by: acc.id, who: other, at: this.now() });
    // from now on: nothing of theirs reaches you, including words already written on your other feelings,
    // and any feeling of yours they are holding drifts on (they are not told why)
    for (const h of Object.values(this.s.holds)) if (this._holdLive(h) && h.user === other && this.s.journeys[h.journeyId]?.owner === acc.id) this._endHold(h, 'voided');
    for (const r of Object.values(this.s.reframes)) if (r.author === other && this.s.journeys[r.journeyId]?.owner === acc.id) r.hiddenForOwner = true;
    this._save();
    return { blocked: true };
  }

  _expectation(rep) {
    return rep.urgent
      ? 'Thank you. This is marked as a priority for our human safety team (we aim to look within 24 hours during the pilot). If anyone is in immediate danger, contact local emergency services now.'
      : 'Thank you. A person on our safety team will review this. During the pilot we aim to review reports within 48 hours. Nobody is told who reported.';
  }

  // ----------------------------------------------------------- your data --
  exportMyData(token) {
    const acc = this._actor(token, { allow: ['active', 'restricted', 'suspended'] });
    return {
      exportedAt: new Date(this.now()).toISOString(),
      note: 'Your Hushmates data: your feelings and what came back, and the perspectives you gave. Other people never appear by name.',
      profile: { ...this.s.profiles[acc.id] },
      // when each choice was made: sharing anonymously, and (if given) letting a Mallow offer a perspective
      journeys: this.listJourneys(token).journeys.map((v) => ({ ...v, consentAt: this.s.journeys[v.id].consentAt ?? null, fallbackConsentAt: this.s.journeys[v.id].fallbackConsentAt ?? null })),
      gifts: this.myGifts(token).gifts,
    };
  }

  /** Close the account's Hushmates data: feelings deleted, given perspectives withdrawn, sessions ended. */
  deleteMyData(token, { confirm } = {}) {
    const acc = this._actor(token, { allow: ['active', 'restricted', 'suspended'] });
    if (confirm !== 'DELETE') fail('invalid');
    for (const j of Object.values(this.s.journeys)) {
      if (j.owner !== acc.id || j.status === 'deleted') continue;
      if (j.status === 'travelling') this._return(j, 'withdrawn');
      for (const r of this._humans(j)) { r.text = ''; r.removed = true; }
      this._wipeFallback(j);
      j.text = ''; j.status = 'deleted'; j.events = []; j.choices = {};
    }
    // perspectives this person gave leave the collections they were in
    for (const r of Object.values(this.s.reframes)) if (r.author === acc.id) { r.text = ''; r.removed = true; }
    for (const h of Object.values(this.s.holds)) if (h.user === acc.id && this._holdLive(h)) this._endHold(h, 'voided');
    for (const [tok, id] of Object.entries(this.s.sessions)) if (id === acc.id) delete this.s.sessions[tok];
    acc.state = 'deleted';
    this.s.profiles[acc.id] = { pseudonym: 'A former Mallow', mallow: 'noomi', catching: false };
    this._audit(acc.id, 'account.deleted');
    this._save();
    return { deleted: true };
  }

  // ---------------------------------------------------------- moderation --
  _moderator(token) {
    const acc = this._actor(token);
    if (acc.role !== 'moderator') fail('forbidden');
    return acc;
  }
  modListReports(token) {
    const mod = this._moderator(token);
    this._audit(mod.id, 'mod.list-reports');
    return { reports: Object.values(this.s.reports).sort((a, b) => (b.urgent - a.urgent) || (a.at - b.at))
      .map((r) => ({ id: r.id, at: r.at, kind: r.kind, reason: r.reason, urgent: r.urgent, status: r.status })) };
  }
  modGetReport(token, { id } = {}) {
    const mod = this._moderator(token);
    const r = this.s.reports[id];
    if (!r) fail('not-found');
    this._audit(mod.id, 'mod.view-report', { report: id });
    return { ...structuredClone(r), subjectRef: r.subject };
  }
  modResolve(token, { id, action, note = '' } = {}) {
    const mod = this._moderator(token);
    const r = this.s.reports[id];
    if (!r) fail('not-found');
    const j = this.s.journeys[r.journeyId];
    if (action === 'dismiss') r.status = 'no-action';
    else if (action === 'resume-feeling' && j) { j.paused = false; r.status = 'no-action'; }
    else if (action === 'remove-feeling' && j) { j.paused = true; if (j.status === 'travelling') this._return(j, 'removed'); r.status = 'actioned'; }
    else if (action === 'remove-perspective' && r.perspectiveId) { const x = this.s.reframes[r.perspectiveId]; if (x) x.removed = true; r.status = 'actioned'; }
    else if (action === 'restrict-user' && r.subject) {
      const a = this.s.accounts[r.subject];
      if (a && a.role !== 'moderator') {
        a.state = 'restricted';
        if (this.s.profiles[a.id]) this.s.profiles[a.id].catching = false;
        for (const h of Object.values(this.s.holds)) if (h.user === a.id && this._holdLive(h)) this._endHold(h, 'voided');
      }
      r.status = 'actioned';
    }
    else fail('invalid');
    if (note) r.notes.push({ by: mod.id, at: this.now(), text: normaliseText(note).slice(0, 1000) });
    this._audit(mod.id, 'mod.resolve', { report: id, action });
    this._save();
    return { id, status: r.status };
  }
  modAuditLog(token) { const mod = this._moderator(token); this._audit(mod.id, 'mod.view-audit'); return { entries: this.s.audit.slice(-200) }; }
}
