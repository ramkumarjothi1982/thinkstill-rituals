// Hushfold sky: soft pastel clouds in three parallax layers above the
// atmosphere's light, with a camera that can glide up into the sky (release)
// and settle back (return). Decorative only: it never shows other people's
// feelings, counts or activity.

import { reducedMotion, CSS_EASE } from './motion.js';

const rnd = (seed) => { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; }; };

function cloud(r, { w, tint }) {
  const c = document.createElement('span');
  c.className = 'sky-cloud';
  c.style.width = `${w}%`;
  const puffs = 4 + Math.floor(r() * 3);
  for (let i = 0; i < puffs; i++) {
    const p = document.createElement('i');
    const size = 38 + r() * 46;
    p.style.width = p.style.height = `${size}%`;
    p.style.left = `${(i / (puffs - 1)) * (100 - size * 0.6)}%`;
    p.style.bottom = `${r() * 22}%`;
    if (tint) p.style.setProperty('--puff', tint);
    c.append(p);
  }
  return c;
}

export class Sky {
  constructor({ seed = 3, clouds = 'soft' } = {}) {
    const r = rnd(seed);
    this.el = document.createElement('div');
    this.el.className = `sky sky--${clouds}`;
    this.el.setAttribute('aria-hidden', 'true');
    this.layers = ['far', 'mid', 'near'].map((name, li) => {
      const layer = document.createElement('div');
      layer.className = `sky-layer sky-layer--${name}`;
      const n = [5, 4, 3][li];
      for (let i = 0; i < n; i++) {
        const c = cloud(r, { w: [34, 46, 62][li] + r() * 18, tint: li === 0 ? 'rgba(255,255,255,.55)' : null });
        c.style.left = `${-10 + r() * 80}%`;
        c.style.top = `${4 + (i / n) * 88 + r() * 6}%`;
        c.style.setProperty('--drift', `${[90, 70, 55][li] + r() * 30}s`);
        c.style.animationDelay = `${-r() * 60}s`;
        layer.append(c);
      }
      this.el.append(layer);
      return layer;
    });
    this.horizon = document.createElement('div');
    this.horizon.className = 'sky-horizon';
    this.el.append(this.horizon);
    this.y = 0;
  }

  /** Glide the camera: positive y looks further up into the sky. */
  pan(y, { duration = 2200 } = {}) {
    const rm = reducedMotion();
    const factors = [0.25, 0.55, 1];
    this.layers.forEach((layer, i) => {
      const from = `translate3d(0, ${this.y * factors[i]}px, 0)`;
      const to = `translate3d(0, ${y * factors[i]}px, 0)`;
      layer.animate([{ transform: from }, { transform: to }], { duration: rm ? 1 : duration, easing: CSS_EASE, fill: 'forwards' });
    });
    this.horizon.animate([{ transform: `translate3d(0, ${this.y}px, 0)` }, { transform: `translate3d(0, ${y}px, 0)` }], { duration: rm ? 1 : duration, easing: CSS_EASE, fill: 'forwards' });
    this.y = y;
  }
}
