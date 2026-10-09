# v2-game-crush progress (CRUSH id 2, "The Press", addendum §CRUSH)

- [x] Read addendum §Shared + §CRUSH, v2 POP build report, 71 APIs (finale S2' settle, stage, sound, gesture, box, S7 mirror, S8 breath, S10 face, S11 replay), draft 74 (old pattern: actors as blobs, word on tag, peeking blob, legacy finale).
- [ ] Rewrite 74 from scratch on v2 pattern (POP 72 is the reference): jelly blob hosts with EosPilotFace (pic+word inside), mirror variants x4, resistance + hit-stop + tempo by emotion, surprises (bouncer, gauge pop, cat), transform map (beacon/lamp/windows smog->stars), charged holdRelease big slam, Warm Core climax settle:true handoff 2250.
- [ ] Build /tmp/pilot_crush2, play 390 then 1280, probes f6/f8, finaleLog A4/A5, contact sheets
- [ ] Commit 74 + status/v2-game-crush.*; push

Notes:
- CLEANSE builder works in parallel (73 modified in tree). Avoid editing 71 unless essential.

## 2026-10-09 run log (call ~40)
- [x] 74 rewritten from scratch (S2' settle finale, EosPilotFace F8 hosts, S7 mirror x4, S8 breath, S9 shift, S11 plan). Builds; 0 page errors.
- r1/r2 (390 anger): fixed the arcade's global `.arena button` gradient painting the mouth button (needs !important reset).
- Arrows: the shared fallback (`.arena button:not(:disabled)`) showed "TAP IT" in trans/setup/climax/burst -> mouth gets aria-disabled when no marker; marker stripped synchronously at T0.
- r3 (390 panic): A4 climax 132 ms, settle 2103, handoff 2253; A5 clean (0 running, 0 flip, 0 step, 0 sound after handoff). Bouncer + gauge pop fired.
- d1 (1280 anger): full playthrough, A4/A5 clean; headless 1280 is frame-bound (anims start late; settle commits end states).
- Core now cradled at the hero's lower front (never over its F8 picture); cat curls at the hero's feet.
- TODO: f6/f8 probes, A2 4-emotion mirror dE, reduced run, pilot=off, final sheets, commit.
- (call ~57) f6 390+1280: 2 stages (CRUSH ×4, HOLD… SLAM!), 0 misses / 0 label mismatches / 0 aim misses. f8 390+1280 (+uploads 2/3/6): 0 violations after idle loops kept anisotropy <= 2%.
- A2 dE (390 wall band): anger-panic 53.7, anger-sad 45.5, anger-anxious 44.2, panic-sad 13.9, panic-anxious 24.0, sad-anxious 29.7.
- Reduced: handoff 901. Forced cat swat (localStorage eos_pilot_force_2=swat, dev only): no errors. ?pilot=off: original CRUSH to reveal, 0 errors.
- Incoming blobs now arrive less hot as progress rises (heat0). Next: final 390/1280 runs + sheets, report, commit.
- (call ~64) DONE: final runs fa (390) / d2 (1280) clean; sheets + build report written; committing 74 + status/v2-game-crush.*
