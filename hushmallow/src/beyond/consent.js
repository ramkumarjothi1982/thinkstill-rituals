// Another Angle — consent and privacy (hushmallow Beyond).
//
// This is the ONE place in hushmallow that describes the automated
// processing behind Another Angle, accurately and plainly (the brand language
// rule's transparency exception). Everywhere else the experience is Zuzu, the
// Mallows and perspectives. Nothing is sent before the person taps Accept;
// "Not now" plays Zuzu's own authored angles on the phone.
//
//   consentState(store) → 'yes' | 'no' | 'unasked'      (a newer notice version asks again)
//   setConsent(store, 'yes'|'no'), withdrawConsent(store), deleteAngleData(store)
//   openConsent({ app, root, onDecide(choice) }) → { el, close }   the calm card in the scene
//   openConsentSheet(app, { onDecide })                               the same notice as a sheet (Settings)
//   mountAngleSettings(app, el, { endpoint })                          the Settings rows
//
// What this phone keeps (all deletable here, and by "Delete everything"):
// the choice, a random device code, a session token and a tally of the four
// feedback buttons per kind of scene. Never words, never photos.

import { h, openSheet, toast } from '../app/ui.js';
import { openSupport } from '../app/scenes/support.js';
import { ensureBeyondCss } from './styles.js';

export const STORE_KEYS = Object.freeze({
  consent: 'beyond.consent', device: 'beyond.device', session: 'beyond.session', feedback: 'beyond.feedback', invite: 'beyond.invite', seen: 'beyond.seen',
});
/** Bump when the notice changes in a way people should read again. */
export const CONSENT_VERSION = 1;

/**
 * How long the outside provider keeps what it receives. Left empty on purpose:
 * the owner must confirm the current figure at privacy.claude.com (Anthropic's
 * privacy centre) before launch — see server/another-angle/README.md, "What is
 * logged, and what is kept". While empty, the notice shows a clearly marked
 * placeholder instead of a number.
 */
export const PROVIDER_RETENTION = '';
export const RETENTION_PLACEHOLDER = '[Owner to confirm before launch: how long Anthropic keeps what it receives, from privacy.claude.com.]';

export function consentState(store) {
  let c = null;
  try { c = store?.get(STORE_KEYS.consent, null); } catch { c = null; }
  if (!c || typeof c !== 'object' || c.v !== CONSENT_VERSION) return 'unasked';
  return c.choice === 'yes' ? 'yes' : c.choice === 'no' ? 'no' : 'unasked';
}
export function setConsent(store, choice) {
  const v = choice === 'yes' ? 'yes' : 'no';
  try { store?.set(STORE_KEYS.consent, { v: CONSENT_VERSION, choice: v, at: new Date().toISOString().slice(0, 10) }); } catch { /* this visit only */ }
  if (v === 'no') { try { store?.remove(STORE_KEYS.session); } catch { /* ignore */ } }
  return v;
}
export function withdrawConsent(store) { return setConsent(store, 'no'); }
/** Removes this phone's Another Angle data: the choice, the device code, the session and the feedback tally. */
export function deleteAngleData(store) {
  for (const k of Object.values(STORE_KEYS)) { try { store?.remove(k); } catch { /* ignore */ } }
}
export function hasAngleData(store) {
  return [STORE_KEYS.consent, STORE_KEYS.device, STORE_KEYS.session, STORE_KEYS.feedback, STORE_KEYS.invite].some((k) => { try { return store?.get(k, null) != null; } catch { return false; } });
}

/** A tally of the four feedback buttons per pattern, on this phone only (no words). */
export function noteFeedback(store, pattern, rating) {
  if (!pattern || !rating) return;
  try {
    const t = store.get(STORE_KEYS.feedback, {}) || {};
    const row = t[pattern] || {};
    row[rating] = Math.min(999, (row[rating] || 0) + 1);
    t[pattern] = row;
    store.set(STORE_KEYS.feedback, t);
  } catch { /* nothing kept */ }
}
/** Patterns marked "Not relevant" more often than "That helped" (the authored path tries others first). */
export function lessWanted(store) {
  try {
    const t = store.get(STORE_KEYS.feedback, {}) || {};
    return Object.keys(t).filter((p) => (t[p].not_relevant || 0) > (t[p].helped || 0) + 1);
  } catch { return []; }
}

// ------------------------------------------------------------ the notice --
function noticeBody(app, { compact = false } = {}) {
  const retention = PROVIDER_RETENTION
    ? h('span', {}, PROVIDER_RETENTION)
    : h('span', { class: 'bx-todo', role: 'note', 'aria-label': 'Placeholder, to be confirmed by hushmallow before launch' }, RETENTION_PLACEHOLDER);
  return h('div', { class: `bx-notice${compact ? ' compact' : ''}` },
    h('p', { class: 'bx-lead' },
      'Another Angle sends the words you choose to share to our secure server. There, an AI language model from an outside provider, Anthropic, suggests a perspective, and our server checks it before Zuzu shows it to you.'),
    h('ul', { class: 'bx-points' },
      h('li', {}, h('b', {}, 'What’s sent. '), 'Only your words and the feeling you pick, plus the lines you’ve already seen when you ask for another angle. Never your photos.'),
      h('li', {}, h('b', {}, 'What’s kept. '), h('span', { class: 'brand-name' }, 'hushmallow'), ' stores nothing you write on its server and doesn’t log your words. A random code for this phone keeps the daily allowance fair. It isn’t your name or your account.'),
      h('li', {}, h('b', {}, 'Anthropic. '), 'The provider receives your words to prepare the perspective. ', retention),
      h('li', {}, h('b', {}, 'Not therapy. '), 'Another Angle isn’t therapy or crisis support, and it can’t replace people who can be there with you. ',
        h('button', { type: 'button', class: 'bx-link', onclick: () => openSupport(app) }, 'Support lines'))),
    h('p', { class: 'bx-small' }, 'You can change your mind any time in Settings, and delete this phone’s Another Angle data there.'));
}

