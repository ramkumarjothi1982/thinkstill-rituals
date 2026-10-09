# v2 POP fix round 1: progress
- calls ~19: read 72 fully, 71 timers/actor/finale/sound/face vars, 70 words, f8 probe text checks, arrows idle rule.
- plan: (71) faceVars fs>=15, actor halt(), finale cfg.actors halt at settle + rAF re-freeze after handoff,
  sound node registry + eosPilotSoundHush(tag) (settle hushes all; T0 hushes beds), handler-time beat anchoring (clamp lag<=50ms).
  (72) phrase-aware chunker, N>=min(6,uploads), 3 waves (words -> echoes (smaller, chain-by-contact) -> breath cluster),
  play-cue timer group cleared at T0, juicier press/burst (squash 1.3, hit-stop, 24 droplets), surprise beat staging,
  climax camera push-in + visible droplet stream + big pearl + puff squash + sputter, preload gate (300 ms cap),
  marker data-eos-idle=2200 + per-bubble key, decode-swap imgs on upload removal.
