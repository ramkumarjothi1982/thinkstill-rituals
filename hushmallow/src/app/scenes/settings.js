// SETTINGS — reading, the Hushfold, feel, privacy, plan, about. Everything
// lives on this device. With web subscriptions on (src/app/billing.js) and the
// account signed in, Plan also has "Manage subscription": Stripe's customer
// portal, where cancelling is as easy as subscribing was ("Change plan, update
// your card or cancel." under it says so), and a line on when the plan renews
// or ends. The plans page's upgrades never open that page (they open Stripe's
// confirmation of the one change): this is the way to it, always here. Builds with optional sign-in (src/auth/) add one
// account row at the top of Privacy; "Delete everything on this phone" then
// says whose things it deletes (this account's, or the guest's when accounts
// also live on this phone). About's first sentence (what is written in advance)
// and its privacy lines come from src/app/privacy.js, shared with the Plans
// page, so they follow Another Angle going live together. Privacy ends with the
// Privacy Policy and About with "Terms · Privacy Policy" (src/app/legal.js).
import { h, iconBtn, openSheet, toast } from '../ui.js';
import { PLANS } from '../entitlements.js';
import { openSupport } from './support.js';
import { BUILD, deploySettings } from '../config.js';
import { RUNNING } from '../update.js';
import { type, withBrand, keepHyphenated } from '../../ui/type.js';
import { aboutIntro, aboutPrivacy } from '../privacy.js';
import { accountNamespaces } from '../../auth/namespace.js';
import { forgetVisitSafety } from '../visit-safety.js';
import { legalLink, legalLinks } from '../legal.js';

const TEXT_SIZES = [[1, 'Standard'], [1.12, 'Larger'], [1.25, 'Largest']];
const SPEEDS = [[0.75, '0.75×'], [1, '1×'], [1.25, '1.25×'], [1.5, '1.5×']];

/** Under Settings → Manage subscription: what that page is for, cancelling included (never hidden or softened). */
export const MANAGE_HINT = 'Change plan, update your card or cancel.';

