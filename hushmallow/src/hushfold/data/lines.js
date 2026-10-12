// Authored Hushfold dialogue. No AI: every line here is written in advance
// and chosen by rules (which Mallow, which feeling the person picked, what
// their fingers just did). The person's own words are only ever shown back
// exactly as they typed them; nothing claims to understand them.

export const FEELINGS = [
  { id: 'angry', label: 'Angry', face: { angry: 1 }, thought: 'crackle' },
  { id: 'anxious', label: 'Anxious', face: { anxious: 1 }, thought: 'tremble' },
  { id: 'sad', label: 'Sad', face: { sad: 1 }, thought: 'heavy' },
  { id: 'overwhelmed', label: 'Overwhelmed', face: { anxious: 0.5, confused: 0.5 }, thought: 'crowd' },
  { id: 'frustrated', label: 'Frustrated', face: { frustrated: 1 }, thought: 'puff' },
  { id: 'lonely', label: 'Lonely', face: { lonely: 1 }, thought: 'small' },
  { id: 'restless', label: 'Restless', face: { excited: 0.4, anxious: 0.6 }, thought: 'bounce' },
  { id: 'other', label: 'Something else', face: { curious: 1 }, thought: 'plain' },
];
export const feeling = (id) => FEELINGS.find((f) => f.id === id) || FEELINGS[FEELINGS.length - 1];

export const INTENTIONS = [
  { id: 'calm', label: 'Calm me down' },
  { id: 'letgo', label: 'Help me let go' },
  { id: 'distract', label: 'Distract me gently' },
  { id: 'steady', label: 'Help me feel steady' },
  { id: 'play', label: 'Let me just play' },
];

// The first invitation, one short thought at a time.
export const INVITE = {
  glitzi: ['Something bothering you?', 'Want to tell me? I’ll pretend I’m not listening.'],
  blubi: ['Is something heavy today?', 'You can tell me. I’m very good at holding things.'],
  zuzu: ['Your thoughts look loopy. Mine too.', 'Want to let one out?'],
  boppo: ['Hey, you. Rough one?', 'Tell me, if you like. I’ve got snacks. Metaphorical ones.'],
  pipzi: ['Ooh, something’s fizzing, isn’t it?', 'Want to tell me what?'],
  loomi: ['No rush at all.', 'If something’s on your mind, you can set it down here.'],
  noomi: ['Long day?', 'You can tell me. Or just squish. Both count.'],
};

// Little character reactions to touch. Shown sparingly as subtitles.
export const TOUCH_QUIPS = {
  glitzi: {
    squeeze: ['…Fine. That was nice.', 'I am NOT squishy. Do it again.', 'Ugh. Pleasant. Ugh.'],
    stretch: ['Hey! I’m not taffy.', 'Okay, okay, I’m long now.'],
    flick: ['Rude.', 'I felt that in my glitches.'],
    jiggle: ['Stop. Stop. …Don’t stop.', 'Bzzzt-hehe.'],
    calm: ['Mm. Static’s going quiet.', 'Don’t tell anyone I liked that.'],
    slip: ['Boing. You’re welcome.'],
  },
  blubi: {
    squeeze: ['Ohh, a hug!', 'Squish me any time.'], stretch: ['Wheee, I’m so tall!'], flick: ['Oh! A little boop.'],
    jiggle: ['Hee hee hee!'], calm: ['That’s so soothing…'], slip: ['Whoops! Bouncy!'],
  },
  zuzu: {
    squeeze: ['My spirals went spirally-er.'], stretch: ['I can see the ceiling of my thoughts!'], flick: ['Spinny!'],
    jiggle: ['Wibble wobble!'], calm: ['Slow loops. Nice loops.'], slip: ['Sproing!'],
  },
  boppo: {
    squeeze: ['Best squeeze today. Officially.'], stretch: ['Stretchy Boppo, reporting for duty.'], flick: ['Ha! Missed me. Didn’t miss me.'],
    jiggle: ['Hahaha, okay, okay!'], calm: ['Ahh. Sunshine on the inside.'], slip: ['Boing! Again!'],
  },
  pipzi: {
    squeeze: ['Eee! Do that again!'], stretch: ['I’m a noodle!'], flick: ['Zoom!'],
    jiggle: ['Hehehehe!'], calm: ['Oh. I’m… calm? Weird. Nice.'], slip: ['Pop!'],
  },
  loomi: {
    squeeze: ['Mm. Gentle. Thank you.'], stretch: ['Long and slow. I like that.'], flick: ['Oh! A ripple.'],
    jiggle: ['Tee hee.'], calm: ['Like a slow tide.'], slip: ['Bloop.'],
  },
  noomi: {
    squeeze: ['Mmm, cosy.'], stretch: ['*big sleepy stretch*'], flick: ['Huh? Oh. Hi.'],
    jiggle: ['Hehe… I’m awake now.'], calm: ['Zzz… no, I’m listening.'], slip: ['Bwomp.'],
  },
};

