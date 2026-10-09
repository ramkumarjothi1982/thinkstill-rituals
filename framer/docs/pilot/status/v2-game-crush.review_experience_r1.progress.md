# v2 CRUSH review (EXPERIENCE lens) round 1 — reviewer progress (no source edits)
## State (call ~17), 4 images used
- Build /tmp/pilot_rev_crush_experience OK. Script scratchpad/rvc/play.mjs W H OUTDIR "text" [--clock] [--gap=] [--replay]; frames /tmp/rvc/<tag>/, sheets /tmp/rvc/sh_*.png
- panic390 (+replay plan differs: bounceR/perch/crack/pose) and anger390 (--clock overlay) done: 0 errors, climax 85/48 ms, hand 2255/2253, 0 anims over mega.
- Findings: words fragmented ignoring commas ("breathe panic","about the","at me in"); release 17.5-21.6 s (<30 s);
  wrapper step surge (~0.9 s face-sprite spray) at each word end covers next blob (w1_start panic, w5_start anger);
  anger mirror strong (orange furnace, angry red blob); panic mirror = calm-looking blue workshop; colour-as-meter red->tan->green readable;
  bouncer visible (anger w3_start); "HAH!" gallery bubble; gallery/cat tiny (~30 px circles, no bodies); climax compact (cube ~50 px), rays OK, not WOW;
  screencast gap U+45 -> U+440 across impact (check rAF/longtask); top-right orb stays red/angry through anger run (identify owner);
  hint "Tap the blob: 4 slams each" persists during HOLD stage + climax.
- NEXT: perf/orb probe, sad390, 1280, BEFORE sheet 2.png, score.
## State (call ~28), 7 images used
- sad390 (clock) + anger1280 (clock) done. sad: drip/grey mirror subtle, vortex F8 pic, gauge pop in r1, bouncer r1, "let it rain" bubble, step surge sprays faces over "I feel sad" blob (w3_start).
- 1280: lots of empty orange wall, gallery = 35 px circles (crFanAct), climax cube small in a big frame; climax start 397/271/359 ms at 1280 (headless, 417-450 ms frames around T0; 390 = 48-128 ms).
- Red/blue face orbs at arena edges = wrapper characterEmotionUniverse emotionOrb (not pilot) - stays angry in anger run.
- NEXT: BEFORE sheet 2.png, maybe crop hero/gallery face check, score + StructuredOutput.
## State (call ~36), 9 images used — DONE, verdict fix
- BEFORE 2.png viewed: old CRUSH = two slabs + tiny bubble; new workshop is a big step up.
- 2x close-ups (close.mjs, sh_close.png): guide hand sits on the blob's F8 face each round; blob expression = F8 sticker only (nub arms); hero calm/positive; impact cube two amber halves; reveal orb negative face (wrapper).
- Words come from shared eosPilotWords (70_pilot_core.jsx:103) via eosPilotCrushWords (74:126). Hint text EOS_PILOT_HINTS[2] (70:17) stays during HOLD + climax.
- Scores A7 B8 C7 D6 E6 F8 G8 H7 I7 J6. Majors: climax not WOW at 390/1280, characters tiny/sticker-only, word fragments, step surge spray each word, release 17.5-21.9 s.
