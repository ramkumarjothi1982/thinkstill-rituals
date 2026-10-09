# ThinkStill Release Arcade: Quality Report, games 1-110

**For:** the owner · **Rated:** 2026-10-09 · **Scope:** the 110 existing games. Games 111-114 (BIG SIGH, COOL THE VOLCANO, GROUND CONTROL, SKY LANTERNS) are new. The build pipeline reviews them separately, so they are not scored here.

**Evidence behind every number**
- **Screenshots.** Every game was played with its real gestures in a headless Chromium browser at phone size (390×844) and desktop size (1280×860). Each size has four captures: start, mid-play, finish and reveal. Contact sheets are in `framer/dev/shots/quality/sheets/<id>.png`: row 1 is desktop, row 2 is phone.
- **Ratings.** Eight rating batches are in `framer/docs/quality/batch_1.json` … `batch_8.json`. Every score there cites the screenshot tile it is based on.
- **Performance.** There are 220 performance runs in `framer/docs/quality/metrics.json`.
- **Routing.** Which games users meet first comes from `EOS_EMOTION_ROUTES` in `framer/docs/briefs/router.md` §7.2.

**How to read the scores.** There are eight axes, each scored 1-10, phone first:

| | Axis | Question asked |
|---|---|---|
| A | Light & polish | Warm cinematic light, depth, materials? |
| B | Distinct world | Does this game have its own place, or the shared backdrop? |
| C | Interaction feel | Weight, anticipation, squash and stretch, juice? |
| D | Characters | Do the emotion characters act and transform, or just sit there? |
| E | Unique finale | Is there a payoff designed for this game? |
| F | Clarity | Do you know what to do within 2 seconds? |
| G | Mobile | Does it work at 390 px: nothing clipped, large targets, readable text? |
| H | Relief fit | Does the mechanic actually help the feeling? |

**Overall** is the mean of A-H. **Premium-ready** means every axis is at least 8 and there is no performance flag (Creative Standards §8). Scores were not inflated (Standard 6).

---

## 0. Readiness at a glance

| Readiness level | Pass | Fail | What blocks the rest |
|---|---:|---:|---|
| **Functional-ready** (plays to the end on phone and desktop, no errors, progress never goes back) | **90** | 20 | **14 games stall on at least one size:** 8, 14, 17, 21, 28, 34, 45, 47, 48, 51, 71, 77, 103 and 107. **6 more** have broken progress or never show the reveal: 37, 63, 67, 68, 69 and 96. |
| **Visual-ready** (text ≥12 px, user words ≥15 px, bubble rules pass, nothing clipped or overlapping at 390 and 1280) | **0** | 110 | **Every phone screenshot:** the header title is clipped ("MOTIONAL RELEASE CONSO…") under the LVL pill, and the mic icon covers the end of the input text. **In 91 games** the "+STILL HIT · CHAIN" toast lands on the control or guide. **72 games** fail the bubble image rules. |
| **Premium-ready** (every axis ≥8, no performance flag) | **0** | 110 | No game reaches 8 on even a single axis. The best overall is 5.12 (102 FINGER TRAP). The highest single score anywhere is 7, for relief fit. |
| **Complete** (all three) | **0** | 110 | |

| Kind of work needed | Games |
|---|---:|
| **Structural:** the mechanic, feedback loop, character role or finale must change | **110** |
| Polish only | 0 |
| None | 0 |

**Notes on the counts**
- **Rater effort estimates:** M for 56 games, L for 54. No game is S.
- **Bubble image rules** (circular image, no box, text below, no overlap, nothing clipped): 38 pass and 72 fail.
- **Four more games were counted functional by the raters, but our runs never showed their reveal.** Their progress bar hits 100% and the reveal does not follow: 42 (desktop), 70, 74, and 109 CLEANSE. CLEANSE matters most, because it is a front-door game (see §9). Treat all four as functional bugs.
- **Routing context.**
  - 69 of the 110 games are auto-routed to users: 6 heroes and 63 routed games.
  - 14 are bench and 27 are vault. Both are menu-only and never auto-routed.
  - Today, with 111-114 built and 115-120 not yet built, **19 existing games are the first or second game a user meets** in at least one emotion band. They are listed in §9.

---

## 1. Headline verdict

**None of the 110 existing games is premium-ready today, and none is visual-ready.** The arcade works: 90 games play to the end. But it looks and feels like one template re-skinned 110 times, not 110 cinematic scenes. The mechanics are mostly well chosen. Relief fit is the strongest axis, and three games score 7 on it. What is missing is the layer that makes it Pixar or Netflix quality: a world per game, characters that act, and a finale per game.

**Average score per axis (all 110 games; mean overall 3.19 / 10)**

| Axis | Average | Best | Games scoring ≥5 | In one line |
|---|---:|---:|---:|---|
| A Light & polish | 3.68 | 6 | 15 | glossy gradients with no light source or depth |
| B Distinct world | **2.85** | 5 | 4 | the same nebula and ring stage everywhere |
| C Interaction feel | 3.09 | 6 | 8 | taps register, but little anticipation, squash or impact |
| D Characters | **1.99** | 6 | 3 | decorations, not participants |
| E Unique finale | **2.09** | 3 | 0 | one shared reveal card for all 110 |
| F Clarity | 3.90 | 6 | 29 | usually clear, but tiny words and toasts over controls |
| G Mobile | 3.57 | 5 | 23 | clipped header in every game, plus many layout overlaps |
| H Relief fit | 4.33 | 7 | 48 | the best axis: the ideas are right |

**The three biggest cross-cutting gaps**

1. **Characters watch; they do not act.** 85 of 110 games score 2 or less on Characters.
   - **50 games** have no character in the play area, only blurred decals at the stage edges.
   - **33 games** show a 22-30 px sticker in a dark capsule. It changes only when the word changes.
   - **20 games** have large portraits or pieces that never react.
   - **4 games** use characters only as confetti. **3 games** show a partial transformation.
   - **No game has squash on a hit, a face that changes with progress, or a celebration at the end.**
   - **10 games finish on a distressed face.** The face follows the user's last word ("…I feel panic"), not their progress. Details are in §6.
2. **Every game has the same finale.** No game scores above 3 on Finale.
   - All 110 end on the same "RELEASE COMPLETE / FEEL A SHIFT?" text card over an empty dark backdrop, with no character and nothing from the game.
   - The finish moments before the card come from three shared effects:
     - a white centre flash (seen in 20+ games)
     - a ray burst with a tilted "RELEASED · SHIFT COMPLETE" card (14+)
     - a swarm of character-head confetti (8)
   - On desktop, the reveal card is missing entirely in 20 games: only the PREVIOUS and NEXT pills show.
   - The round counter disagrees with the progress bar in 20 games, for example "1/6" at 100%.
3. **Every game uses the same world.** Distinct world averages 2.85, and 87 games score 3 or less.
   - Every game plays on the same dark nebula and concentric-ring stage, with the same glass panels and cyan-to-magenta gradient pills. Only the prop in the middle changes.
   - **92 games fall into 11 visual look-alike clusters** (§5). The largest is the "THOUGHT MOVE pill" template, with 23 games.

**The cheapest big win sits under all three: phone chrome.** It is one shared fix that unblocks Visual-ready for most games. Today:
- the header is clipped in every phone screenshot, and the mic covers the input text;
- the toast pill covers the control being played in 91 games;
- user words render below 15 px in about 70 games (often 6-9 px);
- 51 games score 3 or less on Mobile.

---

## 2. All 110 games, ranked

- **Overall** is the mean of A-H.
- **Router (today)** gives each game's routing verdict:
  - **1st** = the first game a user meets in that emotion band today (111-114 are built; 115-120 are not yet);
  - **2nd** = the next pick after a new hero;
  - otherwise the game's best placements (emotion.band#rank).
