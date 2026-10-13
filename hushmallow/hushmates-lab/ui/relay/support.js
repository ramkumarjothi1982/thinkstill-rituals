// SUPPORT: what someone sees instead of a release when their words suggest
// they (or someone else) may not be safe. Nothing was sent or stored: the
// words were screened on this device first, and again by the service. No orb,
// no journey, no Mallow perspective: a calm room, a Mallow staying close, and
// real places to turn.

import { h, icon } from '../dom.js';
import { MALLOWS } from '../mallows-data.js';
import { top, supportBody } from './common.js';
import { room, stage, Speech, line, put } from './parts.js';

// the safety copy is shared with Reframe; in Hushmates nothing is being reframed yet
const titleFor = (p) => (!p.title || /pause the reframe/i.test(p.title) ? 'Let’s pause here' : p.title);

export function support(dev, { support: payload = {}, level = 'care' } = {}) {
  const mine = MALLOWS[dev.state.me?.profile?.mallow] || MALLOWS.noomi;
  const r = room(mine.id, 'hf-support', { seed: 4 });
  const st = stage(mine.id, { size: 's', label: `${mine.name}, staying close` });
  const speech = new Speech(mine.id);
  put(st.above, speech.el);
  speech.say('I’m right here with you.');
  const back = () => dev.go('release', { compose: true }, { replace: true, back: true });
  const head = h('div', { class: 'hf-head' }, top(dev, { title: '', back }));
  const body = h('div', { class: 'hf-scroll' },
    st.el,
    h('div', { class: 'hf-copy' }, line(titleFor(payload), { cls: 'hf-line--sm' })),
    h('p', { class: 'hf-unsent', dataset: { test: 'support-unsent' } }, icon('shield'),
      h('span', {}, 'Your words were not sent to anyone and were not saved. They’re only on this screen until you leave.')),
    supportBody(payload, { lab: !!dev.env?.lab }),
    h('div', { class: 'hf-actions' },
      h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--block', dataset: { test: 'support-edit' }, onclick: back }, 'Go back to my words'),
      h('button', { type: 'button', class: 'kit-btn kit-btn--text kit-btn--block', dataset: { test: 'support-clear' }, onclick: () => {
        if (dev.memory.release) Object.assign(dev.memory.release, { text: '', label: null, clientId: null });
        dev.go('release', {}, { replace: true, back: true });
      } }, 'Clear my words and go back')));
  r.el.append(head, body);
  r.el.dataset.test = 'support-scene';
  r.el.dataset.level = level;
  return { el: r.el, mood: 'calm', quiet: true, destroy() { st.destroy(); } };
}
