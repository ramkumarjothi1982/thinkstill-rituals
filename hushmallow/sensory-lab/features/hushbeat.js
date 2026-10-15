// FEATURE — Hushbeat Symphony (#hushbeat): make music by touching a Mallow.
//
// The Mallow is the instrument. Every touch on its body sounds at once (onset
// at contact), and the gesture decides what that note becomes: a tap lets it
// ring, a double tap rolls it into a chord, a hold blooms it into a hum, a
// squeeze or a press down ducks it under a warm bass, a stroke turns it into a
// phrase on the Mallow's own grid, and a drag up bends it. A long still press
// off the body (or B, or the Breathe chip) leads the breath: the in-breath
// opens the hums, and the measured breath sets the tempo from the next bar.
// Layers build: a held Hum or Bass chip (or H, S) is a layer beside the touch,
// so notes, strokes and holds on the body keep playing over it.
//
// The Mallow performs what it plays: it sings its notes, glows with a hum,
// puffs its cheeks with the bass and moves to the beat in its own way, inside
// a faint ring that breathes with the tempo, while its world warms and clears
// with the music. Replay has it sing the take back, proudly; ★ Keep saves the
// tune (a kept tune opens from home with Play it, and never plays by itself).
// Close resolves the music home with a short cadence and a goodbye in character.
//
// Friend invites a second Mallow for this visit (the duet): it plays in the
// lead's key on its own stage, notes close together harmonise, two hums bloom
// into one chord, two basses sit a fifth or an octave apart, a phrase gets an
// answer (Friend answers, in the sheet), and the two glance, blush and lean in.
// The tray's Both target and G play them together with one finger; Tab moves
// keyboard focus between the stages. ♪ opens "Sound and pace": Volume, Music |
// Visual only, Breath pace, Friend answers, Your tunes, Lab settings.
//
// Built on the shared engine: stage-screen (a quiet Companion: the music is
// its voice; its realm through s.env), the pointer router's watchPresses
// (breath lead), one EffectsLayer whose first item is this screen's per-frame
// work (no extra rAF) and whose second is the scene, one FlashGate for the
// realm and the light, and the music modules: core/music-time.js (breath
// clock, scheduler, take, tune codec), core/music-engine.js (the conductor),
// core/music-audio.js + music-kits.js (the sound), core/music-fx.js (the
// light), features/hushbeat/player.js (gestures → music), performer.js
// (the Mallow and the scene) and sheet.js (the two sheets).
//
// Nothing plays before a gesture (the SoundEngine refuses). Visual only
// (prefs.musicVisualOnly) runs the identical music with the sound bus closed.

import { h, icon, iconBtn, holdButton, segmented } from '../lab-ui.js';
import { stageScreen } from './stage-screen.js';
import { quietSound } from '../core/sound-engine.js';
import { BreathClock, Scheduler, decodeMotif } from '../core/music-time.js';
import { MusicEngine } from '../core/music-engine.js';
import { MusicAudio } from '../core/music-audio.js';
import { chordAt } from '../core/music-theory.js';
import { EffectsLayer, FlashGate, surfaceTone, clearGlowSprites } from '../core/effects.js';
import { PULSE_GAPS } from '../core/environment.js';
import { watchPresses, defaultSkip } from '../core/pointer-router.js';
import { BREATH, PACES, FAV_CAP } from '../core/comfort-dna.js';
import { rng } from '../core/math.js';
import { MALLOWS } from '../../src/mallows/registry.js';
import { Player } from './hushbeat/player.js';
import { Performer, Scene, Cue } from './hushbeat/performer.js';
import { COPY } from './hushbeat/copy.js';
import { openMusicSheet, openFriendPicker, tierBelow, tuneItem, yourTunes } from './hushbeat/sheet.js';

export const meta = { id: 'hushbeat', title: COPY.meta };

