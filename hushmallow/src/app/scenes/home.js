// HOME — the Hushfold. One living Mallow, one obvious place to start, and
// the Ultra entry. Nothing else competes for attention.
import { h, icon, iconBtn, say, clearBubble, wait } from '../ui.js';
import { MALLOWS, MALLOW_IDS } from '../../mallows/registry.js';
import { testPurchasesAllowed } from '../config.js';
import { RITUALS } from '../../data/rituals.js';
import { AVAILABLE } from '../../rituals/index.js';
import { allowedFor } from '../../engine/recommend.js';
import { titleCase } from '../../engine/tricks.js';
import { allTricks } from '../trick-launch.js';
import { playItem } from '../play-item.js';

const QUICK = [
  ['anger', 'Angry'], ['anxiety', 'Anxious'], ['sadness', 'Sad'], ['overwhelm', 'Overwhelmed'],
  ['loneliness', 'Lonely'], ['frustration', 'Frustrated'], ['embarrassment', 'Embarrassed'], ['joy', 'Happy'],
];

function mallowForNow() {
  const hr = new Date().getHours();
  if (hr >= 21 || hr < 6) return 'noomi';
  if (hr < 11) return 'boppo';
  if (hr < 17) return 'pipzi';
  return 'loomi';
}

export default function home(app, params = {}) {
  const { world, ent, prefs } = app;
  const id = app.state.homeMallow || mallowForNow();
  app.state.homeMallow = id;
  const m = MALLOWS[id];
  const subscribed = ent.has('paid');

  const nameEl = h('div', { class: 'eyebrow', style: { textAlign: 'center', marginTop: '4px', padding: '6px 12px', borderRadius: '999px',
    background: 'rgba(14,10,40,.5)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', color: 'var(--text-1)' } }, `${m.name} · ${m.title}`);
  const ask = h('button', { class: 'ask', 'data-focus': '', onclick: () => start() },
    h('span', {}, subscribed ? 'What’s on your mind?' : 'Start Hushmallow'), h('span', { class: 'go', 'aria-hidden': 'true' }, icon('arrow')));
  const quick = h('div', { class: 'chips scroll', role: 'group', 'aria-label': 'Quick feelings' },
    ...QUICK.map(([eid, label]) => h('button', { class: 'chip', onclick: () => start(eid) }, label)));
  const ultra = h('button', { class: 'ultra-card', onclick: () => openUltra(), 'aria-label': 'Hushmallow Ultra: Another Angle. See your thoughts in a different light.' },
    h('div', { class: 'spiral', 'aria-hidden': 'true' }),
    h('div', {}, h('span', { class: 'badge' }, 'ULTRA'), h('div', { class: 't' }, 'Another Angle'), h('div', { class: 's' }, 'See your thoughts in a different light.')));

  // TESTING ONLY (test hosts): step through every ritual, then every trick, in order
  const tester = subscribed && testPurchasesAllowed() ? testStepper(app) : null;

  const el = h('div', { class: 'home', style: { display: 'flex', flexDirection: 'column', height: '100%' } },
    h('div', { class: 'topbar' },
      h('div', { class: 'brand' }, h('span', { class: 'dot' }), 'Hushmallow'), h('div', { class: 'grow' }),
      subscribed ? iconBtn('star', 'Saved rituals and tricks', () => { clearBubble(); app.go('library', { tab: 'saved' }); }) : null,
      subscribed ? iconBtn('library', 'Library: every ritual and trick', () => { clearBubble(); app.go('library'); }) : null,
      iconBtn('mallow', 'Meet the Mallows', () => app.go('mallows')),
      iconBtn('gear', 'Settings', () => app.go('settings'))),
    tester?.el,
    h('div', { style: { marginTop: '18px' } },
      h('h1', { class: 'hero' }, 'Your second brain', h('br'), 'for feelings.')),
    h('div', { class: 'spacer' }),
    h('div', { class: 'mallow-switch', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'none' } },
      h('button', { class: 'icon-btn', style: { pointerEvents: 'auto' }, 'aria-label': 'Previous Mallow', onclick: () => cycle(-1) }, icon('back')),
      nameEl,
      h('button', { class: 'icon-btn', style: { pointerEvents: 'auto', transform: 'scaleX(-1)' }, 'aria-label': 'Next Mallow', onclick: () => cycle(1) }, icon('back'))),
    h('div', { style: { display: 'grid', gap: '12px', marginTop: '14px' } }, ask, subscribed ? quick : null, ultra));

  function start(emotionId) {
    clearBubble();
    app.audio.ui('open');
    if (!ent.has('paid')) { app.go('plans', { reason: 'start' }); return; }
    app.go('express', { preset: emotionId });
  }
  function openUltra() {
    clearBubble();
    app.audio.ui('open');
    if (!ent.has('ultra')) { app.go('plans', { reason: 'ultra', focus: 'ultra' }); return; }
    app.go('angle', {});
  }
  async function cycle(dir) {
    const i = (MALLOW_IDS.indexOf(app.state.homeMallow) + dir + MALLOW_IDS.length) % MALLOW_IDS.length;
    const next = MALLOW_IDS[i];
    app.state.homeMallow = next;
    nameEl.textContent = `${MALLOWS[next].name} · ${MALLOWS[next].title}`;
    app.audio.ui('whoosh');
    clearBubble();
    await Promise.all([world.setRealm(MALLOWS[next].realm), world.setMallow(next)]);
    world.setStage('curious');
    say(world, MALLOWS[next].voice.hello[0], { who: MALLOWS[next].name, ms: 3000 });
    setTimeout(() => world.setStage('neutral'), 2600);
  }

  return {
    el,
    async enter() {
      world.dim(false);
      world.showMallow(true);
      world.place({ x: 50, y: 50, scale: 1 });
      await Promise.all([world.setRealm(m.realm), world.setMallow(id)]);
      world.setStage('neutral');
      world.rig?.on?.('react', ({ kind }) => { if (kind === 'doubleTap') app.haptic('pop'); });
      if (params.intro) {
        prefs.set('seenIntro', true);
        el.style.opacity = '0';
        el.style.transition = 'opacity 900ms var(--ease-out)';
        await wait(350);
        el.style.opacity = '1';
        world.react('doubleTap');
        say(world, `${m.voice.hello[0]}`, { who: m.name, ms: 3400 });
        await wait(800);
        say(world, 'Psst — you can poke me. Squeeze too. I don’t mind.', { who: m.name, ms: 3200 });
      } else {
        await wait(400);
        say(world, m.voice.hello[Math.floor(Math.random() * m.voice.hello.length)], { who: m.name, ms: 3000 });
      }
    },
    leave() { clearBubble(); },
  };
}

