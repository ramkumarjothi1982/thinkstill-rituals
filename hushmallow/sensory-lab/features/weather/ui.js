// Weather Weaver — the screen's controls (DOM; built by features/weather.js).
//
//   weatherDial  a radiogroup "Weather" of eight round icon radios (Sun · Wind ·
//                Fog · Rain · Storm · Moon · Stars · Glow): one tab stop, the
//                arrow keys move and select, the chosen radio is kept in view
//                and the row fades at an edge that has more to scroll
//   actionRow    the always-visible alternatives for the gestures (one or two
//                chips; hold chips use the lab's holdButton); never wraps
//   hintLine     the hint under the top bar, then the caption and the Mallow's
//                line when a weather settles. aria-hidden: the announcer
//                (lab-ui announcer, 3 s apart) speaks instead
//   WEATHER_ICONS 24-px stroke paths for svgIcon (no emoji)

import { h, svgIcon, holdButton } from '../../lab-ui.js';
import { COPY, WEATHERS } from '../../core/weather.js';

export const WEATHER_ICONS = Object.freeze({
  sunshine: '<circle cx="12" cy="12" r="4"/><path d="M12 2.8v2.2M12 19v2.2M2.8 12H5M19 12h2.2M5.5 5.5l1.6 1.6M16.9 16.9l1.6 1.6M5.5 18.5l1.6-1.6M16.9 7.1l1.6-1.6"/>',
  wind: '<path d="M3 8.5h10.5a2.5 2.5 0 1 0-2.5-2.5"/><path d="M3 12.5h15a2.5 2.5 0 1 1-2.5 2.5"/><path d="M3 16.5h7.5"/>',
  fog: '<path d="M4 7.5h11M8 11.5h12M4 15.5h10M9 19.5h9"/>',
  rain: '<path d="M7 14.5a4 4 0 0 1-.4-8A5.5 5.5 0 0 1 17 7.5a3.4 3.4 0 0 1 .4 7z"/><path d="M8.5 17.5l-1 2.5M12.5 17.5l-1 2.5M16.5 17.5l-1 2.5"/>',
  storm: '<path d="M7.5 14.5H7a4 4 0 0 1-.4-8A5.5 5.5 0 0 1 17 7.5a3.4 3.4 0 0 1 .4 7h-.9"/><path d="M12.8 12.5l-2.1 3.6h3l-2 3.4"/>',
  moonlight: '<path d="M19.5 14.6A7.6 7.6 0 0 1 9.4 4.5a7.6 7.6 0 1 0 10.1 10.1z"/>',
  starlight: '<path d="M11 3.5l1.6 5 5 1.6-5 1.6-1.6 5-1.6-5-5-1.6 5-1.6z"/><path d="M18 15.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
  warm: '<path d="M10 3.5h4M12 3.5v2"/><path d="M8.5 5.5h7l1.5 3v8.5a3 3 0 0 1-3 3h-4a3 3 0 0 1-3-3V8.5z"/><path d="M12 10.5c1.4 1.4 1.8 2.4 1.8 3.3a1.8 1.8 0 0 1-3.6 0c0-.9.4-1.9 1.8-3.3z"/>',
});

/**
 * @param {string[]} order   weather ids in dial order
 * @param {string} value     the selected weather
 * @param {(id:string, viaKey:boolean)=>void} onPick  a click (viaKey false) or an arrow key (viaKey true)
 * @returns {{el:HTMLElement, set(id:string):void, reveal():void}}
 */
export function weatherDial(order, value, onPick) {
  const el = h('div', { class: 'chips wx-dial', role: 'radiogroup', 'aria-label': COPY.dial });
  const btns = order.map((w) => h('button', {
    type: 'button', class: 'wx-radio', role: 'radio', 'aria-checked': String(w === value), 'aria-label': WEATHERS[w].label,
    title: WEATHERS[w].label, 'data-weather': w, html: svgIcon(WEATHER_ICONS[w]),
  }));
  el.append(...btns);
  let cur = value;
  const fades = () => {
    const max = el.scrollWidth - el.clientWidth;
    el.classList.toggle('fade-l', el.scrollLeft > 2);
    el.classList.toggle('fade-r', max - el.scrollLeft > 2);
  };
  // keep the chosen radio in view without scrolling the page (scrollIntoView would)
  const keep = () => {
    const b = btns[order.indexOf(cur)];
    if (!b || el.scrollWidth <= el.clientWidth) { fades(); return; }
    const L = b.offsetLeft, R = L + b.offsetWidth;
    if (L - 10 < el.scrollLeft) el.scrollLeft = Math.max(0, L - 10);
    else if (R + 10 > el.scrollLeft + el.clientWidth) el.scrollLeft = R + 10 - el.clientWidth;
    fades();
  };
  const set = (w) => {
    if (!order.includes(w)) return;
    cur = w;
    for (let i = 0; i < btns.length; i++) {
      const on = order[i] === w;
      btns[i].setAttribute('aria-checked', String(on));
      btns[i].tabIndex = on ? 0 : -1;
    }
    keep();
  };
  el.addEventListener('click', (e) => {
    const b = e.target.closest?.('.wx-radio');
    if (!b || !el.contains(b)) return;
    // Enter or Space on the chosen radio does nothing, as on a native radio (Again is the chip, R, or a tap on it)
    if (e.detail === 0 && b.getAttribute('aria-checked') === 'true') return;
    const w = b.dataset.weather;
    set(w);
    onPick(w, false);
  });
  el.addEventListener('keydown', (e) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    const jump = e.key === 'Home' ? 0 : e.key === 'End' ? order.length - 1 : -1;
    if (!step && jump < 0) return;
    e.preventDefault();
    const i = jump >= 0 ? jump : (order.indexOf(cur) + step + order.length) % order.length;
    set(order[i]);
    btns[i].focus({ preventScroll: true });
    onPick(order[i], true);
  });
  el.addEventListener('scroll', fades, { passive: true });
  set(value);
  return { el, set, reveal: keep };
}

