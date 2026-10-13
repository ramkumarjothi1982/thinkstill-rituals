// Scene kit: the landing page's building blocks for Hushmates scenes.
// Everything here is decoration or plain text; people's words are only
// ever inserted as text nodes.

import { h } from './dom.js';
import { shape } from './mallow.js';
import { reducedMotion, CSS_EASE } from './motion.js';

let uid = 0;

/** The soft three-cloud pillow a Mallow stands on. */
export function pillow(cls = '') {
  return h('span', { class: `kit-pillow ${cls}`, 'aria-hidden': 'true' }, h('span'), h('span'), h('span'));
}

/** Soft radial glow behind a character (colour = a Mallow's glow). */
export function glow(colour, cls = '') {
  return h('span', { class: `kit-glow ${cls}`, 'aria-hidden': 'true', style: { background: `radial-gradient(closest-side, ${colour}66, transparent)` } });
}

/** Eyebrow: gradient dot + uppercase label (+ optional tag). */
export function eyebrow(text, { tag = null, center = false } = {}) {
  return h('p', { class: `kit-eyebrow${center ? ' is-center' : ''}` }, h('span', { class: 'kit-eyebrow-dot', 'aria-hidden': 'true' }), text,
    tag ? h('span', { class: 'kit-tag' }, tag) : null);
}

/** Fraunces headline with an italic gradient second half: "Real people. *Softer connections.*" */
export function headline(level, plain, em, { grad = 'mates', cls = '', id } = {}) {
  return h(level, { class: `kit-title ${cls}`, id, 'data-autofocus': '' }, plain, plain && em ? ' ' : '', em ? h('em', { class: `kit-grad kit-grad--${grad}` }, em) : null);
}

/** "—— LABEL ——" divider. */
export function hairline(text) {
  return h('p', { class: 'kit-hairline' }, h('span', {}, text));
}

/** Pill with a pulsing dot: the landing page's "Press and hold Pipzi" hint. */
export function hint(text, { tone = 'pink' } = {}) {
  return h('p', { class: `kit-hint kit-hint--${tone}` }, h('span', { class: 'kit-hint-dot', 'aria-hidden': 'true' }), text);
}

/** Round white button (back, arrows, more). */
export function round(iconEl, label, onclick, extra = {}) {
  return h('button', { type: 'button', class: 'kit-round', 'aria-label': label, title: label, onclick, ...extra }, iconEl);
}

/** Sentence switch: role=switch button with a full sentence (landing RememberSwitch). */
export function sentenceSwitch({ id, label, hint: note, checked, onChange, test }) {
  const btn = h('button', { type: 'button', role: 'switch', class: 'kit-switch', id, 'aria-checked': String(!!checked), dataset: test ? { test } : undefined },
    h('span', { class: 'kit-switch-track', 'aria-hidden': 'true' }, h('span', { class: 'kit-switch-thumb' })),
    h('span', { class: 'kit-switch-text' }, h('strong', {}, label), note ? h('span', {}, note) : null));
  btn.addEventListener('click', async () => {
    const next = btn.getAttribute('aria-checked') !== 'true';
    btn.setAttribute('aria-checked', String(next));
    const ok = await onChange(next, btn);
    if (ok === false) btn.setAttribute('aria-checked', String(!next));
  });
  return btn;
}

/** Choice chip (aria-pressed), optionally with a coloured dot. */
export function chip(label, pressed, onclick, { dot = null, test = null, small = false } = {}) {
  return h('button', { type: 'button', class: `kit-chip${small ? ' kit-chip--sm' : ''}`, 'aria-pressed': pressed ? 'true' : 'false', onclick, dataset: test ? { test } : undefined },
    dot ? h('span', { class: 'kit-chip-dot', style: { background: dot }, 'aria-hidden': 'true' }) : null, label);
}

/** Tinted tag (a Mallow's tint and deep colour). */
export function tags(list, m) {
  return h('ul', { class: 'kit-tags' }, list.map((t) => h('li', { style: m ? { background: m.tint, color: m.deep } : undefined }, t)));
}

/** The glowing arc between two Mallows (landing Hushmates scene). */
export function arc({ flow = true, cls = '' } = {}) {
  const id = `kit-arc-grad-${++uid}`;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', `kit-arc ${cls}`);
  svg.setAttribute('viewBox', '0 0 400 160');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  const d = 'M20 120 C 120 20, 280 20, 380 120';
  svg.innerHTML = `<defs><linearGradient id="${id}" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#7FD4FF"/><stop offset=".5" stop-color="#C9A8FF"/><stop offset="1" stop-color="#FFB36B"/></linearGradient></defs>
    <path d="${d}" fill="none" stroke="url(#${id})" stroke-width="3" stroke-linecap="round" opacity=".55"/>
    <path class="${flow && !reducedMotion() ? 'kit-arc-flow' : ''}" d="${d}" fill="none" stroke="url(#${id})" stroke-width="5" stroke-linecap="round" stroke-dasharray="10 70"/>`;
  return svg;
}

/**
 * Something small travels across a scene: a glowing light (an invitation) or a heart.
 * Points are [left%, top%] of the container. Resolves when it lands.
 */
export function travel(container, { from, via, to, kind = 'light', duration = 1100, colour } = {}) {
  if (reducedMotion()) return Promise.resolve();
  const el = h('span', { class: `kit-travel kit-travel--${kind}`, 'aria-hidden': 'true' });
  if (kind === 'heart') { el.append(shape('heart')); if (colour) el.style.color = colour; }
  else el.append(h('i'));
  container.append(el);
  const kf = [from, via, to].map(([x, y], i) => ({
    left: `${x}%`, top: `${y}%`, opacity: i === 1 ? 1 : (i === 0 ? 0 : 0.9), transform: `scale(${i === 1 ? 1 : 0.6})`, easing: 'cubic-bezier(.42,0,.58,1)',
  }));
  kf[2].opacity = kind === 'light' ? 1 : 0;
  const a = el.animate(kf, { duration, fill: 'forwards' });
  return a.finished.then(() => {
    if (kind === 'light') {
      const pop = el.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(2.6)' }], { duration: 520, easing: CSS_EASE, fill: 'forwards' });
      return pop.finished.then(() => el.remove());
    }
    el.remove();
    return undefined;
  }).catch(() => el.remove());
}

/** Speech caption above a Mallow; swaps one line at a time. */
export async function caption(zone, { who, text, colour, delay = 0 }) {
  const old = zone.firstElementChild;
  if (old) {
    try { await old.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-6px)' }], { duration: 300, easing: CSS_EASE, fill: 'forwards' }).finished; } catch { /* gone */ }
    old.remove();
  }
  if (!text) return;
  const p = h('p', { class: 'kit-caption' }, who ? h('span', { class: 'kit-caption-who', style: colour ? { color: colour } : undefined }, who) : null, text);
  zone.append(p);
  p.animate([{ opacity: 0, transform: 'translateY(10px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 350, delay, easing: CSS_EASE, fill: 'backwards' });
}
