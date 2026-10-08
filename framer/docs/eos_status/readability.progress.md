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
