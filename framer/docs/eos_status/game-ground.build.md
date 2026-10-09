BUILD game-ground (round 1 fixes): FINISHED. Both review_r1 findings marked major and all 9 minor findings are fixed in /home/user/thinkstill-rituals/framer/src/eos/23_eos_game_ground.jsx. I re-measured at 7 viewports and played the game to the finish with pointer and with reduced motion. 0 errors.

ROUND 1: WHAT CHANGED (per finding)
1. MAJOR: short phones overflow the safe box, and the words, cue and tags collide (code review + experience review).
   - eosGroundLayout no longer has the 260 px floor. It lays out in the real safe box, which is never stretched.
   - New compact tier for narrow boxes under 340 px tall (wide boxes under 250 px). This covers 390x664 (Safari with toolbars), 375x667 (SE), 360x640 and 390x740.
     - The 5 lamps sit in one row on the hill, 48-54 px each, so 64-70 px with the 8 px hit halo.
     - Spot beacons are in columns 0, 2 and 4. Each has a one-line pill below the lamp with the ↻ inside its right end.
     - Body beacons are in columns 1 and 3. Each has a one-line pill above the lamp with an inline HOLD chip.
     - Pills are 14 px. Edge pills shift inwards, and the upper pills lean away from the centre.
     - Every mission has a short `c` label for this tier (BLUE, SOFT, far sound, a smell, CHAIR, …). The icon carries the sense, and aria-labels keep the full mission.
     - The cue is one line. The sub-line is dropped, except at the finale, where "Touchdown · you're right here" cross-fades into "The what-ifs aren't here yet."
     - RH = 0.92 x band, from 40 to 150 px. The rocket lands on the band floor, above the upper pills.
   - Worry words are now placed from their measured sizes by eosGroundPack (layout effect, before paint).
     - They alternate sides and stack one word per row when the band is tall enough, with rows flowing otherwise.
     - Rows are spaced evenly from the band top (below the reserved cue height), and the right column sits half a step lower.
     - A word that still does not fit waits hidden. It fades into an earlier word's place 1.7 s after that word burns, and the host's found icon stays hidden.
     - The found icon's size (--fi) follows the row pitch (24-44 px).
   - The hero clamp is covered under finding 6.
   - Measured result (start, paused, mid and done, at 390x664, 375x667, 360x640, 390x740, 390x844, 1280x860 and 1280x720):
     - 0 element pairs overlap among the cue, words, lamps, pills, ↻, rocket and hero.
     - 0 elements sit outside the safe box, and 0 pills overflow.
     - The smallest text is 13.5 px (the HOLD chip).
     - At 360x640, 1 of the 5 words queues, then appears.
2. MINOR: the arrow's hold marker disagreed with the beacon's ring.
   - The body marker is now eosTarget({g:"hold", ms: need - acc (at least 200, assist-aware), mvar:"--f", label}).
   - Measured after a 1.2 s hold and release, then re-aiming: {g:"hold", ms:1758, mvar:"--f", "HOLD · FEET DOWN"}, with --f 0.414 on the button.
   - Also fixed: a hold released after the ring was already full, but before the next frame, now lights the beacon. Before, it stayed "paused" at 100 %.
3. MINOR: a non-soft sfx fired from a timer.
   - touchdown() no longer calls fx.sfx("win"). The thump and arpeggio are eosTone only.
   - The 5th lit beacon now plays "win" as its single scored step, in place of tskey:clean:4. That beacon is still lit by the player's own find or hold.
   - Logged sfx: tskey:clean:0-3, then win. That is 5 non-soft sounds and none from a timer.
   - Lead note: 111 (sigh) and 114 (lanterns) still fire "win" from their finale timers.
4. MINOR (performance):
   - These no longer animate in the landing or done phase: the static bars (they also stop at 4 lit, when they are nearly clear), the fog-front puffs, the fog puffs (done) and the flame (done).
   - The rAF loop stops once the phase is done.
   - At done + 1.5 s at 390x844, 33 animated nodes are running. 12 of them are infinite, and all 12 are visible: twinkle x5, lamp glow x5, antenna, and the hero's happy bob.
   - Reduced motion at 375x667 runs 0 infinite animations.
