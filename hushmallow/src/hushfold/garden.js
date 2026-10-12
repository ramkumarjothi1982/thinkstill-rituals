// The Memory Garden: saved tools, and the little installation that carries a
// new one there. The installation is a metaphor for remembering a skill you
// just used — never a claim that anything was rewired.

import { h, icon, openSheet } from '../app/ui.js';
import { SKILLS, skillById } from './data/skills.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** A charm element for a skill (CSS-drawn, no images). */
export function charm(skill, size = 64) {
  const c = skill.charm;
  return h('div', { class: `hf-charm shape-${c.shape}`, style: { width: `${size}px`, height: `${size}px`, '--c': c.colour, '--g': c.glow } },
    h('i'), h('b'));
}

/**
 * Play the installation: ripple above `from` → charm forms → flies through a
 * portal to `to` (the garden button) → "NEW TOOL SAVED" card that stays until
 * acknowledged. Play continues underneath the whole time.
 */
export async function installSkill(root, skillId, { from, to, reduced = false, audio = null, haptic = null, onOpen = null } = {}) {
  const skill = skillById(skillId);
  if (!skill) return;
  const layer = h('div', { class: 'hf-install', 'aria-hidden': 'true' });
  root.append(layer);
  const fx = from || { x: innerWidth / 2, y: innerHeight * 0.4 };
  const tr = to?.getBoundingClientRect?.() || { left: innerWidth - 60, top: 20, width: 44, height: 44 };
  const tx = tr.left + tr.width / 2, ty = tr.top + tr.height / 2;
  audio?.fx?.('shimmer', { intensity: 0.5 });
  if (!reduced) {
    // 1. a luminous ripple gathers into the charm
    const ring = h('div', { class: 'hf-ripple', style: { left: `${fx.x}px`, top: `${fx.y}px` } });
    layer.append(ring);
    ring.animate([{ transform: 'translate(-50%,-50%) scale(2.4)', opacity: 0 }, { opacity: 0.9, offset: 0.35 }, { transform: 'translate(-50%,-50%) scale(0.2)', opacity: 0 }], { duration: 900, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' });
    await wait(700);
  }
  const ch = charm(skill, 58);
  ch.classList.add('flying');
  ch.style.left = `${fx.x}px`; ch.style.top = `${fx.y}px`;
  layer.append(ch);
  if (reduced) {
    ch.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], { duration: 1200, fill: 'forwards' });
    await wait(1200);
  } else {
    ch.animate([{ transform: 'translate(-50%,-50%) scale(0)' }, { transform: 'translate(-50%,-50%) scale(1.25)' }, { transform: 'translate(-50%,-50%) scale(1)' }], { duration: 520, easing: 'cubic-bezier(.2,1.6,.4,1)', fill: 'forwards' });
    haptic?.('pop');
    await wait(650);
    // 2. the portal opens by the garden button
    const portal = h('div', { class: 'hf-portal', style: { left: `${tx}px`, top: `${ty}px` } });
    layer.append(portal);
    portal.animate([{ transform: 'translate(-50%,-50%) scale(0) rotate(0deg)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1) rotate(200deg)', opacity: 1 }], { duration: 520, easing: 'ease-out', fill: 'forwards' });
    audio?.fx?.('portal', { intensity: 0.5 });
    await wait(260);
    // 3. the charm arcs into it
    const mx = (fx.x + tx) / 2 - 60, my = Math.min(fx.y, ty) - 90;
    const pts = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t;
      pts.push({ transform: `translate(${a * fx.x + b * mx + c * tx - fx.x}px, ${a * fx.y + b * my + c * ty - fx.y}px) translate(-50%,-50%) scale(${1 - 0.75 * t}) rotate(${t * 360}deg)`, opacity: t > 0.92 ? 0 : 1 });
    }
    await ch.animate(pts, { duration: 950, easing: 'cubic-bezier(.5,0,.4,1)', fill: 'forwards' }).finished.catch(() => {});
    portal.animate([{ transform: 'translate(-50%,-50%) scale(1.3) rotate(260deg)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(0) rotate(420deg)', opacity: 0 }], { duration: 480, easing: 'ease-in', fill: 'forwards' });
    to?.animate?.([{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 500, easing: 'cubic-bezier(.2,1.6,.4,1)' });
    audio?.fx?.('chime', { intensity: 0.5 });
    haptic?.('success');
    await wait(420);
  }
  layer.remove();
  // 4. the card, until acknowledged
  const card = h('div', { class: 'hf-saved', role: 'status' },
    charm(skill, 46),
    h('div', { class: 'hf-saved-t' }, h('div', { class: 'eyebrow' }, 'New tool saved'), h('div', { class: 'name' }, skill.title)),
    h('div', { class: 'hf-saved-btns' },
      h('button', { class: 'hf-pill', onclick: () => { close(); onOpen?.(skill.id); } }, 'Open'),
      h('button', { class: 'hf-pill primary', onclick: () => close() }, 'Lovely')));
  root.append(card);
  requestAnimationFrame(() => card.classList.add('in'));
  function close() { card.classList.remove('in'); setTimeout(() => card.remove(), 320); }
}

