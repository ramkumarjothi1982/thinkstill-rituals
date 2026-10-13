// Gentle Mallow presence: the official living Mallow (src/mallows/rig.js)
// as a quiet visual companion. It never speaks, never sends anything and
// never reacts to what a message says; only to things that really happened
// (the Hushspace opened, a message really arrived, you sent one).
// With reduced motion it stays still; if the rig can't start it falls back
// to the approved still artwork.

import { avatar } from './dom.js';

let rigModule = null;
const loadRig = () => (rigModule ||= import('../../src/mallows/rig.js').catch(() => null));

export function reducedMotion() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
}

export function livingMallow(id, { size = 72, label = '', fit = 0.72, baseline = 0.9 } = {}) {
  const box = document.createElement('span');
  box.className = 'hm-living';
  box.style.width = `${size}px`;
  box.style.height = `${size}px`;
  box.setAttribute('role', 'img');
  box.setAttribute('aria-label', label || 'Mallow');
  const still = avatar(id, { size, label, cls: 'hm-living__still' });
  box.append(still);
  let rig = null;
  let gone = false;
  if (!reducedMotion() && id) {
    loadRig().then((mod) => {
      if (!mod || gone) return;
      try {
        const holder = document.createElement('span');
        holder.className = 'hm-living__rig';
        holder.setAttribute('aria-hidden', 'true');
        box.append(holder);
        rig = new mod.MallowRig(holder, { id, interactive: false, haptics: false, particles: false, shadow: false, aura: false, audio: null, fit, baseline });
        rig.on('ready', () => { if (!gone) { box.classList.add('is-live'); rig._blinkNow?.(); } });
      } catch { rig = null; }
    });
  }
  return {
    el: box,
    /** a message really arrived: a soft settle */
    settle() { if (rig?.ready) rig.react('nod'); },
    /** you chose to send: a small warm blink */
    acknowledge() { if (rig?.ready) rig._blinkNow?.(); },
    destroy() { gone = true; rig?.destroy(); rig = null; },
  };
}
