/* 018 Cloud Shapes — Reset · PLAY · Creativity / Mind Play
 * Mechanism: playful, effortless imagining (pareidolia: finding shapes in clouds) absorbs attention and shifts the mind out of
 * rumination into a curious, positive mode (soft fascination, Kaplan's attention restoration); turning a looping worry into a
 * ridiculous creature and watching it float off is cognitive defusion (ACT): the thought is held lightly, as just a thought.
 * Verb: trace (draw a loop around a cloud; a quick loop reveals what it already looks like, a loop with ears, fins or a tail
 * turns it into what you drew). Twist: grey thought-clouds roll in carrying the player's own looping thoughts; looping them
 * turns each into a silly creature (a What-if Walrus in a party hat). Finale: a sunset curtain call of every creature, then
 * night falls and each one becomes a named constellation: "Your sky: 7 creatures".
 */
(function (env) {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const eOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const eIO = (t) => { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  const eBack = (t) => { t = clamp(t, 0, 1); const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  function rngOf(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  const rgbC = new Map();
  function rgbOf(hex) { let v = rgbC.get(hex); if (!v) { const n = parseInt(hex.slice(1), 16); v = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; rgbC.set(hex, v); } return v; }
  const hexA = (hex, a) => 'rgba(' + rgbOf(hex) + ',' + a + ')';
  function mix(a, b, t) { const x = rgbOf(a), y = rgbOf(b); return '#' + x.map((q, i) => clamp(Math.round(q + (y[i] - q) * t), 0, 255).toString(16).padStart(2, '0')).join(''); }
  function lin(g, x0, y0, x1, y1, st) { const gr = g.createLinearGradient(x0, y0, x1, y1); for (const s of st) gr.addColorStop(s[0], s[1]); return gr; }
  function rad(g, x, y, r0, r1, st) { const gr = g.createRadialGradient(x, y, r0, x, y, r1); for (const s of st) gr.addColorStop(s[0], s[1]); return gr; }
  function ell(g, x, y, rx, ry, rot) { g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, TAU); }

  /* ================================================================================================================
     THE BESTIARY. Every creature is a handful of ellipses (unit space, about -1..1 wide, y down) built out of cloud puffs,
     plus a few doodled features. eyes: [[x, y]...]; fx: signature doodles; anim: how it comes alive; q: Loopie's naming
     line in the three vibes.
     ================================================================================================================ */
  const CR = [
    { id: 'whale', name: 'Whale', b: [[-0.1, 0.05, 0.78, 0.42], [-0.55, 0, 0.4, 0.38], [0.72, -0.08, 0.22, 0.16], [0.97, -0.27, 0.17, 0.09], [0.97, 0.1, 0.17, 0.09]], eyes: [[-0.55, -0.06]], mouth: [-0.66, 0.14, 0.16], fx: ['spout'], anim: 'swim', dir: -1, snd: 'whale',
      q: ['A whale! Off to find its pod.', 'A whale. Smug little spout on that one.', 'Whale. Big. Leaving.'] },
    { id: 'rabbit', name: 'Rabbit', b: [[0.05, 0.3, 0.48, 0.38], [-0.3, -0.18, 0.3, 0.28], [-0.44, -0.74, 0.09, 0.3], [-0.2, -0.76, 0.09, 0.3], [0.52, 0.28, 0.14, 0.14], [-0.12, 0.62, 0.22, 0.08]], eyes: [[-0.38, -0.2]], mouth: [-0.52, -0.06, 0.06], fx: ['innerEars', 'whiskers'], anim: 'hop', dir: -1, snd: 'boing',
      q: ['A rabbit! Hop, hop, gone.', 'A rabbit. Late for something, probably.', 'Rabbit. Hopping. Bye.'] },
    { id: 'dragon', name: 'Dragon', b: [[0.05, 0.1, 0.55, 0.3], [-0.5, -0.15, 0.2, 0.15], [-0.75, -0.3, 0.22, 0.16], [0.65, 0.25, 0.3, 0.1], [0.95, 0.12, 0.1, 0.1], [0.1, -0.38, 0.35, 0.22], [-0.15, 0.4, 0.08, 0.12], [0.3, 0.4, 0.08, 0.12]], eyes: [[-0.8, -0.34]], mouth: [-0.88, -0.2, 0.08], fx: ['wing', 'nostril'], anim: 'fly', dir: -1, snd: 'dragon',
      q: ['A dragon! A very polite one.', 'A dragon. Mostly smoke, zero fire. Relatable.', 'Dragon. Friendly. Flying off.'] },
    { id: 'teapot', name: 'Teapot', b: [[0, 0.12, 0.58, 0.44], [0, -0.36, 0.26, 0.12], [0, -0.52, 0.08, 0.07], [-0.72, -0.05, 0.24, 0.09], [-0.92, -0.2, 0.09, 0.09], [0.68, 0.05, 0.16, 0.24]], eyes: [[-0.2, 0.06], [0.2, 0.06]], mouth: [0, 0.24, 0.12], fx: ['lidLine'], anim: 'pour', dir: 1, snd: 'kettle',
      q: ['A teapot! Pouring a little rain.', 'A teapot. The sky’s having a cuppa.', 'Teapot. Pouring. Calm.'] },
    { id: 'dino', name: 'Dinosaur', b: [[0.15, 0.2, 0.52, 0.3], [-0.38, -0.2, 0.11, 0.38], [-0.5, -0.62, 0.18, 0.12], [0.8, 0.28, 0.3, 0.08], [-0.12, 0.52, 0.09, 0.14], [0.4, 0.52, 0.09, 0.14]], eyes: [[-0.55, -0.66]], mouth: [-0.6, -0.56, 0.06], fx: ['backSpots'], anim: 'stomp', dir: -1, snd: 'stomp',
      q: ['A dinosaur! Gentle giant.', 'A dinosaur. Long neck, short attention span.', 'Dinosaur. Stomping. Slowly.'] },
    { id: 'sheep', name: 'Sheep', b: [[0.05, 0.05, 0.58, 0.4], [-0.62, -0.02, 0.18, 0.17], [-0.25, 0.47, 0.06, 0.14], [0.3, 0.47, 0.06, 0.14]], fluff: 1.3, eyes: [[-0.66, -0.05]], mouth: [-0.7, 0.06, 0.05], fx: ['sheepEar'], anim: 'hop', dir: -1, snd: 'bleat',
      q: ['A sheep! Count it if you like.', 'A sheep. The fluffiest cloud was always going to be a sheep.', 'Sheep. One. Done.'] },
    { id: 'rocket', name: 'Rocket', b: [[0, 0, 0.26, 0.62], [0, -0.66, 0.16, 0.16], [-0.32, 0.48, 0.14, 0.2], [0.32, 0.48, 0.14, 0.2], [0, 0.66, 0.16, 0.08]], eyes: [[-0.08, 0.22], [0.08, 0.22]], mouth: [0, 0.34, 0.05], fx: ['window'], anim: 'blast', dir: 0, snd: 'rocket',
      q: ['A rocket! Three, two, one…', 'A rocket. Leaving the chat. Literally.', 'Rocket. Up. Gone.'] },
    { id: 'octopus', name: 'Octopus', b: [[0, -0.25, 0.48, 0.42], [-0.55, 0.35, 0.09, 0.22], [-0.32, 0.42, 0.09, 0.24], [-0.1, 0.45, 0.09, 0.25], [0.12, 0.45, 0.09, 0.25], [0.34, 0.42, 0.09, 0.24], [0.56, 0.35, 0.09, 0.22]], eyes: [[-0.18, -0.24], [0.18, -0.24]], mouth: [0, -0.06, 0.1], fx: ['suckers'], anim: 'wave', dir: 1, snd: 'blub',
      q: ['An octopus! Waving with all eight.', 'An octopus. Eight arms, zero worries.', 'Octopus. Waving. Hi.'] },
    { id: 'turtle', name: 'Turtle', b: [[0, -0.05, 0.6, 0.36], [-0.75, 0.05, 0.17, 0.13], [-0.35, 0.3, 0.12, 0.09], [0.35, 0.3, 0.12, 0.09], [0.68, 0.12, 0.09, 0.05]], eyes: [[-0.8, 0.02]], mouth: [-0.84, 0.1, 0.05], fx: ['shell'], anim: 'swim', dir: -1, snd: 'blub',
      q: ['A turtle, taking its time.', 'A turtle. In no rush whatsoever. Goals.', 'Turtle. Slow. Fine.'] },
    { id: 'snail', name: 'Snail', b: [[0.15, -0.2, 0.42, 0.42], [-0.15, 0.28, 0.72, 0.13], [-0.78, 0.12, 0.13, 0.13]], eyes: [[-0.8, 0.08]], mouth: [-0.84, 0.16, 0.04], fx: ['spiral', 'antennae'], anim: 'slow', dir: -1, snd: 'squish',
      q: ['A snail, carrying its little house.', 'A snail. The original slow living.', 'Snail. Slow. Steady.'] },
    { id: 'cat', name: 'Cat', b: [[0.15, 0.22, 0.5, 0.32], [-0.45, -0.18, 0.3, 0.28], [-0.62, -0.46, 0.09, 0.12], [-0.3, -0.48, 0.09, 0.12], [0.72, -0.15, 0.08, 0.32]], eyes: [[-0.55, -0.2], [-0.35, -0.2]], mouth: [-0.45, -0.07, 0.06], fx: ['whiskers'], anim: 'stretch', dir: -1, snd: 'meow',
      q: ['A cat! Stretching across the sky.', 'A cat. Acting like it owns the sky. It does.', 'Cat. Stretching. Smug.'] },
    { id: 'puppy', name: 'Puppy', b: [[0.15, 0.2, 0.5, 0.3], [-0.45, -0.15, 0.3, 0.28], [-0.68, -0.05, 0.1, 0.2], [-0.22, -0.05, 0.1, 0.2], [0.7, -0.08, 0.08, 0.18], [-0.05, 0.48, 0.08, 0.12], [0.4, 0.48, 0.08, 0.12]], eyes: [[-0.53, -0.2], [-0.37, -0.2]], mouth: [-0.45, -0.04, 0.07], fx: ['tongue'], anim: 'wag', dir: -1, snd: 'yip',
      q: ['A puppy! Wagging hello.', 'A puppy. Would like a belly rub, please.', 'Puppy. Wagging. Happy.'] },
    { id: 'elephant', name: 'Elephant', b: [[0.15, 0.05, 0.55, 0.4], [-0.45, -0.12, 0.33, 0.33], [-0.3, -0.12, 0.22, 0.28], [-0.78, 0.25, 0.1, 0.28], [-0.15, 0.48, 0.12, 0.14], [0.45, 0.48, 0.12, 0.14]], eyes: [[-0.56, -0.2]], mouth: [-0.6, 0.06, 0.05], fx: ['earLine'], anim: 'trumpet', dir: -1, snd: 'trumpet',
      q: ['An elephant! Trumpeting a tiny hello.', 'An elephant. Never forgets. Chooses to chill.', 'Elephant. Trumpet. Nice.'] },
    { id: 'giraffe', name: 'Giraffe', b: [[0.25, 0.3, 0.38, 0.22], [-0.12, -0.25, 0.1, 0.45], [-0.28, -0.75, 0.16, 0.1], [0, 0.6, 0.06, 0.2], [0.5, 0.6, 0.06, 0.2], [-0.24, -0.9, 0.04, 0.06]], eyes: [[-0.32, -0.78]], mouth: [-0.4, -0.7, 0.04], fx: ['spots'], anim: 'stomp', dir: -1, snd: 'stomp',
      q: ['A giraffe, peeking over the clouds.', 'A giraffe. Tallest cloud in the sky, and it knows it.', 'Giraffe. Tall. Calm.'] },
    { id: 'fish', name: 'Fish', b: [[0, 0, 0.6, 0.36], [0.72, 0, 0.22, 0.3], [0, -0.38, 0.2, 0.1]], eyes: [[-0.38, -0.06]], mouth: [-0.56, 0.06, 0.05], fx: ['scales'], anim: 'swim', dir: -1, snd: 'blub',
      q: ['A fish, swimming through the sky.', 'A fish. Swimming in the wrong ocean. Thriving anyway.', 'Fish. Swimming. Up there.'] },
    { id: 'bird', name: 'Bird', b: [[0.05, 0.05, 0.42, 0.28], [-0.38, -0.2, 0.22, 0.2], [-0.62, -0.18, 0.08, 0.05], [0.1, -0.25, 0.38, 0.14], [0.52, 0, 0.18, 0.08]], eyes: [[-0.42, -0.24]], mouth: null, fx: ['wingLine', 'bill'], anim: 'fly', dir: -1, snd: 'tweet',
      q: ['A little bird! Off it flies.', 'A bird made of cloud. Very meta.', 'Bird. Flying. Free.'] },
    { id: 'duck', name: 'Duck', b: [[0.1, 0.15, 0.55, 0.3], [-0.42, -0.32, 0.24, 0.22], [-0.72, -0.28, 0.14, 0.06], [0.65, -0.05, 0.12, 0.1]], eyes: [[-0.46, -0.38]], mouth: null, fx: ['wingLine', 'bill'], anim: 'bob', dir: -1, snd: 'quack',
      q: ['A duck! Bobbing along.', 'A duck. Calm on top, paddling like mad underneath.', 'Duck. Bobbing. Fine.'] },
    { id: 'owl', name: 'Owl', b: [[0, 0.18, 0.42, 0.46], [0, -0.42, 0.42, 0.3], [-0.32, -0.7, 0.08, 0.1], [0.32, -0.7, 0.08, 0.1]], eyes: [[-0.17, -0.42], [0.17, -0.42]], big: true, mouth: null, fx: ['beak', 'chest'], anim: 'blink', dir: 1, snd: 'hoot',
      q: ['An owl! Wise and fluffy.', 'An owl. Knows things. Won’t say which.', 'Owl. Wise. Watching.'] },
    { id: 'butterfly', name: 'Butterfly', b: [[-0.45, -0.25, 0.4, 0.34], [0.45, -0.25, 0.4, 0.34], [-0.35, 0.3, 0.27, 0.24], [0.35, 0.3, 0.27, 0.24], [0, 0.02, 0.06, 0.42]], eyes: [[-0.04, -0.3], [0.04, -0.3]], small: true, mouth: null, fx: ['antennae2', 'wingDots'], anim: 'flutter', dir: 1, snd: 'flutter',
      q: ['A butterfly! Light as anything.', 'A butterfly. Glow-up complete.', 'Butterfly. Light. Floating.'] },
    { id: 'jelly', name: 'Jellyfish', b: [[0, -0.2, 0.55, 0.38], [-0.3, 0.25, 0.06, 0.25], [-0.1, 0.32, 0.06, 0.3], [0.1, 0.32, 0.06, 0.3], [0.3, 0.25, 0.06, 0.25]], eyes: [[-0.17, -0.2], [0.17, -0.2]], mouth: [0, -0.06, 0.07], fx: ['jellyRim'], anim: 'pulse', dir: 1, snd: 'blub',
      q: ['A jellyfish, pulsing up and away.', 'A jellyfish. All vibes, no bones.', 'Jellyfish. Pulsing. Gone.'] },
    { id: 'crab', name: 'Crab', b: [[0, 0.1, 0.5, 0.28], [-0.72, -0.28, 0.2, 0.16], [0.72, -0.28, 0.2, 0.16], [-0.48, -0.08, 0.1, 0.08], [0.48, -0.08, 0.1, 0.08], [-0.35, 0.38, 0.07, 0.1], [0.35, 0.38, 0.07, 0.1]], eyes: [[-0.14, -0.06], [0.14, -0.06]], mouth: [0, 0.12, 0.08], fx: ['clawLines'], anim: 'sidestep', dir: 1, snd: 'click',
      q: ['A crab! Off sideways.', 'A crab. Moves sideways, refuses to explain.', 'Crab. Sideways. Off.'] },
    { id: 'frog', name: 'Frog', b: [[0, 0.15, 0.55, 0.38], [-0.28, -0.32, 0.16, 0.14], [0.28, -0.32, 0.16, 0.14], [-0.45, 0.5, 0.16, 0.06], [0.45, 0.5, 0.16, 0.06]], eyes: [[-0.28, -0.34], [0.28, -0.34]], mouth: [0, 0.08, 0.22], fx: [], anim: 'hop', dir: 1, snd: 'ribbit',
      q: ['A frog! Ribbit.', 'A frog. Hopping between clouds like lily pads.', 'Frog. Hop. Ribbit.'] },
    { id: 'bear', name: 'Bear', b: [[0, 0.25, 0.52, 0.42], [0, -0.38, 0.34, 0.3], [-0.28, -0.64, 0.11, 0.1], [0.28, -0.64, 0.11, 0.1]], eyes: [[-0.13, -0.42], [0.13, -0.42]], mouth: [0, -0.24, 0.07], fx: ['snout'], anim: 'wave', dir: 1, snd: 'grr',
      q: ['A bear, waving hello!', 'A bear. Huggable from a safe distance.', 'Bear. Waving. Friendly.'] },
    { id: 'mouse', name: 'Mouse', b: [[0.12, 0.15, 0.45, 0.28], [-0.42, 0, 0.24, 0.2], [-0.48, -0.3, 0.18, 0.18], [-0.22, -0.3, 0.15, 0.15], [0.68, 0.1, 0.18, 0.04]], eyes: [[-0.5, -0.02]], mouth: [-0.6, 0.08, 0.04], fx: ['whiskers'], anim: 'scurry', dir: -1, snd: 'squeak',
      q: ['A mouse, scurrying off.', 'A mouse. Tiny, fast, no notes.', 'Mouse. Scurry. Gone.'] },
    { id: 'hedgehog', name: 'Hedgehog', b: [[0.05, 0.1, 0.58, 0.32], [-0.3, -0.2, 0.12, 0.12], [0, -0.26, 0.12, 0.12], [0.3, -0.2, 0.12, 0.12], [-0.68, 0.18, 0.14, 0.09]], eyes: [[-0.5, 0.04]], mouth: [-0.6, 0.16, 0.04], fx: ['quills'], anim: 'roll', dir: -1, snd: 'snuffle',
      q: ['A hedgehog, rolling away.', 'A hedgehog. Spiky outside, soft inside. Same.', 'Hedgehog. Rolling. Off.'] },
    { id: 'pig', name: 'Pig', b: [[0.05, 0.05, 0.58, 0.38], [-0.7, 0, 0.13, 0.12], [-0.42, -0.38, 0.1, 0.1], [-0.18, -0.4, 0.1, 0.1], [-0.2, 0.46, 0.08, 0.1], [0.35, 0.46, 0.08, 0.1]], eyes: [[-0.45, -0.1]], mouth: [-0.5, 0.12, 0.05], fx: ['nostrils', 'curl'], anim: 'wiggle', dir: -1, snd: 'oink',
      q: ['A pig, flying! Finally.', 'Pigs do fly. Note it down.', 'Pig. Flying. Told you.'] },
    { id: 'serpent', name: 'Sea Serpent', b: [[-0.5, 0.1, 0.22, 0.22], [0, 0.1, 0.22, 0.22], [0.5, 0.1, 0.22, 0.22], [-0.85, -0.15, 0.17, 0.14], [0.85, 0.05, 0.12, 0.08]], eyes: [[-0.88, -0.18]], mouth: [-0.94, -0.06, 0.05], fx: ['humpLines'], anim: 'slither', dir: -1, snd: 'whoosh',
      q: ['A sea serpent! A friendly one.', 'A sea serpent. Big legend, small worries.', 'Serpent. Friendly. Swimming.'] },
    { id: 'unicorn', name: 'Unicorn', b: [[0.15, 0.18, 0.5, 0.28], [-0.3, -0.1, 0.12, 0.25], [-0.5, -0.32, 0.2, 0.14], [-0.52, -0.6, 0.04, 0.14], [-0.05, 0.5, 0.06, 0.18], [0.4, 0.5, 0.06, 0.18], [0.7, 0.1, 0.1, 0.2]], eyes: [[-0.52, -0.34]], mouth: [-0.62, -0.26, 0.04], fx: ['horn', 'mane'], anim: 'gallop', dir: -1, snd: 'sparkle',
      q: ['A unicorn! Of course it is.', 'A unicorn. The sky really went all out.', 'Unicorn. Rare. Nice.'] },
    { id: 'lion', name: 'Lion', b: [[-0.3, -0.15, 0.4, 0.4], [0.25, 0.22, 0.48, 0.28], [0.78, 0, 0.06, 0.2], [0.82, -0.2, 0.08, 0.08], [0, 0.48, 0.07, 0.12], [0.45, 0.48, 0.07, 0.12]], fluff: 1.2, eyes: [[-0.4, -0.2], [-0.2, -0.2]], mouth: [-0.3, -0.04, 0.07], fx: ['lionFace'], anim: 'roar', dir: -1, snd: 'roar',
      q: ['A lion! A very fluffy one.', 'A lion. Big mane energy.', 'Lion. Fluffy. Brave.'] },
    { id: 'penguin', name: 'Penguin', b: [[0, 0.05, 0.36, 0.58], [-0.4, 0.05, 0.1, 0.26], [0.4, 0.05, 0.1, 0.26], [-0.15, 0.62, 0.12, 0.05], [0.15, 0.62, 0.12, 0.05]], eyes: [[-0.12, -0.32], [0.12, -0.32]], mouth: null, fx: ['beak', 'belly'], anim: 'waddle', dir: 1, snd: 'honk',
      q: ['A penguin, waddling by.', 'A penguin. Dressed for something fancy.', 'Penguin. Waddle. Cute.'] },
    { id: 'fox', name: 'Fox', b: [[0.1, 0.2, 0.48, 0.26], [-0.45, -0.1, 0.25, 0.22], [-0.58, -0.36, 0.07, 0.13], [-0.32, -0.38, 0.07, 0.13], [-0.72, 0, 0.12, 0.07], [0.75, -0.05, 0.3, 0.16]], eyes: [[-0.52, -0.14], [-0.36, -0.14]], mouth: [-0.66, 0.06, 0.04], fx: ['tailTip'], anim: 'pounce', dir: -1, snd: 'yip',
      q: ['A fox, bounding off.', 'A fox. Clever, fluffy, gone.', 'Fox. Quick. Off.'] },
    { id: 'balloon', name: 'Hot Air Balloon', b: [[0, -0.22, 0.52, 0.58], [0, 0.38, 0.18, 0.08], [0, 0.66, 0.16, 0.12]], eyes: [[-0.16, -0.2], [0.16, -0.2]], mouth: [0, -0.06, 0.1], fx: ['stripes', 'ropes'], anim: 'float', dir: 0, snd: 'whoosh',
      q: ['A hot air balloon, drifting up.', 'A hot air balloon. Just going with it.', 'Balloon. Up. Drifting.'] },
    { id: 'boat', name: 'Sailboat', b: [[0, 0.48, 0.72, 0.16], [-0.05, -0.12, 0.36, 0.52], [0.05, -0.72, 0.1, 0.06]], eyes: [[-0.2, 0.46], [0.2, 0.46]], mouth: [0, 0.54, 0.07], fx: ['mast'], anim: 'sail', dir: 1, snd: 'splash',
      q: ['A little sailboat, catching the wind.', 'A sailboat. Going wherever. Love that.', 'Boat. Sailing. Easy.'] },
    { id: 'icecream', name: 'Ice Cream', b: [[0, -0.38, 0.42, 0.32], [0, -0.72, 0.28, 0.22], [0, 0.15, 0.28, 0.2], [0, 0.5, 0.13, 0.22], [0.05, -0.98, 0.07, 0.07]], eyes: [[-0.14, -0.4], [0.14, -0.4]], mouth: [0, -0.28, 0.08], fx: ['coneLines'], anim: 'wobble', dir: 1, snd: 'boing',
      q: ['An ice cream! Don’t let it melt.', 'An ice cream. The sky’s treating itself.', 'Ice cream. Sweet. Wobbly.'] },
    // thought-creatures: a looping thought, held lightly
    { id: 'walrus', name: 'What-if Walrus', thought: 'whatif', acc: 'partyhat', b: [[0.1, 0.15, 0.6, 0.38], [-0.42, -0.1, 0.32, 0.28], [-0.5, 0.42, 0.14, 0.07], [0.6, 0.42, 0.14, 0.07]], eyes: [[-0.5, -0.2], [-0.32, -0.2]], mouth: null, fx: ['tusks', 'whiskers'], anim: 'hop', dir: -1, snd: 'party' },
    { id: 'wombat', name: 'Worst-case Wombat', thought: 'worstcase', acc: 'tutu', b: [[0.05, 0.15, 0.6, 0.38], [-0.5, 0, 0.28, 0.24], [-0.62, -0.24, 0.07, 0.07], [-0.4, -0.25, 0.07, 0.07]], eyes: [[-0.58, -0.06], [-0.42, -0.06]], mouth: [-0.5, 0.1, 0.06], fx: [], anim: 'spin', dir: -1, snd: 'party' },
    { id: 'sloth', name: 'Should-have Sloth', thought: 'shouldhave', acc: 'bowtie', b: [[0, 0.15, 0.36, 0.42], [0, -0.3, 0.28, 0.24], [-0.25, -0.62, 0.07, 0.25], [0.25, -0.62, 0.07, 0.25]], eyes: [[-0.1, -0.32], [0.1, -0.32]], mouth: [0, -0.2, 0.08], fx: ['slothMask', 'branch'], anim: 'swing', dir: 1, snd: 'party' },
    { id: 'moose', name: 'Mind-reading Moose', thought: 'mindread', acc: 'shades', b: [[0.15, 0.25, 0.48, 0.28], [-0.42, -0.08, 0.22, 0.2], [-0.62, -0.42, 0.2, 0.1], [-0.22, -0.45, 0.2, 0.1], [0, 0.55, 0.06, 0.14], [0.4, 0.55, 0.06, 0.14]], eyes: [[-0.48, -0.12], [-0.34, -0.12]], mouth: [-0.46, 0.04, 0.06], fx: ['antlers'], anim: 'stomp', dir: -1, snd: 'party' },
    { id: 'rhino', name: 'Replay Rhino', thought: 'replay', acc: 'headphones', b: [[0.15, 0.15, 0.55, 0.34], [-0.5, 0.05, 0.28, 0.22], [-0.78, -0.12, 0.06, 0.12], [-0.1, 0.48, 0.08, 0.12], [0.45, 0.48, 0.08, 0.12]], eyes: [[-0.5, -0.02]], mouth: [-0.66, 0.14, 0.05], fx: ['rhinoHorn'], anim: 'wiggle', dir: -1, snd: 'party' },
    { id: 'toad', name: 'To-do Toad', thought: 'todo', acc: 'propeller', b: [[0, 0.18, 0.55, 0.36], [-0.28, -0.28, 0.15, 0.13], [0.28, -0.28, 0.15, 0.13]], eyes: [[-0.28, -0.3], [0.28, -0.3]], mouth: [0, 0.1, 0.2], fx: ['warts'], anim: 'hop', dir: 1, snd: 'party' },
    { id: 'hippo', name: 'Heartbeat Hippo', thought: 'body', acc: 'flowers', b: [[0.1, 0.12, 0.62, 0.4], [-0.55, -0.05, 0.32, 0.28], [-0.62, -0.32, 0.06, 0.06], [-0.42, -0.34, 0.06, 0.06]], eyes: [[-0.58, -0.16], [-0.42, -0.16]], mouth: [-0.55, 0.12, 0.1], fx: ['nostrils'], anim: 'bob', dir: -1, snd: 'party' },
    { id: 'urchin', name: 'Urge Urchin', thought: 'urge', acc: 'tophat', b: [[0, 0.05, 0.45, 0.45]], spiky: true, eyes: [[-0.15, 0], [0.15, 0]], mouth: [0, 0.14, 0.08], fx: ['spikes'], anim: 'roll', dir: 1, snd: 'party' },
    { id: 'otter', name: 'Overthinking Otter', thought: 'other', acc: 'monocle', b: [[0.1, 0.15, 0.5, 0.3], [-0.42, -0.15, 0.24, 0.22], [0.7, 0.2, 0.25, 0.08], [-0.55, -0.34, 0.06, 0.06], [-0.3, -0.36, 0.06, 0.06]], eyes: [[-0.5, -0.18], [-0.34, -0.18]], mouth: [-0.42, -0.04, 0.06], fx: ['whiskers'], anim: 'float', dir: -1, snd: 'party' }
  ];
  const BY = {}; CR.forEach(c => { BY[c.id] = c; });
  const NORMAL = CR.filter(c => !c.thought);
  const THOUGHT_OF = { whatif: 'walrus', worstcase: 'wombat', shouldhave: 'sloth', mindread: 'moose', replay: 'rhino', todo: 'toad', body: 'hippo', urge: 'urchin', other: 'otter' };
  const STARS_OF_DAY = ['dragon', 'unicorn', 'serpent', 'rocket', 'teapot', 'balloon', 'octopus'];

  /* ---------------- shape reading: radial profiles ---------------- */
  const NA = 24;
  function blobCentroid(b) { let ax = 0, ay = 0, aw = 0; for (const e of b) { const w = e[2] * e[3]; ax += e[0] * w; ay += e[1] * w; aw += w; } return { x: ax / aw, y: ay / aw }; }
  function rayEllipse(ox, oy, dx, dy, e) { // farthest positive hit of a ray with an axis-aligned ellipse
    const px = (ox - e[0]) / e[2], py = (oy - e[1]) / e[3], vx = dx / e[2], vy = dy / e[3];
    const A = vx * vx + vy * vy, B = 2 * (px * vx + py * vy), C = px * px + py * py - 1, D = B * B - 4 * A * C;
    if (D < 0) return -1; const t = (-B + Math.sqrt(D)) / (2 * A); return t;
  }
  function blobProfile(b) {
    const c = blobCentroid(b), p = [];
    for (let i = 0; i < NA; i++) { const a = i / NA * TAU, dx = Math.cos(a), dy = Math.sin(a); let m = 0.05; for (const e of b) { const t = rayEllipse(c.x, c.y, dx, dy, e); if (t > m) m = t; } p.push(m); }
    return norm(p);
  }
  function polyProfile(pts) {
    let cx = 0, cy = 0, A = 0;
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], cr = a.x * b.y - b.x * a.y; A += cr; cx += (a.x + b.x) * cr; cy += (a.y + b.y) * cr; }
    if (Math.abs(A) < 1e-3) return null;
    cx /= 3 * A; cy /= 3 * A;
    const p = [];
    for (let i = 0; i < NA; i++) {
      const a = i / NA * TAU, dx = Math.cos(a), dy = Math.sin(a); let m = 0;
      for (let j = 0; j < pts.length; j++) {
        const p1 = pts[j], p2 = pts[(j + 1) % pts.length], ex = p2.x - p1.x, ey = p2.y - p1.y, den = dx * ey - dy * ex;
        if (Math.abs(den) < 1e-9) continue;
        const t = ((p1.x - cx) * ey - (p1.y - cy) * ex) / den, u = ((p1.x - cx) * dy - (p1.y - cy) * dx) / den;
        if (t > 0 && u >= 0 && u <= 1 && t > m) m = t;
      }
      p.push(Math.max(m, 1));
    }
    return { prof: norm(p), area: Math.abs(A) / 2, c: { x: cx, y: cy } };
  }
  function norm(p) { const m = p.reduce((s, v) => s + v, 0) / p.length; return p.map(v => v / m); }
  function pdist(a, b) { let best = 1e9; for (const sh of [-1, 0, 1]) { let d = 0; for (let i = 0; i < NA; i++) { const q = a[i] - b[(i + sh + NA) % NA]; d += q * q; } best = Math.min(best, d / NA); } return best; }
  function ellipseProfileOf(pts) { // the profile of the trace's own best-fit ellipse: how "plain" a loop is
    let mx = 0, my = 0; pts.forEach(p => { mx += p.x; my += p.y; }); mx /= pts.length; my /= pts.length;
    let sxx = 0, syy = 0, sxy = 0; pts.forEach(p => { const dx = p.x - mx, dy = p.y - my; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; });
    const tr = sxx + syy, det = sxx * syy - sxy * sxy, l1 = tr / 2 + Math.sqrt(Math.max(0, tr * tr / 4 - det)), l2 = tr / 2 - Math.sqrt(Math.max(0, tr * tr / 4 - det));
    const ang = 0.5 * Math.atan2(2 * sxy, sxx - syy), a = Math.sqrt(Math.max(l1, 1)), b = Math.sqrt(Math.max(l2, 1)), p = [];
    for (let i = 0; i < NA; i++) { const t = i / NA * TAU - ang, r = 1 / Math.sqrt(Math.pow(Math.cos(t) / a, 2) + Math.pow(Math.sin(t) / b, 2)); p.push(r); }
    return norm(p);
  }
  CR.forEach(c => { c.prof = blobProfile(c.b); });

  /* ---------------- puffs: creatures and clouds made of soft round puffs ---------------- */
  function crispPuffs(c) {
    const out = [], f = c.fluff || 1;
    for (const e of c.b) {
      const mn = Math.min(e[2], e[3]), mxr = Math.max(e[2], e[3]), along = e[2] >= e[3], thin = mn < 0.13;
      const n = Math.max(1, Math.ceil(mxr / mn * (thin ? 1.4 : 1)));
      for (let i = 0; i < n; i++) { const u = n === 1 ? 0 : (i / (n - 1) - 0.5) * 2 * (mxr - mn); out.push({ x: e[0] + (along ? u : 0), y: e[1] + (along ? 0 : u), r: mn * (thin ? 1.28 : 0.98), thin }); }
      if (thin) continue; // ears, legs, necks and tails stay smooth; only the big shapes get cloud lobes
      const per = Math.PI * (3 * (e[2] + e[3]) - Math.sqrt((3 * e[2] + e[3]) * (e[2] + 3 * e[3])));
      const k = clamp(Math.round(per / (mn * 1.6 + 0.15)), 3, 10);
      for (let i = 0; i < k; i++) { const a = i / k * TAU + 0.3; out.push({ x: e[0] + Math.cos(a) * e[2] * 0.78, y: e[1] + Math.sin(a) * e[3] * 0.78, r: (mn * 0.5 + 0.04) * f }); }
    }
    return out.slice(0, 72);
  }
  function cloudPuffs(c, R) { // a fuzzier, more ambiguous version of a creature: the cloud you see first
    const cr = crispPuffs(c), out = cr.map(p => ({ x: p.x * 0.92 + (R() - 0.5) * 0.18, y: p.y * 0.86 + (R() - 0.5) * 0.16, r: p.r * (1.05 + R() * 0.35) }));
    for (let i = 0; i < 7; i++) out.push({ x: (R() - 0.5) * 1.1, y: (R() - 0.5) * 0.5, r: 0.24 + R() * 0.14, filler: true });
    return out;
  }

  /* ---------------- sky palettes (daily time of day; dark theme is the evening sky) ---------------- */
  const SKIES = {
    morning: { top: '#78b0e6', mid: '#a9d0ef', low: '#f7dcc6', sun: [0.18, 0.3], sunCol: '#fff3d6', puff: '#ffffff', shade: '#b8c8e4', rim: '#ffe8d4', grass: ['#79b25e', '#5d9a4c', '#9ccb72'], flower: ['#ffffff', '#ffe066', '#ffb3c8'], dark: false, wind: 1 },
    noon: { top: '#3d8bda', mid: '#76b6ea', low: '#cfe8f6', sun: [0.8, 0.22], sunCol: '#fffbe8', puff: '#ffffff', shade: '#a8bcdc', rim: '#ffffff', grass: ['#6aac55', '#4f9446', '#8cc767'], flower: ['#ffffff', '#ffd43b', '#c4a4ff'], dark: false, wind: 1 },
    golden: { top: '#6ca6d8', mid: '#efc79c', low: '#f6a66c', sun: [0.78, 0.36], sunCol: '#ffe2a8', puff: '#fff6ea', shade: '#c9a7b9', rim: '#ffd6a0', grass: ['#8aa94f', '#6c8e3f', '#b3c267'], flower: ['#fff2d6', '#ffb347', '#ff8fa3'], dark: false, wind: 1 },
    breezy: { top: '#4a93d8', mid: '#8cc4ee', low: '#dceff8', sun: [0.22, 0.22], sunCol: '#fffbe8', puff: '#ffffff', shade: '#a5b9da', rim: '#ffffff', grass: ['#6fae5a', '#518f45', '#93c96f'], flower: ['#ffffff', '#ffe066', '#9fd4ff'], dark: false, wind: 1.5 },
    rainbow: { top: '#6c9dcf', mid: '#b6d4e9', low: '#eaf0f1', sun: [0.84, 0.24], sunCol: '#fffaf0', puff: '#ffffff', shade: '#b1bfd6', rim: '#ffffff', grass: ['#68ad5c', '#4c9248', '#91cc72'], flower: ['#ffffff', '#ffd43b', '#ff9ec4'], dark: false, wind: 0.9, rainbow: true },
    dusk: { top: '#1d2552', mid: '#5c4b88', low: '#e58c86', sun: [0.7, 0.86], sunCol: '#ffc69a', puff: '#ffe3ea', shade: '#7a6aa8', rim: '#ffb8c4', grass: ['#33553f', '#25432f', '#467454'], flower: ['#e9e4ff', '#ffd6a8', '#ffb8d0'], dark: true, wind: 0.9, stars: true },
    twilight: { top: '#121a3c', mid: '#2f3c70', low: '#8b6b9c', sun: [0.2, 0.23], sunCol: '#f4f0dc', puff: '#dfe5fb', shade: '#5c6596', rim: '#f2eaff', grass: ['#2c4a3a', '#203a2c', '#3c6249'], flower: ['#e4e0ff', '#fff0b8', '#c8b8ff'], dark: true, wind: 0.8, stars: true, moon: true }
  };
  const SUNSET = { top: '#3a4a8a', mid: '#e58a6a', low: '#ffc36e', sun: [0.5, 0.86], sunCol: '#ffd27a', puff: '#ffe2cc', shade: '#c27a8a' };
  const NIGHT = { top: '#060a1e', mid: '#11183c', low: '#2a2352', night: true };

  /* ================================================================================================================ */
  (env.games = env.games || []).push({
    id: 'cloud-shapes', mode: 'reset', name: 'Cloud Shapes', verb: 'trace', family: 'PLAY', minutes: 2,
    parents: ['Creativity / Mind Play', 'Overthinking / Thought Fusion', 'Attention / Grounding / Mental Quiet'],
    cast: ['loopie', 'sync'], poster: { char: 'loopie', mood: 'silly' },
    tagline: 'Lie back, loop a cloud, and watch it become what you saw.',
    why: 'For a stuck, looping head: easy imagining that turns worries into silly sky creatures.',
    fonts: ['Sniglet:wght@400;800', 'Gochi+Hand'],
    css: `
.g-cloud-shapes { --cs-display: "Sniglet", "Arial Rounded MT Bold", "Nunito", "Trebuchet MS", system-ui, sans-serif; --cs-hand: "Gochi Hand", "Comic Sans MS", "Chalkboard SE", "Segoe Print", cursive; background: #6aa6dd; }
.g-cloud-shapes .cs-stage { position: absolute; inset: 0; z-index: 12; touch-action: none; cursor: crosshair; -webkit-tap-highlight-color: transparent; outline: none; }
.g-cloud-shapes .cs-hud { position: absolute; z-index: 32; left: 50%; top: calc(env(safe-area-inset-top, 0px) + 60px); transform: translateX(-50%); display: flex; align-items: center; gap: 8px; padding: 5px 12px 5px 12px; height: 40px;
  border-radius: 999px; background: color-mix(in srgb, var(--ui-surface) 86%, transparent); border: 1px solid var(--ui-line); color: var(--ui-fg); box-shadow: 0 8px 20px rgba(20, 40, 80, 0.22); pointer-events: none; max-width: calc(100% - 24px); }
.g-cloud-shapes .cs-hud b { font: 800 12px/1 var(--cs-display); letter-spacing: 0.12em; text-transform: uppercase; white-space: nowrap; }
.g-cloud-shapes .cs-thumbs { display: flex; gap: 4px; align-items: center; }
.g-cloud-shapes .cs-thumbs i { display: block; width: var(--tw, 28px); height: var(--tw, 28px); border-radius: 50%; background: rgba(120, 170, 230, 0.25); border: 1.5px dashed color-mix(in srgb, var(--ui-fg) 35%, transparent); flex: none; overflow: hidden; }
.g-cloud-shapes .cs-thumbs i.cs-on { border: 0; background: radial-gradient(circle at 50% 35%, #8cc4f2, #4f8fd6); animation: cloud-shapes-pop 0.5s cubic-bezier(.2, 1.7, .4, 1); }
.g-cloud-shapes .cs-thumbs i.cs-grey.cs-on { background: radial-gradient(circle at 50% 35%, #ffd98a, #ff9f6b); }
.g-cloud-shapes .cs-thumbs canvas { width: 100%; height: 100%; display: block; }
@keyframes cloud-shapes-pop { 0% { transform: scale(0.4); } 60% { transform: scale(1.25); } 100% { transform: scale(1); } }
.g-cloud-shapes .cs-name { position: absolute; z-index: 34; left: 0; top: 0; pointer-events: none; font: 800 30px/1 var(--cs-display); color: #ffffff; white-space: nowrap; text-shadow: 0 3px 0 rgba(40, 70, 130, 0.45), 0 8px 22px rgba(20, 40, 90, 0.4);
  transform: translate(-50%, -50%); animation: cloud-shapes-name 2.3s cubic-bezier(.2, 1.2, .4, 1) both; letter-spacing: 0.01em; text-align: center; }
.g-cloud-shapes .cs-name.cs-silly { color: #fff3c4; }
.g-cloud-shapes .cs-name small { display: block; width: max-content; margin: 8px auto 0; padding: 4px 10px 5px; border-radius: 999px; font: 800 12px/1 var(--cs-display); letter-spacing: 0.1em; text-transform: uppercase; color: #3a2a12; background: linear-gradient(#ffe7a3, #ffc95e); text-shadow: none; box-shadow: 0 4px 12px rgba(40, 30, 10, 0.25); }
.g-cloud-shapes .cs-name.cs-calm { animation: none; }
.g-cloud-shapes .cs-hud { transition: opacity 0.8s ease; }
.g-cloud-shapes .cs-hud.cs-hide { opacity: 0; }
.g-cloud-shapes .cs-sync.gk-side-above .gk-bubble { left: auto; right: 0; }
@keyframes cloud-shapes-name { 0% { opacity: 0; transform: translate(-50%, -30%) scale(0.6) rotate(-6deg); } 16% { opacity: 1; transform: translate(-50%, -50%) scale(1.08) rotate(2deg); } 26% { transform: translate(-50%, -50%) scale(1) rotate(0); } 78% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -80%) scale(0.96); } }
.g-cloud-shapes .cs-strand { position: absolute; z-index: 30; left: 0; top: 0; pointer-events: none; padding: 6px 12px 7px; border-radius: 14px; background: rgba(58, 64, 86, 0.9); color: #f1f3fa; box-shadow: 0 6px 16px rgba(10, 14, 30, 0.35);
  font-size: 15px; line-height: 1.2; letter-spacing: 0.03em; max-width: min(270px, calc(100% - 24px)); text-align: center; text-wrap: balance; transition: background 0.6s ease, color 0.6s ease, opacity 0.5s ease; will-change: transform; }
.g-cloud-shapes .cs-strand.cs-light { background: rgba(255, 252, 240, 0.95); color: #3a3550; box-shadow: 0 6px 16px rgba(40, 60, 120, 0.25); }
.g-cloud-shapes .cs-strand.cs-gone { opacity: 0; }
.g-cloud-shapes .cs-title { position: absolute; z-index: 36; left: 50%; top: calc(env(safe-area-inset-top, 0px) + 72px); transform: translateX(-50%); text-align: center; pointer-events: none; color: #fff7e6; width: max-content; max-width: calc(100% - 32px);
  font: 800 clamp(26px, 7.5cqw, 40px)/1.05 var(--cs-display); text-shadow: 0 4px 20px rgba(0, 0, 30, 0.6); opacity: 0; transition: opacity 1.2s ease, transform 1.2s cubic-bezier(.2, 1.2, .4, 1); }
.g-cloud-shapes .cs-title.cs-on { opacity: 1; }
.g-cloud-shapes .cs-title small { display: block; font: 400 21px/1.2 var(--cs-hand); letter-spacing: 0.02em; margin-top: 6px; color: #dfe6ff; }
.g-cloud-shapes .cs-star { position: absolute; z-index: 33; left: 0; top: 0; transform: translateX(-50%); pointer-events: none; font: 800 12px/1.15 var(--cs-display); letter-spacing: 0.12em; text-transform: uppercase; color: #e9edff;
  text-shadow: 0 1px 8px rgba(0, 0, 30, 0.9); width: max-content; max-width: var(--mw, 150px); text-align: center; text-wrap: balance; opacity: 0; transition: opacity 1s ease; }
.g-cloud-shapes .cs-star.cs-on { opacity: 0.95; }
.g-cloud-shapes .cs-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
`,
    mount(ctx) {
      const K = ctx.kit, S = ctx.TS, A = ctx.A, h = ctx.h, el = ctx.el;
      let an = ctx.analysis || {};
      if (ctx.analysisReady && ctx.analysisReady.then) ctx.analysisReady.then(a => { if (a && a.strands) an = a; }, () => {});
      const inten = ctx.intensity, line = (o) => ctx.line(o), care = () => an.safety === 'care';
      const NORMALS = [5, 5, 6][inten], THOUGHTS = [1, 2, 3][inten], TOTAL = NORMALS + THOUGHTS, TWIST_AT = 3;
      const day = K.daily(), DR = rngOf(day * 17 + 3);
      const dark = () => K.dark();
      const skyId = () => dark() ? K.dailyPick(['dusk', 'twilight'], 5) : K.dailyPick(['morning', 'noon', 'golden', 'breezy', 'rainbow'], 6);
      const starOfDay = K.dailyPick(STARS_OF_DAY, 7);
      const DRIFT = [9, 13, 17][inten];

      /* ---------------- DOM ---------------- */
      const ddpr = window.devicePixelRatio || 1;
      const cv = K.canvas(el, { opaque: true, maxDpr: ddpr <= 2 ? Math.max(1, ddpr) : ddpr / Math.round(ddpr / 1.5) });
      const P = K.particles({ max: 260 });
      const stage = h('div', { class: 'cs-stage', role: 'application', tabindex: '-1', 'aria-label': 'The sky. Draw a loop around a cloud to see what it is.' });
      el.append(stage);
      const hud = h('div', { class: 'cs-hud', 'aria-hidden': 'true' }, h('b', { text: 'Your sky' }), h('div', { class: 'cs-thumbs' }));
      el.append(hud);
      const thumbs = hud.querySelector('.cs-thumbs');
      for (let i = 0; i < TOTAL; i++) thumbs.append(h('i'));
      const sr = h('div', { class: 'cs-sr', 'aria-live': 'polite' }); el.append(sr);
      const title = h('div', { class: 'cs-title', 'aria-live': 'polite' }); el.append(title);
      // both friends lie in the grass at the bottom; their bubbles rise above them (Sync's is right-aligned), one voice at a time
      const loopie = K.character('loopie', { side: 'above', mood: 'silly', x: 10, y: 700, size: 84 });
      const sync = K.character('sync', { side: 'above', mood: 'worried', x: 300, y: 700, size: 84, voice: 640 });
      sync.el.classList.add('cs-sync');
      sync.show(false);
      const talk = (who, text, o) => { (who === loopie ? sync : loopie).hush(); return who.say(text, o); };

      /* ---------------- audio: a breezy ukulele loop, and the sky's own sounds ---------------- */
      const amb = K.ambience('dawn'); amb.level(0.5, 2);
      const loops = []; const mkLoop = (o) => { if (!A.ctx) return null; const l = A.loop(o); if (l) loops.push(l); return l; };
      S.onDestroy(() => loops.forEach(l => { try { l.stop(); } catch (e) { /* gone */ } }));
      const KEY = { C: ['C4', 'E4', 'G4'], G: ['B3', 'D4', 'G4'], Am: ['C4', 'E4', 'A4'], F: ['C4', 'F4', 'A4'] }, PROG = ['C', 'G', 'Am', 'F'], BASS = { C: 'C3', G: 'G2', Am: 'A2', F: 'F2' };
      const GLOCK = ['E5', 'G5', 'A5', 'C6', 'D6', 'E6', 'G6'];
      const MU = { on: false, next: 0, beat: 0, bpm: 92, mood: 0, vol: 1 };
      function musicTick() {
        if (!A.ctx || !MU.on) return;
        const now = A.now();
        if (MU.next < now - 0.4) MU.next = now + 0.08;
        while (MU.next < now + 0.25) {
          const t = MU.next, i = MU.beat, e = i % 8, bar = Math.floor(i / 8) % 4, ch = PROG[bar], v = MU.vol * (MU.mood ? 0.7 : 1);
          if ([0, 2, 3, 5, 6].includes(e)) { const down = e % 2 === 0; KEY[ch].forEach((n, k) => A.pluck(A.note(n) * (MU.mood && ch === 'C' ? 0.944 : 1), { when: t + (down ? k : 2 - k) * 0.012, vol: 0.045 * v * (down ? 1 : 0.7), damp: 0.992, lp: 2600, bus: 'music' })); }
          if (e === 0 || e === 4) A.pluck(A.note(BASS[ch]), { when: t, vol: 0.12 * v, damp: 0.994, lp: 520, bus: 'music' });
          if (e % 2 === 1 && inten > 0) A.shaker(t, 0.012 * v);
          if (e === 0) beatQ.push(A.heardAt(t));
          MU.beat++; MU.next += 30 / MU.bpm;
        }
      }
      const beatQ = [];
      const SND = {
        whale(A2) { A2.tone({ type: 'sine', freq: 180, to: 320, glide: 0.8, dur: 1.4, attack: 0.3, vol: 0.06, verb: 0.6 }); A2.tone({ when: A2.now() + 0.9, type: 'sine', freq: 300, to: 210, glide: 0.7, dur: 1.1, attack: 0.2, vol: 0.05, verb: 0.6 }); },
        boing(A2) { A2.boing({ freq: 420, vol: 0.09 }); A2.tone({ when: A2.now() + 0.25, type: 'triangle', freq: 520, to: 900, glide: 0.12, dur: 0.18, vol: 0.05 }); },
        dragon(A2) { A2.noise({ filter: 'lowpass', freq: 600, to: 200, dur: 0.7, attack: 0.08, vol: 0.09 }); A2.tone({ type: 'sawtooth', freq: 140, to: 90, glide: 0.5, dur: 0.6, vol: 0.03, lp: 600 }); },
        kettle(A2) { A2.tone({ type: 'sine', freq: 1500, to: 1900, glide: 0.8, dur: 1, attack: 0.3, vol: 0.04 }); },
        stomp(A2) { [0, 0.32, 0.64].forEach(o => A2.drum(A2.now() + o, 0.22, 0.7, 0.1)); },
        bleat(A2) { A2.bleat({ pitch: 1.1, vol: 0.12 }); },
        rocket(A2) { A2.noise({ filter: 'bandpass', freq: 400, to: 3000, q: 0.8, dur: 1.4, attack: 0.2, vol: 0.1 }); A2.tone({ type: 'sine', freq: 200, to: 900, glide: 1.2, dur: 1.3, vol: 0.04 }); },
        blub(A2) { for (let i = 0; i < 4; i++) A2.tone({ when: A2.now() + i * 0.12, type: 'sine', freq: 300 + i * 90, to: 700 + i * 120, glide: 0.08, dur: 0.1, vol: 0.05 }); },
        squish(A2) { A2.noise({ filter: 'bandpass', freq: 700, q: 2, dur: 0.3, attack: 0.1, vol: 0.06 }); },
        meow(A2) { A2.tone({ type: 'triangle', freq: 600, to: 900, glide: 0.18, dur: 0.22, vol: 0.05, lp: 2000 }); A2.tone({ when: A2.now() + 0.2, type: 'triangle', freq: 900, to: 520, glide: 0.3, dur: 0.35, vol: 0.05, lp: 2000 }); },
        yip(A2) { [0, 0.18].forEach(o => A2.tone({ when: A2.now() + o, type: 'square', freq: 700, to: 1100, glide: 0.06, dur: 0.09, vol: 0.03, lp: 2400 })); },
        trumpet(A2) { A2.tone({ type: 'sawtooth', freq: 330, to: 520, glide: 0.25, dur: 0.6, attack: 0.05, vol: 0.05, lp: 1800 }); },
        tweet(A2) { for (let i = 0; i < 4; i++) A2.tone({ when: A2.now() + i * 0.1, type: 'sine', freq: 2800 + (i % 2) * 600, to: 3600, glide: 0.04, dur: 0.07, vol: 0.035 }); },
        quack(A2) { [0, 0.22].forEach(o => A2.tone({ when: A2.now() + o, type: 'sawtooth', freq: 340, to: 260, glide: 0.1, dur: 0.14, vol: 0.04, lp: 1100 })); },
        hoot(A2) { [0, 0.4].forEach(o => A2.tone({ when: A2.now() + o, type: 'sine', freq: 410, to: 360, glide: 0.25, dur: 0.3, vol: 0.06, attack: 0.04, verb: 0.5 })); },
        flutter(A2) { for (let i = 0; i < 6; i++) A2.noise({ when: A2.now() + i * 0.07, filter: 'bandpass', freq: 3000, q: 2, dur: 0.04, vol: 0.03 }); },
        click(A2) { for (let i = 0; i < 4; i++) A2.wood(A2.now() + i * 0.09, 0.08, 1.4); },
        ribbit(A2) { [0, 0.25].forEach(o => A2.tone({ when: A2.now() + o, type: 'square', freq: 180, to: 130, glide: 0.12, dur: 0.16, vol: 0.04, lp: 700 })); },
        grr(A2) { A2.tone({ type: 'sawtooth', freq: 110, to: 90, glide: 0.4, dur: 0.5, vol: 0.04, lp: 500 }); },
        squeak(A2) { A2.tone({ type: 'sine', freq: 2200, to: 2800, glide: 0.06, dur: 0.1, vol: 0.04 }); },
        snuffle(A2) { for (let i = 0; i < 3; i++) A2.noise({ when: A2.now() + i * 0.14, filter: 'bandpass', freq: 1200, q: 1.5, dur: 0.08, vol: 0.05 }); },
        oink(A2) { [0, 0.24].forEach(o => A2.tone({ when: A2.now() + o, type: 'sawtooth', freq: 260, to: 200, glide: 0.1, dur: 0.15, vol: 0.04, lp: 900 })); },
        whoosh(A2) { A2.whoosh({ from: 300, to: 1600, dur: 0.8, vol: 0.08 }); },
        sparkle(A2) { for (let i = 0; i < 6; i++) A2.tone({ when: A2.now() + i * 0.06, type: 'sine', freq: 1800 + i * 300, dur: 0.18, vol: 0.03 }); },
        roar(A2) { A2.noise({ filter: 'lowpass', freq: 900, to: 300, dur: 0.6, attack: 0.05, vol: 0.07 }); A2.tone({ type: 'sawtooth', freq: 160, to: 120, glide: 0.4, dur: 0.5, vol: 0.03, lp: 700 }); },
        honk(A2) { [0, 0.2].forEach(o => A2.tone({ when: A2.now() + o, type: 'square', freq: 440, to: 380, glide: 0.1, dur: 0.12, vol: 0.03, lp: 1400 })); },
        splash(A2) { A2.noise({ filter: 'bandpass', freq: 1600, q: 0.8, dur: 0.5, attack: 0.02, vol: 0.07 }); },
        party(A2) { A2.tone({ type: 'sawtooth', freq: 300, to: 620, glide: 0.35, dur: 0.5, vol: 0.05, lp: 1800 }); A2.tone({ when: A2.now() + 0.5, type: 'sawtooth', freq: 620, to: 560, glide: 0.2, dur: 0.3, vol: 0.04, lp: 1800 }); A2.boing({ freq: 380, vol: 0.06 }); }
      };

      /* ---------------- layout + painting ---------------- */
      let L = null, SKY = null, GRASS = null, SPR = {}, skyKey = '';
      function mk(w, hh) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(hh)); return { c, g: c.getContext('2d') }; }
      function layout() {
        const w = cv.w, hh = cv.h; if (!w || !hh) return false;
        const phone = w < 700, s = phone ? clamp(Math.min(w / 390, hh / 800), 0.85, 1.12) : clamp(Math.min(w / 1000, hh / 760), 1.05, 1.4);
        const grassY = Math.round(hh - (phone ? 168 : 150) * Math.min(1.15, s));
        const u = Math.round((phone ? 80 : 98) * s);
        const band = { y0: phone ? 162 : 150, y1: grassY - (phone ? 104 : 90) };
        const lanes = []; const n = 3; for (let i = 0; i < n; i++) lanes.push(Math.round(band.y0 + u * 0.8 + (band.y1 - band.y0 - u * 1.6) * (i / (n - 1))));
        L = { w, h: hh, phone, s, u, grassY, band, lanes, dpr: cv.dpr };
        const lp = phone ? { x: 8, y: hh - 104, size: 82 } : { x: 36, y: hh - 132, size: 108 };
        const sp = phone ? { x: w - 90, y: hh - 104, size: 82 } : { x: w - 144, y: hh - 132, size: 108 };
        loopie.place(lp.x, lp.y); loopie.el.style.setProperty('--sz', lp.size + 'px');
        sync.place(sp.x, sp.y); sync.el.style.setProperty('--sz', sp.size + 'px');
        const tw = Math.min(30, Math.floor((Math.min(w - 24, 520) - 110) / TOTAL) - 4);
        thumbs.style.setProperty('--tw', tw + 'px');
        L.hudB = (hud.offsetTop + hud.offsetHeight) || 100; // read once per layout: names and labels stay below the HUD
        return true;
      }
      function sprites() {
        const d = L.dpr, pal = SKIES[skyId()];
        const soft = (col, inner, a) => { // a flat-coloured round puff with a soft edge; the light is added once per cloud
          const S2 = Math.round(96 * d), p = mk(S2, S2), g = p.g, c = S2 / 2;
          g.fillStyle = rad(g, c, c, c * inner, c, [[0, hexA(col, a == null ? 1 : a)], [1, hexA(col, 0)]]); g.fillRect(0, 0, S2, S2);
          return p.c;
        };
        SPR.body = soft(pal.puff, 0.64); SPR.shade = soft(mix(pal.shade, pal.puff, 0.15), 0.2, 0.42); // very soft creases, no ribbing
        SPR.gbody = soft('#d5dae4', 0.64); SPR.gshade = soft('#6c748a', 0.2, 0.5);
        SPR.rim = pal.rim; SPR.dark = pal.shade;
        const gl = mk(64 * d, 64 * d); gl.g.fillStyle = rad(gl.g, 32 * d, 32 * d, 0, 32 * d, [[0, 'rgba(255,248,220,0.9)'], [0.3, 'rgba(255,236,180,0.35)'], [1, 'rgba(255,236,180,0)']]); gl.g.fillRect(0, 0, 64 * d, 64 * d); SPR.glow = gl.c;
        // the sun (or the moon) is drawn live, so it can set at the end
        const orb = (col, moon) => {
          const R = 92, S3 = Math.round(R * 2 * d), o = mk(S3, S3), g = o.g, c = S3 / 2, r = (moon ? 19 : 24) * d;
          g.fillStyle = rad(g, c, c, 0, c, [[0, hexA(col, moon ? 0.32 : 0.55)], [0.22, hexA(col, moon ? 0.12 : 0.24)], [1, hexA(col, 0)]]); g.fillRect(0, 0, S3, S3);
          const dc = mk(S3, S3), dg = dc.g;
          dg.fillStyle = rad(dg, c - r * 0.35, c - r * 0.35, 0, r * 1.2, [[0, mix(col, '#ffffff', 0.55)], [1, col]]); dg.beginPath(); dg.arc(c, c, r, 0, TAU); dg.fill();
          if (moon) { dg.globalCompositeOperation = 'destination-out'; dg.beginPath(); dg.arc(c + r * 0.48, c - r * 0.3, r * 0.9, 0, TAU); dg.fill(); dg.globalCompositeOperation = 'source-over'; }
          g.drawImage(dc.c, 0, 0);
          return { c: o.c, R };
        };
        SPR.sun = orb(pal.sunCol || '#fff3d6', !!pal.moon); SPR.sunset = orb(SUNSET.sunCol, false); SPR.moon = orb('#f4f0dc', true);
      }
      function paintSky(pal, target) {
        const d = L.dpr, w = L.w, hh = L.h, sk = target || mk(w * d, hh * d), g = sk.g, R = rngOf(day * 5 + 1);
        g.setTransform(d, 0, 0, d, 0, 0);
        g.fillStyle = lin(g, 0, 0, 0, L.grassY + 30, [[0, pal.top], [0.55, pal.mid], [1, pal.low]]); g.fillRect(0, 0, w, hh);
        if (pal.stars) for (let i = 0; i < 140; i++) { const y = R() * L.grassY * 0.75; g.fillStyle = 'rgba(255,255,255,' + ((0.2 + R() * 0.6) * (1 - y / (L.grassY * 0.75))) + ')'; g.beginPath(); g.arc(R() * w, y, (R() < 0.1 ? 1.4 : 0.8), 0, TAU); g.fill(); }
        if (pal.sun) { // the wide glow is part of the sky; the disc itself is drawn live (it sets in the finale)
          const sx = pal.sun[0] * w, sy = pal.sun[1] * L.grassY, a = pal.moon ? 0.22 : 0.5;
          g.fillStyle = rad(g, sx, sy, 0, Math.max(w, hh) * 0.6, [[0, hexA(pal.sunCol, a)], [0.14, hexA(pal.sunCol, a * 0.45)], [1, hexA(pal.sunCol, 0)]]); g.fillRect(0, 0, w, hh);
        }
        if (pal.rainbow) { // a faint, soft-edged rainbow low over the hills
          const cx = w * 0.32, cy = L.grassY + 50, r = Math.min(w * 0.9, hh * 0.55);
          ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa'].forEach((c, i) => { for (const [lw, al] of [[14, 0.06], [8, 0.13]]) { g.strokeStyle = hexA(c, al); g.lineWidth = lw * L.s; g.beginPath(); g.arc(cx, cy, r - i * 8 * L.s, Math.PI * 1.02, Math.PI * 1.78); g.stroke(); } });
        }
        if (!pal.night) for (let i = 0; i < 7; i++) { // long, soft cirrus wisps catching the light
          const x = R() * w, y = L.band.y0 * 0.5 + R() * (L.grassY - L.band.y0) * 0.85, cw = (90 + R() * 190) * L.s, ch = (4 + R() * 7) * L.s, col = pal.stars ? pal.low : (pal.rim || '#ffffff');
          g.save(); g.translate(x, y); g.rotate((R() - 0.5) * 0.1); g.scale(cw, ch);
          g.fillStyle = rad(g, 0, 0, 0, 1, [[0, hexA(col, pal.stars ? 0.2 : 0.42)], [0.6, hexA(col, pal.stars ? 0.07 : 0.16)], [1, hexA(col, 0)]]); g.beginPath(); g.arc(0, 0, 1, 0, TAU); g.fill(); g.restore();
        }
        for (let i = 0; i < 200; i++) { g.fillStyle = 'rgba(255,255,255,0.03)'; g.fillRect(R() * w, R() * hh, 2, 2); }
        return sk;
      }
      function paintGrass(pal) {
        const d = L.dpr, w = L.w, hh = L.h, gy = L.grassY, gr = mk(w * d, hh * d), g = gr.g, R = rngOf(day * 3 + 9), cols = pal.grass || ['#2a3a2a', '#1c2a1c', '#3a5a3a'];
        g.setTransform(d, 0, 0, d, 0, 0);
        g.fillStyle = cols[1]; g.beginPath(); g.moveTo(0, gy + 30); for (let x = 0; x <= w; x += 12) g.lineTo(x, gy + 18 + Math.sin(x / w * 3 + 0.6) * 14); g.lineTo(w, hh); g.lineTo(0, hh); g.closePath(); g.fill();
        g.fillStyle = lin(g, 0, gy, 0, hh, [[0, cols[0]], [1, cols[1]]]); g.beginPath(); g.moveTo(0, gy + 50); for (let x = 0; x <= w; x += 12) g.lineTo(x, gy + 40 + Math.sin(x / w * 5 + 2) * 12); g.lineTo(w, hh); g.lineTo(0, hh); g.closePath(); g.fill();
        for (let i = 0; i < w * 1.4; i++) { const x = R() * w, base = gy + 46 + R() * (hh - gy), len = (8 + R() * 18) * L.s, lean = (R() - 0.4) * 8; g.strokeStyle = R() < 0.5 ? cols[2] : cols[0]; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, base); g.quadraticCurveTo(x + lean * 0.4, base - len * 0.6, x + lean, base - len); g.stroke(); }
        const fl = pal.flower || ['#ffffff'];
        for (let i = 0; i < w / 14; i++) { const x = R() * w, y = gy + 56 + R() * (hh - gy - 50), c = fl[Math.floor(R() * fl.length)], r = (2 + R() * 2.4) * L.s; g.strokeStyle = cols[1]; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y + r); g.lineTo(x, y + r + 8); g.stroke(); g.fillStyle = c; for (let k = 0; k < 5; k++) { const a = k * TAU / 5; ell(g, x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.8, r * 0.5, a); g.fill(); } g.fillStyle = '#ffcf3a'; g.beginPath(); g.arc(x, y, r * 0.5, 0, TAU); g.fill(); }
        g.fillStyle = lin(g, 0, hh - 60, 0, hh, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.25)']]); g.fillRect(0, hh - 60, w, 60);
        return gr;
      }
      let SUNSET_SKY = null, NIGHT_SKY = null;
      function paint() {
        if (!L) return;
        const id = skyId(), pal = SKIES[id];
        sprites(); SKY = paintSky(pal); GRASS = paintGrass(pal); skyKey = id;
        if (SUNSET_SKY) SUNSET_SKY = paintSky(SUNSET); if (NIGHT_SKY) NIGHT_SKY = paintSky(Object.assign({ stars: true }, NIGHT));
        clouds.forEach(c => { c.spr = null; }); made.forEach(m => { m.spr = null; }); far.forEach(f => { f.spr = null; });
      }

      /* ---------------- clouds and creatures ---------------- */
      const clouds = [], made = [];
      const far = []; // a hazy layer of little far-off clouds, mostly low by the horizon, drifting slower: depth
      function makeFar() {
        far.length = 0; const R = rngOf(day * 13 + 77), n = L.phone ? 5 : 8;
        for (let i = 0; i < n; i++) {
          const cr = NORMAL[Math.floor(R() * NORMAL.length)], low = i % 5 < 3, sc = low ? 0.26 + R() * 0.14 : 0.36 + R() * 0.16;
          const y = low ? L.grassY - 30 - R() * 120 * L.s : L.band.y0 * 0.7 + R() * (L.grassY - L.band.y0) * 0.55;
          far.push({ puffs: cloudPuffs(cr, R), x: (i + R() * 0.8) / n * (L.w + 160) - 80, y, sc, v: (2.5 + R() * 3) * L.s * (low ? 0.7 : 1), wd: L.u * sc * 1.3 + 20, spr: null });
        }
      }
      let seqI = 0, normalsSpawned = 0;
      const known = new Set(K.collection()); // the bestiary so far: creatures you have never met float by first
      const order = (() => { // the day's hidden creatures: a deterministic shuffle, with the creature of the day somewhere in the middle
        const pool = NORMAL.map(c => c.id).filter(id => id !== starOfDay), R = rngOf(day * 29 + 11), mix0 = [];
        while (pool.length) mix0.push(pool.splice(Math.floor(R() * pool.length), 1)[0]);
        const out = mix0.filter(id => !known.has(id)).concat(mix0.filter(id => known.has(id)));
        out.splice(2, 0, starOfDay);
        return out;
      })();
      function puffBox(puffs) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of puffs) { x0 = Math.min(x0, p.x - p.r); y0 = Math.min(y0, p.y - p.r); x1 = Math.max(x1, p.x + p.r); y1 = Math.max(y1, p.y + p.r); } return { x0, y0, x1, y1 }; }
      function renderPuffs(puffs, grey, scale, reuse) { // a cached sprite of a set of puffs (unit coords), centred on (0,0)
        const u = L.u * (scale || 1), d = L.dpr, bx = puffBox(puffs), pad = 0.16, W = (bx.x1 - bx.x0 + 2 * pad) * u, H = (bx.y1 - bx.y0 + 2 * pad) * u + 0.12 * u;
        let sp;
        if (reuse && reuse.sp.c.width >= W * d && reuse.sp.c.height >= H * d) { sp = reuse.sp; sp.g.setTransform(1, 0, 0, 1, 0, 0); sp.g.clearRect(0, 0, sp.c.width, sp.c.height); }
        else sp = mk(W * d * (reuse ? 1.25 : 1) + 2, H * d * (reuse ? 1.25 : 1) + 2);
        const g = sp.g, ox = (-bx.x0 + pad) * u, oy = (-bx.y0 + pad) * u;
        g.setTransform(d, 0, 0, d, 0, 0);
        const sh = grey ? SPR.gshade : SPR.shade, bd = grey ? SPR.gbody : SPR.body;
        // thin parts (ears, legs, necks, tails) are smooth capsules tucked behind the body: all their shade, then all their light
        const thin = puffs.filter(p => p.thin), body = puffs.filter(p => !p.thin).sort((a, b) => (b.y + b.r * 0.4) - (a.y + a.r * 0.4));
        for (const p of thin) { const r = p.r * u; g.drawImage(sh, ox + p.x * u - r * 1.04, oy + p.y * u - r * 0.86, 2.08 * r, 2.08 * r); }
        for (const p of thin) { const r = p.r * u; g.drawImage(bd, ox + p.x * u - r, oy + p.y * u - r * 1.02, 2 * r, 2 * r); }
        // then the lobes, lowest first, so each lobe's shade falls softly on the ones below it: creases and depth
        for (const p of body) { const r = p.r * u; g.drawImage(sh, ox + p.x * u - r * 1.04, oy + p.y * u - r * 0.9, 2.08 * r, 2.08 * r); g.drawImage(bd, ox + p.x * u - r, oy + p.y * u - r * 1.02, 2 * r, 2 * r); }
        // one light for the whole cloud: a warm, sunlit top and a cool, flat base
        g.globalCompositeOperation = 'source-atop';
        const top = oy + bx.y0 * u, bot = oy + bx.y1 * u, rim = grey ? '#f4f6fb' : SPR.rim, shd = grey ? '#5f6679' : SPR.dark;
        g.fillStyle = lin(g, 0, top, 0, bot, [[0, hexA(rim, 0.5)], [0.4, hexA(rim, 0)], [0.66, hexA(shd, 0)], [1, hexA(shd, 0.55)]]);
        g.fillRect(0, 0, sp.c.width / d, sp.c.height / d);
        g.globalCompositeOperation = 'source-over';
        return { c: sp.c, sp, ox, oy, w: sp.c.width / d, h: sp.c.height / d };
      }
      function spawnCloud(kind, o) {
        o = o || {};
        const R = rngOf(day * 101 + seqI * 13 + 7), id = kind === 'thought' ? o.creature : order[normalsSpawned % order.length];
        if (kind !== 'thought') normalsSpawned++;
        const cr = BY[id], puffs = cloudPuffs(cr, R);
        const lane = o.lane != null ? o.lane : freeLane();
        const dy = (R() - 0.5) * 18;
        const c = { n: seqI++, kind, hidden: id, puffs, x: o.x != null ? o.x : -L.u * 1.6, y: L.lanes[lane] + dy * L.s, dy, lane, vx: kind === 'thought' ? -DRIFT * 1.6 * L.s : DRIFT * SKIES[skyId()].wind * (0.85 + R() * 0.3) * L.s,
          tx: o.tx, glide: o.glide || 0, state: 'drift', k: 0, spr: null, born: performance.now(), bob: R() * 6, star: id === starOfDay && kind !== 'thought', strand: o.strand || '', label: null, scale: kind === 'thought' ? 1.05 : 1 };
        if (kind === 'thought' && o.strand) {
          c.label = h('div', { class: 'cs-strand gk-user', text: o.strand }); c.label.style.opacity = '0'; el.append(c.label);
          c.lw = c.label.offsetWidth || 160; c.lh = c.label.offsetHeight || 30; // measured once (and again once the font has loaded), never per frame
          S.later(() => { if (c.label && c.label.isConnected) { c.lw = c.label.offsetWidth || c.lw; c.lh = c.label.offsetHeight || c.lh; } }, 1500);
        }
        clouds.push(c);
        return c;
      }
      function freeLane() { // a lane with no grey thought parked in it and no cloud still near the left edge
        const used = clouds.filter(c => (c.kind === 'thought' && c.state !== 'exit' && c.state !== 'fade') || (c.state === 'drift' && (c.tx != null ? c.tx : c.x) < L.w * 0.55)).map(c => c.lane);
        const free = [0, 1, 2].filter(l => !used.includes(l));
        return free.length ? free[Math.floor(DR() * free.length)] : -1;
      }
      function entryX(lane) { // where a new cloud glides to: the spot in its lane farthest from its neighbours
        const xs = clouds.filter(c => c.lane === lane && (c.state === 'drift' || c.state === 'pre')).map(c => (c.tx != null ? c.tx : c.x));
        const cand = [L.u * 1.15, L.w * 0.3, L.w * 0.42, L.w * 0.5];
        let best = cand[0], bd = -1;
        for (const x of cand) { const d = xs.length ? Math.min(...xs.map(v => Math.abs(v - x))) : 1e9; if (d > bd + 1) { bd = d; best = x; } }
        return best;
      }
      function cloudCenter(c) { return { x: c.x, y: c.y + Math.sin(performance.now() / 1000 * 0.6 + c.bob) * 4 * L.s }; }
      const canLoop = (c) => c.state === 'drift' && !c.gust && (c.kind === 'thought' || normalsMade() < NORMALS);
      function traceable() { return clouds.filter(c => canLoop(c) && c.x > -L.u * 0.4 && c.x < L.w + L.u * 0.4); }

      /* ---------------- HUD ---------------- */
      function hudAdd(m, i) {
        const slot = thumbs.children[i]; if (!slot) return;
        const d = 2, tw = parseFloat(getComputedStyle(slot).width) || 28, c = h('canvas'); c.width = tw * d; c.height = tw * d;
        const g = c.getContext('2d'), pu = crispPuffs(BY[m.id]), bx = puffBox(pu), sc = (tw * d * 0.8) / Math.max(bx.x1 - bx.x0, bx.y1 - bx.y0);
        g.translate(tw * d / 2 - (bx.x0 + bx.x1) / 2 * sc, tw * d / 2 - (bx.y0 + bx.y1) / 2 * sc);
        g.fillStyle = '#ffffff'; for (const p of pu) { g.beginPath(); g.arc(p.x * sc, p.y * sc, p.r * sc, 0, TAU); g.fill(); }
        slot.innerHTML = ''; slot.append(c); slot.classList.add('cs-on'); if (m.thought) slot.classList.add('cs-grey');
      }

      /* ---------------- tracing ---------------- */
      let phase = 'intro', finished = false;
      const tr = { on: false, pts: [], len: 0, t0: 0, sweep: new Map(), lastAng: new Map(), done: false, glow: 0, fade: [] };
      let trLoop = null;
      function startTrace(p) {
        if (phase !== 'play') return;
        tr.on = true; tr.pts = [p]; tr.len = 0; tr.t0 = performance.now(); tr.sweep.clear(); tr.lastAng.clear(); tr.done = false;
        for (const c of clouds) if (canLoop(c)) { const cc = cloudCenter(c); tr.lastAng.set(c, Math.atan2(p.y - cc.y, p.x - cc.x)); tr.sweep.set(c, 0); }
        if (!trLoop) trLoop = mkLoop({ filter: 'bandpass', freq: 900, q: 9, bus: 'sfx' });
        K.sfx.tap(); P.emit('star', p.x, p.y, 4, { colors: ['#fff6d0', '#ffffff'], speed: [20, 60] });
      }
      function moveTrace(p) {
        if (!tr.on || tr.done) return;
        const last = tr.pts[tr.pts.length - 1], d = Math.hypot(p.x - last.x, p.y - last.y);
        if (d < 3) return;
        tr.pts.push(p); tr.len += d;
        let best = null, bs = 0;
        for (const c of clouds) {
          if (c.state !== 'drift' || !tr.lastAng.has(c)) continue;
          const cc = cloudCenter(c), a = Math.atan2(p.y - cc.y, p.x - cc.x); let da = a - tr.lastAng.get(c);
          if (da > Math.PI) da -= TAU; if (da < -Math.PI) da += TAU;
          tr.sweep.set(c, tr.sweep.get(c) + da); tr.lastAng.set(c, a);
          const sw = Math.abs(tr.sweep.get(c)); if (sw > bs) { bs = sw; best = c; }
        }
        if (trLoop) { trLoop.level(clamp(d / 14, 0, 1) * 0.06, 0.04); trLoop.freq(500 + clamp(bs / TAU, 0, 1.1) * 1400, 0.05); }
        if (Math.random() < 0.35) P.emit('star', p.x, p.y, 1, { colors: ['#fff6d0', '#ffe9a8'], speed: [10, 40] });
        if (best && bs >= TAU * 0.98) closeTrace(best);
      }
      function endTrace() {
        if (!tr.on) return;
        tr.on = false; if (trLoop) trLoop.level(0.0001, 0.08);
        if (tr.done) return;
        let best = null, bs = 0; for (const [c, sw] of tr.sweep) { if (c.state === 'drift' && Math.abs(sw) > bs) { bs = Math.abs(sw); best = c; } }
        if (best && bs >= TAU * 0.78) { closeTrace(best); return; }
        tr.fade.push({ pts: tr.pts.slice(), t0: performance.now() }); tr.pts = [];
        if (tr.len > 40) { K.sfx.soft(); if (!endTrace.hinted) { endTrace.hinted = true; talk(loopie, line({ Jolly: 'Nearly! Draw all the way round a cloud.', Cheeky: 'Almost a loop. Clouds like a full hug.', Unfiltered: 'All the way round. Close the loop.' }), { ms: 2400 }); } }
        guideNext(3000);
      }
      function closeTrace(c) {
        tr.done = true; tr.on = false; if (trLoop) trLoop.level(0.0001, 0.05);
        const pts = tr.pts.slice(); tr.fade.push({ pts, t0: performance.now(), win: true }); tr.pts = [];
        // read the loop: a plain loop shows the cloud's own creature; a loop with ears, fins or a tail becomes what was drawn
        let creature = c.hidden, snug = 0.6;
        const pp = polyProfile(pts.filter((q, i) => i % 2 === 0));
        if (pp) {
          const cc = cloudCenter(c), bx = puffBox(c.puffs), cloudArea = Math.PI / 4 * (bx.x1 - bx.x0) * (bx.y1 - bx.y0) * L.u * L.u * 0.82;
          const want = cloudArea * 1.3; // a snug loop hugs the cloud: not a tiny circle inside it, not a lasso round half the sky
          snug = Math.pow(Math.min(want, pp.area) / Math.max(want, pp.area), 0.6) * clamp(1 - Math.hypot(pp.c.x - cc.x, pp.c.y - cc.y) / (L.u * 2.4), 0.4, 1);
          if (c.kind !== 'thought') {
            const plain = pdist(pp.prof, ellipseProfileOf(pts));
            if (plain > 0.012) {
              let best = c.hidden, bd = 1e9;
              for (const cr of NORMAL) { const dd = pdist(pp.prof, cr.prof) - (cr.id === c.hidden ? 0.03 : 0) + (made.some(m => m.id === cr.id) ? 0.025 : 0); if (dd < bd) { bd = dd; best = cr.id; } }
              creature = best;
            }
          }
        }
        if (c.kind !== 'thought' && creature === c.hidden && made.some(m => m.id === creature)) { const alt = order.find(id => !made.some(m => m.id === id) && BY[id] && !clouds.some(o => o.hidden === id && o !== c)); if (alt) creature = alt; }
        morph(c, creature, snug);
      }

      /* ---------------- the morph, the creature, its little show ---------------- */
      function morph(c, id, snug) {
        const cr = BY[id], target = crispPuffs(cr);
        c.state = 'morph'; c.k = 0; c.creature = id; c.target = target; c.from = c.puffs.map(p => ({ x: p.x, y: p.y, r: p.r })); c.snug = snug; c.t0 = performance.now();
        c.map = target.map((q, j) => j % c.from.length); c.mapped = new Set(c.map);
        const cc = cloudCenter(c); c.x = cc.x; c.y = cc.y; c.vx = 0;
        const idx = made.length;
        const m = { id, name: cr.name, thought: c.kind === 'thought', cloud: c, i: idx, strand: c.strand, star: c.star && id === c.hidden };
        made.push(m); c.made = m;
        ctx.track('creature', { n: made.length, id, thought: m.thought ? 1 : 0, snug: Math.round(snug * 100) });
        if (A.ctx) { ['C6', 'E6', 'G6'].forEach((n, i) => A.chime(A.note(n), { when: A.now() + i * 0.07, vol: 0.06, dur: 1.2 })); A.pop({ freq: 520, vol: 0.12 }); A.sync('loop', performance.now()); }
        K.sfx.sparkle();
        P.emit('star', c.x, c.y, 22, { colors: ['#fff6d0', '#ffffff', m.thought ? '#ffd98a' : '#bfe3ff'], speed: [60, 200] });
        K.guide(null);
        S.later(() => reveal(c, m), K.reduced() ? 300 : 1050);
      }
      function reveal(c, m) {
        c.state = 'alive'; c.t0 = performance.now(); c.puffs = c.target; c.spr = null;
        const cr = BY[m.id];
        hudAdd(m, m.i);
        if (A.ctx && SND[cr.snd]) SND[cr.snd](A);
        if (A.ctx) A.chime(A.note(GLOCK[m.i % GLOCK.length]), { vol: 0.07, dur: 1.6 });
        const said = m.thought ? (care() ? 'A gentle ' + cr.name.split(' ').pop().toLowerCase() : aOrAn(cr.name) + ' ' + cr.name) : cr.name;
        const isNew = !known.has(m.id) && made.filter(o => o.id === m.id).length === 1;
        const nm = h('div', { class: 'cs-name' + (m.thought ? ' cs-silly' : '') + (K.reduced() ? ' cs-calm' : ''), 'aria-hidden': 'true' }, document.createTextNode(said + '!'), isNew ? h('small', { text: 'New to your bestiary' }) : null);
        el.append(nm);
        let nw = nm.offsetWidth || 200; const maxW = L.w - 48; // one read when it appears; long names shrink to fit the sky
        if (nw > maxW) { nm.style.fontSize = Math.max(18, Math.floor(30 * maxW / nw)) + 'px'; nw = Math.min(maxW, nm.offsetWidth || maxW); }
        const nh = nm.offsetHeight || 34, ny = clamp(c.y - L.u * 1.1, (L.hudB || 100) + 8 + nh * 0.85, L.grassY - 40); // never under the HUD, even as it drifts up
        const half = nw * 0.55 + 12;
        nm.style.left = clamp(c.x, half, L.w - half) + 'px'; nm.style.top = ny + 'px';
        S.later(() => nm.remove(), 2400);
        sr.textContent = cr.name;
        if (m.thought) {
          if (c.label) c.label.classList.add('cs-light');
          if (care()) talk(loopie, line({ Jolly: 'That thought’s heavy. This one can carry it for a bit, gently.', Cheeky: 'That one’s heavy. Let this gentle one carry it for a while.', Unfiltered: 'Heavy one. Let it float for a bit.' }), { mood: 'love', ms: 3200 });
          else talk(loopie, line({ Jolly: aOrAn(cr.name) + ' ' + cr.name + '! In a ' + accName(cr.acc) + '!', Cheeky: 'Behold: the ' + cr.name + '. Dressed for the occasion.', Unfiltered: cr.name + '. Wearing a ' + accName(cr.acc) + '. Obviously.' }), { mood: 'laugh', ms: 3000 });
          sync.show(true); sync.face(care() ? 'calm' : 'laugh', 2400);
        } else {
          const q = cr.q || ['Look at that!', 'Look at that.', 'Look.'];
          talk(loopie, line({ Jolly: q[0], Cheeky: q[1], Unfiltered: q[2] }), { mood: ['wow', 'laugh', 'love', 'happy', 'celebrate'][m.i % 5], ms: 2800 });
          if (m.star) S.later(() => talk(loopie, line({ Jolly: 'That’s today’s creature of the day!', Cheeky: 'Creature of the day. You’ve got the eye.', Unfiltered: 'Creature of the day. Nice.' }), { mood: 'star', ms: 2400 }), 2900);
        }
        c.aliveS = (K.reduced() ? 900 : 3000) / 1000;
        S.later(() => { c.state = 'exit'; c.t0 = performance.now(); if (c.label) { c.label.classList.add('cs-gone'); c.label.style.opacity = '0'; } afterCreature(); }, K.reduced() ? 900 : 3000);
      }
      const aOrAn = (s) => (/^[aeiou]/i.test(s) ? 'An' : 'A');
      const accName = (a) => ({ partyhat: 'party hat', tutu: 'tutu', bowtie: 'bow tie', shades: 'pair of sunglasses', headphones: 'pair of headphones', propeller: 'propeller hat', flowers: 'flower crown', tophat: 'top hat', monocle: 'monocle' }[a] || 'hat');

      /* ---------------- flow ---------------- */
      let twistDone = false, thoughtsMade = 0;
      function normalsMade() { return made.filter(m => !m.thought).length; }
      function afterCreature() {
        if (phase !== 'play') return;
        thoughtsMade = made.filter(m => m.thought).length;
        if (twistDone && thoughtsMade >= THOUGHTS && normalsMade() >= NORMALS) {
          if (clouds.some(c => c.state === 'morph' || c.state === 'alive')) return; // the last one to leave starts the sunset
          phase = 'wrap'; K.guide(null); S.later(finale, 900); return;
        }
        if (!twistDone && normalsMade() >= TWIST_AT) { twistDone = true; S.later(twist, K.reduced() ? 600 : 1700); return; } // a calm beat first, then the grey rolls in
        topUp(); guideNext(2200);
      }
      function topUp() { // keep enough clouds in the sky to finish, never a rush
        const wantNormal = NORMALS - normalsMade(), live = clouds.filter(c => c.kind === 'normal' && c.state === 'drift').length;
        const slots = Math.min(L.phone ? 2 : 3, wantNormal) - live;
        for (let i = 0; i < slots; i++) { const lane = freeLane(); if (lane < 0) break; spawnCloud('normal', { x: -L.u * 1.8 - i * L.u * 0.9, lane, tx: entryX(lane), glide: 240 * L.s }); }
      }
      function strandLabels() {
        if (!ctx.text) return [{ label: 'WHAT IF…', loop: 'whatif' }, { label: 'I SHOULD HAVE…', loop: 'shouldhave' }, { label: 'TOO MUCH TO DO', loop: 'todo' }];
        const out = [], seen = new Set();
        const add = (s) => { if (!s || !s.label || seen.has(s.label)) return; seen.add(s.label); out.push({ label: s.label, loop: s.loop || 'other' }); };
        (an.strands || []).slice(0, 2).forEach(add); add(an.core); (an.strands || []).slice(2).forEach(add);
        while (out.length < 3) add([{ label: 'WHAT IF…', loop: 'whatif' }, { label: 'ONE MORE THING', loop: 'todo' }, { label: 'SHOULD HAVE…', loop: 'shouldhave' }][out.length]);
        return out;
      }
      function twist() {
        phase = 'play';
        const st = strandLabels().slice(0, THOUGHTS);
        dim = 1; MU.mood = 1;
        if (A.ctx) { A.noise({ pink: true, filter: 'lowpass', freq: 180, dur: 2.6, attack: 0.6, vol: 0.14 }); A.pad([A.note('A2'), A.note('C3'), A.note('E3')], { dur: 4, vol: 0.06, attack: 1 }); A.sync('rumble', performance.now()); }
        const used = new Set();
        st.forEach((s, i) => {
          let id = care() ? 'whale' : THOUGHT_OF[s.loop] || 'otter';
          if (!care()) { while (used.has(id)) id = Object.values(THOUGHT_OF)[(Object.values(THOUGHT_OF).indexOf(id) + 1) % 9]; used.add(id); }
          const lane = [1, 2, 0][i % 3];
          const c = spawnCloud('thought', { creature: id, strand: s.label, lane, x: L.w + L.u * (1.6 + i * 1.2), tx: L.w * (st.length === 1 ? 0.5 : [0.32, 0.68, 0.5][i]), glide: 190 * L.s });
          c.vx = -DRIFT * 2.2 * L.s;
          // a gust: any white cloud in that lane is blown along and out of the way
          clouds.forEach(o => { if (o.kind === 'normal' && o.state === 'drift' && o.lane === lane) { o.gust = true; o.tx = null; } });
        });
        sync.show(true); sync.base('worried'); sync.react('bounce');
        S.later(() => talk(sync, care() ? line({ Jolly: 'Some heavier clouds. They’re your thoughts. We can still look at them gently.', Cheeky: 'Heavier clouds. Your thoughts. Let’s look at them gently.', Unfiltered: 'Heavy clouds. Your thoughts. Look gently.' }) : line({ Jolly: 'Uh-oh. Grey ones. They look like your thoughts…', Cheeky: 'Grey clouds incoming. Suspiciously thought-shaped.', Unfiltered: 'Grey ones. Your thoughts. Loop them too.' }), { ms: 3400 }), 500);
        S.later(() => talk(loopie, care() ? line({ Jolly: 'Loop one. We’ll see what it can become.', Cheeky: 'Loop one. Let’s see what it becomes.', Unfiltered: 'Loop it. See.' }) : line({ Jolly: 'Loop one! Bet it’s something ridiculous.', Cheeky: 'Loop it. I bet it’s wearing a hat.', Unfiltered: 'Loop it. It gets silly.' }), { mood: 'idea', ms: 2800 }), 3600);
        guideNext(2600);
      }
      let dim = 0, dimK = 0;
      function guideNext(delay) {
        if (phase !== 'play') return;
        const greys = () => clouds.filter(c => c.kind === 'thought' && canLoop(c) && c.x < L.w - L.u * 0.6);
        const score = (c) => Math.abs(c.x - L.w / 2) + (c.lane === 0 ? L.w * 0.3 : 0); // prefer lower lanes: the label then never sits on the HUD
        const pick = () => { const gr = greys(); return (gr.length ? gr : traceable()).filter(c => c.x > L.u * 0.9 && c.x < L.w - L.u * 0.9).sort((a, b) => score(a) - score(b))[0] || null; };
        const target = () => { const c = pick(); if (!c) return null; const cc = cloudCenter(c); return { x: cc.x, y: cc.y }; };
        const r = Math.max(46, L.u * 0.85);
        K.guide({ id: 'loop', g: 'circle', r, target, label: greys().length ? 'LOOP THE GREY CLOUD' : made.length ? 'LOOP ANOTHER CLOUD' : 'TRACE AROUND A CLOUD', delay: delay == null ? 1200 : delay });
      }

      /* ---------------- input ---------------- */
      K.press(stage, {
        down: (p) => { if (phase === 'play') startTrace(p); else { P.emit('star', p.x, p.y, 5, { colors: ['#fff6d0'], speed: [20, 60] }); if (A.ctx) A.chime(A.note(GLOCK[Math.floor(Math.random() * GLOCK.length)]), { vol: 0.03, dur: 1 }); } },
        move: (p) => moveTrace(p),
        up: () => endTrace()
      });
      K.onKey(['Space', 'Enter'], (e) => { // keyboard: loop the cloud the guide is showing
        if (phase !== 'play') return; e.preventDefault();
        const grey = clouds.filter(c => c.kind === 'thought' && c.state === 'drift');
        const c = (grey.length ? grey : traceable()).sort((a, b) => Math.abs(a.x - L.w / 2) - Math.abs(b.x - L.w / 2))[0];
        if (c) { tr.pts = []; const cc = cloudCenter(c); for (let i = 0; i <= 24; i++) { const a = i / 24 * TAU; tr.pts.push({ x: cc.x + Math.cos(a) * L.u * 1.2, y: cc.y + Math.sin(a) * L.u * 0.8 }); } closeTrace(c); }
      });

      /* ---------------- animation of creatures ---------------- */
      function animPose(cr, t, u) { // the creature's signature move: offset, rotation, squash
        const d = cr.dir || 0; let x = 0, y = 0, r = 0, sx = 1, sy = 1;
        switch (cr.anim) {
          case 'swim': x = d * t * 0.35 * u; y = Math.sin(t * 2.4) * 0.07 * u; r = Math.sin(t * 2.4) * 0.05; break;
          case 'hop': { const ph = (t * 1.5) % 1, j = Math.sin(ph * Math.PI); y = -j * 0.42 * u; x = d * t * 0.25 * u; sy = ph < 0.08 || ph > 0.92 ? 0.86 : 1.04; sx = 2 - sy; break; }
          case 'fly': x = d * t * 0.3 * u; y = -t * 0.14 * u + Math.sin(t * 5) * 0.05 * u; r = Math.sin(t * 2.5) * 0.06; break;
          case 'pour': r = -0.35 * Math.sin(Math.min(1, t / 0.8) * Math.PI / 2); y = Math.sin(t * 2) * 0.03 * u; break;
          case 'stomp': y = -Math.abs(Math.sin(t * 3.2)) * 0.06 * u; x = d * t * 0.12 * u; sy = 1 - Math.abs(Math.cos(t * 3.2)) * 0.04; break;
          case 'blast': y = -Math.pow(Math.max(0, t - 0.4), 2) * 0.9 * u; x = Math.sin(t * 40) * 0.015 * u * Math.min(1, t * 2); break;
          case 'wave': r = Math.sin(t * 3) * 0.08; y = Math.sin(t * 1.5) * 0.06 * u - t * 0.05 * u; break;
          case 'slow': x = d * t * 0.08 * u; sx = 1 + Math.sin(t * 3) * 0.03; break;
          case 'stretch': sx = 1 + Math.max(0, Math.sin(t * 1.4)) * 0.16; sy = 1 - Math.max(0, Math.sin(t * 1.4)) * 0.08; break;
          case 'wag': r = Math.sin(t * 7) * 0.05; y = -Math.abs(Math.sin(t * 3.5)) * 0.06 * u; break;
          case 'trumpet': r = Math.sin(t * 2) * 0.05 - 0.06; break;
          case 'bob': y = Math.sin(t * 3) * 0.06 * u; r = Math.sin(t * 3 + 1) * 0.06; x = d * t * 0.12 * u; break;
          case 'blink': r = Math.sin(t * 1.6) * 0.08; break;
          case 'flutter': y = Math.sin(t * 6) * 0.08 * u - t * 0.12 * u; sx = 0.86 + Math.abs(Math.cos(t * 9)) * 0.14; break;
          case 'pulse': sy = 1 + Math.sin(t * 4) * 0.08; sx = 1 - Math.sin(t * 4) * 0.05; y = -t * 0.16 * u; break;
          case 'sidestep': x = Math.sin(t * 2.4) * 0.25 * u; y = -Math.abs(Math.sin(t * 7)) * 0.03 * u; break;
          case 'scurry': x = d * t * 0.6 * u; y = -Math.abs(Math.sin(t * 12)) * 0.03 * u; break;
          case 'roll': r = d * t * 2.4; x = d * t * 0.5 * u; break;
          case 'wiggle': r = Math.sin(t * 10) * 0.07; y = Math.sin(t * 2) * 0.05 * u; break;
          case 'slither': x = d * t * 0.3 * u; y = Math.sin(t * 3) * 0.08 * u; break;
          case 'gallop': { const ph = (t * 2.2) % 1; y = -Math.sin(ph * Math.PI) * 0.18 * u; x = d * t * 0.35 * u; r = Math.sin(ph * TAU) * 0.05; break; }
          case 'roar': sx = 1 + Math.max(0, Math.sin(t * 2.2)) * 0.1; sy = sx; break;
          case 'waddle': r = Math.sin(t * 6) * 0.1; x = d * t * 0.15 * u; break;
          case 'pounce': { const ph = (t * 0.9) % 1; y = -Math.sin(ph * Math.PI) * 0.35 * u; x = d * ph * 0.6 * u; break; }
          case 'float': y = -t * 0.2 * u + Math.sin(t * 1.6) * 0.06 * u; r = Math.sin(t * 1.2) * 0.04; break;
          case 'sail': r = Math.sin(t * 1.8) * 0.09; x = d * t * 0.2 * u; break;
          case 'wobble': sx = 1 + Math.sin(t * 9) * 0.06; sy = 1 - Math.sin(t * 9) * 0.06; break;
          case 'spin': r = t * 3; y = -Math.abs(Math.sin(t * 2)) * 0.1 * u; break;
          case 'swing': r = Math.sin(t * 2.2) * 0.14; break;
          default: y = Math.sin(t * 2) * 0.05 * u;
        }
        return { x, y, r, sx, sy };
      }

      /* ---------------- doodled features ---------------- */
      const INK = '#34466e';
      function features(g, cr, u, a, t) {
        g.save(); g.globalAlpha *= a; g.lineCap = 'round'; g.lineJoin = 'round';
        const lw = Math.max(1.6, u * 0.03);
        g.strokeStyle = hexA(INK, 0.8); g.lineWidth = lw;
        const fx = cr.fx || [];
        const P2 = (x, y) => [x * u, y * u];
        if (fx.includes('spout')) { const [x, y] = P2(-0.42, -0.42); for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + i * 0.18 * u, y - 0.32 * u, x + i * 0.3 * u, y - 0.18 * u + Math.sin(t * 6 + i) * 0.03 * u); g.stroke(); } }
        if (fx.includes('innerEars')) { g.fillStyle = 'rgba(255,170,190,0.55)'; ell(g, -0.44 * u, -0.74 * u, 0.04 * u, 0.2 * u); g.fill(); ell(g, -0.2 * u, -0.76 * u, 0.04 * u, 0.2 * u); g.fill(); }
        if (fx.includes('whiskers')) { // three fine whiskers per cheek, fanning out from the muzzle
          const two = (cr.eyes || []).length > 1, mx = cr.mouth ? cr.mouth[0] : cr.eyes[0][0] - 0.1, my = cr.mouth ? cr.mouth[1] - 0.02 : cr.eyes[0][1] + 0.14;
          g.save(); g.lineWidth = lw * 0.7; g.strokeStyle = hexA(INK, 0.6); g.beginPath();
          for (const sd of two ? [-1, 1] : [-1]) for (const k of [-1, 0, 1]) { const x0 = (mx + sd * 0.07) * u, y0 = (my + k * 0.03) * u; g.moveTo(x0, y0); g.lineTo(x0 + sd * 0.26 * u, y0 + k * 0.06 * u - 0.01 * u); }
          g.stroke(); g.restore();
        }
        if (fx.includes('wing')) { g.beginPath(); g.moveTo(-0.15 * u, -0.3 * u); g.quadraticCurveTo(0.1 * u, -0.66 * u, 0.4 * u, -0.5 * u); g.moveTo(0.02 * u, -0.38 * u); g.lineTo(0.12 * u, -0.56 * u); g.moveTo(0.18 * u, -0.38 * u); g.lineTo(0.28 * u, -0.52 * u); g.stroke(); }
        if (fx.includes('nostril')) { g.beginPath(); g.arc(-0.92 * u, -0.32 * u, 0.02 * u, 0, TAU); g.stroke(); }
        if (fx.includes('lidLine')) { g.beginPath(); g.moveTo(-0.26 * u, -0.27 * u); g.lineTo(0.26 * u, -0.27 * u); g.stroke(); }
        if (fx.includes('backSpots') || fx.includes('spots')) { g.fillStyle = 'rgba(52,70,110,0.18)'; for (const [x, y, r] of [[0.1, 0.05, 0.08], [0.32, 0.12, 0.06], [-0.05, 0.22, 0.05], [0.25, -0.05, 0.05]]) { g.beginPath(); g.arc(x * u, y * u, r * u, 0, TAU); g.fill(); } }
        if (fx.includes('sheepEar')) { g.fillStyle = hexA(INK, 0.3); ell(g, -0.55 * u, -0.17 * u, 0.1 * u, 0.045 * u, -0.55); g.fill(); }
        if (fx.includes('window')) { g.fillStyle = 'rgba(140,200,255,0.55)'; g.beginPath(); g.arc(0, -0.15 * u, 0.12 * u, 0, TAU); g.fill(); g.stroke(); }
        if (fx.includes('suckers')) { g.fillStyle = 'rgba(255,170,190,0.45)'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc((-0.55 + i * 0.22) * u, 0.42 * u, 0.025 * u, 0, TAU); g.fill(); } }
        if (fx.includes('shell')) { // a domed shell: a centre plate and plates fanning to the rim
          g.save(); g.strokeStyle = 'rgba(70,120,96,0.5)'; g.fillStyle = 'rgba(120,190,140,0.18)'; g.lineWidth = lw;
          g.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + Math.PI / 6; g.lineTo(Math.cos(a) * 0.18 * u, -0.08 * u + Math.sin(a) * 0.12 * u); } g.closePath(); g.fill(); g.stroke();
          g.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + Math.PI / 6; g.moveTo(Math.cos(a) * 0.18 * u, -0.08 * u + Math.sin(a) * 0.12 * u); g.lineTo(Math.cos(a) * 0.46 * u, -0.06 * u + Math.sin(a) * 0.27 * u); } g.stroke();
          g.restore();
        }
        if (fx.includes('spiral')) { g.beginPath(); for (let aa = 0; aa < 11; aa += 0.3) { const r = aa * 0.032 * u; const px = 0.15 * u + Math.cos(aa) * r, py = -0.2 * u + Math.sin(aa) * r; if (aa) g.lineTo(px, py); else g.moveTo(px, py); } g.stroke(); }
        if (fx.includes('antennae')) { g.beginPath(); g.moveTo(-0.82 * u, 0.02 * u); g.lineTo(-0.9 * u, -0.18 * u); g.moveTo(-0.74 * u, 0.02 * u); g.lineTo(-0.72 * u, -0.18 * u); g.stroke(); }
        if (fx.includes('antennae2')) { g.beginPath(); g.moveTo(-0.02 * u, -0.4 * u); g.quadraticCurveTo(-0.1 * u, -0.62 * u, -0.2 * u, -0.66 * u); g.moveTo(0.02 * u, -0.4 * u); g.quadraticCurveTo(0.1 * u, -0.62 * u, 0.2 * u, -0.66 * u); g.stroke(); }
        if (fx.includes('wingDots')) { g.fillStyle = 'rgba(255,190,120,0.5)'; for (const [x, y] of [[-0.45, -0.25], [0.45, -0.25], [-0.35, 0.3], [0.35, 0.3]]) { g.beginPath(); g.arc(x * u, y * u, 0.1 * u, 0, TAU); g.fill(); } }
        if (fx.includes('jellyRim')) { g.beginPath(); for (let x = -0.5; x <= 0.5; x += 0.1) g.lineTo(x * u, (0.1 + Math.sin(x * 30) * 0.03) * u); g.stroke(); }
        if (fx.includes('clawLines')) { for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * 0.62 * u, -0.28 * u); g.lineTo(sx * 0.84 * u, -0.28 * u); g.stroke(); } }
        if (fx.includes('snout')) { ell(g, 0, -0.3 * u, 0.13 * u, 0.09 * u); g.stroke(); g.fillStyle = hexA(INK, 0.8); ell(g, 0, -0.34 * u, 0.04 * u, 0.025 * u); g.fill(); }
        if (fx.includes('quills')) { for (let i = 0; i < 9; i++) { const x = (-0.45 + i * 0.12) * u; g.beginPath(); g.moveTo(x, -0.12 * u); g.lineTo(x + 0.05 * u, -0.26 * u); g.stroke(); } }
        if (fx.includes('nostrils')) { const nx = cr.id === 'hippo' ? -0.72 : -0.7; g.fillStyle = hexA(INK, 0.6); g.beginPath(); g.arc((nx - 0.03) * u, 0, 0.02 * u, 0, TAU); g.arc((nx + 0.03) * u, 0, 0.02 * u, 0, TAU); g.fill(); }
        if (fx.includes('curl')) { g.beginPath(); for (let aa = 0; aa < 9; aa += 0.4) { const r = 0.03 * u + aa * 0.006 * u; g.lineTo(0.66 * u + Math.cos(aa) * r, -0.1 * u + Math.sin(aa) * r); } g.stroke(); }
        if (fx.includes('humpLines')) { for (const x of [-0.5, 0, 0.5]) { g.beginPath(); g.arc(x * u, 0.1 * u, 0.12 * u, Math.PI * 1.2, Math.PI * 1.8); g.stroke(); } }
        if (fx.includes('horn')) { g.strokeStyle = 'rgba(255,190,110,0.9)'; g.lineWidth = lw * 1.4; g.beginPath(); g.moveTo(-0.52 * u, -0.48 * u); g.lineTo(-0.52 * u, -0.72 * u); g.stroke(); g.strokeStyle = hexA(INK, 0.8); g.lineWidth = lw; }
        if (fx.includes('mane')) { g.strokeStyle = 'rgba(200,150,255,0.55)'; g.lineWidth = lw * 2; g.beginPath(); g.moveTo(-0.36 * u, -0.38 * u); g.quadraticCurveTo(-0.2 * u, -0.2 * u, -0.22 * u, 0.05 * u); g.stroke(); g.strokeStyle = hexA(INK, 0.8); g.lineWidth = lw; }
        if (fx.includes('lionFace')) { ell(g, -0.3 * u, -0.1 * u, 0.24 * u, 0.24 * u); g.stroke(); }
        if (fx.includes('beak')) { g.fillStyle = 'rgba(255,190,90,0.9)'; g.beginPath(); g.moveTo(-0.06 * u, cr.id === 'owl' ? -0.34 * u : -0.24 * u); g.lineTo(0.06 * u, cr.id === 'owl' ? -0.34 * u : -0.24 * u); g.lineTo(0, cr.id === 'owl' ? -0.24 * u : -0.16 * u); g.closePath(); g.fill(); }
        if (fx.includes('chest')) { for (let i = 0; i < 6; i++) { const x = (-0.18 + (i % 3) * 0.18) * u, y = (0.08 + Math.floor(i / 3) * 0.16) * u; g.beginPath(); g.moveTo(x - 0.05 * u, y); g.lineTo(x, y + 0.05 * u); g.lineTo(x + 0.05 * u, y); g.stroke(); } }
        if (fx.includes('belly')) { ell(g, 0, 0.12 * u, 0.22 * u, 0.36 * u); g.stroke(); }
        if (fx.includes('tailTip')) { g.fillStyle = 'rgba(255,255,255,0.9)'; ell(g, 0.98 * u, -0.08 * u, 0.1 * u, 0.08 * u); g.fill(); }
        if (fx.includes('stripes')) { g.strokeStyle = 'rgba(255,130,120,0.45)'; g.lineWidth = lw * 2.4; for (const x of [-0.3, 0, 0.3]) { g.beginPath(); g.moveTo(x * u, -0.76 * u); g.quadraticCurveTo(x * 1.5 * u, -0.2 * u, x * 0.5 * u, 0.32 * u); g.stroke(); } g.strokeStyle = hexA(INK, 0.8); g.lineWidth = lw; }
        if (fx.includes('ropes')) { g.beginPath(); g.moveTo(-0.16 * u, 0.38 * u); g.lineTo(-0.14 * u, 0.56 * u); g.moveTo(0.16 * u, 0.38 * u); g.lineTo(0.14 * u, 0.56 * u); g.stroke(); }
        if (fx.includes('mast')) { // mast, a billowing sail and a little pennant
          g.save(); g.beginPath(); g.moveTo(0.02 * u, -0.6 * u); g.quadraticCurveTo(-0.5 * u, -0.1 * u, -0.34 * u, 0.3 * u); g.lineTo(0.02 * u, 0.3 * u); g.closePath();
          g.fillStyle = 'rgba(255,255,255,0.45)'; g.fill(); g.strokeStyle = hexA(INK, 0.45); g.lineWidth = lw * 0.8; g.stroke();
          g.strokeStyle = hexA(INK, 0.8); g.lineWidth = lw; g.beginPath(); g.moveTo(0.02 * u, 0.4 * u); g.lineTo(0.02 * u, -0.7 * u); g.stroke();
          g.fillStyle = '#ff6b6b'; g.beginPath(); g.moveTo(0.02 * u, -0.7 * u); g.lineTo(0.24 * u, -0.64 * u + Math.sin(t * 5) * 0.02 * u); g.lineTo(0.02 * u, -0.58 * u); g.closePath(); g.fill(); g.restore();
        }
        if (fx.includes('coneLines')) { // a waffle cone and a cherry on top
          g.save(); g.beginPath(); g.moveTo(-0.27 * u, 0.2 * u); g.lineTo(0.27 * u, 0.2 * u); g.lineTo(0, 0.8 * u); g.closePath();
          g.fillStyle = 'rgba(236,188,122,0.95)'; g.fill(); g.clip(); g.strokeStyle = 'rgba(176,122,66,0.65)'; g.lineWidth = lw * 0.8; g.beginPath();
          for (let k = -4; k <= 4; k++) { g.moveTo(k * 0.12 * u - 0.4 * u, 0.1 * u); g.lineTo(k * 0.12 * u + 0.4 * u, 0.9 * u); g.moveTo(k * 0.12 * u + 0.4 * u, 0.1 * u); g.lineTo(k * 0.12 * u - 0.4 * u, 0.9 * u); }
          g.stroke(); g.restore();
          g.fillStyle = 'rgba(230,80,90,0.9)'; g.beginPath(); g.arc(0.05 * u, -0.98 * u, 0.07 * u, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.arc(0.03 * u, -1.0 * u, 0.02 * u, 0, TAU); g.fill();
        }
        if (fx.includes('tusks')) { g.strokeStyle = 'rgba(255,250,235,0.95)'; g.lineWidth = lw * 2; g.beginPath(); g.moveTo(-0.5 * u, 0.06 * u); g.lineTo(-0.52 * u, 0.32 * u); g.moveTo(-0.34 * u, 0.06 * u); g.lineTo(-0.32 * u, 0.32 * u); g.stroke(); g.strokeStyle = hexA(INK, 0.8); g.lineWidth = lw; }
        if (fx.includes('slothMask')) { g.fillStyle = 'rgba(120,90,70,0.3)'; ell(g, -0.1 * u, -0.32 * u, 0.08 * u, 0.05 * u, 0.4); g.fill(); ell(g, 0.1 * u, -0.32 * u, 0.08 * u, 0.05 * u, -0.4); g.fill(); }
        if (fx.includes('branch')) { g.strokeStyle = 'rgba(122,88,58,0.92)'; g.lineWidth = lw * 2.2; g.beginPath(); g.moveTo(-0.62 * u, -0.84 * u); g.quadraticCurveTo(0, -0.95 * u, 0.64 * u, -0.86 * u); g.stroke(); g.fillStyle = 'rgba(104,168,88,0.92)'; ell(g, 0.5 * u, -0.95 * u, 0.1 * u, 0.04 * u, -0.5); g.fill(); ell(g, -0.44 * u, -0.95 * u, 0.09 * u, 0.035 * u, 0.4); g.fill(); g.strokeStyle = hexA(INK, 0.8); g.lineWidth = lw; }
        if (fx.includes('warts')) { g.fillStyle = 'rgba(120,170,110,0.35)'; for (const [x, y] of [[-0.2, 0.25], [0.15, 0.3], [0.32, 0.12], [-0.35, 0.05]]) { g.beginPath(); g.arc(x * u, y * u, 0.04 * u, 0, TAU); g.fill(); } }
        if (fx.includes('spikes')) { for (let i = 0; i < 12; i++) { const aa = i / 12 * TAU; g.beginPath(); g.moveTo(Math.cos(aa) * 0.4 * u, 0.05 * u + Math.sin(aa) * 0.4 * u); g.lineTo(Math.cos(aa) * 0.62 * u, 0.05 * u + Math.sin(aa) * 0.62 * u); g.stroke(); } }
        if (fx.includes('earLine')) { ell(g, -0.3 * u, -0.12 * u, 0.14 * u, 0.18 * u); g.stroke(); }
        if (fx.includes('tongue')) { g.fillStyle = 'rgba(255,130,150,0.85)'; ell(g, -0.45 * u, 0.02 * u, 0.04 * u, 0.06 * u); g.fill(); }
        if (fx.includes('bill')) { const e = cr.b[2]; g.fillStyle = 'rgba(255,176,72,0.95)'; ell(g, (e[0] - 0.02) * u, e[1] * u, e[2] * 1.05 * u, e[3] * 0.95 * u); g.fill(); g.strokeStyle = 'rgba(190,110,40,0.6)'; g.lineWidth = lw * 0.6; g.beginPath(); g.moveTo((e[0] + e[2] * 0.6) * u, e[1] * u); g.lineTo((e[0] - e[2]) * u, e[1] * u); g.stroke(); g.strokeStyle = hexA(INK, 0.8); g.lineWidth = lw; }
        if (fx.includes('antlers')) { g.save(); g.fillStyle = 'rgba(206,164,112,0.55)'; g.strokeStyle = 'rgba(150,108,72,0.85)'; g.lineWidth = lw * 1.5; for (const e of [cr.b[2], cr.b[3]]) { ell(g, e[0] * u, e[1] * u, e[2] * 0.95 * u, e[3] * 0.85 * u); g.fill(); g.beginPath(); for (const dx of [-0.13, 0, 0.13]) { g.moveTo((e[0] + dx) * u, (e[1] - e[3] * 0.6) * u); g.lineTo((e[0] + dx * 1.3) * u, (e[1] - e[3] - 0.12) * u); } g.stroke(); } g.restore(); }
        if (fx.includes('rhinoHorn')) { g.save(); g.fillStyle = '#ecdcbf'; g.strokeStyle = hexA(INK, 0.6); g.lineWidth = lw * 0.8; for (const [hx, hy, hh2, hw] of [[-0.78, -0.02, 0.3, 0.07], [-0.6, -0.06, 0.16, 0.05]]) { g.beginPath(); g.moveTo((hx - hw) * u, hy * u); g.quadraticCurveTo((hx - hw * 0.4) * u, (hy - hh2 * 0.6) * u, (hx - 0.05) * u, (hy - hh2) * u); g.quadraticCurveTo((hx + hw * 0.3) * u, (hy - hh2 * 0.4) * u, (hx + hw) * u, hy * u); g.closePath(); g.fill(); g.stroke(); } g.restore(); }
        if (fx.includes('wingLine')) { g.beginPath(); g.moveTo(-0.05 * u, -0.05 * u); g.quadraticCurveTo(0.2 * u, -0.22 * u, 0.4 * u, -0.05 * u); g.stroke(); }
        if (fx.includes('scales')) { for (let i = 0; i < 3; i++) { g.beginPath(); g.arc((0.05 + i * 0.16) * u, 0, 0.1 * u, -1.2, 1.2); g.stroke(); } }
        // eyes, cheeks, mouth
        const er = (cr.big ? 0.085 : cr.small ? 0.035 : 0.055) * u;
        for (const [ex, ey] of cr.eyes || []) {
          const blink = Math.sin(t * 1.7 + ex * 3) > 0.97 ? 0.15 : 1;
          if (cr.big) { g.fillStyle = 'rgba(255,255,255,0.95)'; g.beginPath(); g.arc(ex * u, ey * u, er * 1.6, 0, TAU); g.fill(); }
          g.fillStyle = hexA(INK, 0.95); ell(g, ex * u, ey * u, er, er * blink); g.fill();
          g.fillStyle = '#ffffff'; g.beginPath(); g.arc(ex * u - er * 0.35, ey * u - er * 0.35, er * 0.35, 0, TAU); g.fill();
        }
        if (cr.eyes && cr.eyes.length) { g.fillStyle = 'rgba(255,150,170,0.35)'; for (const [ex, ey] of cr.eyes.slice(0, 2)) { ell(g, ex * u + (cr.eyes.length === 1 ? -0.06 * u : (ex < 0 ? -0.04 * u : 0.04 * u)), ey * u + 0.1 * u, er * 1.3, er * 0.75); g.fill(); } }
        if (cr.mouth) { const [mx, my, mr] = cr.mouth; g.strokeStyle = hexA(INK, 0.85); g.beginPath(); g.arc(mx * u, my * u - mr * u * 0.5, mr * u, 0.25, Math.PI - 0.25); g.stroke(); }
        g.restore();
      }
      function accessory(g, cr, u, a, t) { // the silly hat (or tutu, or monocle)
        if (!cr.acc || care()) return;
        g.save(); g.globalAlpha *= a;
        const head = cr.b[1] || cr.b[0], hx = head[0] * u, hy = (head[1] - head[3]) * u;
        switch (cr.acc) {
          case 'partyhat': { const b = Math.sin(t * 6) * 0.04; g.save(); g.translate(hx, hy + 0.04 * u); g.rotate(-0.2 + b); g.fillStyle = '#ff6b9a'; g.beginPath(); g.moveTo(-0.14 * u, 0); g.lineTo(0.14 * u, 0); g.lineTo(0, -0.42 * u); g.closePath(); g.fill(); g.fillStyle = '#ffd43b'; for (let i = 1; i < 4; i++) { g.fillRect(-0.14 * u * (1 - i / 4), -0.42 * u * i / 4, 0.28 * u * (1 - i / 4), 0.03 * u); } g.fillStyle = '#74c0fc'; g.beginPath(); g.arc(0, -0.44 * u, 0.06 * u, 0, TAU); g.fill(); g.restore(); break; }
          case 'tutu': { g.fillStyle = 'rgba(255,170,210,0.85)'; for (let i = 0; i < 9; i++) { const x = (-0.5 + i * 0.125) * u; g.beginPath(); g.moveTo(x - 0.08 * u, 0.32 * u); g.lineTo(x + 0.08 * u, 0.32 * u); g.lineTo(x, 0.5 * u); g.closePath(); g.fill(); } break; }
          case 'bowtie': { const y = 0.0 * u; g.fillStyle = '#e8590c'; g.beginPath(); g.moveTo(0, y); g.lineTo(-0.14 * u, y - 0.08 * u); g.lineTo(-0.14 * u, y + 0.08 * u); g.closePath(); g.moveTo(0, y); g.lineTo(0.14 * u, y - 0.08 * u); g.lineTo(0.14 * u, y + 0.08 * u); g.closePath(); g.fill(); g.fillStyle = '#c92a2a'; g.beginPath(); g.arc(0, y, 0.035 * u, 0, TAU); g.fill(); break; }
          case 'shades': { const [e1, e2] = cr.eyes; g.fillStyle = '#212529'; for (const e of [e1, e2]) { rrect(g, e[0] * u - 0.08 * u, e[1] * u - 0.05 * u, 0.16 * u, 0.1 * u, 0.03 * u); g.fill(); } g.strokeStyle = '#212529'; g.lineWidth = 0.02 * u; g.beginPath(); g.moveTo(e1[0] * u + 0.08 * u, e1[1] * u); g.lineTo(e2[0] * u - 0.08 * u, e2[1] * u); g.stroke(); g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(e1[0] * u - 0.06 * u, e1[1] * u - 0.035 * u, 0.04 * u, 0.02 * u); break; }
          case 'headphones': { g.strokeStyle = '#7048e8'; g.lineWidth = 0.05 * u; g.beginPath(); g.arc(hx, hy + head[3] * u, head[3] * u * 1.05, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); g.fillStyle = '#9775fa'; for (const sx of [-1, 1]) { ell(g, hx + sx * head[2] * u * 0.95, hy + head[3] * u, 0.07 * u, 0.1 * u); g.fill(); } break; }
          case 'propeller': { g.fillStyle = '#4dabf7'; g.beginPath(); g.arc(hx, hy + 0.06 * u, 0.16 * u, Math.PI, TAU); g.fill(); g.fillStyle = '#ffd43b'; g.fillRect(hx - 0.01 * u, hy - 0.16 * u, 0.02 * u, 0.12 * u); const sp = Math.cos(t * 18); g.fillStyle = '#ff6b6b'; ell(g, hx, hy - 0.16 * u, 0.2 * u * Math.abs(sp) + 0.02 * u, 0.03 * u); g.fill(); break; }
          case 'flowers': { const cols = ['#ff8fab', '#ffd43b', '#b197fc', '#69db7c']; for (let i = 0; i < 5; i++) { const aa = Math.PI * (1.15 + i * 0.17), x = hx + Math.cos(aa) * head[2] * u * 0.9, y = hy + head[3] * u + Math.sin(aa) * head[3] * u * 0.95; g.fillStyle = cols[i % 4]; for (let k = 0; k < 5; k++) { const b = k * TAU / 5; g.beginPath(); g.arc(x + Math.cos(b) * 0.035 * u, y + Math.sin(b) * 0.035 * u, 0.03 * u, 0, TAU); g.fill(); } g.fillStyle = '#fff3bf'; g.beginPath(); g.arc(x, y, 0.025 * u, 0, TAU); g.fill(); } break; }
          case 'tophat': { g.fillStyle = '#343a40'; rrect(g, hx - 0.14 * u, hy - 0.3 * u, 0.28 * u, 0.3 * u, 0.02 * u); g.fill(); rrect(g, hx - 0.22 * u, hy - 0.03 * u, 0.44 * u, 0.06 * u, 0.03 * u); g.fill(); g.fillStyle = '#e03131'; g.fillRect(hx - 0.14 * u, hy - 0.1 * u, 0.28 * u, 0.05 * u); break; }
          case 'monocle': { const e = cr.eyes[1] || cr.eyes[0]; g.strokeStyle = '#f59f00'; g.lineWidth = 0.025 * u; g.beginPath(); g.arc(e[0] * u, e[1] * u, 0.1 * u, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(e[0] * u + 0.08 * u, e[1] * u + 0.07 * u); g.quadraticCurveTo(e[0] * u + 0.12 * u, e[1] * u + 0.3 * u, e[0] * u + 0.02 * u, e[1] * u + 0.4 * u); g.stroke(); break; }
        }
        g.restore();
      }
      function rrect(g, x, y, w, hh, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

      /* ---------------- frame loop ---------------- */
      let lastNow = 0, lastDraw = 0, drawn = 0, accDt = 0;
      const QG = { ema: 0, n: 0, dropped: false };
      K.loop((dt, t) => {
        if (!L || !SKY) return;
        const now = performance.now(), rdt = clamp((now - (lastNow || now)) / 1000, 0, 0.25); lastNow = now;
        musicTick();
        dimK += ((dim && clouds.some(c => c.kind === 'thought' && c.state === 'drift') ? 1 : 0) - dimK) * Math.min(1, rdt * 1.2);
        if (dim && !clouds.some(c => c.kind === 'thought' && (c.state === 'drift' || c.state === 'morph'))) { dim = 0; MU.mood = 0; }
        for (let i = clouds.length - 1; i >= 0; i--) {
          const c = clouds[i];
          if (c.state === 'drift' && phase !== 'intro') {
            if (c.kind !== 'thought') { c.x += c.vx * rdt * (c.gust ? 9 : 1); if (c.tx != null) c.tx += c.vx * rdt; } // the breeze, always
            if (c.tx != null) { // gliding in to its spot, easing into the drift
              const dx = c.tx - c.x, sp = c.glide || Math.abs(c.vx) * 2;
              c.x += clamp(dx * Math.min(1, rdt * 2.2), -sp * rdt, sp * rdt);
              if (Math.abs(dx) < 1.5) c.tx = null;
            } else if (c.kind === 'thought') c.x += Math.sin(now / 1000 * 0.4 + c.bob) * 3 * rdt;
            if (c.kind !== 'thought' && c.x > L.w + L.u * 1.8) { if (c.label) c.label.remove(); clouds.splice(i, 1); if (phase === 'play') topUp(); continue; }
          } else if (c.state === 'morph') { c.k = Math.min(1, (now - c.t0) / (K.reduced() ? 300 : 1000)); }
          else if (c.state === 'exit') { if (now - c.t0 > 2600) { if (c.label) c.label.remove(); clouds.splice(i, 1); continue; } }
          else if (c.state === 'fade') { c.x += c.vx * rdt * 3; if (now - c.t0 > 1700) { if (c.label) c.label.remove(); clouds.splice(i, 1); continue; } }
          if (c.label) {
            const cc = cloudCenter(c);
            const vis = c.x > c.lw * 0.5 + 8 && c.x < L.w - c.lw * 0.5 - 8 && c.state !== 'exit';
            const x = clamp(cc.x - c.lw / 2, 10, L.w - c.lw - 10), y = clamp(cc.y + L.u * 0.62, 120, L.grassY - c.lh - 6);
            if (Math.abs(x - (c.lx || -999)) > 0.3 || Math.abs(y - (c.ly || -999)) > 0.3) { c.lx = x; c.ly = y; c.label.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)'; }
            if (vis && c.label.style.opacity !== '1' && !c.label.classList.contains('cs-gone')) c.label.style.opacity = '1';
            if (!vis && c.state === 'drift') c.label.style.opacity = '0';
          }
        }
        if (phase !== 'intro') {
          for (const f of far) { f.x += f.v * rdt; if (f.x > L.w + f.wd) f.x = -f.wd; }
          stepBirds(rdt);
          if (phase === 'play' && Math.random() < rdt * 0.7) { const dk = pal0().dark; P.emit('mote', Math.random() * L.w, L.grassY + 30 + Math.random() * 70, 1, { angle: -Math.PI / 2, spread: 0.9, speed: [8, 22], colors: dk ? ['#efffb8', '#fff6d8'] : ['#ffffff', '#fffbea'] }); } // seed fluff drifting up
        }
        while (beatQ.length && beatQ[0] <= now) { beatQ.shift(); bump = 1; }
        bump = Math.max(0, bump - rdt * 3);
        accDt += dt;
        if (phase === 'intro' && drawn > 2) return;
        if (QG.ema > 12 && now - lastDraw < Math.min(110, QG.ema * 2)) return;
        // a calm sky drifts slowly: half rate is plenty (and kinder to batteries) unless a finger is drawing or something is morphing
        const busy = tr.on || tr.fade.length > 0 || finK > 0 || P.count() > 40 || clouds.some(c => c.state === 'morph' || (c.tx != null && c.state === 'drift'));
        if (!busy && now - lastDraw < 30) return;
        const t0d = performance.now();
        draw(cv.g, Math.min(0.1, accDt), t, now); accDt = 0; drawn++; lastDraw = now;
        const dd = performance.now() - t0d;
        if (phase !== 'intro') { QG.ema = QG.ema ? QG.ema * 0.9 + dd * 0.1 : dd; QG.n++; if (!QG.dropped && QG.n > 40 && QG.ema > 16 && cv.dpr >= 1.9) { QG.dropped = true; QG.ema = 0; QG.n = 0; cv.setQuality(0.5); } }
      });
      let bump = 0, finK = 0, nightK = 0, sunsetK = 0;
      function drawCloud(g, c, t) {
        const grey = c.kind === 'thought', u = L.u * c.scale;
        if (c.state === 'drift' || c.state === 'fade') {
          if (!c.spr) c.spr = renderPuffs(c.puffs, grey, c.scale);
          const cc = cloudCenter(c), b = 1 + (K.reduced() ? 0 : bump * 0.012), fa = c.state === 'fade' ? clamp(1 - (performance.now() - c.t0) / 1600, 0, 1) : 1;
          if (fa <= 0) return;
          if (c.star && fa === 1) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.3 + 0.15 * Math.sin(t * 2); g.drawImage(SPR.glow, cc.x - u * 1.5, cc.y - u * 1.2, u * 3, u * 2.4); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
          g.globalAlpha = fa;
          g.drawImage(c.spr.c, cc.x - c.spr.ox * b, cc.y - c.spr.oy * b, c.spr.w * b, c.spr.h * b);
          g.globalAlpha = 1;
          return;
        }
        const cr = BY[c.creature];
        if (c.state === 'morph') { // puffs fly from the cloud shape into the creature
          const k = eBack(c.k);
          const pts = c.target.map((q, j) => { const f = c.from[c.map[j]]; return { x: lerp(f.x, q.x, k), y: lerp(f.y, q.y, k), r: lerp(f.r, q.r, Math.min(1, c.k * 1.4)), thin: q.thin && c.k > 0.6 }; });
          for (let i = 0; i < c.from.length; i++) if (!c.mapped.has(i)) { const f = c.from[i], r = f.r * (1 - c.k); if (r * u > 0.6) pts.push({ x: f.x * (1 - c.k * 0.3), y: f.y * (1 - c.k * 0.3), r }); }
          c.mspr = renderPuffs(pts, grey && c.k < 0.5, c.scale, c.mspr);
          g.drawImage(c.mspr.c, c.x - c.mspr.ox, c.y - c.mspr.oy, c.mspr.w, c.mspr.h);
          if (c.k > 0.7) { g.save(); g.translate(c.x, c.y); features(g, cr, u, (c.k - 0.7) / 0.3, t); accessory(g, cr, u, (c.k - 0.7) / 0.3, t); g.restore(); }
          return;
        }
        // alive or leaving: the creature sprite plus its living doodles
        if (!c.spr) c.spr = renderPuffs(c.puffs, false, c.scale);
        const at = (performance.now() - c.t0) / 1000 + (c.state === 'exit' ? (c.aliveS || 3) : 0), pose = K.reduced() ? { x: 0, y: Math.sin(at * 1.4) * 0.03 * u, r: 0, sx: 1, sy: 1 } : animPose(cr, at, u); // reduced motion: a gentle float, no shakes
        const fade = c.state === 'exit' ? clamp(1 - (performance.now() - c.t0) / 2400, 0, 1) : 1, drift = c.state === 'exit' ? ((performance.now() - c.t0) / 1000) * (cr.dir || 0) * 30 * L.s : 0;
        g.save(); g.globalAlpha = fade; g.translate(c.x + pose.x + drift, c.y + pose.y - (c.state === 'exit' ? ((performance.now() - c.t0) / 1000) * 14 * L.s : 0)); g.rotate(pose.r); g.scale(pose.sx, pose.sy);
        g.drawImage(c.spr.c, -c.spr.ox, -c.spr.oy, c.spr.w, c.spr.h);
        features(g, cr, u, 1, t); accessory(g, cr, u, 1, t);
        g.restore(); g.globalAlpha = 1;
        liveFx(g, c, cr, at, pose, u);
      }
      function liveFx(g, c, cr, at, pose, u) { // a few particles that make each move read: spout, smoke, rain, rocket flame
        const x = c.x + pose.x, y = c.y + pose.y;
        if (cr.id === 'whale' && Math.random() < 0.3) P.emit('drop', x - 0.42 * u, y - 0.5 * u, 1, { angle: -Math.PI / 2, spread: 0.9, speed: [60, 120], colors: ['rgba(200,230,255,0.9)'] });
        if (cr.id === 'dragon' && Math.random() < 0.15) P.emit('smoke', x - 1 * u, y - 0.3 * u, 1, { angle: Math.PI, spread: 0.5, speed: [20, 40], colors: ['rgba(255,255,255,0.5)'] });
        if (cr.id === 'teapot' && at > 0.6 && Math.random() < 0.5) P.emit('drop', x - 0.95 * u, y - 0.1 * u, 1, { angle: Math.PI / 2, spread: 0.3, speed: [40, 80], colors: ['rgba(170,210,255,0.9)'] });
        if (cr.id === 'rocket' && at > 0.3 && Math.random() < 0.7) P.emit('ember', x, y + 0.75 * u, 2, { angle: Math.PI / 2, spread: 0.4, speed: [60, 140], colors: ['#ffd43b', '#ff922b', '#fff3bf'] });
        if (cr.id === 'unicorn' && Math.random() < 0.3) P.emit('star', x + 0.4 * u, y, 1, { colors: ['#ffc9f0', '#d0bfff', '#a5d8ff'], speed: [10, 40] });
        if (cr.thought && Math.random() < 0.12 && !care()) P.emit('confetti', x, y - 0.5 * u, 1, { speed: [40, 100], angle: -Math.PI / 2, spread: 1.4 });
      }
      function draw(g, dt, t, now) {
        const d = L.dpr, w = L.w, hh = L.h, pal = SKIES[skyId()];
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.drawImage(SKY.c, 0, 0);
        if (sunsetK > 0.01 && SUNSET_SKY) { g.globalAlpha = sunsetK; g.drawImage(SUNSET_SKY.c, 0, 0); g.globalAlpha = 1; }
        if (nightK > 0.01 && NIGHT_SKY) { g.globalAlpha = nightK; g.drawImage(NIGHT_SKY.c, 0, 0); g.globalAlpha = 1; }
        g.setTransform(d, 0, 0, d, 0, 0);
        drawOrbs(g, pal, w);
        if (far.length && nightK < 0.98) {
          g.globalAlpha = 0.5 * (1 - nightK);
          for (const f of far) { if (!f.spr) f.spr = renderPuffs(f.puffs, false, f.sc); g.drawImage(f.spr.c, f.x - f.spr.ox, f.y - f.spr.oy, f.spr.w, f.spr.h); }
          g.globalAlpha = 1;
        }
        drawBirds(g, t, pal);
        if (dimK > 0.01) { g.fillStyle = 'rgba(40,46,70,' + (dimK * 0.22).toFixed(3) + ')'; g.fillRect(0, 0, w, hh); }
        for (const c of clouds) if (c.state === 'drift') drawCloud(g, c, t);
        for (const c of clouds) if (c.state !== 'drift') drawCloud(g, c, t);
        drawTrail(g, now);
        if (finK > 0) drawFinale(g, t, now);
        g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(GRASS.c, 0, 0); g.setTransform(d, 0, 0, d, 0, 0);
        drawBlades(g, t);
        const ffk = Math.max(nightK, pal.dark ? 0.55 : 0); // fireflies in the evening grass
        if (ffk > 0.2) for (let i = 0; i < 10; i++) { const fx = (i * 97.3 + t * 8 * (i % 2 ? 1 : -1)) % w, fy = L.grassY + 30 + 40 * Math.sin(t * 0.5 + i * 1.7); g.fillStyle = 'rgba(225,255,150,' + (ffk * 0.7 * (0.5 + 0.5 * Math.sin(t * 2.4 + i * 2))) + ')'; g.beginPath(); g.arc((fx + w) % w, fy, 1.8, 0, TAU); g.fill(); }
        P.update(dt); P.draw(g);
      }
      function drawOrbs(g, pal, w) { // the sun glides down and sets behind the hills in the finale; the moon comes up for the night
        const gy = L.grassY;
        if (pal.sun && !pal.moon) {
          const x = lerp(pal.sun[0], SUNSET.sun[0], sunsetK) * w, y = lerp(pal.sun[1], SUNSET.sun[1], sunsetK) * gy + nightK * gy * 0.3;
          if (sunsetK < 0.99) { const o = SPR.sun; g.globalAlpha = 1 - sunsetK; g.drawImage(o.c, x - o.R, y - o.R, o.R * 2, o.R * 2); }
          if (sunsetK > 0.01) { const o = SPR.sunset; g.globalAlpha = sunsetK; g.drawImage(o.c, x - o.R, y - o.R, o.R * 2, o.R * 2); }
          g.globalAlpha = 1;
        }
        const mx = (pal.moon ? pal.sun[0] : 0.84) * w, my = (pal.moon ? pal.sun[1] : 0.26) * gy, ma = pal.moon ? 1 - sunsetK * (1 - nightK) : nightK;
        if (ma > 0.01) { const o = SPR.moon; g.globalAlpha = ma; g.drawImage(o.c, mx - o.R, my - o.R, o.R * 2, o.R * 2); g.globalAlpha = 1; }
      }
      const birds = { list: [], next: 7 };
      function stepBirds(rdt) { // now and then a little flock crosses the sky, behind the big clouds
        birds.next -= rdt;
        if (birds.next <= 0 && phase === 'play') {
          birds.next = 15 + Math.random() * 12;
          const dir = Math.random() < 0.5 ? 1 : -1, y = L.band.y0 * 0.85 + Math.random() * (L.grassY - L.band.y0) * 0.45, n = 3 + Math.floor(Math.random() * 3), v = (34 + Math.random() * 10) * L.s;
          for (let i = 0; i < n; i++) birds.list.push({ x: dir > 0 ? -24 - i * 16 : L.w + 24 + i * 16, y: y + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 9 * L.s, v: dir * v * (1 + (Math.random() - 0.5) * 0.08), ph: Math.random() * 6, s: (0.75 + Math.random() * 0.35) * L.s });
          if (A.ctx && !pal0().dark) A.tone({ type: 'sine', freq: 2900, to: 3500, glide: 0.05, dur: 0.07, vol: 0.012, pan: dir * -0.6, bus: 'amb' });
        }
        for (let i = birds.list.length - 1; i >= 0; i--) { const b = birds.list[i]; b.x += b.v * rdt; if (b.x < -80 || b.x > L.w + 80) birds.list.splice(i, 1); }
      }
      const pal0 = () => SKIES[skyId()];
      function drawBirds(g, t, pal) {
        if (!birds.list.length || nightK > 0.5) return;
        g.strokeStyle = pal.dark ? 'rgba(28,22,48,0.75)' : 'rgba(44,58,92,0.55)'; g.lineWidth = 1.5 * L.s; g.lineCap = 'round'; g.lineJoin = 'round';
        g.beginPath();
        for (const b of birds.list) { const f = Math.sin(t * 8 + b.ph) * 4.5 * b.s, sz = 7 * b.s; g.moveTo(b.x - sz, b.y - f); g.quadraticCurveTo(b.x - sz * 0.45, b.y - f * 0.2 - 2 * b.s, b.x, b.y); g.quadraticCurveTo(b.x + sz * 0.45, b.y - f * 0.2 - 2 * b.s, b.x + sz, b.y - f); }
        g.stroke();
      }
      function drawBlades(g, t) { // a few big blades right by the camera, swaying in the breeze
        const pal = SKIES[skyId()], cols = pal.grass, wind = pal.wind || 1, hh = L.h, n = L.phone ? 9 : 16;
        g.lineCap = 'round';
        for (let i = 0; i < n; i++) {
          const x = (i + 0.5) / n * L.w + Math.sin(i * 7.1) * 18, len = (60 + (i * 37 % 50)) * L.s, sway = Math.sin(t * 1.3 * wind + i * 0.9) * 10 * wind * L.s;
          g.strokeStyle = cols[i % 2 ? 0 : 1]; g.lineWidth = (5 + (i % 3) * 2) * L.s;
          g.beginPath(); g.moveTo(x, hh + 6); g.quadraticCurveTo(x + sway * 0.3, hh - len * 0.5, x + sway, hh - len); g.stroke();
        }
      }
      function drawTrail(g, now) {
        const draw1 = (pts, a, win) => {
          if (pts.length < 2) return;
          g.lineCap = 'round'; g.lineJoin = 'round';
          g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
          g.strokeStyle = 'rgba(255,240,190,' + (0.3 * a) + ')'; g.lineWidth = 12 * L.s; g.stroke();
          g.strokeStyle = win ? 'rgba(255,255,255,' + a + ')' : 'rgba(255,250,230,' + (0.95 * a) + ')'; g.lineWidth = 3.6 * L.s; g.stroke();
          g.setLineDash([2, 9 * L.s]); g.strokeStyle = 'rgba(255,214,120,' + (0.9 * a) + ')'; g.lineWidth = 2 * L.s; g.stroke(); g.setLineDash([]);
        };
        if (tr.pts.length) draw1(tr.pts, 1, false);
        for (let i = tr.fade.length - 1; i >= 0; i--) { const f = tr.fade[i], k = (now - f.t0) / (f.win ? 700 : 500); if (k >= 1) { tr.fade.splice(i, 1); continue; } draw1(f.pts, 1 - k, f.win); }
      }

      /* ---------------- finale: a sunset curtain call, then constellations ---------------- */
      let constel = null;
      function drawFinale(g, t, now) {
        drawBows(g, t, now);
        if (!constel) return;
        const k = constel.k;
        for (const st of constel.list) {
          if (k < st.d) continue;
          const kk = clamp((k - st.d) / 0.18, 0, 1);
          g.strokeStyle = 'rgba(220,230,255,' + (0.55 * kk) + ')'; g.lineWidth = 1.3;
          g.beginPath(); st.pts.forEach((p, i) => { const q = st.pts[(i + 1) % st.pts.length]; if (i < st.pts.length * kk) { g.moveTo(p.x, p.y); g.lineTo(lerp(p.x, q.x, Math.min(1, st.pts.length * kk - i)), lerp(p.y, q.y, Math.min(1, st.pts.length * kk - i))); } }); g.stroke();
          for (const p of st.pts) { const tw = 0.7 + 0.3 * Math.sin(t * 2.4 + p.x); g.globalCompositeOperation = 'lighter'; g.globalAlpha = kk * tw * 0.8; g.drawImage(SPR.glow, p.x - 9, p.y - 9, 18, 18); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.fillStyle = 'rgba(255,252,240,' + kk + ')'; g.beginPath(); g.arc(p.x, p.y, 1.8, 0, TAU); g.fill(); }
          for (const p of st.eyes) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = kk * (0.75 + 0.25 * Math.sin(t * 3.1 + p.y)); g.drawImage(SPR.glow, p.x - 13, p.y - 13, 26, 26); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.fillStyle = 'rgba(255,240,200,' + kk + ')'; g.beginPath(); g.arc(p.x, p.y, 2.4, 0, TAU); g.fill(); }
        }
      }
      function starPoints(cr, cx, cy, sc, flip) { // a constellation from the creature's own outline: its tips (ears, tails, fins) and the curves between
        const c0 = blobCentroid(cr.b), N = 48, ring = [];
        for (let i = 0; i < N; i++) { const a = i / N * TAU - Math.PI / 2, dx = Math.cos(a), dy = Math.sin(a); let m = 0.05; for (const e of cr.b) { const tt = rayEllipse(c0.x, c0.y, dx, dy, e); if (tt > m) m = tt; } ring.push({ x: c0.x + dx * m, y: c0.y + dy * m }); }
        const segD = (p, a, b) => { const vx = b.x - a.x, vy = b.y - a.y, l2 = vx * vx + vy * vy || 1e-9, k = clamp(((p.x - a.x) * vx + (p.y - a.y) * vy) / l2, 0, 1); return Math.hypot(p.x - a.x - vx * k, p.y - a.y - vy * k); };
        let far = 0, fd = -1; ring.forEach((p, i) => { const dd = Math.hypot(p.x - ring[0].x, p.y - ring[0].y); if (dd > fd) { fd = dd; far = i; } });
        const pick = (eps) => { // Douglas-Peucker on the closed outline
          const keep = new Set([0, far]);
          const rec = (a, b) => { let bi = -1, bd = eps; for (let k = a + 1; k < b; k++) { const dd = segD(ring[k % N], ring[a % N], ring[b % N]); if (dd > bd) { bd = dd; bi = k; } } if (bi >= 0) { keep.add(bi % N); rec(a, bi); rec(bi, b); } };
          rec(0, far); rec(far, N);
          return [...keep].sort((x, y) => x - y);
        };
        let eps = 0.05, idx = pick(eps); while (idx.length > 15 && eps < 0.4) { eps *= 1.3; idx = pick(eps); }
        const fl = flip || 1, out = idx.map(i => ({ x: cx + fl * ring[i].x * sc, y: cy + ring[i].y * sc }));
        return { pts: out, eyes: (cr.eyes || []).slice(0, 1).map(e => ({ x: cx + fl * e[0] * sc, y: cy + e[1] * sc })) };
      }
      async function finale() {
        if (phase === 'end') return;
        phase = 'end'; K.guide(null); MU.mood = 0; dim = 0;
        clouds.forEach(c => { if (c.state === 'drift') { c.state = 'fade'; c.t0 = performance.now(); c.tx = null; if (!c.vx) c.vx = 12 * L.s; } if (c.label) { c.label.classList.add('cs-gone'); c.label.style.opacity = '0'; } });
        hud.classList.add('cs-hide');
        SUNSET_SKY = paintSky(SUNSET); NIGHT_SKY = paintSky(Object.assign({ stars: true }, NIGHT));
        loopie.base('happy'); sync.show(true); sync.base('happy');
        talk(loopie, line({ Jolly: 'Sunset! Everyone, take a bow.', Cheeky: 'Golden hour. Your creatures want their curtain call.', Unfiltered: 'Sunset. Curtain call.' }), { ms: 3000 });
        if (A.ctx) { A.pad([A.note('F3'), A.note('A3'), A.note('C4'), A.note('E4')], { dur: 7, vol: 0.12, attack: 1.2 }); A.sync('finale', performance.now()); }
        await K.anim(K.reduced() ? 200 : 1800, (k) => { sunsetK = eIO(k); });
        // the curtain call: every creature you found floats back in and takes a bow, in order
        const cols = L.phone ? 3 : Math.min(5, made.length), rows = Math.ceil(made.length / cols);
        const cw = L.w / cols, top = L.phone ? 190 : 200, ch = Math.min(L.phone ? 136 : 150, (L.grassY - 60 - top) / rows);
        const sc = Math.min(cw * 0.32, ch * 0.34);
        const call = made.map((m, i) => { const r = Math.floor(i / cols), inRow = Math.min(cols, made.length - r * cols), col = i % cols; const rw = Math.min(L.w, inRow * cw * (L.phone ? 1 : 0.9)), x0 = (L.w - rw) / 2; return { m, x: x0 + (col + 0.5) * (rw / inRow), y: top + (r + 0.5) * ch - 8, i, cw: rw / inRow }; });
        const bow = call.map(o => { const cr = BY[o.m.id], pu = crispPuffs(cr); return { o, cr, pu, u: sc, thought: o.m.thought, spr: renderPuffs(pu, false, sc / L.u), t0: 0 }; });
        bowList = bow; finK = 1; constel = { k: 0, list: [] };
        let shown = 0;
        await K.anim(K.reduced() ? 300 : Math.min(4200, 900 + made.length * 380), (k) => {
          const n = Math.floor(k * (made.length + 0.999));
          while (shown < n) { const b = bow[shown], i0 = shown; b.t0 = performance.now(); if (A.ctx && SND[b.cr.snd]) SND[b.cr.snd](A); S.later(() => { if (A.ctx) A.chime(A.note(GLOCK[i0 % GLOCK.length]), { vol: 0.05, dur: 1.4 }); P.emit('star', b.o.x, b.o.y, 10, { colors: ['#fff3c4', '#ffd8a8'], speed: [30, 100] }); }, K.reduced() ? 0 : 950); shown++; } // its voice as it sets off, a twinkle as it lands
        });
        talk(loopie, line({ Jolly: 'Now watch… night’s coming.', Cheeky: 'And now, the night shift.', Unfiltered: 'Night. Watch.' }), { ms: 2400 });
        await K.sleep(K.reduced() ? 200 : 600);
        // night falls: each creature becomes its own constellation
        constel.list = call.map((o, i) => { const sp = starPoints(BY[o.m.id], o.x, o.y, sc, (BY[o.m.id].dir || 1) < 0 ? -1 : 1); return Object.assign(sp, { d: i / Math.max(1, made.length) * 0.6 }); });
        let rang = 0;
        await K.anim(K.reduced() ? 300 : 3200, (k) => {
          nightK = eIO(Math.min(1, k * 1.4)); constel.k = k;
          bowFade = 1 - clamp(k * 1.6 - 0.3, 0, 1);
          const n = Math.floor(k * made.length * 1.2);
          while (rang < Math.min(n, made.length)) { if (A.ctx) A.chime(A.note(['C6', 'E6', 'G6', 'A6', 'C7', 'D7', 'E7', 'G6', 'A6'][rang % 9]), { vol: 0.045, dur: 1.8, verb: 0.6 }); rang++; }
        });
        constel.k = 1;
        call.forEach(o => { // each constellation gets its name, wrapped to its own column and kept inside the frame
          const lb = h('div', { class: 'cs-star', 'aria-hidden': 'true', text: BY[o.m.id].name });
          lb.style.setProperty('--mw', Math.round(Math.min(150, o.cw - 14)) + 'px'); lb.style.top = Math.round(o.y + sc * 0.72 + 6) + 'px'; el.append(lb);
          const lw = lb.offsetWidth || 90; lb.style.left = Math.round(clamp(o.x, lw / 2 + 10, L.w - lw / 2 - 10)) + 'px';
          S.later(() => lb.classList.add('cs-on'), 60);
        });
        title.innerHTML = ''; title.append(document.createTextNode('Your sky: ' + made.length + ' creatures'), h('small', { text: 'Clouds change every day.' }));
        title.classList.add('cs-on');
        loopie.base('sleepy'); sync.base('moon');
        talk(loopie, line({ Jolly: 'Look at your sky.', Cheeky: 'Not bad for a lie-down.', Unfiltered: 'Your sky. Nice.' }), { ms: 3200 });
        if (A.ctx) { K.sfx.win(); }
        await K.sleep(K.reduced() ? 500 : 3000);
        // results
        const snugs = made.map(m => m.cloud.snug || 0.5), avg = snugs.reduce((s, v) => s + v, 0) / snugs.length, bestSnug = Math.max(...snugs);
        const badges = [];
        const newOnes = made.map(m => K.collect(m.id)).filter(r => r.isNew).length;
        const total = K.collection().filter(id => BY[id]).length;
        badges.push(newOnes ? 'Bestiary: ' + total + ' of ' + CR.length + ' (+' + newOnes + ' new)' : 'Bestiary: ' + total + ' of ' + CR.length);
        const pb = K.best('snug', Math.round(bestSnug * 100), 'higher');
        if (pb.isNew) badges.push('New best: ' + Math.round(bestSnug * 100) + '% snug loop');
        const tier = K.tier(avg, [0.3, 0.5, 0.68]); if (tier) badges.push(tier + ': snug loops');
        const star = made.find(m => m.star); if (star) badges.push('Creature of the day: ' + star.name);
        const silly = made.filter(m => m.thought);
        ctx.track('done', { n: made.length, snug: Math.round(avg * 100), thoughts: silly.length });
        finished = true;
        const first = silly.length && !care() ? silly[0].name : null;
        ctx.finish({
          title: 'Your sky: ' + made.length + ' creatures', mood: 'happy',
          lines: [made.filter(m => !m.thought).map(m => m.name).slice(0, 4).join(', ') + (normalsMade() > 4 ? ' and more' : ''), silly.length ? silly.length + ' grey thought' + (silly.length > 1 ? 's' : '') + ' turned into ' + (care() ? 'gentle creatures' : 'silly ones') : 'A whole sky of shapes', 'Snuggest loop: ' + Math.round(bestSnug * 100) + '%'],
          share: first ? 'Found ' + (aOrAn(first) === 'An' ? 'an ' : 'a ') + first + ' in the clouds. ' + made.length + ' creatures in my sky today.' : 'Found ' + made.length + ' creatures in the clouds today.',
          badges
        });
      }
      let bowList = null, bowFade = 1;
      function drawBows(g, t, now) { // the sunset parade: each creature floats in along its row, finds its spot, takes a little bow
        if (!bowList || bowFade <= 0.01) return;
        const red = K.reduced();
        for (const b of bowList) {
          if (!b.t0) continue;
          const lt = (now - b.t0) / 1000, u = b.u, flip = (b.cr.dir || 1) < 0 ? -1 : 1; // everyone faces the way the parade goes
          const ek = red ? 1 : eOut(clamp(lt / 1.2, 0, 1)), x = lerp(-u * 1.8, b.o.x, ek);
          const hop = red ? 0 : Math.abs(Math.sin(ek * Math.PI * 3)) * 0.24 * u * (1 - ek);
          const bw = lt > 1.25 && lt < 2.25 && !red ? Math.sin((lt - 1.25) * Math.PI) : 0;
          const y = b.o.y - hop + bw * 0.1 * u + (red ? 0 : Math.sin(t * 1.7 + b.o.i) * 0.035 * u);
          g.save(); g.globalAlpha = bowFade * clamp(lt / 0.25, 0, 1); g.translate(x, y); g.rotate(0.26 * bw); g.scale(flip * (1 + bw * 0.03), 1 - bw * 0.05);
          g.drawImage(b.spr.c, -b.spr.ox, -b.spr.oy, b.spr.w, b.spr.h);
          features(g, b.cr, u, 1, t); if (b.thought) accessory(g, b.cr, u, 1, t);
          g.restore(); g.globalAlpha = 1;
        }
      }

      /* ---------------- start ---------------- */
      cv.onResize(() => { if (!layout()) return; paint(); clouds.forEach(c => { if (c.state === 'drift') c.y = L.lanes[c.lane] + c.dy * L.s; }); makeFar(); });
      S.on('theme', () => paint());
      const firstClouds = () => { // the first clouds are already up there, behind the title card
        spawnCloud('normal', { x: L.w * (L.phone ? 0.34 : 0.38), lane: 0 }); spawnCloud('normal', { x: L.w * (L.phone ? 0.64 : 0.6), lane: 2 });
        if (!L.phone) spawnCloud('normal', { x: L.w * 0.2, lane: 1 });
      };
      if (L) firstClouds();
      (async () => {
        await K.intro({ title: 'Cloud Shapes', sub: 'Lie back. The sky is full of things, if you look.', how: 'Loop a cloud to see what it is. Draw ears or a tail and it becomes what you drew.', char: 'loopie', mood: 'silly' });
        phase = 'play'; MU.on = true;
        if (!clouds.length && L) firstClouds();
        talk(loopie, line({ Jolly: 'Lie back with me. That cloud looks like something… loop it and see!', Cheeky: 'Cloud o’clock. Loop one. I bet it’s a whale. It’s always a whale.', Unfiltered: 'Lie back. Loop a cloud. See what it is.' }), { mood: 'silly', ms: 4200 });
        if (starOfDay) S.later(() => { if (phase === 'play' && made.length === 0) talk(loopie, line({ Jolly: 'Psst. Today’s sky has a ' + BY[starOfDay].name.toLowerCase() + ' hiding in it somewhere.', Cheeky: 'Rumour: there’s a ' + BY[starOfDay].name.toLowerCase() + ' up there today.', Unfiltered: 'There’s a ' + BY[starOfDay].name.toLowerCase() + ' up there today.' }), { ms: 3200 }); }, 9000);
        guideNext(1500);
      })();

      return {
        async autoplay() {
          while (phase === 'intro') await K.wait(150);
          await K.wait(1200); // lie back and look first, like a person would
          const tStart = performance.now();
          while (!finished && performance.now() - tStart < 150000) {
            if (phase !== 'play') { await K.wait(250); continue; }
            const grey = clouds.filter(c => c.kind === 'thought' && c.state === 'drift' && c.x > L.u && c.x < L.w - L.u);
            const pool = (grey.length ? grey : traceable().filter(c => c.x > L.u * 0.9 && c.x < L.w - L.u * 0.9)).sort((a, b) => Math.abs(a.x - L.w / 2) - Math.abs(b.x - L.w / 2));
            const c = pool[0];
            if (!c) { await K.wait(300); continue; }
            await K.wait(650);
            if (c.state !== 'drift') continue;
            const cc = cloudCenter(c), rx = L.u * 1.25, ry = L.u * 0.85, steps = 30;
            const pr = await K.sim.press(stage, cc.x + rx, cc.y);
            for (let i = 1; i <= steps && c.state === 'drift'; i++) { await K.wait(42); const a = i / steps * TAU * 1.08, q = cloudCenter(c); pr.move(q.x + Math.cos(a) * rx, q.y + Math.sin(a) * ry); }
            const q = cloudCenter(c); pr.up(q.x + rx, q.y);
            const t0 = performance.now();
            while (c.state === 'morph' || (c.state === 'alive' && performance.now() - t0 < 6000)) await K.wait(150);
          }
          while (!finished) await K.wait(200);
        }
      };
    }
  });
})(window.TSG_ENV);
