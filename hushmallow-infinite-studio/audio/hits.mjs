// Hit sync (WP-04 R3): every graded cue's hit lands on its cue, as the project's
// G-AUDIO gate hears it.
//
// A cue's hit is the loudest transient heard in the band phones play, in the
// window just after the cue (qa/gates/audio.py: 600 Hz high-pass, 2 ms envelope,
// the largest peak within [cue − 60 ms, cue + 120 ms], timed at its 20 % rise).
// v2's cues hit on time: the studio's eye-pop, splat or celesta carries each hit
// and the Mallow's voice unfolds after it. Other kits' voices are shaped
// differently, and in two ways the hit can land late:
//   - a kit gesture whose later note is louder than its first, within the window:
//     Glitzi's surprise (a stutter 130 ms in), Pipzi's or Glitzi's closing phrase
//     (the second and third notes rise into the band);
//   - a figure's answer heard louder than its accent once the mix sums around it.
// The score cannot know this before it hears it (the engine's voices are
// kit-specific, its master chain compresses), so scoreToWav renders, hears the
// hits with the gate's own detector (audio/hits.py), and corrects what is late
// with one of three musical moves, then renders again (at most HIT_ROUNDS times):
//   advance  sync the kit gesture by its loud note: the gesture starts earlier so
//            that note lands on its own cue, its first notes leading in (a sound
//            editor lines up the transient, not the start of the file);
//   soften   lower the studio answer note heard over its accent by the measured
//            excess + 1.5 dB, so the accent is the hit again;
//   clear    a clock tick heard as the hit (v2's clock keeps only 80 ms from a
//            transient cue, inside its 120 ms hit window) moves past the window.
// A late hit no move can reach (a studio note that is not an answer, or a gesture
// already advanced SYNC_MAX) is reported, never hidden: the check fails.
// Deterministic: the same inputs give the same renders, hits and moves.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { SYNC_MAX } from './score.mjs';
import { mkWorkTemp } from '../render/lib/paths.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const HIT_ROUNDS = 6;          // renders at most (the first plus five corrections)
export const SOFTEN_MARGIN = 1.5;     // dB the softened answer ends under its accent
export const SOFTEN_MAX = 12;         // dB an answer may be lowered in all
const REACH = 0.6;                    // s: a kit gesture is still sounding this long after it starts
const OWN = 0.3;                      // s: a gesture can make a cue late only if its own cue is at most this earlier
const AT = 0.012;                     // s: a studio event starting this close to the late onset is its source

/** The graded cues' hits in a WAV (audio/hits.py, the gate's detector). → [{ i, t, type, kind, toleranceMs, errorMs, riseDb, graded, pass, peakT, lateDb }] */
export function hearHits(wav, cues, duration) {
  const tmp = mkWorkTemp('hm-hits-');
  try {
    const inp = path.join(tmp, 'in.json'), out = path.join(tmp, 'out.json');
    fs.writeFileSync(inp, JSON.stringify({ wav: path.resolve(wav), duration, cues }));
    const p = spawnSync('python3', ['-I', path.join(HERE, 'hits.py'), inp, out], { encoding: 'utf8' });
    if (p.status !== 0) throw new Error(`hits: audio/hits.py failed (${p.status}): ${p.stderr.slice(-1500)}`);
    return JSON.parse(fs.readFileSync(out, 'utf8'));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

/**
 * The moves that bring late hits onto their cues, from a plan's report and its hits.
 * plan: the plan heard (its clock ticks). → { sync: { advance, soften, clearTicks } (the next input to buildScore), moves: [text], unresolved: [hit] }
 */
export function hitMoves({ report, plan = null, hits, sync = {} }) {
  const next = { advance: { ...(sync.advance || {}) }, soften: Object.fromEntries(Object.entries(sync.soften || {}).map(([k, v]) => [k, { ...v }])), clearTicks: { ...(sync.clearTicks || {}) } };
  const moves = [], unresolved = [];
  for (const h of hits) {
    if (!h.graded || h.pass) continue;
    if (h.errorMs < 0) { unresolved.push(h); continue; }        // early: nothing of the score's leads in that far
    const at = h.t + h.errorMs / 1000;
    // a studio note starting at the late onset: an answer of this cue's own figure is softened
    const st = report.studio.find((e) => Math.abs(e.t - at) <= AT);
    if (st) {
      const isAnswer = st.cue === h.i && st.k > 0 && st.t - h.t >= 0.03;
      const dB = +(st.softenDb + Math.max(0, h.lateDb) + SOFTEN_MARGIN).toFixed(2);
      if (isAnswer && dB <= SOFTEN_MAX) {
        next.soften[st.cue] = { ...(next.soften[st.cue] || {}), [st.k]: dB };
        moves.push(`${h.type}@${h.t}: its answer (${st.inst} ${st.f ? `${st.f.toFixed(1)} Hz ` : ''}at +${Math.round((st.t - h.t) * 1000)} ms) was heard ${h.lateDb} dB over the accent; softened ${dB} dB`);
      } else unresolved.push(h);
      continue;
    }
    // a clock tick there: the clock keeps out of this cue's hit window
    const tk = plan?.ticks?.find((k) => Math.abs(k.t - at) <= AT);
    if (tk && !next.clearTicks[h.i]) {
      next.clearTicks[h.i] = true;
      moves.push(`${h.type}@${h.t}: heard ${h.errorMs} ms late, the clock's tick at +${Math.round((tk.t - h.t) * 1000)} ms; the clock keeps out of this cue's hit window`);
      continue;
    }
    // a kit gesture still sounding there, of this cue or of one just before it: sync it by that note
    const v = report.kitVoices.filter((k) => k.t <= at + 0.005 && at - k.t <= REACH && k.cueT <= h.t + 1e-9 && h.t - k.cueT <= OWN).sort((a, b) => b.t - a.t)[0];
    const adv = v ? +(v.advance + (at - v.cueT)).toFixed(4) : null;
    if (v && adv > v.advance + 0.002 && adv <= SYNC_MAX) {
      next.advance[v.cue] = adv;
      moves.push(`${h.type}@${h.t}: heard ${h.errorMs} ms late, a note of the kit's ${v.name} (cue ${v.cue} at ${v.cueT} s); the gesture now starts ${Math.round(adv * 1000)} ms early so that note lands on its cue`);
    } else unresolved.push(h);
  }
  return { sync: next, moves, unresolved };
}
