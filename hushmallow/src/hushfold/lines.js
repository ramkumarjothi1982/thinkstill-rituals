// Authored Mallow lines for the Hushfold's cinematic subtitles.
//
// Every line here is written by hand. Nothing is generated, and nothing
// pretends to understand what the person typed: acknowledgements only ever
// echo the feeling they CHOSE (a chip), never their free text. Lines are
// picked by rule (Mallow × moment × kind/feeling) and rotate without repeats
// through a store-backed shuffle bag, so a returning person meets new lines
// before old ones come round again.
//
// Voice: British spelling, warm, short (one sentence a subtitle), lightly
// funny where it fits, never clinical, never a promise of relief. Safety
// lines are shared, plain and never joke.
//
// Plain ES module, no DOM. Works in browsers and Node.

import { drawFromBag } from '../engine/flow-store.js';

export const LINES_KEY = 'hushfold.lines';

/** The seven feelings offered as chips (ids exist in data/emotions.js). */
export const QUICK_FEELINGS = Object.freeze([
  ['anger', 'Angry'], ['anxiety', 'Anxious'], ['sadness', 'Sad'], ['overwhelm', 'Overwhelmed'],
  ['frustration', 'Frustrated'], ['loneliness', 'Lonely'], ['restlessness', 'Restless'],
]);
/** The five intentions (ids are exactly the Hushflow registry's FLOW_INTENTIONS). */
export const INTENTIONS = Object.freeze([
  ['calm', 'Calm me down'], ['let-go', 'Help me let go'], ['distract', 'Distract me gently'],
  ['steady', 'Help me feel steady'], ['play', 'Let me just play'],
]);

/** The Hushflow registry's feeling ids (FLOW_EMOTIONS) for an emotions.js id + family. */
const FLOW_BY_ID = { anger: 'angry', anxiety: 'anxious', sadness: 'sad', overwhelm: 'overwhelmed', frustration: 'frustrated', loneliness: 'lonely', restlessness: 'restless' };
const FLOW_BY_FAMILY = { anger: 'angry', fear: 'anxious', sadness: 'sad', loneliness: 'lonely', boredom: 'restless' };
export function flowEmotion(id, family = null) {
  if (!id) return null;
  return FLOW_BY_ID[id] || FLOW_BY_FAMILY[family] || 'other';
}

const SHARED = {
  support: [
    'That sounds really heavy. You deserve a real person with you for this.',
    'The support lines are free, and right here whenever you need them.',
  ],
  supportCare: ['That matters, and it isn’t yours to fix alone. Support is one tap away.'],
  stub: ['The new worlds are still being built. Until they open, I’m all yours to squish.'],
  paused: ['Paused. Everything waits for you.'],
  resumed: ['And we’re back.'],
  stay: ['Staying a little longer. Good call.'],
  finished: ['All done. Thank you for spending this with me.'],
  noWorld: ['Nothing to pause yet. Squeezing is always on, though.'],
  planInvite: ['That part opens with hushmallow Flow. Your words are safe here meanwhile.'],
};

