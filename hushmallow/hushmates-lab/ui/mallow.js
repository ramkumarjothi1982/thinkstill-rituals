// A living Mallow, ported from the hushmallow landing page rig:
// breathing (CSS), blinking with eyelid layers, a happy squint while held,
// squash-and-stretch on springs, each Mallow's signature move, particles,
// blush, cheer hops and leaning. It never speaks and never reacts to what a
// message says: only to touches and to things that really happened.

import { MALLOWS, SHAPES, art, lidsArt } from './mallows-data.js';
import { Channel, Follower, EASE, reducedMotion, rand, clamp } from './motion.js';

const SVGNS = 'http://www.w3.org/2000/svg';

function vibrate(p) {
  try { if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return; navigator.vibrate?.(p); } catch { /* unsupported */ }
}

export function shape(kind) {
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = SHAPES[kind] || SHAPES.sparkle;   // fixed, trusted markup
  return svg;
}

function img(src, cls, { eager = false, alt = '', w, h } = {}) {
  const el = document.createElement('img');
  el.className = cls;
  el.src = src;
  el.alt = alt;
  if (!alt) el.setAttribute('aria-hidden', 'true');
  if (w) { el.width = w; el.height = h; }
  el.decoding = 'async';
  el.loading = eager ? 'eager' : 'lazy';
  el.draggable = false;
  return el;
}

/** Press binding that mirrors the landing page (pointer, Space/Enter, cancel on blur). */
export function bindPress(el, { onDown, onUp, isDisabled = () => false }) {
  let start = null;
  const begin = () => { if (isDisabled() || start !== null) return; start = performance.now(); onDown(); };
  const end = (cancelled) => { if (start === null) return; const held = performance.now() - start; start = null; onUp(held, cancelled); };
  el.addEventListener('pointerdown', (e) => { if (e.button > 0) return; try { el.setPointerCapture(e.pointerId); } catch { /* ok */ } begin(); });
  el.addEventListener('pointerup', () => end(false));
  el.addEventListener('pointercancel', () => end(true));
  el.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); begin(); } });
  el.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); end(false); } });
  el.addEventListener('blur', () => end(true));
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}

