// PLANS — an invitation, not a sales page. Exactly two plans, Hushmallow Flow
// and Hushmallow Beyond, each monthly or annual. No countdowns, no fake
// discounts, no pressure. Prices come from the App Store, so none are written
// here. Support lines stay free regardless.
import { h, iconBtn, toast } from '../ui.js';
import { PLANS } from '../entitlements.js';
import { openSupport } from './support.js';

export default function plans(app, params = {}) {
  const { ent, world } = app;
  const tier = ent.tier();
  let period = 'monthly';

  const periodSeg = h('div', { class: 'hf-chips plan-period', role: 'group', 'aria-label': 'Billing' },
    ...[['monthly', 'Monthly'], ['yearly', 'Annual']].map(([id, label]) => h('button', {
      class: 'hf-chip', 'data-id': id, 'aria-pressed': String(id === period),
      onclick: () => { period = id; for (const c of periodSeg.children) c.setAttribute('aria-pressed', String(c.dataset.id === id)); },
    }, label)));

  const plan = (p, cls) => h('div', { class: `plan invite ${cls || ''}` },
    h('div', { class: 'eyebrow' }, p.name),
    h('h3', {}, p.tagline),
    h('ul', {}, ...p.includes.map((x) => h('li', {}, x))),
    p.planned?.length ? h('p', { class: 'plan-planned' }, `Coming to ${p.short}: ${p.planned.join(', and ')}.`) : null,
    tier === p.id || (p.id === 'paid' && tier === 'ultra')
      ? h('div', { class: 'btn block', 'aria-disabled': 'true' }, 'Included in your plan')
      : ent.canPurchase
        ? h('button', { class: `btn block ${p.id === 'ultra' ? 'ultra' : 'primary'}`, onclick: () => buy(p.id) }, `Step into ${p.short}`)
        : h('div', { class: 'btn block', 'aria-disabled': 'true' }, 'Available in the app soon'));

  async function buy(id) {
    const r = await ent.purchase(id, period);
    if (r.ok) {
      toast(r.test ? `Test purchase: ${PLANS[id].name} unlocked (no charge)` : `Welcome to ${PLANS[id].name}`);
      app.haptic('success');
      world.react('celebrate');
      setTimeout(() => app.go('home', {}, { replace: true }), 900);
    }
  }

  const beyondFirst = params.focus === 'ultra' || params.reason === 'ultra';
  const el = h('div', { class: 'plans-scene', style: { display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', paddingBottom: '8px' } },
    h('div', { class: 'topbar' }, iconBtn('back', 'Back', () => app.back()), h('div', { class: 'grow' })),
    h('div', { style: { minHeight: '16dvh' } }),
    h('h1', { class: 'title' }, beyondFirst ? 'Another Angle lives in Beyond' : 'Come a little further in'),
    h('p', { class: 'lede' }, 'Two ways to keep playing. No ads and no AI: every word is written in advance, and nothing is generated while you play.'),
    periodSeg,
    h('div', { style: { display: 'grid', gap: '12px', marginTop: '12px' } },
      beyondFirst ? plan(PLANS.ultra, 'ultra') : plan(PLANS.paid),
      beyondFirst ? plan(PLANS.paid) : plan(PLANS.ultra, 'ultra')),
    h('div', { style: { display: 'grid', gap: '6px', marginTop: '12px' } },
      h('button', { class: 'btn ghost block', onclick: async () => { await ent.restore(); toast(ent.has('paid') ? 'Purchases restored' : 'Nothing to restore yet'); } }, 'Restore purchases'),
      h('button', { class: 'btn ghost block', onclick: () => openSupport(app) }, 'Need support right now? It’s free →')),
    ent.isNative ? null : h('p', { class: 'test-note' }, ent.canPurchase
      ? 'Development build: purchases here are test purchases. Nothing is charged. In the App Store version, Apple handles payment and receipts.'
      : 'Subscriptions aren’t on sale on the web yet. The App Store app handles payment and receipts.'));

  return {
    el, title: 'Plans',
    enter() { world.dim(true); world.place({ x: 50, y: 13, scale: 0.45 }); world.setStage('curious'); },
  };
}
