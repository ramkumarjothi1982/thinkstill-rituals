// RITUAL HOST — frames any interaction module: leave button, progress, the
// current move's title, and a dock for controls. Stopping is always allowed.
import { h, iconBtn, openSheet, say, clearBubble, toast } from '../ui.js';
import { PAID_MODULES } from '../../rituals/index.js';
import { requireEntitlement, EntitlementError, loadUltra } from '../entitlements.js';
import { MALLOWS } from '../../mallows/registry.js';
import { markPlayed } from '../../engine/played.js';
import { createRound } from '../../engine/round.js';
import { logFinish } from '../../engine/journey.js';
import { getEmotion } from '../../data/emotions.js';

export default function ritualScene(app, params) {
  const { world } = app;
  const ritual = app.state.ritual;
  const ac = new AbortController();
  const dots = h('div', { class: 'progress-dots', 'aria-hidden': 'true' });
  const eyebrow = h('span', { class: 'eyebrow' });
  const titleEl = h('h2', { 'data-focus': '' });
  const promptEl = h('p');
  const dock = h('div', { class: 'dock', style: { display: 'grid', gap: '8px' } });
  const status = h('div', { class: 'sr-only', 'aria-live': 'polite' });
  const total = (ritual?.moves?.length || 4);
  const el = h('div', { class: 'ritual-ui' },
    h('div', { class: 'topbar' }, iconBtn('close', 'Leave ritual', () => confirmLeave()), dots, h('div', { style: { width: '44px' } })),
    h('div', { class: 'move-title' }, eyebrow, titleEl, promptEl),
    h('div', { class: 'spacer' }), dock, status);

  function setMove(i, { eyebrow: e = '', title = '', prompt = '' } = {}) {
    dots.replaceChildren(...Array.from({ length: Math.min(total, 5) }, (_, k) => h('i', { class: k === i ? 'on' : k < i ? 'done' : '' })));
    eyebrow.textContent = e;
    titleEl.textContent = title;
    promptEl.textContent = prompt;
    status.textContent = `${e}. ${title}. ${prompt}`;
  }

  function confirmLeave() {
    const s = openSheet({ title: 'Leave this ritual?', body: h('p', { style: { margin: 0, color: 'var(--text-2)' } }, 'No pressure. You can stop any time, and come back whenever.'),
      foot: h('div', { class: 'row-btns' }, h('button', { class: 'btn', onclick: () => s.close() }, 'Keep going'),
        h('button', { class: 'btn primary', onclick: () => { s.close(); ac.abort(); app.go('home'); } }, 'Leave')) });
  }

  async function run() {
    let mod;
    try {
      if (ritual.module === 'quick-trick') {
        // one player for both tiers; the trick's own tier is enforced here
        requireEntitlement(app.ent, ritual.tier || 'paid');
        mod = await import('../../rituals/quick-trick.js');
      } else if ((ritual.tier || 'paid') === 'ultra') {
        const ultra = await loadUltra(app.ent);   // throws without Ultra
        mod = { run: (c) => ultra.angle.run(c, ultra) };
      } else {
        requireEntitlement(app.ent, 'paid');
        mod = ritual.__load ? await ritual.__load() : await PAID_MODULES[ritual.module]();
      }
    } catch (e) {
      if (e instanceof EntitlementError) { app.go('plans', { reason: 'ritual' }, { replace: true }); return; }
      throw e;
    }
    const ctx = {
      world, audio: app.audio, haptic: app.haptic, setMove, dock, signal: ac.signal, ritual, input: app.state.input || { text: '', emotions: [], intensity: 0.7 },
      reducedMotion: app.prefs.reducedMotion(), lowStim: app.prefs.get('lowStim'), toast, app,
      say: (text, opts) => say(world, text, opts),
    };
    const lead = ritual.mallows[0];
    await Promise.all([world.setRealm(ritual.world.realm), world.setMallow(lead)]);
    if (ac.signal.aborted) return;
    // started = done for this round, wherever it was started from
    createRound(app.store, app.ent.tier()).mark(ritual.id);
    const t0 = Date.now();
    const result = await mod.run(ctx);
    if (ac.signal.aborted) return;
    app.state.result = { ...result, ritualId: ritual.id, seconds: Math.round((Date.now() - t0) / 1000) };
    if (result?.completed && app.prefs.get('saveHistory')) {
      markPlayed(app.store, ritual.id);
      // ids and feeling families only, never the person's words
      const fams = [...new Set((ctx.input.emotions || []).map((e) => getEmotion(e.id)?.family).filter(Boolean))];
      logFinish(app.store, { id: ritual.id, name: ritual.name, kind: ritual.module === 'quick-trick' ? 'trick' : 'ritual',
        mallow: ritual.mallows[0], families: fams, seconds: app.state.result.seconds });
    }
    app.go('landing', {}, { replace: true });
  }

  return {
    el, title: ritual?.name || 'Ritual',
    blockBack: () => confirmLeave(),
    enter() {
      if (!ritual) { app.go('home', {}, { replace: true }); return; }
      world.dim(false);
      setMove(0, { title: ritual.name });
      run().catch((e) => { console.error(e); toast('Something went wrong in this ritual. Sorry — try another?'); app.go('home'); });
    },
    leave() { ac.abort(); clearBubble(); world.fx.replaceChildren(); world.fx.classList.remove('live'); },
  };
}
