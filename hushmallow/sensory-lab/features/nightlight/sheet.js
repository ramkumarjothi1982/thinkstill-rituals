// Mallow Nightlight: the settings sheet (the sliders button in the top bar).
//
// One sheet on the lab's openSheet, opened inside the Nightlight screen so it
// takes the night tokens and the .nightlight styles (opaque, no blur). Every
// change previews live behind it: the scrim is clear, so the world, the sky
// and (in landscape and on wide screens, where the sheet is a side panel) the
// Mallow itself show the new light as the slider moves.
//
// The everyday rows first, then one disclosure for the rarer ones, so a 320 px
// phone shows a calm sheet rather than a dashboard (nothing is dropped):
//   Brightness   5–100 %, "40 %"            slider beside its label, the sub-label under both
//   Light        Moon · Soft · Warm · Candle · Ember
//   Volume       0–100 % (or "Sound is off" + Turn on)
//   Timer        10 · 20 · 30 · 45 · 60 · None, "Ends at 23:40" / "Runs until you close it" beside the label;
//                restarts from now. Fade out (On · Off, needs a timer) is folded in under it and keeps
//                the end time: only the fade moves (SessionClock.setFade)
//   More settings (a disclosure button, aria-expanded; remembered while the page lives):
//     Speed      Slowest · Slow · Natural
//     Movement   Gentle · Less · Still (Gentle off when the device asks for less motion)
//     Keep screen on  Off · On, where the browser has a wake lock (else a plain line)
//   Finish       Fade out now (hidden while fading) · Close Nightlight
//   and one footnote: the disclaimer.
//
// The sheet holds no state of the session: the feature passes a model of getters
// and callbacks, and calls sync() whenever something it shows changes (a setting,
// the phase, the sound switch, a refused wake lock). sheetView() is the pure part
// (what each row shows), so the Node tests can check it without a DOM.
//
//   const sheet = openNightSheet(screen, {
//     state: () => ({ settings, labReduced, wakeSupported, wakeFailed, soundOn, endsAt, fadeMs, fading }),
//     change(k, v, { persist, live }), fadeNow(), exit(), turnSoundOn(), onClosed({ byUser }) });
//   sheet.sync(); sheet.setMore(true); sheet.close({ quiet: true });

import { h, openSheet, segmented, svgIcon } from '../../lab-ui.js';
import { COPY, clock, pct } from './copy.js';
import { fadeSeconds } from './session.js';
import { MOTIONS, SPEED_IDS, TIMER_MINUTES, TEMP_STEPS, NIGHT_DEFAULTS, effectiveMotion, tempIndex, tempAt } from './settings.js';

const C = COPY.sheet;

/** The fade's length in whole minutes for a timer (the "over the last n minutes" sub-label). */
export const fadeMinutes = (minutes) => (minutes > 0 ? Math.max(1, Math.round(fadeSeconds(minutes, true) / 60)) : 0);

// Fade out's sub-label: what the choice usually does, or, when the fade now scheduled has another length (switched
// on late, so it started at once; "Fade out now"; then perhaps "A little longer"), what this fade really does: when
// it ends while it is under way, else how long it will take.
function fadeSub(S, endsAt, fadeMs, fading, locale) {
  if (!(S.minutes > 0)) return C.fade.needsTimer;
  const usual = fadeSeconds(S.minutes, S.fade) * 1000;
  if (!Number.isFinite(endsAt) || !Number.isFinite(fadeMs) || Math.abs(fadeMs - usual) <= 1000) return S.fade ? C.fade.sub(fadeMinutes(S.minutes)) : C.fade.offSub;
  if (fading) return C.fade.until(clock(endsAt, locale));
  return fadeMs >= 30e3 ? C.fade.sub(Math.max(1, Math.round(fadeMs / 60e3))) : C.fade.offSub;
}

/**
 * What every row shows, from the screen's state (pure).
 * input: { settings, labReduced, wakeSupported, wakeFailed, soundOn, endsAt, fadeMs, fading, locale }
 *   fadeMs: the fade's length as the clock has it now (SessionClock.fadeMs); without it the choice's usual one
 */
