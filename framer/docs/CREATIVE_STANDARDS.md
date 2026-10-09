# ThinkStill Release — Creative Standards (owner-mandated, binding for every builder, reviewer, rater and polish agent)

Set by the owner on 2026-10-08. These override any weaker wording elsewhere in the spec.

1. **Characters are active participants.** The emotion characters live inside each game's world and respond meaningfully to the player's actions: anticipation, squash & stretch, recoil on hits, relief, celebration, and a visible emotional transformation (loud face → softer → calm/happy) driven by the player's progress. A corner companion is a supplement only — never a substitute for in-world characters.
2. **Every game has its own spectacular finale.** A distinctive dopamine burst designed for that game's mechanic and environment (e.g. a volcano's eruption turning to a cooling aurora, lanterns filling the sky). The shared calm colour shift and positive-word bloom may play *in addition*, never instead.
3. **Look-alike groups get genuinely different gameplay.** The 8 duplicate clusters must differ in the core interaction (gesture, rhythm, physics, goal, feedback loop) — not just in background, colour or label.
4. **Bubble image rules (unchanged, strictly enforced).** Character/bubble images are circular; no black masks or black boxes around them; readable text sits *below* the image; image and text never overlap; nothing clipped.
5. **Cinematic, immersive, visually rich, genuinely entertaining.** Warm cinematic light, depth, materials, motion with weight and timing, layered environments, sound sync. Premium interactive entertainment, not standard web animation.
6. **Honest evaluation.** Ratings are never inflated. Every score cites screenshot evidence (which shot/tile), gameplay observations and a plain explanation of why it earned that rating.
7. **Never remove features.** Keep every existing feature, progress indicator, sound, navigation, control and game. Never remove something to make a screen look cleaner — redesign it instead.
8. **Three readiness levels, all required, for all 114 games:**
   - **Functional-ready:** starts, plays to finish on desktop and phone, no errors, progress never goes backwards, arrows guide every step, sound works, navigation intact.
   - **Visual-ready:** readable text (≥12 px, user words ≥15 px), bubble image rules pass, nothing clipped or overlapping at 390 px and 1280 px, characters render correctly, the environment is coherent.
   - **Premium-ready:** every rubric axis ≥ 8/10 (polish & light, distinct environment, interaction feel, characters as active participants, unique finale, clarity, mobile, relief fit) and no performance flag.
   A game is **complete only when all three pass.**
9. **Mobile first.** Design, review and score at phone size (390×844) first; desktop second. It must feel like a premium mobile product, not a desktop page squeezed onto a phone (thumb reach, large targets, safe areas, portrait composition).

Efficiency rule: build reusable systems (character reaction layer, finale toolkit, environment kits, gesture library), but every game must keep its own identity — reusable parts are customised per game, never stamped identically.

## Architecture principle (owner, 2026-10-08)
Cinematic quality, characters as active participants, distinctive gameplay and a unique dopamine finale are **core gameplay requirements, not cosmetic polish**. They are designed into a game's architecture from the start:
- **Games still being built (111-114 and any later ones):** the engine's state machine must include the character's in-world role (what it does on each player action, how it transforms with progress) and the game's own finale sequence as first-class states — not overlays added afterwards. Reviewers reject a game that only has decoration plus the shared colour shift.
- **Existing games:** the audit classifies each game as needing *structural gameplay work* (mechanic/feedback loop/finale/character role must change) or *visual polish only*. Structural work is planned as gameplay changes, not skins.
- **Reusable systems** (animation/squash library, character reaction layer, lighting rigs, sound cues, finale toolkit) are parameterised per game so interactions and emotional journeys stay distinctive.
- **Pilot first:** before any change rolls out across many games, it is built on a small set of representative games (one per look-alike cluster + the most-routed games + some of the weakest), reviewed on rendered phone and desktop screenshots by independent reviewers, shown to the owner, and only then rolled out.
- Avoid unnecessary rewrites; preserve completed work; commit progress continuously.
- Priority is a premium experience users enjoy and return to, not the fastest delivery of 114 functional games.

## Pilot approval package (owner, 2026-10-08) — the OWNER approves, never AI scores alone
For every pilot game, before any rollout:
1. **Before / after screenshots** at phone (390×844) and desktop (1280×860): start, mid-play, finale, reveal.
2. **A playable build** the owner can open and play (hosted page of the real component build, plus the Framer `.txt`).
3. **A gameplay recording** (video) showing character animations and reactions, interactions, cinematic transitions and the complete finale / dopamine burst, at phone size first.
4. **Responsiveness evidence:** input-to-next-frame latency per interaction (Event Timing API) and frame-time distribution during play and the finale (p50 / p95 / long frames), measured on the same build.
5. **Sound sync evidence:** a log of each user action and the sound cue it triggered, with the time offset in ms (target ≤ 50 ms), plus the playable build so the owner can listen.
6. **A distinctiveness explainer:** what makes the mechanic, environment, character role and finale unique, and how it differs from its look-alike siblings.
AI reviewer scores are supporting evidence only. Rollout to the remaining games starts only after the owner has played the pilot and approved it.
Caveat recorded honestly: recordings and timings come from a headless cloud browser without a GPU, so they understate real-device smoothness; the playable build is the owner's ground truth.

