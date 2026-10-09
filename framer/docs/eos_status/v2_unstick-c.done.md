All 8 games now finish on phone (390x844) and desktop (1280x860). On the final build, every game reached the reveal at both sizes: 16 test-driver runs, zero errors, and the bar never went backwards.

Before I changed anything, 6 of the 8 already finished on the current build. The audit's "100% but no reveal" no longer happens: earlier fixes changed the progress bar so it no longer climbs on every sound or jumps to 100% early. Two games still failed:
- **70** got stuck at 12% on desktop.
- **42** stopped at 67% on desktop, but only because my test limit was 120 s. Given 260 s, it finished in 220 s.

I fixed 70, 96, 42 and 109 in `src/00_arcade.jsx`. No mechanic, animation, sound, finale or progress indicator was removed.

| id | cause | fix | 390 result | 1280 result |
|---|---|---|---|---|
| 67 TAP OUT | The audit's "no reveal" came from the old bar. It no longer happens on this build. | None needed | reveal 75 s | reveal 78 s |
| 68 DRUM IT | Same as 67 | None needed | reveal 65 s | reveal 74 s |
| 69 PULSE | Same as 67 | None needed | reveal 57 s | reveal 86 s |
| 96 SCRATCH REVEAL | Every scratched card set the bar to 100%, so it sat at 100% after card 1 with 5 cards left. Without the bar change it dropped from 100 to 17. | Each card now adds only its own share of the bar, in both copies of the game code. | reveal 34 s; the bar climbs card by card to 100. Plain mouse strokes kept on screen finish each card. | reveal 40 s, same climb |
| 42 UNTANGLE | Knots kept where the last card left them. On later cards one could sit over the glowing knot. I never saw this cause a stall; desktop is just slow in testing. | Fresh knots for each card | reveal 90 s; drags kept on screen: 18 of 18 count | reveal 231 s (220 s before the fix) |
| 70 METRONOME | The word and the button were rebuilt on every beat (every 620 ms). Each rebuild changed the word's height, so the button jumped 26 px and most taps landed on empty stage. | The word and button stay in place between beats | reveal 88 s; tapping on the beat to tap (even BEAT number): 26 of 26 presses hit the button, reveal in 34 s | reveal 86 s (was stuck at 12%); same tapping: 26 of 26, reveal in 38 s |
| 74 BUBBLE WRAP | Same as 67 | None needed | reveal 99 s | reveal 108 s |
| 109 CLEANSE | Already fixed by an earlier change. One gap remained: the end-of-game timer could still be cancelled after the game had locked in its finish. | Once locked, the end-of-game timer always fires. Leaving the game or new entries still cancel it. | reveal 61 s | reveal 50 s |

Two issues I left alone:
- **Phone, game 70:** the "EVERY OTHER BEAT" hint covers part of the BEAT label, which players need to see. That hint comes from the arrows module, outside this task.
- **Games 64, 66 and 80** redraw on a timer like 70 did, so they could have the same jumping button. I did not test them.

The commit (23b34bc) has the source, the rebuilt `.txt` and my notes, and is pushed to `claude/jolly-hopper-ognrxj`.

Files are in /home/user/thinkstill-rituals/framer:
- src/00_arcade.jsx
- ThinkStillReleaseArcade_EOS_FULL.txt
- docs/eos_status/v2_unstick-c.done.md
- docs/eos_status/v2_unstick-c.progress.md
