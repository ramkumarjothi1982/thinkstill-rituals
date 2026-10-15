# Workstream world-moonmilk-cove — Noomi's Moonmilk Cove (Hushflow world 5, lab-only)

## What I built
This world teaches the Memory Garden skill `permission-to-rest`: "Rest can be a valid response, even with things left to do."

It reuses the moonmilk-cove realm as its back layer. On top of that it draws the moon's phase, the moonmilk pools and ribbons, the shells, the lanterns and the Thought Mallow's crescent cradle. The design note is at the top of the world file.

**Touch (deliberately unlike the storm's pace or the ocean's carrying):**
- **Resting a finger still, anywhere.** A pool of moonmilk blooms under it, with slow breath rings. The cove hushes within a moment, and Noomi's moon fills from a crescent to full.
- **Doing nothing after the first touch.** This counts as rest too, once 3 s pass with no touch.
- **Moving.** Draws moonmilk ribbons that marble and dissolve. The tide gets a little busier. Rest pauses but is never taken away.
- **Tapping a conch shell** (a "thing left to do"): it hops and chimes.
- **Tapping a lantern** (a photo): it glows warmer and bobs.
- **Resting a finger on the Thought Mallow:** it rests too. Its cradle rocks slower and its tension eases. The thought is never hidden or sunk.

**Discoveries:**
- `rest`: 15 s of unbroken rest → "You rested. / The shells are still there. / And that was allowed." This offers Permission to Rest.
- `waited`: a shell tapped after real rest → "Still there. / It waited for you." This one is `offer: false`.

**Completion:** 60 s of rest in all (a full moon), then 1.2 s with no finger moving. The tide then stills to a mirror and an aurora unfurls. The world stays playable afterwards; the line is "A full moon of rest. Stay as long as you like." (`final: true` until Raindrop Lagoon exists).

**Gentle session:**
- no pings, and no talk of tasks;
- no quips;
- no Mallow face changes or yawns;
- plain lanterns for the stand-in Mallow cards;
- the director offers nothing.

**Reduced motion:**
- no rocking, bobbing, marbling, rising motes or expanding rings;
- the glows only brighten and dim;
- glides become fades.

**Hand-over:**
- **In:** the thought glides from where the last world showed it into its cradle (a fade under reduced motion), and its words fade in once it is at rest. Postcards and bubbles glide into lanterns.
- **Out:** `handoff()` gives the thought, the lanterns and the horizon.

## Files (all new, except the one-line lab hook)
- `hushmallow/src/hushfold/flow/worlds/moonmilk-cove.js`: the world, plus the exported registry entry `MOONMILK_COVE` (every REQUIRED_FIELDS field, `fits`, `calm: true`, `next: []`, `final: true`, `load`). Its `status` is `IN_PROGRESS`: not playable in production and never DEV.
- `hushmallow/src/hushfold/flow/worlds/moonmilk-cove-rules.js`: the pure core.
  - `planCove`: the screen plan (band, hero, words, shells, lanterns, the side panel).
    - It keeps a 56 px bottom strip free for the shell's controls.
    - Words go above, below, or beside the thought (left or right), or on one wide line on short landscape screens.
  - The rest meter, the two discoveries and completion.
  - `moonShadow`: lit area = 0.12 + 0.88·p.
  - `tideBusy`.
- `hushmallow/tests/moonmilk-cove.test.mjs`: 13 tests.
  - The plan at 7 sizes, normal and largest text, plus the tiny landscape windows (568x320 and 667x375 at the largest text).
  - The rest meter, the discoveries, completion and the moon.
  - The entry's contract.
  - Headless runs in the director: a full rest to completion, gentle and thought rest, a storm → cove melt with and without reduced motion, and resize.
- `hushmallow/src/hushfold/flow/lab.js`: a `LAB_WORLDS` map. The lab plays the cove as PLAYABLE from its own list:
  - `?hushflow=moonmilk-cove`
  - or melt into it with `?hushflow=static-storm&next=moonmilk-cove` (also `luminous-ocean`), then call `director.next({worldId:'moonmilk-cove'})`.

## Tests
- `node --test hushmallow/tests/moonmilk-cove.test.mjs`: 13 of 13 pass.
- Whole suite `node --test hushmallow/tests/*.test.mjs`: 1120 of 1120 pass on the final commit (exit 0).

## Browser checks (Chromium, lab, CDP touch, dpr 2–2.5)
- **Sizes:** 390x844, 360x780 and 320x568, each at normal and largest text (textScale 1.25), plus 844x390, 568x320 at largest text, and reduced motion.
- **Paths:**
  - melt-in from the storm;
  - a full rest from crescent to full moon, the discovery, the offer, then completion and "Stay as long as you like";
  - Finish is the shell's or panel's, unchanged.