export function sheetView({ settings = NIGHT_DEFAULTS, labReduced = false, wakeSupported = false, wakeFailed = false,
  soundOn = true, endsAt = null, fadeMs = null, fading = false, locale } = {}) {
  const S = settings, b = pct(S.brightness), v = pct(S.volume), li = tempIndex(S.temp);
  const timed = S.minutes > 0;
  return {
    brightness: { value: b, text: C.brightness.value(b) },
    light: { value: li, text: C.light.names[li] },
    speed: { value: S.speed },
    volume: { value: v, text: C.volume.value(v), muted: !soundOn },
    timer: { value: S.minutes, sub: Number.isFinite(endsAt) ? C.timer.ends(clock(endsAt, locale)) : C.timer.none },
    fade: { value: S.fade, disabled: !timed, sub: fadeSub(S, endsAt, fadeMs, fading, locale) },
    motion: { value: effectiveMotion(S.motion, labReduced), gentle: !labReduced, sub: labReduced ? C.motion.reduced : '' },
    wake: { shown: !!wakeSupported, value: !!S.keepAwake, sub: wakeFailed && !S.keepAwake ? C.wake.failed : C.wake.sub },
    fadeNow: { hidden: !!fading },
  };
}

// Calls onClosed once, however the sheet closes (Done, the scrim, Escape, or close()).
// openSheet has no close hook, so this watches its 'on' class (added on the next frame),
// and, for a sheet closed before that frame, its removal from the screen.
function track(root, sheetEl, close, onClosed) {
  let done = false, seen = false;
  const finish = (byUser) => { if (done) return; done = true; mo?.disconnect(); onClosed?.({ byUser }); };
  const mo = sheetEl && typeof MutationObserver === 'function' ? new MutationObserver(() => {
    if (!sheetEl.isConnected) finish(true);
    else if (sheetEl.classList.contains('on')) seen = true;
    else if (seen) finish(true);
  }) : null;
  mo?.observe(sheetEl, { attributes: true, attributeFilter: ['class'] });
  if (root) mo?.observe(root, { childList: true });
  return {
    get open() { return !done; },
    /** quiet: the screen is going (leave, the end, unmount), so focus is not handed back. */
    close({ quiet = false } = {}) { if (done) return; done = true; mo?.disconnect(); close(); onClosed?.({ byUser: !quiet }); },
  };
}

// Arrow keys in a radio group skip a disabled choice (Gentle under reduced motion); the
// group's own pattern would stop at it. Capture phase, so it runs before segmented()'s handler.
function skipDisabled(seg) {
  seg.addEventListener('keydown', (e) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    const btns = [...seg.querySelectorAll('button')];
    if (!btns.some((x) => x.disabled)) return;
    e.preventDefault(); e.stopPropagation();
    const L = btns.length, i = Math.max(0, btns.indexOf(document.activeElement));
    for (let n = 1; n < L; n++) {
      const x = btns[(((i + step * n) % L) + L) % L];
      if (!x.disabled) { x.focus(); x.click(); return; }
    }
  }, true);
}

