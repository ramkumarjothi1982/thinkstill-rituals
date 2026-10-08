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
