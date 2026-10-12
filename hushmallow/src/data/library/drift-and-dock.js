// DRIFT AND DOCK — Loomi, The Blue Drift. Library entry (content only).
// Runs on the interaction module src/rituals/drift-and-dock.js.

export default {
  version: '1.0.0',
  review: { status: 'draft', by: 'Pending editorial review' },
  id: 'drift-and-dock',
  name: 'Drift and Dock',
  purpose: 'Slow your body down, then sort your worries into what you can act on now, later, or not at all, so your head has a little more room.',
  family: 'grounding',
  tier: 'paid',
  tone: 'quiet',
  emotions: ['family:fear', 'anxiety', 'worry', 'nervousness', 'dread', 'unease', 'apprehension', 'overwhelm', 'insecurity', 'vulnerability', 'panic'],
  intensity: { min: 0.2, max: 0.9 },
  contexts: ['work', 'school', 'money', 'health', 'future', 'family', 'social', 'change'],
  durationSec: 210,
  mallows: ['loomi'],
  module: 'drift-and-dock',
  moves: [
    { id: 'wave', prompt: 'Trace one long, slow wave across the water: in one way, out the other, slower.', kind: 'trace-pace' },
    { id: 'boats', prompt: 'Put each worry in its own paper boat.', kind: 'launch' },
    { id: 'dock', prompt: 'Dock each boat: today, later, or not mine to control.', kind: 'drag-sort' },
    { id: 'anchor', prompt: 'Pick one tiny first step, or a grounding anchor, and drop it.', kind: 'choice-drag' },
  ],
  mechanic: 'You trace a glowing float along a wave path at breathing pace (about 4 seconds in, 6 out); going too fast chops the water. Worries become paper boats you drag to three jetties, and each one tied up stills the water. One tiny step becomes an anchor you pull down to the seabed.',
  animation: { lead: ['anxious, mirroring you (darting eyes, a little sweat)', 'softening to calm with each smooth wave', 'a slow nod as each boat ties up', 'calm and content, floating, at the mirror-still finale'] },
  world: { realm: 'blue-drift', transform: 'Choppy water smooths with each slow wave and each docked boat, until the Drift is mirror-still.' },
  sensory: { sound: 'Breath swells that follow the wave, soft drop-ins as boats launch and tie up, a low chime for the anchor, a clearing shimmer at the end.', haptics: 'A gentle heartbeat at each turn of the wave, a soft pop when a boat docks, a soft success at the end.' },
  finale: 'The Drift goes mirror-still; the boats sit parked at their jetties and Loomi floats, calm and quietly pleased with you.',
  checkIn: 'How much room is in your head now?',
  accessibility: 'A guided-wave button runs the breathing for you; every boat and jetty is a regular button (tap a boat, then a jetty); the anchor drops with a button. All controls are keyboard reachable and labelled.',
  safety: 'If the worry is about your safety or someone else’s, or the panic feels too big right now, the support button is always available. This ritual never asks you to send any message.',
  rationale: 'Draws on common, widely taught approaches: slower breathing with a longer out-breath, writing worries down, and sorting them into what you can act on and what you can’t, then choosing one small next step or a simple grounding exercise. It doesn’t promise the worry will go away.',
};
