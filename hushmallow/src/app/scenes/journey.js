// YOUR JOURNEY — how Hushmallow has been with this person, from what's on
// this device: moments finished, time spent, how they said they felt
// afterwards, what helped most, the feelings they brought, their Mallows,
// and where they are in this round. Never their words. No streaks, no
// scores to keep up: it describes, it doesn't nag.
import { h, iconBtn } from '../ui.js';
import { journeyEntries, summarise } from '../../engine/journey.js';
import { createRound } from '../../engine/round.js';
import { planItems } from '../play-item.js';
import { getFamily } from '../../data/emotions.js';
import { MALLOWS } from '../../mallows/registry.js';

// lighter / about the same / heavier: two opposite hues and a neutral grey
// (validated on the dark surface); single-series bars use the gold accent.
const FELT = [['lighter', 'A bit lighter', '#3987e5'], ['same', 'About the same', '#6d6886'], ['heavier', 'Heavier', '#d95926']];
const GOLD = '#ffd98a';

export default function journey(app) {
  const { world, ent } = app;
  const body = h('div', { style: { display: 'grid', gap: '14px' } });
  const el = h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%' } },
    h('div', { class: 'topbar' }, iconBtn('back', 'Back', () => app.back()), h('div', { class: 'grow' })),
    h('div', { class: 'card', style: { marginTop: '10px', padding: '16px', overflowY: 'auto', flex: '1', minHeight: '0' } },
      h('h1', { class: 'title', style: { fontSize: '26px' } }, 'Your journey'),
      h('p', { class: 'muted', style: { margin: '4px 0 14px' } }, 'How Hushmallow has been with you. It lives only on this phone.'),
      body));

  const section = (title, ...kids) => h('section', { style: { display: 'grid', gap: '8px' } }, h('div', { class: 'eyebrow' }, title), ...kids);
  const tile = (value, label, sub) => h('div', { style: { padding: '12px', borderRadius: '16px', background: 'rgba(255,255,255,.06)', border: '1px solid var(--line)' } },
    h('div', { style: { font: '800 28px var(--font-display)', color: 'var(--text-1)', lineHeight: '1' } }, value),
    h('div', { style: { font: '700 13px var(--font-ui)', marginTop: '6px' } }, label),
    sub ? h('div', { class: 'muted', style: { fontSize: '12px', marginTop: '2px' } }, sub) : null);
  // one labelled horizontal bar: text in text colours, the bar carries the hue
  const bar = (label, n, max, colour = GOLD, aria) => h('div', { role: 'listitem', 'aria-label': aria || `${label}: ${n}`, title: `${label}: ${n}`,
    style: { display: 'grid', gridTemplateColumns: 'minmax(0,9.5em) 1fr 2.2em', alignItems: 'center', gap: '8px' } },
  h('div', { style: { fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, label),
  h('div', { style: { height: '10px', borderRadius: '5px', background: 'rgba(255,255,255,.06)' } },
    h('div', { style: { height: '100%', width: `${Math.max(4, (n / Math.max(1, max)) * 100)}%`, borderRadius: '5px', background: colour } })),
  h('div', { style: { fontSize: '14px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' } }, String(n)));
  const when = (t) => new Date(t).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

  async function render() {
    const s = summarise(journeyEntries(app.store));
    const round = createRound(app.store, ent.tier());
    const total = ent.has('paid') ? (await planItems(app)).filter((x) => x.id !== 'another-angle').length : 0;

    if (!s.total) {
      body.replaceChildren(
        h('p', { style: { margin: 0 } }, 'Nothing here yet. Finish your first Mallow Moment and your journey starts here.'),
        h('button', { class: 'btn primary block', onclick: () => app.go(ent.has('paid') ? 'express' : 'plans') }, 'What’s on your mind?'));
      return;
    }

    const kids = [];
    kids.push(h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' } },
      tile(String(s.total), s.total === 1 ? 'Moment finished' : 'Moments finished', 'rituals and tricks'),
      tile(String(s.week), 'In the last 7 days'),
      tile(`${s.minutes}`, s.minutes === 1 ? 'Minute with the Mallows' : 'Minutes with the Mallows'),
      tile(s.checkIns ? `${s.felt.lighter} of ${s.checkIns}` : '—', 'Felt a bit lighter', s.checkIns ? 'when you checked in' : 'check in after a ritual to see this')));

    if (total) {
      const done = Math.min(round.count(), total);
      kids.push(section(`Round ${round.number()} · ${done} of ${total} tried`,
        h('div', { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(total), 'aria-valuenow': String(done), 'aria-label': `Round ${round.number()}: ${done} of ${total} tried`,
          style: { height: '12px', borderRadius: '6px', background: 'rgba(255,255,255,.08)', overflow: 'hidden' } },
        h('div', { style: { height: '100%', width: `${(done / total) * 100}%`, minWidth: done ? '6px' : '0', borderRadius: '6px', background: GOLD } })),
        h('p', { class: 'muted', style: { margin: 0, fontSize: '13px' } }, 'Nothing repeats until you’ve tried everything in your plan. Saved ones are always one tap away.')));
    }

    if (s.checkIns) {
      // part-to-whole: one stacked bar, 2px gaps between segments, labelled legend with counts
      kids.push(section('How you felt afterwards',
        h('div', { role: 'img', 'aria-label': FELT.map(([k, l]) => `${l}: ${s.felt[k]}`).join(', '), style: { display: 'flex', gap: '2px', height: '14px', borderRadius: '7px', overflow: 'hidden' } },
          ...FELT.filter(([k]) => s.felt[k]).map(([k, l, c]) => h('div', { title: `${l}: ${s.felt[k]}`, style: { flex: String(s.felt[k]), background: c } }))),
        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '13px' } },
          ...FELT.map(([k, l, c]) => h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: '6px' } },
            h('span', { 'aria-hidden': 'true', style: { width: '10px', height: '10px', borderRadius: '3px', background: c } }), `${l} · ${s.felt[k]}`))),
        h('p', { class: 'muted', style: { margin: 0, fontSize: '12.5px' } }, 'Just what you told the Mallows, not a measure of you. Feelings don’t always move on cue.')));
    }

    const dayMax = Math.max(1, ...s.days.map((d) => d.n));
    kids.push(section('Your last 7 days',
      h('div', { role: 'list', style: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', alignItems: 'end', height: '74px' } },
        ...s.days.map((d) => h('div', { role: 'listitem', title: `${when(d.day)}: ${d.n}`, 'aria-label': `${when(d.day)}: ${d.n}`, style: { display: 'grid', gap: '4px', justifyItems: 'center', alignItems: 'end', height: '100%' } },
          h('div', { style: { width: '70%', height: `${d.n ? Math.max(10, (d.n / dayMax) * 52) : 3}px`, borderRadius: '4px 4px 0 0', background: d.n ? GOLD : 'rgba(255,255,255,.12)' } }),
          h('div', { class: 'muted', style: { fontSize: '11px' } }, new Date(d.day).toLocaleDateString(undefined, { weekday: 'narrow' })))))));

    if (s.helped.length) {
      kids.push(section('What helped most',
        ...s.helped.map((x) => h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '14.5px' } },
          h('span', {}, `${x.name} · ${MALLOWS[x.mallow]?.name || ''}`), h('span', { class: 'muted' }, `lighter ${x.n}×`)))));
    }

    if (s.families.length) {
      const top = s.families.slice(0, 6);
      kids.push(section('What you brought', h('div', { role: 'list', style: { display: 'grid', gap: '6px' } },
        ...top.map(([f, n]) => bar(getFamily(f)?.name || f, n, top[0][1])))));
    }

    if (s.mallows.length) {
      kids.push(section('Your Mallows', h('div', { role: 'list', style: { display: 'grid', gap: '6px' } },
        ...s.mallows.map(([m, n]) => bar(MALLOWS[m]?.name || m, n, s.mallows[0][1])))));
    }

    kids.push(section('Recent',
      ...s.recent.map((e) => h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: '10px', fontSize: '14px', padding: '6px 0', borderBottom: '1px solid var(--line)' } },
        h('span', { style: { minWidth: '0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, `${e.name} · ${MALLOWS[e.mallow]?.name || ''}`),
        h('span', { class: 'muted', style: { flex: '0 0 auto' } }, `${when(e.at)}${e.felt ? ` · ${FELT.find(([k]) => k === e.felt)[1].toLowerCase()}` : ''}`)))));

    kids.push(h('div', { class: 'row-btns' },
      h('button', { class: 'btn', onclick: () => app.go('library', { tab: 'saved' }) }, '★ Saved'),
      h('button', { class: 'btn', onclick: () => app.go('library') }, 'Library')));
    kids.push(h('p', { class: 'muted', style: { margin: 0, fontSize: '12.5px' } }, 'Stored only on this phone. Turn it off or delete it in Settings.'));
    body.replaceChildren(...kids);
  }

  return {
    el, title: 'Your journey',
    enter() { world.dim(true); world.place({ x: 84, y: 9, scale: 0.3 }); world.setStage('resting'); render(); },
  };
}
