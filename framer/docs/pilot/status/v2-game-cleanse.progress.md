# v2 game CLEANSE (id 109) progress — builder notes (resume from here)

## State (call ~5)
- Read addendum §Shared + §CLEANSE. POP builder already landed S2'/S7-S11 in 71/70 (uncommitted in worktree, owned by POP agent).
- Plan: rewrite 73 using 71 shared APIs; do not edit 71 unless a name is missing.

## State (call ~27)
- Read all needed 71 APIs (S2' settle cfg.settle:true, S7 eosPilotMirror, S8 useEosPilotBreath, S9 stage.shift, S10 eosPilotFacePics/EosPilotFace/eosPilotFaceHost, S11 eosPilotRunSeed/eosPilotPickRun, noise/swell cue layers). No 71 edits needed.
- Design: orbs = F8 face hosts (button.mpOrb.tsFaceObject.tsNoBubbleFace, slot pinned j / hero n), wrappers mpLift(WAAPI input) > mpBob(CSS weather) > mpBreath(breath.loop); own sky (moon phase, constellation per word, mirrored reflections), water weather per mirror key, koi@34%, frog 50%, rare shooting star, lotus+STILL; climax beats climax/river/bloom/flare/meeting/touch/mirror within 2200, settle mode.
- Writing 73 from scratch now (Write whole file; 73 is CLEANSE-owned). Test script planned at scratchpad/cl/play.mjs, build dir /tmp/pilot_cl2.

## State (call ~49)
- 73 rewritten from scratch; plays end to end at 390 (panic) and 1280 (anger), 0 page errors. Test: scratchpad/cl/play.mjs <W> <H> <out> [text]; build dir /tmp/pilot_cl2.
- A4: climax 220/416 ms (load), hand 2354/2355, every beat <= settle. A5 at 1280: 0 running anims under mega, 0 flip, 0 step after T0 (final report kept inside the wrapper's reward bucket), 0 pilot sound after hand-off.
- Fixed: relief prefetch, lotus bigger + scale 1.3 on bloom, desktop band widened, moon path restyled, climax picture swap deferred one frame.
- NEXT: 390 sad run (verify composition), reduced run, f8/f6 probes, ?pilot=off, commit + report.
- call ~78: ink restyled (no dark mask), hero face turns positive at its full in-breath; deliverable sheets in status/v2-game-cleanse.*.jpg; NEXT final 1280 run, commit, report.
- DONE (call ~84): report written (v2-game-cleanse.build.md); committing 73 + status/v2-game-cleanse.*
