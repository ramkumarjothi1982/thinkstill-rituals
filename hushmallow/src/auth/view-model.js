// The account screens' decisions and words that do not need a page: which
// screen opens first, cooldown labels, consent lines, the delete check.
// Pure ES module (tests/auth-screens.test.mjs). The DOM lives in
// src/app/scenes/account.js.

/** Every screen of the account scene (data-auth-view on the scene). */
export const VIEWS = Object.freeze([
  'off', 'welcome', 'create', 'check-email', 'signin', 'forgot', 'reset-sent',
  'guest-choice', 'account', 'password', 'signout', 'device-data', 'delete', 'expired',
]);
/** Screens a guest may open directly (openAccount(app, { view })). */
export const GUEST_ENTRY = Object.freeze(['welcome', 'signin', 'create', 'forgot']);
/** Screens a signed-in account may open directly. */
export const ACCOUNT_ENTRY = Object.freeze(['account', 'password', 'delete', 'signout', 'device-data']);

/** The first screen: sign-in off, the once-only guest question, the account, or a guest's screen. */
export function initialView({ enabled, status, pendingGuestChoice = false, view = null } = {}) {
  if (!enabled || status === 'off') return 'off';
  if (status === 'signed-in') {
    if (pendingGuestChoice) return 'guest-choice';
    return ACCOUNT_ENTRY.includes(view) ? view : 'account';
  }
  if (status === 'expired') return 'expired';
  return GUEST_ENTRY.includes(view) ? view : 'welcome';
}

/** "Send it again" or, while the cooldown runs, "Send it again in 42 s". */
export function cooldownLabel(ms, label = 'Send it again') {
  const s = Math.ceil(Math.max(0, Number(ms) || 0) / 1000);
  return s > 0 ? `${label} in ${s} s` : label;
}

const pad = (n) => String(n).padStart(2, '0');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** A short local date and time: "13 Oct 2026, 09:42" (no locale data needed). */
export function formatWhen(when, { time = true } = {}) {
  const t = typeof when === 'number' ? when : Date.parse(when || '');
  if (!Number.isFinite(t) || t <= 0) return null;
  const d = new Date(t);
  const day = `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  return time ? `${day}, ${pad(d.getHours())}:${pad(d.getMinutes())}` : day;
}

/**
 * The line under a sync switch: when the person said yes, or when they took
 * it back (and that the copy was deleted), or that it is off.
 */
export function consentLine(c) {
  if (!c) return 'Off.';
  if (c.on) { const at = formatWhen(c.at); return at ? `On since ${at}. You can turn it off any time.` : 'On.'; }
  const w = formatWhen(c.withdrawnAt);
  return w ? `Off since ${w}. What was kept with your account was deleted then.` : 'Off. Nothing is kept with your account.';
}

/** The typed confirmation for deleting an account. */
export const DELETE_WORD = 'delete';
export const deleteConfirmed = (text) => String(text ?? '').trim().toLowerCase() === DELETE_WORD;

/** The emailed code: digits only (6 by default in Supabase; up to 10 if the project changes it). */
export function cleanCode(s) { return String(s ?? '').replace(/\D+/g, '').slice(0, 10); }
export const codeLooksRight = (s) => /^\d{6,10}$/.test(cleanCode(s));

/** A display name for the card's title, or null. */
export function greeting(name) {
  const n = String(name ?? '').replace(/\s+/g, ' ').trim();
  return n ? `Hi, ${n.length > 24 ? `${n.slice(0, 23)}…` : n}` : null;
}

/** The keyboard's height from the visual viewport (iPhone: the layout viewport does not shrink). */
export function keyboardInset({ innerHeight, vvHeight, vvOffsetTop = 0 }) {
  const kb = Math.round((Number(innerHeight) || 0) - (Number(vvHeight) || 0) - (Number(vvOffsetTop) || 0));
  return kb > 40 ? kb : 0;
}
