# Workstream: world-sunpop-orchard (Boppo's Sunpop Orchard, Hushflow world 7)

> **Integrated 16 Oct 2026 (ws-worlds, owner-approved).** The orchard is in `registry.js` `WORLDS` as PLAYABLE, `calm: false`, `next: []` and `final: true`: the last world ("Stay as long as you like" and Finish). Its entry lives in registry.js and `worlds/sunpop-orchard.js` re-exports it; the lab hook is gone. The notes below are the workstream's, as written before integration.

This world is lab-only. It is not in `WORLDS`, and its status is `playable`, not `dev`.
The lab URL is `index.html?hushflow=sunpop-orchard`.

## What I built

**The scene.** The person's Thought Mallow, with their words on a plate under it, sits on a swing. The swing hangs under an arbour of two sunpop trees, drawn over the Sunpop Orchard realm backdrop. Sunpops hang down both trees.

**The skill it teaches.** `kinder-voice`, "Talk to yourself the way you'd talk to a friend."

**How touch works.** The touch is about how long and how softly a finger rests. That makes it different from stirring the storm and carrying things in the ocean.
- **A gentle hold** on a sunpop warms it. A glowing ring fills around it and it ripens from lime to gold in 1.7 s, then stays cupped under the finger. When the finger lets go, the sunpop floats to the thought and becomes a light in a small crown round its head. Each light eases the thought's own tension a little. That is the only thing that eases it; it never calms by itself.
- **Holding still anywhere** warms the nearest sunpop more slowly, so nothing needs a precise target.
- **Quick pokes and swipes** only make sunpops wobble and shake a leaf loose. They are allowed and noticed, never punished, and ripeness never goes down.
- **Photo sunpops** show the photo in a round window. A gentle hold warms the photo from misty back to its own colours, and it sends a small light to the thought. At most three photos hang at once; the rest take turns.
- **A hand held still on the thought** warms it a little, capped.

**Discoveries.**
- `gentle-hands` fires when quick pokes made a sunpop wobble and then a gentle hold ripened that same sunpop. It offers nothing.
- `kinder` fires when three lights have reached the thought and it really softened. It offers A Kinder Voice.
- `kinder-light` is the same discovery when there are no words: the lights gather on an empty swing.

**Completion.** It completes when all of these hold:
- five sunpops given (or nine, without the discovery);
- at least 30 s of play;
- the `kinder` discovery;
- then 2 s with every finger lifted.

On completion it turns to golden hour with a rainbow. After that it stays playable ("Stay as long as you like", then Finish), and sunpops keep regrowing.

**Hand-overs.**
- **In:** the thought glides from where the last world left it to the swing, keeping its tension. Photos glide into their sunpops, and the rest grow in on their stems. With reduced motion it is a crossfade with everything in place.
- **Out:** `handoff()` gives the thought (x, y, scale, r, tension), the photos and the horizon (0.665 H).

**Gentle session.**
- It uses the gentle lines and has no quips.
- There are no faces on the sunpops.
- Boppo gets `happy: 0` and no hop.
- Stand-in Mallow cards are shown as plain sunpops.
- Its registry entry has `calm: false`, so a gentle session never picks it by itself.

**Reduced motion.**
- The swing doesn't sway and wobbles are damped.
- A given sunpop fades into the crown instead of flying there.
- The hint is still.

## Files (all new, apart from the lab hook)

- `src/hushfold/flow/worlds/sunpop-orchard.js`: the world, with a design note at the top, and `export const SUNPOP_ORCHARD`, the registry entry. The entry has every `REQUIRED_FIELDS` field plus `fits`, `calm`, `next: []` and `load`.
- `src/hushfold/flow/worlds/sunpop-orchard-rules.js`: the pure core.
  - `planOrchard`: the layout. It keeps the band clear and never places anything on the hero, the thought or its words. Every sunpop is at least a 48 px target.
  - Sunpop state, warmth, thought tension, the discoveries and progress.
- `src/hushfold/flow/worlds/sunpop-orchard-art.js`: sprites and the trees, painted once per layout and cut into a canopy band and two trunk strips.
- `tests/sunpop-orchard.test.mjs`: 19 tests covering the pure core, plus headless runs inside the director.
- `src/hushfold/flow/lab.js`: a 2-line hook (one import and one registry line) that adds it to the lab's registry only.

