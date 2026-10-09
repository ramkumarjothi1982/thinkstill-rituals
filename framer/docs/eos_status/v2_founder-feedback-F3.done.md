F3 is fixed and pushed to `claude/jolly-hopper-ognrxj`. Code is in `293bea6`, the log entry in `cd7f9c7`. Users can no longer choose or browse games. ThinkStill picks every game and doesn't repeat one until the whole group for that feeling has been played. Every test run at 390x844 and then 1280x860 passed with 0 page errors.

**What was wrong**
- Users picked games themselves. These paths existed:
  - the CHOOSE TO RELEASE menu, which listed all games and was also the start button
  - "pick a game myself" on the check-in
  - the next game's name shown under the check-in's LET'S SHIFT IT button
  - "TRY <GAME>" and "ONE MORE ▶ <GAME>" buttons at the end
  - ‹ PREVIOUS / NEXT › arrows that stepped through the catalogue
  - the idle screen line "Pick one or let ThinkStill choose"
  - the "cool it down" link
- With no game selected, Enter just opened the menu.
- There was no no-repeat logic. Picks only got a small penalty for recent games.

**What I changed**
- **New shared module `src/eos/46_eos_pick.jsx`.** It uses the existing router for the feeling: check-in feeling and level, feeling read from the words, time of day, and safety flags.
  - A feeling's group is every game the router may serve for it, best fit first.
  - A game counts as played once it is played under any feeling. The best unplayed game is served.
  - A new round starts only when the whole group has been played, and never with the game just played.
  - The last 4 games are avoided even when the feeling changes, unless nothing else is left in the group.
  - Safety flags keep it to the gentle games.
  - It saves only game ids and counters in the browser (`eos_rotation_v1`), never the user's text.
- **What users see now:**
  - The menu is replaced by one RELEASE IT button. It reads NEXT ▶ while a game runs or at its end, and then serves ThinkStill's next pick.
  - Enter, RELEASE IT and LET'S SHIFT IT all start ThinkStill's pick.
  - The end screen keeps ONE MORE ▶ as Next (no game name), ↻ AGAIN, and I'M GOOD ✓, which returns to a new thought.
  - Every choice path listed above is hidden. The idle screen now says "THINKSTILL PICKS · The best release for how you feel."
  - Enter while a game is running restarts that same game with the new words, as before.
- **Kept for the owner:** all the old code stays. The new Framer property "Show game menu" (default off) brings it all back. For dev and tests, `?menu=1`, `window.__eos.pick.setMenu(true)` and `window.__eos.pick.start(id)` do the same. `dev/drive.mjs` and `dev/eos_drive.mjs` use `window.__eos.pick.start(id)` automatically when the menu is hidden, so existing tests still start games by id.
- **One game held back:** I re-played the routed games that F2 flagged as not finishing, at 390x844. Nine reach their finale. SLINGSHOT still gets stuck there, so ThinkStill won't pick it on phones; it stays playable from the owner menu.
- **Arcade and wrapper edits:** these are scripted as integration group F3 in `dev/eos_integrate.py` and documented in `EOS_SPEC` §12.2. The anchor check passes for all groups.
- **Untouched:** no finale, burst, sound, progress indicator or game mechanic changed.

**How I verified** (`dev/f3_probe.mjs`; results in `docs/founder/fix_F3_rotation_unit.json` and `fix_F3_ui_probe.json`)
- **Rotation test:** for all 12 feelings, plus no feeling and two safety-flag cases, I ran group size + 3 sessions with a page reload halfway. Each group was fully played before any repeat, there were no back-to-back repeats, and the next round had no repeats. Games played recently under another feeling were avoided.
- **Typing path, both sizes:** no game choice was visible at check-in, input, play or the end screen.
  - RELEASE IT started COOL THE VOLCANO (ThinkStill's pick), played to its finale.
  - NEXT started CLEANSE (ThinkStill's next pick), played to its finale.
  - AGAIN replayed CLEANSE.
  - × returned to the input screen.
- **Check-in path:**

  | Size | Check-in | First game | Next | After reload | Next |
  |---|---|---|---|---|---|
  | 390 | panic, level 8 | BIG SIGH | CLEANSE | GROUND CONTROL | 36 |
  | 1280 | anger, level 6 | COOL THE VOLCANO | 100 | 111 | 109 |

  - Each game was ThinkStill's expected pick, with no repeats.
  - The first two games, and the one after the reload, were played to their finale.
  - After a reload, ThinkStill carried on where it left off.
- **Owner menu:** `?menu=1` and a test build with "Show game menu" switched on both brought the menu back, and POP started from it.
- **Screenshots:** `docs/founder/fix_F3_before_390.png`, `fix_F3_before_1280.png`, `fix_F3_after_390.png` and `fix_F3_after_1280.png`.

**Decision for you:** the founder asked for Next, Again and New thought at the end. I kept the existing end-screen wording, so New thought appears as "I'M GOOD ✓". It does the same thing: it goes back to the input screen. Renaming it would be a small follow-up if you want the exact words.

The before screenshots and the hold-list re-play ran on a copy of the build from before this fix.
