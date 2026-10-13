// Preferences, stored only on this device.
export const DEFAULTS = Object.freeze({
  sound: true, volume: 0.6, haptics: true,
  motion: 'system',          // 'system' | 'reduced' | 'full'
  lowStim: false,            // calmer visuals, fewer particles
  saveHistory: true,         // which rituals you did + how it felt (no typed words)
  saveWords: false,          // keep what you type in Another Angle "saved angles"
  seenIntro: false,
  // the Hushfold
  autoFlow: false,           // the next world begins by itself when one completes
  subtitleSpeed: 1,          // 0.75 | 1 | 1.25 | 1.5 (reading time divides by this)
  textScale: 1,              // 1 | 1.12 | 1.25 (every voice / UI type token)
  mallow: null,              // the Mallow you last chose on the Hushfold (id)
});

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
    reset() {
      const before = state;
      state = { ...DEFAULTS };
      store.set('prefs', state);
      // tell listeners about every value that changed (haptics, text size…)
      for (const k of Object.keys(state)) if (before[k] !== state[k]) listeners.forEach((fn) => fn(k, state[k]));
    },
  };
}
