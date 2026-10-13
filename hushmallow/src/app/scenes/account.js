// ACCOUNT — optional sign-in (src/auth/). Registered as the scene 'account'.
//
// Guests keep every existing experience: nothing here is required, and
// nothing loads for a guest until this screen is opened. One scene, one
// card, the person's home Mallow above it (src/auth/mallow.js), and these
// screens (data-auth-view on the scene; src/auth/view-model.js VIEWS):
//
//   welcome        sign in / create an account / continue as a guest
//   create         email, password (a gentle strength hint), optional name
//   check-email    the link is on its way; send it again (cooldown); sign in
//   signin         email, password (show / hide), forgot password
//   forgot         email → reset-sent (the same answer whether or not the
//                  email has an account)
//   guest-choice   after a first sign-in on this device: keep this device's
//                  guest things with the account here, or not now (asked once;
//                  the account screen offers them again later)
//   account        name, email, home Mallow, the two opt-in sync switches
//                  (each with a plain privacy line and when it was given),
//                  change password, sign out, remove this device's data,
//                  delete account
//   password       change password: an emailed code first (reauthentication),
//                  then the code and the new password
//   signout        sign out (optionally removing this account's things here)
//   device-data    remove this device's copy of the account's things
//   delete         typed confirmation; says exactly what goes, where
//   off / expired  sign-in is off in this build / the session ended
// Choosing a new password from an emailed link happens on /auth/callback
// (src/auth/callback.js), which then opens this screen signed in.
//
// Screens that go deeper get a history entry of their own (app.pushLayer),
// so Back steps back through them before leaving the scene.
//
// Entry points for the coordinator (Settings row, side panel link):
//   mountAccountRow(app, el)   fills `el` with one Settings row (nothing when sign-in is off)
//   openAccount(app, params)   opens this scene (params.view: 'signin' | 'create' | …)
import { h, iconBtn, toast } from '../ui.js';
import { type } from '../../ui/type.js';
import { brandTagline } from '../../brand.js';
import { MALLOWS, MALLOW_IDS } from '../../mallows/registry.js';
import { createAuthMallow, pickMallow } from '../../auth/mallow.js';
import { checkEmail, checkPassword, friendlyError, passwordStrength, MESSAGES } from '../../auth/errors.js';
import * as VM from '../../auth/view-model.js';

const CSS = [new URL('../../auth/auth.css', import.meta.url).href, new URL('../../ui/account.css', import.meta.url).href];
/** Both stylesheets; resolves when they have loaded (or after 1.2 s). */
function ensureCss() {
  const have = new Set([...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.href));
  const waits = CSS.filter((href) => !have.has(href)).map((href) => new Promise((resolve) => {
    const link = h('link', { rel: 'stylesheet', href });
    link.addEventListener('load', resolve); link.addEventListener('error', resolve);
    document.head.append(link);
  }));
  return Promise.race([Promise.all(waits), new Promise((r) => setTimeout(r, 1200))]);
}

/** Opens the account scene (for the side panel). params.view opens one screen directly. */
export function openAccount(app, params = {}) { return app.go('account', params); }

/** One Settings row: "Your account · Signed in as …" or "Sign in or create an account". Nothing when sign-in is off. */
export function mountAccountRow(app, el) {
  const auth = app.auth;
  if (!el) return;
  if (!auth?.enabled) { el.replaceChildren(); return; }
  const u = auth.user();
  const signedIn = auth.status() === 'signed-in' && u;
  const label = signedIn ? 'Your account' : 'Sign in or create an account';
  const sub = signedIn ? (u.email ? `Signed in as ${u.email}` : 'Signed in') : 'Optional. Everything works without one.';
  el.replaceChildren(h('div', { class: 'setting' },
    h('div', { class: 'grow', style: type('row') }, label, h('small', { style: type('caption', { display: 'block', color: 'var(--text-3)', marginTop: '2px', overflowWrap: 'anywhere' }) }, sub)),
    h('button', { class: 'btn', style: { minHeight: '44px' }, 'data-act': 'account-row', onclick: () => openAccount(app) }, signedIn ? 'Manage' : 'Sign in')));
}

const PRIVACY_LINE = 'Nothing you type, no feeling and no photo is ever sent with your account.';
const DELETED_ON_SERVER = [
  'your sign-in: your email address and password',
  'your profile: your name and home Mallow',
  'your sync choices and when you made them',
  'anything kept with your account: settings, favourite worlds, Memory Garden tools and where a Hushflow paused',
];
const DELETED_HERE = ['this account’s things on this phone: its settings, favourites, Memory Garden and history', 'this phone’s sign-in to the account'];
const NOT_TOUCHED = [
  'the guest’s things on this phone, and any other account’s',
  'your plan: it belongs to this phone’s app store account',
  'Another Angle: it isn’t part of your account. Settings → Privacy can delete its data.',
];

