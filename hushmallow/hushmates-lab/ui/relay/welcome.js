// WELCOME: the first time, in three quiet beats inside your Mallow's room.
//   1. what Hushmates is: one feeling, five human perspectives, back to you
//   2. how a feeling travels (the orb gathers a petal for each person)
//   3. the promises, and the choices only the person can make: catching,
//      and confirming they're an adult invited to the pilot
// The orb here is an illustration, never anyone's activity.

import { h, icon } from '../dom.js';
import { sentenceSwitch } from '../kit.js';
import { MALLOWS } from '../mallows-data.js';
import { Orb } from '../orb.js';
import { play } from '../sound.js';
import { rise, reducedMotion, wait } from '../motion.js';
import { room, stage, Speech, line, swapLine, checkRow, privacySheet, put } from './parts.js';

// an illustration only (no one's activity): the colours a feeling might gather
const ILLUSTRATION = ['blubi', 'pipzi', 'loomi', 'zuzu', 'boppo'].map((m, i) => ({ slot: i + 1, mallow: m }));

const BEATS = [
  { title: 'Release', text: 'Write what’s on your mind. Your Mallow lets it go, with no name attached.', petals: 0 },
  { title: 'Catch', text: 'Up to five different people can catch it, one perspective each. Nobody has to.', petals: 1 },
  { title: 'See it differently', text: 'Each offers a possibility, not a verdict, and it gains a petal of light.', petals: 3 },
  { title: 'Back to you', text: 'After five human perspectives, or within a day, it comes home.', petals: 5 },
];

