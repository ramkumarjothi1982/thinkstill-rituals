# Workstream world-raindrop-lagoon: Blubi's Raindrop Lagoon

> **Integrated 16 Oct 2026 (ws-worlds, owner-approved).** The lagoon is in `registry.js` `WORLDS` as PLAYABLE, `calm: false` (as recommended below), `next: ['sunpop-orchard']`, no `final`. Its entry lives in registry.js and `worlds/raindrop-lagoon.js` re-exports it; the lab hook is gone. The notes below are the workstream's, as written before integration.

Hushflow world 6 (`raindrop-lagoon`). It is **lab-only**: it is not in `WORLDS`, and its status is `IN_PROGRESS`, never `DEV`. It teaches the Memory Garden skill `name-it` ("Putting a feeling into words can make it easier to hold.").

## What it is
Soft rain falls over Blubi's realm, a blue-hour lagoon with its cushion stage and hanging glass beads. Frosted *feeling drops* hang round the person's Thought Mallow.

**Touch.** It is about *looking*, not the storm's pace or the ocean's carrying:
- **Hold a drop still** and it swells and clears, and its word surfaces. Moving fogs it again until the word has come fully clear once.
- **Carry it to the thought** and let go: it falls in with a plink, and the tag under the thought reads "This is… worry".
- **A second word** sits beside the first. A third takes the oldest one's place, and that drop floats back up.
- **Tap a word on the tag** to give it back.
- **Tap alternative:** tap a drop and it clears by itself, then tap the thought or the word to give it.
- **Water** only rings. It is play, never progress.

**Feeling words:** five per chosen feeling, plus "unsure" always. "Unsure" counts: it says its own line ("“Unsure” counts too."), and the discovery waits for a word.

**Discoveries:**
- `named` (offers `name-it`): "You gave it a word." / "It has a name now." / "Sometimes that makes it a little easier to hold."
- `both` (offer: false): "Two at once." / "Side by side is allowed."

