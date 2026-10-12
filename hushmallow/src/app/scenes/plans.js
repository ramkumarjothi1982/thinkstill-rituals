// PLANS — two invitations into the Hushfold, not a pricing table.
// hushmallow Flow and hushmallow Beyond, each with its tagline and what it
// opens; monthly or yearly; restore; support stays free and one tap away.
// No countdowns, no fake discounts, no pressure. The live Mallow stays
// squeezable above the invitation (the top of the screen lets touches
// through to it).
import { h, iconBtn, toast } from '../ui.js';
import { PLANS } from '../entitlements.js';
import { BRAND, brandName } from '../../brand.js';
import { brandMark, logoImg } from '../../ui/type.js';
import { openSupport } from './support.js';

const PERIODS = [['monthly', 'Monthly'], ['yearly', 'Yearly']];
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

  const periodNote = () => (ent.isNative
    ? (period === 'yearly' ? 'Billed once a year by the App Store. Cancel any time.' : 'Billed monthly by the App Store. Cancel any time.')
    : `Test purchase · ${period === 'yearly' ? 'yearly' : 'monthly'} · nothing is charged`);

  // The App Store's own localised price for the chosen period, when the
  // native shell provides it (StoreKit Product.displayPrice through
  // ent.prices()); until then the billing note stands alone.
  let prices = null;
  const priceLine = (p) => {
    const v = prices?.[p.productIds[period]];
    return v ? `${v} ${period === 'yearly' ? 'a year' : 'a month'}` : '';
  };
  const notes = [];   // [plan, price element, period element]
  const drawNotes = () => notes.forEach(([p, price, note]) => { price.textContent = priceLine(p); price.hidden = !price.textContent; note.textContent = periodNote(); });

  const buttons = [];
  function action(p) {
    if (included(p.id)) return h('div', { class: 'btn block invite-included', 'aria-disabled': 'true' }, '✓ Included in your plan');
    if (!ent.canPurchase) return h('div', { class: 'btn block', 'aria-disabled': 'true' }, 'Available in the app soon');
    const price = h('p', { class: 'invite-price', hidden: true });
    const note = h('p', { class: 'invite-period', 'aria-live': 'polite' }, periodNote());
    notes.push([p, price, note]);
    const btn = h('button', { class: `btn block invite-buy ${p.id === 'ultra' ? 'ultra' : 'primary'}`, onclick: () => buy(p.id, btn) }, h('span', { class: 'invite-buy-label' }, `Step into ${p.name}`));
    buttons.push(btn);
    return h('div', { class: 'invite-cta' }, btn, price, note);
  }

  function invite(p) {
    const beyond = p.id === 'ultra';
    const titleId = `invite-${p.id}`;
    return h('section', { class: `invite ${beyond ? 'invite-beyond' : 'invite-flow'}${focus === p.id ? ' is-focus' : ''}`, 'aria-labelledby': titleId },
      h('div', { class: 'invite-head' },
        beyond ? h('div', { class: 'spiral invite-sigil', 'aria-hidden': 'true' }) : flowSigil(),
        h('div', { class: 'invite-heading' }, planTitle(p, titleId), h('p', { class: 'invite-tagline' }, p.tagline))),
      h('ul', { class: 'invite-list' }, ...p.includes.map(benefit)),
      // What ships today: Another Angle's angles are authored and run on the
      // phone. When the Beyond server client (W8) is switched on, this note
      // changes in the same release to the wording agreed with its consent
      // screen (who processes the words, and that nothing is kept).
      beyond ? h('p', { class: 'invite-note' }, 'Another Angle works on this phone: what you type stays here.') : null,
      action(p));
  }

  // one purchase at a time: a double tap never sends two requests
  let pending = false, homeTimer = 0, gone = false;
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
    if (r?.ok) {
      toast(r.test ? `Test purchase: ${PLANS[id].name} unlocked (no charge)` : `Welcome to ${PLANS[id].name}`);
      app.haptic('success');
      world.react('celebrate');
      homeTimer = setTimeout(() => { if (!gone) app.go('home', {}, { replace: true }); }, 900);
      return;   // the buttons stay quiet until the Hushfold opens
    }
    if (r?.unavailable) toast('Subscriptions are handled in the App Store app.');
    else if (!r?.cancelled) toast('That didn’t go through. Nothing was charged.', 3200);
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
    h('p', { class: 'plans-lede' }, lede));
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
          b.disabled = true;
          try { await ent.restore(); if (!gone) toast(ent.has('paid') ? 'Purchases restored' : 'Nothing to restore yet'); } catch { if (!gone) toast('Couldn’t reach the App Store just now. Try again in a moment.', 3200); }
          b.disabled = false;
        } }, 'Restore purchases'),
        h('button', { class: 'btn ghost block', onclick: () => openSupport(app) }, 'Need support right now? It’s free →'),
        ent.isNative ? null : h('p', { class: 'test-note' }, ent.canPurchase
          ? 'Development build: purchases here are test purchases. Nothing is charged. In the App Store version, Apple handles payment and receipts.'
          : 'Subscriptions aren’t on sale on the web yet. The App Store app handles payment and receipts.'))));

  el.addEventListener('scroll', () => el.classList.toggle('scrolled', el.scrollTop > 6), { passive: true });

  // keep the live Mallow in the open space above the invitation
  function fit() {
    requestAnimationFrame(() => {
      const top = el.querySelector('.topbar')?.getBoundingClientRect().bottom ?? 58;
      const bottom = head.getBoundingClientRect().top;
      if (bottom > top + 50) world.fitBetween?.(top - 8, bottom - 2, { maxScale: 0.5 });
    });
  }

  return {
    el, title: 'Plans',
    enter() {
      world.dim(true);
      world.showMallow?.(true);
      world.place({ x: 50, y: 14, scale: 0.42 });
      world.setStage('curious');
      fit();
      // localised prices from the App Store, if the native shell offers them
      Promise.resolve(typeof ent.prices === 'function' ? ent.prices() : null)
        .then((v) => { if (v && typeof v === 'object' && !gone) { prices = v; drawNotes(); } }, () => {});
    },
    leave() { gone = true; clearTimeout(homeTimer); },
  };
}