/**
 * The consent card inside the Another Angle scene: calm, above Zuzu (who stays
 * squeezable underneath), not a form. Resolves through onDecide('yes'|'no').
 */
export function openConsent({ app, root = document.body, onDecide } = {}) {
  ensureBeyondCss();
  const reduced = app?.prefs?.reducedMotion?.() ?? false;
  const uid = `bxc${Math.random().toString(36).slice(2, 7)}`;
  let done = false;
  const decide = (choice) => {
    if (done) return;
    done = true;
    setConsent(app?.store, choice);
    try { app?.audio?.ui?.('select'); app?.haptic?.('light'); } catch { /* decoration */ }
    close();
    onDecide?.(choice);
  };
  const accept = h('button', { type: 'button', class: 'hf-send bx-accept', onclick: () => decide('yes') }, 'Accept');
  const notNow = h('button', { type: 'button', class: 'hf-ghost bx-notnow', onclick: () => decide('no') }, 'Not now');
  const el = h('section', { class: `bx-consent hf-ui${reduced ? ' reduced' : ''}`, role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': `${uid}-t`, 'data-bx': 'consent' },
    h('h2', { class: 'bx-title', id: `${uid}-t` }, 'Before Zuzu looks at your words'),
    h('div', { class: 'bx-scroll' }, noticeBody(app)),
    h('div', { class: 'bx-actions' }, notNow, accept),
    h('p', { class: 'bx-small bx-after' }, 'Not now: Zuzu uses its own angles, worked out on this phone. Nothing is sent.'));
  root.append(el);
  requestAnimationFrame(() => el.classList.add('in'));
  setTimeout(() => { if (!done) accept.focus({ preventScroll: true }); }, reduced ? 60 : 420);
  function close() {
    el.classList.remove('in'); el.classList.add('out');
    setTimeout(() => el.remove(), reduced ? 120 : 360);
  }
  return { el, close: () => { done = true; close(); }, rect: () => el.getBoundingClientRect() };
}

/** The same notice as a sheet (Settings → switching sharing on). */
export function openConsentSheet(app, { onDecide } = {}) {
  ensureBeyondCss();
  let decided = false;
  const s = openSheet({
    title: 'Another Angle and your words', label: 'Another Angle privacy notice',
    body: noticeBody(app, { compact: true }),
    foot: h('div', { class: 'row-btns' },
      h('button', { class: 'btn', onclick: () => { decided = true; setConsent(app.store, 'no'); s.close(); onDecide?.('no'); } }, 'Not now'),
      h('button', { class: 'btn primary', autofocus: true, onclick: () => { decided = true; setConsent(app.store, 'yes'); s.close(); onDecide?.('yes'); } }, 'Accept')),
    onClose: () => { if (!decided) onDecide?.(null); },
  });
  return s;
}

/**
 * Settings rows (Privacy): share words with Another Angle (on/off; on shows the
 * notice first), the notice itself, and "Delete my Another Angle data".
 */
export function mountAngleSettings(app, el, { endpoint = null } = {}) {
  ensureBeyondCss();
  const { store } = app;
  const rows = [];
  if (endpoint) {
    const input = h('input', { type: 'checkbox', class: 'switch', 'aria-label': 'Share my words with Another Angle' });
    input.checked = consentState(store) === 'yes';
    input.addEventListener('change', () => {
      if (input.checked) {
        input.checked = false;
        openConsentSheet(app, { onDecide: (c) => { input.checked = c === 'yes'; if (c === 'yes') toast('Another Angle can look at your words now'); } });
      } else {
        withdrawConsent(store);
        toast('Another Angle will use Zuzu’s own angles');
      }
      app.haptic?.('light');
    });
    rows.push(h('label', { class: 'setting' },
      h('div', { class: 'grow' }, 'Share my words with Another Angle',
        h('small', { class: 'bx-setting-note' }, 'On: the words you choose go to our server for a new perspective. Off: Zuzu’s own angles, on this phone.')),
      input));
    rows.push(h('button', { class: 'btn ghost block', onclick: () => openConsentSheet(app, { onDecide: () => { input.checked = consentState(store) === 'yes'; } }) }, 'Another Angle privacy notice'));
  }
  if (endpoint || hasAngleData(store)) {
    rows.push(h('button', { class: 'btn block', style: { marginTop: '8px' }, onclick: () => confirmDelete() }, 'Delete my Another Angle data'));
  }
  el.replaceChildren(...rows);
  function confirmDelete() {
    const s = openSheet({
      title: 'Delete your Another Angle data?',
      body: h('p', { class: 'bx-sheet-copy' }, 'This removes this phone’s Another Angle code, your sharing choice and your feedback. Our server keeps no copy of your words, so there’s nothing of yours to delete there; its daily usage counts hold no words and are cleared after two days.'),
      foot: h('div', { class: 'row-btns' }, h('button', { class: 'btn', onclick: () => s.close() }, 'Cancel'),
        h('button', { class: 'btn primary', onclick: () => { deleteAngleData(store); s.close(); toast('Deleted'); mountAngleSettings(app, el, { endpoint }); } }, 'Delete')),
    });
  }
  return el;
}
