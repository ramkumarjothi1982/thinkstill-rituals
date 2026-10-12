// The compact "tell me" overlay. It only appears when the person chooses to
// answer, sits at the bottom (above the keyboard), and disappears again as
// soon as they send. The words are kept exactly as typed. A feeling chip is
// optional and is what chooses the authored response — never the text.
// Speech: the iPhone keyboard's own dictation works in the field; no audio
// is recorded or sent anywhere by hushmallow.

import { h, icon } from '../app/ui.js';
import { FEELINGS, ASK_FEELING } from './data/lines.js';

export const MAX_WORDS_CHARS = 160;

export function openThoughtInput(parent, { who = 'Mallow', feeling = null, placeholder = 'Say it how it is…' } = {}) {
  return new Promise((resolve) => {
    let chosen = feeling;
    const input = h('input', {
      class: 'hf-input', type: 'text', maxlength: String(MAX_WORDS_CHARS), autocomplete: 'off', autocapitalize: 'sentences',
      enterkeyhint: 'send', placeholder, 'aria-label': `Tell ${who} what's on your mind`,
    });
    const send = h('button', { class: 'hf-send', 'aria-label': 'Send', disabled: true }, icon('arrow'));
    const close = h('button', { class: 'hf-mini', 'aria-label': 'Close without sending', title: 'Close' }, icon('close'));
    const chips = h('div', { class: 'hf-chips', role: 'group', 'aria-label': ASK_FEELING },
      ...FEELINGS.map((f) => h('button', { class: 'hf-chip', 'aria-pressed': String(f.id === chosen), 'data-id': f.id, onclick: (e) => {
        chosen = chosen === f.id ? null : f.id;
        for (const c of chips.children) c.setAttribute('aria-pressed', String(c.dataset.id === chosen));
        e.currentTarget.blur?.();
        input.focus({ preventScroll: true });
      } }, f.label)));
    const box = h('form', { class: 'hf-tell', onsubmit: (e) => { e.preventDefault(); finish(true); } },
      h('div', { class: 'hf-tell-head' }, h('span', {}, ASK_FEELING, h('span', { class: 'opt' }, ' (optional)')), close),
      chips,
      h('div', { class: 'hf-tell-row' }, input, send),
      h('div', { class: 'hf-tell-note' }, 'Stays on this phone. You can use your keyboard’s mic.'));
    const wrap = h('div', { class: 'hf-tell-wrap' }, box);
    parent.append(wrap);
    requestAnimationFrame(() => wrap.classList.add('open'));
    setTimeout(() => input.focus({ preventScroll: true }), 60);
    input.addEventListener('input', () => { send.disabled = !input.value.trim(); });
    close.addEventListener('click', () => finish(false));
    const onKey = (e) => { if (e.key === 'Escape') finish(false); };
    document.addEventListener('keydown', onKey);
    function finish(ok) {
      const text = input.value.replace(/\s+/g, ' ').trim().slice(0, MAX_WORDS_CHARS);
      if (ok && !text) return;
      document.removeEventListener('keydown', onKey);
      input.blur();
      wrap.classList.remove('open');
      setTimeout(() => wrap.remove(), 320);
      resolve(ok ? { text, feeling: chosen || 'other', picked: !!chosen } : null);
    }
  });
}
