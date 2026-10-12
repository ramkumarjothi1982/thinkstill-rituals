// Ritual spec: field documentation + validation. A ritual is one guided experience
// in the Hushfold, run by an interaction module and led by one or more Mallows.

import { getEmotion, getFamily } from './emotions.js';

export const MALLOW_IDS = ['glitzi', 'blubi', 'zuzu', 'boppo', 'pipzi', 'loomi', 'noomi'];

export const RITUAL_FAMILIES = [
  'release', 'regulation', 'reframing', 'grounding', 'sensory', 'breath', 'self-compassion',
  'reflection', 'humour', 'acceptance', 'creative', 'problem-solving', 'relationship',
  'grief-comfort', 'confidence', 'celebration', 'attention-shift', 'rest', 'boundaries', 'connection',
];

export const CONTEXT_IDS = [
  'work', 'school', 'relationship', 'partner', 'family', 'friends', 'money', 'health', 'body',
  'sleep', 'future', 'past', 'loss', 'self-image', 'social', 'conflict', 'change', 'creativity', 'home',
];

export const TONES = ['gentle', 'playful', 'energetic', 'quiet'];
export const REVIEW_STATUSES = ['draft', 'reviewed', 'approved'];

export const RITUAL_FIELDS = {
  id: { type: 'string', required: true, doc: 'Unique kebab-case id, e.g. "ts-001" or "steam-valve".' },
  name: { type: 'string', required: true, doc: 'Display name.' },
  purpose: { type: 'string', required: true, doc: 'One plain sentence: what it is for.' },
  family: { type: 'string', required: true, doc: `Ritual family, one of RITUAL_FAMILIES.` },
  emotions: { type: 'string[]', required: true, doc: 'Emotion ids, or family ids prefixed "family:" (e.g. "family:anger").' },
  intensity: { type: '{min,max}', required: true, doc: 'Range of overall intensity (0..1) it suits.' },
  contexts: { type: 'string[]', required: true, doc: 'Context ids (CONTEXT_IDS); may be empty.' },
  durationSec: { type: 'number', required: true, doc: 'Typical length in seconds.' },
  mallows: { type: 'string[]', required: true, doc: 'Mallow ids; the first one leads.' },
  module: { type: 'string', required: true, doc: 'Id of the interaction module that runs it.' },
  moves: { type: '{id,prompt,kind}[]', required: true, doc: 'Ordered moves the person makes.' },
  mechanic: { type: 'string', required: true, doc: 'Short description of how it works.' },
  animation: { type: 'object', required: true, doc: 'Free object, e.g. {lead: [state names...]}.' },
  world: { type: '{realm,transform}', required: true, doc: 'Where in the Hushfold it happens and what changes there.' },
  sensory: { type: '{sound,haptics}', required: true, doc: 'Sound and haptic notes (strings).' },
  finale: { type: 'string', required: true, doc: 'What happens at the end.' },
  checkIn: { type: 'string', required: true, doc: 'Check-in prompt shown afterwards.' },
  accessibility: { type: 'string', required: true, doc: 'The alternative way to complete it.' },
  safety: { type: 'string', required: true, doc: 'Safety note.' },
  review: { type: '{status,by?,date?}', required: true, doc: 'Review state: draft, reviewed or approved.' },
  version: { type: 'string', required: true, doc: 'Semver, e.g. "1.0.0".' },
  rationale: { type: 'string', required: false, doc: 'Evidence-informed basis, plain and honest; no invented citations.' },
  tone: { type: 'string', required: false, doc: 'gentle | playful | energetic | quiet' },
  params: { type: 'object', required: false, doc: 'Passed through to the module.' },
  tier: { type: 'string', required: false, doc: 'Subscription tier needed: "paid" (default) or "ultra". Reframing is Ultra-only.' },
};

export const TIERS = ['paid', 'ultra'];

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

const isStr = (v) => typeof v === 'string' && v.trim().length > 0;
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isNum01 = (v) => typeof v === 'number' && v >= 0 && v <= 1;

/** Is this an emotion id or a "family:<id>" reference that exists? */
export function isValidEmotionRef(ref) {
  if (typeof ref !== 'string') return false;
  if (ref.startsWith('family:')) return Boolean(getFamily(ref.slice(7)));
  return Boolean(getEmotion(ref));
}

