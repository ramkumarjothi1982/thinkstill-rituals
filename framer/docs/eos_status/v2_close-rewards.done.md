I fixed the major finding and 13 of the 14 minors in `src/eos/52_eos_rewards.jsx`. The arrows-hint finding is in another piece's file, and the capped-loop finding is only partly fixed for the same reason. I tested each fix in an integrated build of all 15 `src/eos` modules (`/tmp/v2_rewards`) at 390x844 and then 1280x860, with zero page errors. Commit c48f779 is pushed to `claude/jolly-hopper-ognrxj`.

- **MAJOR, shelf support link unreachable by keyboard:** the link now closes the shelf, puts focus back on the ◉ chip, then opens the safety card. The shelf's focus trap leaves an open safety card alone. Tested at both sizes: the card opens, focus is inside it, 4 Tab presses stay in it, and Escape closes it with focus back on the chip.
- **Minor, share loses the tap's permission before `navigator.share()` runs:** the card is now drawn in idle time about 1.2 s after the share button appears, and cached. A tap then calls share straight away. A face image that fails to load is remembered for 60 s, so later cards don't wait out the timeout again. In real loops, share was called 12 ms after the tap at 390 and 3 ms at 1280, with the tap still counting as user activation.
- **Minor, iOS share robustness:** same pre-render fix. If share is refused (NotAllowedError), the card is saved instead and the "card saved" toast shows. Same test as above.
- **Minor, alive ref never reset:** the effect now sets it back to true on mount. Checked by reading the code only.
- **Minor, composer focus stolen on phone:** if focus moves outside the game stage, the shelf now closes and leaves focus where the person put it. Tested at both sizes: tapping the composer closes the shelf and focus stays in the input.
- **Minor, a grant with no key pays twice:** a fallback key is kept for the visit. Calling `grantForShift(null)` twice before any launch gave 1 orb and the same result both times.
- **Minor, chip count bounces twice:** the backup timer is cleared when the orb lands, and the number only bounces when the count went up. A real loop gave exactly 1 bounce at both sizes.
- **Minor, capped day (rewards part only):** an orb landing on an unchanged count does nothing. With 5 orbs already granted, a 6th real loop kept the count at 5 with no bounce. The flying orb and the "+1" pill on a capped loop come from `50_eos_shift.jsx`, which is the shift piece, so they still appear.
- **Minor, chip shows the new face before the orb lands:** the chip's face, gold rim and count now change together. Sampling every 60 ms during real loops, they changed in the same sample at landing, at both sizes.
- **Minor, empty and locked shelf states:**
  - The locked face is now the real face, blurred and dimmed, with a "?" sparkle.
  - Characters with no orbs and no bond share one "crew you'll meet" row.
  - Owned orbs sit on a glowing ledge.

  Tested: 2 shelves plus a crew row of 5, and I looked at a 390 screenshot.
- **Minor, stat tile grammar:** every tile is now singular or plural as needed ("day you showed up", "memory orbs").
- **Minor, day-one zeros and the chip on the welcome bubble:** with both counts at 0, the chips show no numbers and are faded to 60%. On phone, the empty chip is hidden while the 3-second first-visit welcome bubble is up. Tested: the numbers are hidden, and the chip is hidden during the bubble and visible after.
- **Minor, share card legibility and dust:** gold text now sits on a dark see-through pill with a darker outline. The dust is drawn as 3 spiral arms that end at the calm character's orb. I looked at the rendered anger and week story cards.
- **Minor, dust unlock has no reward moment:**
  - The reward line now says "new Thought Dust: aurora ✦" once, the first time a style unlocks.
  - A dot appears on the ◉ chip until the shelf is opened, and that style's swatch reads "new ✦".
  - Each swatch animates in its own style; the animation is off with reduced motion or calm visuals.

  Tested at both sizes: the line, the dot, the "new ✦" label and the dot clearing when the shelf opens. With reduced motion, no swatch animates.
- **Minor, the "ALL DONE?" hint covers the reward text:** not changed. It lives in `30_eos_arrows.jsx`, which another agent was editing.

Also checked: the copy lint passes and the shelf has no text under 12 px. Game 110 (picked by the check-in for one sad loop) didn't reach the end within the test helper's 120 s limit at 1280 under machine load. Re-run on its own with a longer limit, it completed in 229 s.

Two follow-ups for the shift piece's owner:
- **Capped loop:** in `50_eos_shift.jsx`, only fly the orb and show "+1" when `pay.grant.orb` is set.
- **Arrows hint:** in `30_eos_arrows.jsx`, move the hint off the rewards line.

My changes are in `/home/user/thinkstill-rituals/framer/src/eos/52_eos_rewards.jsx`. The notes are a close-out table appended to `/home/user/thinkstill-rituals/framer/docs/eos_status/rewards.build.md` and `/home/user/thinkstill-rituals/framer/docs/eos_status/v2_rewards.progress.md`.
