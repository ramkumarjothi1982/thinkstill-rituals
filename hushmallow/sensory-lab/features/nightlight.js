// FEATURE — Mallow Nightlight (#nightlight): a gentle bedtime companion.
//
// Your Mallow gets ready for bed in its own world at night and takes the
// light down with it. The world is a painted still (features/nightlight/
// world.js) with a living sky in front of it (sky.js); the Mallow is graded
// in its shader, so the scene dims without masks; the session is a deadline
// on the wall clock (session.js), so a locked phone can only find it on time
// or ended, and it resumes after a reload. Five modes (modes.js) give the
// evening its rhythm, and a quiet bed of night sound (bed.js) goes with it.
// It makes no claims about sleep.
//
// One frame clock: the rig's capped 'tick' drives everything (session levels,
// look, grade, frame cap, mode, sky, bed, the fade's face, chrome, status,
// record). No setInterval and no rAF of our own.
//
// The fade: the world dims first, then the Mallow, while the sound falls.
// Below a Mallow level of 0.35 it falls asleep (asleep face, slower movement
// and blinks, a shallower breath) and its eyes close (Glitzi's last); when
// the world reaches 0.25 it gives one soft sigh; the world is repainted
// heavier at 25, 50 and 75 % of the fade.
//
// Hidden: the screen is veiled at once (opacity 0, no transition), so the
// first frame on return can never be brighter; nothing runs and nothing
// catches up. Back: the levels are set from the clock under the veil, which
// then lifts over 600 ms; an end that happened while away opens the end view
// at once and quietly.
//
// Views: the session view (a stage screen) and, when the light has gone,
// the end view (DOM only: the rig, its loops, the world and the sound are gone).
// The settings sheet (sheet.js, the sliders button) opens over the session
// view; every change previews live behind it, and the chrome stays awake.
//
// Built on the shared engine: stage-screen (backdrop null, keys, onLayout,
// the night sound facade), FaceMixer, Personality.setFilter, SoftMallow
// setFrameCap / setGrade / overlay / peekParams / nudge, watchPresses,
// EffectsLayer (manual), paintRealm, AmbientBed, setTrim / rest, the lab-ui
// announcer, and core/screen-wake.js (opt-in only).

import { h, iconBtn, segmented, holdButton, announcer } from '../lab-ui.js';
import { stageScreen } from './stage-screen.js';
import { FaceMixer } from '../core/expression-engine.js';
import { watchPresses } from '../core/pointer-router.js';
import { clearGlowSprites } from '../core/effects.js';
import { FramePacer } from '../core/frame-pacer.js';
import { ScreenWake } from '../core/screen-wake.js';
import { approach, rng, hash, smoothstep } from '../core/math.js';
import { MALLOWS } from '../../src/mallows/registry.js';
import { resolveExpression } from '../../src/mallows/expressions.js';
import { COPY, clock as clockText, endTitle, pct } from './nightlight/copy.js';
import { SessionClock, DisplayLevels, loadRecord, saveRecord, clearRecord, EXTEND_MIN } from './nightlight/session.js';
import { NightSettings, MODES_ORDER, SPEEDS, MOTION_RULES, effectiveMotion } from './nightlight/settings.js';
import { nightLook, chromeTokens, LightLimiter } from './nightlight/look.js';
import { waysFor, nightWorld, nightMood, nightSet, nightFilter, peekFor, REST, PEEK_S } from './nightlight/ways.js';
import { MODES, Moments, startMode } from './nightlight/modes.js';
import { WorldLayer, MARGIN } from './nightlight/world.js';
import { NightSky } from './nightlight/sky.js';
import { nightSound, NightBed, bedPlan } from './nightlight/bed.js';
import { openNightSheet } from './nightlight/sheet.js';

export const meta = { id: 'nightlight', title: COPY.meta };

const CHROME_SLEEP_MS = 8000;     // the chrome goes to sleep after this long without input
const REVEAL_MAX_MS = 1500;       // the screen rises from black when painted and ready, or after this
const LEAVE_MS = 600;             // the goodnight before going home
const CARD_DIM_MS = 8000;         // the end card returns to 0.35 after this
const ANSWER_GAP_MS = 800;        // at most one drowsy tap answer per this
const EASE_HALF = 0.28;           // brightness and temperature ease with τ ≈ 0.4 s (half-life 0.28 s)
const ASLEEP_AT = 0.35;           // below this displayed Mallow level it falls asleep
const SIGH_AT = 0.25;             // its one soft sigh, when the world level first crosses this
const EYES = [0.12, ASLEEP_AT];   // open eyes close between these Mallow levels…
const EYES_LAST = [0.05, 0.2];    // …Glitzi's last
const REST_IDLE_MS = 10000;       // silent Quiet or Volume 0: the audio rests this long after the last touch
const REST_AFTER_END_MS = 2200;   // and this long after a live end
const SOUND_BACK_MS = 1500;       // back from hidden with sound wanted but not running: offer the tap
const STILL_HERE_S = 30;          // away longer than this: its "still here" sign on return
const UNVEIL_MAX_MS = 700;        // the veil lifts on the first frame back, or after this
const SKIP_ABOVE = 0.25;          // an end with the Mallow still brighter than this was not seen: quiet end view

// sessionStorage can itself throw (blocked site data, sandboxed frames)
function sessionStore() { try { return globalThis.sessionStorage ?? null; } catch { return null; } }

