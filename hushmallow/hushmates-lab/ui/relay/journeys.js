// MY JOURNEYS. Your feelings while they travel, as orbs drifting in your sky:
// each wears one petal of light per person who has seen it differently
// ("3 of 5 human perspectives"), and comes home after five, or within a day.
// The words people offer stay sealed until it comes home.
//
// A journey up close: the orb above your Mallow. If you allowed it and nobody
// has caught it, your Mallow can offer another way to see it: the orb drifts
// down into its arms, it thinks, squeezes, and a new possibility unfolds,
// labelled as automatically generated. The feeling keeps travelling.

import { h, icon, fmtSpan, fmtAgo } from '../dom.js';
import { face } from '../mallow.js';
import { MALLOWS } from '../mallows-data.js';
import { Orb, fly, centreIn } from '../orb.js';
import { play } from '../sound.js';
import { wait, reducedMotion, rise, CSS_EASE } from '../motion.js';
import { PERSPECTIVE_LABELS } from '../../core/relay-config.js';
import { brandBar, dock, top, feelChip, feelColour, lights, errorText, supportBody } from './common.js';
import { room, stage, handsOf, Speech, line, swapLine, put, labSourceTag } from './parts.js';

export const humanProgress = (j) => `${j.humanCount} of ${j.of} human perspective${j.of === 1 ? '' : 's'}`;

