// V3 RITUAL HOST — runs any of the 1,000 rituals: one touch engine + one
// world law, led by one Mallow in its realm, with the person's own words
// (and their own photos, or the seven Mallows when they add none) inside
// the scene.
//
// Flow: play the engine (gated by the law) → the law's closing move (phase
// laws) → finale (engine payoff + law light finale + realm resolves) → mind
// bend → landing check-in. Nothing completes by itself; every step is driven
// by touch or by the "Tap instead" button.
//
// Privacy: the words are drawn locally and never logged; photos stay in
// memory (see photos.js) and are released when the ritual ends.

import { h, icon, openSheet, clearBubble } from '../app/ui.js';
import { ENGINES, LAWS, SKILLS } from './data/catalog.js';
import * as fx from './fx.js';
import { createWords, drawWords, TOKEN_MAX, excerpt } from './words.js';
import { photoSession, photoApi } from './photos.js';
import { mallowMaterial } from './mallow-cards.js';
import { createLaw, drawLightFinale, LAW_LOCK_TEXT } from './laws.js';
import { loadEngine } from './engines/index.js';
import { REALMS } from '../world/realm.js';
import { MALLOWS } from '../mallows/registry.js';
import { faceMix } from '../engine/interpret.js';
import { openSupport } from '../app/scenes/support.js';
import { brandName } from '../brand.js';
import { canvasFontPx, fontsReady } from '../ui/type.js';
import { stageRect, wantsCompact, keepInside } from './stage-fit.js';

const { clamp, lerp, smooth, ease, rgba, glow, Particles, Ripples, Trail } = fx;

export const meta = { id: 'v3' };

const GATE_HOW = { 1: 'a guide light leads; stay behind it', 2: 'lift and watch one pulse halfway', 5: 'three beats; let each one settle', 6: 'slow down for the last stretch', 10: 'lift and let each wake fade' };
const HEAVY = new Set(['sadness', 'loneliness', 'hurt', 'fatigue', 'flatness', 'numbness', 'discouragement', 'disappointment',
  'regret', 'guilt', 'shame', 'helplessness', 'apathy', 'self-blame', 'low motivation', 'self-criticism', 'embarrassment']);

async function loadCopy(engineId) {
  const m = await import(`./data/copy/${engineId.toLowerCase()}.js`);
  return m.default;
}

