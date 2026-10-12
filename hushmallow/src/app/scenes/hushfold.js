// THE HUSHFOLD — the app's home. A living Mallow you can squeeze the moment
// the app opens; an invitation (as a subtitle, never a form) to say what's on
// your mind; your words becoming a Thought Mallow; and Hushflow, a continuous
// run of worlds that respond to how you touch them. Pause, switch feeling,
// stay, or finish whenever you like.
//
// Layers (inside one fixed root, above the realm backdrop in #world):
//   .hf-bg      per-world full-screen canvases (the ocean)
//   .hf-fx      per-world gameplay overlays (storm lightning and ribbons)
//   .hf-actors  the Mallow (MallowTouch) and Thought Mallows
//   .hf-touch   one transparent surface that routes every finger to the
//               right thing: a Thought Mallow, the Mallow, or the world
//   .hf-ui      top bar, subtitles, tell overlay, panel, cards

import { BRAND } from '../brand.js';
import { h, icon, iconBtn, logo } from '../ui.js';
import { MALLOWS, MALLOW_IDS } from '../../mallows/registry.js';
import { SoftMallow } from '../../hushfold/touch/mallow-touch.js';
import { ThoughtMallow, fragments } from '../../hushfold/thought-mallow.js';
import { createSubtitles } from '../../hushfold/subtitles.js';
import { openThoughtInput } from '../../hushfold/thought-input.js';
import { openPanel } from '../../hushfold/panel.js';
import { installSkill, openGarden } from '../../hushfold/garden.js';
import { planFlow, nextWorld, createFlowStore, worldById } from '../../hushfold/flow.js';
import { INVITE, TOUCH_QUIPS, RESPONSES, TRANSITIONS, GENTLE_ENDS, feeling as feelingOf } from '../../hushfold/data/lines.js';
import { skillById } from '../../hushfold/data/skills.js';
import { planName } from '../entitlements.js';

