// MEET A MALLOW — the right Mallow arrives, wears the feeling on its face,
// says something real, and offers one ritual (with a plain reason why).
import { h, iconBtn, say, clearBubble, wait } from '../ui.js';
import { faceMix } from '../../engine/interpret.js';
import { getEmotion, getFamily } from '../../data/emotions.js';
import { MALLOWS } from '../../mallows/registry.js';
import { encounterLine } from '../../mallows/voices.js';
import { createRound } from '../../engine/round.js';
import { planOptions } from '../../engine/next.js';
import { RITUALS } from '../../data/rituals.js';
import { AVAILABLE } from '../../rituals/index.js';
import { allowedFor } from '../../engine/recommend.js';
import { toast } from '../ui.js';
import { testPurchasesAllowed } from '../config.js';
import { planItems } from '../play-item.js';

const REFRAME_FAMILIES = new Set(['shame', 'fear', 'loneliness', 'anger', 'sadness', 'envy', 'confusion']);

export default function encounter(app) {
  const { world, rec, ent } = app;
  const input = app.state.input;
  if (!input) { queueMicrotask(() => app.go('home', {}, { replace: true })); return { el: h('div') }; }
  const top = getEmotion(input.emotions[0]?.id);
  const family = top?.family || 'default';
  const req = { ...input, entitlements: ent.flags(), tier: 'paid', prefs: { lowStimulation: app.prefs.get('lowStim') } };
  // what this plan may offer (Another Angle has its own door, so it isn't dealt here)
  const offerRituals = RITUALS.filter((r) => (r.tier || 'paid') === 'paid' && allowedFor(r, ent.flags()) && AVAILABLE.has(r.module));
  const round = createRound(app.store, ent.tier());
  let options = [];
  let idx = 0;
  async function deal() {
    let plan = planOptions({ rec, req, rituals: offerRituals, seen: round.seen(), limit: 4 });
    if (!plan.options.length && plan.total) {
      // every ritual in the plan has been done once: start a fresh round
      toast(`You’ve tried all ${plan.total} in your plan. Starting a fresh round!`, 3600);
      round.restart();
      plan = planOptions({ rec, req, rituals: offerRituals, seen: round.seen(), limit: 4 });
    }
    options = plan.options;
    // TESTING: an item picked in the home TEST panel is shown first, for this issue
    if (testPurchasesAllowed() && app.store.get('test-pick', false)) {
      app.store.set('test-pick', false);
      const n = app.store.get(`test-step-${ent.tier()}`, 0);
      const items = await planItems(app);
      const it = items[n - 1];
      if (it) options = [{ type: it.kind, item: it.ref, reasons: [`Test item ${n} of ${items.length}`] }];
    }
  }

  const card = h('div', { class: 'card enc-card' });
  const ultraRow = h('div');
  const el = h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%' } },
    h('div', { class: 'topbar' }, iconBtn('back', 'Back', () => app.back()), h('div', { class: 'grow' }),
      h('span', { class: 'eyebrow' }, input.emotions.map((e) => getEmotion(e.id)?.name).filter(Boolean).slice(0, 3).join(' · '))),
    h('div', { class: 'spacer' }),
    card, h('div', { style: { height: '10px' } }), ultraRow);

  function render() {
    const o = options[idx];
    if (!o) {
      card.replaceChildren(
        h('h3', {}, 'I don’t have the right ritual for this one yet'),
        h('p', {}, 'Rather than give you something that doesn’t fit, here’s what you can do: pick a different feeling, or just stay here with the Mallows for a moment.'),
        h('div', { class: 'row-btns', style: { marginTop: '14px' } },
          h('button', { class: 'btn', onclick: () => app.go('express', { keep: true }) }, 'Change feelings'),
          h('button', { class: 'btn', onclick: () => app.go('home') }, 'Home')));
      return;
    }
    const r = o.item;
    const lead = MALLOWS[r.mallows[0]];
    const mins = Math.max(1, Math.round(r.durationSec / 60));
    card.replaceChildren(
      h('div', { class: 'eyebrow', style: { color: 'var(--accent)' } }, `${lead.name} has a ritual for that`),
      h('h3', { style: { marginTop: '8px', fontSize: '26px' } }, r.name),
      h('p', {}, r.purpose),
      h('div', { class: 'reasons' }, ...o.reasons.filter((x) => !/minute/.test(x)).map((x) => h('span', {}, x)), h('span', {}, `About ${mins} min`)),
      h('div', { style: { display: 'grid', gap: '8px', marginTop: '16px' } },
        h('button', { class: 'btn primary block', onclick: () => begin(o) }, 'Let’s do it'),
        options.length > 1 ? h('button', { class: 'btn ghost block', onclick: () => { idx = (idx + 1) % options.length; app.audio.ui('toggle'); show(); } }, 'Something else') : null));
  }

  async function show() {
    const o = options[idx];
    const leadId = o ? o.item.mallows[0] : (getFamily(family)?.mallows?.[0] || 'blubi');
    const lead = MALLOWS[leadId];
    await Promise.all([world.setRealm(lead.realm, { emotion: Object.keys(faceMix(input.emotions))[0], intensity: input.intensity }), world.setMallow(leadId)]);
    world.setEmotion(faceMix(input.emotions), Math.min(1, input.intensity * 1.05));
    render();
    fit();
    await wait(850); // let the Mallow settle into place before it speaks
    say(world, encounterLine(leadId, family), { who: lead.name, ms: 3600 });
  }

  // keep the Mallow's face in view: fit it into the space above the card
  function fit() {
    requestAnimationFrame(() => {
      const top = el.querySelector('.topbar')?.getBoundingClientRect().bottom ?? 60;
      const cardTop = card.getBoundingClientRect().top;
      if (cardTop > top + 60) world.fitBetween(top + 6, cardTop - 4, { maxScale: 0.92 });
    });
  }

  function begin(o) {
    clearBubble();
    if (o.item.id === 'another-angle') { app.go('angle', { text: input.text || '' }); return; }
    rec.markDealt(o.item.id, o.poolKey);
    app.state.ritual = o.item;
    app.go('ritual', { id: o.item.id });
  }

  // Ultra members can step into Another Angle from here. Non-members aren't
  // shown an upsell in the middle of a hard moment.
  if (ent.has('ultra') && (REFRAME_FAMILIES.has(family) || input.text.length > 20)) {
    ultraRow.append(h('button', { class: 'ultra-card', onclick: () => app.go('angle', { text: input.text }) },
      h('div', { class: 'spiral', 'aria-hidden': 'true' }),
      h('div', {}, h('span', { class: 'badge' }, 'ULTRA'), h('div', { class: 't' }, 'Or try Another Angle'), h('div', { class: 's' }, 'Ready for the plot twist?'))));
  }

  return {
    el, title: 'Meet a Mallow',
    async enter() {
      world.dim(false);
      world.showMallow(true);
      world.place({ x: 50, y: 40, scale: 0.92 });
      await deal();
      await show();
    },
    leave() { clearBubble(); },
  };
}