/** The garden itself, as a sheet. practise(worldId) jumps back into play. */
export function openGarden({ saved = [], focus = null, practise = null } = {}) {
  const have = new Set(saved.map((s) => s.id));
  const body = h('div', { class: 'hf-garden' });
  const bed = h('div', { class: 'hf-bed' },
    ...Object.values(SKILLS).map((s) => have.has(s.id)
      ? h('button', { class: 'hf-plant', onclick: () => detail(s.id), 'aria-label': `${s.title}. Open` }, h('span', { class: 'stem', 'aria-hidden': 'true' }), charm(s, 54), h('span', { class: 'lbl' }, s.title))
      : h('div', { class: 'hf-plant empty', 'aria-label': 'A tool you haven’t found yet' }, h('span', { class: 'stem', 'aria-hidden': 'true' }), h('div', { class: 'seed' }), h('span', { class: 'lbl' }, 'Not found yet'))));
  const intro = h('p', { class: 'lede', style: { margin: '0 0 6px' } }, have.size
    ? 'Tools you found while playing. Open one to remember how it works, or practise it again.'
    : 'Nothing here yet. When you discover something while playing, you can save it here.');
  body.append(intro, bed);
  const sheet = openSheet({ title: 'Memory Garden', body, full: true, label: 'Memory Garden' });

  function detail(id) {
    const s = skillById(id);
    const entry = saved.find((x) => x.id === id);
    body.replaceChildren(
      h('button', { class: 'btn ghost', style: { paddingLeft: 0 }, onclick: () => { body.replaceChildren(intro, bed); } }, icon('back'), 'All tools'),
      h('div', { class: 'hf-detail' }, charm(s, 72),
        h('h3', {}, s.title),
        h('div', { class: 'eyebrow' }, `Found in ${s.found}${entry?.practised > 1 ? ` · practised ${entry.practised} times` : ''}`),
        h('p', {}, s.what),
        h('div', { class: 'hf-example' }, h('div', { class: 'eyebrow' }, 'Try it in real life'), h('p', {}, s.example)),
        h('p', { class: 'muted' }, s.evidence),
        practise ? h('button', { class: 'btn primary block', onclick: () => { sheet.close(); practise(s.world, s.id); } }, 'Practise it again') : null,
        s.related?.length ? h('div', { class: 'hf-related' }, h('div', { class: 'eyebrow' }, 'Goes well with'),
          ...s.related.map((r) => h('button', { class: 'hf-chip', onclick: () => (have.has(r) ? detail(r) : null), disabled: !have.has(r) }, have.has(r) ? skillById(r).title : 'Not found yet'))) : null));
  }
  if (focus && have.has(focus)) detail(focus);
  return sheet;
}
