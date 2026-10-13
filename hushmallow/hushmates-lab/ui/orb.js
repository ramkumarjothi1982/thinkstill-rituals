// The feeling orb: a soft, luminous, touchable sphere that carries a feeling
// through Hushfold. It squashes and stretches on springs (like the Mallows),
// can hold the words inside it, and gains one petal of light per human
// perspective (in that person's Mallow colour). A Mallow perspective is a
// small star on a faint orbit of light: visibly different, never mistaken for a person.

import { Channel, EASE, reducedMotion, rand, CSS_EASE } from './motion.js';
import { MALLOWS } from './mallows-data.js';

const NS = 'http://www.w3.org/2000/svg';
// a soft, wide petal of light whose base sits inside the sphere, so it grows out of it
const PETAL = 'M0 6 C -16 -8, -19 -38, 0 -62 C 19 -38, 16 -8, 0 6 Z';
let uid = 0;

export class Orb {
  /**
   * @param {object} o  size (px), tint (feeling colour), text, interactive, label
   */
  constructor({ size = 140, tint = '#C9B8FF', text = '', label = 'A feeling orb', interactive = false, onPress } = {}) {
    this.reduced = reducedMotion();
    this.id = ++uid;
    const el = this.el = document.createElement(interactive ? 'button' : 'span');
    el.className = `orb${interactive ? ' orb--touch' : ''}`;
    if (interactive) { el.type = 'button'; el.setAttribute('aria-label', label); } else { el.setAttribute('role', 'img'); el.setAttribute('aria-label', label); }
    if (size != null) el.style.setProperty('--orb-size', typeof size === 'number' ? `${size}px` : size);   // null: sized by the scene's CSS
    this.setTint(tint);

    this.aura = document.createElement('span'); this.aura.className = 'orb-aura';
    this.svg = document.createElementNS(NS, 'svg');
    this.svg.setAttribute('class', 'orb-petals');
    this.svg.setAttribute('viewBox', '-100 -100 200 200');
    this.svg.setAttribute('aria-hidden', 'true');
    this.svg.innerHTML = `<defs><filter id="orb-soft-${this.id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2"/></filter></defs>`;
    this.petalGroup = document.createElementNS(NS, 'g');
    this.petalGroup.setAttribute('class', 'orb-petal-spin');
    this.svg.append(this.petalGroup);
    this.body = document.createElement('span'); this.body.className = 'orb-body';
    const sphere = document.createElement('span'); sphere.className = 'orb-sphere';
    const swirl = document.createElement('span'); swirl.className = 'orb-swirl';
    const shine = document.createElement('span'); shine.className = 'orb-shine';
    this.textEl = document.createElement('span'); this.textEl.className = 'orb-text';
    this.body.append(sphere, swirl, shine, this.textEl);
    el.append(this.aura, this.svg, this.body);
    if (text) this.setText(text);

    this.squish = new Channel(0, () => this._write());
    this.wob = new Channel(0, () => this._write());
    this.petals = [];
    if (interactive && onPress) {
      el.addEventListener('pointerdown', () => this.squeeze(0.7, 0.35));
      el.addEventListener('pointerup', () => { this.release(); onPress(); });
      el.addEventListener('pointercancel', () => this.release());
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPress(); } });
    }
  }

  _write() {
    if (this._q) return;
    this._q = true;
    requestAnimationFrame(() => {
      this._q = false;
      const s = this.squish.v;
      this.body.style.transform = `scale(${1 + 0.12 * s}, ${1 - 0.16 * s}) rotate(${this.wob.v}deg)`;
    });
  }

  /** Pin the current rendered size (before moving it out of a container that sized it). */
  freeze() { const w = this.el.getBoundingClientRect().width; if (w) this.el.style.setProperty('--orb-size', `${w}px`); return this; }
  unfreeze() { this.el.style.removeProperty('--orb-size'); return this; }

  setTint(colour) { this.el.style.setProperty('--orb-tint', colour || '#C9B8FF'); }

  /** Words inside the orb (people's text goes in as text only). */
  setText(text) { this.textEl.textContent = text || ''; this.el.classList.toggle('has-text', !!text); }
  showText(on) { this.el.classList.toggle('show-text', !!on); }

  squeeze(depth = 1, seconds = 0.6) {
    this.squish.tween(this.reduced ? depth * 0.4 : depth, { duration: this.reduced ? 0.2 : seconds, ease: EASE.out });
  }
  release(soft = false) {
    if (this.reduced) { this.squish.tween(0, { duration: 0.3, ease: EASE.easeOut }); return Promise.resolve(); }
    this.wob.tween([0, -4, 3, -1.5, 0], { duration: 0.9 });
    return this.squish.spring(0, { stiffness: soft ? 170 : 300, damping: soft ? 9 : 8, velocity: -4 });
  }
  /** the surface ripples: soft rings spread from the sphere */
  ripple({ rings = 2, colour } = {}) {
    if (this.reduced) return;
    for (let i = 0; i < rings; i++) {
      const r = document.createElement('span');
      r.className = 'orb-ripple';
      if (colour) r.style.setProperty('--ripple', colour);
      this.el.append(r);
      const a = r.animate([{ transform: 'scale(.92)', opacity: 0.7 }, { transform: 'scale(1.9)', opacity: 0 }],
        { duration: 1300, delay: i * 260, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' });
      a.onfinish = () => r.remove();
    }
  }
  /** a breath of light from inside */
  glowPulse(times = 1) {
    if (this.reduced) return;
    this.aura.animate([{ filter: 'brightness(1)', transform: 'scale(1)' }, { filter: 'brightness(1.35)', transform: 'scale(1.18)' }, { filter: 'brightness(1)', transform: 'scale(1)' }],
      { duration: 1100, iterations: times, easing: 'ease-in-out' });
  }
  /** appear: grows from a point of light with a springy overshoot */
  form(seconds = 0.9) {
    if (this.reduced) { this.el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 }); return Promise.resolve(); }
    return this.el.animate([{ transform: 'scale(.05)', opacity: 0, filter: 'blur(6px)' }, { transform: 'scale(1.12)', opacity: 1, filter: 'blur(0)', offset: 0.6 }, { transform: 'scale(.97)', offset: 0.8 }, { transform: 'scale(1)' }],
      { duration: seconds * 1000, easing: 'cubic-bezier(.22,1,.36,1)' }).finished.catch(() => {});
  }

  /** a quick happy squeeze */
  boop() { this.squeeze(0.45, 0.1); setTimeout(() => this.release(true), 120); }

  /** Draw the petals for perspectives already given (no animation). */
  setPetals(list = [], mallowPetal = null) {
    this.petalGroup.replaceChildren();
    this.petals = [];
    list.forEach((p, i) => this._petal(p.mallow, i, false));
    this._star(mallowPetal, false);
  }

  /** One more human perspective: a petal unfurls in their Mallow's colour. */
  addPetal(mallow) { return this._petal(mallow, this.petals.length, true); }
  addStar(mallow) { return this._star({ mallow }, true); }

  _petal(mallow, i, animate) {
    const m = MALLOWS[mallow] || MALLOWS.loomi;
    const gid = `orb-g-${this.id}-${i}`;
    const g = document.createElementNS(NS, 'g');
    const angle = -90 + i * 72;
    g.setAttribute('transform', `rotate(${angle + 90}) translate(0 -36)`);
    g.innerHTML = `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="-1" gradientUnits="objectBoundingBox"><stop offset="0" stop-color="${m.body}" stop-opacity=".85"/><stop offset=".7" stop-color="${m.glow}" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity=".95"/></linearGradient></defs>
      <g class="orb-petal-in"><path d="${PETAL}" fill="${m.glow}" opacity=".55" filter="url(#orb-soft-${this.id})" transform="scale(1.12)"/>
      <path d="${PETAL}" fill="url(#${gid})"/>
      <path d="M0 -4 C -4 -20, -4 -38, 0 -54" stroke="#fff" stroke-opacity=".75" stroke-width="1.6" fill="none" stroke-linecap="round"/></g>`;
    g.setAttribute('class', 'orb-petal');
    this.petalGroup.append(g);
    this.petals.push(g);
    if (animate && !this.reduced) {
      // the inner group's origin is the petal's base on the sphere: it unfurls outwards
      g.querySelector('.orb-petal-in').animate([{ opacity: 0, transform: 'scale(0.05)' }, { opacity: 1, transform: 'scale(1.18)', offset: 0.62 }, { opacity: 1, transform: 'scale(1)' }],
        { duration: 1200, easing: CSS_EASE });
      this.boop();
    }
    return g;
  }

  _star(p, animate) {
    this.svg.querySelectorAll('.orb-star').forEach((x) => x.remove());
    if (!p) return null;
    const m = MALLOWS[p.mallow] || MALLOWS.loomi;
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'orb-star');
    g.innerHTML = `<circle r="70" fill="none" stroke="${m.deep}" stroke-opacity=".16" stroke-width="2.2"/>
      <g class="orb-star-ride"><g transform="rotate(36) translate(0 -70)"><circle r="9" fill="${m.glow}" opacity=".45" filter="url(#orb-soft-${this.id})"/><path d="M0 -9 C 1 -3 3 -1 9 0 C 3 1 1 3 0 9 C -1 3 -3 1 -9 0 C -3 -1 -1 -3 0 -9 Z" fill="#fff" stroke="${m.deep}" stroke-width="1.2"/></g></g>`;
    this.svg.append(g);
    if (animate && !this.reduced) g.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 900, easing: CSS_EASE });
    return g;
  }

  destroy() { this.squish.stop(); this.wob.stop(); }
}

