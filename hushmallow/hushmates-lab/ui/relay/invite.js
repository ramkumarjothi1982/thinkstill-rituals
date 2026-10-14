// INVITE: the door into the pilot. Hushmates is invitation-only for adults:
// the person enters the code from their invitation, a name only they will
// see, and confirms they're 18 or over. The server checks the invitation and
// the confirmation, and keeps the session in a cookie this page can't read.
// Then the welcome takes over.

import { h, humane } from '../dom.js';
import { MALLOWS } from '../mallows-data.js';
import { room, stage, Speech, line, checkRow, privacySheet, put } from './parts.js';

export function invite(dev) {
  const m = MALLOWS.noomi;
  const r = room(m.id, 'hf-invite', { seed: 4 });
  const st = stage(m.id, { size: 'm', label: `${m.name}, waiting to welcome you` });
  const speech = new Speech(m.id);
  put(st.above, speech.el);
  speech.say('Hello. I’ve been expecting you.');
  const form = { invite: '', name: '', adult: false };
  let busy = false;

  const field = (label, input, hint, id) => h('div', { class: 'hf-invite-field' },
    h('label', { class: 'kit-label', for: id }, label),
    h('div', { class: 'kit-field' }, input),
    hint ? h('p', { class: 'hf-check-hint', id: `${id}-hint` }, hint) : null);
  const code = h('input', { id: 'hf-invite-code', type: 'text', autocomplete: 'one-time-code', autocapitalize: 'characters', spellcheck: 'false', maxlength: '64', 'aria-describedby': 'hf-invite-code-hint', dataset: { test: 'invite-code' },
    oninput: (e) => { form.invite = e.target.value.trim(); sync(); } });
  const name = h('input', { id: 'hf-invite-name', type: 'text', autocomplete: 'nickname', maxlength: '20', placeholder: 'e.g. Moonbeam', 'aria-describedby': 'hf-invite-name-hint', dataset: { test: 'invite-name' },
    oninput: (e) => { form.name = e.target.value; sync(); } });
  const error = h('p', { class: 'hf-note hf-invite-error', role: 'alert', dataset: { test: 'invite-error' } });
  error.hidden = true;
  const join = h('button', { type: 'submit', class: 'kit-btn kit-btn--ink kit-btn--lg kit-btn--block', disabled: true, dataset: { test: 'invite-join' } }, 'Join Hushmates');
  const sync = () => { join.disabled = busy || !form.invite || form.name.trim().length < 3 || !form.adult; };

  const body = h('form', { class: 'hf-scroll hf-invite-scroll', novalidate: '', onsubmit: (e) => { e.preventDefault(); submit(); } },
    st.el,
    h('div', { class: 'hf-copy' },
      line('You’re invited', { cls: 'hf-line--sm' }),
      h('p', { class: 'hf-sub' }, 'Hushmates is a small, invitation-only pilot for adults. Send a feeling, and see it differently.')),
    h('div', { class: 'hf-form' },
      field('Your invitation code', code, 'It’s in the invitation you were sent.', 'hf-invite-code'),
      field('A name for you here', name, 'Only you see it. Your feelings and perspectives travel with no name at all.', 'hf-invite-name'),
      checkRow({ id: 'hf-invite-adult', label: 'I’m 18 or over', test: 'invite-adult', onChange: (on) => { form.adult = on; sync(); } })),
    error,
    h('div', { class: 'hf-actions' },
      join,
      h('button', { type: 'button', class: 'hf-link hf-link--centre', dataset: { test: 'invite-privacy' }, onclick: () => privacySheet(dev) }, 'Privacy details')));
  r.el.append(body);

  async function submit() {
    if (join.disabled) return;
    busy = true; sync();
    error.hidden = true;
    join.textContent = 'Opening the door…';
    try {
      await dev.env.signIn({ invite: form.invite, name: form.name.trim(), adult: form.adult });
      st.mallow.cheer?.(0.2);
    } catch (e) {
      error.textContent = humane(e);
      error.hidden = false;
      speech.say('Let’s try that again.');
      busy = false;
      join.textContent = 'Join Hushmates';
      sync();
    }
  }
  return { el: r.el, mood: 'dawn', destroy() { st.destroy(); } };
}