const DPR = { high: 1.5, medium: 1.25, low: 1 };
const LOG_MAX = 128;           // engine events kept for debugging and tests
const QUIET_S = 8;             // no music for this long: back to listening (and Close leaves at once)
const REST_S = 40;             // listening and untouched for this long: resting
const ROLE_GAP_S = 1.5;        // Visual only names every role, at most this often
const LEAVE_MS = [720, 800];   // the cadence plays, the screen fades from 300 ms over 420 ms, then home
const REACTS = new Set(['tap', 'doubletap', 'holdend', 'dragend', 'squeezeend', 'strokeend']);   // the Companion reacts: the groove pauses
const FADE_MS = [160, 60];     // a friend arrives or leaves: the stages fade out, re-lay out, a frame later fade in (280 ms, CSS)
const PAN = 0.22;              // in a duet the lead sits a little left, the friend a little right
const ACTIVE_S = 1.2;          // a Mallow played this recently is "being played" (the other one watches)
const GLANCE_S = 1.2;          // the two glance at each other at most this often
const CHIP_MIN_S = 1.2;        // a tapped Hum or Bass chip still plays this long (a hum takes time to swell)
const BREATH_MIN_S = 0.6;      // a breath lead let go sooner was a tap: no breath is measured, the tempo stays
const SLOP = 12;               // px: a still press (the breath lead's slop)
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
  let friend = null, takeFriend = null, entering = null, fadeT = 0, answers = true, trayTarget = 0, targetSeg = null, sheet = null, glanceT = -Infinity;
  let playItPending = false;   // Play it was tapped and its replay waits for the Mallows' bodies (whenReady)
  let waiting = null;          // what waits for every body on stage (whenReady), run from frame()
  let acting = false;          // a held layer's face (Companion.act) is being shown: the players skip those gestures
  const said = new Set();
  let saidT = -Infinity;
  const breaths = new Set();   // who leads the breath right now: 'key', 'chip', 'press:<pointerId>'
  let leadT = 0;               // when the breath lead began
  const keyHeld = new Map();   // H / S held: 'pad' | 'bass' → the Companion it started on (it ends on the same one)

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
  // ♪ opens "Sound and pace" (Volume, Visual only, pace, answers, your tunes)
  const musicBtn = iconBtn('note', COPY.sheet.title, () => openMusic(), { class: 'icon-btn hb-music', 'aria-haspopup': 'dialog' });
  const s = stageScreen(root, ctx, {
    title: COPY.title, subtitle: COPY.subtitle(M.name, null, visualOnly),
    backdrop: ctx.dna.environment('moment', lead),
    settings: false, feedback: false, sound: quietSound(sound), extraButtons: [musicBtn],
    onExit: () => leave(), keys, onGesture, onLayout, stageLabel: (name) => COPY.aria.stage(name, !!friend),
  });
  s.screen.classList.add('hushbeat');
  const subtitle = s.screen.querySelector('.topbar .title small');
  const retitle = () => { subtitle.textContent = COPY.subtitle(M.name, friend ? MALLOWS[friend].name : null, visualOnly); };

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
  // each cue stays whole on a line; a line may break only after a separator (no-break space before the dot)
  const hint = h('p', { class: 'hint hb-hint' },
    ...COPY.hint.flatMap(([b, rest], i) => [i ? '\u00a0· ' : '', h('span', { class: 'hb-cue' }, h('b', {}, b), h('span', { class: 'hb-long' }, rest))]));
  // the tray's chips act on the target: the lead (solo), or in a duet the Mallow chosen in the
  // target control [Lead | Both | Friend]; with Both every chip plays on both (the friend harmonises)
  const chipTargets = () => (trayTarget === 'both' ? comps.slice() : [comps[trayTarget] || comps[0]]);
  const act = (kind) => () => { if (state !== 'leaving') for (const c of chipTargets()) c.act(kind); };
  // Hum and Bass are held layers beside the touch (Player.layer): who a held chip started on (it ends on the
  // same Mallows), when, and its pending end (a tapped chip still plays CHIP_MIN_S)
  const chips = { pad: { on: [], t0: 0, timer: 0 }, bass: { on: [], t0: 0, timer: 0 } };
  const hold = (kind) => holdButton(COPY.chips[kind === 'bass' ? 'bass' : 'hum'], () => chipDown(kind), () => chipUp(kind),
    { 'aria-label': COPY.aria.hold[kind], title: COPY.aria.hold[kind] });
  const tray = h('div', { class: 'chips wrap hb-tray', role: 'group', 'aria-label': COPY.aria.tray, hidden: true },
    h('button', { type: 'button', class: 'chip', onclick: act('tap') }, COPY.chips.note),
    h('button', { type: 'button', class: 'chip', onclick: act('double') }, COPY.chips.chord),
    h('button', { type: 'button', class: 'chip', onclick: act('stroke') }, COPY.chips.tune),
    hold('bass'),
    hold('pad'),
    holdButton(COPY.chips.breathe, () => breathIn('chip'), () => breathOut('chip'), { 'aria-label': COPY.aria.hold.breathe, title: COPY.aria.hold.breathe }));
  const buttons = h('button', {
    type: 'button', class: 'chip hb-buttons', 'aria-pressed': 'false', title: COPY.chips.buttons, 'aria-label': COPY.chips.buttons,
    html: `${icon('hand')}<span>${COPY.chips.buttons}</span>`,
    onclick: () => {
      const show = tray.hidden;
      tray.hidden = !show;
      s.screen.classList.toggle('hb-tray-on', show);
      buttons.setAttribute('aria-pressed', String(show));
      edges();
    },
  });
  // Play it: a kept tune opened from home, ready but silent until tapped
  const playIt = h('button', { type: 'button', class: 'chip primary hb-playit', hidden: true, 'aria-label': COPY.chips.playIt, title: COPY.chips.playIt, html: `${icon('note')}<span>${COPY.chips.playIt}</span>`, onclick: () => playKept() });
  const replayBtn = h('button', { type: 'button', class: 'chip hb-replay', 'aria-pressed': 'false', hidden: true, onclick: () => toggleReplay() });
  const keepBtn = h('button', { type: 'button', class: 'chip hb-keep', 'aria-pressed': 'false', hidden: true, onclick: () => keep() });
  const friendBtn = h('button', {
    type: 'button', class: 'chip hb-friend-btn', 'aria-haspopup': 'dialog', 'aria-label': COPY.aria.friend, title: COPY.chips.friend,
    html: `${icon('friend')}<span>${COPY.chips.friend}</span>`, onclick: () => openFriends(),
  });
  const row = h('div', { class: 'chips hb-row', role: 'group', 'aria-label': COPY.aria.row }, playIt, buttons, replayBtn, keepBtn, friendBtn);
  s.bottom.append(hint, tray, row);
  // a single-row tray (short screens) fades its edges while there is more to scroll
  const edges = () => {
    const max = tray.scrollWidth - tray.clientWidth;
    tray.classList.toggle('fade-l', max > 2 && tray.scrollLeft > 2);
    tray.classList.toggle('fade-r', max > 2 && tray.scrollLeft < max - 2);
  };
  tray.addEventListener('scroll', edges, { passive: true });

  // in a duet the tray starts with the target control (rebuilt when the friend changes)
  function syncTarget() {
    targetSeg?.remove();
    targetSeg = null;
    if (!friend) { trayTarget = 0; return; }
    if (trayTarget === 1 && !comps[1]) trayTarget = 0;
    targetSeg = segmented([[0, M.name], ['both', COPY.chips.both], [1, MALLOWS[friend].name]], trayTarget, (v) => { trayTarget = v; }, COPY.aria.target);
    targetSeg.classList.add('hb-target');
    tray.prepend(targetSeg);
    edges();
  }

  // the lead, or the Mallow whose stage has keyboard focus
  function target() { const i = stages.indexOf(document.activeElement); return comps[i > 0 ? i : 0]; }
  const slotOf = (c) => Math.max(0, comps.indexOf(c));

  // each stage's place in the screen (the effects layer covers the screen); after every reframe
  function onLayout() {
    if (gone) return;
    const sr = s.screen.getBoundingClientRect();
    for (let i = 0; i < stages.length; i++) { const r = stages[i].getBoundingClientRect(); offs[i].x = r.left - sr.left; offs[i].y = r.top - sr.top; }
  }

  // a kept tune from home "For you": its pace is already set and its friend joins (no hello: nothing
  // sounds before Play it); its notes, the friend's included, wait for Play it
  if (handoff?.friend) setFriend(handoff.friend, { greet: false, instant: true });
  const kept = decodeMotif(handoff?.motif);
  if (kept) {
    engine.take.load(kept);
    playItOn = !!engine.take.best();
    playIt.hidden = !playItOn;
    if (playItOn && handoff.play === true) playKept();   // Play in Your tunes on another Mallow's screen: asked to hear it
  }

  // ----------------------------------------------------- input → music --
  function touched() { lastTouch = perf(); if (state === 'resting') rest(false); }

  function onGesture(type, d, c) {
    if (acting || state === 'leaving' || gone) return;   // acting: a held layer's face, not a gesture (layer())
    const i = slotOf(c), p = players[i];
    if (!p) return;
    touched();
    p.gesture(type, d);
    if (type === 'tap') say('note');
    // the light follows a stroking finger; the Tune chip and P stroke with no finger (nothing on the stage):
    // their trail runs across the forehead, above the eyes
    if (type === 'strokestart' || type === 'stroke') {
      let y = d.y;
      if (!c.gestures.recognizer.p.size) {
        if (type === 'strokestart') autoY[i] = d.y;
        y = foreheadY(c, d.y - autoY[i]);
      }
      scene.stroke(i, type === 'strokestart' ? 'start' : 'move', d.x + offs[i].x, y + offs[i].y);
    } else if (type === 'strokeend') scene.stroke(i, 'end');
    if (REACTS.has(type)) performers[i]?.suppress();
  }
  const autoY = [0, 0], fr = {};
  function foreheadY(c, dy) { if (!c.rig?.bodyRect) return dy; c.rig.bodyRect(fr); return fr.top + 0.12 * fr.h + dy; }

  /**
   * A held layer from a chip or a key (Hum or Bass, H or S) on Mallow c: the player holds it beside the touch
   * (taps, strokes and holds on the body play over it, no touch ends it); the Companion shows it on the face
   * (its hold or squeeze, through act(), which the players skip). A layer a finger holds already keeps its face.
   */
  function layer(c, kind, on) {
    const i = comps.indexOf(c), p = players[i];
    if (!p || c.destroyed || (on && (state === 'leaving' || gone))) return;
    if (on) touched();
    if (!p.holds(kind)) {
      acting = true;
      try { c.act(kind === 'pad' ? (on ? 'holdStart' : 'holdEnd') : (on ? 'squeezeStart' : 'squeezeEnd')); } finally { acting = false; }
    }
    p.layer(kind, on);
    if (!on) performers[i]?.suppress();
  }
  function chipDown(kind) {
    if (state === 'leaving' || gone) return;
    const ch = chips[kind], next = chipTargets();
    clearTimeout(ch.timer); ch.timer = 0;   // pressed again before a tap's layer ended: it carries on
    for (const c of ch.on) if (!next.includes(c)) layer(c, kind, false);
    ch.on = next; ch.t0 = perf();
    for (const c of next) layer(c, kind, true);
  }
  function chipUp(kind) {
    const ch = chips[kind], left = CHIP_MIN_S - (perf() - ch.t0);
    const end = () => { ch.timer = 0; for (const c of ch.on) layer(c, kind, false); ch.on = []; };
    clearTimeout(ch.timer);
    if (left > 0.02 && !gone && state !== 'leaving') ch.timer = setTimeout(end, left * 1000); else end();
  }
  // H / S let go (or the window lost focus, or a sheet took the keys)
  function keysUp() { for (const [kind, c] of keyHeld) layer(c, kind, false); keyHeld.clear(); }

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
    if (ev.kind === 'harmony') { performers[ev.a]?.apply(ev, at, due); performers[ev.b]?.apply(ev, at, due); glance(); }
    else performers[ev.slot]?.apply(ev, at, due);
    scene.apply(ev);
    if (ev.kind === 'replay' && !ev.on && ev.done) for (const p of performers) p.proud();
    // two hums bloom into one chord: the two lean in toward each other
    if (ev.kind === 'bloom' && ev.on && performers[1]) { performers[0].leanIn(1); performers[1].leanIn(-1); }
  }

  // ------------------------------------------------------------- duet --
  // a Mallow's body middle in another stage's px (for looking across): reused points, by slot
  const pts = [{ x: 0, y: 0 }, { x: 0, y: 0 }], rb = {};
  function across(from, to) {
    const c = comps[from], p = pts[to];
    if (!c?.rig?.bodyRect) return null;
    c.rig.bodyRect(rb);
    p.x = offs[from].x + rb.cx - offs[to].x; p.y = offs[from].y + rb.mid - offs[to].y;
    return p;
  }
  // the two look at each other (a friend arriving, a harmony), at most every 1.2 s
  function glance() {
    const t = perf();
    if (!performers[1] || t - glanceT < GLANCE_S) return;
    glanceT = t;
    performers[0].glance(across(1, 0));
    performers[1].glance(across(0, 1));
  }

  /**
   * Invite a friend for this visit (or null: play alone). The stages fade out over 160 ms, the friend's
   * stage joins beside the lead, and they fade back in (280 ms) while the friend makes its entrance; the
   * two glance at each other and, with the Mallow voice on, the friend sings a quiet hello. A friend never
   * changes the favourite Mallow. greet: false for a kept tune (nothing sounds before Play it);
   * instant: no fade; then(): after the swap (a tune waiting for its friend to play).
   */
  function setFriend(id, { greet = true, instant = false, then = null } = {}) {
    if (gone || state === 'leaving') return;
    const next = typeof id === 'string' && id !== lead && Object.hasOwn(MALLOWS, id) ? id : null;
    clearTimeout(fadeT);
    if (next === friend) { s.screen.classList.remove('hb-fading'); if (then) whenReady(then); return; }
    touched();
    const swap = () => {
      if (gone || state === 'leaving') return;
      if (document.hidden) { greet = false; then = null; }   // nothing starts on its own on return
      dropFriend();
      if (next) addFriend(next, greet);
      retitle();
      for (let i = 0; i < stages.length; i++) stages[i].setAttribute('aria-label', COPY.aria.stage(MALLOWS[comps[i].id]?.name || '', !!friend));
      syncTarget();
      s.env.setQuality(realmTier());
      rowSig = '';
      syncRow();
      s.feedback.show(friend ? COPY.say.joins(MALLOWS[friend].name) : COPY.say.alone);
      if (then) whenReady(then);
    };
    if (instant) { swap(); return; }
    s.screen.classList.add('hb-fading');
    fadeT = setTimeout(() => {
      swap();
      fadeT = setTimeout(() => s.screen.classList.remove('hb-fading'), FADE_MS[1]);   // after the reframe
    }, FADE_MS[0]);
  }

  function addFriend(id, greet) {
    const c = s.setPartner(id, { quality: tierBelow(quality), tier: tierBelow });
    if (!c) return;
    friend = id; takeFriend = id;
    const part1 = engine.part(1, id, { pan: PAN });
    part0.pan = -PAN;
    audio.setPart(1, part1);
    players[1] = new Player(part1, { geo: geoOf(c), now: perf });
    comps[1] = c; stages[1] = s.stages[1];
    onLayout();
    const FM = MALLOWS[id], fGlow = pal?.glow || FM.colours.glow, fAccent = pal?.soft || FM.colours.accent;
    performers[1] = new Performer({ companion: c, slot: 1, pool: scene.pool, off: offs[1], color: fAccent, reduced, tuning, now: perf });
    performers[1].setStrong(!!wasStrong);
    scene.setPerformers([{ performer: performers[0], off: offs[0], color, accent }, { performer: performers[1], off: offs[1], color: fGlow, accent: fAccent }]);
    entering = { greet: greet && tuning.voice !== false };   // the entrance waits for the friend's body (frame())
  }

  // the friend leaves: its layers fade (0.6 s), its light goes, its stage is removed
  function dropFriend() {
    if (!friend) return;
    players[1]?.reset();
    engine.removePart(1);
    audio.setPart(1, null);
    performers[1]?.destroy();
    performers.length = 1; players.length = 1; comps.length = 1; stages.length = 1;
    scene.setPerformers([{ performer: performers[0], off: offs[0], color, accent }]);
    performers[0].listen(null);
    part0.pan = 0;
    for (const ch of Object.values(chips)) ch.on = ch.on.filter((c) => c === comps[0]);
    for (const [kind, c] of keyHeld) if (c !== comps[0]) keyHeld.delete(kind);
    friend = null; entering = null;
    dropQueued();   // a tune waiting for this friend never plays with another
    s.setPartner(null);
  }

  // fn once every Mallow is on stage: a body is built on the main thread, which would make the scheduler drop
  // a tune's first notes as late (a joining friend; the lead itself when a tune plays on arrival), else at once
  function bodiesReady() { return !entering && comps.every((c) => c.rig.ready && c.rig.soft); }
  function whenReady(fn) {
    if (!waiting && bodiesReady()) { fn(); return; }
    const prev = waiting;
    waiting = prev ? () => { prev(); fn(); } : fn;
  }
  // what waits is dropped (a hidden page, the friend leaving): a Play it waiting comes back
  function dropQueued() {
    waiting = null;
    if (playItPending) { playItPending = false; playItOn = true; playIt.hidden = false; }
  }

  // the realm runs at low in a duet below the high tier (two soft bodies)
  function realmTier() { return friend && quality !== 'high' ? 'low' : quality; }

  /** G, or Both with Note: both Mallows play at once; the friend's note harmonises with the lead's. */
  function together() {
    if (!friend || state === 'leaving' || gone) return;
    touched();
    for (const c of comps) c.act('tap');
  }

  // per frame in a duet: the friend's entrance once its body is ready; the idle Mallow watches the one being played
  const activeAt = [false, false];
  function duetFrame(t) {
    const fc = comps[1];
    if (!fc || !performers[1]) return;
    if (entering && fc.rig.ready && fc.rig.soft) {
      const greetNow = entering.greet && state !== 'leaving';
      entering = null;
      performers[1].enter();
      glanceT = -Infinity;
      glance();
      if (greetNow) players[1].part.hello();
    }
    for (let i = 0; i < 2; i++) {
      const p = players[i], st = p.part.state;
      activeAt[i] = p.state !== 'idle' || t - p.part.lastOnset() < ACTIVE_S || st.pad > 0 || st.bass > 0;
    }
    for (let i = 0; i < 2; i++) performers[i].listen(activeAt[1 - i] && !activeAt[i] ? across(1 - i, i) : null);
  }

  // the feedback chip names a role the first time it is used; with the sound off it names every role,
  // the first uses included, at most once per 1.5 s (the chip is the music's only words: calm, not chatty)
  function say(role) {
    const t = perf(), text = COPY.roles[role];
    if (!text) return;
    const loud = audible();
    if (said.has(role) && loud) return;
    if ((said.has(role) || !loud) && t - saidT < ROLE_GAP_S) return;
    said.add(role); saidT = t;
    s.feedback.show(text);
  }
  // a longer message stays up twice as long (the chip fades after about a second)
  function sayLong(text) {
    s.feedback.show(text);
    clearTimeout(longT);
    longT = setTimeout(() => { if (!gone) s.feedback.show(text); }, 1000);
  }

  // digit keys play exact degrees; B (held) leads the breath; R replays (or stops); K keeps; G plays
  // both (duet). Built-in keys reach the players through act(), on the stage that has focus.
  // While one of this screen's sheets is open, Escape closes it and stage keys do nothing.
  function keys(e, k, phase) {
    if (sheet?.open) {
      if (k === 'escape' && phase === 'down') sheet.close();
      return true;
    }
    if (state === 'leaving') return k !== 'escape';
    const ae = document.activeElement, onStage = !ae || ae === document.body || stages.includes(ae);
    const plain = !e.ctrlKey && !e.metaKey && !e.altKey;
    // H and S hold a hum or a bass beside the touch, on the Mallow with focus; with Ctrl, Alt or Cmd they are
    // the browser's (never a layer, never the built-ins)
    if (k === 'h' || k === 's') {
      const kind = k === 'h' ? 'pad' : 'bass';
      if (phase === 'up') { const c = keyHeld.get(kind); if (c) { keyHeld.delete(kind); layer(c, kind, false); } }
      else if (e.repeat) { if (keyHeld.has(kind)) e.preventDefault(); }
      else if (plain && !keyHeld.has(kind)) { const c = target(); keyHeld.set(kind, c); layer(c, kind, true); }
      return true;
    }
    // digits play exact degrees; with Ctrl, Alt or Cmd they stay the browser's (tab switching)
    const dm = /^(?:Digit|Numpad)([1-9])$/.exec(e.code || '');
    if (dm && plain) {
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
    if (k === 'g' && plain && friend) {
      if (phase === 'down' && !e.repeat) together();
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
    if (!breaths.size) { leadT = perf(); clock.lead('in', leadT); say('breath'); hint.classList.add('gone'); }
    breaths.add(src);
  }
  // a lead let go within 0.6 s was a tap, not a breath: no cycle is measured and the tempo stays
  function breathOut(src) {
    if (!breaths.delete(src) || breaths.size) return;
    const t = perf();
    if (t - leadT < BREATH_MIN_S) clock.unlead(t); else clock.lead('out', t);
  }
  const onAnyBody = (e) => comps.some((c, i) => {
    const r = stages[i]?.getBoundingClientRect();
    return r && c.rig.hitTest(e.clientX - r.left, e.clientY - r.top);
  });
  const presses = watchPresses(s.screen, {
    stage: s.stage, ms: 300, slop: SLOP,
    onBody: (p, e) => onAnyBody(e),
    onPress: (p0, id) => {
      const t = performance.now();
      for (const c of comps) c.gestures.recognizer.cancel(id, t);   // it was a press, not a touch
      breathIn(`press:${id}`);
    },
    onRelease: (id) => breathOut(`press:${id}`),
  });
  // two hands: a breath lead off the body and a touch on it stay two things (a stage's recognizer would pair
  // them into a squeeze). Capture phase on the screen, before the stage: a touch landing on a body cancels a
  // still, pending off-body pointer on that stage (it emits nothing; the router still claims it at 300 ms);
  // an off-body pointer landing while that Mallow is being touched never reaches its stage (watchPresses,
  // on the screen too, still sees it)
  const twoHands = (e) => {
    if (e.button > 0 || state === 'leaving' || gone || defaultSkip(e)) return;
    const i = stages.indexOf(e.target?.closest?.('.stage'));
    if (i < 0) return;
    const c = comps[i], rec = c.gestures.recognizer, r = stages[i].getBoundingClientRect();
    if (c.rig.hitTest(e.clientX - r.left, e.clientY - r.top)) {
      const t = performance.now();
      for (const q of [...rec.p.values()]) if (q.state === 'pending' && !q.startedOnBody && Math.hypot(q.x - q.x0, q.y - q.y0) <= SLOP) rec.cancel(q.id, t);
    } else if (rec.p.size) e.stopPropagation();
  };
  s.screen.addEventListener('pointerdown', twoHands, true);
  // the window lost focus while B, H or S was held: their keyups will never come (pointers are cancelled anyway)
  const onBlur = () => { breathOut('key'); keysUp(); };
  addEventListener('blur', onBlur);

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
    playItPending = false;   // a person's Replay or Stop replaces a Play it still waiting for the friend
    touched();
    if (engine.replaying) { replayH?.stop(); replayH = null; syncRow(); return; }
    const best = engine.take.best();
    if (!best) return;
    sound.unlock();
    replayH = engine.replay(best);
    syncRow();
  }

  /**
   * Your tunes → Play (a tap in the sheet): the tune plays at once. With the tune's own lead its friend
   * joins first (or leaves) and its pace is set. Another Mallow's tune reopens Hushbeat with that Mallow
   * (ctx.openTune: for this visit, the favourite never changes), where it plays once its friend is on stage.
   */
  function playTune(it) {
    if (gone || state === 'leaving') return;
    const events = decodeMotif(it?.motif);
    if (!events) return;
    if (it.mallow !== lead) { ctx.openTune(it, { play: true }); return; }
    const go = () => {
      if (gone || state === 'leaving') return;
      setPace(it.pace);
      if (engine.replaying) { replayH?.stop(); replayH = null; }
      engine.take.load(events);
      playItOn = false;
      playIt.hidden = true;
      toggleReplay();
    };
    if (it.mallow === lead) setFriend(it.friend || null, { greet: false, then: go });
    else go();
  }

  function removeTune(it) {
    if (it && ctx.dna.isFavourite(it)) ctx.dna.toggleFavourite(it);
    rowSig = '';
    syncRow();
  }

  // the two sheets; focus goes back to the button that opened one. A sheet takes the keys: a held B, H or S lets go
  function opened(sh, from) {
    sheet = sh;
    breathOut('key'); keysUp();
    const done = () => {
      if (sheet === sh) sheet = null;
      if (gone) return;
      const ae = document.activeElement;
      if (!ae || ae === document.body || sh.el?.contains(ae)) from.focus({ preventScroll: true });
    };
    return done;
  }
  function openMusic() {
    if (gone || state === 'leaving' || sheet?.open) return;
    let done = null;
    const sh = openMusicSheet(s.screen, ctx, {
      pace, setPace, duet: !!friend, answers, setAnswers,
      tunes: () => (ctx.dna.enabled ? yourTunes(ctx.dna.favourites()) : null),
      playTune, removeTune, onClosed: () => done?.(),
    });
    done = opened(sh, musicBtn);
  }
  function openFriends() {
    if (gone || state === 'leaving' || sheet?.open) return;
    let done = null;
    const sh = openFriendPicker(s.screen, ctx, { lead, friend, onPick: (id) => setFriend(id), onClosed: () => done?.() });
    done = opened(sh, friendBtn);
  }

  // Play it: the replay starts once a kept duet's friend is on stage (at once without one). Focus on the chip
  // moves to Replay (now Stop) or the stage, never to the page
  function playKept() {
    if (!playItOn || state === 'leaving' || gone) return;
    const hadFocus = document.activeElement === playIt;
    playItOn = false;
    playIt.hidden = true;
    playItPending = true;
    sound.unlock();
    whenReady(startReplay);
    syncRow();
    if (hadFocus) (replayBtn.hidden ? s.stage : replayBtn).focus({ preventScroll: true });
  }
  // a queued start runs once, and only while still asked for (a Replay or Stop tapped meanwhile, or a hidden page, drops it)
  function startReplay() {
    if (!playItPending) return;
    playItPending = false;
    if (!engine.replaying) toggleReplay();
  }

  // the take as a favourite (recomputed only when the take, the friend, the pace or the favourites change)
  function currentItem() {
    return tuneItem({ lead, friend, takeFriend, pace, events: engine.take.best() });
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
      replayBtn.setAttribute('aria-label', COPY.chips[mode]);   // its name when the row is icon-only (short landscape)
      replayBtn.title = COPY.chips[mode];
      replayBtn.setAttribute('aria-pressed', String(rep));
    }
    const canKeep = has && !!ctx.dna.enabled && state !== 'leaving';
    if (keepBtn.hidden === canKeep) keepBtn.hidden = !canKeep;
    const sig = canKeep ? `${T.length}|${T.prev?.length ?? 0}|${T.lastT}|${pace}|${friend}|${favSig}` : '';
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
  const cs = {}, csHeard = {};   // clock.at() now, and when the beat is heard (reused)
  const po = { playing: false, resting: false, onsets1s: 0, barS: 2.5, beatCs: cs }, so = { state, groove: 0, beatCs: cs };
  // still touching (a held chip's or key's face doesn't count: it is not a stuck touch)
  const busy = (c, p) => c.gestures.recognizer.p.size > 0 || !!(c.drag || c.stroking || c.wheel.active || (c.hold && !p.btn.pad) || (c.sq && !p.btn.bass));
  function frame(dt) {
    if (gone) return;
    const t = perf();
    clock.at(t, cs);
    // the beat as heard (it reaches the ear after the output latency): the groove and the floor glow's swell
    // follow it, as scheduled notes are seen when heard; the breath, the ring and bar-wise light use now
    const lat = audible() ? audio.outputLatency() : 0;
    po.beatCs = so.beatCs = lat > 0 ? clock.at(t - lat, csHeard) : cs;
    audio.frame(cs.level);
    // unmute, or Visual only off, while a layer is held: bring it back
    const ready = audio.ready;
    if (ready && !wasReady) audio.reconcile(engine.layers());
    wasReady = ready;
    for (let i = 0; i < players.length; i++) { const c = comps[i]; if (c && players[i]) players[i].watchdog(t, busy(c, players[i])); }
    cue.drain(t, show);
    if (friend) duetFrame(t);
    if (waiting && bodiesReady()) { const fn = waiting; waiting = null; fn(); }
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
      if (!tray.hidden) edges();   // the tray's width follows the row and the viewport
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
    s.env.setQuality(realmTier());
  }

  // -------------------------------------------------------- settings --
  function setVisual(b) {
    visualOnly = !!b;
    audio.setAttached(!visualOnly);
    retitle();
    if (visualOnly) s.feedback.show(COPY.say.soundOff);
  }
  function setPace(p) {
    if (!PACES.includes(p)) return;
    pace = p;
    clock.setTiming(BREATH[p]);
  }
  function setAnswers(b) { answers = !!b; engine.setAnswers(answers); }
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
    // nothing queued starts by itself on return: a friend arriving enters without its hello, a tune waiting
    // for it is dropped, and Play it comes back
    if (entering) entering.greet = false;
    dropQueued();
    if (state === 'resting') rest(false);
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
    keyHeld.clear();
    for (const ch of Object.values(chips)) { clearTimeout(ch.timer); ch.timer = 0; ch.on = []; }
    if (quiet || tuning.voice === false || !audible()) { go(); return; }
    const secs = engine.cadence();
    for (const p of performers) p.leave();
    s.screen.classList.add('hb-leaving');
    leaveT = setTimeout(go, Math.min(LEAVE_MS[1], Math.max(LEAVE_MS[0], secs * 1000 + 60)));
  }

  // keys work straight away (they reach the stage from the page too). The stage takes focus when a person
  // brought us here (a card, a key: the ring then shows only after a key); a link opened directly starts with
  // the page focused, so no focus ring frames the world before anyone has touched it (Tab reaches the stage first)
  if (navigator.userActivation?.hasBeenActive !== false) s.stage.focus({ preventScroll: true });
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
        players: players.map((p, i) => ({ slot: i, mallow: p.part.mallowId, state: p.state, held: { ...p.btn }, ...p.part.state })),
        voices: audio.voices, live: sound.live.size, audible: audible(), visualOnly, muted: !!sound.muted,
        friend, answers, target: trayTarget, sheet: sheet?.open ? (sheet.el?.getAttribute('aria-label') || 'sheet') : null,
        take: engine.take.length, best: best ? best.length : 0, replaying: engine.replaying,
        flash1s: flash.count, groove: +Math.max(0, ...performers.map((p) => p.groove)).toFixed(3),
        quality, idle: +(t - lastTouch).toFixed(1), audio: audio.debug(), latency: audio.outputLatency(),
        performers: performers.map((p) => p.debug()), scene: scene.debug(), cue: cue.pending,
        controls: {
          playIt: !playIt.hidden, playItPending, replay: !replayBtn.hidden, replayLabel: replayBtn.textContent, replayPressed: replayBtn.getAttribute('aria-pressed'),
          keep: !keepBtn.hidden, keepLabel: keepBtn.textContent, keepPressed: keepBtn.getAttribute('aria-pressed'),
          tray: !tray.hidden, targets: targetSeg ? [...targetSeg.querySelectorAll('button')].map((b) => b.textContent) : null,
        },
        duet: performers[1] ? { entering: !!entering, watching: performers.map((p) => !!p.watch), fading: s.screen.classList.contains('hb-fading'), stages: stages.length } : null,
      };
    },
    replay() { if (!engine.replaying) toggleReplay(); },
    stop() { if (engine.replaying) toggleReplay(); },
    keep,
    playIt: playKept,
    setPace,
    setVisualOnly(b) { prefs.set('musicVisualOnly', !!b); },
    setFriend(id, o) { setFriend(id, o); },
    setAnswers,
    together,
    openMusic,
    openFriends,
    /** Test seam: seconds untouched before resting (default 40). */
    setRestAfter(sec) { restAfter = Math.max(0.5, +sec || REST_S); },
  };
  if (globalThis.__lab) globalThis.__lab.hushbeat = handle;

  return {
    unmount() {
      gone = true;
      clearTimeout(leaveT);
      clearTimeout(longT);
      clearTimeout(fadeT);
      for (const ch of Object.values(chips)) clearTimeout(ch.timer);
      sheet?.close();
      scheduler.stop();
      engine.dispose();      // also stops a replay
      audio.dispose();
      cue.clear();
      for (const p of performers) p.destroy();
      scene.destroy();
      fx.destroy();
      clearGlowSprites();
      presses.dispose();
      s.screen.removeEventListener('pointerdown', twoHands, true);
      removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
      tray.removeEventListener('scroll', edges);
      offPrefs();
      offDna();
      s.setPartner(null);
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
