// SETTINGS — feel, reading, the Hushfold, privacy, plan. Everything lives on
// this device; there is no account.
import { h, iconBtn, openSheet, toast } from '../ui.js';
import { PLANS } from '../entitlements.js';
import { openSupport } from './support.js';
import { BUILD } from '../config.js';
import { RUNNING } from '../update.js';
import { type } from '../../ui/type.js';

const TEXT_SIZES = [[1, 'Standard'], [1.12, 'Larger'], [1.25, 'Largest']];
const SPEEDS = [[0.75, '0.75×'], [1, '1×'], [1.25, '1.25×'], [1.5, '1.5×']];

export default function settings(app) {
  const { prefs, ent, world, rec } = app;
  const note = (text) => h('small', { style: type('caption', { display: 'block', color: 'var(--text-3)', marginTop: '2px' }) }, text);
  const rowLabel = (label, sub) => h('div', { class: 'grow', style: type('row') }, label, sub ? note(sub) : null);
  const sw = (key, label, sub, after) => {
    const input = h('input', { type: 'checkbox', class: 'switch', 'aria-label': label });
    input.checked = !!prefs.get(key);
    input.addEventListener('change', () => { prefs.set(key, input.checked); app.haptic('light'); after?.(input.checked); });
    return h('label', { class: 'setting' }, rowLabel(label, sub), input);
  };
  /** A small segmented control: one pref, a few fixed values. */
  const segmented = (key, options, label) => {
    const group = h('div', { role: 'group', 'aria-label': label, style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' } });
    const draw = () => group.replaceChildren(...options.map(([v, l]) => h('button', {
      type: 'button', class: 'chip', 'aria-pressed': String(+prefs.get(key) === v), 'aria-label': `${label}: ${l}`,
      style: type('control', { minHeight: '44px', padding: '0 14px' }),
      onclick: () => { prefs.set(key, v); app.haptic('light'); draw(); },
    }, l)));
    draw();
    return group;
  };
  const motionSel = h('select', { class: 'search', style: type('input', { width: 'auto', minHeight: '44px' }), 'aria-label': 'Motion' },
    ...[['system', 'Match my phone'], ['reduced', 'Reduced'], ['full', 'Full']].map(([v, l]) => h('option', { value: v }, l)));
  motionSel.value = prefs.get('motion');
  motionSel.addEventListener('change', () => prefs.set('motion', motionSel.value));
  const vol = h('input', { type: 'range', class: 'range', min: 0, max: 1, step: 0.05, value: prefs.get('volume'), 'aria-label': 'Volume', style: { maxWidth: '150px' } });
  vol.addEventListener('change', () => prefs.set('volume', Number(vol.value)));

  const tierName = ent.tier() === 'none' ? 'No plan yet' : PLANS[ent.tier()].name + (ent.source() === 'test' ? ' (test)' : '');
  const section = (title) => h('h2', { class: 'eyebrow', style: { marginTop: '22px', marginBottom: '2px' } }, title);
  const sample = h('p', { style: type('subtitle', { margin: '12px 0 2px', color: 'var(--text-1)', textAlign: 'center', textWrap: 'balance' }) }, 'Something bothering you? Want to tell me?');
  // Another Angle (W8): share-my-words switch + "Delete my Another Angle data", only where they mean something
  const angleRows = h('div');
  Promise.all([import('../../beyond/consent.js'), import('../../beyond/endpoint.js')]).then(([c, a]) => {
    const endpoint = a.resolveEndpoint();
    if (endpoint || c.hasAngleData(app.store)) c.mountAngleSettings(app, angleRows, { endpoint });
  }).catch(() => {});

  const el = h('div', { class: 'settings', style: { display: 'flex', flexDirection: 'column', height: '100%' } },
    h('div', { class: 'topbar' }, iconBtn('back', 'Back', () => app.back()), h('div', { class: 'grow' })),
    h('div', { class: 'card', style: { marginTop: '12px', overflowY: 'auto', maxHeight: 'calc(100dvh - 110px)' } },
      h('h1', { class: 't-screen-title', style: { margin: 0 } }, 'Settings'),

      section('Reading'),
      h('div', { class: 'setting', style: { display: 'block' } }, rowLabel('Text size', 'Every word in the app, subtitles included'), segmented('textScale', TEXT_SIZES, 'Text size'), sample),
      h('div', { class: 'setting', style: { display: 'block' } }, rowLabel('Subtitle speed', 'How long each Mallow line stays. You can also pause, replay or skip any line.'), segmented('subtitleSpeed', SPEEDS, 'Subtitle speed')),

      section('The Hushfold'),
      sw('autoFlow', 'Auto-flow', 'When a world is complete, the next one begins by itself. Off: you choose when.'),

      section('Feel'),
      sw('sound', 'Sound', 'Mallow voices, world sounds and ambience'),
      h('div', { class: 'setting' }, rowLabel('Volume'), vol),
      sw('haptics', 'Haptics', 'Gentle taps and buzzes. On iPhone this needs the App Store app.'),
      h('div', { class: 'setting' }, rowLabel('Motion', 'Reduced keeps everything, with calmer movement'), motionSel),
      sw('lowStim', 'Low stimulation', 'Softer visuals and fewer sparkles'),

      section('Privacy'),
      sw('saveHistory', 'Remember what I played', 'Rituals and worlds, how they felt and where you paused. Never your words or photos.'),
      sw('saveWords', 'Keep my saved angles', `${PLANS.ultra?.name || 'hushmallow Beyond'} only. Stored on this phone, never uploaded.`),
      angleRows,
      h('button', { class: 'btn block', style: { marginTop: '12px' }, onclick: () => confirmClear() }, 'Delete everything on this phone'),

      section('Plan'),
      h('div', { class: 'setting' }, rowLabel(tierName), h('button', { class: 'btn', style: { minHeight: '44px' }, onclick: () => app.go('plans') }, 'View plans')),
      ent.source() === 'test' ? h('button', { class: 'btn ghost block', onclick: () => { ent.cancelTest(); toast('Test plan removed'); app.go('home'); } }, 'Remove test plan') : null,

      section('About'),
      h('p', { style: type('body', { color: 'var(--text-2)', margin: '8px 0 0' }) },
        'Every Mallow line, world and ritual in ', h('span', { class: 'brand-name' }, 'hushmallow'), ' is written in advance, and feelings are matched with fixed word lists: you always choose what fits. Nothing you type or add leaves this phone. The one exception is Another Angle in ',
        PLANS.ultra?.name || 'hushmallow Beyond', ': only after you say yes, your words go to our server, where an outside service prepares the perspectives you see. It’s a wellbeing app, not a medical service.'),
      h('button', { class: 'btn ghost block', onclick: () => openSupport(app) }, 'Support lines'),
      h('p', { style: type('caption', { color: 'var(--text-3)', textAlign: 'center', margin: '8px 0 0' }) }, `Version ${BUILD}${RUNNING ? ` · ${RUNNING}` : ''}`),
      // developer tools: not part of the published site
      ['localhost', '127.0.0.1'].includes(location.hostname)
        ? h('div', { style: { display: 'grid', gap: '4px', marginTop: '6px' } },
          h('a', { class: 'btn ghost block', href: './studio.html', style: { textDecoration: 'none' } }, 'Mallow Emotion Studio'),
          h('button', { class: 'btn ghost block', onclick: () => app.go('classic') }, 'Classic home (QA)')) : null));

  function confirmClear() {
    const s = openSheet({ title: 'Delete everything?', body: h('p', { style: type('body', { margin: 0, color: 'var(--text-2)' }) }, 'This removes your favourites, history, saved angles, Memory Garden, saved worlds and settings from this phone. Your subscription isn’t affected.'),
      foot: h('div', { class: 'row-btns' }, h('button', { class: 'btn', onclick: () => s.close() }, 'Cancel'),
        h('button', { class: 'btn primary', onclick: () => { const keep = app.store.get('entitlement', null); app.store.clearAll(); if (keep) app.store.set('entitlement', keep); prefs.reset(); rec.clearAll(); s.close(); toast('Deleted'); app.go('home'); } }, 'Delete')) });
  }

  // the card fills the screen, so the Mallow rests out of sight (not half-hidden behind its corner)
  return { el, title: 'Settings', enter() { world.dim(true); world.showMallow(false); world.setStage('resting'); }, leave() { world.showMallow(true); } };
}
