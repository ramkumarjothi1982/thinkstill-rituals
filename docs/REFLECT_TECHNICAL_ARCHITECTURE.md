# ThinkStill Reflect — Technical Architecture (Gate B pilots)

Reflect is a console of multiplayer reflection rituals. This document covers how the three hero pilots are built,
how rooms keep private answers private, and how one TypeScript codebase ships to Framer, a claude.ai artifact and a
Cloudflare Worker.

## Source layout (`games/reflect/`)

| Path | What it is |
|---|---|
| `src/room/protocol.ts` | The typed room protocol: players, the per-player `RoomView`, client intents (`hello`, `act`), server messages, limits. |
| `src/room/core.ts` | `RoomCore`, the authority. Pure logic, no I/O. Host-only controls, validation through the ritual's rules, sealed submissions, dedupe by action id, rejoin by token, spectators, companions, live events, consent, reveal. |
| `src/room/hub.ts` | `RoomHub`: one core plus its live connections. The same hub runs in the Durable Object, the dev server, the artifact host and solo play. |
| `src/room/ritual.ts` | The `RitualLogic` contract each ritual implements (setup, validateSeal, companionSeal, validateLive, onReveal) and seeded randomness. |
| `src/net/client.ts` | `RoomClient` plus transports: `LocalTransport` (in-page, solo) and `WsTransport` (room server, reconnect + re-send). |
| `src/net/artifact.ts` | Live rooms inside a claude.ai artifact over its `room` capability: the host's browser runs the hub; each guest talks to the host end-to-end encrypted (ECDH P-256 → AES-GCM), chunked under the 4 KiB event limit, with periodic re-sends. |
| `src/server/worker.ts` | Cloudflare Worker + `ReflectRoom` Durable Object (hibernation API, origin allow-list, snapshot persistence). |
| `src/server/dev-server.ts` | Node server for development and two-device tests: static files, Bubble art and rooms on one port. |
| `src/console/` | The console: hub of rituals, instant solo play, invites, lobby, top bar, sound/theme, all inside a shadow root. `types.ts` is the scene contract. |
| `src/gfx/projector.ts` | A small 3D projector for canvas: cameras (yaw/pitch/roll, any pitch so loops work), painter's draw list, boxes, cylinders, billboards, floor decals, principal-point zoom (the GTG magnifier). |
| `src/actor/faces.ts` | Bubble expression art (700 images, named moods), Reset's shared avatars when present. |
| `src/audio/synth.ts` | All sound synthesised with WebAudio (no files): a shared vocabulary each ritual re-pitches, the rooftop party bed, gesture-to-sound latency samples. |
| `src/rituals/<id>/` | One folder per ritual: `content.ts` (authored content), `logic.ts` (authoritative rules), world/film/track renderers, `scene.ts` (the player's side), `reveal.ts` (reveal + finale), `style.ts`. |
| `tools/build-reflect.js` | esbuild build: `reflect.js` (IIFE), `dev-server.js`, `worker.js`, `--framer` → `ThinkStillReflect.tsx`, `--artifact` → artifact page + Bubble art. |
| `tests/` | Room unit tests, per-pilot end-to-end runs (solo phone/desktop, two browsers), artifact live-room test with a BroadcastChannel stand-in, Framer component smoke test, viewport layout check, sightline (occlusion) test, evidence packer. |

## Room authority and privacy

* Clients send intents only; the authority validates every action against the ritual's rules (`validateSeal`,
  `validateLive`) and replies with a **per-player view**.
* A sealed submission is stored in the authority's `secrets` and never appears in anyone's view until the reveal. Each
  player's own payload comes back as `view.mine` (so a rejoin restores it). Other players only see `sealed[pid] = true`.
* At the reveal the authority copies secrets into `revealed` and stamps `pub.revealAt`, so every device schedules the
  reveal from the same moment (Drama Dubbing Booth's premiere and the Emotional Rollercoaster ride are synchronised
  this way; live reactions and track switches land on the same frame for everyone).
* Companions are seated players with `human: false`; they seal immediately by seeded, authored rules and are labelled
  "Bubble companion" everywhere their contribution appears.
* Rejoin: a token kept in `sessionStorage` (per tab, survives reload) restores the seat; the newest connection for a
  seat wins; late joiners watch as spectators and get a seat next round; the host can remove players or reveal
  without someone who has gone.
* Names are de-duplicated; typed text (Dubbing Booth own lines, optional) is length-limited and filtered.

Where the authority runs:

| Surface | Authority | Privacy before the reveal |
|---|---|---|
| Framer + room server | Cloudflare Durable Object | Server-side: no other device ever receives a sealed payload. |
| Dev server (tests) | Node process | Same as above. |
| claude.ai artifact | The host's browser | Encrypted per guest; other guests cannot read it. The host device holds the room (like a console on the coffee table). |
| Solo | In-page hub | Only companions, nothing leaves the device. |

## The three pilots

| | Group Think Glitch | Drama Dubbing Booth | Emotional Rollercoaster |
|---|---|---|---|
| Engine | One deterministic 3D rooftop rendered through four camera rigs, a ceiling master and a crane hook (`world.ts`, `timeline.ts`) | A 12 s parallax short with four shots and hard cuts; faces and voices come from the dub (`film.ts`, `voice.ts`) | Real track geometry per rider with physical timing per segment; a true-horizon sky so loops invert the world (`track.ts`, `ride.ts`, `editor.ts`) |
| Main verb | Scrub time + drag the magnifying light | Drop a line on the exact frame + perform the face | Sculpt the track + ride it |
| Sealed payload | pins, suspect, sureness, search path | up to six cues (time, voice, line, tone, face, pitch, pace) | five segments (height, module) |
| Live events | "what surprised you" tags | Laugh / Gasp / Aww | switch to a friend's track at two junctions |
| Reveal | mosaic → cracks + verdict stamps → shards into the ceiling camera with everyone's search paths | premiere: title cards, synced cuts with voices, seat reactions → the same frame side by side | ride together → station: every track overlaid, divergence points |
| Finale | rewind, four-camera group photo, share card | director's cut grid, red carpet marquee, poster | one shared loop, on-ride photo |

Sightlines in Group Think Glitch are authored and tested: `tests/occlusion.ts` renders every camera with and without the
cat and counts the pixels that change, so the doorway and the phone (which must not see the cat) are checked frame by frame.

## Builds

* `node games/reflect/tools/build-reflect.js --framer --artifact [--ref <sha>] [--artifact-url <url>]`
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
* The other 27 launch rituals (after pilot approval).
