# ThinkStill Release: Acceptance Criteria from the Founder Requirements

Source: `framer/docs/founder/FOUNDER_REQUIREMENTS.md` (received 2026-10-09; binding). This file turns that document into atomic pass/fail criteria. It does not record any verdicts. The gap audit (Part 26) fills in a status for each id, with evidence.

**Order of precedence.** When two sources disagree, the higher one wins:

1. The founder's newest explicit words. These include the two "2026-10-09 (founder, newest)" lines in `docs/CREATIVE_STANDARDS.md`: per-game dopamine bursts, and tools that look real.
2. `FOUNDER_REQUIREMENTS.md`.
3. `docs/CREATIVE_STANDARDS.md`.
4. The "Owner decisions" in `docs/EOS_SPEC.md`.
5. The body of `EOS_SPEC.md`.
6. The catalogues and the quality report.

Each conflict is listed in the Conflict register (section 9), and each criterion it touches carries a `C<n>` tag.

**Status vocabulary for the audit (Part 26):**

- `VERIFIED`
- `IMPLEMENTED-UNTESTED`
- `PARTIAL`
- `MISSING`
- `REGRESSION`
- `SUPERSEDED`

Every status must cite evidence: a command, an output file, a screenshot or sheet tile, or a `file:line`.

**Id scheme.** `P<part>[.<section>]-<letter>`. Parts with numbered sections keep the founder's numbers (5.1-5.7, 13.1-13.31). Parts without numbered sections get local sections, which are named in each group heading.

---------------------------------------------------------------------------------------------------

## 0. Test kit (used by every criterion)

### 0.1 Builds (scratch only, never the repo)

| key | command | use |
|---|---|---|
| `B-INT` | `python3 framer/dev/eos_integrate.py --dev-dir /tmp/ga_int_<agent> --modules 00_eos_core.jsx 10_eos_readability.jsx 12_eos_dots.jsx 14_eos_mood.jsx 21_eos_game_sigh.jsx 22_eos_game_volcano.jsx 23_eos_game_ground.jsx 24_eos_game_lanterns.jsx 30_eos_arrows.jsx 40_eos_checkin.jsx 45_eos_router.jsx 50_eos_shift.jsx 52_eos_rewards.jsx 55_eos_safety.jsx 60_eos_fixes.jsx` | The release candidate: arcade + Pixar + EOS groups I1-I3 |
| `B-BASE` | `python3 framer/build.py --dev-dir /tmp/ga_base_<agent> --modules 00_eos_core.jsx` | Arcade + Pixar without EOS integration. The relative reference for performance and visuals |
| `B-485` | `git worktree add --detach /tmp/ga_wt_485 485500c`, then build there into its own `/tmp` dev dir, and remove it afterwards with `git worktree remove` | The founder-approved baseline. Used for "no regression of approved behaviour" and "approved burst unchanged" |

`src/pilot/*` (Pilot A) is not in the release. Criteria about Pilot A use the pilot preview (`framer/dev/pilot_build.py`).

### 0.2 Viewports (always in this order)

| key | size | use |
|---|---|---|
| `V1` | 390x844 | Phone; run first. Use `hasTouch:true` where gestures are tested |
| `V2` | 1280x860 | Desktop |
| `V3` | 360x740 and 320x640 | Smaller responsive sizes (Part 3) |

### 0.3 Inputs

| key | input |
|---|---|
| `I-SHORT` | `"my boss yelled at me"` |
| `I-MARK` | `"zebra kettle tuesday"`, unique tokens for tracing words onto objects |
| `I-LONG` | An input of 180 characters or more |
| `I-EMPTY` | No text |
| `I-IMG0`..`I-IMG6` | 0-6 distinct fixture images. Each fixture is a face with coloured bands at its 4 edge midpoints, so cropping can be detected |
| `I-MIC` | `webkitSpeechRecognition` stubbed with `addInitScript` to return `I-MARK` |
| `I-SAFE` | A self-harm or real-threat phrase, used for the safety path |

### 0.4 Game sets

Sweeps hold at most 25 games each, because the CPU is shared.

| key | games |
|---|---|
| `ALL114` | Ids 1-110 (arcade) plus 111-114 (EOS: BIG SIGH, COOL THE VOLCANO, GROUND CONTROL, SKY LANTERNS). Run as 5 sweeps of at most 25 per viewport |
| `NAMED-a` | 1, 2, 3, 4, 6, 15, 16, 18, 21, 22, 23, 24, 25, 41, 47, 67, 85, 86, 87 |
| `NAMED-b` | 88, 89, 90, 91, 92, 93, 94, 96, 97, 98, 99, 100, 103, 104, 105, 107, 109, 110 |
| `BUBBLE` | Built at runtime: games whose play stage shows 2 or more bubble roots at once (`.tsStandardBubble`, `.wordBubble`, `.uniqWord`, or any element with border-radius of 50% or more that holds an image or user text). The audit records the list |
| `BROKEN-KNOWN` | Ids with an unfinished run in `docs/quality/metrics.json` (20 runs, 14 ids): 8, 14, 17, 21, 28, 34, 45, 47, 48, 51, 71, 77, 103, 107 |
| `FRONT` | The "Tier 1 front door" list in `docs/QUALITY_REPORT.md` section 9 |

`NAMED-a` plus `NAMED-b` are the games named in Part 13.

### 0.5 Shared procedures

The drivers are `framer/dev/drive.mjs` and `framer/dev/eos_drive.mjs`.

| key | procedure | pass rule |
|---|---|---|
| `H1` finish | `launchEos({dir,width,height})`, then `startGameById(page,id,text)`, then `finishGame(page,id)` | `finished`; `progressLog` never decreases; reveal is reached; `errors` is empty |
| `H2` visible(sel) | Sample every 100 ms | The element exists; its rect is larger than 0 and inside the viewport; opacity is above 0.5; visibility is not hidden; `elementFromPoint` at its centre hits it or a descendant. Zero failing samples |
| `H3` overlap | Pairwise `getBoundingClientRect` intersection | Intersection area is 0 px² |
| `H4` circle | Check each bubble root and its clip | abs(w-h) ≤ 1 px. Clip is border-radius of 50% or more with `overflow:hidden`, or `clip-path: circle()`. The image box keeps its natural aspect ±2% (`object-fit` is never `fill`). No `scaleX`≠`scaleY` at rest |
| `H5` image complete | Screenshot pixel probe for the 4 edge-midpoint bands of an `I-IMG*` fixture | Each band is at least 50% visible inside the bubble. Image diameter is at least 50% of the bubble diameter and at least 40 px at `V1` |
| `H6` no mask | DOM pass plus pixel pass | DOM: no element or `::before`/`::after` inside the bubble root has a background, gradient or box-shadow with luminance < 0.12 and alpha ≥ 0.35 that intersects the image or text box. Pixels: mean luminance of an 8 px ring just inside the image edge is at least 85% of the fixture's own edge luminance |
| `H7` text below, inside | `Range.getClientRects()` for every line of user text | Line top ≥ image bottom - 1 px. Every line-box corner sits inside the bubble circle of radius r-2 px. Centre offset ≤ 3 px. User words ≥ 15 px (other copy ≥ 12 px). `scrollWidth` ≤ `clientWidth` |
| `H8` sound log | `addInitScript` wraps `AudioScheduledSourceNode.prototype.start`, `HTMLMediaElement.prototype.play/pause` and `AudioContext.prototype.resume/suspend/close`, and logs `{t:performance.now(), kind, src}`. A capturing listener logs `pointerdown`/`pointerup` | Gives offsets between input and cue. These are **scheduled/triggered** cues only: headless Chromium has no audio output, so nothing is "heard" |
| `H9` frames | Sample rAF intervals, `PerformanceObserver` long tasks and Event Timing entries | Comparison is **relative only**: `B-INT` against `B-BASE` (or `B-485`), same machine, same session. Headless has no GPU, so absolute FPS is not evidence |
| `H10` burst signature | When the finale root (game-owned finale, or `.tsRewardSurge.mega`) mounts, record the class list, child counts by class, and `getAnimations()` name, duration, delay and easing. Take screenshots at +0.2, +0.6 and +1.2 s with a seeded `Math.random` | Compare with `B-485` |
| `H11` flash | `flashCheck(page, 2000)` | No more than 3 flashes per second (WCAG 2.3.1 general and red-flash thresholds) |
| `H12` sheet | `python3 framer/dev/contact_sheet.py`. Tiles are start / mid / finale / reveal at `V1` then `V2` | Human review. Each claim cites the tile |

---------------------------------------------------------------------------------------------------

## A. Console, layout, header, feedback and controls (Parts 3, 10, 14)

Local sections:

- P3.1 global layout
- P3.2 header
- P3.3 feedback bubble
- P3.4 existing controls

