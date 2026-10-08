# readability — progress carried over from earlier attempts (cut off by usage limits)
- Draft src/eos/10_eos_readability.jsx is ~70 KB and substantially complete.
- DONE: acceptance 4,5 (HUD/pill/menu/reveal/header checks), acceptance 6 (screenshot review 12 games both sizes + overflow).
- IN PROGRESS: acceptance 1,2 (8-state smallText for 6 games at both sizes), acceptance 3 (noShrink — previously attempted for ALL 110 games; now do a representative subset of <=10 games; the full sweep runs in Regression).
- TODO: acceptance 7 (perf <=2 ms, zero errors, full build), then write the report to docs/eos_status/readability.build.md and commit.

## Notes the earlier attempt left (it was cut off):
STATUS: IN PROGRESS (session 2, resumed from the draft). Not final — see the final report when this line is gone.

Session-2 changes so far (src/eos/10_eos_readability.jsx):
- aria-hidden visual copies of the user's words (.tsBubbleTextContainer name tags: CLEANSE, TUG OF WAR, ids >= 100)
  were skipped and stayed 8.5 px; the floor and scan() now treat aria-hidden text as decoration only when no
  target row names it (words + table rows such as DOOR A / B's "OR" are floored).
- name tags fit their words (max-content, break between words, no clip); words are written +0.25 px (rounding);
  held scales are compensated up to the word floor for words.
- CLEANSE hold pills: desktop tracking fits 14 px; phones get a two-line 12.5 px pill inside the stone column.
- LIVE GUIDE: tags become inline kickers + compact paddings, so the panel is as tall as before (155 -> 158 px at
  1280, 125 -> 132 px at 390 with the arrows module's disc simulated); phones drop the "How to play" tag.
- HUD band slimmer: desktop padding 2px, phone meter 22 px (matches the arcade's 22 px band).
- scan() is rotation-aware (UNHOOK's vertical "BIG HOOK" is no longer a false offender).
Test scripts: /tmp/eos_readability_work/{noshrink5,states3,acc45b,review13,perf4}.mjs
- (13:10) more session-2 fixes: word-fit (a word never breaks inside itself: canvas measureText vs its box,
  min 13 px rendered), max-width 100% + break-word for word rows (88% of an auto grid track broke "fee|l"),
  getAnimations() removed from the floor (5-6 ms per pass), passes scheduled by MessageChannel after the frame,
  phone: literalProgress counter beside the meter (HUD left:156px when present), MIND BEND hidden during play
  (<=560), DRAMA take chips, UNHOOK / CUT THE LOOP bubbles, FINGER TRAP slot + header nudge, TUG label,
  narrow-guide games (102/103/106/107) use the 15 px guide text, guide strut line-height 1.1, HUD min-height 0.
- acc45 1280 (final candidate): pills 14px/30px + tsRewardPillHit pop, progress text 14px, menu label 13px,
  HUD 36px inside viewport, zero errors. 390: THINKSTILL 15px, HUD + score bar in viewport, pills 13px/28px.
- final sweeps running: /tmp/eos_readability_work/ns8_{390,1280}.json (noshrink6: shrink, small, words,
  aria-hidden, midBreak, covered/textCovered, offscreen, clipped, floorOverflow vs /tmp/eos_base).

## Session 3 (resumed after usage reset)
- Draft unchanged from session 2 (committed in c97c040 + later). Builds OK (isolated + integrated scratch).
- Running: states3 (8 states) for 1,2,95,100,109,110,99 at both sizes -> /tmp/eos_readability_work/s10_*.json;
  noshrink6 subset 1,2,41,43,50,89,96,99,100,109 both sizes vs /tmp/eos_base -> ns10_*.json.
- Next: perf (perf5.mjs), acc45b re-confirm, fix offenders, full build, report + commit.
- (20:10) DONE acc 1+2 subset: states3 for POP, CRUSH, SHELF IT(95), ECHO(99), HOT POTATO, CLEANSE, RAIN OUT at 1280+390:
  smallText(12) empty in input/menu/play/hit/finish/reveal/reveal2, zero errors, HUD + score bar in viewport, words
  16.25/15.25 (ECHO 16/16; CLEANSE's 11 px copies are the hidden in-stone originals, visible name tags 16.25).
- DONE acc 3 subset: noshrink6 on 1,2,41,43,50,89,96,99,100,109 both sizes: zero shrink; SCRATCH words 23 px @1280;
  only harness artefacts (UNHOOK rotated label; CUT THE LOOP 0/3 counter clipped by the arcade's own overflow:hidden).
- Running (sequential, quiet): perf5 1,100,109 both sizes -> perf6_*.json; inv41.mjs (41,43,16,19,21 words) -> inv41.json.
- (20:25) DONE acc 7 perf (quiet machine, perf5 1/100/109 + menu, both sizes): own ms p50 0.9-1.3, p95 1.6-2.0, rare
  re-check passes up to 6.7 ms; MO passes p95 0.5 ms. Full all-module build OK (/tmp/eos_readability_full).
  Integrated readability+dots+mood smoke (POP, HOT POTATO, input/play/reveal, both sizes): smallText empty, 0 errors.
  Words in MELT/ERASE/BIN/UNHOOK/CUT THE LOOP now >= 15.2 @390 / 16.2 @1280.
- Running: review13 at 1280 (12 games) -> review_1280_v4.json + dev/shots/eos/readability_*_1280.png.
- Next: look at review shots, write build.md, commit + push.