// At rest the Done strip's top edge falls in a gap, never through a label or a control (rows scroll under it once
// the sheet scrolls): between two rows, or between a stacked row's label and its choices, so a whole label can peek
// above the edge as a hint that more follows. The bottom sheet takes the height that ends at such a gap: a little
// taller when that is a small step and the sky stays in view, else a little shorter. The side panel is the screen's
// height, so its strip reaches up to the gap above instead (--nl-cut) and lowers back to its own edge as the panel
// scrolls. Re-fitted when a row changes height (a new sub-label), the disclosure opens or closes, or the screen turns.
const GAP_ROWS = '.nl-row, .nl-subrow, .nl-foot';
const MIN_TOP = 140;    // the bottom sheet's top stays at least this far down (the sky in view)
const MAX_GROW = 48;    // it grows to reach the next gap only by this much at most
function fitFoot(el) {
  const doneEl = el?.querySelector('.done'), body = el?.querySelector('.nl-sheet');
  if (!doneEl || !body) return { snap: (want) => want, dispose() {} };
  let cut0 = 0, lip = 12;
  const onScroll = () => { el.style.setProperty('--nl-cut', `${Math.max(0, Math.round(cut0 - el.scrollTop))}px`); };
  // every gap as a y in the rows' own frame (the sheet's box at scrollTop 0): each row's edges, and a stacked row's
  // line between its label and its choices
  function gaps() {
    const sr = el.getBoundingClientRect(), s = el.scrollTop, y = (v) => v - sr.top + s, out = [];
    for (const r of body.querySelectorAll(GAP_ROWS)) {   // every row, the folded Fade out and the rows behind the disclosure
      if (!r.offsetHeight) continue;                       // (hidden, or inside the closed disclosure)
      const b = r.getBoundingClientRect();
      out.push(y(b.top), y(b.bottom));
      const lbl = r.firstElementChild, ctl = lbl?.nextElementSibling;
      if (r.classList.contains('nl-stack') && lbl && ctl) out.push(y((lbl.getBoundingClientRect().bottom + ctl.getBoundingClientRect().top) / 2));
    }
    return out;
  }
  // the strip's top edge in the sheet's box with no --nl-cut (Done is sticky, so it stays put as the rows scroll)
  const stripAt = () => doneEl.getBoundingClientRect().top - el.getBoundingClientRect().top - lip;
  function fit() {
    if (!el.isConnected) return;
    el.style.maxHeight = ''; el.style.setProperty('--nl-cut', '0px'); cut0 = 0;
    if (el.scrollHeight <= el.clientHeight + 1) return;                    // nothing scrolls: nothing is cut
    const sr = el.getBoundingClientRect();
    lip = -parseFloat(getComputedStyle(doneEl, '::before').top) || 12;
    const strip = stripAt(), gs = gaps();                                   // at rest (scrollTop 0) the two frames agree
    if (gs.some((g) => Math.abs(g - strip) <= 1.5)) return;               // already in a gap
    const up = Math.max(...gs.filter((g) => g < strip)), down = Math.min(...gs.filter((g) => g > strip));
    if (!Number.isFinite(up)) return;
    if (sr.height >= innerHeight - 1) { cut0 = strip - up; onScroll(); return; }   // the side panel
    const grow = down - strip, room = innerHeight - sr.height - MIN_TOP;
    el.style.maxHeight = `${Math.floor(grow <= MAX_GROW && grow <= room ? sr.height + grow : sr.height - (strip - up))}px`;
  }
  /**
   * The scrollTop in [lo, hi] nearest `want` at which the strip's edge falls in a gap (between two rows, or under a
   * stacked row's label), or at the very end of the rows; `want` itself when none does. On the side panel the edge
   * still sits --nl-cut higher while scrollTop < cut0.
   */
  function snap(want, lo, hi) {
    if (!el.isConnected) return want;
    const strip = stripAt(), end = el.scrollHeight - el.clientHeight;
    const at = gaps().map((g) => (g - strip >= cut0 ? g - strip : (g - strip + cut0) / 2)).concat(end)
      .filter((v) => v >= lo && v <= Math.min(hi, end));
    return at.length ? at.reduce((a, b) => (Math.abs(b - want) < Math.abs(a - want) ? b : a)) : want;
  }
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => fit()) : null;
  ro?.observe(body);
  el.addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', fit);
  fit();
  return { fit, snap, dispose() { ro?.disconnect(); el.removeEventListener('scroll', onScroll); removeEventListener('resize', fit); } };
}

let uid = 0;
let moreOpen = false;   // the disclosure stays as the person left it while the page lives (never stored)
const CHEVRON = svgIcon('<path d="M6 9l6 6 6-6"/>');

