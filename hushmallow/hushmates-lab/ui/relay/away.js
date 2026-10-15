// AWAY: Hushmates couldn't be reached when it opened (offline, or the server
// is resting). Nothing is lost; the person can try again, and it tries by
// itself when the connection comes back.

import { h, icon } from '../dom.js';
import { MALLOWS } from '../mallows-data.js';
import { room, stage, Speech, line, put } from './parts.js';
import { supportPill } from './common.js';
import { startScene } from './start.js';

export function away(dev) {
  const m = MALLOWS[dev.state.me?.profile?.mallow] || MALLOWS.noomi;
  const r = room(m.id, 'hf-away', { seed: 5 });
  const st = stage(m.id, { size: 'm', label: `${m.name}, waiting with you` });
  const speech = new Speech(m.id);
  put(st.above, speech.el);
  speech.say('Let’s try again when you’re back online.');
  let busy = false;
  const again = h('button', { type: 'button', class: 'kit-btn kit-btn--ink kit-btn--block', dataset: { test: 'away-retry' }, onclick: () => retry() }, icon('refresh'), 'Try again');
  async function retry() {
    if (busy) return;
    busy = true; again.disabled = true;
    try {
      if (dev.env.retry) await dev.env.retry();
      else { await dev.client.refreshAll(); dev.start(startScene); }
    } catch {
      speech.say('Not yet. Let’s give it a moment.');
    } finally { busy = false; again.disabled = false; }
  }
  // the lines are part of the app, so support still opens offline (and tel: needs no internet)
  r.el.append(h('div', { class: 'hf-head' }, h('header', { class: 'rl-top' }, h('span', { class: 'rl-top-title' }), supportPill(dev))), h('div', { class: 'hf-scroll hf-deleted-scroll', dataset: { test: 'away' } },
    st.el,
    h('div', { class: 'hf-copy' },
      line('We can’t reach Hushmates just now', { cls: 'hf-line--sm' }),
      h('p', { class: 'hf-sub' }, 'Your feelings keep travelling while you’re offline. We’ll try again as soon as you’re back online.')),
    h('div', { class: 'hf-actions' }, again)));
  return { el: r.el, mood: 'calm', quiet: true, destroy() { st.destroy(); } };
}
