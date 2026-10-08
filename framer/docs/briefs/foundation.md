# BRIEF for task `foundation` — extracted from docs/EOS_SPEC.md (sections: §12.0, §12.3 (Foundation task adds), §3.3 (gesture grammar to perform), §3.12, §4.7, §5.4, §8.12, §10.4; core §0 (window.__eos is dev-only: file:// is fine))
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


### 3.12 Acceptance (arrows)
Run in a scratch integrated build (§12.3) for every id in `GAMES` (110 + new) at 1280×860 and 390×844 (and one reduced-motion pass):
- Within 1.5 s of `stage-play` the layer shows a hand whose hotspot lies inside the resolved target rect (±10 px) — or inside the group bbox for `choose`, or the ✋ for 66/80; the label is ≥14 px rendered.
- **Every stage, not just the first:** `eos_drive.finishGame` (same table / `data-eos-*` markers) asserts, before performing **each** stage of `EOS_GESTURES[id]` (or each new marker set), that `arrows.state().visible` became true and `label` equals that stage's label. For 3, 28, 40, 88, 98 and 107 the stage-2 label appears within 800 ms of completing stage 1.
- Performing the real interaction raises `aria-valuenow`; the hand hides within 200 ms; for `taps` stages `.eosCount` stays visible and its number decreases with each tap (CRUSH: 4 → 3 → 2 → 1 although the button remounts); re-shows after ≥4 s idle; a missed tap re-shows within ~1.3 s; dragging 36 fast shows the amber "slower… 🐢" gauge.
- `EosHandHint` (check-in step 1 halo, step 2 dial + CTA, Still Moment heart/spark, the reveal dial): a hand is visible within 1 s of each surface appearing.
- The LIVE GUIDE panel shows a glyph for every id in both wrappers, and the override ids (88, 94, 97, 98, 101, 106, 107) show the glyph of their progress-0 stage; new games' guide text has no extra regex arrow.
- `div.eosSrOnly[aria-live]` holds the current label; zero page errors; `window.__eosArrowMiss` is empty.

---------------------------------------------------------------------------------------------------

### 4.7 Acceptance (readability)
- **8 states × 2 sizes** (1280×860, 390×844): input; game menu open; play start; play right after the first hit (step payout + `.globalFeedbackCopyLayer` visible); finish hold (`.globalFinishFeedbackCopy`); reveal with the meter; reveal after the payoff; Orb Shelf + safety card open. Games: POP, CRUSH, HOT POTATO, CLEANSE, RAIN OUT, SHELF IT, and 111-120. `eos_drive.smallText(12)` (which wraps `readability.scan()` + a DOM sweep) returns nothing below 12 px; user-word selectors render ≥ 16 / 15 px (ECHO included).
- **No-shrink check** for every one of the 120 games at both sizes: the rendered size of every text element is ≥ its size in the baseline build (same text, same viewport; baseline = `python3 build.py --dev-dir /tmp/eos_base --modules 00_eos_core.jsx`, which has no readability module). SCRATCH REVEAL words stay ≥ 23 px at 1280; `.chainStart` unchanged.
- `.engineProgressHud` and `.releaseScoreBar` rects are fully inside the viewport and do not overlap the title; the phone header reads "THINKSTILL".
- **Screenshot review** (builder looks at every image) of every game whose label grows (DEFUSE, FREEZE, MAGIC TRAPDOOR, DRAMA MACHINE, TINY SOUNDTRACK, DOOR A/B, X-RAY, SINKING PLATFORM) **and every tight layout touched by `min-height`** (MIRROR FLIP, HEADLINE, PARK IT, GO WEIRD, TINY SOUNDTRACK) at both sizes; add per-game `max-width` / `white-space:normal` guards where a label overflows its object, and drop `min-height` for a selector whose layout breaks. No element with `scrollWidth > clientWidth + 2` among the resized labels.

---------------------------------------------------------------------------------------------------

### 5.4 Acceptance (dots)
- Computed `animation-name` of `.tsPxDust` includes `eosDotsX`; of `.cinemaDust i` includes `eosDotsY`.
- **One centre (C1):** sampling every visible `.tsPxDust`, `.cinemaDust i` and `.eosLane [data-eos-dot]` position at t and t+2 s: ≥ 70 % are closer to the measured `.eosCore` centre, and ≥ 70 % of dots near the end of their cycle sit within 24 px of it — in input, play and reveal, at both sizes.
- **Visible (C4, H1):** on stage-input, 4×4 screenshot clips at three `.eosLane` dot positions differ from the background colour (elementFromPoint cannot see a pointer-events:none layer); in POP, CRUSH, BURN, RAIN OUT, HOT POTATO, BLACK HOLE, SEND TO SPACE, 111, 114 and 117 at least 8 dust points are visible (screenshot pixel delta, or no opaque background along `elementsFromPoint` at their centres).
- **Mirror (C2):** lane `playbackRate` at level 9 > at level 3, and falls as progress rises.
- **One pacer (B4):** while 111 owns the breath, `eosBreathPhase().owned === true` and `.eosCore[data-phase]` equals its phase; after release the CSS cycle is within 200 ms of the shared clock.
- With `reducedMotion:"reduce"` or calm visuals on: no running EOS dot animation. Frame budget: no long tasks from the dots (they are transform/opacity or 28 tiny `left/top` nodes).


