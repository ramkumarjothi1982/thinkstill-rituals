// Pocket Hush modes: metadata only (no heavy imports), shared by the picker,
// Comfort DNA, the home "For you" row and the Surprise Me rules.
// `comfort` names what the mode offers (matches Comfort DNA's COMFORTS);
// `evening` marks modes that suit winding down.

export const POCKET = [
  { id: 'quick-squeeze', title: 'Quick Squeeze', blurb: 'Squish it out', glyph: '◉', comfort: ['squeeze'], seconds: '15–30 s', evening: false },
  { id: 'soft-breath', title: 'Soft Breath', blurb: 'Breathe along, slow and soft', glyph: '◌', comfort: ['breathe', 'hold'], seconds: '30 s', evening: true },
  { id: 'gentle-glow', title: 'Gentle Glow', blurb: 'Move a warm light around', glyph: '✧', comfort: ['glow'], seconds: '20–30 s', evening: true },
  { id: 'let-it-float', title: 'Let It Float', blurb: 'Send things drifting away', glyph: '○', comfort: ['float'], seconds: '20–30 s', evening: false },
  { id: 'quiet-moment', title: 'Quiet Moment', blurb: 'Just sit together', glyph: '☾', comfort: ['quiet', 'hold', 'stroke'], seconds: '30 s', evening: true },
];

export const pocketById = (id) => POCKET.find((m) => m.id === id) || null;
