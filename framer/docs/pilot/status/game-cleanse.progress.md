# game-cleanse progress (builder: CLEANSE 109 "Moon Pool")

## Step 1 (calls ~1-20): read spec §0-§3.2/§4, standards, 70/71/79 code. No earlier draft of 73 existed.
Design decisions (deviations from spec, recorded per spec header):
- Orb block = one `<button class="eosPilotHit cOrb">` holding the S1 breath actor (ball, word, caption via `sub=" "` span with `data-cap` + `::after`).
- Hold ripples are CSS on the per-orb `.cPad::after` (behind the label text) instead of the shared 3-node ripple pool, so rings never cross the user's word. Lily pad = `.cPad::before`.
- Ink puffs (stage `ink` pool) travel sideways and spread (dispersing in water) rather than straight down, so they never cover the word label.
- Hero (protagonist) is `disabled` + `pointer-events:none` until the other orbs of the last wave clear; a tap on it plays an in-world "after the others" head-tilt (miss path), never a fail.
- Hero name shows in the caption slot for the intro (until ~1.6 s) and returns at the tableau.
- Petal opening: stagger 34 ms x 560 ms from T0+500 so the last petal completes at T0+1300 (spec's 60 x 700 cannot finish by 1300).
- Fireflies: kit fireflies are hidden in CLEANSE until the afterglow (`data-fx-fireflies="1"`).

## Step 2 (calls ~20-40): 73_pilot_cleanse.jsx written, builds, plays to the reveal at 390 (N=3 and N=6), 0 page errors.
- Progress 0 -> 17 -> ... -> 83 -> 96 -> 100 (100 only at hand-off). Front-row marker centre y=573, back row y=319 at 390.
- DOM at N=6: 219 (count pill moved to arena ::after, gold key moved to .cMirror::before to stay <= 220).
- Moon moved to x~60% at phone: the shared corner companion (top-right) covered it at the spec's 80%.
- Headless CPU is starved (load 8-11): page.screenshot takes ~10 s and screencast frames lag the page by seconds, so finale frames
  are captured with Playwright's fake clock (pause at the last release, runFor to each offset, let in-flight animations settle, shoot).
  These frames show the composition at each beat, not exact mid-animation timing.
- Finale running-animation count sampled mid-finale under starvation: 41-57 (petal transitions + grade transitions + last exhale overlap);
  trimmed: petals no opacity transition, ripple shimmer + STILL quirk stop in the finale, last exhale uses 3 ink puffs.

## Step 3 (calls ~40-58): F1 at 390 passes (finishGame -> reveal, arrows checked, 0 misses, 0 label mismatches, smallText none, 0 errors,
progress 0/33/67/96/100). Desktop rescaled (back 92 / front 114 / hero 122 / lotus 176, rows at 28% / 84%) after the first desktop
sheet looked sparse. Hero win face = last entry of EOS_WIN_FACES[char] (SYNC 63, closed-eye smile; 53 read as fierce).
Checkpoint commit of 73_pilot_cleanse.jsx.