- **Perf flags** compare each run against the fleet:
  - phone p95 frame time ≥850 ms, or desktop p95 ≥1067 ms (the fleet's 90th percentile);
  - a single long task ≥1.5 s;
  - total blocked main-thread time above the fleet's 90th percentile;
  - a stall, or 100% progress with no reveal;
  - DOM ≥600 nodes, or heap growth ≥7 MB.
- Every game exceeds the absolute budgets (p95 ≤34 ms, max ≤120 ms) under headless software rendering, so "fleet norm" still means "not yet measured on a real phone" (§7).

| # | ID | Game | Overall | A·B·C·D·E·F·G·H | Weakest axis | Functional | Premium | Router (today) | Perf flags (vs fleet) |
|---:|---:|---|---:|---|---|---|---|---|---|
| 1 | 102 | FINGER TRAP | 5.12 | 6·5·5·4·3·6·5·7 | Finale 3 | yes | no | routed · 2nd panic.mid, fear.high, general.mid | desktop: p95 1183 ms |
| 2 | 110 | RAIN OUT | 4.50 | 6·4·4·6·3·4·2·7 | Mobile 2 | yes | no | hero · **1st** sad.high, sad.mid | desktop: 1.8 s long task |
| 3 | 29 | MUTE | 4.50 | 5·4·5·3·2·6·5·6 | Finale 2 | yes | no | routed · overthinking.mid#8 | fleet norm |
| 4 | 32 | PARK IT | 4.50 | 5·3·5·4·2·6·5·6 | Finale 2 | yes | no | routed · anxiety.mid#3, overwhelm.mid#6 | fleet norm |
| 5 | 109 | CLEANSE | 4.50 | 5·4·5·3·3·5·5·6 | Characters/Finale 3 | yes | no | routed · **1st** shame.high | phone: 100% but no reveal; desktop: 100% but no reveal, 3.0 s long task |
| 6 | 100 | HOT POTATO | 4.38 | 5·3·4·5·3·5·4·6 | World/Finale 3 | yes | no | routed · 2nd anger.mid | fleet norm |
| 7 | 24 | SLINGSHOT | 4.25 | 4·3·6·2·3·6·4·6 | Characters 2 | yes | no | routed · anxiety.mid#5 | fleet norm |
| 8 | 64 | RED LIGHT | 4.12 | 4·3·4·3·3·6·5·5 | World/Characters/Finale 3 | yes | no | routed · anger.low#4 | phone: 18 s blocked; desktop: heap +7.1 MB |
| 9 | 36 | CLOUD PASS | 4.00 | 5·4·4·1·2·4·5·7 | Characters 1 | yes | no | routed · panic.mid#3, panic.high#4 | fleet norm |
| 10 | 105 | DRAMA MACHINE | 4.00 | 5·3·4·5·3·4·2·6 | Mobile 2 | yes | no | hero · **1st** panic.low, overthinking.low | fleet norm |
| 11 | 22 | FLUSH | 4.00 | 6·5·4·2·3·4·3·5 | Characters 2 | yes | no | routed · overthinking.mid#7 | fleet norm |
| 12 | 101 | TUG OF WAR | 3.88 | 4·3·4·3·3·4·4·6 | World/Characters/Finale 3 | yes | no | routed · anxiety.mid#4, anger.mid#9 | fleet norm |
| 13 | 80 | DON'T TAP | 3.88 | 4·2·3·2·3·6·5·6 | World/Characters 2 | yes | no | vault | desktop: 1.6 s long task |
| 14 | 39 | BLACK HOLE | 3.88 | 5·4·4·1·2·5·5·5 | Characters 1 | yes | no | routed · overwhelm.low#4 | fleet norm |
| 15 | 33 | FLOAT AWAY | 3.75 | 4·3·3·4·2·4·4·6 | Finale 2 | yes | no | routed · sad.mid#3 | phone: p95 1300 ms, 24 s blocked; desktop: p95 1133 ms, 1.6 s long task, 12 s blocked |
| 16 | 1 | POP | 3.75 | 4·2·5·2·3·6·3·5 | World/Characters 2 | yes | no | hero · **1st** anxiety.low, general.mid, general.low | fleet norm |
| 17 | 6 | ZAP | 3.75 | 5·4·5·2·3·4·2·5 | Characters/Mobile 2 | yes | no | bench | phone: 691 DOM nodes; desktop: 691 DOM nodes |
| 18 | 40 | PAPER PLANE | 3.75 | 4·3·4·1·3·6·4·5 | Characters 1 | yes | no | routed · sad.mid#4 | fleet norm |
| 19 | 65 | PAUSE BUTTON | 3.75 | 4·2·4·2·2·6·5·5 | World/Characters/Finale 2 | yes | no | routed · anger.high#3, panic.high#5, panic.mid#7 | desktop: p95 1450 ms |
| 20 | 93 | SPACE MAKER | 3.75 | 4·4·4·3·2·5·3·5 | Finale 2 | yes | no | routed · **1st** overwhelm.mid | fleet norm |
| 21 | 26 | SEND TO SPACE | 3.75 | 4·4·3·2·2·5·5·5 | Characters/Finale 2 | yes | no | bench | fleet norm |
| 22 | 73 | TRAFFIC LIGHT | 3.75 | 4·3·3·2·3·6·5·4 | Characters 2 | yes | no | vault | phone: p95 1067 ms |
| 23 | 74 | BUBBLE WRAP | 3.62 | 4·4·3·1·2·4·5·6 | Characters 1 | yes | no | routed · numb.high#5, numb.mid#8 | phone: 100% but no reveal, 19 s blocked; desktop: 100% but no reveal, p95 1383 ms, 17 s blocked |
| 24 | 106 | TINY SOUNDTRACK | 3.62 | 4·3·4·3·2·4·4·5 | Finale 2 | yes | no | hero · **1st** sad.low, lonely.low, numb.low, good.high, good.mid, good.low | fleet norm |
| 25 | 15 | SHRED | 3.62 | 5·5·4·3·3·3·2·4 | Mobile 2 | yes | no | routed · anger.mid#4 | desktop: p95 1150 ms |
| 26 | 46 | UNPIN | 3.62 | 4·4·3·2·2·5·5·4 | Characters/Finale 2 | yes | no | bench | fleet norm |
| 27 | 104 | VOLUME KNOB | 3.50 | 4·2·4·3·2·4·3·6 | World/Finale 2 | yes | no | routed · **1st** shame.mid | phone: 18 s blocked |
| 28 | 34 | RIVER | 3.50 | 3·4·3·1·2·4·5·6 | Characters 1 | **no** | no | routed · **1st** overthinking.mid | phone: 2.0 s long task; desktop: stalls at 67% |
| 29 | 53 | CARTOONIFY | 3.50 | 4·2·4·2·2·5·4·5 | World/Characters/Finale 2 | yes | no | routed · 2nd shame.low | fleet norm |
| 30 | 61 | FREEZE | 3.50 | 4·4·4·1·2·4·4·5 | Characters 1 | yes | no | routed · 2nd overthinking.high, overthinking.mid | fleet norm |
| 31 | 41 | UNHOOK | 3.50 | 4·5·3·2·2·4·3·5 | Characters/Finale 2 | yes | no | routed · overthinking.mid#6 | desktop: p95 2100 ms, 1.9 s long task, 26 s blocked |
| 32 | 79 | MISS ON PURPOSE | 3.50 | 4·2·3·2·2·5·5·5 | World/Characters/Finale 2 | yes | no | routed · shame.low#3, shame.mid#6 | phone: 18 s blocked |
| 33 | 88 | TRADE MACHINE | 3.50 | 4·3·3·2·3·4·4·5 | Characters 2 | yes | no | routed · **1st** jealous.low | phone: p95 1117 ms |
| 34 | 89 | DOOR A / B | 3.50 | 5·4·3·3·2·4·4·3 | Finale 2 | yes | no | routed · fear.mid#6 | desktop: 2.6 s long task |
| 35 | 18 | BURN | 3.38 | 4·3·4·2·2·4·3·5 | Characters/Finale 2 | yes | no | routed · anger.mid#6 | phone: 3.0 s long task |
| 36 | 25 | SWIPE AWAY | 3.38 | 3·2·4·2·2·5·4·5 | World/Characters/Finale 2 | yes | no | routed · jealous.mid#4, numb.low#4, general.low#4 +3 | phone: 1.8 s long task |
| 37 | 75 | INK BLEED | 3.38 | 3·4·4·1·3·3·4·5 | Characters 1 | yes | no | routed · sad.mid#5 | fleet norm |
| 38 | 83 | SORT STATION | 3.38 | 4·3·2·2·2·5·4·5 | Feel/Characters/Finale 2 | yes | no | vault | desktop: heap +7.2 MB |
| 39 | 30 | ZOOM OUT | 3.38 | 3·3·3·2·2·5·5·4 | Characters/Finale 2 | yes | no | routed · 2nd overwhelm.low | phone: p95 900 ms |
| 40 | 82 | SEESAW | 3.38 | 4·4·3·2·3·4·3·4 | Characters 2 | yes | no | vault | desktop: 3.8 s long task |
| 41 | 87 | KEEP / DROP | 3.38 | 4·3·3·3·2·4·4·4 | Finale 2 | yes | no | routed · overwhelm.mid#5 | phone: p95 917 ms |
| 42 | 97 | X-RAY | 3.38 | 4·3·4·3·3·3·4·3 | World/Characters/Finale/Clarity/Relief 3 | yes | no | routed · 2nd fear.mid | fleet norm |
| 43 | 43 | CUT THE LOOP | 3.25 | 4·4·4·1·3·3·2·5 | Characters 1 | yes | no | routed · overthinking.mid#5 | fleet norm |
| 44 | 70 | METRONOME | 3.25 | 3·3·3·2·2·4·4·5 | Characters/Finale 2 | yes | no | bench | phone: 100% but no reveal, p95 933 ms, 30 s blocked; desktop: 100% but no reveal |
| 45 | 107 | GO WEIRD | 3.25 | 5·3·3·4·2·3·1·5 | Mobile 1 | **no** | no | hero · **1st** shame.low, fear.low | phone: stalls at 0% |
| 46 | 49 | UNZIP | 3.25 | 3·2·4·2·2·5·4·4 | World/Characters/Finale 2 | yes | no | bench | fleet norm |
| 47 | 7 | PIN POP | 3.25 | 4·3·3·3·2·4·3·4 | Finale 2 | yes | no | bench | fleet norm |
| 48 | 4 | STOMP | 3.12 | 4·2·4·2·3·3·2·5 | World/Characters/Mobile 2 | yes | no | routed · anger.mid#3 | fleet norm |
| 49 | 19 | ERASE | 3.12 | 4·2·4·2·2·3·3·5 | World/Characters/Finale 2 | yes | no | routed · overthinking.mid#10 | desktop: 15 s blocked |
| 50 | 11 | PRESSURE POP | 3.12 | 3·3·3·2·2·3·4·5 | Characters/Finale 2 | yes | no | routed · anger.low#5, panic.mid#9 | fleet norm |
| 51 | 23 | VACUUM | 3.12 | 4·4·3·2·2·4·2·4 | Characters/Finale/Mobile 2 | yes | no | vault | fleet norm |
| 52 | 67 | TAP OUT | 3.12 | 3·2·3·2·1·5·5·4 | Finale 1 | **no** | no | routed · anxiety.mid#9 | phone: 100% but no reveal, 20 s blocked; desktop: 100% but no reveal |
| 53 | 69 | PULSE | 3.12 | 3·2·3·2·1·5·5·4 | Finale 1 | **no** | no | routed · panic.high#6 | phone: 100% but no reveal, 1.8 s long task, 20 s blocked; desktop: 100% but no reveal, 14 s blocked |
| 54 | 85 | CONTROL PANEL | 3.12 | 4·3·2·3·2·4·3·4 | Feel/Finale 2 | yes | no | routed · **1st** overwhelm.low | fleet norm |
| 55 | 98 | MAGIC TRAPDOOR | 3.12 | 4·3·3·3·2·3·4·3 | Finale 2 | yes | no | routed · overthinking.low#6 | fleet norm |
| 56 | 108 | WORD SALAD | 3.12 | 5·3·3·3·2·4·3·2 | Finale/Relief 2 | yes | no | vault | desktop: p95 1167 ms |
| 57 | 84 | MINE / NOT MINE | 3.00 | 3·2·4·1·2·3·3·6 | Characters 1 | yes | no | routed · 2nd shame.mid | fleet norm |
| 58 | 44 | VELCRO | 3.00 | 3·2·4·1·2·4·3·5 | Characters 1 | yes | no | routed · panic.mid#4 | fleet norm |
| 59 | 31 | BACK SEAT | 3.00 | 3·3·3·1·2·3·4·5 | Characters 1 | yes | no | routed · **1st** fear.mid | fleet norm |
| 60 | 95 | SHELF IT | 3.00 | 3·3·3·1·2·4·3·5 | Characters 1 | yes | no | routed · 2nd anxiety.mid, overwhelm.mid | fleet norm |
| 61 | 27 | DROP ZONE | 3.00 | 3·3·3·1·2·4·4·4 | Characters 1 | yes | no | bench | fleet norm |
| 62 | 52 | SUBTITLES | 3.00 | 3·2·3·2·2·4·4·4 | World/Characters/Finale 2 | yes | no | hero · **1st** anger.low | fleet norm |
| 63 | 56 | COURTROOM | 3.00 | 3·2·3·2·2·5·3·4 | World/Characters/Finale 2 | yes | no | vault | fleet norm |
| 64 | 68 | DRUM IT | 3.00 | 3·2·3·2·1·5·4·4 | Finale 1 | **no** | no | routed · **1st** numb.high, numb.mid | phone: 100% but no reveal, 23 s blocked; desktop: 100% but no reveal, 16 s blocked |
| 65 | 86 | FACT / STORY | 3.00 | 4·3·3·3·2·2·3·4 | Finale/Clarity 2 | yes | no | routed · anxiety.low#3, fear.mid#5 | fleet norm |
| 66 | 28 | ARCHIVE | 3.00 | 3·3·2·1·2·4·5·4 | Characters 1 | **no** | no | routed · overwhelm.mid#8 | desktop: stalls at 92% |
| 67 | 35 | TRAIN PLATFORM | 3.00 | 3·3·2·1·2·4·5·4 | Characters 1 | yes | no | vault | fleet norm |
| 68 | 38 | DRAWER | 3.00 | 3·2·2·1·2·5·5·4 | Characters 1 | yes | no | vault | fleet norm |
| 69 | 50 | UNFINISHED SENTENCE | 3.00 | 4·3·3·1·3·4·3·3 | Characters 1 | yes | no | vault | desktop: 1.5 s long task |
| 70 | 10 | DOMINO DROP | 3.00 | 4·3·2·2·3·4·3·3 | Feel/Characters 2 | yes | no | vault | desktop: p95 1100 ms, 2.4 s long task, 12 s blocked |
| 71 | 90 | COIN FLIP REACTION | 3.00 | 4·3·2·2·2·4·4·3 | Feel/Characters/Finale 2 | yes | no | vault | fleet norm |
| 72 | 37 | ELEVATOR DOWN | 2.88 | 3·3·3·1·1·3·4·5 | Characters/Finale 1 | **no** | no | routed · anger.low#6 | phone: 100% but no reveal; desktop: 100% but no reveal |
| 73 | 21 | BIN | 2.88 | 4·4·2·1·1·3·3·5 | Characters/Finale 1 | **no** | no | routed · overwhelm.high#4, overwhelm.mid#4 | phone: stalls at 0%; desktop: stalls at 0% |
| 74 | 16 | MELT | 2.88 | 4·2·5·2·2·2·2·4 | World/Characters/Finale/Clarity/Mobile 2 | yes | no | bench | fleet norm |
| 75 | 3 | CRACK | 2.88 | 4·2·4·2·2·3·2·4 | World/Characters/Finale/Mobile 2 | yes | no | bench | fleet norm |
| 76 | 9 | LASER SLICE | 2.88 | 4·3·3·1·2·3·3·4 | Characters 1 | yes | no | vault | phone: 18 s blocked; desktop: 11 s blocked |
| 77 | 42 | UNTANGLE | 2.88 | 3·2·3·2·2·3·4·4 | World/Characters/Finale 2 | yes | no | vault | desktop: 100% but no reveal |
| 78 | 45 | MAGNETS | 2.88 | 4·3·3·2·2·3·2·4 | Characters/Finale/Mobile 2 | **no** | no | routed · 2nd jealous.mid | phone: stalls at 17% |
| 79 | 51 | MIRROR FLIP | 2.88 | 4·3·3·2·1·3·3·4 | Finale 1 | **no** | no | routed · shame.low#4 | phone: stalls at 25%; desktop: stalls at 25% |
| 80 | 58 | MICROSCOPE | 2.88 | 3·3·3·1·2·3·4·4 | Characters 1 | yes | no | bench | phone: 1.8 s long task |
| 81 | 66 | BUFFERING | 2.88 | 3·2·2·1·2·4·5·4 | Characters 1 | yes | no | routed · anxiety.high#5, panic.high#7 | phone: p95 983 ms, 1.7 s long task |
| 82 | 76 | REVERSE IT | 2.88 | 3·3·2·1·2·4·4·4 | Characters 1 | yes | no | vault | phone: p95 867 ms |
| 83 | 78 | ONE WORD | 2.88 | 3·2·2·1·2·5·4·4 | Characters 1 | yes | no | vault | fleet norm |
| 84 | 59 | SPOTLIGHT | 2.88 | 3·3·3·2·2·4·3·3 | Characters/Finale 2 | yes | no | routed · overthinking.low#5 | fleet norm |
| 85 | 72 | CATCH & LABEL | 2.75 | 3·2·3·1·2·3·3·5 | Characters 1 | yes | no | routed · anxiety.low#6 | phone: p95 1783 ms, 1.8 s long task, 17 s blocked |
| 86 | 54 | FONT CHECK | 2.75 | 3·2·3·1·2·3·4·4 | Characters 1 | yes | no | vault | fleet norm |
| 87 | 55 | HEADLINE | 2.75 | 3·3·2·2·2·3·3·4 | Feel/Characters/Finale 2 | yes | no | routed · 2nd panic.low | desktop: 3.3 s long task, 18 s blocked |
| 88 | 12 | BOUNCE OUT | 2.75 | 4·2·2·1·2·4·4·3 | Characters 1 | yes | no | vault | fleet norm |
| 89 | 57 | CAMERA ANGLE | 2.75 | 3·2·2·2·1·5·4·3 | Finale 1 | yes | no | vault | desktop: 2.4 s long task |
| 90 | 60 | CROP TOOL | 2.75 | 3·3·2·2·2·3·4·3 | Feel/Characters/Finale 2 | yes | no | bench | fleet norm |
| 91 | 92 | SCALE DOWN | 2.75 | 3·2·2·3·2·4·3·3 | World/Feel/Finale 2 | yes | no | vault | fleet norm |
| 92 | 77 | SLOW MOTION | 2.62 | 2·2·4·1·2·2·3·5 | Characters 1 | **no** | no | routed · panic.mid#5 | desktop: stalls at 67% |
| 93 | 71 | DEFUSE | 2.62 | 3·3·3·2·2·3·1·4 | Mobile 1 | **no** | no | routed · anger.low#3 | phone: stalls at 11%; desktop: 15 s blocked |
| 94 | 14 | CRUMPLE | 2.62 | 4·4·2·1·1·2·3·4 | Characters/Finale 1 | **no** | no | routed · anger.mid#12 | phone: stalls at 50%; desktop: stalls at 50% |
| 95 | 81 | STACK IT | 2.62 | 3·3·2·1·2·4·2·4 | Characters 1 | yes | no | routed · overwhelm.low#5 | fleet norm |
| 96 | 103 | SINKING PLATFORM | 2.62 | 4·2·2·3·2·3·1·4 | Mobile 1 | **no** | no | bench | phone: stalls at 0%; desktop: p95 1233 ms |
| 97 | 2 | CRUSH | 2.62 | 3·2·2·2·2·4·3·3 | World/Feel/Characters/Finale 2 | yes | no | routed · anger.mid#5 | desktop: p95 1150 ms, 3.7 s long task, 32 s blocked |
| 98 | 63 | PATTERN POP | 2.62 | 3·2·2·2·1·4·5·2 | Finale 1 | **no** | no | vault | phone: 2.3 s long task, 23 s blocked; desktop: 100% but no reveal, 19 s blocked |
| 99 | 99 | THE ECHO CHAMBER | 2.50 | 3·2·3·1·2·2·3·4 | Characters 1 | yes | no | routed · overthinking.mid#9 | fleet norm |
| 100 | 47 | UNFOLLOW | 2.50 | 3·2·2·2·2·3·2·4 | World/Feel/Characters/Finale/Mobile 2 | **no** | no | routed · **1st** jealous.high, jealous.mid | phone: stalls at 0% |
| 101 | 17 | BOSS BATTLE | 2.50 | 3·3·2·2·1·2·4·3 | Finale 1 | **no** | no | vault | phone: stalls at 30%; desktop: stalls at 30% |
| 102 | 20 | GLITCH OUT | 2.50 | 3·2·2·2·2·2·4·3 | World/Feel/Characters/Finale/Clarity 2 | yes | no | bench | fleet norm |
| 103 | 91 | PRIORITY BLOCKS | 2.38 | 3·2·2·1·2·3·3·3 | Characters 1 | yes | no | vault | fleet norm |
| 104 | 13 | SQUASH | 2.25 | 2·1·2·1·2·3·4·3 | World/Characters 1 | yes | no | routed · anger.mid#11 | phone: p95 883 ms |
| 105 | 94 | JUGGLE | 2.25 | 3·2·2·1·2·3·3·2 | Characters 1 | yes | no | vault | fleet norm |
| 106 | 5 | HAMMER | 2.25 | 3·2·1·2·2·3·3·2 | Feel 1 | yes | no | vault | phone: p95 916 ms |
| 107 | 96 | SCRATCH REVEAL | 2.25 | 3·3·2·2·2·3·2·1 | Relief 1 | **no** | no | vault | fleet norm |
| 108 | 48 | UNSTICK | 2.00 | 2·2·2·1·1·2·3·3 | Characters/Finale 1 | **no** | no | bench | phone: stalls at 50%; desktop: stalls at 50% |
| 109 | 8 | METEOR | 2.00 | 3·2·1·1·1·2·3·3 | Feel/Characters/Finale 1 | **no** | no | routed · anger.mid#10 | phone: stalls at 0%; desktop: stalls at 0% |
| 110 | 62 | NET IT | 2.00 | 3·2·1·1·1·3·3·2 | Feel/Characters/Finale 1 | yes | no | vault | fleet norm |

---

## 3. The 10 strongest, and why

| # | Game | Overall | Why it works | What still holds it back from premium |
|---:|---|---:|---|---|
| 1 | **102 FINGER TRAP** | 5.12 | The most therapeutically precise mechanic: you push in to get free, which is acceptance in one gesture. It is a real, recognisable object (a woven tube with finger ends) with built-in inward PUSH arrows and expressive characters at the heart of each trap. It fits 390 px without overflow. | Freed rows just fade: the weave never relaxes, the fingers never slip out, and the character never hops free. The finale is shared (3). On phone, five identical thin rows read as a form. |
| 2 | **110 RAIN OUT** | 4.50 | The most characterful art in the arcade: big Inside-Out-style faces ride clouds, and a pulled cloud winks with a heart. "Pull down to let it out" is a perfect sadness metaphor (Relief 7). | Phone is broken (Mobile 2): the clouds overlap, the fourth is cut off and the labels are truncated. No rain falls anywhere, and several characters are still crying at the finish. |
| 3 | **29 MUTE** | 4.50 | The best live feedback loop: the loud waveform visibly flattens as you pull the fader down. The message is kind: "quiet is enough; gone is optional". | The character is a tiny decal that ends the game more upset. There is no studio or radio world, and the finale is a flat row of dots. |
| 4 | **32 PARK IT** | 4.50 | The clearest choice screen: three big, readable bays (about 18 px), good targets, and a burst of character orbs on every choice. | The characters are particles, not drivers. There is no car park, and the desktop reveal frame is blank. |
| 5 | **109 CLEANSE** | 4.50 | The only game with emotion-aware labels (HOLD TO CALM / SLOW / PAUSE). The lotus centrepiece is calm, and the phone start is clean: circular characters with their words below. | **The reveal never appears on either size.** On desktop, 5 of 6 characters are missing at the start. The hold pills sit apart from their spheres, and there is a 3.2 s lock between releases. |
| 6 | **100 HOT POTATO** | 4.38 | The characters ARE the pieces, and their faces turn positive as they cool. It is fast and direct, with a literal cool-down metaphor for anger. | A square box and a dark text band sit over every face, which breaks the bubble rule. There is no heat, steam or squash during the drag, and the finale is shared. |
| 7 | **24 SLINGSHOT** | 4.25 | The most tactile gesture (Feel 6): you pull the word itself, the pouch stretches, and the release snaps. | There is no sky, flight arc or landing, and the characters are decals only. On phone, the base of the fork sits under the guide. |
| 8 | **64 RED LIGHT** | 4.12 | A real wait-for-red timing rule that trains impulse delay. The traffic light is readable, and characters celebrate in the finish swarm. | Early taps get no "too early" feedback. There is no street, and no character takes part in the waiting. |
| 9 | **36 CLOUD PASS** | 4.00 | The only "slower wins" rule (Relief 7, gold for panic), a soft atmospheric cloud, and the smoothest game in its batch. | The speed rule is invisible (there is no tempo meter). There is no character at all (Characters 1) and no sky. |
| 10 | **105 DRAMA MACHINE** | 4.00 | The strongest humour reframe: a large hero character changes with each take, and the 6-take structure is clear. | At 390 px the MAKE IT DRAMATIC and CUT buttons sit behind the live guide (Mobile 2). The hero never overacts or relaxes. |

Next in line: 22 FLUSH (4.00), 101 TUG OF WAR, 80 DON'T TAP and 39 BLACK HOLE (3.88 each).

---

## 4. The 20 weakest, and what each one needs

Eleven of the bottom 20 are **vault or bench** games, which are menu-only and never auto-routed. Nine are **routed**, and one of those (47) is the *first* game a jealous user meets today. Routed games come first in §9.

Each entry has two kinds of fix:
- **Fix now** = functional or phone repair, effort **S**.
- **Premium** = the structural rebuild, effort **M or L**, using the shared systems in §9.

| Rank | Game · status | Score | What is broken (evidence) | Required changes | Effort |
|---:|---|---:|---|---|---|
| 91 | **92 SCALE DOWN** · vault | 2.75 | Ten cramped number buttons at 390. "10 SELECTED" never changes and there is no before/after. The portrait sits on a dark plate. | **Premium:** a big thermometer or dial dragged down notch by notch with detents. Flow: rate → one grounding action → "one notch lower?". The character sits on the gauge and deflates at each notch. Finale: the needle settles in a green zone with an "8 → 5" badge. | M |
| 92 | **77 SLOW MOTION** · panic.mid#5 | 2.62 | On desktop it stalls at 67% because the drag selects the input text. On phone the handle is clipped, the phrase is about 7 px and the stage is empty. | **Fix now:** pointer capture and no text selection on the stage. **Premium:** the words ride a speeding train through a tunnel, and a big red brake lever slows it. The driver character goes from panic to calm. Finale: the train glides into a sunrise station and the words step out with space between them. | S + L |
| 93 | **71 DEFUSE** · anger.low#3 | 2.62 | Unplayable on phone: the PRESS SAFE step is cut off. It looks like a form, with 5-6 px labels. The bomb framing can raise threat. | **Fix now:** fit all three steps at 390. **Premium:** a cartoon alarm box, never a bomb. Twist to open, cut the wire, then press a big squashy SAFE button. The clinging character's breathing slows with each step. Finale: the siren deflates into a music box. | S + L |
| 94 | **14 CRUMPLE** · anger.mid#12 | 2.62 | Stalls at 50% on both sizes: the corner handles hide under the skewed paper and the toast. There is no crumple animation. | **Fix now:** keep the handles above the paper and highlight the live corner, or drop the fixed order. **Premium:** a real pinch-to-crumple with crease shading and paper sound. An "author" character winces, then grins. Finale: the paper ball arcs into a wastebasket and a fresh page glows. | S + L |
| 95 | **81 STACK IT** · overwhelm.low#5 | 2.62 | Tray chips are about 25 px wide with about 6 px text. The chips are never consumed, the counter reads 1/6 at 100%, and there is no physics. | **Premium:** weighted blocks that drop with gravity, squash on landing, wobble and lean. Use 44 px chips with 15 px text. A character carries each block. Finale: the stack becomes a cairn at golden hour. Make it play differently from 91. | L |
| 96 | **103 SINKING PLATFORM** · bench | 2.62 | Unplayable on phone: the LOWER button is below the viewport and the game stays at 0%. It is a tap-then-watch game. | **Fix now:** a phone layout with one platform and the control in the thumb zone. **Premium:** drag the platform down into water. The straining character straightens up. Finale: the platforms settle in a sunrise lake. | S + L |
| 97 | **2 CRUSH** · anger.mid#5 · **pilot** | 2.62 | The jaws never visibly move, and the toast covers the CRUSH button. On phone the reveal overflows off the screen. It has the heaviest desktop main-thread load. | See pilot P5 (§8). | L |
| 98 | **63 PATTERN POP** · vault | 2.62 | The "prediction" is fake because the answer is lit. Silent resets move progress backwards, and the desktop reveal is missing. | **Premium:** a Simon-style listen-and-repeat game. Each orb is a singing character, and misses gently replay the pattern. Finale: the learned melody plays back with bubble fireworks. | L |
| 99 | **99 THE ECHO CHAMBER** · overthinking.mid#9 | 2.50 | Words are about 4 px inside the discs. A dark capsule covers the held disc, and there are no characters. | **Premium:** a stone cave. A character is the shouting source and shrinks with each hold. Use a hold ring that keeps partial progress, with words ≥15 px below each source. Finale: crystal veins light up and the pool calms. | L |
| 100 | **47 UNFOLLOW** · **1st for jealous (high and mid)** · **pilot** | 2.50 | Stalls at 0% on phone: the drag selects text and images, and the plug is about 6 px. It plays like 44, 45 and 49. | **Fix now:** no text selection or touch scrolling on the stage, and a 64 px plug. **Premium:** see pilot P4. | S + L |
| 101 | **17 BOSS BATTLE** · vault | 2.50 | Stalls at 30%: five identical dots with no "live" cue. The boss has no face. | **Fix now:** mark the live spot or accept any lit one, and cut 30 taps to about 12. **Premium:** a goofy fear-monster that telegraphs its weak spots. Each hit shrinks it. Finale: it becomes a tiny pet in the character's arms. | S + L |
| 102 | **20 GLITCH OUT** · bench | 2.50 | No glitch is visible, the toast hides the symbol tiles, and the desktop reveal is missing. | **Premium:** a CRT monitor where each correct symbol injects an RGB-split glitch. The character is stuck in the loop and unsticks. Finale: power-down to a white dot, then reboot to a calm desktop. | L |
| 103 | **91 PRIORITY BLOCKS** · vault | 2.38 | The drop location is ignored, balls stack in one slot, and one ball is clipped under the guide. | **Premium:** weighted blocks dropped into numbered shelves, with an overflow basket for the 4th and later blocks. Finale: a podium for the top three. | L |
| 104 | **13 SQUASH** · anger.mid#11 | 2.25 | The stage is effectively empty: a 9 px word above a giant button. The desktop reveal is missing. | **Premium:** press on a jelly character with a visible pressure ring. Its cheeks puff, then it springs back. Finale: the six words compress into a gem. | L |
| 105 | **94 JUGGLE** · vault | 2.25 | There is no juggling, and the player ends up keeping a negative word. | **Premium:** real juggling physics, then letting the balls drop one by one. Keep a positive anchor, never the distress word. The juggler bows. | L |
| 106 | **5 HAMMER** · vault | 2.25 | The timing is fake. The character chip is sliced in half, and the desktop reveal is missing. | **Premium:** a real timing sweep with a sweet spot and a toon mallet. A stone-crusted character is chipped free. Finale: a bell rings and gold dust bursts out. | L |
| 107 | **96 SCRATCH REVEAL** · vault | 2.25 | Anti-relief: it reveals the negative word six times. Progress goes backwards (100% → 17%). | **Premium:** the foil hides supportive facts, and scratching works immediately. Make progress monotonic. Finale: a glowing fan of fact cards. | L |
| 108 | **48 UNSTICK** · bench | 2.00 | Unfinishable on both sizes. There is no sticker art and the peel corner is invisible. | **Premium:** die-cut stickers with a glinting corner and a corner-peel from any direction. The flattened character pops back. Finale: the stickers form a scrapbook page. | L |
| 109 | **8 METEOR** · anger.mid#10 | 2.00 | Stalls at 0% on both sizes. The drag starts a native text drag: the rock label becomes "1 61 61" and the input box is overwritten. | **Fix now:** pointer capture, no text selection, no native dragging. **Premium:** slingshot posts with a trajectory preview, and a molten meteor character. Finale: a distant meteor shower forms a constellation. | S + L |
| 110 | **62 NET IT** · vault | 2.00 | There is no collision: any click advances. The chips run off the stage, and the desktop reveal is blank. | **Premium:** thought-moths on curved paths and a real net hit test where slow beats frantic. Finale: the jar opens and fireflies form a constellation. | L |

---

## 5. Visual-duplicate clusters, and how to make each game its own place

**All 110 games share one backdrop (the dark nebula and concentric rings) and one set of chrome.** On top of that, **92 games fall into 11 clusters that look alike in play.** Only 18 games have no visual twin, and even those sit on the shared nebula.

Each game needs three things:
- **its own environment** (from an environment kit, §9 S3);
- **its own finale** (from the finale toolkit with a per-family variant, §9 S2);
- **a different core gesture** wherever the cluster shares one. Creative Standard 3 requires the gameplay itself to differ, not only the skin.

The suggestions below come from the raters' per-game notes, condensed and made consistent.

### C1 · Gradient bubble row on the ring stage (11 games)

**Shared look:** glossy blue-purple spheres with a 0/3 counter. Most games use the same "arm the tool, then tap each bubble 3 times" loop (mechanic cluster A).

| Game | Its own world | Its own finale | Gesture change |
|---|---|---|---|
| 1 POP | a sunlit bath or sky of iridescent soap-film bubbles with depth of field | the last pop sets off a chain; the droplets merge into one calm bubble that lifts the character away and bursts into positive-word confetti | keep the tap, add squash and a rising-pitch chain |
| 3 CRACK | a warm-lit stone workbench of geodes | the broken geodes reveal crystals that ring a chord and grow into a crystal garden | tap the geode directly (no arm step); strike glowing fault lines with a timing ring |
| 4 STOMP | a courtyard floor in perspective with squishy blobs | the last stomp's shock ring cracks the floor and flowers burst through | hold to raise a giant boot, release to slam |
| 6 ZAP | a Tesla-coil lab with an insulated platform | the coils discharge into an aurora and the hum fades to silence | drag a bolt from a coil to a bubble; a longer hold charges a stronger bolt |
| 9 LASER SLICE | a prism lab | the last slice fires a prism beam; the fragments refract into a rainbow that forms the calm word | a real swipe-to-slice trail |
| 16 MELT | a frozen pond lit by a torch | the meltwater joins up and a spring meadow sprouts | press and drag the flame; the melt follows how long it stays |
| 19 ERASE | a chalkboard classroom | on the clean board, the character chalks a smiley and a kind word | rub with a finger (a mask reveal, no activation step) |
| 21 BIN | a tidy room with a friendly bin buddy | the lid slams, the bin rolls off to a recycling truck and the room turns sunlit | flick an arc into the bin's mouth |
| 41 UNHOOK | a night pier under a giant hook | the hook retracts into the dark and the freed bubbles rise into sunrise | swipe across the strings to snip them (whip physics) |
| 43 CUT THE LOOP | a looping hamster-wheel track | the ring unrolls into a horizon line, dawn rises and the orbs become stars | swipe the scissors across the ring |
| 99 THE ECHO CHAMBER | a stone cave with warm light from an opening | the last echo collapses into one chime; crystal veins light up | a press-and-hold ring on the source |

### C2 · The "THOUGHT MOVE" pill template (23 games, the largest cluster)

**Shared look:** a small chip or sparse prop above a full-width cyan-to-magenta "THOUGHT MOVE · X" pill on a glass panel. The user taps the pill, not the object (mechanic clusters B, C and D).

| Game | Its own world | Its own finale | Gesture change |
|---|---|---|---|
| 2 CRUSH | an industrial hydraulic press with brushed steel and a warm key light | the thought is crushed to a glowing cube that cracks into light | tap the blob itself; the jaws slam |
| 5 HAMMER | a blacksmith's anvil and forge glow | a perfect strike rings a bell and the stone shell bursts into gold dust | a real timing sweep with a sweet spot |
| 10 DOMINO DROP | a warm tabletop with a spiral domino path | the fallen dominoes slide into a bridge the character walks across | flick the first domino |
| 11 PRESSURE POP | a boiler room with a drawn gauge | all vents release together into a steam cloud that clears to sunrise | press the capsule itself; release in the green zone |
| 12 BOUNCE OUT | a night playground court | the last tiny bounce settles into a nest and the character yawns | swipe the paddle; the ball loses energy |
| 13 SQUASH | a jelly kitchen | a full squash compresses the six words into a gem | press on the jelly character |
| 17 BOSS BATTLE | a goofy arena | the boss shrinks to a pet in the character's arms | tap telegraphed weak spots |
| 20 GLITCH OUT | a retro CRT monitor | a power-down to a white dot, then a reboot to a calm desktop | match the flickering symbol |
| 28 ARCHIVE | an archive room with tall shelves | a brass key locks the cabinet and "ARCHIVED · 6" glows | slide the card toward a drawer that opens as it nears |
| 30 ZOOM OUT | nested layers: desk, room, city, Earth | the pale blue dot: Earth shrinks to a warm point at sunrise | pinch or scroll to zoom |
| 35 TRAIN PLATFORM | a foggy station with a departure board | the last train leaves and the board reads "NO FURTHER SERVICES · YOU STAYED" | hold still while the doors are open |
| 38 DRAWER | a bedside drawer at night | the lamp clicks off, moonlight comes in and a "reopen when you choose" key glows | one pull-drop-push gesture |
| 39 BLACK HOLE | an accretion disk with lensing | a quasar flash settles into a calm golden galaxy | press and hold the hole itself |
| 40 PAPER PLANE | a sunset sky over a horizon | the plane rides an arc to a glint and the sky warms to gold | fold with creases, then flick |
| 53 CARTOONIFY | a horror-lit stage | the villain squeaks out a cloud of rubber ducks and the lights flip to cartoon yellow | a pump handle |
| 57 CAMERA ANGLE | a miniature film set on a dolly | "CUT! THAT'S A WRAP": the frame pulls back to a wide open world | orbit the camera |
| 64 RED LIGHT | a dusk street corner on wet asphalt | sunrise: the character strolls across zebra stripes that light up like piano keys | tap the light or walk-button |
| 65 PAUSE BUTTON | a rushing scene of traffic, clocks and notifications | the frozen frame becomes a still-life painting | hold one big physical pause button |
| 66 BUFFERING | six different "loading" vignettes (kettle, seed, sunrise …) | the video finally plays: the character on a beach at golden hour | a breathing ring, with a tempting red button off to the side |
| 69 PULSE | a bioluminescent night lake | one huge glowing wave; the character floats under the stars | tap to a slow, visible tempo |
| 70 METRONOME | a walnut metronome in a warm room | the pendulum stops, a bell chimes and the red light fades to amber | skip the visibly tempting odd beats |
| 76 REVERSE IT | a cassette under a desk lamp | the tape ejects and the ribbon ties a bow around the character | scrub the reel anticlockwise |
| 80 DON'T TAP | a needy, squishy red button character | the button gives up and falls asleep snoring bubbles | resist an urge wave |

### C3 · Machine scenes driven by a bottom button (4 games)

**Shared look:** the user taps a button at the bottom and watches the machine; they never touch the object.

| Game | Its own world | Its own finale | Gesture change |
|---|---|---|---|
| 15 SHRED | an office at night with a crank shredder | the strips fill a bin, compact into a ball and go into a hoop; the confetti flips to kind words | drag the paper into the slot |
| 18 BURN | a fire bowl at night | the ash rises as fireflies and the orange light fades to dawn | hold a match to any edge |
| 22 FLUSH | a warm tiled bathroom with window light | the basin refills clear and shows the character's smiling reflection | circle a finger to spin the water |
| 23 VACUUM | a cluttered room | the bag ties itself and the room brightens | aim the nozzle by dragging |

### C4 · Glass rectangles with a white centre glow orb (7 games)

| Game | Its own world | Its own finale | Gesture change |
|---|---|---|---|
| 26 SEND TO SPACE | a launch-pad gantry with ground fog | the six thoughts link into a constellation as Earth rises | a notched throttle |
| 27 DROP ZONE | a cliff edge at late afternoon | the blocks sink and sprout flowers; the light character floats up | drag a heavy block that resists |
| 29 MUTE | a warm radio console | ON AIR switches off and the waveform becomes a slow sine | a detented fader |
| 31 BACK SEAT | a car interior on a sunset road | you take the wheel on a coastal road with calm passengers | drag along a glowing seat path |
| 34 RIVER | a stream in dappled golden light | the leaves drift around a bend into a sunlit pool with fireflies | drop the leaf and let the current carry it |
| 36 CLOUD PASS | a layered cumulus sky | the last cloud parts on a sunrise and a rainbow appears | a slow push with a visible tempo meter |
| 37 ELEVATOR DOWN | a brass elevator car | the doors open onto a sunlit garden lobby showing "1 · CALM" | drag the floor dial down |

### C5 · Detach panel with a word card (10 games)

**Shared look:** the same big glass panel and dark word card. Four of these games finish with the same drag to the right.

| Game | Its own world | Its own finale | Gesture change |
|---|---|---|---|
| 42 UNTANGLE | yarn ropes knotted around the character | the rope unwinds into a heart drawn around the character | a slow drag loosens the knot; a yank tightens it |
| 44 VELCRO | a velcro wall | the patches fall like leaves and reveal a mural | a corner peel with resistance |
| 45 MAGNETS | a magnetic-field room with iron filings | the magnet demagnetises and clatters to the floor | hold to resist the pull |
| 46 UNPIN | a cork board under a desk lamp | the bare board becomes a sunlit window | pull the pin; the note flutters down |
| 47 UNFOLLOW | a dark room lit by an endless feed | the screen dies and becomes a window; the follower counts turn into fireflies | trace the cable back and yank it |
| 48 UNSTICK | a vinyl sticker sheet | a scrapbook page closes | a corner peel in any direction |
| 49 UNZIP | sleeping-bag cocoons | one butterfly per word flies out | zip down a curved path with a snag |
| 51 MIRROR FLIP | a hand mirror | the harsh words flip into their kind reverse | orbit around the character |
| 52 SUBTITLES | a TV with soap, nature and sport mini-scenes | a blooper reel, a bow and a "THE END" card | turn a genre dial |
| 54 FONT CHECK | a marble plaque and a critic in a judge's wig | the plaque cracks and the letters become toy blocks | a font knob with detents |

### C6 · Reframe glass card with a small pill row (7 games)

| Game | Its own world | Its own finale | Gesture change |
|---|---|---|---|
| 55 HEADLINE | a news studio with a BREAKING beacon | OFF AIR: warm lamps come up and the headline folds into a paper plane | physical faders |
| 56 COURTROOM | a courtroom diorama with brass scales | CASE DISMISSED: the scales settle level | drag evidence into trays |
| 58 MICROSCOPE | a lab bench with a brass microscope | the specks become a night-sky constellation | a circular focus drag |
| 59 SPOTLIGHT | a theatre with a follow-spot | the house lights come up for a curtain call | drag the beam |
| 60 CROP TOOL | a photo editor over a painted wide scene | a Polaroid develops and is pinned to a memory board | drag the crop handles outward |
| 62 NET IT | a twilight meadow | the jar opens and fireflies form a constellation | sweep a real net |
| 63 PATTERN POP | a music-box organ | the learned melody plays back with fireworks | listen, then repeat |

### C7 · Gradient tiles above a chip word card, or a flat glass pill (9 games)

**Shared look:** 73, 79 and 83 are the same game: tap one of 3-4 gradient tiles.

| Game | Its own world | Its own finale | Gesture change |
|---|---|---|---|
| 72 CATCH & LABEL | a dusk meadow full of thought-moths | three labelled jars glow like lanterns | tap the moth itself |
| 73 TRAFFIC LIGHT | a dusk intersection with a revving car | a long green and tail-light trails down a sunset road | brake a lurching car |
| 74 BUBBLE WRAP | a translucent plastic sheet | a chain ripple, then the sheet lifts like a cape | pop in any order, or rake a row |
| 78 ONE WORD | a crowd of words in fog | the chosen words link into a constellation | a spotlight narrows on one word |
| 79 MISS ON PURPOSE | a darts range with OOPS patches | "PERFECTLY IMPERFECT": the target cracks into a smile | flick a dart into an OOPS patch |
| 81 STACK IT | a hilltop | a cairn at golden hour | stack with gravity |
| 82 SEESAW | a park at dusk | the seesaw rocks gently and fireflies rise | slide stones along the plank |
| 83 SORT STATION | a pneumatic tube room | the NOT MINE capsules fly out of a skylight as birds | flick the capsule into a tube |
| 84 MINE / NOT MINE | a room with a backpack and an open window | the character walks off with a light pack | swipe into the pack or out of the window |

### C8 · Portrait over an option grid (8 games)

| Game | Its own world | Its own finale | Gesture change |
|---|---|---|---|
| 85 CONTROL PANEL | a brushed-metal console with levers | the board lights up and prints a "my next moves" ticket | throw levers with visible consequences |
| 86 FACT / STORY | a clerk's desk with ink stamps | the STORY slips fly off as paper birds | stamp whole claims |
| 87 KEEP / DROP | a keepsake jar above a misty well | the kept words assemble into a lantern | drag up or down, with sink-and-pop physics |
| 88 TRADE MACHINE | a retro vending machine | a jackpot shelf of prizes | flick a coin into the slot |
| 89 DOOR A / B | a corridor with two doors | both rooms' light merges into one warm glow | open each door |
| 90 COIN FLIP REACTION | a thick embossed coin | the coins stack into a fountain that spells what you wanted | flick, then a reaction step |
| 92 SCALE DOWN | a big gauge | the needle settles in green with a before/after badge | drag down notch by notch |
| 98 MAGIC TRAPDOOR | a magician's stage | the thoughts cascade through the trapdoor and the curtain closes | a three-clunk lever |

### C9 · Glass-card dashboard list (4 games)

| Game | Its own world | Its own finale | Gesture change |
|---|---|---|---|
| 103 SINKING PLATFORM | a calm lake | the platforms settle and the characters float | drag down |
| 104 VOLUME KNOB | a cosy radio corner | static fades into a lo-fi tune and the characters sway | one big knob |
| 105 DRAMA MACHINE | a theatre or film set | a curtain call with roses and applause | overact, then snap the clapper |
| 106 TINY SOUNDTRACK | a toy xylophone on a little stage | the melody plays back as a band performance | the characters are the keys |

### C10 · Gradient card grid or gradient balls (7 games)

| Game | Its own world | Its own finale | Gesture change |
|---|---|---|---|
| 91 PRIORITY BLOCKS | wooden shelves | a podium for the top three | drop blocks into shelves, with an overflow basket |
| 93 SPACE MAKER | a NOW circle that grows into a clearing | a sunlit clearing with thoughts orbiting like distant planets | flick with momentum |
| 94 JUGGLE | a spotlight stage | the kept ball floats up as a little sun | keep them up, then let them drop |
| 95 SHELF IT | a wooden shelf wall with jars | the full shelf glows; the character settles in an armchair | flick up into a jar slot |
| 100 HOT POTATO | a campfire and a cool pond | the steam becomes a rain cloud that drifts away | toss into the cool zone |
| 107 GO WEIRD | a dress-up runway | a silly dance under disco lights | drag props onto the face |
| 108 WORD SALAD | a sunny kitchen bowl | a new, kinder sentence served on a plate | shake, then build a new sentence |

### C11 · Pads under an avatar card (2 games)

| Game | Its own world | Its own finale | Gesture change |
|---|---|---|---|
| 67 TAP OUT | a quiet room with glowing hand drums | a wave of light opens like wings and the letters form a butterfly | alternate taps on a visible slow beat |
| 68 DRUM IT | a club stage with a full kit and a crowd | a stage-dive pyro burst and the phrase shatters into notes | distinct pads over a backing groove |

### No visual twin, but still on the shared nebula (18 games)

| Game | Its own world | Its own finale |
|---|---|---|
| 7 PIN POP | a balloon fair | the six balloons chain-pop and the air spells the reframe word |
| 8 METEOR | a planet horizon | a distant meteor shower forms a constellation |
| 14 CRUMPLE | a writer's desk | the paper ball arcs into a wastebasket and a fresh page glows |
| 24 SLINGSHOT | a hilltop at dusk | the stars join into a constellation of the smiling character |
| 25 SWIPE AWAY | a dock over a lake | a golden card is stamped KEEP |
| 32 PARK IT | a tiny car park | the barrier closes and a "FULL · SEE YOU LATER" sign glows under the stars |
| 33 FLOAT AWAY | a sky with sandbags | the balloon rises through sunset clouds to a dot |
| 50 UNFINISHED SENTENCE | a rope bridge over mist | the far planks dissolve and a spotlight lands on the true first sentence |
| 61 FREEZE | frosted ice blocks in cold fog | a chain shatter, then the light turns from cold to warm |
| 71 DEFUSE | a cartoon alarm box | the siren becomes a music box |
| 75 INK BLEED | watercolour paper on a dark desk | the ink blooms into a sunrise |
| 77 SLOW MOTION | a train in a tunnel | a sunrise station |
| 96 SCRATCH REVEAL | scratch cards of supportive facts | a glowing fan of cards |
| 97 X-RAY | a backlit lightbox | the hollow shell turns into rising embers |
| 101 TUG OF WAR | a chalk line on grass | the rope coils up and both characters sit together at golden hour |
| 102 FINGER TRAP | woven traps under a spotlight | the ribbons weave into one bracelet held by five calm characters |
| 109 CLEANSE | a moonlit lotus pool | the lotus blooms and lantern characters circle it at dawn |
| 110 RAIN OUT | a stormy sky over rooftops | a full downpour, then the sky clears to a rainbow |

---

## 6. Character integration audit

### Where the emotion characters appear today

| Role in the game | Games | Count |
|---|---|---:|
| **None in the play area.** Only blurred, low-opacity decals at the stage edges, sometimes drawn over the Live Guide. | 1, 3, 4, 6, 8, 9, 12, 13, 14, 16, 18, 19, 21, 22, 23, 24, 25, 27, 28, 31, 34, 35, 36, 37, 38, 39, 40, 41, 43, 44, 48, 50, 54, 58, 61, 62, 66, 71, 72, 74, 75, 76, 77, 78, 81, 84, 91, 94, 95, 99 | **50** |
| **Static sticker.** A 22-30 px face in a dark capsule or plate (fails the bubble rule) that only changes when the word changes. | 2, 5, 10, 11, 17, 20, 26, 29, 30, 42, 45, 46, 47, 49, 51, 52, 53, 55, 56, 57, 59, 60, 63, 65, 67, 68, 69, 70, 73, 79, 80, 82, 83 | **33** |
| **Large portrait or playing piece, but passive.** The face is fixed per word and does not react to the player. | 7, 15, 33, 85, 86, 87, 88, 89, 90, 92, 93, 96, 98, 102, 103, 105, 106, 107, 108, 109 | **20** |
| **Confetti only.** Character heads fly out as particles at release or finish. | 32, 64, 97, 101 (POP, STOMP, 104 and 109 add the same swarm on top) | **4** |
| **Partial transformation.** The face visibly improves after the player acts. | 100 (the cooled potatoes wink and smile), 110 (a pulled cloud winks with a heart), 104 (one face calms) | **3** |

### What is wrong, game by game

- **No reaction anywhere.** No game has anticipation, squash on a hit, recoil, relief or celebration tied to the player's input. The best (110 RAIN OUT, Characters 6) has one wink.
- **The face follows the word, not the player.** The face is chosen by the emotion of the current word chunk. With "my boss yelled at me and I feel panic" the last chunk is "panic", so **10 games end on a distressed face**: 29, 33, 85, 86, 87, 103, 106, 107, 108 and 110. The emotional arc runs backwards.
- **The images break the bubble rule.** 34 games put the circular face inside a dark capsule, plate or square box. 72 games fail the bubble rules overall. Other failures: words printed across faces (85, 98, 100), faces clipped by their card (106) and a chip sliced in half (5).
- **Odd role choices.** In 15 SHRED a crying character is the thing being shredded, which reads badly. In 94 JUGGLE the player ends up keeping their own negative word.
- **Too small on phone.** Faces are 14-30 px in most games. An in-world hero needs at least about 96 px at 390, and pieces need at least 64 px.

### The character reaction layer to add (one shared component, set per game)

This is one actor component, built on the existing character set and expression library (SYNC, RUSH, GLITCH, LOOPIE, DROP, PATCH, STILL; the loud and calm faces per emotion; the win faces). Each game sets its **role**, **placement** and **size**. The engine sends it events.

| Event from the game | Body motion (squash & stretch) | Face | Sound / haptic |
|---|---|---|---|
| idle (loud) | a breathing loop (scale-y 1 → 1.03, 2.4 s) plus a per-emotion quirk: RUSH steams, SYNC has a racing heartbeat, GLITCH jitters, LOOPIE has spiral eyes, DROP has a tear, PATCH hides its face | loud face | — |
| press / grab (anticipation) | squash to 0.92 × 1.08 over 80 ms and lean toward the finger | eyes widen | soft tick |
| hit / impact | recoil: squash to 1.15 × 0.85 for 120 ms, then spring back with overshoot; small shake on heavy hits | flinch, 300 ms | the game's impact cue, pitched to the hit strength |
| miss / wrong | head shake (±6°, 200 ms) and a sheepish face for 0.6 s; never silent | sheepish | soft "bonk" |
| release / exhale | squash-y 0.92 → stretch 1.04 → settle (500 ms), with a sigh-puff particle | one step calmer | exhale cue |
| progress steps | **the face is driven by progress, not by the word:** 0-33% loud → 34-66% softer → 67-99% calm → 100% win face | | |
| round complete | a 12 px hop and a face step | brighter | chime |
| finish (celebration) | crouch (anticipation) → jump with stretch 1.2 → squash on landing → spin, heart or wave, then it stays on screen through the reveal | win face | the finale stinger |

**Hard rules**
- The image is always circular, with no box. The word sits below it at 15 px or more and never overlaps it.
- Faces never end distressed.
- With reduced motion, the faces still change but the bodies do not bounce.
- One sound cue fires per event, within 50 ms (this is the owner's sound-sync evidence).

**Roles by game family**

| Family | Role | Examples |
|---|---|---|
| Destroy | trapped inside, or bound to, the thing being broken; bursts free | 1, 3, 4, 13 |
| Release | inhales while the player holds, exhales on release, floats up | 18, 75, 109, 110 |
| Discard | carries the load and lightens with each drop | 21, 25, 27, 38 |
| Distance | watches or rides the thing away and relaxes as it shrinks | 24, 26, 30, 40 |
| Detach | stuck, snagged or squashed; freed with a stretch | 41, 44, 48, 49 |
| Reveal | frightened at first, then curious, then laughing as the truth shows | 96, 97, 101, 102 |
| Reframe | the actor or subject who is re-shot, re-voiced or re-framed | 52, 55, 57, 59 |
| Interrupt | frantic, then freezes with the player, then settles | 61, 65, 77, 80 |
| Rhythm | plays or breathes in time with the player | 67, 68, 69, 70 |
| Balance | rides the seesaw or stack and steadies | 81, 82, 92, 93 |
| Sort / Choice | a clerk, postmaster or operator who acts on each choice | 83, 85, 86, 88 |
| Absurdity | dressed up, performing, laughing at itself | 105, 106, 107, 108 |

Concrete per-game roles are given in §5 and in the pilot table (§8).

---

## 7. Performance outliers

**First, the honest context.**
- All 220 runs exceed the absolute budgets: p95 frame ≤34 ms and max ≤120 ms. Fleet medians are **433 ms p95 on phone and 783 ms on desktop.**
- That is mostly the headless browser without a GPU, so **no game can be certified "no performance flag" until it is measured on a real phone.**
- Two findings are still real:
  - **Desktop is slower than phone in 94 of 110 games.** Median frame p50 is 442 ms on desktop against 150 ms on phone. That is roughly the 3.4× pixel-area ratio, which points to **paint and fill cost, not game logic.** Likely shared cause: full-screen blend-mode lighting layers (soft-light, screen, overlay), blurred bokeh, the nebula, and 18 glass-panel styles that use live backdrop blur at 7-20 px, all repainting every frame.
  - **No run threw an error, and heap growth stayed at or below 7.2 MB** (no leaks at this scale).

| Game | Size | Metric (fleet median in brackets) | Likely cause (to confirm with a profile) |
|---|---|---|---|
| **41 UNHOOK** | desktop | p95 **2100 ms** (0.6 fps, the worst frame rate in the fleet), 25.6 s of blocked main thread, 1.9 s long task [783 ms] | The hook-and-string art appears to be redrawn and re-laid out on every frame while the bubbles animate. Draw the strings on one layer animated with transforms only. |
| **2 CRUSH** | desktop | **3.7 s** long task, **31.9 s blocked** (the most on desktop), p95 1150 ms; 39 s to finish | Each rapid tap re-renders the whole older engine plus the HUD, toast and chain counter. Batch the per-tap visuals and isolate the HUD. |
| **82 SEESAW** | desktop | **3.8 s** single long task (the longest in the fleet) | A one-off stall, most likely at a round transition when the beam, card and toast mount together. |
| **55 HEADLINE** | desktop | 3.3 s long task, 18 s blocked | The same pattern: a heavy re-mount between rounds. |
| **109 CLEANSE** | both | **The bar reaches 100% but the reveal never appears**; 3.0 s long task on desktop | Most likely two things: the finish hand-off (the done signal is scheduled 2.2 s after the last release, from an effect whose cleanup can cancel it while its lock stays set) and decoding six character images at once (5 of 6 were missing on desktop start). Confirm in pilot P3. |
| **18 BURN** | phone | **3.0 s freeze**, 17 s blocked, 57 s to finish | A 34 ms timer updates React state and the progress HUD about 30 times a second for every hold, across six slow burns. Animate the burn front on the compositor and report progress less often. |
| 89 DOOR A / B | desktop | 2.6 s long task | The popover mounts over both doors under a blur. |
| 57 CAMERA ANGLE | desktop | 2.4 s long task | The view change re-renders the glass card under a backdrop blur. |
| 10 DOMINO DROP | desktop | 2.4 s long task, p95 1100 ms | The domino row is animated with layout properties. Use transforms. |
| 63 PATTERN POP | phone / desktop | 2.3 s long task, 22.7 s blocked; no reveal on desktop | Silent resets stretch play to about 80 s and re-render the stage each time. Fix the rule first. |
| 34 RIVER | phone | 2.0 s long task (desktop stalls at 67%) | Drag hit-testing with text selection side effects. Use pointer capture. |
| **72 CATCH & LABEL** | phone | p95 **1783 ms** (the worst phone frame in the fleet), 1.8 s long task [433 ms] | Card flight plus a toast over the controls. Profile it. |
| 33 FLOAT AWAY | both | p95 1300 ms on phone / 1133 ms on desktop, 23.6 s blocked on phone | Large glowing balloon art with blur layers. |
| **70 METRONOME** | phone | **30 s blocked** (the most in the fleet), p95 933 ms, no reveal on either size | State updates on every beat for the pendulum. Drive the pendulum with CSS and time the beats from timestamps. |
| 65 PAUSE BUTTON | desktop | p95 1450 ms | The hold ring repaints under a glass blur. |
| 74 BUBBLE WRAP | desktop | p95 1383 ms, 17 s blocked, no reveal | Twelve gradient and glow cells repaint on every pop. |
| 6 ZAP | both | **691 DOM nodes** (the highest; median 414) | The lightning zigzags are built from many DOM elements. Draw the arcs on one canvas. |
| 110 RAIN OUT | desktop | 1.8 s long task, 46 s to finish | Large character images plus long rounds. |
| 64 RED LIGHT, 83 SORT STATION | desktop | heap +7.1 / +7.2 MB (the largest, still well under 25 MB) | Not a leak at this size. Keep an eye on it. |

**Fix in one place first:**
1. Measure on a real mid-range phone.
2. A/B test with the shared lighting overlay turned off.
3. Replace live backdrop blur with pre-blurred static plates.
4. Animate only transform and opacity.
5. Keep per-frame timers out of React state.

All of this belongs to the lighting rig (§9 S3), so every game benefits.

---

## 8. Pilot proposal (8 games)

Creative Standards require a **pilot before any rollout**: one game per look-alike cluster, the most-routed games, and some of the weakest. Each pilot is reviewed on rendered phone and desktop screenshots, shown to the owner with the full **approval package**, and only then rolled out:
- before/after screenshots
- a playable build
- a recording
- input latency
- a sound-sync log
- a distinctiveness explainer

**Coverage of these eight**
- **Clusters:** 7 of the 11 visual clusters (holding 70 games), and 5 mechanic clusters (B, D, E, H, M) plus the tap-a-labelled-choice pattern.
- **Users:** 7 of them are front-door games. Between them they are the first or second game met in 24 emotion bands today.
- **Weakest:** two are from the bottom 20.

| Pilot | Game (score) | Why it is representative |
|---|---|---|
| **P1** | **1 POP** (3.75) | **The most-routed game** (9 route slots): 1st for anxiety.low, general.mid and general.low. It represents **C1** (bubble row, 11 games) and the Destroy family, and it is the "tap = micro-win" template. |
| **P2** | **106 TINY SOUNDTRACK** (3.62) | **The existing game users meet first in the most bands today**: 1st for sad.low, lonely.low, numb.low and good high/mid/low. It represents **C9** (dashboard list) and the Absurdity family. It proves the sound system. |
| **P3** | **109 CLEANSE** (4.50) | 1st for shame.high, and 2nd for panic.high and anger.high (the high band is "body first"). It is on the gentle list used under safety flags. It represents mechanic cluster **D** (hold to threshold: 11, 13, 39, 65, 99, 109, plus 18) and the Release family. **Its reveal never fires.** |
| **P4** | **47 UNFOLLOW** (2.50, bottom 20) | **The only jealous game routed today** (1st for jealous.high and jealous.mid), and **it stalls on phone**. It represents **C5** (detach panel, 10 games) and mechanic cluster **E** (one-axis drag, ~17 games). It proves Standard 3 by giving a different gesture to the 44/45/47/49 drag-right quartet. |
| **P5** | **2 CRUSH** (2.62, bottom 20) | It represents **C2**, the largest visual cluster (23 games), mechanic cluster **B** (tap a pill N times, 9 games) and the anger discharge games. It has the heaviest desktop main-thread load. |
| **P6** | **88 TRADE MACHINE** (3.50) | 7 route slots: 1st for jealous.low, 2nd for sad.low and good high/mid/low. It represents **C8** (portrait over options, 8 games) and the Choice/Sort "tap a labelled button" pattern (cluster I). |
| **P7** | **34 RIVER** (3.50) | 1st for overthinking.mid, and **it stalls on desktop**. It represents **C4** (glass rectangles + glow orb, 7 games), mechanic cluster **H** (put it away) and the Distance family. It is the water/nature environment showcase. |
| **P8** | **107 GO WEIRD** (3.25) | 9 route slots: 1st for shame.low and fear.low, 2nd for anger.low, overthinking.low and numb.low. **It stalls on phone.** It represents **C10** (card grid, 7 games) and humour defusion, and it separates itself from its twin 108. |

**What each pilot changes, and which shared systems it exercises**
- Systems: **S1** character reaction layer · **S2** finale toolkit · **S3** environment kit + lighting rig · **S4** sound cues · **S5** gesture library · **S6** phone chrome + reveal.
- "Structural" means gameplay changes; "visual" means the look.

| Pilot | Structural changes | Visual changes | Systems exercised |
|---|---|---|---|
| P1 POP | The anxious character holds the bubbles like a balloon bunch (about 110 px). Each pop makes it flinch with squash, then exhale. Its face goes from wide-eyed to soft as the chain grows. Own finale: the droplets merge into one calm bubble that lifts the character away, then bursts into positive-word confetti. | Iridescent soap-film bubbles in a sunlit bath or sky with depth of field. A 2×3 honeycomb sits inside the 390 px safe area, words are 15 px or more, and the toast is docked away from the bubbles. | S1 (holder role), S2 Destroy variant "burst to bloom", S3 sky kit + warm key light, S4 rising-pitch pop chain, S6 |
| P2 TINY SOUNDTRACK | The characters ARE the keys. Each one bounces on its key (squash on press, stretch on rise), brightens from sad to smiling, and sings on its third note. No disabled state: a vibe is picked by default. Own finale: the six notes replay as a melody, the characters play as a band, and a vinyl record spins with the user's words as the title. | A toy xylophone on a small lit stage, with one row of big keys in the thumb zone and no faces clipped. | S1 (piece role), S2 "encore" variant, S3 stage kit, **S4 melodic note set + sound-sync log**, S6 |
| P3 CLEANSE | Hold the character's sphere itself (not a separate pill). While held, the character breathes in and stretches; on release it exhales with a squash, its face goes from tense to calm, and it floats up as a lantern. Cut the 3.2 s lock to about 1 s. **Fix the reveal hand-off and the missing desktop images.** Own finale: the lotus blooms fully and six lantern characters circle it at dawn. | A moonlit pool with reflections, mist and a lighting ramp from cool night to warm dawn. | S1 (breath role), S2 Release variant "exhale to sky", S3 water kit + light ramp, S4 breath cues synced to the hold, S5 hold with pointer capture |
| P4 UNFOLLOW | A new gesture: trace the glowing cable back and yank it. **Phone fix:** no text selection or scrolling on the stage, and a 64 px plug. The comparison feed speeds up around the character. When it dies, the character blinks, its pupils return and it turns toward the warm light. Own finale: the screen becomes a window and the follower counts melt into fireflies. | A dark bedroom lit only by the feed's cold glow, which turns warm by the end. | S5 trace gesture, S1, S2 Detach variant "set free", S3 interior/night kit, S6 |
| P5 CRUSH | Tap the thought-blob directly; the hydraulic jaws slam with anticipation, a 0.1 s smash and screen shake. The character inside goes angry → squished and dizzy → flattened pancake → pops back round and smiling. Own finale: the press makes a glowing cube that cracks into warm light. **Fix the phone reveal overflow and the desktop main-thread load.** | A workshop kit: brushed steel, pistons and a warm industrial key light. This replaces the chip-and-pill template. | S5 direct-hit tap, S1 (inside role), S2 Destroy variant, S3 workshop kit, S4 heavy impact cues, S6 |
| P6 TRADE MACHINE | Flick the thought-coin into the slot (coin roll, clunk, gears). Each choice dispenses a real prize object: an hourglass for TIME, a window for SPACE, a joke card for LAUGH. The character presses its face to the glass, catches the prize and goes from crying to smiling. The 1/6 counter advances every round. Own finale: a jackpot shelf of the six prizes. | A chrome retro vending machine with warm marquee bulbs. | S5 flick, S1 (operator/customer role), S2 Choice variant "jackpot", S3 arcade/interior kit, S4 |
| P7 RIVER | **Fix the desktop stall at 67%.** After the drop, the current carries each leaf: it bobs, catches on a rock and slips free (the surprise the catalog promised). The worried character on the bank breathes out with each leaf and is lying back by round 6. Own finale: the leaves drift round a bend into a sunlit pool and fireflies rise. | A stream with caustics, rocks, reeds and dappled golden light. The words sit on the leaves in dark ink at 15 px or more. | S3 water/nature kit, S1 (watcher role), S2 Distance variant "drift away", S4 water swell, S5 |
| P8 GO WEIRD | **Fix the phone layout:** a 2-column grid with the prop tray as a bottom sheet. Props snap onto the character's face with a bounce. With each prop the character does a double-take and giggles, its face going from angry to amused. Own finale: a dress-up runway dance under disco light. | A stage set clearly different from 108 WORD SALAD's kitchen. | S6, S5 drag and snap, S1, S2 Absurdity variant "curtain call", S3 stage kit |

**Clusters not covered by a pilot get a wave-2 lead game** that reuses the proven systems:
- C3: 15 SHRED
- C6: 55 HEADLINE
- C7: 79 MISS ON PURPOSE (it splits the identical 73/79/83 loop)
- C11: 68 DRUM IT, which is a Tier-1 front-door game anyway

**Pilot acceptance**
- Independent reviewers re-rate each pilot with this rubric, phone first. The target is 8 or more on every axis.
- The owner plays the build and approves.
- Only then do the systems roll out.

---

## 9. Polish plan, ordered by user impact

**Principles**
1. Users meet the routed front-door games first, so those come first.
2. Build shared systems once and set them per game, so no two games look stamped.
3. Make structural (gameplay) changes before cosmetic ones.
4. Phone first.
5. Never remove a feature: redesign it instead.

**Effort scale.** These are planning estimates of agent tokens, covering build, rendered screenshot review at 390 and 1280, and one fix round. Calibrate them on the pilots before rollout.

| Size | Pilots and Tier 1 | Rollout after pilots |
|---|---|---|
| S | about 0.3M | about 0.3M |
| M | about 1.0M | about 0.7M |
| L | about 2.0M | about 1.5M |

### Wave 0: fix now (Release 1, S-sized, every game benefits)

| Item | What | Games | Effort · tokens |
|---|---|---|---|
| W0-1 Phone chrome | Unclip the header and the LVL overlap. Stop the mic covering the input. Dock the toast in a top band so it never covers a control or the guide. User words ≥15 px, labels ≥12 px. Coordinate with the readability module already in progress, so the work is not duplicated. | all 110 (toast on controls in 91) | M · ~1.0M |
| W0-2 Reveal and HUD | Render the desktop reveal card. Hand over to the reveal at 100%. Keep the round counter in step with the bar. | desktop card missing in 20 (1, 5, 6, 9, 10, 13, 16, 19, 20, 32, 57, 62, 73, 76, 80, 81, 83, 84, 85, 87); 100% with no reveal in 9 (37, 42, 63, 67, 68, 69, 70, 74, 109); counter mismatch in about 20 | M · ~1.0M |
| W0-3 Routed functional failures | Stage drags with pointer capture and no text selection or native dragging (8, 28, 34, 47, 77), off-screen controls (71, 107), hidden order or handles (14, 51), respawn and hit tests (21, 45), and progress logic (37, 67, 68, 69) | 15 routed: 8, 14, 21, 28, 34, 37, 45, 47, 51, 67, 68, 69, 71, 77, 107 | S each · ~4.5M |
| W0-4 Bubble-rule sweep | Remove the dark capsule, plate or box behind faces; put the word below the image. S1 replaces this for the games it touches. | 34 games with boxed faces | S · ~1.0M |
| W0-5 Menu-only functional failures | Same kinds of fixes as W0-3 | 17, 48, 63, 96, 103 (vault/bench) | S each · ~1.5M (Release 2 unless cheap) |

### Shared systems (Release 1, built during the pilots)

| System | What it is | Set per game by | Effort · tokens |
|---|---|---|---|
| **S1 Character reaction layer** | One actor component (§6): events → squash, stretch and face steps; faces driven by progress; roles; circular images with words below | role, placement, size, the game's events | L · ~2.5M |
| **S2 Finale toolkit** | A sequence engine: the game's own climax beat → a family transformation → character celebration → light shift from the loud colour grade to the calm one → the shared bloom and reveal (kept, never instead). Thirteen family variants:<br>• Destroy "burst to bloom"<br>• Release "exhale to sky"<br>• Discard "clean room"<br>• Distance "vanishing point"<br>• Detach "set free"<br>• Reveal "light through"<br>• Reframe "that's a wrap"<br>• Interrupt "stillness"<br>• Rhythm "encore"<br>• Balance "level"<br>• Sort "cleared desk"<br>• Choice "jackpot"<br>• Absurdity "curtain call" | the climax object, palette, camera move, stinger | L · ~3.0M |
| **S3 Environment kits + lighting rig** | About 8 kits that replace the shared nebula inside the stage: sky, water, warm interior, workshop/lab, stage/studio, street at dusk, nature, deep space. Each has a key light, rim light and colour grade, three parallax depth layers, and particles (dust, rain, fireflies). The performance work from §7 lives here. | the kit, time of day, props, light direction | L · ~3.0M |
| **S4 Sound cue library + sync** | Per-event cues (press, hit, miss, release, round, finish), pitch chains, per-character note sets, and a ≤50 ms sync log for the owner | the cue set per game | M · ~1.0M |
| **S5 Gesture library** | Tap-on-object, hold-on-object (breath), drag with resistance, flick with momentum, trace a path, pinch, corner-peel, circular scrub. All use pointer capture, no text selection and forgiving thresholds. | gesture and thresholds | M · ~1.0M |
| **S6 Reveal + phone chrome redesign** | A reveal card that keeps the calm character and a snapshot of the game's own world, plus the phone-first layout rules | the per-game snapshot | M · ~1.5M |
| Measurement | Real-phone performance runs, input latency (Event Timing), the sound-sync log, and recordings for the approval package | — | M · ~0.8M |

### Tier 1: the front door (19 games users meet first today; Release 1)

**Pilot games**

| Game | Met first (today) | Key work | Effort · tokens |
|---|---|---|---|
| 106 TINY SOUNDTRACK | 1st: sad.low, lonely.low, numb.low, good high/mid/low | pilot P2 | M · 1.0M |
| 1 POP | 1st: anxiety.low, general.mid, general.low | pilot P1 | M · 1.0M |
| 107 GO WEIRD | 1st: shame.low, fear.low | pilot P8 (phone stall) | M · 1.0M |
| 47 UNFOLLOW | 1st: jealous.high, jealous.mid | pilot P4 (phone stall) | L · 2.0M |
| 109 CLEANSE | 1st: shame.high; 2nd: panic.high, anger.high | pilot P3 (no reveal) | M · 1.0M |
| 34 RIVER | 1st: overthinking.mid | pilot P7 (desktop stall) | M · 1.0M |
| 88 TRADE MACHINE | 1st: jealous.low; 2nd: sad.low, good high/mid/low | pilot P6 | M · 1.0M |

**Other front-door games**

| Game | Met first (today) | Key work | Effort · tokens |
|---|---|---|---|
| 110 RAIN OUT | 1st: sad.high, sad.mid | **Phone layout** (2-3 clouds per row, no overlaps). A pull that wrings the cloud into visible rain, and a sky world. Finale: downpour → rainbow. No crying faces at the finish. | M · 1.0M |
| 105 DRAMA MACHINE | 1st: panic.low, overthinking.low | **Move MAKE IT DRAMATIC and CUT out from behind the guide at 390.** A theatre set. The hero overacts, then relaxes on the clapper. Finale: a curtain call. | M · 1.0M |
| 68 DRUM IT | 1st: numb.high, numb.mid | **Reveal never fires.** A real kit with a distinct sample per pad over a backing groove. A drummer character and a crowd. Finale: a stage-dive. | L · 2.0M |
| 52 SUBTITLES | 1st: anger.low | Genre mini-scenes that actually rewrite the thought. An actor character. Finale: a blooper reel. A different layout from 51. | L · 2.0M |
| 93 SPACE MAKER | 1st: overwhelm.mid; 2nd: overwhelm.high | Keep the tiles inside the safe area. The NOW circle grows into a clearing, and the squeezed character stretches out. | M · 1.0M |
| 85 CONTROL PANEL | 1st: overwhelm.low | **RELEASE IT is hidden behind the guide at 390.** Levers with visible consequences and an operator character. | L · 2.0M |
| 104 VOLUME KNOB | 1st: shame.mid | One big knob, with one thought at a time on phone. The shouting character goes quiet, then hums. Finale: a lo-fi tune. | M · 1.0M |
| 31 BACK SEAT | 1st: fear.mid | A car interior. The loud passenger is moved to the back and calms down. Finale: a coastal road. | M · 1.0M |
| 102 FINGER TRAP | 2nd: panic.mid, fear.high, general.mid | Animate the weave relaxing as the player pushes. The character hops out. One big trap at a time on phone. Finale: a woven bracelet. | M · 1.0M |
| 100 HOT POTATO | 2nd: anger.mid | Remove the box and dark band from the faces. A campfire and pond world. In-drag yelp and squash. Finale: the steam becomes a rain cloud. | M · 1.0M |
| 95 SHELF IT | 2nd: anxiety.mid, overwhelm.mid | Lay the cards out under visible shelves. A jar shelf wall, a climbing character, and an armchair finale. | M · 1.0M |
| 61 FREEZE | 2nd: overthinking.high, overthinking.mid | A character frozen in each block, and real SHATTER. Finale: a chain shatter from cold to warm light. | M · 1.0M |

When 115-120 are built, their heroes take first place for shame, overthinking, numb/good, fear.mid, jealous and overwhelm. Several Tier-1 games then become the 2nd pick and the "ONE MORE" second act. They stay high-impact.

### Tier 2: the other 50 routed games (Release 2a, in order of exposure)

Order: 53, 55, 30, 65, 32, 36, 79, 86, 4, 33, 45, 71, 84, 97, 25, 21, 101, 15, 39, 40, 44, 51, 64, 11, 66, 74, 2 (pilot), 24, 43, 59, 75, 77, 81, 87, 18, 37, 41, 69, 72, 89, 98, 22, 28, 29, 67, 99, 8, 19, 13, 14.

- **Sizes:** 28 M, 22 L (2 CRUSH is already counted in the pilots).
- **Estimate:** about 51M tokens at rollout rates.
- **Grouping:** group them by cluster, so each cluster's lead game sets the pattern and its siblings get distinct worlds and gestures (§5).

### Tier 3: 14 bench + 27 vault (Release 2b, menu-only)

- **Sizes:** 13 M, 28 L. **Estimate:** about 51M tokens.
- **Most vault games have fake or passive mechanics** (for example: timing that is not checked, a net with no collision, a negative word revealed six times). They need a gameplay redesign before any polish.
- **Owner decision needed:** rebuild them all, or keep them as they are in the menu (never removed) and rebuild only those that would then earn a route. The catalog's suggestion to merge the cluster-I "form" clones (56, 73, 83, 86) into one swipe-sort deck is one option.

### Release recommendation

| Release | Contents | Outcome | Estimate |
|---|---|---|---|
| **Release 1** | Wave 0 (W0-1 to W0-4) + the six shared systems + measurement + the 8 pilots with approval packages + the remaining 12 Tier-1 games + a full re-rating | The first game a user meets in every emotion band works, fits the phone, has its own world, active characters and its own finale. Every one of the 110 games gets the chrome, reveal and functional fixes. | ~50M tokens (Wave 0 ~7.5M · systems ~12.8M · pilots ~12.4M · Tier 1 ~15M · re-rating ~2M) |
| **Release 2a** | Tier 2 (the 49 remaining routed games), cluster by cluster | Every auto-routed game is premium-ready | ~51M tokens |
| **Release 2b** | Tier 3 (bench + vault) after the owner's rebuild-or-keep decision, plus W0-5 | Full catalogue | up to ~52M tokens (~51M + W0-5 ~1.5M) |

---

## Appendix: method and caveats

- **Raters.** Eight independent rating batches covered 14 games each (12 in the last). Every score cites a screenshot tile.
- **Probes and catalogs.** Phone controls were probed live where screenshots were ambiguous, for example the controls hidden under the Live Guide in batch 1. Mechanics and known weaknesses come from `framer/docs/catalog_A.md` and `catalog_B.md`.
- **Playback.**
  - Games were driven automatically with their real gestures, using the input "my boss yelled at me and I feel panic".
  - Because the text is cut into six chunks, short inputs repeat words, and the last chunk ("panic") drives the final face in many games.
  - A "stall" means 60+ actions or 45+ s with no progress. A few stalls may partly reflect the automated driver, but each one is backed by visible evidence in the screenshots (text selection, off-screen controls, hidden handles). Confirm each by hand when fixing it.
- **Performance figures.** These come from a headless browser without a GPU. Use them to compare games with each other, not as absolute device numbers. The owner's playable build on a real phone is the ground truth.
- **Clusters and routing.** The visual clusters in §5 merge the raters' look-alike notes with a side-by-side review of all 110 phone mid-play screenshots. Routing positions are computed from §7.2 with 111-114 built and 115-120 not yet built. The router skips missing ids, and in the mid and low bands it picks #2 about 20% of the time.
