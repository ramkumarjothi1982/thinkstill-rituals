// Open one ritual or trick directly (Library, Saved, the test stepper).
import { getEmotion, emotionsByFamily } from '../data/emotions.js';
import { playTrickById } from './trick-launch.js';

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
