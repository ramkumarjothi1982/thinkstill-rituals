// TESTING ONLY — shown on test hosts (src/app/config.js). One panel on Home:
// type an issue, step ◀ PREV / NEXT ▶ through every ritual in the plan, and play the selected one with that issue. Needs no plan:
// it switches on a free test Ultra plan by itself.
import { h, say, clearBubble, toast } from './ui.js';
import { BUILD } from './config.js';
import { planItems, playItem } from './play-item.js';
import { interpret } from '../engine/interpret.js';
import { MALLOWS } from '../mallows/registry.js';
import { photoTray } from '../v3/tray.js';

export function testPanel(app) {
  const { world, ent } = app;
  let items = null;
  const key = () => `test-step-${ent.tier()}`;
  const nameOf = (it) => (it.ref.code ? `${it.ref.code} · ${it.ref.name}` : it.ref.name);

  const issue = h('input', { class: 'search', type: 'text', placeholder: 'Type your issue (optional)…', 'aria-label': 'Test issue',
    value: app.store.get('test-issue', ''), style: { minHeight: '44px' } });
  issue.addEventListener('input', () => app.store.set('test-issue', issue.value));
  const num = h('div', { style: { color: '#ffd98a', font: '800 12px var(--font-ui)', letterSpacing: '.08em' } }, '…');
  const name = h('div', { style: { font: '700 15px var(--font-ui)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, 'Press NEXT ▶ for #1');
  const big = (label, aria, fn) => h('button', { class: 'btn', 'aria-label': aria, style: { minHeight: '48px', padding: '0 14px', flex: '0 0 auto' }, onclick: fn }, label);
  const play = h('button', { class: 'btn primary block', disabled: true, onclick: () => go() }, '▶ Play this one');
  const tray = photoTray({ note: false });

  const el = h('div', { 'data-test-panel': '', style: { marginTop: '10px', padding: '10px', borderRadius: '20px', display: 'grid', gap: '8px',
    background: 'rgba(14,10,40,.78)', border: '1.5px dashed rgba(255,217,138,.75)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' } },
  h('div', { style: { display: 'flex', justifyContent: 'space-between', font: '800 11px var(--font-ui)', letterSpacing: '.1em', color: '#ffd98a' } },
    h('span', {}, 'TEST MODE'), h('span', { style: { opacity: 0.8 } }, BUILD)),
  issue,
  tray.el,
  h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } },
    big('◀ PREV', 'Test: previous ritual', () => step(-1)),
    h('div', { style: { flex: '1', minWidth: '0', textAlign: 'center' } }, num, name),
    big('NEXT ▶', 'Test: next ritual', () => step(1))),
  play);

  async function ensurePlan() {
    if (!ent.has('ultra')) { await ent.purchase('ultra'); toast('Test Ultra switched on (free)'); items = null; }
    items ||= await planItems(app);
  }
  async function paint() {
    items ||= ent.has('paid') ? await planItems(app) : [];
    const n = app.store.get(key(), 0);
    num.textContent = `#${n} / ${items.length || '…'}`;
    name.textContent = n && items[n - 1] ? nameOf(items[n - 1]) : 'Press NEXT ▶ for #1';
    play.disabled = !(n && items[n - 1]);
  }
  async function step(dir) {
    await ensurePlan();
    const n = Math.min(items.length, Math.max(1, app.store.get(key(), 0) + dir));
    app.store.set(key(), n);
    await paint();
    const it = items[n - 1];
    const mid = it.ref.mallows[0];
    app.state.homeMallow = mid;
    app.audio.ui('toggle');
    clearBubble();
    await Promise.all([world.setRealm(MALLOWS[mid].realm), world.setMallow(mid)]);
  }
  async function go() {
    await ensurePlan();
    const it = items[app.store.get(key(), 0) - 1];
    if (!it) return;
    const text = issue.value.trim();
    const input = text ? { ...interpret(text), text } : null;
    clearBubble();
    playItem(app, it, input);
  }
  paint();
  return { el, step, destroy: tray.destroy };
}