export class Mallow {
  /**
   * @param {string} id   one of the seven Mallows
   * @param {object} o
   *   size         css width (number = px)
   *   shadow       soft ground shadow (default true)
   *   interactive  press-and-hold squeeze (button semantics)
   *   label        accessible label (defaults to the Mallow's description)
   *   onSqueeze    called after a completed squeeze
   *   eager        load the art eagerly
   *   float        gentle float loop (for decorative Mallows)
   *   still        no breathing, no blinking (thumbnails)
   */
  constructor(id, o = {}) {
    this.m = MALLOWS[id] || MALLOWS.noomi;
    this.id = this.m.id;
    this.o = { shadow: true, interactive: false, eager: false, float: false, still: false, ...o };
    this.reduced = reducedMotion();
    const m = this.m;

    const el = this.el = document.createElement(this.o.interactive ? 'button' : 'span');
    el.className = `mw mw--${m.id}${this.o.interactive ? ' mw--squish' : ''}${this.o.float && !this.reduced ? ' mw--float' : ''}`;
    if (this.o.interactive) {
      el.type = 'button';
      el.setAttribute('aria-label', this.o.label || `Squeeze ${m.name}`);
    } else {
      el.setAttribute('role', 'img');
      el.setAttribute('aria-label', this.o.label || m.alt);
    }
    if (this.o.size != null) el.style.width = typeof this.o.size === 'number' ? `${this.o.size}px` : this.o.size;
    el.style.setProperty('--mw-glow', m.glow);
    el.dataset.mallow = m.id;
    if (this.o.float) el.style.animationDelay = `${-rand(0, 5).toFixed(2)}s`;

    this.shadowEl = this.o.shadow ? document.createElement('span') : null;
    if (this.shadowEl) this.shadowEl.className = 'mw-shadow';
    this.halo = document.createElement('span');
    this.halo.className = 'mw-halo';
    this.halo.style.background = `radial-gradient(closest-side, ${m.glow}cc, ${m.glow}00)`;
    this.lean = document.createElement('span');
    this.lean.className = 'mw-lean';
    this.breath = document.createElement('span');
    this.breath.className = `mw-breath${this.o.still || this.reduced ? '' : ' is-breathing'}`;
    this.breath.style.setProperty('--bd', `${m.breath}s`);
    this.breath.style.animationDelay = `${-rand(0, 4).toFixed(2)}s`;
    this.body = document.createElement('span');
    this.body.className = 'mw-body';
    this.body.append(img(art(m.id), 'mw-img', { eager: this.o.eager, w: m.w, h: m.h }));
    if (m.id === 'glitzi') {
      this.glitchA = img(art(m.id), 'mw-glitch mw-glitch-a');
      this.glitchB = img(art(m.id), 'mw-glitch mw-glitch-b');
      this.body.append(this.glitchA, this.glitchB);
    }
    if (m.lids && !this.o.still) {
      this.lidsEl = img(lidsArt(m.id), 'mw-lids');
      this.body.append(this.lidsEl);
    }
    this.blushEl = document.createElement('span');
    this.blushEl.className = 'mw-blush';
    for (const [cx, cy] of m.cheeks) {
      const s = document.createElement('span');
      s.style.left = `${cx * 100}%`;
      s.style.top = `${cy * 100}%`;
      s.style.background = `radial-gradient(closest-side, ${m.blush}, ${m.blush}00)`;
      this.blushEl.append(s);
    }
    this.body.append(this.blushEl);
    this.breath.append(this.body);
    this.lean.append(this.breath);
    this.parts = document.createElement('span');
    this.parts.className = 'mw-parts';
    el.append(...[this.shadowEl, this.halo, this.lean, this.parts].filter(Boolean));

    // channels
    this._queued = false;
    const ch = (v) => new Channel(v, () => this._write());
    this.squish = ch(0); this.y = ch(0); this.gx = ch(0); this.rot = ch(0);
    this.blush = ch(0); this.glitch = ch(0); this.glow = ch(0); this.lid = ch(0); this.hop = ch(0);
    this.leanF = new Follower(() => this._write(), { stiffness: 80, damping: 14 });
    this.restLid = 0;
    this._write();

    if (this.o.interactive) {
      bindPress(el, {
        onDown: () => this.press(1, this.o.pressSeconds || 0.8),
        onUp: (held, cancelled) => {
          this.release();
          if (cancelled) return;
          this.signature(1);
          vibrate(12);
          this.o.onSqueeze?.(held);
        },
      });
    }
    if (m.lids && !this.o.still && !this.reduced) this._scheduleBlink();
  }

  _write() {
    if (this._queued) return;
    this._queued = true;
    requestAnimationFrame(() => {
      this._queued = false;
      const s = this.squish.v, y = this.y.v;
      this.body.style.transform = `translateX(${this.gx.v}px) translateY(${y}px) scaleX(${1 + 0.17 * s}) scaleY(${1 - 0.24 * s}) rotate(${this.rot.v}deg)`;
      this.lean.style.transform = `translateY(${this.hop.v}px) rotate(${this.leanF.x}deg)`;
      if (this.shadowEl) {
        const ty = y + this.hop.v;
        this.shadowEl.style.transform = `scaleX(${Math.max(0.5, 1 + 0.18 * s + ty / 160)})`;
        this.shadowEl.style.opacity = String(Math.max(0.25, 0.7 + ty / 140));
      }
      this.halo.style.opacity = String(this.glow.v);
      this.blushEl.style.opacity = String(this.blush.v);
      if (this.glitchA) this.glitchA.style.opacity = this.glitchB.style.opacity = String(this.glitch.v);
      if (this.lidsEl) {
        const { top, bottom } = this.m.lids;
        const v = clamp(Math.max(this.lid.v, this.restLid), 0, 1);
        const band = top + (bottom - top) * v;
        const clip = `inset(0 0 ${(100 - band * 100).toFixed(2)}% 0)`;
        this.lidsEl.style.clipPath = clip;
        this.lidsEl.style.webkitClipPath = clip;
        this.lidsEl.style.opacity = v > 0.02 ? '1' : '0';
      }
    });
  }

