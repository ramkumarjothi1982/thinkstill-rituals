// FEATURE 4 — SoftBody Lab: a premium living squishy.
// The Mallow's approved artwork is a real XPBD spring mesh (see
// core/softbody.js). Five materials change its physics — stiffness, damping,
// compressibility, stretch and buoyancy — and its sound. The mesh toggle shows
// the deforming mesh itself, so it is visibly not a scaled picture.

import { h, holdButton, iconBtn } from '../lab-ui.js';
import { stageScreen } from './stage-screen.js';
import { MATERIALS, MATERIAL_IDS } from '../core/materials.js';

export const meta = { id: 'softbody', title: 'SoftBody Lab' };

export function mount(root, ctx) {
  let mat = MATERIALS[ctx.prefs.get('material')] ? ctx.prefs.get('material') : 'marshmallow';
  const meshBtn = iconBtn('mesh', 'Show the soft-body mesh', () => {
    const on = !ctx.prefs.get('showMesh');
    ctx.prefs.set('showMesh', on);
    meshBtn.setAttribute('aria-pressed', String(on));
    s.companion.setShowMesh(on);
  }, { 'aria-pressed': String(!!ctx.prefs.get('showMesh')) });
  const s = stageScreen(root, ctx, { title: 'SoftBody Lab', subtitle: MATERIALS[mat].label, material: mat, extraButtons: [meshBtn] });
  const c = s.companion;
  const blurb = h('p', { class: 'blurb' }, MATERIALS[mat].blurb);
  const sub = s.screen.querySelector('.title small');
  const chips = h('div', { class: 'chips', role: 'radiogroup', 'aria-label': 'Material' },
    ...MATERIAL_IDS.map((id) => h('button', {
      type: 'button', class: 'chip', role: 'radio', 'aria-checked': String(id === mat), 'data-material': id,
      onclick: (e) => {
        mat = id;
        ctx.prefs.set('material', id);
        c.setMaterial(id);
        for (const b of chips.children) b.setAttribute('aria-checked', String(b.dataset.material === id));
        blurb.textContent = MATERIALS[id].blurb;
        sub.textContent = MATERIALS[id].label;
        // a little demonstration wobble so the change is felt immediately
        ctx.sound.unlock();
        c.act('tap');
        e.currentTarget.scrollIntoView?.({ inline: 'nearest', block: 'nearest' });
      },
    }, MATERIALS[id].label)));
  const actions = h('div', { class: 'chips', role: 'group', 'aria-label': 'Squish without touch' },
    holdButton('Squish', () => c.act('squeezeStart'), () => c.act('squeezeEnd')),
    h('button', { type: 'button', class: 'chip', onclick: () => c.act('stretch') }, 'Stretch'),
    h('button', { type: 'button', class: 'chip', onclick: () => c.act('tap') }, 'Poke'));
  s.bottom.append(blurb, chips, actions);
  return { unmount: s.unmount };
}
