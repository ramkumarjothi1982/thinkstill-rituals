# ThinkStill Reflect — Technical Architecture (three launch rituals)

Reflect is a console of multiplayer reflection rituals. This document covers how the three launch rituals (Shadow
Monsters, The Glorious Mess Auction, Emotional Rollercoaster) are built,
how rooms keep private answers private, and how one TypeScript codebase ships to Framer, a claude.ai artifact and a
Cloudflare Worker.

## Source layout (`games/reflect/`)

| Path | What it is |
|---|---|
| `src/room/protocol.ts` | The typed room protocol: players, the per-player `RoomView`, client intents (`hello`, `act`), server messages, limits. |
| `src/room/core.ts` | `RoomCore`, the authority. Pure logic, no I/O. Host-only controls, validation through the ritual's rules, sealed submissions, dedupe by action id, rejoin by token, spectators, companions, live events, consent, reveal. |
| `src/room/hub.ts` | `RoomHub`: one core plus its live connections. The same hub runs in the Durable Object, the dev server, the artifact host and solo play. |
| `src/room/ritual.ts` | The `RitualLogic` contract each ritual implements (setup, validateSeal, companionSeal, validateLive with the server clock, onLive to keep live state in the room, onReveal) and seeded randomness. |
| `src/net/client.ts` | `RoomClient` plus transports: `LocalTransport` (in-page, solo) and `WsTransport` (room server, reconnect + re-send). The room clock is estimated from the best sample of the last 45 s plus round-trip-corrected pings, so a busy page never runs the show late. |
| `src/net/artifact.ts` | Live rooms inside a claude.ai artifact over its `room` capability: the host's browser runs the hub; each guest talks to the host end-to-end encrypted (ECDH P-256 → AES-GCM), chunked under the 4 KiB event limit, with periodic re-sends. |
| `src/server/worker.ts` | Cloudflare Worker + `ReflectRoom` Durable Object (hibernation API, origin allow-list, snapshot persistence). |
| `src/server/dev-server.ts` | Node server for development and two-device tests: static files, Bubble art and rooms on one port. |
| `src/console/` | The console: hub of rituals, instant solo play, invites, lobby, top bar, sound/theme, all inside a shadow root. `types.ts` is the scene contract. |
| `src/gfx/projector.ts` | A small 3D projector for canvas: cameras (yaw/pitch/roll, any pitch so loops work), painter's draw list, billboards, unprojection onto a plane (dragging things along the table), principal-point zoom. |
| `src/actor/faces.ts` | Bubble expression art (700 images, named moods), Reset's shared avatars when present. |
| `src/actor/bubble.ts` | `BubbleActor`: the shared character rig — spring physics (squash, stretch, hops, wobble), faint/recover, shiver, speech and thought bubbles with pictograms, particles (tears, hearts, confetti, sweat), and `emote()` reactions with timing. |
| `src/actor/babble.ts` | Bubble voices: wordless "Bubble-speak" synthesised per character (pitch, waveform, vowel formants, wobble); screams, sobs, giggles, gasps, a quack. No speech engine, no AI. |
| `src/audio/synth.ts`, `src/audio/music.ts` | All sound synthesised with WebAudio (no files): effects, plus a small step sequencer for each ritual's score (minuet, dread organ, parade, music-box waltz…). |
| `src/rituals/<id>/` | One folder per ritual: `content.ts` (authored content), `logic.ts` (authoritative rules), renderers, `scene.ts` (the player's side), the show/auction/ride director, `style.ts`, `songs.ts`. |
| `tools/build-reflect.js` | esbuild build: `reflect.js` (IIFE), `dev-server.js`, `worker.js`, `--framer` → `ThinkStillReflect.tsx`, `--artifact` → artifact page + Bubble art. |
| `tests/` | Room and ritual-rule unit tests, per-ritual end-to-end runs with real pointer input (solo phone/desktop, two browsers), artifact live-room stand-in, Framer component smoke test, six-viewport layout check, render harnesses (monsters, portraits, ride). |

## Room authority and privacy

* Clients send intents only; the authority validates every action against the ritual's rules (`validateSeal`,
  `validateLive`) and replies with a **per-player view**.
* A sealed submission is stored in the authority's `secrets` and never appears in anyone's view until the reveal. Each
  player's own payload comes back as `view.mine` (so a rejoin restores it). Other players only see `sealed[pid] = true`.
