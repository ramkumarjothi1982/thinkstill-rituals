// /auth/callback — where every email link and provider sign-in lands.
//
//   ?token_hash=…&type=signup|email|recovery|email_change|invite|magiclink
//        the recommended email templates (works on any device): verifyOtp
//   ?code=…            the PKCE code (same device and browser): exchangeCodeForSession
//   ?error=…&error_code=…&error_description=…  (query or #fragment): a friendly message
//   type=recovery (or a recovery code) → the set-new-password form
//
// The address bar is cleaned before anything else happens (no token stays in
// history or in a referrer), the page sends no referrer, and the only place
// it ever sends the person afterwards is this site's own app (#account or
// #home: no URL is taken from the link, so there is no open redirect).
// The pure parts (parseCallback, returnUrl) are tested in Node.

import { friendlyError, callbackError, checkPassword, passwordStrength } from './errors.js';
import { createAuthMallow, pickMallow } from './mallow.js';

export const OTP_TYPES = Object.freeze(['signup', 'email', 'recovery', 'email_change', 'invite', 'magiclink']);
export const NEXT = Object.freeze(['account', 'home']);
const TOKEN_RE = /^[A-Za-z0-9_-]{8,512}$/;

/** Everything the link carries, from the query and the fragment. Never throws. */
export function parseCallback(href) {
  let u;
  try { u = new URL(href); } catch { return { kind: 'none' }; }
  const q = new URLSearchParams(u.search);
  const f = new URLSearchParams(u.hash.replace(/^#/, ''));
  const get = (k) => q.get(k) ?? f.get(k);
  const next = NEXT.includes(get('next')) ? get('next') : 'account';
  const error = get('error'), errorCode = get('error_code'), errorDescription = get('error_description');
  if (error || errorCode) return { kind: 'error', error: { error, error_code: errorCode, error_description: errorDescription }, next };
  const tokenHash = get('token_hash');
  const type = get('type');
  if (tokenHash) {
    if (!TOKEN_RE.test(tokenHash) || !OTP_TYPES.includes(type)) return { kind: 'invalid', next };
    return { kind: 'token', tokenHash, type, next };
  }
  const code = get('code');
  if (code) return TOKEN_RE.test(code) ? { kind: 'code', code, next } : { kind: 'invalid', next };
  if (f.get('access_token')) return { kind: 'implicit', next };   // never used (PKCE only): refused
  return { kind: 'none', next };
}

/** The address with nothing after the path. */
export const scrubbedUrl = (loc) => `${loc.origin}${loc.pathname}`;

/** The app on this same site, at #account or #home. */
export function returnUrl(loc, next = 'account') {
  const path = String(loc.pathname || '/').replace(/auth\/callback\/?(?:index\.html)?$/, '').replace(/[^/]*$/, '');
  return `${loc.origin}${path}#${NEXT.includes(next) ? next : 'account'}`;
}

// ------------------------------------------------------------- page --
const IS_PAGE = typeof document !== 'undefined' && !!document.getElementById?.('hm-auth');
const START_HREF = IS_PAGE ? location.href : null;
// first thing, synchronously: the token leaves the address bar and history
if (IS_PAGE) { try { history.replaceState(null, '', scrubbedUrl(location)); } catch { /* nothing to clean */ } }

const NOTICE_KEY = 'hm2:auth.notice';
const $ = (id) => document.getElementById(id);

function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else if (k === 'class') n.className = v;
    else n.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of kids.flat()) if (c != null && c !== false) n.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return n;
}

// the home Mallow above the card (src/auth/mallow.js); until it exists the holder's data-mood is the state
let M = null;
const setMood = (m) => { if (M) M.mood(m); else $('hm-auth-mallow').dataset.mood = m; };
const getMood = () => $('hm-auth-mallow').dataset.mood;

function say(title, line, mood) {
  $('hm-auth-title').textContent = title;
  $('hm-auth-status').textContent = line;
  if (mood) setMood(mood);
}
const body = (...kids) => $('hm-auth-body').replaceChildren(...kids);
const openApp = (next, label = 'Open hushmallow', primary = true) => el('a', { class: `hm-auth-btn${primary ? ' primary' : ''}`, href: returnUrl(location, next) }, label);

