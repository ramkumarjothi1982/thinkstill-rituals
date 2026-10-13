// SUPPORT: what someone sees instead of a release when their words suggest
// they (or someone else) may not be safe. Nothing was sent or stored: the
// words were screened on this device first, and again by the service. No orb,
// no journey, no Mallow perspective: a calm room, a Mallow staying close, and
// real places to turn.

import { h, icon } from '../dom.js';
import { MALLOWS } from '../mallows-data.js';
import { top, supportBody } from './common.js';
import { room, stage, Speech, line, put } from './parts.js';

// Hushmates writes its own titles (core/feeling-safety.js); an old Reframe title never shows
const titleFor = (p) => (!p.title || /reframe/i.test(p.title) ? 'Let’s pause here' : p.title);

export function support(dev, { support: payload = {}, level = 'care', from = 'release' } = {}) {
  const catching = from === 'catch';
  const mine = MALLOWS[dev.state.me?.profile?.mallow] || MALLOWS.noomi;
  const r = room(mine.id, 'hf-support', { seed: 4 });
  const st = stage(mine.id, { size: 's', label: `${mine.name}, staying close` });
  const speech = new Speech(mine.id);
  put(st.above, speech.el);
  speech.say('I’m right here with you.');
  const back = catching ? () => dev.go('catch', {}, { replace: true, back: true }) : () => dev.go('release', { compose: true }, { replace: true, back: true });
  const head = h('div', { class: 'hf-head' }, top(dev, { title: '', back }));
  const body = h('div', { class: 'hf-scroll' },
    st.el,
    h('div', { class: 'hf-copy' }, line(titleFor(payload), { cls: 'hf-line--sm' })),
    h('p', { class: 'hf-unsent', dataset: { test: 'support-unsent' } }, icon('shield'),
      h('span', {}, catching
        ? 'What you wrote wasn’t passed on or saved, and the feeling has floated on to someone else. Right now, this is about you.'
        : 'Your words were not sent to anyone and were not saved. They stay on this device until you clear them.')),
    supportBody(payload, { lab: !!dev.env?.lab }),
    catching
      ? h('div', { class: 'hf-actions' },
        h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--block', dataset: { test: 'support-edit' }, onclick: () => dev.go('release', {}, { replace: true, back: true }) }, 'Take a pause'),
        h('button', { type: 'button', class: 'kit-btn kit-btn--text kit-btn--block', dataset: { test: 'support-clear' }, onclick: back }, 'Back to Catch'))
      : h('div', { class: 'hf-actions' },
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
