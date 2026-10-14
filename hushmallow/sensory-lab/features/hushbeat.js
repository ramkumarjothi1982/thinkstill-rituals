// FEATURE — Hushbeat Symphony (#hushbeat): make music by touching a Mallow.
//
// The Mallow is the instrument. Every touch on its body sounds at once (onset
// at contact), and the gesture decides what that note becomes: a tap lets it
// ring, a double tap rolls it into a chord, a hold blooms it into a hum, a
// squeeze or a press down ducks it under a warm bass, a stroke turns it into a
// phrase on the Mallow's own grid, and a drag up bends it. A long still press
// off the body (or B, or the Breathe chip) leads the breath: the in-breath
// opens the hums, and the measured breath sets the tempo from the next bar.
//
// The Mallow performs what it plays: it sings its notes, glows with a hum,
// puffs its cheeks with the bass and moves to the beat in its own way, inside
// a faint ring that breathes with the tempo, while its world warms and clears
// with the music. Replay has it sing the take back, proudly; ★ Keep saves the
// tune (a kept tune opens from home with Play it, and never plays by itself).
// Close resolves the music home with a short cadence and a goodbye in character.
//
// Built on the shared engine: stage-screen (a quiet Companion: the music is
// its voice; its realm through s.env), the pointer router's watchPresses
// (breath lead), one EffectsLayer whose first item is this screen's per-frame
// work (no extra rAF) and whose second is the scene, one FlashGate for the
// realm and the light, and the music modules: core/music-time.js (breath
// clock, scheduler, take, tune codec), core/music-engine.js (the conductor),
// core/music-audio.js + music-kits.js (the sound), core/music-fx.js (the
// light), features/hushbeat/player.js (gestures → music) and performer.js
// (the Mallow and the scene).
//
// Nothing plays before a gesture (the SoundEngine refuses). Visual only
// (prefs.musicVisualOnly) runs the identical music with the sound bus closed.

import { h, icon, holdButton } from '../lab-ui.js';
import { stageScreen } from './stage-screen.js';
import { quietSound } from '../core/sound-engine.js';
import { BreathClock, Scheduler, encodeMotif, decodeMotif } from '../core/music-time.js';
import { MusicEngine } from '../core/music-engine.js';
import { MusicAudio } from '../core/music-audio.js';
import { chordAt } from '../core/music-theory.js';
import { EffectsLayer, FlashGate, surfaceTone, clearGlowSprites } from '../core/effects.js';
import { PULSE_GAPS } from '../core/environment.js';
import { watchPresses } from '../core/pointer-router.js';
import { BREATH, PACES, FAV_CAP } from '../core/comfort-dna.js';
import { rng } from '../core/math.js';
import { MALLOWS } from '../../src/mallows/registry.js';
import { Player } from './hushbeat/player.js';
import { Performer, Scene, Cue } from './hushbeat/performer.js';
import { COPY } from './hushbeat/copy.js';

export const meta = { id: 'hushbeat', title: COPY.meta };

const DPR = { high: 1.5, medium: 1.25, low: 1 };
const LOG_MAX = 128;           // engine events kept for debugging and tests
const QUIET_S = 8;             // no music for this long: back to listening (and Close leaves at once)
const REST_S = 40;             // listening and untouched for this long: resting
const ROLE_GAP_S = 1.5;        // Visual only names every role, at most this often
const LEAVE_MS = [720, 800];   // the cadence plays, the screen fades from 300 ms over 420 ms, then home
const REACTS = new Set(['tap', 'doubletap', 'holdend', 'dragend', 'squeezeend', 'strokeend']);   // the Companion reacts: the groove pauses
const perf = () => performance.now() / 1000;

