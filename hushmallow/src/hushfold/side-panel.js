// The Hushfold's side panel: non-modal, fixed to the viewport's right edge
// (≤360px), sliding in over the stage without a backdrop, so the Mallow and
// the world keep playing beside it. On phones (<700px wide) it is a shorter
// bottom sheet instead, and the scene lifts the Mallow into the space above.
//
// createSidePanel({ app, root, getFlow, flowAvailable, state, onFeeling,
//   onIntention, onMallow, onSupport, pausedNow, onPause, resumable, onResume, onClose })
//   → { el, open(), close(), toggle(), update(), get isOpen }
// state() → { mallow, mallowWaiting, emotion, emotionName, intention }: in a world the
// switcher shows who the person comes back to (mallowWaiting). pausedNow() / onPause()
// let the scene own Pause while it holds a world behind the phone sheet.
//
// Every Hushflow action goes to the `flow` object (the W4 director API, or the
// shell's stub): setEmotion, setIntention, setAutoFlow, stay, pause/resume,
// finish, plus favourite worlds through src/engine/flow-store.js.

import { h } from '../app/ui.js';
import { PLANS } from '../app/entitlements.js';
import { MALLOWS } from '../mallows/registry.js';
import { openSupport } from '../app/scenes/support.js';
import { toggleFavouriteWorld, isFavouriteWorld } from '../engine/flow-store.js';
import { hfIcon } from './icons.js';
import { QUICK_FEELINGS, INTENTIONS } from './lines.js';

