// The 1,000 V3 rituals as ritual specs the rest of the app understands
// (recommender, rounds, library, journey). Built from the generated catalogue;
// the heavy words (Mallow lines, mind bends) load only when one is played.

import { ENGINES, LAWS, SKILLS, INDEX } from './data/catalog.js';
import { BUILT } from './engines/index.js';

// evidence-skill group → ritual family (none of these are reframing; that stays Ultra-only)
const GROUP_FAMILY = {
  'Arousal downshift': 'regulation', 'Gentle paced breathing': 'breath', 'Tension release': 'regulation', 'Muscle relaxation': 'regulation',
  'Sensory grounding': 'grounding', 'Multisensory orientation': 'grounding', 'Selective attention': 'attention-shift',
  'Affect labelling': 'reflection', 'Mixed-affect labelling': 'reflection', 'Interoceptive noticing': 'sensory', 'Urge surfing': 'regulation',
  'Response pause': 'regulation', Defusion: 'acceptance', Decentring: 'acceptance', Acceptance: 'acceptance', 'Dialectical acceptance': 'acceptance',
  'Values-guided action': 'problem-solving', 'Control focus': 'problem-solving', 'Problem solving': 'problem-solving',
  'Behavioural activation': 'confidence', 'Worry postponement': 'regulation', 'Externalising concerns': 'release',
  'Brief expressive labelling': 'release', 'Self-compassion': 'self-compassion', 'Compassionate self-talk': 'self-compassion',
  'Gentle mindful movement': 'grounding', 'Single-task attention': 'attention-shift', 'Present orientation': 'grounding',
  'Auditory mindfulness': 'sensory', 'Tactile mindfulness': 'sensory', 'Mindful movement': 'grounding',
  'Emotional needs identification': 'reflection', 'Assertive communication': 'boundaries', 'Repair after misstep': 'relationship',
  'Support seeking': 'connection', 'Savouring / positive attention': 'attention-shift', 'Acceptance and self-kindness': 'rest',
};
const QUIET = new Set(['sadness', 'loneliness', 'hurt', 'fatigue', 'flatness', 'numbness', 'discouragement', 'regret', 'guilt', 'shame', 'helplessness', 'self-blame', 'low motivation']);
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

const base = { version: '3.0.0', review: { status: 'draft', by: 'Pending editorial review' } };

function toSpec(row) {
  const [code, name, ei, li, mallow, realm, primary, secondary, si, seconds, emotions] = row;
  const E = ENGINES[ei], L = LAWS[li], S = SKILLS[si];
  const num = Number(code.slice(3));
  return {
    ...base,
    id: code.toLowerCase(),
    code,
    name,
    purpose: S.insight,
    family: GROUP_FAMILY[S.group] || 'regulation',
    tier: 'paid',
    emotions,
    intensity: { min: 0, max: 1 },
    contexts: [],
    durationSec: seconds,
    mallows: [mallow],
    module: 'v3',
    tone: QUIET.has(primary) ? 'gentle' : 'playful',
    moves: [
      { id: 'engine', prompt: E.motion, kind: E.primitive },
      { id: 'law', prompt: L.rule, kind: 'world-law' },
      { id: 'finale', prompt: cap(L.finale), kind: 'finale' },
    ],
    mechanic: `${E.physics} World law: ${L.rule}.`,
    animation: { lead: ['mirrors the feeling', 'reacts at each real checkpoint', 'settles at the finale'] },
    world: { realm, transform: cap(L.payoff) },
    sensory: { sound: 'Soft musical touches that follow your fingers; a gentle finale.', haptics: 'Light ticks as things move, a soft settle at the end.' },
    finale: `${cap(E.win)}; then ${L.finale}.`,
    checkIn: 'How does it feel now?',
    accessibility: 'Every move has a “Tap instead” button; no timing pressure; your words can be read in full at any time.',
    safety: `${S.precaution} This is a calming activity, not treatment; support is one tap away.`,
    rationale: `${S.insight} (${S.scope})`,
    params: { v3: { code, num, engine: ei, law: L.n, skill: si, primary, secondary } },
    __load: () => import('./host.js'),
  };
}

/** Spec for any catalogue code (even if its engine isn't listed as built — dev lab only). */
export function specFor(code) { const row = INDEX.find((r) => r[0] === String(code).toUpperCase()); return row ? toSpec(row) : null; }
/** The ritual code that pairs an engine id with a world law number. */
export function codeFor(engineId, lawN) { const row = INDEX.find((r) => ENGINES[r[2]].id === engineId && LAWS[r[3]].n === Number(lawN)); return row ? row[0] : null; }

/** Every V3 ritual whose touch engine is built, in catalogue order (HM-0001 → HM-1000). */
export const V3_RITUALS = INDEX.filter((r) => BUILT.has(ENGINES[r[2]].id)).map(toSpec);
export const V3_TOTAL = INDEX.length;
