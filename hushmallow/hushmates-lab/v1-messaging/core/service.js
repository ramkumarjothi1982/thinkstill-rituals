// Hushmates service — the single place where the rules are enforced.
//
// In the lab it runs in the page as a *local demonstration service*; it is
// not a production backend. It is written as one would write the backend:
//   • every call names a session token, and the acting account is resolved
//     from it; no method accepts a user id from the caller;
//   • every read returns a view built for that viewer (other people appear
//     only as an opaque handle, a pseudonym and a Mallow — never an account
//     id, e-mail or anything from registration);
//   • consent, blocks, limits, rate limits and text rules are checked here,
//     whatever the interface does;
//   • realtime events go only to the participants concerned, and carry only
//     what that participant could fetch anyway.
// Phase 2 maps the same rules onto Postgres (RLS + security-definer
// functions) and Supabase Realtime; see docs/ARCHITECTURE.md.

import {
  LIMITS, AVATARS, INTENT_IDS, STYLE_IDS, INTERESTS, LANGUAGES, AVAILABILITY_IDS, STATUS_IDS,
  REPORT_CATEGORY_IDS, URGENT_CATEGORIES, REPORT_STATUSES,
} from './config.js';
import { checkMessage, checkPseudonym, normaliseText, charCount } from './text-policy.js';

export class ServiceError extends Error {
  constructor(code, message) {
    super(message || MESSAGES[code] || code);
    this.name = 'ServiceError';
    this.code = code;
  }
}

const MESSAGES = {
  'not-signed-in': 'Please sign in again.',
  'account-inactive': 'This account can’t do that right now.',
  'no-profile': 'Create your Mallow identity first.',
  'not-found': 'That isn’t available.',
  'not-available': 'This Mallow isn’t taking invitations from you right now.',
  'self': 'That’s you!',
  'already-connected': 'You’re already Hushmates.',
  'already-invited': 'There’s already an invitation waiting between you.',
  'they-invited-you': 'They’ve already invited you. Have a look in your invitations.',
  'limit-reached': `You have ${LIMITS.maxActiveHushmates} Hushmates, the most for now. You can step back from one to make room.`,
  'their-limit-reached': 'They have as many Hushmates as they can have right now.',
  'too-many-pending': 'You have a few invitations waiting already. Give them a little time.',
  'rate-limited': 'That’s a lot in a short time. Please pause for a moment.',
  'closed': 'This Hushspace has closed.',
  'invalid': 'Something in that request wasn’t right.',
  'forbidden': 'That isn’t allowed.',
  'expired': 'That invitation has expired.',
  'bad-code': 'That code didn’t match. Check it with the person who shared it.',
  'name-taken': 'Someone already uses that name. Try another.',
};
const fail = (code, message) => { throw new ServiceError(code, message); };

// Methods a signed-in client may call through the network. Nothing else
// (underscored helpers, seeding, inspection) is reachable from a client.
export const CLIENT_METHODS = [
  'me', 'saveProfile', 'regenerateInviteCode',
  'discover', 'sendInvitation', 'redeemInviteCode', 'listInvitations', 'respondToInvitation', 'cancelInvitation',
  'listHushmates', 'removeHushmate', 'getConversation', 'getMessages', 'sendMessage', 'deleteMessage', 'markRead',
  'setIntent', 'setConversationQuiet', 'setConversationMuted',
  'block', 'unblock', 'listBlocked', 'report', 'exportMyData', 'deleteMyIdentity',
];
// Callable only by accounts with the moderator role; every call is audited.
export const MODERATOR_METHODS = ['modListReports', 'modGetReport', 'modUpdateReport', 'modSetAccountState', 'modAuditLog'];

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function emptyState() {
  return {
    v: 1, accounts: {}, sessions: {}, profiles: {}, handles: {}, codes: {},
    invitations: {}, connections: {}, conversations: {}, messages: {},
    blocks: [], quiet: [], reports: {}, audit: [], rate: {},
  };
}

export class HushmatesService {
  constructor({ state = null, now = () => Date.now(), random = Math.random, limits = {} } = {}) {
    this.s = state ? structuredClone(state) : emptyState();
    this.now = now;
    this.random = random;
    this.L = { ...LIMITS, ...limits };
    this.subs = new Map();       // accountId -> Set<fn>
    this.onPersist = null;       // set by the lab to save state
  }

  toJSON() { return this.s; }

  // ------------------------------------------------------------ ids --
  _rand(n, alphabet = 'abcdefghijkmnpqrstuvwxyz23456789') {
    let out = '';
    for (let i = 0; i < n; i++) out += alphabet[Math.floor(this.random() * alphabet.length) % alphabet.length];
    return out;
  }
  _id(prefix) { return `${prefix}_${this._rand(14)}`; }

