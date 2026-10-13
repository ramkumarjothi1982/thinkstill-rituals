// Comfort DNA — a Mallow that remembers what you enjoy (Sensory Preferences Engine).
//
// Three kinds of data, kept apart on purpose:
//   prefs       things the person chose (favourite Mallow, how it responds,
//               sound, colours, environment, what helps). Saved when chosen.
//   favourites  moments the person starred (a Pocket Hush mode, a squishy).
//   history     usage counts and last-used times for experiences, recorded
//               ONLY when the person turns on "Learn from what I use".
// Nothing here stores words, feelings or anything typed, and nothing tries to
// infer a person's state. Personalisation can be switched off (every
// experience then uses defaults), reset, or deleted entirely.
//
// Persistence goes through a store adapter (adapters/comfort-store.js): local
// browser storage in the lab; a Supabase adapter for later, once real
// authentication exists. This module never touches storage directly.

import { REALM_IDS } from '../../src/world/realm.js';
import { MALLOW_IDS } from '../../src/mallows/registry.js';

export const POCKET_MODES = ['quick-squeeze', 'soft-breath', 'gentle-glow', 'let-it-float', 'quiet-moment'];
export const COMFORTS = ['squeeze', 'hold', 'stroke', 'breathe', 'glow', 'float', 'quiet'];

// value → allowed values (or a validator)
export const SCHEMA = {
  favouriteMallow: MALLOW_IDS,
  responses: ['gentle', 'balanced', 'playful'],
  animationSpeed: ['slower', 'natural', 'livelier'],
  motion: ['soft', 'normal', 'bouncy'],
  voice: [true, false],
  touchSounds: [true, false],
  colours: ['mallow', 'warm', 'cool', 'lavender', 'rose'],
  environment: ['auto', 'stage', ...REALM_IDS],
  comfort: (v) => Array.isArray(v) && v.every((c) => COMFORTS.includes(c)),
};

export const DEFAULT_PREFS = Object.freeze({
  favouriteMallow: 'boppo',
  responses: 'balanced',
  animationSpeed: 'natural',
  motion: 'normal',
  voice: true,
  touchSounds: true,
  colours: 'mallow',
  environment: 'auto',
  comfort: Object.freeze([]),
});

const SPEED = { slower: 0.82, natural: 1, livelier: 1.14 };
const MOTION = { soft: 0.6, normal: 1, bouncy: 1.25 };
const BREATH = { slower: { inhale: 5, exhale: 7 }, natural: { inhale: 4, exhale: 6 }, livelier: { inhale: 3.5, exhale: 5 } };

/** Colour palettes for glows, light and floating things. `mallow` = the Mallow's own colours. */
export const PALETTES = {
  warm: { label: 'Warm', glow: '#ffc56b', soft: '#ff9a62', deep: '#e0603a' },
  cool: { label: 'Cool', glow: '#8fe3ff', soft: '#6fb8ff', deep: '#3a6fe0' },
  lavender: { label: 'Lavender', glow: '#cdb6ff', soft: '#a98bff', deep: '#6e55d6' },
  rose: { label: 'Rose', glow: '#ffb3d1', soft: '#ff86b4', deep: '#d64f86' },
};

const empty = () => ({ version: 1, enabled: true, learn: false, prefs: {}, favourites: [], history: {} });

const valid = (k, v) => {
  const rule = SCHEMA[k];
  if (!rule) return false;
  return typeof rule === 'function' ? rule(v) : rule.includes(v);
};

export const itemKey = (it) => (it.kind === 'softbody' ? `softbody:${it.mallow || '*'}:${it.material}` : `${it.kind}:${it.id}`);

export class ComfortDNA {
  /**
   * @param {{load():Promise<object|null>, save(o:object):Promise<void>, clear():Promise<void>, describe():object}} store
   * @param {{now?:()=>number}} [o]
   */
  constructor(store, o = {}) {
    this.store = store;
    this.now = o.now || (() => Date.now());
    this.data = empty();
    this.listeners = new Set();
  }

  async load() {
    let raw = null;
    try { raw = await this.store.load(); } catch { raw = null; }
    this.data = sanitize(raw);
    return this;
  }

  // ------------------------------------------------------------- state --
  get enabled() { return this.data.enabled; }
  get learning() { return this.data.enabled && this.data.learn; }

