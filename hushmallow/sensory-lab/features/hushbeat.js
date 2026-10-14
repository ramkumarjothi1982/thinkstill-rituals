// FEATURE — Hushbeat Symphony (#hushbeat): make music by touching a Mallow.
//
// The Mallow is the instrument. Every touch on its body sounds at once (onset
// at contact), and the gesture decides what that note becomes: a tap lets it
// ring, a double tap rolls it into a chord, a hold blooms it into a hum, a
// squeeze or a press down ducks it under a warm bass, a stroke turns it into a
// phrase on the Mallow's own grid, and a drag up bends it. A long still press
// off the body (or B, or the Breathe chip) leads the breath: the in-breath
// opens the hums, and the measured breath sets the tempo from the next bar.
// Close resolves the music home with a short cadence and a nod.
//
// Built on the shared engine: stage-screen (a quiet Companion: the music is
// its voice), the pointer router's watchPresses (breath lead), one EffectsLayer
// whose first item is this screen's per-frame work (no extra rAF), and the
// music modules: core/music-time.js (breath clock, scheduler, take),
// core/music-engine.js (the conductor), core/music-audio.js + music-kits.js
// (the sound), features/hushbeat/player.js (gestures → music).
//
// Nothing plays before a gesture (the SoundEngine refuses). Visual only
// (prefs.musicVisualOnly) runs the identical music with the sound bus closed.

import { h, icon, holdButton } from '../lab-ui.js';
import { stageScreen } from './stage-screen.js';
import { quietSound } from '../core/sound-engine.js';
import { BreathClock, Scheduler } from '../core/music-time.js';
import { MusicEngine } from '../core/music-engine.js';
import { MusicAudio } from '../core/music-audio.js';
import { chordAt } from '../core/music-theory.js';
import { EffectsLayer } from '../core/effects.js';
import { watchPresses } from '../core/pointer-router.js';
import { softened } from '../core/personality.js';
import { BREATH, PACES } from '../core/comfort-dna.js';
import { rng } from '../core/math.js';
import { MALLOWS } from '../../src/mallows/registry.js';
import { Player } from './hushbeat/player.js';
import { COPY } from './hushbeat/copy.js';

export const meta = { id: 'hushbeat', title: COPY.meta };

const DPR = { high: 1.5, medium: 1.25, low: 1 };
const LOG_MAX = 128;           // engine events kept for debugging and tests
const QUIET_S = 8;             // no music for this long: back to listening (and Close leaves at once)
const ROLE_GAP_S = 1.5;        // Visual only names every role, at most this often
const LEAVE_MS = [720, 800];   // the cadence plays, the screen fades from 300 ms over 420 ms, then home
const perf = () => performance.now() / 1000;

