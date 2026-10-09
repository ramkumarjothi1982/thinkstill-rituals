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
- (20:40) acc 6 re-run at 1280 (review13, 12 games): clean except GO WEIRD's prop hint ("TAP A THOUGHT" 114 > 104 px).
  Fixed: the .gwProp button row now targets .gwProp>span (name 14/13); the em hint takes the counter row (12.5 px,
  fits: sw = cw = 104); phones (<= 560) hide the 7 px hint (65 px buttons; guide + arrow carry it). Verified both
  sizes, smallText empty, 0 errors. Full build (python3 build.py) OK; FULL.txt restored (not mine to commit).
- Next: commit + push, then write readability.build.md (final report) and commit + push it.

## Fix round 1 (review_r1.json) — session 4
- Found the earlier fixer checkpoint (a5e7b0d) already carries CSS for findings 1 (DRAMA buttons explicit 14/13 px,
  out of max(14px,1em), control room hugs content), 6 (phone HUD: sparks+LVL always on, tokens/chain hit toast),
  10 (MIND BEND kept on phones until first hit, one 13 px line), 11 (legacy reveal grid on phones). Untested yet.
- Todo (JS): 8 held-scale (shrunk-by-game + skip list 26/29/30/53/58/104, one scale measure), 2 memory cleanup,
  3 per-root state, 4 MO style reads only for 'first' bucket + budget before costly steps, 5 eos overlay skip list,
  7 word-fit min 14, 9 drop forced layout flush on timer passes.
- (s4) JS done: per-root state (WeakMap root→state, eosReadUse), overlay-root list (no eos* heuristic), word-fit min 14,
  held-scale only for boxes BORN scaled (S.full) + skip list .u26/.u29/.u30/.u53/.u58/.u104, one scale measure (chain
  scale), budget checked before chain scale + word fit, passes now run in the ResizeObserver step (after layout,
  before paint: no forced flush, no MO style read; fallback = old timing), cleanup restores + clears state.
- Running: shrink.mjs 30,58,102,95 @390 → fx_shrink390.json; fx_states.mjs 105,1,99,109 @390 → fx_s390.json.
- (s4) 390 re-run (fy_s390.json): DRAMA buttons 13/13 px, inside the machine, elementFromPoint OK, no overflow; LVL
  always on (sparks join the hit toast only where a .literalProgress pill narrows the meter); MIND BEND visible until
  first hit; legacy reveal card centred, PREVIOUS | NEXT row under it; smallText(12) empty; 0 errors; all passes run
  pre-paint (RO), flush 0 ms, own p95 0.9-2.1 ms. ZOOM OUT / MICROSCOPE monotonic per word; FINGER TRAP still
  compensated (13.9 → 16.2). CLEANSE @390 did not reach the reveal in 90 s → checking the baseline (fb_s390.json).
- (s4) 1280 (HOT POTATO, DRAMA, CLEANSE) clean; CLEANSE @390 alone finishes in 36 s (90 s misses were load). Full build OK,
  FULL.txt restored. build.md updated with the fix-round section. Committing.
- (r2 s5) Started fix round 2 (review_r2.json: 1 major MICROSCOPE word-fit rebound, 5 minors: SHELF IT shelved <12, FINGER TRAP 14 px, RM toast slide, phone toast depth x2).
- (r2 s5) JS done: STATIC_SEL .ftTrap (full comp), plain-12 comp for game-parked boxes (SHELF IT), never-rise while the game shrinks, word-fit ratio = compensated scale only, hug-climb in word fit (kills MICROSCOPE birth creep). MICROSCOPE trace 1280/390: 0 ups while scaled. Next: phone hit toast -> one-row in-meter ticker (no arena overlap), RM via no-preference blocks.
- (r2 s5) Phone ticker in-row works (literal 2-phase, non-literal 1.6 s; RM opacity-only). Fixed a stray } that had dropped the whole <=560 block (caught by the probe). Running minw 95 / ft2 102 / micro2 58 / shrink 30 at 390+1280.
- (r2 s5) Fixed: no-rise cap only for boxes with a rec or seen full (new words entering small are floored at once). ZOOM OUT/MICROSCOPE 390: maxFsGrowth 0, 0 bounces; MICROSCOPE 1280 constant 16.25 (no creep). FT 15.2 @390 / 16.2 @1280. SHELF shelved resting compensated (only <500 ms transients during the shelve motion). smallText empty 1/100/105/108/110 @390.
- (r2 s5) Done: isolated build OK; DRAMA 390 23 s / HOT POTATO 1280 69 s alone, floor avg <1 ms. build.md updated with the round-2 section + corrected r1 claims. Committing.
