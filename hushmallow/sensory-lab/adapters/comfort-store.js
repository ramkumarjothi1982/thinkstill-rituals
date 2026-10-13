// Comfort DNA persistence adapters.
//
// Interface (every store implements it; all methods may be async):
//   load()      → Promise<object|null>   the saved profile, or null
//   save(obj)   → Promise<void>          replace the saved profile
//   clear()     → Promise<void>          delete everything saved
//   describe()  → { where: string, synced: boolean, persistent: boolean }
//
// The lab uses LocalComfortStore (this browser only, its own key). Tests use
// MemoryComfortStore. adapters/supabase-comfort.js implements the same
// interface for later, once the main app's authentication exists.

export const COMFORT_KEY = 'hm.sensorylab.comfort.v1';

function defaultStorage() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

export class LocalComfortStore {
  constructor(storage = defaultStorage(), key = COMFORT_KEY) {
    this.storage = storage;
    this.key = key;
    this.persistent = probe(storage, key);
    this.memory = null;   // used when storage is blocked
  }

  async load() {
    try {
      const raw = this.storage?.getItem(this.key);
      if (raw) return JSON.parse(raw);
    } catch { /* blocked or corrupted */ }
    return this.memory ? JSON.parse(this.memory) : null;
  }

  async save(obj) {
    const s = JSON.stringify(obj);
    this.memory = s;
    try { this.storage?.setItem(this.key, s); } catch { /* keep in memory only */ }
  }

  async clear() {
    this.memory = null;
    try { this.storage?.removeItem(this.key); } catch { /* nothing to clear */ }
  }

  describe() {
    return this.persistent
      ? { where: 'This browser only', synced: false, persistent: true }
      : { where: 'Nowhere: this browser blocks storage, so nothing is kept after you leave', synced: false, persistent: false };
  }
}

export class MemoryComfortStore {
  constructor(initial = null) { this.value = initial ? JSON.stringify(initial) : null; this.saves = 0; }
  async load() { return this.value ? JSON.parse(this.value) : null; }
  async save(obj) { this.value = JSON.stringify(obj); this.saves++; }
  async clear() { this.value = null; }
  describe() { return { where: 'Memory (test)', synced: false, persistent: false }; }
}

function probe(storage, key) {
  try { const k = key + ':probe'; storage.setItem(k, '1'); storage.removeItem(k); return true; } catch { return false; }
}
