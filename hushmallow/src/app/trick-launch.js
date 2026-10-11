// Start a quick trick from anywhere (Meet a Mallow, the finish screen, the
// Ultra door). The plan decides which tricks exist; the deck decides which
// one fits and keeps them from repeating.
import { loadTricks, createTrickDeck, trickRitual } from '../engine/tricks.js';
import { EntitlementError } from './entitlements.js';
import { toast } from './ui.js';

let deck = null, deckTier = null;

async function getDeck(app) {
  const tier = app.ent.tier();
  if (!deck || deckTier !== tier) {
    deck = createTrickDeck({ store: app.store, tricks: await loadTricks(app.ent) });
    deckTier = tier;
  }
  return deck;
}

/** Number of tricks in this person's plan (0 without a plan). */
export async function trickCount(app) {
  try { return (await getDeck(app)).size; } catch { return 0; }
}

/**
 * opts: { tier: 'paid'|'ultra'|null, emotions, intensity, mallow, exclude, replace }
 * Resolves false if nothing fits (the caller keeps the person where they are).
 */
export async function playTrick(app, opts = {}) {
  let d;
  try { d = await getDeck(app); } catch (e) {
    if (e instanceof EntitlementError) { app.go('plans', { reason: 'start' }); return false; }
    throw e;
  }
  const input = app.state.input || { emotions: [], intensity: 0.6 };
  const t = d.pick({ emotions: opts.emotions ?? input.emotions, intensity: opts.intensity ?? input.intensity, tier: opts.tier ?? null, mallow: opts.mallow ?? null, exclude: opts.exclude ?? [] })
    || d.pick({ emotions: [], tier: opts.tier ?? null, exclude: opts.exclude ?? [] });
  if (!t) { toast('No trick fits that just now.'); return false; }
  app.state.input = { text: '', contexts: [], desires: [], ...input };
  app.state.ritual = trickRitual(t);
  app.go('ritual', { id: t.id }, { replace: !!opts.replace });
  return true;
}
