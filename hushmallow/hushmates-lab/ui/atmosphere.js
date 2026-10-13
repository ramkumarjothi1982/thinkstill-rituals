// The living background of a Hushmates device: the landing page's drifting
// pastel light (pink, sky, lilac, butter, peach orbs on cream), re-composed
// per scene ("mood") with slow cross-fades, a handful of soft motes rising
// like dust in sunlight, and a quieter, dimmer state for quiet mode.
// Purely visual: it never reflects what anyone has written.

import { reducedMotion } from './motion.js';

const ORBS = {
  pink: 'rgba(255,186,219,.78)',
  sky: 'rgba(191,230,255,.88)',
  lilac: 'rgba(205,184,255,.66)',
  butter: 'rgba(255,231,166,.7)',
  peach: 'rgba(255,205,182,.75)',
  accent: 'var(--atmo-accent, rgba(255,244,200,.8))',
};

// x / y: orb centre in % of the device; s: size as a multiple of device width; o: opacity
const MOODS = {
  dawn: {
    wash: 'linear-gradient(180deg,#FFF8F3 0%,#FCF3FF 58%,#FFF8F3 100%)',
    orbs: { pink: [0, 4, 1.7, 0.95], sky: [100, 14, 1.8, 0.9], lilac: [40, 92, 1.5, 0.7], butter: [92, 62, 1.2, 0.4], peach: [10, 60, 1, 0], accent: [50, 50, 1, 0] },
    motes: 7,
  },
  day: {
    wash: 'linear-gradient(180deg,#FFF8F3 0%,#FBF4FF 55%,#FFF8F3 100%)',
    orbs: { pink: [-6, 0, 1.6, 0.7], sky: [104, 6, 1.8, 0.85], lilac: [30, 96, 1.6, 0.6], butter: [96, 70, 1.2, 0.45], peach: [0, 70, 1, 0], accent: [50, 46, 1.1, 0] },
    motes: 6,
  },
  sky: {
    wash: 'linear-gradient(180deg,#F5FAFF 0%,#FBF6FF 60%,#FFF8F3 100%)',
    orbs: { pink: [96, 84, 1.3, 0.4], sky: [50, -6, 2.1, 0.95], lilac: [-10, 50, 1.5, 0.55], butter: [100, 30, 1, 0.15], peach: [10, 100, 1.2, 0.25], accent: [50, 46, 1.2, 0] },
    motes: 6,
  },
  warm: {
    wash: 'linear-gradient(180deg,#FFF7F0 0%,#FFF1EA 50%,#FBF3FF 100%)',
    orbs: { pink: [-8, 4, 1.5, 0.6], sky: [104, 90, 1.3, 0.3], lilac: [10, 96, 1.5, 0.55], butter: [96, 64, 1.3, 0.55], peach: [62, 18, 1.8, 0.9], accent: [50, 46, 1.2, 0] },
    motes: 7,
  },
  hush: {
    wash: 'linear-gradient(180deg,#FFF6EF 0%,#FCF2F8 50%,#F7F1FF 100%)',
    orbs: { pink: [100, 96, 1.2, 0.18], sky: [-10, 30, 1.2, 0.18], lilac: [-6, 84, 1.6, 0.42], butter: [96, 72, 1.1, 0.24], peach: [60, -6, 1.9, 0.6], accent: [50, 10, 1.2, 0] },
    motes: 3,
  },
  dusk: {
    wash: 'linear-gradient(180deg,#F7F2FC 0%,#F0EAF8 60%,#F5F0FA 100%)',
    orbs: { pink: [100, 100, 1, 0.08], sky: [0, 20, 1.4, 0.25], lilac: [70, 80, 1.8, 0.45], butter: [50, 50, 1, 0], peach: [50, 0, 1.4, 0.15], accent: [50, 50, 1, 0] },
    motes: 0,
  },
  calm: {
    wash: 'linear-gradient(180deg,#FFF8F3 0%,#F8F2FF 60%,#FFF8F3 100%)',
    orbs: { pink: [0, 100, 1.2, 0.25], sky: [-6, 20, 1.5, 0.5], lilac: [100, 4, 1.7, 0.55], butter: [100, 90, 1, 0.2], peach: [50, 50, 1, 0.12], accent: [50, 50, 1, 0] },
    motes: 3,
  },
  play: {
    wash: 'linear-gradient(180deg,#FFF8F3 0%,var(--atmo-tint,#FBF4FF) 70%,#FFF8F3 100%)',
    orbs: { pink: [-10, -2, 1.4, 0.5], sky: [106, 4, 1.5, 0.55], lilac: [20, 100, 1.4, 0.35], butter: [100, 70, 1, 0.2], peach: [0, 60, 1, 0], accent: [50, 44, 1.5, 0.75] },
    motes: 6,
  },
};

