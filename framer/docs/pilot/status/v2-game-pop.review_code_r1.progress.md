# v2 POP review (code lens) round 1 — progress (reviewer, no file edits)
- build: /tmp/pilot_rev_pop_code OK
- code read: 72 fully; 71 finale/sound/F8/timers; 70 afterglow
- code findings so far: (1) user words 13px at 390 (eosPilotFaceVars clamp 9..15, D=100) vs binding >=15px;
  (2) skip-tap path (tap >=800ms after T0): actor celebrate/react use the ACTOR's own timers (not rt.timers) so pose/blow
  steps fire after settle/handoff -> running anims during mega (to verify); (3) bed swells (pad 4.3s, beatPair 4.2s,
  rumble 2.2s) not cut at T0 -> quiet pilot sound tails under climax/burst; (4) report() calls onProgress(v) not max.
- next: run probes (f8 uploads/removal, f6 arrows, burst overlay vs pilot=off, skip path, reduced, perf, collisions)
- runs done (scratch script rv_pop.mjs in session scratchpad): main 390 touch, main 1280 mouse, off 390, matched paused frames.
  results: words 13px@390 (15@1280); progress 0,20,40,60,80,83,100 monotonic; settle 2013-2016, handoff 2163-2166,
  mega 2283-2351, megaEnd ~5179, reveal ~5245 (no overlap); 0 running arena anims + 0 pilot nodes above mega at +300/600/1200
  (stack identical to pilot=off: tsPx* layers); 0 sound rows after handoff; 0 errors.
  390 touch: inputT stale ~750ms (main-thread jank) -> climax/gather/blow beats all ran at 752-765 (bunched); climaxDt 882.
  1280: climaxDt 113, beats on schedule. 1280 probe at 2.2s: noPic=5 (re-check). arrows hidden 1.2-4s after a pop, back at 9s (shared 8s same-ask rule).
  peak running anims: 82 (390 play), 123 (1280 finale start); actor foot animates `left` (non-compositor).
- next: skip path, reduced, uploads 1/3/6 + remove, 1280 re-probe, collisions grep
- more runs: skip path (mouse 390): lift/pose run skipped at ~1130, settle 1133, handoff 1163, mega 1374 -> 4 actor WAAPI anims
  (hand.l/hand.r/body/foot.l float pose, currentTime 0, 'running') at mega +300/+600/+1200 (actor timers survive settle).
  reduced: handoff 905, 0 anims during mega. uploads: 1=AAAAA, 3=ABCAB, 6=ABCDE (6th upload never shown, N=5);
  remove mid-run -> defaults restored (tsFaceNeg) but noPic=5 at +600ms, 0 at +3.1s. 1280 probe re-run: 0 violations.
  sad run: golden=3 popped last -> golden never fired; previous pop's hum cue plays over the climax (hum@491..892).
  collisions: none (JS names, CSS classes). pilot=off plays to reveal.
- verdict: fix (13px words@390; skip-path settle; six-upload gap) — findings returned via StructuredOutput
