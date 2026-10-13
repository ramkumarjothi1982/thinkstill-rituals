// RETURNED: feelings that came home. The first time, it's a moment: the sky
// settles, the orb drifts down, your Mallow catches it, and it unfolds into
// the perspectives it gathered (up to five, each labelled with where it came
// from). Then you choose: keep or let go of each, save the journey, release
// the feeling, delete it, share a picture of it, or explore another angle.

import { h, icon, fmtAgo } from '../dom.js';
import { eyebrow, headline, pillow } from '../kit.js';
import { Mallow, face } from '../mallow.js';
import { MALLOWS } from '../mallows-data.js';
import { Orb, fly, centreIn } from '../orb.js';
import { Sky } from '../sky.js';
import { play } from '../sound.js';
import { wait, reducedMotion, CSS_EASE } from '../motion.js';
import { brandBar, dock, top, feelChip, feelColour, lights, progressText, perspective, reportSheet } from './common.js';

const REASON = {
  complete: 'Five perspectives found',
  expired: 'Came home after a day',
  withdrawn: 'You brought it home',
  removed: 'Brought home by our safety team',
};
const homeList = (state) => state.journeys.filter((j) => j.status === 'returned' || j.status === 'released')
  .sort((a, b) => (a.seenReturn - b.seenReturn) || ((b.returnedAt || 0) - (a.returnedAt || 0)));

// ---------------------------------------------------------- the list --
export function returned(dev) {
  const list = homeList(dev.state);
  const now = dev.client.now();
  const orbs = [];
  const rows = list.map((j) => {
    const o = new Orb({ size: null, tint: feelColour(j.label), label: progressText(j) });
    o.setPetals(j.petals || [], j.mallowPetal);
    orbs.push(o);
    const isNew = j.status === 'returned' && !j.seenReturn;
    return h('button', { type: 'button', class: `rl-jrow${isNew ? ' is-new' : ''}`, dataset: { test: `returned-${j.id}` }, onclick: () => dev.go('homecoming', { id: j.id }, { transition: isNew ? 'portal' : 'soft' }) },
      h('span', { class: 'rl-jrow-orb' }, o.el),
      h('span', { class: 'rl-jrow-main' },
        isNew ? h('span', { class: 'rl-new' }, h('i', { 'aria-hidden': 'true' }), 'Came home') : null,
        h('span', { class: 'rl-jrow-text' }, j.text || 'A feeling you released'),
        h('span', { class: 'rl-jrow-meta' }, lights(j), h('span', { class: 'rl-meta' }, j.status === 'released' ? 'Released' : REASON[j.returnReason] || 'Home')),
        h('span', { class: 'rl-jrow-meta' }, feelChip(j.label), j.saved ? h('span', { class: 'rl-saved' }, icon('heart'), 'Saved') : null,
          h('span', { class: 'rl-meta' }, fmtAgo(j.returnedAt || j.createdAt, now)))),
      icon('chevron'));
  });
  const el = h('div', { class: 'hm-scene rl-scene rl-returned' },
    h('div', { class: 'rl-head-slot' }, brandBar(dev)),
    h('div', { class: 'hm-scroll rl-list-scroll' },
      h('div', { class: 'rl-list-head' },
        eyebrow('Returned'),
        headline('h1', 'Back to', 'you', { grad: 'warm', cls: 'kit-title--md' }),
        h('p', { class: 'kit-body' }, list.length ? 'Feelings that found their way home, with the perspectives they gathered.' : 'Nothing has come home yet. A feeling comes home after five perspectives, or within a day.')),
      list.length ? h('div', { class: 'rl-jlist' }, rows) : null),
    h('div', { class: 'rl-dock-slot' }, dock(dev, 'returned')));
  return { el, mood: 'warm', live: true, destroy() { orbs.forEach((o) => o.destroy()); } };
}

