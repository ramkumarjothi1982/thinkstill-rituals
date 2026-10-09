BUILD game-sigh: FINISHED (round 1 fixes applied). 111 BIG SIGH (panic hero, express-orb target), file /home/user/thinkstill-rituals/framer/src/eos/21_eos_game_sigh.jsx

ROUND 1: WHAT CHANGED (docs/eos_status/game-sigh.review_r1.json, 5 majors + 9 minors)
MAJOR, SYNC is an active participant (CREATIVE_STANDARDS #1). Fixed.
- SYNC has a new 4-layer rig, CSS only, driven by data-phase, data-fin and --f:
  - .eosSighSync: the finale's X travel.
  - .eosSighSyncLift: the finale's Y arc and scale.
  - .eosSighSyncHop: the acting beats.
  - .eosSighSyncBody: breath scale.
- The rAF loop now writes --f to SYNC as well as to the orb.
- Measured beats:
  - Inhale: SYNC fills up with the orb (body scale 1.04 → 1.09 as --f rises).
  - Notch at 72 %: an anticipation hop (eosSighHop).
  - Sip: a squash bounce.
  - Exhale: SYNC blows the clouds away. 4 wisps stream from its mouth toward the leaving clouds, there is a mouth puff and a lean, and the body shrinks linearly with --f.
  - Early lift: a cough jolt plus a little cough-puff.
  - End of every sigh: a relieved slump (eosSighSlumpA/B), then the face pop, which now runs 0.18 s later.
- SYNC is bigger: 75-85 px on phone (was 56) and 87-97 px at 1280×720 (was 40).
- Reduced motion keeps the breath scale (k .035) and the face changes, but drops the hops, the flight and the travelling wisps.

MAJOR, the finale is its own first-class state, played BEFORE 100 % (CREATIVE_STANDARDS #2). Fixed.
- The new phase "finale" holds progress at 96 for 2.6 s:
  - 0 ms: the orb blooms into a sun (sunny fill, turning rays, a halo swell, the ring and 12 sparks). The scene's sun breaks the horizon (it rises to -64 % with turning rays), the sea glint brightens and the stars twinkle.
  - 200 ms: SYNC lifts off the island and floats along a real arc. X eases in and out while Y rises fast, and the target is measured into px CSS vars by finGeo(). Meanwhile the moon glides into the open sky and grows ×1.7-1.9.
  - 1750 ms: SYNC lands in the moon's hollow and yawns.
  - 2150 ms: SYNC curls up asleep (face E90, a tilt and floating Zs). The cue changes to "SYNC is fast asleep".
  - 2600 ms: progress goes to 100, then sfx("win") and the finish haptic; onDone follows 450 ms later.
- The wrapper's reward card therefore arrives after the finale. The moon's own SYNC image is now only the reduced-motion cross-fade.

MAJOR, text no longer covers SYNC on the phone's first impression. Fixed.
- eosSighLayout is rewritten with two measured compositions:
  - STACK (< 720 px): the clouds sit in rows of 3 + 3. Row B's centre cloud is SYNC's own word-less storm cloud, behind its head, so SYNC can rise into row B. Below come SYNC's island on the horizon, the cue, a clear 44 px lane and the orb.
  - SIDE (≥ 720 px): one row of six clouds. SYNC's island stands to one side on the horizon, and the cue, lane and orb share the centre column.
- The cue box is reserved at its real maximum: the main line plus one sub or tip line. Every cue is one line per row, enforced with nowrap; all copy was checked at 390.
- The tip was shortened to "Dizzy or tingly? Breathe as usual." and takes the reserved sub-line slot.
- On phone the orb sits right of centre (thumb side), so the arrows label lands on the orb's LEFT, not stacked onto the cue or SYNC. The cue stays centred in the arena.
- Measured in the start (with tip), in, ready, out and after-sigh states at 390×844, 1280×720 and 1280×860: cue∩SYNC 0, words∩SYNC 0, text∩text 0, arrows label∩SYNC 0, cue inside the arena, no horizontal overflow.

MAJOR, clumsy play finishes and the cue keeps its verb. Fixed.
- After 2 early lifts in a row the game enters easy mode, which runs guided sighs: any touch starts a whole sigh. The orb keeps filling after the finger lifts, then the top-up and the exhale play.
- Cues:
  - 1st early lift: "Hold the orb a little longer" / "bigger breath in, then let go".
  - Easy mode: "Tap the orb · we breathe together" / "the slow out is what matters".
- Reviewer tap pattern (220 ms down, 380 ms gap) at 390: the 3rd tap starts a real sigh. It reached 100 % in 30.5 s (it used to stay at 3 % forever).

MINOR, cue height feeds the layout. Fixed by reserving the real maximum and keeping cues single-line. That is more stable than re-measuring per cue, because SYNC never jumps in size between cues.
MINOR, 1280×720. Fixed by the SIDE layout (a single cloud row, os floor 84, SYNC 87-97 px). No cloud overlaps SYNC.
MINOR, pacer ownership. Fixed:
- fx.own() tracks s.owned.
- The finale releases the pacer at 100.
- Unmount calls eosBreathOwn(null) only if the engine still owns it.
MINOR, reduced-motion orb growth. Fixed. button.eosSighOrb plus :hover, :active and :focus-visible are set to transform:none!important. Measured calm growth is 103/101 = 1.02 (≤ 4 %); btnT is none in every state.
MINOR, keyboard parity. Fixed. ↑ or a 2nd finger during inhale 1 sets s.earlySip, plays an acknowledgement, and the sip plays at 72 %. Verified: Space down, ↑ at 0.6 s, phase sip right at the notch, plog 3,6,8.
MINOR, impure updater. Fixed. fx.toggle("wind") is hoisted out of setUi, so every updater is pure.
MINOR, filler fragments. Fixed:
- eosSighWords asks eosWords for 8 chunks.
- It drops chunks of ≤ 2 characters or made only of function words (EOS_SIGH_STOP).
- If fewer than 3 are left, it pads with the feeling's seeds.
- "my chest is tight and I cant breathe at work" → "my chest", "is tight", "cant breathe", "work". Spare clouds stay plain storm clouds.
MINOR, the drag demo cuts through "SIP ↑". Fixed. The ready marker is now {g:"drag", dir:"u", d:30, ox:0.32}, so the demo runs at the orb's right third.
MINOR, the night palette is too cool. Fixed. The night dawn is now a warm moonlit gold horizon (#ffc874) over a mauve mid-sky, with a warm sea (#eaa77c → #26336f).
MINOR, cross-module swarm (14_eos_mood). Not this file; I left it to the mood/dots owner. Related wrapper behaviour: the shared "STEADIER/SPACE ✓ +14 ×4" chip appears on the last sigh's chime, sits over the orb during the finale, and hides the orb's bloom into a sun (see game-sigh_r1_finale_390.png). SYNC's flight, the moon, the sunrise and the cue stay visible. That chip belongs to the wrapper or rewards layer.

WHAT IT IS (unchanged contract)
- Finger down = air in, finger up = air out:
  - Inhale 1: 0 → 72 % in 2.0 s (notch 1).
  - Sip: a slide up of 24 px or more, a 2nd finger or ↑, 72 → 100 % in 0.6 s. With no slide it tops up by itself after 1.0 s.
  - Exhale: a LINEAR exhale of 4.5 → 5.5 → 6 s blows two word clouds out to sea.
- 3 sighs, or 4 when the check-in feeling is 8+. The colour script runs storm-violet → dawn by time of day.
- SYNC's face goes E44 → E48 → happy → E90 asleep.
- The game owns the shared pacer.
- No heartbeat, no lightning, no fail state.

EXPORTS: EOS_GAME_111, EosBigSighEngine, EOS_SIGH_CSS (unchanged).
- Registered via eosRegisterGame(..., {gesture:"hold", char:"sync", seconds:30}).
- Dev handle window.__eos.sigh.state(), which now also gives t, the ms since the phase started. Phases are idle · in · ready · sip · full · out · puff · finale · done.
- New top-level names are all eosSigh-prefixed: EOS_SIGH_FIN, EOS_SIGH_FIN_PROG, EOS_SIGH_PLAIN, EOS_SIGH_WISPS, EOS_SIGH_STOP.

INTEGRATOR: NOTHING NEW TO WIRE. The marker contract is unchanged except for ox:0.32 on the ready marker. Arrows lands the label left of the orb on phone and right of it on desktop.

ACCEPTANCE (scratch integrated builds: eos_integrate --modules 21_eos_game_sigh.jsx[,30_eos_arrows.jsx]; isolated build.py --dev-dir /tmp/eos_game-sigh OK; scripts /tmp/gsig/t1-t5.mjs, tap.mjs)
- Progress plog: 3,6,8,10,33,36,39,41,43,67,70,73,75,77,96,100. It is strictly increasing, reaches 100 once, onDone fires once and never gets a 3rd argument.
- sfx: soft…, chime ×3, win (win now at 100, the end of the finale). Non-soft sounds = sighs + 1.
- Shared eos.finishGame(111) reaches the reveal:
  - 390×844: 37.3 s and 36.3 s (2 variants).
  - 1280×860: 42.8 s with lite, under heavy machine load (headless software raster at about 5-7 fps).
  - The nominal game time is about 29 s, then the wrapper finish.
- Errors: 0 page errors and 0 [eos] warnings in every run.
- smallText: no arena text below 14 px at 390 or 1280. The Zs are 22/28 px pseudo-elements.
- Reduced motion: the moon SYNC cross-fade shows (display block), there is no flight, orb growth is 1.02, and it finishes with the same plog and sfx.
- Frame cost: finale p50 183 ms against exhale p50 150 ms (normal), and 83 against 67 ms (reduced), under load. The finale is about 20 % heavier than play. The rays use rotate on composited layers.

SCREENSHOTS (/home/user/thinkstill-rituals/framer/dev/shots/eos/, git-ignored)
- Phone: game-sigh_r1_start_390.png, game-sigh_r1_ready_390.png, game-sigh_r1_out_390.png, game-sigh_r1_flight_390.png, game-sigh_r1_finale_390.png, game-sigh_r1_reduced_finale_390.png.
- Desktop: game-sigh_r1_out_1280x720.png, game-sigh_r1_out_1280.png, game-sigh_r1_finale_1280.png.
- The ready and out 390 shots predate the phone orb shift. That shift only moves the orb right and moves the arrows label from SYNC's chin to the left of the orb; the start shot shows the final state.

KNOWN LIMITATIONS
- The wrapper's score chip covers the orb during the finale (see above). The mood/dots swarm is cross-module.
- Headless timing is load-sensitive. All timers and the drain are wall-clock.
- On phone, a 6th meaningful word chunk has no cloud, because the stack layout shows 5 word clouds plus SYNC's own plain cloud. Most inputs give ≤ 5 meaningful chunks after the filler filter.
- I ran only the isolated and scratch-integrated builds, not the full build.py, to avoid clobbering dev/out.js for parallel tasks.