  setEnabled(on) { this.data.enabled = !!on; this._commit('enabled'); }
  setLearning(on) { this.data.learn = !!on; this._commit('learn'); }

  /** Effective value: what experiences should use (defaults when personalisation is off). */
  get(k) {
    if (!this.data.enabled || !(k in this.data.prefs)) return clone(DEFAULT_PREFS[k]);
    return clone(this.data.prefs[k]);
  }

  /** What the person chose, regardless of the on/off switch (for the settings screen). */
  chosen(k) { return k in this.data.prefs ? clone(this.data.prefs[k]) : clone(DEFAULT_PREFS[k]); }

  set(k, v) {
    if (!valid(k, v)) return false;
    if (JSON.stringify(v) === JSON.stringify(this.chosen(k))) return true;   // unchanged: nothing to save
    if (JSON.stringify(v) === JSON.stringify(DEFAULT_PREFS[k])) delete this.data.prefs[k];
    else this.data.prefs[k] = clone(v);
    this._commit(k);
    return true;
  }

  // --------------------------------------------------------- favourites --
  favourites() { return this.data.enabled ? this.data.favourites.map(clone) : []; }
  isFavourite(it) { return this.data.favourites.some((f) => itemKey(f) === itemKey(it)); }
  toggleFavourite(it) {
    const k = itemKey(it);
    const i = this.data.favourites.findIndex((f) => itemKey(f) === k);
    if (i >= 0) this.data.favourites.splice(i, 1);
    else this.data.favourites.unshift(cleanItem(it));
    this.data.favourites = this.data.favourites.filter(Boolean).slice(0, 12);
    this._commit('favourites');
    return i < 0;
  }

  // ------------------------------------------------------------ history --
  /** Record that an experience was used. A no-op unless learning is on. */
  record(it) {
    if (!this.learning) return false;
    const item = cleanItem(it);
    if (!item) return false;
    const k = itemKey(item);
    const h = this.data.history[k] || { ...item, n: 0, last: 0 };
    h.n += 1; h.last = this.now();
    this.data.history[k] = h;
    this._commit('history');
    return true;
  }

  history() {
    return Object.values(this.data.history).map(clone).sort((a, b) => b.n - a.n || b.last - a.last);
  }

  // -------------------------------------------------------- derived use --
  /** Companion tuning for TouchTalk, SoftBody and Pocket Hush. */
  tuning() {
    return {
      style: this.get('responses'),
      speed: SPEED[this.get('animationSpeed')],
      motion: MOTION[this.get('motion')],
      voice: this.get('voice'),
      touchSounds: this.get('touchSounds'),
    };
  }

  breathTiming() { return { ...BREATH[this.get('animationSpeed')] }; }

  /** Colours: a palette object, or null for "use the Mallow's own colours". */
  palette() { const c = this.get('colours'); return c === 'mallow' ? null : { ...PALETTES[c] }; }

  /**
   * Backdrop for an experience. kind: 'stage' experiences (TouchTalk, SoftBody)
   * or 'moment' (Pocket Hush). Returns a realm id, or null for the plain stage.
   */
  environment(kind, mallowId) {
    const e = this.get('environment');
    if (e === 'stage') return null;
    if (e === 'auto') return kind === 'moment' ? ownRealm(mallowId) : null;
    return e;
  }

  /**
   * Familiar things to offer when the person comes back: favourites first, then
   * what they use most (if learning is on), then what they said helps.
   * Never more than `n`; never invented.
   */
  suggestions(n = 3) {
    if (!this.data.enabled) return [];
    const out = [], seen = new Set();
    const push = (it, reason) => { const k = itemKey(it); if (!seen.has(k) && out.length < n) { seen.add(k); out.push({ ...it, reason }); } };
    for (const f of this.data.favourites) push(f, 'favourite');
    if (this.learning) for (const h of this.history()) if (h.kind === 'pocket' || h.kind === 'softbody') push({ kind: h.kind, id: h.id, mallow: h.mallow, material: h.material }, 'often');
    const byComfort = { squeeze: 'quick-squeeze', breathe: 'soft-breath', glow: 'gentle-glow', float: 'let-it-float', quiet: 'quiet-moment', hold: 'quiet-moment', stroke: 'quiet-moment' };
    for (const c of this.get('comfort')) push({ kind: 'pocket', id: byComfort[c] }, 'helps');
    return out;
  }

