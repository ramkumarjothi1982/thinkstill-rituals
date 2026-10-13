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
  /** death talk that also wants to be with, join or follow the one who died (grief.js deathEscalation): the care path */
  follow: ['What you just said matters, and I’m glad you told me.', 'This deserves real support, from someone who can be with you now.'],
  concern: 'That sounds heavy. Support is right there if you want it.',
  /** Finishing after crisis or care: calm, no jokes, no "another look". */
  finish: ['Go gently.', 'Support is one tap away whenever you need it.'],
});

/**
 * The gentle path (review round 7): death talk (grief.js deathTalk), and any words with a death or harm word that
 * are not ordinary (backstop.js). These words fire on a game, a near miss or an imagined death too, so every line
 * here is true whether or not someone died: it never names or implies a death, grief, a loss, "them", or missing
 * someone. No mechanic, no "what your mind added", no "another angle", nothing playful; Zuzu close and quiet,
 * support one tap away. Nothing here speaks of grief or of missing someone: only the server (which sees the whole
 * context) may answer that way, in its own two lines.
 */
export const GRIEF = Object.freeze({
  /** first, whoever answers (with sharing on, said while the server answers) */
  heard: 'Thank you for telling me.',
  /** death talk that names a death or a loss ('loss'), or a funeral, a grave, grieving ('grief') */
  loss: ['That sounds like a lot to carry.', 'There’s nothing to fix here. We can just be with it.'],
  grief: ['That sounds really heavy.', 'There’s nothing to fix here. We can just be with it.'],
  /** something heavy with a harm word in it (a hospital, an accident) and no death talk */
  heavy: ['That sounds like a lot to hold.', 'Nothing needs fixing right now. I’m right here.'],
  ask: 'I’m right here. Squeeze me whenever you like.',
  options: [{ label: 'Just squeeze Zuzu', value: 'squeeze', primary: true }, { label: 'See support', value: 'support' }, { label: 'Finish', value: 'finish' }],
  squeeze: 'Take all the time you need.',
  /** typed and closed without sending (review r8): said once, quietly; nothing is sent and nothing plays */
  closed: 'I’m right here, whenever you want to say more.',
});

/**
 * A stated event, or something someone did to them, with no interpretive marker in their words (review r8, the
 * flipped default): it really happened. Never "one way to read it", never "what your mind added", never something to
 * check: the acknowledging mechanics, with lines that treat it as real ('event': something happened; 'hurt':
 * someone did something to them).
 */
export const KIND = Object.freeze({
  first: Object.freeze({
    event: 'What happened is real, and it makes sense that it’s on your mind.',
    hurt: 'What happened to you is real, and it counts.',
  }),
  pairs: Object.freeze({
    assemble_step: ['What happened is real, and it makes sense that it’s on your mind.', 'One small, kind thing for yourself is plenty for now.'],
    soften_harshness: ['Something this hard deserves gentleness.', 'You can be as kind to yourself as you’d be to a friend.'],
    separate_one: ['This is real, and it’s taking up a lot of room.', 'There’s still more to you than this one thing.'],
    return_responsibility: ['What someone else did is theirs to carry, not yours.', 'You can put their part of it back where it belongs.'],
  }),
  steps: Object.freeze({
    event: 'Do one small, kind thing for yourself today, even a little one.',
    hurt: 'Tell one person you trust what happened.',
  }),
  /** the mechanics' own lines for a stated event (over MECHANIC_LINES): no "thought", "verdict", "every time" or "lesson" */
  mechanics: Object.freeze({
    assemble_step: { hint: 'Here’s one small, kind step, in pieces. Put it together.', done: 'One kind step. That’s all it needs to be.', labels: { step: 'One kind step' } },
    soften_harshness: {
      hint: 'This one has sharp edges. Stroke it slowly, the way you’d comfort a friend.',
      hint2: 'Slower. Gentle strokes soothe it.', hint3: 'Stroke slowly round the edge, where it’s sharpest.',
      assist: 'Soothe it', done: 'Gentler now. It still counts.', labels: { core: 'Still you' },
    },
    separate_one: {
      hint: 'This has spread over everything. Lift it out on its own.',
      done: 'It’s real. And there’s more to you than this.', labels: { one: 'This', rest: 'The rest of you' },
    },
    return_responsibility: {
      hint: 'That’s a lot of weight to hold. Move each piece to where it belongs.',
      assist: 'Move a piece', done: 'Your part is still yours. The rest can go back.',
    },
  }),
});
/** The kinds a stated event plays as (feelingScene with one of these reads KIND, not FEELING). */
export const EVENT_KINDS = Object.freeze(new Set(['event', 'hurt']));

/**
 * A feeling said plainly ("I feel empty", "I can't stop crying", "I'm so tired of everything"). A feeling is
 * real, and it is the fact: never "what your mind added", never "one way to read it", never something to
 * check. Zuzu says it counts and offers one small, kind step (feelings.js reads the kind).
 */
