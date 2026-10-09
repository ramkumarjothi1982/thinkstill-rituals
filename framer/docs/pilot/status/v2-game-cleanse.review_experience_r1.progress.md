# v2 CLEANSE review (EXPERIENCE lens) round 1 — reviewer progress (no file edits)
## State (call ~16), 3 images used
- Build /tmp/pilot_rev_cleanse_experience OK. Script scratchpad/rxc/rx.mjs W H tag "text" [--replay]; frames /tmp/rx_cl/<tag>/, sheets /tmp/rx_cl/sh_*.png
- panic390 x2 (replay) done: 0 errors, release 35 s, climax 45/51 ms, hand 2429/2354, steps after T0 0, layout arc->scatter, moon full->crescent, greet spin->forehead.
- Findings: word chunks ignore commas ("my heart is","racing I can't","tomorrow everything is"); panic mirror reads calm (no visible racing cloud/tremble in stills, moon fully visible);
  wrapper step burst sprays face-sprite particles over orbs during every exhale + CHAIN xN HUD + toasts (hypnotic breaker);
  hold = arrow ring + HOLD label, orb deformation not perceptible at 390; cleared orbs stay in place, hard to tell from uncleared;
  transform: water/sky barely change 0->83%, main change = constellations + faces; climax small (tiny star dots, lotus bloom, hero onto lotus) and hero text overlaps 'racing I can't' at t0+2100, hero words remain in the climax core; burst frame at +3200 not visible yet (screencast lag?) -> need real-time burst check vs pilot=off.
- first-touch visual probe 142/137 ms (> 100) -> added longtask observer.
- NEXT: anger390, sad390, burst compare (on/off), 1280.
## State (call ~36), 7 images used
- anger390/sad390 done (rx.mjs): anger mirror strong (red sky/water -> calm blue by 67%), sad grey fog -> crescent; words truncated+fragmented ("me in front…","I miss my…" drops 'grandma', hero "sad I cry").
- Empty rings in screencast frames NOT reproduced in real-time screenshots (pix.mjs + pixan.py: all pictures painted, sat>100) -> screencast artifact, not a finding.
- Burst: timeline of .tsRewardSurge.mega parts identical pilot vs ?pilot=off (burst2.mjs); z 2147483500 over arena z2; 0 running pilot anims. OK.
- STEP SURGE: after EVERY release the wrapper mounts .tsRewardSurge.step with surgeBackdrop(dark)+suction+bloom+chromatic+nova+tunnel+rays, 3.2-4.6 s each (dim.mjs) -> scene dims/darkens during each exhale; triggered by BOTH the pilot's exhale cue {arcade:"pop"} -> wrappedSfx->triggerStepReward (00_arcade 20129) AND progress buckets (20121). Builder said 'progress only'.
- 1280 panic (ran in parallel w/ probe): climax 556 ms (>300), longtask 2467 ms, a1900 frame shows empty orbs (screencast at ~1.7 fps unreliable).
- NEXT: pix.mjs 1280 sad alone (real-time climax composition + longtasks), then score + StructuredOutput.
## State (call ~48), 11 images used — DONE, verdict fix
- lt.mjs: pilot longtasks 35 >100 ms (top 326) vs ?pilot=off 309 >100 ms (top 827) -> no perf regression vs baseline; 52-71 ms tasks within 300 ms of each pointerdown; ftv 137-363 ms (headless).
- Exhale: target label "BREATHE OUT…" but data-eos-idle=10000 > exhale; visible arrow text 700 ms after let-go still "HOLD · BREATHE IN".
- 1280 sad real-time (pix_sad1280): released orb empty ring at +1000 ms (pixel sd 7-10) -> plausible F8 transient; climax composition small.
- BEFORE 109.png viewed: big improvement in world; step surge particles existed before too.
- Scores A7 B8 C5 D5 E6 F8 G7 H7 I6 J5. Majors: step surge every exhale (pilot's own arcade "pop" also triggers it), word mangling, climax not WOW at 390, interaction juice, characters/surprise legibility, panic mirror/transform weak.
