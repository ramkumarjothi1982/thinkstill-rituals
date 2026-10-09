# v2 game POP (id 1) progress — builder notes (resume from here)

## State (call ~23)
- Read: addendum §Shared + §POP, old 72 (kept: tether rig, droplets, reaction pool, chain ladder, miss), 71 S1/S2/S3/S4/S5 APIs.
- Plan (shared, 71/70 — POP builder lands these first, Edit/py-replace only, never Write the whole 71 file: other builders may edit it):
  - S2' settle mode (cfg.settle:true): handoffMs per game EOS_PILOT_HANDOFF {1:2150,109:2350,2:2250}, reduced 900;
    settleAt=hand-150: skip beat anims, data-eos-pilot-hold on arena (CSS pause + getAnimations pause), EOS_PILOT_SOUND.hold;
    handoff: data-eos-pilot-burst on .tsArcade (MO removes on reveal/unmount), onDone, onProgress(100), afterglow attr;
    __eos.pilot.finaleLog() {log,inputT,climaxT,settleT,handoffT,megaMountT}. Legacy mode unchanged for CLEANSE/CRUSH until rebuilt.
  - S7 EOS_PILOT_MIRROR + eosPilotMirror(emotion); S8 useEosPilotBreath (WAAPI loops, updatePlaybackRate = no jumps);
    S9 stage.shift(p, ms) + mirror tint layer .eosPilotL0m; S10 EosPilotFace + eosPilotFaceVars + eosPilotFacePics; S11 eosPilotRunSeed.
  - Actor prop faceIds (sky: SYNC calm 90 sleeping moon -> 61 awake).
  - 70: over-burst CSS (.eosMoodFlip hidden while data-eos-pilot-burst).
- Then rewrite 72 from scratch (Write is fine: POP owns it).

## State (call ~30)
- DONE (uncommitted): 71 patched (S2' settle mode, S7 EOS_PILOT_MIRROR/eosPilotMirror/eosPilotMirrorStyle, S8 useEosPilotBreath,
  S9 stage.shift + mirror prop/.eosPilotL0m, S10 EosPilotFace/eosPilotFaceVars/eosPilotFacePics/eosPilotFaceHost, S11 eosPilotRunSeed/
  eosPilotPickRun, S4 noise/swell layers + hold cut, actor faceIds, CSS v2 hold). 70: EOS_PILOT_HANDOFF, over-burst CSS, v0.3.0.
  Patch script: scratchpad/pop/patch71.py (NOT idempotent: do not re-run).
- NEXT: write 72 from scratch, build /tmp/pilot_pop2, test 390 then 1280.

## State (call ~52)
- 72 v2 written; builds; full playthrough OK at 390 and 1280 (reveal reached, 0 errors). A5 at 1280: 0 running anims under mega,
  0 mood-flip, burst attr on. A4: settle 2013, handoff 2164, mega 2309. Finding: headless 1280 frames are seconds long, so a pending
  burst anim could freeze half-done -> eosPilotFreeze now finish()es finite anims, pauses infinite ones. stepAfterT0=1 under study (stepLog).
- Test script: scratchpad/pop/pop_test.mjs (W H text tag full|mirror [reduced] [query]); shots /tmp/pop2shots.

## State (call ~68)
- Verified: A1 F8 probe 0 violations 390+1280 (fixed: React 18 needs `class` on ts-face custom elements), uploads 1/2/3 ok;
  A2 mirror dE >= 13.4 pairwise (panic gradient now lilac->cyan); A3 dE 28-71; A4 settle ~2013 / handoff ~2164 / mega ~2300;
  A5 0 running anims, 0 mood-flip, burst attr on, step burst after T0 fixed by bucket-safe last progress (lastPct);
  A6 finishGame arrows 0 misses 390+1280; A8 ?pilot=off plays to reveal; CLEANSE 109 + CRUSH 2 still play to reveal, 0 errors.
- NEXT: commit, final full runs for sheets, write v2-game-pop.build.md, push.
