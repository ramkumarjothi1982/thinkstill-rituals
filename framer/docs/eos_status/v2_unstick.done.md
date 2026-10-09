# v2 unstick: games 47, 34, 107, 8, 14, 17, 21, 28

Code landed in 2568da6 (checkpoint commit): `src/00_arcade.jsx`, `src/eos/45_eos_router.jsx`, rebuilt `ThinkStillReleaseArcade_EOS_FULL.txt`.

## Fixes
- **Shared stage (both uniq `shell` divs):** `TS_STAGE_NO_SELECT` (user-select none, no touch callout), `onPointerDownCapture` drops any stray selection, `onDragStartCapture` blocks native drag-and-drop. Repro before the fix: a press just above the RIVER leaf, dragged down, selected the leaf's word; the next grab fired dragstart + pointercancel and every later grab did the same (a permanent stall). After the fix the same gesture leaves no selection and the next drag scores.
- **Per-card fresh drag object:** `key={...idx}` on `.plug` (47), `.leafWord` (34), `.meteorRock` (8), `.fileCard` (28). Before the fix the dragged object stayed where the last card left it. At 390 the plug sat at translateX(190px), mostly off screen, so card 2 could not be pulled. The leaf sat at its bottom constraint.
- **34 RIVER:** `if (phase) return` in onDragEnd, so a second drop during the 650 ms carry no longer schedules a second advance (that skipped a word).
- **Router:** `EOS_ROUTER_PHONE_FRAGILE` is now empty. 47 had been demoted at phone width until finishGame(47) passed at 390. EosRoutePreview("jealous", 8 | 5, {narrow}) now returns 47.
- 14, 17, 21, 107 already completed on this build (the live-target highlight, BIN mirror and 107 dock fit come from 60_eos_fixes). No game-specific change was needed; they also get the stage hardening.

## Verification (finishGame, current build, lite, zero errors, progress never went backwards)
| id | 390x844 | 1280x860 |
|---|---|---|
| 47 | reveal 36 s | reveal 70 s |
| 34 | reveal 67 s (+3/3 and 4/4 stress reruns) | reveal 117 s |
| 107 | reveal 44 s | reveal 54 s |
| 8 | reveal 55 s | reveal 92 s |
| 14 | reveal 65 s | reveal 81 s |
| 17 | reveal 73 s | reveal 66 s |
| 21 | reveal 41 s | reveal 91 s |
| 28 | reveal 69 s | reveal 88 s |

Human path at 390: in manual mouse drags (47: a 130 px pull, 34: an 80 px drop, 8: a 110 px pull, 28: an 80-90 px pull), every card scored. Card 2's object is back at its start pose and fully on screen (round-2 screenshots).
