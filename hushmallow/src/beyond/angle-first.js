// Another Angle: what happens first after Send (owner decision 'Ask before every world', 14 Oct 2026).
//
// A fresh reviewer showed that word lists keep missing ways to say that someone died, so the person chooses: after every
// Tell, before anything is sent to the server and before any Thought Mallow, framing or mechanic, Zuzu asks one gentle
// choice, "Shall we look at this from another angle, or just be with it?" (lines.js ANGLE_CHOICE). One extra tap for
// everyone, so a death is never played without the person choosing it.
//
//   Another angle   → as before: the server (with consent) or Zuzu's own angle, its mechanic and framing
//   Just be with it → the gentle path's lines ("That sounds like a lot to carry." / "There's nothing to fix here…"), which
//                     never assume a death; no mechanic, nothing sent
//
// Detected losses (deathTalk, livingLoss, strongLoss, a chosen grief-family feeling: backstop.js lossRoute 'gentle') go
// straight to the gentle path with no question; crisis, care and the wish to follow someone who died route to support
// first (another-angle.js afterTell, before this is read). The question replaces the 'Ask when unsure' check-in ("Is this
// about losing someone?"): never two questions in a row.
//
// The answer is remembered per text for the visit (answerKey): the same words sent again after "Just be with it" (or the
// check-in's "Yes, it is") go to the gentle path again, never to a mechanic; after "Another angle" they play without asking.
//
//   ASK_BEFORE_ANGLE        → the owner's switch for Another Angle's question (true: asked after every Tell). Set it to false
//                             to switch the question off: the 'Ask when unsure' check-in comes back for the words it reads as
//                             unsure (lossRoute 'ask'), and every other Tell plays straight away, as before 14 Oct 2026.
//   answerKey(text)         → the words as an answer is remembered for them (case, apostrophes and punctuation aside)
//   firstStep(text, opts)   → 'gentle' | 'told' | 'be' | 'choice' | 'check-in' | 'play' (below)
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

/**
 * What Another Angle does first for these words (after crisis, care and an escalation, which the caller reads first):
 *   'gentle'   a detected loss (lossRoute 'gentle'): the gentle path, no question
 *   'told'     the check-in's "Yes, it is" earlier in the visit for these words: the gentle path (with sharing on its lines may
 *              come from the server, as before)
 *   'be'       "Just be with it" earlier in the visit for these words: the gentle path again, nothing sent
 *   'choice'   ask "Shall we look at this from another angle, or just be with it?" (ASK_BEFORE_ANGLE)
 *   'check-in' (only with the question switched off) ask "Is this about losing someone?" (lossRoute 'ask')
 *   'play'     the angle: "Another angle" (or "Something else") chosen for these words already, "Show me another angle"
 *              (`another`), or nothing to ask
 * `said`: the answer remembered for these words ('be' | 'yes' | 'angle' | 'else' | null); `ask`: the switch.
 */
export function firstStep(text, { emotion = null, another = false, said = null, ask = ASK_BEFORE_ANGLE } = {}) {
  const route = lossRoute(text, { emotion });
  if (route === 'gentle') return 'gentle';
  if (said === 'be') return 'be';
  if (said === 'yes') return 'told';
  if (another || said === 'angle' || said === 'else') return 'play';
  if (ask) return 'choice';
  return route === 'ask' ? 'check-in' : 'play';
}
