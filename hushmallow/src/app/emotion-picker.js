// Every feeling, A–Z: the searchable explorer from the express screen,
// shared so the Hushfold's "Something else" chips open the same list.
//
// openEmotionPicker({ selected, multi, title, onPick, onClose }) → sheet
//   multi:false  one tap picks a feeling and closes (the Hushfold chips)
//   multi:true   tap to toggle; Done closes (the express screen's behaviour)
// It only ever lists authored feelings (data/emotions.js); nothing is guessed.

import { h, openSheet } from './ui.js';
import { FAMILIES, searchEmotions, azIndex, EMOTIONS } from '../data/emotions.js';

export function openEmotionPicker({ selected = [], multi = false, title = 'Every feeling, A–Z', onPick, onClose } = {}) {
  const sel = new Set(selected);
  const search = h('input', { class: 'search', type: 'search', placeholder: 'Search feelings (try “betrayed” or “fomo”)', 'aria-label': 'Search feelings', autofocus: true, enterkeyhint: 'search' });
  let fam = null;
  let sheet = null;
  const famRow = h('div', { class: 'fam-chips', role: 'group', 'aria-label': 'Feeling families' },
    h('button', { class: 'chip', 'aria-pressed': 'true', onclick: (e) => setFam(null, e.currentTarget) }, 'All'),
    ...FAMILIES.map((f) => h('button', { class: 'chip', 'aria-pressed': 'false', onclick: (e) => setFam(f.id, e.currentTarget) }, h('span', { class: 'hue', style: { background: f.hue } }), f.name)));
  const list = h('div', { role: 'list' });
  const row = (e) => h('button', {
    class: 'emo-row', role: 'listitem', 'aria-pressed': String(sel.has(e.id)),
    onclick: (ev) => {
      if (!multi) { sel.clear(); sel.add(e.id); onPick?.(e.id); sheet?.close('pick'); return; }
      if (sel.has(e.id)) sel.delete(e.id); else sel.add(e.id);
      ev.currentTarget.setAttribute('aria-pressed', String(sel.has(e.id)));
      onPick?.(e.id, sel.has(e.id));
    },
  }, h('div', {}, h('div', { class: 'n' }, e.name), h('div', { class: 'b' }, e.blurb)), h('span', { class: 'tick', 'aria-hidden': 'true' }, '✓'));
  function draw() {
    const q = search.value.trim();
    if (q) { list.replaceChildren(...searchEmotions(q, { limit: 40 }).filter((e) => !fam || e.family === fam).map(row)); return; }
    const groups = azIndex().map((g) => ({ ...g, emotions: g.emotions.filter((e) => !fam || e.family === fam || (e.also || []).includes(fam)) })).filter((g) => g.emotions.length);
    list.replaceChildren(...groups.flatMap((g) => [h('div', { class: 'az-letter' }, g.letter), ...g.emotions.map(row)]));
  }
  function setFam(f, btn) { fam = f; famRow.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === btn))); draw(); }
  search.addEventListener('input', draw);
  draw();
  sheet = openSheet({
    title, full: true, label: title,
    body: h('div', {}, search, famRow, h('p', { class: 'muted', style: { margin: '2px 0 6px' } }, `${EMOTIONS.length} feelings and growing. ${multi ? 'Pick as many as fit.' : 'Pick the one that fits best.'}`), list),
    foot: h('button', { class: 'btn primary block', onclick: () => sheet.close('done') }, multi ? 'Done' : 'Close'),
    onClose: (reason) => onClose?.([...sel], reason),
  });
  return sheet;
}
