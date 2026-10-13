// ACCOUNT — optional sign-in (src/auth/). Registered as the scene 'account'.
//
// STAGE 1 STUB: the routes, the entry points and the once-only question
// about this device's guest things are real; the full screens (welcome,
// create account, check your email, sign in, forgot / new password, the
// account card with sync toggles, change password, delete) replace the body
// of this scene in the next stage, in the same file and the same scene
// contract. Guests keep every existing experience: nothing here is required.
//
// Entry points for the coordinator (Settings row, side panel link):
//   mountAccountRow(app, el)   fills `el` with one Settings row (nothing when sign-in is off)
//   openAccount(app, params)   opens this scene (Back returns where you were)
import { h, iconBtn, toast } from '../ui.js';
import { type } from '../../ui/type.js';

const CSS = new URL('../../auth/auth.css', import.meta.url).href;
function ensureCss() {
  if ([...document.querySelectorAll('link[rel="stylesheet"]')].some((l) => l.href === CSS)) return;
  document.head.append(h('link', { rel: 'stylesheet', href: CSS }));
}

/** Opens the account scene (for the side panel). */
export function openAccount(app, params = {}) { return app.go('account', params); }

/** One Settings row: "Account · Signed in as …" or "Sign in (optional)". Nothing when sign-in is off. */
export function mountAccountRow(app, el) {
  const auth = app.auth;
  if (!el) return;
  if (!auth?.enabled) { el.replaceChildren(); return; }
  const u = auth.user();
  const signedIn = auth.status() === 'signed-in' && u;
  const label = signedIn ? 'Your account' : 'Sign in or create an account';
  const sub = signedIn ? (u.email ? `Signed in as ${u.email}` : 'Signed in') : 'Optional. Everything works without one.';
  el.replaceChildren(h('div', { class: 'setting' },
    h('div', { class: 'grow', style: type('row') }, label, h('small', { style: type('caption', { display: 'block', color: 'var(--text-3)', marginTop: '2px' }) }, sub)),
    h('button', { class: 'btn', style: { minHeight: '44px' }, onclick: () => openAccount(app) }, signedIn ? 'Manage' : 'Sign in')));
}

export default function account(app, params = {}) {
  ensureCss();
  const auth = app.auth;
  const title = h('h1', { class: 'hm-auth-title', id: 'hm-account-title', tabindex: '-1' }, 'Your account');
  const lede = h('p', { class: 'hm-auth-lede', role: 'status', 'aria-live': 'polite' });
  const bodyEl = h('div', { class: 'hm-auth-body' });
  const card = h('section', { class: 'hm-auth-card', 'aria-labelledby': 'hm-account-title' }, title, lede, bodyEl);
  const el = h('div', { class: 'hm-auth-scene', 'data-auth-view': 'loading' },
    h('div', { class: 'topbar' }, iconBtn('back', 'Back', () => app.back()), h('div', { class: 'grow' })),
    h('div', { class: 'hm-auth-scroll' }, card, h('p', { class: 'hm-auth-tagline' }, 'Less noise. More magic.')));
  const view = (name, t, line, ...kids) => { el.dataset.authView = name; title.textContent = t; lede.textContent = line; bodyEl.replaceChildren(...kids); };
  const btn = (label, onclick, cls = '') => h('button', { type: 'button', class: `hm-auth-btn ${cls}`.trim(), onclick }, label);

  function draw() {
    if (!auth?.enabled) { view('off', 'Accounts', 'This version of hushmallow doesn’t use accounts. Everything stays on this device.', btn('Back', () => app.back(), 'primary')); return; }
    const u = auth.user();
    if (auth.status() !== 'signed-in' || !u) {
      view('guest', 'Your account', 'An account is optional. You can keep using hushmallow as a guest.',
        h('p', { class: 'hm-auth-hint hm-auth-center' }, 'Sign-in screens are on their way.'),
        btn('Continue as a guest', () => app.back(), 'primary'));
      return;
    }
    if (auth.pendingGuestChoice) {
      view('guest-choice', 'Keep this device’s things?', 'This device has favourites, settings or a Memory Garden from before you signed in. Keep a copy with your account here? Nothing is uploaded.',
        h('div', { class: 'hm-auth-actions' },
          btn('Keep them with my account', () => choose('keep'), 'primary'),
          btn('Start fresh', () => choose('fresh'))));
      return;
    }
    view('account', 'Your account', u.email ? `Signed in as ${u.email}` : 'Signed in',
      h('div', { class: 'hm-auth-actions' },
        btn('Sign out', async (e) => { e.currentTarget.disabled = true; const a = await auth.load(); await a.signOut(); }),
        btn('Back to hushmallow', () => app.back(), 'ghost')));
  }

  async function choose(choice) {
    try {
      const a = await auth.load();
      a.chooseGuestData(choice);
      a.enter('#account');   // reloads into this account's namespace with the copy in place
    } catch { toast('Something didn’t work. Please try again.'); }
  }

  let off = null;
  return {
    el,
    title: 'Account',
    enter() {
      app.world?.dim?.(true);
      app.world?.showMallow?.(false);
      draw();
      if (auth?.enabled) off = auth.onChange(() => draw());
      title.focus?.();
    },
    leave() { off?.(); app.world?.showMallow?.(true); },
  };
}
