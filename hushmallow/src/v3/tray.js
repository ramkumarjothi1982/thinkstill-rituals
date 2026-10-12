// Photo tray: add up to 7 photos, tap one to replace it, × to remove it.
// Shown on the "What's happening" screen (and in the test panel).
import { h } from '../app/ui.js';
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
    else await photoSession.add(files);
  });
  function pick(id = null) { replaceId = id; input.multiple = id == null; input.click(); }
  function render() {
    const list = photoSession.list;
    count.textContent = `${list.length}/${MAX_PHOTOS}`;
    tray.replaceChildren(...list.map((p, i) => h('div', { class: 'ph', role: 'listitem' },
      h('button', { class: 'swap', 'aria-label': `Photo ${i + 1}. Tap to replace it.`, onclick: () => pick(p.id) }, photoSession.thumb(p, 64)),
      h('button', { class: 'x', 'aria-label': `Remove photo ${i + 1}`, onclick: () => photoSession.remove(p.id) }, '×'))),
    list.length < MAX_PHOTOS ? h('button', { class: 'add', 'aria-label': list.length ? 'Add more photos' : 'Add photos', onclick: () => pick() }, '+') : null);
  }
  const off = photoSession.onChange(render);
  render();
  const el = h('div', { class: 'photo-block' },
    h('div', { class: 'photo-head' }, h('span', {}, 'Add photos (optional)'), count),
    tray, input,
    note ? h('p', { class: 'muted photo-note' }, 'People, places, screenshots, things — up to 7. They become part of your ritual, stay only on this phone, and are cleared afterwards. Never uploaded or shared.') : null);
  return { el, destroy: off };
}
