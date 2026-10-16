// PLANS — two invitations into the Hushfold, not a pricing table.
// hushmallow Flow and hushmallow Beyond, each with its tagline and what it
// opens; monthly or yearly; restore; support stays free and one tap away.
// No countdowns, no fake discounts, no pressure. The live Mallow stays
// squeezable above the invitation (the top of the screen lets touches
// through to it) and steps aside once the invitations scroll over it.
// Each invitation leads with three or four things; the rest waits behind
// "Everything included".
// With web subscriptions on (src/app/billing.js, off by default) "Step into…"
// asks a guest to sign in first (a web plan belongs to an account), then goes
// on to the secure checkout page for the chosen plan and period; prices come
// from configuration only (none set: none shown). Off, nothing here changes.
// The foot ends with small "Terms · Privacy Policy" links (src/app/legal.js).
import { h, iconBtn, toast } from '../ui.js';
import { PLANS } from '../entitlements.js';
import { BRAND, brandName } from '../../brand.js';
import { brandMark, logoImg, fitWhole } from '../../ui/type.js';
import { openSupport } from './support.js';
import { plansBeyondNote } from '../privacy.js';
import { legalLinks } from '../legal.js';

const PERIODS = [['monthly', 'Monthly'], ['yearly', 'Yearly']];
// Lines that must not leave a word alone at 320 px (no-break spaces; app.css also
// balances .invite-period): never "nothing is / charged" or "It’s / free →", and the
// test-purchase note breaks only after a "·", never before one.
export const SUPPORT_LINK = 'Need support right\u00a0now? It’s\u00a0free\u00a0→';
/** Said on the plans page when a test plan kept on this phone is not honoured by this site (entitlements.js testEnded). */
export const TEST_ENDED = 'Test access ended for the pilot.';
/** The line under a plan's button: how it is billed (the App Store, or the web) or that a test purchase is free. */
export function periodNote({ native = false, web = false, period = 'monthly' } = {}) {
  const yearly = period === 'yearly';
  if (native) return `${yearly ? 'Billed once a year' : 'Billed monthly'} by the App Store. Cancel any\u00a0time.`;
  if (web) return `${yearly ? 'Billed once a year' : 'Billed monthly'}. Cancel any\u00a0time in\u00a0Settings.`;
  return `Test\u00a0purchase\u00a0· ${yearly ? 'yearly' : 'monthly'}\u00a0· nothing\u00a0is\u00a0charged`;
}
/** How a plan's button keeps its whole label on a narrow phone or at a large text size, in order (app.css): tighter
 *  padding and tracking; then two lines, broken before the plan's name; then the name may wrap too. */
export const BUY_FIT = ['is-tight', 'is-wrap', 'is-wrap-name'];
/** Web subscriptions: the foot of the page (never the App Store's name: this is the web). */
export const WEB_NOTE = 'You’ll sign in first, so your plan stays with your account. Payment is on a secure checkout page, and you can cancel any time in Settings.';
/** Web subscriptions: said on the account screen when a guest steps into a plan, or restores one. */
export const SIGN_IN_FIRST = 'Sign in or create an account first, so your plan stays with you.';
export const SIGN_IN_TO_RESTORE = 'Sign in to the account your plan is with.';
/** Web subscriptions: the account has a plan already; a change of plan happens on the subscription page. */
export const CHANGE_PLAN = 'You already have a plan. You can change it on the next page.';
const SVG = 'http://www.w3.org/2000/svg';

// Flow's sigil: three soft swells (Hushflow); Beyond reuses Zuzu's spiral
function flowSigil() {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 48 48'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('class', 'invite-sigil');
  for (const [d, o] of [['M6 30c6-7 12-7 18 0s12 7 18 0', 1], ['M6 22c6-7 12-7 18 0s12 7 18 0', 0.7], ['M6 14c6-7 12-7 18 0s12 7 18 0', 0.42]]) {
    const p = document.createElementNS(SVG, 'path');
    p.setAttribute('d', d); p.setAttribute('fill', 'none'); p.setAttribute('stroke', 'currentColor');
    p.setAttribute('stroke-width', '3.2'); p.setAttribute('stroke-linecap', 'round'); p.setAttribute('opacity', String(o));
    svg.append(p);
  }
  return svg;
}

// "hushmallow Flow" → the brand (never uppercased) + the plan word, coloured
function planTitle(p, id) {
  const word = p.name.slice(brandName.length).trim();
  return h('h2', { class: 'invite-name', id }, brandMark(brandName), ' ', h('span', { class: 'invite-word brand-name' }, word));
}

