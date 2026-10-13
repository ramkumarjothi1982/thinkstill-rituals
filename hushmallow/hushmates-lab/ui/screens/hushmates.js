// All Hushmates: the whole small circle as calm, readable rows. Each row is
// the way into that Hushspace. Closed Hushspaces sit further down, dimmer.
// No presence, no "last seen", no pressure: only what each person chose to
// share (their status, their preference in our Hushspace).

import { h, icon, statusOf, intentOf } from '../dom.js';
import { MallowSet, face } from '../mallow.js';
import { MALLOWS } from '../mallows-data.js';
import { glow, pillow, round } from '../kit.js';
import { rise, dropIn } from '../motion.js';

const RESTING = new Set(['quiet', 'break']);
const CLOSED_LINE = {
  blocked: 'You blocked them · Hushspace closed',
  disconnected: 'You stepped back · Hushspace closed',
  deleted: 'Hushspace closed',
};

const byRecent = (a, b) => (b.lastAt || 0) - (a.lastAt || 0);
const byCreated = (a, b) => ((a.createdAt || 0) - (b.createdAt || 0)) || String(a.id).localeCompare(String(b.id));

function subLine(c) {
  if (!c.open) return { kind: 'closed', text: CLOSED_LINE[c.closedByMe] || 'Hushspace closed' };
  if (RESTING.has(c.other.status)) return { kind: c.other.status, text: statusOf(c.other.status).label };
  if (c.quiet?.theirs) return { kind: 'quiet', text: 'Quiet mode in your Hushspace' };
  const theirs = intentOf(c.intent?.theirs);
  if (theirs) return { kind: 'intent', text: `Would like: ${theirs.label}` };
  return { kind: 'available', text: c.other.status ? statusOf(c.other.status).label : 'Private Hushspace' };
}

export function hushmates(device, params = {}) {
  const set = new MallowSet();
  const s = device.state;
  const max = s.me?.limits?.maxActiveHushmates || 3;
  const open = s.hushmates.filter((x) => x.open).sort(byCreated);
  const closed = s.hushmates.filter((x) => !x.open).sort(byRecent);

  const row = (c) => {
    const m = MALLOWS[c.other.avatar];
    const sub = subLine(c);
    const unread = c.open ? c.unread || 0 : 0;
    const label = `Open your Hushspace with ${c.other.pseudonym}${unread && !c.muted ? `, ${unread} new` : ''}${!c.open ? ', closed' : ''}${c.other.test ? ' (test identity)' : ''}`;
    return h('button', { type: 'button', class: `hl-row${c.open ? '' : ' is-closed'}`, 'aria-label': label, dataset: { test: `hushmate-${c.other.pseudonym}` },
      onclick: () => device.go('hushspace', { id: c.id }, { transition: 'portal' }) },
    h('span', { class: 'hl-face', style: m ? { '--hl-glow': `${m.glow}88` } : undefined },
      face(c.other.avatar, { size: c.open ? 52 : 42 }),
      c.open && RESTING.has(c.other.status) ? h('span', { class: 'hl-moon', 'aria-hidden': 'true' }, icon('moon')) : null,
      c.other.test ? h('span', { class: 'hl-test', title: 'A simulated account used for testing the prototype' }, 'Test') : null),
    h('span', { class: 'hl-text' },
      h('span', { class: 'hl-name' }, h('span', {}, c.other.pseudonym)),
      h('span', { class: `hl-sub hl-sub--${sub.kind}` }, h('i', { 'aria-hidden': 'true' }), sub.text, c.open && c.muted ? ' · muted' : '')),
    h('span', { class: 'hl-end', 'aria-hidden': 'true' },
      unread ? h('span', { class: `hl-unread${c.muted ? ' hl-unread--muted' : ''}` }, unread > 99 ? '99+' : String(unread)) : null,
      h('span', { class: 'hl-chev' }, icon('chevron'))));
  };

  let empty = null;
  const parts = [];
  if (open.length) {
    parts.push(h('div', { class: 'kit-rows hl-rows' }, open.map(row)));
  } else {
    const noomi = set.make('noomi', { still: true, label: 'Noomi, resting on a pillow' });
    empty = h('div', { class: 'hl-empty' },
      h('div', { class: 'hl-empty-stage' }, glow(MALLOWS.noomi.glow), pillow(), h('div', { class: 'hl-empty-m' }, noomi.el)),
      h('h2', { class: 'kit-title kit-title--sm' }, 'No Hushmates yet.'),
      h('p', { class: 'kit-body hl-empty-text' }, 'When you and someone else both say yes, your private Hushspace appears here.'),
      h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--lg', onclick: () => device.go('find') }, 'Find a Hushmate', icon('arrow')));
    parts.push(empty);
  }
  parts.push(h('p', { class: 'kit-note hl-line' }, 'A small circle on purpose. There’s no obligation to reply, ever.'));
  if (closed.length) {
    parts.push(h('section', { class: 'kit-section hl-closed', 'aria-label': 'Closed Hushspaces' },
      h('p', { class: 'kit-label' }, 'Closed Hushspaces'),
      h('div', { class: 'kit-rows hl-rows' }, closed.map(row))));
  }

  const scroll = h('div', { class: 'hm-scroll hl-scroll' }, ...parts);
  const el = h('div', { class: 'hm-scene hl' },
    h('header', { class: 'hm-top' },
      round(icon('back'), 'Back', () => device.back(), { dataset: { test: 'back' } }),
      h('h1', { class: 'hm-top-label', 'data-autofocus': '' }, `My Hushmates · ${open.length} of ${max}`),
      h('span', { class: 'hm-top-spacer', 'aria-hidden': 'true' })),
    scroll);

  return {
    el,
    mood: 'calm',
    live: true,
    mounted() {
      if (params.refresh) return;
      if (empty) { dropIn(empty.querySelector('.hl-empty-m'), { delay: 80 }); rise([...empty.children].slice(1), { delay: 140, stagger: 70 }); }
      rise([...scroll.querySelectorAll('.hl-rows > .hl-row, .hl-line, .hl-closed')], { delay: 60, stagger: 60, y: 14 });
    },
    destroy: () => set.destroy(),
  };
}