// After the person shares a thought, by the feeling they chose.
export const RESPONSES = {
  angry: ['Oof. That one’s got sparks.', 'Let’s give it somewhere to crackle.'],
  anxious: ['That one’s jittery.', 'It can stay. Let’s give it a bit more room.'],
  sad: ['That sounds heavy.', 'We can carry it slowly.'],
  overwhelmed: ['That’s a lot of noise at once.', 'One wave at a time.'],
  frustrated: ['Ugh. That’s a puffed-up one.', 'Let’s let some of that charge out.'],
  lonely: ['That one feels far from everyone.', 'It’s here with us now.'],
  restless: ['That one won’t sit still.', 'Let’s see what it does with a little space.'],
  other: ['Thanks for telling me.', 'Let’s see what this one does.'],
};

export const ASK_FEELING = 'What does it feel like?';

// World scripts. Each entry is a short subtitle; `hold` keeps it on screen
// until acknowledged.
export const STORM = {
  intro: ['Welcome to the Static Storm.', 'Draw anywhere. Fast or slow, the storm notices.'],
  fast: ['Crunchy.', 'Lots of charge in there.', 'The storm likes speed. It gets louder.'],
  slow: ['Ooh. Smooth.', 'Look at the light gather.'],
  discovery: ['See what happened?', 'You changed your pace.', 'The world responded.'],
  discoveryGentle: ['Slow hands, quiet storm.', 'You set the pace. The world followed.'],
  thought: ['Your thought’s full of static.', 'Try a slow line near it.'],
  done: ['The storm’s said what it needed to.', 'Feel how quiet it got?'],
};

export const OCEAN = {
  intro: ['The storm became an ocean.', 'Sweep the water. See what kind of waves you make.'],
  fast: ['Splashy!', 'Quick hands, busy water.'],
  slow: ['Long waves.', 'Look how far they roll.'],
  discovery: ['Notice that?', 'Slow sweeps make long waves.', 'Long waves carry things farther.'],
  thought: ['Your thought’s floating.', 'You don’t have to push it. Just make room.'],
  far: ['Still there. Just not right in your face.', 'There’s more room now.'],
  breathe: ['If you like, let your breath follow the tide.', 'No need to hold it. Just in, and longer out.'],
  done: ['That’s a lot more space.', 'Stay as long as you like.'],
};

export const REST = {
  intro: ['Moonmilk Cove. Nothing to do here.', 'Squish, drift, or just sit with Noomi.'],
};

export const TRANSITIONS = {
  stormToOcean: 'The static is melting…',
  oceanToRest: 'The tide is drifting somewhere quieter…',
  restToStorm: 'Something’s crackling again…',
};

export const GENTLE_ENDS = ['That’s plenty for now.', 'Come back whenever. We’ll be here.'];
