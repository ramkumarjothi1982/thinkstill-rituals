checkin (build): FINISHED, round 1 fixes applied (all 3 majors and all 13 minors from checkin.review_r1.json). Built src/eos/40_eos_checkin.jsx. It covers §2.1, §2.2, §2.5, §6.2, §6.3, §6.5, §0.3 (express) and §0.2 (dial, dialQ, sub, starters).

## What it does

**EosCheckIn** ("Who's at the controls?")
- **Step 1 layout.** Desktop: the 8 primary character orbs (96 px) sit on an ellipse around the Still Point, with STILL in the centre as NOT SURE (110 px). Phone (≤560): a 3×3 grid of 84 px orbs. Each row is as tall as its own tallest label, and sub-lines break only at " · ", so "what-ifs" never splits. Every orb has a name tag, a label and an everyday sub-line. PANIC reads "heart racing · tap = start now".
- **Step 1 interactions:**
  - Staggered spring pop-in, out-of-phase bob.
  - Roving focus: arrow keys / Home / End, then Enter or Space.
  - "more feelings ▾" adds SCARED, JEALOUS and NUMB (desktop: in the ring gaps; phone: a compact 4th row of 68 px balls with name and label only, and the primary sub-lines fold away (PANIC keeps "tap = start now"), so grid, chips and footer fit 390×844 without scrolling).
  - "☀ good day? bank it" chip.
  - Live composer hint ("sounds like ANGER?", 300 ms debounce, never under a strong safety flag).
  - Once-per-device STILL cold open (≤3 s, non-blocking). STILL speaks from the head band: a cream bubble with STILL's face replaces the title and sub-line for 3 s, so it never covers an orb's label. The 3 s run is timed from when the bubble actually appears.
