// Photo tray: add up to seven photos, tap one to replace it, × to remove it.
// Shown on the "What's happening" screen. With none, the seven Mallows take
// the photos' place in the ritual.
import { h, icon, toast } from '../app/ui.js';
import { photoSession, MAX_PHOTOS } from './photos.js';

export function photoTray({ note = true } = {}) {
  const tray = h('div', { class: 'photo-tray', role: 'list', 'aria-label': 'Your photos for the ritual' });
  const count = h('span', { class: 'muted' });
  const input = h('input', { type: 'file', accept: 'image/*', multiple: true, 'aria-hidden': 'true', tabindex: '-1', style: { position: 'absolute', width: '1px', height: '1px', opacity: '0', pointerEvents: 'none' } });
  let replaceId = null;
  input.addEventListener('change', async () => {
    const files = [...(input.files || [])];
    input.value = '';
    if (!files.length) return;
    if (replaceId != null) { await photoSession.replace(replaceId, files[0]); replaceId = null; }
    else tellIfFull(files.length, await photoSession.add(files));
  });
  function pick(id = null) { replaceId = id; input.multiple = id == null; input.click(); }
  function render() {
    const list = photoSession.list;
    count.textContent = `${list.length}/${MAX_PHOTOS}`;
    const add = list.length === 0 ? h('button', { class: 'add wide', onclick: () => pick() }, icon('camera'), h('span', {}, 'Add photos'))
      : list.length < MAX_PHOTOS ? h('button', { class: 'add', 'aria-label': 'Add more photos', onclick: () => pick() }, '+') : null;
    // a full tray has no add button (and must not show a stray "null")
    tray.replaceChildren(...[...list.map((p, i) => h('div', { class: 'ph', role: 'listitem' },
      h('button', { class: 'swap', 'aria-label': `Photo ${i + 1}. Tap to replace it.`, onclick: () => pick(p.id) }, photoSession.thumb(p, 64)),
      h('button', { class: 'x', 'aria-label': `Remove photo ${i + 1}`, onclick: () => photoSession.remove(p.id) }, '×'))), add].filter(Boolean));
  }
  const off = photoSession.onChange(render);
  render();
  const el = h('div', { class: 'photo-block' },
    h('div', { class: 'photo-head' }, h('span', {}, 'Add photos (optional)'), count),
    tray, input,
    note ? h('p', { class: 'muted photo-note' }, 'People, places, screenshots, things — up to seven. They become part of your ritual, stay only on this phone, and are cleared afterwards. Never uploaded or shared. No photos? The seven Mallows play the part instead.') : null);
  return { el, destroy: off };
}

/** Say so when some picked photos didn't fit (seven is the limit). */
export function tellIfFull(picked, added) {
  if (picked <= added || photoSession.count < MAX_PHOTOS) return;
  toast(added ? `Up to seven photos fit, so ${added === 1 ? 'one was' : `${countWord(added)} were`} added.` : 'You already have seven photos. Remove one to add another.', 3200);
}

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'];
/** 1 → 'one' … 7 → 'seven' (photo counts in copy are words). */
export function countWord(n) {
  return WORDS[n] ?? String(n);
}
