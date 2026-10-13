// Tiny, safe key/value store: JSON over localStorage with an in-memory fallback
// (Node, private browsing, blocked storage, quota errors). Keys are namespaced.

export const PREFIX = 'hm2:';

function probeLocalStorage() {
  try {
    const ls = globalThis.localStorage;
    if (!ls) return null;
    const k = `${PREFIX}__probe__`;
    ls.setItem(k, '1');
    ls.removeItem(k);
    return ls;
  } catch {
    return null;
  }
}

/**
 * createStore({prefix, backend, protect}) — backend: 'memory', 'auto' (default)
 * or any Storage-like object ({getItem, setItem, removeItem, key, length}).
 * protect: full-key prefixes clearAll() leaves alone (another account's
 * namespace on this device, src/auth/namespace.js); get/set/remove are
 * unaffected.
 */
export function createStore({ prefix = PREFIX, backend = 'auto', protect = [] } = {}) {
  const memory = new Map();
  const ls = backend === 'memory' ? null : backend === 'auto' ? probeLocalStorage() : backend;
  const full = (key) => prefix + key;
  const kept = (k) => protect.some((p) => k.startsWith(p));

  return {
    get persistent() { return Boolean(ls); },

    get(key, fallback = null) {
      const k = full(key);
      if (ls) {
        try {
          const raw = ls.getItem(k);
          if (raw !== null) return JSON.parse(raw);
        } catch { /* fall through to memory */ }
      }
      return memory.has(k) ? structuredCloneSafe(memory.get(k)) : fallback;
    },

    set(key, value) {
      const k = full(key);
      // Memory always holds the latest value so reads stay consistent if storage fails.
      memory.set(k, structuredCloneSafe(value));
      if (!ls) return true;
      try {
        ls.setItem(k, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },

    remove(key) {
      const k = full(key);
      memory.delete(k);
      try { ls?.removeItem(k); } catch { /* ignore */ }
    },

    clearAll() {
      for (const k of [...memory.keys()]) if (k.startsWith(prefix) && !kept(k)) memory.delete(k);
      if (!ls) return;
      try {
        const doomed = [];
        for (let i = 0; i < ls.length; i++) {
          const k = ls.key(i);
          if (k && k.startsWith(prefix) && !kept(k)) doomed.push(k);
        }
        for (const k of doomed) ls.removeItem(k);
      } catch { /* ignore */ }
    },
  };
}

function structuredCloneSafe(v) {
  try { return JSON.parse(JSON.stringify(v)); } catch { return v; }
}

/** Shared default store for the app. */
export const store = createStore();
