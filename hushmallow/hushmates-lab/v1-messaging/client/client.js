// One device's view of Hushmates: talks to the service only through a
// network link, keeps what this person may see, and owns the delivery
// states of their outgoing messages (sending → sent, or not sent + retry).
// Swapping LocalNetwork for a Supabase-backed link is the Phase 2 job; the
// interface only uses this class.

import { checkMessage } from '../core/text-policy.js';
import { LIMITS } from '../core/config.js';

const newClientId = () => {
  try { if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID(); } catch { /* insecure context */ }
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
};

export class HushmatesClient {
  constructor(link, token) {
    this.link = link;
    this.token = token;
    this.listeners = new Set();
    this.state = {
      online: link.online, ready: false, me: null, invitations: [], hushmates: [], blocked: [],
      conversations: {},   // id -> { view, messages: [], hasMore, loaded, outbox: [] }
      lastEvent: null,
    };
    this.activeConversation = null;
    this._pending = new Map();   // scope -> timer
    this._notifyQueued = false;
  }

  // ---------------------------------------------------------- plumbing --
  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  _notify(detail = {}) {
    this._lastDetail = { ...(this._lastDetail || {}), ...detail };
    if (this._notifyQueued) return;
    this._notifyQueued = true;
    queueMicrotask(() => {
      this._notifyQueued = false;
      const d = this._lastDetail; this._lastDetail = null;
      for (const fn of this.listeners) fn(this.state, d);
    });
  }
  api(method, args) { return this.link.request(method, this.token, args); }

  async start() {
    this.link.onStatus((online) => { this.state.online = online; this._notify({ status: true }); });
    this.unsub = this.link.subscribe(this.token, (ev) => this._onEvent(ev), {
      onReconnect: () => { this.refreshAll().catch(() => {}); },
    });
    await this.refreshAll();
    this.state.ready = true;
    this._notify({ ready: true });
  }
  stop() { this.unsub?.(); this.listeners.clear(); }

  async refreshAll() {
    await Promise.all([this.refresh('me'), this.refresh('invitations'), this.refresh('hushmates'), this.refresh('blocked')]);
    await Promise.all(Object.keys(this.state.conversations).filter((id) => this.state.conversations[id].loaded).map((id) => this.catchUp(id)));
  }

  async refresh(scope) {
    const s = this.state;
    if (scope === 'me') s.me = await this.api('me');
    else if (scope === 'invitations') s.invitations = (await this.api('listInvitations')).invitations;
    else if (scope === 'blocked') s.blocked = (await this.api('listBlocked')).blocked;
    else if (scope === 'hushmates') {
      const r = await this.api('listHushmates');
      s.hushmates = r.hushmates;
      for (const v of r.hushmates) if (s.conversations[v.id]) s.conversations[v.id].view = v;
    }
    this._notify({ [scope]: true });
  }

  // events carry only "something changed" or a message this person may see;
  // anything else is fetched again through authorised calls
  _onEvent(ev) {
    this.state.lastEvent = ev;
    if (ev.type === 'message') {
      const c = this._conv(ev.conversationId);
      const isNew = this._upsert(c, ev.message);
      if (this.activeConversation === ev.conversationId && !ev.message.mine) this.markRead(ev.conversationId);
      this._soon('hushmates');
      this._notify({ message: { conversationId: ev.conversationId, message: ev.message, isNew } });
      return;
    }
    if (ev.type === 'changed') {
      if (ev.scope === 'conversation') this._soon('hushmates');
      else this._soon(ev.scope);
      if (ev.scope === 'invitations') this._soon('me');
      if (ev.scope === 'hushmates') { this._soon('me'); this._soon('blocked'); }
    }
  }
  _soon(scope) {
    if (this._pending.has(scope)) return;
    this._pending.set(scope, setTimeout(() => {
      this._pending.delete(scope);
      this.refresh(scope).catch(() => {});
    }, 60));
  }

