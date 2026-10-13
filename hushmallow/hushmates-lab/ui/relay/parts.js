// Hushfold's building blocks, in the landing page's language: a room lit by
// your Mallow's colours, the Mallow standing on its cloud pillow with a
// breathing halo, thought clouds for words (never cards), the Mallow's
// speech bubble for status, a consent row and the privacy details.
// People's words only ever go in as text.

import { h, icon } from '../dom.js';
import { pillow } from '../kit.js';
import { Mallow } from '../mallow.js';
import { MALLOWS } from '../mallows-data.js';
import { reducedMotion, CSS_EASE, wait } from '../motion.js';
import { play } from '../sound.js';
import { Sky } from '../sky.js';

/** replaceChildren that skips empty slots (null, false, undefined) and flattens lists. */
export const put = (node, ...kids) => node.replaceChildren(...kids.flat(Infinity).filter((k) => k != null && k !== false && k !== ''));

/** The scene root: a soft room tinted by a Mallow, with drifting clouds. */
export function room(mallowId, cls = '', { seed = 3, sky = true } = {}) {
  const m = MALLOWS[mallowId] || MALLOWS.noomi;
  const el = h('div', { class: `hm-scene hf-room ${cls}`, style: { '--room-tint': m.tint, '--room-glow': m.glow, '--room-deep': m.deep, '--room-body': m.body } });
  const s = sky ? new Sky({ seed }) : null;
  if (s) el.append(s.el);
  return { el, sky: s, m };
}

/** The Mallow on its pillow with a breathing halo; `above` is the space over its head (clouds, orbs). */
export function stage(mallowId, { label, onSqueeze, size = 'l' } = {}) {
  const m = MALLOWS[mallowId] || MALLOWS.noomi;
  const mallow = new Mallow(m.id, { interactive: true, eager: true, label: label || `Squeeze ${m.name}`, onSqueeze: (held) => { play('squish'); onSqueeze?.(held); } });
  const halo = h('span', { class: 'hf-halo', 'aria-hidden': 'true' });
  const above = h('div', { class: 'hf-above' });
  const figure = h('div', { class: 'hf-figure' }, halo, pillow('hf-pillow'), h('div', { class: 'hf-mallow' }, mallow.el));
  const el = h('div', { class: `hf-stage hf-stage--${size}` }, above, figure);
  return { el, mallow, above, figure, halo, m, destroy() { mallow.destroy(); } };
}

/** Where the Mallow's arms would be: just above its head, in `host` coordinates. */
export function handsOf(mallow, host, orbSize = 0) {
  const r = mallow.el.getBoundingClientRect();
  const b = host.getBoundingClientRect();
  return { x: r.left - b.left + r.width / 2, y: r.top - b.top - orbSize * 0.3 };
}

/** A thought cloud (the landing page's blob) holding someone's words. */
export class ThoughtCloud {
  constructor({ placeholder = '', tone = 'light', small = false, long = false, label } = {}) {
    this.placeholder = placeholder;
    this.text = h('p', { class: 'hf-cloud-text' });
    this.shell = h('div', { class: 'hf-cloud hf-blob' }, h('span', { class: 'hf-cloud-sheen', 'aria-hidden': 'true' }), this.text);
    this.el = h('div', { class: `hf-cloud-wrap hf-cloud--${tone}${small ? ' hf-cloud--small' : ''}${long ? ' hf-cloud--long' : ''}`, role: label ? 'group' : null, 'aria-label': label || null },
      this.shell, h('div', { class: 'hf-cloud-tail', 'aria-hidden': 'true' }, h('span'), h('span')));
    this.set('');
  }
  set(t) {
    const words = String(t || '').trim();
    this.el.classList.toggle('is-empty', !words);
    this.text.textContent = words || this.placeholder;
  }
  /**
   * The words gather into a point (the orb being born): each word drifts to
   * the target, shrinking into light, while the cloud folds away.
   */
  async gather(target) {
    const rm = reducedMotion();
    if (rm) { await this.el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'forwards' }).finished.catch(() => {}); return; }
    const words = this.text.textContent.split(/(\s+)/);
    this.text.replaceChildren(...words.map((w) => (w.trim() ? h('span', { class: 'hf-word' }, w) : document.createTextNode(w))));
    const spans = [...this.text.querySelectorAll('.hf-word')];
    const anims = spans.map((sp, i) => {
      const r = sp.getBoundingClientRect();
      const dx = target.x - (r.left + r.width / 2);
      const dy = target.y - (r.top + r.height / 2);
      return sp.animate([
        { transform: 'translate(0,0) scale(1)', opacity: 1, filter: 'blur(0)' },
        { transform: `translate(${dx * 0.55}px, ${dy * 0.55}px) scale(.7)`, opacity: 0.9, filter: 'blur(0)', offset: 0.55 },
        { transform: `translate(${dx}px, ${dy}px) scale(.15)`, opacity: 0, filter: 'blur(2px)' },
      ], { duration: 1100, delay: Math.min(i * 45, 700), easing: CSS_EASE, fill: 'forwards' }).finished.catch(() => {});
    });
    this.shell.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.6)' }], { duration: 900, delay: 350, easing: CSS_EASE, fill: 'forwards' });
    this.el.querySelector('.hf-cloud-tail')?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'forwards' });
    await Promise.all(anims);
  }
}

