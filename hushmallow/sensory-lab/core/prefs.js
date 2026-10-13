// Sensory Lab device settings — development-only local storage, own namespace.
//
// Sound, volume, haptics, motion, theme, quality, material, and the Mallow
// used while personalisation is off. Personal choices (favourite Mallow,
// response style, colours, what helps…) live in Comfort DNA
// (core/comfort-dna.js) behind its own store adapter and key.
// Nothing here touches the main app's keys (hm2:*).

export const PREFS_KEY = 'hm.sensorylab.v1';

export const DEFAULTS = Object.freeze({
  mallow: 'boppo',
  material: 'marshmallow',
  sound: true,
  volume: 0.7,
  haptics: true,
  motion: 'system',        // system | reduced | full
  theme: 'system',         // system (follow the device / host) | dark | light
  quality: 'auto',         // auto | high | medium | low
  showMesh: false,
});

// Touching localStorage can itself throw (blocked site data, sandboxed frames).
function defaultStorage() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

export class Prefs {
  constructor(storage = defaultStorage(), key = PREFS_KEY) {
    this.storage = storage;
    this.key = key;
    this.listeners = new Set();
    this.data = { ...DEFAULTS, ...this._load() };
    this.persistent = this._probe();
  }

  /** Can settings actually be saved here? (false in private modes / blocked storage) */
  _probe() {
    try { const k = this.key + ':probe'; this.storage.setItem(k, '1'); this.storage.removeItem(k); return true; } catch { return false; }
  }

  _load() {
    try { const raw = this.storage?.getItem(this.key); return raw ? JSON.parse(raw) : {}; } catch { return {}; }
  }

  // only choices that differ from the defaults are stored, so improved defaults reach everyone
  _save() {
    const out = {};
    for (const [k, v] of Object.entries(this.data)) if (v !== DEFAULTS[k]) out[k] = v;
    try { this.storage?.setItem(this.key, JSON.stringify(out)); } catch { /* private mode: keep in memory */ }
  }

  get(k) { return this.data[k]; }

  set(k, v) {
    if (!(k in DEFAULTS) || this.data[k] === v) return;
    this.data[k] = v;
    this._save();
    for (const fn of this.listeners) fn(k, v);
  }

  all() { return { ...this.data }; }

  reset() {
    this.data = { ...DEFAULTS };
    try { this.storage?.removeItem(this.key); } catch { /* ignore */ }
    for (const fn of this.listeners) fn('*', null);
  }

  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  /** Effective reduced-motion flag (system setting unless overridden). */
  reducedMotion() {
    const m = this.data.motion;
    if (m === 'reduced') return true;
    if (m === 'full') return false;
    try { return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false; } catch { return false; }
  }
}
