// MEET A MALLOW — the right Mallow arrives, wears the feeling on its face,
// says something real, and offers one ritual (with a plain reason why).
import { h, iconBtn, icon, say, clearBubble, wait, fitMallow } from '../ui.js';
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
import { photoSession } from '../../v3/photos.js';
import { tellIfFull } from '../../v3/tray.js';
import { warmMallowCards } from '../../v3/mallow-cards.js';

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
  }

  // add (more) photos without leaving the offer: they become part of this ritual
  const picker = h('input', { type: 'file', accept: 'image/*', multiple: true, 'aria-hidden': 'true', tabindex: '-1', style: { position: 'absolute', width: '1px', height: '1px', opacity: '0', pointerEvents: 'none' } });
  picker.addEventListener('change', async () => {
    const files = [...(picker.files || [])]; picker.value = '';
    if (!files.length) return;
    const added = await photoSession.add(files);
    tellIfFull(files.length, added);
    if (added) { app.haptic('light'); render(); }
  });
  function photoButton() {
    const n = photoSession.count;
    if (n >= photoSession.max) return h('div', { class: 'photo-add-inline photo-full', role: 'status' }, icon('camera'), `${n} photos added`);
    return h('button', { class: 'btn ghost block photo-add-inline', onclick: () => picker.click() },
      icon('camera'), n ? `Add more photos (${n}/${photoSession.max})` : 'Add up to seven of your photos (optional)');
  }
  // no photos yet: get the Mallow cards ready while the offer is read
  if (!photoSession.count) warmMallowCards();

  const card = h('div', { class: 'card enc-card' });
  let voiceEl = null;          // the Mallow's line, inside the card when there's no room to show the Mallow
  let mallowShown = true;
  const ultraRow = h('div');
  const el = h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', scrollbarWidth: 'none' } },
    h('div', { class: 'topbar' }, iconBtn('back', 'Back', () => app.back()), h('div', { class: 'grow' }),
      h('span', { class: 'eyebrow' }, input.emotions.map((e) => getEmotion(e.id)?.name).filter(Boolean).slice(0, 3).join(' · '))),
    h('div', { class: 'spacer' }),
    card, picker, h('div', { style: { height: '10px' } }), ultraRow);

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
    voiceEl = h('p', { class: 'enc-voice', hidden: true });
    card.replaceChildren(
      h('div', { class: 'eyebrow', style: { color: 'var(--accent)' } }, `${lead.name} has a ritual for that`),
      voiceEl,
      h('h3', { class: 't-world', style: { marginTop: '8px' } }, r.name),
      h('p', {}, r.purpose),
      h('div', { class: 'reasons' }, ...o.reasons.filter((x) => !/minute/.test(x)).map((x) => h('span', {}, x)), h('span', {}, `About ${mins} min`),
        r.module === 'v3' ? h('span', { class: 'photo-chip' }, photoSession.count ? `With your ${photoSession.count} photo${photoSession.count > 1 ? 's' : ''}` : 'With the seven Mallows') : null),
      r.module === 'v3' ? photoButton() : null,
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
    await fit();
    await wait(850); // let the Mallow settle into place before it speaks
    const line = encounterLine(leadId, family);
    if (mallowShown) say(world, line, { who: lead.name, ms: 3600 });
    else if (voiceEl) { voiceEl.textContent = `“${line}”`; voiceEl.hidden = false; }
  }

  // keep the Mallow's face in view: fit it into the space above the card.
  // On short phones there is no such space: the Mallow steps aside (it never
  // ghosts under the card's text) and its line is written into the card.
  function fit() {
    return new Promise((resolve) => requestAnimationFrame(() => {
      const top = el.querySelector('.topbar')?.getBoundingClientRect().bottom ?? 60;
      const cardTop = card.getBoundingClientRect().top;
      mallowShown = fitMallow(world, top + 6, cardTop - 6, { maxScale: 0.92, minPx: 76 });
      resolve();
    }));
  }

  function begin(o) {
    clearBubble();
    if (o.item.id === 'another-angle') { app.go('angle', { text: input.text || '' }); return; }
    rec.markDealt(o.item.id, o.poolKey);
    app.state.ritual = o.item;
    app.go('ritual', { id: o.item.id });
  }

  // Beyond members can step into Another Angle from here. Non-members aren't
  // shown an upsell in the middle of a hard moment.
  if (ent.has('ultra') && (REFRAME_FAMILIES.has(family) || input.text.length > 20)) {
    ultraRow.append(h('button', { class: 'ultra-card', onclick: () => app.go('angle', { text: input.text }) },
      h('div', { class: 'spiral', 'aria-hidden': 'true' }),
      h('div', {}, h('span', { class: 'badge' }, 'BEYOND'), h('div', { class: 't' }, 'Or try Another Angle'), h('div', { class: 's' }, 'Ready for the plot twist?'))));
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
    leave() { clearBubble(); world.showMallow(true); },
  };
}