/** The Mallow says something (status always comes from the character, never a banner). */
export class Speech {
  constructor(mallowId, { tail = 'down' } = {}) {
    this.m = MALLOWS[mallowId] || MALLOWS.noomi;
    this.el = h('div', { class: `hf-say hf-say--${tail}`, role: 'status', 'aria-live': 'polite' });
    this.el.hidden = true;
  }
  async say(text, { who = true, extra = null } = {}) {
    const rm = reducedMotion();
    // the same line again (a refresh): leave it be, no flicker
    const key = `${who}|${text || ''}|${extra ? extra.textContent : ''}`;
    if (key === this.said && !this.el.hidden && !extra) return;
    this.said = key;
    if (!this.el.hidden && this.el.firstChild) {
      const out = this.el.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(-4px)' }], { duration: rm ? 1 : 220, fill: 'forwards' });
      try { await out.finished; } catch { /* gone */ }
      if (this.said !== key) return;                 // something newer was said meanwhile
      out.cancel();                                  // never leave the bubble held at opacity 0
    }
    if (!text && !extra) { this.el.hidden = true; return; }
    this.el.replaceChildren(...[
      who ? h('span', { class: 'hf-say-who', style: { color: this.m.deep } }, this.m.name) : null,
      text ? h('p', { class: 'hf-say-text' }, text) : null,
      extra,
    ].filter(Boolean));
    this.el.hidden = false;
    this.el.animate([{ opacity: 0, transform: 'translateY(8px) scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: rm ? 1 : 420, easing: CSS_EASE, fill: 'backwards' });
  }
}

/** A single serif instruction line that changes with the moment (landing "hm-instr"). */
export function line(text, { level = 'h1', cls = '' } = {}) {
  return h(level, { class: `hf-line ${cls}`, 'data-autofocus': '' }, text);
}
/**
 * Change what a scene shows without a hard cut: the outgoing content (everything but the stage)
 * fades and lifts away, the new content is put in place by `build`, the stage glides from where it
 * was to where it now sits (FLIP), and the new content rises in. Reduced motion: a plain swap.
 */
export async function morph(body, stageEl, build, { out = 200 } = {}) {
  const rm = reducedMotion();
  const before = stageEl?.isConnected ? stageEl.getBoundingClientRect() : null;
  const leaving = [...body.children].filter((n) => n !== stageEl);
  if (!rm && leaving.length) {
    await Promise.all(leaving.map((n) => n.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(-6px)', filter: 'blur(2px)' }],
      { duration: out, easing: CSS_EASE, fill: 'forwards' }).finished.catch(() => {})));
  }
  build();
  if (rm) return;
  if (before && stageEl.isConnected) {
    const after = stageEl.getBoundingClientRect();
    const dx = before.left - after.left;
    const dy = before.top - after.top;
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) stageEl.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 650, easing: CSS_EASE });
  }
  [...body.children].filter((n) => n !== stageEl).forEach((n, i) => n.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
    { duration: 520, delay: 80 + i * 50, easing: CSS_EASE, fill: 'backwards' }));
}

/**
 * After a change inside a scene (no navigation), move focus to the new heading so screen readers
 * announce it, without scrolling. Only call it in answer to the person's own action.
 */
export function focusHeading(root) {
  const el = root?.querySelector('[data-autofocus]');
  if (!el || !el.isConnected) return;
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
  try { el.focus({ preventScroll: true }); } catch { /* not focusable */ }
}

