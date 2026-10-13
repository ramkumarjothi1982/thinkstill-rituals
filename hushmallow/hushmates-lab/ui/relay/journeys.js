// MY JOURNEYS: your feelings while they travel. Each shows its petals of
// light, "3 of 5 perspectives found", when it will come home at the latest,
// and (only if you allowed it) the offer of a Mallow perspective.
// The words people offer stay sealed until the feeling comes home.

import { h, icon, fmtSpan, fmtAgo } from '../dom.js';
import { eyebrow, headline } from '../kit.js';
import { face } from '../mallow.js';
import { MALLOWS } from '../mallows-data.js';
import { Orb } from '../orb.js';
import { play } from '../sound.js';
import { PERSPECTIVE_LABELS, RELAY } from '../../core/relay-config.js';
import { brandBar, dock, top, feelChip, feelColour, progress, progressText, perspective, errorText, supportBody } from './common.js';

function miniOrb(j, size = null) {
  const o = new Orb({ size, tint: feelColour(j.label), label: `${progressText(j)}` });
  o.setPetals(j.petals || [], j.mallowPetal);
  return o;
}

// ---------------------------------------------------------- the list --
export function journeys(dev) {
  const orbs = [];
  const travelling = dev.state.journeys.filter((j) => j.status === 'travelling');
  const me = dev.state.me;
  const now = dev.client.now();
  const list = travelling.map((j) => {
    const o = miniOrb(j);
    orbs.push(o);
    const ask = j.fallback?.status === 'available';
    return h('button', { type: 'button', class: `rl-jrow${ask ? ' has-offer' : ''}`, dataset: { test: `journey-${j.id}` }, onclick: () => dev.go('journey', { id: j.id }) },
      h('span', { class: 'rl-jrow-orb' }, o.el),
      h('span', { class: 'rl-jrow-main' },
        h('span', { class: 'rl-jrow-text' }, j.text),
        progress(j, { short: true }),
        h('span', { class: 'rl-jrow-meta' }, feelChip(j.label),
          j.paused ? h('span', { class: 'rl-meta' }, 'Paused for review') : h('span', { class: 'rl-meta' }, `Home within ${fmtSpan(j.expiresAt - now)}`)),
        ask ? h('span', { class: 'rl-jrow-offer' }, face(j.fallback.mallow, { size: 20 }), `${MALLOWS[j.fallback.mallow]?.name} can offer a perspective`) : null),
      icon('chevron'));
  });
  const el = h('div', { class: 'hm-scene rl-scene rl-journeys' },
    h('div', { class: 'rl-head-slot' }, brandBar(dev)),
    h('div', { class: 'hm-scroll rl-list-scroll' },
      h('div', { class: 'rl-list-head' },
        eyebrow('My journeys'),
        headline('h1', 'Still', 'travelling', { grad: 'softer', cls: 'kit-title--md' }),
        h('p', { class: 'kit-body' }, travelling.length
          ? `${travelling.length} of ${me.limits.maxActiveJourneys} at a time. Each comes home after five perspectives, or within a day.`
          : 'Nothing is travelling right now.')),
      travelling.length ? h('div', { class: 'rl-jlist' }, list)
        : h('div', { class: 'rl-empty' },
          h('p', { class: 'kit-body' }, 'When you release a feeling, you can follow its journey here.'),
          h('button', { type: 'button', class: 'kit-btn kit-btn--ink', dataset: { test: 'empty-release' }, onclick: () => dev.go('release', { compose: true }, { replace: true }) }, 'Release a feeling'))),
    h('div', { class: 'rl-dock-slot' }, dock(dev, 'journeys')));
  return { el, mood: 'day', live: true, destroy() { orbs.forEach((o) => o.destroy()); } };
}

// -------------------------------------------------------- one journey --
const EVENT_TEXT = {
  released: () => 'You released it',
  perspective: (e) => `Perspective ${e.slot} joined`,
  'mallow-offer': () => 'Nobody had caught it yet, so a Mallow could offer a perspective',
  'mallow-perspective': () => 'A Mallow perspective arrived',
  returned: (e) => ({ complete: 'Five perspectives: it came home', expired: 'A day passed: it came home', withdrawn: 'You brought it home', removed: 'Our safety team brought it home' }[e.reason] || 'It came home'),
};