**Completion:** a word given and kept, then 8 s of quiet with it, after at least 25 s of play and 2 s idle. The rain then turns to light (the realm's transform). It stays playable, ending with "Stay as long as you like." and Finish. The entry has `final: true`.

**Handover:**
- **In:** the Thought Mallow glides from `handoff.thought`. Photos glide in from `handoff.photos` and become glass drops (`photos.draw` shape `drop`), and the drops condense one by one.
- **Out:** `handoff()` returns the thought, the photo drops, the horizon (0.6 H) and the palette.
- **Reduced motion:** the thought fades out where it was and in at home.

**Gentle session:**
- quiet lines, no quips;
- the director already sends no offers;
- Blubi's mix has no `happy`/`loved`, keeps `comforted` ≤ 0.2, and reacts only with `nod`;
- stand-in Mallow cards become plain lights.

**Reduced motion:** no sway, bob, arcs or spreading rings; slow, sparse rain.

**Also:**
- **Text size:** the tag and the word pill follow `--type-scale`.
- **Layout:** the subtitle band, the hero and the person's words are never covered.
- **Saves:** ids and numbers only (vocabulary indices).
- **Network:** nothing goes off the device.

## Files
- `src/hushfold/flow/worlds/raindrop-lagoon.js`: the world, its design note, and the exported registry entry `RAINDROP_LAGOON` (every `REQUIRED_FIELDS` field plus `fits`, `calm: false`, `final: true`, `next`, `load`).
- `src/hushfold/flow/worlds/raindrop-lagoon-core.js`: the pure core (`VOCAB`, `feelingWords`, `planLagoon`, `createFocus`, `createNaming`, `createNamingDetector`, `createLagoonProgress`).
- `tests/raindrop-lagoon.test.mjs`: 14 tests:
  - the entry, words, layout on 8 screens and focus;
  - naming, discoveries and progress;
  - headless director runs: the full play, the tap path, gentle plus reduced motion plus low stimulation at 320×568, the melt in from the ocean, the review regressions, and the tag box.
- `src/hushfold/flow/lab.js`: a three-line hook. The lab registry gets a PLAYABLE copy only when it is asked for by id (`?hushflow=raindrop-lagoon`, or `&next=raindrop-lagoon` for a melt test).

## Results
- **Lagoon tests:** 14/14 pass.
- **Full suite** (`node --test hushmallow/tests/*.test.mjs`):
  - before the review: 1118/1118 pass;
  - final run (683817a, the final world code): 1121/1121 pass.
- **Chromium lab, from melt-in or cold start to completion and Finish, no console errors:**
  - 390×844, 360×780 and 320×568, each at normal and largest text (`textScale` 1.25);
  - reduced motion;
  - melts in from the storm and from the ocean;
  - 0, 3 and 7 photos.
- **Frame times:** this machine has no GPU (SwiftShader), so whole-page fps is low for every world: the shipped ocean gets about 29 fps unthrottled here. The world's own `frame()` cost:

  | World | Unthrottled (mean / p95) | 4× CPU throttle (mean / p95) |
  |---|---|---|
  | Lagoon | 1.1 / 1.8 ms | about 5–6 ms / 12–17 ms |
  | Ocean | 3.4 ms | 16–20 ms |
  | Storm | 32 ms | 157 ms |

  - One loop (the director's), no timers, no large per-frame allocations.
- **Screenshot notes:**
  - The lagoon sits well beside the storm and the ocean.
  - At 320×568 the thought sits left with the tag beside it, and on the smallest screen there are four drops (three words plus "unsure").
  - At 360×780 the drops hang beside the hero rather than round the thought, because the plate is wide.

## Independent review (adversarial subagent, 3 rounds)
**Round 1: not ready.** It found 2 High, 1 Medium-High and 4 Medium issues. All are fixed:
- (High) A drop held during a relayout was orphaned, so the lagoon could never complete. Each word now keeps its own drop object across new slots.
- (High) At 320×568 with largest text the person's words were cut short. The planner now tries a one-row tag and a smaller thought, and lets the plate slide in from a side, before ever cutting the words.
- (Medium-High) The word pill could cover the person's words. It now tries 9 spots and is hidden rather than drawn on the plate.
- (Medium) No photos on small screens. Smaller photo drops now fit.
- (Medium) The `named` line was untrue for "unsure". "Unsure" now has its own line.
- (Medium) A resting finger on the tag could name a word. There is no pull-in from the thought, plate or tag, and a pulled drop is only given if carried.
- (Medium-Low) A word could be given before it could be read. A tap-give now needs the pill shown.
- Also fixed:
  - a three-row tag overflowed its box;
  - tag tap targets were under 44 px, and the second row's word was unreachable;
  - the empty tag had low contrast;
  - quiet time carried over after a word was given back;
  - water touches counted as progress;
  - the thought jumped on relayout;
  - Blubi still smiled in a gentle session;
  - the drops' light was untinted.

**Round 2:**
- (Medium-High, a regression from the tag change) A one-row tag with two long words grew over the thought. The tag is now bounded to its reserved box.
- (Medium) Still no photos at 320×568 in the live lab. A third photo-drop size (28 px, 52 px touch target) with tighter clearance fixed it.

**Round 3: "ready to integrate"**, with no Medium-or-worse findings left. The Low items it left open:
- the 28 px photo drops are small;
- a two-long-word tag shrinks to about 13 px type at 320×568;
- a one-row tag drops "This is…";
- the word pill can sit over Blubi's face on small screens.

Known limits:
- On a phone on its side (844×390) the words plate can't be planned beside the hero, so the handle places its words itself.
- `ctx.keepOut()` is not honoured. The ocean doesn't honour it either.

## For the coordinator (integration)
1. In `registry.js`, add the entry:
   - `import { RAINDROP_LAGOON } from './worlds/raindrop-lagoon.js'` would pull the world code in eagerly, so copy the object literal instead;
   - set `status: STATUS.PLAYABLE`;
   - set `load: () => import('./worlds/raindrop-lagoon.js')`;
   - append it to `WORLDS` in the agreed order (after Moonmilk Cove).
2. Sequence links:
   - set Moonmilk Cove's `next` to `['raindrop-lagoon']`;
   - when Sunpop Orchard exists, set the lagoon's `next: ['sunpop-orchard']` and drop `final: true`;
   - drop the ocean's `final` once its successor exists, as its own comment says.
3. Decide `calm`: it is `false` here because skills.js's care note says to "skip it if naming the feeling makes things feel heavier right now", so a gentle session never auto-plays it. Setting it to `true` would let gentle sessions reach it.
4. Delete the lab hook lines (`RAINDROP_LAGOON` import and `LAB`) from `lab.js` once the entry is in `WORLDS`, or keep the pattern for later worlds.
5. Expect `tests/flow.test.mjs` assertions that count or select between only two worlds to need updating, as for any new world.
6. Shell (`hushfold.js`): the hero for this world is `blubi`. The 'host' event at the melt midpoint already carries it. Nothing else is needed.
