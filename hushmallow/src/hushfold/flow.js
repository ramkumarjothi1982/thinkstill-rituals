// Hushflow: which world comes next, and remembering where you were.
// Deterministic and rule-based: the person's chosen feeling and intention,
// their favourite world, and what they played least recently. No AI, no
// randomness that could feel manipulative.

import { PLAYABLE, worldById } from './data/worlds.js';

const KEY = 'hushflow';
const GARDEN = 'garden';

/** Ordered playable worlds for a feeling + intention. */
export function planFlow({ feeling = 'other', intention = 'calm', favourite = null, lastPlayed = {} } = {}) {
  const score = (w) => {
    let s = 0;
    if (w.feelings.includes(feeling)) s += 4 - Math.min(3, w.feelings.indexOf(feeling)) * 0.2;
    if (w.intentions.includes(intention)) s += 2;
    if (w.id === 'moonmilk-rest') s -= 3;        // a rest stop, never the opening world
    if (w.id === favourite) s += 1.5;
    return s;
  };
  return PLAYABLE
    .map((w, i) => ({ w, s: score(w), last: lastPlayed[w.id] || 0, i }))
    .filter((x) => x.s > 0 || x.w.id === 'moonmilk-rest')
    .sort((a, b) => b.s - a.s || a.last - b.last || a.i - b.i)
    .map((x) => x.w.id);
}

/** The world after `current` in the plan (wraps; never repeats `current` while others exist). */
export function nextWorld(plan, current) {
  if (!plan.length) return null;
  const i = plan.indexOf(current);
  const next = plan[(i + 1) % plan.length];
  return next === current ? null : next;
}

export function createFlowStore(store) {
  const get = () => store.get(KEY, { autoflow: true, favourite: null, lastPlayed: {}, saved: null, speed: 1, feeling: null, intention: 'calm' });
  const put = (patch) => { const s = { ...get(), ...patch }; store.set(KEY, s); return s; };
  return {
    get,
    set: put,
    markPlayed(id) { const s = get(); put({ lastPlayed: { ...s.lastPlayed, [id]: Date.now() } }); },
    /** Save a resumable point. Words are kept only if the person allowed it. */
    save({ world, feeling, intention, text = '', keepWords = false }) {
      put({ saved: { world, feeling, intention, text: keepWords ? text : '', at: Date.now() } });
    },
    clearSaved() { put({ saved: null }); },
    garden() { return store.get(GARDEN, []); },
    hasSkill(id) { return store.get(GARDEN, []).some((g) => g.id === id); },
    saveSkill(id, world) {
      const g = store.get(GARDEN, []);
      if (g.some((x) => x.id === id)) return false;
      store.set(GARDEN, [...g, { id, world, at: Date.now(), practised: 1 }]);
      return true;
    },
    practised(id) {
      const g = store.get(GARDEN, []);
      store.set(GARDEN, g.map((x) => (x.id === id ? { ...x, practised: (x.practised || 1) + 1, last: Date.now() } : x)));
    },
  };
}

export { worldById };