## Tests

- The orchard's own tests: 19 of 19 pass.
- The whole suite: 1122 of 1122 pass, before the final review-fix commits. After those, the orchard's tests were re-run and pass.

## Browser checks

All in Chromium, through the lab.

**Sizes.** 390x844, 360x780, 375x667 and 320x568, each including:
- long text;
- `--type-scale` 1.25;
- reduced motion with low stimulation.

On every one the layout was clean: nothing in the band, the words on screen, and at least 4 sunpops. At 320x568 the words take one wide line. Long words that would wrap to two lines may use the room kept for Boppo's hop, but never Boppo himself.

**Flows.**
- Melt in from the ocean, with normal and reduced motion.
- Melt out to the storm.
- Five gifts, then the offer, then golden hour, then Finish.

**Console.** No errors.

**Frame times.** These are from headless Chromium using SwiftShader software rendering at device scale 2, so the absolute numbers are low for every world. Compare the worlds with each other rather than with the targets.

| World | 1x CPU | 4x CPU throttle |
|---|---|---|
| Orchard | 42 fps | 9 fps |
| Ocean | 51 fps | 11 fps |
| Storm | 28 fps | 7 fps |

- With the lowest quality level (q=3), the orchard runs at 60 fps at 1x and 15 fps at 4x.
- The world's own JS takes about 0.3–0.4 ms per frame.
- The rest of the cost is rasterising the realm backdrop and the front layer.

## Independent review

An adversarial subagent reviewed the work. Its first-round verdict was "solid, close to shippable".

Fixed:
- **High.** With W2's ThoughtLayer drawing the words, the plan placed the words plate higher than the layer really hangs it. The plan now reserves the layer's offset (`P.below`).
- **Medium.** The thought could calm by itself after `setThought(null)` and then the same handle again. Each handle now keeps its own starting tension, and lights given to an empty swing don't count for it.
- **Medium.** The `gentle-hands` line wasn't literally true. It now requires the very sunpop that was poked to be the one that ripened.
- **Medium.** Subtitles sat over bright foliage. The canopy behind the band is now darker and quieter.
- **Low.** The hint is now drawn under the thought.
- **Low.** Pausing or cancelling a touch no longer gives a cupped sunpop away. It goes back on its stem, ripe.
- **Low.** In a gentle session, the stand-in Mallow cards are plain sunpops.
- **Low.** A world melting away no longer steers the incoming host.
- **Low.** A layer-drawn thought's opacity now follows the fade-in.
- **Low.** Some per-frame allocation was removed.
- **Low.** A restored handle's starting tension is now recorded.

The re-check confirmed all the High and Medium findings fixed and found nothing broken.

Left as known Lows:
- A re-plan maps sunpops to new places by index, so one can glide across the middle when the screen rotates.
- In landscape (beside layout), the swing's ropes hang from no bough.

## For the coordinator

1. **Add the world.** In `registry.js`, import or copy `SUNPOP_ORCHARD` from `worlds/sunpop-orchard.js` (`load` already points at that file) and add it to `WORLDS`. If it is copied, keep `load: () => import('./worlds/sunpop-orchard.js')`.
2. **Link it into the sequence.**
   - Set the Raindrop Lagoon's `next: ['sunpop-orchard']`.
   - Drop the ocean's `final: true` when it is no longer the last world.
   - Decide `final` and `next` for the orchard. It is currently `next: []` with no `final`.
3. **Lab hook.** Remove the lab hook in `lab.js` (the import, and `...(WORLDS.some(...) ? [] : [SUNPOP_ORCHARD])`) once it is in `WORLDS`. The hook skips itself if the world is already listed.
4. **Mallow and skill.** The world's Mallow is `boppo` and its Memory Garden skill is `kinder-voice`. Both already match `skills.js`.
5. **Check with the real ThoughtLayer.** The lab only ever runs the placeholder thought, so verify the words plate under the swing with W2's real ThoughtLayer. A node test covers the `P.below` offset with a fake layer.
