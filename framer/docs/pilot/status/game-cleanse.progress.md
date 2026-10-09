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
