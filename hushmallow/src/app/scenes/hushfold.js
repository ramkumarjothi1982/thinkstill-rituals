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
import { createLines, SHARED_LINES } from '../../hushfold/lines.js';
import { createStage, createStageMallow } from '../../hushfold/stage.js';
import { createInputRouter } from '../../hushfold/input-router.js';
import { hfIcon } from '../../hushfold/icons.js';

function mallowForNow() {
  const hr = new Date().getHours();
  if (hr >= 21 || hr < 6) return 'noomi';
  if (hr < 11) return 'boppo';
  if (hr < 17) return 'pipzi';
  return 'loomi';
}
const REACTION_KINDS = new Set(['squeeze', 'tap', 'doubleTap', 'flick', 'stretch', 'massage', 'stroke', 'jiggle']);

export default function hushfold(app, params = {}) {
  const { world, prefs, ent, store } = app;
  // explicit picks (Meet the Mallows, the panel switcher) win, then the last one chosen, then the time of day
  if (app.state.homeMallow && MALLOWS[app.state.homeMallow]) prefs.set('mallow', app.state.homeMallow);
  let mallowId = (MALLOWS[app.state.homeMallow] && app.state.homeMallow) || (MALLOWS[prefs.get('mallow')] && prefs.get('mallow')) || mallowForNow();
  const lines = createLines({ store });
  const S = {
    emotion: null, emotionName: null, intention: null, reactions: 0, touches: 0, firstTouchAt: 0, lastLineAt: 0,
    invited: false, told: false, crisis: false, photos: false, left: false,
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
  const dock = h('div', { class: 'hf-dock' }, supportPill, tellBtn);
  const srTitle = h('h1', { class: 'sr-only' }, `hushmallow. ${''}`);
  root.append(srTitle, topEl, dock);

  // --------------------------------------------------- subtitles --
  const subtitles = createSubtitles({
    root, prefs,
    reducedMotion: () => prefs.reducedMotion(),
    bounds: () => ({ top: (topEl.getBoundingClientRect().bottom || 60) + 12, bottom: dockTop() - 12 }),
    avoid: () => [mallowAvoidRect(), ...(stage?.thoughts.rects() || [])].filter(Boolean),
  });
  const say = (text, opts = {}) => {
    if (!text) return Promise.resolve(false);
    S.lastLineAt = now();
    return subtitles.say(text, { who: M().name, colour: M().colours.glow, ...opts });
  };

  // ------------------------------------------------------- stage --
  let stage = null, stageMallow = null, router = null, overlay = null, panel = null, readEl = null;
  let flowP = null, flowRef = null;
  let thoughtHome = { x: innerWidth * 0.8, y: innerHeight * 0.6 };

  function dockTop() {
    const r = tellBtn.classList.contains('is-hidden') && supportPill.hidden ? null : dock.getBoundingClientRect();
    return r && r.height ? r.top : innerHeight - 24;
  }
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
    const band = Math.min(156, Math.max(118, vh * 0.17));
    const regionTop = topB + band;
    const regionBottom = Math.min(vh - 76, dockTop() - 14);
    const regionH = Math.max(150, regionBottom - regionTop);
    const thought = (stage?.thoughts.list.length || 0) > 0;
    let B = Math.min(vw * 0.66, regionH * 0.7, 360);
    if (thought && vw < 700) B *= 0.84;
    B = Math.max(130, B);
    const lw = B / 0.64, lh = lw * 1.1;
    world.setLayerSize({ w: lw, h: lh });
    const cx = thought ? (vw < 700 ? vw * 0.4 : vw / 2 - B * 0.35) : vw / 2;
    const bodyCy = regionTop + regionH * 0.5;
    const layerCy = bodyCy - 0.098 * lw;
    world.place({ x: (cx / vw) * 100, y: (layerCy / vh) * 100, scale: 1 });
    thoughtHome = vw < 700 ? { x: vw * 0.82, y: bodyCy + B * 0.22 } : { x: vw / 2 + B * 0.55, y: bodyCy + B * 0.1 };
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
  function createStubFlow() {
    let status = 'idle';
    const tell = (k) => say(lines.pick(mallowId, k) || SHARED_LINES[k]?.[0]);
    return {
      stub: true,
      start() { tell('stub'); },
      next() { tell('stub'); },
      stay() { tell('stub'); },
      pause() { tell('stub'); },
      resume() { status = 'idle'; },
      finish() { tell('stub'); },
      setEmotion() {}, setIntention() {}, setAutoFlow() {},
      on() { return () => {}; },
      get state() { return { status, worldId: null, stub: true }; },
      safeForUpdate() { return true; },
      destroy() {},
    };
  }
  /** The Hushflow director (W4), loaded on first need; the stub if it is missing or throws. */
  function getFlow() {
    flowP ||= (async () => {
      try {
        const [mod, photos] = await Promise.all([import('../../hushfold/flow/director.js'), import('../../v3/photos.js').catch(() => null)]);
        if (typeof mod.createHushflow !== 'function') throw new Error('director has no createHushflow');
        const f = await mod.createHushflow({
          app, worldEl: document.getElementById('world'), fxEl: world.fx, mallow: stageMallow, thoughts: stage?.thoughts || null,
          subtitles, photos: photos?.photoSession || null, words: null, prefs, store, registry: null, router, spawnThought,
        });
        if (!f || typeof f.start !== 'function') throw new Error('director returned no flow');
        f.on?.('world', () => { panel?.update(); });
        f.on?.('complete', () => { app.applyUpdateIfSafe?.(); });
        f.on?.('progress', () => {});
        return f;
      } catch (e) {
        console.info('[hushfold] Hushflow director not available yet, using the stub:', e?.message || e);
        return createStubFlow();
      }
    })().then((f) => { flowRef = f; return f; });
    return flowP;
  }

  // ------------------------------------------------- the Mallow --
  async function showMallow(id, { entrance = true } = {}) {
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
    app.audio.ui('whoosh');
    subtitles.clear();
    theme();
    await showMallow(mallowId);
    world.setRealm(M().realm, { crossfadeMs: 1200 });
    world.setStage('curious');
    say(M().voice.hello[S.reactions % M().voice.hello.length], { interrupt: true });
    later(() => world.setStage('neutral'), 2600);
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
      say(lines.pick(mallowId, 'first', { kind: e.kind }), { interrupt: !subtitles.holding });
      return;
    }
    if (!S.invited && !S.told && !S.crisis && S.reactions >= 3 && t - S.firstTouchAt > 5500 && !subtitles.busy) { invite(); return; }
    // an occasional line, never a running commentary
    if (!subtitles.busy && t - S.lastLineAt > 9000 && S.reactions % 3 === 0) say(lines.pick(mallowId, 'squeeze', { kind: e.kind }));
  }
  let nudgeT = 0;
  function clearNudge() { clearTimeout(nudgeT); timers.delete(nudgeT); }

  async function invite() {
    S.invited = true;
    const [l1, l2] = lines.invitation(mallowId);
    await say(l1);
    if (S.left || overlay || S.told) return;
    showTell(true);
    const v = await subtitles.choice(l2, [{ label: 'Tell me', value: 'tell', primary: true }, { label: 'Just play', value: 'play' }],
      { who: M().name, colour: M().colours.glow, timeoutMs: 16000 });
    if (S.left) return;
    S.lastLineAt = now();
    if (v === 'tell') openTell('chip', l2);
    else if (v === 'play') { S.intention ||= 'just-play'; say(lines.pick(mallowId, 'justPlay')); }
    // ignored: nothing else. The Tell pill stays; they can play for as long as they like.
  }
  function showTell(on) { tellBtn.classList.toggle('is-hidden', !on); }

  // ---------------------------------------------------- telling --
  async function openTell(source, prompt) {
    if (overlay || S.left) return;
    subtitles.clear();
    panel?.close();
    showTell(false);
    world.setStage('listening', { quiet: true });
    const { openInput } = await import('../../hushfold/input-overlay.js');
    if (S.left || overlay) return;
    overlay = openInput({
      app, root, prompt: prompt || 'Want to tell me?',
      mallow: { id: mallowId, name: M().name, glow: M().colours.glow },
      emotion: S.emotion, intention: S.intention, hasPlan: ent.has('paid'),
      onSubmit: (r) => afterTell(r),
      onClose: (reason) => {
        overlay = null;
        if (S.left) return;
        showTell(true);
        if (reason !== 'submit') { world.setStage('neutral', { quiet: true }); app.applyUpdateIfSafe?.(); }
      },
    });
    S.photos = true;   // the overlay may have loaded the photo session
  }

  async function afterTell({ text, emotion, intention, safety, input }) {
    if (emotion) await setFeeling(emotion, { quiet: true });
    if (intention) S.intention = intention;
    if (safety?.level === 'crisis') {
      // no Thought Mallow, no world that transforms the words; support stays one tap away
      S.crisis = true;
      supportPill.hidden = false;
      world.setStage('comforting');
      say(SHARED_LINES.support, { interrupt: true });
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
    world.react('nod');
    if (emotion) say(lines.pick(mallowId, 'ack', { emotion, feelingName: S.emotionName }));
    if (text) {
      spawnThought(text, emotion);
      world.setStage('curious', { quiet: true });
      if (!emotion) say(lines.pick(mallowId, 'thought'));
    }
    if (safety?.level === 'care') say(SHARED_LINES.supportCare);
    const flow = await getFlow();
    if (S.left) return;
    try { flow.start({ emotion: emotion || S.emotion, intention: intention || S.intention, input, safety }); } catch (e) { console.warn('[hushfold] flow.start', e); }
    panel?.update();
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
  }
  function closeRead() { readEl?.remove(); readEl = null; }

  // ------------------------------------------------------ panel --
  async function ensurePanel() {
    if (panel) return panel;
    const { createSidePanel } = await import('../../hushfold/side-panel.js');
    if (S.left) return null;
    panel ||= createSidePanel({
      app, root, getFlow,
      state: () => ({ mallow: mallowId, emotion: S.emotion, emotionName: S.emotionName, intention: S.intention }),
      onFeeling: (id) => pickFeeling(id),
      onIntention: (id) => pickIntention(id),
      onMallow: (dir) => switchMallow(dir),
      onClose: () => panelBtn.setAttribute('aria-expanded', 'false'),
    });
    return panel;
  }
  async function togglePanel() {
    const p = await ensurePanel();
    if (!p) return;
    p.toggle();
    panelBtn.setAttribute('aria-expanded', String(p.isOpen));
  }

  async function setFeeling(id, { quiet = false } = {}) {
    const em = await import('../../data/emotions.js');
    const e = id ? em.getEmotion(id) : null;
    S.emotion = e ? id : null;
    S.emotionName = e?.name || null;
    if (e) world.setEmotion(e.face, 0.6, { quiet });
    else world.setStage('neutral', { quiet: true });
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
    if (e) say(lines.pick(mallowId, 'ack', { emotion: id, feelingName: e.name }), { interrupt: !subtitles.holding });
    (await getFlow())?.setEmotion?.(id);
  }
  async function pickIntention(id) {
    S.intention = id;
    panel?.update();
    if (id === 'just-play') say(lines.pick(mallowId, 'justPlay'), { interrupt: !subtitles.holding });
    (await getFlow())?.setIntention?.(id);
  }

  // ------------------------------------------------------- keys --
  const onKey = (e) => {
    if (e.key !== 'Escape') return;
    if (readEl) { closeRead(); return; }
    if (panel?.isOpen) { e.preventDefault(); panel.close(); }
  };

  // -------------------------------------------------- the opening --
  function opening() {
    const returning = !params.intro && prefs.get('seenIntro');
    prefs.set('seenIntro', true);
    if (returning) {
      showTell(true);
      later(() => { if (!S.touches) say(lines.pick(mallowId, 'return')); }, 1400);
      nudgeT = later(() => { if (!S.touches && !subtitles.busy) say(lines.pick(mallowId, 'nudge')); }, 9000);
    } else {
      nudgeT = later(() => { if (!S.touches) say(lines.pick(mallowId, 'nudge')); }, 3200);
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
      stage = createStage({ fx: world.fx, tagRoot: root, reducedMotion: () => prefs.reducedMotion(), lowStim: () => !!prefs.get('lowStim'), onReadThought: readThought });
      stageMallow = createStageMallow(world);
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
      world.setStage('neutral', { quiet: true });
      addEventListener('resize', onResize);
      visualViewport?.addEventListener('resize', onResize);
      document.addEventListener('keydown', onKey);
      if (await resumePendingTell()) return;
      if (params.flow?.worldId && ent.has('paid')) {
        S.invited = true; showTell(true);
        const flow = await getFlow();
        if (!S.left) flow.start({ worldId: params.flow.worldId, emotion: S.emotion, intention: S.intention });
        return;
      }
      opening();
    },
    leave() {
      S.left = true;
      for (const t of timers) clearTimeout(t);
      timers.clear();
      clearTimeout(resizeT);
      removeEventListener('resize', onResize);
      visualViewport?.removeEventListener('resize', onResize);
      document.removeEventListener('keydown', onKey);
      overlay?.close('leave');
      closeRead();
      try { flowRef?.pause?.(); flowRef?.destroy?.(); } catch (e) { console.warn(e); }
      subtitles.destroy();
      panel?.destroy();
      router?.destroy();
      stage?.destroy();
      stageMallow?.destroy();
      if (S.photos) import('../../v3/photos.js').then((m) => m.photoSession.release()).catch(() => {});
      // hand the persistent stage back exactly as the classic scenes expect it
      world.setLayerSize(null);
      world.showMallow(true);
      world.fx.replaceChildren();
      world.fx.classList.remove('live');
      world.dim(false);
      document.body.classList.remove('hf-active');
    },
    get blockBack() {
      if (overlay) return () => overlay?.close('back');
      if (readEl) return () => closeRead();
      if (panel?.isOpen) return () => panel.close();
      return null;
    },
    safeForUpdate() {
      if (overlay?.dirty) return false;
      if (subtitles.holding) return false;
      try { return flowRef?.safeForUpdate?.() ?? true; } catch { return false; }
    },
  };
  return view;
}
