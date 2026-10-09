checkin (build): FINISHED. Built src/eos/40_eos_checkin.jsx. It covers §2.1, §2.2, §2.5, §6.2, §6.3, §6.5, §0.3 (express) and §0.2 (dial, dialQ, sub, starters).

## What it does

**EosCheckIn** ("Who's at the controls?")
- **Step 1 layout.** Desktop: the 8 primary character orbs (96 px) sit on an ellipse around the Still Point, with STILL in the centre as NOT SURE (110 px). Phone (≤560): a 3×3 grid of 84 px orbs. Each row is as tall as its own tallest label, and sub-lines break only at " · ", so "what-ifs" never splits. Every orb has a name tag, a label and an everyday sub-line. PANIC reads "heart racing · tap = start now".
- **Step 1 interactions:**
  - Staggered spring pop-in, out-of-phase bob.
  - Roving focus: arrow keys / Home / End, then Enter or Space.
  - "more feelings ▾" adds SCARED, JEALOUS and NUMB (desktop: in the ring gaps; phone: a 4th row).
  - "☀ good day? bank it" chip.
  - Live composer hint ("sounds like ANGER?", 300 ms debounce, never under a strong safety flag).
  - Once-per-device STILL cold open (≤3 s, non-blocking).
- **Footer.** "just let me play →", "Need to talk to someone?", "about ThinkStill" and "calm visuals · on/off". The about link opens EOS_DISCLAIMER in a popover; the calm toggle draws its ◐ in CSS. The support link uses `eosApi("safety").open("info")`, or falls back to a built-in popover with the support lines and emergency text from the store.
- **Express.** One tap on PANIC, or a 550 ms long-press on any orb (a radial fill shows the press, with a haptic notch), runs `EosCommitCheckin({emotion, before:null, express:true})`, then the orb-dive (a 600 ms radial wipe in the emotion's hue; launch at 520 ms) and `onLaunch()`.
- **Step 2.** The chosen orb flies to a measured spot: 180 px desktop, 140 px phone, scaled `.85 + n×.04`, shaking 2 px when n ≥ 7. The others go to dimmed side rails (desktop) or leave (phone).
  - Question: `eosDialQuestion`, plus a first-ever "Meet RUSH, your anger."
  - Dial: `EosIntensityDial`, pre-lit at `dial` or `max(dial, eosGuessIntensity(typed))`. It calls `eosApi("dots").setLevel(n)`.
  - Extras: "Naming it is the first move." (once), 3 seed chips that toggle words in `raw`, and a 🎙 chip (calls `toggleMic`; the first use shows a one-line note).
  - CTA "LET'S SHIFT IT ▶" with the router sub-line, plus "← back" and "pick a game myself" (commits, then `openMenu()`).
  - Starter prefill: only when `raw` is empty; replaced on an emotion switch; typed text is never overwritten.
- **Launch handshake.** Stale-closure safe: a pending launch fires once `raw` is non-empty, through the latest `onLaunch`/`onPlay`.
- **Deep link.** `?eos=anger&t=41` (t = 1-600) preselects the feeling, shows "A friend shifted ANGER in 41 s. Your turn?", then `history.replaceState` cleans the URL (guarded).
- **Hand hints.** First-timers get `EosHandHint` with `choose`, all orbs as targets, rest on NOT SURE, label "TAP HOW YOU FEEL". A 44 px lane under the ring keeps that label clear of the chips. On step 2: "SLIDE IT" on the dial the first time, then "LET'S GO" on the CTA after 3 s idle. Without the arrows module there are built-in fallbacks: a gold halo hopping across all orbs, a ☝ SLIDE IT cue and a CTA nudge.
- **Reduced motion and calm visuals.** Reduced motion (`eosCalm(reduced)`) gives cross-fades only: no springs, shake, bob, spin or wipe (a 150 ms fade instead).
- **Privacy.** EOS_PRIVATE_ATTRS and `fs-mask` are on the root. Only ids, numbers and booleans reach the store or prefs; no user text is stored.

**EosCheckInChip.** A 44 px pill, top-left of the stage, z 32: STILL orb (32 px) plus "How are you feeling?" (13 px). It calls `EosOpenCheckin()`. CSS hides it while `.releaseChoiceMenu` is open.

**EosCompanion.** The feeling's character rides along during play.
- **Position.** Desktop: bottom-right 14 px, 72 px orb. Phone: 8 px under the measured `.engineProgressHud`, right 10 px, 56 px orb. `pointer-events:none`, `aria-hidden`, z 55, private attributes.
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
- **Arrows (30_eos_arrows.jsx), one request:**
  - Problem: the step-2 idle "LET'S GO" label (`g:"tap"` on `[data-eos-cta]`) lands over the "What's it about?" and seed-chip row at both sizes.
  - Fix: add `.eosCkWords, .eosCkLinks, .eosCkChips` to `EOS_ARROWS_AVOID` (or accept an `avoid` prop on `EosHandHint`).

## Verified
Scratch integrated build `/tmp/eos_checkin_arr` (arrows + 111/112 + stubs) and the isolated build `/tmp/eos_checkin`, at 390×844 and 1280×860, normal and reduced motion. Zero page errors everywhere.

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

## Known limitations
- `45_eos_router.jsx` does not exist yet. "PANIC → 111" and the CTA sub-line with a real game name are wired but unverified. With the stub, PANIC launches the stub's game (61).
- The arrows label overlap on step 2 described above. It is cosmetic and belongs to the arrows owner.
- The companion's calm face for anger is reached only in the cool-down (Still Moment cool variant or 112 act B). Those modules own it; the companion stays "spent" during discharge games by design.
- The desktop "more feelings" orbs slot into the ring's three gaps (left, bottom, right) rather than a separate arc, so the ring never grows past the stage.
- Headless timing note: right after mount the chip and companion are still in their 0.45 s pop-in, so measure them at least 1 s later.
