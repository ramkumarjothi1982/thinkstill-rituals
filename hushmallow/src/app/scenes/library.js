// LIBRARY — every ritual in this person's plan, to browse and play directly.
// Search, filter by category or Mallow, and see what's been finished (✓).
// The Saved tab is the straight path back to anything the person saved.
import { h, iconBtn, toast } from '../ui.js';
import { RITUALS } from '../../data/rituals.js';
import { AVAILABLE } from '../../rituals/index.js';
import { allowedFor } from '../../engine/recommend.js';
import { MALLOWS, MALLOW_IDS } from '../../mallows/registry.js';
import { playItem } from '../play-item.js';
import { playedSet } from '../../engine/played.js';

const FAMILY_LABEL = {
  regulation: 'Anger & heat', reflection: 'Envy & any feeling', 'grief-comfort': 'Sadness & grief', 'self-compassion': 'Shame & guilt',
  'problem-solving': 'Confusion & choices', celebration: 'Joy & savouring', release: 'Restless energy', grounding: 'Anxiety & worry',
  rest: 'Tired & low', reframing: 'Another Angle (Reframe)',
};
const PAGE = 80;
const cap = (x) => (x ? x[0].toUpperCase() + x.slice(1) : x);

export default function library(app, params = {}) {
  const { world, ent } = app;
  const rituals = RITUALS.filter((r) => allowedFor(r, ent.flags()) && AVAILABLE.has(r.module));
  let tab = params.tab || 'rituals';
  let cat = 'all', mallow = 'all', onlyNew = false, query = '', shown = PAGE;
  let played = playedSet(app.store);

  const countEl = h('span', { class: 'eyebrow', style: { color: 'var(--text-1)' } });
  const tabs = h('div', { class: 'chips', role: 'tablist', style: { marginTop: '10px' } });
  const search = h('input', { class: 'search', type: 'search', placeholder: 'Search by name or idea…', 'aria-label': 'Search the library' });
  const catRow = h('div', { class: 'chips scroll', role: 'group', 'aria-label': 'Category' });
  const mallowRow = h('div', { class: 'chips scroll', role: 'group', 'aria-label': 'Mallow' });
  const newBtn = h('button', { class: 'chip', 'aria-pressed': 'false' }, 'Not played yet');
  const list = h('div', { role: 'list', style: { marginTop: '6px' } });
  const more = h('button', { class: 'btn ghost block' }, 'Show more');

  const el = h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%' } },
    h('div', { class: 'topbar' }, iconBtn('back', 'Back', () => app.back()), h('div', { class: 'grow' }), countEl),
    h('div', { class: 'card', style: { marginTop: '10px', padding: '14px', display: 'flex', flexDirection: 'column', minHeight: '0', flex: '1' } },
      h('h1', { class: 'title', style: { fontSize: '26px' } }, 'Library'),
      h('p', { class: 'muted', style: { margin: '4px 0 0' } }, 'Everything in your plan. Tap one to play it.'),
      tabs,
      h('div', { style: { marginTop: '10px' } }, search),
      h('div', { style: { marginTop: '8px', display: 'grid', gap: '6px' } }, catRow, mallowRow),
      h('div', { style: { overflowY: 'auto', flex: '1', minHeight: '0', marginTop: '6px' } }, list, more)));

  // the 1,000 rituals are grouped by the feeling they were made for; the ten
  // signature rituals and Another Angle keep their own groups
  const catOf = (r) => (r.params?.v3 ? [`feel:${r.params.v3.primary}`, cap(r.params.v3.primary)] : r.family === 'reframing' ? ['reframing', FAMILY_LABEL.reframing] : ['signature', 'Signature rituals']);
  const ritualItems = () => rituals.map((r) => { const [c, label] = catOf(r); return { id: r.id, kind: 'ritual', name: r.name, mallow: r.mallows[0], cat: c, catLabel: label,
    sub: r.purpose, mins: Math.max(1, Math.round(r.durationSec / 60)), ultra: (r.tier || 'paid') === 'ultra', ref: r,
    extra: r.params?.v3 ? `${r.code} ${r.params.v3.secondary} ${r.family}` : '' }; });
  const savedIds = () => app.rec.favourites();
  const savedItems = () => { const ids = savedIds(); const all = ritualItems(); return ids.map((id) => all.find((x) => x.id === id)).filter(Boolean); };
  const items = () => (tab === 'saved' ? savedItems() : ritualItems());

  function filtered() {
    const q = query.trim().toLowerCase();
    return items().filter((x) => (cat === 'all' || x.cat === cat) && (mallow === 'all' || x.mallow === mallow) && (!onlyNew || !played.has(x.id)) &&
      (!q || `${x.name} ${x.sub} ${x.catLabel} ${x.extra || ''} ${MALLOWS[x.mallow].name}`.toLowerCase().includes(q)));
  }

  function chip(label, on, onclick) { return h('button', { class: 'chip', 'aria-pressed': String(on), onclick }, label); }

  function renderTabs() {
    const ritualCount = rituals.length;
    tabs.replaceChildren(
      chip(`★ Saved · ${savedItems().length}`, tab === 'saved', () => switchTab('saved')),
      chip(`Rituals · ${ritualCount}`, tab === 'rituals', () => switchTab('rituals')));
    const all = ritualCount;
    const done = [...played].filter((id) => rituals.some((r) => r.id === id)).length;
    countEl.textContent = `Played ${done} of ${all}`;
  }

  function renderFilters() {
    const counts = new Map();
    for (const x of items()) counts.set(x.cat, (counts.get(x.cat) || 0) + 1);
    const cats = [...new Map(items().map((x) => [x.cat, x.catLabel])).entries()].sort((a, b) => counts.get(b[0]) - counts.get(a[0]));
    catRow.replaceChildren(chip('All', cat === 'all', () => { cat = 'all'; refresh(); }),
      ...cats.map(([id, label]) => chip(label, cat === id, () => { cat = id; refresh(); })));
    const ms = MALLOW_IDS.filter((m) => items().some((x) => x.mallow === m));
    newBtn.setAttribute('aria-pressed', String(onlyNew));
    newBtn.onclick = () => { onlyNew = !onlyNew; refresh(); };
    mallowRow.replaceChildren(chip('All Mallows', mallow === 'all', () => { mallow = 'all'; refresh(); }),
      ...ms.map((m) => chip(MALLOWS[m].name, mallow === m, () => { mallow = m; refresh(); })), newBtn);
  }

  function renderList() {
    const xs = filtered();
    const rows = xs.slice(0, shown).map((x) => h('button', { class: 'emo-row', role: 'listitem', 'aria-label': `${x.name}, ${MALLOWS[x.mallow].name}, ${x.catLabel}${played.has(x.id) ? ', played' : ''}`, onclick: () => play(x) },
      h('div', { style: { minWidth: '0' } },
        h('div', { class: 'n' }, x.name, x.ultra ? h('span', { class: 'badge', style: { marginLeft: '8px', fontSize: '10px', padding: '2px 7px', borderRadius: '999px', background: 'linear-gradient(120deg,#7a3cff,#c414e6)', color: '#fff', verticalAlign: '2px' } }, 'ULTRA') : null),
        h('div', { class: 'b' }, `${MALLOWS[x.mallow].name} · ${x.catLabel} · ~${x.mins} min`),
        h('div', { class: 'b', style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, x.sub)),
      h('span', { class: 'tick', 'aria-hidden': 'true', style: played.has(x.id) ? { background: 'var(--accent)', borderColor: 'transparent', color: 'var(--text-on-accent)' } : {} }, played.has(x.id) ? '✓' : '')));
    const empty = tab === 'saved' && !savedIds().length
      ? 'Nothing saved yet. When a ritual ends, tap “Save” and it will wait for you here.'
      : 'Nothing matches. Try fewer filters.';
    list.replaceChildren(...(rows.length ? rows : [h('p', { class: 'muted', style: { padding: '12px 4px' } }, empty)]));
    more.style.display = xs.length > shown ? '' : 'none';
    more.textContent = `Show more (${xs.length - shown} left)`;
  }

  function refresh() { shown = PAGE; renderTabs(); renderFilters(); renderList(); }
  function switchTab(t) { tab = t; cat = 'all'; mallow = 'all'; app.audio.ui('toggle'); refresh(); }
  more.onclick = () => { shown += PAGE; renderList(); };
  let tmr = 0;
  search.addEventListener('input', () => { clearTimeout(tmr); tmr = setTimeout(() => { query = search.value; shown = PAGE; renderList(); }, 120); });

  function play(x) { playItem(app, x); }

  return {
    el, title: 'Library',
    async enter() {
      if (!ent.has('paid')) { app.go('plans', { reason: 'start' }, { replace: true }); return; }
      world.dim(true);
      world.place({ x: 84, y: 9, scale: 0.3 });
      world.setStage('curious');
      refresh();
      played = playedSet(app.store);
      refresh();
    },
  };
}