export default function settings(app) {
  const { prefs, ent, world, rec } = app;
  const stageLabel = deploySettings().stage === 'staging' ? ' · staging' : '';
  const note = (text) => h('small', { style: type('caption', { display: 'block', color: 'var(--text-3)', marginTop: '2px' }) }, text);
  const rowLabel = (label, sub) => h('div', { class: 'grow', style: type('row') }, label, sub ? note(sub) : null);
  const sw = (key, label, sub, after) => {
    const input = h('input', { type: 'checkbox', class: 'switch', 'aria-label': label });
    input.checked = !!prefs.get(key);
    input.addEventListener('change', () => { prefs.set(key, input.checked); app.haptic('light'); after?.(input.checked); });
    return h('label', { class: 'setting' }, rowLabel(label, sub), input);
  };
  /** A small segmented control: one pref, a few fixed values. */
  const segmented = (key, options, label) => {
    const group = h('div', { role: 'group', 'aria-label': label, style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' } });
    const draw = () => group.replaceChildren(...options.map(([v, l]) => h('button', {
      type: 'button', class: 'chip', 'aria-pressed': String(+prefs.get(key) === v), 'aria-label': `${label}: ${l}`,
      style: type('control', { minHeight: '44px', padding: '0 14px' }),
      onclick: () => { prefs.set(key, v); app.haptic('light'); draw(); },
    }, l)));
    draw();
    return group;
  };
  const motionSel = h('select', { class: 'search', style: type('input', { width: 'auto', minHeight: '44px' }), 'aria-label': 'Motion' },
    ...[['system', 'Match my phone'], ['reduced', 'Reduced'], ['full', 'Full']].map(([v, l]) => h('option', { value: v }, l)));
  motionSel.value = prefs.get('motion');
  motionSel.addEventListener('change', () => prefs.set('motion', motionSel.value));
  const vol = h('input', { type: 'range', class: 'range', min: 0, max: 1, step: 0.05, value: prefs.get('volume'), 'aria-label': 'Volume', style: { maxWidth: '150px' } });
  vol.addEventListener('change', () => prefs.set('volume', Number(vol.value)));

  const tierName = ent.tier() === 'none' ? 'No plan yet' : PLANS[ent.tier()].name + (ent.source() === 'test' ? ' (test)' : '');
  // web subscriptions: when the plan renews or ends, and a card that needs a look (the billing server's last answer)
  const webPlan = ent.isWeb ? ent.webPlan?.() : null;
  const planNote = webPlan ? webPlanNote(webPlan, ent.tier()) : null;
  const manageable = !!webPlan && ent.webSignedIn() && (webPlan.manageable || ent.tier() !== 'none');
  const section = (title) => h('h2', { class: 'eyebrow', style: { marginTop: '22px', marginBottom: '2px' } }, title);
  const sample = h('p', { style: type('subtitle', { margin: '12px 0 2px', color: 'var(--text-1)', textAlign: 'center', textWrap: 'balance' }) }, 'Something bothering you? Want to tell me?');
  // Another Angle (W8): share-my-words switch, the notice, Tester code and "Delete my Another Angle data", only
  // where they mean something: with the server on, for hushmallow Beyond; and for anyone with its data still here
  // (then only Delete, unless Beyond is on)
  // Accounts (optional sign-in): one row at the top of Privacy, only when this build has sign-in on
  const signIn = !!app.auth?.enabled;
  const signedIn = signIn && app.auth.status() === 'signed-in';
  // "Delete everything on this phone" is only that when nobody else's things live here:
  // signed in it is this account's things; a guest on a phone that accounts also use, the guest's
  const otherAccounts = signIn && !signedIn && (() => { try { return accountNamespaces(globalThis.localStorage).length > 0; } catch { return false; } })();
  const deleteLabel = signedIn ? 'Delete this account’s things on this phone' : otherAccounts ? 'Delete the guest’s things on this phone' : 'Delete everything on this phone';
  const accountRow = h('div');
  if (signIn) import('./account.js').then((m) => m.mountAccountRow(app, accountRow)).catch(() => {});
  // About mentions accounts only where the account row can show: signed in, or once the project has said it is
  // ready for sign-in (src/auth/readiness.js); until then, and when it is not ready, it reads as with sign-in off
  const aboutBody = (withAccounts) => [...withBrand(aboutIntro({ beyond: PLANS.ultra?.name || 'hushmallow Beyond' })), ' ',
    aboutPrivacy({ signIn: withAccounts, beyond: PLANS.ultra?.name || 'hushmallow Beyond' }), ' It’s a wellbeing app, not a medical service.'];
  const aboutPara = h('p', { 'data-about': 'privacy', style: type('body', { color: 'var(--text-2)', margin: '8px 0 0' }) }, ...aboutBody(signedIn));
  if (signIn && !signedIn && typeof app.auth.ready === 'function') {
    app.auth.ready().then((ok) => { if (ok && aboutPara.isConnected !== false) aboutPara.replaceChildren(...aboutBody(true)); }, () => {});
  }
  const angleRows = h('div');
  Promise.all([import('../../beyond/consent.js'), import('../../beyond/endpoint.js')]).then(([c, a]) => {
    const endpoint = a.resolveEndpoint();
    const live = !!endpoint && ent.has('ultra');
    if (live || c.hasAngleData(app.store)) c.mountAngleSettings(app, angleRows, { endpoint: live ? endpoint : null });
  }).catch(() => {});

  const el = h('div', { class: 'settings', style: { display: 'flex', flexDirection: 'column', height: '100%' } },
    h('div', { class: 'topbar' }, iconBtn('back', 'Back', () => app.back()), h('div', { class: 'grow' })),
    h('div', { class: 'card', style: { marginTop: '12px', overflowY: 'auto', maxHeight: 'calc(100dvh - 110px)' } },
      h('h1', { class: 't-screen-title', style: { margin: 0 } }, 'Settings'),

      section('Reading'),
      h('div', { class: 'setting', style: { display: 'block' } }, rowLabel('Text size', 'Every word in the app, subtitles included'), segmented('textScale', TEXT_SIZES, 'Text size'), sample),
      h('div', { class: 'setting', style: { display: 'block' } }, rowLabel('Subtitle speed', 'How long each Mallow line stays. You can also pause, replay or skip any line.'), segmented('subtitleSpeed', SPEEDS, 'Subtitle speed')),

      section('The Hushfold'),
      sw('autoFlow', 'Auto-flow', 'When a world is complete, the next one begins by itself. Off: you choose when.'),

      section('Feel'),
      sw('sound', 'Sound', 'Mallow voices, world sounds and ambience'),
      h('div', { class: 'setting' }, rowLabel('Volume'), vol),
      sw('haptics', 'Haptics', 'Gentle taps and buzzes. On iPhone this needs the App Store app.'),
      h('div', { class: 'setting' }, rowLabel('Motion', 'Reduced keeps everything, with calmer movement'), motionSel),
      sw('lowStim', 'Low stimulation', 'Softer visuals and fewer sparkles'),

      section('Privacy'),
      accountRow,
      sw('saveHistory', 'Remember what I played', 'Rituals and worlds, how they felt and where you paused. Never your words or photos.'),
      // (it governs only the simpler Another Angle that opens when the new one can't load: its sealed Future Lens predictions)
      sw('saveWords', 'Keep sealed predictions', 'From the simpler Another Angle that opens if the new one can’t load. Kept on this phone with your words, never uploaded.'),
      angleRows,
      h('button', { class: 'btn block', style: { marginTop: '12px', textWrap: 'balance' }, 'data-act': 'delete-local', onclick: () => confirmClear() }, deleteLabel),
      // the whole story in plain words (legal/privacy.html, a new tab)
      legalLink('privacy', { cls: 'btn ghost block', style: { textDecoration: 'none', marginTop: '4px' } }),

      section('Plan'),
      h('div', { class: 'setting' }, rowLabel(tierName, planNote), h('button', { class: 'btn', style: { minHeight: '44px' }, onclick: () => app.go('plans') }, 'View plans')),
      ent.source() === 'test' ? h('button', { class: 'btn ghost block', onclick: () => { ent.cancelTest(); toast('Test plan removed'); app.go('home'); } }, 'Remove test plan') : null,
      manageable ? h('button', { class: 'btn ghost block', 'data-act': 'manage-subscription', 'aria-describedby': 'manage-hint', onclick: (e) => manageSubscription(e.currentTarget) }, 'Manage subscription') : null,
      manageable ? h('p', { id: 'manage-hint', 'data-manage-hint': '', style: type('caption', { color: 'var(--text-3)', textAlign: 'center', margin: '0 0 4px', textWrap: 'balance' }) }, MANAGE_HINT) : null,

      section('About'),
      // what is written in advance and what leaves this phone: the same source as the Plans page (src/app/privacy.js),
      // so the first sentence and the privacy lines switch together when Another Angle goes live
      aboutPara,
      h('button', { class: 'btn ghost block', onclick: () => openSupport(app) }, 'Support lines'),
      legalLinks(),
      // the version, exactly as BUILD says it (the server sees the same string), never broken at a hyphen ("sign-" / "in");
      // "· staging" on a branch preview (src/app/config.js deploySettings), so a tester can tell it from production
      h('p', { 'data-version': '', style: type('caption', { color: 'var(--text-3)', textAlign: 'center', margin: '8px 0 0', textWrap: 'balance' }) }, ...keepHyphenated(`Version ${BUILD}${stageLabel}${RUNNING ? ` · ${RUNNING}` : ''}`)),
      // developer tools: not part of the published site
      ['localhost', '127.0.0.1'].includes(location.hostname)
        ? h('div', { style: { display: 'grid', gap: '4px', marginTop: '6px' } },
          h('a', { class: 'btn ghost block', href: './studio.html', style: { textDecoration: 'none' } }, 'Mallow Emotion Studio'),
          h('button', { class: 'btn ghost block', onclick: () => app.go('classic') }, 'Classic home (QA)')) : null));

  /** Stripe's customer portal: cancel, change plan, update the card, see receipts (the page leaves on success). */
  async function manageSubscription(btn) {
    if (btn.disabled) return;
    btn.disabled = true;
    let r = null;
    try { r = await ent.manage(); } catch { r = null; }
    // leaving for the portal; Back from there can restore this page as it was, so the button wakes again
    if (r?.redirecting) { setTimeout(() => { btn.disabled = false; }, 4000); return; }
    btn.disabled = false;
    if (r?.needsAccount) { app.go('account', { view: 'signin' }); return; }
    toast(r?.none ? 'There’s no subscription on this account yet.' : 'That didn’t open just now. Try again in a moment.', 3200);
  }

  function confirmClear() {
    const body = signedIn ? 'This removes this account’s favourites, history, sealed predictions, kept Belief Mallows, Memory Garden, saved worlds and settings from this phone. What you chose to keep with your account stays with it, and other people’s things on this phone aren’t touched. Your subscription isn’t affected.'
      : otherAccounts ? 'This removes the guest’s favourites, history, sealed predictions, kept Belief Mallows, Memory Garden, saved worlds and settings from this phone. Accounts on this phone keep their own things. Your subscription isn’t affected.'
        : 'This removes your favourites, history, sealed predictions, kept Belief Mallows, Memory Garden, saved worlds and settings from this phone. Your subscription isn’t affected.';
    const s = openSheet({ title: signedIn ? 'Delete this account’s things?' : otherAccounts ? 'Delete the guest’s things?' : 'Delete everything?', body: h('p', { style: type('body', { margin: 0, color: 'var(--text-2)' }) }, body),
      foot: h('div', { class: 'row-btns' }, h('button', { class: 'btn', onclick: () => s.close() }, 'Cancel'),
        h('button', { class: 'btn primary', onclick: () => { const keep = app.store.get('entitlement', null); app.store.clearAll(); if (keep) app.store.set('entitlement', keep); prefs.reset(); rec.clearAll(); forgetVisit(); s.close(); toast('Deleted'); app.go('home'); } }, 'Delete')) });
  }
  /**
   * The tab's visit safety goes too (visit-safety.js: the level of something heavy earlier in this visit, kept in this tab's
   * sessionStorage for 12 h): its stored copy, and the page's own copy that would write it back on the way home.
   */
  function forgetVisit() {
    forgetVisitSafety();
    if (app.state) { app.state.hfSafety = null; app.state.hfChecked = false; app.state.hfAttentive = false; app.state.hfSoft = false; }
  }

  // the card fills the screen, so the Mallow rests out of sight (not half-hidden behind its corner)
  return { el, title: 'Settings', enter() { world.dim(true); world.showMallow(false); world.setStage('resting'); }, leave() { world.showMallow(true); } };
}

/**
 * "Renews on 12 November 2026", "Ends on 12 November 2026. Nothing more is charged." or a card that needs a look.
 * The end is the server's ends_at (endsAt); an answer from before it had one: the period end, when cancelled.
 */
export function webPlanNote({ status, periodEnd, endsAt = null, cancelAtPeriodEnd } = {}, tier = 'none') {
  if (tier === 'none') return null;
  if (status === 'past_due') return 'Your last payment didn’t go through. You can update your card in Manage subscription.';
  const day = (t) => (Number.isFinite(t) ? new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : null);
  const end = Number.isFinite(endsAt) ? endsAt : cancelAtPeriodEnd ? periodEnd : null;
  if (day(end)) {
    // an end set after this period (the Dashboard can; the portal cancels at the period end, D7): it still renews until then
    const renewsFirst = !cancelAtPeriodEnd && Number.isFinite(periodEnd) && end > periodEnd + 86400000;
    return renewsFirst ? `Renews on ${day(periodEnd)}. Ends on ${day(end)}.` : `Ends on ${day(end)}. Nothing more is charged.`;
  }
  return day(periodEnd) ? `Renews on ${day(periodEnd)}` : null;
}