// ◀ n / total ▶ : plays item n of everything in the plan (rituals first, then
// tricks). Remembers the position, so after each one you come back and press ▶.
function testStepper(app) {
  const KEY = `test-step-${app.ent.tier()}`;
  let items = null;
  const label = h('div', { 'aria-live': 'polite', style: { flex: '1', minWidth: '0', textAlign: 'center', font: '600 13px var(--font-ui)', lineHeight: '1.25' } }, 'Test mode');
  const btn = (dir, text) => h('button', { class: 'icon-btn', 'aria-label': dir < 0 ? 'Test: play previous' : 'Test: play next', style: { flex: '0 0 auto', fontSize: '18px' }, onclick: () => step(dir) }, text);
  const el = h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', padding: '6px 8px', borderRadius: '999px',
    background: 'rgba(14,10,40,.62)', border: '1px dashed rgba(255,217,138,.6)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' } },
  btn(-1, '◀'), label, btn(1, '▶'));
  const pos = () => app.store.get(KEY, 0); // 0 = not started; n = last played (1-based)
  async function load() {
    if (items) return items;
    const rituals = RITUALS.filter((r) => allowedFor(r, app.ent.flags()) && AVAILABLE.has(r.module))
      .map((r) => ({ kind: 'ritual', id: r.id, ref: r, name: r.name }));
    let tricks = [];
    try { tricks = (await allTricks(app)).map((t) => ({ kind: 'trick', id: t.id, ref: t, name: `${t.ref} ${titleCase(t.title)}` })); } catch { /* no plan */ }
    items = [...rituals, ...tricks];
    return items;
  }
  async function show() {
    const xs = await load(); const n = pos();
    label.replaceChildren(h('div', { style: { color: '#ffd98a', letterSpacing: '.08em', fontSize: '11px' } }, `TEST · ${n} / ${xs.length}`),
      h('div', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, n ? `Last: ${xs[n - 1]?.name || ''}` : 'Press ▶ to play the first one'));
  }
  async function step(dir) {
    const xs = await load(); if (!xs.length) return;
    const n = Math.min(xs.length, Math.max(1, pos() + dir));
    app.store.set(KEY, n);
    playItem(app, xs[n - 1]);
  }
  show();
  return { el };
}