// ---------------------------------------------------------- the list --
export function journeys(dev) {
  const me = dev.state.me;
  const mine = MALLOWS[me.profile.mallow] || MALLOWS.noomi;
  const travelling = dev.state.journeys.filter((j) => j.status === 'travelling');
  const now = dev.client.now();
  const orbs = [];
  const r = room(mine.id, 'hf-journeys', { seed: 21 });
  let st = null;
  const items = travelling.map((j, i) => {
    const o = new Orb({ size: null, tint: feelColour(j.label), label: humanProgress(j) });
    o.setPetals(j.petals || [], j.mallowPetal);
    orbs.push(o);
    const ask = j.fallback?.status === 'available';
    return h('button', { type: 'button', class: `hf-jorb${ask ? ' has-offer' : ''}`, style: { '--i': String(i) }, dataset: { test: `journey-${j.id}` }, onclick: () => dev.go('journey', { id: j.id }) },
      h('span', { class: 'hf-jorb-orb' }, o.el),
      h('span', { class: 'hf-jorb-cap' },
        h('span', { class: 'hf-jorb-text' }, j.text),
        h('span', { class: 'hf-jorb-progress' }, lights(j), h('span', {}, humanProgress(j))),
        h('span', { class: 'hf-meta' }, j.paused ? 'Paused for a safety review' : `Home within ${fmtSpan(j.expiresAt - now)}`),
        ask ? h('span', { class: 'hf-jorb-offer' }, face(j.fallback.mallow, { size: 20 }), `${MALLOWS[j.fallback.mallow]?.name} can offer another perspective`) : null));
  });
  if (!travelling.length) {
    st = stage(mine.id);
    const say = new Speech(mine.id);
    put(st.above, say.el);
    say.say('Nothing’s travelling right now. Whenever you’re ready.');
  }
  put(r.el,
    r.sky?.el,
    h('div', { class: 'hf-head' }, brandBar(dev)),
    h('div', { class: 'hf-scroll' },
      h('div', { class: 'hf-copy hf-copy--top' },
        line(travelling.length ? 'Still travelling' : 'My journeys'),
        h('p', { class: 'hf-sub' }, travelling.length
          ? 'Each comes home after five human perspectives, or within a day.'
          : 'When you release a feeling, you can follow it here.')),
      travelling.length ? h('div', { class: 'hf-constellation' }, items)
        : [st.el, h('div', { class: 'hf-actions' }, h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--block', dataset: { test: 'empty-release' }, onclick: () => dev.go('release', { compose: true }, { replace: true }) }, 'Release a feeling'))]),
    h('div', { class: 'rl-dock-slot' }, dock(dev, 'journeys')));
  rise([...r.el.querySelectorAll('.hf-jorb')], { y: 18, stagger: 110 });
  return { el: r.el, mood: 'sky', live: true, destroy() { orbs.forEach((o) => o.destroy()); st?.destroy(); } };
}

// -------------------------------------------------------- one journey --
const EVENT_TEXT = {
  released: () => 'You released it',
  resent: () => 'You sent it out again',
  perspective: (e) => `Perspective ${e.slot} joined`,
  'mallow-offer': () => 'Nobody had caught it yet, so your Mallow could offer a perspective',
  'mallow-perspective': () => 'Your Mallow offered another way to see it',
  returned: (e) => ({ complete: 'Five people saw it differently: it came home', expired: 'A day passed: it came home', withdrawn: 'You brought it home', removed: 'Our safety team brought it home' }[e.reason] || 'It came home'),
};

export function journey(dev, { id } = {}) {
  const c = dev.client;
  let j = c.journey(id);
  if (!j) {
    const gone = h('div', { class: 'hm-scene hf-room' }, h('div', { class: 'hf-head' }, top(dev, { title: '', back: true })),
      h('div', { class: 'hf-scroll' }, h('div', { class: 'hf-copy hf-copy--top' }, line('This journey isn’t here any more.', { cls: 'hf-line--sm' }))));
    return { el: gone, mood: 'day' };
  }
  if (j.status !== 'travelling') queueMicrotask(() => dev.go('homecoming', { id }, { replace: true }));
  const m = MALLOWS[j.mallow] || MALLOWS.noomi;
  const r = room(m.id, 'hf-journey', { seed: 13 });
  const st = stage(m.id, { size: 'm' });
  const speech = new Speech(m.id);
  put(st.above, speech.el);
  const head = h('div', { class: 'hf-head' }, top(dev, { title: '', back: true }));
  const body = h('div', { class: 'hf-scroll' });
  const flight = h('div', { class: 'rl-flight', 'aria-hidden': 'true' });
  r.el.append(head, body, flight);
  const orb = new Orb({ size: null, tint: feelColour(j.label), label: humanProgress(j) });
  orb.setPetals(j.petals || [], j.mallowPetal);
  const orbSlot = h('div', { class: 'hf-jdetail-orb' }, orb.el);
  let alive = true;
  let magic = false;

  function render() {
    j = c.journey(id) || j;
    if (j.status !== 'travelling') { dev.go('homecoming', { id }, { replace: true }); return; }
    const now = c.now();
    orb.setPetals(j.petals || [], j.mallowPetal);
    const f = j.fallback || { status: 'off' };
    const events = (j.events || []).slice().reverse();
    const reveal = h('div', { class: 'hf-reveal', dataset: { test: f.status === 'ready' ? 'mallow-ready' : 'mallow-slot' } });
    put(body,
      orbSlot,
      h('div', { class: 'hf-jdetail-status' },
        h('p', { class: 'hf-jorb-progress', dataset: { test: 'progress' } }, lights(j), h('span', {}, humanProgress(j))),
        h('p', { class: 'hf-meta' }, j.paused ? 'Paused while our safety team takes a look.' : `It comes home after five human perspectives, or within ${fmtSpan(j.expiresAt - now)}.`)),
      h('figure', { class: 'hf-own-words' }, h('blockquote', {}, j.text), h('figcaption', {}, feelChip(j.label), h('span', { class: 'hf-meta' }, `Released ${fmtAgo(j.releasedAt || j.createdAt, now)}`))),
      reveal,
      st.el,
      h('p', { class: 'hf-hint' }, 'You’ll read what people offered when it comes home. Nobody can see who you are, and nobody can contact you.'),
      h('details', { class: 'hf-events' }, h('summary', {}, 'Its journey so far'),
        h('ol', {}, events.map((e) => h('li', {}, h('i', { 'aria-hidden': 'true' }), h('span', {}, (EVENT_TEXT[e.type] || (() => e.type))(e)), h('time', {}, fmtAgo(e.at, now)))))),
      h('div', { class: 'hf-actions' },
        h('button', { type: 'button', class: 'kit-btn kit-btn--ghost kit-btn--block', dataset: { test: 'withdraw' }, onclick: () => withdraw() }, 'Bring it home now'),
        h('button', { type: 'button', class: 'kit-btn kit-btn--text kit-btn--block hf-danger', dataset: { test: 'delete-journey' }, onclick: () => remove() }, icon('trash'), 'Delete this journey')));
    mallowState(f, reveal);
  }

  function mallowState(f, reveal) {
    const now = c.now();
    switch (f.status) {
      case 'waiting':
        speech.say(`If nobody catches it in ${fmtSpan(Math.max(0, f.availableAt - now))}, I can offer another way to see it.`);
        speech.el.dataset.test = 'mallow-waiting';
        break;
      case 'available':
        speech.el.dataset.test = 'mallow-available';
        speech.say('Nobody’s caught it yet. Want me to offer another way to see it?', {
          extra: h('div', {},
            h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--sm', dataset: { test: 'ask-mallow' }, onclick: () => ask() }, `Ask ${m.name}`),
            h('p', { class: 'hf-say-note' }, 'Automatically generated · not written by a person')),
        });
        break;
      case 'pending':
        speech.say('Let me think about this one…');
        break;
      case 'ready': {
        speech.say('');
        const item = j.collection.find((x) => x.kind === 'mallow');
        if (item) showPerspective(reveal, item, false);
        break;
      }
      case 'failed':
        speech.el.dataset.test = 'mallow-failed';
        if (f.support) {
          speech.say('This one needs a person, not a Mallow.');
          put(reveal, h('div', { class: 'hf-care' }, supportBody(f.support)));
        } else {
          speech.say({
            safety: 'I won’t offer a perspective on this one. If things feel heavy, there’s support in You & safety.',
            unconfigured: 'I can’t reach my thoughts here. Your feeling keeps travelling and will still come home.',
            withdrawn: 'You let this feeling go before I answered.',
          }[f.reason] || 'I couldn’t find the words this time. Your feeling keeps travelling, and people may still catch it.');
        }
        break;
      case 'held':
        speech.say('This feeling is with our safety team for a moment.');
        break;
      case 'not-needed':
        speech.say('People are catching it. I’ll just keep it company.');
        break;
      default:
        speech.say('');
    }
  }

  function showPerspective(reveal, item, animate) {
    const lab = labSourceTag(dev, item.source);
    reveal.dataset.test = 'mallow-ready';
    put(reveal,
      h('h2', { class: 'hf-line hf-line--sm hf-reveal-line' }, 'Your Mallow found another way to see it.'),
      h('article', { class: 'hf-mallow-persp', dataset: { test: 'perspective', kind: 'mallow', source: item.source } },
        h('p', { class: 'hf-mallow-persp-src', dataset: { test: 'persp-source' } }, face(item.mallow, { size: 24 }), h('span', {}, item.label)),
        h('p', { class: 'hf-mallow-persp-text' }, item.text), lab));
    if (animate) rise([...reveal.children], { y: 16, stagger: 160 });
  }

  // ---------------------------------------- the Mallow finds another way --
  async function ask() {
    if (magic) return;
    magic = true;
    const rm = reducedMotion();
    speech.say('');
    const reveal = body.querySelector('.hf-reveal');
    play('think');
    // the orb drifts down into the Mallow's arms
    const from = centreIn(orb.el, flight);
    const size = orb.el.getBoundingClientRect().width;
    const flyer = h('div', { class: 'rl-flyer' });
    flight.append(flyer);
    orb.freeze();
    flyer.append(orb.el);
    flyer.style.transform = `translate(${from.x}px, ${from.y}px) translate(-50%, -50%)`;
    st.el.scrollIntoView({ block: 'center', behavior: rm ? 'auto' : 'smooth' });
    await wait(rm ? 0 : 420);
    const hands = handsOf(st.mallow, flight, size * 0.8);
    st.mallow.notice(0);
    st.mallow.reach(0.25);
    await fly(flyer, flight, { from: centreIn(flyer, flight), to: hands, duration: rm ? 1 : 1200, scale: [1, 0.8], trail: true, colour: m.glow });
    st.mallow.relax();
    st.mallow.press(0.4, 0.2);
    orb.squeeze(0.4, 0.2);
    await wait(220);
    st.mallow.release(true);
    orb.release(true);
    // it pauses and thinks (as long as the answer takes, at least a breath)
    st.mallow.think(true);
    speech.say('Hmm… let me look at it another way.', { who: false });
    let res;
    let err = null;
    try {
      [res] = await Promise.all([c.act('askMallow', { journeyId: id }), wait(rm ? 300 : 1900)]);
    } catch (e) { err = e; }
    if (!alive) return;
    st.mallow.think(false);
    // it softly compresses the orb, which glows and unfolds
    play('squish');
    st.mallow.press(0.9, 0.5);
    orb.squeeze(0.9, 0.5);
    await wait(rm ? 0 : 560);
    st.mallow.release();
    orb.release();
    orb.ripple({ colour: m.glow });
    orb.glowPulse(2);
    const item = res?.collection?.find((x) => x.kind === 'mallow');
    if (item) {
      play('reveal');
      orb.addStar(item.mallow);
      st.mallow.signature(0.9);
      speech.say('');
      j = res;
      showPerspective(reveal, item, true);
    } else {
      play('pass');
      const f = res?.fallback || {};
      mallowState(err ? { status: 'failed', reason: 'unavailable' } : f, reveal);
      if (err && !['fallback-budget', 'fallback-held', 'fallback-off', 'fallback-not-yet'].includes(err.code)) speech.say(errorText(err));
      else if (err) speech.say(errorText(err));
    }
    // and the feeling floats back up to keep travelling
    await wait(rm ? 0 : 900);
    const back = centreIn(orbSlot, flight);
    await fly(flyer, flight, { from: hands, to: back, duration: rm ? 1 : 1300, scale: [0.8, 1], trail: false });
    orbSlot.append(orb.unfreeze().el);
    flyer.remove();
    magic = false;
  }

  async function withdraw() {
    const ok = await dev.confirm({ title: 'Bring it home now?', text: 'It stops travelling and comes home with whatever perspectives it has collected so far.', confirmLabel: 'Bring it home' });
    if (!ok) return;
    const res = await dev.run(() => c.act('withdrawFeeling', { journeyId: id }));
    if (res) dev.go('homecoming', { id }, { replace: true });
  }
  async function remove() {
    const ok = await dev.confirm({ title: 'Delete this journey?', text: 'Your words and every perspective on it are deleted. This can’t be undone.', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    const res = await dev.run(() => c.act('deleteJourney', { journeyId: id, confirm: 'DELETE' }), { ok: 'Deleted.' });
    if (res) dev.go('journeys', {}, { replace: true, back: true });
  }

  render();
  return {
    el: r.el, mood: 'sky',
    update(s, detail) {
      if (!detail?.journeys || magic || !alive) return;
      if (dev._sheet) return;
      const top0 = body.scrollTop;
      render();
      body.scrollTop = top0;
    },
    destroy() { alive = false; orb.destroy(); st.destroy(); },
  };
}
