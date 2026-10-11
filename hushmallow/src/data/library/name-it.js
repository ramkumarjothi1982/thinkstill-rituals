// Name It — Loomi, The Chill One. The universal ritual: works for any feeling
// in the A–Z taxonomy, and is the guaranteed fit when nothing else is.

export default {
  version: '1.0.0',
  review: { status: 'draft', by: 'Pending editorial review' },
  id: 'name-it',
  name: 'Name It',
  purpose: 'Give a feeling its precise name, find where it lives in your body, give it a shape and colour, and work out what it needs.',
  family: 'reflection',
  tier: 'paid',
  emotions: [
    'family:joy', 'family:love', 'family:calm', 'family:curiosity', 'family:surprise', 'family:fear',
    'family:anger', 'family:sadness', 'family:disgust', 'family:shame', 'family:pride', 'family:envy',
    'family:loneliness', 'family:confusion', 'family:desire', 'family:boredom',
    'disgust', 'the-ick', 'aversion', 'curiosity', 'surprise', 'ambivalence', 'conflicted', 'bittersweetness', 'numbness',
  ],
  intensity: { min: 0, max: 1 },
  contexts: [],
  durationSec: 180,
  mallows: ['loomi', 'blubi', 'glitzi', 'zuzu', 'boppo', 'pipzi', 'noomi'],
  module: 'name-it',
  tone: 'gentle',
  moves: [
    { id: 'word', prompt: 'Find the closest word for it (up to three, mixed is fine).', kind: 'word-pick' },
    { id: 'where', prompt: 'Drag the glow to where it lives in your body, and set how big it is.', kind: 'body-map' },
    { id: 'shape', prompt: 'Give it a colour and a texture, then squeeze or stretch it.', kind: 'sculpt' },
    { id: 'need', prompt: 'Choose what it needs, hand it over, and pick a small way to give it.', kind: 'drag-give' },
  ],
  mechanic: 'Nearby words from the feeling taxonomy float up to pick from; a glow drags onto a body outline and snaps to where it lives; the feeling becomes an animated blob you colour, texture and squeeze; you drag a little light of what it needs into it and it softens.',
  animation: { lead: ['face blends into the chosen feelings (taxonomy face mix)', 'curious nods as it finds its place', 'playful while you squish the shape', 'comforted as the need is given', 'calm, accepting glow at the keepsake'] },
  world: { realm: 'blue-drift', transform: 'The drift slowly clears and warms as the feeling gets named, placed and shaped, settling fully at the keepsake.' },
  sensory: { sound: 'Chimes as words are chosen, a soft drop as the glow lands, a low hum while stretching, a bloom when the need is given.', haptics: 'Light taps on choices, ticks while stretching, a gentle success at the end.' },
  finale: 'The shape settles into a small glowing stone engraved with the feeling’s name; Loomi floats beside it, calm and unbothered.',
  checkIn: 'Now it has a name, how is it to hold?',
  accessibility: 'Every word is a button, with search and an A–Z family browser; arrow buttons choose a body area instead of dragging; Squeeze and Stretch buttons replace the drag; a Give it button replaces dragging the light.',
  safety: 'If what you’re feeling is about being hurt or unsafe, the support button is always available. This ritual never asks you to send anything to anyone.',
  rationale: 'Putting feelings into precise words, noticing where they show up in the body, and asking what a feeling needs are common, widely taught approaches. Naming a feeling clearly often makes it a little easier to hold; it isn’t a promise that it will go away.',
};
