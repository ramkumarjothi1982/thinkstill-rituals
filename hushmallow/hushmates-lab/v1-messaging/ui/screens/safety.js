// Placeholder while the safety scene is rebuilt.
import { h } from '../dom.js';
export function safety(device) {
  return { el: h('div', { class: 'hm-scene' }, h('div', { class: 'hm-scroll' }, h('p', { class: 'kit-lede', style: { paddingTop: '80px' } }, 'safety: being rebuilt'), h('button', { type: 'button', class: 'kit-btn kit-btn--ghost', onclick: () => device.back() }, 'Back'))), mood: 'day' };
}