5. MINOR: touch hardening. The lamp button and ↻ now have onContextMenu preventDefault (measured defaultPrevented true, true). The lamp button and ↻ also have -webkit-touch-callout:none and user-select:none.
6. MINOR: the hero overlapped the cue.
   - The hop peak drops from -0.45·hs to -0.28·hs.
   - --hy is clamped so that the hero's top, including the hop peak and the 5 px bob, stays at least 10 px below the reserved cue box.
   - Measured minimum gap between the hero image and the cue, sampled every 220 ms through the finale: 30-40 px at every size.
7. MINOR: the swap hit area covered the lamp's rim.
   - Standard tier: the ↻ hit box starts 9 px outside the lamp's radius, beyond the 8 px halo.
   - The front-centre beacon's ↻ faces its body neighbour. Body beacons carry no badge, so two ↻ never meet.
   - HOLD is now a plate on the lamp's lower rim in the standard tier, and an inline chip in compact pills.
   - On phone the ↻ is centred beside the lamp. On desktop it sits beside the lamp's lower half, clear of the staggered back-row labels, which now step back 1.05·L.
   - elementFromPoint at 85%/15%, 95%/30%, 50%/3%, 97%/50% and 15%/85% of every spot lamp hits the lamp at 390x844 and 390x664.
8. MINOR: GLITCH's face was hard to read.
   - The dome now has a warm back-light (a cream radial behind the face).
   - The face has brightness 1.28 and saturate 1.1.
   - The dome is about 15 % larger on phones (inset 4 % instead of 9 %).
   - New face arc, picked by looking at the art: E15 worried side-glance, then E49 soft shy wave (2 beacons), then E07 big grin (4 beacons), then E58 open-mouthed happy (hop-out).
   - Body language: the hull shivers (stepped ±0.9 px) while 0-1 beacons are lit, holds steady at 2, and does a squash bounce at 3-4. Under calm visuals it stays still.
   - The rocket close-up (game-ground_r1_rocket_390.png) shows eyes and face readable.
9. MINOR: the shoulders icon 🫁 is now 💆.
10. MINOR: fragments in the fog.
    - eosGroundWords now takes up to 8 chunks.
    - It trims dangling function words: and, or, but, so, then, the, to, of, a, an, my, your, because, with, for, in, on, at.
    - While there are more than 5 chunks, it merges the shortest adjacent pair of 22 characters or fewer, preferring later pairs.
    - The input "what if I fail the exam tomorrow and everyone sees" now gives what if · I fail · the exam · tomorrow · everyone sees.
    - Neutral words under a strong safety flag are left untouched. This runs in this file only; core eosWords is unchanged.
11. MINOR: desktop scale.
    - Wide labels are one line (labH 30 when mw >= 176), and the wide lamp is clamped to 64-78 px.
    - RH = 0.8 x band, up to min(240, 0.3·Hb). At 1280x860 that is 137 px, up from 92.
- Extra: a lit lamp's icon becomes the thing you found (👀 → 💎, ✋ → 🧸 …).

WHAT I BUILT (unchanged design, summary)
- The 3-layer scene:
  - Sky: anxiety violet, which turns into the calm sky for the local time of day, plus an aurora.
  - Hill, pad and a fog band with a blur veil (8 → 0) and puffs.
  - GLITCH's rocket, lit with a key light and a rim light.
- The worry words hang in the fog: the user's own words, padded with seed phrases. They appear only inside EosWord.
- 3 SPOT beacons: a tap means "found it". The lamp fills over 1.2 s, or 2.4 s when the tap comes within 1.5 s of the last one. Each has a ↻ swap through a pool of 14 missions that rotate through the senses.
- 2 BODY beacons: 3 s accumulated holds. Releasing pauses the hold and never resets it.
- Each lit beacon:
  - turns gold with sparks;
  - plays a rising pentatonic note (one scored step) with a hit haptic;
  - sweeps its searchlight beam to burn off one word (embers, then the found icon);
  - steps the rocket down and changes GLITCH's face.
- The finale is a first-class state played before 100 %:
  - landing: legs drop and the static fades;
  - touchdown: dust ring, squash, eosTone thump and arpeggio;
  - GLITCH hops out, the beams fan up in a salute, and the found icons join into a gold constellation.
