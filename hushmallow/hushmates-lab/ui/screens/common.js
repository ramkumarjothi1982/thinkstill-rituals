import { h, icon, avatar, testTag } from '../dom.js';

export function header(device, { title, back = true, actions = [], sub = null }) {
  return h('header', { class: 'hm-header' },
    back ? h('button', { class: 'hm-icon-btn', 'aria-label': 'Back', onclick: () => device.back(), dataset: { test: 'back' } }, icon('back')) : null,
    h('div', { class: 'hm-header__title' }, h('h1', { class: 'hm-h1' }, title), sub ? h('p', { class: 'hm-header__sub' }, sub) : null),
    ...actions);
}

export function body(...kids) { return h('div', { class: 'hm-body' }, ...kids); }

export function section(title, ...kids) {
  return h('section', { class: 'hm-section' }, title ? h('h2', { class: 'hm-h2' }, title) : null, ...kids);
}

export function personLine(p, { size = 48, extra = null } = {}) {
  return h('div', { class: 'hm-person' }, avatar(p.avatar, { size, label: `${p.pseudonym}’s Mallow` }),
    h('div', { class: 'hm-person__text' },
      h('div', { class: 'hm-person__name' }, h('span', {}, p.pseudonym), p.test ? testTag() : null),
      extra));
}

export function empty({ title, text, action }) {
  return h('div', { class: 'hm-empty' }, h('p', { class: 'hm-empty__title' }, title), text ? h('p', { class: 'hm-p hm-muted' }, text) : null, action);
}

export function labFoot() {
  return h('p', { class: 'hm-labfoot' }, 'Prototype · simulated test identities · local demo service, not a production backend');
}