function keyboardSafe() {
  const vv = globalThis.visualViewport;
  if (!vv) return;
  const fit = () => {
    const kb = Math.max(0, innerHeight - vv.height - vv.offsetTop);
    document.documentElement.style.setProperty('--kb', `${Math.round(kb)}px`);
  };
  vv.addEventListener('resize', fit);
  vv.addEventListener('scroll', fit);
  fit();
}

async function mallowArt(ns) {
  // the account's home Mallow, text size and motion choice if this device knows them, else Blubi at the standard size
  let id = null, reduced = false, lowStim = false;
  try {
    const prefix = ns?.mode === 'account' ? `hm2:u:${ns.uid}:` : 'hm2:';
    const p = JSON.parse(localStorage.getItem(`${prefix}prefs`) || 'null');
    if (p && typeof p.mallow === 'string') id = p.mallow;
    if (p && [1.12, 1.25].includes(+p.textScale)) document.documentElement.style.setProperty('--type-scale', String(+p.textScale));
    reduced = p?.motion === 'reduced' || (p?.motion !== 'full' && matchMedia('(prefers-reduced-motion: reduce)').matches);
    lowStim = !!p?.lowStim;
  } catch { /* Blubi */ }
  try {
    const { MALLOW_IDS } = await import('../mallows/registry.js');
    M = createAuthMallow($('hm-auth-mallow'), { id: pickMallow(MALLOW_IDS, id), mood: getMood(), reducedMotion: reduced, lowStim });
  } catch { /* the card works without the art */ }
}

function passwordForm({ onSubmit }) {
  const input = el('input', { class: 'hm-auth-input', id: 'hm-new-password', type: 'password', name: 'new-password', autocomplete: 'new-password', required: true, minlength: 8, maxlength: 72, 'aria-describedby': 'hm-new-password-hint hm-auth-form-error' });
  const reveal = el('button', { type: 'button', class: 'hm-auth-reveal', 'aria-controls': 'hm-new-password', 'aria-pressed': 'false' }, 'Show');
  const meter = el('div', { class: 'hm-auth-meter', 'data-score': '0', 'aria-hidden': 'true' }, el('i'), el('i'), el('i'), el('i'));
  const hint = el('div', { class: 'hm-auth-hint', id: 'hm-new-password-hint' }, passwordStrength('').hint);
  const err = el('p', { class: 'hm-auth-error', id: 'hm-auth-form-error', role: 'alert' });
  const submit = el('button', { class: 'hm-auth-btn primary', type: 'submit' }, 'Save my new password');
  reveal.addEventListener('click', () => {
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    reveal.textContent = show ? 'Hide' : 'Show';
    reveal.setAttribute('aria-pressed', String(show));
    input.focus();
  });
  // the Mallow looks away while a password is typed; after an error it stays concerned until typing starts again
  input.addEventListener('focus', () => { if (getMood() !== 'concerned') setMood('away'); });
  input.addEventListener('blur', () => { if (getMood() === 'away') setMood('idle'); });
  input.addEventListener('input', () => {
    setMood('away');
    const s = passwordStrength(input.value);
    meter.dataset.score = String(s.score);
    hint.textContent = s.hint;
    input.removeAttribute('aria-invalid');
    err.textContent = '';
  });
  const form = el('form', { class: 'hm-auth-body', novalidate: true },
    el('div', { class: 'hm-auth-field' },
      el('label', { class: 'hm-auth-label', for: 'hm-new-password' }, 'New password'),
      el('div', { class: 'hm-auth-inputwrap' }, input, reveal), meter, hint),
    err,
    el('div', { class: 'hm-auth-actions' }, submit));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const bad = checkPassword(input.value);
    if (bad) { err.textContent = bad.message; input.setAttribute('aria-invalid', 'true'); setMood('concerned'); input.focus(); return; }
    submit.disabled = true;
    submit.textContent = 'Saving…';
    const r = await onSubmit(input.value);
    if (!r.ok) {
      submit.disabled = false;
      submit.textContent = 'Save my new password';
      err.textContent = r.error?.message || friendlyError({}, 'password').message;
      if (r.error?.field === 'password') input.setAttribute('aria-invalid', 'true');
      setMood('concerned');
      input.focus();
    }
  });
  setTimeout(() => input.focus(), 50);
  return form;
}

