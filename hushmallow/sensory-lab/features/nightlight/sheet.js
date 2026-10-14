// Mallow Nightlight: the settings sheet (the sliders button in the top bar).
//
// One sheet on the lab's openSheet, opened inside the Nightlight screen so it
// takes the night tokens and the .nightlight styles (opaque, no blur). Every
// change previews live behind it: the scrim is clear, so the world, the sky
// and (in landscape and on wide screens, where the sheet is a side panel) the
// Mallow itself show the new light as the slider moves.
//
//   Brightness   5–100 %, "40 %"            Light      Moon · Soft · Warm · Candle · Ember
//   Speed        Slowest · Slow · Natural   Volume     0–100 % (or "Sound is off" + Turn on)
//   Timer        10 · 20 · 30 · 45 · 60 · None, "Ends at 23:40" / "Runs until you close it"
//   Fade out     On · Off (needs a timer)   Movement   Gentle · Less · Still (Gentle off when
//                                                       the device asks for less motion)
//   Keep screen on  Off · On, where the browser has a wake lock (else a plain line)
//   Finish       Fade out now (hidden while fading) · Close Nightlight
//   and the two footnotes: what silences the night sounds, and the disclaimer.
//
// The sheet holds no state: the feature passes a model of getters and callbacks,
// and calls sync() whenever something it shows changes (a setting, the phase,
// the sound switch, a refused wake lock). sheetView() is the pure part (what
// each row shows), so the Node tests can check it without a DOM.
//
//   const sheet = openNightSheet(screen, {
//     state: () => ({ settings, labReduced, wakeSupported, wakeFailed, soundOn, endsAt, fading }),
//     change(k, v, { persist, live }), fadeNow(), exit(), turnSoundOn(), onClosed({ byUser }) });
//   sheet.sync(); sheet.close({ quiet: true });

import { h, openSheet, segmented } from '../../lab-ui.js';
import { COPY, clock, pct } from './copy.js';
import { fadeSeconds } from './session.js';
import { MOTIONS, SPEED_IDS, TIMER_MINUTES, TEMP_STEPS, NIGHT_DEFAULTS, effectiveMotion, tempIndex, tempAt } from './settings.js';

const C = COPY.sheet;

/** The fade's length in whole minutes for a timer (the "over the last n minutes" sub-label). */
export const fadeMinutes = (minutes) => (minutes > 0 ? Math.max(1, Math.round(fadeSeconds(minutes, true) / 60)) : 0);

/**
 * What every row shows, from the screen's state (pure).
 * input: { settings, labReduced, wakeSupported, wakeFailed, soundOn, endsAt, fading, locale }
 */
export function sheetView({ settings = NIGHT_DEFAULTS, labReduced = false, wakeSupported = false, wakeFailed = false,
  soundOn = true, endsAt = null, fading = false, locale } = {}) {
  const S = settings, b = pct(S.brightness), v = pct(S.volume), li = tempIndex(S.temp);
  const timed = S.minutes > 0;
  return {
    brightness: { value: b, text: C.brightness.value(b) },
    light: { value: li, text: C.light.names[li] },
    speed: { value: S.speed },
    volume: { value: v, text: C.volume.value(v), muted: !soundOn },
    timer: { value: S.minutes, sub: Number.isFinite(endsAt) ? C.timer.ends(clock(endsAt, locale)) : C.timer.none },
    fade: { value: S.fade, disabled: !timed, sub: !timed ? C.fade.needsTimer : S.fade ? C.fade.sub(fadeMinutes(S.minutes)) : C.fade.offSub },
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

let uid = 0;

/** Open the sheet in `root` (the Nightlight screen). → { el, sync(), close({ quiet }), get open() } */
export function openNightSheet(root, model) {
  const id = `nl-s${++uid}`;
  const subId = (k) => `${id}-${k}`;
  const change = (k, v, o) => model.change?.(k, v, o);
  const parts = {};
  let handle = null;

  const close = openSheet(root, C.title, (closeSheet) => {
    // a row: the label (and its sub-label) on the left, the control on the right; sub-labels describe the control
    const sub = (k, text = '') => (parts[`${k}Sub`] = h('span', { class: 'sub', id: subId(k) }, text));
    const row = (k, label, ctl, { cls = '', subText = '', value = null } = {}) => h('div', { class: `row nl-row nl-row-${k} ${cls}`.trim() },
      h('span', { class: 'lbl' }, h('span', { class: 'nl-lbl' }, label, value), sub(k, subText)), ctl);
    const seg = (k, options, value, onPick, label) => {
      const s = segmented(options, value, onPick, label);
      s.classList.add('nl-seg');
      s.setAttribute('aria-describedby', subId(k));
      skipDisabled(s);
      return (parts[k] = s);
    };
    const range = (k, { min, max, step, label }, onInput, onCommit) => {
      const el = h('input', { type: 'range', class: 'nl-range', min: String(min), max: String(max), step: String(step), 'aria-label': label, 'aria-describedby': subId(k) });
      el.addEventListener('input', () => onInput(+el.value));
      el.addEventListener('change', () => onCommit(+el.value));
      return (parts[k] = el);
    };
    const out = (k) => (parts[`${k}Out`] = h('span', { class: 'nl-val', 'aria-hidden': 'true' }));

    // light and level: memory (and the live preview) on input, stored on release
    const bright = range('brightness', { min: 5, max: 100, step: 5, label: C.brightness.label },
      (v) => change('brightness', v / 100, { persist: 'debounced', live: true }), (v) => change('brightness', v / 100, { persist: 'now' }));
    const light = range('light', { min: 0, max: TEMP_STEPS, step: 1, label: C.light.label },
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

    // stop gently, or leave now (the top bar's Close sits under the sheet)
    const fadeNow = h('button', { type: 'button', class: 'btn-quiet nl-fade-now', onclick: () => { closeSheet(); model.fadeNow?.(); } }, COPY.buttons.fadeNow);
    const exit = h('button', { type: 'button', class: 'btn-quiet nl-exit', onclick: () => model.exit?.() }, COPY.buttons.exit);   // the goodnight closes the sheet
    parts.fadeNow = fadeNow; parts.exit = exit;

    return h('div', { class: 'nl-sheet' },
      row('brightness', C.brightness.label, bright, { subText: C.brightness.sub, value: out('brightness') }),
      row('light', C.light.label, light, { value: out('light') }),
      row('speed', C.speed.label, speed, { subText: C.speed.sub, cls: 'nl-stack' }),
      row('volume', C.volume.label, h('span', { class: 'nl-vol' }, vol, parts.muted), { subText: C.volume.sub, value: out('volume') }),
      row('timer', C.timer.label, timer, { cls: 'nl-stack' }),
      row('fade', C.fade.label, fade, { cls: 'nl-stack' }),
      row('motion', C.motion.label, motion, { cls: 'nl-stack' }),
      wake ? row('wake', C.wake.label, wake, { cls: 'nl-stack' })
        : h('div', { class: 'row nl-row nl-row-wake' }, h('span', { class: 'lbl' }, h('span', { class: 'nl-lbl' }, C.wake.label), h('span', { class: 'sub' }, C.wake.unsupported))),
      h('div', { class: 'row nl-row nl-row-stop', role: 'group', 'aria-label': C.stop }, fadeNow, exit),
      h('p', { class: 'nl-foot' }, C.soundNote),
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

  const tr = track(root, el, close, model.onClosed);
  handle = { el, sync, get open() { return tr.open; }, close: (o) => tr.close(o) };
  sync();
  return handle;
}