- Progress:
  - It goes up in steps of 18 per lit beacon, with partial progress below 18 while filling or holding.
  - The 5th beacon brings it to 90 and touchdown to 96. It reaches 100 1.9 s after touchdown.
  - onDone(260-360) fires once, 450 ms after 100.
- Reduced motion and calm visuals: everything runs in steps or fades, with no loops.

EXPORTS: EOS_GAME_113, EosGroundControlEngine and EOS_GROUND_CSS. New private top-level names are all eosGround* or EOS_GROUND_*: eosGroundPack, eosGroundTidy, eosGroundSide, eosGroundNoMenu, EOS_GROUND_TRIM_END and EOS_GROUND_TRIM_START. The registration is unchanged ({hint, mindBend, css, gesture:"tap", char:"glitch", seconds:30}). The dev handle is still window.__eos.ground.state() / pool().

INTEGRATOR: NOTHING NEW TO WIRE. The marker is still on button.eosGroundLampBtn. Body markers now carry data-eos-mvar="--f", which the arrows module's readMeter reads from the button's computed style (inherited from .eosGroundBeacon).

ACCEPTANCE (round 1 re-test)
- Builds:
  - Scratch integrated build: python3 dev/eos_integrate.py --dev-dir /tmp/eos_game-ground_int --modules 23_eos_game_ground.jsx → OK.
  - Isolated build: python3 build.py --dev-dir /tmp/eos_game-ground --modules 00_eos_core.jsx,23_eos_game_ground.jsx → OK. It loads with 0 errors and the menu starts GROUND CONTROL. Without the integration edits the arcade's legacy route renders it, as expected.
- Scripts: /tmp/gg2/m.mjs (geometry across all viewports and phases, with a full play), t2.mjs (marker, contextmenu, animations, lint), t3.mjs (rim taps, running animations, reduced finish) and t4.mjs (isolated smoke).
- Geometry: see finding 1. Lamps are 48 px (360x640), 51 (375x667), 54 (390x664 / 390x740), 59 (390x844) and 73 (1280x860).
- Progress logs are strictly increasing at every size, for example 0,4,7,18,19,22,25,28,36,40,43,54,55,58,61,64,72,76,79,90,96,100.
- finishGame(113):
  - 390x844: done in 24.7-30.9 s, with 0 arrowMisses and 0 labelMismatches.
  - 375x667 with reduced motion: done in 41.1 s (the driver's pace plus the 26 s assist), with 0 misses and 0 mismatches. The progress tail is 90, 96, 100.
- smallText(12) inside .eosG113 found nothing. Every remaining hit is the wrapper's header or reveal, outside this module. lintCopy found nothing. 0 page errors and 0 warnings in every run.

SCREENSHOTS (/home/user/thinkstill-rituals/framer/dev/shots/eos/, git-ignored): game-ground_r1_{start,mid,done}_375x667.png, _start_390x664.png, _done_390x664.png, _start_360x640.png, _start/_done_390x740.png, _start/_mid/_done_390x844.png, _start/_done_1280x860.png, _start/_mid_1280x720.png and _rocket_390.png. I reviewed them as contact sheets.
- Compact phones: clean rows. The worry words sit left and right of the rocket, and the HOLD pills sit above with the ↻ pills below. The finale shows the cross-faded line, the constellation and the hero over the landed rocket.
- 390x844: the standard layout is as before, with HOLD plates on the lamps and each ↻ beside its lamp.
- Desktop: the rocket is bigger, with one-line labels.

KNOWN LIMITATIONS
- The wrapper's step-reward cards ("RELEASED ✓ +10 ×2", "SPACE ✓ +16 ×5") still cover a lamp or label for about 1 s after each scored step. That is wrapper behaviour; the next move is never blocked for long.
- In the compact tier the non-targeted missions show their short label (for example "SOFT" with ✋). The full sentence stays in the aria-label, and the start cue says "Spot each thing in your room".
- Desktop 1280x720 (a 316 px box) still has a modest rocket (about 60-70 px) because its band is short.
- 111 and 114 still fire "win" from their finale timers. Whether they should match 113 is a lead decision.
- Headless timings depend on machine load. Image-only input (thumbnails above the fog words) is implemented and is measured by the word packer like any other word, but I did not exercise it at runtime.