### 8.12 Acceptance (every new game)
In a scratch integrated build (`dev/eos_integrate.py --dev-dir … --modules <file>`) and the full build: registers in `GAMES` with all 15 string fields and `EOS_GAME_META[id]` has `gesture`, `char`, `seconds`; `EosEngineFor` returns it; starts from the menu by name; the arrow appears from `data-eos-target` within 1.5 s and **every** stage's arrow appears as the game advances; can be finished with the arrows' gestures by `eos_drive.finishGame` in ≤ 45 s at 1280 and 390 (and with the single-pointer / keyboard alternative); progress strictly increases and reaches 100 once; `onDone` once; no `onProgress` third argument; non-soft `sfx` calls ≤ the number of real successes (count via the wrapper's CHAIN pill); **no `[data-eos-target]` rect intersects `.globalPlayGuide` or `.engineProgressHud`** at 1280×860 or 390×844; no text below 14 px inside the arena; no flashes (no frame-to-frame luminance change over 10 % of the arena more than 3×/s in a 2 s screen capture); zero page errors; no class from the avoid-list in the DOM; reduced motion has no travel; the Pixar checklist (§8.0) ticked with screenshots (start / mid / finish × desktop / phone) reviewed.

---------------------------------------------------------------------------------------------------

### 10.4 Acceptance (safety)
- Typing each must-match phrase shows `.eosSafetyCard[role=alertdialog]` within 1 s while a running game keeps running and `button.releaseChoiceButton` stays clickable; must-not-match phrases show nothing.
- **Race:** "i want to die" + Enter (or LET THINKSTILL CHOOSE) within 100 ms → the routed id ∈ `EOS_GENTLE_IDS`; during play, typing "my dad hits me" → within 500 ms no arena element's text matches `EOS_SAFETY_LEX` (neutral words on the objects).
- **Focus:** typing "i want to die and then some" in the composer leaves every character in the input (no keystroke lands on a card button).
- The soft card shown in stage-reveal is the `elementFromPoint` hit at its own centre (above the overlay); GOOD 5 → 9 never shows a soft card; numb shows the numb copy.
- Dismissing the self-harm card then typing an abuse phrase shows the abuse card (per-type dismissal); after dismissal the "💛 support" pill is visible; the persistent link opens the info card from check-in, reveal and shelf.
- The first line matches the time zone (e.g. `timezoneId:"America/Toronto"` → Canada first) and is a one-tap `tel:`; a "text HOME to 741741" line becomes `sms:741741?&body=HOME`; lines come from the property control string; nothing is written to storage; `window.__eos` is undefined on an `https://` page without `?eosdev=1`.

---------------------------------------------------------------------------------------------------

### 12.0 Order (L14)
1. **foundation** (alone, first): `dev/eos_drive.mjs` + `dev/eos_preview.*` — every other task's acceptance depends on it.
2. **module and game tasks in parallel**, each in its own scratch integrated build (`python3 dev/eos_integrate.py --dev-dir /tmp/eos_<task> --modules <your files>`). After each merge into the repo: `python3 build.py` (full).
3. **I1** (needs readability, dots, mood, arrows, fixes) → **I2** (needs checkin, router, shift, rewards, safety, fixes) → **I3**. Game modules are optional for I1/I2 (`EosEngineFor` returns `null` without them); `eos_integrate.py --in-place` refuses to write if a referenced symbol is missing.


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


## Owner decisions (delegated to the lead, binding for builders and reviewers)
- 2026-10-08 · Dots / Still Point colour: the core travels from the feeling's own hue to the hue of that feeling's calm grade (§0.2: anger red → teal, panic → dawn gold, sad → peach; numb grey → colour), taking the hue path that avoids yellow-green. This supersedes the "always ends on cyan 190" line in §5.2. Reviewers must not flag it.
- 2026-10-08 · Release 1 scope: see the workflow SCOPE note (games 115-120 and flipdata deferred to release 2; router and rewards degrade gracefully).
- The lead decides all remaining open design questions in favour of: clearer first-time guidance, faster felt relief, warmer Pixar / Inside Out look, and never removing existing functionality.