  // ------------------------------------------------- authentication --
  // Phase 1 only: simulated authentication for clearly labelled test
  // accounts. Phase 2 replaces this with Supabase Auth (the token is the
  // user's JWT and the account id is auth.uid()).
  createTestAccount({ key, email, role = 'member' }) {
    const id = this._id('acc');
    this.s.accounts[id] = { id, key, email, role, state: 'active', test: true, createdAt: this.now() };
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
  _profiled(token, opts) {
    const acc = this._actor(token, opts);
    const p = this.s.profiles[acc.id];
    if (!p) fail('no-profile');
    return { acc, p };
  }
  _byHandle(handle) {
    const id = typeof handle === 'string' ? this.s.handles[handle] : undefined;
    const acc = id && this.s.accounts[id];
    const p = id && this.s.profiles[id];
    return acc && p ? { acc, p } : null;
  }

  // ------------------------------------------------------- helpers --
  _save() { this.onPersist?.(this.s); }
  _audit(actor, action, detail = {}) {
    this.s.audit.push({ id: this._id('aud'), at: this.now(), actor, action, ...detail });
  }
  _rate(accId, kind, max, windowMs) {
    const t = this.now();
    const bucket = (this.s.rate[accId] ||= {});
    const list = (bucket[kind] || []).filter((x) => t - x < windowMs);
    if (list.length >= max) { bucket[kind] = list; fail('rate-limited'); }
    list.push(t);
    bucket[kind] = list;
  }
  _blockedEitherWay(a, b) {
    return this.s.blocks.some((x) => (x.by === a && x.who === b) || (x.by === b && x.who === a));
  }
  // `who` may not start an invitation to `protectedId` (after a decline,
  // a disconnect, or an unblock) until it lapses or `protectedId` invites them.
  _inQuietPeriod(protectedId, who) {
    const t = this.now();
    return this.s.quiet.some((q) => q.protects === protectedId && q.from === who && q.until > t);
  }
  _addQuiet(protectedId, from, until) {
    this.s.quiet = this.s.quiet.filter((q) => !(q.protects === protectedId && q.from === from));
    this.s.quiet.push({ protects: protectedId, from, until });
  }
  _activeConnections(accId) {
    return Object.values(this.s.connections).filter((c) => c.status === 'active' && c.members.includes(accId));
  }
  _connectionBetween(a, b) {
    return Object.values(this.s.connections).find((c) => c.status === 'active' && c.members.includes(a) && c.members.includes(b));
  }
  _expireInvitations() {
    const t = this.now();
    for (const inv of Object.values(this.s.invitations)) {
      if (inv.status === 'pending' && inv.expiresAt <= t) { inv.status = 'expired'; inv.closedAt = t; }
    }
  }
  _pendingBetween(a, b) {
    return Object.values(this.s.invitations).find((i) => i.status === 'pending' &&
      ((i.from === a && i.to === b) || (i.from === b && i.to === a)));
  }
  _emit(accId, event) {
    for (const fn of this.subs.get(accId) || []) {
      try { fn(structuredClone(event)); } catch { /* a broken listener must not break the service */ }
    }
  }
  _changed(accIds, scope, id) { for (const a of new Set(accIds)) this._emit(a, { type: 'changed', scope, id }); }

  subscribe(token, fn) {
    const acc = this._actor(token, { allow: ['active', 'restricted', 'suspended'] });
    const set = this.subs.get(acc.id) || new Set();
    set.add(fn);
    this.subs.set(acc.id, set);
    return () => set.delete(fn);
  }

  // ------------------------------------------------------- views --
  _publicCard(p, viewerId) {
    const inv = viewerId ? this._pendingBetween(viewerId, this.s.handles[p.handle]) : null;
    return {
      handle: p.handle, pseudonym: p.pseudonym, avatar: p.avatar, interests: [...p.interests],
      style: p.style, language: p.language, availability: p.availability,
      acceptingInvites: p.acceptingInvites, test: !!this.s.accounts[this.s.handles[p.handle]]?.test,
      invitation: inv ? (inv.from === viewerId ? 'sent' : 'received') : null,
    };
  }
  _person(accId) {
    const p = this.s.profiles[accId];
    const acc = this.s.accounts[accId];
    if (!p || !acc || acc.state === 'deleted') return { handle: null, pseudonym: 'A former Mallow', avatar: null, test: false };
    return { handle: p.handle, pseudonym: p.pseudonym, avatar: p.avatar, test: !!acc.test };
  }
  _messageView(m, viewerId) {
    return {
      id: m.id, seq: m.seq, mine: m.from === viewerId, at: m.at,
      body: m.deletedAt ? '' : m.body, deleted: !!m.deletedAt, clientId: m.from === viewerId ? m.clientId : undefined,
    };
  }
  _conversationView(conv, viewerId) {
    const other = conv.members.find((x) => x !== viewerId);
    const op = this.s.profiles[other];
    const msgs = this.s.messages[conv.id] || [];
    const lastRead = conv.lastRead[viewerId] || 0;
    const unread = msgs.filter((m) => m.seq > lastRead && m.from !== viewerId && !m.deletedAt).length;
    const last = msgs[msgs.length - 1];
    return {
      id: conv.id, open: conv.status === 'open', createdAt: conv.createdAt,
      closedByMe: conv.status !== 'open' && conv.closedBy === viewerId ? conv.closedReason : null,
      other: { ...this._person(other), status: op ? op.status : null },
      intent: { mine: conv.intent[viewerId] || null, theirs: conv.intent[other] || null },
      quiet: { mine: !!conv.quiet[viewerId], theirs: !!conv.quiet[other] },
      muted: !!conv.muted[viewerId],
      unread, lastSeq: conv.seq, lastAt: last ? last.at : conv.createdAt,
    };
  }
  _member(token, conversationId) {
    const acc = this._actor(token, { allow: ['active', 'restricted', 'suspended'] });
    const conv = typeof conversationId === 'string' ? this.s.conversations[conversationId] : undefined;
    // same answer whether it doesn't exist or isn't yours: nothing to probe
    if (!conv || !conv.members.includes(acc.id)) fail('not-found');
    return { acc, conv };
  }

  // ------------------------------------------------------- profile --
  me(token) {
    const acc = this._actor(token, { allow: ['active', 'restricted', 'suspended'] });
    const p = this.s.profiles[acc.id];
    this._expireInvitations();
    return {
      accountState: acc.state, test: !!acc.test, isModerator: acc.role === 'moderator',
      limits: { maxActiveHushmates: this.L.maxActiveHushmates, messageMaxChars: this.L.messageMaxChars },
      profile: p ? { ...p, interests: [...p.interests] } : null,
      activeHushmates: this._activeConnections(acc.id).length,
      pendingReceived: Object.values(this.s.invitations).filter((i) => i.to === acc.id && i.status === 'pending').length,
    };
  }

  saveProfile(token, patch = {}) {
    const acc = this._actor(token);
    if (!patch || typeof patch !== 'object') fail('invalid');
    const existing = this.s.profiles[acc.id];
    const next = existing ? { ...existing } : {
      handle: null, pseudonym: '', avatar: 'noomi', interests: [], style: 'gentle', language: 'English',
      availability: 'varies', discoverable: false, acceptingInvites: true, status: 'available',
      inviteCode: null, createdAt: this.now(),
    };
    const has = (k) => Object.prototype.hasOwnProperty.call(patch, k);
    if (has('pseudonym') || !existing) {
      const r = checkPseudonym(patch.pseudonym);
      if (!r.ok) fail('invalid', r.message);
      const taken = Object.entries(this.s.profiles).some(([id, p]) => id !== acc.id && p.pseudonym.toLowerCase() === r.text.toLowerCase());
      if (taken) fail('name-taken');
      next.pseudonym = r.text;
    }
    if (has('avatar')) { if (!AVATARS.includes(patch.avatar)) fail('invalid'); next.avatar = patch.avatar; }
    if (has('interests')) {
      const list = Array.isArray(patch.interests) ? [...new Set(patch.interests)] : null;
      if (!list || list.length > this.L.maxInterests || !list.every((x) => INTERESTS.includes(x))) fail('invalid', `Choose up to ${this.L.maxInterests} interests from the list.`);
      next.interests = list;
    }
    if (has('style')) { if (!STYLE_IDS.includes(patch.style)) fail('invalid'); next.style = patch.style; }
    if (has('language')) { if (!LANGUAGES.includes(patch.language)) fail('invalid'); next.language = patch.language; }
    if (has('availability')) { if (!AVAILABILITY_IDS.includes(patch.availability)) fail('invalid'); next.availability = patch.availability; }
    if (has('status')) { if (!STATUS_IDS.includes(patch.status)) fail('invalid'); next.status = patch.status; }
    if (has('acceptingInvites')) next.acceptingInvites = !!patch.acceptingInvites;
    if (has('discoverable')) {
      if (patch.discoverable && acc.state !== 'active') fail('account-inactive');
      next.discoverable = !!patch.discoverable;
    }
    if (!next.handle) {
      next.handle = `h_${this._rand(12)}`;
      this.s.handles[next.handle] = acc.id;
    }
    if (!next.inviteCode) this._newCode(acc.id, next);
    next.updatedAt = this.now();
    this.s.profiles[acc.id] = next;
    // people connected to me see my pseudonym, Mallow and status
    const peers = this._activeConnections(acc.id).flatMap((c) => c.members);
    this._changed([acc.id, ...peers], 'hushmates');
    this._save();
    return this.me(token);
  }

  _newCode(accId, profile) {
    if (profile.inviteCode) delete this.s.codes[profile.inviteCode];
    let code;
    do { code = `${this._rand(4, CODE_ALPHABET)}-${this._rand(4, CODE_ALPHABET)}`; } while (this.s.codes[code]);
    profile.inviteCode = code;
    this.s.codes[code] = accId;
  }
  regenerateInviteCode(token) {
    const { acc, p } = this._profiled(token);
    this._newCode(acc.id, p);
    this._save();
    return { inviteCode: p.inviteCode };
  }

  // ----------------------------------------------------- discovery --
  // Only people who opted in, filtered by what they chose to show, in a
  // fixed order (shared interests first, then a stable daily rotation so the
  // same few people are not always on top). No inference of any kind.
  discover(token, { style = null, interests = [] } = {}) {
    const { acc } = this._profiled(token);
    if (acc.state !== 'active') fail('account-inactive');
    this._rate(acc.id, 'discover', this.L.discoverPerHour, 3600e3);
    if (style != null && !STYLE_IDS.includes(style)) fail('invalid');
    const wanted = Array.isArray(interests) ? interests.filter((x) => INTERESTS.includes(x)) : [];
    this._expireInvitations();
    const day = Math.floor(this.now() / 86400e3);
    const rows = [];
    for (const [id, p] of Object.entries(this.s.profiles)) {
      const other = this.s.accounts[id];
      if (id === acc.id || !other || other.state !== 'active' || !p.discoverable) continue;
      if (this._blockedEitherWay(acc.id, id) || this._connectionBetween(acc.id, id)) continue;
      if (this._inQuietPeriod(id, acc.id)) continue;
      if (style && p.style !== style) continue;
      const shared = wanted.filter((x) => p.interests.includes(x)).length;
      if (wanted.length && !shared) continue;
      rows.push({ p, shared, spin: hash(`${p.handle}:${day}`) });
    }
    rows.sort((a, b) => b.shared - a.shared || a.spin - b.spin);
    return { cards: rows.slice(0, this.L.discoverCap).map((r) => this._publicCard(r.p, acc.id)), cap: this.L.discoverCap };
  }

  // --------------------------------------------------- invitations --
  sendInvitation(token, { handle } = {}) {
    const { acc } = this._profiled(token);
    const target = this._byHandle(handle);
    // a hidden, unknown, blocked or paused person all look the same from outside
    if (!target || !target.p.discoverable) fail('not-available');
    return this._invite(acc, target, 'discovery');
  }

  redeemInviteCode(token, { code } = {}) {
    const { acc } = this._profiled(token);
    this._rate(acc.id, 'code', this.L.codeAttemptsPerHour, 3600e3);
    const clean = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const key = clean.length === 8 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : '';
    const id = this.s.codes[key];
    if (!id) fail('bad-code');
    const target = { acc: this.s.accounts[id], p: this.s.profiles[id] };
    if (!target.acc || !target.p) fail('bad-code');
    return this._invite(acc, target, 'code');
  }

  _invite(acc, target, via) {
    if (acc.state !== 'active') fail('account-inactive');
    if (target.acc.id === acc.id) fail('self');
    this._expireInvitations();
    if (this._activeConnections(acc.id).length >= this.L.maxActiveHushmates) fail('limit-reached');
    if (target.acc.state !== 'active' || !target.p.acceptingInvites) fail('not-available');
    if (this._blockedEitherWay(acc.id, target.acc.id) || this._inQuietPeriod(target.acc.id, acc.id)) fail('not-available');
    if (this._connectionBetween(acc.id, target.acc.id)) fail('already-connected');
    const pending = this._pendingBetween(acc.id, target.acc.id);
    if (pending) fail(pending.from === acc.id ? 'already-invited' : 'they-invited-you');
    const outgoing = Object.values(this.s.invitations).filter((i) => i.from === acc.id && i.status === 'pending').length;
    if (outgoing >= this.L.maxPendingOutgoing) fail('too-many-pending');
    this._rate(acc.id, 'invite', this.L.invitesPerDay, 86400e3);
    const t = this.now();
    const inv = { id: this._id('inv'), from: acc.id, to: target.acc.id, via, status: 'pending', createdAt: t, expiresAt: t + this.L.inviteTtlMs };
    this.s.invitations[inv.id] = inv;
    // inviting someone is explicit permission for them to reach you again
    this.s.quiet = this.s.quiet.filter((q) => !(q.protects === acc.id && q.from === target.acc.id));
    this._changed([acc.id, target.acc.id], 'invitations', inv.id);
    this._save();
    return this._invitationView(inv, acc.id);
  }

  _invitationView(inv, viewerId) {
    const incoming = inv.to === viewerId;
    const otherId = incoming ? inv.from : inv.to;
    const other = this._person(otherId);
    const p = this.s.profiles[otherId];
    return {
      id: inv.id, direction: incoming ? 'received' : 'sent', status: inv.status, via: inv.via,
      createdAt: inv.createdAt, expiresAt: inv.expiresAt, closedAt: inv.closedAt || null,
      other: incoming && p ? { ...other, interests: [...p.interests], style: p.style, language: p.language, availability: p.availability } : other,
      conversationId: inv.status === 'accepted' ? inv.conversationId : null,
    };
  }

  listInvitations(token) {
    const acc = this._actor(token, { allow: ['active', 'restricted', 'suspended'] });
    this._expireInvitations();
    const mine = Object.values(this.s.invitations)
      .filter((i) => i.from === acc.id || i.to === acc.id)
      // nothing from someone either side has blocked shows up as an incoming invitation
      .filter((i) => i.from === acc.id || !this._blockedEitherWay(i.from, i.to))
      .sort((a, b) => b.createdAt - a.createdAt);
    return { invitations: mine.map((i) => this._invitationView(i, acc.id)) };
  }

  respondToInvitation(token, { id, accept } = {}) {
    const { acc } = this._profiled(token);
    this._expireInvitations();
    const inv = typeof id === 'string' ? this.s.invitations[id] : undefined;
    if (!inv || inv.to !== acc.id) fail('not-found');
    if (inv.status === 'expired') fail('expired');
    if (inv.status !== 'pending') fail('not-found');
    const t = this.now();
    if (!accept) {
      inv.status = 'declined'; inv.closedAt = t;
      // the sender can't simply ask again
      this._addQuiet(acc.id, inv.from, t + this.L.quietPeriodMs);
      this._changed([inv.from, inv.to], 'invitations', inv.id);
      this._save();
      return this._invitationView(inv, acc.id);
    }
    if (acc.state !== 'active') fail('account-inactive');
    const from = this.s.accounts[inv.from];
    if (!from || from.state !== 'active' || !this.s.profiles[inv.from] || this._blockedEitherWay(inv.from, acc.id)) {
      inv.status = 'expired'; inv.closedAt = t; this._save();
      fail('not-available', 'This invitation is no longer available.');
    }
    // limits are checked again at acceptance (both sides): a burst of
    // invitations can't push anyone past the maximum. In Postgres this runs
    // in one transaction holding row locks on both people (see ARCHITECTURE).
    if (this._activeConnections(acc.id).length >= this.L.maxActiveHushmates) fail('limit-reached');
    if (this._activeConnections(inv.from).length >= this.L.maxActiveHushmates) fail('their-limit-reached');
    if (this._connectionBetween(acc.id, inv.from)) fail('already-connected');
    const connection = { id: this._id('con'), members: [inv.from, acc.id], status: 'active', createdAt: t };
    const conv = {
      id: this._id('hs'), connectionId: connection.id, members: [inv.from, acc.id], status: 'open', createdAt: t,
      seq: 0, intent: {}, quiet: {}, muted: {}, lastRead: {},
    };
    connection.conversationId = conv.id;
    this.s.connections[connection.id] = connection;
    this.s.conversations[conv.id] = conv;
    this.s.messages[conv.id] = [];
    inv.status = 'accepted'; inv.closedAt = t; inv.conversationId = conv.id;
    this._changed([inv.from, acc.id], 'invitations', inv.id);
    this._changed([inv.from, acc.id], 'hushmates', conv.id);
    this._save();
    return this._invitationView(inv, acc.id);
  }

  cancelInvitation(token, { id } = {}) {
    const acc = this._actor(token, { allow: ['active', 'restricted', 'suspended'] });
    const inv = typeof id === 'string' ? this.s.invitations[id] : undefined;
    if (!inv || inv.from !== acc.id || inv.status !== 'pending') fail('not-found');
    inv.status = 'cancelled'; inv.closedAt = this.now();
    this._changed([inv.from, inv.to], 'invitations', inv.id);
    this._save();
    return this._invitationView(inv, acc.id);
  }

  // ----------------------------------------------------- hushmates --
  listHushmates(token) {
    const acc = this._actor(token, { allow: ['active', 'restricted', 'suspended'] });
    const convs = Object.values(this.s.conversations).filter((c) => c.members.includes(acc.id));
    const views = convs.map((c) => this._conversationView(c, acc.id)).sort((a, b) => (b.open - a.open) || (b.lastAt - a.lastAt));
    return { hushmates: views, active: views.filter((v) => v.open).length, max: this.L.maxActiveHushmates };
  }

  _close(conv, byId, reason) {
    if (conv.status === 'open') {
      conv.status = 'closed'; conv.closedAt = this.now(); conv.closedBy = byId; conv.closedReason = reason;
    }
    const connection = this.s.connections[conv.connectionId];
    if (connection && connection.status === 'active') { connection.status = 'ended'; connection.endedAt = this.now(); }
    this._changed(conv.members, 'hushmates', conv.id);
  }

  removeHushmate(token, { conversationId } = {}) {
    const { acc, conv } = this._member(token, conversationId);
    if (conv.status !== 'open') fail('closed');
    const other = conv.members.find((x) => x !== acc.id);
    this._close(conv, acc.id, 'disconnected');
    // no explanation needed, and no immediate re-invitation from the other side
    this._addQuiet(acc.id, other, this.now() + this.L.quietPeriodMs);
    this._save();
    return this._conversationView(conv, acc.id);
  }

  // --------------------------------------------------- conversations --
  getConversation(token, { conversationId } = {}) {
    const { acc, conv } = this._member(token, conversationId);
    return this._conversationView(conv, acc.id);
  }

  getMessages(token, { conversationId, beforeSeq = null, afterSeq = null, limit } = {}) {
    const { acc, conv } = this._member(token, conversationId);
    const n = Math.max(1, Math.min(this.L.pageSize, Number(limit) || this.L.pageSize));
    const all = this.s.messages[conv.id] || [];
    let list;
    let hasMore = false;
    if (afterSeq != null) {
      list = all.filter((m) => m.seq > Number(afterSeq)).slice(0, 200);
    } else {
      const upto = beforeSeq != null ? all.filter((m) => m.seq < Number(beforeSeq)) : all;
      list = upto.slice(-n);
      hasMore = upto.length > list.length;
    }
    return { messages: list.map((m) => this._messageView(m, acc.id)), hasMore };
  }

  sendMessage(token, { conversationId, body, clientId } = {}) {
    const { acc, conv } = this._member(token, conversationId);
    if (acc.state === 'suspended') fail('account-inactive');
    if (conv.status !== 'open') fail('closed');
    const other = conv.members.find((x) => x !== acc.id);
    if (this._blockedEitherWay(acc.id, other) || !this._connectionBetween(acc.id, other)) fail('closed');
    if (typeof clientId !== 'string' || !/^[a-z0-9_-]{8,64}$/i.test(clientId)) fail('invalid');
    const list = this.s.messages[conv.id];
    // a retried send (same clientId) returns the original: never a duplicate
    const dupe = list.find((m) => m.from === acc.id && m.clientId === clientId);
    if (dupe) return { message: this._messageView(dupe, acc.id), duplicate: true };
    const r = checkMessage(body, { maxChars: this.L.messageMaxChars });
    if (!r.ok) fail(`text-${r.code}`, r.message);
    this._rate(acc.id, 'msg-min', this.L.messagesPerMinute, 60e3);
    this._rate(acc.id, 'msg-day', this.L.messagesPerDay, 86400e3);
    conv.seq += 1;
    const m = { id: this._id('msg'), seq: conv.seq, from: acc.id, body: r.text, clientId, at: this.now(), deletedAt: null };
    list.push(m);
    conv.lastRead[acc.id] = conv.seq;
    for (const member of conv.members) {
      this._emit(member, { type: 'message', conversationId: conv.id, message: this._messageView(m, member) });
    }
    this._save();
    return { message: this._messageView(m, acc.id), duplicate: false };
  }

  deleteMessage(token, { conversationId, messageId } = {}) {
    const { acc, conv } = this._member(token, conversationId);
    const m = (this.s.messages[conv.id] || []).find((x) => x.id === messageId);
    if (!m || m.from !== acc.id) fail('not-found');
    if (!m.deletedAt) { m.deletedAt = this.now(); m.body = ''; }
    for (const member of conv.members) {
      this._emit(member, { type: 'message', conversationId: conv.id, message: this._messageView(m, member) });
    }
    this._save();
    return { message: this._messageView(m, acc.id) };
  }

  markRead(token, { conversationId, seq } = {}) {
    const { acc, conv } = this._member(token, conversationId);
    const s = Math.max(0, Math.min(conv.seq, Math.floor(Number(seq) || 0)));
    // private to the reader: never sent to the other person (no read receipts)
    if (s > (conv.lastRead[acc.id] || 0)) { conv.lastRead[acc.id] = s; this._emit(acc.id, { type: 'changed', scope: 'hushmates', id: conv.id }); this._save(); }
    return { ok: true };
  }

  setIntent(token, { conversationId, intent } = {}) {
    const { acc, conv } = this._member(token, conversationId);
    if (acc.state === 'suspended') fail('account-inactive');
    if (conv.status !== 'open') fail('closed');
    if (intent !== null && !INTENT_IDS.includes(intent)) fail('invalid');
    conv.intent[acc.id] = intent;
    this._changed(conv.members, 'conversation', conv.id);
    this._save();
    return this._conversationView(conv, acc.id);
  }

  setConversationQuiet(token, { conversationId, quiet } = {}) {
    const { acc, conv } = this._member(token, conversationId);
    conv.quiet[acc.id] = !!quiet;
    this._changed(conv.members, 'conversation', conv.id);
    this._save();
    return this._conversationView(conv, acc.id);
  }

  setConversationMuted(token, { conversationId, muted } = {}) {
    const { acc, conv } = this._member(token, conversationId);
    conv.muted[acc.id] = !!muted;      // private: only the person who muted knows
    this._changed([acc.id], 'conversation', conv.id);
    this._save();
    return this._conversationView(conv, acc.id);
  }

  // ------------------------------------------------- block / report --
  block(token, { handle } = {}) {
    const acc = this._actor(token, { allow: ['active', 'restricted', 'suspended'] });
    const target = this._byHandle(handle);
    if (!target || target.acc.id === acc.id) fail('not-found');
    const other = target.acc.id;
    if (!this.s.blocks.some((b) => b.by === acc.id && b.who === other)) {
      this.s.blocks.push({ by: acc.id, who: other, at: this.now(), handle: target.p.handle, pseudonym: target.p.pseudonym, avatar: target.p.avatar });
    }
    for (const conv of Object.values(this.s.conversations)) {
      if (conv.members.includes(acc.id) && conv.members.includes(other)) this._close(conv, acc.id, 'blocked');
    }
    for (const inv of Object.values(this.s.invitations)) {
      if (inv.status === 'pending' && ((inv.from === acc.id && inv.to === other) || (inv.from === other && inv.to === acc.id))) {
        inv.status = 'cancelled'; inv.closedAt = this.now();
      }
    }
    this._changed([acc.id, other], 'invitations');
    this._save();
    return { blocked: true };
  }

  unblock(token, { handle } = {}) {
    const acc = this._actor(token, { allow: ['active', 'restricted', 'suspended'] });
    const before = this.s.blocks.length;
    const entry = this.s.blocks.find((b) => b.by === acc.id && b.handle === handle);
    this.s.blocks = this.s.blocks.filter((b) => !(b.by === acc.id && b.handle === handle));
    if (this.s.blocks.length === before || !entry) fail('not-found');
    // unblocking doesn't reopen anything, and the other person still can't
    // reach out first; only a new invitation from the unblocker does that
    this._addQuiet(acc.id, entry.who, Number.MAX_SAFE_INTEGER);
    this._save();
    return { blocked: false };
  }

  listBlocked(token) {
    const acc = this._actor(token, { allow: ['active', 'restricted', 'suspended'] });
    return { blocked: this.s.blocks.filter((b) => b.by === acc.id).map((b) => ({ handle: b.handle, pseudonym: b.pseudonym, avatar: b.avatar, at: b.at })) };
  }

  report(token, { conversationId = null, messageId = null, handle = null, category, details = '', alsoBlock = false } = {}) {
    const acc = this._actor(token, { allow: ['active', 'restricted', 'suspended'] });
    if (!REPORT_CATEGORY_IDS.includes(category)) fail('invalid', 'Choose what best describes it.');
    const note = normaliseText(details);
    if (charCount(note) > 1000) fail('invalid', 'Please keep the details under 1,000 characters.');
    this._rate(acc.id, 'report', this.L.reportsPerDay, 86400e3);
    let subject = null;
    let evidence = [];
    if (conversationId) {
      const { conv } = this._member(token, conversationId);
      subject = conv.members.find((x) => x !== acc.id);
      const msgs = this.s.messages[conv.id] || [];
      if (messageId) {
        const m = msgs.find((x) => x.id === messageId);
        if (!m || m.from === acc.id) fail('not-found');
        evidence = [m];
      } else {
        evidence = msgs.slice(-this.L.reportEvidenceMessages);
      }
    } else if (handle) {
      const target = this._byHandle(handle);
      // handles are random and only ever shown on a card, an invitation or a Hushspace
      if (!target || target.acc.id === acc.id) fail('not-found');
      subject = target.acc.id;
    } else fail('invalid');
    const t = this.now();
    // the evidence is a copy taken now, with the reporter's consent: deleting
    // the message later doesn't remove it from the report
    const rep = {
      id: this._id('rep'), at: t, by: acc.id, subject, conversationId, messageId, category, details: note,
      urgent: URGENT_CATEGORIES.has(category), status: 'open', assignedTo: null, notes: [],
      evidence: evidence.map((m) => ({ seq: m.seq, from: m.from === acc.id ? 'reporter' : 'reported', body: m.deletedAt ? '(deleted before the report)' : m.body, at: m.at })),
    };
    this.s.reports[rep.id] = rep;
    this._audit(acc.id, 'report.created', { report: rep.id, category });
    if (alsoBlock) {
      const p = this.s.profiles[subject];
      if (p) this.block(token, { handle: p.handle });
    }
    this._save();
    return {
      reportId: rep.id,
      received: true,
      expectation: rep.urgent
        ? 'Thank you. This is marked as a priority for our human safety team. We aim to look at priority reports within 24 hours during the pilot. If anyone is in immediate danger, contact local emergency services now.'
        : 'Thank you. A person on our safety team will review this. During the pilot we aim to review reports within 48 hours. We won’t tell them who reported.',
    };
  }

  // ------------------------------------------------------- your data --
  exportMyData(token) {
    const acc = this._actor(token, { allow: ['active', 'restricted', 'suspended'] });
    const convs = Object.values(this.s.conversations).filter((c) => c.members.includes(acc.id));
    return {
      exportedAt: new Date(this.now()).toISOString(),
      note: 'Your Hushmates data: your identity, invitations, Hushspaces and the messages in them. Other people appear by pseudonym only.',
      profile: this.s.profiles[acc.id] || null,
      invitations: this.listInvitations(token).invitations,
      blocked: this.listBlocked(token).blocked,
      hushspaces: convs.map((c) => ({ ...this._conversationView(c, acc.id), messages: (this.s.messages[c.id] || []).map((m) => this._messageView(m, acc.id)) })),
      reportsMade: Object.values(this.s.reports).filter((r) => r.by === acc.id).map((r) => ({ id: r.id, at: r.at, category: r.category, status: r.status })),
    };
  }

  deleteMyIdentity(token, { confirm } = {}) {
    const acc = this._actor(token, { allow: ['active', 'restricted', 'suspended'] });
    if (confirm !== 'DELETE') fail('invalid');
    for (const conv of Object.values(this.s.conversations)) {
      if (!conv.members.includes(acc.id)) continue;
      this._close(conv, acc.id, 'deleted');
      for (const m of this.s.messages[conv.id] || []) if (m.from === acc.id && !m.deletedAt) { m.deletedAt = this.now(); m.body = ''; }
    }
    for (const inv of Object.values(this.s.invitations)) {
      if (inv.status === 'pending' && (inv.from === acc.id || inv.to === acc.id)) { inv.status = 'cancelled'; inv.closedAt = this.now(); this._changed([inv.from, inv.to], 'invitations'); }
    }
    const p = this.s.profiles[acc.id];
    if (p) { delete this.s.handles[p.handle]; delete this.s.codes[p.inviteCode]; delete this.s.profiles[acc.id]; }
    this.s.blocks = this.s.blocks.filter((b) => b.by !== acc.id);
    for (const [tok, id] of Object.entries(this.s.sessions)) if (id === acc.id) delete this.s.sessions[tok];
    // reports stay as a safety record (see docs/SAFETY_AND_PRIVACY.md, retention)
    acc.state = 'deleted'; acc.email = null; acc.deletedAt = this.now();
    this._audit(acc.id, 'account.deleted');
    this._save();
    return { deleted: true };
  }

  // ------------------------------------------------------ moderation --
  // Human moderators only. There is deliberately no way to browse
  // conversations: a moderator sees the evidence captured in a report, and
  // every look is written to the audit log.
  _moderator(token) {
    const acc = this._actor(token);
    if (acc.role !== 'moderator') fail('forbidden');
    return acc;
  }
  _reportView(r, full) {
    const subject = this.s.accounts[r.subject];
    const base = {
      id: r.id, at: r.at, category: r.category, urgent: r.urgent, status: r.status, assignedTo: r.assignedTo,
      subject: { ref: r.subject, ...this._person(r.subject), state: subject?.state || 'unknown' },
      reporter: { ref: r.by, ...this._person(r.by) }, kind: r.messageId ? 'message' : r.conversationId ? 'conversation' : 'person',
    };
    return full ? { ...base, details: r.details, evidence: r.evidence, notes: r.notes } : base;
  }
  modListReports(token, { status = null } = {}) {
    const mod = this._moderator(token);
    this._audit(mod.id, 'mod.list-reports', { status });
    const list = Object.values(this.s.reports).filter((r) => !status || r.status === status)
      .sort((a, b) => (b.urgent - a.urgent) || (a.at - b.at));
    return { reports: list.map((r) => this._reportView(r, false)) };
  }
  modGetReport(token, { id } = {}) {
    const mod = this._moderator(token);
    const r = this.s.reports[id];
    if (!r) fail('not-found');
    this._audit(mod.id, 'mod.view-report', { report: id });
    return this._reportView(r, true);
  }
  modUpdateReport(token, { id, status, note, assignToMe } = {}) {
    const mod = this._moderator(token);
    const r = this.s.reports[id];
    if (!r) fail('not-found');
    if (status != null) { if (!REPORT_STATUSES.includes(status)) fail('invalid'); r.status = status; }
    if (assignToMe) r.assignedTo = mod.id;
    if (note) r.notes.push({ by: mod.id, at: this.now(), text: normaliseText(note).slice(0, 2000) });
    this._audit(mod.id, 'mod.update-report', { report: id, status: status ?? null, noted: !!note });
    this._save();
    return this._reportView(r, true);
  }
  modSetAccountState(token, { ref, state, reason } = {}) {
    const mod = this._moderator(token);
    const acc = this.s.accounts[ref];
    if (!acc || acc.id === mod.id || acc.state === 'deleted') fail('not-found');
    if (!['active', 'restricted', 'suspended', 'removed'].includes(state)) fail('invalid');
    if (!normaliseText(reason)) fail('invalid', 'A reason is required.');
    acc.state = state;
    const p = this.s.profiles[acc.id];
    if (state !== 'active' && p) p.discoverable = false;
    if (state === 'suspended' || state === 'removed') {
      for (const inv of Object.values(this.s.invitations)) {
        if (inv.status === 'pending' && inv.from === acc.id) { inv.status = 'cancelled'; inv.closedAt = this.now(); }
      }
    }
    if (state === 'removed') {
      for (const conv of Object.values(this.s.conversations)) if (conv.members.includes(acc.id)) this._close(conv, mod.id, 'removed');
    }
    this._audit(mod.id, 'mod.account-state', { account: ref, state, reason: normaliseText(reason).slice(0, 500) });
    this._save();
    return { ref, state };
  }
  modAuditLog(token) {
    const mod = this._moderator(token);
    this._audit(mod.id, 'mod.view-audit');
    return { entries: this.s.audit.slice(-200) };
  }
}

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