export function createSidePanel({ app, root, getFlow, flowAvailable = () => Promise.resolve(true), onFeeling, onIntention, onMallow, onClose, state = () => ({}),
  resumable = () => Promise.resolve(null), onResume = null, onSupport = null, pausedNow = () => null, onPause = null } = {}) {
  const { prefs, ent, store } = app;
  let isOpen = false;
  let opener = null;
  const reduced = () => prefs.reducedMotion();

  const closeBtn = h('button', { class: 'hf-btn', type: 'button', 'aria-label': 'Close panel', onclick: () => api.close() }, hfIcon('close'));
  const planEl = h('button', { class: 'plan', type: 'button', onclick: () => go('plans', { reason: 'panel' }) });
  const mallowImg = h('img', { alt: '', width: '52', height: '52', decoding: 'async' });
  const mallowName = h('b');
  const mallowTitle = h('span');
  const feelWrap = h('div', { class: 'wrap', role: 'group', 'aria-label': 'How are you feeling?' });
  const intentWrap = h('div', { class: 'wrap', role: 'group', 'aria-label': 'What would help?' });
  const auto = h('input', { type: 'checkbox', class: 'switch', 'aria-label': 'Auto-flow' });
  auto.checked = !!prefs.get('autoFlow');
  auto.addEventListener('change', async () => {
    prefs.set('autoFlow', auto.checked);
    app.haptic('light');
    (await getFlow(false))?.setAutoFlow?.(auto.checked);
  });
  const pauseBtn = h('button', { class: 'hf-ghost', type: 'button', onclick: () => act('pause') }, hfIcon('pause'), h('span', {}, 'Pause'));
  const stayBtn = h('button', { class: 'hf-ghost', type: 'button', onclick: () => act('stay') }, hfIcon('stay'), 'Stay longer');
  const finishBtn = h('button', { class: 'hf-ghost', type: 'button', onclick: () => act('finish') }, hfIcon('finish'), 'Finish');
  const favBtn = h('button', { class: 'hf-ghost', type: 'button', 'aria-pressed': 'false', onclick: () => act('favourite') }, hfIcon('star', { filled: false }), h('span', {}, 'Favourite world'));
  const flowNote = h('p', { class: 'fine' });
  // a saved Hushflow (flow-store progress) can be picked up from here too
  const resumeTitle = h('span', {});
  const resumeBtn = h('button', { class: 'hf-link resume', type: 'button', hidden: true, onclick: () => onResume?.() }, hfIcon('play'),
    h('span', { class: 'grow' }, 'Resume', h('small', { style: { display: 'block', font: 'var(--hf-font-caption)', color: 'var(--text-3)' } }, resumeTitle)), hfIcon('chev'));
  const link = (iconName, label, onclick, sub) => h('button', { class: 'hf-link', type: 'button', onclick }, hfIcon(iconName),
    h('span', { class: 'grow' }, label, sub ? h('small', { style: { display: 'block', font: 'var(--hf-font-caption)', color: 'var(--text-3)' } }, sub) : null), hfIcon('chev'));

  const el = h('aside', { class: 'hf-panel hf-ui', role: 'dialog', 'aria-modal': 'false', 'aria-label': 'Feelings and worlds', 'aria-hidden': 'true', 'data-hf': 'panel', inert: '' },
    h('div', { class: 'p-head' }, h('h2', {}, 'Your Hushfold'), closeBtn),
    h('div', { class: 'p-body' },
      h('section', {}, planEl,
        h('div', { class: 'hf-switcher' },
          h('button', { class: 'hf-btn', type: 'button', 'aria-label': 'Previous Mallow', onclick: () => onMallow?.(-1) }, hfIcon('prev')),
          h('div', { class: 'who' }, mallowImg, h('div', {}, mallowName, mallowTitle)),
          h('button', { class: 'hf-btn', type: 'button', 'aria-label': 'Next Mallow', onclick: () => onMallow?.(1) }, hfIcon('next')))),
      h('section', {}, h('h3', {}, 'How are you feeling?'), feelWrap),
      h('section', {}, h('h3', {}, 'What would help?'), intentWrap),
      h('section', {},
        h('h3', {}, 'Hushflow'),
        resumeBtn,
        h('div', { class: 'hf-actions' }, pauseBtn, stayBtn, finishBtn, favBtn),
        h('label', { class: 'hf-toggle' }, h('span', { class: 't' }, 'Auto-flow', h('small', {}, 'The next world begins by itself when one is complete.')), auto),
        flowNote),
      h('section', {}, h('div', { class: 'hf-links' },
        link('garden', 'Memory Garden', () => go('garden'), 'The skills you chose to keep'),
        link('library', 'More rituals', () => go('library'), 'The full library'),
        link('journey', 'Your journey', () => go('journey')),
        link('gear', 'Settings', () => go('settings')))),
      h('section', {}, h('button', { class: 'hf-support', type: 'button', onclick: () => (onSupport ? onSupport() : openSupport(app)) }, hfIcon('support'), 'Need support now?'),
        h('p', { class: 'fine' }, 'Pause, finish or switch whenever you like. Stopping never costs you anything.'))));
  root.append(el);

  function go(name, params) { api.close(); app.go(name, params); }

  async function act(kind) {
    // a running flow, or (when the director is not in this build) the shell's stub, which says so
    const flow = (await getFlow(false)) || (!(await flowAvailable()) ? await getFlow(true) : null);
    if (!flow) return;
    const st = flow.state || {};
    app.haptic('light');
    if (kind === 'pause') { if (onPause?.()) { api.update(); return; } if (isPaused(st)) flow?.resume?.(); else flow?.pause?.(); }
    else if (kind === 'stay') flow?.stay?.();
    else if (kind === 'finish') { flow?.finish?.(); api.close(); return; }
    else if (kind === 'favourite') {
      if (st.worldId) {
        const on = !isFav(flow, st.worldId);
        // the director keeps favourites with its rotation; flow-store is the shell's own copy
        if (typeof flow.setFavourite === 'function') flow.setFavourite(st.worldId, on);
        if (on !== isFavouriteWorld(store, st.worldId)) toggleFavouriteWorld(store, st.worldId);
        app.toast(on ? 'Saved as a favourite world' : 'Removed from favourite worlds');
      } else flow?.stay?.();
    }
    api.update();
  }

  const isPaused = (st) => !!(st.paused || st.status === 'paused' || st.phase === 'paused');
  const isFav = (flow, id) => (Array.isArray(flow?.favourites) ? flow.favourites.includes(id) : isFavouriteWorld(store, id));

  function chip(label, pressed, onclick) {
    return h('button', { class: 'hf-opt', type: 'button', 'aria-pressed': String(!!pressed), onclick }, label);
  }

  const api = {
    el,
    get isOpen() { return isOpen; },
    /** Re-read Mallow, plan, feeling, intention and flow state. */
    async update() {
      const s = state();
      const m = MALLOWS[s.mallow] || MALLOWS.loomi;
      mallowImg.src = m.file; mallowName.textContent = m.name; mallowTitle.textContent = s.mallowWaiting ? 'With you after this world' : m.title;
      const tier = ent.tier();
      planEl.className = `plan${tier === 'paid' ? ' on' : tier === 'ultra' ? ' beyond' : ''}`;
      planEl.replaceChildren(tier === 'none' ? 'No plan yet · See plans' : (PLANS[tier]?.name || 'Your plan'));
      planEl.setAttribute('aria-label', tier === 'none' ? 'No plan yet. See the plans.' : `Your plan: ${PLANS[tier]?.name || tier}. See plans.`);
      feelWrap.replaceChildren(...QUICK_FEELINGS.map(([id, label]) => chip(label, s.emotion === id, () => onFeeling?.(s.emotion === id ? null : id))),
        chip(s.emotion && !QUICK_FEELINGS.some(([id]) => id === s.emotion) ? `${s.emotionName || 'Something else'} ✓` : 'Something else…', s.emotion && !QUICK_FEELINGS.some(([id]) => id === s.emotion), () => onFeeling?.('other')));
      intentWrap.replaceChildren(...INTENTIONS.map(([id, label]) => chip(label, s.intention === id, () => onIntention?.(s.intention === id ? null : id))));
      auto.checked = !!prefs.get('autoFlow');
      const flow = await getFlow(false);
      const st = flow?.state || {};
      const world = !!st.worldId;
      const stub = flow ? !!flow.stub : !(await flowAvailable());
      for (const b of [pauseBtn, stayBtn, finishBtn]) b.disabled = !world && !stub;
      favBtn.disabled = !world && !stub;
      const pz = pausedNow() ?? isPaused(st);
      pauseBtn.replaceChildren(hfIcon(pz ? 'play' : 'pause'), h('span', {}, pz ? 'Resume' : 'Pause'));
      pauseBtn.setAttribute('aria-pressed', String(!!pz));
      const fav = world && isFav(flow, st.worldId);
      favBtn.setAttribute('aria-pressed', String(!!fav));
      favBtn.replaceChildren(hfIcon('star', { filled: !!fav }), h('span', {}, fav ? 'Favourite' : 'Favourite world'));
      const saved = world ? null : await resumable().catch(() => null);
      resumeBtn.hidden = !saved;
      resumeTitle.textContent = saved ? `Pick up ${saved.title || 'your last world'} where you left off` : '';
      flowNote.textContent = world ? (st.title ? `Now: ${st.title}` : '')
        : stub ? 'The new worlds are still being built. The Mallows are ready to squish meanwhile.'
          : 'Worlds begin when you tell a Mallow what’s up.';
    },
    open() {
      if (isOpen) return;
      isOpen = true;
      opener = document.activeElement;
      el.classList.toggle('reduced', reduced());
      el.removeAttribute('inert'); el.setAttribute('aria-hidden', 'false');
      api.update();
      requestAnimationFrame(() => { el.classList.add('open'); });
      setTimeout(() => closeBtn.focus({ preventScroll: true }), reduced() ? 60 : 200);
      app.audio.ui('open');
    },
    close() {
      if (!isOpen) return;
      isOpen = false;
      el.classList.remove('open');
      el.setAttribute('aria-hidden', 'true'); el.setAttribute('inert', '');
      if (opener?.isConnected) opener.focus?.({ preventScroll: true });
      onClose?.();
    },
    toggle() { if (isOpen) api.close(); else api.open(); },
    destroy() { el.remove(); },
  };
  return api;
}