export default function account(app, params = {}) {
  const cssReady = ensureCss();
  const auth = app.auth;
  const reduced = () => { try { return !!app.prefs?.reducedMotion?.(); } catch { return false; } };
  let client = null, mallow = null, left = false, off = null, lastStatus = null;
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); if (!left) fn(); }, ms); timers.add(t); return t; };
  const every = (fn, ms) => { const t = setInterval(() => { if (left) clearInterval(t); else fn(); }, ms); timers.add(t); return t; };
  const clearTimers = () => { for (const t of timers) { clearTimeout(t); clearInterval(t); } timers.clear(); };
  /** The full sign-in API (loaded once; supabase-js itself loads at the first server call). */
  const api = () => (client ? Promise.resolve(client) : auth.load().then((c) => (client = c)));

  // ------------------------------------------------------------- frame --
  const backBtn = iconBtn('back', 'Back', () => goBack());
  const mallowEl = h('div', { class: 'hm-auth-mallow hm-account-mallow', 'data-mood': 'idle' });
  const title = h('h1', { class: 'hm-auth-title', id: 'hm-account-title', tabindex: '-1' });
  const lede = h('p', { class: 'hm-auth-lede', id: 'hm-account-lede' });
  const bodyEl = h('div', { class: 'hm-auth-body' });
  const card = h('section', { class: 'hm-auth-card', 'aria-labelledby': 'hm-account-title', 'aria-describedby': 'hm-account-lede' }, title, lede, bodyEl);
  const offlineEl = h('p', { class: 'hm-account-offline', role: 'status', hidden: true }, 'You’re offline. Everything on this phone still works; account changes wait until you’re back.');
  const announce = h('p', { class: 'sr-only', role: 'status', 'aria-live': 'polite' });
  const scroll = h('div', { class: 'hm-auth-scroll hm-account-scroll' }, mallowEl, card, h('p', { class: 'hm-auth-tagline' }, brandTagline));
  const el = h('div', { class: 'hm-auth-scene hm-account', 'data-auth-view': 'loading', style: { visibility: 'hidden' } },
    h('div', { class: 'topbar' }, backBtn, h('div', { class: 'grow' }), offlineEl), scroll, announce);
  const say = (text) => { announce.textContent = ''; later(() => { announce.textContent = text; }, 60); };
  const mood = (m) => mallow?.mood(m);

  // -------------------------------------------------------- navigation --
  const nav = [];   // { view, opts, token }
  function go(view, opts = {}, { replace = false } = {}) {
    if (left) return;
    if (!nav.length) nav.push({ view, opts, token: null });
    else if (replace) nav[nav.length - 1] = { ...nav[nav.length - 1], view, opts };
    else nav.push({ view, opts, token: app.pushLayer ? app.pushLayer() : null });
    render();
  }
  function goBack() {
    const top = nav[nav.length - 1];
    if (top?.view === 'guest-choice') { choose('fresh'); return; }   // leaving the question = "Not now"
    if (nav.length > 1) { nav.pop(); if (top.token != null) app.popLayer?.(top.token); render(); return; }
    app.back();
  }
  /** Back to the screen below this one (the account card when there is none). */
  function popView() {
    const top = nav.pop();
    if (top?.token != null) app.popLayer?.(top.token);
    if (!nav.length) nav.push({ view: 'account', opts: {}, token: null });
    render();
  }
  /** Browser Back consumed one of our entries (main.js calls blockBack(token)). */
  function closeLayer(t) {
    const i = nav.findIndex((e) => e.token === t);
    if (i <= 0) return;
    if (nav[nav.length - 1].view === 'guest-choice') { choose('fresh'); return; }
    nav.length = i;
    render();
  }

  // ----------------------------------------------------------- helpers --
  let seq = 0;
  const uid = (p) => `hm-acc-${p}-${++seq}`;
  const btn = (label, onclick, { cls = '', act = null, type: t = 'button', disabled = false } = {}) =>
    h('button', { type: t, class: `hm-auth-btn ${cls}`.trim(), 'data-act': act, onclick, disabled }, label);
  const linkBtn = (label, onclick, act = null) => h('button', { type: 'button', class: 'hm-auth-link', 'data-act': act, onclick }, label);
  const hint = (text, cls = '') => h('p', { class: `hm-auth-hint ${cls}`.trim() }, text);
  // an email address may break after "@" or a dot, never mid-word
  const strong = (text) => h('strong', { class: 'hm-account-strong', translate: 'no' },
    ...String(text).split(/(?<=[@.])/).flatMap((part, i) => (i ? [h('wbr'), part] : [part])));
  const section = (label, ...kids) => h('section', { class: 'hm-account-section', 'aria-label': label }, h('h2', { class: 'hm-account-eyebrow' }, label), ...kids);
  const list = (items) => h('ul', { class: 'hm-account-list' }, ...items.map((t) => h('li', {}, t)));

  /** A labelled input. password: show / hide button and the Mallow looks away; meter: the strength hint. */
  function field({ name, label, kind = 'text', autocomplete, value = '', hintText = '', optional = false, inputmode, maxlength, enterkeyhint, password = false, meter = false }) {
    const id = uid(name), hintId = `${id}-hint`;
    const plain = kind === 'email' || password || name === 'code' || name === 'confirm';
    const input = h('input', {
      class: 'hm-auth-input', id, name, type: password ? 'password' : kind, autocomplete, inputmode, maxlength, enterkeyhint,
      autocapitalize: plain ? 'none' : 'words', autocorrect: plain ? 'off' : null, spellcheck: plain ? 'false' : null,
      'aria-describedby': hintId,
    });
    input.value = value || '';
    const labelEl = h('label', { class: 'hm-auth-label', for: id }, label, optional ? h('span', { class: 'hm-auth-optional' }, ' (optional)') : null);
    const hintEl = h('div', { class: 'hm-auth-hint', id: hintId }, hintText);
    const parts = [labelEl];
    if (password) {
      const reveal = h('button', { type: 'button', class: 'hm-auth-reveal', 'aria-controls': id, 'aria-pressed': 'false', 'aria-label': `Show ${label.toLowerCase()}` }, 'Show');
      reveal.addEventListener('click', () => {
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        reveal.textContent = show ? 'Hide' : 'Show';
        reveal.setAttribute('aria-pressed', String(show));
        reveal.setAttribute('aria-label', `${show ? 'Hide' : 'Show'} ${label.toLowerCase()}`);
        input.focus({ preventScroll: true });
      });
      parts.push(h('div', { class: 'hm-auth-inputwrap' }, input, reveal));
      // the Mallow closes its eyes while a password is typed; after an error it stays concerned until typing starts
      input.addEventListener('focus', () => { if (mallow?.mood !== 'concerned' && mallow?.mood !== 'busy') mood('away'); });
      input.addEventListener('blur', () => { if (mallow?.mood === 'away') mood('idle'); });
    } else parts.push(input);
    let meterEl = null;
    if (meter) {
      meterEl = h('div', { class: 'hm-auth-meter', 'data-score': '0', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'), h('i'));
      parts.push(meterEl);
      hintEl.textContent = passwordStrength('').hint;
    }
    parts.push(hintEl);
    let onFieldInput = null;
    input.addEventListener('input', () => {
      input.removeAttribute('aria-invalid');
      input.setAttribute('aria-describedby', hintId);
      if (mallow?.mood === 'concerned') mood(password ? 'away' : 'idle');
      if (meterEl) { const s = passwordStrength(input.value); meterEl.dataset.score = String(s.score); hintEl.textContent = s.hint; }
      onFieldInput?.();
    });
    return { name, input, hintEl, wrap: h('div', { class: 'hm-auth-field', 'data-field': name }, ...parts), onInput(fn) { onFieldInput = fn; } };
  }

  /** A form whose submit runs onSubmit(values) → { ok } | { ok:false, error, action? }. */
  function form({ fields, submit, busy, onSubmit, before = [], after = [], act = 'submit', danger = false, quiet = false }) {
    const errEl = h('p', { class: 'hm-auth-error', role: 'alert', id: uid('err') });
    const submitBtn = btn(submit, null, { cls: danger ? 'danger' : quiet ? 'small' : 'primary', type: 'submit', act });
    const f = h('form', { class: 'hm-auth-form', novalidate: true },
      ...before, ...fields.map((x) => x.wrap), errEl, h('div', { class: 'hm-auth-actions' }, submitBtn, ...after));
    const clear = () => { errEl.replaceChildren(); for (const x of fields) { x.input.removeAttribute('aria-invalid'); x.input.setAttribute('aria-describedby', x.hintEl.id); } };
    function fail(error, action) {
      const e = error || friendlyError({}, 'unknown');
      errEl.replaceChildren(e.message || MESSAGES.unknown);
      if (action) errEl.append(' ', linkBtn(action.label, action.run, action.act));
      const target = fields.find((x) => x.name === e.field) || (e.field === 'password' ? fields.find((x) => x.name.includes('password')) : null);
      if (target) {
        target.input.setAttribute('aria-invalid', 'true');
        target.input.setAttribute('aria-describedby', `${target.hintEl.id} ${errEl.id}`);
        target.input.focus({ preventScroll: true });
      }
      mood('concerned');
    }
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (f.dataset.busy) return;
      clear();
      const values = Object.fromEntries(fields.map((x) => [x.name, x.input.value]));
      f.dataset.busy = '1'; f.setAttribute('aria-busy', 'true');
      submitBtn.disabled = true; submitBtn.textContent = busy;
      mood('busy');
      let r;
      try { r = await onSubmit(values); } catch (ex) { r = { ok: false, error: friendlyError(ex, 'unknown') }; }
      if (!f.isConnected || left) return;   // a successful step moved on
      delete f.dataset.busy; f.removeAttribute('aria-busy');
      submitBtn.disabled = false; submitBtn.textContent = submit;
      if (r && r.ok === false) fail(r.error, r.action);
      else if (mallow?.mood === 'busy') mood('idle');
    });
    return { form: f, errEl, submitBtn, fail };
  }

  /** A "send it again" button that counts down its cooldown. */
  function cooldownButton(label, leftMs, run, act) {
    const b = btn(label, null, { act });
    const tick = () => {
      const ms = leftMs();
      b.textContent = VM.cooldownLabel(ms, label);
      b.setAttribute('aria-disabled', ms > 0 ? 'true' : 'false');
    };
    b.addEventListener('click', async () => {
      if (leftMs() > 0 || b.dataset.busy) return;
      b.dataset.busy = '1'; b.textContent = 'Sending…';
      try { await run(); } finally { delete b.dataset.busy; tick(); }
    });
    tick();
    every(tick, 1000);
    return b;
  }

  const lowerEmail = (s) => String(s || '').trim().toLowerCase();

  // ------------------------------------------------------------- views --
  const V = {};

  V.off = () => ({
    title: 'Accounts', lede: 'This version of hushmallow doesn’t use accounts. Everything stays on this device.',
    body: [h('div', { class: 'hm-auth-actions' }, btn('Back to hushmallow', () => app.back(), { cls: 'primary', act: 'back' }))],
  });

  V.welcome = () => ({
    title: 'Your hushmallow account', lede: 'Optional. Everything works without one.',
    body: [
      h('ul', { class: 'hm-account-benefits' },
        h('li', {}, h('b', {}, 'Yours on a shared phone. '), 'Your favourites, Memory Garden and settings stay apart from anyone else’s.'),
        h('li', {}, h('b', {}, 'With you on a new phone. '), 'Only if you turn it on, and you can turn it off any time.'),
        h('li', {}, h('b', {}, 'Private. '), PRIVACY_LINE)),
      h('div', { class: 'hm-auth-actions' },
        btn('Create an account', () => go('create'), { cls: 'primary', act: 'create' }),
        btn('Sign in', () => go('signin'), { act: 'signin' }),
        btn('Continue as a guest', () => app.back(), { cls: 'ghost', act: 'guest' })),
    ],
    warm: true,
  });

  V.create = (o) => {
    const email = field({ name: 'email', label: 'Email', kind: 'email', autocomplete: 'email', inputmode: 'email', enterkeyhint: 'next', value: o.email, maxlength: 254 });
    const pw = field({ name: 'password', label: 'Password', autocomplete: 'new-password', enterkeyhint: 'next', password: true, meter: true, maxlength: 72 });
    const name = field({ name: 'name', label: 'Your name', autocomplete: 'nickname', enterkeyhint: 'go', optional: true, maxlength: 40, hintText: 'Only you see it, on this screen.' });
    const f = form({
      fields: [email, pw, name], submit: 'Create my account', busy: 'Creating your account…', act: 'create-submit',
      onSubmit: async (v) => {
        const bad = checkEmail(v.email) || checkPassword(v.password);
        if (bad) return { ok: false, error: bad };
        const a = await api();
        const r = await a.signUp({ email: v.email, password: v.password, name: v.name });
        if (!r.ok) return r;
        mood('happy');
        if (r.signedIn) return signedIn(r);
        go('check-email', { email: r.email || lowerEmail(v.email) }, { replace: true });
        return { ok: true };
      },
      after: [linkBtn('I already have an account', () => go('signin', { email: email.input.value }, { replace: true }), 'to-signin')],
    });
    preload();
    return { title: 'Create your account', lede: 'It takes a moment. You’ll confirm your email next.', body: [f.form, hint(PRIVACY_LINE, 'hm-auth-center')] };
  };

  V['check-email'] = (o) => {
    const resend = cooldownButton('Send it again', () => client?.cooldownLeft('signup') || 0, async () => {
      const a = await api();
      const r = await a.resend({ email: o.email });
      if (r.ok) { mood('happy'); status.replaceChildren('Sent again. It can take a minute to arrive.'); say('Sent again.'); }
      else { mood('concerned'); status.replaceChildren(r.error?.message || MESSAGES.unknown); }
    }, 'resend');
    const status = h('p', { class: 'hm-auth-hint hm-auth-center', role: 'status', 'aria-live': 'polite' });
    preload();
    return {
      title: 'Check your email',
      lede: ['We’ve sent a link to ', strong(o.email || 'your email'), '. Open it on this phone or any other to confirm your account.'],
      body: [
        hint('It can take a minute. If it isn’t there, look in spam or junk.', 'hm-auth-center'),
        h('div', { class: 'hm-auth-actions' },
          btn('I’ve confirmed it: sign in', () => go('signin', { email: o.email }, { replace: true }), { cls: 'primary', act: 'confirmed-signin' }),
          resend,
          linkBtn('Use a different email', () => go('create', {}, { replace: true }), 'different-email')),
        status,
      ],
      mood: 'happy',
    };
  };

  V.signin = (o) => {
    const email = field({ name: 'email', label: 'Email', kind: 'email', autocomplete: 'email', inputmode: 'email', enterkeyhint: 'next', value: o.email, maxlength: 254 });
    const pw = field({ name: 'password', label: 'Password', autocomplete: 'current-password', enterkeyhint: 'go', password: true, maxlength: 128 });
    const forgot = linkBtn('Forgot your password?', () => go('forgot', { email: email.input.value }), 'forgot');
    const f = form({
      fields: [email, pw], submit: 'Sign in', busy: 'Signing in…', act: 'signin-submit',
      before: [],
      onSubmit: async (v) => {
        const bad = checkEmail(v.email);
        if (bad) return { ok: false, error: bad };
        const a = await api();
        const r = await a.signIn({ email: v.email, password: v.password });
        if (r.ok) return signedIn(r);
        if (r.error?.code === 'email_not_confirmed') {
          return { ...r, action: { label: 'Send the link again', act: 'resend-unconfirmed', run: async () => {
            const s = await a.resend({ email: v.email });
            if (s.ok || s.cooldownMs) go('check-email', { email: lowerEmail(v.email) }, { replace: true });
            else f.fail(s.error);
          } } };
        }
        return r;
      },
      after: [linkBtn('New here? Create an account', () => go('create', { email: email.input.value }, { replace: true }), 'to-create')],
    });
    pw.wrap.append(h('div', { class: 'hm-account-forgot' }, forgot));
    preload();
    return { title: 'Welcome back', lede: 'Sign in to your hushmallow account.', body: [f.form] };
  };

  V.forgot = (o) => {
    const email = field({ name: 'email', label: 'Email', kind: 'email', autocomplete: 'email', inputmode: 'email', enterkeyhint: 'send', value: o.email, maxlength: 254 });
    const f = form({
      fields: [email], submit: 'Send me a link', busy: 'Sending…', act: 'forgot-submit',
      onSubmit: async (v) => {
        const bad = checkEmail(v.email);
        if (bad) return { ok: false, error: bad };
        const a = await api();
        const r = await a.sendReset({ email: v.email });
        if (!r.ok) return r;
        mood('happy');
        go('reset-sent', { email: lowerEmail(v.email) }, { replace: true });
        return { ok: true };
      },
      after: [linkBtn('Back to sign in', () => goBack(), 'back-signin')],
    });
    preload();
    return { title: 'Forgot your password?', lede: 'Tell us your email and we’ll send a link to choose a new one.', body: [f.form] };
  };

  V['reset-sent'] = (o) => {
    const status = h('p', { class: 'hm-auth-hint hm-auth-center', role: 'status', 'aria-live': 'polite' });
    const resend = cooldownButton('Send it again', () => client?.cooldownLeft('recovery') || 0, async () => {
      const a = await api();
      const r = await a.sendReset({ email: o.email });
      if (r.ok) { mood('happy'); status.replaceChildren('Sent again. It can take a minute to arrive.'); say('Sent again.'); }
      else { mood('concerned'); status.replaceChildren(r.error?.message || MESSAGES.unknown); }
    }, 'resend-reset');
    return {
      title: 'Check your email',
      lede: ['If there’s an account for ', strong(o.email || 'that email'), ', a link to choose a new password is on its way. It works on any device.'],
      body: [
        hint('It can take a minute. If it isn’t there, look in spam or junk.', 'hm-auth-center'),
        h('div', { class: 'hm-auth-actions' },
          btn('Back to sign in', () => go('signin', { email: o.email }, { replace: true }), { cls: 'primary', act: 'back-signin' }),
          resend),
        status,
      ],
      mood: 'happy',
    };
  };

  V['guest-choice'] = () => ({
    title: 'Keep this phone’s things?',
    lede: 'This phone has favourites, settings or a Memory Garden from before you signed in. Keep a copy with your account on this phone?',
    body: [
      list(['Keep: your account starts with them here. Nothing is uploaded.', 'Not now: your account starts fresh. You can bring them in later from this screen.', 'Either way, the guest’s own copy stays on this phone for when you’re signed out.']),
      h('div', { class: 'hm-auth-actions' },
        btn('Keep them with my account', (e) => { e.currentTarget.disabled = true; choose('keep'); }, { cls: 'primary', act: 'keep' }),
        btn('Not now', (e) => { e.currentTarget.disabled = true; choose('fresh'); }, { act: 'fresh' })),
    ],
  });

  V.expired = () => ({
    title: 'You’ve been signed out', lede: 'Your session on this phone ended. Your things are safe, and the guest’s are just as you left them.',
    body: [h('div', { class: 'hm-auth-actions' }, btn('Continue', () => location.reload(), { cls: 'primary', act: 'continue' }))],
    mood: 'concerned',
  });

  // --------------------------------------------------------- the account --
  const acct = { profile: null, consents: null, loading: false, error: null };
  V.account = (o) => {
    const u = auth.user() || {};
    const nameIn = field({ name: 'displayName', label: 'Your name', autocomplete: 'nickname', enterkeyhint: 'done', optional: true, maxlength: 40, value: acct.profile?.displayName || '', hintText: 'Only you see it, on this screen.' });
    const nameForm = form({
      fields: [nameIn], submit: 'Save name', busy: 'Saving…', act: 'save-name', quiet: true,
      onSubmit: async (v) => {
        const a = await api();
        const r = await a.profile.update({ displayName: v.displayName });
        if (!r.ok) return r;
        acct.profile = { ...(acct.profile || {}), displayName: v.displayName.trim() };
        title.textContent = VM.greeting(acct.profile.displayName) || 'Your account';
        nameIn.hintEl.textContent = 'Saved.';
        mood('happy');
        return { ok: true };
      },
    });
    nameForm.form.classList.add('hm-account-inline');

    // home Mallow
    const current = pickMallow(MALLOW_IDS, acct.profile?.homeMallow, app.prefs.get('mallow'));
    const picker = h('div', { class: 'hm-account-mallows', role: 'radiogroup', 'aria-label': 'Home Mallow' },
      ...MALLOW_IDS.map((id) => {
        const m = MALLOWS[id];
        const b = h('button', { type: 'button', class: 'hm-account-pick', role: 'radio', 'aria-checked': String(id === current), 'aria-label': `${m.name}, ${m.title}`, 'data-mallow': id, tabindex: id === current ? '0' : '-1' },
          h('img', { src: m.file, alt: '', width: 96, height: 96, decoding: 'async', loading: 'lazy' }));
        b.addEventListener('click', () => pickHome(id, picker));
        b.addEventListener('keydown', (e) => {
          const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
          if (!k) return;
          e.preventDefault();
          const ids = MALLOW_IDS, next = ids[(ids.indexOf(id) + k + ids.length) % ids.length];
          pickHome(next, picker); picker.querySelector(`[data-mallow="${next}"]`)?.focus();
        });
        return b;
      }));
    const pickedName = h('p', { class: 'hm-auth-hint', id: uid('mallow') }, `${MALLOWS[current].name} greets you here and on the Hushfold.`);
    picker.setAttribute('aria-describedby', pickedName.id);

    // the two opt-in switches
    const settingsRow = syncRow('settings', 'Sync my settings', 'Sound, motion, text size and your other switches here. Never your words, feelings or photos.');
    const libraryRow = syncRow('library', 'Keep my favourites and progress with my account', 'Favourite worlds, Memory Garden tools and where a Hushflow paused, kept as ids and numbers. Never your words, feelings or photos.');
    const syncStatus = h('p', { class: 'hm-auth-hint', role: 'status', 'aria-live': 'polite', 'data-sync-status': '' });
    const loadNote = h('p', { class: 'hm-auth-hint', role: 'status' }, acct.loading || !acct.consents ? 'Checking your account…' : '');

    const guestRow = auth.guestDataWaiting ? h('div', { class: 'hm-account-row hm-account-row-block' },
      h('div', { class: 'grow' }, h('div', { class: 'hm-account-rowtitle' }, 'This phone’s guest things'),
        hint('Favourites, settings or a Memory Garden from before you signed in. Bring a copy into your account here. Nothing is uploaded.')),
      btn('Bring them in', (e) => { e.currentTarget.disabled = true; mood('happy'); api().then((a) => later(() => a.importGuestData(), reduced() ? 0 : 450)).catch(() => toast(MESSAGES.unknown)); }, { act: 'import-guest' })) : null;

    const since = VM.formatWhen(acct.profile?.createdAt || u.createdAt, { time: false });
    const view = {
      title: VM.greeting(acct.profile?.displayName) || 'Your account',
      lede: u.email ? ['Signed in as ', strong(u.email)] : 'Signed in',
      body: [
        since ? hint(`With hushmallow since ${since}.`, 'hm-auth-center') : null,
        section('You', nameForm.form, h('div', { class: 'hm-auth-field' }, h('span', { class: 'hm-auth-label', id: uid('pick') }, 'Home Mallow'), picker, pickedName)),
        section('Keep with my account', hint('Both are off unless you turn them on. Turning one off deletes what it kept with your account; this phone keeps its own copy.'), settingsRow.el, libraryRow.el, syncStatus, loadNote),
        guestRow ? section('This phone', guestRow) : null,
        section('Sign-in and security',
          rowButton('Change password', 'We’ll email you a code first, to make sure it’s you.', 'Change', () => go('password'), 'password')),
        section(guestRow ? 'Leaving' : 'This phone',
          rowButton('Sign out', 'Your things stay on this phone, apart from the guest’s.', 'Sign out', () => go('signout'), 'signout'),
          rowButton('Remove this phone’s data', 'This account’s things on this phone only. You stay signed in.', 'Remove', () => go('device-data'), 'device-data')),
        section('Delete account', hint('Deletes your account and everything kept with it. This can’t be undone.'),
          h('div', { class: 'hm-auth-actions' }, btn('Delete my account', () => go('delete'), { cls: 'danger-quiet', act: 'delete' }))),
      ],
      mood: o.arrived ? 'happy' : 'idle',
      after: () => loadAccount({ settingsRow, libraryRow, syncStatus, loadNote, picker }),
    };
    return view;
  };

  function rowButton(label, sub, action, onclick, act) {
    return h('div', { class: 'hm-account-row' },
      h('div', { class: 'grow' }, h('div', { class: 'hm-account-rowtitle' }, label), hint(sub)),
      btn(action, onclick, { cls: 'small', act }));
  }

  function syncRow(kind, label, privacy) {
    const id = uid(`sync-${kind}`);
    const input = h('input', { type: 'checkbox', class: 'switch', id, role: 'switch', 'data-sync': kind, disabled: true, 'aria-describedby': `${id}-p ${id}-c` });
    const consentEl = h('p', { class: 'hm-account-consent', id: `${id}-c` }, '…');
    const el = h('div', { class: 'hm-account-row hm-account-sync' },
      h('div', { class: 'grow' }, h('label', { class: 'hm-account-rowtitle', for: id }, label), h('p', { class: 'hm-auth-hint', id: `${id}-p` }, privacy), consentEl),
      input);
    const show = (c) => { input.checked = !!c?.on; consentEl.textContent = VM.consentLine(c); };
    input.addEventListener('change', () => toggleSync(kind, input.checked, { input, show }));
    return { el, input, show };
  }

  async function loadAccount(rows) {
    if (!client) await api().catch(() => null);
    if (!client || left) return;
    acct.loading = true;
    const [p, k] = await Promise.all([client.profile.get(), client.consents.get()]);
    acct.loading = false;
    if (left || nav[nav.length - 1]?.view !== 'account') return;
    if (p.ok && p.profile) {
      acct.profile = p.profile;
      title.textContent = VM.greeting(p.profile.displayName) || 'Your account';
      const nameInput = bodyEl.querySelector('[data-field="displayName"] input');
      if (nameInput && !nameInput.value && p.profile.displayName) nameInput.value = p.profile.displayName;
      if (p.profile.homeMallow && p.profile.homeMallow !== mallow?.id && !app.prefs.get('mallow')) pickHome(p.profile.homeMallow, rows.picker, { save: false });
    }
    if (k.ok) {
      acct.consents = k.consents;
      rows.settingsRow.show(k.consents.settings); rows.libraryRow.show(k.consents.library);
      rows.settingsRow.input.disabled = false; rows.libraryRow.input.disabled = false;
      rows.loadNote.textContent = '';
      const st = auth.autosync?.state;
      if (st?.last && (k.consents.settings.on || k.consents.library.on)) rows.syncStatus.textContent = `In step with your account since ${VM.formatWhen(st.last)}.`;
    } else {
      rows.loadNote.replaceChildren(k.error?.message || MESSAGES.unknown, ' ', linkBtn('Try again', () => render(), 'retry'));
      rows.settingsRow.input.disabled = true; rows.libraryRow.input.disabled = true;
    }
  }

  async function toggleSync(kind, on, { input, show }) {
    const statusEl = bodyEl.querySelector('[data-sync-status]');
    input.disabled = true;
    statusEl.textContent = on ? 'Turning it on…' : 'Turning it off and deleting what it kept…';
    mood('busy');
    const a = await api();
    const r = await a.consents.set(kind, on);
    if (left) return;
    if (!r.ok) {
      input.checked = !on; input.disabled = false;
      statusEl.textContent = r.error?.message || MESSAGES.unknown;
      mood('concerned');
      return;
    }
    acct.consents = r.consents;
    show(r.consents[kind]);
    // in step at once: on → this phone's things go up (and the account's come down); off → the bookkeeping goes
    const started = await auth.start?.({ store: app.store, prefs: app.prefs }).catch(() => null);
    const s = auth.autosync ? await auth.autosync.syncNow() : started ? await a.sync.syncNow(app.store, app.prefs) : { ok: false };
    if (left) return;
    input.disabled = false;
    if (on) {
      statusEl.textContent = s?.ok ? (kind === 'settings' ? 'Your settings are kept with your account now.' : 'Your favourites and progress are kept with your account now.') : 'It’s on. We’ll catch up when hushmallow can reach your account.';
      mood(s?.ok ? 'happy' : 'idle');
    } else {
      statusEl.textContent = kind === 'settings' ? 'Off. Your settings were deleted from your account; this phone keeps its own.' : 'Off. Your favourites and progress were deleted from your account; this phone keeps its own.';
      mood('idle');
    }
    say(statusEl.textContent);
  }

  function pickHome(id, picker, { save = true } = {}) {
    if (!MALLOWS[id]) return;
    for (const b of picker.querySelectorAll('[data-mallow]')) { const on = b.dataset.mallow === id; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; }
    const hintEl = picker.parentElement?.querySelector(`#${picker.getAttribute('aria-describedby')}`);
    if (hintEl) hintEl.textContent = `${MALLOWS[id].name} greets you here and on the Hushfold.`;
    mallow?.setId(id);
    if (!save) return;
    app.state.homeMallow = id;
    app.prefs.set('mallow', id);
    app.haptic?.('light');
    api().then((a) => a.profile.update({ homeMallow: id })).then((r) => { if (r?.ok) acct.profile = { ...(acct.profile || {}), homeMallow: id }; }).catch(() => {});
  }

  V.password = (o) => {
    const u = auth.user() || {};
    if (o.step !== 2) {
      const errEl = h('p', { class: 'hm-auth-error', role: 'alert' });
      const send = btn('Email me a code', async () => {
        send.disabled = true; send.textContent = 'Sending…'; mood('busy');
        const a = await api();
        const r = await a.reauthenticate();
        if (left) return;
        if (r.ok) { mood('happy'); go('password', { step: 2, sentAt: Date.now() }, { replace: true }); return; }
        send.disabled = false; send.textContent = 'Email me a code';
        errEl.textContent = r.error?.message || MESSAGES.unknown; mood('concerned');
      }, { cls: 'primary', act: 'send-code' });
      return {
        title: 'Change your password',
        lede: ['For your safety, we’ll first email a 6‑digit code to ', strong(u.email || 'your email'), '.'],
        body: [errEl, h('div', { class: 'hm-auth-actions' }, send, linkBtn('Keep my password', () => goBack(), 'cancel'))],
      };
    }
    const userName = h('input', { type: 'email', name: 'username', autocomplete: 'username', value: u.email || '', style: { display: 'none' }, tabindex: '-1', 'aria-hidden': 'true' });
    const code = field({ name: 'code', label: 'Code from the email', autocomplete: 'one-time-code', inputmode: 'numeric', enterkeyhint: 'next', maxlength: 10, hintText: 'Six digits. It works for a few minutes.' });
    code.input.setAttribute('pattern', '[0-9]*');
    const pw = field({ name: 'password', label: 'New password', autocomplete: 'new-password', enterkeyhint: 'done', password: true, meter: true, maxlength: 72 });
    let sentAt = o.sentAt || Date.now();
    const resend = cooldownButton('Send a new code', () => Math.max(0, sentAt + 60_000 - Date.now()), async () => {
      const a = await api();
      const r = await a.reauthenticate();
      if (r.ok) { sentAt = Date.now(); mood('happy'); say('A new code is on its way.'); }
      else f.fail(r.error);
    }, 'resend-code');
    const f = form({
      fields: [code, pw], submit: 'Save my new password', busy: 'Saving…', act: 'password-submit', before: [userName],
      onSubmit: async (v) => {
        if (!VM.codeLooksRight(v.code)) return { ok: false, error: { ...friendlyError({ code: 'reauthentication_needed' }, 'password'), message: 'Enter the 6‑digit code from the email.' } };
        const bad = checkPassword(v.password);
        if (bad) return { ok: false, error: bad };
        const a = await api();
        const r = await a.updatePassword({ password: v.password, nonce: VM.cleanCode(v.code) });
        if (!r.ok) return r;
        a.takeNotice();   // said here, not after a reload
        mood('happy');
        toast('Your new password is saved.', 3200);
        say('Your new password is saved.');
        later(popView, reduced() ? 300 : 900);
        return { ok: true };
      },
      after: [resend],
    });
    return {
      title: 'Enter the code',
      lede: ['We’ve emailed a code to ', strong(u.email || 'your email'), '. Enter it with your new password.'],
      body: [f.form],
    };
  };

  V.signout = () => ({
    title: 'Sign out?',
    lede: 'Your things stay on this phone for next time, kept apart from the guest’s and anyone else’s.',
    body: [h('div', { class: 'hm-auth-actions' },
      btn('Sign out', (e) => signOut(e, false), { cls: 'primary', act: 'signout-confirm' }),
      btn('Sign out and remove my things from this phone', (e) => signOut(e, true), { act: 'signout-remove' }),
      linkBtn('Stay signed in', () => goBack(), 'cancel'))],
  });

  V['device-data'] = () => {
    const kept = acct.consents?.settings?.on || acct.consents?.library?.on;
    return {
      title: 'Remove this phone’s data?',
      lede: 'This removes your account’s settings, favourites, Memory Garden and history from this phone only. You stay signed in.',
      body: [
        hint(kept ? 'What you keep with your account stays there and comes back to this phone.' : 'Nothing is kept with your account, so this can’t be undone.', 'hm-auth-center'),
        h('div', { class: 'hm-auth-actions' },
          btn('Remove this phone’s data', async (e) => { e.currentTarget.disabled = true; const a = await api(); a.removeDeviceData(); }, { cls: 'danger', act: 'device-data-confirm' }),
          linkBtn('Keep it', () => goBack(), 'cancel')),
      ],
      mood: 'concerned',
    };
  };

  V.delete = () => {
    const confirm = field({ name: 'confirm', label: `Type ${VM.DELETE_WORD} to confirm`, autocomplete: 'off', enterkeyhint: 'done', maxlength: 20 });
    const f = form({
      fields: [confirm], submit: 'Delete my account', busy: 'Deleting…', act: 'delete-confirm', danger: true,
      onSubmit: async (v) => {
        if (!VM.deleteConfirmed(v.confirm)) return { ok: false, error: { code: 'confirm', field: 'confirm', message: `Type ${VM.DELETE_WORD} to confirm.` } };
        const a = await api();
        const r = await a.deleteAccount();
        if (!r.ok) return r;
        return { ok: true };   // the page reloads as a guest with a calm notice
      },
      after: [linkBtn('Keep my account', () => goBack(), 'cancel')],
    });
    f.submitBtn.disabled = true;
    confirm.onInput(() => { f.submitBtn.disabled = !VM.deleteConfirmed(confirm.input.value); });
    return {
      title: 'Delete your account?',
      lede: 'This can’t be undone. Here is exactly what happens.',
      body: [
        h('div', { class: 'hm-account-facts' },
          h('h2', { class: 'hm-account-eyebrow' }, 'Deleted from our server, now'), list(DELETED_ON_SERVER),
          h('h2', { class: 'hm-account-eyebrow' }, 'Deleted from this phone'), list(DELETED_HERE),
          h('h2', { class: 'hm-account-eyebrow' }, 'Not touched'), list(NOT_TOUCHED)),
        f.form,
      ],
      mood: 'concerned',
    };
  };

  // ----------------------------------------------------------- actions --
  function preload() { api().then((a) => a.ensureClient()).catch(() => {}); }

  /** Signed in (this page is still a guest's): ask about the guest things, or go straight in. */
  function signedIn(r) {
    mood('happy');
    if (r.needsGuestChoice) { later(() => go('guest-choice', {}, { replace: true }), reduced() ? 0 : 650); return { ok: true }; }
    later(() => client.enter('#account'), reduced() ? 150 : 800);
    return { ok: true };
  }

  async function choose(choice) {
    try {
      const a = await api();
      a.chooseGuestData(choice);
      if (choice === 'keep') mood('happy');
      later(() => a.enter('#account'), choice === 'keep' && !reduced() ? 500 : 0);
    } catch { toast(MESSAGES.unknown); }
  }

  async function signOut(e, removeLocal) {
    for (const b of bodyEl.querySelectorAll('button')) b.disabled = true;
    e.currentTarget.textContent = 'Signing out…';
    const a = await api();
    await a.signOut({ removeLocal });
  }

  // ------------------------------------------------------------ render --
  function render() {
    if (left) return;
    const top = nav[nav.length - 1];
    clearTimers();
    const make = V[top.view] || V.welcome;
    let v;
    try { v = make(top.opts || {}); } catch (e) { console.warn('[account]', e); v = V.welcome(); }
    el.dataset.authView = top.view;
    title.textContent = v.title;
    lede.replaceChildren(...[].concat(v.lede || []));
    bodyEl.replaceChildren(...v.body.filter(Boolean));
    card.classList.remove('hm-swap'); void card.offsetWidth; card.classList.add('hm-swap');
    backBtn.setAttribute('aria-label', nav.length > 1 ? 'Back' : 'Close');
    backBtn.title = backBtn.getAttribute('aria-label');
    mood(v.mood || 'idle');
    scroll.scrollTop = 0;
    title.focus({ preventScroll: true });
    v.after?.();
  }

  // the status changed under us (another tab, a session that ended): start again from the right screen
  function onAuthChange(snap) {
    if (left || !snap) return;
    if (snap.status === lastStatus) return;
    lastStatus = snap.status;
    const top = nav[nav.length - 1]?.view;
    if (['guest-choice'].includes(top)) return;
    if (snap.status === 'expired' && top !== 'expired') { nav.length = 0; go('expired'); }
  }

  // ---------------------------------------------- keyboard and offline --
  const vv = globalThis.visualViewport;
  const fitKeyboard = () => {
    const kb = VM.keyboardInset({ innerHeight: globalThis.innerHeight, vvHeight: vv?.height ?? globalThis.innerHeight, vvOffsetTop: vv?.offsetTop || 0 });
    const was = el.dataset.kb === 'open';
    el.style.setProperty('--kb', `${kb}px`);
    if (kb) el.dataset.kb = 'open'; else delete el.dataset.kb;
    if (kb && !was) later(() => centreField(document.activeElement), 340);   // the keyboard just came up over the field
  };
  /** The focused field into the middle of what the keyboard leaves visible. */
  const TYPED = ['text', 'email', 'password', 'tel', 'number', 'search', 'url'];
  const centreField = (t) => {
    if (!(t instanceof HTMLInputElement) || !TYPED.includes(t.type) || !el.contains(t)) return;   // a switch never moves the page
    let coarse = false;
    try { coarse = matchMedia('(pointer: coarse)').matches; } catch { /* desktop */ }
    if (!coarse && el.dataset.kb !== 'open') return;   // only where an on-screen keyboard takes the room
    const vh = vv?.height ?? globalThis.innerHeight;
    const r = t.getBoundingClientRect(), sr = scroll.getBoundingClientRect();
    const bottom = Math.min(vh + (vv?.offsetTop || 0), sr.bottom);
    if (r.top >= sr.top + 8 && r.bottom <= bottom - 16) return;   // already in sight: never move what the person is about to tap
    const want = Math.max(sr.top + 8, (sr.top + bottom) / 2 - r.height / 2);
    const dy = r.top - want;
    if (Math.abs(dy) > 4) scroll.scrollBy({ top: dy, behavior: reduced() ? 'auto' : 'smooth' });
  };
  const onFocusIn = (e) => { const t = e.target; later(() => centreField(t), 320); };
  const onLine = () => { offlineEl.hidden = navigator.onLine !== false; };
  const onBack = () => { if (navigator.onLine !== false && nav[nav.length - 1]?.view === 'account') render(); };

  return {
    el,
    title: 'Account',
    // Back while a deeper screen is open steps back through them (see main.js layers)
    get blockBack() { return nav.length > 1 ? closeLayer : undefined; },
    async enter() {
      app.world?.dim?.(true);
      app.world?.showMallow?.(false);
      await cssReady;
      if (left) return;
      el.style.visibility = '';
      const prefs = app.prefs;
      mallow = createAuthMallow(mallowEl, { id: pickMallow(MALLOW_IDS, prefs.get('mallow'), app.state?.homeMallow, app.world?.mallowId), reducedMotion: reduced(), lowStim: !!prefs.get('lowStim') });
      lastStatus = auth?.enabled ? auth.status() : 'off';
      if (auth?.enabled && auth.status() === 'signed-in') api().catch(() => {});
      const first = VM.initialView({ enabled: !!auth?.enabled, status: lastStatus, pendingGuestChoice: !!auth?.pendingGuestChoice, view: params.view });
      go(first, { arrived: params.arrived || null, email: params.email || '' });
      if (params.arrived && ['signed-in', 'verified', 'password-updated', 'email-changed', 'guest-kept'].includes(params.arrived)) later(() => mood('happy'), 450);
      if (auth?.enabled) off = auth.onChange(onAuthChange);
      vv?.addEventListener?.('resize', fitKeyboard); vv?.addEventListener?.('scroll', fitKeyboard);
      el.addEventListener('focusin', onFocusIn);
      addEventListener('online', onLine); addEventListener('offline', onLine); addEventListener('online', onBack);
      onLine(); fitKeyboard();
      // developer handle (localhost only), like window.__garden: the browser checks read the Mallow and the screen
      if (['localhost', '127.0.0.1'].includes(location.hostname)) window.__account = { get mallow() { return mallow; }, get view() { return nav[nav.length - 1]?.view; }, get depth() { return nav.length; }, go };
    },
    leave() {
      left = true;
      clearTimers();
      off?.();
      mallow?.destroy();
      vv?.removeEventListener?.('resize', fitKeyboard); vv?.removeEventListener?.('scroll', fitKeyboard);
      removeEventListener('online', onLine); removeEventListener('offline', onLine); removeEventListener('online', onBack);
      app.world?.showMallow?.(true);
    },
  };
}
