| row | fix | verification |
|---|---|---|
| R1 (P11.3-a, P11.3-c, P11.1-g, P13.1-c, P13.19-l, P13.23-b) | Added `src/eos/01_eos_burst.jsx`. While `.tsRewardSurge.mega` is mounted it sets `html[data-eos-burst]`, which turns `.eosMoodGrade`, `.eosMoodAir`, `.eosMoodFlip`, `.eosCompanion`, `.eosThoughtFlow` (glow, dots, Still Point) and `.eosArrowLayer` to opacity 0 and hidden. The mood tween and the dots tick/frame loops pause, and the dots sound bed fades out. `00_arcade.jsx` is untouched, so the burst is the 485500c burst. | Frozen frame at mega +0.6 s on 1, 18, 100, 109, 110: all-EOS diff in the burst rect is 0.00–0.17 % at 390x844 and 0.00–0.07 % at 1280x860 (was 3.07–6.18 %). The core diff is 0 % everywhere, and all 5 layers measure opacity 0. Text scan from mount to +1.8 s at 390 (1, 18, 100, 109, 110) and 1280 (1, 18): 0 EOS text nodes in the core. The only core text left is each game's own BASE finale copy (finish card, HOT POTATO payoff, lotus, rain letters). |
| R2 (P11.1-f) | The flip bloom and its chime no longer fire on isComplete. They wait until the burst unmounts. Because the play layer unmounts with the burst, `eosMoodAfterBloom` (in `14_eos_mood.jsx`) blooms a copy of the words on the reveal, starting from the memory orb, with the same chime. The bloom is kept, not removed. | Scheduled-sound log: 0 EOS cues between progress 100 and mega unmount on 1, 18, 100, 109, 110 at 390 and on 1, 18 at 1280. The chime starts 178–303 ms after unmount, and nothing blooms during the burst. A check on a device with sound is still needed. |
| R3 (P12.4-a) | Still Moment no longer plays the rain buffer. It plays its own breath (`eosStillBreath`, a filtered-noise exhale) plus its existing sigh tone. RAIN OUT is unchanged. | Code path only; headless has no audio. |
| R4 (P3.4-j, P9.3-c/d/e, P14-f, P8.3-h) | Removed both hide-until-done rules for ‹ PREVIOUS / NEXT › (desktop and phone). On phones the nav row now sits above the card. SHARE moved to the quiet links row. | Done step at 390: 3 primaries (I'M GOOD, ONE MORE, AGAIN), down from 4. The composer's NEXT ▶ works from 0 s in 1 tap. ‹ PREVIOUS / NEXT › only render when the owner menu is on, so on the default reveal they are absent before and after. |
| R5 (P10-b) | The check-in no longer hides the how-it-works story. The 4 step titles show as a compact strip under the check-in. On phones the composer gives up its empty lower band, so the check-in keeps its size. | 390, check-in on: 4 steps visible (PUT IT INTO WORDS / THINKSTILL PICKS / WE MATERIALISE IT / PLAY + RELEASE), 12 px, 4 words or fewer each, at y 740–781. |
| R6 (P3.2-a) | Phone header: THINKSTILL is centred at 14 px. The score pill now stacks LVL over the spark count so the title has room. | 390: centre offset 0 px at input and play (was -84 / -68), no clipping. |
| R7 (P5.3-a, P5.3-b, P7.3-b, P5.6-c) | Reverted the picture shrink: 105 take faces back to 32 px, 106 avatar back to 40 px. | 390: 105 faces 32x32 (were 20), 106 avatar 41x41 (was 26). |
| R8 (P5.5-c, P5.4-a; P5.5-e kept PARTIAL) | ZAP counter is now clear glass at the top of the bubble. Raised words now shrink to fit their box instead of breaking mid-word, but never below their original size. A new circle check stops raised text at the width the circle allows. | ZAP (6): glass background, 0 px overlap with the word (was a dark plate). 0 mid-word breaks in 6, 19, 21, 43, 88, 94, 105, 106. Letters still stick out of two bubbles ("tight fists", "had enough"), the same before and after, so P5.5-e stays PARTIAL until the upload sweep re-runs. |

**Status:**
- Build passes, with zero page errors in every probe run.
- Rows: 22 of the 23 REGRESSION rows (including P8.3-h) are now FIXED in `gap_rows.json` with commit `c4f9a87`; P5.5-e stays PARTIAL.
- A "Fixed" section was appended to `GAP_AUDIT.md` in commit `be4f4c5`.
- Both commits are pushed to `claude/jolly-hopper-ognrxj`.
- `src/pilot/` was not touched.

**Not done or open:**
- The R1 text scan and R2 sound log ran for 100, 109 and 110 at 390 only; at 1280 they covered just games 1 and 18.
- R4–R8 were measured at 390 only.
- The 100-110 finish card is part of the 485500c baseline (`.globalFinishFeedbackCopy`). It still appears in the burst core at about 1 s. I left it as it is because the burst has to match 485500c exactly, so the "0 text in the core" test passes only for EOS text.

**Files:**
- New: `/home/user/thinkstill-rituals/framer/src/eos/01_eos_burst.jsx`
- Changed:
  - `/home/user/thinkstill-rituals/framer/src/eos/14_eos_mood.jsx`
  - `/home/user/thinkstill-rituals/framer/src/eos/12_eos_dots.jsx`
  - `/home/user/thinkstill-rituals/framer/src/eos/50_eos_shift.jsx`
  - `/home/user/thinkstill-rituals/framer/src/eos/40_eos_checkin.jsx`
  - `/home/user/thinkstill-rituals/framer/src/eos/10_eos_readability.jsx`
- Rebuilt: `/home/user/thinkstill-rituals/framer/ThinkStillReleaseArcade_EOS_FULL.txt`
- Docs:
  - `/home/user/thinkstill-rituals/framer/docs/founder/GAP_AUDIT.md`
  - `/home/user/thinkstill-rituals/framer/docs/founder/gap_rows.json`
  - `/home/user/thinkstill-rituals/framer/docs/eos_status/v2_gap-regressions.progress.md`
- Test scripts:
  - `/tmp/claude-0/-home-user-thinkstill-rituals/b5e1bfa3-ddef-5c62-9291-4d212bc0e4f1/scratchpad/fp_freeze2.mjs`
  - `/tmp/claude-0/-home-user-thinkstill-rituals/b5e1bfa3-ddef-5c62-9291-4d212bc0e4f1/scratchpad/reg/burst2.mjs`
  - `/tmp/claude-0/-home-user-thinkstill-rituals/b5e1bfa3-ddef-5c62-9291-4d212bc0e4f1/scratchpad/reg/p2.mjs`
  - `/tmp/claude-0/-home-user-thinkstill-rituals/b5e1bfa3-ddef-5c62-9291-4d212bc0e4f1/scratchpad/reg/geom.mjs`
