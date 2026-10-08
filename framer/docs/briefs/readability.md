# BRIEF for task `readability` — extracted from docs/EOS_SPEC.md (sections: §4 (all), §0.4 tokens, §12.1 rules)
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

## 4. Readability (`src/eos/10_eos_readability.jsx`, task `readability`)

### 4.1 Rules
- **Floor:** nothing a user must read renders below **12 px at every width** (rendered = computed font-size × ancestor scale; SVG text = its bounding-box height ÷ scale). Targets are higher: chrome labels 13-14, instructions 15-17, HUD numbers 14-18, spark/token/chain pills **14 / 13**, the user's own words **16 desktop / 15 phone** (14 inside objects ≤ 96 px).
- **Never shrink.** Every rule either sets an explicit size on chrome whose baseline is smaller (verified by the no-shrink check, §4.7) or **grows only**. The `max(Npx, 1em)` trick is unsafe in general (`1em` is the *parent's* size: SCRATCH REVEAL words would drop from 23 → 17.28 px, `.chainStart` from 50 → 20 px), so it is used **only** for selectors whose every existing arcade rule is ≤ 11 px (list in §4.3).
- **Touch targets** ≥ 44 px for arena buttons we restyle (`min-height:44px`), except where the screenshot review shows a tight layout breaking (§4.7).
- Contrast ≥ 4.5:1 (white on the existing glass).
- **Three layers:** (1) `EOS_READ_CSS` for chrome (header, HUD, guide panel, menu, reveal) with explicit sizes, (2) `max(Npx,1em)` CSS for the ≤ 11 px-only list, (3) the grow-only JS floor `EosTextFloor` with a per-selector target table (`EOS_READ_TARGETS`) plus the 12 px catch-all. Do **not** "fix" `dynamicBubbleTextCss` (L21047): if it started matching it would apply the 4 px default and shrink every word.

### 4.2 Measured offenders (audit_1-3, catalogs and the asks critique's live run in input / menu / play / finish / reveal) → target
| element | today 1280 / 390 | target | layer |
|---|---|---|---|
| `.releaseScoreBar>span` "LVL 1" / `>strong` "⚡ 0" | 12 / 10 | 14 / 13 · 18 / 16 | CSS |
| `.releaseTitleMain` (clipped "MOTIONAL…" at 390) · `.releaseTitleBrand` "THINKSTILL" (8 px at 390) | ~20 / clipped · – / 8 | desktop unchanged; **≤560: show only `.releaseTitleBrand` at 15 px / 900** (hide main + "by") | CSS |
| `.releaseChoiceMenu .releaseChoiceGroupLabel` ("15 SIGNATURE RELEASES", and the new "FOR YOUR ANGER") | **7 / 7** | 13 / 13 | CSS |
| `.engineProgressText` | 10 / 9 | **14 / 13** | CSS |
| `.tsShiftRewardPill` (sparks, tokens, chain) | **8.3 / 6.5** | **14 / 13**, height 30 / 28, chain visible on phone | CSS (no `animation` property, so the arcade's `tsRewardPillHit` pop survives) |
| `.tsShiftLevel>b` | **7 / 6.2** | 14 / 13 | CSS |
| `.tsRewardPayout` / `.tsFinishRewardPayout` | ≈11 / 10 | 16 / 14 · 18 / 16 | JS targets |
| guide `.guideHeaderRow b` · `.guideStepCard small` · `span` · `.globalMindBend strong` · `em` | 12.5/10.2 · 10/8.7 · 12.4/9.8 · 9.8/8.5 · 11.8/9.3 | 14/13 · 12/12 · **17/15** · 12/12 · 14/13 | CSS |
| reveal: `.releaseShiftCheck>.releaseReplaySame` ("↻ AGAIN") · `.releaseCompleteSideNav` (PREVIOUS / NEXT) · `.releaseShiftChoices>button` ("YES ✓", meter off) · `.releasePersistentFinalMessage>span` · `.releaseCompleteCard small` | 8.4/9 · 10/8 · 9.3/10 · 9.8/10 · ~12 | 14/13 (min-height 44) · 14/13 (44) · 15 (48) · 15/14 · 13 | CSS (first three + last) · JS target (final message) |
| game payoff / hint lines: `.hotPotatoStage>.hotPotatoPayoff` · `.shelfGuideV2>span` · `.coinReleaseStage>.coinReleaseHint` · `.tsDynamicActionCue>.tsDynamicActionArrow` · any `[class*=Payoff]`, `[class*=payoff]` | –/10 · 11/– · 11.3/– · 9.9/– | 15 / 14 | JS targets |
| SVG text `.realVacuumMachine text` ("CYCLONE") | 8 / – | 12 rendered | CSS in user units (builder measures the viewBox scale at both sizes, §4.4) |
| user words (`.tsExactUserText`, `.plainUserThoughtText`, `.tsExternalThoughtLabel`, `.potatoWord`, `.echoBubbleWord` **3.9**, `.rainCloudText`, `.spaceTileWord`, `.coinReleaseWord`, `.tsBubbleTextContainer`, `.gwThought`, `.dmHeroThought`, `.spThought`, `.volumeMaterialText`, `.tsndText`, `.ftThoughtPill>b`, `.keepDropBubbleText span`, `.subtitleBar`) | 3.9-11.2 / 6.5-8.6 | 16 / 15 (or the "Bubble Text" prop when larger) | JS targets (grow-only; **no** CSS font-size). `.chainStart` (22-50 px) is excluded. |
| in-arena counters / labels (5-11 px): `.magicTrapBubble>b`, `.magicLeverHandle>:is(em,b)`, `.magicLockLights>b`, `.unhookWordBubble>small`, `.binWordBubble>b`, `.cutLoopWord>em`, `.shredderMouth>b`, `.shredderTop>span`, `.defuseV2Screen>small`, `.defuseV2Timer>span`, `.defuseZone :is(small,strong,button)`, `.freezeWordCube>b`, `.hotPotatoGuide>span`, `.tugPullHandle>span`, `.dmDial>small`, `.tsndKeySub`, `.eraseWordBubble>b`, `.shelfThoughtBubble>b`, `.weightedBlock>b`, `.doorABExploreMeter>b`, `.xrayPassDots>b`, `.ftArrow em`, `.volumeAutoFinish :is(span,b)`, `.dmTakeCopy :is(small,b)`, `.dmControlCopy`, `.tsndNoteBadge`, `.tsndAction`, `.tsndInstrumentHead :is(b,span)`, `.gwProp :is(em,span)`, `.tsndFooter :is(b,span)`, `.vacuumMachineLabel`, `.carCabin :is(.frontSeat,.backSeat)`, `.windLane`, `.doorABIdlePrompt`, `.xrayScannerHandle>b`, `.xrayDragGuide span`, `.ftRule`, `.ftCue`, `.ftShift>b`, `.spQueueItem>b`, `.rotaryKnob>b`, `.dmStageBrand small`, `.dmProgressText`, `.dmEffectLabel span`, `.dmStageCounter`, `.tsndTitle small`, `.tsndMeter>b`, `.gwTopCopy :is(small,b)`, `.gwMeter>b`, `.controlPanelSwitches span`, `.premiumCombo`, `.zapBubbleCount`, `[class*=ToolDock]>span`, `.neonBin>span`, `.chainLink span`, `.doorABVs span`, `.doorABStageTitle span`, `.coinFaceLabel`, `.spCounter`, `.tradeHeader span`, `:is(.zapGroundButton,.meltGroundButton,.flushLever,.burnGroundButton)>span`, `.swipeCard>b`, `.ownershipZones span`, `.rubberStamps span`, `.lotus>b`, `.rainPullHint span`, `.controlPanelHelper`, `.controlPanelHeader span`, `.scaleDopamine`, `.priorityGrid span`, `.literalStatus :is(b,span)`, `.uniqStatus :is(b,span)`, `.literalProgress`, `.cleanseStatus`, `.tsDynamicActionText`, `.globalFeedbackCopyLayer :is(b,span)` | 5-11 | 12 | JS targets |
| ≤ 11 px-only counters: `.toolHitCount`, `.miniCrackCount`, `.pinTool`, `.combo`, `.spStatus`, `.echoBubbleTimer`, `.doorABTopLabel`, `.keepDropMicroGuide` | 5-11 | `max(12px,1em)` | CSS |
| ≤ 11 px-only arena buttons: `.uniqControl`, `.bigAction`, `.parkBay`, `.dmCutButton`, `.eraseActivateBtn`, `.cutLoopScissorPicker`, `.cleanseBubbleHoldButton` | 7-10 | `max(14px,1em)` (phone 13), `min-height:44px` | CSS |
| other arena buttons: `[class*=ToolDock]`, `.orbitButtons button`, `.genreKeys button`, `.productionStrip button`, `.nudgeRow button`, `.gwProp`, `.dmDramaButton`, `.tsndVibes button` | 7-10 | 14 / 13 | JS targets (+ `min-height:44px` only where the screenshot review passes) |
| composer `.releaseThoughtInput` · `.choiceCopy, .choiceArrow` | ~14 · 8.5-9 | 16 (no iOS zoom) · 14 / 13 | CSS |

### 4.3 `EOS_READ_CSS` (paste-ready; `${EOS_A}` from core)
```css
/* header */
${EOS_A} .releaseScoreBar{height:36px!important;min-width:200px!important;gap:8px!important}
${EOS_A} .releaseScoreBar>span{font:800 14px/1 var(--eos-font)!important;letter-spacing:.04em!important}
${EOS_A} .releaseScoreBar>strong{font:900 18px/1 var(--eos-font)!important;font-variant-numeric:tabular-nums!important}
${EOS_A} :is(.choiceCopy,.choiceArrow){font-size:14px!important}
${EOS_A} .releaseThoughtInput{font-size:16px!important}
/* game menu group labels (7 px today; EosMenuGroup reuses the markup) */
${EOS_A} .releaseChoiceMenu .releaseChoiceGroupLabel{font:900 13px/1.2 var(--eos-font)!important;letter-spacing:.08em!important}
/* reveal */
${EOS_A}.stage-reveal .releaseCompleteCard small{font-size:13px!important}
${EOS_A}.stage-reveal :is(.releaseReplaySame,.releaseCompleteSideNav){font:800 14px/1 var(--eos-font)!important;min-height:44px!important}
${EOS_A}.stage-reveal .releaseShiftChoices>button{font:900 15px/1 var(--eos-font)!important;min-height:48px!important}
/* in-game HUD — both wrappers; fixes the ids ≥100 overflow (track pushed off-screen at 390) */
${EOS_A}.stage-play .releaseGameHost .engineProgressHud{display:flex!important;flex-direction:column!important;align-items:stretch!important;height:auto!important;gap:6px!important;pointer-events:none!important}
${EOS_A}.stage-play .releaseGameHost .engineProgressTrack{width:100%!important;height:26px!important;min-height:26px!important;flex:none!important}
${EOS_A}.stage-play .releaseGameHost .engineProgressText{font:900 14px/26px var(--eos-font)!important;letter-spacing:.05em!important}
${EOS_A}.stage-play .tsShiftRewardHud{display:flex!important;flex-wrap:wrap!important;justify-content:flex-end!important;gap:6px!important;width:100%!important}
${EOS_A}.stage-play :is(.tsShiftRewardPill,.tsShiftLevel){height:30px!important;padding:0 10px!important;display:inline-flex!important;align-items:center!important}
${EOS_A}.stage-play :is(.tsShiftRewardPill,.tsShiftLevel>b){font-family:var(--eos-font)!important;font-weight:900!important;font-size:14px!important;line-height:1!important;letter-spacing:.03em!important}
/* live guide */
${EOS_A} .globalPlayGuide .guideHeaderRow b{font-size:14px!important}
${EOS_A} .globalPlayGuide :is(.guideStepCard small,.globalMindBend strong){font-size:12px!important;letter-spacing:.1em!important}
${EOS_A} .globalPlayGuide .guideStepCard span{font:800 17px/1.2 var(--eos-font)!important}
${EOS_A} .globalPlayGuide .globalMindBend em{font-size:14px!important;line-height:1.25!important}
/* the user's own words: layout only — SIZE comes from the grow-only JS floor (never shrink 23 px words) */
${EOS_A}.stage-play .releaseGameHost :is(.tsExactUserText,.plainUserThoughtText,.tsExternalThoughtLabel,.potatoWord,.echoBubbleWord,.rainCloudText,.spaceTileWord,.coinReleaseWord,.tsBubbleTextContainer,.gwThought,.dmHeroThought,.spThought,.volumeMaterialText,.tsndText,.subtitleBar){line-height:1.05!important;overflow-wrap:anywhere!important;max-width:100%}
/* ≤ 11 px-only selectors (every existing arcade rule is ≤ 11 px, so 1em cannot shrink them) */
${EOS_A}.stage-play .releaseGameHost :is(.toolHitCount,.miniCrackCount,.pinTool,.combo,.spStatus,.echoBubbleTimer,.doorABTopLabel,.keepDropMicroGuide){font-size:max(12px,1em)!important;letter-spacing:.04em!important}
${EOS_A}.stage-play .releaseGameHost :is(.uniqControl,.bigAction,.parkBay,.dmCutButton,.eraseActivateBtn,.cutLoopScissorPicker,.cleanseBubbleHoldButton){font-size:max(14px,1em)!important;min-height:44px!important}
@media (max-width:700px){
  ${EOS_A}.stage-play .releaseGameHost .engineProgressHud{left:10px!important;right:10px!important;width:auto!important}
  ${EOS_A}.stage-play .tsShiftRewardPill.chain{display:inline-flex!important}
  ${EOS_A}.stage-play :is(.tsShiftRewardPill,.tsShiftLevel){height:28px!important}
  ${EOS_A}.stage-play :is(.tsShiftRewardPill,.tsShiftLevel>b){font-size:13px!important}
  ${EOS_A}.stage-play .releaseGameHost .engineProgressText{font-size:13px!important}
  ${EOS_A} .globalPlayGuide .guideStepCard span{font-size:15px!important}
  ${EOS_A} .globalPlayGuide .guideHeaderRow b{font-size:13px!important}
  ${EOS_A} .globalPlayGuide .globalMindBend em{font-size:13px!important}
  ${EOS_A} .globalPlayGuide.isActive .globalMindBend{display:none!important}   /* coach strip after the first hit */
  ${EOS_A}.stage-play .releaseGameHost :is(.uniqControl,.bigAction){font-size:max(13px,1em)!important}
}
@media (max-width:560px){
  ${EOS_A} :is(.releaseTitleMain,.releaseTitleBy){display:none!important}
  ${EOS_A} .releaseTitleBrand{display:inline!important;font:900 15px/1 var(--eos-font)!important;letter-spacing:.08em!important;white-space:nowrap!important}
  ${EOS_A} .releaseConsoleHeader{padding:0 148px 0 56px!important}
  ${EOS_A} .releaseScoreBar{min-width:0!important;height:32px!important;padding:0 10px!important}
  ${EOS_A} .releaseScoreBar .releaseScoreTrack{display:none!important}
  ${EOS_A} .releaseScoreBar>span{display:inline!important;font-size:13px!important}
  ${EOS_A} .releaseScoreBar>strong{font-size:16px!important}
  ${EOS_A}.stage-reveal :is(.releaseReplaySame,.releaseCompleteSideNav){font-size:13px!important}
  ${EOS_A}.stage-play .releaseGameHost .uniqControl>span:first-child{display:none!important}  /* drop the "THOUGHT MOVE · " prefix on phones */
}
```

### 4.4 `EosTextFloor({stage})` — the grow-only floor
- Mounted once by I1 (renders `<span hidden data-eos="text-floor"/>` and finds its `.tsArcade` via `closest`).
- Runs in `stage-play`, `stage-reveal`, and `stage-input` **while `.releaseChoiceMenu` is open**; every 900 ms and 250 ms after a pointerup.
- **Target table** `EOS_READ_TARGETS = [[selector, desktopPx, phonePx], …]` from §4.2 (rows marked "JS targets"): user words 16 / 15 (target = `max(16|15, --bubble-text-size)`, read from the root), payoff/hint lines 15 / 14, payouts 16/14 · 18/16, other arena buttons 14 / 13, counters 12 / 12. Then the **catch-all**: every other visible leaf text element inside `.releaseStage`, the header and the open menu gets 12.
- **Grow-only write:** `want = target / eosStageScale`; only if `computed font-size < want − 0.25` → `el.style.setProperty("font-size", want + "px", "important")` and tag `data-eos-floor`. Never writes a value smaller than the current computed size; never touches `.chainStart`.
- Skips `[aria-hidden="true"]` subtrees, `.eosArrowLayer`, `.tsRewardSurge`, our own `.eos*` overlays (designed ≥ 12 px), elements with opacity < .2 or width < 8 px. **SVG `text`:** measure `getBoundingClientRect().height ÷ eosStageScale`; never write inline sizes inside a scaled viewBox (user units ≠ px) — report it in `scan()` so it is fixed in CSS (`.realVacuumMachine text`).
- Budget: ≤ 2 ms per pass (stop after 400 elements). Exposed as `eosExpose("readability", {scan: () => offenders[], targets: EOS_READ_TARGETS})` for the test harness.
- Wrapper safety: the legacy MO ignores attributes and the new MO only watches `src`, so inline style writes do not re-trigger their audits (verified in `map_engine_hud` §1.2).

### 4.5 The 390 px HUD overflow
Root cause: `.engineProgressHud` is `display:flex; width:min(430px,46vw); height:24px` and holds both the full-width track and the 314 px pill grid, so the track is pushed left off-screen (`x = -114` at 390). Fix = §4.3: column layout, auto height, full-width track, wrapping pill row, `left:10px; right:10px` ≤700 px, `pointer-events:none` (the HUD has no controls and sits at z 2147482000 above game targets). The header title/score overlap is fixed by the ≤560 block. The HUD is taller now (two rows on phone): the companion and new-game safe areas are measured from its live bottom, never a fixed `top`.

### 4.6 The dead `bubbleTextPx` prop
- Today: default 4; `dynamicBubbleTextCss` matches nothing (no descendant space); `--bubble-text-size` is set on the root but read by nothing; only 99 ECHO uses it (inline `!important` → 3.9 px words).
- Fix (I1): default **16**, clamp max **28**, property control `defaultValue: 16, max: 28`; ECHO floor `Math.max(15, …)` (two identical `engineBubbleTextPx` declarations). `EosTextFloor` uses `max(16|15, --bubble-text-size)`, so the control becomes a real "make words bigger" knob for every game and can never shrink words below the floor. Saved Framer instances that still hold 4 keep the 16/15 floor.

### 4.7 Acceptance (readability)
- **8 states × 2 sizes** (1280×860, 390×844): input; game menu open; play start; play right after the first hit (step payout + `.globalFeedbackCopyLayer` visible); finish hold (`.globalFinishFeedbackCopy`); reveal with the meter; reveal after the payoff; Orb Shelf + safety card open. Games: POP, CRUSH, HOT POTATO, CLEANSE, RAIN OUT, SHELF IT, and 111-120. `eos_drive.smallText(12)` (which wraps `readability.scan()` + a DOM sweep) returns nothing below 12 px; user-word selectors render ≥ 16 / 15 px (ECHO included).
- **No-shrink check** for every one of the 120 games at both sizes: the rendered size of every text element is ≥ its size in the baseline build (same text, same viewport; baseline = `python3 build.py --dev-dir /tmp/eos_base --modules 00_eos_core.jsx`, which has no readability module). SCRATCH REVEAL words stay ≥ 23 px at 1280; `.chainStart` unchanged.
- `.engineProgressHud` and `.releaseScoreBar` rects are fully inside the viewport and do not overlap the title; the phone header reads "THINKSTILL".
- **Screenshot review** (builder looks at every image) of every game whose label grows (DEFUSE, FREEZE, MAGIC TRAPDOOR, DRAMA MACHINE, TINY SOUNDTRACK, DOOR A/B, X-RAY, SINKING PLATFORM) **and every tight layout touched by `min-height`** (MIRROR FLIP, HEADLINE, PARK IT, GO WEIRD, TINY SOUNDTRACK) at both sizes; add per-game `max-width` / `white-space:normal` guards where a label overflows its object, and drop `min-height` for a selector whose layout breaks. No element with `scrollWidth > clientWidth + 2` among the resized labels.

---------------------------------------------------------------------------------------------------

### 12.1 Tasks (each exclusively owns its files)
**Rules for every task:** no `import` / `export` lines; **namespace** every private top-level identifier with your task (`Eos<Task>…`, `EOS_<TASK>_…`, `eos<Task>…`; the public names in the table are exempt), keyframes `eos<Task><Name>`, `eosCss` key = task id; `grep -w` every new top-level name against `src/00_arcade.jsx`, `src/99_pixar.jsx` and all `src/eos/*.jsx` (core owns e.g. `EOS_SAFETY_LEX`, `EOS_SAFETY_RANK`, `EOS_SAFETY_WHO`, `EosSafetyScan`, `EOS_DISCHARGE_IDS`, `EOS_SLOW_IDS`, `EOS_BREATH`, `EOS_PACER`); call other modules only via `eosApi(...)` with optional chaining; never edit core, arcade or Pixar files (ask the lead); every runtime acceptance runs in the **scratch integrated build** (a plain `build.py --modules` build has no router / mount edits — id 111 would run the arcade's generic engine), `EosEnginePreview` only for quick iteration; `python3 build.py` (full) passes after your merge.
| id | files | sections | exports (public names) |
|---|---|---|---|
| `foundation` | `dev/eos_drive.mjs`, `dev/eos_preview.html`, `dev/eos_preview.jsx`, `dev/eos_preview.py` | §12.3 | `launchEos`, `startGameById`, `listGames` (de-duplicated), `openCheckin`, `runCheckin`, `finishGame` (all 17 gestures, every stage, by `EOS_GESTURES` ≤ 110 / `data-eos-*` 111+, asserting each stage's arrow), `readProgress`, `progressLog`, `smallText(minPx)`, `noShrink(baselineDir)`, `arrowState`, `lintCopy`, `flashCheck`, `dotsNearCentre`, `pixelVisible` |
| `readability` | `src/eos/10_eos_readability.jsx` | §4 | `EOS_READ_CSS`, `EOS_READ_TARGETS`, `EosTextFloor` |
| `dots` | `src/eos/12_eos_dots.jsx` | §5.1-5.5 | `EosThoughtFlow`, `EOS_DOTS_CSS` |
| `mood` | `src/eos/14_eos_mood.jsx` | §5.6 | `EosMoodGrade`, `EOS_MOOD_CSS` |
| `flipdata` | `dev/eos_flip_index.mjs`, `src/eos/16_eos_flipdata.jsx` (generated) | §9.6 | `EOS_FLIP_INDEX`, `eosExpose("flip", {match, line})` |
| `game-sigh` | `src/eos/21_eos_game_sigh.jsx` | §8.0, §8.1 | `EOS_GAME_111`, `EosBigSighEngine`, `EOS_SIGH_CSS` |
| `game-volcano` | `src/eos/22_eos_game_volcano.jsx` | §8.0, §8.2 | `EOS_GAME_112`, `EosVolcanoEngine`, `EOS_VOLCANO_CSS` |
| `game-ground` | `src/eos/23_eos_game_ground.jsx` | §8.0, §8.3 | `EOS_GAME_113`, `EosGroundControlEngine`, `EOS_GROUND_CSS` |
| `game-lanterns` | `src/eos/24_eos_game_lanterns.jsx` | §8.0, §8.4 | `EOS_GAME_114`, `EosSkyLanternsEngine`, `EOS_LANTERNS_CSS` |
| `game-kind` | `src/eos/25_eos_game_kind.jsx` | §8.0, §8.5 | `EOS_GAME_115`, `EosKindEchoEngine`, `EOS_KIND_CSS` |
| `game-squeaky` | `src/eos/26_eos_game_squeaky.jsx` | §8.0, §8.6 | `EOS_GAME_116`, `EosSqueakyEngine`, `EOS_SQUEAKY_CSS` |
| `game-colour` | `src/eos/27_eos_game_colour.jsx` | §8.0, §8.7 | `EOS_GAME_117`, `EosColourRushEngine`, `EOS_COLOUR_CSS` |
| `game-shadow` | `src/eos/28_eos_game_shadow.jsx` | §8.0, §8.8 | `EOS_GAME_118`, `EosShadowShrinkEngine`, `EOS_SHADOW_CSS` |
| `game-spotlight` | `src/eos/29_eos_game_spotlight.jsx` | §8.0, §8.9 | `EOS_GAME_119`, `EosSpotlightEngine`, `EOS_SPOTLIGHT_CSS` |
| `game-onething` | `src/eos/2a_eos_game_onething.jsx` | §8.0, §8.10 | `EOS_GAME_120`, `EosOneThingEngine`, `EOS_ONETHING_CSS` |
| `arrows` | `src/eos/30_eos_arrows.jsx` | §3 | `EOS_GESTURES`, `EOS_GLYPH_OVERRIDE`, `EosGestureFor`, `eosGlyph`, `EosGuideArrows`, `EosHandCue`, `EosHandHint`, `EOS_ARROWS_CSS` |
| `checkin` | `src/eos/40_eos_checkin.jsx` | §2.1-2.2, §2.5, §6.2, §6.3, §6.5 | `EosCheckIn`, `EosCheckInChip`, `EosCompanion`, `EOS_CHECKIN_CSS` |
| `router` | `src/eos/45_eos_router.jsx` | §7 | `EOS_EMOTION_ROUTES`, `EOS_ROUTE_RULES`, `EOS_VAULT`, `EOS_BENCH`, `EOS_GENTLE_IDS`, `EOS_SECOND_ACT`, `EOS_LOUD_IDS`, `EOS_GAME_SECONDS`, `EosRouteGame`, `EosSecondAct`, `EosRoutePreview`, `EosMenuGroup`, `EosProfileOverride` |
| `shift` | `src/eos/50_eos_shift.jsx` | §2.4, §6.6 | `EosShiftMeter`, `EosStillMoment`, `EOS_SHIFT_CSS` |
| `rewards` | `src/eos/52_eos_rewards.jsx` | §9.1-9.5 | `EOS_REWARDS_SKILLS`, `eosGrantForShift`, `eosBondFor`, `eosSkillFor`, `eosWeek`, `eosMyStats`, `EosWorldChips`, `EosOrbShelf`, `eosMakeShareCard`, `EosShareButton`, `EOS_REWARDS_CSS` |
| `safety` | `src/eos/55_eos_safety.jsx` | §10 | `EosSafetyLayer`, `EosSafetyCard`, `EosSupportPill`, `eosSafetyOrderLines`, `EOS_SAFETY_CSS` |
| `fixes` | `src/eos/60_eos_fixes.jsx` | §11 | `EOS_HINT_FIX`, `EOS_FIXES_ALMOST`, `EOS_LIVE_SELECTORS`, `eosGateProgress`, `EosEntries`, `EosLegacyGuards`, `EOS_FIXES_CSS` |


## Owner decisions (delegated to the lead, binding for builders and reviewers)
- 2026-10-08 · Dots / Still Point colour: the core travels from the feeling's own hue to the hue of that feeling's calm grade (§0.2: anger red → teal, panic → dawn gold, sad → peach; numb grey → colour), taking the hue path that avoids yellow-green. This supersedes the "always ends on cyan 190" line in §5.2. Reviewers must not flag it.
- 2026-10-08 · Release 1 scope: see the workflow SCOPE note (games 115-120 and flipdata deferred to release 2; router and rewards degrade gracefully).
- The lead decides all remaining open design questions in favour of: clearer first-time guidance, faster felt relief, warmer Pixar / Inside Out look, and never removing existing functionality.
- 2026-10-08 · **Creative standards** in docs/CREATIVE_STANDARDS.md are binding for all builders, reviewers, raters and polish agents (characters as active in-world participants; a unique spectacular finale per game; look-alike games get different gameplay; bubble image rules — circular, no black masks, text below, no overlap; cinematic richness; honest scoring with evidence; never remove features; functional / visual / premium readiness for all 114 games; mobile first). New games 111-114 must already meet them: in-world characters that react and transform, and a unique finale designed for the mechanic.
- 2026-10-08 · **Architecture principle:** characters-as-participants, distinctive gameplay, cinematic quality and each game's own finale are CORE GAMEPLAY requirements designed into the engine (character role per player action + progress transformation, and the game's own finale sequence as first-class states), not cosmetic overlays. Reusable systems are parameterised per game; changes across many games are piloted on representative games first and reviewed on rendered phone + desktop screenshots. See docs/CREATIVE_STANDARDS.md.