export async function run(ctx) {
  const { world, app, ritual, signal, dock } = ctx;
  const v = ritual.params.v3;
  const ENG = ENGINES[v.engine], LAW = LAWS[v.law - 1], SKILL = SKILLS[v.skill];
  // no photos of their own: the seven Mallows become the ritual's material
  // (never worth a wait: after a moment the ritual starts with whatever is ready)
  const soon = (p, ms) => Promise.race([p, new Promise((ok) => setTimeout(() => ok([]), ms))]);
  const standIns = photoSession.count || v.noMallows ? [] : soon(mallowMaterial(ritual.mallows[0]), 1500).catch(() => []);
  // engines measure and wrap text on canvas: the voice face must be loaded first
  const [copyAll, engMod, fallback] = await Promise.all([loadCopy(ENG.id), loadEngine(ENG.id, { force: !!v.force }), standIns, fontsReady(['voice'], 1200)]);
  if (signal.aborted) return { completed: false };
  const copy = copyAll[v.code] || { open: [], during: [], exit: [], bend: '', twist: '', scene: ritual.name };
  const lead = MALLOWS[ritual.mallows[0]];
  const realmDef = REALMS[ritual.world.realm] || Object.values(REALMS)[0];
  const P0 = realmDef.palette;
  const pal = { ...P0, glow: P0.glow, accent: P0.accent, warm: P0.warm || P0.lantern || '#ffb37a', deep: P0.deep, sky: P0.sky, ink: P0.ink, text: '#fffaf0' };
  const heavy = HEAVY.has(v.primary);
  const reduced = !!ctx.reducedMotion, lowStim = !!ctx.lowStim;
  const words = createWords(ctx.input);
  const location = (/ in the ([^:]+):/i.exec(copy.scene || '') || [])[1] || realmDef.name;
  const twistPool = [...new Set(Object.values(copyAll).map((c) => c.twist).filter((x) => x && x !== copy.twist))];
  const twistText = () => (round === 1 || !twistPool.length ? copy.twist : twistPool[(round - 2 + v.num) % twistPool.length]);
  const LOOP_LINES = ['Same move, new light.', 'No score, no rush. Just this.', 'Look how it settles now.', 'Still here with you.',
    'You can stop whenever you like — or keep going.', 'Your words, your pace.', 'Softer every time.'];

  // ------------------------------------------------------------ DOM --
  const titleBox = document.querySelector('#scene .move-title');
  const lawChip = h('div', { class: 'v3-law-chip' });
  titleBox?.append(lawChip);
  const live = h('div', { class: 'sr-only', 'aria-live': 'polite' });
  const spot = h('div', { class: 'v3-spot', 'aria-hidden': 'true' });
  const wordsBtn = h('button', { class: 'v3-words', 'aria-label': 'Your words — read them in full or choose which part to use' });
  const tapBtn = h('button', { class: 'btn v3-tap' }, icon('sparkle'), 'Tap instead');
  const howBtn = h('button', { class: 'btn icon-only', 'aria-label': 'How to play', title: 'How to play' }, '?');
  const helpBtn = h('button', { class: 'btn icon-only', 'aria-label': 'Need support now?', title: 'Need support now?' }, icon('support'));
  const doneBtn = h('button', { class: 'btn v3-done', onclick: () => finish(true) }, 'Finish');
  const row = h('div', { class: 'v3-row' }, tapBtn, howBtn, helpBtn);
  const ctrl = h('div', { class: 'v3-ctrl' }, wordsBtn, row);
  dock.classList.add('v3-dock');
  dock.replaceChildren(spot, ctrl, live);
  const renderWordsBtn = () => wordsBtn.replaceChildren(h('span', { class: 'q' }, '“'), h('span', { class: 't' }, words.token), h('span', { class: 'q' }, '”'), icon('search'));
  renderWordsBtn();
  words.onChange(renderWordsBtn);
  wordsBtn.addEventListener('click', () => openWords());
  howBtn.addEventListener('click', () => openHow());
  helpBtn.addEventListener('click', () => openSupport(app));

  // a line (or a sound, a move of the Mallow) that comes a moment later is dropped once the ritual has ended (Finish,
  // Leave): it would come over the next scene, and could replace that scene's own line (the landing's check-in)
  let finished = false;
  const alive = () => !finished && !signal.aborted;
  const later = (ms, fn) => setTimeout(() => { if (alive()) fn(); }, ms);

  // --------------------------------------------------------- canvas --
  const cvs = h('canvas', { 'aria-hidden': 'true', style: { position: 'absolute', inset: '0', width: '100%', height: '100%', touchAction: 'none' } });
  world.fx.replaceChildren(cvs);
  world.fx.classList.add('live');
  const g = cvs.getContext('2d');
  let dpr = 1;
  const view = { w: innerWidth, h: innerHeight };
  const stage = { x: 0, y: 0, w: 300, h: 300, cx: 150, cy: 150, s: 1, v: 0 };
  let vignette = null;
  function layout() {
    dpr = Math.min(2, devicePixelRatio || 1);
    view.w = innerWidth; view.h = innerHeight;
    cvs.width = Math.round(view.w * dpr); cvs.height = Math.round(view.h * dpr);
    if (phaseName === 'end') { placeMallow('end'); return; }
    const scene = document.getElementById('scene').getBoundingClientRect();
    // the stage is the band between the title and the dock, never under the dock (stage-fit.js); a short band
    // (a small phone at a large text size) compacts the title first
    const titleBottom = () => titleBox?.getBoundingClientRect().bottom ?? 120;
    const dockTop = dock.getBoundingClientRect().top;
    if (titleBox) {
      titleBox.classList.remove('v3-compact');
      if (wantsCompact(titleBottom(), dockTop)) titleBox.classList.add('v3-compact');
    }
    const bar = document.querySelector('#scene .ritual-ui > .topbar')?.getBoundingClientRect().bottom ?? 0;
    Object.assign(stage, stageRect({ left: scene.left, width: scene.width, titleBottom: titleBottom(), dockTop, barBottom: bar }));
    stage.v++;
    vignette = g.createRadialGradient(stage.cx, stage.cy, Math.min(stage.w, stage.h) * 0.2, stage.cx, stage.cy, Math.max(view.w, view.h) * 0.75);
    vignette.addColorStop(0, rgba(pal.deep, 0)); vignette.addColorStop(1, rgba(pal.deep, 0.55));
    placeMallow();
    for (const fn of resizeFns) fn(stage);
  }
  function placeMallow(mode = phaseName) {
    const r = spot.getBoundingClientRect();
    if (mode === 'end' || !r.width) {
      const top = (titleBox?.getBoundingClientRect().bottom ?? 120) + 4, bottom = dock.getBoundingClientRect().top - 4;
      world.fitBetween(top, Math.max(top + 80, bottom), { maxScale: 0.66 });
    } else world.fitBetween(r.top - 8, r.bottom + 2, { maxScale: 0.42, x: ((r.left + r.width / 2) / innerWidth) * 100 });
    keepMallowInside();
  }
  // the Mallow's whole layer (its canvas is what a finger taps) stays on screen, inside the safe-area insets: fitBetween
  // centres its body in the dock's spot, and the layer's transparent margins stuck out a few px at the left and bottom
  const insetProbe = h('div', { 'aria-hidden': 'true', style: { position: 'fixed', left: '0', top: '0', width: '0', height: '0', visibility: 'hidden', pointerEvents: 'none',
    padding: 'env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px) env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px)' } });
  function keepMallowInside() {
    const layer = document.getElementById('mallow-layer');
    if (!layer || !layer.offsetWidth) return;
    if (!insetProbe.isConnected) document.body.append(insetProbe);
    const ins = getComputedStyle(insetProbe), px = (v) => parseFloat(v) || 0;
    const v = (k) => parseFloat(layer.style.getPropertyValue(k));
    const mx = v('--mx'), my = v('--my'), ms = v('--ms');
    if (!Number.isFinite(mx) || !Number.isFinite(my) || !(ms > 0)) return;
    const cx = (mx / 100) * innerWidth, cy = (my / 100) * innerHeight, w = layer.offsetWidth * ms, hh = layer.offsetHeight * ms;
    const fit = keepInside({ left: cx - w / 2, top: cy - hh / 2, right: cx + w / 2, bottom: cy + hh / 2 },
      { left: px(ins.paddingLeft), top: px(ins.paddingTop), right: innerWidth - px(ins.paddingRight), bottom: innerHeight - px(ins.paddingBottom) });
    if (Math.abs(fit.dx) > 0.01 || Math.abs(fit.dy) > 0.01 || fit.k < 1) world.place({ x: ((cx + fit.dx) / innerWidth) * 100, y: ((cy + fit.dy) / innerHeight) * 100, scale: ms * fit.k });
  }
  const resizeFns = new Set();
  const onResize = () => layout();
  addEventListener('resize', onResize);
  let roT = 0;
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { cancelAnimationFrame(roT); roT = requestAnimationFrame(() => { if (alive()) layout(); }); }) : null;
  if (ro) { if (titleBox) ro.observe(titleBox); ro.observe(dock); }

  // ----------------------------------------------------- shared kit --
  const particles = new Particles(lowStim ? 140 : reduced ? 180 : 360);
  const ripples = new Ripples(24);
  const trail = new Trail(40, 0.5);
  const photos = photoApi({ particles, dpr: Math.min(2, devicePixelRatio || 1), seed: v.num, fallback });
  let clock = 0;                            // seconds; stops while paused
  const speed = v.speed || 1;               // dev-lab QA sweeps only
  const now = () => clock;
  let randFn = fx.rng(v.num * 7 + 3);
  const rand = () => randFn();
  let round = 1, roundsDone = 0;
  const lastSound = new Map();
  const sound = (name, o = {}) => { const tt = performance.now(); if (tt - (lastSound.get(name) || 0) < 40) return; lastSound.set(name, tt); app.audio.fx(name, { intensity: 0.5, ...o }); };
  const hold = (name, o) => app.audio.hold(name, o);
  const haptic = (k) => app.haptic(k);
  let reactAt = 0;
  const react = (kind, force = false) => { const tt = performance.now(); if (!force && tt - reactAt < 700) return; reactAt = tt; world.react(kind); };
  // the Mallow's lines never cover the play area (the dial, the path, the pieces to touch): its bubble keeps out of the
  // whole stage, borrowing the title band (whose prompt dims meanwhile) when nothing else is free; read live, so it
  // follows a stage laid out again
  const stageAvoid = () => (phaseName === 'end' ? [] : [{ left: stage.x, top: stage.y, right: stage.x + stage.w, bottom: stage.y + stage.h }]);
  const say = (text, ms = 3400) => { if (text) { ctx.say(text, { who: lead.name, ms, avoid: stageAvoid }); live.textContent = `${lead.name}: ${text}`; } };
  const userMix = faceMix(ctx.input.emotions || []);
  const emote = (k) => {
    const m = {}; for (const [key, val] of Object.entries(userMix)) m[key] = val * (1 - k);
    m.calm = (m.calm || 0) + k * 0.55; m.relieved = (m.relieved || 0) + k * 0.25; m.curious = (m.curious || 0) + (1 - k) * 0.1 + 0.05;
    world.setEmotion(m, lerp(ctx.input.intensity ?? 0.6, 0.6, k), { quiet: true });
  };
  let promptOverride = null;
  const setPrompt = (text) => { promptOverride = text; const p = titleBox?.querySelector('p'); if (p) p.textContent = text; live.textContent = text; };

  // phase state
  let twistSide = null;
  let phaseName = 'play', engine = null, law = null, finaleAt = 0, endAt = 0, lawAt = 0, endShown = false, twistAt = -1, twistShown = false;
  let lastInput = 0, firstTouch = false, lastP = 0, halfSaid = false, lockToastAt = -9, lockMsg = '';
  const route = [];
  const finaleState = {};
  const pointers = new Map();
  let primary = null;

  const E = {
    g, stage, view, fx, pal, realm: ritual.world.realm, mallow: lead.id, heavy, reduced, lowStim, rand,
    words: {
      get full() { return words.full; }, get token() { return words.token; }, get own() { return words.own; },
      draw: (g2, x, y, o) => drawWords(g2, words.token, x, y, o),
    },
    photos, particles, ripples,
    gate: (raw) => (law && phaseName === 'play' ? law.gate(clamp(raw)) : clamp(raw)),
    allow: (p) => (law && phaseName === 'play' ? law.allow(clamp(p)) : true),
    get locked() { return !!(law && phaseName === 'play' && law.locked); },
    checkpoint(name, i) {
      if (name === 'photo') { react('comfort'); haptic('soft'); }
      else if (name === 'step') { haptic('light'); if (rand() < 0.5) react('nod'); }
      else if (name === 'wait') { showLock(); }
    },
    react: (k) => react(k), emote, look: (x, y) => world.rig?.lookAt?.((x / view.w) * 2 - 1, (y / view.h) * 2 - 1),
    sound, hold, haptic,
    get phase() { return phaseName; },
    hint: setPrompt, now, onResize: (fn) => { resizeFns.add(fn); return () => resizeFns.delete(fn); },
    get seed() { return v.num + (round - 1) * 1013; },
    get round() { return round; },
    get calm() { return clamp((round - 1) * 0.15, 0, 0.6); },
  };
  const L = {
    g, get stage() { return stage; }, view, pal, now, particles, ripples, words: E.words, photos, sound, haptic, react: (k) => react(k, true), say, setPrompt,
    get engine() { return engine; }, route, reduced, lowStim, seconds: ritual.durationSec, rand,
    realmMood: (k) => world.realm?.setMood?.({ agitation: lerp(0.5, 0.08, k) }), checkpoint: E.checkpoint,
  };

  // ---------------------------------------------------- words sheet --
  function openWords() {
    const input = h('input', { class: 'search', type: 'text', maxlength: String(TOKEN_MAX), value: words.token, 'aria-label': 'Words the ritual uses (up to 42 characters)' });
    const parts = words.own ? [...new Set(words.full.split(/(?<=[.!?;:,])\s+|\s+[—–-]\s+/).map((s) => s.trim()).filter((s) => s.length > 2).map((s) => excerpt(s)))].slice(0, 6) : [];
    const sh = openSheet({
      title: 'Your words',
      body: h('div', {},
        words.own ? h('p', { class: 'v3-full', tabindex: '0' }, words.full) : h('p', { class: 'muted' }, 'You didn’t type anything, so the ritual is using your feeling words. You can write your own here.'),
        h('div', { class: 'eyebrow', style: { margin: '14px 0 8px' } }, 'The part the ritual carries'),
        parts.length > 1 ? h('div', { class: 'chips', style: { marginBottom: '8px' } }, ...parts.map((pt) => h('button', { class: 'chip', onclick: () => { input.value = pt; } }, pt))) : null,
        input,
        h('p', { class: 'muted', style: { margin: '8px 0 0' } }, 'Only you choose this. Your words stay on this phone and never leave the ritual.')),
      foot: h('button', { class: 'btn primary block', onclick: () => { words.setToken(input.value); sh.close(); } }, 'Use these words'),
    });
  }
  function openHow() {
    const m = engMod.meta || {};
    const steps = [...(m.steps || [ENG.motion]), law.kind === 'phase' ? `Then: ${law.howTo}` : `World law: ${law.howTo}`];
    const pm = m.photos;
    openSheet({
      title: 'How to play',
      body: h('div', {},
        h('p', { style: { fontWeight: 700, fontSize: '17px', margin: '0 0 10px' } }, m.howTo || ENG.motion),
        h('ol', { class: 'v3-steps' }, ...steps.map((s) => h('li', {}, s))),
        h('p', { class: 'muted' }, `Prefer tapping? Press “Tap instead” — ${m.tapAlt || 'each press makes one gentle move'}.`),
        photoSession.count && pm ? h('div', { class: 'summary-card', style: { marginTop: '10px' } },
          h('div', { class: 'k' }, 'Your photos'), h('div', { class: 'v' }, `${pm.where} They become ${pm.becomes}. ${pm.touch} ${pm.change} ${pm.payoff}`)) : null,
        photos.standIn ? h('div', { class: 'summary-card', style: { marginTop: '10px' } },
          h('div', { class: 'k' }, photos.n === 7 ? 'The seven Mallows' : 'The Mallows'),
          h('div', { class: 'v' }, `You didn’t add photos, so ${photos.n === 7 ? 'the seven' : 'the'} Mallows play their part in this ritual${pm?.becomes ? `: they become ${pm.becomes}` : ''}. Add up to seven of your own on the ritual card next time.`)) : null,
        h('div', { class: 'summary-card', style: { marginTop: '10px' } },
          h('div', { class: 'k' }, 'Skill you’re practising'), h('div', { class: 'v' }, `${SKILL.name}: ${SKILL.does}`),
          h('div', { class: 'k' }, 'Why it can help'), h('div', { class: 'v' }, `${SKILL.insight} (${SKILL.scope})`))),
    });
  }

  // ---------------------------------------------------------- input --
  const toLocal = (e) => ({ x: e.clientX, y: e.clientY, id: e.pointerId, t: now() });
  function onDown(e) {
    if (paused() || phaseName === 'finale' || phaseName === 'end') return;
    try { cvs.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    const p = toLocal(e);
    pointers.set(e.pointerId, p);
    if (primary == null) primary = e.pointerId;
    lastInput = now();
    trail.clear(); trail.add(p.x, p.y);
    ripples.add(p.x, p.y, { colour: pal.glow, speed: 60, alpha: 0.45, r: 6 });
    if (!firstTouch) { firstTouch = true; react('tap', true); world.setStage?.('listening'); }
    E.look(p.x, p.y);
    if (phaseName === 'play') { law.onDown?.(p); engine.down?.(p); route.push([p.x, p.y]); }
    else if (phaseName === 'law') law.down?.(p);
  }
  function onMove(e) {
    if (!pointers.has(e.pointerId) || paused()) return;
    const evs = e.getCoalescedEvents?.() || [e];
    for (const ce of evs.length ? evs : [e]) {
      const p = { x: ce.clientX, y: ce.clientY, id: e.pointerId, t: now() };
      pointers.set(e.pointerId, p);
      if (e.pointerId === primary) { trail.add(p.x, p.y); if (phaseName === 'play') { route.push([p.x, p.y]); if (route.length > 900) route.splice(0, 300); } }
      if (phaseName === 'play') engine.move?.(p); else if (phaseName === 'law') law.move?.(p);
    }
    lastInput = now();
  }
  function onUp(e) {
    if (!pointers.has(e.pointerId)) return;
    const p = { x: e.clientX, y: e.clientY, id: e.pointerId, t: now() };
    pointers.delete(e.pointerId);
    if (e.pointerId === primary) primary = pointers.size ? pointers.keys().next().value : null;
    lastInput = now();
    if (phaseName === 'play') { engine.up?.(p); if (!pointers.size) law.onUp?.(p); }
    else if (phaseName === 'law') law.up?.(p);
  }
  cvs.addEventListener('pointerdown', onDown);
  cvs.addEventListener('pointermove', onMove);
  cvs.addEventListener('pointerup', onUp);
  cvs.addEventListener('pointercancel', onUp);
  cvs.addEventListener('lostpointercapture', (e) => { if (pointers.has(e.pointerId)) onUp(e); });
  tapBtn.addEventListener('click', () => {
    if (paused()) return;
    lastInput = now();
    if (!firstTouch) { firstTouch = true; react('tap', true); }
    if (phaseName === 'play') {
      if (law.locked) { showLock(); return; }
      law.onDown?.({ x: 0, y: 0, id: -1 });
      engine.assist?.();
      later(90, () => law?.onUp?.({ x: 0, y: 0, id: -1 }));
    } else if (phaseName === 'law') law.assist?.();
    app.audio.ui('tap');
  });
  const paused = () => !!document.querySelector('#sheet-root .sheet');

  function showLock() { if (!law || law.kind !== 'gate') return; lockMsg = law.lockText || LAW_LOCK_TEXT[v.law] || ''; if (now() - lockToastAt > 2.4) { lockToastAt = now(); live.textContent = lockMsg; } }

  // ---------------------------------------------------------- start --
  function begin({ loop = false } = {}) {
    engine?.destroy?.(); resizeFns.clear();
    if (!loop) { round = 1; roundsDone = 0; }
    randFn = fx.rng(v.num * 7 + 3 + (round - 1) * 101);
    row.replaceChildren(tapBtn, round > 1 ? doneBtn : howBtn, helpBtn);
    clock = 0; phaseName = 'play'; finaleAt = 0; endShown = false; twistAt = -1; twistShown = false; firstTouch = false; lastP = 0; halfSaid = false;
    route.length = 0; particles.clear(); trail.clear(); for (const k in finaleState) delete finaleState[k];
    promptOverride = null;
    dock.replaceChildren(spot, ctrl, live);
    dock.classList.remove('v3-ending');
    cvs.style.transition = 'opacity 400ms ease'; cvs.style.opacity = '1';
    const gate = [1, 2, 5, 6, 10].includes(v.law);
    if (round > 1) lawChip.replaceChildren(h('b', {}, `↻ Round ${round}`), ' · ', gate ? `${LAW.name}: ${GATE_HOW[v.law]}` : 'keep going as long as it helps');
    else lawChip.replaceChildren(h('b', {}, `✦ ${LAW.name}`), ' · ', gate ? GATE_HOW[v.law] : 'then one closing move');
    ctx.setMove(0, { eyebrow: round > 1 ? `${location} · Round ${round}` : location, title: ENG.name, prompt: engMod.meta?.howTo || ENG.motion });
    layout();
    engine = engMod.create(E);
    engine.pointAt ??= () => ({ x: stage.cx, y: stage.cy });
    // loop rounds keep the world law's feel (gate laws) but skip the closing move, so the loop stays tight
    law = round > 1 && !gate ? passLaw() : createLaw(v.law, L);
    placeMallow('play');
    emote(Math.min(0.5, (round - 1) * 0.12));
    world.realm?.transform?.(Math.min(0.4, (round - 1) * 0.1));
    world.realm?.setEmotion?.(Object.keys(userMix)[0] || 'neutral', ctx.input.intensity ?? 0.6);
    lastInput = 0;
    const r0 = round;
    if (round === 1) later(650, () => { if (phaseName === 'play') say(copy.open[0], 3800); });
    else if (round % 3 === 0) later(900, () => { if (round === r0) say(round % 5 === 0 ? 'We can keep going as long as it helps. Or rest here — that counts too.' : LOOP_LINES[(round + v.num) % LOOP_LINES.length], 3000); });
  }
  function passLaw() { return { kind: 'none', gate: (r) => r, allow: () => true, gateReady: () => true, locked: false, frame() {}, onDown() {}, onUp() {} }; }

  // ---------------------------------------------------------- frame --
  let raf = 0, tPrev = performance.now(), resolveRun;
  const done = new Promise((r) => { resolveRun = r; });
  function frame(tNow) {
    raf = requestAnimationFrame(frame);
    const realDt = Math.min(0.25, (tNow - tPrev) / 1000); tPrev = tNow;
    const isPaused = paused();
    const dt = isPaused ? 0 : Math.min(0.05, realDt * speed);
    if (!isPaused) clock += realDt * speed;
    const t = clock;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, view.w, view.h);
    g.fillStyle = vignette; g.fillRect(0, 0, view.w, view.h);
    try {
      engine.frame(dt, t);
    } catch (err) { console.error('[v3 engine]', err); }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.setLineDash([]);
    // only gate laws draw during play (guides, pulses, wakes); closing-move laws wait for their own phase
    if (phaseName === 'play') { if (law.kind === 'gate') law.frame?.(g, t, dt); updatePlay(); }
    else if (phaseName === 'law') { veil(0.44 * smooth(clamp((now() - lawAt) / 0.7))); lawWipe(); law.frame(g, t, dt); if (law.done) startFinale(); }
    particles.update(dt); particles.draw(g);
    ripples.update(dt); ripples.draw(g, 0.9);
    trail.update(dt); if (pointers.size && phaseName !== 'finale' && phaseName !== 'end' && engMod.meta?.trail !== false) trail.draw(g, pal.glow, 9);
    if (phaseName === 'finale' || phaseName === 'end') drawFinale(t);
    drawTwist(t);
    drawLock(t);
    drawGhost(t);
    expose();
  }

  function updatePlay() {
    const p = clamp(engine.progress || 0);
    if (p > lastP + 0.001) {
      if (Math.floor(p * 10) > Math.floor(lastP * 10)) haptic('tick');
      if (Math.floor(p * 4) > Math.floor(lastP * 4)) emote(Math.floor(p * 4) / 4 * 0.7);
      world.realm?.transform?.(p * 0.55);
      lastP = p;
    }
    if (!halfSaid && p >= 0.5) { halfSaid = true; if (round === 1) say(copy.during[0], 3600); react('nod', true); }
    if (!twistShown && p >= 0.62) { twistShown = true; twistAt = now(); twistSide = null; engine.twist?.(); world.realm?.pulse?.('burst', { x: stage.cx, y: stage.cy }); sound('shimmer', { intensity: 0.5 }); react('gasp', true); }
    if (law.locked && pointers.size) showLock();
    if (engine.done && law.gateReady()) {
      if (law.kind === 'phase') startLaw(); else startFinale();
    }
  }

  function lawWipe() {
    // a soft ring of light sweeps outward as the world law takes over
    const k = (now() - lawAt) / 0.9;
    if (k >= 1) return;
    const r = Math.max(view.w, view.h) * ease.outCubic(k);
    g.save(); g.globalCompositeOperation = 'lighter';
    g.strokeStyle = rgba(pal.glow, 0.5 * (1 - k)); g.lineWidth = 24 * (1 - k) + 2;
    g.beginPath(); g.arc(stage.cx, stage.cy, r, 0, Math.PI * 2); g.stroke(); g.restore();
  }

  function startLaw() {
    phaseName = 'law'; lawAt = now();
    law.begin?.();
    sound('unlock', { intensity: 0.45 }); haptic('success'); react('success', true);
    ctx.setMove(1, { eyebrow: `${location} · World law`, title: LAW.name, prompt: law.howTo });
    if (promptOverride) promptOverride = null;
    lawChip.replaceChildren(h('b', {}, 'Closing move'), ' · ', LAW.rule.length < 90 ? LAW.rule : law.howTo);
    if (copy.during[1]) later(900, () => { if (phaseName === 'law') say(copy.during[1], 3400); });
    lastInput = now();
  }

  function startFinale() {
    if (phaseName === 'finale' || phaseName === 'end') return;
    phaseName = 'finale'; finaleAt = now();
    pointers.clear(); primary = null;
    engine.finish?.();
    world.realm?.transform?.(1);
    world.realm?.pulse?.('clear', { x: stage.cx, y: stage.cy });
    sound(heavy ? 'settle' : 'clear', { intensity: 0.55 });
    if (heavy) later(500, () => sound('chime', { intensity: 0.35 }));
    haptic('success');
    emote(1);
    if (heavy) { world.setStage?.('comforting'); react('comfort', true); } else { world.setStage?.('celebrating'); react('celebrate', true); }
    ctx.setMove(law.kind === 'phase' ? 2 : 1, { eyebrow: location, title: ENG.name, prompt: cap(ENG.win) + '.' });
    lawChip.replaceChildren(h('b', {}, `✦ ${LAW.name}`), ' · ', cap(LAW.payoff) + '.');
    if (round === 1) later(500, () => { if (phaseName === 'finale') say(copy.exit[0], 4200); });
    roundsDone++;
  }

  function drawFinale(t) {
    const k = now() - finaleAt;
    const lk = clamp(k / 3.6);
    drawLightFinale(v.law, g, lk, L, finaleState);
    law.payoff?.(g, ease.outCubic(clamp(k / 1.2)));
    if (!endShown && k > Math.max(3.8, engMod.meta?.finaleSec || 0)) {
      if (round === 1) showEnd();
      else { endShown = true; nextRound(); }
    }
    void t;
  }

  function nextRound() {
    round++;
    sound('unlock', { intensity: 0.35 });
    begin({ loop: true });
  }

  function showEnd() {
    endShown = true; phaseName = 'end'; endAt = now();
    clearBubble();
    // let the Mallow (beneath this canvas) come forward beside the mind bend
    cvs.style.transition = 'opacity 900ms ease'; cvs.style.opacity = '0.16';
    const bend = copy.bend || '';
    const keepBox = h('input', { type: 'checkbox' });
    keepBox.checked = photoSession.keep;
    keepBox.addEventListener('change', () => { photoSession.keep = keepBox.checked; });
    const card = h('div', { class: 'card v3-end' },
      h('div', { class: 'eyebrow', style: { color: 'var(--accent)' } }, 'Mind bend'),
      h('p', { class: 'v3-bend' }, bend),
      h('div', { class: 'v3-skill' }, h('b', {}, SKILL.name), ` · ${SKILL.does}`),
      photoSession.count ? h('label', { class: 'v3-keep' }, keepBox, ' Keep my photos for the next ritual (otherwise they’re cleared now)') : null,
      h('div', { class: 'row-btns', style: { marginTop: '12px' } },
        h('button', { class: 'btn', onclick: () => finish(true) }, 'I’m done'),
        h('button', { class: 'btn primary', onclick: () => { app.audio.ui('tap'); nextRound(); } }, icon('refresh'), 'Keep playing')),
      h('p', { class: 'muted v3-loop-note' }, 'Keep playing loops the same game in fresh light, a little calmer each round. Stop any time.'));
    dock.classList.add('v3-ending');
    dock.replaceChildren(card, live);
    live.textContent = `Mind bend: ${bend}`;
    ctx.setMove(law.kind === 'phase' ? 3 : 2, { eyebrow: `${lead.name} · ${location}`, title: ritual.name.split(' — ')[0], prompt: 'Done. Take the moment with you.' });
    lawChip.replaceChildren();
    requestAnimationFrame(() => { if (alive()) placeMallow('end'); });
  }

  function veil(a) { g.fillStyle = rgba(pal.deep, a); g.fillRect(0, 0, view.w, view.h); }

  // twist banner
  function drawTwist(t) {
    const tw = twistText();
    if (twistAt < 0 || !tw) return;
    const k = now() - twistAt, dur = 4.4;
    if (k > dur) return;
    const a = smooth(clamp(k / 0.5)) * (1 - smooth(clamp((k - dur + 0.7) / 0.7)));
    const s = stage.s, w = Math.min(stage.w - 8, 330 * s);
    g.save();
    const body = Math.max(14, 14 * s + 1), lead = body * 1.3;
    g.font = canvasFontPx(body, 600);
    const lines = fx.wrap(g, tw, w - 28, 3);
    const hgt = 34 + lines.length * lead;
    // sit at the top or the bottom of the stage, whichever is away from the active object
    if (twistSide == null) { const q = engine?.pointAt?.(clamp(engine.progress || 0)) || { y: stage.cy }; twistSide = q.y < stage.cy ? 'bottom' : 'top'; }
    const slide = (1 - ease.outCubic(clamp(k / 0.6))) * 24;
    const y = twistSide === 'top' ? stage.y + 6 - slide : stage.y + stage.h - hgt - 6 + slide;
    g.globalAlpha = a * 0.94;
    fx.roundRect(g, stage.cx - w / 2, y, w, hgt, 18); g.fillStyle = 'rgba(16,10,40,0.78)'; g.fill();
    g.strokeStyle = rgba(pal.accent, 0.5); g.lineWidth = 1.2; g.stroke();
    // shimmer sweep across the plate
    const sx = stage.cx - w / 2 + ((k * 0.7) % 1.4) * w;
    const sg = g.createLinearGradient(sx - 60, 0, sx + 60, 0); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.12)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = sg; fx.roundRect(g, stage.cx - w / 2, y, w, hgt, 18); g.fill();
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = pal.accent; g.font = canvasFontPx(Math.max(13, 12 * s + 1), 800, 'ui');
    if ('letterSpacing' in g) g.letterSpacing = '1.5px';
    g.fillText('PLOT TWIST', stage.cx, y + 16);
    if ('letterSpacing' in g) g.letterSpacing = '0px';
    g.fillStyle = '#fffaf0'; g.font = canvasFontPx(body, 600);
    lines.forEach((l, i) => g.fillText(l, stage.cx, y + 34 + lead * (i + 0.5)));
    g.restore();
    if (k < 0.1) live.textContent = `Plot twist: ${tw}`;
    void t;
  }
  function drawLock(t) {
    const k = now() - lockToastAt;
    if (k > 2.4 || !lockMsg) return;
    const a = smooth(clamp(k / 0.25)) * (1 - smooth(clamp((k - 1.9) / 0.5)));
    drawWords(g, lockMsg, stage.cx, stage.y + stage.h - 14, { style: 'plate', size: 13 * stage.s + 1, maxWidth: stage.w - 20, lines: 2, alpha: a, glowColour: pal.glow });
    void t;
  }

  // ghost finger: after a few idle seconds, show what to do (never does it)
  function drawGhost(t) {
    if (phaseName !== 'play' && phaseName !== 'law') return;
    if (pointers.size) return;
    const idle = now() - lastInput;
    const delay = firstTouch ? 5 : 2.2;
    if (idle < delay) return;
    const cyc = (idle - delay) % 3.2;
    if (cyc > 2.2) return;
    const hnt = phaseName === 'play' ? engine.hint?.() : law.hint?.();
    if (!hnt) return;
    let x, y, a = smooth(clamp(cyc / 0.3)) * (1 - smooth(clamp((cyc - 1.8) / 0.4)));
    if (hnt.tap) { x = hnt.tap.x; y = hnt.tap.y; const pk = Math.sin(clamp((cyc - 0.4) / 0.6) * Math.PI); ghostDot(x, y, a, 1 - pk * 0.25, pk); return; }
    let from = hnt.from, to = hnt.to;
    if (hnt.path) { const k2 = ease.inOutSine(clamp((cyc - 0.3) / 1.4)); const P = hnt.path, i = Math.min(P.length - 1, Math.floor(k2 * (P.length - 1))); x = P[i][0]; y = P[i][1]; from = { x: P[0][0], y: P[0][1] }; }
    else { const k2 = ease.inOutSine(clamp((cyc - 0.3) / 1.4)); x = lerp(from.x, to.x, k2); y = lerp(from.y, to.y, k2); }
    ghostDot(x, y, a, 1, 0);
    void t;
  }
  function ghostDot(x, y, a, scale, press) {
    g.save(); g.globalAlpha = a * 0.9;
    glow(g, x, y, 30 * scale, '#ffffff', 0.35 * a);
    g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 16 * scale, 0, Math.PI * 2); g.stroke();
    g.fillStyle = `rgba(255,255,255,${0.35 + press * 0.4})`; g.beginPath(); g.arc(x, y, 9 * scale, 0, Math.PI * 2); g.fill();
    g.restore();
  }

  function expose() {
    if (!globalThis.__hm3) globalThis.__hm3 = {};
    Object.assign(globalThis.__hm3, {
      id: ritual.id, engine: ENG.id, law: v.law, phase: phaseName, round,
      keepPlaying: () => { if (phaseName === 'end') nextRound(); }, finishNow: () => finish(true),
      progress: engine ? clamp(engine.progress || 0) : 0, lawProgress: law?.kind === 'phase' ? clamp(law.progress || 0) : null,
      locked: !!law?.locked, photos: photos.n, userPhotos: photoSession.count, mallows: photos.standIn, token: words.token, stage: { ...stage },
      hint: () => (phaseName === 'play' ? engine.hint?.() : law?.hint?.()) || null,
      pointAt: (p) => engine?.pointAt?.(p),
    });
  }

  // --------------------------------------------------------- finish --
  function cleanup() {
    cancelAnimationFrame(raf); cancelAnimationFrame(roT);
    removeEventListener('resize', onResize);
    ro?.disconnect();
    try { engine?.destroy?.(); } catch (e) { console.warn(e); }
    world.fx.classList.remove('live');
    world.fx.replaceChildren();
    lawChip.remove();
    insetProbe.remove();
    titleBox?.classList.remove('v3-compact');
    dock.classList.remove('v3-dock', 'v3-ending');
    if (globalThis.__hm3) globalThis.__hm3.phase = 'closed';
  }
  function finish(completed) {
    if (finished) return; finished = true;
    cleanup();
    photoSession.release();
    resolveRun({
      completed, rounds: roundsDone,
      summary: [
        { label: 'Touch engine', text: `${ENG.name} — ${cap(ENG.win)}.` },
        { label: 'World law', text: `${LAW.name} — ${cap(LAW.payoff)}.` },
        { label: 'Skill practised', text: `${SKILL.name}: ${SKILL.does}` },
        ...(copy.bend ? [{ label: 'Mind bend', text: copy.bend }] : []),
        ...(roundsDone > 1 ? [{ label: 'Calm rounds', text: `You played ${roundsDone} rounds.` }] : []),
      ],
      share: { title: ritual.name.split(' — ')[0], subtitle: `A ${brandName} ritual with ${lead.name}` },
    });
  }
  signal.addEventListener('abort', () => { if (!finished) { finished = true; cleanup(); photoSession.release(); resolveRun({ completed: false }); } });

  begin();
  raf = requestAnimationFrame((t0) => { tPrev = t0; frame(t0); });
  return done;
}

const cap = (s) => { s = String(s || '').trim(); return s ? s[0].toUpperCase() + s.slice(1) : s; };