/** Returns an array of human-readable error strings (empty when valid). */
export function validateRitual(r) {
  const errors = [];
  if (!isObj(r)) return ['ritual must be an object'];
  const need = (field, ok, msg) => { if (!ok) errors.push(`${field}: ${msg}`); };

  need('id', isStr(r.id) && KEBAB.test(r.id), 'must be a kebab-case string');
  for (const f of ['name', 'purpose', 'module', 'mechanic', 'finale', 'checkIn', 'accessibility', 'safety']) {
    need(f, isStr(r[f]), 'must be a non-empty string');
  }
  need('family', RITUAL_FAMILIES.includes(r.family), `must be one of ${RITUAL_FAMILIES.join(', ')}`);

  if (!Array.isArray(r.emotions) || r.emotions.length === 0) errors.push('emotions: must be a non-empty array');
  else for (const e of r.emotions) if (!isValidEmotionRef(e)) errors.push(`emotions: unknown emotion "${e}"`);

  if (!isObj(r.intensity) || !isNum01(r.intensity.min) || !isNum01(r.intensity.max)) errors.push('intensity: needs {min, max} between 0 and 1');
  else if (r.intensity.min > r.intensity.max) errors.push('intensity: min must not exceed max');

  if (!Array.isArray(r.contexts)) errors.push('contexts: must be an array (may be empty)');
  else for (const c of r.contexts) if (!CONTEXT_IDS.includes(c)) errors.push(`contexts: unknown context "${c}"`);

  need('durationSec', typeof r.durationSec === 'number' && r.durationSec > 0 && Number.isFinite(r.durationSec), 'must be a positive number');

  if (!Array.isArray(r.mallows) || r.mallows.length === 0) errors.push('mallows: must be a non-empty array (first is lead)');
  else for (const m of r.mallows) if (!MALLOW_IDS.includes(m)) errors.push(`mallows: unknown Mallow "${m}"`);

  if (!Array.isArray(r.moves) || r.moves.length === 0) errors.push('moves: must be a non-empty array');
  else {
    const seen = new Set();
    r.moves.forEach((m, i) => {
      if (!isObj(m) || !isStr(m.id) || !isStr(m.prompt) || !isStr(m.kind)) errors.push(`moves[${i}]: needs id, prompt and kind strings`);
      else if (seen.has(m.id)) errors.push(`moves[${i}]: duplicate move id "${m.id}"`);
      else seen.add(m.id);
    });
  }

  need('animation', isObj(r.animation), 'must be an object');
  need('world', isObj(r.world) && isStr(r.world.realm) && isStr(r.world.transform), 'needs {realm, transform} strings');
  need('sensory', isObj(r.sensory) && typeof r.sensory.sound === 'string' && typeof r.sensory.haptics === 'string', 'needs {sound, haptics} strings');
  need('review', isObj(r.review) && REVIEW_STATUSES.includes(r.review.status), 'needs {status: draft|reviewed|approved}');
  need('version', typeof r.version === 'string' && SEMVER.test(r.version), 'must be semver like 1.0.0');

  if (r.rationale !== undefined) need('rationale', typeof r.rationale === 'string', 'must be a string when present');
  if (r.tone !== undefined) need('tone', TONES.includes(r.tone), `must be one of ${TONES.join(', ')}`);
  if (r.params !== undefined) need('params', isObj(r.params), 'must be an object when present');
  if (r.tier !== undefined) need('tier', TIERS.includes(r.tier), 'must be "paid" or "ultra"');
  if (r.family === 'reframing') need('tier', r.tier === 'ultra', 'reframing rituals are Hushmallow Ultra only');
  return errors;
}

/** Validate a whole library, including id uniqueness. */
export function validateLibrary(rituals) {
  const problems = [];
  const seen = new Set();
  for (const r of rituals) {
    const errs = validateRitual(r);
    if (r && seen.has(r.id)) errs.push(`id: duplicate "${r.id}"`);
    if (r) seen.add(r.id);
    if (errs.length) problems.push({ id: r?.id ?? null, errors: errs });
  }
  return { valid: problems.length === 0, problems };
}
