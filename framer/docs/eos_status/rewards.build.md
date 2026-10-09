# rewards: build report (FINISHED)

## What I built
`src/eos/52_eos_rewards.jsx` (one file, about 1,300 lines; all private names use `eosRewards*`, `EOS_REWARDS_*` or `EosRewards*`; keyframes are `eosRewards*`; `eosCss("rewards")`). It covers spec §9.1-§9.5, §0.2 (`EOS_WIN_FACES`, `keepHistory`) and §5.2 F6.

### The grant: `eosGrantForShift(shift)`
- Called once per rated or skipped loop.
- **Idempotent per `shift.t`.** It keeps an in-memory result map plus a persisted `granted` list, so a reload that remounts the meter writes nothing new.
- It never throws. It returns `null` on an internal error, and every field it returns is optional for the meter.
- It calls core `eosMarkDay()` itself, so the line never shows "0 days".

**Memory orbs**
- One orb row per loop: `{t, k, emo, char, face, tier, before, after, gameId}` in `eos_orbs_v1` (cap 400).
- Limit of **5 per local day**. Later loops still pay ⚡, days, bonds and skills, and the line says "today's 5 orbs are on your shelf".
- **Face:** an expression of the emotion's character that the user does not own yet, from `eosFacePool(char, "win")`.
  - "Owned" means faces already on orbs plus faces unlocked by bonds.
  - **Expression of the Day:** the first orb of the day is guaranteed a new face. When that character's pool is complete, it uses another character's unowned face.
- **Rarity comes from the loop, never from Δ.** Gold "✦ CORE MEMORY" is given for:
  - the first orb of the day
  - a game never played before (ledger and `eos_learned_v1` ≤ 1)
  - a feeling checked in for the first time
  - a bond level-up
  - Everything else is silver.
  - Verified: delta 0 and delta 6 give the identical tier sequence `gold, silver, gold, silver`.