export function welcome(dev) {
  const c = dev.client;
  const p = dev.state.me.profile;
  const mine = MALLOWS[p.mallow] || MALLOWS.noomi;
  const choice = { catching: p.catching !== false, adult: false };
  let alive = true;
  let beat = 0;
  let timer = 0;

  const r = room(mine.id, 'hf-welcome', { seed: 2 });
  const st = stage(mine.id, { size: 'l' });
  const speech = new Speech(mine.id);
  const orb = new Orb({ size: null, tint: '#CDB8FF', label: 'An illustration of a feeling, gathering petals of light' });
  const orbSlot = h('div', { class: 'hf-orb-slot hf-welcome-orb' }, orb.el);
  put(st.above, orbSlot, speech.el);
  const head = h('div', { class: 'hf-head' }, h('header', { class: 'rl-top' }, h('div', { class: 'rl-brand' }, h('p', { class: 'rl-brand-mark' }, 'Hush', h('em', {}, 'mates')))));
  const body = h('div', { class: 'hf-scroll hf-welcome-scroll' });
  r.el.append(head, body);
  r.el.dataset.test = 'welcome';

  const next = (label, onclick, test = 'welcome-next') => h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--lg kit-btn--block', dataset: { test }, onclick }, label);
  const steps = (n) => h('p', { class: 'hf-steps' }, h('span', { class: 'hf-sr' }, `Step ${n + 1} of 3`), [0, 1, 2].map((i) => h('i', { class: i === n ? 'is-on' : '', 'aria-hidden': 'true' })));

  function show(n) {
    clearTimeout(timer);
    r.el.dataset.step = String(n);
    st.el.classList.toggle('hf-stage--s', n === 2);
    put(st.above, n === 2 ? null : orbSlot, speech.el);
    if (n === 0) {
      orb.setPetals(ILLUSTRATION, null);
      speech.say('');
      put(body,
        st.el,
        h('div', { class: 'hf-copy' },
          line('Send a feeling. See it differently.'),
          h('p', { class: 'hf-tagline' }, 'One feeling. Five human perspectives.', h('br'), 'Back to you.')),
        h('div', { class: 'hf-actions' }, next('How it works', () => show(1)), steps(0)));
    } else if (n === 1) {
      const title = h('h1', { class: 'hf-line hf-line--sm', 'data-autofocus': '' }, BEATS[0].title);
      const text = h('p', { class: 'hf-sub' }, BEATS[0].text);
      const dots = h('div', { class: 'hf-beats', role: 'tablist', 'aria-label': 'How a feeling travels' }, BEATS.map((b, i) => h('button', {
        type: 'button', role: 'tab', class: 'hf-beat', 'aria-selected': String(i === 0), 'aria-label': b.title, onclick: () => go(i),
      })));
      const go = (i) => {
        beat = i;
        orb.setPetals(ILLUSTRATION.slice(0, BEATS[i].petals), null);
        if (BEATS[i].petals) play('petal');
        st.mallow.cheer(0.08);
        swapLine(title, BEATS[i].title);
        swapLine(text, BEATS[i].text);
        dots.querySelectorAll('.hf-beat').forEach((d, k) => d.setAttribute('aria-selected', String(k === i)));
        clearTimeout(timer);
        if (!reducedMotion() && !held && i < BEATS.length - 1) timer = setTimeout(() => alive && r.el.dataset.step === '1' && go(i + 1), 3200);
      };
      // the beats play once; touching, hovering or focusing them hands control to the person
      let held = false;
      const hold = () => { held = true; clearTimeout(timer); };
      ['pointerdown', 'pointerenter', 'focusin'].forEach((ev) => dots.addEventListener(ev, hold));
      orb.setPetals([], null);
      put(body,
        st.el,
        h('div', { class: 'hf-copy hf-copy--beats', 'aria-live': 'polite' }, title, text),
        dots,
        h('div', { class: 'hf-actions' }, next('Continue', () => show(2))));
      go(0);
    } else {
      const enter = h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--lg kit-btn--block', disabled: !choice.adult, dataset: { test: 'welcome-enter' }, onclick: () => finish() }, 'Enter Hushmates');
      const promise = (ic, title, text) => h('li', { class: 'hf-promise' }, icon(ic), h('span', {}, h('strong', {}, title), ' ', text));
      speech.say('A few promises, before we begin.');
      put(body,
        st.el,
        h('div', { class: 'hf-copy' }, line('Before you begin', { cls: 'hf-line--sm' })),
        h('ul', { class: 'hf-promises' },
          promise('eyeOff', 'Pseudonymous, not perfectly anonymous.', 'Other participants never see your name or account, and can’t contact you. Leave out names and details that could identify anyone.'),
          promise('sparkle', 'Possibilities, not verdicts.', 'No diagnosis, no judgement, no telling anyone what to do.'),
          promise('heart', 'People first.', 'A Mallow perspective is offered only if you allow it. It’s automatically generated, always labelled, and never counted as a person.'),
          promise('shield', 'Not an emergency service.', 'If you might not be safe, Hushmates points you to real support straight away.')),
        h('button', { type: 'button', class: 'hf-link hf-link--centre', dataset: { test: 'welcome-privacy' }, onclick: () => privacySheet(dev) }, 'Privacy details'),
        h('div', { class: 'hf-form' },
          (() => { const sw = sentenceSwitch({ label: 'Let feelings find me', hint: 'Catch other people’s feelings when you choose to look. You can change this any time.', checked: choice.catching, test: 'welcome-catching', onChange: (on) => { choice.catching = on; return true; } }); sw.classList.add('kit-switch--plain'); return sw; })(),
          checkRow({ id: 'hf-adult', label: 'I’m 18 or over, and I was invited to the pilot', hint: 'Hushmates is an invitation-only pilot for adults.', test: 'welcome-adult', onChange: (on) => { choice.adult = on; enter.disabled = !on; } })),
        h('div', { class: 'hf-actions' }, enter, steps(2)));
    }
    rise([...body.querySelectorAll('.hf-copy > *, .hf-promise, .hf-form > *, .hf-actions')].slice(0, 9), { y: 12, stagger: 50 });
  }

  async function finish() {
    if (!choice.adult) return;
    const res = await dev.run(() => c.act('savePreferences', { onboarded: true, catching: choice.catching }, ['me']));
    if (!res) return;
    play('release');
    st.mallow.cheer(0.2);
    await wait(reducedMotion() ? 0 : 260);
    dev.history = [];
    dev.go('release', {}, { replace: true, transition: 'portal' });
  }

  show(0);
  return { el: r.el, mood: 'dawn', destroy() { alive = false; clearTimeout(timer); st.destroy(); orb.destroy(); } };
}