function arrived(kind, next, title, line) {
  try { sessionStorage.setItem(NOTICE_KEY, kind); } catch { /* the app just won't say it */ }
  say(title, line, 'happy');
  body(openApp(next, 'Open hushmallow'), el('div', { class: 'hm-auth-dots', 'aria-hidden': 'true' }, el('i'), el('i'), el('i')));
  // a calm moment to see it, then into the app (the reduced-motion setting changes nothing here)
  setTimeout(() => location.replace(returnUrl(location, next)), 1600);
}

function failed(f, next) {
  say(f.code === 'link_other_device' ? 'Nearly there' : 'This link didn’t open', f.message, f.code === 'link_other_device' ? 'idle' : 'concerned');
  body(el('div', { class: 'hm-auth-actions' },
    openApp(next, f.code === 'link_other_device' ? 'Sign in' : 'Open hushmallow'),
    f.kind === 'link' && f.code !== 'link_other_device' ? el('p', { class: 'hm-auth-hint hm-auth-center' }, 'You can ask for a new link from your account screen.') : null));
  $('hm-auth-title').focus();
}

export async function run({ href = START_HREF } = {}) {
  keyboardSafe();
  const p = parseCallback(href);
  const [{ default: PUBLISHED }, { resolveAuthConfig }, { bootNamespace }] = await Promise.all([
    import('./public-config.js'), import('./config.js'), import('./namespace.js'),
  ]);
  const config = resolveAuthConfig({ published: PUBLISHED });
  const ns = config.enabled ? bootNamespace({ config, ls: localStorage }) : null;
  mallowArt(ns);
  if (!config.enabled) {
    say('Accounts aren’t on here', 'This version of hushmallow doesn’t use accounts. Everything still works on this device.', 'idle');
    body(openApp('home'));
    return { state: 'off' };
  }
  if (p.kind === 'none') { say('Nothing to open', 'This page opens the links we email you. You can head back to hushmallow.', 'idle'); body(openApp(p.next)); return { state: 'none' }; }
  if (p.kind === 'error') { failed(callbackError(p.error), p.next); return { state: 'error' }; }
  if (p.kind === 'invalid' || p.kind === 'implicit') { failed(friendlyError({ code: 'invalid_link' }, 'callback'), p.next); return { state: 'invalid' }; }

  say('One moment', p.type === 'recovery' ? 'Checking your reset link…' : 'Confirming it’s you…', 'busy');
  const { createAuth } = await import('./client.js');
  const auth = createAuth({ config, ns, passive: true, onReload: () => {} });
  let c;
  try { c = await auth.ensureClient(); } catch (e) { failed(friendlyError(e, 'callback'), p.next); return { state: 'error' }; }

  let recovery = false, emailChange = false;
  if (p.kind === 'token') {
    const { data, error } = await c.auth.verifyOtp({ token_hash: p.tokenHash, type: p.type });
    if (error) { failed(friendlyError(error, 'callback'), p.next); return { state: 'error', code: error.code || null }; }
    recovery = p.type === 'recovery';
    emailChange = p.type === 'email_change';
    // secure email change: the first of the two addresses confirmed, the other still to come
    if (emailChange && !data?.session) {
      say('One more step', 'Thank you. Now open the link we sent to your other email address to finish the change.', 'idle');
      body(openApp(p.next));
      return { state: 'email-change-half' };
    }
  } else {
    const { data, error } = await c.auth.exchangeCodeForSession(p.code);
    if (error) { failed(friendlyError(error, 'callback'), p.next); return { state: 'error', code: error.code || error.name || null }; }
    recovery = data?.redirectType === 'recovery';
  }

  if (recovery) {
    say('Choose a new password', 'You’re nearly back in. Pick something you’ll remember.', 'idle');
    let done = null;
    const finished = new Promise((r) => { done = r; });
    body(passwordForm({
      onSubmit: async (password) => {
        const r = await auth.updatePassword({ password });
        if (r.ok) { arrived('password-updated', p.next, 'All set', 'Your new password is saved and you’re signed in.'); done({ state: 'recovered' }); }
        return r;
      },
    }));
    return finished;
  }
  if (emailChange) { arrived('email-changed', p.next, 'Email updated', 'Your new email address is confirmed.'); return { state: 'email-changed' }; }
  arrived('verified', p.next, 'You’re in', 'Your email is confirmed. Welcome to hushmallow.');
  return { state: 'verified' };
}

if (IS_PAGE) {
  window.__hmCallback = run().catch((e) => {
    console.warn('[auth callback]', e?.name || e);
    failed(friendlyError(e, 'callback'), 'account');
    return { state: 'error' };
  });
}
