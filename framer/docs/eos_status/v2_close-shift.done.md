All 14 findings in review r1 are fixed in `framer/src/eos/50_eos_shift.jsx`, though one fix (finding 14, the hint) has no screenshot showing the hand. I tested in the isolated integrated build `/tmp/v2_shift` (every src/eos module) at 390x844 and 1280x860. Every run had 0 page errors and 0 warnings.

The code changes were already committed by a checkpoint commit, `ec1251a` ("WIP: shift meter close-out checkpoint"), which I didn't make. The shift file in HEAD matches what I tested. My commit `d7b7187` adds only the three docs and is pushed to `claude/jolly-hopper-ognrxj`.

1. **Major – the "change" link for the starting rating closed before anyone could use it:** that chip now sits above the "now" dial. Touching it or its dial pauses the auto-continue, and so does leaving its dial open; "done" restarts the timer. While the chip is shown the wait is 1.6 s instead of 0.9 s. Tested both orders:
   - "now" = 3 first, then "change" right away: the step stayed open for 2.6 s with the dial open, and after "done" the row was {before:9, after:3, retro:1} with "ANGER 9 → 3".
   - Chip first: the row was {before:6, after:2, retro:1}.
2. **Major – when the character is STILL itself (GOOD / NOT SURE) it slid off-centre or vanished at the payoff:** a new `.isSolo` class keeps it out of every hand-back, reduced-motion and calm rule, and gives it the gold rim. GOOD 4→8 at 390: the orb is at the centre (195), name tag visible, rim gold. Reduced motion at 1280: centred at 640, fully visible.
3. **Major – card sat about 150 px left of centre at 1280:** while the meter shows, the reveal uses an 84px / 1fr / 84px grid and the card is centred. The card's centre measured 640 in the moment, rating and done steps, with PREVIOUS and NEXT beside it.
4. **Minor – the veteran "one big sigh?" chip could fire the payoff mid-breath:** tapping it now cancels the pending timer. Set the dial and tapped the chip a few ms later: still in the moment 1.8 s on, the value was kept, and ✓ SET worked.
5. **Minor – "You've shifted 3 times" counted skips:** it now counts only rated loops this session. With 3 earlier skips plus one rated loop the line did not appear.
6. **Minor – the bump when the orb lands on its chip was cut short:** that animation is no longer cancelled by the flying orb's cleanup. Checked in code only; the landing itself was confirmed (orb count 1 in the chip).
7. **Minor – swipes couldn't scroll the moment on short phones:** `touch-action:none` is now only on the orb. Measured "auto" on the moment and "none" on the orb.
8. **Minor – dial digits rendered at 11.6 px on phone:** set to 13.5 px inside the meter. The small-text check at 12 px is clean in the rating and done steps at 390.
9. **Minor – untouched moments were slow:** the wait before it starts by itself is now 2.5 s for cool and 4 s for sigh. Untouched sigh took 12.3 s (was about 15 s) and untouched cool 16.7 s at 1280 (was 23.1 s).
10. **Minor – on phone the payoff jumped down 60 px and text scrolled under the world chips:** the returning reveal text now appears below the meter, and the overlay fades out its top 60 px. The headline stays at y=293 from payoff to done, I'M GOOD is at y=487, and the scrolled screenshot shows no text under the chips. Copy lint and small-text checks are clean.
11. **Minor – a failed STILL face image showed a red letter disc:** the image now retries once after 800 ms. Only then does it fall back to a calm face drawing in the character's own colour (STILL's cyan). Tested both ways:
    - First request blocked: the retry loaded and there was no fallback.
    - All requests blocked: the fallback face drawing in STILL's cyan appeared, no letter.
12. **Minor – RUSH's calm face looked like shouting:** inside the shift module only, anger now uses RUSH face 59 (eyes closed, headphones), chosen from the face options. Seen in the 1280 screenshot. The core file is unchanged.
13. **Minor – long game names in ONE MORE were cut off at 1280:** the name now wraps. "COOL THE VOLCANO" shows in full on two lines in the screenshot.
14. **Minor – the hand hint covered the character's face:** the Still Moment hint now aims at the orb's lower-right instead of its centre. Measured: the hold demo is centred 25 px right and 25 px down of the orb's centre. Two limits:
    - I never saw the hand on screen. At the times I checked it was fully transparent, both with this change and in a build without it, so the change didn't cause that, but its look is unconfirmed.
    - I left the "SLIDE TO RIGHT NOW" arrows on the dial unchanged; moving them would need a change in the arrows module.

The scenario scripts are in `/tmp/claude-0/-home-user-thinkstill-rituals/b5e1bfa3-ddef-5c62-9291-4d212bc0e4f1/scratchpad/t/` (run `s.mjs <scenario> <width>`). The results are written into `docs/eos_status/shift.build.md` under "Close-out of review r1", and progress notes are in `docs/eos_status/v2_shift.progress.md`.