**Bonds**
- +1 for the companion character (the emotion's character; NOT SURE = STILL) and +1 for the scene character.
- Scene character: `EOS_GAME_META[id].char` for 111+. Classic games use their family's lead bubble from `FAMILY_BUBBLES` (guarded with `typeof`).
- Levels at 1/3/6/10/15. Each level unlocks the next face of the win pool (`eosBondFor(c).face`) and a one-liner: "RUSH learned to laugh it off", and so on.

**Skills by mechanism**
- `EOS_REWARDS_SKILLS`: Sigh, Cool-down, Grounding, Kind-voice, Loop-breaker, Spark, Space, Own-glow, Brave-look.
- Each skill uses the spec's game ids. Every classic game also maps to a skill through an arcade-family fallback, so all 110 classic games plus 111-114 train a skill (0 unmapped).
- The Still Moment variant also counts (sigh, cool, heart → kind, spark → spark). It is read from `shift.moment`, then `noteMoment()`, then the shift plan when it is `auto`.
- Every emotion counts, including GOOD and NOT SURE.
- Ranks: Rookie 1, Steady 5, Pilot 15, Master 40, each with its "what you can now do" line.

**Day milestones**
- Lifetime days 3, 10, 30 and 100 each grant one extra gold orb, inside the daily cap. A milestone that does not fit waits for the next loop.

**Return value**
`{orb, bond:{char, name, level, count, next, up, unlocked, line}, bonds[], skill:{id, name, rank, next, toNext, count, up, label}, skills[], week:{days, lifetime, label, …}, milestone, capped, gold, reasons[], line}`

`line` example: "✦ CORE MEMORY · RUSH bond 1 ✦ · ☀ 1 day this week". The shift meter appends "+25 ⚡ for showing up".

### Read APIs
- **`eosBondFor(char)`** → `{char, name, count, level, next, toNext, face, faces[], locked, line}`
- **`eosSkillFor(id)`** → `{…, rank, next, progress, can, games[]}`. `games` lists **registered games only**, so 115-120 are skipped in release 1.
- **`eosWeek()`** → `{days, lifetime, label: "☀ 4 days this week", lifeLabel, milestones: [3, 10, 30, 100], reached, next}`. The week starts on Monday. There is no denominator and no streak.
- **`eosMyStats({week?})`**
  - `points`: the sum of positive Δ over non-retro rows.
  - `helps`: "helps you most · ANGER: COOL THE VOLCANO (avg 5.3 lighter)", from at least 2 non-retro rows per (emotion, game) for registered games only.
  - There are no speed fields at all.
- **Dust:** lifetime ⚡ (`localStorage[SCORE_KEY]`, `typeof`-guarded) at 250, 1000, 2500 and 5000 unlocks fireflies, aurora, snow and gold. The choice is stored with `eosSetPref("dust", id)` (the dots module renders it).

### keepHistory and reset
- With `keepHistory: false`, nothing is written to `eos_orbs_v1`, `eos_bonds_v1` or the ledger `eos_rewards_v1`. Orbs, bonds and skills live in memory for this page visit (verified: storage `null`, 1 orb in memory).
- **Reset** clears every `eos_*` key except `eos_prefs_v1`, plus the memory.

### UI components
**`EosWorldChips({stage, reduced})`**
- Rendered only in `input` and `reveal`. `.eosWorldChips` is at the top-right of `.releaseStage`, **z 170**.
- Two 44 px glass pills:
  - `[data-eos-chip="orbs"]`: a glossy mini orb showing the newest orb's face (gold rim when that orb is gold) and the count in 15 px.
  - `[data-eos-chip="days"]`: a CSS sun and the days this week.
- The orb count waits for the meter's `eos:orb-landed` event (or 2.6 s), then pops.
- Hidden while `.releaseChoiceMenu` is open.
- Hidden on phone during check-in step 2 (CSS).
- On phone during check-in step 1, the title spans the stage width, so the two chips fold into **one** 44 px orb button in the corner with a 15 px count badge.
- Either chip opens the shelf. The shelf is a sibling, so its z 220 is not capped by the chips' context.

**`EosOrbShelf({onClose, reduced})`**
- **z 220.** A bottom sheet on phone (stage < 600 px), a centred panel on desktop. Uses `EOS_PRIVATE_ATTRS` plus `fs-mask`, `role=dialog`, `aria-modal`.
- Contents, top to bottom:
  - four stat tiles: days this week, days you showed up, points shifted, memory orbs
  - "helps you most"
  - the next day milestone ("no streaks, nothing to lose")
  - 7 character shelves (characters with orbs first). Each has bond pips, a one-liner, orb buttons (face inside, gold or silver rim), "+N more", and the next bond face as a light silhouette.
  - Tapping an orb shows a **day-only** stamp, for example "PANIC 9 → 4 · Tue · BIG SIGH · CORE MEMORY ✦" (never a clock time).
  - 9 skill cards with rank, a progress bar and the can-do line. A skill not started yet suggests a registered game.
  - "Practise when calm — it works better when you need it."
  - the dust picker (`radiogroup`; locked styles show "⚡ 2500")
  - "◐ calm visuals" and "Don't keep history on this device" switches (`role=switch`)
  - "Share my week ✦", shown only when days this week > 0
  - "💛 Need to talk to someone?". It calls `eosApi("safety").open("info")` when the safety module is present. Otherwise it shows an inline panel built from the store's or `EOS_PROP_DEFAULTS` crisis lines (tel: links), `crisisUrl` and `emergencyText`.
  - "reset my history" with a two-tap confirm (it arms for 4 s)
  - footer `EOS_DISCLAIMER`
- Keyboard:
  - Escape closes (capture listener). The backdrop closes.
  - Focus starts on ✕, Tab and Shift+Tab are trapped (45 presses stayed inside), and focus that escapes is pulled back.
  - On close, focus returns to the chip.
- Reduced motion or calm visuals: cross-fade only.

**`eosMakeShareCard(shift, {format: "story" | "feed", showFeeling, week})`** → `Promise<Blob>` (PNG)
- Sizes: story 1080×1920, feed 1080×1350. Measured about 2-4 MB.
- Contents:
  - the emotion's `grade` gradient running to gold, with bokeh and a warm vignette
  - a 60-dot Thought Dust spiral with tails converging on the calm character
  - loud face → curved gold arrow → calm face in a gold rim. Images use `crossOrigin="anonymous"` with a 2.6 s timeout, are cached, and fall back to a coloured orb.
  - headline at about 150 px Baloo 2 900 after `document.fonts.load`, auto-fitted ("ANGER 8 → 2"; "GOOD 5 → 8" with "lifted ✦")
  - "6 lighter ✦"
  - "shifted in 41 s · COOL THE VOLCANO"
  - a skill badge ("❄ COOL-DOWN ROOKIE")
  - "with RUSH · ThinkStill" and the `shareUrl` host
- Shame, lonely, sad and fear default to **no feeling name**: "8 → 2 / a shift ✦".
- Δ ≤ 0 or skipped shows "I SHOWED UP / for me ✦", never numbers.
- The weekly card (`week: true`) shows STILL ringed by this week's orbs as dots in character colours (gold rim for gold), "☀ N days", "I showed up for me this week", "N points shifted" and the top skill. It uses numbers only.
- Every string drawn is composed from the allow-list (labels, numbers, game and character names, the URL). In dev, `window.__eos.rewards.dev.lastCard.texts` lists them.

**`EosShareButton({shift, variant: "button" | "link", label, week, format})`**
- Renders `null` while **any** safety flag is set.
- Has a busy state ("making your card…").
- Sharing: `navigator.canShare({files})` → `navigator.share({files, text})` (AbortError is fine). Otherwise it downloads through `a[download]`, copies the caption, and shows a toast ("card saved ✓ caption copied").
- For sensitive feelings it adds a quiet "☐ show the feeling name" toggle.
- **Captions rotate**, 3 per emotion:
  - "I shifted ANGER 8 → 2 in 41 s with ThinkStill 🫧 #ThinkStillShift"
  - "RUSH handed back the controls. 8 → 2 ✦"
  - "Cooled it down in 41 s. Your turn?"
- With `shareUrl` set, the caption ends with `?eos=<emo>&t=<s>`. A hidden sensitive feeling uses `eos=auto`, so the link never names it.

**`EOS_REWARDS_CSS`**: every rule sits under the `EOS_A` root, and every button is at least 44 px. Shelf text is 13 px or larger, chip numbers 15 px, the reduced-motion media query is honoured, and so is `[data-eos-calm]`.

## Exports and API
Top level: `EOS_REWARDS_SKILLS`, `eosGrantForShift`, `eosBondFor`, `eosSkillFor`, `eosWeek`, `eosMyStats`, `EosWorldChips`, `EosOrbShelf`, `eosMakeShareCard`, `EosShareButton`, `EOS_REWARDS_CSS`.

`eosExpose("rewards", {…})` publishes:
- the spec names: `grantForShift`, `EosShareButton`, `eosMakeShareCard`, `eosBondFor`, `eosSkillFor`, `eosWeek`, `eosMyStats`
- `EosWorldChips`, `EosOrbShelf`, `EOS_REWARDS_SKILLS`, `EOS_REWARDS_CSS`
- aliases: `bondFor`, `skillFor`, `week`, `stats`, `makeShareCard`
- helpers: `caption(shift, {index, week, showFeeling})`, `skillOfGame(id)`, `sceneChar(id)`, `noteMoment(variant)`, `orbs()`, `bonds()`, `ledger()`, `dust()`, `reset()`, `dev`, `mem`

## Integrator wiring (exact)
1. **Nothing new is required.**
   - `dev/eos_integrate.py` I2-E2 already mounts `<EosWorldChips stage={stage} reduced={!!reduced} />` as a direct child of `section.releaseStage`, and the shelf renders itself from it.
   - The shift meter already calls `eosApi("rewards").grantForShift?.(shift)` and renders `eosApi("rewards").EosShareButton` with `{shift}` and `{shift, variant: "link", label: "make a card"}`. Both are compatible, and the meter's orb flight lands on `[data-eos-chip="orbs"]`.
2. **Optional, check-in (bond face on the check-in orb after the shift, §9.2).**
   - Call `eosApi("rewards").bondFor?.(EOS_EMO[id].char)` and, when it has a face, render `face` as that orb's mood on the check-in ring.
   - The check-in module owns that change; this module exposes the data.
3. **Optional, Still Moment.**
   - If the shift module wants exact skill credit for a moment the player started by hand (not `auto`), it can call `eosApi("rewards").noteMoment?.(variant)` when the moment completes.
   - Without that call, auto moments are already credited through `eosApi("shift").context()`.
4. **Dots (F6).** The dots module already reads `eosPrefs().dust` (`default | fireflies | aurora | snow | gold`). The shelf writes it with `eosSetPref("dust", id)` and then calls `eosApi("dots").pulse?.("in")`.

## Acceptance results
**Test builds**
- Isolated: `build.py --dev-dir /tmp/eos_rewards --modules 00_eos_core.jsx,52_eos_rewards.jsx`
- Integrated, rewards only: `eos_integrate.py --dev-dir /tmp/eos_rewards_int --modules 52_eos_rewards.jsx`
- Integrated, fuller: `/tmp/eos_rewards_full` with 111-114, check-in, router, shift and rewards

Test scripts are in `/tmp/eos_rewards_t/` (`unit`, `ui`, `share`, `phone`, `bond`, `cards` `.mjs`).

**Results**
1. First loop of the day → one gold orb with a face from `eosFacePool(char, "win")` (13-face pool for RUSH), and the face was unowned. Later loops are silver, except a bond level-up (RUSH reaching 3) and a new feeling (PANIC), which are gold. Δ0 and Δ6 tiers are identical.
2. With 8 grants: 5 orbs (`capped` = `00000111`). The same `t` returns the identical object, and only 5 rows are stored.
3. ANGER + 113 → `rush:1^`, `glitch:1^`. NOT SURE + 114 → still and drop. The scene characters for 111-114 are sync, rush, glitch and drop.
4. GOOD + 111 and NOT SURE + 109 → SIGH count 1 → 2 (ROOKIE).
5. `eosWeek` gives "☀ 2 days this week" with no "/". Milestones are `[3, 10, 30, 100]`. With 12 lifetime days, two loops granted the 3 and 10 milestone orbs.
6. SCORE 1000 → fireflies and aurora unlocked (two styles); snow and gold stay locked.
7. `eosMyStats` excludes retro rows (points 13 of a possible 22) and has no speed fields.
8. Chips are at z 170. `elementFromPoint` at both chip centres hits the chip in `stage-input` and `stage-reveal` at 1280 and 390. They are hidden while the menu is open (`chipsVisible: false`) and do not overlap the composer.
9. Shelf:
   - z 220. Opens with Enter on the chip, focus goes to ✕, the Tab trap holds, and Escape closes with focus back on the chip.
   - Day-only stamp ("PANIC 9 → 4 · today · BIG SIGH · CORE MEMORY ✦"). The support link, disclaimer and `data-private` are present.
   - The keepHistory switch toggles the pref (false → true). Reset arms, then clears the orbs and sessions while prefs are kept; the chip shows 0.
   - `smallText(12)` inside the shelf and the meter found nothing.
10. Story 1080×1920 and feed 1080×1350 PNGs, each over 3 MB as a data URL. The week cards are 1080×1920 and 1080×1350. SAD default texts are `["MY SHIFT ✦", "8 → 2", "a shift ✦", …]` with no feeling name. The texts never include the typed thought. Captions end `…?eos=anger&t=41`, and sensitive feelings end `?eos=auto&t=41`. The real share click in the meter downloaded the card and showed "card saved ✓ caption copied".
11. After real loops where "my boss yelled at me today" was typed, no `localStorage` value contains it.

Page errors: 0 in every run (1280×860 and 390×844, plus reduced motion). Copy lint (banned words) is clean.

## Screenshots
In `framer/dev/shots/eos/`:
- `rewards_input_{1280,390}.png`, `rewards_reveal_{1280,390}.png`, `rewards_shelf_{1280,390}.png`, `rewards_shelf_bottom_{1280,390}.png`
- `rewards_checkin_{390,1280}.png`, `rewards_skipmode_{390,1280}.png`, `rewards_reveal_sad_390.png`, `rewards_reveal_panic_1280_reduced.png`
- the cards: `rewards_card_story_anger.png`, `rewards_card_story_sad.png`, `rewards_card_story_good.png`, `rewards_card_week.png`, `rewards_card_feed_panic.png`, `rewards_card_feed_zero.png`

## Known limitations
- Card PNGs are 2-4 MB (Chrome's gradients and the soft dust do not compress well). A card takes about 3 s to render in headless software rasterisation and is much faster on a device.
- In a published build, faces need `raw.githubusercontent` reachable with CORS. If it is not, the card falls back to coloured orbs.
- On a 390 px phone during check-in step 1, the folded orb button sits right beside the check-in title's "?". The rects touch by about 1 px, and nothing is covered or unreadable.
- With `keepHistory` off, orbs, bonds and skills last only for the page visit. That is intended. Day marks are still written by core's `eosMarkDay` (spec: days are not history rows).
- Rows are never written for deferred games 115-120, and skills that list them only name registered games. Nothing in this module needs them.
- I did not run a full 114-game sweep (that is the Regression task). Rewards only add surfaces in `input`, `reveal` and the shelf, and never touch gameplay.
