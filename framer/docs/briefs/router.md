# BRIEF for task `router` — extracted from docs/EOS_SPEC.md (sections: §7 (all, incl. §7.6 verdicts), §0.2 (EOS_DISCHARGE_IDS, eosRealThreat, eosTextSafety), §6.4)
Read THIS file instead of the whole spec. If you truly need another section, grep docs/EOS_SPEC.md for it rather than reading the whole file.

# EOS SPEC · ThinkStill Emotional Operating System

**Status:** build spec **v1.2** (lead; all three critiques applied, resolution log in §13). **Baseline:** `src/00_arcade.jsx` md5 `b9e220c391b7e86bfb46b8c718e7f489` (22,786 lines), `src/99_pixar.jsx` md5 `8457fe0d9dd273143480fc1798c1ead4`, `src/eos/00_eos_core.jsx` **v1.2.1** (foundation additions in §0.5; **frozen for builders**).
**Inputs:** `docs/design_relief.md`, `docs/design_pixar.md` (read in full), `map_main.md`, `map_engine_hud.md`, `catalog_A.md`, `catalog_B.md`, `audit_1-3.json` (110 live runs), audit screenshots, `EOS_SPEC_CRITIQUE_asks.md`, `EOS_SPEC_CRITIQUE_build.md`, `EOS_SPEC_CRITIQUE_science.md`, and source checks made for this spec (listed where used).

**The user's request, restated as acceptance goals**
| # | goal | where |
|---|---|---|
| G1 | An arrow in **every** game, **every step** of it, and on every EOS interaction (check-in, reveal), shows exactly how to play | §3 |
| G2 | No text a person must read is tiny (score, sparks, tokens, LVL, labels, words) in **any** stage (input, menu, play, finish, reveal, shelf, safety) | §4 |
| G3 | **All** tiny background dots drift and merge into **one** measured centre, and their speed mirrors how calm the player is | §5 |
| G4 | Emotion first: say how you feel (panic, anger, anxiety…) and get the game that relieves *that* state — panic in **one tap** | §6, §7 |
| G5 | New games where the catalogue has gaps (**10 new games, 111-120**); every one of the 120 games visibly moves from negative to positive | §5.6, §8, §11 |
| G6 | Instant, non-clinical dopamine: negative → positive in under a minute, never "therapy homework" | §2, §6, §8, §9 |
| G7 | Healthy, viral, hypnotic, Pixar / Inside-Out quality (testable checklist) | §2, §5, §8.0, §9 |
| G8 | Nothing existing is removed or broken (110 games, mic, uploads, sound, property controls, Pixar layer) | §12 |
| G9 | Safe: help is always reachable, crisis words never land on a game object, no dark patterns, private by default | §9.4, §10 |

**Hard rules for every builder** (repeated in §12.1): one shared file scope, no `import` and no `export` lines in `src/eos/*`, every new top-level name uses **your task namespace** (`Eos<Task>…` / `EOS_<TASK>_…` / `eos<Task>…`; the public names this spec lists are exempt), keyframes `eos<Task><Name>`, `eosCss` key = task id, never touch `PX_B` / `pxNoise` / `PIXAR_CSS` / `PX_SQUASH_TARGETS` at module top level, **no regex lookbehind** (`build.py` rejects it), never store user text, every timer / listener / rAF cleaned up, works at 390×844 and 1280×860, honours reduced motion **and** the in-app calm-visuals toggle (`eosCalm(reduced)`), every runtime check runs in a scratch **integrated** build (`dev/eos_integrate.py --dev-dir`, §12.3).

---------------------------------------------------------------------------------------------------

## 0. Shared core contract (`src/eos/00_eos_core.jsx` v1.2.1, frozen after Foundation)

Builders **read the file**; this is the index. All names below exist today, the full build passes, and the pure functions were run in node against every phrase list in this spec (§7.4, §10.1).