/** Open the sheet in `root` (the Nightlight screen). → { el, sync(), setMore(open), close({ quiet }), get open() } */
export function openNightSheet(root, model) {
  const id = `nl-s${++uid}`;
  const subId = (k) => `${id}-${k}`;
  const change = (k, v, o) => model.change?.(k, v, o);
  const parts = {};
  let handle = null;

  const close = openSheet(root, C.title, (closeSheet) => {
    // sub-labels describe their control (aria-describedby)
    const sub = (k, text = '') => (parts[`${k}Sub`] = h('span', { class: 'sub', id: subId(k) }, text));
    const lbl = (label, ...more) => h('span', { class: 'lbl' }, h('span', { class: 'nl-lbl' }, label, ...more));
    // an inline row: the label (and its value) and the control on one line, the sub-label under both; the label
    // column is one width, so the controls line up, and a control without room drops under its label
    const inline = (k, label, ctl, { value = null, subText = null, cls = 'row nl-row' } = {}) => h('div', { class: `${cls} nl-row-${k} nl-inline` },
      lbl(label, value), ctl, subText == null ? null : sub(k, subText));
    // a stacked row: the label and its sub-label, then the choices across the sheet
    const stack = (k, label, ctl, { subText = '' } = {}) => h('div', { class: `row nl-row nl-row-${k} nl-stack` },
      h('span', { class: 'lbl' }, h('span', { class: 'nl-lbl' }, label), sub(k, subText)), ctl);
    const seg = (k, options, value, onPick, label) => {
      const s = segmented(options, value, onPick, label);
      s.classList.add('nl-seg');
      s.setAttribute('aria-describedby', subId(k));
      skipDisabled(s);
      return (parts[k] = s);
    };
    // described by its sub-label only where the row has one (Light has none: an IDREF must resolve)
    const range = (k, { min, max, step, label, describe = true }, onInput, onCommit) => {
      const el = h('input', { type: 'range', class: 'nl-range', min: String(min), max: String(max), step: String(step), 'aria-label': label });
      if (describe) el.setAttribute('aria-describedby', subId(k));
      el.addEventListener('input', () => onInput(+el.value));
      el.addEventListener('change', () => onCommit(+el.value));
      return (parts[k] = el);
    };
    const out = (k) => (parts[`${k}Out`] = h('span', { class: 'nl-val', 'aria-hidden': 'true' }));

    // light and level: memory (and the live preview) on input, stored on release
    const bright = range('brightness', { min: 5, max: 100, step: 5, label: C.brightness.label },
      (v) => change('brightness', v / 100, { persist: 'debounced', live: true }), (v) => change('brightness', v / 100, { persist: 'now' }));
    const light = range('light', { min: 0, max: TEMP_STEPS, step: 1, label: C.light.label, describe: false },
      (v) => change('temp', tempAt(v), { persist: 'debounced', live: true }), (v) => change('temp', tempAt(v), { persist: 'now' }));
    const vol = range('volume', { min: 0, max: 100, step: 5, label: C.volume.label },
      (v) => change('volume', v / 100, { persist: 'debounced', live: true }), (v) => change('volume', v / 100, { persist: 'now' }));
    const turnOn = h('button', { type: 'button', class: 'btn-quiet nl-turn-on', onclick: () => { model.turnSoundOn?.(); } }, COPY.buttons.turnOn);
    parts.turnOn = turnOn;
    parts.muted = h('span', { class: 'nl-muted', hidden: true }, h('span', { class: 'nl-muted-txt' }, C.volume.muted), turnOn);

    const speed = seg('speed', SPEED_IDS.map((s) => [s, C.speed.names[s]]), NIGHT_DEFAULTS.speed, (v) => change('speed', v, { persist: 'now' }), C.speed.label);
    const timer = seg('timer', TIMER_MINUTES.map((n) => [n, C.timer.names[n]]), NIGHT_DEFAULTS.minutes, (v) => change('minutes', v, { persist: 'now' }), C.timer.label);
    timer.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-label', C.timer.aria(TIMER_MINUTES[i])));
    const fade = seg('fade', [[true, C.fade.on], [false, C.fade.off]], true, (v) => change('fade', v, { persist: 'now' }), C.fade.label);
    const motion = seg('motion', MOTIONS.map((m) => [m, C.motion.names[m]]), 'gentle', (v) => change('motion', v, { persist: 'now' }), C.motion.label);
    const st0 = model.state?.() || {};
    const wake = st0.wakeSupported ? seg('wake', [[false, C.wake.off], [true, C.wake.on]], false, (v) => change('keepAwake', v, { persist: 'now' }), C.wake.label) : null;

    // the rarer rows behind one disclosure button (a button, so the sheet's focus trap counts it)
    const moreId = `${id}-more`;
    parts.moreBody = h('div', { class: 'nl-more-body', id: moreId, hidden: !moreOpen },
      stack('speed', C.speed.label, speed, { subText: C.speed.sub }),
      stack('motion', C.motion.label, motion),
      wake ? stack('wake', C.wake.label, wake)
        : h('div', { class: 'row nl-row nl-row-wake' }, h('span', { class: 'lbl' }, h('span', { class: 'nl-lbl' }, C.wake.label), h('span', { class: 'sub' }, C.wake.unsupported))));
    // named "More settings", described by what it holds
    parts.more = h('button', { type: 'button', class: 'nl-more', 'aria-expanded': String(moreOpen), 'aria-controls': moreId,
      'aria-labelledby': `${moreId}-l`, 'aria-describedby': `${moreId}-d`, onclick: () => setMore(!moreOpen, { reveal: true }) },
      h('span', { class: 'lbl' }, h('span', { class: 'nl-lbl', id: `${moreId}-l` }, C.more.label), h('span', { class: 'sub', id: `${moreId}-d` }, C.more.sub)),
      h('span', { class: 'nl-chev', html: CHEVRON }));

    // stop gently, or leave now (the top bar's Close sits under the sheet)
    const fadeNow = h('button', { type: 'button', class: 'btn-quiet nl-fade-now', onclick: () => { closeSheet(); model.fadeNow?.(); } }, COPY.buttons.fadeNow);
    const exit = h('button', { type: 'button', class: 'btn-quiet nl-exit', onclick: () => model.exit?.() }, COPY.buttons.exit);   // the goodnight closes the sheet
    parts.fadeNow = fadeNow; parts.exit = exit;

    return h('div', { class: 'nl-sheet' },
      inline('brightness', C.brightness.label, bright, { subText: C.brightness.sub, value: out('brightness') }),
      inline('light', C.light.label, light, { value: out('light') }),
      inline('volume', C.volume.label, h('span', { class: 'nl-vol' }, vol, parts.muted), { subText: C.volume.sub, value: out('volume') }),
      // the Timer, its end time beside the label, and Fade out folded in under its choices
      h('div', { class: 'row nl-row nl-row-timer nl-stack' }, lbl(C.timer.label, sub('timer')), timer,
        inline('fade', C.fade.label, fade, { subText: '', cls: 'nl-subrow' })),
      h('div', { class: 'row nl-row nl-row-more' }, parts.more),
      parts.moreBody,
      h('div', { class: 'row nl-row nl-row-stop', role: 'group', 'aria-label': C.stop }, fadeNow, exit),
      h('p', { class: 'nl-foot' }, COPY.disclaimer));
  });

  const el = parts.brightness?.closest('.sheet') || null;

  // show the model's state in place (focus, scroll and the sheet itself are kept)
  function sync() {
    if (!handle?.open) return;
    const st = model.state?.() || {};
    const v = sheetView(st), P = parts;
    const had = document.activeElement;
    const setRange = (k, val, text) => {
      if (P[k].value !== String(val)) P[k].value = String(val);
      P[k].setAttribute('aria-valuetext', text);
      if (P[`${k}Out`]) P[`${k}Out`].textContent = text;
    };
    setRange('brightness', v.brightness.value, v.brightness.text);
    setRange('light', v.light.value, v.light.text);
    setRange('volume', v.volume.value, v.volume.text);
    P.volume.hidden = v.volume.muted;
    P.volumeOut.hidden = v.volume.muted;
    P.muted.hidden = !v.volume.muted;
    P.speed.set(v.speed.value);
    P.timer.set(v.timer.value);
    P.timerSub.textContent = v.timer.sub;
    P.fade.set(v.fade.value);
    P.fade.querySelectorAll('button').forEach((b) => { b.disabled = v.fade.disabled; });
    P.fadeSub.textContent = v.fade.sub;
    P.motion.set(v.motion.value);
    P.motion.querySelector('button').disabled = !v.motion.gentle;   // Gentle is the first choice
    P.motionSub.textContent = v.motion.sub;
    P.motionSub.hidden = !v.motion.sub;
    if (P.wake) { P.wake.set(v.wake.value); P.wakeSub.textContent = v.wake.sub; }
    P.fadeNow.hidden = v.fadeNow.hidden;
    // a control that just went away (Turn on, Fade out now) hands focus to its neighbour, never to the page
    if (had === P.turnOn && v.volume.muted === false) P.volume.focus({ preventScroll: true });
    else if (had === P.fadeNow && v.fadeNow.hidden) P.exit.focus({ preventScroll: true });
  }

  // the disclosure: open or close in place; opened by the person, the rows it shows are scrolled into view above
  // the Done strip (never past the disclosure itself), at once with less motion. The scroll stops where the strip's
  // edge falls between rows (foot.snap), so no row is left half under it: the next one peeks by its label at most
  function setMore(open, { reveal = false } = {}) {
    if (!handle?.open) return;
    const P = parts, had = document.activeElement;
    moreOpen = !!open;
    P.more.setAttribute('aria-expanded', String(moreOpen));
    P.moreBody.hidden = !moreOpen;
    if (!moreOpen && P.moreBody.contains(had)) P.more.focus({ preventScroll: true });   // never focus on a hidden control
    foot.fit?.();
    if (!moreOpen || !reveal || !el) return;
    const doneEl = el.querySelector('.done'), sr = el.getBoundingClientRect();
    const edge = (doneEl ? doneEl.getBoundingClientRect().top : sr.bottom) - 16;   // just above the strip
    const need = P.moreBody.getBoundingClientRect().bottom - edge;
    const room = P.more.getBoundingClientRect().top - sr.top - 12;
    if (Math.min(need, room) <= 1) return;
    const s = el.scrollTop, to = foot.snap(s + Math.min(need, room), s + 1, s + room);
    if (to - s <= 1) return;
    const calm = !!el.closest('.nl-calm') || !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ top: to, behavior: calm ? 'auto' : 'smooth' });
  }

  const foot = fitFoot(el);
  const tr = track(root, el, close, (o) => { foot.dispose(); model.onClosed?.(o); });
  handle = { el, sync, setMore, get more() { return moreOpen; }, get open() { return tr.open; }, close: (o) => tr.close(o) };
  sync();
  return handle;
}
