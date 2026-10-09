The shared systems are built in `src/pilot/70_pilot_core.jsx` and `src/pilot/71_pilot_fx.jsx`, with a dev demo in `src/pilot/79_pilot_demo.jsx` (on only with `?pilotdemo=1`). With `?pilot=off`, the original 1 and 2 play to the reveal; the original 109 needed one fix (below), and after it, it plays to the reveal too. Commit `aa2225c` is pushed to `claude/jolly-hopper-ognrxj`. It includes only my three files and my progress note. An earlier checkpoint commit from the parallel workflow (`64e72ae`) had already picked up older drafts of my files; `aa2225c` brings them to their final state.

**Test results (demo, 390×844 and 1280×860, all three kits):**
- **Plays through:** `finishGame` reaches the reveal at 1280 for ids 1, 109 and 2, with 0 arrow misses, no label mismatches and 0 page errors. At 390 the games were played through with scripted taps and holds; all three reached the reveal, also with 0 page errors.
- **Progress:** always 0 → 33 → 67 → 96 → 100. 100 arrives only at the hand-off, labelled `100% POPPED / CLEANSED / CRUSHED`.
- **Targets and arrows:** the marked target sits at y 514 on phone and y 485–499 on desktop.
- **Words:** 16px, weight 800.
- **Guide and toast:** the phone guide shrinks to a 44px strip during play and shows the MIND BEND line at the hand-off; desktop guide is unchanged. Step and finish toasts sit just under the HUD.
- **Reveal:** tinted with the game's calm sky, night pool or warm workshop, with the hero's win face as a circle on the card.
- **Reduced motion:** no looping animations left running.
- **Arena size:** 126–151 elements.

**Things I changed from the spec, and what game builders should know:**
1. **`@property --hold-pct` removed.** Registering it is global, and it broke the original CLEANSE's hold meter, so the game got stuck at 0% with `?pilot=off`. After removing it, the original plays to the reveal. The pilot still writes `--hold-pct` on the held button.
2. **Faces load earlier.** The calm face now loads at mount and the win face from 34% (spec said 67%). With three words the game jumps from 0 to 67 in one tap, and the faces weren't ready by the finale.
3. **Faces stack.** Every loaded face up to the current step stays visible underneath the new one. Before this, the placeholder letter flashed in the finale when the browser was slow.
4. **Sound order.** My own tones now play before the arcade sound in each cue, and a timed cue that is already due plays straight away.
5. **Measurements are unreliable on this machine.** Load was 9–11 on 4 cores because of the other workflow. Finale frames dropped to 2–5 fps and input-to-sound delay ranged 60–3200 ms. That is the environment, not the pilot code.
6. **Animation budget.** One busy tap (a particle burst) briefly reaches 39–50 running animations, against the spec's limit of 40. Each particle costs one animation, so games need to size their bursts.
7. **Toast vs hero.** On phone the finish toast is about 100px tall and partly covers a hero placed high in the play area. Keep the finale hero's centre at least ~120px below the toast's top.
8. **Reaction faces.** I picked the soft and reaction faces from contact strips of E01–E64 and recorded the ids in `EOS_PILOT_SOFT_FACE` / `EOS_PILOT_REACT_FACE`.

**API summary**

`70_pilot_core.jsx`:
- **Switch and registry:** `EOS_PILOT_VERSION`, `EOS_PILOT_IDS`, `EOS_PILOT_FINAL_PCT` (96), `EOS_PILOT_HANDOFF_MS` (1300, 800 reduced), `eosPilotOn()`, `eosPilotDemoOn()`, `eosPilotRegister(id, Engine, meta)`, `EosPilotEngineFor(game)`.
- **Words:** `EOS_PILOT_HINTS` (applied once at load), `eosPilotWords(entries, max)` returns `{waves, words, imageOnly}` with stop-word chunks merged, `EOS_PILOT_STOP_TOKENS`, `eosPilotCharFor(word, i, used)`.
- **Chrome hooks:** `eosPilotMarker(spec, live)`, `eosPilotShellAttrs(arena, attrs | null)`, `useEosPilotShell(arenaRef, id)` returns `{guide(mode), playInput()}` for the phone guide strip, `eosPilotAfterglow(kit, face, arena)` / `eosPilotAfterglowClear()`, plus the CSS for the toast dock, quiet CLEANSE toast, word size rule, button resets and reveal tint.
- **Dev handle:** `__eos.pilot`: `on`, `demo`, `ids`, `state()`, `soundLog()`, `clearSoundLog()`, `decoded()`.

`71_pilot_fx.jsx`:
- **S0 helpers:** `eosPilotAnim`, `eosPilotAnimSkip`, `eosPilotAnimCancel`, `eosPilotTimers`, `useEosPilotRuntime`, `eosPilotImgKey`, `eosPilotEvT`, `eosPilotIsReduced`.
- **S1 character:** `<EosPilotActor ref role emotion char image size u progress reacts label word showLabel sub avoid seed eager ballChildren style/>`.
  - Handle: `emit(press|lurch|squeeze|hit|miss|inhale|exhale|hop|popBack)`, `react`, `look`, `pose(raise|press|wave|cup|sitCross|plant|tuck|rest)`, `setTug`, `setStance`, `setCompression`, `setHeat`, `setUnder`, `celebrate`, `anchor`, `el`, `part`, `setStep`, `prepare`, `flash`.
  - Helpers: `eosPilotFaceStep`, `eosPilotFaceSrc`, `eosPilotPick`, `eosPilotDecode`.
- **S2 finale:** `useEosPilotFinale({...beats})` returns `start(ev)`, `tap(ev)`, `handoff()`, `phase`, `t0()`. `onDone` fires exactly once; there is a watchdog and the skip rule.
- **S3 stage:** `<EosPilotStage ref kit calm hide planeClassName>` with `grade`, `camera`, `particles(name, on)`, `burst(pool, o)`, `layer`, `el`. Kits are `EOS_PILOT_KITS` (sky, pool, workshop, none ending in a sunrise), particles are `EosPilotParticles`.
- **S4 sound:** `useEosPilotSound({gameId, live, cues, timers})` returns `cue`, `later`, `warm`. `EOS_PILOT_SOUND_LOG` keeps the last 400 rows; low tones get a body layer and a click automatically.
- **S5 gestures and layout:** `useEosPilotGesture({kind: tap|hold, holdMs, fillMs, fillVar, onDown, onHoldReady, onHoldFull, onHoldDone, onHoldCancel})` returns `bind(key)`, `route(e, el)`, `cancel()`, `holding()`. Also `useEosPilotNearHit(arenaRef, getTargets, 28)` and `useEosPilotBox(arenaRef)` returning `{w, h, u, phone, play}` (it also sets the toast position).

**Demo instructions**
1. Build: `python3 framer/dev/pilot_build.py --dev-dir /tmp/pilot_<you>
