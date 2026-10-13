// Placeholder while the deleted scene is rebuilt.
import { h } from '../dom.js';
export function deleted(device) {
  return { el: h('div', { class: 'hm-scene' }, h('div', { class: 'hm-scroll' }, h('p', { class: 'kit-lede', style: { paddingTop: '80px' } }, 'deleted: being rebuilt'), h('button', { type: 'button', class: 'kit-btn kit-btn--ghost', onclick: () => device.back() }, 'Back'))), mood: 'day' };
}
