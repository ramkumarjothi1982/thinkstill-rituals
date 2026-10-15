// SIGN IN: the way into Hushmates, with nothing to remember. The person gives
// their email, we send a short code, they type it, and they're in, on this
// device or any other (everything they keep lives with their account, not on
// the phone). People who aren't members yet go on to their invitation next.
//
// The scene only talks to the sign-in (dev.env.auth, client/supabase-auth.js);
// dev.env.signedIn() takes over once the code is accepted. Only words written
// for people reach the screen.

import { h, humane } from '../dom.js';
import { MALLOWS } from '../mallows-data.js';
import { room, stage, Speech, line, privacySheet, put, morph, focusHeading } from './parts.js';
import { supportPill } from './common.js';

export const CODE_LENGTH = 6;
const RESEND_AFTER_MS = 60e3;                  // a new code can be asked for a minute after the last (Supabase's own limit)
const PENDING_KEY = 'hushmates.signin';        // this tab only: the email a code was just sent to
const PENDING_MS = 15 * 60e3;
const LOOKS_LIKE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// so a page reloaded while fetching the code from the email opens at the code again
const pending = {
  get() {
    try {
      const p = JSON.parse(globalThis.sessionStorage?.getItem(PENDING_KEY) || 'null');
      return p && typeof p.email === 'string' && Number.isFinite(p.at) && Date.now() - p.at < PENDING_MS ? p : null;
    } catch { return null; }
  },
  set(email, at) { try { globalThis.sessionStorage?.setItem(PENDING_KEY, JSON.stringify({ email, at })); } catch { /* not kept: fine */ } },
  clear() { try { globalThis.sessionStorage?.removeItem(PENDING_KEY); } catch { /* nothing kept */ } },
};

