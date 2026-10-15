// MY JOURNEYS. Your feelings while they travel, as orbs drifting in your sky:
// each wears one petal of light per person who has seen it differently
// ("3 of 5 human perspectives"), and comes home after five, or within a day.
// The words people offer stay sealed until it comes home.
//
// A journey up close: the orb above your Mallow. If you allowed it and nobody
// has caught it, your Mallow can offer another way to see it: the orb drifts
// down into its arms, it thinks, squeezes, and a new possibility unfolds,
// labelled as automatically generated. The feeling keeps travelling.
// The server may already have prepared it (30 minutes after release): then the
// Mallow invites the person to see what it found, with the same moment.

import { h, icon, fmtSpan, fmtAgo } from '../dom.js';
import { face } from '../mallow.js';
import { MALLOWS } from '../mallows-data.js';
import { Orb } from '../orb.js';
import { play } from '../sound.js';
import { wait, reducedMotion, rise, CSS_EASE } from '../motion.js';
import { PERSPECTIVE_LABELS } from '../../core/relay-config.js';
import { brandBar, dock, top, feelChip, feelColour, lights, errorText, supportBody, reportSheet, openSupport } from './common.js';
import { room, stage, Speech, line, swapLine, put, hostNote, focusHeading } from './parts.js';

/** The account is paused by the safety team: its travelling feelings aren't offered to anyone (they still come home). */
const held = (dev) => !!dev.state.me && dev.state.me.accountState !== 'active';
export const humanProgress = (j) => `${j.humanCount} of ${j.of} human perspective${j.of === 1 ? '' : 's'}`;

/**
 * The server prepares the Mallow's perspective by itself (30 minutes after release, with consent,
 * when nobody has caught it). Until the person opens it, it waits as an invitation; once opened
 * here it is shown directly, even before the server has heard it was seen.
 */
const revealedHere = (dev) => (dev.memory.mallowSeen ||= new Set());
export const unseenMallow = (dev, j) => j?.fallback?.status === 'ready' && j.fallback.seen === false && !revealedHere(dev).has(j.id)
  && !!j.collection?.some((x) => x.kind === 'mallow');
