// Authored ritual library (content, not code). Every entry runs on an
// interaction module in src/rituals/ or src/ultra/. Only rituals whose module
// exists are ever offered (see src/rituals/index.js), so nothing here is a
// placeholder. New rituals = new entries (and, for genuinely new
// interactions, a new module) — no app rewrite needed.
//
// review.status is "draft" until a human editor signs off; the recommender
// can be told to require "approved" for production builds.

import { LIBRARY } from './library/index.js';
import { V3_RITUALS } from '../v3/rituals.js';

const base = { version: '1.0.0', review: { status: 'draft', by: 'Pending editorial review' } };

const CORE = [
  {
    ...base,
    id: 'static-to-signal',
    name: 'Static to Signal',
    purpose: 'Let angry energy out safely, cool your body down, then find what you actually need and one next move.',
    family: 'regulation',
    tier: 'paid',
    emotions: ['family:anger', 'resentment', 'indignation', 'impatience', 'irritation', 'outrage', 'bitterness', 'frustration', 'fury', 'rage', 'annoyance'],
    intensity: { min: 0.3, max: 1 },
    contexts: ['work', 'conflict', 'family', 'friends', 'school', 'partner'],
    durationSec: 150,
    mallows: ['glitzi'],
    module: 'static-to-signal',
    tone: 'energetic',
    moves: [
      { id: 'crackle', prompt: 'Scribble the static out.', kind: 'scribble' },
      { id: 'ground', prompt: 'Hold the stone through three slow breaths.', kind: 'hold-breath' },
      { id: 'flick', prompt: 'Flick away what isn’t yours to fix.', kind: 'flick-sort' },
      { id: 'need', prompt: 'Name the need under the static.', kind: 'constellation' },
      { id: 'next', prompt: 'Choose one next move.', kind: 'choice' },
    ],
    mechanic: 'Your words become static you can zap; holding the ground stone drains it with a longer out-breath; flicked fragments become stars; chosen needs form a constellation.',
    animation: { lead: ['angry→furious (mirrors the charge)', 'cooling to calm while grounding', 'nods at each need', 'mischievous celebration'] },
    world: { realm: 'static-storm', transform: 'Lightning settles, corrupted constellations snap into order and the horizon clears.' },
    sensory: { sound: 'Crackles that rise with the charge, a warm ground thrum, star chimes, a clearing shimmer.', haptics: 'Ticks while scribbling, heartbeat at each breath, a soft success.' },
    finale: 'The storm clears into a clean sky; Glitzi celebrates with pixel hearts and a sarcastic compliment.',
    checkIn: 'How’s the static now?',
    accessibility: 'Hold a button to charge instead of scribbling; tap to start/pause grounding instead of holding; every flick and need is a regular button.',
    safety: 'If anger is about someone hurting you or others, your safety comes first — the support button is always available. This ritual doesn’t ask you to send any message.',
    rationale: 'Draws on common, widely taught approaches: safe expression, slower out-breaths to lower arousal, separating what you can and can’t control, and naming the need underneath anger. It doesn’t promise the anger will vanish.',
  },
  {
    ...base,
    id: 'another-angle',
    name: 'Another Angle',
    purpose: 'Separate what happened from what your brain added, weigh the evidence, try other plausible explanations and pick a next step.',
    family: 'reframing',
    tier: 'ultra',
    emotions: ['family:shame', 'family:fear', 'family:loneliness', 'family:anger', 'family:sadness', 'family:envy', 'family:confusion', 'inadequate', 'judged', 'rejection', 'insecurity', 'embarrassment', 'worry'],
    intensity: { min: 0.15, max: 0.9 },
    contexts: ['work', 'school', 'friends', 'partner', 'family', 'social', 'self-image', 'future', 'conflict'],
    durationSec: 240,
    mallows: ['zuzu'],
    module: 'another-angle',
    tone: 'playful',
    moves: [
      { id: 'tell', prompt: 'What happened, and what did your brain decide it means?', kind: 'text' },
      { id: 'separate', prompt: 'Pull what happened apart from what your brain added.', kind: 'drag-sort' },
      { id: 'xray', prompt: 'X-ray the thought for hidden assumptions.', kind: 'scan' },
      { id: 'orbit', prompt: 'Put evidence into orbit: fits, doesn’t fit, missing.', kind: 'drag-sort' },
      { id: 'portal', prompt: 'Turn the perspective portal through other plausible angles.', kind: 'rotate' },
      { id: 'next', prompt: 'Pick a useful next move.', kind: 'choice' },
    ],
    mechanic: 'The thought becomes a crystal you physically split into two portals; an X-ray lens finds assumption hotspots; evidence cards orbit three rings; a rotating portal reveals other plausible angles you rate.',
    animation: { lead: ['curious', 'awe as the portal opens', 'thinking/confused with wobbling spirals', 'clarity: spirals slow and brighten'] },
    world: { realm: 'spiral-observatory', transform: 'The warped spiral resolves into a clear galaxy and the dome opens.' },
    sensory: { sound: 'Portal hum, a two-tone split, lens focus, rotate ticks, a blooming chime.', haptics: 'A snap when the thought splits, ticks while rotating, soft success.' },
    finale: 'Your new angle is assembled as a star map you can keep (on this device) or let go.',
    checkIn: 'Does it look any different from here?',
    accessibility: 'Every drag has a button alternative; the portal can be turned with arrow buttons; all text is screen-reader labelled.',
    safety: 'Never used to reframe abuse, threats, harassment or danger. If something harmful is happening, the ritual stops and points to support instead.',
    rationale: 'Built on the widely used idea that distress often comes from the meaning we attach to events; it separates observation from interpretation and explores alternatives without insisting on a positive one.',
    params: { frameworks: 'src/ultra/frameworks.js' },
  },
];

// The 1,000 Hushmallow rituals first (HM-0001 → HM-1000), then the ten
// signature rituals, then Another Angle (Ultra).
export const RITUALS = [...V3_RITUALS, CORE[0], ...LIBRARY, ...CORE.slice(1)];
export const SIGNATURE = [CORE[0], ...LIBRARY, ...CORE.slice(1)];
