// Another Angle — every authored word the experience says itself.
//
// Zuzu's voice: warm, sharp, lightly playful where it fits, never jokey with
// heavy feelings. British spelling. Non-clinical. No promises of relief. The
// brand language rule holds everywhere here: the experience is Zuzu, the
// Mallows, thoughts and perspectives, never the technology behind them.
// Lines are one short sentence each (subtitles show one at a time).
//
// Pure data + tiny helpers. No DOM.

/** While the scene is being prepared (no spinner, Zuzu keeps playing). */
export const WAITING = Object.freeze([
  'There’s another side to this…',
  'Let’s look a little closer.',
  'What else could be true?',
]);
/** Narration (no speaker) when it takes a little longer. */
export const WAITING_LONG = Object.freeze(['Zuzu is exploring another angle.', 'Still turning it round…']);

export const ARRIVAL = Object.freeze({
  first: ['Hello, you.', 'Something on your mind? Let’s turn it round and look at the other side.'],
  again: ['Back for another look?'],
  ask: 'Want to tell me what’s bothering you?',
  tell: 'Tell Zuzu',
  squeeze: 'Just squeeze',
  prompt: 'What’s bothering you?',
  justSqueeze: ['Squeeze away. I’m right here.', 'Whenever you like, tell me what’s on your mind.'],
  offline: 'Zuzu’s own angles, worked out right here.',
  /** Every few visits after "Not now": the consent notice again, only if they want it. */
  share: 'About sharing my words',
});

export const SAFETY = Object.freeze({
  crisis: ['This matters more than any angle.', 'Please talk to someone who can be with you now.'],
  care: ['That sounds like something that shouldn’t have happened.', 'This one deserves real support, not a new angle.'],
  careAsk: 'I’m staying right here. Want to see who can help?',
  careOptions: [{ label: 'See support', value: 'support', primary: true }, { label: 'Just squeeze Zuzu', value: 'squeeze' }],
  concern: 'That sounds heavy. Support is right there if you want it.',
  /** Finishing after crisis or care: calm, no jokes, no "another look". */
  finish: ['Go gently.', 'Support is one tap away whenever you need it.'],
});

export const UNCLEAR = Object.freeze({
  line: 'I’d love a few more words. What happened?',
  options: [{ label: 'Tell Zuzu more', value: 'tell', primary: true }, { label: 'Just squeeze', value: 'squeeze' }],
});

/** The thought arrives. */
export const THOUGHT = Object.freeze({ arrives: 'There it is. Let’s have a proper look.' });

/** Per mechanic: how to play (one line), the assist pill, the moment it lands, and labels drawn in the scene. */
export const MECHANIC_LINES = Object.freeze({
  pull_apart: {
    hint: 'These two are stuck together. Pull them apart.',
    assist: 'Ease them apart', done: 'There. Two different things.',
    labels: { fact: 'What happened', guess: 'What your mind added' },
  },
  shrink_projection: {
    hint: 'That worry’s been blown up big. Pinch it, or drag down on it, slowly.',
    slow: 'Slowly does it. It only shrinks when you take your time.',
    assist: 'Shrink it a little', done: 'That’s closer to life size.',
    labels: { big: 'The worst case', small: 'One possibility' },
  },
  return_responsibility: {
    hint: 'That’s a lot of weight on one thought. Move each piece to where it belongs.',
    assist: 'Move a piece', done: 'Your part is still yours. The rest can go back.',
    labels: { places: ['Other people', 'Circumstances', 'Timing', 'Your part'] },
  },
  reveal_spectrum: {
    hint: 'It feels like all or nothing. Sweep across the gap between them.',
    hint2: 'Now slide the thought to where it really sits.',
    assist: 'Reveal more', done: 'Somewhere in between. Most things live there.',
    labels: { left: 'All bad', right: 'All good', regions: ['All bad', 'Mostly hard', 'A mix', 'Mostly fine', 'All good'] },
  },
  open_interpretations: {
    hint: 'Your mind picked one meaning. Open the others too.',
    assist: 'Open one', done: 'None of these is the answer. They’re all still possible.',
    labels: { guess: 'Your first guess' },
    others: ['They might have something else on their mind.', 'They might not see it the way you fear.', 'They might not have meant it the way it landed.'],
  },
  separate_one: {
    hint: 'One moment has joined a whole pile. Lift it out on its own.',
    assist: 'Lift it out', done: 'One moment. Not every moment.',
    labels: { one: 'This time', rest: 'Other times' },
  },
  let_loop_drift: {
    hint: 'That thought keeps going round. Let it. Rest a finger on the stone instead.',
    hint2: 'Touching it only winds it up. Back to the stone.',
    assist: 'Rest for a breath', done: 'It can keep moving. You don’t have to ride it.',
    labels: { stone: 'Rest here' },
  },
  assemble_step: {
    hint: 'Here’s one small step, in pieces. Put it together.',
    assist: 'Add a piece', done: 'One step. That’s all it needs to be.',
    labels: { step: 'One small step' },
  },
  soften_harshness: {
    hint: 'That’s a harsh verdict. Smooth it slowly, the way you’d calm a friend.',
    hint2: 'Slower. Gentle strokes soften it.',
    hint3: 'Stroke slowly round the edge, where it’s sharpest.',
    assist: 'Smooth it', done: 'Softer. And the lesson’s still there.',
    labels: { core: 'Something to learn' },
  },
  find_boundary: {
    hint: 'That anger is pointing at something. Draw the line it needs.',
    hint2: 'What would that line ask for?',
    assist: 'Draw the line', done: 'That’s yours to choose. No forgiving required.',
    labels: { line: 'Your line' },
    responses: ['Say how it felt', 'Ask for a change', 'Take some distance', 'Decide later'],
  },
});

