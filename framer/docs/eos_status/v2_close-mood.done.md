All five findings in `mood.review_r2.json` are fixed (1 major, 4 minor), and the work is pushed to `claude/jolly-hopper-ognrxj`. I checked the fixes by running games at 390 and 1280 on an isolated build of all 15 `src/eos` modules in `/tmp/v2_mood`. Every run had zero page errors, no words fading early, and the real finish card covering 0% of the words. The only code file changed is `src/eos/14_eos_mood.jsx`.

1. **MAJOR – 112 card prediction wrong on phone.** The card's place is now measured, not guessed: a hidden copy of the card is laid out in the same parent with the arcade's own positioning, read, and removed in the same task, so 112's own card rule applies to it. The old guess is kept as a fallback.
   - **Second cause found while testing:** with the card fixed, one 112 phone run still faded two words. The cause was the Rush character hopping from the crater to the summit. Placement now looks ahead along any character's finite move and keeps the words off that path, then puts every animation back unchanged.
   - **Verified:** 112 at 390, four runs, and at 1280: predicted card matched the real one to within 4 px (the reviewer's failing case was off by about 103 px); no words faded early. After the path fix, two phone runs gave a clean 25.2 px stack beside the landed Rush.
2. **Minor – placement cost on the finish frame.** The placement search now skips work that cannot win, and returns exactly the same result.
   - **Verified in Node:** 400 random stages gave 0 differences from the old function, and total time fell about 6× (17.0 s to 2.8 s).
   - **Verified in browser at 4× CPU throttle:** 120 obstacles went from 19.8/10.7 ms to 9.3/4.6 ms; 300 obstacles went from 39.8/28.4 ms to 11.9/9.7 ms.
3. **Minor – 112 card covering the words.** Same fix as item 1. The real card covered 0% of every word in every run, including legacy games 2 at 390 and 1 at 1280, where the prediction was within 1 px.
4. **Minor – 113's emoji anchors invisible to placement.** Standing emoji of 18 px or more now count as game content; flying particles are still ignored. 113's lit anchors are reserved at full size even while they pop in. Verified on 113 at 390 (normal twice, and reduced motion): no overlap with any emoji or text and no early fades. At 1280 it gets a clean full crown.
5. **Minor – placement runs synchronously on the finish frame.** Covered by item 2: the work is now much smaller. The bloom still starts on the same frame as the finish, as the acceptance test requires.

Other checks:
- **Regression:** 114 at 390 and 111 at 1280 also passed. The round-1 unit test (`/tmp/eos_mood_t/unit2.mjs`) passes, and the isolated build passes.
- **Screenshots:** I looked at two tiled sheets. At 112 on phone, "cool · clear · strong" sits beside Rush, clear of "Cooled to zero", the flowers and the card. At 113 on phone the words sit under the sense buttons, and at 112 on desktop they form a crown at the volcano base.
- **One run did not finish:** 111 at 1280 timed out before the finish while three browsers ran in parallel (server load average about 20). The same test run alone passed.
- **Test hook added:** the mood module now also exposes a read-only `content()` helper, used to see what lands on a word when it fades.
- **Commits:** a workflow checkpoint committed my code changes as `c76e79c` and `a429f0c` before I got to it. My commit `7a7e49f` adds the round-2 section in `docs/eos_status/mood.build.md` and the progress notes in `docs/eos_status/v2_mood.progress.md`.

Test scripts and results are in `/tmp/v2_mood_t/` (`fin.mjs`, `equiv.mjs`, `perf3.mjs`, `r*.json`, `sheet1.png`, `sheet2.png`).
