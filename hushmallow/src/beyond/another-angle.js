// ANOTHER ANGLE — hushmallow Beyond's cinematic, playable reframe, with Zuzu.
//
// One continuous scene in the Spiral Observatory, no chatbot bubbles and no
// forms. Zuzu is a living, squeezable MallowTouch Mallow the whole time
// (also while a perspective is being prepared: there is no spinner).
//
//   arrive → (consent, once, when the server is configured) → invitation →
//   the compact input (the person's words + an optional feeling) →
//   safety (crisis: urgent support, nothing sent; care: support, no reframe) →
//   the words become a Thought Mallow while Zuzu explores another angle →
//   one of ten mechanics (picked by the scene's interaction_type) →
//   a new perspective: two subtitle lines from the scene's Mallow beside Zuzu →
//   optional "test it" prompts → That helped / Show me another angle /
//   Not relevant / I'd rather just squeeze a Mallow → Keep this discovery
//   (Memory Garden) → Continue (Hushflow) or Finish.
//
// Offline, without consent, without an endpoint, on a timeout or a server
// fallback, the same scenes play from the authored engine (authored.js), after
// the app's own safety check. The person's words are only ever shown exactly
// as typed (DOM textContent), never stored, and only sent after consent.
//
// createAnotherAngle(app, { root, params }) → { enter(), leave(), get blockBack(), safeForUpdate() }

import { h } from '../app/ui.js';
import { MALLOWS } from '../mallows/registry.js';
import { openSupport } from '../app/scenes/support.js';
import { checkText } from '../engine/safety.js';
import { hfIcon } from '../hushfold/icons.js';
import { ensureBeyondCss } from './styles.js';
import {
  WAITING, WAITING_LONG, ARRIVAL, SAFETY, UNCLEAR, MECHANIC_LINES, EXPLORE, EXPLORE_ASK, EXPLORE_MORE, EXPLORE_EMPTY,
  FRIEND_LINES, FEEDBACK, END, ZUZU_SQUEEZE, pick,
} from './lines.js';
import { authoredScene, sceneParts } from './authored.js';
import { consentState, openConsent, noteFeedback, lessWanted, STORE_KEYS } from './consent.js';
import { createAngleClient, resolveEndpoint } from './angle-client.js';
import { RATINGS, MECHANICS } from './vocab.js';
import { loadMechanic, prefetchMechanic } from './mechanics/index.js';
import { makeTags, Blob, tintFor, drawGlow, blinkAt, clamp, approach, setLowStim } from './mechanics/kit.js';

const DEV = () => typeof location !== 'undefined' && ['localhost', '127.0.0.1'].includes(location.hostname);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const now = () => performance.now();
const hasWords = (t) => /[\p{L}\p{N}]/u.test(String(t || ''));
const REACTIONS = new Set(['squeeze', 'tap', 'doubleTap', 'flick', 'stretch', 'massage', 'stroke', 'jiggle', 'pull']);