| id | requirement (one line) | pass/fail test (what · sizes · games) | scope | conflicts / notes |
|---|---|---|---|---|
| P3.1-a | The whole experience fits one mobile screen | Check at input, play (start and mid), finale and reveal. `scrollingElement.scrollHeight` ≤ `innerHeight`+1. `.releaseGameHost`, the header and the composer (when shown) lie fully in the viewport. Sizes: `V1`, `V3`; `V2` informational. Games: `ALL114` at `V1`, `FRONT` at `V3` | S: shell CSS | EOS §4.5: the 390 px HUD overflowed |
| P3.1-b | No vertical scrolling during gameplay | During play, no element inside `.releaseGameHost` has `overflow` auto or scroll with scrollHeight > clientHeight+2 (listed menus excepted). Wheel and touch-drag on empty stage leave `scrollY` and ancestor `scrollTop` unchanged. `V1` · `ALL114` | S | |
| P3.1-c | Important controls stay visible and reachable | `H2` on close, title, score bar and sound (header); input, mic, + and game menu (composer, when shown); AGAIN, NEW THOUGHT, TRY and prev/next (reveal). Hit target ≥ 44x44 px at `V1`. `V1`, `V2` · `NAMED-a` + 111-114 | S | C5, C6 |
| P3.1-d | The game gets the largest practical area | `.releaseGameHost` area during play is at least 55% of the viewport at `V1` and at least 50% at `V2`, and no more than 5% smaller than `B-485`. `V1`, `V2` · `FRONT` | S | |
| P3.1-e | Controls never interfere with the game | `H3`: the HUD, EOS companion, check-in chip, world chips, feedback bubble and guide card each against every gesture target (EOS_GESTURES table / catalogue control column). Must be 0 px² at start and mid. `V1`, `V2` · `NAMED-a`, `NAMED-b` | S | C6 |
| P3.1-f | No long instruction paragraphs or decorative panels | During play, visible instruction copy is at most 2 lines (about 90 characters) at `V1`. No non-interactive panel covers more than 15% of the stage. `V1` · `ALL114` | S: guide card | |
| P3.1-g | Balanced on desktop and on mobile | `H12` review. The arena centroid is within 4% of the stage centre, and no empty band exceeds 30% of the stage. `V1`, `V2` · `FRONT` | S | Human-reviewed |
| P3.1-h | Characters, text and objects are readable | `smallText(page,12)` returns nothing at play and reveal. User words ≥ 15 px. In-world character images ≥ 48 px at `V1`. `V1`, `V2` · `ALL114` | S: readability module | C9 |
| P3.1-i | The premium dark/neon look and themes are kept | Idle and play screenshots match `B-485` side by side. The `accent` and `background` property controls still re-theme the stage. `V1`, `V2` | S | |
| P3.1-j | No distorted or imperfect circles anywhere | `H4` on every element with border-radius ≥ 50% or a class matching `/bubble\|orb\|ring\|circle\|coin\|knob/i`. `V1`, `V2`, `V3` · `ALL114` | S | Same rule as P5.1-a |
| P3.2-a | The game title is centred | abs(centre(`.releaseConsoleTitle`) - centre(`.releaseConsoleHeader`)) ≤ 4 px for the longest names (UNFINISHED SENTENCE, COIN FLIP REACTION, COOL THE VOLCANO), with no clipping. `V1`, `V2`, `V3` | S: header | Header grid is `52px minmax(0,1fr)`; verify the measured centre |
| P3.2-b | Top-right holds progress/score and then sound, in that order | The right edge of `.releaseScoreBar` is at or left of the left edge of `.releaseHeaderSound`. Both sit on one row in the right 35% of the header. `V1`, `V2` · all stages | S: header | |
| P3.2-c | The progress indicator never disappears | `H2` on `.releaseScoreBar` and the in-game progress HUD every 100 ms, through start, play, finale, reveal, AGAIN, a mid-game switch, the EOS check-in, the shift meter and the safety card. Zero failing samples. `V1` · `NAMED-a` + 111-114; `V2` · `FRONT` | S | Part 15 regression |
| P3.2-d | The sound toggle controls all game audio consistently | With sound off, `H8` logs no new `start()` or `play()` from `useSfx`, `useRainSfx`, `useSharedMusic`, `eosTone` or new-game audio. Turning sound on resumes them. The `aria-pressed`/`active` state matches. `V1`, `V2` · games 1, 106, 110, 112 | S | EOS I1-E14 mirrors sound into `EOS_STORE` |
| P3.3-a | The feedback bubble sits bottom-right | The centre of `.globalFeedbackCopyLayer` (step and finish) lies in the bottom-right quadrant of `.releaseStage`. `V1`, `V2` · `NAMED-a` | S | |
| P3.3-b | The feedback bubble is transparent or lightweight | Computed background alpha ≤ 0.6, or glass with blur and alpha ≤ 0.75. Area ≤ 8% of the stage at `V1`. `V1`, `V2` | S | One rule sets `rgba(13,31,48,.95)`; check which rule wins |
| P3.3-c | The feedback bubble stays about 1-2 s | Time from mount to opacity < 0.05 (or unmount) is between 0.9 and 2.2 s. `V1` · 10 games | S | |
| P3.3-d | The feedback bubble never covers game elements or important text | `H3` against gesture targets, user words, character faces and the progress HUD. 0 px². `V1`, `V2` · `NAMED-a`, `NAMED-b` | S | C6 |
| P3.3-e | Feedback is immediate and playful | Appears within 150 ms of the step's progress update. Copy passes `lintCopy`. A 6-step game shows at least 3 distinct strings. `V1` · 10 games | S | P17 vibe copy |
| P3.3-f | Messages never replace the game view | During play, outside the finale, no non-game element with opacity > 0.5 covers more than 25% of the arena. `V1` · `ALL114` | S | |
| P3.4-a | Change Vibe is kept | The vibe control is reachable within 1 tap of play and changes copy (see P17-c). `V1`, `V2` | S/host | No Jolly/Cheeky/Unfiltered selector was found in Release `src`; check the host before marking it MISSING |
| P3.4-b | Save/Vault is kept where it applies | Any save/vault control present in `B-485` or the host is present and works in `B-INT`. `V1`, `V2` | S/host | In `src/eos`, "vault" means a non-routed game class (EOS §7). Do not confuse the two |
| P3.4-c | Sharing is kept | A share control exists on the reveal and works opt-in (P19). `V1`, `V2` | S | |
| P3.4-d | Score/XP/progress is kept | `.releaseScoreBar`, the in-game HUD and the reward HUD `.tsShiftRewardHud` are present. `V1`, `V2` | S | |
| P3.4-e | The sound control is kept | See P3.2-d | S | |
| P3.4-f | Game navigation is kept | `button.releaseChoiceButton` is reachable at input and play. Prev/next are reachable on the reveal. `V1`, `V2` | S | C5 |
| P3.4-g | New thought is kept | NEW THOUGHT (`clearForNext`) returns to input with the field ready. `V1`, `V2` | S | |
| P3.4-h | Replay is kept | ↻ AGAIN (`.releaseReplaySame`) replays the same game with the same thought. `V1`, `V2` | S | |
| P3.4-i | Image and microphone inputs are kept | `button.releaseIconButton` (+) and `button.releaseInputMic` are visible and work, including while the EOS check-in is up. `V1`, `V2` | S | C3 |
| P3.4-j | No working control is removed | At input, play and reveal, every accessible name (button, link, input) in `B-485` is present in `B-INT` at the same stage or within 1 tap. Diff is automated. `V1`, `V2` · 5 games | S | CREATIVE_STANDARDS #7 |
| P10-a | Idle bubbles breathe or animate | At input, at least 1 running animation on the idle stage (`.releaseIdleStage`, `.ts-abyss-*` or the EOS Still Point). Two screenshots 1 s apart differ in that region. `V1`, `V2` | S | |
| P10-b | A brief, clear explanation of how Release works | `.releaseIdleStory` steps, or an equivalent, are visible at input. Each is ≤ 12 words and ≥ 12 px. Checked with the EOS check-in on and off. `V1`, `V2` | S | C3: check-in CSS hides `.releaseIdleStory` while it is up |
| P10-c | Idle letters and instructions are readable | `smallText(page,12)` returns nothing at input. Contrast ≥ 4.5:1. `V1`, `V2` | S | |
| P10-d | No blank or lifeless idle screen | From 300 ms after load, no 100 ms sample shows a uniform stage (luminance std-dev under the threshold). `V1`, `V2` | S | |
| P10-e | The idle animation never delays play | Long tasks during idle ≤ `B-BASE`. From game pick to the first visible arena frame ≤ `B-BASE` +10%. `V1` (relative, `H9`) | S | |
| P10-f | Idle has a reduced-motion form | With `reducedMotion:"reduce"`, idle stays gently alive with no large motion, and `H11` passes. `V1` | S | |
| P14-a | Images are bright and clean | No CSS filter with brightness < 1, no opacity < 0.9 and no dark overlay on bubble or object images during play. Fixture luminance is at least 90% of the source. `V1`, `V2` · `BUBBLE` | S | Same rule as P5.4 |
| P14-b | Objects are properly centred | The centroid of the primary object group is within 5% of the arena centre (for centred designs). `H12`. `V1`, `V2` · `NAMED-a`, `NAMED-b` | S/G | |
| P14-c | Clouds stay large (RAIN OUT) | `.rainCloudUnit` width is at least the `B-485` value. `V1`, `V2` · 110 | G | Non-regression of an earlier fix |
| P14-d | Words are properly visible | At start and mid, `elementFromPoint` at the centre of each user-word element returns that element. `V1`, `V2` · `ALL114` | S | |
| P14-e | End screens are impressive | The reveal shows a game-specific completion moment and the card, and is not plainer than `B-485` (`H12` side by side). `V1`, `V2` · `FRONT` | S/G | Founder judges |
| P14-f | Less clutter | Reveal: at most 3 primary actions plus prev/next. Play: at most 1 guide card, 1 arrow and 1 feedback bubble at the same time. `V1` · `ALL114` | S | C5 |
| P14-g | Everything works together as one premium experience | The founder reviews the `H12` sheets and playable build. Never auto-claimed | S/G | Part 23 gate |

---------------------------------------------------------------------------------------------------

## B. Input, personalisation and upload (Parts 4, 6)

Local sections:

- P4.1 prompt and inputs
- P4.2 personalisation
- P6.1 popup
- P6.2 maximum
- P6.3 distribution
- P6.4 label
- P6.5 image + text

| id | requirement | pass/fail test | scope | conflicts / notes |
|---|---|---|---|---|
| P4.1-a | The primary input prompt reads "What emotion are you carrying?" | At input, the exact string is the visible composer prompt (label, heading or placeholder), with the EOS check-in on and off. `V1`, `V2` | S: composer | C3. In code, the string is absent at HEAD and at 485500c. The placeholder (L22333) is "Put your emotion, feeling or thought into words to release it." |
| P4.1-b | The supporting line reads "Your thoughts are materialised to be released." | The exact string is visible next to the prompt at input. `V1`, `V2` | S: composer | C3. The closest current copy is the idle step "WE MATERIALISE IT" (L20993) |
| P4.1-c | Text, mic and image inputs all feed the game | Each of `I-MARK` typed, `I-MIC` and `I-IMG1` launches a game whose objects carry that material (P4.2-a/b). `V1`, `V2` · 1, 100, 110 | S | |
| P4.1-d | No lengthy questionnaire before play | With the check-in on and with it off: type, then pick a game or LET THINKSTILL CHOOSE. Play starts in ≤ 2 interactions after typing. The check-in is optional, needs ≤ 2 taps, keeps the composer and menu clickable, and has a ≥ 44 px "just let me play" exit. `V1`, `V2` | S: composer + EOS check-in | C3 |
| P4.1-e | Empty or missing optional input is handled gracefully | `I-EMPTY` + `I-IMG0`: the game shows character imagery and a neutral or starter label. No "undefined", no empty object, no crash. `V1` · 1, 23, 100, 109, 110 | S | |
| P4.2-a | The user's own words become game objects | With `I-MARK`, at start at least one in-arena element is (or sits inside) the gesture target and contains a marker token. Header, guide and reveal do not count. `V1` · `ALL114` (5 sweeps) | S/G | |
| P4.2-b | Uploaded images become game objects | With `I-IMG1`, the fixture's `src` (img or background-image) appears inside in-arena game objects. `V1` · `BUBBLE` ∪ `NAMED-a` ∪ `NAMED-b` | S/G | |
| P4.2-c | The input stays in the game, not only on the opening screen | At progress ≥ 40%, marker tokens and the fixture image are still on the objects being manipulated. `V1` · `NAMED-a`, `NAMED-b` | G | |
| P4.2-d | No placeholders when usable input exists | With `I-MARK`, no object label is a seed, starter or generic word (for example "HOT", "THOUGHT", "WORRY") in place of the user's words. `V1` · `ALL114` | S/G | C7: the safety flag (P18-e) is the only exception |
| P4.2-e | The input is physically connected to the game | The object carrying the words receives the gesture and visibly transforms or leaves. At reveal, the marker tokens are gone from the arena or transformed by design. `V1` · `NAMED-a`, `NAMED-b` | G | Also P22.C |
| P4.2-f | Long input fits | `I-LONG` is split over at most 6 objects. `H7` passes with no overflow and no user word under 15 px. `V1`, `V2` · `BUBBLE` | S | `cleanEntries` (L2558) always makes 6 chunks |
| P4.2-g | Starter prefill never overwrites the user's typing | An EOS emotion pick with `raw` empty prefills a starter. With typed text, `raw` is unchanged. Switching emotion replaces only an untouched starter. `V1` | S: EOS check-in | EOS §6.2 |
| P6.1-a | + opens a small popup right above the + control, at the far right | `.releaseUploadPopup` bottom ≤ (+).top + 4 px. Its right edge is within 24 px of the + right edge. Area ≤ 30% of the viewport. During play it covers ≤ 10% of the arena. `V1`, `V2` | S: composer | |
| P6.1-b | The popup holds six image slots | Count of `.releaseUploadSlot` = 6. `V1`, `V2` | S | |
| P6.1-c | The popup closes on an outside click | Clicking the backdrop or stage removes the popup. `V1`, `V2` | S | |
| P6.1-d | The popup closes when another input method is chosen | Focusing the text input, tapping the mic or opening the game menu closes it. `V1`, `V2` | S | |
| P6.1-e | The popup closes when the interaction completes | After the 6th upload or after a game starts, the popup is gone. `V1`, `V2` | S | |
| P6.2-a | Up to six images are supported | Uploading 7 keeps 6 (`MAX_UPLOAD_IMAGES=6`) and shows clear feedback, never a silent drop. `V1` | S | |
| P6.3-a | Images are spread evenly over the six positions | For n = 1..6, each image fills floor(6/n) or ceil(6/n) positions: 1→6, 2→3/3, 3→2/2/2, 4→2/2/1/1, 5→2/1/1/1/1, 6→1 each. Unit test of `expandUploadImageSlots` (L6807), plus a runtime read of the bubble image `src`s. `V1` · 1, 100, 109, 110 | S | |
| P6.3-b | Copies of the same image are not grouped together | For n ≥ 2, no two adjacent positions (by index and by visual neighbour) share an image when another arrangement exists: 2→ABABAB, 3→ABCABC, 4→ABCDAB, 5→ABCDEA. `V1` · same games | S | `expandUploadImageSlots` (L6807) emits runs such as AAABBB; expect a FAIL. Fixing this shared function fixes every game |
| P6.3-c | Games with other position counts use the same fair rotation | Games with fewer than 6 or more than 6 (up to 10) image positions keep counts within ±1 and alternate images. `V1` · 100, 103, 104 | S | |
| P6.4-a | No "UPLOADED IMAGE" label anywhere | With `I-IMG1..6` and no text, at every stage, `document.body.innerText` and `::before`/`::after` content contain no `/UPLOADED IMAGE/i`. `V1`, `V2` · `ALL114` (one sweep per size) | S | The sentinel lives in `cleanEntries` (L2499-2584) and must never render |
| P6.4-b | Uploaded images sit naturally inside objects | No caption, badge or chip over an uploaded image. `H12`. `V1` · `BUBBLE` | S | |
| P6.5-a | Image and text in the same object follow the bubble rules | Run `H4`, `H5`, `H6` and `H7` at start, mid and just before finish. The image stays recognisable throughout. `V1`, `V2` · `BUBBLE` + 100 | S | See P5.3-P5.5 |
| P6.5-b | Images-only input leaves no empty text strip | With `I-IMG*` and `I-EMPTY`, the text area under the image is hidden or neutral. No black strip and no placeholder label. `V1` · `BUBBLE` | S | |

