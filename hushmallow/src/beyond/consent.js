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
//   openConsent({ app, root, onDecide(choice), support? }) → { el, close }   the calm card in the scene
//   openConsentSheet(app, { onDecide })                               the same notice as a sheet (Settings)
//   mountAngleSettings(app, el, { endpoint })                          the Settings rows (with a Tester code row)
//
// What this phone keeps (all deletable here, and by "Delete everything"):
// the choice, a random device code, a session token, a tester code if one was
// entered (and whether the server asked for one), and a tally of the four
// feedback buttons per kind of scene. Never words, never photos.

import { h, openSheet, toast } from '../app/ui.js';
import { openSupport } from '../app/scenes/support.js';
import { ensureBeyondCss } from './styles.js';

export const STORE_KEYS = Object.freeze({
  consent: 'beyond.consent', device: 'beyond.device', session: 'beyond.session', feedback: 'beyond.feedback', invite: 'beyond.invite', seen: 'beyond.seen', visits: 'beyond.visits',
  // the server asked for a tester code (and which code it refused): no new session is asked for until the code changes
  inviteNeeded: 'beyond.inviteNeeded',
});
/** Bump when the notice changes in a way people should read again (2: the provider's real retention, 12 Oct 2026). */
export const CONSENT_VERSION = 2;

/**
 * How long the outside provider keeps what it receives: the owner's approved wording (12 Oct 2026,
 * docs/integration/DECISIONS.md line 1, checked against Anthropic's Commercial Terms and its API
 * data-retention docs). It stays true only while the Anthropic organisation is not in the Development
 * Partner Program and has no retention override. Shown after "The provider receives your words to
 * prepare the perspective." While it is empty, the notice shows the marked placeholder instead.
 */
export const PROVIDER_RETENTION = 'Anthropic doesn’t use your words to train its AI. It usually deletes them within 30 days.';
/** The owner's approved wording (DECISIONS.md lines 2 and 3), on the consent card and the privacy sheet. */
export const PROVIDER_SAFETY_HOLD = 'If its automatic safety checks flag a message as breaking its rules, Anthropic can keep it for up to 2 years. It also keeps anything the law requires it to.';
export const PROVIDER_USE = 'Anthropic uses your words only to prepare your perspective, to keep its service safe, and where the law requires. It isn’t sent your account or photos, but it sees anything you type, names included.';
/** The owner's approved wording (DECISIONS.md line 4), on the delete-data sheet. */
export const PROVIDER_DELETE = 'Anthropic’s copy is usually deleted within 30 days (kept longer only if flagged or the law requires it). We can’t delete it sooner from here.';
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
  return [STORE_KEYS.consent, STORE_KEYS.device, STORE_KEYS.session, STORE_KEYS.feedback, STORE_KEYS.invite, STORE_KEYS.inviteNeeded].some((k) => { try { return store?.get(k, null) != null; } catch { return false; } });
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
/** "Not therapy or crisis support", with the way to support (always in view on the consent card). */
function notTherapy(app, tag = 'p', support = null) {
  return h(tag, { class: 'bx-small bx-care' }, h('b', {}, 'Not therapy or crisis support. '),
    h('button', { type: 'button', class: 'bx-link', onclick: () => (support ? support() : openSupport(app)) }, 'Support lines'));
}
/**
 * What is sent, kept and shared, accurately (review r3: every request is described, the feedback buttons
 * and the session code included). `therapy`: the "Not therapy" point in the list too (the sheet in
 * Settings; the card keeps it by its buttons instead, always in view).
 */
