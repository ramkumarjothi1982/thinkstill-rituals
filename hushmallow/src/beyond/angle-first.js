// Another Angle: what happens first after Send (owner decision 'Ask before every world', 14 Oct 2026).
//
// A fresh reviewer showed that word lists keep missing ways to say that someone died, so the person chooses: after every
// Tell, before anything is sent to the server and before any Thought Mallow, framing or mechanic, Zuzu asks one gentle
// choice, "Shall we look at this from another angle, or just be with it?" (lines.js ANGLE_CHOICE). One extra tap for
// everyone, so a death is never played without the person choosing it.
//
//   Another angle   → as before: the server (with consent) or Zuzu's own angle, its mechanic and framing
//   Just be with it → (r2-angle item 5) a quiet path of its own (lines.js BE_WITH: "Okay. Let's just be with it for a while."),
//                     never the grief path: no mechanic, nothing sent, no support unless something heavy was seen, and the
//                     ordinary goodbye
//
// Detected losses (deathTalk, livingLoss, strongLoss, a chosen grief-family feeling: backstop.js lossRoute 'gentle') go
// straight to the gentle path with no question; crisis, care and the wish to follow someone who died route to support
// first (another-angle.js afterTell, before this is read). The question replaces the 'Ask when unsure' check-in ("Is this
// about losing someone?"): never two questions in a row.
//
// (r2-angle item 2) Only the gentle answers are remembered per text for the visit (answerKey): the check-in's "Yes, it is" keeps
// those words on the gentle path; "Another angle" is never remembered, so every new Tell is asked again, the same words included
// (only "Show me another angle", inside an angle already chosen, plays without asking). (r2-angle item 7) "Just be with it" is
// remembered but asked again too (BE_ASKS_AGAIN), as on the main screen: the person may change their mind about the same words,
// and the question itself is the safe step (nothing is sent or played before an answer).
//
//   ASK_BEFORE_ANGLE        → the owner's switch for Another Angle's question (true: asked after every Tell). Set it to false
//                             to switch the question off: the 'Ask when unsure' check-in comes back for the words it reads as
//                             unsure (lossRoute 'ask'), and every other Tell plays straight away, as before 14 Oct 2026.
//   BE_ASKS_AGAIN           → (r2-angle item 7) true: the same words after "Just be with it" are asked again (false: the quiet
//                             path again with no question)
//   answerKey(text)         → the words as an answer is remembered for them (case, apostrophes and punctuation aside)
//   firstStep(text, opts)   → 'gentle' | 'told' | 'be' | 'choice' | 'check-in' | 'play' (below)
//   questionClock(ms, done, deps) → (r2-angle item 6) the question's timer, never counted while the page is hidden → stop()
//   goodbye(state)          → (r2-angle item 5) what Finish says and sends home: { heavy, lines: 'safety' | 'end', params }
//
// Pure ES module, no DOM. Deterministic.

import { lossRoute } from './backstop.js';
import { norm } from './death-words.js';

/**
 * The owner's switch (owner decision 'Ask before every world', 14 Oct 2026): true, Zuzu asks "Shall we look at this from
 * another angle, or just be with it?" after every Tell that is not a detected loss, crisis or care. false switches Another
 * Angle's question off (the 'Ask when unsure' check-in instead, only for unsure words).
 */
export const ASK_BEFORE_ANGLE = true;

/** The words an answer is remembered for: "We had to let our dog go." and "we had to let our dog go" are the same. */
export function answerKey(text) {
  return norm(text).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

/** (r2-angle item 7) The same words after "Just be with it" are asked again (as on the main screen). */
export const BE_ASKS_AGAIN = true;

/**
 * What Another Angle does first for these words (after crisis, care and an escalation, which the caller reads first):
 *   'gentle'   a detected loss (lossRoute 'gentle'): the gentle path, no question
 *   'told'     the check-in's "Yes, it is" earlier in the visit for these words: the gentle path (with sharing on its lines may
 *              come from the server, as before)
 *   'be'       (only with BE_ASKS_AGAIN off) "Just be with it" earlier in the visit for these words: its quiet path again
 *   'choice'   ask "Shall we look at this from another angle, or just be with it?" (ASK_BEFORE_ANGLE): every new Tell, the
 *              same words included (r2-angle item 2)
 *   'check-in' (only with the question switched off) ask "Is this about losing someone?" (lossRoute 'ask')
 *   'play'     the angle: only "Show me another angle" inside an angle they chose (`another`), or nothing to ask
 * `said`: the gentle answer remembered for these words ('be' | 'yes' | null; any other is ignored); `ask`: the switch;
 * `beAgain`: BE_ASKS_AGAIN.
 */
export function firstStep(text, { emotion = null, another = false, said = null, ask = ASK_BEFORE_ANGLE, beAgain = BE_ASKS_AGAIN } = {}) {
  const route = lossRoute(text, { emotion });
  if (route === 'gentle') return 'gentle';
  if (said === 'yes') return 'told';
  if (said === 'be' && !beAgain) return 'be';
  if (another) return 'play';
  if (ask) return 'choice';
  return route === 'ask' ? 'check-in' : 'play';
}

/** (r2-angle item 6) After the page comes back into view, at least this long is left to answer. */
export const QUESTION_BACK_MS = 10000;
/**
 * (r2-angle item 6) The question's timer: it runs only while the page is visible. Hidden, it stops; visible again, it carries
 * on with what was left (at least QUESTION_BACK_MS), so a person who looks away, reads slowly or uses a screen reader never
 * loses the question to a hidden page. `done` runs once, when the time is up. → stop() (idempotent)
 * deps (for tests): { doc = document, now = performance.now, setTimer = setTimeout, clearTimer = clearTimeout }
 */
export function questionClock(ms, done, { doc = typeof document !== 'undefined' ? document : null, now = () => performance.now(),
  setTimer = (fn, t) => setTimeout(fn, t), clearTimer = (t) => clearTimeout(t) } = {}) {
  let left = ms, t0 = 0, timer = 0, over = false;
  const hidden = () => !!doc?.hidden;
  const arm = () => { if (over || timer || hidden()) return; t0 = now(); timer = setTimer(() => { timer = 0; over = true; done(); }, left); };
  const pause = () => { if (!timer) return; clearTimer(timer); timer = 0; left = Math.max(QUESTION_BACK_MS, left - (now() - t0)); };
  const onVis = () => (hidden() ? pause() : arm());
  doc?.addEventListener?.('visibilitychange', onVis);
  arm();
  return () => { over = true; if (timer) clearTimer(timer); timer = 0; doc?.removeEventListener?.('visibilitychange', onVis); };
}

/**
 * (r2-angle item 5) What Finish says and sends home. Only crisis, care or the grief path (S.grief) are heavy: then "Go
 * gently." (lines 'safety') and the Hushfold keeps support close (params.safety); "Just be with it" for words where nothing
 * heavy was seen is not the grief path, so its goodbye is the ordinary one (lines 'end') and nothing is sent home ({}).
 */
export function goodbye({ level = 'none', crisis = false, care = false, grief = false } = {}) {
  const heavy = !!(crisis || care || grief);
  const lv = level && level !== 'none' ? level : grief ? 'concern' : 'none';
  return { heavy, lines: heavy ? 'safety' : 'end', params: lv !== 'none' ? { safety: { level: lv } } : {} };
}
