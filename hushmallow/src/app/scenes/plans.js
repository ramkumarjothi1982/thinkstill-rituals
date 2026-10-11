// PLANS — exactly two paid experiences, described plainly. No countdowns,
// no fake discounts, no pressure. Support lines stay free regardless.
import { h, iconBtn, toast } from '../ui.js';
import { PLANS } from '../entitlements.js';
import { openSupport } from './support.js';

export default function plans(app, params = {}) {
  const { ent, world } = app;
  const tier = ent.tier();
  const plan = (p, cls) => h('div', { class: `plan ${cls || ''}` },
    h('div', { class: 'eyebrow', style: { color: cls ? '#d9a8ff' : 'var(--accent)' } }, p.id === 'ultra' ? 'Hushmallow Ultra' : 'Hushmallow'),
    h('h3', { style: { marginTop: '6px' } }, p.tagline),
    h('ul', {}, ...p.includes.map((x) => h('li', {}, x))),
    tier === p.id || (p.id === 'paid' && tier === 'ultra')
      ? h('div', { class: 'btn block', 'aria-disabled': 'true' }, 'Included in your plan')
      : h('button', { class: `btn block ${p.id === 'ultra' ? 'ultra' : 'primary'}`, onclick: () => buy(p.id) }, `Choose ${p.name}`));

  async function buy(id) {
    const r = await ent.purchase(id, 'monthly');
    if (r.ok) {
      toast(r.test ? `Test purchase: ${PLANS[id].name} unlocked (no charge)` : `Welcome to ${PLANS[id].name}`);
      app.haptic('success');
      world.react('celebrate');
      setTimeout(() => app.go('home', {}, { replace: true }), 900);
    }
  }

  const el = h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', paddingBottom: '8px' } },
    h('div', { class: 'topbar' }, iconBtn('back', 'Back', () => app.back()), h('div', { class: 'grow' })),
    h('div', { style: { minHeight: '18dvh' } }),
    h('h1', { class: 'title' }, params.reason === 'ultra' ? 'Another Angle is part of Ultra' : 'Choose how you Hushmallow'),
    h('p', { class: 'lede' }, 'Two plans. Both are fully paid products with no ads, and no AI anywhere: every ritual is crafted by people.'),
    h('div', { style: { display: 'grid', gap: '12px', marginTop: '16px' } },
      params.focus === 'ultra' ? plan(PLANS.ultra, 'ultra') : plan(PLANS.paid),
      params.focus === 'ultra' ? plan(PLANS.paid) : plan(PLANS.ultra, 'ultra')),
    h('div', { style: { display: 'grid', gap: '6px', marginTop: '12px' } },
      h('button', { class: 'btn ghost block', onclick: async () => { await ent.restore(); toast(ent.has('paid') ? 'Purchases restored' : 'Nothing to restore yet'); } }, 'Restore purchases'),
      h('button', { class: 'btn ghost block', onclick: () => openSupport(app) }, 'Need support right now? It’s free →')),
    ent.isNative ? null : h('p', { class: 'test-note' }, 'Development build: purchases here are test purchases. Nothing is charged. In the App Store version, Apple handles payment and receipts.'));

  return {
    el, title: 'Plans',
    enter() { world.dim(true); world.place({ x: 50, y: 13, scale: 0.45 }); world.setStage('curious'); },
  };
}
