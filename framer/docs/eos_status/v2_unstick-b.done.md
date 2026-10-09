# v2 unstick-b: 45, 48, 51, 71, 77, 103, 37, 63

On the current build the test driver already finished all 8 games on both sizes. Earlier modules (60_eos_fixes CSS, the shared stage no-select fix from unstick-a, the monotonic progress gate) had fixed the layout and progress faults the audit saw. The driver hid real-player traps, though: it moves the pointer past the screen edge, which a finger cannot do. A probe that keeps the pointer on screen (mouse and real touch events) found the traps below. Source fixes are in `src/00_arcade.jsx` (UniqueReleaseEngineLegacy) only. No mechanic, animation, sound or finale was removed.

| id | cause | fix | 390 result | 1280 result |
|---|---|---|---|---|
| 45 MAGNETS | The orb stayed where the last pull left it. On phone it parked at x~320 and a 160 px pull would end off screen, so play stuck at 17%. One short pull (140 px) on card 1 also stuck it for good. | Fresh orb per card (`key orb${idx}`). A short pull returns the orb to the magnet (`regrip` remount, meter reset). | reveal 45 s; on-screen drag and touch reach 100% | reveal 79 s; on-screen drag reaches 100% |
| 48 UNSTICK | The sticker stayed at the peeled corner of its constraint box, so the next card needed a peel off the right edge (stuck at 17% on phone). | Fresh sticker per card (`key sticker${idx}`). A short peel re-sticks it at the start. | reveal 37 s; on-screen drag and touch reach 100% | reveal 69 s |
| 51 MIRROR FLIP | Already fixed on this build (60_eos_fixes: `.mirrorStage` pointer-events none). | none needed | reveal 50 s; on-screen taps reach 100% | reveal 58 s |
| 71 DEFUSE | Already fixed on this build (60_eos_fixes compact zone rows at 390). | none needed | reveal 59 s; on-screen taps, nothing off screen | reveal 45 s |
| 77 SLOW MOTION | The brake stayed parked at the bottom of its track for later cards, while the phrase sped up again. The handle sat below the film gate. | Fresh brake per card (`key brake${idx}`). | reveal 28 s; touch reaches 100% | reveal 86 s; on-screen drag reaches 100% |
| 103 SINKING PLATFORM | Already fixed on this build (60_eos_fixes compact machine, LOWER button on screen). | none needed | reveal 22 s; on-screen taps reach 100% | reveal 46 s |
| 37 ELEVATOR DOWN | "100% but no reveal" no longer reproduces: the hand-off to onDone works on this build. | none needed | reveal 30 s; on-screen taps reach 100% | reveal 76 s |
| 63 PATTERN POP | A tap on a wrong portal silently reset the streak to 0, so the bar stalled while the player redid every read. The desktop "no reveal" no longer reproduces. | A miss keeps the reads already made; the soft miss sound is kept. | reveal 31 s; with a miss every 3rd tap: back=0, reveal | reveal 62 s |

Every result is one finishGame run on the final build (lite): it reached the reveal, there were 0 errors, and progress never went backwards. Scripts are under the session scratchpad `ub/` (run.mjs, human.mjs, touch.mjs, under.mjs, miss63.mjs).
