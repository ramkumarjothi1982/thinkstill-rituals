// Another Angle: the backstop for the fact-vs-guess framing (review round 7, part C).
//
// Independently of deathTalk, no path ever frames the person's own words as a fact and a guess ("what
// happened" / "what your mind added", "what it means is still an open question", "one way to read it",
// "Want to test it?", "Could there be another explanation?", the worst case shrunk to size, another meaning
// opened) when the words carry a death or harm word. That covers pull_apart, shrink_projection and
// open_interpretations, the authored fact-and-guess pair and step (authored.js ownFactPair, ownStep), the
// explore prompts, and authored and server scenes alike (another-angle.js routes them all through here).
//
//   harmWords(text)      → true when the words carry a death or harm word (whole words, apostrophes optional)
//   harmRoute(text)      → null (no such word) | 'kind' (only inside an ordinary idiom: "lost my keys", "my
//                          phone died", "my mum will kill me") | 'gentle' (anything else)
//   framingAllowed(text) → false for death talk, someone alive but going, and any harm word: never the framing
//   gentleRoute(text)    → true for the words the gentle path answers (death talk, livingLoss, 'gentle')
//   FRAMING_MECHANICS    → the mechanics that play the framing
//   framesAsGuess(line)  → true when a line frames what was said as a guess, or sends it to be checked
//
// 'gentle' is the gentle path (lines.js GRIEF: nothing to fix, nothing assumed); 'kind' is the kind-step
// mechanics (assemble_step, soften_harshness, separate_one) with a feeling's own safe lines.
//
// Pure ES module, no DOM. Deterministic.

import { norm, blankOrdinary } from './death-words.js';
import { deathTalk, livingLoss } from './grief.js';

/** The broad set: death, harm, hospital, an accident (whole words, read with every apostrophe taken out). */
export const HARM_WORDS = /\b(?:die|dies|died|dying|dead|death|deaths|kill|kills|killed|killing|murder|murders|murdered|funeral|funerals|grave|graves|passed|passing|lost|losing|gone|grief|grieving|grieve|bury|buried|burial|hospital|hospitals|cancer|terminal|miscarriage|miscarried|accident|accidents|crash|crashed|assault|assaulted|attack|attacked|abused|abuse|raped|rape|stabbed|suicide|overdose|overdosed)\b/iu;

/** True when the words carry a death or harm word (an idiom too: "lost my keys" is still a harm word here). */
export function harmWords(text) {
  return HARM_WORDS.test(norm(text));
}
/** null: no harm word; 'kind': only inside an ordinary idiom; 'gentle': anything else. */
export function harmRoute(text) {
  const t = norm(text);
  if (!HARM_WORDS.test(t)) return null;
  return HARM_WORDS.test(blankOrdinary(t)) ? 'gentle' : 'kind';
}
/** The fact-vs-guess framing may be used for these words: never for death talk, never beside a harm word. */
export function framingAllowed(text) {
  return !harmWords(text) && !deathTalk(text) && !livingLoss(text);
}
/**
 * The gentle path's words: death talk, someone alive but going (livingLoss), or a harm word no ordinary idiom
 * explains ("my mum's in hospital"). Never a mechanic, never a fact/assumption split, lines that assume nothing.
 */
export function gentleRoute(text) {
  return !!deathTalk(text) || livingLoss(text) || harmRoute(text) === 'gentle';
}
/** The mechanics that frame the words as a fact and a guess, a worst case, or one meaning among others. */
export const FRAMING_MECHANICS = Object.freeze(new Set(['pull_apart', 'shrink_projection', 'open_interpretations']));

/** Lines that frame what was said as a guess about what happened, or send it to be checked. */
const FRAMES = /what (?:your|the) mind (?:added|adds|might be adding|is adding)|one way to read|is what happened|the part that (?:actually )?happened|check (?:one|a|the) facts?|instead of guessing|what do you actually know|what did you actually (?:see|hear)|(?:still )?an open question|still a question|want to test|another explanation|other explanations?|is (?:just )?a guess|your first guess|the worst case|worst case is|facts are (?:still )?unclear|what it means is|might mean something else|could mean something else|fact[- ]check/i;
export const framesAsGuess = (line) => FRAMES.test(String(line || ''));