### 0.1 Selector roots, CSS, API registry, dev gate, stacking
| name | what |
|---|---|
| `EOS_A` | `.tsArcade:not(#eosA):not(#eosB):not(#eosC)` — prefix every EOS rule that styles arcade DOM (beats every arcade `!important` and Pixar's 2-id `PX_B`). For our own nodes inside `.tsArcade` use it too. |
| `EOS_PX` | `.tsPixarRoot:not(#eosA):not(#eosB):not(#eosC)` — for the Pixar rig (`.tsPxRig`, `.tsPxDust`, `.tsPxBokeh`), which lives beside `.tsArcade`. |
| `eosCss(name, css)` | register a CSS string once at module top level, **name = your task id**. `<EosGlobalStyle/>` (mounted once by I1) renders all parts in file order. Games pass `opts.css` to `eosRegisterGame` instead. |
| `eosExpose(name, api)` / `eosApi(name)` | publish / read a module API. `eosApi("rewards").grantForShift?.(shift)` (always optional-chained, also for `eosApi("dots").pulse?.("in")`) is the ONLY allowed way for one module to call another module's function (isolated builds contain only core + your files). Integration edits in `00_arcade.jsx` / `99_pixar.jsx` reference functions/components directly by name. |
| `eosIsDev()` | `true` on `file://`, `localhost`, `127.0.0.1` or `?eosdev=1`. **`window.__eos`, `window.__eosPreview` and `window.__eosArrowMiss` are assigned only when it is true** — a published Framer site never exposes the emotional state (incl. `safety`) to other scripts. The Playwright harness uses `file://`, so tests are unaffected. |
| `EOS_Z` | z-index map inside the `.releaseStage` stacking context: flow 0 · check-in 30 · check-in chip 32 · mood 54 · companion 55 · guards 58 · arrows 60 · world chips 170 · shelf 220 · safety card + support pill 230. (`.releaseCompleteOverlay` is z 160 there; the composer is outside the stage at z 240 and never covered.) |
| `EOS_PRIVATE_ATTRS` | `{data-private, data-hj-suppress, data-clarity-mask}` — spread (plus class `fs-mask`) on every EOS root that shows feelings: `.eosCheckIn`, `.eosShiftMeter`, `.eosSafetyCard`, `.eosOrbShelf`, `.eosCompanion`, `.eosArena`. `EosConfigSync` masks `input.releaseThoughtInput`. |

### 0.2 Data
| name | what |
|---|---|
| `EOS_EMOTIONS` / `EOS_EMO[id]` | the 12 states: `panic, anger, anxiety, overthinking, overwhelm, sad, lonely, shame` (`primary:true`, on the ring) + `fear, jealous, numb` ("more feelings") + `good` (its own "☀ good day? bank it" chip). Fields: `label, noun, sub, char, loud, calm, hue, meter, spark, profile, moment ("sigh"/"heart"/"spark"), better ("down"/"up"), dial, flip[3], grade{loud[2],calm[2]}, dialQ?[2], dialWords?[5], starter, seeds[6]`. v1.2: subs use everyday words (`frustrated · boiling`, `stressed · too much`, `low · heavy`, `guilty · not enough`…); starters/seeds are sensations, situations or feeling names only (§2 copy rules); `numb.calm = 61` (awake, dancing — was the same face as loud). |
| `dial` | check-in pre-light: panic 8 · anger 8 · anxiety 7 · overwhelm 7 · fear 7 · overthinking 6 · sad 6 · lonely 6 · shame 6 · good 6 · jealous 5 · numb 5. |
| `flip` | 3 positive words that rise out of the Still Point bloom at every finish (§5.6): panic safe/slow/right here · anger cool/clear/strong · anxiety steady/here/okay · overthinking clear/quiet/done · overwhelm space/one thing/enough · sad lighter/warm/held · lonely seen/connected/not alone · shame kind/human/enough · fear brave/closer/smaller · jealous my glow/my path/grateful · numb awake/colour/alive · good savoured/kept/mine. |
| `grade` | the colour script loud pair → calm pair per emotion (anger red-orange → teal, panic storm-violet → dawn gold, sad slate → peach, numb grey → full colour…). Used by `EosMoodGrade`, the share card and the Still Point hue. `eosGrade(id)`. |
| `dialQ`, `dialWords`, `eosDialQuestion(id, "before"\|"after")`, `eosDialWord(id, n)`, `EOS_DIAL_ANCHOR` | low-arousal states get their own question and 5 words over 0-10: sad "How heavy is it?" light…crushing · lonely "How alone does it feel?" connected…completely alone · numb "How far away do you feel?" right here…totally blank · good "How good is it?" meh…glowing. Others: "How loud is RUSH right now?" / after: "How loud is RUSH (anger) now?" + the loudness words. NOT SURE: "How big does it feel?". |
| `EOS_GUIDE_CHAR` | STILL, the narrator and the centre **NOT SURE** orb (`id:"auto"`). |
| `EOS_CHAR_NAMES` | `sync rush glitch loopie drop patch still` → display names. |
| `EOS_WIN_FACES`, `eosFacePool(char, "negative"\|"positive"\|"win")` | `win` = arcade positive ∪ the curated `win` faces of `thinkstill_750_expression_map.json` = **102 faces** (was 39; every id verified HTTP 200). |
| `EOS_LEXICON`, `eosDetectEmotion(text)` | score-based detection with stems. v1.2 adds sensations and everyday words (§7.4: "tension", "shaking", "punch", "hopeless", "ghosted", "broke up", "insecure", "can't sleep", "burden", "stuck"…; "everyone hates me" → lonely, "I hate myself" → shame, "I hate my life" → sad). Returns `{id, score, intensity}`; `intensity = max(guess, dial − 1)` unless the text softens itself ("a bit", "kinda"). Pure. |
| `eosGuessIntensity(text)` (3-9), `eosBand(n)` → `"high"` (7-10) / `"mid"` (4-6) / `"low"` (0-3). |
| `EOS_SAFETY_LEX`, `EosSafetyScan(text)`, `eosRealThreat(text)`, `eosSafetyStrong(type)`, `eosTextSafety(text)`, `EOS_TEXT_SAFETY`, `EosFlagSafety(type)`, `EOS_NEUTRAL_WORDS` | the safety lexicon lives in **core** so every caller scans synchronously (§10.1). `EosSafetyScan` → `null \| "selfharm" \| "abuse" \| "threat" \| "soft"`; strong = selfharm/abuse/threat. `EosFlagSafety` raises the store flag with precedence selfharm > abuse > threat > soft and never downgrades. `eosTextSafety` = scan + remember the flag type (never text) for `EosMarkLaunch`. |
| `EOS_DISCHARGE_IDS`, `EOS_SLOW_IDS` | discharge games `{2,3,4,5,6,13,15,18,61,68,100,101}` (anger after these always gets the cool-down); breath/slow games `{111,112,109,65,66,69,80,36,44}` (never followed by a Still Moment). Shared by router, shift, companion, rewards. |
| `EOS_COPY_RULES`, `EOS_DISCLAIMER` | banned clinical words, invalidating phrases and medical claims as data (lint in review and tests). `EOS_DISCLAIMER` = "ThinkStill is a playful tool for everyday feelings — not therapy, diagnosis or a crisis service." — exempt from the banned-word list, and so is the safety card copy. |
| `EOS_KEYS` | localStorage keys `eos_sessions_v1, eos_orbs_v1, eos_days_v1, eos_learned_v1, eos_bonds_v1, eos_prefs_v1`. |
| `EOS_PREF_DEFAULTS`, `eosPrefs()` (cached in memory), `eosSetPref(k, v)` | `shareWords:false, enrich:true, keepHistory:true, calmVisuals:false, dust:"default", namedOnce, metOnce, micNoted, coldOpen, speak:false`. |
| `EOS_PROP_DEFAULTS` | defaults for the new Framer controls (§10.3); support lines now include **Canada · 988**. |
| `EOS_BREATH` | one set of breath numbers for everyone: core 4 s in / 6 s out · Still Moment sigh 1.6 s in + 0.5 s sip + 4.4 s out (≈ 6.5 s, ratio 2.1) · 111 inhale 2.0 s + sip 0.6 s, exhale 4.5 → 5.5 → 6 → 6 s · spark states beat 72 bpm. Every exhale drain is **linear**. |
| `EOS_HAPTIC`, `eosHaptic(pattern)`, `eosHeartbeat(fromBpm=60, toBpm=52, ms, onBeat)` | `heart` = 60 bpm (`[12,140,12,836]`), `exhale` = a ~3.2 s decaying train, `notch` = 8 ms tick. `eosHeartbeat` slows from → to and calls `onBeat` on every beat even with haptics off (drive the **visual twin** from it — iOS has no vibration). Never a heartbeat in the panic game. |

### 0.3 Store and session lifecycle
`EOS_STORE` = `{get, set(patch), resetFeeling(), subscribe}`; `useEosStore()` = React 18 `useSyncExternalStore` (the one name without the `Eos/EOS_/eos` prefix: React hooks must start with `use`). **Never call `EOS_STORE.set` during render.** Shape (see `EOS_STORE_INITIAL`): `phase ("checkin"|"skip"|"play"|"meter"), emotion, before, after, express, source, detected, intensityGuess, launchAt, finishAt, gameId, act, path, recordedFor, lastShift, flipKey, safety, safetyDismissed ({type:true}), loops, skipSticky, checkinEnabled, sound, haptics, music, calmVisuals, crisisLines, crisisUrl, emergencyText, shareUrl`.

| transition | called by | effect |
|---|---|---|
| `EosCommitCheckin({emotion, before, express})` | check-in GO / express orb / good-day chip / "pick a game myself" | sets `emotion` (null = NOT SURE), `before` 0-10 (null for express), `express` |
| `EosSkipCheckin()` / `EosOpenCheckin()` | "just let me play" / the check-in chip | `phase` skip (sticky) / checkin |
| `EosMarkLaunch(game, entries)` | I2 edits in `startChosenGame` + `replay` | **raises the safety flag synchronously** (`EosSafetyScan(entries) \|\| EOS_TEXT_SAFETY.last`); `phase:"play"`, `launchAt`, `gameId`, act/path (follow-up ⇒ act+1 and `before = previous after`), detection when no check-in, `flipKey` from `eosApi("flip").match?.()` |
| `EosMarkFinish(game, bonus)` | I2 edit in `done()` | `phase:"meter"`, `finishAt`; +1 `eos_learned_v1[id]`; marks today in `eos_days_v1` |
| `EosRecordShift(after \| null, {before, retro})` | shift meter | writes ONE history row per launch (idempotent; nothing written when `keepHistory` is off); a `before` supplied in the reveal ⇒ `retro: 1` (recall-biased, excluded from learning); returns `{t, emo, before, after, gameId, ms, act, retro, delta}` (`delta` > 0 = relief; `after − before` for `better:"up"`) |
| `EosResetFeeling()` | I2 edit in `clearForNext` | fresh feeling; keeps session facts (incl. safety + dismissals); phase → checkin (or skip when sticky / disabled) |
| `EosConfigSync(props)` | I1 edit in `99_pixar.jsx` | property controls → store in a **layout** effect (a disabled check-in never paints); masks the composer for session-replay tools |
| `eosCalm(reduced)` | every EOS component (after `useEosStore()`) | `reduced` OR the in-app calm-visuals toggle |

### 0.4 Games, arrows, pacer, helpers, shared UI
| name | what |
|---|---|
| `eosRegisterGame(def, Engine, {hint, mindBend, css, gesture, char, seconds})` | pushes the GAMES entry, maps `EOS_ENGINES[id]`, records `EOS_GAME_META[id] = {gesture, char, seconds}` (LIVE GUIDE glyph + verb, companion de-duplication, CTA "≈30 s"), sets `SHORT_ACTION/SHORT_HINT[id]` and `RELEASE_MIND_BEND[id]`, registers CSS. `EosEngineFor(game)` is what the I1 router edit calls. |
| `eosTarget({g, dir, d, n, ms, to, bpm, label, win, meter, mvar, armed, maxSpeed, own, ox, oy})` | spread onto the element the player must touch **now** (for `choose`: onto **every** option) → `data-eos-target="1" data-eos-g=… data-eos-label=… data-eos-win="55,92" data-eos-max-speed=… data-eos-own="1"…`. The arrow overlay reads it before any table. |
| `eosWords(entries, n)`, `EosWord` | unique readable chunks (pads with the emotion's `seeds`; **`EOS_NEUTRAL_WORDS` under a strong safety flag**), and the ≥16 px word style. `EosWord` is the **only** place user words may appear in EOS DOM. |
| `eosFace`, `eosFaceFor`, `eosFacePool`, `eosHue`, `eosGrade`, `eosCurrentEmotion()`, `eosMeterWord()` | character art (the arcade's own 7-character cast; no new art); `eosMeterWord` = the emotion's meter word ("SLOW-DOWN") or "SHIFT" (legacy HUD, I1-E13). |
| `eosRelRect(el, root)`, `eosStageScale(el)`, `eosProgressOf(root)` | geometry corrected for the Framer canvas scale; progress 0-100 from `.engineProgressTrack[aria-valuenow]` (both wrappers). |
| `eosTone(freq, ms, opts)`, `eosNote(i)` | musical feedback gated by the arcade's sound toggle (mirrored by I1-E14). |
| `EOS_PACER`, `eosBreathOwn(phase \| null, ms)`, `eosBreathPhase()`, `eosPacerBeat(bpm \| 0)` | **one breath pacer for the whole screen.** A game / Still Moment that paces breath calls `eosBreathOwn("in"\|"hold"\|"out", ms)` at each phase change and `eosBreathOwn(null)` when done; a beat game calls `eosPacerBeat(bpm)`. Everything else that shows a rhythm (the Still Point, the arrows' wait ring, 112's rain, the audio bed) **reads** `eosBreathPhase()` → `{phase, p, owned, bpm, ms}`, so two pacers are never out of phase. The autonomous cycle is a fixed 10 s clock on `performance.now()`. |
| `EosCharacterOrb` | glossy Pixar bubble with a character face (+ label/sub, `showName` 12 px name tag). `<button>` when `onClick` is given. Plain DOM: framer-motion props are **dropped** — wrap it in `motion.div` to animate it. `.eosObj` ⇒ Pixar squash (I1 adds it to `PX_SQUASH_TARGETS`); never on an element whose `scale`/animation carries game state (squash replaces the animation for 700 ms) — wrap that element instead. |
| `EosIntensityDial` | 0/1-10 scrub track, `role="slider"`, keyboard (arrows, Home/End, digits with a 700 ms "1"+"0" = 10 buffer), `ghost` marker (= before), haptic tick + rising pitch, the emotion's question + words (`label`/`words` override), `value=null` shows "–" (the after-dial **starts empty**), re-syncs when the parent resets the value. Segment numbers use dark ink on lit segments (11.8:1). |
| `EosEnginePreview({id, text, reduced})` | dev only, **quick iteration only** (no arcade CSS, guide panel, step rewards or word tagging — never an acceptance surface). Publishes `window.__eosPreview = {progress, label, done, sfx:[{kind, t}], progressLog}`. Foundation wraps it in `dev/eos_preview.*`. |
| CSS tokens | `--eos-fs-xs 12 · --eos-fs-sm 13 · --eos-fs-md 15 · --eos-fs-num 17 · --eos-fs-word clamp(16px,1.35vw,20px) · --eos-fs-hero clamp(30px,4vw,48px)` (phone ≤560: 12 / 12 / 14 / 15 / 15), gold `--eos-gold-1..3`, `--eos-still`, `--eos-ink`, `--eos-glass`, `--eos-font` ("Baloo 2"). |
| CSS rules | `.eosSrOnly` (visually hidden, for live regions) · 44×44 px minimum for every `button, a, [role=button]` inside `.eosCheckIn, .eosShiftMeter, .eosStillMoment, .eosSafetyCard, .eosSupportPill, .eosOrbShelf, .eosWorldChips, .eosCheckInChip` · **arena reset** `.cinematicContentShell>.arena.eosArena{position:absolute; inset:0; padding:0; min-height:0}` (the arcade forces `relative` + 18/158 px padding on `.arena`) · safe-area variables on `.eosArena`: `--eos-safe-top` 48 px (phone 104) and `--eos-safe-bottom` 200 px (phone 164) — the LIVE GUIDE covers the bottom-left 460×182 px at 1280 and the full-width bottom 150 px at 390, the HUD the top · dimmed orbs dim only the ball (labels stay readable) · `[data-eos-calm="1"]` stops the orb bob. Note: the arcade's `.tsArcade.stage-play .arena{filter:…}` stays, so `.arena` is the containing block for any `position:fixed` child. |

### 0.5 Foundation additions (core v1.2.1) and the test tooling — read before building
| name | what |
|---|---|
| **clean button shells** | The arcade skins **every** `.cinematicContentShell > .arena button` with `!important` (neon gradient background, cyan border, glow, text-shadow) and `.tsArcade.stage-play button` adds a 180 ms `transform`/`box-shadow` transition that makes framer-motion transforms lag. Core resets all of it inside `.eosArena` with `${EOS_A} :where(.eosArena button){background:none!important;border:0!important;box-shadow:none!important;color:inherit!important;text-shadow:none!important;transition:none!important;…}` + a gold `:focus-visible` ring. Its specificity is only the ID-boosted root, so **any** game rule `${EOS_A} .eosG<id> …{…!important}` beats it. React inline styles can never beat an `!important` rule: draw a button's visuals on a child `span`/`div` (inline styles work there) or in your CSS string with `!important`. Plain `div`s are not skinned. |
| `EosCharacterOrb` hooks | renders `data-eos-emotion="<id>"` (NOT SURE = `"auto"`) and `data-eos-char="<char>"` — the check-in's test hooks (`eos_drive.runCheckin`) and handy CSS hooks. |
| `useEosProgress(rootRef, hz = 4)` | 0-100 \| null — the one shared, self-cleaning progress poll for overlays (reads the closest `.releaseStage`; re-renders only on change). Use it instead of a private interval (mood, companion, dots, arrows …). |
| `eosDayPart(d?)`, `eosLateNight(d?)` | one local-time rule: `"dawn"` 5-10 · `"day"` 10-17 · `"dusk"` 17-21 · `"night"` 21-5 (§8.0 replay palettes); late night = 23:00-05:00 (§5.6 R8, §7.3). |
| `eosRegisterGame` checks | in dev, `console.warn("[eos] …")` (never `console.error`) for missing / empty GAMES fields, a duplicate id or name, an unknown `gesture`, an id < 111. `EOS_GAME_FIELDS`, `EOS_GESTURE_NAMES` list them. |
| `EosEnginePreview({id, text, reduced, seed})` | now checks the §8.0 engine contract live: `window.__eosPreview.checks = {thirdArg, backwards, flat, outOfRange, afterDone, afterUnmount, doneCalls, nonSoft, longLabels, firstProgressMs, doneDelayMs}` plus `log:[{t, v, label}]` and `rain:[…]`; violations show as a red strip. |
| `window.__eos.core` (dev only) | also exposes `EosOpenCheckin`, `EosSkipCheckin`, `EOS_STORE_INITIAL`, `EOS_LEXICON`, `EOS_TEXT_SAFETY`, `EOS_DISCHARGE_IDS`, `EOS_SLOW_IDS`, `EOS_PROP_DEFAULTS`, `EOS_PREF_DEFAULTS`, `EOS_PACER`, `eosGet/eosSet`, `eosLearnedCount`, `eosTarget`, `eosProgressOf`, `eosRelRect`, `eosSafetyStrong`, `eosTextSafety`, `eosCalm`, `EosEngineFor`, `apis()` … |

**Test tooling (task `foundation`, usage at the top of each file):**
- `dev/eos_drive.mjs` — `launchEos` (`lite` hides decoration-only layers for gameplay sweeps; `storage` pre-seeds localStorage; `errors` / `warnings` / `noise` split), `listGames` (de-duplicated, `withIds`), `startGameById` / `startGameByName` / `resetToInput` / `currentGameId`, `openCheckin`, `runCheckin({emotion, intensity|dial, words, express, go, pickMyself})`, `finishGame(page, [id], {timeoutMs, stuckMs, perStage, assertArrows, alt})` (all 17 gestures; `EOS_GESTURES` from the arrows module when present, else the §3.11 copy; markers for 111+, where "no marker" means an automatic phase; per-stage arrow check → `arrowMisses` / `labelMismatches`), `readProgress`, `progressLog` / `stageLog` / `pointerLog` (an in-page recorder installed before any script), `smallText(minPx)` (+ `readability.scan()`), `textSizes`, `noShrink(page, baselineDir, setup)`, `arrowState`, `lintCopy`, `flashCheck` (+ `reliable`), `dotsNearCentre`, `pixelVisible`, `loadCoreNode` (core + modules in node with arcade stubs — the §12.3 unit method, used by `flipdata`), `specGestures`, `arcadeCss()` / `arcadeCssRules(re)` (the arcade's base CSS lives in the gzipped `CSS_GZIP_B64` blob and is **not** greppable in the source — use these to find the rule an override must beat). CLI: `node dev/eos_drive.mjs smoke | finish | sweep | small | lint | css --grep …`.
- `dev/eos_preview.py --id 111 [--modules …] [--files /tmp/draft.jsx] [--check | --finish] [--shots dir]` → `/tmp/eos_preview_<id>/index.html?id=&text=&reduced=1&seed=&emotion=&before=&safety=&calm=1&guides=1` (`guides=1` draws the arcade's HUD / LIVE GUIDE no-go zones).
- **Headless speed:** this UI rasterises in software at ~3-4 fps at 1280×860 (~9 fps at 390×844) here — independent of EOS (measured with and without core) — and every pointer event waits for a frame. Interaction scripts therefore use few, long pointer moves; flash checks need ≥ 8 captured fps (`flashCheck(...).reliable`, run them at 390×844).

**Foundation sweep (full build, core only, `finishGame` + the §3.11 table as corrected below, lite mode):** 1280×860 → **101 / 110** reach the reveal, 390×844 → **98 / 110** (whole-catalogue sweeps plus targeted re-runs; 24 SLINGSHOT is timing-flaky in headless — it passes on most runs and is counted as a failure here). Every remaining failure is a **real game bug**, each verified by a probe — they belong to task `fixes` (§11.6 / §11.8), and `finishGame` doubles as their regression test:

| id | where | evidence (probe) | suggested fix |
|---|---|---|---|
| 8 METEOR · 17 BOSS BATTLE · 48 UNSTICK | both | known (§11.6): `.orbitArc` / `.uniqWord` cover the targets, `.stickerWord` collapses | §11.6 rules |
| 14 CRUMPLE | both | gz CSS `.paperCrumple.s1/.s2{clip-path:polygon(…)}` clips the corner buttons (they sit at −12 px outside the paper): at step 2 `elementFromPoint` on corner `.c2` returns the arena — the 3rd corner can never be tapped | `${EOS_A} .arena .paperCrumple:is(.s1,.s2){clip-path:none!important}` + a skew / border-radius crumple look |
| 21 BIN | both | gz CSS `.freeAngleBinArena .binBubbleSlot .binWordBubble{transform:none!important}` cancels framer-motion's drag transform: the dragged bubble never moves, so no drop ever lands in the mouth (only a double-click bins it) | a guard: on `pointerup` after a drag that started on a `.binWordBubble`, if the pointer is inside the `.binMouthTarget` rect (+ the I3-E4 margins) dispatch `dblclick` on that bubble (`binOne(i, true)`); and mirror the inline transform into a custom property during the drag so it is visible (`transform:var(--eos-bin-t,none)!important`) |
| 51 MIRROR FLIP | both | at step 1 `.mirrorStage.a1` overlaps the ABOVE button (`elementFromPoint` at its centre = the stage) | `${EOS_A} .arena .mirrorStage{pointer-events:none!important}` (decorative) |
| 77 SLOW MOTION | both | after the first pull the brake stays at `translateY(150px)`, outside its clipped `.filmGate` → unhittable: word 2 can never be braked | `${EOS_A} .arena.u77 .filmGate{overflow:visible!important}` or an I3 source edit adding `dragSnapToOrigin` to `.brakeHandle` |
| 109 CLEANSE | both (cadence) | race: each release schedules `setReleasedIndices(next)` after **3200 ms** but the last one after 170 ms, so releasing the last two bubbles < 3.2 s apart lands the stale 5-item array after the 6-item one → length 6 → 5 clears the `onDone` timer while `finishLock` stays set → the game sits at 100 % forever. **Fast, panicking players hit it; 109 is panic.high #2.** | I3 source edit in `CleanseEngine.finishHold`: `setReleasedIndices(releasedRef.current.slice())` (or a functional update that never shrinks) |
| 45 MAGNETS | 390 | after a pull the orb stays at `translateX(220px)` → x 439 > the 375 px stage: off-screen, the next word cannot be pulled | `dragSnapToOrigin` (I3) or narrower phone constraints |
| 47 UNFOLLOW | 390 | the `.plug` centre is covered by `.uniqWord` | add `:has(.plug)` to the §11.6 `.uniqWord{pointer-events:none}` rule |
| 71 DEFUSE | 390 | the third zone's button is clipped (`elementFromPoint` = the arena) | phone layout fit |
| 103 SINKING PLATFORM | 390 | `button.spDropButton` renders at y ≈ 1059, below the 844 px viewport | phone layout fit |
| 107 GO WEIRD | 390 | props clipped by `.gwGame` (§11.6) | §11.6 grid fit, verify at 390 |

**§3.11 table corrections made by the sweep** (stale selectors that pointed the arrow at finished or wrong elements): 43 `button.cutLoopWord:not(:disabled)` (the slot stays usable after its word is severed) · 82 SEESAW by beam angle (`rotate(-…)` → SHIFT IT →, `rotate(0deg)` → CHECK BALANCE; a "choose" arrow never taught the balance) · 93 `.spaceTile:not(.moved)` · 95 `.shelfThoughtBubble:not(.shelved)` · 102 drag **r from the left end** (`ox −0.4`: the row's own rule is "press either end and slide toward the centre"; "in" from the arena centre pushed down) · 104 the first knob with `aria-valuenow` > 12 · 108 `.saladBowl button:not(.restored)` (a tap swaps a card into its home cell); §3.4's dead-state regex also gains `shelved|severed|erased|moved|restored`.

---------------------------------------------------------------------------------------------------

### 6.4 Emotion-aware router hand-off (anchors all verified unique; edits in §12.2)
| what | anchor (exact) | change |
|---|---|---|
| store subscription + sound / haptics / music mirror | `    const [releaseCheck, setReleaseCheck] = React.useState(null)` | **I1-E14**: append `const eos = useEosStore()` and an effect mirroring `sound`/`hapticsOn`/`musicOn && sound` into `EOS_STORE` (lands with the new-game routing so `eosTone` respects the sound toggle) |
| check-in, chip, world chips, safety | `                    {stage === "input" && !selected ? (` | I2-E2: insert the overlay block before it (`EosCheckIn` gets `onPlay={startChosenGame}`) |
| auto choice | `        const best = chooseRelevantGame(sourceThought)` | `EosRouteGame(sourceThought, played) \|\| chooseRelevantGame(sourceThought)` |
| "ANOTHER / TRY" recommendation | `        return chooseRelevantGame(sourceThought, selected.id, selected)` | `EosRouteGame(sourceThought, played, selected.id) \|\| …` |
| launch | `            setVariationSeed((v) => v + 1)` + `\n            setStage("play")` | insert `EosMarkLaunch(g, e)` between (raises the safety flag synchronously) |
| replay | `        setVariationSeed((v) => v + 101)` + `\n        setStage("play")` | insert `EosMarkLaunch(selected, entries)` between |
| finish | `            setReleaseCheck(null)` + `\n            setStage("reveal")` | insert `EosMarkFinish(selected, bonus)` before |
| reset | `    const clearForNext = React.useCallback(() => {` | append `EosResetFeeling()` |
| copy follows the feeling | `function releaseEmotionProfile(input) {` | append the `EosProfileOverride(input)` early return |
| no "I / am / I" rounds, crisis words off the games | `function cleanEntries(raw) {` | append the `EosEntries(raw)` early return |
| reveal meter | `                                    <div className="releaseShiftCheck">` | insert `<EosShiftMeter …/>` before |
| menu group | `                                <div className="releaseChoiceGroupLabel">` + `\n                                    15 SIGNATURE RELEASES` | insert `<EosMenuGroup …/>` before |
Words reach the game exactly as today (`raw` → `cleanEntries` → `entries` → engine; `EosEntries` swaps in neutral words under a strong safety flag); the emotion reaches it through `EOS_STORE` (router, profile override, companion, mood, new engines via `eosCurrentEmotion()`); the game reaches the arcade as a `GAMES` object through the unchanged `startChosenGame`.


## 7. Routing (`src/eos/45_eos_router.jsx`, task `router`)

### 7.1 Principle
"Bottom-up when hot, top-down when warm" (emotion-regulation choice: at high intensity attentional and physiological strategies beat reappraisal). Bands from the check-in dial (`eosBand`): **high 7-10 → body first** (breath, grounding, cool-down, acceptance — never a pure smash game first), **mid 4-6 → the signature mechanic** for that emotion, **low 0-3 → meaning and humour**. Express launches (PANIC tap, long-press) use the high band. Destruction games are never routed for sad, lonely or shame at high intensity, nor while any safety flag is on. Shame is never routed to concealment (erase / crumple / burn teaches "hide it"); fear is never routed to a looming exposure at its peak; panic is never routed to bomb imagery. Numb gets up-regulation, GOOD gets savouring (never sadness copy).

### 7.2 `EOS_EMOTION_ROUTES` (paste-ready; ids best-first; 111-120 are the new games of §8; validated by script: no vault / bench id is routed, every id 1-120 is classified, §7.6)
```js
const EOS_EMOTION_ROUTES = {
    panic:        { high: [111, 109, 102, 36, 65, 69, 66], mid: [111, 102, 36, 44, 77, 113, 65, 55, 11],     low: [105, 55, 104, 1, 113] },
    anxiety:      { high: [111, 113, 102, 109, 66],  mid: [113, 95, 32, 101, 24, 34, 31, 85, 67],      low: [1, 104, 86, 30, 105, 72] },
    anger:        { high: [112, 109, 65, 111, 100],  mid: [112, 100, 4, 15, 2, 18, 61, 68, 101, 8, 13, 14], low: [52, 107, 71, 64, 11, 37, 53] },
    overthinking: { high: [111, 61, 116, 34],        mid: [116, 34, 61, 104, 43, 41, 22, 29, 99, 19],  low: [105, 107, 52, 104, 59, 98] },
    overwhelm:    { high: [111, 120, 93, 21],        mid: [120, 93, 95, 21, 87, 32, 30, 28],           low: [120, 85, 30, 39, 81] },
    sad:          { high: [110, 114, 109],           mid: [110, 114, 33, 40, 75, 106],                 low: [106, 88, 117, 114] },
    lonely:       { high: [114, 110, 115],           mid: [114, 106, 88, 115, 110, 117],               low: [117, 106, 114, 115, 88] },
    shame:        { high: [115, 109, 110],           mid: [115, 104, 84, 110, 109, 79],                low: [107, 53, 79, 51] },
    fear:         { high: [111, 102, 113],           mid: [118, 31, 97, 53, 86, 89],                   low: [107, 105, 53] },
    jealous:      { high: [119, 115, 47],            mid: [119, 47, 45, 25, 115],                      low: [119, 88, 117] },
    numb:         { high: [117, 68, 1, 100, 74],     mid: [117, 68, 1, 106, 107, 25, 100, 74],         low: [117, 106, 107, 25, 1] },
    good:         { high: [117, 119, 106, 88],       mid: [117, 119, 106, 88, 1, 25, 105, 107],        low: [119, 117, 106, 88, 53, 107] },
    general:      { high: [111, 1, 102, 109],        mid: [1, 102, 100, 110, 25, 93],                  low: [1, 105, 107, 25] },
}
// Conditions: an id is eligible only if its rule passes on the user's text.
const EOS_ROUTE_RULES = {
    89: (text) => /\b(or|vs\.?|versus)\b/i.test(String(text || "")), //       DOOR A / B needs a choice
    118: (text) => !eosRealThreat(text), 105: (text) => !eosRealThreat(text), 53: (text) => !eosRealThreat(text), // no jokes about a real danger
}
// Never auto-routed (still in the menu, playable, untouched): fake, passive, hidden or anti-relief mechanics.
const EOS_VAULT = new Set([5, 9, 10, 12, 17, 23, 35, 38, 42, 50, 54, 56, 57, 62, 63, 73, 76, 78, 80, 82, 83, 90, 91, 92, 94, 96, 108])
// Never auto-routed either: fine games that a better routed game covers (reasons in §7.6). Menu, arrows and fixes still apply.
const EOS_BENCH = new Set([3, 6, 7, 16, 20, 26, 27, 46, 48, 49, 58, 60, 70, 103])
// While ANY safety flag is set only these are routed (calm, never destructive, never repeats words, no cutting / beat imagery).
const EOS_GENTLE_IDS = [113, 111, 109, 110, 102, 95, 114, 115, 106, 40, 120, 119]
// Act 2 ("ONE MORE ▶") per emotion, best-first (same filters as EosRouteGame).
const EOS_SECOND_ACT = {
    panic: [111, 109, 102], anxiety: [113, 111, 102], anger: [112, 109, 65], overthinking: [113, 116, 111],
    overwhelm: [120, 93, 111], sad: [114, 106, 110], lonely: [114, 106, 117], shame: [115, 109, 110],
    fear: [118, 111, 102], jealous: [119, 115, 117], numb: [117, 68, 106], good: [119, 117, 106], general: [111, 1, 110],
}
// Late night (23:00-05:00 local): loud / bright games are demoted; 117 is dropped unless the feeling is numb.
const EOS_LOUD_IDS = new Set([117, 68, 2, 4, 6, 15])
// Typical seconds for the CTA sub-line (new games register theirs via eosRegisterGame opts.seconds).
const EOS_GAME_SECONDS = { 1: 15, 2: 20, 4: 18, 15: 20, 18: 15, 25: 15, 36: 25, 65: 20, 93: 25, 95: 20, 100: 25, 102: 25, 109: 30, 110: 25 }
```
`EOS_DISCHARGE_IDS` and `EOS_SLOW_IDS` live in **core** now (shared by router, shift, companion and rewards). Ids that do not exist in `GAMES` (e.g. a new game whose module is missing) are skipped automatically, so routes never break.

### 7.3 Exports and algorithms (all **pure**: they run inside callbacks and in a `useMemo` at render — no store writes; `eosTextSafety` only records the flag type in core's `EOS_TEXT_SAFETY`)
- `EosRouteGame(text, played = [], excludeId = null)` → `GAMES` object or `null`:
  1. `st = EOS_STORE.get()`; **`flag` = the stronger of `st.safety` and `eosTextSafety(text)`** (synchronous: "i want to die" + Enter within 100 ms is already gentle); `emo = st.emotion`; if none, `d = eosDetectEmotion(text)` → `emo = d?.id`; `lvl = st.express ? 10 : st.before ?? d?.intensity ?? st.intensityGuess ?? EOS_EMO[emo]?.dial ?? 5`.
  2. No emotion: if `flag` → `general` with the gentle filter (a crisis phrase with no detected emotion must never fall through to the arcade's own chooser); else if `st.before != null || st.express` (NOT SURE check-in) → `general`; else return `null` (the arcade's own relevance chooser handles free text, unchanged).
  3. Candidate list = band list, then the other two bands (dedupe). Filter: exists, `!== excludeId`, not in `EOS_VAULT` / `EOS_BENCH`, passes `EOS_ROUTE_RULES` (with the text), any `flag` ⇒ `EOS_GENTLE_IDS` only (falls back to the gentle list itself if the filter empties it); late night ⇒ drop 117 unless `emo === "numb"`.
  4. Score = `1 − rank×0.1 − (in st.path ? 1 : 0) − recency + clamp(0.05 × personalDelta(emo, id), −0.15, +0.15) − (late night && EOS_LOUD_IDS.has(id) ? 0.2 : 0)`, where **recency = 0 in the high band** (reliability beats novelty: a regular angry user keeps getting 112) and otherwise `(in the last 3 eos_sessions ids ? 0.4 : 0) + (in played.slice(-6) ? 0.15 : 0)`. `personalDelta` = mean `delta` of that emotion + game over ≥ 2 **non-retro** rows with a rating (else 0).
  5. High band → the top score. Mid/low → deterministic variety: if `eosNoise(st.sessionSeed + st.loops, id) < .2` take #2.
- `EosSecondAct(emotion, lastId, delta)` → `GAMES` object or `null`, through the same filters (vault, bench, rules, safety): **anger after a `EOS_DISCHARGE_IDS` game (and not 112) → 112 whatever the delta** (under a safety flag: the first gentle id); `delta == null || delta < 2` → first `EOS_SECOND_ACT[emo]` id ≠ lastId; else the next `EosRouteGame` pick excluding `lastId`.
- `EosRoutePreview(emotion, before)` → `{id, name, seconds, best}` for the check-in CTA sub-line (same filters, no text; `seconds` from `EOS_GAME_META[id].seconds` or `EOS_GAME_SECONDS`, default 30; `best = personalDelta ≥ 2`).
- `EosMenuGroup({played, gameChoice, onPick})` → when an emotion is known: label `FOR YOUR {NOUN}` ("FOR YOUR ANGER") + top 4 routed games; otherwise label `NEW · RELIEF GAMES` + ids ≥ 111. Items use **the menu's own markup** (`button.releaseChoiceItem.eosMenuPick` → `img` + `span > b{name}`) so `startGame(page, NAME)` still matches with `.first()`; the label renders at 13 px (§4.3). (`listGames` will list these names twice — the Foundation's `eos_drive.listGames` de-duplicates.)
- `EosProfileOverride(input)` → arcade emotion profile or `null`: if a check-in emotion exists → `RELEASE_INPUT_EMOTION_PROFILES.find(p => p.id === EOS_EMO[emo].profile) || RELEASE_DEFAULT_EMOTION_PROFILE`; else if any original profile regex already matches the text → `null` (original behaviour); else `eosDetectEmotion(text)` → that emotion's `profile` (if not "general"). Memoised on `` `${st.emotion}|${st.safety}|${text}` `` (called many times per render; the key changes after a check-in or a new flag).
- `eosExpose("router", { EOS_EMOTION_ROUTES, EOS_VAULT, EOS_BENCH, EOS_GENTLE_IDS, EosRouteGame, EosSecondAct, EosRoutePreview })`.

### 7.4 Regex fixes (core `EOS_LEXICON`, run in node for this spec)
The arcade's first-match `\b(panic|panicky|…)\b` profiles miss inflections and everyday words. `eosDetectEmotion` (core, §0.2) fixes them with stems and scoring. Verified (51 phrases, all as listed): "i am panicking about tomorrow"→panic · "I raged at him"→anger · "feeling sadder than ever"→sad · "this is overwhelming"→overwhelm · "so scary"→fear · "annoyed and frustrated"→anger · "not good enough again"→shame · "i feel nothing, just empty"→numb · "what if it all goes wrong"→anxiety · "overthinking on replay"→overthinking · "lonely and left out"→lonely · "jealous, comparing myself"→jealous · "my boss yelled at me"→anger · "SO ANGRY!! I can't"→anger (9) · **v1.2:** "I have so much tension about my exam"→anxiety · "feeling tensed"→anxiety · "I can't stop shaking"→panic · "so dizzy and sweaty"→panic · "I want to punch something"→anger · "I want to scream"→anger · "feeling hopeless"→sad (+ soft safety) · "I got ghosted"→lonely · "we broke up"→sad · "feel so rejected"→lonely · "I feel insecure"→shame · "imposter syndrome at work"→shame · "can't sleep, mind racing"→anxiety · "I feel ugly"→shame · "I'm useless"→shame · **"everyone hates me"→lonely** (was anger) · "I feel like a burden"→shame (+ self-harm card) · "I feel stuck"→overwhelm · "restless"→anxiety · "I hate my boss"→anger · **"I hate myself"→shame** (was an anger tie) · **"I hate my life"→sad** (+ soft) · "my boss yelled at me and I feel panic"→panic, **intensity 7 → high band → BIG SIGH** (was 5 → FINGER TRAP) · "I'm a bit annoyed"→anger, intensity 3 · every emotion's own starter detects as that emotion · "this traffic is killing me" and "cut the loop" → nothing. `EosProfileOverride` (I2) routes those into the arcade's copy/spark naming, so "i am panicking" now shows CALM SPARKS / SLOW-DOWN instead of the general SHIFT SPARKS.

### 7.5 Acceptance (router)
Unit (in the harness via `window.__eos.router`): for every emotion × band the pick ∈ that band's list or the fallbacks; no vault or bench id is ever returned; with `EOS_STORE.safety` set **or** with flagged text and no store flag ("i want to die", no check-in), every pick ∈ `EOS_GENTLE_IDS`; `EosSecondAct("anger", 4, 5)` is 112; with 112 and 100 in `played` and the last 3 sessions, anger at 8 still routes 112; at 23:30 local, anger never gets 117 and numb still can; "I'm scared he'll follow me home" never routes 118, 105 or 53; 89 is only returned when the text contains "or"/"vs"; a game with retro-only rows has `personalDelta` 0 and no score moves more than 0.15 from history; `EosProfileOverride("i am panicking")` returns the arcade's `panic` profile and changes after a check-in to anger with the same text; no store writes (snapshot `EOS_STORE.get()` before/after).

### 7.6 Every game, one verdict (asks E11: "we went through all 110" — and the 10 new ones)
★ hero = first in at least one band list; route = in a list; bench = `EOS_BENCH` (playable, never auto-routed, reason given); vault = `EOS_VAULT` (fake, passive, hidden or anti-relief mechanic; playable from the menu). Generated from §7.2 and the catalogs; regenerate if §7.2 changes.

| id | name | verdict | routed in (emotion.band#rank) | why (catalog fit for routed; weakness for vault; reason for bench) |
|---|---|---|---|---|
| 1 | POP | ★ hero | panic.low#4, anxiety.low#1, numb.high#3, numb.mid#3, numb.low#5, good.mid#5, general.high#2, general.mid#1, general.low#1 | anxiety, overthinking, overwhelm - each tap is an instant micro-win that turns a swirling cluster into a finite, coun… |
| 2 | CRUSH | route | anger.mid#5 | anger, frustration - rapid repeated force discharges motor arousal |
| 3 | CRACK | bench | — | tool-first clone of 4 STOMP (which covers anger); arrows + hint fix make it playable |
| 4 | STOMP | route | anger.mid#3 | anger, frustration - a heavy-impact metaphor; flattening the word maps directly onto rage discharge |
| 5 | HAMMER | vault | — | **1** - tapStep(1) advances on any tap, so the timing mechanic is fake and the guide's "TIME THE HIT" is untrue; 6 id… |
| 6 | ZAP | bench | — | three taps clear all 5 bubbles — too little agency to be a routed relief |
| 7 | PIN POP | bench | — | x-axis-only drag and the promised inflation payoff is missing; 44/45/47/49 cover the gesture |
| 8 | METEOR | route | anger.mid#10 | stress, worry - flinging the thought into space creates psychological distance |
| 9 | LASER SLICE | vault | — | **2** - the guide says "SWIPE TO SLICE" but you tap (confirmed live); one word per bubble ("I 0/3", "am 0/3") |
| 10 | DOMINO DROP | vault | — | 2 - one tap, then 0.9s of watching ×6; the promised reveal of the trigger word is not implemented |
| 11 | PRESSURE POP | route | panic.mid#9, anger.low#5 | panic, anger, anxiety - hold-build then a timed release mimics a controlled exhale or "letting off steam"; it trains… |
| 12 | BOUNCE OUT | vault | — | 2 - the promised ball shrink is not implemented; the paddle is static; you tap a button, not the ball |
| 13 | SQUASH | route | anger.mid#11 | anger, stress - sustained press is isometric tension, and letting go is the release |
| 14 | CRUMPLE | route | anger.mid#12 | shame/guilt, regret - balling up a "bad draft" says you don't owe it preservation |
| 15 | SHRED | route | anger.mid#4 | anger, shame/guilt, stress - feeding evidence into blades is a destruction ritual with strong closure; rapid taps dis… |
| 16 | MELT | bench | — | arm + tap ×3 clone of CRACK / STOMP |
| 17 | BOSS BATTLE | vault | — | **1** - all 5 spots are identical cyan dots with no "live" cue; wrong taps are silently ignored; the word is barely v… |
| 18 | BURN | route | anger.mid#6 | anger, grief, shame/guilt - a ritual burn gives symbolic closure; holding builds anticipation, then catharsis |
| 19 | ERASE | route | overthinking.mid#10 | shame/guilt, regret - "a mark can be visible without being permanent" |
| 20 | GLITCH OUT | bench | — | abstract symbols; the syntax-scramble payoff is barely visible |
| 21 | BIN | route | overwhelm.high#4, overwhelm.mid#4 | overwhelm, stress - throwing things out physically clears mental clutter |
| 22 | FLUSH | route | overthinking.mid#7 | overthinking, rumination, disgust/shame - a swirl reverses the circling direction |
| 23 | VACUUM | vault | — | 2 - fully passive (tap, then a 1.3s auto-suck); the catalog's "hold/suck" agency is gone |
| 24 | SLINGSHOT | route | anxiety.mid#5 | anxiety, stress, worry - building tension and snapping it away mirrors tension-release physiology and creates distance |
| 25 | SWIPE AWAY | route | jealous.mid#4, numb.mid#6, numb.low#4, good.mid#6, general.mid#5, general.low#4 | intrusive thoughts, jealousy/comparison - a familiar "nope" gesture; a weak swipe springs back, so it rewards commitm… |
| 26 | SEND TO SPACE | bench | — | lever far from the rocket, no shrink-to-pixel payoff; 8/24/46 cover distance |
| 27 | DROP ZONE | bench | — | the ledge has no affordance; 21/34 cover discard |
| 28 | ARCHIVE | route | overwhelm.mid#8 | overwhelm, stress - de-prioritise without deleting |
| 29 | MUTE | route | overthinking.mid#8 | anxiety, overthinking (inner-critic volume) - "quiet is enough; gone is optional" |
| 30 | ZOOM OUT | route | anxiety.low#4, overwhelm.mid#7, overwhelm.low#3 | anxiety, overwhelm - cosmic perspective shift (the "overview effect") |
| 31 | BACK SEAT | route | anxiety.mid#7, fear.mid#2 | anxiety, fear - "present doesn't mean in charge" (ACT) |
| 32 | PARK IT | route | anxiety.mid#3, overwhelm.mid#6 | anxiety, worry - worry postponement (an evidence-based "worry time" technique) |
| 33 | FLOAT AWAY | route | sad.mid#3 | sadness, grief, letting go - a gentle, non-violent release |
| 34 | RIVER | route | anxiety.mid#6, overthinking.high#4, overthinking.mid#2 | anxiety, overthinking - "leaves on a stream", a classic defusion exercise |
| 35 | TRAIN PLATFORM | vault | — | 2 - no timing (the catalog promises "perfect timing"); one tap ×6 |
| 36 | CLOUD PASS | route | panic.high#4, panic.mid#3 | panic, anxiety - teaches that slowing down beats frantic effort; frantic swipes inflate the cloud |
| 37 | ELEVATOR DOWN | route | anger.low#6 | anger, stress - de-escalation on a 10-to-1 intensity scale |
| 38 | DRAWER | vault | — | 2 - three chores ×6 rounds |
| 39 | BLACK HOLE | route | overwhelm.low#4 | overwhelm, overthinking - a giant thought looks tiny next to a bigger frame |
| 40 | PAPER PLANE | route | sad.mid#4 | sadness, regret - "perfect control wasn't required for release" |
| 41 | UNHOOK | route | overthinking.mid#6 | overthinking, jealousy, attachment - visibly cutting strings means "attached ≠ permanent" |
| 42 | UNTANGLE | vault | — | **2** - all knots look identical and only one counts; the drag distance is meaningless |
| 43 | CUT THE LOOP | route | overthinking.mid#5 | overthinking, rumination - breaking the literal loop |
| 44 | VELCRO | route | panic.mid#4 | anxiety, "stuck" feelings - resistance peaks, then gives way |
| 45 | MAGNETS | route | jealous.mid#3 | jealousy, craving, compulsion - "pull is not obligation" |
| 46 | UNPIN | bench | — | no feedback during the drag; 26 covers it |
| 47 | UNFOLLOW | route | jealous.high#3, jealous.mid#2 | jealousy, comparison, loneliness-scrolling - cutting the feed's connection |
| 48 | UNSTICK | bench | — | the up-right diagonal still fails often after §11.6 |
| 49 | UNZIP | bench | — | the 'opens into keywords' payoff is not implemented; 7/44 cover it |
| 50 | UNFINISHED SENTENCE | vault | — | **1** - typing in a crisis; "and then?" prompts can amplify catastrophising; it never calls onProgress (bar stuck at… |
| 51 | MIRROR FLIP | route | shame.low#4 | shame, self-criticism - "same words, different place to stand" |
| 52 | SUBTITLES | ★ hero | anger.low#1, overthinking.low#3 | anger, anxiety - absurd tone exposes "tone masquerading as truth"; laughter breaks rumination |
| 53 | CARTOONIFY | route | anger.low#7, shame.low#2, fear.mid#4, fear.low#3, good.low#5 | fear, anger, shame - humour defusion (the villain squeaks and shrinks) |
| 54 | FONT CHECK | vault | — | 2 - no authority meter (as promised); the dial is a tiny corner widget |
| 55 | HEADLINE | route | panic.mid#8, panic.low#2 | panic, catastrophising - turning down the production while the words stay identical defuses alarm |
| 56 | COURTROOM | vault | — | 2 - the catalog promises user-made evidence cards and dragging; the game is one tap ×6 on single-word chunks (live: a… |
| 57 | CAMERA ANGLE | vault | — | 2 - you tap a pill, not the camera; the view0-2 change is subtle CSS; no "new empty space" payoff |
| 58 | MICROSCOPE | bench | — | corner-widget knob; 30/39/57 cover zoom-out |
| 59 | SPOTLIGHT | route | overthinking.low#5 | >110) |
| 60 | CROP TOOL | bench | — | 4 ordered taps posing as a drag |
| 61 | FREEZE | route | anger.mid#7, overthinking.high#2, overthinking.mid#3 | panic, anger, racing thoughts - freezing stops motion; the cold imagery maps to cooling down |
| 62 | NET IT | vault | — | **1** - any click on the net advances, with no collision check (confirmed live); the flying card cannot be "caught";… |
| 63 | PATTERN POP | vault | — | **1** - "predict" is fake because the answer is lit; a wrong tap silently resets to 0 |
| 64 | RED LIGHT | route | anger.low#4 | anger, impulsivity - a real wait-for-the-cue rule trains impulse delay |
| 65 | PAUSE BUTTON | route | panic.high#5, panic.mid#7, anger.high#3 | panic, anger - a sustained pause is the STOP skill in miniature |
| 66 | BUFFERING | route | panic.high#7, anxiety.high#5 | anxiety, urge-to-fix - not acting lets it finish |
| 67 | TAP OUT | route | anxiety.mid#9 | anxiety, panic - bilateral alternating taps (a "butterfly hug" rhythm) are grounding |
| 68 | DRUM IT | route | anger.mid#8, numb.high#2, numb.mid#2 | anger, frustration, numbness - high-energy percussion discharges arousal |
| 69 | PULSE | route | panic.high#6 | **panic**, anxiety - leading a slower tempo entrains slower breathing |
| 70 | METRONOME | bench | — | every-other-beat inhibition with no fail signal; 64/79 cover inhibition |
| 71 | DEFUSE | route | anger.low#3 | panic, anxiety - "disarm the alarm"; the 3 → 2 → 1 → SAFE countdown gives a felt down-shift |
| 72 | CATCH & LABEL | route | anxiety.low#6 | anxiety, overthinking - affect labelling ("name it to tame it") |
| 73 | TRAFFIC LIGHT | vault | — | 2 - one tap ×6; the "WAIT slows the vehicle" surprise is not implemented, and there is no lane |
| 74 | BUBBLE WRAP | route | numb.high#5, numb.mid#8 | anxiety, stress, frustration - bubble-wrap popping is a universal stim |
| 75 | INK BLEED | route | sad.mid#5 | sadness, shame, overthinking - live blur and letter-spacing loosen the sentence (defusion) |
| 76 | REVERSE IT | vault | — | 2 - the catalog says swipe; it is a pill ×4; the effect is a scaleX squash, not backwards glyphs |
| 77 | SLOW MOTION | route | panic.mid#5 | **panic**, racing thoughts - pulling the brake slows the moving phrase, mirroring slowing the mind |
| 78 | ONE WORD | vault | — | **1** - it splits the current chunk, which is usually one word, so the "choice" is a single tiny button (live: one "I… |
| 79 | MISS ON PURPOSE | route | shame.mid#6, shame.low#3 | perfectionism, shame, anxiety - deliberate imperfection |
| 80 | DON'T TAP | vault | — | 2 - 30s of watching a bar; the "needy button" comedy is not implemented |
| 81 | STACK IT | route | overwhelm.low#5 | overwhelm, stress - prioritising |
| 82 | SEESAW | vault | — | **1** - it starts fully tilted (meter 0) and needs ±5 precision, which contradicts the "good enough" hook; CHECK fail… |
| 83 | SORT STATION | vault | — | 2 - one tap ×6; the tube-travel animation is not implemented |
| 84 | MINE / NOT MINE | route | shame.mid#3 | >115) |
| 85 | CONTROL PANEL | route | anxiety.mid#8, overwhelm.low#2 | anxiety, overwhelm - turning a worry into a next action |
| 86 | FACT / STORY | route | anxiety.low#3, fear.mid#5 | anxiety, overthinking - fact versus story |
| 87 | KEEP / DROP | route | overwhelm.mid#5 | >112) |
| 88 | TRADE MACHINE | route | sad.low#2, lonely.mid#3, lonely.low#5, jealous.low#2, good.high#4, good.mid#4, good.low#4 | sadness, jealousy, stress - attention as currency; ends on something wanted |
| 89 | DOOR A / B | route | fear.mid#6 | fear, decision anxiety - previewing both options ("information, not destiny") |
| 90 | COIN FLIP REACTION | vault | — | 2 - there is no reaction step, despite the guide; six identical passive flips |
| 91 | PRIORITY BLOCKS | vault | — | 2 - the drop location is ignored and any wiggle counts; slots fill in drag order; the overflow tray is not implemented |
| 92 | SCALE DOWN | vault | — | 2 - you tap a number 6 times for the same thought; there is no "one step lower" test and no before/after. It is still… |
| 93 | SPACE MAKER | route | overwhelm.high#3, overwhelm.mid#2, general.mid#6 | **overwhelm**, anxiety - pushing thoughts outward opens literal empty space around NOW |
| 94 | JUGGLE | vault | — | 2 - no juggling; "release the others" is only a dim; with negative input you end up keeping one of your own negative… |
| 95 | SHELF IT | route | anxiety.mid#2, overwhelm.mid#3 | anxiety, worry, overwhelm - gentle containment ("visible but not held") without destroying anything |
| 96 | SCRATCH REVEAL | vault | — | **1** - anti-relief: it reveals the negative word 6 times; the fact chips are not implemented; scratches do nothing u… |
| 97 | X-RAY | route | fear.mid#3 | overthinking, fear - inspect, then incinerate |
| 98 | MAGIC TRAPDOOR | route | overthinking.low#6 | catastrophising, overthinking - isolating the most "certain" word |
| 99 | THE ECHO CHAMBER | route | overthinking.mid#9 | rumination - holding quiets each echo |
| 100 | HOT POTATO | route | anger.high#5, anger.mid#2, numb.high#4, numb.mid#7, general.mid#3 | **anger**, stress, frustration - "too hot to hold": each thought cools from red to blue and swaps to a positive face |
| 101 | TUG OF WAR | route | anxiety.mid#4, anger.mid#9 | anxiety, control struggles, anger - ACT's "drop the rope" |
| 102 | FINGER TRAP | route | panic.high#3, panic.mid#2, anxiety.high#3, fear.high#2, general.high#3, general.mid#2 | **anxiety, panic**, overthinking - paradoxical effort: pushing in instead of pulling away is acceptance in one gesture |
| 103 | SINKING PLATFORM | bench | — | tap-then-watch — the user never lowers anything |
| 104 | VOLUME KNOB | route | panic.low#3, anxiety.low#2, overthinking.mid#4, overthinking.low#4, shame.mid#2 | anxiety, inner critic - "turn it down, don't delete it" |
| 105 | DRAMA MACHINE | ★ hero | panic.low#1, anxiety.low#5, overthinking.low#1, fear.low#2, good.mid#7, general.low#2 | **panic, catastrophising**, anger - exaggerate, then cut (paradoxical intention plus humour); the face flips to posit… |
| 106 | TINY SOUNDTRACK | ★ hero | sad.mid#6, sad.low#1, lonely.mid#2, lonely.low#2, numb.mid#4, numb.low#2, good.high#3, good.mid#3, good.low#3 | sadness, stress, numbness - playing real notes is a light mood lift |
| 107 | GO WEIRD | ★ hero | anger.low#2, overthinking.low#2, shame.low#1, fear.low#1, numb.mid#5, numb.low#3, good.mid#8, good.low#6, general.low#3 | fear, shame, anger - humour defusion (googly eyes on the thought) |
| 108 | WORD SALAD | vault | — | **1** - the "shake" is always an exact reversal (confirmed live), and the goal is to rebuild the original negative se… |
| 109 | CLEANSE | route | panic.high#2, anxiety.high#4, anger.high#2, sad.high#3, shame.high#2, shame.mid#5, general.high#4 | panic, anxiety, stress - charge and release is like an exhale; the labels come from the emotion profile (HOLD TO CALM… |
| 110 | RAIN OUT | ★ hero | sad.high#1, sad.mid#1, lonely.high#2, lonely.mid#5, shame.high#3, shame.mid#4, general.mid#4 | **sadness, grief**, overwhelm - "let it out" (a crying metaphor); a full-screen rain catharsis where the words wash o… |
| 111 | BIG SIGH | ★ hero | panic.high#1, panic.mid#1, anxiety.high#1, anger.high#4, overthinking.high#1, overwhelm.high#1, fear.high#1, general.high#1 | §8.1 panic hero |
| 112 | COOL THE VOLCANO | ★ hero | anger.high#1, anger.mid#1 | §8.2 anger hero |
| 113 | GROUND CONTROL | ★ hero | panic.mid#6, panic.low#5, anxiety.high#2, anxiety.mid#1, fear.high#3 | §8.3 anxiety hero |
| 114 | SKY LANTERNS | ★ hero | sad.high#2, sad.mid#2, sad.low#4, lonely.high#1, lonely.mid#1, lonely.low#3 | §8.4 sad / lonely hero |
| 115 | KIND ECHO | ★ hero | lonely.high#3, lonely.mid#4, lonely.low#4, shame.high#1, shame.mid#1, jealous.high#2, jealous.mid#5 | §8.5 shame hero |
| 116 | SQUEAKY THOUGHT | ★ hero | overthinking.high#3, overthinking.mid#1 | §8.6 overthinking hero |
| 117 | COLOUR RUSH | ★ hero | sad.low#3, lonely.mid#6, lonely.low#1, jealous.low#3, numb.high#1, numb.mid#1, numb.low#1, good.high#1, good.mid#1, good.low#2 | §8.7 numb hero, GOOD savour |
| 118 | SHADOW SHRINK | ★ hero | fear.mid#1 | §8.8 fear (mid, graded) |
| 119 | YOUR SPOTLIGHT | ★ hero | jealous.high#1, jealous.mid#1, jealous.low#1, good.high#2, good.mid#2, good.low#1 | §8.9 jealous hero, GOOD wins |
| 120 | ONE THING | ★ hero | overwhelm.high#2, overwhelm.mid#1, overwhelm.low#1 | §8.10 overwhelm hero |

---------------------------------------------------------------------------------------------------

## Owner decisions (delegated to the lead, binding for builders and reviewers)
- 2026-10-08 · Dots / Still Point colour: the core travels from the feeling's own hue to the hue of that feeling's calm grade (§0.2: anger red → teal, panic → dawn gold, sad → peach; numb grey → colour), taking the hue path that avoids yellow-green. This supersedes the "always ends on cyan 190" line in §5.2. Reviewers must not flag it.
- 2026-10-08 · Release 1 scope: see the workflow SCOPE note (games 115-120 and flipdata deferred to release 2; router and rewards degrade gracefully).
- The lead decides all remaining open design questions in favour of: clearer first-time guidance, faster felt relief, warmer Pixar / Inside Out look, and never removing existing functionality.
- 2026-10-08 · **Creative standards** in docs/CREATIVE_STANDARDS.md are binding for all builders, reviewers, raters and polish agents (characters as active in-world participants; a unique spectacular finale per game; look-alike games get different gameplay; bubble image rules — circular, no black masks, text below, no overlap; cinematic richness; honest scoring with evidence; never remove features; functional / visual / premium readiness for all 114 games; mobile first). New games 111-114 must already meet them: in-world characters that react and transform, and a unique finale designed for the mechanic.
- 2026-10-08 · **Architecture principle:** characters-as-participants, distinctive gameplay, cinematic quality and each game's own finale are CORE GAMEPLAY requirements designed into the engine (character role per player action + progress transformation, and the game's own finale sequence as first-class states), not cosmetic overlays. Reusable systems are parameterised per game; changes across many games are piloted on representative games first and reviewed on rendered phone + desktop screenshots. See docs/CREATIVE_STANDARDS.md.