export function mount(root, ctx, { handoff = null } = {}) {
  const lead = ctx.mallowId, M = MALLOWS[lead];
  const prefs = ctx.prefs, sound = ctx.sound;
  let tuning = ctx.dna.tuning(), reduced = prefs.reducedMotion(), quality = ctx.quality;
  let visualOnly = !!prefs.get('musicVisualOnly');
  let pace = PACES.includes(handoff?.pace) ? handoff.pace : (PACES.includes(ctx.dna.get('animationSpeed')) ? ctx.dna.get('animationSpeed') : 'natural');
  let state = 'listening';     // listening | playing | leaving
  let gone = false, leaveT = 0, wasReady = false, qT = 0, lastTouch = perf();
  const said = new Set();
  let saidT = -Infinity;
  const breaths = new Set();   // who leads the breath right now: 'key', 'chip', 'press:<pointerId>'

  // ------------------------------------------------------------ music --
  const clock = new BreathClock({ ...BREATH[pace], now: perf });
  const scheduler = new Scheduler({ now: perf });
  const audio = new MusicAudio(sound, { quality, now: perf });
  audio.setAttached(!visualOnly);
  const log = [];
  const engine = new MusicEngine({
    clock, scheduler, now: perf, sink: audio, quality, gentle: tuning.style === 'gentle', rand: rng(7), onEvent,
  });
  const players = [];

  // ------------------------------------------------------------ stage --
  const s = stageScreen(root, ctx, {
    title: COPY.title, subtitle: COPY.subtitle(M.name, null, visualOnly),
    backdrop: ctx.dna.environment('moment', lead),
    settings: false, feedback: false, sound: quietSound(sound),
    onExit: () => leave(), keys, onGesture, stageLabel: COPY.aria.stage,
  });
  s.screen.classList.add('hushbeat');
  const subtitle = s.screen.querySelector('.topbar .title small');

  const part0 = engine.part(0, lead);
  audio.setPart(0, part0);
  players[0] = new Player(part0, { geo: geoOf(s.companion), now: perf });

  // ---------------------------------------------------------- controls --
  const hint = h('p', { class: 'hint hb-hint' },
    ...COPY.hint.flatMap(([b, rest], i) => [i ? ' · ' : '', h('b', {}, b), h('span', { class: 'hb-long' }, rest)]));
  const act = (kind) => () => { if (state !== 'leaving') target().act(kind); };
  const tray = h('div', { class: 'chips wrap hb-tray', role: 'group', 'aria-label': COPY.aria.tray, hidden: true },
    h('button', { type: 'button', class: 'chip', onclick: act('tap') }, COPY.chips.note),
    h('button', { type: 'button', class: 'chip', onclick: act('double') }, COPY.chips.chord),
    h('button', { type: 'button', class: 'chip', onclick: act('stroke') }, COPY.chips.tune),
    holdButton(COPY.chips.bass, act('squeezeStart'), () => target().act('squeezeEnd')),
    holdButton(COPY.chips.hum, act('holdStart'), () => target().act('holdEnd')),
    holdButton(COPY.chips.breathe, () => breathIn('chip'), () => breathOut('chip')));
  const buttons = h('button', {
    type: 'button', class: 'chip hb-buttons', 'aria-pressed': 'false', title: COPY.chips.buttons,
    html: `${icon('hand')}<span>${COPY.chips.buttons}</span>`,
    onclick: () => {
      const show = tray.hidden;
      tray.hidden = !show;
      buttons.setAttribute('aria-pressed', String(show));
      edges();
    },
  });
  const row = h('div', { class: 'chips hb-row', role: 'group', 'aria-label': COPY.aria.row }, buttons);
  s.bottom.append(hint, tray, row);
  // a single-row tray (short screens) fades its edges while there is more to scroll
  const edges = () => {
    const max = tray.scrollWidth - tray.clientWidth;
    tray.classList.toggle('fade-l', max > 2 && tray.scrollLeft > 2);
    tray.classList.toggle('fade-r', max > 2 && tray.scrollLeft < max - 2);
  };
  tray.addEventListener('scroll', edges, { passive: true });

  // the lead, or the Mallow whose stage has keyboard focus
  function target() { const i = s.stages.indexOf(document.activeElement); return s.companions[i > 0 ? i : 0]; }
  const slotOf = (c) => Math.max(0, s.companions.indexOf(c));

  // ----------------------------------------------------- input → music --
  function onGesture(type, d, c) {
    if (state === 'leaving' || gone) return;
    const p = players[slotOf(c)];
    if (!p) return;
    lastTouch = perf();
    p.gesture(type, d);
    if (type === 'tap') say('note');
  }

  function onEvent(ev) {
    const copy = { ...ev };
    log.push(copy);
    if (log.length > LOG_MAX) log.shift();
    if (ev.ghost) return;
    switch (ev.kind) {
      case 'padOn': say('hum'); break;
      case 'bassOn': say('bass'); break;
      case 'bend': if (ev.start) say('glide'); break;
      case 'note':
        if (ev.src === 'chord') say('chord');
        else if (ev.src === 'phrase' && !ev.immediate) say('tune');
        break;
      default:
    }
    if (ev.kind === 'note' || ev.kind === 'padOn' || ev.kind === 'bassOn') {
      if (state === 'listening') state = 'playing';
      hint.classList.add('gone');
    }
  }

  // the feedback chip names a role the first time it is used; with the sound off, every time (≤ 1 per 1.5 s)
  function say(role) {
    const t = perf(), text = COPY.roles[role];
    if (!text) return;
    if (said.has(role) && !(visualOnly || !audio.ready) ) return;
    if (said.has(role) && t - saidT < ROLE_GAP_S) return;
    said.add(role); saidT = t;
    s.feedback.show(text);
  }

  // digit keys play exact degrees; B (held) leads the breath. Built-in keys reach the players through act().
  function keys(e, k, phase) {
    if (state === 'leaving') return k !== 'escape';
    const ae = document.activeElement, onStage = !ae || ae === document.body || s.stages.includes(ae);
    const dm = /^(?:Digit|Numpad)([1-9])$/.exec(e.code || '');
    if (dm) {
      if (!onStage) return false;
      e.preventDefault();
      if (phase === 'down' && !e.repeat && +dm[1] <= 7) {
        lastTouch = perf();
        players[slotOf(target())]?.degree(+dm[1]);
        say('note');
      }
      return true;
    }
    if (k === 'b' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (phase === 'down') { if (!e.repeat) breathIn('key'); } else breathOut('key');
      return true;
    }
    return false;
  }

  // ----------------------------------------------------- breath lead --
  function breathIn(src) {
    if (state === 'leaving' || gone) return;
    lastTouch = perf();
    if (!breaths.size) { clock.lead('in', perf()); say('breath'); hint.classList.add('gone'); }
    breaths.add(src);
  }
  function breathOut(src) {
    if (!breaths.delete(src) || breaths.size) return;
    clock.lead('out', perf());
  }
  const onAnyBody = (e) => s.companions.some((c, i) => {
    const r = s.stages[i]?.getBoundingClientRect();
    return r && c.rig.hitTest(e.clientX - r.left, e.clientY - r.top);
  });
  const presses = watchPresses(s.screen, {
    stage: s.stage, ms: 300, slop: 12,
    onBody: (p, e) => onAnyBody(e),
    onPress: (p0, id) => {
      const t = performance.now();
      for (const c of s.companions) c.gestures.recognizer.cancel(id, t);   // it was a press, not a touch
      breathIn(`press:${id}`);
    },
    onRelease: (id) => breathOut(`press:${id}`),
  });

  // ------------------------------------------------------------ frame --
  const cs = {};   // clock.at() output, reused
  const busy = (c) => c.gestures.recognizer.p.size > 0 || !!(c.hold || c.drag || c.sq || c.stroking || c.wheel.active);
  function frame() {
    if (gone) return;
    const t = perf();
    clock.at(t, cs);
    audio.frame(cs.level);
    // unmute, or Visual only off, while a layer is held: bring it back
    const ready = audio.ready;
    if (ready && !wasReady) audio.reconcile(engine.layers());
    wasReady = ready;
    for (let i = 0; i < players.length; i++) { const c = s.companions[i]; if (c && players[i]) players[i].watchdog(t, busy(c)); }
    // the breath you can see: the Mallow fills and empties with it (and follows a leading finger)
    const k = reduced ? 0.4 : 0.8;
    for (const c of s.companions) c.rig.setInflate(cs.level * k);
    if (state === 'playing' && t - engine.lastMusicT > QUIET_S && !engine.parts.some((p) => p.pad || p.bass)) state = 'listening';
    if (t - qT > 1) { qT = t; if (ctx.quality !== quality) setQuality(ctx.quality); }
  }
  const fx = new EffectsLayer(s.screen, { quality, reducedMotion: reduced, dprCap: DPR[quality] || 1 });
  fx.add({ step() { frame(); return true; }, draw() {} });

  function setQuality(q) {
    quality = q;
    engine.setQuality(q);
    audio.setQuality(q);
    fx.setDprCap(DPR[q] || 1);
  }

  // -------------------------------------------------------- settings --
  function setVisual(b) {
    visualOnly = !!b;
    audio.setAttached(!visualOnly);
    subtitle.textContent = COPY.subtitle(M.name, null, visualOnly);
    if (visualOnly) s.feedback.show(COPY.say.soundOff);
  }
  function setPace(p) {
    if (!PACES.includes(p)) return;
    pace = p;
    clock.setTiming(BREATH[p]);
  }
  const offPrefs = prefs.onChange((k) => {
    if (k === 'musicVisualOnly' || k === '*') { if (!!prefs.get('musicVisualOnly') !== visualOnly) setVisual(prefs.get('musicVisualOnly')); }
    if (k === 'motion' || k === '*') { reduced = prefs.reducedMotion(); fx.reduced = reduced; }
  });
  const offDna = ctx.dna.onChange(() => {
    tuning = ctx.dna.tuning();
    engine.setGentle(tuning.style === 'gentle');
  });

  // ------------------------------------------------- hidden and leaving --
  function onVisibility() {
    if (!document.hidden) return;
    scheduler.stop();
    engine.releaseAll();
    for (const p of players) p.reset();
    breaths.clear();
    clock.unlead(perf());
    if (state !== 'leaving') state = 'listening';
  }
  document.addEventListener('visibilitychange', onVisibility);

  const audible = () => !visualOnly && audio.ready;
  const go = () => { if (gone) return; gone = true; ctx.navigate('/'); };
  // Close or Escape: the music resolves home (≤ 0.8 s) with a nod, then home. A second Escape, silence
  // for 8 s, the Mallow's voice off or no sound: straight home.
  function leave() {
    if (state === 'leaving') { go(); return; }
    const t = perf(), quiet = t - engine.lastMusicT > QUIET_S && !engine.parts.some((p) => p.pad || p.bass);
    state = 'leaving';
    engine.releaseAll();
    for (const p of players) p.reset();
    breaths.clear();
    if (quiet || tuning.voice === false || !audible()) { go(); return; }
    const secs = engine.cadence();
    for (const c of s.companions) c.rig.react(softened('nod', { gentle: tuning.style === 'gentle', reduced }));
    s.screen.classList.add('hb-leaving');
    leaveT = setTimeout(go, Math.min(LEAVE_MS[1], Math.max(LEAVE_MS[0], secs * 1000 + 60)));
  }

  s.stage.focus({ preventScroll: true });   // keyboard gestures and keys work straight away

  // ------------------------------------------------------ debug handle --
  const handle = {
    get state() { return state; },
    engine, clock, scheduler, audio, players, log, router: presses,
    debug() {
      const t = perf(), at = clock.at(t, {}), ch = chordAt(part0.V, at.bar), best = engine.take.best();
      return {
        state, bpm: +at.bpm.toFixed(2), bar: at.bar, beat: +at.beat.toFixed(3), chord: { root: ch.root, tones: [...ch.tones] }, pace,
        breath: { level: +at.level.toFixed(3), phase: at.phase, leading: at.leading, target: +clock.target.toFixed(3) },
        scheduler: { running: scheduler.running, pending: scheduler.pending },
        players: players.map((p, i) => ({ slot: i, mallow: p.part.mallowId, state: p.state, ...p.part.state })),
        voices: audio.voices, live: sound.live.size, audible: audible(), visualOnly, muted: !!sound.muted,
        friend: null, take: engine.take.length, best: best ? best.length : 0, replaying: engine.replaying,
        quality, audio: audio.debug(), latency: audio.outputLatency(),
      };
    },
    setPace,
    setVisualOnly(b) { prefs.set('musicVisualOnly', !!b); },
  };
  if (globalThis.__lab) globalThis.__lab.hushbeat = handle;

  return {
    unmount() {
      gone = true;
      clearTimeout(leaveT);
      scheduler.stop();
      engine.dispose();
      audio.dispose();
      for (const c of s.companions) c.rig.setInflate(0);
      fx.destroy();
      presses.dispose();
      document.removeEventListener('visibilitychange', onVisibility);
      tray.removeEventListener('scroll', edges);
      offPrefs();
      offDna();
      if (globalThis.__lab?.hushbeat === handle) globalThis.__lab.hushbeat = null;
      s.unmount();
    },
  };
}

// The body in stage px for a Player (bodyRect into one reused object; called per gesture, not per frame).
function geoOf(c) {
  const r = {}, g = { cx: 0, base: 0, w: 0, h: 0 };
  return () => {
    if (!c.rig?.bodyRect) return null;
    c.rig.bodyRect(r);
    g.cx = r.cx; g.base = r.bottom; g.w = r.w; g.h = r.h;
    return g;
  };
}
