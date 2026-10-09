# game-pop progress (POP id 1, "Balloon Morning")

- [x] Read spec §0-§2, §3.0-3.1, §4-5; systems.done notes; 71_pilot_fx API (Actor, Stage, Finale, Sound, Gesture, Box); 79 demo; BEFORE sheet 1.
- [ ] Write src/pilot/72_pilot_pop.jsx (EosPilotPopEngine / EosPilotPopInner / EOS_PILOT_POP / EOS_PILOT_POP_CSS, eosPilotRegister(1,...))
- [ ] Build /tmp/pilot_pop, play at 390 (scripted + finishGame), 1280; contact sheets
- [ ] Iterate; commit 72_pilot_pop.jsx + status/game-pop.*; push

Design decisions so far:
- Bubble = button (position via `translate`, CSS transition for the 600 ms re-balance) > sway node (CSS loop rotating about the hero's hand point, so the tether end stays on the hand) > swing node (WAAPI neighbour swings / miss wobble, same origin) > tether (anchored at the hand, rotated toward the bubble base) + film body + iridescent rim + word.
- Per-hit text (counter pill) is an attribute shown by ::after.
- Pop FX pools owned by POP: 2 rings, 4 glyph shards, 8 hanging droplets, 3 glints; droplets from the sky kit pool (16).

## Update (call ~45)
- 72_pilot_pop.jsx written and registered; plays to the reveal at 390 with 0 page errors; progress 0→33→67→96→100 (100 at hand-off +1.3 s); sound log rows for every cue.
- Fixes so far: double-handled pointerdown (bubble event bubbling to arena fin.tap); tether anchor moves by `translate` with the bubble's transition (string stays on the hand during re-balance); calm bubble stronger; POPPED pill top-left (top-right is covered by the shared companion orb); win face = closed-eye smile per character via the hero's seed (EOS_PILOT_POP.winFace); rainbow wedge replaced by a rainbow arch over the bubble (the wedge pointed off-screen).
- Environment: load 4-7 on 4 cores; screencast frames lag the timeline by up to ~1 s after the last pop (frame times are page-anchored via data-pop-t0).
- Known (not POP-owned): SYNC's calm face (E90, shared mapping) is a sleeping moon crescent — reads as night in the daytime sky.

## Done (call ~57)
- Rows separated (no overlapping films), reduced-motion run, ?pilot=off run, desktop run, finishGame 0 arrow misses. After sheet: status/game-pop.after.jpg. Report: status/game-pop.build.md. Committing 72_pilot_pop.jsx + status/game-pop.*.
