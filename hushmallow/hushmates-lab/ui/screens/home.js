// Placeholder while the home scene is rebuilt.
import { h } from '../dom.js';
export function home(device) {
  return { el: h('div', { class: 'hm-scene' }, h('div', { class: 'hm-scroll' }, h('p', { class: 'kit-lede', style: { paddingTop: '80px' } }, 'home: being rebuilt'), h('button', { type: 'button', class: 'kit-btn kit-btn--ghost', onclick: () => device.back() }, 'Back'))), mood: 'day' };
}