  _scheduleBlink() {
    this._blinkT = setTimeout(() => {
      if (this.dead) return;
      if (!document.hidden && this.el.isConnected) this.blink();
      this._scheduleBlink();
    }, rand(2600, 6400));
  }

  blink() {
    if (!this.lidsEl || this.squish.v > 0.2 || this.lid.v > 0.05 || this.restLid > 0.3) return;
    const twice = Math.random() < 0.18;
    this.lid.tween(twice ? [0, 1, 0.1, 1, 0] : [0, 1, 1, 0], {
      duration: twice ? 0.42 : 0.2, times: twice ? [0, 0.22, 0.5, 0.72, 1] : [0, 0.38, 0.55, 1], ease: EASE.easeInOut,
    });
  }

  press(depth = 1, seconds = 0.8) {
    this.squish.tween(this.reduced ? depth * 0.5 : depth, { duration: this.reduced ? 0.2 : seconds, ease: EASE.out });
    this.lid.tween(1, { duration: 0.12, ease: EASE.easeOut });   // a happy squint while being squeezed
  }

  release(soft = false) {
    this.lid.tween([this.lid.v, this.lid.v, 0], { duration: 0.48, times: [0, 0.667, 1], ease: EASE.easeIn });
    if (this.reduced) { this.squish.tween(0, { duration: 0.3, ease: EASE.easeOut }); return; }
    const spring = () => this.squish.spring(0, { stiffness: soft ? 170 : 320, damping: soft ? 9 : 7, velocity: -4 });
    if (this.squish.v < 0.35) this.squish.tween(0.45, { duration: 0.09, ease: EASE.easeOut }).then(spring);
    else spring();
  }

  /** a quick, gentle squeeze-and-release (used when something real arrives) */
  settle() {
    if (this.reduced) { this.pulseBlush(); return; }
    this.squish.tween(0.3, { duration: 0.12, ease: EASE.easeOut }).then(() => this.squish.spring(0, { stiffness: 170, damping: 9, velocity: -2 }));
    this.pulseBlush();
  }

  pulseBlush() {
    this.blush.tween([this.blush.v, 1, 0], { duration: 1.8, times: [0, 0.2, 1], ease: EASE.easeOut });
  }

  cheer(delay = 0) {
    if (this.reduced) return;
    this.hop.tween([0, -16, 0, -5, 0], { duration: 0.7, delay, ease: EASE.easeOut });
  }

  /** rotate towards a point: -1..1 across the stage (0 = upright) */
  leanTo(amount) { this.leanF.to(this.reduced ? 0 : clamp(amount * 9, -9, 9)); }

  /** eyes resting half-closed (quiet mode) for the Mallows that have eyelids */
  sleepy(on) {
    this.restLid = on ? 0.62 : 0;
    this._write();
  }

  signature(intensity = 1) {
    const m = this.m;
    this.pulseBlush();
    const n = Math.round((m.part === 'sparkle' ? 10 : 6) * intensity);
    this.emit(m.part, Math.max(2, n), m.colors);
    if (this.reduced) return;
    switch (m.sig) {
      case 'sink':
        this.y.tween([0, 10, 0], { duration: 1.6 });
        this.rot.tween([0, -3, 2, 0], { duration: 1.6 });
        break;
      case 'wobble':
        this.rot.tween([0, -7, 6, -4, 2, 0], { duration: 1.1 });
        break;
      case 'bounce':
        this.y.tween([0, -46, 0, -20, 0, -6, 0], { duration: 1.05, times: [0, 0.2, 0.4, 0.56, 0.72, 0.86, 1] });
        break;
      case 'hop':
        this.y.tween([0, -34, 0], { duration: 0.6, ease: EASE.hop });
        this.rot.tween([0, -8, 8, 0], { duration: 0.7 });
        break;
      case 'spin':
        this.y.tween([0, -40, 0], { duration: 0.9 });
        this.rot.tween([0, 360], { duration: 0.9, ease: EASE.spin }).then(() => this.rot.set(0));
        break;
      case 'glow':
        this.glow.tween([0, 1, 0], { duration: 2.4 });
        this.y.tween([0, -12, 0], { duration: 2.4 });
        break;
      case 'glitch':
        this.glitch.tween([0, 1, 0, 1, 0, 0.8, 0], { duration: 0.7, ease: EASE.linear });
        this.gx.tween([0, -7, 6, -4, 5, -2, 0], { duration: 0.5, ease: EASE.linear });
        break;
      default: break;
    }
  }