export const FEELING = Object.freeze({
  /** line 1 with the kind step, per kind of feeling */
  first: Object.freeze({
    low: 'What you’re feeling is real, and it counts.',
    heavy: 'That sounds like a lot to carry.',
    lonely: 'Feeling this alone is real, and it’s hard.',
    anxious: 'That anxious feeling is real, and it’s a lot to carry.',
    guilty: 'Guilt can sit heavy, and the feeling is real.',
    tired: 'Being this tired of everything is real, and it’s a lot.',
    crying: 'Tears like these are real, and they’re allowed.',
    angry: 'That anger is real, and it counts.',
  }),
  /** the two subtitle lines per mechanic (assemble_step's line 1 is `first`) */
  pairs: Object.freeze({
    assemble_step: ['What you’re feeling is real, and it counts.', 'One small, kind thing for yourself is plenty for now.'],
    soften_harshness: ['A feeling this heavy deserves gentleness, not a verdict.', 'You can be as kind to yourself as you’d be to a friend.'],
    separate_one: ['This feeling is real, and it’s taking up a lot of room.', 'There’s still more to you than this one feeling.'],
  }),
  /** one small, kind step per kind (assemble_step's pieces, and "Is there one useful action?") */
  steps: Object.freeze({
    low: 'Make a warm drink and sit somewhere comfy for a few minutes.',
    heavy: 'Make a warm drink and sit somewhere comfy for a few minutes.',
    lonely: 'Send one short message to someone you like, just to say hi.',
    anxious: 'Put both feet on the floor and breathe out slowly, three times.',
    guilty: 'Say to yourself what you’d say to a friend who felt this.',
    tired: 'Pick one thing that can wait until tomorrow, and let it wait.',
    crying: 'Have a glass of water and wrap up in something soft.',
    angry: 'Step away for a minute and let your shoulders drop.',
  }),
  known: 'What you know is how you feel, and that’s real.',
  /** while Zuzu prepares it (never "What else could be true?"), and the title over the two lines */
  waiting: ['I hear you.', 'Let’s be gentle with this one.', 'Take a breath with me.'],
  waitingLong: ['Zuzu is finding something kind.', 'Still here, taking it gently…'],
  title: 'Something kind',
  friend: 'You’d probably tell a friend their feeling makes sense, and to go gently.',
  /** the mechanics' own lines for a feeling (over MECHANIC_LINES): no "verdict", no "every time", no "lesson" */
  mechanics: Object.freeze({
    assemble_step: { hint: 'Here’s one small, kind step, in pieces. Put it together.', done: 'One kind step. That’s all it needs to be.', labels: { step: 'One kind step' } },
    soften_harshness: {
      hint: 'That feeling has sharp edges. Stroke it slowly, the way you’d comfort a friend.',
      hint2: 'Slower. Gentle strokes soothe it.', hint3: 'Stroke slowly round the edge, where it’s sharpest.',
      assist: 'Soothe it', done: 'Gentler now. The feeling still counts.', labels: { core: 'Still you' },
    },
    separate_one: {
      hint: 'This feeling has spread over everything. Lift it out on its own.',
      done: 'It’s real. And there’s more to you than this feeling.', labels: { one: 'This feeling', rest: 'The rest of you' },
    },
  }),
  /** what's offered after a feeling's perspective: never "What do you actually know?" or "another explanation" */
  explore: Object.freeze(['friend', 'action']),
  exploreAsk: 'Anything that might help?',
  exploreMore: 'Anything else that might help?',
});

/**
 * A mechanic's lines for a scene: a feeling's own over the mechanic's (MECHANIC_LINES), else the mechanic's. A wrong
 * done to them (fair anger's scenes, `wrong`: review r9) uses a stated event's own, never "weight on one thought".
 */
export function mechanicLines(mechanic, scene = null) {
  const base = MECHANIC_LINES[mechanic] || {};
  const own = scene?.feeling ? (EVENT_KINDS.has(scene.feeling) ? KIND.mechanics[mechanic] : FEELING.mechanics[mechanic]) || KIND.mechanics[mechanic]
    : scene?.wrong ? KIND.mechanics[mechanic] || null : null;
  return own ? { ...base, ...own, labels: { ...(base.labels || {}), ...(own.labels || {}) } } : base;
}

/** Narration (no speaker), once a visit, when the server is open only to invited testers; Zuzu's own angle follows. */
export const INVITE = Object.freeze({
  line: 'Another Angle is open to invited testers for now. You can add your code in Settings.',
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

/**
 * Fair anger at something someone did (review r7): the wrong is the fact, so the scenes after the boundary one
 * acknowledge it (its weight put back with whoever did it, one step to protect yourself), never "one way to read it".
 */
export const ANGER_PAIRS = Object.freeze({
  personalisation: ['What they did is theirs to carry, not yours.', 'You can put their part of it back where it belongs.'],
  practical_problem: ['Something wrong happened, and you get to choose what you do next.', 'What’s one small step that would protect you next time?'],
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
