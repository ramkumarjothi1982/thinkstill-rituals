// FEATURE 1 — Mallow TouchTalk: touch becomes communication.
// Every gesture is recognised by the Gesture Engine and answered by the
// Mallow's personality through face, body, physics and voice. A gesture tray
// offers the same conversation without precise touch or multitouch.

import { h, holdButton } from '../lab-ui.js';
import { stageScreen } from './stage-screen.js';

export const meta = { id: 'touchtalk', title: 'Mallow TouchTalk' };

export function mount(root, ctx) {
  let hint;
  const s = stageScreen(root, ctx, {
    title: 'TouchTalk', material: 'marshmallow',
    floorMax: 0.76,   // the hint-only layout keeps the Mallow nearer the middle (still room above to stretch)
    onEvent: () => hint?.classList.add('gone'),
  });
  const c = s.companion;
  hint = h('p', { class: 'hint tt-hint' }, h('b', {}, 'Tap'), ' · ', h('b', {}, 'Hold'), ' · ', h('b', {}, 'Stroke'), ' · ', h('b', {}, 'Pinch'), ' · ', h('b', {}, 'Drag'));
  const tray = h('div', { class: 'chips wrap tt-tray', role: 'group', 'aria-label': 'Gestures without touch', hidden: true },
    h('button', { type: 'button', class: 'chip', onclick: () => c.act('tap') }, 'Tap'),
    h('button', { type: 'button', class: 'chip', onclick: () => c.act('double') }, 'Double tap'),
    holdButton('Hold', () => c.act('holdStart'), () => c.act('holdEnd')),
    h('button', { type: 'button', class: 'chip', onclick: () => c.act('stroke') }, 'Stroke'),
    holdButton('Squeeze', () => c.act('squeezeStart'), () => c.act('squeezeEnd')),
    h('button', { type: 'button', class: 'chip', onclick: () => c.act('stretch') }, 'Stretch'));
  const toggle = h('button', { type: 'button', class: 'chip toggle', 'aria-pressed': 'false', 'aria-label': 'Show gesture buttons',
    onclick: () => {
      const show = tray.hidden;
      tray.hidden = !show;
      toggle.setAttribute('aria-pressed', String(show));
      toggle.textContent = show ? 'Hide buttons' : 'Use buttons';
    } }, 'Use buttons');
  s.bottom.append(hint, tray, toggle);
  return { unmount: s.unmount };
}
