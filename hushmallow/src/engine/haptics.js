// Hushmallow haptics — tiny, gentle vibration cues.
//
// Where haptics come from:
//  1. A native app wrapper, if present (preferred — real Taptic/Vibrator APIs):
//       window.HushNative.haptic(kind)                       (Android WebView bridge / generic)
//       window.webkit.messageHandlers.haptic.postMessage(kind) (iOS WKWebView)
//     The wrapper maps `kind` to its platform's feedback generators.
//  2. navigator.vibrate (Android Chrome / Firefox for Android). Browsers only
//     honour it after the user has interacted with the page.
//  3. Otherwise nothing. iOS Safari (and every iOS browser) has no web vibration
//     API, so on iPhone haptics require the native app wrapper.
//
// Importing this module has no side effects. The on/off setting persists in
// localStorage under 'hm2:haptics' (default on).

const KEY = 'hm2:haptics';

// Patterns are deliberately short and soft (ms on / off / on …).
export const HAPTIC_PATTERNS = Object.freeze({
  tick: [4],
  light: [8],
  soft: [14],
  pop: [18],
  buzz: [35],
  success: [12, 70, 20],
  'warning-soft': [18, 90, 18],
  heartbeat: [14, 110, 26],
});

const MIN_GAP_MS = { tick: 25, light: 40 }; // per kind; others default below
const DEFAULT_GAP_MS = 60;

let enabled = null;
const last = new Map();

function load() {
  if (enabled !== null) return enabled;
  enabled = true;
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (raw !== null && raw !== undefined) enabled = JSON.parse(raw) !== false;
  } catch { /* storage blocked: default on */ }
  return enabled;
}

export function setHapticsEnabled(on) {
  enabled = Boolean(on);
  try { globalThis.localStorage?.setItem(KEY, JSON.stringify(enabled)); } catch { /* ignore */ }
  if (!enabled) { try { globalThis.navigator?.vibrate?.(0); } catch { /* ignore */ } }
}

export function hapticsEnabled() { return load(); }

/** Which channel would deliver haptics here: 'native-bridge' | 'webkit-bridge' | 'vibrate' | 'none'. */
export function hapticsChannel() {
  const w = globalThis.window;
  if (typeof w?.HushNative?.haptic === 'function') return 'native-bridge';
  if (w?.webkit?.messageHandlers?.haptic) return 'webkit-bridge';
  if (typeof globalThis.navigator?.vibrate === 'function') return 'vibrate';
  return 'none';
}

/**
 * Fire a haptic. kinds: light, soft, pop, buzz, success, warning-soft, heartbeat, tick.
 * Unknown kinds fall back to 'light'. Returns true if something was dispatched.
 */
export function haptic(kind = 'light') {
  if (!load()) return false;
  const k = HAPTIC_PATTERNS[kind] ? kind : 'light';
  const now = globalThis.performance?.now?.() ?? Date.now();
  const gap = MIN_GAP_MS[k] ?? DEFAULT_GAP_MS;
  if (now - (last.get(k) ?? -Infinity) < gap) return false; // no machine-gun buzzing
  last.set(k, now);

  const w = globalThis.window;
  try {
    if (typeof w?.HushNative?.haptic === 'function') { w.HushNative.haptic(k); return true; }
    const h = w?.webkit?.messageHandlers?.haptic;
    if (h && typeof h.postMessage === 'function') { h.postMessage(k); return true; }
    const nav = globalThis.navigator;
    if (typeof nav?.vibrate === 'function') {
      if (nav.userActivation && !nav.userActivation.hasBeenActive) return false;   // browsers require a tap first
      return nav.vibrate(HAPTIC_PATTERNS[k]) !== false;
    }
  } catch { /* a broken bridge must never break the app */ }
  return false;
}

export default haptic;
