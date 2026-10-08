# BRIEF for task `arrows` — extracted from docs/EOS_SPEC.md (sections: §3 (all, incl. §3.10-§3.11 tables), §0.4 (eosTarget fields), §6.2 / §6.6 (hint consumers))
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


## Owner decisions (delegated to the lead, binding for builders and reviewers)
- 2026-10-08 · Dots / Still Point colour: the core travels from the feeling's own hue to the hue of that feeling's calm grade (§0.2: anger red → teal, panic → dawn gold, sad → peach; numb grey → colour), taking the hue path that avoids yellow-green. This supersedes the "always ends on cyan 190" line in §5.2. Reviewers must not flag it.
- 2026-10-08 · Release 1 scope: see the workflow SCOPE note (games 115-120 and flipdata deferred to release 2; router and rewards degrade gracefully).
- The lead decides all remaining open design questions in favour of: clearer first-time guidance, faster felt relief, warmer Pixar / Inside Out look, and never removing existing functionality.