export function createAnotherAngle(app, { root, params = {} } = {}) {
  const { world, prefs, store } = app;
  const rmOn = () => prefs.reducedMotion();
  const lowOn = () => !!prefs.get('lowStim');
  const ZUZU = MALLOWS.zuzu;
  const endpoint = resolveEndpoint();
  const client = endpoint ? createAngleClient({ store, endpoint }) : null;
  const serverMode = () => !!client && consentState(store) === 'yes';

  const S = {
    left: false, phase: 'arrive', text: params.text || '', emotion: null, intention: null,
    scene: null, shown: [], used: [], crisis: false, care: false, keepSupport: false, kept: false,
    touches: 0, squeezes: 0, seq: 0, lastLineAt: 0, offlineSaid: false, explored: 0,
  };
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); if (!S.left) fn(); }, ms); timers.add(t); return t; };

  // ------------------------------------------------------------ DOM --
  ensureBeyondCss();
  root.classList.add('beyond');
  const backBtn = h('button', { class: 'hf-btn', type: 'button', 'aria-label': 'Leave Another Angle', onclick: () => app.back() }, hfIcon('prev'));
  const supportBtn = h('button', { class: 'hf-btn', type: 'button', 'aria-label': 'Need support now?', onclick: () => openSupport(app) }, hfIcon('support'));
  const top = h('header', { class: 'bx-top' }, backBtn, h('span', { class: 'bx-name' }, 'Another Angle'), h('div', { class: 'grow' }), supportBtn);
  const assistLabel = h('span', {});
  const assistBtn = h('button', { class: 'hf-pill assist', type: 'button', hidden: true, 'data-bx': 'assist', onclick: () => { S.touches++; mech?.assist?.(); } }, h('span', { class: 'dot', 'aria-hidden': 'true' }), assistLabel);
  const tellPill = h('button', { class: 'hf-pill', type: 'button', hidden: true, 'data-bx': 'tell', onclick: () => openTell() }, hfIcon('talk'), 'Tell Zuzu');
  const supportPill = h('button', { class: 'hf-pill support', type: 'button', hidden: true, onclick: () => openSupport(app) }, hfIcon('support'), 'Support');
  const finishPill = h('button', { class: 'hf-pill', type: 'button', hidden: true, 'data-bx': 'finish', onclick: () => finish() }, hfIcon('finish'), 'Finish');
  const dock = h('div', { class: 'bx-dock' }, assistBtn, tellPill, supportPill, finishPill);
  const live = h('p', { class: 'sr-only', 'aria-live': 'polite' });
  root.append(h('h1', { class: 'sr-only' }, 'Another Angle, with Zuzu. Squeeze Zuzu any time.'), top, dock, live);
  const tags = makeTags(root);

  // -------------------------------------------------------- the stage --
  let canvas = null, g = null, dpr = 1, W = 0, H = 0;
  let subs = null, router = null, inputMod = null, touchBox = null, zt = null, zAd = null, compBox = null, ct = null, compAd = null, compId = null;
  let overlay = null, consentCard = null, mech = null, mechId = null, thought = null, thoughtTag = null, rigTicker = null, removeTicker = null;
  let area = { x: 16, y: 160, w: 358, h: 360 };
  const ripples = [];
  const layer = { overlay: 0 };

  function resize() {
    if (!canvas) return;
    dpr = Math.min(2, devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    layout();
  }
  const topBottom = () => top.getBoundingClientRect().bottom || 58;
  function dockTop() {
    const shown = [...dock.children].some((c) => !c.hidden);
    const r = shown ? dock.getBoundingClientRect() : null;
    return r && r.height ? r.top : innerHeight - 22;
  }

  /** Zuzu (and the scene's Mallow) at the bottom, the play area between the subtitle band and their heads. */
  function layout() {
    if (S.left || !zAd) return;
    const vw = innerWidth, vh = innerHeight;
    const topB = topBottom();
    const two = !!compAd;
    const ov = overlay?.rect?.();
    let B = clamp(Math.min(vw * 0.42, vh * 0.21), 96, 210);
    if (S.phase === 'squeeze' || S.phase === 'support') B = clamp(Math.min(vw * 0.6, vh * 0.34), 140, 320);
    if (consentCard) B = clamp(vh * 0.16, 84, 150);
    if (two) B *= 0.86;
    let cy = dockTop() - 14 - B / 2;
    if (ov?.height) {
      // typing: Zuzu waits below the compact overlay, smaller
      B = clamp(Math.min(vw * 0.36, (vh - ov.bottom) * 0.55), 80, 180);
      cy = Math.min(vh - 24 - B / 2, ov.bottom + 18 + B / 2);
    }
    const cxZ = two ? vw * 0.33 : vw / 2;
    zAd.fit?.({ cx: cxZ, cy, size: B });
    compAd?.fit?.({ cx: vw * 0.69, cy: cy + B * 0.03, size: B * 0.94 });
    const band = clamp(vh * 0.14, 86, 132);
    const aTop = topB + band, aBottom = cy - B / 2 - 16;
    const aw = Math.min(vw - (vw < 360 ? 20 : 32), 560);
    area = { x: (vw - aw) / 2, y: aTop, w: aw, h: Math.max(150, aBottom - aTop) };
    root.style.setProperty('--bx-card-max', `${Math.round(Math.max(230, cy - B / 2 - 14 - (topB + 8)))}px`);
    subs?.layout();
  }
  let resizeT = 0;
  const onResize = () => { clearTimeout(resizeT); resizeT = setTimeout(resize, 120); };

  // ------------------------------------------------------- subtitles --
  const who = (id = 'zuzu') => { const m = MALLOWS[id] || ZUZU; return { who: m.name, colour: m.colours.glow }; };
  const say = (text, opts = {}) => { if (!text || !subs) return Promise.resolve(false); S.lastLineAt = now(); return subs.say(text, { ...who(opts.mallow), ...opts }); };
  const choose = (prompt, options, opts = {}) => (subs ? subs.choice(prompt, options, { ...who(opts.mallow), ...opts }) : Promise.resolve(null));
  const announce = (t) => { live.textContent = ''; requestAnimationFrame(() => { live.textContent = t; }); };
  function rectOf(ad, pad = 0.12) {
    const b = ad?.bodyRect?.();
    if (!b || !b.height) return null;
    return { left: b.left, right: b.left + b.width, top: b.top - Math.max(16, b.height * pad), bottom: b.top + b.height + 6 };
  }
  function subsAvoid() {
    const list = [rectOf(zAd), rectOf(compAd), overlay?.rect?.(), consentCard?.rect?.()];
    // while a mechanic is being played, its objects and labels stay clear; once it has landed, only the Mallows matter
    if (mech && !mech.settled) list.push(...(mech.avoid?.() || []));
    else if (thought && !mech) list.push({ left: thought.x - thought.r * 1.4, right: thought.x + thought.r * 1.4, top: thought.y - thought.r * 1.4, bottom: thought.y + thought.r * 1.4 + 44 });
    return list.filter(Boolean);
  }

  // ----------------------------------------------------- the ticker --
  function tick(dt, t) {
    if (S.left || !g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    // touch ripples on empty sky
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.t += dt / (rmOn() ? 0.45 : 0.9);
      if (r.t >= 1) { ripples.splice(i, 1); continue; }
      const k = r.t, a = (1 - k) * (1 - k) * (lowOn() ? 0.14 : 0.3);
      g.globalAlpha = a; g.strokeStyle = '#9ff7ff'; g.lineWidth = 2;
      g.beginPath(); g.arc(r.x, r.y, rmOn() ? 18 : 10 + 50 * (1 - (1 - k) * (1 - k)), 0, Math.PI * 2); g.stroke();
      g.globalAlpha = 1;
    }
    if (thought && !mech) drawThought(dt, t);
    if (mech) { try { mech.frame(dt, t); } catch (e) { console.warn('[another angle] mechanic frame', e?.message); } }
    g.globalAlpha = 1;
  }

  // ------------------------------------------------- Thought Mallow --
  // The words become a small, distressed Thought Mallow while Zuzu explores:
  // it is squeezable too, and the mechanic takes it over from where it sits.
  function spawnThought() {
    const [light, deep] = tintFor(S.emotion);
    const r = clamp(Math.min(area.w, area.h) * 0.12, 26, 42);
    const ov = overlay?.rect?.();
    thought = new Blob({ x: innerWidth / 2, y: ov?.bottom ? ov.top + 60 : area.y, r, light, deep });
    thought.scale = rmOn() ? 1 : 0.2;
    thought.born = 0;
    thoughtTag?.remove();
    thoughtTag = tags.add(sceneParts(S.text).excerpt, { kind: 'words' });
    placeThought();
    if (rmOn()) { thought.x = thought.hx; thought.y = thought.hy; }
  }
  function placeThought() { if (thought) { thought.hx = area.x + area.w / 2; thought.hy = area.y + area.h * 0.46; } }
  function drawThought(dt, t) {
    placeThought();
    const rm = rmOn();
    thought.scale = rm ? 1 : approach(thought.scale, 1, 3, dt);
    thought.born = Math.min(1, thought.born + dt / (rm ? 0.3 : 0.9));
    if (!rm && !thought.press) thought.hy += Math.sin(t * 1.6) * 3;
    thought.step(dt, rm);
    const jit = rm || lowOn() ? 0 : 0.9;
    thought.draw(g, { tension: 0.75, sad: /sad|lonel|hurt|disap/.test(S.emotion || '') ? 0.5 : 0.1, blink: blinkAt(t, 0.4), press: thought.press ? 1 : 0,
      lookX: Math.sin(t * 0.7) * 0.4 }, { x: thought.x + (jit ? Math.sin(t * 29) * jit : 0), alpha: thought.born });
    thoughtTag?.at(thought.x, thought.y + thought.r * thought.scale * 1.1 + 6, 'bottom', thought.born);
  }
  function thoughtPointer(e) {
    if (!thought) return false;
    if (e.type === 'down') { if (!thought.hit(e.x, e.y, 1.4)) return false; thought.grab(e); app.haptic('light'); S.touches++; return true; }
    if (e.type === 'move') return thought.drag(e);
    if (e.type === 'up' || e.type === 'cancel') { const p = thought.drop(e); if (p) placeThought(); return !!p; }
    return false;
  }
  function dropThought() { thought = null; thoughtTag?.remove(); thoughtTag = null; }

  // --------------------------------------------------------- input --
  function stagePointer(e) {
    let used = false;
    if (mech) used = !!mech.pointer?.(e);
    else if (thought) used = thoughtPointer(e);
    if (!used && e.type === 'down') { if (ripples.length > 4) ripples.shift(); ripples.push({ x: e.x, y: e.y, t: 0 }); }
    if (e.type === 'down') S.touches++;
  }
  function onZuzuTouch(e) {
    if (e.kind === 'press') { S.touches++; return; }
    if (!REACTIONS.has(e.kind)) return;
    S.squeezes++;
    if (overlay || S.phase === 'typing') return;
    // an occasional line, never a running commentary (and never over a perspective)
    if (['arrive', 'invite', 'squeeze', 'end'].includes(S.phase) && !subs?.busy && now() - S.lastLineAt > 9000 && S.squeezes % 3 === 1) say(pick(ZUZU_SQUEEZE, S.squeezes));
  }

  // ------------------------------------------------- Mallows on stage --
  async function makeTouch(id, box) {
    const { MallowTouch } = await import('../mallows/touch/mallow-touch.js');
    const mt = new MallowTouch(box, { id, bindPointer: false, reducedMotion: rmOn(), lowStim: lowOn(), audio: prefs.get('sound') ? app.audio : null, haptic: (k) => app.haptic(k) });
    await mt.loaded;
    return mt;
  }
  async function bringCompanion(id) {
    if (S.left || !id || id === 'zuzu' || id === compId) return;
    dismissCompanion(true);
    compId = id;
    try {
      compBox = h('div', { class: 'hf-touch' });
      world.fx.before(compBox);
      const { createStageMallow } = await import('../hushfold/stage.js');
      ct = await makeTouch(id, compBox);
      if (S.left || compId !== id) { ct.destroy(); compBox.remove(); return; }
      compAd = createStageMallow(world, { touch: ct });
      // enters from the right side of the stage
      ct.place({ x: innerWidth + 120, y: zAd.bodyRect().cy }, { instant: true });
      layout();
      if (!rmOn()) ct.react('hop');
      ct.setStage('curious');
    } catch (e) { console.info('[another angle] companion unavailable', e?.message); compAd = null; ct = null; compBox?.remove(); compBox = null; compId = null; }
  }
  function dismissCompanion(now_ = false) {
    if (!ct) { compId = null; return; }
    const c = ct, box = compBox;
    ct = null; compAd = null; compBox = null; compId = null;
    if (!now_ && !rmOn()) c.place({ x: innerWidth + 160 });
    setTimeout(() => { try { c.destroy(); } catch { /* ignore */ } box?.remove(); }, now_ || rmOn() ? 0 : 520);
    layout();
  }

  // ---------------------------------------------------------- dock --
  function dockShow({ assist = null, tell = false, finish: fin = false } = {}) {
    assistBtn.hidden = !assist;
    if (assist) { assistLabel.textContent = assist; assistBtn.setAttribute('aria-label', `${assist} (instead of touch)`); }
    tellPill.hidden = !tell;
    finishPill.hidden = !fin;
    supportPill.hidden = !(S.keepSupport || S.care || S.crisis);
    layout();
  }

  // ---------------------------------------------------------- flow --
  async function arrive() {
    S.phase = 'arrive';
    zt?.setStage('curious');
    if (!rmOn()) zt?.react('hop');
    if (client && consentState(store) === 'unasked') { await askConsent(); if (S.left) return; }
    invite();
  }
  function askConsent() {
    S.phase = 'consent';
    return new Promise((resolve) => {
      consentCard = openConsent({ app, root, onDecide: (choice) => {
        consentCard = null;
        layout();
        if (choice === 'no') S.offlineSaid = false;
        resolve(choice);
      } });
      layout();
    });
  }
  async function invite() {
    if (S.left) return;
    S.phase = 'invite';
    dockShow({ tell: true });
    preloadInput();
    let first = true;
    try { first = !store.get(STORE_KEYS.seen, false); store.set(STORE_KEYS.seen, true); } catch { /* first visit, then */ }
    if (first) await say(ARRIVAL.first[0]);
    else await say(ARRIVAL.again[0]);
    if (S.left || S.phase !== 'invite') return;
    if (!serverMode() && !S.offlineSaid) { S.offlineSaid = true; say(ARRIVAL.offline, { who: null, colour: null }); }
    const v = await choose(first ? ARRIVAL.first[1] : ARRIVAL.ask, [
      { label: ARRIVAL.tell, value: 'tell', primary: true, onPick: () => openTell() },
      { label: ARRIVAL.squeeze, value: 'squeeze' },
    ], { transient: true });
    if (S.left) return;
    if (v === 'squeeze') { S.phase = 'invite'; say(ARRIVAL.justSqueeze[0]); }
  }

  let inputP = null;
  const preloadInput = () => (inputP ||= import('../hushfold/input-overlay.js').then((m) => { inputMod = m; m.loadInputModules?.().catch(() => {}); return m; }));
  /** Opens inside the tap (the iPhone keyboard needs a real gesture), so the module is preloaded. */
  function openTell() {
    if (overlay || S.left || S.crisis) return;
    if (!inputMod) { preloadInput().then(() => { if (!S.left && !overlay) openTellNow(); }); return; }
    openTellNow();
  }
  function openTellNow() {
    subs?.clear({ keepHeld: true });
    subs?.suspend();
    S.phase = 'typing';
    zt?.setStage('listening');
    root.classList.add('hf-typing');
    overlay = inputMod.openInput({
      app, root, prompt: ARRIVAL.prompt,
      mallow: { id: 'zuzu', name: ZUZU.name, glow: ZUZU.colours.glow },
      emotion: S.emotion, intention: S.intention, hasPlan: true, text: S.text,
      face: (f) => zt?.setEmotion(f, 0.6, { quiet: true }),
      onLayout: () => layout(),
      onSubmit: (r) => { afterTell(r); },
      onClose: (reason) => {
        overlay = null;
        const t = layer.overlay; layer.overlay = 0; if (t) app.popLayer?.(t);
        root.classList.remove('hf-typing');
        if (S.left) return;
        subs?.unsuspend();
        if (reason !== 'submit') { S.phase = 'invite'; zt?.setStage('curious'); dockShow({ tell: true }); }
        layout();
      },
    });
    // Another Angle never uses photos; and with sharing on, the overlay must not promise the words stay on the phone
    const photo = overlay.el.querySelector('.hf-ghost.photo');
    if (photo) photo.hidden = true;
    if (serverMode()) {
      const note = overlay.el.querySelector('.note');
      const fix = () => { for (const s of note?.querySelectorAll('span') || []) if (/stay on this (?:phone|device)/i.test(s.textContent)) s.textContent = 'Only these words go to our secure server, for a new perspective. Never photos.'; };
      if (note && typeof MutationObserver === 'function') { new MutationObserver(fix).observe(note, { childList: true, subtree: true }); fix(); }
    }
    layer.overlay = app.pushLayer?.() || 0;
    dockShow({});
    layout();
  }

  async function afterTell({ text, emotion, intention }) {
    S.text = String(text || '').trim();
    S.emotion = emotion || null;
    S.intention = intention || null;
    S.shown = []; S.used = []; S.kept = false; S.explored = 0;
    // the app's own safety check first, always (never dependent on the server)
    const safety = checkText(S.text);
    if (safety.level === 'crisis') { crisisMode(); return; }
    if (safety.level === 'care') { careMode(); return; }
    if (safety.level === 'concern') S.keepSupport = true;
    if (!S.text || !hasWords(S.text)) { unclear(); return; }
    startAngle({ another: false });
  }

  function crisisMode() {
    S.crisis = true; S.phase = 'support';
    dropThought(); endMechanic(true); dismissCompanion();
    // openInput already opened the urgent sheet when it saw the words; never twice
    if (!document.querySelector('.sheet.open')) openSupport(app, { urgent: true });
    zt?.setStage('comforting');
    dockShow({ finish: true });
    say(SAFETY.crisis, { hold: true });
  }
  async function careMode() {
    S.care = true; S.phase = 'support';
    dropThought(); endMechanic(true); dismissCompanion();
    zt?.setStage('comforting');
    dockShow({ finish: true });
    await say(SAFETY.care);
    if (S.left) return;
    const v = await choose(SAFETY.careAsk, SAFETY.careOptions);
    if (v === 'support') openSupport(app);
  }
  async function unclear() {
    S.phase = 'invite';
    dockShow({ tell: true });
    const v = await choose(UNCLEAR.line, UNCLEAR.options.map((o) => (o.value === 'tell' ? { ...o, onPick: () => openTell() } : o)));
    if (v === 'squeeze') say(ARRIVAL.justSqueeze[0]);
  }

  /** The words → a Thought Mallow → (server or authored) scene → its mechanic. */
  async function startAngle({ another = false } = {}) {
    const seq = ++S.seq;
    S.phase = 'waiting';
    dockShow({});
    if (!another || !thought) spawnThought();
    zt?.setStage('curious');
    zt?.setEmotion({ curious: 0.65, playful: 0.35 }, 0.7, { quiet: true });
    const started = now();
    waitingLines(seq);
    // the request (only with consent) and a cinematic minimum beat, together
    const exclude = S.shown.map((s) => s.reasoning_pattern);
    const req = serverMode()
      ? client.angle({ text: S.text, emotion: S.emotion, intention: S.intention, previous: S.shown }).catch(() => ({ status: 'error', reason: 'exception' }))
      : Promise.resolve(null);
    const res = await req;
    if (S.left || seq !== S.seq) return;
    let scene = null, offline = !serverMode(), hint = null;
    if (res) {
      if (res.keepSupportClose) { S.keepSupport = true; supportPill.hidden = false; }
      if (res.status === 'crisis') { crisisMode(); return; }
      if (res.status === 'care') { careMode(); return; }
      if (res.status === 'unclear') { subs?.clear(); dropThought(); unclear(); return; }
      if (res.status === 'ok' && res.scene && !exclude.includes(res.scene.reasoning_pattern)) scene = res.scene;
      else { offline = true; hint = res.hint?.reasoning_pattern || null; }
    }
    if (!scene) {
      // never "safe" by default: a fallback, a non-200, a timeout or an error runs the app's own check again
      const again = checkText(S.text);
      if (again.level === 'crisis') { crisisMode(); return; }
      if (again.level === 'care') { careMode(); return; }
      const avoid = [...exclude, ...(another ? [] : lessWanted(store).filter((p) => p !== hint))];
      scene = authoredScene(S.text, { emotion: S.emotion, exclude: avoid.length < 9 ? avoid : exclude, usedAngles: S.used, hint });
      if (exclude.includes(scene.reasoning_pattern)) { await noMoreAngles(); return; }
    }
    prefetchMechanic(scene.mechanic);
    const minBeat = rmOn() ? 1400 : (another ? 2200 : 3200);
    const left = minBeat - (now() - started);
    if (left > 0) await sleep(left);
    if (S.left || seq !== S.seq) return;
    if (offline && serverMode() && !S.offlineSaid) { S.offlineSaid = true; scene.offlineNote = true; }
    await playScene(scene, seq);
  }
  async function waitingLines(seq) {
    let i = 0;
    const t0 = now();
    while (!S.left && seq === S.seq && S.phase === 'waiting') {
      const long = now() - t0 > 9000 && i % 2 === 1;
      if (long) await say(pick(WAITING_LONG, i >> 1), { who: null, colour: null });
      else await say(pick(WAITING, i), { mallow: 'zuzu' });
      i++;
      if (S.phase !== 'waiting' || seq !== S.seq) break;
      await sleep(rmOn() ? 300 : 700);
    }
  }

  async function playScene(scene, seq) {
    S.scene = scene;
    S.shown.push(scene);
    if (scene.angle_id) S.used.push(scene.angle_id);
    if (scene.alt_id) S.used.push(scene.alt_id);
    S.phase = 'playing';
    subs?.clear();
    let mod;
    try { mod = await loadMechanic(scene.mechanic); } catch (e) { console.warn('[another angle] mechanic', e?.message); mod = await loadMechanic('pull_apart'); scene.mechanic = 'pull_apart'; }
    if (S.left || seq !== S.seq) return;
    const L = MECHANIC_LINES[scene.mechanic];
    const from = thought ? { x: thought.x, y: thought.y, r: thought.r } : null;
    dropThought();
    const parts = sceneParts(S.text, scene);
    const ctx = {
      g, area: () => area, from, scene, parts, text: S.text, emotion: S.emotion, tags: makeTags(root),
      reducedMotion: rmOn, lowStim: lowOn,
      hint: (line) => { if (line && !subs?.holding) say(line, { mallow: 'zuzu', interrupt: true }); },
      choose: (prompt, options) => choose(prompt, options, { mallow: scene.mallow_character }),
      haptic: (k) => app.haptic(k),
      fx: (name, o) => { try { app.audio.fx?.(name, o); } catch { /* sound is decoration */ } },
      progress: (k) => { if (k >= 1) announce(L.done); },
      kick: () => {},
    };
    endMechanic(true);
    mech = mod.mount(ctx);
    mechId = scene.mechanic;
    mech.tags = ctx.tags;
    zt?.lookAt(0, -0.8);
    dockShow({ assist: L.assist });
    say(L.hint, { mallow: 'zuzu' });
    if (scene.offlineNote) say('Zuzu’s own angle this time, worked out on this phone.', { who: null, colour: null });
    const result = await mech.done;
    if (S.left || seq !== S.seq) return;
    void result;
    await reveal(scene, seq);
  }
  /** Ends the mechanic; unless `now_`, the stage fades out first (no abrupt cut). */
  function endMechanic(now_ = false) {
    if (!mech) return Promise.resolve();
    const m = mech;
    const kill = () => { if (mech === m) { mech = null; mechId = null; } try { m.destroy(); } catch { /* ignore */ } };
    if (now_ || !canvas) { kill(); return Promise.resolve(); }
    for (const el of root.querySelectorAll('.bx-tag')) el.style.opacity = '0';
    canvas.style.transition = `opacity ${rmOn() ? 160 : 420}ms ease`;
    canvas.style.opacity = '0';
    return sleep(rmOn() ? 170 : 440).then(() => { kill(); if (canvas) canvas.style.opacity = '1'; });
  }

  async function reveal(scene, seq) {
    S.phase = 'reveal';
    dockShow({});
    const L = MECHANIC_LINES[scene.mechanic];
    subs.clear();
    await say(L.done, { mallow: 'zuzu' });
    if (S.left || seq !== S.seq) return;
    const lead = scene.mallow_character || 'zuzu';
    if (lead !== 'zuzu') { await bringCompanion(lead); await sleep(rmOn() ? 200 : 700); }
    if (S.left || seq !== S.seq) return;
    zt?.setStage('transforming');
    ct?.setStage('curious');
    await subs.say({ text: 'A new perspective', kind: 'title' }, {});
    await say(scene.subtitle_line_1, { mallow: lead });
    if (S.left || seq !== S.seq) return;
    await sleep(rmOn() ? 400 : 1000);          // a natural pause between the two lines
    await say(scene.subtitle_line_2, { mallow: lead, hold: true });
    if (S.left || seq !== S.seq) return;
    zt?.setStage('neutral'); ct?.setStage('neutral');
    await explore(scene, seq);
  }

  function exploreLine(scene, id) {
    const p = EXPLORE.find((x) => x.id === id);
    if (!p) return null;
    if (p.field === 'friend') return FRIEND_LINES[scene.reasoning_pattern] || FRIEND_LINES.fact_vs_assumption;
    const v = scene[p.field];
    if (p.field === 'known_fact') return [v || EXPLORE_EMPTY.known_fact, scene.possible_assumption].filter(Boolean);
    return v || EXPLORE_EMPTY[p.field];
  }
  async function explore(scene, seq) {
    S.phase = 'explore';
    const lead = scene.mallow_character || 'zuzu';
    let remaining = EXPLORE.slice();
    let first = true;
    while (remaining.length && !S.left && seq === S.seq) {
      const opts = remaining.slice(0, 2).map((p) => ({ label: p.label, value: p.id }));
      opts.push({ label: 'That’s enough', value: 'enough' });
      const v = await choose(first ? EXPLORE_ASK : EXPLORE_MORE, opts, { mallow: 'zuzu' });
      first = false;
      if (S.left || seq !== S.seq) return;
      if (v == null || v === 'enough') break;
      remaining = remaining.filter((p) => p.id !== v);
      S.explored++;
      await say(exploreLine(scene, v), { mallow: lead });
    }
    if (S.left || seq !== S.seq) return;
    await feedback(scene, seq);
  }

  function sendFeedback(rating) {
    const scene = S.scene;
    if (!scene) return;
    if (prefs.get('saveHistory') !== false) noteFeedback(store, scene.reasoning_pattern, rating);
    if (serverMode() && scene.source === 'server') client.feedback(rating, scene).catch(() => false);
  }
  async function feedback(scene, seq) {
    S.phase = 'feedback';
    const v = await choose(FEEDBACK.ask, FEEDBACK.options, { mallow: 'zuzu' });
    if (S.left || seq !== S.seq) return;
    if (v === 'helped') {
      sendFeedback(RATINGS.helped);
      zt?.react('nod');
      await say(FEEDBACK.helped, { mallow: 'zuzu' });
      if (S.left || seq !== S.seq) return;
      await keep();
      return endChoice(seq);
    }
    if (v === 'another') { sendFeedback(RATINGS.another); return anotherAngle(); }
    if (v === 'notRelevant') {
      sendFeedback(RATINGS.notRelevant);
      await say(FEEDBACK.notRelevant, { mallow: 'zuzu' });
      if (S.left || seq !== S.seq) return;
      const w = await choose(FEEDBACK.notRelevantAsk, FEEDBACK.notRelevantOptions, { mallow: 'zuzu' });
      if (w === 'another') return anotherAngle();
      return finish();
    }
    if (v === 'squeeze') { sendFeedback(RATINGS.squeeze); return squeezeMode(); }
    // dismissed (cleared): leave the person in peace, with the way out in reach
    dockShow({ finish: true, tell: true });
  }
  async function anotherAngle() {
    if (S.shown.length >= 4) return noMoreAngles();
    await say(pick(FEEDBACK.another, S.shown.length), { mallow: 'zuzu' });
    if (S.left) return;
    dismissCompanion();
    await endMechanic();
    if (S.left) return;
    spawnThought();
    startAngle({ another: true });
  }
  async function noMoreAngles() {
    dropThought();
    await say(FEEDBACK.noMore, { mallow: 'zuzu' });
    return endChoice(S.seq);
  }
  function squeezeMode() {
    S.phase = 'squeeze';
    subs?.clear();
    endMechanic(); dismissCompanion(); dropThought();
    later(() => layout(), 480);
    zt?.setStage('playful');
    dockShow({ tell: true, finish: true });
    say(FEEDBACK.squeeze, { mallow: 'zuzu' });
  }

  async function keep() {
    try {
      const install = await import('../hushfold/garden-install.js');
      if (S.left) return;
      const origin = () => zAd?.bodyRect?.();
      const face = () => { try { return install.mallowFaceRect?.(zAd?.bodyRect?.(), ZUZU) || null; } catch { return null; } };
      const r = await install.keepDiscovery({
        app, store, skillId: 'another-angle', worldId: 'another-angle', mallow: 'zuzu', origin, face,
        avoid: () => [rectOf(compAd), ...(mech?.avoid?.() || [])].filter(Boolean),
        subtitles: subs, reducedMotion: rmOn(), lowStim: lowOn(),
      });
      if (r?.kept || r?.already) S.kept = true;
    } catch (e) { console.info('[another angle] garden unavailable', e?.message); }
  }
  async function endChoice(seq) {
    if (S.left || seq !== S.seq) return;
    S.phase = 'end';
    dockShow({});
    const opts = END.options.filter((o) => o.value !== 'keep' || !S.kept);
    const v = await choose(END.ask, opts, { mallow: 'zuzu' });
    if (S.left || seq !== S.seq) return;
    if (v === 'keep') { await keep(); return endChoice(seq); }
    if (v === 'continue') return continueFlow();
    if (v === 'finish') return finish();
    dockShow({ finish: true, tell: true });
  }
  async function continueFlow() {
    await say(END.continue, { mallow: 'zuzu' });
    if (S.left) return;
    let worldId = null;
    try {
      const [{ registry }, { flowEmotion }, em] = await Promise.all([import('../hushfold/flow/registry.js'), import('../hushfold/lines.js'), import('../data/emotions.js')]);
      const fe = flowEmotion(S.emotion, em.getEmotion(S.emotion)?.family) || null;
      worldId = registry.select({ emotion: fe, intention: S.intention && S.intention !== 'play' ? S.intention : 'calm' })?.id || null;
    } catch { worldId = null; }
    app.go('home', worldId ? { flow: { worldId } } : {});
  }
  async function finish() {
    if (S.phase === 'finishing') return;
    S.phase = 'finishing';
    S.seq++;
    subs?.clear();
    dockShow({});
    zt?.setStage('comforting');
    if (!rmOn()) zt?.react('hop');
    await say(END.finish[0], { mallow: 'zuzu' });
    if (S.left) return;
    await say(END.finish[1], { mallow: 'zuzu' });
    if (S.left) return;
    app.go('home');
  }

  // ------------------------------------------------------- the view --
  const view = {
    async enter() {
      document.body.classList.add('hf-active');
      setLowStim(lowOn());
      world.dim(false);
      world.showMallow(false);
      world.setRealm('spiral-observatory', { crossfadeMs: 900 });
      canvas = h('canvas', { class: 'hf-stage', 'aria-hidden': 'true' });
      world.fx.replaceChildren(canvas);
      world.fx.classList.add('live');
      g = canvas.getContext('2d');
      const [subMod, routerMod, stageMod, rig] = await Promise.all([
        import('../hushfold/subtitles.js'), import('../hushfold/input-router.js'), import('../hushfold/stage.js'), import('../mallows/rig.js')]);
      if (S.left) return;
      subs = subMod.createSubtitles({
        root, prefs, reducedMotion: rmOn,
        bounds: () => ({ top: topBottom() + 8, bottom: Math.min(dockTop(), (rectOf(zAd)?.top ?? innerHeight) + 4) - 10 }),
        avoid: subsAvoid,
        backdrop: () => [...document.querySelectorAll('#world canvas'), canvas].filter(Boolean),
      });
      // Zuzu: the living, squeezable MallowTouch Mallow (the approved rig if WebGL/MallowTouch is unavailable)
      touchBox = h('div', { class: 'hf-touch' });
      world.fx.before(touchBox);
      try {
        zt = await makeTouch('zuzu', touchBox);
        if (S.left) { zt.destroy(); return; }
        zAd = stageMod.createStageMallow(world, { touch: zt });
      } catch (e) {
        console.info('[another angle] MallowTouch unavailable; using the rig', e?.message);
        zt = null; touchBox.remove(); touchBox = null;
        world.showMallow(true);
        zAd = stageMod.createStageMallow(world, {});
        const r = await world.setMallow('zuzu', { entrance: true, interactive: true });
        zAd.attach(r);
        zAd.fit = ({ cx, cy, size }) => { const lw = size / 0.64; world.setLayerSize({ w: lw, h: lw * 1.1 }); world.place({ x: (cx / innerWidth) * 100, y: ((cy - 0.098 * lw) / innerHeight) * 100, scale: 1 }); };
      }
      zAd.on('touch', onZuzuTouch);
      router = routerMod.createInputRouter({
        el: world.fx, mallow: zAd,
        thoughts: { hitTest: (x, y) => (compAd?.hitTest?.(x, y) ? compAd : null), pointer: (target, r) => target.pointer(r) },
        onEmpty: (r) => stagePointer(r),
      });
      router.setWorld((r) => stagePointer(r));
      rigTicker = (dt, t) => tick(dt, t);
      removeTicker = rig.removeTicker;
      rig.addTicker(rigTicker);
      addEventListener('resize', onResize);
      visualViewport?.addEventListener('resize', onResize);
      offPrefs = prefs.onChange((k, v) => {
        if (k === 'lowStim') { setLowStim(!!v); zt?.setLowStim(!!v); ct?.setLowStim(!!v); }
        if (k === 'motion') { zt?.setReducedMotion(rmOn()); ct?.setReducedMotion(rmOn()); }
        if (k === 'sound') { zt?.setAudio(v ? app.audio : null); ct?.setAudio(v ? app.audio : null); }
      });
      resize();
      if (DEV()) window.__angle = devApi();
      arrive();
    },
    leave() {
      S.left = true;
      S.seq++;
      for (const t of timers) clearTimeout(t);
      timers.clear();
      clearTimeout(resizeT);
      removeEventListener('resize', onResize);
      visualViewport?.removeEventListener('resize', onResize);
      offPrefs?.();
      overlay?.close('leave');
      consentCard?.close();
      endMechanic(true);
      dropThought();
      if (rigTicker) removeTicker?.(rigTicker);
      subs?.destroy();
      router?.destroy();
      tags.clear();
      dismissCompanion(true);
      zAd?.destroy?.();
      if (zt) { try { zt.destroy(); } catch { /* ignore */ } zt = null; }
      touchBox?.remove(); touchBox = null;
      world.setLayerSize(null);
      world.showMallow(true);
      world.fx.replaceChildren();
      world.fx.classList.remove('live');
      document.body.classList.remove('hf-active');
      if (window.__angle && DEV()) delete window.__angle;
    },
    /** Back closes the compact input first (its own history entry). */
    get blockBack() {
      if (!overlay) return null;
      return () => { layer.overlay = 0; overlay?.close('back'); };
    },
    safeForUpdate() {
      if (overlay?.dirty || consentCard) return false;
      if (subs?.holding) return false;
      if (S.crisis || S.care || !supportPill.hidden) return false;
      return !['waiting', 'playing', 'reveal', 'explore', 'feedback', 'typing'].includes(S.phase);
    },
  };
  let offPrefs = null;

  // QA hooks (localhost only): Playwright drives the real flow through these
  function devApi() {
    return {
      S, get subs() { return subs; }, get mech() { return mech; }, get mechId() { return mechId; }, get area() { return area; },
      get zuzu() { return zAd; }, get companion() { return compAd; }, get overlay() { return overlay; }, get consent() { return consentCard; },
      openTell, layout, serverMode, endpoint,
      /** Play a scene directly (lab): an authored scene for `text`, optionally forcing the mechanic. */
      async play(text, { mechanic = null, emotion = null } = {}) {
        S.text = text; S.emotion = emotion; S.shown = []; S.used = [];
        const sc = authoredScene(text, { emotion });
        if (mechanic && MECHANICS.includes(mechanic)) { sc.mechanic = mechanic; sc.interaction_type = mechanic; }
        spawnThought();
        const seq = ++S.seq;
        await playScene(sc, seq);
      },
      assist() { mech?.assist?.(); },
    };
  }

  return view;
}