  _conv(id) {
    return (this.state.conversations[id] ||= { view: this.state.hushmates.find((h) => h.id === id) || null, messages: [], hasMore: false, loaded: false, outbox: [] });
  }
  _upsert(c, m) {
    const i = c.messages.findIndex((x) => x.id === m.id);
    if (i >= 0) { c.messages[i] = m; return false; }
    c.messages.push(m);
    c.messages.sort((a, b) => a.seq - b.seq);
    if (m.mine && m.clientId) c.outbox = c.outbox.filter((o) => o.clientId !== m.clientId);
    return true;
  }

  // ------------------------------------------------------- conversation --
  async openConversation(id) {
    this.activeConversation = id;
    const c = this._conv(id);
    const [view, page] = await Promise.all([
      this.api('getConversation', { conversationId: id }),
      this.api('getMessages', { conversationId: id }),
    ]);
    c.view = view;
    for (const m of page.messages) this._upsert(c, m);
    if (!c.loaded) c.hasMore = page.hasMore;
    c.loaded = true;
    this._notify({ conversation: id });
    await this.markRead(id);
    return c;
  }
  closeConversation(id) { if (this.activeConversation === id) this.activeConversation = null; }

  async loadEarlier(id) {
    const c = this._conv(id);
    const first = c.messages[0];
    if (!first) return;
    const page = await this.api('getMessages', { conversationId: id, beforeSeq: first.seq });
    for (const m of page.messages) this._upsert(c, m);
    c.hasMore = page.hasMore;
    this._notify({ conversation: id, earlier: true });
  }

  async catchUp(id) {
    const c = this._conv(id);
    const last = c.messages[c.messages.length - 1];
    const page = await this.api('getMessages', { conversationId: id, afterSeq: last ? last.seq : 0 });
    for (const m of page.messages) this._upsert(c, m);
    c.view = await this.api('getConversation', { conversationId: id });
    this._notify({ conversation: id });
    if (this.activeConversation === id) this.markRead(id);
  }

  async markRead(id) {
    const c = this._conv(id);
    const last = c.messages[c.messages.length - 1];
    if (!last) return;
    try { await this.api('markRead', { conversationId: id, seq: last.seq }); } catch { /* next time */ }
  }

  /** Optimistic send with a stable clientId: a retry can never duplicate. */
  async sendMessage(id, text) {
    const check = checkMessage(text, { maxChars: this.state.me?.limits?.messageMaxChars || LIMITS.messageMaxChars });
    if (!check.ok) return { ok: false, error: check };
    const c = this._conv(id);
    const item = { clientId: newClientId(), body: check.text, at: Date.now(), state: 'sending' };
    c.outbox.push(item);
    this._notify({ conversation: id, sending: true });
    return this._deliver(id, item);
  }
  async retry(id, clientId) {
    const c = this._conv(id);
    const item = c.outbox.find((o) => o.clientId === clientId);
    if (!item || item.state === 'sending') return { ok: false };
    item.state = 'sending';
    this._notify({ conversation: id });
    return this._deliver(id, item);
  }
  discard(id, clientId) {
    const c = this._conv(id);
    c.outbox = c.outbox.filter((o) => o.clientId !== clientId);
    this._notify({ conversation: id });
  }
  async _deliver(id, item) {
    const c = this._conv(id);
    try {
      const r = await this.api('sendMessage', { conversationId: id, body: item.body, clientId: item.clientId });
      this._upsert(c, r.message);
      c.outbox = c.outbox.filter((o) => o.clientId !== item.clientId);
      this._notify({ conversation: id, sent: r.message });
      return { ok: true, message: r.message };
    } catch (e) {
      if (e.code === 'network' || e.code === 'response-lost') {
        item.state = 'failed';
        item.error = e.message;
      } else {
        // a rule said no (closed, rate limit, text rules): it won't work on retry
        c.outbox = c.outbox.filter((o) => o.clientId !== item.clientId);
      }
      this._notify({ conversation: id, failed: true });
      return { ok: false, error: { code: e.code, message: e.message }, body: item.body };
    }
  }

  // ------------------------------------------------------------ actions --
  async act(method, args, refresh = []) {
    const r = await this.api(method, args);
    await Promise.all(refresh.map((s) => this.refresh(s)));
    return r;
  }
}