export function journey(dev, { id } = {}) {
  const c = dev.client;
  const j = c.journey(id);
  if (!j) {
    return { el: h('div', { class: 'hm-scene rl-scene' }, h('div', { class: 'rl-head-slot' }, top(dev, { title: 'Journey', back: true })),
      h('div', { class: 'rl-hero' }, h('h1', { class: 'kit-title kit-title--sm', 'data-autofocus': '' }, 'This journey isn’t here any more.'))), mood: 'day' };
  }
  if (j.status !== 'travelling') {
    // it came home while you were looking: the homecoming is the place for it now
    queueMicrotask(() => dev.go('homecoming', { id }, { replace: true }));
  }
  const now = c.now();
  const o = new Orb({ size: null, tint: feelColour(j.label), label: progressText(j) });
  o.setPetals(j.petals || [], j.mallowPetal);
  const f = j.fallback || { status: 'off' };
  const fm = MALLOWS[f.mallow] || MALLOWS.loomi;

  const fallbackCard = () => {
    switch (f.status) {
      case 'waiting':
        return h('div', { class: 'rl-card rl-card--lilac', dataset: { test: 'mallow-waiting' } },
          h('div', { class: 'rl-card-head' }, face(fm.id, { size: 28 }), h('h3', {}, 'People first')),
          h('p', {}, `If nobody has caught it in ${fmtSpan(Math.max(0, f.availableAt - now))}, you can ask a Mallow for a perspective.`));
      case 'available':
        return h('div', { class: 'rl-card rl-card--lilac rl-mallow-offer', dataset: { test: 'mallow-available' } },
          h('div', { class: 'rl-card-head' }, face(fm.id, { size: 34, float: true }), h('h3', {}, `Nobody has caught it yet. Would you like ${fm.name}’s perspective?`)),
          h('p', {}, `${fm.name} is ${fm.vibe.toLowerCase()}. A Mallow perspective is AI-generated in Hushmates: your words are sent to an AI service for one reply. It’s always labelled, and never counted as a person.`),
          h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--block', dataset: { test: 'ask-mallow' }, onclick: () => ask() }, `Ask ${fm.name}`));
      case 'pending':
        return h('div', { class: 'rl-card rl-card--lilac', dataset: { test: 'mallow-pending' } },
          h('div', { class: 'rl-card-head' }, face(fm.id, { size: 34, float: true }), h('h3', {}, `${fm.name} is thinking…`)));
      case 'ready': {
        const item = j.collection.find((x) => x.kind === 'mallow');
        return h('div', { class: 'rl-mallow-ready', dataset: { test: 'mallow-ready' } },
          h('p', { class: 'kit-label' }, f.superseded ? 'Five people caught it, so the Mallow steps aside' : 'While it travels'),
          item ? perspective(item, { compact: true }) : null,
          h('p', { class: 'kit-note' }, 'A Mallow never takes a person’s place: if five people catch your feeling, theirs come first.'));
      }
      case 'failed':
        return h('div', { class: `rl-card ${f.reason === 'safety' ? 'rl-card--warm' : ''}`, dataset: { test: 'mallow-failed' } },
          h('div', { class: 'rl-card-head' }, face(fm.id, { size: 28 }), h('h3', {}, f.reason === 'safety' ? 'This one needs a person, not a Mallow' : `${fm.name} couldn’t answer this time`)),
          f.support ? supportBody(f.support) : h('p', {}, {
            safety: 'A Mallow won’t offer a perspective on this feeling. If you’re finding things hard, the support in You & safety is there for you.',
            unconfigured: 'No Mallow perspective service is connected here. Your feeling keeps travelling and will still come home.',
            withdrawn: 'You let this feeling go before the Mallow answered.',
          }[f.reason] || 'Your feeling keeps travelling and will still come home. There’s only one Mallow perspective per feeling, so it won’t be asked again.'));
      case 'held':
        return h('div', { class: 'rl-card rl-card--warm', dataset: { test: 'mallow-held' } }, h('p', {}, 'This feeling is with our safety team for a moment, so no Mallow will be asked.'));
      case 'not-needed':
        return h('p', { class: 'kit-note rl-center' }, 'People are catching it, so no Mallow is needed.');
      default:
        return null;
    }
  };

  async function ask() {
    const ok = await dev.confirm({
      title: `Ask ${fm.name}?`,
      art: face(fm.id, { size: 64, float: true }),
      text: `Your words will be sent to an AI service to write one Mallow perspective. It will be labelled “A Mallow perspective”, never shown as a person, and your feeling keeps travelling: people still come first.${dev.env?.mallowNote ? ` ${dev.env.mallowNote}` : ''}`,
      confirmLabel: `Ask ${fm.name}`,
    });
    if (!ok) return;
    const r = await dev.run(() => c.act('askMallow', { journeyId: id }));
    if (r?.fallback?.status === 'ready') play('petal');
  }
  async function withdraw() {
    const ok = await dev.confirm({ title: 'Bring it home now?', text: 'It stops travelling and comes home with whatever perspectives it has collected so far.', confirmLabel: 'Bring it home' });
    if (!ok) return;
    const r = await dev.run(() => c.act('withdrawFeeling', { journeyId: id }));
    if (r) dev.go('homecoming', { id }, { replace: true });
  }
  async function remove() {
    const ok = await dev.confirm({ title: 'Delete this journey?', text: 'Your words and every perspective on it are deleted. This can’t be undone.', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    const r = await dev.run(() => c.act('deleteJourney', { journeyId: id, confirm: 'DELETE' }), { ok: 'Deleted.' });
    if (r) dev.go('journeys', {}, { replace: true, back: true });
  }

  const events = (j.events || []).slice().reverse();
  const el = h('div', { class: 'hm-scene rl-scene rl-journey', dataset: { test: 'journey-detail' } },
    h('div', { class: 'rl-head-slot' }, top(dev, { title: 'Journey', back: true })),
    h('div', { class: 'hm-scroll rl-journey-scroll' },
      h('div', { class: 'rl-journey-orb' }, o.el),
      h('div', { class: 'rl-journey-status' },
        progress(j),
        h('p', { class: 'kit-note' }, j.paused ? 'Paused while our safety team takes a look.' : `It comes home after five perspectives, or within ${fmtSpan(j.expiresAt - now)}.`)),
      h('figure', { class: 'rl-card rl-feeling-card' },
        h('p', { class: 'rl-quote' }, j.text),
        h('figcaption', { class: 'rl-feeling-meta' }, feelChip(j.label), h('span', { class: 'rl-meta' }, `Released ${fmtAgo(j.createdAt, now)}`))),
      fallbackCard(),
      h('p', { class: 'rl-sealed' }, icon('eyeOff'), h('span', {}, 'You’ll read what people offered when it comes home. Nobody can see who you are, and nobody can contact you.')),
      h('section', { class: 'rl-events', 'aria-label': 'Its journey so far' },
        h('p', { class: 'kit-label' }, 'Its journey so far'),
        h('ol', {}, events.map((e) => h('li', {}, h('i', { 'aria-hidden': 'true' }), h('span', {}, (EVENT_TEXT[e.type] || (() => e.type))(e)), h('time', {}, fmtAgo(e.at, now)))))),
      h('div', { class: 'rl-actions rl-journey-actions' },
        h('button', { type: 'button', class: 'kit-btn kit-btn--ghost kit-btn--block', dataset: { test: 'withdraw' }, onclick: () => withdraw() }, 'Bring it home now'),
        h('button', { type: 'button', class: 'kit-btn kit-btn--text kit-btn--block rl-danger-text', dataset: { test: 'delete-journey' }, onclick: () => remove() }, icon('trash'), 'Delete this journey'))));
  return { el, mood: 'sky', live: true, destroy() { o.destroy(); } };
}
