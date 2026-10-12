// Memory Garden tools. A tool is only offered after the person has actually
// practised or discovered it in play. Saving it is a way of remembering a
// skill, not a claim that anything has been reprogrammed.

export const SKILLS = {
  slowing: {
    id: 'slowing',
    title: 'The Power of Slowing Down',
    charm: { shape: 'ribbon', colour: '#ffd98a', glow: '#3ee8ff' },
    found: 'Glitzi’s Static Storm',
    world: 'static-storm',
    what: 'When you slowed your hand, the storm settled. Your body works a bit like that too: deliberately slowing one movement (your walk, your typing, your breath out) tends to take the edge off feeling wound up.',
    example: 'Before replying to a message that made you angry, type your first sentence at half speed. Notice if what you want to say changes.',
    evidence: 'Slowing and longer exhales are linked with lower arousal in research. hushmallow itself hasn’t been tested as a treatment.',
    related: ['making-room'],
  },
  'making-room': {
    id: 'making-room',
    title: 'Making Room',
    charm: { shape: 'wave', colour: '#a8f0ff', glow: '#1aa8f5' },
    found: 'Loomi’s Luminous Ocean',
    world: 'luminous-ocean',
    what: 'Your thought didn’t disappear. It floated farther out, still readable, just not right in your face. Noticing “I’m having the thought that…” can give you that same bit of distance.',
    example: 'Next time the thought comes back, say it in your head as “I’m noticing the thought that…” and see if it feels a little farther away.',
    evidence: 'This is cognitive defusion from Acceptance and Commitment Therapy, which has research support. The ocean is a playful way to practise it, not a treatment.',
    related: ['slowing'],
  },
};

export const skillById = (id) => SKILLS[id] || null;
