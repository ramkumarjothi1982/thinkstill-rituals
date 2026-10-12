// Support — always free, always one tap away. hushmallow is not a crisis
// service; this points people to real humans.
import { h, openSheet } from '../ui.js';

export const SUPPORT_LINES = [
  { where: 'Anywhere', name: 'Emergency services', how: 'Call your local emergency number (e.g. 999, 911, 112)' },
  { where: 'Worldwide', name: 'Find A Helpline', how: 'findahelpline.com — free, confidential lines in your country', url: 'https://findahelpline.com' },
  { where: 'UK & Ireland', name: 'Samaritans', how: 'Call 116 123, any time', tel: '116123' },
  { where: 'US', name: '988 Suicide & Crisis Lifeline', how: 'Call or text 988', tel: '988' },
];

export function openSupport(app, { urgent = false } = {}) {
  app.world?.setStage?.('comforting');
  const body = h('div', {},
    h('p', { style: { margin: '0 0 12px', fontSize: 'var(--type-body)', lineHeight: '1.45' } }, urgent
      ? 'What you wrote sounds really heavy. You deserve to talk to a real person right now. If you might act on thoughts of hurting yourself, please contact emergency services or a crisis line.'
      : 'If things feel like too much, talking to a real person can help. These are free and confidential.'),
    ...SUPPORT_LINES.map((l) => h('div', { class: 'card', style: { padding: '14px', marginTop: '10px', boxShadow: 'none' } },
      h('div', { class: 'eyebrow' }, l.where),
      h('h3', { style: { fontSize: '18px', marginTop: '6px' } }, l.name),
      h('p', {}, l.how),
      l.tel ? h('a', { class: 'btn primary', style: { marginTop: '10px', textDecoration: 'none' }, href: `tel:${l.tel}` }, `Call ${l.tel}`) : null,
      l.url ? h('a', { class: 'btn', style: { marginTop: '10px', textDecoration: 'none' }, href: l.url, target: '_blank', rel: 'noopener' }, 'Open') : null)),
    h('p', { class: 'muted', style: { marginTop: '14px' } }, 'hushmallow is a wellbeing app, not a medical or crisis service. The Mallows care, but they can’t replace people who can be there with you.'));
  return openSheet({ title: urgent ? 'You’re not alone in this' : 'Support', body, label: 'Support lines',
    foot: h('button', { class: 'btn block', onclick: (e) => e.currentTarget.closest('.sheet').querySelector('.icon-btn').click() }, urgent ? 'I’m safe — continue' : 'Close') });
}
