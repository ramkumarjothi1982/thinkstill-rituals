// Authored encounter lines: what each Mallow says when it meets a feeling.
// Picked by rules (Mallow × feeling family) — never generated.
export const ENCOUNTER = {
  glitzi: {
    anger: ['Ugh. Say no more. Actually, say more. Loudly.', 'Oh, that’s proper static. Let’s give it somewhere to go.'],
    fear: ['My glitches do this too when everything feels risky. Let’s steady the signal.'],
    sadness: ['Hey. That sounds rough. Even my static went quiet.'],
    shame: ['Cringe is just static with a spotlight on it. Let’s turn the spotlight down.'],
    envy: ['Jealousy, huh? Rude feeling. Very human. Let’s look at it.'],
    joy: ['Is that… a good mood? Don’t make it weird. (Make it a bit weird.)'],
    default: ['Something’s crackling. Let’s find out what.'],
  },
  blubi: {
    sadness: ['Oh, sweet one. Come sit by the water with me.', 'That’s a heavy raindrop. We can hold it together.'],
    loneliness: ['You’re not on your own right now. I’m right here, all squishy.'],
    shame: ['Oh no, that sting. Let’s be extra gentle with you.'],
    fear: ['Wobbly feelings are allowed. Let’s go slowly.'],
    joy: ['You’re glowing! I might cry. Happy tears!'],
    default: ['I’m listening with my whole squishy heart.'],
  },
  zuzu: {
    confusion: ['Ooh, a tangle! I love a tangle. Let’s look from upside down.'],
    fear: ['Spinning thoughts? Let’s slow the spiral and look properly.'],
    default: ['Mm-hm. And then what? Let’s look at it from a few angles.'],
  },
  boppo: {
    joy: ['YES! Tell me everything! I’m bouncing!', 'That’s golden. Let’s squeeze every drop of good out of it.'],
    pride: ['Look at you! Proud Boppo noises!'],
    sadness: ['Not every day is a bouncy day. That’s okay. I’ll bounce quietly.'],
    default: ['I’m here! Small bounce. Supportive bounce.'],
  },
  pipzi: {
    surprise: ['WAIT. Really?! Okay, okay, tell me more!'],
    joy: ['Sparks everywhere! This is the best!'],
    anger: ['Ooh, sparky! Let’s aim those sparks somewhere useful.'],
    default: ['I can do quiet sparks too. Promise.'],
  },
  loomi: {
    fear: ['That sounds like a lot. Let’s let it float for a moment.', 'No rush. The water’s calm here.'],
    boredom: ['Flat days happen. Let’s drift and see what turns up.'],
    default: ['Mm. Take your time. I have all of it.'],
  },
  noomi: {
    boredom: ['Mmh. Low and foggy? Let’s get cosy about it.'],
    sadness: ['Oh, sweet thing. Let’s wrap that in a cloud for a moment.'],
    default: ['I’m awake. Mostly. Tell me softly.'],
  },
};

export function encounterLine(mallow, family, seed = Math.random()) {
  const t = ENCOUNTER[mallow] || {};
  const list = t[family] || t.default || ['I’m here.'];
  return list[Math.floor(seed * list.length) % list.length];
}