---------------------------------------------------------------------------------------------------

## C. Bubbles and characters (Parts 5, 7)

Local sections for Part 7:

- P7.1 assets
- P7.2 alive
- P7.3 consistency
- P7.4 honest progression
- P7.5 responsiveness

| id | requirement | pass/fail test | scope | conflicts / notes |
|---|---|---|---|---|
| P5.1-a | Bubbles are true circles | `H4` on every bubble root. `V1`, `V2`, `V3` · `BUBBLE` (all ids) | S | |
| P5.1-b | Images are never squashed | Image aspect = natural aspect ±2%. No `object-fit:fill`. A non-uniform scale is allowed only as a squash-and-stretch frame that returns to 1:1 within 250 ms. `V1`, `V2` · `BUBBLE` | S | CREATIVE_STANDARDS #1 allows short squash and stretch |
| P5.1-c | No irregular clipping from responsive layouts | Each bubble rect sits inside the arena and inside every ancestor whose overflow is not visible. `V1`, `V2`, `V3` · `BUBBLE` | S | |
| P5.1-d | Multi-bubble games show at least 5 visible circular bubbles | At start, count bubbles that are in the viewport, have opacity > 0.5 and are not occluded. Count ≥ 5. `V1`, `V2` · `BUBBLE` | S/G | C12: games whose approved mechanic shows one object at a time are listed as named exceptions |
| P5.1-e | Bubbles fit the play area | P5.1-c holds, and resting bubbles overlap each other by ≤ 10% of their area. `V1`, `V2` · `BUBBLE` | S | |
| P5.2-a | Every bubble shows a clearly visible picture | Each bubble root has an img or background-image with `naturalWidth` > 0, rendered at ≥ 40 px at `V1` and opacity ≥ 0.9. `V1`, `V2` · `BUBBLE` | S | |
| P5.2-b | Pictures come from ThinkStill's character and expression library | Every bubble picture `src` (without uploads) belongs to the shared character/expression asset set. No emoji glyph stands in for a picture. `V1` · `BUBBLE` | S | |
| P5.2-c | Without uploads, bubbles show emotion or character imagery | With `I-IMG0`, P5.2-a passes. `V1` · `BUBBLE` | S | |
| P5.2-d | With uploads, images follow the upload rules | See P6.3-a/b. `V1` · `BUBBLE` | S | |
| P5.3-a | The full image is visible, with no important part cropped | `H5`: all 4 edge-midpoint bands are visible. Image uses `object-fit:contain`, or an equivalent inset. `V1`, `V2` · `BUBBLE` + 86, 90, 100, 109, 110 | S | `--ts-upload-bubble-scale:1.06` (L13) can crop; verify |
| P5.3-b | Images are large enough to enjoy | Image diameter is at least 50% of the bubble diameter and at least 40 px at `V1`. Image area is at least 30% of bubble area. `V1`, `V2` · `BUBBLE` | S | C1 |
| P5.4-a | No black mask, background, rectangle or overlay around bubble pictures | `H6`, DOM and pixel passes, at start and mid. `V1`, `V2` · `BUBBLE` + 100 | S | Global rule; the founder reinforced it in October |
| P5.4-b | Bubble text sits in no dark box | The text element and its ancestors up to the bubble root have no background with luminance < 0.12 and alpha ≥ 0.35. No box-shaped shadow. A soft glow text-shadow (blur ≥ 4 px) is allowed. `V1`, `V2` · `BUBBLE` | S | |
| P5.4-c | Dark masks never come back | A static lint over `src/**/*.jsx` finds CSS rules whose selectors match `/Bubble\|uniqWord\|Potato\|tsStandardBubble\|MaterialImage/` and that set a dark background or overlay (black, `#000`, or `rgba(0,0,0,≥.35)`). Pass: 0 hits outside a reviewed whitelist | S | Guard against regressions |
| P5.5-a | The user's text sits below the picture and inside the same bubble | `H7`. `V1`, `V2`, `V3` · `BUBBLE` + 100 | S | C1. This supersedes the ambiguous "below the image" in CREATIVE_STANDARDS #4 and any caption placed outside the bubble |
| P5.5-b | Text never covers the face or main image | Intersection of text line boxes with the image rect = 0. `V1`, `V2` · `BUBBLE` | S | |
| P5.5-c | Text is centred and properly wrapped | Centre offset ≤ 3 px. At most 3 lines. No break inside a word unless the word is wider than the line (then ellipsis or hyphen). `V1`, `V2` · `BUBBLE` | S | |
| P5.5-d | Text is legible and correctly scaled | User words ≥ 15 px (16 px target). Contrast ≥ 4.5:1 against the sampled bubble background. `V1`, `V2` · `BUBBLE` | S | C9 |
| P5.5-e | No letter sticks out of the circle | Every line-box corner is inside the circle (r-2 px), and `scrollWidth` ≤ `clientWidth`. `V1`, `V2`, `V3` · `BUBBLE` + 99 | S | |
| P5.5-f | Text is never shrunk to fit a layout that is too small | When the text cannot fit in 3 lines at the floor size, the bubble grows or the text is split. The font never drops below the floor (`noShrink` against `B-BASE`). `V1` · `BUBBLE` | S | C1: `--tsb: clamp(58px,9vw,108px)` (L14) gives 58 px bubbles at 390 px, which cannot meet both P5.3-b and P5.5-d |
| P5.6-a | All bubbles share one styling standard | Across `BUBBLE` at the same viewport: the image-to-bubble ratio has std-dev ≤ 0.05; user-text px within ±1 for equal text length; image-to-text gap 4-10 px. Clip and contrast come from shared CSS or a shared component. `V1`, `V2` | S: `tsStandardBubble` / readability | |
| P5.6-b | CLEANSE is the reference look | Record CLEANSE (109) bubble metrics. Other `BUBBLE` games deviate by ≤ 10% on ratio, gap and text size. `V1`, `V2` | S | |
| P5.6-c | Games do not each invent their own picture-and-text layout | Static count of per-game CSS overrides (`.u<ID>` …) that set bubble image or text layout. Each one needs a cited reason, and the count must not grow over time | S | Also P20-c |
| P5.6-d | Bubble animation quality is consistent | `H12` review of idle breathing and the pop/squash on bubble games. `V1` | S | Human-reviewed |
| P5.7-a | Fine-grained text size steps are kept | The `bubbleTextPx` control keeps `step` ≤ 0.5. Setting 16 and then 20 changes the measured user-word px by ≥ 3, never below the floor. `V1` · 1, 99, 109 | S | C9. EOS §4.6 says the prop does nothing today (default 4). EOS's planned fix (default 16, max 28) must keep the 0.5 step |
| P5.7-b | Image zoom beyond 2.5x is kept, without cropping in game | Wherever the image editor exists, zoom reaches at least 3x, and the in-game render still passes P5.3-a | S/host | No zoom or scale control was found in Release `src`; check the host editor before marking it MISSING |
| P7.1-a | Only the seven-character cast assets are used | Every character image in games, the companion or the check-in comes from the shared Glitch/Drop/Loopie/Patch/Rush/Still/Sync asset maps. 0 emoji or stock stand-ins. `V1` · `ALL114` | S | |
| P7.1-b | Each emotion shows its matching character | For each detected or checked-in emotion, the character shown matches the core emotion → character map (`EOS_EMOTIONS`). `V1` · 8 emotions × 1 game | S | |
| P7.2-a | Characters react to the player's actions | Within 150 ms of each counted gesture, the in-world character's image `src`, class or transform changes (expression swap, recoil or squash). `V1` · `FRONT` + `NAMED-a` | S/G | CREATIVE_STANDARDS #1 |
| P7.2-b | Characters cover the full reaction range | Each game shows at least 3 distinct expression states across start, mid and finish (worried, reacting or surprised, then settled or celebrating). `V1` · `NAMED-a`, `NAMED-b` | G | |
| P7.2-c | Characters take part in the world, not as static portraits | At least one character lives inside the game scene; a corner companion alone fails. `H12`. `V1` · `ALL114` | G | C8 |
| P7.3-a | No duplicate emotion pictures | Without uploads, among the 6 bubbles: at least 3 distinct expression `src`s and no two identical neighbours (unless the design says otherwise). `V1` · `BUBBLE` | S | |
| P7.3-b | Characters are never cut off, too small or covered by text | `H5` on character images. ≥ 48 px in world, ≥ 40 px in bubbles. P5.5-b holds. `V1`, `V2` · `ALL114` | S | |
| P7.3-c | Expressions move the right way, from loud toward calm | The expression sequence follows progress: loud, then softer, then calm. It never goes back to a louder face, except a designed twist of ≤ 1 s. `V1` · `NAMED-a`, `NAMED-b` + 111-114 | S/G | |
| P7.4-a | Never claim the user feels better unless they said so | Scan all finish, reveal and character copy across `ALL114` for claims such as "you feel calm now", "healed" or "anxiety gone". Pass: 0. The EOS shift stamp "LIGHTER"/"BRIGHTER" appears only when the user's own after-dial shows Δ ≥ 1. `V1` | S | C5. EOS §6.6 |
| P7.5-a | Characters react quickly | Event Timing gives input → character change p95 ≤ 150 ms, compared with `B-BASE` (`H9`, relative). `V1` · `FRONT` | S | |

