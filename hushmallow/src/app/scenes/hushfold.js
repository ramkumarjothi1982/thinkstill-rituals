// HOME — the Hushfold. A full-screen living stage: one hero Mallow you can
// squeeze within the first second, cinematic subtitles that speak one short
// line at a time, a compact "tell me" overlay that appears only when you
// choose to answer, and a non-modal side panel. Hushflow worlds run inside
// this scene (W4's director); until that lands a stub keeps the Mallow
// playable and says so.
//
// Scene contract: hushfold(app, params) → { el, title:'', enter(), leave(),
//   get blockBack(), safeForUpdate(), spawnThought(text, emotion) }
// params.flow = { worldId } starts a world (the garden's "Practise again").
//
// Layers: #world realm backdrop · #mallow-layer the rig · #fx-layer the stage
// canvas + the one input router · #scene this root (pointer-events:none; only
// .hf-ui takes touches) · #sheet-root support/confirm sheets only.

import { h } from '../ui.js';
import { MALLOWS, MALLOW_IDS } from '../../mallows/registry.js';
import { openSupport } from './support.js';
import { createSubtitles } from '../../hushfold/subtitles.js';
import { createLines, SHARED_LINES, flowEmotion } from '../../hushfold/lines.js';
import { requireEntitlement } from '../entitlements.js';
import { createStage, createStageMallow } from '../../hushfold/stage.js';
import { createInputRouter } from '../../hushfold/input-router.js';
import { hfIcon } from '../../hushfold/icons.js';
import { loadProgress } from '../../engine/flow-store.js';

// the realms whose daylight needs a deeper subtitle scrim (a fallback for the per-line sample)
const BRIGHT_REALMS = new Set(['sunpop-orchard', 'blue-drift', 'moonmilk-cove']);
// the Hushfold opened once already in this page session (Back from Settings is not a "return visit")
let visitedThisSession = false;
// the overlay module, once preloaded: opened synchronously inside the tap (the iPhone keyboard needs a real gesture)
let inputMod = null;
const preloadInput = () => {
  if (inputMod) return Promise.resolve(inputMod);
  return import('../../hushfold/input-overlay.js').then((m) => { inputMod = m; m.loadInputModules?.().catch(() => {}); return m; });
};
const idle = (fn) => (typeof requestIdleCallback === 'function' ? requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 300));

function mallowForNow() {
  const hr = new Date().getHours();
  if (hr >= 21 || hr < 6) return 'noomi';
  if (hr < 11) return 'boppo';
  if (hr < 17) return 'pipzi';
  return 'loomi';
}
const REACTION_KINDS = new Set(['squeeze', 'tap', 'doubleTap', 'flick', 'stretch', 'massage', 'stroke', 'jiggle', 'pull']);