// ------------------------------------------------------- homecoming --
export function homecoming(dev, { id, refresh } = {}) {
  const c = dev.client;
  let j = c.journey(id);
  if (!j) {
    return { el: h('div', { class: 'hm-scene rl-scene' }, h('div', { class: 'rl-head-slot' }, top(dev, { title: 'Returned', back: true })),
      h('div', { class: 'rl-hero' }, h('h1', { class: 'kit-title kit-title--sm', 'data-autofocus': '' }, 'This journey isn’t here any more.'))), mood: 'warm' };
  }
  const me = dev.state.me;
  const mine = MALLOWS[me.profile.mallow] || MALLOWS.noomi;
  let alive = true;
  let playing = false;
  const cinematic = j.status === 'returned' && !j.seenReturn && !refresh;

  const sky = new Sky({ seed: 5 });
  const head = h('div', { class: 'rl-head-slot' });
  const content = h('div', { class: 'hm-scroll rl-home-scroll' });
  const copy = h('div', { class: 'rl-cine-copy', role: 'status', 'aria-live': 'polite' });
  const mallow = new Mallow(mine.id, { interactive: true, eager: true, label: `Squeeze ${mine.name}`, onSqueeze: () => play('squish') });
  const stage = h('div', { class: 'rl-cine-stage' }, h('div', { class: 'rl-stage-ground' }, pillow('rl-pillow'), h('div', { class: 'rl-stage-mallow' }, mallow.el)));
  const cine = h('div', { class: 'rl-cine', 'aria-hidden': 'false' }, copy, stage);
  const flight = h('div', { class: 'rl-flight', 'aria-hidden': 'true' });
  const el = h('div', { class: `hm-scene rl-scene rl-home${cinematic ? ' is-cinematic' : ''}`, dataset: { test: 'homecoming' } }, sky.el, head, content, cine, flight);
  const orb = new Orb({ size: null, tint: feelColour(j.label), label: progressText(j) });
  orb.setPetals(j.petals || [], j.mallowPetal);

  // ------------------------------------------------------ the open view --
  function build({ withOrb = true } = {}) {
    j = c.journey(id) || j;
    const items = j.collection || [];
    const released = j.status === 'released';
    const fallback = j.fallback || {};
    const orbSlot = h('div', { class: 'rl-home-orb' });
    if (withOrb) orbSlot.append(orb.el);          // during the moment, the orb is still in flight
    head.replaceChildren(top(dev, { title: released ? 'Released' : 'Came home', back: true }));
    const list = items.map((p) => perspective(p, { onKeep: keep, onMore: more }));
    const canExplore = !released && fallback.status === 'available';
    content.replaceChildren(h('div', { class: 'rl-home-open', dataset: { test: 'homecoming-ready' } },
      orbSlot,
      h('h1', { class: 'kit-title kit-title--md rl-center', 'data-autofocus': '' }, released
        ? 'You let this feeling go.'
        : ['Your feeling found its way ', h('em', { class: 'kit-grad kit-grad--warm' }, 'home.')]),
      h('p', { class: 'kit-support rl-center' }, released ? 'These are the perspectives you kept.'
        : j.humanCount ? 'Here’s how others saw it.'
          : items.length ? `Nobody caught it this time, but ${MALLOWS[items[0].mallow]?.name || 'a Mallow'} offered a thought.` : 'It came home quietly this time.'),
      h('p', { class: 'rl-home-summary' }, lights(j), h('span', {}, `${j.humanCount} of ${j.of} from people${j.mallowPetal ? ' · plus a Mallow’s' : ''}`), h('span', { class: 'rl-meta' }, released ? '' : REASON[j.returnReason] || '')),
      j.text ? h('details', { class: 'rl-sent' }, h('summary', {}, 'What you sent'), h('p', { class: 'rl-quote' }, j.text), feelChip(j.label)) : null,
      items.length ? h('div', { class: 'rl-home-list' }, list)
        : h('div', { class: 'rl-card', dataset: { test: 'home-empty' } }, h('h3', {}, 'No perspectives arrived this time'),
          h('p', {}, 'Nobody caught it before it came home. That says nothing about you or your feeling: sometimes the sky is just quiet.')),
      canExplore ? h('button', { type: 'button', class: 'kit-btn kit-btn--ghost kit-btn--block', dataset: { test: 'explore-angle' }, onclick: () => explore() }, face(fallback.mallow, { size: 26 }), 'Explore another angle') : null,
      h('section', { class: 'rl-choose', 'aria-label': 'What would you like to do with it?' },
        h('p', { class: 'kit-label' }, 'What would you like to do with it?'),
        released ? null : h('button', { type: 'button', class: `rl-choice${j.saved ? ' is-on' : ''}`, 'aria-pressed': String(!!j.saved), dataset: { test: 'save-journey' }, onclick: () => save() },
          icon('heart'), h('span', {}, h('strong', {}, j.saved ? 'Saved' : 'Save my journey'), h('small', {}, 'Keep it here until you decide otherwise'))),
        h('button', { type: 'button', class: 'rl-choice', dataset: { test: 'share-journey' }, onclick: () => dev.go('share', { id }) },
          icon('share'), h('span', {}, h('strong', {}, 'Share a picture of it'), h('small', {}, 'Emotion and light only: never anyone’s words'))),
        released ? null : h('button', { type: 'button', class: 'rl-choice', dataset: { test: 'release-journey' }, onclick: () => letGo() },
          icon('sparkle'), h('span', {}, h('strong', {}, 'Release this feeling'), h('small', {}, 'Your words are cleared; perspectives you kept stay'))),
        h('button', { type: 'button', class: 'rl-choice rl-choice--danger', dataset: { test: 'delete-journey' }, onclick: () => remove() },
          icon('trash'), h('span', {}, h('strong', {}, 'Delete my journey'), h('small', {}, 'Everything about it, for good')))),
      h('p', { class: 'kit-note rl-center rl-home-privacy' }, 'People who offered perspectives can’t see who you are or contact you, and you can’t contact them.')));
    return { orbSlot, list };
  }

  async function keep(p, value) {
    const r = await dev.run(() => c.act('choosePerspective', { journeyId: id, perspectiveId: p.id, keep: value }, ['journeys']));
    if (r) { if (value === true) play('petal'); rebuild(); }
  }
  function more(p) {
    const human = p.kind === 'human';
    dev.sheet({
      title: human ? 'About this perspective' : 'About this Mallow perspective',
      body: h('p', { class: 'hm-sheet-text' }, human
        ? 'If it was unkind, unsafe or shared personal details, report it to a person on our safety team. You can also make sure this person never reaches you again. They won’t be told.'
        : 'Mallow perspectives can get things wrong. If this one was unhelpful or hurtful, report it and it disappears straight away.'),
      actions: [
        h('button', { type: 'button', class: 'kit-btn kit-btn--ghost kit-btn--block', dataset: { test: 'report-perspective' }, onclick: () => report(p) }, icon('flag'), 'Report it'),
        human ? h('button', { type: 'button', class: 'kit-btn kit-btn--ghost kit-btn--block', dataset: { test: 'block-contributor' }, onclick: () => block(p) }, icon('block'), 'Never reach me again') : null,
        h('button', { type: 'button', class: 'kit-btn kit-btn--text kit-btn--block', onclick: () => dev.closeSheet() }, 'Cancel'),
      ].filter(Boolean),
    });
  }
  async function report(p) {
    const pick = await reportSheet(dev, { title: 'Report this perspective', intro: 'What best describes it? It disappears from your collection straight away.' });
    if (!pick) return;
    const r = await dev.run(() => c.act('reportPerspective', { journeyId: id, perspectiveId: p.id, reason: pick.reason }, ['journeys']));
    if (!r) return;
    dev.sheet({ title: 'Thank you for telling us', body: h('p', { class: 'hm-sheet-text', dataset: { test: 'report-received' } }, r.expectation),
      actions: [h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--block', onclick: () => dev.closeSheet() }, 'Okay')] });
    rebuild();
  }
  async function block(p) {
    dev.closeSheet();
    const ok = await dev.confirm({ title: 'Never reach you again?', text: 'This person’s perspectives will never reach you, and your feelings will never find them. Neither of you is told who the other is.', confirmLabel: 'Block' });
    if (!ok) return;
    const r = await dev.run(() => c.act('blockContributor', { journeyId: id, perspectiveId: p.id }, ['journeys']), { ok: 'Done. They won’t reach you again.' });
    if (r) rebuild();
  }
  async function save() {
    const r = await dev.run(() => c.act('saveJourney', { journeyId: id, saved: !j.saved }, ['journeys']));
    if (r) rebuild();
  }
  async function letGo() {
    const ok = await dev.confirm({ title: 'Release this feeling?', text: 'Your words are cleared and it leaves your list of journeys’ words for good. Any perspectives you chose to keep stay with you.', confirmLabel: 'Release it' });
    if (!ok) return;
    play('release');
    const r = await dev.run(() => c.act('releaseJourney', { journeyId: id }), { ok: 'Released. What you kept stays with you.' });
    if (r) rebuild();
  }
  async function remove() {
    const ok = await dev.confirm({ title: 'Delete this journey?', text: 'Your words and every perspective on it are deleted, including any you kept. This can’t be undone.', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    const r = await dev.run(() => c.act('deleteJourney', { journeyId: id, confirm: 'DELETE' }), { ok: 'Deleted.' });
    if (r) dev.go('returned', {}, { replace: true, back: true });
  }
  async function explore() {
    const fm = MALLOWS[j.fallback.mallow] || MALLOWS.loomi;
    const ok = await dev.confirm({
      title: `Ask ${fm.name} for another angle?`, art: face(fm.id, { size: 64, float: true }),
      text: `Your words will be sent to an AI service for one Mallow perspective. It will be labelled as a Mallow’s, never as a person’s.${dev.env?.mallowNote ? ` ${dev.env.mallowNote}` : ''}`,
      confirmLabel: `Ask ${fm.name}`,
    });
    if (!ok) return;
    const r = await dev.run(() => c.act('askMallow', { journeyId: id }));
    if (r?.fallback?.status === 'ready') play('petal');
    rebuild();
  }
  function rebuild() {
    if (!alive || playing) return;
    const top0 = content.scrollTop;
    j = c.journey(id) || j;
    orb.setPetals(j.petals || [], j.mallowPetal);
    build();
    content.scrollTop = top0;
  }

  // ------------------------------------------------------- the moment --
  async function moment() {
    playing = true;
    const rm = reducedMotion();
    head.replaceChildren(h('header', { class: 'rl-top' }));
    content.classList.add('is-hidden');
    const say = (big, small = '') => {
      copy.replaceChildren(...[big ? h('p', { class: 'rl-cine-big' }, big) : null, small ? h('p', { class: 'rl-cine-small' }, small) : null].filter(Boolean));
      copy.firstChild?.animate([{ opacity: 0, transform: 'translateY(10px)', filter: 'blur(5px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 800, easing: CSS_EASE, fill: 'backwards' });
    };
    dev.atmo.set('dusk', { instant: false });
    if (!rm) sky.pan(320, { duration: 1 });
    await wait(rm ? 0 : 500);
    say('', 'Something is coming home…');
    play('arrive');
    if (!rm) sky.pan(0, { duration: 3000 });
    dev.atmo.set('warm');
    // the orb drifts down into the Mallow's arms
    const m = mallow.el.getBoundingClientRect();
    const f = flight.getBoundingClientRect();
    const hands = { x: m.left - f.left + m.width / 2, y: m.top - f.top - m.width * 0.22 };   // held just above its head
    const flyer = h('div', { class: 'rl-flyer rl-flyer--home' });
    flight.append(flyer);
    flyer.append(orb.el);
    if (rm) flyer.style.transform = `translate(${hands.x}px, ${hands.y}px) translate(-50%, -50%) scale(.7)`;
    else await fly(flyer, flight, { from: { x: hands.x - 60, y: -130 }, to: hands, via: { x: hands.x + 110, y: hands.y * 0.35 }, duration: 2600, scale: [0.35, 0.7], colour: feelColour(j.label) });
    if (!alive) return;
    play('catch');
    mallow.press(0.7, 0.25);
    orb.squeeze(0.7, 0.25);
    await wait(rm ? 0 : 280);
    mallow.release();
    orb.release();
    mallow.cheer(0.1);
    dev.atmo.bloom({ y: 0.62 });
    say('Your feeling found its way home.');
    c.act('markReturnSeen', { journeyId: id }, []).catch(() => {});
    await wait(rm ? 600 : 1900);
    if (!alive) return;
    // it rises and unfolds into what it gathered
    copy.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(-8px)' }], { duration: 500, easing: CSS_EASE, fill: 'forwards' });
    play('unfold');
    const { orbSlot, list } = build({ withOrb: false });
    head.firstChild?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600, fill: 'backwards' });
    content.scrollTop = 0;
    content.classList.remove('is-hidden');
    content.classList.add('is-unfolding');
    await wait(30);
    const target = centreIn(orbSlot, flight);
    if (!rm) {
      stage.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(40px)' }], { duration: 900, easing: CSS_EASE, fill: 'forwards' });
      await fly(flyer, flight, { from: hands, to: target, duration: 1100, scale: [0.7, 1], trail: true, colour: feelColour(j.label) });
    }
    if (!alive) return;
    orbSlot.append(orb.unfreeze().el);
    flyer.remove();
    cine.hidden = true;
    content.classList.remove('is-unfolding');
    // each perspective opens out of the orb
    const o = centreIn(orbSlot, flight);
    list.forEach((card, i) => {
      if (rm) { card.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: i * 80, fill: 'backwards' }); return; }
      const r = centreIn(card, flight);
      card.animate([
        { opacity: 0, transform: `translate(${o.x - r.x}px, ${o.y - r.y}px) scale(.18)`, filter: 'blur(6px)' },
        { opacity: 1, transform: 'none', filter: 'blur(0)' },
      ], { duration: 1000, delay: 120 + i * 220, easing: CSS_EASE, fill: 'backwards' });
    });
    await wait(rm ? 0 : 400 + list.length * 220);
    playing = false;
  }

  if (cinematic) {
    queueMicrotask(() => moment().catch(() => { playing = false; }));
  } else {
    cine.hidden = true;
    build();
  }

  return {
    el, mood: cinematic ? 'dusk' : 'warm',
    update(s, detail) { if (detail?.journeys && !playing) rebuild(); },
    destroy() { alive = false; mallow.destroy(); orb.destroy(); },
  };
}