## Delivery policy (owner, 2026-10-09)
- Ship playable builds early and often; the owner's own gameplay feedback outranks AI reviewer scores.
- Lean review: after a piece's first two-reviewer review, fixes are verified by targeted gameplay tests (and at most one targeted re-check), not repeated full review rounds.
- Critical first: every game must complete without freezing, crashing or getting stuck (UNFOLLOW first) on phone and desktop, keeping existing functionality, animations and finales unless an improvement is required.
- One workflow at a time (release fixes, then Pilot A); switch only at safe checkpoints.
- Pilot A needs the owner's personal approval of its creative quality before its design is scaled to other games.
- Goal: every game worth a ~A$10/week subscription — emotional value, entertainment, surprise and reasons to return.

## Founder master requirements (2026-10-09) — BINDING, highest precedence after the founder's own newer words
Read docs/founder/FOUNDER_REQUIREMENTS.md before any change. Immediate rules that override anything above where they differ:
- **Bubble text:** the user's text sits BELOW the picture but INSIDE the same circular bubble; never over the face; no black masks/boxes; full image visible (contain, no cropping of important parts); true circles; ≥5 visible bubbles in multi-bubble games.
- **Approved dopamine bursts are frozen:** "Don't change dopamine bursts, fix lag only." Optimise without changing look, choreography or impact; no letters or instructional text over the main burst; no black screen. Any change to an approved finale needs founder approval.
- **Input prompt:** "What emotion are you carrying?" with "Your thoughts are materialised to be released." No lengthy questionnaire before play; the user's actual words/images become the game objects.
- **Uploads:** + opens a small 6-slot popup above the + control; up to 6 images distributed evenly over 6 positions; no "UPLOADED IMAGE" label.
- **Console:** centred title; progress/score indicator before the sound toggle (top-right) and it never disappears; lightweight bottom-right feedback bubble for ~1-2 s that never covers game elements; one-screen mobile layout; keep Change Vibe, Vault/save, share, score/XP, sound, navigation, new thought, replay, image + mic.
- **Music:** Release uses the shared per-Bubble music URLs from Reset (Reset is the source of truth); do not duplicate assets.
- **Navigation:** "Let ThinkStill choose" + manual pick + switch mid-game cleanly (no leftover audio/animation); end: Again / New thought / contextual Try <game>; outside: previous / next / Try next game.
- **Vibes:** Jolly, Cheeky, Unfiltered shape reactions, feedback and copy beyond the first line.
- Game-specific historical corrections in Part 13 (RAIN OUT washout, X-RAY Kill/Burn All, SCRATCH real scratching, JUGGLE 3-click win, KEEP/DROP, VACUUM "Vacuum suck" one column, SHRED alignment, LOWER PLATFORM "Activate tool", HOT POTATO red->blue + user text below image, UNHOOK one hook + three strings, …) are regression requirements.
- Never claim sound or real-device testing that did not happen.
- **2026-10-09 (founder, newest):** dopamine bursts must be DIFFERENT for different games so users never get bored. Where several games currently share the same burst, each gets its own burst built from its mechanic and world (this differentiation is founder-authorised). A burst that is already unique to its game and approved keeps its look (lag fixes only).
- **2026-10-09 (founder, newest):** every tool must look and feel REAL. The STOMP boot must look like an actual boot when activated; likewise the hammer, shredder, vacuum, slingshot, scratch tool, hook, knob, lever, net, magnet, scissors, eraser, fire, water and every other tool: real silhouette, material, weight, motion and sound, not an abstract shape or a labelled pill.
- **2026-10-09 (founder, newest): REDESIGN AUTHORISED.** "Redesign the games if you need to, but I want viral, addictive games to keep users hooked." Any game may get a new mechanic, world, character role and finale when its current design is basic, a reskin, or not compelling. Healthy-hook design rules for every (re)design: an instantly readable 2-second premise; a satisfying core action with juice on every touch; escalation and a surprise twist; a unique, shareable finale moment; variation so replays differ (new arrangements, character reactions, rare surprises); light mastery (combo, perfect timing, secret moves); collectibles/streaks that reward without punishing. Never use manipulative pressure on vulnerable users (no guilt, no loss-aversion, no endless loops without an exit). Keep the platform features (progress, sound, navigation, user words/images as the game objects, arrows, safety). The founder approves the Pilot A benchmark before redesigns are scaled.
- **2026-10-09 MANDATORY (founder):** default emotional bubble pictures everywhere (F8 in docs/founder/FEEDBACK_LOG.md): no upload → ThinkStill's emotional bubble pictures automatically (expressions by emotion + progress, negative → positive); uploads replace them with the six-image distribution; removal restores defaults; circular, full image, text below inside the bubble, no black masks; ONE shared component for all games. Never an empty emotional bubble.
- **2026-10-09 (founder): THE CINEMATIC GAME REDESIGN DIRECTIVE** — docs/founder/CINEMATIC_REDESIGN_DIRECTIVE.md is binding for Pilot A and every redesign: own visual identity and world per game, characters as animated performers with distinct personalities (eyes follow objects, anticipation, comic reactions, finale participation), physical game feel (elasticity, tension, momentum, deformation, chain reactions), hypnotic but not overwhelming immersion, surprises and humour, truly different core interaction per game, shareable moments (private content only with explicit permission), 60 FPS on mobile, and the 10-question final quality challenge (§14) as the gate before showing a game to the founder. Approved dopamine bursts stay unless the founder approves a change.
- **2026-10-09 (founder decision, option a): FINALE STRUCTURE.** Every game's finale = (1) its OWN unique cinematic climax, designed from its mechanic, world and characters (no text over it), THEN (2) the approved dopamine burst, kept EXACTLY as it is (lag fixes only) as the final beat, THEN (3) the end screen. Never alter, replace or overlay the approved burst; the unique climax must hand off to it seamlessly (no black frame, no double sound) and the whole sequence must stay lag-free on mobile.
