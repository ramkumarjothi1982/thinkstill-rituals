// Every user-facing string in Mallow Nightlight, in one table so it can be
// linted (tests/lib/copy-lint.mjs): short, warm, plain British English.
// A companion for winding down: no claims about sleep or health, no tracking,
// counts, streaks or scores. The only "treatment" wording is the disclaimer.
// The Mallow's own words come only from its authored voice.rest lines
// (src/mallows/registry.js); names are passed in by the caller.
// The live region says only the `say` lines: never breaths, blinks or captions.

export const COPY = Object.freeze({
  title: 'Nightlight',
  meta: 'Mallow Nightlight',
  /** 'Moonlight · Noomi' */
  subtitle: (mode, name) => `${mode} · ${name}`,
  /** landscape (no status row): 'Moonlight · until 23:30' | 'Moonlight · no timer' */
  subtitleShort: (mode, time) => (time ? `${mode} · until ${time}` : `${mode} · no timer`),

  modes: Object.freeze({
    moonlight: Object.freeze({ label: 'Moonlight', name: 'Moonlight', line: 'A soft glow to rest by.' }),
    breathe: Object.freeze({ label: 'Breathe', name: 'Breathing Together', line: 'Breathe along, if you like.' }),
    sleepy: Object.freeze({ label: 'Sleepy', name: 'Sleepy Companion', line: 'Getting cosy for the night.' }),
    drift: Object.freeze({ label: 'Drift', name: 'Ambient Drift', line: 'Let the night move.' }),
    quiet: Object.freeze({ label: 'Quiet', name: 'Quiet Company', line: 'Just company. No fuss.' }),
  }),

  status: Object.freeze({
    until: (t) => `Until ${t}`,
    none: 'No timer',
    fading: (t) => `Fading · until ${t}`,
  }),

  // the one contextual chip in the status row
  chips: Object.freeze({
    breathe: 'Hold to breathe in',
    sound: 'Sound',
    longer: 'A little longer',
    soundBack: 'Tap to bring the sound back',
  }),

  // Breathe, first two cycles only (aria-hidden)
  captions: Object.freeze({ in: 'Breathe in…', out: '…and out' }),

  buttons: Object.freeze({
    close: 'Close', settings: 'Nightlight settings', again: 'Again', done: 'Done',
    turnOn: 'Turn on', fadeNow: 'Fade out now', exit: 'Close Nightlight',
  }),

  // the one live region (role=status)
  say: Object.freeze({
    start: (name, t) => (t ? `Nightlight on with ${name} until ${t}.` : `Nightlight on with ${name}.`),
    mode: (modeName) => `${modeName}.`,
    brightness: (pct) => `Brightness ${pct} %.`,
    fading: 'Fading out.',
    longer: 'Ten more minutes.',
    ended: 'Nightlight finished.',
    soundPaused: 'Sound paused. Tap to bring it back.',
  }),

  end: Object.freeze({
    finished: (t) => `Nightlight finished at ${t}.`,
    morning: 'Good morning.',
    /** the Mallow's authored rest line, then its name */
    line: (line, name) => `“${line}” ${name}`,
  }),

  sheet: Object.freeze({
    title: 'Nightlight',
    brightness: Object.freeze({
      label: 'Brightness',
      sub: "Dims the scene. Your screen's own brightness still applies.",
      value: (pct) => `${pct} %`,
    }),
    light: Object.freeze({ label: 'Light', names: Object.freeze(['Moon', 'Soft', 'Warm', 'Candle', 'Ember']) }),
    speed: Object.freeze({
      label: 'Speed',
      sub: 'How slowly it breathes, blinks and moves.',
      names: Object.freeze({ slowest: 'Slowest', slow: 'Slow', natural: 'Natural' }),
    }),
    volume: Object.freeze({
      label: 'Volume',
      sub: 'Sound pauses when the screen locks or you switch apps.',
      muted: 'Sound is off',
      value: (pct) => `${pct} %`,
    }),
    timer: Object.freeze({
      label: 'Timer',
      names: Object.freeze({ 10: '10', 20: '20', 30: '30', 45: '45', 60: '60', 0: 'None' }),
      aria: (n) => (n > 0 ? `${n} minutes` : 'No timer'),
      ends: (t) => `Ends at ${t}`,
      none: 'Runs until you close it',
    }),
    fade: Object.freeze({
      label: 'Fade out',
      on: 'On',
      off: 'Off',
      sub: (n) => `Light, sound and movement ease down over the last ${n} minutes`,
      offSub: 'Light and sound go down in the last few seconds',
      needsTimer: 'Needs a timer',
    }),
    motion: Object.freeze({
      label: 'Movement',
      names: Object.freeze({ gentle: 'Gentle', less: 'Less', still: 'Still' }),
      reduced: 'Your device asks for less motion',
    }),
    wake: Object.freeze({
      label: 'Keep screen on',
      on: 'On',
      off: 'Off',
      sub: 'Until the light fades, an hour at most. Uses more battery.',
      failed: 'Not available right now',
      unsupported: 'Your screen sleeps on its usual timer.',
    }),
    // the last row: stop gently (hidden while already fading), or leave now with the goodnight
    stop: 'Finish',
  }),

  disclaimer: "A gentle companion for winding down. It isn't a treatment for sleep problems.",

  aria: Object.freeze({
    modes: 'Nightlight mode',
    stage: (name) => `${name} in the night. Tap to say goodnight, hold to stay close. `
      + 'Keys: 1 to 5 change mode, up and down change brightness, Escape closes.',
    endCard: 'Nightlight finished',
  }),
});

const FMT = new Map();

/** A local clock time, e.g. '23:30' or '11:30 pm' (Intl, hour numeric, 2-digit minutes). */
export function clock(ms, locale) {
  const key = locale || '';
  let f = FMT.get(key);
  if (!f) {
    try { f = new Intl.DateTimeFormat(locale || undefined, { hour: 'numeric', minute: '2-digit' }); } catch { f = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }); }
    FMT.set(key, f);
  }
  return f.format(ms);
}

/** The end card's first line: 'Good morning.' between 05:00 and 11:00 local time, else 'Nightlight finished at 23:42.' */
export function endTitle(ms, nowHour = new Date(ms).getHours(), locale) {
  return nowHour >= 5 && nowHour < 11 ? COPY.end.morning : COPY.end.finished(clock(ms, locale));
}

/** 0.4 → 40 (for 'Brightness 40 %.' and the sliders' value text). */
export const pct = (v) => Math.round((Number.isFinite(v) ? v : 0) * 100);