// Per Mallow. squeeze kinds: squeeze, release, tap, doubleTap, flick, stretch, massage, stroke, jiggle
const M = {
  glitzi: {
    nudge: ['Go on. Squeeze me. I won’t glitch. Much.', 'You can poke me, you know. I’m basically a stress ball with opinions.'],
    first: {
      hold: ['Oh. Oh, that’s nice. Don’t tell anyone I said that.', 'Squish accepted. Static levels: dropping.'],
      tap: ['Boop received. Rude. Do it again.'],
      flick: ['Did you just flick me? Bold. I respect it.'],
    },
    squeeze: {
      squeeze: ['Mm. Signal’s clearing.', 'Harder? Softer? I’m flexible. Literally.', 'That’s the good static.'],
      release: ['Boing. Back in shape. Mostly.', 'And… reset.'],
      tap: ['Boop.', 'Again? Fine. Boop.'],
      doubleTap: ['Double boop. Now you’re just showing off.'],
      flick: ['Wheee— I mean, how dare you.', 'I glitched a bit there. Worth it.'],
      stretch: ['I am now long. This is my life now.'],
      massage: ['Circles. Okay, that’s actually working.'],
      stroke: ['Smoothing out the static. Carry on.'],
      jiggle: ['Jiggle detected. Dignity: gone.'],
    },
    invite: [['Something bothering you?', 'Want to tell me?'], ['Something’s crackling in there, isn’t it?', 'Want to tell me? I’ll pretend not to listen. Loudly.']],
    justPlay: ['Just squishing? Excellent plan. Zero notes.', 'Fine by me. I’ll be over here, being squeezable.'],
    ack: {
      anger: ['Angry. Got it. Let’s give that static somewhere to go.', 'Proper anger. Fair. Let’s give it room.'],
      anxiety: ['Anxious. My signal does that too. Let’s steady it.'],
      sadness: ['Sad. Okay. I’ll keep the static low for this one.'],
      overwhelm: ['Too much, all at once. Let’s turn the volume down a notch.'],
      frustration: ['Frustrated. Very understandable. Very crackly.'],
      loneliness: ['Lonely, huh. Well, I’m here. Glitchy, but here.'],
      restlessness: ['Restless. Same. Let’s give the fidget somewhere to go.'],
      other: ['{Feeling}. Noted, and not judged.'],
      none: ['Thanks for telling me. It’s out here now, where we can both see it.'],
    },
    thought: ['There it is. Out in the open, where we can both see it.', 'Look at that. Your thought, out here with us.'],
    return: ['You again. Good. I kept the static warm.', 'Oh, you’re back. I definitely didn’t miss you. (I did.)'],
  },
  blubi: {
    nudge: ['You can squeeze me, if you like. Squishy is my best feature.', 'Psst… hold me for a bit? I’m soft all the way through.'],
    first: {
      hold: ['Oh! That’s the nicest squeeze. I might cry. Happy tears!', 'Mmm. Softest squeeze of the day.'],
      tap: ['Hi! Hi. You found me.'],
      flick: ['Whoa-oh! Wobble wobble. I’m okay!'],
    },
    squeeze: {
      squeeze: ['So squishy. So safe.', 'You can hold on as long as you need.', 'That’s lovely. Keep going if you like.'],
      release: ['Boing… and settled.', 'Still here. Still soft.'],
      tap: ['Hello again.', 'Tap tap. That tickles.'],
      doubleTap: ['Two taps! That’s a hug in Mallow.'],
      flick: ['Wheee! That was dramatic. I loved it.', 'Wobbly! But in a good way.'],
      stretch: ['I’m all long and wobbly now!'],
      massage: ['Little circles… that’s so calming.'],
      stroke: ['Oh, that’s gentle. Thank you.'],
      jiggle: ['Jelly mode! I’m giggling.'],
    },
    invite: [['Something bothering you?', 'Want to tell me?'], ['Is something sitting heavy with you?', 'Want to tell me? I’ll hold it gently.']],
    justPlay: ['Just playing is perfect. I love being squished.'],
    ack: {
      anger: ['Angry. That’s allowed here. All of it.'],
      anxiety: ['Anxious. Okay. We’ll go slowly, together.'],
      sadness: ['Sad. Oh, sweet one. Come and sit by the water with me.'],
      overwhelm: ['So much at once. Let’s set some of it down.'],
      frustration: ['Frustrated. That sounds really tiring.'],
      loneliness: ['Lonely. You’re not on your own right now. I’m right here.'],
      restlessness: ['Restless. Wiggly feelings are allowed.'],
      other: ['{Feeling}. Thank you for telling me. Let’s be gentle with it.'],
      none: ['Thank you for telling me. That took something.'],
    },
    thought: ['There it is. Let’s be gentle with it.', 'Oh, look. It’s out here with us now.'],
    return: ['You came back! I saved you the softest cushion.', 'Hi again. I was hoping you’d visit.'],
  },
  zuzu: {
    nudge: ['Hypothesis: squeezing me feels nice. Want to test it?', 'Ooh, a finger! Will it poke? Will it squeeze? The suspense!'],
    first: {
      hold: ['Fascinating. From in here, everything looks wobblier.', 'Oh! My spirals just did a little loop.'],
      tap: ['A tap! What does it mean? I have seven theories.'],
      flick: ['Whoaaa. I saw the room from four sides at once.'],
    },
    squeeze: {
      squeeze: ['Spirals… slowing… nice.', 'Squeeze data: excellent.', 'What if we did that again? For science.'],
      release: ['Sproing. Back to round. Round-ish.', 'And unspiral.'],
      tap: ['Tap. Interesting.', 'Another tap! The plot thickens.'],
      doubleTap: ['Double tap! Is that a code? I love codes.'],
      flick: ['Wheee — new angle unlocked!', 'Spun right round. Very educational.'],
      stretch: ['Stretchy Zuzu sees further.'],
      massage: ['Round and round… my favourite shape.'],
      stroke: ['Ooh, smooth. My spirals approve.'],
      jiggle: ['Wobble physics! I knew it.'],
    },
    invite: [['Something bothering you?', 'Want to tell me?'], ['Is a thought going round and round in there?', 'Want to tell me? We can look at it together.']],
    justPlay: ['Just playing? Best experiment there is.'],
    ack: {
      anger: ['Angry. Got it. Let’s give it room to move first.'],
      anxiety: ['Anxious. Spinning thoughts? Let’s slow the spiral together.'],
      sadness: ['Sad. My spirals went quiet. I’m here.'],
      overwhelm: ['Lots of loops at once. One at a time, then.'],
      frustration: ['Frustrated. Something’s stuck. Let’s poke it gently.'],
      loneliness: ['Lonely. Well, now there are two of us looking at it.'],
      restlessness: ['Restless. Same energy. Let’s put it somewhere fun.'],
      other: ['{Feeling}. Thanks for naming it. Names help.'],
      none: ['Thank you. Words out here are easier to look at.'],
    },
    thought: ['Ooh. There it is. Let’s have a proper look.', 'And there it is, out of your head and into the room.'],
    return: ['You’re back! I’ve been thinking about you. In spirals.', 'Hiii. My spirals are already spinning.'],
  },
  boppo: {
    nudge: ['Psst! I’m extremely squeezable. It’s on my CV.', 'Go on, give me a squish! I’ve been practising my bounce.'],
    first: {
      hold: ['SQUISH! Oh, that’s lovely. Do it again! Or don’t! Either!', 'Ooh, warm hands! Best squeeze ever, officially.'],
      tap: ['BOOP! Hi! Hello! Hi!'],
      flick: ['Wheeeee! I’m a bouncy ball now!'],
    },
    squeeze: {
      squeeze: ['Squish! Golden.', 'Hehe. That tickles in the best way.', 'Every squeeze is my favourite.'],
      release: ['BOING! Back again!', 'Ta-da! Round again.'],
      tap: ['Boop!', 'Boop boop!'],
      doubleTap: ['Double boop! That’s a high five in Mallow!'],
      flick: ['Wheee! Again, again!', 'Bounce report: excellent.'],
      stretch: ['I’m a long Boppo! Very aerodynamic.'],
      massage: ['Ooh, circles. Sunshine noises.'],
      stroke: ['Aww. That’s a sunny one.'],
      jiggle: ['Jiggle jiggle! I’m jelly!'],
    },
    invite: [['Something bothering you?', 'Want to tell me?'], ['Is today being a bit much?', 'Want to tell me? I’ll bounce quietly. Mostly.']],
    justPlay: ['Just play? YES. My favourite thing!'],
    ack: {
      anger: ['Angry. Okay! Let’s give it somewhere to bounce.'],
      anxiety: ['Anxious. Not every day is a bouncy day, and that’s okay.'],
      sadness: ['Sad. I’ll do a very small, very gentle bounce.'],
      overwhelm: ['Too much on your plate. Let’s take one thing off.'],
      frustration: ['Frustrated! Grr. Fair enough. Let’s shake it out.'],
      loneliness: ['Lonely. Well, you’ve got a Boppo now. That’s something!'],
      restlessness: ['Restless! Bouncy feelings! I get it.'],
      other: ['{Feeling}. Thanks for telling me. Let’s see what helps.'],
      none: ['Thank you for telling me! Let’s see what helps.'],
    },
    thought: ['There it is! Let’s look after it.', 'Ooh, a little thought! Hello, you.'],
    return: ['YOU’RE BACK! Okay, okay, calm Boppo… YOU’RE BACK!', 'Hi again, sunshine!'],
  },
  pipzi: {
    nudge: ['Ooh, ooh, squeeze me! I’ve got sparks to show you!', 'Hold me! Something sparkly happens. Probably.'],
    first: {
      hold: ['KAPOW! Okay, that was the best squeeze so far.', 'Sparks! Sparks everywhere! Do it again!'],
      tap: ['Hi! Hi! Was that a tap? I love taps!'],
      flick: ['Wheee! I’m a firework! A small one!'],
    },
    squeeze: {
      squeeze: ['Sparky squish!', 'Ooh, that fizzes.', 'Yes! More of that!'],
      release: ['Pop! Back to round!', 'Fizz… and settle.'],
      tap: ['Tap! Spark!', 'Ooh, another!'],
      doubleTap: ['Double tap! Double sparks!'],
      flick: ['Zoom! Did you see that?!', 'I flew! Kind of!'],
      stretch: ['Long Pipzi! Extra sparks!'],
      massage: ['Circles make little sparkle swirls!'],
      stroke: ['Ooh, that’s a smooth one.'],
      jiggle: ['Jiggly sparks! Best kind!'],
    },
    invite: [['Something bothering you?', 'Want to tell me?'], ['Wait — is something buzzing around in your head?', 'Want to tell me? I’m paying such good attention.']],
    justPlay: ['Just play? Best idea anyone’s had all day!'],
    ack: {
      anger: ['Angry! Sparky! Let’s aim those sparks somewhere useful.'],
      anxiety: ['Anxious. Okay. I can do quiet sparks too. Promise.'],
      sadness: ['Sad. I’ll make my sparks really small and gentle.'],
      overwhelm: ['So much going on! Let’s pick just one thing.'],
      frustration: ['Frustrated! Ugh, I know. Let’s fizz it out.'],
      loneliness: ['Lonely. Well, now you’ve got a very enthusiastic friend.'],
      restlessness: ['Restless! Fizzy legs! Let’s use them.'],
      other: ['{Feeling}. Thank you for telling me. That matters.'],
      none: ['Thank you for telling me! Let’s see what we can do with it.'],
    },
    thought: ['Ooh! There it is! Hello, little thought.', 'Look! It’s out here now. Sparkly-ish.'],
    return: ['You’re back! Sparks! Lanterns! You!', 'Ooh, it’s you again! Best part of my day.'],
  },
  loomi: {
    nudge: ['No rush. But if you fancy a squeeze, I’m here.', 'You can hold me, if you like. I’m very good at being held.'],
    first: {
      hold: ['Mm. Nice. Very nice.', 'Ah. That’s a good, slow squeeze.'],
      tap: ['Oh, hey.'],
      flick: ['Whoa. Okay. I’m floating now. That’s fine.'],
    },
    squeeze: {
      squeeze: ['Mm. Take your time.', 'Slow is good.', 'That’s it.'],
      release: ['And… back. Easy.', 'Drifting back to round.'],
      tap: ['Hey.', 'Mm-hm.'],
      doubleTap: ['Two taps. Quietly impressed.'],
      flick: ['Whee. Calmly.', 'Bit of a wobble. All good.'],
      stretch: ['Long and calm. Very me.'],
      massage: ['Little circles. Like ripples.'],
      stroke: ['Smooth. Like still water.'],
      jiggle: ['A little wobble. Unbothered.'],
    },
    invite: [['Something bothering you?', 'Want to tell me?'], ['Something sitting on your mind?', 'Want to tell me? No rush at all.']],
    justPlay: ['Just play. Honestly? Great plan.'],
    ack: {
      anger: ['Angry. Okay. It can be here. We’ll let it move.'],
      anxiety: ['Anxious. That sounds like a lot. Let’s let it float a moment.'],
      sadness: ['Sad. Mm. We can sit with that for a while.'],
      overwhelm: ['Too much at once. Let’s slow everything down.'],
      frustration: ['Frustrated. Fair. Let’s give it some room.'],
      loneliness: ['Lonely. I’m here. Not going anywhere.'],
      restlessness: ['Restless. Okay. Let’s find a slower current.'],
      other: ['{Feeling}. Thanks for telling me. No rush with it.'],
      none: ['Thanks for telling me. We’ve got time.'],
    },
    thought: ['There it is. Let it float there a moment.', 'Mm. There it is. Just floating.'],
    return: ['Oh, hey. You’re back. The water’s still nice.', 'Hi again. Saved you a slow minute.'],
  },
  noomi: {
    nudge: ['Mmh… you can squeeze me. I’m half cloud.', 'Psst… I’m very soft. Like a pillow that blinks.'],
    first: {
      hold: ['Ooh… that’s cosy. Like a blanket hug.', 'Mmh. Lovely. Sleepy-lovely.'],
      tap: ['Oh! *blinks* Hello.'],
      flick: ['Wheee… I’m a little moon now.'],
    },
    squeeze: {
      squeeze: ['Mmh. Cosy.', 'Soft and slow…', 'Like sinking into a cloud.'],
      release: ['…and floating back.', 'Puff. Round again.'],
      tap: ['*blink*', 'Mm? Hello.'],
      doubleTap: ['Two taps… like a lullaby.'],
      flick: ['Whoa… stars everywhere.', 'Floaty… floaty…'],
      stretch: ['Long… like a yawn.'],
      massage: ['Circles… so sleepy… so nice.'],
      stroke: ['Mmh. Like stroking a cloud.'],
      jiggle: ['Wobbly… like moonmilk.'],
    },
    invite: [['Something bothering you?', 'Want to tell me?'], ['Is something keeping you awake inside?', 'Want to tell me? Softly is fine.']],
    justPlay: ['Just playing… perfect. I’ll be your squishy cloud.'],
    ack: {
      anger: ['Angry. Okay. The cove can hold a storm.'],
      anxiety: ['Anxious. Let’s wrap it in something soft for a moment.'],
      sadness: ['Sad. Oh, sweet thing. Let’s wrap it in a cloud.'],
      overwhelm: ['Too much. Let’s make everything a little quieter.'],
      frustration: ['Frustrated. Mm. Let’s let it settle, slowly.'],
      loneliness: ['Lonely. I’m right here, under the same moon.'],
      restlessness: ['Restless. Mm. Let’s find somewhere cosy for it.'],
      other: ['{Feeling}. Thank you for telling me. Softly does it.'],
      none: ['Thank you for telling me. We can go slowly.'],
    },
    thought: ['There it is… floating. Let’s watch it a while.', 'Mmh. There it is, out here with us.'],
    return: ['Mmh… oh, hello again. I was dreaming you’d visit.', 'You’re back. The stars kept your place.'],
  },
};
export const MALLOW_LINES = M;
export const SHARED_LINES = SHARED;

