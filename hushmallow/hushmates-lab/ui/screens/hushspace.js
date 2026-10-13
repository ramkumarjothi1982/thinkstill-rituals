// Placeholder while the Hushspace scene is rebuilt (previous version: hushspace.old.js, reference only).
import { h } from '../dom.js';
export function hushspace(device) {
  return { el: h('div', { class: 'hm-scene' }, h('div', { class: 'hm-scroll' }, h('p', { class: 'kit-lede', style: { paddingTop: '80px' } }, 'hushspace: being rebuilt'), h('button', { type: 'button', class: 'kit-btn kit-btn--ghost', onclick: () => device.back() }, 'Back'))), mood: 'hush' };
}
