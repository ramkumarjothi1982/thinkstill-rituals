# v2_unstick-c done

All 8 games finish on phone (390x844) and desktop (1280x860) on the final build. On the current build before my changes, 6 of the 8 already reached the reveal at both sizes: the fixes module's progress gate had removed the audit's "100% but no reveal" (the bar used to climb on every sound and hit 100% while cards were still left). Two still failed: 70 on desktop got stuck at 12%, and 42 on desktop timed out at 67%. The 42 timeout came from my 120 s test limit. With 260 s it finished (220 s). I changed 70, 96, 42 and 109 in `src/00_arcade.jsx`. No mechanic, animation, sound, finale or progress indicator was removed.

Each result is one test-driver run on the final build (lite mode, decorative layers hidden). Each run reached the reveal with zero errors, and the bar never went backwards.

| id | cause | fix | 390 result | 1280 result |
|---|---|---|---|---|
| 67 TAP OUT | The audit's "100% but no reveal" was the old sound-driven bar. It no longer happens on this build. | None needed. | reveal 75 s | reveal 78 s |
| 68 DRUM IT | Same as 67. | None needed. | reveal 65 s | reveal 74 s |
| 69 PULSE | Same as 67. | None needed. | reveal 57 s | reveal 86 s |
| 96 SCRATCH REVEAL | Every scratched card reported 100%. The bar sat at 100% after card 1 while 5 cards were left (without the gate it fell 100 to 17). | Each card now reports its own share. | reveal 34 s; bar 10, 27 ... 95, 100. Real mouse strokes on screen finish every card | reveal 40 s, same bar |
| 42 UNTANGLE | The desktop "no reveal" no longer happens. The knots kept the last card's drag offsets, so a parked knot could cover the next glowing knot. | Fresh knots for each card. | reveal 90 s; on-screen drags 18/18 count, then reveal | reveal 231 s (slow headless desktop; 220 s before the fix) |
| 70 METRONOME | The word and the button were rebuilt on every beat (every 620 ms). The word re-fitted (rig 330 to 381 px tall), the button jumped 26 px, and most taps landed on the empty stage. | The word and button stay mounted between beats (no remount). | reveal 88 s; tapping on the even BEAT label: 26/26 presses hit the button, reveal 34 s | reveal 86 s (was stuck at 12%); same tapping: 26/26 hit, reveal 38 s |
| 74 BUBBLE WRAP | Same as 67. | None needed. | reveal 99 s | reveal 108 s |
| 109 CLEANSE | Already fixed by the earlier "never-shrinking release list" change. The finish timer could still be cleared by a re-run of its effect while the lock stayed set. | Once locked, the finish timer always fires. Unmount or new entries still clear it. | reveal 61 s | reveal 50 s |

Not changed (outside this task): on phone, the arrows pill "EVERY OTHER BEAT" partly covers 70's BEAT label. The other legacy games define their word and button the same way (`<W/>`, `<U>`). Only games that re-render on a timer (64, 66, 80) could show the same jump.
