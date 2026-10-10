# ThinkStill Reflect — Gate B evidence for the three hero pilots

Status: **built, tested, waiting for approval.** The other 27 rituals are not started.

* Playable build (claude.ai artifact, private to the owner until shared): https://claude.ai/artifact/6D2GwzmuRet2QFZqxm4AN7
* Evidence page (screens, videos, multiplayer checks, timing): https://claude.ai/artifact/4YpHu4EQD2hvZRhSev2vP4
* Framer component: `games/framer/ThinkStillReflect.tsx` (one self-contained file)
* Source: `games/reflect/` — architecture in `docs/REFLECT_TECHNICAL_ARCHITECTURE.md`

| Pilot | Mood | Main verb | Finale |
|---|---|---|---|
| Group Think Glitch | mystery | scrub time + drag a magnifying light across your one camera | rewind, four-camera group photo, share card |
| Drama Dubbing Booth | comedy | drop lines on the exact frame, choose voice and face | synced premiere with seat reactions, director's cut, red carpet, poster |
| Emotional Rollercoaster | spectacle | sculpt five moments into track, then ride it | ride together, switch tracks at two junctions, one shared loop, on-ride photo |

## Two-browser multiplayer (dev room server, host on a phone viewport, guest on a desktop viewport)

| Pilot | Checks (all passed) |
|---|---|
| Group Think Glitch | guest joined; distinct names; host saw only "sealed"; host's view never held the guest's payload; guest got their own payload back; three payloads revealed together; identical reveal on both; live tap reached the host; consent synced; reload rejoined the same seat |
| Drama Dubbing Booth | guest landed in the right ritual; guest's cut hidden until the premiere; both on the same premiere schedule; guest's reaction reached the host |
| Emotional Rollercoaster | guest's track hidden until the ride; both on the same ride schedule; guest pulled the switch; host saw the guest jump tracks |

The artifact build's own live rooms (host-in-browser, encrypted per guest) were tested with two tabs over a stand-in for
the `room` capability; they have not yet been tried by two people in the real claude.ai viewer.

## Timing (headless Chromium, software rendering, shared cloud CPU)

| Run | Input → next frame p50 / p95 | Frame p50 / p95 | Gesture → sound p50 / p95 | Slowest interaction (Event Timing) |
|---|---|---|---|---|
| GTG phone | 15.8 / 26.3 ms | 16.7 / 33.4 ms | 44.6 / 79 ms | 136 ms |
| GTG desktop | 11 / 30.4 ms | 33.4 / 66.6 ms | 46.6 / 157.1 ms | 224 ms |
| DDB phone | 10.3 / 15 ms | 16.7 / 16.8 ms | 44.2 / 100.2 ms | 80 ms |
| DDB desktop | 5.8 / 14.9 ms | 16.7 / 33.4 ms | 44.1 / 212 ms | 96 ms |
| ER phone | 3.8 / 13.3 ms | 16.7 / 16.8 ms | 44.7 / 59.7 ms | 80 ms |
| ER desktop | 5.4 / 9.1 ms | 16.7 / 16.8 ms | 49.1 / 68.5 ms | 128 ms |

Sound latency = time from the gesture to the sound being scheduled plus the audio context's reported output latency;
only sounds that answer a gesture directly (under 250 ms) count. Group Think Glitch on a 1280 × 860 software-rendered
canvas runs at about 30 fps here; real devices paint on the GPU. Real-device numbers still need measuring.

## Test checklist

- [x] Room authority unit tests — 14 cases (host-only start, companions, sealed privacy, dedupe, rejoin, invalid evidence, reveal, spectators, replay)
- [x] Each pilot end to end, solo with Bubble companions, at 390 × 844 and 1280 × 860 (hook → play → seal → reveal → finale)
- [x] Each pilot with two separate browsers on the room server
- [x] Artifact live rooms with two tabs over a stand-in for the room capability
- [x] Framer component in a desktop-width window: a dark and a bright phone-sized instance, all three pilots start inside it, play in one without touching the other, unmount/remount, static canvas poster, property controls; the dubbing drag card stays under the pointer inside a transformed wrapper
- [x] Sizes follow the frame, not the browser window (container units and queries), so a phone-sized component on a desktop page lays out as a phone
- [x] Six viewport sizes per pilot (360 × 780 to 1440 × 900): no sideways scroll, controls on screen and clear of the top bar, primary targets ≥ 44 px
- [x] Group Think Glitch sightlines (`tests/occlusion.py`, 181 moments per camera): doorway 0 frames and phone 0 frames with the cat; balcony and DJ booth 181 of 181
- [x] `tsc --noEmit` clean

## Known gaps (named, not hidden)

- Emotional Rollercoaster's optional "our own day" (the host names five real moments): the rules accept it, the lobby screen to enter it is not built.
- Screenshots and videos show fallback fonts (the test machine cannot reach Google Fonts); real devices load the intended faces.
- Framer invites need the room server (`games/reflect/dist/worker.js`) deployed to Cloudflare; solo play works without it.
- In the artifact build the host's browser holds the room, so the host device is where sealed answers live until the reveal.

## How to reproduce

```
node games/reflect/tools/build-reflect.js --framer --artifact --harness
cd games/reflect && NODE_PATH=/opt/npm-tools/node_modules node dist/dev-server.js 8790 --static=dist/dev --img=../../bubble-expressions
python3 tests/evidence.py run gtg http://127.0.0.1:8790 <out>   # also ddb, er
python3 tests/evidence.py pack <out>
python3 tests/occlusion.py http://127.0.0.1:8790 <out>/sightlines.json
python3 tests/framer_smoke.py http://127.0.0.1:8790 <out>/framer
python3 tests/sizes.py http://127.0.0.1:8790 <out>/sizes
```
