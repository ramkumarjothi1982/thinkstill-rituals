// Open one ritual directly (Library, Saved, the test panel).
import { getEmotion, emotionsByFamily } from '../data/emotions.js';
import { RITUALS } from '../data/rituals.js';
import { AVAILABLE } from '../rituals/index.js';
import { allowedFor } from '../engine/recommend.js';

export function playRitual(app, r, input = null) {
  if (r.id === 'another-angle') { app.go('angle', { text: input?.text || '' }); return; }
  // start with a feeling the ritual is made for, so the Mallow's face fits
  const ref = r.emotions.find((e) => !e.startsWith('family:') && getEmotion(e)) || r.emotions[0];
  const id = ref.startsWith('family:') ? emotionsByFamily(ref.slice(7))[0]?.id : ref;
  app.state.input = input?.emotions?.length ? { ...app.state.input, ...input }
    : { ...(app.state.input || {}), text: input?.text ?? app.state.input?.text ?? '', emotions: id ? [{ id, confidence: 1, intensity: 0.6 }] : [], intensity: 0.6, contexts: [], desires: [] };
  app.state.ritual = r;
  app.go('ritual', { id: r.id });
}

export function playItem(app, { ref }, input = null) {
  app.audio.ui('open');
  return playRitual(app, ref, input);
}

/** Every ritual in this plan, in a fixed order. */
export async function planItems(app) {
  return RITUALS.filter((r) => allowedFor(r, app.ent.flags()) && AVAILABLE.has(r.module))
    .map((r) => ({ kind: 'ritual', id: r.id, ref: r }));
}
