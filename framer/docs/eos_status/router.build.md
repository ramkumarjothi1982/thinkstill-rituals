# router — build report (FINISHED)

## What I built
`src/eos/45_eos_router.jsx` (Router v1.2, spec §7 including the §7.6 verdicts, §0.2 class sets, and the §6.4 hand-off). The feeling a person names, or the words they type, now picks the game that relieves that state:
- **Bands:** high 7-10 means body first, mid 4-6 means the emotion's signature game, low 0-3 means meaning and humour. Express launches use the high band.
- **No recency penalty in the high band.** A regular angry user keeps getting 112.
- **Late night (23:00-05:00):** loud games score −0.2, and 117 is dropped unless the feeling is numb.
- **Real-threat rules:** 118, 105 and 53 are never routed for a real threat. 89 needs "or", "vs" or "versus" in the text.
- **Vault and bench games are never routed.** They stay in the menu and stay playable.
- **Safety flag:** any flag, from the store or from a synchronous scan of the typed text, restricts routing to `EOS_GENTLE_IDS`. A crisis phrase with no detected feeling never falls through to the arcade's own chooser.
- **History:** a game's score moves at most ±0.15 from history. Retro rows are ignored.
- **Variety:** mid and low bands use deterministic variety (#2 when `eosNoise(seed + loops, top) < .2`, and only if #2 is not heavily penalised).
- **Safeguards:** the §7.1 never-rules are also applied as filters on top of the lists: no bomb imagery for panic, no concealment or destruction for shame, no destruction for sad or lonely at their peak, no looming exposure for fear at its peak, and GOOD is never smashed.
- **Release 1:** any id not registered in `GAMES` at call time is skipped. Each list then falls through to the next best existing game:
  - shame.mid → 104 VOLUME KNOB
  - overwhelm.mid → 93 SPACE MAKER
  - fear.mid → 31 BACK SEAT
  - numb → 68 DRUM IT (1 POP late at night)
  - jealous → 47 UNFOLLOW
  - overthinking.mid → 34 RIVER
  - good → 106 / 88

  Nothing returns an unregistered id, and every entry point is wrapped in try/catch and returns null, so the arcade's chooser takes over if anything goes wrong.
- **Copy for GOOD:** `EosProfileOverride` returns a savouring profile ("GOOD → GLOWING", "YOU BANKED THE GOOD ✓"). Its id stays "general" so every id-keyed arcade copy bank still works.
- **Purity:** everything is pure with respect to `EOS_STORE` and localStorage. The only write is core's documented `eosTextSafety` flag-type record inside `EosRouteGame`, and only when it has text.

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
3. **Optional:** after I1-E14 adds `const eos = useEosStore()`, the integrator may append `eos.emotion, eos.safety` to the deps of the `recommendedReleaseGame` `useMemo`. It is not required, because `EosMarkLaunch` commits the emotion and the flag before `setStage("play")`, and `selected?.id` changes on every launch.

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

## Screenshots (`framer/dev/shots/eos/`)
- `router_menu_anger_1280.png`, `router_menu_anger_390.png`: the "FOR YOUR ANGER" group with a red hue bar and a gold ring on the top pick
- `router_menu_new_1280.png`, `router_menu_new_390.png`: "NEW · RELIEF GAMES" in gold
- `router_checkin_cta_1280.png`, `router_checkin_cta_390.png`: "LET'S SHIFT IT ▶ ≈30 s · COOL THE VOLCANO"
- `router_volcano_from_menu_1280.png`, `router_volcano_from_menu_390.png`
- `router_e2e_anger8_1280.png`, `router_e2e_anger8_reveal_1280.png`, `router_e2e_sad6_390.png`, `router_e2e_typedPanic_390.png`, `router_e2e_typedPanic_reveal_390.png`, `router_e2e_crisis_1280.png`

## Known limitations
- `EosRoutePreview` has no text, so the text-only rules (89, real threat) and a not-yet-scanned crisis phrase can make the CTA name differ from what GO launches. GO itself always rescans the text.
- When 117 is deferred, numb and good route to existing games (68 / 1 / 106 / 88). Late at night numb.high gets 1 POP because 68 DRUM IT is loud. This is intended.
- **Not router bugs, for the fixes / readability tasks:** at 390, 110 RAIN OUT clips the cloud words ("sad hea", "missin"). The "15 SIGNATURE RELEASES" label is tiny in builds without the readability module.
- Tests covered release-1 ids 1-114. The modelled 1-120 catalogue was used only to prove the rules (117 late, 118 threat, 89).
