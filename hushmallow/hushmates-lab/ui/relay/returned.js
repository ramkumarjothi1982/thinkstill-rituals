// RETURNED. Feelings that came home rest on a shelf of soft light.
//
// The homecoming (the first time): the sky softens, a distant orb drifts
// closer, your Mallow notices and catches it, and one petal of light unfurls
// for each person who saw it differently. Then the orb opens and the
// perspectives are revealed one at a time, each clearly labelled. You choose:
// keep or let go of each, save the journey, release the feeling, explore
// another angle, share a picture, or delete it.
// When nobody caught it, it says so kindly and offers another journey.

import { h, icon, fmtAgo } from '../dom.js';
import { face } from '../mallow.js';
import { MALLOWS } from '../mallows-data.js';
import { Orb, fly, centreIn } from '../orb.js';
import { play } from '../sound.js';
import { wait, reducedMotion, CSS_EASE, rise } from '../motion.js';
import { brandBar, dock, top, feelChip, feelColour, lights, reportSheet, errorText } from './common.js';
import { room, stage, handsOf, Speech, line, swapLine, put, privacySheet } from './parts.js';
import { humanProgress } from './journeys.js';

const homeList = (state) => state.journeys.filter((j) => j.status === 'returned' || j.status === 'released')
  .sort((a, b) => (a.seenReturn - b.seenReturn) || ((b.returnedAt || 0) - (a.returnedAt || 0)));
const caption = (j) => {
  if (j.status === 'released') return 'Released';
  if (j.returnReason === 'removed') return 'Brought home by our safety team';
  if (!j.humanCount) return j.mallowPetal || j.mallowExtra ? 'No one caught it · a Mallow’s perspective' : 'No one caught it this time';
  return humanProgress(j);
};

// ---------------------------------------------------------- the shelf --
export function returned(dev) {
  const me = dev.state.me;
  const mine = MALLOWS[me.profile.mallow] || MALLOWS.noomi;
  const list = homeList(dev.state);
  const now = dev.client.now();
  const orbs = [];
  const r = room(mine.id, 'hf-returned', { seed: 5 });
  let st = null;
  const items = list.map((j) => {
    const o = new Orb({ size: null, tint: feelColour(j.label), label: caption(j) });
    o.setPetals(j.petals || [], j.mallowPetal);
    orbs.push(o);
    const isNew = j.status === 'returned' && !j.seenReturn;
    return h('button', { type: 'button', class: `hf-shelf-item${isNew ? ' is-new' : ''}${j.status === 'released' ? ' is-released' : ''}`, dataset: { test: `returned-${j.id}` },
      onclick: () => dev.go('homecoming', { id: j.id }, { transition: isNew ? 'portal' : 'soft' }) },
    h('span', { class: 'hf-shelf-orb' }, o.el),
    isNew ? h('span', { class: 'hf-new' }, h('i', { 'aria-hidden': 'true' }), 'Came home') : null,
    h('span', { class: 'hf-shelf-text' }, j.text || 'A feeling you let go'),
    h('span', { class: 'hf-meta' }, caption(j)),
    h('span', { class: 'hf-shelf-foot' }, feelChip(j.label), j.saved ? h('span', { class: 'hf-saved' }, icon('heart'), 'Kept') : h('span', { class: 'hf-meta' }, fmtAgo(j.returnedAt || j.createdAt, now))));
  });
  if (!list.length) {
    st = stage(mine.id);
    const say = new Speech(mine.id);
    put(st.above, say.el);
    say.say('Nothing’s come home yet. I’ll be watching the sky.');
  }
  put(r.el,
    r.sky?.el,
    h('div', { class: 'hf-head' }, brandBar(dev)),
    h('div', { class: 'hf-scroll' },
      h('div', { class: 'hf-copy hf-copy--top' }, line('Back to you'),
        h('p', { class: 'hf-sub' }, list.length ? 'Feelings that found their way home.' : 'A feeling comes home after five human perspectives, or within a day.')),
      list.length ? h('div', { class: 'hf-shelf' }, items) : st.el),
    h('div', { class: 'rl-dock-slot' }, dock(dev, 'returned')));
  rise([...r.el.querySelectorAll('.hf-shelf-item')], { y: 16, stagger: 70 });
  return { el: r.el, mood: 'warm', live: true, destroy() { orbs.forEach((o) => o.destroy()); st?.destroy(); } };
}