function noticeBody(app, { compact = false, therapy = false } = {}) {
  const retention = PROVIDER_RETENTION
    ? h('span', {}, PROVIDER_RETENTION)
    : h('span', { class: 'bx-todo', role: 'note', 'aria-label': 'Placeholder, to be confirmed by hushmallow before launch' }, RETENTION_PLACEHOLDER);
  return h('div', { class: `bx-notice${compact ? ' compact' : ''}` },
    h('p', { class: 'bx-lead' },
      'Your words go to our secure server, where an AI language model from Anthropic, an outside provider, suggests a perspective.'),
    h('ul', { class: 'bx-points' },
      h('li', {}, h('b', {}, 'What’s sent. '), 'Only your words, the feeling and the kind of help you pick, and (for another angle) the lines you’ve seen, with the app’s language and a random number for each request. A feedback tap sends which button and what kind of angle it was, never your words. Never your photos.'),
      h('li', {}, h('b', {}, 'What’s kept. '), h('span', { class: 'brand-name' }, 'hushmallow'), ' stores nothing you write and doesn’t log your words. To start, the app sends a random code for this phone, its version and device type (and any invite code) to keep the daily allowance fair. Never your name or account.'),
      h('li', {}, h('b', {}, 'Anthropic. '), 'The provider receives your words to prepare the perspective. ', retention, ` ${PROVIDER_SAFETY_HOLD}`),
      h('li', {}, h('b', {}, 'Anthropic’s use. '), PROVIDER_USE),
      therapy ? notTherapy(app, 'li') : null),
    h('p', { class: 'bx-small' }, 'You can change your mind any time in Settings, and delete this phone’s Another Angle data there.'));
}

/**
 * The consent card inside the Another Angle scene: calm, above Zuzu (who stays
 * squeezable underneath), not a form. Resolves through onDecide('yes'|'no').
 * When the notice is taller than the card, a "More below" cue says so (and
 * scrolls it); "Not therapy" and the support link sit by the buttons, in view.
 */
export function openConsent({ app, root = document.body, onDecide, support = null } = {}) {
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
  // two equal choices (same size, same weight): the notice informs, it never nudges towards yes
  const accept = h('button', { type: 'button', class: 'bx-choice bx-accept', onclick: () => decide('yes') }, 'Accept');
  const notNow = h('button', { type: 'button', class: 'bx-choice bx-notnow', onclick: () => decide('no') }, 'Not now');
  const title = h('h2', { class: 'bx-title', id: `${uid}-t`, tabindex: '-1' }, 'Before Zuzu looks at your words');
  const scroll = h('div', { class: 'bx-scroll', id: `${uid}-d`, tabindex: '0', 'aria-label': 'The notice' }, noticeBody(app));
  const more = h('button', { type: 'button', class: 'bx-more', hidden: true, 'aria-label': 'Show more of the notice', onclick: () => {
    scroll.scrollBy({ top: Math.max(60, scroll.clientHeight * 0.8), behavior: reduced ? 'auto' : 'smooth' });
  } }, 'More below', h('span', { class: 'bx-more-arrow', 'aria-hidden': 'true' }, '↓'));
  const el = h('section', { class: `bx-consent hf-ui${reduced ? ' reduced' : ''}`, role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': `${uid}-t`, 'aria-describedby': `${uid}-d`, 'data-bx': 'consent' },
    title,
    h('div', { class: 'bx-scrollwrap' }, scroll, more),
    notTherapy(app, 'p', support),
    h('div', { class: 'bx-actions' }, notNow, accept),
    h('p', { class: 'bx-small bx-after' }, 'Not now: nothing is sent, Zuzu’s own angles.'));
  root.append(el);
  // the cue shows while there is more of the notice below what fits (looked at on scroll, resize and as fonts land)
  const cue = () => {
    if (done) return;
    const left = scroll.scrollHeight - scroll.clientHeight - scroll.scrollTop;
    const show = left > 12;
    if (more.hidden === show) more.hidden = !show;
    el.classList.toggle('bx-has-more', show);
  };
  scroll.addEventListener('scroll', cue, { passive: true });
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(cue) : null;
  ro?.observe(scroll); if (scroll.firstChild) ro?.observe(scroll.firstChild);
  requestAnimationFrame(() => { el.classList.add('in'); cue(); });
  setTimeout(cue, 600);
  // focus goes to the notice's title (read first), never to a button
  setTimeout(() => { if (!done) title.focus({ preventScroll: true }); }, reduced ? 60 : 420);
  function close() {
    ro?.disconnect();
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
    body: noticeBody(app, { compact: true, therapy: true }),
    foot: h('div', { class: 'row-btns' },
      h('button', { class: 'btn', onclick: () => { decided = true; setConsent(app.store, 'no'); s.close(); onDecide?.('no'); } }, 'Not now'),
      h('button', { class: 'btn', onclick: () => { decided = true; setConsent(app.store, 'yes'); s.close(); onDecide?.('yes'); } }, 'Accept')),
    onClose: () => { if (!decided) onDecide?.(null); },
  });
  return s;
}