export function mount(root, ctx, { handoff = null } = {}) {
  const lead = ctx.mallowId, M = MALLOWS[lead];
  const prefs = ctx.prefs, sound = ctx.sound;
  let tuning = ctx.dna.tuning(), reduced = prefs.reducedMotion(), quality = ctx.quality;
  let visualOnly = !!prefs.get('musicVisualOnly');
  let pace = PACES.includes(handoff?.pace) ? handoff.pace : (PACES.includes(ctx.dna.get('animationSpeed')) ? ctx.dna.get('animationSpeed') : 'natural');
  let state = 'listening';     // listening | playing | resting | replaying | leaving
  let gone = false, leaveT = 0, longT = 0, wasReady = false, wasStrong = null, qT = 0, rowT = 0, lastTouch = perf();
  let restAfter = REST_S, replayH = null, playItOn = false, rowSig = '', favSig = 0, keepItem = null;
  const said = new Set();
  let saidT = -Infinity;
  const breaths = new Set();   // who leads the breath right now: 'key', 'chip', 'press:<pointerId>'

  // ------------------------------------------------------------ music --
  const clock = new BreathClock({ ...BREATH[pace], now: perf });
  const scheduler = new Scheduler({ now: perf });
  const audio = new MusicAudio(sound, { quality, now: perf });
  audio.setAttached(!visualOnly);
  const audible = () => !visualOnly && audio.ready;   // sound can be heard now (not Visual only, unlocked, not muted)
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
    onExit: () => leave(), keys, onGesture, onLayout, stageLabel: COPY.aria.stage,
  });
  s.screen.classList.add('hushbeat');
  const subtitle = s.screen.querySelector('.topbar .title small');

  const part0 = engine.part(0, lead);
  audio.setPart(0, part0);
  players[0] = new Player(part0, { geo: geoOf(s.companion), now: perf });
  // the Companions and their stages, by slot (kept here: s.companions builds a new array on every read)
  const comps = [s.companion], stages = [s.stage];
  const offs = [{ x: 0, y: 0 }, { x: 0, y: 0 }];   // each stage's offset in the effects layer (screen px)

  // ------------------------------------------------- light and movement --
  const flash = new FlashGate({ max: 3, gaps: PULSE_GAPS });   // one photosafe budget: beads, arcs and the realm's pulses
  s.env.gate = flash;
  const fx = new EffectsLayer(s.screen, { quality, reducedMotion: reduced, dprCap: DPR[quality] || 1 });
  // the Mallow's light: its glow for the ring around it, its accent for the beads and trail (they cross its body,
  // so they need a colour of their own); a Comfort DNA palette replaces both
  const pal = ctx.dna.palette(), color = pal?.glow || M.colours.glow, accent = pal?.soft || M.colours.accent;
  let tone = surfaceTone(s.screen);
  const scene = new Scene({ env: s.env, gate: flash, tone, reduced, quality, now: perf });
  scene.layer = fx;
  const performers = [new Performer({ companion: s.companion, slot: 0, pool: scene.pool, off: offs[0], color: accent, reduced, tuning, now: perf })];
  scene.setPerformers([{ performer: performers[0], off: offs[0], color, accent }]);
  const cue = new Cue(64);   // scheduled events wait to be seen until they are heard

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
    type: 'button', class: 'chip hb-buttons', 'aria-pressed': 'false', title: COPY.chips.buttons, 'aria-label': COPY.chips.buttons,
    html: `${icon('hand')}<span>${COPY.chips.buttons}</span>`,
    onclick: () => {
      const show = tray.hidden;
      tray.hidden = !show;
      buttons.setAttribute('aria-pressed', String(show));
      edges();
    },
  });
  // Play it: a kept tune opened from home, ready but silent until tapped
  const playIt = h('button', { type: 'button', class: 'chip primary hb-playit', hidden: true, html: `${icon('note')}<span>${COPY.chips.playIt}</span>`, onclick: () => playKept() });
  const replayBtn = h('button', { type: 'button', class: 'chip hb-replay', 'aria-pressed': 'false', hidden: true, onclick: () => toggleReplay() });
  const keepBtn = h('button', { type: 'button', class: 'chip hb-keep', 'aria-pressed': 'false', hidden: true, onclick: () => keep() });
  const row = h('div', { class: 'chips hb-row', role: 'group', 'aria-label': COPY.aria.row }, playIt, buttons, replayBtn, keepBtn);
  s.bottom.append(hint, tray, row);
  // a single-row tray (short screens) fades its edges while there is more to scroll
  const edges = () => {
    const max = tray.scrollWidth - tray.clientWidth;
    tray.classList.toggle('fade-l', max > 2 && tray.scrollLeft > 2);
    tray.classList.toggle('fade-r', max > 2 && tray.scrollLeft < max - 2);
  };
  tray.addEventListener('scroll', edges, { passive: true });

  // the lead, or the Mallow whose stage has keyboard focus
  function target() { const i = stages.indexOf(document.activeElement); return comps[i > 0 ? i : 0]; }
  const slotOf = (c) => Math.max(0, comps.indexOf(c));

  // each stage's place in the screen (the effects layer covers the screen); after every reframe
  function onLayout() {
    if (gone) return;
    const sr = s.screen.getBoundingClientRect();
    for (let i = 0; i < stages.length; i++) { const r = stages[i].getBoundingClientRect(); offs[i].x = r.left - sr.left; offs[i].y = r.top - sr.top; }
  }

  // a kept tune from home "For you": its pace is already set; its notes wait for Play it
  const kept = decodeMotif(handoff?.motif);
  if (kept) {
    engine.take.load(kept);
    playItOn = !!engine.take.best();
    playIt.hidden = !playItOn;
  }

  // ----------------------------------------------------- input → music --
  function touched() { lastTouch = perf(); if (state === 'resting') rest(false); }

  function onGesture(type, d, c) {
    if (state === 'leaving' || gone) return;
    const i = slotOf(c), p = players[i];
    if (!p) return;
    touched();
    p.gesture(type, d);
    if (type === 'tap') say('note');
    // the light follows a stroking finger (buttons and keys stroke too)
    if (type === 'strokestart' || type === 'stroke') scene.stroke(i, type === 'strokestart' ? 'start' : 'move', d.x + offs[i].x, d.y + offs[i].y);
    else if (type === 'strokeend') scene.stroke(i, 'end');
    if (REACTS.has(type)) performers[i]?.suppress();
  }

  function onEvent(ev) {
    const copy = { ...ev };
    log.push(copy);
    if (log.length > LOG_MAX) log.shift();
    if (gone) return;
    if (ev.kind === 'replay') replayChanged(ev);
    if (!ev.ghost) {
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
        if (state === 'resting') rest(false);
        if (state === 'listening') state = 'playing';
        hint.classList.add('gone');
        rowT = 0;   // the take may have grown: the row catches up on the next frame
      }
    }
    // seen when it is heard: a touch at once, a scheduled event at its time plus the output latency
    if (ev.immediate) show(ev);
    else cue.push(ev, ev.t + (audible() ? audio.outputLatency() : 0), show);
  }

  // an event at its moment: the Mallow that played it, and the light
  function show(ev, due = ev.t) {
    if (gone) return;
    const at = perf();
    if (ev.kind === 'harmony') { performers[ev.a]?.apply(ev, at, due); performers[ev.b]?.apply(ev, at, due); }
    else performers[ev.slot]?.apply(ev, at, due);
    scene.apply(ev);
    if (ev.kind === 'replay' && !ev.on && ev.done) for (const p of performers) p.proud();
  }

  // the feedback chip names a role the first time it is used; with the sound off, every time (≤ 1 per 1.5 s)
  function say(role) {
    const t = perf(), text = COPY.roles[role];
    if (!text) return;
    if (said.has(role) && audible()) return;
    if (said.has(role) && t - saidT < ROLE_GAP_S) return;
    said.add(role); saidT = t;
    s.feedback.show(text);
  }
  // a longer message stays up twice as long (the chip fades after about a second)
  function sayLong(text) {
    s.feedback.show(text);
    clearTimeout(longT);
    longT = setTimeout(() => { if (!gone) s.feedback.show(text); }, 1000);
  }

  // digit keys play exact degrees; B (held) leads the breath; R replays (or stops); K keeps.
  // Built-in keys reach the players through act().
  function keys(e, k, phase) {
    if (state === 'leaving') return k !== 'escape';
    const ae = document.activeElement, onStage = !ae || ae === document.body || stages.includes(ae);
    const plain = !e.ctrlKey && !e.metaKey && !e.altKey;
    const dm = /^(?:Digit|Numpad)([1-9])$/.exec(e.code || '');
    if (dm) {
      if (!onStage) return false;
      e.preventDefault();
      if (phase === 'down' && !e.repeat && +dm[1] <= 7) {
        touched();
        players[slotOf(target())]?.degree(+dm[1]);
        say('note');
      }
      return true;
    }
    if (k === 'b' && plain) {
      if (phase === 'down') { if (!e.repeat) breathIn('key'); } else breathOut('key');
      return true;
    }
    if ((k === 'r' || k === 'k') && plain) {
      if (phase === 'down' && !e.repeat) {
        if (k === 'k') { if (!keepBtn.hidden) keep(); } else if (playItOn) playKept(); else if (!replayBtn.hidden) toggleReplay();
      }
      return true;
    }
    return false;
  }

  // ----------------------------------------------------- breath lead --
  function breathIn(src) {
    if (state === 'leaving' || gone) return;
    touched();
    if (!breaths.size) { clock.lead('in', perf()); say('breath'); hint.classList.add('gone'); }
    breaths.add(src);
  }
  function breathOut(src) {
    if (!breaths.delete(src) || breaths.size) return;
    clock.lead('out', perf());
  }
  const onAnyBody = (e) => comps.some((c, i) => {
    const r = stages[i]?.getBoundingClientRect();
    return r && c.rig.hitTest(e.clientX - r.left, e.clientY - r.top);
  });
  const presses = watchPresses(s.screen, {
    stage: s.stage, ms: 300, slop: 12,
    onBody: (p, e) => onAnyBody(e),
    onPress: (p0, id) => {
      const t = performance.now();
      for (const c of comps) c.gestures.recognizer.cancel(id, t);   // it was a press, not a touch
      breathIn(`press:${id}`);
    },
    onRelease: (id) => breathOut(`press:${id}`),
  });

  // -------------------------------------------------- replay, keep, play it --
  function replayChanged(ev) {
    if (ev.on) {
      if (state !== 'leaving') state = 'replaying';
      s.screen.classList.add('replaying');
      s.feedback.show(COPY.say.replaying);
    } else {
      replayH = null;
      if (state === 'replaying') state = 'playing';
      s.screen.classList.remove('replaying');
      if (ev.done && state !== 'leaving') s.feedback.show(COPY.say.replayDone);
    }
    syncRow();
  }

  /** Replay the best take (the Mallow sings it back at the current tempo), or stop the one playing. */
  function toggleReplay() {
    if (state === 'leaving' || gone) return;
    touched();
    if (engine.replaying) { replayH?.stop(); replayH = null; syncRow(); return; }
    const best = engine.take.best();
    if (!best) return;
    sound.unlock();
    replayH = engine.replay(best);
    syncRow();
  }

  function playKept() {
    if (!playItOn || state === 'leaving' || gone) return;
    playItOn = false;
    playIt.hidden = true;
    toggleReplay();
  }

  // the take as a favourite (recomputed only when the take, the pace or the favourites change)
  function currentItem() {
    const best = engine.take.best();
    return best ? { kind: 'hushbeat', id: 'hushbeat', mallow: lead, pace, motif: encodeMotif(best) } : null;
  }

  /** ★ Keep (toggle): saves the tune; refuses at six, so nothing kept is ever dropped silently. */
  function keep() {
    if (state === 'leaving' || gone || !ctx.dna.enabled) return;
    touched();
    const it = currentItem();
    if (!it) return;
    if (ctx.dna.isFavourite(it)) { ctx.dna.toggleFavourite(it); s.feedback.show(COPY.say.removed); }
    else if (ctx.dna.favourites().filter((f) => f.kind === 'hushbeat').length >= FAV_CAP.hushbeat) sayLong(COPY.say.keepFull);
    else { ctx.dna.toggleFavourite(it); s.feedback.show(COPY.say.kept); }
    rowSig = '';
    syncRow();
  }

  // Replay and Keep appear once a take has 3 events (the row grows wider, never taller)
  function syncRow() {
    const T = engine.take, has = T.length >= 3 || (T.prev?.length ?? 0) >= 3, rep = engine.replaying;
    const showReplay = (has || rep) && !playItOn;
    if (replayBtn.hidden === showReplay) replayBtn.hidden = !showReplay;
    const mode = rep ? 'stop' : 'replay';
    if (replayBtn.dataset.mode !== mode) {
      replayBtn.dataset.mode = mode;
      replayBtn.innerHTML = `${icon(mode)}<span>${COPY.chips[mode]}</span>`;
      replayBtn.setAttribute('aria-pressed', String(rep));
    }
    const canKeep = has && !!ctx.dna.enabled && state !== 'leaving';
    if (keepBtn.hidden === canKeep) keepBtn.hidden = !canKeep;
    const sig = canKeep ? `${T.length}|${T.prev?.length ?? 0}|${T.lastT}|${pace}|${favSig}` : '';
    if (sig === rowSig) return;
    rowSig = sig;
    keepItem = canKeep ? currentItem() : null;
    const on = !!keepItem && ctx.dna.isFavourite(keepItem), label = on ? COPY.chips.kept : COPY.chips.keep;
    if (keepBtn.dataset.label !== label) {
      keepBtn.dataset.label = label;
      keepBtn.innerHTML = `${icon('star')}<span>${label}</span>`;
      keepBtn.setAttribute('aria-label', label);
      keepBtn.title = label;
    }
    keepBtn.setAttribute('aria-pressed', String(on));
  }

  // -------------------------------------------------- resting --
  function rest(on) {
    if (on) { if (state !== 'listening') return; state = 'resting'; } else if (state === 'resting') state = 'listening'; else return;
    for (const p of performers) p.rest(on);
  }

  // ------------------------------------------------------------ frame --
  const cs = {};   // clock.at() output, reused
  const po = { playing: false, resting: false, onsets1s: 0, barS: 2.5 }, so = { state, groove: 0 };
  const busy = (c) => c.gestures.recognizer.p.size > 0 || !!(c.hold || c.drag || c.sq || c.stroking || c.wheel.active);
  function frame(dt) {
    if (gone) return;
    const t = perf();
    clock.at(t, cs);
    audio.frame(cs.level);
    // unmute, or Visual only off, while a layer is held: bring it back
    const ready = audio.ready;
    if (ready && !wasReady) audio.reconcile(engine.layers());
    wasReady = ready;
    for (let i = 0; i < players.length; i++) { const c = comps[i]; if (c && players[i]) players[i].watchdog(t, busy(c)); }
    cue.drain(t, show);
    const st = engine.stats(t);
    if (state === 'playing' && t - engine.lastMusicT > QUIET_S && !engine.holding) state = 'listening';
    if (state === 'listening' && t - lastTouch > restAfter) rest(true);
    po.playing = state === 'playing' || state === 'replaying'; po.resting = state === 'resting';
    po.onsets1s = st.onsets1s; po.barS = clock.barS;
    let groove = 0;
    for (const p of performers) { p.frame(t, dt, cs, po); groove = Math.max(groove, p.groove); }
    const strong = !audible();   // nothing audible: the light carries the music (1.4×)
    if (strong !== wasStrong) { wasStrong = strong; scene.setStrong(strong); }
    so.state = state; so.groove = groove;
    scene.frame(t, dt, cs, st, so);
    if (t - rowT > 0.25) { rowT = t; syncRow(); }
    if (t - qT > 1) {
      qT = t;
      if (ctx.quality !== quality) setQuality(ctx.quality);
      const tn = surfaceTone(s.screen);
      if (tn !== tone) { tone = tn; scene.setTone(tn); }
    }
  }
  fx.add({ step(dt) { frame(dt); return true; }, draw() {} });
  fx.add(scene);

  function setQuality(q) {
    quality = q;
    engine.setQuality(q);
    audio.setQuality(q);
    fx.setDprCap(DPR[q] || 1);
    scene.setQuality(q);
    s.env.setQuality(q);
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
    if (k === 'motion' || k === '*') { reduced = prefs.reducedMotion(); fx.reduced = reduced; scene.setReduced(reduced); }
  });
  const offDna = ctx.dna.onChange(() => {
    tuning = ctx.dna.tuning();
    engine.setGentle(tuning.style === 'gentle');
    for (const p of performers) p.setTuning(tuning);
    favSig++;
  });

  // ------------------------------------------------- hidden and leaving --
  function onVisibility() {
    if (!document.hidden) return;
    scheduler.stop();
    engine.releaseAll();   // also cancels a replay
    for (const p of players) p.reset();
    breaths.clear();
    clock.unlead(perf());
    cue.clear();
    for (const p of performers) p.hush();
    scene.hush();
    s.screen.classList.remove('replaying');
    if (state !== 'leaving') state = 'listening';
    syncRow();
  }
  document.addEventListener('visibilitychange', onVisibility);

  const go = () => { if (gone) return; gone = true; ctx.navigate('/'); };
  // Close or Escape: the music resolves home (≤ 0.8 s) and the Mallow says goodbye in character, then home.
  // A second Escape, silence for 8 s, the Mallow's voice off or no sound: straight home.
  function leave() {
    if (state === 'leaving') { go(); return; }
    const t = perf(), quiet = t - engine.lastMusicT > QUIET_S && !engine.holding && !engine.replaying;
    state = 'leaving';
    engine.releaseAll();
    for (const p of players) p.reset();
    breaths.clear();
    if (quiet || tuning.voice === false || !audible()) { go(); return; }
    const secs = engine.cadence();
    for (const p of performers) p.leave();
    s.screen.classList.add('hb-leaving');
    leaveT = setTimeout(go, Math.min(LEAVE_MS[1], Math.max(LEAVE_MS[0], secs * 1000 + 60)));
  }

  s.stage.focus({ preventScroll: true });   // keyboard gestures and keys work straight away
  syncRow();

  // ------------------------------------------------------ debug handle --
  const handle = {
    get state() { return state; },
    engine, clock, scheduler, audio, players, performers, scene, flash, log, router: presses,
    debug() {
      const t = perf(), at = clock.at(t, {}), ch = chordAt(part0.V, at.bar), best = engine.take.best();
      return {
        state, bpm: +at.bpm.toFixed(2), bar: at.bar, beat: +at.beat.toFixed(3), chord: { root: ch.root, tones: [...ch.tones] }, pace,
        breath: { level: +at.level.toFixed(3), phase: at.phase, leading: at.leading, target: +clock.target.toFixed(3) },
        scheduler: { running: scheduler.running, pending: scheduler.pending },
        players: players.map((p, i) => ({ slot: i, mallow: p.part.mallowId, state: p.state, ...p.part.state })),
        voices: audio.voices, live: sound.live.size, audible: audible(), visualOnly, muted: !!sound.muted,
        friend: null, take: engine.take.length, best: best ? best.length : 0, replaying: engine.replaying,
        flash1s: flash.count, groove: +Math.max(0, ...performers.map((p) => p.groove)).toFixed(3),
        quality, idle: +(t - lastTouch).toFixed(1), audio: audio.debug(), latency: audio.outputLatency(),
        performers: performers.map((p) => p.debug()), scene: scene.debug(), cue: cue.pending,
        controls: {
          playIt: !playIt.hidden, replay: !replayBtn.hidden, replayLabel: replayBtn.textContent, replayPressed: replayBtn.getAttribute('aria-pressed'),
          keep: !keepBtn.hidden, keepLabel: keepBtn.textContent, keepPressed: keepBtn.getAttribute('aria-pressed'),
        },
      };
    },
    replay() { if (!engine.replaying) toggleReplay(); },
    stop() { if (engine.replaying) toggleReplay(); },
    keep,
    playIt: playKept,
    setPace,
    setVisualOnly(b) { prefs.set('musicVisualOnly', !!b); },
    /** Test seam: seconds untouched before resting (default 40). */
    setRestAfter(sec) { restAfter = Math.max(0.5, +sec || REST_S); },
  };
  if (globalThis.__lab) globalThis.__lab.hushbeat = handle;

  return {
    unmount() {
      gone = true;
      clearTimeout(leaveT);
      clearTimeout(longT);
      scheduler.stop();
      engine.dispose();      // also stops a replay
      audio.dispose();
      cue.clear();
      for (const p of performers) p.destroy();
      scene.destroy();
      fx.destroy();
      clearGlowSprites();
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
