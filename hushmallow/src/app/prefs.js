// Preferences, stored only on this device.
const DEFAULTS = {
  sound: true, volume: 0.6, haptics: true,
  motion: 'system',          // 'system' | 'reduced' | 'full'
  lowStim: false,            // calmer visuals, fewer particles
  saveHistory: true,         // which rituals you did + how it felt (no typed words)
  saveWords: false,          // keep what you type in Another Angle "saved angles"
  seenIntro: false,
};

export function createPrefs(store) {
  let state = { ...DEFAULTS, ...store.get('prefs', {}) };
  const listeners = new Set();
  return {
    get: (k) => state[k],
    set(k, v) { state = { ...state, [k]: v }; store.set('prefs', state); listeners.forEach((fn) => fn(k, v)); },
    all: () => ({ ...state }),
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    reducedMotion() {
      if (state.motion === 'reduced') return true;
      if (state.motion === 'full') return false;
      try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
    },
    reset() { state = { ...DEFAULTS }; store.set('prefs', state); },
  };
}
