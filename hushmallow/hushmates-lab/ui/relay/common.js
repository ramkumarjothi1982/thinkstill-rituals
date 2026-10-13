// Shared pieces for the Feeling Relay scenes: the four-way dock, the top bar,
// feeling chips, the five lights of progress, perspective objects and the
// support panel. People's words only ever go in as text.

import { h, icon } from '../dom.js';
import { round } from '../kit.js';
import { MALLOWS } from '../mallows-data.js';
import { FEELING_LABELS, REPORT_REASONS } from '../../core/relay-config.js';

export const LABELS = Object.fromEntries(FEELING_LABELS.map((l) => [l.id, l]));
export const feelColour = (label) => LABELS[label]?.colour || '#C9B8FF';
export const feelName = (label) => LABELS[label]?.label || 'A feeling';

/** The four places: Release, Catch, My journeys, Returned. */
const DOCK = [
  { id: 'release', label: 'Release', icon: 'orb' },
  { id: 'catch', label: 'Catch', icon: 'catch' },
  { id: 'journeys', label: 'My journeys', icon: 'path' },
  { id: 'returned', label: 'Returned', icon: 'home' },
];
export function dock(dev, active) {
  const me = dev.state.me;
  const badge = { journeys: me?.travelling || 0, returned: me?.homeUnseen || 0 };
  // a soft dot on My journeys when a Mallow can offer another way to see one of them
  const offer = (dev.state.journeys || []).some((j) => j.status === 'travelling' && j.fallback?.status === 'available');
  return h('nav', { class: 'rl-dock', 'aria-label': 'Hushmates' },
    DOCK.map((d) => h('button', {
      type: 'button', class: 'rl-dock-item', 'aria-current': d.id === active ? 'page' : null, dataset: { test: `nav-${d.id}` },
      'aria-label': `${d.aria || d.label}${badge[d.id] ? ` (${badge[d.id]} ${d.id === 'returned' ? 'new' : 'travelling'})` : ''}${offer && d.id === 'journeys' ? ', your Mallow can offer another way to see one' : ''}`,
      onclick: () => { if (d.id !== active) dev.go(d.id, {}, { replace: true, transition: 'soft' }); },
    }, icon(d.icon), h('span', { class: 'rl-dock-label', 'aria-hidden': 'true' }, d.label),
    badge[d.id] && d.id === 'returned' ? h('span', { class: 'rl-dock-badge', 'aria-hidden': 'true' }, String(badge[d.id])) : null,
    offer && d.id === 'journeys' ? h('span', { class: 'rl-dock-dot', 'aria-hidden': 'true' }) : null)));
}

/** Top bar: optional back, a quiet title, optional action. */
export function top(dev, { title = '', back = false, action = null, left = false } = {}) {
  return h('header', { class: 'rl-top' },
    back ? round(icon('back'), 'Back', typeof back === 'function' ? back : () => dev.back()) : null,
    h('p', { class: `rl-top-title${left ? ' is-left' : ''}` }, title),
    action || (back ? h('span', { class: 'rl-top-spacer', 'aria-hidden': 'true' }) : null));
}

/** Brand bar for the main places: wordmark + "You & safety". */
export function brandBar(dev) {
  return h('header', { class: 'rl-top' },
    h('div', { class: 'rl-brand' }, h('p', { class: 'rl-brand-mark' }, 'Hush', h('em', {}, 'mates'))),
    round(icon('shield'), 'You and safety', () => dev.go('you'), { dataset: { test: 'open-you' } }));
}

export function feelChip(label) {
  if (!label) return null;
  return h('span', { class: 'rl-feel', style: { '--feel': feelColour(label) } }, h('i', { 'aria-hidden': 'true' }), feelName(label));
}

/** Five lights (one per person who answered) and a star for a Mallow; the words go beside them. */
export function lights(j) {
  const petals = j.petals || [];
  const items = [];
  for (let i = 0; i < j.of; i++) {
    const p = petals[i];
    items.push(h('i', { class: p ? 'is-on' : '', style: p ? { '--light': MALLOWS[p.mallow]?.body || '#A07BFF' } : undefined }));
  }
  if (j.mallowPetal) items.push(h('i', { class: 'is-star' }, icon('star')));
  return h('span', { class: 'rl-lights', 'aria-hidden': 'true' }, items);
}
/** Support (shown instead of releasing when a feeling sounds unsafe). Copy comes from the Reframe engine's safety layer. */
export function supportBody(support = {}, { lab = false } = {}) {
  const resources = support.resources || [];
  return h('div', { class: 'rl-support' },
    h('p', { class: 'rl-support-msg' }, support.message || 'What you wrote sounds really heavy. It won’t be sent to anyone, and you deserve real support with it.'),
    resources.length ? h('ul', { class: 'rl-support-list', dataset: { test: 'support-resources' } },
      resources.map((r) => h('li', {}, h('strong', {}, r.label), r.detail ? h('span', {}, r.detail) : null))) : null,
    support.stillHere ? h('p', { class: 'kit-note' }, support.stillHere) : null,
    lab ? h('p', { class: 'kit-note rl-pilot-note hf-lab-tag--block' }, 'Lab note: crisis resources must be reviewed for each launch region by a safety lead before real people use Hushmates.') : null);
}

/** Choose a reason, then send a report. → { reason } or null */
export function reportSheet(dev, { title = 'Report this', intro }) {
  return new Promise((resolve) => {
    let chosen = null;
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); dev.closeSheet(); } };
    const send = h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--block', disabled: true, dataset: { test: 'report-send' }, onclick: () => finish({ reason: chosen }) }, 'Send report');
    const list = h('div', { class: 'rl-reasons', role: 'radiogroup', 'aria-label': 'What best describes it?' },
      REPORT_REASONS.map((r) => h('button', {
        type: 'button', role: 'radio', class: 'rl-reason', 'aria-checked': 'false', dataset: { test: `reason-${r.id}` },
        onclick: (e) => { chosen = r.id; list.querySelectorAll('.rl-reason').forEach((b) => b.setAttribute('aria-checked', String(b === e.currentTarget))); send.disabled = false; },
      }, h('i', { 'aria-hidden': 'true' }), r.label)));
    dev.sheet({
      title,
      body: h('div', { class: 'kit-stack' }, h('p', { class: 'hm-sheet-text' }, intro), list,
        h('p', { class: 'kit-note' }, 'Reports go to a person on the safety team. Nobody is told who reported.')),
      actions: [send, h('button', { type: 'button', class: 'kit-btn kit-btn--text kit-btn--block', onclick: () => finish(null) }, 'Cancel')],
      onClose: () => { if (!done) { done = true; resolve(null); } },
    });
  });
}

const NETWORK = {
  network: 'You’re offline. Nothing was sent; try again when you’re back.',
  'response-lost': 'The connection dropped before we heard back. Trying again is safe: nothing is sent twice.',
};
/** The service's own words when it says no (it explains every refusal), else a gentle default. */
export const errorText = (e) => NETWORK[e?.code] || e?.message || 'Something went wrong. Please try again.';
