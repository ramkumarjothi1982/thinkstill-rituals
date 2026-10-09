# router — build report (FINISHED · round 1 fixes applied)

## What I built
`src/eos/45_eos_router.jsx` (Router v1.2, spec §7 including the §7.6 verdicts, §0.2 class sets, and the §6.4 hand-off). The feeling a person names, or the words they type, now picks the game that relieves that state:
- **Bands:** high 7-10 means body first, mid 4-6 means the emotion's signature game, low 0-3 means meaning and humour. Express launches use the high band.
- **No recency penalty in the high band.** A regular angry user keeps getting 112.
- **Late night (23:00-05:00):** loud games score −0.2, and 117 is dropped unless the feeling is numb.
- **Real-threat rules:** 118, 105 and 53 are never routed for a real threat. 89 needs "or", "vs" or "versus" in the text.
- **Vault and bench games are never routed.** They stay in the menu and stay playable.
- **Safety flag:** any flag, from the store or from a synchronous scan of the typed text, restricts routing to `EOS_GENTLE_IDS`. The one exception: a soft flag lets anger keep 112. A crisis phrase with no detected feeling never falls through to the arcade's own chooser.
- **History:** a game's score moves at most ±0.15 from history. Retro rows are ignored.
- **Variety:** mid and low bands use deterministic variety (#2 when `eosNoise(seed + loops, top) < .2`, and only if #2 carries no penalty at all).
- **Act 2:** the band comes from the episode's entry level (express or `before`), never the after-rating.
- **Phone:** `EOS_ROUTER_PHONE_FRAGILE` demotes games that stall at a stage ≤ 560 px wide (47).
- **Safeguards:** the §7.1 never-rules are also applied as filters on top of the lists: no bomb imagery for panic, no concealment or destruction for shame, no destruction for sad or lonely at their peak, no looming exposure for fear at its peak, and GOOD is never smashed.
- **Release 1:** any id not registered in `GAMES` at call time is skipped. Each list then falls through to the next best existing game:
  - shame.mid → 104 VOLUME KNOB
  - overwhelm.mid → 93 SPACE MAKER
  - fear.mid → 31 BACK SEAT
  - numb → 68 DRUM IT (1 POP late at night)
  - jealous → 47 UNFOLLOW on desktop and 45 MAGNETS on a phone (47 is phone-fragile)
  - overthinking.mid → 34 RIVER
  - good → 106 TINY SOUNDTRACK (never 25, 88 or 53)

  Nothing returns an unregistered id, and every entry point is wrapped in try/catch and returns null, so the arcade's chooser takes over if anything goes wrong.
- **Copy for GOOD:** `EosProfileOverride` returns a savouring profile ("GOOD → GLOWING", "YOU BANKED THE GOOD ✓"). Its id stays "general" so every id-keyed arcade copy bank still works.
- **Purity:** everything is pure with respect to `EOS_STORE` and localStorage. The only write is core's documented `eosTextSafety` flag-type record inside `EosRouteGame`, and only when it has text.

## Round 1 fixes (docs/eos_status/router.review_r1.json, 12 findings)
| # | sev | finding | resolution |
|---|---|---|---|
| 1 | major | The reveal's "TRY …" pick goes stale when a safety flag is raised after launch (`recommendedReleaseGame` memo deps miss the store) | **Not in my file. Routed to the integrator (I2, `dev/eos_integrate.py`), and now REQUIRED** (the old "optional" note was wrong, see wiring step 3). The router re-reads `st.safety` and the text flag on every call, so it returns a gentle id as soon as the memo re-runs. Verified: anger plus a soft flag with `excludeId` 112 gives 109 CLEANSE. |
| 2 | minor | `EosSecondAct` "it worked" branch took its band from the after-rating | **Fixed** to follow §7.3. The band now comes from the episode's entry level: express gives 10, otherwise `st.before ?? st.intensityGuess ?? dial ?? 6`. The after-rating is never used. Documented in the code, here and in the header. |
| 3 | minor | Privacy: the menu group label names the feeling with no masking | **Fixed.** `{...EOS_PRIVATE_ATTRS}` and `fs-mask` are on `.eosMenuGroupLabel`. `data-eos-menu-group` is now `"feeling"` or `"new"` and never the emotion id. Verified in the DOM at 390 and 1280. |
| 4 | minor | `EosMenuGroup` memo deps miss `path`, `intensityGuess` and `detected` | **Fixed.** The memo is keyed on the store snapshot (`st`), plus the played key, the `GAMES` length and the phone width. Verified: setting `path` to [112] moves 112 out of the "FOR YOUR ANGER" group immediately. |
| 5 | minor | Shift `coolPath` shortcut skips the gentle-first rule | **Not in my file. Routed to shift** (`50_eos_shift.jsx` `eosShiftNext`). After fix 11, a soft flag also gives 112 here, so only strong flags disagree. Suggested edit: `if (ctx.coolPath && !eosSafetyStrong(EOS_STORE.get().safety))`. |
| 6 | minor | Dead `EOS_ROUTER_BAND_LEVEL` | **Fixed.** It is now used for the crisis default (`high` = 8) and for the unknown-level default in preview and act 2 (`mid` = 6). |
| 7 | major | Panic 8→3 "ONE MORE" offered 105 DRAMA MACHINE | **Fixed** (same change as #2). Unit results for 8→3: panic, anger → 109 CLEANSE · fear → 102 FINGER TRAP · anxiety → 111 BIG SIGH · overwhelm → 93 SPACE MAKER (its own high list). Express acts are also high band. **E2E at 390:** check-in panic 8 → 111 (37.6 s) → after 3 → button "ONE MORE ▶ CLEANSE" → 109 launches. Path is [111, 109]. |
| 8 | major | Every jealous route lands on 47 UNFOLLOW, which stalls at phone width | **Fixed in the router**, and the root fix is routed to fixes. New `EOS_ROUTER_PHONE_FRAGILE` (47 → −0.5) applies when the arcade stage is ≤ 560 px wide. It measures `.tsArcade`, falls back to the window, and accepts `opts.width` in tests. 47 is never removed: it stays a fallback and stays in the menu. Results at 390: jealous high → 45 MAGNETS, mid → 45 or 25, low → 88. Desktop keeps 47. **E2E at 390:** typed "jealous of my friend, comparing myself" → LET THINKSTILL CHOOSE → 45 → reveal in 19.5 s. Drop the 47 entry once `60_eos_fixes` verifies `finishGame(47)` at 390 (plug snap-back). |
| 9 | minor | GOOD got "get rid of it" gestures | **Fixed.** `EOS_ROUTER_NEVER.good` now also blocks 25 SWIPE AWAY (the "nope" gesture), 88 TRADE MACHINE (trades the good moment away) and 53 CARTOONIFY (frames it as a shrinking villain; my own addition under the same §7.1 rule). **1 POP stays on purpose:** a confetti pop with the savouring copy that `EosProfileOverride` supplies, and it is listed in spec good.mid. "FOR YOUR GOOD MOOD" now shows TINY SOUNDTRACK, POP, DRAMA MACHINE, GO WEIRD. Auto picks: high → 106, mid → 106/1/105, low → 106/107. |
| 10 | minor | The variety swap undid the late-night loud demotion | **Fixed.** The swap to #2 is skipped when #2 carries any penalty: path, recency, late-night loud, phone-fragile or negative personal history. Checked on 3,120 explain cases: 429 swaps, 0 of them penalised. Numb mid at 23:30 → 1 POP in 40 of 40 seeds, never 68. |
| 11 | minor | A soft flag removes the anger hero | **Lead-delegated decision, taken in favour of faster felt relief.** New `EOS_ROUTER_SOFT_OK = {anger: {112}}`: under a **soft** flag only, anger keeps 112, which is a slow breath cool-down in `EOS_SLOW_IDS` and not a discharge game. `validate()` enforces slow and non-smash. Strong flags (threat, abuse, selfharm) stay strictly on `EOS_GENTLE_IDS`, which is unchanged. "I hate my life and I am so angry" → 112, and `EosSecondAct("anger", 4, 5)` under soft → 112. To revert, empty the set. |
| 12 | minor | Arrow label covers the meter body; "SLIDE TO RIGHT NOW" copy | **Out of scope. Routed to arrows and shift.** Still visible in `router_r1_jealous_magnets_390.png` ("SLIDE TO RIGHT NOW"). |

## Exports
**Spec names:**
- `EOS_EMOTION_ROUTES`, `EOS_ROUTE_RULES`, `EOS_VAULT`, `EOS_BENCH`, `EOS_GENTLE_IDS`, `EOS_SECOND_ACT`, `EOS_LOUD_IDS`, `EOS_GAME_SECONDS`
- `EosRouteGame(text, played = [], excludeId = null[, opts])` → a `GAMES` object or null
- `EosSecondAct(emotion, lastId, delta[, text, opts])` → a `GAMES` object or null
- `EosRoutePreview(emotion, before)` → `{id, name, seconds, best, band, emotion}` or null
- `EosMenuGroup({played, gameChoice, onPick})`
- `EosProfileOverride(input)`

**`eosExpose("router", …)`** has all of the above plus test helpers:
- `explain(text, played, excludeId, opts)`: the full decision as `{ctx, ranked[{id, score, rank, parts}], pick}`, with no text included
- `personalDelta(emo, id)`
- `verdict(id)` (§7.6)
- `validate()` (§7.2 invariants; it returns [], and in dev it runs at load and `console.warn`s on problems)
- `menuItems()`
- `setNow(isoOrNull)`: a fake local clock for tests

`opts.ids` (tests only) models another catalogue, for example release 2 with ids 1-120 registered.

**Private names** use `EOS_ROUTER_*` / `eosRouter*`. The CSS is registered as `eosCss("router")`.

## Integrator wiring (exact)
1. **Already in `dev/eos_integrate.py`, nothing new needed.** The names match:
   - I2-E4: `const best = EosRouteGame(sourceThought, played) || chooseRelevantGame(sourceThought)`
   - I2-E5: `return EosRouteGame(sourceThought, played, selected.id) || chooseRelevantGame(sourceThought, selected.id, selected)`
   - I2-E10: `<EosMenuGroup played={played} gameChoice={gameChoice} onPick={startChosenGame} />` before the "15 SIGNATURE RELEASES" label
   - I2-E11: the `EosProfileOverride(input)` early return in `releaseEmotionProfile`

   With this module present, the scratch stubs for `EosRouteGame` and `EosProfileOverride` drop out automatically. This was verified in an integrated build with every current module.
2. **Shift meter (a later task):** "ONE MORE ▶" should call `eosApi("router").EosSecondAct?.(st.emotion || st.detected, st.gameId, shift.delta)`. A null result means "use `tryRecommendedRelease`". The check-in already calls `eosApi("router").EosRoutePreview?.(emotion, n)`, which now renders "≈30 s · COOL THE VOLCANO".
3. **REQUIRED (review r1 #1; this corrects the earlier "optional" note):** `55_eos_safety` can raise a flag in the reveal *after* launch (no relief at ≥ 9). The reveal's "TRY …" memo then keeps a stale, non-gentle pick. Add an I2 edit in `dev/eos_integrate.py` that changes the anchor `    }, [selected?.id, raw, entries.join("|"), chooseRelevantGame])` (00_arcade.jsx ~21361) to `    }, [selected?.id, raw, entries.join("|"), chooseRelevantGame, eos.safety, eos.emotion])`. `const eos = useEosStore()` already exists from I1-E14. Belt and braces: `tryRecommendedRelease` can re-route when clicked, with `startChosenGame(EosRouteGame(sourceThought, played, selected.id) || recommendedReleaseGame)`.
4. **Shift (review r1 #5):** in `eosShiftNext`, take the `coolPath` shortcut only when `!eosSafetyStrong(EOS_STORE.get().safety)`. Otherwise `EosSecondAct` decides, and it already returns 112 for anger after a discharge game when there is no flag or only a soft one.

## Acceptance (§7.5 plus the task's 13 checks): all pass, zero page errors
Results come from the integrated scratch builds `/tmp/eos_router_int` (router, the 4 hero games and the check-in) and `/tmp/eos_router_all` (every current module). The registered new ids were 111-114.

1. **Every emotion × band:** 1,728 picks (12 emotions × 3 bands × 4 texts × 6 seeds × {real catalogue, modelled 1-120}). Every pick was in its own band list (100 %), never vault or bench, never an excluded id, always registered.
2. **Safety:** 628 picks with a store flag (soft, threat, abuse or selfharm) or flagged text with no check-in ("i want to die", "I want to kill myself", "my dad hits me", "I'm such a burden"). All were in `EOS_GENTLE_IDS`, including with `excludeId`.
3. `EosSecondAct("anger", 4, 5)` = 112. Under a selfharm flag it gives 113 (gentle).
4. Anger at 8, with 112 and 100 in `played` and in the last 3 `eos_sessions`, gives 112. At 5 (mid band) recency applies and gives 4.
5. At 23:30 anger never gets 117, even in the modelled 1-120 catalogue, and numb gets 117 when it is registered. Loud ids 4, 15, 2 and 68 are demoted.
6. "I'm scared he'll follow me home" never routes 118, 105 or 53, across every emotion, band, catalogue and flag. With no check-in it gives 111 under the threat flag.
7. 89 is a candidate only with "or", "vs" or "versus" ("in order to" does not count). 40 seeded fear picks without them never gave 89.
8. Express panic with `before` null gives 111.
9. Typed "my boss yelled at me and I feel panic" with no check-in gives 111. Free text with no feeling ("this traffic is killing me") gives null, so the arcade's chooser handles it unchanged.
10. The largest move from history was 0.150. A retro-only game has `personalDelta` 0.
11. `EosProfileOverride("i am panicking")` returns the panic profile. After a check-in to anger it returns the anger profile; after a check-in to good it returns "GOOD → GLOWING". When the arcade's own regexes already match the text, it returns null (original behaviour).
12. The menu group "FOR YOUR ANGER" is 13 px and sits before "15 SIGNATURE RELEASES". Its items are COOL THE VOLCANO, CLEANSE, PAUSE BUTTON and BIG SIGH, built as `button.releaseChoiceItem.eosMenuPick` → `img` + `span > b` with no extra text, all images loaded, at 1280 and 390. With no feeling known it shows "NEW · RELIEF GAMES" with 111-114. `startGame(page, 'POP')` launches 1, and `startGame(page, 'COOL THE VOLCANO')` launches 112 through the group item. `listGames` returns 114 names after de-duplication.
13. A `EOS_STORE` snapshot (identity and JSON), `eos_sessions_v1` and the played key were unchanged after every call.

**End to end** (all-module build, real gestures through `finishGame`, `lite`):
| flow | launched | reaches reveal | reveal button |
|---|---|---|---|
| check-in anger 8 + GO (1280) | 112 | yes | TRY CLEANSE (routed) |
| check-in sad 6 (390) | 110 | yes | — |
| typed panic, no check-in (390) | 111 | yes | TRY CLEANSE (routed) |
| "i want to die" (1280) | 111 | — | — |

In the crisis flow the store flag is `selfharm` and the game shows neutral words.

### Round 1 re-test (all-module integrated build `/tmp/eos_router_all`, plus the isolated build `/tmp/eos_router`): 0 fails, 0 page errors
- **Unit (`/tmp/rtr/unit.mjs`, at 390 and 1280):**
  - `validate()` returns []
  - act-2 entry-level bands for 5 emotions, normal and express
  - soft-flag matrix: none or soft → 112, threat, abuse and selfharm → gentle; 126 soft picks for other emotions are all gentle
  - GOOD: 216 picks, never 25, 88, 53 or discharge, and the menu is clean
  - variety: 0 penalised swaps
  - numb late: never 68
  - jealous at 390 never 47, at 1280 47 first
  - 4,212-pick sweep (14 keys × 3 levels × {none, soft, selfharm} × day/late × 6 seeds × {no exclude, 111, 112}): every pick registered, not vault or bench, never the excluded id, ≤ 114, gentle under a flag (plus 112 for soft anger), §7.1 never-rules hold, no 117 late
  - purity: the store snapshot is identical
- **Isolated build** (ids 1-110 only, heroes absent): 351 calls to `EosRouteGame`, `EosSecondAct` and `EosRoutePreview` returned 0 nulls and 0 unregistered ids. Jealous gives 45.
- **E2E at 390:**
  - panic act 2 → CLEANSE (see #7)
  - jealous auto → 45 → reveal (see #8)
  - menu: label 13 px, masked, `data-eos-menu-group="feeling"`; anger group follows `path`; jealous group at 390 is MAGNETS, SWIPE AWAY, TRADE MACHINE, UNFOLLOW, and at 1280 it starts with UNFOLLOW

## Screenshots (`framer/dev/shots/eos/`)
- Round 1 (untracked, local):
  - `router_r1_panic_act2_meter_390.png`: "PANIC 8 → 3 · CALM" with ONE MORE ▶ CLEANSE
  - `router_r1_panic_act2_cleanse_390.png`
  - `router_r1_jealous_magnets_390.png`
  - `router_r1_menu_good_390.png`
  - `router_r1_menu_jealous_390.png`
  - `router_r1_menu_jealous_1280.png`
- `router_menu_anger_1280.png`, `router_menu_anger_390.png`: the "FOR YOUR ANGER" group with a red hue bar and a gold ring on the top pick
- `router_menu_new_1280.png`, `router_menu_new_390.png`: "NEW · RELIEF GAMES" in gold
- `router_checkin_cta_1280.png`, `router_checkin_cta_390.png`: "LET'S SHIFT IT ▶ ≈30 s · COOL THE VOLCANO"
- `router_volcano_from_menu_1280.png`, `router_volcano_from_menu_390.png`
- `router_e2e_anger8_1280.png`, `router_e2e_anger8_reveal_1280.png`, `router_e2e_sad6_390.png`, `router_e2e_typedPanic_390.png`, `router_e2e_typedPanic_reveal_390.png`, `router_e2e_crisis_1280.png`

## Known limitations
- `EosRoutePreview` has no text, so the text-only rules (89, real threat) and a not-yet-scanned crisis phrase can make the CTA name differ from what GO launches. GO itself always rescans the text.
- When 117 is deferred, numb and good route to existing games (numb 68 / 1, good 106 / 1 / 105 / 107). Late at night numb gets 1 POP because 68 DRUM IT is loud. This is intended.
- Act 2 takes its band from the current act's `before`, and the shift module carries the previous after into it (act 2 of panic 8 → 3 has `before` 3). So act 3+ moves to the warm band, as §7.1 intends ("top-down when warm"): for panic that means 105 / 55 / 104.
- `EOS_ROUTER_PHONE_FRAGILE` is a release-1 guard. Remove 47 once the fixes owner lands the plug snap-back and `finishGame(47)` passes at 390.
- **Not router bugs, for the fixes / readability tasks:** at 390, 110 RAIN OUT clips the cloud words ("sad hea", "missin"). The "15 SIGNATURE RELEASES" label is tiny in builds without the readability module.
- Tests covered release-1 ids 1-114. The modelled 1-120 catalogue was used only to prove the rules (117 late, 118 threat, 89).