  /** Weights for Pocket Hush "Surprise Me" (see core/pocket-rules.js). */
  surpriseBias() {
    const bias = {};
    if (!this.data.enabled) return bias;
    const map = { squeeze: ['quick-squeeze'], breathe: ['soft-breath'], glow: ['gentle-glow'], float: ['let-it-float'], quiet: ['quiet-moment'], hold: ['quiet-moment', 'soft-breath'], stroke: ['quiet-moment'] };
    for (const c of this.get('comfort')) for (const m of map[c]) bias[m] = (bias[m] || 1) * 1.8;
    for (const f of this.data.favourites) if (f.kind === 'pocket') bias[f.id] = (bias[f.id] || 1) * 1.5;
    if (this.learning) for (const h of this.history()) if (h.kind === 'pocket') bias[h.id] = (bias[h.id] || 1) * (1 + Math.min(0.6, h.n * 0.1));
    return bias;
  }

  // ------------------------------------------------------------ privacy --
  /** Everything saved, in plain terms, for "View what's saved". */
  view() {
    return {
      where: this.store.describe(),
      personalisation: this.data.enabled ? 'on' : 'off',
      learning: this.data.learn ? 'on' : 'off',
      chosen: Object.fromEntries(Object.keys(DEFAULT_PREFS).map((k) => [k, this.chosen(k)])),
      favourites: this.data.favourites.map(clone),
      history: this.history(),
    };
  }

  /** Personal settings and favourites back to defaults (history kept; on/off unchanged). */
  resetPreferences() { this.data.prefs = {}; this.data.favourites = []; this._commit('reset'); }

  deleteHistory() { this.data.history = {}; this._commit('history'); }

  /** Forget everything: the store is cleared and the engine starts fresh. */
  async deleteAll() {
    this.data = empty();
    try { await this.store.clear(); } catch { /* nothing stored */ }
    this._emit('*');
  }

  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  _commit(what) {
    const snapshot = clone(this.data);
    Promise.resolve(this.store.save(snapshot)).catch(() => { /* in-memory only */ });
    this._emit(what);
  }

  _emit(what) { for (const fn of this.listeners) { try { fn(what); } catch (e) { console.warn(e); } } }
}

// ------------------------------------------------------------- helpers --
function ownRealm(mallowId) {
  const map = { glitzi: 'static-storm', blubi: 'raindrop-lagoon', zuzu: 'spiral-observatory', boppo: 'sunpop-orchard', pipzi: 'spark-festival', loomi: 'blue-drift', noomi: 'moonmilk-cove' };
  return map[mallowId] || 'moonmilk-cove';
}

function clone(v) { return v == null || typeof v !== 'object' ? v : JSON.parse(JSON.stringify(v)); }

function cleanItem(it) {
  if (!it || typeof it !== 'object') return null;
  if (it.kind === 'pocket' && POCKET_MODES.includes(it.id)) return { kind: 'pocket', id: it.id };
  if (it.kind === 'softbody' && typeof it.material === 'string') return { kind: 'softbody', id: 'softbody', material: it.material, ...(MALLOW_IDS.includes(it.mallow) ? { mallow: it.mallow } : {}) };
  if ((it.kind === 'experience') && typeof it.id === 'string') return { kind: 'experience', id: it.id };
  if (it.kind === 'mallow' && MALLOW_IDS.includes(it.id)) return { kind: 'mallow', id: it.id };
  return null;
}

/** Accept only well-formed stored data (it may be old, edited or corrupted). */
export function sanitize(raw) {
  const d = empty();
  if (!raw || typeof raw !== 'object' || raw.version !== 1) return d;
  d.enabled = raw.enabled !== false;
  d.learn = raw.learn === true;
  for (const [k, v] of Object.entries(raw.prefs || {})) if (valid(k, v)) d.prefs[k] = clone(v);
  d.favourites = (Array.isArray(raw.favourites) ? raw.favourites : []).map(cleanItem).filter(Boolean).slice(0, 12);
  for (const h of Object.values(raw.history || {})) {
    const it = cleanItem(h);
    if (it && Number.isFinite(h.n) && Number.isFinite(h.last)) d.history[itemKey(it)] = { ...it, n: Math.max(0, h.n | 0), last: h.last };
  }
  return d;
}
