// Untangle — Zuzu, The Spiral Observatory. Paid ritual (problem-solving).
// Untangling, not reframing: it separates, sorts and orders what's knotted
// together, and never questions whether a thought is true.

export default {
  version: '1.0.0',
  review: { status: 'draft', by: 'Pending editorial review' },
  id: 'untangle',
  name: 'Untangle',
  purpose: 'When everything’s knotted together, pull the threads apart, see each one on its own, and pick which one to tug first.',
  family: 'problem-solving',
  tier: 'paid',
  emotions: ['family:confusion', 'confusion', 'doubt', 'uncertainty', 'indecision', 'conflicted', 'disorientation', 'hesitation',
    'ambivalence', 'stuck', 'scattered', 'overthinking', 'overwhelm'],
  intensity: { min: 0.2, max: 0.9 },
  contexts: ['work', 'school', 'future', 'change', 'family', 'relationship', 'money', 'home'],
  durationSec: 180,
  mallows: ['zuzu'],
  module: 'untangle',
  tone: 'playful',
  moves: [
    { id: 'knot', prompt: 'Pick the strands that are tangled up in the knot.', kind: 'choice' },
    { id: 'pull', prompt: 'Drag each strand out of the knot until it comes free.', kind: 'drag-unspool' },
    { id: 'sort', prompt: 'Drag each thread onto a ring: I know this, I need to decide, I don’t know yet.', kind: 'drag-sort' },
    { id: 'tug', prompt: 'Choose one thread, a tiny next step, and give it a tug.', kind: 'choice-pull' },
  ],
  mechanic: 'A glowing ball of thread turns under the dome as you name its strands; dragging a bead unspools its strand until it twangs free into a straight thread; threads are dragged onto three orbit rings; one is pulled down until it twangs, then every thread winds into a spiral galaxy.',
  animation: { lead: ['curious, growing confused as strands are added (spirals wobble)', 'spins with delight as each strand comes free', 'nods at each sorted thread', 'determined for the first tug, a gasp at the twang', 'clarity: spirals slow down and brighten'] },
  world: { realm: 'spiral-observatory', transform: 'The tangled, wobbling spiral settles, the dome brightens, and the threads wind into one clear galaxy.' },
  sensory: { sound: 'A soft hum and rising ticks while pulling, a two-tone separate as strands come free, sorting tones per ring, a snap and chime on the tug, a bloom as the galaxy forms.', haptics: 'Ticks while pulling, a pop when a strand frees, soft taps when sorting, success on the tug.' },
  finale: 'Every thread winds into a neat spiral galaxy with your first-tug thread glowing gold; Zuzu’s spirals spin once, then slow and brighten.',
  checkIn: 'Does it feel any less knotted?',
  accessibility: 'Every drag has a button: “Ease one out for me” pulls strands free, ring buttons sort the current thread (or press 1, 2, 3 on a focused thread), threads can be chosen from a list, and “Tug it for me” does the tug. All controls are labelled for screen readers.',
  safety: 'This ritual only sorts and orders what you name; it doesn’t judge whether any of it is true or right. If any strand is about someone hurting you, your safety comes first — the support button is always available. It never asks you to send a message.',
  rationale: 'Draws on common, widely taught approaches to feeling stuck: separating a tangle of concerns into single items, noticing which parts are known, unknown or waiting on a decision, and committing to one small, concrete next step. It doesn’t promise the confusion will vanish.',
};
