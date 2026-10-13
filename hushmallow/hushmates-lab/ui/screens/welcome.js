// Welcome to Hushmates: the opening scene. Two Mallows face each other across
// a softly glowing line, the way the landing page introduces Hushmates.
// Squeeze one and a little heart travels to the other.

import { h, icon } from '../dom.js';
import { MallowSet, face } from '../mallow.js';
import { LOGO } from '../mallows-data.js';
import { arc, eyebrow, headline, hint, travel } from '../kit.js';
import { rise, reducedMotion } from '../motion.js';

export function welcome(device) {
  const set = new MallowSet();
  const scene = h('div', { class: 'wl-pair', 'aria-hidden': 'true' });
  const left = set.make('loomi', { interactive: true, eager: true, label: 'Squeeze Loomi', pressSeconds: 0.6 });
  const right = set.make('boppo', { interactive: true, eager: true, label: 'Squeeze Boppo', pressSeconds: 0.6 });
  left.el.tabIndex = -1; right.el.tabIndex = -1;
  const send = (fromLeft) => {
    const other = fromLeft ? right : left;
    travel(scene, { from: fromLeft ? [22, 64] : [78, 64], via: [50, 14], to: fromLeft ? [78, 64] : [22, 64], kind: 'heart', duration: 1100 });
    setTimeout(() => other.pulseBlush(), reducedMotion() ? 0 : 900);
  };
  left.o.onSqueeze = () => send(true);
  right.o.onSqueeze = () => send(false);
  scene.append(
    h('span', { class: 'wl-pair-glow' }),
    arc({ cls: 'wl-pair-arc' }),
    h('div', { class: 'wl-pair-m wl-pair-m--l' }, left.el),
    h('div', { class: 'wl-pair-m wl-pair-m--r' }, right.el),
  );

  const promise = (id, title, text) => h('li', {}, face(id, { size: 46 }), h('div', {}, h('strong', {}, title), h('span', {}, text)));

  const intro = [
    eyebrow('Hushmates', { tag: 'Adult pilot', center: true }),
    headline('h1', 'Real people.', 'Softer connections.', { cls: 'kit-title--xl wl-title' }),
  ];
  const stage = h('div', { class: 'wl-stage' }, scene, hint('Press and hold a Mallow'));
  const rest = [
    h('p', { class: 'kit-support wl-support' }, 'A real person. A private connection.'),
    h('p', { class: 'kit-lede wl-lede' }, 'Some conversations deserve a quieter place. Hushmates is a private way to talk with a real person you’ve both chosen: text only, by mutual invitation, with your identity kept out of view.'),
    h('div', { class: 'wl-cta' },
      h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--lg kit-btn--block', onclick: () => device.go('identity', { first: true }), dataset: { test: 'create-identity' } },
        'Create my Mallow identity', icon('arrow')),
      h('button', { type: 'button', class: 'kit-btn kit-btn--link', onclick: () => device.go('safety') }, 'How privacy and safety work')),
    h('ul', { class: 'wl-promises', 'aria-label': 'What Hushmates promises' },
      promise('noomi', 'Only people you both choose', 'Nobody can message you unless you’ve both said yes.'),
      promise('pipzi', 'A Mallow and a pseudonym', 'No photos, no real names, no followers, no feeds.'),
      promise('loomi', 'Every word from a real person', 'No AI anywhere. Just words. Just us.'),
      promise('blubi', 'Never obliged to reply', 'Take a break, go quiet or step back whenever you need.')),
    h('p', { class: 'kit-note wl-note' }, 'Hushmates are peers who choose to talk, not counsellors or crisis support.'),
  ];

  const el = h('div', { class: 'hm-scene wl' },
    h('header', { class: 'wl-top' }, h('img', { class: 'wl-logo', src: LOGO, alt: 'hushmallow', width: 1200, height: 201 })),
    h('div', { class: 'hm-scroll wl-scroll' }, ...intro, stage, ...rest));

  return {
    el,
    mood: 'dawn',
    mounted() {
      rise([...intro, stage, ...rest.slice(0, 3)], { stagger: 80 });
      if (!reducedMotion()) setTimeout(() => { left.press(0.55, 0.14); setTimeout(() => left.release(), 160); }, 700);
    },
    destroy: () => set.destroy(),
  };
}
