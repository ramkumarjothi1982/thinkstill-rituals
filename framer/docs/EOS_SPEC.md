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
## 1. Scores + rationale

Both proposals are strong and agree on the big moves (universal arrow overlay beside `.releaseGameHost`, ID-boosted CSS floor, converging dots into a breathing centre, emotion check-in as an overlay, routing by intensity band, physiological-sigh game, no dark patterns). They differ in *world*, *technique* and *rigour*.

| criterion (1-10) | `design_relief.md` | `design_pixar.md` | why |
|---|---|---|---|
| Relief efficacy | **9** | 8 | Relief has 12 states with per-band routing and a mandatory anger cool-down offer, the user-driven double inhale (not an automatic "hiccup"), first-person safety lexicon, word-repetition defusion grounded in Masuda 2004. Pixar adds the brilliant **Still Moment** (one regulated breath / hand-on-heart after *every* game, turning any smash game into discharge → down-regulate without touching engines) but folds lonely + numb into one "EMPTY" orb although they need opposite regulation (connect vs up-regulate). |
| Fun / dopamine | 8 | **9** | Relief: ⚡ round-spark pour, combo floaters, Supercell juice. Pixar: live **companion** that visibly relaxes as you play, orb-dive transition, erupt-then-cool volcano, bonds that unlock new faces, core-memory gold rim. |
| Pixar / Inside-Out quality | 6 | **10** | Pixar gives a world bible (HQ, the **Still Point**, Thought Dust, the 7-character cast already in the arcade), a gold glove-hand arrow, a motion grammar and scene-based games. Relief's "guide spark" orb and grid of chips is functional but generic. |
| First-time clarity | **9** | 8 | Relief: 16-gesture grammar, show/hide/re-show/escalate lifecycle with a spotlight mask, live hold ring for hold games, usable-element rules. Pixar: the universally understood glove hand and **missed-tap detection** (re-show 1.2 s after a tap that missed) which fixes every "silent fail" game. |
| Buildability | 7 | **8** | Relief: very precise anchors but 16+4 arcade edits, a stubs file and an HUD replacement (`EosPlayHud`) that rewires scoring. Pixar: fewer edits, compositor-only "lane scaling" dots, per-game CSS scoped inside each engine file; minus one point for widening the framer-motion import (unnecessary risk) and an `engine:"EOS"` that needs an extra arcade edit. |
| **Total** | 39 | **43** | |

**Decision: the Pixar design is the backbone** (world, cast, Still Point, check-in storyboard with NOT SURE in the centre, glove-hand arrow look, companion, Still Moment, bonds, lane-scaling dots, vault concept, module layout). **Grafted from the relief design:** the 12-state model (lonely ≠ numb; jealous, fear, good kept), high/mid/low routing bands with act-2 rules, the 16-gesture grammar + lifecycle + spotlight + live hold ring, the type-token scale and HUD fixes, the monotonic progress fix, user-driven double inhale, score-based detection lexicon + intensity guess, short-input de-duplication, the first-person safety lexicon with an abuse variant, the anti-dark-pattern rules ("pay the ritual, celebrate the shift"), and the ⚡ ritual bonus. **Changed from both:** `engine:"E04"` for new games (already explicit-progress, verified: no arcade CSS keys off `.engine-e04`), no import widening, no HUD replacement (we make the existing HUD readable instead), the dot field mounts **inside `.releaseStage`** (verified: `.shell` paints an opaque `rgb(2,4,7)`, so anything behind `.shell` — like `InfinityField` — can never be seen; `.releaseStage` paints a translucent gradient on itself and the game host/arena are transparent, so a z-0 field inside it is visible behind every game; v1.2: on the *input* stage the opaque `.releaseIdleStage` base hid it, so §5.3 moves that base under the flow), and the vault list is the relief LAB list (27 ids) because §3 and §11 fix the hidden-order and tool-first games that Pixar wanted to bury.

---------------------------------------------------------------------------------------------------
## 2. Experience overview (open app → check-in → matched relief game → shift meter → reward / share)