export class Atmosphere {
  constructor(root) {
    this.root = root;
    root.classList.add('atmo');
    root.setAttribute('aria-hidden', 'true');
    this.washes = [document.createElement('div'), document.createElement('div')];
    this.washes.forEach((w) => { w.className = 'atmo-wash'; root.append(w); });
    this.front = 0;
    this.orbs = {};
    for (const [name, colour] of Object.entries(ORBS)) {
      const o = document.createElement('div');
      o.className = `atmo-orb atmo-orb--${name}`;
      const inner = document.createElement('i');
      inner.style.background = `radial-gradient(closest-side, ${colour}, transparent)`;
      o.append(inner);
      root.append(o);
      this.orbs[name] = o;
    }
    this.motes = [];
    for (let i = 0; i < 8; i++) {
      const m = document.createElement('span');
      m.className = 'atmo-mote';
      m.style.left = `${8 + ((i * 37) % 86)}%`;
      m.style.setProperty('--mote-dur', `${14 + ((i * 7) % 9)}s`);
      m.style.setProperty('--mote-delay', `${-((i * 5.3) % 18)}s`);
      m.style.setProperty('--mote-size', `${3 + (i % 3) * 2}px`);
      root.append(m);
      this.motes.push(m);
    }
    this.veil = document.createElement('div');
    this.veil.className = 'atmo-veil';
    root.append(this.veil);
    this.mood = null;
    if (reducedMotion()) root.classList.add('is-still');
  }

  /** Change the scene's light. tint/glow: a Mallow's colours for the 'play' mood. */
  set(mood, { tint, glow, instant = false } = {}) {
    const cfg = MOODS[mood] || MOODS.day;
    if (tint) this.root.style.setProperty('--atmo-tint', tint);
    if (glow) this.root.style.setProperty('--atmo-accent', `${glow}cc`);
    if (mood !== this.mood) {
      const next = this.washes[1 - this.front];
      next.style.background = cfg.wash;
      next.classList.toggle('is-on', true);
      this.washes[this.front].classList.toggle('is-on', false);
      this.front = 1 - this.front;
      if (instant) { this.root.classList.add('is-instant'); requestAnimationFrame(() => requestAnimationFrame(() => this.root.classList.remove('is-instant'))); }
    }
    for (const [name, [x, y, s, o]] of Object.entries(cfg.orbs)) {
      const el = this.orbs[name];
      el.style.setProperty('--x', `${x}%`);
      el.style.setProperty('--y', `${y}%`);
      el.style.setProperty('--s', String(s));
      el.style.opacity = String(o);
    }
    this.motes.forEach((m, i) => m.classList.toggle('is-on', i < cfg.motes));
    this.mood = mood;
    this.root.dataset.mood = mood;
  }

  /** quiet mode: the light softens, slows and dims */
  quiet(on) { this.root.classList.toggle('is-quiet', !!on); }

  /** a soft bloom of light from a point (fractions of the device), for shared moments */
  bloom({ x = 0.5, y = 0.45, colour = 'rgba(255,240,248,.95)', duration = 1400 } = {}) {
    const b = document.createElement('div');
    b.className = 'atmo-bloom';
    b.style.left = `${x * 100}%`;
    b.style.top = `${y * 100}%`;
    b.style.background = `radial-gradient(closest-side, ${colour}, transparent)`;
    this.root.append(b);
    const rm = reducedMotion();
    const a = b.animate(rm ? [{ opacity: 0 }, { opacity: 0.6 }, { opacity: 0 }]
      : [{ opacity: 0, transform: 'translate(-50%,-50%) scale(.2)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1.4)', offset: 0.45 }, { opacity: 0, transform: 'translate(-50%,-50%) scale(2.2)' }],
    { duration: rm ? 600 : duration, easing: 'cubic-bezier(.22,1,.36,1)' });
    a.onfinish = () => b.remove();
    return a.finished;
  }
}