/**
 * Fly an absolutely positioned element along a soft curve inside `host`,
 * leaving a trail of light. Points are in px relative to the host.
 * → Promise when it lands.
 */
export function fly(el, host, { from, to, via = null, duration = 1600, scale = [1, 1], trail = true, colour = '#fff', easing = EASE.easeInOut } = {}) {
  const rm = reducedMotion();
  const c = via || { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - 60 };
  const N = 36;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const t = easing(i / N);
    const x = (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * c.x + t * t * to.x;
    const y = (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * c.y + t * t * to.y;
    pts.push({ x, y, s: scale[0] + (scale[1] - scale[0]) * t });
  }
  if (rm) {
    el.style.transform = `translate(${to.x}px, ${to.y}px) translate(-50%, -50%) scale(${scale[1]})`;
    return el.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 250 }).finished.catch(() => {});
  }
  const a = el.animate(pts.map((p) => ({ transform: `translate(${p.x}px, ${p.y}px) translate(-50%, -50%) scale(${p.s})` })), { duration, easing: 'linear', fill: 'forwards' });
  if (trail) {
    const step = duration / N;
    // a delicate trail: a mote every third point, smaller as the orb recedes
    pts.forEach((p, i) => { if (i % 3 === 0 && i > 0) setTimeout(() => sparkle(host, p.x + rand(-4, 4), p.y + rand(-4, 4), colour, rand(5, 11) * Math.max(0.5, p.s)), i * step); });
  }
  return a.finished.then(() => { el.style.transform = `translate(${to.x}px, ${to.y}px) translate(-50%, -50%) scale(${scale[1]})`; }).catch(() => {});
}

/** One mote of the trail. */
export function sparkle(host, x, y, colour = '#fff', size = rand(6, 14)) {
  if (!host.isConnected) return;
  const s = document.createElement('span');
  s.className = 'orb-mote';
  s.style.left = `${x}px`;
  s.style.top = `${y}px`;
  s.style.width = s.style.height = `${size}px`;
  s.style.setProperty('--mote', colour);
  host.append(s);
  const a = s.animate([{ opacity: 0.95, transform: 'translate(-50%,-50%) scale(1)' }, { opacity: 0, transform: `translate(calc(-50% + ${rand(-14, 14)}px), calc(-50% + ${rand(8, 30)}px)) scale(.2)` }],
    { duration: rand(900, 1500), easing: 'cubic-bezier(0,0,.58,1)' });
  a.onfinish = () => s.remove();
}

/** Centre of an element in `host` coordinates. */
export function centreIn(el, host) {
  const r = el.getBoundingClientRect(); const h = host.getBoundingClientRect();
  return { x: r.left - h.left + r.width / 2, y: r.top - h.top + r.height / 2 };
}
