// SETTINGS — sound, haptics, motion, privacy, plan. Everything lives on this
// device; there is no account and no server.
import { h, iconBtn, openSheet, toast } from '../ui.js';
import { PLANS } from '../entitlements.js';
import { openSupport } from './support.js';
import { BUILD } from '../config.js';
import { RUNNING } from '../update.js';

export default function settings(app) {
  const { prefs, ent, world, rec } = app;
  const sw = (key, label, note, after) => {
    const input = h('input', { type: 'checkbox', class: 'switch', 'aria-label': label });
    input.checked = !!prefs.get(key);
    input.addEventListener('change', () => { prefs.set(key, input.checked); app.haptic('light'); after?.(input.checked); });
    return h('label', { class: 'setting' }, h('div', { class: 'grow' }, label, note ? h('small', {}, note) : null), input);
  };
  const motionSel = h('select', { class: 'search', style: { width: 'auto', minHeight: '40px' }, 'aria-label': 'Motion' },
    ...[['system', 'Match my phone'], ['reduced', 'Reduced'], ['full', 'Full']].map(([v, l]) => h('option', { value: v }, l)));
  motionSel.value = prefs.get('motion');
  motionSel.addEventListener('change', () => prefs.set('motion', motionSel.value));
  const vol = h('input', { type: 'range', class: 'range', min: 0, max: 1, step: 0.05, value: prefs.get('volume'), 'aria-label': 'Volume', style: { maxWidth: '140px' } });
  vol.addEventListener('change', () => prefs.set('volume', Number(vol.value)));

  const tierName = ent.tier() === 'none' ? 'No plan yet' : PLANS[ent.tier()].name + (ent.source() === 'test' ? ' (test)' : '');

  const el = h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%' } },
    h('div', { class: 'topbar' }, iconBtn('back', 'Back', () => app.back()), h('div', { class: 'grow' })),
    h('div', { class: 'card', style: { marginTop: '12px', overflowY: 'auto', maxHeight: 'calc(100dvh - 110px)' } },
      h('h1', { class: 'title', style: { fontSize: 'var(--type-world)' } }, 'Settings'),
      h('div', { class: 'eyebrow', style: { marginTop: '16px' } }, 'Feel'),
      sw('sound', 'Sound', 'Mallow voices, ritual sounds, realm ambience'),
      h('div', { class: 'setting' }, h('div', { class: 'grow' }, 'Volume'), vol),
      sw('haptics', 'Haptics', 'Gentle taps and buzzes. On iPhone this needs the App Store app.'),
      h('div', { class: 'setting' }, h('div', { class: 'grow' }, 'Motion', h('small', {}, 'Reduced keeps every ritual, with calmer movement')), motionSel),
      sw('lowStim', 'Low stimulation', 'Softer visuals and fewer sparkles'),
      h('div', { class: 'eyebrow', style: { marginTop: '18px' } }, 'Privacy'),
      sw('saveHistory', 'Remember which rituals I did', 'Ritual names and how it felt. Never your words.'),
      sw('saveWords', 'Keep my saved angles', 'Beyond only. Stored on this phone, never uploaded.'),
      h('button', { class: 'btn block', style: { marginTop: '12px' }, onclick: () => confirmClear() }, 'Delete everything on this phone'),
      h('div', { class: 'eyebrow', style: { marginTop: '18px' } }, 'Plan'),
      h('div', { class: 'setting' }, h('div', { class: 'grow' }, tierName), h('button', { class: 'btn', style: { minHeight: '40px' }, onclick: () => app.go('plans') }, 'View plans')),
      ent.source() === 'test' ? h('button', { class: 'btn ghost block', onclick: () => { ent.cancelTest(); toast('Test plan removed'); app.go('home'); } }, 'Remove test plan') : null,
      h('div', { class: 'eyebrow', style: { marginTop: '18px' } }, 'About'),
      h('p', { class: 'muted' }, 'Hushmallow uses no AI and no chatbots. Feelings are matched with fixed word lists you confirm yourself, and every ritual and line is written in advance — nothing is generated while you use it. It’s a wellbeing app, not a medical service.'),
      h('button', { class: 'btn ghost block', onclick: () => openSupport(app) }, 'Support lines'),
      h('p', { class: 'muted', style: { textAlign: 'center', fontSize: 'var(--type-label)', margin: '8px 0 0' } }, `Version ${BUILD}${RUNNING ? ` · ${RUNNING}` : ''}`),
      // developer tool: not part of the published site
      ['localhost', '127.0.0.1'].includes(location.hostname)
        ? h('a', { class: 'btn ghost block', href: './studio.html', style: { textDecoration: 'none' } }, 'Mallow Emotion Studio') : null));

  function confirmClear() {
    const s = openSheet({ title: 'Delete everything?', body: h('p', { style: { margin: 0, color: 'var(--text-2)' } }, 'This removes your favourites, history, saved angles and settings from this phone. Your subscription isn’t affected.'),
      foot: h('div', { class: 'row-btns' }, h('button', { class: 'btn', onclick: () => s.close() }, 'Cancel'),
        h('button', { class: 'btn primary', onclick: () => { const keep = app.store.get('entitlement', null); app.store.clearAll(); if (keep) app.store.set('entitlement', keep); prefs.reset(); rec.clearAll(); s.close(); toast('Deleted'); app.go('home'); } }, 'Delete')) });
  }

  return { el, title: 'Settings', enter() { world.dim(true); world.place({ x: 82, y: 10, scale: 0.32 }); world.setStage('resting'); } };
}