const SQUEEZE_KINDS = new Set(['squeeze', 'release', 'tap', 'doubleTap', 'flick', 'stretch', 'massage', 'stroke', 'jiggle']);
const FIRST_KIND = { squeeze: 'hold', press: 'hold', stretch: 'hold', massage: 'hold', stroke: 'hold', jiggle: 'hold', release: 'hold', tap: 'tap', doubleTap: 'tap', flick: 'flick' };

/** Normalise a touch kind from either the rig or MallowTouch to our vocabulary. */
export function squeezeKind(kind) {
  if (kind === 'hold' || kind === 'press' || kind === 'pull') return 'squeeze';
  return SQUEEZE_KINDS.has(kind) ? kind : null;
}

function listFor(mallow, moment, { kind, emotion } = {}) {
  const m = M[mallow] || M.loomi;
  switch (moment) {
    case 'first': return m.first[FIRST_KIND[kind] || 'hold'] || m.first.hold;
    case 'squeeze': return m.squeeze[squeezeKind(kind) || 'squeeze'] || m.squeeze.squeeze;
    case 'ack': return m.ack[emotion && m.ack[emotion] ? emotion : emotion ? 'other' : 'none'];
    case 'nudge': case 'justPlay': case 'thought': case 'return': return m[moment];
    default: return SHARED[moment] || null;
  }
}

