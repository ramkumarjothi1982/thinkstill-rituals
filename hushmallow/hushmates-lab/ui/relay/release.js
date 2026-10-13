// RELEASE A FEELING. One calm composition: your Mallow in its room, a thought
// cloud that fills as you write, a few quiet choices, and one big action.
// Then the moment: the words gather into a glowing orb, your Mallow notices
// it, squeezes it until it ripples, and lets it go up into Hushfold.
//   compose → launch → sent
// High-risk words never leave the device: they are screened here first (and
// again by the service) and answered with support instead.

import { h, icon } from '../dom.js';
import { chip, sentenceSwitch } from '../kit.js';
import { MALLOWS } from '../mallows-data.js';
import { Orb, fly } from '../orb.js';
import { play } from '../sound.js';
import { wait, reducedMotion, rise, CSS_EASE } from '../motion.js';
import { screenFeeling } from '../../core/feeling-safety.js';
import { charCount } from '../../core/text-policy.js';
import { FEELING_LABELS, RELAY } from '../../core/relay-config.js';
import { brandBar, dock, feelColour, errorText } from './common.js';
import { room, stage, handsOf, ThoughtCloud, Speech, line, swapLine, checkRow, privacySheet, lightRoom, put } from './parts.js';

export function release(dev, params = {}) {
  const c = dev.client;
  const me = () => dev.state.me;
  const mine = MALLOWS[me().profile.mallow] || MALLOWS.noomi;
  const draft = (dev.memory.release ||= { text: '', label: null, allowFallback: false, consent: false, clientId: null });
  const max = me().limits.feelingMaxChars;
  let state = 'compose';
  let busy = false;
  let alive = true;
  let orb = null;

  const r = room(mine.id, 'hf-release', { seed: 7 });
  const st = stage(mine.id);
  const cloud = new ThoughtCloud({ placeholder: '…', label: 'Your words, as your Mallow holds them' });
  const speech = new Speech(mine.id);
  st.above.append(cloud.el, speech.el);
  const head = h('div', { class: 'hf-head' }, brandBar(dev));
  const body = h('div', { class: 'hf-scroll' });
  const flight = h('div', { class: 'rl-flight', 'aria-hidden': 'true' });
  const dockSlot = h('div', { class: 'rl-dock-slot' }, dock(dev, 'release'));
  r.el.append(head, body, dockSlot, flight);
  const el = r.el;
  const full = () => me().travelling >= me().limits.maxActiveJourneys;
  const inactive = () => me().accountState !== 'active';
  const setState = (s) => { state = s; el.dataset.state = s; };

  // ------------------------------------------------------------ compose --
  function compose({ err = '' } = {}) {
    setState('compose');
    dockSlot.hidden = false;
    cloud.el.hidden = false;
    cloud.set(draft.text);
    const blocked = full() || inactive();
    const area = h('textarea', {
      id: 'hf-feeling', class: 'hf-input', rows: 3, maxlength: String(max + 40), placeholder: 'Write it the way it feels…',
      'aria-label': 'What’s on your mind?', 'aria-describedby': 'hf-feeling-sub hf-feeling-count', dataset: { test: 'feeling-text' }, disabled: blocked,
    });
    area.value = draft.text;
    const count = h('span', { class: 'hf-count', id: 'hf-feeling-count', 'aria-live': 'off' });
    const error = h('p', { class: 'kit-error', role: 'alert', dataset: { test: 'feeling-error' } }, err);
    const go = h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--lg kit-btn--block hf-go', dataset: { test: 'release-submit' }, onclick: () => launch() }, 'Release into Hushfold');
    let lastBeat = 0;
    const sync = () => {
      const n = charCount(area.value.trim());
      count.textContent = n > max * 0.8 ? `${n} / ${max}` : '';
      count.classList.toggle('is-over', n > max);
      go.disabled = blocked || n < RELAY.feelingMinChars || n > max || !draft.consent;
      el.style.setProperty('--fill', String(Math.min(1, n / 160)));
    };
    area.addEventListener('input', () => {
      const before = draft.text;
      draft.text = area.value;
      draft.clientId = null;                  // edited words are a new release
      error.textContent = '';
      cloud.set(area.value);
      sync();
      // the Mallow listens: a glance when you begin, a soft nod every few words
      if (!before.trim() && area.value.trim()) st.mallow.notice(0);
      const beat = Math.floor(area.value.length / 18);
      if (beat !== lastBeat) { lastBeat = beat; st.mallow.settle(); }
    });
    area.addEventListener('focus', () => el.classList.add('is-typing'));
    area.addEventListener('blur', () => el.classList.remove('is-typing'));

    const tags = h('div', { class: 'hf-tags', role: 'group', 'aria-label': 'How does it feel? (optional)' },
      FEELING_LABELS.map((l) => chip(l.label, draft.label === l.id, (e) => {
        draft.label = draft.label === l.id ? null : l.id;
        tags.querySelectorAll('.kit-chip').forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget && !!draft.label)));
        lightRoom(el, draft.label ? feelColour(draft.label) : null);
        if (draft.label) { st.mallow.signature(0.35); play('tap'); }
      }, { dot: l.colour, small: true, test: `label-${l.id}` })));
    lightRoom(el, draft.label ? feelColour(draft.label) : null);

    const consent = checkRow({
      id: 'hf-consent', test: 'share-consent', checked: draft.consent,
      label: 'Share anonymously with Hushmates participants',
      hint: 'Your words may be shown to other people who can offer different perspectives. Please leave out identifying details.',
      extra: h('button', { type: 'button', class: 'hf-link', dataset: { test: 'privacy-link' }, onclick: () => privacySheet(dev) }, 'Privacy details'),
      onChange: (on) => { draft.consent = on; sync(); if (on) st.mallow.pulseBlush(); },
    });
    const fallback = sentenceSwitch({
      label: 'Let a Mallow offer another perspective if nobody responds.',
      hint: 'Your Mallow can offer an automatically generated perspective if no one catches your feeling.',
      checked: draft.allowFallback, test: 'allow-fallback',
      onChange: (on) => { draft.allowFallback = on; draft.clientId = null; return true; },
    });
    fallback.classList.add('kit-switch--plain');

    put(body,
      st.el,
      h('div', { class: 'hf-copy' },
        line('What’s on your mind?'),
        h('p', { class: 'hf-sub', id: 'hf-feeling-sub' }, 'A thought, a feeling, or something you can’t quite explain.')),
      blocked
        ? h('p', { class: 'hf-note', dataset: { test: 'release-limit' } }, inactive()
          ? 'Your account can’t release feelings right now.'
          : `You have ${me().travelling} feelings travelling. When one comes home, you can send another.`)
        : null,
      h('div', { class: 'hf-form' },
        h('div', { class: 'hf-field' }, area, count),
        error,
        tags,
        h('div', { class: 'hf-choices' }, consent, fallback),
        h('div', { class: 'hf-actions' }, go,
          h('button', { type: 'button', class: 'kit-btn kit-btn--text kit-btn--block', dataset: { test: 'cancel-feeling' }, onclick: () => cancel() }, 'Cancel'))));
    sync();
    if (blocked) speech.say(inactive() ? 'Your account can’t release feelings right now.' : 'Your other feelings are still travelling. I’ll be here when one comes home.');
    else speech.say('');
    if (err) { error.textContent = err; requestAnimationFrame(() => error.scrollIntoView({ block: 'center' })); }
    if (params.compose && !blocked) setTimeout(() => alive && area.focus({ preventScroll: true }), 80);
  }

  function cancel() {
    Object.assign(draft, { text: '', label: null, clientId: null, consent: false, allowFallback: false });
    st.mallow.think(false);
    st.mallow.settle();
    compose();
    body.scrollTop = 0;
  }

  // ------------------------------------------------------------- launch --
  async function launch() {
    if (busy || state !== 'compose') return;
    const local = screenFeeling(draft.text, { minChars: RELAY.feelingMinChars, maxChars: max });
    if (!local.ok && local.code === 'support') { dev.go('support', { support: local.support, level: local.level }); return; }   // never sent anywhere
    if (!local.ok) { compose({ err: local.message }); return; }
    if (!draft.consent) return;
    busy = true;
    draft.clientId ||= c.newId();               // the same id on retry: never two journeys
    body.querySelectorAll('button, textarea').forEach((b) => { b.disabled = true; });
    let res;
    try {
      res = await c.release({ text: draft.text, label: draft.label, mallow: mine.id, allowFallback: draft.allowFallback, consent: true, clientId: draft.clientId });
    } catch (e) {
      busy = false;
      if (!alive) return;
      if (String(e.code || '').startsWith('feeling-') || e.code === 'consent-required') { compose({ err: errorText(e) }); return; }
      compose();
      speech.say(errorText(e));
      return;
    }
    if (!alive) return;
    if (res.status === 'support') { busy = false; dev.go('support', { support: res.support, level: res.level }); return; }
    const journey = res.journey;
    const words = draft.text.trim();
    Object.assign(draft, { text: '', label: null, clientId: null, consent: false, allowFallback: false });
    await moment(journey, words);
    if (!alive) return;
    busy = false;
    sent(journey);
  }

  async function moment(journey, words) {
    setState('launch');
    dockSlot.hidden = true;
    speech.say('');
    const tint = feelColour(journey.label);
    const top = h('div', { class: 'hf-moment', role: 'status', 'aria-live': 'polite' }, h('p', { class: 'hf-line hf-line--moment' }));
    put(body, top, st.el);
    body.scrollTop = 0;
    const rm = reducedMotion();
    await wait(rm ? 0 : 420);
    // 1. the words gather into a glowing orb, just above the Mallow
    const size = Math.round(Math.min(150, Math.max(96, el.clientWidth * 0.34)));
    const target = handsOf(st.mallow, flight, size);
    target.y -= size * 0.55;
    orb = new Orb({ size, tint, text: words, label: `Your feeling: ${words}` });
    const flyer = h('div', { class: 'rl-flyer' });
    flyer.style.transform = `translate(${target.x}px, ${target.y}px) translate(-50%, -50%)`;
    flyer.append(orb.el);
    const f = flight.getBoundingClientRect();
    play('gather');
    const gathering = cloud.gather({ x: f.left + target.x, y: f.top + target.y });
    await wait(rm ? 0 : 520);
    flight.append(flyer);
    orb.form(1);
    orb.showText(true);                        // the words stay visible a moment inside the light
    st.mallow.notice(0);
    st.mallow.reach(0.22);
    await gathering;
    if (!alive) return;
    cloud.el.hidden = true;
    await wait(rm ? 200 : 900);
    // 2. it settles into the Mallow's arms; the Mallow squeezes it until it ripples
    const hands = handsOf(st.mallow, flight, size);
    st.mallow.relax();
    await fly(flyer, flight, { from: target, to: hands, duration: rm ? 1 : 700, scale: [1, 0.9], trail: false });
    play('squish');
    st.mallow.press(1, 0.6);
    orb.squeeze(1, 0.6);
    await wait(rm ? 100 : 520);
    orb.showText(false);
    orb.ripple({ colour: tint });
    orb.glowPulse();
    play('ripple');
    await wait(rm ? 100 : 760);
    // 3. it's let go, and floats up through Hushfold with a thread of light
    play('release');
    st.mallow.release();
    st.mallow.signature(0.9);
    orb.release();
    dev.atmo.bloom({ y: 0.32 });
    r.sky?.pan(320, { duration: 2800 });
    if (!rm) st.el.animate([{ transform: 'none' }, { transform: 'translateY(70px)', opacity: 0.85 }], { duration: 2800, easing: CSS_EASE, fill: 'forwards' });
    swapLine(top.firstChild, 'Your feeling is on its way.');
    await fly(flyer, flight, { from: hands, to: { x: hands.x + 30, y: -150 }, via: { x: hands.x - 80, y: hands.y * 0.4 }, duration: rm ? 1 : 2600, scale: [0.9, 0.22], colour: tint });
    flyer.remove();
    orb.destroy();
    orb = null;
  }

  // --------------------------------------------------------------- sent --
  function sent(journey) {
    setState('sent');
    dockSlot.hidden = false;
    dockSlot.replaceChildren(dock(dev, 'release'));
    cloud.el.hidden = true;
    st.el.getAnimations().forEach((a) => a.cancel());
    r.sky?.pan(0, { duration: 3200 });
    const second = h('p', { class: 'hf-sub hf-sub--soft' }, 'Let’s see how someone else sees it.');
    put(body,
      h('div', { class: 'hf-copy hf-copy--top', dataset: { test: 'release-sent' } },
        h('h1', { class: 'hf-line', 'data-autofocus': '' }, 'Your feeling is on its way.'), second),
      st.el,
      h('div', { class: 'hf-actions' },
        h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--block', dataset: { test: 'follow-journey' }, onclick: () => dev.go('journey', { id: journey.id }) }, 'Follow its journey'),
        h('button', { type: 'button', class: 'kit-btn kit-btn--ghost kit-btn--block', dataset: { test: 'go-catch' }, onclick: () => dev.go('catch', {}, { replace: true }) }, 'Catch a feeling while you wait'),
        h('button', { type: 'button', class: 'kit-btn kit-btn--text kit-btn--block', dataset: { test: 'release-another' }, onclick: () => { compose(); body.scrollTop = 0; } }, 'Release another feeling')));
    second.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 800, delay: 700, easing: CSS_EASE, fill: 'backwards' });
    st.el.animate([{ transform: 'translateY(50px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 1100, delay: 300, easing: CSS_EASE, fill: 'backwards' });
    rise([...body.querySelectorAll('.hf-actions > *')], { y: 12, delay: 900, stagger: 60 });
    st.mallow.cheer(0.6);
  }

  compose();

  return {
    el, mood: 'sky',
    update(s) {
      if (!dockSlot.hidden) dockSlot.replaceChildren(dock(dev, 'release'));
      if (state === 'compose' && !busy) {
        const go = body.querySelector('[data-test="release-submit"]');
        const blockedNow = full() || inactive();
        const area = body.querySelector('textarea');
        if (area && area.disabled !== blockedNow && document.activeElement !== area) compose();
      }
    },
    destroy() { alive = false; st.destroy(); orb?.destroy(); },
  };
}