/** The journey as drawn (orb petals, progress lights): no Mallow star yet while its perspective is a surprise. */
const drawn = (dev, j) => (unseenMallow(dev, j) ? { ...j, mallowPetal: null } : j);

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
    const ask = j.fallback?.status === 'available';
    // a perspective the Mallow prepared by itself stays a surprise (no star yet) until it's opened
    const found = unseenMallow(dev, j);
    o.setPetals(j.petals || [], drawn(dev, j).mallowPetal);
    orbs.push(o);
    return h('button', { type: 'button', class: `hf-jorb${ask || found ? ' has-offer' : ''}`, style: { '--i': String(i) }, dataset: { test: `journey-${j.id}` }, onclick: () => dev.go('journey', { id: j.id }) },
      h('span', { class: 'hf-jorb-orb' }, o.el),
      h('span', { class: 'hf-jorb-cap' },
        h('span', { class: 'hf-jorb-text' }, j.text),
        h('span', { class: 'hf-jorb-progress' }, lights(drawn(dev, j)), h('span', {}, humanProgress(j))),
        h('span', { class: 'hf-meta' }, j.paused ? 'Paused for a safety review' : held(dev) ? `Not being offered · home within ${fmtSpan(j.expiresAt - now)}` : `Home within ${fmtSpan(j.expiresAt - now)}`),
        ask ? h('span', { class: 'hf-jorb-offer' }, face(j.fallback.mallow, { size: 20 }), `${MALLOWS[j.fallback.mallow]?.name} can offer another perspective`) : null,
        found ? h('span', { class: 'hf-jorb-offer', dataset: { test: 'mallow-found-hint' } }, face(j.fallback.mallow, { size: 20 }), `${(MALLOWS[j.fallback.mallow] || MALLOWS.noomi).name} found another way to see it`) : null));
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
  'perspective-withdrawn': () => 'Someone took back the perspective they gave',
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
  // one stage: your Mallow holds the travelling orb above its head and speaks below it,
  // so the fallback magic happens in place and its perspective unfolds underneath
  const st = stage(m.id, { size: 'm' });
  const speech = new Speech(m.id, { tail: 'up' });
  const head = h('div', { class: 'hf-head' }, top(dev, { title: '', back: true }));
  const body = h('div', { class: 'hf-scroll' });
  r.el.append(head, body);
  const orb = new Orb({ size: null, tint: feelColour(j.label), label: humanProgress(j) });
  orb.setPetals(j.petals || [], j.mallowPetal);
  const orbSlot = h('div', { class: 'hf-jdetail-orb' }, orb.el);
  put(st.above, orbSlot);
  st.el.append(speech.el);
  let alive = true;
  let magic = false;

  function render() {
    j = c.journey(id) || j;
    if (j.status !== 'travelling') { dev.go('homecoming', { id }, { replace: true }); return; }
    const now = c.now();
    const f = j.fallback || { status: 'off' };
    orb.setPetals(j.petals || [], drawn(dev, j).mallowPetal);
    const events = (j.events || []).slice().reverse();
    const reveal = h('div', { class: 'hf-reveal', dataset: { test: f.status === 'ready' && !unseenMallow(dev, j) ? 'mallow-ready' : 'mallow-slot' } });
    put(body,
      h('div', { class: 'hf-jdetail-status' },
        h('p', { class: 'hf-home-progress', dataset: { test: 'progress' } }, lights(drawn(dev, j)), h('span', {}, humanProgress(j))),
        h('p', { class: 'hf-meta' }, j.paused ? `Paused for now, until a person on our safety team can read it. It still comes home within ${fmtSpan(j.expiresAt - now)}.`
          : held(dev) ? `While your account is paused it isn’t offered to anyone. It comes home within ${fmtSpan(j.expiresAt - now)}.`
            : `It comes home after five human perspectives, or within ${fmtSpan(j.expiresAt - now)}.`),
        // the same words for every pause, so the reason is never revealed (Tier 0)
        j.paused ? h('p', { class: 'hf-meta hf-help-row' }, 'If anything feels heavy while you wait, you don’t have to wait for us. ', h('button', { type: 'button', class: 'kit-btn kit-btn--ghost kit-btn--sm hf-help-inline', dataset: { test: 'inline-support' }, onclick: () => openSupport(dev) }, icon('help'), 'Get support now')) : null),
      st.el,
      reveal,
      h('figure', { class: 'hf-own-words' }, h('blockquote', {}, j.text), h('figcaption', {}, feelChip(j.label), h('span', { class: 'hf-meta' }, `Released ${fmtAgo(j.releasedAt || j.createdAt, now)}`))),
      h('p', { class: 'hf-hint' }, 'You’ll read what people offered when it comes home. Other people never see your name, and nobody can contact you through Hushmates.'),
      h('details', { class: 'hf-events' }, h('summary', {}, 'Its journey so far'),
        h('ol', {}, events.map((e) => h('li', {}, h('i', { 'aria-hidden': 'true' }), h('span', {}, (EVENT_TEXT[e.type] || (() => 'Something changed on its journey'))(e)), h('time', {}, fmtAgo(e.at, now)))))),
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
        if (unseenMallow(dev, j)) {
          // prepared while nobody had caught it: an invitation, opened with the same moment as asking
          speech.el.dataset.test = 'mallow-found';
          speech.say('Nobody had caught it yet, so I found another way to see it.', {
            extra: h('div', {},
              h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--sm', dataset: { test: 'mallow-reveal' }, onclick: () => seeIt() }, `See what ${m.name} found`),
              h('p', { class: 'hf-say-note' }, 'Automatically generated · not written by a person')),
          });
          break;
        }
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
            safety: 'I won’t offer a perspective on this one. If things feel heavy, real people are there to listen: Get support is at the top of the screen.',
            withdrawn: 'You let this feeling go before I answered.',
          }[f.reason] || 'I couldn’t find the words this time. Your feeling keeps travelling, and people may still catch it.');
        }
        break;
      case 'held':
        speech.say('This one is waiting for our safety team to read it, so I’ll hold off for now.');
        break;
      case 'not-needed':
        speech.say('People are catching it. I’ll just keep it company.');
        break;
      default:
        speech.say('');
    }
  }

  function showPerspective(reveal, item, animate) {
    const note = hostNote(dev, 'mallow-source', { source: item.source });
    reveal.dataset.test = 'mallow-ready';
    put(reveal,
      h('h2', { class: 'hf-line hf-line--sm hf-reveal-line', 'data-autofocus': '' }, 'Your Mallow found another way to see it.'),
      h('article', { class: 'hf-mallow-persp', dataset: { test: 'perspective', kind: 'mallow', source: item.source } },
        h('p', { class: 'hf-mallow-persp-src', dataset: { test: 'persp-source' } }, face(item.mallow, { size: 24 }), h('span', {}, item.label)),
        h('button', { type: 'button', class: 'rl-more hf-slide-more', 'aria-label': 'More: report this Mallow perspective', dataset: { test: 'persp-more' }, onclick: () => reportMallow(item) }, icon('more')),
        h('p', { class: 'hf-mallow-persp-text' }, item.text), note));
    if (animate) rise([...reveal.children], { y: 16, stagger: 160 });
  }

  // ---------------------------------------- the Mallow finds another way --
  // The orb is already in its hands: it looks at it, holds it closer, thinks (thought dots, a held
  // blush), squeezes it softly, and it glows, gains a star and unfolds into the perspective below.
  // Asking and opening one the server already prepared are the same moment.
  const ask = () => moment(() => c.act('askMallow', { journeyId: id }), 'Hmm… let me look at it another way.');
  // already prepared: if the note that it was seen doesn't get through, it's shown anyway
  const seeIt = () => moment(() => c.act('markMallowSeen', { journeyId: id }).catch(() => c.journey(id) || j), 'Let me show you what I found…');

  async function moment(answer, thinking) {
    if (magic) return;
    magic = true;
    const rm = reducedMotion();
    speech.say('');
    const reveal = body.querySelector('.hf-reveal');
    st.el.scrollIntoView({ block: 'center', behavior: rm ? 'auto' : 'smooth' });
    await wait(rm ? 0 : 420);
    if (!alive) return;
    play('think');
    st.mallow.notice(0);
    st.mallow.press(0.4, 0.2);
    orb.squeeze(0.4, 0.2);
    await wait(rm ? 0 : 240);
    st.mallow.release(true);
    orb.release(true);
    // it pauses and thinks (as long as the answer takes, at least a breath)
    st.mallow.think(true);
    speech.say(thinking, { who: false });
    let res;
    let err = null;
    try {
      [res] = await Promise.all([answer(), wait(rm ? 300 : 1900)]);
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
      // seen now: shown directly from here on, and the server is told (so no other device invites again)
      revealedHere(dev).add(id);
      if (res.fallback?.seen === false) c.api('markMallowSeen', { journeyId: id }).catch(() => {});
      play('reveal');
      orb.addStar(item.mallow);
      st.mallow.delight(0.9);
      speech.say('');
      j = res;
      showPerspective(reveal, item, true);
      // the perspective unfolds below the Mallow; bring it gently into view
      setTimeout(() => alive && reveal.scrollIntoView({ block: 'nearest', behavior: rm ? 'auto' : 'smooth' }), rm ? 0 : 500);
      focusHeading(reveal);
    } else {
      play('pass');
      const f = res?.fallback || {};
      mallowState(err ? { status: 'failed', reason: 'unavailable' } : f, reveal);
      if (err) speech.say(errorText(err));
    }
    await wait(rm ? 0 : 600);
    magic = false;
  }

  async function reportMallow(item) {
    const pick = await reportSheet(dev, { title: 'Report this Mallow perspective', intro: 'Mallow perspectives are automatically generated and can get things wrong. What best describes it? It disappears straight away.' });
    if (!pick) return;
    const res = await dev.run(() => c.act('reportPerspective', { journeyId: id, perspectiveId: item.id, reason: pick.reason }, ['journeys']));
    if (!res) return;
    dev.sheet({ title: 'Thank you for telling us', body: h('p', { class: 'hm-sheet-text', dataset: { test: 'report-received' } }, res.expectation),
      actions: [h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--block', onclick: () => dev.closeSheet() }, 'Okay')] });
    render();
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