- **No console errors.**
- **Screenshots:**
  - The words plate always sits clear of the band and the hero.
  - At 568x320 with the largest text, nothing is fully clear. The words go to the right of the thought, in the open bottom-right sand, clear of the replay chip. At most the plate's padding touches the edge of the hero's box; the letters never do.
  - Shells sit on the sand beside the hero with 44 px or larger targets.
  - Lanterns sit on the water.
  - The moon reads as a crescent filling up.

## Frame times
Measured on this machine, which renders in software (headless SwiftShader). Absolute frame intervals are slow for every world, so the comparison between worlds is what matters.

The world's own `frame()` at 390x844, dpr 2.5, with 7 photos, resting and then stroking:

| CPU throttle | avg | p90 |
|---|---|---|
| 1× | 1.17 ms | 1.5 ms |
| 4× | 6.1 ms | 9.1 ms |

The realm draw is about half of that. The reviewer measured 5.9 ms avg at 4× with four fingers scribbling; on the same harness the storm took 133 ms and the ocean 39 ms. Whole-page frame interval:

| World | avg frame interval |
|---|---|
| Cove | 38.8 ms |
| Ocean | 32.5 ms |
| Storm | 83.4 ms |

There is one loop: the director's. Nothing large is allocated per frame. Sprites are cached, and the plain lanterns are blitted from a cache.

## Independent review (adversarial subagent)
**Round 1: not ready.** Findings, and what I did:
- **High: the hint and its line never appeared at 390x844 and at 320x568 with large text.** Fixed:
  - placeHint falls back to a smaller spot, then to the thought's cradle;
  - the line is always said.
- **High: at 568x320 with large text, the words covered the hero and no lantern was shown.** Fixed:
  - a least-overlap fallback (the words are weighted ×4);
  - at least one 30 px lantern whenever there are photos.
- **Medium: the moon was about 94 % lit at half time, so "Half a moon." was untrue.** Fixed: the moon is now mapped by lit area, and a test pins it.
- **Medium: a resize left fingers pointing at dead pools and ribbons.** Fixed.
- **Medium: the gentle plain-lantern cache thrashed during glides.** Fixed: the size is quantised to 8 px.
- **Low (fixed):**
  - reduced motion still had motes and rings;
  - a finger held down through a pause was ignored afterwards;
  - the conchs read like the realm's scallops (they now have a warm ground ring);
  - `setThought` left the old handle's opacity as it was.
- **Low (open):**
  - `ctx.keepOut()` is not read (the ocean doesn't read it either);
  - the moon's dark side draws over the clouds crossing it.

**Round 2: one Medium.** In short landscape at the largest text, the words sat in the bottom strip where the shell's replay chip appears. Fixed:
- a 56 px bottom strip reserved in the plan;
- words beside the thought, or on one wide line;
- a fallback that ranks keeping the letters off the hero above everything else.

**Round 3: one Medium.** At 568x320 the chip still covered the words. Fixed: the fallback now reserves only the chip's bottom-left corner, and the plate stays inside the edge margin.

**Round 4: ready to integrate, with no Medium or worse left.** Low items still open:
- one shell's touch area can sit partly under the replay chip at 568x320;
- `keepOut` is not read;
- the moon's shadow draws over the clouds.

## For the coordinator (integration)
1. Add `MOONMILK_COVE` to `WORLDS` in `src/hushfold/flow/registry.js` with `status: STATUS.PLAYABLE` (never DEV):
   ```js
   import { MOONMILK_COVE } from './worlds/moonmilk-cove.js'; // or move the entry object into registry.js
   export const WORLDS = Object.freeze([STATIC_STORM, LUMINOUS_OCEAN, /* worlds 3, 4 */ { ...MOONMILK_COVE, status: STATUS.PLAYABLE }]);
   ```
   - Moving the entry object into registry.js avoids registry.js statically importing world code.
   - Link the sequence: set the previous world's `next: ['moonmilk-cove']`. Drop `final` from the world before the cove; the ocean's `final` comment says this is to happen once a third world exists.
   - Then remove the lab's `LAB_WORLDS` entry.
2. The cove is `calm: true`, so a gentle session may pick it. Its gentle lines never mention tasks.
3. `src/app/scenes/hushfold.js` needs no change. The shell swaps the host to `noomi` at the melt's `host` event, as it does for the others.
4. Optional follow-ups:
   - read `ctx.keepOut()` (the storm's `keepThoughtIn` pattern);
   - a discovery-lines variant for gentle sessions in the director, if wanted.
