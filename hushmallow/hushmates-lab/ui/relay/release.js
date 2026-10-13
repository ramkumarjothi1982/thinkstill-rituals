// RELEASE: write what's on your mind, see it inside the orb, then your Mallow
// catches it, squeezes it and lets it go into the sky.
//   idle → compose → review → launch → sent
// High-risk words never leave the device: they are screened here first (and
// again by the service) and answered with support instead.

import { h, icon } from '../dom.js';
import { eyebrow, headline, pillow, sentenceSwitch } from '../kit.js';
import { Mallow } from '../mallow.js';
import { MALLOWS } from '../mallows-data.js';
import { Orb, fly, centreIn } from '../orb.js';
import { Sky } from '../sky.js';
import { play } from '../sound.js';
import { wait, reducedMotion, rise } from '../motion.js';
import { screenFeeling } from '../../core/feeling-safety.js';
import { charCount } from '../../core/text-policy.js';
import { FEELING_LABELS, FALLBACK_MALLOW, RELAY } from '../../core/relay-config.js';
import { brandBar, dock, top, feelColour, errorText } from './common.js';

export function release(dev, params = {}) {
  const c = dev.client;
  const me = dev.state.me;
  const mine = MALLOWS[me.profile.mallow] || MALLOWS.noomi;
  const draft = (dev.memory.release ||= { text: '', label: null, allowFallback: false, clientId: null });
  const max = me.limits.feelingMaxChars;
  let state = 'idle';
  let busy = false;
  let alive = true;

  const sky = new Sky({ seed: 7 });
  const flight = h('div', { class: 'rl-flight', 'aria-hidden': 'true' });
  const head = h('div', { class: 'rl-head-slot' });
  const body = h('div', { class: 'rl-body' });
  const orbSlot = h('div', { class: 'rl-orb-slot' });
  const mallow = new Mallow(mine.id, { interactive: true, eager: true, label: `Squeeze ${mine.name}`, onSqueeze: () => play('squish') });
  const stage = h('div', { class: 'rl-stage' }, orbSlot, h('div', { class: 'rl-stage-ground' }, pillow('rl-pillow'), h('div', { class: 'rl-stage-mallow' }, mallow.el)));
  const foot = h('div', { class: 'rl-foot' });
  const dockSlot = h('div', { class: 'rl-dock-slot' }, dock(dev, 'release'));
  const el = h('div', { class: 'hm-scene rl-scene rl-release', dataset: { state } }, sky.el, head, body, stage, foot, dockSlot, flight);
  let orb = null;

  const full = () => me.travelling >= me.limits.maxActiveJourneys;
  const inactive = () => me.accountState !== 'active';

  function setState(s) { state = s; el.dataset.state = s; }
  function newOrb({ text = '', label = null, interactive = false } = {}) {
    orb?.destroy(); orb?.el.remove();
    orb = new Orb({ size: null, tint: label ? feelColour(label) : '#D9C8FF', text, label: text ? `Your feeling: ${text}` : 'Write a feeling', interactive, onPress: interactive ? () => compose() : null });
    orbSlot.replaceChildren(orb.el);
    return orb;
  }

  // ------------------------------------------------------------ idle --
  function idle({ animate = true } = {}) {
    setState('idle');
    head.replaceChildren(brandBar(dev));
    const blocked = full() || inactive();
    body.replaceChildren(h('div', { class: 'rl-hero' },
      eyebrow('Send a feeling. See it differently.', { center: true }),
      headline('h1', 'What’s on', 'your mind?', { grad: 'softer', cls: 'kit-title--xl' }),
      h('p', { class: 'kit-lede rl-hero-lede rl-tagline' }, 'One feeling. Five perspectives.', h('br'), 'Back to you.')));
    newOrb({ interactive: !blocked });
    foot.replaceChildren(...[
      blocked ? h('p', { class: 'rl-note', dataset: { test: 'release-limit' } }, inactive()
        ? 'Your account can’t release feelings right now.'
        : `You have ${me.travelling} feelings travelling. When one comes home, you can send another.`) : null,
      h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--lg kit-btn--block', disabled: blocked, dataset: { test: 'start-feeling' }, onclick: () => compose() },
        icon('plus'), 'Write a feeling')].filter(Boolean));
    dockSlot.hidden = false;
    if (animate) rise([...body.querySelectorAll('.rl-hero > *'), foot], { y: 16, stagger: 60 });
  }

  // --------------------------------------------------------- compose --
  function compose(err = '') {
    if (full() || inactive()) return;
    setState('compose');
    dockSlot.hidden = true;
    head.replaceChildren(top(dev, { title: 'Release a feeling', back: () => idle() }));
    const area = h('textarea', { class: 'kit-textarea rl-feeling-input', rows: 5, maxlength: String(max + 40), 'aria-describedby': 'rl-feel-hint rl-feel-count', 'aria-label': 'What’s on your mind?', dataset: { test: 'feeling-text' }, placeholder: 'Write it the way it feels…' });
    area.value = draft.text;
    const count = h('span', { id: 'rl-feel-count', class: 'rl-count' });
    const error = h('p', { class: 'kit-error', role: 'alert', dataset: { test: 'feeling-error' } }, err);
    const next = h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--block', dataset: { test: 'review-feeling' }, onclick: () => review() }, 'Review');
    const sync = () => {
      draft.text = area.value;
      const n = charCount(area.value.trim());
      count.textContent = `${n} / ${max}`;
      count.classList.toggle('is-over', n > max);
      next.disabled = n < RELAY.feelingMinChars || n > max;
      draft.clientId = null;                    // edited words are a new release
    };
    area.addEventListener('input', () => { sync(); error.textContent = ''; });
    const chips = h('div', { class: 'rl-labels', role: 'group', 'aria-label': 'How does it feel? (optional)' },
      FEELING_LABELS.map((l) => h('button', {
        type: 'button', class: 'rl-label-chip', 'aria-pressed': String(draft.label === l.id), style: { '--feel': l.colour }, dataset: { test: `label-${l.id}` },
        onclick: (e) => { draft.label = draft.label === l.id ? null : l.id; chips.querySelectorAll('.rl-label-chip').forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget && draft.label === l.id))); },
      }, h('i', { 'aria-hidden': 'true' }), l.label)));
    const helper = MALLOWS[FALLBACK_MALLOW[draft.label || 'none']]?.name || 'A Mallow';
    body.replaceChildren(h('div', { class: 'rl-compose hm-scroll' },
      h('h1', { class: 'kit-title kit-title--md', 'data-autofocus': '' }, 'What’s on your mind?'),
      h('p', { class: 'kit-body', id: 'rl-feel-hint' }, 'A thought, a feeling, or something you can’t quite explain.'),
      h('div', { class: 'rl-field' }, area, count),
      error,
      h('p', { class: 'kit-label' }, 'How does it feel? ', h('span', { class: 'rl-optional' }, 'optional')),
      chips,
      h('div', { class: 'rl-card rl-card--lilac rl-disclose', dataset: { test: 'disclosure' } },
        h('div', { class: 'rl-card-head' }, icon('eyeOff'), h('h3', {}, 'Before you release')),
        h('p', {}, 'Your words may be shown anonymously to other Hushmates participants, who can offer different perspectives.'),
        h('p', {}, 'Leave out names, places and anything that could identify you or someone else.')),
      sentenceSwitch({
        label: 'If nobody catches my feeling, let a Mallow offer a perspective',
        hint: `Only if no person has caught it after ${Math.round(RELAY.fallbackAfterMs / 60e3)} minutes, and only when you ask. This needs AI processing: your words are sent to an AI service for one reply. It’s always labelled as a Mallow perspective, never as a person.`,
        checked: draft.allowFallback, test: 'allow-fallback',
        onChange: (on) => { draft.allowFallback = on; draft.clientId = null; },
      }),
      h('p', { class: 'kit-note rl-helper-note' }, `People always come first. ${helper} only offers a perspective if you turn this on and ask.`),
      h('div', { class: 'rl-actions' }, next, h('button', { type: 'button', class: 'kit-btn kit-btn--text kit-btn--block', dataset: { test: 'cancel-feeling' }, onclick: () => { draft.text = ''; draft.label = null; draft.clientId = null; idle(); } }, 'Cancel'))));
    foot.replaceChildren();
    sync();
    if (err) error.textContent = err;
    setTimeout(() => alive && area.focus({ preventScroll: true }), 60);
  }

  // ---------------------------------------------------------- review --
  function review() {
    const local = screenFeeling(draft.text, { minChars: RELAY.feelingMinChars, maxChars: max });
    if (!local.ok && local.code === 'support') { supportNow(local); return; }   // never sent anywhere
    if (!local.ok) { compose(local.message); return; }
    setState('review');
    dockSlot.hidden = true;
    head.replaceChildren(top(dev, { title: 'Ready to let it go?', back: () => compose() }));
    body.replaceChildren(h('div', { class: 'rl-hero rl-hero--tight' },
      h('h1', { class: 'kit-title kit-title--sm', 'data-autofocus': '' }, `${mine.name} will carry it to someone who might see it differently.`),
      draft.label ? h('p', { class: 'rl-hero-chips' }, h('span', { class: 'rl-feel', style: { '--feel': feelColour(draft.label) } }, h('i'), FEELING_LABELS.find((l) => l.id === draft.label).label)) : null));
    newOrb({ text: local.text, label: draft.label });
    requestAnimationFrame(() => orb?.showText(true));
    foot.replaceChildren(h('div', { class: 'rl-actions' },
      h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--lg kit-btn--block', dataset: { test: 'release-submit' }, onclick: () => launch() }, 'Release'),
      h('div', { class: 'kit-row' },
        h('button', { type: 'button', class: 'kit-btn kit-btn--ghost', dataset: { test: 'edit-feeling' }, onclick: () => compose() }, 'Edit'),
        h('button', { type: 'button', class: 'kit-btn kit-btn--ghost', onclick: () => { draft.text = ''; draft.label = null; draft.clientId = null; idle(); } }, 'Cancel'))),
      h('p', { class: 'kit-note rl-center' }, draft.allowFallback ? 'People first. A Mallow perspective only if you ask, after 30 minutes with nobody.' : 'Only people will offer perspectives on this one.'));
  }

  function supportNow(r) {
    dev.go('support', { support: r.support, level: r.level }, { transition: 'soft' });
  }

  // ---------------------------------------------------------- launch --
  async function launch() {
    if (busy) return;
    busy = true;
    foot.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    draft.clientId ||= c.newId();               // the same id on retry: never two journeys
    let r;
    try {
      r = await c.release({ text: draft.text, label: draft.label, mallow: mine.id, allowFallback: draft.allowFallback, clientId: draft.clientId });
    } catch (e) {
      busy = false;
      if (String(e.code || '').startsWith('feeling-')) { compose(errorText(e)); return; }
      dev.toast(errorText(e), { tone: 'warn', ms: 4200 });
      foot.querySelectorAll('button').forEach((b) => { b.disabled = false; });
      return;
    }
    if (!alive) return;
    if (r.status === 'support') { busy = false; supportNow(r); return; }
    const journey = r.journey;
    Object.assign(draft, { text: '', label: null, clientId: null });
    setState('launch');
    head.replaceChildren(h('header', { class: 'rl-top' }));
    body.replaceChildren(h('div', { class: 'rl-hero' }, h('p', { class: 'rl-launch-copy', role: 'status', 'aria-live': 'polite' })));
    foot.replaceChildren();
    await fling(journey);
    if (!alive) return;
    busy = false;
    sent(journey);
  }

  async function fling(journey) {
    const tint = feelColour(journey.label);
    if (reducedMotion()) {
      play('release');
      orb.el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'forwards' });
      await wait(450);
      orb.el.remove();
      return;
    }
    const from = centreIn(orb.el, flight);
    const m = mallow.el.getBoundingClientRect();
    const f = flight.getBoundingClientRect();
    const size = orb.el.getBoundingClientRect().height * 0.78;
    const hands = { x: m.left - f.left + m.width / 2, y: m.top - f.top - size * 0.28 };   // held just above its head
    const flyer = h('div', { class: 'rl-flyer' });
    flight.append(flyer);
    orb.freeze();
    flyer.append(orb.el);
    flyer.style.transform = `translate(${from.x}px, ${from.y}px) translate(-50%, -50%)`;
    // the Mallow catches the feeling …
    await fly(flyer, flight, { from, to: hands, via: { x: from.x, y: (from.y + hands.y) / 2 }, duration: 760, scale: [1, 0.78], trail: false });
    play('squish');
    mallow.press(1, 0.55);
    orb.squeeze(1, 0.55);
    await wait(700);
    orb.showText(false);                          // … the words stay visible a moment, then become light
    await wait(420);
    // … and lets it go
    play('release');
    mallow.release();
    mallow.signature(1.2);
    orb.release();
    dev.atmo.bloom({ y: 0.3 });
    sky.pan(300, { duration: 2600 });
    stage.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(90px)', opacity: 0.85 }], { duration: 2600, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' });
    copy('Your feeling is on its way.');
    await fly(flyer, flight, { from: hands, to: { x: hands.x + 40, y: -140 }, via: { x: hands.x - 70, y: hands.y * 0.42 }, duration: 2200, scale: [0.78, 0.32], colour: tint });
    flyer.remove();
  }

  function copy(text) {
    const p = body.querySelector('.rl-launch-copy');
    if (!p) return;
    p.textContent = text;
    p.animate([{ opacity: 0, transform: 'translateY(10px)', filter: 'blur(4px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 700, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' });
  }

  // ------------------------------------------------------------ sent --
  function sent(journey) {
    setState('sent');
    head.replaceChildren(brandBar(dev));
    const second = h('p', { class: 'kit-support rl-sent-2' }, 'Let’s see how someone else sees it.');
    body.replaceChildren(h('div', { class: 'rl-hero', dataset: { test: 'release-sent' } },
      h('h1', { class: 'kit-title', 'data-autofocus': '' }, 'Your feeling is ', h('em', { class: 'kit-grad kit-grad--softer' }, 'on its way.')),
      second));
    second.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 800, delay: 900, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' });
    foot.replaceChildren(h('div', { class: 'rl-actions' },
      h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--block', dataset: { test: 'follow-journey' }, onclick: () => dev.go('journey', { id: journey.id }) }, 'Follow its journey'),
      h('button', { type: 'button', class: 'kit-btn kit-btn--ghost kit-btn--block', dataset: { test: 'go-catch' }, onclick: () => dev.go('catch', {}, { replace: true }) }, 'Catch a feeling while you wait')));
    rise([foot], { y: 14, delay: 1200 });
    stage.getAnimations().forEach((x) => x.cancel());
    stage.animate([{ transform: 'translateY(60px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 1200, delay: 600, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' });
    dockSlot.hidden = false;
    dockSlot.replaceChildren(dock(dev, 'release'));
  }

  // ------------------------------------------------------------ boot --
  if (params.compose && !full()) compose();
  else idle({ animate: true });

  return {
    el, mood: 'sky',
    update(s) {
      Object.assign(me, s.me || {});
      if (!dockSlot.hidden) dockSlot.replaceChildren(dock(dev, 'release'));
      if (state === 'idle') {
        const btn = foot.querySelector('[data-test="start-feeling"]');
        if (btn && btn.disabled !== (full() || inactive())) idle({ animate: false });
      }
    },
    destroy() { alive = false; mallow.destroy(); orb?.destroy(); },
  };
}