---------------------------------------------------------------------------------------------------

## D. Gameplay, navigation and emotional arc (Parts 8, 9, 16)

Local sections:

- P8.1 active play
- P8.2 real mechanics
- P8.3 progression
- P9.1 selector
- P9.2 switching
- P9.3 end navigation
- P16 arc

| id | requirement | pass/fail test | scope | conflicts / notes |
|---|---|---|---|---|
| P8.1-a | The player must physically act to release the emotion | 30 s with no input leaves progress < 10% and no finish. No generic NEXT/CONTINUE/OK button drives progress. `V1` · `ALL114` | G | Stillness games (for example 65 PAUSE BUTTON and 80 DON'T TAP) are named exceptions with stated reasons |
| P8.1-b | Every successful action gives visible and audible feedback | Within 150 ms of each progress step: an arena screen difference ≥ 2% (or a DOM change on the target), plus an `H8` cue. `V1` · `NAMED-a`, `NAMED-b` | S/G | `H8` evidence is scheduled only |
| P8.2-a | Every game has a real mechanic of its own | A mechanic signature per game (gesture × physics × goal × feedback loop) taken from catalog_A/B and EOS_GESTURES. No two games in a look-alike cluster (QUALITY_REPORT §5, C1-C11) share a signature. `V1` · `ALL114` | G | CREATIVE_STANDARDS #3 |
| P8.2-b | The named pairs really differ | BURN (18) vs MELT (16), and SHRED (15) vs POP (1), have different signatures. SLINGSHOT (24), VACUUM (23) and UNHOOK (41) pass their F-group checks. `V1` | G | See group F |
| P8.2-c | World, mechanic, sound and finale fit the game's name | `H12` review, plus `H8` cue kinds that match the action. `V1` · `NAMED-a`, `NAMED-b` | G | |
| P8.3-a | The starting state is understandable | Within 1.0 s of mount, the target object and a guide (EOS hand or arrow, or a guide card of ≤ 6 words) are visible, and `arrowState` names a target. `V1`, `V2` · `ALL114` | S | |
| P8.3-b | The emotional object or challenge is visible | See P4.2-a | S/G | |
| P8.3-c | The interaction is distinct | See P8.2-a | G | |
| P8.3-d | Visual feedback is responsive | See P8.1-b | S/G | |
| P8.3-e | Progress is felt | `progressLog` never decreases, and the visual state changes at each step. `V1`, `V2` · `ALL114` | S | QUALITY_REPORT: 96 went backwards (100% → 17%) |
| P8.3-f | The successful ending is clear | Progress reaches 100, `.globalPlayGuide.isComplete` (or the engine's done signal) fires, and the user's material is removed or transformed. `V1`, `V2` · `ALL114` | S/G | |
| P8.3-g | The finale is satisfying | See group E (P11) | G | |
| P8.3-h | Navigation after completion is useful | See P9.3 | S | |
| P8.3-i | Every game can be won | `H1` passes within 150 s with no stall and `errors` empty, at `V1` (touch) and `V2` · `ALL114`, `BROKEN-KNOWN` first | G | Priority 0 |
| P8.3-j | The player can tell they won | A reveal or explicit finish feedback appears ≤ 2.5 s after progress hits 100. `V1`, `V2` · `ALL114` | S | |
| P9.1-a | "Let ThinkStill choose" is offered | The first `button.releaseChoiceItem` is LET THINKSTILL CHOOSE, and it launches a routed, completable game. `V1`, `V2` | S: menu + router | |
| P9.1-b | Games can be picked by hand | The menu lists every playable id. A random sample of 25, launched via `startGameByName`, starts the named game. `V1`, `V2` | S | |
| P9.1-c | The catalogue is not cut back to 15 | The menu keeps LET THINKSTILL CHOOSE + "15 SIGNATURE RELEASES" (L22608) + "MORE RELEASES · N" (L22639), where N is the rest of the playable games. The EOS `EosMenuGroup` adds a group and removes none. `V1`, `V2` | S | C4 |
| P9.1-d | The menu is compact and discoverable | Opens in 1 tap from input and play. At `V1` it fits the viewport and scrolls only inside itself. Group labels ≥ 12 px. Items ≥ 44 px. Closes on an outside tap. `V1`, `V2` | S | EOS §4 says the group labels are 7 px |
| P9.1-e | The player is never trapped | From any play state, the menu and the close/NEW THOUGHT controls are clickable (`H2`) in 1 tap. `V1`, `V2` · `NAMED-a` | S | |
| P9.1-f | Broken games are not offered as normal | No id that fails P8.3-i is routed by LET THINKSTILL CHOOSE or the EOS router. In the menu, such ids are fixed, hidden or clearly marked. `V1` | S | Part 13.31. EOS "vault/bench" classes |
| P9.2-a | Switching games mid-play works | Play to about 40% in A, then open the menu and pick B. B mounts in ≤ 2.5 s, A's root is gone, and the title and HUD show B. Pairs: 1→110, 110→111, 112→18, 24→100, 106→1. `V1`, `V2` | S | |
| P9.2-b | No old animation is left after a switch | No `.u<A>` or engine nodes remain. `getAnimations()` count and rAF callbacks per frame return to the B-only level ±10%. `V1` · same pairs | S | Also P15.2-d |
| P9.2-c | No duplicate or leftover audio after a switch | `H8`: A's loops (rain, tiny soundtrack, per-bubble music) stop within 300 ms. No two copies of the same loop. Music moves to B's URL once. `V1` · same pairs | S | |
| P9.2-d | No old images are left after a switch | No `src` unique to A's objects stays in the arena. `V1` · same pairs | S | |
| P9.3-a | AGAIN, NEW THOUGHT and TRY <game> are inside the container | All three are on the reveal: ↻ AGAIN (`.releaseReplaySame`), NEW THOUGHT (`clearForNext`, L21553), TRY <recommended> (`tryRecommendedRelease`, L21452). Each one works. `V1`, `V2` · 10 games | S | C5 |
| P9.3-b | The TRY suggestion is contextual | 5 different thoughts and histories give at least 3 different suggestions. Never the game just played. Never a game that fails P8.3-i (for example 8 METEOR today). `V1` | S | C16 |
| P9.3-c | Previous/next and "Try next game" sit outside the container | `.releaseCompleteSideNav` prev and next are visible (`H2`) and work. A "try next game" action exists. `V1`, `V2` | S | C5: on phones, EOS CSS (50_eos_shift.jsx L1420) hides the side nav until the shift meter is done. It must stay reachable in ≤ 1 tap |
| P9.3-d | The finale screen is not crowded with buttons | At most 3 primary buttons plus 2 side arrows. If the EOS buttons (I'M GOOD, ONE MORE, SHARE) are shown, the functions of AGAIN, NEW THOUGHT and TRY must stay available: test the function mapping, not the labels. `V1`, `V2` | S | C5 |
| P9.3-e | Another game starts without onboarding again | From the reveal to the next game playing takes ≤ 2 taps and ≤ 3 s. Neither the check-in nor the idle story is forced again. `V1`, `V2` | S | C3, C5 |
| P16-a | Opening: the emotion is a real thing in the world | P4.2-a holds, and there is anticipation (idle motion on the object, or a worried face). `V1` · `NAMED-a`, `NAMED-b` | G | |
| P16-b | Interaction: the world and characters respond | P7.2-a and P8.1-b hold | G | |
| P16-c | Escalation: feedback grows with progress | The effect size at steps 5-6 (screen-difference area, particle count, cue layers) is at least 1.3x that at steps 1-2. `V1` · `NAMED-a`, `NAMED-b` | G | Human confirms |
| P16-d | Twist: something unexpected happens | Each game has at least one designed surprise state between 40% and 90% progress. It is recorded in the audit and seen in mid tiles (`H12`). `V1` · `ALL114` | G | Human-reviewed |
| P16-e | Finale: the material is visibly released by that game's mechanic | P11.1-a and P11.2-c hold | G | |
| P16-f | Completion: the interface returns to a clear, controlled state | 4 s after the finale, the reveal and its navigation are clickable, with no leftover overlay or particles blocking them. `V1`, `V2` · `ALL114` | S | |
| P16-g | No emotional benefit is claimed that the user did not report | See P7.4-a | S | |
| P16-h | Every game has a beginning, middle and end | The founder reviews the start, mid, finale and reveal tiles. Never auto-claimed | G | |

---------------------------------------------------------------------------------------------------

## E. Finales, sound and performance (Parts 11, 12, 15)

Local sections:

- P11.1 global finale rules
- P11.2 identity
- P11.3 preservation
- P11.4 visual safety
- P12.1 shared music
- P12.2 sound effects
- P12.3 timing
- P12.4 known audio bugs
- P15.1 regressions
- P15.2 performance
- P15.3 optimise before reducing

| id | requirement | pass/fail test | scope | conflicts / notes |
|---|---|---|---|---|
| P11.1-a | Every game plays a finale | A finale root (game-owned or `.tsRewardSurge.mega`) mounts within 500 ms of progress 100. `V1`, `V2` · `ALL114` | G | |
| P11.1-b | The finale is powerful and immersive | At its peak, the finale covers at least 70% of the arena. `V1`, `V2` · `ALL114` | G | |
| P11.1-c | The burst starts from the centre where that is the design | The burst centroid is within 8% of the arena centre. `V1`, `V2` · games using the centre burst | S | |
| P11.1-d | The finale starts fast | ≤ 300 ms from the last input (or progress 100) to the first finale frame. `V1` (relative, `H9`) | S/G | |
| P11.1-e | The finale animates smoothly | In the first 1.5 s of the finale: no long task > 100 ms, and frame p95 ≤ `B-BASE` ×1.15. `V1` · `ALL114` sweeps | S/G | Relative measure (headless, no GPU) |
| P11.1-f | The finale is in sync with its sound | The finale cue is scheduled within ±50 ms of the first finale frame (`H8`). `V1` · `NAMED-a`, `NAMED-b` | S/G | Scheduled only. "Heard in sync" needs a sound-capable device (P23-b) |
| P11.1-g | No letters or instruction text over the main burst | In the main-burst window (mount → +1.8 s, or until unmount), no visible text node (opacity > 0.3) touches the burst core. This covers `.globalFinishFeedbackCopy`, the EOS flip words, the shift meter, the finish card and the guide's "complete" state. `V1`, `V2` · `ALL114` | S | C2. The EOS flip bloom fires on `.globalPlayGuide.isComplete, .tsRewardSurge.mega` (14_eos_mood.jsx L636, L857), at the same moment as the burst |
| P11.1-h | No unwanted black screen | Sampling every 100 ms during and after the finale: no frame has ≥ 60% of the stage near-black (luminance < 0.06) for more than 150 ms. `V1`, `V2` · `ALL114` | S | |
| P11.1-i | Performance holds through the finale | See P11.1-e and P15.2 | S | |
| P11.2-a | Each game has its own finale | Every game in `ALL114` has a unique finale signature (game-owned finale, or the `RewardSurgeBurst` form/mode/motion plus a game layer). No two games share one, especially within a look-alike cluster | G | Founder, 2026-10-09: bursts must differ per game. The shared `RewardSurgeBurst` (L19139) only picks a variant (form = v%11, mode = v%6). Games relying on it alone fail |
| P11.2-b | A finale is not the same burst in another colour | Signatures that differ only in hue count as the same finale | G | |
| P11.2-c | The finale is the natural climax of that game's mechanic | The finale reuses the game's own objects or world (POP chain reaction, SHRED disintegration, BURN combustion, SLINGSHOT impact, CLEANSE washout, UNHOOK separation). `H12`. `V1` · `NAMED-a`, `NAMED-b` | G | CREATIVE_STANDARDS #2: the shared colour shift and word bloom may only add to a finale, never replace it |
| P11.3-a | Approved bursts stay exactly as they are | For each approved or unique finale (at least every game-owned finale in `B-485`), the `H10` signature in `B-INT` equals `B-485`, and the founder confirms the side-by-side screenshots. Allowed differences: invisible performance changes only | S/G | "Don't change dopamine bursts, fix lag only" |
| P11.3-b | Burst changes are lag fixes only | Any commit touching finale code states that it is a lag fix and attaches before/after `H9` data plus identical `H10` signatures | process | |
| P11.3-c | EOS overlays do not change approved bursts | During the main-burst window, the burst region in `B-INT` differs from `B-BASE` by ≤ 3% mean absolute pixel difference (seeded run). Otherwise the EOS layers (`.eosMoodGrade` soft-light at z 54, flip bloom, shift meter, Still Moment) must be at opacity 0 over that region. `V1`, `V2` · 1, 18, 100, 109, 110 | S | C2 |
| P11.3-d | Shared bursts get their own per-game version; unique approved ones keep theirs | P11.2-a and P11.3-a hold together. Changing a unique approved burst needs a recorded founder approval | G | The founder's newest instruction authorises this differentiation |
| P11.3-e | The founder approves before any approved finale changes | A dated founder approval note exists for every finale whose `H10` signature changed | process | |
| P11.4-a | Finales have reduced-motion versions | With `reducedMotion:"reduce"`, the finale still plays in a calm form (reduced counts, no large motion) and the game completes. `V1` · 1, 18, 100, 109, 110, 111 | S | `RewardSurgeBurst` has reduced counts |
| P11.4-b | No hazardous strobing | `H11` over the finale window. `V1`, `V2` · `ALL114` finales | S | |
| P11.4-c | The user controls sound | See P3.2-d | S | |
| P12.1-a | Release plays the shared per-Bubble music from Reset | Seed `localStorage["__ts_reset_shared_media_v1"]` with per-bubble URLs. The media `src` equals `music[bubble]`, falling back to `music.global`. Changing the key and dispatching `thinkstill:reset-shared-media` updates it without a reload. `V1` | S: `useSharedMusic` (L2811) | Implemented in code; mark IMPLEMENTED-UNTESTED until run |
| P12.1-b | No duplicate music assignments | Grep for `.mp3`, `.m4a`, `.ogg` or music URLs in `src/00_arcade.jsx`, `src/99_pixar.jsx`, `src/eos/*` and `src/pilot/*`: 0 hard-coded tracks. Games 111-114 use the same shared path | S | |
| P12.1-c | Character assets and transition videos come from the same shared store | Character images and videos resolve through the shared media and asset maps. Any large embedded asset (for example the base64 strings around L49-51) is justified or removed | S | |
| P12.2-a | Each action has a matching sound | `H8`: at least one cue per progress step. Cue kind fits the action (pop, tear, crush, impact, whoosh, fire, suction, water, rain, click, scratch, energy burst). `V1` · `NAMED-a`, `NAMED-b` | S/G | Scheduled only |
| P12.2-b | Sound weight matches the impact | Checked on a sound-capable device recording. Never claimed from headless | G | |
| P12.3-a | Input, animation, character, sound, progress and finale are tightly in sync | Input → cue scheduled ≤ 50 ms. Input → next frame per Event Timing ≤ 100 ms. Character ≤ 150 ms. Progress ≤ 150 ms. Finale ±50 ms. `V1` (relative) · `FRONT` | S | CREATIVE_STANDARDS pilot target is ≤ 50 ms |
| P12.3-b | Sound is never reported as tested from a silent browser | Every audit or report line about sound says "scheduled/triggered (headless)" unless device audio evidence is attached | process | |
| P12.4-a | Rain never plays without the washout | See P13.4-i | G | |
| P12.4-b | No missing or inconsistent sound | `H8`: every game logs a cue for each step and a finale cue. `V1` · `ALL114` sweeps | S/G | |
| P12.4-c | No lag during bursts | See P11.1-e | S | |
| P12.4-d | No sound keeps playing after a game change | P9.2-c holds. NEW THOUGHT and close also stop every loop within 300 ms. `V1` | S | |
| P12.4-e | Animation and audio match | See P12.3-a | S | |
| P15.1-a | No past bug comes back | Every item in the Part 15 list maps to a test that passes: burst lag P11.1-e, disappearing progress P3.2-c, black screen P15.1-b, rain without washout P13.4-i, games not completing P8.3-i, clipping P5.3-a, text overlap P5.5-b and P3.3-d, invisible instructions P15.1-c, broken transitions P15.1-d, misaligned objects P14-b and P13.17-a, missed interactions P15.1-e, sound desync P12.3-a | S | |
| P15.1-b | No black screen after input | From submit or game pick to the first game frame, no 50 ms sample has ≥ 60% near-black stage for more than 150 ms. `V1`, `V2` · 25 games | S | |
| P15.1-c | Instructions are visible | The guide card or arrow is visible (`H2`) within 1 s of mount, at ≥ 12 px with contrast ≥ 4.5:1. `V1`, `V2` · `ALL114` | S | |
| P15.1-d | Transitions work | input → play → finale → reveal → AGAIN / NEW THOUGHT / next all complete with `errors` empty and no stuck overlay. `V1`, `V2` · 10 games | S | |
| P15.1-e | Every interaction registers | Each gesture in the EOS_GESTURES table changes progress or a step marker within 1 s, with touch at `V1` and mouse at `V2`. `finishGame` stall count = 0. `ALL114` | G | |
| P15.2-a | 60 FPS on capable devices | Measured on a real iPhone (Safari) and a mid-range Android (Chrome) for `FRONT`. Headless gives relative `H9` only | S | C13 |
| P15.2-b | Input-to-feedback latency is measured | Event Timing p50 and p95 per game are added to `docs/quality/metrics.json`. `V1`, `V2` · `ALL114` sweeps | S | |
| P15.2-c | Costly effects are optimised and needless rendering avoided | rAF loops pause while hidden or offscreen. Long tasks during play ≤ `B-BASE` (`H9`). `V1` · `FRONT` | S | |
| P15.2-d | Unused animation and audio resources are released | After 10 game switches: heap growth ≤ 10 MB; DOM nodes back within 10% of the first game's count; at most 2 `AudioContext` instances; rAF callbacks back to the start level. `V1` | S | |
| P15.2-e | Game switches leave nothing running | P9.2-b, P9.2-c and P15.2-d hold | S | |
| P15.2-f | Real mobile devices come first | No "smooth" or "performant" claim is made without the device runs in P15.2-a | process | |
| P15.3-a | Fix the implementation before cutting the experience | A performance change that alters visible constants (particle counts, durations, element counts relative to `B-485`) fails unless founder approval is recorded | S | |
| P15.3-b | A big visual change needs approval | An approval request is logged before any substantial visual change | process | |

---------------------------------------------------------------------------------------------------

## F. Game-specific corrections (Part 13.1-13.31)

Each game also has to pass the global tests (groups A-E) at `V1` and then `V2`. Ids come from `docs/catalog_A.md` and `docs/catalog_B.md`.

| id | requirement | pass/fail test | scope | conflicts / notes |
|---|---|---|---|---|
| P13.1-a | POP (1): bubble image and user text are integrated correctly | The P5 suite at `V1` and `V2` with 0, 1, 2 and 6 images | G | |
| P13.1-b | POP: popping reacts instantly | Tap → pop visual ≤ 100 ms (Event Timing), and the pop cue is scheduled ≤ 50 ms after the tap | G | |
| P13.1-c | POP: the pop and finale feel deeply satisfying, and an approved finale is unchanged | P11.2-c and P11.3-a. Founder review | G | |
| P13.1-d | POP Pilot A: the rebuild is a real gameplay improvement over the original | The P23 package. Founder verdict | G (pilot) | Not in the release |
| P13.2-a | CLEANSE (109): its clear presentation is kept as the reference | P5.6-b metrics are recorded. `B-INT` matches `B-485` | G | |
| P13.2-b | CLEANSE: cleansing visibly changes or removes the material | At reveal, the marker words and fixture images are gone from the arena or transformed | G | |
| P13.2-c | CLEANSE: the ending is reliable | `H1` passes 5 out of 5 runs at `V1` and at `V2` | G | An earlier build had no ending |
| P13.2-d | CLEANSE: completion shows a clear visual result | The finale tile shows the washout or purified scene | G | |
| P13.2-e | CLEANSE Pilot A: the rebuild is a real improvement | The P23 package. Founder verdict | G (pilot) | |
| P13.3-a | CRUSH (2): the object deforms with each press | At least 3 distinct deformation states that grow with presses (non-uniform scale, dents or cracks) | G | Catalogue: legacy case 2 "THOUGHT MOVE" pill (cluster C2), so this is structural work |
| P13.3-b | CRUSH: it feels like pressure and impact, not a generic tap | An impact cue for every hit (`H8`), plus a shake or recoil. `H12` review | G | |
| P13.3-c | CRUSH Pilot A: improves the game without breaking the live one | Release game 2 still passes `H1` and P3.4-j. The P23 package is complete | G (pilot) | |
| P13.4-a | RAIN OUT (110): all six bubbles can be pulled | 6 `.rainCloudUnit` pulls (down > 70 px) register, with touch at `V1` and mouse at `V2` | G | |
| P13.4-b | RAIN OUT: rain starts at the right moment | The rain state begins at the designed trigger (after the 6th pull) | G | |
| P13.4-c | RAIN OUT: the washout actually happens | The washout element or animation mounts within 300 ms of the trigger and runs to the end | G | |
| P13.4-d | RAIN OUT: the text disappears completely | At completion, no marker token remains visible in `.u110` (innerText scan plus opacity check) | G | |
| P13.4-e | RAIN OUT: uploaded images disappear completely | At completion, no fixture image is visible (opacity < 0.05, or the node is removed) | G | |
| P13.4-f | RAIN OUT: the emotional objects are really removed | The objects are removed from the DOM or have opacity 0 | G | |
| P13.4-g | RAIN OUT: clouds stay visible where the design wants them | Cloud art is visible at the end. Cloud width meets P14-c | G | |
| P13.4-h | RAIN OUT: the game reaches its completion state | `H1` passes 5 out of 5 runs at `V1` and at `V2` | G | |
| P13.4-i | RAIN OUT: the sound alone does not count as the washout | `H8` rain cue (from `useRainSfx`, L2759) start ≥ washout visual start - 100 ms, and it never plays without the washout | G | |
| P13.5-a | X-RAY (97): a "Kill/Burn All" button appears after the reveal | After 3 scans, all bubbles stay visible and a button matching `/burn all\|kill all/i` appears | G | C17: the current copy is "X-RAY BURN ALL" (L1762-1766); the founder confirms the label |
| P13.5-b | X-RAY: the button destroys what it says | Clicking it burns away every bubble with animation, then the game finishes | G | |
| P13.5-c | X-RAY: How to Play explains the full interaction | The guide or hint mentions the BURN ALL step | G | The short hint for 97 is "DRAG SCANNER → ×3"; check that the button step is covered |
| P13.5-d | X-RAY: the game does not end at the reveal | Wait 5 s after the 3rd scan: progress is still < 100 until the button is pressed | G | |
| P13.6-a | SCRATCH REVEAL (96): a proper scratching tool | A real-looking scraper or coin tool is visible and follows the pointer | G | The founder's newest instruction says tools must look real |
| P13.6-b | SCRATCH: scratch marks follow the pointer | Coating pixels along the drag path are cleared (sampled along the path) | G | |
| P13.6-c | SCRATCH: the covering is removed convincingly | The foil texture comes off bit by bit (`H12`) | G | |
| P13.6-d | SCRATCH: progress comes from scratching, not a tap | One tap reveals < 5% coverage. Progress tracks coverage (62% completes, per the catalogue) | G | |
| P13.6-e | SCRATCH: no unneeded bottom container | No bottom panel or primary bottom control during play | G | C10: a removal the founder asked for |
| P13.6-f | SCRATCH: pictures and text are arranged right, with readable white text where designed | The P5 suite passes. Text colour is close to white, with contrast ≥ 4.5:1 | G | |
| P13.6-g | SCRATCH: progress never goes backwards | `progressLog` never decreases | G | QUALITY_REPORT: 100% → 17% |
| P13.7-a | JUGGLE (94): bubbles sit centred in a straight line | Bubble centres share y ±4 px, and the group is centred ±4%. `V1`, `V2` | G | |
| P13.7-b | JUGGLE: the selected thought rises and the others drop | The selected bubble's y is at least 20 px above the others. Unselected bubbles move down at least 10 px from rest | G | |
| P13.7-c | JUGGLE: selected and unselected states are obvious | A clear difference in glow or scale (computed), confirmed in `H12` | G | |
| P13.7-d | JUGGLE: How to Play uses the founder's exact words | The text is exactly "Select which thought to keep and release which doesn't serve you. Click selected thought 3 times to win." | G | C18: the current hint (L2169) words it differently |
| P13.7-e | JUGGLE: 3 clicks on the selected thought win | Exactly 3 clicks on it finish the game, with touch and with mouse | G | |
| P13.7-f | JUGGLE: the game never gets stuck | 10 runs, 0 stalls, at `V1` and `V2` | G | |
| P13.8-a | KEEP/DROP (87): the bubble sits between the Up and Down arrows | One arrow is above the bubble and one below, aligned within ±4 px horizontally | G | |
| P13.8-b | KEEP/DROP: the picture changes with the choice, not just the text | The image `src` or visual state differs between keep and drop | G | |
| P13.8-c | KEEP/DROP: keep or drop is a physical move | Dragging (`\|y\|` > 112 px) moves the bubble with the pointer, and a keep or drop animation plays | G | |
| P13.8-d | KEEP/DROP: image and text are readable | The P5 suite passes | G | |
| P13.9-a | VOLUME KNOB (104): the knob is clearly something to turn | It shows a grip or tick marks and is ≥ 64 px at `V1` | G | |
| P13.9-b | VOLUME KNOB: turning it visibly changes things | The knob's rotation follows the drag, and the level display and object change | G | |
| P13.9-c | VOLUME KNOB: the bubble picture and text stay uncovered | `H3` between the knob/labels and the bubble image/text | G | |
| P13.9-d | VOLUME KNOB: it feels like adjusting volume, not pressing a button | Continuous rotation. `H8` shows gain ramping | G | |
| P13.10-a | GO WEIRD (107): the absurd, playful interaction is kept | `H12` compared with `B-485`. Founder review | G | |
| P13.10-b | GO WEIRD: visibility, circles and picture/text layout are right | The P5 suite at `V1` and `V2` | G | |
| P13.10-c | GO WEIRD: it is real play, not a static text reveal | Progress needs interaction with the props (P8.1-a) | G | |
| P13.10-d | GO WEIRD: it finishes on a phone | `H1` passes at `V1` | G | metrics.json: timed out at 390 |
| P13.11-a | SPACE MAKER (93): visibility and layout are fixed | All tiles are in the viewport and do not overlap. `V1`, `V2` | G | |
| P13.11-b | SPACE MAKER: images are properly circular | `H4` | G | |
| P13.11-c | SPACE MAKER: the user's input stays recognisable | Marker tokens and the fixture image are readable on the tiles | G | |
| P13.11-d | SPACE MAKER: the play clearly makes space | The mean gap between tiles at the end is at least 1.5x the gap at the start | G | |
| P13.12-a | COIN FLIP (90): a real coin flip | A tap spins the coin at least 2 turns in 3D (rotateX or rotateY) | G | |
| P13.12-b | COIN FLIP: the image is visible and aligned | The image is centred on the coin face within ±3 px. `H5` | G | |
| P13.12-c | COIN FLIP: the image and text leave the coin's key features visible | The rim and emblem stay visible (`H3` and a pixel probe) | G | |
| P13.13-a | DOOR A/B (89): both choices are recognisable and easy to use | Two doors, each a target of at least 44 px, with readable labels | G | |
| P13.13-b | DOOR A/B: imagery and text are correct | The P5 suite on the door content | G | |
| P13.13-c | DOOR A/B: opening a door gives a matching, meaningful result | The door opens with animation, and the result for A differs from B | G | |
| P13.13-d | DOOR A/B: not just a text reveal | P8.1-a holds | G | |
| P13.14-a | KNOB: visibility and presentation are fixed | The P5 suite on 104 and 58 | G | C14: the catalogue has no separate KNOB game. Tested as 104 plus knob-driven 58 MICROSCOPE |
| P13.14-b | KNOB: the control responds and means something | Knob rotation follows the drag within 1 frame (Event Timing) | G | |
| P13.14-c | KNOB: no cropped bubble images or overlapping labels | `H5` and `H3` between labels and images | G | |
| P13.15-a | FACT/STORY/UNSURE (86): better images and properly centred text | The P5 suite passes. Text centred within ±3 px | G | |
| P13.15-b | FACT/STORY/UNSURE: each choice is visually clear, and all three exist | Three choices are present and labelled: FACT, STORY and UNSURE | G | The catalogue lists only FACT/STORY. If UNSURE is missing, record it as MISSING |
| P13.15-c | FACT/STORY/UNSURE: the right objects appear and the choice changes the game | The stamp result shows on the object, and the next object follows | G | |
| P13.15-d | FACT/STORY/UNSURE: nothing is hard to read | `smallText(page,12)` returns nothing | G | |
| P13.16-a | VACUUM (23): one column where specified | Bubble centres share x within ±4 px at `V1` (and at `V2` if specified) | G | |
| P13.16-b | VACUUM: all words stay visible | Every chunk is in the viewport and not covered | G | |
| P13.16-c | VACUUM: text is readable | User words ≥ 15 px | G | |
| P13.16-d | VACUUM: a "Vacuum suck" button exists | A button whose accessible name matches `/vacuum suck/i` is present and works | G | Present in code (L463, L8365) |
| P13.16-e | VACUUM: the vacuum visibly sucks the objects away | Objects travel toward the nozzle and shrink over at least 300 ms. A fade in place fails | G | |
| P13.17-a | SHRED (15): paper lines up with the shredder | The paper's centre x is within ±6 px of the slot centre | G | |
| P13.17-b | SHRED: the shredder art is convincing | `H12` review. Must pass the real-tool rule | G | Founder, newest |
| P13.17-c | SHRED: paper enters the shredder in the right place | Sampled frames show the paper moving into the slot rect, with strips coming out below | G | |
| P13.17-d | SHRED: the shredding is visible and satisfying | Strips or particles appear, with a tear cue (`H8`) | G | |
| P13.17-e | SHRED: no paper floats beside the machine | At every sample, the paper rect is inside the slot's horizontal span | G | |
| P13.18-a | LOWER PLATFORM (103 SINKING PLATFORM): down arrows are used where needed | A ↓ shows on the control and on the platform | G | |
| P13.18-b | LOWER PLATFORM: the "Activate tool" interaction is kept | An "Activate tool" step exists and works | G | C15: 103 uses "LOWER PLATFORM ↓" (L13009), and no "Activate tool" string was found. Clarify with the founder before marking MISSING |
| P13.18-c | LOWER PLATFORM: the platform visibly moves down | The platform's y rises by at least 40 px over the animation | G | |
| P13.18-d | LOWER PLATFORM: real movement, not a static reveal, and it finishes on a phone | P8.1-a holds, and `H1` passes at `V1` | G | metrics.json: timed out at 390 |
| P13.19-a | HOT POTATO (100): the potato starts red and hot | The potato has class `hot`, and the heat layer's hue is red or orange | G | |
| P13.19-b | HOT POTATO: it turns blue and cool through play | Each finished potato has class `cooled` and the heat layer is in the blue range | G | |
| P13.19-c | HOT POTATO: the right bubble pictures are inside the potatoes | Character images, or uploads following P6.3 | G | |
| P13.19-d | HOT POTATO: images stay circular | `H4` | G | |
| P13.19-e | HOT POTATO: the full picture shows, nothing important cut off | `H5` | G | |
| P13.19-f | HOT POTATO: pictures are larger and clearer | Image diameter is at least 50% of the potato's short side, and at least the `B-485` size | G | |
| P13.19-g | HOT POTATO: the user's text sits below the image | `H7`, using the potato as the container | G | |
| P13.19-h | HOT POTATO: picture and text are both readable inside the potato | User words ≥ 15 px. Contrast ≥ 4.5:1 | G | |
| P13.19-i | HOT POTATO: the generic "HOT" label is replaced by the user's text | No standalone `/^HOT$/` text, and the potato contains a marker token | G | C10 |
| P13.19-j | HOT POTATO: no black mask around the image | `H6` on the image | G | |
| P13.19-k | HOT POTATO: no black mask around the text | `H6` on the text | G | |
| P13.19-l | HOT POTATO: all other working behaviour is kept | Drag ≥ 48 px still counts. `H1` passes. The finale signature equals `B-485`. P3.4-j holds | G | This is the regression benchmark for the global image rules |
| P13.20-a | UNHOOK (41): one large visible hook | A single hook element at least 20% of the arena width at `V1` | G | C11 |
| P13.20-b | UNHOOK: three strings, each visibly attached | Exactly 3 strings. Each end is within 6 px of the hook and of its object | G | C11: the current engine uses `.unhookWordBubble` ×6 with 6 chunks |
| P13.20-c | UNHOOK: the user disconnects each string | Each string detaches on the user's gesture | G | |
| P13.20-d | UNHOOK: every disconnection has an obvious physical result | The string snaps or recoils and the object falls or flies, for at least 300 ms, with a cue | G | |
| P13.20-e | UNHOOK: no string just vanishes | No instant `display:none` without animation | G | |
| P13.20-f | UNHOOK: the result feels like a real release | Finale review. Founder verdict | G | |
| P13.21-a | MELT (16): the object visibly melts | At least 3 deformation or drip states | G | |
| P13.21-b | MELT: clearly different from BURN | Its signature differs from game 18's in gesture, visuals and sound | G | |
| P13.21-c | MELT: user images and text are handled consistently | The P5 suite | G | |
| P13.22-a | SLINGSHOT (24): a real slingshot | The pouch drags back and the bands stretch with the pointer | G | |
| P13.22-b | SLINGSHOT: tension, release and flight are connected | Launch speed grows with pull distance, and the object's positions are continuous (no teleport) | G | |
| P13.22-c | SLINGSHOT: the emotion visibly travels away | The object leaves the arena or shrinks into the distance | G | |
| P13.23-a | BURN (18): a real burning transformation, not a fade | At least 2 in-between states that change more than opacity (char, ember, flame) | G | |
| P13.23-b | BURN: the approved finale is intact | P11.3-a holds for game 18 | G | |
| P13.24-a | FLUSH (22): flushing and removal are clear | A lever action, then a swirl or drain motion toward the drain | G | |
| P13.24-b | FLUSH: motion and sound match | The water cue is within ±50 ms of the swirl start (`H8`) | G | |
| P13.24-c | FLUSH: nothing is left visible after completion | At reveal, no marker or fixture remains in the arena | G | |
| P13.25-a | SWIPE AWAY (25): objects follow swipe direction and force | The exit direction is within ±30° of the swipe, and exit speed grows with swipe speed | G | |
| P13.25-b | SWIPE AWAY: no arbitrary repeated taps | Taps alone never complete the game. One swipe per card | G | |
| P13.26-a | STOMP (4): it feels like a stomp, and the boot looks like a real boot | A real boot silhouette when armed, then a downward impact with squash, shake and a thud cue | G | Founder, newest: tools look real |
| P13.26-b | CRACK (3): the material visibly fractures | Crack lines grow with each hit | G | |
| P13.26-c | ZAP (6): energy is visibly delivered | A bolt or beam runs from the source to the target | G | |
| P13.26-d | TAP OUT (67): a meaningful tap challenge | A sequence or rhythm has to be matched. Taps in the wrong order do not advance | G | |
| P13.26-e | BIN (21): a satisfying throw-away that completes | The object is dragged into the bin, with a lid or impact effect. `H1` passes at `V1` and `V2` | G | metrics.json: stalled at 0% at both sizes |
| P13.26-f | STOMP/CRACK/ZAP/TAP OUT/BIN: five different disappearance animations | The five finale and disappearance signatures all differ from each other | G | |
| P13.27-a | DRAMA MACHINE (105): the theatrical interaction is kept | No regression from `B-485` (`H12`, P3.4-j) | G | |
| P13.27-b | DRAMA MACHINE: it feels different from the destructive games | Its signature is not of the destroy type. Founder review | G | |
| P13.28-a | ECHO CHAMBER (99): the echo interaction is kept | Echoes repeat and fade away. No regression from `B-485` | G | |
| P13.28-b | ECHO CHAMBER: bubble text is readable | User words ≥ 15 px | G | EOS §4.6: ECHO renders 3.9 px words through `bubbleTextPx` |
| P13.28-c | ECHO CHAMBER: no words overflow their objects | `H7` overflow checks on every echo object | G | |
| P13.29-a | MAGIC TRAP DOOR (98): the trap door is a real interactive object | A drag or lever opens it | G | |
| P13.29-b | MAGIC TRAP DOOR: convincing movement and disappearance | The door swings on its hinge and the object falls through | G | |
| P13.29-c | MAGIC TRAP DOOR: the finale fits the magic trap-door idea | `H12` review. Founder verdict | G | |
| P13.30-a | PRIORITY BLOCKS (91), SCALE DOWN (92), TRADE MACHINE (88), CONTROL PANEL (85): each keeps its own action | The four signatures differ from each other, and none is a plain list of text choices | G | |
| P13.30-b | Those four: the player handles purpose-built objects with instant feedback | Blocks drag and stack, the ruler slides, the coin goes in the slot, switches toggle. Feedback ≤ 150 ms | G | |
| P13.30-c | Those four: a clear end state | P8.3-f and P8.3-j hold | G | |
| P13.31-a | All 114 games: the full global checklist passes | Working start, input display P4.2-a, distinct play P8.2-a, a clear win P8.3-i/j, transitions P15.1-d, a full finale P11.1-a, replay and navigation P9.3-a, correct images and text (P5), sound P12.2-a, mobile P3.1-a, no regression P3.4-j and P11.3-a. `V1` then `V2` · `ALL114` in sweeps of ≤ 25 | G | |
| P13.31-b | UNFOLLOW (47) no longer stalls on a phone | `H1` passes 5 out of 5 at `V1` with touch. MAGNETS (45) is run too | G | C13 note: metrics show 47 stalling at 0% and 45 at 17% on the phone. The founder's "17%" may mean 45, so both are tested |
| P13.31-c | No game with a broken ending is offered as normal play | Every id failing P13.31-a is out of routing and marked or hidden in the menu (P9.1-f). Start from `BROKEN-KNOWN` | S | |
| P13.31-d | New games 111-114 meet the same bar | P13.31-a holds, plus EOS §8.12 and the CREATIVE_STANDARDS architecture principle | G | |

---------------------------------------------------------------------------------------------------

## G. Vibes, safety, sharing, architecture and retention ethics (Parts 17-20, Part 2)

| id | requirement | pass/fail test | scope | conflicts / notes |
|---|---|---|---|---|
| P17-a | Jolly, Cheeky and Unfiltered can be chosen, and the choice is kept | All three can be selected. The choice survives a game switch and a reload. `V1`, `V2` | S/host | No vibe selector was found in Release `src`; check the host |
| P17-b | The intensity setting is kept | The intensity persists and reaches the games | S/host | |
| P17-c | The vibe shapes more than the opening line | For games 1, 18 and 100, collect guide, feedback, character and finish copy under each vibe. Each pair of vibes differs in ≥ 50% of strings | S | |
| P17-d | Copy is playful, never clinical | `lintCopy` (core `EOS_COPY_RULES`, L447) finds 0 banned words in visible copy | S | |
| P17-e | Humour fits the situation | With `I-SAFE`, sadness, grief or shame input, Cheeky and Unfiltered copy has no mocking lines. Human review of the strings | S | |
| P18-a | No promise to cure or treat | A regex over all visible copy and share text (`/cure\|heal\|treat\|clinically\|therapy-grade\|reduces anxiety/`) finds 0, apart from the disclaimer | S | |
| P18-b | No encouragement of real harm, and no amplified violent intent | With "I want to hurt my boss John", the safety path runs. No copy pairs the named person with violent verbs | S | |
| P18-c | The user's concern is never treated as irrational | `lintCopy` finds 0 invalidating phrases (EOS §2: calm down, just breathe, get over it, and so on) | S | |
| P18-d | Existing safety screening and escalation are respected | `I-SAFE` triggers `EosSafetyScan` at launch, synchronously. The support card shows without blocking play. Support lines come from configurable props (`eosCrisisLines`) | S | |
| P18-e | Under a safety flag, neutral words replace the user's words on objects | With `I-SAFE`, objects show neutral words and the note "We've kept your words off the game for now." | S | C7. This is the sanctioned exception to P4.2-d |
| P18-f | Stopping or switching games carries no penalty | Closing or switching mid-game shows no loss copy and lowers no score, XP or bond | S | |
| P18-g | Emotional material stays private by default | During a full game with uploads, the Playwright request log shows no URL or body containing marker text or image data. Storage holds no raw user text beyond the live composer (EOS §9.4 rule 8). Text nodes carry the private attributes (`fs-mask`) | S | |
| P18-h | The user stays in control | Sound, calm visuals or reduced motion, skipping the check-in, skipping the Still Moment, and exit are each ≤ 1 tap | S | C5 |
| P2-a | No manipulative reward mechanics | The EOS §9.4 anti-dark-pattern rules hold. A copy scan for `streak\|don't lose\|expires\|left today\|/7` finds 0. No autoplay into the next game. I'M GOOD is at least as large as ONE MORE | S | |
| P2-b | Replays bring real variation | Two replays of the same game and thought differ by ≥ 5% (layout or burst variant via `variationSeed`) | S/G | |
| P19-a | Sharing is opt-in | No share sheet, clipboard write or network share happens without an explicit tap. Share appears only on the reveal | S | |
| P19-b | Sharing shows a clear preview first | Tapping share shows exactly what will be shared, with confirm and cancel | S | |
| P19-c | Private words and images are never revealed automatically | The share card, text and URL contain no marker token and no fixture pixels (canvas probe) | S | EOS card format: "ANGER 8 → 2 in 41 s" |
| P19-d | Sharing is muted in sensitive cases | Under a safety flag, or for shame, lonely, sad or fear, share is demoted or muted | S | EOS §2.4, §2.6 |
| P19-e | Release can always be enjoyed privately | Every feature works without touching share. At most one non-modal share prompt per reveal | S | |
| P20-a | Shared assets are reused, not duplicated | `src/eos/*` and `src/pilot/*` carry no character or expression images, transition videos or music as `data:` URIs or copied files. Grep finds only references to the shared maps | S | |
| P20-b | Shared infrastructure is reused | A static review of each new module confirms it uses `useSfx`/`eosTone` (which honour the sound toggle), the composer input, the shared bubble rendering, navigation, the vibe and intensity settings, `GAMES` plus the router, and progress and rewards. No parallel copies | S | |
| P20-c | Bubble image and text layout comes from shared code, so one fix repairs every game | In a scratch build, change one shared variable (for example the image-to-text gap). The measured gap changes in at least 95% of `BUBBLE` games | S | Also P5.6-c |
| P20-d | Music is never assigned by hand | See P12.1-b | S | |
| P20-e | Release stays isolated from Reset and Reframe | With `localStorage.setItem` instrumented, Release makes 0 writes to the shared key `__ts_reset_shared_media_v1`. Release commits touch only Release files, unless a shared change is explicitly approved and regression-tested | S | |
| P20-f | Existing code is reviewed before it is changed | Change notes cite the anchors they inspected (`file:line`) | process | |

---------------------------------------------------------------------------------------------------

## H. Process, regression gates and approval (Parts 21-24, 26)

| id | requirement | pass/fail test | scope | conflicts / notes |
|---|---|---|---|---|
| P21-a | Priority 0 comes first | No Priority 2 or 3 work is merged while a P0 blocker is open (P8.3-i, P13.31-b/c, a lost control under P3.4-j). Checked against commit order | process | |
| P21-b | Reported figures count as claims until verified | The audit recomputes completion counts from fresh `H1` sweeps. The 114 / ~90 / 20 figures are stated as reported until then | process | metrics.json at baseline: 20 unfinished runs across 14 ids |
| P21-c | Each Priority 1 item maps to a criterion | No black masks: P5.4. Image above text and text inside: P5.5. Full circular images: P5.1 and P5.3. Consistent bubbles: P5.6. Distribution: P6.3. Single-screen: P3.1-a. Navigation: P9. Shared audio: P12.1. Visible progress: P3.2-c. Working finales: P11.1-a | process | |
| P21-d | Pilot A style is not rolled out without founder approval | The release build has no `src/pilot/*` modules and no pilot classes or CSS in release games | process | |
| P21-e | Games are not forced into one cinematic structure | Signature diversity, P8.2-a | process | |
| P22.A-a | The full input matrix passes before a game is called complete | For that game: images 0-6, short text, long text, empty input and mic (stubbed) all pass P4, P5 and P6 at `V1` and `V2` | process | |
| P22.B-a | The visual checklist passes | Pictures visible P5.2-a; no cropping P5.3-a; no masks P5.4-a/b; text below P5.5-a; words fit P5.5-e; circles P5.1-a; no overlap P5.5-b and P3.1-e; characters recognisable P7.3-b; controls visible P3.1-c; fits the viewport P3.1-a | process | |
| P22.C-a | The gameplay checklist passes | P15.1-e, P8.3-a, P8.3-e, P8.3-i, P8.3-f, P4.2-e, P3.4-h, P9.2-a and P9.1-e | process | |
| P22.D-a | The audio checklist passes, honestly labelled | Correct audio, toggle, no duplicates, music choice, timing, endings. Headless gives "scheduled/triggered" only. A "tested" status needs evidence from a sound-capable device | process | C13 |
| P22.E-a | The performance checklist passes | Smooth, no black screen, no freeze, no heavy lag, no disappearing progress, no game-breaking drops, acceptable on mobile: relative `H9` plus P15.2-a device runs | process | C13 |
| P22.F-a | The finale checklist passes | It plays P11.1-a; it is right for the game P11.2-c; origin and timing P11.1-c/d; approved bursts unchanged P11.3-a; end controls P9.3-a; the player can continue P9.3-e | process | |
| P22-g | Real-device testing comes before any "complete" or "fully tested" claim | Touch, audio, performance and responsiveness have been checked on named devices (model, OS, browser) | process | |
| P23-a | The Pilot A package has all 10 items for each of POP, CLEANSE and CRUSH | Checklist with links: (1) playable private mobile build; (2) source or Framer code; (3) before/after screenshots; (4) beginning/mid/finale/completion screenshots; (5) a full gameplay video per game; (6) mobile and desktop checks; (7) measured responsiveness; (8) sound-sync evidence from a sound-capable environment; (9) what makes it better; (10) known issues | process | CREATIVE_STANDARDS pilot package |
| P23-b | Testing claims are labelled honestly | Nothing is called "fully tested" without audio, real-mobile and complete-gameplay evidence | process | |
| P23-c | The founder is the creative gate; AI scores are not | Founder approval is recorded with a date. AI critic scores are listed only as supporting evidence | process | |
| P24-a | Work goes through shared components and reusable systems | See P20-b and P20-c | process | |
| P24-b | Playable previews come early and often | Each milestone has a playable build link | process | |
| P24-c | Frequent, safe commits on protected branches | Commits are small and checkpointed. Parallel workflows stage only their own paths (never `git add -A`) | process | |
| P24-d | No excess planning or repeated reviews | One two-reviewer review, then targeted re-checks only (CREATIVE_STANDARDS delivery policy) | process | |
| P24-e | Progress is shown before all 114 games are perfect | Evidence of progress is delivered per wave | process | |
| P26-a | Every requirement has a status class and evidence | Each id above has one of the 6 statuses plus evidence | process | |
| P26-b | Every gap record is complete | Each gap names the affected game or component, current behaviour, required behaviour, severity, proposed fix, whether it is shared or per game, and how it will be tested | process | |
| P26-c | Each game faces the four final tests | "Does it work?" is P13.31-a, automated. "Extraordinary", "emotional value" and "would someone pay" are founder or human verdicts and are never auto-claimed | process | |
| P26-d | No compliance is claimed without evidence | Every VERIFIED status links its evidence | process | |

---------------------------------------------------------------------------------------------------

## 9. Conflict register (resolution follows the order of precedence)

| tag | conflict | resolution | open founder question? |
|---|---|---|---|
| C1 | Part 5.5 puts text below the image **inside** the bubble. CREATIVE_STANDARDS #4 says "below the image", which is ambiguous, and older games put the caption under the bubble. The shared bubble size `--tsb: clamp(58px,9vw,108px)` (L14) cannot hold an image of at least 50% diameter plus user words of at least 15 px. | The founder's later wording wins: text goes inside the bubble. Bubbles grow, or long text is split. Text never drops below the size floor, and the image never drops below its minimum. | No |
| C2 | Approved dopamine bursts are frozen ("fix lag only"; no text over the main burst). EOS §5.6 adds a colour-script layer over the whole stage (soft-light, z 54) and a flip-word bloom triggered with `.tsRewardSurge.mega`. EOS §6.6 adds a reveal overlay with the "LIGHTER" stamp. CREATIVE_STANDARDS #2 says the colour shift and word bloom "may play in addition". The founder's newest instruction says shared bursts must become unique per game. | The extra layers are allowed only if the burst's pixels and timing are unchanged (P11.3-c) and no text sits over the main burst (P11.1-g). Flip words wait until after the burst, or stay outside its core. The shift meter appears after the burst. Shared bursts are differentiated per game (authorised). A unique approved burst keeps its look. | Which bursts count as "approved"? The founder confirms the list |
| C3 | The EOS check-in, "Who's at the controls?" (2 steps, on by default), hides the idle story. The founder says the established prompt is "What emotion are you carrying?" with "Your thoughts are materialised to be released.", and no lengthy questionnaire. | The founder document (2026-10-09) is newer than the EOS owner decisions (2026-10-08). The composer prompt and the supporting line are the primary input. The check-in stays optional, takes ≤ 2 taps, never blocks typing and playing, and the how-it-works explanation stays available. | Yes: should the check-in title adopt the founder prompt, or be off by default? |
| C4 | The original 15+1 selector vs the expanded catalogue of 114. | Keep the selector principles without cutting the catalogue. Today's menu (LET THINKSTILL CHOOSE + 15 SIGNATURE + MORE RELEASES · N) satisfies both. The EOS menu group adds and never removes. | No |
| C5 | Part 9 end navigation (AGAIN / NEW THOUGHT / TRY inside; prev/next / Try next game outside; no clutter) vs the EOS reveal (I'M GOOD / ONE MORE / SHARE MY SHIFT, old reveal copy and PREVIOUS/NEXT hidden while the meter runs, Still Moment first). Part 7 and Part 16 also forbid unreported benefit claims. | Every established function stays reachable in ≤ 1 tap throughout the reveal (labels may be remapped). The Still Moment can be skipped from 0 s and is never forced between games. "LIGHTER" appears only from the user's own dial. | Yes: confirm the label mapping |
| C6 | Part 3 places the feedback bubble bottom-right. The EOS companion (72 px) is also bottom-right, the EOS world chips and check-in chip are top-left, and guide arrows sit on the targets. | No overlaps between them, or with game targets (P3.1-e, P3.3-d). | No |
| C7 | Part 4 forbids replacing the user's words with placeholders. EOS safety replaces them with neutral words under a flag, and EOS prefill adds a starter when the input is empty. | Safety wins only when a flag is raised (Part 18). Prefill only when the input is empty, and never over typed text. | No |
| C8 | The EOS corner companion vs CREATIVE_STANDARDS #1 (characters in the world). | The companion is a supplement only. In-world characters are required (P7.2-c). | No |
| C9 | Text-size floors: CREATIVE_STANDARDS #8 (≥ 12 px; user words ≥ 15 px), EOS §2.3 (user words ≥ 16 px), and Part 5.7 (fine 0.5 px steps). | The pass floor is 15 px, with a 16 px target. The `bubbleTextPx` control keeps 0.5 px steps above the floor. | No |
| C10 | "Never remove features" (Part 3, CREATIVE_STANDARDS #7) vs explicit founder removals: the "UPLOADED IMAGE" label, the generic "HOT" label, and SCRATCH's bottom container. | Only these named removals are allowed. Everything else stays (P3.4-j). | No |
| C11 | UNHOOK: one hook and three strings (Part 13.20) vs the current engine (6 chunks in `.unhookWordBubble` ×6; `cleanEntries` always gives 6). | The founder's spec wins, so this is structural work. How 6 chunks map onto 3 strings is still open. | Yes |
| C12 | "At least 5 visible bubbles" (Part 5.1) vs mechanics that show one object at a time (for example 103's queue). | A named exception list with reasons. Everything else must show at least 5. | The founder confirms the exceptions |
| C13 | Part 12 sound sync and Part 15's 60 FPS vs the limits of headless testing. Also, the founder's "UNFOLLOW stuck at 17%" vs metrics (47 stalls at 0%; 45 MAGNETS at 17%). | Headless evidence is labelled scheduled or relative. A "tested" status needs a device or sound-capable environment. Both 45 and 47 are tested. | No |
| C14 | Part 13.14 "KNOB" names no separate game in the catalogue. | Tested as 104 VOLUME KNOB plus knob-driven 58 MICROSCOPE. | Yes: which game is meant? |
| C15 | Part 13.18 asks for an "Activate tool" step. Game 103 has a "LOWER PLATFORM ↓" button and no "Activate tool" string. | Not marked MISSING until clarified. The platform-moves-down tests still apply. | Yes |
| C16 | "Try POP" and "Try Meteor" examples vs Part 9's rule that suggestions are contextual, not hard-coded. METEOR (8) currently stalls. | Suggestions are contextual. A game that cannot be completed is never suggested. | No |
| C17 | The founder's label "Kill/Burn All" vs the current "X-RAY BURN ALL". | Function is tested with `/burn all\|kill all/i`. The exact label needs founder confirmation. | Yes |
| C18 | JUGGLE's exact How to Play text vs the current hint (L2169). | The founder's text is binding. | No |

---------------------------------------------------------------------------------------------------

## 10. Starting points found while writing the tests (read in code, not yet run; no status assigned)

- The founder prompt "What emotion are you carrying?" and the line "Your thoughts are materialised to be released." appear nowhere in `src`, neither at HEAD nor at 485500c. The composer placeholder is at `src/00_arcade.jsx` L22333. (P4.1-a/b)
- `expandUploadImageSlots` (`src/00_arcade.jsx` L6807) gives each image consecutive copies (AAABBB), and `uploadImageAt` indexes them in that order. (P6.3-b)
- `src/eos/50_eos_shift.jsx` L1420 hides `.releaseCompleteSideNav` at ≤ 560 px until the meter step is `done`. (P9.3-c, C5)
- `src/eos/14_eos_mood.jsx` L636/L857 starts the flip bloom on `.globalPlayGuide.isComplete, .tsRewardSurge.mega`. (P11.1-g, C2)
- `RewardSurgeBurst` (`src/00_arcade.jsx` L19139) is one shared burst, parameterised by variant. (P11.2-a)
- The `bubbleTextPx` control (L22767) has default 4, step 0.5 and max 18. EOS §4.6 says it currently changes nothing. (P5.7-a, P13.28-b)
- The shared bubble size is `--tsb: clamp(58px,9vw,108px)` (L14). (C1)
- `.globalFeedbackCopyLayer` has a rule with background `rgba(13,31,48,.95)`. (P3.3-b)
- No Jolly/Cheeky/Unfiltered selector and no image-zoom control were found in Release `src`. Check the host before calling either missing. (P3.4-a, P17-a, P5.7-b)
- Present in code but not run yet:
  - the menu groups (L22608, L22639)
  - ↻ AGAIN / NEW THOUGHT / TRY <game> / prev-next (L22190-22290)
  - `useSharedMusic` reading `__ts_reset_shared_media_v1` (L2811-2835)
  - X-RAY BURN ALL (L1762-1766)
  - "Vacuum suck" (L463, L8365)
  - LOWER PLATFORM ↓ (L13009)
  - the "UPLOADED IMAGE" sentinel being internal only (L2499-2584)
- The JUGGLE hint at L2169 differs from the founder's wording. (P13.7-d)
- `docs/quality/metrics.json` (baseline sweep) has 20 unfinished runs across 14 ids. 47 UNFOLLOW stalls at 0% on the phone; 45 MAGNETS stalls at 17%. (P13.31-b/c)