/**
 * The action row. set(list, {disabled}): list of {id, label, hold?, start?, end?, click?};
 * rebuilt only when the ids or labels change. A rebuilt or disabled hold chip ends its hold first.
 * Keyboard focus survives a rebuild (the chip with the same id, else the first): when the lead chip
 * becomes Again, focus moves onto Again, which ignores activations for a moment so a key still held
 * down on the old chip does not press it straight away. Only the chip that took focus that way waits:
 * a chip the person moves to and presses is a fresh press.
 */
const SETTLE_MS = 700;
export function actionRow() {
  const el = h('div', { class: 'wx-actions', role: 'group', 'aria-label': COPY.actions });
  let key = null, calmUntil = 0, calmEl = null;
  const endHolds = () => { for (const b of el.children) if (b.classList.contains('active')) b.dispatchEvent(new Event('pointercancel')); };
  const tap = (a) => (e) => { if (e.currentTarget !== calmEl || performance.now() >= calmUntil) a.click(e); };
  // a key held down repeats: repeats never press a chip (hold chips ignore them too), so holding
  // Enter on "Part the clouds" until the storm passes cannot then press Again
  el.addEventListener('keydown', (e) => { if (e.repeat && (e.key === 'Enter' || e.key === ' ')) e.preventDefault(); }, true);
  return {
    el,
    set(list, { disabled = false } = {}) {
      const k = list.map((a) => `${a.id}:${a.label}`).join('|');
      if (k !== key) {
        key = k;
        const ae = document.activeElement, had = ae && el.contains(ae) ? ae.dataset.action || '' : null;
        endHolds();
        el.replaceChildren(...list.map((a) => (a.hold
          ? holdButton(a.label, a.start, a.end, { class: 'chip hold wx-chip', 'data-action': a.id })
          : h('button', { type: 'button', class: 'chip wx-chip', 'data-action': a.id, onclick: tap(a) }, a.label))));
        calmEl = null;
        if (had !== null && el.children.length) {
          const next = [...el.children].find((b) => b.dataset.action === had) || el.children[0];
          calmEl = next; calmUntil = performance.now() + SETTLE_MS;
          next.focus({ preventScroll: true });
        }
      }
      if (disabled) endHolds();
      for (const b of el.children) b.disabled = !!disabled;
    },
    endHolds,
  };
}

/** The hint spot: show(text, ms), caption(text, line, name, ms), hide(), destroy(); busy while anything shows, captioning while a caption does. */
export function hintLine(screen) {
  const el = h('p', { class: 'moment-hint wx-hint', 'aria-hidden': 'true' });
  screen.append(el);
  let timer = 0, cap = false;
  const on = (ms) => {
    el.classList.add('on');
    clearTimeout(timer);
    timer = ms ? setTimeout(() => { el.classList.remove('on'); cap = false; }, ms) : 0;
  };
  return {
    el,
    /** The resolve caption (and the Mallow's line) is showing: a passing hint waits its turn. */
    get captioning() { return cap; },
    /** A hint or a caption is showing. */
    get busy() { return el.classList.contains('on'); },
    show(text, ms = 3000) { cap = false; el.replaceChildren(text); on(ms); },
    caption(text, line, name, ms = 4000) {
      el.replaceChildren(h('span', { class: 'wx-cap' }, text),
        line ? h('span', { class: 'line' }, `“${line}”`, h('span', { class: 'who' }, ` ${name}`)) : null);
      on(ms);
      cap = true;
    },
    hide() { clearTimeout(timer); timer = 0; cap = false; el.classList.remove('on'); },
    destroy() { clearTimeout(timer); timer = 0; el.remove(); },
  };
}