/** Authored subtitle pairs (offline path), when the engine's own angle has no second sentence. */
export const AUTHORED_PAIRS = Object.freeze({
  fact_vs_assumption: ['What happened is one thing.', 'What it means is still an open question.'],
  catastrophising: ['The worst case is one possibility.', 'There’s also a best case, and a most likely one.'],
  personalisation: ['Lots of things shaped how this went.', 'You might be one part of it, not the whole cause.'],
  all_or_nothing: ['Most things land somewhere between perfect and ruined.', 'Where on that line does this really sit?'],
  mind_reading: ['That’s a guess about what’s going on inside someone else.', 'Guesses can be right, and they can be wrong.'],
  overgeneralisation: ['This is one moment, even if it feels like a pattern.', 'Can you think of one time it went differently?'],
  rumination: ['Going over it again isn’t the same as fixing it.', 'Is there anything left to do, or can it rest for now?'],
  practical_problem: ['This is a real problem, and real problems have next steps.', 'What’s the smallest one you could take this week?'],
  self_criticism: ['That’s a harsh word for one moment.', 'You can own what happened without making it who you are.'],
  valid_anger: ['Being angry about this makes sense.', 'What would you want to say, ask for or protect, if you chose to respond?'],
});

/** Authored "another explanation" where a situation's own angles could soften a real wrong. */
export const AUTHORED_ALT = Object.freeze({
  valid_anger: 'Your anger might be pointing at something that really does need to change.',
});

/** "What would you tell a friend?" — authored, per pattern. */
export const FRIEND_LINES = Object.freeze({
  fact_vs_assumption: 'You’d probably tell a friend to check the facts before trusting the story.',
  catastrophising: 'You’d probably remind a friend that the worst case isn’t the only case.',
  personalisation: 'You’d probably tell a friend this isn’t all on them.',
  all_or_nothing: 'You’d probably tell a friend that partly good still counts.',
  mind_reading: 'You’d probably tell a friend they can’t know what someone else is thinking.',
  overgeneralisation: 'You’d probably remind a friend of the times it went differently.',
  rumination: 'You’d probably tell a friend they’ve thought about it enough for tonight.',
  practical_problem: 'You’d probably help a friend pick one doable thing and start there.',
  self_criticism: 'You’d probably be a lot kinder to a friend who said this about themselves.',
  valid_anger: 'You’d probably tell a friend their anger makes sense, and ask what they need.',
});

/** Explore prompts → which scene field each reveals. */
export const EXPLORE = Object.freeze([
  { id: 'know', label: 'What do you actually know?', field: 'known_fact' },
  { id: 'other', label: 'Could there be another explanation?', field: 'alternative_angle' },
  { id: 'friend', label: 'What would you tell a friend?', field: 'friend' },
  { id: 'action', label: 'Is there one useful action?', field: 'practical_next_step' },
]);
export const EXPLORE_ASK = 'Want to test it?';
export const EXPLORE_MORE = 'Anything else to look at?';
/** When a field is empty (e.g. nothing is being assumed). */
export const EXPLORE_EMPTY = Object.freeze({
  known_fact: 'What you know is what you told me. The rest is still open.',
  alternative_angle: 'There might be an explanation that hasn’t had a chance to come up yet.',
  practical_next_step: 'Sometimes the useful action is to pause, and let it settle.',
  possible_assumption: 'Nothing much is being assumed here. It’s just hard.',
});

export const FEEDBACK = Object.freeze({
  ask: 'How does that land?',
  options: [
    { label: 'That helped', value: 'helped', primary: true },
    { label: 'Show me another angle', value: 'another' },
    { label: 'Not relevant', value: 'notRelevant' },
    { label: 'I’d rather just squeeze a Mallow', value: 'squeeze' },
  ],
  helped: 'Glad. That one might be worth keeping.',
  another: ['Let’s turn it again.', 'A new perspective, coming round.'],
  notRelevant: 'Fair enough. Not every angle fits.',
  notRelevantAsk: 'Want a different one, or leave it there?',
  notRelevantOptions: [{ label: 'Show me another angle', value: 'another', primary: true }, { label: 'Leave it there', value: 'finish' }],
  squeeze: 'Of course. Squeeze as long as you like.',
  noMore: 'That’s every angle I’ve got for this one, for now.',
});

export const END = Object.freeze({
  ask: 'Where to next?',
  options: [
    { label: 'Keep this discovery', value: 'keep' },
    { label: 'Continue', value: 'continue', primary: true },
    { label: 'Finish', value: 'finish' },
  ],
  finish: ['That’s enough for now.', 'It’ll still be here whenever you want another look.'],
  continue: 'Let’s carry on, gently.',
});

export const ZUZU_SQUEEZE = Object.freeze([
  'Squishy thinking helps, apparently.',
  'Ooh. Spin me round.',
  'Still here. Still squishy.',
  'Every angle feels better squeezed.',
]);

/** Deterministic rotation (no randomness): index from a counter. */
export const pick = (list, n = 0) => list[((n % list.length) + list.length) % list.length];