- **Footer.** "just let me play →", "Need to talk to someone?", "about ThinkStill" and "calm visuals · on/off". The about link opens EOS_DISCLAIMER in a popover that is anchored to the footer block and opens upward, so it is never clipped when the phone grid is scrolled. The calm toggle draws its ◐ in CSS. The support link uses `eosApi("safety").open("info")`, or falls back to a built-in popover with the support lines and emergency text from the store.
- **Express.** One tap on PANIC, or a 550 ms long-press on any orb (a radial fill shows the press, with a haptic notch), runs `EosCommitCheckin({emotion, before:null, express:true})`, then the orb-dive (a 600 ms radial wipe in the emotion's hue; launch at 520 ms) and `onLaunch()`.
- **Step 2.** The chosen orb flies to a measured spot: 180 px desktop, 140 px phone, scaled `.85 + n×.04`, shaking 2 px when n ≥ 7. The others go to dimmed side rails (desktop, `tabIndex -1`, still clickable) or leave (phone).
  - The spot's height is computed from the orb size: at dial 10 (1.25×) the gold ring and the 6 px bob stay ≥ 12 px under the question, also with the deep-link banner, and the name tag stays clear of the dial track.
  - Long-press is disabled on the selected orb, so resting a finger on it never discards the dial.
  - Keyboard: entering step 2 moves focus to the dial (only if focus was in the check-in or on body); "← back" and Esc return focus to the same orb.
  - Question: `eosDialQuestion`, plus a first-ever "Meet RUSH, your anger."
  - Dial: `EosIntensityDial`, pre-lit at `dial` or `max(dial, eosGuessIntensity(typed))`. It calls `eosApi("dots").setLevel(n)`.
  - Extras: "Naming it is the first move." (once), 3 seed chips that toggle words in `raw`, and a 🎙 chip (calls `toggleMic`; the first use shows a one-line note).
  - CTA "LET'S SHIFT IT ▶" with the router sub-line, plus "← back" and "pick a game myself".
  - "pick a game myself" commits, then calls `openMenu()`. The commit stands only if a game really starts from the menu. A 200 ms watcher sees the menu close while the check-in is still mounted (a launch unmounts it in the same commit) and reverts with `EosCommitCheckin({emotion:null, before:null})`. "← back" and "just let me play →" also revert it. While the menu is open the check-in dims to 14 % and the idle-CTA timer waits.
  - Starter prefill: only when `raw` is empty; replaced on an emotion switch; typed text is never overwritten.
- **Launch handshake.** Stale-closure safe: a pending launch fires once `raw` is non-empty, through the latest `onLaunch`/`onPlay`.
- **Deep link.** `?eos=anger&t=41` (t = 1-600) preselects the feeling, shows "A friend shifted ANGER in 41 s. Your turn?", then `history.replaceState` cleans the URL (guarded).
- **Hand hints.** The arrows module's hand does the demonstrating. The labels are the check-in's own gold-rimmed pills (same look as the arrows labels), placed where they cover nothing. Each `EosHandHint` sits in a `.eosCkHint` wrapper that can restyle it.
  - Step 1 (first-timers): `g:"choose"` with the round `.eosOrbBall` of every orb as targets. The halos are round gold rings (`border-radius:50%`) and the hand rests on NOT SURE. The arrows chevron is hidden here, so no arrow ever points at one feeling. The "TAP HOW YOU FEEL" pill sits in a 44 px lane under the ring or grid. The lane folds after the first click lands, never on pointerdown, so the chips never jump out from under the finger.
  - Step 2, first time: `g:"drag"` on the dial track (no arrows label). The "SLIDE IT" pill sits beside the orb, above the track's right end, clear of the name tag.
  - Step 2, after 3 s idle: `g:"tap"` on an anchor at the CTA's right end, so the hand never covers the routed game's name. The chevron is hidden (it would sit on the seed chips), there is no label (the CTA already says LET'S SHIFT IT), and the CTA's own gold ring pulse plays.
  - Without the arrows module: the built-in halo hop, the same pills, a ☝ sliding on the track, and a ☝ at the CTA's right end, all inside the stage.
- **Reduced motion and calm visuals.** Reduced motion (`eosCalm(reduced)`) gives cross-fades only: no springs, shake, bob, spin or wipe (a 150 ms fade instead).
- **Privacy.** EOS_PRIVATE_ATTRS and `fs-mask` are on the root. Only ids, numbers and booleans reach the store or prefs; no user text is stored.

**EosCheckInChip.** A 44 px pill, top-left of the stage, z 32: STILL orb (32 px) plus "How are you feeling?" (13 px). It calls `EosOpenCheckin()`. CSS hides it while `.releaseChoiceMenu` is open.

**EosCompanion.** The feeling's character rides along during play.
- **Position.** Desktop: bottom-right 14 px, 72 px orb. Phone: 8 px under the measured `.engineProgressHud`, right 10 px, 56 px orb. The top is measured against the companion's offsetParent plus its `scrollTop`, so it stays under the HUD when `.releaseStage` is scrolled by code. `pointer-events:none`, `aria-hidden`, z 55, private attributes.
- **Hidden** when `EOS_GAME_META[id].char` equals its character.
- **Face by progress.** Loud (0-33), a softer negative face (34-66), the calm face (≥67; numb gives the awake face 61). 300 ms cross-fade.
- **Anger in a discharge game** (`EOS_DISCHARGE_IDS`): loud, then spent, and never calm. Its bubbles are "HAH!" and, at the finish, "nice hit — now let it cool".
- **Squash.** Web Animations squash and stretch on each progress increase. This replaced a re-keyed body that remounted the face image and made it blink.
- **Voice.** Every 3rd increase shows a 14 px voice bubble (§6.5 lines) with 2 note blips. Finish: bounce plus ✦.
- **Progress** comes from `useEosProgress` (4 Hz); one 2 Hz geometry poll; everything is cleaned up.

**CSS rules this module owns:**
- hide `.releaseIdleStory` under the check-in
- hide `.eosCheckInChip` and `.eosWorldChips` while the menu is open
- phone step 2 hides `.eosWorldChips`

## Exports
- Top level: `EosCheckIn`, `EosCheckInChip`, `EosCompanion`, `EOS_CHECKIN_CSS` (registered with `eosCss("checkin", …)`).
- `eosExpose("checkin", {EosCheckIn, EosCheckInChip, EosCompanion, EOS_CHECKIN_RING, EOS_CHECKIN_MORE, EOS_CHECKIN_GOOD_GAME, faces, faceSrc, preview})`.
- Test hooks: `data-eos-emotion`, `data-eos-slot`, `data-eos-ck-idx`, `data-eos-more`, `data-eos-good`, `data-eos-skip`, `data-eos-support`, `data-eos-about`, `data-eos-calmtoggle`, `data-eos-cta`, `data-eos-back`, `data-eos-pick`. The companion carries `data-eos-char`, `data-eos-mood` and `data-eos-face`.

## Integrator wiring (exact; already in dev/eos_integrate.py, I2)
- Inside `.releaseStage`, when `stage==="input" && !selected && eos.phase==="checkin" && eos.checkinEnabled`:
  `<EosCheckIn raw={raw} setRaw={setRaw} onLaunch={startThinkStillChoice} onPlay={startChosenGame} toggleMic={toggleMic} listening={listening} openMenu={() => setGameMenuOpen(true)} sfx={sfx} reduced={!!reduced} />`
- `{stage === "input" && !selected && eos.phase !== "checkin" && eos.checkinEnabled ? <EosCheckInChip reduced={!!reduced} /> : null}`
- In the play fragment: `<EosCompanion game={selected} hostRef={gameHostRef} reduced={!!reduced} />`
- I1: `.eosObj` in `PX_SQUASH_TARGETS` (orb press squash).
- **Router (45_eos_router.jsx), what it must provide:**
  - `eosExpose("router", {EosRoutePreview(emotion|null, n) → {id, name?, seconds?, best?}})`. The check-in shows it only when `GAMES` really contains `id`; otherwise it shows "≈30 s · Still picks your game".
  - Express launches (`EOS_STORE.get().express`) must use the high band: panic gives 111.
  - The good-day chip tries 117 through `onPlay`. While 117 is not registered (release 1), it falls back to `onLaunch()` with emotion "good" committed, so `EosRouteGame` must return a registered game for "good".
- **Safety:** `eosApi("safety").open("info")`. **Dots:** `eosApi("dots").setLevel(n|null)`.
- **Arrows (30_eos_arrows.jsx):** no request left open. The check-in passes `label=""` (an empty label renders no pill) and hides the chevron for `choose` and `cta` with scoped CSS on its own wrapper. An `avoid` / `noChevron` option on `EosHandHint` would be nicer later, but nothing depends on it.

## Round 1 fixes (review_r1)
| # | Severity | Finding | Fix | Evidence |
|---|---|---|---|---|
| 1 | major | Step 1 chevron on one feeling (ANGRY) covering the title and sub-line | choose chevron hidden in the `.eosCkHint` wrapper; halos target the round balls; hand rests on NOT SURE; own lane pill | probe: no `.eosChevPos` and no `.eosLabel` inside the choose hint; pill and hand hit no text at 390 and 1280; sheet: s1_m, s1_d |
| 2 | major | Step 2 idle LET'S GO covers the words prompt, a seed chip and the game name | idle hint = hand at a right-end CTA anchor, no label, chevron hidden, CTA pulse | probe idle_m: no overlaps; idle_d: the hand's svg box touches CtaSub by 42 px² (transparent corner); sheet: idle_m, idle_d |
| 3 | major | Phone "more feelings" hides the safety link; about popover clipped | compact 68 px extra row, primary sub-lines folded, popover in the footer block opening upward | more_m: scroll 688/688, support link bottom 675 ≤ composer top 737, `elementFromPoint` = link; about_m: popover fully inside |
| 4 | minor | Stale commit after an abandoned "pick a game myself" | `menuCommitRef` + menu-close watcher + revert in back and skip; dots keep their level only on a real launch | ANGRY → pick → Esc gives `emotion:null, before:null`; back then skip gives `{phase:"skip", emotion:null}` |
| 5 | minor | `.eosCkWordsQ` 36 px tall | 44 px | probe `wordsQh` 44 |
| 6 | minor | Desktop keyboard focus | rail orbs `tabIndex -1`; dial focused on step 2; focus restored on back / Esc | Enter on ANGRY → `role=slider`; Tab → WordsQ, then the seeds; Esc → `data-eos-ck-idx=1` |
| 7 | minor | Check-in text shows through the game menu | `:has(.releaseChoiceMenu) .eosCheckIn{opacity:.14}` | opacity 0.14; sheet: menu_m |
| 8 | minor | Long-press on the selected orb discards the dial | no `pressStart` on the selected orb in step 2 | 800 ms hold → still step 2, no commit |
| 9 | minor | Step-2 orb overlaps the question | spot height from the orb size (1.25×, ring, bob) | qGap at dial 10: phone 14-22, desktop 15-34, deep link 26-27 |
| 10 | minor | Companion wrong when `.releaseStage` is scrolled | top = rect relative to offsetParent + `scrollTop` | stage scrollTop 0 → companion 8 px under the HUD; scrollTop 131 → still 8 px under |
| 11 | minor | SLIDE IT covers the name tag | own pill beside the orb, above the track's right end | no overlap with `.eosOrbName` or the balls; sheet: s2_m, s2_d |
| 12 | minor | Rectangular dashed halos | ball targets + round halos | computed `border-radius` 50% |
| 13 | minor | Fallback hints clipped on phone | pills shared; ☝ cues placed inside the stage | solo build (no arrows) at 390: no clipping, ☝ clear of the CTA sub-line |
| 14 | minor | Phone cold-open bubble hides labels | bubble in the head band (both sizes), no overshoot | orbHits 0; sheet: coldhead_m |
| 15 | minor | Arrows `avoid` list (cross-module) | solved on the check-in side (see 2) | — |
| 16 | minor | Step-1 head band headroom | not needed: the chevron is gone, and the halos clear the sub-line | sheet: s1_m |

Also fixed while testing:
- The lane collapsed on pointerdown and swallowed the first click on "more feelings". It now folds on click.
- The phone deep link scrolled by 46 px. The once-only Meet and Naming lines are kept for the next visit (not consumed) and the banner is tighter; the step now fits (688/688).
- The canvas was 2 px taller than the footer.

## Verified
Round 1 surfaces:
- Integrated scratch build `/tmp/eos_checkin_int`: arrows, router, safety, dots, 111 and 112 plus stubs.
- Check-in-only scratch build `/tmp/eos_checkin_solo` (fallback path).
- Isolated build `/tmp/eos_checkin`: loads with zero errors and `__eos.checkin` exposed.
- Sizes and modes: 390×844 and 1280×860, normal and reduced motion. Zero page errors everywhere. `smallText(12)` is empty and `lintCopy` is clean.
- Probe scripts: `/tmp/ck_r1/t1.mjs` (overlaps, scroll, popover, geometry, store, focus), `t3.mjs` (keyboard, deep link, reduced, companion), `t5.mjs` (cold open). The previous acceptance suite `/tmp/ck_acc.mjs` passes again at 390 normal and reduced, and at 1280.

1. Fresh load shows `.eosCheckIn[data-step=1]` with 9 visible orbs (8 + NOT SURE), 9 name tags and NOT SURE. `input.releaseThoughtInput` and `button.releaseChoiceButton` are hit-testable. No orb overlap; no orb off-stage (also with "more feelings" open). The phone footer fits (bottom 737 of 737).
2. The footer has all 4 links. The about popover contains `EOS_DISCLAIMER`. The support fallback lists the support lines.
3. PANIC tap: the store reads `{emotion:"panic", express:true, before:null}`; stage-play is reached in 0.66-1.32 s (normal motion) and 0.20-0.66 s (reduced).
4. ANGRY: step 2, dial `aria-valuenow` 8, "Meet RUSH, your anger. How loud is RUSH right now?". The idle CTA cue appears. GO commits before 8 and launches.
5. "pick a game myself": the menu opens and the store reads `emotion:"sad", before:6`.
6. Good day: the store reads `emotion:"good", express:true`, and play starts (117 absent, so the router fallback runs).
7. `?eos=anger&t=41`: step 2 with ANGRY, the banner shows, and the URL is cleaned.
8. Chip: z 32, on top of the idle stage (`elementFromPoint`), 44 px tall, 13 px text, `display:none` with the menu open, and it reopens the check-in.
9. Companion:
   - Hidden for panic@111 and anger@112; shown for sad@111 and anger@111.
   - Phone CRUSH: 8 px under the HUD, right 10, 56 px. Moods loud → spent. Bubbles "HAH!" and "nice hit — now let it cool".
   - Desktop CRUSH: right 14, bottom 14, 72 px, same moods.
   - Numb on POP: loud → soft → calm, face 61 at ≥67 %.
   - All 48 companion faces load.
10. Private attributes on the root. `smallText(12)` reports nothing in the check-in. `lintCopy` is clean. Also checked: long-press express (anxiety, typed text kept), keyboard roving and Enter, Esc → back, calm toggle (pref plus `data-eos-calm`), and prefs hold only booleans.

## Screenshots
In `/home/user/thinkstill-rituals/framer/dev/shots/eos/` (`_m` = 390×844, `_d` = 1280×860, `_r` = reduced motion):
- `checkin_step1_{m,d}.png`, `checkin_step1_m_r.png`, `checkin_step1_d_r.png`
- `checkin_more_{m,d}.png`
- `checkin_step2_{m,d}.png`, `checkin_step2_m_r.png`
- `checkin_step2idle_{m,d}.png`
- `checkin_dive_{m,d}.png`
- `checkin_play_{m,d}.png`
- `checkin_support_{m,d}.png`
- `checkin_chip_{m,d}.png`
- `checkin_deeplink_{m,d}.png`
- `checkin_companion_anger_{m,d}.png` (+ `_start`), `checkin_companion_numb_d.png` (+ `_start`)

Round 1 screenshots and contact sheets are in `/tmp/ck_r1/`:
- `sheet1.png` (step 1, step 2 and idle at both sizes)
- `sheet2.png` (phone: cold, more, about, deep link, dial 10, menu, and the no-arrows fallback)
- `sheet3.png` (desktop: step 1, step 2, idle, more, keyboard sad 10)
- `sheet5.png` (cold-open head band)

The dev/shots/eos files are untracked and were not part of the commit.

## Known limitations
- The first-time SLIDE IT demo hand sweeps over the dial readout ("8 really loud") while it shows. That is the drag gesture itself, and it goes away on the first touch.
- On desktop the idle hand's svg bounding box touches the CTA sub-line by about 40 px². That is the transparent corner of the 64 px hand box; the screenshot shows the sub-line fully readable.
- With the real router: PANIC → 111, ANGER at 8 → 112, sub-line "≈30 s · COOL THE VOLCANO". Good day → 106 (117 is release 2, so the router falls back).
- The companion's calm face for anger is reached only in the cool-down (Still Moment cool variant or 112 act B). Those modules own it; the companion stays "spent" during discharge games by design.
- The desktop "more feelings" orbs slot into the ring's three gaps (left, bottom, right) rather than a separate arc, so the ring never grows past the stage.
- Headless timing note: right after mount the chip and companion are still in their 0.45 s pop-in, so measure them at least 1 s later.