export function signin(dev, params = {}) {
  const auth = dev.env.auth;
  const m = MALLOWS.noomi;
  const r = room(m.id, 'hf-signin', { seed: 4 });
  const st = stage(m.id, { size: 'm', label: `${m.name}, waiting to welcome you` });
  const speech = new Speech(m.id);
  put(st.above, speech.el);
  r.el.dataset.test = 'signin';

  const saved = pending.get();
  const s = { step: saved ? 'code' : 'email', email: saved?.email || '', sentAt: saved?.at || 0, code: '', busy: false };
  let alive = true;
  let timer = 0;

  // one error line for both steps, kept in place so screen readers hear each new message
  const error = h('p', { id: 'hf-signin-error', class: 'hf-note hf-invite-error', role: 'alert', 'aria-live': 'assertive', dataset: { test: 'signin-error' } });
  error.hidden = true;
  const showError = (e) => { error.textContent = humane(e); error.hidden = false; };
  const hideError = () => { error.hidden = true; error.textContent = ''; };

  const field = (label, input, hint, id, cls = '') => h('div', { class: `hf-invite-field ${cls}` },
    h('label', { class: 'kit-label', for: id }, label),
    h('div', { class: 'kit-field' }, input),
    hint ? h('p', { class: 'hf-check-hint', id: `${id}-hint` }, hint) : null);

  // ------------------------------------------------------------- step 1: email --
  const emailInput = h('input', {
    id: 'hf-signin-email', type: 'email', inputmode: 'email', autocomplete: 'email', autocapitalize: 'none', spellcheck: 'false',
    maxlength: '254', 'aria-describedby': 'hf-signin-email-hint hf-signin-error', dataset: { test: 'signin-email' },
    oninput: (e) => { s.email = e.target.value.trim(); syncEmail(); },
  });
  const send = h('button', { type: 'submit', class: 'kit-btn kit-btn--ink kit-btn--lg kit-btn--block', dataset: { test: 'signin-send' } }, 'Send me a code');
  const syncEmail = () => { send.disabled = s.busy || !LOOKS_LIKE_EMAIL.test(s.email); };

  // -------------------------------------------------------------- step 2: code --
  const codeInput = h('input', {
    id: 'hf-signin-code', type: 'text', inputmode: 'numeric', pattern: '[0-9]*', autocomplete: 'one-time-code', spellcheck: 'false',
    // room for a pasted "123 456": only the digits are kept
    maxlength: '32', 'aria-describedby': 'hf-signin-code-hint hf-signin-error', dataset: { test: 'signin-code' },
    oninput: (e) => {
      const digits = e.target.value.replace(/\D+/g, '').slice(0, CODE_LENGTH);
      if (digits !== e.target.value) e.target.value = digits;
      s.code = digits;
      codeInput.removeAttribute('aria-invalid');
      syncCode();
    },
  });
  const go = h('button', { type: 'submit', class: 'kit-btn kit-btn--ink kit-btn--lg kit-btn--block', dataset: { test: 'signin-continue' } }, 'Continue');
  const resend = h('button', { type: 'button', class: 'kit-btn kit-btn--text', dataset: { test: 'signin-resend' }, onclick: () => sendCode({ again: true }) }, 'Send a new code');
  const resendHint = h('p', { class: 'hf-note hf-note--quiet' });
  const change = h('button', { type: 'button', class: 'hf-link hf-link--centre', dataset: { test: 'signin-change' }, onclick: () => show('email', { focus: true }) }, 'Use a different email');
  const syncCode = () => {
    go.disabled = s.busy || s.code.length !== CODE_LENGTH;
    const wait = Math.max(0, s.sentAt + RESEND_AFTER_MS - Date.now());
    resend.disabled = s.busy || wait > 0;
    resendHint.textContent = wait > 0 ? 'Didn’t get it? You can ask for a new one in a moment.' : 'Didn’t get it? Have a look in your junk folder, or ask for a new one.';
    clearTimeout(timer);
    if (wait > 0 && alive) timer = setTimeout(() => alive && syncCode(), wait + 50);
  };

  const body = h('form', { class: 'hf-scroll hf-invite-scroll hf-signin-scroll', novalidate: '', onsubmit: (e) => { e.preventDefault(); submit(); } });
  r.el.append(h('div', { class: 'hf-head' }, h('header', { class: 'rl-top' }, h('span', { class: 'rl-top-title' }), supportPill(dev))), body);

  function build() {
    hideError();
    // the error line is reused between steps: drop the fade it was given on the way out
    error.getAnimations?.().forEach((a) => a.cancel());
    if (s.step === 'email') {
      emailInput.value = s.email;
      put(body,
        st.el,
        h('div', { class: 'hf-copy' },
          line('Your email', { cls: 'hf-line--sm' }),
          h('p', { class: 'hf-sub' }, 'We’ll send you a short code. That’s all you need to come in, on this device or any other.')),
        h('div', { class: 'hf-form' },
          field('Email address', emailInput, 'We’ll only use your email to sign you in, to reply when you write to us, and, if we ever must, to tell you something important about your account, your data or the service. Nobody else in Hushmates sees it.', 'hf-signin-email')),
        error,
        h('div', { class: 'hf-actions' },
          send,
          h('button', { type: 'button', class: 'hf-link hf-link--centre', dataset: { test: 'signin-privacy' }, onclick: () => privacySheet(dev) }, 'Privacy details')));
      syncEmail();
    } else {
      codeInput.value = s.code;
      put(body,
        st.el,
        h('div', { class: 'hf-copy' },
          h('h1', { class: 'hf-line hf-line--sm', 'data-autofocus': '' }, 'Enter the code we sent to ', h('span', { class: 'hf-signin-email' }, s.email)),
          h('p', { class: 'hf-sub' }, 'It can take a minute to arrive.')),
        h('div', { class: 'hf-form' },
          field(`Your ${CODE_LENGTH}-digit code`, codeInput, null, 'hf-signin-code', 'hf-signin-code')),
        error,
        h('div', { class: 'hf-actions' },
          go,
          h('div', { class: 'hf-signin-again' }, resendHint, resend),
          change));
      syncCode();
    }
  }

  /** Move between the steps without a hard cut; focus goes to the new step's heading. */
  async function show(step, { focus = false } = {}) {
    s.step = step;
    if (step === 'email') { pending.clear(); s.code = ''; }
    if (!focus) { build(); return; }
    await morph(body, st.el, build);
    if (alive) focusHeading(body);
  }

  async function submit() {
    if (s.busy) return;
    if (s.step === 'email') { if (!send.disabled) await sendCode(); return; }
    if (!go.disabled) await verify();
  }

  async function sendCode({ again = false } = {}) {
    if (s.busy) return;
    s.busy = true;
    const button = again ? resend : send;
    const label = button.textContent;
    button.textContent = 'Sending…';
    again ? syncCode() : syncEmail();
    hideError();
    try {
      // a check that it's a person, if the project asks for one (the host supplies it)
      const captchaToken = dev.env.captchaToken ? await dev.env.captchaToken() : undefined;
      const { email } = await auth.sendCode(s.email, { captchaToken });
      if (!alive) return;
      s.email = email;
      s.sentAt = Date.now();
      pending.set(s.email, s.sentAt);
      s.busy = false;
      button.textContent = label;
      if (again) {
        s.code = '';
        codeInput.value = '';
        speech.say('I’ve sent you a fresh one.');
        syncCode();
        codeInput.focus({ preventScroll: true });
      } else {
        speech.say('It’s on its way.');
        await show('code', { focus: true });
      }
    } catch (e) {
      if (!alive) return;
      s.busy = false;
      button.textContent = label;
      showError(e);
      speech.say('Let’s try that again.');
      again ? syncCode() : syncEmail();
    }
  }

  async function verify() {
    s.busy = true;
    go.textContent = 'Checking…';
    syncCode();
    hideError();
    try {
      await auth.verifyCode(s.email, s.code, { sentAt: s.sentAt });
      pending.clear();
      if (!alive) return;
      st.mallow.cheer?.(0.2);
      speech.say('There you are.');
      await dev.env.signedIn();
    } catch (e) {
      if (!alive) return;
      s.busy = false;
      go.textContent = 'Continue';
      showError(e);
      speech.say(e?.code === 'code-expired' ? 'Let’s get you a fresh code.' : 'Let’s try that again.');
      // (the wait for a new code keeps running: Supabase allows one a minute per address)
      syncCode();
      codeInput.setAttribute('aria-invalid', 'true');
      codeInput.focus({ preventScroll: true });
      codeInput.select?.();
    }
  }

  speech.say(params.reason === 'signed-out' ? 'Welcome back. Let’s sign you in again.'
    : s.step === 'code' ? 'Your code is on its way.' : 'Hello. Let’s find your way in.');
  build();
  return { el: r.el, mood: 'dawn', destroy() { alive = false; clearTimeout(timer); st.destroy(); } };
}
