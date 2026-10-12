// Sunpop Savour — Boppo, The Sunshine. A celebration ritual for savouring a
// good feeling so it hangs around a little longer.

export default {
  version: '1.0.0',
  review: { status: 'draft', by: 'Pending editorial review' },
  id: 'sunpop-savour',
  name: 'Sunpop Savour',
  purpose: 'Savour a good feeling so it sticks around a bit longer: notice it, grow it with details, let it land, then keep or share it.',
  family: 'celebration',
  tier: 'paid',
  emotions: [
    'family:joy', 'family:love', 'family:pride',
    'calm', 'serenity', 'peace', 'relaxation', 'ease', 'comfort', 'safety', 'refreshed', 'reassured', 'rested', 'in-the-moment', 'equanimity', 'clarity',
    'gratitude', 'relief', 'hope', 'satisfaction', 'triumph', 'savouring', 'contentment', 'accomplished', 'touched', 'appreciated', 'proud-of-someone', 'happy-for-someone',
  ],
  intensity: { min: 0.1, max: 1 },
  contexts: ['work', 'school', 'friends', 'family', 'partner', 'relationship', 'home', 'creativity', 'social', 'body', 'health', 'self-image'],
  durationSec: 180,
  mallows: ['boppo'],
  module: 'sunpop-savour',
  tone: 'playful',
  moves: [
    { id: 'plant', prompt: 'Pick the good thing, then drag its seed into the orchard soil.', kind: 'drag-plant' },
    { id: 'grow', prompt: 'Water the tree with what you saw, heard, felt and who was there.', kind: 'pour' },
    { id: 'soak', prompt: 'Hold the sun while the sunpop ripens. Let it land.', kind: 'hold-ripen' },
    { id: 'keep', prompt: 'Keep it or share it: tell someone, write it down, take a mental photo, plan a repeat, or just enjoy it.', kind: 'choice' },
  ],
  mechanic: 'Your good thing becomes a seed you drag into the soil; each sensory detail is a can of sunshine you tip over the sapling, growing the tree and popping out a sunpop fruit; holding the sun ripens all the fruit into one glowing sunpop; then you choose how to keep it.',
  animation: { lead: ['excited for you', 'curious while you pick', 'gasps as the sprout pops', 'happy and loved with each fruit', 'quiet, eyes-closed comfort while it ripens', 'proud and hopeful choosing', 'full-bounce celebration'] },
  world: { realm: 'sunpop-orchard', transform: 'The orchard warms into golden hour, the sapling bursts into blossom and a soft rainbow arcs over the islands.' },
  sensory: { sound: 'A soft drop as the seed lands, rising chimes for each fruit, a warm hum while it ripens, a bloom and a clearing shimmer at the pop.', haptics: 'A pop when the sprout appears, light taps while pouring, slow soft pulses while ripening, a success burst at the end.' },
  finale: 'The ripe sunpop pops into gentle confetti light, the tree bursts into blossom, the orchard turns golden and Boppo does a full celebration bounce.',
  checkIn: 'How’s that good feeling now?',
  accessibility: 'Every drag has a button alternative (“Plant it for me”, “Pour it for me”); the seed and can also respond to Enter; ripening can run on a tap-to-start toggle instead of holding; all choices are regular buttons. Reduced motion calms sway, confetti and Boppo’s movement.',
  safety: 'Meant for good or okay-ish moments. If a good feeling is tangled up with loss or hurt, there’s no need to force it bright — stop any time, and the support button is always available. Nothing here asks you to send a message.',
  rationale: 'Draws on widely shared savouring ideas: slowing down to notice a positive moment, adding sensory detail, letting attention rest on it for a few seconds, and sharing or recording it. It doesn’t promise the feeling will last; it just gives it a little more room.',
};
