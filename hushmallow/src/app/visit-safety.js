// The visit's heavy level, for this tab only (sessionStorage), so a reload after a crisis or a care disclosure is
// still the same gentle visit: the Support pill stays, the Mallow keeps its attentive face, nothing greets playfully,
// no world is offered to pick up, and the calm line is not said a second time.
//
// Only what routing across a reload needs is kept — { level, crisisSpoken, abuseFirst?, noWorld?, noResume?, liftable?, at }
// — never the words, nothing about them, and (fix round) not the reading's category either: only how the visit routes.
//   abuseFirst  the support sheet leads with Find A Helpline and the emergency number (what someone did to them)
//   noWorld     no world is offered at all, not even somewhere calm (a death care, or support first)
//   noResume    the world they were in is never offered back (a loss told)
//   liftable    distress alone: the next Tell is asked the check-in, and "I'm okay — let's play" lifts it
// Nothing in localStorage: it goes when the tab closes, and it lapses after MAX_AGE_MS (a tab left open for days is a new
// visit). The level only rises while it is kept (the Hushfold's own rule for a visit). forgetVisitSafety() clears it (the
// check-in's "I'm okay" after distress alone; "Delete everything").

export const VISIT_SAFETY_KEY = 'hm2:visit-safety';
export const MAX_AGE_MS = 12 * 60 * 60 * 1000;
const LEVELS = ['none', 'concern', 'care', 'crisis'];
/** The routing flags a reload keeps (booleans only: never a category, never anything typed). */
export const VISIT_FLAGS = Object.freeze(['abuseFirst', 'noWorld', 'noResume', 'liftable']);

const session = () => { try { return globalThis.sessionStorage || null; } catch { return null; } };

/** Only the routing flags that are set, as true (anything else — a category, anything typed — is never kept). */
export function visitFlags(s = {}) {
  const out = {};
  for (const k of VISIT_FLAGS) if (s?.[k] === true) out[k] = true;
  return out;
}

/** The kept level, or null (none, lapsed, unreadable or not one of ours). */
export function recallVisitSafety({ ss = session(), now = Date.now() } = {}) {
  let v = null;
  try { v = JSON.parse(ss?.getItem(VISIT_SAFETY_KEY) || 'null'); } catch { v = null; }
  if (!v || typeof v !== 'object' || LEVELS.indexOf(v.level) < 1) return null;
  if (!(Number.isFinite(v.at) && now - v.at >= 0 && now - v.at <= MAX_AGE_MS)) { forgetVisitSafety({ ss }); return null; }
  return { level: v.level, crisisSpoken: v.crisisSpoken === true, ...visitFlags(v) };
}

/**
 * Keep `{ level, crisisSpoken, ...routing flags }` for this tab (any other field — a category, anything typed — is
 * ignored); a lower level never replaces a higher one. The flags accumulate for the visit, except `liftable`: it is the
 * visit's own latest reading of itself (distress alone), so it never outlives something heavier.
 */
export function rememberVisitSafety(s, { ss = session(), now = Date.now() } = {}) {
  if (!s || LEVELS.indexOf(s.level) < 1 || !ss) return false;
  const was = recallVisitSafety({ ss, now });
  const up = !was || LEVELS.indexOf(s.level) >= LEVELS.indexOf(was.level);
  const flags = visitFlags(s), old = was ? visitFlags(was) : {};
  const v = {
    level: up ? s.level : was.level,
    crisisSpoken: !!s.crisisSpoken || !!was?.crisisSpoken,
    ...(flags.abuseFirst || old.abuseFirst ? { abuseFirst: true } : {}),
    ...(flags.noWorld || old.noWorld ? { noWorld: true } : {}),
    ...(flags.noResume || old.noResume ? { noResume: true } : {}),
    ...(flags.liftable && up && s.level === 'concern' ? { liftable: true } : {}),
    at: now,
  };
  try { ss.setItem(VISIT_SAFETY_KEY, JSON.stringify(v)); return true; } catch { return false; }
}

export function forgetVisitSafety({ ss = session() } = {}) {
  try { ss?.removeItem(VISIT_SAFETY_KEY); } catch { /* storage blocked */ }
}
