// The compact Hushflow panel: switch feeling or intention, Auto-flow,
// reading speed, stay in this world, favourite, photos, Memory Garden,
// finish — plus the way out to everything else in the app. It slides in
// from the side and play carries on behind it.

import { h, icon } from '../app/ui.js';
import { FEELINGS, INTENTIONS } from './data/lines.js';
import { photoSession, MAX_PHOTOS } from '../v3/photos.js';

export function openPanel(root, o) {
  const st = { ...o.state };
  const seg = (items, cur, onPick, label) => {
    const g = h('div', { class: 'hf-chips wrap', role: 'group', 'aria-label': label },
      ...items.map((it) => h('button', { class: 'hf-chip', 'aria-pressed': String(it.id === cur), 'data-id': it.id, onclick: () => {
        for (const c of g.children) c.setAttribute('aria-pressed', String(c.dataset.id === it.id));
        onPick(it.id);
      } }, it.label)));
    return g;
  };
  const toggle = (label, on, fn, hint) => {
    const input = h('input', { type: 'checkbox', class: 'switch', checked: on || null, 'aria-label': label, onchange: (e) => fn(e.target.checked) });
    return h('label', { class: 'hf-row' }, h('span', {}, label, hint ? h('small', {}, hint) : null), input);
  };

  // photos: optional, in memory only, removable one by one
  const tray = h('div', { class: 'hf-photos' });
  const file = h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true, onchange: async (e) => { await photoSession.add(e.target.files); e.target.value = ''; drawTray(); o.onPhotos?.(); } });
  function drawTray() {
    tray.replaceChildren(...[
      ...photoSession.list.map((p) => h('div', { class: 'hf-photo' }, photoSession.thumb(p, 52),
        h('button', { class: 'hf-x', 'aria-label': 'Remove this photo', onclick: () => { photoSession.remove(p.id); drawTray(); o.onPhotos?.(); } }, icon('close')))),
      photoSession.count < MAX_PHOTOS ? h('button', { class: 'hf-photo add', 'aria-label': 'Add photos', onclick: () => file.click() }, icon('camera')) : null].filter(Boolean));
  }
  drawTray();

  const body = h('div', { class: 'hf-panel-body' },
    h('div', { class: 'eyebrow' }, 'How are you feeling?'),
    seg(FEELINGS, st.feeling, (id) => o.onFeeling(id), 'How are you feeling?'),
    h('div', { class: 'eyebrow' }, 'What would help?'),
    seg(INTENTIONS, st.intention, (id) => o.onIntention(id), 'What would help?'),
    h('div', { class: 'hf-sep' }),
    toggle('Auto-flow', st.autoflow, (v) => o.onAutoflow(v), 'Move to the next world by itself'),
    o.inWorld ? toggle('Stay in this world', st.stay, (v) => o.onStay(v)) : null,
    o.inWorld ? toggle('Favourite world', st.favourite, (v) => o.onFavourite(v)) : null,
    h('div', { class: 'eyebrow' }, 'Subtitle speed'),
    seg([{ id: '0.7', label: 'Slower' }, { id: '1', label: 'Normal' }, { id: '1.4', label: 'Faster' }], String(st.speed), (v) => o.onSpeed(Number(v)), 'Subtitle speed'),
    h('div', { class: 'eyebrow' }, `Your photos (optional, up to ${MAX_PHOTOS})`),
    tray, file,
    h('p', { class: 'hf-note' }, 'Photos stay in memory on this phone and are forgotten when you close Hushmallow.'),
    h('div', { class: 'hf-sep' }),
    h('button', { class: 'hf-row-btn', onclick: () => { close(); o.onGarden(); } }, icon('leaf'), 'Memory Garden'),
    o.inWorld ? h('button', { class: 'hf-row-btn', onclick: () => { close(); o.onFinish(); } }, icon('close'), 'Finish for now') : null,
    h('div', { class: 'hf-sep' }),
    h('div', { class: 'eyebrow' }, 'More'),
    h('button', { class: 'hf-row-btn', onclick: () => { close(); o.onMore('angle'); } }, icon('sparkle'), 'Another Angle', h('span', { class: 'hf-badge' }, 'Beyond')),
    h('button', { class: 'hf-row-btn', onclick: () => { close(); o.onMore('rituals'); } }, icon('library'), 'Rituals and library'),
    h('button', { class: 'hf-row-btn', onclick: () => { close(); o.onMore('plans'); } }, icon('star'), o.tierLabel),
    h('button', { class: 'hf-row-btn', onclick: () => { close(); o.onMore('settings'); } }, icon('gear'), 'Settings'));
  const panel = h('aside', { class: 'hf-panel', role: 'dialog', 'aria-label': 'Hushflow settings' },
    h('div', { class: 'hf-panel-head' }, h('strong', {}, 'Hushflow'), h('button', { class: 'hf-mini', 'aria-label': 'Close', onclick: () => close() }, icon('close'))),
    body);
  const scrim = h('div', { class: 'hf-scrim', onclick: () => close() });
  root.append(scrim, panel);
  requestAnimationFrame(() => { scrim.classList.add('open'); panel.classList.add('open'); });
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  setTimeout(() => panel.querySelector('.hf-mini')?.focus(), 300);
  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey);
    scrim.classList.remove('open'); panel.classList.remove('open');
    setTimeout(() => { scrim.remove(); panel.remove(); }, 360);
    o.onClose?.();
  }
  return { close };
}