export function mount(root, ctx) {
  let skew = 0;                    // tests travel in time (debug skew)
  const now = () => Date.now() + skew;
  const store = sessionStore();
  let view = null;

  function openSession(clock) {
    view = sessionView(root, ctx, { clock, now, store, onEnd: (end) => { view.unmount(); openEnd(end); } });
  }
  function openEnd(end) {
    view = endView(root, ctx, { ...end, now,
      onAgain: () => { clearRecord(store); view.unmount(); openSession(null); },
      onDone: () => { clearRecord(store); ctx.navigate('/'); },
    });
  }

  const rec = store ? loadRecord(store, now) : null;
  if (rec && rec.ended) openEnd({ endsAt: rec.endsAt, skipped: true });
  else openSession(rec instanceof SessionClock ? rec : null);

  // the debug / test handle (SHARED §2 naming; spec §12)
  const v = () => view || {};
  const handle = {
    get view() { return view?.kind ?? null; },
    get state() { return v().state ?? null; },
    get mode() { return v().mode ?? null; },
    get settings() { return v().settings ?? null; },
    get motion() { return v().motion ?? null; },
    get clock() { return v().clock ?? null; },
    get levels() { return v().levels ?? null; },
    get look() { return v().look ?? null; },
    get world() { return v().world ?? null; },
    get sky() { return v().sky ?? null; },
    get bed() { return v().bed ?? null; },
    get wake() { return v().wake ?? null; },
    get face() { return v().face ?? null; },
    get moments() { return v().moments ?? null; },
    get pacer() { return v().pacer ?? null; },
    get limiter() { return v().limiter ?? null; },
    get modeCtl() { return v().modeCtl ?? null; },
    get script() { return v().modeCtl?.script ?? null; },
    get breath() { return v().modeCtl?.breath ?? null; },
    get sheet() { return v().sheet ?? null; },
    debug() { return { ...(v().debug?.() || {}), view: view?.kind ?? null, skew }; },
    skew(ms) { skew += +ms || 0; return skew; },
    setMode(id) { v().setMode?.(id); },
    set(k, val) { return v().set?.(k, val) ?? false; },
    force(kind) { v().force?.(kind); },
    fadeNow() { return v().fadeNow?.() ?? false; },
    longer() { return v().longer?.() ?? false; },
    sleepChrome() { v().sleepChrome?.(); },
  };
  if (globalThis.__lab) globalThis.__lab.nightlight = handle;

  return {
    unmount() {
      // leaving the end view any other way than Done or Escape (Android back, a swipe back) forgets the
      // session too, so the next visit starts afresh; a reload never gets here and still shows the end view
      if (view?.kind === 'end') clearRecord(store);
      view?.unmount();
      view = null;
      clearGlowSprites();
      if (globalThis.__lab?.nightlight === handle) globalThis.__lab.nightlight = null;
    },
  };
}