export default function hushfold(app, params = {}) {
  const { world, prefs, ent, store } = app;
  // explicit picks (Meet the Mallows, the panel switcher) win, then the last one chosen, then the time of day
  if (app.state.homeMallow && MALLOWS[app.state.homeMallow]) prefs.set('mallow', app.state.homeMallow);
  let mallowId = (MALLOWS[app.state.homeMallow] && app.state.homeMallow) || (MALLOWS[prefs.get('mallow')] && prefs.get('mallow')) || mallowForNow();
  const lines = createLines({ store });
  const S = {
    emotion: null, emotionName: null, intention: null, reactions: 0, touches: 0, firstTouchAt: 0, lastLineAt: 0,
    invited: false, told: false, crisis: false, care: false, photos: false, left: false,
  };
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); if (!S.left) fn(); }, ms); timers.add(t); return t; };
  const M = () => MALLOWS[mallowId];
  const now = () => performance.now();

  // ------------------------------------------------------------ DOM --
  const root = h('div', { class: 'hushfold', 'data-hf': 'root' });
  const logoBox = h('div', { class: 'hf-logo', role: 'img', 'aria-label': 'hushmallow' }, h('span', { class: 'brand-name', 'aria-hidden': 'true' }, 'hushmallow'));
  import('../../ui/type.js').then((m) => { if (m.logoImg) logoBox.replaceChildren(m.logoImg({ tone: 'light', width: 132, alt: '' })); }).catch(() => {});
  const panelBtn = h('button', { class: 'hf-btn', type: 'button', 'aria-label': 'Feelings and worlds', 'aria-expanded': 'false', 'data-hf': 'panel-handle', onclick: () => togglePanel() }, hfIcon('panel'));
  const gearBtn = h('button', { class: 'hf-btn', type: 'button', 'aria-label': 'Settings', onclick: () => app.go('settings') }, hfIcon('gear'));
  const topEl = h('header', { class: 'hf-top' }, logoBox, h('div', { class: 'grow' }), panelBtn, gearBtn);
  const tellLabel = h('span', { class: 'label' });
  const tellBtn = h('button', { class: 'hf-pill is-hidden', type: 'button', 'data-hf': 'tell', onclick: () => openTell('pill') }, h('span', { class: 'dot', 'aria-hidden': 'true' }), hfIcon('talk'), tellLabel);
  const supportPill = h('button', { class: 'hf-pill support', type: 'button', hidden: true, onclick: () => openSupport(app) }, hfIcon('support'), 'Support');
  // a paused world says so on the stage, with one tap back into it
  const pausedPill = h('button', { class: 'hf-pill paused', type: 'button', hidden: true, 'aria-label': 'Paused. Resume the world.', onclick: () => resumeFlow() },
    hfIcon('play'), h('span', {}, 'Paused · Resume'));
  const dock = h('div', { class: 'hf-dock' }, pausedPill, supportPill, tellBtn);
  const srTitle = h('h1', { class: 'sr-only' }, 'hushmallow');
  root.append(srTitle, topEl, dock);

  // --------------------------------------------------- subtitles --
  const subtitles = createSubtitles({
    root, prefs,
    reducedMotion: () => prefs.reducedMotion(),
    bounds: () => ({ top: (topEl.getBoundingClientRect().bottom || 60) + 12, bottom: Math.min(dockTop(), panelTop()) - 12 }),
    avoid: () => [mallowAvoidRect(), ...(stage?.thoughts.rects() || []), worldThoughtRect(), ...(flowRef?.avoid?.() || []), overlay?.rect?.()].filter(Boolean),
    // what is behind the band (the realm, a world's back and front layers): sampled once per line for the scrim
    backdrop: () => [...document.querySelectorAll('#world canvas, #fx-layer canvas.hf-front')],
    brightHint: () => !worldMode && BRIGHT_REALMS.has(world.realmId),
    // the person's ▶ on the subtitle pill resumes a paused world too
    onControl: (kind) => { if (kind === 'resume' && flowRef?.state?.paused) resumeFlow(); },
    // a block that fits nowhere (two rows of chips on a small phone): make room above the Mallow
    onBand: (need) => { if (need !== bandNeed) { bandNeed = need; layout(); } },
  });
  let bandNeed = 0;
  const say = (text, opts = {}) => {
    if (!text) return Promise.resolve(false);
    S.lastLineAt = now();
    return subtitles.say(text, { who: M().name, colour: M().colours.glow, ...opts });
  };

  // ------------------------------------------------------- stage --
  let stage = null, stageMallow = null, router = null, overlay = null, panel = null, readEl = null;
  let touchMt = null, touchBox = null;   // the opt-in MallowTouch stage (W2), else the rig
  // each transient layer has its own history entry, so Back closes it first
  const layer = { overlay: 0, panel: 0, read: 0 };
  const pushLayer = (k) => { layer[k] = app.pushLayer?.() || 0; };
  const popLayer = (k) => { const t = layer[k]; layer[k] = 0; if (t) app.popLayer?.(t); };
  let flowP = null, flowRef = null, offPrefs = null;
  let thoughtHome = { x: innerWidth * 0.8, y: innerHeight * 0.6 };

  function dockTop() {
    const r = tellBtn.classList.contains('is-hidden') && supportPill.hidden && pausedPill.hidden ? null : dock.getBoundingClientRect();
    return r && r.height ? r.top : innerHeight - 24;
  }
  /** Phones: the side panel is a bottom sheet; the stage above it stays playable. */
  const panelSheet = () => !!panel?.isOpen && innerWidth < 700;
  // where the sheet comes to rest (offsetHeight ignores its slide-in transform)
  function panelTop() { return panelSheet() ? innerHeight - (panel.el.offsetHeight || 0) : innerHeight; }
  function mallowAvoidRect() {
    const b = stageMallow?.bodyRect?.() || world.bodyRect();
    if (!b || !b.height) return null;
    // room for a hop and the particles above the head
    return { left: b.left, right: b.left + b.width, top: b.top - Math.max(18, b.height * 0.14), bottom: b.top + b.height + 6 };
  }

  /** Size and place the Mallow in the free region between the subtitle band and the dock (no CSS scale). */
  function layout() {
    if (S.left) return;
    const vw = innerWidth, vh = innerHeight;
    const topB = topEl.getBoundingClientRect().bottom || 60;
    const band = Math.max(Math.min(156, Math.max(118, vh * 0.17)), bandNeed ? bandNeed + 24 : 0);
    let regionTop = topB + band;
    let regionBottom = Math.min(vh - 76, dockTop() - 14);
    let minB = 130;
    const ov = overlay?.rect?.();
    if (ov?.height) {
      // typing: the Mallow shrinks and sits below the compact overlay (the subtitles wait meanwhile)
      regionTop = ov.bottom + 12;
      regionBottom = vh - 24;
      minB = 96;
    } else if (panelSheet()) {
      // the bottom sheet: one subtitle line and the Mallow above it, still squeezable
      regionTop = topB + Math.min(84, band);
      regionBottom = panelTop() - 12;
      minB = 96;
    }
    const regionH = Math.max(minB + 8, regionBottom - regionTop);
    // a short strip above the sheet: the thought's word tag would sit on the Mallow, so it waits
    root.classList.toggle('hf-tags-away', panelSheet() && regionBottom - regionTop < 220);
    const thought = !worldMode && (stage?.thoughts.list.length || 0) > 0;
    let B = Math.min(vw * 0.66, regionH * (ov?.height || panelSheet() ? 0.86 : 0.7), 360);
    if (thought && vw < 700) B *= 0.84;
    // in a world the Mallow stands on the floor in the foreground, smaller, leaving the sky to play in
    if (worldMode && !ov?.height && !panelSheet()) B = Math.min(vw * 0.58, vh * 0.27, 300);
    B = Math.max(minB, Math.min(B, regionH));
    const lw = B / 0.64, lh = lw * 1.1;
    const cx = thought ? (vw < 700 ? vw * 0.4 : vw / 2 - B * 0.35) : vw / 2;
    const bodyCy = worldMode && !ov?.height && !panelSheet() ? Math.min(vh * 0.885, regionBottom) - B / 2 : regionTop + regionH * 0.5;
    if (stageMallow?.kind === 'touch') stageMallow.fit?.({ cx, cy: bodyCy, size: B });
    else {
      world.setLayerSize({ w: lw, h: lh });
      const layerCy = bodyCy - 0.098 * lw;
      world.place({ x: (cx / vw) * 100, y: (layerCy / vh) * 100, scale: 1 });
    }
    thoughtHome = vw < 700 ? { x: vw * 0.82, y: bodyCy + B * 0.22 } : { x: vw / 2 + B * 0.55, y: bodyCy + B * 0.1 };
    if (thought && vw < 700) {
      // the word tag hangs under the thought: keep it clear of the Mallow's base and of the dock
      const r = stage.thoughts.list[0].r;
      const tagH = Math.max(44, ...stage.thoughts.list.map((t) => t.tag.offsetHeight || 0));
      const below = bodyCy + B / 2 + 6 - (r * 1.05 + 8);              // tag top under the body
      const above = Math.min(dockTop(), panelTop()) - 10 - tagH - (r * 1.05 + 8);   // tag bottom over the dock (or the sheet)
      thoughtHome.y = Math.min(Math.max(thoughtHome.y, below), above);
    }
    stage?.thoughts.list.forEach((th, i) => th.moveHome({ x: thoughtHome.x - i * 18, y: thoughtHome.y - i * (th.r * 2.4) }));
    // the layer glides there (720ms spring); re-place the subtitles when it lands
    later(() => subtitles.layout(), 760);
    subtitles.layout();
  }
  let resizeT = 0;
  const onResize = () => { clearTimeout(resizeT); resizeT = setTimeout(layout, 120); };

  function theme() {
    const m = M();
    root.style.setProperty('--hf-glow', m.colours.glow);
    root.style.setProperty('--hf-tint', m.colours.body);
    tellLabel.textContent = `Tell ${m.name}`;
    tellBtn.setAttribute('aria-label', `Tell ${m.name} what’s on your mind`);
    srTitle.textContent = `hushmallow, with ${m.name}. Squeeze ${m.name}, or tell ${m.name} what’s on your mind.`;
  }

  // --------------------------------------------------------- flow --
  // The person's words for the worlds: one live object, so a director made
  // before they typed still reads what they type later (exact text only).
  let wordsCur = null;
  const words = {
    get full() { return wordsCur?.full || ''; }, get own() { return !!wordsCur?.own; }, get token() { return wordsCur?.token || ''; },
    get feelings() { return wordsCur?.feelings || []; }, setToken(t) { wordsCur?.setToken(t); }, onChange(fn) { return wordsCur?.onChange?.(fn) || (() => {}); },
  };
  // the director speaks with Mallow ids; the subtitles show names in each Mallow's own colour
  const whoOf = (o = {}) => {
    const m = MALLOWS[o.who] || (o.who ? null : M());
    return m ? { ...o, who: m.name, colour: o.colour || m.colours.glow } : o;
  };
  const flowSubtitles = {
    say: (lines, o) => { S.lastLineAt = now(); return subtitles.say(lines, whoOf(o)); },
    choice: (prompt, options, o) => subtitles.choice(prompt, options, whoOf(o)),
    // a paused world drops its passing lines (a held discovery stays); the shell says "Paused" itself
    clear: () => subtitles.clear(), pause: () => subtitles.clear({ keepHeld: true }), resume: () => subtitles.resume(),
    get busy() { return subtitles.busy; }, get holding() { return subtitles.holding; },
  };
  const safeRect = () => {
    const top = (topEl.getBoundingClientRect().bottom || 60) + 8;
    const b = stageMallow?.bodyRect?.();
    const bottom = b?.height ? Math.max(top + 160, b.top - 14) : innerHeight * 0.62;
    return { x: 20, y: top, w: innerWidth - 40, h: bottom - top };
  };

  function createStubFlow() {
    const tell = (k) => say(lines.pick(mallowId, k) || SHARED_LINES[k]?.[0]);
    return {
      stub: true,
      start() { tell('stub'); return Promise.resolve(null); },
      next() { tell('stub'); }, stay() { tell('stub'); }, pause() { tell('stub'); }, resume() {}, finish() { tell('stub'); },
      setEmotion() {}, setIntention() {}, setAutoFlow() {}, setThought() {},
      on() { return () => {}; },
      get state() { return { phase: 'idle', paused: false, worldId: null, stub: true }; },
      safeForUpdate() { return true; },
      destroy() {},
    };
  }
  // Is the Hushflow director in this build? (imports the module only; never creates a director)
  let availP = null;
  const flowAvailable = () => (availP ||= import('../../hushfold/flow/director.js').then((m) => typeof m.createHushflow === 'function', () => false));
  /** The Hushflow director (W4), created only when a world is about to start; the stub if it is missing or throws. */
  function getFlow() {
    flowP ||= (async () => {
      try {
        const [mod, photosMod, cards] = await Promise.all([
          import('../../hushfold/flow/director.js'), import('../../v3/photos.js'), import('../../v3/mallow-cards.js').catch(() => null)]);
        if (typeof mod.createHushflow !== 'function') throw new Error('director has no createHushflow');
        if (S.left) throw new Error('left');
        const fallback = cards ? await cards.mallowMaterial(mallowId).catch(() => []) : [];
        const photos = photosMod.photoApi({ dpr: Math.min(2, devicePixelRatio || 1), seed: 11, fallback });
        S.photos = true;
        const f = mod.createHushflow({
          app, worldEl: document.getElementById('world'), fxEl: world.fx, mallow: stageMallow, thought: null,
          subtitles: flowSubtitles, photos, words, prefs, store, safeRect,
        });
        if (!f || typeof f.start !== 'function') throw new Error('director returned no flow');
        f.setAutoFlow?.(!!prefs.get('autoFlow'));
        f.on?.('world', (d) => onWorld(d));
        f.on?.('offer', (d) => onOffer(d));
        f.on?.('finish', () => onFinished());
        f.on?.('error', (d) => onFlowError(d));
        for (const ev of ['stay', 'complete', 'autoflow']) f.on?.(ev, () => { panel?.update(); if (ev === 'complete') app.applyUpdateIfSafe?.(); });
        f.on?.('pause', () => onPaused(true));
        f.on?.('resume', () => onPaused(false));
        return f;
      } catch (e) {
        if (!S.left) console.info('[hushfold] Hushflow director not available, using the stub:', e?.message || e);
        return createStubFlow();
      }
    })().then((f) => { flowRef = f; return f; });
    return flowP;
  }
  /** The world paused or resumed (from the panel, the pill or the director). */
  function onPaused(on) {
    if (S.left) return;
    pausedPill.hidden = !on;
    layout();
    panel?.update();
    if (on) say(lines.pick(mallowId, 'paused') || SHARED_LINES.paused[0], { interrupt: !subtitles.holding });
  }
  function resumeFlow() {
    pausedPill.hidden = true;
    try { flowRef?.resume?.(); } catch (e) { console.warn(e); }
    if (subtitles.paused) subtitles.resume();
    layout();
    panel?.update();
  }

  let worldMode = false;
  let homeMallow = null;       // the person's own Mallow while a world borrows the stage
  function onWorld(d) {
    if (S.left) return;
    worldMode = true;
    router.setWorld((r) => flowRef?.pointer?.(r));
    // the words now live inside the world: the shell's placeholder hands over, and the world melts in over the realm
    stage?.thoughts.release(900);
    requestAnimationFrame(() => document.body.classList.remove('hf-world-arriving'));
    // each world has its own Mallow (Glitzi hosts the Static Storm)
    if (d?.mallow && MALLOWS[d.mallow] && d.mallow !== mallowId) {
      homeMallow ||= mallowId;
      mallowId = d.mallow;
      theme();
      showMallow(mallowId, { entrance: !prefs.reducedMotion() });
    }
    layout();
    // a world's name, once, in story type, ahead of its first line
    if (d?.title && !d.from) subtitles.say({ text: d.title, kind: 'title' }, { first: true });
    panel?.update();
  }
  function endWorldMode() {
    worldMode = false;
    router?.setWorld(null);
    try { flowRef?.destroy?.(); } catch (e) { console.warn(e); }
    flowP = null; flowRef = null; worldThought = null;
    pausedPill.hidden = true;
    if (homeMallow) { mallowId = homeMallow; homeMallow = null; theme(); showMallow(mallowId); world.setRealm(M().realm, { crossfadeMs: 1400 }); }
    layout();
    panel?.update();
  }
  function onFinished() {
    if (S.left) return;
    // the closing line is for the stage: the panel steps aside so it is seen
    panel?.close();
    // the last frame melts away over the Hushfold's own realm
    document.body.classList.add('hf-world-leaving');
    later(() => { endWorldMode(); document.body.classList.remove('hf-world-leaving'); say(lines.pick(mallowId, 'finished') || SHARED_LINES.finished[0]); app.applyUpdateIfSafe?.(); }, 1250);
  }
  function onFlowError(d) {
    if (S.left || worldMode) return;
    if (d?.kind === 'none' || d?.kind === 'start' || d?.kind === 'load') say(SHARED_LINES.stub[0]);
  }
  /**
   * A discovery offered for the Memory Garden (W5). W5's offerSave() owns the
   * offer when it is in the build; otherwise the shell asks and saves through
   * garden.js. Offered only when the garden is in this build. Saving is always
   * an explicit tap, and the reward never needs more play.
   */
  async function onOffer({ skillId, worldId } = {}) {
    let install = null, garden = null, skills = null;
    try { install = await import('../../hushfold/garden-install.js'); } catch { /* not in this build yet */ }
    if (S.left) return;
    const ctx = { app, store, subtitles: flowSubtitles, skillId, worldId, mallow: mallowId, fx: world.fx, origin: stageMallow.bodyRect(), reducedMotion: prefs.reducedMotion() };
    if (typeof install?.offerSave === 'function') { try { await install.offerSave(ctx); } catch (e) { console.warn('[garden] offerSave', e); } return; }
    try { [garden, skills] = await Promise.all([import('../../engine/garden.js'), import('../../hushfold/skills.js').catch(() => null)]); } catch { return; }
    if (S.left || typeof garden?.saveSkill !== 'function') return;
    const title = skills?.skillTitle?.(skillId) || skills?.SKILLS?.[skillId]?.title || null;
    const v = await subtitles.choice(title ? `Keep this? ${title}` : 'Keep this discovery?',
      [{ label: 'Keep it', value: 'keep', primary: true }, { label: 'Not now', value: 'no' }], { who: M().name, colour: M().colours.glow, timeoutMs: 20000 });
    if (v !== 'keep' || S.left) return;
    try { garden.saveSkill(store, { id: skillId, fromWorld: worldId, mallow: mallowId }); } catch (e) { console.warn('[garden]', e); return; }
    try { if (typeof install?.playInstall === 'function') await install.playInstall(ctx); else app.toast('Saved to your Memory Garden'); } catch { app.toast('Saved to your Memory Garden'); }
  }

  // ------------------------------------------------- the Mallow --
  async function showMallow(id, { entrance = true } = {}) {
    if (touchMt) {
      // the opt-in MallowTouch stage (W2): same calls, the soft body instead of the rig
      if (touchMt.id !== id) touchMt.setMallow?.(id);
      await touchMt.loaded;
      if (S.left || id !== mallowId) return touchMt.rig;
      if (entrance && !prefs.reducedMotion()) touchMt.react('hop');
      theme(); layout();
      return touchMt.rig;
    }
    const rig = await world.setMallow(id, { entrance, interactive: true });
    if (S.left || id !== mallowId) return rig;
    stageMallow.attach(rig);
    theme();
    layout();
    return rig;
  }
  async function switchMallow(dir) {
    const i = (MALLOW_IDS.indexOf(mallowId) + dir + MALLOW_IDS.length) % MALLOW_IDS.length;
    mallowId = MALLOW_IDS[i];
    app.state.homeMallow = mallowId;
    prefs.set('mallow', mallowId);
    if (homeMallow) homeMallow = mallowId;   // in a world: their pick is who they come back to
    app.audio.ui('whoosh');
    subtitles.clear();
    theme();
    await showMallow(mallowId);
    world.setRealm(M().realm, { crossfadeMs: 1200 });
    stageMallow.setStage('curious');
    say(M().voice.hello[S.reactions % M().voice.hello.length], { interrupt: !subtitles.holding });
    later(() => stageMallow.setStage('neutral'), 2600);
    panel?.update();
  }

  function onMallowTouch(e) {
    if (e.kind === 'press') { S.touches++; clearNudge(); return; }
    if (!REACTION_KINDS.has(e.kind) && e.kind !== 'release') return;
    if (e.kind === 'release') return;
    S.touches++; S.reactions++;
    clearNudge();
    if (overlay) return;                                     // they are typing: no chatter
    const t = now();
    if (!S.firstTouchAt) {
      S.firstTouchAt = t;
      // the overlay is ready before anyone asks for it (so it can open inside the tap)
      idle(() => { if (!S.left) preloadInput().catch(() => {}); });
      say(lines.pick(mallowId, 'first', { kind: e.kind }), { interrupt: !subtitles.holding });
      return;
    }
    if (canInvite() && S.reactions >= 3 && t - S.firstTouchAt > 5500 && !subtitles.busy) { invite(); return; }
    if (S.reactions >= 3) scheduleInvite();
    // an occasional line, never a running commentary
    if (!subtitles.busy && t - S.lastLineAt > 9000 && S.reactions % 3 === 0) say(lines.pick(mallowId, 'squeeze', { kind: e.kind }));
  }
  let nudgeT = 0;
  function clearNudge() { clearTimeout(nudgeT); timers.delete(nudgeT); }
  const canInvite = () => !S.invited && !S.told && !S.crisis && !S.care && !overlay && !worldMode && !S.flowAsked;
  // someone who squeezed a few times and then just watches is invited too, once the stage is quiet
  let inviteT = 0;
  function scheduleInvite() {
    if (!canInvite()) return;
    clearTimeout(inviteT); timers.delete(inviteT);
    const wait = Math.max(2600, S.firstTouchAt + 5500 - now());
    inviteT = later(function tryInvite() {
      if (!canInvite()) return;
      // (a finger still on the Mallow is fine: the brief's invitation arrives mid-squeeze)
      if (subtitles.busy || panel?.isOpen) { inviteT = later(tryInvite, 1600); return; }
      invite();
    }, wait);
  }

  async function invite() {
    S.invited = true;
    clearTimeout(inviteT);
    preloadInput().catch(() => {});
    const [l1, l2] = lines.invitation(mallowId);
    await say(l1);
    if (S.left || overlay || S.told) return;
    showTell(true);
    // "Tell me" opens the overlay inside the tap itself; an invitation never outlives typing (transient)
    const v = await subtitles.choice(l2, [{ label: 'Tell me', value: 'tell', primary: true, onPick: () => openTell('chip', l2) }, { label: 'Just play', value: 'play' }],
      { who: M().name, colour: M().colours.glow, timeoutMs: 16000, transient: true });
    if (S.left) return;
    S.lastLineAt = now();
    if (v === 'tell') openTell('chip', l2);
    else if (v === 'play') { S.intention ||= 'play'; say(lines.pick(mallowId, 'justPlay')); }
    // ignored: nothing else. The Tell pill stays; they can play for as long as they like.
  }
  function showTell(on) { tellBtn.classList.toggle('is-hidden', !on); }

  // ---------------------------------------------------- telling --
  /**
   * Open the compact overlay. Synchronous when the module is preloaded, so the
   * text field takes focus inside the tap (the iPhone keyboard opens with it).
   */
  function openTell(source, prompt) {
    if (overlay || S.left) return;
    if (!inputMod) { preloadInput().then(() => { if (!S.left && !overlay) openTellNow(prompt); }).catch((e) => console.warn('[hushfold] input', e)); return; }
    openTellNow(prompt);
  }
  function openTellNow(prompt) {
    // a held discovery or a real choice waits for the overlay to close; passing lines go
    subtitles.clear({ keepHeld: true });
    subtitles.suspend();
    clearTimeout(inviteT);
    panel?.close();
    closeRead();
    showTell(false);
    stageMallow.setStage('listening', { quiet: true });
    root.classList.add('hf-typing');
    overlay = inputMod.openInput({
      app, root, prompt: prompt || 'Want to tell me?',
      mallow: { id: mallowId, name: M().name, glow: M().colours.glow },
      emotion: S.emotion, intention: S.intention, hasPlan: ent.has('paid'),
      face: (f) => stageMallow.setEmotion(f, 0.6, { quiet: true }),
      onLayout: () => layout(),
      onSubmit: (r) => afterTell(r),
      onClose: (reason) => {
        overlay = null;
        popLayer('overlay');
        root.classList.remove('hf-typing');
        if (S.left) return;
        showTell(true);
        layout();
        subtitles.unsuspend();
        if (reason !== 'submit') { stageMallow.setStage('neutral', { quiet: true }); app.applyUpdateIfSafe?.(); }
      },
    });
    pushLayer('overlay');
    S.photos = true;   // the overlay may have loaded the photo session
    layout();
  }

  async function afterTell({ text, emotion, intention, safety, input }) {
    const fam = emotion ? await setFeeling(emotion, { quiet: true }) : null;
    if (intention) S.intention = intention;
    if (safety?.level === 'crisis') {
      // no Thought Mallow, no world that transforms the words; support stays one tap away
      S.crisis = true;
      supportPill.hidden = false;
      stageMallow.setStage('comforting');
      say(SHARED_LINES.support, { interrupt: !subtitles.holding });
      layout();
      return;
    }
    if (safety?.level === 'care' || safety?.level === 'concern') { supportPill.hidden = false; layout(); }
    if (!ent.has('paid')) {
      // D4: the Thought Mallow and Hushflow are part of hushmallow Flow. The words wait in memory only.
      app.state.pendingTell = { input, emotion, intention, at: Date.now() };
      app.go('plans', { reason: 'tell' });
      return;
    }
    S.told = true;
    // a harm disclosure or wanting to hurt someone: no jokes, no Thought Mallow made of it, nothing
    // starts by itself; support first, then the person chooses whether anything plays
    if (safety?.level === 'care' || safety?.category === 'harm-others') { await careBeat({ emotion, intention, safety }); return; }
    stageMallow.react('nod');
    let spoken = Promise.resolve();
    const gentle = safety?.level === 'concern';
    if (gentle) spoken = say(SHARED_LINES.supportConcern, { interrupt: !subtitles.holding });
    else if (emotion) spoken = say(lines.pick(mallowId, 'ack', { emotion, feelingName: S.emotionName, family: fam?.family }));
    if (text && !worldMode) {
      spawnThought(text, emotion);
      stageMallow.setStage('curious', { quiet: true });
      if (!emotion && !gentle) spoken = say(lines.pick(mallowId, 'thought'));
    }
    const go = () => startFlow({ emotion: emotion || S.emotion, intention: intention || S.intention, input, safety });
    if (worldMode) { go(); return; }
    // a beat with the Thought Mallow in the Hushfold (the line read to the end) before the first world melts in
    if (text) {
      const minBeat = new Promise((r) => later(r, prefs.reducedMotion() ? 1200 : 2400));
      const maxBeat = new Promise((r) => later(r, 7000));
      await Promise.race([Promise.all([spoken, minBeat]), maxBeat]);
      if (!S.left) go();
    } else await go();
  }

  /** Care: support first; a gentle world only if the person asks for one (and never with their words in it). */
  async function careBeat({ emotion, intention, safety }) {
    S.care = true;
    stageMallow.setStage('comforting', { quiet: true });
    const first = safety?.category === 'harm-others' ? SHARED_LINES.harmOthers : SHARED_LINES.supportCare;
    await say(first, { interrupt: !subtitles.holding });
    if (S.left || overlay) return;
    const v = await subtitles.choice(SHARED_LINES.careAsk[0],
      [{ label: 'Stay here quietly', value: 'stay' }, { label: 'Play something gentle', value: 'play', primary: true }],
      { who: M().name, colour: M().colours.glow, timeoutMs: 30000 });
    if (S.left) return;
    if (v === 'play') startFlow({ emotion: emotion || S.emotion, intention: intention && intention !== 'let-go' ? intention : 'calm', input: null, safety });
    else if (v === 'stay') say(SHARED_LINES.careQuiet);
  }

  /** Start Hushflow (paid; enforced here as well as by the routes). Feeling ids map to the registry's. */
  async function startFlow({ emotion = null, intention = null, input = null, safety = null, worldId = null, resume = false } = {}) {
    try { requireEntitlement(ent, 'paid'); } catch { app.go('plans', { reason: 'tell' }); return; }
    S.flowAsked = true;
    const [{ createWords }, em] = await Promise.all([import('../../v3/words.js'), import('../../data/emotions.js')]);
    if (S.left) return;
    if (input) wordsCur = createWords(input);
    const fe = flowEmotion(emotion, em.getEmotion(emotion)?.family);
    if (worldMode && flowRef && !flowRef.stub && !worldId) {
      // already in a world: the new words join it (no restart), and a changed feeling steers it
      if (words.full) await handThought(flowRef, fe);
      if (fe) flowRef.setEmotion?.(fe);
      if (intention) flowRef.setIntention?.(intention);
      panel?.update();
      return;
    }
    const flow = await getFlow();
    if (S.left) return;
    if (!flow.stub && words.full) await handThought(flow, fe);
    if (!flow.stub) { document.body.classList.add('hf-world-arriving'); if (!subtitles.holding) subtitles.clear(); }
    try {
      await flow.start({ emotion: fe, intention, intensity: input?.intensity ?? 0.6, input: input ? { text: input.text, safety: input.safety } : null, worldId, resume });
    } catch (e) { console.warn('[hushfold] flow.start', e); }
    if (!worldMode) document.body.classList.remove('hf-world-arriving');   // nothing started: the realm stays
    panel?.update();
  }

  let worldThought = null;
  /** Where the world's Thought Mallow and its word plate are (until worlds report it through avoid()). */
  function worldThoughtRect() {
    const t = worldThought;
    if (!worldMode || !t || !(t.x || t.y)) return null;
    const r = 34 * (t.scale || 1);
    return { left: t.x - 130, right: t.x + 130, top: t.y - r - 6, bottom: t.y + r + 66 };
  }
  /** Give the world its Thought Mallow for the current words (W4's 2D stand-in until W2's ThoughtLayer lands). */
  async function handThought(flow, fe) {
    try {
      const [ph, type] = await Promise.all([import('../../hushfold/flow/placeholders.js'), import('../../ui/type.js').catch(() => null)]);
      // a fresh words object each time, so an earlier thought keeps its own words
      const own = wordsCur;
      const w = { get full() { return own?.full || ''; }, get token() { return own?.token || ''; }, get own() { return !!own?.own; }, get feelings() { return own?.feelings || []; }, setToken: (t) => own?.setToken(t), onChange: (fn) => own?.onChange?.(fn) || (() => {}) };
      worldThought = ph.createPlaceholderThought({ words: w, emotion: fe || 'other', font: type?.canvasFontPx, dpr: Math.min(2, devicePixelRatio || 1) });
      flow.setThought?.(worldThought);
    } catch (e) { console.info('[hushfold] no placeholder thought for the world', e?.message); }
  }

  /** The words become a Thought Mallow (W2's ThoughtLayer later; the placeholder today). */
  function spawnThought(text, emotion = null) {
    if (!stage || !text) return null;
    const list = stage.thoughts.list;
    if (list.length >= 3) stage.thoughts.remove(list[0]);
    const b = stageMallow.bodyRect();
    const th = stage.thoughts.add({ text, emotion, intensity: app.state.input?.intensity ?? 0.6,
      from: { x: innerWidth / 2, y: Math.max(110, (b?.top || 300) - 60) }, home: thoughtHome, r: innerWidth < 360 ? 32 : 38 });
    layout();
    const ma = stageMallow.bodyRect();
    stageMallow.lookAt((thoughtHome.x - ma.cx) / (innerWidth * 0.5), (thoughtHome.y - ma.cy) / (innerHeight * 0.5));
    return th;
  }

  function readThought(th) {
    closeRead();
    readEl = h('div', { class: 'hf-read hf-ui', role: 'dialog', 'aria-modal': 'false', 'aria-label': 'Your words' },
      h('p', {}, th.text), h('button', { class: 'hf-ghost', type: 'button', onclick: () => closeRead() }, 'Close'));
    root.append(readEl);
    readEl.querySelector('button').focus({ preventScroll: true });
    pushLayer('read');
  }
  function closeRead() { if (!readEl) return; readEl.remove(); readEl = null; popLayer('read'); }

  // ------------------------------------------------------ panel --
  async function ensurePanel() {
    if (panel) return panel;
    const { createSidePanel } = await import('../../hushfold/side-panel.js');
    if (S.left) return null;
    panel ||= createSidePanel({
      app, root,
      getFlow: (create = false) => (create ? getFlow() : Promise.resolve(flowRef)),
      flowAvailable,
      state: () => ({ mallow: mallowId, emotion: S.emotion, emotionName: S.emotionName, intention: S.intention }),
      onFeeling: (id) => pickFeeling(id),
      onIntention: (id) => pickIntention(id),
      onMallow: (dir) => switchMallow(dir),
      resumable: () => resumableNow(),
      onResume: () => { panel?.close(); resumeSaved(); },
      onClose: () => { panelBtn.setAttribute('aria-expanded', 'false'); root.classList.remove('hf-panel-open'); popLayer('panel'); layout(); later(() => layout(), 480); },
    });
    return panel;
  }
  async function togglePanel() {
    const p = await ensurePanel();
    if (!p) return;
    if (p.isOpen) { p.close(); return; }
    closeRead();                   // one transient layer at a time
    p.open();
    root.classList.add('hf-panel-open');
    pushLayer('panel');
    panelBtn.setAttribute('aria-expanded', 'true');
    // phones: the bottom sheet rises and the Mallow moves up above it (still squeezable)
    layout(); later(() => layout(), 480);
  }

  // ----------------------------------------------- saved progress --
  /** A saved Hushflow to pick up (read straight from the store; no director is made for it). */
  async function resumableNow() {
    if (!ent.has('paid') || !prefs.get('saveHistory') || worldMode) return null;
    let p = null;
    try { p = loadProgress(store); } catch { p = null; }
    if (!p?.worldId) return null;
    try {
      const { registry } = await import('../../hushfold/flow/registry.js');
      if (!registry.playable(p.worldId)) return null;
      return { worldId: p.worldId, title: registry.get(p.worldId)?.title || null, savedAt: p.savedAt };
    } catch { return null; }
  }
  function resumeSaved() { S.invited = true; showTell(true); startFlow({ resume: true }); }
  /** On arrival: offer to carry on, as a choice the person can ignore and keep squeezing. */
  async function offerResume() {
    const r = await resumableNow();
    if (!r || S.left || !quiet()) return false;
    S.invited = true;   // the resume offer stands in for the first invitation
    showTell(true);
    later(async () => {
      if (S.left || worldMode || overlay || S.flowAsked) return;
      const v = await subtitles.choice(lines.pick(mallowId, 'resumeAsk', { world: r.title }),
        [{ label: 'Carry on', value: 'resume', primary: true }, { label: 'Not now', value: 'no' }],
        { who: M().name, colour: M().colours.glow, timeoutMs: 20000, transient: true });
      if (v === 'resume' && !S.left && !worldMode) resumeSaved();
    }, 1200);
    return true;
  }

  async function setFeeling(id, { quiet = false } = {}) {
    const em = await import('../../data/emotions.js');
    const e = id ? em.getEmotion(id) : null;
    S.emotion = e ? id : null;
    S.emotionName = e?.name || null;
    if (e) stageMallow.setEmotion(e.face, 0.6, { quiet });
    else stageMallow.setStage('neutral', { quiet: true });
    return e;
  }
  async function pickFeeling(id) {
    if (id === 'other') {
      const { openEmotionPicker } = await import('../emotion-picker.js');
      openEmotionPicker({ selected: S.emotion ? [S.emotion] : [], onPick: (pid) => pickFeeling(pid) });
      return;
    }
    const e = await setFeeling(id);
    panel?.update();
    if (e) say(lines.pick(mallowId, 'ack', { emotion: id, feelingName: e.name, family: e.family }), { interrupt: !subtitles.holding });
    if (e && flowRef && !flowRef.stub) flowRef.setEmotion?.(flowEmotion(id, e.family));
  }
  async function pickIntention(id) {
    S.intention = id;
    panel?.update();
    if (id === 'play') say(lines.pick(mallowId, 'justPlay'), { interrupt: !subtitles.holding });
    if (id && flowRef && !flowRef.stub) flowRef.setIntention?.(id);
  }

  function backClose(token) {
    const owner = token ? Object.keys(layer).find((k) => layer[k] === token) : null;
    const k = owner || (overlay ? 'overlay' : readEl ? 'read' : panel?.isOpen ? 'panel' : null);
    if (!k) return;
    layer[k] = 0;   // its history entry is spent: closing must not step back again
    if (k === 'overlay') overlay?.close('back');
    else if (k === 'read') closeRead();
    else panel?.close();
  }

  // ------------------------------------------------------- keys --
  const onKey = (e) => {
    if (e.key !== 'Escape') return;
    if (readEl) { closeRead(); return; }
    if (panel?.isOpen) { e.preventDefault(); panel.close(); }
  };

  // -------------------------------------------------- the opening --
  // the opening lines only play into an untouched, quiet stage
  const quiet = () => !S.touches && !S.told && !S.flowAsked && !worldMode && !overlay;
  async function opening() {
    // back within this page session (from Settings, the garden, a ritual): the Tell pill, no "welcome back"
    const again = visitedThisSession;
    const returning = !again && !!prefs.get('seenIntro');
    visitedThisSession = true;
    prefs.set('seenIntro', true);
    if (await offerResume()) return;
    if (S.left) return;
    if (again) {
      showTell(true);
      nudgeT = later(() => { if (quiet() && !subtitles.busy) say(lines.pick(mallowId, 'nudge')); }, 12000);
    } else if (returning) {
      showTell(true);
      later(() => { if (quiet()) say(lines.pick(mallowId, 'return')); }, 1400);
      nudgeT = later(() => { if (quiet() && !subtitles.busy) say(lines.pick(mallowId, 'nudge')); }, 9000);
    } else {
      nudgeT = later(() => { if (quiet()) say(lines.pick(mallowId, 'nudge')); }, 3200);
    }
  }
  async function resumePendingTell() {
    const p = app.state.pendingTell;
    app.state.pendingTell = null;
    if (!p || Date.now() - p.at > 30 * 60 * 1000 || !ent.has('paid')) return false;
    S.invited = true;
    showTell(true);
    later(() => afterTell({ text: p.input?.text || '', emotion: p.emotion, intention: p.intention, safety: p.input?.safety?.detail || { level: 'none' }, input: p.input }), 700);
    return true;
  }

  const view = {
    el: root,
    title: '',
    spawnThought,
    get flow() { return flowRef; },
    async enter() {
      document.body.classList.add('hf-active');
      world.dim(false);
      world.showMallow(true);
      theme();
      stage = createStage({ fx: world.fx, tagRoot: root, reducedMotion: () => prefs.reducedMotion(), lowStim: () => !!prefs.get('lowStim'), onReadThought: readThought,
        keepOut: () => { const b = stageMallow?.bodyRect?.(); return b?.height ? { left: b.left, right: b.left + b.width, top: b.top, bottom: b.top + b.height } : null; } });
      // MallowTouch (W2) behind the same stage calls: opt-in while it is checked (?touch=1 on the
      // development host, or prefs.mallowTouch); the approved rig otherwise
      const qsTouch = ['localhost', '127.0.0.1'].includes(location.hostname) && new URLSearchParams(location.search).get('touch') === '1';
      if (qsTouch || prefs.get('mallowTouch') === true) {
        try {
          const { MallowTouch } = await import('../../mallows/touch/mallow-touch.js');
          if (S.left) return;
          touchBox = h('div', { class: 'hf-touch', 'aria-hidden': 'true' });
          world.fx.before(touchBox);
          touchMt = new MallowTouch(touchBox, { id: mallowId, bindPointer: false, reducedMotion: prefs.reducedMotion(), lowStim: !!prefs.get('lowStim'),
            audio: prefs.get('sound') ? app.audio : null, haptic: (k) => app.haptic(k) });
          world.showMallow(false);
        } catch (e) { console.warn('[hushfold] MallowTouch unavailable; using the rig', e); touchMt = null; touchBox?.remove(); touchBox = null; }
      }
      stageMallow = createStageMallow(world, { touch: touchMt });
      router = createInputRouter({
        el: world.fx, mallow: stageMallow, thoughts: stage.thoughts,
        onEmpty: (r) => { if (r.type === 'down') stage.ripple(r.x, r.y, M().colours.glow); },
        onTouch: (t) => { if (t.type === 'down') { S.touches++; clearNudge(); } },
      });
      stageMallow.on('touch', onMallowTouch);
      layout();
      // the Mallow first (squeezable within the first second), then its realm
      const rigP = showMallow(mallowId);
      rigP.then(() => { if (!S.left) requestAnimationFrame(() => world.setRealm(M().realm, { crossfadeMs: 900 })); });
      await rigP;
      if (S.left) return;
      stageMallow.setStage('neutral', { quiet: true });
      addEventListener('resize', onResize);
      visualViewport?.addEventListener('resize', onResize);
      document.addEventListener('keydown', onKey);
      offPrefs = prefs.onChange((k, v) => {
        if (!touchMt) return;
        if (k === 'lowStim') touchMt.setLowStim(!!v);
        if (k === 'motion') touchMt.setReducedMotion(prefs.reducedMotion());
        if (k === 'sound') touchMt.setAudio(v ? app.audio : null);
      });
      // QA hooks on the development host only (Playwright sweeps, the other workstreams' labs)
      if (['localhost', '127.0.0.1'].includes(location.hostname)) {
        window.__hushfold = { subtitles, mallow: stageMallow, stage, router, spawnThought, openTell, startFlow, get flow() { return flowRef; }, get panel() { return panel; }, get worldThought() { return worldThought; },
          get overlay() { return overlay; }, get layers() { return { ...layer }; }, touch: touchMt, safeForUpdate: () => view.safeForUpdate(), layout, resumableNow, S };
      }
      if (await resumePendingTell()) return;
      if (params.flow?.worldId && ent.has('paid')) {
        S.invited = true; showTell(true);
        startFlow({ worldId: params.flow.worldId, emotion: S.emotion, intention: S.intention });
        return;
      }
      opening();
    },
    leave() {
      S.left = true;
      if (window.__hushfold?.subtitles === subtitles) delete window.__hushfold;
      for (const t of timers) clearTimeout(t);
      timers.clear();
      clearTimeout(resizeT);
      removeEventListener('resize', onResize);
      visualViewport?.removeEventListener('resize', onResize);
      document.removeEventListener('keydown', onKey);
      offPrefs?.();
      overlay?.close('leave');
      closeRead();
      try { flowRef?.pause?.(); flowRef?.destroy?.(); } catch (e) { console.warn(e); }
      subtitles.destroy();
      panel?.destroy();
      router?.destroy();
      stage?.destroy();
      stageMallow?.destroy();
      if (touchMt) { try { touchMt.destroy(); } catch (e) { console.warn(e); } touchMt = null; touchBox?.remove(); touchBox = null; }
      if (S.photos) import('../../v3/photos.js').then((m) => m.photoSession.release()).catch(() => {});
      // hand the persistent stage back exactly as the classic scenes expect it
      world.setLayerSize(null);
      world.showMallow(true);
      world.fx.replaceChildren();
      world.fx.classList.remove('live');
      world.dim(false);
      document.body.classList.remove('hf-active', 'hf-world-arriving', 'hf-world-leaving');
    },
    /**
     * Back closes the newest transient layer first. main.js passes the token of
     * the history entry Back just used: that layer closes without stepping
     * history again (its entry is already gone).
     */
    get blockBack() {
      if (!overlay && !readEl && !panel?.isOpen) return null;
      return (token) => backClose(token);
    },
    safeForUpdate() {
      if (overlay?.dirty) return false;
      if (subtitles.holding) return false;
      // someone who went to call a helpline comes back to the same screen, Support pill and all
      if (S.crisis || S.care || !supportPill.hidden) return false;
      // their words are on stage as a Thought Mallow
      if (!worldMode && (stage?.thoughts.list.length || 0) > 0) return false;
      try { return flowRef?.safeForUpdate?.() ?? true; } catch { return false; }
    },
  };
  return view;
}