// ------------------------------------------------------- homecoming --
export function homecoming(dev, { id, refresh } = {}) {
  const c = dev.client;
  let j = c.journey(id);
  if (!j) {
    const gone = h('div', { class: 'hm-scene hf-room' }, h('div', { class: 'hf-head' }, top(dev, { title: '', back: true })),
      h('div', { class: 'hf-scroll' }, h('div', { class: 'hf-copy hf-copy--top' }, line('This journey isn’t here any more.', { cls: 'hf-line--sm' }))));
    return { el: gone, mood: 'warm' };
  }
  const m = MALLOWS[j.mallow] || MALLOWS.noomi;
  const mem = (dev.memory.home ||= {});
  let alive = true;
  let playing = false;
  const cinematic = j.status === 'returned' && !j.seenReturn && !refresh;

  const r = room(m.id, `hf-home${cinematic ? ' is-cinematic' : ''}`, { seed: 5 });
  const head = h('div', { class: 'hf-head' });
  const content = h('div', { class: 'hf-scroll hf-home-scroll', dataset: { test: 'homecoming' } });
  const st = stage(m.id, { size: 'm' });
  const speech = new Speech(m.id);
  put(st.above, speech.el);
  const cineLine = h('p', { class: 'hf-line hf-line--moment', role: 'status', 'aria-live': 'polite' });
  const cineStage = stage(m.id);
  const cine = h('div', { class: 'hf-cine' }, h('div', { class: 'hf-moment' }, cineLine), cineStage.el);
  const flight = h('div', { class: 'rl-flight', 'aria-hidden': 'true' });
  r.el.append(head, content, cine, flight);
  const orb = new Orb({ size: null, tint: feelColour(j.label), label: caption(j) });
  orb.setPetals(j.petals || [], j.mallowPetal);

  // -------------------------------------------------------- the open view --
  function build({ withOrb = true } = {}) {
    j = c.journey(id) || j;
    const items = j.collection || [];
    const released = j.status === 'released';
    const humans = j.humanCount;
    const noOne = !released && humans === 0;
    const mallowItem = items.find((x) => x.kind === 'mallow') || null;
    const orbSlot = h('div', { class: 'hf-home-orb' });
    if (withOrb) orbSlot.append(orb.el);
    put(head, top(dev, { title: '', back: true }));

    const headline = released ? 'You let this feeling go.' : j.returnReason === 'removed' ? 'Your feeling came home early.' : 'Your feeling found its way home.';
    const sub = released ? (items.length || j.mallowExtra ? 'These are the perspectives you kept.' : 'Nothing was kept. It’s gone, gently.')
      : j.returnReason === 'removed' ? 'Our safety team brought it home.'
        : noOne ? 'No one caught it this time. Want to give it another journey?'
          : 'Here’s how others saw it.';
    const note = !released && humans > 0 && humans < j.of ? `${humans} ${humans === 1 ? 'Hushmate' : 'Hushmates'} caught it before it came home.`
      : !released && humans === j.of ? 'Five Hushmates saw it differently.' : null;

    const humanAndVisible = noOne ? [] : items;
    const pagerEl = humanAndVisible.length ? pager(humanAndVisible) : null;
    put(content, h('div', { class: 'hf-home-open', dataset: { test: 'homecoming-ready' } },
      orbSlot,
      h('div', { class: 'hf-copy' },
        h('h1', { class: 'hf-line', 'data-autofocus': '' }, headline),
        h('p', { class: 'hf-sub hf-sub--soft' }, sub)),
      !released && !noOne ? h('p', { class: 'hf-jorb-progress hf-home-progress' }, lights(j), h('span', {}, humanProgress(j))) : null,
      note ? h('p', { class: 'hf-note', dataset: { test: 'home-note' } }, note) : null,
      pagerEl,
      noOne ? zeroHuman(mallowItem) : null,
      j.mallowExtra ? extraSection(j.mallowExtra) : null,
      j.text ? h('details', { class: 'hf-sent' }, h('summary', {}, 'What you sent'), h('p', { class: 'hf-own-text' }, j.text), feelChip(j.label)) : null,
      noOne ? null : choices(released),
      h('p', { class: 'hf-hint' }, 'People who offered perspectives can’t see who you are or contact you, and you can’t contact them.')));
    return { orbSlot, slides: [...content.querySelectorAll('.hf-slide')] };
  }

  /** The perspectives, one at a time, like petals opening. */
  function pager(items) {
    let index = 0;
    const track = h('div', { class: 'hf-pager-track', tabindex: '0', 'aria-label': 'Perspectives that came back. Use the arrow keys to move between them.' });
    const slides = items.map((p, i) => slide(p, i, items.length));
    track.append(...slides);
    const dots = h('div', { class: 'hf-pager-dots' }, items.map((p, i) => h('button', {
      type: 'button', class: `hf-dot${p.kind === 'mallow' ? ' hf-dot--star' : ''}`, 'aria-label': `Perspective ${i + 1} of ${items.length}`,
      style: { '--dot': p.kind === 'human' ? (MALLOWS[p.mallow]?.body || '#A07BFF') : (MALLOWS[p.mallow]?.deep || '#8E6BFF') },
      onclick: () => go(i),
    }, p.kind === 'mallow' ? icon('star') : null)));
    const prev = h('button', { type: 'button', class: 'kit-round hf-pager-arrow', 'aria-label': 'Previous perspective', onclick: () => go(index - 1) }, icon('back'));
    const next = h('button', { type: 'button', class: 'kit-round hf-pager-arrow', 'aria-label': 'Next perspective', onclick: () => go(index + 1) }, icon('chevron'));
    const count = h('span', { class: 'hf-pager-count', 'aria-live': 'polite' });
    const go = (i) => {
      index = Math.max(0, Math.min(items.length - 1, i));
      track.scrollTo({ left: slides[index].offsetLeft - track.offsetLeft, behavior: reducedMotion() ? 'auto' : 'smooth' });
      sync();
    };
    const sync = () => {
      dots.querySelectorAll('.hf-dot').forEach((d, i) => d.setAttribute('aria-current', String(i === index)));
      prev.disabled = index === 0;
      next.disabled = index === items.length - 1;
      count.textContent = `${index + 1} of ${items.length}`;
    };
    let t = 0;
    track.addEventListener('scroll', () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const left = track.scrollLeft;
        let best = 0;
        slides.forEach((s, i) => { if (Math.abs(s.offsetLeft - track.offsetLeft - left) < Math.abs(slides[best].offsetLeft - track.offsetLeft - left)) best = i; });
        if (best !== index) { index = best; sync(); }
      }, 80);
    });
    track.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); }
    });
    sync();
    return h('section', { class: 'hf-pager', 'aria-label': 'Perspectives' }, track,
      items.length > 1 ? h('div', { class: 'hf-pager-nav' }, prev, dots, count, next) : null);
  }

  function sourceLine(p) {
    const lab = dev.env?.lab && p.kind === 'mallow' && p.source !== 'ai'
      ? h('span', { class: 'hf-lab-tag', dataset: { test: 'lab-source' } }, `Lab · ${({ library: 'Reframe library (rule-based)', demo: 'canned example' })[p.source] || p.source}`) : null;
    return h('p', { class: 'hf-slide-src', dataset: { test: 'persp-source' } },
      p.kind === 'human' ? h('i', { class: 'hf-src-dot', style: { '--dot': MALLOWS[p.mallow]?.body || '#A07BFF' }, 'aria-hidden': 'true' }) : face(p.mallow, { size: 22 }),
      h('span', {}, p.label), lab);
  }

  function slide(p, i, n) {
    return h('article', { class: `hf-slide hf-slide--${p.kind}${p.kept === false ? ' is-let-go' : ''}`, 'aria-label': `${i + 1} of ${n}: ${p.label}`, dataset: { test: 'perspective', kind: p.kind, source: p.source } },
      sourceLine(p),
      h('p', { class: 'hf-slide-text' }, p.text),
      h('div', { class: 'hf-slide-actions' },
        h('button', { type: 'button', class: 'hf-pill', 'aria-pressed': String(p.kept === true), dataset: { test: 'keep' }, onclick: () => keep(p, p.kept === true ? null : true) }, icon('heart'), p.kept === true ? 'Kept' : 'Keep this perspective'),
        h('button', { type: 'button', class: 'hf-pill hf-pill--go', 'aria-pressed': String(p.kept === false), dataset: { test: 'let-go' }, onclick: () => keep(p, p.kept === false ? null : false) }, p.kept === false ? 'Let go' : 'Let this perspective go'),
        h('button', { type: 'button', class: 'rl-more', 'aria-label': 'More: report or block', dataset: { test: 'persp-more' }, onclick: () => more(p) }, icon('more'))));
  }

  function extraSection(p) {
    return h('details', { class: 'hf-extra', dataset: { test: 'mallow-extra' } },
      h('summary', {}, face(p.mallow, { size: 22 }), `Your Mallow’s perspective, too`),
      h('p', { class: 'hf-hint' }, 'Five people answered, so this one waits here on its own. It isn’t counted as a person.'),
      slide(p, 0, 1));
  }

  function zeroHuman(mallowItem) {
    const canExplore = !mallowItem && j.status === 'returned' && j.fallback?.status !== 'failed' && j.fallback?.status !== 'pending' && j.returnReason !== 'removed';
    if (!mallowItem) speech.say(j.saved ? 'I’ll keep it here with you.' : 'Sometimes the sky is just quiet. It says nothing about you or your feeling.');
    const wrap = h('div', { class: 'hf-zero', dataset: { test: 'home-empty' } },
      mallowItem ? h('section', { class: 'hf-zero-mallow', 'aria-label': 'Your Mallow’s perspective' }, slide(mallowItem, 0, 1)) : st.el,
      h('div', { class: 'hf-actions' },
        j.canResend ? h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--block', dataset: { test: 'send-again' }, onclick: () => sendAgain() }, 'Send it out again')
          : h('p', { class: 'hf-note' }, j.resends ? 'It’s travelled a few times already.' : ''),
        h('button', { type: 'button', class: 'kit-btn kit-btn--ghost kit-btn--block', 'aria-pressed': String(!!j.saved), dataset: { test: 'keep-with-me' }, onclick: () => keepWithMe() }, j.saved ? 'Kept with you' : 'Keep it with me'),
        h('button', { type: 'button', class: 'kit-btn kit-btn--text kit-btn--block', dataset: { test: 'release-journey' }, onclick: () => letGo() }, 'Let it go'),
        canExplore ? h('button', { type: 'button', class: 'kit-btn kit-btn--text kit-btn--block', dataset: { test: 'explore-angle' }, onclick: () => explore() }, face(j.mallow, { size: 22 }), 'Explore another angle') : null,
        h('button', { type: 'button', class: 'kit-btn kit-btn--text kit-btn--block hf-danger', dataset: { test: 'delete-journey' }, onclick: () => remove() }, 'Delete my journey')));
    return wrap;
  }

  function choices(released) {
    const row = (test, ic, title, sub, onclick, extra = {}) => h('button', { type: 'button', class: `hf-choice${extra.cls ? ` ${extra.cls}` : ''}`, dataset: { test }, onclick, 'aria-pressed': extra.pressed }, icon(ic), h('span', {}, h('strong', {}, title), sub ? h('small', {}, sub) : null));
    const exploreAvailable = !released && j.fallback?.status === 'available';
    return h('section', { class: 'hf-choices-list', 'aria-label': 'What would you like to do with it?' },
      h('p', { class: 'kit-label' }, 'What would you like to do with it?'),
      released ? null : row('save-journey', 'heart', j.saved ? 'Saved' : 'Save my journey', 'Keep it here until you decide otherwise', () => save(), { pressed: String(!!j.saved), cls: j.saved ? 'is-on' : '' }),
      exploreAvailable ? row('explore-angle', 'sparkle', 'Explore another angle', 'Your Mallow offers one more way to see it', () => explore()) : null,
      row('share-journey', 'share', 'Share a picture', 'You choose what it shows', () => dev.go('share', { id })),
      released ? null : row('release-journey', 'sparkle', 'Release this feeling', 'Your words are cleared; what you kept stays', () => letGo()),
      row('delete-journey', 'trash', 'Delete my journey', 'Everything about it, for good', () => remove(), { cls: 'hf-choice--danger' }));
  }

  // ------------------------------------------------------------ actions --
  async function keep(p, value) {
    const res = await dev.run(() => c.act('choosePerspective', { journeyId: id, perspectiveId: p.id, keep: value }, ['journeys']));
    if (!res) return;
    if (value === true) { play('petal'); orb.glowPulse(); }
    rebuild();
  }
  function more(p) {
    const human = p.kind === 'human';
    dev.sheet({
      title: human ? 'About this perspective' : 'About this Mallow perspective',
      body: h('p', { class: 'hm-sheet-text' }, human
        ? 'If it was unkind, unsafe or shared personal details, report it to a person on our safety team. You can also make sure this person never reaches you again. They won’t be told.'
        : 'Mallow perspectives are automatically generated and can get things wrong. If this one was unhelpful or hurtful, report it and it disappears straight away.'),
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
    const res = await dev.run(() => c.act('reportPerspective', { journeyId: id, perspectiveId: p.id, reason: pick.reason }, ['journeys']));
    if (!res) return;
    dev.sheet({ title: 'Thank you for telling us', body: h('p', { class: 'hm-sheet-text', dataset: { test: 'report-received' } }, res.expectation),
      actions: [h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--block', onclick: () => dev.closeSheet() }, 'Okay')] });
    rebuild();
  }
  async function block(p) {
    dev.closeSheet();
    const ok = await dev.confirm({ title: 'Never reach you again?', text: 'This person’s perspectives will never reach you, and your feelings will never find them. Neither of you is told who the other is.', confirmLabel: 'Block' });
    if (!ok) return;
    const res = await dev.run(() => c.act('blockContributor', { journeyId: id, perspectiveId: p.id }, ['journeys']), { ok: 'Done. They won’t reach you again.' });
    if (res) rebuild();
  }
  async function save() {
    const res = await dev.run(() => c.act('saveJourney', { journeyId: id, saved: !j.saved }, ['journeys']));
    if (res) rebuild();
  }
  async function keepWithMe() {
    if (j.saved) return;
    const res = await dev.run(() => c.act('saveJourney', { journeyId: id, saved: true }, ['journeys']));
    if (!res) return;
    play('petal');
    rebuild();
  }
  async function letGo() {
    const ok = await dev.confirm({ title: 'Release this feeling?', text: 'Your words are cleared for good. Any perspectives you chose to keep stay with you.', confirmLabel: 'Release it' });
    if (!ok) return;
    play('release');
    const res = await dev.run(() => c.act('releaseJourney', { journeyId: id }));
    if (!res) return;
    if (!reducedMotion() && orb.el.isConnected) {
      orb.el.animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(-160px) scale(.3)', opacity: 0 }], { duration: 1600, easing: 'cubic-bezier(.55,0,.6,1)', fill: 'forwards' });
      await wait(1500);
      orb.el.getAnimations().forEach((a) => a.cancel());
    }
    if (!alive) return;
    rebuild();
  }
  async function remove() {
    const ok = await dev.confirm({ title: 'Delete this journey?', text: 'Your words and every perspective on it are deleted, including any you kept. This can’t be undone.', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    const res = await dev.run(() => c.act('deleteJourney', { journeyId: id, confirm: 'DELETE' }), { ok: 'Deleted.' });
    if (res) dev.go('returned', {}, { replace: true, back: true });
  }
  async function sendAgain() {
    mem[id] ||= c.newId();
    let res;
    try { res = await c.act('resendJourney', { journeyId: id, clientId: mem[id] }); } catch (e) { dev.toast(errorText(e), { tone: 'warn', ms: 4200 }); return; }
    delete mem[id];
    if (res.status === 'support') { dev.go('support', { support: res.support, level: res.level }); return; }
    play('release');
    if (!reducedMotion() && orb.el.isConnected) {
      orb.ripple({ colour: m.glow });
      orb.el.animate([{ transform: 'none' }, { transform: 'translateY(-200px) scale(.25)', opacity: 0 }], { duration: 1800, easing: 'cubic-bezier(.55,0,.6,1)', fill: 'forwards' });
    }
    const h1 = content.querySelector('.hf-line');
    swapLine(h1, 'It’s on its way again.');
    await wait(reducedMotion() ? 300 : 1700);
    if (alive) dev.go('journeys', {}, { replace: true });
  }
  async function explore() {
    const fm = MALLOWS[j.mallow] || MALLOWS.noomi;
    const needsConsent = !j.allowFallback;
    const ok = await dev.confirm({
      title: `Ask ${fm.name} for another angle?`, art: face(fm.id, { size: 64, float: true }),
      text: `${fm.name} will offer one automatically generated perspective. It isn’t written by a person. ${needsConsent ? 'To write it, your words are sent to an automated service.' : ''}`.trim(),
      confirmLabel: `Ask ${fm.name}`,
    });
    if (!ok) return;
    speech.say('Hmm… let me look at it another way.', { who: false });
    play('think');
    const res = await dev.run(() => c.act('askMallow', { journeyId: id, consent: true }));
    speech.say('');
    if (res?.fallback?.status === 'ready') { play('reveal'); orb.addStar(j.mallow); }
    rebuild();
    if (res?.fallback?.status === 'failed') dev.toast('Your Mallow couldn’t find the words this time.', { tone: 'warn' });
  }
  function rebuild() {
    if (!alive || playing) return;
    const top0 = content.scrollTop;
    j = c.journey(id) || j;
    orb.setPetals(j.petals || [], j.mallowPetal);
    build();
    content.scrollTop = top0;
  }

  // -------------------------------------------------------- the moment --
  async function moment() {
    playing = true;
    const rm = reducedMotion();
    put(head, h('header', { class: 'rl-top' }));
    content.classList.add('is-hidden');
    dev.atmo.set('dusk', { instant: false });
    r.sky?.pan(rm ? 0 : 340, { duration: 1 });
    await wait(rm ? 0 : 500);
    swapLine(cineLine, 'Something is coming home…');
    play('arrive');
    r.sky?.pan(0, { duration: rm ? 1 : 3400 });
    dev.atmo.set('warm');
    // a distant orb drifts closer; the Mallow notices it
    orb.setPetals([], null);
    const f = flight.getBoundingClientRect();
    const hands = handsOf(cineStage.mallow, flight, 110);
    const flyer = h('div', { class: 'rl-flyer rl-flyer--home' });
    flight.append(flyer);
    flyer.append(orb.el);
    setTimeout(() => { if (alive) { cineStage.mallow.notice(0); cineStage.mallow.reach(0.25); } }, rm ? 0 : 1700);
    if (rm) flyer.style.transform = `translate(${hands.x}px, ${hands.y}px) translate(-50%, -50%) scale(.8)`;
    else await fly(flyer, flight, { from: { x: f.width * 0.5 + 40, y: 70 }, to: hands, via: { x: f.width * 0.18, y: hands.y * 0.55 }, duration: 3000, scale: [0.12, 0.8], colour: feelColour(j.label) });
    if (!alive) return;
    // it floats into the Mallow's arms
    play('catch');
    cineStage.mallow.relax();
    cineStage.mallow.press(0.6, 0.22);
    orb.squeeze(0.6, 0.22);
    await wait(rm ? 0 : 260);
    cineStage.mallow.release();
    orb.release();
    cineStage.mallow.cheer(0.1);
    dev.atmo.bloom({ y: 0.6 });
    c.act('markReturnSeen', { journeyId: id }, []).catch(() => {});
    swapLine(cineLine, 'Your feeling found its way home.');
    // one petal of light for each person who saw it differently
    const petals = j.petals || [];
    await wait(rm ? 0 : 700);
    for (const p of petals) {
      if (!alive) return;
      play('petal');
      orb.addPetal(p.mallow);
      await wait(rm ? 0 : 420);
    }
    if (j.mallowPetal) { orb.addStar(j.mallowPetal.mallow); await wait(rm ? 0 : 400); }
    await wait(rm ? 300 : 900);
    if (!alive) return;
    // the orb rises and opens
    play('unfold');
    const { orbSlot, slides } = build({ withOrb: false });
    put(head, top(dev, { title: '', back: true }));
    content.scrollTop = 0;
    content.classList.remove('is-hidden');
    content.classList.add('is-unfolding');
    cine.animate([{ opacity: 1 }, { opacity: 0 }], { duration: rm ? 1 : 700, easing: CSS_EASE, fill: 'forwards' });
    await wait(30);
    const target = centreIn(orbSlot, flight);
    if (!rm) await fly(flyer, flight, { from: hands, to: target, duration: 1100, scale: [0.8, 1], trail: true, colour: feelColour(j.label) });
    if (!alive) return;
    orbSlot.append(orb.el);
    flyer.remove();
    cine.hidden = true;
    content.classList.remove('is-unfolding');
    orb.ripple({ colour: m.glow });
    const o = centreIn(orbSlot, flight);
    const reveal = [...content.querySelectorAll('.hf-home-open > :not(.hf-home-orb)')];
    reveal.forEach((node, i) => node.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { duration: rm ? 1 : 700, delay: rm ? 0 : 80 + i * 70, easing: CSS_EASE, fill: 'backwards' }));
    if (slides[0] && !rm) {
      const s = centreIn(slides[0], flight);
      slides[0].animate([{ opacity: 0, transform: `translate(${o.x - s.x}px, ${o.y - s.y}px) scale(.2)`, filter: 'blur(6px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 1000, delay: 200, easing: CSS_EASE, fill: 'backwards' });
    }
    await wait(rm ? 0 : 900);
    playing = false;
  }

  if (cinematic) queueMicrotask(() => moment().catch(() => { playing = false; }));
  else { cine.hidden = true; build(); }

  return {
    el: r.el, mood: cinematic ? 'dusk' : 'warm',
    update(s, detail) { if (detail?.journeys && !playing && !dev._sheet) rebuild(); },
    destroy() { alive = false; orb.destroy(); st.destroy(); cineStage.destroy(); },
  };
}