// ================================================================ session --
function sessionView(root, ctx, { clock: restored, now, store, onEnd }) {
  const id = ctx.mallowId, mallow = MALLOWS[id], name = mallow.name, ways = waysFor(id);
  const settings = new NightSettings(ctx.prefs, ctx.dna);
  let S = settings.get();
  const fresh = !restored;
  const clock = restored || new SessionClock({ now, minutes: S.minutes, fade: S.fade, mode: S.mode }).start();
  let mode = MODES[clock.mode] ? clock.mode : 'moonlight';
  let motion = effectiveMotion(S.motion, ctx.prefs.reducedMotion());
  let state = 'booting', dead = false, leaving = false, ended = false, quiet = false, away = false;

  // ------------------------------------------------------------ sound --
  // the Companion's sound: softer touches, no thuds, only sleepy voices (and none at all in silent Quiet)
  const facade = nightSound(ctx.sound, id);
  const setQuiet = (b) => { quiet = !!b; facade.setQuiet(quiet); };
  ctx.sound.setTrim(S.volume);

  // ------------------------------------------------------------ screen --
  const settingsBtn = iconBtn('sliders', COPY.buttons.settings, () => openSettings(), { class: 'icon-btn nl-settings', 'aria-haspopup': 'dialog' });
  const s = stageScreen(root, ctx, {
    title: COPY.title, subtitle: COPY.subtitle(MODES[mode].name, name), backdrop: null, settings: false, feedback: false,
    extraButtons: [settingsBtn],
    sound: facade, stageLabel: COPY.aria.stage, keys: (e, k, phase) => onKey(e, k, phase),
    onLayout: (L) => onLayout(L), onEvent: (e) => onCompanion(e), onExit: () => leave(),
  });
  s.screen.classList.add('nightlight', 'nl-entering');
  s.screen.dataset.backdrop = 'dark';
  s.screen.classList.toggle('nl-calm', motion !== 'gentle');
  const companion = s.companion, rig = companion.rig;
  const topbar = s.screen.querySelector('.topbar'), subEl = topbar.querySelector('.title small');

  // ------------------------------------------------------------ the Mallow at night --
  companion.persona.setFilter(nightFilter(id));
  rig.peekParams = peekFor(id);
  const face = new FaceMixer(rig, ['base', 'mode', 'event', 'fade']);
  const baseSet = {};
  let baseD = -1;
  const applyBase = (d) => {
    nightSet(id, d, baseSet);
    for (const k in baseSet) face.set('base', k, baseSet[k]);
    for (const k in ways.sign.min) face.min('base', k, ways.sign.min[k]);
  };
  applyBase(0);
  let motionBase = 0.6;            // the night motion scale (≤ 0.6); the fade slows it further
  let fadeMs = -1;                 // the motion scale the fade last applied
  const tune = () => {
    motionBase = Math.min(0.6, ctx.dna.tuning().motion);
    companion.applyTuning({ style: 'gentle', speed: SPEEDS[S.speed].rig, motion: motionBase });
    companion.setReducedMotion(motion !== 'gentle');
    fadeMs = -1;                   // the fade re-applies its own scale on the next frame
  };
  tune();

  // ------------------------------------------------------------ light and levels --
  const target = { world: 1, mallow: 1, sound: 1, u: 0 };
  const display = new DisplayLevels().snap(clock.levels(clock.sync(), target));
  const glowHex = () => ctx.dna.palette()?.glow || mallow.colours.glow;
  let bShow = S.brightness, tShow = S.temp;
  const lookIn = { brightness: bShow, temp: tShow, world: display.world, mallow: display.mallow, glowHex: glowHex() };
  const look = nightLook(lookIn, {});
  const tokens = {};
  const applyTokens = () => {
    const before = tokens['--nl-light'];
    chromeTokens(look, tokens);
    if (tokens['--nl-light'] !== before) for (const k in tokens) s.screen.style.setProperty(k, tokens[k]);
  };
  applyTokens();

  // ------------------------------------------------------------ world and sky --
  let nw = nightWorld(id, ctx.dna.get('environment'), { temp: S.temp });
  const world = new WorldLayer(s.wrap, { quality: ctx.quality });
  const sky = new NightSky(s.screen, { before: s.stage, quality: ctx.quality, motion, seed: hash(`sky:${id}`) });
  sky.configure(MODES[mode].sky);
  const sceneFor = () => ({ realmId: nw.realmId, mood: nw.mood, transform: nw.transform, glow: look.light });
  const moodOut = {};
  let painted = false;
  const layout = { W: 0, H: 0, baseline: 0.84 };
  const body = {};
  const stableBody = () => {   // the body without hops or float: the halo and pool stay put
    rig.bodyRect(body);
    body.bottom = rig.BASE; body.top = rig.BASE - body.h; body.mid = rig.BASE - body.h / 2;
    return body;
  };

  // ------------------------------------------------------------ the night bed and the wake lock --
  const bed = new NightBed(ctx.sound, { mallowId: id, texture: nw.scene.texture, quality: ctx.quality, temp: S.temp });
  const planIn = { split: MODES[mode].bed, silent: false, volume: S.volume, sound: 1, ended: false, hidden: false, leaving: false };
  const plan = bedPlan(planIn, {});
  let wakeFailed = false;
  const wake = new ScreenWake({ onFail: () => { wakeFailed = true; if (!dead) settings.set('keepAwake', false, { persist: 'now' }); } });
  const syncWake = () => wake.want(S.keepAwake && !ended && !leaving && !dead);   // opt-in only; requested only while visible

  // ------------------------------------------------------------ pacing --
  const pacer = new FramePacer();
  const limiter = new LightLimiter();
  const capState = { mode, phase: 'booting', motion, quality: ctx.quality, worldLevel: 1, hidden: false };
  let warm = 0, holding = false, lastAnswer = -Infinity, lastTouchAt = performance.now();

  // ------------------------------------------------------------ ui --
  const sr = announcer(s.screen);
  const say = (text) => { if (!dead) sr.say(text); };
  const cap = h('div', { class: 'nl-caption', 'aria-hidden': 'true' });
  s.screen.append(cap);
  let capT = 0;
  const caption = (text, ms = 3000) => {
    if (dead || away) return;
    cap.textContent = text;
    cap.classList.add('on');
    clearTimeout(capT);
    capT = setTimeout(() => cap.classList.remove('on'), ms);
  };
  const modeRow = segmented(MODES_ORDER.map((m) => [m, COPY.modes[m].label]), mode, (m) => setMode(m), COPY.aria.modes);
  modeRow.classList.add('nl-modes');
  modeRow.querySelectorAll('button').forEach((b, i) => { b.setAttribute('aria-label', COPY.modes[MODES_ORDER[i]].name); b.dataset.mode = MODES_ORDER[i]; b.classList.add('chip'); });
  const fades = () => {
    const max = modeRow.scrollWidth - modeRow.clientWidth;
    modeRow.classList.toggle('fade-l', modeRow.scrollLeft > 2);
    modeRow.classList.toggle('fade-r', modeRow.scrollLeft < max - 2);
  };
  modeRow.addEventListener('scroll', fades, { passive: true });
  const centerChip = () => {
    const b = modeRow.querySelector('[aria-checked="true"]');
    if (b && modeRow.scrollWidth > modeRow.clientWidth) modeRow.scrollLeft = b.offsetLeft - (modeRow.clientWidth - b.offsetWidth) / 2;
    fades();
  };
  const stFull = h('span', { class: 'nl-st-full' }), stTime = h('span', { class: 'nl-st-time' });
  const chipSlot = h('span', { class: 'nl-chipslot' });
  const status = h('div', { class: 'nl-status' }, h('span', { class: 'nl-st' }, stFull, stTime), chipSlot);
  s.bottom.append(modeRow, status);

  // the one contextual chip; a newer need replaces the current one until it is resolved:
  // the sound did not come back → "Tap to bring the sound back"; fading → "A little longer"; else the mode's own
  let chipKind = null, chipEl = null, soundPaused = false, unguard = null;
  const wantedChip = () => (soundPaused ? 'soundBack' : state === 'fading' && clock.canExtend ? 'longer' : MODES[mode].chip);
  // a held "Hold to breathe in" lets go (it is going, the page is hidden or loses focus): its own end runs, and with it the lead
  const releaseChip = () => { if (chipKind === 'breathe' && chipEl?.classList.contains('active')) chipEl.dispatchEvent(new Event('pointercancel')); };
  // the chip that replaces a held one must not take that hold's release (a touch's click, a held key's repeats):
  // it takes input again 0.4 s after the next release
  function guardRelease(el) {
    let t = 0;
    const evs = ['pointerup', 'pointercancel', 'keyup'];
    const eat = (e) => { if (e.repeat) e.preventDefault(); };
    const off = () => evs.forEach((k) => removeEventListener(k, end, true));
    const end = () => { off(); t = setTimeout(() => unguard?.(), 400); };
    unguard = () => { off(); clearTimeout(t); el.style.pointerEvents = ''; el.removeEventListener('keydown', eat); unguard = null; };
    el.style.pointerEvents = 'none';
    el.addEventListener('keydown', eat);
    evs.forEach((k) => addEventListener(k, end, true));
  }
  function setChip(kind) {
    if (kind === chipKind) return;
    const hadFocus = !!chipEl && chipEl === document.activeElement;
    const held = chipKind === 'breathe' && !!chipEl?.classList.contains('active');
    releaseChip();
    unguard?.();
    chipEl?.remove();
    chipEl = null; chipKind = kind;
    if (kind === 'breathe') {
      chipEl = holdButton(COPY.chips.breathe, () => ctlEvent({ type: 'lead', source: 'chip', on: true }), () => ctlEvent({ type: 'lead', source: 'chip', on: false }), { class: 'chip hold nl-chip', 'data-chip': kind });
    } else if (kind === 'sound') {
      chipEl = h('button', { type: 'button', class: 'chip toggle nl-chip', 'data-chip': kind, 'aria-pressed': String(S.quietSound), onclick: () => settings.set('quietSound', !S.quietSound, { persist: 'now' }) }, COPY.chips.sound);
    } else if (kind === 'longer') {
      chipEl = h('button', { type: 'button', class: 'chip nl-chip', 'data-chip': kind, onclick: () => longer() }, COPY.chips.longer);
    } else if (kind === 'soundBack') {
      // the tap itself is the gesture that lets the audio run again (lab.js unlocks on it too)
      chipEl = h('button', { type: 'button', class: 'chip nl-chip', 'data-chip': kind, onclick: () => ctx.sound.unlock() }, COPY.chips.soundBack);
    }
    if (chipEl) { chipSlot.append(chipEl); if (held) guardRelease(chipEl); if (hadFocus) chipEl.focus({ preventScroll: true }); }
    // no chip of the mode's own: focus stays in the chrome, on the chosen mode (just before the chip in Tab order)
    else if (hadFocus) (modeRow.querySelector('[aria-checked="true"]') || s.stage).focus({ preventScroll: true });
    status.dataset.chip = kind || '';   // narrow screens shorten the status text beside a long chip (styles)
  }
  let statusKey = '';
  function updateStatus() {
    const land = typeof matchMedia === 'function' && matchMedia('(max-height: 420px)').matches;
    const key = `${state}|${clock.endsAt}|${mode}|${land}|${soundPaused}|${clock.canExtend}`;
    if (key === statusKey) return;
    statusKey = key;
    const t = clock.endsAt == null ? null : clockText(clock.endsAt);
    stFull.textContent = t == null ? COPY.status.none : state === 'fading' ? COPY.status.fading(t) : COPY.status.until(t);
    stTime.textContent = t == null ? COPY.status.none : COPY.status.until(t);   // the short form, beside a chip on narrow screens
    subEl.textContent = land ? COPY.subtitleShort(MODES[mode].name, t) : COPY.subtitle(MODES[mode].name, name);
    setChip(wantedChip());
  }

  // chrome sleep: no input for 8 s → the chrome fades (Close stays at 0.35); any input wakes it
  let lastInput = performance.now(), asleep = false;
  const wakeChrome = () => { lastInput = performance.now(); if (asleep) { asleep = false; s.screen.classList.remove('nl-asleep'); } };
  // keyboard focus in the chrome keeps it awake; a tapped or clicked control (Chromium focuses it) does not
  const chromeFocused = () => {
    const a = document.activeElement;
    if (!a || !(topbar.contains(a) || s.bottom.contains(a))) return false;
    try { return a.matches(':focus-visible'); } catch { return true; }
  };
  const sleepChrome = () => { if (!asleep && !dead) { asleep = true; s.screen.classList.add('nl-asleep'); } };
  s.screen.addEventListener('focusin', wakeChrome);

  // off-body presses (Breathe leads with them), off-body taps, and the wake-up on every touch
  const presses = watchPresses(s.screen, {
    stage: s.stage, ms: 250, slop: 12,
    onBody: (p) => !!rig.soft && rig.hitTest(p.x, p.y),
    onDown: () => { wakeChrome(); pacer.touch(); pacer.apply(rig, capState); lastTouchAt = performance.now(); },   // the cap lifts at the touch, not on the next capped frame
    onPress: (p) => ctlEvent({ type: 'press', x: p.x, y: p.y }),
    onRelease: () => ctlEvent({ type: 'pressend' }),
    onTap: (p) => ctlEvent({ type: 'offtap', x: p.x, y: p.y }),
  });

  // ------------------------------------------------------------ the fade's face --
  // below ASLEEP_AT the Mallow falls asleep over any mode: the asleep face holds over the mode's rest,
  // movement and blinks slow, the breath gets shallower, and open eyes close (Glitzi's last)
  let modeRest = null, restAsleep = false, inflK = 1, eyeSet = null, blinkSet = null;
  const applyRest = () => { companion.restOverride = restAsleep ? REST.asleep : modeRest; };
  const openEyed = (rig.mallow || mallow).face?.eyeStyle !== 'closed';
  const eyesAt = ways.sign.eyesLast ? EYES_LAST : EYES;
  const restEye = openEyed ? resolveExpression(rig.mallow || mallow, REST.asleep.mix, REST.asleep.i).eyeOpen : 0;
  const q2 = (v) => Math.round(v * 100) / 100;
  function blinkBelow() {   // the blink rate the layers under the fade ask for (the rig's own default is 1)
    let b = 1;
    for (const l of face.layers) { if (l.owner === 'fade') break; if ('blinkRate' in l.set) b = l.set.blinkRate; }
    return b;
  }
  function fadeFace() {
    const Lm = display.mallow, k = Lm < ASLEEP_AT ? Lm / ASLEEP_AT : 1;
    const sleepNow = Lm < ASLEEP_AT;
    if (sleepNow !== restAsleep) { restAsleep = sleepNow; applyRest(); }
    const ms = motionBase * (0.5 + 0.5 * k);
    if (Math.abs(ms - fadeMs) > 0.005) { fadeMs = ms; rig.setMotionScale(ms); }
    inflK = 0.4 + 0.6 * k;
    const blink = sleepNow ? q2(blinkBelow() * k) : null;
    if (blink !== blinkSet) { blinkSet = blink; face.set('fade', 'blinkRate', blink); }
    const eye = openEyed && Lm < eyesAt[1] ? q2(restEye * smoothstep(eyesAt[0], eyesAt[1], Lm)) : null;
    if (eye !== eyeSet) { eyeSet = eye; face.set('fade', 'eyeOpen', eye); }
  }

  // the world is repainted a little heavier (mist, a dimmer moon) at 25, 50 and 75 % of the fade
  let fadeStep = 0, sighed = false;
  const stepFor = (u) => (u >= 0.75 ? 0.75 : u >= 0.5 ? 0.5 : u >= 0.25 ? 0.25 : 0);
  function applyFadeStep(instant = false) {
    const st = stepFor(target.u);
    if (st === fadeStep) return;
    fadeStep = st;
    if (!painted) return;
    nightMood(nw, { temp: S.temp, heavy: st }, moodOut);
    world.setMood(moodOut, { force: true, instant });
  }
  // particles (a sigh's puffs, whisper sparks, a moon mote) are drawn over the graded mesh, outside the
  // shader's grade: each takes the Mallow's brightness as it is born (including the rig's own ambient
  // emitters, which spawn inside its update), so none glows brighter than the Mallow at night. A wrapper on
  // this rig's own particle field only; removed on unmount (the rig dies with the view anyway).
  const field = rig.particles;
  if (field && typeof field.spawn === 'function') {
    const spawn = field.spawn;
    field.spawn = function nightSpawn(...a) {
      const before = this.list[this.list.length - 1];
      const out = spawn.apply(this, a);
      const p = this.list[this.list.length - 1];
      if (p && p !== before && !p.nlGraded) { const g = look.mallowGrade; p.nlGraded = true; p.alpha = (p.alpha ?? 1) * (g[0] + g[1] + g[2]) / 3; }
      return out;
    };
  }
  // one soft sigh as the world falls asleep (only on the frame clock: never caught up after being away)
  function sigh() {
    pacer.event(1800);
    if (motion === 'still') rig.overlay('nl-sigh', { eyeOpen: 0.1, mouthRound: 0.5, mouthOpen: 0.3 }, 1.4);
    else rig.react('sigh');
  }

  // ------------------------------------------------------------ modes --
  const lightPt = { x: 0, y: 0 };   // api.light()'s answer, reused (read at once by the caller)
  const api = {
    id, ways, rig, companion, face, sky, world, bed, pacer, limiter, look, levels: display,
    rand: rng(hash(`night:${id}:${Math.round(clock.startedAt)}`)),
    rules: () => MOTION_RULES[motion], motion: () => motion, speedK: () => SPEEDS[S.speed].k,
    timing: () => ctx.dna.breathTiming(), quality: () => ctx.quality, phase: () => state, settings: () => S,
    warm: () => warm, caption, setQuiet,
    rest: (r) => { modeRest = r; applyRest(); },
    inflateK: () => inflK,
    light: () => {
      const a = nw.scene.look, W = layout.W || rig.W, H = layout.H || rig.H;
      lightPt.x = -MARGIN + a.nx * (W + 2 * MARGIN); lightPt.y = -MARGIN + a.ny * (H + 2 * MARGIN);
      return lightPt;
    },
  };
  api.moments = new Moments(api);
  let ctl = startMode(mode, api);
  const ctlEvent = (e) => { if (!dead && !leaving) ctl.event(e, performance.now() / 1000); };   // with its wall time (s)

  function setMode(m) {
    if (!Object.hasOwn(MODES, m) || leaving || dead) return;
    if (m === mode) { modeRow.set(m); return; }
    ctl.stop();
    mode = m;
    ctl = startMode(m, api);
    clock.setMode(m);
    settings.set('mode', m);
    modeRow.set(m);
    centerChip();
    sky.configure(MODES[m].sky);
    bed.touch();           // the bed glides to the new mix (τ 1.5 s)
    pacer.event(1500);     // the 1.5 s change renders smoothly
    if (m === 'quiet') lastTouchAt = performance.now();
    updateStatus();
    caption(MODES[m].line, 3000);
    say(COPY.say.mode(MODES[m].name));
  }

  // ------------------------------------------------------------ input --
  function onCompanion(e) {
    if (dead || leaving) return;
    wakeChrome();
    pacer.touch();
    if (e.type === 'hold') holding = true;
    else if (e.type === 'holdend') holding = false;
    if (e.type === 'tap') answer();
    ctlEvent(e);
  }
  // the Mallow's own drowsy answer to a tap (its rig peek and the night filter's reaction come from the Companion)
  function answer() {
    const t = performance.now();
    if (t - lastAnswer < ANSWER_GAP_MS) return;
    lastAnswer = t;
    if (ways.answer && ways.answer.kind !== 'peek') api.moments.play(ways.answer);
  }

  function onKey(e, k, phase) {
    if (phase === 'down') { wakeChrome(); pacer.touch(); pacer.apply(rig, capState); lastTouchAt = performance.now(); }
    if (leaving) return true;   // the goodnight is under way: nothing else starts
    // the sheet is open but focus is outside it (keys inside it never reach here): Escape closes it,
    // nothing else starts underneath (releases still go through, so nothing stays held)
    if (sheet) { if (phase === 'down' && k === 'escape') sheet.close(); return phase === 'down'; }
    const ae = document.activeElement, onStage = !ae || ae === s.stage || ae === document.body;
    const digit = /^(?:Digit|Numpad)([1-9])$/.exec(e.code || '');
    if (digit && onStage) {
      const n = +digit[1];
      if (n > MODES_ORDER.length) return false;
      if (phase === 'down' && !e.repeat) setMode(MODES_ORDER[n - 1]);
      return true;
    }
    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && onStage) {
      if (phase === 'down') { e.preventDefault(); stepBrightness(e.key === 'ArrowUp' ? 0.1 : -0.1); }
      return true;
    }
    if (k === 'b') {   // B held: breathe in (Breathe leads; elsewhere nothing)
      if (phase === 'down' && !e.repeat) ctlEvent({ type: 'lead', source: 'key', on: true });
      else if (phase === 'up') ctlEvent({ type: 'lead', source: 'key', on: false });
      return true;
    }
    return false;
  }

  function stepBrightness(dk) {
    settings.set('brightness', S.brightness + dk);
    say(COPY.say.brightness(pct(S.brightness)));
  }

  // ------------------------------------------------------------ settings, prefs, Comfort DNA --
  function applyMotion() {
    motion = effectiveMotion(S.motion, ctx.prefs.reducedMotion());
    companion.setReducedMotion(motion !== 'gentle');
    sky.setMotion(motion);
    ctl.setMotion(motion);
    s.screen.classList.toggle('nl-calm', motion !== 'gentle');
    sheet?.sync();
  }
  // the world takes a new Light on release (during a slide only its grade follows, in the frame)
  function repaintMood(force = false) {
    nightMood(nw, { temp: S.temp, heavy: fadeStep }, moodOut);
    world.setMood(moodOut, { force });
  }
  const offSettings = settings.onChange((k, val, cur) => {
    S = cur;
    switch (k) {
      case 'speed': tune(); break;
      case 'motion': applyMotion(); break;
      case 'volume': ctx.sound.setTrim(S.volume); if (S.volume === 0) lastTouchAt = performance.now(); break;
      case 'temp': if (!tempSliding) repaintMood(true); break;
      case 'quietSound':
        if (mode === 'quiet') setQuiet(!S.quietSound);
        if (chipKind === 'sound') chipEl.setAttribute('aria-pressed', String(S.quietSound));
        bed.touch();
        break;
      case 'keepAwake': if (val) wakeFailed = false; syncWake(); break;
      case 'minutes': case 'fade':   // a new timer from now: the light comes back up (2 s), as after "A little longer"
        clock.restart({ minutes: S.minutes, fade: S.fade }); display.rise(2); pacer.event(2000); updateStatus(); break;
      default: break;
    }
    sheet?.sync();
  });
  // lab.js's own listeners run first (registered at start-up); the night tuning and Movement are re-applied after them
  const offPrefs = ctx.prefs.onChange((k) => {
    if (k === 'motion' || k === '*') applyMotion();
    if (k === 'sound' || k === '*') sheet?.sync();   // (stage-screen's Mute button follows the switch itself)
    if ((k === 'nightlight' && !settings.writing) || k === '*') {
      S = settings.reload();
      tune(); applyMotion(); ctx.sound.setTrim(S.volume); syncWake();
      if (mode === 'quiet') setQuiet(!S.quietSound);
    }
  });
  const offDna = ctx.dna.onChange(() => {
    tune();
    lookIn.glowHex = glowHex();
    const next = nightWorld(id, ctx.dna.get('environment'), { temp: S.temp });
    if (next.realmId !== nw.realmId) {
      nw = next;
      bed.setTexture(nw.scene.texture);   // a new world brings its own sound
      if (painted) world.setScene(sceneFor());
    }
  });

  // ------------------------------------------------------------ the settings sheet --
  // Every row previews live behind the sheet; the chrome stays awake while it is open; focus goes back
  // to the sliders button when the person closes it (openSheet itself does not return focus).
  let sheet = null, tempSliding = false;
  function openSettings() {
    if (sheet || dead || leaving || ended) return;
    wakeChrome();
    pacer.touch();
    s.screen.classList.add('nl-sheet-open');   // the caption steps aside (and in landscape the chrome the panel would cut)
    sheet = openNightSheet(s.screen, {
      state: () => ({ settings: S, labReduced: ctx.prefs.reducedMotion(), wakeSupported: wake.supported, wakeFailed,
        soundOn: ctx.prefs.get('sound') !== false, endsAt: clock.endsAt, fading: state === 'fading' }),
      change: (k, v, o) => sheetChange(k, v, o),
      fadeNow: () => { if (!dead && !leaving) clock.stopSoon(); },
      exit: () => leave(),
      turnSoundOn: () => { ctx.prefs.set('sound', true); ctx.sound.unlock(); },
      onClosed: ({ byUser }) => {
        sheet = null;
        s.screen.classList.remove('nl-sheet-open');
        if (tempSliding) { tempSliding = false; if (!dead && !leaving) repaintMood(true); }   // closed mid-slide: the world still takes the Light
        lastInput = performance.now();   // a full 8 s of awake chrome after the sheet
        if (byUser && !dead && !leaving && settingsBtn.isConnected) settingsBtn.focus({ preventScroll: true });
      },
    });
  }
  // persist: 'debounced' while a slider moves, 'now' on release and for choices; live: a slide in progress
  function sheetChange(k, v, { persist = 'now', live = false } = {}) {
    if (dead || leaving) return;
    pacer.touch();   // full frame rate while the person adjusts: the preview follows the finger
    if (k === 'temp') tempSliding = live;
    settings.set(k, v, { persist });
    if (k === 'temp' && !live) repaintMood(true);   // released: the world takes the new Light
  }
  // ------------------------------------------------------------ layout and arrival --
  function onLayout(L) {
    layout.W = L.W; layout.H = L.H; layout.baseline = L.baseline;
    world.resize(L.W, L.H, L.baseline);
    if (!painted) {
      world.setGrade(look.worldGrade, { force: true });
      fadeStep = stepFor(target.u);   // a resumed fade paints at its own step
      if (fadeStep > 0 && nw.mood) nw = { ...nw, mood: nightMood(nw, { temp: S.temp, heavy: fadeStep }) };
      world.setScene(sceneFor(), { instant: true });
      painted = true;
      tryReveal();
    }
    sky.setBody(stableBody());
    statusKey = '';
    updateStatus();
    centerChip();
  }

  let revealed = false, rigReady = false;
  const revealT = setTimeout(() => reveal(), REVEAL_MAX_MS);
  const tryReveal = () => { if (painted && rigReady) reveal(); };
  rig.softReady.then(() => { rigReady = true; tryReveal(); });
  function reveal() {
    if (revealed || dead) return;
    revealed = true;
    clearTimeout(revealT);
    s.screen.classList.remove('nl-entering');   // rises from black (1.2 s; 300 ms with less motion)
    state = clock.phase();
    sighed = display.world < SIGH_AT;           // a resumed late fade does not sigh again
    pacer.event(1500);
    wakeChrome();
    caption(MODES[mode].line, 3000);
    if (fresh) {
      say(COPY.say.start(name, clock.endsAt == null ? null : clockText(clock.endsAt)));
      const g = ways.greet;   // its sleepy greeting, in character
      if (g) api.moments.tl.add(g.at ?? 1.5, () => { if (state !== 'leaving') api.moments.play(g); });
    }
    updateStatus();
  }

  // ------------------------------------------------------------ the frame --
  let lastRev = -1, qAt = 0, unveilPending = false;
  if (fresh) { saveRecord(store, clock); lastRev = clock.rev; }
  rig.on('tick', ({ dt }) => { if (!dead && !ended && !away) tick(dt); });   // the rig has no off(): it dies with this view

  function tick(dt) {
    const t = clock.sync();
    const ph = clock.phase(t);
    if (ph === 'ended') { if (!leaving) finish(); return; }   // a goodnight under way still goes home
    if (revealed && !leaving && ph !== state) enterPhase(ph);
    clock.levels(t, target);
    display.step(dt, target);
    bShow = approach(bShow, S.brightness, EASE_HALF, dt);   // every brightening rises over ≥ 300 ms
    tShow = approach(tShow, S.temp, EASE_HALF, dt);
    lookIn.brightness = bShow;
    lookIn.temp = Math.round(tShow * 20) / 20;              // the light colour changes in small steps (cached sprites)
    lookIn.world = display.world; lookIn.mallow = display.mallow;
    nightLook(lookIn, look);
    rig.setGrade(look.mallowGrade);
    world.setGrade(look.worldGrade);
    capState.mode = mode; capState.phase = state; capState.motion = motion; capState.quality = ctx.quality; capState.worldLevel = display.world;
    pacer.apply(rig, capState);
    warm = approach(warm, holding ? 0.2 : 0, 0.25, dt);     // the glow warms while it is held
    const d = Math.max(ctl.drowsy?.() ?? 0, 1 - display.mallow);
    if (Math.abs(d - baseD) >= 0.02) { baseD = d; applyBase(d); }
    // the fade: asleep below 0.35, one sigh at world 0.25, heavier repaints
    fadeFace();
    if (!sighed && state === 'fading' && display.world < SIGH_AT) { sighed = true; sigh(); }
    else if (sighed && display.world > SIGH_AT + 0.05) sighed = false;   // "A little longer" brought the light back
    applyFadeStep();
    api.moments.step(dt);
    ctl.tick(dt, t);
    face.apply();
    sky.setBody(stableBody());
    sky.setTone(lookIn.glowHex, lookIn.temp);   // its sprites stay on the five authored steps (no new canvases per step)
    sky.setLevels(look.haloAlpha, display.world);
    sky.frame(dt);
    applyTokens();
    if (unveilPending) unveil();   // the first frame back is drawn at the clock's levels, then the veil lifts
    const pn = performance.now();
    soundTick(pn);
    if (!asleep && !leaving && !sheet && pn - lastInput > CHROME_SLEEP_MS && !chromeFocused()) sleepChrome();
    if (clock.rev !== lastRev) { lastRev = clock.rev; saveRecord(store, clock); }
    if (pn - qAt > 1000) {   // the lab may step quality down; pools only shrink
      qAt = pn;
      if (world.quality !== ctx.quality) { world.setQuality(ctx.quality); sky.setQuality(ctx.quality); }
    }
  }

  // the bed (≤ 1 Hz inside), resting the audio when nothing should sound, and the "sound back" chip
  function soundTick(pn) {
    planIn.split = MODES[mode].bed; planIn.silent = quiet; planIn.volume = S.volume; planIn.sound = display.sound;
    planIn.ended = ended; planIn.hidden = away; planIn.leaving = leaving;
    bed.want(bedPlan(planIn, plan));
    bed.setTemp(lookIn.temp);
    bed.tick(pn);
    const snd = ctx.sound;
    if ((quiet || S.volume === 0) && pn - lastTouchAt > REST_IDLE_MS && !snd.resting && snd.ctx?.state === 'running') snd.rest();
    if (snd.ready) returnedAt = 0;
    const paused = returnedAt > 0 && plan.on && !snd.ready && !snd.muted && !snd.resting && !!snd.ctx && pn - returnedAt > SOUND_BACK_MS;
    if (paused !== soundPaused) {
      soundPaused = paused;
      if (paused) { say(COPY.say.soundPaused); wakeChrome(); }   // the chip must be seen (any tap brings the sound back)
      updateStatus();
    }
  }

  function enterPhase(ph) {
    const was = state;
    state = ph;
    if (ph === 'fading' && was !== 'fading') say(COPY.say.fading);
    updateStatus();
    sheet?.sync();   // "Fade out now" hides while fading
  }

  // "A little longer": ten more minutes, the light eases back up over 2 s, the eyes open slowly
  function longer() {
    if (dead || leaving || !clock.extend(EXTEND_MIN)) return false;
    display.rise(2);
    pacer.event(2000);
    if (clock.phase() !== 'fading') enterPhase(clock.phase());
    statusKey = '';
    updateStatus();
    say(COPY.say.longer);
    if (!openEyed) rig.peek(null, null, PEEK_S);   // a sleepy peek; open eyes reopen as the light comes back
    else api.moments.tl.add(1.2, () => { if (!dead && !leaving) rig.overlay('nl-blink', { eyeOpen: 0, closedCurve: 0.8 }, 1.1); });   // then one slow blink
    return true;
  }

  // ------------------------------------------------------------ hidden and back --
  let awayAt = 0, returnedAt = 0, unveilT = 0;
  // a held B or breath chip never hears its release once the page is hidden or loses focus: let go of it here
  const letGo = () => { releaseChip(); ctlEvent({ type: 'lead', source: 'key', on: false }); };
  addEventListener('blur', letGo);
  function hide() {
    if (away || dead) return;
    letGo();
    away = true;
    awayAt = now();
    returnedAt = 0;
    clearTimeout(unveilT); unveilPending = false;
    s.screen.classList.remove('nl-unveil');
    s.screen.classList.add('nl-veiled');   // opacity 0 at once: the first frame back can never be brighter
    clearTimeout(capT); cap.classList.remove('on');
    planIn.hidden = true;
    bed.want(bedPlan(planIn, plan));       // the engine has stopped every voice already; nothing rebuilds while hidden
    // the rig, the Companion, the live realm and the audio stop themselves; the wake lock lets go (ScreenWake)
  }
  function show() {
    if (!away || dead) return;
    away = false;
    if (leaving) { unveil(); return; }
    const t = clock.sync(), ph = clock.phase(t);
    if (ph === 'ended') { finish(true); return; }   // ended while away: the end view, at once and quietly
    // the levels the clock says, applied instantly under the veil (nothing caught up, no burst)
    clock.levels(t, target);
    display.snap(target);
    bShow = S.brightness; tShow = S.temp;
    lookIn.brightness = bShow; lookIn.temp = Math.round(tShow * 20) / 20; lookIn.world = display.world; lookIn.mallow = display.mallow;
    nightLook(lookIn, look);
    rig.setGrade(look.mallowGrade);
    world.setGrade(look.worldGrade, { force: true });
    sky.setLevels(look.haloAlpha, display.world);
    applyFadeStep(true);
    if (display.world < SIGH_AT) sighed = true;    // the sigh was missed while away: never played late
    if (revealed && ph !== state) enterPhase(ph);
    if (!asleep) lastInput = performance.now();     // awake chrome gets its full 8 s
    returnedAt = performance.now();
    pacer.event(1500);
    wake.refresh();
    // its "still here" sign after a while away (not while it sleeps, not with Movement Still)
    if ((now() - awayAt) / 1000 > STILL_HERE_S && display.mallow >= ASLEEP_AT && motion !== 'still' && ways.stillHere) {
      api.moments.tl.add(0.9, () => { if (!dead && !leaving && !away) api.moments.play(ways.stillHere); });
    }
    unveilPending = true;
    unveilT = setTimeout(unveil, UNVEIL_MAX_MS);   // if no frame comes (rig not ready), lift it anyway
  }
  function unveil() {
    unveilPending = false;
    clearTimeout(unveilT);
    if (dead || away) return;
    s.screen.classList.add('nl-unveil');           // a 600 ms opacity rise
    s.screen.classList.remove('nl-veiled');
  }
  const onVis = (e) => {
    const gone = document.hidden || e?.type === 'pagehide' || e?.type === 'freeze';
    if (gone) hide(); else show();
  };
  document.addEventListener('visibilitychange', onVis);
  document.addEventListener('freeze', onVis);
  document.addEventListener('resume', onVis);
  addEventListener('pagehide', onVis);
  addEventListener('pageshow', onVis);

  // ------------------------------------------------------------ leaving and the end --
  let leaveT = 0, deliberate = false;
  function leave() {
    if (leaving || dead) return;
    leaving = true;
    state = 'leaving';
    deliberate = true;
    sheet?.close({ quiet: true });
    clearRecord(store);
    s.screen.classList.add('nl-leaving');   // only ever gets darker
    pacer.event(LEAVE_MS + 200);
    rig.react('nod');
    facade.voice(id, 'content', 0.3);       // silent in silent Quiet (the facade is quiet)
    bed.end(0.5);
    syncWake();
    leaveT = setTimeout(() => ctx.navigate('/'), LEAVE_MS);
  }

  // At endsAt: the bed lets go (2 s), the wake lock too, the sleeping face is kept for the end view,
  // then the stage is torn down. `skip`: ended while away, or the fade was not seen (a clock jump): quietly.
  function finish(skip = false) {
    if (ended || dead) return;
    ended = true;
    state = 'ended';
    sheet?.close({ quiet: true });
    const skipped = skip || display.mallow > SKIP_ABOVE;
    bed.end(skipped ? 0.4 : 2);
    syncWake();
    let snap = null, snapBase = null;
    if (!skipped) {
      try {   // the sleeping face, at its graded brightness, for the end view
        const src = rig.canvas;
        if (src.width && src.height) {
          snap = document.createElement('canvas'); snap.width = src.width; snap.height = src.height; snap.getContext('2d').drawImage(src, 0, 0);
          snapBase = { base: rig.BASE, H: rig.H };
        }
      } catch { snap = null; }
    }
    // after the rig's own tick has returned: the end view tears the rig down
    queueMicrotask(() => { if (!dead) onEnd({ endsAt: clock.endsAt, skipped, snap, snapBase }); });
  }

  syncWake();
  if (document.hidden) hide();

  // ------------------------------------------------------------ debug --
  const view = {
    kind: 'session',
    get state() { return state; },
    get mode() { return mode; },
    get settings() { return S; },
    get motion() { return motion; },
    clock, look, world, sky, bed, wake, face, pacer, limiter,
    get levels() { return { world: display.world, mallow: display.mallow, sound: display.sound }; },
    get moments() { return api.moments; },
    get modeCtl() { return ctl; },
    get sheet() { return sheet; },
    openSettings,
    setMode,
    set(k, val) { if (k === 'mode') { setMode(val); return mode === val; } return settings.set(k, val, { persist: 'now' }); },
    force(kind) { ctl.script?.force(kind); },
    fadeNow() { return clock.stopSoon(); },
    longer,
    sleepChrome,
    debug() {
      const t = clock.sync();
      return {
        state, mode, phase: clock.phase(t), endsAt: clock.endsAt, fadeFrom: clock.fadeFrom,
        remainingS: Number.isFinite(clock.remaining(t)) ? Math.round(clock.remaining(t) / 1000) : null,
        levels: { world: +display.world.toFixed(4), mallow: +display.mallow.toFixed(4), sound: +display.sound.toFixed(4) },
        cap: rig.frameCap, renders: rig.renders, live: world.isLive, realm: world.realmId, plain: world.plain,
        bed: bed.debug(), sound: ctx.sound.debug(),
        wake: { supported: wake.supported, wanted: wake.wanted, held: wake.held, failed: wakeFailed, requests: wake.requests },
        chromeAsleep: asleep, veiled: s.screen.classList.contains('nl-veiled'), away, quality: ctx.quality, motion, quiet,
        chip: chipKind, sheet: !!sheet, sky: sky.debug(), world: world.debug(), drowsy: ctl.drowsy?.() ?? null,
        fade: { asleep: restAsleep, step: fadeStep, sighed, eyeOpen: eyeSet, blinkRate: blinkSet, motionScale: +fadeMs.toFixed(3), inflate: +inflK.toFixed(3) },
        sr: sr.log,
      };
    },
    unmount() {
      dead = true;
      clearTimeout(revealT); clearTimeout(capT); clearTimeout(leaveT); clearTimeout(unveilT);
      presses.dispose();
      document.removeEventListener('visibilitychange', onVis);
      document.removeEventListener('freeze', onVis);
      document.removeEventListener('resume', onVis);
      removeEventListener('pagehide', onVis);
      removeEventListener('pageshow', onVis);
      removeEventListener('blur', letGo);
      unguard?.();
      offPrefs(); offDna(); offSettings();
      s.screen.removeEventListener('focusin', wakeChrome);
      modeRow.removeEventListener('scroll', fades);
      sheet?.close({ quiet: true });
      ctl.stop();
      api.moments.clear();
      companion.persona.setFilter(null);
      rig.setFrameCap(null);
      rig.setGrade([1, 1, 1]);
      rig.peekParams = null;
      if (field && Object.hasOwn(field, 'spawn')) delete field.spawn;   // back to the field's own spawn
      face.clear();
      bed.destroy();
      ctx.sound.setTrim(1);
      wake.destroy();
      world.destroy();
      sky.destroy();
      settings.destroy();
      sr.destroy();
      // a deliberate exit forgets the session; anything else can resume within 5 s; an ended one shows its end view on reload
      if (!deliberate) saveRecord(store, clock, ended ? undefined : now());
      s.unmount();
    },
  };
  return view;
}

