// WELCOME: the first time. What Hushmates is (one feeling, five perspectives,
// back to you), how a feeling travels, and the promises that keep it gentle,
// ending with the choices only the person can make: catching, and confirming
// they're an adult invited to the pilot.

import { h, icon } from '../dom.js';
import { eyebrow, headline, pillow, sentenceSwitch } from '../kit.js';
import { Mallow } from '../mallow.js';
import { MALLOWS } from '../mallows-data.js';
import { Orb } from '../orb.js';
import { play } from '../sound.js';
import { rise } from '../motion.js';

// an illustration only (no one's activity): the five Mallow colours a feeling might gather
const ILLUSTRATION = ['blubi', 'pipzi', 'loomi', 'zuzu', 'boppo'].map((m, i) => ({ slot: i + 1, mallow: m }));

export function welcome(dev) {
  const c = dev.client;
  const p = dev.state.me.profile;
  const mine = MALLOWS[p.mallow] || MALLOWS.noomi;
  const choice = { catching: p.catching !== false, adult: false };
  let step = 0;
  const mallow = new Mallow(mine.id, { interactive: true, eager: true, label: `Squeeze ${mine.name}`, onSqueeze: () => play('squish') });
  const orb = new Orb({ size: null, tint: '#CDB8FF', label: 'An illustration of a feeling orb with five petals of light' });
  const body = h('div', { class: 'rl-body rl-welcome-body' });
  const stage = h('div', { class: 'rl-stage' }, h('div', { class: 'rl-orb-slot' }, orb.el),
    h('div', { class: 'rl-stage-ground' }, pillow('rl-pillow'), h('div', { class: 'rl-stage-mallow' }, mallow.el)));
  const foot = h('div', { class: 'rl-foot' });
  const dots = h('p', { class: 'rl-steps', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'));
  const el = h('div', { class: 'hm-scene rl-scene rl-welcome', dataset: { step: '0', test: 'welcome' } }, body, stage, foot);
  const put = (node, ...kids) => node.replaceChildren(...kids.flat().filter(Boolean));
  const next = (label, onclick, test = 'welcome-next') => h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--lg kit-btn--block', dataset: { test }, onclick }, label, icon('arrow'));

  function show(n) {
    step = n;
    el.dataset.step = String(n);
    [...dots.children].forEach((d, i) => d.classList.toggle('is-on', i === n));
    if (n === 0) {
      orb.setPetals(ILLUSTRATION, null);
      put(body, h('div', { class: 'rl-hero rl-welcome-hero' },
        eyebrow('Hushmates · adult pilot', { center: true }),
        h('h1', { class: 'kit-title kit-title--xl', 'data-autofocus': '' }, 'Send a feeling. ', h('em', { class: 'kit-grad kit-grad--softer' }, 'See it differently.')),
        h('p', { class: 'kit-lede rl-hero-lede rl-tagline' }, 'One feeling. Five perspectives.', h('br'), 'Back to you.')));
      put(foot, next('How it works', () => show(1)), dots);
    } else if (n === 1) {
      const row = (n2, title, text, petals) => {
        const o = new Orb({ size: 46, tint: '#CDB8FF' });
        o.setPetals(ILLUSTRATION.slice(0, petals), null);
        return h('li', { class: 'rl-how-row' }, h('span', { class: 'rl-how-orb', 'aria-hidden': 'true' }, o.el), h('span', {}, h('strong', {}, title), h('small', {}, text)));
      };
      put(body, h('div', { class: 'hm-scroll rl-how' },
        h('h1', { class: 'kit-title kit-title--md', 'data-autofocus': '' }, 'How a feeling ', h('em', { class: 'kit-grad kit-grad--mates' }, 'travels')),
        h('ol', { class: 'rl-how-list' },
          row(1, 'Release', 'Write what’s on your mind. Your Mallow lets it go, with no name attached.', 0),
          row(2, 'Catch', 'Up to five different people catch it, one at a time. Nobody has to.', 1),
          row(3, 'Reframe', 'Each offers a possibility, not a verdict, and it gains a petal of light.', 3),
          row(4, 'Return', 'After five perspectives, or within a day, it comes home to you.', 5),
          row(5, 'Choose', 'Keep the perspectives that help, let go of the rest.', 5))));
      put(foot, next('Continue', () => show(2)), dots);
    } else {
      const enter = h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--lg kit-btn--block', disabled: !choice.adult, dataset: { test: 'welcome-enter' }, onclick: () => finish() }, 'Enter Hushmates');
      put(body, h('div', { class: 'hm-scroll rl-promises' },
        h('h1', { class: 'kit-title kit-title--md', 'data-autofocus': '' }, 'Before you ', h('em', { class: 'kit-grad kit-grad--softer' }, 'begin')),
        h('ul', { class: 'rl-standards' },
          h('li', {}, h('strong', {}, 'Pseudonymous, not perfectly anonymous.'), ' Nobody learns who you are or can contact you. Leave out names and details that could identify anyone.'),
          h('li', {}, h('strong', {}, 'Possibilities, not verdicts.'), ' No diagnosis, no judgement, no telling anyone what to do.'),
          h('li', {}, h('strong', {}, 'People first.'), ' A Mallow perspective is only offered if you allow it, is always labelled, and never counts as a person.'),
          h('li', {}, h('strong', {}, 'Not an emergency service.'), ' If you might not be safe, Hushmates will point you to real support straight away.')),
        sentenceSwitch({ label: 'Let feelings find me', hint: 'Catch other people’s feelings when you choose to look. You can change this any time.', checked: choice.catching, test: 'welcome-catching', onChange: (on) => { choice.catching = on; return true; } }),
        sentenceSwitch({ label: 'I’m 18 or over, and I was invited to the pilot', hint: 'Hushmates is an invitation-only pilot for adults.', checked: false, test: 'welcome-adult', onChange: (on) => { choice.adult = on; enter.disabled = !on; return true; } })));
      put(foot, enter, dots);
    }
    rise([...body.querySelectorAll('.rl-hero > *, .rl-how-row, .rl-promises > *')].slice(0, 8), { y: 14, stagger: 50 });
  }

  async function finish() {
    if (!choice.adult) return;
    const r = await dev.run(() => c.act('savePreferences', { onboarded: true, catching: choice.catching }, ['me']));
    if (!r) return;
    play('release');
    dev.history = [];
    dev.go('release', {}, { replace: true, transition: 'portal' });
  }

  show(0);
  return { el, mood: 'dawn', destroy() { mallow.destroy(); orb.destroy(); } };
}