export async function swapLine(el, text) {
  if (!el) return;
  const rm = reducedMotion();
  try { await el.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(-6px)' }], { duration: rm ? 1 : 260, fill: 'forwards' }).finished; } catch { /* gone */ }
  el.textContent = text;
  el.animate([{ opacity: 0, transform: 'translateY(8px)', filter: 'blur(4px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: rm ? 1 : 700, easing: CSS_EASE, fill: 'forwards' });
}

/** A checkbox written as a sentence (consent must be an active choice). */
export function checkRow({ id, label, hint, checked = false, onChange, test, extra = null }) {
  const box = h('button', { type: 'button', role: 'checkbox', id, class: 'hf-check', 'aria-checked': String(!!checked), 'aria-describedby': hint ? `${id}-hint` : null, dataset: test ? { test } : undefined },
    h('span', { class: 'hf-check-box', 'aria-hidden': 'true' }, icon('check')),
    h('span', { class: 'hf-check-label' }, label));
  box.addEventListener('click', () => {
    const next = box.getAttribute('aria-checked') !== 'true';
    box.setAttribute('aria-checked', String(next));
    onChange?.(next);
  });
  return h('div', { class: 'hf-check-row' }, box, hint ? h('p', { class: 'hf-check-hint', id: `${id}-hint` }, hint, extra ? ' ' : '', extra) : extra);
}

/** The privacy details, available before anyone agrees to anything. `focus: 'mallow'` opens at the Mallow section. */
export function privacySheet(dev, { focus = null } = {}) {
  const sec = (title, text, key) => h('section', { class: 'hf-privacy-sec', dataset: key ? { sec: key } : undefined }, h('h3', {}, title), h('p', {}, text));
  const body = h('div', { class: 'hf-privacy', dataset: { test: 'privacy-details' } },
    sec('Who sees your words', 'Your feeling is shown to Hushmates participants who choose to look for feelings, one person at a time. Some will read it and let it float past. Up to five different people can offer a perspective; then it comes home, or after a day. Nobody sees your name or anything about your account.'),
    sec('If you catch a feeling', 'The person who released it reads your perspective when it comes home, and so does anyone who adds one after you. Nobody sees who wrote it. You choose whether it may appear in their share picture or video, and you can change your mind in You & safety.'),
    sec('Not perfectly anonymous', 'Words can give people away. Leave out names, places, workplaces and anything that could identify you or someone else. Hushmates checks for some of these and will ask you to remove them. Our safety team can see reported words.'),
    sec('If you allow a Mallow perspective', 'If nobody catches your feeling, your Mallow can offer one perspective when you ask. To write it, your words are processed by an automated service. It isn’t written by a person, it’s always labelled “Automatically generated”, and it never counts as one of the five. It’s kept with your journey and deleted with it.', 'mallow'),
    sec('Your choices', 'You can bring a feeling home early, delete a journey, see and copy your data, or delete all your Hushmates data at any time in You & safety.'),
    sec('Safety', 'Reported words are reviewed by people on our safety team. Hushmates isn’t an emergency service: if you might not be safe, please contact local emergency services or a crisis line.'));
  dev.sheet({
    title: 'Your privacy in Hushmates',
    body,
    actions: [h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--block', onclick: () => dev.closeSheet() }, 'Done')],
  });
  if (focus) requestAnimationFrame(() => body.querySelector(`[data-sec="${focus}"]`)?.scrollIntoView({ block: 'start' }));
}

/**
 * Lab only: where a Mallow perspective really came from, so testers can tell a
 * live AI response from a canned development example. Never shown to consumers.
 */
const LAB_SOURCES = { ai: 'live AI response (test key)', library: 'Reframe library (rule-based)', demo: 'canned example' };
export function labSourceTag(dev, source) {
  if (!dev.env?.lab) return null;
  return h('span', { class: `hf-lab-tag hf-lab-tag--${source === 'ai' ? 'live' : 'canned'}`, dataset: { test: 'lab-source', source } }, `Lab · ${LAB_SOURCES[source] || source}`);
}

/** Choose a mood colour for the room's light while words arrive (a label's colour). */
export function lightRoom(el, colour) {
  if (colour) el.style.setProperty('--room-feel', colour);
  else el.style.removeProperty('--room-feel');
}

export { wait };
