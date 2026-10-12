// Raindrop Keeper — Blubi, The Softie. Library entry (content, not code).
// Runs on src/rituals/raindrop-keeper.js.

export default {
  version: '1.0.0',
  review: { status: 'draft', by: 'Pending editorial review' },
  id: 'raindrop-keeper',
  name: 'Raindrop Keeper',
  purpose: 'Let sadness be there and be held rather than fixed, feel a little less alone with it, and find one small kind thing for right now.',
  family: 'grief-comfort',
  tier: 'paid',
  tone: 'gentle',
  emotions: [
    'family:sadness', 'family:loneliness',
    'disappointment', 'hurt', 'heartache', 'heartbreak', 'grief', 'mourning', 'sorrow', 'longing',
    'homesickness', 'regret', 'rejection', 'exclusion', 'abandonment', 'tearful', 'bereft', 'wistful', 'nostalgia',
  ],
  intensity: { min: 0.2, max: 1 },
  contexts: ['loss', 'past', 'relationship', 'partner', 'family', 'friends', 'social', 'home', 'change'],
  durationSec: 180,
  mallows: ['blubi'],
  module: 'raindrop-keeper',
  moves: [
    { id: 'catch', prompt: 'Catch a falling raindrop and name what it holds.', kind: 'catch-drag' },
    { id: 'hold', prompt: 'Hold the drop in your hands until it warms.', kind: 'press-hold' },
    { id: 'shine', prompt: 'Set each drop on the water, where it becomes a lantern.', kind: 'drag-release' },
    { id: 'kindness', prompt: 'Choose one small kind thing for now.', kind: 'choice' },
  ],
  mechanic: 'Glass raindrops fall over the lagoon; you slide your cupped hands under one (or tap it) and name what it holds. Pressing and holding warms the drops from cool blue to soft gold while Blubi leans in. Dragged onto the water, each drop opens into a floating lily-lantern that brightens the lagoon a little.',
  animation: { lead: ['sad and teary (mirrors you, not cheerful)', 'leans in, tears slowing while you hold', 'comforted, still a little wet-eyed, as the lanterns light', 'soft comfort reaction with hearts at the end'] },
  world: { realm: 'raindrop-lagoon', transform: 'Heavy rain eases, the sky warms from blue-grey to pink-gold, and a small constellation of lily-lanterns glows on the water.' },
  sensory: { sound: 'Soft drop-in plinks, a warm hum while holding, chimes and blooms as lanterns open, a gentle clearing shimmer.', haptics: 'Soft taps on each catch, a slow heartbeat while holding, a soft success at the end.' },
  finale: 'The lanterns glow together on the lagoon, the rain softens and Blubi gives a soft, teary comfort squish with little hearts.',
  checkIn: 'How does it feel to be holding it now?',
  accessibility: 'A “Catch one for me” button (and arrow keys) instead of dragging the hands; a tap-to-start/pause toggle instead of holding; a “Float them out for me” button instead of dragging drops; every choice is a regular button.',
  safety: 'Nothing here asks you to get over anything or send any message. If the sadness feels like too much, or you are thinking about harming yourself, please reach out — the support button is always available.',
  rationale: 'Draws on widely shared ideas: naming a feeling, letting it be present without forcing it away, a sense of company, and small acts of self-kindness. It does not promise the sadness will lift.',
};
