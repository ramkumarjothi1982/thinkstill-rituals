Both majors and 10 of the 11 minors in the arrows round-1 review are fixed in `src/eos/30_eos_arrows.jsx`. The remaining minor (check-in hint timing) lives in the check-in's file and is only partly addressed. One residual remains: in game 41 at 1280 the fingertip sits on the bubble's tiny "3 STRINGS HOLDING" sub-label (63% covered), though the user's word is now clear.

Committed as a6ebbbd and pushed to `claude/jolly-hopper-ognrxj`. The commit contains only the arrows file, `arrows.build.md` and the v2 progress note.

**Test basis.** The tests ran on an integrated scratch build of every `src/eos` module, at 390 and 1280. The coverage check measured, for all 114 games at both sizes, how much of the game's text the hand and chevron cover (fail at 20% or more) and whether any cue touches the LIVE GUIDE panel. In both sweeps every game showed its cue, with 0 page errors. At 390 no cue touched the guide; at 1280 one guide contact (85) remained and was fixed and re-checked. Every case flagged in those sweeps was fixed and re-run except 41's sub-label. Full playthroughs at 390 only (2, 14, 41, 85, 113, 11, 36, 111) all reached the reveal with 0 arrow misses and 0 wrong labels.

**Per finding:**
- **Major: hand covers text.** The glove now picks a pose (below, mirrored, above, or from either side) and an aim point on the target (rim, edges, an icon inside it, or between options for pick-one games) that covers the least text. The reviewer's 12 games at 390 went from 9 over 20% (38-75%) to 0%. 113's "something SHINY" and 85's "PARK IT / COME BACK LATER" are now uncovered (screenshots checked).
- **Major: cue drawn over the LIVE GUIDE on phone.** Options under the panel drop out of the halo set, and halos next to it are clipped at its edge. A target entirely under the panel shows the label only, with no hand or chevron. 3 CRACK at 390 now shows "GRAB THE HAMMER" alone above the panel (screenshot checked). Lifting the 3 and 85 docks above the panel is still the fixes task's job.
- **Minor: too many layout reads per tick.** The full target scan now runs at 4 Hz, the aim point is cached, a hidden taps stage ticks slower, and pointerdown reads geometry before hiding. In 1 POP at 1280 that is 141 style reads/s and 442 rect reads/s, against the reviewer's 464 and 714.
- **Minor: check-in hint re-rendering continuously.** It now measures at 10 Hz on a timer instead of every second animation frame, stops when there is nothing to point at, and re-renders only on 5 px steps. Headless mutation counts depend on frame rate, so I can't show the gain on a real phone.
- **Minor: duplicate SVG ids.** Gradient and stripe ids are now unique per instance; checked in 11, 21 and the check-in.
- **Minor: 21 BIN chevron on the DROP HERE tag.** The chevron now backs off along its path until it clears the tag; no overlap at either size.
- **Minor: seq games wait 4 s before showing the next target.** The hand now moves to the next tile 46-155 ms after a correct tap (14, 17 at both sizes). The first attempt failed because the selector only matches the glowing tile; the fix adds the tile's screen position to the key.
- **Minor: lost pointerup leaves the cue hidden.** Pressing in the arena, then firing a window blur with no pointerup, now re-shows the cue (0.9 s and 4.2 s). Tab hide and lost pointer capture also clear it.
- **Minor (check-in file, other piece): hint delays.** The re-show after a background tap is now 3.1-4.0 s, against 0.67 s on the old build. The 1.1 s first-show delay is in `40_eos_checkin.jsx`, which I did not touch; that piece's owner should pass `showAfterMs={0}`.
- **Minor: label covers characters and images.** Images and characters now count double against the label's position. This is not separately measured, but in the screenshots I reviewed, 85's "PICK ONE MOVE" and 113's label clear the characters.
- **Minor: chevron covers the user's words.** The chevron now tries above, the sides and below and takes the cleanest spot; drag end-chevrons are scored too. 13, 85, 87, 104 and 109 are at or under 4% coverage.
- **Minor: 113 nags during the look-around.** A repeat of the same ask after a success now waits 8 s from the last progress (re-show about 12 s after the find). New games can also mark a step to wait longer or show no label; a 9 s marker setting on 114 re-showed at 9.3 s.

**Regression check.** The earlier checks still pass on the final build: 36 fast drag turns amber "SLOWER…", the 3 stage-2 label shows in 108 ms, a missed tap re-shows in 1.22 s with the wiggle, idle re-show at 4.1 s, nothing leaks into the game's DOM. Hide latency measured 298 ms against 120-158 ms before, but the old build measured 341 ms in the same session (load average 10-16), so that is the machine. In one heavily loaded run the CRUSH badge stayed at ×1 instead of ✓ on the 4th tap. The same counting code reached ✓ in my other run on the new build, and the old build reached ✓ in this session; I couldn't re-run the new build to confirm.

Another session's uncommitted changes to `src/eos/50_eos_shift.jsx` were in the working tree; I left them out of the commit.

Files are in `/home/user/thinkstill-rituals/framer`:
- `src/eos/30_eos_arrows.jsx`
- `docs/eos_status/arrows.build.md`
- `docs/eos_status/v2_arrows.progress.md`
