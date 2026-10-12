// SOFT LANDING — Blubi, The Softie, in the Raindrop Lagoon.
// Self-compassion for shame, guilt, embarrassment and their cousins.
// Not reframing: it never weighs whether you did wrong or whether a thought
// is accurate. It acknowledges the sting, soothes it, and (for guilt) offers
// one small repair.

export default {
  version: '1.0.0',
  review: { status: 'draft', by: 'Pending editorial review' },
  id: 'soft-landing',
  name: 'Soft Landing',
  purpose: 'Soften the sting of shame or guilt with the kindness you’d give a friend, and, where guilt points to something fixable, pick one small repair.',
  family: 'self-compassion',
  tier: 'paid',
  emotions: ['family:shame', 'shame', 'guilt', 'embarrassment', 'humiliation', 'remorse', 'self-consciousness', 'awkwardness', 'regret'],
  intensity: { min: 0.2, max: 0.95 },
  contexts: ['work', 'school', 'friends', 'family', 'partner', 'relationship', 'social', 'self-image', 'past', 'conflict'],
  durationSec: 180,
  mallows: ['blubi'],
  module: 'soft-landing',
  tone: 'gentle',
  moves: [
    { id: 'stone', prompt: 'Name the kind of sting the hot stone holds.', kind: 'choice' },
    { id: 'cool', prompt: 'Swish the stone in the lagoon, or stroke it, until it cools.', kind: 'drag-cool' },
    { id: 'friend', prompt: 'Choose the kind words you’d give a friend in your place.', kind: 'wrap' },
    { id: 'repair', prompt: 'Pick one small repair, or one soothing next step.', kind: 'choice' },
    { id: 'pocket', prompt: 'Pop the smooth pebble in your pocket.', kind: 'drag-drop' },
  ],
  mechanic: 'The sting appears as a glowing-hot pebble; you name its kind, then drag it through the lagoon water (or stroke it) so steam rises and it cools. Each kind word you’d say to a friend wraps it in another soft bubble layer, and the rough stone turns into a smooth pebble you drop into a pocket.',
  animation: { lead: ['embarrassed/guilty, blushing and looking down alongside you', 'softening to calm as the stone cools', 'comforted, glowing at each kind word', 'relieved and comforted, with a comfort reaction at the finale'] },
  world: { realm: 'raindrop-lagoon', transform: 'The heavy, drizzly lagoon lifts: rain eases, ripples bloom where the stone cools, and the hanging drops rise into light.' },
  sensory: { sound: 'A soft drop-in splash, a draining hush while the stone cools, a bloom for each bubble layer, a gentle clearing shimmer.', haptics: 'Soft ticks while cooling, a gentle pulse per kind word, a soft success when the pebble is pocketed.' },
  finale: 'The stone has become a smooth, pearly pebble; you pop it into a pocket, the lagoon clears and Blubi gives you a comforted, happy-teary squish.',
  checkIn: 'How does the sting feel now?',
  accessibility: 'Every gesture has a button: “Splash it with cool water” cools the stone without dragging, kind words and next steps are ordinary buttons, and a “Pop it in my pocket” button replaces the final drag. Reduced motion keeps steam and wobble minimal.',
  safety: 'This ritual never decides whether you did something wrong, and never asks you to send a message or contact anyone. If shame is tied to someone hurting you, or you feel unsafe, the support button is always available.',
  rationale: 'Draws on widely taught self-compassion ideas: noticing the feeling kindly, remembering that everyone slips, speaking to yourself as you would to a friend, and, where guilt points to something fixable, taking one small reparative step. It doesn’t promise the feeling will go away.',
};