  emit(kind, n, colors = this.m.colors) {
    const count = this.reduced ? Math.min(n, 2) : n;
    const old = this.parts.children;
    while (old.length > 28) old[0].remove();
    for (let i = 0; i < count; i++) {
      const a = rand(-Math.PI * 0.92, -Math.PI * 0.08);
      const dist = rand(60, 140) * (this.o.particleScale || 1);
      const size = rand(14, 26) * (this.o.particleScale || 1);
      const d = this.reduced ? 1.2 : rand(0.9, 1.5);
      const outer = document.createElement('span');
      outer.className = 'mw-part';
      outer.style.left = `${50 + rand(-20, 20)}%`;
      outer.style.top = `${38 + rand(-8, 10)}%`;
      outer.style.width = outer.style.height = `${size}px`;
      outer.style.color = colors[Math.floor(Math.random() * colors.length)];
      const inner = document.createElement('span');
      inner.className = 'mw-part-in';
      inner.append(shape(kind));
      outer.append(inner);
      this.parts.append(outer);
      const dx = Math.cos(a) * dist, dy = Math.sin(a) * dist - 24, r = rand(-80, 80);
      const eo = 'cubic-bezier(0,0,.58,1)';
      outer.animate([{ transform: 'translate(0,0) rotate(0deg)' }, { transform: `translate(${dx}px,${dy}px) rotate(${r}deg)` }],
        { duration: d * 1000, easing: eo, fill: 'forwards' });
      const fade = inner.animate([
        { opacity: 0, transform: 'scale(.3)', easing: eo, offset: 0 },
        { opacity: 1, transform: 'scale(1)', easing: eo, offset: 1 / 3 },
        { opacity: 1, transform: 'scale(1)', easing: eo, offset: 2 / 3 },
        { opacity: 0, transform: 'scale(.7)', offset: 1 },
      ], { duration: d * 1000, fill: 'forwards' });
      fade.onfinish = () => outer.remove();
    }
  }

  /** a calm goodbye: the Mallow settles, dims and drifts back a little */
  stepBack() {
    this.el.classList.add('is-stepping-back');
  }

  destroy() {
    this.dead = true;
    clearTimeout(this._blinkT);
    for (const c of [this.squish, this.y, this.gx, this.rot, this.blush, this.glitch, this.glow, this.lid, this.hop]) c.stop();
    this.leanF.stop();
  }
}

/** Still Mallow art for small places (lists, trays): official art, soft shadow. */
export function face(id, { size = 44, float = false, label = '' } = {}) {
  const m = MALLOWS[id];
  const wrap = document.createElement('span');
  wrap.className = `mw-face${float && !reducedMotion() ? ' mw--float-sm' : ''}`;
  wrap.style.width = `${size}px`;
  if (float) wrap.style.animationDelay = `${-rand(0, 5).toFixed(2)}s`;
  if (!m) { wrap.classList.add('mw-face--empty'); wrap.style.height = `${size}px`; wrap.setAttribute('aria-hidden', 'true'); return wrap; }
  wrap.dataset.mallow = id;
  const el = img(art(id), 'mw-face-img', { alt: label, w: m.w, h: m.h });
  if (!label) wrap.setAttribute('aria-hidden', 'true');
  wrap.append(el);
  return wrap;
}

/** Track every Mallow made inside a screen so the screen can clean them up. */
export class MallowSet {
  constructor() { this.list = []; }
  make(id, o) { const m = new Mallow(id, o); this.list.push(m); return m; }
  destroy() { for (const m of this.list) m.destroy(); this.list = []; }
}
