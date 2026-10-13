// SUPPORT: what someone sees instead of a release when their words suggest
// they (or someone else) may not be safe. Nothing was sent or stored: the
// words were screened on this device first, and again by the service.

import { h, icon } from '../dom.js';
import { Mallow } from '../mallow.js';
import { pillow } from '../kit.js';
import { top, supportBody } from './common.js';

// the safety copy is shared with Reframe; in Hushmates nothing is being reframed yet
const titleFor = (p) => (!p.title || /pause the reframe/i.test(p.title) ? 'Let’s pause here' : p.title);

export function support(dev, { support: payload = {}, level = 'care' } = {}) {
  const m = new Mallow('noomi', { eager: true, float: true, label: 'Noomi, resting quietly' });
  const el = h('div', { class: 'hm-scene rl-scene rl-supportscene', dataset: { test: 'support-scene', level } },
    h('div', { class: 'rl-head-slot' }, top(dev, { title: 'You matter', back: () => dev.go('release', { compose: true }, { replace: true, back: true }) })),
    h('div', { class: 'hm-scroll rl-support-scroll' },
      h('div', { class: 'rl-support-mallow' }, pillow('rl-pillow'), m.el),
      h('h1', { class: 'kit-title kit-title--md', 'data-autofocus': '' }, titleFor(payload)),
      h('p', { class: 'rl-card rl-card--warm rl-unsent', dataset: { test: 'support-unsent' } }, icon('shield'),
        h('span', {}, 'Your words were not sent to anyone and were not saved. They’re only on this screen until you leave.')),
      supportBody(payload),
      h('div', { class: 'rl-actions' },
        h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--block', dataset: { test: 'support-edit' }, onclick: () => dev.go('release', { compose: true }, { replace: true, back: true }) }, 'Go back to my words'),
        h('button', { type: 'button', class: 'kit-btn kit-btn--text kit-btn--block', dataset: { test: 'support-clear' }, onclick: () => {
          if (dev.memory.release) Object.assign(dev.memory.release, { text: '', label: null, clientId: null });
          dev.go('release', {}, { replace: true, back: true });
        } }, 'Clear my words and go back'))));
  return { el, mood: 'calm', quiet: true, destroy() { m.destroy(); } };
}