/**
 * Settings rows (Privacy): share words with Another Angle (on/off; on shows the
 * notice first), the notice itself, a Tester code (only needed while the server
 * asks for one: TESTER_INVITE_CODES), and "Delete my Another Angle data".
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
    rows.push(testerCodeRow(app));
  }
  if (endpoint || hasAngleData(store)) {
    rows.push(h('button', { class: 'btn block', style: { marginTop: '8px' }, onclick: () => confirmDelete() }, 'Delete my Another Angle data'));
  }
  el.replaceChildren(...rows);
  function confirmDelete() {
    const s = openSheet({
      title: 'Delete your Another Angle data?',
      body: h('div', {},
        h('p', { class: 'bx-sheet-copy' }, 'This removes this phone’s Another Angle code, any tester code, your sharing choice and your feedback. Our server keeps no copy of your words, so there’s nothing of yours to delete there; its daily usage counts hold no words and are cleared after two days.'),
        h('p', { class: 'bx-sheet-copy', style: { marginTop: '10px' } }, PROVIDER_DELETE)),
      foot: h('div', { class: 'row-btns' }, h('button', { class: 'btn', onclick: () => s.close() }, 'Cancel'),
        h('button', { class: 'btn primary', onclick: () => { deleteAngleData(store); s.close(); toast('Deleted'); mountAngleSettings(app, el, { endpoint }); } }, 'Delete')),
    });
  }
  return el;
}

/** Stores a tester code (trimmed; empty removes it). A new code always asks the server for a new session. */
export function saveTesterCode(store, value) {
  const code = String(value ?? '').trim().slice(0, 64);
  try {
    if (code) store?.set(STORE_KEYS.invite, code); else store?.remove(STORE_KEYS.invite);
    store?.remove(STORE_KEYS.session);
    store?.remove(STORE_KEYS.inviteNeeded);
  } catch { /* this visit only */ }
  return code;
}

/** "Tester code": a text field (16px, so iOS never zooms) and Save; Enter saves too. */
function testerCodeRow(app) {
  const { store } = app;
  const id = `bxinv${Math.random().toString(36).slice(2, 7)}`;
  let current = '';
  try { const v = store.get(STORE_KEYS.invite, ''); current = typeof v === 'string' ? v : ''; } catch { current = ''; }
  const field = h('input', { id, type: 'text', class: 'search bx-invite', maxlength: '64', autocomplete: 'off', autocapitalize: 'none', autocorrect: 'off',
    spellcheck: 'false', enterkeyhint: 'done', placeholder: 'Only if you were given one', 'aria-describedby': `${id}-n` });
  field.value = current;
  const save = () => {
    const code = saveTesterCode(store, field.value);
    field.value = code;
    toast(code ? 'Tester code saved' : 'Tester code removed');
    app.haptic?.('light');
  };
  field.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); save(); field.blur(); } });
  return h('div', { class: 'setting bx-invite-setting', style: { display: 'block' } },
    h('label', { for: id, class: 'grow' }, 'Tester code',
      h('small', { class: 'bx-setting-note', id: `${id}-n` }, 'Only while Another Angle is open to invited testers. It is sent with your next angle.')),
    h('div', { class: 'bx-invite-row' }, field, h('button', { class: 'btn', type: 'button', onclick: save }, 'Save')));
}
