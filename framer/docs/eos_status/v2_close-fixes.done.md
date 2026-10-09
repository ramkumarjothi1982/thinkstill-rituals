I fixed every finding in the round-1 fixes review and verified each one in the isolated integrated build (`/tmp/v2_fixes`) at 390×844 and then 1280×860, with zero page errors in every run. Three of the fixes needed new integration edits in `dev/eos_integrate.py` (the 109 fix, the BIN fix and the guard-miss fix), because a CSS rule or a guard in the module could not fix them.

**Commits:** the workflow's automatic WIP checkpoints committed and pushed my code changes before I committed:
- `60_eos_fixes.jsx` in f7bb672
- `eos_integrate.py` in 7b25806
- `EOS_SPEC.md` in dd03e40, together with unrelated files from other agents (founder verify JSONs and `workflows/release_v2.js`)

My own commit, 13f870f, adds only the close-out doc and the progress notes. It is pushed to `claude/jolly-hopper-ognrxj`.

One line per finding:
1. **(major) 21 BIN word flew back out of the bin** — Fixed with new edit I3-E7: `measureTarget` now aims the flight from the bubble's home slot. I didn't use the reviewer's suspend approach because the drag-end handler runs a frame late, so every correct drop would have played the miss sound first. Tracked the bubble to the end of its flight for a drag drop, a double-click on an idle bubble, and a double-click on a bubble dropped elsewhere first: all three ended 0 px from the mouth centre at both sizes, and BIN reached the reveal.
2. **(major) 109 CLEANSE stuck at 100%** — Fixed with new edit I3-E6: the released list can no longer shrink. Test: held back the 3.2 s delayed writes and fired them after the last release, which is what happens when the last two releases are under 3.2 s apart. A copy of the build without the fix stayed at 100% for 20 s; the fixed build reached the reveal at both sizes (4.8 s at 390, 5.7 s at 1280).
3. **(minor) 109 race not wired anywhere** — Same fix and test as item 2; the edit is now in `eos_integrate.py` and spec §12.2.
4. **(minor) Guard games: a wrong tap showed a reward and added 12%** — Fixed with new edit I1-E15: when a guard detects a miss using the game's own miss rule, the miss keeps its sound but gets no step reward and no progress. Only miss sounds are suppressed, never a win. Game 64: 4 wrong taps gave 0→0 with no reward and "wait for red…" at both sizes, and a correct stop still went 0→17. Game 70: wrong beats gave 0→0 at 390.
5. **(minor) Stopword-only input split into "i" / "am"** — Such input now stays one phrase. In the page, 'i am' and 'i i i' each come back as one phrase plus seed words; 'i want to die', empty input and 6+ words behave as before. I found no existing node unit-case file, so these were in-page checks only.
6. **(minor) BIN observer ran for the whole game** — It now runs only from a press until 1.6 s after release, and only for the bubble in hand and binned bubbles. Untouched bubbles never get the mirrored transform, it stays stable while idle, and cleanup is in the effect's return.
7. **(major) 107 label covered the character** — Taller cards with smaller characters (desktop 156 px / 80 px, phone 136 px / 56 px) and two-line labels on phone. On phone the prop icon sits above the word so MOUSTACHE stays on one line. Measured 0 px overlap and no clipped labels on all 6 cards at both sizes; props sit above the guide. Plays to the reveal at both sizes.
8. **(major) 103 phone: dark column over the active thought, queue and labels cut** — The dark column is now a small pill in the top corner, the queue shows whole words in 3 columns, and labels can take two lines. The column covers 0 bays, LOWER PLATFORM sits at 531–577 (guide starts at 589), and a screenshot shows the active thought as the brightest. Plays to the reveal at both sizes.
9. **(major) Tool docks 3/4/9/16/43 hidden under the LIVE GUIDE on phone** — The un-armed dock is lifted above the guide until the tool is picked up, then returns to its usual spot. 3/4/16 move their caption above the dock, 9's dock moves to the empty left corner, and 43's scissor picker covers part of its own "SELECT THE SCISSORS" caption (the arrow label and the LIVE GUIDE say the same thing). Dock bottoms at 390 are 570–577, all above the guide; the gold pulse shows and taps reach the dock. 3, 9 and 43 play to the reveal; desktop is unchanged.
10. **(minor) Waiting objects dimmed too much** — Softened from opacity .45 / saturation .5 to .72 / .75; the live element keeps its gold ring and pulse. This is CSS only and was not checked separately.

**Regression sweep:** at 390, games 107, 103, 3, 9, 43 and 21 played to the reveal; at 1280, 107, 3 and 103 did.

Files are in `/home/user/thinkstill-rituals/framer`:
- `src/eos/60_eos_fixes.jsx`
- `dev/eos_integrate.py`
- `docs/EOS_SPEC.md`
- `docs/eos_status/fixes.closeout_r1.md`
- `docs/eos_status/v2_fixes.progress.md`
