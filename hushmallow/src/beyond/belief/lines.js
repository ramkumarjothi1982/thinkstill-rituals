// Belief Mallows — the authored words (hushmallow Beyond; REDESIGN_BRIEF §5).
//
// A Belief Mallow is a story the person names, one that keeps coming back ("I'm not good enough", "Everybody judges
// me"). It carries a symbolic prop the person picks (a stone, a shell, a tangled thread, a charm), and a few short,
// optional, tactile experiences let them see how it shapes their reactions and loosen it: more flexible, less dominant,
// better understood.
//
// Every line here holds to the brief:
//   * never says the belief is wrong, untrue, irrational or a distortion, and never names a condition (no diagnosis);
//   * never weighs evidence for and against it, and never offers an alternative reading (that structured reframing is
//     Another Angle's own: "Look at it from another angle" hands over to it, through its consented path);
//   * never tells the person what to believe or what they should feel (they pick the prop, the answers, the end);
//   * nothing playful, no quips (a belief can be tender): Zuzu's attentive face throughout.
// Pure data (Node-tested: tests/belief-mallows.test.mjs).

export const BELIEF = Object.freeze({
  /** The invitation's answer (Another Angle's first choice, and its end choice). */
  invite: 'A story that keeps coming back',
  endInvite: 'This one keeps coming back',
  /** The compact input's prompt in belief mode (the words stay on this phone: the input says so). */
  prompt: 'What’s the story that keeps coming back?',
  /** Choosing where the story comes from. */
  sourceAsk: 'Which story would you like to look at?',
  sourceNew: 'Something new',
  sourceNot: 'Not now',
  /** A kept Belief Mallow, offered again (its words as they typed them, in quotes, shortened). */
  keptLabel: (t) => `Visit “${t}”`,
  recentLabel: (t) => `“${t}”`,
  notNow: 'Okay. It can wait.',

  /** The one question before anything plays (owner decision 'Ask before every world'): the same three equal answers. */
  question: Object.freeze({ ask: 'Shall we look at how this story sits with you, or just be with it?', look: 'Look at it together', be: 'Just be with it', notOkay: 'I’m not okay' }),
  /** The risk screener's check-in, worded for a belief (the same answers otherwise). */
  check: Object.freeze({ look: 'I’m okay — let’s look at it' }),

  /** Arrival: nothing about it needs to be right or wrong. */
  arrive: 'Let’s give it a shape. Nothing about it has to be right or wrong.',
  propAsk: 'What does it feel like it carries?',
  props: Object.freeze([
    { label: 'A heavy stone', value: 'stone' },
    { label: 'A shell', value: 'shell' },
    { label: 'A tangled thread', value: 'thread' },
    { label: 'A charm it holds onto', value: 'charm' },
  ]),
  /** Said as it arrives, by the prop they picked. */
  meet: Object.freeze({
    stone: 'There it is, carrying its stone. That’s a lot to hold up.',
    shell: 'There it is, under its shell. Shells are for keeping something safe.',
    thread: 'There it is, wound up in its thread. Tangles take a while to form.',
    charm: 'There it is, holding its charm close. It matters to it.',
  }),
  /** Back to a kept one: as it was left. */
  meetAgain: 'Here it is, as you left it.',

  /** The experiences (each optional, any order; "That’s enough" always one tap away). */
  nextAsk: 'Want to try something with it?',
  moreAsk: 'Anything else?',
  enough: 'That’s enough',
  experiences: Object.freeze([
    { id: 'shape', label: 'See how it shapes things' },
    { id: 'loosen', label: 'Loosen its hold' },
    { id: 'room', label: 'Give it some room' },
    { id: 'understand', label: 'Get to know it' },
  ]),

  /** See how it shapes things: everyday moments drift past, and lean toward it as it pulls. */
  shape: Object.freeze({
    hint: 'Send a moment past it. Tap one, or drag it across.',
    hint2: 'Try another one.',
    assist: 'Send a moment',
    moments: Object.freeze(['No reply yet', 'A small mistake', 'A kind word', 'Someone goes quiet']),
    leaned: 'That one leaned toward it.',
    passed: 'That one went past more easily.',
    done: 'When it’s heavy, a lot of things lean its way. That’s worth noticing, nothing more.',
    doneLight: 'Moments pass it more easily now. It still has a pull, just a softer one.',
  }),
  /** Loosen its hold: squeeze, stroke or stretch it; its prop gets lighter (nothing is taken away). */
  loosen: Object.freeze({
    hint: 'Squeeze it, stroke it, or stretch it gently.',
    hint2: 'Slowly. There’s no rush.',
    assist: 'Loosen it gently',
    done: Object.freeze({
      stone: 'It’s set the stone down beside it. It can pick it up again, but it doesn’t have to carry it every minute.',
      shell: 'The shell has opened. It can still close when it needs to.',
      thread: 'Looser now. Still connected, just not so tight.',
      charm: 'Still precious. Just not pulling so hard.',
    }),
  }),
  /** Give it some room: hold the space around it, and it settles a little farther off (it stays, smaller in the sky). */
  room: Object.freeze({
    hint: 'Rest a finger on the space around it, and hold.',
    hint2: 'Keep holding. The space grows.',
    assist: 'Give it room',
    done: 'It’s still here. It just isn’t the whole sky any more.',
  }),
  /** Get to know it: what it might have been trying to do (their pick; every answer is met as it is). */
  understand: Object.freeze({
    ask: 'What do you think it’s been trying to do for you?',
    options: Object.freeze([
      { label: 'Keep me safe', value: 'safe' },
      { label: 'Keep me going', value: 'going' },
      { label: 'Keep things familiar', value: 'familiar' },
      { label: 'I’m not sure', value: 'unsure' },
    ]),
    heard: Object.freeze({
      safe: 'Then it’s been working hard to look after you.',
      going: 'Then it’s been pushing you along, all this time.',
      familiar: 'Familiar things can feel steadier, even heavy ones.',
      unsure: 'That’s okay. Not knowing yet is part of looking.',
    }),
    after: 'You get to decide how much room it has.',
  }),

  /** After: how it sits now (every answer is fine). */
  feelAsk: 'How does it sit with you now?',
  feel: Object.freeze([
    { label: 'A bit lighter', value: 'lighter' },
    { label: 'About the same', value: 'same' },
    { label: 'Not sure', value: 'unsure' },
  ]),
  feelHeard: Object.freeze({
    lighter: 'Lighter is good to notice.',
    same: 'That’s okay. It can take its time.',
    unsure: 'Not sure is fine too.',
  }),

  /** The end: keep it (on this phone only), Another Angle's own path, or finish. Nothing is kept unless they choose. */
  endAsk: 'What would you like to do with it?',
  end: Object.freeze({ keep: 'Keep it on this phone', angle: 'Look at it from another angle', letGo: 'Let it go for now', forget: 'Delete it from this phone', finish: 'Finish' }),
  kept: 'Kept on this phone only. You can delete it here, or in Settings.',
  keptFull: 'This phone already keeps three. Delete one first, or let this one go for now.',
  keptFailed: 'I couldn’t keep it on this phone just now. It’s fine to let it go for now.',
  forgotten: 'Deleted from this phone.',
  letGo: 'Okay. It’s not kept anywhere.',
  /** Into Another Angle's own path: its question comes next (and its consent, if words would be sent). */
  toAngle: 'Let’s look at it from another angle.',
  /** Screen-reader notes for what the stage changes. */
  heard: Object.freeze({ set: 'The stone is set down.', open: 'The shell is open.', loose: 'The thread is loose.', light: 'The charm is lighter.', room: 'It has more room now.' }),
});

/** A short excerpt of the person's words for a chip label (whole words, "…" when cut; textContent only where shown). */
export function excerpt(text, max = 28) {
  const t = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max + 1);
  const sp = cut.lastIndexOf(' ');
  return `${(sp > max * 0.5 ? cut.slice(0, sp) : t.slice(0, max)).replace(/[\s,.;:!?—–-]+$/u, '')}…`;
}
