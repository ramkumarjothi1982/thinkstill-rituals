// HOME (classic) — one living Mallow, one obvious place to start, and the
// Another Angle entry (hushmallow Beyond). Nothing else competes for attention.
import { h, icon, iconBtn, say, clearBubble, wait, fitMallow } from '../ui.js';
import { MALLOWS, MALLOW_IDS } from '../../mallows/registry.js';
import { BRAND } from '../../brand.js';
import { logoImg } from '../../ui/type.js';

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
    background: 'rgba(14,10,40,.5)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', color: 'var(--text-1)',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: '0', maxWidth: '100%' } }, `${m.name} · ${m.title}`);
  const ask = h('button', { class: 'ask', 'data-focus': '', onclick: () => start() },
    h('span', {}, subscribed ? 'What’s on your mind?' : `Start ${BRAND.brandName}`), h('span', { class: 'go', 'aria-hidden': 'true' }, icon('arrow')));
  const quick = h('div', { class: 'chips scroll', role: 'group', 'aria-label': 'Quick feelings' },
    ...QUICK.map(([eid, label]) => h('button', { class: 'chip', onclick: () => start(eid) }, label)));
  const ultra = h('button', { class: 'ultra-card', onclick: () => openUltra(), 'aria-label': `Another Angle, part of ${BRAND.beyondPlanName}. ${BRAND.beyondTagline}` },
    h('div', { class: 'spiral', 'aria-hidden': 'true' }),
    h('div', {}, h('span', { class: 'badge' }, 'BEYOND'), h('div', { class: 't' }, 'Another Angle'), h('div', { class: 's' }, BRAND.beyondTagline)));

  const el = h('div', { class: 'home', style: { display: 'flex', flexDirection: 'column', height: '100%' } },
    h('div', { class: 'topbar' },
      h('div', { class: 'grow' }),
      subscribed ? iconBtn('journey', 'Your journey', () => { clearBubble(); app.go('journey'); }) : null,
      subscribed ? iconBtn('star', 'Saved rituals', () => { clearBubble(); app.go('library', { tab: 'saved' }); }) : null,
      subscribed ? iconBtn('library', 'Library: every ritual', () => { clearBubble(); app.go('library'); }) : null,
      iconBtn('mallow', 'Meet the Mallows', () => app.go('mallows')),
      iconBtn('gear', 'Settings', () => app.go('settings'))),
    h('div', { class: 'home-lockup' },
      h('h1', { class: 'home-logo' }, logoImg({ tone: 'light', width: 'min(64vw, 280px)' })),
      h('p', { class: 'home-tagline' }, BRAND.brandTagline)),
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

  // the Mallow's whole body between the lockup and the name pill, so the pill
  // and the ask field never cover its face (small phones, large text)
  const fit = () => requestAnimationFrame(() => {
    const top = el.querySelector('.home-lockup')?.getBoundingClientRect().bottom;
    const bottom = el.querySelector('.mallow-switch')?.getBoundingClientRect().top;
    if (top && bottom) fitMallow(world, top + 6, bottom - 4, { maxScale: 1, minPx: 96 });
  });

  return {
    el,
    async enter() {
      world.dim(false);
      world.showMallow(true);
      world.place({ x: 50, y: 50, scale: 1 });
      fit();
      addEventListener('resize', fit);
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
    leave() { clearBubble(); removeEventListener('resize', fit); },
  };
}

