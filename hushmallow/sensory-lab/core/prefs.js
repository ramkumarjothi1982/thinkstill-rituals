// Sensory Lab preferences — development-only local storage, own namespace.
//
// Phase 1 keeps the settings the lab needs (sound, motion, material, quality,
// response style). Comfort DNA (Phase 2) extends this same store; the
// persistence backend is swappable through adapters/ (a Supabase adapter will
// implement the same get/set/reset interface once Claude 1's auth is live).
// Nothing here touches the main app's keys (hm2:*).

export const PREFS_KEY = 'hm.sensorylab.v1';

export const DEFAULTS = Object.freeze({
  mallow: 'boppo',
  material: 'marshmallow',
  sound: true,
  volume: 0.7,
  haptics: true,
  motion: 'system',        // system | reduced | full
  theme: 'dark',           // dark | light
  quality: 'auto',         // auto | high | medium | low
  style: 'balanced',       // gentle | balanced | playful
  showMesh: false,
});

export class Prefs {
  constructor(storage = globalThis.localStorage, key = PREFS_KEY) {
    this.storage = storage;
    this.key = key;
    this.listeners = new Set();
    this.data = { ...DEFAULTS, ...this._load() };
  }

  _load() {
    try { const raw = this.storage?.getItem(this.key); return raw ? JSON.parse(raw) : {}; } catch { return {}; }
  }

  _save() {
    try { this.storage?.setItem(this.key, JSON.stringify(this.data)); } catch { /* private mode: keep in memory */ }
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