const WORLD_MODULES = {
  'static-storm': () => import('../../hushfold/worlds/static-storm.js'),
  'luminous-ocean': () => import('../../hushfold/worlds/luminous-ocean.js'),
  'moonmilk-rest': () => import('../../hushfold/worlds/moonmilk-rest.js'),
};
const START_CHARGE = { angry: 0.9, frustrated: 0.8, restless: 0.75, overwhelmed: 0.7, anxious: 0.6, other: 0.6, sad: 0.4, lonely: 0.4 };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export default function hushfold(app, params = {}) {
  const { world: stage, prefs, ent, store } = app;
  const flow = createFlowStore(store);
  const fs = flow.get();
  const reduced = () => prefs.reducedMotion();
  const S = {
    mode: 'play', feeling: fs.feeling || null, intention: fs.intention || 'calm', autoflow: fs.autoflow !== false, speed: fs.speed || 1,
    stay: false, mallowId: params.mallow || app.state.hfMallow || 'glitzi', text: '', plan: [], worldId: null, world: null, worldEls: null,
    thoughts: [], paused: false, invited: false, quipAt: 0, said: new Set(), destroyed: false,
  };

  // ---------------------------------------------------------- layout --
  const bgLayer = h('div', { class: 'hf-bg' });
  const fxLayer = h('div', { class: 'hf-fx' });
  const mallowBox = h('div', { class: 'hf-mallow' });
  const thoughtLayer = h('div', { class: 'hf-thoughts' });
  const actors = h('div', { class: 'hf-actors' }, mallowBox, thoughtLayer);
  const touch = h('div', { class: 'hf-touch', 'aria-hidden': 'true' });
  const ui = h('div', { class: 'hf-ui' });
  const worldUi = h('div', { class: 'hf-world-ui' });
  const gardenBtn = iconBtn('leaf', 'Memory Garden', () => showGarden());
  const pauseBtn = iconBtn('pause', 'Pause', () => pause());
  const panelBtn = iconBtn('sliders', 'Hushflow settings', () => showPanel());
  const brand = logo('hf-brand');
  const worldChip = h('div', { class: 'hf-world-chip', 'aria-live': 'polite' });
  const top = h('div', { class: 'hf-top' }, brand, pauseBtn, h('div', { class: 'grow' }, worldChip), gardenBtn, panelBtn);
  const tellBtn = h('button', { class: 'hf-tell-btn', onclick: () => tell() }, h('span', { class: 'spark', 'aria-hidden': 'true' }), 'Tell ');
  const prevBtn = h('button', { class: 'hf-mini hf-switch', 'aria-label': 'Previous Mallow', onclick: () => cycle(-1) }, icon('back'));
  const nextBtn = h('button', { class: 'hf-mini hf-switch flip', 'aria-label': 'Next Mallow', onclick: () => cycle(1) }, icon('back'));
  const nameTag = h('div', { class: 'hf-name' });
  const resumeBtn = h('button', { class: 'hf-pill hf-resume', hidden: true, onclick: () => resumeSaved() }, 'Continue where you left off');
  const dock = h('div', { class: 'hf-dock' }, h('div', { class: 'hf-dock-row' }, prevBtn, nameTag, nextBtn), h('div', { class: 'hf-dock-row' }, resumeBtn), tellBtn);
  ui.append(top, worldUi, dock);
  const root = h('div', { class: 'hf', 'data-mode': 'play' }, bgLayer, fxLayer, actors, touch, ui);
  const subs = createSubtitles(ui, { speed: () => S.speed, reducedMotion: reduced });
  ui.insertBefore(subs.el, worldUi);

  let mallow = null;
  function setMode(m) { S.mode = m; root.dataset.mode = m; }

  // ----------------------------------------------------------- Mallow --
  async function showMallow(id, { hop = true } = {}) {
    if (mallow && mallow.id === id) return mallow;
    S.mallowId = id; app.state.hfMallow = id;
    const old = mallow;
    const holder = h('div', { class: 'hf-mallow-holder' });
    mallowBox.append(holder);
    const m = new SoftMallow(holder, {
      id, reducedMotion: reduced(), audio: prefs.get('sound') ? app.audio : null, haptics: prefs.get('haptics'),
      haptic: (k) => app.haptic(k), fit: 0.6, baseline: 0.9,
    });
    mallow = m;
    m.on('touch', onMallowTouch);
    if (old) {
      old.container.classList.add('leaving');
      setTimeout(() => { old.destroy(); old.container.remove(); }, 380);
    }
    await m.loaded;
    if (S.destroyed) return m;
    if (hop && !reduced()) m.react('hop');
    nameTag.textContent = `${MALLOWS[id].name} · ${MALLOWS[id].title}`;
    tellBtn.lastChild.textContent = `Tell ${MALLOWS[id].name}`;
    return m;
  }

  async function cycle(dir) {
    const i = (MALLOW_IDS.indexOf(S.mallowId) + dir + MALLOW_IDS.length) % MALLOW_IDS.length;
    const id = MALLOW_IDS[i];
    app.audio.ui('whoosh');
    subs.clear();
    await Promise.all([stage.setRealm(MALLOWS[id].realm), showMallow(id)]);
    S.invited = false;
    scheduleInvite(2200);
  }

  function onMallowTouch(e) {
    S.lastTouch = performance.now();
    if (!S.firstTouch) { S.firstTouch = true; scheduleInvite(2600); }
    const kind = { squeeze: 'squeeze', flick: 'flick', jiggle: 'jiggle', slip: 'slip' }[e.kind]
      || (e.kind === 'massage' || e.kind === 'stroke' ? (e.calm > 0.55 ? 'calm' : null) : null);
    if (mallow?.touch.stretch > 0.6) quip('stretch');
    if (kind) quip(kind);
  }
  function quip(kind) {
    const now = performance.now();
    if (now - S.quipAt < 7000 || subs.busy) return;
    const lines = TOUCH_QUIPS[S.mallowId]?.[kind];
    if (!lines) return;
    // the first of each kind always lands; after that only now and then
    if (S.said.has(kind) && Math.random() > 0.35) return;
    S.said.add(kind);
    S.quipAt = now;
    subs.say(pick(lines), { who: MALLOWS[S.mallowId].name, priority: 'low' });
  }

  // ------------------------------------------------------ the invite --
  let inviteTimer = 0;
  function scheduleInvite(ms) {
    clearTimeout(inviteTimer);
    if (S.invited || S.mode !== 'play') return;
    inviteTimer = setTimeout(invite, ms);
  }
  async function invite() {
    if (S.invited || S.mode !== 'play' || S.destroyed) return;
    if (subs.busy) { scheduleInvite(2500); return; }
    S.invited = true;
    const lines = INVITE[S.mallowId] || INVITE.glitzi;
    const name = MALLOWS[S.mallowId].name;
    const choice = await subs.say(lines, { who: name, actions: [{ id: 'tell', label: `Tell ${name}`, primary: true }, { id: 'play', label: 'Just squishing' }], timeout: 14000 });
    if (choice === 'tell') tell();
  }

  // ------------------------------------------------------- tell + thought --
  async function tell() {
    if (S.mode === 'tell') return;
    if (!ent.has('paid')) { app.go('plans', { reason: 'start' }); return; }
    clearTimeout(inviteTimer);
    subs.clear();
    const prev = S.mode;
    setMode('tell');
    mallow?.setStage('listening');
    const r = await openThoughtInput(ui, { who: MALLOWS[S.mallowId].name, feeling: S.feeling });
    if (S.destroyed) return;
    if (!r) { setMode(prev); mallow?.setStage('neutral'); return; }
    // safety first: crisis language gets real support, not a game
    try {
      const { interpret } = await import('../../engine/interpret.js');
      if (interpret(r.text).safety.level === 'crisis') {
        const { openSupport } = await import('./support.js');
        setMode('play');
        mallow?.setStage('comforting');
        openSupport(app, { urgent: true });
        return;
      }
    } catch (e) { console.warn(e); }
    S.text = r.text;
    S.feeling = r.feeling;
    flow.set({ feeling: r.feeling });
    await materialise(r.text, r.feeling);
    await startJourney();
  }

  async function materialise(text, feelingId) {
    clearThoughts();
    const f = feelingOf(feelingId);
    const mr = mallowBox.getBoundingClientRect();
    const crowd = f.thought === 'crowd';
    const parts = crowd ? fragments(text, 3) : [text];
    parts.forEach((t, i) => {
      const th = new ThoughtMallow(thoughtLayer, {
        text: t, style: f.thought, size: Math.min(110, innerHeight * 0.12),
        x: mr.left + mr.width * (0.72 + i * 0.12), y: mr.top + mr.height * 0.3 - i * 30,
        reducedMotion: reduced(), audio: prefs.get('sound') ? app.audio : null, haptic: (k) => app.haptic(k),
      });
      th.tx = innerWidth * (parts.length > 1 ? 0.3 + i * 0.22 : 0.62); th.ty = innerHeight * (0.5 + (i % 2) * 0.06);
      th.onTouch = (e) => { if (e.kind === 'care' && !S.said.has('care')) { S.said.add('care'); subs.say('Gentle. It likes that.', { who: MALLOWS[S.mallowId].name, priority: 'low' }); } };
      S.thoughts.push(th);
    });
    app.audio.fx('bloom', { intensity: 0.5 });
    app.haptic('pop');
    mallow?.react('gasp');
    mallow?.lookAt(0.6, -0.2);
    mallow?.setEmotion(f.face, 0.5);
    await subs.say(RESPONSES[feelingId] || RESPONSES.other, { who: MALLOWS[S.mallowId].name });
  }

  function clearThoughts() { for (const t of S.thoughts) t.destroy(); S.thoughts = []; }

  // ---------------------------------------------------------- Hushflow --
  async function startJourney(startAt = null) {
    S.plan = planFlow({ feeling: S.feeling || 'other', intention: S.intention, favourite: flow.get().favourite, lastPlayed: flow.get().lastPlayed });
    setMode('journey');
    await goWorld(startAt || S.plan[0]);
  }

  let switching = false;
  async function goWorld(id, { line = null } = {}) {
    const def = worldById(id);
    if (!def || switching) return;
    switching = true;
    const prev = S.world, prevEls = S.worldEls, prevId = S.worldId;
    if (line) subs.say(line, { priority: 'low' });
    prev?.melt?.();
    const mod = (await WORLD_MODULES[def.module]()).default;
    if (S.destroyed) { switching = false; return; }
    const bg = h('canvas', { class: 'hf-canvas' });
    const fx = h('canvas', { class: 'hf-canvas' });
    bgLayer.append(bg); fxLayer.append(fx);
    const ctx = {
      bg, canvas: fx, ui: worldUi, subs, app, reduced: reduced(),
      fromStorm: prevId === 'static-storm', startCharge: START_CHARGE[S.feeling] ?? 0.6,
      thoughts: () => S.thoughts, mallow: () => mallow,
      setMallowBob: (px) => { mallowBox.style.setProperty('--bob', `${px.toFixed(1)}px`); },
      offerSkill, complete: () => onWorldComplete(id),
    };
    const w = mod(ctx);
    S.world = w; S.worldId = id; S.worldEls = [bg, fx];
    root.dataset.world = id;
    worldChip.textContent = def.title;
    worldChip.classList.add('show');
    setTimeout(() => worldChip.classList.remove('show'), 3200);
    // the world's own canvases fade in over the old ones
    for (const c of [bg, fx]) c.style.opacity = '0';
    requestAnimationFrame(() => { for (const c of [bg, fx]) c.style.opacity = '1'; });
    if (def.module !== 'luminous-ocean') bg.remove();
    await Promise.all([stage.setRealm(def.realm), showMallow(def.mallow, { hop: !!prev })]);
    if (def.module !== 'static-storm') mallowBox.style.removeProperty('--bob');
    stage.realm?.setMood?.({ agitation: 0.2 });
    // thoughts drift to where this world wants them
    for (const [i, t] of S.thoughts.entries()) { t.tx = innerWidth * (0.55 + i * 0.12); t.ty = innerHeight * (0.48 + i * 0.05); }
    flow.markPlayed(id);
    flow.save({ world: id, feeling: S.feeling, intention: S.intention, text: S.text, keepWords: prefs.get('saveWords') });
    setTimeout(() => { prev?.destroy?.(); for (const el of prevEls || []) { el.style.opacity = '0'; setTimeout(() => el.remove(), 900); } }, prev ? 2600 : 0);
    switching = false;
    await w.enter?.();
  }

  async function onWorldComplete(id) {
    if (S.world?.id !== id || S.destroyed) return;
    const next = nextWorld(S.plan, id);
    if (S.autoflow && !S.stay && next) {
      await wait(1200);
      if (S.world?.id === id && !S.paused) goWorld(next, { line: transitionLine(id, next) });
      return;
    }
    const actions = [];
    if (next) actions.push({ id: 'next', label: 'Continue', primary: true });
    actions.push({ id: 'stay', label: 'Stay here' }, { id: 'finish', label: 'Finish' });
    const c = await subs.say('Where to next?', { actions });
    if (c === 'next') goWorld(next, { line: transitionLine(id, next) });
    else if (c === 'finish') finish();
  }
  function transitionLine(a, b) {
    if (a === 'static-storm' && b === 'luminous-ocean') return TRANSITIONS.stormToOcean;
    if (a === 'luminous-ocean') return TRANSITIONS.oceanToRest;
    return TRANSITIONS.restToStorm;
  }

  async function offerSkill(id) {
    const s = skillById(id);
    if (!s) return;
    if (flow.hasSkill(id)) {
      flow.practised(id);
      subs.say(`Already in your Memory Garden: ${s.title}.`, { priority: 'low' });
      return;
    }
    const c = await subs.say(`Save “${s.title}” to your Memory Garden?`, { actions: [{ id: 'save', label: 'Save it', primary: true }, { id: 'no', label: 'Not now' }], timeout: 40000 });
    if (c !== 'save') return;
    flow.saveSkill(id, S.worldId);
    const mr = mallowBox.getBoundingClientRect();
    installSkill(ui, id, { from: { x: mr.left + mr.width / 2, y: mr.top + mr.height * 0.25 }, to: gardenBtn, reduced: reduced(), audio: app.audio, haptic: (k) => app.haptic(k), onOpen: (sid) => showGarden(sid) });
  }

  // ------------------------------------------------ pause, finish, panel --
  function pause() {
    if (S.paused) return;
    S.paused = true;
    S.world?.pause?.();
    subs.pause();
    root.classList.add('paused');
    const card = h('div', { class: 'hf-pause', role: 'dialog', 'aria-label': 'Paused' },
      h('div', { class: 'hf-pause-card' },
        h('h2', {}, 'Paused'),
        h('p', {}, 'Take all the time you need.'),
        h('button', { class: 'btn primary block', onclick: () => resume() }, 'Resume'),
        S.mode === 'journey' ? h('button', { class: 'btn block', onclick: () => { resume(); finish({ saved: true }); } }, 'Save and finish') : null,
        h('button', { class: 'btn ghost block', onclick: () => { resume(); finish(); } }, 'Finish')));
    ui.append(card);
    requestAnimationFrame(() => card.classList.add('open'));
    setTimeout(() => card.querySelector('.btn')?.focus(), 200);
    function resume() {
      S.paused = false;
      S.world?.resume?.();
      subs.resume();
      root.classList.remove('paused');
      card.remove();
    }
  }

  async function finish({ saved = false } = {}) {
    subs.clear();
    if (!saved) flow.clearSaved();
    const w = S.world, els = S.worldEls;
    S.world = null; S.worldId = null; S.worldEls = null;
    w?.destroy?.();
    for (const el of els || []) { el.style.opacity = '0'; setTimeout(() => el.remove(), 900); }
    clearThoughts();
    setMode('play');
    delete root.dataset.world;
    mallowBox.style.removeProperty('--bob');
    await Promise.all([stage.setRealm(MALLOWS[S.mallowId].realm)]);
    mallow?.setStage('comforting');
    const actions = [{ id: 'garden', label: 'Memory Garden' }];
    if (ent.has('ultra') && S.text) actions.unshift({ id: 'angle', label: 'Look from another angle' });
    S.invited = true;
    const c = await subs.say(saved ? ['Saved. Pick it up any time.'] : GENTLE_ENDS, { who: MALLOWS[S.mallowId].name, actions, timeout: 12000 });
    if (c === 'garden') showGarden();
    if (c === 'angle') app.go('angle', { text: S.text });
    updateResume();
  }

  function showPanel() {
    const cur = flow.get();
    openPanel(ui, {
      state: { feeling: S.feeling, intention: S.intention, autoflow: S.autoflow, speed: S.speed, stay: S.stay, favourite: cur.favourite && cur.favourite === S.worldId },
      inWorld: S.mode === 'journey',
      tierLabel: ent.has('paid') ? `Your plan: ${planName(ent.tier())}` : `${BRAND.flowPlanName} and Beyond`,
      onFeeling: (id) => { S.feeling = id; flow.set({ feeling: id }); if (S.mode === 'journey') replan(); },
      onIntention: (id) => {
        S.intention = id; flow.set({ intention: id });
        if (id === 'play' && S.mode === 'journey') finish({ saved: true });
        else if (S.mode === 'journey') replan();
      },
      onAutoflow: (v) => { S.autoflow = v; flow.set({ autoflow: v }); },
      onStay: (v) => { S.stay = v; },
      onFavourite: (v) => flow.set({ favourite: v ? S.worldId : null }),
      onSpeed: (v) => { S.speed = v; flow.set({ speed: v }); },
      onGarden: () => showGarden(),
      onFinish: () => finish(),
      onMore: (where) => {
        if (where === 'angle') app.go('angle', { text: S.text || '' });
        else if (where === 'rituals') app.go('rituals');
        else app.go(where);
      },
    });
  }

  function replan() {
    S.plan = planFlow({ feeling: S.feeling || 'other', intention: S.intention, favourite: flow.get().favourite, lastPlayed: flow.get().lastPlayed });
    const best = S.plan[0];
    if (best && best !== S.worldId) goWorld(best, { line: 'Shifting the world a little…' });
    // a new feeling reshapes the thought, too
    for (const t of S.thoughts) { t.calm = Math.max(0, t.calm - 0.2); }
  }

  function showGarden(focus = null) {
    openGarden({ saved: flow.garden(), focus, practise: async (worldId) => {
      if (!ent.has('paid')) { app.go('plans', { reason: 'start' }); return; }
      if (S.mode !== 'journey') { S.plan = planFlow({ feeling: S.feeling || 'other', intention: S.intention }); setMode('journey'); }
      goWorld(worldId);
    } });
  }

  function updateResume() {
    const saved = flow.get().saved;
    resumeBtn.hidden = !(saved && S.mode === 'play' && Date.now() - saved.at < 3 * 864e5 && ent.has('paid'));
  }
  async function resumeSaved() {
    const saved = flow.get().saved;
    if (!saved) return;
    resumeBtn.hidden = true;
    S.feeling = saved.feeling; S.intention = saved.intention || S.intention;
    if (saved.text) await materialise(saved.text, saved.feeling);
    S.text = saved.text || '';
    startJourney(saved.world);
  }

  // ------------------------------------------------------ touch router --
  const routes = new Map();
  touch.addEventListener('pointerdown', (e) => {
    if (S.paused) return;
    let target = null;
    for (let i = S.thoughts.length - 1; i >= 0; i--) if (S.thoughts[i].hit(e.clientX, e.clientY)) { target = S.thoughts[i]; break; }
    if (!target && mallow?.hit(e.clientX, e.clientY)) target = mallow;
    if (!target && S.world) target = S.world;
    if (!target) { stage.realm?.pulse?.('tap', { x: e.clientX, y: e.clientY }); return; }
    touch.setPointerCapture?.(e.pointerId);
    routes.set(e.pointerId, target);
    target.pointerDown(e);
    e.preventDefault();
  });
  touch.addEventListener('pointermove', (e) => {
    const t = routes.get(e.pointerId);
    if (t) t.pointerMove(e);
    else if (mallow && e.pointerType === 'mouse') { const p = mallow.local(e.clientX, e.clientY); mallow.lookAt((p.x - mallow.CX) / (mallow.W * 0.5), (p.y - mallow.H * 0.5) / (mallow.H * 0.5)); }
  });
  const end = (e) => { const t = routes.get(e.pointerId); routes.delete(e.pointerId); if (!t) return; e.type === 'pointercancel' && t.pointerCancel ? t.pointerCancel(e) : t.pointerUp(e); };
  touch.addEventListener('pointerup', end);
  touch.addEventListener('pointercancel', end);
  // keyboard: Space/Enter on the Mallow squeezes; T opens the tell overlay
  const onKey = (e) => {
    if (e.target.closest?.('input, textarea, .sheet, .hf-panel')) return;
    if ((e.key === 't' || e.key === 'T') && S.mode !== 'tell') { e.preventDefault(); tell(); }
    if (e.key === ' ' && mallow) { e.preventDefault(); mallow.react('squeeze' in (mallow.reactions || {}) ? 'squeeze' : 'tap'); }
    if (e.key === 'Escape' && S.mode === 'journey') pause();
  };

  // ------------------------------------------------------------- loop --
  let raf = 0, last = 0;
  function frame(t) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (t - (last || t)) / 1000);
    last = t;
    if (S.paused || document.hidden) return;
    S.world?.update?.(dt);
    for (const th of S.thoughts) th.update(dt);
    S.world?.render?.();
    const dpr = devicePixelRatio || 1;
    for (const th of S.thoughts) th.render(dpr);
  }
  // the official tagline, once per visit: it rises softly out of the scene
  // and leaves before the Mallow says anything (never over the Mallow)
  function showTagline() {
    try { if (sessionStorage.getItem('hm:tagline')) return; sessionStorage.setItem('hm:tagline', '1'); } catch {}
    const el = h('div', { class: 'hf-tagline' }, ...BRAND.brandTagline.split(/(?<=\.)\s+/).flatMap((t, i) => (i ? [' ', h('span', {}, t)] : [h('span', {}, t)])));
    ui.append(el);
    requestAnimationFrame(() => el.classList.add('in'));
    setTimeout(() => { el.classList.remove('in'); el.classList.add('out'); }, reduced() ? 2600 : 3400);
    setTimeout(() => el.remove(), 5200);
  }
  const onResize = () => S.world?.resize?.();
  const onVis = () => { if (document.hidden && S.mode === 'journey' && !S.paused) pause(); };

  return {
    el: root,
    title: null,
    async enter() {
      stage.dim(false);
      stage.showMallow(false);
      document.addEventListener('keydown', onKey);
      addEventListener('resize', onResize);
      document.addEventListener('visibilitychange', onVis);
      raf = requestAnimationFrame(frame);
      await Promise.all([stage.setRealm(MALLOWS[S.mallowId].realm), showMallow(S.mallowId)]);
      updateResume();
      showTagline();
      if (params.intro) prefs.set('seenIntro', true);
      // nothing to read first: the Mallow is already squeezable; the invite
      // comes while you play (or after a little while if you just look)
      scheduleInvite(params.intro ? 6500 : 5000);
      if (params.world && ent.has('paid')) { S.feeling = params.feeling || S.feeling || 'angry'; startJourney(params.world); }
      window.__hf = debugApi();
    },
    leave() {
      S.destroyed = true;
      clearTimeout(inviteTimer);
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
      removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis);
      subs.destroy();
      S.world?.destroy?.();
      clearThoughts();
      mallow?.destroy();
      stage.showMallow(true);
      // the next screen meets the same Mallow you were just squeezing
      if (stage.rig?.id !== S.mallowId) stage.setMallow?.(S.mallowId, { entrance: false });
      if (window.__hf) delete window.__hf;
    },
  };

  // QA hooks (used by the Playwright checks; harmless in production)
  function debugApi() {
    return {
      get state() { return { mode: S.mode, world: S.worldId, feeling: S.feeling, thoughts: S.thoughts.length, paused: S.paused, plan: S.plan, mallow: S.mallowId, charge: S.world?.charge, progress: S.world?.progress, pace: S.world?.pace, thought: S.thoughts[0] ? { calm: +S.thoughts[0].calm.toFixed(2), scale: +S.thoughts[0].scale.toFixed(2), x: Math.round(S.thoughts[0].x), y: Math.round(S.thoughts[0].y) } : null }; },
      get mallow() { return mallow; },
      get subs() { return subs; },
      tell, finish, pause, goWorld, materialise: (t, f) => materialise(t, f), startJourney,
    };
  }
}
