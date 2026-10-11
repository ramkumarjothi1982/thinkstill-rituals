// NOTICE + FINISH — an optional check-in (no "success" required), what you
// did, and gentle ways to finish, repeat or try another ritual.
import { h, icon, say, clearBubble, toast, wait } from '../ui.js';
import { MALLOWS } from '../../mallows/registry.js';
import { openSupport } from './support.js';
import { playTrick } from '../trick-launch.js';

const CHECK = [
  ['lighter', 'A bit lighter'], ['same', 'About the same'], ['heavier', 'Heavier'],
];
// same meanings (helped / no change / didn't help), worded for good feelings
const CHECK_GLOW = [
  ['lighter', 'Glowing more'], ['same', 'About the same'], ['heavier', 'It’s faded a bit'],
];

export default function landing(app) {
  const { world, rec } = app;
  const res = app.state.result;
  const ritual = app.state.ritual;
  if (!res || !ritual) { queueMicrotask(() => app.go('home', {}, { replace: true })); return { el: h('div') }; }
  const lead = MALLOWS[ritual.mallows[0]];
  let fav = rec.isFavourite(ritual.id);
  const isTrick = ritual.module === 'quick-trick';

  // a good feeling isn't 'lighter' or 'heavier'; it glows more or less
  const options = ritual.family === 'celebration' ? CHECK_GLOW : CHECK;
  const checkRow = h('div', { class: 'chips', role: 'group', 'aria-label': ritual.checkIn, style: { justifyContent: 'center' } },
    ...options.map(([id, label]) => h('button', { class: 'chip', 'aria-pressed': 'false', onclick: (e) => check(id, e.currentTarget) }, label)));
  const favBtn = h('button', { class: 'btn', 'aria-pressed': String(fav), onclick: () => toggleFav() }, icon('star'), fav ? 'Saved' : 'Save');
  const summary = h('div', { class: 'summary-card' }, ...(res.summary || []).flatMap((l) => [h('div', { class: 'k' }, l.label), h('div', { class: 'v' }, l.text)]));

  const el = h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' } },
    h('div', { class: 'topbar' }, h('div', { class: 'brand' }, h('span', { class: 'dot' }), 'Hushmallow')),
    h('div', { style: { minHeight: '27dvh', flex: '0 0 auto' } }),
    h('div', { class: 'card', style: { textAlign: 'center' } },
      h('div', { class: 'eyebrow' }, 'Take a second to notice'),
      h('h3', { style: { margin: '8px 0 12px' } }, ritual.checkIn),
      checkRow,
      h('p', { class: 'muted', style: { margin: '10px 0 0' } }, 'Totally optional. Any answer is fine.')),
    h('div', { style: { display: 'grid', gap: '8px', marginTop: '12px' } },
      h('button', { class: 'btn primary block', onclick: () => finish() }, 'Finish'),
      h('div', { class: 'row-btns' },
        h('button', { class: 'btn', onclick: () => another() }, isTrick ? 'Another trick' : 'Another ritual'),
        favBtn,
        h('button', { class: 'btn', style: { flex: '0 0 56px' }, 'aria-label': 'Share a card (no personal words)', onclick: () => share() }, icon('share')))),
    h('div', { class: 'eyebrow', style: { margin: '18px 4px 8px' } }, 'What you did'),
    summary);

  async function check(id, btn) {
    checkRow.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === btn)));
    app.haptic('light');
    if (app.prefs.get('saveHistory')) rec.markCompleted(ritual.id, { helped: id === 'lighter' ? true : id === 'heavier' ? false : null });
    clearBubble();
    if (id === 'lighter') {
      world.setStage('celebrating');
      world.react('success');
      say(world, lead.voice.cheer[0], { who: lead.name, ms: 3000 });
    } else if (id === 'same') {
      world.setStage('comforting');
      say(world, 'That’s okay. Feelings don’t always move on cue. You still did something kind for yourself.', { who: lead.name, ms: 4200 });
    } else if (ritual.family === 'celebration') {
      world.setStage('comforting');
      say(world, 'Good feelings drift — that’s allowed. You can grow another one any time.', { who: lead.name, ms: 4200 });
    } else {
      world.setStage('concerned');
      world.react('comfort');
      say(world, 'Thank you for telling me. Want something gentler, or someone real to talk to?', { who: lead.name, ms: 4600 });
      await wait(900);
      el.querySelector('.card').append(h('button', { class: 'btn ghost block', style: { marginTop: '8px' }, onclick: () => openSupport(app) }, 'See support options'));
    }
  }
  function toggleFav() {
    fav = rec.toggleFavourite(ritual.id);
    favBtn.replaceChildren(icon('star'), fav ? 'Saved' : 'Save');
    favBtn.setAttribute('aria-pressed', String(fav));
    toast(fav ? 'Saved to your favourites' : 'Removed from favourites');
    app.haptic('light');
  }
  function finish() { app.state.result = null; app.go('home'); }
  function another() {
    if (isTrick) playTrick(app, { tier: ritual.tier === 'ultra' ? 'ultra' : (app.ent.has('ultra') ? null : 'paid'), exclude: [ritual.id] });
    else app.go('encounter', {});
  }

  async function share() {
    // privacy-safe: Mallow + ritual title only, never anything you typed
    const c = document.createElement('canvas');
    c.width = 1080; c.height = 1350;
    const g = c.getContext('2d');
    const bg = g.createLinearGradient(0, 0, 0, 1350);
    bg.addColorStop(0, '#1b1446'); bg.addColorStop(1, lead.colours.body);
    g.fillStyle = bg; g.fillRect(0, 0, 1080, 1350);
    const glow = g.createRadialGradient(540, 760, 50, 540, 760, 620);
    glow.addColorStop(0, lead.colours.glow + 'aa'); glow.addColorStop(1, 'transparent');
    g.fillStyle = glow; g.fillRect(0, 0, 1080, 1350);
    if (world.rig?.canvas) {
      const src = world.rig.canvas;
      const s = Math.min(900 / src.width, 760 / src.height);
      g.drawImage(src, 540 - (src.width * s) / 2, 380, src.width * s, src.height * s);
    }
    g.fillStyle = '#fff'; g.textAlign = 'center';
    g.font = '700 84px ui-rounded, "SF Pro Rounded", system-ui, sans-serif';
    g.fillText(res.share?.title || ritual.name, 540, 220);
    g.font = '600 44px ui-rounded, system-ui, sans-serif'; g.fillStyle = 'rgba(255,255,255,.85)';
    g.fillText(res.share?.subtitle || `A Mallow Moment with ${lead.name}`, 540, 300);
    g.font = '800 34px ui-rounded, system-ui, sans-serif'; g.fillStyle = '#ffd98a';
    g.fillText('HUSHMALLOW', 540, 1270);
    const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
    const file = new File([blob], 'hushmallow.png', { type: 'image/png' });
    try {
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: 'Hushmallow' }); return; }
    } catch { return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'hushmallow.png'; a.click();
    toast('Card saved. Nothing you typed is on it.');
  }

  return {
    el, title: 'Notice',
    enter() {
      world.dim(false);
      world.place({ x: 50, y: 22, scale: 0.62 });
      world.setStage('resting');
    },
    leave() { clearBubble(); },
  };
}