**One-line loop:** *Name it (1 tap for panic, ≤5 s otherwise) → Play it (20-45 s, an arrow shows every step, the colours move from the feeling's palette to calm) → Feel it (≤7 s from the finish to "ANGER 8 → 2 · COOL") → Keep it (memory orb flies to your shelf, bond, share) → back to life.*

**Voice and copy rules** (lint data in core `EOS_COPY_RULES`; checked in review and by the foundation lint):
- Playful, warm, short, never clinical. Banned words in any EOS copy: *therapy, therapist, patient, symptom, disorder, diagnosis, treatment, exercise, session, homework, intervention, coping skill* — **except** `EOS_DISCLAIMER` and the safety card copy, which must keep "not therapy, diagnosis or a crisis service". Use: *shift, let it out, cool down, lighter, make space, your words, your crew*.
- No invalidating phrases: *calm down, relax, cheer up, don't worry, "just" as a minimiser ("just breathe"), you should, get over it, not a big deal, that's it?, look on the bright side, at least*. For sad and grief the positive flip is *lighter / warmer*, never *happy*.
- No medical claims anywhere in UI, captions or share text (*treat, cure, clinically proven, reduces anxiety disorder, therapy-grade, doctor-approved*). The "Science" notes in §8 are **internal rationale only** and never shown.
- Starters and seeds (they become big on-screen words the user never typed) are sensations, situations or feeling names — never beliefs, blame, catastrophic predictions or self-judgements (core v1.2 table).
- Character names are introduced before they are used: the ring orbs carry a 12 px name tag ("RUSH"); the first-ever step 2 says "Meet RUSH, your anger."

### 2.1 Open the app — HQ
- The console opens on the **Still Point**: a soft glowing core in the middle of the stage that breathes at 6 breaths/min (4 s in, 6 s out, `EOS_BREATH`). **All** Thought Dust (every background dot: the Pixar motes, every game's cinema dust, 109's star tiles, the flow lanes; the big soft bokeh drifts slowly inward too) spirals into that one measured centre (§5). The core is visible on the home screen (the idle stage's opaque base layer moves under the flow, §5.3).
- The **check-in ring** is already there (no extra screen): 8 character orbs on an ellipse around the Still Point, STILL in the centre as **NOT SURE**. Title: **"Who's at the controls?"**, sub-line "Tap the feeling that's loudest right now." A gold "pick one" halo hops across the orbs for first-timers (never a hand on one orb — that would bias the choice). A small "more feelings ▾" chip reveals SCARED, JEALOUS, NUMB; a separate **"☀ good day? bank it"** chip launches COLOUR RUSH in savour mode (habits trained when calm are there when you need them).
- Footer (12-13 px links, ≥44 px hit areas): "just let me play →" (restores today's classic composer flow unchanged) · **"Need to talk to someone?"** · "about ThinkStill" (the disclaimer) · "◐ calm visuals".
- The composer (text, 🎙 mic, ＋ upload, game menu) stays live underneath at all times; nothing about it changes.
- Once per device, a ≤3 s non-blocking cold open: STILL pops up: "Hi, I'm Still. Your feelings are a crew. Tap whoever's loudest." (P2)
- A shared link `…?eos=anger&t=41` preselects that feeling with a banner "A friend shifted ANGER in 41 s. Your turn?" (never a comparison).

### 2.2 Check-in — 1 tap (panic) or 2 taps (~4 s) (§6)
1. **Tap a feeling orb.** It flies to the centre with anticipation + overshoot (spring 420/18), grows to 180 px, the others dim (ball only), its character switches to a louder face, a soft chord plays in the emotion's key, haptic tick.
   - **PANIC is an express orb:** one tap = orb-dive straight into the panic hero (BIG SIGH, holdable within 2 s). Long-pressing **any** orb does the same for that feeling. The "before" number is asked afterwards (one chip in the reveal, marked retro).
2. **"How loud is RUSH right now?"** (or the feeling's own question: "How heavy is it?" for sad, "How far away do you feel?" for numb…). `EosIntensityDial` pre-lit at the feeling's `dial` (panic 8, anger 8, … numb 5), or higher when the typed words say so. The dust churns faster at high numbers and the character scales with the number. First-time micro-copy: *"Naming it is the first move."* Optional: "What's it about?" chips + 🎙 (calls the existing mic; first use shows "Voice typing uses your browser's speech service.") + a chevron to the composer. An arrow demonstrates "SLIDE IT" on the dial the first time, then points at the CTA after 3 s idle.
3. **LET'S SHIFT IT ▶** (gold toy button, sub-line shows the routed game: "≈30 s · BIG SIGH", or "your best · COOL THE VOLCANO" when it has helped you most). An **orb-dive** (radial wipe in the emotion hue, 600 ms) launches the routed game through the existing `startThinkStillChoice` path.
- **NOT SURE** → dial "How big does it feel?" → GO; ThinkStill detects from the words (§0.2) or uses the gentle general route.
- "pick a game myself" commits the check-in first, then opens the menu, so the reveal still knows the feeling and the "before".

### 2.3 Play — guided, mirrored, gathered (§3, §5, §6.5)
- The **gold glove hand** appears 0.7 s after the game mounts, *performs* the exact gesture on the live target ("CRUSH ×4", "HOLD THE FLAME", "PULL BACK · LET GO"), and gets out of the way the instant a finger lands; the `×n` badge stays pinned to the target and counts down; drags show a live goal ring and speed gauge. **Every step gets its own arrow:** the moment step 1 is done (tool grabbed, drawer opened, coin inserted, prop picked) the next step's arrow appears within 350 ms. It reappears when the player is stuck (4 s idle, or 1.2 s after a tap that missed).
- The **colour script** (`EosMoodGrade`) tints the whole stage in the feeling's palette and slides it to the calm palette as progress rises — anger red-orange → cool teal, panic storm-violet → dawn gold, numb grey → full colour — so **every one of the 120 games** visibly moves from negative to positive while you play.
- The checked-in character rides along as the **companion** (72 px, bottom-right; under the HUD on phone): loud face → softer → calm as progress rises, with its own voice lines ("slower… nice", "static clearing…"). It hides when the game's scene already stars that character. After a smash game with anger it goes loud → "spent" and says "nice hit — now let it cool"; it only reaches its calm face in the cool-down.
- Thought Dust keeps flowing into the Still Point behind the game, slowing as progress rises. On finish the dust **gathers**, the core **blooms** and three positive words rise out of it ("cool · clear · strong") while the wrapper's existing reward burst plays.
- HUD text is readable (13-18 px), progress never jumps backwards, the user's words are ≥16 px, nothing flashes more than 3×/s.

### 2.4 Reveal — the shift you can see (§6.6, §9)
1. **Still Moment** — only when it adds something: after a discharge / destroy game, or at high intensity for panic, anger, fear and overwhelm; **never** after a breath or slow game (111, 112, 109, 65, 66, 69, 80, 36, 44). Tap anywhere to skip, from 0 s. Framed as play, not instructions: *sigh* = "blow the memory orb home" — hold to fill it (1.6 s), slide up for one more sip (0.5 s), let go for a long linear blow (4.4 s) that sends it toward your shelf; *heart* (sad, lonely, shame, jealous) = "Thumb on the orb — and if you like, your other hand on your own chest"; *spark* (numb, good) = tap the orb 3× on its pulse. Heart and spark finish by themselves at 6.5 s. Anger after a smash game always gets the **cool** variant (2 sighs ≈ 13 s, still skippable). Veterans (≥5 loops) get a one-tap chip "one big sigh? ›" instead of an auto-start (except the anger cool variant).
2. **"How loud is RUSH (anger) now?"** — ONE dial, starting empty, a gold ghost marker at *before*. Dragging it turns the feeling down by hand: the character shrinks and calms with the number and the dust slows. When there was no check-in (or an express launch), a chip under it says "you came in at about 7 · change". A "skip" link is always there.
3. **Payoff (≤1.2 s):** the number counts `8 → 3`, then resolves on a rising major arpeggio + chime + haptic; stamp **"5 LIGHTER ✦"** (or "3 BRIGHTER ✦" for GOOD); headline **"ANGER 8 → 3 · COOL"** with "RUSH handed back the controls ✦" — the character slides aside and STILL (calm face) takes the centre: *who's at the controls* is answered. Δ ≤ 0: "RUSH is still here — that's okay. Some feelings need a different door." (never failure language). Optional one personal line from the owner's ritual library (§9.6). The ThinkStill 3-note shift sting plays (the sound signature).
4. **The memory orb flies into the ◉ shelf chip**, which bumps "+1". Rewards line: "+1 memory orb · RUSH bond 2 · ☀ 4 days this week · +25 ⚡ for showing up".
5. **Buttons (max 3):** **I'M GOOD ✓** (primary, gold, = `clearForNext`), **ONE MORE ▶** (act 2 from the router; anger after a smash game reads **COOL IT DOWN ▶**), **SHARE MY SHIFT** (canvas card "ANGER 8 → 2 in 41 s", never the user's words; for shame, lonely, sad and fear it becomes a secondary "make a card" link). "↻ same game" and "Need to talk to someone?" are text links. While the meter runs, the old reveal copy (`RELEASE COMPLETE · +554`, the final-message line, PREVIOUS/NEXT) is hidden and the floating faces dim; they return after the payoff.
6. After 3 loops or 10 minutes: *"You've shifted 3 times — nice. Take the calm with you?"* — I'M GOOD becomes the only primary.

### 2.5 Skip path and classic mode
"just let me play →" sets `phase:"skip"` for the app session; the stage shows the original idle story and composer flow. A "How are you feeling?" orb chip (top-left of the stage, z 32) reopens the check-in at any time. Games launched without a check-in still get detection (copy/sparks follow the detected emotion), arrows, colour script, readable text and dots; the reveal shows the same one dial plus the "you came in at about N · change" chip (the row is marked retro).

### 2.6 Safety (§10)
Help is always one tap away ("Need to talk to someone?" on the check-in, reveal and shelf). If the words contain self-harm, suicide, abuse or a real-threat phrase — checked **synchronously** at every launch, not only after typing pauses — a calm card slides in at the top of the stage: "That sounds really heavy. You deserve real support right now." with the local support line first as a one-tap call and **I'm safe — keep playing**. It never blocks play and never steals focus while you type. Routing switches to gentle games, **the user's words are replaced on every game by neutral ones** ("We've kept your words off the game for now."), and the share card is muted. After dismissal a small "💛 support" pill stays for the session.

---------------------------------------------------------------------------------------------------
## 3. Guide arrows (`src/eos/30_eos_arrows.jsx`, task `arrows`)

### 3.1 What the player sees
One arrow at a time, aimed at the **live** target, demonstrating the exact gesture:
- **Hand** `svg.eosHand`: chunky white cartoon glove, 3 px `#1b1650` outline, soft drop shadow, −15° tilt, 64 px (52 px ≤700 px wide). Hotspot = fingertip; the hotspot sits on the target point.
- **Chevron** `svg.eosChevron`: 44 px gold 3D arrow (gradient `--eos-gold-1 → --eos-gold-3`, 3 px white stroke, `drop-shadow(0 4px 0 rgba(90,30,0,.55))`), bobbing 8 px toward the target (or pointing along the drag direction at the end of the path).
- **Label** `.eosLabel`: Baloo 2 900, **15 px** desktop / **14 px** phone, uppercase, letter-spacing .06em, white on `rgba(16,14,48,.92)`, 2 px `#FFD36B` border, radius 999, padding 8×14, lip `0 4px 0 rgba(8,6,30,.7)`. 2-4 words, ≤ 22 characters, imperative and playful.
- **Count badge** `.eosCount`: gold 26 px disc "×3". For `taps` stages it **stays pinned to the target's top-right corner for the whole stage** (the hand and label fade on touch, the badge does not); on each counted tap it pops (`scale 1.25 → 1`, 160 ms) with `eosTone(eosNote(n − left))`; at 0 it bursts into a gold ✓; it hides when the stage changes. For 116 the badge shows seconds left, not taps.
- **Trail** `svg path.eosTrail`: 4 px gold dashed (`6 10`), animated `stroke-dashoffset`, drawn along the drag path; drop zones get a pulsing dashed outline + "DROP HERE" tag.
- **Ripple** `.eosRing`: two rings scale .4 → 1.7, opacity .9 → 0, 900 ms (taps).
- **Live hold ring** `.eosHoldLive`: appears at the finger while a `hold`/`holdRelease` target is actually pressed; fills over `ms`; turns green and says "LET GO!" inside a release window (§3.6).
- **Live drag goal** `.eosDragGoal` (new): while a `drag`/`slow`/`swipe`/`sling` target is pressed, an end-point ring sits at `d` along `dir` and a trail fills with the finger's projected distance; at the threshold the ring flashes green (sling also shows "LET GO!"). For `slow` (and any stage with `maxSpeed`) the trail doubles as a speed gauge: green under `maxSpeed` px/s (CSS px ÷ `eosStageScale`), amber above with "slower… 🐢".
- **Spotlight** `.eosSpot` (level 3 only): everything except a circle around the target dims to 62 % black for 2.4 s.
- **Success tick** `.eosOk`: a small gold ✓ sparkle at the last target when progress rises (450 ms).
- **Screen-reader line** `div.eosSrOnly[aria-live="polite"]`: the current label (+ " · 3 left" for `taps`), updated only when the label changes, at most every 1.5 s.

### 3.2 Mount and architecture
- One component `EosGuideArrows({ game, entries, hostRef, reduced })`, mounted by I1 as a sibling of `.releaseGameHost` inside `section.releaseStage` (anchor §12 I1-E3, keyed by `${id}-${variationSeed}-${materialRevision}` so it remounts with the engine). This covers **both** wrappers (ids 1-99 legacy, 100-110 new, 111+ EOS once I1-E11 has landed) with one edit.
- Root `div.eosArrowLayer` `position:absolute; inset:0; pointer-events:none; z-index:60` (the host is z 2 with its own stacking context, so z 60 is above every game layer; `.tsPxRig` z 2147483000 is pointer-transparent above it).
- **Read-only DOM.** It never writes into `.cinematicContentShell` (the wrappers' MutationObservers and collision solver would react). Signals it reads: `[data-eos-target]`, `.engineProgressTrack[aria-valuenow]` (via `eosProgressOf`), `.globalPlayGuide.isComplete`, `.tsRewardSurge.mega`, capture-phase `pointerdown`/`pointermove`/`pointerup` on `hostRef.current`.
- **Never cache element references across ticks** — legacy `U`/`W` controls are re-created on every render (verified: `const U = (…) => <button className="uniqControl">` inside the render function), so re-query each tick. A target is identified by **(stage index, selector, ordinal among usable matches)**; "the finger is on the current target" = `e.target.closest(stage.t)` (and, for `pick:"near"`, the same ordinal). This keeps the `×n` badge counting on CRUSH, 12, 30, 53, 57 and 76, whose button remounts after every tap.
- **Stand-alone hint for non-game surfaces** (the play overlay only mounts during play): `EosHandCue({x, y, g, label, n, dir, d, ms, reduced})` (presentational: the same hand, chevron, label, ring, badge, hold ring at absolute stage coordinates) and `EosHandHint({target /* Element | selector | Element[] for choose */, root, g, label, n, ms, dir, d, reduced, showAfterMs = 600, idleMs = 3000})` (positions an `EosHandCue` with `eosRelRect(target, root)`, `pointer-events:none`, hides on any pointerdown inside `root`, re-shows after `idleMs` without input; for `g:"choose"` the gold halo hops across every element and the hand rests on the middle or on a `rest` element). The check-in, Still Moment and shift meter render `eosApi("arrows").EosHandHint` when present (else nothing / a CSS chevron).
- Exports: `EOS_GESTURES`, `EOS_GLYPH_OVERRIDE`, `EosGestureFor(game)` → `{stages, glyph, own}`, `eosGlyph(game)` (glyph for the LIVE GUIDE panel, §3.7), `EosGuideArrows`, `EosHandCue`, `EosHandHint`, `EOS_ARROWS_CSS` (registered with `eosCss("arrows", …)`), and `eosExpose("arrows", {EOS_GESTURES, EosGestureFor, eosGlyph, EosHandCue, EosHandHint, state: () => lastViewForTests})` where `state()` returns `{visible, g, label, stage, targetSelector, x, y, inViewport, count}` for the test harness. In dev (`eosIsDev()`), ids whose arena never resolved are pushed to `window.__eosArrowMiss` (created if absent).

### 3.3 Gesture grammar (`g`) — demo animation, label default, completion
| `g` | used for | demo loop (period) | default label | stage satisfied |
|---|---|---|---|---|
| `tap` | single taps | hand dips 14 px, scale .9, ripple; 1.2 s | `TAP IT` | progress rises or pointerdown on target |
| `taps` (`n`) | **rapid-tap** one target N× | 3 quick dips in 0.6 s + pinned `×n` badge; 1.4 s | `TAP ×n` | badge counts pointerdowns on the same target identity (§3.2) |
| `hold` (`ms`) | press-and-hold | hand presses and stays, conic ring fills over `min(ms,3000)`, release flash; `ms+900` | `HOLD` | progress rises during the press |
| `holdRelease` (`ms`, `meter`, `mvar`, `win`) | hold, then release in a window | as hold; the ring has a green striped arc for the window; the label flips `HOLD…` → `LET GO!` | `HOLD… LET GO ON GREEN` | progress rises |
| `drag` (`dir`, `d`) | move past a threshold | hand presses (scale .86), travels `d` px along `dir` on a slight arc in 1.0 s, rests .2 s, fades; trail draws with it; 2.0 s | `DRAG →` (arrow from dir) | progress rises |
| `dragTo` (`to`) | drop onto a zone | curved path from target centre to the `to` element centre (control point lifted 25 %); the zone pulses | `DROP IT IN` | progress rises |
| `slow` (`dir`, `d`, `ms`, `maxSpeed`) | **must be slow** (36 CLOUD PASS, 44 VELCRO, 112 cool-down) | drag at 1.8 s travel with wide 🐢-paced trail dots; live speed gauge | `DRAG… SLOWLY` | progress rises |
| `swipe` (`dir`, `d`) | fast fling | like drag at 0.34 s with 3 ghost copies | `SWIPE →` | progress rises |
| `sling` (`dir`, `d`) | **slingshot** pull back + release | hand pulls along `dir`, 2 elastic band lines stretch from the anchor, release flash, a dotted arc flies the opposite way; 2.2 s | `PULL BACK · LET GO` | progress rises |
| `scrub` | **trace** / rub / scratch | zig-zag ±40 px × 3 over the target in 0.9 s | `RUB IT OUT` | progress rises |
| `timing` (`bpm` or `lit`) | **rhythm**: tap slowly / only when lit | ring pulses at `bpm`; with `lit` (selector) the label alternates `WAIT…` / `NOW!` as the lit element appears | `TAP… SLOWLY` | progress rises |
| `alt` | alternate two pads (67) | hand hops between pads every 0.7 s, starting on `.eosNext` | `LEFT · RIGHT` | each tap |
| `choose` | pick 1 of N | gold halo hops across all matches (0.38 s each); hand rests on the middle one; chevron above the group's bounding box | `PICK ONE` | pointerdown on any match |
| `seq` | fixed-order taps | like `tap` + a number badge; the selector always resolves to the live element | `TAP THE GLOWING ONE` | re-resolves on DOM change |
| `tool` (`armed`) | **tool-first** (arm a tool, then hit targets) | like `tap` on the tool dock + a 3-shake wiggle if the player tapped a target first | `GRAB THE TOOL` | the dock element matches `armed` (`.selected`, `.active`, `.toolArmed`) |
| `wait` (`ms`) | do not touch (66, 80) | no hand: a cyan ✋ palm in the arena centre inside a ring that breathes **with the global pacer** (`eosBreathPhase()`, never faster than 8 s per breath) + a separate countdown arc of the round's `ms`; a touch makes the palm shake gently | `HANDS OFF` + second line `BREATHE WITH THE GLOW` (`L2`) | timer (stays until complete) |
| `type` | text entry (50) | blinking caret glyph + chevron at the first empty input | `TYPE A FEW WORDS` | an input has ≥2 characters |

Direction tokens: `r l u d ur ul dr dl` fixed; `lr` / `ud` double-headed (demo alternates); `out` = from the arena centre through the target; `in` = from the target toward the arena centre. Travel `d` is desktop px; on phone use `max(60, d × 0.75)`, clamped so the path stays inside the stage but never shorter than the game's own threshold (listed in the table).

### 3.4 Target resolution (each tick)
1. `arena = host.querySelector(".cinematicContentShell > .arena")`; if absent keep polling 250 ms (give up silently after 3 s; in dev push the id to `window.__eosArrowMiss`).
2. **Explicit markers first:** `arena.querySelectorAll('[data-eos-target="1"]')` (all new games). Fields come from `data-eos-g / dir / d / n / ms / to / bpm / label / win / meter / mvar / armed / max-speed / own / ox / oy`. When the first marker's `g` is `choose`, every marker is an option (engines mark every option); otherwise the first marker wins.
3. **Per-game stages** `EOS_GESTURES[id]` (priority order). A stage is eligible when: `when` (if given) matches something in the arena; it is not `once`-satisfied; its `until:"touch"` is not satisfied in the current cycle; for `tool` stages, the resolved element does NOT match `armed`. The first eligible stage whose selector yields a **usable element** wins. Stages are written so the most-advanced state comes first (e.g. 101 lists LET GO before PULL), so no counters are needed for most games. A cycle resets (`until` cleared) whenever progress increases.
4. **Which match:** `pick:"first"` (default for `seq`, `tool`, ordered games) = first usable in DOM order; `pick:"near"` = nearest to the last pointerdown (stage centre before any touch); `choose` uses all usable matches (max 6).
5. **Usable element:** rect ≥ 12×12 px and intersects the stage; computed `visibility` visible, `display` not none, opacity ≥ .05 (checked up to 3 ancestors); not `:disabled`, not `[aria-disabled=true]`; not inside `.globalPlayGuide`, `.engineProgressHud`, `.tsShiftRewardHud`, `.eosArrowLayer`; class does not match `/\b(dead|gone|popped|cut|loose|released|pulled|done|isDone|isGone|melted|binned|cooled|exploredDoor|shelved|severed|erased|moved|restored)\b/` (the last five added by the foundation sweep, §0.5). Hit test `document.elementFromPoint(centre)` must be the element or inside it; if not, try the 4 points at 25 %/75 % and **aim the hand at the first sample point that hits**; if all fail keep it but mark `occluded` (dev log) — §11.6 fixes the known occlusions. (Lead live check of this table on all 110 games, 1280×860, text "my boss yelled at me and I feel panic": 110/110 resolve a usable element for the active stage; 106/110 hit-test at the centre; the 4 exceptions are 8, 17, 59 — fixed by §11.6 — and 107, whose props are clipped below their centre — fixed by §11.6 and handled meanwhile by the sample-point rule.)
6. **Fallback** (ids with no table entry or a stale selector): `.arena button:not(:disabled)`, `button.uniqControl:not(:disabled)`, `.arena [style*="touch-action: none"]`, `.uniqWord`, `[class*=ToolDock]`, `.tsThoughtLabelHost`, `[class*=ToolButton]`, `[class*=ActivateBtn]`, `button.wordBubble`; gesture `tap`. If nothing qualifies show **no** arrow (never a wrong one).
7. **Coordinates:** `eosRelRect(el, stage)` (divides by the Framer canvas scale). The target point is the centre plus optional `ox/oy` (fraction of width/height).
8. **Label placement:** 18 px above the target if there is ≥ 64 px of room, else below; clamp 12 px inside the stage; if it would overlap `.globalPlayGuide`, `.engineProgressHud`, `.tsShiftRewardHud`, `.eosCompanion`, `.eosSafetyCard`, `.eosSupportPill`, `.eosWorldChips` or the target itself, flip to the other side / opposite horizontal side.
9. **Label text:** stage `L`; `L:"@text"` = the element's own text with the `THOUGHT MOVE · ` prefix removed, upper-cased, ≤ 22 chars.

### 3.5 Lifecycle (helps without nagging)
| moment | behaviour |
|---|---|
| mount | wait 700 ms (games animate in; 500 ms for 111), resolve, pop in (spring 260 ms). Level 2 (hand + chevron + label) for the first plays of this game (`eosLearnedCount(id) < 2`); level 1 (hand + chevron, no label) for veterans. **`own:true` games** (whose built-in cue is tiny) get level 2 while `eosLearnedCount(id) < 1`, then level 1. Veterans' first show lasts 2.5 s only. |
| finger down anywhere in the host (capture) | fade the hand + label out 160 ms (the `×n` badge stays). If inside the current target: advance `until` / decrement the badge. If it **missed** the target and no progress follows within 1.2 s → re-show immediately with a 3-shake wiggle (covers every silent-fail game: hidden order, tool-first, "taps before arming"). |
| **stage advance** (new) | 350 ms after every `pointerup`, re-resolve. If the winning stage **index** or its resolved target identity changed, re-show **immediately** at the current level with the new stage's label and a fresh `×n` badge — whether or not progress rose. Not an idle re-show (no level escalation). Covers GRAB THE HAMMER → CRACK (3, 4, 9, 16, 19, 43, 96), OPEN → FILE (28, 38), FOLD → THROW (40), INSERT A COIN → PICK (88), PICK → PULL / STICK / PLAY (98, 107, 94, 106), CATCH → NAME (72), and every new game's phase change (data-eos markers move). |
| progress increases | gold ✓ sparkle at the last target, stay hidden, re-resolve silently (the stage-advance rule decides whether to re-show). |
| idle | **re-show after 4 s** with no progress change and no touch (6 s for veterans). Each re-show raises the level: 2 → 3 (spotlight for 2.4 s on the 3rd re-show, then back to 2). |
| `g:"wait"` | shown from the start and stays until complete. |
| complete | stop for good when `.globalPlayGuide.isComplete` or `.tsRewardSurge.mega` appears, or stage ≠ play. |
| performance | measure at ~20 Hz while visible (every 3rd rAF), 4 Hz while hidden; one element measured per tick; `setView` only when the rounded geometry/label changes (≥ 2 px). No MutationObserver on `style`. |

### 3.6 Live hold ring, drag goal, meter windows
On `pointerdown` inside a `hold`/`holdRelease` target, render `.eosHoldLive` at the pointer: an SVG ring that fills over `ms` (or follows a real meter when the stage gives `meter` + `mvar`, e.g. 11 PRESSURE POP reads `--p` on `.pressureCapsule`, 65 PAUSE reads `--p` on `.pauseRing`, 109 CLEANSE reads `--hold-pct` on the pressed button). For `holdRelease` the ring shows the `win` arc in green **with diagonal stripes** (not colour alone) and the label flips to **LET GO!** while the meter is inside the window. Fades on `pointerup`. This gives visible hold feedback to 11, 13, 18, 39, 65, 99, 109 and every new hold game. On `pointerdown` inside a `drag`/`slow`/`swipe`/`sling` target render `.eosDragGoal` (§3.1) the same way; it reads `pointermove` in capture and never writes to the game.

### 3.7 The LIVE GUIDE panel arrow (both wrappers)
- `eosGlyph(game)` → `EOS_GLYPH_OVERRIDE[id]` first (the stage that is live **at progress 0** for games whose table lists the advanced stage first): `{88:"☝", 94:"◎", 97:"→", 98:"◎", 101:"←", 106:"◎", 107:"◎"}`; else the first stage of `EosGestureFor(game)` → drag `→ ← ↑ ↓ ↗ ↘ ↙ ↖ ↔ ↕` (`out` ⤢, `in` ⤡); tap/taps/seq/timing/tool → `☝`; hold/holdRelease → `◉`; choose → `◎`; scrub → `〰`; sling → `↶`; swipe → `⇢`; alt → `⇄`; wait → `✋`; type → `✎`. Ids ≥111 read `EOS_GAME_META[id].gesture` (set by `eosRegisterGame` opts.gesture), default `☝`.
- I1 inserts `<i className="guideActionArrow" aria-hidden="true">{eosGlyph(p.game)}</i>` in the legacy card and turns on the dead `id < 100` gate in the new card; I1-E12 stops `releaseGestureForGame` from prefixing a contradictory regex arrow ("↓" for 112's "cloud", "↗" for 118's "far away") to new games' guide text. Legacy CSS for `.guideActionArrow` exists only under `.releaseGlobal99Upgrade` (`GLOBAL_PRE_100_GAME_POLISH_CSS`), so `EOS_ARROWS_CSS` restyles it for **both**: 30 px gold glowing disc (26 px ≤700), glyph 18 px, `eosArrowsGuidePulse` keyframes, and `.guideStepCard{position:relative;padding-left:48px}` scoped `${EOS_A}.stage-play .globalPlayGuide`.

### 3.8 Reduced motion (and calm visuals)
`eosCalm(reduced)`: no travel, ripple, bob, streak or wiggle. The hand sits still on the target (or at the end of the drag path with a static dotted path + arrowhead), the label is shown, a 1.6 s opacity pulse (.6 ↔ 1) is the only animation, the hold ring and drag goal are drawn as static rings that change colour, the spotlight fades without motion. The wait ring keeps the pacer's opacity change and ≤ 4 % scale with a numeric "in 2… out 4…" countdown.

### 3.9 Phone layout (≤ 560 px)
Hand 52 px, chevron 36 px, label 14 px (padding 6×10), badge 22 px. Travel `max(60, d×.75)`. The label prefers the side away from the bottom guide panel (`.globalPlayGuide` sits bottom-left/bottom-full on phone) and never overlaps the HUD row or the companion. Touch targets are untouched (pointer-events none).

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
| 41 | UNHOOK | L | tap (near) | `.unhookStringGrip` | SNAP THE STRING | ✎ → Tap a string to snap its bubble free |
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

### 3.11 `EOS_GESTURES` (paste-ready; `src/eos/30_eos_arrows.jsx`)
Stage keys: `t` selector · `g` gesture · `L` label (`"@text"` = element text) · `L2` second label line (`wait` only, ≤ 22 chars) · `maxSpeed` (px/s, live speed gauge) · `dir`, `d`, `n`, `ms`, `to`, `bpm` · `lit` (timing: selector that means NOW) · `meter` + `mvar` + `win` (hold meter) · `armed` (tool done-state) · `when` (stage eligible only while this selector exists in the arena) · `until:"touch"`, `once:true` · `pick:"near"|"first"` · `own:true` (game draws its own cue → level 1 only) · `ox`, `oy` (target-point offset as a fraction).
```js
const EOS_GESTURES = {
    1: [{ t: "button.popBubbleV2", g: "tap", pick: "near", L: "POP IT!" }],
    2: [{ t: "button.uniqControl", g: "taps", n: 4, L: "CRUSH ×4" }],
    3: [{ t: "button.crackToolDock", g: "tool", armed: ".selected", L: "GRAB THE HAMMER" }, { t: ".crackBubbleSlot", g: "taps", n: 3, pick: "near", L: "CRACK ×3" }],
    4: [{ t: "button.stompToolDock", g: "tool", armed: ".selected", L: "GRAB THE BOOT" }, { t: ".stompBubbleSlot", g: "taps", n: 3, pick: "near", L: "STOMP ×3" }],
    5: [{ t: "button.uniqControl", g: "tap", L: "SWING!" }],
    6: [{ t: "button.zapGroundButton", g: "taps", n: 3, L: "ZAP ×3" }],
    7: [{ t: ".pinTool", g: "drag", dir: "r", d: 130, L: "SLIDE THE PIN →" }],
    8: [{ t: ".meteorRock", g: "sling", dir: "d", d: 110, L: "PULL DOWN · LET GO" }],
    9: [{ t: "button.laserToolDock", g: "tool", armed: ".selected", L: "GRAB THE LASER" }, { t: ".laserTargetBubble", g: "taps", n: 3, pick: "near", L: "ZAP ×3" }],
    10: [{ t: "button.uniqControl", g: "tap", L: "TIP IT OVER" }],
    11: [{ t: "button.uniqControl", g: "holdRelease", ms: 950, meter: ".pressureCapsule", mvar: "--p", win: [55, 92], L: "HOLD… LET GO ON GREEN" }],
    12: [{ t: "button.uniqControl", g: "taps", n: 3, L: "HIT ×3" }],
    13: [{ t: "button.uniqControl", g: "hold", ms: 1300, L: "PRESS & HOLD" }],
    14: [{ t: "button.paperCorner:not(:disabled)", g: "seq", L: "FOLD THIS CORNER" }],
    15: [{ t: "button.shredAction", g: "taps", n: 5, L: "FEED IT ×5" }],
    16: [{ t: "button.meltToolButton", g: "tool", armed: ".active", L: "LIGHT THE TORCH" }, { t: ".cartoonIceCube", g: "taps", n: 3, pick: "near", L: "TORCH IT ×3" }],
    17: [{ t: "button.weakSpot:not(.dead)", g: "seq", L: "HIT THE GLOWING SPOT" }],
    18: [{ t: "button.burnGroundButton", g: "hold", ms: 3000, L: "HOLD THE FLAME" }],
    19: [{ t: "button.eraseActivateBtn", g: "tool", armed: ".active", L: "GRAB THE ERASER" }, { t: ".eraseWordBubble", g: "scrub", pick: "near", L: "RUB IT OUT" }],
    20: [{ t: ".glitchPanel button.live", g: "seq", L: "TAP THE LIT SHAPE" }],
    21: [{ t: ".binWordBubble", g: "dragTo", to: ".binMouthTarget", pick: "near", L: "DROP IT IN THE BIN" }],
    22: [{ t: "button.flushLever", g: "tap", L: "FLUSH!" }],
    23: [{ t: "button.vacuumBtn", g: "tap", L: "SUCK IT UP" }],
    24: [{ t: ".slingshotWord", g: "sling", dir: "dl", d: 110, L: "PULL BACK · LET GO" }],
    25: [{ t: ".swipeCard.physical", g: "swipe", dir: "r", d: 190, L: "SWIPE IT AWAY →" }],
    26: [{ t: ".launchLever", g: "drag", dir: "d", d: 160, L: "PULL THE LEVER ↓" }],
    27: [{ t: ".weightedBlock", g: "drag", dir: "d", d: 130, L: "DROP IT ↓" }],
    28: [{ t: "button.uniqControl", g: "tap", L: "OPEN THE DRAWER" }, { t: ".fileCard", g: "drag", dir: "d", d: 100, L: "FILE IT ↓" }],
    29: [{ t: ".verticalFader", g: "drag", dir: "d", d: 150, L: "SLIDE IT DOWN ↓" }],
    30: [{ t: "button.uniqControl", g: "taps", n: 4, L: "ZOOM OUT ×4" }],
    31: [{ t: ".passengerCard", g: "drag", dir: "dr", d: 130, L: "SLIDE IT BACK ↘" }],
    32: [{ t: "button.parkBay", g: "choose", L: "PARK IT HERE" }],
    33: [{ t: "button.balloonWeight:not(.cut)", g: "seq", L: "SNIP THIS STRING" }],
    34: [{ t: ".leafWord", g: "drag", dir: "d", d: 80, L: "INTO THE RIVER ↓" }],
    35: [{ t: "button.uniqControl", g: "tap", L: "LET IT PASS" }],
    36: [{ t: ".neonCloud", g: "slow", dir: "r", d: 160, ms: 1800, maxSpeed: 260, L: "DRAG… SLOWLY →" }],
    37: [{ t: ".floorStack button:not(:disabled)", g: "seq", L: "DOWN A FLOOR" }],
    38: [{ t: "button.uniqControl", g: "tap", L: "@text" }, { t: ".drawerCard", g: "drag", dir: "d", d: 90, L: "DROP IT IN ↓" }],
    39: [{ t: "button.uniqControl", g: "hold", ms: 1200, L: "HOLD — DON'T LET GO" }],
    40: [{ t: "button.uniqControl", g: "tap", L: "@text" }, { t: ".paperPlane", g: "swipe", dir: "r", d: 170, L: "THROW IT →" }],
    41: [{ t: ".unhookWordBubble", g: "taps", n: 3, pick: "near", L: "UNHOOK ×3" }],
    42: [{ t: ".knot:not(.loose)", g: "drag", dir: "ur", d: 70, L: "WIGGLE THIS KNOT" }],
    43: [{ t: "button.cutLoopScissorPicker", g: "tool", armed: ".active", L: "GRAB THE SCISSORS" }, { t: "button.cutLoopWord:not(:disabled)", g: "taps", n: 3, pick: "near", L: "SNIP ×3" }],
    44: [{ t: ".velcroPatch", g: "slow", dir: "r", d: 170, ms: 1800, L: "PEEL… SLOWLY →" }],
    45: [{ t: ".attentionOrb", g: "drag", dir: "r", d: 200, L: "PULL IT FREE →" }],
    46: [{ t: ".pushPin", g: "drag", dir: "u", d: 110, L: "PULL STRAIGHT UP ↑" }],
    47: [{ t: ".plug", g: "drag", dir: "r", d: 150, L: "UNPLUG IT →" }],
    48: [{ t: ".stickerWord", g: "drag", dir: "ur", d: 120, L: "PEEL IT UP ↗" }],
    49: [{ t: ".zipperPull", g: "drag", dir: "r", d: 180, L: "UNZIP →" }],
    50: [{ t: ".chainLink input", g: "type", L: "TYPE A FEW WORDS" }, { t: "button.premiumBigAction", g: "tap", L: "SHOW ME" }],
    51: [{ t: ".orbitButtons button.live", g: "seq", L: "TAP THIS VIEW" }],
    52: [{ t: ".genreKeys button", g: "choose", L: "PICK A GENRE" }],
    53: [{ t: "button.uniqControl", g: "taps", n: 4, L: "MAKE IT SILLY ×4" }],
    54: [{ t: "button.fontDial", g: "taps", n: 4, L: "TURN IT ×4" }],
    55: [{ t: ".productionStrip button:not(:disabled)", g: "seq", L: "TURN THE DRAMA DOWN" }],
    56: [{ t: ".courtTargets button", g: "choose", L: "WHAT IS IT?" }],
    57: [{ t: "button.uniqControl", g: "taps", n: 3, L: "ROTATE ×3" }],
    58: [{ t: "button.focusKnob", g: "taps", n: 4, L: "FOCUS ×4" }],
    59: [{ t: ".spotLamp", g: "drag", dir: "lr", d: 150, L: "MOVE THE LIGHT ↔" }],
    60: [{ t: "button.cropHandle:not(:disabled)", g: "seq", L: "WIDEN HERE" }],
    61: [{ t: "button.freezeWordCube", g: "taps", n: 3, pick: "near", L: "FREEZE ×3" }],
    62: [{ t: "button.catchNet", g: "tap", L: "CATCH IT" }],
    63: [{ t: ".portalRing button.hot", g: "seq", L: "TAP THE GLOW" }],
    64: [{ t: "button.uniqControl", g: "timing", lit: ".trafficLamp.p0", L: "WAIT FOR RED…" }],
    65: [{ t: "button.uniqControl", g: "hold", ms: 2400, meter: ".pauseRing", mvar: "--p", L: "HOLD TO PAUSE" }],
    66: [{ g: "wait", ms: 3000, L: "HANDS OFF", L2: "BREATHE WITH THE GLOW" }],
    67: [{ t: ".tapOutPads button.eosNext", g: "alt", L: "LEFT · RIGHT · LEFT" }, { t: ".tapOutPads button", g: "alt", L: "LEFT · RIGHT · LEFT" }],
    68: [{ t: ".drumKit button", g: "taps", n: 10, pick: "near", L: "DRUM! ×10" }],
    69: [{ t: "button.uniqControl", g: "timing", bpm: 40, L: "TAP… SLOWLY" }],
    70: [{ t: "button.uniqControl", g: "timing", bpm: 48, L: "EVERY OTHER BEAT" }],
    71: [{ t: ".defuseZone.active button", g: "seq", L: "DO THIS STEP" }],
    72: [{ t: "button.uniqControl", g: "tap", L: "CATCH IT" }, { t: ".labelButtons button", g: "choose", L: "NAME IT" }],
    73: [{ t: ".signalConsole button.light", g: "choose", L: "PICK A LIGHT" }],
    74: [{ t: ".bubbleWrapSheet button:not(.popped)", g: "seq", L: "POP THIS ONE" }],
    75: [{ t: ".inkDrop", g: "drag", dir: "r", d: 180, L: "DRAG THE INK →" }],
    76: [{ t: "button.uniqControl", g: "taps", n: 4, L: "REWIND ×4" }],
    77: [{ t: ".brakeHandle", g: "drag", dir: "d", d: 160, L: "PULL THE BRAKE ↓" }],
    78: [{ t: ".oneWordField button", g: "choose", L: "PICK ONE" }],
    79: [{ t: ".missPads button:not(.target)", g: "tap", pick: "near", L: "MISS ON PURPOSE" }],
    80: [{ g: "wait", ms: 5000, L: "DON'T TOUCH", L2: "BREATHE WITH THE GLOW" }],
    81: [{ t: ".blockTray button", g: "choose", L: "STACK IT" }],
    82: [{ t: ".nudgeRow button:nth-child(2)", g: "tap", when: '.seesawBeam[style*="rotate(0deg)"]', L: "CHECK BALANCE" }, { t: ".nudgeRow button:nth-child(3)", g: "tap", when: '.seesawBeam[style*="rotate(-"]', L: "SHIFT IT →" }, { t: ".nudgeRow button:nth-child(1)", g: "tap", L: "← SHIFT IT" }],
    83: [{ t: ".chuteRow button", g: "choose", L: "SEND IT" }],
    84: [{ t: ".ownershipCard", g: "swipe", dir: "lr", d: 150, L: "← MINE · NOT MINE →" }],
    85: [{ t: ".controlPanelSwitches button", g: "choose", L: "PICK ONE MOVE" }],
    86: [{ t: ".rubberStamps button", g: "choose", L: "STAMP IT" }],
    87: [{ t: ".keepDropCard", g: "drag", dir: "ud", d: 140, own: true, L: "↑ KEEP · ↓ DROP" }],
    88: [{ t: ".tradeOptions button", g: "choose", L: "PICK A PRIZE" }, { t: "button.coinSlot", g: "tap", L: "INSERT A COIN" }],
    89: [{ t: "button.doorABFrame:not(.exploredDoor)", g: "tap", L: "PEEK INSIDE" }],
    90: [{ t: "button.coin.realFlipCoin", g: "tap", L: "FLIP IT" }],
    91: [{ t: ".priorityBubbleTray button", g: "drag", dir: "u", d: 120, L: "DRAG INTO A SLOT" }],
    92: [{ t: ".intensityRuler button", g: "choose", L: "TAP A NUMBER" }],
    93: [{ t: ".spaceTile:not(.moved)", g: "drag", dir: "out", d: 90, pick: "near", own: true, L: "PUSH IT OUT" }],
    94: [{ t: ".juggleBall.selected", g: "taps", n: 3, L: "TAP ×3" }, { t: ".juggleBall", g: "choose", L: "KEEP ONE" }],
    95: [{ t: ".shelfThoughtBubble:not(.shelved)", g: "drag", dir: "u", d: 120, pick: "near", own: true, L: "LIFT IT ONTO THE SHELF" }],
    96: [{ t: "button.scratchToolButton", g: "tool", armed: ".toolArmed", L: "GRAB THE SCRATCHER" }, { t: ".scratchPlayArea", g: "scrub", L: "SCRATCH" }],
    97: [{ t: "button.xrayBurnAllButton", g: "tap", L: "BURN IT ALL" }, { t: "button.xrayScannerHandle", g: "drag", dir: "r", d: 180, own: true, L: "SCAN IT →" }],
    98: [{ t: "button.magicLeverHandle", g: "drag", dir: "d", d: 90, when: ".magicTrapBubble.selected", L: "PULL THE LEVER ↓" }, { t: "button.magicTrapBubble", g: "choose", L: "PICK ONE" }],
    99: [{ t: "button.echoHoldBubble:not(.gone)", g: "hold", ms: 5000, pick: "near", L: "HOLD TO QUIET IT" }],
    100: [{ t: "button.thoughtPotato.hot", g: "drag", dir: "out", d: 90, pick: "near", own: true, L: "TOSS IT AWAY" }],
    101: [{ t: "button.tugLetGo:not(:disabled)", g: "tap", L: "NOW LET GO" }, { t: "button.tugPullHandle", g: "drag", dir: "l", d: 80, own: true, L: "PULL ←" }],
    102: [{ t: ".ftRow:not(.released)", g: "drag", dir: "r", d: 110, ox: -0.4, own: true, L: "PUSH IN · DON'T PULL" }],
    103: [{ t: "button.spDropButton", g: "tap", L: "LOWER IT" }],
    104: [{ t: '.knobHitZone:not([aria-valuenow="0"]):not([aria-valuenow="1"]):not([aria-valuenow="2"]):not([aria-valuenow="3"]):not([aria-valuenow="4"]):not([aria-valuenow="5"]):not([aria-valuenow="6"]):not([aria-valuenow="7"]):not([aria-valuenow="8"]):not([aria-valuenow="9"]):not([aria-valuenow="10"]):not([aria-valuenow="11"]):not([aria-valuenow="12"])', g: "drag", dir: "d", d: 90, L: "TURN IT DOWN ↓" }],
    105: [{ t: "button.dmCutButton:not(:disabled)", g: "tap", L: "CUT!" }, { t: "button.dmDramaButton:not(:disabled)", g: "tap", L: "MAKE IT DRAMATIC" }],
    106: [{ t: "button.tsndKey:not(.done):not(:disabled)", g: "taps", n: 3, L: "PLAY ×3" }, { t: ".tsndVibes button", g: "choose", L: "PICK A VIBE" }],
    107: [{ t: ".gwCard.weirdWordBubble", g: "tap", when: "button.gwProp.propSelected", pick: "near", L: "STICK IT ON" }, { t: "button.gwProp:not(:disabled)", g: "choose", L: "PICK A PROP" }],
    108: [{ t: "button.uniqControl", g: "tap", until: "touch", once: true, L: "SHAKE IT" }, { t: ".saladBowl button:not(.restored)", g: "tap", L: "TAP TO SWAP" }],
    109: [{ t: "button.cleanseBubbleHoldButton:not(:disabled)", g: "hold", ms: 900, mvar: "--hold-pct", pick: "near", L: "HOLD… THEN LET GO" }],
    110: [{ t: ".rainCloudUnit:not(.pulled)", g: "drag", dir: "d", d: 110, pick: "near", own: true, L: "PULL IT DOWN ↓" }],
    // 111+ (EOS games): no entry — engines mark the live element(s) with eosTarget({...}).
}
```

### 3.12 Acceptance (arrows)
Run in a scratch integrated build (§12.3) for every id in `GAMES` (110 + new) at 1280×860 and 390×844 (and one reduced-motion pass):
- Within 1.5 s of `stage-play` the layer shows a hand whose hotspot lies inside the resolved target rect (±10 px) — or inside the group bbox for `choose`, or the ✋ for 66/80; the label is ≥14 px rendered.
- **Every stage, not just the first:** `eos_drive.finishGame` (same table / `data-eos-*` markers) asserts, before performing **each** stage of `EOS_GESTURES[id]` (or each new marker set), that `arrows.state().visible` became true and `label` equals that stage's label. For 3, 28, 40, 88, 98 and 107 the stage-2 label appears within 800 ms of completing stage 1.
- Performing the real interaction raises `aria-valuenow`; the hand hides within 200 ms; for `taps` stages `.eosCount` stays visible and its number decreases with each tap (CRUSH: 4 → 3 → 2 → 1 although the button remounts); re-shows after ≥4 s idle; a missed tap re-shows within ~1.3 s; dragging 36 fast shows the amber "slower… 🐢" gauge.
- `EosHandHint` (check-in step 1 halo, step 2 dial + CTA, Still Moment heart/spark, the reveal dial): a hand is visible within 1 s of each surface appearing.
- The LIVE GUIDE panel shows a glyph for every id in both wrappers, and the override ids (88, 94, 97, 98, 101, 106, 107) show the glyph of their progress-0 stage; new games' guide text has no extra regex arrow.
- `div.eosSrOnly[aria-live]` holds the current label; zero page errors; `window.__eosArrowMiss` is empty.

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
## 5. Converging background dots (`src/eos/12_eos_dots.jsx`, task `dots`) and the colour script (`src/eos/14_eos_mood.jsx`, task `mood`)

### 5.1 Inventory (verified)
| layer | where | visible today | EOS treatment |
|---|---|---|---|
| `.tsPxDust` ×14 (`pixarDust` prop) | Pixar rig over the whole component (z 2147483000) | yes — drift **up**, spawn only in the bottom 60 % | retarget: spiral into the **measured** Still Point centre (CSS override) + full-height spawn (I1-P1) |
| `.cinemaDust i` ×14 per game (7 shown) | `CinematicStageFX` in every game, both wrappers | yes (opacity ≤ .28) | retarget into the same measured centre (CSS override + `--eos-cx/cy` written per `.cinemaDust`) |
| `.cleanseSpace` star tiles (1-1.5 px dots tiled 83/121/143 px) | 109 CLEANSE arena | yes | zoom them in toward the centre (`eosDotsTileIn`) |
| `InfinityField` ×18 | behind `.shell` (`position:fixed; z 0`) | **never** — `.shell` paints opaque `rgb(2,4,7)` and `--flow-hue` is undefined | retired (`display:none`); superseded by `EosThoughtFlow` |
| `.ts-abyss-particle-*`, `.ts-magnetic-dust-*` | idle input stage | yes | already converge to the centre — keep |
| `.tsPxBokeh` ×9 | Pixar rig | large soft blobs (not "tiny dots") | drift 25 % of the way toward the measured centre over 60 s (Pixar animates their `translate`, so JS writes base `--eos-bl/--eos-bt` and CSS transitions `left/top`) so *everything* comes home (C3) |
| `.tsArcade::after` grain (0.45 px, tiled 7/11 px, z 3) | under `.shell` (z 20, opaque) | effectively invisible | unchanged (hidden) |
| reward sparks (`.surgeSparks`, glyph fields) | finish bursts | transient effects, not background | unchanged |
| `throwStarfield`, `spaceDots` | `ThrowEngine`, `LensEngine` | dead code (never routed) | unchanged |

### 5.2 `EosThoughtFlow({stage, reduced})` — the Still Point and the Thought Dust
- Mounted by I1 as the **first child of `section.releaseStage`**: `div.eosThoughtFlow[data-stage={stage}]` (`position:absolute; inset:0; z-index:0; pointer-events:none; overflow:hidden; contain:strict`). During play the game host / arena are transparent, so the field shows behind every game. **On the input stage** `.releaseIdleStage` (rendered after the flow, `z-index:auto`) paints an opaque base gradient that hides a z-0 layer (pixel test: a red z-0 child read `(35,45,45)`); §5.3 strips that base layer by CSS and the flow paints it on its own root instead, so the dust and the core are visible on the home screen and under the check-in.
- **Lane scaling (compositor only):** each dot is an `i.eosLane` (`position:absolute; inset:0; transform-origin:var(--eos-cx) var(--eos-cy)`) whose `::before` (or a `data-eos-dot` child span, so tests can measure it) is the dot at `left:var(--x); top:var(--y)` on a ring 40-56 % from the centre. Animating the lane `scale 1 → 0` moves the dot in a straight line into the centre while shrinking it; adding `rotate 0 → var(--sw)` (±25-40°, alternating sign) turns it into a **spiral**. Negative delays keep the field always full.
- Counts: 30 desktop, 18 when the stage is < 600 px wide, 10 with reduced motion / calm visuals (static). Dot size 2-6 px, hue from `[195, 265, 42, 320]` cycle, duration 14-22 s, `--dl` 0…−22 s, seeded by `eosNoise`.
- **One measured centre (C1, L10):** every 1 s and on resize (`ResizeObserver` on `.releaseStage`), measure the `.eosCore` centre in viewport px and write it as a percentage of each container: `--eos-cx/--eos-cy` on the flow root, on `.tsPxRig` (inside `.tsPixarRoot`) and on every `.cinemaDust` in the stage (style-attribute writes are ignored by both wrapper MutationObservers). All dust keyframes animate `left/top` to `var(--eos-cx)` / `var(--eos-cy)`.
- **Still Point core** `i.eosCore`: `min(36vmin, 280px)` soft radial glow at the stage centre; hue = current emotion (`--eos-h`), sliding toward calm cyan 190 as progress rises. A ring twinkle `eosDotsAbsorb` every ~2.8 s (scale .6 → 1.1, opacity .5 → 0) makes the merge legible.
- **One pacer (B4):** the core breathes by **reading** core's `eosBreathPhase()`. Autonomous: CSS `eosDotsBreathe` 10 s (4 s swell, 6 s linear settle) with `animation-delay: −(performance.now() % 10000) ms` set at mount and whenever the pacer is released, so it matches the shared clock. Owned (111, the Still Moment, 112's cool phase): subscribe to `EOS_PACER`, set `data-phase` = in/hold/out and `--eos-breath-ms` = the phase `ms`, and transition the core's scale over that time (`linear` for out). The audio bed and the arrows' wait ring read the same clock.
- **Mirror the feeling (C2):** `r = 0.7 + 0.09 × level × (1 − progress/100)` applied with `getAnimations().forEach(a => a.updatePlaybackRate(r))` to the lanes, `.tsPxDust` and `.cinemaDust i` (no position jumps). `level` = the live dial value while the check-in or after-dial is being dragged (`eosApi("dots").setLevel?.(n)`), else `before ?? intensityGuess ?? 5`. Add `.eosJitter` (±2 px wobble) while level ≥ 7. Say "9" and the dust churns; play and it visibly slows and smooths. Not with reduced motion / calm visuals.
- **Spark states (R6):** when the emotion's `moment` is `"spark"` (numb, good) the field switches to `data-eos-mode="spark"`: lanes 8-12 s, a warm hue cycle, and the core **pulses at 72 bpm** (`EOS_BREATH.beatBpm`) instead of breathing; 117 drives the beat with `eosPacerBeat(bpm)`. Numb needs up-regulation, not a slow calming field.
- **Calm visuals (A7):** `eosCalm(reduced)` → the reduced field (10 static dots, no rotation) and the flow sets `data-eos-calm="1"` on its closest `.tsArcade` and `.tsPixarRoot` (attribute writes only) so the CSS can quiet `.tsPxDust`, `.cinemaDust` and `.cleanseSpace` too. For panic and fear in the high band the spiral rotation is 0 by default (straight-in drift; spirals add vection).
- **Cosmetic dust styles (F6):** `eosPrefs().dust` ∈ `default | fireflies (warm, blinking) | aurora (slow hue-cycling ribbons of dots) | snow (white, slower) | gold (gold sparkle)`, unlocked by ⚡ milestones in the rewards module. Applied with `data-eos-dust` on the flow root; never changes speed rules or the pacer.
- **Per stage:** `input` → flow opacity .85 (+ the base gradient); `play` → .45 and the core size `.8 + .5 × progress` (poll `eosProgressOf(stage)` at 4 Hz, set `--eos-p` on the root via `style.setProperty`); finish (`.globalPlayGuide.isComplete` appears) → add `.eosGather` (all lanes rush in within 0.9 s, core **blooms** 0.2 → 1.25 → 1 with brightness 1.6; the mood layer's flip words rise from it, §5.6); `reveal` → the field bursts outward once (`eosDotsBurst` .9 s) then keeps converging slowly (30 s lanes).
- **Audio bed (F8, P2):** during check-in and play, a very quiet (gain ≤ .03) swell of low-passed noise following the pacer (rises on "in", falls on "out"); only when `EOS_STORE.sound && !EOS_STORE.music` (I1-E14 mirrors `musicOn && sound`); stops in the reveal; one `AudioBufferSourceNode` loop + one gain node, cleaned up on unmount.
- API: `eosExpose("dots", { pulse(kind), breath(phase, ms) /* = eosBreathOwn */, phase() /* = eosBreathPhase */, beat(bpm) /* = eosPacerBeat */, setLevel(n), gather() })`. `pulse("in")` makes all lanes speed ×3 for 1.2 s (games call it on an inhale / big success), `pulse("out")` reverses for 1.2 s. Implemented with a class toggle on the root (no React re-render of 30 nodes). Callers always use `eosApi("dots").pulse?.("in")`.

### 5.3 `EOS_DOTS_CSS` (core of it; builder completes the flow rules from §5.2)
```css
@keyframes eosDotsX{to{left:var(--eos-cx,50%)}}
@keyframes eosDotsY{to{top:var(--eos-cy,50%)}}
@keyframes eosDotsFade{0%{opacity:0;scale:.6}12%{opacity:.85;scale:1}80%{opacity:.9;scale:1}92%{opacity:.5;scale:.4}100%{opacity:0;scale:.1}}
@keyframes eosDotsTileIn{0%{scale:1.5;opacity:0}20%{opacity:.45}100%{scale:.6;opacity:0}}
/* home screen: keep the idle glows, drop only the opaque base layer; the flow paints the base under the dust */
${EOS_A} .releaseStage > .releaseIdleStage{background-image:radial-gradient(circle at 24% 34%,rgba(0,229,255,.086),transparent 30%),radial-gradient(circle at 78% 32%,rgba(138,92,255,.075),transparent 31%),radial-gradient(circle at 72% 76%,rgba(192,0,255,.05),transparent 32%),radial-gradient(circle at 30% 78%,rgba(255,241,138,.035),transparent 27%),radial-gradient(circle at 50% 52%,rgba(7,14,28,.58) 0%,rgba(7,5,16,.32) 36%,transparent 64%)!important}
${EOS_A} .eosThoughtFlow[data-stage="input"]{background:linear-gradient(rgba(3,6,14,.996),rgb(1,1,5))}
/* Pixar motes: left/top animate FROM the inline spawn values to the measured centre; two easings = curved, odd/even swap = both spin directions */
${EOS_PX} .tsPxDust{animation:eosDotsX var(--d,11s) cubic-bezier(.55,.05,.7,.35) var(--dl,0s) infinite,eosDotsY var(--d,11s) cubic-bezier(.2,.6,.35,1) var(--dl,0s) infinite,eosDotsFade var(--d,11s) linear var(--dl,0s) infinite!important}
${EOS_PX} .tsPxDust:nth-of-type(odd){animation-timing-function:cubic-bezier(.2,.6,.35,1),cubic-bezier(.55,.05,.7,.35),linear!important}
/* bokeh: Pixar's own tsPxBokeh keyframes animate `translate`, so drift the base position instead. JS reads each blob's inline
   left/top (%), writes --eos-bl/--eos-bt = 25 % of the way toward the measured centre (once per measure); CSS glides there over 60 s. */
${EOS_PX} .tsPxBokeh[style*="--eos-bl"]{left:var(--eos-bl)!important;top:var(--eos-bt)!important;transition:left 60s linear,top 60s linear}
/* per-game cinema dust (inline animationDuration / animationDelay are kept and apply to all three names) */
${EOS_A}.stage-play .cinemaDust i{animation-name:eosDotsX,eosDotsY,eosDotsFade!important;animation-timing-function:cubic-bezier(.55,.05,.7,.35),cubic-bezier(.2,.6,.35,1),linear!important;animation-iteration-count:infinite!important;animation-direction:normal!important;transform:none!important}
${EOS_A}.stage-play .cinemaDust i:nth-child(4n+1){animation-timing-function:cubic-bezier(.2,.6,.35,1),cubic-bezier(.55,.05,.7,.35),linear!important}
/* 109 CLEANSE star tiles */
${EOS_A}.stage-play .cleanseSpace{transform-origin:var(--eos-cx,50%) var(--eos-cy,50%);animation:eosDotsTileIn 14s linear infinite!important}
/* retire the invisible legacy field */
${EOS_A} .infinityField{display:none!important}
@media (prefers-reduced-motion:reduce){
  ${EOS_PX} .tsPxDust{animation:none!important;opacity:0!important}
  ${EOS_A} :is(.cinemaDust i,.cleanseSpace){animation:none!important}
  ${EOS_A} .cinemaDust i{opacity:.2!important}
  ${EOS_A} .eosLane{animation:none!important;opacity:.25}
  ${EOS_A} .eosCore{animation:none!important}
}
/* in-app calm visuals: the same quiet field without the OS setting */
${EOS_PX}[data-eos-calm="1"] .tsPxDust{animation:none!important;opacity:0!important}
${EOS_A}[data-eos-calm="1"] :is(.cinemaDust i,.cleanseSpace,.eosLane){animation:none!important}
```
(The arcade's own reduced-motion rule hides `.tsPxDust`; our ID-boosted `!important` rule would otherwise re-animate it, hence the explicit reduced block. Keyframe and class names use the `eosDots` namespace.)

### 5.4 Acceptance (dots)
- Computed `animation-name` of `.tsPxDust` includes `eosDotsX`; of `.cinemaDust i` includes `eosDotsY`.
- **One centre (C1):** sampling every visible `.tsPxDust`, `.cinemaDust i` and `.eosLane [data-eos-dot]` position at t and t+2 s: ≥ 70 % are closer to the measured `.eosCore` centre, and ≥ 70 % of dots near the end of their cycle sit within 24 px of it — in input, play and reveal, at both sizes.
- **Visible (C4, H1):** on stage-input, 4×4 screenshot clips at three `.eosLane` dot positions differ from the background colour (elementFromPoint cannot see a pointer-events:none layer); in POP, CRUSH, BURN, RAIN OUT, HOT POTATO, BLACK HOLE, SEND TO SPACE, 111, 114 and 117 at least 8 dust points are visible (screenshot pixel delta, or no opaque background along `elementsFromPoint` at their centres).
- **Mirror (C2):** lane `playbackRate` at level 9 > at level 3, and falls as progress rises.
- **One pacer (B4):** while 111 owns the breath, `eosBreathPhase().owned === true` and `.eosCore[data-phase]` equals its phase; after release the CSS cycle is within 200 ms of the shared clock.
- With `reducedMotion:"reduce"` or calm visuals on: no running EOS dot animation. Frame budget: no long tasks from the dots (they are transform/opacity or 28 tiny `left/top` nodes).

### 5.5 Ownership note
Dots owns the field, the core, the pacer *rendering*, the audio bed and the dust styles. Core owns the pacer *clock* (`EOS_PACER`). Mood (§5.6) owns the colour script and the flip words. The bloom is dots'; the words rising out of it are mood's.

### 5.6 The colour script and the flip bloom (`src/eos/14_eos_mood.jsx`, task `mood`) — every game goes negative → positive
`EosMoodGrade({game, hostRef, reduced})`, mounted by I1 in the play fragment (one edit, both wrappers, all 120 games). Root `div.eosMoodGrade` `position:absolute; inset:0; z-index:54; pointer-events:none; aria-hidden="true"`, private attrs not needed (no text but the flip words).
- **(a) Colour script.** A full-stage layer above the game with `mix-blend-mode:soft-light` and opacity .22 → .08: a two-stop gradient that interpolates from the emotion's `grade.loud` pair to its `grade.calm` pair as `eosProgressOf(stage)` rises (poll at 4 Hz, set `--eos-p`, CSS `transition: background .6s`). Emotion = `eosCurrentEmotion()` (STILL's grade when none). Numb also gets `backdrop-filter: saturate(calc(.6 + .4 × p))` (+ `-webkit-`) so the game itself goes grey → full colour. Reduced / calm: steps at 33 / 66 / 100 with cross-fades only.
- **(b) Flip bloom.** When `.globalPlayGuide.isComplete` or `.tsRewardSurge.mega` first appears, the emotion's 3 `flip` words rise out of the Still Point (measured `.eosCore` centre, or the stage centre): Baloo 2 900, ≥ 20 px (18 phone), gold-white with a soft glow, staggered 250 ms, float up 60 px and fade over 1.8 s (reduced: fade in place). Negative words went in; positive words come out. For sad the words are *lighter, warm, held* — never "happy".
- Late night (after 23:00 local, R8): the calm pair is warmed (+10° hue toward amber).
- Exports `EosMoodGrade`, `EOS_MOOD_CSS`; `eosExpose("mood", {})`.
- **Acceptance:** in POP (legacy), HOT POTATO (new) and 111: the layer's computed background at progress 0 contains the loud colours and at ≥ 95 the calm ones; the 3 flip words appear within 600 ms of `isComplete` at ≥ 20 px; numb's `backdrop-filter` saturate rises; no pointer interception (`elementFromPoint` at a game target is still the target); zero errors at both sizes.

---------------------------------------------------------------------------------------------------
## 6. Emotion check-in, companion, router hand-off and shift meter

### 6.1 Ownership
| part | file / task | exports |
|---|---|---|
| check-in overlay, chip, companion | `40_eos_checkin.jsx` / `checkin` | `EosCheckIn`, `EosCheckInChip`, `EosCompanion`, `EOS_CHECKIN_CSS` |
| routing + menu group + profile override | `45_eos_router.jsx` / `router` | §7 |
| shift meter + Still Moment | `50_eos_shift.jsx` / `shift` | `EosShiftMeter`, `EosStillMoment`, `EOS_SHIFT_CSS` |
| rewards, chips, shelf, share | `52_eos_rewards.jsx` / `rewards` | §9 |
| colour script + flip bloom | `14_eos_mood.jsx` / `mood` | §5.6 |
| hand hints on non-game surfaces | `30_eos_arrows.jsx` / `arrows` | `EosHandHint`, `EosHandCue` (§3.2), used via `eosApi("arrows")` |
| shared UI, store, safety scan, pacer | core | `EosCharacterOrb`, `EosIntensityDial`, store transitions, `EosSafetyScan`, `eosBreathOwn` |

### 6.2 `EosCheckIn` — props (from I2)
`{ raw, setRaw, onLaunch /* = startThinkStillChoice */, onPlay /* = startChosenGame */, toggleMic, listening, openMenu /* () => setGameMenuOpen(true) */, sfx, reduced }`. Rendered only when `stage==="input" && !selected && eos.phase==="checkin" && eos.checkinEnabled`. Root `div.eosCheckIn[data-step="1"|"2"]` inside `.releaseStage`, `position:absolute; inset:0; z-index:30; role="region" aria-label="How are you feeling?"`, `EOS_PRIVATE_ATTRS` + `fs-mask`. It must never cover `.releaseComposer` (it lives outside `.releaseStage`, z 240) — verify `button.releaseChoiceButton` and `input.releaseThoughtInput` stay clickable. CSS (check-in module) hides `.releaseIdleStory` while it is up: `${EOS_A} .releaseStage:has(.eosCheckIn) .releaseIdleStory{display:none!important}` (the abyss rings stay as backdrop; the Still Point shows through, §5.2).

**Step 1 — "Who's at the controls?"** (hero 30-44 px; sub-line 15 px "Tap the feeling that's loudest right now.")
- Desktop: the 8 primary orbs on an ellipse (rx 34 %, ry 30 % of the stage) around the centre, 96 px, staggered pop-in (40 ms apart, spring), bobbing out of phase; **NOT SURE** (STILL, 110 px) in the centre on the Still Point. Each orb = `EosCharacterOrb` with `label`/`sub` from `EOS_EMOTIONS` + `showName` (12 px "RUSH" tag), `aria-label="Panic — heart racing (SYNC)"`. Roving focus with arrow keys; Enter/Space selects.
- Phone ≤ 560: 3 × 3 grid (8 orbs + NOT SURE in the middle cell), 84 px orbs, 12 px gaps; "OVERTHINKING" must fit the 84 px cell — if it does not, that one label renders at 13 px with letter-spacing .02em; "more feelings" below; everything fits in ~470 px of the ~650 px stage.
- **"more feelings ▾"** chip reveals SCARED, JEALOUS, NUMB as a small arc (76 px). **"☀ good day? bank it"** chip (separate, always visible): `EosCommitCheckin({emotion:"good", before:null, express:true})` → launch 117 COLOUR RUSH in savour mode through `onPlay` (handshake below).
- **Express orbs (D2):** tapping **PANIC** (or Enter on it) — and long-pressing **any** orb for 550 ms (a radial fill on the ball shows the press; haptic tick at 550 ms) — skips step 2: `EosCommitCheckin({emotion, before:null, express:true})` → orb-dive → `onLaunch()`; the router uses the **high band** for express launches (panic → BIG SIGH). The reveal asks "before" with one chip (retro row). PANIC's sub-line reads "heart racing · tap = start now".
- **Hand hint (A1):** first-timers (`eos_learned_v1` empty) see `eosApi("arrows").EosHandHint?.({ target: [all orbs], g:"choose", rest: NOT SURE, label:"TAP HOW YOU FEEL" })` — the gold halo hops across **all** orbs, the hand rests on NOT SURE; never an arrow on one feeling (it would bias the choice). Hidden on the first touch.
- **Live text hint:** if the user types in the composer while step 1 is up, `eosDetectEmotion(raw)` (debounced 300 ms) makes that orb pulse with a speech bubble "sounds like ANGER?" (tap confirms).
- **Footer** (13 px text links, ≥ 44 px hit areas, 8 px apart): "just let me play →" (`EosSkipCheckin()`) · **"Need to talk to someone?"** (`eosApi("safety").open?.("info")`, §10) · "about ThinkStill" (shows `EOS_DISCLAIMER` in a small popover) · "◐ calm visuals" (`eosSetPref("calmVisuals", !on)`; label shows on/off).
- **Cold open (F9, P2):** once per device (`eos_prefs_v1.coldOpen`), ≤ 3 s, non-blocking: STILL slides in beside the ring: "Hi, I'm Still. Your feelings are a crew. Tap whoever's loudest." Any touch dismisses it.
- **Deep link (F1):** on mount, read `location.search` once (try/catch): `eos` ∈ `EOS_EMO` ids and `t` an integer 1-600 → preselect that orb (go to step 2) and show a banner "A friend shifted ANGER in 41 s. Your turn?" (never "beat their time"); then `history.replaceState` without the params (guarded; the Framer canvas may throw).

**Step 2 — "How loud is RUSH right now?"** (`eosDialQuestion(emotion)`: "How heavy is it?" for sad, "How alone does it feel?" for lonely, "How far away do you feel?" for numb, "How good is it?" for good)
- The chosen orb flies to the centre and grows to 180 px (140 phone) (wrap the orb in `motion.div` with `layout` or FLIP — never pass motion props to `EosCharacterOrb`; reduced: cross-fade); others dim (ball only) and drift outward; the face switches to the loud face; `eosTone` chord + `eosHaptic("touch")`.
- The first time ever (`eos_prefs_v1.metOnce`): the question reads **"Meet RUSH, your anger. How loud is RUSH right now?"**
- `EosIntensityDial` (`min 1`, `emotion`, value pre-lit at `EOS_EMO[emotion].dial`, or `max(dial, eosGuessIntensity(raw))` when the composer has words). The character scales `.85 + n×.04` and shakes 2 px when n ≥ 7 (not when calm); every change calls `eosApi("dots").setLevel?.(n)` so the dust churns or settles with the number.
- First-use micro-copy (once per device, `eos_prefs_v1.namedOnce`): *"Naming it is the first move."*
- **Words (optional):** "What's it about? (optional)" + 3 seed chips (tap toggles the phrase into `raw`) + 🎙 chip (`toggleMic()`, shows `listening`; the first use shows one line under it: *"Voice typing uses your browser's speech service."*, `eos_prefs_v1.micNoted`) + a gold chevron pointing at the composer input. **Prefill:** when an emotion is picked and `raw.trim()` is empty, `setRaw(emotion.starter)` and remember it; if the user switches emotion and `raw` still equals the previous starter, replace it; never overwrite text the user typed. Composer placeholder text is unchanged.
- **CTA "LET'S SHIFT IT ▶"** gold toy button (18 px, ≥ 52 px tall) with a sub-line from `eosApi("router").EosRoutePreview?.(emotion, n)` → "≈30 s · BIG SIGH" (or "your best · COOL THE VOLCANO" when the preview says `best`). Secondary links: **"pick a game myself"** (`EosCommitCheckin({emotion, before:n})` **then** `openMenu()`, so the reveal still knows both), "← back".
- **Hand hints (A1):** the first time on step 2, `EosHandHint({target: dial track, g:"drag", dir:"lr", d:120, label:"SLIDE IT"})`; after 3 s without input, `{target: CTA, g:"tap", label:"LET'S GO"}`.
- **NOT SURE:** step 2 asks "How big does it feel?" with STILL; GO commits `emotion:null` and prefills `EOS_GUIDE_CHAR.starter` if empty.

**Launch handshake (stale-closure safe):**
1. GO → `EosCommitCheckin({emotion, before})` (express / good-day: `before:null, express:true`).
2. If `raw.trim()` is empty → `setRaw(starter)` and set local `pending = {kind:"route"|"game", id}`; an effect `[pending, raw]` calls `onLaunch()` (or `onPlay(GAMES.find(g => g.id === id))`) once when `raw.trim()` is non-empty. Otherwise call it directly. (`onLaunch`/`onPlay` are the latest arcade callbacks, which read the committed `raw`.)
3. **Orb dive:** full-stage `motion.div` `clipPath: circle(0 at orbX orbY) → circle(150% …)` in the emotion hue, 600 ms; the launch fires at ~520 ms (reduced: 150 ms fade, immediate). The overlay unmounts when the stage becomes `play`. PANIC tap → first BIG SIGH hold possible in ≤ 2.0 s.
4. `startThinkStillChoice` → (I2) `EosRouteGame(...)` picks the game → `startChosenGame(g)` → (I2) `EosMarkLaunch(g, e)` → `stage "play"`.

### 6.3 `EosCheckInChip({reduced})`
In `phase:"skip"` (or any non-checkin input state): a 44 px pill at the top-left of the stage, **z 32** (it must beat the opaque `.releaseIdleStage`) — STILL orb 32 px + "How are you feeling?" (13 px) → `EosOpenCheckin()`. Hidden while the game menu is open, by CSS only (no new props): `${EOS_A}:has(.releaseChoiceMenu) :is(.eosCheckInChip,.eosWorldChips){display:none!important}` and `@media (max-width:560px){${EOS_A} .releaseStage:has(.eosCheckIn[data-step="2"]) .eosWorldChips{display:none!important}}` (the check-in module owns these two rules).

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

### 6.5 `EosCompanion({game, hostRef, reduced})` (mounted in the I1 play fragment by I2-E13)
- `div.eosCompanion` absolutely positioned in the stage: bottom-right 14 px (desktop, 72 px orb); **phone: 8 px under the measured bottom of `.engineProgressHud`** (it wraps to two rows after §4.3), right 10 px, 56 px — never on the bottom guide panel. `pointer-events:none`, `aria-hidden`, z 55 (under the arrows), `EOS_PRIVATE_ATTRS`.
- Character = checked-in / detected emotion's `char` (STILL when unknown). **Hidden when `EOS_GAME_META[game.id]?.char === that char`** (the scene already stars it: no two SYNCs on screen).
- Face by progress: 0-33 loud face, 34-66 a softer negative face from `eosFacePool(char,"negative")` (not the loud one), ≥67 the target face — `EOS_EMO[emo].calm` (for numb that is the **awake** face 61, not a sleepy one). Cross-fade 300 ms + Pixar squash on each change (reduced / calm: cross-fade only).
- **No catharsis message (R10):** when the emotion is anger and the game is in `EOS_DISCHARGE_IDS`, the companion goes loud → **"spent"** (a lower-energy negative face) and never reaches its calm face during the game; its finish bubble reads **"nice hit — now let it cool"**. It reaches the calm face only in the cool-down (Still Moment cool variant or 112's act B).
- On progress increases: squash; every 3rd increase a 14 px speech bubble for 1.6 s from the character's own voice: RUSH "phew… cooling" (in smash games: "HAH!") · SYNC "slower… nice" · GLITCH "static clearing…" · LOOPIE "loop… broken!" · DROP "let it rain" · PATCH "you're doing okay" · STILL "look at you go". Optional `eosTone` "voice blips" (2-3 short notes). On finish: happy bounce, target face, "✦".
- Reads progress via `eosProgressOf(stage)` at 4 Hz; cleans up its interval.

### 6.6 `EosShiftMeter` — the before → after moment (`50_eos_shift.jsx`)
Props (I2-E9): `{ game, sfx, rainSfx, reduced, onAgain, onPlay, onNext, onDoneForNow, addScore }`. Renders `null` when `!eos.checkinEnabled`. Root `div.eosShiftMeter[data-step="moment"|"rate"|"payoff"|"done"]` inside `.releaseCompleteCard` (max-width 760 card), `EOS_PRIVATE_ATTRS`. It never calls `setReleaseCheck`, so the old yes/no panels stay hidden (they still work when the meter is disabled).
- **Declutter (E6, CSS in the module):** while the meter is present hide the old question `${EOS_A}.stage-reveal .releaseCompleteCard:has(.eosShiftMeter) .releaseShiftCheck>:is(strong,.releaseShiftChoices){display:none!important}`; while `data-step` ≠ `done` also hide `.releaseCompleteCard>small`, `.releasePersistentFinalMessage`, `.releaseCompleteSideNav` and dim `.arcadeCharacterAtmosphere` to .3; all of it returns after the payoff. "↻ AGAIN" stays.
- **⚡ for showing up:** `addScore(25)` once per launch **when the meter mounts** (the reveal was reached) — never for the rating or its size.
1. **Still Moment** `EosStillMoment({emotion, gameId, band, variant, onDone, reduced, rainSfx})`. **Runs only when** the game is not in `EOS_SLOW_IDS` (and not 114/115 for heart, 117 for spark) **and** (a) emotion anger + game in `EOS_DISCHARGE_IDS` → **cool** variant, or (b) the game is a discharge / Destroy-family game, or (c) band high and emotion ∈ panic, anger, fear, overwhelm. Veterans (≥ 5 rated loops in `eos_sessions_v1`) get a one-tap chip instead of an auto-start ("one big sigh? ›" / "a quiet moment? ›" / "spark it? ›") — except the cool variant, which always auto-starts. **Tap anywhere (or "skip ›", visible from 0 s) skips.** All timings from `EOS_BREATH`; the moment drives the shared pacer (`eosBreathOwn`).
   - **sigh — "blow the memory orb home"** (diegetic; no "breathe in / out" copy): hold the orb to fill it (1.6 s, `eosBreathOwn("in",1600)`, "fill it…") → **while still holding**, slide up ≥ 24 px (or tap with a second finger; if neither within 1.0 s the top-up plays automatically while the finger is still down) for one more sip (0.5 s, "one more sip ↑") → let go: a long **linear** 4.4 s blow (`eosBreathOwn("out",4400)`, "looong blow →", `rainSfx(4)`, `eosHaptic("exhale")`) sends the orb toward the ◉ shelf chip. ≈ 6.5 s, out/in ratio 2.1. Hints: `{g:"hold", ms:1600, label:"HOLD TO FILL IT"}` → `{g:"drag", dir:"u", d:30, label:"SIP MORE ↑"}`.
   - **cool** (anger after a smash game): the same, twice (≈ 13 s), headed "cool it down: two big blows". The companion reaches its calm face here.
   - **heart** (sad, lonely, shame, jealous): *"Thumb on the orb — and if you like, your other hand on your own chest."* Hold 3 s: warm fill, the visual heartbeat slows 60 → 52 bpm (`eosHeartbeat` drives the visual twin), release pauses, never resets; then an optional 5 s "stay here" with two slow breaths (skip link). Hint `{g:"hold", ms:3000, label:"HOLD · HAND ON HEART"}`. Finishes by itself at 6.5 s with no interaction.
   - **spark** (numb, good): tap the orb 3× on a visible 90 bpm pulse, `eosTone` rising notes. Hint `{g:"taps", n:3, label:"TAP ×3 ON THE BEAT"}`. Finishes by itself at 6.5 s.
   - Hints come from `eosApi("arrows").EosHandHint` (show at 600 ms, hide on touch, re-show after 3 s idle).
   - Reduced / calm: opacity and colour cross-fades; the pacer keeps opacity + ≤ 4 % scale with a numeric "in 2… out 4…" countdown.
2. **Rate (one dial):** `EosIntensityDial min 0`, `emotion`, `label = eosDialQuestion(emo,"after")` ("How loud is RUSH (anger) now?"), **`value` starts `null`** ("–"), `ghost = before`. The CTA stays disabled until a value is set; a **"skip"** link records `EosRecordShift(null)` and goes to step 4 (the loop still counts). When `before == null` (no check-in, or an express launch): a chip under the dial "you came in at about **7** · change" (prefill `intensityGuess ?? EOS_EMO[emo].dial ?? 6`; "change" opens a compact before-dial) → `EosRecordShift(after, {before})` marks the row **retro**. **The dial drives the feeling live:** the character orb scales `.85 + .04n` and its face goes loud → softer → calm as n falls relative to before (rises for GOOD), and `eosApi("dots").setLevel?.(n)` slows the dust — rating is turning the feeling down by hand. Hint `{g:"drag", dir:"lr", d:120, label:"SLIDE TO RIGHT NOW"}`. The payoff starts 900 ms after the last change or on "✓ SET". Focus moves to the dial after the moment, unless focus is in a text field.
3. **Payoff (≤ 1.2 s, `aria-live="polite"` headline):** `EosRecordShift(after, opts)` → count `before → after` (60 ms/step, soft ticks) that **resolves on a rising major arpeggio + `sfx("chime")` + `eosHaptic("finish")`**; then the stamp **"5 LIGHTER ✦"** (`better:"down"`) / **"3 BRIGHTER ✦"** (`up`) with tier words by Δ only: Δ ≥ 3 "big shift", 1-2 "a little lighter" (or "a little brighter"), Δ ≤ 0 no stamp — "still here with you". Headline **"ANGER 8 → 2 · COOL"** (`noun` upper-cased + `spark`) and sub-line **"RUSH handed back the controls ✦"**: the character slides aside and STILL (calm face) takes the centre. Δ ≤ 0: "RUSH is still here — that's okay. Some feelings need a different door." Under a safety flag: no stamp, no confetti, softer headline "You showed up for yourself." When `flipKey` is set and there is no strong flag, one line from the owner's ritual library under the headline (§9.6).
   - **Sound signature (F7):** a 3-note ThinkStill shift sting (G4 → C5 → E5, triangle, 90 ms each) on every payoff, then a per-emotion finish chord: anger minor → major, panic a slow descending fifth that resolves up, sad a rising sixth, others a major triad in the emotion's key. Sound toggle respected.
4. **The memory orb flies home (E5):** `eosApi("rewards").grantForShift?.(shift)` → the orb (face inside, tier rim) arcs on a motion path into the ◉ world chip (`.eosWorldChips [data-eos-chip="orbs"]`, measured), squashes on landing, the chip bumps "+1" with `sfx("plink")`. Reduced: cross-fade. Then the **rewards line** (13 px): "+1 memory orb · RUSH bond 2 · ☀ 4 days this week · +25 ⚡ for showing up".
5. **Buttons (max 3, ≥ 48 px):** **I'M GOOD ✓** (gold primary → `onDoneForNow()`), **ONE MORE ▶** (`const next = eosApi("router").EosSecondAct?.(emotion, gameId, delta)`; `next ? onPlay(next) : onNext()`; label shows the next game's name; **anger after a discharge game reads "COOL IT DOWN ▶" = 112, whatever the delta**), **SHARE MY SHIFT** (`eosApi("rewards").EosShareButton`). For shame, lonely, sad and fear, share is a secondary text link "make a card". Under any safety flag share is hidden and **"💛 Talk to someone"** (same size as I'M GOOD, `eosApi("safety").open?.("info")`) takes its place. Text links: "↻ same game" (`onAgain`; anger after a discharge game: one replay per feeling, then it reads "↻ cool it down" → 112) and **"Need to talk to someone?"**. After 3 rated loops or 10 min in the app session: headline *"You've shifted 3 times — nice. Take the calm with you?"*, ONE MORE becomes secondary.
6. **Safety tie-in:** after every recorded shift call `eosApi("safety").soft?.(shift)`; the safety module decides (§10.2 rule: only "down" emotions, high numbers, precedence).
7. a11y: buttons ≥ 48 px; `aria-live="polite"` on the payoff headline; every step reachable by keyboard.

### 6.7 Acceptance (check-in loop)
- Fresh load → `.eosCheckIn` visible with 8 orbs (+ name tags) + NOT SURE, the Still Point visible behind it, composer clickable; the halo hint hops across all orbs within 1 s; footer links present (support, about, calm visuals).
- **PANIC tap → `stage-play` with game 111 and the orb holdable in ≤ 2.0 s;** `EOS_STORE.get()` has `emotion:"panic", express:true, before:null`.
- ANGRY → dial pre-lit at 8 → GO → `stage-play` with `EOS_STORE.get().emotion === "anger"` and the game id ∈ `EOS_EMOTION_ROUTES.anger.high`; typing "my boss yelled at me and I feel panic" and pressing LET THINKSTILL CHOOSE without a check-in routes 111 (intensity 7 → high).
- Finish the game → reveal shows `.eosShiftMeter`; with the Still Moment skipped (or not run) the payoff "ANGER 8 → 3" is visible ≤ 7 s after the game's finish (≤ 12 s with the moment); the after-dial started at "–"; one `eos_sessions_v1` row with no text fields; the orb lands in the ◉ chip; I'M GOOD returns to the check-in.
- Express PANIC loop: the reveal shows the "you came in at about 8 · change" chip and the row has `retro: 1`.
- "pick a game myself" → menu → CRUSH → the reveal knows the emotion and before (no retro).
- "just let me play" then `startGame(page,"POP",text)` works exactly as before; the chip (z 32) is visible and reopens the check-in; reduced motion has no travel; phone layout has no overlap with the composer; `?eos=anger&t=41` preselects ANGRY and the URL is cleaned.

---------------------------------------------------------------------------------------------------
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
## 8. New games (ids 111-120) — one file each, `src/eos/2x_eos_game_<slug>.jsx`

Coverage: panic breathing (111), anger discharge → cool-down (112), anxiety grounding (113), sadness / loneliness comfort & warmth (114), shame → self-kindness (115), overthinking defusion (116), numbness up-regulation (117), fear approach (118), **jealousy → your own glow (119)** and **overwhelm → one thing (120)**. Every primary ring emotion and every "more feelings" state now has a hero of its own.

### 8.0 Shared engine contract (every new game)
- **Registration** at module top level: `eosRegisterGame(EOS_GAME_<ID>, Eos<Name>Engine, { hint, mindBend, css: EOS_<NAME>_CSS, gesture, char, seconds })` — `gesture` = the stage live at progress 0 (111 hold · 112 taps · 113 tap · 114 hold · 115 hold · 116 taps · 117 timing · 118 dragTo · 119 dragTo · 120 swipe) so the LIVE GUIDE glyph and verb are right; `char` = the scene's character (the companion hides when it matches); `seconds` = typical play time. `engine: "E04"` makes progress explicit (no `sfx`-driven increments; verified `usesExplicitProgress` and no arcade CSS keys off `.engine-e04`). Ids ≥ 111 run in `GameEngine` (sparks, tokens, reward bursts) once I1-E11 routes `EosEngineFor` in `RoutedGameContent`.
- **Props:** `{ game, entries, onProgress, onDone, sfx, rainSfx, reduced, imageSources, hasUserImages, variationSeed }`. Call `onProgress(value, label)` — **never a third argument** (after I1-E7 a truthy third argument means "sfx-driven" and is capped). `onProgress(0, label)` on mount, then strictly increasing 0..100. The label becomes the LIVE GUIDE line ("Next move · {label}"), so it is an **imperative next step** ≤ 18 chars ("SIP ONCE MORE", "TAP THE CRATER"), never a counter ("1/2"); counters live in the game's own UI. `onDone(bonus 260-360)` exactly once, ~450 ms after 100. Never call either after unmount.
- **Root:** `<div className="arena eosArena eosG<id>" {...EOS_PRIVATE_ATTRS}>` filling the content shell (core resets the arcade's forced `position:relative` and 18/158 px padding on `.eosArena`). **Safe area:** every interactive object and every word lies between `var(--eos-safe-top)` and `calc(100% - var(--eos-safe-bottom))` (48 / 200 px desktop, 104 / 164 px phone) — the LIVE GUIDE covers the bottom-left 460×182 px at 1280 and the full-width bottom 150 px at 390, the HUD the top. The arcade's `.arena` filter makes the arena the containing block for `position:fixed` children. **Avoid** these class names anywhere in your tree (the new wrapper re-skins / moves / treats them as obstacles): `allCircularBubble wordBubble uniqWord tsThoughtLabelHost tsStandardBubble choiceObject chargeOrb catchTarget juggleBall` and any of the bubble selectors in `map_engine_hud` §5.2, and on decor avoid words matching `/(guide|button|btn|tool|knob|dial|lever|handle|panel|control|action|press|trap|scale|meter|…)/` (use `eos*` names like `eosValve`, `eosGauge`). Interactive elements are `<button type="button">` or elements with explicit roles.
- **Arrow:** spread `eosTarget({...})` on the element the player must touch now — on **every** option for a `choose` stage; move it as the state changes; remove it during automatic phases (exhale, transitions). Use the extra fields when they apply (`win`, `meter`/`mvar`, `maxSpeed`, `own`, `ox`/`oy`).
- **Words:** `eosWords(entries, n)` + `<EosWord text=…/>` (≥ 16 / 15 px). User words appear **only** inside `<EosWord>` (the new wrapper tags any leaf whose text equals an entry with `.tsExactUserText`, and arcade styling then applies). Under a strong safety flag `eosWords` returns neutral words by itself. Image-only input: show the upload thumbnails from `imageSources` **only when `hasUserImages` is true** (otherwise `imageSources` holds the arcade's character faces) and use the emotion's `seeds` as captions.
- **Characters:** `EosCharacterOrb` / `eosFace(char, mood)`; `eosFacePool(char, "win")` for the happy finish. The scene's character is fixed per game (listed below) — not the check-in emotion — so the story reads; it changes face ≥ 2× and ends on a positive pose. To animate an orb wrap it in `motion.div` (core drops motion props); never put `.eosObj` on an element whose `scale`/animation carries state (breath-orb fill, lantern sway) — wrap it.
- **Juice grammar (sound ≠ reward):** in the new wrapper **every `sfx(kind)` except `"soft"` fires a step reward** (+8-18 sparks, CHAIN +1, a reward burst, a face flip, `vibrate(12)`). So: every touch answers within 50 ms with `sfx("soft")` + `eosTone(...)` + `eosHaptic("touch")` + a visual (squash `whileTap={{scaleX:1.1, scaleY:.88}}`); a **real success** (a sigh completed, a rock erupted, a lantern risen) plays exactly **one** non-soft kind (`"pop"`, `"chime"`, `"spark"`…) + a burst (`PremiumBurst` at the point) + `eosHaptic("hit")`; ambience, holds and timers use `eosTone` / `rainSfx` only — **never call a non-soft `sfx` from a timer or rAF**. Finish = the character flips to a positive face.
- **Haptic twins:** iOS Safari has no `navigator.vibrate`; every haptic cue has a visual or audio twin (`eosHeartbeat`'s `onBeat` drives the visual heartbeat).
- **No fail state:** mistakes slow progress, never reset it. Every game finishes in ≤ 45 s even with clumsy play (auto-assist timers).
- **Pacers:** a game that paces breath owns the shared pacer (`eosBreathOwn(phase, ms)` at each phase, `eosBreathOwn(null)` on exit/unmount); a beat game calls `eosPacerBeat(bpm)` (0 on exit). Never draw a second, independent breathing rhythm.
- **Motion:** framer-motion `motion` is in scope; every looping animation is gated by `eosCalm(reduced)` (reduced = opacity/colour cross-fades, same timings); ≤ 60 animated nodes; one rAF loop max; refs (not React state) for per-frame values; clean up every timer/listener/rAF.
- **No flashes:** no luminance change over 10 % of the arena more than 3 times a second; no lightning; bursts and shakes rate-limited (WCAG 2.3.1; startle cues hurt the over-aroused).
- **DOM churn:** both wrappers re-run a full audit (`querySelectorAll("*")` + computed styles) on every `childList` / `characterData` mutation in the content shell. No text-node or child-list change inside the arena faster than ~4 Hz: pre-mount pools (no mount/unmount per splash, rock or cloud), animate with style / transform / CSS variables / attributes (attribute changes are ignored except `src`).
- **Input:** pointer events with `setPointerCapture` + `onPointerCancel`/`onLostPointerCapture` for every hold or drag; one-thumb play at 390×844; primary targets ≥ 64 px; **keyboard**: Space/Enter mirrors the primary action, arrow keys move dragged objects; every path-drag has a **single-pointer alternative** (tap / press-and-hold, WCAG 2.5.7); speed thresholds are in CSS px ÷ `eosStageScale` (a scaled Framer canvas does not change the rule).
- **Screen readers:** phase cues ("fill it…", "keep looking…") live in an `aria-live="polite"` node (visible cue or `.eosSrOnly`); each interactive object has an action-stating `aria-label` ("Breath orb. Press and hold to breathe in.").
- **CSS:** one string `EOS_<NAME>_CSS`, every rule prefixed `${EOS_A} .eosG<id>`; text ≥ 14 px; Baloo 2 via `var(--eos-font)`; keyframes `eos<Name><Thing>` (e.g. `eosSighOrbFill`). Buttons inside `.eosArena` start as **clean shells** (core v1.2.1, §0.5): the arcade's `!important` neon skin is reset, and React inline styles cannot beat `!important` rules — put a button's visuals on a child element or in your CSS string with `!important`.
- **Sound:** `sfx(kind)` (`tap pop soft win spark chime bell plink clack hum tone tskey:clean:0-5`, scored-step rules above), `rainSfx(seconds)` for breath/rain, `eosTone` for melodic ladders. All gated by the arcade's sound toggle.
- **Replay variety:** ≥ 3 seeded scene variants per game (`variationSeed` → palette, prop layout, character pose) plus a local-time palette (dawn 5-10 / day 10-17 / dusk 17-21 / night 21-5), so a daily player does not see the same scene every time.
- **Copy:** §2 rules (no clinical words, no invalidating phrases, no medical claims). The **Science** bullets below are internal rationale only — never shown in the UI, captions or share text; they claim a fast downshift, not the effect sizes of the cited protocols.
- **Testing:** `python3 dev/eos_integrate.py --dev-dir /tmp/eos_<task> --modules <your file>` (all integration edits + stubs) → `launch({dir:"/tmp/eos_<task>"})`; that is the only acceptance surface. `dev/eos_preview` (`?id=<id>&text=…&reduced=1`) is for quick iteration only (no arcade CSS, guide panel or step rewards). Screenshots at start / mid / finish, desktop + phone, LOOK at them.
- **Pixar quality checklist** (each builder ticks it in the report with screenshot paths): 3 depth layers (sky / props / character) · key + rim light on the character · squash & stretch on every touch · a character face that changes ≥ 2× and ends positive · ≤ 1 instruction line on screen · Baloo 2 only · no flat rectangles as primary objects · colour script loud → calm across the game · every touch answered within 50 ms with visual + sound + haptic (timestamps from `__eosPreview.sfx[{kind,t}]` and a pointerdown log) · no flashes · safe area respected.

### 8.1 · 111 BIG SIGH — panic (also overwhelm, fear, anxiety at high intensity; the express-orb target) · `21_eos_game_sigh.jsx` · `EosBigSighEngine`
```js
const EOS_GAME_111 = { id: 111, name: "BIG SIGH", family: "Release", engine: "E04",
    prompt: "Where is the storm in you right now?",
    object: "Your words ride six storm clouds over SYNC's tiny island",
    action: "Hold the breath orb, slide up for one more sip, then let go and ride the long exhale",
    mechanism: "Physiological sigh: double inhale, long exhale",
    hook: "Two sips in. One long sigh out.",
    surprise: "Every sigh blows two clouds out to sea until the sun comes up and SYNC falls asleep on the moon.",
    mindBend: "Your exhale is the off-switch. Long out wins.",
    score: "Sighs completed", replay: "A new storm rolls in", sound: "Rising hum, soft wind and rain",
    notes: "EOS panic hero · 3 sighs (4 when the feeling is 8+) · 25-35 s" }
// eosRegisterGame(EOS_GAME_111, EosBigSighEngine, { hint: "Hold the orb, slide up for one more sip, then let go", mindBend: EOS_GAME_111.mindBend, css: EOS_SIGH_CSS, gesture: "hold", char: "sync", seconds: 30 })
```
- **Scene:** night sea under a soft purple storm (the storm **glows softly at ≤ 1 Hz, low contrast — no lightning**); SYNC (E44 → E48 → E90 asleep on a crescent moon) on a tiny island; 6 clouds carry the words; a huge soft breath orb **centre-low, above the safe-bottom line** (never bottom-centre, which is under the guide panel on phone), echoing the Still Point.
- **Fast start:** intro ≤ 1 s; the orb is holdable from mount; the arrow appears at 500 ms (PANIC tap → first hold ≤ 2.0 s). One intro line, once per device: *"Dizzy or tingly? Breathe normally for a moment."*
- **Controls / mechanic — finger down = air in, finger up = air out:** **press & hold** the orb = inhale 1 (fills to 72 % over 2.0 s; an 8 ms `eosHaptic("notch")` tick + notch 1 lights; `eosBreathOwn("in", 2000)`). At 72 % the notch pulses "…one more sip ↑": **while still pressing, slide the thumb up ≥ 24 px** (or tap anywhere with a second finger; keyboard ↑) = sip 2 (72 → 100 % in 0.6 s, notch 2, bright `eosTone`). If neither comes within 1.0 s the top-up plays **automatically while the finger is still down** (no fail). **Let go** = the exhale: the orb drains **linearly**, a wind ribbon sweeps, two clouds drift off and dissolve into light rain (`rainSfx`), `eosBreathOwn("out", ms)`, `eosHaptic("exhale")`, `eosApi("dots").pulse?.("out")`; input is ignored during the exhale with the cue *"slowly out through the mouth… like through a straw"*. Exhale length is graduated: **4.5 s → 5.5 s → 6 s (→ 6 s)** over the cycles (ratio ≥ 1.7, then ≥ 2.1); cycle 1 adds "as long as feels ok". Lifting before 72 % = a small puff + "bigger breath in, then let go" (no penalty); two early lifts in a row → *"Breathe however feels easy — the slow out is what matters."* 3 cycles (4 when `EOS_STORE.before ≥ 8`). Cue copy follows the protocol: "in through the nose… one more sip… slowly out through the mouth". Keyboard: Space down = inhale, ↑ = sip, Space up = exhale.
- **No heartbeat** anywhere in this game (heartbeat cues are the classic panic trigger); only the notch ticks and the exhale train.
- **Win ≤ 45 s:** 1 s intro + 3 × (2.0 + 0.6 + ~5.3) ≈ 25 s (4 cycles ≈ 32 s). Progress = `cycle/N × 100` at each exhale end, plus a monotonic `+8` provisional during the inhale. Labels: "HOLD · BREATHE IN" → "SIP ONCE MORE" → "LET IT OUT SLOWLY". One scored `sfx("chime")` per completed sigh; everything else soft / `eosTone`.
- **Juice:** squash on each sip, sky gradient storm-violet → dawn-gold by round, Thought Dust rushes into the orb on inhale (`pulse?.("in")`), sunrise + `sfx("win")` finale.
- **Arrow:** orb `eosTarget({g:"hold", ms:2000, label:"HOLD · BREATHE IN"})` → at 72 % `{g:"drag", dir:"u", d:30, label:"SIP MORE ↑"}` → none during the exhale.
- **Science (internal):** modelled on cyclic physiological sighing (double inhale re-inflates alveoli; a long exhale slows heart rate via respiratory sinus arrhythmia), which improved mood and lowered respiratory rate more than mindfulness in a 5-min/day RCT (Balban et al., 2023, *Cell Reports Medicine*). The 2.1 ratio and graduated exhale are our design choices; we claim a fast downshift, not the 5-minute effect.
- **Reduced:** clouds fade instead of drifting; orb scale ≤ 4 % with a numeric "in 2… out 5…" countdown; same timings.

### 8.2 · 112 COOL THE VOLCANO — anger · `22_eos_game_volcano.jsx` · `EosVolcanoEngine`
```js
const EOS_GAME_112 = { id: 112, name: "COOL THE VOLCANO", family: "Destroy", engine: "E04",
    prompt: "What's boiling over?",
    object: "Your words are lava rocks inside RUSH's volcano",
    action: "Tap the crater to erupt, then hold or drag the rain cloud slowly over the lava to cool it",
    mechanism: "Short discharge, then slow breath-paced cool-down",
    hook: "Let it blow. Then let it cool.",
    surprise: "The cooled lava cracks open into a garden and RUSH belly-laughs.",
    mindBend: "Fire needs a minute. Cooling is the strong move.",
    score: "Heat cooled to zero", replay: "A fresh eruption", sound: "Booms, then rain and a calm chime",
    notes: "EOS anger hero · erupt ≤ 8 s, cool ~20 s · ≤ 45 s" }
// hint: "Tap to erupt, then cool it slowly" · gesture "taps" · char "rush" · seconds 30
```
- **Act A ERUPT (≤ 8 s and ≤ 30 % of the game, progress 0 → 30):** tap the crater **6×** — each tap launches rocks carrying the words that arc up and shatter (`PremiumBurst tone="gold"`), `sfx("clack")` (a scored step), `eosHaptic("hit")`, combo floater "BOOM ×3!". **The juice — not the length — scales with intensity** (`EOS_STORE.before`): ≤ 6 → 1 rock per tap; 7-8 → 2 rocks, bigger, deeper boom; 9-10 → 3 rocks, biggest, pitch climbing per tap. Arena shake 6 px / 180 ms, **only on alternate taps when taps come < 300 ms apart** (not with reduced/calm). After the 6th: *"Now watch it cool…"*.
- **Act B COOL (~15-20 s, 30 → 95), the active ingredient:** a rain cloud appears; **drag it slowly back and forth over the lava** — or **press and hold the cloud** for gentle rain at the slow rate (single-pointer), or arrow keys + Space. The game **owns the pacer** (`eosBreathOwn("in", 4000)` / `("out", 6000)`): the rain pulses in / out with it and the cloud cue reads "in… out…"; moving during "out" cools ×2. Pointer speed (EMA of CSS px/s ÷ `eosStageScale`) < 350 → rain; faster → only mist + "slower… 🐢" (cooling at half rate — never zero). Heat 100 → 0: lava red → orange → grey obsidian with steam puffs; a scored `sfx("chime")` at each 20 % of heat removed. A minimum cooling rate guarantees completion by 45 s.
- **Act C BLOOM (2 s auto, → 100):** 8 flowers spring up on the cooled rock (squash), RUSH E29 → E44 belly laugh, `sfx("win")`. The companion is hidden in this game (scene char = RUSH).
- **Arrow:** A: crater `{g:"taps", n:6, label:"ERUPT IT! ×6"}`; B: cloud `{g:"slow", dir:"lr", d:160, maxSpeed:350, label:"RAIN… SLOWLY ↔"}`.
- **Science (internal):** arousal-decreasing activities reduce anger; arousal-increasing venting does not (Kjærvik & Bushman 2024 meta-analysis, 154 studies); venting while ruminating feeds anger (Bushman 2002). The eruption is a ≤ 8 s agency hook; the breath-paced slow cool-down is the active ingredient; "cooling off" is an embodied metaphor.
- **Reduced:** no shake, rocks fade, rain is an opacity pulse.

### 8.3 · 113 GROUND CONTROL — anxiety (also panic mid, fear high, overthinking act 2; first in the gentle list) · `23_eos_game_ground.jsx` · `EosGroundControlEngine`
```js
const EOS_GAME_113 = { id: 113, name: "GROUND CONTROL", family: "Balance", engine: "E04",
    prompt: "What's the what-if?",
    object: "GLITCH's rocket hovers in a fog made of your worry words",
    action: "Spot three real things around you and hold two body beacons to land the rocket",
    mechanism: "5-sense grounding (attention to the here and now)",
    hook: "Your room is real. The what-ifs aren't here yet.",
    surprise: "Each beacon's beam burns off one worry word; on the fifth the rocket touches down and the static clears.",
    mindBend: "Right here is the only place anything is actually happening.",
    score: "Beacons lit", replay: "New missions", sound: "Rising beacon notes, soft landing thump",
    notes: "EOS anxiety hero · 3 spot beacons + 2 body beacons, any order · ~30 s" }
// hint: "Spot it, tap it — then hold the body beacons" · gesture "tap" · char "glitch" · seconds 30
```
- **Mechanic (less reading, more doing):** 5 beacons around the hovering rocket, each a big icon with a mission of **≤ 4 words**.
  - **3 spot beacons** (real world — grounding needs the real room, not an on-screen search): 👀 "something BLUE" (round, shiny, red, soft-looking…), ✋ "touch something SOFT" (cool, smooth, rough, warm), 👂 "farthest sound", 👃 "one smell or taste". Every beacon has a small **"↻ another"** swap, and the pool includes non-visual / non-auditory options ("something cool to touch", "your back on the chair", "the floor under you"), so blind, low-vision and deaf players can always land. Tap = found: it fills over 1.2 s ("keep looking…"; a tap within 1.5 s of the previous one fills over 2.4 s — nudges real looking, never refuses), lights gold with a rising pentatonic note (`sfx("tskey:clean:"+i)`, a scored step), and its **beam sweeps the fog**, revealing a glowing icon of what you found and burning off one worry word (an `EosWord`).
  - **2 body beacons** are holds: 🦶 "feet down — hold" and 🫁 "drop your shoulders" (hold 3 s each while you do it; live hold ring; release pauses, never resets).
  - The rocket descends one step per beacon; any order.
- **Win ≤ 45 s:** ~30 s. Finale: dust puff, GLITCH E15 → E10 (cool), static stripes fade, fog `backdrop-filter: blur(8 → 0)`.
- **Arrow:** the next unlit beacon nearest the thumb: spot `{g:"tap", label:"FOUND IT? TAP"}`, body `{g:"hold", ms:3000, label:"HOLD · FEET DOWN"}`.
- **Science (internal):** 5-4-3-2-1 grounding compressed to 5 beacons: attentional deployment to exteroceptive and body input competes with worry for working memory (Gross 1998). We claim a fast attention shift, not a cure.
- **Reduced:** rocket steps, no fog drift.

### 8.4 · 114 SKY LANTERNS — sadness and loneliness (comfort & warmth) · `24_eos_game_lanterns.jsx` · `EosSkyLanternsEngine`
```js
const EOS_GAME_114 = { id: 114, name: "SKY LANTERNS", family: "Release", engine: "E04",
    prompt: "What feels heavy or lonely right now?",
    object: "Three paper lanterns, each holding your words, beside DROP on a dusk hill",
    action: "Hold a lantern to warm it, then flick it up into the sky",
    mechanism: "Warmth, common humanity and one small reach-out",
    hook: "Warm it in your hands. Let it rise.",
    surprise: "Your lanterns join every lantern you've ever lit here, and DROP hugs a heart.",
    mindBend: "Missing someone means you loved something.",
    score: "Lanterns lit", replay: "A new dusk", sound: "Warm hum, paper rustle, star twinkles",
    notes: "EOS sadness/loneliness hero · ~25 s · optional send-warmth share" }
// hint: "Hold a lantern to light it, then flick it up" · gesture "hold" · char "drop" · seconds 25
```
- **Mechanic:** **hold** a lantern 1.2 s to light it (glow builds from the fingers, warm hum, a slowing visual heartbeat via `eosHeartbeat(60, 52)`); then **flick / drag it up** (or simply let go once lit — it rises by itself; keyboard: Space holds, ↑ releases). It sways up, joins the sky and its word softens into a star. True copy rotates under it: *"Missing someone means you loved something."* · *"Lots of people are looking up at the same sky tonight."* The sky shows **the user's own past lanterns** (count of `eos_sessions_v1` rows for game 114, capped visually at 120; "N lanterns lit here" only when N > 0 — never fake strangers).
- **Finale:** DROP (E70 → E08 hugging a heart). A 4th golden lantern asks **"Send a little warmth?"** — `Text someone "thinking of you"` (`navigator.share({text:"Thinking of you 💛"})`, fallback clipboard + toast "Copied — paste it to someone") or `Keep it for me` — equal size, both finish the game. **Safety mode** (any strong flag): the lantern reads **"Text someone you trust"** → `"Hey, can you talk? I'm having a hard time."` (same fallbacks).
- **Win ≤ 45 s:** 3 × (1.2 + 2.5) + 5 ≈ 16-25 s. GOOD is never routed here (its copy is about loss).
- **Arrow:** unlit lantern `{g:"hold", ms:1200, label:"HOLD TO LIGHT IT"}` → lit `{g:"drag", dir:"u", d:140, label:"LET IT RISE ↑"}` → finale (both options marked) `{g:"choose", label:"YOUR CHOICE"}`.
- **Science (internal):** soothing touch; common humanity (Neff 2003); people underestimate how much a small reach-out is appreciated (Epley & Schroeder 2014; Liu et al. 2023); rituals ease grief (Norton & Gino 2014). Nothing rests on warm-cup priming.
- **Reduced:** lanterns fade upward without sway.

### 8.5 · 115 KIND ECHO — shame → self-kindness (also jealous, lonely act 2) · `25_eos_game_kind.jsx` · `EosKindEchoEngine`
```js
const EOS_GAME_115 = { id: 115, name: "KIND ECHO", family: "Reframe", engine: "E04",
    prompt: "What's the harsh thing you're telling yourself?",
    object: "PATCH clutching a cracked card with your harsh words",
    action: "Thumb on PATCH's heart, then drag a kind line onto the harsh card",
    mechanism: "Self-compassion and supportive self-touch",
    hook: "Talk to yourself like someone you love.",
    surprise: "The harsh letters melt away and the kind line writes itself in; PATCH holds up a flower.",
    mindBend: "You'd say this to a friend. You're allowed to say it to you.",
    score: "Harsh cards rewritten", replay: "New kind words", sound: "Heartbeat, warm hum, pen-scratch chime",
    notes: "EOS shame hero · hand-on-heart 3 s (+ optional 5 s) + 2 kind echoes · ~30 s" }
// hint: "Thumb on the heart, then give it a kind line" · gesture "hold" · char "patch" · seconds 30
```
- **Stage 1 hand on heart:** *"Thumb on PATCH's heart — and if you like, your other hand on your own chest."* Press and hold 3 s — warm orange fill, the **visual** heartbeat slows **72 → 56 bpm** (`eosHeartbeat(72, 56, 3000, onBeat)`, haptic per beat when available), PATCH softens E73 → E75. Letting go pauses ("keep it there…"), never resets. Then an optional 5 s **"stay here"** with two slow breaths (skip link; never required).
- **Stage 2 kind echo × 2 rounds** (the 2 longest chunks): the harsh card (user's words, cracked) floats up; 3 kind orbs drift in from a bank tagged by self-compassion component (kindness *"You did the best you could with what you knew."*, common humanity *"Anyone would've struggled with this."*, mindfulness *"One moment isn't the whole you."*, growth *"You're learning, not failing."*, friend *"I'd forgive a friend for this."* + ~20 more), matched to the emotion: **jealous** gets own-wins lines (*"Something you did this week took guts."* · *"You have things you'd really miss."* · *"Your path has its own pace."*), lonely gets connection lines. **Safety mode** (strong flag) uses only: *"It's not your fault."* · *"You deserve to be safe."* · *"You matter, right now."* · *"You don't have to carry this alone."* (no lines that imply fault). **Drag (or tap) one onto the card:** harsh letters fall away one by one, the kind line writes itself in (stroke reveal), `sfx("chime")` (scored).
- **Finale:** PATCH holds a flower (E72), end card *"You'd say this to a friend. You're allowed to say it to you."*
- **Win ≤ 45 s:** ~25-35 s. **Arrow:** heart `{g:"hold", ms:3000, label:"HOLD · HAND ON HEART"}` → orbs (all marked) `{g:"dragTo", to:".eosKindCard", label:"GIVE IT A KIND LINE"}`.
- **Science (internal):** self-compassion reduces shame and increases repair motivation (Neff 2003; Breines & Chen 2012); the game **invites** supportive self-touch on the user's own body (Dreisoerner et al. 2021 studied ~20 s of hand-on-chest / self-hug); advice-to-a-friend self-distancing (Grossmann & Kross 2014).

### 8.6 · 116 SQUEAKY THOUGHT — overthinking / harsh self-labels · `26_eos_game_squeaky.jsx` · `EosSqueakyEngine`
```js
const EOS_GAME_116 = { id: 116, name: "SQUEAKY THOUGHT", family: "Absurdity", engine: "E04",
    prompt: "Which thought keeps looping?",
    object: "Your stickiest words inside LOOPIE's giant jelly bubble",
    action: "Say the word with each tap — out loud or in your head — until it's just a squeaky noise",
    mechanism: "Word-repetition defusion",
    hook: "Say it enough and it's just sounds.",
    surprise: "The letters wobble, flip and pop off as bubbles; the bubble just says 'blub blub' and LOOPIE giggles.",
    mindBend: "A thought is a sound your mind makes. You don't have to obey a sound.",
    score: "Squeaks to defusion", replay: "Pick another loop", sound: "Rising squeaks, giggle pop",
    notes: "EOS overthinking hero · ~20-30 s of repetition · never spins safety words" }
// hint: "Say it with each tap until it's a squeak" · gesture "taps" · char "loopie" · seconds 25
```
- **Mechanic:** the stickiest chunk (longest non-stopword chunk; 3 chips let the user swap it in the first 2 s) sits in a giant jelly bubble with LOOPIE (spiral eyes E58). Cue: **"say it with each tap — out loud or in your head"**. Tap at a comfortable 1.5-3 taps/s (holding auto-repeats at 2/s for accessibility). The MEANING-O-METER drains with **time under repetition**: **≥ 18 s of active tapping in two 9 s rounds** — "normal voice" then "chipmunk voice" (squeak `eosTone` with rising glide on every tap). Letters jitter → space out → flip → become bubbles across the rounds; a scored `sfx("pop")` at each of the 4 letter-stage changes. At the end: letters pop off, the bubble reads "blub blub", LOOPIE E70 giggles. The meter and letters animate via CSS variables / attributes, never text-node churn (≤ 4 Hz).
- **Voice:** `speechSynthesis` is **off by default**; a 🔊 "say it out loud" chip (`eos_prefs_v1.speak`) turns it on, and then only with a **local** voice (`speechSynthesis.getVoices().find(v => v.localService && v.lang.startsWith(lang))`; none → squeak tones only), on taps 1, 8 and 15, `cancel()` first. The user's private words never go to a cloud voice or out of the speaker unasked.
- **Win ≤ 45 s:** 20-30 s; auto-completes at 30 s if ≥ 10 taps (no fail).
- **Arrow:** bubble `{g:"taps", n:<seconds left>, label:"SAY IT · TAP"}` — the engine updates `data-eos-n` once per second, so the badge counts **seconds**, not taps.
- **Safety:** under a strong flag `eosWords` returns neutral words, and the router never routes 116 while any flag is set.
- **Science (internal):** repeating a self-relevant negative word aloud, quickly, for ~20-30 s reduces its discomfort and believability, growing with time (Titchener's repetition; Masuda et al. 2004, 2009 — cognitive defusion); humour adds distance.

### 8.7 · 117 COLOUR RUSH — numbness up-regulation (savour mode for GOOD) · `27_eos_game_colour.jsx` · `EosColourRushEngine`
```js
const EOS_GAME_117 = { id: 117, name: "COLOUR RUSH", family: "Rhythm", engine: "E04",
    prompt: "Where did the colour go?",
    object: "A grey HQ where your words are grey stones and SYNC is unplugged",
    action: "Tap or scribble anywhere on the beat to splash colour back in",
    mechanism: "Behavioural activation with rhythm, colour and sound",
    hook: "Colour first. Feelings follow.",
    surprise: "At full colour SYNC's lights flicker on and the whole crew dances on the beat.",
    mindBend: "You don't have to feel like it to start. Starting is how the feeling comes back.",
    score: "Colour restored", replay: "A new grey day to paint", sound: "Soft beat, pentatonic splashes",
    notes: "EOS numbness hero · savour mode for GOOD · ~25 s" }
// hint: "Splash colour on the beat" · gesture "timing" · char "sync" · seconds 25
```
- **Mechanic:** scene under `filter: grayscale(var(--g)) brightness(var(--b))` starting at 1 / .75. A soft beat at 96 bpm (`eosTone` kick on 1 & 3, hats on 8ths via a 25 ms look-ahead scheduler on the AudioContext clock; a visual metronome ring pulses even with sound off). The game drives the Still Point beat with `eosPacerBeat(bpm)` (0 on exit). **Tap or scribble anywhere:** on-beat (±140 ms) = big splash (random joyful hue, overshoot scale-in) + combo; off-beat = smaller splash (never "wrong"). **Big splashes are rate-limited to 3 per second and ≤ 10 % of the arena each; scribbling paints small dabs** (no flashing). Words are grey stones: 3 splashes on a stone → candy gem + confetti. Every 8 combo adds a music layer and +4 bpm (max 112) and plays one scored `sfx("spark")`. Coverage tracked on a 6×8 grid drives `--g`; at 60 % the cast pops out and bounces on the beat.
- **Win ≤ 45 s:** coverage ≥ 80 % or (all stones gemmed and ≥ 60 %) ≈ 20-30 s. SYNC E34 grey → E61 full colour dancing.
- **Savour mode** (`eosCurrentEmotion()==="good"`): splashes print gold sparkles, end card "bank it ✦".
- **Arrow:** arena centre / nearest grey stone `{g:"timing", bpm: current, label:"SPLASH ON THE BEAT"}`.
- **Science (internal):** behavioural activation — action before motivation (Dimidjian et al. 2011); rhythm and music raise arousal and positive affect via reward circuitry (Salimpoor et al. 2011); colour and novelty counter flat affect. It is an **up-regulation** game, the opposite prescription of the calming ones. Never routed late at night unless the feeling is numb, never in safety mode.
- **Perf:** splashes are a recycled pool of 24 nodes; no canvas needed.

### 8.8 · 118 SHADOW SHRINK — fear (approach, graded and chosen; mid band) · `28_eos_game_shadow.jsx` · `EosShadowShrinkEngine`
```js
const EOS_GAME_118 = { id: 118, name: "SHADOW SHRINK", family: "Reveal", engine: "E04",
    prompt: "What's the scary shape?",
    object: "Big shadow shapes on a bedroom wall made of your fear words",
    action: "Bring the flashlight closer to each shadow and hold the light on it",
    mechanism: "Approach, not avoidance (fear shrinks up close)",
    hook: "Shadows are biggest from far away.",
    surprise: "Each shadow turns out to be a tiny sock puppet wearing your word.",
    mindBend: "Looking closer is how big things get their real size back.",
    score: "Shadows shrunk", replay: "A new night", sound: "Low hum that pitches down, a giggle squeak",
    notes: "EOS fear game (mid band) · 3 shadows · ~30 s · never routed for a real-threat text" }
// hint: "Bring the light closer and hold it there" · gesture "dragTo" · char "glitch" · seconds 30
```
- **Mechanic:** a wobbly shadow made of the fear words (blurred silhouette text) starting at **2×** (not 3×); GLITCH peeks from under a blanket (E11 → E10). **Bring the flashlight toward the shadow** (light cone = radial-gradient mask following the lamp): as the distance shrinks the shadow scales 2 → 0.4 and sharpens (blur 12 → 0 px), the hum pitches down. **Hold the light on it 1.5 s** ("look right at it") → it is revealed as a tiny sock puppet wearing the word with googly eyes, `sfx("plink")` (scored), caption **"smaller up close."** / **"you looked right at it."** (never "that's it?"). There is **no consequence for looking away**: if the light points away for 1.5 s, the light drifts a little closer by itself. 3 rounds (3 longest chunks). **Tap-steps are always available** (tap the shadow: "closer · closer · look"), and keyboard arrows move the lamp, Space holds it — single-pointer and keyboard players never need the drag path.
- **Win ≤ 45 s:** ~25-30 s. **Arrow:** lamp `{g:"dragTo", to:".eosShadow.isLive", label:"SHINE IT CLOSER"}` → `{g:"hold", ms:1500, label:"HOLD THE LIGHT"}`.
- **Routing guard:** `EOS_ROUTE_RULES[118]` blocks it whenever `eosRealThreat(text)` (a person who might really hurt the user is not a sock puppet); it is not in the fear high band.
- **Science (internal):** approach / exposure creates new safety learning when it is graded and chosen (inhibitory learning, Craske et al. 2014); naming the fear lowers amygdala response (Lieberman et al. 2007); humour lowers threat appraisal.
- **Reduced:** the tap-step mode is the default.

### 8.9 · 119 YOUR SPOTLIGHT — jealousy, comparison, envy, FOMO (wins mode for GOOD) · `29_eos_game_spotlight.jsx` · `EosSpotlightEngine`
```js
const EOS_GAME_119 = { id: 119, name: "YOUR SPOTLIGHT", family: "Reframe", engine: "E04",
    prompt: "Whose highlight reel is hogging the light?",
    object: "A giant billboard of your comparison words steals the spotlight from PATCH's small dark stage",
    action: "Swing the spotlight onto your own stage, then pick a win to put in the light",
    mechanism: "Gratitude and self-affirmation (attention back to your own resources)",
    hook: "Their highlight reel isn't your whole story.",
    surprise: "Your three pedestals rise into gold trophies and the billboard shrinks to a little poster.",
    mindBend: "Comparing shows you their best. The spotlight shows you yours.",
    score: "Trophies lit", replay: "New wins", sound: "Spotlight clunk, rising chime, applause sparkle",
    notes: "EOS jealousy hero · 3 rounds · ~25-30 s · wins mode for GOOD" }
// eosRegisterGame(EOS_GAME_119, EosSpotlightEngine, { hint: "Swing the light to your stage, then pick a win", mindBend: EOS_GAME_119.mindBend, css: EOS_SPOTLIGHT_CSS, gesture: "dragTo", char: "patch", seconds: 30 })
```
- **Scene:** a theatre at dusk. **Left:** a huge glossy billboard holding the user's comparison words (`EosWord`s), lit by a giant swivel spotlight. **Right:** PATCH's small dark stage with 3 empty pedestals. PATCH E70 (envious) → E11 (proud) → a win-pool face at the finish.
- **Each round (3):**
  1. **Swing the light:** drag the spotlight head from the billboard to an empty pedestal (`dragTo`; snap within 90 px). Single-pointer alternative: tap an empty pedestal and the light swings there by itself; keyboard Enter on the lamp = next empty pedestal. The beam is an SVG polygon from the lamp to the target, updated through refs (no React state per frame).
  2. **Pick a win:** a chip row (3 chips + "↻ more") from a bank of ~20, mood-matched: *"I showed up today", "I helped someone", "I made someone laugh", "I kept going", "I learned something", "Someone trusts me", "My body carried me today", "I made something", "I have someone who'd pick up", "A small win this week"…*. No typing (nothing to store; the composer still holds the user's words).
  3. The pedestal rises into a gold trophy with the chosen win in 16 px gold letters (chip text, never user text), confetti + `sfx("chime")` (scored); the billboard dims one step and shrinks (1 → .85 → .7 → .55) — "a little poster".
- **Finale:** the billboard is a little poster in the corner, PATCH's stage glows; end card *"Comparing shows you their best. The spotlight shows you yours."*
- **Wins mode** (`eosCurrentEmotion()==="good"`): prompt "What went right today?", the billboard holds the user's words as a gold marquee, chips are good-day wins, end card "bank it ✦".
- **Safety:** under a strong flag the billboard shows neutral words (core) and the chips stay as they are (they are affirming, never comparative).
- **Win ≤ 45 s:** 3 × (drag ~3 s + chip ~4 s) + 6 s finale ≈ 25-30 s; auto-assist: after 6 s idle the light glides halfway and the arrow re-shows.
- **Arrow:** lamp `{g:"dragTo", to:".eosSpotPedestal.isEmpty", label:"SWING THE LIGHT TO YOU"}` → chips (all marked) `{g:"choose", label:"PICK A WIN"}`. LIVE GUIDE label sequence: "SWING THE LIGHT" → "PICK A WIN".
- **Science (internal):** gratitude / "three good things" (Emmons & McCullough 2003; Seligman et al. 2005); self-affirmation lowers threat responses to upward social comparison (Cohen & Sherman 2014); attentional redeployment toward your own resources turns malicious envy toward benign envy and your own goals.
- **Reduced:** the beam cross-fades between positions; trophies fade up.

### 8.10 · 120 ONE THING — overwhelm, stress, to-do paralysis · `2a_eos_game_onething.jsx` · `EosOneThingEngine`
```js
const EOS_GAME_120 = { id: 120, name: "ONE THING", family: "Sort", engine: "E04",
    prompt: "What's piling up on you?",
    object: "Your words fall as soft blocks into GLITCH's box that is far too small",
    action: "Swipe each block to LATER or LET GO, tap the one for NOW, then make it tiny",
    mechanism: "Offloading, worry postponement and one tiny next step",
    hook: "You only have to catch one.",
    surprise: "The box breathes out, the shelf holds the rest, and your one thing shrinks into a glowing pebble.",
    mindBend: "Everything isn't due right now. One thing is.",
    score: "Box cleared", replay: "A new pile", sound: "Soft thuds, balloon pops, a long box sigh",
    notes: "EOS overwhelm hero · ≤ 6 sorts + 2 chips · ~20-30 s" }
// eosRegisterGame(EOS_GAME_120, EosOneThingEngine, { hint: "Swipe left for later, right to let go, tap for now", mindBend: EOS_GAME_120.mindBend, css: EOS_ONETHING_CSS, gesture: "swipe", char: "glitch", seconds: 25 })
```
- **Scene:** GLITCH (static, E56) beside a cardboard box that is far too small; a LATER shelf on the left, an open sky on the right, one NOW slot glowing in the middle.
- **1 · The fall:** the user's chunks (`eosWords(entries, 6)`) drop as soft blocks into the box (pre-mounted pool, no remounts); the box bulges and groans comically.
- **2 · Sort each block** (the top block is live):
  - **Swipe LEFT → LATER shelf** (worry postponement): it slides onto the shelf with a "later" tag.
  - **Swipe RIGHT → LET GO:** it floats off as a balloon and pops softly.
  - **Tap → NOW:** there is one NOW slot; a second NOW asks "swap?".
  - `onDragEnd` reads `offset.x` / `velocity.x` (thresholds 90 px or 500 px/s in CSS px ÷ `eosStageScale`); a tap is a pointerup with < 8 px movement. Single-pointer / keyboard alternative: three small buttons under the live block (← LATER · NOW · LET GO →) and ← / Enter / → keys.
  - Each sort is a scored step (`sfx("pop")`).
- **3 · The release:** when ≤ 1 block is left in the box, the box **breathes out** — it expands with a long sigh sound; the game owns the pacer for it (`eosBreathOwn("out", 3000)`, `eosApi("dots").pulse?.("out")`).
- **4 · Make it tiny:** the NOW block offers 4 chips (*open it · first 2 minutes · one sentence · ask someone*), then "when?" chips (*now · after this · tonight*); it shrinks into one glowing pebble labelled e.g. "first 2 minutes · after this". If nothing was put in NOW, the finale offers "pick one tiny thing for later?" (optional) or "nothing needs doing right now ✓" — never forced.
- **5 · End:** an empty, calm box and one pebble; GLITCH static → STILL calm (E15) peeks out; end card **"this one thing ✓"**.
- **Win ≤ 45 s:** ≤ 6 sorts + 2 chips ≈ 20-30 s; auto-assist after 6 s idle (the arrow re-shows; after 15 s the live block offers its three buttons larger).
- **Arrow:** live block `{g:"swipe", dir:"lr", d:110, label:"← LATER · LET GO →"}` → size chips (all marked) `{g:"choose", label:"MAKE IT TINY"}` → when chips `{g:"choose", label:"WHEN?"}`. LIVE GUIDE labels: "SORT THE PILE" → "MAKE IT TINY" → "PICK WHEN".
- **Science (internal):** cognitive offloading (Risko & Gilbert 2016); making a concrete plan stops unfinished-goal intrusions (Masicampo & Baumeister 2011); implementation intentions (Gollwitzer 1999); scheduled worry postponement (Borkovec 1983).
- **Reduced:** blocks slide without bounce; the box breath is an opacity pulse.

### 8.11 Next batch (documented only, not in this build)
- **HYPE FLIP** — pre-exam / interview / date nerves → "I'm excited" reappraisal: the jittery meter becomes a rocket's fuel gauge (Brooks 2014, arousal reappraisal).
- **CRINGE REEL** — an embarrassing moment replayed as a sped-up cartoon with a silly voice (humour distancing for shame).
- **SHAKE IT OFF** — DeviceMotion shake for anger and stress, with a tap fallback and the motion-permission prompt only on a tap (iOS).
- Mine `rush.json … still.json` / `thinkstill-modes.json` (1,000 rituals) for further scenes.

### 8.12 Acceptance (every new game)
In a scratch integrated build (`dev/eos_integrate.py --dev-dir … --modules <file>`) and the full build: registers in `GAMES` with all 15 string fields and `EOS_GAME_META[id]` has `gesture`, `char`, `seconds`; `EosEngineFor` returns it; starts from the menu by name; the arrow appears from `data-eos-target` within 1.5 s and **every** stage's arrow appears as the game advances; can be finished with the arrows' gestures by `eos_drive.finishGame` in ≤ 45 s at 1280 and 390 (and with the single-pointer / keyboard alternative); progress strictly increases and reaches 100 once; `onDone` once; no `onProgress` third argument; non-soft `sfx` calls ≤ the number of real successes (count via the wrapper's CHAIN pill); **no `[data-eos-target]` rect intersects `.globalPlayGuide` or `.engineProgressHud`** at 1280×860 or 390×844; no text below 14 px inside the arena; no flashes (no frame-to-frame luminance change over 10 % of the arena more than 3×/s in a 2 s screen capture); zero page errors; no class from the avoid-list in the DOM; reduced motion has no travel; the Pixar checklist (§8.0) ticked with screenshots (start / mid / finish × desktop / phone) reviewed.

---------------------------------------------------------------------------------------------------
## 9. Rewards and the healthy habit loop (`src/eos/52_eos_rewards.jsx`, task `rewards`)

### 9.1 The loop, made ethical
| hook stage | ThinkStill | guardrail |
|---|---|---|
| trigger (internal) | the feeling itself; the home screen *is* "Who's at the controls?"; a friend's shared link opens on a feeling | no notifications, no guilt copy, ever |
| action | 1 tap (panic) or 2 taps + GO, then a game the arrow teaches in 1 s | "just let me play" and "Need to talk to someone?" always visible |
| reward | real relief + juicy finish + a memory orb with an expression you don't own yet (variable, cosmetic) + cosmetic dust styles | **pay the ritual, celebrate the shift**: ⚡, orbs and rarity come from completing the loop, never from the size of Δ (nobody inflates ratings, the router stays honest); Δ only changes words |
| investment | Orb Shelf, character bonds, **skill** ranks, a router that learns what works for *you* | data local only; "don't keep history" toggle; one-tap "reset my history" |

### 9.2 Rules (all derived from `eos_*` storage and the arcade score; never user text)
- **⚡ for showing up:** the shift meter calls `addScore(25)` once per launch **when the reveal is reached** (header ⚡ count-up as particles land on the score). Copy: "+25 ⚡ for showing up".
- **Memory orb** — one per completed loop (rated or skipped), max 5 per local day (later loops still pay ⚡ and days). `{t, emo, char, face, tier, before, after, gameId}` in `eos_orbs_v1` (cap 400; not written when `keepHistory` is off — then the orb exists for this app session only). `face` = an expression of the emotion's character the user does not own yet from `eosFacePool(char, "win")` (**102 faces** across the cast), else any. **"Expression of the Day":** the first loop of each local day is guaranteed a new face.
- **Rarity comes from the loop, never from Δ:** **gold "CORE MEMORY ✦"** for the first orb of the day, a game played for the first time, an emotion checked in for the first time, or a bond level-up; **silver** otherwise. Never "lost", never expires.
- **Bonds** — `eos_bonds_v1[char]` += 1 on **any** loop where that character appears (as the companion or as the game's scene character). Levels at **1, 3, 6, 10, 15** each unlock the next face from the win pool (shown on the check-in orb after the shift) and a one-liner: RUSH "learned to laugh it off" · SYNC "can nap through thunder" · GLITCH "found the off switch" · LOOPIE "can stop the spin" · DROP "knows rain ends" · PATCH "is kinder to PATCH" · STILL "is proud of you". Finite collection, not a slot machine.
- **Skills, not suffering (mastery):** ranks count **skills by mechanism, whatever the check-in emotion** (GOOD and NOT SURE plays count too): `EOS_REWARDS_SKILLS` = **Sigh** (111, 109, 65, the sigh Still Moment) · **Cool-down** (112, the cool Still Moment, 36, 44, 77) · **Grounding** (113, 102, 66, 80) · **Kind-voice** (115, 114) · **Loop-breaker** (116, 61, 43, 41, 34, 22, 29, 99) · **Spark** (117, 68, 1) · **Space** (120, 93, 95, 21, 87) · **Own-glow** (119, 47) · **Brave-look** (118, 31, 97). Ranks Rookie 1 → Steady 5 → Pilot 15 → Master 40, each naming what you can now do *without* the app ("you know the double-sip sigh", "you let it out, then cool it down", "you can land in the here and now", "you talk to yourself like a friend", "you turn a loop into a squeak", "you start before you feel like it", "you make space", "you find your own glow", "you look closer"). Copy: *"Practise when calm — it works better when you need it."*
- **Days you showed up** — "☀ 4 days this week" (**no denominator**, no 7/7) and lifetime "days you showed up: 23", which never resets. Milestones on **lifetime** days 3 / 10 / 30 / 100 grant one gold orb each. There is no streak that can break and no "you missed a day" copy.
- **⚡ milestones → cosmetic dust (F6):** lifetime ⚡ (the arcade score, `localStorage[SCORE_KEY]`, read with a `typeof SCORE_KEY` guard) at 250 / 1000 / 2500 / 5000 unlocks the Thought-Dust styles fireflies / aurora / snow / gold (picked in the shelf, stored in `eos_prefs_v1.dust`, rendered by dots). Cosmetic only; relief is never gated.
- **Your own stats (no speed pressure):** "points shifted: 47" (sum of positive Δ over non-retro rows) and **"helps you most · ANGER: COOL THE VOLCANO (avg 5 lighter)"** (non-retro rows, ≥ 2 per game). No "fastest" records of any kind.
- **API:** `eosGrantForShift(shift)` → `{orb, bond:{char, level, next, unlocked}, skill:{id, rank, next}, week, line}` (writes orbs/bonds; idempotent per `shift.t`), `eosBondFor(char)`, `eosSkillFor(skillId)`, `eosWeek()`, `eosMyStats()`. `eosExpose("rewards", {grantForShift: eosGrantForShift, EosShareButton, eosMakeShareCard, eosBondFor, eosSkillFor, eosWeek, eosMyStats})`.

### 9.3 Surfaces
- `EosWorldChips({stage, reduced})` (mounted by I2; visible in `input` and `reveal`): top-right of the stage, **z 170** (above the reveal overlay), two 44 px glass pills `[data-eos-chip="orbs"]` "◉ 12" and `[data-eos-chip="days"]` "☀ 4" (15 px numbers); the ◉ pill is the landing target of the orb flight (§6.6) and bumps "+1". Tap → `EosOrbShelf`. Hidden while the game menu is open and on phone while check-in step 2 is up (CSS, §6.3).
- `EosOrbShelf({onClose})`: a sheet inside `.releaseStage` (**z 220**; bottom sheet on phone, centred panel on desktop), `EOS_PRIVATE_ATTRS`: 7 character shelves with their orbs (face inside, tier rim) and silhouettes for locked bond faces; tap an orb → "PANIC 8 → 3 · Tue · BIG SIGH" (**day only** by default, no clock time); skill chips with ranks; "points shifted" + "helps you most"; the dust-style picker; **"Share my week"** (§9.3 weekly card); **"Need to talk to someone?"**; "◐ calm visuals"; **"Don't keep history on this device"** toggle (`keepHistory`); footer `EOS_DISCLAIMER`; "reset my history" (two-tap confirm; clears `eos_*` except prefs). Escape / backdrop closes; focus trapped while open; reduced: cross-fade only.
- **Share card** `eosMakeShareCard(shift, {format: "story" | "feed", showFeeling})` → `Promise<Blob>` (PNG; **story 1080×1920** is the phone default, feed 1080×1350): the emotion's `grade` gradient → gold, warm vignette, a 60-dot Thought Dust spiral converging on the calm character, loud face → arrow → calm face (`img.crossOrigin="anonymous"` — raw.githubusercontent serves `Access-Control-Allow-Origin: *`; on failure draw a coloured orb), headline **"ANGER 8 → 2"** (Baloo 2 900 ~150 px after `document.fonts.load`), "shifted in 41 s · COOL THE VOLCANO", the **skill badge** ("SIGH PILOT"), "with RUSH · ThinkStill", and the `shareUrl` deep link when set. `better:"up"` emotions read "GOOD 5 → 8 · lifted". For **shame, lonely, sad and fear** the card defaults to the character + "a shift" without the feeling's name (toggle "show the feeling name"). **Never** includes the user's words; hidden while any safety flag is set.
- **Weekly card** `eosMakeShareCard(null, {format, week:true})` from the shelf's "Share my week": this week's orbs as dots in their character colours, "☀ 4 days", "47 points shifted", the top skill — numbers from `eos_sessions_v1` / `eos_orbs_v1` only.
- `EosShareButton({shift})`: `navigator.canShare({files})` → `navigator.share({files, text})`; else download (`a[download]`) + copy the caption with a toast. **Captions rotate** (3 per emotion), e.g. *"I shifted ANGER 8 → 2 in 41 s with ThinkStill 🫧 #ThinkStillShift"* · *"RUSH handed back the controls. 8 → 2 ✦"* · *"Cooled it down in 41 s. Your turn?"*; with `shareUrl` set the caption ends with `${shareUrl}?eos=${emo}&t=${seconds}` (the check-in reads it, §6.2). Busy state while rendering; errors fall back silently to download.

### 9.4 Anti-dark-pattern rules (enforced in review)
1. Every reveal has **I'M GOOD ✓** at least as large as ONE MORE. 2. After 3 rated loops or 10 minutes: "You've shifted 3 times — nice. Take the calm with you?" and I'M GOOD becomes the only primary; nothing is blocked. 3. No loss aversion: no expiring rewards, no breakable streaks, no weekly denominators, no countdown offers. 4. No social pressure or fake data (no "1,284 people calming down now", no leaderboards, shared links never compare). 5. Variable rewards are cosmetic, free and capped (5 orbs/day); rarity never depends on Δ. 6. Never celebrate a negative Δ, never shame a zero Δ. 7. No autoplay into the next game. 8. Nothing the user typed is stored or shared, ever; history can be switched off. 9. Mastery rewards skills, so coming back distressed is never the only way to progress. 10. Sharing a sensitive feeling is never the top button.

### 9.5 Acceptance (rewards)
After one loop: one orb row (gold: first of the day), bond +1 for the companion's and the scene's character, the skill rank moves, "☀ 1 day this week", header ⚡ +25 (once, on reaching the reveal), the orb lands in the ◉ chip; chips visible in input/reveal at both sizes without overlapping the header/composer, **clickable in the reveal** (`elementFromPoint` at the chip centre is the chip); shelf opens/closes with keyboard; `eosMakeShareCard` resolves a 1080×1920 (story) and a 1080×1350 (feed) PNG blob with no user text (`canvas.toDataURL` length > 50 kB; the text drawn is from the allow-list); for SAD the default card has no feeling name; the weekly card renders from numbers only; with `keepHistory` off no session / orb rows are written; reset clears history; no `localStorage` value contains the typed thought.

### 9.6 The personal flip line (`src/eos/16_eos_flipdata.jsx` + `dev/eos_flip_index.mjs`, task `flipdata`, P2)
The owner's 1,000-ritual library (`rush.json … still.json` at the repo root: `keywords`, `mindBend`, `win`, `safety_class` per ritual) is turned into **one personalised line under the payoff**.
- **Generator** `dev/eos_flip_index.mjs` (node, run by the task; re-runnable): classify each ritual into one of the 12 emotions with core's `eosDetectEmotion` over its `challenge` / `situation` / `keywords` (compile core with esbuild as the lead's node test does), keep only safe rituals (`safety_class` / `safety_tier` safe), take its `win` line (else `mindBend`) when it is ≤ 90 chars and passes `EOS_COPY_RULES` (no banned words, phrases or claims), and keep ≤ 24 per emotion with ≤ 6 keywords each. Output: `src/eos/16_eos_flipdata.jsx` = `const EOS_FLIP_INDEX = { panic: [{k: "kw1 kw2 …", l: "line"}, …], … }` + the matcher. **Inlined** (≤ 40 kB), no network fetch: it works offline, before the repo is merged, and no request reveals anything about the user.
- **Matcher:** `eosExpose("flip", { match(entries, emo) → "emo:i" | null, line(key) → string | null })`; `match` scores keyword overlap with the user's words (in memory, at launch — core's `EosMarkLaunch` calls it and stores only the key) and falls back to `null`. The shift meter shows `line(flipKey)` under the payoff in 14 px italic; nothing under a strong safety flag; falls back silently to nothing.
- **Acceptance:** the generated module builds, is ≤ 40 kB, every line passes `EOS_COPY_RULES`; `match(["my boss yelled at me"], "anger")` returns a key whose line is non-empty; no line contains user text.

---------------------------------------------------------------------------------------------------
## 10. Safety card (`src/eos/55_eos_safety.jsx`, task `safety`)

### 10.1 Triggers (in memory only; never stored or sent) — the lexicon lives in core
`EOS_SAFETY_LEX` (`selfharm`, `selfharm2`, `abuse`, `abuse2`, `soft`), `EOS_REAL_THREAT` and `EosSafetyScan(text)` → `null | "selfharm" | "abuse" | "threat" | "soft"` are in **core** (§0.2), so the router, `EosMarkLaunch`, `EosEntries`, `eosWords` and every game can scan **synchronously** — no 400 ms debounce race with a fast Enter. The safety module owns the UI. Both abuse patterns share one subject list (`EOS_SAFETY_WHO`: he/she/they/my dad, mum, parents, ex, step-…, partner, boss, teacher, coach, sibling, uncle, aunt, cousin, grand-…, guardian, carer). Per-verb exclusions keep everyday phrases out ("hit me up / back" = texting, "beat me at / in / to" = a game, "kicked me out / off" = a group) without losing "he beat me up" or "she burned me with a lighter". Distances ("ran 10 kms") are stripped before the scan; a bare "kms" still matches. **No lookbehind anywhere** (Safari < 16.4); `build.py` rejects it.

**Verified in node against the shipped core** (all pass):
- **must → selfharm:** "i want to die", "I wanna die", "thinking about suicide", "I keep cutting myself", "I don't want to be here anymore", "everyone would be better off without me", "kms", "I can't go on", "no point in living", "i dont want to be alive", "life isn't worth living", "sleep and never wake up", "nobody would miss me", "I'm a burden", "I feel like a burden to everyone", "i want to unalive myself", "thinking of sewerslide", "i've been cutting again", "i want to end myself", "i'm going to do it tonight", "jump off the bridge".
- **must → abuse:** "my dad hits me", "I'm not safe at home", "he hit me", "he'll hurt me again", "my ex hits me", "my parents hit me", "my stepdad slapped me", "she kicked me", "he beat me up", "my dad beat me up", "she burned me with a lighter", "he hit me with a belt", "my parents beat me", "my ex is going to hurt me".
- **must → threat:** "I'm scared someone is following me", "someone keeps following me home and I'm scared".
- **must → soft:** "I want to disappear", "I hate my life", "what's the point anymore", "whats the point anymore", "feeling hopeless", "I can't do this anymore".
- **must NOT match:** "this traffic is killing me", "dying to see that movie", "I could kill for a coffee", "my boss yelled at me", "cut the loop", "I ran 10 kms today", "drove 300 kms", "cutting vegetables", "he pushed me to do better", "she hit me up on whatsapp", "my mom will kill me if i fail", "hit me with your best shot", "my teacher pushed me to try out", "they'll kill me if i'm late", "my brother kicked me out of the group chat lol", "what's the point of this meeting", "my brother beat me at fifa", "I'd die of embarrassment", "kill me now lol", "she hit me back finally", "my sister beat me to it", "he beat me in the race", "she kicked me off the team".
- Accepted false positive (the card is gentle): "I can't go on like this at work lol".
- `eosRealThreat` (route rule only, broad): true for "someone hit my car", "my boss threatened to fire me", "he follows me everywhere"; false for "my mom will kill me if i fail". The **threat card** additionally needs a fear word or a physical verb aimed at "me".

**Soft trigger from the shift meter** (`eosApi("safety").soft(shift)`): fires only when `EOS_EMO[emo].better === "down"` **and** either `after ≥ 9 && delta ≤ 1`, or `after ≥ 7 && after ≥ before` on two consecutive rated loops **of the same feeling**. Never for GOOD (9 is a great result), never at low numbers (2 → 2 → 2 is not "big"). Numb gets its own copy.
**Precedence:** selfharm > abuse > threat > soft (`EosFlagSafety` never downgrades).

### 10.2 Behaviour
- `EosSafetyLayer({raw, stage, reduced})` (mounted by I2, every stage): scans `raw` debounced 400 ms in an effect **and** on every stage change → `EosFlagSafety(type)` (never during render). Launches are already flagged synchronously by core (`EosMarkLaunch`). Card shows when `safety && !safetyDismissed[safety]`; `safetyDismissed` is **per type** (`{selfharm: true}`), so a new trigger type re-shows it.
- **Never blocks:** `div.eosSafetyCard` slides down at the top of `.releaseStage` (**z 230** — above the reveal overlay, so the soft card triggered from the reveal is clickable; max-width 520, centred; full-width minus 16 px on phone); the game, composer, menu and mic keep working underneath.
- **While any flag is set:** the router uses `EOS_GENTLE_IDS` only (no destruction, no 116 word repetition, no 117 beat, no 33 scissors, no 118); the shift meter skips the stamp, confetti and share button and offers **"💛 Talk to someone"**. **While a strong flag (selfharm / abuse / threat) is set:** `EosEntries` (all 110 games, via `cleanEntries`) and `eosWords` (111+) put `EOS_NEUTRAL_WORDS` on every object instead of the user's words — including words typed during play, since the arcade re-materialises entries from `raw` — and the card says so: *"We've kept your words off the game for now."* 114 and 115 switch to their safety copy (§8.4, §8.5).
- **Help without a trigger (S2):** a persistent **"Need to talk to someone?"** link on the check-in footer, the reveal and the Orb Shelf opens `EosSafetyCard variant="info"` (lines + emergency text, no trigger copy) via `eosApi("safety").open("info")`. After a triggered card is dismissed, a 44 px **"💛 support"** pill (`div.eosSupportPill`, z 230, top-left of the stage, never over the composer) stays for the rest of the app session.

### 10.3 Copy, controls and accessibility (non-clinical, warm)
- **Self-harm:** **"That sounds really heavy. You deserve real support right now."** / "You don't have to carry this alone — talking to a person can help more than any game."
- **Abuse:** **"If someone is hurting you, you deserve to be safe."** / "It's not your fault. A support line or someone you trust can help."
- **Threat:** **"If someone might hurt you, you deserve to be safe."** / "A support line or someone you trust can help you make a plan."
- **Soft:** **"Big feelings keep coming back?"** / "Talking to someone can really help — you don't have to wait for it to get worse." **Numb soft:** **"Feeling far away for a while?"** / "Talking to someone you trust can help bring the colour back."
- **Info** (the persistent link): **"Want to talk to someone?"** / "These people are there for exactly this."
- Under strong flags add: *"We've kept your words off the game for now."*
- **Lines, local first (S7):** `eosSafetyOrderLines(EOS_STORE.crisisLines)` puts first the line whose label matches the region from `Intl.DateTimeFormat().resolvedOptions().timeZone` (no network): `America/Toronto|Vancouver|Edmonton|Winnipeg|Halifax|St_Johns|Regina|Montreal…` → Canada; other `America/` → US; `Europe/London|Dublin` → UK & IE; `Australia/` → Australia; `Asia/Kolkata|Calcutta` → India; else the list order. That line renders as the **primary one-tap button** "Call 988" (US / CA: "Call or text 988", with a secondary `sms:988`); the others sit under "more lines ▾". Parsing (each `label · value`, split on `|`): `text WORD to NNNNN` → `sms:NNNNN?&body=WORD`; a phone-like run (`[+\d][\d\s-]{2,}\d`) in the **value** part → `tel:` (never digits inside the label, e.g. "24/7"); a domain → link to `crisisUrl`. Footer: `emergencyText`.
- **Buttons** (≥ 48 px): the primary call, **Text someone I trust** (`navigator.share({text:"Hey, can you talk? I'm having a hard time."})`, fallback `sms:?&body=…`), **I'm safe — keep playing** (dismiss this type, equal size).
- **Visual:** STILL holding a heart (E15) in a warm glow, cream card, Baloo 2, 16 px body, 20 px title, gentle 300 ms slide (fade only when reduced / calm). `EOS_PRIVATE_ATTRS` on the card.
- **Focus (S3):** `role="alertdialog" aria-modal="false" aria-labelledby="eosSafetyTitle" aria-describedby="eosSafetyBody"`. **Never move focus while the user is typing or playing** (`document.activeElement` matches `input, textarea, [contenteditable], .arena *`): announce through a visually hidden `aria-live="assertive"` node ("Support options are open at the top of the screen.") and move focus to the card only on the next stage change or when the user presses Tab / F6. **Escape dismisses only when focus is inside the card.** Otherwise focus moves to the primary button and returns to where it was on dismiss.
- **Property controls** (I1, `99_pixar.jsx`): `eosCheckin` (Boolean "Emotion Check-in", default true), `eosCrisisLines` (String textarea "Support Lines", default `EOS_PROP_DEFAULTS.crisisLines` = US · 988 | **Canada · 988** | UK & IE · Samaritans 116 123 | Australia · Lifeline 13 11 14 | India · Tele-MANAS 14416 | Anywhere · findahelpline.com), `eosCrisisUrl` (String "Support Link", `https://findahelpline.com`), `eosEmergencyText` (String "Emergency Line"), `eosShareUrl` (String "Share Link", empty). The defaults are real services but **the owner must verify them for their region before publishing**; if the audience includes under-18s, add youth lines (Childline UK 0800 1111, Kids Help Phone CA text 686868, CHILDLINE India 1098) — both stated in the release notes.
- Exports: `EosSafetyLayer`, `EosSafetyCard`, `EosSupportPill`, `eosSafetyOrderLines`, `EOS_SAFETY_CSS`, and `eosExpose("safety", {scan: EosSafetyScan, soft, open, orderLines: eosSafetyOrderLines})` (`scan` is core's function re-exposed for old callers).

### 10.4 Acceptance (safety)
- Typing each must-match phrase shows `.eosSafetyCard[role=alertdialog]` within 1 s while a running game keeps running and `button.releaseChoiceButton` stays clickable; must-not-match phrases show nothing.
- **Race:** "i want to die" + Enter (or LET THINKSTILL CHOOSE) within 100 ms → the routed id ∈ `EOS_GENTLE_IDS`; during play, typing "my dad hits me" → within 500 ms no arena element's text matches `EOS_SAFETY_LEX` (neutral words on the objects).
- **Focus:** typing "i want to die and then some" in the composer leaves every character in the input (no keystroke lands on a card button).
- The soft card shown in stage-reveal is the `elementFromPoint` hit at its own centre (above the overlay); GOOD 5 → 9 never shows a soft card; numb shows the numb copy.
- Dismissing the self-harm card then typing an abuse phrase shows the abuse card (per-type dismissal); after dismissal the "💛 support" pill is visible; the persistent link opens the info card from check-in, reveal and shelf.
- The first line matches the time zone (e.g. `timezoneId:"America/Toronto"` → Canada first) and is a one-tap `tel:`; a "text HOME to 741741" line becomes `sms:741741?&body=HOME`; lines come from the property control string; nothing is written to storage; `window.__eos` is undefined on an `https://` page without `?eosdev=1`.

---------------------------------------------------------------------------------------------------
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
    40: "Fold both wings, then swipe the plane right", 41: "Tap a string to snap its bubble free", 42: "Drag the glowing knot",
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
## 12. Build plan

### 12.0 Order (L14)
1. **foundation** (alone, first): `dev/eos_drive.mjs` + `dev/eos_preview.*` — every other task's acceptance depends on it.
2. **module and game tasks in parallel**, each in its own scratch integrated build (`python3 dev/eos_integrate.py --dev-dir /tmp/eos_<task> --modules <your files>`). After each merge into the repo: `python3 build.py` (full).
3. **I1** (needs readability, dots, mood, arrows, fixes) → **I2** (needs checkin, router, shift, rewards, safety, fixes) → **I3**. Game modules are optional for I1/I2 (`EosEngineFor` returns `null` without them); `eos_integrate.py --in-place` refuses to write if a referenced symbol is missing.

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

### 12.2 Integration groups (the ONLY steps that edit `src/00_arcade.jsx` / `src/99_pixar.jsx`; run in order)
Every anchor below was verified with exact-string counts on the baseline md5 (`python3 dev/eos_integrate.py --check`: **38 edits OK** in this commit). The same edits, byte for byte, are the `EDITS` list of `dev/eos_integrate.py` (§12.3), which integrators must use (`--in-place --groups I1`, then I2, then I3) and then review with `git diff`.

**I1 — Visible layer: global style, Thought Dust, colour script, arrows + guards + text floor, guide-panel glyphs + verbs, monotonic progress, meter word, readable words prop, new-game routing, store + sound mirror, Pixar dust/squash/props** (§3, §4, §5, §8.0, §10.3, §11.2, §11.7). Needs modules: readability, dots, mood, arrows, fixes (game modules optional — `EosEngineFor` returns null without them).
- E1 (`00_arcade`, ×1) `            </style>\n\n            <div className="ambient a1" />` → insert `            <EosGlobalStyle />` after `</style>`.
- E2 (×1) `                <section className="releaseStage">` → append `\n                    <EosThoughtFlow stage={stage} reduced={!!reduced} />`.
- E3 (×1) before `                    {stage === "reveal" && selected ? (` insert:
  ```jsx
                      {stage === "play" && selected ? (
                          <React.Fragment key={`eos-play-${selected.id}-${variationSeed}-${materialRevision}`}>
                              <EosMoodGrade game={selected} hostRef={gameHostRef} reduced={!!reduced} />
                              <EosGuideArrows game={selected} entries={renderedEntries} hostRef={gameHostRef} reduced={!!reduced} />
                              <EosLegacyGuards game={selected} hostRef={gameHostRef} />
                          </React.Fragment>
                      ) : null}
                      <EosTextFloor stage={stage} />
  ```
  (Code blocks inside these list items carry 2 extra spaces of markdown indentation — strip them. The `<EosLegacyGuards … />` line must end up with exactly **28** leading spaces because I2-E13 anchors on it.)
- E4 (×1) legacy guide card — this exact 4-line block (only the legacy wrapper has it; the new wrapper has the gate block between `>` and `<small>`):
  ```jsx
                          key={`guide-${p.game.id}-${guideText}`}
                          className="guideStepCard"
                      >
                          <small>{guideParts.label}</small>
  ```
  (24 / 24 / 20 / 24 leading spaces) → insert `                        <i className="guideActionArrow" aria-hidden="true">{eosGlyph(p.game)}</i>` as a new line before the `<small>` line.
- E5 (×1) `                        {Number(p.game?.id || 0) < 100 ? (` → `                        {true ? (`; E6 (×1) `{guideGesture.arrow || "↑"}` → `{eosGlyph(p.game) || guideGesture.arrow || "↑"}`.
- E7 (×2, replace all) `    const reportProgress = (value, nextLabel) => {\n        const v = pct(value),` → `    const reportProgress = (value, nextLabel, eosFromSfx) => {\n        const v = eosGateProgress(progressRef, value, eosFromSfx),`.
- E8 (×2, replace all) `            reportProgress(next, progressLabel(p.game, next))` → `            reportProgress(next, progressLabel(p.game, next), true)`.
- E9 (×2, replace all) `    const engineBubbleTextPx = Math.max(\n        1,` → `    const engineBubbleTextPx = Math.max(\n        15,`.
- E10 `        bubbleTextPx = 4,` → `        bubbleTextPx = 16,`; `            18,\n            Number.isFinite(parsedBubbleTextPx) ? parsedBubbleTextPx : 4` → `            28,\n            Number.isFinite(parsedBubbleTextPx) ? parsedBubbleTextPx : 16`; `        title: "Bubble Text",\n        min: 1,\n        max: 18,\n        step: 0.5,\n        defaultValue: 4,` → same with `max: 28,` and `defaultValue: 16,`.
- E11 (×1) before `    if (!UNIQUE_HERO_IDS.has(p.game.id)) return <UniqueReleaseEngine {...p} />` insert `    {\n        const EosE = EosEngineFor(p.game)\n        if (EosE) return <EosE {...p} />\n    }\n` (`RoutedGameContent` has no hooks — verified).
- **E12** (×1, M2) `` function releaseGestureForGame(game) {\n    const a = `${game?.action || ""} ${game?.hook || ""}`.toLowerCase() `` → append `\n    if (Number(game?.id) >= 111) return { arrow: "", verb: ({ hold: "HOLD", holdRelease: "HOLD", drag: "DRAG", dragTo: "DRAG", slow: "DRAG", swipe: "SWIPE", sling: "PULL" })[EOS_GAME_META[Number(game.id)]?.gesture] || "TAP" }` (new games' LIVE GUIDE text gets no contradictory regex arrow; `EOS_GAME_META` is core).
- **E13** (×1, asks E10) `                        GAME PROGRESS · {progress}%` → `                        {eosMeterWord(p.game)} · {progress}%` (the 99 legacy games narrate the feeling — "SLOW-DOWN · 33%" — like the new wrapper; core).
- **E14** (×1, was I2-E1 — L5: the sound/haptics mirror must land with the new-game routing) `    const [releaseCheck, setReleaseCheck] = React.useState(null)` → append:
  ```jsx
      const eos = useEosStore()
      React.useEffect(() => {
          EOS_STORE.set({ sound: !!sound, haptics: !!hapticsOn, music: !!(musicOn && sound) })
      }, [sound, hapticsOn, musicOn])
  ```
  (`musicOn` is declared at L21062, before the anchor at L21078 — no TDZ; the hook lands before the `if (!cssText)` early return.)
- P1 (`99_pixar`, ×1) ``                            top: `${40 + pxNoise(i, 23) * 60}%`,`` → ``                            top: `${pxNoise(i, 23) * 100}%`,``.
- P2 (×1) `    ".sortCard",\n].join(",")` → `    ".sortCard",\n    ".eosObj",\n].join(",")`.
- P3 (×1) `        pixarDust = 14,\n        ...arcadeProps` → `        pixarDust = 14,\n        eosCheckin = EOS_PROP_DEFAULTS.checkin,\n        eosCrisisLines = EOS_PROP_DEFAULTS.crisisLines,\n        eosCrisisUrl = EOS_PROP_DEFAULTS.crisisUrl,\n        eosEmergencyText = EOS_PROP_DEFAULTS.emergencyText,\n        eosShareUrl = EOS_PROP_DEFAULTS.shareUrl,\n        ...arcadeProps`.
- P4 (×1) before `            <ThinkStillReleaseArcade {...arcadeProps} />` insert `            <EosConfigSync checkin={eosCheckin} crisisLines={eosCrisisLines} crisisUrl={eosCrisisUrl} emergencyText={eosEmergencyText} shareUrl={eosShareUrl} />`.
- P5 (×1) `        defaultValue: 14,\n    },\n})` → append before `})` the controls `eosCheckin: { type: ControlType.Boolean, title: "Emotion Check-in", defaultValue: true }`, `eosCrisisLines: { type: ControlType.String, title: "Support Lines", displayTextArea: true, defaultValue: EOS_PROP_DEFAULTS.crisisLines }`, `eosCrisisUrl: { type: ControlType.String, title: "Support Link", defaultValue: EOS_PROP_DEFAULTS.crisisUrl }`, `eosEmergencyText: { type: ControlType.String, title: "Emergency Line", defaultValue: EOS_PROP_DEFAULTS.emergencyText }`, `eosShareUrl: { type: ControlType.String, title: "Share Link", defaultValue: "" }`.
- E15 (×2) `        p.sfx(kind)\n        const explicit = usesExplicitProgress(p.game)` → insert `        if (eosSfxMiss(p.game, kind)) return` after `p.sfx(kind)` (fixes: a miss the §11.7 guard flagged keeps its sound, but adds no step reward and no progress creep — "almost!" is the only feedback).
- **Acceptance:** full build OK; POP (legacy), CRUSH (legacy, non-explicit), HOT POTATO (new), every id 111-120 start from the menu with zero page errors; the legacy HUD reads "{meter word} · n%"; `.eosMoodGrade` present in play and its background moves loud → calm; new games' guide text has no regex arrow; toggling sound off silences `eosTone` (store `sound:false`); `.eosArrowLayer` hand on the target in POP / CRUSH / HOT POTATO / CRACK (tool stage first); `.guideActionArrow` visible in POP and HOT POTATO; CRUSH `aria-valuenow` log over 24 taps is non-decreasing and < 100 until `onDone`; `.tsPxDust` animation includes `eosDotsX`, `.eosLane` present in input and play; ECHO words ≥ 15 px; `.engineProgressHud` inside the viewport at 390 for HOT POTATO; `EosTextFloor` scan empty for POP/HOT POTATO; `ThinkStillReleaseArcadePixar.propertyControls` has every original key (title, accent, accent2, background, soundOn, hapticsOn, musicOnDefault, musicVolume, tapOutBpm, bubbleTextPx, maxWidth, pixarIntensity, pixarWarmth, pixarParallax, pixarSquash, pixarBokeh, pixarDust) + the 5 `eos*` keys; mic, ＋ upload, sound toggle still present.

**I2 — Emotion-first loop: check-in / chip / world chips / safety, routing, launch & finish marks, shift meter, menu group, profile override, short-input + safety entries, companion** (§2, §6, §7, §9.3, §10.2, §11.5). Needs modules: checkin, router, shift, rewards, safety, fixes.
- E1 — **moved to I1-E14** (the id is kept free so the other I2 ids stay stable).
- E2 (×1) before `                    {stage === "input" && !selected ? (` insert:
  ```jsx
                      {stage === "input" && !selected && eos.phase === "checkin" && eos.checkinEnabled ? (
                          <EosCheckIn raw={raw} setRaw={setRaw} onLaunch={startThinkStillChoice} onPlay={startChosenGame} toggleMic={toggleMic} listening={listening} openMenu={() => setGameMenuOpen(true)} sfx={sfx} reduced={!!reduced} />
                      ) : null}
                      {stage === "input" && !selected && eos.phase !== "checkin" && eos.checkinEnabled ? <EosCheckInChip reduced={!!reduced} /> : null}
                      <EosWorldChips stage={stage} reduced={!!reduced} />
                      <EosSafetyLayer raw={raw} stage={stage} reduced={!!reduced} />
  ```
- E3 (×1) `    const clearForNext = React.useCallback(() => {` → append `\n        EosResetFeeling()`.
- E4 (×1) `        const best = chooseRelevantGame(sourceThought)` → `        const best = EosRouteGame(sourceThought, played) || chooseRelevantGame(sourceThought)`.
- E5 (×1) `        return chooseRelevantGame(sourceThought, selected.id, selected)` → `        return EosRouteGame(sourceThought, played, selected.id) || chooseRelevantGame(sourceThought, selected.id, selected)`.
- E6 (×1) `            setVariationSeed((v) => v + 1)\n            setStage("play")` → `            setVariationSeed((v) => v + 1)\n            EosMarkLaunch(g, e)\n            setStage("play")`.
- E7 (×1) `        setVariationSeed((v) => v + 101)\n        setStage("play")` → `        setVariationSeed((v) => v + 101)\n        EosMarkLaunch(selected, entries)\n        setStage("play")`.
- E8 (×1) `            setReleaseCheck(null)\n            setStage("reveal")` → `            EosMarkFinish(selected, bonus)\n            setReleaseCheck(null)\n            setStage("reveal")`.
- E9 (×1) before `                                    <div className="releaseShiftCheck">` insert:
  ```jsx
                                      <EosShiftMeter
                                          game={selected}
                                          sfx={sfx}
                                          rainSfx={rainSfx}
                                          reduced={!!reduced}
                                          onAgain={replay}
                                          onPlay={startChosenGame}
                                          onNext={tryRecommendedRelease}
                                          onDoneForNow={clearForNext}
                                          addScore={(n) => {
                                              const add = Math.max(0, Math.round(Number(n) || 0))
                                              if (!add) return
                                              setScore((s) => {
                                                  const v = s + add
                                                  try {
                                                      localStorage.setItem(SCORE_KEY, String(v))
                                                  } catch {}
                                                  return v
                                              })
                                          }}
                                      />
  ```
- E10 (×1) before `                                <div className="releaseChoiceGroupLabel">\n                                    15 SIGNATURE RELEASES` insert `                                <EosMenuGroup played={played} gameChoice={gameChoice} onPick={startChosenGame} />`.
- E11 (×1) `function releaseEmotionProfile(input) {` → append `\n    {\n        const eosProfile = EosProfileOverride(input)\n        if (eosProfile) return eosProfile\n    }`.
- E12 (×1) `function cleanEntries(raw) {` → append `\n    {\n        const eosEntries = EosEntries(raw)\n        if (eosEntries) return eosEntries\n    }`.
- E13 (×1, anchor created by I1) `                            <EosLegacyGuards game={selected} hostRef={gameHostRef} />` → append `\n                            <EosCompanion game={selected} hostRef={gameHostRef} reduced={!!reduced} />`.
- **Acceptance:** §6.7 + §7.5 + §9.5 + §10.4 in the full build at 1280×860 and 390×844 (+ one reduced-motion pass); "i want to die" + Enter within 100 ms routes a gentle game and the arena shows neutral words; `startGame(page,"POP",text)` after "just let me play" behaves exactly as before; LET THINKSTILL CHOOSE without a check-in still works (router falls back to `chooseRelevantGame` when nothing is detected); `localStorage` contains no typed text.

**I3 — Existing-game source fixes** (§11.8)
- E1 (×1) `                            onClick={() => {\n                                if (step % 2 === 0) tapStep(8)` → prepend the line `                            className={step % 2 === 0 ? "eosNext" : ""}`.
- E2 (×1) `                            onClick={() => {\n                                if (step % 2 === 1) tapStep(8)` → prepend `                            className={step % 2 === 1 ? "eosNext" : ""}`.
- E3 (×1) `                            if (meter >= 62 && meter <= 88) advance()\n                            else {\n                                setMeter(0)` → `                            if (meter >= 55 && meter <= 92) advance()\n                            else {\n                                setMeter((m) => Math.min(m, 40))`.
- E4 (×1) `                cx >= m.left - 32 &&\n                cx <= m.right + 32 &&\n                cy >= m.top - 34 &&\n                cy <= m.bottom + 46` → margins 70 / 70 / 80 / 90.
- E5 (×1) the ECHO block `onPointerUp={() => stopEchoHold(true)}` … `onPointerLeave={() =>\n                                            stopEchoHold(true)\n                                        }` → the three `stopEchoHold(true)` become `stopEchoHold(false)`.
- E6 (×1) 109 CLEANSE `CleanseEngine.finishHold`: the delayed `setReleasedIndices(nextReleased)` → `setReleasedIndices((prev) => prev.length >= releasedRef.current.length ? prev : releasedRef.current.slice())` (a stale 3.2 s write can no longer shrink the list after the last release → no more "stuck at 100 %").
- E7 (×1) 21 BIN `measureTarget(i)`: subtract the bubble's visible translation (`DOMMatrixReadOnly(getComputedStyle(el).transform)` m41/m42, screen px ÷ stage scale) so the "gone" flight is aimed from the home slot — needed once the fixes CSS makes the drag transform visible (else the binned word flies back out to its slot).
- **Acceptance:** TAP OUT: exactly one `.tapOutPads .eosNext` alternating on each correct tap and the arrow follows it; PRESSURE POP finishes with ~0.9 s holds and a miss keeps the needle partly charged; BIN accepts a drop 60 px beside the mouth; ECHO keeps a bubble's fill after a release; then a **full smoke**: input stage, POP, CRUSH, HOT POTATO, every 111-120 game, the check-in flow (incl. PANIC express), the reveal (meter, orb flight, share card), the safety card — zero page errors.

**F3 — ThinkStill picks, no game menu for users** (founder feedback F3, 2026-10-09; module `src/eos/46_eos_pick.jsx`; exact strings in `dev/eos_integrate.py`)
- E1 `const eosMenuOn = useEosPickMenu()` after `const eos = useEosStore()` (owner property "Show game menu", default off; `?menu=1` / `window.__eos.pick.setMenu(true)` in dev).
- E2 `recommendedReleaseGame` = `EosPickPeek(text, played, selected.id)` while the menu is off (same game Next will serve). E3 `EosPickNote(g)` after `setEntries(e)` in `startChosenGame` (every launch feeds the rotation).
- E4 `tryRecommendedRelease` = `EosPickNext(text, played, selected.id)` while the menu is off. E5 `startThinkStillChoice` starts `EosPickNext(…) || best` (I2-E4's router line stays the fallback; the "THINKSTILL CHOSE <name>" status only with the menu).
- E6/E7 `launchRelease` (RELEASE IT / Enter / check-in GO) → `startThinkStillChoice()` while the menu is off (Enter while a game runs restarts that game with the new words, as before). E8 deps of `startThinkStillChoice`.
- E9 `<EosPickBridge onPlay={startChosenGame} onLaunch={launchRelease} />` before `<EosTextFloor stage={stage} />` (dev hook `window.__eos.pick.start(id)` for automated tests).
- E10 reveal `‹ PREVIOUS` only with the menu; E11 `NEXT ›` only with the menu or without the check-in / shift meter, and then it serves the rotation; E12-E15 no game name on the TRY / recommendation buttons ("NEXT ▶", "NEXT RELEASE"); E16 the "<GAME> READY" composer status only with the menu.
- E17/E18 the composer's `.releaseChoiceWrap` menu only with the menu, else `<EosPickGoButton ready onGo={launchRelease} />` (same classes; RELEASE IT on the input stage, NEXT ▶ = the rotation's next pick while a game runs or at its end — the old button opened the menu there).
- E19 (×2) the idle orbit's step 2 "CHOOSE A RELEASE · Pick one or let ThinkStill choose." reads "THINKSTILL PICKS · The best release for how you feel." without the menu (`eosPickIdleGuide`).
- P1, P3 `99_pixar.jsx`: `<EosPickConfigSync showMenu={!!props.eosShowGameMenu} />` + property control "Show game menu" (default false, first in the list).
- Module-side (no integration edit): the check-in hides "pick a game myself", its CTA sub-line names no game and the good-day orb routes through the rotation; the shift meter's ONE MORE ▶ calls `onNext` (rotation), shows no game name, and "↻ cool it down" appears only with the menu.


### 12.3 Test tooling
**Already in the repo (lead): `dev/eos_integrate.py` — the executable copy of §12.2.**
- `python3 dev/eos_integrate.py --check` → every I1-I3 edit reported OK / SKIP (already applied) / BAD, applying groups in order in memory (I2-E13 depends on I1-E3). **This is the only anchor check** (the old stand-alone script covered 31 of 36 edits and is gone).
- **Builders (every runtime check):** `python3 dev/eos_integrate.py --dev-dir /tmp/eos_<task> --modules <your files>` builds a scratch copy of the arcade with **all integration edits applied** and auto-stubs for every referenced symbol your files do not define (`eosGateProgress` stub = the real §11.2 algorithm). Then `launch({dir:"/tmp/eos_<task>"})`: your overlay / check-in / meter / guards / flow / mood / new game are mounted exactly where they will live, with the arcade CSS, the guide panel and the wrapper's step rewards. The repo is never touched. (Lead verified in this commit, core v1.2 only: the scratch build compiles; POP / CRUSH / HOT POTATO start with zero errors at 1280×860 and 390×844; the legacy HUD reads "COOL-DOWN · 0%" / "SLOW-DOWN · 0%" from detection; "i want to die" raises `safety:"selfharm"` synchronously at launch; the composer carries `data-private`.)
- **Integrators:** `python3 dev/eos_integrate.py --in-place --groups I1` (then I2, then I3) applies a group with exact-count replacement, is idempotent (signature-based), and refuses to write anything if an anchor is BAD or a referenced symbol is not defined in `src/eos/*.jsx`. Review `git diff`, then `python3 build.py`. Anyone who changes §12.2 updates the `EDITS` list in the same commit.
- `build.py` rejects `import` / `export` lines and regex lookbehind in `src/eos/*`, and requires exactly one `^export default ` line in the output (comments mentioning it no longer break the build).
- `window.__eos.core.cssText()` returns all registered EOS CSS (inject with `page.addStyleTag` for isolated CSS checks). `window.__eos` exists only on `file://` / localhost / `?eosdev=1`.
- **Node unit check for core** (lead's method, reusable): compile `src/eos/00_eos_core.jsx` with `dev/node_modules/.bin/esbuild --loader:.jsx=jsx --jsx=transform --format=esm`, prepend stubs for the arcade globals it touches (`React`, `RELEASE_PHASE_EMOTIONS`, `emotionSrc`, `noveltyNoise`, `vibrate`, `displayText`, `GAMES`, `SHORT_ACTION`, `SHORT_HINT`, `RELEASE_MIND_BEND`, `cleanEntries`) and evaluate; the §7.4 and §10.1 phrase lists are the fixtures.

**Foundation task adds** (`foundation`, before every other task) — **delivered; the as-built API (a superset of this list) is in §0.5 and at the top of each file:**
- `dev/eos_drive.mjs` on top of `drive.mjs`: `launchEos({width,height,dir,reducedMotion,timezoneId})`, `startGameById`, de-duplicated `listGames`, `openCheckin`, `runCheckin({emotion, dial, express})`, `finishGame(page, id, {perStage:true, alt:"pointer"|"keyboard"})` — implements all 17 §3.3 gestures (by `EOS_GESTURES` for ≤ 110, by `data-eos-*` markers for 111+), asserts `arrows.state()` before **each** stage and returns `{ms, progressLog, stages}`; `readProgress`, `smallText(minPx)` (DOM sweep + `readability.scan()`, SVG text by bbox), `noShrink(baselineDir)` (same text and viewport against a baseline build), `arrowState`, `lintCopy(page)` (visible EOS text vs `EOS_COPY_RULES`, with `EOS_DISCLAIMER` and the safety card exempt), `flashCheck(page, ms)` (frame luminance deltas over 10 % of the arena), `dotsNearCentre(page)`, `pixelVisible(page, x, y)`; initialises `window.__eosArrowMiss = []` before load.
- `dev/eos_preview.html` / `.jsx` / `.py`: `python3 dev/eos_preview.py --id 111` builds core + the named game into `/tmp/eos_preview_<id>` and mounts `window.__eos.core.EosEnginePreview` with `?id=&text=&reduced=1` — quick iteration only.
- Throwaway scripts stay in `/tmp`.

### 12.4 Anchor check
`python3 dev/eos_integrate.py --check` before each integration group (counts are for the state *before* that group). In this commit: **38/38 OK** on the baseline (I1 E1-E14 + P1-P5, I2 E2-E13, I3 E1-E5).

**Lead dry runs:** (v1.1) all I1 + I2 + I3 edits applied with exact-count replacement to a scratch copy plus a stub module: full build compiles; the check-in overlay mounts in `stage-input` without blocking the composer; CRUSH progress over 24 taps = `12,12,12,17,29,29,29,33,45,…,95,95,95,100` (monotonic, 100 only at the real finish); store phases `checkin → play → meter → checkin`; the reveal mounts `.eosShiftMeter`; the LIVE GUIDE glyph shows in POP (legacy) and HOT POTATO (new); ECHO words render at 16 px; the 5 new property controls are present; zero page errors. (v1.2) the same with the new I1-E12/E13/E14 and core v1.2: zero page errors at both sizes (see §12.3).

### 12.5 Definition of done
All §3.12, §4.7, §5.4, §5.6, §6.7, §7.5, §8.12, §9.5, §9.6, §10.4, §11.10 acceptance checks pass in the full build at 1280×860 and 390×844 plus one reduced-motion pass and one calm-visuals pass; all 110 original games still start and progress (and finish with `eos_drive.finishGame`); no original property control, mic, upload, sound or Pixar behaviour is lost; `lintCopy` is clean on every EOS surface; `ThinkStillReleaseArcade_EOS_FULL.txt` is one file with one `export default`; release notes state: verify the support lines for your region, add youth lines for under-18 audiences, history is local and resettable.

---------------------------------------------------------------------------------------------------
## 13. Critique resolution log (v1.1 → v1.2)

Every item of `EOS_SPEC_CRITIQUE_asks.md` (A-H), `EOS_SPEC_CRITIQUE_build.md` (H/M/L) and `EOS_SPEC_CRITIQUE_science.md` (S/B/R/Q/E/C/P/A) was applied unless listed in §13.4. Core changes were made in `src/eos/00_eos_core.jsx` v1.2.0 and tested in node (51 detection phrases, 43 must-match and 23 must-not-match safety phrases, all passing); integration changes were made in `dev/eos_integrate.py` (`--check`: 38/38 OK) and smoke-tested in a scratch integrated build at both sizes (zero page errors).

### 13.1 User-ask coverage (`EOS_SPEC_CRITIQUE_asks.md`)
| id | applied in |
|---|---|
| A1 check-in arrow (renderer + no bias) | `EosHandCue` / `EosHandHint` §3.2; halo over all orbs, hand on NOT SURE §6.2; dial + CTA hints §6.2 |
| A2 reveal hints | §6.6 (Still Moment heart / spark / sigh, the after-dial) |
| A3 stage advance | §3.5 new row (350 ms after pointerup) |
| A4 count badge | §3.1 (pinned for the stage), §3.2 target identity |
| A5 drag feedback | `.eosDragGoal` + `maxSpeed` §3.1, §3.6; 36 `maxSpeed` 260 (from the source rule) §3.10-3.11 |
| A6 `own:true` first play | §3.5 mount row |
| A7 per-stage acceptance | §3.12 |
| A8 label overlap list | §3.4 step 8 |
| B1 missed offenders | §4.2 / §4.3 (menu label, AGAIN, PREVIOUS/NEXT, YES, final message, payoff / hint lines, SVG text) |
| B2 six stages | §4.4 (input with menu open), §4.7 (8 states × 2 sizes) |
| B3 floor 12 everywhere, pills 14/13 | §4.1-4.3 (no `animation` in the pill rule) |
| B4 brand on phone | §4.3 ≤560 block (P2 part: see §13.4) |
| B5 SVG text | §4.4 |
| C1 one centre | §5.2 measured `--eos-cx/cy`, §5.3 keyframes, §5.4 |
| C2 dust mirrors intensity | §5.2 playback rate + jitter |
| C3 absorb twinkle, bokeh inward | §5.2, §5.3 (bokeh via base `left/top`, see §13.4) |
| C4 visibility test | §5.4 |
| D1 dial default per emotion, panic.mid | core `dial` + detection floor; §6.2; §7.2 `panic.mid` starts with 111 |
| D2 1-tap panic | express orbs §2.2, §6.2; 111 intro ≤ 1 s §8.1; acceptance §6.7 |
| D3 detection gaps | core `EOS_LEXICON` §7.4 (+ "hate myself" / "hate my life" fixes) |
| D4 safety gaps + soft | core `EOS_SAFETY_LEX` §10.1 |
| D5 panic starter | core starters (science C1 table, §13.4) |
| D6 names before use | orb name tag, "Meet RUSH, your anger." §6.2, meter question §6.6 |
| D7 everyday sub-lines | core `sub` |
| D8 good-day chip | §2.1, §6.2 |
| E1 redesign every game (colour script, flip words, payoff) | new task `mood` §5.6; core `grade` / `flip`; payoff headline §6.6; §11.9 |
| E2 "5 LIGHTER ✦" + resolving chime | §6.6 step 3 |
| E3 payoff ≤ 7 s, conditional / skippable / diegetic Still Moment | §2.4, §6.6 step 1, §6.7 |
| E4 one dial, live character | §6.6 step 2 (H1 resolved) |
| E5 orb flies to the shelf | §6.6 step 4, `[data-eos-chip="orbs"]` §9.3 |
| E6 declutter the reveal, ≤ 3 buttons | §6.6 declutter + step 5 |
| E7 eruption scaling | §8.2 (juice scales; length fixed — §13.4) |
| E8 "almost!" for 36, 65, 69, 13, 70 | `EOS_FIXES_ALMOST` §11.7 |
| E9 drum sounds (P2) | §11.7 |
| E10 legacy meter word | core `eosMeterWord` + I1-E13 |
| E11 unrouted games, thin lists, verdict appendix | `EOS_BENCH` §7.2; 66 / 44 / 8 routed; tails; widened good / numb / lonely; §7.6 (all 120) |
| E12 companion duplicates | `EOS_GAME_META.char` (core) + hide rule; voice lines; measured phone position §6.5 |
| E13 TTS off by default (P2) | §8.6 |
| E14 GROUND CONTROL homework | §8.3 (partly — §13.4) |
| E15 replay variety (P2) | §8.0 |
| E16 Pixar checklist | §8.0, §8.12; core sfx log `{kind, t}` |
| F1 deep link | §6.2 (read), §9.3 (caption) |
| F2 9:16 story card | §9.3 |
| F3 identity on the card | skill badge + face pair + 3 rotating captions §9.3 |
| F4 weekly recap | §9.3 |
| F5 face pool | core `EOS_WIN_FACES` / `eosFacePool(…, "win")` (102 faces) + Expression of the Day §9.2 |
| F6 spend ⚡, show stats | ⚡ milestones → dust styles §9.2 / §5.2; stats §9.2 |
| F7 sound signature | §6.6 step 3 |
| F8 audio bed (P2) | §5.2 (`music` mirror in I1-E14) |
| F9 cold open (P2) | §6.2 |
| F10 ritual library (P2) | task `flipdata` §9.6 (inline, see §13.4) |
| G1 119 + 120 | §8.9, §8.10; routes §7.2; gentle list; tasks §12.1 |
| G2 next batch | §8.11 (documented only) |
| H1 one widget | §6.6 step 2, §2.5 |
| H2 "+25 ⚡ for showing up" | §2.4, §6.6, §9.2 |
| H3 disclaimer exemption | §2 copy rules, core `EOS_COPY_RULES` / `EOS_DISCLAIMER` |
| H4 bokeh | C3 adopted (§5.1) |
| H5 arrows for 111+ need I1-E11; preview | §3.2, §3.10 row 111-120 |
| H6 core v1.2 first | this commit |

### 13.2 Buildability (`EOS_SPEC_CRITIQUE_build.md`)
| id | applied in |
|---|---|
| H1 dots hidden on home | §5.2, §5.3 (idle base layer moved under the flow), §5.4 pixel test |
| H2 z-index under the reveal | core `EOS_Z`; §6.3 (chip 32), §9.3 (chips 170, shelf 220), §10.2 (card 230) |
| H3 CSS shrinks big words | §4.1-4.4 (grow-only JS targets; `1em` only for ≤ 11 px-only selectors), §4.7 no-shrink check |
| H4 touch sfx fires rewards | §8.0 juice grammar (soft + `eosTone`; one non-soft kind per real success), §8.12 |
| H5 test path | §8.0 Testing, §12.1 rules, §12.3; core comment on `EosEnginePreview` |
| H6 foundation task | §12.0, §12.1, §12.3 |
| H7 safe play area | core arena reset + `--eos-safe-top/bottom`; §8.0; §8.12 overlap check; 111 orb centre-low §8.1 |
| M1 glyph overrides | `EOS_GLYPH_OVERRIDE` §3.7 |
| M2 regex arrow in new games' guide text | I1-E12 (`eos_integrate.py`) |
| M3 check-in arrow renderer | `EosHandCue` §3.2 |
| M4 badge resets on remount | target identity §3.2 |
| M5 chips vs menu / step | `:has()` CSS §6.3, `data-step` §6.2 |
| M6 `pulse?.()`, `grantOrb` | §0.1, §5.2, §8.1 |
| M7 profile memo key | §7.3 |
| M8 DOM churn | §8.0, §8.6, §8.7, §8.10 |
| M9 `.tsExactUserText` | §8.0 Words |
| M10 `imageSources` | §8.0 Words |
| M11 `choose` markers | §3.4 step 2; core `eosTarget` comment; §8.0 Arrow |
| M12 commit before menu | §2.2, §6.2 |
| M13 namespaces | core header, §12.1 rules; keyframes renamed (`eosDots*`, `eosArrows*`, `eosFixes*`) |
| M14 `overflow-clip-margin` on WebKit | §11.6 (grid-fit primary; clip-margin progressive) |
| M15 `.cleanseSpace`, grain | §5.1, §5.3 |
| L1 progress gate for silent engines | §11.2 + the `eos_integrate.py` stub |
| L2 no third `onProgress` argument | §8.0 |
| L3 imperative progress labels | §8.0, per game |
| L4 layout effect | core `EosConfigSync` |
| L5 sound mirror into I1 | I1-E14 (I2-E1 moved) |
| L6 `eosTarget` gaps, §8.1 gesture | core `eosTarget` (win, meter, mvar, armed, maxSpeed, own, ox, oy; `tool` in the comment); §8.1 registration |
| L7 motion props on `EosCharacterOrb` | core drops them; §0.4, §6.2 |
| L8 undefined keyframes | §11.4 (`eosFixesArmPulse` defined), §3.7, §5.3 (owners) |
| L9 `build.py` export checks | `build.py` (regex `^export default `, reject `export` + lookbehind in eos modules) |
| L10 `--eos-cy` measured | §5.2 |
| L11 stale stand-alone check | §12.4 (removed) |
| L12 `.eosObj` squash | core comment, §0.4, §8.0 |
| L13 tight layouts | §4.7 screenshot list |
| L14 build order | §12.0 |
| L15 `EosEntries` stopwords, prefs cache | §11.5; core `eosPrefs` cache |

### 13.3 Relief science, safety, ethics, accessibility (`EOS_SPEC_CRITIQUE_science.md`)
| id | applied in |
|---|---|
| S1 safety race + words on objects | core sync scan (`EosMarkLaunch`, `eosTextSafety`, `eosWords`, `EOS_NEUTRAL_WORDS`); §7.3 step 1-2; §11.5 step 0; card line §10.3; acceptance §10.4 |
| S2 help without a trigger | persistent link (check-in, reveal, shelf), support pill, reveal "💛 Talk to someone" §10.2, §6.6 |
| S3 focus stealing | §10.3 Focus |
| S4 soft trigger misfires | §10.1 rule, numb copy, precedence |
| S5 per-type dismissal | core `safetyDismissed: {}`; §10.2 |
| S6 lexicon gaps / false positives / no lookbehind | core `EOS_SAFETY_LEX` (refined — §13.4); `build.py` check |
| S7 lines by time zone, one-tap, Canada, sms, youth | core defaults; §10.3; release notes §12.5 |
| S8 gentle list + 114 / 115 safety copy | §7.2 `EOS_GENTLE_IDS`; §8.4, §8.5 |
| S9 real threats | core `EOS_REAL_THREAT` / `eosRealThreat`; `EOS_ROUTE_RULES` 118 / 105 / 53; threat card (scoped — §13.4); 118 copy |
| B1 111 finger-down double inhale | §8.1 |
| B2 Still Moment timing + linear drains | core `EOS_BREATH`; §6.6 |
| B3 graduated exhale + dizziness guard | §8.1 |
| B4 one pacer | core `EOS_PACER` / `eosBreathOwn` / `eosBreathPhase`; §5.2; §8.0 |
| B5 66 / 80 ring | §3.3 wait row, §3.10-3.11 labels, §11.7 restarts guard |
| B6 heartbeat haptics | core `EOS_HAPTIC.heart` 60 bpm, `exhale`, `eosHeartbeat`; no heartbeat in 111; 115 72 → 56; twins §8.0 |
| B7 116 dose | §8.6 |
| B8 hand on heart | §6.6 heart, §8.5 |
| B9 scoped claims | §8.0 Copy; per-game "Science (internal)" |
| R1 anger drift to smash | §7.3 (no recency in high band), §7.2 `anger.high`, COOL IT DOWN §6.6, cool variant §6.6, eruption §8.2 |
| R2 shame concealment | §7.2 `shame.mid` |
| R3 GOOD routed to sadness copy | §7.2 `good` (option A) |
| R4 fear peak | §7.2 `fear.high` / `mid`; §8.8 (2×, no regrow) |
| R5 overthinking body first (P2) | §7.2 |
| R6 numb target state | core `numb.calm = 61`; spark mode §5.2; companion §6.5 |
| R7 jealous own-wins (P2) | §8.5 bank; §8.9 (119) |
| R8 late night (P2) | `EOS_LOUD_IDS` §7.2-7.3; mood warm palette §5.6 |
| R9 bomb in panic.mid | §7.2 (71 → anger low) |
| R10 companion catharsis | §6.5 |
| Q1 digit buffer | core `EosIntensityDial` |
| Q2 `lastRef` sync | core `EosIntensityDial` |
| Q3 empty after-dial, skip, copy, ⚡ on reveal | core dial (`value=null`), §6.6, §9.2, §6.2 copy |
| Q4 retro rows | core `retro` in `eosPushSession` / `EosRecordShift`; §7.3 personalDelta; §9.2 stats |
| Q5 rewards ≠ Δ | §9.2 rarity, §6.6 tier words, §7.3 cap ±0.15, no "fastest" |
| Q6 dial questions / words | core `dialQ` / `dialWords` / `eosDialQuestion` / `eosDialWord` |
| E1 weekly denominator | §9.2 ("☀ 4 days this week", lifetime milestones) |
| E2 skills, not suffering | §9.2 `EOS_REWARDS_SKILLS`, bonds on any appearance |
| E3 share at vulnerable moments | §6.6 step 5, §9.3 card default |
| E4 heart / spark auto-complete, skip from 0 s (P2) | §6.6 step 1 |
| C1 starters / seeds | core `EOS_EMOTIONS` + rule §2 |
| C2 invalidating phrases | core `EOS_COPY_RULES.bannedPhrases`; §2; 118 / 111 / 66 / 80 copy |
| C3 disclaimer + claims | core `EOS_DISCLAIMER` / `bannedClaims`; check-in "about ThinkStill" §6.2 |
| P1 `window.__eos` | core `eosIsDev()` gate (also `__eosPreview`, `__eosArrowMiss`) |
| P2 cloud TTS | §8.6 local voices only |
| P3 mic disclosure | §6.2 |
| P4 session-replay masking | core `EOS_PRIVATE_ATTRS` + composer masking in `EosConfigSync`; roots §6, §8.0, §9.3, §10.3 |
| P5 keep-history toggle, day-only stamps (P2) | core `keepHistory`; §9.2, §9.3 |
| A1 contrast | core dial ink + dimmed orbs |
| A2 44 px targets | core CSS rule; §8.0 (≥ 64 px primaries) |
| A3 screen readers | core `.eosSrOnly`; §3.1; §8.0 |
| A4 single-pointer + keyboard | §8.0; §8.2, §8.8, §8.9, §8.10 |
| A5 reduced motion surfaces | §6.5, §6.6, §9.3 |
| A6 flashes | §8.0 rule; §8.1 (no lightning), §8.2 (shake), §8.7 (splash rate) |
| A7 calm visuals (P2) | core `calmVisuals` + `eosCalm`; §5.2; §6.2 footer; §9.3 |
| A8 colour-only window (P2) | §3.6 striped arc; §11.6 capsule stripes |
| A9 113 swaps (P2) | §8.3 |

### 13.4 Rejected or modified (with the evidence)
1. **asks B4 (P2 part) — title default "THINKSTILL HQ": rejected.** The header renders `{displayTitle}` followed by `by` and `THINKSTILL` (`src/00_arcade.jsx` L21977-21983), so that default would read "THINKSTILL HQ by THINKSTILL". The main B4 fix (show the THINKSTILL brand on phone) is applied.
2. **asks E7 — eruption taps 6 / 9 / 12: modified.** The tap count stays 6 (≤ 8 s, ≤ 30 % of 112) and the *juice* scales with intensity (rocks per tap, size, boom, pitch), per science R1.4: arousal-raising venting does not reduce anger (Kjærvik & Bushman 2024), and 12 taps over up to 12 s would make the discharge ~40 % of a 30 s game. The angry user still gets a bigger smash.
3. **asks E14 — replace real-world finds with on-screen "spot it" finds: partly rejected.** Grounding's active ingredient is attention to the real present environment (the science critique rates 113's mechanism correct); an on-screen search is distraction, not grounding. Adopted: missions ≤ 4 words with big icons, 2 of 5 beacons become in-game body holds, a beam sweep that reveals a glowing icon of each find and burns a worry word, and swaps (science A9).
4. **asks F5 — "the repo ships 700 expressions… hundreds of win faces": corrected number, fix applied.** The 750-ritual map holds 70 unique `win` faces (minus the arcade's negative ids); with the arcade's positive sets the pool is **102** faces (verified, every URL HTTP 200), ~20 days at 5 orbs/day, plus a guaranteed new face per day.
5. **asks F10 — fetch `eos_flip_index.json` lazily from raw.githubusercontent: modified to an inline index.** A `…/main/…` URL returns 404 until this branch is merged, the fetch adds a runtime network dependency inside a Framer component, and a ≤ 40 kB inline index (24 lines × 12 emotions) works offline with no request at all. The rest — one personalised line, silent fallback, mined from the 1,000 rituals — is applied (§9.6).
6. **science S1 — `eosApi("safety").scan?.()` from router / launch / entries: strengthened.** The lexicon and `EosSafetyScan` live in core, so the synchronous scan exists in every build; with the critique's version an isolated or partial build without the safety module would silently skip it.
7. **science S6 — the "hit me up" lookahead appended to every abuse verb: refined.** Run in node, that version missed "he beat me up", "my dad beat me up", "she burned me with a lighter" and "he hit me with a belt", and still flagged "my brother beat me at fifa". Core now uses per-verb exclusions and one shared subject list; all 43 must-match and 23 must-not-match phrases pass. The original lexicon also never matched "I wanna die" (it required "to") — fixed.
8. **science S9 — show the soft card whenever `EOS_REAL_THREAT` matches: scoped.** The broad regex also matches "my boss threatened to fire me" and "someone hit my car" (verified). The **route rule** stays broad (118 / 105 / 53 are never routed for those texts); the **card** additionally needs a fear word or a physical verb aimed at "me" ("I'm scared someone is following me" → threat card).
9. **science R1 — cool variant skippable after 1.5 s: harmonised to 0 s** with asks E3 and science E4 (autonomy; a forced wait reads as homework). The cool variant still auto-starts for every anger-after-smash loop (overriding asks E3's veteran chip), and COOL IT DOWN ▶ is still the offer.
10. **asks D5 vs science C1 — starters:** the science table is adopted (it covers D5); the panic starter keeps the feeling's name first ("panic racing heart tight chest too fast right now") for affect labelling and so the starter itself detects as panic.
11. **asks F3 — "PANIC PILOT" badge: modified to the skill badge ("SIGH PILOT")**, because science E2 makes mastery count skills, not suffering.
12. **asks B1 `max(15px,1em)` / build H3 "12 / 11 px floor": merged.** The `1em` form can shrink (build H3), so those selectors use grow-only JS targets; the floor is 12 px at every width (asks B3, the stricter of the two).
13. **science B5 — label "HANDS OFF · BREATHE WITH THE GLOW":** split into a label + second line (`L2`) to keep the spec's own ≤ 22-character label rule.
14. **science R3 — option B (a savour mode for 114): not taken.** Option A (GOOD → 117 / 119 / 106 / 88) avoids a second copy mode inside the sadness game.
15. **asks C3 — bokeh inward via the dots layer:** Pixar's `tsPxBokeh` keyframes animate `translate`, so a static `translate` would be overridden; the drift moves the base `left/top` instead (§5.3).
16. **build M14 — "lift `.gwDock`":** `.gwDock` is the last row of the `.gwGame` grid (not positioned), so the lift is a measured grid fit (smaller gap / padding, `overflow:visible` as the fallback); `overflow-clip-margin` stays as a progressive enhancement only.
17. **Consequence of R2 / R9 (not a critique item):** 14 CRUMPLE, 19 ERASE and 71 DEFUSE left their lists; they are re-routed where the fit is real (19 → overthinking mid tail, 14 → anger mid tail, 71 → anger low — "defuse" is the anger metaphor; the bomb is only a threat cue for panic and fear), so §7.6 classifies all 120 ids.
18. **Copy rule "just":** banned as a minimiser of the user's effort ("just breathe"); the user's own voice in "just let me play →" is kept.

## Owner decisions (delegated to the lead, binding for builders and reviewers)
- 2026-10-08 · Dots / Still Point colour: the core travels from the feeling's own hue to the hue of that feeling's calm grade (§0.2: anger red → teal, panic → dawn gold, sad → peach; numb grey → colour), taking the hue path that avoids yellow-green. This supersedes the "always ends on cyan 190" line in §5.2. Reviewers must not flag it.
- 2026-10-08 · Release 1 scope: see the workflow SCOPE note (games 115-120 and flipdata deferred to release 2; router and rewards degrade gracefully).
- The lead decides all remaining open design questions in favour of: clearer first-time guidance, faster felt relief, warmer Pixar / Inside Out look, and never removing existing functionality.
- 2026-10-08 · **Creative standards** in docs/CREATIVE_STANDARDS.md are binding for all builders, reviewers, raters and polish agents (characters as active in-world participants; a unique spectacular finale per game; look-alike games get different gameplay; bubble image rules — circular, no black masks, text below, no overlap; cinematic richness; honest scoring with evidence; never remove features; functional / visual / premium readiness for all 114 games; mobile first). New games 111-114 must already meet them: in-world characters that react and transform, and a unique finale designed for the mechanic.
- 2026-10-08 · **Architecture principle:** characters-as-participants, distinctive gameplay, cinematic quality and each game's own finale are CORE GAMEPLAY requirements designed into the engine (character role per player action + progress transformation, and the game's own finale sequence as first-class states), not cosmetic overlays. Reusable systems are parameterised per game; changes across many games are piloted on representative games first and reviewed on rendered phone + desktop screenshots. See docs/CREATIVE_STANDARDS.md.
