// Safety probes from the final QA sweep (13 Oct 2026): plain statements of
// being in danger ("I'm not safe", "I'm afraid he'll hurt me") and distress
// phrases ("I hate myself", "I made myself throw up", "I'm having a panic
// attack") that the shared lexicon (src/data/safety-lexicon.js) read as none.
// Used by tests/safety-qa.test.mjs, and kept byte for byte in
// server/another-angle/test/safety-qa.probes.mjs for the server's pre-check
// (its test compares the two when the app is in the checkout).

/** [text, level, category]: what the app's checkText gives (the server gives at least this level). */
export const POSITIVE = [
  // blocking: plain statements of being in danger (care, unsafe)
  ["I'm not safe", 'care', 'unsafe'],
  ['I am not safe', 'care', 'unsafe'],
  ["i'm not safe here", 'care', 'unsafe'],
  ["I'm afraid he'll hurt me", 'care', 'unsafe'],
  ["I'm really not safe", 'care', 'unsafe'],
  ['im not safe at all', 'care', 'unsafe'],
  ["I'm not safe to be around him", 'care', 'unsafe'],
  ["I don't think I'm safe", 'care', 'unsafe'],
  ["I'm not feeling safe", 'care', 'unsafe'],
  ['I never feel safe', 'care', 'unsafe'],
  ['I feel unsafe', 'care', 'unsafe'],
  ["I'm scared for my safety", 'care', 'unsafe'],
  ["I'm scared he'll hit me", 'care', 'unsafe'],
  ["I'm terrified she'll hurt me", 'care', 'unsafe'],
  ["I'm afraid my dad will hurt me", 'care', 'unsafe'],
  ["i'm scared he's going to kill me", 'care', 'unsafe'],
  ["I'm scared of what he'll do to me", 'care', 'unsafe'],
  ["I'm afraid my partner will hit me again", 'care', 'unsafe'],
  ['I am frightened he might hurt me', 'care', 'unsafe'],
  ["I'm worried my boyfriend will hurt me", 'care', 'unsafe'],
  ["I'm scared my husband will kill me", 'care', 'unsafe'],
  // major: distress phrases (concern, distress at least)
  ['I hate myself', 'concern', 'distress'],
  ['I hate myself so much', 'concern', 'distress'],
  ['I really hate myself', 'concern', 'distress'],
  ["I'm a failure and I hate me", 'concern', 'distress'],
  ['I made myself throw up', 'concern', 'distress'],
  ["I'm all alone and I can't take it", 'concern', 'distress'],
  ["I'm having a panic attack", 'concern', 'distress'],
  ["I can't breathe I'm panicking", 'concern', 'distress'],
  ['I really, really hate myself', 'concern', 'distress'],
  ['I fucking hate myself', 'concern', 'distress'],
  ["I've always hated myself", 'concern', 'distress'],
  ['I hate who I am', 'concern', 'distress'],
  ['I hate everything about myself', 'concern', 'distress'],
  ['I keep hating myself', 'concern', 'distress'],
  ['so much self-loathing tonight', 'concern', 'distress'],
  ["I've been making myself sick after meals", 'concern', 'distress'],
  ["I've been purging again", 'concern', 'distress'],
  ['I make myself throw up after I eat', 'concern', 'distress'],
  ['I threw up on purpose', 'concern', 'distress'],
  ['I forced myself to be sick', 'concern', 'distress'],
  ['I stuck my fingers down my throat', 'concern', 'distress'],
  ['my bulimia is back', 'concern', 'distress'],
  ["I can't take it", 'concern', 'distress'],
  ['I just cant take it any longer', 'concern', 'distress'],
  ["I can't handle it anymore", 'concern', 'distress'],
  ['I had a panic attack at work', 'concern', 'distress'],
  ["I'm panicking", 'concern', 'distress'],
  ["I can't breathe", 'concern', 'distress'],
  ["I think I'm hyperventilating", 'concern', 'distress'],
  ['another anxiety attack', 'concern', 'distress'],
  ["I'm starting to panic", 'concern', 'distress'],
  // acceptable by the owner's brief: self-hatred about cake and panic about a deadline keep support close too
  ['I hate myself for eating all the cake', 'concern', 'distress'],
  ["I'm panicking about the deadline", 'concern', 'distress'],
  // cutting at the start of a sentence (the server's rule, now shared)
  ['Cutting again. I hate myself.', 'crisis', 'self-harm'],
];

/** Everyday wording that stays none, in the app and on the server. */
export const NEGATIVE = [
  'not safe to drive in this snow', 'the bridge is not safe', 'is it safe', 'is it safe to eat this?', "I'm not safe to drive after that wine",
  'the roads are not safe tonight', "it's not safe to swim here", "I'm safe now", "we're not safe from relegation yet", "I'm not safe around cake lol",
  'my dog is not safe off the lead', 'Is it safe to say I am happy?', "I'm scared my mum will kill me when she sees my grades",
  "I'm afraid I'll hurt his feelings", "I'd hate myself if I missed it", 'I hate meetings', 'they hate me', 'I hate Mondays', "she'll hate me for this",
  'I hate my selfie', 'I made myself a sandwich', "I've made myself sick with worry", 'I made myself sick laughing', 'purging my wardrobe',
  'the purge film was scary', "I can't take it with me", "I can't take it back to the shop", "I can't take this job", "I can't take it seriously",
  "I can't take it off", 'you can\'t take it personally', "Crying shows you cared, not that you can't take it.", "I can't breathe through my nose",
  "I can't breathe in this mask", "laughing so hard I can't breathe", "lol I can't breathe", 'Panic over, found my keys', "don't panic",
  'panic buying again', 'I panicked and said yes', "I'm all alone this weekend", "I'm a failure at baking lol",
  'Avoid forced breath holding or hyperventilation.', "I'm not hating it",
];

/** Everyday wording the app reads as none; the server's own extra rules may still flag it. */
export const NEGATIVE_APP_ONLY = [
  "I'm afraid he'll beat me at chess", "I'm scared she'll hit me up again",
];
