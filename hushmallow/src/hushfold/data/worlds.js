// Hushflow world registry.
//
// One record per world. A record is a design contract, not a promise: only
// `status: 'playable'` worlds are ever offered. A new world must bring its
// own touch mechanic and emotional purpose — a recoloured copy of an
// existing world does not count as a new world.
//
// evidence: 'supported'  — a psychological process with research support
//                          (the app itself has not been trialled)
//           'informed'   — adapted from a supported skill, in game form
//           'inspired'   — contemplative or creative inspiration only

export const WORLDS = [
  {
    id: 'static-storm',
    title: 'Glitzi’s Static Storm',
    status: 'playable',
    module: 'static-storm',
    realm: 'static-storm',
    mallow: 'glitzi',
    purpose: 'Let charged feelings move, then discover that slowing your own pace settles the world.',
    feelings: ['angry', 'frustrated', 'restless', 'overwhelmed', 'other'],
    intentions: ['calm', 'letgo', 'play'],
    technique: 'Intentional slowing (arousal downshift); responding rather than reacting.',
    evidence: 'informed',
    environment: 'A crystalline night storm: thunderheads, broken constellations, a cracked glass floor.',
    touch: 'Draw anywhere. Fast strokes throw jagged lightning and raise the storm; slow strokes lay down smooth light ribbons that draw the charge out of your Thought Mallow and heal the sky.',
    mallowBehaviour: 'Glitzi enjoys the chaos, comments drily, and visibly relaxes as the storm settles.',
    userInput: 'Your Thought Mallow crackles in the storm with your exact words above it; slow ribbons near it discharge it.',
    progression: 'Charge → noticing pace → discovery (“You changed your pace”) → quiet storm.',
    dialogue: 'STORM in data/lines.js',
    sound: 'Crackle and charge holds for fast strokes, soft settle tones for slow ones; vibration ticks with lightning where supported.',
    completion: 'About eight seconds of slow drawing after the storm has calmed, or whenever the person chooses Continue.',
    transition: 'Melts into the Luminous Ocean: sparks fall as glowing drops and the water rises.',
    reward: 'slowing',
    accessibility: 'Every lightning burst respects the three-per-second flash limit; reduced motion turns bolts into soft glows. Holding still anywhere also drains charge, so it works with one slow finger or a switch-style tap.',
    playtest: 'Not yet tested with people.',
  },
  {
    id: 'luminous-ocean',
    title: 'Loomi’s Luminous Ocean',
    status: 'playable',
    module: 'luminous-ocean',
    realm: 'blue-drift',
    mallow: 'loomi',
    purpose: 'Make space between you and a thought: slow sweeps raise long waves that carry it farther away without destroying it.',
    feelings: ['anxious', 'sad', 'overwhelmed', 'lonely', 'angry', 'frustrated', 'restless', 'other'],
    intentions: ['calm', 'letgo', 'distract', 'steady', 'play'],
    technique: 'Cognitive defusion and decentring (ACT); mindful attention to a moving current; optional easy exhale with the tide (no breath holding).',
    evidence: 'informed',
    environment: 'A bioluminescent night ocean under a soft moon, glitter riding every crest.',
    touch: 'Sweep the water. Slow, long sweeps raise tall smooth swells that roll to the horizon; quick strokes make choppy splashes. Tap to drop a ripple.',
    mallowBehaviour: 'Loomi floats calmly, bobbing on your waves, and gets sleepily pleased as the sea lengthens.',
    userInput: 'Your Thought Mallow rides the swells with your exact words. Long waves carry it farther; it stays visible and readable, just smaller. Your photos (optional) float as postcards that drift outward too.',
    progression: 'Choppy → noticing → discovery (“Slow sweeps make long waves”) → the thought far out on the water.',
    dialogue: 'OCEAN in data/lines.js',
    sound: 'Blue Drift water ambience, soft swish for sweeps, settle tones as swells roll out.',
    completion: 'When the thought has drifted far, or whenever the person chooses Continue. Bring it back is always available.',
    transition: 'Drifts into Moonmilk Cove as the sky deepens.',
    reward: 'making-room',
    accessibility: 'Reduced motion lowers wave height and removes camera bob. A tap anywhere also raises a gentle swell, so it works without dragging.',
    playtest: 'Not yet tested with people.',
  },
  {
    id: 'moonmilk-rest',
    title: 'Noomi’s Moonmilk Cove',
    status: 'playable',
    module: 'moonmilk-rest',
    realm: 'moonmilk-cove',
    mallow: 'noomi',
    purpose: 'Somewhere to stop. No task: just Noomi to squeeze and a quiet cove.',
    feelings: ['sad', 'lonely', 'anxious', 'overwhelmed', 'other'],
    intentions: ['calm', 'steady', 'play', 'distract'],
    technique: 'Permission to rest; stillness.',
    evidence: 'inspired',
    environment: 'The existing Moonmilk Cove realm.',
    touch: 'MallowTouch on Noomi only. This is a simple rest stop, not a full world yet.',
    mallowBehaviour: 'Noomi dozes and responds sleepily to touch.',
    userInput: 'None.',
    progression: 'None by design.',
    dialogue: 'REST in data/lines.js',
    sound: 'Moonmilk Cove ambience.',
    completion: 'Whenever the person likes.',
    transition: 'Back to the Static Storm if Auto-flow continues.',
    reward: null,
    accessibility: 'No time pressure, no required gesture.',
    playtest: 'Not yet tested with people.',
  },
  // Designed, not built. Never offered while planned.
  {
    id: 'thought-aquarium', title: 'Thought Aquarium', status: 'planned', mallow: 'blubi', realm: 'raindrop-lagoon',
    purpose: 'Mental digestion: thought objects sink and settle through a living underwater garden.', feelings: ['overwhelmed', 'anxious', 'sad'],
    intentions: ['calm', 'letgo'], technique: 'Decentring; letting thoughts settle without solving them.', evidence: 'informed',
    touch: 'Stir to cloud the water, stop to watch everything settle; feed thoughts to the slow currents.', reward: 'settling',
  },
  {
    id: 'silent-constellation', title: 'Silent Constellation', status: 'planned', mallow: 'zuzu', realm: 'spiral-observatory',
    purpose: 'A reactive galaxy that only becomes quiet and readable when touch pauses.', feelings: ['restless', 'overwhelmed', 'anxious'],
    intentions: ['calm', 'steady'], technique: 'Attention to stillness (inspired by Vigyan Bhairav Tantra); the pause between movements.', evidence: 'inspired',
    touch: 'Moving stirs the stars; resting a finger and waiting lets constellations draw themselves.', reward: 'pause',
  },
  {
    id: 'pause-bridge', title: 'The Pause Bridge', status: 'planned', mallow: 'boppo', realm: 'sunpop-orchard',
    purpose: 'A world that changes when you create a gap before acting.', feelings: ['angry', 'frustrated'],
    intentions: ['steady'], technique: 'DBT-informed pause before acting; responding rather than reacting.', evidence: 'informed',
    touch: 'Planks only appear where you wait a breath before stepping.', reward: 'reaction-gap',
  },
  {
    id: 'kind-hands', title: 'Kind Hands', status: 'planned', mallow: 'blubi', realm: 'raindrop-lagoon',
    purpose: 'A distressed Thought Mallow is cared for instead of punished.', feelings: ['sad', 'lonely', 'other'],
    intentions: ['steady', 'calm'], technique: 'Self-compassion.', evidence: 'supported',
    touch: 'Warm it with slow holds, wrap it, speak to it the way you would to a friend.', reward: 'kind-voice',
  },
  {
    id: 'one-point', title: 'One Point', status: 'planned', mallow: 'noomi', realm: 'moonmilk-cove',
    purpose: 'Sustained attention on a tiny point unfolds an immersive universe.', feelings: ['restless', 'anxious'],
    intentions: ['steady'], technique: 'Single-point concentration (yoga-inspired).', evidence: 'inspired',
    touch: 'Keep a finger resting on one point; the world grows from it, and wanders back when attention does.', reward: 'one-thing',
  },
];

export const worldById = (id) => WORLDS.find((w) => w.id === id) || null;
export const PLAYABLE = WORLDS.filter((w) => w.status === 'playable');
