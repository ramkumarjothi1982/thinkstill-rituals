All 8 games now finish on phone (390x844) and desktop (1280x860). On the current build the test driver already finished all 8 before I changed anything: earlier fixes had cleared the faults the audit saw. But the driver drags past the edge of the screen, which a finger can't do. When I kept the pointer on screen (mouse and real touch), 45 and 48 got stuck at 17% on phone. A single short pull in 45 also stuck it for good. I fixed 45, 48, 77 and 63 in `src/00_arcade.jsx` and checked the other four without changing them. No mechanic, animation, sound or finale was removed.

Each result below is one test-driver run on the final build (lighter test mode, decorative layers hidden): it reached the reveal with zero errors and the bar never went backwards.

| id | cause | fix | 390 result | 1280 result |
|---|---|---|---|---|
| 45 MAGNETS | The orb stayed where the last pull left it. On phone it sat near the right edge, so the next pull would have to end off screen (stuck at 17%). One short pull also left it stuck. | A fresh orb for each card. A pull that falls short now sends the orb back to its start. | reveal 45 s; on-screen drag and touch reach 100%, including after a short pull | reveal 79 s; on-screen drag reaches 100% |
| 48 UNSTICK | The sticker stayed at its peeled corner, so the next card needed a peel past the right edge (stuck at 17%). | A fresh sticker for each card. A peel that falls short puts the sticker back at the start. | reveal 37 s; on-screen drag and touch reach 100%, including after a short peel | reveal 69 s; on-screen drag reaches 100% |
| 51 MIRROR FLIP | Already fixed on this build by the earlier fixes module (the stage no longer covers the ABOVE button). | None needed. | reveal 50 s; on-screen taps reach 100% | reveal 58 s |
| 71 DEFUSE | Already fixed on this build by the earlier fixes module (all three steps fit on phone). | None needed. | reveal 59 s; on-screen taps, nothing off screen | reveal 45 s |
| 77 SLOW MOTION | The brake stayed pulled down for later cards while the phrase sped up again. | A fresh brake for each card. | reveal 28 s; touch reaches 100% | reveal 86 s; on-screen drag reaches 100% |
| 103 SINKING PLATFORM | Already fixed on this build by the earlier fixes module (the LOWER button is on screen). | None needed. | reveal 22 s; on-screen taps reach 100% | reveal 46 s |
| 37 ELEVATOR DOWN | The audit's "100% but no reveal" no longer happens on this build. | None needed. | reveal 30 s; on-screen taps reach 100% | reveal 76 s |
| 63 PATTERN POP | Tapping a wrong portal silently wiped the reads already made, so the bar stalled while the player redid them. The desktop "no reveal" no longer happens. | A miss now keeps the reads already made; the soft miss sound stays. | reveal 31 s; with a wrong tap every third turn the bar never drops and it reaches the reveal | reveal 62 s |

The fix for 63 changes its rules: a wrong tap used to send the player back to the start of that card, and now it doesn't. I made that call because it was what kept the bar stuck. Put the reset back if you want misses to cost something.

The commit (77d03c3) has the source, the rebuilt `.txt` and my notes, and is pushed to `claude/jolly-hopper-ognrxj`.

Files are in /home/user/thinkstill-rituals/framer:
- src/00_arcade.jsx
- ThinkStillReleaseArcade_EOS_FULL.txt
- docs/eos_status/v2_unstick-b.done.md
- docs/eos_status/v2_unstick-b.progress.md