// "Another Angle: fresh perspectives…" → a bold lead before the colon
function benefit(text) {
  if (text == null) return null;
  const i = text.indexOf(': ');
  if (i > 0 && i < 40) return h('li', {}, h('b', {}, text.slice(0, i + 1)), text.slice(i + 1));
  if (text.startsWith('Everything in ')) return h('li', { class: 'all' }, h('b', {}, 'Everything in ', brandMark(text.slice(14))));
  return h('li', {}, text);
}

export default function plans(app, params = {}) {
  const { ent, world } = app;
  const tier = ent.tier();
  const focus = params.focus === 'ultra' || params.reason === 'ultra' ? 'ultra' : 'paid';
  let period = app.state.planPeriod === 'yearly' ? 'yearly' : 'monthly';
  const included = (id) => tier === id || (id === 'paid' && tier === 'ultra');

  const noteText = () => periodNote({ native: ent.isNative, web: ent.isWeb, period });

  // The App Store's own localised price for the chosen period, when the
  // native shell provides it (StoreKit Product.displayPrice through
  // ent.prices()), or on the web the price configured for it
  // (src/app/config.js BILLING_PRICES); until then the billing note stands alone.
  let prices = null;
  const priceLine = (p) => {
    const v = prices?.[p.productIds[period]];
    return v ? `${v} ${period === 'yearly' ? 'a year' : 'a month'}` : '';
  };
  const notes = [];   // [plan, price element, period element]
  const drawNotes = () => notes.forEach(([p, price, note]) => { price.textContent = priceLine(p); price.hidden = !price.textContent; note.textContent = noteText(); });

  const buttons = [], fits = [];
  function action(p) {
    if (included(p.id)) return h('div', { class: 'btn block invite-included', 'aria-disabled': 'true' }, '✓ Included in your plan');
    if (!ent.canPurchase) return h('div', { class: 'btn block', 'aria-disabled': 'true' }, 'Available in the app soon');
    const price = h('p', { class: 'invite-price', hidden: true });
    const note = h('p', { class: 'invite-period', 'aria-live': 'polite' }, noteText());
    notes.push([p, price, note]);
    // "Step into hushmallow Flow": the plan's whole name, always (never "Step into Flow"). Each part stays in one
    // piece; where the line is too narrow the button tightens, then breaks it before the name (fitWhole, app.css)
    const label = h('span', { class: 'invite-buy-label' }, h('span', { class: 'nb' }, 'Step into'), ' ', h('span', { class: 'nb' }, p.name));
    const btn = h('button', { class: `btn block invite-buy ${p.id === 'ultra' ? 'ultra' : 'primary'}`, onclick: () => buy(p.id, btn) }, label);
    buttons.push(btn);
    fits.push(() => fitWhole(btn, BUY_FIT));
    return h('div', { class: 'invite-cta' }, btn, price, note);
  }

  function invite(p) {
    const beyond = p.id === 'ultra';
    const titleId = `invite-${p.id}`;
    // Beyond leads with what it adds (its capability lines), then "Everything in Flow"
    const all = p.includes.filter((x) => x.startsWith('Everything in '));
    const own = p.includes.filter((x) => !x.startsWith('Everything in '));
    const short = own.length <= 4;   // a disclosure for a single line is no help
    const lead = [...own.slice(0, short ? 4 : 3), ...all];
    const rest = short ? [] : own.slice(3);
    return h('section', { class: `invite ${beyond ? 'invite-beyond' : 'invite-flow'}${focus === p.id ? ' is-focus' : ''}`, 'aria-labelledby': titleId },
      h('div', { class: 'invite-head' },
        beyond ? h('div', { class: 'spiral invite-sigil', 'aria-hidden': 'true' }) : flowSigil(),
        h('div', { class: 'invite-heading' }, planTitle(p, titleId), h('p', { class: 'invite-tagline' }, p.tagline))),
      h('ul', { class: 'invite-list' }, ...lead.map(benefit)),
      rest.length ? h('details', { class: 'invite-more' },
        h('summary', {}, h('span', {}, 'Everything included')),
        h('ul', { class: 'invite-list' }, ...rest.map(benefit))) : null,
      // Where Another Angle's words go, from the same source as Settings → About
      // (src/app/privacy.js, which follows resolveEndpoint()): on this phone until
      // Another Angle goes live, then the owner's approved sentence (docs/integration/DECISIONS.md,
      // 12 Oct 2026). Who processes the words and how long they are kept is told on the consent card itself.
      beyond ? h('p', { class: 'invite-note', 'data-beyond-note': '' }, plansBeyondNote()) : null,
      action(p));
  }

  // one purchase at a time: a double tap never sends two requests
  let pending = false, homeTimer = 0, gone = false;
  // web: Back from the checkout page can bring this page back from the browser's cache as it was left, busy
  const onPageShow = (e) => { if (e?.persisted && pending && !gone) { pending = false; setBusy(false); } };
  function setBusy(on, btn) {
    for (const b of buttons) {
      b.disabled = on;
      b.toggleAttribute('aria-busy', on && b === btn);
      b.classList.toggle('is-busy', on && b === btn);
    }
  }
  async function buy(id, btn) {
    if (pending) return;
    pending = true;
    setBusy(true, btn);
    let r = null;
    try { r = await ent.purchase(id, period); } catch { r = { ok: false, failed: true }; }
    if (gone) return;
    // success only when the plan is really on this phone now (a bridge reply
    // after a cancel can carry the old tier)
    if (r?.ok && ent.has(id)) {
      toast(r.test ? `Test purchase: ${PLANS[id].name} unlocked (no charge)` : `Welcome to ${PLANS[id].name}`);
      app.haptic('success');
      world.react('celebrate');
      homeTimer = setTimeout(() => { if (!gone) app.go('home', {}, { replace: true }); }, 900);
      return;   // the buttons stay quiet until the Hushfold opens
    }
    // web: on to the secure checkout page (the buttons stay quiet while the page leaves)
    if (r?.redirecting) return;
    if (r?.needsAccount) {
      pending = false; setBusy(false);
      app.go('account', { view: 'welcome', notice: SIGN_IN_FIRST });
      return;
    }
    if (r?.manage) {
      toast(CHANGE_PLAN, 3200);
      let m = null;
      try { m = await ent.manage(); } catch { m = null; }
      if (gone || m?.redirecting) return;
      toast('That didn’t open just now. Try again in a moment.', 3200);
    } else if (r?.unavailable) toast('Subscriptions are handled in the App Store app.');
    else if (r?.cancelled) toast('No problem. Nothing was charged.');
    else toast('That didn’t go through. Nothing was charged.', 3200);
    pending = false;
    setBusy(false);
  }

  // monthly / yearly (a real radio group; arrow keys move between them)
  const seg = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Billing period' });
  function drawSeg() {
    seg.replaceChildren(...PERIODS.map(([id, label]) => h('button', {
      class: 'seg-opt', role: 'radio', 'aria-checked': String(period === id), tabindex: period === id ? '0' : '-1',
      onclick: () => setPeriod(id),
      onkeydown: (e) => { if (/Arrow(Left|Right|Up|Down)/.test(e.key)) { e.preventDefault(); setPeriod(period === 'monthly' ? 'yearly' : 'monthly', true); } },
    }, label)));
  }
  function setPeriod(id, focusIt) {
    if (id === period) return;
    period = id; app.state.planPeriod = id;
    app.haptic?.('light'); app.audio?.ui?.('toggle');
    drawSeg();
    drawNotes();
    if (focusIt) seg.querySelector('[aria-checked="true"]')?.focus();
  }
  drawSeg();

  const everything = tier === 'ultra';
  const title = everything ? 'The whole Hushfold is open to you'
    : focus === 'ultra' ? 'Meet Another Angle'
      : 'Come into the Hushfold';
  const lede = everything ? h('span', {}, brandMark(BRAND.beyondPlanName), ' is active on this phone. Thank you for being here.')
    : focus === 'ultra' ? h('span', {}, 'Part of ', brandMark(BRAND.beyondPlanName), ': Zuzu helps you look at a real situation from a fresh side, with everything in Flow included.')
      : 'Two ways in. No ads, no streaks, nothing to keep up with: come back whenever you choose.';

  const order = focus === 'ultra' ? [PLANS.ultra, PLANS.paid] : [PLANS.paid, PLANS.ultra];
  const head = h('header', { class: 'plans-head' },
    logoImg({ tone: 'light', width: 'min(54vw, 216px)', sizes: 'min(54vw, 216px)', className: 'plans-logo' }),
    h('p', { class: 'plans-tagline' }, BRAND.brandTagline),
    h('h1', { class: 'plans-title t-cinematic', 'data-focus': '' }, title),
    h('p', { class: 'plans-lede' }, lede),
    // a returning pilot tester whose test plan this site no longer honours (entitlements.js testEnded): one quiet line
    ent.testEnded ? h('p', { class: 'test-note', 'data-test-ended': '' }, TEST_ENDED) : null);
  const gap = h('div', { class: 'plans-gap', 'aria-hidden': 'true' });

  const el = h('div', { class: 'plans' },
    h('div', { class: 'topbar plans-topbar' }, iconBtn('back', 'Back', () => app.back()), h('div', { class: 'grow' })),
    gap,
    h('div', { class: 'plans-body' },
      head,
      !everything && ent.canPurchase ? h('div', { class: 'seg-wrap' }, seg) : null,
      h('div', { class: 'invites' }, ...order.map(invite)),
      h('div', { class: 'plans-foot' },
        h('button', { class: 'btn ghost block', onclick: async (e) => {
          const b = e.currentTarget;
          if (b.disabled) return;
          // web: a plan lives with an account, so a guest signs in to it first
          if (ent.isWeb && !ent.webSignedIn()) { app.go('account', { view: 'signin', notice: SIGN_IN_TO_RESTORE }); return; }
          b.disabled = true;
          try { await ent.restore(); if (!gone) toast(ent.has('paid') ? 'Purchases restored' : 'Nothing to restore yet'); } catch { if (!gone) toast(ent.isWeb ? 'Couldn’t check just now. Try again in a moment.' : 'Couldn’t reach the App Store just now. Try again in a moment.', 3200); }
          b.disabled = false;
        } }, 'Restore purchases'),
        h('button', { class: 'btn ghost block', onclick: () => openSupport(app) }, SUPPORT_LINK),
        ent.isNative ? null : h('p', { class: 'test-note' }, ent.isWeb ? WEB_NOTE : ent.canPurchase
          ? 'Development build: purchases here are test purchases. Nothing is charged. In the App Store version, Apple handles payment and receipts.'
          : 'Subscriptions aren’t on sale on the web yet. The App Store app handles payment and receipts.'),
        legalLinks('legal-links plans-legal'))));

  // the invitations scroll over the Mallow's spot: it steps aside (fades)
  // and comes back near the top, so its face never shows through the cards
  let mallowAway = false;
  el.addEventListener('scroll', () => {
    el.classList.toggle('scrolled', el.scrollTop > 6);
    const away = mallowAway ? el.scrollTop >= 40 : el.scrollTop > 56;
    if (away !== mallowAway) { mallowAway = away; world.showMallow?.(!away); }
  }, { passive: true });

  // keep the live Mallow in the open space above the invitation
  function fit() {
    requestAnimationFrame(() => {
      const top = el.querySelector('.topbar')?.getBoundingClientRect().bottom ?? 58;
      const bottom = head.getBoundingClientRect().top;
      if (bottom > top + 50) world.fitBetween?.(top - 8, bottom - 2, { maxScale: 0.5 });
    });
  }

  const refit = () => fits.forEach((f) => f());

  // "Meet Another Angle" names Zuzu: Zuzu is the one on screen
  const prevMallow = world.mallowId;
  const swapMallow = focus === 'ultra' && !everything && prevMallow && prevMallow !== 'zuzu';

  return {
    el, title: 'Plans',
    async enter() {
      world.dim(true);
      world.showMallow?.(true);
      world.place({ x: 50, y: 14, scale: 0.42 });
      if (swapMallow) await world.setMallow('zuzu').catch(() => {});
      // left while Zuzu came in: leave() has already run, so nothing more is set up (no listener outlives the page,
      // and the next scene's Mallow is not moved)
      if (gone) return;
      world.setStage('curious');
      fit();
      requestAnimationFrame(refit);
      setTimeout(() => { if (!gone) refit(); }, 700);   // after the web fonts swap in
      globalThis.addEventListener?.('resize', refit);   // (a phone turned: the roomiest fit again)
      // localised prices from the App Store, if the native shell offers them (or the web's configured ones)
      Promise.resolve(typeof ent.prices === 'function' ? ent.prices() : null)
        .then((v) => { if (v && typeof v === 'object' && !gone) { prices = v; drawNotes(); } }, () => {});
      if (ent.isWeb) globalThis.addEventListener?.('pageshow', onPageShow);
    },
    leave() {
      gone = true; clearTimeout(homeTimer);
      globalThis.removeEventListener?.('resize', refit);
      if (ent.isWeb) globalThis.removeEventListener?.('pageshow', onPageShow);
      if (mallowAway) world.showMallow?.(true);
      if (swapMallow && world.mallowId === 'zuzu') world.setMallow(prevMallow, { entrance: false }).catch(() => {});
    },
  };
}
