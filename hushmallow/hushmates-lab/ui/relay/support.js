// SUPPORT: what someone sees instead of a release when their words suggest
// they (or someone else) may not be safe. Nothing was sent or stored: the
// words were screened on this device first, and again by the service. (Sending a
// returned feeling out again screens it again too: then it stays home.) No orb,
// no journey, no Mallow perspective: a calm room, a quiet Mallow, and
// real places to turn.

import { h, icon } from '../dom.js';
import { MALLOWS } from '../mallows-data.js';
import { top, supportBody } from './common.js';
import { room, stage, Speech, line, put, hostNote } from './parts.js';

// Hushmates writes its own titles (core/feeling-safety.js); an old Reframe title never shows
const titleFor = (p) => (!p.title || /reframe/i.test(p.title) ? 'Let’s pause here' : p.title);

export function support(dev, { support: payload = {}, level = 'care', from = 'release', journeyId = null } = {}) {
  const catching = from === 'catch';
  const resending = from === 'resend' && !!journeyId;
  const mine = MALLOWS[dev.state.me?.profile?.mallow] || MALLOWS.noomi;
  const r = room(mine.id, 'hf-support', { seed: 4 });
  const st = stage(mine.id, { size: 's', label: `${mine.name}, your Mallow` });
  const speech = new Speech(mine.id);
  put(st.above, speech.el);
  // never "I'm right here with you": a Mallow is part of an app, and the people to turn to are on the lines below (Tier 0)
  speech.say('There are real people ready to listen, right now.');
  const back = catching ? () => dev.go('catch', {}, { replace: true, back: true })
    : resending ? () => dev.go('homecoming', { id: journeyId }, { replace: true, back: true })
      : () => dev.go('release', { compose: true }, { replace: true, back: true });
  const head = h('div', { class: 'hf-head' }, top(dev, { title: '', back, help: false }));
  const body = h('div', { class: 'hf-scroll' },
    st.el,
    h('div', { class: 'hf-copy' }, line(titleFor(payload), { cls: 'hf-line--sm' })),
    h('p', { class: 'hf-unsent', dataset: { test: 'support-unsent' } }, icon('shield'),
      h('span', {}, catching
        ? 'What you wrote wasn’t passed on or saved, so nobody at Hushmates will see it or be in touch. The feeling has floated on to someone else. Right now, this is about you.'
        : resending
          ? 'This feeling wasn’t sent out again. It’s still with you in Returned, where you can keep it, let it go or delete it.'
          : 'Your words weren’t sent to anyone or saved, so nobody at Hushmates will see them or be in touch. They’re only in your draft here, and they’re gone when you clear them or close Hushmates.')),
    supportBody(payload, { note: hostNote(dev, 'support') }),
    resending
      ? h('div', { class: 'hf-actions' },
        h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--block', dataset: { test: 'support-back-journey' }, onclick: back }, 'Back to this feeling'))
      : catching
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
