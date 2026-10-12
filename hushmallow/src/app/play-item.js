// Open one ritual or trick directly (Library, Saved, the test stepper).
import { getEmotion, emotionsByFamily } from '../data/emotions.js';
import { playTrickById, allTricks } from './trick-launch.js';
import { RITUALS } from '../data/rituals.js';
import { AVAILABLE } from '../rituals/index.js';
import { allowedFor } from '../engine/recommend.js';

export function playRitual(app, r) {
  if (r.id === 'another-angle') { app.go('angle', { text: '' }); return; }
  // start with a feeling the ritual is made for, so the Mallow's face fits
  const ref = r.emotions.find((e) => !e.startsWith('family:') && getEmotion(e)) || r.emotions[0];
  const id = ref.startsWith('family:') ? emotionsByFamily(ref.slice(7))[0]?.id : ref;
  app.state.input = { text: '', emotions: id ? [{ id, confidence: 1, intensity: 0.6 }] : [], intensity: 0.6, contexts: [], desires: [] };
  app.state.ritual = r;
  app.go('ritual', { id: r.id });
}

export function playItem(app, { kind, id, ref }) {
  app.audio.ui('open');
  if (kind === 'trick') return playTrickById(app, id);
  return playRitual(app, ref);
}

/** Everything in this plan, in a fixed order: rituals first, then tricks (TS order). */
export async function planItems(app) {
  const rituals = RITUALS.filter((r) => allowedFor(r, app.ent.flags()) && AVAILABLE.has(r.module))
    .map((r) => ({ kind: 'ritual', id: r.id, ref: r }));
  let tricks = [];
  try { tricks = (await allTricks(app)).map((t) => ({ kind: 'trick', id: t.id, ref: t })); } catch { /* no plan */ }
  return [...rituals, ...tricks];
}
