# BRIEF for task `fixes` — extracted from docs/EOS_SPEC.md (sections: §11 (all), §0.2 (eosTextSafety, EOS_NEUTRAL_WORDS), §3.10 (66/80 copy))
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

### 3.10 Per-game override table — all 110 ids
W = wrapper (L = `GameEngineLegacy`, N = `GameEngine`). Gesture names per §3.3. **✎ = the current LIVE GUIDE text describes the wrong gesture or hides a required step;** the corrected panel text goes into `EOS_HINT_FIX` (§11.1). Source-verified for this spec: 16 MELT is tap ×3 (not hold), 28 ARCHIVE / 38 DRAWER / 40 PAPER PLANE show their stage-1 button only until it is used, 31 BACK SEAT needs right>90 **and down**>35, 33/17/74/42 live element = first not `.cut/.dead/.popped/.loose`, 64 red = `.trafficLamp.p0`, 84 left = MINE, 98/107 stage 2 when `.magicTrapBubble.selected` / `.gwProp.propSelected`, 101/105/106 inactive steps are `:disabled`.

| id | name | W | gesture | target (stage priority) | arrow label | guide today → fix |
|---|---|---|---|---|---|---|
| 1 | POP | L | tap (near) | `button.popBubbleV2` | POP IT! | Tap to pop ✓ |
| 2 | CRUSH | L | taps ×4 | `button.uniqControl` | CRUSH ×4 | Rapid-tap to crush ✓ |
| 3 | CRACK | L | tool → taps ×3 | `button.crackToolDock` (armed `.selected`) → `.crackBubbleSlot` | GRAB THE HAMMER → CRACK ×3 | ✎ "Tap to crack" → Grab the hammer, then tap each egg 3× |
| 4 | STOMP | L | tool → taps ×3 | `button.stompToolDock` (`.selected`) → `.stompBubbleSlot` | GRAB THE BOOT → STOMP ×3 | ✎ "Stomp it flat" → Grab the boot, then stomp each bubble 3× |
| 5 | HAMMER | L | tap | `button.uniqControl` | SWING! | ✎ "Time the hit" (no timing exists) → Tap to swing |
| 6 | ZAP | L | taps ×3 | `button.zapGroundButton` | ZAP ×3 | ✎ "Hold to zap" → Tap the zapper 3× |
| 7 | PIN POP | L | drag r 130 | `.pinTool` | SLIDE THE PIN → | Drag pin → pop ✓ |
| 8 | METEOR | L | sling d 110 | `.meteorRock` (needs §11.6 occlusion fix) | PULL DOWN · LET GO | ✎ → Pull the rock down, then let go |
| 9 | LASER SLICE | L | tool → taps ×3 | `button.laserToolDock` (`.selected`) → `.laserTargetBubble` | GRAB THE LASER → ZAP ×3 | ✎ "Swipe to slice" → Grab the laser, then tap each bubble 3× |
| 10 | DOMINO DROP | L | tap | `button.uniqControl` | TIP IT OVER | ✓ |
| 11 | PRESSURE POP | L | holdRelease ~950 ms, window 55-92 (I3) | `button.uniqControl` · meter `.pressureCapsule` `--p` | HOLD… LET GO ON GREEN | ✎ → Hold, then let go when the needle is in the green |
| 12 | BOUNCE OUT | L | taps ×3 | `button.uniqControl` | HIT ×3 | ✎ → Tap the paddle 3× |
| 13 | SQUASH | L | hold 1300 | `button.uniqControl` | PRESS & HOLD | ✓ |
| 14 | CRUMPLE | L | seq | `button.paperCorner:not(:disabled)` | FOLD THIS CORNER | ✎ → Tap the glowing corner |
| 15 | SHRED | L | taps ×5 | `button.shredAction` | FEED IT ×5 | ✓ |
| 16 | MELT | L | tool → taps ×3 | `button.meltToolButton` (`.active`) → `.cartoonIceCube` | LIGHT THE TORCH → TORCH IT ×3 | ✎ "Hold to melt" → Light the torch, then tap each ice cube 3× |
| 17 | BOSS BATTLE | L | seq | `button.weakSpot:not(.dead)` (first) | HIT THE GLOWING SPOT | ✎ → Tap the glowing weak spot |
| 18 | BURN | L | hold 3000 | `button.burnGroundButton` | HOLD THE FLAME | ✓ |
| 19 | ERASE | L | tool → scrub | `button.eraseActivateBtn` (`.active`) → `.eraseWordBubble` | GRAB THE ERASER → RUB IT OUT | ✎ → Grab the eraser, then rub each word |
| 20 | GLITCH OUT | L | seq | `.glitchPanel button.live` | TAP THE LIT SHAPE | ✎ → Tap the glowing shape |
| 21 | BIN | L | dragTo | `.binWordBubble` → `.binMouthTarget` | DROP IT IN THE BIN | ✎ "Flick it in" → Drag each word into the bin |
| 22 | FLUSH | L | tap | `button.flushLever` | FLUSH! | ✓ |
| 23 | VACUUM | L | tap | `button.vacuumBtn` | SUCK IT UP | ✓ |
| 24 | SLINGSHOT | L | sling dl 110 | `.slingshotWord` | PULL BACK · LET GO | ✓ |
| 25 | SWIPE AWAY | L | swipe r 190 | `.swipeCard.physical` | SWIPE IT AWAY → | ✓ |
| 26 | SEND TO SPACE | L | drag d 160 | `.launchLever` | PULL THE LEVER ↓ | ✓ |
| 27 | DROP ZONE | L | drag d 130 | `.weightedBlock` | DROP IT ↓ | ✓ |
| 28 | ARCHIVE | L | tap → drag d 100 | `button.uniqControl` → `.fileCard` | OPEN THE DRAWER → FILE IT ↓ | ✎ → Open the drawer, then drag the card down |
| 29 | MUTE | L | drag d 150 | `.verticalFader` | SLIDE IT DOWN ↓ | ✓ |
| 30 | ZOOM OUT | L | taps ×4 | `button.uniqControl` | ZOOM OUT ×4 | ✎ (progress only on the 4th tap) → Tap zoom-out 4× |
| 31 | BACK SEAT | L | drag dr 130 | `.passengerCard` | SLIDE IT BACK ↘ | ✎ → Drag the card down and to the right |
| 32 | PARK IT | L | choose | `button.parkBay` | PARK IT HERE | ✓ |
| 33 | FLOAT AWAY | L | seq | `button.balloonWeight:not(.cut)` (first) | SNIP THIS STRING | ✎ → Snip the glowing string |
| 34 | RIVER | L | drag d 80 | `.leafWord` | INTO THE RIVER ↓ | ✓ |
| 35 | TRAIN PLATFORM | L | tap | `button.uniqControl` | LET IT PASS | ✓ |
| 36 | CLOUD PASS | L | slow r 160 (>120 px in >450 ms ⇒ `maxSpeed` 260) | `.neonCloud` | DRAG… SLOWLY → | ✎ → Drag the cloud slowly to the right |
| 37 | ELEVATOR DOWN | L | seq | `.floorStack button:not(:disabled)` | DOWN A FLOOR | ✎ → Tap the glowing floor |
| 38 | DRAWER | L | tap → drag d 90 → tap | `button.uniqControl` (L `@text`) → `.drawerCard` | @text → DROP IT IN ↓ | ✎ → Open, drop the card in, close |
| 39 | BLACK HOLE | L | hold 1200 | `button.uniqControl` | HOLD — DON'T LET GO | ✓ |
| 40 | PAPER PLANE | L | taps → swipe r 170 | `button.uniqControl` (L `@text`) → `.paperPlane` | FOLD → THROW IT → | ✎ → Fold both wings, then swipe the plane right |
| 41 | UNHOOK | L | taps ×3 (near) | `.unhookWordBubble` | UNHOOK ×3 | ✎ → Tap each bubble 3× to cut its strings |
| 42 | UNTANGLE | L | drag ur 70 (seq) | `.knot:not(.loose)` (first) | WIGGLE THIS KNOT | ✎ → Drag the glowing knot |
| 43 | CUT THE LOOP | L | tool → taps ×3 | `button.cutLoopScissorPicker` (`.active`) → `button.cutLoopWord:not(:disabled)` (v1.2.1: the slot stays usable after its word is severed) | GRAB THE SCISSORS → SNIP ×3 | ✎ → Grab the scissors, then tap each word 3× |
| 44 | VELCRO | L | slow r 170 | `.velcroPatch` | PEEL… SLOWLY → | ✓ |
| 45 | MAGNETS | L | drag r 200 | `.attentionOrb` | PULL IT FREE → | ✓ |
| 46 | UNPIN | L | drag u 110 | `.pushPin` | PULL STRAIGHT UP ↑ | ✓ |
| 47 | UNFOLLOW | L | drag r 150 | `.plug` | UNPLUG IT → | ✓ |
| 48 | UNSTICK | L | drag ur 120 | `.stickerWord` (min size via §11.6) | PEEL IT UP ↗ | ✎ → Peel the sticker up and to the right |
| 49 | UNZIP | L | drag r 180 | `.zipperPull` | UNZIP → | ✓ |
| 50 | UNFINISHED SENTENCE | L | type → tap | `.chainLink input` (first empty) → `button.premiumBigAction` | TYPE A FEW WORDS → SHOW ME | ✓ |
| 51 | MIRROR FLIP | L | seq | `.orbitButtons button.live` | TAP THIS VIEW | ✎ → Tap the glowing view |
| 52 | SUBTITLES | L | choose | `.genreKeys button` | PICK A GENRE | ✓ |
| 53 | CARTOONIFY | L | taps ×4 | `button.uniqControl` | MAKE IT SILLY ×4 | ✎ → Tap 4× to make it silly |
| 54 | FONT CHECK | L | taps ×4 | `button.fontDial` | TURN IT ×4 | ✎ → Tap the dial 4× |
| 55 | HEADLINE | L | seq | `.productionStrip button:not(:disabled)` | TURN THE DRAMA DOWN | ✎ → Tap each glowing switch |
| 56 | COURTROOM | L | choose | `.courtTargets button` | WHAT IS IT? | ✎ → Tap a verdict |
| 57 | CAMERA ANGLE | L | taps ×3 | `button.uniqControl` | ROTATE ×3 | ✎ → Tap rotate 3× |
| 58 | MICROSCOPE | L | taps ×4 | `button.focusKnob` | FOCUS ×4 | ✎ "Zoom out" → Tap the focus knob 4× |
| 59 | SPOTLIGHT | L | drag lr 150 | `.spotLamp` (needs §11.6) | MOVE THE LIGHT ↔ | ✓ |
| 60 | CROP TOOL | L | seq | `button.cropHandle:not(:disabled)` | WIDEN HERE | ✎ → Tap the glowing corner |
| 61 | FREEZE | L | taps ×3 (near) | `button.freezeWordCube` | FREEZE ×3 | ✎ "Freeze. Shatter." → Tap each word 3× to freeze it |
| 62 | NET IT | L | tap | `button.catchNet` | CATCH IT | ✓ |
| 63 | PATTERN POP | L | seq | `.portalRing button.hot` | TAP THE GLOW | ✎ "Predict. Tap." → Tap the glowing portal |
| 64 | RED LIGHT | L | timing (lit `.trafficLamp.p0`) | `button.uniqControl` | WAIT FOR RED… / NOW! | ✓ |
| 65 | PAUSE BUTTON | L | hold 2400 · meter `.pauseRing` `--p` | `button.uniqControl` | HOLD TO PAUSE | ✓ |
| 66 | BUFFERING | L | wait 3000 | — | HANDS OFF / BREATHE WITH THE GLOW | ✎ → Hands off — breathe with the glow |
| 67 | TAP OUT | L | alt | `.tapOutPads button.eosNext` (I3) → `.tapOutPads button` | LEFT · RIGHT · LEFT | ✎ "Tap the beat" → Tap left, then right — 8 times |
| 68 | DRUM IT | L | taps ×10 (near) | `.drumKit button` | DRUM! ×10 | ✓ |
| 69 | PULSE | L | timing bpm 40 | `button.uniqControl` | TAP… SLOWLY | ✎ → Tap slowly — one tap per pulse |
| 70 | METRONOME | L | timing bpm 48 | `button.uniqControl` | EVERY OTHER BEAT | ✓ |
| 71 | DEFUSE | L | seq | `.defuseZone.active button` | DO THIS STEP | ✓ |
| 72 | CATCH & LABEL | L | tap → choose | `button.uniqControl` → `.labelButtons button` | CATCH IT → NAME IT | ✓ |
| 73 | TRAFFIC LIGHT | L | choose | `.signalConsole button.light` | PICK A LIGHT | ✓ |
| 74 | BUBBLE WRAP | L | seq | `.bubbleWrapSheet button:not(.popped)` (first) | POP THIS ONE | ✎ "Pop them" (strict order) → Pop the glowing bubble |
| 75 | INK BLEED | L | drag r 180 | `.inkDrop` | DRAG THE INK → | ✓ |
| 76 | REVERSE IT | L | taps ×4 | `button.uniqControl` | REWIND ×4 | ✎ → Tap rewind 4× |
| 77 | SLOW MOTION | L | drag d 160 | `.brakeHandle` | PULL THE BRAKE ↓ | ✓ |
| 78 | ONE WORD | L | choose | `.oneWordField button` | PICK ONE | ✓ |
| 79 | MISS ON PURPOSE | L | tap | `.missPads button:not(.target)` | MISS ON PURPOSE | ✓ |
| 80 | DON'T TAP | L | wait 5000 | — | DON'T TOUCH / BREATHE WITH THE GLOW | ✎ → Don't touch — breathe with the glow |
| 81 | STACK IT | L | choose | `.blockTray button` | STACK IT | ✓ |
| 82 | SEESAW | L | tap (by beam angle, v1.2.1) | `.nudgeRow button:nth-child(3)` while the beam tilts left (`rotate(-…)`) → `:nth-child(2)` at `rotate(0deg)` → else `:nth-child(1)` | SHIFT IT → / CHECK BALANCE / ← SHIFT IT | ✓ (a "choose" arrow never taught the balance) |
| 83 | SORT STATION | L | choose | `.chuteRow button` | SEND IT | ✓ |
| 84 | MINE / NOT MINE | L | swipe lr 150 | `.ownershipCard` | ← MINE · NOT MINE → | ✎ → Swipe left for mine, right for not mine |
| 85 | CONTROL PANEL | L | choose | `.controlPanelSwitches button` | PICK ONE MOVE | ✎ "Sort the controls" → Pick one move you can make |
| 86 | FACT / STORY | L | choose | `.rubberStamps button` | STAMP IT | ✓ |
| 87 | KEEP / DROP | L | drag ud 140 (own) | `.keepDropCard` | ↑ KEEP · ↓ DROP | ✓ |
| 88 | TRADE MACHINE | L | tap → choose | `.tradeOptions button` (appears after the coin) → `button.coinSlot` | INSERT A COIN → PICK A PRIZE | ✓ |
| 89 | DOOR A / B | L | tap | `button.doorABFrame:not(.exploredDoor)` (first) | PEEK INSIDE | ✓ |
| 90 | COIN FLIP REACTION | L | tap | `button.coin.realFlipCoin` | FLIP IT | ✎ → Tap the coin to flip it |
| 91 | PRIORITY BLOCKS | L | drag u 120 | `.priorityBubbleTray button` | DRAG INTO A SLOT | ✓ |
| 92 | SCALE DOWN | L | choose | `.intensityRuler button` | TAP A NUMBER | ✎ "Slide it down" → Tap how big it feels |
| 93 | SPACE MAKER | L | drag out 90 (own) | `.spaceTile:not(.moved)` | PUSH IT OUT | ✓ |
| 94 | JUGGLE | L | choose → taps ×3 | `.juggleBall.selected` → `.juggleBall` | KEEP ONE → TAP ×3 | ✓ |
| 95 | SHELF IT | L | drag u 120 (own) | `.shelfThoughtBubble:not(.shelved)` | LIFT IT ONTO THE SHELF | ✓ |
| 96 | SCRATCH REVEAL | L | tool → scrub | `button.scratchToolButton` (`.toolArmed`) → `.scratchPlayArea` | GRAB THE SCRATCHER → SCRATCH | ✎ → Grab the scratcher, then scratch the card |
| 97 | X-RAY | L | drag r 180 (own) → tap | `button.xrayBurnAllButton` → `button.xrayScannerHandle` | SCAN IT → → BURN IT ALL | ✓ |
| 98 | MAGIC TRAPDOOR | L | choose → drag d 90 | `button.magicLeverHandle` (when `.magicTrapBubble.selected`) → `button.magicTrapBubble` | PICK ONE → PULL THE LEVER ↓ | ✓ |
| 99 | THE ECHO CHAMBER | L | hold 5000 | `button.echoHoldBubble:not(.gone)` | HOLD TO QUIET IT | ✎ "Hold source" → Hold each bubble until it goes quiet |
| 100 | HOT POTATO | N | drag out 90 (own) | `button.thoughtPotato.hot` | TOSS IT AWAY | ✓ |
| 101 | TUG OF WAR | N | drag l 80 (own) → tap | `button.tugLetGo:not(:disabled)` → `button.tugPullHandle` | PULL ← → NOW LET GO | ✎ "×3" (it is ×6) → Pull left, then let go — 6 times |
| 102 | FINGER TRAP | N | drag r 110 from the left end (`ox -0.4`; the row's own rule: press either END and slide toward its centre — "in" from the arena centre pushed down) (own) | `.ftRow:not(.released)` | PUSH IN · DON'T PULL | ✓ |
| 103 | SINKING PLATFORM | N | tap | `button.spDropButton` | LOWER IT | ✓ |
| 104 | VOLUME KNOB | N | drag d 90 | the first `.knobHitZone` whose `aria-valuenow` > 12 (all must be ≤ 12) | TURN IT DOWN ↓ | ✓ |
| 105 | DRAMA MACHINE | N | tap → tap | `button.dmCutButton:not(:disabled)` → `button.dmDramaButton:not(:disabled)` | MAKE IT DRAMATIC → CUT! | ✓ |
| 106 | TINY SOUNDTRACK | N | choose → taps ×3 | `button.tsndKey:not(.done):not(:disabled)` → `.tsndVibes button` | PICK A VIBE → PLAY ×3 | ✓ |
| 107 | GO WEIRD | N | choose → tap | `.gwCard.weirdWordBubble` (when `button.gwProp.propSelected`) → `button.gwProp:not(:disabled)` (needs §11.6 clip fix) | PICK A PROP → STICK IT ON | ✓ |
| 108 | WORD SALAD | N | tap → tap | `button.uniqControl` (until touch, once) → `.saladBowl button:not(.restored)` (a tap on a card swaps it into its home cell) | SHAKE IT → TAP TO SWAP | ✓ |
| 109 | CLEANSE | N | hold 900 · meter `--hold-pct` | `button.cleanseBubbleHoldButton:not(:disabled)` | HOLD… THEN LET GO | ✎ → Hold… then let go slowly |
| 110 | RAIN OUT | N | drag d 110 (own) | `.rainCloudUnit:not(.pulled)` | PULL IT DOWN ↓ | ✓ |
| 111-120 | new EOS games | N | from `data-eos-*` (needs I1-E11; preview mode = `EosEnginePreview`) | `[data-eos-target="1"]` (all of them for `choose`) | per §8 | per §8 |


## 11. Existing-game fixes (`src/eos/60_eos_fixes.jsx`, task `fixes`; source edits only in integration I3)

Nothing is removed. Every fix is data, CSS or a read-only guard, wired by the integration steps.

### 11.1 Wrong guide texts → `EOS_HINT_FIX` (module top level: `Object.assign(SHORT_HINT, EOS_HINT_FIX)`)
`shortHint()` prefers `SHORT_HINT`, and both wrappers build the LIVE GUIDE line from it (`globalReleaseGuideText` L2200 and `globalReleaseGuideTextLegacy` L14506), so this fixes the panel for all ids at once.
```js
const EOS_HINT_FIX = {
    3: "Grab the hammer, then tap each egg 3×", 4: "Grab the boot, then stomp each bubble 3×", 5: "Tap to swing",
    6: "Tap the zapper 3×", 8: "Pull the rock down, then let go", 9: "Grab the laser, then tap each bubble 3×",
    11: "Hold, then let go when the needle is in the green", 12: "Tap the paddle 3×", 14: "Tap the glowing corner",
    16: "Light the torch, then tap each ice cube 3×", 17: "Tap the glowing weak spot", 19: "Grab the eraser, then rub each word",
    20: "Tap the glowing shape", 21: "Drag each word into the bin", 28: "Open the drawer, then drag the card down",
    30: "Tap zoom-out 4×", 31: "Drag the card down and to the right", 33: "Snip the glowing string",
    36: "Drag the cloud slowly to the right", 37: "Tap the glowing floor", 38: "Open, drop the card in, close",
    40: "Fold both wings, then swipe the plane right", 41: "Tap each bubble 3× to cut its strings", 42: "Drag the glowing knot",
    43: "Grab the scissors, then tap each word 3×", 48: "Peel the sticker up and to the right", 51: "Tap the glowing view",
    53: "Tap 4× to make it silly", 54: "Tap the dial 4×", 55: "Tap each glowing switch", 56: "Tap a verdict",
    57: "Tap rotate 3×", 58: "Tap the focus knob 4×", 60: "Tap the glowing corner", 61: "Tap each word 3× to freeze it",
    63: "Tap the glowing portal", 66: "Hands off — breathe with the glow", 67: "Tap left, then right — 8 times",
    69: "Tap slowly — one tap per pulse", 74: "Pop the glowing bubble", 76: "Tap rewind 4×",
    80: "Don't touch — breathe with the glow", 84: "Swipe left for mine, right for not mine", 85: "Pick one move you can make",
    90: "Tap the coin to flip it", 92: "Tap how big it feels", 96: "Grab the scratcher, then scratch the card",
    99: "Hold each bubble until it goes quiet", 101: "Pull left, then let go — 6 times", 109: "Hold… then let go slowly",
}
```

### 11.2 Progress never goes backwards → `eosGateProgress(ref, value, fromSfx)`
Root cause (verified, both wrappers): `wrappedSfx` adds `gameProgressStep` on every sfx call for the 67 non-explicit games, then the engine's own `report()` sets a lower absolute value (CRUSH 15 → 30 → 45 → **17**). Fix:
```js
const EOS_PROGRESS_OWN = new WeakMap() // progressRef → highest value the ENGINE itself reported (0 once it reported at all)
function eosGateProgress(ref, value, fromSfx) {
    const v = pct(value)
    const cur = Number(ref && ref.current) || 0
    if (!fromSfx && v <= 0 && cur <= 0) {                 // fresh mount / reset: the engine reports
        EOS_PROGRESS_OWN.set(ref, 0)
        return 0
    }
    if (fromSfx) {
        const own = EOS_PROGRESS_OWN.get(ref)
        // provisional creep: ≤ 12 ahead of the engine; an engine that NEVER reports (50 UNFINISHED SENTENCE
        // receives only entries/onDone/sfx) may creep to 90; never auto-complete
        return Math.max(cur, Math.min(v, own == null ? 90 : own + 12, 96))
    }
    EOS_PROGRESS_OWN.set(ref, Math.max(EOS_PROGRESS_OWN.get(ref) || 0, v))
    return Math.max(cur, v)                                // monotonic
}
```
Wired by I1 (two `replace_all` edits, 2 occurrences each): `reportProgress = (value, nextLabel, eosFromSfx)` uses `eosGateProgress(progressRef, value, eosFromSfx)`, and `wrappedSfx` passes `true`. Result: monotonic bars, taps still give a small visible creep (UNFINISHED SENTENCE goes 0 → 34 → … → 100 instead of sticking at 12), the wrapper can never show `isComplete` (100) before the engine finishes, explicit-progress games are unaffected. Engines must never pass a third argument to `onProgress` (§8.0). The scratch stub in `dev/eos_integrate.py` is this exact algorithm.

### 11.3 Hidden-order games show which one is next (CSS in `EOS_FIXES_CSS`)
Live element gets a gold ring + 1.2 s pulse; non-live ones dim (`opacity:.45; filter:saturate(.5)`). Selectors (verified against source):
```css
${EOS_A} .arena :is(button.paperCorner:not(:disabled), .floorStack button:not(:disabled), .productionStrip button:not(:disabled), button.cropHandle:not(:disabled), .glitchPanel button.live, .orbitButtons button.live, .portalRing button.hot, .defuseZone.active button, .tapOutPads button.eosNext,
  .bossBlob > button.weakSpot:first-of-type:not(.dead), .bossBlob > button.weakSpot.dead + button.weakSpot:not(.dead),
  .balloonRig > button.balloonWeight:first-of-type:not(.cut), .balloonRig > button.balloonWeight.cut + button.balloonWeight:not(.cut),
  .bubbleWrapSheet > button:first-of-type:not(.popped), .bubbleWrapSheet > button.popped + button:not(.popped),
  .tangleBoard > .knot:first-of-type:not(.loose), .tangleBoard > .knot.loose + .knot:not(.loose))
  {box-shadow:0 0 0 3px var(--eos-gold-1),0 0 22px rgba(255,190,80,.75)!important;animation:eosFixesLivePulse 1.2s ease-in-out infinite!important;opacity:1!important;filter:none!important}
${EOS_A} .arena :is(button.paperCorner:disabled, .floorStack button:disabled, .productionStrip button:disabled, button.cropHandle:disabled, .glitchPanel button:not(.live), .orbitButtons button:not(.live), .bubbleWrapSheet > button:not(.popped)){opacity:.45!important;filter:saturate(.5)!important}
@keyframes eosFixesLivePulse{0%,100%{scale:1}50%{scale:1.08}}
@media (prefers-reduced-motion:reduce){ /* same live-element :is(...) list as the first rule */ ${EOS_A} .arena :is(/* live list */){animation:none!important} }
```
The builder writes the live-element list once as a JS constant (`EOS_LIVE_SELECTORS`) and interpolates it into both the highlight rule and the reduced-motion rule. The arrow (§3) resolves these exact live elements. 67 TAP OUT needs the `.eosNext` class from I3.

### 11.4 Tool-first games (3, 4, 9, 16, 19, 43, 96)
- Arrow `tool` stage points at the dock first (§3.10) and re-shows with a wiggle 1.2 s after a tap on a target that did nothing.
- CSS pulse on the un-armed dock: `${EOS_A} .arena :is(.crackToolDock,.stompToolDock,.laserToolDock,.meltToolButton,.eraseActivateBtn,.cutLoopScissorPicker,.scratchToolButton):not(.selected):not(.active):not(.toolArmed){animation:eosFixesArmPulse 1.4s ease-in-out infinite!important;box-shadow:0 0 0 3px var(--eos-gold-1),0 0 26px rgba(255,200,90,.7)!important}` with `@keyframes eosFixesArmPulse{0%,100%{scale:1;filter:brightness(1)}50%{scale:1.06;filter:brightness(1.25)}}` defined in `EOS_FIXES_CSS` (+ reduced-motion / calm: ring without animation).
- The arrows' stage-advance rule (§3.5) shows the stage-2 arrow (CRACK ×3, RUB IT OUT…) within 350 ms of the tool being armed.

### 11.5 No more "I / am / I", and no crisis words on any game — `EosEntries(raw)` (wired by I2 into `cleanEntries`)
Pure, deterministic, called at render (many times: it reads the in-memory prefs cache).
0. **Safety first (S1), before anything else and regardless of `enrich`:** `const flag = eosTextSafety(raw)` (core; records only the flag type) — if `eosSafetyStrong(flag) || eosSafetyStrong(EOS_STORE.get().safety)` → return `EOS_NEUTRAL_WORDS.slice()` (6 neutral chunks). Every one of the 110 games gets its entries through `cleanEntries`, so this neutralises them all at once, including words typed during play.
1. Returns `null` (original behaviour) when: `eosPrefs().enrich === false`, the text is empty, or it already has ≥ 6 tokens (`tokeniseWords(raw)`). Otherwise:
2. Group tokens into phrases by attaching **leading** stopwords (`i im i'm am is are was a an the to of and so my me it its at in on for with just really very about that this be been feel feeling`) to the next content word, and **trailing** stopwords (after the last content word) to the previous phrase: "i am panicking about tomorrow" → `["i am panicking", "about tomorrow"]`; "so tired of it all" → `["so tired", "of it all"]`. If grouping yields 0 phrases (all stopwords), fall back to the tokens.
3. De-duplicate (case-insensitive).
4. Pad to exactly **6** with the current emotion's `seeds` (`EOS_STORE.emotion || eosDetectEmotion(raw)?.id`), else `EOS_GUIDE_CHAR.seeds`, skipping phrases already present. User chunks always come first. (Seeds are sensations / situations only, core v1.2.)
Engines still receive 6 entries (several layouts assume 6), but never the same word twice. Image-only entries never reach it (they are created by `imageOnlyEntriesForUploads`, not `cleanEntries`).

### 11.6 Occlusion / collapse fixes (CSS; verified by the audits)
```css
${EOS_A} .arena .orbitArc{pointer-events:none!important}                                   /* 8 METEOR: rock covered at all 25 sample points */
${EOS_A} .arena:is(:has(.weakSpot),:has(.spotLamp),:has(.knot)) .uniqWord{pointer-events:none!important} /* 17, 59, 42 */
${EOS_A} .arena .stickerWord{min-width:140px!important;min-height:64px!important;display:grid!important;place-items:center!important} /* 48 collapses to 3×10 */
/* 107 GO WEIRD: .gwGame (overflow:hidden, bottom 630) clips the lower half of every .gwProp (607-661) at 1280×860 — invisible AND untappable.
   PRIMARY fix (works in every browser): make the dock row fit inside the game box. .gwGame is a 3-row grid
   (gap 18px, padding 16/18/14, overflow:hidden) and .gwDock is its last row (margin-top 4px), so tighten the box: */
${EOS_A} .arena.u107 .gwGame{gap:10px!important;padding-bottom:8px!important}
${EOS_A} .arena.u107 .gwDock{margin-top:0!important}
/* if the measured dock bottom is still below the box bottom at either size, the builder adds
   ${EOS_A} .arena.u107 .gwGame{overflow:visible!important} (verify nothing else bleeds) */
/* progressive enhancement only — WebKit/Safari has no overflow-clip-margin */
${EOS_A} .arena.u107 .gwGame{overflow:clip!important;overflow-clip-margin:72px!important}
/* 11 PRESSURE POP: the release window is also striped, not colour alone */
${EOS_A} .arena .pressureCapsule{background-image:repeating-linear-gradient(135deg,rgba(255,255,255,.22) 0 6px,transparent 6px 12px)!important}
```
Lead verification (live, this commit): with the first two rules injected, every sample point of `.meteorRock`, all 5 `.weakSpot`, `.spotLamp` and all 3 `.knot` hit-test to the element itself (before: 0 / 25 points for METEOR). For 107 the builder must confirm all five props are fully visible and hittable at 1280×860 **and 390×844 in WebKit as well as Chromium** (Playwright `webkit` is not installed here: verify the lift alone, with the `overflow-clip-margin` rule removed, in Chromium); measure `.gwDock` bottom ≤ `.gwGame` bottom at both sizes. For 11 the builder screenshots the capsule and adjusts the stripe rule to the real window element if `.pressureCapsule` is the whole capsule.

**Foundation sweep additions (§0.5):** 14 CRUMPLE (clip-path clips the corners), 21 BIN (`transform:none!important` freezes the drag), 51 MIRROR FLIP (stage over the ABOVE button), 77 SLOW MOTION (brake parked outside its clipped gate), 109 CLEANSE (release race → stuck at 100 %), and at 390×844 45 MAGNETS (orb off-screen), 47 UNFOLLOW (word over the plug), 71 DEFUSE (clipped button), 103 SINKING PLATFORM (button below the viewport) — evidence and suggested fixes in the §0.5 table; `node dev/eos_drive.mjs sweep --ids <ids> --size 390x844` is their regression test.

### 11.7 `EosLegacyGuards({game, hostRef})` (mounted by I1 in the play fragment)
- **Hold release guard** for 11, 13, 39, 65 (legacy `U` hold buttons have `onPointerUp` only, so sliding off keeps charging): on capture `pointerdown` inside `.arena button.uniqControl` remember the pointer; on window capture `pointerup`/`pointercancel` whose target is not inside a `.uniqControl`, dispatch `new PointerEvent("pointerup", {bubbles:true, cancelable:true, pointerId, clientX, clientY, isPrimary:true})` on the **current** `.arena button.uniqControl` (re-queried: `U` remounts every render). React's root listener runs the original handler.
- **"almost!" feedback (never "wrong")** — when a touch or release produces no progress within 500 ms, show the game's line near the touch point (`EOS_FIXES_ALMOST`):
  | id | condition | line |
  |---|---|---|
  | 11 PRESSURE POP | release outside the window (reads `--p`) | "almost! let go on green" |
  | 13 SQUASH · 65 PAUSE | release before the hold completed (`13`: 1300 ms, `65`: 2400 ms) | "keep holding…" |
  | 36 CLOUD PASS | a drag faster than the rule (the arrows' speed gauge shows amber) | "slower… 🐢" |
  | 64 RED LIGHT | a tap while `.trafficLamp:not(.p0)` | "wait for red…" |
  | 69 PULSE | a tap < 650 ms after the previous one | "wait for the pulse…" (+ a ring flash on the next pulse) |
  | 70 METRONOME | an off-beat tap | "every other beat ♪" |
  | 66 BUFFERING · 80 DON'T TAP | 2 restarts of the round in a row (a touch restarts it, L16277 / L16639) | "almost — hands off for a moment" |
  Rendered in the guard's own `div.eosGuardLayer` (`pointer-events:none`, z 58, `aria-live="polite"`), 14 px, fades in 900 ms; at most one line per 2 s.
- **68 DRUM IT sounds like a drum kit (P2):** on capture `pointerdown` of `.drumKit button:nth-child(n)` play `eosTone` kick / snare / hat / clap (n mod 4) when sound is on (the game's own `sfx("tap")` still plays).
- Exports `eosExpose("fixes", {EOS_HINT_FIX, eosGateProgress, EosEntries})`. (`eosMeterWord`, used by I1-E13 for the legacy HUD's "SLOW-DOWN · 33%", lives in core.)

### 11.8 Source fixes (integration I3 only; behaviour-preserving improvements)
| game | change | why |
|---|---|---|
| 67 TAP OUT | add `className={step % 2 === 0 ? "eosNext" : ""}` to LEFT and `step % 2 === 1` to RIGHT | the next side was invisible |
| 11 PRESSURE POP | window 62-88 → **55-92**; a miss keeps `min(meter, 40)` instead of resetting to 0 | the 0.3 s window + full reset punished exactly the panicking player |
| 21 BIN | drop margins 32/32/34/46 → **70/70/80/90** px around the mouth | generic drags missed the 32 px window (audit) |
| 99 THE ECHO CHAMBER | release/leave no longer resets the bubble's fill (`stopEchoHold(true)` → `false` in the 3 JSX handlers) | mobile finger jitter reset 5 s holds |

### 11.9 Positive endings for every game
Every game — all 110 existing and the 10 new ones — now moves visibly from negative to positive through the shared layers, without touching engines: the **colour script** slides the feeling's palette to its calm palette as progress rises (§5.6), the Thought Dust slows with progress (§5.2), the companion's face goes loud → calm at ≥ 67 % (or loud → "spent" in smash games for anger, calm only in the cool-down, §6.5), the Still Point **blooms** at the finish while three positive words rise out of it (§5.6), and the reveal names the new state ("ANGER 8 → 2 · COOL — RUSH handed back the controls ✦", §6.6). 94 JUGGLE and 108 WORD SALAD (which keep / rebuild the negative words) are in `EOS_VAULT` (never auto-routed; still playable).

### 11.10 Acceptance (fixes)
CRUSH, PIN POP, ARCHIVE, TAP OUT: logged `aria-valuenow` never decreases over a full play and never hits 100 before `onDone`; UNFINISHED SENTENCE's bar reaches > 12 before the finish; every id in `EOS_HINT_FIX` shows its new line in the LIVE GUIDE; the live-highlight selectors match exactly one element in 14, 17, 20, 33, 37, 42, 51, 55, 60, 63, 71, 74 at start; "i am panicking" → `cleanEntries` gives 6 unique chunks starting with "i am panicking", "about tomorrow"; ≥ 6-token text is unchanged; **"i want to die" → `cleanEntries` gives `EOS_NEUTRAL_WORDS` (any length, with `enrich` on or off)**; sliding off the PRESSURE POP button stops charging; each `EOS_FIXES_ALMOST` line appears for its condition (11, 13, 36, 64, 65, 69, 70, 66/80); all five GO WEIRD props hittable at both sizes with the clip-margin rule removed; the legacy HUD reads "{meter word} · n%" after a check-in.

---------------------------------------------------------------------------------------------------

## Owner decisions (delegated to the lead, binding for builders and reviewers)
- 2026-10-08 · Dots / Still Point colour: the core travels from the feeling's own hue to the hue of that feeling's calm grade (§0.2: anger red → teal, panic → dawn gold, sad → peach; numb grey → colour), taking the hue path that avoids yellow-green. This supersedes the "always ends on cyan 190" line in §5.2. Reviewers must not flag it.
- 2026-10-08 · Release 1 scope: see the workflow SCOPE note (games 115-120 and flipdata deferred to release 2; router and rewards degrade gracefully).
- The lead decides all remaining open design questions in favour of: clearer first-time guidance, faster felt relief, warmer Pixar / Inside Out look, and never removing existing functionality.