* At the reveal the authority copies secrets into `revealed` and stamps `pub.revealAt`, so every device schedules the
  reveal from the same moment (the Shadow Show, the auction and the ride are all scheduled this way; live reactions,
  pulls, paddles and track switches land on the same frame for everyone).
* State that decides the outcome (a pulled light, a paddle going up or down) is written into the room state by
  `onLive`, so it never depends on the capped event log; the authority validates it against its own clock.
* Companions are seated players with `human: false`; they seal immediately by seeded, authored rules and are labelled
  "Bubble companion" everywhere their contribution appears.
* Rejoin: a token kept in `sessionStorage` (per tab, survives reload) restores the seat; the newest connection for a
  seat wins; late joiners watch as spectators and get a seat next round; the host can remove players or reveal
  without someone who has gone.
* Names are de-duplicated. No ritual asks anyone to type: contributions are objects, drawings, prices, paddles, tracks.

Where the authority runs:

| Surface | Authority | Privacy before the reveal |
|---|---|---|
| Framer + room server | Cloudflare Durable Object | Server-side: no other device ever receives a sealed payload. |
| Dev server (tests) | Node process | Same as above. |
| claude.ai artifact | The host's browser | Encrypted per guest; other guests cannot read it. The host device holds the room (like a console on the coffee table). |
| Solo | In-page hub | Only companions, nothing leaves the device. |

## The three rituals

| | Shadow Monsters | The Glorious Mess Auction | Emotional Rollercoaster |
|---|---|---|---|
| Engine | A lamp, a sheet and real shadow optics: each object's silhouette is projected from the bulb onto the sheet, so moving it towards the lamp magnifies it and softens its edge (`world.ts`, `objects.ts`) | Vector drawings stored as compact strokes with hand-drawn line boil; a velvet auction house and a marble museum painted on canvas (`portrait.ts`, `house.ts`) | Real track geometry per rider with physical timing per segment; a true-horizon sky so loops invert the world (`track.ts`, `ride.ts`, `editor.ts`) |
| Main verb | Build a monster from household objects and slide it towards the lamp; hold to pull the light back | Draw yourself blindfolded; hold your paddle up while the price climbs | Sculpt the track for each moment; ride it; jump onto a friend's track |
| Sealed payload | up to five objects (position, distance, turn) + optional name tag | strokes (face, hair, signature) + a secret estimate | five segments (height, module) |
| Live events | scream / laugh / hug; the maker's pull | paddle up / paddle down (kept in the room state) | switch to a friend's track at two junctions |
| Bubble companions | stagehands backstage; each brings its own authored monster; the audience | the auctioneer, the attendant and the collectors (each bids in character); each draws its own blind portrait | ride in character: their own faces, voices and pictograms; on-ride camera strip |
| Reflection | "Same stuff. More distance." — every monster at the lamp beside the things it was made of, ×N bigger | the estimates board: what each artist asked vs what it sold for, and what you (and your friends) held on for | the station: every track overlaid; where you diverged |
| Finale | the shadow parade, scattered by a duck into a flock of birds at sunrise | the Museum of Glorious Messes; your price tag under glass | one shared loop, on-ride photo |

## Builds

* `node games/reflect/tools/build-reflect.js --framer --artifact [--harness] [--ref <sha>] [--artifact-url <url>]` (`--harness` adds the render test pages)
* **Framer:** `games/framer/ThinkStillReflect.tsx` embeds the whole bundle (no other files). Property controls: Room
  Server (wss URL of the Worker; without it solo play still works), Asset Base, Theme, Sound, Motion, Radius, onExit,
  onComplete. Invite links use `?reflectRoom=CODE`.
* **Artifact:** `dist/artifact/` (page + `reflect.js` + the Bubble art it uses). Capabilities: `room` with topics
  `rf.c`/`rf.s` opened to Contributors, and `downloads` for share cards. Invite links use `#r-CODE`.
* **Room server:** `dist/worker.js` (ESM) with a `ReflectRoom` Durable Object binding; set `ALLOWED_ORIGINS` to the Framer
  site's origin(s).

## Not yet built (named honestly)

* Emotional Rollercoaster's optional "our own day" (the host naming five real moments): the rules accept it
  (`cleanMoments` in `setup`), the lobby UI to enter it is not built yet.
* The other 27 launch rituals (after approval of these three).
