// Cinematic subtitles: one short thought at a time, in a band at the top of
// the screen, away from anything you are touching. Play never stops while a
// line is showing. Reading time follows the line's length and the person's
// reading-speed setting; important lines stay until acknowledged. Lines can
// be paused, skipped and replayed.

import { h, icon } from '../app/ui.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function createSubtitles(parent, { speed = () => 1, reducedMotion = () => false } = {}) {
  const band = h('div', { class: 'hf-subs', role: 'status', 'aria-live': 'polite' });
  const line = h('div', { class: 'hf-sub' });
  const ctrl = h('div', { class: 'hf-sub-ctrl' });
  const btn = (name, label, fn) => h('button', { class: 'hf-mini', 'aria-label': label, title: label, onclick: (e) => { e.stopPropagation(); fn(); } }, icon(name));
  const pauseBtn = btn('pause', 'Pause subtitles', () => (paused ? api.resume() : api.pause()));
  ctrl.append(btn('replay', 'Replay last line', () => api.replay()), pauseBtn, btn('skip', 'Skip line', () => api.skip()));
  band.append(line, ctrl);
  parent.append(band);

  let queue = [];
  let running = false;
  let paused = false;
  let skipNow = null;
  let history = [];
  let current = null;
  let gen = 0;

  function readMs(text) {
    const s = Math.max(0.5, Math.min(2, speed() || 1));
    return Math.max(2200, (1500 + text.length * 62) / s);
  }

  function render(item) {
    current = item;
    line.replaceChildren(...[
      item.who ? h('span', { class: 'who' }, item.who) : null,
      h('span', { class: 't' }, item.text),
      item.actions?.length ? h('div', { class: 'hf-sub-actions' }, ...item.actions.map((a) => h('button', {
        class: `hf-pill${a.primary ? ' primary' : ''}`,
        onclick: (e) => { e.stopPropagation(); item.chosen = a.id || a.label; a.onClick?.(); skipNow?.(); },
      }, a.label))) : null,
      item.hold && !item.actions?.length ? h('button', { class: 'hf-pill', onclick: (e) => { e.stopPropagation(); skipNow?.(); } }, item.ack || 'Got it') : null,
    ].filter(Boolean));
    band.classList.toggle('has-actions', !!(item.actions?.length || item.hold));
    line.classList.remove('out');
    line.classList.remove('in');
    void line.offsetWidth;
    line.classList.add('in');
    band.classList.add('show');
  }

  async function hide() {
    line.classList.add('out');
    band.classList.remove('has-actions');
    await wait(reducedMotion() ? 120 : 380);
    if (!current) band.classList.remove('show');
  }

  async function pump() {
    if (running) return;
    running = true;
    const myGen = gen;
    while (queue.length && myGen === gen) {
      const item = queue.shift();
      render(item);
      history.push(item);
      if (history.length > 12) history.shift();
      const ms = readMs(item.text);
      let elapsed = 0;
      await new Promise((resolve) => {
        skipNow = resolve;
        const tick = () => {
          if (myGen !== gen) return resolve();
          if (!paused && !item.hold && !item.actions?.length) elapsed += 100;
          if (item.actions?.length && item.timeout && !paused) elapsed += 100;
          const limit = item.actions?.length ? (item.timeout || Infinity) : ms;
          if (elapsed >= limit) return resolve();
          item.timer = setTimeout(tick, 100);
        };
        tick();
      });
      clearTimeout(item.timer);
      if (myGen !== gen) { item.done?.(item.chosen ?? null); return; }   // cleared: a newer pump owns the band now
      skipNow = null;
      current = null;
      item.done?.(item.chosen ?? null);
      await hide();
      if (queue.length) await wait(item.gap ?? 320);
    }
    running = false;
  }

  const api = {
    el: band,
    get busy() { return running || queue.length > 0; },
    /**
     * Queue lines. opts: {who, hold, actions:[{label, id, primary, onClick}], priority:'low', gap, timeout, ack}.
     * hold/actions apply to the last line. Resolves with the chosen action id (or null).
     */
    say(lines, opts = {}) {
      const list = (Array.isArray(lines) ? lines : [lines]).filter(Boolean);
      if (!list.length) return Promise.resolve(null);
      // low-priority chatter never interrupts or piles up
      if (opts.priority === 'low' && (running || queue.length)) return Promise.resolve(null);
      return new Promise((resolve) => {
        list.forEach((text, i) => {
          const last = i === list.length - 1;
          queue.push({ text, who: opts.who, gap: opts.gap, hold: last && opts.hold, actions: last ? opts.actions : null,
            timeout: opts.timeout, ack: opts.ack, done: last ? resolve : null });
        });
        pump();
      });
    },
    /** Clear everything, including the line on screen. */
    clear() {
      gen++;
      for (const q of queue) q.done?.(null);
      queue = [];
      skipNow?.();
      running = false;
      current = null;
      band.classList.remove('show', 'has-actions');
    },
    pause() { paused = true; pauseBtn.replaceChildren(icon('play')); pauseBtn.setAttribute('aria-label', 'Resume subtitles'); band.classList.add('paused'); },
    resume() { paused = false; pauseBtn.replaceChildren(icon('pause')); pauseBtn.setAttribute('aria-label', 'Pause subtitles'); band.classList.remove('paused'); },
    skip() { skipNow?.(); },
    replay() {
      const last = history[history.length - 1];
      if (!last) return;
      queue.unshift({ text: last.text, who: last.who });
      if (running) skipNow?.(); else pump();
    },
    get paused() { return paused; },
    destroy() { api.clear(); band.remove(); },
  };
  return api;
}
