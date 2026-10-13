// The visit's heavy level, for this tab only (sessionStorage), so a reload after a crisis or a care disclosure is
// still the same gentle visit: the Support pill stays, the Mallow keeps its attentive face, nothing greets playfully,
// no world is offered to pick up, and the calm line is not said a second time.
//
// Only the level is kept — { level, category, crisisSpoken, at } — never the words, nothing about them, and
// nothing in localStorage: it goes when the tab closes, and it lapses after MAX_AGE_MS (a tab left open for days is
// a new visit). The level only rises while it is kept (the Hushfold's own rule for a visit).

export const VISIT_SAFETY_KEY = 'hm2:visit-safety';
export const MAX_AGE_MS = 12 * 60 * 60 * 1000;
const LEVELS = ['none', 'concern', 'care', 'crisis'];
const CATEGORY = /^[a-z][a-z-]{0,31}$/;

const session = () => { try { return globalThis.sessionStorage || null; } catch { return null; } };

/** The kept level, or null (none, lapsed, unreadable or not one of ours). */
export function recallVisitSafety({ ss = session(), now = Date.now() } = {}) {
  let v = null;
  try { v = JSON.parse(ss?.getItem(VISIT_SAFETY_KEY) || 'null'); } catch { v = null; }
  if (!v || typeof v !== 'object' || LEVELS.indexOf(v.level) < 1) return null;
  if (!(Number.isFinite(v.at) && now - v.at >= 0 && now - v.at <= MAX_AGE_MS)) { forgetVisitSafety({ ss }); return null; }
  return { level: v.level, category: typeof v.category === 'string' && CATEGORY.test(v.category) ? v.category : null, crisisSpoken: v.crisisSpoken === true };
}

/** Keep `{ level, category, crisisSpoken }` for this tab (any other field is ignored); a lower level never replaces a higher one. */
export function rememberVisitSafety(s, { ss = session(), now = Date.now() } = {}) {
  if (!s || LEVELS.indexOf(s.level) < 1 || !ss) return false;
  const was = recallVisitSafety({ ss, now });
  const up = !was || LEVELS.indexOf(s.level) >= LEVELS.indexOf(was.level);
  const v = {
    level: up ? s.level : was.level,
    category: up ? (typeof s.category === 'string' && CATEGORY.test(s.category) ? s.category : null) : was.category,
    crisisSpoken: !!s.crisisSpoken || !!was?.crisisSpoken,
    at: now,
  };
  try { ss.setItem(VISIT_SAFETY_KEY, JSON.stringify(v)); return true; } catch { return false; }
}

export function forgetVisitSafety({ ss = session() } = {}) {
  try { ss?.removeItem(VISIT_SAFETY_KEY); } catch { /* storage blocked */ }
}
