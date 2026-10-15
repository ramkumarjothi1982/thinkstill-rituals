// MEET THE MALLOWS — the seven characters, their realms, favourites.
import { h, iconBtn, say, clearBubble } from '../ui.js';
import { MALLOWS, MALLOW_IDS } from '../../mallows/registry.js';
import { RITUALS } from '../../data/rituals.js';

const REALM_NAMES = {
  'static-storm': 'The Static Storm', 'raindrop-lagoon': 'The Raindrop Lagoon', 'spiral-observatory': 'The Spiral Observatory',
  'sunpop-orchard': 'The Sunpop Orchard', 'spark-festival': 'The Spark Festival', 'blue-drift': 'The Blue Drift', 'moonmilk-cove': 'The Moonmilk Cove',
};

export default function mallows(app) {
  const { world, rec } = app;
  const favs = rec.favourites().map((id) => RITUALS.find((r) => r.id === id)).filter(Boolean);
  const grid = h('div', { class: 'mallow-grid' }, ...MALLOW_IDS.map((id) => {
    const m = MALLOWS[id];
    return h('button', { class: 'mallow-tile', onclick: () => meet(id) },
      h('img', { src: m.file, alt: '' }), h('b', {}, m.name), h('span', {}, m.title), h('span', {}, REALM_NAMES[m.realm]));
  }));
  const el = h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%' } },
    h('div', { class: 'topbar' }, iconBtn('back', 'Back', () => app.back()), h('div', { class: 'grow' })),
    h('div', { class: 'card', style: { marginTop: '8px', overflowY: 'auto', maxHeight: 'calc(100dvh - 110px)' } },
      h('h1', { class: 'title' }, 'The Mallows'),
      h('p', { class: 'muted', style: { margin: '6px 0 16px' } }, 'Tap one to visit its realm. Poke, squeeze and drag them — they’re soft.'),
      grid,
      h('div', { class: 'eyebrow', style: { marginTop: '18px' } }, 'Your favourite rituals'),
      favs.length ? h('div', { style: { display: 'grid', gap: '8px', marginTop: '8px' } }, ...favs.map((r) => h('button', { class: 'choice', onclick: () => { app.state.ritual = r; app.state.input ||= { text: '', emotions: [], intensity: 0.7 }; app.go('ritual', { id: r.id }); } }, `★ ${r.name} · with ${MALLOWS[r.mallows[0]].name}`)))
        : h('p', { class: 'muted' }, 'Save a ritual with ★ after you finish it and it’ll live here.')));

  async function meet(id) {
    app.state.homeMallow = id;
    app.go('home');
  }
  // the cards are the Mallows here: the live one steps aside rather than show
  // through the glass behind the title
  return { el, title: 'The Mallows', enter() { world.dim(true); world.showMallow?.(false); world.place({ x: 50, y: 12, scale: 0.4 }); clearBubble(); }, leave() { world.showMallow?.(true); } };
}