// ================================================================ the end --
function endView(root, ctx, { endsAt, skipped = false, snap = null, snapBase = null, now, onAgain, onDone }) {
  const mallow = MALLOWS[ctx.mallowId];
  const lines = mallow.voice?.rest || [];
  const line = lines.length ? lines[hash(`${ctx.mallowId}:${endsAt}`) % lines.length] : '';
  const at = Number.isFinite(endsAt) ? endsAt : now();
  const screen = h('section', { class: 'screen nightlight nl-end', 'data-backdrop': 'dark', 'aria-label': COPY.aria.endCard });
  if (snap) { snap.className = 'nl-snap'; snap.setAttribute('aria-hidden', 'true'); screen.append(snap); }
  const again = h('button', { type: 'button', class: 'chip primary', onclick: () => onAgain() }, COPY.buttons.again);
  const done = h('button', { type: 'button', class: 'chip', onclick: () => onDone() }, COPY.buttons.done);
  const card = h('div', { class: 'end-card nl-endcard', role: 'group', 'aria-label': COPY.aria.endCard },
    h('p', { class: 'end-cap' }, endTitle(at, new Date(now()).getHours())),
    line ? h('p', { class: 'end-line' }, COPY.end.line(line, mallow.name)) : null,
    h('div', { class: 'end-actions' }, again, done));
  screen.append(card);
  root.append(screen);
  // the sleeping Mallow sits just above the card (the card is taller than the stage's bottom area)
  if (snap && snapBase?.H > 0) {
    const scale = (screen.clientHeight || snapBase.H) / snapBase.H, feet = snapBase.base * scale;
    const lift = Math.max(0, feet - (card.offsetTop - 16));
    if (lift > 0) snap.style.transform = `translateY(${-Math.round(lift)}px)`;
  }
  const sr = announcer(screen);
  sr.say(COPY.say.ended);
  // nothing runs here: the audio rests, at once after a quiet end, else 2.2 s later, when the bed has faded
  // out (or a one-shot still sounding has ended). A resume the engine started on becoming visible ends in
  // suspend once rest() has been asked for (SoundEngine, CR-N1). A tap here resumes the audio (lab.js), so it
  // re-arms the rest.
  let restT = 0;
  const rest = () => { restT = 0; if ([...ctx.sound.live].some((v) => !v.keep)) return false; ctx.sound.rest(); return true; };
  const restLater = () => { clearTimeout(restT); restT = setTimeout(rest, REST_AFTER_END_MS); };
  if (!(skipped && rest())) restLater();
  // the card rests at 0.35; a touch or a key lifts it to full for 8 s
  let dimT = 0, raf = 0;
  const lift = () => { card.classList.add('lit'); clearTimeout(dimT); dimT = setTimeout(() => card.classList.remove('lit'), CARD_DIM_MS); restLater(); };
  const key = (e) => { if (e.key === 'Escape') { e.preventDefault(); onDone(); return; } lift(); };
  screen.addEventListener('pointerdown', lift, { passive: true });
  document.addEventListener('keydown', key);
  if (skipped) { card.style.transition = 'none'; card.classList.add('on'); }
  else raf = requestAnimationFrame(() => { raf = 0; card.classList.add('on'); });
  again.focus({ preventScroll: true });
  return {
    kind: 'end',
    get state() { return 'ended'; },
    debug() { return { state: 'ended', endsAt, skipped, snap: !!snap, line, sr: sr.log, resting: ctx.sound.resting, lift: snap?.style.transform || '' }; },
    unmount() {
      clearTimeout(dimT); clearTimeout(restT);
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', key);
      screen.removeEventListener('pointerdown', lift);
      sr.destroy();
      if (snap) { snap.width = 0; snap.height = 0; }
      screen.remove();
    },
  };
}