/** Fill {feeling} / {Feeling} with a feeling's display name (never the person's text). */
export function fillLine(text, { feelingName } = {}) {
  if (!text.includes('{')) return text;
  const name = String(feelingName || 'That feeling');
  const lower = name.charAt(0).toLowerCase() + name.slice(1);
  const upper = name.charAt(0).toUpperCase() + name.slice(1);
  return text.replace(/\{Feeling\}/g, upper).replace(/\{feeling\}/g, lower);
}

/**
 * createLines({store}) → { pick(mallow, moment, {kind, emotion, feelingName}), invitation(mallow), all(mallow, moment, opts) }
 * Deterministic rotation without repeats, remembered in hm2:hushfold.lines
 * (indices only). The first invitation every Mallow gives is the canonical
 * "Something bothering you?" / "Want to tell me?".
 */
export function createLines({ store }) {
  const draw = (key, n) => drawFromBag(store, key, Array.from({ length: n }, (_, i) => i), { storeKey: LINES_KEY });
  return {
    pick(mallow, moment, opts = {}) {
      const list = listFor(mallow, moment, opts);
      if (!list?.length) return '';
      const sub = moment === 'ack' ? (opts.emotion || 'none') : moment === 'squeeze' ? (squeezeKind(opts.kind) || 'squeeze') : moment === 'first' ? (FIRST_KIND[opts.kind] || 'hold') : '';
      const i = list.length === 1 ? 0 : draw(`${mallow}|${moment}|${sub}`, list.length) ?? 0;
      return fillLine(list[i], opts);
    },
    /** [line one, line two] of an invitation; the canonical pair comes first. */
    invitation(mallow) {
      const list = (M[mallow] || M.loomi).invite;
      const key = `${mallow}|invite`;
      const rec = store.get(LINES_KEY, null);
      if (!rec?.bags?.[key]) {
        // first time with this Mallow: the canonical pair, then the rotation
        const next = rec && rec.v === 1 && rec.bags ? rec : { v: 1, bags: {} };
        next.bags[key] = { left: list.map((_, k) => k).filter((k) => k !== 0), last: 0, round: 1 };
        store.set(LINES_KEY, next);
        return list[0];
      }
      return list[draw(key, list.length) ?? 0];
    },
    all(mallow, moment, opts) { return listFor(mallow, moment, opts) || []; },
  };
}
